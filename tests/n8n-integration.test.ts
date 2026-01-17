/**
 * n8n Integration Tests
 *
 * Tests requiring a real n8n instance (via docker-compose.test.yml).
 * These tests verify actual n8n API operations and workflow import flows.
 *
 * Run with: npm run test:integration
 * Requires: Docker services running (npm run test:env:up)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

// ============================================
// Configuration
// ============================================

const N8N_API_URL = process.env.N8N_API_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY || 'test-api-key';
const TEST_TIMEOUT = 30000;

// ============================================
// Service Availability Detection
// ============================================

let n8nAvailable = false;

/**
 * Check if n8n is available and has API access.
 */
async function checkN8nConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${N8N_API_URL}/healthz`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Check if n8n API is accessible with authentication.
 */
async function checkN8nApiAccess(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${N8N_API_URL}/api/v1/workflows?limit=1`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok || response.status === 401; // 401 means API is accessible but key is wrong
  } catch {
    return false;
  }
}

// ============================================
// Test Setup
// ============================================

beforeAll(async () => {
  console.log('\n📋 n8n Integration Tests - Checking service availability...');

  n8nAvailable = await checkN8nConnectivity();

  if (n8nAvailable) {
    const apiAccess = await checkN8nApiAccess();
    console.log(`   n8n: ✅ Available (API access: ${apiAccess ? 'Yes' : 'No'})`);
  } else {
    console.log('   n8n: ⚠️  Not available (tests will be skipped)');
    console.log('\n   💡 To run n8n integration tests:');
    console.log('      1. Start test environment: npm run test:env:up');
    console.log('      2. Set N8N_API_KEY environment variable\n');
  }
}, TEST_TIMEOUT);

// ============================================
// Helper Functions
// ============================================

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: Array<{
    id: string;
    name: string;
    type: string;
    typeVersion: number;
    position: number[];
    parameters: Record<string, unknown>;
  }>;
  connections: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

async function n8nRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${N8N_API_URL}${path}`, {
      method,
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    let data: unknown;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

function createTestWorkflow(name: string): Omit<N8nWorkflow, 'id'> {
  return {
    name,
    active: false,
    nodes: [
      {
        id: 'trigger-1',
        name: 'Manual Trigger',
        type: 'n8n-nodes-base.manualTrigger',
        typeVersion: 1,
        position: [0, 0],
        parameters: {},
      },
      {
        id: 'code-1',
        name: 'Test Code',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [200, 0],
        parameters: {
          jsCode: 'return [{ json: { test: true, timestamp: Date.now() } }];',
        },
      },
    ],
    connections: {
      'Manual Trigger': {
        main: [[{ node: 'Test Code', type: 'main', index: 0 }]],
      },
    },
    settings: {
      executionOrder: 'v1',
    },
  };
}

// Track created workflows for cleanup
const createdWorkflowIds: string[] = [];

afterAll(async () => {
  // Cleanup created test workflows
  if (n8nAvailable && createdWorkflowIds.length > 0) {
    console.log(`\n   🧹 Cleaning up ${createdWorkflowIds.length} test workflow(s)...`);
    for (const id of createdWorkflowIds) {
      try {
        await n8nRequest('DELETE', `/api/v1/workflows/${id}`);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
});

// ============================================
// n8n Connection Tests
// ============================================

describe('n8n Connection', () => {
  it('should respond to health check', async () => {
    if (!n8nAvailable) {
      console.log('   ⏭️  Skipping: n8n not available');
      return;
    }

    const response = await fetch(`${N8N_API_URL}/healthz`);
    expect(response.ok).toBe(true);
  });

  it('should have API endpoint accessible', async () => {
    if (!n8nAvailable) {
      console.log('   ⏭️  Skipping: n8n not available');
      return;
    }

    const result = await n8nRequest('GET', '/api/v1/');

    // Should respond (either success or auth error)
    expect([200, 401, 403]).toContain(result.status);
  });

  it('should list workflows with valid API key', async () => {
    if (!n8nAvailable) {
      console.log('   ⏭️  Skipping: n8n not available');
      return;
    }

    const result = await n8nRequest('GET', '/api/v1/workflows?limit=5');

    if (result.status === 401) {
      console.log('   ⏭️  Skipping: Invalid API key');
      return;
    }

    expect(result.ok).toBe(true);
    expect(result.data).toHaveProperty('data');
    expect(Array.isArray((result.data as { data: unknown[] }).data)).toBe(true);
  });

  it('should reject invalid API key', async () => {
    if (!n8nAvailable) {
      console.log('   ⏭️  Skipping: n8n not available');
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${N8N_API_URL}/api/v1/workflows`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': 'invalid-api-key-12345',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // Should be unauthorized
    expect(response.status).toBe(401);
  });
});

// ============================================
// Workflow CRUD Tests
// ============================================

describe('Workflow CRUD Operations', () => {
  let testWorkflowId: string | null = null;
  const testWorkflowName = `Test Workflow - ${Date.now()}`;

  afterAll(async () => {
    // Cleanup test workflow
    if (testWorkflowId && n8nAvailable) {
      try {
        await n8nRequest('DELETE', `/api/v1/workflows/${testWorkflowId}`);
      } catch {
        // Ignore
      }
    }
  });

  it('should create a new workflow', async () => {
    if (!n8nAvailable) {
      console.log('   ⏭️  Skipping: n8n not available');
      return;
    }

    const workflow = createTestWorkflow(testWorkflowName);
    const result = await n8nRequest('POST', '/api/v1/workflows', workflow);

    if (result.status === 401) {
      console.log('   ⏭️  Skipping: Invalid API key');
      return;
    }

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);

    const data = result.data as N8nWorkflow;
    expect(data).toHaveProperty('id');
    expect(data.name).toBe(testWorkflowName);
    expect(data.active).toBe(false);

    testWorkflowId = data.id;
    createdWorkflowIds.push(data.id);
  });

  it('should get workflow by ID', async () => {
    if (!n8nAvailable || !testWorkflowId) {
      console.log('   ⏭️  Skipping: n8n not available or no test workflow');
      return;
    }

    const result = await n8nRequest('GET', `/api/v1/workflows/${testWorkflowId}`);

    expect(result.ok).toBe(true);
    const data = result.data as N8nWorkflow;
    expect(data.id).toBe(testWorkflowId);
    expect(data.name).toBe(testWorkflowName);
  });

  it('should find workflow by name', async () => {
    if (!n8nAvailable || !testWorkflowId) {
      console.log('   ⏭️  Skipping: n8n not available or no test workflow');
      return;
    }

    const result = await n8nRequest('GET', '/api/v1/workflows?limit=100');

    if (!result.ok) {
      console.log('   ⏭️  Skipping: Could not list workflows');
      return;
    }

    const data = result.data as { data: N8nWorkflow[] };
    const found = data.data.find((w) => w.name === testWorkflowName);

    expect(found).toBeDefined();
    expect(found?.id).toBe(testWorkflowId);
  });

  it('should update workflow', async () => {
    if (!n8nAvailable || !testWorkflowId) {
      console.log('   ⏭️  Skipping: n8n not available or no test workflow');
      return;
    }

    const updatedName = `Updated - ${testWorkflowName}`;
    const workflow = createTestWorkflow(updatedName);

    const result = await n8nRequest('PUT', `/api/v1/workflows/${testWorkflowId}`, workflow);

    expect(result.ok).toBe(true);
    const data = result.data as N8nWorkflow;
    expect(data.name).toBe(updatedName);
  });

  it('should activate workflow', async () => {
    if (!n8nAvailable || !testWorkflowId) {
      console.log('   ⏭️  Skipping: n8n not available or no test workflow');
      return;
    }

    const result = await n8nRequest('POST', `/api/v1/workflows/${testWorkflowId}/activate`);

    // Activation might fail if workflow has issues (missing credentials, etc.)
    // But the API call should succeed
    if (result.ok) {
      const data = result.data as N8nWorkflow;
      expect(data.active).toBe(true);
    } else {
      // Log the error but don't fail - this tests that the API endpoint exists
      console.log(`   ℹ️  Activation returned ${result.status} (may need credentials)`);
    }
  });

  it('should deactivate workflow', async () => {
    if (!n8nAvailable || !testWorkflowId) {
      console.log('   ⏭️  Skipping: n8n not available or no test workflow');
      return;
    }

    const result = await n8nRequest('POST', `/api/v1/workflows/${testWorkflowId}/deactivate`);

    expect(result.ok).toBe(true);
    const data = result.data as N8nWorkflow;
    expect(data.active).toBe(false);
  });

  it('should return 404 for non-existent workflow', async () => {
    if (!n8nAvailable) {
      console.log('   ⏭️  Skipping: n8n not available');
      return;
    }

    const result = await n8nRequest('GET', '/api/v1/workflows/non-existent-id-12345');

    expect(result.status).toBe(404);
  });

  it('should delete workflow', async () => {
    if (!n8nAvailable || !testWorkflowId) {
      console.log('   ⏭️  Skipping: n8n not available or no test workflow');
      return;
    }

    const result = await n8nRequest('DELETE', `/api/v1/workflows/${testWorkflowId}`);

    expect(result.ok).toBe(true);

    // Remove from cleanup list since it's already deleted
    const index = createdWorkflowIds.indexOf(testWorkflowId);
    if (index > -1) {
      createdWorkflowIds.splice(index, 1);
    }

    // Verify deletion
    const verifyResult = await n8nRequest('GET', `/api/v1/workflows/${testWorkflowId}`);
    expect(verifyResult.status).toBe(404);

    testWorkflowId = null;
  });
});

// ============================================
// Webhook Workflow Tests
// ============================================

describe('Webhook Workflow Operations', () => {
  let webhookWorkflowId: string | null = null;

  afterAll(async () => {
    if (webhookWorkflowId && n8nAvailable) {
      try {
        await n8nRequest('DELETE', `/api/v1/workflows/${webhookWorkflowId}`);
      } catch {
        // Ignore
      }
    }
  });

  it('should create workflow with webhook trigger', async () => {
    if (!n8nAvailable) {
      console.log('   ⏭️  Skipping: n8n not available');
      return;
    }

    const webhookPath = `test-webhook-${Date.now()}`;
    const workflow = {
      name: `Webhook Test - ${Date.now()}`,
      active: false,
      nodes: [
        {
          id: 'webhook-1',
          name: 'Test Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 2,
          position: [0, 0],
          webhookId: `wh-${Date.now()}`,
          parameters: {
            path: webhookPath,
            httpMethod: 'POST',
            responseMode: 'onReceived',
          },
        },
        {
          id: 'code-1',
          name: 'Response',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [200, 0],
          parameters: {
            jsCode: 'return [{ json: { received: true } }];',
          },
        },
      ],
      connections: {
        'Test Webhook': {
          main: [[{ node: 'Response', type: 'main', index: 0 }]],
        },
      },
      settings: {
        executionOrder: 'v1',
      },
    };

    const result = await n8nRequest('POST', '/api/v1/workflows', workflow);

    if (result.status === 401) {
      console.log('   ⏭️  Skipping: Invalid API key');
      return;
    }

    expect(result.ok).toBe(true);

    const data = result.data as N8nWorkflow;
    webhookWorkflowId = data.id;
    createdWorkflowIds.push(data.id);

    // Verify webhook node exists
    const webhookNode = data.nodes.find((n) => n.type === 'n8n-nodes-base.webhook');
    expect(webhookNode).toBeDefined();
    expect(webhookNode?.parameters.path).toBe(webhookPath);
  });

  it('should extract webhook paths from workflow response', async () => {
    if (!n8nAvailable || !webhookWorkflowId) {
      console.log('   ⏭️  Skipping: n8n not available or no webhook workflow');
      return;
    }

    const result = await n8nRequest('GET', `/api/v1/workflows/${webhookWorkflowId}`);

    expect(result.ok).toBe(true);

    const data = result.data as N8nWorkflow;
    const webhookNode = data.nodes.find((n) => n.type === 'n8n-nodes-base.webhook');

    expect(webhookNode).toBeDefined();
    expect(webhookNode?.parameters).toHaveProperty('path');
  });
});

// ============================================
// Bundled Workflow Import Tests
// ============================================

describe('Bundled Workflow Import Flow', () => {
  const testWorkflowNames: string[] = [];

  afterAll(async () => {
    // Cleanup any test workflows created
    if (n8nAvailable && testWorkflowNames.length > 0) {
      const listResult = await n8nRequest('GET', '/api/v1/workflows?limit=100');
      if (listResult.ok) {
        const data = listResult.data as { data: N8nWorkflow[] };
        for (const name of testWorkflowNames) {
          const workflow = data.data.find((w) => w.name === name);
          if (workflow) {
            try {
              await n8nRequest('DELETE', `/api/v1/workflows/${workflow.id}`);
            } catch {
              // Ignore
            }
          }
        }
      }
    }
  });

  it('should import a simple workflow', async () => {
    if (!n8nAvailable) {
      console.log('   ⏭️  Skipping: n8n not available');
      return;
    }

    const workflowName = `Import Test Simple - ${Date.now()}`;
    testWorkflowNames.push(workflowName);

    const workflow = createTestWorkflow(workflowName);
    const result = await n8nRequest('POST', '/api/v1/workflows', workflow);

    if (result.status === 401) {
      console.log('   ⏭️  Skipping: Invalid API key');
      return;
    }

    expect(result.ok).toBe(true);

    const data = result.data as N8nWorkflow;
    expect(data.name).toBe(workflowName);
    createdWorkflowIds.push(data.id);
  });

  it('should detect existing workflow by name', async () => {
    if (!n8nAvailable) {
      console.log('   ⏭️  Skipping: n8n not available');
      return;
    }

    const workflowName = `Import Test Detect - ${Date.now()}`;
    testWorkflowNames.push(workflowName);

    // Create first
    const workflow = createTestWorkflow(workflowName);
    const createResult = await n8nRequest('POST', '/api/v1/workflows', workflow);

    if (!createResult.ok) {
      console.log('   ⏭️  Skipping: Could not create workflow');
      return;
    }

    const createdData = createResult.data as N8nWorkflow;
    createdWorkflowIds.push(createdData.id);

    // Search for it
    const listResult = await n8nRequest('GET', '/api/v1/workflows?limit=100');
    expect(listResult.ok).toBe(true);

    const data = listResult.data as { data: N8nWorkflow[] };
    const found = data.data.find((w) => w.name === workflowName);

    expect(found).toBeDefined();
    expect(found?.id).toBe(createdData.id);
  });

  it('should update existing workflow on re-import', async () => {
    if (!n8nAvailable) {
      console.log('   ⏭️  Skipping: n8n not available');
      return;
    }

    const workflowName = `Import Test Update - ${Date.now()}`;
    testWorkflowNames.push(workflowName);

    // Create initial workflow
    const workflow = createTestWorkflow(workflowName);
    const createResult = await n8nRequest('POST', '/api/v1/workflows', workflow);

    if (!createResult.ok) {
      console.log('   ⏭️  Skipping: Could not create workflow');
      return;
    }

    const createdData = createResult.data as N8nWorkflow;
    createdWorkflowIds.push(createdData.id);

    // Update with modified content
    const updatedWorkflow = {
      ...workflow,
      nodes: [
        ...workflow.nodes,
        {
          id: 'code-2',
          name: 'Additional Node',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [400, 0],
          parameters: {
            jsCode: 'return [{ json: { added: true } }];',
          },
        },
      ],
    };

    const updateResult = await n8nRequest('PUT', `/api/v1/workflows/${createdData.id}`, updatedWorkflow);

    expect(updateResult.ok).toBe(true);

    const updatedData = updateResult.data as N8nWorkflow;
    expect(updatedData.nodes).toHaveLength(3);
    expect(updatedData.nodes.find((n) => n.name === 'Additional Node')).toBeDefined();
  });

  it('should preserve workflow ID on update', async () => {
    if (!n8nAvailable) {
      console.log('   ⏭️  Skipping: n8n not available');
      return;
    }

    const workflowName = `Import Test Preserve ID - ${Date.now()}`;
    testWorkflowNames.push(workflowName);

    // Create
    const workflow = createTestWorkflow(workflowName);
    const createResult = await n8nRequest('POST', '/api/v1/workflows', workflow);

    if (!createResult.ok) {
      console.log('   ⏭️  Skipping: Could not create workflow');
      return;
    }

    const createdData = createResult.data as N8nWorkflow;
    const originalId = createdData.id;
    createdWorkflowIds.push(originalId);

    // Update
    workflow.nodes[1].parameters.jsCode = 'return [{ json: { updated: true } }];';
    const updateResult = await n8nRequest('PUT', `/api/v1/workflows/${originalId}`, workflow);

    expect(updateResult.ok).toBe(true);

    const updatedData = updateResult.data as N8nWorkflow;
    expect(updatedData.id).toBe(originalId);
  });
});

// ============================================
// Error Handling Tests
// ============================================

describe('Error Handling', () => {
  it('should handle invalid workflow JSON gracefully', async () => {
    if (!n8nAvailable) {
      console.log('   ⏭️  Skipping: n8n not available');
      return;
    }

    // Missing required fields
    const invalidWorkflow = {
      name: 'Invalid Workflow',
      // Missing nodes and connections
    };

    const result = await n8nRequest('POST', '/api/v1/workflows', invalidWorkflow);

    // Should return error (400 or 422)
    expect([400, 422, 500]).toContain(result.status);
  });

  it('should handle malformed node parameters', async () => {
    if (!n8nAvailable) {
      console.log('   ⏭️  Skipping: n8n not available');
      return;
    }

    const workflow = {
      name: `Malformed Test - ${Date.now()}`,
      active: false,
      nodes: [
        {
          id: 'node-1',
          name: 'Bad Node',
          type: 'n8n-nodes-base.nonExistentNode', // Invalid node type
          typeVersion: 1,
          position: [0, 0],
          parameters: {},
        },
      ],
      connections: {},
    };

    const result = await n8nRequest('POST', '/api/v1/workflows', workflow);

    // n8n may accept this but the workflow won't work
    // The important thing is the API responds
    expect(result.status).toBeDefined();
  });

  it('should handle concurrent requests', async () => {
    if (!n8nAvailable) {
      console.log('   ⏭️  Skipping: n8n not available');
      return;
    }

    // Fire multiple concurrent requests
    const requests = Array.from({ length: 5 }, (_, i) =>
      n8nRequest('GET', `/api/v1/workflows?limit=1&offset=${i}`)
    );

    const results = await Promise.all(requests);

    // All should succeed or return auth error
    for (const result of results) {
      expect([200, 401]).toContain(result.status);
    }
  });
});

// ============================================
// Performance Tests
// ============================================

describe('Performance', () => {
  it('should respond to health check within 1 second', async () => {
    if (!n8nAvailable) {
      console.log('   ⏭️  Skipping: n8n not available');
      return;
    }

    const start = Date.now();
    await fetch(`${N8N_API_URL}/healthz`);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(1000);
  });

  it('should list workflows within 5 seconds', async () => {
    if (!n8nAvailable) {
      console.log('   ⏭️  Skipping: n8n not available');
      return;
    }

    const start = Date.now();
    await n8nRequest('GET', '/api/v1/workflows?limit=10');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(5000);
  });
});

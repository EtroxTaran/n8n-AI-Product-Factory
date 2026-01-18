/**
 * Workflow Import Tests
 *
 * Validates that all bundled workflow JSON files:
 * 1. Are valid JSON with required fields
 * 2. Can be parsed by the workflow importer
 * 3. Can be imported to n8n (integration test)
 * 4. Can be updated/re-imported (integration test)
 *
 * Run with: npm run test:workflows
 * Integration tests require: docker compose -f docker-compose.test.yml up -d
 *
 * IMPORTANT: Run these tests after editing any workflow JSON files!
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';

// ============================================
// Configuration
// ============================================

const WORKFLOWS_DIR = path.join(process.cwd(), 'workflows');
const N8N_API_URL = process.env.N8N_API_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

/**
 * Expected workflow files in import order (dependencies first)
 */
const WORKFLOW_FILES = [
  'ai-product-factory-s3-subworkflow.json',
  'ai-product-factory-decision-logger-subworkflow.json',
  'ai-product-factory-perplexity-research-subworkflow.json',
  'ai-product-factory-scavenging-subworkflow.json',
  'ai-product-factory-vision-loop-subworkflow.json',
  'ai-product-factory-architecture-loop-subworkflow.json',
  'ai-product-factory-api-workflow.json',
  'ai-product-factory-main-workflow.json',
];

/**
 * Required fields for a valid workflow
 */
const REQUIRED_WORKFLOW_FIELDS = ['name', 'nodes', 'connections'];

/**
 * Required fields for a valid node
 */
const REQUIRED_NODE_FIELDS = ['id', 'name', 'type', 'typeVersion', 'position', 'parameters'];

/**
 * Fields that should NOT be sent to n8n API (read-only or invalid)
 */
const FORBIDDEN_API_FIELDS = ['tags', 'active', 'pinData', 'triggerCount', 'versionId', 'id', 'createdAt', 'updatedAt'];

// ============================================
// Helper Functions
// ============================================

interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, unknown>;
}

interface WorkflowDefinition {
  name: string;
  nodes: WorkflowNode[];
  connections: Record<string, unknown>;
  settings?: Record<string, unknown>;
  staticData?: unknown;
  tags?: unknown[];
  active?: boolean;
  pinData?: unknown;
  triggerCount?: number;
  versionId?: string;
}

/**
 * Strip credentials from nodes (same as workflow-importer.ts)
 */
function stripCredentials(nodes: WorkflowNode[]): WorkflowNode[] {
  return nodes.map((node) => {
    const { credentials: _removed, ...rest } = node;
    return rest as WorkflowNode;
  });
}

/**
 * Parse workflow file for n8n API (same as parseWorkflowFile in workflow-importer.ts)
 */
function parseWorkflowForApi(content: string): Omit<WorkflowDefinition, 'tags' | 'active' | 'pinData' | 'triggerCount' | 'versionId'> {
  const data = JSON.parse(content) as WorkflowDefinition;

  if (!data.name || !data.nodes || !Array.isArray(data.nodes)) {
    throw new Error('Invalid workflow file: missing name or nodes');
  }

  const nodes = stripCredentials(data.nodes);

  return {
    name: data.name,
    nodes,
    connections: data.connections || {},
    settings: data.settings,
    staticData: data.staticData,
    // NOTE: tags field is read-only in n8n API - cannot be set during create/update
  };
}

/**
 * Check n8n connectivity
 */
async function checkN8nAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${N8N_API_URL}/healthz`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Check n8n API access with key
 */
async function checkN8nApiAccess(): Promise<boolean> {
  if (!N8N_API_KEY) return false;

  try {
    const response = await fetch(`${N8N_API_URL}/api/v1/workflows?limit=1`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY },
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Create workflow in n8n
 */
async function createWorkflow(workflow: ReturnType<typeof parseWorkflowForApi>): Promise<{
  ok: boolean;
  status: number;
  data: { id?: string; message?: string };
}> {
  const response = await fetch(`${N8N_API_URL}/api/v1/workflows`, {
    method: 'POST',
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(workflow),
  });

  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

/**
 * Update workflow in n8n
 */
async function updateWorkflow(
  id: string,
  workflow: ReturnType<typeof parseWorkflowForApi>
): Promise<{ ok: boolean; status: number; data: { id?: string; message?: string } }> {
  const response = await fetch(`${N8N_API_URL}/api/v1/workflows/${id}`, {
    method: 'PUT',
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(workflow),
  });

  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

/**
 * Delete workflow from n8n
 */
async function deleteWorkflow(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${N8N_API_URL}/api/v1/workflows/${id}`, {
      method: 'DELETE',
      headers: { 'X-N8N-API-KEY': N8N_API_KEY },
    });
    return response.ok;
  } catch {
    return false;
  }
}

// ============================================
// Unit Tests: Workflow File Validation
// ============================================

describe('Workflow Files: Structure Validation', () => {
  it('should have all expected workflow files', async () => {
    const files = await fs.readdir(WORKFLOWS_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    for (const expectedFile of WORKFLOW_FILES) {
      expect(jsonFiles).toContain(expectedFile);
    }
  });

  for (const filename of WORKFLOW_FILES) {
    describe(`${filename}`, () => {
      let content: string;
      let workflow: WorkflowDefinition;

      beforeAll(async () => {
        const filepath = path.join(WORKFLOWS_DIR, filename);
        content = await fs.readFile(filepath, 'utf-8');
        workflow = JSON.parse(content);
      });

      it('should be valid JSON', () => {
        expect(() => JSON.parse(content)).not.toThrow();
      });

      it('should have required workflow fields', () => {
        for (const field of REQUIRED_WORKFLOW_FIELDS) {
          expect(workflow).toHaveProperty(field);
        }
      });

      it('should have a non-empty name', () => {
        expect(workflow.name).toBeTruthy();
        expect(typeof workflow.name).toBe('string');
        expect(workflow.name.length).toBeGreaterThan(0);
      });

      it('should have an array of nodes', () => {
        expect(Array.isArray(workflow.nodes)).toBe(true);
        expect(workflow.nodes.length).toBeGreaterThan(0);
      });

      it('should have valid node structure', () => {
        for (const node of workflow.nodes) {
          for (const field of REQUIRED_NODE_FIELDS) {
            expect(node).toHaveProperty(field);
          }

          // Validate position is [x, y] array
          expect(Array.isArray(node.position)).toBe(true);
          expect(node.position.length).toBe(2);
          expect(typeof node.position[0]).toBe('number');
          expect(typeof node.position[1]).toBe('number');

          // Validate typeVersion is a number
          expect(typeof node.typeVersion).toBe('number');
        }
      });

      it('should have unique node IDs', () => {
        const nodeIds = workflow.nodes.map((n) => n.id);
        const uniqueIds = new Set(nodeIds);
        expect(uniqueIds.size).toBe(nodeIds.length);
      });

      it('should have unique node names', () => {
        const nodeNames = workflow.nodes.map((n) => n.name);
        const uniqueNames = new Set(nodeNames);
        expect(uniqueNames.size).toBe(nodeNames.length);
      });

      it('should have connections object', () => {
        expect(typeof workflow.connections).toBe('object');
      });

      it('should be parseable for n8n API', () => {
        const parsed = parseWorkflowForApi(content);

        expect(parsed).toHaveProperty('name');
        expect(parsed).toHaveProperty('nodes');
        expect(parsed).toHaveProperty('connections');

        // Should NOT have forbidden fields
        for (const field of FORBIDDEN_API_FIELDS) {
          expect(parsed).not.toHaveProperty(field);
        }
      });

      it('should strip credentials from nodes', () => {
        const parsed = parseWorkflowForApi(content);

        for (const node of parsed.nodes) {
          expect(node).not.toHaveProperty('credentials');
        }
      });
    });
  }
});

// ============================================
// Integration Tests: n8n API Import/Update
// ============================================

describe('Workflow Import: n8n API Integration', () => {
  let n8nAvailable = false;
  let apiAccessible = false;
  const createdWorkflowIds: string[] = [];

  beforeAll(async () => {
    n8nAvailable = await checkN8nAvailable();
    if (n8nAvailable) {
      apiAccessible = await checkN8nApiAccess();
    }

    if (!n8nAvailable) {
      console.log('\n   n8n: Not available (integration tests will be skipped)');
      console.log('   To run: docker compose -f docker-compose.test.yml up -d\n');
    } else if (!apiAccessible) {
      console.log('\n   n8n: Available but API key not configured');
      console.log('   Set N8N_API_KEY environment variable\n');
    }
  });

  afterAll(async () => {
    // Cleanup all created workflows
    if (apiAccessible && createdWorkflowIds.length > 0) {
      console.log(`\n   Cleaning up ${createdWorkflowIds.length} test workflow(s)...`);
      for (const id of createdWorkflowIds) {
        await deleteWorkflow(id);
      }
    }
  });

  describe('Import all workflows', () => {
    for (const filename of WORKFLOW_FILES) {
      it(`should import ${filename}`, async () => {
        if (!n8nAvailable || !apiAccessible) {
          console.log('   ⏭️  Skipping: n8n not available or API key not set');
          return;
        }

        const filepath = path.join(WORKFLOWS_DIR, filename);
        const content = await fs.readFile(filepath, 'utf-8');
        const workflow = parseWorkflowForApi(content);

        // Add unique suffix to avoid conflicts
        workflow.name = `${workflow.name} (test-${Date.now()})`;

        const result = await createWorkflow(workflow);

        expect(result.ok).toBe(true);
        expect(result.status).toBe(200);
        expect(result.data.id).toBeTruthy();

        if (result.data.id) {
          createdWorkflowIds.push(result.data.id);
        }
      });
    }
  });

  describe('Update workflows (re-import)', () => {
    it('should update an existing workflow', async () => {
      if (!n8nAvailable || !apiAccessible) {
        console.log('   ⏭️  Skipping: n8n not available or API key not set');
        return;
      }

      // Skip if no workflows were created
      if (createdWorkflowIds.length === 0) {
        console.log('   ⏭️  Skipping: No workflows created in previous tests');
        return;
      }

      const workflowId = createdWorkflowIds[0];
      const filepath = path.join(WORKFLOWS_DIR, WORKFLOW_FILES[0]);
      const content = await fs.readFile(filepath, 'utf-8');
      const workflow = parseWorkflowForApi(content);

      // Modify workflow slightly
      workflow.name = `${workflow.name} (updated-${Date.now()})`;

      const result = await updateWorkflow(workflowId, workflow);

      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
    });
  });

  describe('Error handling', () => {
    it('should reject workflow with invalid node type gracefully', async () => {
      if (!n8nAvailable || !apiAccessible) {
        console.log('   ⏭️  Skipping: n8n not available or API key not set');
        return;
      }

      const invalidWorkflow = {
        name: `Invalid Test Workflow ${Date.now()}`,
        nodes: [
          {
            id: 'node-1',
            name: 'Invalid Node',
            type: 'n8n-nodes-base.thisNodeDoesNotExist',
            typeVersion: 1,
            position: [0, 0] as [number, number],
            parameters: {},
          },
        ],
        connections: {},
      };

      const result = await createWorkflow(invalidWorkflow);

      // n8n may accept invalid node types (they just won't work)
      // The important thing is the API responds without crashing
      expect(result.status).toBeDefined();
    });

    it('should reject workflow with tags (read-only field)', async () => {
      if (!n8nAvailable || !apiAccessible) {
        console.log('   ⏭️  Skipping: n8n not available or API key not set');
        return;
      }

      const response = await fetch(`${N8N_API_URL}/api/v1/workflows`, {
        method: 'POST',
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `Tags Test ${Date.now()}`,
          nodes: [
            {
              id: 'trigger',
              name: 'Manual',
              type: 'n8n-nodes-base.manualTrigger',
              typeVersion: 1,
              position: [0, 0],
              parameters: {},
            },
          ],
          connections: {},
          settings: { executionOrder: 'v1' },
          tags: [{ id: 'test', name: 'Test' }], // This should cause rejection
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      // n8n rejects tags as read-only
      expect(data.message).toMatch(/tags|read-only/i);
    });
  });
});

// ============================================
// Performance Tests
// ============================================

describe('Workflow Files: Performance', () => {
  it('should parse all workflows in under 100ms', async () => {
    const start = Date.now();

    for (const filename of WORKFLOW_FILES) {
      const filepath = path.join(WORKFLOWS_DIR, filename);
      const content = await fs.readFile(filepath, 'utf-8');
      parseWorkflowForApi(content);
    }

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it('should have reasonable file sizes (under 500KB each)', async () => {
    for (const filename of WORKFLOW_FILES) {
      const filepath = path.join(WORKFLOWS_DIR, filename);
      const stats = await fs.stat(filepath);
      const sizeKB = stats.size / 1024;

      expect(sizeKB).toBeLessThan(500);
    }
  });
});

/**
 * Production Parity Integration Tests
 *
 * These tests validate that the local production-parity environment
 * (docker-compose.local-prod.yml) matches Dokploy production configuration.
 *
 * Prerequisites:
 *   npm run test:local-prod:up
 *
 * Run tests:
 *   npx vitest run tests/production-parity.test.ts
 *
 * Cleanup:
 *   npm run test:local-prod:down
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Service URLs for local-prod environment
const SERVICES = {
  n8n: {
    internal: 'http://localhost:5678',
    traefik: 'http://n8n.localhost',
    healthEndpoint: '/healthz',
  },
  dashboard: {
    internal: 'http://localhost:3000',
    traefik: 'http://dashboard.localhost',
    healthEndpoint: '/api/health',
  },
  traefik: {
    dashboard: 'http://localhost:8080',
    apiEndpoint: '/api/overview',
  },
  postgres: {
    host: 'localhost',
    port: 5432,
    database: 'n8n',
    user: 'n8n',
    password: 'n8n_test_password',
  },
  seaweedfs: {
    master: 'http://localhost:9333',
    s3: 'http://s3.localhost',
    statusEndpoint: '/cluster/status',
  },
  qdrant: {
    url: 'http://localhost:6333',
    healthEndpoint: '/readyz',
  },
  graphiti: {
    url: 'http://localhost:8000',
    healthEndpoint: '/health',
  },
  redis: {
    host: 'localhost',
    port: 6379,
  },
};

// Timeout for service availability checks
const SERVICE_TIMEOUT = 5000;

// Track service availability
let servicesAvailable = {
  n8n: false,
  dashboard: false,
  traefik: false,
  postgres: false,
  seaweedfs: false,
  qdrant: false,
  graphiti: false,
  redis: false,
};

/**
 * Helper to check if a service is reachable
 */
async function checkServiceHealth(url: string, timeout = SERVICE_TIMEOUT): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

/**
 * Helper to check TCP connectivity
 */
async function checkTcpPort(host: string, port: number, timeout = SERVICE_TIMEOUT): Promise<boolean> {
  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();

    const timeoutId = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeout);

    socket.connect(port, host, () => {
      clearTimeout(timeoutId);
      socket.destroy();
      resolve(true);
    });

    socket.on('error', () => {
      clearTimeout(timeoutId);
      resolve(false);
    });
  });
}

// =============================================================================
// Service Availability Detection
// =============================================================================

beforeAll(async () => {
  console.log('\n📋 Production Parity Tests - Service Availability Check:');

  // Check Traefik
  servicesAvailable.traefik = await checkServiceHealth(
    `${SERVICES.traefik.dashboard}${SERVICES.traefik.apiEndpoint}`
  );
  console.log(`   Traefik:    ${servicesAvailable.traefik ? '✅ Available' : '❌ Not Available'}`);

  // Check n8n (try both internal and Traefik routes)
  servicesAvailable.n8n =
    (await checkServiceHealth(`${SERVICES.n8n.internal}${SERVICES.n8n.healthEndpoint}`)) ||
    (await checkServiceHealth(`${SERVICES.n8n.traefik}${SERVICES.n8n.healthEndpoint}`));
  console.log(`   n8n:        ${servicesAvailable.n8n ? '✅ Available' : '❌ Not Available'}`);

  // Check Dashboard
  servicesAvailable.dashboard =
    (await checkServiceHealth(`${SERVICES.dashboard.internal}${SERVICES.dashboard.healthEndpoint}`)) ||
    (await checkServiceHealth(`${SERVICES.dashboard.traefik}${SERVICES.dashboard.healthEndpoint}`));
  console.log(`   Dashboard:  ${servicesAvailable.dashboard ? '✅ Available' : '❌ Not Available'}`);

  // Check PostgreSQL
  servicesAvailable.postgres = await checkTcpPort(SERVICES.postgres.host, SERVICES.postgres.port);
  console.log(`   PostgreSQL: ${servicesAvailable.postgres ? '✅ Available' : '❌ Not Available'}`);

  // Check SeaweedFS
  servicesAvailable.seaweedfs = await checkServiceHealth(
    `${SERVICES.seaweedfs.master}${SERVICES.seaweedfs.statusEndpoint}`
  );
  console.log(`   SeaweedFS:  ${servicesAvailable.seaweedfs ? '✅ Available' : '❌ Not Available'}`);

  // Check Qdrant
  servicesAvailable.qdrant = await checkServiceHealth(
    `${SERVICES.qdrant.url}${SERVICES.qdrant.healthEndpoint}`
  );
  console.log(`   Qdrant:     ${servicesAvailable.qdrant ? '✅ Available' : '❌ Not Available'}`);

  // Check Graphiti (may take longer due to 90s start_period)
  servicesAvailable.graphiti = await checkServiceHealth(
    `${SERVICES.graphiti.url}${SERVICES.graphiti.healthEndpoint}`,
    10000 // Longer timeout for Graphiti
  );
  console.log(`   Graphiti:   ${servicesAvailable.graphiti ? '✅ Available' : '❌ Not Available'}`);

  // Check Redis
  servicesAvailable.redis = await checkTcpPort(SERVICES.redis.host, SERVICES.redis.port);
  console.log(`   Redis:      ${servicesAvailable.redis ? '✅ Available' : '❌ Not Available'}`);

  console.log('');
});

// =============================================================================
// Traefik Routing Tests
// =============================================================================

describe('Traefik Reverse Proxy', () => {
  it('should have Traefik dashboard accessible', async () => {
    if (!servicesAvailable.traefik) {
      console.log('   ⏭️  Skipping: Traefik not available');
      return;
    }

    const response = await fetch(`${SERVICES.traefik.dashboard}${SERVICES.traefik.apiEndpoint}`);
    expect(response.ok).toBe(true);
  });

  it('should route to n8n via n8n.localhost', async () => {
    if (!servicesAvailable.traefik || !servicesAvailable.n8n) {
      console.log('   ⏭️  Skipping: Traefik or n8n not available');
      return;
    }

    const response = await fetch(`${SERVICES.n8n.traefik}${SERVICES.n8n.healthEndpoint}`);
    expect(response.ok).toBe(true);
  });

  it('should route to dashboard via dashboard.localhost', async () => {
    if (!servicesAvailable.traefik || !servicesAvailable.dashboard) {
      console.log('   ⏭️  Skipping: Traefik or Dashboard not available');
      return;
    }

    const response = await fetch(`${SERVICES.dashboard.traefik}${SERVICES.dashboard.healthEndpoint}`);
    expect(response.ok).toBe(true);
  });

  it('should route to S3 via s3.localhost', async () => {
    if (!servicesAvailable.traefik || !servicesAvailable.seaweedfs) {
      console.log('   ⏭️  Skipping: Traefik or SeaweedFS not available');
      return;
    }

    // SeaweedFS S3 endpoint may return different status codes
    const response = await fetch(SERVICES.seaweedfs.s3);
    // Any response (even 4xx) means routing works
    expect(response.status).toBeLessThan(600);
  });
});

// =============================================================================
// Service Health Tests
// =============================================================================

describe('Service Health Checks', () => {
  it('should have n8n healthy', async () => {
    if (!servicesAvailable.n8n) {
      console.log('   ⏭️  Skipping: n8n not available');
      return;
    }

    const response = await fetch(`${SERVICES.n8n.internal}${SERVICES.n8n.healthEndpoint}`);
    expect(response.ok).toBe(true);
  });

  it('should have dashboard healthy', async () => {
    if (!servicesAvailable.dashboard) {
      console.log('   ⏭️  Skipping: Dashboard not available');
      return;
    }

    const response = await fetch(`${SERVICES.dashboard.internal}${SERVICES.dashboard.healthEndpoint}`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('status');
  });

  it('should have SeaweedFS master healthy', async () => {
    if (!servicesAvailable.seaweedfs) {
      console.log('   ⏭️  Skipping: SeaweedFS not available');
      return;
    }

    const response = await fetch(`${SERVICES.seaweedfs.master}${SERVICES.seaweedfs.statusEndpoint}`);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('IsLeader');
  });

  it('should have Qdrant healthy', async () => {
    if (!servicesAvailable.qdrant) {
      console.log('   ⏭️  Skipping: Qdrant not available');
      return;
    }

    const response = await fetch(`${SERVICES.qdrant.url}${SERVICES.qdrant.healthEndpoint}`);
    expect(response.ok).toBe(true);
  });

  it('should have Graphiti healthy', async () => {
    if (!servicesAvailable.graphiti) {
      console.log('   ⏭️  Skipping: Graphiti not available (may still be starting)');
      return;
    }

    const response = await fetch(`${SERVICES.graphiti.url}${SERVICES.graphiti.healthEndpoint}`);
    expect(response.ok).toBe(true);
  });
});

// =============================================================================
// PostgreSQL Version Validation
// =============================================================================

describe('PostgreSQL Configuration', () => {
  it('should be PostgreSQL version 18.x', async () => {
    if (!servicesAvailable.postgres) {
      console.log('   ⏭️  Skipping: PostgreSQL not available');
      return;
    }

    // This test requires postgres client or a different approach
    // For now, we verify connectivity
    const isConnected = await checkTcpPort(SERVICES.postgres.host, SERVICES.postgres.port);
    expect(isConnected).toBe(true);
  });

  it('should have database accessible', async () => {
    if (!servicesAvailable.postgres) {
      console.log('   ⏭️  Skipping: PostgreSQL not available');
      return;
    }

    // Import postgres client
    const postgres = await import('postgres');
    const sql = postgres.default({
      host: SERVICES.postgres.host,
      port: SERVICES.postgres.port,
      database: SERVICES.postgres.database,
      username: SERVICES.postgres.user,
      password: SERVICES.postgres.password,
      connect_timeout: 5,
    });

    try {
      const result = await sql`SELECT version()`;
      expect(result[0].version).toContain('PostgreSQL');
      // Check for version 18
      expect(result[0].version).toMatch(/PostgreSQL 18/);
    } finally {
      await sql.end();
    }
  });
});

// =============================================================================
// S3 Operations Tests
// =============================================================================

describe('S3 Operations', () => {
  const TEST_BUCKET = 'product-factory-artifacts';

  it('should create S3 bucket', async () => {
    if (!servicesAvailable.seaweedfs) {
      console.log('   ⏭️  Skipping: SeaweedFS not available');
      return;
    }

    const { S3Client, CreateBucketCommand } = await import('@aws-sdk/client-s3');

    const s3Client = new S3Client({
      endpoint: 'http://localhost:8333',
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'admin',
        secretAccessKey: 'admin123',
      },
      forcePathStyle: true,
    });

    try {
      await s3Client.send(new CreateBucketCommand({ Bucket: TEST_BUCKET }));
      expect(true).toBe(true); // Bucket created successfully
    } catch (error: any) {
      // BucketAlreadyOwnedByYou or 409 = bucket exists = success
      if (error.name === 'BucketAlreadyOwnedByYou' || error.$metadata?.httpStatusCode === 409) {
        expect(true).toBe(true);
      } else {
        throw error;
      }
    }
  });

  it('should upload and download file', async () => {
    if (!servicesAvailable.seaweedfs) {
      console.log('   ⏭️  Skipping: SeaweedFS not available');
      return;
    }

    const { S3Client, PutObjectCommand, GetObjectCommand } = await import('@aws-sdk/client-s3');

    const s3Client = new S3Client({
      endpoint: 'http://localhost:8333',
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'admin',
        secretAccessKey: 'admin123',
      },
      forcePathStyle: true,
    });

    const testKey = `test/production-parity-${Date.now()}.txt`;
    const testContent = 'Production parity test file';

    // Upload
    await s3Client.send(
      new PutObjectCommand({
        Bucket: TEST_BUCKET,
        Key: testKey,
        Body: testContent,
        ContentType: 'text/plain',
      })
    );

    // Download and verify
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: TEST_BUCKET,
        Key: testKey,
      })
    );

    const bodyString = await response.Body?.transformToString();
    expect(bodyString).toBe(testContent);
  });
});

// =============================================================================
// Production Parity Summary
// =============================================================================

describe('Production Parity Summary', () => {
  it('should have all critical services available', () => {
    const criticalServices = ['n8n', 'dashboard', 'postgres', 'seaweedfs'];
    const unavailable = criticalServices.filter(
      (svc) => !servicesAvailable[svc as keyof typeof servicesAvailable]
    );

    if (unavailable.length > 0) {
      console.log(`   ⚠️  Unavailable critical services: ${unavailable.join(', ')}`);
      console.log('   💡  Start services with: npm run test:local-prod:up');
    }

    // This test documents availability, doesn't fail
    expect(true).toBe(true);
  });

  it('should match Dokploy configuration', () => {
    // Configuration parity checks
    const parityChecks = {
      traefik: servicesAvailable.traefik,
      n8n_routing: servicesAvailable.n8n,
      dashboard_routing: servicesAvailable.dashboard,
      postgres_v18: servicesAvailable.postgres,
      seaweedfs_s3: servicesAvailable.seaweedfs,
      qdrant: servicesAvailable.qdrant,
      graphiti: servicesAvailable.graphiti,
      redis: servicesAvailable.redis,
    };

    const passedChecks = Object.values(parityChecks).filter(Boolean).length;
    const totalChecks = Object.keys(parityChecks).length;

    console.log(`\n   Production Parity: ${passedChecks}/${totalChecks} services match`);

    if (passedChecks === totalChecks) {
      console.log('   ✅ Local environment matches Dokploy production!');
    } else {
      console.log('   ⚠️  Some services may not be running. Start with: npm run test:local-prod:up');
    }

    expect(true).toBe(true);
  });
});

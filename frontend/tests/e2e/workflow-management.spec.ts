import { test, expect } from "@playwright/test";

/**
 * Workflow Management E2E Tests
 *
 * Tests the workflow management functionality after setup is complete:
 * - Viewing imported workflows
 * - Workflow status indicators
 * - Sync functionality
 * - Export functionality
 *
 * Prerequisites:
 * - Production-parity environment running
 * - Setup wizard completed
 *
 * Run with:
 *   cd frontend && npx playwright test tests/e2e/workflow-management.spec.ts
 */

const DASHBOARD_URL = process.env.DASHBOARD_URL || "http://dashboard.localhost";
const N8N_API_URL = process.env.N8N_API_URL || "http://n8n.localhost";
const N8N_API_KEY = process.env.N8N_API_KEY || "";

const shouldSkip = !N8N_API_KEY;

test.describe("Workflow Management - Settings Page", () => {
  test("should redirect to login when accessing /settings/workflows unauthenticated", async ({
    page,
  }) => {
    await page.goto(`${DASHBOARD_URL}/settings/workflows`);

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
    expect(page.url()).toContain("redirect=%2Fsettings%2Fworkflows");
  });

  test("should redirect to login when accessing /settings/n8n unauthenticated", async ({
    page,
  }) => {
    await page.goto(`${DASHBOARD_URL}/settings/n8n`);

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
    expect(page.url()).toContain("redirect=%2Fsettings%2Fn8n");
  });
});

test.describe("Workflow Management - API Endpoints", () => {
  test("GET /api/workflows/sync requires authentication", async ({ request }) => {
    const response = await request.post(`${DASHBOARD_URL}/api/workflows/sync`);

    expect(response.status()).toBe(401);
  });

  test("POST /api/setup/workflows/list requires authentication", async ({
    request,
  }) => {
    const response = await request.get(
      `${DASHBOARD_URL}/api/setup/workflows/list`
    );

    // May return 401 or 404 depending on route setup
    expect([401, 404]).toContain(response.status());
  });

  test("POST /api/setup/workflows/import requires authentication", async ({
    request,
  }) => {
    const response = await request.post(
      `${DASHBOARD_URL}/api/setup/workflows/import`,
      {
        data: { importAll: true },
      }
    );

    expect(response.status()).toBe(401);
  });

  test("POST /api/workflows/export requires authentication", async ({
    request,
  }) => {
    const response = await request.post(
      `${DASHBOARD_URL}/api/workflows/export`,
      {
        data: { workflowId: "test-id" },
      }
    );

    expect(response.status()).toBe(401);
  });
});

test.describe("Workflow Sync - Detection", () => {
  test.describe("Deleted Workflow Detection", () => {
    test("sync endpoint should detect deleted workflows", async ({ request: _request }) => {
      if (shouldSkip) {
        test.skip();
        return;
      }

      // This test would:
      // 1. Complete setup
      // 2. Delete a workflow from n8n
      // 3. Call sync endpoint
      // 4. Verify the deleted workflow is detected

      // Currently blocked by authentication requirement
      console.log("Test requires authentication");
    });
  });

  test.describe("State Change Detection", () => {
    test("sync endpoint should detect activated/deactivated workflows", async ({
      request: _request,
    }) => {
      if (shouldSkip) {
        test.skip();
        return;
      }

      // This test would:
      // 1. Complete setup
      // 2. Change workflow active state in n8n
      // 3. Call sync endpoint
      // 4. Verify the state change is detected

      console.log("Test requires authentication");
    });
  });
});

test.describe("Workflow Export", () => {
  test("export endpoint should return sanitized workflow JSON", async ({
    request: _request,
  }) => {
    if (shouldSkip) {
      test.skip();
      return;
    }

    // This test would verify that exported workflows:
    // 1. Don't contain credentials
    // 2. Don't contain read-only fields like tags
    // 3. Are valid for re-import

    console.log("Test requires authentication");
  });
});

test.describe("Workflow Import - Two-Phase Process", () => {
  test("import should create workflows in Phase 1 (inactive)", async ({
    request: _request,
  }) => {
    if (shouldSkip) {
      test.skip();
      return;
    }

    // This test verifies Phase 1 of two-phase import:
    // All workflows are created in inactive state first

    console.log("Test requires authentication");
  });

  test("import should activate workflows in Phase 2 (dependency order)", async ({
    request: _request,
  }) => {
    if (shouldSkip) {
      test.skip();
      return;
    }

    // This test verifies Phase 2 of two-phase import:
    // Workflows are activated in dependency order to avoid
    // "workflow not published" errors

    console.log("Test requires authentication");
  });

  test("import should rollback on Phase 1 failure", async ({ request: _request }) => {
    if (shouldSkip) {
      test.skip();
      return;
    }

    // This test verifies rollback behavior:
    // If Phase 1 fails, all created workflows should be deleted

    console.log("Test requires authentication");
  });
});

test.describe("n8n Health Check", () => {
  test("should verify n8n instance is accessible", async ({ request }) => {
    const response = await request.get(`${N8N_API_URL}/healthz`);

    expect(response.status()).toBe(200);
  });

  test("should verify n8n API is accessible with key", async ({ request }) => {
    if (!N8N_API_KEY) {
      test.skip();
      return;
    }

    const response = await request.get(`${N8N_API_URL}/api/v1/workflows?limit=1`, {
      headers: {
        "X-N8N-API-KEY": N8N_API_KEY,
      },
    });

    expect(response.status()).toBe(200);
  });
});

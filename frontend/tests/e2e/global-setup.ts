/**
 * Playwright Global Setup
 *
 * Runs before all tests to ensure the test environment is ready.
 *
 * What it does:
 * 1. Verifies Docker environment is running (if not in CI)
 * 2. Waits for all services to be healthy
 * 3. Optionally sets up n8n owner and API key
 * 4. Stores authentication state for tests
 *
 * Environment variables:
 *   DASHBOARD_URL - Dashboard URL (default: http://dashboard.localhost)
 *   N8N_API_URL - n8n URL (default: http://n8n.localhost)
 *   N8N_API_KEY - n8n API key (optional, but required for full tests)
 *   SKIP_DOCKER_CHECK - Skip Docker health checks (default: false)
 *   CI - Whether running in CI environment
 */

import type { FullConfig } from "@playwright/test";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const DASHBOARD_URL = process.env.DASHBOARD_URL || "http://dashboard.localhost";
const N8N_API_URL = process.env.N8N_API_URL || "http://n8n.localhost";
const SKIP_DOCKER_CHECK = process.env.SKIP_DOCKER_CHECK === "true";

/**
 * Check if a URL is accessible
 */
async function isUrlAccessible(url: string, timeout = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Wait for a URL to be accessible
 */
async function waitForUrl(
  url: string,
  maxAttempts = 30,
  interval = 2000
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    if (await isUrlAccessible(url)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  return false;
}

/**
 * Check Docker environment health
 */
async function checkDockerEnvironment(): Promise<{
  healthy: boolean;
  services: { name: string; status: string }[];
}> {
  try {
    const { stdout } = await execAsync(
      'docker compose -f docker-compose.local-prod.yml ps --format "{{.Service}}\t{{.Health}}"'
    );

    const services = stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [name, status] = line.split("\t");
        return { name, status: status || "unknown" };
      });

    const healthy = services.every(
      (s) => s.status === "healthy" || s.status === "running"
    );

    return { healthy, services };
  } catch {
    return { healthy: false, services: [] };
  }
}

/**
 * Main global setup function
 */
async function globalSetup(_config: FullConfig) {
  console.log("\n=== Playwright Global Setup ===\n");

  // Check Docker environment (unless skipped)
  if (!SKIP_DOCKER_CHECK && !process.env.CI) {
    console.log("Checking Docker environment...");

    const { healthy, services } = await checkDockerEnvironment();

    if (!healthy) {
      console.log("\nDocker services status:");
      services.forEach((s) => {
        const icon = s.status === "healthy" ? "✓" : "✗";
        console.log(`  ${icon} ${s.name}: ${s.status}`);
      });

      if (services.length === 0) {
        console.log("\n⚠️  No Docker services running.");
        console.log("   Start with: npm run test:local-prod:up");
        console.log("   Then run: ./scripts/setup-n8n-test-instance.sh\n");
      }
    } else {
      console.log("✓ All Docker services healthy");
    }
  }

  // Wait for services to be accessible
  console.log("\nWaiting for services...");

  const dashboardReady = await waitForUrl(`${DASHBOARD_URL}/api/health`, 15, 2000);
  if (dashboardReady) {
    console.log(`✓ Dashboard accessible at ${DASHBOARD_URL}`);
  } else {
    console.log(`✗ Dashboard not accessible at ${DASHBOARD_URL}`);
  }

  const n8nReady = await waitForUrl(`${N8N_API_URL}/healthz`, 15, 2000);
  if (n8nReady) {
    console.log(`✓ n8n accessible at ${N8N_API_URL}`);
  } else {
    console.log(`✗ n8n not accessible at ${N8N_API_URL}`);
  }

  // Check n8n API key
  const apiKey = process.env.N8N_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch(`${N8N_API_URL}/api/v1/workflows?limit=1`, {
        headers: { "X-N8N-API-KEY": apiKey },
      });
      if (response.ok) {
        console.log("✓ n8n API key is valid");
      } else {
        console.log("✗ n8n API key is invalid");
      }
    } catch {
      console.log("✗ Failed to validate n8n API key");
    }
  } else {
    console.log("⚠️  N8N_API_KEY not set - some tests will be skipped");
    console.log("   Run: export N8N_API_KEY=$(cat /tmp/n8n-test-api-key)");
  }

  // Optionally set up authenticated state
  // This would be used if we want to share auth state across tests
  // For now, we rely on tests handling their own auth

  console.log("\n=== Global Setup Complete ===\n");
}

export default globalSetup;

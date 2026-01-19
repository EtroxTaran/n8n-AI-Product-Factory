/**
 * Playwright Global Teardown
 *
 * Runs after all tests complete to clean up the test environment.
 *
 * What it does:
 * 1. Cleans up any test data created during tests
 * 2. Optionally stops Docker environment (if requested)
 * 3. Generates summary report
 *
 * Environment variables:
 *   STOP_DOCKER_AFTER_TESTS - Stop Docker after tests (default: false)
 *   N8N_API_URL - n8n URL for cleanup
 *   N8N_API_KEY - n8n API key for cleanup
 */

import { FullConfig } from "@playwright/test";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const N8N_API_URL = process.env.N8N_API_URL || "http://n8n.localhost";
const N8N_API_KEY = process.env.N8N_API_KEY || "";
const STOP_DOCKER_AFTER_TESTS = process.env.STOP_DOCKER_AFTER_TESTS === "true";

/**
 * Clean up test workflows from n8n
 */
async function cleanupTestWorkflows(): Promise<void> {
  if (!N8N_API_KEY) {
    console.log("No API key - skipping workflow cleanup");
    return;
  }

  try {
    // Get all workflows
    const response = await fetch(`${N8N_API_URL}/api/v1/workflows?limit=100`, {
      headers: { "X-N8N-API-KEY": N8N_API_KEY },
    });

    if (!response.ok) {
      console.log("Failed to list workflows for cleanup");
      return;
    }

    const data = await response.json();
    const workflows = data.data || [];

    // Delete test workflows (those with test suffixes)
    const testWorkflows = workflows.filter((w: { name: string }) =>
      /\(test-\d+\)|\(phase-test-\d+\)|\(dep-test-\d+\)|\(activation-test-\d+\)/.test(
        w.name
      )
    );

    if (testWorkflows.length > 0) {
      console.log(`Cleaning up ${testWorkflows.length} test workflow(s)...`);

      for (const workflow of testWorkflows) {
        await fetch(`${N8N_API_URL}/api/v1/workflows/${workflow.id}`, {
          method: "DELETE",
          headers: { "X-N8N-API-KEY": N8N_API_KEY },
        });
      }

      console.log("✓ Test workflows cleaned up");
    }
  } catch (error) {
    console.log("Workflow cleanup failed:", error);
  }
}

/**
 * Stop Docker environment
 */
async function stopDockerEnvironment(): Promise<void> {
  try {
    console.log("Stopping Docker environment...");
    await execAsync("docker compose -f docker-compose.local-prod.yml down -v");
    console.log("✓ Docker environment stopped");
  } catch (error) {
    console.log("Failed to stop Docker:", error);
  }
}

/**
 * Main global teardown function
 */
async function globalTeardown(_config: FullConfig) {
  console.log("\n=== Playwright Global Teardown ===\n");

  // Clean up test workflows
  await cleanupTestWorkflows();

  // Optionally stop Docker
  if (STOP_DOCKER_AFTER_TESTS) {
    await stopDockerEnvironment();
  } else {
    console.log("Docker environment kept running");
    console.log("Stop with: docker compose -f docker-compose.local-prod.yml down -v");
  }

  console.log("\n=== Global Teardown Complete ===\n");
}

export default globalTeardown;

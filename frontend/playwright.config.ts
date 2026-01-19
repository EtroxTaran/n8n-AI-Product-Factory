import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Configuration for AI Product Factory Dashboard
 *
 * Test Modes:
 * 1. Development mode (default): Starts local dev server, uses localhost
 * 2. Production parity mode: Uses docker-compose.local-prod.yml environment
 *    Set DASHBOARD_URL=http://dashboard.localhost to use Traefik routing
 *
 * Run tests with:
 *   npx playwright test                    # Development mode
 *   npx playwright test --project=chromium # Specific browser
 *   DASHBOARD_URL=http://dashboard.localhost npx playwright test  # Prod parity
 *
 * Run specific test:
 *   npx playwright test tests/e2e/auth-guards.spec.ts
 *
 * Run with UI:
 *   npx playwright test --ui
 */
export default defineConfig({
  // Test directory
  testDir: "./tests/e2e",

  // Test file pattern
  testMatch: "**/*.spec.ts",

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Global setup and teardown
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",

  // Test timeout (120s for slow setup wizard tests)
  timeout: 120000,

  // Expect timeout for assertions
  expect: {
    timeout: 10000,
  },

  // Reporter to use
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report" }],
    // Add JUnit for CI integration
    ...(process.env.CI ? [["junit", { outputFile: "test-results/junit.xml" }] as const] : []),
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    // Development: http://localhost:3000
    // Production parity: http://dashboard.localhost (via Traefik)
    baseURL: process.env.DASHBOARD_URL || "http://localhost:3000",

    // Collect trace when retrying the failed test
    trace: "on-first-retry",

    // Take screenshot on failure
    screenshot: "only-on-failure",

    // Record video on failure
    video: "retain-on-failure",

    // Viewport size
    viewport: { width: 1280, height: 720 },
  },

  // Configure projects for major browsers
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Firefox and Safari for cross-browser testing
    // Uncomment for full browser matrix testing
    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] },
    // },
    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] },
    // },
  ],

  // Run your local dev server before starting the tests
  // Only in development mode (not when using production parity environment)
  webServer:
    process.env.CI || process.env.DASHBOARD_URL?.includes("localhost")
      ? undefined
      : {
          command: "npm run dev",
          url: "http://localhost:3000",
          reuseExistingServer: true,
          timeout: 120000,
        },
});

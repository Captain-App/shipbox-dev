import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for integration tests against production services.
 * These tests use real Cloudflare sandboxes and OpenCode agents.
 *
 * Key differences from regular e2e config:
 * - Longer timeouts (5 min per test, 2 min for sandbox startup)
 * - Serial execution (not parallel - expensive real resources)
 * - Video and trace recording always on
 * - Separate auth storage file
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: /integration.*\.spec\.ts/,

  // Serial execution - real sandboxes are expensive
  fullyParallel: false,
  workers: 1,

  // Longer timeouts for real sandbox operations
  timeout: 5 * 60 * 1000, // 5 minutes per test
  expect: {
    timeout: 2 * 60 * 1000, // 2 minutes for assertions (sandbox startup)
  },

  // Fail fast in CI, no retries in integration tests (expensive)
  forbidOnly: !!process.env.CI,
  retries: 0,

  reporter: [
    ["html", { outputFolder: "playwright-integration-report" }],
    ["list"],
  ],

  use: {
    baseURL: "http://localhost:5173",

    // Always capture evidence for debugging
    trace: "on",
    video: "on",
    screenshot: "on",

    // Longer action timeout for real operations
    actionTimeout: 60000,
    navigationTimeout: 60000,
  },

  projects: [
    // Integration setup project - requires real credentials
    {
      name: "integration-setup",
      testMatch: /integration\.setup\.ts/,
    },

    // Main integration test project
    {
      name: "integration",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/integration-user.json",
      },
      dependencies: ["integration-setup"],
      testIgnore: /integration\.setup\.ts/,
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 120000,
  },
});

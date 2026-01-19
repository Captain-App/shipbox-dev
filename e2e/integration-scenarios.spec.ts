import { test } from "@playwright/test";
import { scenarioTest } from "./framework";
import { createExecutor } from "./steps";
import { integrationScenarios } from "./scenarios";

/**
 * Integration test runner for real Cloudflare sandbox tests.
 *
 * These tests:
 * - Use real production backend and engine services
 * - Create real Cloudflare Container sandboxes
 * - Execute real OpenCode agent tasks
 * - Consume real Anthropic API credits
 *
 * Run configuration:
 *   npm run test:e2e:integration
 *
 * Requirements:
 * - E2E_TEST_EMAIL and E2E_TEST_PASSWORD environment variables
 * - Test account must have sufficient credits
 * - Anthropic API key must be configured in settings
 * - For GitHub tests: GitHub App must be installed
 *
 * Cost warning:
 * Each test run costs approximately $0.01-0.15 in API and container costs.
 * Recommended to run nightly or on-demand only.
 */

// Fail fast if integration mode is not enabled
if (process.env.E2E_INTEGRATION_MODE !== "true") {
  console.warn(`
================================================================================
WARNING: Integration tests require E2E_INTEGRATION_MODE=true

These tests use real production services and cost money to run.
To run integration tests:

  E2E_INTEGRATION_MODE=true npm run test:e2e:integration

Or set the environment variable in your shell before running tests.
================================================================================
  `);
}

// Create executor once for all tests
const executor = createExecutor();

// Print integration test info
console.log("\n" + "=".repeat(70));
console.log("🔌 INTEGRATION TEST SUITE");
console.log("=".repeat(70));
console.log(`   Tests: ${integrationScenarios.length}`);
console.log("   Mode: Real Cloudflare Sandboxes + OpenCode Agents");
console.log("   Backend: production (backend.shipbox.dev)");
console.log("   Engine: production (engine.shipbox.dev)");
console.log("=".repeat(70) + "\n");

// Run each integration scenario
for (const scenario of integrationScenarios) {
  scenarioTest(test, executor, scenario);
}

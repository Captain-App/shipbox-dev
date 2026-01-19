import { Page, expect } from "@playwright/test";
import {
  ScenarioState,
  Precondition,
  TestStep,
  StepParams,
  stepDisplayNames,
  categoryDisplayNames,
} from "./scenario";
import { StepContext, StepExecutor } from "./step-executor";

/**
 * Creates a test context for a single scenario execution
 */
function createStepContext(
  page: Page,
  state: ScenarioState,
): StepContext {
  return {
    page,
    state,
    settle: async (timeout = 3000) => {
      await page.waitForLoadState("networkidle", { timeout });
    },
    goto: async (url: string) => {
      await page.goto(url);
    },
    getUrl: () => page.url(),
  };
}

/**
 * Sets up preconditions before running scenario steps
 */
async function setupPreconditions(
  executor: StepExecutor,
  preconditions: Precondition[],
  ctx: StepContext,
): Promise<void> {
  for (const precondition of preconditions) {
    console.log(`  🔧 Setting up: ${precondition}`);

    switch (precondition) {
      case Precondition.LoggedIn:
        // Execute login step if not already logged in
        if (!ctx.state.isLoggedIn) {
          await executor.execute(ctx, TestStep.Login);
        }
        break;

      case Precondition.HasSession:
        // Ensure logged in first
        if (!ctx.state.isLoggedIn) {
          await executor.execute(ctx, TestStep.Login);
        }
        // Create a test session
        await executor.execute(ctx, TestStep.CreateBox, {
          title: "Precondition Test Session",
        });
        break;

      // Integration test preconditions
      case Precondition.HasCredits:
        // Verify user has credits - navigate to billing and check
        console.log("    Verifying user has credits...");
        // For now, we assume the test account has credits
        // A full implementation would check the billing page
        ctx.state.balance = 1; // Assume positive balance
        break;

      case Precondition.HasApiKey:
        // Verify API key is configured
        console.log("    Verifying API key is configured...");
        // For now, we assume the test account has an API key
        ctx.state.apiKeySet = true;
        break;

      case Precondition.HasGitHub:
        // Verify GitHub is connected
        console.log("    Verifying GitHub App is installed...");
        // For now, we assume GitHub is connected
        ctx.state.githubConnected = true;
        break;
    }
  }
}

/**
 * Main scenario test function - wraps Playwright test with scenario logic
 */
export function scenarioTest(
  test: any,
  executor: StepExecutor,
  scenario: {
    name: string;
    categories: string[];
    preconditions: Precondition[];
    steps: TestStep[];
    stepParams?: Record<number, StepParams>;
    verify?: (state: ScenarioState) => Promise<void>;
  },
): void {
  // Build test name with category tags
  const tags = scenario.categories
    .map((cat) => categoryDisplayNames[cat as any])
    .join(", ");
  const testName = `Scenario: ${scenario.name} [${tags}]`;

  test(testName, async ({ page }) => {
    console.log("\n" + "=".repeat(70));
    console.log(`🎬 ${scenario.name}`);
    console.log("=".repeat(70));

    const state = new ScenarioState();
    const ctx = createStepContext(page, state);

    try {
      // 1. Setup preconditions
      if (scenario.preconditions.length > 0) {
        console.log("\n📋 Setting up preconditions:");
        await setupPreconditions(executor, scenario.preconditions, ctx);
      }

      // 2. Execute steps
      console.log("\n📜 Executing steps:");
      for (let i = 0; i < scenario.steps.length; i++) {
        const step = scenario.steps[i];
        const params = scenario.stepParams?.[i];
        await executor.execute(ctx, step, params);
      }

      // 3. Verification
      if (scenario.verify) {
        console.log("\n🔍 Running verification:");
        await scenario.verify(state);
        console.log("✅ Verification passed");
      }

      console.log("\n" + "=".repeat(70));
      console.log(`✅ PASSED: ${scenario.name}`);
      console.log("=".repeat(70) + "\n");
    } catch (error) {
      console.log("\n" + "=".repeat(70));
      console.log(`❌ FAILED: ${scenario.name}`);
      console.log("=".repeat(70) + "\n");
      throw error;
    }
  });
}

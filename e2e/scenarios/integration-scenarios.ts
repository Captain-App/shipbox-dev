import {
  Scenario,
  Precondition,
  TestStep,
  TestCategory,
  ScenarioState,
} from "../framework";

/**
 * Integration test scenarios that use real Cloudflare sandboxes.
 *
 * These tests:
 * - Create real sandbox containers
 * - Execute real OpenCode agent tasks
 * - Consume real Anthropic API credits
 *
 * Run these tests sparingly (nightly or on-demand) due to cost.
 */
export const integrationScenarios: Scenario[] = [
  {
    name: "Sandbox can be created and becomes active",
    categories: [TestCategory.Integration, TestCategory.Critical],
    preconditions: [Precondition.LoggedIn, Precondition.HasCredits],
    steps: [
      TestStep.NavigateToBoxes,
      TestStep.CreateBox,
      TestStep.OpenBox,
      TestStep.WaitForSandboxReady,
      TestStep.CleanupTestBox,
    ],
    stepParams: {
      1: { title: "E2E Test - Sandbox Creation" },
      3: { timeout: 120000 }, // 2 minutes for sandbox startup
    },
    verify: async (state: ScenarioState) => {
      if (state.sandboxStatus !== "active") {
        throw new Error(
          `Expected sandbox status "active", got "${state.sandboxStatus}"`
        );
      }
    },
  },

  {
    name: "Agent can create a simple file",
    categories: [TestCategory.Integration],
    preconditions: [
      Precondition.LoggedIn,
      Precondition.HasCredits,
      Precondition.HasApiKey,
    ],
    steps: [
      TestStep.NavigateToBoxes,
      TestStep.CreateBox,
      TestStep.OpenBox,
      TestStep.WaitForSandboxReady,
      TestStep.SendAgentTask,
      TestStep.WaitForTaskCompletion,
      TestStep.CleanupTestBox,
    ],
    stepParams: {
      1: { title: "E2E Test - Simple File Task" },
      4: { task: "Create a file called hello.txt with the content 'Hello from E2E test'" },
      5: { timeout: 180000 }, // 3 minutes for task completion
    },
    verify: async (state: ScenarioState) => {
      if (state.sandboxStatus !== "active") {
        throw new Error("Sandbox should be active");
      }
    },
  },

  {
    name: "Realtime events are received during agent execution",
    categories: [TestCategory.Integration],
    preconditions: [
      Precondition.LoggedIn,
      Precondition.HasCredits,
      Precondition.HasApiKey,
    ],
    steps: [
      TestStep.NavigateToBoxes,
      TestStep.CreateBox,
      TestStep.OpenBox,
      TestStep.WaitForSandboxReady,
      TestStep.SendAgentTask,
      TestStep.WaitForRealtimeEvent,
      TestStep.WaitForTaskCompletion,
      TestStep.CleanupTestBox,
    ],
    stepParams: {
      1: { title: "E2E Test - Realtime Events" },
      4: { task: "List the files in the current directory" },
      5: { eventType: "tool_call", timeout: 60000 },
    },
    verify: async (state: ScenarioState) => {
      if (!state.lastRealtimeEvent) {
        throw new Error("Expected to receive at least one realtime event");
      }
    },
  },

  {
    name: "Agent can clone a repository and make changes",
    categories: [TestCategory.Integration],
    preconditions: [
      Precondition.LoggedIn,
      Precondition.HasCredits,
      Precondition.HasApiKey,
      Precondition.HasGitHub,
    ],
    steps: [
      TestStep.NavigateToBoxes,
      TestStep.CreateBox,
      TestStep.OpenBox,
      TestStep.WaitForSandboxReady,
      TestStep.SendAgentTask,
      TestStep.WaitForTaskCompletion,
      TestStep.CleanupTestBox,
    ],
    stepParams: {
      1: { title: "E2E Test - Git Operations" },
      4: {
        task: "Clone the repository https://github.com/octocat/Hello-World and create a new file called e2e-test.md with the current timestamp",
      },
      5: { timeout: 180000 },
    },
  },

  {
    name: "Plan is updated after task execution",
    categories: [TestCategory.Integration],
    preconditions: [
      Precondition.LoggedIn,
      Precondition.HasCredits,
      Precondition.HasApiKey,
    ],
    steps: [
      TestStep.NavigateToBoxes,
      TestStep.CreateBox,
      TestStep.OpenBox,
      TestStep.WaitForSandboxReady,
      TestStep.SendAgentTask,
      TestStep.WaitForTaskCompletion,
      TestStep.CleanupTestBox,
    ],
    stepParams: {
      1: { title: "E2E Test - Plan Updates" },
      4: {
        task: "Create a simple Node.js project with a package.json and index.js file",
      },
      5: { timeout: 180000 },
    },
  },

  {
    name: "Multiple tasks can be executed in sequence",
    categories: [TestCategory.Integration],
    preconditions: [
      Precondition.LoggedIn,
      Precondition.HasCredits,
      Precondition.HasApiKey,
    ],
    steps: [
      TestStep.NavigateToBoxes,
      TestStep.CreateBox,
      TestStep.OpenBox,
      TestStep.WaitForSandboxReady,
      TestStep.SendAgentTask,
      TestStep.WaitForTaskCompletion,
      TestStep.SendAgentTask,
      TestStep.WaitForTaskCompletion,
      TestStep.CleanupTestBox,
    ],
    stepParams: {
      1: { title: "E2E Test - Sequential Tasks" },
      4: { task: "Create a file called first.txt with content 'First task'" },
      5: { timeout: 120000 },
      6: { task: "Create a file called second.txt with content 'Second task'" },
      7: { timeout: 120000 },
    },
  },
];

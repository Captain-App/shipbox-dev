import { StepContext, StepParams } from "../framework";
import { RealWorkspacePage, BoxWorkspacePage } from "../pages";

/**
 * Wait for the sandbox container to become active.
 * Timeout: up to 2 minutes (sandbox startup time)
 */
export async function waitForSandboxReady(
  ctx: StepContext,
  params?: StepParams
): Promise<void> {
  const workspace = new RealWorkspacePage(ctx.page);
  const timeout = params?.timeout || 120000;

  await workspace.waitForSandboxReady(timeout);
  ctx.state.sandboxStatus = "active";
}

/**
 * Send a task to the OpenCode agent.
 */
export async function sendAgentTask(
  ctx: StepContext,
  params?: StepParams
): Promise<void> {
  const workspace = new RealWorkspacePage(ctx.page);
  const task = params?.task || "Create a simple hello world file";

  const runId = await workspace.sendTask(task);
  if (runId) {
    ctx.state.currentRunId = runId;
  }
}

/**
 * Wait for the current agent task to complete.
 * Timeout: up to 3 minutes (agent execution time)
 */
export async function waitForTaskCompletion(
  ctx: StepContext,
  params?: StepParams
): Promise<void> {
  const workspace = new RealWorkspacePage(ctx.page);
  const timeout = params?.timeout || 180000;

  await workspace.waitForTaskCompletion(timeout);
}

/**
 * Wait for a specific realtime event from the WebSocket connection.
 * Event types: tool_call, tool_result, message, plan_update
 */
export async function waitForRealtimeEvent(
  ctx: StepContext,
  params?: StepParams
): Promise<void> {
  const workspace = new RealWorkspacePage(ctx.page);
  const eventType = params?.eventType || "message";
  const timeout = params?.timeout || 60000;

  const received = await workspace.waitForRealtimeEvent(eventType, timeout);
  if (received) {
    ctx.state.lastRealtimeEvent = eventType;
  }
}

/**
 * Verify that a file was created in the workspace.
 */
export async function verifyFileCreated(
  ctx: StepContext,
  params?: StepParams
): Promise<void> {
  const workspace = new RealWorkspacePage(ctx.page);
  const filePath = params?.filePath;

  if (!filePath) {
    throw new Error("filePath parameter is required for verifyFileCreated");
  }

  const exists = await workspace.verifyFileExists(filePath);
  if (exists) {
    ctx.state.createdFiles.push(filePath);
  } else {
    throw new Error(`Expected file not found: ${filePath}`);
  }
}

/**
 * Verify that the PLAN.md contains expected content.
 */
export async function verifyPlanContent(
  ctx: StepContext,
  params?: StepParams
): Promise<void> {
  const workspace = new RealWorkspacePage(ctx.page);
  const expectedText = params?.expectedText;

  if (!expectedText) {
    throw new Error("expectedText parameter is required for verifyPlanContent");
  }

  const planContent = await workspace.getPlanContent();
  ctx.state.planContent = planContent || undefined;

  const contains = await workspace.verifyPlanContains(expectedText);
  if (!contains) {
    throw new Error(`Plan does not contain expected text: ${expectedText}`);
  }
}

/**
 * Clean up the test box after the test.
 */
export async function cleanupTestBox(ctx: StepContext): Promise<void> {
  const workspace = new RealWorkspacePage(ctx.page);

  try {
    await workspace.deleteCurrentBox();
    ctx.state.currentSessionId = undefined;
    ctx.state.currentSessionTitle = undefined;
  } catch (error) {
    console.log("Warning: Failed to cleanup test box:", error);
    // Don't fail the test if cleanup fails
  }
}

/**
 * Create a test box specifically for integration tests.
 * Uses a distinctive title prefix for easy identification/cleanup.
 */
export async function createIntegrationTestBox(
  ctx: StepContext,
  params?: StepParams
): Promise<void> {
  const boxPage = new BoxWorkspacePage(ctx.page);

  // Navigate to boxes list
  await boxPage.gotoBoxesList();

  // Click create button
  await boxPage.clickCreateNewBox();
  await boxPage.expectCreateModalVisible();

  // Fill in title with E2E prefix for easy identification
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const title = params?.title || `E2E Test - Integration ${timestamp}`;
  await boxPage.fillBoxTitle(title);

  // Submit
  await boxPage.submitCreateBox();

  // Update state
  ctx.state.currentSessionTitle = title;
}

/**
 * Open an existing box and wait for it to be ready.
 * This combines navigation and waiting for the sandbox to start.
 */
export async function openBoxAndWaitReady(
  ctx: StepContext,
  params?: StepParams
): Promise<void> {
  const boxPage = new BoxWorkspacePage(ctx.page);
  const workspace = new RealWorkspacePage(ctx.page);

  await boxPage.gotoBoxesList();
  await boxPage.openFirstBox();

  // Wait for sandbox to become active
  const timeout = params?.timeout || 120000;
  await workspace.waitForSandboxReady(timeout);
  ctx.state.sandboxStatus = "active";
}

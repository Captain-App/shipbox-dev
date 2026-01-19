import { StepContext, StepExecutor, TestStep, StepParams } from "../framework";
import * as authSteps from "./auth-steps";
import * as navigationSteps from "./navigation-steps";
import * as boxSteps from "./box-steps";
import * as billingSteps from "./billing-steps";
import * as settingsSteps from "./settings-steps";
import * as integrationSteps from "./integration-steps";

/**
 * Initializes the step executor with all domain step implementations
 */
export function createExecutor(): StepExecutor {
  const executor = new StepExecutor();

  // Auth steps
  executor.register(TestStep.Login, authSteps.login);
  executor.register(TestStep.Logout, authSteps.logout);
  executor.register(TestStep.VerifyLoggedIn, authSteps.verifyLoggedIn);
  executor.register(TestStep.VerifyLoggedOut, authSteps.verifyLoggedOut);
  executor.register(TestStep.NavigateToLogin, authSteps.navigateToLogin);

  // Navigation steps
  executor.register(TestStep.NavigateToDashboard, navigationSteps.navigateToDashboard);
  executor.register(TestStep.NavigateToBoxes, navigationSteps.navigateToBoxes);
  executor.register(TestStep.NavigateToSettings, navigationSteps.navigateToSettings);
  executor.register(TestStep.NavigateToBilling, navigationSteps.navigateToBilling);

  // Box steps
  executor.register(TestStep.CreateBox, boxSteps.createBox);
  executor.register(TestStep.OpenBox, boxSteps.openBox);
  executor.register(TestStep.DeleteBox, boxSteps.deleteBox);
  executor.register(TestStep.SendMessage, boxSteps.sendMessage);
  executor.register(TestStep.VerifyAgentResponse, boxSteps.verifyAgentResponse);
  executor.register(TestStep.OpenBoxPreview, boxSteps.openBoxPreview);
  executor.register(TestStep.CloseBoxPreview, boxSteps.closeBoxPreview);

  // Billing steps
  executor.register(TestStep.VerifyBalance, billingSteps.verifyBalance);
  executor.register(TestStep.ViewInvoices, billingSteps.viewInvoices);

  // Settings steps
  executor.register(TestStep.SetApiKey, settingsSteps.setApiKey);
  executor.register(TestStep.ConnectGitHub, settingsSteps.connectGitHub);
  executor.register(TestStep.DisconnectGitHub, settingsSteps.disconnectGitHub);
  executor.register(TestStep.VerifySettings, settingsSteps.verifySettings);

  // Integration test steps (real sandbox operations)
  executor.register(TestStep.WaitForSandboxReady, integrationSteps.waitForSandboxReady);
  executor.register(TestStep.SendAgentTask, integrationSteps.sendAgentTask);
  executor.register(TestStep.WaitForTaskCompletion, integrationSteps.waitForTaskCompletion);
  executor.register(TestStep.WaitForRealtimeEvent, integrationSteps.waitForRealtimeEvent);
  executor.register(TestStep.VerifyFileCreated, integrationSteps.verifyFileCreated);
  executor.register(TestStep.VerifyPlanContent, integrationSteps.verifyPlanContent);
  executor.register(TestStep.CleanupTestBox, integrationSteps.cleanupTestBox);

  return executor;
}

export { createExecutor as default };

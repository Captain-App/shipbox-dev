/**
 * Scenario-based testing framework
 * Inspired by co2-admin Flutter testing patterns
 */

export enum Precondition {
  LoggedIn = "loggedIn",
  HasSession = "hasSession",
  // Integration test preconditions
  HasCredits = "hasCredits",
  HasApiKey = "hasApiKey",
  HasGitHub = "hasGitHub",
}

export enum TestCategory {
  Auth = "auth",
  Critical = "critical",
  Box = "box",
  Billing = "billing",
  Settings = "settings",
  Smoke = "smoke",
  Onboarding = "onboarding",
  // Integration test category - real sandbox tests
  Integration = "integration",
}

export enum TestStep {
  // Auth steps
  Login = "login",
  Logout = "logout",
  VerifyLoggedIn = "verifyLoggedIn",
  VerifyLoggedOut = "verifyLoggedOut",
  NavigateToLogin = "navigateToLogin",

  // Dashboard/Navigation steps
  NavigateToDashboard = "navigateToDashboard",
  NavigateToBoxes = "navigateToBoxes",
  NavigateToSettings = "navigateToSettings",
  NavigateToBilling = "navigateToBilling",

  // Box steps
  CreateBox = "createBox",
  OpenBox = "openBox",
  DeleteBox = "deleteBox",
  SendMessage = "sendMessage",
  VerifyAgentResponse = "verifyAgentResponse",
  OpenBoxPreview = "openBoxPreview",
  CloseBoxPreview = "closeBoxPreview",

  // Billing steps
  VerifyBalance = "verifyBalance",
  ViewInvoices = "viewInvoices",

  // Settings steps
  SetApiKey = "setApiKey",
  ConnectGitHub = "connectGitHub",
  DisconnectGitHub = "disconnectGitHub",
  VerifySettings = "verifySettings",

  // Integration test steps - real sandbox operations
  WaitForSandboxReady = "waitForSandboxReady",
  SendAgentTask = "sendAgentTask",
  WaitForTaskCompletion = "waitForTaskCompletion",
  WaitForRealtimeEvent = "waitForRealtimeEvent",
  VerifyFileCreated = "verifyFileCreated",
  VerifyPlanContent = "verifyPlanContent",
  CleanupTestBox = "cleanupTestBox",
}

/**
 * Shared state for a test scenario
 * Tracks entities created during the scenario
 */
export class ScenarioState {
  isLoggedIn = false;
  currentUserEmail?: string;
  currentSessionId?: string;
  currentSessionTitle?: string;
  balance = 0;
  apiKeySet = false;
  githubConnected = false;

  // Integration test state
  sandboxStatus?: "creating" | "active" | "stopped" | "error";
  currentRunId?: string;
  lastRealtimeEvent?: string;
  createdFiles: string[] = [];
  planContent?: string;

  reset(): void {
    this.isLoggedIn = false;
    this.currentUserEmail = undefined;
    this.currentSessionId = undefined;
    this.currentSessionTitle = undefined;
    this.balance = 0;
    this.apiKeySet = false;
    this.githubConnected = false;
    // Reset integration state
    this.sandboxStatus = undefined;
    this.currentRunId = undefined;
    this.lastRealtimeEvent = undefined;
    this.createdFiles = [];
    this.planContent = undefined;
  }
}

/**
 * Step parameters - optional data to customize step execution
 */
export type StepParams = Record<string, any>;

/**
 * Verification function for custom assertions after steps complete
 */
export type VerifyFn = (state: ScenarioState) => Promise<void>;

/**
 * A complete user journey defined as preconditions + steps + verification
 */
export interface Scenario {
  name: string;
  categories: TestCategory[];
  preconditions: Precondition[];
  steps: TestStep[];
  stepParams?: Record<number, StepParams>;
  verify?: VerifyFn;
}

/**
 * Display name extensions
 */
export const stepDisplayNames: Record<TestStep, string> = {
  [TestStep.Login]: "Login",
  [TestStep.Logout]: "Logout",
  [TestStep.VerifyLoggedIn]: "Verify Logged In",
  [TestStep.VerifyLoggedOut]: "Verify Logged Out",
  [TestStep.NavigateToLogin]: "Navigate to Login",
  [TestStep.NavigateToDashboard]: "Navigate to Dashboard",
  [TestStep.NavigateToBoxes]: "Navigate to Boxes",
  [TestStep.NavigateToSettings]: "Navigate to Settings",
  [TestStep.NavigateToBilling]: "Navigate to Billing",
  [TestStep.CreateBox]: "Create Box",
  [TestStep.OpenBox]: "Open Box",
  [TestStep.DeleteBox]: "Delete Box",
  [TestStep.SendMessage]: "Send Message",
  [TestStep.VerifyAgentResponse]: "Verify Agent Response",
  [TestStep.OpenBoxPreview]: "Open Box Preview",
  [TestStep.CloseBoxPreview]: "Close Box Preview",
  [TestStep.VerifyBalance]: "Verify Balance",
  [TestStep.ViewInvoices]: "View Invoices",
  [TestStep.SetApiKey]: "Set API Key",
  [TestStep.ConnectGitHub]: "Connect GitHub",
  [TestStep.DisconnectGitHub]: "Disconnect GitHub",
  [TestStep.VerifySettings]: "Verify Settings",
  // Integration test steps
  [TestStep.WaitForSandboxReady]: "Wait for Sandbox Ready",
  [TestStep.SendAgentTask]: "Send Agent Task",
  [TestStep.WaitForTaskCompletion]: "Wait for Task Completion",
  [TestStep.WaitForRealtimeEvent]: "Wait for Realtime Event",
  [TestStep.VerifyFileCreated]: "Verify File Created",
  [TestStep.VerifyPlanContent]: "Verify Plan Content",
  [TestStep.CleanupTestBox]: "Cleanup Test Box",
};

export const categoryDisplayNames: Record<TestCategory, string> = {
  [TestCategory.Auth]: "Authentication",
  [TestCategory.Critical]: "Critical",
  [TestCategory.Box]: "Sandbox Box",
  [TestCategory.Billing]: "Billing",
  [TestCategory.Settings]: "Settings",
  [TestCategory.Smoke]: "Smoke",
  [TestCategory.Onboarding]: "Onboarding",
  [TestCategory.Integration]: "Integration",
};

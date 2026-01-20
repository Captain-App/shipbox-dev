# Scenario-Based Testing - Quick Reference

## Running Tests

```bash
# Run all scenarios
npm run test:e2e

# Run with UI (recommended for debugging)
npm run test:e2e:ui

# Run specific category
npm run test:e2e -- --grep "Smoke"
npm run test:e2e -- --grep "Critical"
npm run test:e2e -- --grep "Onboarding"

# Run specific scenario
npm run test:e2e -- --grep "User can create a new sandbox box"

# Watch mode for development
npm run test:e2e -- --watch
```

## Available Test Steps

### Authentication
- `TestStep.Login` - Login with test credentials
- `TestStep.Logout` - Logout and redirect to login
- `TestStep.VerifyLoggedIn` - Assert user is authenticated
- `TestStep.VerifyLoggedOut` - Assert user is logged out
- `TestStep.NavigateToLogin` - Navigate to login page

### Navigation
- `TestStep.NavigateToDashboard` - Go to main dashboard
- `TestStep.NavigateToBoxes` - Go to boxes list
- `TestStep.NavigateToSettings` - Go to settings page
- `TestStep.NavigateToBilling` - Go to billing page

### Sandbox Boxes
- `TestStep.CreateBox` - Create new sandbox box
- `TestStep.OpenBox` - Open a box workspace
- `TestStep.DeleteBox` - Delete a box
- `TestStep.SendMessage` - Send chat message
- `TestStep.VerifyAgentResponse` - Wait for agent response
- `TestStep.OpenBoxPreview` - View preview iframe
- `TestStep.CloseBoxPreview` - Close preview

### Billing
- `TestStep.VerifyBalance` - Check account balance
- `TestStep.ViewInvoices` - View invoices/transactions

### Settings
- `TestStep.SetApiKey` - Set Anthropic API key
- `TestStep.ConnectGitHub` - Connect GitHub account
- `TestStep.DisconnectGitHub` - Disconnect GitHub
- `TestStep.VerifySettings` - Verify settings page loaded

## Available Preconditions

```typescript
Precondition.LoggedIn   // Automatically login before test
Precondition.HasSession // Create test box and login
```

## Available Categories

```typescript
TestCategory.Auth        // Authentication tests
TestCategory.Critical    // Business-critical paths
TestCategory.Box         // Sandbox box functionality
TestCategory.Billing     // Billing/balance tests
TestCategory.Settings    // Settings/configuration
TestCategory.Smoke       // Quick validation tests
TestCategory.Onboarding  // First-time user flows
```

## Scenario Template

```typescript
{
  name: "User can do something",
  categories: [TestCategory.Box, TestCategory.Critical],
  preconditions: [Precondition.LoggedIn],
  steps: [
    TestStep.NavigateToBoxes,
    TestStep.CreateBox,
  ],
  stepParams: {
    1: { title: "My Box Title" },
  },
  verify: async (state) => {
    if (!state.currentSessionTitle) {
      throw new Error("Session should be created");
    }
  }
}
```

## ScenarioState Properties

```typescript
state.isLoggedIn           // boolean - user authenticated
state.currentUserEmail     // string? - logged in user email
state.currentSessionId     // string? - active box/session ID
state.currentSessionTitle  // string? - box title
state.balance              // number - account balance
state.apiKeySet            // boolean - API key configured
state.githubConnected      // boolean - GitHub connected
```

## Step Parameters

Pass custom data to steps:

```typescript
stepParams: {
  0: { email: "custom@example.com", password: "custom" },
  1: { title: "Custom Box Title" },
  2: { message: "Hello world" },
  3: { apiKey: "sk-1234567890" },
}
```

## Common Patterns

### Login + Dashboard Navigation
```typescript
steps: [
  TestStep.Login,
  TestStep.NavigateToDashboard,
  TestStep.VerifyLoggedIn,
]
```

### Create and Use Box
```typescript
preconditions: [Precondition.LoggedIn],
steps: [
  TestStep.NavigateToBoxes,
  TestStep.CreateBox,
  TestStep.OpenBox,
  TestStep.SendMessage,
]
```

### Settings Flow
```typescript
preconditions: [Precondition.LoggedIn],
steps: [
  TestStep.NavigateToSettings,
  TestStep.SetApiKey,
  TestStep.VerifySettings,
]
```

### Multi-Section Navigation
```typescript
preconditions: [Precondition.LoggedIn],
steps: [
  TestStep.NavigateToDashboard,
  TestStep.NavigateToBoxes,
  TestStep.NavigateBilling,
  TestStep.NavigateToSettings,
]
```

## File Locations

```
e2e/
├── framework/           # Core framework (don't edit unless extending)
├── pages/              # Page objects (edit for UI changes)
├── steps/              # Step implementations (add new steps here)
├── scenarios/          # Scenario definitions (add new scenarios here)
├── run-all-scenarios.spec.ts  # Main entry point
├── SCENARIOS.md        # Full documentation
└── IMPLEMENTATION_SUMMARY.md  # Implementation details
```

## Adding a New Scenario

1. **Add to scenario file** (e.g., `scenarios/box-scenarios.ts`):
```typescript
{
  name: "User can do X",
  categories: [TestCategory.Box],
  preconditions: [Precondition.LoggedIn],
  steps: [TestStep.CreateBox, TestStep.OpenBox],
}
```

2. **File exported automatically** via `scenarios/index.ts` - no other changes needed!

## Adding a New Step

1. **Add TestStep enum** value in `framework/scenario.ts`:
```typescript
MyNewStep = "myNewStep",
```

2. **Add display name**:
```typescript
[TestStep.MyNewStep]: "My New Step",
```

3. **Implement step** in domain file (e.g., `steps/box-steps.ts`):
```typescript
export async function myNewStep(ctx: StepContext): Promise<void> {
  // Implementation
  ctx.state.someProperty = result;
}
```

4. **Register in executor** (`steps/index.ts`):
```typescript
executor.register(TestStep.MyNewStep, boxSteps.myNewStep);
```

## Debugging Tips

### Use UI Mode
```bash
npm run test:e2e:ui
```
- Visual test explorer
- Step-by-step debugging
- Network inspection
- Screenshot capture

### Add Console Logs
```typescript
console.log("Current state:", ctx.state);
console.log("Current URL:", ctx.getUrl());
```

### Check Page Source
```typescript
const html = await ctx.page.content();
console.log(html);
```

### Wait for Specific Element
```typescript
await ctx.page.waitForSelector("[data-testid='my-element']");
```

### Increase Timeouts
```typescript
await ctx.page.waitForLoadState("networkidle", { timeout: 10000 });
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Tests fail on CI but pass locally | Check E2E_TEST_EMAIL, E2E_TEST_PASSWORD env vars |
| Element not found | Inspect in browser, verify selector, check navigation |
| Timeout waiting for element | Increase timeout, verify page navigation worked |
| Auth fails | Check test credentials, verify auth.setup.ts works |
| Agent response never comes | Expected in test env - verify with catch/try |

## Current Scenarios (13 total)

### Auth (4)
✅ User can login and see dashboard [Critical, Smoke]
✅ User can logout and return to login [Critical]
✅ User can login again after logout [Critical]
✅ Login page displays correctly [Smoke]

### Boxes (5)
✅ User can create a new sandbox box [Critical, Smoke]
✅ User can open a sandbox box and view workspace [Critical]
✅ User can send a message in a sandbox box [Smoke]
✅ User can view sandbox box preview
✅ User can delete a sandbox box

### Onboarding (4)
✅ New user can view dashboard after login [Critical, Smoke]
✅ User can navigate to all main sections [Smoke]
✅ User can create and manage API key [Settings]
✅ User can view billing and balance [Billing, Smoke]

## Resources

- Full docs: `e2e/SCENARIOS.md`
- Implementation details: `e2e/IMPLEMENTATION_SUMMARY.md`
- Playwright docs: https://playwright.dev/docs/intro
- Page Object Model: https://playwright.dev/docs/pom

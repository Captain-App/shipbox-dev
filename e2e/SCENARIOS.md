# Scenario-Based E2E Testing

This directory contains a comprehensive scenario-based testing framework inspired by the proven patterns from co2-admin Flutter testing. It enables composable, reusable user journey tests in Playwright.

## Architecture

The framework follows a clean, layered architecture:

```
Scenario Definitions
    ↓
Scenario Runner (Playwright wrapper)
    ↓
Step Executor (routes to domain modules)
    ↓
Domain Steps (auth, box, billing, settings)
    ↓
Page Objects (encapsulate UI interactions)
    ↓
Playwright API
```

## Directory Structure

```
e2e/
├── framework/              # Core framework types and runner
│   ├── scenario.ts        # Scenario, TestStep, Precondition enums
│   ├── scenario-runner.ts # Main scenarioTest() wrapper
│   ├── step-executor.ts   # Routes steps to implementations
│   └── index.ts           # Exports
│
├── pages/                 # Page objects (UI encapsulation)
│   ├── auth-page.ts       # Login/auth interactions
│   ├── dashboard-page.ts  # Navigation, sidebar
│   ├── box-workspace-page.ts # Chat, preview, boxes
│   ├── settings-page.ts   # Settings form interactions
│   ├── billing-page.ts    # Billing/balance page
│   └── index.ts           # Exports
│
├── steps/                 # Domain step implementations
│   ├── auth-steps.ts      # login, logout, verify steps
│   ├── navigation-steps.ts # Dashboard navigation
│   ├── box-steps.ts       # Create, open, delete boxes
│   ├── billing-steps.ts   # Balance, invoices
│   ├── settings-steps.ts  # API keys, GitHub
│   └── index.ts           # Step executor factory
│
├── scenarios/             # User journey definitions (pure data)
│   ├── auth-scenarios.ts  # Login/logout flows
│   ├── box-scenarios.ts   # Sandbox creation/usage flows
│   ├── onboarding-scenarios.ts # First-time user flows
│   └── index.ts           # All scenarios + helpers
│
├── run-all-scenarios.spec.ts # Main test runner
├── smoke.test.ts          # Basic smoke tests (existing)
├── auth.setup.ts          # Auth setup project (existing)
└── ...
```

## Quick Start

### Running Scenarios

```bash
# Run all scenarios
npm run test:e2e

# Run specific test file
npm run test:e2e run-all-scenarios.spec.ts

# Run with UI
npm run test:e2e:ui

# Run smoke tests only
npm run test:e2e -- --grep "Smoke"

# Run critical path tests
npm run test:e2e -- --grep "Critical"
```

## Key Concepts

### Scenario

A scenario is a complete user journey with preconditions, steps, and verification:

```typescript
{
  name: "User can create and use a sandbox box",
  categories: [TestCategory.Box, TestCategory.Critical],
  preconditions: [Precondition.LoggedIn],
  steps: [
    TestStep.CreateBox,
    TestStep.OpenBox,
    TestStep.SendMessage,
  ],
  verify: async (state) => {
    // Custom assertions
  }
}
```

### Precondition

Preconditions automatically set up required state before steps execute:

```typescript
enum Precondition {
  LoggedIn,        // User authenticated
  HasSession,      // An active sandbox box exists
}
```

### TestStep

Atomic, composable actions that can be combined into scenarios:

```typescript
enum TestStep {
  // Auth
  Login, Logout, VerifyLoggedIn,
  
  // Navigation
  NavigateToDashboard, NavigateToBoxes,
  
  // Boxes
  CreateBox, OpenBox, SendMessage,
  
  // Settings
  SetApiKey, ConnectGitHub,
  
  // Billing
  VerifyBalance,
}
```

### ScenarioState

Shared state tracking across a scenario execution:

```typescript
class ScenarioState {
  isLoggedIn: boolean
  currentUserEmail?: string
  currentSessionId?: string
  currentSessionTitle?: string
  balance: number
  apiKeySet: boolean
  githubConnected: boolean
}
```

## Adding New Scenarios

1. **Create step implementations** in `e2e/steps/`:

```typescript
// e2e/steps/my-steps.ts
export async function myAction(ctx: StepContext, params?: StepParams): Promise<void> {
  const page = new MyPage(ctx.page);
  await page.doSomething();
  ctx.state.myProperty = result;
}
```

2. **Register in executor** in `e2e/steps/index.ts`:

```typescript
executor.register(TestStep.MyAction, mySteps.myAction);
```

3. **Add scenarios** in `e2e/scenarios/my-scenarios.ts`:

```typescript
export const myScenarios: Scenario[] = [
  {
    name: "User can do something",
    categories: [TestCategory.MyFeature],
    preconditions: [Precondition.LoggedIn],
    steps: [TestStep.MyAction],
  },
];
```

4. **Export** in `e2e/scenarios/index.ts`:

```typescript
export { myScenarios } from "./my-scenarios";
// Update allScenarios
export const allScenarios: Scenario[] = [
  ...authScenarios,
  ...myScenarios, // Add here
];
```

## Page Objects Pattern

Page objects encapsulate UI interactions and element selectors:

```typescript
class MyPage {
  constructor(private page: Page) {}

  async doSomething(): Promise<void> {
    await this.page.getByRole("button", { name: /My Button/i }).click();
  }
}
```

**Benefits:**
- Isolate selectors from tests
- Reusable across multiple scenarios
- Easy to update when UI changes

## Best Practices

### ✅ DO

- ✅ Use **steps** over custom body functions - they're reusable
- ✅ Keep **steps atomic** - one action per step
- ✅ Update **ScenarioState** after each step
- ✅ Use **page objects** for UI interactions
- ✅ Add **categories** for filtering (Smoke, Critical, etc.)
- ✅ Verify state in `verify` callback
- ✅ Use `params` for customization

### ❌ DON'T

- ❌ Hardcode selectors in test code
- ❌ Create huge monolithic scenarios
- ❌ Forget to update ScenarioState
- ❌ Use UI details in step logic
- ❌ Create duplicate steps for similar actions

## Extending the Framework

### Add a New TestStep

1. Add to enum in `e2e/framework/scenario.ts`:

```typescript
export enum TestStep {
  // ... existing steps
  MyNewStep = "myNewStep",
}
```

2. Add display name:

```typescript
export const stepDisplayNames: Record<TestStep, string> = {
  // ...
  [TestStep.MyNewStep]: "My New Step",
};
```

3. Implement in domain module
4. Register in executor factory

### Add a New Precondition

1. Add to enum and display names in `scenario.ts`
2. Handle in `setupPreconditions()` in `scenario-runner.ts`

## Troubleshooting

### Test times out waiting for element

- Check if you navigated to the correct page
- Verify selectors are correct (inspect in browser)
- Increase timeout: `await page.waitForTimeout(5000)`

### Precondition setup fails

- Ensure auth credentials are set in `.env`
- Check that preconditions are implemented for your step
- Verify state isn't being reset incorrectly

### Tests pass locally but fail in CI

- Check API mocking in `smoke.test.ts` for patterns
- Ensure env vars are set: `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`
- Run with `--headed` to see browser actions

## Integration with CI/CD

Add to your CI pipeline:

```yaml
- name: Run E2E scenarios
  run: npm run test:e2e
  env:
    E2E_TEST_EMAIL: ${{ secrets.E2E_TEST_EMAIL }}
    E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}
```

## Testing Philosophy

This framework follows user-centric testing:

- **Test user journeys**, not implementation details
- **Compose journeys** from reusable steps
- **Verify outcomes**, not mechanics
- **Mock externals**, test application logic

This leads to:
- Fast, reliable tests
- Better maintainability
- Clearer test intent
- Reduced brittleness

## References

- Inspired by co2-admin Flutter testing patterns
- Built on Playwright test framework
- Uses Page Object Model for UI encapsulation

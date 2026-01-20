# E2E Testing - Scenario-Based Framework

Welcome to Shipbox's scenario-based E2E testing framework! 🎬

This directory contains a comprehensive, composable testing framework for user journey validation, inspired by proven patterns from enterprise testing systems.

## 🚀 Quick Start

```bash
# Run all scenarios
npm run test:e2e

# Run with interactive UI
npm run test:e2e:ui

# Run specific test category
npm run test:e2e -- --grep "Critical"
```

## 📚 Documentation

Start with one of these based on your needs:

1. **First Time?** → Read [`QUICK_REFERENCE.md`](QUICK_REFERENCE.md)
   - Test execution commands
   - Available steps and categories
   - Common patterns
   - Quick troubleshooting

2. **Want to Add Tests?** → Read [`SCENARIOS.md`](SCENARIOS.md)
   - Full architecture overview
   - How to add new scenarios
   - Page object pattern
   - Best practices guide

3. **Need Technical Details?** → Read [`IMPLEMENTATION_SUMMARY.md`](IMPLEMENTATION_SUMMARY.md)
   - What was implemented
   - File structure
   - Framework features
   - Architecture alignment

## 📁 Project Structure

```
e2e/
├── framework/              ⚙️  Core framework (types, runner, executor)
├── pages/                  🎨  Page objects (UI encapsulation)
├── steps/                  👣  Step implementations (reusable actions)
├── scenarios/              🎬  Scenario definitions (user journeys)
├── run-all-scenarios.spec.ts   📊  Main test entry point
├── QUICK_REFERENCE.md      📋  Commands & patterns
├── SCENARIOS.md            📖  Full documentation
├── IMPLEMENTATION_SUMMARY.md   ✅  What was built
├── auth.setup.ts           🔐  Auth setup (existing)
└── *.test.ts              🧪  Individual test files (existing)
```

## 🎯 Concepts

### Scenario
A complete user journey from preconditions through verification.

```typescript
"User can create and use a sandbox box" with:
  • Precondition: LoggedIn
  • Steps: CreateBox → OpenBox → SendMessage
  • Verify: Check box was created
```

### Precondition
Automatic state setup before test runs.
- `LoggedIn` - User authenticated
- `HasSession` - Active sandbox created

### TestStep
Atomic, reusable action (login, create box, etc.).

### Page Object
Encapsulates UI interactions and selectors.

## ✨ Key Features

- ✅ **Composable** - Build complex journeys from simple steps
- ✅ **Reusable** - Share steps across multiple scenarios
- ✅ **Maintainable** - Changes in one place affect all tests
- ✅ **Clear Intent** - Scenario names describe user actions
- ✅ **Well Structured** - Framework, pages, steps, scenarios
- ✅ **Production Ready** - 13 comprehensive scenarios included

## 📊 Test Coverage

**13 Scenarios** organized by feature:

### 🔐 Auth (4 scenarios)
- Login and dashboard
- Logout flow
- Re-login after logout
- Login page display

### 📦 Sandbox Boxes (5 scenarios)
- Creation
- Opening and using
- Messaging
- Preview
- Deletion

### 🎓 Onboarding (4 scenarios)
- Dashboard navigation
- Multi-section navigation
- API key management
- Billing viewing

## 🔄 Workflow

1. **Define** scenario in `scenarios/` with steps
2. **Implement** steps in `steps/` modules
3. **Encapsulate** UI in `pages/` objects
4. **Run** with `npm run test:e2e`
5. **Debug** with `npm run test:e2e:ui`

## 🛠️ Common Tasks

### Run All Tests
```bash
npm run test:e2e
```

### Run Specific Category
```bash
npm run test:e2e -- --grep "Critical"
npm run test:e2e -- --grep "Smoke"
npm run test:e2e -- --grep "Onboarding"
```

### Add New Scenario
See `SCENARIOS.md` → "Adding New Scenarios" section.

### Add New Step
See `SCENARIOS.md` → "Extending the Framework" section.

### Debug Test
```bash
npm run test:e2e:ui
```
Then use Playwright inspector for step-by-step debugging.

## 🧪 Available Steps

**Auth:** Login, Logout, VerifyLoggedIn, VerifyLoggedOut, NavigateToLogin

**Navigation:** NavigateToDashboard, NavigateToBoxes, NavigateToSettings, NavigateToBilling

**Boxes:** CreateBox, OpenBox, DeleteBox, SendMessage, VerifyAgentResponse, OpenBoxPreview, CloseBoxPreview

**Billing:** VerifyBalance, ViewInvoices

**Settings:** SetApiKey, ConnectGitHub, DisconnectGitHub, VerifySettings

## 🔗 Integration

- Uses existing `auth.setup.ts` for authentication
- Reuses API mocking patterns from `smoke.test.ts`
- Compatible with Playwright configuration
- Works with CI/CD pipelines

## 📖 Learning Path

1. Start: `QUICK_REFERENCE.md` (5 min read)
2. Understand: `SCENARIOS.md` architecture section (10 min)
3. Try: Run `npm run test:e2e` (2 min)
4. Learn: Add a simple scenario (15 min)
5. Master: Explore existing scenarios in `scenarios/` (20 min)

## 🎓 Design Principles

- **User-Centric** - Test what users do, not implementation
- **Composable** - Build complex flows from simple steps
- **Maintainable** - DRY principle, changes in one place
- **Clear Intent** - Scenario names describe user actions
- **Fast Feedback** - Structured execution with logging

## 🚨 Troubleshooting

| Issue | Check |
|-------|-------|
| Tests timeout | Element selector correct? Navigation worked? |
| Auth fails | E2E_TEST_EMAIL and E2E_TEST_PASSWORD set? |
| Precondition error | Step registered in executor? |
| UI selector changes | Update Page Object, not test code |

For detailed troubleshooting, see `SCENARIOS.md`.

## 🔮 Next Steps

- Add more scenarios for other features
- Extend preconditions for complex state
- Create new page objects for new UI areas
- Integrate with CI/CD (GitHub Actions, etc.)

## 📞 Questions?

- Framework docs: `SCENARIOS.md`
- Quick commands: `QUICK_REFERENCE.md`
- Implementation details: `IMPLEMENTATION_SUMMARY.md`
- Playwright docs: https://playwright.dev

---

**Happy Testing! 🧪**

Made with inspiration from co2-admin Flutter testing patterns.
Adapted for Playwright/TypeScript.

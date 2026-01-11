# Phase 3: Quality & Hardening

This phase focuses on building a robust testing infrastructure for the entire `shipbox-dev` stack, ensuring long-term maintainability and reliability following Cloudflare's best practices.

## Objectives

### 1. Engine Internal API Tests
- **Objective**: Ensure the newly added `/internal/sessions` routes in `shipbox-engine` are correct and handle edge cases (e.g., missing sessions, R2 errors).
- **Approach**: Create `sandbox-mcp/src/index.test.ts` using Vitest. Leverage the existing `r2-mock.ts` to simulate storage.
- **Focus**: POST creation, GET retrieval, and DELETE operations.

### 2. Frontend Testing Setup (Vitest + RTL)
- **Objective**: Establish a unit/component testing foundation for the React dashboard.
- **Approach**:
    - Install `vitest`, `@testing-library/react`, `jsdom`.
    - Configure `vitest.config.ts` in the project root.
    - Create sample tests for core components (e.g., `CreateSandboxModal`).
- **Focus**: Testing UI logic, prop handling, and state changes.

### 3. End-to-End Testing (Playwright)
- **Objective**: Verify the "Happy Path" across the entire stack in a browser environment.
- **Approach**:
    - Install `@playwright/test`.
    - Configure `playwright.config.ts`.
    - Implement a "Full Lifecycle" test:
        1. Login via Supabase (mocked or test account).
        2. Create a new sandbox.
        3. Verify it appears in the list.
        4. Open the workspace and verify the OpenCode UI loads.
        5. Delete the sandbox.

### 4. CI Integration
- **Objective**: Automatically run all tests (API, Engine, Frontend, E2E) on every Push/PR.
- **Approach**: Update `.github/workflows/test.yml` (or similar) to include the new test suites.

## Testing Strategy

| Level | Scope | Tool |
| :--- | :--- | :--- |
| **Unit** | Individual functions/services | Vitest |
| **Integration** | HTTP Routes & Service Bindings | Vitest + Mocks |
| **Component** | React UI Elements | RTL + Vitest |
| **E2E** | Full browser flows | Playwright |

# Roadmap: Shipbox

This document outlines the strategic plan for productising **shipbox.dev** as a multi-tenant platform wrapping the `shipbox-engine` (forked from `sandbox-mcp`).

## Vision
To provide a secure, scalable, and multi-tenant interface for managed AI sandbox environments, leveraging Cloudflare's serverless infrastructure.

## Architecture

| Component | Name | Description |
| :--- | :--- | :--- |
| **Frontend** | `shipbox-dev` | React dashboard at shipbox.dev |
| **Auth Wrapper** | `shipbox-api` | Hono + Effect worker handling auth and ownership |
| **Engine** | `shipbox-engine` | Forked sandbox-mcp handling sandbox lifecycle |

## Development Phases

| Phase | Focus | Status |
| :--- | :--- | :--- |
| **0: Foundation** | Infrastructure setup, forking upstream, auth wrapper skeleton. | ✅ Done |
| **1: Local Development** | Refinement, local testing, mock implementations, frontend integration. | ✅ Done |
| **2: Integration** | Cloudflare deployment, D1/R2 provisioning, e2e integration. | ✅ Done |
| **3: Quality & Hardening** | Testing infrastructure, component tests, E2E playbooks. | 🏗️ In Progress |
| **4: Production** | Billing, rate limiting, monitoring, security hardening. | 📅 Planned |

---

## Progress Tracker

### Phase 0: Foundation (Completed)
- [x] Fork `sandbox-mcp` to `Captain-App` organization.
- [x] Integrate `sandbox-mcp` as a Git submodule.
- [x] Create `shipbox-api` auth wrapper using Hono and Effect.
- [x] Implement internal CRUD API in engine fork.
- [x] Configure Cloudflare Service Bindings for engine communication.
- [x] Set up GitHub Actions CI/CD skeleton.
- [x] Rebrand project to `shipbox-dev` with domain `shipbox.dev`.

### Phase 1: Local Development (Completed)
- [x] Implement robust `SessionService` unit tests.
- [x] Finalise mock D1 and Service Binding for isolated testing.
- [x] Align frontend components with real API data structures.
- [x] Document local developer onboarding.

### Phase 2: Integration (Completed)
- [x] Provision production D1 (`shipbox-db`) and R2 (`shipbox-sessions`).
- [x] Configure environment secrets (Supabase, Anthropic, GitHub).
- [x] Implement initial integration tests.
- [x] Deploy staging environment.

### Phase 3: Quality & Hardening (Current)
- [ ] Add unit tests for `shipbox-engine` internal API.
- [ ] Set up Vitest and RTL for frontend components.
- [ ] Implement Playwright E2E "Happy Path" tests.
- [ ] Configure CI to run all tests on PR.

### Phase 4: Production
- [ ] Integrate usage-based billing logic.
- [ ] Implement request rate limiting and quota management.
- [ ] Set up error tracking (Sentry) and observability (Honeycomb/Logflare).
- [ ] Conduct security audit and access control hardening.
- [ ] Launch at `shipbox.dev`.

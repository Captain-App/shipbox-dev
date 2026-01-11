# Phase 4: Production

## Overview
Phase 3 transforms the platform into a viable commercial product by adding billing, monitoring, and robust security.

## Objectives

### 1. Commercialization
- **Billing Integration**: Implement usage tracking based on sandbox uptime and task execution.
- **Quotas**: Define and enforce tier-based quotas for sandbox count and compute limits.

### 2. Observability
- **Error Tracking**: Integrate Sentry for both the frontend and the Cloudflare Workers.
- **Telemetry**: Export performance data to a tool like Honeycomb to track latency in shipbox-engine calls.

### 3. Hardening
- **Rate Limiting**: Use Cloudflare's `rate-limiting` feature on the `shipbox-api` endpoints.
- **Audit Logs**: Record all administrative actions (sandbox creation, deletion, access) for security auditing.

### 4. Launch
- **Production DNS**: Point `shipbox.dev` to the production frontend.
- **API Endpoint**: `api.shipbox.dev` for the auth wrapper.
- **Marketing Site**: Consider a landing page at the root domain.

---

## Testing Strategy

### Load Testing
- Simulate hundreds of concurrent users accessing sandboxes.
- Monitor Durable Object eviction and Workflow performance under load.

### Security Audit
- Penetration test the auth wrapper to ensure zero-trust access to the internal engine.
- Verify JWT validation and session cookie isolation.

### Chaos Engineering
- Simulate Cloudflare region outages or R2 latency spikes to ensure the system fails gracefully or recovers using Workflow retries.

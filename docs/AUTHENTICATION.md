# Shipbox Authentication System

Complete documentation of the Shipbox authentication and authorization system.

## Table of Contents

1. [Overview](#overview)
2. [Token Types](#token-types)
3. [Authentication Flows](#authentication-flows)
4. [Route Protection](#route-protection)
5. [Ownership Model](#ownership-model)
6. [Implementation Details](#implementation-details)
7. [Error Handling](#error-handling)
8. [Testing](#testing)
9. [Special Cases](#special-cases)
10. [FAQ](#faq)

## Overview

The Shipbox authentication system protects API endpoints and manages user sessions. It supports two token types:

- **Supabase JWT** - For web application users
- **Shipbox API Keys** - For CLI and programmatic access

### Design Principles

- **Zero-trust architecture**: Every request is validated
- **Real-time validation**: No local token caching
- **Clear separation**: Different token types use dedicated validators
- **Ownership enforcement**: Resources tagged with user_id
- **Minimal overhead**: Fast, localized validation logic

### Module Structure

```
workers/api/src/auth/
├── types.ts           # TypeScript interfaces
├── utils.ts           # Helper functions (route skipping, token extraction)
├── validators.ts      # Token validation (Supabase + API keys)
├── middleware.ts      # Main middleware implementation
├── index.ts           # Public API exports
├── validators.test.ts # Unit tests for validators
└── middleware.test.ts # Integration tests for middleware
```

## Token Types

### Supabase JWT

**Used by:** Web application (browser-based)

**Format:** Standard JWT from Supabase Auth service

**Validation:**
- Real-time HTTP call to `{SUPABASE_URL}/auth/v1/user`
- Checks token expiry, signature, and user status
- Detects revoked tokens immediately

**Lifetime:**
- Short-lived: 1 hour
- Can be refreshed with refresh token

**When to use:**
- Web application frontend
- Browser-based client
- Any user-facing interface

**Example:**

```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  https://api.shipbox.dev/sessions
```

### Shipbox API Key

**Used by:** CLI, integrations, scripts

**Format:** `sb_` prefix followed by base64-encoded key

**Storage:**
- Only SHA-256 hash stored in D1 database
- Never stored in plaintext
- Can be viewed only once after creation

**Validation:**
- Hash lookup in D1 database
- Instant validation (no external calls)
- Last-used timestamp updated

**Lifetime:**
- Long-lived until manual revocation
- No automatic expiry

**When to use:**
- CLI authentication
- Server-to-server API calls
- Programmatic access
- Unattended scripts

**Creation:**
```bash
shipbox auth api-key create --name "Production CLI"
# Returns: sb_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Usage:**
```bash
curl -H "Authorization: Bearer sb_xxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  https://api.shipbox.dev/sessions
```

## Authentication Flows

### Web Application Login Flow

```
User (Browser)
    ↓
1. Click "Sign In" on web app
    ↓
2. Redirected to Supabase Auth UI
    ↓
3. User enters credentials (email/password or OAuth)
    ↓
4. Supabase returns JWT & refresh token
    ↓
5. Web app stores JWT in localStorage/sessionStorage
    ↓
6. Web app makes authenticated requests with Bearer token
    ↓
API (Node.js)
    ↓
7. Middleware validates JWT with Supabase
    ↓
8. User context set in request
    ↓
9. Route handler processes with authenticated user
```

### CLI Authentication Flow

```
User (CLI)
    ↓
1. Run: shipbox auth login
    ↓
2. CLI opens browser to web app
    ↓
3. User logs in via Supabase (like web app)
    ↓
4. Web app shows "Grant access to CLI?"
    ↓
5. User clicks approve
    ↓
6. Web app exchanges JWT for API key via API
    ↓
   POST /settings/api-keys
   Authorization: Bearer <JWT>
    ↓
7. Returns: { apiKey: "sb_xxxx..." }
    ↓
8. CLI stores API key in ~/.shipbox/config
    ↓
9. CLI uses API key for subsequent requests
    ↓
   Authorization: Bearer sb_xxxx...
    ↓
API (Node.js)
    ↓
10. Middleware recognizes sb_ prefix
    ↓
11. Validates key hash against D1 database
    ↓
12. User context set from key owner
    ↓
13. CLI command executes with authenticated user
```

### API Key Usage Flow

```
External Service
    ↓
1. Has Shipbox API key: sb_xxxx...
    ↓
2. Makes authenticated request
    ↓
   GET /sessions
   Authorization: Bearer sb_xxxx...
    ↓
API (Node.js)
    ↓
3. Middleware extracts token
    ↓
4. Recognizes sb_ prefix → use API key validator
    ↓
5. Hash the key: SHA256(sb_xxxx...)
    ↓
6. Look up hash in database
    ↓
7. If match found: extract user_id
    ↓
8. Update last_used timestamp
    ↓
9. Set user context: { id, email: "user-{id}" }
    ↓
10. Route handler executes as that user
    ↓
11. Response sent
```

## Route Protection

### Public Routes (Skip Authentication)

These routes do not require authentication:

| Route | Purpose | Auth Method |
|-------|---------|-------------|
| `/health` | Health check | None |
| `/internal/*` | Engine-to-API communication | Separate auth |
| `/admin/*` | Admin endpoints | Admin token |
| `/github/webhook` | GitHub webhook | Signature verification |
| `/billing/webhook` | Stripe webhook | Signature verification |

### Protected Routes

All other routes require a valid Bearer token in the `Authorization` header.

**Valid Bearer tokens:**
- Supabase JWT: `Bearer eyJhbGc...`
- Shipbox API key: `Bearer sb_xxxx...`

**Examples:**

```bash
# Create session (requires auth)
curl -X POST https://api.shipbox.dev/sessions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "name": "My Box", "region": "lhr" }'

# List sessions (requires auth)
curl https://api.shipbox.dev/sessions \
  -H "Authorization: Bearer <token>"

# Health check (public)
curl https://api.shipbox.dev/health

# Engine internal call (internal auth)
curl https://api.shipbox.dev/internal/report-usage \
  -H "Content-Type: application/json" \
  -d '{ "userId": "...", "sessionId": "...", "durationMs": 1000 }'
```

### Route Skipping Logic

Routes are checked in order:

1. Check if path starts with `/internal/` → skip auth
2. Check if path starts with `/admin/` → skip auth
3. Check if path equals `/github/webhook` → skip auth
4. Check if path equals `/billing/webhook` → skip auth
5. Check if path equals `/health` → skip auth
6. Otherwise → require authentication

See `shouldSkipAuth()` in `auth/utils.ts` for implementation.

## Ownership Model

All resources are owned by a user and can only be accessed by that user.

```
User (identified by id)
├─ Sessions
│  └─ All sessions belong to user_id
│  └─ Only user can list/read/delete own sessions
├─ API Keys
│  └─ All keys belong to user_id
│  └─ Only user can view/revoke own keys
├─ Box Secrets
│  └─ All secrets belong to user_id
│  └─ Only user can create/read/update/delete own secrets
├─ GitHub Installation
│  └─ Linked to user_id
│  └─ Only user can link/unlink account
└─ Billing
   └─ Balance and transactions belong to user_id
   └─ Only user can view own balance
```

### Database Tables

Key tables for ownership:

- `user_sessions` - has `user_id` column
- `user_balances` - has `user_id` column
- `billing_transactions` - has `user_id` column
- `shipbox_api_keys` - has `user_id` column
- `user_box_secrets` - has `user_id` column
- `github_installations` - has `user_id` column

### Ownership Checks

When accessing a resource, verify ownership:

```typescript
// Example: Get user's session
const ownership = await db.prepare(
  "SELECT 1 FROM user_sessions WHERE user_id = ? AND session_id = ?"
)
  .bind(user.id, sessionId)
  .first();

if (!ownership) {
  return c.json({ error: "Forbidden" }, 403);
}

// Proceed with resource access
```

## Implementation Details

### Middleware Execution Order

```
Request
    ↓
1. Logging middleware (logs request)
    ↓
2. CORS middleware (sets CORS headers)
    ↓
3. Auth middleware (validates token)
    ├─ If public route: skip validation
    ├─ Extract Bearer token
    ├─ Route to validator:
    │  ├─ If sb_ prefix: API key validator
    │  └─ Else: Supabase JWT validator
    ├─ If invalid: return 401
    └─ Set user in context
    ↓
4. Rate limiting middleware (checks quota)
    ├─ Skip for internal/admin/health
    ├─ Use user.id as rate limit key
    └─ Return 429 if exceeded
    ↓
5. Route handler (processes request)
    ├─ Access user via c.get("user")
    ├─ Check resource ownership
    └─ Return response
    ↓
Response
```

### Token Extraction

```typescript
// Authorization: Bearer xyz
const authHeader = c.req.header("Authorization");

// Valid formats:
// "Bearer eyJhbGc..." → extracts eyJhbGc...
// "Bearer sb_xxxx..." → extracts sb_xxxx...

// Invalid formats (return null):
// undefined
// ""
// "Basic xyz"
// "Bearer " (no token)
// "Bearerxyz" (no space)

const token = extractBearerToken(authHeader);
if (!token) {
  return c.json({ error: "Unauthorized" }, 401);
}
```

### Validator Selection

```typescript
if (token.startsWith("sb_")) {
  // Use API key validator
  result = await validateShipboxApiKey(token, db);
} else {
  // Use Supabase JWT validator
  result = await validateSupabaseToken(token, supabaseUrl, anonKey);
}
```

### Context Population

```typescript
// After successful validation
c.set("user", {
  id: "user-123",
  email: "user@example.com"  // For JWT
  // or
  email: "user-user-123"      // For API keys
});

// In route handlers
app.get("/protected", (c) => {
  const user = c.get("user");
  console.log(`Authenticated as: ${user.id}`);
  // Access is now isolated to this user
});
```

## Error Handling

### 401 Unauthorized

Returned when:
- Missing Authorization header
- Invalid Bearer format
- Token validation fails (expired, revoked, invalid signature)
- Invalid API key

**Response:**
```json
{
  "error": "Unauthorized",
  "details": "Optional debugging info (not sent to clients)"
}
```

### 403 Forbidden

Returned when:
- Resource ownership check fails
- User lacks permissions

**Response:**
```json
{
  "error": "Forbidden"
}
```

### Error Logging

Authentication errors are logged with context:

```
[Auth] Supabase validation failed: 401 - {"error":"invalid_token","error_description":"Token has expired"}
[Auth] Failed to validate Supabase token: Network timeout
[Auth] Invalid Shipbox API key
```

Logs include:
- Timestamp
- Error type (Supabase validation, network, API key)
- HTTP status or error details
- Useful for debugging auth issues

## Testing

### Unit Tests

Test individual validators in isolation:

```bash
npm test -- auth/validators.test.ts
```

Tests cover:
- Valid token validation
- Invalid token rejection
- Network error handling
- Error message formatting

### Integration Tests

Test complete middleware flow:

```bash
npm test -- auth/middleware.test.ts
```

Tests cover:
- Public route skipping
- Protected route enforcement
- Token routing (JWT vs API key)
- Context population
- Error responses

### Run All Auth Tests

```bash
npm test -- auth/
```

### Test Coverage

Aim for >90% coverage on auth module:

```bash
npm test -- auth/ --coverage
```

## Special Cases

### Admin Authentication

Admin endpoints under `/admin/*` use a separate authentication system:

- Not handled by main auth middleware
- Requires `ADMIN_TOKEN` environment variable
- See `middleware/admin.ts` for implementation
- Not affected by this refactor

### Engine Internal Communication

Engine-to-API communication under `/internal/*`:

- Skips normal auth middleware
- Uses separate authentication if needed
- Endpoints like:
  - `/internal/report-usage`
  - `/internal/report-token-usage`
  - `/internal/user-config/:userId`
  - `/internal/check-balance/:userId`

### Webhook Authentication

Webhooks use signature verification instead of bearer tokens:

- `/github/webhook` - GitHub sends X-Hub-Signature header
- `/billing/webhook` - Stripe sends Stripe-Signature header
- See respective routes for verification implementation

### Multi-User Context

If supporting team/organization features:

1. Still authenticate the user making the request
2. Check if user has access to team/organization
3. Check if team/organization owns the resource
4. Proceed with operation

Example:
```typescript
// Verify user is authenticated (always required)
const user = c.get("user");

// Check if user is member of team
const teamMembership = await db.prepare(
  "SELECT 1 FROM team_members WHERE user_id = ? AND team_id = ?"
)
  .bind(user.id, teamId)
  .first();

if (!teamMembership) {
  return c.json({ error: "Forbidden" }, 403);
}

// Check if resource belongs to team
const resource = await db.prepare(
  "SELECT * FROM resources WHERE team_id = ? AND id = ?"
)
  .bind(teamId, resourceId)
  .first();

if (!resource) {
  return c.json({ error: "Not found" }, 404);
}
```

## FAQ

### Q: Why two token types?

**A:** Different use cases have different requirements:
- Web apps need automatic token refresh → Supabase JWT with expiry
- CLI needs long-lived tokens → API keys with no expiry
- Both validate in real-time for security

### Q: Why real-time token validation?

**A:** Eliminates token caching issues:
- Revoked tokens detected immediately
- Works across multiple instances
- No clock skew issues
- Simpler implementation

**Trade-off:** Slight latency for Supabase validation (~50-100ms typically)

### Q: Can I cache tokens locally?

**A:** Not recommended because:
- Can't detect revoked tokens immediately
- If token is revoked, cached version still works
- Adds complexity and state management

**If you really need caching:**
- Add TTL to cache (5-10 minutes)
- Allow cache bypass (force refresh)
- Monitor for security incidents

### Q: How do I debug auth failures?

**A:** Check logs for auth errors:

```bash
# View recent auth errors
grep "\[Auth\]" api.log | tail -20

# Check specific user
grep "user-123" api.log | grep "\[Auth\]"

# Monitor in real-time
tail -f api.log | grep "\[Auth\]"
```

Common issues:
- Token expired → refresh or log in again
- Invalid format → check Authorization header format
- API key wrong → check key is copied correctly
- Network timeout → check Supabase connectivity

### Q: How do I rotate API keys?

**A:** Currently no automatic rotation, but can be added:

1. Create new API key
2. Update client to use new key
3. Delete old API key
4. Verify old key is no longer used

For production systems, consider:
- Automatic key rotation schedule
- Key versions/aliases
- Audit trail of key usage

### Q: What happens if Supabase is down?

**A:** Supabase JWT validation will fail:
- API returns 401 Unauthorized
- API keys still work (local validation)
- Mitigation: CLI recommends using API keys, users can use API key for critical operations

To handle gracefully:
```typescript
// Option 1: Short cache + fail open (not recommended)
// Option 2: Require API key for critical operations
// Option 3: Queue requests if Supabase is temporarily down
```

### Q: Can I use multiple auth methods simultaneously?

**A:** Yes, middleware automatically routes to correct validator:

```typescript
// Both work:
curl -H "Authorization: Bearer <JWT>" ...    # Web app
curl -H "Authorization: Bearer sb_xxxx" ... # CLI

// Middleware detects sb_ prefix and routes appropriately
```

### Q: How do I add a new auth method?

**A:** Follow the pattern:

1. Create validator in `auth/validators.ts`
2. Add type detection in `auth/middleware.ts`
3. Update tests in `auth/middleware.test.ts`
4. Document in this file
5. Add to public exports in `auth/index.ts`

Example:
```typescript
// In middleware.ts
if (token.startsWith("api_")) {
  result = await validateCustomApiKey(token, db);
}
```

### Q: How often should I rotate API keys?

**A:** Depends on risk profile:

- Development: Never (local testing)
- Staging: Weekly or on-demand
- Production: Monthly to quarterly
- Sensitive operations: Always rotate immediately after use

### Q: What's the difference between user.id and user.email?

**A:** Both identify the user, with key differences:

| Field | Source | Purpose | Format |
|-------|--------|---------|--------|
| `user.id` | Both JWT and API key | Primary identifier | UUID or custom ID |
| `user.email` | JWT actual email | Contact info | `user@example.com` |
| `user.email` | API key synthetic | Indicates auth type | `user-{id}` |

Use `user.id` for database queries. Use `user.email` for display/audit.

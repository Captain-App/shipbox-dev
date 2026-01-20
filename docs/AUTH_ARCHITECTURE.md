# Authentication Architecture

## Current State (MESSY - NEEDS REFACTOR)

### Systems Involved
1. **Supabase Auth** - User identity (web app)
2. **Shipbox API Keys** - Service credentials (DB table: `user_shipbox_api_keys`)
3. **Anthropic API Keys** - User's external service credentials
4. **GitHub OAuth** - GitHub integration

### Current Auth Flows (Confusing)

```
WEB APP
├── User logs in → Supabase Auth
├── Session token stored in browser
└── Browser calls API with Supabase token

CLI
├── User runs `shipbox login` → Browser opens
├── Browser authenticates with Supabase
├── Should redirect with token
└── CLI calls API (but with what? Confused here)

API (workers/api)
├── Auth middleware checks Bearer token
├── If token starts with "sb_" → Check Shipbox API keys DB
├── Otherwise → Call Supabase to validate
└── Returns user.id to handler
```

### Problems

1. **Token Type Confusion**: Two different token formats, unclear when to use which
2. **Bootstrap Problem**: CLI can't get a Shipbox API key without already having one
3. **No Clear Ownership**: Who owns what? User? Organization? Unclear.
4. **Mixed Concerns**: User identity mixed with service credentials
5. **Undocumented**: No specification of permission model
6. **Hard to Read**: Auth code scattered across multiple files with unclear intent

---

## Required Design

### 1. OWNERSHIP MODEL (WHO OWNS WHAT?)

**User**
- Has one Supabase account
- Can create multiple Shipbox API keys
- Each API key is a credential, not tied to specific use

**Workspace** (Future)
- Users can be part of multiple workspaces
- Workspace has settings, billing, permissions
- NOT implemented yet - only single user for now

**Shipbox API Key**
- Owned by a User
- Can be revoked anytime
- Has creation date, last used, friendly name
- Format: `sb_` prefix

### 2. CLEAR AUTH SEPARATION

**Identity Layer** (Who are you?)
- Supabase handles this
- Returns: `user.id`, `user.email`
- Token format: JWT from Supabase
- Used by: Web app, initial login

**Credential Layer** (Prove you're that person for API calls)
- Shipbox API Keys handle this
- Format: `sb_` prefix
- User creates them explicitly
- Used by: CLI, integrations, automation

**Permission Layer** (What can you do?)
- Currently: All users have full access to their own resources
- Future: Role-based access, workspace permissions

### 3. SYSTEM ARCHITECTURE

```
SUPABASE (User Identity)
├── Stores: user.id, email, password hash
├── Issues: JWT tokens (session tokens)
└── Used by: Web app for login

SHIPBOX API KEYS TABLE (Credentials)
├── Stores: key_hash, user_id, name, created_at, last_used
├── Format: sb_... (random secure string, stored as hash)
└── Used by: API endpoints for authentication

API MIDDLEWARE
├── Accepts: Bearer token in Authorization header
├── If token format is "sb_*":
│   └── Look up in Shipbox API keys DB
│       └── Returns user_id
├── Otherwise:
│   └── Validate with Supabase
│       └── Returns user_id, email
└── Context: user.id available to all handlers
```

### 4. CLEAR AUTH FLOWS

#### Flow 1: Web App Login (User Identity)
```
1. User goes to app
2. Click "Log In"
3. Redirects to Supabase login
4. User enters email/password
5. Supabase issues JWT token
6. App stores token in browser localStorage
7. API calls use: Authorization: Bearer <JWT>
8. API validates with Supabase
9. User is authenticated
```

#### Flow 2: CLI First Login (Bootstrap)
```
1. User runs: shipbox login
2. Opens browser (or shows URL)
3. Browser redirect to Supabase login page
4. User enters email/password
5. Supabase issues JWT
6. **NEW: Backend endpoint exchanges JWT → Shipbox API Key**
   - User ID extracted from JWT
   - New API key generated
   - Stored in database
   - Key returned to CLI
7. CLI stores key locally
8. Future calls: Authorization: Bearer <Shipbox-API-Key>
```

#### Flow 3: CLI Subsequent Calls (Using API Key)
```
1. User runs: shipbox run "task"
2. CLI reads stored Shipbox API key
3. API call: Authorization: Bearer sb_...
4. API validates key in DB
5. Executes command
```

#### Flow 4: Create Additional CLI Keys (From Web)
```
1. User goes to app → Settings → API Keys
2. Click "Create New Key"
3. Choose name (e.g., "GitHub Actions")
4. Click "Generate"
5. Key displayed once, then hidden forever
6. User copies key to external system
```

---

## Implementation Plan

### Phase 1: Clean Up Current Auth (URGENT)
- [ ] Document each middleware/handler's responsibility
- [ ] Add comments explaining token types
- [ ] Create clear ownership model in code
- [ ] Separate concerns: identity vs credentials vs permissions

### Phase 2: Implement Exchange Endpoint
- [ ] Create `/auth/exchange` endpoint
- [ ] Takes JWT → Returns Shipbox API key
- [ ] Used by CLI login flow
- [ ] Used by web app API key creation

### Phase 3: Unify Auth Middleware
- [ ] Consolidate auth logic into single, clear middleware
- [ ] Document what token types are accepted where
- [ ] Clear error messages for different failure modes
- [ ] Return consistent auth context to handlers

### Phase 4: Documentation
- [ ] Add JSDoc comments to all auth functions
- [ ] Write auth guide for developers
- [ ] Document permission model for future scaling

---

## Token Types (CLEAR DEFINITION)

### Supabase JWT
- **Format**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (standard JWT)
- **Issued by**: Supabase auth service
- **Contains**: user.id, user.email, exp (expiration)
- **Where used**: Web app, initial login
- **Validation**: Call Supabase `/auth/v1/user` endpoint
- **Lifetime**: Configurable by Supabase (default 1 hour)

### Shipbox API Key
- **Format**: `sb_` + base64url random string (e.g., `sb_abc123...`)
- **Stored as**: SHA-256 hash in database
- **Issued by**: Shipbox API (via exchange or web UI)
- **Where used**: CLI, integrations, permanent credentials
- **Validation**: Hash incoming key, look up in DB
- **Lifetime**: Until user deletes or revokes

---

## Error Messages (Clear Intent)

```
❌ Missing Authorization header
→ "Missing Authorization header. Include: Authorization: Bearer <token>"

❌ Invalid token format
→ "Invalid token format. Expected: Authorization: Bearer <token>"

❌ Expired Supabase token
→ "Your session expired. Please log in again: shipbox login"

❌ Invalid Shipbox API key
→ "API key not found. Create one: shipbox api-key create"

❌ Invalid Supabase token (couldn't validate)
→ "Authentication failed. Please log in again: shipbox login"

✅ Success
→ Silently proceed, no auth message needed
```

---

## Ownership Summary

```
┌─────────────────────────────────────────┐
│             USER                        │
├─────────────────────────────────────────┤
│ Supabase Account                        │
│ ├─ Email                                │
│ ├─ Password (hashed in Supabase)        │
│ └─ User ID (UUID)                       │
│                                         │
│ Shipbox API Keys (Multiple)             │
│ ├─ Key 1: CLI (generated on login)     │
│ ├─ Key 2: GitHub Actions               │
│ ├─ Key 3: Local Dev                    │
│ └─ Key N: ...                          │
│                                         │
│ External API Keys (Stored Encrypted)   │
│ ├─ Anthropic API key                   │
│ └─ GitHub token                        │
└─────────────────────────────────────────┘
```

---

## Next Steps

1. Review this architecture
2. Identify what needs to change
3. Create clean, documented implementation
4. Delete messy code paths
5. Test each flow thoroughly

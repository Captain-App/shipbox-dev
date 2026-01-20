# Current Auth Code - Audit

## Files Involved

### Web App
- `src/lib/supabase.ts` - Supabase client setup
- `src/pages/Auth.tsx` - Login UI (calls supabase.auth.signIn)

### API (Backend)
- `workers/api/src/index.ts` - Main auth middleware (MESSY)
- `workers/api/src/middleware/auth.ts` - Alternative auth middleware (NOT USED)
- `workers/api/src/services/shipbox-api-keys.ts` - API key DB operations
- `workers/api/src/routes/settings.ts` - API key creation endpoints

### CLI
- `packages/cli/src/commands/login.ts` - Login flow (JUST UPDATED, BROKEN)
- `packages/cli/src/commands/api-key.ts` - Manage API keys (JUST ADDED, BROKEN)
- `packages/cli/src/config.ts` - Config storage

---

## Issues Found

### 1. **Duplicate Auth Middleware**
- `index.ts` has auth middleware (used)
- `middleware/auth.ts` exists (not used)
- Why? Nobody knows. Delete one or consolidate.

### 2. **No Clear Comments**
- Auth code has NO documentation
- Can't tell what token types are expected
- Hard to maintain

### 3. **Mixed Concerns in index.ts**
- Auth logic mixed with rate limiting
- Mixed with internal API routes
- No separation of concerns

### 4. **Error Handling Inconsistent**
- Some endpoints return `{ error: string }`
- Some return `{ error: string, details: string }`
- Some return `{ supabaseError: object }`
- No standard error format

### 5. **Bootstrap Problem (NOT YET SOLVED)**
- CLI login creates exchange endpoint but...
- Never tested/deployed
- No guarantee it works

### 6. **No Permission Model**
- All users have full access
- No way to restrict access
- Not documented anywhere

---

## Code That Needs Cleanup

### Priority 1: AUTH MIDDLEWARE (index.ts lines 75-134)
- Too many concerns
- No comments
- Confusing token handling
- Should be in separate file

### Priority 2: SETTINGS ROUTES (settings.ts)
- New `/cli-api-key` endpoint (not tested)
- Existing `/api-keys/shipbox` (creates keys)
- No clear distinction of purpose
- No rate limiting
- No request validation

### Priority 3: CLI LOGIN (login.ts)
- Just refactored but untested
- Calls new exchange endpoint (doesn't exist yet)
- Will definitely break

### Priority 4: ERROR MESSAGES
- Scattered across codebase
- Inconsistent format
- Unclear what user should do

---

## What's Actually Broken?

1. **Web app login**: Probably works (Supabase is standard)
2. **API validation**: Works but confusing
3. **CLI login**: Broken (exchange endpoint not in API)
4. **API key creation**: Broken (no auth working)
5. **Permission model**: Doesn't exist

---

## What Should We Do?

**STOP the CLI work. FOCUS on auth:**

1. **Create clean auth system**
   - One clear middleware
   - Documented token types
   - Clear error messages
   - Professional code

2. **Add comprehensive tests**
   - Test Supabase token validation
   - Test API key validation
   - Test both token paths
   - Test error cases

3. **Document ownership**
   - Clear who owns what
   - Clear permission model
   - Ready for workspace/team features later

4. **Then test end-to-end**
   - Web app login works
   - API accepts both token types
   - API key creation works
   - All errors are clear

5. **Only then**: CLI bootstrap flow

---

## Recommendation

**Let's build this RIGHT, not FAST.**

We need:
- 1 clear auth middleware
- Comprehensive JSDoc comments
- Full test coverage
- Professional error handling
- Clear ownership model

This should take a few hours but will save days of debugging.

Ready to start?

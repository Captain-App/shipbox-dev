-- Ownership registry mapping users to sandbox-mcp session IDs
CREATE TABLE IF NOT EXISTS user_sessions (
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);

-- Billing: User balances in credits (100 credits = £1.00)
CREATE TABLE IF NOT EXISTS user_balances (
  user_id TEXT PRIMARY KEY,
  balance_credits INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

-- Billing: Transaction history
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount_credits INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'top-up', 'usage', 'refund'
  description TEXT,
  created_at INTEGER NOT NULL,
  metadata TEXT -- JSON string for additional context (e.g. sessionId)
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);

-- BYOK: Encrypted API keys for users
CREATE TABLE IF NOT EXISTS user_api_keys (
  user_id TEXT PRIMARY KEY NOT NULL,
  anthropic_key_encrypted TEXT,  -- Encrypted with platform key
  key_hint TEXT,                  -- Last 4 chars for UI display
  created_at INTEGER NOT NULL,
  last_used INTEGER
);

-- GitHub App Installations
CREATE TABLE IF NOT EXISTS github_installations (
  user_id TEXT PRIMARY KEY NOT NULL,
  installation_id INTEGER NOT NULL,
  account_login TEXT NOT NULL,    -- GitHub username/org
  account_type TEXT NOT NULL,     -- 'User' or 'Organization'
  created_at INTEGER NOT NULL,
  permissions TEXT                -- JSON of granted permissions
);

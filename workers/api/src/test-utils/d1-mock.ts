/**
 * Mock D1 database for testing.
 * Implements a subset of the D1 interface used by shipbox-api.
 */
export function createMockD1() {
  // Store table data as arrays of objects
  const store = new Map<string, any[]>();
  store.set("user_sessions", []);
  store.set("user_balances", [
    { user_id: "user-123", balance_credits: 1000, updated_at: 0 }
  ]);
  store.set("transactions", []);
  store.set("user_api_keys", []);
  store.set("user_box_secrets", []);
  store.set("github_installations", []);

  const prepare = (query: string) => {
    const upQuery = query.toUpperCase();
    return {
      bind: (...args: any[]) => {
        const stmt = {
          all: async () => {
            const tableNameMatch = query.match(/FROM\s+(\w+)/i);
            const tableName = tableNameMatch ? tableNameMatch[1].toLowerCase() : "";
            let results = store.get(tableName) || [];

            if (upQuery.includes("WHERE USER_ID = ?")) {
              const userId = args[0];
              results = results.filter((r) => r.user_id === userId);
            }

            if (upQuery.includes("SELECT COUNT(*)")) {
              return { results: [{ count: results.length }] };
            }

            if (upQuery.includes("SELECT SUM(ABS(AMOUNT_CREDITS))")) {
              const userId = args[0];
              const periodStart = args[1];
              const total = results
                .filter(r => r.user_id === userId && r.amount_credits < 0 && r.created_at >= periodStart)
                .reduce((acc, r) => acc + Math.abs(r.amount_credits), 0);
              return { results: [{ total }] };
            }

            if (upQuery.includes("ORDER BY CREATED_AT DESC")) {
              results = [...results].sort((a, b) => b.created_at - a.created_at);
            }

            return { results };
          },

          first: async () => {
            const upQuery = query.toUpperCase();
            if (upQuery.includes("SELECT SUM(ABS(AMOUNT_CREDITS))")) {
              const userId = args[0];
              const periodStart = args[1];
              const tableNameMatch = query.match(/FROM\s+(\w+)/i);
              const tableName = tableNameMatch ? tableNameMatch[1].toLowerCase() : "";
              const results = store.get(tableName) || [];
              const total = results
                .filter(r => r.user_id === userId && r.amount_credits < 0 && r.created_at >= periodStart)
                .reduce((acc, r) => acc + Math.abs(r.amount_credits), 0);
              return { total };
            }

            const tableNameMatch = query.match(/FROM\s+(\w+)/i);
            const tableName = tableNameMatch ? tableNameMatch[1].toLowerCase() : "";
            let results = store.get(tableName) || [];

            if (upQuery.includes("WHERE USER_ID = ? AND SESSION_ID = ?")) {
              const [userId, sessionId] = args;
              return results.find((r) => r.user_id === userId && r.session_id === sessionId) || null;
            }

            if (upQuery.includes("WHERE USER_ID = ? AND ID = ?")) {
              const [userId, id] = args;
              return results.find((r) => r.user_id === userId && r.id === id) || null;
            }

            if (upQuery.includes("WHERE USER_ID = ?")) {
              const userId = args[0];
              const found = results.find((r) => r.user_id === userId);
              if (found) {
                return {
                  ...found,
                  balance_credits: Number(found.balance_credits)
                };
              }
              return null;
            }

            return results[0] || null;
          },

          run: async () => {
            const tableNameMatch = query.match(/(?:INSERT\s+INTO|FROM|UPDATE|DELETE\s+FROM)\s+(\w+)/i);
            const tableName = tableNameMatch ? tableNameMatch[1].toLowerCase() : "";
            
            if (upQuery.startsWith("INSERT")) {
              const current = store.get(tableName) || [];
              if (tableName === "user_balances") {
                const userId = args[0];
                const existing = current.find(r => r.user_id === userId);
                
                // Extremely robust index-finding logic
                // Match balance_credits = balance_credits + ?
                const balanceUpdateMatch = upQuery.match(/BALANCE_CREDITS\s*=\s*BALANCE_CREDITS\s*\+\s*\?/);
                const updatedAtUpdateMatch = upQuery.match(/UPDATED_AT\s*=\s*\?/);
                
                if (existing && upQuery.includes("ON CONFLICT")) {
                  // Find indices based on query structure
                  const valuesPart = upQuery.match(/VALUES\s*\((.*?)\)/);
                  const valuesCount = valuesPart ? valuesPart[1].split(",").length : 0;
                  
                  if (upQuery.includes("BALANCE_CREDITS = BALANCE_CREDITS + ?")) {
                    // It's a topUp or similar adding query
                    // Assuming the update amount is the first ? after DO UPDATE SET
                    const updateAmount = Number(args[valuesCount]);
                    existing.balance_credits = (Number(existing.balance_credits) || 0) + updateAmount;
                    existing.updated_at = args[valuesCount + 1] || Math.floor(Date.now() / 1000);
                    if (upQuery.includes("STRIPE_CUSTOMER_ID")) {
                      existing.stripe_customer_id = args[valuesCount + 2] || existing.stripe_customer_id;
                    }
                  } else {
                    // It's an addStripeCustomer or similar non-adding query
                    existing.updated_at = args[valuesCount] || Math.floor(Date.now() / 1000);
                    if (upQuery.includes("STRIPE_CUSTOMER_ID")) {
                      existing.stripe_customer_id = args[valuesCount + 1] || existing.stripe_customer_id;
                    }
                  }
                } else if (!existing) {
                  store.set(tableName, [...current, { 
                    user_id: userId, 
                    balance_credits: Number(args[1]) || 0, 
                    updated_at: args[2] || 0,
                    stripe_customer_id: upQuery.includes("STRIPE_CUSTOMER_ID") ? args[3] : null
                  }]);
                }
              } else if (tableName === "user_sessions") {
                const [userId, sessionId, createdAt] = args;
                store.set(tableName, [...current, { user_id: userId, session_id: sessionId, created_at: createdAt }]);
              } else if (tableName === "transactions") {
                const [id, userId, amount, type, description, createdAt, metadata] = args;
                store.set(tableName, [...current, { id, user_id: userId, amount_credits: amount, type, description, created_at: createdAt, metadata }]);
              } else if (tableName === "user_api_keys") {
                const [userId, encrypted, hint, createdAt] = args;
                const filtered = current.filter(r => r.user_id !== userId);
                store.set(tableName, [...filtered, { user_id: userId, anthropic_key_encrypted: encrypted, key_hint: hint, created_at: createdAt }]);
              } else if (tableName === "github_installations") {
                const [userId, instId, login, type, createdAt] = args;
                const filtered = current.filter(r => r.user_id !== userId);
                store.set(tableName, [...filtered, { user_id: userId, installation_id: instId, account_login: login, account_type: type, created_at: createdAt }]);
              } else if (tableName === "user_box_secrets") {
                const [id, userId, name, encrypted, hint, createdAt] = args;
                store.set(tableName, [...current, { id, user_id: userId, name, encrypted_value: encrypted, hint, created_at: createdAt }]);
              }
            } else if (upQuery.startsWith("UPDATE")) {
              if (tableName === "user_box_secrets") {
                const [lastUsed, id] = args;
                const current = store.get(tableName) || [];
                const item = current.find(r => r.id === id);
                if (item) item.last_used = lastUsed;
              }
            } else if (upQuery.startsWith("DELETE")) {
              if (tableName === "user_sessions") {
                const [userId, sessionId] = args;
                const current = store.get(tableName) || [];
                const filtered = current.filter((r) => !(r.user_id === userId && r.session_id === sessionId));
                store.set(tableName, filtered);
              } else if (tableName === "user_api_keys" || tableName === "github_installations") {
                const [userId] = args;
                const current = store.get(tableName) || [];
                const filtered = current.filter((r) => r.user_id !== userId);
                store.set(tableName, filtered);
              } else if (tableName === "user_box_secrets") {
                const [userId, id] = args;
                const current = store.get(tableName) || [];
                const filtered = current.filter((r) => !(r.user_id === userId && r.id === id));
                store.set(tableName, filtered);
              }
            }
            return { meta: { changes: 1 } };
          },
        };
        return stmt;
      },
    };
  };

  const batch = async (statements: any[]) => {
    const results = [];
    for (const stmt of statements) {
      results.push(await stmt.run());
    }
    return results;
  };

  return {
    prepare,
    batch,
    _store: store,
  } as unknown as D1Database & { _store: Map<string, any[]> };
}

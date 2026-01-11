/**
 * Mock D1 database for testing.
 * Implements a subset of the D1 interface used by shipbox-api.
 */
export function createMockD1() {
  // Store table data as arrays of objects
  const store = new Map<string, any[]>();
  store.set("user_sessions", []);

  const prepare = (query: string) => {
    return {
      bind: (...args: any[]) => {
        return {
          all: async () => {
            const tableName = query.match(/FROM\s+(\w+)/i)?.[1];
            let results = store.get(tableName || "") || [];

            // Simple WHERE clause filtering
            if (query.includes("WHERE user_id = ?")) {
              const userId = args[0];
              results = results.filter((r) => r.user_id === userId);
            }

            // Simple ORDER BY handling
            if (query.includes("ORDER BY created_at DESC")) {
              results = [...results].sort((a, b) => b.created_at - a.created_at);
            }

            return { results };
          },

          first: async () => {
            const tableName = query.match(/FROM\s+(\w+)/i)?.[1];
            let results = store.get(tableName || "") || [];

            if (query.includes("WHERE user_id = ? AND session_id = ?")) {
              const [userId, sessionId] = args;
              return results.find((r) => r.user_id === userId && r.session_id === sessionId) || null;
            }

            return results[0] || null;
          },

          run: async () => {
            if (query.toUpperCase().startsWith("INSERT")) {
              const tableName = query.match(/INSERT\s+INTO\s+(\w+)/i)?.[1];
              if (tableName === "user_sessions") {
                const [userId, sessionId, createdAt] = args;
                const current = store.get(tableName) || [];
                store.set(tableName, [...current, { user_id: userId, session_id: sessionId, created_at: createdAt }]);
              }
            } else if (query.toUpperCase().startsWith("DELETE")) {
              const tableName = query.match(/FROM\s+(\w+)/i)?.[1];
              if (tableName === "user_sessions") {
                const [userId, sessionId] = args;
                const current = store.get(tableName) || [];
                const filtered = current.filter((r) => !(r.user_id === userId && r.session_id === sessionId));
                store.set(tableName, filtered);
              }
            }
            return { meta: { changes: 1 } };
          },
        };
      },
    };
  };

  return {
    prepare,
    _store: store,
  } as unknown as D1Database & { _store: Map<string, any[]> };
}

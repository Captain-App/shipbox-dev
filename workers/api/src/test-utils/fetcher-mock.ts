/**
 * Mock Fetcher for service bindings.
 */
export function createMockSandboxMcp() {
  const sessions = new Map<string, any>();

  const fetch = async (input: RequestInfo, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    const path = url.pathname;
    const method = init?.method || "GET";

    // Mock internal sessions API
    if (path === "/internal/sessions") {
      if (method === "POST") {
        const body = JSON.parse(init?.body as string);
        const sessionId = Math.random().toString(36).substring(2, 10);
        const now = Date.now();
        const session = {
          sessionId,
          sandboxId: sessionId,
          createdAt: now,
          lastActivity: now,
          status: "active",
          workspacePath: "/workspace",
          webUiUrl: `https://engine/session/${sessionId}/`,
          title: body.name || "Test Box",
          config: { defaultModel: "claude-3-5-sonnet" },
        };
        sessions.set(sessionId, session);
        return new Response(JSON.stringify(session), { status: 201 });
      }
    }

    const sessionMatch = path.match(/^\/internal\/sessions\/([a-z0-9]+)$/);
    if (sessionMatch) {
      const sessionId = sessionMatch[1];
      if (method === "GET") {
        const session = sessions.get(sessionId);
        if (!session) return new Response("Not found", { status: 404 });
        return new Response(JSON.stringify(session));
      }
      if (method === "DELETE") {
        sessions.delete(sessionId);
        return new Response(JSON.stringify({ success: true }));
      }
    }

    if (path.match(/^\/internal\/sessions\/([a-z0-9]+)\/start$/)) {
      return new Response(JSON.stringify({ success: true, status: "active" }));
    }

    return new Response("Not found", { status: 404 });
  };

  return {
    fetch,
    _sessions: sessions,
  } as unknown as Fetcher & { _sessions: Map<string, any> };
}

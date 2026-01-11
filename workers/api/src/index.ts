import { Hono } from "hono";
import { cors } from "hono/cors";
import { sessionsRoutes } from "./routes/sessions";

export type Bindings = {
  DB: D1Database;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SANDBOX_MCP: Fetcher;
};

export type Variables = {
  user: { id: string };
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// CORS
app.use("*", cors());

// Health check - no auth needed
app.get("/health", (c) => c.text("OK"));

// Minimal auth middleware - verify JWT with Supabase GoTrue API directly
app.use("/sessions/*", async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.split(" ")[1];
  
  // Call Supabase GoTrue API directly instead of using SDK
  // In tests, we'll need to mock this global fetch
  const res = await fetch(`${c.env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "apikey": c.env.SUPABASE_ANON_KEY,
    }
  });

  if (!res.ok) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const user = await res.json() as { id: string };
  c.set("user", { id: user.id });
  await next();
});

// Mount modular routes
app.route("/sessions", sessionsRoutes);

// Proxy to sandbox-mcp web UI
app.all("/session/:sessionId/*", async (c) => {
  // Auth check for proxy
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.split(" ")[1];
  
  const res = await fetch(`${c.env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "apikey": c.env.SUPABASE_ANON_KEY,
    }
  });

  if (!res.ok) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const user = await res.json() as { id: string };
  const sessionId = c.req.param("sessionId");

  // Check ownership
  const ownership = await c.env.DB.prepare(
    "SELECT 1 FROM user_sessions WHERE user_id = ? AND session_id = ?"
  ).bind(user.id, sessionId).first();

  if (!ownership) {
    return c.json({ error: "Forbidden" }, 403);
  }

  // Proxy to sandbox-mcp
  return c.env.SANDBOX_MCP.fetch(c.req.raw);
});

export default app;

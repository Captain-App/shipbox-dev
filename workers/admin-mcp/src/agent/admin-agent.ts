import { McpAgent } from "agents/mcp";
import type { Connection, ConnectionContext } from "agents";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Effect, pipe } from "effect";
import * as Sentry from "@sentry/cloudflare";
import { withRequestContext, withSentry, LoggerLayer } from "@shipbox/shared";
import {
  adminGetStatsSchema,
  adminListUsersSchema,
  adminListSessionsSchema,
  adminListTransactionsSchema,
  adminGetErrorsSchema,
  adminCheckHealthSchema,
  adminListR2SessionsSchema,
  adminGetSessionLogsSchema,
  adminGetSessionMetadataSchema,
  adminListRecentTracesSchema,
  adminGetTraceSchema,
  adminGetSessionTracesSchema,
  adminGetAuthTokenSchema,
  adminCreateSessionSchema,
  adminCallEngineMcpSchema,
  formatToolResponse,
  formatErrorResponse,
  type AdminGetStatsInput,
  type AdminListUsersInput,
  type AdminListSessionsInput,
  type AdminListTransactionsInput,
  type AdminGetErrorsInput,
  type AdminCheckHealthInput,
  type AdminListR2SessionsInput,
  type AdminGetSessionLogsInput,
  type AdminGetSessionMetadataInput,
  type AdminListRecentTracesInput,
  type AdminGetTraceInput,
  type AdminGetSessionTracesInput,
  type AdminGetAuthTokenInput,
  type AdminCreateSessionInput,
  type AdminCallEngineMcpInput,
} from "./tools";
import { SentryService, makeSentryServiceLayer } from "../services/sentry";
import { Env } from "../types";

interface AdminState {
  initialized: boolean;
}

export class AdminMcpAgent extends McpAgent<Env, AdminState> {
  server = new McpServer({
    name: "shipbox-admin",
    version: "1.0.0",
  }) as any;

  initialState: AdminState = {
    initialized: false,
  };

  async init(): Promise<void> {
    this.registerStatsTool();
    this.registerUsersTool();
    this.registerSessionsTool();
    this.registerTransactionsTool();
    this.registerErrorsTool();
    this.registerHealthTool();
    this.registerR2SessionsTool();
    this.registerSessionLogsTool();
    this.registerSessionMetadataTool();
    this.registerRecentTracesTool();
    this.registerTraceTool();
    this.registerSessionTracesTool();
    this.registerAuthTokenTool();
    this.registerCreateSessionTool();
    this.registerCallEngineMcpTool();

    this.setState({ initialized: true });
  }

  override async onConnect(
    connection: Connection,
    ctx: ConnectionContext,
  ): Promise<void> {
    console.log(`[AdminMCP] onConnect: ${ctx.request.url}`);

    // Check for Authorization header
    const authHeader = ctx.request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log(`[AdminMCP] No Bearer token provided`);
      throw new Error("Unauthorized: Bearer token required");
    }

    const token = authHeader.split(" ")[1];

    // Validate token with Supabase
    const userRes = await fetch(`${this.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: this.env.SUPABASE_ANON_KEY,
      },
    });

    if (!userRes.ok) {
      console.log(`[AdminMCP] Invalid token: ${userRes.status}`);
      throw new Error("Unauthorized: Invalid token");
    }

    const user = (await userRes.json()) as { id: string; email?: string };
    console.log(`[AdminMCP] User authenticated: ${user.email || user.id}`);

    // Check admin role in user_roles table
    const roleRes = await fetch(
      `${this.env.SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${user.id}&role=eq.admin&select=role`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: this.env.SUPABASE_ANON_KEY,
        },
      },
    );

    if (!roleRes.ok) {
      console.log(`[AdminMCP] Failed to check admin role: ${roleRes.status}`);
      throw new Error("Forbidden: Unable to verify admin role");
    }

    const roles = (await roleRes.json()) as any[];
    if (roles.length === 0) {
      console.log(`[AdminMCP] User ${user.email || user.id} is not an admin`);
      throw new Error("Forbidden: Admin role required");
    }

    console.log(`[AdminMCP] Admin access granted for ${user.email || user.id}`);
    return super.onConnect(connection, ctx);
  }

  private async fetchAdmin(
    path: string,
    searchParams?: Record<string, string>,
  ): Promise<any> {
    const url = new URL(`http://api/admin${path}`);
    if (searchParams) {
      Object.entries(searchParams).forEach(([k, v]) =>
        url.searchParams.set(k, v),
      );
    }

    const response = await this.env.SHIPBOX_API.fetch(url.toString(), {
      headers: {
        "X-Admin-Token": this.env.ADMIN_TOKEN,
        "X-Request-Id": crypto.randomUUID(),
      },
    });

    if (!response.ok) {
      throw new Error(
        `Admin API error: ${response.status} ${await response.text()}`,
      );
    }

    return response.json();
  }

  private registerStatsTool(): void {
    this.server.registerTool(
      "admin_get_stats",
      {
        description: "Get high-level system stats (users, sessions, revenue).",
        inputSchema: adminGetStatsSchema,
      },
      async (params: AdminGetStatsInput) => {
        try {
          const stats = await this.fetchAdmin("/stats");
          return formatToolResponse(stats);
        } catch (error) {
          return formatErrorResponse({
            code: "STATS_ERROR",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      },
    );
  }

  private registerUsersTool(): void {
    this.server.registerTool(
      "admin_list_users",
      {
        description: "List users with balances and activity.",
        inputSchema: adminListUsersSchema,
      },
      async (params: AdminListUsersInput) => {
        try {
          const users = await this.fetchAdmin("/users", {
            limit: params.limit.toString(),
            offset: params.offset.toString(),
          });
          return formatToolResponse(users);
        } catch (error) {
          return formatErrorResponse({
            code: "USERS_ERROR",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      },
    );
  }

  private registerSessionsTool(): void {
    this.server.registerTool(
      "admin_list_sessions",
      {
        description: "List all sessions across users.",
        inputSchema: adminListSessionsSchema,
      },
      async (params: AdminListSessionsInput) => {
        try {
          const sessions = await this.fetchAdmin("/sessions", {
            limit: params.limit.toString(),
            offset: params.offset.toString(),
            ...(params.status ? { status: params.status } : {}),
          });
          return formatToolResponse(sessions);
        } catch (error) {
          return formatErrorResponse({
            code: "SESSIONS_ERROR",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      },
    );
  }

  private registerTransactionsTool(): void {
    this.server.registerTool(
      "admin_list_transactions",
      {
        description: "List recent transactions.",
        inputSchema: adminListTransactionsSchema,
      },
      async (params: AdminListTransactionsInput) => {
        try {
          const transactions = await this.fetchAdmin("/transactions", {
            limit: params.limit.toString(),
            offset: params.offset.toString(),
            ...(params.userId ? { userId: params.userId } : {}),
          });
          return formatToolResponse(transactions);
        } catch (error) {
          return formatErrorResponse({
            code: "TRANSACTIONS_ERROR",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      },
    );
  }

  private registerErrorsTool(): void {
    this.server.registerTool(
      "admin_get_errors",
      {
        description: "Get recent unresolved errors from Sentry.",
        inputSchema: adminGetErrorsSchema,
      },
      async (params: AdminGetErrorsInput) => {
        if (!this.env.SENTRY_AUTH_TOKEN) {
          return formatErrorResponse({
            code: "CONFIG_ERROR",
            message: "SENTRY_AUTH_TOKEN not configured",
          });
        }

        const project =
          params.project === "api"
            ? this.env.SENTRY_PROJECT_API
            : this.env.SENTRY_PROJECT_ENGINE;
        const sentryLayer = makeSentryServiceLayer(
          this.env.SENTRY_AUTH_TOKEN,
          this.env.SENTRY_ORG,
        );

        try {
          const result = await Effect.runPromise(
            pipe(
              Effect.gen(function* () {
                const sentry = yield* SentryService;
                return yield* sentry.getRecentIssues(project);
              }),
              Effect.provide(sentryLayer),
            ),
          );
          return formatToolResponse(result);
        } catch (error) {
          return formatErrorResponse({
            code: "SENTRY_ERROR",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      },
    );
  }

  private registerHealthTool(): void {
    this.server.registerTool(
      "admin_check_health",
      {
        description: "Check health of all Shipbox services.",
        inputSchema: adminCheckHealthSchema,
      },
      async (params: AdminCheckHealthInput) => {
        const results: Record<string, any> = {};

        // 1. Check API
        try {
          const start = Date.now();
          const res = await this.env.SHIPBOX_API.fetch("http://api/health");
          results.api = {
            status: res.status === 200 ? "healthy" : "unhealthy",
            latency: Date.now() - start,
          };
        } catch (e) {
          results.api = { status: "error", message: String(e) };
        }

        // 2. Check Engine via API proxy
        try {
          const start = Date.now();
          const res = await this.env.SHIPBOX_API.fetch(
            "http://api/internal/engine-health",
          );
          results.engine = {
            status: res.status === 200 ? "healthy" : "unhealthy",
            latency: Date.now() - start,
          };
        } catch (e) {
          results.engine = { status: "error", message: String(e) };
        }

        return formatToolResponse(results);
      },
    );
  }

  private registerR2SessionsTool(): void {
    this.server.registerTool(
      "admin_list_r2_sessions",
      {
        description:
          "List all sessions from R2 storage index (most accurate for MCP-only sessions).",
        inputSchema: adminListR2SessionsSchema,
      },
      async (params: AdminListR2SessionsInput) => {
        try {
          const res = await this.env.SANDBOX_MCP.fetch(
            "http://sandbox/internal/sessions",
            {
              headers: { "X-Request-Id": crypto.randomUUID() },
            },
          );
          if (!res.ok)
            throw new Error(
              `Engine API error: ${res.status} ${await res.text()}`,
            );
          const data = await res.json();
          return formatToolResponse(data);
        } catch (error) {
          return formatErrorResponse({
            code: "R2_SESSIONS_ERROR",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      },
    );
  }

  private registerSessionLogsTool(): void {
    this.server.registerTool(
      "admin_get_session_logs",
      {
        description: "Get recent command logs for a specific session.",
        inputSchema: adminGetSessionLogsSchema,
      },
      async (params: AdminGetSessionLogsInput) => {
        try {
          const res = await this.env.SANDBOX_MCP.fetch(
            `http://sandbox/internal/sessions/${params.sessionId}/logs`,
            {
              headers: { "X-Request-Id": crypto.randomUUID() },
            },
          );
          if (!res.ok)
            throw new Error(
              `Engine API error: ${res.status} ${await res.text()}`,
            );
          const data = await res.json();
          return formatToolResponse(data);
        } catch (error) {
          return formatErrorResponse({
            code: "SESSION_LOGS_ERROR",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      },
    );
  }

  private registerSessionMetadataTool(): void {
    this.server.registerTool(
      "admin_get_session_metadata",
      {
        description: "Get full metadata for a specific session from R2.",
        inputSchema: adminGetSessionMetadataSchema,
      },
      async (params: AdminGetSessionMetadataInput) => {
        try {
          const res = await this.env.SANDBOX_MCP.fetch(
            `http://sandbox/internal/sessions/${params.sessionId}`,
            {
              headers: { "X-Request-Id": crypto.randomUUID() },
            },
          );
          if (!res.ok)
            throw new Error(
              `Engine API error: ${res.status} ${await res.text()}`,
            );
          const data = await res.json();
          return formatToolResponse(data);
        } catch (error) {
          return formatErrorResponse({
            code: "SESSION_METADATA_ERROR",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      },
    );
  }

  private registerRecentTracesTool(): void {
    this.server.registerTool(
      "admin_list_recent_traces",
      {
        description: "List recent distributed traces from Honeycomb.",
        inputSchema: adminListRecentTracesSchema,
      },
      async (params: AdminListRecentTracesInput) => {
        try {
          const traces = await this.fetchAdmin("/traces/recent", {
            limit: params.limit.toString(),
          });
          return formatToolResponse(traces);
        } catch (error) {
          return formatErrorResponse({
            code: "TRACES_ERROR",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      },
    );
  }

  private registerTraceTool(): void {
    this.server.registerTool(
      "admin_get_trace",
      {
        description: "Get full details for a specific trace ID from Honeycomb.",
        inputSchema: adminGetTraceSchema,
      },
      async (params: AdminGetTraceInput) => {
        try {
          const trace = await this.fetchAdmin(`/traces/${params.traceId}`);
          return formatToolResponse(trace);
        } catch (error) {
          return formatErrorResponse({
            code: "TRACE_ERROR",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      },
    );
  }

  private registerSessionTracesTool(): void {
    this.server.registerTool(
      "admin_get_session_traces",
      {
        description: "Get all traces associated with a specific session ID.",
        inputSchema: adminGetSessionTracesSchema,
      },
      async (params: AdminGetSessionTracesInput) => {
        try {
          const traces = await this.fetchAdmin(
            `/traces/session/${params.sessionId}`,
          );
          return formatToolResponse(traces);
        } catch (error) {
          return formatErrorResponse({
            code: "SESSION_TRACES_ERROR",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      },
    );
  }

  private registerAuthTokenTool(): void {
    this.server.registerTool(
      "admin_get_auth_token",
      {
        description:
          "Get a valid Supabase JWT for the admin user (admin@captainapp.co.uk) to interact with the service as a user.",
        inputSchema: adminGetAuthTokenSchema,
      },
      async (params: AdminGetAuthTokenInput) => {
        try {
          const result = await this.fetchAdmin("/auth/token");
          return formatToolResponse(result);
        } catch (error) {
          return formatErrorResponse({
            code: "AUTH_TOKEN_ERROR",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      },
    );
  }

  private registerCreateSessionTool(): void {
    // The admin user ID for admin@captainapp.co.uk
    const ADMIN_USER_ID = "d9f64911-fc13-41d6-9443-b50b69cc9005";

    this.server.registerTool(
      "admin_create_session",
      {
        description: "Create a new sandbox session.",
        inputSchema: adminCreateSessionSchema,
      },
      async (params: AdminCreateSessionInput) => {
        try {
          const res = await this.env.SANDBOX_MCP.fetch(
            "http://sandbox/internal/sessions",
            {
              method: "POST",
              body: JSON.stringify({ userId: params.userId || ADMIN_USER_ID }),
              headers: {
                "Content-Type": "application/json",
                "X-Request-Id": crypto.randomUUID(),
              },
            },
          );
          if (!res.ok)
            throw new Error(
              `Engine API error: ${res.status} ${await res.text()}`,
            );
          const data = await res.json();
          return formatToolResponse(data);
        } catch (error) {
          return formatErrorResponse({
            code: "CREATE_SESSION_ERROR",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      },
    );
  }

  private registerCallEngineMcpTool(): void {
    this.server.registerTool(
      "admin_call_engine_mcp",
      {
        description: "Call an MCP tool on the engine for a specific session.",
        inputSchema: adminCallEngineMcpSchema,
      },
      async (params: AdminCallEngineMcpInput) => {
        try {
          // Get a fresh JWT token for the admin user
          const authResult = await this.fetchAdmin("/auth/token");
          const accessToken = authResult.accessToken;
          if (!accessToken) {
            throw new Error("Failed to get auth token for admin user");
          }

          // Use the API URL which handles auth and proxies to engine
          const apiUrl = "https://backend.shipbox.dev";

          // First, initialize an MCP session
          const initRes = await fetch(`${apiUrl}/mcp`, {
            method: "POST",
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: crypto.randomUUID(),
              method: "initialize",
              params: {
                protocolVersion: "2024-11-05",
                capabilities: {},
                clientInfo: { name: "admin-mcp", version: "1.0.0" },
              },
            }),
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json, text/event-stream",
              Authorization: `Bearer ${accessToken}`,
              "X-Request-Id": crypto.randomUUID(),
            },
          });

          if (!initRes.ok) {
            const initText = await initRes.text();
            throw new Error(`MCP init failed: ${initRes.status} ${initText}`);
          }

          const mcpSessionId = initRes.headers.get("mcp-session-id");
          if (!mcpSessionId) {
            throw new Error("No mcp-session-id returned from initialize");
          }

          // Now call the actual tool
          // Parse params if it comes as a string (MCP client quirk)
          let toolParams = params.params || {};
          if (typeof toolParams === "string") {
            try {
              toolParams = JSON.parse(toolParams);
            } catch {
              // Leave as-is if not valid JSON
            }
          }
          if (params.method === "tools/call" && toolParams.arguments) {
            toolParams = {
              name: toolParams.name,
              arguments: {
                ...toolParams.arguments,
                sessionId: params.sessionId,
              },
            };
          }

          const requestBody = {
            jsonrpc: "2.0",
            id: crypto.randomUUID(),
            method: params.method,
            params: toolParams,
          };

          const bodyStr = JSON.stringify(requestBody);

          const res = await fetch(`${apiUrl}/mcp`, {
            method: "POST",
            body: bodyStr,
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json, text/event-stream",
              Authorization: `Bearer ${accessToken}`,
              "Mcp-Session-Id": mcpSessionId,
              "X-Request-Id": crypto.randomUUID(),
            },
          });

          const resText = await res.text();

          if (!res.ok)
            throw new Error(`Engine MCP error: ${res.status} ${resText}`);

          // Parse SSE response (already read above)
          const text = resText;
          const dataLine = text.split("\n").find((l) => l.startsWith("data: "));
          if (dataLine) {
            const data = JSON.parse(dataLine.slice(6));
            return formatToolResponse(data);
          }
          return formatToolResponse({ raw: text });
        } catch (error) {
          return formatErrorResponse({
            code: "ENGINE_MCP_ERROR",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      },
    );
  }
}

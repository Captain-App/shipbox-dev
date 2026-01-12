import { z } from "zod";

export const adminGetStatsSchema = z.object({});
export type AdminGetStatsInput = z.infer<typeof adminGetStatsSchema>;

export const adminListUsersSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});
export type AdminListUsersInput = z.infer<typeof adminListUsersSchema>;

export const adminListSessionsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  status: z.string().optional(),
});
export type AdminListSessionsInput = z.infer<typeof adminListSessionsSchema>;

export const adminListTransactionsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  userId: z.string().optional(),
});
export type AdminListTransactionsInput = z.infer<typeof adminListTransactionsSchema>;

export const adminGetErrorsSchema = z.object({
  project: z.enum(["api", "engine"]).default("api"),
});
export type AdminGetErrorsInput = z.infer<typeof adminGetErrorsSchema>;

export const adminCheckHealthSchema = z.object({});
export type AdminCheckHealthInput = z.infer<typeof adminCheckHealthSchema>;

export const adminListR2SessionsSchema = z.object({
  limit: z.number().int().min(1).max(500).default(100),
  offset: z.number().int().min(0).default(0),
});
export type AdminListR2SessionsInput = z.infer<typeof adminListR2SessionsSchema>;

export const adminGetSessionLogsSchema = z.object({
  sessionId: z.string().length(8),
});
export type AdminGetSessionLogsInput = z.infer<typeof adminGetSessionLogsSchema>;

export const adminGetSessionMetadataSchema = z.object({
  sessionId: z.string().length(8),
});
export type AdminGetSessionMetadataInput = z.infer<typeof adminGetSessionMetadataSchema>;

export const adminListRecentTracesSchema = z.object({
  limit: z.number().int().min(1).max(50).default(10),
});
export type AdminListRecentTracesInput = z.infer<typeof adminListRecentTracesSchema>;

export const adminGetTraceSchema = z.object({
  traceId: z.string(),
});
export type AdminGetTraceInput = z.infer<typeof adminGetTraceSchema>;

export const adminGetSessionTracesSchema = z.object({
  sessionId: z.string(),
});
export type AdminGetSessionTracesInput = z.infer<typeof adminGetSessionTracesSchema>;

export const adminGetAuthTokenSchema = z.object({});
export type AdminGetAuthTokenInput = z.infer<typeof adminGetAuthTokenSchema>;

export const adminCreateSessionSchema = z.object({
  userId: z.string().optional(),
});
export type AdminCreateSessionInput = z.infer<typeof adminCreateSessionSchema>;

export const adminCallEngineMcpSchema = z.object({
  sessionId: z.string(),
  method: z.string(),
  params: z.any().optional(),
});
export type AdminCallEngineMcpInput = z.infer<typeof adminCallEngineMcpSchema>;

/**
 * MCP tool response type
 */
interface ToolResponse {
  content: Array<{
    type: "text";
    text: string;
  }>;
}

/**
 * Format data as MCP tool response
 */
export const formatToolResponse = (data: unknown): ToolResponse => ({
  content: [
    {
      type: "text",
      text: JSON.stringify(data, null, 2),
    },
  ],
});

/**
 * Format error as MCP tool response
 */
export const formatErrorResponse = (error: {
  code: string;
  message: string;
  details?: unknown;
}): ToolResponse => ({
  content: [
    {
      type: "text",
      text: JSON.stringify({ error }, null, 2),
    },
  ],
});

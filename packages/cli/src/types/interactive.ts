import type { WebSocket } from 'ws';
import type { ShipboxApi } from '../api.js';

export interface SlashCommand {
  name: string;
  aliases: string[];
  description: string;
  usage: string;
  handler: (args: string[], context: InteractiveContext) => Promise<void>;
}

export interface InteractiveContext {
  sessionId: string;
  session: SessionInfo;
  api: ShipboxApi;
  ws: any; // WebSocketManager instance
  events: RealtimeEvent[];
  repl: any; // InteractiveRepl instance
}

export interface RealtimeEvent {
  seq: number;
  type: string;
  timestamp: number;
  sessionId: string;
  data: any;
}

export interface SessionInfo {
  id: string;
  sessionId: string;
  status: string;
  task?: string;
  repository?: string;
  branch?: string;
  createdAt: number;
  realtimeToken: string;
}

export interface TaskSubmitResult {
  runId: string;
  status: string;
}

export interface ParsedCommand {
  command: string;
  args: string[];
}

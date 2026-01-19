import chalk from 'chalk';
import { createSpinner } from 'nanospinner';
import { WebSocketManager } from './websocket.js';
import { InteractiveRepl } from './repl.js';
import { executeCommand } from './commands.js';
import { formatEvent, formatStatus, formatSessionInfo } from './events.js';
import type { ShipboxApi } from '../api.js';
import type { SessionInfo, InteractiveContext, RealtimeEvent } from '../types/interactive.js';

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function startInteractiveSession(
  sessionId: string,
  session: SessionInfo,
  api: ShipboxApi
): Promise<void> {
  // Display welcome banner
  console.log(chalk.bold('\n🚀 Shipbox Interactive Mode'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`Session: ${chalk.cyan(sessionId)}`);
  console.log(`Status: ${formatStatus(session.status)}`);
  if (session.repository) {
    console.log(`Repository: ${chalk.dim(session.repository)}`);
  }
  console.log(chalk.gray('\nType /help for commands or /exit to quit\n'));

  // Connect WebSocket
  const spinner = createSpinner('Connecting to session...').start();
  const ws = new WebSocketManager();

  try {
    await ws.connect(sessionId, session.realtimeToken, { timeout: 10000 });
    spinner.success({ text: 'Connected' });
  } catch (error) {
    spinner.error({ text: 'Connection failed' });
    console.error(chalk.red(`Failed to connect: ${(error as Error).message}`));
    process.exit(1);
  }

  const events: RealtimeEvent[] = [];
  let repl: InteractiveRepl | null = null;

  const context: InteractiveContext = {
    sessionId,
    session,
    api,
    ws: ws as any,
    events,
    repl: null
  };

  // Create REPL
  repl = new InteractiveRepl(sessionId, async (input) => {
    await executeCommand(input, context);
  });

  context.repl = repl;

  // Handle WebSocket events
  ws.on('*', (event: RealtimeEvent) => {
    events.push(event);
    const formatted = formatEvent(event);
    repl!.writeLine(formatted);
  });

  // Handle cleanup
  const cleanup = () => {
    ws.close();
    if (repl) {
      repl.close();
    }
    console.log(chalk.gray('\nDisconnected from session'));
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Start REPL
  repl.start();
}

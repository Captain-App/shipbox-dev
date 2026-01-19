import { Command } from 'commander';
import chalk from 'chalk';
import { ShipboxApi } from '../api.js';
import { pickSession } from '../interactive/session-picker.js';
import { startInteractiveSession } from '../interactive/index.js';
import type { SessionInfo } from '../types/interactive.js';

function validateSessionId(sessionId: string): boolean {
  return /^[0-9a-f]{8}$/i.test(sessionId);
}

export const connectCommand = new Command('connect')
  .description('Connect to a sandbox session in interactive mode')
  .argument('[sessionId]', 'Session ID to connect to (optional)')
  .action(async (sessionIdArg?: string) => {
    try {
      const api = new ShipboxApi();
      let sessionId = sessionIdArg;

      // If no session ID, show picker
      if (!sessionId) {
        sessionId = await pickSession(api);
      }

      // Validate session ID format
      if (!validateSessionId(sessionId)) {
        console.error(chalk.red(`Invalid session ID: ${sessionId}`));
        console.log(chalk.gray('Session ID must be 8 hexadecimal characters'));
        process.exit(1);
      }

      // Fetch session with realtime token
      const session = await api.getSession(sessionId);

      if (!session.realtimeToken) {
        console.error(chalk.red('Session does not have a realtime token'));
        console.log(chalk.gray('Please ensure the session is active and supports real-time connections'));
        process.exit(1);
      }

      const sessionInfo: SessionInfo = {
        id: session.id,
        sessionId: session.sessionId,
        status: session.status,
        task: session.task,
        repository: session.repository,
        branch: session.branch,
        createdAt: session.createdAt,
        realtimeToken: session.realtimeToken
      };

      await startInteractiveSession(sessionId, sessionInfo, api);
    } catch (error) {
      if ((error as any).message?.includes('No API key')) {
        console.error(chalk.red('Authentication required'));
        console.log(chalk.gray('Run "shipbox login" to authenticate'));
      } else {
        console.error(chalk.red(`Failed to connect to session: ${(error as Error).message}`));
      }
      process.exit(1);
    }
  });

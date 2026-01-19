import readline from 'readline';
import chalk from 'chalk';
import { getCommandCompletions } from './commands.js';

export class InteractiveRepl {
  private rl: readline.Interface;
  private sessionId: string;
  private onCommand: (input: string) => Promise<void>;
  private commandHistory: string[] = [];

  constructor(sessionId: string, onCommand: (input: string) => Promise<void>) {
    this.sessionId = sessionId;
    this.onCommand = onCommand;

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
      completer: this.autocomplete.bind(this),
      prompt: this.getPrompt()
    });

    this.rl.on('line', async (input) => {
      if (input.trim()) {
        this.commandHistory.push(input);
        await this.onCommand(input);
      }
      this.rl.prompt();
    });

    this.rl.on('close', () => {
      process.exit(0);
    });
  }

  private getPrompt(): string {
    return chalk.cyan(`[${this.sessionId}]> `);
  }

  private autocomplete(line: string): [string[], string] {
    const completions = getCommandCompletions(line);

    if (completions.length > 0) {
      return [completions, line];
    }

    return [[], line];
  }

  start(): void {
    this.rl.prompt();
  }

  writeLine(message: string): void {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    console.log(message);
    this.rl.prompt(true);
  }

  close(): void {
    this.rl.close();
  }

  getHistory(): string[] {
    return this.commandHistory;
  }
}

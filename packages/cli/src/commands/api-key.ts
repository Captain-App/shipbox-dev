import { Command } from 'commander';
import chalk from 'chalk';
import { getApiKey, getBaseUrl } from '../config.js';
import { select } from '@inquirer/prompts';

export const apiKeyCommand = new Command('api-key')
  .description('Manage Shipbox API keys')
  .addCommand(
    new Command('create')
      .description('Create a new API key')
      .option('-n, --name <name>', 'Name for the API key')
      .action(async (options) => {
        try {
          const apiKey = getApiKey();
          const baseUrl = getBaseUrl();

          if (!apiKey) {
            console.error(chalk.red('API key not found. Please run `shipbox login` first.'));
            process.exit(1);
          }

          const name =
            options.name || `CLI Key ${new Date().toISOString().slice(0, 10)}`;

          console.log(chalk.dim('Creating API key...'));

          const result = await fetch(`${baseUrl}/settings/api-keys/shipbox`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name }),
          });

          if (!result.ok) {
            const error = await result.json().catch(() => ({}));
            if (result.status === 401) {
              throw new Error(
                'Authentication failed. Please run `shipbox login` again.'
              );
            }
            throw new Error(
              `Failed to create API key: ${error.error || result.statusText}`
            );
          }

          const key = (await result.json()) as {
            key: string;
            name: string;
            hint: string;
          };

          console.log(chalk.green('\n✓ API Key Created'));
          console.log(chalk.dim('Name: ') + key.name);
          console.log(chalk.dim('Hint: ') + key.hint);
          console.log(chalk.yellow('\nYour API Key (save this, it won\'t be shown again):'));
          console.log(chalk.bold.cyan(key.key));
          console.log(
            chalk.dim(
              '\nTo use this key, set it as an environment variable:'
            )
          );
          console.log(chalk.gray(`export SHIPBOX_API_KEY="${key.key}"`));
        } catch (error) {
          console.error(chalk.red(`Error: ${(error as Error).message}`));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('list')
      .description('List all API keys')
      .action(async () => {
        try {
          const apiKey = getApiKey();
          const baseUrl = getBaseUrl();

          if (!apiKey) {
            console.error(chalk.red('API key not found. Please run `shipbox login` first.'));
            process.exit(1);
          }

          const result = await fetch(`${baseUrl}/settings/api-keys`, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
            },
          });

          if (!result.ok) {
            throw new Error(`Failed to fetch API keys: ${result.statusText}`);
          }

          const data = (await result.json()) as {
            shipboxKeys: Array<{
              name: string;
              key_hint: string;
              created_at: number;
              last_used?: number;
            }>;
          };

          if (data.shipboxKeys.length === 0) {
            console.log(chalk.yellow('No API keys found'));
            console.log(chalk.dim('Create one with: shipbox api-key create'));
            return;
          }

          console.log(chalk.bold('\nShipbox API Keys:'));
          console.log(chalk.gray('─'.repeat(60)));

          data.shipboxKeys.forEach((key, i) => {
            console.log(`${i + 1}. ${chalk.cyan(key.key_hint)}`);
            console.log(`   Name: ${key.name}`);
            console.log(`   Created: ${new Date(key.created_at).toLocaleString()}`);
            if (key.last_used) {
              console.log(`   Last used: ${new Date(key.last_used).toLocaleString()}`);
            }
          });

          console.log('');
        } catch (error) {
          console.error(chalk.red(`Error: ${(error as Error).message}`));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('delete')
      .description('Delete an API key')
      .action(async () => {
        try {
          const apiKey = getApiKey();
          const baseUrl = getBaseUrl();

          if (!apiKey) {
            console.error(chalk.red('API key not found. Please run `shipbox login` first.'));
            process.exit(1);
          }

          const listResult = await fetch(`${baseUrl}/settings/api-keys`, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
            },
          });

          if (!listResult.ok) {
            throw new Error('Failed to fetch API keys');
          }

          const data = (await listResult.json()) as {
            shipboxKeys: Array<{
              name: string;
              key_hint: string;
            }>;
          };

          if (data.shipboxKeys.length === 0) {
            console.log(chalk.yellow('No API keys to delete'));
            return;
          }

          const keyHint = await select({
            message: 'Select a key to delete:',
            choices: data.shipboxKeys.map((key) => ({
              name: `${key.key_hint} - ${key.name}`,
              value: key.key_hint,
            })),
          });

          const result = await fetch(`${baseUrl}/settings/api-keys/shipbox/${keyHint}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
            },
          });

          if (!result.ok) {
            throw new Error('Failed to delete API key');
          }

          console.log(chalk.green('✓ API key deleted'));
        } catch (error) {
          console.error(chalk.red(`Error: ${(error as Error).message}`));
          process.exit(1);
        }
      })
  );

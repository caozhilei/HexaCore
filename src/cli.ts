
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import path from 'path';
import { Orchestrator } from './core/orchestrator';
import { InboundMessage } from './core/entry-points/interfaces';

// Load env
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

async function startCLI() {
  console.log('🤖 HexaCore CLI Interface');
  console.log('-------------------------');
  console.log(`Connecting to Supabase at: ${process.env.SUPABASE_URL}`);
  console.log(`Using LLM Provider: ${process.env.LLM_PROVIDER || 'openai'}`);
  console.log('-------------------------');

  try {
    const orchestrator = new Orchestrator();
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'User> '
    });

    rl.prompt();

    rl.on('line', async (line) => {
      const text = line.trim();
      if (!text) {
        rl.prompt();
        return;
      }

      if (text.toLowerCase() === 'exit' || text.toLowerCase() === 'quit') {
        console.log('Bye!');
        process.exit(0);
      }

      // Construct Inbound Message
      const message: InboundMessage = {
        id: `cli-${Date.now()}`,
        channel: 'cli',
        accountId: 'default',
        peer: {
          id: 'cli-user',
          kind: 'dm',
          metadata: {
             // Mock some metadata to trigger potential routing rules
             tier: 'premium'
          }
        },
        content: {
          type: 'text',
          text: text
        },
        timestamp: Date.now(),
        metadata: {}
      };

      try {
        const response = await orchestrator.processMessage(message);
        console.log(`Agent> ${response.content.text}`);
      } catch (error) {
        console.error(`Error: ${(error as Error).message}`);
      }

      rl.prompt();
    }).on('close', () => {
      console.log('Bye!');
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start CLI:', error);
  }
}

startCLI();


import * as dotenv from 'dotenv';
import path from 'path';
import { AgentRepository } from '../src/core/database/agent-repo';

// Load env
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

async function createAgent() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: npx ts-node scripts/create-agent.ts <name> <model> [description]');
    console.log('Example: npx ts-node scripts/create-agent.ts "Coding Assistant" "deepseek-chat" "Helps with coding"');
    process.exit(1);
  }

  const [name, model, description] = args;

  console.log(`Creating Agent: ${name} (${model})...`);

  const repo = new AgentRepository();

  try {
    const agent = await repo.createAgent({
      name,
      description: description || `Agent using ${model}`,
      config: {
        model: model,
        prompt: `You are ${name}. You are a helpful assistant.`,
        temperature: 0.7
      },
      owner_id: null // System agent
    });

    console.log('✅ Agent Created Successfully!');
    console.log('----------------------------');
    console.log(`ID: ${agent.id}`);
    console.log(`Name: ${agent.name}`);
    console.log(`Model: ${agent.config['model']}`);
    console.log('----------------------------');
    
  } catch (error) {
    console.error('❌ Failed to create agent:', error);
  }
}

createAgent();

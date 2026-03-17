
import * as dotenv from 'dotenv';
import path from 'path';
import { Orchestrator } from '../src/core/orchestrator';
import { InboundMessage } from '../src/core/entry-points/interfaces';

// Load env
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

async function testQwenIntegration() {
  console.log('🤖 Testing Qwen Integration...');
  console.log('----------------------------');
  console.log(`Provider: ${process.env.LLM_PROVIDER}`);
  console.log(`Model: ${process.env.LLM_MODEL}`);
  console.log(`Key (preview): ${process.env.QWEN_API_KEY?.substring(0, 8)}...`);
  console.log('----------------------------');

  const orchestrator = new Orchestrator();

  const message: InboundMessage = {
    id: `test-qwen-${Date.now()}`,
    channel: 'cli',
    accountId: 'default',
    peer: {
      id: 'test-user',
      kind: 'dm',
      metadata: {}
    },
    content: {
      type: 'text',
      text: 'Hello, are you Qwen? Please introduce yourself briefly.'
    },
    timestamp: Date.now(),
    metadata: {}
  };

  try {
    const startTime = Date.now();
    const response = await orchestrator.processMessage(message);
    const endTime = Date.now();
    
    console.log('\n✅ Response Received:');
    console.log('-------------------');
    console.log(response.content.text);
    console.log('-------------------');
    console.log(`⏱️ Latency: ${endTime - startTime}ms`);
    
  } catch (error) {
    console.error('❌ Error during Qwen test:', error);
  }
}

testQwenIntegration();

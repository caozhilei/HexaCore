
import { LLMFactory } from '../factory';
import { LLMConfig } from '../types';

async function testProviders() {
  console.log('🚀 Testing LLM Providers...');

  // Mock configuration for testing (Replace with real keys for actual integration test)
  const openaiConfig: LLMConfig = {
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    apiKey: 'sk-mock-key',
  };

  const deepseekConfig: LLMConfig = {
    provider: 'deepseek',
    model: 'deepseek-chat',
    apiKey: 'sk-mock-key',
  };

  const qwenConfig: LLMConfig = {
    provider: 'qwen',
    model: 'qwen-turbo',
    apiKey: 'sk-mock-key',
  };

  try {
    const openaiProvider = LLMFactory.createProvider(openaiConfig);
    console.log('✅ OpenAI Provider created successfully.');

    const deepseekProvider = LLMFactory.createProvider(deepseekConfig);
    console.log('✅ DeepSeek Provider created successfully.');
    
    const qwenProvider = LLMFactory.createProvider(qwenConfig);
    console.log('✅ Qwen Provider created successfully.');

  } catch (error) {
    console.error('❌ Provider creation failed:', error);
  }
}

testProviders();

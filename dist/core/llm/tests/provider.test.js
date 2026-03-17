"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const factory_1 = require("../factory");
async function testProviders() {
    console.log('🚀 Testing LLM Providers...');
    // Mock configuration for testing (Replace with real keys for actual integration test)
    const openaiConfig = {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        apiKey: 'sk-mock-key',
    };
    const deepseekConfig = {
        provider: 'deepseek',
        model: 'deepseek-chat',
        apiKey: 'sk-mock-key',
    };
    const qwenConfig = {
        provider: 'qwen',
        model: 'qwen-turbo',
        apiKey: 'sk-mock-key',
    };
    try {
        const openaiProvider = factory_1.LLMFactory.createProvider(openaiConfig);
        console.log('✅ OpenAI Provider created successfully.');
        const deepseekProvider = factory_1.LLMFactory.createProvider(deepseekConfig);
        console.log('✅ DeepSeek Provider created successfully.');
        const qwenProvider = factory_1.LLMFactory.createProvider(qwenConfig);
        console.log('✅ Qwen Provider created successfully.');
    }
    catch (error) {
        console.error('❌ Provider creation failed:', error);
    }
}
testProviders();
//# sourceMappingURL=provider.test.js.map
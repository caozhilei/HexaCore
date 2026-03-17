"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMFactory = void 0;
const openai_1 = require("./openai");
const deepseek_1 = require("./deepseek");
const qwen_1 = require("./qwen");
// import { AnthropicProvider } from './anthropic'; // To be implemented
class LLMFactory {
    static createProvider(config) {
        switch (config.provider) {
            case 'openai':
                return new openai_1.OpenAIProvider(config);
            case 'deepseek':
                return new deepseek_1.DeepSeekProvider(config);
            case 'qwen':
                return new qwen_1.QwenProvider(config);
            // case 'anthropic':
            //   return new AnthropicProvider(config);
            default:
                throw new Error(`Unsupported provider: ${config.provider}`);
        }
    }
}
exports.LLMFactory = LLMFactory;
//# sourceMappingURL=factory.js.map

import { LLMConfig, LLMProvider } from './types';
import { OpenAIProvider } from './openai';
import { DeepSeekProvider } from './deepseek';
import { QwenProvider } from './qwen';
// import { AnthropicProvider } from './anthropic'; // To be implemented

export class LLMFactory {
  static createProvider(config: LLMConfig): LLMProvider {
    switch (config.provider) {
      case 'openai':
        return new OpenAIProvider(config);
      case 'deepseek':
        return new DeepSeekProvider(config);
      case 'qwen':
        return new QwenProvider(config);
      // case 'anthropic':
      //   return new AnthropicProvider(config);
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }
}

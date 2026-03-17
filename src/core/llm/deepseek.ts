
import { LLMConfig } from './types';
import OpenAI from 'openai';
import { OpenAIProvider } from './openai';

export class DeepSeekProvider extends OpenAIProvider {
  constructor(config: LLMConfig) {
    // Ensure base URL is set for DeepSeek if not provided
    // Official DeepSeek API base: https://api.deepseek.com/v1
    const baseUrl = config.baseUrl || 'https://api.deepseek.com/v1';
    super({ ...config, baseUrl });
    
    // Override client creation if necessary (though OpenAI SDK works for DeepSeek)
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: baseUrl,
    });
  }

  // DeepSeek specific overrides if needed (e.g. model validation, specific params)
  // DeepSeek supports chat completions similar to OpenAI.
  // Embeddings: DeepSeek has specific embedding models or might use external ones.
  // Let's assume standard behavior for now.

  // Note: DeepSeek might have specific parameters for 'reasoning' or 'cot' (chain of thought).
  // For now, we stick to the standard OpenAI interface.
}

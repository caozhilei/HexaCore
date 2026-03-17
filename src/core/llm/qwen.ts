
import { LLMConfig } from './types';
import OpenAI from 'openai';
import { OpenAIProvider } from './openai';

export class QwenProvider extends OpenAIProvider {
  constructor(config: LLMConfig) {
    // Ensure base URL is set for Qwen (DashScope) if not provided
    // DashScope OpenAI Compatible Endpoint: https://dashscope.aliyuncs.com/compatible-mode/v1
    const baseUrl = config.baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    super({ ...config, baseUrl });
    
    // Override client creation if necessary
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: baseUrl,
    });
  }

  // Qwen specific overrides if needed
  // Qwen has specific embedding models like 'text-embedding-v1' or 'text-embedding-v2'
  // But standard OpenAI embedding calls might default to 'text-embedding-3-small' which might not work.
  // We should override embed to use a supported model or default.

  async embed(text: string): Promise<number[]> {
    // DashScope uses different model names for embeddings, e.g., 'text-embedding-v2'
    const model = this.config.model.includes('embedding') ? this.config.model : 'text-embedding-v2';
    
    const response = await this.client.embeddings.create({
      model: model,
      input: text,
    });
    return response.data[0].embedding;
  }
}

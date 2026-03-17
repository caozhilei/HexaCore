
import { LLMProvider, LLMConfig, ChatMessage, CompletionResult } from './types';
import OpenAI from 'openai';

export class OpenAIProvider implements LLMProvider {
  protected client: OpenAI;
  protected config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || 'https://api.openai.com/v1',
    });
  }

  async chat(messages: ChatMessage[], options?: Partial<LLMConfig>): Promise<CompletionResult> {
    const response = await this.client.chat.completions.create({
      model: options?.model || this.config.model,
      messages: messages as any,
      max_tokens: options?.maxTokens || this.config.maxTokens,
      temperature: options?.temperature || this.config.temperature,
    });

    return {
      content: response.choices[0].message.content || '',
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  }

  async *stream(messages: ChatMessage[], options?: Partial<LLMConfig>): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: options?.model || this.config.model,
      messages: messages as any,
      max_tokens: options?.maxTokens || this.config.maxTokens,
      temperature: options?.temperature || this.config.temperature,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield content;
      }
    }
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small', // Default for OpenAI, can be config'd
      input: text,
    });
    return response.data[0].embedding;
  }
}


export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'deepseek' | 'qwen';
  model: string;
  apiKey: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
}

export interface CompletionResult {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMProvider {
  /**
   * Complete a chat conversation
   */
  chat(messages: ChatMessage[], options?: Partial<LLMConfig>): Promise<CompletionResult>;
  
  /**
   * Stream a chat conversation (Async iterator)
   */
  stream(messages: ChatMessage[], options?: Partial<LLMConfig>): AsyncIterable<string>;
  
  /**
   * Get text embeddings
   */
  embed(text: string): Promise<number[]>;
}

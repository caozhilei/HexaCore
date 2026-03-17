
import { LLMFactory } from './factory';
import { LLMConfig, ChatMessage } from './types';

export class LLMService {
  private static instance: LLMService;
  private config: LLMConfig;
  private provider: any; // Using any for now to avoid circular dependency issues during initialization

  private constructor(config: LLMConfig) {
    this.config = config;
    this.provider = LLMFactory.createProvider(config);
  }

  public static getInstance(config?: LLMConfig): LLMService {
    if (!LLMService.instance) {
      if (!config) {
        throw new Error('LLMService must be initialized with config first');
      }
      LLMService.instance = new LLMService(config);
    }
    return LLMService.instance;
  }

  public getProvider() {
    return this.provider;
  }
  
  public async generate(prompt: string, messages?: ChatMessage[]): Promise<string> {
    if (messages && messages.length > 0) {
      const result = await this.provider.chat(messages);
      return result.content;
    } else {
      const result = await this.provider.chat([{ role: 'user', content: prompt }]);
      return result.content;
    }
  }
}

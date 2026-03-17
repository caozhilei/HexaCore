import { LLMConfig } from './types';
import { OpenAIProvider } from './openai';
export declare class DeepSeekProvider extends OpenAIProvider {
    constructor(config: LLMConfig);
}

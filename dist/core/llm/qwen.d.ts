import { LLMConfig } from './types';
import { OpenAIProvider } from './openai';
export declare class QwenProvider extends OpenAIProvider {
    constructor(config: LLMConfig);
    embed(text: string): Promise<number[]>;
}

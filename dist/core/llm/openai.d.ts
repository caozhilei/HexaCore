import { LLMProvider, LLMConfig, ChatMessage, CompletionResult } from './types';
import OpenAI from 'openai';
export declare class OpenAIProvider implements LLMProvider {
    protected client: OpenAI;
    protected config: LLMConfig;
    constructor(config: LLMConfig);
    chat(messages: ChatMessage[], options?: Partial<LLMConfig>): Promise<CompletionResult>;
    stream(messages: ChatMessage[], options?: Partial<LLMConfig>): AsyncIterable<string>;
    embed(text: string): Promise<number[]>;
}

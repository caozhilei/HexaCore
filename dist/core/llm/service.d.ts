import { LLMConfig, ChatMessage } from './types';
export declare class LLMService {
    private static instance;
    private config;
    private provider;
    private constructor();
    static getInstance(config?: LLMConfig): LLMService;
    getProvider(): any;
    generate(prompt: string, messages?: ChatMessage[]): Promise<string>;
}

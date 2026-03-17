"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
const openai_1 = __importDefault(require("openai"));
class OpenAIProvider {
    client;
    config;
    constructor(config) {
        this.config = config;
        this.client = new openai_1.default({
            apiKey: config.apiKey,
            baseURL: config.baseUrl || 'https://api.openai.com/v1',
        });
    }
    async chat(messages, options) {
        const response = await this.client.chat.completions.create({
            model: options?.model || this.config.model,
            messages: messages,
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
    async *stream(messages, options) {
        const stream = await this.client.chat.completions.create({
            model: options?.model || this.config.model,
            messages: messages,
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
    async embed(text) {
        const response = await this.client.embeddings.create({
            model: 'text-embedding-3-small', // Default for OpenAI, can be config'd
            input: text,
        });
        return response.data[0].embedding;
    }
}
exports.OpenAIProvider = OpenAIProvider;
//# sourceMappingURL=openai.js.map
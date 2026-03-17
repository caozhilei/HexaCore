"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QwenProvider = void 0;
const openai_1 = __importDefault(require("openai"));
const openai_2 = require("./openai");
class QwenProvider extends openai_2.OpenAIProvider {
    constructor(config) {
        // Ensure base URL is set for Qwen (DashScope) if not provided
        // DashScope OpenAI Compatible Endpoint: https://dashscope.aliyuncs.com/compatible-mode/v1
        const baseUrl = config.baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
        super({ ...config, baseUrl });
        // Override client creation if necessary
        this.client = new openai_1.default({
            apiKey: config.apiKey,
            baseURL: baseUrl,
        });
    }
    // Qwen specific overrides if needed
    // Qwen has specific embedding models like 'text-embedding-v1' or 'text-embedding-v2'
    // But standard OpenAI embedding calls might default to 'text-embedding-3-small' which might not work.
    // We should override embed to use a supported model or default.
    async embed(text) {
        // DashScope uses different model names for embeddings, e.g., 'text-embedding-v2'
        const model = this.config.model.includes('embedding') ? this.config.model : 'text-embedding-v2';
        const response = await this.client.embeddings.create({
            model: model,
            input: text,
        });
        return response.data[0].embedding;
    }
}
exports.QwenProvider = QwenProvider;
//# sourceMappingURL=qwen.js.map
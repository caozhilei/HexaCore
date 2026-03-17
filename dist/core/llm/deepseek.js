"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepSeekProvider = void 0;
const openai_1 = __importDefault(require("openai"));
const openai_2 = require("./openai");
class DeepSeekProvider extends openai_2.OpenAIProvider {
    constructor(config) {
        // Ensure base URL is set for DeepSeek if not provided
        // Official DeepSeek API base: https://api.deepseek.com/v1
        const baseUrl = config.baseUrl || 'https://api.deepseek.com/v1';
        super({ ...config, baseUrl });
        // Override client creation if necessary (though OpenAI SDK works for DeepSeek)
        this.client = new openai_1.default({
            apiKey: config.apiKey,
            baseURL: baseUrl,
        });
    }
}
exports.DeepSeekProvider = DeepSeekProvider;
//# sourceMappingURL=deepseek.js.map
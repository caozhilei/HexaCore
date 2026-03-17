"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMService = void 0;
const factory_1 = require("./factory");
class LLMService {
    static instance;
    config;
    provider; // Using any for now to avoid circular dependency issues during initialization
    constructor(config) {
        this.config = config;
        this.provider = factory_1.LLMFactory.createProvider(config);
    }
    static getInstance(config) {
        if (!LLMService.instance) {
            if (!config) {
                throw new Error('LLMService must be initialized with config first');
            }
            LLMService.instance = new LLMService(config);
        }
        return LLMService.instance;
    }
    getProvider() {
        return this.provider;
    }
    async generate(prompt, messages) {
        if (messages && messages.length > 0) {
            const result = await this.provider.chat(messages);
            return result.content;
        }
        else {
            const result = await this.provider.chat([{ role: 'user', content: prompt }]);
            return result.content;
        }
    }
}
exports.LLMService = LLMService;
//# sourceMappingURL=service.js.map
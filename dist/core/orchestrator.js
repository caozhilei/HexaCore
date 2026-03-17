"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Orchestrator = void 0;
const engine_1 = require("./routing/engine");
const agent_repo_1 = require("./database/agent-repo");
const session_repo_1 = require("./database/session-repo");
const memory_repo_1 = require("./database/memory-repo");
const service_1 = require("./llm/service");
class Orchestrator {
    routingEngine;
    agentRepo;
    sessionRepo;
    memoryRepo;
    llmService;
    constructor() {
        this.routingEngine = new engine_1.RoutingEngine({ rules: [] }, { useDatabaseRules: true });
        this.agentRepo = new agent_repo_1.AgentRepository();
        this.sessionRepo = new session_repo_1.SessionRepository();
        this.memoryRepo = new memory_repo_1.MemoryRepository();
        try {
            this.llmService = service_1.LLMService.getInstance();
        }
        catch (e) {
            // Fallback init if not initialized
            this.llmService = service_1.LLMService.getInstance({
                provider: process.env.LLM_PROVIDER || 'openai',
                model: process.env.LLM_MODEL || 'gpt-3.5-turbo',
                apiKey: process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.QWEN_API_KEY || 'dummy',
                baseUrl: process.env.LLM_BASE_URL
            });
        }
    }
    async processMessage(message) {
        console.log(`[Orchestrator] Processing message from ${message.peer.id}...`);
        const requestedAgentId = message.metadata?.common?.agentId;
        // 1. Route Message (allow explicit agentId override)
        const routeResult = requestedAgentId
            ? { agentId: requestedAgentId }
            : await this.routingEngine.route(message);
        const agentId = routeResult.agentId;
        if (!agentId) {
            throw new Error('No agent found for message');
        }
        console.log(`[Orchestrator] Routed to agent: ${agentId}`);
        // 2. Get Agent & Session
        const agent = await this.agentRepo.getAgent(agentId);
        // Generate Session Key
        const sessionKey = `${message.channel}:${message.peer.id}:${agentId}`;
        let session = await this.sessionRepo.getSession(sessionKey);
        if (!session) {
            session = await this.sessionRepo.createSession(sessionKey, agentId, message.peer.id);
        }
        // 3. Retrieve Context (Memory)
        const dbMemories = await this.memoryRepo.getMemories(sessionKey, 10);
        const history = dbMemories.reverse().map(m => {
            const role = m.metadata?.role || 'user';
            return { role, content: m.content || '' };
        });
        // 4. Retrieve Shared Knowledge (Memory Spaces)
        let systemPrompt = agent?.config?.prompt || 'You are a helpful assistant.';
        if (agentId) {
            const sharedMemories = await this.memoryRepo.getAgentSharedMemories(agentId, 10);
            if (sharedMemories && sharedMemories.length > 0) {
                const sharedContext = `\n\n<Shared_Knowledge_Base>\n${sharedMemories.map(m => `- ${m.content}`).join('\n')}\n</Shared_Knowledge_Base>\n`;
                systemPrompt += sharedContext;
            }
        }
        // 5. Construct Prompt
        const messages = [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: message.content.text || '' }
        ];
        // 6. Call LLM
        const responseContent = await this.llmService.generate('', messages);
        // 7. Save Memories
        await this.memoryRepo.addMemory(sessionKey, message.content.text || '', 'short', { role: 'user' });
        await this.memoryRepo.addMemory(sessionKey, responseContent, 'short', { role: 'assistant' });
        // 8. Return OutboundMessage
        return {
            channel: message.channel,
            accountId: message.accountId,
            peerId: message.peer.id,
            content: {
                type: 'text',
                text: responseContent
            },
            metadata: {
                common: {
                    agentId,
                    sessionId: sessionKey
                }
            }
        };
    }
}
exports.Orchestrator = Orchestrator;
//# sourceMappingURL=orchestrator.js.map
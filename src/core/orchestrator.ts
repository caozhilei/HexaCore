
import { RoutingEngine } from './routing/engine';
import { AgentRepository } from './database/agent-repo';
import { SessionRepository } from './database/session-repo';
import { MemoryRepository } from './database/memory-repo';
import { LLMService } from './llm/service';
import { InboundMessage, OutboundMessage } from './entry-points/interfaces';
import { ChatMessage } from './llm/types';

export class Orchestrator {
  private routingEngine: RoutingEngine;
  private agentRepo: AgentRepository;
  private sessionRepo: SessionRepository;
  private memoryRepo: MemoryRepository;
  private llmService: LLMService;

  constructor() {
    this.routingEngine = new RoutingEngine({ rules: [] }, { useDatabaseRules: true });
    this.agentRepo = new AgentRepository();
    this.sessionRepo = new SessionRepository();
    this.memoryRepo = new MemoryRepository();
    
    try {
        this.llmService = LLMService.getInstance();
    } catch (e) {
        // Fallback init if not initialized
        this.llmService = LLMService.getInstance({
            provider: (process.env.LLM_PROVIDER as any) || 'openai',
            model: process.env.LLM_MODEL || 'gpt-3.5-turbo',
            apiKey: process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.QWEN_API_KEY || 'dummy',
            baseUrl: process.env.LLM_BASE_URL
        });
    }
  }

  public async processMessage(message: InboundMessage): Promise<OutboundMessage> {
    console.log(`[Orchestrator] Processing message from ${message.peer.id}...`);

    const requestedAgentId = message.metadata?.common?.agentId;

    // 1. Route Message (allow explicit agentId override)
    const routeResult = requestedAgentId
      ? { agentId: requestedAgentId } as any
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
    const history: ChatMessage[] = dbMemories.reverse().map(m => {
        const role = (m.metadata as any)?.role || 'user'; 
        return { role, content: m.content || '' };
    });

    // 4. Retrieve Shared Knowledge (Memory Spaces)
    let systemPrompt = (agent?.config as any)?.prompt || 'You are a helpful assistant.';
    if (agentId) {
        const sharedMemories = await this.memoryRepo.getAgentSharedMemories(agentId, 10);
        if (sharedMemories && sharedMemories.length > 0) {
            const sharedContext = `\n\n<Shared_Knowledge_Base>\n${sharedMemories.map((m: any) => `- ${m.content}`).join('\n')}\n</Shared_Knowledge_Base>\n`;
            systemPrompt += sharedContext;
        }
    }

    // 5. Construct Prompt
    const messages: ChatMessage[] = [
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

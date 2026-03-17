import { InboundMessage, OutboundMessage } from './entry-points/interfaces';
export declare class Orchestrator {
    private routingEngine;
    private agentRepo;
    private sessionRepo;
    private memoryRepo;
    private llmService;
    constructor();
    processMessage(message: InboundMessage): Promise<OutboundMessage>;
}

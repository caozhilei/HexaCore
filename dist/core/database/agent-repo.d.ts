import { Database } from '../../types/supabase';
type Agent = Database['public']['Tables']['agents']['Row'];
type AgentInsert = Database['public']['Tables']['agents']['Insert'];
export declare class AgentRepository {
    /**
     * Create a new agent
     */
    createAgent(agent: AgentInsert): Promise<Agent>;
    /**
     * Get an agent by ID
     */
    getAgent(id: string): Promise<Agent | null>;
    /**
     * List all agents
     */
    listAgents(): Promise<Agent[]>;
    /**
     * Update agent configuration
     */
    updateAgentConfig(id: string, config: any): Promise<Agent>;
    /**
     * Delete an agent
     */
    deleteAgent(id: string): Promise<void>;
}
export {};

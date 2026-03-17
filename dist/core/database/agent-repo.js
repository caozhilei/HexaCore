"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRepository = void 0;
const supabase_1 = require("./supabase");
class AgentRepository {
    /**
     * Create a new agent
     */
    async createAgent(agent) {
        const { data, error } = await supabase_1.supabase
            .from('agents')
            // @ts-ignore
            .insert(agent)
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to create agent: ${error.message}`);
        }
        return data;
    }
    /**
     * Get an agent by ID
     */
    async getAgent(id) {
        const { data, error } = await supabase_1.supabase
            .from('agents')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116') { // JSON object requested, multiple (or no) rows returned
                return null;
            }
            throw new Error(`Failed to get agent: ${error.message}`);
        }
        return data;
    }
    /**
     * List all agents
     */
    async listAgents() {
        const { data, error } = await supabase_1.supabase
            .from('agents')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            throw new Error(`Failed to list agents: ${error.message}`);
        }
        return data;
    }
    /**
     * Update agent configuration
     */
    async updateAgentConfig(id, config) {
        const { data, error } = await supabase_1.supabase
            .from('agents')
            // @ts-ignore
            .update({ config, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to update agent config: ${error.message}`);
        }
        return data;
    }
    /**
     * Delete an agent
     */
    async deleteAgent(id) {
        const { error } = await supabase_1.supabase
            .from('agents')
            .delete()
            .eq('id', id);
        if (error) {
            throw new Error(`Failed to delete agent: ${error.message}`);
        }
    }
}
exports.AgentRepository = AgentRepository;
//# sourceMappingURL=agent-repo.js.map
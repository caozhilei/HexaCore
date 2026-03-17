import { supabase } from './supabase';
import { Database } from '../../types/supabase';

type Agent = Database['public']['Tables']['agents']['Row'];
type AgentInsert = Database['public']['Tables']['agents']['Insert'];

export class AgentRepository {
  /**
   * Create a new agent
   */
  async createAgent(agent: AgentInsert): Promise<Agent> {
    const { data, error } = await supabase
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
  async getAgent(id: string): Promise<Agent | null> {
    const { data, error } = await supabase
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
  async listAgents(): Promise<Agent[]> {
    const { data, error } = await supabase
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
  async updateAgentConfig(id: string, config: any): Promise<Agent> {
    const { data, error } = await supabase
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
  async deleteAgent(id: string): Promise<void> {
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete agent: ${error.message}`);
    }
  }
}

import { supabase } from './supabase';
import { Database } from '../../types/supabase';

type Memory = Database['public']['Tables']['memories']['Row'];
type MemoryInsert = Database['public']['Tables']['memories']['Insert'];

export class MemoryRepository {
  /**
   * Create a new shared memory space
   */
  async createSpace(name: string, type: 'session' | 'shared' = 'shared', ownerId?: string) {
    const { data, error } = await supabase
      .from('memory_spaces')
      // @ts-ignore
      .insert({ name, type, owner_id: ownerId || null })
      .select()
      .single();
    if (error) throw new Error(`Failed to create memory space: ${error.message}`);
    return data;
  }

  /**
   * Grant an agent access to a memory space
   */
  async grantAccess(spaceId: string, agentId: string, permission: 'read' | 'write') {
    const { data, error } = await supabase
      .from('memory_space_grants')
      // @ts-ignore
      .upsert({ space_id: spaceId, agent_id: agentId, permission }, { onConflict: 'space_id,agent_id' })
      .select()
      .single();
    if (error) throw new Error(`Failed to grant access: ${error.message}`);
    return data;
  }

  /**
   * Check if an agent has permission to a space
   */
  async checkPermission(spaceId: string, agentId: string, requiredPermission: 'read' | 'write'): Promise<boolean> {
    const { data, error } = await supabase
      .from('memory_space_grants')
      .select('permission')
      .eq('space_id', spaceId)
      .eq('agent_id', agentId)
      .single();
      
    if (error || !data) return false;
    if (requiredPermission === 'read') return true; // write implies read
    return data.permission === 'write';
  }

  /**
   * Get all shared memories an agent has access to
   */
  async getAgentSharedMemories(agentId: string, limit: number = 20) {
    // First get all spaces the agent has access to
    const { data: grants } = await supabase
      .from('memory_space_grants')
      .select('space_id')
      .eq('agent_id', agentId);
      
    if (!grants || grants.length === 0) return [];
    
    const spaceIds = grants.map(g => g.space_id);
    
    // Then get memories for those spaces
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .in('space_id', spaceIds)
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (error) throw new Error(`Failed to get shared memories: ${error.message}`);
    return data;
  }

  /**
   * Add a new memory
   */
  async addMemory(
    sessionKey: string | null,
    content: string,
    type: 'short' | 'long' = 'short',
    metadata: any = {},
    spaceId: string | null = null,
    agentId?: string // Needed for auth check if writing to space
  ): Promise<Memory> {
    if (spaceId && agentId) {
      const hasAccess = await this.checkPermission(spaceId, agentId, 'write');
      if (!hasAccess) throw new Error(`Agent ${agentId} lacks write permission for space ${spaceId}`);
    }

    const { data, error } = await supabase
      .from('memories')
      // @ts-ignore
      .insert({
        session_key: sessionKey,
        space_id: spaceId,
        content: content,
        type: type,
        metadata: metadata,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add memory: ${error.message}`);
    }

    return data;
  }

  /**
   * Get recent memories for a session
   */
  async getMemories(sessionKey: string, limit: number = 10): Promise<Memory[]> {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('session_key', sessionKey)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get memories: ${error.message}`);
    }

    return data;
  }

  /**
   * Search memories (Basic text search for now)
   * TODO: Implement vector search once pgvector is enabled
   */
  async searchMemories(sessionKey: string, query: string): Promise<Memory[]> {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('session_key', sessionKey)
      .ilike('content', `%${query}%`)
      .limit(5);

    if (error) {
      throw new Error(`Failed to search memories: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete memory
   */
  async deleteMemory(id: string): Promise<void> {
    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete memory: ${error.message}`);
    }
  }
}

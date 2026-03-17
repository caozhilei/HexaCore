"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryRepository = void 0;
const supabase_1 = require("./supabase");
class MemoryRepository {
    /**
     * Create a new shared memory space
     */
    async createSpace(name, type = 'shared', ownerId) {
        const { data, error } = await supabase_1.supabase
            .from('memory_spaces')
            .insert({ name, type, owner_id: ownerId || null })
            .select()
            .single();
        if (error)
            throw new Error(`Failed to create memory space: ${error.message}`);
        return data;
    }
    /**
     * Grant an agent access to a memory space
     */
    async grantAccess(spaceId, agentId, permission) {
        const { data, error } = await supabase_1.supabase
            .from('memory_space_grants')
            .upsert({ space_id: spaceId, agent_id: agentId, permission }, { onConflict: 'space_id,agent_id' })
            .select()
            .single();
        if (error)
            throw new Error(`Failed to grant access: ${error.message}`);
        return data;
    }
    /**
     * Check if an agent has permission to a space
     */
    async checkPermission(spaceId, agentId, requiredPermission) {
        const { data, error } = await supabase_1.supabase
            .from('memory_space_grants')
            .select('permission')
            .eq('space_id', spaceId)
            .eq('agent_id', agentId)
            .single();
        if (error || !data)
            return false;
        if (requiredPermission === 'read')
            return true; // write implies read
        return data.permission === 'write';
    }
    /**
     * Get all shared memories an agent has access to
     */
    async getAgentSharedMemories(agentId, limit = 20) {
        // First get all spaces the agent has access to
        const { data: grants } = await supabase_1.supabase
            .from('memory_space_grants')
            .select('space_id')
            .eq('agent_id', agentId);
        if (!grants || grants.length === 0)
            return [];
        const spaceIds = grants.map(g => g.space_id);
        // Then get memories for those spaces
        const { data, error } = await supabase_1.supabase
            .from('memories')
            .select('*')
            .in('space_id', spaceIds)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error)
            throw new Error(`Failed to get shared memories: ${error.message}`);
        return data;
    }
    /**
     * Add a new memory
     */
    async addMemory(sessionKey, content, type = 'short', metadata = {}, spaceId = null, agentId // Needed for auth check if writing to space
    ) {
        if (spaceId && agentId) {
            const hasAccess = await this.checkPermission(spaceId, agentId, 'write');
            if (!hasAccess)
                throw new Error(`Agent ${agentId} lacks write permission for space ${spaceId}`);
        }
        const { data, error } = await supabase_1.supabase
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
    async getMemories(sessionKey, limit = 10) {
        const { data, error } = await supabase_1.supabase
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
    async searchMemories(sessionKey, query) {
        const { data, error } = await supabase_1.supabase
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
    async deleteMemory(id) {
        const { error } = await supabase_1.supabase
            .from('memories')
            .delete()
            .eq('id', id);
        if (error) {
            throw new Error(`Failed to delete memory: ${error.message}`);
        }
    }
}
exports.MemoryRepository = MemoryRepository;
//# sourceMappingURL=memory-repo.js.map
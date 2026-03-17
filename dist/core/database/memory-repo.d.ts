import { Database } from '../../types/supabase';
type Memory = Database['public']['Tables']['memories']['Row'];
export declare class MemoryRepository {
    /**
     * Create a new shared memory space
     */
    createSpace(name: string, type?: 'session' | 'shared', ownerId?: string): Promise<never>;
    /**
     * Grant an agent access to a memory space
     */
    grantAccess(spaceId: string, agentId: string, permission: 'read' | 'write'): Promise<never>;
    /**
     * Check if an agent has permission to a space
     */
    checkPermission(spaceId: string, agentId: string, requiredPermission: 'read' | 'write'): Promise<boolean>;
    /**
     * Get all shared memories an agent has access to
     */
    getAgentSharedMemories(agentId: string, limit?: number): Promise<never[]>;
    /**
     * Add a new memory
     */
    addMemory(sessionKey: string | null, content: string, type?: 'short' | 'long', metadata?: any, spaceId?: string | null, agentId?: string): Promise<Memory>;
    /**
     * Get recent memories for a session
     */
    getMemories(sessionKey: string, limit?: number): Promise<Memory[]>;
    /**
     * Search memories (Basic text search for now)
     * TODO: Implement vector search once pgvector is enabled
     */
    searchMemories(sessionKey: string, query: string): Promise<Memory[]>;
    /**
     * Delete memory
     */
    deleteMemory(id: string): Promise<void>;
}
export {};

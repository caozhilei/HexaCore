import { Database } from '../../types/supabase';
type Session = Database['public']['Tables']['chat_sessions']['Row'];
export declare class SessionRepository {
    /**
     * Create a new session
     */
    createSession(sessionKey: string, agentId?: string, userId?: string, initialState?: any): Promise<Session>;
    /**
     * Get session state
     */
    getSession(sessionKey: string): Promise<Session | null>;
    /**
     * Update session state
     */
    updateSessionState(sessionKey: string, newState: any): Promise<Session>;
    /**
     * Delete session
     */
    deleteSession(sessionKey: string): Promise<void>;
}
export {};

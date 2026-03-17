"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionRepository = void 0;
const supabase_1 = require("./supabase");
class SessionRepository {
    /**
     * Create a new session
     */
    async createSession(sessionKey, agentId, userId, initialState = {}) {
        const { data, error } = await supabase_1.supabase
            .from('chat_sessions')
            // @ts-ignore
            .insert({
            session_key: sessionKey,
            agent_id: agentId || null,
            user_id: userId || null,
            state: initialState,
        })
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to create session: ${error.message}`);
        }
        return data;
    }
    /**
     * Get session state
     */
    async getSession(sessionKey) {
        const { data, error } = await supabase_1.supabase
            .from('chat_sessions')
            .select('*')
            .eq('session_key', sessionKey)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw new Error(`Failed to get session: ${error.message}`);
        }
        return data;
    }
    /**
     * Update session state
     */
    async updateSessionState(sessionKey, newState) {
        const { data, error } = await supabase_1.supabase
            .from('chat_sessions')
            // @ts-ignore
            .update({ state: newState, updated_at: new Date().toISOString() })
            .eq('session_key', sessionKey)
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to update session state: ${error.message}`);
        }
        return data;
    }
    /**
     * Delete session
     */
    async deleteSession(sessionKey) {
        const { error } = await supabase_1.supabase
            .from('chat_sessions')
            .delete()
            .eq('session_key', sessionKey);
        if (error) {
            throw new Error(`Failed to delete session: ${error.message}`);
        }
    }
}
exports.SessionRepository = SessionRepository;
//# sourceMappingURL=session-repo.js.map
import { supabase } from './supabase';
import { Database } from '../../types/supabase';

type Session = Database['public']['Tables']['chat_sessions']['Row'];
type SessionInsert = Database['public']['Tables']['chat_sessions']['Insert'];

export class SessionRepository {
  /**
   * Create a new session
   */
  async createSession(sessionKey: string, agentId?: string, userId?: string, initialState: any = {}): Promise<Session> {
    const { data, error } = await supabase
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
  async getSession(sessionKey: string): Promise<Session | null> {
    const { data, error } = await supabase
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
  async updateSessionState(sessionKey: string, newState: any): Promise<Session> {
    const { data, error } = await supabase
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
  async deleteSession(sessionKey: string): Promise<void> {
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('session_key', sessionKey);

    if (error) {
      throw new Error(`Failed to delete session: ${error.message}`);
    }
  }
}

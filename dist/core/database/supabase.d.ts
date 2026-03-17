import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/supabase';
export declare class SupabaseService {
    private static instance;
    private serviceRoleClient;
    private anonClient;
    private constructor();
    static getInstance(): SupabaseService;
    /**
     * Get the Supabase client with Service Role (Admin) privileges.
     * Use this for backend operations that bypass RLS.
     */
    getClient(): SupabaseClient<Database>;
    /**
     * Get the Supabase client with Anon privileges.
     * Use this for operations that should respect RLS (e.g. client-side simulation).
     */
    getAnonClient(): SupabaseClient<Database>;
}
export declare const supabase: SupabaseClient<Database, "public", "public", never, {
    PostgrestVersion: "12";
}>;

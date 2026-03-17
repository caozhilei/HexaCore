import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/supabase';
import * as dotenv from 'dotenv';
import path from 'path';

// Ensure environment variables are loaded if not already
if (!process.env.SUPABASE_URL) {
  const envPath = path.resolve(process.cwd(), '.env.local');
  dotenv.config({ path: envPath });
}

export class SupabaseService {
  private static instance: SupabaseService;
  private serviceRoleClient: SupabaseClient<Database>;
  private anonClient: SupabaseClient<Database>;

  private constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error(
        'Missing Supabase environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY'
      );
    }

    this.serviceRoleClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.anonClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  /**
   * Get the Supabase client with Service Role (Admin) privileges.
   * Use this for backend operations that bypass RLS.
   */
  public getClient(): SupabaseClient<Database> {
    return this.serviceRoleClient;
  }

  /**
   * Get the Supabase client with Anon privileges.
   * Use this for operations that should respect RLS (e.g. client-side simulation).
   */
  public getAnonClient(): SupabaseClient<Database> {
    return this.anonClient;
  }
}

export const supabase = SupabaseService.getInstance().getClient();

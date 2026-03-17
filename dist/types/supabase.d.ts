export type Json = string | number | boolean | null | {
    [key: string]: Json | undefined;
} | Json[];
export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    updated_at: string | null;
                    username: string | null;
                    full_name: string | null;
                    avatar_url: string | null;
                    website: string | null;
                };
                Insert: {
                    id: string;
                    updated_at?: string | null;
                    username?: string | null;
                    full_name?: string | null;
                    avatar_url?: string | null;
                    website?: string | null;
                };
                Update: {
                    id?: string;
                    updated_at?: string | null;
                    username?: string | null;
                    full_name?: string | null;
                    avatar_url?: string | null;
                    website?: string | null;
                };
            };
            agents: {
                Row: {
                    id: string;
                    name: string;
                    description: string | null;
                    config: Json;
                    owner_id: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    description?: string | null;
                    config?: Json;
                    owner_id?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    description?: string | null;
                    config?: Json;
                    owner_id?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            chat_sessions: {
                Row: {
                    session_key: string;
                    agent_id: string | null;
                    user_id: string | null;
                    state: Json;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    session_key: string;
                    agent_id?: string | null;
                    user_id?: string | null;
                    state?: Json;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    session_key?: string;
                    agent_id?: string | null;
                    user_id?: string | null;
                    state?: Json;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            memories: {
                Row: {
                    id: string;
                    session_key: string | null;
                    space_id: string | null;
                    content: string | null;
                    metadata: Json | null;
                    type: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    session_key?: string | null;
                    space_id?: string | null;
                    content?: string | null;
                    metadata?: Json | null;
                    type?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    session_key?: string | null;
                    space_id?: string | null;
                    content?: string | null;
                    metadata?: Json | null;
                    type?: string | null;
                    created_at?: string;
                };
            };
            memory_spaces: {
                Row: {
                    id: string;
                    name: string;
                    type: 'session' | 'shared';
                    owner_id: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    type?: 'session' | 'shared';
                    owner_id?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    type?: 'session' | 'shared';
                    owner_id?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            memory_space_grants: {
                Row: {
                    id: string;
                    space_id: string;
                    agent_id: string;
                    permission: 'read' | 'write';
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    space_id: string;
                    agent_id: string;
                    permission: 'read' | 'write';
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    space_id?: string;
                    agent_id?: string;
                    permission?: 'read' | 'write';
                    created_at?: string;
                };
            };
            routing_rules: {
                Row: {
                    id: string;
                    priority: number;
                    match_condition: Json;
                    target_agent_id: string | null;
                    description: string | null;
                    is_active: boolean | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    priority?: number;
                    match_condition?: Json;
                    target_agent_id?: string | null;
                    description?: string | null;
                    is_active?: boolean | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    priority?: number;
                    match_condition?: Json;
                    target_agent_id?: string | null;
                    description?: string | null;
                    is_active?: boolean | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            skills: {
                Row: {
                    id: string;
                    name: string;
                    description: string | null;
                    definition: Json;
                    enabled: boolean | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    description?: string | null;
                    definition?: Json;
                    enabled?: boolean | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    description?: string | null;
                    definition?: Json;
                    enabled?: boolean | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            skill_packages: {
                Row: {
                    id: string;
                    source_type: string;
                    source_ref: string;
                    checksum: string;
                    storage_path: string | null;
                    install_path: string;
                    status: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    source_type: string;
                    source_ref: string;
                    checksum: string;
                    storage_path?: string | null;
                    install_path: string;
                    status?: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    source_type?: string;
                    source_ref?: string;
                    checksum?: string;
                    storage_path?: string | null;
                    install_path?: string;
                    status?: string;
                    created_at?: string;
                    updated_at?: string;
                };
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            [_ in never]: never;
        };
        Enums: {
            [_ in never]: never;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
}

-- Enable pgvector extension to work with embeddings vectors
-- Note: In official Supabase docker image, extensions are managed differently.
-- We should handle extension creation carefully or rely on pre-installed ones.
-- However, for local dev with this image, we try to create it if we have permissions.
-- If 'supabase_admin' role issue persists, we might need to skip this or grant permissions.

-- Create roles required by PostgREST and Supabase
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE ROLE supabase_auth_admin NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_storage_admin') THEN
    CREATE ROLE supabase_storage_admin NOLOGIN;
  END IF;
END
$$;

-- Grant usage on schema public
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- Attempt to create extension, ignoring errors if it already exists or if we lack permissions
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create vector extension: %', SQLERRM;
END $$;

-- Create a table to store user profiles
   create table if not exists public.profiles (
     id uuid not null primary key, -- Foreign key removed to avoid dependency on auth.users
     updated_at timestamp with time zone,
     username text unique,
     full_name text,
     avatar_url text,
     website text,
 
     constraint username_length check (char_length(username) >= 3)
   );
   
   -- Create storage schema for Supabase Storage
   -- We only create the schema, let the service handle table migrations to avoid conflicts
   CREATE SCHEMA IF NOT EXISTS storage;
   
   -- Create storage tables (minimal structure to allow service to start/migrate)
   CREATE TABLE IF NOT EXISTS storage.buckets (
       id text NOT NULL PRIMARY KEY,
       name text NOT NULL,
       owner uuid,
       created_at timestamp with time zone DEFAULT now(),
       updated_at timestamp with time zone DEFAULT now()
       -- public, avif_autodetection, file_size_limit, allowed_mime_types removed to allow migrations
   );
   
   CREATE TABLE IF NOT EXISTS storage.objects (
       id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
       bucket_id text,
       name text,
       owner uuid,
       created_at timestamp with time zone DEFAULT now(),
       updated_at timestamp with time zone DEFAULT now(),
       last_accessed_at timestamp with time zone DEFAULT now(),
       metadata jsonb
       -- path_tokens, version, owner_id removed to allow migrations
   );
   
    -- Set up Row Level Security (RLS)
     alter table public.profiles enable row level security;
  
  -- Safe policy creation
  DO $$
  BEGIN
      IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Public profiles are viewable by everyone.'
      ) THEN
          create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
      END IF;
  
      IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can insert their own profile.'
      ) THEN
          -- Using current_setting to get uid since auth.uid() might not exist yet
          create policy "Users can insert their own profile." on public.profiles for insert with check (
            nullif(current_setting('request.jwt.claim.sub', true), '')::uuid = id
          );
      END IF;
  
      IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can update own profile.'
      ) THEN
          create policy "Users can update own profile." on public.profiles for update using (
            nullif(current_setting('request.jwt.claim.sub', true), '')::uuid = id
          );
      END IF;
  END
  $$;
  
  -- Create a table to store HexaCore agents
create table if not exists public.agents (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  config jsonb default '{}'::jsonb,
  owner_id uuid, -- references auth.users(id) removed to avoid dependency
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.agents enable row level security;

-- Create a table to store sessions
create table if not exists public.chat_sessions (
  session_key text primary key,
  agent_id uuid references public.agents(id),
  user_id text, -- External user ID (e.g. WhatsApp number)
  state jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.chat_sessions enable row level security;

-- Create a table to store memories (with vector support)
create table if not exists public.memories (
  id uuid default gen_random_uuid() primary key,
  session_key text references public.chat_sessions(session_key),
  content text,
  -- embedding vector(1536), -- OpenAI embedding dimension
  metadata jsonb default '{}'::jsonb,
  type text check (type in ('short', 'long')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.memories enable row level security;

-- Create a table to store routing rules
create table if not exists public.routing_rules (
  id uuid default gen_random_uuid() primary key,
  priority int not null default 0,
  match_condition jsonb not null default '{}'::jsonb,
  target_agent_id uuid references public.agents(id),
  description text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.routing_rules enable row level security;

-- Create a table to store skills
create table if not exists public.skills (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  description text,
  definition jsonb not null default '{}'::jsonb, -- Skill schema/definition
  enabled boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.skills enable row level security;

-- Create a table to store skill packages (zip installs / marketplace sources)
create table if not exists public.skill_packages (
  id uuid default gen_random_uuid() primary key,
  source_type text not null,
  source_ref text not null,
  checksum text not null,
  storage_path text,
  install_path text not null,
  status text not null default 'installed',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.skill_packages enable row level security;

-- Create memory_spaces table
create table if not exists public.memory_spaces (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text check (type in ('session', 'shared')) not null default 'session',
  owner_id uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.memory_spaces enable row level security;

-- Create memory_space_grants table
create table if not exists public.memory_space_grants (
  id uuid default gen_random_uuid() primary key,
  space_id uuid references public.memory_spaces(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete cascade,
  permission text check (permission in ('read', 'write')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(space_id, agent_id)
);

alter table public.memory_space_grants enable row level security;

-- Alter memories table to add space_id and make session_key nullable
alter table public.memories add column if not exists space_id uuid references public.memory_spaces(id) on delete cascade;
alter table public.memories alter column session_key drop not null;

-- Create function to search memories
-- Note: Commented out temporarily until vector extension is confirmed working
/*
create or replace function search_memories (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_session_key text
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    memories.id,
    memories.content,
    memories.metadata,
    1 - (memories.embedding <=> query_embedding) as similarity
  from memories
  where 1 - (memories.embedding <=> query_embedding) > match_threshold
  and memories.session_key = p_session_key
  order by memories.embedding <=> query_embedding
  limit match_count;
end;
$$;
*/

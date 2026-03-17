
DO $$
BEGIN
    -- 1. DROP existing restrictive policies if they conflict or are too narrow
    -- It's safer to drop and recreate to ensure correctness
    DROP POLICY IF EXISTS "Enable update access for owners" ON "public"."agents";

    -- 2. CREATE the update policy
    -- This allows authenticated users to update agents where they are the owner_id
    -- OR if the agent has no owner (system agents, though usually system agents should be protected, 
    -- for development we might allow it or strictly require ownership).
    -- Let's stick to ownership for updates to be safe, but ensure the current user ID matches owner_id.
    
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policy
        WHERE polname = 'Enable update access for owners'
        AND polrelid = 'public.agents'::regclass
    ) THEN
        CREATE POLICY "Enable update access for owners" ON "public"."agents" 
        AS PERMISSIVE FOR UPDATE 
        TO authenticated 
        USING (auth.uid() = owner_id)
        WITH CHECK (auth.uid() = owner_id);
    END IF;

    -- Also ensure Insert/Delete policies exist for completeness if they were missing
     IF NOT EXISTS (
        SELECT 1
        FROM pg_policy
        WHERE polname = 'Enable insert access for owners'
        AND polrelid = 'public.agents'::regclass
    ) THEN
        CREATE POLICY "Enable insert access for owners" ON "public"."agents" 
        AS PERMISSIVE FOR INSERT 
        TO authenticated 
        WITH CHECK (auth.uid() = owner_id);
    END IF;

END
$$;

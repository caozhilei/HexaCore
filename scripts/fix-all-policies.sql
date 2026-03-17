
DO $$
BEGIN
    -- Disable RLS on the agents table completely for now to rule out policy issues
    ALTER TABLE "public"."agents" DISABLE ROW LEVEL SECURITY;
    
    -- Or, if we want to keep RLS enabled but allow everything:
    -- ALTER TABLE "public"."agents" ENABLE ROW LEVEL SECURITY;
    
    -- Drop all existing policies on agents to start fresh
    DROP POLICY IF EXISTS "Enable read access for owners" ON "public"."agents";
    DROP POLICY IF EXISTS "Enable read access for owners and public" ON "public"."agents";
    DROP POLICY IF EXISTS "Enable insert access for owners" ON "public"."agents";
    DROP POLICY IF EXISTS "Enable update access for owners" ON "public"."agents";
    DROP POLICY IF EXISTS "Enable delete access for owners" ON "public"."agents";
    DROP POLICY IF EXISTS "Enable all access for authenticated users" ON "public"."agents";

    -- Create a single, simple policy for ALL operations for authenticated users
    CREATE POLICY "Allow all operations for authenticated users" ON "public"."agents"
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

    -- Also create a policy for anon users just in case (though not recommended for prod)
    -- This helps if the client is somehow not sending the auth token correctly
    CREATE POLICY "Allow read for anon users" ON "public"."agents"
    AS PERMISSIVE
    FOR SELECT
    TO anon
    USING (true);

END
$$;

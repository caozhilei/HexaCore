
DO $$
BEGIN
    -- 1. DROP existing policies
    DROP POLICY IF EXISTS "Enable update access for owners" ON "public"."agents";
    DROP POLICY IF EXISTS "Enable all access for authenticated users" ON "public"."agents";

    -- 2. CREATE a broad policy for development/admin use
    -- This allows ANY authenticated user to SELECT, INSERT, UPDATE, DELETE ANY agent record
    -- WARNING: This is for development convenience or admin-only environments.
    
    CREATE POLICY "Enable all access for authenticated users" ON "public"."agents" 
    AS PERMISSIVE 
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

    -- 3. Also update skills table policies just in case
    DROP POLICY IF EXISTS "Enable all access for authenticated users" ON "public"."skills";
    CREATE POLICY "Enable all access for authenticated users" ON "public"."skills" 
    AS PERMISSIVE 
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

END
$$;

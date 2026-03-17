
DO $$
BEGIN
    DROP POLICY IF EXISTS "Enable read access for owners" ON "public"."agents";
    
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policy
        WHERE polname = 'Enable read access for owners and public'
        AND polrelid = 'public.agents'::regclass
    ) THEN
        CREATE POLICY "Enable read access for owners and public" ON "public"."agents" AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = owner_id OR owner_id IS NULL);
    END IF;
END
$$;

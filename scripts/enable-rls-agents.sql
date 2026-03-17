
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policy
        WHERE polname = 'Enable read access for owners'
        AND polrelid = 'public.agents'::regclass
    ) THEN
        CREATE POLICY "Enable read access for owners" ON "public"."agents" AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = owner_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policy
        WHERE polname = 'Enable insert access for owners'
        AND polrelid = 'public.agents'::regclass
    ) THEN
        CREATE POLICY "Enable insert access for owners" ON "public"."agents" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policy
        WHERE polname = 'Enable update access for owners'
        AND polrelid = 'public.agents'::regclass
    ) THEN
        CREATE POLICY "Enable update access for owners" ON "public"."agents" AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policy
        WHERE polname = 'Enable delete access for owners'
        AND polrelid = 'public.agents'::regclass
    ) THEN
        CREATE POLICY "Enable delete access for owners" ON "public"."agents" AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = owner_id);
    END IF;
END
$$;

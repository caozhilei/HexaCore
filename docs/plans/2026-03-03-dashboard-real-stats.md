# Dashboard Real Stats Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `/[locale]/dashboard` show real per-user counts from Supabase instead of hardcoded values.

**Architecture:** Convert the dashboard page to a Server Component, fetch the current user via the SSR Supabase client, and compute counts with a server-only Supabase service role client (filtered by `user.id`) to avoid RLS gaps.

**Tech Stack:** Next.js App Router, next-intl (server translations), Supabase (@supabase/ssr + @supabase/supabase-js).

---

### Task 1: Implement server-side dashboard stats

**Files:**
- Modify: `c:\Users\caozl\Documents\HexaCore\apps\web\src\app\[locale]\(dashboard)\dashboard\page.tsx`
- Reference: `c:\Users\caozl\Documents\HexaCore\apps\web\src\lib\supabase\server.ts`
- Reference: `c:\Users\caozl\Documents\HexaCore\apps\web\src\lib\supabase\admin.ts`

**Step 1: Establish current behavior (manual)**
- Open `http://localhost:3001/zh/dashboard`
- Expected (before): card values are `3`, `12`, `8`, `24%` (hardcoded)

**Step 2: Convert page to Server Component**
- Remove `useTranslations` usage from `next-intl` in this file
- Use `getTranslations` from `next-intl/server` instead
- Make `DashboardPage` `async`

**Step 3: Fetch current user**
- Use `createClient()` from `@/lib/supabase/server`
- Call `supabase.auth.getUser()` and require a non-null user (layout already redirects, but keep a defensive guard)

**Step 4: Compute counts (per-user where applicable)**
- Use `createAdminClient()` from `@/lib/supabase/admin` (server-only)
- Compute:
  - Agents count: `agents.owner_id = user.id`
  - Sessions count: `chat_sessions.agent_id IN (my agent ids)`
  - Skills count: `skills.enabled = true` (global)
  - Memories count: `memories.session_key IN (session_keys for my agents)`
- Replace the “System Load” card with “Memory” and show the computed memories count.

**Implementation notes:**
- Prefer `select('*', { count: 'exact', head: true })` for counts to reduce payload.
- For `IN (...)` queries, handle empty lists by returning `0` early.

**Step 5: Manual verification**
- Reload `http://localhost:3001/zh/dashboard`
- Expected:
  - Agents shows the actual number of rows in `public.agents` owned by the logged-in user
  - Channels shows the actual number of `public.chat_sessions` rows for those agents
  - Skills shows `public.skills` rows where `enabled=true`
  - Memory shows actual `public.memories` rows linked to those sessions

---

### Task 2: Add a simple verification script (no test runner in repo)

**Files:**
- Create: `c:\Users\caozl\Documents\HexaCore\scripts\verify-dashboard-stats.js`

**Step 1: Write a verification script**
- Script reads `.env.local` (repo root) for Supabase keys.
- Script signs in with `ADMIN_EMAIL/ADMIN_PASSWORD` (or CLI args) to get `user.id`.
- Script computes the same four numbers via service role with the same filtering rules.
- Script prints the computed numbers as the expected reference for the UI.

**Step 2: Run verification**
- Run: `node scripts/verify-dashboard-stats.js --email <email> --password <password>`
- Expected: prints a JSON object like:
  - `{ agents: N, sessions: M, skillsEnabled: K, memories: L }`

---

### Task 3: Environment requirements and guardrails

**Files:**
- Reference: `c:\Users\caozl\Documents\HexaCore\apps\web\.env.local`

**Step 1: Ensure required env vars exist for dashboard stats**
- `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY`

**Step 2: Add safe failure behavior**
- If env vars are missing, dashboard should still render but show `0` (or a clear “N/A”) for server-derived stats, without crashing the whole page.


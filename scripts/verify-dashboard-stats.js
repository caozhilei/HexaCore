const dotenv = require('dotenv')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return undefined
  return process.argv[idx + 1]
}

async function main() {
  const email = getArgValue('--email') || process.env.ADMIN_EMAIL
  const password = getArgValue('--password') || process.env.ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error('Missing --email/--password (or ADMIN_EMAIL/ADMIN_PASSWORD)')
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY')
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({ email, password })
  if (signInError) throw signInError
  const userId = signInData.user?.id
  if (!userId) throw new Error('No user id returned')

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: agents, error: agentsError } = await admin.from('agents').select('id').eq('owner_id', userId)
  if (agentsError) throw agentsError
  const agentIds = (agents || []).map((a) => a.id)

  let sessionsCount = 0
  let memoriesCount = 0

  if (agentIds.length > 0) {
    const { data: sessions, count: sessionsExact, error: sessionsError } = await admin
      .from('chat_sessions')
      .select('session_key', { count: 'exact' })
      .in('agent_id', agentIds)

    if (sessionsError) throw sessionsError
    sessionsCount = sessionsExact ?? 0

    const sessionKeys = (sessions || []).map((s) => s.session_key).filter(Boolean)
    if (sessionKeys.length > 0) {
      const { count: memoriesExact, error: memoriesError } = await admin
        .from('memories')
        .select('id', { count: 'exact', head: true })
        .in('session_key', sessionKeys)

      if (memoriesError) throw memoriesError
      memoriesCount = memoriesExact ?? 0
    }
  }

  const { count: enabledSkillsExact, error: skillsError } = await admin
    .from('skills')
    .select('id', { count: 'exact', head: true })
    .eq('enabled', true)
  if (skillsError) throw skillsError

  console.log(
    JSON.stringify(
      {
        userId,
        agents: agentIds.length,
        sessions: sessionsCount,
        skillsEnabled: enabledSkillsExact ?? 0,
        memories: memoriesCount,
      },
      null,
      2
    )
  )
}

main().catch((err) => {
  console.error('❌ verify-dashboard-stats failed:', err)
  process.exitCode = 1
})


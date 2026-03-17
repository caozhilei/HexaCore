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
  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) throw signInError
  const token = signInData.session?.access_token
  if (!token) throw new Error('No access token returned from signInWithPassword')

  const { data: agents, error: listError } = await supabase
    .from('agents')
    .select('id,name,description,config,updated_at')
    .order('created_at', { ascending: false })
    .limit(1)

  if (listError) throw listError
  if (!agents || agents.length === 0) throw new Error('No agents found')

  const agent = agents[0]

  const baseUrl = process.env.ADMIN_API_BASE_URL || 'http://localhost:3001'
  const url = `${baseUrl}/api/admin/agents/${agent.id}`

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `${agent.name} (admin-api verify)`,
      description: `admin-api verify ${new Date().toISOString()}`,
      config: {
        ...(agent.config || {}),
        model: agent.config?.model || 'qwen-turbo',
        system_prompt: agent.config?.system_prompt || 'Verification update via admin API.',
        skills: ['web-search'],
        temperature: typeof agent.config?.temperature === 'number' ? agent.config.temperature : 0.7,
      },
    }),
  })

  const payload = await res.json().catch(() => null)
  if (!res.ok) {
    console.error('Admin API error response:', payload)
    throw new Error(`Admin API failed: ${res.status}`)
  }

  console.log('✅ Admin API save succeeded:', {
    id: payload?.data?.id,
    name: payload?.data?.name,
    updated_at: payload?.data?.updated_at,
  })
}

main().catch((err) => {
  console.error('❌ Admin API save verification failed:', err)
  process.exitCode = 1
})


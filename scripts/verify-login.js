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

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error

  console.log('✅ Login ok:', {
    id: data.user?.id,
    email: data.user?.email,
    role: data.user?.app_metadata?.role,
    hasSession: Boolean(data.session),
  })
}

main().catch((err) => {
  console.error('❌ Login verification failed:', err)
  process.exitCode = 1
})


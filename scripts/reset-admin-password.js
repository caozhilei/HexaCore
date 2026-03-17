const crypto = require('crypto')
const path = require('path')
const dotenv = require('dotenv')
const { createClient } = require('@supabase/supabase-js')

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return undefined
  return process.argv[idx + 1]
}

async function main() {
  const email = getArgValue('--email') || process.env.ADMIN_EMAIL || 'caozhilei@gmail.com'
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY')
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: usersData, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 2000 })
  if (listError) throw listError

  const user = (usersData?.users || []).find((u) => u.email === email)
  if (!user) {
    throw new Error(`User not found: ${email}`)
  }

  const newPassword = crypto.randomBytes(18).toString('base64url')
  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    password: newPassword,
    email_confirm: true,
  })
  if (updateError) throw updateError

  console.log(JSON.stringify({ email, userId: user.id, newPassword }, null, 2))
}

main().catch((err) => {
  console.error('❌ reset-admin-password failed:', err?.message || err)
  process.exitCode = 1
})


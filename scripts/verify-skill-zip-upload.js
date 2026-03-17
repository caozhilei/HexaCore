const path = require('path')
const dotenv = require('dotenv')
const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')
const AdmZip = require('adm-zip')

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

function randString(bytes = 18) {
  return crypto.randomBytes(bytes).toString('base64url')
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY')
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const auth = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })

  const email = `zip-test-${Date.now()}@example.com`
  const password = randString(18)

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: 'super_admin' },
  })
  if (createError) throw createError
  const userId = created.user?.id
  if (!userId) throw new Error('Failed to create temp user')

  try {
    const { data: signInData, error: signInError } = await auth.auth.signInWithPassword({ email, password })
    if (signInError) throw signInError
    const token = signInData.session?.access_token
    if (!token) throw new Error('No access token')

    const skillName = `zip-upload-test-${Date.now()}`
    const zip = new AdmZip()
    const skillMd = `---\nname: ${skillName}\ndescription: Zip upload test skill\nversion: 1.0.0\ntools: []\noutput:\n  type: object\n---\n\n# ${skillName}\n`
    zip.addFile(`${skillName}/SKILL.md`, Buffer.from(skillMd, 'utf8'))
    zip.addFile(`${skillName}/index.ts`, Buffer.from('export default async () => ({ execute: async () => ({}) })', 'utf8'))
    const zipBuf = zip.toBuffer()

    const form = new FormData()
    form.append('file', new Blob([zipBuf], { type: 'application/zip' }), 'test-skill.zip')

    const uploadRes = await fetch('http://localhost:3001/api/admin/skills/packages/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    const uploadPayload = await uploadRes.json().catch(() => null)
    if (!uploadRes.ok) {
      throw new Error(uploadPayload?.message || `Upload failed (${uploadRes.status})`)
    }

    const enableRes = await fetch('http://localhost:3001/api/admin/skills/enable', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: skillName, enabled: true }),
    })
    const enablePayload = await enableRes.json().catch(() => null)
    if (!enableRes.ok) {
      throw new Error(enablePayload?.message || `Enable failed (${enableRes.status})`)
    }

    const publicRes = await fetch('http://localhost:3001/api/skills')
    const publicPayload = await publicRes.json().catch(() => null)
    if (!publicRes.ok) {
      throw new Error(publicPayload?.message || `Public skills failed (${publicRes.status})`)
    }

    const names = (publicPayload?.data || []).map((s) => s.name)
    if (!names.includes(skillName)) {
      throw new Error('Enabled skill not visible in /api/skills')
    }

    console.log('✅ verify-skill-zip-upload ok')
  } finally {
    await admin.auth.admin.deleteUser(userId).catch(() => null)
  }
}

main().catch((err) => {
  console.error('❌ verify-skill-zip-upload failed:', err?.message || err)
  process.exitCode = 1
})


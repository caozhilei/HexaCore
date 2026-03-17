const fs = require('fs')
const fsp = require('fs/promises')
const path = require('path')
const dotenv = require('dotenv')
const yaml = require('js-yaml')
const { createClient } = require('@supabase/supabase-js')

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

function parseFrontmatter(md) {
  const match = md.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/)
  if (!match) return { frontmatter: {}, body: md }
  const frontmatter = yaml.load(match[1]) || {}
  return { frontmatter, body: match[2] }
}

async function listSkillMdFiles(rootDir) {
  const result = []
  const entries = await fsp.readdir(rootDir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(rootDir, entry.name)
    if (entry.isDirectory()) {
      const nested = await listSkillMdFiles(full)
      result.push(...nested)
      continue
    }
    if (entry.isFile() && entry.name.toLowerCase() === 'skill.md') {
      result.push(full)
    }
  }
  return result
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY')
  }

  const baseDir = path.resolve(process.cwd(), 'src', 'core', 'skills', 'examples')
  if (!fs.existsSync(baseDir)) {
    throw new Error(`Skills examples directory not found: ${baseDir}`)
  }

  const files = await listSkillMdFiles(baseDir)
  if (files.length === 0) {
    console.log('No SKILL.md files found under:', baseDir)
    return
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const upserts = []
  for (const file of files) {
    const md = await fsp.readFile(file, 'utf8')
    const { frontmatter, body } = parseFrontmatter(md)
    const name = frontmatter?.name
    if (!name) {
      continue
    }
    upserts.push({
      name,
      description: frontmatter?.description || null,
      enabled: true,
      definition: {
        ...frontmatter,
        markdown: body,
        source: {
          kind: 'filesystem',
          skillMdPath: path.relative(process.cwd(), file).replaceAll('\\', '/'),
        },
      },
      updated_at: new Date().toISOString(),
    })
  }

  if (upserts.length === 0) {
    console.log('No valid skills found to upsert.')
    return
  }

  const { data, error } = await admin
    .from('skills')
    .upsert(upserts, { onConflict: 'name' })
    .select('id,name,enabled')

  if (error) throw error

  console.log(`✅ Upserted skills: ${data?.length || 0}`)
  for (const row of data || []) {
    console.log(`- ${row.name} (${row.enabled ? 'enabled' : 'disabled'})`)
  }
}

main().catch((err) => {
  console.error('❌ sync-example-skills-to-db failed:', err)
  process.exitCode = 1
})


import { NextResponse } from 'next/server'
import * as crypto from 'crypto'
import * as fs from 'fs/promises'
import * as path from 'path'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/app/api/admin/_auth'
import { discoverSkillDirectories, parseSkillMdContent, safeExtractZip, sha256Hex } from '@/lib/skills/zip'

export const runtime = 'nodejs'

const limits = {
  maxZipBytes: 10 * 1024 * 1024,
  maxEntries: 500,
  maxTotalUncompressedBytes: 50 * 1024 * 1024,
  maxSingleFileBytes: 10 * 1024 * 1024,
}

const uploadResponseSchema = z.object({
  packageId: z.string().uuid(),
  skills: z.array(z.object({ name: z.string(), enabled: z.boolean() })),
})

export async function POST(request: Request) {
  const auth = await requireSuperAdmin(request)
  if (auth.status !== 200) {
    return NextResponse.json({ message: auth.error }, { status: auth.status })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ message: 'Invalid multipart form data' }, { status: 400 })
  }

  const file = form.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ message: 'Missing file' }, { status: 400 })
  }
  if (file.size > limits.maxZipBytes) {
    return NextResponse.json({ message: `Zip too large (max ${limits.maxZipBytes})` }, { status: 400 })
  }

  const buf = Buffer.from(await file.arrayBuffer())
  const checksum = sha256Hex(buf)
  const packageId = crypto.randomUUID()

  const installPath = path.join('data', 'skill-packages', packageId)
  const installRoot = path.resolve(process.cwd(), installPath)

  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { error: insertPkgError } = await admin.from('skill_packages').insert({
    id: packageId,
    source_type: 'zip_upload',
    source_ref: file.name,
    checksum,
    storage_path: null,
    install_path: installPath.replaceAll('\\', '/'),
    status: 'installing',
    created_at: now,
    updated_at: now,
  })
  if (insertPkgError) {
    return NextResponse.json({ message: insertPkgError.message }, { status: 400 })
  }

  try {
    await fs.mkdir(installRoot, { recursive: true })
    await safeExtractZip(buf, installRoot, {
      maxEntries: limits.maxEntries,
      maxTotalUncompressedBytes: limits.maxTotalUncompressedBytes,
      maxSingleFileBytes: limits.maxSingleFileBytes,
    })

    const skillDirs = await discoverSkillDirectories(installRoot)
    if (skillDirs.length === 0) {
      throw new Error('No SKILL.md found in zip')
    }

    const upserts: any[] = []
    const responseSkills: Array<{ name: string; enabled: boolean }> = []

    for (const dir of skillDirs) {
      const skillMdPath = path.join(dir, 'SKILL.md')
      const md = await fs.readFile(skillMdPath, 'utf8')
      const fallbackName = path.basename(dir)
      const parsed = parseSkillMdContent(md, fallbackName)

      const skillName = parsed.name
      responseSkills.push({ name: skillName, enabled: false })

      upserts.push({
        name: skillName,
        description: parsed.description,
        enabled: false,
        definition: {
          name: skillName,
          description: parsed.description,
          version: parsed.version,
          source: {
            kind: 'zip_upload',
            package_id: packageId,
            install_path: installPath.replaceAll('\\', '/'),
            skill_dir: path.relative(installRoot, dir).replaceAll('\\', '/'),
            skill_md_path: path.relative(process.cwd(), skillMdPath).replaceAll('\\', '/'),
          },
          frontmatter_raw: parsed.frontmatterRaw,
          markdown: parsed.markdown,
        },
        updated_at: now,
      })
    }

    const { error: upsertError } = await admin.from('skills').upsert(upserts, { onConflict: 'name' })
    if (upsertError) throw upsertError

    const { error: updatePkgError } = await admin
      .from('skill_packages')
      .update({ status: 'installed', updated_at: now })
      .eq('id', packageId)
    if (updatePkgError) throw updatePkgError

    const payload = uploadResponseSchema.parse({ packageId, skills: responseSkills })
    return NextResponse.json(payload, { status: 200 })
  } catch (e: any) {
    await admin
      .from('skill_packages')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', packageId)

    return NextResponse.json({ message: e?.message || 'Failed to install zip' }, { status: 400 })
  }
}


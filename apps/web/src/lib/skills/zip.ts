import AdmZip from 'adm-zip'
import * as crypto from 'crypto'
import * as fs from 'fs/promises'
import * as path from 'path'

export type ZipExtractLimits = {
  maxEntries: number
  maxTotalUncompressedBytes: number
  maxSingleFileBytes: number
}

export type ZipExtractResult = {
  filesWritten: number
  totalUncompressedBytes: number
  rootDir: string
}

export function sha256Hex(buf: Buffer) {
  return crypto.createHash('sha256').update(buf).digest('hex')
}

function normalizeEntryName(entryName: string) {
  return entryName.replace(/\\/g, '/')
}

function isAbsoluteOrDrivePath(entryName: string) {
  if (entryName.startsWith('/')) return true
  if (/^[a-zA-Z]:\//.test(entryName)) return true
  if (entryName.startsWith('\\\\')) return true
  return false
}

function hasDotDotSegment(entryName: string) {
  const parts = entryName.split('/').filter(Boolean)
  return parts.includes('..')
}

function assertSafeTargetPath(rootDirResolved: string, targetPath: string) {
  const rel = path.relative(rootDirResolved, targetPath)
  if (!rel || rel === '.') return
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Unsafe zip entry path')
  }
}

export async function safeExtractZip(buffer: Buffer, destRoot: string, limits: ZipExtractLimits): Promise<ZipExtractResult> {
  const rootDirResolved = path.resolve(destRoot)
  await fs.mkdir(rootDirResolved, { recursive: true })

  const zip = new AdmZip(buffer)
  const entries = zip.getEntries()

  if (entries.length > limits.maxEntries) {
    throw new Error(`Too many files in zip (max ${limits.maxEntries})`)
  }

  let filesWritten = 0
  let totalUncompressedBytes = 0

  for (const entry of entries) {
    const entryName = normalizeEntryName(entry.entryName)

    if (!entryName) continue
    if (isAbsoluteOrDrivePath(entryName)) {
      throw new Error('Zip contains absolute path entry')
    }
    if (hasDotDotSegment(entryName)) {
      throw new Error('Zip contains path traversal entry')
    }

    const targetPath = path.resolve(rootDirResolved, entryName)
    assertSafeTargetPath(rootDirResolved, targetPath)

    if (entry.isDirectory) {
      await fs.mkdir(targetPath, { recursive: true })
      continue
    }

    const size = typeof entry.header?.size === 'number' ? entry.header.size : entry.getData().length
    if (size > limits.maxSingleFileBytes) {
      throw new Error(`Zip entry too large (max ${limits.maxSingleFileBytes})`)
    }
    totalUncompressedBytes += size
    if (totalUncompressedBytes > limits.maxTotalUncompressedBytes) {
      throw new Error(`Zip uncompressed size too large (max ${limits.maxTotalUncompressedBytes})`)
    }

    await fs.mkdir(path.dirname(targetPath), { recursive: true })
    await fs.writeFile(targetPath, entry.getData())
    filesWritten++
  }

  return { filesWritten, totalUncompressedBytes, rootDir: rootDirResolved }
}

export type ParsedSkillMd = {
  name: string
  description: string | null
  version: string | null
  frontmatterRaw: string | null
  markdown: string
}

function parseSimpleKeyValues(frontmatter: string) {
  const out: Record<string, string> = {}
  for (const line of frontmatter.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf(':')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

export function parseSkillMdContent(md: string, fallbackName: string): ParsedSkillMd {
  const match = md.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/)
  if (!match) {
    return { name: fallbackName, description: null, version: null, frontmatterRaw: null, markdown: md }
  }

  const frontmatterRaw = match[1]
  const markdown = match[2]
  const kv = parseSimpleKeyValues(frontmatterRaw)

  return {
    name: kv.name || fallbackName,
    description: kv.description || null,
    version: kv.version || null,
    frontmatterRaw,
    markdown,
  }
}

async function exists(filePath: string) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function findSkillMdDirs(rootDir: string, maxDepth: number) {
  const result: string[] = []
  async function walk(dir: string, depth: number) {
    const skillMd = path.join(dir, 'SKILL.md')
    if (await exists(skillMd)) {
      result.push(dir)
      return
    }
    if (depth >= maxDepth) return
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const e of entries) {
      if (e.isDirectory()) {
        await walk(path.join(dir, e.name), depth + 1)
      }
    }
  }
  await walk(rootDir, 0)
  return Array.from(new Set(result))
}

export async function discoverSkillDirectories(installRoot: string) {
  const rootSkillMd = path.join(installRoot, 'SKILL.md')
  if (await exists(rootSkillMd)) return [installRoot]

  const firstLevel: string[] = []
  const entries = await fs.readdir(installRoot, { withFileTypes: true })
  for (const e of entries) {
    if (!e.isDirectory()) continue
    const dir = path.join(installRoot, e.name)
    if (await exists(path.join(dir, 'SKILL.md'))) {
      firstLevel.push(dir)
    }
  }
  if (firstLevel.length > 0) return firstLevel

  return findSkillMdDirs(installRoot, 2)
}


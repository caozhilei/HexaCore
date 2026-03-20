
 'use client'

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Upload, Search, Puzzle, RefreshCw, AlertCircle } from 'lucide-react'

interface Skill {
  id: string
  name: string
  description: string | null
  enabled: boolean
  definition?: any
}

export default function SkillsPage() {
  const t = useTranslations('Dashboard');
  const common = useTranslations('Common');

  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [dragOver, setDragOver] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/skills', { credentials: 'include' })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(payload?.message || `Failed to load skills (${res.status})`)
      }
      setSkills(payload?.data || [])
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load skills')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const doUpload = async (file: File) => {
    if (!file.name.endsWith('.zip')) {
      toast.error('请上传 .zip 格式的技能包')
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/admin/skills/packages/upload', {
        method: 'POST',
        credentials: 'include',
        body: form,
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(payload?.message || `Upload failed (${res.status})`)
      }
      toast.success(`已导入 ${payload?.skills?.length || 0} 个技能（默认禁用）`)
      if (fileRef.current) fileRef.current.value = ''
      await load()
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const uploadZip = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) { toast.error('请选择 zip 文件'); return }
    await doUpload(file)
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) await doUpload(file)
  }

  const toggleEnabled = async (name: string, enabled: boolean) => {
    const prev = skills
    setSkills((s) => s.map((x) => (x.name === name ? { ...x, enabled } : x)))
    try {
      const res = await fetch('/api/admin/skills/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, enabled }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(payload?.message || `Failed to update skill (${res.status})`)
      }
      toast.success(enabled ? '技能已启用' : '技能已禁用')
    } catch (e: any) {
      setSkills(prev)
      toast.error(e?.message || 'Failed to update skill')
    }
  }

  const filteredSkills = skills.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const enabledCount = skills.filter((s) => s.enabled).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('skills')}</h2>
          <p className="text-muted-foreground">{t('skillsDesc')}</p>
        </div>
        <div className="flex items-center gap-2">
          {!loading && (
            <div className="flex gap-2 text-sm text-muted-foreground">
              <Badge variant="default">{enabledCount} 已启用</Badge>
              <Badge variant="secondary">{skills.length - enabledCount} 已禁用</Badge>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={load} disabled={loading} title="刷新">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Upload Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-semibold">上传技能包</CardTitle>
          </div>
          <CardDescription>
            上传兼容 OpenClaw 格式的 .zip 技能包，上传后默认禁用，启用后才可被智能体调用。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
              ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent/20'}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={uploadZip} />
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium">
              {uploading ? (
                <span className="text-primary animate-pulse">上传并安装中…</span>
              ) : (
                <>
                  拖拽 .zip 文件到这里，或
                  <span className="text-primary ml-1 underline underline-offset-2">点击选择文件</span>
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">仅支持 .zip 格式，兼容 OpenClaw 技能规范</p>
          </div>
          {uploading && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 animate-pulse" />
              正在解析并安装技能包，请稍候…
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索技能名称或描述..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Skills Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse h-[140px] bg-muted/50" />
          ))}
        </div>
      ) : filteredSkills.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 border border-dashed rounded-lg bg-muted/20">
          <Puzzle className="h-12 w-12 mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground font-medium">
            {searchQuery ? '未找到匹配的技能' : common('noData')}
          </p>
          {!searchQuery && (
            <p className="text-xs text-muted-foreground mt-1">上传技能包后，技能将显示在这里</p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSkills.map((skill) => (
            <Card
              key={skill.id}
              className={`transition-all hover:shadow-md ${skill.enabled ? 'ring-1 ring-primary/20' : ''}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1.5 rounded-md shrink-0 ${skill.enabled ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Puzzle className={`h-3.5 w-3.5 ${skill.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <CardTitle className="text-sm font-semibold truncate">{skill.name}</CardTitle>
                  </div>
                  <Switch
                    checked={skill.enabled}
                    onCheckedChange={(v) => toggleEnabled(skill.name, !!v)}
                    className="shrink-0"
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                  {skill.description || '暂无描述'}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <Badge variant={skill.enabled ? 'default' : 'secondary'} className="text-xs">
                    {skill.enabled ? common('enabled') : common('disabled')}
                  </Badge>
                  {skill.definition?.version && (
                    <span className="text-xs text-muted-foreground">v{skill.definition.version}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

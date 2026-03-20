'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, Link } from '@/i18n/routing'
import { useState, useEffect, use as usePromise, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ChevronLeft, Search, Upload, Brain, Puzzle, Plus, X } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useTranslations } from 'next-intl'

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

interface Skill {
  id: string
  name: string
  description: string | null
}

interface MemorySpace {
  id: string
  name: string
  type: string
  granted: boolean
}

export default function EditAgentPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>
}) {
  const resolvedParams =
    typeof (params as any)?.then === 'function'
      ? usePromise(params as Promise<{ id: string }>)
      : (params as { id: string })
  const { id } = resolvedParams
  const t = useTranslations('Dashboard')
  const common = useTranslations('Common')
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Skills state
  const [skillsLoading, setSkillsLoading] = useState(true)
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([])
  const [skillSearch, setSkillSearch] = useState('')
  const [uploadingSkill, setUploadingSkill] = useState(false)
  const skillFileRef = useRef<HTMLInputElement | null>(null)

  // Memory spaces state
  const [memoryLoading, setMemoryLoading] = useState(true)
  const [memorySpaces, setMemorySpaces] = useState<MemorySpace[]>([])
  const [newSpaceName, setNewSpaceName] = useState('')
  const [creatingSpace, setCreatingSpace] = useState(false)
  const [savingGrants, setSavingGrants] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    model: 'gpt-3.5-turbo',
    prompt: '',
    skills: [] as string[],
  })

  // Load agent
  useEffect(() => {
    async function loadAgent() {
      try {
        if (!isUuid(id)) throw new Error(`Invalid agent id: ${id}`)
        const { data, error } = await supabase
          .from('agents')
          .select('*')
          .eq('id', id)
          .single()
        if (error) throw error
        if (data) {
          setFormData({
            name: data.name,
            description: data.description || '',
            model: data.config?.model || 'gpt-3.5-turbo',
            prompt: data.config?.system_prompt || '',
            skills: data.config?.skills || [],
          })
        }
      } catch (error: any) {
        toast.error('Failed to load agent')
        router.push({ pathname: '/agents' })
      } finally {
        setLoading(false)
      }
    }
    loadAgent()
  }, [id, supabase, router])

  // Load skills
  const loadSkills = async () => {
    try {
      const res = await fetch('/api/skills', { credentials: 'include' })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.message || `Failed to load skills (${res.status})`)
      setAvailableSkills(payload?.data || [])
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load skills')
    } finally {
      setSkillsLoading(false)
    }
  }

  useEffect(() => { loadSkills() }, [])

  // Load memory spaces
  useEffect(() => {
    async function loadMemorySpaces() {
      try {
        const res = await fetch(`/api/admin/memories?agent_id=${id}`, { credentials: 'include' })
        const payload = await res.json().catch(() => null)
        if (!res.ok) throw new Error(payload?.message || `Failed to load memory spaces (${res.status})`)
        setMemorySpaces(payload?.data || [])
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load memory spaces')
      } finally {
        setMemoryLoading(false)
      }
    }
    if (isUuid(id)) loadMemorySpaces()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (!isUuid(id)) throw new Error(`Invalid agent id: ${id}`)
      const res = await fetch(`/api/admin/agents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          config: {
            model: formData.model,
            system_prompt: formData.prompt,
            skills: formData.skills,
            temperature: 0.7,
          },
        }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.message || `Failed to update agent (${res.status})`)

      // 同时保存记忆授权
      await saveMemoryGrants()
      toast.success('Agent updated successfully')
      router.push({ pathname: '/agents' })
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update agent')
    } finally {
      setSaving(false)
    }
  }

  const saveMemoryGrants = async () => {
    const grants = memorySpaces
      .filter((s) => s.granted)
      .map((s) => ({ space_id: s.id, permission: 'read' }))
    await fetch('/api/admin/memories/grants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ agent_id: id, grants }),
    })
  }

  const toggleSkill = (skillId: string) => {
    setFormData((prev) => {
      const skills = prev.skills.includes(skillId)
        ? prev.skills.filter((s) => s !== skillId)
        : [...prev.skills, skillId]
      return { ...prev, skills }
    })
  }

  const toggleMemorySpace = (spaceId: string) => {
    setMemorySpaces((prev) =>
      prev.map((s) => (s.id === spaceId ? { ...s, granted: !s.granted } : s))
    )
  }

  // Inline skill upload
  const uploadSkillZip = async () => {
    const file = skillFileRef.current?.files?.[0]
    if (!file) { toast.error('请选择 zip 文件'); return }
    setUploadingSkill(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/admin/skills/packages/upload', {
        method: 'POST',
        credentials: 'include',
        body: form,
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.message || `Upload failed (${res.status})`)
      toast.success(`已导入 ${payload?.skills?.length || 0} 个技能`)
      if (skillFileRef.current) skillFileRef.current.value = ''
      await loadSkills()
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed')
    } finally {
      setUploadingSkill(false)
    }
  }

  // Create new memory space
  const createMemorySpace = async () => {
    if (!newSpaceName.trim()) { toast.error('请输入空间名称'); return }
    setCreatingSpace(true)
    try {
      const res = await fetch('/api/admin/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newSpaceName.trim() }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.message || 'Failed to create space')
      const newSpace: MemorySpace = { id: payload.data.id, name: payload.data.name, type: 'shared', granted: true }
      setMemorySpaces((prev) => [newSpace, ...prev])
      setNewSpaceName('')
      toast.success('记忆空间已创建并自动授权')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create space')
    } finally {
      setCreatingSpace(false)
    }
  }

  const filteredSkills = availableSkills.filter(
    (s) =>
      s.name.toLowerCase().includes(skillSearch.toLowerCase()) ||
      (s.description || '').toLowerCase().includes(skillSearch.toLowerCase())
  )

  if (loading) {
    return <div className="p-8 text-center">{common('loading')}</div>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/agents">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{common('edit')} Agent</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
            <CardDescription>配置智能体名称、描述与模型参数</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{common('name')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Awesome Agent"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{common('description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What does this agent do?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select value={formData.model} onValueChange={(value) => setFormData({ ...formData, model: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="deepseek-coder">DeepSeek Coder</SelectItem>
                  <SelectItem value="qwen-turbo">Qwen Turbo</SelectItem>
                  <SelectItem value="qwen3.5-plus">Qwen 3.5 Plus</SelectItem>
                  <SelectItem value="qwen-max">Qwen Max</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt">System Prompt</Label>
              <Textarea
                id="prompt"
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                placeholder="You are a helpful assistant..."
                className="h-[180px] font-mono text-sm"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Puzzle className="h-5 w-5 text-primary" />
              <CardTitle>{t('skills')}</CardTitle>
            </div>
            <CardDescription>
              为智能体选择可调用的技能，或上传新技能包（.zip）
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search + Upload */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索技能..."
                  value={skillSearch}
                  onChange={(e) => setSkillSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="skill-zip-upload"
                  className="cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-md border border-input bg-background hover:bg-accent text-sm font-medium transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  上传技能包
                </label>
                <input
                  id="skill-zip-upload"
                  ref={skillFileRef}
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={uploadSkillZip}
                />
                {uploadingSkill && (
                  <span className="text-xs text-muted-foreground animate-pulse">上传中…</span>
                )}
              </div>
            </div>

            {/* Selected count badge */}
            {formData.skills.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">已选择：</span>
                {formData.skills.map((sid) => {
                  const skill = availableSkills.find((s) => s.id === sid)
                  return (
                    <Badge key={sid} variant="secondary" className="gap-1 pr-1">
                      {skill?.name || sid}
                      <button
                        type="button"
                        onClick={() => toggleSkill(sid)}
                        className="ml-0.5 rounded-full hover:bg-muted"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )
                })}
              </div>
            )}

            {/* Skill grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              {skillsLoading ? (
                <div className="text-sm text-muted-foreground col-span-2">{common('loading')}</div>
              ) : filteredSkills.length === 0 ? (
                <div className="text-sm text-muted-foreground col-span-2">
                  {skillSearch ? '未找到匹配技能' : common('noData')}
                </div>
              ) : (
                filteredSkills.map((skill) => {
                  const selected = formData.skills.includes(skill.id)
                  return (
                    <div
                      key={skill.id}
                      onClick={() => toggleSkill(skill.id)}
                      className={`flex flex-row items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors
                        ${selected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40 hover:bg-accent/30'
                        }`}
                    >
                      <Switch
                        checked={selected}
                        onCheckedChange={() => toggleSkill(skill.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-sm font-medium leading-none truncate">{skill.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {skill.description || '暂无描述'}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Memory Sharing */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle>记忆共享</CardTitle>
            </div>
            <CardDescription>
              选择此智能体可访问的共享记忆空间，实现多智能体知识共享
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Create new space */}
            <div className="flex gap-2">
              <Input
                placeholder="新建共享记忆空间名称..."
                value={newSpaceName}
                onChange={(e) => setNewSpaceName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), createMemorySpace())}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={createMemorySpace}
                disabled={creatingSpace || !newSpaceName.trim()}
                className="shrink-0"
              >
                <Plus className="h-4 w-4 mr-1" />
                创建
              </Button>
            </div>

            {/* Memory space list */}
            {memoryLoading ? (
              <div className="text-sm text-muted-foreground">{common('loading')}</div>
            ) : memorySpaces.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                <Brain className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>暂无共享记忆空间</p>
                <p className="text-xs mt-1">创建一个记忆空间，让多个智能体共享知识</p>
              </div>
            ) : (
              <div className="space-y-2">
                {memorySpaces.map((space) => (
                  <div
                    key={space.id}
                    onClick={() => toggleMemorySpace(space.id)}
                    className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors
                      ${space.granted
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40 hover:bg-accent/30'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Brain className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{space.name}</p>
                        <p className="text-xs text-muted-foreground">共享空间 · 读取权限</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {space.granted && (
                        <Badge variant="default" className="text-xs">已授权</Badge>
                      )}
                      <Switch
                        checked={space.granted}
                        onCheckedChange={() => toggleMemorySpace(space.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href="/agents">
            <Button type="button" variant="outline">
              {common('cancel')}
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? '保存中…' : common('save')}
          </Button>
        </div>
      </form>
    </div>
  )
}

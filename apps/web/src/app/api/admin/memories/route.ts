import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/app/api/admin/_auth'

export async function GET(request: Request) {
  const auth = await requireSuperAdmin(request)
  if (auth.status !== 200) {
    return NextResponse.json({ message: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agent_id')

  const admin = createAdminClient()

  // 查询所有 shared 类型的记忆空间
  const { data: spaces, error: spacesError } = await admin
    .from('memory_spaces')
    .select('id,name,type,owner_id,created_at,updated_at')
    .eq('type', 'shared')
    .order('created_at', { ascending: false })

  if (spacesError) {
    return NextResponse.json({ message: spacesError.message }, { status: 400 })
  }

  // 若传入 agent_id，同时查询该 agent 已被授权的 space_id 列表
  let grantedSpaceIds: string[] = []
  if (agentId) {
    const { data: grants, error: grantsError } = await admin
      .from('memory_space_grants')
      .select('space_id,permission')
      .eq('agent_id', agentId)

    if (grantsError) {
      return NextResponse.json({ message: grantsError.message }, { status: 400 })
    }
    grantedSpaceIds = (grants || []).map((g: any) => g.space_id)
  }

  const result = (spaces || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    owner_id: s.owner_id,
    created_at: s.created_at,
    updated_at: s.updated_at,
    granted: agentId ? grantedSpaceIds.includes(s.id) : false,
  }))

  return NextResponse.json({ data: result }, { status: 200 })
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin(request)
  if (auth.status !== 200) {
    return NextResponse.json({ message: auth.error }, { status: auth.status })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  }

  const { name } = body
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ message: 'name is required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('memory_spaces')
    .insert({ name, type: 'shared', owner_id: auth.user?.id ?? null })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 })
  }

  return NextResponse.json({ data }, { status: 201 })
}

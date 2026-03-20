import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/app/api/admin/_auth'

// PATCH /api/admin/memories/grants
// body: { agent_id, space_id, permission: 'read'|'write', action: 'grant'|'revoke' }
export async function PATCH(request: Request) {
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

  const { agent_id, space_id, permission = 'read', action } = body
  if (!agent_id || !space_id || !action) {
    return NextResponse.json({ message: 'agent_id, space_id, action are required' }, { status: 400 })
  }

  const admin = createAdminClient()

  if (action === 'revoke') {
    const { error } = await admin
      .from('memory_space_grants')
      .delete()
      .eq('agent_id', agent_id)
      .eq('space_id', space_id)

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }
    return NextResponse.json({ success: true }, { status: 200 })
  }

  // action === 'grant' — upsert
  const { error } = await admin
    .from('memory_space_grants')
    .upsert(
      { agent_id, space_id, permission },
      { onConflict: 'agent_id,space_id', ignoreDuplicates: false }
    )

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 })
  }
  return NextResponse.json({ success: true }, { status: 200 })
}

// POST — 批量更新某 agent 的所有记忆空间授权
// body: { agent_id, grants: Array<{ space_id, permission }> }
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

  const { agent_id, grants } = body
  if (!agent_id || !Array.isArray(grants)) {
    return NextResponse.json({ message: 'agent_id and grants[] are required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 删除该 agent 现有的所有 grants
  const { error: delError } = await admin
    .from('memory_space_grants')
    .delete()
    .eq('agent_id', agent_id)

  if (delError) {
    return NextResponse.json({ message: delError.message }, { status: 400 })
  }

  // 若有新的授权，批量插入
  if (grants.length > 0) {
    const rows = grants.map((g: any) => ({
      agent_id,
      space_id: g.space_id,
      permission: g.permission || 'read',
    }))

    const { error: insertError } = await admin
      .from('memory_space_grants')
      .insert(rows)

    if (insertError) {
      return NextResponse.json({ message: insertError.message }, { status: 400 })
    }
  }

  return NextResponse.json({ success: true }, { status: 200 })
}

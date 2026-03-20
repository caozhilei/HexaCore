import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/app/api/admin/_auth'

export async function GET(request: Request) {
  const auth = await requireSuperAdmin(request)
  if (auth.status !== 200) {
    return NextResponse.json({ message: auth.error }, { status: auth.status })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('skills')
    .select('id,name,description,enabled,definition,updated_at')
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 })
  }

  const normalized = (data || []).map((s: any) => ({
    id: s.name,
    name: s.name,
    description: s.description,
    enabled: !!s.enabled,
    definition: s.definition,
    updated_at: s.updated_at,
  }))

  return NextResponse.json({ data: normalized }, { status: 200 })
}


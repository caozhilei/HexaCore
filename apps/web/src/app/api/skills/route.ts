import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const admin = createAdminClient()
  const { data, error: listError } = await admin
    .from('skills')
    .select('id,name,description,enabled,updated_at')
    .eq('enabled', true)
    .order('name', { ascending: true })

  if (listError) {
    return NextResponse.json({ message: listError.message }, { status: 400 })
  }

  const normalized = (data || []).map((s) => ({
    id: s.name,
    name: s.name,
    description: s.description,
    enabled: s.enabled,
    updated_at: s.updated_at,
  }))

  return NextResponse.json({ data: normalized }, { status: 200 })
}

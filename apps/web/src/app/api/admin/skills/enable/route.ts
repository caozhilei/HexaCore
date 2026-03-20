import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/app/api/admin/_auth'

const bodySchema = z.object({
  name: z.string().min(1),
  enabled: z.boolean(),
})

export async function POST(request: Request) {
  const auth = await requireSuperAdmin(request)
  if (auth.status !== 200) {
    return NextResponse.json({ message: auth.error }, { status: auth.status })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid request body', issues: parsed.error.issues }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('skills')
    .update({ enabled: parsed.data.enabled, updated_at: new Date().toISOString() })
    .eq('name', parsed.data.name)
    .select('name,enabled')
    .single()

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 })
  }

  return NextResponse.json({ data: { name: data.name, enabled: !!data.enabled } }, { status: 200 })
}


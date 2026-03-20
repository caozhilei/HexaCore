import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

const updateAgentSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  config: z.any().optional(),
})

async function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice('bearer '.length).trim()
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !anonKey) {
      return { user: null, error: 'Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY' }
    }

    const supabase = createSupabaseClient(url, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, error } = await supabase.auth.getUser()
    if (error) return { user: null, error: error.message }
    return { user: data.user, error: null }
  }

  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error) return { user: null, error: error.message }
  return { user: data.user, error: null }
}

async function handleUpdate(request: Request, id: string) {
  if (!isUuid(id)) {
    return NextResponse.json({ message: 'Invalid agent id' }, { status: 400 })
  }

  const { user, error: authError } = await getUserFromRequest(request)
  if (authError) {
    return NextResponse.json({ message: authError }, { status: 401 })
  }
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const role = (user as any).app_metadata?.role
  if (role !== 'super_admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = updateAgentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid request body', issues: parsed.error.issues }, { status: 400 })
  }

  const patch = parsed.data
  const update: Record<string, any> = { updated_at: new Date().toISOString() }
  if (patch.name !== undefined) update.name = patch.name
  if (patch.description !== undefined) update.description = patch.description
  if (patch.config !== undefined) update.config = patch.config

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('agents')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      {
        message: error.message,
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint,
      },
      { status: 400 }
    )
  }

  return NextResponse.json({ data }, { status: 200 })
}

export async function POST(request: Request, context: { params: { id: string } }) {
  const params = await Promise.resolve(context.params as any)
  return handleUpdate(request, params.id)
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const params = await Promise.resolve(context.params as any)
  return handleUpdate(request, params.id)
}

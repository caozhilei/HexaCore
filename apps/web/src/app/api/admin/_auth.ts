import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function isBearerToken(authHeader: string | null) {
  return !!authHeader && authHeader.toLowerCase().startsWith('bearer ')
}

async function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (isBearerToken(authHeader)) {
    const token = authHeader!.slice('bearer '.length).trim()
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

export async function requireSuperAdmin(request: Request) {
  const { user, error } = await getUserFromRequest(request)
  if (error) return { user: null, error, status: 401 as const }
  if (!user) return { user: null, error: 'Unauthorized', status: 401 as const }

  const role = (user as any).app_metadata?.role
  if (role !== 'super_admin') {
    return { user: null, error: 'Forbidden', status: 403 as const }
  }

  return { user, error: null, status: 200 as const }
}


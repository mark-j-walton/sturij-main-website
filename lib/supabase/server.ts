// The server client: the same public names, the caller's session from the request cookies. Every write the
// site makes for a person is made as that person — RLS on sturij-web decides; no service key exists here.
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function sessionSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return null
  const store = await cookies()
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (all) => { try { all.forEach(({ name, value, options }) => store.set(name, value, options)) } catch { /* a server component render cannot set cookies; the route handlers can */ } },
    },
  })
}

/** Is the session's login an admin of the site? Read through RLS: site_admin shows a person their own row only. */
export async function sessionIsAdmin(): Promise<{ admin: boolean; email: string | null; reason?: string }> {
  const supabase = await sessionSupabase()
  if (!supabase) return { admin: false, email: null, reason: 'not configured' }
  const { data: userData } = await supabase.auth.getUser()
  const email = userData.user?.email ?? null
  if (!email) return { admin: false, email: null, reason: 'no session' }
  const { data, error } = await supabase.from('site_admin').select('email').limit(1)
  if (error) return { admin: false, email, reason: error.message }
  return { admin: (data?.length ?? 0) > 0, email }
}

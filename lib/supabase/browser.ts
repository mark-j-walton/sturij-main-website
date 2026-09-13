'use client'
// The browser client for the admin login and the slot writes: the project's public URL and publishable key
// only (never a secret), the session held in cookies so the server routes can read it (@supabase/ssr).
// The library arrives on demand — a dynamic import the first time a client is asked for — so a visitor who
// never opens the admin control never downloads it: statically imported it was the largest unused script on
// the phone (73 KB of a 96 KB chunk, Lighthouse on the live domain, 13 Sep 2026), and the phone's LCP is
// simulated against the script it has to load.
import type { SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null
let loading: Promise<SupabaseClient | null> | null = null

/** Whether the deployment carries the two public names the sign-in needs (inlined at build). */
export const CONFIGURED = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)

/**
 * Whether the auth library is worth loading at mount: a session cookie from @supabase/ssr (sb-<ref>-auth-token,
 * possibly chunked), a return from the sign-in email (a PKCE code in the query or tokens in the hash), or the
 * admin hash. A plain visit has none of these and loads nothing.
 */
export function sessionHint(cookie: string, hash: string, search: string): boolean {
  return /(^|;\s*)sb-[^=;]*-auth-token/.test(cookie) || /access_token=|refresh_token=|#admin\b/.test(hash) || /[?&]code=/.test(search)
}

/** The client, created on first use from the dynamically imported library; null when the names are absent. */
export function publicSupabase(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return Promise.resolve(null)
  if (client) return Promise.resolve(client)
  if (!loading) loading = import('@supabase/ssr').then(({ createBrowserClient }) => (client = createBrowserClient(url, key)))
  return loading
}

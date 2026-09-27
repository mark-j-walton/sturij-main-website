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

/**
 * The sign-in email's link returns with a PKCE code in the query (`?code=…`), which is what
 * `createBrowserClient` looks for. But the link asks to come back to `${location.origin}/#admin` — a URL
 * that already ends in a fragment — so a composition that simply appends the query lands the code INSIDE
 * the fragment: `/#admin?code=…`. There `location.search` is empty, so the library never exchanges the
 * code, and `location.hash` is `'#admin?code=…'` rather than `'#admin'`, so the panel does not even open:
 * the link appears to do nothing at all (Mark, 27 Sep 2026 — the reason a code is the reliable route until
 * the email template carries one).
 *
 * Given the three parts of such a URL this returns the rewritten `…?code=…#admin` for `replaceState`, or
 * null when there is nothing to move — the ordinary `/?code=…#admin`, or no code at all. Implicit-flow
 * tokens in the fragment (`#access_token=…`) are deliberately left alone: the library reads those from the
 * fragment itself, and moving them into the query would put a credential in a place that gets logged.
 */
export function normaliseAuthReturn(pathname: string, search: string, hash: string): string | null {
  const q = hash.indexOf('?')
  if (q < 0) return null
  const buried = hash.slice(q + 1)
  if (!/(^|&)code=/.test(buried)) return null
  const fragment = hash.slice(0, q)
  return `${pathname}${search ? `${search}&${buried}` : `?${buried}`}${fragment === '#' ? '' : fragment}`
}

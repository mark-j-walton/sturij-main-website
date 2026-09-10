'use client'
// The browser client for the admin login and the slot writes: the project's public URL and publishable key
// only (never a secret), the session held in cookies so the server routes can read it (@supabase/ssr).
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function publicSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return null
  if (!client) client = createBrowserClient(url, key)
  return client
}

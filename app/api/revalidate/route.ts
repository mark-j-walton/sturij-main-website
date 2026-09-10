import { revalidatePath, revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'
import { sessionIsAdmin } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/** POST /api/revalidate — after an admin's save, the page re-reads its slots for every visitor. Admins only, by the session and site_admin. */
export async function POST() {
  const who = await sessionIsAdmin()
  if (!who.email) return NextResponse.json({ ok: false, error: who.reason ?? 'sign in first' }, { status: 401 })
  if (!who.admin) return NextResponse.json({ ok: false, error: 'this login is not a site admin' }, { status: 403 })
  revalidateTag('slots', 'max')
  revalidatePath('/')
  return NextResponse.json({ ok: true, by: who.email, at: new Date().toISOString() })
}

/** GET /api/revalidate — who am I, for the admin panel. */
export async function GET() {
  const who = await sessionIsAdmin()
  return NextResponse.json({ ok: true, ...who })
}

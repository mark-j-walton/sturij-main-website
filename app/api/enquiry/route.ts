import { NextResponse } from 'next/server'
import { FALLBACK, postEnquiry, toFunctionPayload, validateEnquiry } from '@/lib/enquiry'

export const runtime = 'nodejs'

/** POST /api/enquiry — the page's form lands here and is forwarded to sturij-web's enquiry function. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const v = validateEnquiry(body)
  if (!v.ok) return NextResponse.json({ ok: false, error: v.error, fallback: FALLBACK }, { status: 400 })
  // The honeypot: a filled hidden field is a bot — answer as if accepted, write nothing, call nobody.
  if (v.value.website) return NextResponse.json({ ok: true, id: 'declined' })
  const payload = toFunctionPayload(v.value)
  if (!payload.page) payload.page = req.headers.get('referer') ?? ''
  const out = await postEnquiry(payload)
  if (!out.ok) return NextResponse.json({ ok: false, error: out.error, fallback: out.fallback }, { status: out.status })
  return NextResponse.json({ ok: true, id: out.id, notified: out.notified })
}

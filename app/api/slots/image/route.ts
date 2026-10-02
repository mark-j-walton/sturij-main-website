import { NextResponse } from 'next/server'
import { sessionIsAdmin } from '@/lib/supabase/server'
import { checkSlotUpload } from '@/lib/slot-upload'
import { assetsUrl, INGEST_TOKEN_NAME } from '@/lib/slot-store'

export const runtime = 'nodejs'

/**
 * POST /api/slots/image — an admin replaces an image slot. The file goes to sturij-assets (the one asset
 * store) through its write door, asset-ingest, with the ingest token this server holds by name
 * (ASSET_INGEST_TOKEN); the token never reaches the browser. Admins only, by the session and site_admin.
 * Form fields: slot, file, width, height. Answers { ok, slot, path, url } or { ok: false, stage, error }.
 */
export async function POST(req: Request) {
  const who = await sessionIsAdmin()
  if (!who.email) return NextResponse.json({ ok: false, stage: 'auth', error: who.reason ?? 'sign in first' }, { status: 401 })
  if (!who.admin) return NextResponse.json({ ok: false, stage: 'auth', error: 'this login is not a site admin' }, { status: 403 })
  const token = process.env[INGEST_TOKEN_NAME]
  if (!token) return NextResponse.json({ ok: false, stage: 'config', error: `${INGEST_TOKEN_NAME} has not reached this deployment` }, { status: 503 })

  let form: FormData
  try { form = await req.formData() } catch { return NextResponse.json({ ok: false, stage: 'request', error: 'the upload was not readable' }, { status: 400 }) }
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ ok: false, stage: 'request', error: 'no file was sent' }, { status: 400 })
  const verdict = checkSlotUpload({
    slot: form.get('slot'), name: file.name, type: file.type, bytes: new Uint8Array(await file.arrayBuffer()),
    width: form.get('width'), height: form.get('height'), now: Date.now(),
  })
  if (!verdict.ok) return NextResponse.json({ ok: false, stage: 'check', error: verdict.error }, { status: verdict.status })

  let res: Response
  try {
    res = await fetch(`${assetsUrl()}/functions/v1/asset-ingest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-ingest-token': token },
      body: JSON.stringify(verdict.body),
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    })
  } catch (e) {
    return NextResponse.json({ ok: false, stage: 'upload', error: `the asset store did not answer (${(e as Error).name})` }, { status: 502 })
  }
  const out = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; url?: string | null; path?: string } | null
  if (!res.ok || !out?.ok) {
    const error = out?.error ?? `asset-ingest answered ${res.status}`
    // asset-ingest stores the file, then writes the registry row; a refusal at the second step leaves the file stored
    return NextResponse.json({ ok: false, stage: /^registry write failed/.test(error) ? 'row' : 'upload', error }, { status: 502 })
  }
  return NextResponse.json({ ok: true, slot: verdict.body.meta.slot_id, path: verdict.body.path, url: out.url ?? null })
}

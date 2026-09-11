import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { generate, RateLimiter, validateRenderRequest } from '@/lib/render'

/** The remix base: one of the site's own images, read by the server from public/ or the site-images bucket, resized to 1024 and sent as JPEG. The client never sends image bytes for the base. */
async function loadBase(base: string | null | undefined): Promise<string | null> {
  if (!base) return null
  const bytes = base.startsWith('/')
    ? await readFile(join(process.cwd(), 'public', base))
    : Buffer.from(await (await fetch(base)).arrayBuffer())
  const out = await sharp(bytes).resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer()
  return out.toString('base64')
}

export const runtime = 'nodejs'
export const maxDuration = 60

const limiter = new RateLimiter(Number(process.env.RENDER_LIMIT_PER_VISITOR_HOUR) || 6, Number(process.env.RENDER_LIMIT_PER_DAY) || 60)
const VISITOR_COOKIE = 'sturij_v'

/** Same-origin only, as the estate's render route (C1): a public loop cannot spend the key. */
function originOk(req: Request): boolean {
  const host = req.headers.get('host') ?? ''
  const allowed = (process.env.RENDER_ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const origin = req.headers.get('origin') ?? ''
  if (origin && allowed.includes(origin)) return true
  const ref = origin || req.headers.get('referer') || ''
  try { return !!ref && new URL(ref).host === host } catch { return false }
}

function visitorKey(req: Request): { key: string; setCookie?: string } {
  const cookie = req.headers.get('cookie') ?? ''
  const m = new RegExp(`(?:^|;\\s*)${VISITOR_COOKIE}=([A-Za-z0-9_-]{8,64})`).exec(cookie)
  if (m) return { key: `v:${m[1]}` }
  const id = crypto.randomUUID().replace(/-/g, '')
  return { key: `v:${id}`, setCookie: `${VISITOR_COOKIE}=${id}; Path=/; Max-Age=31536000; SameSite=Lax; Secure; HttpOnly` }
}

/** POST /api/render — the Visualise flow. The visitor's swatch textures arrive as three small JPEGs; nothing is stored server-side. */
export async function POST(req: Request) {
  if (!originOk(req)) return NextResponse.json({ ok: false, code: 'E_FORBIDDEN', message: 'forbidden' }, { status: 403 })
  const body = await req.json().catch(() => null)
  const v = validateRenderRequest(body)
  if (!v.ok) return NextResponse.json(v, { status: 400 })
  const { key, setCookie } = visitorKey(req)
  const lim = limiter.check(key)
  const headers: Record<string, string> = setCookie ? { 'set-cookie': setCookie } : {}
  if (!lim.ok) return NextResponse.json(lim, { status: 429, headers })
  let baseImage: string | null = null
  try { baseImage = await loadBase(v.value.base) } catch { return NextResponse.json({ ok: false, code: 'E_BAD_REQUEST', message: 'The base image could not be read' }, { status: 400, headers }) }
  const out = await generate({ ...v.value, baseImage }, { get: (n) => process.env[n] })
  const status = out.ok ? 200 : out.code === 'E_NOT_CONFIGURED' ? 503 : out.code === 'E_RATE_LIMIT' ? 429 : 502
  console.log(JSON.stringify({ route: 'render', ok: out.ok, code: out.ok ? undefined : out.code, room: v.value.room, remix: !!baseImage, model: out.ok ? out.model : undefined }))
  return NextResponse.json(out, { status, headers })
}

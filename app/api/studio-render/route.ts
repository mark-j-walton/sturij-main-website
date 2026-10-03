import { NextResponse } from 'next/server'
import { RateLimiter } from '@/lib/render'
import { studioOriginOk, studioRender, validateStudioRender } from '@/lib/studio-render'

export const runtime = 'nodejs'
export const maxDuration = 60

const env = { get: (n: string) => process.env[n] }
// The Studio is behind the project's password, so this is a budget guard, not a visitor limit: one bucket.
const limiter = new RateLimiter(Number(process.env.STUDIO_RENDER_LIMIT_PER_HOUR) || 60, Number(process.env.STUDIO_RENDER_LIMIT_PER_DAY) || 300)

/** POST /api/studio-render — the visualiser's render contract, served same-origin for the Studio, Canvas and Chat (lib/studio-render.ts). */
export async function POST(req: Request) {
  if (!studioOriginOk(req, env)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const body = await req.json().catch(() => null)
  const v = validateStudioRender(body)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: v.status })
  const lim = limiter.check('studio')
  if (!lim.ok) return NextResponse.json({ error: lim.message }, { status: 429 })
  const out = await studioRender(v.value, env)
  const b = out.body
  console.log(JSON.stringify({
    route: 'studio-render', requestId: v.value.requestId, scenario: v.value.scenario, status: out.status,
    ok: 'outputs' in b ? b.outputs.map((o) => ({ model: o.model, ms: o.latencyMs })) : [],
    failed: 'failures' in b ? b.failures : 'error' in b ? [{ error: b.error }] : [],
  }))
  return NextResponse.json(b, { status: out.status })
}

import { NextResponse } from 'next/server'
import { bandTableMeta, computeBand } from '@/lib/band'

export const runtime = 'nodejs'

/** GET /api/band — the band table's reading: version, dates, checksum. No figures. */
export async function GET() {
  return NextResponse.json({ ok: true, ...bandTableMeta() })
}

/** POST /api/band — the band for a configuration, width, option and tier, computed from the table server-side. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ ok: false, code: 'E_BAD_REQUEST', message: 'The request was not readable' }, { status: 400 })
  const out = computeBand({
    configuration: String(body.configuration ?? ''),
    widthMm: Number(body.widthMm),
    tier: String(body.tier ?? 'standard'),
    option: typeof body.option === 'string' ? body.option : null,
    painted: body.painted === true,
  })
  if (!out.ok) return NextResponse.json(out, { status: 400 })
  // The client needs the band and its derivation, the tier line and the table's identity — not the formula.
  return NextResponse.json({
    ok: true,
    band: out.band,
    derivation: out.derivation,
    bays: out.bays,
    painted: out.painted,
    tier: { id: out.tier.id, name: out.tier.name, line: out.tier.line },
    option: out.option,
    configuration: { id: out.configuration.id, name: out.configuration.name },
    table: out.table,
  })
}

// The band: a from–to guide computed from the versioned band table and nothing else. A derived value
// is machine-filled and shown with its derivation (form-surface F13); it is never a single figure
// presented as a price. Runs server-side (/api/band) so no formula constant reaches the browser bundle.
import { createHash } from 'node:crypto'
import table from '@/data/band-table.json'

export interface Tier { id: string; name: string; line: string; mult: number }
export interface Option { id: string; name: string; desc: string }
export type Formula =
  | { type: 'bays'; base: number; perBay: number; bayMm: number; offsetMm: number; minBays: number; maxBays: number }
  | { type: 'linear'; base: number; perMm: number; pair?: boolean }
export interface Configuration {
  id: string; group: string; name: string; blurb: string; kind: 'run' | 'piece'
  minW: number; maxW: number; defW: number; defH?: number
  formula: Formula
  options?: Option[]
  drawing?: { drawers: number; units: number; heightMm: number; shelf?: boolean }
}
export interface BandTable {
  id: string; version: number; dated: string; reviewDate: string; status: string; source: string; currency: string; roundTo: number
  spread: { below: number; above: number; note: string }
  watermark: string; basis: string
  tiers: Tier[]
  finishUplift: { factor: number; appliesTo: string; scope: string }
  configurations: Configuration[]
}

export const BAND_TABLE = table as unknown as BandTable

export interface BandInput { configuration: string; widthMm: number; tier: string; option?: string | null; painted?: boolean }
export interface Band { from: number; to: number; currency: string }
export interface BandResult {
  ok: true
  band: Band
  configuration: Configuration
  tier: Tier
  option: Option | null
  bays: number | null
  painted: boolean
  /** The derivation, line by line, so a reader can reconcile the band (F13). */
  derivation: string[]
  table: { id: string; version: number; dated: string; reviewDate: string; watermark: string; basis: string }
}
export type BandRefusal = { ok: false; code: 'E_BAD_REQUEST'; message: string }

const roundTo = (v: number, step: number) => Math.round(v / step) * step
const gbp = (v: number) => `£${v.toLocaleString('en-GB')}`

export function bandTableMeta() {
  const { id, version, dated, reviewDate, status, watermark, basis, currency } = BAND_TABLE
  return { id, version, dated, reviewDate, status, watermark, basis, currency, sha256: bandTableSha256(), configurations: BAND_TABLE.configurations.length, tiers: BAND_TABLE.tiers.length }
}

export function bandTableSha256(): string {
  return createHash('sha256').update(JSON.stringify(table)).digest('hex')
}

export function baysFor(cfg: Configuration, widthMm: number): number | null {
  if (cfg.formula.type !== 'bays') return null
  const f = cfg.formula
  return Math.max(f.minBays, Math.min(f.maxBays, Math.round((widthMm - f.offsetMm) / f.bayMm)))
}

export function computeBand(input: BandInput, t: BandTable = BAND_TABLE): BandResult | BandRefusal {
  const configuration = t.configurations.find((c) => c.id === input.configuration)
  if (!configuration) return { ok: false, code: 'E_BAD_REQUEST', message: `configuration ${input.configuration} is not in the band table` }
  const tier = t.tiers.find((x) => x.id === input.tier)
  if (!tier) return { ok: false, code: 'E_BAD_REQUEST', message: `tier ${input.tier} is not in the band table` }
  const widthMm = Number(input.widthMm)
  if (!Number.isFinite(widthMm) || widthMm < configuration.minW || widthMm > configuration.maxW) {
    return { ok: false, code: 'E_BAD_REQUEST', message: `${configuration.name} runs from ${configuration.minW} to ${configuration.maxW} mm` }
  }
  let option: Option | null = null
  if (configuration.options?.length) {
    option = configuration.options.find((o) => o.id === input.option) ?? configuration.options[0]!
  }
  const painted = !!input.painted && configuration.kind === 'run'
  const derivation: string[] = []
  let figure: number
  let bays: number | null = null
  if (configuration.formula.type === 'bays') {
    const f = configuration.formula
    bays = baysFor(configuration, widthMm) as number
    figure = f.base + bays * f.perBay
    derivation.push(`${configuration.name}: ${widthMm} mm → ${bays} bays (one per ${f.bayMm} mm) → ${gbp(f.base)} + ${bays} × ${gbp(f.perBay)} = ${gbp(figure)}`)
    if (painted) { figure *= t.finishUplift.factor; derivation.push(`painted doors × ${t.finishUplift.factor} = ${gbp(Math.round(figure))}`) }
  } else {
    const f = configuration.formula
    figure = (f.base + f.perMm * widthMm) * (f.pair ? 2 : 1)
    derivation.push(`${configuration.name}: ${gbp(f.base)} + ${widthMm} mm × £${f.perMm}/mm${f.pair ? ' × 2 (a pair)' : ''} = ${gbp(Math.round(figure))}`)
  }
  if (tier.mult !== 1) { figure *= tier.mult; derivation.push(`${tier.name} × ${tier.mult} = ${gbp(Math.round(figure))}`) }
  const from = roundTo(figure * t.spread.below, t.roundTo)
  const to = roundTo(figure * t.spread.above, t.roundTo)
  derivation.push(`band × ${t.spread.below} to × ${t.spread.above}, rounded to £${t.roundTo}: ${gbp(from)} – ${gbp(to)}`)
  return {
    ok: true,
    band: { from, to, currency: t.currency },
    configuration, tier, option, bays, painted, derivation,
    table: { id: t.id, version: t.version, dated: t.dated, reviewDate: t.reviewDate, watermark: t.watermark, basis: t.basis },
  }
}

export const formatBand = (b: Band) => `${gbp(b.from)} – ${gbp(b.to)}`

/** The one line the enquiry carries: configuration, width, option, tier, the band, the table version. */
export function guideLine(r: BandResult): string {
  return `${r.configuration.name}${r.option ? ` (${r.option.name})` : ''} · ${r.bays ? `${r.bays} bays · ` : ''}${r.configuration.kind === 'run' ? 'wall ' : 'width '}${r.derivation[0]?.match(/(\d+) mm/)?.[1] ?? '?'} mm · ${r.tier.name} · guide ${formatBand(r.band)} (band table v${r.table.version})`
}

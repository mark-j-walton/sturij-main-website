// The calculator: the band equals the table for fixture inputs; each tier resolves to its stated materials
// and hardware; the enquiry carries the band; the artifact is declared and mounted on both pages; the
// browser-side data holds no formula.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BAND_TABLE, bandTableSha256, computeBand, formatBand } from '@/lib/band'
import { CALC_CONFIGURATIONS, CALC_TIERS } from '@/lib/calculator-data'
import { composeMessage, validateEnquiry } from '@/lib/enquiry'
import { POST as bandRoute, GET as bandMeta } from '@/app/api/band/route'
import { loadArtifacts } from '@/lib/platform/artifacts.mjs'
import home from '@/pages/home/layout.json'
import calc from '@/pages/calculator/layout.json'

const ok = (r: ReturnType<typeof computeBand>) => { if (!r.ok) throw new Error(r.message); return r }

describe('the band table and the band', () => {
  it('is versioned, dated, reviewed and checksummed', () => {
    expect(BAND_TABLE.version).toBe(0)
    expect(BAND_TABLE.reviewDate > BAND_TABLE.dated).toBe(true)
    expect(bandTableSha256()).toMatch(/^[0-9a-f]{64}$/)
    expect(bandTableSha256()).toBe(createHash('sha256').update(JSON.stringify(JSON.parse(readFileSync('data/band-table.json', 'utf8')))).digest('hex'))
  })
  it('fixture 1 — a tall boy at 600 mm, Standard: the SPA figure £512, banded ×0.92/×1.10 to £5', () => {
    const r = ok(computeBand({ configuration: 'tallboy', widthMm: 600, tier: 'standard' }))
    expect(r.band).toEqual({ from: 470, to: 565, currency: 'GBP' })
    expect(r.derivation[0]).toContain('£320 + 600 mm × £0.32/mm = £512')
  })
  it('fixture 2 — a bedside pair at 500 mm, Signature: (165 + 90) × 2 × 1.35 = £688.50', () => {
    const r = ok(computeBand({ configuration: 'bedside', widthMm: 500, tier: 'signature' }))
    expect(r.band).toEqual({ from: 635, to: 755, currency: 'GBP' })
    expect(r.derivation.some((d) => d.includes('× 2 (a pair)'))).toBe(true)
    expect(r.tier.line).toBe('Feelwood textured decors · Blum Tandem soft-close · brass or black hardware')
  })
  it('fixture 3 — a fitted run at 3200 mm, Everyday wardrobe, Standard: 6 bays → £3,500; painted doors × 1.15; Atelier × 1.9', () => {
    const r = ok(computeBand({ configuration: 'fitted-wardrobe', widthMm: 3200, tier: 'standard', option: 'classic' }))
    expect(r.bays).toBe(6)
    expect(r.band).toEqual({ from: 3220, to: 3850, currency: 'GBP' })
    const p = ok(computeBand({ configuration: 'fitted-wardrobe', widthMm: 3200, tier: 'standard', option: 'classic', painted: true }))
    expect(p.band).toEqual({ from: 3705, to: 4430, currency: 'GBP' })
    const a = ok(computeBand({ configuration: 'fitted-wardrobe', widthMm: 3200, tier: 'atelier', option: 'hishers' }))
    expect(a.band.from).toBe(Math.round((3500 * 1.9 * 0.92) / 5) * 5)
    expect(a.option?.name).toBe('His & Hers')
    expect(formatBand(a.band)).toMatch(/^£[\d,]+ – £[\d,]+$/)
  })
  it('refuses a width outside the configuration, an unknown tier and an unknown configuration', () => {
    expect(computeBand({ configuration: 'tallboy', widthMm: 200, tier: 'standard' })).toMatchObject({ ok: false, code: 'E_BAD_REQUEST' })
    expect(computeBand({ configuration: 'tallboy', widthMm: 600, tier: 'gold' })).toMatchObject({ ok: false })
    expect(computeBand({ configuration: 'sofa', widthMm: 600, tier: 'standard' })).toMatchObject({ ok: false })
  })
  it('each tier resolves to its stated materials and hardware, and the browser-side data carries no multiplier', () => {
    expect(CALC_TIERS.map((t) => [t.name, t.line])).toEqual([
      ['Standard', 'Egger matt boards · steel runners · 10-yr board guarantee'],
      ['Signature', 'Feelwood textured decors · Blum Tandem soft-close · brass or black hardware'],
      ['Atelier', 'Veneer & painted finishes · Häfele solid-metal fittings · hand-finished edges'],
    ])
    for (const t of CALC_TIERS) expect('mult' in t).toBe(false)
    for (const c of CALC_CONFIGURATIONS) expect('formula' in c).toBe(false)
    expect(CALC_CONFIGURATIONS.map((c) => c.id)).toEqual(['fitted-wardrobe', 'bedside', 'tallboy', 'bench', 'console'])
  })
  it('the route answers the band with its derivation and never the formula; GET is the table reading', async () => {
    const r = await bandRoute(new Request('http://x/api/band', { method: 'POST', body: JSON.stringify({ configuration: 'console', widthMm: 1100, tier: 'standard' }) }))
    const j = await r.json()
    expect(j.ok).toBe(true)
    expect(j.band).toEqual({ from: 490, to: 585, currency: 'GBP' })
    expect(JSON.stringify(j)).not.toMatch(/perMm|"mult"/)
    const m = await (await bandMeta()).json()
    expect(m).toMatchObject({ version: 0, reviewDate: '2026-12-10', configurations: 5, tiers: 3 })
    expect(m.sha256).toBe(bandTableSha256())
  })
})

describe('the enquiry carries the band', () => {
  it('a guide line travels in the message, marked a guide not a quote', () => {
    const v = validateEnquiry({ name: 'Sam', email: 'sam@example.com', guide: 'Tall boy · width 600 mm · Standard · guide £470 – £565 (band table v0)' })
    if (!v.ok) throw new Error(v.error)
    expect(composeMessage(v.value)).toContain('Guide from the calculator: Tall boy · width 600 mm · Standard · guide £470 – £565 (band table v0) — a guide, not a quote')
  })
})

describe('the artifact and its mounts', () => {
  it('calculator is a declared artifact taking configuration, tier and band, with no materials picker of its own', () => {
    const a = (loadArtifacts() as Array<{ id: string; contentTypes: string[]; disabled: Array<{ property: string }> }>).find((x) => x.id === 'calculator')!
    expect(a.contentTypes).toEqual(expect.arrayContaining(['configuration', 'tier', 'band']))
    expect(a.disabled.map((d) => d.property)).toContain('materials-picker')
  })
  it('is mounted as a home-page section before the enquiry band and on its own page', () => {
    const ids = home.regions.map((r) => r.id)
    expect(ids.indexOf('calculator')).toBe(ids.indexOf('enquire') - 1)
    expect(calc.slug).toBe('/calculator')
    expect(calc.regions.map((r) => r.artifact)).toEqual(['nav-bar', 'finish-configurator', 'calculator', 'enquiry-form', 'site-footer'])
    expect(readFileSync('app/calculator/page.tsx', 'utf8')).toContain('<Calculator ')
    expect(readFileSync('app/page.tsx', 'utf8')).toContain('<Calculator ')
  })
})

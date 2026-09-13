// The materials feed: the site reads one registry (sturij-assets) instead of a local list — the selection as
// data, the snapshot as data, no decor named in code, a decor without an image a labelled tile, the handle
// finishes held until a master exists, the fallback when the registry cannot be read.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FEED, GALLERIES, HANDLE_GALLERY_INDEX, isPainted, registryMisfits, tileByKey } from '@/lib/galleries'
// the build script is plain ESM, imported for its pure functions
import { familyOf, normalise, run } from '../scripts/materials-feed.mjs'

const feed = JSON.parse(readFileSync('public/materials.json', 'utf8'))
const range = JSON.parse(readFileSync('data/range.json', 'utf8'))
const rows = JSON.parse(readFileSync('data/registry/decor-boards.2026-09-13.json', 'utf8'))

const walk = (dir: string, out: string[] = []): string[] => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(e)) out.push(p)
  }
  return out
}

describe('the snapshot — public/materials.json', () => {
  it('carries its date, its source and its counts, and the site reads exactly it', () => {
    expect(feed.snapshot.at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(feed.snapshot.registry).toContain('uxdrokyxywwezorpvfsp')
    expect(FEED.snapshot.at).toBe(feed.snapshot.at)
    expect(feed.snapshot.decors).toBe(feed.decors.length)
    expect(feed.snapshot.held).toBe(feed.handles.filter((h: { held: boolean }) => h.held).length)
  })
  it('regenerates byte for byte from the registry read kept as data', () => {
    const again = normalise(rows, range, { at: rows.read_at, read: 'session (data/registry/decor-boards.2026-09-13.json)', read_by: rows.read_by })
    expect(JSON.stringify(again)).toBe(JSON.stringify(feed))
  })
  it('every decor is a registry row by id: the seven Egger codes, two uncoded rows placed by the selection with a misfit line', () => {
    const coded = feed.decors.filter((d: { code: string | null }) => d.code).map((d: { code: string }) => d.code).sort()
    expect(coded).toEqual(['F037', 'F579', 'F661', 'F662', 'H1316', 'H1388', 'U604'])
    for (const d of feed.decors) expect(d.id).toMatch(/^[0-9a-f-]{36}$/)
    const placed = feed.decors.filter((d: { family_from: string }) => d.family_from === 'placed')
    expect(placed.length).toBe(2)
    for (const d of placed) expect(d.misfit).toContain('placed in')
  })
  it('the family comes from the code grammar where a code exists — a rule on the supplier\'s data, not a name in code', () => {
    expect(familyOf({ code: 'H1316' }, null, range)).toEqual({ family: 'wood', from: 'code' })
    expect(familyOf({ code: 'F037' }, null, range)).toEqual({ family: 'material', from: 'code' })
    expect(familyOf({ code: 'U604' }, null, range)).toEqual({ family: 'colour', from: 'code' })
    expect(familyOf({ code: null }, { family: 'colour' }, range)).toEqual({ family: 'colour', from: 'placed' })
    expect(familyOf({ code: null }, null, range)).toEqual({ family: null, from: 'none' })
  })
  it('every swatch image the feed names is a file in the store, under the 800 KB master limit, with the registry\'s own dimensions', () => {
    for (const d of feed.decors) {
      expect(d.image, d.name).not.toBeNull()
      const file = `public${d.image.path}`
      expect(existsSync(file), file).toBe(true)
      expect(statSync(file).size).toBe(d.image.bytes)
      expect(statSync(file).size).toBeLessThanOrEqual(800 * 1024)
      expect(d.image.width).toBe(1800)
    }
  })
  it('the measured colour rides on every coded decor as OKLCH with its confidence — the basis for the colour tools to come', () => {
    for (const d of feed.decors.filter((x: { code: string | null }) => x.code)) {
      expect(d.colour.hex).toMatch(/^#[0-9A-F]{6}$/)
      expect(d.colour.oklch.l).toBeGreaterThan(0)
      expect(d.colour.confidence).toBeGreaterThan(0.7)
    }
  })
  it('the fifteen handle finishes are held — no master, no image, the label the rule names', () => {
    expect(feed.handles.length).toBe(15)
    for (const h of feed.handles) { expect(h.held).toBe(true); expect(h.image).toBeNull(); expect(h.misfit).toContain('sample at the visit') }
    expect(feed.rule.master_min_short_side_px).toBe(1500)
  })
  it('the misfit list names every gap for the registry: uncoded rows, unmeasured rows, decors not in the registry, a flat synthetic swatch, the held finishes', () => {
    const by: Record<string, number> = {}
    for (const m of feed.misfits) by[m.kind] = (by[m.kind] ?? 0) + 1
    expect(by).toEqual({ 'no-code': 2, 'no-measurement': 2, 'not-in-registry': 2, 'flat-swatch': 1, 'held-finish': 15 })
    expect(registryMisfits().length).toBe(feed.misfits.length)
  })
})

describe('the feed script — the guards and the fallback', () => {
  it('refuses a thin registry answer: a missing row, an unpublished row, an unplaced uncoded row, an empty tab', () => {
    const meta = { at: rows.read_at, read: 'test' }
    expect(() => normalise({ decors: rows.decors.slice(1) }, range, meta)).toThrow(/E_FEED_MISSING/)
    const unpub = { decors: rows.decors.map((d: { code: string | null }) => (d.code === 'H1316' ? { ...d, status: 'retired' } : d)) }
    expect(() => normalise(unpub, range, meta)).toThrow(/E_FEED_UNPUBLISHED/)
    const unplaced = { ...range, decors: range.decors.map((s: { material: string; code: string | null }) => (s.code === null ? { material: s.material, code: null } : s)) }
    expect(() => normalise(rows, unplaced, meta)).toThrow(/E_FEED_UNPLACED/)
    const noColours = { ...range, decors: range.decors.filter((s: { code: string | null; family?: string }) => s.code !== 'U604' && s.family !== 'colour') }
    expect(() => normalise(rows, noColours, meta)).toThrow(/E_FEED_EMPTY_TAB/)
  })
  it('without the vault name the previous snapshot stands and the build reports it; nothing is written', async () => {
    const r = await run({ env: {}, write: false })
    expect(r.mode).toBe('fallback')
    expect(r.reason).toContain('STURIJ_ASSETS_READ_KEY')
    expect(r.line).toContain('stands')
    expect(r.feed.snapshot.at).toBe(feed.snapshot.at)
  })
  it('a registry that answers nothing (a key with no read policy) is a fallback, never an empty feed', async () => {
    const r = await run({ env: { STURIJ_ASSETS_READ_KEY: 'x' }, write: false, fetchImpl: async () => { throw Object.assign(new Error('the registry answered with no rows'), { code: 'E_FEED_EMPTY' }) } })
    expect(r.mode).toBe('fallback')
    expect(r.reason).toContain('E_FEED_EMPTY')
  })
  it('a good read replaces the snapshot with the registry\'s date', async () => {
    const r = await run({ env: { STURIJ_ASSETS_READ_KEY: 'x' }, write: false, fetchImpl: async () => ({ ...rows, read_at: '2030-01-01T00:00:00.000Z' }) })
    expect(r.mode).toBe('rest')
    expect(r.feed.snapshot.at).toBe('2030-01-01T00:00:00.000Z')
    expect(r.feed.decors.length).toBe(9)
  })
})

describe('the galleries read the feed', () => {
  it('four tabs in the selection\'s order; the tiles are the feed\'s decors and the held finishes', () => {
    expect(GALLERIES.map((g) => [g.id, g.tiles.length])).toEqual([['woods', 3], ['materials', 4], ['colours', 2], ['handles', 15]])
    expect(HANDLE_GALLERY_INDEX).toBe(3)
    for (const t of GALLERIES[3]!.tiles) { expect(t.held).toBe(true); expect(t.src).toBeUndefined() }
    for (const g of GALLERIES.slice(0, 3)) for (const t of g.tiles) { expect(t.src).toMatch(/^\/showcase\/finishes\//); expect(t.family).toBe(g.id === 'woods' ? 'wood' : g.id === 'materials' ? 'material' : 'colour') }
    expect(tileByKey('woods:be0d5308-2f73-40c2-8c5e-92972d1262a4')?.code).toBe('H1316')
  })
  it('the calculator\'s painted uplift reads the family, never a gallery named in code', () => {
    const reed = GALLERIES[2]!.tiles.find((t) => t.code === 'U604')!
    const oak = GALLERIES[0]!.tiles.find((t) => t.code === 'H1316')!
    expect(isPainted(reed)).toBe(true)
    expect(isPainted(oak)).toBe(false)
    expect(isPainted(null)).toBe(false)
  })
  it('no decor and no finish is named in code — the names live in the registry snapshot and the selection', () => {
    const names: string[] = [...feed.decors.map((d: { name: string }) => d.name), ...feed.handles.map((h: { name: string }) => h.name)]
    const files = [...walk('components'), ...walk('lib'), ...walk('app')]
    const hits: string[] = []
    for (const f of files) {
      const src = readFileSync(f, 'utf8')
      for (const n of names) if (src.includes(n)) hits.push(`${f}: ${n}`)
    }
    expect(hits).toEqual([])
    expect(existsSync('data/galleries.json')).toBe(false)
  })
})

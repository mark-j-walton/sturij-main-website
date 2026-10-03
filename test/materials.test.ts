// The materials feed: the site reads one registry (sturij-assets) instead of a local list — the selection as
// data, the snapshot as data, no decor named in code, a decor without an image a labelled tile, the handle
// finishes held until a master exists, the fallback when the registry cannot be read.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FEED, GALLERIES, HANDLE_GALLERY_INDEX, isPainted, registryMisfits, tileByKey } from '@/lib/galleries'
// the build script is plain ESM, imported for its pure functions
import { familyOf, fetchShowcase, fromShowcase, normalise, parseOklch, run } from '../scripts/materials-feed.mjs'
// the finish renders: the rig, the prompt, the floor, the register row
import { masterRow, meetsFloor, promptFor, PROVIDERS } from '../scripts/render-finishes.mjs'

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
  it('regenerates byte for byte from the registry read kept as data and the masters register', () => {
    const masters = JSON.parse(readFileSync('data/finish-masters.json', 'utf8'))
    const again = normalise(rows, range, { at: rows.read_at, read: 'session (data/registry/decor-boards.2026-09-13.json)', read_by: rows.read_by }, masters)
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
  it('--rest without the vault name: the previous snapshot stands and the build reports it; nothing is written', async () => {
    const r = await run({ argv: ['--rest'], env: {}, write: false })
    expect(r.mode).toBe('fallback')
    expect(r.reason).toContain('STURIJ_ASSETS_READ_KEY')
    expect(r.line).toContain('stands')
    expect(r.feed.snapshot.at).toBe(feed.snapshot.at)
  })
  it('a registry that answers nothing (a key with no read policy) is a fallback, never an empty feed', async () => {
    const r = await run({ argv: ['--rest'], env: { STURIJ_ASSETS_READ_KEY: 'x' }, write: false, fetchImpl: async () => { throw Object.assign(new Error('the registry answered with no rows'), { code: 'E_FEED_EMPTY' }) } })
    expect(r.mode).toBe('fallback')
    expect(r.reason).toContain('E_FEED_EMPTY')
  })
  it('a good --rest read replaces the snapshot with the registry date', async () => {
    const r = await run({ argv: ['--rest'], env: { STURIJ_ASSETS_READ_KEY: 'x' }, write: false, fetchImpl: async () => ({ ...rows, read_at: '2030-01-01T00:00:00.000Z' }) })
    expect(r.mode).toBe('rest')
    expect(r.feed.snapshot.at).toBe('2030-01-01T00:00:00.000Z')
    expect(r.feed.decors.length).toBe(9)
  })
})

// The live read (2 Oct 2026): sturij-assets' public registry-showcase function — published rows, no key at all.
// A showcase answer built from the snapshot's own rows, in the function's shape (decor_code, colour, images[].url).
const CATALOG = 'https://uxdrokyxywwezorpvfsp.supabase.co/storage/v1/object/public/catalog/'
type SnapRow = { id: string; code: string | null; name: string; status: string; industry_refs?: { texture_code?: string }; image?: { path: string } | null; measurement?: { hex: string } | null }
const showcaseOf = (decors: SnapRow[]) => ({
  count: decors.length + 1, total: decors.length + 1, offset: 0,
  products: [
    ...decors.map((d) => ({
      id: d.id, name: d.name, decor_code: d.code ?? 'H9999', status: d.status, brand: null, category: 'decor-boards',
      colour: d.measurement ? { number: d.code, hex: d.measurement.hex, oklch: 'oklch(70.5% 0.072 65.8)', source: 'measured by Sturij' } : null,
      images: d.image ? [{ url: CATALOG + d.image.path, kind: 'swatch', variant: true }] : [],
      variants: d.industry_refs?.texture_code ? [{ sku: 'x', surface: d.industry_refs.texture_code }, { sku: 'y', surface: d.industry_refs.texture_code }] : [],
    })),
    // a decor the selection does not name is ignored
    { id: '00000000-0000-0000-0000-000000000000', name: 'Not selected', decor_code: 'H0000', status: 'published', images: [], variants: [], colour: null },
  ],
})

describe('the feed script — the live read through registry-showcase', () => {
  it('reads the showcase by the scope range.json declares, with no key and no authorisation header', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const fetchFn = async (url: string, init: RequestInit) => { calls.push({ url, init }); return new Response(JSON.stringify(showcaseOf(rows.decors)), { status: 200 }) }
    const got = await fetchShowcase({}, range, fetchFn as unknown as typeof fetch)
    expect(calls).toHaveLength(1)
    const u = new URL(calls[0]!.url)
    expect(u.origin).toBe('https://uxdrokyxywwezorpvfsp.supabase.co')
    expect(u.pathname).toBe('/functions/v1/registry-showcase')
    expect(u.searchParams.get('supplier_id')).toBe(range.registry.showcase.supplier_id)
    expect(u.searchParams.get('category')).toBe('decor-boards')
    const headers = new Headers(calls[0]!.init.headers)
    expect(headers.has('authorization')).toBe(false)
    expect(headers.has('apikey')).toBe(false)
    expect(got.decors).toHaveLength(9)
  })
  it('turns the showcase rows into the feed: the catalog URL kept whole, the texture code from the variants, the oklch parsed', async () => {
    const r = await run({ env: {}, write: false, fetchImpl: async (_env, rng) => fromShowcase(showcaseOf(rows.decors), rng, '2030-02-02T00:00:00.000Z') })
    expect(r.mode).toBe('showcase')
    expect(r.feed.snapshot.read).toContain('registry-showcase')
    expect(r.feed.snapshot.at).toBe('2030-02-02T00:00:00.000Z')
    expect(r.feed.decors).toHaveLength(9)
    const oak = r.feed.decors.find((d: { code: string }) => d.code === 'H1316')
    expect(oak.image.path).toBe(CATALOG + 'showcase/finishes/bookmatch-oak.webp')
    expect(oak.finish).toBe('ST17')
    expect(oak.supplier).toBe('Egger')
    expect(oak.colour.oklch).toEqual({ l: 0.705, c: 0.072, h: 65.8 })
    expect(JSON.stringify(r.feed)).not.toContain('Not selected')
  })
  it('a showcase that is down, answers an error, or lacks a selected row leaves the snapshot standing', async () => {
    const down = await run({ env: {}, write: false, fetchImpl: async () => { throw new TypeError('fetch failed') } })
    expect(down.mode).toBe('fallback')
    expect(down.feed.snapshot.at).toBe(feed.snapshot.at)
    const err = await run({ env: {}, write: false, fetchImpl: (env, rng) => fetchShowcase(env, rng, (async () => new Response('no', { status: 500 })) as unknown as typeof fetch) })
    expect(err.mode).toBe('fallback')
    expect(err.reason).toContain('E_FEED_HTTP')
    const thin = await run({ env: {}, write: false, fetchImpl: async (_env, rng) => fromShowcase(showcaseOf(rows.decors.slice(1)), rng, '2030-02-02T00:00:00.000Z') })
    expect(thin.mode).toBe('fallback')
    expect(thin.reason).toContain('E_FEED_MISSING')
    expect(() => fromShowcase({ products: [] }, range, 'x')).toThrow(/E_FEED_EMPTY/)
  })
  it('parses the registry oklch string and passes an object through', () => {
    expect(parseOklch('oklch(70.5% 0.072 65.8)')).toEqual({ l: 0.705, c: 0.072, h: 65.8 })
    expect(parseOklch('oklch(0.5 0.1 120)')).toEqual({ l: 0.5, c: 0.1, h: 120 })
    expect(parseOklch({ l: 0.1, c: 0.2, h: 3 })).toEqual({ l: 0.1, c: 0.2, h: 3 })
    expect(parseOklch(null)).toBeNull()
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

describe('the finish masters — system renders under the rig', () => {
  const rig = JSON.parse(readFileSync('data/finish-rig.json', 'utf8'))
  const meta = { at: rows.read_at, read: 'test' }
  const master = (finish: string, width: number, height: number) => ({ masters: [{ finish, name: finish, path: `/showcase/metals/${finish}.jpg`, width, height, bytes: 1000, sha256: 'ab'.repeat(32), kind: 'system', provider: 'gemini', model: 'm', prompt_sha256: 'x', rig_version: 1, rendered_at: '2026-09-14T00:00:00.000Z', rights: rig.rights, caveat: rig.caveat }] })
  it('a master at the floor shows the finish as a system render with the caveat; one under the floor keeps the tile held — never upscaled', () => {
    const shown = normalise(rows, range, meta, master('satin-brass', 2048, 2048))
    const sb = shown.handles.find((h: { id: string }) => h.id === 'satin-brass')
    expect(sb.held).toBe(false); expect(sb.system).toBe(true); expect(sb.caveat).toContain('Illustration only'); expect(sb.image.path).toBe('/showcase/metals/satin-brass.jpg')
    expect(shown.snapshot.held).toBe(14); expect(shown.snapshot.system).toBe(1)
    expect(shown.misfits.filter((m: { kind: string }) => m.kind === 'system-render').length).toBe(1)
    const small = normalise(rows, range, meta, master('satin-brass', 1024, 1024))
    const sb2 = small.handles.find((h: { id: string }) => h.id === 'satin-brass')
    expect(sb2.held).toBe(true); expect(sb2.image).toBeNull(); expect(sb2.misfit).toContain('under the floor')
  })
  it('the rig makes one family: every prompt carries the same handle, door, light and angle, the finish and its note differ, nothing else', () => {
    const finishes = range.handles.finishes
    const prompts = finishes.map((f: { id: string; name: string; note: string }) => promptFor(rig, f))
    expect(new Set(prompts).size).toBe(15)
    for (const [i, p] of prompts.entries()) {
      expect(p).toContain(finishes[i].name); expect(p).toContain(finishes[i].note)
      expect(p).toContain('slim D-shaped cabinet pull handle'); expect(p).toContain('flat matt charcoal slab door'); expect(p).toContain('soft north daylight'); expect(p).toContain('no text, no watermark')
    }
    expect(finishes.every((f: { note?: string }) => f.note && f.note.length > 20)).toBe(true)
  })
  it('the floor is the rule\'s: 1500 px on the short side; the register row carries provider, model, prompt hash, rig version, rights and caveat', () => {
    expect(rig.floor.short_side_px).toBe(1500)
    expect(meetsFloor({ width: 2048, height: 2048 }, rig).ok).toBe(true)
    expect(meetsFloor({ width: 1024, height: 1024 }, rig).ok).toBe(false)
    expect(meetsFloor({ width: 3000, height: 1499 }, rig).ok).toBe(false)
    const row = masterRow({ id: 'bronze', name: 'Bronze' }, 'public/showcase/metals/bronze.jpg', { width: 2048, height: 2048 }, 123, 'f'.repeat(64), { provider: 'gemini', model: 'gemini-3-pro-image-preview', prompt_sha256: 'p', at: '2026-09-14T00:00:00.000Z' }, rig)
    expect(row).toMatchObject({ finish: 'bronze', path: '/showcase/metals/bronze.jpg', kind: 'system', provider: 'gemini', rig_version: 1, caveat: rig.caveat })
    expect(row.rights.kind).toBe('system')
    expect(PROVIDERS).toEqual(['gemini'])
  })
})

// S1 — every asset resolves by id and the manifest tells the truth about the files; the legacy pages the
// Studio depends on are still served at their clean URLs; the slots seed from declared assets only.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { allAssets } from '@/lib/assets'
import { IMAGE_SLOTS, loadContent } from '@/lib/slots'
import { GALLERIES, ROOMS, registryMisfits } from '@/lib/galleries'
import { LEGACY_PAGES } from '@/next.config'

describe('the asset manifest', () => {
  it('measures every file as declared (width, height, bytes, sha256) and each id is unique', async () => {
    const seen = new Set<string>()
    for (const a of allAssets()) {
      expect(seen.has(a.id), a.id).toBe(false)
      seen.add(a.id)
      const file = `public${a.path}`
      expect(existsSync(file), file).toBe(true)
      const bytes = readFileSync(file)
      const meta = await sharp(bytes).metadata()
      expect({ w: meta.width, h: meta.height, bytes: bytes.length, sha: createHash('sha256').update(bytes).digest('hex') }).toEqual({ w: a.width, h: a.height, bytes: a.bytes, sha: a.sha256 })
    }
  })
  it('classifies every asset — proof photography carries the claim, generated never appears here', () => {
    for (const a of allAssets()) expect(['proof', 'swatch', 'metal', 'brand']).toContain(a.kind)
    expect(allAssets().filter((a) => a.kind === 'proof').length).toBe(5)
  })
  it('the masters the page seeds from are all under 800 KB on disk, but the page still serves renditions (next/image), never the master', () => {
    for (const id of Object.values(IMAGE_SLOTS)) expect(allAssets().find((a) => a.id === id)!.bytes).toBeLessThanOrEqual(800 * 1024)
  })
})

describe('the slots', () => {
  it('seed without the project names: every declared image slot resolves and the source is the seed', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    const c = await loadContent()
    expect(c.source).toBe('seed')
    for (const slot of Object.keys(IMAGE_SLOTS)) expect(c.images[slot]?.src).toMatch(/^\/showcase\//)
    expect(c.copy['hero.title']).toBe('Built to your walls.<br>Not to a range.')
  })
})

describe('the galleries — registry codes or misfits, never a guess', () => {
  it('holds the seven Egger codes sturij-assets carries and lists every tile without one', () => {
    const coded = GALLERIES.flatMap((g) => g.tiles).filter((t) => t.code).map((t) => t.code)
    expect(coded.sort()).toEqual(['F037', 'F579', 'F661', 'F662', 'H1316', 'H1388', 'U604'])
    const misfits = registryMisfits()
    expect(misfits.length).toBe(6 + 15)
    expect(misfits.every((m) => m.misfit.length > 10)).toBe(true)
  })
  it('the four rooms map to the four stacking cards', () => {
    expect(ROOMS.map((r) => r.card)).toEqual([0, 1, 2, 3])
  })
})

describe('the legacy pages the Studio and Canvas depend on', () => {
  it('each clean URL rewrites to a file that still exists under public/', () => {
    for (const p of LEGACY_PAGES) expect(existsSync(`public/${p}.html`), p).toBe(true)
    expect(existsSync('public/studio.js')).toBe(true)
    expect(existsSync('public/showcase/finishes/boards.json')).toBe(true)
  })
  it('vercel.json names the framework so the project builds as Next.js, and the old index is parked, not served', () => {
    expect(JSON.parse(readFileSync('vercel.json', 'utf8')).framework).toBe('nextjs')
    expect(existsSync('public/index.html')).toBe(false)
    expect(existsSync('legacy/index-2026-08-18.html')).toBe(true)
  })
})

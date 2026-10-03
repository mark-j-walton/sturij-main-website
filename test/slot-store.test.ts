// The image slots on sturij-assets (2 Oct 2026): the slot convention on its media registry, the read that
// lays each slot's newest image over the seed, the server's checks before asset-ingest, and the token that
// stays on the server.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { IMAGE_SLOTS, IMAGE_SLOT_CROPS, overlayImages, type ImageRef } from '@/lib/slots'
import { assetsReadConfig, currentSlots, ingestBody, INGEST_TOKEN_NAME, SLOT_READ_QUERY, slotPublicUrl, sniffImage, type SlotRow } from '@/lib/slot-store'
import { checkSlotUpload } from '@/lib/slot-upload'

const BASE = 'https://uxdrokyxywwezorpvfsp.supabase.co'
const row = (slot: string | null, created: string, path = `site/slots/${slot}/${created}.jpg`): SlotRow => ({ path, width: 1600, height: 900, alt: null, created_at: created, slot_id: slot })

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1])
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
const WEBP = new Uint8Array([...'RIFF'].map((c) => c.charCodeAt(0)).concat([0, 0, 0, 0], [...'WEBP'].map((c) => c.charCodeAt(0))))
const AVIF = new Uint8Array([0, 0, 0, 0x1c].concat([...'ftypavif'].map((c) => c.charCodeAt(0))))

describe('the slot read — sturij-assets media rows laid over the seed', () => {
  it('reads only active public rows tagged as site slots in public-media, newest first, with the slot id from meta', () => {
    expect(SLOT_READ_QUERY).toMatch(/^media\?select=/)
    expect(SLOT_READ_QUERY).toContain('slot_id:meta->>slot_id')
    expect(SLOT_READ_QUERY).toContain('bucket=eq.public-media')
    expect(SLOT_READ_QUERY).toContain('tags=cs.{site-slot}')
    expect(SLOT_READ_QUERY).toContain('status=eq.active')
    expect(SLOT_READ_QUERY).toContain('is_public=is.true')
    expect(SLOT_READ_QUERY).toContain('order=created_at.desc')
  })
  it('the read needs the publishable key by name and nothing else; without it the seed stands', () => {
    expect(assetsReadConfig({})).toBeNull()
    expect(assetsReadConfig({ STURIJ_ASSETS_ANON_KEY: 'k' })).toEqual({ url: BASE, key: 'k' })
    expect(assetsReadConfig({ STURIJ_ASSETS_ANON_KEY: 'k', STURIJ_ASSETS_URL: 'https://x.supabase.co/' })).toEqual({ url: 'https://x.supabase.co', key: 'k' })
  })
  it('the newest row is the slot’s image and the row count its version; rows without a slot or dimensions are skipped', () => {
    const cur = currentSlots([row('hero.image', '2026-10-01T00:00:00Z'), row('hero.image', '2026-10-02T00:00:00Z'), row(null, '2026-10-03T00:00:00Z'), { ...row('stack.1.image', '2026-10-02T00:00:00Z'), width: null }])
    expect(cur.get('hero.image')).toMatchObject({ path: 'site/slots/hero.image/2026-10-02T00:00:00Z.jpg', version: 2 })
    expect(cur.has('stack.1.image')).toBe(false)
    expect(cur.size).toBe(1)
  })
  it('overlays a declared slot with its public URL on sturij-assets, keeps the slot’s crop and the seed’s alt, and ignores an undeclared slot', () => {
    const seed: Record<string, ImageRef> = {
      'hero.image': { src: '/showcase/a.webp', width: 1, height: 1, alt: 'seed alt' },
      'stack.1.image': { src: '/showcase/b.webp', width: 1, height: 1, alt: 'b', crop: IMAGE_SLOT_CROPS['stack.1.image'] },
    }
    const out = overlayImages(seed, [row('hero.image', '2026-10-02T00:00:00Z'), row('stack.1.image', '2026-10-02T00:00:00Z'), row('not.a.slot', '2026-10-02T00:00:00Z')], BASE)
    expect(out['hero.image']).toEqual({ src: `${BASE}/storage/v1/object/public/public-media/site/slots/hero.image/2026-10-02T00:00:00Z.jpg`, width: 1600, height: 900, alt: 'seed alt', override: true, version: 1 })
    expect(out['stack.1.image']!.crop).toEqual(IMAGE_SLOT_CROPS['stack.1.image'])
    expect(out['not.a.slot']).toBeUndefined()
    expect(seed['hero.image']!.src).toBe('/showcase/a.webp')
    expect(slotPublicUrl(BASE + '/', '/site/slots/x/1.jpg')).toBe(`${BASE}/storage/v1/object/public/public-media/site/slots/x/1.jpg`)
  })
})

describe('the slot write — checked on the server, then asset-ingest', () => {
  const ok = { slot: 'hero.image', name: 'hero.jpg', type: 'image/jpeg', bytes: JPEG, width: '1600', height: '900', now: 1759400000000 }
  it('knows a file by its own first bytes', () => {
    expect(sniffImage(JPEG)).toBe('image/jpeg')
    expect(sniffImage(PNG)).toBe('image/png')
    expect(sniffImage(WEBP)).toBe('image/webp')
    expect(sniffImage(AVIF)).toBe('image/avif')
    expect(sniffImage(new TextEncoder().encode('<svg onload=alert(1)>'))).toBeNull()
  })
  it('builds the asset-ingest request: public-media, a new path per save, the slot named in tags and meta', () => {
    const v = checkSlotUpload(ok)
    if (!v.ok) throw new Error(v.error)
    expect(v.body).toMatchObject({
      bucket: 'public-media', path: 'site/slots/hero.image/1759400000000.jpg', contentType: 'image/jpeg', kind: 'image',
      width: 1600, height: 900, is_public: true, tags: ['site-slot', 'slot:hero.image', 'studio.sturij.com'],
      meta: { folder: 'site-slots', slot_id: 'hero.image', site: 'studio.sturij.com' },
    })
    expect(Buffer.from(v.body.contentBase64, 'base64')).toEqual(Buffer.from(JPEG))
    // every field asset-ingest requires (bucket, path, and contentBase64 or fetchUrl), and no secret in the body
    expect(v.body.bucket && v.body.path && v.body.contentBase64).toBeTruthy()
    expect(JSON.stringify(ingestBody({ slotId: 's', path: 'p', contentBase64: 'AA==', mime: 'image/png', width: 1, height: 1 }))).not.toMatch(/token/i)
  })
  it('refuses an undeclared slot, a file that is not what it says, the wrong type, an oversized or narrow image', () => {
    expect(checkSlotUpload({ ...ok, slot: 'nope' })).toMatchObject({ ok: false, status: 400 })
    expect(checkSlotUpload({ ...ok, slot: null })).toMatchObject({ ok: false })
    expect(checkSlotUpload({ ...ok, type: 'image/png' })).toMatchObject({ ok: false, error: expect.stringContaining('is not the image/png') })
    expect(checkSlotUpload({ ...ok, type: 'image/svg+xml' })).toMatchObject({ ok: false })
    expect(checkSlotUpload({ ...ok, bytes: new Uint8Array(801 * 1024).fill(0xff) })).toMatchObject({ ok: false, error: expect.stringContaining('KB') })
    expect(checkSlotUpload({ ...ok, width: '640' })).toMatchObject({ ok: false, error: expect.stringContaining('800 px') })
    expect(checkSlotUpload({ ...ok, width: 'x' })).toMatchObject({ ok: false })
    for (const slot of Object.keys(IMAGE_SLOTS)) expect(checkSlotUpload({ ...ok, slot }).ok).toBe(true)
  })
})

describe('the ingest token stays on the server; sturij-web holds no image', () => {
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e)
      if (statSync(p).isDirectory()) walk(p, out)
      else if (/\.(ts|tsx)$/.test(e)) out.push(p)
    }
    return out
  }
  it('only the server route reads the token, by name; no client component names it', () => {
    const readers = [...walk('app'), ...walk('components'), ...walk('lib')].filter((f) => readFileSync(f, 'utf8').includes('INGEST_TOKEN_NAME]'))
    expect(readers.map((f) => f.replace(/\\/g, '/'))).toEqual(['app/api/slots/image/route.ts'])
    for (const f of walk('components')) expect(readFileSync(f, 'utf8'), f).not.toMatch(/ASSET_INGEST_TOKEN|x-ingest-token|INGEST_TOKEN_NAME/)
    expect(INGEST_TOKEN_NAME).toBe('ASSET_INGEST_TOKEN')
  })
  it('nothing reads or writes sturij-web’s site_image_slots or site-images bucket any more', () => {
    for (const f of [...walk('app'), ...walk('components'), ...walk('lib')]) {
      const src = readFileSync(f, 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*\*)/.test(l)).join('\n')
      expect(src, f).not.toMatch(/site_image_slots|'site-images'|\/site-images\//)
    }
  })
})

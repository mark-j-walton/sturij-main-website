// The page's image slots live on sturij-assets (uxdrokyxywwezorpvfsp), the one asset store (Mark's ruling,
// 30 Sep 2026; the repoint, 2 Oct 2026). sturij-web's site_image_slots and site-images bucket are retired.
//
// sturij-assets has no slot table, and this repository does not invent one: a slot's image is an ordinary
// row in its `media` registry, written through its one write door (`asset-ingest`), and the slot is named by
// convention on that row —
//   bucket  public-media                          (public; media_public_read lets anon read is_public rows)
//   path    site/slots/<slot id>/<epoch ms>.<ext>  (a new path per save, so every save is a new row: versioned)
//   tags    ['site-slot', 'slot:<slot id>', 'studio.sturij.com']
//   meta    { folder: 'site-slots', slot_id, site: 'studio.sturij.com' }
// The slot's current image is its newest active row; its version is how many active rows the slot has. A
// first-class slot view on sturij-assets is proposed to its owner (the PR names the gap); until then this
// file is the whole of the convention, read and written in one place.
//
// The write goes through this site's server (/api/slots/image) — the ingest token is a server env name
// (ASSET_INGEST_TOKEN), never sent to the browser. The read is the registry's anon REST read of public rows,
// by the project's publishable key under a server env name (STURIJ_ASSETS_ANON_KEY).

export const ASSETS_DEFAULT_URL = 'https://uxdrokyxywwezorpvfsp.supabase.co'
export const ASSETS_URL_NAME = 'STURIJ_ASSETS_URL'
export const ASSETS_ANON_KEY_NAME = 'STURIJ_ASSETS_ANON_KEY'
export const INGEST_TOKEN_NAME = 'ASSET_INGEST_TOKEN'

export const SLOT_BUCKET = 'public-media'
export const SLOT_TAG = 'site-slot'
export const SLOT_FOLDER = 'site-slots'
export const SLOT_SITE = 'studio.sturij.com'
export const SLOT_SOURCE = 'sturij-main-website/admin'

type Env = Record<string, string | undefined>

export function assetsUrl(env: Env = process.env): string {
  return (env[ASSETS_URL_NAME] || ASSETS_DEFAULT_URL).replace(/\/$/, '')
}

/** The anon read of the slot rows, or null when the deployment does not carry the publishable key's name. */
export function assetsReadConfig(env: Env = process.env): { url: string; key: string } | null {
  const key = env[ASSETS_ANON_KEY_NAME]
  if (!key) return null
  return { url: assetsUrl(env), key }
}

export function slotPath(slotId: string, ext: string, now: number): string {
  return `site/slots/${slotId}/${now}.${ext}`
}

export function slotPublicUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/${SLOT_BUCKET}/${path.replace(/^\//, '')}`
}

/** The PostgREST read: every active public slot row, newest first. */
export const SLOT_READ_QUERY =
  `media?select=path,width,height,alt,created_at,slot_id:meta->>slot_id` +
  `&bucket=eq.${SLOT_BUCKET}&tags=cs.{${SLOT_TAG}}&status=eq.active&is_public=is.true&order=created_at.desc`

export interface SlotRow { path: string; width: number | null; height: number | null; alt: string | null; created_at: string; slot_id: string | null }
export interface SlotImage { path: string; width: number; height: number; alt: string | null; version: number }

/** The current image per slot (the newest row) and its version (the slot's row count). Rows without dimensions or a slot id are skipped. */
export function currentSlots(rows: SlotRow[]): Map<string, SlotImage> {
  const out = new Map<string, SlotImage>()
  const counts = new Map<string, number>()
  for (const r of rows) if (r.slot_id) counts.set(r.slot_id, (counts.get(r.slot_id) ?? 0) + 1)
  const sorted = [...rows].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
  for (const r of sorted) {
    if (!r.slot_id || out.has(r.slot_id) || !r.width || !r.height) continue
    out.set(r.slot_id, { path: r.path, width: r.width, height: r.height, alt: r.alt, version: counts.get(r.slot_id) ?? 1 })
  }
  return out
}

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' }
export const extOf = (mime: string): string | null => EXT[mime] ?? null

/** What the file's first bytes say it is — the server does not take the browser's word for the type. */
export function sniffImage(b: Uint8Array): string | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to))
  if (b.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp'
  if (b.length >= 12 && ascii(4, 8) === 'ftyp' && /^avi[fs]$/.test(ascii(8, 12))) return 'image/avif'
  return null
}

/** The asset-ingest request for one slot save (see sturij-assets supabase/functions/asset-ingest). */
export function ingestBody(o: { slotId: string; path: string; contentBase64: string; mime: string; width: number; height: number }) {
  return {
    bucket: SLOT_BUCKET,
    path: o.path,
    contentBase64: o.contentBase64,
    contentType: o.mime,
    kind: 'image',
    title: `Site image slot ${o.slotId}`,
    alt: null,
    width: o.width,
    height: o.height,
    tags: [SLOT_TAG, `slot:${o.slotId}`, SLOT_SITE],
    source: SLOT_SOURCE,
    is_public: true,
    cacheControl: 31536000,
    meta: { folder: SLOT_FOLDER, slot_id: o.slotId, site: SLOT_SITE },
  }
}

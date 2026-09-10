// The page's content slots: copy and images, seeded from the repository and overridden by the latest
// version in sturij-web's slot tables when the deployment carries the project's public names. A page holds
// no content; it reads its slots (page-platform S1/S5). Reads are cached and revalidated (ISR) — an admin
// save calls /api/revalidate so visitors see the new version on the next request.
import { cache } from 'react'
import seed from '@/content/copy.seed.json'
import { asset } from './assets'
import { sanitizeCopy } from './copy'

export interface ImageRef {
  src: string
  width: number
  height: number
  alt: string
  /** The manifest asset the slot resolves to, when it is not overridden. */
  asset?: string
  /** True when the value comes from site_image_slots rather than the seed. */
  override?: boolean
  version?: number
}

export interface SiteContent {
  copy: Record<string, string>
  images: Record<string, ImageRef>
  copyVersions: Record<string, number>
  source: 'seed' | 'seed+db'
}

/** Every image slot on the page and the asset it seeds from (the page's declaration; a test checks the components use exactly these). */
export const IMAGE_SLOTS: Record<string, string> = {
  'hero.image': 'photo.kitchen-bright',
  'panel.wardrobes.image': 'photo.wardrobe-cream-straight',
  'panel.media.image': 'photo.media-wall-led',
  'panel.finishes.image': 'photo.wardrobe-open-shelves',
  'feature.wardrobes.image': 'photo.wardrobe-cream-straight',
  'feature.media.image': 'photo.media-wall-led',
  'stack.1.image': 'photo.wardrobe-cream-straight',
  'stack.2.image': 'photo.media-wall-led',
  'stack.3.image': 'photo.kitchen-bright',
  'stack.4.image': 'photo.mudroom',
  'montage.image': 'photo.kitchen-bright',
}

export const COPY_SLOT_IDS: string[] = Object.keys(seed.slots)

export const SLOT_REVALIDATE_SECONDS = 60
export const SITE_IMAGES_BUCKET = 'site-images'

export function supabasePublicConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return null
  return { url, key }
}

export function bucketPublicUrl(url: string, path: string): string {
  return `${url.replace(/\/$/, '')}/storage/v1/object/public/${SITE_IMAGES_BUCKET}/${path.replace(/^\//, '')}`
}

function seedContent(): SiteContent {
  const copy: Record<string, string> = {}
  for (const [id, value] of Object.entries(seed.slots)) copy[id] = sanitizeCopy(value)
  const images: Record<string, ImageRef> = {}
  for (const [slot, assetId] of Object.entries(IMAGE_SLOTS)) {
    const a = asset(assetId)
    images[slot] = { src: a.path, width: a.width, height: a.height, alt: a.alt, asset: a.id }
  }
  return { copy, images, copyVersions: {}, source: 'seed' }
}

interface ContentRow { slot_id: string; text: string; version: number }
interface ImageRow { slot_id: string; asset_path: string; width: number; height: number; alt: string | null; version: number }

async function rest<T>(cfg: { url: string; key: string }, path: string): Promise<T[] | null> {
  try {
    const res = await fetch(`${cfg.url.replace(/\/$/, '')}/rest/v1/${path}`, {
      headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` },
      next: { revalidate: SLOT_REVALIDATE_SECONDS, tags: ['slots'] },
    })
    if (!res.ok) return null
    return (await res.json()) as T[]
  } catch {
    return null
  }
}

/** Seeds, then the latest version per slot from the tables when the names are present. Cached per request. */
export const loadContent = cache(async (): Promise<SiteContent> => {
  const content = seedContent()
  const cfg = supabasePublicConfig()
  if (!cfg) return content
  const [copyRows, imageRows] = await Promise.all([
    rest<ContentRow>(cfg, 'site_content_slots_current?select=slot_id,text,version'),
    rest<ImageRow>(cfg, 'site_image_slots_current?select=slot_id,asset_path,width,height,alt,version'),
  ])
  if (!copyRows && !imageRows) return content
  for (const row of copyRows ?? []) {
    if (!(row.slot_id in content.copy)) continue // a slot the page does not declare is ignored, never rendered
    content.copy[row.slot_id] = sanitizeCopy(row.text)
    content.copyVersions[row.slot_id] = row.version
  }
  for (const row of imageRows ?? []) {
    const seeded = content.images[row.slot_id]
    if (!seeded) continue
    content.images[row.slot_id] = { src: bucketPublicUrl(cfg.url, row.asset_path), width: row.width, height: row.height, alt: row.alt ?? seeded.alt, override: true, version: row.version }
  }
  content.source = 'seed+db'
  return content
})

export function copyOf(content: SiteContent, id: string): string {
  const value = content.copy[id]
  if (value === undefined) throw new Error(`A_UNDECLARED: copy slot ${id} is not seeded in content/copy.seed.json`)
  return value
}

export function imageOf(content: SiteContent, id: string): ImageRef {
  const value = content.images[id]
  if (!value) throw new Error(`A_UNDECLARED: image slot ${id} is not declared in IMAGE_SLOTS`)
  return value
}

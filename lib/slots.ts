// The page's content slots: copy and images, seeded from the repository and overridden by the latest
// version on record — the copy in sturij-web's site_content_slots when the deployment carries that project's
// public names; the images on sturij-assets, the one asset store (lib/slot-store.ts, 2 Oct 2026), when the
// deployment carries STURIJ_ASSETS_ANON_KEY. A page holds
// no content; it reads its slots (page-platform S1/S5). Reads are cached and revalidated (ISR) — an admin
// save calls /api/revalidate so visitors see the new version on the next request.
//
// The seed has two sources: content/copy.seed.json (the home page, the calculator, the footer, the
// accessibility statement) and content/sections/*.json (the content sections from the copy family — every
// line a slot, every [P] claim a closing slot, lib/sections.ts). Both land in the same map; the slot tables
// override either.
import { cache } from 'react'
import seed from '@/content/copy.seed.json'
import { asset } from './assets'
import { allBlogSlots } from './blog'
import { sanitizeCopy } from './copy'
import { allSectionSlots } from './sections'
import { assetsReadConfig, currentSlots, slotPublicUrl, SLOT_READ_QUERY, type SlotRow } from './slot-store'

export interface ImageRef {
  src: string
  width: number
  height: number
  alt: string
  /** The manifest asset the slot resolves to, when it is not overridden. */
  asset?: string
  /** True when the value comes from the slot's image on sturij-assets rather than the seed. */
  override?: boolean
  version?: number
  /** The slot's declared crop (IMAGE_SLOT_CROPS), when it has one. */
  crop?: SlotCrop
}

export interface SiteContent {
  copy: Record<string, string>
  images: Record<string, ImageRef>
  copyVersions: Record<string, number>
  source: 'seed' | 'seed+db'
}

/** Every image slot on the page and the asset it seeds from (the page's declaration; a test checks the components use exactly these). */
export const IMAGE_SLOTS: Record<string, string> = {
  'hero.image': 'render.kitchen-sage-island',
  'panel.wardrobes.image': 'render.bedroom-dark-marble-wardrobe',
  'panel.media.image': 'render.media-wall-walnut',
  'panel.finishes.image': 'render.office-green-walnut',
  'feature.wardrobes.image': 'photo.wardrobe-cream-straight',
  'feature.media.image': 'render.living-room-linen-media-wall',
  'stack.1.image': 'photo.walkin',
  'stack.2.image': 'photo.media-wall-led',
  'stack.3.image': 'photo.kitchen-bright',
  'stack.4.image': 'render.utility-navy-shaker',
  'montage.image': 'partner.handles',
  'montage.image-2': 'partner.boards',
  'montage.image-3': 'partner.hardware',
}

/** A crop per slot, as data: the smaller frames (the feature images, the four cards) crop in so a whole-room image does not read small. Applied to whatever image the slot holds, an upload included. */
export interface SlotCrop { zoom: number; x: string; y: string }
export const IMAGE_SLOT_CROPS: Record<string, SlotCrop> = {
  'feature.wardrobes.image': { zoom: 1.15, x: '50%', y: '45%' },
  'feature.media.image': { zoom: 1.12, x: '50%', y: '55%' },
  'stack.1.image': { zoom: 1.18, x: '50%', y: '55%' },
  'stack.2.image': { zoom: 1.18, x: '50%', y: '50%' },
  'stack.3.image': { zoom: 1.18, x: '50%', y: '55%' },
  'stack.4.image': { zoom: 1.2, x: '50%', y: '58%' },
}

/** The whole seed: the seed file's slots and every section's slots (lines, questions, extras, claim slots). */
export const SEED_SLOTS: Record<string, string> = (() => {
  const merged: Record<string, string> = { ...(seed.slots as Record<string, string>) }
  for (const [k, v] of Object.entries(allSectionSlots())) {
    if (k in merged) throw new Error(`A_UNDECLARED: slot ${k} is seeded by both copy.seed.json and a section`)
    merged[k] = v
  }
  for (const [k, v] of Object.entries(allBlogSlots())) {
    if (k in merged) throw new Error(`A_UNDECLARED: slot ${k} is seeded by both copy.seed.json/a section and a blog post`)
    merged[k] = v
  }
  return merged
})()

/** The copy slots a page can read (everything seeded except the claim-closing slots, which are controls). */
export const COPY_SLOT_IDS: string[] = Object.keys(SEED_SLOTS).filter((k) => !k.startsWith('claim.'))
/** The claim-closing slots: empty until Mark closes a register row with a line in the slot table. */
export const CLAIM_SLOT_IDS: string[] = Object.keys(SEED_SLOTS).filter((k) => k.startsWith('claim.'))

export const SLOT_REVALIDATE_SECONDS = 60

/** sturij-web's public names: the sign-in and the copy slots (site_content_slots). Not the images — those are on sturij-assets. */
export function supabasePublicConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return null
  return { url, key }
}

function seedContent(): SiteContent {
  const copy: Record<string, string> = {}
  for (const [id, value] of Object.entries(SEED_SLOTS)) copy[id] = sanitizeCopy(value)
  const images: Record<string, ImageRef> = {}
  for (const [slot, assetId] of Object.entries(IMAGE_SLOTS)) {
    const a = asset(assetId)
    images[slot] = { src: a.path, width: a.width, height: a.height, alt: a.alt, asset: a.id, ...(IMAGE_SLOT_CROPS[slot] ? { crop: IMAGE_SLOT_CROPS[slot] } : {}) }
  }
  return { copy, images, copyVersions: {}, source: 'seed' }
}

interface ContentRow { slot_id: string; text: string; version: number }

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

/** The seeded images with each slot's current image on sturij-assets laid over them (a slot the page does not declare is ignored). Pure. */
export function overlayImages(images: Record<string, ImageRef>, rows: SlotRow[], assetsBase: string): Record<string, ImageRef> {
  const out = { ...images }
  for (const [slotId, img] of currentSlots(rows)) {
    const seeded = out[slotId]
    if (!seeded) continue
    out[slotId] = { src: slotPublicUrl(assetsBase, img.path), width: img.width, height: img.height, alt: img.alt ?? seeded.alt, override: true, version: img.version, ...(seeded.crop ? { crop: seeded.crop } : {}) }
  }
  return out
}

/** Seeds, then the latest version per slot from the stores whose names are present. Cached per request. */
export const loadContent = cache(async (): Promise<SiteContent> => {
  const content = seedContent()
  const cfg = supabasePublicConfig()
  const assets = assetsReadConfig()
  if (!cfg && !assets) return content
  const [copyRows, imageRows] = await Promise.all([
    cfg ? rest<ContentRow>(cfg, 'site_content_slots_current?select=slot_id,text,version') : Promise.resolve(null),
    assets ? rest<SlotRow>(assets, SLOT_READ_QUERY) : Promise.resolve(null),
  ])
  if (!copyRows && !imageRows) return content
  for (const row of copyRows ?? []) {
    if (!(row.slot_id in content.copy)) continue // a slot the page does not declare is ignored, never rendered
    content.copy[row.slot_id] = sanitizeCopy(row.text)
    content.copyVersions[row.slot_id] = row.version
  }
  if (assets && imageRows) content.images = overlayImages(content.images, imageRows, assets.url)
  content.source = 'seed+db'
  return content
})

export function copyOf(content: SiteContent, id: string): string {
  const value = content.copy[id]
  if (value === undefined) throw new Error(`A_UNDECLARED: copy slot ${id} is not seeded (content/copy.seed.json or content/sections/*.json)`)
  return value
}

export function imageOf(content: SiteContent, id: string): ImageRef {
  const value = content.images[id]
  if (!value) throw new Error(`A_UNDECLARED: image slot ${id} is not declared in IMAGE_SLOTS`)
  return value
}

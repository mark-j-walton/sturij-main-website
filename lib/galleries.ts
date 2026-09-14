// The configurator's content — the range's decors, the handle finishes and the room finish tiles. The decors
// and the finishes come from ONE registry, sturij-assets, through the snapshot scripts/materials-feed.mjs
// emits at build (public/materials.json) from the page's selection (data/range.json — registry ids and the
// placing rule; no decor is named here or anywhere in code). A decor with a swatch image shows it; one with
// a measured colour and no image shows the colour, labelled; a handle finish with no master in the library
// is HELD — a labelled tile, "sample at the visit" (the finish rule, addendum 1 of the materials-feed brief),
// never a small file scaled up. Room finishes stay the prototype's colour data (data/rooms.json) until the
// registry names paints.
import feed from '@/public/materials.json'
import roomsData from '@/data/rooms.json'
import { asset } from './assets'

export type TileKind = 'material' | 'handle' | 'room'
export type Family = 'wood' | 'material' | 'colour'

export interface Tile {
  id: string
  name: string
  kind: TileKind
  /** The image the tile shows — the registry's swatch by id, a path in the store; absent for a colour or a held tile. */
  src?: string
  alt?: string
  /** The image's intrinsic size as the registry measured it — renditions are derived from it. */
  width?: number
  height?: number
  /** Two colour stops for a tile with no image: the measured colour (flat), or the prototype's room colour data. */
  gradient?: [string, string]
  /** The registry's measured colour (hex), where the vision pass has run. */
  colour?: string
  supplier?: string | null
  code?: string | null
  /** The decor's family, from the registry's code grammar or the selection's placing. */
  family?: Family
  /** The supplier's texture code (Egger ST…) where the registry carries one. */
  finish?: string | null
  /** The measured texture (woodgrain, stone, plain…) where the registry carries one. */
  texture?: string | null
  /** A held finish: no master in the library yet — a labelled tile, never an upscaled file. */
  held?: boolean
  /** A system render of the finish (the render path, under the rig), not the maker's photograph — shown with its caveat. */
  system?: boolean
  caveat?: string
  misfit?: string
}

export interface Gallery { id: string; label: string; kind: 'material' | 'handle'; tiles: Tile[] }
export interface Room { id: string; label: string; card: number; imageSlot: string }
export type RoomCategory = 'ceiling' | 'walls' | 'skirting' | 'flooring'
export const ROOM_CATEGORIES: RoomCategory[] = ['ceiling', 'walls', 'skirting', 'flooring']

interface FeedImage { id: string; path: string; width: number | null; height: number | null; bytes: number | null }
interface FeedDecor { id: string; code: string | null; name: string; supplier: string | null; family: Family; family_from: string; tab: string; finish: string | null; texture: string | null; colour: { hex: string } | null; image: FeedImage | null; misfit: string | null }
interface FeedHandle { id: string; name: string; supplier: string | null; image: FeedImage | null; held: boolean; system?: boolean; caveat?: string | null; misfit: string | null }
interface FeedTab { id: string; label: string; kind: 'material' | 'handle'; family: Family | null }
export interface FeedMisfit { kind: string; name?: string; material?: string; note: string }
interface Feed {
  snapshot: { at: string; registry: string; read: string; decors: number; coded: number; handles: number; held: number; misfits: number }
  tabs: FeedTab[]
  decors: FeedDecor[]
  handles: FeedHandle[]
  misfits: FeedMisfit[]
}

const F = feed as unknown as Feed

/** The snapshot the page declares — the reading on the range's block (`#range[data-snapshot]`). */
export const FEED = { snapshot: F.snapshot }

function decorTile(d: FeedDecor): Tile {
  const t: Tile = { id: d.id, name: d.name, kind: 'material', supplier: d.supplier, code: d.code, family: d.family, finish: d.finish, texture: d.texture }
  if (d.colour?.hex) { t.colour = d.colour.hex; t.gradient = [d.colour.hex, d.colour.hex] }
  if (d.image) {
    t.src = d.image.path
    t.alt = d.code ? `${d.name} (${d.supplier ?? ''} ${d.code}) decor`.replace('( ', '(') : `${d.name} decor`
    if (d.image.width) t.width = d.image.width
    if (d.image.height) t.height = d.image.height
  }
  if (d.misfit) t.misfit = d.misfit
  if (!t.src && !t.gradient) t.held = true
  return t
}

function handleTile(h: FeedHandle): Tile {
  const t: Tile = { id: h.id, name: h.name, kind: 'handle', supplier: h.supplier, code: null }
  if (h.image) {
    t.src = h.image.path
    t.alt = h.system ? `${h.name} finish — a system render, illustration only` : `${h.name} finish`
    if (h.image.width) t.width = h.image.width
    if (h.image.height) t.height = h.image.height
    if (h.system) { t.system = true; if (h.caveat) t.caveat = h.caveat }
  } else t.held = true
  if (h.misfit) t.misfit = h.misfit
  return t
}

export const GALLERIES: Gallery[] = F.tabs.map((tab) => ({
  id: tab.id,
  label: tab.label,
  kind: tab.kind,
  tiles: tab.kind === 'handle' ? F.handles.map(handleTile) : F.decors.filter((d) => d.tab === tab.id).map(decorTile),
}))

export const HANDLE_GALLERY_INDEX = GALLERIES.findIndex((g) => g.kind === 'handle')

/** The calculator's painted uplift: a decor of the colour family (a uni, painted-look board) — read from the registry's family, never a gallery named in code. */
export const isPainted = (t: Tile | null | undefined): boolean => !!t && t.family === 'colour'

// ---------- the rooms and their finishes (data/rooms.json — the prototype's colour data, S1 for the images) ----------

interface RawTile { id: string; name: string; asset?: string; gradient?: string[]; registry?: { supplier?: string | null; code?: string | null; misfit?: string } }

function roomTile(raw: RawTile): Tile {
  const t: Tile = { id: raw.id, name: raw.name, kind: 'room', supplier: raw.registry?.supplier ?? null, code: raw.registry?.code ?? null }
  if (raw.registry?.misfit) t.misfit = raw.registry.misfit
  if (raw.asset) { const a = asset(raw.asset); t.src = a.path; t.alt = a.alt; t.width = a.width; t.height = a.height }
  if (raw.gradient && raw.gradient.length === 2) t.gradient = [raw.gradient[0] as string, raw.gradient[1] as string]
  if (!t.src && !t.gradient) throw new Error(`A_UNDECLARED: room tile ${raw.id} has neither an asset nor a gradient`)
  return t
}

export const ROOMS: Room[] = roomsData.rooms as Room[]

export const ROOM_TILES: Record<RoomCategory, Tile[]> = Object.fromEntries(
  ROOM_CATEGORIES.map((c) => [c, ((roomsData.categories as Record<string, RawTile[]>)[c] ?? []).map(roomTile)]),
) as Record<RoomCategory, Tile[]>

const ALL = new Map<string, Tile>()
for (const g of GALLERIES) for (const t of g.tiles) ALL.set(`${g.id}:${t.id}`, t)

export function tileByKey(key: string): Tile | undefined {
  return ALL.get(key)
}

/** The tile's label for a prompt or a spec line: the name, with the registry code when one exists. */
export function tileLabel(t: Tile): string {
  return t.code ? `${t.name} (${t.supplier ?? ''} ${t.code})`.replace('( ', '(') : t.name
}

/** The misfit list for the registry (IS v2's asset migration), from the snapshot — every gap with its line, never a guess. */
export function registryMisfits(): FeedMisfit[] {
  return F.misfits
}

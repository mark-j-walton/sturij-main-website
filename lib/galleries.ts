// The configurator's content — material, handle and room finish tiles — typed from the data files, with
// every image resolved by asset id (S1). A tile is a registry product where a code exists; otherwise the
// handoff's name with its misfit line (data/galleries.json).
import galleriesData from '@/data/galleries.json'
import roomsData from '@/data/rooms.json'
import { asset } from './assets'

export type TileKind = 'material' | 'handle' | 'room'

export interface Tile {
  id: string
  name: string
  kind: TileKind
  /** The image the tile shows, resolved from its asset id; absent for a gradient tile. */
  src?: string
  alt?: string
  /** The master's intrinsic size from the manifest — renditions are derived from it. */
  width?: number
  height?: number
  /** The handoff's gradient stops for a tile with no swatch image — the tile's own colour data. */
  gradient?: [string, string]
  supplier?: string | null
  code?: string | null
  misfit?: string
}

export interface Gallery { id: string; label: string; kind: 'material' | 'handle'; tiles: Tile[] }
export interface Room { id: string; label: string; card: number; imageSlot: string }
export type RoomCategory = 'ceiling' | 'walls' | 'skirting' | 'flooring'
export const ROOM_CATEGORIES: RoomCategory[] = ['ceiling', 'walls', 'skirting', 'flooring']

interface RawTile { id: string; name: string; asset?: string; gradient?: string[]; registry?: { supplier?: string | null; code?: string | null; misfit?: string } }

function tile(raw: RawTile, kind: TileKind): Tile {
  const t: Tile = { id: raw.id, name: raw.name, kind, supplier: raw.registry?.supplier ?? null, code: raw.registry?.code ?? null }
  if (raw.registry?.misfit) t.misfit = raw.registry.misfit
  if (raw.asset) { const a = asset(raw.asset); t.src = a.path; t.alt = a.alt; t.width = a.width; t.height = a.height }
  if (raw.gradient && raw.gradient.length === 2) t.gradient = [raw.gradient[0] as string, raw.gradient[1] as string]
  if (!t.src && !t.gradient) throw new Error(`A_UNDECLARED: tile ${raw.id} has neither an asset nor a gradient`)
  return t
}

export const GALLERIES: Gallery[] = (galleriesData.galleries as Array<{ id: string; label: string; kind?: string; tiles: RawTile[] }>).map((g) => ({
  id: g.id,
  label: g.label,
  kind: g.kind === 'handle' ? 'handle' : 'material',
  tiles: g.tiles.map((t) => tile(t, g.kind === 'handle' ? 'handle' : 'material')),
}))

export const HANDLE_GALLERY_INDEX = GALLERIES.findIndex((g) => g.kind === 'handle')

export const ROOMS: Room[] = roomsData.rooms as Room[]

export const ROOM_TILES: Record<RoomCategory, Tile[]> = Object.fromEntries(
  ROOM_CATEGORIES.map((c) => [c, ((roomsData.categories as Record<string, RawTile[]>)[c] ?? []).map((t) => tile(t, 'room'))]),
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

/** The misfit list for the registry — every tile without a code, never a guess. */
export function registryMisfits(): Array<{ gallery: string; tile: string; misfit: string }> {
  const out: Array<{ gallery: string; tile: string; misfit: string }> = []
  for (const g of GALLERIES) for (const t of g.tiles) if (!t.code) out.push({ gallery: g.id, tile: t.name, misfit: t.misfit ?? (galleriesData.galleries.find((x) => x.id === g.id) as { misfit?: string } | undefined)?.misfit ?? 'no registry code' })
  return out
}

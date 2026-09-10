// S1 — every asset resolves by id, and a page holds none. The manifest is generated from the sources by
// scripts/measure-assets.mjs and committed; a reference to an id the manifest lacks is A_UNDECLARED.
import manifest from '@/assets/manifest.json'

export type AssetKind = 'proof' | 'generated' | 'swatch' | 'metal' | 'brand'

export interface Asset {
  id: string
  path: string
  alt: string
  kind: AssetKind
  width: number
  height: number
  format: string
  bytes: number
  sha256: string
  source: string
}

const byId = new Map<string, Asset>((manifest.assets as Asset[]).map((a) => [a.id, a]))

export function asset(id: string): Asset {
  const found = byId.get(id)
  if (!found) throw new Error(`A_UNDECLARED: asset ${id} is not in assets/manifest.json — declare it in assets/sources.json and regenerate`)
  return found
}

export function hasAsset(id: string): boolean {
  return byId.has(id)
}

export function allAssets(): Asset[] {
  return [...byId.values()]
}

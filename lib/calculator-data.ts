// What the calculator's browser side may know about the band table: the configurations, their ranges,
// their options and drawings, and the tiers' names and lines — never a formula or a multiplier. The
// figures come from /api/band.
import table from '@/data/band-table.json'

export interface CalculatorTier { id: string; name: string; line: string }
export interface CalculatorOption { id: string; name: string; desc: string }
export interface CalculatorConfiguration {
  id: string; group: string; name: string; blurb: string; kind: 'run' | 'piece'
  minW: number; maxW: number; defW: number; defH?: number
  options?: CalculatorOption[]
  drawing?: { drawers: number; units: number; heightMm: number; shelf?: boolean }
}

const t = table as unknown as {
  version: number; reviewDate: string; watermark: string; basis: string
  tiers: Array<{ id: string; name: string; line: string }>
  configurations: Array<CalculatorConfiguration & { formula?: unknown }>
}

export const CALC_TIERS: CalculatorTier[] = t.tiers.map(({ id, name, line }) => ({ id, name, line }))
export const CALC_CONFIGURATIONS: CalculatorConfiguration[] = t.configurations.map(({ id, group, name, blurb, kind, minW, maxW, defW, defH, options, drawing }) => ({ id, group, name, blurb, kind, minW, maxW, defW, ...(defH ? { defH } : {}), ...(options ? { options } : {}), ...(drawing ? { drawing } : {}) }))
export const CALC_WATERMARK: string = t.watermark
export const CALC_BASIS: string = t.basis
export const CALC_TABLE_VERSION: number = t.version

/** What a page hands the client artifact: the configurations, the tiers, the watermark and the basis — never the table. */
export const CALCULATOR_VIEW = { configurations: CALC_CONFIGURATIONS, tiers: CALC_TIERS, watermark: CALC_WATERMARK, basis: CALC_BASIS }

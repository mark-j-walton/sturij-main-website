// The enquiry's swatches and band: validated structurally (this is our own client's data, not raw user
// text, so a malformed entry is dropped rather than refusing the whole enquiry), passed through to the
// function's payload exactly as it validates them (sturij PR #63, supabase/functions/enquiry/swatches.ts).
import { describe, expect, it } from 'vitest'
import { toFunctionPayload, validateEnquiry } from '@/lib/enquiry'
import type { BandRef, SwatchRef } from '@/lib/enquiry'

const BASE = { name: 'Sam', email: 'sam@example.com' }
const VALID_SWATCH: SwatchRef = { doorsDecorId: 'decor-f620-st15', doorsDecorCode: 'F620_ST15', carcassId: 'carcass-white', handleFinishId: 'handle-brass' }
const VALID_BAND: BandRef = { from: 1200, to: 1500, currency: 'GBP', tableVersion: 0 }

describe('validateEnquiry: swatches', () => {
  it('absent is an empty list', () => {
    const v = validateEnquiry(BASE)
    if (!v.ok) throw new Error(v.error)
    expect(v.value.swatches).toEqual([])
  })

  it('a valid swatch travels through unchanged', () => {
    const v = validateEnquiry({ ...BASE, swatches: [VALID_SWATCH] })
    if (!v.ok) throw new Error(v.error)
    expect(v.value.swatches).toEqual([VALID_SWATCH])
  })

  it('a swatch missing a required field is dropped, not refused — this is our own data, never the visitor\'s raw text', () => {
    const v = validateEnquiry({ ...BASE, swatches: [{ ...VALID_SWATCH, doorsDecorCode: '' }, VALID_SWATCH] })
    if (!v.ok) throw new Error(v.error)
    expect(v.value.swatches).toEqual([VALID_SWATCH])
  })

  it('more than four is trimmed to four, matching the collector\'s own limit', () => {
    const five = Array.from({ length: 5 }, () => VALID_SWATCH)
    const v = validateEnquiry({ ...BASE, swatches: five })
    if (!v.ok) throw new Error(v.error)
    expect(v.value.swatches.length).toBe(4)
  })

  it('not a list is read as no swatches', () => {
    const v = validateEnquiry({ ...BASE, swatches: 'not a list' })
    if (!v.ok) throw new Error(v.error)
    expect(v.value.swatches).toEqual([])
  })
})

describe('validateEnquiry: band', () => {
  it('absent is null', () => {
    const v = validateEnquiry(BASE)
    if (!v.ok) throw new Error(v.error)
    expect(v.value.band).toBeNull()
  })

  it('a valid band travels through, currency defaulting to GBP when absent', () => {
    const v = validateEnquiry({ ...BASE, band: { from: 100, to: 200 } })
    if (!v.ok) throw new Error(v.error)
    expect(v.value.band).toEqual({ from: 100, to: 200, currency: 'GBP', tableVersion: null })
  })

  it('from greater than to is read as no band, not an error', () => {
    const v = validateEnquiry({ ...BASE, band: { from: 500, to: 100 } })
    if (!v.ok) throw new Error(v.error)
    expect(v.value.band).toBeNull()
  })
})

describe('toFunctionPayload', () => {
  it('carries swatches and band straight through to the function\'s expected field names', () => {
    const v = validateEnquiry({ ...BASE, swatches: [VALID_SWATCH], band: VALID_BAND })
    if (!v.ok) throw new Error(v.error)
    const payload = toFunctionPayload(v.value)
    expect(payload.swatches).toEqual([VALID_SWATCH])
    expect(payload.band).toEqual(VALID_BAND)
  })
})

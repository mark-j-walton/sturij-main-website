// The Studio's style step (scheme brief, 30 Sep 2026): its data is sturij-assets' snapshot and its drawings are
// sturij-assets' renderer, pinned. This fails if the renderer copy drifts from the one the snapshot was written
// beside, if the snapshot carries anything a customer must not see, or if a drawn style no longer draws.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { frontSvg as draw } from '../public/aspire-fronts.mjs'

// the renderer is plain JS; its options are typed here as the Studio calls it
const frontSvg = draw as unknown as (spec: unknown, piece: object, opts: { colour?: string; light?: string; id?: string }) => string

type Option = { code: string; group: string; label: string; piece: { code: string; panels?: number }; default_on: boolean }
type Style = { style: { code: string; name: string }; drawn: boolean; geometry: unknown; options: Option[] }
type Step = {
  source: { repo: string; commit: string; renderer: { path: string; sha256: string } }
  families: { code: string; offered: boolean }[]
  styles: Style[]
  colours: { code: string; hex: string; oklch: string }[]
}

const text = readFileSync('public/showcase/doors/style-step.json', 'utf8')
const step = JSON.parse(text) as Step

describe('the style step', () => {
  it("the renderer is sturij-assets' tools/aspire-fronts.mjs, byte for byte, as the snapshot records", () => {
    const sha = createHash('sha256').update(readFileSync('public/aspire-fronts.mjs')).digest('hex')
    expect(step.source.repo).toBe('mark-j-walton/sturij-assets')
    expect(step.source.renderer.path).toBe('tools/aspire-fronts.mjs')
    expect(sha).toBe(step.source.renderer.sha256)
  })

  it("carries no prices and no maker's product codes", () => {
    expect(text).not.toMatch(/product_code|production_code|price/i)
  })

  it('offers flat decor and moulded vinyl; 61 of 62 styles drawn; 69 colours, each measured', () => {
    expect(step.families.filter((f) => f.offered).map((f) => f.code)).toEqual(['flat_decor', 'moulded_vinyl'])
    expect(step.styles.length).toBe(62)
    expect(step.styles.filter((s) => s.drawn).length).toBe(61)
    expect(step.colours.length).toBe(69)
    for (const c of step.colours) {
      expect(c.hex).toMatch(/^#[0-9a-f]{6}$/)
      expect(c.oklch).toMatch(/^oklch\(/)
    }
  })

  it('every drawn style draws each of its options in a colour, at most eight, with a door and a drawer', () => {
    const size: Record<string, [number, number]> = { DR: [215, 496], HGD: [285, 496], '1HDR': [215, 496], '2HDR': [215, 496], D: [715, 496], EP: [715, 496] }
    for (const s of step.styles.filter((x) => x.drawn)) {
      expect(s.options.length).toBeLessThanOrEqual(8)
      expect(s.options.some((o) => o.group === 'doors')).toBe(true)
      expect(s.options.some((o) => o.group === 'drawers')).toBe(true)
      for (const o of s.options) {
        const [H, W] = size[o.piece.code] ?? [2155, 496]
        const svg = frontSvg(s.geometry, { ...o.piece, H, W }, { colour: step.colours[0]?.oklch, light: 'studio', id: 't' })
        expect(svg, `${s.style.code} ${o.code}`).toMatch(/^<svg [^>]*>.*<\/svg>$/s)
        expect(svg, `${s.style.code} ${o.code}`).not.toMatch(/NaN|undefined/)
      }
    }
  })
})

// The Studio wears the brand (Mark, 30 Sep 2026): its colour and type values are design/sturij-public/DESIGN.md's,
// under the Studio's own names, and its frosts are the brand's registered glass tokens. The chrome follows the brand;
// light and colour lift the materials. This fails if a Studio value drifts from the brand.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('public/studio.css', 'utf8')
const html = readFileSync('public/studio.html', 'utf8')
const design = readFileSync('design/sturij-public/DESIGN.md', 'utf8')

const block = (heading: string) => {
  const at = design.indexOf(heading)
  const start = design.indexOf('```json', at) + 7
  return JSON.parse(design.slice(start, design.indexOf('```', start)))
}
const palette = Object.values(block('## Palette') as Record<string, { hex: string }>).map((p) => p.hex.toUpperCase())
const custom = Object.values(block('## Custom tokens') as Record<string, { value: string }>).map((t) => t.value.replace(/\s/g, ''))
const root = Object.fromEntries(
  [...(css.match(/:root\{([^}]*)\}/)?.[1] ?? '').matchAll(/(--[\w-]+):([^;]+)/g)].map((m) => [m[1], m[2].trim()]),
)

describe('the Studio wears the brand', () => {
  it('every colour in its :root is a brand palette colour or a registered custom token', () => {
    const colours = Object.entries(root).filter(([, v]) => /^#|^rgba?\(/.test(v))
    expect(colours.length).toBeGreaterThanOrEqual(12)
    for (const [name, v] of colours) {
      const ok = v.startsWith('#') ? palette.includes(v.toUpperCase()) : custom.includes(v.replace(/\s/g, ''))
      expect(ok, `${name}: ${v} is not a brand value`).toBe(true)
    }
  })

  it('the accent is the brand bronze-gold, and its deeper fill is gold-lo', () => {
    expect(root['--gold']).toBe('#A67C3C')
    expect(root['--seam']).toBe('#A67C3C')
    expect(root['--bronze']).toBe('#8F6A33')
  })

  it('the type is the brand families, loaded from Google Fonts; no other font host', () => {
    expect(root['--f-serif']).toMatch(/^'Fraunces'/)
    expect(root['--f-sans']).toMatch(/^'Inter'/)
    expect(root['--f-mono']).toMatch(/IBM Plex Mono/)
    expect(html).toMatch(/fonts\.googleapis\.com\/css2\?family=Fraunces[^"]*family=Inter[^"]*family=IBM\+Plex\+Mono/)
    expect(html).not.toMatch(/typekit/)
  })

  it("the frosts are the brand's registered glass: 25% everywhere, 50% on the main tile tab, each with a 10px blur", () => {
    expect(custom).toContain('rgba(250,248,242,.25)')
    expect(custom).toContain('rgba(250,248,242,.5)')
    const frosts = [...css.matchAll(/\{([^{}]*)\}/g)]
      .map((m) => m[1])
      .filter((rule) => rule.includes('backdrop-filter:blur(10px)'))
      .map((rule) => rule.match(/background:(rgba\(250,248,24\d,\.\d+\))/)?.[1])
      .filter(Boolean)
    expect(frosts.length).toBe(7)
    expect(new Set(frosts)).toEqual(new Set(['rgba(250,248,242,.25)', 'rgba(250,248,242,.5)']))
    expect(css).toMatch(/\.pgrip\{[^}]*background:rgba\(250,248,242,\.5\)/)
  })
})

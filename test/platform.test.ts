// The platform's declarations: the instance parses and every role resolves; the token audit passes; every
// artifact validates and every recipe it plays is in the library with a reduced-motion mapping; the page's
// layout declares exactly the slots the seed and the components use; the configurator is one artifact.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CORE_ROLES, declaredVars, loadInstance, toCss } from '@/lib/platform/instance.mjs'
import { checkBehaviours, loadArtifacts, loadRecipes } from '@/lib/platform/artifacts.mjs'
import { COPY_SLOT_IDS, IMAGE_SLOTS } from '@/lib/slots'
import layout from '@/pages/home/layout.json'

const run = (script: string) => execFileSync(process.execPath, [script], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

describe('S2 — the sturij-public DESIGN.md instance', () => {
  const instance = loadInstance('design/sturij-public/DESIGN.md')
  it('carries the core roles and resolves every role to the palette or a minted custom token', () => {
    for (const role of CORE_ROLES) expect(instance.roles[role]).toBeTruthy()
    expect(Object.keys(instance.palette).length).toBeGreaterThan(20)
  })
  it('names Fraunces for titles (Q6), Inter for body and IBM Plex Mono for labels', () => {
    expect(instance.families.type.title.family).toBe('Fraunces')
    expect(instance.families.type.statement.weight).toBe(200)
    expect(instance.families.type.body.family).toBe('Inter')
    expect(instance.families.type.label.family).toBe('IBM Plex Mono')
  })
  it('generates tokens.css and the audit finds no one-off in the sources (PP3)', () => {
    const out = run('scripts/build-tokens.mjs')
    expect(out).toMatch(/custom \(the drift reading\)/)
    const css = readFileSync('app/tokens.css', 'utf8')
    expect(declaredVars(css).has('--ground')).toBe(true)
    const audit = run('scripts/check-tokens.mjs')
    expect(audit).toMatch(/0 one-off\(s\)/)
  })
  it('reports the custom-token count as the drift reading', () => {
    const css = toCss(instance)
    expect((css.match(/^  --custom-/gm) ?? []).length).toBe(Object.keys(instance.custom).length)
    expect(Object.keys(instance.custom).length).toBeGreaterThan(0)
  })
})

describe('S3 / S9 — artifacts and recipes', () => {
  const artifacts = loadArtifacts() as Array<{ id: string; contentTypes: string[]; consumers: string[] }>
  const recipes = loadRecipes() as Array<{ id: string; reduced: string }>
  it('every artifact validates and plays only library recipes', () => {
    expect(artifacts.length).toBeGreaterThanOrEqual(12)
    expect(() => checkBehaviours(artifacts, recipes)).not.toThrow()
  })
  it('every recipe declares a reduced-motion mapping', () => {
    for (const r of recipes) expect(['fade', 'instant', 'none']).toContain(r.reduced)
    for (const id of ['rise-fade', 'handover', 'marquee', 'pile-release', 'montage-reveal', 'scrub-darken']) expect(recipes.some((r) => r.id === id)).toBe(true)
  })
  it('the configurator is one declared artifact taking material, handle and room, and nothing else implements the render call', () => {
    const cfg = artifacts.find((a) => a.id === 'finish-configurator')!
    expect(cfg.contentTypes).toEqual(expect.arrayContaining(['material', 'handle', 'room']))
    expect(cfg.consumers.some((c: string) => c.includes('sturij-studio'))).toBe(true)
    const files = readdirSync('components', { recursive: true }).map(String).filter((f) => /\.tsx?$/.test(f))
    const callers = files.filter((f) => readFileSync(`components/${f}`, 'utf8').includes("'/api/render'")).map((f) => f.split(sep).join('/'))
    expect(callers).toEqual(['configurator/VisualTarget.tsx'])
  })
  it('every data-artifact attribute in the components names a declared artifact', () => {
    const ids = new Set(artifacts.map((a) => a.id))
    const files = readdirSync('components', { recursive: true }).map(String).filter((f) => /\.tsx$/.test(f))
    for (const f of files) {
      const text = readFileSync(`components/${f}`, 'utf8')
      for (const m of text.matchAll(/data-artifact="([a-z-]+)"/g)) expect(ids.has(m[1] as string), `${f}: ${m[1]}`).toBe(true)
    }
  })
  it('the reduced-motion block in site.css neutralises the marquee and the reveals (the licensed variation)', () => {
    const css = readFileSync('app/site.css', 'utf8')
    const block = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(block).toMatch(/\.ribbon\s*\{\s*animation:\s*none/)
    expect(block).toMatch(/\.reveal[^{]*\{[^}]*transition:\s*none/)
  })
})

describe('S5 — the page declaration', () => {
  const slotIds = layout.regions.flatMap((r) => r.slots.map((s) => s.id))
  it('declares every copy slot the seed holds, and no other copy slot', () => {
    const declaredCopy = layout.regions.flatMap((r) => r.slots.filter((s) => s.type === 'copy' && !('note' in s)).map((s) => s.id))
    expect([...declaredCopy].sort()).toEqual([...COPY_SLOT_IDS].sort())
  })
  it('declares every image slot the page reads', () => {
    for (const id of Object.keys(IMAGE_SLOTS)) expect(slotIds, id).toContain(id)
  })
  it('every region names a declared artifact and the design instance exists', () => {
    const ids = new Set(loadArtifacts().map((a) => a.id))
    for (const r of layout.regions) expect(ids.has(r.artifact), r.artifact).toBe(true)
    expect(existsSync(`design/${layout.design}/DESIGN.md`)).toBe(true)
  })
  it('the page component reads exactly the seeded copy slots', () => {
    const page = readFileSync('app/page.tsx', 'utf8')
    const used = new Set<string>()
    for (const m of page.matchAll(/c\('([a-z0-9.]+)'\)/g)) used.add(m[1] as string)
    for (const m of page.matchAll(/c\(`([a-z]+)\.\$\{n\}\.([a-z]+)`\)/g)) for (const n of [1, 2, 3, 4]) if (COPY_SLOT_IDS.includes(`${m[1]}.${n}.${m[2]}`)) used.add(`${m[1]}.${n}.${m[2]}`)
    expect([...used].sort()).toEqual([...COPY_SLOT_IDS].sort())
  })
})

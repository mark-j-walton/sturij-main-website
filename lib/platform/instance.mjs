// S2 — the DESIGN.md instance parser, in the core's format (sturij-core-editor src/tokens/instance.ts):
// an `<!-- instance -->` header with id, surface and base, then one `## Heading` per section with one
// ```json fence holding that section's data. The core package is private and unpublished (PQ8), so this
// surface carries the parser it needs; the format is the same so the instance moves to the core as-is.
import { readFileSync } from 'node:fs'

export const SECTIONS = ['Fixed points', 'Palette', 'Roles', 'Type', 'Spacing', 'Radius', 'Shadow', 'Motion', 'Custom tokens']
export const CORE_ROLES = ['ground', 'surface', 'ink', 'accent', 'line']
const HEX = /^#[0-9A-Fa-f]{6}$/

export class Refusal extends Error {
  constructor(code, message, where, remedy) {
    super(`${code}: ${message} - at ${where}. Remedy: ${remedy}`)
    this.code = code
    this.where = where
    this.remedy = remedy
  }
}
const refuse = (code, message, where, remedy) => { throw new Refusal(code, message, where, remedy) }

function sections(markdown, source) {
  const out = {}
  const re = /^## (.+?)\s*\n[\s\S]*?```json\s*\n([\s\S]*?)\n```/gm
  let m
  while ((m = re.exec(markdown)) !== null) {
    const heading = m[1].trim()
    if (!SECTIONS.includes(heading)) continue
    try { out[heading] = JSON.parse(m[2]) } catch (error) {
      refuse('T_ONE_OFF', `the ${heading} block of ${source} is not JSON: ${error.message}`, `${source} > ${heading}`, 'one ```json fence per section, valid JSON')
    }
  }
  return out
}

function header(markdown, source) {
  const m = /<!--\s*instance\s*\n([\s\S]*?)-->/.exec(markdown)
  if (!m) refuse('T_ONE_OFF', `${source} has no <!-- instance --> header`, source, 'open the file with the header: id, surface, base')
  const fields = {}
  for (const line of m[1].split('\n')) { const i = line.indexOf(':'); if (i > 0) fields[line.slice(0, i).trim()] = line.slice(i + 1).trim() }
  if (!fields.id) refuse('T_ONE_OFF', `${source} declares no instance id`, source, 'id: <instance>')
  if (!fields.surface) refuse('T_ONE_OFF', `${source} names no surface`, source, 'surface: <what this instance is for>')
  return { id: fields.id, surface: fields.surface, base: fields.base && fields.base !== 'none' ? fields.base : null }
}

export function parseInstance(markdown, source = 'DESIGN.md') {
  const head = header(markdown, source)
  const s = sections(markdown, source)
  const palette = {}
  for (const [name, value] of Object.entries(s['Palette'] ?? {})) {
    const hex = typeof value === 'string' ? value : value?.hex
    if (!HEX.test(String(hex))) refuse('T_ONE_OFF', `palette entry ${name} has no six-digit hex reference`, `${source} > Palette > ${name}`, 'hex: "#RRGGBB" from the record')
    palette[name] = { hex: String(hex).toUpperCase() }
  }
  const roles = s['Roles'] ?? {}
  for (const [role, ref] of Object.entries(roles)) {
    if (typeof ref !== 'string' || !/^(palette\.|custom\.|brand:)/.test(ref)) refuse('T_ONE_OFF', `role ${role} holds a literal (${String(ref)}) instead of a reference`, `${source} > Roles > ${role}`, 'a role references palette.<name>, custom.<name> or brand:<id>')
  }
  const custom = s['Custom tokens'] ?? {}
  for (const [name, token] of Object.entries(custom)) {
    if (!token || typeof token.value !== 'string' || !token.reason || !token.by || !token.at) refuse('T_ONE_OFF', `custom token ${name} is minted without value, reason, author and time`, `${source} > Custom tokens > ${name}`, 'a custom token carries value, reason, by, at')
    if (!/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)*$/.test(name)) refuse('T_ONE_OFF', `custom token name ${name} is not a token name`, `${source} > Custom tokens > ${name}`, 'lowercase, dashes, dots for groups')
  }
  for (const role of CORE_ROLES) if (!roles[role]) refuse('T_ONE_OFF', `instance ${head.id} declares no ${role} role`, `${source} > Roles > ${role}`, `every instance carries ${CORE_ROLES.join(', ')}`)
  for (const [role, ref] of Object.entries(roles)) {
    if (ref.startsWith('palette.') && !palette[ref.slice(8)]) refuse('T_ONE_OFF', `role ${role} references ${ref}, which the palette does not hold`, `${source} > Roles > ${role}`, 'reference a palette entry')
    if (ref.startsWith('custom.') && !custom[ref.slice(7)]) refuse('T_ONE_OFF', `role ${role} references ${ref}, which is not minted`, `${source} > Roles > ${role}`, 'mint the custom token in this instance')
  }
  const families = {
    type: s['Type'] ?? {},
    spacing: s['Spacing'] ?? { unit: 8, scale: [], target: 44 },
    radius: s['Radius'] ?? {},
    shadow: s['Shadow'] ?? {},
    motion: s['Motion'] ?? {},
  }
  for (const [name, t] of Object.entries(families.type)) {
    if (!t || typeof t.family !== 'string' || !t.family) refuse('T_ONE_OFF', `type token ${name} names no family`, `${source} > Type > ${name}`, 'family: a face name or brand:<id>')
  }
  return { ...head, fixed: s['Fixed points'] ?? {}, palette, roles, families, custom, source }
}

export function loadInstance(path) {
  return parseInstance(readFileSync(path, 'utf8'), path)
}

const kebab = (s) => s.replace(/\./g, '-')

/** The instance as CSS custom properties - the one place a value becomes a variable; components bind variables only. */
export function toCss(instance, fontVars = {}) {
  const lines = []
  for (const [name, p] of Object.entries(instance.palette)) lines.push(`  --palette-${name}: ${p.hex};`)
  for (const [name, t] of Object.entries(instance.custom)) lines.push(`  --custom-${kebab(name)}: ${t.value};`)
  for (const [role, ref] of Object.entries(instance.roles)) {
    const v = ref.startsWith('palette.') ? `var(--palette-${ref.slice(8)})` : ref.startsWith('custom.') ? `var(--custom-${kebab(ref.slice(7))})` : `var(--brand-${kebab(ref.slice(6))})`
    lines.push(`  --${role}: ${v};`)
  }
  for (const [name, t] of Object.entries(instance.families.type)) {
    const stack = fontVars[t.family] ?? `'${t.family}'`
    lines.push(`  --type-${name}-family: ${stack};`)
    if (t.weight !== undefined) lines.push(`  --type-${name}-weight: ${t.weight};`)
    if (t.size !== undefined) lines.push(`  --type-${name}-size: ${t.size}px;`)
    if (t.leading !== undefined) lines.push(`  --type-${name}-leading: ${t.leading};`)
    if (t.transform !== undefined) lines.push(`  --type-${name}-transform: ${t.transform};`)
  }
  const sp = instance.families.spacing
  lines.push(`  --space-unit: ${sp.unit}px;`)
  lines.push(`  --target: ${sp.target}px;`)
  ;(sp.scale ?? []).forEach((v, i) => lines.push(`  --space-${i + 1}: ${v}px;`))
  for (const [name, v] of Object.entries(instance.families.radius)) lines.push(`  --radius-${name}: ${v}px;`)
  for (const [name, v] of Object.entries(instance.families.shadow)) lines.push(`  --shadow-${name}: ${v};`)
  for (const [name, v] of Object.entries(instance.families.motion)) lines.push(`  --motion-${name}: ${typeof v === 'number' && name !== 'lerp' ? `${v}ms` : v};`)
  return `/* GENERATED from design/${instance.id}/DESIGN.md by scripts/build-tokens.mjs - do not edit; change the instance. */\n:root {\n${lines.join('\n')}\n}\n`
}

/** Every custom property the generated CSS declares - what the audit checks references against. */
export function declaredVars(css) {
  return new Set([...css.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((m) => m[1]))
}

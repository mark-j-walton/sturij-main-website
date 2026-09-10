// S3 / S9 — the artifact and recipe validators, in the core's rules (sturij-core-editor src/artifacts/
// declaration.ts and src/motion/motion.ts). Declarations are data; a declaration that fails refuses with
// its code, its place and its remedy. Carried here because the core package is private and unpublished.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Refusal } from './instance.mjs'

const refuse = (code, message, where, remedy) => { throw new Refusal(code, message, where, remedy) }
export const ARTIFACT_KINDS = ['shell', 'block', 'control', 'panel', 'canvas']
export const INTERACTION_STATES = ['idle', 'hover', 'active', 'dragging', 'locked', 'disabled-with-reason', 'loading']
export const TRIGGERS = ['enter', 'hover', 'drag', 'transition', 'scroll', 'state']
export const RECIPE_KINDS = ['arrive', 'hold', 'swap']
export const REDUCED_MAPPINGS = ['fade', 'instant', 'none']
const nonEmpty = (v) => typeof v === 'string' && v.trim().length > 0
const strings = (v) => Array.isArray(v) && v.every(nonEmpty)
const TOKEN_REF = /^(?:[a-z][a-z0-9-]*|type\.[a-z][a-z0-9-]*|space\.\d+|radius\.[a-z][a-z0-9-]*|shadow\.[a-z0-9-]+|motion\.[a-z][a-z0-9-]*|custom\.[a-z][a-z0-9.-]*)$/
const LITERAL = /^(#|rgb|hsl|oklch|\d)/i

export function validateArtifact(raw, where) {
  if (typeof raw !== 'object' || raw === null) refuse('R_DARK', 'an artifact declaration must be an object', where, 'declare the artifact as data')
  const a = raw
  if (!nonEmpty(a.id)) refuse('R_DARK', 'an artifact with no id', where, 'give it an id')
  const id = a.id
  const at = (f) => `${where} > ${id}.${f}`
  if (!ARTIFACT_KINDS.includes(a.kind)) refuse('R_DARK', `artifact ${id} has no kind`, at('kind'), `kind: ${ARTIFACT_KINDS.join(' | ')}`)
  if (!nonEmpty(a.description)) refuse('R_DARK', `artifact ${id} has no description`, at('description'), 'say what it is')
  if (!strings(a.tags) || a.tags.length === 0) refuse('R_DARK', `artifact ${id} carries no tags`, at('tags'), 'tag it; navigation and the shell derive from tags')
  if (!strings(a.consumers) || a.consumers.length === 0) refuse('R_DARK', `artifact ${id} declares no consumer - dark by definition`, at('consumers'), 'name the page, artifact or surface that consumes it')
  if (!Array.isArray(a.contentTypes) || !a.contentTypes.every(nonEmpty)) refuse('R_DARK', `artifact ${id} declares no content types list`, at('contentTypes'), 'declare the list, empty for chrome')
  if (!Array.isArray(a.properties)) refuse('R_DARK', `artifact ${id} declares no properties list`, at('properties'), 'declare the axes, empty if none')
  const names = new Set()
  a.properties.forEach((p, i) => {
    const w = at(`properties[${i}]`)
    if (!nonEmpty(p.name)) refuse('R_DARK', `a property of ${id} has no name`, w, 'name the axis')
    if (!strings(p.values) || p.values.length === 0) refuse('R_DARK', `property ${p.name} of ${id} has no values`, w, 'list the governed values')
    if (!nonEmpty(p.default) || !p.values.includes(p.default)) refuse('R_DARK', `property ${p.name} of ${id} has no default among its values`, w, 'default one of the values')
    if (!nonEmpty(p.description)) refuse('R_DARK', `property ${p.name} of ${id} has no description`, w, 'describe the axis')
    if (names.has(p.name)) refuse('R_DARK', `property ${p.name} of ${id} declared twice`, w, 'one axis per name')
    names.add(p.name)
  })
  if (!Array.isArray(a.disabled)) refuse('R_DARK', `artifact ${id} declares no disabled list`, at('disabled'), 'declare the list, empty if every property is in use')
  a.disabled.forEach((d, i) => {
    if (!nonEmpty(d.property)) refuse('R_UNGOVERNED', `a disabled entry of ${id} names no property`, at(`disabled[${i}]`), 'name the property')
    if (!nonEmpty(d.reason)) refuse('R_UNGOVERNED', `property ${d.property} of ${id} is disabled with no reason`, at(`disabled[${i}].reason`), 'state why, or enable it')
  })
  if (!strings(a.states) || !a.states.every((s) => INTERACTION_STATES.includes(s))) refuse('R_DARK', `artifact ${id} declares states outside the set`, at('states'), `states: ${INTERACTION_STATES.join(', ')}`)
  if (!a.states.includes('idle')) refuse('R_DARK', `artifact ${id} has no idle state`, at('states'), 'every artifact is idle before anything else')
  if (!Array.isArray(a.recipes) || !a.recipes.every(nonEmpty)) refuse('R_DARK', `artifact ${id} declares no recipes list`, at('recipes'), 'declare the list, empty for a static artifact')
  if (!Array.isArray(a.capabilities) || !a.capabilities.every(nonEmpty)) refuse('R_DARK', `artifact ${id} declares no capabilities list`, at('capabilities'), 'declare the list, empty when it needs nothing beyond rendering')
  if (typeof a.tokens !== 'object' || a.tokens === null || Object.keys(a.tokens).length === 0) refuse('T_ONE_OFF', `artifact ${id} binds no tokens`, at('tokens'), 'bind every value to a role or a family token')
  for (const [purpose, ref] of Object.entries(a.tokens)) {
    if (!nonEmpty(ref) || LITERAL.test(ref)) refuse('T_ONE_OFF', `artifact ${id} binds ${purpose} to a literal (${String(ref)})`, at(`tokens.${purpose}`), 'bind a semantic role or a family token')
    if (ref.startsWith('palette.')) refuse('T_ONE_OFF', `artifact ${id} binds ${purpose} to the raw palette (${ref})`, at(`tokens.${purpose}`), 'blocks use semantic roles only')
    if (!TOKEN_REF.test(ref)) refuse('T_ONE_OFF', `artifact ${id} binds ${purpose} to ${ref}, which is not a token reference`, at(`tokens.${purpose}`), 'a role name, or type.<n> - space.<n> - radius.<n> - shadow.<n> - motion.<n> - custom.<n>')
  }
  const s = a.size
  if (!s || !Number.isInteger(s.w) || !Number.isInteger(s.h) || s.w < 1 || s.h < 1) refuse('R_DARK', `artifact ${id} declares no footprint on the grid`, at('size'), 'size: { w, h } in grid units')
  if (a.behaviours !== undefined) {
    if (!Array.isArray(a.behaviours)) refuse('M_UNDECLARED', `artifact ${id} declares behaviours that are not a list`, at('behaviours'), 'behaviours: [ { recipe, trigger } ]')
    a.behaviours.forEach((b, i) => {
      if (!nonEmpty(b.recipe) || !a.recipes.includes(b.recipe)) refuse('M_UNDECLARED', `artifact ${id} plays ${String(b.recipe)}, which it does not list in recipes`, at(`behaviours[${i}]`), 'name a recipe the artifact lists')
      if (!TRIGGERS.includes(b.trigger)) refuse('M_UNDECLARED', `artifact ${id} declares trigger ${String(b.trigger)}`, at(`behaviours[${i}].trigger`), `trigger: ${TRIGGERS.join(' | ')}`)
    })
  }
  if (a.reference !== undefined) {
    const r = a.reference
    if (!nonEmpty(r.surface) || !nonEmpty(r.where) || !strings(r.delta) || r.delta.length === 0) refuse('R_DARK', `artifact ${id} names a reference without surface, where and delta`, at('reference'), 'reference: { surface, where, delta: [what changed to obey] }')
  }
  return a
}

export function validateRecipe(r, where) {
  if (!nonEmpty(r.id)) refuse('M_UNDECLARED', 'a recipe with no id', where, 'name the recipe')
  const at = (f) => `${where} > ${r.id}.${f}`
  if (!nonEmpty(r.description)) refuse('M_UNDECLARED', `recipe ${r.id} has no description`, at('description'), 'say what it does, in words')
  if (!nonEmpty(r.author)) refuse('M_UNDECLARED', `recipe ${r.id} names no author - recipes are human-authored`, at('author'), 'name the author')
  if (!RECIPE_KINDS.includes(r.kind)) refuse('M_NO_END', `recipe ${r.id} declares no kind, so no end`, at('kind'), `kind: ${RECIPE_KINDS.join(' | ')}`)
  if (r.engine !== 'waapi' && !(typeof r.engine === 'string' && r.engine.startsWith('motion-plus:'))) refuse('M_UNDECLARED', `recipe ${r.id} declares no engine`, at('engine'), 'waapi, or motion-plus:<feature> with verified')
  if (typeof r.engine === 'string' && r.engine.startsWith('motion-plus:') && !(r.verified && nonEmpty(r.verified.by) && nonEmpty(r.verified.at))) refuse('M_UNDECLARED', `recipe ${r.id} uses ${r.engine}, which is not verified (PQ6)`, at('verified'), 'the open engine first; a Motion+ feature only where verified')
  if (typeof r.duration !== 'string' || !/^motion\.(fast|normal|slow)$/.test(r.duration)) refuse('M_UNDECLARED', `recipe ${r.id} names no duration token`, at('duration'), 'motion.fast | motion.normal | motion.slow')
  if (typeof r.easing !== 'string' || !/^motion\.ease-(enter|exit|settle)$/.test(r.easing)) refuse('M_UNDECLARED', `recipe ${r.id} names no easing token`, at('easing'), 'motion.ease-enter | motion.ease-exit | motion.ease-settle')
  if (!r.travel || !Number.isInteger(r.travel.x) || !Number.isInteger(r.travel.y)) refuse('M_NO_END', `recipe ${r.id} declares no travel in grid steps`, at('travel'), 'travel: { x, y }; zero where it stays in place')
  if (typeof r.fade !== 'boolean') refuse('M_UNDECLARED', `recipe ${r.id} does not say whether it fades`, at('fade'), 'fade: true | false')
  if (!REDUCED_MAPPINGS.includes(r.reduced)) refuse('M_UNDECLARED', `recipe ${r.id} declares no reduced-motion mapping`, at('reduced'), `reduced: ${REDUCED_MAPPINGS.join(' | ')}`)
  return r
}

export function loadRecipes(path = 'motion/recipes.json') {
  const data = JSON.parse(readFileSync(path, 'utf8'))
  const seen = new Set()
  return data.recipes.map((r, i) => {
    const v = validateRecipe(r, `${path}[${i}]`)
    if (seen.has(v.id)) refuse('M_UNDECLARED', `recipe ${v.id} declared twice`, `${path} > ${v.id}`, 'one recipe per name')
    seen.add(v.id)
    return v
  })
}

export function loadArtifacts(dir = 'artifacts') {
  const out = []
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'content-types.json').sort()) {
    const a = validateArtifact(JSON.parse(readFileSync(join(dir, f), 'utf8')), `${dir}/${f}`)
    if (a.id !== f.replace(/\.json$/, '')) refuse('R_DARK', `${dir}/${f} declares id ${a.id}`, `${dir}/${f}`, 'the file is the artifact id')
    out.push(a)
  }
  return out
}

/** Every recipe an artifact lists or plays must be in the library (M_UNDECLARED). */
export function checkBehaviours(artifacts, recipes) {
  const ids = new Set(recipes.map((r) => r.id))
  for (const a of artifacts) {
    for (const name of a.recipes) if (!ids.has(name)) refuse('M_UNDECLARED', `artifact ${a.id} lists recipe ${name}, which is not in the library`, `${a.id} > recipes`, `compose from ${[...ids].sort().join(', ')}`)
  }
}

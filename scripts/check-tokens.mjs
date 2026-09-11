#!/usr/bin/env node
// PP3 · Tokens only: the token audit over the surface's own sources. A colour or font-family literal
// outside the generated tokens.css is T_ONE_OFF and fails; a var() nobody declares fails; the
// custom-token count is reported (the drift reading).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { declaredVars, loadInstance } from '../lib/platform/instance.mjs'

const ROOTS = ['app', 'components', 'lib']
// The generated tokens and the platform's own tooling (which writes the var() names) are not the surface.
const SKIP = (file) => file === 'app/tokens.css' || file.startsWith('lib/platform/')
const COLOUR = /(#[0-9a-fA-F]{3,8}\b|\brgba?\((?!var\()|\bhsla?\(|\boklch\(|\bcolor-mix\()/
const FONT = /font-family\s*:(?!\s*var\()/
const VAR = /var\((--[a-z0-9-]+)/g
// Variables the page sets at runtime (per element), not tokens.
const RUNTIME_VARS = new Set(['--nav', '--ov', '--sc', '--i', '--sh', '--bh', '--tint', '--pos', '--cols', '--rows', '--img', '--ar', '--font-fraunces', '--font-inter', '--font-plex-mono'])

const files = []
const walk = (dir) => {
  if (!existsSync(dir)) return
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(css|tsx?|mjs)$/.test(e)) files.push(p.replace(/\\/g, '/'))
  }
}
ROOTS.forEach(walk)

const instance = loadInstance('design/sturij-public/DESIGN.md')
const declared = existsSync('app/tokens.css') ? declaredVars(readFileSync('app/tokens.css', 'utf8')) : new Set()
let hits = 0
for (const file of files) {
  if (SKIP(file)) continue
  const text = readFileSync(file, 'utf8')
  text.split('\n').forEach((line, i) => {
    if (/token-audit:allow/.test(line) || /^\s*(\/\/|\*|\/\*)/.test(line)) return
    const m = line.match(COLOUR)
    if (m) { hits++; console.error(`T_ONE_OFF ${file}:${i + 1} literal ${m[0]}`) }
    if (FONT.test(line)) { hits++; console.error(`T_ONE_OFF ${file}:${i + 1} font-family literal`) }
    for (const v of line.matchAll(VAR)) {
      const name = v[1]
      if (!declared.has(name) && !RUNTIME_VARS.has(name)) { hits++; console.error(`T_ONE_OFF ${file}:${i + 1} var(${name}) is not a token of ${instance.id}`) }
    }
  })
}
console.log(`token audit: ${files.length} files · instance ${instance.id} · ${Object.keys(instance.custom).length} custom tokens (drift reading) · ${hits} one-off(s)`)
process.exit(hits ? 1 : 0)

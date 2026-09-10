#!/usr/bin/env node
// After `next build`: the handoff's editor scaffolding must not ship, no visitor-side key handling remains,
// the model endpoint and the key name appear in no client chunk, and no key shape is in the output.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const CLIENT_DIR = '.next/static'
const SERVER_DIR = '.next/server'
if (!existsSync(CLIENT_DIR)) { console.error('bundle check: no .next/static — run next build first'); process.exit(1) }

const FORBIDDEN_ANYWHERE = ['<x-dc', 'ds-base.js', 'support.js', 'data-om-id', 'sturij_gemini_key', 'sturij_img_slot', 'aistudio.google.com']
const FORBIDDEN_IN_CLIENT = ['generativelanguage.googleapis.com', 'GEMINI_API_KEY', 'x-goog-api-key']
const KEY_SHAPES = [/AIza[0-9A-Za-z_-]{30,}/, /sk-[A-Za-z0-9]{20,}/, /sbp_[a-f0-9]{30,}/, /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, /-----BEGIN [A-Z ]*PRIVATE KEY/, /gh[pousr]_[A-Za-z0-9]{30,}/]

const walk = (dir, out = []) => { for (const e of readdirSync(dir)) { const p = join(dir, e); if (statSync(p).isDirectory()) walk(p, out); else if (/\.(js|css|html|json|txt|rsc)$/.test(e)) out.push(p) } return out }
let hits = 0
const scan = (files, needles, label) => {
  for (const f of files) {
    const text = readFileSync(f, 'utf8')
    for (const n of needles) if (text.includes(n)) { hits++; console.error(`${label}: ${f} contains ${JSON.stringify(n)}`) }
    for (const re of KEY_SHAPES) if (re.test(text)) { hits++; console.error(`key shape in build output: ${f} matches ${re}`) }
  }
}
const client = walk(CLIENT_DIR)
const server = existsSync(SERVER_DIR) ? walk(SERVER_DIR) : []
scan(client, [...FORBIDDEN_ANYWHERE, ...FORBIDDEN_IN_CLIENT], 'client bundle')
scan(server, FORBIDDEN_ANYWHERE, 'server output')
console.log(`bundle check: ${client.length} client files, ${server.length} server files, ${hits} hit(s)`)
process.exit(hits ? 1 : 0)

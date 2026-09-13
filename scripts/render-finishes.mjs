#!/usr/bin/env node
// The handle-finish masters as SYSTEM renders — the finish rule's second source (materials-feed addendum 1):
// a finish tile is the maker's photography or a system render from the render path, never a small file scaled
// up. This is a session tool, not a build step: it reads the rig (data/finish-rig.json) and the finish names
// and notes (data/range.json), asks the provider for one image per finish under one rig so the set reads as a
// family, REFUSES any image under the rule's floor (short side ≥ 1500 px) instead of upscaling it, writes the
// master into the store (public/showcase/metals/<id>.jpg, q ≥ 85) and a provenance row into
// data/finish-masters.json — provider, model, the prompt's sha256, the rig version, the date, the rights, the
// caveat. The feed (scripts/materials-feed.mjs) reads that register: a finish with a master at the floor shows
// it, marked a system render with its caveat; one without stays held.
//
// THE KEY comes from the environment by name (GEMINI_API_KEY; GEMINI_IMAGE_MODEL_MASTER to choose the model),
// pulled from the vault — never printed, never written. Run:
//   node --env-file=.env.local scripts/render-finishes.mjs               # every finish without a master
//   node --env-file=.env.local scripts/render-finishes.mjs --only satin-brass --force
//   node scripts/render-finishes.mjs --dry-run                            # the prompts, nothing sent
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

export const RIG_PATH = 'data/finish-rig.json'
export const RANGE_PATH = 'data/range.json'
export const REGISTER_PATH = 'data/finish-masters.json'
export const STORE_DIR = 'public/showcase/metals'
export const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))

/** The prompt for one finish under the rig — pure. */
export function promptFor(rig, finish) {
  const note = finish.note ? String(finish.note).trim().replace(/\.?$/, '.') : ''
  return `${rig.prompt.template.replace('{finish}', finish.name).replace('{finish_note}', note).replace(/\s{2,}/g, ' ').trim()} ${rig.prompt.negatives}`.trim()
}

/** The rule's floor on a decoded image — pure. */
export function meetsFloor(meta, rig) {
  const short = Math.min(meta.width ?? 0, meta.height ?? 0)
  return { ok: short >= rig.floor.short_side_px, short, floor: rig.floor.short_side_px }
}

/** The register row for a master — pure. */
export function masterRow(finish, file, meta, bytes, digest, provenance, rig) {
  return {
    finish: finish.id, name: finish.name, path: '/' + file.replace(/^public\//, ''), width: meta.width, height: meta.height, bytes, sha256: digest,
    kind: 'system', provider: provenance.provider, model: provenance.model, prompt_sha256: provenance.prompt_sha256, rig_version: rig.version,
    rendered_at: provenance.at, rights: rig.rights, caveat: rig.caveat,
  }
}

// ---------- providers ----------

const providers = {
  /** Gemini's image model: one text part, an image back. The key and the model by name from the environment. */
  gemini: async (prompt, rig, env, fetchFn = fetch) => {
    const cfg = rig.provider.gemini
    const key = env[cfg.key_env]
    if (!key) throw Object.assign(new Error(`${cfg.key_env} is not set — the render key comes from the vault by name`), { code: 'E_NOT_CONFIGURED' })
    const model = env[cfg.model_env] || cfg.model_default
    const body = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: cfg.image } }
    const res = await fetchFn(`${GEMINI_ENDPOINT}/${model}:generateContent`, { method: 'POST', headers: { 'x-goog-api-key': key, 'content-type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) throw Object.assign(new Error(`the image service answered ${res.status}`), { code: res.status === 429 ? 'E_RATE_LIMIT' : 'E_UPSTREAM' })
    const json = await res.json()
    const parts = json?.candidates?.[0]?.content?.parts ?? []
    for (const p of parts) { const d = p.inlineData ?? p.inline_data; if (d?.data) return { bytes: Buffer.from(d.data, 'base64'), model, provider: 'gemini' } }
    throw Object.assign(new Error('no image came back'), { code: 'E_NO_IMAGE' })
  },
}
export const PROVIDERS = Object.keys(providers)

// ---------- the run ----------

export async function run({ argv = [], env = process.env, cwd = process.cwd(), fetchFn = fetch, log = console.log } = {}) {
  const rig = readJson(`${cwd}/${RIG_PATH}`)
  const range = readJson(`${cwd}/${RANGE_PATH}`)
  const register = existsSync(`${cwd}/${REGISTER_PATH}`) ? readJson(`${cwd}/${REGISTER_PATH}`) : { masters: [] }
  const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null
  const force = argv.includes('--force')
  const dry = argv.includes('--dry-run')
  const providerName = argv.includes('--provider') ? argv[argv.indexOf('--provider') + 1] : rig.provider.default
  const provider = providers[providerName]
  if (!provider) throw Object.assign(new Error(`provider ${providerName} is not one this tool knows (${PROVIDERS.join(', ')})`), { code: 'E_PROVIDER' })
  const finishes = (range.handles?.finishes ?? []).filter((f) => !only || f.id === only)
  const out = { rendered: [], refused: [], skipped: [], dry }
  mkdirSync(`${cwd}/${STORE_DIR}`, { recursive: true })
  for (const f of finishes) {
    const have = register.masters.find((m) => m.finish === f.id)
    if (have && !force) { out.skipped.push({ finish: f.id, why: `a master exists (${have.width}×${have.height}, ${have.provider} ${have.model}, ${have.rendered_at})` }); continue }
    const prompt = promptFor(rig, f)
    if (dry) { out.skipped.push({ finish: f.id, why: 'dry run', prompt }); log(`— ${f.name}\n${prompt}\n`); continue }
    let img
    try { img = await provider(prompt, rig, env, fetchFn) }
    catch (e) { out.refused.push({ finish: f.id, why: (e.code ? e.code + ': ' : '') + e.message }); log(`refused ${f.name}: ${(e.code ? e.code + ': ' : '') + e.message}`); if (e.code === 'E_NOT_CONFIGURED' || e.code === 'E_RATE_LIMIT') break; continue }
    const meta = await sharp(img.bytes).metadata()
    const floor = meetsFloor(meta, rig)
    if (!floor.ok) { out.refused.push({ finish: f.id, why: `${meta.width}×${meta.height} from ${img.provider} ${img.model} is under the floor (short side ${floor.short} < ${floor.floor}) — not upscaled, not filed` }); log(`refused ${f.name}: under the floor at ${meta.width}×${meta.height}`); continue }
    const jpeg = await sharp(img.bytes).jpeg({ quality: rig.floor.jpeg_quality, mozjpeg: true }).toBuffer()
    const file = `${STORE_DIR}/${f.id}.jpg`
    writeFileSync(`${cwd}/${file}`, jpeg)
    const jm = await sharp(jpeg).metadata()
    const row = masterRow(f, file, jm, jpeg.length, sha256(jpeg), { provider: img.provider, model: img.model, prompt_sha256: sha256(prompt), at: new Date().toISOString() }, rig)
    register.masters = [...register.masters.filter((m) => m.finish !== f.id), row]
    writeFileSync(`${cwd}/${REGISTER_PATH}`, JSON.stringify(register, null, 2) + '\n')
    out.rendered.push({ finish: f.id, width: jm.width, height: jm.height, bytes: jpeg.length, model: img.model })
    log(`filed ${f.name}: ${jm.width}×${jm.height}, ${jpeg.length} B, ${img.provider} ${img.model}`)
  }
  log(`finish masters: ${out.rendered.length} filed · ${out.refused.length} refused · ${out.skipped.length} skipped → ${REGISTER_PATH}`)
  return out
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('render-finishes.mjs')) {
  run({ argv: process.argv.slice(2) }).then((r) => process.exit(r.refused.some((x) => /E_NOT_CONFIGURED/.test(x.why)) ? 2 : 0)).catch((e) => { console.error(String(e.message || e)); process.exit(1) })
}

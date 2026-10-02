// scripts/wallpaper-from-registry.mjs — the Studio's wallpaper swatches, from the materials registry.
//
// Why (2 Oct 2026): the 51 Studio wallpapers are Farrow & Ball's own patterns, but they were copied from the maker's
// shop pages, so seven carry its "NEW COLOUR" sticker, and the Studio paints that sticker onto the customer's walls.
// None names its colourway. The registry holds every pattern's colourways as clean 1000 px swatches in the catalog,
// each with its code and EAN (sturij-assets, recovery/farrow-ball-images-receipt-2026-09-30.json).
//
// For each Studio pattern this picks the registry colourway nearest the one the Studio shows now (mean colour, the
// sticker's corner left out), so no customer sees a different colour, and writes it in place at 500 px. A pattern the
// registry holds that the Studio lacks is listed, not added: the three it has today (Gothic, Sweet Pea, Vine Leaf)
// carry the maker's "NEW" sticker on every colourway, so they wait for clean images. wallpaper.json gains each
// swatch's colourway, EAN and catalog source, so the set can be proved against the registry.
//
// Run: node scripts/wallpaper-from-registry.mjs <path to sturij-assets>/recovery/farrow-ball-images-receipt-2026-09-30.json [--dry]

import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import sharp from 'sharp'

const DIR = 'public/showcase/wallpaper'
const SIZE = 500

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** Mean colour of an image, leaving out the bottom-right corner where the maker's sticker sits. */
export async function meanColour(buf) {
  const { data, info } = await sharp(buf).resize(100, 100, { fit: 'cover' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  let r = 0, g = 0, b = 0, n = 0
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (x >= 60 && y >= 65) continue
    const i = (y * info.width + x) * 3
    r += data[i]; g += data[i + 1]; b += data[i + 2]; n++
  }
  return [r / n, g / n, b / n]
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

/** The receipt's stored wallpaper swatches, by pattern name. */
export function swatches(receipt) {
  const by = new Map()
  for (const l of receipt.lines) {
    if (l.status !== 'stored' || l.kind !== 'swatch' || l.material?.category !== 'wallpaper') continue
    const code = l.storage_path.match(/-(\d+)-swatch\.jpg$/)?.[1]
    if (!by.has(l.material.name)) by.set(l.material.name, [])
    by.get(l.material.name).push({ code, sku: l.variant_sku, url: l.catalog_url, sha256: l.sha256 })
  }
  for (const list of by.values()) list.sort((a, b) => Number(a.code) - Number(b.code))
  return by
}

async function fetchChecked(s) {
  const res = await fetch(s.url)
  if (!res.ok) throw new Error(`${s.url} answered ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const sha = createHash('sha256').update(buf).digest('hex')
  if (sha !== s.sha256) throw new Error(`${s.url}: sha256 ${sha} is not the receipt's ${s.sha256}`)
  return buf
}

async function main() {
  const receiptPath = process.argv[2]
  if (!receiptPath) throw new Error('usage: node scripts/wallpaper-from-registry.mjs <farrow-ball-images-receipt.json> [--dry]')
  const dry = process.argv.includes('--dry')
  const receiptText = readFileSync(receiptPath, 'utf8')
  const by = swatches(JSON.parse(receiptText))
  const studio = JSON.parse(readFileSync(join(DIR, 'wallpaper.json'), 'utf8'))
  const names = new Set(studio.map((w) => w.name))
  const out = [], report = []
  for (const w of studio) {
    const list = by.get(w.name)
    if (!list?.length) throw new Error(`the registry has no swatch for ${w.name}`)
    const now = await meanColour(readFileSync(join(DIR, w.file)))
    const scored = []
    for (const s of list) { const buf = await fetchChecked(s); scored.push({ s, buf, d: dist(now, await meanColour(buf)) }) }
    scored.sort((a, b) => a.d - b.d)
    const { s: pick, buf, d: best } = scored[0], second = scored[1]?.d ?? null
    if (!dry) await sharp(buf).resize(SIZE, SIZE, { fit: 'cover' }).jpeg({ quality: 82, mozjpeg: true }).toFile(join(DIR, w.file))
    out.push({ file: w.file, name: w.name, code: pick.code, sku: pick.sku, source: pick.url, source_sha256: pick.sha256 })
    report.push(`matched ${w.name} → ${pick.code} (distance ${best.toFixed(1)}, next ${second == null ? '—' : second.toFixed(1)})`)
  }
  const missing = [...by.keys()].filter((n) => !names.has(n)).sort()
  if (missing.length) report.push(`in the registry, not in the Studio: ${missing.join(', ')}`)
  out.sort((a, b) => a.name.localeCompare(b.name))
  const manifest = JSON.stringify(out, null, 1) + '\n'
  if (!dry) writeFileSync(join(DIR, 'wallpaper.json'), manifest)
  console.log(report.join('\n'))
  console.log(`${out.length} wallpapers; registry receipt sha256 ${createHash('sha256').update(receiptText).digest('hex')}`)
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1) })

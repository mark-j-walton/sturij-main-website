#!/usr/bin/env node
// The materials feed — the site reads ONE registry (sturij-assets) instead of a local list (brief
// claude-code-session-2026-09-11-materials-feed, Part A; page-platform S1). At build this script joins the
// page's selection (data/range.json — registry ids and the placing rule, no decor named) to the registry and
// emits public/materials.json: every decor the site needs by id with code, name, family, finish, texture,
// the measured colour where filed, the swatch image by id from the registry's store or image: null with a
// misfit reason, the handle finishes, the snapshot's date, and the misfit list.
//
// THE READ. Through a read-only key held in the vault by name — STURIJ_ASSETS_READ_KEY, STURIJ_ASSETS_URL —
// never the service-role key, never a value in this repository. Until that key exists the registry cannot
// be read at build (every table carries RLS with no client policy), so the committed snapshot stands and the
// build says so. The first snapshot was read by the session and kept as data/registry/*.json; `--from` that
// file regenerates the feed byte for byte.
//
// THE FALLBACK (the Egger-CDN lesson): if the registry cannot be read, or answers with fewer rows than the
// selection needs, the previous public/materials.json stands and the build reports it. The site never
// fails on the feed.
//
//   node scripts/materials-feed.mjs                       # REST read by the vault names, else the fallback
//   node scripts/materials-feed.mjs --from <rows.json>    # from a registry read kept as data (the session's)
//   node scripts/materials-feed.mjs --check               # read the feed and print its reading, write nothing
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const FEED_PATH = 'public/materials.json'
export const RANGE_PATH = 'data/range.json'
export const MASTERS_PATH = 'data/finish-masters.json'
export const MASTER_FLOOR_PX = 1500
export const DEFAULT_REGISTRY_URL = 'https://uxdrokyxywwezorpvfsp.supabase.co'
export const KEY_NAME = 'STURIJ_ASSETS_READ_KEY'
export const URL_NAME = 'STURIJ_ASSETS_URL'
export const REGISTRY = 'sturij-assets (uxdrokyxywwezorpvfsp)'

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** The tab a decor belongs to: the family from the code's first letter (a rule on the supplier's data), else the family the selection placed it in. */
export function familyOf(row, sel, range) {
  const byCode = row.code ? range.families[String(row.code)[0].toUpperCase()] : undefined
  if (byCode) return { family: byCode, from: 'code' }
  if (sel && sel.family) return { family: sel.family, from: 'placed' }
  return { family: null, from: 'none' }
}

/**
 * The feed from the registry rows and the selection. `rows` is the shape data/registry/*.json keeps (and the
 * REST read assembles): decors with their swatch image and measurement nested. Pure; throws E_FEED_* when the
 * registry did not give what the selection needs — the caller falls back, never writes a thin feed.
 * @param {{ decors?: any[], counts?: any }} rows
 * @param {any} range
 * @param {{ at: string, read: string, read_by?: string | null }} meta
 * @param {{ masters?: Array<Record<string, any>> }} [masters] the finish masters on record (data/finish-masters.json)
 */
export function normalise(rows, range, meta, masters = { masters: [] }) {
  const decorsById = new Map((rows.decors ?? []).map((d) => [d.id, d]))
  const tabsByFamily = new Map(range.tabs.filter((t) => t.family).map((t) => [t.family, t.id]))
  const misfits = []
  const decors = []
  for (const sel of range.decors) {
    const row = decorsById.get(sel.material)
    if (!row) throw Object.assign(new Error(`E_FEED_MISSING: the registry did not return material ${sel.material}${sel.code ? ` (${sel.code})` : ''}`), { code: 'E_FEED_MISSING' })
    if (row.status !== 'published') throw Object.assign(new Error(`E_FEED_UNPUBLISHED: material ${row.id} (${row.name}) is ${row.status}`), { code: 'E_FEED_UNPUBLISHED' })
    if (sel.code && row.code !== sel.code) misfits.push({ kind: 'code-disagrees', material: row.id, name: row.name, note: `the selection says ${sel.code}, the registry ${row.code ?? 'no code'}` })
    const fam = familyOf(row, sel, range)
    if (!fam.family) throw Object.assign(new Error(`E_FEED_UNPLACED: ${row.name} (${row.id}) has no code family and the selection places it nowhere`), { code: 'E_FEED_UNPLACED' })
    const tab = tabsByFamily.get(fam.family)
    if (!tab) throw Object.assign(new Error(`E_FEED_NO_TAB: family ${fam.family} has no tab`), { code: 'E_FEED_NO_TAB' })
    const notes = []
    if (!row.code) { notes.push('no decor code in the registry'); misfits.push({ kind: 'no-code', material: row.id, name: row.name, note: 'in the registry (Egger, published) without a decor code' }) }
    if (fam.from === 'placed') notes.push(`placed in ${tab} ${sel.placed ?? 'by the selection'}`)
    let image = null
    if (row.image && row.image.path) {
      image = { id: row.image.id, path: '/' + String(row.image.path).replace(/^\/+/, ''), width: row.image.width ?? null, height: row.image.height ?? null, bytes: row.image.bytes ?? null, kind: row.image.kind ?? 'swatch', render_ready: !!row.image.render_ready }
      if (typeof row.image.bytes === 'number' && row.image.bytes < 8192) misfits.push({ kind: 'flat-swatch', material: row.id, name: row.name, note: `the registry's swatch file is ${row.image.bytes} bytes — a flat synthetic colour, not the decor's texture; a photographic swatch is owed` })
    } else {
      notes.push('no swatch image in the registry')
      misfits.push({ kind: 'no-image', material: row.id, name: row.name, note: 'no swatch image row in the registry — the tile is labelled until one lands' })
    }
    let colour = null
    if (row.measurement && row.measurement.hex) {
      const m = row.measurement
      colour = { hex: m.hex, oklch: m.oklch ?? null, confidence: m.confidence ?? null, fidelity: m.fidelity ?? null, measured_at: m.measured_at ?? null, by: m.measured_by ?? null }
    } else {
      misfits.push({ kind: 'no-measurement', material: row.id, name: row.name, note: 'no measured colour in the registry (material_measurements) — the vision pass has not run on this decor' })
    }
    decors.push({
      id: row.id, code: row.code ?? null, name: row.name, supplier: row.supplier ?? null,
      family: fam.family, family_from: fam.from, tab,
      finish: row.industry_refs && row.industry_refs.texture_code ? row.industry_refs.texture_code : null,
      texture: row.measurement ? row.measurement.texture ?? null : null,
      colour, image, refs: row.industry_refs ?? {},
      misfit: notes.length ? notes.join('; ') : null,
    })
  }
  for (const n of range.not_in_registry ?? []) misfits.push({ kind: 'not-in-registry', name: n.name, note: `${n.note} (the handoff placed it in ${n.handoff_tab})` })

  const floor = range.handles?.rule?.master_min_short_side_px ?? MASTER_FLOOR_PX
  const handles = (range.handles?.finishes ?? []).map((f) => {
    const id = f.id ?? slug(f.name)
    const m = (masters.masters ?? []).find((x) => x.finish === id)
    const atFloor = !!m && Math.min(m.width ?? 0, m.height ?? 0) >= floor
    if (m && atFloor) {
      // a master on record: a system render (or the maker's file) at the floor — shown, marked, with its caveat
      return { id, name: f.name, supplier: null, image: { id: m.sha256 ? m.sha256.slice(0, 12) : id, path: m.path, width: m.width, height: m.height, bytes: m.bytes ?? null, kind: m.kind ?? 'system' }, held: false, system: (m.kind ?? 'system') === 'system', caveat: m.caveat ?? null, provider: m.provider ?? null, model: m.model ?? null, rendered_at: m.rendered_at ?? null, misfit: null }
    }
    return { id, name: f.name, supplier: null, image: null, held: true, system: false, caveat: null, misfit: m ? `a master is on record at ${m.width}×${m.height}, under the floor of ${floor} px on the short side — held, never upscaled` : 'no finish record in the registry and no master in the library — held: sample at the visit' }
  })
  for (const h of handles) if (h.held) misfits.push({ kind: 'held-finish', name: h.name, note: h.misfit })
  for (const h of handles) if (h.system) misfits.push({ kind: 'system-render', name: h.name, note: `shown as a system render (${h.provider ?? '?'} ${h.model ?? '?'}, ${h.rendered_at ?? '?'}) with the caveat; the maker's photograph replaces it when it lands` })

  const tabs = range.tabs.map((t) => ({ id: t.id, label: t.label, kind: t.kind === 'handle' ? 'handle' : 'material', family: t.family ?? null, tiles: t.kind === 'handle' ? handles.length : decors.filter((d) => d.tab === t.id).length }))
  const emptyTab = tabs.find((t) => t.tiles === 0)
  if (emptyTab) throw Object.assign(new Error(`E_FEED_EMPTY_TAB: ${emptyTab.id} would show nothing`), { code: 'E_FEED_EMPTY_TAB' })

  return {
    snapshot: {
      at: meta.at, registry: REGISTRY, read: meta.read, read_by: meta.read_by ?? null,
      counts: rows.counts ?? null,
      decors: decors.length, coded: decors.filter((d) => d.code).length, with_image: decors.filter((d) => d.image).length, with_colour: decors.filter((d) => d.colour).length,
      handles: handles.length, held: handles.filter((h) => h.held).length, system: handles.filter((h) => h.system).length, misfits: misfits.length,
    },
    rule: range.handles?.rule ?? null,
    tabs, decors, handles, misfits,
  }
}

// ---------- the REST read (by the vault names) ----------

async function rest(base, key, path) {
  const r = await fetch(`${base.replace(/\/$/, '')}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } })
  if (!r.ok) throw new Error(`registry ${r.status} on ${path.split('?')[0]}`)
  return r.json()
}

/** The registry through PostgREST, only the rows the selection names; assembled into the shape normalise reads. */
export async function fetchRegistry(env, range) {
  const key = env[KEY_NAME]
  if (!key) throw Object.assign(new Error(`${KEY_NAME} is not set — the registry is read through a read-only key held in the vault by name`), { code: 'E_NO_KEY' })
  const base = env[URL_NAME] || DEFAULT_REGISTRY_URL
  const ids = range.decors.map((d) => d.material)
  const inIds = `in.(${ids.join(',')})`
  const [materials, images, measurements] = await Promise.all([
    rest(base, key, `materials?select=id,decor_code,name,status,brand_range,industry_refs,updated_at,suppliers(name),categories(slug)&id=${inIds}`),
    rest(base, key, `material_images?select=id,material_id,storage_path,width,height,bytes,kind,render_ready&kind=eq.swatch&material_id=${inIds}&order=created_at.asc`),
    rest(base, key, `material_measurements?select=id,material_id,decor_code,hex,oklch_l,oklch_c,oklch_h,oklch_confidence,texture,texture_confidence,fidelity,measured_at,measured_by&order=measured_at.desc`),
  ])
  if (!Array.isArray(materials) || materials.length === 0) throw Object.assign(new Error('the registry answered with no rows (a key without a read policy sees nothing)'), { code: 'E_FEED_EMPTY' })
  const decors = materials.map((m) => {
    const img = images.find((i) => i.material_id === m.id) ?? null
    const mm = measurements.find((x) => x.material_id === m.id || (m.decor_code && x.decor_code === m.decor_code)) ?? null
    return {
      id: m.id, code: m.decor_code ?? null, name: m.name, status: m.status, supplier: m.suppliers?.name ?? null, category: m.categories?.slug ?? null, industry_refs: m.industry_refs ?? {}, updated_at: m.updated_at,
      image: img ? { id: img.id, path: img.storage_path, width: img.width, height: img.height, bytes: img.bytes, kind: img.kind, render_ready: img.render_ready } : null,
      measurement: mm ? { id: mm.id, hex: mm.hex, oklch: { l: mm.oklch_l, c: mm.oklch_c, h: mm.oklch_h }, confidence: mm.oklch_confidence, texture: mm.texture, texture_confidence: mm.texture_confidence, fidelity: mm.fidelity, measured_at: mm.measured_at, measured_by: mm.measured_by } : null,
    }
  })
  return { read_at: new Date().toISOString(), decors }
}

// ---------- the run ----------

export function readJson(path) { return JSON.parse(readFileSync(path, 'utf8')) }

/**
 * Build the feed and write it; on any failure keep the previous file and report. Returns the reading.
 * @param {{ argv?: string[], env?: Record<string, string | undefined>, cwd?: string, write?: boolean, fetchImpl?: (env: Record<string, string | undefined>, range: any) => Promise<any> }} [opts]
 */
export async function run({ argv = [], env = process.env, cwd = process.cwd(), write = true, fetchImpl } = {}) {
  const range = readJson(`${cwd}/${RANGE_PATH}`)
  const masters = existsSync(`${cwd}/${MASTERS_PATH}`) ? readJson(`${cwd}/${MASTERS_PATH}`) : { masters: [] }
  const previous = existsSync(`${cwd}/${FEED_PATH}`) ? readJson(`${cwd}/${FEED_PATH}`) : null
  const fromArg = argv.indexOf('--from') >= 0 ? argv[argv.indexOf('--from') + 1] : null
  if (argv.includes('--check')) return { mode: 'check', feed: previous, line: previous ? `materials feed: snapshot of ${previous.snapshot.at} (${previous.snapshot.read}) · ${previous.snapshot.decors} decors · ${previous.snapshot.held} finishes held · ${previous.snapshot.misfits} misfits` : 'materials feed: no snapshot' }
  let rows, meta
  try {
    if (fromArg) {
      rows = readJson(fromArg.startsWith('/') || /^[A-Za-z]:/.test(fromArg) ? fromArg : `${cwd}/${fromArg}`)
      meta = { at: rows.read_at, read: `session (${fromArg})`, read_by: rows.read_by ?? null }
    } else {
      rows = await (fetchImpl ?? fetchRegistry)(env, range)
      meta = { at: rows.read_at, read: `rest (${URL_NAME}, ${KEY_NAME} by name)` }
    }
    const feed = normalise(rows, range, meta, masters)
    if (write) writeFileSync(`${cwd}/${FEED_PATH}`, JSON.stringify(feed, null, 2) + '\n')
    return { mode: fromArg ? 'from' : 'rest', feed, line: `materials feed: read ${feed.snapshot.read} at ${feed.snapshot.at} · ${feed.snapshot.decors} decors (${feed.snapshot.coded} coded, ${feed.snapshot.with_image} with an image, ${feed.snapshot.with_colour} with a measured colour) · ${feed.snapshot.handles} finishes, ${feed.snapshot.held} held, ${feed.snapshot.system} system renders · ${feed.snapshot.misfits} misfits → ${FEED_PATH}` }
  } catch (e) {
    const reason = (e && e.code ? e.code + ': ' : '') + String((e && e.message) || e)
    if (!previous) throw Object.assign(new Error(`materials feed: the registry could not be read (${reason}) and no previous ${FEED_PATH} exists — the site cannot build without a feed`), { code: 'E_NO_FEED' })
    return { mode: 'fallback', feed: previous, reason, line: `materials feed: registry not read (${reason}) — the snapshot of ${previous.snapshot.at} stands (${previous.snapshot.decors} decors, ${previous.snapshot.held} finishes held); the site builds on it` }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1].replace(/\\/g, '/').replace(/^([a-z]):/i, (m) => m.toUpperCase()) || (process.argv[1] && process.argv[1].endsWith('materials-feed.mjs'))) {
  run({ argv: process.argv.slice(2) }).then((r) => { console.log(r.line); process.exit(0) }).catch((e) => { console.error(String(e.message || e)); process.exit(1) })
}

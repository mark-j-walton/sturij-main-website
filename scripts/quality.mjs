#!/usr/bin/env node
// The quality run — receipts, not claims. Builds and starts the site (or takes --url <preview>), drives the
// page in a headless browser, measures what is served, and runs Lighthouse. Writes reports/quality-<stamp>.json
// and prints the numbers. Nothing here is a promise: every line is what the run observed.
//
//   node scripts/quality.mjs [--url https://…] [--skip-build] [--no-lighthouse] [--port 3131]
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback }
const has = (name) => args.includes(name)
const PORT = Number(opt('--port', 3131))
const REMOTE = opt('--url', null)
const BASE = REMOTE ? REMOTE.replace(/\/$/, '') : `http://localhost:${PORT}`
const LIGHTHOUSE = !has('--no-lighthouse')
const RENDITION_LIMIT = 800 * 1024
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const report = { at: new Date().toISOString(), base: BASE, checks: [], renditions: {}, lighthouse: {}, console: [] }
const check = (name, pass, detail) => { report.checks.push({ name, pass: !!pass, detail: detail ?? '' }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`) }
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let server = null
async function portFree(port) {
  try { await fetch(`http://localhost:${port}/`); return false } catch { return true }
}
function stopServer() {
  if (!server) return
  // On Windows the spawned shell is not the server: kill the whole tree, or the next run talks to a stale build.
  if (process.platform === 'win32') { try { execFileSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore' }) } catch { /* already gone */ } }
  else server.kill()
  server = null
}
async function startLocal() {
  if (!(await portFree(PORT))) throw new Error(`port ${PORT} is already answering — a stale server would serve a stale build; stop it first (netstat -ano | findstr :${PORT})`)
  if (!has('--skip-build')) {
    console.log('building…')
    execFileSync(npx, ['next', 'build'], { stdio: 'inherit', shell: process.platform === 'win32' })
  }
  server = spawn(npx, ['next', 'start', '-p', String(PORT)], { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' })
  const started = Date.now()
  while (Date.now() - started < 60_000) {
    try { const r = await fetch(BASE + '/'); if (r.status === 200) return } catch { /* not yet */ }
    await sleep(500)
  }
  throw new Error('the server did not answer within 60s')
}

const TINY_JPEG = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAoHBwkHBgoJCAkLCwoMDxkQDw4ODx4WFxIZJCAmJSMgIyIoLTkwKCo2KyIjMkQyNjs9QEBAJjBGS0U+Sjk/QD3/2wBDAQsLCw8NDx0QEB09KSMpPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT3/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKpgA//Z'

async function drive() {
  const browser = await chromium.launch()
  try {
    // 1 · the page as a visitor sees it
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    let probing = false // the enquiry-failure probe below provokes a 502 on purpose; that one is not a page error
    page.on('console', (m) => { if (m.type() === 'error' && !probing) report.console.push(m.text().slice(0, 200)) })
    const t0 = Date.now()
    const res = await page.goto(BASE + '/', { waitUntil: 'load' })
    check('the page answers 200', res?.status() === 200, String(res?.status()))
    check('the title names the site', (await page.title()).startsWith('Sturij'), await page.title())
    await page.waitForFunction(() => !document.getElementById('pageveil') || document.getElementById('pageveil')?.classList.contains('off'), null, { timeout: 4000 }).catch(() => {})
    const veilMs = Date.now() - t0
    check('the veil releases within 2.5 s of load (+ fade)', veilMs <= 3600, `${veilMs} ms`)
    const counts = await page.evaluate(() => ({ copy: document.querySelectorAll('[data-copy-slot]').length, images: document.querySelectorAll('[data-image-slot]').length, source: document.querySelector('main')?.getAttribute('data-content-source'), artifacts: [...document.querySelectorAll('[data-artifact]')].map((e) => e.getAttribute('data-artifact')) }))
    check('copy slots rendered', counts.copy >= 48, `${counts.copy} slots, content source ${counts.source}`)
    check('image slots rendered', counts.images >= 11, `${counts.images} slots`)
    check('the sections declare their artifacts', counts.artifacts.length >= 9, counts.artifacts.join(', '))
    const scaffolding = await page.evaluate(() => document.documentElement.outerHTML.match(/x-dc|data-om-id|ds-base\.js|support\.js|sturij_gemini_key/g)?.length ?? 0)
    check('no editor scaffolding in the DOM', scaffolding === 0, `${scaffolding} markers`)
    const fonts = await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/['"]/g, '')) })
    check('Fraunces, Inter and IBM Plex Mono are loaded from the site itself', ['Fraunces', 'Inter', 'IBM Plex Mono'].every((f) => fonts.some((x) => x.includes(f))), [...new Set(fonts)].join(', '))
    const thirdParty = []
    page.on('request', (r) => { const u = new URL(r.url()); if (!BASE.includes(u.host) && !u.host.includes('localhost')) thirdParty.push(u.host) })
    // scroll the page so every lazy image and every scroll recipe runs
    await page.evaluate(async () => { for (let y = 0; y <= document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)) } window.scrollTo(0, 0) })
    await sleep(800)
    // 2 · what the page serves: every image's current source, its bytes
    const srcs = await page.evaluate(() => [...document.images].map((i) => ({ src: i.currentSrc || i.src, slot: i.getAttribute('data-image-slot') })).filter((x) => x.src && !x.src.startsWith('data:')))
    let maxBytes = 0, masters = 0, over = 0
    const seen = new Set()
    for (const { src, slot } of srcs) {
      if (seen.has(src)) continue
      seen.add(src)
      if (slot && /\/showcase\/[^?]+\.(jpe?g|png|webp)$/.test(src)) masters++
      try {
        const r = await fetch(src)
        const b = (await r.arrayBuffer()).byteLength
        maxBytes = Math.max(maxBytes, b)
        if (b > RENDITION_LIMIT) over++
        report.renditions[src.replace(BASE, '')] = b
      } catch { /* counted below */ }
    }
    check('every served image is a rendition ≤ 800 KB', over === 0 && seen.size > 0, `${seen.size} images, largest ${Math.round(maxBytes / 1024)} KB`)
    check('no image slot serves its master directly', masters === 0, `${masters} masters`)
    check('no third-party requests from the page', thirdParty.length === 0, [...new Set(thirdParty)].join(', ') || 'none')
    // 3 · the configurator in the DOM
    const cfg = await page.evaluate(() => ({ tabs: document.querySelectorAll('.galtabs [role=tab]').length, tiles: document.querySelectorAll('.galmain figure').length, roundel: !!document.getElementById('roundel'), minis: document.querySelectorAll('.gmini').length }))
    check('the configurator renders its four galleries and the roundel', cfg.tabs === 4 && cfg.roundel && cfg.minis === 3 && cfg.tiles > 0, JSON.stringify(cfg))
    // 4 · the enquiry: a failed post shows the fallback; a good post says sent
    probing = true
    await page.route('**/api/enquiry', (route) => route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'probe: down', fallback: { phone: '01937 326011', email: 'contact@sturij.com' } }) }))
    await page.fill('#f-name', 'Quality Probe'); await page.fill('#f-email', 'probe@example.com')
    await page.click('#enquire .submit')
    const fb = await page.waitForSelector('[data-enquiry-fallback]', { timeout: 5000 }).then((e) => e.textContent()).catch(() => null)
    check('a failed enquiry shows the phone and the mailbox', !!fb && fb.includes('01937 326011') && fb.includes('contact@sturij.com'), fb?.slice(0, 80) ?? 'no fallback shown')
    await page.unroute('**/api/enquiry')
    probing = false
    await page.route('**/api/enquiry', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, id: 'probe-0000' }) }))
    await page.fill('#f-name', 'Quality Probe'); await page.fill('#f-email', 'probe@example.com')
    await page.click('#enquire .submit')
    const sent = await page.waitForSelector('#enquire .enq-result', { timeout: 5000 }).then((e) => e.textContent()).catch(() => null)
    check('an accepted enquiry confirms with its reference', !!sent && sent.includes('probe-00'), sent?.slice(0, 60) ?? 'no confirmation')
    // 5 · the admin control exists and says what it can
    await page.click('[data-admin-toggle]')
    const adm = await page.waitForSelector('[data-admin-panel]', { timeout: 3000 }).then((e) => e.textContent()).catch(() => null)
    check('the admin control opens from the footer', !!adm, adm?.slice(0, 90) ?? 'no panel')
    report.adminStatus = adm?.includes('not switched on') ? 'unconfigured (no public names on this deployment)' : adm?.includes('Sign in') ? 'sign-in offered' : 'other'
    await ctx.close()

    // 6 · reduced motion: the licensed variation
    const rctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } })
    const rp = await rctx.newPage()
    await rp.goto(BASE + '/', { waitUntil: 'load' })
    await sleep(600)
    const rm = await rp.evaluate(() => ({ ribbon: [...document.querySelectorAll('.ribbon')].map((e) => getComputedStyle(e).animationName).filter((n) => n !== 'none').length, reveal: [...document.querySelectorAll('.reveal')].filter((e) => getComputedStyle(e).opacity !== '1').length }))
    check('under reduced motion the marquees are static and the reveals are shown', rm.ribbon === 0 && rm.reveal === 0, JSON.stringify(rm))
    await rctx.close()

    // 7 · the phone: no horizontal scroll
    const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const mp = await mctx.newPage()
    await mp.goto(BASE + '/', { waitUntil: 'load' })
    await sleep(500)
    const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    check('the phone view has no horizontal overflow', overflow <= 1, `${overflow} px`)
    await mctx.close()

    // 8 · the doors answer honestly
    const r1 = await fetch(BASE + '/api/render', { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE }, body: JSON.stringify({ room: 'Bedroom', picks: { doors: 'A', carcass: 'B', handle: 'C' }, textures: [TINY_JPEG, TINY_JPEG, TINY_JPEG] }) })
    const j1 = await r1.json().catch(() => ({}))
    report.render = { status: r1.status, code: j1.code ?? (j1.ok ? 'ok' : 'unknown'), model: j1.model }
    check('/api/render answers with a declared outcome', [200, 429, 503].includes(r1.status), `${r1.status} ${j1.code ?? (j1.ok ? 'image ' + j1.label : '')}`)
    const r2 = await fetch(BASE + '/api/render', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
    check('/api/render refuses a cross-origin or empty call', [400, 403].includes(r2.status), String(r2.status))
    // 8b · the swatch placeholders and the call-outs (a fresh page: the visitor's context above is closed)
    const pp = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await pp.goto(BASE + '/', { waitUntil: 'load' })
    await pp.evaluate(() => document.getElementById('wardrobes')?.scrollIntoView())
    await sleep(700)
    const rails = await pp.$$eval('[data-artifact="swatch-rail"]', (els) => els.map((e) => ({ id: e.id, placeholders: Number(e.getAttribute('data-placeholders')), count: Number(e.getAttribute('data-count')) })))
    check('every remixable block and the range show their swatch placeholders on load', rails.length === 5 && rails.reduce((n, r) => n + r.placeholders, 0) === 16 && rails.every((r) => r.count === 0), JSON.stringify(rails))
    const tipsBefore = await pp.$$eval('[data-swatch-tip]', (els) => els.length)
    await pp.click('[data-swatch-tip] .swtip-x').catch(() => {})
    await sleep(300)
    const tipsAfter = await pp.$$eval('[data-swatch-tip]', (els) => els.length)
    const toastText = await pp.$eval('[data-toast]', (e) => e.textContent).catch(() => null)
    check('dismissing one call-out dismisses all and shows the reminder toast', tipsBefore >= 2 && tipsAfter === 0 && !!toastText && /remix the image and the room type/.test(toastText), `${tipsBefore} → ${tipsAfter}; toast: ${toastText?.slice(0, 60) ?? 'none'}`)
    // 8c · the montage: one of three images underneath per visit; back above it with every tile closed, the next takes its place
    const mz = await pp.$eval('#mosaic', (e) => ({ images: Number(e.closest('[data-artifact="montage"]')?.getAttribute('data-images')), index: e.getAttribute('data-image-index'), cols: getComputedStyle(e).getPropertyValue('--cols').trim(), tiles: e.children.length, master: /\/showcase\//.test(getComputedStyle(e).getPropertyValue('--img')) && !/_next\/image/.test(getComputedStyle(e).getPropertyValue('--img')) }))
    await pp.evaluate(() => { const t = document.querySelector('.montage .track'); if (t) scrollTo({ top: t.getBoundingClientRect().top + scrollY + t.clientHeight - innerHeight, behavior: 'instant' }) })
    await sleep(900)
    const onAtEnd = await pp.$$eval('#mosaic .mt.on', (els) => els.length)
    await pp.evaluate(() => { const t = document.querySelector('.montage .track'); if (t) scrollTo({ top: t.getBoundingClientRect().top + scrollY - innerHeight, behavior: 'instant' }) })
    await sleep(900)
    const mz2 = await pp.$eval('#mosaic', (e) => ({ index: e.getAttribute('data-image-index'), slot: e.getAttribute('data-image-slot'), on: e.querySelectorAll('.mt.on').length }))
    report.montage = { images: mz.images, cols: mz.cols, tiles: mz.tiles, from: mz.index, to: mz2.index }
    check('the montage reveals one of three images in square tiles (a rendition, not the master) and swaps to the next when the visitor returns above it', mz.images === 3 && mz.cols === '12' && mz.tiles === 72 && !mz.master && onAtEnd === 72 && mz2.on === 0 && mz2.index !== mz.index, `${mz.images} images · ${mz.cols} cols · ${mz.tiles} tiles · ${onAtEnd} on at the end · back above: image ${mz.index} → ${mz2.index} (${mz2.slot}), ${mz2.on} on`)
    await pp.close()
    // 9 · the calculator page and the band door
    const cp = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await cp.goto(BASE + '/calculator', { waitUntil: 'load' })
    const bandTxt = await cp.waitForSelector('.calc-band[data-band*="-"]', { timeout: 8000 }).then((e) => e.getAttribute('data-band')).catch(() => null)
    check('/calculator prices a band from the table', !!bandTxt, bandTxt ?? 'no band')
    const el = await cp.$eval('svg.elevation', (e) => e.getAttribute('aria-label')).catch(() => null)
    check('/calculator draws the elevation, declared a drawing', !!el && el.includes('not a photograph'), el?.slice(0, 80) ?? 'no elevation')
    await cp.setViewportSize({ width: 390, height: 844 })
    await sleep(400)
    const cOverflow = await cp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    check('/calculator has no horizontal overflow at 390', cOverflow <= 1, `${cOverflow} px`)
    await cp.close()
    const bm = await fetch(BASE + '/api/band').then((r) => r.json()).catch(() => null)
    check('/api/band reads the table (version, review date, checksum)', !!bm?.ok && typeof bm.sha256 === 'string', bm ? `v${bm.version} review ${bm.reviewDate} ${String(bm.sha256).slice(0, 12)}` : 'no answer')
    report.bandTable = bm
    for (const p of ['/studio', '/canvas', '/privacy']) {
      const r = await fetch(BASE + p)
      check(`legacy page ${p} still answers`, r.status === 200, String(r.status))
    }
    check('no console errors', report.console.length === 0, report.console.slice(0, 3).join(' | ') || 'none')
  } finally {
    await browser.close()
  }
}

async function lighthouse() {
  if (!LIGHTHOUSE) return
  mkdirSync('reports', { recursive: true })
  const chrome = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => existsSync(p))
  const PATHS = (opt('--paths', '/,/calculator')).split(',').map((p) => p.trim()).filter(Boolean)
  for (const path of PATHS) for (const form of ['mobile', 'desktop']) {
    const slug = path === '/' ? 'home' : path.replace(/\W+/g, '-').replace(/^-|-$/g, '')
    const out = `reports/lighthouse-${slug}-${form}-${stamp}.json`
    const argv = ['--yes', 'lighthouse@12', BASE + path, '--quiet', '--output=json', `--output-path=${out}`, '--only-categories=performance,accessibility,best-practices,seo', '--chrome-flags=--headless=new --no-sandbox']
    if (form === 'desktop') argv.push('--preset=desktop')
    try {
      execFileSync(npx, argv, { stdio: ['ignore', 'inherit', 'inherit'], shell: process.platform === 'win32', env: { ...process.env, CHROME_PATH: chrome ?? process.env.CHROME_PATH ?? '' }, timeout: 300_000 })
      const lh = JSON.parse(readFileSync(out, 'utf8'))
      const cats = Object.fromEntries(Object.entries(lh.categories).map(([k, v]) => [k, Math.round(v.score * 100)]))
      const audits = lh.audits
      report.lighthouse[`${slug}:${form}`] = { ...cats, lcp_ms: Math.round(audits['largest-contentful-paint']?.numericValue ?? 0), cls: Number((audits['cumulative-layout-shift']?.numericValue ?? 0).toFixed(3)), tbt_ms: Math.round(audits['total-blocking-time']?.numericValue ?? 0), file: out }
      console.log(`LIGHTHOUSE ${path} ${form}: ${JSON.stringify(report.lighthouse[`${slug}:${form}`])}`)
    } catch (e) {
      report.lighthouse[`${slug}:${form}`] = { error: String(e.message ?? e).slice(0, 200) }
      console.log(`LIGHTHOUSE ${path} ${form}: failed — ${report.lighthouse[`${slug}:${form}`].error}`)
    }
  }
}

try {
  if (!REMOTE) await startLocal()
  await drive()
  await lighthouse()
} finally {
  stopServer()
  mkdirSync('reports', { recursive: true })
  const file = `reports/quality-${stamp}.json`
  writeFileSync(file, JSON.stringify(report, null, 2))
  const failed = report.checks.filter((c) => !c.pass)
  console.log(`\nquality: ${report.checks.length - failed.length}/${report.checks.length} checks passed · ${file}`)
  process.exit(failed.length ? 1 : 0)
}

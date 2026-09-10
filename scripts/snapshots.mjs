// Review aid: starts the built site and screenshots every section at desktop and phone widths into the folder given.
//   node scripts/snapshots.mjs <out-dir>   (after next build)
import { spawn, execFileSync } from 'node:child_process'
import { chromium } from 'playwright'
const PORT = 3151, BASE = `http://localhost:${PORT}`, OUT = process.argv[2]
const srv = spawn('npx.cmd', ['next', 'start', '-p', String(PORT)], { stdio: 'ignore', shell: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE + '/')).status === 200) break } catch {} await sleep(500) }
const b = await chromium.launch()
try {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const p = await ctx.newPage()
  await p.goto(BASE + '/', { waitUntil: 'networkidle' })
  await sleep(1200)
  await p.screenshot({ path: `${OUT}/01-hero.png` })
  const shot = async (sel, name, dy = 0) => { const el = await p.$(sel); if (!el) return; await el.scrollIntoViewIfNeeded(); await p.evaluate((d) => window.scrollBy(0, d), dy); await sleep(900); await p.screenshot({ path: `${OUT}/${name}.png` }) }
  await shot('#range', '02-range')
  await p.evaluate(() => { const f = [...document.querySelectorAll('.galmain figure')][2]; f?.querySelector('.tilehit')?.click() }); await sleep(600)
  await p.screenshot({ path: `${OUT}/03-swatch-modal.png` })
  await p.click('.swm .acts .mbtn:not(.ghost)').catch(() => {}); await sleep(600)
  await p.screenshot({ path: `${OUT}/04-swatch-3d.png` })
  await p.keyboard.press('Escape'); await p.click('.swm .mbtn.ghost').catch(() => {}); await sleep(300)
  await shot('#wardrobes', '05-features')
  await shot('.breather', '06-statement')
  await shot('.stackx', '07-stack', 300)
  await shot('.montage', '08-montage', 900)
  await shot('#make', '09-manifesto')
  await shot('#enquire', '10-enquiry')
  await shot('.foot', '11-footer')
  await p.click('[data-admin-toggle]'); await sleep(400); await p.screenshot({ path: `${OUT}/12-admin.png` })
  await ctx.close()
  const m = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const mp = await m.newPage(); await mp.goto(BASE + '/', { waitUntil: 'networkidle' }); await sleep(1000)
  await mp.screenshot({ path: `${OUT}/13-mobile-hero.png` })
  const el = await mp.$('#range'); await el.scrollIntoViewIfNeeded(); await sleep(800); await mp.screenshot({ path: `${OUT}/14-mobile-range.png` })
  await m.close()
} finally {
  await b.close()
  try { execFileSync('taskkill', ['/PID', String(srv.pid), '/T', '/F'], { stdio: 'ignore' }) } catch {}
}
console.log('shots done')

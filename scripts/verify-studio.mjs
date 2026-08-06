/* Studio verify gate — drives /studio in a headless browser and asserts the
   "little things" hold, so regressions are caught before a human sees them.
   Run:  node scripts/verify-studio.mjs [baseUrl]
   Needs Playwright available (global is fine): resolves it via require-ish import.
   Exit code 0 = all pass, 1 = one or more failed. */
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:8099';
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass, detail: detail || '' }); };

const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1400, height: 1000 } });
const dismiss = () => pg.evaluate(() => {
  Array.prototype.slice.call(document.querySelectorAll('button,a')).forEach(function (el) {
    if (/start exploring|explore|begin|got it/i.test(el.textContent || '')) el.click();
  });
});

try {
  await pg.goto(BASE + '/studio.html', { waitUntil: 'networkidle' });
  await pg.waitForTimeout(500); await dismiss(); await pg.waitForTimeout(300);

  // 1) Floor dock has NO inset bevel (::before must cast no shadow)
  const bevel = await pg.evaluate(() => {
    const fb = document.getElementById('floorbar'); if (!fb) return 'no floorbar';
    return getComputedStyle(fb, '::before').boxShadow;
  });
  ok('floor dock: no inset bevel', bevel === 'none' || bevel === '' , 'box-shadow=' + bevel);

  // Panel chrome: close (✕) must NOT show on a carousel (active) panel
  await pg.evaluate(() => { const s = document.getElementById('sidePaint'); if (s && s.classList.contains('idle')) s.click(); });
  await pg.waitForTimeout(200);
  const activeClose = await pg.evaluate(() => {
    const s = document.getElementById('sidePaint');
    const p = s && s.querySelector('.pclose');
    return { active: s && s.classList.contains('active'), disp: p ? getComputedStyle(p).display : 'none' };
  });
  ok('close hidden on carousel (active) panel', activeClose.disp === 'none', JSON.stringify(activeClose));

  // Drive a panel to its large (chosen) state and check the chrome buttons
  const chrome = await pg.evaluate(() => {
    try { fillSide('paint', ['Bancha', '#676a49']); fillSide('board', { s: 'alba-walnut', n: 'Alba Walnut' }); } catch (e) { return { err: e.message }; }
    const circle = (sel) => { const e = document.querySelector(sel); if (!e) return null; const cs = getComputedStyle(e); return { disp: cs.display, radius: cs.borderTopLeftRadius, shadow: cs.boxShadow !== 'none' }; };
    const hdrIds = ['cog', 'cam', 'snip', 'talk', 'closex'];
    const rotBtn = document.getElementById('hrotate');
    const fb = document.getElementById('fillBoard');
    const rotBefore = fb ? fb.style.getPropertyValue('--rot') : null;
    if (rotBtn) rotBtn.click();
    const rotAfter = fb ? fb.style.getPropertyValue('--rot') : null;
    return {
      close: circle('#sideBoard .pclose'),
      fnTag: (function () { const e = document.querySelector('#sideBoard .filled .fn'); if (!e) return null; const cs = getComputedStyle(e); const r = e.getBoundingClientRect(), pr = e.closest('.filled').getBoundingClientRect(); const cx = r.left + r.width / 2, mid = pr.left + pr.width / 2; return { disp: cs.display, hasText: (e.textContent || '').trim().length > 0, frosted: (cs.backdropFilter || cs.webkitBackdropFilter || '').indexOf('blur') >= 0, centred: Math.abs(cx - mid) <= 6 }; })(),
      boardBlurGone: !document.querySelector('#sideBoard .change'),
      paintBlurGone: !document.querySelector('#sidePaint .change'),
      hdrPresent: hdrIds.map((id) => !!document.getElementById(id)),
      hdrHeights: hdrIds.map((id) => { const e = document.getElementById(id); return e ? Math.round(e.getBoundingClientRect().height) : null; }),
      cogEmbossed: (function () { const e = document.getElementById('cog'); return e ? getComputedStyle(e).backgroundImage.indexOf('gradient') >= 0 : false; })(),
      paintClose: circle('#sidePaint .pclose'),
      hblur: !!document.getElementById('hblurR'),
      hrotate: !!rotBtn,
      hctlOn: (function () { const h = document.getElementById('hctl'); return h ? h.classList.contains('on') : false; })(),
      rotBefore: rotBefore, rotAfter: rotAfter,
      padVisible: (function () { const p = document.getElementById('pad'); return p ? getComputedStyle(p).display !== 'none' : false; })(),
      searchClear: (function () { const st = document.getElementById('stab'); if (!st) return true; const sr = st.getBoundingClientRect(); return ['sidePaint', 'sideWorktop', 'sideCarcass', 'sideBoard'].every(function (id) { const s = document.getElementById(id); if (!s || s.style.display === 'none') return true; const e = s.querySelector('.pclose'); if (!e) return true; const r = e.getBoundingClientRect(); const ov = r.right > sr.left && r.left < sr.right && r.bottom > sr.top && r.top < sr.bottom; return !ov; }); })(),
      dock: (function () { const t = document.querySelector('#hctl .hdock-tile'); const h = document.getElementById('hctl'); const nm = document.querySelector('#hctl .hdock-name'); const ctl = document.getElementById('hblurR'); if (!t || !h || !nm || !ctl) return { ok: false }; const row = getComputedStyle(h).flexDirection === 'row'; const tr = t.getBoundingClientRect(), nr = nm.getBoundingClientRect(), cr = ctl.getBoundingClientRect(); const hasTile = tr.width >= 12 && tr.height >= 12; const order = tr.left <= nr.left + 1 && nr.left <= cr.left + 1; return { ok: hasTile && row && order, tile: hasTile, row: row, order: order }; })()
    };
  });
  const round = (c) => c && c.disp !== 'none' && c.shadow && (c.radius === '15px' || parseFloat(c.radius) >= 14);
  ok('✕ = subtle pebble on large panel', round(chrome.close), JSON.stringify(chrome.close));
  ok('centred name tag removed (identity is the drag tab + dock tile)', chrome.fnTag && chrome.fnTag.disp === 'none', JSON.stringify(chrome.fnTag));
  ok('☀ blur pebble removed from samples', chrome.boardBlurGone && chrome.paintBlurGone, JSON.stringify({ board: chrome.boardBlurGone, paint: chrome.paintBlurGone }));
  ok('header toolbar present (Tools/Photo/Snip/Talk/Close)', chrome.hdrPresent && chrome.hdrPresent.every(Boolean), JSON.stringify(chrome.hdrPresent));
  ok('header buttons uniform height', chrome.hdrHeights && chrome.hdrHeights.every((h) => h === chrome.hdrHeights[0]), JSON.stringify(chrome.hdrHeights));
  ok('header buttons gold-embossed', chrome.cogEmbossed, 'gradient=' + chrome.cogEmbossed);
  ok('paint panel keeps its ✕', round(chrome.paintClose), JSON.stringify(chrome.paintClose));
  ok('header shows blur slider on select', chrome.hblur && chrome.hctlOn, JSON.stringify({ hblur: chrome.hblur, on: chrome.hctlOn }));
  ok('dock: one horizontal row — live tile · name · controls', chrome.dock && chrome.dock.ok, JSON.stringify(chrome.dock));
  ok('header shows rotate on textured sample', chrome.hrotate, 'rotate=' + chrome.hrotate);
  ok('rotate turns the grain (--rot → 90deg)', chrome.rotAfter === '90deg' && chrome.rotBefore !== '90deg', 'before=' + chrome.rotBefore + ' after=' + chrome.rotAfter);
  ok('panel buttons clear of the Search tab', chrome.searchClear, 'clear=' + chrome.searchClear);
  ok('post-it pad visible', chrome.padVisible, 'visible=' + chrome.padVisible);

  // reset chosen state so the property checks below start clean
  await pg.reload({ waitUntil: 'networkidle' }); await pg.waitForTimeout(400); await dismiss(); await pg.waitForTimeout(200);

  // Open properties, turn several panels on
  await pg.evaluate(() => document.getElementById('cog').click());
  await pg.waitForTimeout(300);
  await pg.evaluate(() => ['floor','worktop','carcass','ceiling','skirting'].forEach(function (k) {
    const c = document.querySelector('[data-mat="' + k + '"]'); if (c && !c.checked) c.click();
  }));
  await pg.waitForTimeout(400);

  // 2) Panel-widths hint appears exactly once (no duplication as panels are added)
  const hints = await pg.evaluate(() => document.querySelectorAll('.pwhint').length && document.querySelectorAll('#pgrid ~ .pwhint, .msec .pwhint').length);
  const hintCountInLayout = await pg.evaluate(() => {
    const g = document.getElementById('pgrid'); if (!g) return -1;
    return g.parentNode.querySelectorAll('.pwhint').length;
  });
  ok('layout hint not duplicated', hintCountInLayout === 1, 'count=' + hintCountInLayout);

  // 3) Every visible width slider has a title from the panel list
  const titled = await pg.evaluate(() => {
    const rows = Array.prototype.slice.call(document.querySelectorAll('#pgrid .pwrow'));
    return rows.length > 0 && rows.every(function (r) { return (r.querySelector('.pl') || {}).textContent; });
  });
  ok('every width slider titled', titled);

  // 4) Floor depth slider drives --floorh
  await pg.evaluate(() => { const r = document.getElementById('flh'); if (r) { r.value = 240; r.dispatchEvent(new Event('input', { bubbles: true })); } });
  await pg.waitForTimeout(200);
  const floorh = await pg.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--floorh').trim());
  ok('floor depth slider drives --floorh', floorh === '240px', '--floorh=' + floorh);

  // 5) Persistence: change swatch height, reload, assert it stuck
  await pg.evaluate(() => { const r = document.getElementById('swh'); if (r) { r.value = 118; r.dispatchEvent(new Event('input', { bubbles: true })); } });
  await pg.waitForTimeout(300);
  await pg.reload({ waitUntil: 'networkidle' }); await pg.waitForTimeout(500); await dismiss(); await pg.waitForTimeout(300);
  const after = await pg.evaluate(() => ({
    swh: getComputedStyle(document.documentElement).getPropertyValue('--swh').trim(),
    floorbarOn: document.getElementById('floorbar') && document.getElementById('floorbar').classList.contains('on')
  }));
  ok('settings persist across refresh', after.swh === '118px' && after.floorbarOn === true, JSON.stringify(after));

  // Drag-to-reorder: grip on each panel, drop-target bar, order changes + persists
  const gripsOk = await pg.evaluate(() => document.querySelectorAll('.pgrip').length >= 2 && !!document.querySelector('.dropbar'));
  ok('drag grips + drop bar present', gripsOk);
  const ord0 = await pg.evaluate(() => (JSON.parse(localStorage.getItem('sturij.studio.props') || '{}').order) || []);
  const g = await pg.evaluate(() => { const e = document.querySelector('#sidePaint .pgrip'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; });
  if (g) { await pg.mouse.move(g.x, g.y); await pg.mouse.down(); await pg.mouse.move(1150, g.y, { steps: 12 }); await pg.waitForTimeout(80); await pg.mouse.up(); await pg.waitForTimeout(250); }
  const ord1 = await pg.evaluate(() => (JSON.parse(localStorage.getItem('sturij.studio.props') || '{}').order) || []);
  ok('drag reorders panels + persists', g && ord0[0] === 'wall' && ord1[0] !== 'wall' && JSON.stringify(ord0) !== JSON.stringify(ord1), 'before=' + JSON.stringify(ord0) + ' after=' + JSON.stringify(ord1));

} catch (e) {
  ok('run completed', false, String(e && e.message || e));
} finally {
  await b.close();
}

let failed = 0;
console.log('\n=== studio verify ===');
for (const r of results) { if (!r.pass) failed++; console.log((r.pass ? 'PASS ' : 'FAIL ') + r.name + (r.detail ? '  (' + r.detail + ')' : '')); }
console.log('---------------------');
console.log(failed ? (failed + ' FAILED') : 'all ' + results.length + ' passed');
process.exit(failed ? 1 : 0);

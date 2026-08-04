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
    const g = (sel, prop) => { const e = document.querySelector(sel); return e ? getComputedStyle(e)[prop] : null; };
    const circle = (sel) => { const e = document.querySelector(sel); if (!e) return null; const cs = getComputedStyle(e); return { disp: cs.display, radius: cs.borderTopLeftRadius, shadow: cs.boxShadow !== 'none' }; };
    const leftOf = (sel) => { const e = document.querySelector(sel); return e ? Math.round(e.getBoundingClientRect().left) : null; };
    return {
      close: circle('#sideBoard .pclose'),
      blur: circle('#sideBoard .change'),
      camShadow: g('#cam', 'boxShadow') !== 'none',
      camShow: document.getElementById('cam').classList.contains('show'),
      paintBlur: circle('#sidePaint .change'),
      paintClose: circle('#sidePaint .pclose'),
      paintBlurLeft: leftOf('#sidePaint .change'),
      paintCloseLeft: leftOf('#sidePaint .pclose'),
      padVisible: (function () { const p = document.getElementById('pad'); return p ? getComputedStyle(p).display !== 'none' : false; })()
    };
  });
  const round = (c) => c && c.disp !== 'none' && c.shadow && (c.radius === '15px' || parseFloat(c.radius) >= 14);
  ok('close = black circle + depth, on large panel', round(chrome.close), JSON.stringify(chrome.close));
  ok('blur = black circle + depth, on large panel', round(chrome.blur), JSON.stringify(chrome.blur));
  ok('camera has depth', chrome.camShadow && chrome.camShow, 'shadow=' + chrome.camShadow + ' show=' + chrome.camShow);
  ok('paint (left) panel keeps blur + close', round(chrome.paintBlur) && round(chrome.paintClose), 'blur=' + JSON.stringify(chrome.paintBlur) + ' close=' + JSON.stringify(chrome.paintClose));
  ok('left panel buttons on the LEFT (clear of Search)', chrome.paintBlurLeft !== null && chrome.paintBlurLeft <= 40 && chrome.paintCloseLeft <= 40, 'blurLeft=' + chrome.paintBlurLeft + ' closeLeft=' + chrome.paintCloseLeft);
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

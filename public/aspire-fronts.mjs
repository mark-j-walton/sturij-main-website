// tools/aspire-fronts.mjs — HPP Aspire fronts drawn as SVG, in millimetres, from a measured style spec
// (recovery/hpp-aspire-front-geometry-2026-09-30.json). layout() decides where the frame, panels and lines
// go and names the rule it used; frontSvg() draws that layout in a colour, lit from the top left as in HPP's
// pictures. The drawing is the render reference for a style HPP gives no full-size picture of: it carries the
// real profile at true proportions, so the image model is not left to invent it.
//
// A spec is one of three families:
//   framed  panels routed into the board: a frame (stile, top, bottom, mid rail), an edge profile, and shaped
//           panel edges traced from HPP's pictures; optional grooves, joint lines, 2 columns
//   slab    a flat board: routed lines, an edge line all round, a cut-in handle, a wave band
//   open    a frame with glazed openings, optionally fluted
// Every length is mm; a profile is [[u, bulge]] across half a panel (u 0 to 0.5), mirrored for the other half.

const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const rgbHex = (c) => '#' + c.map((v) => clamp(v).toString(16).padStart(2, '0')).join('');

// Colour in OKLCH (Björn Ottosson's OKLab, polar). Shading changes lightness and keeps hue and chroma, so a shadow
// on a red door is a deeper red, not a grey: mixing towards black or white in sRGB greys a colour out.
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const gam = (v) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
export function toOklch(hex) {
  const [r, g, b] = hexRgb(hex).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}
function oklchRgb(L, C, H) {
  const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}
// back to sRGB, bringing chroma in until the colour fits the gamut (hue and lightness kept)
export function fromOklch(L, C, H) {
  L = Math.max(0, Math.min(1, L));
  const inside = (c) => oklchRgb(L, c, H).every((v) => v >= -1e-4 && v <= 1 + 1e-4);
  let lo = 0, hi = C;
  if (!inside(C)) { for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (inside(mid)) lo = mid; else hi = mid; } C = lo; }
  return rgbHex(oklchRgb(L, C, H).map((v) => gam(Math.max(0, Math.min(1, v)))));
}
// a colour given as hex or as oklch, lightness as a percentage (the registry's 'oklch(51.40% 0.0721 29.10)') or a
// number from 0 to 1 ('oklch(0.84 0 0)'), as CSS takes it. Anything else is an error, never a drawing in no colour.
export function hexOf(colour) {
  const c = String(colour ?? '').trim();
  const m = /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)\s*\)$/i.exec(c);
  if (m) return fromOklch(m[2] ? +m[1] / 100 : +m[1], +m[3], +m[4]);
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  throw new Error(`colour ${colour} is not a hex #rrggbb or oklch(L C H)`);
}
// lighter (f > 0) or darker (f < 0) in OKLCH lightness; highlights ease the chroma a little, shadows keep it
export const shade = (hex, f) => {
  const [L, C, H] = toOklch(hex);
  return f > 0 ? fromOklch(L + (1 - L) * f, C * (1 - 0.3 * f), H) : fromOklch(L * (1 + f), C, H);
};
const r1 = (v) => Math.round(v * 10) / 10;

// Glass colours are stand-ins until HPP's glazing swatches are measured.
const GLASS = {
  MIRROR: ['#e8ecef', '#aab3ba'], 'SILVER GREY MIRROR': ['#c3c8cc', '#7d858b'], 'BRONZE MIRROR': ['#c9b39f', '#7c6553'],
  CLEAR: ['#cfdcdc', '#8fa4a6'], 'CLEAR GREY': ['#a9b0b2', '#6d7477'], FROSTED: ['#eef1f1', '#cfd6d6'], OBSCURE: ['#e6eaea', '#c3cbcb'],
  BLACK: ['#3a3a3a', '#111111'], 'PURE WHITE': ['#fbfbf9', '#e2e2df'], 'STORM GREY': ['#6d7276', '#43474a'],
};

// The pieces a spec can lay out, keyed by HPP's component code.
export const PIECES = {
  WD: 'Wardrobe Door', CSWD: 'Classic Square Wardrobe Door', D: 'Door', DR: 'Drawer', HGD: 'Drawer With Centre Panel',
  TFWD: 'Open Top Frame', TFBFWD: 'Top and Bottom Open Frame', FD: 'Open Frame', EP: 'End Panel',
  '1HDR': 'Drawer, Single Handle', '2HDR': 'Drawer, Dual Handle',
};

function equalRows(top, bottom, mid, n) {
  const h = (bottom - top - mid * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) => [top + i * (h + mid), top + i * (h + mid) + h]);
}

// The bulge of a shaped edge at u (0..1 across a panel w mm wide): a circular arc of a given rise, or a traced
// half-profile mirrored about the centre.
function bulge(shape, u, w) {
  if (!shape) return 0;
  if (shape.arc) {
    const r = shape.arc, R = (w * w / 4 + r * r) / (2 * r), dx = w * (0.5 - u);
    return Math.max(0, Math.sqrt(Math.max(0, R * R - dx * dx)) - (R - r));
  }
  const profile = shape.profile;
  const v = u > 0.5 ? 1 - u : u;
  for (let i = 1; i < profile.length; i++) {
    const [u0, b0] = profile[i - 1], [u1, b1] = profile[i];
    if (v <= u1) return b0 + (b1 - b0) * ((v - u0) / (u1 - u0 || 1));
  }
  return profile[profile.length - 1][1];
}

export function layout(spec, piece) {
  const { code, H, W } = piece;
  const out = { H, W, family: spec.family || 'framed', panels: [], joints: [], plain: false, rules: [] };
  const plain = spec.plainBelow || {};
  if ((plain.width && W < plain.width) || (plain.height && H < plain.height)) { out.plain = true; out.rules.push('plain: below HPP size for a panel'); return out; }
  if (out.family === 'slab') { out.rules.push('slab'); return out; }
  if (code === '1HDR' || code === '2HDR') throw new Error(`${code} is a slab style's drawer`);
  const f = spec.frame;
  let stile = f.stile, top = f.top, bottom = f.bottom, mid = f.mid;
  let rows, rowShapes = [];
  if (code === 'DR' || code === 'HGD') {
    const d = spec.drawer || {};
    if (code === 'DR' && !d.framed) { out.plain = true; out.rules.push('plain drawer front'); return out; }
    const dp = d.plainBelow || {};
    if ((dp.height && H < dp.height) || (dp.width && W < dp.width)) { out.plain = true; out.rules.push('plain: drawer below HPP size for a panel'); return out; }
    const small = d.small && H >= d.small.from && H <= d.small.to;
    const rail = small ? d.small.rail : (d.rail ?? stile);
    if (small) out.rules.push(`rail ${rail} mm: drawer ${d.small.from}–${d.small.to} high (HPP note)`);
    stile = d.stile ?? stile; top = rail; bottom = rail;
    rows = [[top, H - bottom]];
  } else if (code === 'WD' || code === 'TFWD' || code === 'TFBFWD') {
    const wd = spec.wardrobe;
    if (wd.midFromBottom) {
      const c = H - wd.midFromBottom; // mid rail centre, measured from the floor end
      rows = [[top, c - mid / 2], [c + mid / 2, H - bottom]];
      out.rules.push(`mid rail centred ${wd.midFromBottom} mm from the bottom`);
    } else if (wd.single) {
      rows = [[top, H - bottom]];
      out.rules.push('one full-height panel');
    } else {
      rows = equalRows(top, H - bottom, mid, wd.panels);
      out.rules.push(`${wd.panels} equal ${out.family === 'open' ? 'openings' : 'panels'}`);
    }
  } else if (code === 'CSWD') {
    const n = piece.panels || 2;
    rows = equalRows(top, H - bottom, mid, n);
    out.rules.push(`${n} equal panels (Classic Square)`);
  } else if (code === 'D' || code === 'FD' || code === 'EP') {
    rows = equalRows(top, H - bottom, mid, (spec.door && spec.door.panels) || 1);
  } else throw new Error(`no layout for ${code}`);

  // shaped edges: the top of the first row; the meeting edges of a two-row wardrobe door; the bottom of the last
  const wardrobeLike = code === 'WD' || code === 'TFWD' || code === 'TFBFWD';
  rows.forEach((_, i) => rowShapes.push({
    top: i === 0 && code !== 'DR' && code !== 'HGD' ? spec.top ?? null : i === 1 && wardrobeLike ? spec.lowerTop ?? null : null,
    bottom: i === rows.length - 1 && wardrobeLike ? spec.bottom ?? null : i === 0 && rows.length === 2 && wardrobeLike ? spec.upperBottom ?? null : null,
  }));

  const cols = spec.cols === 2 && W >= (spec.colsFrom || 350) ? 2 : 1;
  if (spec.cols === 2 && cols === 1) out.rules.push('single panel: narrower than HPP makes two');
  const inner = W - 2 * stile, ms = spec.frame.midStile || mid;
  const colX = cols === 2 ? [[stile, (inner - ms) / 2], [stile + (inner + ms) / 2, (inner - ms) / 2]] : [[stile, inner]];

  const fills = piece.fills || [];
  const openDefault = out.family === 'open' ? 'glass:' + (spec.glass || 'CLEAR') : null;
  rows.forEach(([y0, y1], i) => {
    let fill = fills[i] || openDefault || 'panel';
    if (!fills[i] && ((code === 'TFWD' && i === 0) || code === 'TFBFWD' || code === 'FD')) fill = 'glass:MIRROR';
    const glass = fill.startsWith('glass:');
    for (const [x, w] of colX) {
      out.panels.push({
        x, y: y0, w, h: y1 - y0, fill,
        top: glass ? null : rowShapes[i].top, bottom: glass ? null : rowShapes[i].bottom,
        grooves: !glass && spec.grooves && code !== 'HGD' ? spec.grooves : null,
      });
    }
  });
  if (spec.jointInset != null) {
    const j = spec.jointInset;
    out.joints.push([j, 0, j, H], [W - j, 0, W - j, H]);
  }
  return out;
}

// A panel outline with shaped top and bottom edges, inset by `o`, as a smooth path.
function panelPath(p, o = 0, radius = 0) {
  const x = p.x + o, y = p.y + o, w = p.w - 2 * o, h = p.h - 2 * o;
  if (!p.top && !p.bottom) {
    const r = Math.max(0, Math.min(radius - o * 0.5, w / 2, h / 2));
    if (!r) return `M${r1(x)},${r1(y)}H${r1(x + w)}V${r1(y + h)}H${r1(x)}Z`;
    return `M${r1(x + r)},${r1(y)}H${r1(x + w - r)}Q${r1(x + w)},${r1(y)} ${r1(x + w)},${r1(y + r)}V${r1(y + h - r)}Q${r1(x + w)},${r1(y + h)} ${r1(x + w - r)},${r1(y + h)}H${r1(x + r)}Q${r1(x)},${r1(y + h)} ${r1(x)},${r1(y + h - r)}V${r1(y + r)}Q${r1(x)},${r1(y)} ${r1(x + r)},${r1(y)}Z`;
  }
  const N = 40, pts = [];
  for (let i = 0; i <= N; i++) pts.push([x + (w * i) / N, y - bulge(p.top, i / N, w)]);
  for (let i = N; i >= 0; i--) pts.push([x + (w * i) / N, y + h + bulge(p.bottom, i / N, w)]);
  return 'M' + pts.map(([a, b]) => `${r1(a)},${r1(b)}`).join('L') + 'Z';
}

// y of the panel's top edge at x (for grooves that stop under a shaped top)
const topAt = (p, x) => p.y - bulge(p.top, (x - p.x) / p.w, p.w);

function slabLines(spec, W, H, dark, lite) {
  const o = [], line = (x1, y1, x2, y2, s = 2) => o.push(`<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="${dark}" stroke-width="${s}" stroke-opacity=".55"/><line x1="${r1(x1 + s)}" y1="${r1(y1 + (x1 === x2 ? 0 : s))}" x2="${r1(x2 + s)}" y2="${r1(y2 + (x1 === x2 ? 0 : s))}" stroke="${lite}" stroke-width="${s * 0.6}" stroke-opacity=".65"/>`);
  for (const s of spec.sideLines || []) for (const d of s.at) {
    if (s.side !== 'right') line(d, 0, d, H);
    if (s.side !== 'left') line(W - d, 0, W - d, H);
  }
  for (const d of spec.outerLines || []) { line(d, d, d, H - d); line(W - d, d, W - d, H - d); line(d, d, W - d, d); line(d, H - d, W - d, H - d); }
  for (const f of spec.hLines || []) line(0, H * f, W, H * f);
  for (const d of spec.vFromCentre || []) { line(W / 2 - d, 0, W / 2 - d, H); line(W / 2 + d, 0, W / 2 + d, H); }
  if (spec.bowLines) { // lines that bow in towards the middle (Chardonnay)
    const { inset, bow } = spec.bowLines;
    for (const side of [1, -1]) {
      const x0 = side > 0 ? inset : W - inset, xm = x0 + side * bow;
      o.push(`<path d="M${x0},0Q${r1(2 * xm - x0)},${H / 2} ${x0},${H}" fill="none" stroke="${dark}" stroke-width="2" stroke-opacity=".55"/><path d="M${x0 + 2},0Q${r1(2 * xm - x0 + 2)},${H / 2} ${x0 + 2},${H}" fill="none" stroke="${lite}" stroke-width="1.2" stroke-opacity=".65"/>`);
    }
  }
  if (spec.wave) { // a band of wavy routed lines (Sahara)
    const { x0, x1, n = 10, amp = 11, period = 170 } = spec.wave;
    for (let i = 0; i < n; i++) {
      const cx = x0 + ((x1 - x0) * (i + 0.5)) / n, ph = i * 1.3, pts = [];
      for (let y = 0; y <= H; y += 12) pts.push(`${r1(cx + amp * Math.sin((2 * Math.PI * y) / (period * (0.85 + 0.1 * (i % 3))) + ph))},${y}`);
      o.push(`<path d="M${pts.join('L')}" fill="none" stroke="${dark}" stroke-width="3.4" stroke-opacity=".6"/><path d="M${pts.join('L')}" fill="none" stroke="${lite}" stroke-width="2" stroke-opacity=".6" transform="translate(3,0)"/>`);
    }
  }
  return o.join('');
}

// Handles in the board: a notch (cut through), a scoop (a deep curved recess at the edge), a cove (a long shallow
// one), a J-pull (a groove along the edge, dark to the edge).
function handleCuts(spec, W, H) {
  const cut = [], shadow = [];
  for (const h of spec.handles || []) {
    const xEdge = h.side === 'left' ? 0 : W, dir = h.side === 'left' ? 1 : -1, yc = H * h.y;
    if (h.kind === 'notch') {
      const x = h.side === 'left' ? 0 : W - h.depth, r = Math.min(8, h.depth / 2);
      cut.push(`<rect x="${r1(x - (h.side === 'left' ? r : 0))}" y="${r1(yc - h.height / 2)}" width="${h.depth + r}" height="${h.height}" rx="${r}"/>`);
    } else if (h.kind === 'scoop' || h.kind === 'cove') {
      const half = h.chord / 2, d = h.depth, R = (half * half + d * d) / (2 * d), cx = xEdge + dir * (d - R);
      const path = `M${xEdge},${r1(yc - half)}A${r1(R)},${r1(R)} 0 0 ${dir > 0 ? 1 : 0} ${xEdge},${r1(yc + half)}Z`;
            shadow.push({ path, kind: h.kind, cx });
    } else if (h.kind === 'jpull') shadow.push({ kind: 'jpull', x: xEdge + dir * h.inset, dir, inset: h.inset });
  }
  return { cut, shadow };
}

export function frontSvg(spec, piece, { colour, scale = 0.25, id = 'f', light = 'even' } = {}) {
  colour = hexOf(colour);
  const L = layout(spec, piece), { H, W } = L;
  const dark = shade(colour, -0.42), deep = shade(colour, -0.6), lite = shade(colour, 0.35), mid = shade(colour, -0.025);
  const edge = spec.edge || { kind: 'square', steps: [0], width: 4 };
  const steps = edge.steps || [0], w = edge.width || 4;
  const o = [];
  o.push(`<defs>`);
  // light: 'even' is the render reference (true colour, no light laid over it); 'studio' rakes light across the
  // door from the top left, as the project book does, in the door's own colour lighter and deeper (OKLCH), with a
  // fine grain the light picks up
  if (light === 'studio') o.push(`<radialGradient id="${id}l" gradientUnits="userSpaceOnUse" cx="${r1(W * 0.1)}" cy="${r1(H * 0.06)}" r="${r1(Math.hypot(W, H) * 1.05)}"><stop offset="0" stop-color="${shade(colour, 0.4)}" stop-opacity=".5"/><stop offset=".4" stop-color="${shade(colour, 0.12)}" stop-opacity=".12"/><stop offset=".72" stop-color="${colour}" stop-opacity="0"/><stop offset="1" stop-color="${shade(colour, -0.55)}" stop-opacity=".6"/></radialGradient><filter id="${id}n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .08 0"/></filter>`);
  for (const [k, [a, b]] of Object.entries(GLASS)) o.push(`<linearGradient id="${id}g${k.replace(/\W/g, '')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".42" stop-color="${b}"/><stop offset=".5" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`);
  o.push(`<filter id="${id}b" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="${edge.soft ?? 1.8}"/></filter>`);
  o.push(`<filter id="${id}B" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>`);
  const hc = handleCuts(spec, W, H);
  if (hc.cut.length) o.push(`<mask id="${id}m"><rect width="${W}" height="${H}" fill="#fff"/><g fill="#000">${hc.cut.join('')}</g></mask>`);
  o.push('</defs>');
  o.push(`<g${hc.cut.length ? ` mask="url(#${id}m)"` : ''}>`);
  o.push(`<rect width="${W}" height="${H}" fill="${colour}"/>`);
  if (spec.flutes) for (let x = spec.flutes.pitch / 2; x < W; x += spec.flutes.pitch) o.push(`<line x1="${r1(x)}" y1="0" x2="${r1(x)}" y2="${H}" stroke="${dark}" stroke-width="2.2" stroke-opacity=".45"/><line x1="${r1(x + 3)}" y1="0" x2="${r1(x + 3)}" y2="${H}" stroke="${lite}" stroke-width="2" stroke-opacity=".5"/>`);
  if (!L.plain || L.family === 'slab') o.push(slabLines(spec, W, H, dark, lite));
  for (const [x1, y1, x2, y2] of L.joints) o.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${dark}" stroke-width="1.6" stroke-opacity=".7"/><line x1="${x1 + 1.6}" y1="${y1}" x2="${x2 + 1.6}" y2="${y2}" stroke="${lite}" stroke-width="1.2" stroke-opacity=".6"/>`);
  let ci = 0;
  for (const p of L.panels) {
    const d0 = panelPath(p, 0, spec.radius);
    if (p.fill.startsWith('glass:')) {
      const k = p.fill.slice(6).toUpperCase(), g = GLASS[k] ? k.replace(/\W/g, '') : 'MIRROR';
      o.push(`<path d="${d0}" fill="url(#${id}g${g})"/>`);
      o.push(`<path d="${d0}" fill="none" stroke="${deep}" stroke-width="5" stroke-opacity=".55" transform="translate(1.5,1.5)"/><path d="${d0}" fill="none" stroke="${lite}" stroke-width="2" stroke-opacity=".8" transform="translate(-1,-1)"/>`);
      continue;
    }
    // each step of the edge profile: a soft shadow inside its top and left, a soft highlight inside its bottom
    // and right, clipped to that step, then a fine line for the cut
    steps.forEach((s, i) => {
      const d = panelPath(p, s, spec.radius), cid = `${id}c${ci++}`;
      const strong = edge.kind === 'shaker' ? 0.6 : edge.kind === 'line' ? 0.25 : 0.45;
      if (i === steps.length - 1) o.push(`<path d="${d}" fill="${mid}"/>`);
      o.push(`<clipPath id="${cid}"><path d="${d}"/></clipPath><g clip-path="url(#${cid})">`);
      o.push(`<path d="${d}" fill="none" stroke="${deep}" stroke-width="${w * 1.5}" stroke-opacity="${strong}" filter="url(#${id}b)" transform="translate(${w * 0.45},${w * 0.45})"/>`);
      o.push(`<path d="${d}" fill="none" stroke="${lite}" stroke-width="${w * 1.4}" stroke-opacity=".55" filter="url(#${id}b)" transform="translate(${-w * 0.7},${-w * 0.7})"/>`);
      o.push('</g>');
      o.push(`<path d="${d}" fill="none" stroke="${dark}" stroke-width="1.1" stroke-opacity="${i === 0 ? 0.55 : 0.4}"/>`);
    });
    if (p.grooves) {
      const q = panelPath(p, steps[steps.length - 1]), inset = steps[steps.length - 1];
      const { pitch, phase = 0 } = p.grooves, cx = p.x + p.w / 2 + phase * pitch, lim = p.w / 2 - inset - pitch / 3;
      const cid = `${id}c${ci++}`;
      o.push(`<clipPath id="${cid}"><path d="${q}"/></clipPath><g clip-path="url(#${cid})">`);
      for (let k = -20; k <= 20; k++) {
        const gx = cx + k * pitch;
        if (Math.abs(gx - (p.x + p.w / 2)) > lim) continue;
        const y0 = topAt(p, gx) + inset, y1 = p.y + p.h + bulge(p.bottom, (gx - p.x) / p.w, p.w);
        o.push(`<line x1="${r1(gx)}" y1="${r1(y0)}" x2="${r1(gx)}" y2="${r1(y1)}" stroke="${dark}" stroke-width="2.4" stroke-opacity=".55"/><line x1="${r1(gx + 2.4)}" y1="${r1(y0)}" x2="${r1(gx + 2.4)}" y2="${r1(y1)}" stroke="${lite}" stroke-width="1.4" stroke-opacity=".7"/>`);
      }
      o.push('</g>');
    }
  }
  for (const s of hc.shadow) {
    if (s.kind === 'jpull') {
      const x0 = Math.min(s.x, s.x - s.dir * s.inset), gid = `${id}j${ci++}`;
      o.push(`<linearGradient id="${gid}" x1="${s.dir > 0 ? 1 : 0}" y1="0" x2="${s.dir > 0 ? 0 : 1}" y2="0"><stop offset="0" stop-color="${deep}" stop-opacity=".25"/><stop offset=".55" stop-color="${deep}" stop-opacity=".85"/><stop offset="1" stop-color="${deep}" stop-opacity=".45"/></linearGradient>`);
      o.push(`<rect x="${r1(x0)}" y="0" width="${s.inset}" height="${H}" fill="url(#${gid})"/><line x1="${s.x}" y1="0" x2="${s.x}" y2="${H}" stroke="${lite}" stroke-width="1.5" stroke-opacity=".7"/>`);
    }
    else o.push(`<path d="${s.path}" fill="${s.kind === 'scoop' ? deep : dark}" opacity="${s.kind === 'scoop' ? 0.7 : 0.3}" filter="url(#${id}${s.kind === 'scoop' ? 'b' : 'B'})"/><path d="${s.path}" fill="none" stroke="${dark}" stroke-width="1.5" stroke-opacity=".6"/>`);
  }
  if (light === 'studio') o.push(`<rect width="${W}" height="${H}" filter="url(#${id}n)" style="mix-blend-mode:overlay"/><rect width="${W}" height="${H}" fill="url(#${id}l)"/>`);
  o.push(`<rect x=".75" y=".75" width="${W - 1.5}" height="${H - 1.5}" fill="none" stroke="${dark}" stroke-width="1.5" stroke-opacity=".6"/>`);
  o.push('</g>');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${Math.round(W * scale)}" height="${Math.round(H * scale)}">${o.join('')}</svg>`;
}

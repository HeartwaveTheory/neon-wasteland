// FLANKS: the two side areas left and right of the HQ, plus the south cliffs.
//
//   lumber camp (bottom left)  -> "RUST BUCKET" chop shop: a bandit shanty camp in the pines.
//       corrugated garage with a roll-up door, an A-frame engine hoist over a car on
//       cinder blocks, a welder's spark, tyre stacks, a scrap heap, a fire barrel,
//       a NOODS noodle stall (magenta neon), string lights.
//   quarry (bottom right)      -> JUNK KING salvage yard: container stacks against the
//       old quarry face, a magnet crawler crane dangling a car, a crushed-car cube
//       stack, floodlights, a pole sign.
//   south edge                 -> quiet: spray tags on the cliff faces, a NO DUMPING
//       sign with dumped junk, a drain pipe leaking coolant.
//
// Owner: flanks. Coordinates are 2x map px. Light: upper-left; depth recedes up-right
// (kit convention: depth d -> 0.22 d right, 0.5 d up).
import { P, MP, f } from '../mapkit.mjs';

const INK = P.ink;
const SHADOW = '#22172e';
const STL = ['#c4cbc9', '#8c969a', '#5c6273', '#3d4152', '#272a36'];
const RST = ['#de8f52', '#b0612f', '#7a3f22', '#4e2414'];
const TIN = ['#cfc8b8', '#a19a8c', '#6a6372', '#47414f'];
const YEL = ['#f6d35c', '#d9a62f', '#94692c', '#5c401b'];
const TEAL = ['#7cc4b7', '#4f978d', '#336368', '#1f4046'];
const OLIVE = ['#a6a77e', '#7f8160', '#55594a', '#3a3d34'];
const CIND = ['#bdb5a6', '#948c7e', '#655f66', '#45404a'];
const RUB = ['#4a4442', '#2f2a2a', '#211d1e', '#151213'];
const CT = {
  red: ['#ea7d5a', '#c4492f', '#80302e', '#511c1f'],
  blue: ['#6aaccb', '#3d7ca2', '#2c4c6c', '#1c2d45'],
  yellow: ['#f6d35c', '#d9a62f', '#94692c', '#5c401b'],
  teal: TEAL,
  grey: ['#d6d1c6', '#aaa498', '#6c6672', '#47414f'],
  orange: ['#f5a050', '#d6732d', '#8a4733', '#58291f'],
  green: ['#a3b67b', '#728c50', '#4b5b4a', '#2f3a31'],
  maroon: ['#c56a6e', '#94404a', '#5e2a3c', '#3c1a28'],
  purple: ['#a58fc4', '#7a62a0', '#4d3e6c', '#30284a'],
};
const AMB = MP.amber;
const MAG = P.laser;
const FIRE = P.fire;
const TOX = MP.toxic;
const HOT = MP.hot;
const ARC = { c: '#9fd6ff', core: '#ffffff', deep: '#3a6fb0' };
const FLOOD = { c: '#ffd98a', core: '#fffaf0', deep: '#a06a12' };

const pts = (a) => a.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
const dpoly = (a) => `M${a.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')}Z`;
const poly = (a, fill, sw = 3.5, extra = '') => `<polygon points="${pts(a)}" fill="${fill}"${sw ? ` stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"` : ''}${extra}/>`;
const ln = (x1, y1, x2, y2, col, w, extra = '') => `<path d="M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="round"${extra}/>`;
const rect = (x, y, w, h, fill, sw = 3, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${sw ? ` stroke="${INK}" stroke-width="${sw}"` : ''}${extra}/>`;
const P3 = (x, y, z = 0, h = 0) => [x + 0.22 * z, y - 0.5 * z - h];
const lerp = (a, b, t) => a + (b - a) * t;
const L2 = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];
// bilinear point in a quad [p00, p10, p11, p01]
const bil = (q, u, v) => L2(L2(q[0], q[1], u), L2(q[3], q[2], u), v);

// ------------------------------------------------------------ cast shadows
let SHADOWS = [];
function hull(p) {
  const a = p.slice().sort((u, v) => u[0] - v[0] || u[1] - v[1]);
  const cr = (o, u, v) => (u[0] - o[0]) * (v[1] - o[1]) - (u[1] - o[1]) * (v[0] - o[0]);
  const lo = [], up = [];
  for (const q of a) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of a.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function castBox(x, y, w, h, d, op = 0.5) {
  const fp = [[x, y], [x + w, y], P3(x + w, y, d), P3(x, y, d)];
  const k = [0.55 * h, 0.16 * h];
  SHADOWS.push({ p: hull(fp.concat(fp.map(([a, b]) => [a + k[0], b + k[1]]))), op });
}
function castPole(x, y, h, r = 5, op = 0.45) {
  SHADOWS.push({ p: [[x - r, y], [x + r, y], [x + r + 0.55 * h, y + 0.16 * h], [x - r + 0.55 * h, y + 0.16 * h]], op });
}

// ------------------------------------------------------------ basic forms
// Block in the oblique view with cel bands, grime and a lit lip (after the HQ's blk).
function blk(K, o) {
  const { x, y, w, h, d, t = TIN, sw = 4, stains = true, grime = true, hatch = true, shadow = true, lip = true,
    front, top, side, topFill, sideFill, frontFill } = o;
  if (shadow) castBox(x, y, w, h, d);
  const dx = d * 0.22, dy = d * 0.5;
  const F = [[x, y - h], [x + w, y - h], [x + w, y], [x, y]];
  const S = [[x + w, y - h], [x + w + dx, y - h - dy], [x + w + dx, y - dy], [x + w, y]];
  const T = [[x, y - h], [x + dx, y - h - dy], [x + w + dx, y - h - dy], [x + w, y - h]];
  let s = poly(S, sideFill || t[2], sw);
  if (hatch && d > 14) s += K.hatch(dpoly(S), { density: 0.9, op: 0.5, len: [8, 20] });
  if (side) s += side(S);
  s += poly(F, frontFill || t[1], sw);
  const cid = K.id('flf');
  K.def(`<clipPath id="${cid}"><polygon points="${pts(F)}"/></clipPath>`);
  let inner = `<rect x="${f(x)}" y="${f(y - h)}" width="${f(Math.min(18, w * 0.12))}" height="${f(h)}" fill="${t[0]}" opacity=".35"/>`;
  inner += `<rect x="${f(x + w - Math.min(20, w * 0.14))}" y="${f(y - h)}" width="${f(Math.min(20, w * 0.14))}" height="${f(h)}" fill="${t[3]}" opacity=".3"/>`;
  if (stains) for (let k = 0; k < Math.max(1, w / 45); k++) {
    const xx = x + K.rand(6, w - 6);
    inner += `<path d="M${f(xx)} ${f(y - h + 2)} q${f(K.rand(-3, 3))} ${f(h * 0.3)} ${f(K.rand(-2, 2))} ${f(K.rand(h * 0.25, h * 0.75))}" stroke="${t[3]}" stroke-width="${f(K.rand(2.5, 6))}" opacity=".3" fill="none" stroke-linecap="round"/>`;
  }
  if (grime) inner += `<rect x="${f(x)}" y="${f(y - Math.min(18, h * 0.3))}" width="${f(w)}" height="${f(Math.min(18, h * 0.3))}" fill="${SHADOW}" opacity=".3"/>`;
  s += `<g clip-path="url(#${cid})">${inner}</g>`;
  if (front) s += front(x, y - h, x + w, y);
  s += poly(T, topFill || t[0], sw);
  if (lip) s += ln(x + 4, y - h + 3, x + w - 3, y - h + 3, t[0], 2.6, ' opacity=".8"');
  if (top) s += top(T);
  s += poly(F, 'none', sw);
  return s;
}

// Shipping container, long side facing us, door end on the visible right side.
function cont(K, { x, y, w = 140, h = 56, d = 52, c = 'red', text = '', size = 0, shadow = true, rot = 0 }) {
  const t = CT[c] || c;
  if (shadow) castBox(x, y, w, h, d, 0.5);
  const dx = d * 0.22, dy = d * 0.5;
  const F = [[x, y - h], [x + w, y - h], [x + w, y], [x, y]];
  const S = [[x + w, y], [x + w + dx, y - dy], [x + w + dx, y - h - dy], [x + w, y - h]];
  const T = [[x, y - h], [x + w, y - h], [x + w + dx, y - h - dy], [x + dx, y - h - dy]];
  let s = poly(S, t[2], 3.5);
  // door end: two leaves, four locking bars, handles
  const sp = (u, v) => bil(S, u, v);
  s += ln(...sp(0.5, 0.06), ...sp(0.5, 0.94), INK, 2.2);
  for (const u of [0.2, 0.38, 0.62, 0.8]) s += ln(...sp(u, 0.08), ...sp(u, 0.92), t[3], 2.6) + ln(...sp(u + 0.03, 0.08), ...sp(u + 0.03, 0.92), t[1], 1.2, ' opacity=".6"');
  for (const u of [0.3, 0.7]) s += ln(...sp(u - 0.05, 0.42), ...sp(u + 0.05, 0.42), INK, 3);
  s += K.hatch(dpoly(S), { density: 0.7, op: 0.45, len: [8, 18] });
  s += poly(F, t[1], 3.5);
  const cid = K.id('flc');
  K.def(`<clipPath id="${cid}"><polygon points="${pts(F)}"/></clipPath>`);
  let inner = '';
  for (let xx = x + 9; xx < x + w - 6; xx += 8) {
    inner += ln(xx, y - h + 6, xx, y - 6, t[3], 2.4, ' opacity=".5"');
    inner += ln(xx - 3, y - h + 6, xx - 3, y - 6, t[0], 1.4, ' opacity=".35"');
  }
  inner += rect(x, y - h, w, 6, t[2], 0, ' opacity=".8"') + rect(x, y - 6, w, 6, t[3], 0, ' opacity=".8"');
  inner += rect(x, y - h, 7, h, t[2], 0) + rect(x + w - 7, y - h, 7, h, t[3], 0);
  inner += `<rect x="${f(x + 7)}" y="${f(y - h)}" width="${f(Math.min(16, w * 0.12))}" height="${f(h)}" fill="${t[0]}" opacity=".25"/>`;
  for (let k = 0; k < 3; k++) {
    const xx = x + K.rand(14, w - 14);
    inner += `<path d="M${f(xx)} ${f(y - h + 6)} q${f(K.rand(-2, 2))} ${f(h * 0.3)} 0 ${f(K.rand(h * 0.25, h * 0.7))}" stroke="${RST[1]}" stroke-width="${f(K.rand(2.5, 5))}" opacity=".6" fill="none" stroke-linecap="round"/>`;
  }
  for (let k = 0; k < 2; k++) inner += `<ellipse cx="${f(x + K.rand(16, w - 16))}" cy="${f(y - K.rand(10, h - 10))}" rx="${f(K.rand(6, 13))}" ry="${f(K.rand(3, 6))}" fill="${RST[2]}" opacity=".55"/>`;
  inner += `<rect x="${f(x)}" y="${f(y - 14)}" width="${f(w)}" height="14" fill="${SHADOW}" opacity=".25"/>`;
  s += `<g clip-path="url(#${cid})">${inner}</g>`;
  if (text) s += K.text(text, x + w / 2, y - h * 0.36, { size: size || Math.min(17, h * 0.32), color: '#f1e4c8', opacity: 0.9, rot });
  s += poly(T, t[0], 3.5);
  for (let k = 1; k < 10; k++) { const p = bil(T, k / 10, 0), q = bil(T, k / 10, 1); s += ln(p[0], p[1], q[0], q[1], t[1], 1.6, ' opacity=".55"'); }
  s += ln(x + 5, y - h + 3, x + w - 4, y - h + 3, t[0], 2.4, ' opacity=".8"');
  s += poly(F, 'none', 3.5);
  return s;
}

// Corrugated shanty with a patchwork front, a lean-to roof sloping to the front.
function shack(K, o) {
  const { x, y, w, h, d, wall = [RST, TIN, RST, TEAL], sideT = TIN, roofT = RST, rise = 16, over = 10, front, roof } = o;
  castBox(x - over, y, w + over * 2, h + rise, d + 10, 0.5);
  const dx = d * 0.22, dy = d * 0.5;
  let s = '';
  const S = [[x + w, y - h], [x + w + dx, y - h - dy - rise], [x + w + dx, y - dy], [x + w, y]];
  s += K.corrugated(S, { tones: [sideT[1], sideT[2], sideT[3]], angle: 0, pitch: 8 });
  s += K.hatch(dpoly(S), { density: 1, op: 0.55 });
  let xx = x, i = 0;
  while (xx < x + w - 4) {
    const pw = Math.min(K.rand(34, 56), x + w - xx);
    const tn = wall[i++ % wall.length];
    s += K.corrugated([[xx, y - h + K.rand(-3, 2)], [xx + pw + 2, y - h], [xx + pw + 2, y], [xx, y]], { tones: tn, angle: 0, pitch: 8 });
    s += K.rivetLine(xx + 4, y - h + 8, xx + pw - 2, y - h + 8, Math.max(2, Math.round(pw / 14)), 1.8);
    xx += pw;
  }
  s += `<rect x="${f(x)}" y="${f(y - 18)}" width="${f(w)}" height="18" fill="${SHADOW}" opacity=".35"/>`;
  s += `<rect x="${f(x + w - 18)}" y="${f(y - h)}" width="18" height="${f(h)}" fill="${SHADOW}" opacity=".22"/>`;
  if (front) s += front(x, y - h, x + w, y);
  // roof: fascia then corrugated sheet
  s += poly([[x - over, y - h + 2], [x + w + over, y - h + 2], [x + w + over, y - h + 9], [x - over, y - h + 9]], roofT[3], 3);
  const R = [[x - over, y - h + 2], [x - over + dx * 1.15, y - h - dy * 1.15 - rise], [x + w + over + dx * 1.15, y - h - dy * 1.15 - rise], [x + w + over, y - h + 2]];
  s += K.corrugated(R, { tones: roofT, angle: 24, pitch: 11 });
  s += K.hatch(dpoly(R), { density: 0.25, op: 0.35, len: [10, 20] });
  s += ln(R[0][0] + 4, R[0][1] - 3, R[3][0] - 4, R[3][1] - 3, roofT[0], 3, ' opacity=".85"');
  if (roof) s += roof(R);
  return s;
}

// ------------------------------------------------------------ junk
function tyreFlat(K, x, y, r = 15) {
  const h = r * 0.55;
  let s = `<path d="M${f(x - r)} ${f(y - h)} L${f(x - r)} ${f(y)} A${f(r)} ${f(r * 0.5)} 0 0 0 ${f(x + r)} ${f(y)} L${f(x + r)} ${f(y - h)} Z" fill="${RUB[2]}" stroke="${INK}" stroke-width="3"/>`;
  s += `<path d="M${f(x - r * 0.7)} ${f(y - h * 0.2 + r * 0.35)} q${f(r * 0.7)} ${f(r * 0.25)} ${f(r * 1.4)} 0" stroke="${RUB[0]}" stroke-width="2" fill="none" opacity=".8"/>`;
  s += `<ellipse cx="${f(x)}" cy="${f(y - h)}" rx="${f(r)}" ry="${f(r * 0.5)}" fill="${RUB[1]}" stroke="${INK}" stroke-width="3"/>`;
  s += `<ellipse cx="${f(x - r * 0.15)}" cy="${f(y - h - r * 0.12)}" rx="${f(r * 0.7)}" ry="${f(r * 0.3)}" fill="${RUB[0]}" opacity=".7"/>`;
  s += `<ellipse cx="${f(x)}" cy="${f(y - h + 0.5)}" rx="${f(r * 0.48)}" ry="${f(r * 0.22)}" fill="${INK}"/>`;
  return s;
}
function tyreStack(K, x, y, n = 3, r = 15) {
  castBox(x - r, y + r * 0.4, r * 2, n * r * 0.55 + r * 0.5, r * 1.6, 0.45);
  let s = '';
  for (let i = 0; i < n; i++) s += tyreFlat(K, x + K.rand(-2.5, 2.5), y - i * r * 0.55, r);
  return s;
}
// Standing tyre facing us.
function tyreUp(K, x, y, r = 15, tilt = 0) {
  let s = `<g transform="rotate(${f(tilt)} ${f(x)} ${f(y)})">`;
  s += `<ellipse cx="${f(x + r * 0.2)}" cy="${f(y - r - r * 0.12)}" rx="${f(r)}" ry="${f(r)}" fill="${RUB[3]}" stroke="${INK}" stroke-width="3"/>`;
  s += `<circle cx="${f(x)}" cy="${f(y - r)}" r="${f(r)}" fill="${RUB[1]}" stroke="${INK}" stroke-width="3"/>`;
  s += `<path d="M${f(x - r * 0.75)} ${f(y - r * 1.5)} A${f(r * 0.85)} ${f(r * 0.85)} 0 0 1 ${f(x + r * 0.2)} ${f(y - r * 1.85)}" stroke="${RUB[0]}" stroke-width="2.4" fill="none"/>`;
  s += `<circle cx="${f(x)}" cy="${f(y - r)}" r="${f(r * 0.5)}" fill="${STL[2]}" stroke="${INK}" stroke-width="2.5"/>`;
  s += `<circle cx="${f(x)}" cy="${f(y - r)}" r="${f(r * 0.18)}" fill="${INK}"/>`;
  return s + '</g>';
}
function cinder(K, x, y, w = 22, h = 14, d = 16) {
  let s = blk(K, { x, y, w, h, d, t: CIND, sw: 2.6, stains: false, grime: false, hatch: false, lip: false, shadow: false });
  s += rect(x + 3, y - h + 4, w / 2 - 5, h - 8, CIND[3], 1.6) + rect(x + w / 2 + 2, y - h + 4, w / 2 - 5, h - 8, CIND[3], 1.6);
  return s;
}
function crate(K, x, y, w = 34, h = 26, d = 28, t = OLIVE, mark = '') {
  let s = blk(K, { x, y, w, h, d, t, sw: 3, stains: false, grime: false, hatch: false });
  s += ln(x + 3, y - h / 2, x + w - 3, y - h / 2, t[3], 2);
  if (mark) s += K.text(mark, x + w / 2, y - h * 0.3, { size: Math.min(10, h * 0.4), color: '#efe3c4', opacity: 0.85 });
  return s;
}
// Rusty fire barrel with punched holes and a comic flame.
function fireBarrel(K, x, y, r = 13) {
  castBox(x - r, y + r * 0.4, r * 2, r * 2.4, r * 1.6, 0.45);
  let s = K.drum(x, y, r, 'rust');
  const holes = [[x - r * 0.5, y - r * 1.25], [x + r * 0.1, y - r * 1.15], [x - r * 0.15, y - r * 0.45], [x + r * 0.55, y - r * 0.5]];
  for (const [hx, hy] of holes) s += `<circle cx="${f(hx)}" cy="${f(hy)}" r="2.6" fill="${INK}"/>`;
  K.glow(holes.map(([hx, hy]) => `<circle cx="${f(hx)}" cy="${f(hy)}" r="2" fill="${FIRE.core}"/><circle cx="${f(hx)}" cy="${f(hy)}" r="6" fill="${FIRE.c}" opacity=".5" filter="url(#bloom)"/>`).join(''));
  K.flame(x - 3, y - r * 2.4 - 2, 34, -8, FIRE);
  K.flame(x + 6, y - r * 2.4 - 1, 22, 14, FIRE);
  K.lightPool(x + 6, y + 4, 110, 48, FIRE, 0.5);
  K.haze(x, y - 40, 60, 50, FIRE, 0.18);
  return s;
}
// Heap of scrap: a dark mound covered in plates, pipes, tyres and a car door.
function scrapHeap(K, cx, y, w, h, { seedCols = [RST, STL, TEAL, CT.red, TIN, CT.yellow] } = {}) {
  castBox(cx - w / 2, y, w, h * 0.7, w * 0.35, 0.45);
  const top = (u) => y - h * Math.pow(Math.sin(Math.PI * u), 0.8) * (0.85 + 0.15 * Math.sin(u * 17));
  const hill = [];
  for (let i = 0; i <= 16; i++) { const u = i / 16; hill.push([cx - w / 2 + u * w, top(u) + (i % 2 ? 4 : -2)]); }
  let s = poly([[cx - w / 2, y], ...hill, [cx + w / 2, y]], '#4b3b38', 3.5);
  s += K.hatch(dpoly([[cx, y], ...hill.slice(8), [cx + w / 2, y]]), { density: 0.9, op: 0.5 });
  const items = [];
  const n = Math.round((w * h) / 520);
  for (let i = 0; i < n; i++) {
    const u = K.rand(0.08, 0.92), yy = lerp(top(u) + 8, y - 4, K.r() * 0.9);
    items.push([cx - w / 2 + u * w, yy, K.r()]);
  }
  items.sort((a, b) => a[1] - b[1]);
  for (const [px, py, kind] of items) {
    const tn = K.pick(seedCols);
    if (kind < 0.42) {
      const a = K.rand(-0.6, 0.6), L = K.rand(14, 28), H = K.rand(8, 15);
      const c = Math.cos(a), sn = Math.sin(a);
      const q = [[px - L * c / 2, py - L * sn / 2], [px + L * c / 2, py + L * sn / 2], [px + L * c / 2 + H * 0.3, py + L * sn / 2 - H], [px - L * c / 2 + H * 0.3, py - L * sn / 2 - H]];
      s += poly(q, tn[1], 2.6) + ln(q[3][0] + 2, q[3][1] + 2, q[2][0] - 2, q[2][1] + 2, tn[0], 2, ' opacity=".9"');
    } else if (kind < 0.6) {
      const a = K.rand(-0.5, 0.5), L = K.rand(18, 34);
      s += K.pipe(`M${f(px - L / 2)} ${f(py - Math.sin(a) * L / 2)} L${f(px + L / 2)} ${f(py + Math.sin(a) * L / 2)}`, 5, tn[1], tn[0]);
    } else if (kind < 0.75) {
      s += tyreUp(K, px, py + 6, K.rand(8, 11), K.rand(-30, 30));
    } else if (kind < 0.85) {
      s += `<circle cx="${f(px)}" cy="${f(py)}" r="7" fill="${STL[1]}" stroke="${INK}" stroke-width="2.4"/><circle cx="${f(px)}" cy="${f(py)}" r="2.5" fill="${INK}"/>`;
    } else {
      s += poly([[px - 13, py], [px + 13, py - 3], [px + 12, py - 22], [px - 11, py - 19]], tn[1], 2.6) + poly([[px - 8, py - 12], [px + 8, py - 14], [px + 7, py - 19], [px - 7, py - 17]], '#2c3a48', 2);
    }
  }
  return s;
}
// Crushed car cube: compressed layers of paint, rust and glass.
function cube(K, x, y, sz, c) {
  const t = CT[c] || c;
  const w = sz, h = sz * 0.74, d = sz * 0.8;
  castBox(x, y, w, h, d, 0.5);
  const dx = d * 0.22, dy = d * 0.5;
  const F = [[x, y - h], [x + w, y - h], [x + w, y], [x, y]];
  const S = [[x + w, y], [x + w + dx, y - dy], [x + w + dx, y - h - dy], [x + w, y - h]];
  const T = [[x, y - h], [x + w, y - h], [x + w + dx, y - h - dy], [x + dx, y - h - dy]];
  const band = (q, n, cols, sw) => {
    let r = '';
    for (let i = 0; i < n; i++) {
      const v0 = i / n;
      const zig = [];
      for (let k = 0; k <= 6; k++) zig.push(bil(q, k / 6, 1 - v0 + (i ? K.rand(-0.05, 0.05) : 0)));
      r += `<polygon points="${pts([bil(q, 0, 0), bil(q, 1, 0), ...zig.slice().reverse()])}" fill="${K.pick(cols)}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>`;
      if (i) r += `<polyline points="${pts(zig.map(([a, b]) => [a, b + 2.5]))}" fill="none" stroke="${INK}" stroke-width="${sw * 1.6}" opacity=".55"/>`;
    }
    return r;
  };
  let s = poly(S, t[2], 3.2) + `<g>${band(S, 4, [t[2], t[3], RST[2], STL[3]], 2)}</g>`;
  s += K.hatch(dpoly(S), { density: 0.6, op: 0.4 });
  s += poly(F, t[1], 3.2);
  s += band([[x, y], [x + w, y], [x + w, y - h], [x, y - h]], 6, [t[1], t[1], t[0], t[1], RST[1], STL[1], '#2c3a48', t[2], '#d9d4c8'], 2.2);
  for (let k = 0; k < 2; k++) { const p = [x + K.rand(8, w - 8), y - K.rand(6, h - 6)]; s += `<path d="M${f(p[0] - 8)} ${f(p[1] + 3)} l5 -6 l4 5 l5 -7" stroke="${t[3]}" stroke-width="2" fill="none"/>`; }
  s += `<path d="M${f(x + w * 0.62)} ${f(y - h * 0.15)} a9 6 0 1 1 0.1 0" fill="${RUB[1]}" stroke="${INK}" stroke-width="2.2"/>`;
  // a squashed wheel rim and a headlight peeking out
  if (K.r() < 0.6) s += `<ellipse cx="${f(x + K.rand(12, w - 12))}" cy="${f(y - K.rand(8, h - 10))}" rx="9" ry="5" fill="${STL[1]}" stroke="${INK}" stroke-width="2.2"/>`;
  if (K.r() < 0.6) s += `<ellipse cx="${f(x + K.rand(10, w - 10))}" cy="${f(y - K.rand(8, h - 8))}" rx="4" ry="3" fill="#efe6c8" stroke="${INK}" stroke-width="1.8"/>`;
  s += poly(T, t[0], 3.2);
  for (let k = 0; k < 3; k++) { const p = bil(T, K.rand(0.1, 0.9), K.rand(0.1, 0.9)); s += `<path d="M${f(p[0] - 10)} ${f(p[1])} l6 -3 l5 4 l6 -3" stroke="${INK}" stroke-width="1.8" fill="none" opacity=".7"/>`; }
  s += poly(F, 'none', 3.2);
  return s;
}

// Car in the map's oblique view (long side facing us). Nose on the left (flip: right).
function car(K, x, y, o = {}) {
  const { w = 130, d = 50, t = CT.teal, blocks = false, wheels = true, bay = false, flip = false, primer = true, shadow = true,
    flames = false, holes = 3, hc = 22 } = o;
  const lift = blocks ? 16 : 9;
  const dx = d * 0.22, dy = d * 0.5;
  const yb = y - lift;
  const m = (a) => (flip ? x + w - a : x + a);
  const H1 = 26;
  if (shadow) castBox(x, y, w, H1 + hc + lift, d, 0.45);
  let s = '';
  const side = [[m(2), yb], [m(0), yb - 11], [m(3), yb - H1 + 2], [m(w - 3), yb - H1], [m(w), yb - 13], [m(w - 2), yb]];
  const rEdge = flip ? [[m(3), yb - H1 + 2], [m(0), yb - 11], [m(2), yb]] : [[m(w - 3), yb - H1], [m(w), yb - 13], [m(w - 2), yb]];
  const endF = [...rEdge, ...rEdge.slice().reverse().map(([a, b]) => [a + dx, b - dy])];
  // back pair of blocks / wheels peeking under the far side
  for (const a of [w * 0.2, w * 0.8]) {
    const [bx, by] = P3(m(a), y, d * 0.82);
    if (blocks) s += cinder(K, bx - 10, by, 20, lift + 1, 12);
    else if (wheels) s += `<ellipse cx="${f(bx + 4)}" cy="${f(by - 12)}" rx="11" ry="12" fill="${RUB[2]}" stroke="${INK}" stroke-width="3"/>`;
  }
  s += poly(endF, t[2], 3.2);
  s += K.hatch(dpoly(endF), { density: 0.6, op: 0.4 });
  // tail / head lights on the visible end
  const [ex, ey] = L2(rEdge[1], [rEdge[1][0] + dx, rEdge[1][1] - dy], 0.18);
  const [ex2, ey2] = L2(rEdge[1], [rEdge[1][0] + dx, rEdge[1][1] - dy], 0.82);
  s += rect(ex - 1, ey - 5, 6, 5, flip ? '#efe6c8' : '#d8433a', 1.6) + rect(ex2 - 1, ey2 - 5, 6, 5, flip ? '#efe6c8' : '#d8433a', 1.6);
  s += poly(side, t[1], 3.5);
  const cid = K.id('flcar');
  K.def(`<clipPath id="${cid}"><polygon points="${pts(side)}"/></clipPath>`);
  let inner = '';
  inner += rect(x, yb - H1, w, 8, t[0], 0, ' opacity=".55"');
  inner += rect(x, yb - 8, w, 8, t[3], 0, ' opacity=".5"');
  if (primer) inner += poly([[m(w * 0.38), yb - H1 - 2], [m(w * 0.6), yb - H1 - 2], [m(w * 0.6), yb + 2], [m(w * 0.38), yb + 2]], '#9a958c', 0, ' opacity=".9"');
  if (flames) {
    let fl = `M${f(m(4))} ${f(yb - 6)} L${f(m(4))} ${f(yb - 20)}`;
    for (let k = 0; k < 5; k++) fl += ` Q${f(m(10 + k * 10))} ${f(yb - 30)} ${f(m(16 + k * 10))} ${f(yb - 17 - (k % 2) * 3)} Q${f(m(20 + k * 10))} ${f(yb - 22)} ${f(m(22 + k * 10))} ${f(yb - 12)}`;
    fl += ` L${f(m(70))} ${f(yb - 6)} Z`;
    inner += `<path d="${fl}" fill="${YEL[1]}" stroke="${INK}" stroke-width="2"/><path d="${fl}" fill="${CT.orange[1]}" transform="translate(${f(flip ? 4 : -4)} 3)" opacity=".85"/>`;
  }
  for (let k = 0; k < 3; k++) inner += `<ellipse cx="${f(x + K.rand(10, w - 10))}" cy="${f(yb - K.rand(5, 20))}" rx="${f(K.rand(5, 12))}" ry="${f(K.rand(2.5, 5))}" fill="${RST[1]}" opacity=".85"/>`;
  s += `<g clip-path="url(#${cid})">${inner}</g>`;
  for (const a of [w * 0.38, w * 0.6]) s += ln(m(a), yb - H1 + 3, m(a), yb - 4, INK, 2);
  s += ln(m(w * 0.42), yb - 18, m(w * 0.42) + (flip ? -6 : 6), yb - 18, INK, 2.6);
  s += `<circle cx="${f(m(5))}" cy="${f(yb - 17)}" r="4" fill="#efe6c8" stroke="${INK}" stroke-width="2"/>`;
  for (let k = 0; k < holes; k++) { const hx = x + K.rand(w * 0.3, w * 0.9), hy = yb - K.rand(8, 20); s += `<circle cx="${f(hx)}" cy="${f(hy)}" r="2.6" fill="${INK}"/><circle cx="${f(hx)}" cy="${f(hy)}" r="4.2" fill="none" stroke="${t[0]}" stroke-width="1.2"/>`; }
  // deck
  const T = [[m(3), yb - H1 + 2], [m(w - 3), yb - H1], [m(w - 3) + dx, yb - H1 - dy], [m(3) + dx, yb - H1 + 2 - dy]];
  s += poly(T, t[0], 3.2);
  const B = (a, z, hh = 0) => P3(m(a), yb - H1 + 1, z, hh);
  if (bay) {
    const q = [B(5, d * 0.1), B(w * 0.3, d * 0.1), B(w * 0.3, d * 0.9), B(5, d * 0.9)];
    s += poly(q, '#1d1714', 2.6);
    s += K.pipe(`M${f(bil(q, 0.2, 0.3)[0])} ${f(bil(q, 0.2, 0.3)[1])} Q${f(bil(q, 0.5, 0.7)[0])} ${f(bil(q, 0.5, 0.7)[1] - 6)} ${f(bil(q, 0.85, 0.5)[0])} ${f(bil(q, 0.85, 0.5)[1])}`, 3, STL[2], STL[1]);
  }
  // cabin (frustum)
  const a0 = w * 0.3, a0t = w * 0.45, a1 = w * 0.82, a1t = w * 0.72, z0 = d * 0.1, z1 = d * 0.9, z0t = d * 0.2, z1t = d * 0.8;
  const wind = [B(a0, z0), B(a0, z1), B(a0t, z1t, hc), B(a0t, z0t, hc)];
  const rear = [B(a1, z0), B(a1, z1), B(a1t, z1t, hc), B(a1t, z0t, hc)];
  const sideW = [B(a0, z0), B(a1, z0), B(a1t, z0t, hc), B(a0t, z0t, hc)];
  const roofQ = [B(a0t, z0t, hc), B(a1t, z0t, hc), B(a1t, z1t, hc), B(a0t, z1t, hc)];
  s += poly(flip ? rear : wind, '#2c3a48', 3) + poly(flip ? wind : rear, '#3b4a58', 3);
  s += poly(sideW, t[1], 3.2);
  const g = [bil(sideW, 0.1, 0.14), bil(sideW, 0.9, 0.14), bil(sideW, 0.9, 0.86), bil(sideW, 0.1, 0.86)];
  s += poly(g, '#2c3a48', 2.4);
  s += ln(...bil(sideW, 0.5, 0.1), ...bil(sideW, 0.5, 0.9), t[1], 4);
  s += ln(...bil(g, 0.15, 0.25), ...bil(g, 0.35, 0.8), '#9fc2d0', 2.2, ' opacity=".7"');
  s += `<path d="M${f(bil(g, 0.7, 0.5)[0])} ${f(bil(g, 0.7, 0.5)[1])} l-6 -4 m6 4 l5 -5 m-5 5 l2 6" stroke="#dfe9ee" stroke-width="1.4" fill="none" opacity=".8"/>`;
  s += poly(roofQ, t[0], 3.2);
  // wheel wells + front blocks / wheels
  for (const a of [w * 0.2, w * 0.8]) {
    const cx = m(a);
    s += `<path d="M${f(cx - 15)} ${f(yb + 1)} A15 14 0 0 1 ${f(cx + 15)} ${f(yb + 1)} Z" fill="#15110f" stroke="${INK}" stroke-width="2.5"/>`;
    if (blocks) s += cinder(K, cx - 11, y, 22, lift + 1, 14);
    else if (wheels) s += tyreUp(K, cx, y + 1, 12);
  }
  return s;
}

// ------------------------------------------------------------ cyber / lights
// Sagging festoon wire with coloured bulbs.
function stringLights(K, points, { sag = 16, cols = [AMB, MAG, P.shock, TOX], step = 15, r = 2.4 } = {}) {
  let d = '', bulbs = [], ci = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i], [x2, y2] = points[i + 1];
    const c = [(x1 + x2) / 2, (y1 + y2) / 2 + sag * 2];
    d += `${i ? '' : `M${f(x1)} ${f(y1)}`} Q${f(c[0])} ${f(c[1])} ${f(x2)} ${f(y2)}`;
    const L = Math.hypot(x2 - x1, y2 - y1), n = Math.max(2, Math.round(L / step));
    for (let k = 1; k < n; k++) {
      const u = k / n;
      const bx = (1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * c[0] + u * u * x2;
      const by = (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * c[1] + u * u * y2;
      bulbs.push([bx, by + 3, cols[ci++ % cols.length]]);
    }
  }
  let s = `<path d="${d}" fill="none" stroke="${INK}" stroke-width="3.2"/><path d="${d}" fill="none" stroke="#3a3540" stroke-width="1.2"/>`;
  for (const [bx, by, col] of bulbs) s += K.leds([[bx, by]], col, r);
  return s;
}
// Floodlight mast: steel pole, lamp bank, cone + pool on the ground.
function floodMast(K, x, y, h, aim, { dir = 1, lamps = 3 } = {}) {
  castPole(x, y, h, 5, 0.4);
  let s = K.pipe(`M${f(x)} ${f(y)} V${f(y - h)}`, 7, STL[2], STL[0]);
  s += rect(x - 9, y - 12, 18, 12, STL[3], 2.5);
  for (let k = 0; k < 6; k++) s += ln(x - 5, y - 24 - k * 18, x + 5, y - 24 - k * 18, INK, 2.2);
  s += floodHead(K, x, y - h, aim, { dir, lamps });
  return s;
}
function floodHead(K, x, y, aim, { dir = 1, lamps = 3, rot } = {}) {
  const bw = lamps * 15 + 8;
  const a = rot ?? dir * 16;
  let s = ln(x - bw / 2 + 4, y + 2, x + bw / 2 - 4, y + 2, INK, 5);
  s += `<g transform="rotate(${f(a)} ${f(x)} ${f(y - 8)})">` + rect(x - bw / 2, y - 18, bw, 18, STL[3], 3) + rect(x - bw / 2, y - 18, bw, 5, STL[1], 0) + `</g>`;
  const L = [];
  for (let k = 0; k < lamps; k++) L.push([x - bw / 2 + 11.5 + k * 15, y - 8 + Math.sin((a * Math.PI) / 180) * (k - (lamps - 1) / 2) * 15]);
  s += K.leds(L, FLOOD, 4.2);
  K.lightCone(x, y - 6, aim[0], aim[1], 110, FLOOD, 0.13);
  K.lightPool(aim[0], aim[1], 170, 66, FLOOD, 0.34);
  return s;
}
// Rotating hazard beacon.
function beacon(K, x, y, col = AMB, r = 6) {
  let s = rect(x - r - 3, y - 5, r * 2 + 6, 7, STL[3], 2.5);
  s += `<path d="M${f(x - r)} ${f(y - 5)} A${r} ${r * 1.1} 0 0 1 ${f(x + r)} ${f(y - 5)} Z" fill="${col.c}" stroke="${INK}" stroke-width="2.5"/>`;
  K.glow(`<circle cx="${f(x)}" cy="${f(y - 8)}" r="${f(r * 3.4)}" fill="${col.c}" opacity=".55" filter="url(#bloom)"/><circle cx="${f(x - 2)}" cy="${f(y - 9)}" r="${f(r * 0.4)}" fill="${col.core}"/>`);
  return s;
}
// A small person (~30 px). pose: 'stand' | 'warm' (hands out to a fire).
function figure(K, x, y, { coat = CT.maroon, face = 1, pose = 'stand', eye = HOT } = {}) {
  const dirx = face;
  let s = `<ellipse cx="${f(x + 3)}" cy="${f(y)}" rx="9" ry="3" fill="${INK}" opacity=".5"/>`;
  s += rect(x - 5, y - 13, 4, 13, '#2b2630', 1.8) + rect(x + 1, y - 13, 4, 13, '#2b2630', 1.8);
  s += `<path d="M${f(x - 7)} ${f(y - 11)} L${f(x - 6)} ${f(y - 25)} Q${f(x)} ${f(y - 29)} ${f(x + 6)} ${f(y - 25)} L${f(x + 7)} ${f(y - 11)} Z" fill="${coat[1]}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`;
  s += `<path d="M${f(x - 5)} ${f(y - 24)} L${f(x - 5)} ${f(y - 13)}" stroke="${coat[0]}" stroke-width="2" opacity=".8"/>`;
  if (pose === 'warm') s += ln(x + dirx * 4, y - 22, x + dirx * 13, y - 18, coat[2], 3.4) + ln(x + dirx * 1, y - 20, x + dirx * 12, y - 15, coat[1], 3.4);
  else s += ln(x - 7, y - 23, x - 9, y - 13, coat[2], 3.4) + ln(x + 7, y - 23, x + 9, y - 13, coat[2], 3.4);
  s += `<circle cx="${f(x)}" cy="${f(y - 31)}" r="5.2" fill="#a9785a" stroke="${INK}" stroke-width="2.2"/>`;
  s += `<path d="M${f(x - 5.4)} ${f(y - 32)} Q${f(x)} ${f(y - 40)} ${f(x + 5.4)} ${f(y - 32)} Z" fill="${coat[3]}"/>`;
  s += rect(x - 4 + dirx * 1.5, y - 33, 8, 3, '#1b1820', 0);
  K.glow(`<rect x="${f(x - 3 + dirx * 1.5)}" y="${f(y - 32.6)}" width="6" height="2" fill="${eye.core}"/><circle cx="${f(x + dirx * 1.5)}" cy="${f(y - 31.5)}" r="5" fill="${eye.c}" opacity=".55" filter="url(#bloom)"/>`);
  return s;
}

// ------------------------------------------------------------ LUMBER CAMP -> chop shop
const ERASE_CAMP = [[345, 1300], [392, 1258], [470, 1246], [530, 1258], [590, 1282], [636, 1238], [700, 1230], [768, 1246], [800, 1282], [905, 1288],
  [958, 1330], [1004, 1398], [1010, 1552], [930, 1566], [858, 1552], [760, 1540], [690, 1566], [600, 1566], [470, 1560], [432, 1505], [425, 1422], [345, 1376]];

function chopShop(K) {
  const x = 470, y = 1412, w = 176, h = 82, d = 84;
  const front = (fx0, fy0, fx1, fy1) => {
    let r = '';
    // roll-up door, half open: dark interior with a car nose, warm work light
    const dx0 = fx0 + 62, dx1 = fx0 + 152, dh = 66;
    r += rect(dx0 - 6, fy1 - dh - 6, dx1 - dx0 + 12, dh + 6, STL[3], 3.2);
    r += rect(dx0, fy1 - dh, dx1 - dx0, dh, '#1b1620', 2.6);
    K.glow(`<rect x="${f(dx0 + 3)}" y="${f(fy1 - 30)}" width="${f(dx1 - dx0 - 6)}" height="28" fill="${P.warm[2]}" opacity=".55"/><ellipse cx="${f((dx0 + dx1) / 2)}" cy="${f(fy1 - 10)}" rx="60" ry="16" fill="${P.warm[2]}" opacity=".4" filter="url(#bloom)"/>`);
    // a red car nose inside
    r += poly([[dx0 + 10, fy1 - 4], [dx0 + 12, fy1 - 22], [dx0 + 70, fy1 - 24], [dx0 + 78, fy1 - 4]], CT.red[2], 2.4) + `<circle cx="${f(dx0 + 22)}" cy="${f(fy1 - 14)}" r="4" fill="#ffe9b0" stroke="${INK}" stroke-width="1.8"/><circle cx="${f(dx0 + 64)}" cy="${f(fy1 - 14)}" r="4" fill="#ffe9b0" stroke="${INK}" stroke-width="1.8"/>`;
    // the door slats (rolled up to 60%)
    r += rect(dx0, fy1 - dh, dx1 - dx0, dh * 0.42, TIN[1], 2.8);
    for (let k = 1; k < 5; k++) r += ln(dx0 + 2, fy1 - dh + k * dh * 0.084, dx1 - 2, fy1 - dh + k * dh * 0.084, TIN[3], 2);
    r += K.hazard([[dx0, fy1 - dh * 0.58 - 7], [dx1, fy1 - dh * 0.58 - 7], [dx1, fy1 - dh * 0.58], [dx0, fy1 - dh * 0.58]], { w: 5 });
    // boarded window with a warm crack of light
    r += rect(fx0 + 12, fy0 + 22, 36, 26, '#1b1620', 3);
    K.glow(`<rect x="${f(fx0 + 15)}" y="${f(fy0 + 25)}" width="30" height="20" fill="${P.warm[1]}" opacity=".85"/><rect x="${f(fx0 + 8)}" y="${f(fy0 + 18)}" width="44" height="34" fill="${P.warm[2]}" opacity=".45" filter="url(#bloom)"/>`);
    r += `<path d="M${f(fx0 + 9)} ${f(fy0 + 30)} L${f(fx0 + 51)} ${f(fy0 + 25)} M${f(fx0 + 9)} ${f(fy0 + 44)} L${f(fx0 + 51)} ${f(fy0 + 40)}" stroke="${INK}" stroke-width="8"/><path d="M${f(fx0 + 9)} ${f(fy0 + 30)} L${f(fx0 + 51)} ${f(fy0 + 25)} M${f(fx0 + 9)} ${f(fy0 + 44)} L${f(fx0 + 51)} ${f(fy0 + 40)}" stroke="${P.wood[1]}" stroke-width="4.5"/>`;
    // spray tag + stencil
    r += K.graffiti(fx0 + 30, fy1 - 10, 'CHOP', '#ff3d9a', { size: 15, rot: -7 });
    r += K.text('NO QUESTIONS', fx0 + 107, fy0 + 12, { size: 9, color: '#efe3c4', opacity: 0.9 });
    // wall lamp over the door
    r += ln(dx0 + 45, fy0 + 2, dx0 + 45, fy0 + 10, INK, 4) + rect(dx0 + 37, fy0 + 8, 16, 6, STL[3], 2.2);
    r += K.leds([[dx0 + 45, fy0 + 16]], AMB, 3.4);
    K.lightPool(dx0 + 45, fy1 + 12, 90, 30, AMB, 0.45);
    return r;
  };
  const roof = (R) => {
    let r = '';
    // tyres weighing the roof down
    for (const u of [0.18, 0.55]) { const [tx, ty] = bil([R[0], R[3], R[2], R[1]], u, 0.45); r += tyreFlat(K, tx, ty + 6, 11); }
    // stove pipe
    const [px, py] = bil([R[0], R[3], R[2], R[1]], 0.84, 0.7);
    r += K.pipe(`M${f(px)} ${f(py + 4)} V${f(py - 46)}`, 8, STL[2], STL[0]) + rect(px - 8, py - 52, 16, 7, STL[3], 2.4);
    return r;
  };
  let s = shack(K, { x, y, w, h, d, wall: [RST, TIN, CT.blue, RST, TIN], roofT: RST, rise: 18, front, roof });
  // neon sign on the roof: CHOP SHOP (amber), on a scrap-frame
  const sx = x + 22, sy = y - h - 84;
  s += K.post(sx + 18, sy + 30, y - h - 8, 7, STL) + K.post(sx + 118, sy + 30, y - h - 22, 7, STL);
  s += K.sign(sx, sy, 138, 38, 'CHOP SHOP', AMB, { rot: -3 });
  s += K.leds([[sx + 6, sy - 6], [sx + 132, sy - 12]], HOT, 2.4);
  return s;
}

// Steel A-frame hoist, drawn in two halves so the car sits between them.
const HOIST = { xl: 664, xr: 804, y: 1458, h: 190, d: 64 };
function hoistAt(z) {
  const { xl, xr, y, h } = HOIST;
  return { l: P3(xl, y, z), r: P3(xr, y, z), a: P3((xl + xr) / 2 - 6, y, z, h) };
}
function hoistHalf(K, z) {
  const A = hoistAt(z);
  let s = '';
  s += K.beam(A.l[0], A.l[1], A.a[0], A.a[1], 10, YEL) + K.beam(A.r[0], A.r[1], A.a[0], A.a[1], 10, YEL);
  // cross brace
  const p = L2(A.l, A.a, 0.6), q = L2(A.r, A.a, 0.6);
  s += K.beam(p[0], p[1], q[0], q[1], 7, YEL);
  // black bands on the feet + base plates
  for (const b of [A.l, A.r]) {
    const t = b === A.l ? L2(A.l, A.a, 0.1) : L2(A.r, A.a, 0.1);
    s += ln(b[0], b[1] - 2, t[0], t[1], INK, 12, ' opacity=".85"');
    s += rect(b[0] - 12, b[1] - 4, 24, 7, STL[3], 2.5);
  }
  return s;
}
function hoistTop(K) {
  const A0 = hoistAt(0), A1 = hoistAt(HOIST.d);
  let s = K.pipe(`M${f(A0.a[0] - 8)} ${f(A0.a[1] + 4)} L${f(A1.a[0] + 8)} ${f(A1.a[1] - 2)}`, 10, YEL[1], YEL[0]);
  s += K.text('MAX 2T', (A0.a[0] + A1.a[0]) / 2 - 10, (A0.a[1] + A1.a[1]) / 2 + 3, { size: 7, color: INK, opacity: 0.8, rot: -64 });
  return s;
}
function hoistLoad(K) {
  const A0 = hoistAt(0), A1 = hoistAt(HOIST.d);
  const [cx, cy] = L2(A0.a, A1.a, 0.5);
  let s = rect(cx - 9, cy + 4, 18, 16, STL[3], 2.6) + rect(cx - 9, cy + 4, 18, 5, STL[1], 0);
  // chain
  const ey = cy + 74;
  s += `<path d="M${f(cx)} ${f(cy + 20)} V${f(ey - 26)}" stroke="${INK}" stroke-width="5"/><path d="M${f(cx)} ${f(cy + 20)} V${f(ey - 26)}" stroke="${STL[1]}" stroke-width="3" stroke-dasharray="4 3"/>`;
  s += `<path d="M${f(cx - 22)} ${f(ey - 14)} L${f(cx)} ${f(ey - 28)} L${f(cx + 22)} ${f(ey - 14)}" stroke="${INK}" stroke-width="4.5" fill="none"/><path d="M${f(cx - 22)} ${f(ey - 14)} L${f(cx)} ${f(ey - 28)} L${f(cx + 22)} ${f(ey - 14)}" stroke="${STL[1]}" stroke-width="2" fill="none"/>`;
  // the engine block (V8, red valve covers)
  const ex = cx - 24, eyb = ey + 12;
  s += blk(K, { x: ex, y: eyb, w: 46, h: 26, d: 26, t: STL, sw: 3, stains: false, grime: false, hatch: true, shadow: false });
  for (const z of [5, 17]) { const [vx, vy] = P3(ex + 6, eyb, z, 26); s += poly([[vx, vy], [vx + 36, vy], [vx + 36, vy - 6], [vx, vy - 6]], CT.red[1], 2.2); }
  s += `<circle cx="${f(ex + 9)}" cy="${f(eyb - 12)}" r="7" fill="${STL[2]}" stroke="${INK}" stroke-width="2.4"/><circle cx="${f(ex + 9)}" cy="${f(eyb - 12)}" r="2" fill="${INK}"/>`;
  s += `<path d="M${f(ex + 20)} ${f(eyb - 8)} h18 M${f(ex + 20)} ${f(eyb - 16)} h18" stroke="${STL[3]}" stroke-width="2.2"/>`;
  // oil drip
  s += `<path d="M${f(ex + 30)} ${f(eyb)} q-1 6 0 9" stroke="#1b1612" stroke-width="2.4" fill="none"/>`;
  return s;
}
// A welder at work: crouched figure, mask, torch, a white-blue arc and a spark shower.
function welder(K, x, y) {
  let s = `<ellipse cx="${f(x + 4)}" cy="${f(y)}" rx="12" ry="3.5" fill="${INK}" opacity=".5"/>`;
  // gas bottle behind
  s += K.cyl({ cx: x + 18, y: y - 1, rx: 5, ry: 2.5, h: 28, tones: CT.red, top: 'flat', stroke: 2.4, hatch: false });
  s += K.cable(x + 16, y - 26, x - 2, y - 18, 6, 2, '#2e2a33');
  // crouched body (coverall orange-brown)
  const co = ['#f0a865', '#d5793a', '#8a4a26', '#4f2a1a'];
  s += `<path d="M${f(x + 6)} ${f(y)} L${f(x + 9)} ${f(y - 10)} L${f(x - 1)} ${f(y - 12)} L${f(x - 3)} ${f(y)} Z" fill="${co[2]}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>`;
  s += `<path d="M${f(x - 4)} ${f(y - 9)} Q${f(x - 7)} ${f(y - 22)} ${f(x + 1)} ${f(y - 25)} Q${f(x + 9)} ${f(y - 24)} ${f(x + 9)} ${f(y - 10)} Z" fill="${co[1]}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`;
  s += ln(x - 1, y - 21, x - 12, y - 16, co[2], 3.6) + ln(x - 12, y - 16, x - 18, y - 19, '#3a3540', 2.4);
  // head with welding mask
  s += `<circle cx="${f(x - 1)}" cy="${f(y - 29)}" r="5.5" fill="${co[3]}" stroke="${INK}" stroke-width="2.2"/>`;
  s += rect(x - 9, y - 33, 8, 9, '#2a2630', 2);
  K.glow(`<rect x="${f(x - 8)}" y="${f(y - 30.5)}" width="5" height="2.4" fill="#d6ff9a"/>`);
  // the arc
  const sx = x - 20, sy = y - 20;
  K.glow(`<circle cx="${f(sx)}" cy="${f(sy)}" r="30" fill="${ARC.c}" opacity=".55" filter="url(#bloom)"/><circle cx="${f(sx)}" cy="${f(sy)}" r="12" fill="${ARC.c}" opacity=".8" filter="url(#bloom)"/>` +
    `<path d="M${f(sx - 9)} ${f(sy)} H${f(sx + 9)} M${f(sx)} ${f(sy - 9)} V${f(sy + 9)} M${f(sx - 5)} ${f(sy - 5)} L${f(sx + 5)} ${f(sy + 5)} M${f(sx - 5)} ${f(sy + 5)} L${f(sx + 5)} ${f(sy - 5)}" stroke="#fff" stroke-width="1.8"/>` +
    `<circle cx="${f(sx)}" cy="${f(sy)}" r="3.6" fill="#fff"/>`);
  let sp = '';
  for (let k = 0; k < 12; k++) {
    const a = K.rand(-Math.PI * 0.95, 0.2), L = K.rand(10, 26);
    const ex = sx + Math.cos(a) * L, ey = sy + Math.sin(a) * L * 0.7;
    sp += `<path d="M${f(sx + Math.cos(a) * 4)} ${f(sy + Math.sin(a) * 3)} Q${f((sx + ex) / 2)} ${f(Math.min(sy, ey) - 6)} ${f(ex)} ${f(ey + K.rand(4, 14))}" stroke="${k % 3 ? '#ffd56b' : '#fff6d0'}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
  }
  K.glow(sp);
  K.lightPool(sx + 4, y + 2, 80, 30, ARC, 0.55);
  K.haze(sx, sy, 70, 50, ARC, 0.22);
  return s;
}

// NOODS: a noodle stall with a striped awning, lanterns and a magenta neon bowl.
function noodleStall(K, x, y) {
  const w = 104, d = 50, ah = 76, ab = 94;
  castBox(x - 12, y, w + 24, ab, d + 8, 0.45);
  let s = '';
  // back posts and a back board with a shelf of bowls and a holo menu
  const bp = [P3(x + 4, y, d), P3(x + w - 4, y, d)];
  for (const [px, py] of bp) s += K.post(px, py - ab + 2, py, 7, STL);
  const [bx, by] = P3(x + 8, y, d);
  s += rect(bx, by - 66, w - 16, 40, '#2a2430', 3) + ln(bx + 3, by - 44, bx + w - 19, by - 44, P.wood[1], 3);
  for (let k = 0; k < 4; k++) s += `<path d="M${f(bx + 8 + k * 14)} ${f(by - 52)} q5 7 10 0 Z" fill="${k % 2 ? '#efe6d6' : CT.teal[0]}" stroke="${INK}" stroke-width="1.8"/>`;
  s += K.holo(bx + 62, by - 64, 22, 16, MAG, 'bars');
  // counter
  s += blk(K, {
    x, y, w, h: 34, d: 28, t: CT.red, sw: 3.5, hatch: true,
    front: (fx0, fy0, fx1, fy1) => {
      let r = '';
      for (let k = 0; k < 4; k++) r += rect(fx0 + 5 + k * 24.5, fy0 + 6, 21, 22, CT.red[2], 2.2, ' opacity=".6"');
      r += K.text('NOODS', (fx0 + fx1) / 2, fy0 + 24, { size: 14, color: '#f6e9c9', opacity: 0.95 });
      return r;
    },
    top: (T) => {
      let r = '';
      const [px, py] = bil(T, 0.72, 0.5);
      r += K.cyl({ cx: px, y: py + 3, rx: 12, ry: 5.5, h: 15, tones: STL, top: 'rim', stroke: 2.6, hatch: false });
      const [qx, qy] = bil(T, 0.3, 0.45);
      r += `<path d="M${f(qx - 8)} ${f(qy - 3)} q8 9 16 0 Z" fill="#efe6d6" stroke="${INK}" stroke-width="2"/>` + ln(qx + 2, qy - 6, qx + 10, qy - 14, P.wood[0], 1.6) + ln(qx + 4, qy - 5, qx + 13, qy - 12, P.wood[0], 1.6);
      K.glow(`<path d="M${f(px - 4)} ${f(py - 15)} q-6 -10 0 -18 q6 -8 0 -18 M${f(px + 5)} ${f(py - 15)} q6 -9 0 -16 q-5 -8 1 -15" stroke="#f3eee6" stroke-width="3.2" fill="none" opacity=".55" stroke-linecap="round"/>`);
      return r;
    },
  });
  // front posts
  for (const px of [x - 2, x + w + 2]) s += K.post(px, y - ah - 2, y + 2, 7, STL);
  // striped awning (sloping up to the back) with a scalloped valance
  const n = 7, fl = [x - 12, y - ah], fr = [x + w + 12, y - ah];
  const bl = P3(x - 12, y, d + 8, ab), br = P3(x + w + 12, y, d + 8, ab);
  const A = [fl, fr, br, bl];
  for (let i = 0; i < n; i++) {
    const q = [bil(A, i / n, 0), bil(A, (i + 1) / n, 0), bil(A, (i + 1) / n, 1), bil(A, i / n, 1)];
    s += poly(q, i % 2 ? '#f1e2c4' : '#d8436f', 0);
  }
  s += poly(A, 'none', 3.5) + K.hatch(dpoly(A), { density: 0.18, op: 0.3 });
  let val = `M${f(fl[0])} ${f(fl[1])}`;
  for (let i = 0; i < n; i++) { const a = bil(A, i / n, 0), b = bil(A, (i + 1) / n, 0); val += ` L${f(a[0])} ${f(a[1])} Q${f((a[0] + b[0]) / 2)} ${f(a[1] + 15)} ${f(b[0])} ${f(b[1])}`; }
  s += `<path d="${val} Z" fill="#d8436f" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
  for (let i = 1; i < n; i += 2) { const a = bil(A, i / n, 0), b = bil(A, (i + 1) / n, 0); s += `<path d="M${f(a[0])} ${f(a[1])} Q${f((a[0] + b[0]) / 2)} ${f(a[1] + 15)} ${f(b[0])} ${f(b[1])} Z" fill="#f1e2c4"/>`; }
  // paper lanterns
  for (const u of [0.14, 0.86]) {
    const [lx, ly] = bil(A, u, 0);
    s += ln(lx, ly + 6, lx, ly + 14, INK, 2);
    s += `<ellipse cx="${f(lx)}" cy="${f(ly + 22)}" rx="7" ry="9" fill="#e8463a" stroke="${INK}" stroke-width="2.4"/>`;
    K.glow(`<ellipse cx="${f(lx)}" cy="${f(ly + 22)}" rx="5" ry="7" fill="#ff8f6a"/><circle cx="${f(lx)}" cy="${f(ly + 22)}" r="16" fill="#ff5a3a" opacity=".45" filter="url(#bloom)"/>`);
  }
  // stools
  for (const u of [0.2, 0.5, 0.8]) {
    const px = x + w * u, py = y + 15;
    s += ln(px, py, px, py - 17, INK, 5) + ln(px, py, px, py - 17, STL[1], 2);
    s += `<ellipse cx="${f(px)}" cy="${f(py - 18)}" rx="8.5" ry="4.2" fill="${CT.red[1]}" stroke="${INK}" stroke-width="2.6"/>`;
  }
  // vertical neon blade sign on a pole at the right: bowl on top, N-O-O-D-S down the blade
  const px = x + w + 30, top = y - 214;
  castPole(px, y + 4, 214, 5, 0.4);
  s += K.pipe(`M${f(px)} ${f(y + 4)} V${f(top + 40)}`, 7, STL[2], STL[0]);
  s += rect(px - 9, y - 8, 18, 12, STL[3], 2.5);
  s += ln(px, top + 60, px - 20, top + 60, INK, 5) + ln(px, top + 150, px - 20, top + 150, INK, 5);
  const bw = 34, bx0 = px - 20 - bw;
  s += rect(bx0 - 4, top + 34, bw + 8, 140, '#2a2430', 3.5) + rect(bx0, top + 38, bw, 132, '#1f1a24', 0);
  'NOODS'.split('').forEach((c, i) => { s += K.text(c, bx0 + bw / 2, top + 64 + i * 25, { size: 21, glowCol: MAG }); });
  s += K.neon(`M${f(bx0 - 6)} ${f(top + 12)} Q${f(bx0 + bw / 2)} ${f(top + 42)} ${f(bx0 + bw + 6)} ${f(top + 12)} Z`, MAG, 3.2);
  s += K.neon(`M${f(bx0 + bw / 2 - 2)} ${f(top + 8)} L${f(bx0 + bw)} ${f(top - 10)} M${f(bx0 + bw / 2 + 6)} ${f(top + 10)} L${f(bx0 + bw + 8)} ${f(top - 6)}`, MAG, 2.4);
  s += K.leds([[px, top + 36]], HOT, 2.6);
  K.lightPool(x + w / 2 + 10, y + 18, 130, 44, MAG, 0.42);
  K.lightPool(x + w / 2, y + 8, 80, 26, FIRE, 0.22);
  K.haze(bx0 + bw / 2, top + 100, 60, 110, MAG, 0.16);
  return s;
}

function campGround(K) {
  let s = '';
  // packed, oily dirt yard over the inpainted clearing (darker than the road)
  const cid = K.id('flcg');
  K.def(`<clipPath id="${cid}"><polygon points="${pts(ERASE_CAMP)}"/></clipPath>`);
  const fid = K.id('flcgb');
  K.def(`<filter id="${fid}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>`);
  // warm the inpainted fill (it comes out grey-brown between the dark pines)
  const wid = K.id('flcw');
  K.def(`<filter id="${wid}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>`);
  s += `<g clip-path="url(#${cid})"><g filter="url(#${wid})"><polygon points="${pts(ERASE_CAMP)}" fill="#b68a52" opacity=".85"/><ellipse cx="580" cy="1482" rx="200" ry="50" fill="#d8a964" opacity=".75"/><ellipse cx="900" cy="1470" rx="110" ry="70" fill="#c49658" opacity=".6"/><ellipse cx="600" cy="1300" rx="220" ry="40" fill="#9c7a48" opacity=".5"/><ellipse cx="370" cy="1330" rx="40" ry="60" fill="#7a5a3a" opacity=".7"/></g></g>`;
  let mot = '';
  for (let k = 0; k < 160; k++) {
    const x = K.rand(345, 922), y = K.rand(1200, 1566), dark = K.r() < 0.65;
    mot += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(K.rand(14, 50))}" ry="${f(K.rand(5, 15))}" fill="${dark ? '#6f4626' : '#e9b878'}" opacity="${f(dark ? K.rand(0.12, 0.26) : K.rand(0.08, 0.18))}"/>`;
  }
  s += `<g clip-path="url(#${cid})"><g filter="url(#${fid})">${mot}</g>`;
  for (let k = 0; k < 260; k++) {
    const x = K.rand(345, 1010), y = K.rand(1230, 1566), r = K.rand(1.3, 3.8);
    s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r)}" ry="${f(r * 0.65)}" fill="${INK}" opacity=".5"/>`;
    if (r > 3) s += `<ellipse cx="${f(x - 0.6)}" cy="${f(y - 1)}" rx="${f(r * 0.6)}" ry="${f(r * 0.35)}" fill="#e9c08a" opacity=".6"/>`;
  }
  for (let k = 0; k < 90; k++) {
    const x = K.rand(345, 1010), y = K.rand(1240, 1566);
    let t = '';
    for (let j = 0; j < 5; j++) t += `M${f(x + j * 2 - 4)} ${f(y)} q${f(K.rand(-3, 3))} -6 ${f(K.rand(-6, 6))} ${f(-K.rand(6, 12))}`;
    s += `<path d="${t}" stroke="#6c6a33" stroke-width="2" fill="none" opacity=".75"/>`;
  }
  for (let k = 0; k < 40; k++) {
    let x = K.rand(360, 1000), y = K.rand(1260, 1560), d = `M${f(x)} ${f(y)}`;
    for (let j = 0; j < 4; j++) { x += K.rand(-22, 22); y += K.rand(-7, 7); d += ` L${f(x)} ${f(y)}`; }
    s += `<path d="${d}" stroke="#4a2f1a" stroke-width="1.8" fill="none" opacity=".45"/>`;
  }
  s += '</g>';
  s += K.groundPatch(660, 1474, 230, 54, { tones: ['#cf9f68', '#a77a4c', '#8a5f3a', '#6a4528'], soft: 14 });
  // the pines' shade along the back of the clearing (hides the inpaint seam)
  const tid = K.id('flts');
  K.def(`<filter id="${tid}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="10"/></filter>`);
  let sh = '';
  for (const [x, y, rx, ry] of [[372, 1300, 40, 50], [430, 1262, 60, 22], [540, 1266, 50, 18], [690, 1244, 70, 20], [820, 1292, 70, 16], [960, 1360, 40, 40], [990, 1460, 22, 60], [440, 1470, 22, 50]]) sh += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${SHADOW}"/>`;
  s += `<g filter="url(#${tid})" opacity=".45">${sh}</g>`;
  s += K.tracks('M560 1430 C640 1470 760 1500 900 1490 C960 1486 1010 1480 1060 1470', { w: 14, op: 0.22 });
  s += K.tracks('M470 1442 C520 1470 600 1500 700 1520', { w: 12, op: 0.16 });
  s += K.stain(735, 1462, 42, '#1b1612', 0.42) + K.stain(560, 1440, 30, '#1b1612', 0.35) + K.stain(840, 1478, 22, '#1b1612', 0.3) + K.stain(612, 1505, 18, '#1b1612', 0.3);
  // bolts and bits
  for (let k = 0; k < 26; k++) {
    const x = K.rand(480, 900), y = K.rand(1420, 1540);
    s += `<rect x="${f(x)}" y="${f(y)}" width="${f(K.rand(3, 7))}" height="${f(K.rand(2, 3))}" fill="${K.pick([STL[1], RST[1], '#e8d9b8'])}" transform="rotate(${f(K.rand(-40, 40))} ${f(x)} ${f(y)})" opacity=".85"/>`;
  }
  return s;
}

function camp(K) {
  let o = '';
  // back-left: scrap heap and tyre walls where the log pile stood
  o += K.part('fl-camp-heap', () => scrapHeap(K, 432, 1352, 168, 92) + tyreStack(K, 360, 1366, 4, 15) + tyreStack(K, 392, 1380, 3, 15) + tyreUp(K, 520, 1372, 14, 12));
  // right-back: small shanty with a dish and a skull flag
  o += K.part('fl-camp-hut', () => {
    let s = shack(K, {
      x: 826, y: 1398, w: 92, h: 62, d: 60, wall: [TEAL, RST, TIN], roofT: TIN, rise: 12, over: 8,
      front: (fx0, fy0, fx1, fy1) => {
        let r = rect(fx0 + 54, fy1 - 46, 26, 46, P.wood[2], 3) + rect(fx0 + 54, fy1 - 46, 9, 46, P.wood[1], 0);
        r += `<circle cx="${f(fx0 + 76)}" cy="${f(fy1 - 22)}" r="2.4" fill="${INK}"/>`;
        r += K.graffiti(fx0 + 26, fy1 - 16, 'ZAPZ', '#9dff3a', { size: 12, rot: -10 });
        // skull tag
        r += `<circle cx="${f(fx0 + 26)}" cy="${f(fy0 + 18)}" r="9" fill="#f1e8d4" stroke="${INK}" stroke-width="2"/><rect x="${f(fx0 + 21)}" y="${f(fy0 + 23)}" width="10" height="7" fill="#f1e8d4" stroke="${INK}" stroke-width="2"/><circle cx="${f(fx0 + 22.5)}" cy="${f(fy0 + 18)}" r="2.6" fill="${INK}"/><circle cx="${f(fx0 + 29.5)}" cy="${f(fy0 + 18)}" r="2.6" fill="${INK}"/>`;
        return r;
      },
      roof: (R) => {
        const [dx, dy] = bil([R[0], R[3], R[2], R[1]], 0.3, 0.55);
        let r = ln(dx, dy, dx, dy - 16, INK, 4) + K.dish(dx, dy - 18, 16, STL, -30);
        const [fx, fy] = bil([R[0], R[3], R[2], R[1]], 0.85, 0.6);
        r += ln(fx, fy, fx, fy - 70, INK, 5) + ln(fx, fy, fx, fy - 70, STL[1], 2);
        r += `<path d="M${f(fx)} ${f(fy - 70)} L${f(fx + 34)} ${f(fy - 64)} L${f(fx + 28)} ${f(fy - 54)} L${f(fx + 35)} ${f(fy - 44)} L${f(fx)} ${f(fy - 46)} Z" fill="#2a2430" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`;
        r += `<circle cx="${f(fx + 14)}" cy="${f(fy - 60)}" r="5" fill="#f1e8d4"/><rect x="${f(fx + 11)}" y="${f(fy - 57)}" width="6" height="5" fill="#f1e8d4"/><circle cx="${f(fx + 12.5)}" cy="${f(fy - 60)}" r="1.5" fill="${INK}"/><circle cx="${f(fx + 15.5)}" cy="${f(fy - 60)}" r="1.5" fill="${INK}"/>`;
        return r;
      },
    });
    return s;
  });
  // the hoist's back frame, then the garage (further left), then the car, the load, the front frame
  o += K.part('fl-camp-hoist-back', () => hoistHalf(K, HOIST.d) + hoistTop(K));
  o += K.part('fl-camp-shop', () => chopShop(K));
  o += K.part('fl-camp-drums', () => K.drum(424, 1420, 12, 'blue') + K.drum(446, 1428, 12, 'rust') + crate(K, 652, 1426, 30, 22, 26, OLIVE, 'V8'));
  o += K.part('fl-camp-car', () => car(K, 668, 1448, { w: 132, d: 52, t: CT.teal, blocks: true, bay: true, flames: true, holes: 3 }));
  o += K.part('fl-camp-load', () => hoistLoad(K));
  o += K.part('fl-camp-hoist-front', () => hoistHalf(K, 0));
  o += K.part('fl-camp-welder', () => welder(K, 836, 1466));
  // string lights: garage roof -> hoist apex -> hut; and across the yard to the stall
  o += K.part('fl-camp-lights', () => {
    const A1 = hoistAt(HOIST.d).a;
    return stringLights(K, [[478, 1318], [A1[0] + 2, A1[1] + 6], [880, 1318]], { sag: 14 }) +
      stringLights(K, [[648, 1334], [826, 1342]], { sag: 12 });
  });
  // front: tyre stack, fire barrel with two bandits, the noodle stall
  o += K.part('fl-camp-tyres', () => tyreStack(K, 448, 1478, 3, 16) + tyreStack(K, 474, 1492, 2, 16) + tyreUp(K, 420, 1494, 15, -8));
  o += K.part('fl-camp-fire', () => figure(K, 556, 1488, { coat: CT.green, face: 1, pose: 'warm' }) + fireBarrel(K, 584, 1500, 13) + figure(K, 612, 1504, { coat: CT.maroon, face: -1, pose: 'warm', eye: TOX }));
  o += K.part('fl-camp-stall', () => noodleStall(K, 872, 1534));
  return o;
}

// ------------------------------------------------------------ QUARRY -> JUNK KING salvage yard
const ERASE_YARD = [[2580, 1400], [2592, 1330], [2700, 1302], [2880, 1302], [2918, 1246], [3000, 1238], [3092, 1248], [3102, 1330], [3106, 1506],
  [3020, 1528], [2870, 1538], [2760, 1538], [2640, 1518], [2556, 1508], [2550, 1420]];

// Magnet crawler crane: the house sits on tracks, a lattice boom reaches up-left.
const CRANE = { x: 2790, y: 1506, foot: [2826, 1404], tip: [2672, 1150] };
function craneBody(K) {
  const { x, y } = CRANE;
  let s = '';
  // rear track (peeks out behind)
  const [tbx, tby] = P3(x, y, 60);
  s += rect(tbx + 4, tby - 30, 172, 26, RUB[2], 3);
  // house on a turntable
  s += rect(x + 30, y - 46, 120, 14, STL[3], 3);
  s += blk(K, {
    x: x + 34, y: y - 40, w: 132, h: 62, d: 78, t: YEL, sw: 4,
    front: (fx0, fy0, fx1, fy1) => {
      let r = K.hazard([[fx1 - 34, fy0 + 4], [fx1 - 4, fy0 + 4], [fx1 - 4, fy1 - 4], [fx1 - 34, fy1 - 4]], { w: 7 });
      r += K.text('BIG', fx0 + 70, fy0 + 24, { size: 13, color: INK, opacity: 0.9 }) + K.text('MAG', fx0 + 70, fy0 + 40, { size: 13, color: INK, opacity: 0.9 });
      for (let k = 0; k < 4; k++) r += ln(fx0 + 12 + k * 9, fy1 - 22, fx0 + 12 + k * 9, fy1 - 8, YEL[3], 3);
      return r;
    },
    top: (T) => {
      const [ex, ey] = bil(T, 0.8, 0.5);
      let r = K.pipe(`M${f(ex)} ${f(ey + 6)} V${f(ey - 34)}`, 7, STL[3], STL[1]);
      K.glow(`<circle cx="${f(ex + 8)}" cy="${f(ey - 48)}" r="10" fill="#6d6670" opacity=".55"/><circle cx="${f(ex + 18)}" cy="${f(ey - 62)}" r="13" fill="#6d6670" opacity=".4"/><circle cx="${f(ex + 30)}" cy="${f(ey - 78)}" r="16" fill="#6d6670" opacity=".25"/>`);
      const [bx, by] = bil(T, 0.55, 0.5);
      r += beacon(K, bx, by + 4, AMB, 6);
      return r;
    },
  });
  return s;
}
function craneGantry(K) {
  const [tx, ty] = CRANE.tip;
  const g = [CRANE.x + 156, CRANE.y - 178];
  let s = K.beam(CRANE.x + 128, CRANE.y - 112, g[0], g[1], 9, YEL) + K.beam(CRANE.x + 176, CRANE.y - 120, g[0], g[1], 9, YEL);
  for (const o of [-3, 3]) s += ln(g[0], g[1] + o, tx + 6, ty + o - 6, INK, 3.6) + ln(g[0], g[1] + o, tx + 6, ty + o - 6, STL[0], 1.3);
  s += `<circle cx="${f(g[0])}" cy="${f(g[1])}" r="7" fill="${STL[2]}" stroke="${INK}" stroke-width="2.8"/>`;
  return s;
}
function craneCab(K) {
  const { x, y } = CRANE;
  let s = blk(K, {
    x: x + 6, y: y - 36, w: 48, h: 74, d: 46, t: YEL, sw: 4,
    front: (fx0, fy0, fx1, fy1) => {
      let r = rect(fx0 + 6, fy0 + 8, fx1 - fx0 - 12, 30, '#2c3a48', 3);
      K.glow(`<rect x="${f(fx0 + 8)}" y="${f(fy0 + 24)}" width="${f(fx1 - fx0 - 16)}" height="12" fill="${P.warm[1]}" opacity=".6"/>`);
      r += ln(fx0 + 10, fy0 + 34, fx0 + 22, fy0 + 12, '#9fc2d0', 2, ' opacity=".7"');
      r += K.hazard([[fx0 + 3, fy1 - 14], [fx1 - 3, fy1 - 14], [fx1 - 3, fy1 - 4], [fx0 + 3, fy1 - 4]], { w: 6 });
      return r;
    },
  });
  return s;
}
function craneTrack(K) {
  const { x, y } = CRANE;
  castBox(x - 4, y, 190, 70, 90, 0.5);
  let s = `<rect x="${f(x)}" y="${f(y - 32)}" width="184" height="34" rx="16" fill="${RUB[1]}" stroke="${INK}" stroke-width="4"/>`;
  for (let k = 0; k < 22; k++) s += ln(x + 8 + k * 8, y - 31, x + 8 + k * 8, y - 26, RUB[0], 2.4);
  s += `<rect x="${f(x + 14)}" y="${f(y - 25)}" width="156" height="20" rx="9" fill="${STL[3]}" stroke="${INK}" stroke-width="2.8"/>`;
  for (let k = 0; k < 6; k++) s += `<circle cx="${f(x + 26 + k * 26.5)}" cy="${f(y - 15)}" r="7" fill="${STL[2]}" stroke="${INK}" stroke-width="2.4"/><circle cx="${f(x + 26 + k * 26.5)}" cy="${f(y - 15)}" r="2" fill="${INK}"/>`;
  return s;
}
function craneBoom(K) {
  const [fx, fy] = CRANE.foot, [tx, ty] = CRANE.tip;
  const dx = tx - fx, dy = ty - fy, L = Math.hypot(dx, dy);
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const wb = 17; // half width at the foot, tapering to the tip
  const C = (t, side) => { const ww = wb * (1 - 0.45 * t); return [fx + dx * t + nx * ww * side, fy + dy * t + ny * ww * side]; };
  let s = '';
  // chords
  let lace = '';
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = C(i / n, i % 2 ? 1 : -1), b = C((i + 1) / n, i % 2 ? -1 : 1);
    lace += `M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])} `;
  }
  s += `<path d="${lace}" stroke="${INK}" stroke-width="6.5" fill="none"/><path d="${lace}" stroke="${YEL[2]}" stroke-width="3" fill="none"/>`;
  for (const side of [-1, 1]) {
    const a = C(0, side), b = C(1, side);
    s += ln(a[0], a[1], b[0], b[1], INK, 11) + ln(a[0], a[1], b[0], b[1], side < 0 ? YEL[0] : YEL[1], 6);
  }
  // foot box + tip head
  s += poly([C(0, -1.3), C(0.12, -1.1), C(0.12, 1.1), C(0, 1.3)], YEL[1], 3.5);
  s += poly([C(0.94, -1.2), C(1.02, -1.2), C(1.02, 1.2), C(0.94, 1.2)], YEL[1], 3);
  // foot pin + tip sheave
  s += `<circle cx="${f(fx)}" cy="${f(fy)}" r="9" fill="${STL[2]}" stroke="${INK}" stroke-width="3"/>`;
  s += `<circle cx="${f(tx)}" cy="${f(ty)}" r="11" fill="${STL[2]}" stroke="${INK}" stroke-width="3.5"/><circle cx="${f(tx)}" cy="${f(ty)}" r="3" fill="${INK}"/>`;
  s += K.leds([[tx - 4, ty - 14]], HOT, 3);
  return s;
}
function craneMagnet(K) {
  const [tx, ty] = CRANE.tip;
  const my = ty + 150, mx = tx;
  let s = `<path d="M${f(tx)} ${f(ty + 6)} V${f(my - 26)}" stroke="${INK}" stroke-width="5"/><path d="M${f(tx)} ${f(ty + 6)} V${f(my - 26)}" stroke="${STL[1]}" stroke-width="2"/>`;
  s += `<path d="M${f(mx - 22)} ${f(my - 14)} L${f(mx)} ${f(my - 30)} L${f(mx + 22)} ${f(my - 14)}" stroke="${INK}" stroke-width="4.5" fill="none"/>`;
  s += K.cyl({ cx: mx, y: my + 4, rx: 36, ry: 15, h: 18, tones: STL, top: 'flat', stroke: 3.5, hatch: true });
  s += K.hoop(mx, my - 2, 36, 15, 5, CT.orange[1]);
  s += `<ellipse cx="${f(mx)}" cy="${f(my - 14)}" rx="10" ry="4" fill="${STL[3]}" stroke="${INK}" stroke-width="2.4"/>`;
  s += K.text('VOLTAMP', mx - 2, my + 1, { size: 8, color: '#f1e4c8', opacity: 0.9 });
  // the car stuck to the magnet, tilted
  s += `<g transform="rotate(-7 ${f(mx)} ${f(my + 40)})">` + car(K, mx - 60, my + 66, { w: 118, d: 46, t: CT.purple, wheels: true, primer: false, shadow: false, holes: 2 }) + `</g>`;
  K.bolt(mx - 30, my + 8, mx - 44, my + 26, P.shock, { jag: 5, seg: 4, w: 2, fork: false });
  K.bolt(mx + 28, my + 8, mx + 40, my + 24, P.shock, { jag: 5, seg: 4, w: 2, fork: false });
  return s;
}

// JUNK KING pole sign: a neon crown over a lit board.
function junkSign(K, x, y) {
  const h = 196;
  castPole(x, y, h, 6, 0.4);
  let s = K.pipe(`M${f(x)} ${f(y)} V${f(y - h + 40)}`, 9, STL[2], STL[0]);
  s += rect(x - 12, y - 14, 24, 14, STL[3], 2.5);
  const bw = 150, bh = 44, bx = x - bw / 2, by = y - h;
  s += rect(bx - 6, by - 6, bw + 12, bh + 12, '#2a2430', 4);
  s += rect(bx, by, bw, bh, '#1f1a24', 2);
  s += K.text('JUNK KING', x, by + 31, { size: 23, glowCol: AMB });
  s += K.neon(`M${f(x - 26)} ${f(by - 14)} L${f(x - 26)} ${f(by - 40)} L${f(x - 13)} ${f(by - 26)} L${f(x)} ${f(by - 46)} L${f(x + 13)} ${f(by - 26)} L${f(x + 26)} ${f(by - 40)} L${f(x + 26)} ${f(by - 14)} Z`, AMB, 3.4);
  s += K.leds([[bx - 2, by + bh + 3], [bx + bw / 2, by + bh + 4], [bx + bw + 2, by + bh + 3]], HOT, 2.4);
  // the small print
  s += rect(x - 46, by + bh + 16, 92, 22, '#e9dfc6', 3);
  s += K.text('NO REFUNDS', x, by + bh + 32, { size: 11, color: CT.red[1], opacity: 1 });
  K.haze(x, by + 10, 120, 70, AMB, 0.2);
  return s;
}

function yardGround(K) {
  let s = '';
  const cid = K.id('flyg');
  K.def(`<clipPath id="${cid}"><polygon points="${pts(ERASE_YARD)}"/></clipPath>`);
  const fid = K.id('flygb');
  K.def(`<filter id="${fid}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>`);
  let mot = '';
  for (let k = 0; k < 200; k++) {
    const x = K.rand(2550, 3106), y = K.rand(1200, 1540), dark = K.r() < 0.7;
    mot += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(K.rand(14, 54))}" ry="${f(K.rand(5, 15))}" fill="${dark ? '#6f4626' : '#efc890'}" opacity="${f(dark ? K.rand(0.14, 0.28) : K.rand(0.08, 0.16))}"/>`;
  }
  s += `<g clip-path="url(#${cid})"><g filter="url(#${fid})">${mot}</g>`;
  for (let k = 0; k < 140; k++) {
    const x = K.rand(2550, 3106), y = K.rand(1300, 1540), r = K.rand(1.3, 3.6);
    s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r)}" ry="${f(r * 0.65)}" fill="${INK}" opacity=".5"/>`;
  }
  s += '</g>';
  // crawler tracks from the yard gate, oil stains, scattered junk
  s += K.tracks('M2440 1470 C2520 1480 2600 1520 2700 1530 C2760 1534 2800 1528 2840 1516', { w: 22, op: 0.2, tone: '#4a3020' });
  s += K.stain(2700, 1520, 40, '#1b1612', 0.4) + K.stain(2900, 1530, 34, '#1b1612', 0.35) + K.stain(2610, 1420, 26, '#1b1612', 0.3);
  for (let k = 0; k < 30; k++) {
    const x = K.rand(2560, 3080), y = K.rand(1400, 1545);
    s += `<rect x="${f(x)}" y="${f(y)}" width="${f(K.rand(3, 8))}" height="${f(K.rand(2, 3))}" fill="${K.pick([STL[1], RST[1], CT.blue[1], '#e8d9b8'])}" transform="rotate(${f(K.rand(-40, 40))} ${f(x)} ${f(y)})" opacity=".85"/>`;
  }
  return s;
}

function yard(K) {
  let o = '';
  // back row: containers stacked against the old quarry face
  o += K.part('fl-yard-back', () =>
    cont(K, { x: 2596, y: 1390, w: 150, c: 'blue', text: 'BOOMWERKS' }) +
    cont(K, { x: 2748, y: 1394, w: 140, c: 'red', text: 'FRAGILE?' }) +
    cont(K, { x: 2614, y: 1334, w: 140, c: 'yellow', text: '' }) +
    cont(K, { x: 2758, y: 1338, w: 124, c: 'grey', text: 'PRISMATIK', size: 13 }) +
    cont(K, { x: 2636, y: 1278, w: 118, c: 'teal', text: '' }));
  // right: the tall stack with a floodlight on top
  o += K.part('fl-yard-stack', () => {
    let s = cont(K, { x: 2944, y: 1504, w: 152, c: 'orange', text: 'SCORCH&amp;SONS', size: 12 });
    s += cont(K, { x: 2950, y: 1448, w: 140, c: 'blue', text: '' });
    s += cont(K, { x: 2932, y: 1392, w: 152, c: 'green', text: 'THIS SIDE UP', size: 11, rot: 180 });
    s += cont(K, { x: 2954, y: 1336, w: 128, c: 'maroon', text: '' });
    const [hx, hy] = P3(3018, 1336, 26, 56);
    s += floodHead(K, hx, hy - 2, [2860, 1440], { dir: -1, lamps: 3, rot: -14 });
    s += beacon(K, hx + 52, hy + 6, AMB, 5);
    return s;
  });
  // floodlight mast at the yard gate
  o += K.part('fl-yard-mast', () => floodMast(K, 2566, 1426, 176, [2700, 1470], { dir: 1, lamps: 3 }));
  // crushed-car cubes (3 + 2), the magnet crane dangling a car above them
  o += K.part('fl-yard-cubes', () => {
    let s = '';
    const sz = 50, y0 = 1512, x0 = 2588;
    const cols = ['red', 'blue', 'yellow', 'teal', 'grey'];
    for (let i = 0; i < 3; i++) s += cube(K, x0 + i * (sz + 2), y0 + (i === 1 ? 2 : 0), sz, cols[i]);
    for (let i = 0; i < 2; i++) s += cube(K, x0 + 26 + i * (sz + 2), y0 - sz * 0.74 - 2, sz, cols[3 + i]);
    return s;
  });
  o += K.part('fl-yard-crane-boom', () => craneBoom(K));
  o += K.part('fl-yard-crane-house', () => craneBody(K));
  o += K.part('fl-yard-crane-gantry', () => craneGantry(K));
  o += K.part('fl-yard-crane-cab', () => craneCab(K));
  o += K.part('fl-yard-magnet', () => craneMagnet(K));
  o += K.part('fl-yard-crane-track', () => craneTrack(K));
  // scrap heap + tyres at the front right, junk sign at the gate
  o += K.part('fl-yard-heap', () => scrapHeap(K, 3044, 1552, 156, 70, { seedCols: [RST, STL, CT.blue, CT.red, TIN, CT.yellow, CT.teal] }) + tyreStack(K, 2972, 1560, 3, 16) + tyreUp(K, 3000, 1566, 14, -10));
  o += K.part('fl-yard-sign', () => junkSign(K, 2486, 1500));
  o += K.part('fl-yard-drums', () => K.drum(2532, 1520, 12, 'yellow') + K.drum(2550, 1530, 12, 'rust') + K.drum(2538, 1540, 12, 'blue'));
  return o;
}

// ------------------------------------------------------------ SOUTH EDGE
function southGround(K) {
  let s = '';
  // spray tags on the cliff faces (flat paint)
  s += `<g opacity=".72">` + skullTag(K, 846, 1790, 20, '#ff3d9a');
  s += K.graffiti(976, 1822, 'TURN BACK', '#ff3d9a', { size: 21, rot: -9 });
  s += K.graffiti(1592, 1842, 'AEGIS SUX', '#9dff3a', { size: 19, rot: 5 });
  s += K.graffiti(2108, 1840, 'BOOM', '#ffb52e', { size: 18, rot: -4 }) + `</g>`;
  // dirt under the dumped junk
  s += K.groundPatch(1012, 1702, 92, 20, { tones: ['#cf9f68', '#a77a4c', '#8a5f3a', '#6a4528'], soft: 8 });
  // coolant trickle from the drain pipe down the rock
  const tr = 'M1390 1796 q5 16 -1 32 q-6 20 2 34 q4 10 -2 22';
  s += `<path d="${tr}" stroke="${TOX.deep}" stroke-width="11" fill="none" opacity=".7" stroke-linecap="round"/><path d="${tr}" stroke="${TOX.c}" stroke-width="4" fill="none" opacity=".6" stroke-linecap="round"/>`;
  s += `<ellipse cx="1392" cy="1874" rx="24" ry="7" fill="${TOX.deep}" opacity=".6"/><ellipse cx="1392" cy="1873" rx="14" ry="4" fill="${TOX.c}" opacity=".45"/>`;
  K.lightPool(1390, 1846, 40, 60, TOX, 0.2);
  return s;
}
function skullTag(K, x, y, r, col) {
  let s = `<g opacity=".85" transform="rotate(-8 ${f(x)} ${f(y)})">`;
  s += `<circle cx="${f(x)}" cy="${f(y - r * 0.2)}" r="${f(r)}" fill="${col}" stroke="${INK}" stroke-width="2.5"/>`;
  s += `<rect x="${f(x - r * 0.55)}" y="${f(y + r * 0.5)}" width="${f(r * 1.1)}" height="${f(r * 0.6)}" fill="${col}" stroke="${INK}" stroke-width="2.5"/>`;
  s += `<circle cx="${f(x - r * 0.38)}" cy="${f(y - r * 0.15)}" r="${f(r * 0.28)}" fill="${INK}"/><circle cx="${f(x + r * 0.38)}" cy="${f(y - r * 0.15)}" r="${f(r * 0.28)}" fill="${INK}"/>`;
  s += `<path d="M${f(x - r * 0.25)} ${f(y + r * 0.55)} v${f(r * 0.5)} M${f(x)} ${f(y + r * 0.55)} v${f(r * 0.5)} M${f(x + r * 0.25)} ${f(y + r * 0.55)} v${f(r * 0.5)}" stroke="${INK}" stroke-width="2"/>`;
  s += `<path d="M${f(x - r * 1.5)} ${f(y + r * 1.4)} L${f(x + r * 1.5)} ${f(y - r * 1.2)} M${f(x - r * 1.5)} ${f(y - r * 1.2)} L${f(x + r * 1.5)} ${f(y + r * 1.4)}" stroke="${col}" stroke-width="${f(r * 0.3)}" stroke-linecap="round"/>`;
  for (let i = 0; i < 4; i++) s += `<path d="M${f(x + K.rand(-r, r))} ${f(y + r)} v${f(K.rand(8, 20))}" stroke="${col}" stroke-width="2"/>`;
  return s + '</g>';
}
function south(K) {
  let o = '';
  // NO DUMPING sign, and the junk dumped right next to it
  o += K.part('fl-south-dump', () => {
    let s = K.post(972, 1630, 1706, 7, P.wood);
    s += `<g transform="rotate(-6 972 1636)">` + rect(938, 1618, 70, 34, '#e9dfc6', 3) + K.text('NO', 973, 1632, { size: 10, color: CT.red[1], opacity: 1 }) + K.text('DUMPING', 973, 1647, { size: 10, color: CT.red[1], opacity: 1 }) + `</g>`;
    s += scrapHeap(K, 1022, 1706, 92, 38, { seedCols: [RST, STL, TIN, CT.blue] });
    s += blk(K, { x: 1060, y: 1712, w: 28, h: 44, d: 22, t: CT.grey, sw: 3, stains: true, grime: true, hatch: false });
    s += tyreUp(K, 1044, 1718, 13, 20) + K.drum(948, 1716, 11, 'rust');
    return s;
  });
  // drain pipe sticking out of the rock
  o += K.part('fl-south-pipe', () => {
    let s = poly([[1338, 1770], [1366, 1762], [1372, 1808], [1342, 1814]], CIND[2], 3) + poly([[1338, 1770], [1366, 1762], [1368, 1772], [1340, 1778]], CIND[1], 0);
    s += K.pipe('M1352 1784 L1386 1794', 16, RST[1], RST[0]);
    s += `<ellipse cx="1388" cy="1795" rx="6" ry="10" fill="${RST[2]}" stroke="${INK}" stroke-width="3"/><ellipse cx="1389" cy="1795" rx="3.5" ry="7" fill="${INK}"/>`;
    K.glow(`<ellipse cx="1390" cy="1798" rx="3" ry="4" fill="${TOX.c}"/>`);
    return s;
  });
  return o;
}

// ------------------------------------------------------------ layer
export default {
  name: 'flanks',
  z: 40,
  erase: [ERASE_CAMP, ERASE_YARD],
  build(K) {
    SHADOWS = [];
    let objects = '';
    objects += camp(K);
    objects += yard(K);
    objects += south(K);
    let ground = '';
    ground += campGround(K) + yardGround(K) + southGround(K);
    const fid = K.id('flsh');
    K.def(`<filter id="${fid}" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="5"/></filter>`);
    ground += `<g filter="url(#${fid})" opacity=".5">${SHADOWS.map((sh) => poly(sh.p, SHADOW, 0)).join('')}</g>`;
    return { ground, objects, light: '' };
  },
};

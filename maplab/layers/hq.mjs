// HQ: the player's corp fortress at the end of the road (bottom centre), the
// base everyone defends. Replaces the reference's castle, its two huts, the
// timber fences and the banners.
//
//   north:  the road ends at a heavy blast gate in a bunker wall, under the big
//           AEGIS neon sign (cyan = friendly), floodlights aimed up the road
//   centre: the AEGIS HQ block (helipad + AC units on the roof, cyan entrance,
//           HQ blade sign), comms mast with dishes behind it
//   sides:  watchtower (left), power block with coolant capacitors (right)
//   front:  forecourt apron, armoured truck, container barracks (left), scrap
//           garage (right), sandbag / jersey-barrier barricades with holo flags
//           where the timber fences stood
//
// Owner: hq. Coordinates are 2x map px. Light: upper-left; depth recedes up-right
// (kit convention: depth d -> 0.22 d right, 0.5 d up).
import { P, MP, f, MW, MH } from '../mapkit.mjs';

const CY = P.shock;            // friendly cyan (HQ)
const AMB = MP.amber;
const RED = MP.hot;
// dusk concrete: warm lit top, mid front, violet shadow side
const CON = ['#cbb597', '#998a79', '#5e5366', '#463e4f', '#2e2836'];
const CONB = ['#c2b9a6', '#8d877d', '#545066', '#3d394b', '#28242f'];
const STL = ['#c4cbc9', '#8c969a', '#5c6273', '#3d4152', '#272a36'];
const RST = ['#de8f52', '#b0612f', '#7a3f22', '#4e2414'];
const TEAL = ['#7cc4b7', '#4f978d', '#33696a', '#1f4447'];
const YEL = ['#f4cf55', '#d6a634', '#9c7420', '#614611'];
const OLIVE = ['#a6a77e', '#7f8160', '#55594a', '#3a3d34', '#25271f'];
const SAND = ['#cf9f68', '#b58756', '#9a6f46', '#6f4d2f', '#4a3220'];
const SHADOW = '#22172e';
const ROOF = ['#6d6370', '#544b59', '#3e3745', '#2b2632'];

const pts = (a) => a.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
const dpoly = (a) => `M${a.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')}Z`;
const poly = (a, fill, sw = 3.5, extra = '') => `<polygon points="${pts(a)}" fill="${fill}"${sw ? ` stroke="${P.ink}" stroke-width="${sw}" stroke-linejoin="round"` : ''}${extra}/>`;
const ln = (x1, y1, x2, y2, col, w, extra = '') => `<path d="M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="round"${extra}/>`;
const rect = (x, y, w, h, fill, sw = 3, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${sw ? ` stroke="${P.ink}" stroke-width="${sw}"` : ''}${extra}/>`;
// oblique point: front-plane ground (x, y), depth z (into the picture), height h
const P3 = (x, y, z = 0, h = 0) => [x + 0.22 * z, y - 0.5 * z - h];
const lerp = (a, b, t) => a + (b - a) * t;

// ------------------------------------------------------------ layout
// Layout v2 (LAYOUT.md): the whole compound is drawn at half size and moved down, p' = A + S·(p − A0), so the road
// runs on through the plaza and enemies walk further. A0 = where the road met the HQ (the top of the AEGIS gantry).
// Everything below is drawn in the old full-size coordinates and transformed in build(); the erase polygon and the
// plaza's sand dressing stay full size, so the space the HQ gives up becomes open plaza.
export const HQ_S = 0.5, HQ_A0 = [1770, 1096], HQ_A = [1770, 1440];
export const hqPt = ([x, y]) => [HQ_A[0] + HQ_S * (x - HQ_A0[0]), HQ_A[1] + HQ_S * (y - HQ_A0[1])];
const INK_K = 1.4;   // line work inside the half-size compound: 1.4 x 0.5 = 0.7 of the map's weight
const HQ_T = `translate(${HQ_A[0] - HQ_S * HQ_A0[0]} ${HQ_A[1] - HQ_S * HQ_A0[1]}) scale(${HQ_S})`;
export const HQ = {
  gate: { x0: 1606, x1: 1934, y: 1258, cx: 1770, wh: 104, wd: 72 },
  main: { x: 1500, y: 1496, w: 540, h: 132, d: 136 },
};

// ------------------------------------------------------------ cast shadows
// Collected while building, emitted into the ground layer (soft, violet).
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

// ------------------------------------------------------------ helpers
// Block in the oblique view, cel-shaded, with cast-concrete detail.
function blk(K, o) {
  const { x, y, w, h, d, t = CON, sw = 4.5, seams = 52, ties = true, stains = true, grime = true,
    front, top, side, hatch = true, topFill, sideFill, frontFill, lip = true, shadow = true, chips = true } = o;
  if (shadow) castBox(x, y, w, h, d);
  const dx = d * 0.22, dy = d * 0.5;
  const F = [[x, y - h], [x + w, y - h], [x + w, y], [x, y]];
  const S = [[x + w, y - h], [x + w + dx, y - h - dy], [x + w + dx, y - dy], [x + w, y]];
  const T = [[x, y - h], [x + dx, y - h - dy], [x + w + dx, y - h - dy], [x + w, y - h]];
  let s = poly(S, sideFill || t[2], sw);
  if (hatch && d > 14) s += K.hatch(dpoly(S), { density: 0.9, op: 0.5, len: [10, 26] });
  if (side) s += side(S);
  s += poly(F, frontFill || t[1], sw);
  const cid = K.id('hqf');
  K.def(`<clipPath id="${cid}"><polygon points="${pts(F)}"/></clipPath>`);
  let inner = '';
  // cel bands: lit strip on the left, occlusion at the right corner and the foot
  inner += `<rect x="${f(x)}" y="${f(y - h)}" width="${f(Math.min(26, w * 0.1))}" height="${f(h)}" fill="${t[0]}" opacity=".4"/>`;
  inner += `<rect x="${f(x + w - Math.min(30, w * 0.12))}" y="${f(y - h)}" width="${f(Math.min(30, w * 0.12))}" height="${f(h)}" fill="${t[3]}" opacity=".35"/>`;
  if (seams) for (let xx = x + seams; xx < x + w - 12; xx += seams) inner += ln(xx, y - h, xx, y, t[3], 2.4, ' opacity=".7"');
  if (seams && h > 70) inner += ln(x, y - h * 0.52, x + w, y - h * 0.52, t[3], 2, ' opacity=".5"');
  if (ties && seams) for (let xx = x + seams / 2; xx < x + w - 8; xx += seams) for (const k of [0.27, 0.77]) if (h * (1 - k) > 8) inner += `<circle cx="${f(xx)}" cy="${f(y - h * k)}" r="2.3" fill="${t[4] || t[3]}" opacity=".85"/>`;
  if (stains) for (let k = 0; k < Math.max(2, w / 40); k++) {
    const xx = x + K.rand(8, w - 8);
    inner += `<path d="M${f(xx)} ${f(y - h + 2)} q${f(K.rand(-3, 3))} ${f(h * 0.3)} ${f(K.rand(-2, 2))} ${f(K.rand(h * 0.25, h * 0.8))}" stroke="${t[4] || t[3]}" stroke-width="${f(K.rand(3, 9))}" opacity=".3" fill="none" stroke-linecap="round"/>`;
  }
  if (grime) {
    const gh = Math.min(26, h * 0.28);
    inner += `<rect x="${f(x)}" y="${f(y - gh)}" width="${f(w)}" height="${f(gh)}" fill="${t[4] || t[3]}" opacity=".35"/>`;
    if (h > 40) inner += K.hatch(dpoly([[x, y - gh * 1.6], [x + w, y - gh * 1.6], [x + w, y], [x, y]]), { density: 0.35, op: 0.4, len: [8, 16] });
  }
  if (chips) for (let k = 0; k < Math.max(1, w / 120); k++) {
    const xx = x + K.rand(10, w - 20);
    inner += `<path d="M${f(xx)} ${f(y - h)} l${f(K.rand(4, 9))} ${f(K.rand(4, 8))} l${f(K.rand(4, 10))} ${f(-K.rand(3, 7))}" fill="${t[3]}" stroke="${P.ink}" stroke-width="1.8"/>`;
  }
  s += `<g clip-path="url(#${cid})">${inner}</g>`;
  if (front) s += front(x, y - h, x + w, y);
  s += poly(T, topFill || t[0], sw);
  if (lip) s += ln(x + 5, y - h + 3.5, x + w - 3, y - h + 3.5, t[0], 3, ' opacity=".85"');
  if (top) s += top(T);
  s += poly(F, 'none', sw);
  return s;
}
// Scrap plate bolted onto a face.
function plate(K, x, y, w, h, tones = RST, { rivets = true, stripe = false, dent = true } = {}) {
  const j = () => K.rand(-2.5, 2.5);
  const q = [[x + j(), y + j()], [x + w + j(), y + j()], [x + w + j(), y + h + j()], [x + j(), y + h + j()]];
  let s = poly(q, tones[1], 3.2);
  s += `<polyline points="${pts([[q[0][0] + 3, q[0][1] + 3.5], [q[1][0] - 3, q[1][1] + 3.5]])}" stroke="${tones[0]}" stroke-width="2.6" fill="none"/>`;
  s += `<polyline points="${pts([[q[1][0] - 3, q[1][1] + 4], [q[2][0] - 3, q[2][1] - 3]])}" stroke="${tones[2]}" stroke-width="3" fill="none"/>`;
  if (dent) for (let k = 0; k < 2; k++) s += `<ellipse cx="${f(x + K.rand(8, w - 8))}" cy="${f(y + K.rand(h * 0.3, h * 0.8))}" rx="${f(K.rand(4, w * 0.22))}" ry="${f(K.rand(2, 5))}" fill="${tones[2]}" opacity=".55"/>`;
  if (stripe) s += K.hazard([[q[3][0] + 3, q[3][1] - 13], [q[2][0] - 3, q[2][1] - 13], [q[2][0] - 3, q[2][1] - 4], [q[3][0] + 3, q[3][1] - 4]], { w: 6 });
  if (rivets) s += K.rivets([[x + 5, y + 5], [x + w - 5, y + 5], [x + 5, y + h - 5], [x + w - 5, y + h - 5]], 2.2);
  return s;
}
// AC unit with a fan grille (top) and louvres (front).
function acUnit(K, x, y, w = 40, h = 24, d = 30, shadow = true) {
  let s = blk(K, { x, y, w, h, d, t: STL, seams: 0, ties: false, stains: false, sw: 3.2, hatch: false, lip: false, shadow, chips: false, grime: false });
  const [tx, ty] = P3(x + w / 2, y, d / 2, h);
  s += `<ellipse cx="${f(tx)}" cy="${f(ty)}" rx="${f(w * 0.32)}" ry="${f(d * 0.2)}" fill="${STL[3]}" stroke="${P.ink}" stroke-width="2.5"/>`;
  s += `<path d="M${f(tx - w * 0.26)} ${f(ty)} H${f(tx + w * 0.26)} M${f(tx)} ${f(ty - d * 0.16)} V${f(ty + d * 0.16)}" stroke="${P.ink}" stroke-width="2"/>`;
  for (let k = 1; k < 4; k++) s += ln(x + 5, y - h + k * (h / 4), x + w - 5, y - h + k * (h / 4), STL[3], 2);
  return s;
}
// Rotating beacon lamp on a little base.
function beacon(K, x, y, col = AMB, r = 7) {
  let s = rect(x - r - 3, y - 5, r * 2 + 6, 7, STL[3], 2.5);
  s += `<path d="M${f(x - r)} ${f(y - 5)} A${r} ${r * 1.1} 0 0 1 ${f(x + r)} ${f(y - 5)} Z" fill="${col.c}" stroke="${P.ink}" stroke-width="2.5"/>`;
  K.glow(`<circle cx="${f(x)}" cy="${f(y - 8)}" r="${f(r * 3.4)}" fill="${col.c}" opacity=".55" filter="url(#bloom)"/><circle cx="${f(x - 2)}" cy="${f(y - 9)}" r="${f(r * 0.4)}" fill="${col.core}"/>`);
  return s;
}
// Holographic flag on a steel pole (the HQ's version of the old banners).
function holoFlag(K, x, yBot, { pole = 120, w = 58, h = 38, col = CY, dir = 1, wave = 1 } = {}) {
  const top = yBot - pole;
  castPole(x, yBot, pole, 3, 0.35);
  let s = `<path d="M${f(x)} ${f(yBot)} V${f(top)}" stroke="${P.ink}" stroke-width="9" stroke-linecap="round"/><path d="M${f(x)} ${f(yBot)} V${f(top)}" stroke="${STL[1]}" stroke-width="4" stroke-linecap="round"/>`;
  s += rect(x - 7, yBot - 12, 14, 12, STL[3], 2.5);
  s += rect(x - 6, top - 6, 12, 10, STL[2], 2.5);
  const bx = x + dir * 6, by = top;
  const X = (u) => bx + dir * u * w;
  const Y = (u, v) => by + v * h + Math.sin(u * Math.PI * 1.6) * 5 * wave;
  const flag = `M${f(X(0))} ${f(Y(0, 0))} Q${f(X(0.5))} ${f(Y(0.5, 0) - 8 * wave)} ${f(X(1))} ${f(Y(1, 0))} L${f(X(0.88))} ${f(Y(0.88, 0.5))} L${f(X(1))} ${f(Y(1, 1))} Q${f(X(0.5))} ${f(Y(0.5, 1) - 8 * wave)} ${f(X(0))} ${f(Y(0, 1))} Z`;
  const id = K.id('hfs');
  K.def(`<pattern id="${id}" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="2" fill="${col.core}" opacity=".45"/></pattern>`);
  const ex = X(0.42), ey = Y(0.42, 0.5) - 3, sc = h / 38;
  const emb = `<path d="M${f(ex - 9 * sc)} ${f(ey - 9 * sc)} H${f(ex + 9 * sc)} V${f(ey + 1 * sc)} Q${f(ex + 9 * sc)} ${f(ey + 9 * sc)} ${f(ex)} ${f(ey + 12 * sc)} Q${f(ex - 9 * sc)} ${f(ey + 9 * sc)} ${f(ex - 9 * sc)} ${f(ey + 1 * sc)} Z" fill="none" stroke="${col.core}" stroke-width="2.6"/><path d="M${f(ex)} ${f(ey - 6 * sc)} V${f(ey + 8 * sc)}" stroke="${col.core}" stroke-width="2.2"/>`;
  K.glow(`<path d="${flag}" fill="${col.c}" opacity=".5" filter="url(#bloom)"/>` +
    `<path d="${flag}" fill="${col.deep}" opacity=".6"/><path d="${flag}" fill="url(#${id})"/>` +
    `<path d="${flag}" fill="none" stroke="${col.c}" stroke-width="3"/>${emb}` +
    `<path d="M${f(x)} ${f(top - 1)} L${f(X(0.2))} ${f(Y(0.2, 0))} M${f(x)} ${f(top - 1)} L${f(X(0.2))} ${f(Y(0.2, 1))}" stroke="${col.c}" stroke-width="1.4" opacity=".6"/>`);
  return s;
}
// Sandbag wall: rows of lumpy bags. x0..x1 along the front, y = ground.
function sandbags(K, x0, x1, y, rows = 3, bw = 30, bh = 14) {
  castBox(x0, y, x1 - x0, rows * (bh - 2.5), 16, 0.45);
  let s = '';
  const tones = ['#c9b089', '#a18b66', '#7a6849', '#4f4230'];
  for (let r = 0; r < rows; r++) {
    const yy = y - r * (bh - 3);
    let xx = x0 + (r % 2 ? bw * 0.5 : 0) + r * 4;
    const end = x1 - r * 4;
    while (xx < end - 8) {
      const ww = Math.min(bw * K.rand(0.88, 1.12), end - xx);
      const cx = xx + ww / 2, cy = yy - bh / 2;
      s += `<path d="M${f(xx + 2)} ${f(cy)} C${f(xx + 1)} ${f(cy - bh * 0.62)} ${f(xx + ww - 1)} ${f(cy - bh * 0.7)} ${f(xx + ww - 1)} ${f(cy)} C${f(xx + ww)} ${f(cy + bh * 0.6)} ${f(xx + 1)} ${f(cy + bh * 0.62)} ${f(xx + 2)} ${f(cy)} Z" fill="${tones[1]}" stroke="${P.ink}" stroke-width="3"/>`;
      s += `<ellipse cx="${f(cx - ww * 0.12)}" cy="${f(cy - bh * 0.2)}" rx="${f(ww * 0.3)}" ry="${f(bh * 0.2)}" fill="${tones[0]}"/>`;
      s += `<path d="M${f(xx + ww * 0.78)} ${f(cy - bh * 0.32)} q2.5 ${f(bh * 0.3)} 0 ${f(bh * 0.62)}" stroke="${tones[3]}" stroke-width="1.8" fill="none"/>`;
      s += `<path d="M${f(cx - ww * 0.1)} ${f(cy + bh * 0.28)} h${f(ww * 0.4)}" stroke="${tones[2]}" stroke-width="2" fill="none"/>`;
      xx += ww - 1;
    }
  }
  return s;
}
// Concrete jersey barrier.
function jersey(K, x, y, w = 70, h = 32, t = CON, paint = false) {
  let s = blk(K, { x, y, w, h, d: 24, t, seams: 0, ties: false, sw: 3.5, hatch: true, lip: true, chips: true });
  s += ln(x + 3, y - h * 0.4, x + w - 3, y - h * 0.4, t[3], 2.2, ' opacity=".7"');
  if (paint) s += K.hazard([[x + 3, y - h + 5], [x + w - 3, y - h + 5], [x + w - 3, y - h + 14], [x + 3, y - h + 14]], { w: 5 });
  return s;
}
// Shipping-container-ish crate.
function crate(K, x, y, w = 34, h = 26, d = 28, tones = OLIVE, mark = '') {
  let s = blk(K, { x, y, w, h, d, t: tones, seams: 0, ties: false, stains: false, sw: 3, hatch: false, chips: false, grime: false });
  s += ln(x + 3, y - h / 2, x + w - 3, y - h / 2, tones[3], 2);
  if (mark) s += K.text(mark, x + w / 2, y - h * 0.3, { size: Math.min(10, h * 0.4), color: '#efe3c4', opacity: 0.85 });
  return s;
}
// Utility pole with a crossarm; returns svg, arm tip coords via callback list.
function upole(K, x, yBot, h = 120) {
  castPole(x, yBot, h, 4, 0.35);
  let s = K.post(x, yBot - h, yBot, 9, STL);
  s += K.beam(x - 22, yBot - h + 12, x + 22, yBot - h + 12, 6, STL);
  for (const ax of [x - 18, x + 18]) s += `<rect x="${f(ax - 3)}" y="${f(yBot - h + 2)}" width="6" height="9" rx="2" fill="#d9d2c0" stroke="${P.ink}" stroke-width="2"/>`;
  return s;
}
// Street lamp with cyan head.
function lamp(K, x, yBot, h = 96, dir = 1, col = CY) {
  castPole(x, yBot, h, 4, 0.35);
  let s = `<path d="M${f(x)} ${f(yBot)} V${f(yBot - h)} q0 -10 ${f(dir * 12)} -10 h${f(dir * 16)}" fill="none" stroke="${P.ink}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += `<path d="M${f(x)} ${f(yBot)} V${f(yBot - h)} q0 -10 ${f(dir * 12)} -10 h${f(dir * 16)}" fill="none" stroke="${STL[1]}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
  const lx = x + dir * 28, ly = yBot - h - 10;
  s += rect(lx - 12, ly - 3, 24, 9, STL[3], 2.8);
  s += K.leds([[lx, ly + 8]], col, 4.5);
  s += rect(x - 7, yBot - 10, 14, 10, STL[3], 2.5);
  K.lightPool(lx + dir * 4, yBot + 4, 80, 30, col, 0.45);
  K.lightCone(lx, ly + 8, lx + dir * 6, yBot, 54, col, 0.16);
  return s;
}

// ------------------------------------------------------------ pieces
// Low scrap fence: corrugated sheets between steel posts, barbed wire on top.
function scrapFence(K, x0, x1, y, h = 54) {
  castBox(x0, y, x1 - x0, h, 8, 0.4);
  let s = '';
  let xx = x0;
  const tones = [RST, STL, ['#b8b2a6', '#8d877c', '#625d55'], RST];
  let i = 0;
  while (xx < x1 - 6) {
    const w = Math.min(K.rand(36, 56), x1 - xx);
    const hh = h * K.rand(0.82, 1.05);
    const tn = tones[i++ % tones.length];
    s += K.corrugated([[xx, y - hh], [xx + w + 3, y - hh + K.rand(-4, 4)], [xx + w + 3, y], [xx, y]], { tones: tn, angle: 0, pitch: 8 });
    xx += w;
  }
  for (let px = x0; px <= x1 + 1; px += (x1 - x0) / Math.max(2, Math.round((x1 - x0) / 60))) {
    s += `<path d="M${f(px)} ${f(y + 2)} V${f(y - h - 10)}" stroke="${P.ink}" stroke-width="7" stroke-linecap="round"/><path d="M${f(px)} ${f(y + 2)} V${f(y - h - 10)}" stroke="${STL[1]}" stroke-width="3" stroke-linecap="round"/>`;
  }
  let d = '';
  for (let k = 0; k <= x1 - x0; k += 6) d += `${k ? 'L' : 'M'}${f(x0 + k)} ${f(y - h - 6 + Math.sin(k * 0.95) * 4.5)}`;
  s += `<path d="${d}" stroke="${P.ink}" stroke-width="2.6" fill="none"/>`;
  return s;
}

function gate(K) {
  const { x0, x1, y, cx, wh, wd } = HQ.gate;
  const dx0 = cx - 102, dx1 = cx + 102, dh = 88; // door opening
  let s = '';
  // the bunker wall
  s += blk(K, {
    x: x0, y, w: x1 - x0, h: wh, d: wd, t: CON, seams: 44,
    front: (fx0, fy0, fx1, fy1) => plate(K, fx0 + 26, fy0 + 30, 40, 50, RST, { stripe: true }) + plate(K, fx1 - 64, fy0 + 24, 42, 56, STL, {}),
    top: (T) => {
      // walkway rail + spikes along the wall top
      let q = '';
      const a = T[1], b = T[2];
      for (let k = 0; k < 20; k++) {
        const u = (k + 0.5) / 20;
        const px = lerp(a[0], b[0], u), py = lerp(a[1], b[1], u) + 2;
        q += `<path d="M${f(px - 4)} ${f(py)} L${f(px + 1)} ${f(py - 12)} L${f(px + 4)} ${f(py)} Z" fill="${STL[2]}" stroke="${P.ink}" stroke-width="2"/>`;
      }
      return q;
    },
  });
  // sign gantry on the wall top (behind the buttress tops)
  s += gateSign(K);
  // door: deep recess, steel jamb, slab
  s += rect(dx0 - 12, y - dh - 12, dx1 - dx0 + 24, dh + 12, STL[2], 4);
  s += rect(dx0 - 12, y - dh - 12, dx1 - dx0 + 24, 6, STL[0], 0);
  s += rect(dx0, y - dh, dx1 - dx0, dh, '#17141b', 3);
  const dt = ['#a4adae', '#7b878c', '#56616a', '#3a434c'];
  s += rect(dx0 + 4, y - dh + 6, dx1 - dx0 - 8, dh - 6, dt[1], 3.5);
  s += rect(dx0 + 4, y - dh + 6, 14, dh - 6, dt[0], 0, ' opacity=".6"');
  // armour ribs
  for (const k of [0.25, 0.52]) s += rect(dx0 + 8, y - dh * (1 - k) - 5, dx1 - dx0 - 16, 11, dt[0], 2.8) + ln(dx0 + 10, y - dh * (1 - k) + 6, dx1 - 10, y - dh * (1 - k) + 6, dt[3], 2.4);
  // zig-zag interlock seam down the middle
  let z = `M${f(cx)} ${f(y - dh + 6)}`;
  for (let k = 1; k <= 6; k++) z += ` L${f(cx + (k % 2 ? 10 : -10))} ${f(y - dh + 6 + ((dh - 6) * k) / 6.6)}`;
  z += ` L${f(cx)} ${f(y)}`;
  s += `<path d="${z}" stroke="${P.ink}" stroke-width="5.5" fill="none" stroke-linejoin="round"/><path d="${z}" stroke="${dt[0]}" stroke-width="1.8" fill="none" transform="translate(-2.5 0)"/>`;
  // hazard band at the foot of the door
  s += K.hazard([[dx0 + 5, y - 24], [dx1 - 5, y - 24], [dx1 - 5, y - 3], [dx0 + 5, y - 3]], { w: 9 });
  // bolts along the edges
  const bl = [];
  for (let k = 0; k < 6; k++) { const yy = y - dh + 14 + k * ((dh - 44) / 5); bl.push([dx0 + 12, yy], [dx1 - 12, yy]); }
  s += K.rivets(bl, 2.8);
  // stencil
  s += K.text('PLEASE', cx - 50, y - dh + 30, { size: 13, color: '#efe5cb', opacity: 0.92 });
  s += K.text('KNOCK', cx + 50, y - dh + 30, { size: 13, color: '#efe5cb', opacity: 0.92 });
  // hydraulic rams either side
  for (const hx of [dx0 - 8, dx1 + 8]) s += K.pipe(`M${f(hx)} ${f(y - dh + 4)} V${f(y - 10)}`, 7, STL[1], STL[0]);
  // cyan status strip over the door
  s += K.neon(`M${f(dx0 + 8)} ${f(y - dh - 17)} H${f(dx1 - 8)}`, CY, 4);
  // buttresses
  const but = (bx, right) => {
    const bw = 84, bh = 132, bd = 92, by = y + 16;
    let q = blk(K, {
      x: bx, y: by, w: bw, h: bh, d: bd, t: CONB, seams: 0,
      front: (fx0, fy0, fx1, fy1) => {
        let r = '';
        r += K.hazard([[fx0 + 3, fy1 - 32], [fx1 - 3, fy1 - 32], [fx1 - 3, fy1 - 4], [fx0 + 3, fy1 - 4]], { w: 10 });
        r += plate(K, fx0 + 10, fy0 + 22, bw - 20, 54, TEAL, {});
        const lx = (fx0 + fx1) / 2, ly = fy0 + 48;
        r += `<path d="M${f(lx - 14)} ${f(ly - 15)} H${f(lx + 14)} V${f(ly + 1)} Q${f(lx + 14)} ${f(ly + 14)} ${f(lx)} ${f(ly + 18)} Q${f(lx - 14)} ${f(ly + 14)} ${f(lx - 14)} ${f(ly + 1)} Z" fill="${TEAL[3]}" stroke="${P.ink}" stroke-width="2.8"/>`;
        r += `<path d="M${f(lx)} ${f(ly - 10)} V${f(ly + 12)} M${f(lx - 9)} ${f(ly - 2)} H${f(lx + 9)}" stroke="#e8f2ea" stroke-width="3.2"/>`;
        r += K.leds([[fx0 + 12, fy0 + 11], [fx1 - 12, fy0 + 11]], CY, 2.8);
        if (right) r += K.graffiti(lx, fy1 - 40, 'NO', '#ff3d9a', { size: 15, rot: -8 });
        return r;
      },
      top: (T) => {
        const [tx, ty] = P3(bx + bw / 2, by, bd / 2, bh);
        return beacon(K, tx, ty + 5, AMB, 8);
      },
    });
    // floodlight on the outer top corner, aimed up the road
    const fx = right ? bx + bw - 10 : bx + 14, fy = by - bh + 2;
    q += `<path d="M${f(fx)} ${f(fy + 6)} V${f(fy - 10)}" stroke="${P.ink}" stroke-width="6"/>`;
    q += `<g transform="rotate(${right ? 20 : -20} ${f(fx)} ${f(fy - 14)})">` + rect(fx - 12, fy - 22, 24, 15, STL[3], 3) + `</g>`;
    q += K.leds([[fx, fy - 18]], AMB, 4);
    K.lightCone(fx, fy - 20, cx + (right ? 70 : -70), y - 420, 80, AMB, 0.13);
    return q;
  };
  s += but(x0 - 20, false);
  s += but(x1 - 64, true);
  return s;
}

// AEGIS: the HQ's big neon sign, on a gantry over the blast gate (the road's end).
function gateSign(K) {
  const { cx, y, wh, wd } = HQ.gate;
  const sw = 270, sh = 62;
  const [bx, by] = P3(cx, y, wd * 0.45, wh); // ground point of the gantry on the wall top
  const base = by, top = base - 12 - sh;
  let s = '';
  for (const lx of [bx - sw * 0.36, bx + sw * 0.36]) s += K.post(lx, top + sh - 8, base + 2, 10, STL);
  s += rect(bx - sw / 2 - 9, top - 9, sw + 18, sh + 18, '#221e27', 4.5);
  s += rect(bx - sw / 2 - 3, top - 3, sw + 6, 9, '#3b3543', 0);
  s += K.rivets([[bx - sw / 2 - 2, top - 2], [bx + sw / 2 + 2, top - 2], [bx - sw / 2 - 2, top + sh + 2], [bx + sw / 2 + 2, top + sh + 2]], 2.6);
  // shield logo
  const lx = bx - sw / 2 + 32, ly = top + sh / 2 - 2;
  s += K.neon(`M${f(lx - 18)} ${f(ly - 21)} H${f(lx + 18)} V${f(ly + 2)} Q${f(lx + 18)} ${f(ly + 18)} ${f(lx)} ${f(ly + 25)} Q${f(lx - 18)} ${f(ly + 18)} ${f(lx - 18)} ${f(ly + 2)} Z`, CY, 4);
  s += K.neon(`M${f(lx)} ${f(ly - 13)} V${f(ly + 16)} M${f(lx - 10)} ${f(ly - 3)} H${f(lx + 10)}`, CY, 3.5);
  s += K.text('AEGIS', bx + 22, top + sh * 0.8, { size: 50, glowCol: CY });
  // cable from the sign down the wall
  s += K.cable(bx + sw / 2 + 4, top + sh - 6, bx + sw / 2 + 40, base + 30, 14, 3.5);
  K.haze(bx, top + sh / 2, sw * 0.75, sh * 1.4, CY, 0.2);
  return s;
}

function mainBlock(K) {
  const { x, y, w, h, d } = HQ.main;
  const cx = HQ.gate.cx;
  const pw = 128; // porch width
  let s = '';
  s += blk(K, {
    x, y, w, h, d, t: CON, seams: 60, topFill: ROOF[1],
    front: (fx0, fy0, fx1, fy1) => {
      let r = '';
      // teal corporate band under the roof line
      r += rect(fx0 + 2, fy0 + 9, w - 4, 16, TEAL[1], 0) + ln(fx0 + 2, fy0 + 10, fx1 - 2, fy0 + 10, TEAL[0], 2.5) + ln(fx0 + 2, fy0 + 25, fx1 - 2, fy0 + 25, P.ink, 3);
      for (let xx = fx0 + 40; xx < fx1 - 20; xx += 96) r += K.text('AEGIS', xx + 20, fy0 + 22, { size: 10, color: TEAL[3], opacity: 0.8 });
      // scrap plates on the lower facade
      r += plate(K, fx0 + 12, fy1 - 72, 70, 54, RST, {});
      r += plate(K, fx0 + 92, fy1 - 56, 44, 38, STL, {});
      r += plate(K, fx1 - 112, fy1 - 70, 86, 52, RST, { stripe: true });
      r += plate(K, fx1 - 186, fy1 - 50, 50, 34, YEL, {});
      // a corrugated patch where a wall was blown out and fixed
      r += K.corrugated([[fx0 + 150, fy0 + 70], [fx0 + 196, fy0 + 66], [fx0 + 198, fy1 - 16], [fx0 + 148, fy1 - 14]], { tones: RST, angle: 0, pitch: 7 });
      // windows: armoured slits with light
      const win = (wx, wy, ww, col) => {
        let q = rect(wx - 4, wy - 4, ww + 8, 23, CON[3], 2.8);
        q += rect(wx, wy, ww, 15, col === 'warm' ? P.warm[1] : CY.c, 2.8);
        q += rect(wx, wy, ww, 6, STL[2], 2.4);
        q += ln(wx + ww * 0.33, wy + 6, wx + ww * 0.33, wy + 15, P.ink, 2) + ln(wx + ww * 0.66, wy + 6, wx + ww * 0.66, wy + 15, P.ink, 2);
        if (col === 'warm') K.glow(`<rect x="${f(wx + 1.5)}" y="${f(wy + 7)}" width="${f(ww - 3)}" height="7" fill="${P.warm[0]}" opacity=".9"/><ellipse cx="${f(wx + ww / 2)}" cy="${f(wy + 10)}" rx="${f(ww * 0.8)}" ry="12" fill="${P.warm[2]}" opacity=".35" filter="url(#bloom)"/>`);
        else K.glow(`<rect x="${f(wx + 1.5)}" y="${f(wy + 7)}" width="${f(ww - 3)}" height="7" fill="${CY.core}" opacity=".85"/><ellipse cx="${f(wx + ww / 2)}" cy="${f(wy + 10)}" rx="${f(ww * 0.8)}" ry="12" fill="${CY.c}" opacity=".4" filter="url(#bloom)"/>`);
        return q;
      };
      const pl = cx - pw / 2, pr = cx + pw / 2;
      for (const [wx, col] of [[fx0 + 24, 'cyan'], [fx0 + 84, 'warm'], [pl - 92, 'cyan'], [pl - 44, 'cyan'], [pr + 12, 'warm'], [pr + 60, 'cyan'], [fx1 - 108, 'cyan']]) r += win(wx, fy0 + 40, 32, col);
      // pipes and cable runs on the facade
      r += K.pipe(`M${f(pl - 6)} ${f(fy0 + 26)} V${f(fy1 - 30)}`, 7, STL[2], STL[0]);
      r += K.pipe(`M${f(fx1 - 14)} ${f(fy0 + 26)} V${f(fy1 - 2)}`, 9, RST[1], RST[0]);
      r += K.cable(fx0 + 6, fy0 + 30, fx0 + 130, fy0 + 30, 18, 3.8);
      r += K.cable(pr + 8, fy0 + 30, fx1 - 30, fy0 + 30, 18, 3.8);
      // wall-hung AC box
      r += acUnit(K, pr + 108, fy0 + 92, 38, 26, 18, false);
      // graffiti
      r += K.graffiti(fx0 + 112, fy1 - 10, 'HOME', '#ff3d9a', { size: 20, rot: -5 });
      r += K.graffiti(pr + 52, fy1 - 8, 'sweet', '#9dff3a', { size: 14, rot: -10 });
      return r;
    },
    top: (T) => roofTop(K, T),
  });
  // entrance porch: protrudes from the facade
  const ph = 104, pd = 30, px = cx - pw / 2, py = y + 12;
  s += blk(K, {
    x: px, y: py, w: pw, h: ph, d: pd, t: CONB, seams: 0, ties: false,
    front: (fx0, fy0, fx1, fy1) => {
      let r = '';
      const ex0 = cx - 40, ex1 = cx + 40, eh = 78;
      r += rect(ex0 - 6, fy1 - eh - 6, ex1 - ex0 + 12, eh + 6, CON[3], 3.5);
      r += rect(ex0, fy1 - eh, ex1 - ex0, eh, '#14222a', 3);
      K.glow(`<rect x="${f(ex0 + 4)}" y="${f(fy1 - eh + 4)}" width="${f(ex1 - ex0 - 8)}" height="${f(eh - 6)}" fill="${CY.deep}" opacity=".95"/>` +
        `<rect x="${f(ex0 + 9)}" y="${f(fy1 - eh + 26)}" width="${f(ex1 - ex0 - 18)}" height="${f(eh - 30)}" fill="${CY.c}" opacity=".6"/>` +
        `<rect x="${f(cx - 2.5)}" y="${f(fy1 - eh + 26)}" width="5" height="${f(eh - 30)}" fill="${CY.core}" opacity=".85"/>` +
        `<ellipse cx="${f(cx)}" cy="${f(fy1 - eh / 2)}" rx="${f(eh * 0.85)}" ry="${f(eh * 0.65)}" fill="${CY.c}" opacity=".3" filter="url(#bloom)"/>`);
      // half-raised blast shutter
      r += rect(ex0, fy1 - eh, ex1 - ex0, 24, STL[1], 3) + K.hazard([[ex0 + 2, fy1 - eh + 14], [ex1 - 2, fy1 - eh + 14], [ex1 - 2, fy1 - eh + 22], [ex0 + 2, fy1 - eh + 22]], { w: 5 });
      // name plate over the door
      r += rect(cx - 34, fy0 + 6, 68, 18, YEL[1], 3) + K.text('HQ-01', cx, fy0 + 20, { size: 12, color: P.ink });
      r += K.leds([[ex0 - 14, fy1 - eh + 4], [ex1 + 14, fy1 - eh + 4]], CY, 4);
      return r;
    },
  });
  // canopy over the porch
  const cpy = py - ph + 4;
  s += poly([[px - 20, cpy - 6], [px + pw + 20, cpy - 6], [px + pw + 34, cpy - 24], [px - 6, cpy - 24]], STL[2], 4);
  s += poly([[px - 20, cpy - 6], [px + pw + 20, cpy - 6], [px + pw + 20, cpy], [px - 20, cpy]], STL[3], 3.5);
  s += K.neon(`M${f(px - 14)} ${f(cpy + 3)} H${f(px + pw + 14)}`, CY, 3.5);
  // HQ blade sign on the facade's right part, rising over the roof line
  s += bladeSign(K, x + w - 64, y - h - 52);
  return s;
}
// Vertical neon blade sign reading H / Q.
function bladeSign(K, x, y) {
  const w = 54, h = 132;
  let s = '';
  s += K.beam(x - 12, y + 26, x + 8, y + 26, 7, STL) + K.beam(x - 12, y + h - 26, x + 8, y + h - 26, 7, STL);
  s += blk(K, { x, y: y + h, w, h, d: 18, t: ['#3d3646', '#2a2530', '#1d1922', '#151218', '#0f0d12'], seams: 0, ties: false, stains: false, grime: false, chips: false, hatch: false, sw: 4.5, shadow: false });
  s += K.neon(`M${f(x + 7)} ${f(y + 8)} H${f(x + w - 7)} V${f(y + h - 8)} H${f(x + 7)} Z`, CY, 2.2);
  s += K.text('H', x + w / 2, y + 58, { size: 46, glowCol: CY });
  s += K.text('Q', x + w / 2 + 1, y + 116, { size: 46, glowCol: CY, font: 'Chakra' });
  return s;
}

// Roof of the main block (dark tar, lit parapet): helipad, skylight, AC cluster, tank.
function roofTop(K, T) {
  const { x, y, w, h, d } = HQ.main;
  const ry = y - h;
  const Q = (u, z, hh = 0) => P3(x + u, ry, z, hh);
  let s = '';
  // tar patches, puddles, roof seams
  const cid = K.id('hqr');
  K.def(`<clipPath id="${cid}"><polygon points="${pts(T)}"/></clipPath>`);
  let inner = '';
  for (let k = 0; k < 10; k++) {
    const [px, py] = Q(K.rand(20, w - 20), K.rand(10, d - 10));
    inner += `<ellipse cx="${f(px)}" cy="${f(py)}" rx="${f(K.rand(18, 46))}" ry="${f(K.rand(5, 11))}" fill="${K.pick([ROOF[0], ROOF[2]])}" opacity=".45"/>`;
  }
  for (let u = 70; u < w; u += 70) inner += `<path d="M${f(Q(u, 0)[0])} ${f(Q(u, 0)[1])} L${f(Q(u, d)[0])} ${f(Q(u, d)[1])}" stroke="${ROOF[2]}" stroke-width="2.2" opacity=".7"/>`;
  inner += K.hatch(dpoly(T), { density: 0.25, op: 0.3, len: [8, 16] });
  s += `<g clip-path="url(#${cid})">${inner}</g>`;
  // parapet (lit concrete lip around the roof)
  const lipF = [Q(0, 0, 0), Q(w, 0, 0), Q(w, 12, 0), Q(12, 12, 0), Q(12, d - 12, 0), Q(0, d, 0)];
  void lipF;
  const lip = (a, b, c, e, tone) => poly([a, b, c, e], tone, 2.8);
  s += lip(Q(0, d - 10, 10), Q(w, d - 10, 10), Q(w, d, 10), Q(0, d, 10), CON[0]);
  s += lip(Q(0, 0, 10), Q(0, d, 10), Q(10, d, 10), Q(10, 0, 10), CON[0]);
  s += lip(Q(w - 10, 0, 10), Q(w - 10, d, 10), Q(w, d, 10), Q(w, 0, 10), CON[0]);
  s += poly([Q(10, d - 10, 0), Q(w - 10, d - 10, 0), Q(w - 10, d - 10, 10), Q(10, d - 10, 10)], CON[1], 2.5);
  s += poly([Q(10, 10, 10), Q(10, d - 10, 10), Q(10, d - 10, 0), Q(10, 10, 0)], CON[2], 2.5);
  // front lip (drawn last: nearest)
  s += poly([Q(0, 0, 10), Q(w, 0, 10), Q(w, 10, 10), Q(0, 10, 10)], CON[0], 2.8);
  s += poly([Q(0, 0, 0), Q(w, 0, 0), Q(w, 0, 10), Q(0, 0, 10)], CON[1], 2.8);
  // helipad (left)
  const [hx, hy] = Q(132, d * 0.52);
  s += `<ellipse cx="${f(hx)}" cy="${f(hy)}" rx="92" ry="34" fill="${ROOF[2]}" stroke="${P.ink}" stroke-width="3.5"/>`;
  s += `<ellipse cx="${f(hx)}" cy="${f(hy)}" rx="78" ry="28" fill="none" stroke="${YEL[0]}" stroke-width="4"/>`;
  s += `<g transform="translate(${f(hx)} ${f(hy)}) scale(1 0.42)">` + K.text('H', 0, 22, { size: 62, color: YEL[0] }) + '</g>';
  const pl = [];
  for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; pl.push([hx + Math.cos(a) * 86, hy + Math.sin(a) * 31]); }
  s += K.leds(pl, CY, 2.3);
  // skylight: cyan-lit glass panels (the ops room below)
  {
    const u0 = 250, u1 = 320, z0 = 40, z1 = 100;
    const g = [Q(u0, z0, 4), Q(u1, z0, 4), Q(u1, z1, 4), Q(u0, z1, 4)];
    s += poly([Q(u0, z0, 0), Q(u1, z0, 0), Q(u1, z0, 4), Q(u0, z0, 4)], STL[2], 2.5);
    s += poly(g, '#14262d', 3);
    K.glow(`<polygon points="${pts(g)}" fill="${CY.deep}" opacity=".9"/><polygon points="${pts([Q(u0 + 4, z0 + 4, 4), Q(u1 - 4, z0 + 4, 4), Q(u1 - 4, z1 - 4, 4), Q(u0 + 4, z1 - 4, 4)])}" fill="${CY.c}" opacity=".45"/>` +
      `<path d="M${pts([Q((u0 + u1) / 2, z0, 4)])} L${pts([Q((u0 + u1) / 2, z1, 4)])} M${pts([Q(u0, (z0 + z1) / 2, 4)])} L${pts([Q(u1, (z0 + z1) / 2, 4)])}" stroke="${P.ink}" stroke-width="3"/>` +
      `<ellipse cx="${f(Q((u0 + u1) / 2, (z0 + z1) / 2, 4)[0])}" cy="${f(Q((u0 + u1) / 2, (z0 + z1) / 2, 4)[1])}" rx="60" ry="26" fill="${CY.c}" opacity=".3" filter="url(#bloom)"/>`);
  }
  // pipe run along the roof
  s += K.pipe(`M${pts([Q(214, 24, 6)])} L${pts([Q(370, 24, 6)])} L${pts([Q(370, 100, 6)])}`, 7, STL[2], STL[0]);
  // AC cluster (right)
  for (const [u, z] of [[372, 104], [420, 96], [380, 46], [428, 38]]) {
    const [ax, ay] = Q(u, z);
    s += acUnit(K, ax, ay, 42, 26, 32, false);
  }
  // vents
  for (const [u, z] of [[340, 112], [480, 120]]) {
    const [vx, vy] = Q(u, z);
    s += K.cyl({ cx: vx, y: vy, rx: 9, ry: 4, h: 22, tones: STL, top: 'rim', stroke: 3, hatch: false });
  }
  // water tank on stilts (far right corner)
  {
    const [wx, wy] = Q(500, 104);
    s += K.post(wx - 16, wy - 26, wy, 6, STL) + K.post(wx + 16, wy - 26, wy, 6, STL);
    s += K.cyl({ cx: wx, y: wy - 24, rx: 26, ry: 11, h: 44, tones: RST, top: 'rim' });
    s += K.hoop(wx, wy - 38, 26, 11, 4, P.ink) + K.hoop(wx, wy - 56, 26, 11, 4, P.ink);
  }
  return s;
}

// Comms mast behind the main block: lattice tower, dishes, lights.
function mast(K) {
  const x = 2034, yBot = 1310, H = 330;
  castPole(x + 20, 1496, 210, 20, 0.25);
  let s = '';
  const top = yBot - H;
  const wb = 58, wt = 14;
  const L0 = [x - wb / 2, yBot], L1 = [x - wt / 2, top + 20], R0 = [x + wb / 2, yBot], R1 = [x + wt / 2, top + 20];
  let d = `M${f(L0[0])} ${f(L0[1])} L${f(L1[0])} ${f(L1[1])} M${f(R0[0])} ${f(R0[1])} L${f(R1[0])} ${f(R1[1])}`;
  const n = 9;
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    const a = [lerp(L0[0], L1[0], t0), lerp(L0[1], L1[1], t0)], b = [lerp(R0[0], R1[0], t1), lerp(R0[1], R1[1], t1)];
    const c = [lerp(R0[0], R1[0], t0), lerp(R0[1], R1[1], t0)], e = [lerp(L0[0], L1[0], t1), lerp(L0[1], L1[1], t1)];
    d += ` M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])} M${f(c[0])} ${f(c[1])} L${f(e[0])} ${f(e[1])} M${f(a[0])} ${f(a[1])} L${f(c[0])} ${f(c[1])}`;
  }
  s += `<path d="${d}" fill="none" stroke="${P.ink}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${STL[1]}" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"/>`;
  // spire
  s += K.antenna(x, top + 22, 64, CY);
  // platform with railing
  const py = top + 100;
  s += blk(K, { x: x - 38, y: py, w: 76, h: 9, d: 34, t: STL, seams: 0, ties: false, stains: false, grime: false, hatch: false, chips: false, sw: 3, shadow: false });
  s += ln(x - 38, py - 24, x + 38, py - 24, P.ink, 3) + ln(x - 38, py - 9, x - 38, py - 24, P.ink, 3) + ln(x + 38, py - 9, x + 38, py - 24, P.ink, 3);
  // big dish facing up-left
  s += K.dish(x - 22, py - 34, 46, STL, -26);
  // smaller dish lower, facing left
  s += K.dish(x + 26, top + 196, 24, STL, -62);
  // panel antennas
  s += rect(x + 10, top + 140, 10, 30, STL[1], 2.6) + rect(x - 22, top + 150, 10, 30, STL[1], 2.6);
  // aviation lights
  s += K.leds([[x - 10, top + 46], [x + 12, top + 150], [x - 16, top + 236]], RED, 2.8);
  return s;
}

// Left: watchtower on a concrete bunker base, with a searchlight.
function watchtower(K) {
  const x = 1388, y = 1480;
  let s = '';
  s += blk(K, {
    x, y, w: 100, h: 78, d: 96, t: CON, seams: 50,
    front: (fx0, fy0, fx1, fy1) => plate(K, fx0 + 10, fy0 + 16, 44, 46, RST, { stripe: true }) + rect(fx0 + 64, fy1 - 50, 26, 50, '#2a2530', 3) + K.leds([[fx0 + 77, fy1 - 57]], AMB, 2.8),
  });
  // legs from the roof up to the cabin
  const [bx, by] = P3(x + 50, y - 78, 48);
  const legH = 108;
  castPole(bx + 40, y, 170, 30, 0.3);
  s += K.post(bx - 30, by - legH, by + 10, 9, STL) + K.post(bx + 30, by - legH, by + 10, 9, STL);
  s += K.beam(bx - 30, by - 10, bx + 30, by - legH + 10, 5, STL) + K.beam(bx + 30, by - 10, bx - 30, by - legH + 10, 5, STL);
  // ladder
  s += ln(bx - 6, by + 8, bx - 6, by - legH, P.ink, 3) + ln(bx + 6, by + 8, bx + 6, by - legH, P.ink, 3);
  for (let k = 0; k < 8; k++) s += ln(bx - 6, by - k * 12, bx + 6, by - k * 12, P.ink, 2);
  // cabin
  const cy0 = by - legH;
  s += blk(K, {
    x: bx - 46, y: cy0 + 6, w: 92, h: 50, d: 64, t: OLIVE, seams: 0, ties: false, shadow: false,
    front: (fx0, fy0, fx1, fy1) => {
      let r = rect(fx0 + 8, fy0 + 10, fx1 - fx0 - 16, 16, '#1d2a30', 3);
      K.glow(`<rect x="${f(fx0 + 10)}" y="${f(fy0 + 12)}" width="${f(fx1 - fx0 - 20)}" height="12" fill="${CY.c}" opacity=".7"/><ellipse cx="${f((fx0 + fx1) / 2)}" cy="${f(fy0 + 18)}" rx="50" ry="14" fill="${CY.c}" opacity=".35" filter="url(#bloom)"/>`);
      r += ln(fx0 + 36, fy0 + 10, fx0 + 36, fy0 + 26, P.ink, 2.5) + ln(fx0 + 60, fy0 + 10, fx0 + 60, fy0 + 26, P.ink, 2.5);
      r += plate(K, fx0 + 6, fy0 + 30, 34, 16, RST, { rivets: false });
      return r;
    },
    top: (T) => K.corrugated(T, { tones: RST, angle: 24, pitch: 9 }),
  });
  // searchlight on the roof, aimed up-left at the plaza
  const [sx, sy] = P3(bx - 46 + 70, cy0 + 6, 30, 50);
  s += `<g transform="rotate(-30 ${f(sx)} ${f(sy - 10)})">` + rect(sx - 13, sy - 20, 26, 18, STL[2], 3) + `</g>`;
  s += K.leds([[sx - 9, sy - 15]], CY, 4.5);
  K.lightCone(sx - 9, sy - 15, sx - 210, sy - 140, 60, CY, 0.12);
  s += holoFlag(K, bx - 40, cy0 - 46, { pole: 70, w: 50, h: 32, dir: -1 });
  return s;
}

// Right: power block with coolant capacitors and an exhaust stack.
function powerBlock(K) {
  const x = 2040, y = 1488, w = 150, h = 92, d = 116;
  let s = blk(K, {
    x, y, w, h, d, t: CONB, seams: 50,
    front: (fx0, fy0, fx1, fy1) => {
      let r = '';
      r += rect(fx0 + 14, fy0 + 16, 52, 38, '#26232a', 3);
      for (let k = 0; k < 4; k++) r += ln(fx0 + 18, fy0 + 23 + k * 8, fx0 + 62, fy0 + 23 + k * 8, STL[2], 3);
      r += rect(fx0 + 78, fy0 + 14, 60, 34, YEL[1], 3);
      r += `<path d="M${f(fx0 + 112)} ${f(fy0 + 18)} l-10 13 h7 l-5 13 l13 -16 h-8 l6 -10 Z" fill="${P.ink}"/>`;
      r += K.text('HV', fx0 + 92, fy0 + 37, { size: 11, color: P.ink });
      r += K.hazard([[fx0 + 3, fy1 - 22], [fx1 - 3, fy1 - 22], [fx1 - 3, fy1 - 4], [fx0 + 3, fy1 - 4]], { w: 8 });
      return r;
    },
  });
  // capacitor tanks on the roof
  for (const [u, z, r] of [[36, 44, 23], [98, 64, 27]]) {
    const [tx, ty] = P3(x + u, y - h, z, 0);
    s += K.cyl({ cx: tx, y: ty, rx: r, ry: r * 0.45, h: 72, tones: STL, top: 'rim' });
    s += K.neonRing(tx, ty - 22, r, r * 0.45, CY, 4) + K.neonRing(tx, ty - 48, r, r * 0.45, CY, 4);
    s += K.orb(tx, ty - 80, 6, CY);
  }
  // exhaust stack with a wisp of smoke
  const [sx, sy] = P3(x + w - 8, y - h, 100, 0);
  s += K.cyl({ cx: sx, y: sy, rx: 13, ry: 5.5, h: 120, tones: RST, top: 'rim' });
  s += K.hoop(sx, sy - 86, 13, 5.5, 5, P.ink) + K.hoop(sx, sy - 40, 13, 5.5, 5, P.ink);
  // cable bundle from the capacitors across to the main block
  s += K.cable(x + 20, y - h - 40, x - 30, y - h - 20, 20, 4.5);
  return s;
}

// Ground: forecourt apron in front of the HQ (flat, cracked, sand drifting in).
function forecourt(K) {
  const ap = [[1530, 1500], [2010, 1500], [2034, 1560], [1980, 1598], [1872, 1602], [1858, 1640], [1684, 1640], [1672, 1604], [1560, 1600], [1518, 1560]];
  let s = K.apron(ap, {
    tone: '#5a524f',
    lines: [
      { d: 'M1696 1540 L1690 1630', color: '#e0bf45', w: 5, dash: '18 12' },
      { d: 'M1846 1540 L1852 1630', color: '#e0bf45', w: 5, dash: '18 12' },
      { d: 'M1530 1560 L1664 1566', color: '#e0bf45', w: 4 },
      { d: 'M1880 1566 L2020 1560', color: '#e0bf45', w: 4 },
      { d: 'M1930 1566 L1936 1598 M1980 1564 L1986 1596', color: '#e0bf45', w: 3.5 },
    ],
  });
  // sand drifts over the apron edges
  for (const [x, y, rx, ry] of [[1530, 1586, 40, 14], [2020, 1586, 40, 12], [1770, 1636, 70, 12], [1930, 1606, 34, 9]]) s += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${SAND[1]}" opacity=".75" filter="url(#soft)"/>`;
  return s;
}

// Entrance ramp from the porch down to the forecourt.
function ramp(K) {
  const cx = HQ.gate.cx, y = HQ.main.y + 12;
  const q = [[cx - 58, y], [cx + 58, y], [cx + 70, y + 30], [cx - 70, y + 30]];
  let s = poly(q, CON[1], 3.5);
  for (let k = 1; k < 4; k++) s += ln(cx - 58 - k * 3, y + k * 7.5, cx + 58 + k * 3, y + k * 7.5, CON[3], 2.2);
  s += K.hazard([[cx - 70, y + 30], [cx - 58, y], [cx - 48, y], [cx - 58, y + 30]], { w: 5 });
  s += K.hazard([[cx + 58, y], [cx + 70, y + 30], [cx + 58, y + 30], [cx + 48, y]], { w: 5 });
  return s;
}

// Armoured truck (scrap-plated), facing right. x,y = bottom-left of the body.
function truck(K, x, y) {
  let s = '';
  const tn = ['#a7ad8c', '#7e8566', '#4f5246', '#383b31', '#25271f'];
  castBox(x - 4, y, 176, 70, 56, 0.5);
  // cargo box (rear, left)
  s += blk(K, {
    x, y: y - 14, w: 108, h: 58, d: 56, t: tn, seams: 27, ties: false, sw: 4, shadow: false, chips: false,
    front: (fx0, fy0, fx1, fy1) => plate(K, fx0 + 10, fy0 + 10, 40, 30, RST, {}) + K.text('AEGIS', fx0 + 78, fy0 + 30, { size: 12, color: '#efe3c4', opacity: 0.9 }) + K.hazard([[fx0 + 2, fy1 - 10], [fx1 - 2, fy1 - 10], [fx1 - 2, fy1 - 2], [fx0 + 2, fy1 - 2]], { w: 5 }),
  });
  // cab (front, right)
  s += blk(K, {
    x: x + 106, y: y - 14, w: 54, h: 40, d: 56, t: tn, seams: 0, ties: false, sw: 4, shadow: false, chips: false,
    front: (fx0, fy0) => rect(fx0 + 30, fy0 + 6, 18, 12, '#2f3a44', 2.5) + K.leds([[fx0 + 48, fy0 + 30]], AMB, 3.2),
  });
  s += blk(K, { x: x + 108, y: y - 54, w: 38, h: 20, d: 44, t: tn, seams: 0, ties: false, stains: false, grime: false, sw: 3.2, shadow: false, chips: false, front: (fx0, fy0) => rect(fx0 + 4, fy0 + 4, 30, 9, '#2f3a44', 2.5) });
  // ram plate
  s += poly([[x + 160, y - 12], [x + 176, y - 8], [x + 172, y - 44], [x + 160, y - 50]], STL[2], 3.2);
  for (let k = 0; k < 4; k++) s += ln(x + 162, y - 18 - k * 8, x + 172, y - 16 - k * 8, P.ink, 2);
  // wheels
  for (const wx of [x + 22, x + 74, x + 134]) s += K.tyre(wx, y - 5, 17);
  // roof light bar
  s += K.leds([[x + 116, y - 76], [x + 128, y - 76], [x + 140, y - 76]], CY, 2.8);
  // spare tyre + jerry cans on the cargo roof
  const [tx, ty] = P3(x + 40, y - 72, 26);
  s += K.tyre(tx, ty, 15);
  return s;
}

// Front-left: container barracks with a corrugated lean-to porch.
function barracks(K) {
  let s = '';
  const x = 1270, y = 1690;
  castBox(x, y, 350, 110, 60, 0.45);
  s += K.container({ x: x + 6, y: y - 4, w: 150, h: 58, d: 56, color: 'teal', text: 'BUNKS' });
  s += K.container({ x: x + 16, y: y - 62, w: 104, h: 48, d: 50, color: 'red', doors: true });
  s += K.container({ x: x + 168, y, w: 152, h: 60, d: 58, color: 'grey', doors: true, text: 'MESS' });
  // lean-to on poles in front of the grey container
  s += K.post(x + 176, y - 76, y + 8, 8, STL) + K.post(x + 328, y - 76, y + 8, 8, STL);
  s += K.corrugated([[x + 162, y - 76], [x + 338, y - 76], [x + 352, y - 98], [x + 176, y - 98]], { tones: RST, angle: 0, pitch: 9 });
  s += K.neon(`M${f(x + 168)} ${f(y - 73)} H${f(x + 332)}`, CY, 3);
  // dish + antenna on the top container
  s += K.dish(x + 96, y - 122, 17, STL, -30);
  s += K.antenna(x + 40, y - 132, 40, RED);
  s += holoFlag(K, x + 136, y - 64, { pole: 64, w: 44, h: 28, dir: 1 });
  // drums, crates, a burn barrel
  s += K.drum(x - 8, y + 4, 12, 'rust') + K.drum(x + 12, y + 12, 12, 'blue');
  s += crate(K, x + 196, y + 24, 34, 24, 26, OLIVE, '');
  s += crate(K, x + 232, y + 20, 30, 22, 24, RST, '');
  s += K.drum(x + 352, y + 14, 13, 'rust');
  K.flame(x + 352, y - 18, 24, 0, P.fire);
  K.lightPool(x + 352, y + 16, 70, 26, P.fire, 0.4);
  return s;
}

// Front-right: scrap garage / workshop with a roll-up door; the armoured truck parked in front.
function garage(K) {
  let s = '';
  const x = 1984, y = 1664, w = 200, h = 88, d = 96;
  s += blk(K, {
    x, y, w, h, d, t: CONB, seams: 0, ties: false,
    front: (fx0, fy0, fx1, fy1) => {
      let r = K.corrugated([[fx0 + 2, fy0 + 2], [fx1 - 2, fy0 + 2], [fx1 - 2, fy1 - 2], [fx0 + 2, fy1 - 2]], { tones: RST, angle: 0, pitch: 10 });
      r += rect(fx0 + 74, fy1 - 70, 112, 70, '#2a262c', 3.5);
      r += rect(fx0 + 78, fy1 - 66, 104, 42, STL[1], 3);
      for (let k = 1; k < 6; k++) r += ln(fx0 + 80, fy1 - 66 + k * 7, fx0 + 180, fy1 - 66 + k * 7, STL[3], 2);
      K.glow(`<rect x="${f(fx0 + 80)}" y="${f(fy1 - 22)}" width="100" height="20" fill="${P.warm[1]}" opacity=".85"/><ellipse cx="${f(fx0 + 130)}" cy="${f(fy1 - 8)}" rx="70" ry="16" fill="${P.warm[2]}" opacity=".45" filter="url(#bloom)"/>`);
      r += K.sign(fx0 + 12, fy0 + 10, 54, 26, 'FIX', AMB, {});
      r += plate(K, fx0 + 12, fy1 - 52, 46, 40, STL, { stripe: true });
      return r;
    },
    top: (T) => K.corrugated(T, { tones: ['#b8b2a6', '#8d877c', '#625d55'], angle: 24, pitch: 10 }),
  });
  K.lightPool(x + 130, y + 10, 90, 26, AMB, 0.4);
  // tyre stack + drums
  s += K.tyre(x + 222, y + 6, 16) + K.tyre(x + 222, y - 4, 16) + K.tyre(x + 222, y - 14, 16);
  s += K.drum(x - 14, y + 8, 12, 'yellow');
  return s;
}

// Barricades where the timber fences stood (left and right of the HQ).
function barricadeL(K) {
  let s = '';
  s += holoFlag(K, 1212, 1404, { pole: 112, w: 54, h: 36, dir: 1 });
  s += jersey(K, 1170, 1430, 78, 32, CON, true);
  s += sandbags(K, 1246, 1336, 1424, 3);
  return s;
}
function barricadeR(K) {
  let s = '';
  s += holoFlag(K, 2318, 1396, { pole: 112, w: 54, h: 36, dir: -1 });
  s += sandbags(K, 2246, 2310, 1416, 3);
  s += jersey(K, 2300, 1420, 70, 32, CON, true);
  return s;
}

// Ground dressing over the inpainted plaza: dirt mottling (relative tones, so it
// stays matched to the base), pebbles, dry grass, cracks, tracks and stains.
const ERASE = [[1150, 1235], [1330, 1215], [1420, 1150], [1560, 1135], [1690, 1080], [1712, 990], [1850, 990], [1890, 1085], [1950, 1130], [2080, 1100], [2140, 1210],
  [2345, 1215], [2350, 1450], [2250, 1470], [2240, 1740], [1880, 1745], [1650, 1720], [1255, 1725], [1240, 1460], [1150, 1455]];
function dressing(K) {
  let s = '';
  // clipped to the old footprint, minus the road's corridor (the road stays clean packed sand: see roadOn)
  const cid = K.id('hqd'), cw = ROAD_HW + 6;
  K.def(`<clipPath id="${cid}"><path clip-rule="evenodd" d="${dpoly(ERASE)} M${ROAD_X - cw} 900 H${ROAD_X + cw} V${ROAD_Y1 + 40} H${ROAD_X - cw}Z"/></clipPath>`);
  const fid = K.id('hqdb');
  K.def(`<filter id="${fid}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>`);
  let mot = '';
  for (let k = 0; k < 340; k++) {
    const x = K.rand(1150, 2350), y = K.rand(1000, 1750);
    const dark = K.r() < 0.55;
    mot += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(K.rand(14, 56))}" ry="${f(K.rand(5, 16))}" fill="${dark ? '#6f4626' : '#f3c483'}" opacity="${f(dark ? K.rand(0.1, 0.24) : K.rand(0.1, 0.22))}"/>`;
  }
  s += `<g clip-path="url(#${cid})"><g filter="url(#${fid})">${mot}</g>`;
  // cracks and dry ruts
  for (let k = 0; k < 26; k++) {
    let x = K.rand(1160, 2340), y = K.rand(1240, 1740), d = `M${f(x)} ${f(y)}`;
    for (let j = 0; j < 4; j++) { x += K.rand(-26, 26); y += K.rand(-8, 8); d += ` L${f(x)} ${f(y)}`; }
    s += `<path d="${d}" stroke="#4a2f1a" stroke-width="1.8" fill="none" opacity=".45"/>`;
  }
  // pebbles
  for (let k = 0; k < 220; k++) {
    const x = K.rand(1150, 2350), y = K.rand(1060, 1750), r = K.rand(1.4, 4);
    s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r)}" ry="${f(r * 0.65)}" fill="${P.ink}" opacity=".55"/>`;
    if (r > 3) s += `<ellipse cx="${f(x - 0.6)}" cy="${f(y - 1)}" rx="${f(r * 0.6)}" ry="${f(r * 0.35)}" fill="#e9c08a" opacity=".6"/>`;
  }
  // dry grass tufts near the edges
  for (let k = 0; k < 70; k++) {
    const a = K.rand(0, Math.PI * 2), rr = K.rand(0.82, 1);
    const x = 1750 + Math.cos(a) * 560 * rr, y = 1440 + Math.sin(a) * 280 * rr;
    let t = '';
    for (let j = 0; j < 5; j++) t += `M${f(x + j * 2 - 4)} ${f(y)} q${f(K.rand(-3, 3))} -6 ${f(K.rand(-6, 6))} ${f(-K.rand(7, 13))}`;
    s += `<path d="${t}" stroke="#6c6a33" stroke-width="2" fill="none" opacity=".8"/>`;
  }
  s += '</g>';
  return s;
}
// Tyre tracks and oil stains that belong to the compound (scaled with it): the supply road south, into the garage,
// and churned dirt at the gate.
function yard(K) {
  let s = '';
  s += K.tracks('M1770 1642 C1772 1690 1782 1730 1792 1780', { w: 16, op: 0.25 });
  s += K.tracks('M1870 1626 C1930 1660 1990 1700 2060 1740', { w: 14, op: 0.2 });
  s += K.tracks('M1716 1100 C1722 1160 1730 1210 1736 1258', { w: 12, op: 0.18 });
  s += K.tracks('M1820 1100 C1814 1160 1808 1210 1806 1258', { w: 12, op: 0.18 });
  s += K.stain(1640, 1590, 24, '#1b1612', 0.4) + K.stain(1990, 1760, 26, '#1b1612', 0.35) + K.stain(1500, 1630, 20, '#1b1612', 0.3);
  return s;
}

// The road on through the plaza (Layout v2): from where it used to end, straight down to the new AEGIS gate. Its
// surface is the plaza's clean packed sand, the same colour as the painted road (dressing() leaves the corridor
// bare, so it stays the brightest surface and tools/trace_road.py follows it); here it gets darker churned shoulders
// (the tyre tracks and reflector posts come from roads.mjs, which runs on to the gate). Ground drawn in a layer takes
// the paint filter's grain, so the shoulders are kept translucent.
const ROAD_X = 1770, ROAD_Y0 = 960, ROAD_Y1 = hqPt([0, 1258])[1] - 6, ROAD_HW = 58;
function roadOn(K) {
  const fid = K.id('hqroad'), gid = K.id('hqroadfade'), mid = K.id('hqroadm');
  K.def(`<filter id="${fid}" x="-40%" y="-10%" width="180%" height="120%"><feGaussianBlur stdDeviation="5"/></filter>`);
  // fade in from the old road end, so there's no seam where it meets the painted road
  K.def(`<linearGradient id="${gid}" x1="0" y1="${ROAD_Y0}" x2="0" y2="${ROAD_Y0 + 110}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>`);
  K.def(`<mask id="${mid}" maskUnits="userSpaceOnUse" x="0" y="0" width="${MW}" height="${MH}"><rect x="0" y="${ROAD_Y0}" width="${MW}" height="${ROAD_Y1 - ROAD_Y0 + 40}" fill="url(#${gid})"/></mask>`);
  // a ragged band between x0 and x1 (offsets from the road's centre line)
  const band = (x0, x1, jag) => {
    const L = [], R = [];
    for (let y = ROAD_Y0; y <= ROAD_Y1 + 0.1; y += 20) { L.push([ROAD_X + x0 + K.rand(-jag, jag), y]); R.push([ROAD_X + x1 + K.rand(-jag, jag), y]); }
    return `M${[...L, ...R.reverse()].map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')}Z`;
  };
  let s = `<g mask="url(#${mid})">`;
  for (const side of [-1, 1]) {
    const o = (a, b) => (side < 0 ? [-b, -a] : [a, b]);
    s += `<path d="${band(...o(ROAD_HW - 2, ROAD_HW + 34), 7)}" fill="${SAND[1]}" opacity=".5" filter="url(#${fid})"/>`;
    s += `<path d="${band(...o(ROAD_HW + 1, ROAD_HW + 12), 3)}" fill="${SAND[3]}" opacity=".35" filter="url(#${fid})"/>`;
  }
  s += '</g>';
  // pebbles kicked onto the shoulders
  for (let k = 0; k < 44; k++) {
    const side = K.r() < 0.5 ? -1 : 1, x = ROAD_X + side * K.rand(ROAD_HW + 2, ROAD_HW + 26), y = K.rand(ROAD_Y0 + 80, ROAD_Y1), r = K.rand(1.4, 3.2);
    s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r)}" ry="${f(r * 0.65)}" fill="${P.ink}" opacity=".5"/>`;
  }
  return s;
}

// ------------------------------------------------------------ layer
export default {
  name: 'hq',
  z: 50,
  // the whole old complex (castle, flag, smoke, fences, banners, both huts),
  // boundary on plain sand so the inpaint fills with sand
  erase: [ERASE],
  build(K) {
    SHADOWS = [];
    let objects = '';
    objects += K.part('hq-fence-l', () => scrapFence(K, 1462, 1600, 1246));
    objects += K.part('hq-fence-r', () => scrapFence(K, 1940, 2078, 1246));
    objects += K.part('hq-gate', () => gate(K));
    objects += K.part('hq-mast', () => mast(K));
    objects += K.part('hq-watchtower', () => watchtower(K));
    objects += K.part('hq-barricade-l', () => barricadeL(K));
    objects += K.part('hq-barricade-r', () => barricadeR(K));
    objects += K.part('hq-main', () => mainBlock(K));
    objects += K.part('hq-power', () => powerBlock(K));
    objects += K.part('hq-ramp', () => ramp(K));
    objects += K.part('hq-crates', () => crate(K, 1548, 1572, 36, 26, 30, OLIVE, 'AMMO') + crate(K, 1588, 1578, 30, 22, 26, STL, '') + crate(K, 1554, 1546, 30, 22, 26, RST, ''));
    objects += K.part('hq-lamps', () => lamp(K, 1650, 1574, 92, 1) + lamp(K, 1890, 1574, 92, -1));
    objects += K.part('hq-poles', () => upole(K, 1236, 1596, 122) + upole(K, 2300, 1590, 122));
    objects += K.part('hq-barracks', () => barracks(K));
    objects += K.part('hq-garage', () => garage(K));
    objects += K.part('hq-truck', () => truck(K, 1990, 1736));
    objects += K.part('hq-cables', () => K.cable(1254, 1484, 1500, 1374, 34, 3.2) + K.cable(1218, 1484, 1290, 1628, 24, 3) + K.cable(2282, 1478, 2190, 1406, 26, 3.2) + K.cable(2318, 1478, 2200, 1590, 22, 3));

    // unify the inpainted sand (low contrast, matched to the base, full size), the road on through the plaza, then
    // the compound's own ground and shadows (scaled)
    let ground = dressing(K) + roadOn(K);
    let yardG = yard(K) + forecourt(K);
    const fid = K.id('hqsh');
    K.def(`<filter id="${fid}" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="5"/></filter>`);
    yardG += `<g filter="url(#${fid})" opacity=".5">${SHADOWS.map((sh) => poly(sh.p, SHADOW, 0)).join('')}</g>`;
    ground += `<g transform="${HQ_T}">${yardG}</g>`;

    // light
    K.lightPool(1770, 1560, 170, 50, CY, 0.3);
    K.haze(1770, 1330, 330, 150, CY, 0.06);
    K.lightPool(1770, 1268, 130, 30, CY, 0.25);
    K.lights = [`<g transform="${HQ_T}">${K.lights.join('')}</g>`];

    // At half size the ink keeps the map's weight: the outline is dilated in map px (its own filter, radius / S), and
    // the line work inside is thickened a little so it doesn't go hairline.
    K.def(`<filter id="outlineHQ" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="${3.2 / HQ_S}" result="d"/><feFlood flood-color="${P.ink}"/><feComposite in2="d" operator="in" result="o"/><feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
    objects = objects.replace(/filter="url\(#outline\)"/g, 'filter="url(#outlineHQ)"')
      .replace(/stroke-width="([\d.]+)"/g, (m, w) => `stroke-width="${f(Number(w) * INK_K)}"`);
    objects = `<g transform="${HQ_T}">${objects}</g>`;
    return { ground, objects, light: '' };
  },
};

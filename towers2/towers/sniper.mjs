// SNIPER: long range, single target, hits air (Kingdom Rush's archer /
// musketeer line). Signature: violet neon + a red laser sight.
//
// From the reference (ref/sniper.png), redrawn in our ink / cel / hatching style
// and in the reference's corner-forward isometric view:
//   - a tall timber-and-steel scaffold (four slightly tapering legs, X-braced
//     faces, steel gusset plates) standing on four stone-block piers
//   - at the foot: a corrugated awning over a doorway with a cyan neon squiggle,
//     a ladder up the front right, bundles of sticks, a poster, plate cables and
//     a hand-painted "NO CAMPING" board
//   - mid level: a hazard-striped girt on the right face, two floodlights and a
//     dish on the right leg, a dish on the left, a louvred locker on a little
//     balcony, the vertical violet "SNIPER" sign and a second cyan sign (katakana
//     "su-na-i-pa-a") on the front leg
//   - a camo-net canopy draped under the nest on three poles, blue / violet
//     cables hanging off it
//   - the nest: mesh floor, armoured back walls, corner posts, a hazard-striped
//     shield with a cyan crosshair holo, two dishes and two antennae
//   - head layer: a big scoped rifle on a tripod with a red laser-sight beam
import { T, CX, P, MP, f } from '../tkit.mjs';

const pts = (a) => a.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
const lerp = (a, b, t) => a + (b - a) * t;
const lerpP = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];
const poly = (p, fill, sw = 0, extra = '') => `<polygon points="${pts(p)}" fill="${fill}"${sw ? ` stroke="${P.ink}" stroke-width="${sw}" stroke-linejoin="round"` : ''}${extra}/>`;
const line = (p, col, w, extra = '') => `<polyline points="${pts(p)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const dOf = (p) => `M${pts(p).split(' ').join(' L')}Z`;

// Palettes (light -> dark)
const WOOD = ['#8f7a66', '#6e5d4f', '#51453b', '#3a3129', '#26201b'];   // weathered dark timber
const STONE = ['#a3abb4', '#818a95', '#626a75', '#454b54', '#2b2f35'];  // cool grey blocks
const G = T.gun, D = T.dark;
const CY = T.cyan, VI = T.violet, RD = T.red;
const RUBBER = '#2b2830';
const PAPER = ['#f0a060', '#d9733f', '#a24f25'];
const FLOOD = { c: '#d4faff', core: '#ffffff', deep: '#6aa8b8' };

// ------------------------------------------------------------ the iso frame
// Corner towards the viewer like the reference: u runs to the lower right, v to
// the lower left, z up. One unit of u or v is one pixel across the screen.
const B0 = 396;
const I = (u, v, z = 0) => [CX + u - v, B0 + (u + v) / 2 - z];
// A vertical face between two ground points (uv), from z0 to z1: [a0, b0, b1, a1].
const face = (a, b, z0, z1) => [I(a[0], a[1], z0), I(b[0], b[1], z0), I(b[0], b[1], z1), I(a[0], a[1], z1)];
// A horizontal square (iso diamond) at height z: back, right, front, left.
const diamond = (cu, cv, h, z) => [I(cu - h, cv - h, z), I(cu + h, cv - h, z), I(cu + h, cv + h, z), I(cu - h, cv + h, z)];

// The scaffold: stone piers to zP, legs to the nest floor at zN, mid deck at zM.
const zP = 74, zM = 172, zN = 272;
const s0 = 36, s1 = 28, sN = 32;
const S = (z) => lerp(s0, s1, (z - zP) / (zN - zP));
// A point on one face of the scaffold. t runs 0..1 along the face.
//   L: left leg -> front leg (lit), R: front leg -> right leg (shade),
//   BL: left leg -> back leg, BR: back leg -> right leg (the far faces).
function fp(side, t, z, off = 0) {
  const s = S(z);
  if (side === 'L') return [lerp(-s, s, t), s + off, z];
  if (side === 'R') return [s + off, lerp(s, -s, t), z];
  if (side === 'BL') return [-s - off, lerp(s, -s, t), z];
  return [lerp(-s, s, t), -s - off, z];
}

// ------------------------------------------------------------ the rifle frame
const M = [268, 81], ANG = 4, SC = 0.92;
const RAD = (ANG * Math.PI) / 180;
const W = (lx, ly) => [M[0] + SC * (lx * Math.cos(RAD) - ly * Math.sin(RAD)), M[1] + SC * (lx * Math.sin(RAD) + ly * Math.cos(RAD))];
const RIFLE_TR = `translate(${f(M[0])} ${f(M[1])}) rotate(${ANG}) scale(${SC})`;
const MUZZLE = W(127, 0).map((v) => +v.toFixed(1));

// ------------------------------------------------------------ helpers
// Square timber post between two centre points A, B ([u, v, z]), half-width w.
function post(K, A, B, w, tones = WOOD, { grain = true, hatch = false } = {}) {
  const L = [I(A[0] - w, A[1] + w, A[2]), I(A[0] + w, A[1] + w, A[2]), I(B[0] + w, B[1] + w, B[2]), I(B[0] - w, B[1] + w, B[2])];
  const R = [I(A[0] + w, A[1] + w, A[2]), I(A[0] + w, A[1] - w, A[2]), I(B[0] + w, B[1] - w, B[2]), I(B[0] + w, B[1] + w, B[2])];
  let s = poly(L, tones[1], 2.6) + poly(R, tones[3], 2.6);
  s += line([[L[0][0] + 1.6, L[0][1] - 4], [L[3][0] + 1.6, L[3][1] + 4]], tones[0], 1.8, ' opacity=".85"');
  if (grain) {
    const at = (Q, t, a) => lerpP(lerpP(Q[0], Q[1], t), lerpP(Q[3], Q[2], t), a);
    for (let k = 0; k < 2; k++) {
      const Q = k ? R : L;
      const t = K.rand(0.4, 0.75), a = K.rand(0.08, 0.45), b = Math.min(0.95, a + K.rand(0.15, 0.4));
      s += line([at(Q, t, a), at(Q, t, b)], P.ink, 1.3, ' opacity=".55"');
    }
  }
  if (hatch) s += K.hatch(dOf(R), { density: 0.6, len: [6, 12], w: 1.6 });
  return s;
}
// Plank / beam lying on a face between A and B (vertical thickness h).
function plank(K, A, B, h, tones = WOOD, lit = true, { bolts = true } = {}) {
  const p1 = I(...A), p2 = I(...B);
  const q = [[p1[0], p1[1] - h / 2], [p2[0], p2[1] - h / 2], [p2[0], p2[1] + h / 2], [p1[0], p1[1] + h / 2]];
  let s = poly(q, tones[lit ? 1 : 2], 2.6);
  s += line([[q[0][0] + 2, q[0][1] + 1.8], [q[1][0] - 2, q[1][1] + 1.8]], tones[lit ? 0 : 1], 1.7, ' opacity=".9"');
  s += line([[q[3][0] + 2, q[3][1] - 1.5], [q[2][0] - 2, q[2][1] - 1.5]], tones[lit ? 2 : 4], 1.8);
  if (bolts) s += K.rivets([lerpP(p1, p2, 0.07), lerpP(p1, p2, 0.93)], 1.6);
  return s;
}
// A hazard-striped steel girt on a face.
function hazardGirt(K, A, B, h) {
  const p1 = I(...A), p2 = I(...B);
  const q = [[p1[0], p1[1] - h / 2], [p2[0], p2[1] - h / 2], [p2[0], p2[1] + h / 2], [p1[0], p1[1] + h / 2]];
  let s = K.hazard(q, { w: 6 });
  s += line([[q[0][0] + 2, q[0][1] + 1.6], [q[1][0] - 2, q[1][1] + 1.6]], '#fff1b0', 1.4, ' opacity=".6"');
  s += K.rivets([lerpP(p1, p2, 0.06), lerpP(p1, p2, 0.5), lerpP(p1, p2, 0.94)], 1.7);
  return s;
}
// X-bracing on one face between two heights.
function xBrace(K, side, zA, zB, { tones = WOOD, h = 7, lit = side === 'L', off = 3.2 } = {}) {
  let s = '';
  s += plank(K, fp(side, 0.03, zA + 5, off), fp(side, 0.97, zB - 5, off), h, tones, lit, { bolts: false });
  s += plank(K, fp(side, 0.03, zB - 5, off), fp(side, 0.97, zA + 5, off), h, tones, lit, { bolts: false });
  const c = I(...fp(side, 0.5, (zA + zB) / 2, off));
  s += K.rivets([c], 2.1);
  return s;
}
// Horizontal girt along a face at height z.
const girt = (K, side, z, opts = {}) => plank(K, fp(side, -0.03, z, 3.4), fp(side, 1.03, z, 3.4), opts.h || 8, opts.tones || WOOD, side === 'L' || side === 'BR', opts);
// Steel gusset plate at a joint on the L (lit) or R face.
function gusset(K, side, t, z, sz = 7) {
  const c = fp(side, t, z, 3.6);
  const p = side === 'L' || side === 'BR'
    ? [I(c[0] - sz, c[1], z - sz), I(c[0] + sz, c[1], z - sz), I(c[0] + sz, c[1], z + sz), I(c[0] - sz, c[1], z + sz)]
    : [I(c[0], c[1] + sz, z - sz), I(c[0], c[1] - sz, z - sz), I(c[0], c[1] - sz, z + sz), I(c[0], c[1] + sz, z + sz)];
  return poly(p, side === 'L' ? G[2] : G[3], 2.2) + K.rivets([lerpP(p[0], p[2], 0.3), lerpP(p[0], p[2], 0.7)], 1.4);
}
// Stone-block pier: a square column of stacked blocks (cu, cv = centre, p = half size).
function pier(K, cu, cv, p, z0, z1, { rows = 3, dark = false } = {}) {
  const tl = dark ? [STONE[3], STONE[3], STONE[4]] : [STONE[1], STONE[1], STONE[0]];
  const tr = dark ? [STONE[4], STONE[4], STONE[4]] : [STONE[2], STONE[3], STONE[2]];
  const Lf = face([cu - p, cv + p], [cu + p, cv + p], z0, z1);
  const Rf = face([cu + p, cv + p], [cu + p, cv - p], z0, z1);
  let s = poly(Lf, STONE[4], 3.2) + poly(Rf, STONE[4], 3.2);
  const rh = (z1 - z0) / rows;
  for (let r = 0; r < rows; r++) {
    const za = z0 + r * rh + 1.3, zb = z0 + (r + 1) * rh - 1.3;
    const c1 = 0.5 + (r % 2 ? -0.24 : 0.2) + K.rand(-0.06, 0.06);
    const c2 = 0.5 + (r % 2 ? 0.22 : -0.2) + K.rand(-0.06, 0.06);
    for (const [t0, t1] of [[0, c1], [c1, 1]]) {
      const ua = cu - p + 2 * p * t0 + (t0 ? 1.3 : 0.6), ub = cu - p + 2 * p * t1 - (t1 < 1 ? 1.3 : 0.6);
      const q = face([ua, cv + p], [ub, cv + p], za, zb);
      s += poly(q, K.pick(tl), 2.2);
      if (!dark) s += line([[q[3][0] + 1.6, q[3][1] + 2.2], [q[2][0] - 1.6, q[2][1] + 2.2]], STONE[0], 1.6, ' opacity=".75"');
      if (K.r() < 0.3) { const m = lerpP(q[3], q[2], K.rand(0.3, 0.7)); s += `<path d="M${f(m[0])} ${f(m[1] + 2)} l${f(K.rand(-3, 3))} ${f(rh * 0.3)} l${f(K.rand(-3, 3))} ${f(rh * 0.25)}" stroke="${P.ink}" stroke-width="1.5" fill="none" opacity=".7"/>`; }
    }
    for (const [t0, t1] of [[0, c2], [c2, 1]]) {
      const va = cv + p - 2 * p * t0 - (t0 ? 1.3 : 0.6), vb = cv + p - 2 * p * t1 + (t1 < 1 ? 1.3 : 0.6);
      const q = face([cu + p, va], [cu + p, vb], za, zb);
      s += poly(q, K.pick(tr), 2.2);
    }
  }
  if (!dark) s += K.hatch(dOf(Rf), { density: 0.7, len: [6, 13], w: 1.7 });
  s += poly(diamond(cu, cv, p, z1), dark ? STONE[3] : STONE[0], 2.6);
  if (!dark) s += line([I(cu - p + 2, cv + p - 2, z1), I(cu + p - 2, cv + p - 2, z1)], '#c9d0d8', 1.5, ' opacity=".7"');
  return s;
}
// An iso box (u0..u1, v0..v1, z0..z1): returns the svg and its three faces.
function ibox(K, u0, v0, u1, v1, z0, z1, tones = G, { hatch = true, stroke = 2.8 } = {}) {
  const Lf = face([u0, v1], [u1, v1], z0, z1), Rf = face([u1, v1], [u1, v0], z0, z1);
  const Tf = [I(u0, v0, z1), I(u1, v0, z1), I(u1, v1, z1), I(u0, v1, z1)];
  let s = poly(Rf, tones[3], stroke) + poly(Lf, tones[1], stroke);
  if (hatch) s += K.hatch(dOf(Rf), { density: 0.55, len: [5, 10], w: 1.5 });
  s += poly(Tf, tones[0], stroke);
  return { s, L: Lf, R: Rf, T: Tf };
}
// Mesh texture in the iso plane, clipped to a polygon.
function isoMesh(K, p, { step = 7, col = '#8d96a6', w = 1.1, op = 0.55 } = {}) {
  const id = K.id('im'), h = step / 2;
  K.def(`<pattern id="${id}" width="${step}" height="${step}" patternUnits="userSpaceOnUse" patternTransform="matrix(1 0.5 -1 0.5 0 0)"><path d="M0 ${h} H${step} M${h} 0 V${step}" stroke="${col}" stroke-width="${w}" fill="none"/></pattern>`);
  return `<polygon points="${pts(p)}" fill="url(#${id})" opacity="${op}"/>`;
}
// Ladder between two rails: a1/a2 = rail feet, b1/b2 = rail tops ([u, v, z]).
function ladder(K, A1, A2, B1, B2, tones = WOOD) {
  const a1 = I(...A1), a2 = I(...A2), b1 = I(...B1), b2 = I(...B2);
  const n = Math.max(3, Math.round(Math.hypot(b1[0] - a1[0], b1[1] - a1[1]) / 13));
  let s = '';
  for (let i = 1; i < n; i++) {
    const t = i / n, p = lerpP(a1, b1, t), q = lerpP(a2, b2, t);
    s += line([p, q], P.ink, 6) + line([p, q], tones[1], 2.6);
  }
  for (const [p, q] of [[a1, b1], [a2, b2]]) s += line([p, q], P.ink, 7.5) + line([p, q], tones[0], 3.2) + line([[p[0] + 1.2, p[1]], [q[0] + 1.2, q[1]]], tones[2], 1.2, ' opacity=".8"');
  return s;
}
// Drooping, scalloped edge from a to b (the camo net's hem).
function hem(K, a, b, sag, n = 16, scallops = 3) {
  const o = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const sc = Math.abs(Math.sin(Math.PI * t * scallops));
    o.push([lerp(a[0], b[0], t) + K.rand(-1, 1), lerp(a[1], b[1], t) + sag * Math.sin(Math.PI * t) + sc * 6 + (i % 3 === 1 ? K.rand(0, 4) : 0)]);
  }
  return o;
}
// Camo net: dark mesh over olive / khaki blotches, darker on the shaded side.
function camoNet(K, p, lit) {
  const cid = K.id('cn');
  K.def(`<clipPath id="${cid}"><polygon points="${pts(p)}"/></clipPath>`);
  let s = poly(p, lit ? '#454c51' : '#2e3338', 3, ' fill-opacity=".86"');
  let bl = '';
  const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  for (let i = 0; i < 16; i++) {
    const x = K.rand(x0, x1), y = K.rand(y0, y1);
    const c = K.pick(lit ? ['#6f7350', '#7f7b56', '#4a5038', '#646b45'] : ['#4c5038', '#585640', '#33392c', '#475034']);
    bl += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(K.rand(7, 16))}" ry="${f(K.rand(4, 8))}" transform="rotate(${f(K.rand(-30, 30))} ${f(x)} ${f(y)})" fill="${c}" opacity=".8"/>`;
  }
  s += `<g clip-path="url(#${cid})">${bl}</g>`;
  s += K.net(p, { tone: 'none', op: 0 }).replace(/<polygon[^>]*fill="none"[^>]*\/>/, '');
  s += poly(p, 'none', 3);
  return s;
}
// Slim antenna mast with cross bars and a small LED at the tip.
function mast(K, x, yBot, h, col) {
  const d = `M${f(x)} ${f(yBot)} V${f(yBot - h)}`;
  let s = `<path d="${d}" stroke="${P.ink}" stroke-width="4.6" stroke-linecap="round"/><path d="${d}" stroke="${G[1]}" stroke-width="1.8" stroke-linecap="round"/>`;
  s += `<path d="M${f(x - 6)} ${f(yBot - h * 0.55)} H${f(x + 6)} M${f(x - 4)} ${f(yBot - h * 0.75)} H${f(x + 4)}" stroke="${P.ink}" stroke-width="2.4" stroke-linecap="round"/>`;
  K.glow(`<circle cx="${f(x)}" cy="${f(yBot - h - 1)}" r="6" fill="${col.c}" opacity=".6" filter="url(#bloom)"/><circle cx="${f(x)}" cy="${f(yBot - h - 1)}" r="2.2" fill="${col.core}"/><circle cx="${f(x)}" cy="${f(yBot - h - 1)}" r="3.2" fill="none" stroke="${col.c}" stroke-width="1.2"/>`);
  return s;
}
// A ragged tear in the net: a dark slit with frayed strands.
function tear(K, c, len = 18) {
  const [x, y] = c;
  const p = [[x - len / 2, y - 3], [x - len * 0.15, y - 1], [x + len / 2, y + 4], [x + len * 0.05, y + 5], [x - len * 0.3, y + 4]];
  let s = poly(p, '#15161a', 2);
  for (let i = 0; i < 4; i++) { const t = (i + 0.5) / 4; const q = [lerp(x - len / 2, x + len / 2, t), lerp(y + 1, y + 5, t)]; s += line([q, [q[0] + K.rand(-2, 2), q[1] + K.rand(5, 9)]], '#8d96a6', 1.2, ' opacity=".8"'); }
  return s;
}
// Round stick (pole) between two screen points with a knob at the end.
function stick(a, b, w = 4.5, tones = WOOD) {
  return line([a, b], P.ink, w + 4.5) + line([a, b], tones[1], w) + line([[a[0], a[1] - w * 0.25], [b[0], b[1] - w * 0.25]], tones[0], w * 0.35, ' opacity=".8"') +
    `<circle cx="${f(b[0])}" cy="${f(b[1])}" r="${f(w * 0.75)}" fill="${tones[2]}" stroke="${P.ink}" stroke-width="2.2"/>`;
}
// Dish facing right (the kit's dish faces left).
const dishR = (K, x, y, r, rot = -25) => `<g transform="translate(${f(2 * x)} 0) scale(-1 1)">${K.dish(x, y, r, [G[0], G[1], G[2], G[3]], rot)}</g>`;
// Sheaf of sharpened stakes tied with rope, standing on the ground at (x, y).
function sticks(K, x, y, h = 36, n = 6) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const k = i - (n - 1) / 2;
    const a = [x + k * 3.2, y + Math.abs(k) * 0.8], m = [x + k * 1.2, y - h * 0.45], b = [x + k * 3.4 + K.rand(-1, 1), y - h + Math.abs(k) * 2 + K.rand(-2, 2)];
    const d = `M${f(a[0])} ${f(a[1])} L${f(m[0])} ${f(m[1])} L${f(b[0])} ${f(b[1])}`;
    s += `<path d="${d}" fill="none" stroke="${P.ink}" stroke-width="5.6" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${d}" fill="none" stroke="${K.pick([WOOD[0], WOOD[1], '#9c8466'])}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += `<path d="M${f(b[0] - 1.4)} ${f(b[1] + 3)} L${f(b[0])} ${f(b[1] - 3)} L${f(b[0] + 1.4)} ${f(b[1] + 3)}" fill="#c9b08a" stroke="${P.ink}" stroke-width="1.4" stroke-linejoin="round"/>`;
  }
  const ry = y - h * 0.45;
  s += `<path d="M${f(x - 8)} ${f(ry - 1)} Q${f(x)} ${f(ry + 3)} ${f(x + 8)} ${f(ry - 1)}" stroke="${P.ink}" stroke-width="6" fill="none" stroke-linecap="round"/>` +
    `<path d="M${f(x - 8)} ${f(ry - 1)} Q${f(x)} ${f(ry + 3)} ${f(x + 8)} ${f(ry - 1)}" stroke="#c4a873" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  return s;
}
// Vertical cyan neon sign with katakana strokes (su-na-i-pa-a: "sniper").
function kanaSign(K, x, y, w, h, col) {
  let s = `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="4" fill="#1d1a24" stroke="${P.ink}" stroke-width="3.5"/>`;
  s += `<rect x="${f(x + 3)}" y="${f(y + 3)}" width="${f(w - 6)}" height="${f(h - 6)}" rx="2" fill="#262331"/>`;
  s += K.rivets([[x + 5, y + 5], [x + w - 5, y + 5], [x + 5, y + h - 5], [x + w - 5, y + h - 5]], 1.5);
  const glyphs = [
    [[[0.22, 0.2], [0.8, 0.2], [0.42, 0.66], [0.16, 0.88]], [[0.55, 0.58], [0.86, 0.88]]],
    [[[0.12, 0.38], [0.88, 0.38]], [[0.58, 0.1], [0.58, 0.58], [0.3, 0.9]]],
    [[[0.8, 0.1], [0.18, 0.56]], [[0.52, 0.36], [0.52, 0.92]]],
    [[[0.36, 0.28], [0.12, 0.86]], [[0.62, 0.28], [0.9, 0.86]], [[0.84, 0.06], [0.84, 0.07]]],
    [[[0.5, 0.14], [0.5, 0.86]]],
  ];
  const n = glyphs.length, gw = w - 10, gh = (h - 16) / n;
  let d = '';
  glyphs.forEach((g, i) => {
    const ox = x + 5, oy = y + 8 + i * gh;
    for (const st of g) d += 'M' + st.map(([u, v]) => `${f(ox + u * gw)} ${f(oy + v * gh * 0.9)}`).join(' L');
  });
  K.glow(`<rect x="${f(x + 2)}" y="${f(y + 2)}" width="${f(w - 4)}" height="${f(h - 4)}" rx="3" fill="none" stroke="${col.c}" stroke-width="2"/>` +
    `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${col.c}" opacity=".22" filter="url(#bloom)"/>` +
    `<path d="${d}" fill="none" stroke="${col.c}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".7" filter="url(#bloom)"/>` +
    `<path d="${d}" fill="none" stroke="${col.c}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${col.core}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>`);
  return s;
}
// A short steel bracket arm between two screen points.
const arm = (a, b, w = 3.5) => line([a, b], P.ink, w + 4) + line([a, b], G[2], w) + line([[a[0], a[1] - 1], [b[0], b[1] - 1]], G[0], 1.1, ' opacity=".7"');

// ------------------------------------------------------------ the rifle (head)
function rifle(K) {
  let b = '';
  // stock: skeleton stock with a cheek riser and a rubber butt pad
  b += poly([[-42, -6], [-16, -8], [-14, -6], [-14, 9], [-22, 10], [-30, 16], [-42, 16]], G[2], 3);
  b += poly([[-41, 8], [-22, 8], [-30, 15], [-41, 15]], G[3]);
  b += poly([[-31, 1], [-21, 1], [-24, 8], [-31, 8]], D[4], 2);
  b += poly([[-49, -7], [-42, -6], [-42, 16], [-49, 17]], RUBBER, 3);
  b += poly([[-36, -6], [-35, -12.5], [-20, -12.5], [-17, -8]], D[2], 2.6);
  b += line([[-41, -4.2], [-17, -6.2]], G[0], 1.8);
  b += K.hazard([[-41, 10.5], [-31, 10.5], [-34, 15], [-41, 15]], { w: 3 });
  // receiver
  b += poly([[-15, -9], [28, -9], [33, -5], [33, 7], [-15, 8]], G[2], 3);
  b += poly([[-14, -8], [28, -8], [31, -5], [-14, -5]], G[1]);
  b += poly([[-14, 3], [32, 3], [32, 6], [-14, 7]], G[3]);
  b += line([[-13, -7.6], [27, -7.6]], G[0], 1.4);
  b += `<rect x="2" y="-4" width="12" height="3.6" fill="${P.ink}"/>`;
  b += K.neon('M-10 0.5 H27', VI, 3.2);
  // grip, trigger guard, magazine
  b += poly([[-7, 7], [1, 7], [-3, 22], [-11, 21]], D[2], 3);
  b += `<path d="M1 8 Q3 15.5 10 8" fill="none" stroke="${P.ink}" stroke-width="2.6"/>`;
  b += poly([[8, 7], [18, 7], [21, 21], [11, 22]], D[1], 3) + line([[10.5, 10], [12, 19]], D[0], 1.4);
  // bolt handle
  b += line([[17, -1], [21, 7]], P.ink, 4.4) + `<circle cx="21.5" cy="8" r="3.2" fill="${G[1]}" stroke="${P.ink}" stroke-width="2.2"/>`;
  // handguard with vents
  b += poly([[31, -7], [80, -6], [82, -3], [82, 4], [80, 6], [31, 7]], G[2], 3);
  b += poly([[32, -6], [80, -5], [81, -3], [32, -3]], G[1]);
  b += poly([[32, 3], [81, 3], [80, 5], [32, 6]], G[3]);
  for (let i = 0; i < 5; i++) b += `<rect x="${37 + i * 8}" y="-1.6" width="5" height="3.2" rx="1" fill="${P.ink}"/>`;
  // barrel and muzzle brake
  b += poly([[80, -3.2], [109, -2.8], [109, 2.8], [80, 3.2]], G[1], 2.8) + line([[82, -1.3], [107, -1.1]], G[0], 1.3);
  b += poly([[108, -6.5], [124, -6.5], [127, -4], [127, 4], [124, 6.5], [108, 6.5]], D[1], 3);
  b += `<rect x="112" y="-4.6" width="3" height="9.2" fill="${P.ink}"/><rect x="118" y="-4.6" width="3" height="9.2" fill="${P.ink}"/>`;
  b += line([[109, -5], [123, -5]], D[0], 1.3);
  // laser module on top of the handguard
  b += poly([[57, -12.5], [72, -12.5], [73.5, -9.5], [72, -6.5], [57, -6]], D[2], 2.6);
  b += line([[58, -11.2], [70, -11.2]], D[0], 1.2);
  // scope: rings, tube, eyepiece, objective bell with a glowing lens, turret
  b += poly([[-4, -9], [-2, -14], [4, -14], [6, -9]], D[2], 2.4) + poly([[19, -9], [21, -14], [27, -14], [29, -9]], D[2], 2.4);
  b += poly([[-10, -20.5], [30, -20.5], [30, -12], [-10, -12]], D[1], 3);
  b += poly([[-19, -22.5], [-10, -20.5], [-10, -12], [-19, -10]], D[2], 3);
  b += poly([[-23, -21.5], [-19, -22.5], [-19, -10], [-23, -11]], RUBBER, 2.6);
  b += poly([[30, -20.5], [36, -24.5], [43, -24.5], [43, -8], [36, -8], [30, -12]], D[1], 3);
  b += line([[-9, -18.8], [29, -18.8]], D[0], 1.5) + line([[37, -22.6], [42, -22.6]], D[0], 1.4);
  b += `<rect x="6" y="-27" width="8" height="6.5" rx="1" fill="${D[2]}" stroke="${P.ink}" stroke-width="2.2"/>`;
  b += `<ellipse cx="43" cy="-16.2" rx="2.4" ry="7.2" fill="${RD.deep}" stroke="${P.ink}" stroke-width="2"/>`;
  // (the caller wraps all rifle glows in the rifle frame)
  K.glow(`<ellipse cx="43.5" cy="-16.2" rx="2" ry="6" fill="${RD.c}"/><ellipse cx="44" cy="-18.5" rx="0.9" ry="2.2" fill="${RD.core}"/>` +
    `<circle cx="45" cy="-16" r="8" fill="${RD.c}" opacity=".55" filter="url(#bloom)"/>` +
    `<circle cx="73.5" cy="-9.5" r="2.2" fill="${RD.core}"/><circle cx="73.5" cy="-9.5" r="6" fill="${RD.c}" opacity=".7" filter="url(#bloom)"/>`);
  return b;
}

// ------------------------------------------------------------------ the tower
const sniper = {
  id: 'sniper', family: 'sniper', tier: 'I', order: 1, name: 'Sniper',
  role: 'Long-range marksman: slow, heavy single-target shots that reach far and also hit flying enemies.',
  weapon: 'A scoped long rifle on a tripod in a timber crow\'s nest, aimed with a red laser sight.',
  muzzle: MUZZLE,
  build(K) {
    const shadow = K.shadow(CX + 6, 418, 118, 56, 175);

    const base = K.part('base', () => {
      let s = '';
      s += K.basePlate({ led: CY, accent: RD });

      // ---- back props on the plate (behind the piers)
      s += K.drum(136, 398, 11, 'rust');
      s += K.box({ x: 356, y: 402, w: 28, h: 20, d: 18, tones: [T.olive[0], T.olive[1], T.olive[2], T.olive[3]], stroke: 3 });
      s += K.text('AMMO', 370, 396, { size: 6.5, color: '#e9dfb8' });

      // ---- the dark inside of the tower (seen through the open frame)
      const sil = [I(-s0, s0, 0), I(s0, s0, 0), I(s0, -s0, 0), I(s0, -s0, zP), I(s1, -s1, zN), I(-s1, -s1, zN), I(-s1, s1, zN), I(-s0, s0, zP)];
      s += poly(sil, '#22252d', 3);
      s += isoMesh(K, sil, { step: 8, col: '#4f5a6b', op: 0.55 });
      // far piers and frame, in shadow
      s += pier(K, -s0, -s0, 11, 0, zP, { dark: true });
      s += post(K, [-s0, -s0, zP], [-s1, -s1, zN], 3.2, [WOOD[1], WOOD[2], WOOD[3], WOOD[4]], { grain: false });
      for (const side of ['BL', 'BR']) {
        const dk = [WOOD[2], WOOD[2], WOOD[3], WOOD[4], WOOD[4]];
        s += xBrace(K, side, zP, zM, { tones: dk, lit: true, off: -3 });
        s += xBrace(K, side, zM, zN - 10, { tones: dk, lit: true, off: -3 });
        s += plank(K, fp(side, 0, zM, -3), fp(side, 1, zM, -3), 7, dk, true, { bolts: false });
      }

      // ---- side piers
      s += pier(K, -s0, s0, 11, 0, zP);
      s += pier(K, s0, -s0, 11, 0, zP);

      // ---- mid deck (seen through the frame)
      const dS = S(zM) + 2;
      const deck = diamond(0, 0, dS, zM);
      s += poly(deck, WOOD[2], 2.6);
      for (let k = 1; k < 7; k++) { const v = -dS + (2 * dS * k) / 7; s += line([I(-dS, v, zM), I(dS, v, zM)], P.ink, 1.6, ' opacity=".6"'); }
      s += isoMesh(K, diamond(0, 0, dS * 0.55, zM), { step: 6, col: '#9aa3b0', op: 0.4 });

      // ---- left and right legs
      s += post(K, [-s0, s0, zP], [-s1, s1, zN], 3.2);
      s += post(K, [s0, -s0, zP], [s1, -s1, zN], 3.2, WOOD, { hatch: true });
      // steel shoes on the pier tops
      for (const [cu, cv] of [[-s0, s0], [s0, -s0]]) s += ibox(K, cu - 5, cv - 5, cu + 5, cv + 5, zP, zP + 7, G, { hatch: false, stroke: 2.4 }).s;

      // ---- the doorway under the awning (front-left, between the piers)
      const dr = face([-13, 30], [9, 30], 0, 48);
      s += poly(dr, D[3], 3);
      s += post(K, [-14, 31, 0], [-14, 31, 50], 2.4, WOOD, { grain: false }) + post(K, [10, 31, 0], [10, 31, 50], 2.4, WOOD, { grain: false });
      s += plank(K, [-16, 33, 50], [12, 33, 50], 6, WOOD, true, { bolts: false });
      {
        const a = I(-9, 30, 34), sq = (dy) => `M${f(a[0])} ${f(a[1] + dy)} q4 -5 8 -1 t8 1 t7 0`;
        s += K.neon(sq(0), CY, 2.2) + K.neon(sq(8), CY, 2.2);
        s += K.leds([I(4, 30, 14)], CY, 1.6);
      }

      // ---- corrugated awning on two posts
      const aw = [I(-23, 40, 72), I(23, 40, 72), I(23, 60, 55), I(-23, 60, 55)];
      s += post(K, [-21, 58, 0], [-21, 58, 56], 2.2, WOOD, { grain: false });
      s += post(K, [21, 58, 0], [21, 58, 56], 2.2, WOOD, { grain: false });
      s += K.corrugated(aw, { tones: [G[1], G[2], G[3]], angle: 40, pitch: 7 });
      s += poly([aw[3], aw[2], [aw[2][0], aw[2][1] + 4], [aw[3][0], aw[3][1] + 4]], G[3], 2.4);
      s += `<ellipse cx="${f(lerp(aw[1][0], aw[2][0], 0.55) - 8)}" cy="${f(lerp(aw[1][1], aw[2][1], 0.55) - 2)}" rx="10" ry="5" fill="${MP.rustmetal[1]}" opacity=".7" transform="rotate(28 ${f(lerp(aw[1][0], aw[2][0], 0.55) - 8)} ${f(lerp(aw[1][1], aw[2][1], 0.55) - 2)})"/>`;
      s += line([lerpP(aw[0], aw[1], 0.02), lerpP(aw[0], aw[1], 0.98)], G[0], 1.6, ' opacity=".7"');
      s += K.rivets([lerpP(aw[3], aw[2], 0.1), lerpP(aw[3], aw[2], 0.5), lerpP(aw[3], aw[2], 0.9)], 1.5);

      // ---- lower girts and X braces
      s += girt(K, 'L', zP + 4) + girt(K, 'R', zP + 4);
      s += xBrace(K, 'L', zP + 4, zM);
      s += xBrace(K, 'R', zP + 4, zM);

      // ---- the front pier (with a poster) and the front leg
      s += pier(K, s0, s0, 11, 0, zP);
      {
        const pp = face([27, 47.6], [44, 47.6], 20, 52);
        const torn = [pp[0], lerpP(pp[0], pp[1], 0.45), [lerpP(pp[0], pp[1], 0.6)[0], lerpP(pp[0], pp[1], 0.6)[1] - 4], pp[1], pp[2], pp[3]];
        s += poly(torn, PAPER[1], 2.2);
        s += poly([pp[3], pp[2], lerpP(pp[2], pp[1], 0.3), lerpP(pp[3], pp[0], 0.3)], PAPER[0]);
        for (const t of [0.42, 0.55, 0.68]) s += line([lerpP(lerpP(pp[3], pp[0], t), lerpP(pp[2], pp[1], t), 0.15), lerpP(lerpP(pp[3], pp[0], t), lerpP(pp[2], pp[1], t), 0.85)], PAPER[2], 1.6);
        const cc = lerpP(lerpP(pp[3], pp[0], 0.22), lerpP(pp[2], pp[1], 0.22), 0.5);
        s += `<circle cx="${f(cc[0])}" cy="${f(cc[1])}" r="3.4" fill="none" stroke="${PAPER[2]}" stroke-width="1.6"/>`;
        s += poly([lerpP(pp[3], pp[2], -0.1), lerpP(pp[3], pp[2], 0.35), [lerpP(pp[3], pp[2], 0.35)[0], lerpP(pp[3], pp[2], 0.35)[1] + 5], [lerpP(pp[3], pp[2], -0.1)[0], lerpP(pp[3], pp[2], -0.1)[1] + 5]], '#e2c14a', 1.6);
      }
      s += ibox(K, s0 - 5, s0 - 5, s0 + 5, s0 + 5, zP, zP + 7, G, { hatch: false, stroke: 2.4 }).s;
      s += post(K, [s0, s0, zP], [s1, s1, zN], 3.4);
      for (const z of [zP + 4, zM]) s += gusset(K, 'L', 0.97, z) + gusset(K, 'R', 0.03, z);
      s += gusset(K, 'L', 0.03, zP + 4) + gusset(K, 'R', 0.97, zP + 4);

      // ---- mid-level girts: plain on the left, hazard stripes on the right
      s += girt(K, 'L', zM);
      s += hazardGirt(K, fp('R', -0.03, zM, 3.6), fp('R', 1.03, zM, 3.6), 9);
      // upper braces and top girts
      s += xBrace(K, 'L', zM, zN - 12);
      s += xBrace(K, 'R', zM, zN - 12);
      s += girt(K, 'L', zN - 14) + girt(K, 'R', zN - 14);

      // ---- ladders up the front right
      s += ladder(K, [56, 18, 0], [56, 5, 0], [42, 18, zP + 30], [42, 5, zP + 30]);
      s += ladder(K, [S(zM) + 6, 0, zM - 6], [S(zM) + 6, -13, zM - 6], [S(zN - 14) + 5, 0, zN - 18], [S(zN - 14) + 5, -13, zN - 18]);

      // ---- balcony with a louvred locker (left face, mid level)
      {
        const bz = zM - 2;
        const sl = ibox(K, -24, S(bz) - 2, 6, S(bz) + 15, bz - 5, bz, WOOD, { hatch: false, stroke: 2.4 });
        s += sl.s;
        s += plank(K, [-18, S(bz) + 12, bz - 6], [-S(bz - 42) + 3, S(bz - 42) + 4, bz - 42], 5, WOOD, true, { bolts: false });
        const lk = ibox(K, -21, S(bz) + 1, 3, S(bz) + 13, bz, bz + 38, [G[1], G[2], G[3], G[4]], { stroke: 2.6 });
        s += lk.s;
        for (let i = 1; i < 7; i++) {
          const t = i / 7;
          s += line([lerpP(lk.L[0], lk.L[1], t), lerpP(lk.L[3], lk.L[2], t)].map(([x, y], k) => [x, y + (k ? 3 : -3)]), P.ink, 2.4, ' opacity=".85"');
          s += line([lerpP(lk.L[0], lk.L[1], t - 0.04), lerpP(lk.L[3], lk.L[2], t - 0.04)].map(([x, y], k) => [x, y + (k ? 3 : -3)]), G[0], 1.2, ' opacity=".6"');
        }
        s += K.leds([lerpP(lk.R[3], lk.R[1], 0.3)], VI, 1.6);
      }

      // ---- the camo-net canopy under the nest, on three poles
      const zi = zN - 9, zt = zN - 42;
      const inL = I(-sN, sN, zi), inF = I(sN, sN, zi), inR = I(sN, -sN, zi);
      const tipL = I(-51, 51, zt), tipF = I(51, 51, zt), tipR = I(51, -51, zt);
      const netL = [inL, inF, ...hem(K, tipF, tipL, 17)], netR = [inF, inR, ...hem(K, tipR, tipF, 21)];
      s += camoNet(K, netL, true) + camoNet(K, netR, false);
      s += tear(K, lerpP(lerpP(inF, inR, 0.62), lerpP(tipF, tipR, 0.62), 0.62), 20);
      s += line([inF, tipF], P.ink, 2.4, ' opacity=".8"');
      const sz = S(zN - 22);
      s += stick(I(-sz, sz, zN - 22), I(-57, 57, zt - 6), 4.2);
      s += stick(I(sz, -sz, zN - 22), I(57, -57, zt - 6), 4.2);
      s += stick(I(sz + 2, sz + 2, zN - 22), I(56, 56, zt - 6), 4.2);
      for (const p of [tipL, tipR]) s += `<circle cx="${f(p[0])}" cy="${f(p[1] + 1)}" r="4.5" fill="#b39a6a" stroke="${P.ink}" stroke-width="2.2"/>`;

      // ---- hanging cables (under the signs)
      s += K.cables(tipL[0] - 2, tipL[1] + 4, 150, 290, 10, ['#3b6fd8', '#8a4fd8']);
      { const rd0 = I(S(186), -S(186), 186); s += K.cables(tipR[0] + 2, tipR[1] + 4, rd0[0] + 24, rd0[1] - 2, 10, ['#8a4fd8', '#3b6fd8', RUBBER]); }

      // ---- the SNIPER sign (left) and the cyan katakana sign (front leg)
      {
        const lx = I(-S(206), S(206), 206)[0], lx2 = I(-S(150), S(150), 150)[0];
        const sx = lx - 44;
        const sy = tipL[1] + 24;
        s += arm([sx + 22, sy + 16], [lx - 3, sy + 14]) + arm([sx + 22, sy + 76], [lx2 - 3, sy + 70]);
        s += K.vsign(sx, sy, 24, 94, 'SNIPER', VI);
        const fy = (z) => I(S(z), S(z), z)[1];
        s += arm([256, fy(188) + 2], [262, fy(188) + 2], 3) + arm([256, fy(112)], [262, fy(112)], 3);
        s += kanaSign(K, 245, fy(196), 24, 102, CY);
        // power feeds draped across the front: locker -> sign, sign -> floodlights
        const ky = fy(196);
        s += K.cables(222, ky - 26, 247, ky + 8, 12, ['#8a4fd8', '#3b6fd8']);
        const fl = I(S(150), -S(150), 150);
        s += K.cables(268, ky + 30, fl[0] - 6, fl[1] - 4, 18, ['#3b6fd8', RUBBER]);
      }

      // ---- floodlights and dishes on the legs
      {
        const r1 = I(S(150), -S(150), 150), r2 = I(S(124), -S(124), 124);
        s += arm([r1[0] + 4, r1[1]], [r1[0] + 20, r1[1] - 4]) + arm([r2[0] + 4, r2[1]], [r2[0] + 20, r2[1] - 2]);
        s += K.floodlight(r1[0] + 24, r1[1] - 5, 14, FLOOD, 8.5);
        s += K.floodlight(r2[0] + 24, r2[1] - 3, 22, FLOOD, 8.5);
        const rd = I(S(186), -S(186), 186);
        s += arm([rd[0] + 4, rd[1]], [rd[0] + 26, rd[1] - 6], 3.4);
        s += dishR(K, rd[0] + 32, rd[1] - 10, 17, -20);
        const ld = I(-S(86), S(86), 86);
        s += arm([ld[0] - 4, ld[1]], [ld[0] - 26, ld[1] - 4], 3.4);
        s += K.dish(ld[0] - 32, ld[1] - 8, 16, [G[0], G[1], G[2], G[3]], -28);
      }

      // ---- the nest: floor slab, walls, posts, shield, dishes, antennae
      {
        const fl = diamond(0, 0, sN, zN);
        s += poly(face([-sN, sN], [sN, sN], zN - 9, zN), WOOD[1], 3);
        s += poly(face([sN, sN], [sN, -sN], zN - 9, zN), WOOD[3], 3);
        s += line([I(-sN + 1, sN, zN - 2), I(sN - 1, sN, zN - 2)], WOOD[0], 1.6, ' opacity=".8"');
        s += K.rivets([I(-sN + 4, sN, zN - 4.5), I(-12, sN, zN - 4.5), I(12, sN, zN - 4.5), I(sN, sN - 4, zN - 4.5), I(sN, 0, zN - 4.5), I(sN, -sN + 4, zN - 4.5)], 1.6);
        s += poly(fl, G[2], 3);
        s += isoMesh(K, diamond(0, 0, sN - 4, zN), { step: 6, col: '#c3d0de', op: 0.55, w: 1.2 });
        s += poly(diamond(0, 0, sN - 4, zN), 'none', 1.8, ' opacity=".7"');
        s += line([I(-sN + 2, sN - 1, zN), I(sN - 1, sN - 1, zN), I(sN - 1, -sN + 2, zN)], T.rim, 1.6, ' opacity=".5"');
        // back walls: armour plates on the far edges
        const wh = 15, sw = sN - 3;
        const bl = face([-sw, -sw], [-sw, sw], zN, zN + wh);
        s += K.armour([bl[3], bl[2], bl[1], bl[0]], D, { stroke: 3 });
        const br = face([-sw, -sw], [sw, -sw], zN, zN + wh);
        s += K.armour([br[3], br[2], br[1], br[0]], G, { stroke: 3 });
        s += line([bl[3], bl[2]], T.rim, 1.6, ' opacity=".55"') + line([br[3], br[2]], T.rim, 1.6, ' opacity=".55"');
        // ammo can and a coffee mug on the floor
        s += ibox(K, 12, 12, 24, 20, zN, zN + 9, [T.olive[0], T.olive[1], T.olive[2], T.olive[3]], { hatch: false, stroke: 2.4 }).s;
        s += line([I(12, 16, zN + 9), I(24, 16, zN + 9)], T.olive[3], 1.6);
        // corner posts (back first)
        const ph = 22;
        s += post(K, [-sw, -sw, zN], [-sw, -sw, zN + ph + 6], 2.6, WOOD, { grain: false });
        s += post(K, [-sw, sw, zN], [-sw, sw, zN + ph], 2.6, WOOD, { grain: false });
        s += post(K, [sw, -sw, zN], [sw, -sw, zN + ph], 2.6, WOOD, { grain: false });
        // antennae and dishes on the back walls
        const bk = I(-sw, -sw, zN);
        s += mast(K, bk[0] - 5, bk[1] - 6, 62, VI) + mast(K, bk[0] + 7, bk[1] - 2, 52, RD);
        const dl = I(-sw, -2, zN + wh);
        s += arm(dl, [dl[0] - 10, dl[1] - 26], 3.6);
        s += K.dish(dl[0] - 18, dl[1] - 36, 23, [G[0], G[1], G[2], G[3]], -30);
        const dr2 = I(-4, -sw, zN + wh);
        s += arm(dr2, [dr2[0] + 10, dr2[1] - 30], 3.2);
        s += dishR(K, dr2[0] + 16, dr2[1] - 38, 14, -22);
        // the shield on the left-front edge: hazard stripes, a crosshair holo
        const sh = face([-30, sN + 1], [-5, sN + 1], zN - 4, zN + 38);
        s += poly(face([-5, sN + 1], [-5, sN - 3], zN - 4, zN + 38), D[3], 2.6);
        s += poly([sh[3], sh[2], I(-5, sN - 3, zN + 38), I(-30, sN - 3, zN + 38)], G[1], 2.6);
        s += K.hazard([sh[0], sh[1], sh[2], sh[3]], { w: 6 });
        const inset = face([-26, sN + 1.4], [-9, sN + 1.4], zN + 4, zN + 30);
        s += poly(inset, '#1d1a24', 2.6);
        s += K.rivets([inset[0], inset[1], inset[2], inset[3]].map((p, i) => [p[0] + (i === 0 || i === 3 ? 2.5 : -2.5), p[1] + (i < 2 ? -2.5 : 2.5)]), 1.4);
        const hc = I(-17.5, sN + 1.5, zN + 17);
        const hx = `matrix(1 0.5 0 1 ${f(hc[0])} ${f(hc[1])})`;
        const ch = `<circle r="7.5" fill="none" stroke="${CY.c}" stroke-width="2"/><circle r="2" fill="${CY.core}"/><path d="M-11 0 H-4 M4 0 H11 M0 -11 V-4 M0 4 V11" stroke="${CY.core}" stroke-width="1.8" stroke-linecap="round"/>`;
        K.glow(`<g transform="${hx}"><rect x="-10" y="-12" width="20" height="24" fill="${CY.deep}" opacity=".6"/><circle r="12" fill="${CY.c}" opacity=".45" filter="url(#bloom)"/>${ch}</g>`);
        s += line([sh[3], sh[2]], '#fff1b0', 1.4, ' opacity=".6"');
        // front posts last
        s += post(K, [sw, sw, zN], [sw, sw, zN + ph], 2.6, WOOD, { grain: false });
      }

      // ---- props on the plate, in front
      s += sticks(K, 150, 430, 40, 6);
      s += sticks(K, 222, 460, 36, 5);
      // plate cables: orange and blue, looping out of the front pier
      s += K.pipe(`M${I(48, 40, 0)[0]} ${I(48, 40, 0)[1] - 2} C320 452 352 470 330 474 S290 466 300 452`, 3.6, '#c45a2a', '#f08a52');
      s += K.pipe(`M${I(46, 44, 0)[0] - 2} ${I(46, 44, 0)[1]} C300 470 360 478 372 452`, 3.2, '#2f5fb8', '#6e9cff');
      // hand-painted warning board on a stake
      {
        const bx = 316, by = 414;
        s += line([[bx + 4, by + 22], [bx + 6, by + 44]], P.ink, 6) + line([[bx + 4, by + 22], [bx + 6, by + 44]], WOOD[1], 2.6);
        s += line([[bx + 40, by + 18], [bx + 42, by + 38]], P.ink, 6) + line([[bx + 40, by + 18], [bx + 42, by + 38]], WOOD[1], 2.6);
        s += `<g transform="rotate(-6 ${bx + 23} ${by + 12})"><rect x="${bx}" y="${by}" width="46" height="24" rx="2" fill="#d8c9a3" stroke="${P.ink}" stroke-width="3"/>` +
          `<rect x="${bx + 2}" y="${by + 2}" width="42" height="5" fill="#efe2bd" opacity=".8"/></g>`;
        s += K.text('NO', bx + 23, by + 11, { size: 7.5, color: '#c8402d', rot: -6, font: 'Bungee' }).replace(/stroke-width="[^"]*"/, 'stroke-width="0"');
        s += K.text('CAMPING', bx + 23, by + 20, { size: 7, color: '#c8402d', rot: -6, font: 'Bungee' }).replace(/stroke-width="[^"]*"/, 'stroke-width="0"');
      }
      // spent brass on the plate
      for (const [x, y, a] of [[292, 472, -20], [304, 478, 30], [278, 480, 70]]) s += `<g transform="rotate(${a} ${x} ${y})"><rect x="${x - 5}" y="${y - 2}" width="10" height="4" rx="1.5" fill="${T.brass[1]}" stroke="${P.ink}" stroke-width="1.6"/></g>`;
      return s;
    });

    // ---------------- head: the rifle on its tripod, with the laser sight
    const piv = [M[0], 110];
    const head = K.part('head', () => {
      let s = '';
      const hub = [M[0], 96];
      const feet = [[M[0] + 8, 101], [M[0] - 24, 121], [M[0] + 24, 120]];
      const leg = (p) => K.pipe(`M${f(hub[0])} ${f(hub[1])} L${f(p[0])} ${f(p[1])}`, 3.6, G[2], G[0]);
      s += leg(feet[0]);
      s += `<ellipse cx="${f(feet[0][0])}" cy="${f(feet[0][1] + 1)}" rx="4" ry="2" fill="${D[2]}" stroke="${P.ink}" stroke-width="2"/>`;
      s += K.cyl({ cx: hub[0], y: hub[1] + 2, rx: 4.5, ry: 2.2, h: hub[1] - M[1] - 6, tones: [G[1], G[2], G[3], G[4]], top: 'none', stroke: 2.4, hatch: false });
      s += K.cyl({ cx: hub[0], y: hub[1] + 3, rx: 7, ry: 3.5, h: 6, tones: [G[0], G[1], G[2], G[3]], top: 'flat', stroke: 2.4, hatch: false });
      s += K.cyl({ cx: M[0], y: M[1] + 15, rx: 8, ry: 4, h: 7, tones: [G[0], G[1], G[2], G[3]], top: 'flat', stroke: 2.4, hatch: false });
      for (const p of feet.slice(1)) s += leg(p) + `<ellipse cx="${f(p[0])}" cy="${f(p[1] + 1)}" rx="4.5" ry="2.2" fill="${D[2]}" stroke="${P.ink}" stroke-width="2"/>`;
      // the rifle (its neon strip pushes glow in the rifle frame)
      K.glow(`<g transform="${RIFLE_TR}">`);
      const body = rifle(K);
      K.glow('</g>');
      s += `<g transform="${RIFLE_TR}">${body}</g>`;
      // the laser-sight beam, parallel to the barrel, to the edge of the sprite
      const e = W(73.5, -9.5), dx = Math.cos(RAD), dy = Math.sin(RAD);
      const L = (506 - e[0]) / dx, e2 = [e[0] + dx * L, e[1] + dy * L];
      const gid = K.id('lz');
      K.def(`<linearGradient id="${gid}" x1="${f(e[0])}" y1="${f(e[1])}" x2="${f(e2[0])}" y2="${f(e2[1])}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${RD.c}" stop-opacity="1"/><stop offset=".7" stop-color="${RD.c}" stop-opacity=".75"/><stop offset="1" stop-color="${RD.c}" stop-opacity="0"/></linearGradient>`);
      const bd = `M${f(e[0])} ${f(e[1])} L${f(e2[0])} ${f(e2[1])}`;
      K.glow(`<path d="${bd}" stroke="url(#${gid})" stroke-width="7" opacity=".5" filter="url(#bloom)"/><path d="${bd}" stroke="url(#${gid})" stroke-width="2.2"/><path d="${bd}" stroke="${RD.core}" stroke-width=".8" opacity=".8"/>`);
      return s;
    }, piv);

    return K.doc(base + head, { title: 'Sniper', shadow });
  },
};

export default [sniper];

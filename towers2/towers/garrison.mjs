// GARRISON: sends a squad of scrap troopers (and a drone) out to block the road
// (Kingdom Rush's barracks). Signature: red / blue police lights + violet skull
// banner.
//
// From the reference (ref/garrison.png), redrawn in our ink / cel / hatching style
// and in the same corner-forward isometric view as the SNIPER:
//   - a boxy bunker-tower: a square core column patched together from riveted
//     carbon plates, corrugated sheets (grey and rusty) and timber, a timber ring
//     beam with lapped ends, a wider collar of sheets, and a wide crown on top
//     with a parapet of sheets of uneven height; spikes everywhere
//   - at the foot: a spiked gatehouse on the front left with a jail-bar gate (the
//     troops' way out: a violet glow inside, a padlock, violet paint on the plate
//     before it), a plank shack with a patched corrugated roof (a tyre holds it
//     down) on the front right, a concrete corner foot, a chimney pipe with a
//     spike cap, a leaning plank, olive drums and tools on the plate
//   - mid level: two warm floodlights, a hand-painted board ("TRESPASSERS WILL BE
//     RECRUITED!"), a red squad placard, cables, a little drone hovering on the
//     left with cyan rotors
//   - head layer: the armoured top cabin (chamfered roof, a visor slot under a
//     brim, a blue neon winged emblem), a red / blue police light bar, an
//     antenna, a megaphone on a post with a light beam, and the violet skull
//     banner on a pole at the back right
//
// Layering: <g id="base"> holds b-body (plate, tower, crown, deck, parapet walls,
// the cabin's riser) and b-props (the props in front, so they get their own ink
// outline). The head is the cabin and its kit. The cabin stands on a riser whose
// top (CAB.z0) clears the near parapet walls on screen, so the base and head
// layers composite correctly in either draw order and no 'front' part is needed.
import { T, CX, GY, P, f } from '../tkit.mjs';

const pts = (a) => a.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
const lerp = (a, b, t) => a + (b - a) * t;
const lerpP = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];
const poly = (p, fill, sw = 0, extra = '') => `<polygon points="${pts(p)}" fill="${fill}"${sw ? ` stroke="${P.ink}" stroke-width="${sw}" stroke-linejoin="round"` : ''}${extra}/>`;
const line = (p, col, w, extra = '') => `<polyline points="${pts(p)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const dOf = (p) => `M${pts(p).split(' ').join(' L')}Z`;
const add = (p, d) => [p[0] + d[0], p[1] + d[1]];
const M = (p) => `${f(p[0])} ${f(p[1])}`;

// Palettes (light -> dark)
const G = T.gun, D = T.dark;
const CY = T.cyan, VI = T.violet, RD = T.red, BL = T.blue;
const WOOD = ['#8f7a66', '#6e5d4f', '#51453b', '#3a3129', '#26201b'];   // weathered dark timber
const STONE = ['#a3abb4', '#818a95', '#626a75', '#454b54', '#2b2f35'];  // cool grey concrete
const STEEL = [G[0], G[1], G[2], G[3], G[4]];
const CORR = { L: ['#8e98aa', '#6a7385', '#4a5260'], R: ['#525a69', '#3c424e', '#292d36'] };
const RUST = { L: ['#a8735a', '#82523b', '#5c3727'], R: ['#70493a', '#56372b', '#3b251c'] };
const PLATE = {
  L: [[G[0], G[1], G[2]], [D[0], D[0], D[1]], ['#8a93a3', '#626a7a', '#4c5361']],
  R: [[G[2], G[3], G[4]], [D[1], D[2], D[3]], ['#4a505c', '#454a55', '#30333a']],
};
const FLOOD = { c: '#ffe27a', core: '#fffbe2', deep: '#a8892a' };
const BEAM = { c: '#e4f2ff', core: '#ffffff', deep: '#7fa0c0' };
const CLOTH = ['#b48aff', '#8a52e6', '#6233b8', '#3d1c7e'];
const BONE = '#ece0ff';
const PAPER = ['#efe2bd', '#d8c9a3', '#b3a07a'];
const PAINT = '#c8402d';

// ------------------------------------------------------------ the iso frame
// Corner towards the viewer (like the SNIPER): u runs to the lower right, v to
// the lower left, z up; one unit of u or v is one pixel across the screen.
const B0 = 398;
const I = (u, v, z = 0) => [CX + u - v, B0 + (u + v) / 2 - z];
const diamond = (cu, cv, h, z) => [I(cu - h, cv - h, z), I(cu + h, cv - h, z), I(cu + h, cv + h, z), I(cu - h, cv + h, z)];
// A point on a front face of a square block (half size h, centre c):
//   'L' (lit): v = h + off, t 0 = left corner -> 1 = front corner
//   'R' (shade): u = h + off, t 0 = front corner -> 1 = right corner
function FP(side, h, t, z, off = 0, c = [0, 0]) {
  return side === 'L' ? I(c[0] + lerp(-h, h, t), c[1] + h + off, z) : I(c[0] + h + off, c[1] + lerp(h, -h, t), z);
}
// Quad on a face: [top-left, top-right, bottom-right, bottom-left].
const quad = (side, h, t0, t1, z0, z1, off = 0, c) => [FP(side, h, t0, z1, off, c), FP(side, h, t1, z1, off, c), FP(side, h, t1, z0, off, c), FP(side, h, t0, z0, off, c)];
// SVG transform that lays a local 2D drawing flat on an L or R face at p.
const skew = (side, p) => `matrix(1 ${side === 'L' ? 0.5 : -0.5} 0 1 ${f(p[0])} ${f(p[1])})`;

// The tower: core column, collar, crown (deck at DZ), cabin, gatehouse, shack.
const SC = 34;
const COL = { z0: 116, z1: 164, h: 41 };
const CRN = { z0: 204, z1: 232, h: 45 };
const DZ = 232;
const CAB = { cu: -4, cv: -4, h: 26, z0: 246, z1: 302, zt: 310, ins: 7 }; // z0 clears the parapet tops
const GH = { u0: -38, u1: 22, v0: 34, v1: 66, z: 88 };
const SH = { u0: 34, u1: 66, v0: -32, v1: 22, zw: 58, zr: 82, ue: 74 };
const roofZ = (u) => SH.zr - (u - SH.u0) * 0.75;

// ------------------------------------------------------------ helpers
const spk = (K, p, ang, len = 20, w = 9) => K.spike(p[0], p[1], len, ang, w);

// One sheet of cladding on a face quad: a riveted carbon plate, a corrugated
// sheet (grey or rust) or timber boards. lit = on an L (lit) face.
function sheet(K, q, type, lit, { tone = 0, rv = true, sw = 2.8 } = {}) {
  const side = lit ? 'L' : 'R';
  let s = '';
  if (type === 'plate') {
    s += K.armour(q, PLATE[side][tone % 3], { rivets: rv, edge: lit, stroke: sw });
    if (!lit) s += line([add(q[0], [1.5, 2.2]), add(q[1], [-1.5, 2.2])], T.rim, 1.4, ' opacity=".25"');
  } else if (type === 'corr' || type === 'rust') {
    s += K.corrugated(q, { tones: (type === 'rust' ? RUST : CORR)[side], angle: 0, pitch: 6 });
    s += line([add(q[0], [1.5, 2.2]), add(q[1], [-1.5, 2.2])], T.rim, 1.6, ` opacity="${lit ? 0.5 : 0.22}"`);
    if (rv) {
      const n = Math.max(2, Math.round(Math.abs(q[1][0] - q[0][0]) / 10));
      for (const k of [0.1, 0.9]) {
        const a = lerpP(q[0], q[3], k), b = lerpP(q[1], q[2], k);
        const p0 = lerpP(a, b, 0.12), p1 = lerpP(a, b, 0.88);
        s += K.rivetLine(p0[0], p0[1], p1[0], p1[1], n, 1.6);
      }
    }
  } else if (type === 'boards') {
    const tones = lit ? [WOOD[1], WOOD[0], WOOD[1], WOOD[2]] : [WOOD[2], WOOD[3], WOOD[2], WOOD[3]];
    s += poly(q, tones[0], sw);
    const n = Math.max(2, Math.round(Math.hypot(q[0][1] - q[3][1], q[0][0] - q[3][0]) / 8));
    for (let i = 0; i < n; i++) {
      const a = lerpP(q[0], q[3], i / n), b = lerpP(q[1], q[2], i / n), c = lerpP(q[1], q[2], (i + 1) / n), d = lerpP(q[0], q[3], (i + 1) / n);
      s += poly([a, b, c, d], K.pick(tones), 1.8);
      s += line([add(a, [2, 1.6]), add(b, [-2, 1.6])], lit ? WOOD[0] : WOOD[1], 1.2, ' opacity=".7"');
    }
    s += poly(q, 'none', sw);
  }
  return s;
}
// Rows of sheets on one face of a block: layout = [[z0, z1, [[t0, t1, type, tone], ...]], ...].
function rows(K, side, h, layout, { off = 0.6, c, hatch = side === 'R' } = {}) {
  const lit = side === 'L';
  let s = '';
  for (const [z0, z1, cells] of layout) {
    cells.forEach(([t0, t1, type, tone = 0], i) => {
      s += sheet(K, quad(side, h, t0 - 0.01, t1 + 0.01, z0, z1, off + (i % 2 ? 0.9 : 0), c), type, lit, { tone });
    });
  }
  if (hatch) {
    const zA = layout[0][0], zB = layout[layout.length - 1][1];
    s += K.hatch(dOf(quad(side, h, 0, 1, zA, zB, off, c)), { density: 0.5, len: [6, 12], w: 1.6, op: 0.5 });
  }
  return s;
}
// Silhouette of the two front faces of a block (dark backing, ink outline).
const front2 = (h, z0, z1, c = [0, 0]) => [I(c[0] - h, c[1] + h, z1), I(c[0] + h, c[1] + h, z1), I(c[0] + h, c[1] - h, z1), I(c[0] + h, c[1] - h, z0), I(c[0] + h, c[1] + h, z0), I(c[0] - h, c[1] + h, z0)];
// An iso box (u0..u1, v0..v1, z0..z1): R side, L side and top.
function ibox(K, u0, v0, u1, v1, z0, z1, tones = STEEL, { hatch = true, stroke = 2.8 } = {}) {
  const Lf = [I(u0, v1, z0), I(u1, v1, z0), I(u1, v1, z1), I(u0, v1, z1)];
  const Rf = [I(u1, v1, z0), I(u1, v0, z0), I(u1, v0, z1), I(u1, v1, z1)];
  const Tf = [I(u0, v0, z1), I(u1, v0, z1), I(u1, v1, z1), I(u0, v1, z1)];
  let s = poly(Rf, tones[3], stroke) + poly(Lf, tones[1], stroke);
  if (hatch) s += K.hatch(dOf(Rf), { density: 0.55, len: [5, 10], w: 1.5 });
  s += poly(Tf, tones[0], stroke);
  return { s, L: Lf, R: Rf, T: Tf };
}
// Square post between two centre points A, B ([u, v, z]), half-width w.
function post(K, A, B, w, tones = WOOD) {
  const L = [I(A[0] - w, A[1] + w, A[2]), I(A[0] + w, A[1] + w, A[2]), I(B[0] + w, B[1] + w, B[2]), I(B[0] - w, B[1] + w, B[2])];
  const R = [I(A[0] + w, A[1] + w, A[2]), I(A[0] + w, A[1] - w, A[2]), I(B[0] + w, B[1] - w, B[2]), I(B[0] + w, B[1] + w, B[2])];
  const Tp = [I(B[0] - w, B[1] - w, B[2]), I(B[0] + w, B[1] - w, B[2]), I(B[0] + w, B[1] + w, B[2]), I(B[0] - w, B[1] + w, B[2])];
  return poly(L, tones[1], 2.6) + poly(R, tones[3], 2.6) + poly(Tp, tones[0], 2.4) +
    line([[L[0][0] + 1.6, L[0][1] - 3], [L[3][0] + 1.6, L[3][1] + 3]], tones[0], 1.6, ' opacity=".8"');
}
// Plank lying on a face between two iso points (vertical thickness h).
function plank(K, A, B, h, tones = WOOD, lit = true) {
  const p1 = I(...A), p2 = I(...B);
  const q = [[p1[0], p1[1] - h / 2], [p2[0], p2[1] - h / 2], [p2[0], p2[1] + h / 2], [p1[0], p1[1] + h / 2]];
  let s = poly(q, tones[lit ? 1 : 2], 2.6);
  s += line([[q[0][0] + 2, q[0][1] + 1.8], [q[1][0] - 2, q[1][1] + 1.8]], tones[lit ? 0 : 1], 1.6, ' opacity=".9"');
  s += line([[q[3][0] + 2, q[3][1] - 1.5], [q[2][0] - 2, q[2][1] - 1.5]], tones[lit ? 2 : 4], 1.7);
  s += K.rivets([lerpP(p1, p2, 0.08), lerpP(p1, p2, 0.92)], 1.5);
  return s;
}
// Mesh texture in the iso ground plane, clipped to a polygon.
function isoMesh(K, p, { step = 7, col = '#8d96a6', w = 1.1, op = 0.55 } = {}) {
  const id = K.id('im'), h = step / 2;
  K.def(`<pattern id="${id}" width="${step}" height="${step}" patternUnits="userSpaceOnUse" patternTransform="matrix(1 0.5 -1 0.5 0 0)"><path d="M0 ${h} H${step} M${h} 0 V${step}" stroke="${col}" stroke-width="${w}" fill="none"/></pattern>`);
  return `<polygon points="${pts(p)}" fill="url(#${id})" opacity="${op}"/>`;
}
// Slim mast with cross bars and a glowing tip.
function mast(K, x, yBot, h, col) {
  const d = `M${f(x)} ${f(yBot)} V${f(yBot - h)}`;
  let s = `<path d="${d}" stroke="${P.ink}" stroke-width="4.8" stroke-linecap="round"/><path d="${d}" stroke="${G[1]}" stroke-width="2" stroke-linecap="round"/>`;
  s += `<path d="M${f(x - 6)} ${f(yBot - h * 0.5)} H${f(x + 6)} M${f(x - 4)} ${f(yBot - h * 0.72)} H${f(x + 4)}" stroke="${P.ink}" stroke-width="2.4" stroke-linecap="round"/>`;
  s += `<rect x="${f(x - 3.5)}" y="${f(yBot - 6)}" width="7" height="7" rx="1.5" fill="${G[2]}" stroke="${P.ink}" stroke-width="2"/>`;
  K.glow(`<circle cx="${f(x)}" cy="${f(yBot - h - 1)}" r="7" fill="${col.c}" opacity=".65" filter="url(#bloom)"/><circle cx="${f(x)}" cy="${f(yBot - h - 1)}" r="2.4" fill="${col.core}"/><circle cx="${f(x)}" cy="${f(yBot - h - 1)}" r="3.4" fill="none" stroke="${col.c}" stroke-width="1.2"/>`);
  return s;
}
// Short steel bracket arm between two screen points.
const arm = (a, b, w = 3.5) => line([a, b], P.ink, w + 4) + line([a, b], G[2], w) + line([[a[0], a[1] - 1], [b[0], b[1] - 1]], G[0], 1.1, ' opacity=".7"');
// Floodlight on a yoke; the beam goes to the glow layer (op = beam strength).
function flood(K, x, y, dir, r = 9, { op = 0.5, L = 150, spread = 0.3, col = FLOOD } = {}) {
  const a = (dir * Math.PI) / 180;
  const fx = x + Math.cos(a) * r * 0.6, fy = y + Math.sin(a) * r * 0.6;
  const b1 = [fx + Math.cos(a - spread) * L, fy + Math.sin(a - spread) * L], b2 = [fx + Math.cos(a + spread) * L, fy + Math.sin(a + spread) * L];
  const gid = K.id('fl');
  K.def(`<radialGradient id="${gid}" cx="${f(fx)}" cy="${f(fy)}" r="${L}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${col.c}" stop-opacity="${op}"/><stop offset=".6" stop-color="${col.c}" stop-opacity="${op * 0.3}"/><stop offset="1" stop-color="${col.c}" stop-opacity="0"/></radialGradient>`);
  K.glow(`<polygon points="${pts([[fx, fy], b1, b2])}" fill="url(#${gid})"/>`);
  const bx = x - Math.cos(a) * r * 0.7, by = y - Math.sin(a) * r * 0.7;
  let s = `<circle cx="${f(bx)}" cy="${f(by)}" r="${f(r * 0.75)}" fill="${G[3]}" stroke="${P.ink}" stroke-width="2.8"/>`;
  s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r + 2)}" fill="${D[2]}" stroke="${P.ink}" stroke-width="3.2"/>`;
  s += `<path d="M${f(x - r * 0.8)} ${f(y - r * 0.6)} A${f(r)} ${f(r)} 0 0 1 ${f(x + r * 0.3)} ${f(y - r)}" stroke="${G[0]}" stroke-width="2" fill="none" opacity=".7"/>`;
  s += `<ellipse cx="${f(fx)}" cy="${f(fy)}" rx="${f(r * 0.55)}" ry="${f(r * 0.85)}" transform="rotate(${f(dir)} ${f(fx)} ${f(fy)})" fill="${col.core}" stroke="${P.ink}" stroke-width="2.4"/>`;
  K.glow(`<circle cx="${f(fx)}" cy="${f(fy)}" r="${f(r * 1.7)}" fill="${col.c}" opacity=".75" filter="url(#bloom)"/><ellipse cx="${f(fx)}" cy="${f(fy)}" rx="${f(r * 0.4)}" ry="${f(r * 0.65)}" transform="rotate(${f(dir)} ${f(fx)} ${f(fy)})" fill="${col.core}"/>`);
  return s;
}
// Olive oil drum with ink hoops.
function drum(K, x, yBot, r = 12, tones = T.olive) {
  return K.cyl({ cx: x, y: yBot, rx: r, ry: r * 0.5, h: r * 2.3, tones, top: 'rim', stroke: 3, hatch: false }) +
    K.hoop(x, yBot - r * 0.72, r, r * 0.5, 3.4, P.ink) + K.hoop(x, yBot - r * 1.6, r, r * 0.5, 3.4, P.ink) +
    `<path d="M${f(x - r + 2.5)} ${f(yBot - r * 2.1)} V${f(yBot - 2)}" stroke="${tones[0]}" stroke-width="1.8" opacity=".7"/>`;
}

// ------------------------------------------------------------ the tower body
// Core column section between two heights.
function core(K, z0, z1, LL, RR) {
  let s = poly(front2(SC, z0, z1), D[3], 3.5);
  s += rows(K, 'L', SC, LL) + rows(K, 'R', SC, RR);
  // steel angle down the front corner
  const qL = quad('L', SC, 0.9, 1, z0, z1, 1.6), qR = quad('R', SC, 0, 0.09, z0, z1, 1.6);
  s += poly(qL, G[1], 2.6) + poly(qR, G[3], 2.6);
  s += line([add(qL[0], [1.6, 2]), add(qL[3], [1.6, -2])], T.rim, 1.6, ' opacity=".55"');
  for (let z = z0 + 8; z < z1 - 4; z += 17) s += K.rivets([FP('L', SC, 0.95, z, 1.6)], 1.6) + K.rivets([FP('R', SC, 0.045, z - 2, 1.6)], 1.5);
  return s;
}
// Timber ring beam round the core (just under the collar) with lapped ends.
function ringBeam(K, z) {
  const h = SC + 1.5;
  let s = '';
  s += ibox(K, -h - 9, h - 8, -h, h, z - 8, z, [WOOD[0], WOOD[1], WOOD[2], WOOD[3]], { hatch: false, stroke: 2.4 }).s; // left stub
  s += ibox(K, h - 8, -h - 9, h, -h, z - 8, z, [WOOD[0], WOOD[1], WOOD[2], WOOD[3]], { hatch: false, stroke: 2.4 }).s; // right stub
  s += plank(K, [-h, h, z - 4], [h + 6, h, z - 4], 8, WOOD, true);
  s += plank(K, [h, h + 6, z - 4], [h, -h, z - 4], 8, WOOD, false);
  return s;
}
// The collar: a wider band of sheets with a lit ledge on top.
function collar(K) {
  const { z0, z1, h } = COL;
  let s = '';
  s += poly(front2(h, z0, z1), D[3], 3.5);
  s += rows(K, 'L', h, [[z0, z1, [[0, 0.32, 'corr'], [0.32, 0.68, 'plate', 0], [0.68, 1, 'rust']]]]);
  s += rows(K, 'R', h, [[z0, z1, [[0, 0.5, 'plate', 1], [0.5, 1, 'corr']]]]);
  s += poly(diamond(0, 0, h, z1), G[1], 3);
  s += line([I(-h + 2, h - 1, z1), I(h - 1, h - 1, z1), I(h - 1, -h + 2, z1)], T.rim, 1.8, ' opacity=".55"');
  return s;
}
// Soft ink shadow cast by an overhang onto the faces of a block below it.
function overhangShadow(K, h, zTop, depth = 12, op = 0.55) {
  const cid = K.id('c');
  K.def(`<clipPath id="${cid}"><polygon points="${pts(front2(h, zTop - 40, zTop))}"/></clipPath>`);
  return `<g clip-path="url(#${cid})"><polygon points="${pts(front2(h + 2, zTop - depth, zTop + 6))}" fill="${P.ink}" opacity="${op}" filter="url(#soft)"/></g>`;
}
// The crown body (the wide box the cabin stands on) with its deck.
function crownBody(K) {
  const { z0, z1, h } = CRN;
  let s = '';
  // spikes on the back faces, poking out past the silhouette
  s += spk(K, I(-h, -10, z0 + 16), 196, 24, 10) + spk(K, I(-10, -h, z0 + 16), -16, 24, 10);
  s += poly(front2(h, z0, z1), D[3], 3.5);
  s += rows(K, 'L', h, [[z0, z1, [[0, 0.26, 'plate', 0], [0.26, 0.52, 'corr'], [0.52, 0.78, 'plate', 2], [0.78, 1, 'rust']]]]);
  s += rows(K, 'R', h, [[z0, z1, [[0, 0.3, 'corr'], [0.3, 0.64, 'plate', 0], [0.64, 1, 'plate', 1]]]]);
  // the deck: steel plate with a grate, lit back edges
  s += poly(diamond(0, 0, h, z1), G[2], 3.2);
  s += poly(diamond(0, 0, h - 7, z1), D[3], 2.2);
  s += isoMesh(K, diamond(0, 0, h - 9, z1), { step: 6, col: '#8d96a6', op: 0.5 });
  s += line([I(-h + 2, h - 2, z1), I(-h + 2, -h + 2, z1), I(h - 2, -h + 2, z1)], T.rim, 1.8, ' opacity=".45"');
  // contact shadow of the cabin on the deck
  s += poly(diamond(CAB.cu + 5, CAB.cv + 5, CAB.h + 3, z1), P.ink, 0, ' opacity=".55" filter="url(#soft)"');
  return s;
}
// Spikes along the crown's lower edge.
function crownSpikes(K) {
  const { z0, h } = CRN;
  let s = '';
  s += spk(K, FP('L', h, 0.01, z0 + 10, 1), 186, 26, 11);
  for (const [t, a] of [[0.2, 158], [0.42, 150], [0.64, 146], [0.86, 138]]) s += spk(K, FP('L', h, t, z0 + 7, 1), a + K.rand(-4, 4), 22, 10);
  s += spk(K, FP('L', h, 1, z0 + 4, 1), 104, 20, 10);
  for (const [t, a] of [[0.16, 40], [0.4, 32], [0.63, 26], [0.86, 20]]) s += spk(K, FP('R', h, t, z0 + 7, 1), a + K.rand(-4, 4), 22, 10);
  s += spk(K, FP('R', h, 0.99, z0 + 10, 1), -6, 26, 11);
  return s;
}
// The far parapet walls (seen from inside) and the plank fence fragment.
function backWalls(K) {
  const w = CRN.h - 2, z0 = DZ - 2;
  // BL wall: u = -w, t 0 = left corner (v = w) -> 1 = back corner (v = -w); inner face is in shade
  const BLq = (t0, t1, top) => [I(-w, lerp(w, -w, t0), top), I(-w, lerp(w, -w, t1), top), I(-w, lerp(w, -w, t1), z0), I(-w, lerp(w, -w, t0), z0)];
  // BR wall: v = -w, t 0 = back corner (u = -w) -> 1 = right corner (u = w); inner face is lit
  const BRq = (t0, t1, top) => [I(lerp(-w, w, t0), -w, top), I(lerp(-w, w, t1), -w, top), I(lerp(-w, w, t1), -w, z0), I(lerp(-w, w, t0), -w, z0)];
  let s = '';
  for (const [t0, t1, top, type, tone] of [[0, 0.32, 270, 'corr', 0], [0.3, 0.66, 262, 'plate', 1], [0.64, 1, 268, 'corr', 0]]) {
    const q = BLq(t0, t1, top);
    s += sheet(K, q, type, false, { tone });
    s += poly([q[0], q[1], add(q[1], [3, -1.5]), add(q[0], [3, -1.5])], G[1], 1.8);
  }
  for (const [t0, t1, top, type, tone] of [[0, 0.36, 266, 'plate', 1], [0.34, 0.7, 272, 'corr', 0], [0.68, 1, 262, 'plate', 0]]) {
    const q = BRq(t0, t1, top);
    s += sheet(K, q, type, true, { tone });
    s += poly([q[0], q[1], add(q[1], [-3, -1.5]), add(q[0], [-3, -1.5])], G[0], 1.8);
  }
  s += K.hatch(dOf(BLq(0, 1, 270)), { density: 0.45, len: [6, 11], w: 1.5 });
  // plank fence fragment rising behind the left corner (broken tops, a cross batten)
  const pl = [[37, 292], [29, 284], [21, 296], [13, 280]];
  for (const [v, top] of pl) {
    const q = [I(-w + 2, v + 3.5, top), I(-w + 2, v - 3.5, top - 3), I(-w + 2, v - 3.5, z0 + 20), I(-w + 2, v + 3.5, z0 + 20)];
    s += poly(q, K.pick([WOOD[1], WOOD[2]]), 2.6);
    s += line([add(q[0], [1.5, 2]), add(q[3], [1.5, -2])], WOOD[0], 1.4, ' opacity=".8"');
  }
  s += plank(K, [-w + 3, 42, 270], [-w + 3, 8, 274], 6, WOOD, false);
  return s;
}

// The gatehouse on the front left: spiked cap, jail-bar gate, a plank, a padlock.
function gatehouse(K) {
  const { u0, u1, v0, v1, z } = GH;
  let s = '';
  // R face (u = u1, from the front corner v1 back to v0), in shade
  const Rq = [I(u1, v1, z), I(u1, v0, z), I(u1, v0, 0), I(u1, v1, 0)];
  s += poly(Rq, D[3], 3.2);
  s += sheet(K, [I(u1 + 0.5, v1, z), I(u1 + 0.5, v0, z), I(u1 + 0.5, v0, 44), I(u1 + 0.5, v1, 44)], 'plate', false, { tone: 0 });
  s += sheet(K, [I(u1 + 1, v1, 46), I(u1 + 1, v0, 46), I(u1 + 1, v0, 0), I(u1 + 1, v1, 0)], 'corr', false);
  s += K.hatch(dOf(Rq), { density: 0.55, len: [6, 12], w: 1.6 });
  const c1 = I(u1 + 1.5, 52, 70), c2 = I(u1 + 1.5, 52, 52);
  s += K.neon(`M${M(c1)} L${M(c2)}`, CY, 2.8);
  // L face (v = v1): pillars, lintel, gate
  const LP = (u, zz, dv = 0) => I(u, v1 + dv, zz);
  s += poly([LP(u0, z), LP(u1, z), LP(u1, 0), LP(u0, 0)], D[3], 3.5);
  const g0 = u0 + 13, g1 = u1 - 13, gz = 58;
  // the opening: dark inside with a violet glow on the floor (the barracks)
  s += poly([LP(g0, gz), LP(g1, gz), LP(g1, 0), LP(g0, 0)], K.vgrad('#111117', '#3c2868'), 3);
  s += poly([I(g0, v1 - 9, 0), I(g1, v1 - 9, 0), I(g1, v1, 0), I(g0, v1, 0)], '#4a3486', 0, ' opacity=".8"');
  s += poly([I(g0, v1, gz), I(g0, v1 - 9, gz), I(g0, v1 - 9, 0), I(g0, v1, 0)], G[3], 2.4);
  const fl = I((g0 + g1) / 2, v1 - 4, 4);
  K.glow(`<ellipse cx="${f(fl[0])}" cy="${f(fl[1])}" rx="22" ry="9" fill="${VI.c}" opacity=".45" filter="url(#bloom)"/>`);
  // the bars
  for (const u of [-20, -14, -8, -2, 4]) {
    const a = I(u, v1 - 1.5, 0), b = I(u, v1 - 1.5, gz);
    s += line([a, b], P.ink, 6) + line([a, b], '#6b7280', 3) + line([[a[0] - 0.8, a[1] - 1], [b[0] - 0.8, b[1] + 1]], '#b6bfcc', 1.1, ' opacity=".85"');
  }
  for (const zz of [17, 39]) {
    const a = I(g0, v1 - 1, zz), b = I(g1, v1 - 1, zz);
    s += line([a, b], P.ink, 7) + line([a, b], G[2], 3.4) + line([add(a, [0, -1]), add(b, [0, -1])], G[0], 1.1, ' opacity=".7"');
    s += K.rivets([-20, -14, -8, -2, 4].map((u) => I(u, v1 - 0.5, zz)), 1.5);
  }
  // padlock on the middle bar
  {
    const p = I(-6, v1, 33);
    s += `<g transform="${skew('L', p)}"><path d="M-3.4 -2 V-6 A3.4 3.4 0 0 1 3.4 -6 V-2" fill="none" stroke="${P.ink}" stroke-width="4"/><path d="M-3.4 -2 V-6 A3.4 3.4 0 0 1 3.4 -6 V-2" fill="none" stroke="${G[0]}" stroke-width="1.6"/>` +
      `<rect x="-5.5" y="-3" width="11" height="9" rx="2" fill="${T.brass[1]}" stroke="${P.ink}" stroke-width="2"/><rect x="-4" y="-1.8" width="8" height="2.2" fill="${T.brass[0]}" opacity=".8"/><circle cx="0" cy="2.4" r="1.3" fill="${P.ink}"/></g>`;
  }
  // pillars and the lintel (hazard band + corrugated sheet)
  s += K.armour([LP(u0, z), LP(g0 + 1, z), LP(g0 + 1, 0), LP(u0, 0)], PLATE.L[0], { stroke: 3 });
  s += K.armour([LP(g1 - 1, z), LP(u1, z), LP(u1, 0), LP(g1 - 1, 0)], PLATE.L[2], { stroke: 3 });
  s += K.corrugated([LP(g0 - 1, z), LP(g1 + 1, z), LP(g1 + 1, gz + 9), LP(g0 - 1, gz + 9)], { tones: CORR.L, angle: 0, pitch: 6 });
  s += K.hazard([LP(g0 - 1, gz + 9), LP(g1 + 1, gz + 9), LP(g1 + 1, gz), LP(g0 - 1, gz)], { w: 5 });
  s += line([LP(g0 - 1, gz - 1.5), LP(g1 + 1, gz - 1.5)], P.ink, 2.6, ' opacity=".7"');
  // a plank nailed across the left pillar (the barricade bits)
  s += plank(K, [u0 - 4, v1 + 2, 30], [g0 + 6, v1 + 2, 50], 7, WOOD, true);
  // the cap slab and its spikes
  s += ibox(K, u0 - 3, v0, u1 + 3, v1 + 3, z, z + 7, [G[0], G[1], G[2], G[3]], { hatch: false, stroke: 3 }).s;
  s += line([I(u0 - 1, v1 + 2, z + 7), I(u1 + 2, v1 + 2, z + 7)], T.rim, 1.6, ' opacity=".6"');
  // spikes on the pillars and the shaded side
  for (const zz of [18, 44, 70]) s += spk(K, LP(u0 + 6, zz, 1), 160 + K.rand(-5, 5), 17, 8);
  for (const zz of [22, 48]) s += spk(K, LP(u1 - 6, zz, 1), 132 + K.rand(-5, 5), 15, 8);
  for (const [v, zz] of [[58, 20], [44, 50], [56, 74]]) s += spk(K, I(u1 + 1, v, zz), 24 + K.rand(-5, 5), 17, 8);
  return s;
}
// Spikes standing on the gatehouse cap (drawn after the core so they read).
function gateSpikes(K) {
  const { u0, u1, v0, v1, z } = GH;
  let s = '';
  for (const v of [40, 52]) s += spk(K, I(u1 + 2, v, z + 7), -86 + K.rand(-6, 6), 18, 9);
  for (let u = u0 + 1; u <= u1 + 1; u += 12) s += spk(K, I(u, v1 + 2, z + 7), -96 + K.rand(-8, 8), 20, 9);
  return s;
}

// The plank shack on the front right with a patched corrugated roof.
function shack(K) {
  const { u0, u1, v0, v1, zw, ue } = SH;
  let s = '';
  // R face (u = u1): vertical boards, in shade
  const nb = 7;
  for (let i = 0; i < nb; i++) {
    const va = lerp(v1, v0, i / nb), vb = lerp(v1, v0, (i + 1) / nb);
    const top = zw + 2 - K.rand(0, 3);
    const q = [I(u1, va, top), I(u1, vb, top), I(u1, vb, 0), I(u1, va, 0)];
    s += poly(q, K.pick([WOOD[2], WOOD[3], WOOD[2]]), 2.2);
    s += line([add(q[0], [2, 2]), add(q[3], [2, -2])], WOOD[1], 1.2, ' opacity=".6"');
    s += K.rivets([lerpP(q[3], q[2], 0.5).map((c, k) => c - (k ? 8 : 0)), lerpP(q[0], q[1], 0.5).map((c, k) => c + (k ? 8 : 0))], 1.2);
  }
  s += plank(K, [u1 + 1, v1, 14], [u1 + 1, v0, 14], 6, WOOD, false);
  // window with a mesh grille and a cyan screen flicker inside
  const wq = [I(u1 + 0.5, 4, 46), I(u1 + 0.5, -16, 46), I(u1 + 0.5, -16, 24), I(u1 + 0.5, 4, 24)];
  s += poly(wq, '#15161b', 3);
  const sc = lerpP(lerpP(wq[0], wq[2], 0.62), wq[3], 0.15);
  K.glow(`<g transform="${skew('R', sc)}"><rect x="-1" y="-4" width="7" height="5" fill="${CY.c}" opacity=".85"/><rect x="-4" y="-7" width="13" height="11" fill="${CY.c}" opacity=".35" filter="url(#bloom)"/></g>`);
  for (let k = 1; k < 4; k++) s += line([lerpP(wq[0], wq[1], k / 4), lerpP(wq[3], wq[2], k / 4)], G[1], 1.6);
  for (let k = 1; k < 3; k++) s += line([lerpP(wq[0], wq[3], k / 3), lerpP(wq[1], wq[2], k / 3)], G[1], 1.6);
  s += poly(wq, 'none', 3);
  s += plank(K, [u1 + 1.5, 6, 49], [u1 + 1.5, -18, 49], 5, WOOD, false);
  s += K.hatch(dOf([I(u1, v1, zw), I(u1, v0, zw), I(u1, v0, 0), I(u1, v1, 0)]), { density: 0.5, len: [6, 12], w: 1.6 });
  // L face (v = v1): boards up to the roof line, lit
  const nl = 4;
  for (let i = 0; i < nl; i++) {
    const ua = lerp(u0, u1, i / nl), ub = lerp(u0, u1, (i + 1) / nl);
    const q = [I(ua, v1, roofZ(ua)), I(ub, v1, roofZ(ub)), I(ub, v1, 0), I(ua, v1, 0)];
    s += poly(q, K.pick([WOOD[1], WOOD[0], WOOD[1]]), 2.2);
    s += line([add(q[0], [2, 3]), add(q[3], [2, -2])], WOOD[0], 1.3, ' opacity=".7"');
  }
  s += plank(K, [u0, v1 + 1, 30], [u1, v1 + 1, 30], 6, WOOD, true);
  s += K.leds([I(u0 + 22, v1 + 1, 44)], CY, 1.6);
  // corner posts with steel shoes
  s += post(K, [u1, v0, 0], [u1, v0, zw], 2.8, WOOD);
  s += post(K, [u1, v1, 0], [u1, v1, zw + 1], 2.8, WOOD);
  for (const v of [v0, v1]) s += ibox(K, u1 - 4, v - 4, u1 + 4, v + 4, 0, 8, STEEL, { hatch: false, stroke: 2.2 }).s;
  // roof: fascia boards, three patched corrugated sheets, a mesh patch, a tyre
  const eave = roofZ(ue);
  s += poly([I(u0, 30, SH.zr), I(ue, 30, eave), I(ue, 30, eave - 5), I(u0, 30, SH.zr - 5)], WOOD[1], 2.6);
  s += poly([I(ue, 30, eave), I(ue, -38, eave), I(ue, -38, eave - 5), I(ue, 30, eave - 5)], WOOD[3], 2.6);
  const RTONE = [['#8a94a6', '#677084', '#4b5263'], RUST.L, ['#727b8d', '#565e6e', '#3f4552']];
  [[30, 8, 0, 1], [10, -14, 1.5, 2], [-12, -38, 0.5, 0]].forEach(([va, vb, dz, k]) => {
    const q = [I(u0, va, SH.zr + 1 + dz), I(u0, vb, SH.zr + 1 + dz), I(ue + (k === 2 ? 2 : 0), vb, eave + dz * 0.4), I(ue + (k === 2 ? 2 : 0), va, eave + dz * 0.4)];
    s += K.corrugated(q, { tones: RTONE[k], angle: -38.7, pitch: 7 });
    s += line([add(q[0], [1, 2]), add(q[1], [-1, 2])], T.rim, 1.4, ' opacity=".45"');
  });
  // mesh patch and rust stain
  const mp = [I(46, -20, roofZ(46) + 2.5), I(46, -32, roofZ(46) + 2.5), I(62, -32, roofZ(62) + 2.5), I(62, -20, roofZ(62) + 2.5)];
  s += K.net(mp, { tone: '#2a2e36' });
  const rs = I(58, 2, roofZ(58) + 3);
  s += `<ellipse cx="${f(rs[0])}" cy="${f(rs[1])}" rx="9" ry="4" fill="${RUST.L[0]}" opacity=".55" transform="rotate(50 ${f(rs[0])} ${f(rs[1])})"/>`;
  // flashing along the joint with the tower
  s += line([I(u0 + 1, 31, SH.zr + 2), I(u0 + 1, -38, SH.zr + 2)], P.ink, 5) + line([I(u0 + 1, 31, SH.zr + 2), I(u0 + 1, -38, SH.zr + 2)], G[1], 2.2);
  // a tyre holding the sheets down
  const ty = I(50, 16, roofZ(50) + 4);
  s += K.tyre(ty[0], ty[1], 9);
  return s;
}
// The concrete foot wrapped round the core's front corner.
function cornerFoot(K) {
  const a = 23, b = 45, z = 40;
  let s = '';
  s += poly([I(a, b, 0), I(b, b, 0), I(b, b, z), I(a, b, z)], STONE[1], 3);
  s += poly([I(b, b, 0), I(b, a, 0), I(b, a, z), I(b, b, z)], STONE[3], 3);
  s += K.hatch(dOf([I(b, b, 0), I(b, a, 0), I(b, a, z), I(b, b, z)]), { density: 0.6, len: [5, 10], w: 1.5 });
  s += poly([I(a, SC, z), I(a, b, z), I(b, b, z), I(b, a, z), I(SC, a, z), I(SC, SC, z)], STONE[0], 3);
  s += line([I(a + 1, b, z - 2), I(b - 1, b, z - 2)], '#c9d0d8', 1.5, ' opacity=".7"');
  // a steel band and chips
  s += poly([I(a, b + 0.5, z - 10), I(b, b + 0.5, z - 10), I(b, b + 0.5, z - 16), I(a, b + 0.5, z - 16)], G[2], 2.2);
  s += poly([I(b + 0.5, b, z - 10), I(b + 0.5, a, z - 10), I(b + 0.5, a, z - 16), I(b + 0.5, b, z - 16)], G[3], 2.2);
  s += K.rivets([I(a + 5, b + 0.5, z - 13), I(b - 4, b + 0.5, z - 13), I(b + 0.5, b - 5, z - 13), I(b + 0.5, a + 5, z - 13)], 1.5);
  const c = I(30, b, 12);
  s += `<path d="M${f(c[0])} ${f(c[1])} l3 6 l-2 5 M${f(c[0] + 10)} ${f(c[1] - 14)} l2 5" stroke="${P.ink}" stroke-width="1.6" fill="none" opacity=".7"/>`;
  return s;
}
// Chimney pipe from the shack's wall, up past the tower, with a spike cap.
function chimney(K) {
  const a = I(66, -12, 40), b = I(80, -12, 40), c = I(80, -12, 186);
  let s = K.pipe(`M${M(a)} L${M(b)} L${M(c)}`, 10, G[2], G[0]);
  for (const zz of [70, 132]) {
    const p = I(80, -12, zz);
    s += `<rect x="${f(p[0] - 8)}" y="${f(p[1] - 3.5)}" width="16" height="7" rx="2" fill="${G[3]}" stroke="${P.ink}" stroke-width="2.4"/>`;
  }
  const t = I(80, -12, 186);
  s += `<rect x="${f(t[0] - 9)}" y="${f(t[1] - 6)}" width="18" height="10" rx="2.5" fill="${G[2]}" stroke="${P.ink}" stroke-width="2.8"/><path d="M${f(t[0] - 6.5)} ${f(t[1] - 3)} H${f(t[0] + 2)}" stroke="${G[0]}" stroke-width="1.6"/>`;
  for (const dy of [14, 24, 34]) s += `<circle cx="${f(t[0] + (dy % 20 ? 1.5 : -1.5))}" cy="${f(t[1] + dy)}" r="1.8" fill="${P.ink}"/>`;
  s += K.spike(t[0], t[1] - 6, 26, -90, 17);
  // rust streak and a bracket strap to the shack roof
  s += `<path d="M${f(b[0] + 1.5)} ${f(b[1] - 4)} v-34" stroke="${RUST.L[1]}" stroke-width="2.4" opacity=".6"/>`;
  return s;
}

// ------------------------------------------------------------ the props
// Hand-painted board on the collar's shaded face.
function paintedSign(K) {
  const o = FP('R', COL.h, 0.09, 159, 2.5);
  const w = 66, h = 34;
  const txt = (str, y, size) => K.text(str, w / 2, y, { size, color: PAINT, font: 'Bungee' }).replace(/stroke-width="[^"]*"/, 'stroke-width="0"');
  let g = `<rect x="0" y="0" width="${w}" height="${h}" rx="2" fill="${PAPER[1]}" stroke="${P.ink}" stroke-width="3"/>`;
  g += `<rect x="2" y="2" width="${w - 4}" height="6" fill="${PAPER[0]}" opacity=".8"/><path d="M3 ${h - 4} H${w - 3}" stroke="${PAPER[2]}" stroke-width="3" opacity=".7"/>`;
  g += txt('TRESPASSERS', 11.5, 7.2) + txt('WILL BE', 20.5, 7.2) + txt('RECRUITED!', 29.5, 7.2);
  g += `<path d="M14 23 v4 M40 31 v3 M52 14 v3" stroke="${PAINT}" stroke-width="1.3" opacity=".8"/>`;
  g += [[4, 4], [w - 4, 4], [4, h - 4], [w - 4, h - 4]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="${P.ink}"/>`).join('');
  return `<g transform="${skew('R', o)}"><g transform="rotate(-2.5 ${w / 2} ${h / 2})">${g}</g></g>`;
}
// Red squad placard (stencil "07") on the core's shaded face.
function placard(K) {
  const o = FP('R', SC, 0.5, 112, 2.5);
  let g = `<rect x="0" y="0" width="24" height="20" rx="2" fill="${RD.deep}" stroke="${P.ink}" stroke-width="2.6"/><rect x="2" y="2" width="20" height="4" fill="#b8302b" opacity=".9"/>`;
  g += K.text('07', 12, 16.5, { size: 11, color: '#ffd23a', font: 'Bungee' }).replace(/stroke-width="[^"]*"/, 'stroke-width="0"');
  g += `<circle cx="3.5" cy="3.5" r="1.3" fill="${P.ink}"/><circle cx="20.5" cy="3.5" r="1.3" fill="${P.ink}"/>`;
  return `<g transform="${skew('R', o)}"><g transform="rotate(4 12 10)">${g}</g></g>`;
}
// Small tools lying on the plate: a sledgehammer, a red crowbar, a wrench.
function tools(K) {
  let s = '';
  // sledgehammer
  s += line([[236, 457], [276, 449]], P.ink, 6.5) + line([[236, 457], [276, 449]], WOOD[1], 3) + line([[238, 455.6], [274, 447.8]], WOOD[0], 1, ' opacity=".8"');
  s += `<g transform="rotate(-11 280 448)"><rect x="276" y="440" width="11" height="17" rx="2" fill="${G[2]}" stroke="${P.ink}" stroke-width="2.6"/><rect x="277.5" y="441.5" width="4" height="14" fill="${G[0]}" opacity=".7"/></g>`;
  // red crowbar with a hook
  s += `<path d="M262 461 L310 452 q7 -1 7 -7" fill="none" stroke="${P.ink}" stroke-width="6" stroke-linecap="round"/><path d="M262 461 L310 452 q7 -1 7 -7" fill="none" stroke="${P.red[1]}" stroke-width="2.8" stroke-linecap="round"/>`;
  // wrench
  s += line([[300, 461], [322, 456]], P.ink, 6) + line([[300, 461], [322, 456]], G[1], 2.8);
  s += `<path d="M326 451 a5.5 5.5 0 1 0 1.5 9 l-3 -3 l1.5 -3 Z" fill="${G[1]}" stroke="${P.ink}" stroke-width="2.4"/>`;
  return s;
}
// Painted violet stripes on the plate in front of the gate (worn).
function gatePaint(K) {
  let s = '';
  for (let k = 0; k < 4; k++) {
    const u = -34 + k * 13;
    s += poly([I(u, 69, 0), I(u + 6, 69, 0), I(u + 12, 84, 0), I(u + 6, 84, 0)], VI.c, 0, ' opacity=".55"');
  }
  for (let i = 0; i < 6; i++) { const p = I(K.rand(-34, 14), K.rand(70, 84), 0); s += `<ellipse cx="${f(p[0])}" cy="${f(p[1])}" rx="${f(K.rand(1.5, 3.5))}" ry="1.4" fill="${P.ink}" opacity=".4"/>`; }
  return s;
}

// ------------------------------------------------------------ the front walls
// The two near parapet walls of the crown (in front of the cabin's foot).
function frontWalls(K) {
  const h = CRN.h, z0 = DZ - 6;
  let s = '';
  const L = [[0, 0.22, 268, 'corr', 0], [0.2, 0.44, 258, 'plate', 0], [0.42, 0.64, 266, 'rust', 0], [0.62, 0.84, 256, 'plate', 1], [0.82, 1, 264, 'corr', 0]];
  const R = [[0, 0.2, 262, 'corr', 0], [0.18, 0.5, 258, 'plate', 2], [0.48, 0.72, 268, 'corr', 0], [0.7, 1, 260, 'plate', 0]];
  for (const [side, list] of [['L', L], ['R', R]]) {
    list.forEach(([t0, t1, top, type, tone], i) => {
      const q = quad(side, h, t0, t1, z0, top, 1.5 + (i % 2) * 0.8);
      if (type === 'plate' && i % 2) q.splice(1, 1, add(q[1], side === 'L' ? [-6, 0] : [-5, 1]), add(q[1], side === 'L' ? [0, 6] : [0, 6]));
      s += sheet(K, q, type, side === 'L', { tone });
      const inw = side === 'L' ? [3, -1.5] : [-3, -1.5];
      s += poly([q[0], q[1], add(q[1], inw), add(q[0], inw)], side === 'L' ? G[0] : G[1], 1.8);
    });
    if (side === 'R') s += K.hatch(dOf(quad('R', h, 0, 1, z0, 268, 1.5)), { density: 0.45, len: [6, 11], w: 1.5 });
  }
  // cyan holo emblem (three rank chevrons) on the R wall plate
  const ec = FP('R', h, 0.34, 244, 2.4);
  s += `<g transform="${skew('R', ec)}"><rect x="-9" y="-9" width="18" height="18" rx="4" fill="#15161b" stroke="${P.ink}" stroke-width="2.4"/></g>`;
  const chev = 'M-5 -3 L0 -6 L5 -3 M-5 1 L0 -2 L5 1 M-5 5 L0 2 L5 5';
  K.glow(`<g transform="${skew('R', ec)}"><rect x="-10" y="-10" width="20" height="20" rx="5" fill="${CY.c}" opacity=".35" filter="url(#bloom)"/><rect x="-7" y="-7" width="14" height="14" rx="3" fill="none" stroke="${CY.c}" stroke-width="1.6"/>` +
    `<path d="${chev}" fill="none" stroke="${CY.c}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="${chev}" fill="none" stroke="${CY.core}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></g>`);
  // spikes poking out of the walls
  for (const [t, zz, a] of [[0.08, 250, 168], [0.32, 244, 152], [0.56, 248, 148], [0.78, 242, 140]]) s += spk(K, FP('L', h, t, zz, 2.2), a + K.rand(-4, 4), 20, 9);
  for (const [t, zz, a] of [[0.12, 244, 36], [0.62, 248, 28], [0.9, 246, 14]]) s += spk(K, FP('R', h, t, zz, 2.2), a + K.rand(-4, 4), 20, 9);
  s += spk(K, FP('L', h, 0, 262, 1.5), 192, 22, 10) + spk(K, FP('R', h, 1, 258, 1.5), -12, 22, 10);
  // corner posts with red warning lamps
  for (const [u, v, top] of [[-h - 1, h + 1.5, 274], [h + 1.5, h + 1.5, 260], [h + 1.5, -h - 1, 268]]) s += post(K, [u, v, z0], [u, v, top], 3, STEEL);
  s += K.leds([I(-h - 1, h + 1.5, 278)], BL, 3) + K.leds([I(h + 1.5, h + 1.5, 264)], RD, 2.8);
  return s;
}

// ------------------------------------------------------------ the head
// The violet skull banner on a pole standing on the deck at the back right.
function banner(K) {
  const foot = I(6, -42, DZ), x = foot[0];
  const yTop = 42, yBar = 48;
  let s = '';
  // cloth hanging from the crossbar (behind the pole)
  const x0 = x - 3, x1 = x + 50, y0 = yBar + 1;
  const cloth = `M${f(x0)} ${f(y0)} L${f(x1)} ${f(y0)} C${f(x1 + 3)} ${f(y0 + 22)} ${f(x1 - 2)} ${f(y0 + 44)} ${f(x1 + 4)} ${f(y0 + 64)} L${f(x1 - 6)} ${f(y0 + 56)} L${f(x1 - 13)} ${f(y0 + 71)} L${f(x1 - 21)} ${f(y0 + 57)} L${f(x1 - 30)} ${f(y0 + 73)} L${f(x1 - 38)} ${f(y0 + 58)} L${f(x0 + 6)} ${f(y0 + 69)} L${f(x0 + 1)} ${f(y0 + 56)} C${f(x0 - 1)} ${f(y0 + 38)} ${f(x0 + 2)} ${f(y0 + 18)} ${f(x0)} ${f(y0)} Z`;
  s += `<path d="${cloth}" fill="${CLOTH[1]}" stroke="${P.ink}" stroke-width="3.2" stroke-linejoin="round"/>`;
  const cid = K.id('c');
  K.def(`<clipPath id="${cid}"><path d="${cloth}"/></clipPath>`);
  let fold = `<rect x="${f(x0 - 4)}" y="${f(y0)}" width="13" height="80" fill="${CLOTH[0]}" opacity=".9"/>`;
  fold += `<path d="M${f(x0 + 13)} ${f(y0)} q-3 30 2 76 h5 q-4 -40 -1 -76 Z" fill="${CLOTH[2]}" opacity=".8"/>`;
  fold += `<path d="M${f(x1 - 11)} ${f(y0)} q-4 30 1 76 h14 v-76 Z" fill="${CLOTH[2]}" opacity=".9"/>`;
  fold += `<rect x="${f(x0 - 4)}" y="${f(y0)}" width="${f(x1 - x0 + 8)}" height="5" fill="${CLOTH[3]}" opacity=".7"/>`;
  fold += `<path d="M${f(x0 + 4)} ${f(y0 + 40)} l3 -12 M${f(x1 - 4)} ${f(y0 + 30)} l-2 14" stroke="${CLOTH[3]}" stroke-width="1.6" opacity=".7"/>`;
  // the skull and crossbones (pale violet paint, faint UV glow)
  const sx = (x0 + x1) / 2 + 2, sy = y0 + 28;
  const skull = `<path d="M${f(sx - 15)} ${f(sy + 13)} L${f(sx + 15)} ${f(sy - 9)} M${f(sx - 15)} ${f(sy - 9)} L${f(sx + 15)} ${f(sy + 13)}" stroke="${P.ink}" stroke-width="7" stroke-linecap="round"/>` +
    `<path d="M${f(sx - 15)} ${f(sy + 13)} L${f(sx + 15)} ${f(sy - 9)} M${f(sx - 15)} ${f(sy - 9)} L${f(sx + 15)} ${f(sy + 13)}" stroke="${BONE}" stroke-width="3.4" stroke-linecap="round"/>` +
    `<path d="M${f(sx - 10)} ${f(sy - 1)} C${f(sx - 11)} ${f(sy - 15)} ${f(sx + 11)} ${f(sy - 15)} ${f(sx + 10)} ${f(sy - 1)} C${f(sx + 10)} ${f(sy + 4)} ${f(sx + 6)} ${f(sy + 4)} ${f(sx + 6)} ${f(sy + 7)} L${f(sx + 6)} ${f(sy + 11)} L${f(sx - 6)} ${f(sy + 11)} L${f(sx - 6)} ${f(sy + 7)} C${f(sx - 6)} ${f(sy + 4)} ${f(sx - 10)} ${f(sy + 4)} ${f(sx - 10)} ${f(sy - 1)} Z" fill="${BONE}" stroke="${P.ink}" stroke-width="2.4" stroke-linejoin="round"/>` +
    `<ellipse cx="${f(sx - 4.3)}" cy="${f(sy - 2)}" rx="3.3" ry="3.8" fill="${CLOTH[3]}"/><ellipse cx="${f(sx + 4.3)}" cy="${f(sy - 2)}" rx="3.3" ry="3.8" fill="${CLOTH[3]}"/>` +
    `<path d="M${f(sx)} ${f(sy + 2)} l-1.6 3 h3.2 Z" fill="${CLOTH[3]}"/><path d="M${f(sx - 3)} ${f(sy + 8)} v3 M${f(sx)} ${f(sy + 8)} v3 M${f(sx + 3)} ${f(sy + 8)} v3" stroke="${CLOTH[3]}" stroke-width="1.3"/>`;
  s += `<g clip-path="url(#${cid})">${fold}</g><g transform="translate(${f(sx)} ${f(sy)}) scale(1.15) translate(${f(-sx)} ${f(-sy)})">${skull}</g>`;
  s += `<path d="${cloth}" fill="none" stroke="${P.ink}" stroke-width="3.2" stroke-linejoin="round"/>`;
  K.glow(`<circle cx="${f(sx)}" cy="${f(sy)}" r="18" fill="${VI.c}" opacity=".35" filter="url(#bloom)"/>`);
  // the pole (in front of the cloth), crossbar with knobs, spear tip
  const pole = (a, b, w) => line([a, b], P.ink, w + 4.5) + line([a, b], G[2], w) + line([[a[0] - w * 0.25, a[1]], [b[0] - w * 0.25, b[1]]], G[0], w * 0.35, ' opacity=".8"');
  s += pole([x, foot[1]], [x, yTop], 4.6);
  s += `<rect x="${f(x - 6)}" y="${f(foot[1] - 4)}" width="12" height="6" rx="1.5" fill="${G[3]}" stroke="${P.ink}" stroke-width="2.2"/>`;
  s += pole([x - 8, yBar], [x1 + 4, yBar], 3.6);
  for (const xx of [x - 9, x1 + 5]) s += `<circle cx="${f(xx)}" cy="${f(yBar)}" r="3.6" fill="${G[1]}" stroke="${P.ink}" stroke-width="2.2"/>`;
  s += `<rect x="${f(x - 5)}" y="${f(yBar - 3.5)}" width="10" height="7" rx="1.5" fill="${G[2]}" stroke="${P.ink}" stroke-width="2.2"/>`;
  s += `<polygon points="${pts([[x - 5, yTop + 1], [x, yTop - 15], [x + 5, yTop + 1]])}" fill="${G[1]}" stroke="${P.ink}" stroke-width="2.6" stroke-linejoin="round"/><polygon points="${pts([[x - 5, yTop + 1], [x, yTop - 15], [x, yTop + 1]])}" fill="${G[0]}"/>`;
  // clamps lashed to the pole
  for (const yy of [yBar + 30, yBar + 62]) s += `<rect x="${f(x - 4.5)}" y="${f(yy)}" width="9" height="4" fill="${G[3]}" stroke="${P.ink}" stroke-width="1.8"/>`;
  return s;
}
// The armoured cabin with its roof kit.
function cabin(K) {
  const { cu, cv, h, z0, z1, zt, ins } = CAB;
  const u0 = cu - h, u1 = cu + h, v0 = cv - h, v1 = cv + h;
  let s = '';
  s += banner(K);
  // R face (in shade): two riveted plates, a bolted hatch, a vent
  const Rf = [I(u1, v1, z1), I(u1, v0, z1), I(u1, v0, z0), I(u1, v1, z0)];
  s += poly(Rf, D[3], 3.6);
  s += K.armour([I(u1 + 0.5, v1, z1), I(u1 + 0.5, cv - 2, z1), I(u1 + 0.5, cv - 2, z0), I(u1 + 0.5, v1, z0)], PLATE.R[0], { edge: false, stroke: 2.8 });
  s += K.armour([I(u1 + 1, cv - 2, z1 - 2), I(u1 + 1, v0, z1 - 2), I(u1 + 1, v0, z0), I(u1 + 1, cv - 2, z0)], PLATE.R[2], { edge: false, stroke: 2.8 });
  const hc = I(u1 + 1.2, cv - 14, 266);
  s += `<g transform="${skew('R', hc)}"><circle r="9" fill="${G[3]}" stroke="${P.ink}" stroke-width="2.6"/><circle r="5" fill="none" stroke="${P.ink}" stroke-width="1.6" opacity=".7"/>` +
    [0, 1, 2, 3, 4, 5].map((k) => `<circle cx="${f(Math.cos(k * 1.047) * 7)}" cy="${f(Math.sin(k * 1.047) * 7)}" r="1.3" fill="${P.ink}"/>`).join('') + `<path d="M-6 -5 A8 8 0 0 1 3 -8" stroke="${G[1]}" stroke-width="1.5" fill="none"/></g>`;
  const vq = [I(u1 + 1.2, cv + 18, 294), I(u1 + 1.2, cv + 4, 294), I(u1 + 1.2, cv + 4, 284), I(u1 + 1.2, cv + 18, 284)];
  s += poly(vq, '#16171c', 2.2);
  for (let k = 1; k < 4; k++) s += line([lerpP(vq[0], vq[3], k / 4), lerpP(vq[1], vq[2], k / 4)], G[2], 1.6);
  s += K.hatch(dOf(Rf), { density: 0.55, len: [6, 12], w: 1.6 });
  // L face (lit): one heavy carbon plate with a seam, rivet rows
  const Lf = [I(u0, v1, z1), I(u1, v1, z1), I(u1, v1, z0), I(u0, v1, z0)];
  s += K.armour(Lf, [G[0], G[1], G[2]], { stroke: 3.6 });
  s += line([I(u0 + 1, v1 + 0.5, 278.5), I(u1 - 1, v1 + 0.5, 278.5)], P.ink, 2.2, ' opacity=".7"');
  // the emblem: a blue neon winged chevron
  const ep = I(cu - 1, v1 + 0.5, 261.5);
  const wing = 'M-3 -4 L-15 -9 L-12 -4 L-17 -3 L-11 1 L-14 3 L-6 3 Z M3 -4 L15 -9 L12 -4 L17 -3 L11 1 L14 3 L6 3 Z';
  const vee = 'M-7 -8 L0 6 L7 -8 M0 -10 V-2';
  s += `<g transform="${skew('L', ep)} scale(1.2)"><rect x="-19" y="-13" width="38" height="22" rx="4" fill="#1b1d26" opacity=".9" stroke="${P.ink}" stroke-width="2"/></g>`;
  K.glow(`<g transform="${skew('L', ep)} scale(1.2)"><ellipse cx="0" cy="-2" rx="20" ry="12" fill="${BL.c}" opacity=".5" filter="url(#bloom)"/>` +
    `<path d="${wing}" fill="${BL.c}" opacity=".9" stroke="${BL.c}" stroke-width="1.4" stroke-linejoin="round"/><path d="${wing}" fill="none" stroke="${BL.core}" stroke-width=".8" stroke-linejoin="round"/>` +
    `<path d="${vee}" fill="none" stroke="${BL.c}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="${vee}" fill="none" stroke="${BL.core}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></g>`);
  // the visor slot (two eyes peeking out) under a brim
  const sl = [I(u0 + 6, v1 + 0.5, 293), I(u1 - 10, v1 + 0.5, 293), I(u1 - 10, v1 + 0.5, 281), I(u0 + 6, v1 + 0.5, 281)];
  s += poly(sl, '#0d0e12', 3);
  s += poly([sl[0], sl[1], lerpP(sl[1], sl[2], 0.35), lerpP(sl[0], sl[3], 0.35)], P.ink, 0, ' opacity=".8"');
  const eye = I(cu - 6, v1 + 0.5, 285);
  K.glow(`<g transform="${skew('L', eye)}"><rect x="-14" y="-3" width="30" height="5" fill="${CY.c}" opacity=".25" filter="url(#bloom)"/><circle cx="-3" cy="0" r="1.6" fill="${CY.core}"/><circle cx="4" cy="0" r="1.6" fill="${CY.core}"/></g>`);
  const bz = 296, bo = 6;
  const brimT = [I(u0 + 3, v1, bz), I(u1 - 7, v1, bz), I(u1 - 7, v1 + bo, bz - 2), I(u0 + 3, v1 + bo, bz - 2)];
  s += poly([brimT[3], brimT[2], add(brimT[2], [0, 4]), add(brimT[3], [0, 4])], G[2], 2.6);
  s += poly([brimT[1], brimT[2], add(brimT[2], [0, 4]), add(brimT[1], [0, 4])], G[3], 2.4);
  s += poly(brimT, G[0], 2.8);
  s += K.rivets([lerpP(brimT[3], brimT[2], 0.1), lerpP(brimT[3], brimT[2], 0.9)], 1.4);
  // roof: chamfers and top
  s += poly([I(u0, v1, z1), I(u0, v0, z1), I(u1, v0, z1), I(u1, v1, z1)], G[3], 3);
  const cL = [I(u0 + ins, v1 - ins, zt), I(u1 - ins, v1 - ins, zt), I(u1, v1, z1), I(u0, v1, z1)];
  const cR = [I(u1 - ins, v1 - ins, zt), I(u1 - ins, v0 + ins, zt), I(u1, v0, z1), I(u1, v1, z1)];
  const tp = [I(u0 + ins, v0 + ins, zt), I(u1 - ins, v0 + ins, zt), I(u1 - ins, v1 - ins, zt), I(u0 + ins, v1 - ins, zt)];
  s += poly(cL, '#a3adbf', 3) + poly(cR, G[2], 3);
  s += K.rivetLine(...lerpP(cL[3], cL[0], 0.5), ...lerpP(cL[2], cL[1], 0.5), 6, 1.5);
  s += poly(tp, '#8f9aad', 3) + K.carbon(tp, { op: 0.16, scale: 5 });
  s += line([add(tp[3], [2, -1]), add(tp[0], [0, 2.5]), add(tp[1], [-2, 1])], T.rim, 1.6, ' opacity=".55"');
  // roof hatch
  const rh = I(cu + 8, cv - 10, zt);
  s += `<ellipse cx="${f(rh[0])}" cy="${f(rh[1])}" rx="8" ry="4" fill="${G[2]}" stroke="${P.ink}" stroke-width="2.2"/><path d="M${f(rh[0] - 4)} ${f(rh[1] - 1)} h8" stroke="${P.ink}" stroke-width="2.4"/>`;
  // antenna (back), megaphone on a post (left), the police light bar (front)
  const an = I(cu - 10, cv - 14, zt);
  s += mast(K, an[0], an[1] + 1, 38, RD);
  const mp = I(cu - 16, cv + 14, zt);
  s += K.pipe(`M${f(mp[0])} ${f(mp[1])} V${f(mp[1] - 16)}`, 3.4, G[2], G[0]);
  s += `<ellipse cx="${f(mp[0])}" cy="${f(mp[1])}" rx="5" ry="2.5" fill="${G[3]}" stroke="${P.ink}" stroke-width="2"/>`;
  const mh = [mp[0] + 2, mp[1] - 19], mdir = 196;
  s += K.megaphone(mh[0], mh[1], mdir, 1.05);
  s += `<rect x="${f(mh[0] - 4)}" y="${f(mh[1] - 3)}" width="8" height="5" fill="${G[3]}" stroke="${P.ink}" stroke-width="1.8" transform="rotate(${mdir - 180} ${f(mh[0])} ${f(mh[1])})"/>`;
  {
    const a = (mdir * Math.PI) / 180, L0 = 36;
    const mx = mh[0] + Math.cos(a) * L0, my = mh[1] + Math.sin(a) * L0;
    const Lb = 120, sp = 0.26, nx = -Math.sin(a), ny = Math.cos(a);
    const b1 = [mx + Math.cos(a - sp) * Lb, my + Math.sin(a - sp) * Lb], b2 = [mx + Math.cos(a + sp) * Lb, my + Math.sin(a + sp) * Lb];
    const gid = K.id('mb');
    K.def(`<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${f(mx)}" y1="${f(my)}" x2="${f(mx + Math.cos(a) * Lb)}" y2="${f(my + Math.sin(a) * Lb)}"><stop offset="0" stop-color="${BEAM.c}" stop-opacity=".75"/><stop offset=".5" stop-color="${BEAM.c}" stop-opacity=".25"/><stop offset="1" stop-color="${BEAM.c}" stop-opacity="0"/></linearGradient>`);
    K.glow(`<polygon points="${pts([[mx + nx * 11, my + ny * 11], b1, b2, [mx - nx * 11, my - ny * 11]])}" fill="url(#${gid})"/>` +
      `<ellipse cx="${f(mx)}" cy="${f(my)}" rx="5" ry="11" transform="rotate(${mdir} ${f(mx)} ${f(my)})" fill="${BEAM.core}" opacity=".9"/><circle cx="${f(mx)}" cy="${f(my)}" r="13" fill="${BEAM.c}" opacity=".6" filter="url(#bloom)"/>`);
  }
  // light bar: a dark slab with a blue and a red dome
  s += ibox(K, cu + 2, cv - 16, cu + 9, cv + 17, zt, zt + 4, [G[1], G[2], G[3], G[4]], { hatch: false, stroke: 2.4 }).s;
  for (const [dv, col, op] of [[-11, RD, 0.62], [12, BL, 0.72]]) {
    const p = I(cu + 5.5, cv + dv, zt + 4);
    s += `<path d="M${f(p[0] - 6.5)} ${f(p[1])} V${f(p[1] - 7)} A6.5 7 0 0 1 ${f(p[0] + 6.5)} ${f(p[1] - 7)} V${f(p[1])} A6.5 3.25 0 0 1 ${f(p[0] - 6.5)} ${f(p[1])} Z" fill="${col.deep}" stroke="${P.ink}" stroke-width="2.6"/>`;
    K.glow(`<circle cx="${f(p[0])}" cy="${f(p[1] - 6)}" r="19" fill="${col.c}" opacity="${op}" filter="url(#bloom)"/>` +
      `<path d="M${f(p[0] - 4.8)} ${f(p[1] - 1)} V${f(p[1] - 7)} A4.8 5.4 0 0 1 ${f(p[0] + 4.8)} ${f(p[1] - 7)} V${f(p[1] - 1)} Z" fill="${col.c}"/>` +
      `<ellipse cx="${f(p[0] - 1.4)}" cy="${f(p[1] - 7.5)}" rx="2.3" ry="3" fill="${col.core}"/>` +
      `<path d="M${f(p[0] - 18)} ${f(p[1] - 6)} H${f(p[0] + 18)} M${f(p[0])} ${f(p[1] - 17)} V${f(p[1] + 4)}" stroke="${col.core}" stroke-width="1.2" opacity=".7"/>`);
  }
  return s;
}

// ------------------------------------------------------------------ the tower
const garrison = {
  id: 'garrison', family: 'garrison', tier: 'I', order: 4, name: 'Garrison',
  role: 'Barracks: sends a squad of scrap troopers (and a scout drone) out of its gate to block the road and hold enemies in place.',
  weapon: 'Scrap troopers deployed through a jail-bar gate, rallied by a megaphone, a red / blue police light bar and a violet skull banner.',
  muzzle: I(-8, GH.v1 + 4, 0).map((v) => +v.toFixed(1)),
  build(K) {
    const shadow = K.shadow(CX + 8, GY, 124, 60, 160);
    const body = K.part('b-body', () => {
      let s = K.basePlate({ cx: CX, cy: GY, grate: false, hazard: false, led: CY, accent: RD });
      s += gatePaint(K);
      s += K.ao(CX + 6, B0 + 10, 112, 52, 0.5);
      // the core column (lower), ring beam, collar, core (upper), crown
      s += core(K, 0, 118,
        [[0, 44, [[0, 0.55, 'plate', 0], [0.55, 1, 'corr']]], [44, 88, [[0, 0.4, 'corr'], [0.4, 1, 'plate', 1]]], [88, 118, [[0, 0.46, 'plate', 2], [0.46, 1, 'rust']]]],
        [[0, 40, [[0, 0.5, 'corr'], [0.5, 1, 'plate', 0]]], [40, 84, [[0, 0.6, 'plate', 1], [0.6, 1, 'corr']]], [84, 118, [[0, 0.42, 'corr'], [0.42, 1, 'plate', 2]]]]);
      s += spk(K, FP('L', SC, 0.2, 104, 1.5), 152, 18, 8) + spk(K, FP('L', SC, 0.62, 100, 1.5), 146, 18, 8);
      s += overhangShadow(K, SC, 108, 10, 0.5);
      s += ringBeam(K, 116);
      s += collar(K);
      s += overhangShadow(K, SC, 204, 14, 0.6);
      s += core(K, 164, 206, [[164, 206, [[0, 0.45, 'corr'], [0.45, 1, 'plate', 0]]]], [[164, 206, [[0, 0.55, 'plate', 1], [0.55, 1, 'corr']]]]);
      for (const [t, a] of [[0.14, 156], [0.5, 150], [0.84, 140]]) s += spk(K, FP('L', COL.h, t, 128, 1.5), a + K.rand(-4, 4), 20, 9);
      s += spk(K, FP('R', COL.h, 0.04, 126, 1.5), 60, 18, 9) + spk(K, FP('R', COL.h, 0.97, 134, 1.5), 12, 22, 10);
      s += crownBody(K);
      s += crownSpikes(K);
      s += backWalls(K);
      // the cabin's riser (mostly hidden by the parapet) and the near parapet walls
      s += ibox(K, CAB.cu - CAB.h, CAB.cv - CAB.h, CAB.cu + CAB.h, CAB.cv + CAB.h, DZ - 1, CAB.z0, [D[1], D[2], D[3], D[4]], { hatch: false, stroke: 3 }).s;
      s += frontWalls(K);
      // the foot: shack, chimney, gatehouse, corner foot
      s += shack(K);
      s += chimney(K);
      s += gatehouse(K);
      s += gateSpikes(K);
      s += cornerFoot(K);
      return s;
    });
    const props = K.part('b-props', () => {
      let s = '';
      // signs on the shaded faces
      s += paintedSign(K) + placard(K);
      // floodlights: one on the collar's left corner, one under its front corner
      const lc = I(-COL.h, COL.h, 148);
      s += arm([lc[0] + 2, lc[1]], [lc[0] - 14, lc[1] - 3]);
      s += flood(K, lc[0] - 18, lc[1] - 4, 152, 9, { op: 0.5 });
      const fc = I(COL.h, COL.h, 122);
      s += arm([fc[0], fc[1] - 2], [fc[0] - 6, fc[1] + 8]);
      s += flood(K, fc[0] - 9, fc[1] + 11, 128, 8.5, { op: 0.32, L: 120 });
      // cables: feed to the left floodlight, a bundle across the shaded side
      s += K.cables(lc[0] - 4, I(-CRN.h, CRN.h, 206)[1] + 4, lc[0] - 16, lc[1] - 6, 10, ['#3b6fd8', '#8a4fd8']);
      { const a = FP('R', CRN.h, 0.55, 204, 1), b = I(80, -12, 176); s += K.cables(a[0], a[1], b[0] - 4, b[1], 14, ['#8a4fd8', '#3b6fd8', '#2b2830']); }
      // the drone hovering at the left
      s += K.drone(102, 214, CY, 0.92);
      s += K.leds([[102, 207]], RD, 1.5);
      // a broken plank leaning on the gatehouse's left corner
      s += `<polygon points="138,431 148,433 160,370 151,367" fill="${WOOD[1]}" stroke="${P.ink}" stroke-width="2.8" stroke-linejoin="round"/>` +
        `<polygon points="151,367 160,370 157,382 154,376" fill="${WOOD[3]}"/><path d="M142 428 L154 371" stroke="${WOOD[0]}" stroke-width="1.4" opacity=".8"/>` + K.rivets([[149, 404], [151, 392]], 1.3);
      // olive drums and the tools
      s += drum(K, 360, 432, 12);
      s += `<rect x="353" y="414" width="11" height="9" fill="${P.hazard[0]}" stroke="${P.ink}" stroke-width="1.6" transform="rotate(-3 358 418)"/><path d="M355.5 421 l3 -5 l3 5 Z" fill="${P.ink}"/>`;
      s += drum(K, 338, 448, 12.5, ['#a1a07a', '#7f8158', '#5c5f3e', '#3c3f28']);
      s += tools(K);
      return s;
    });
    const piv = I(CAB.cu, CAB.cv, DZ);
    const head = K.part('head', () => cabin(K), piv);
    return K.doc(`<g id="base">${body}${props}</g>` + head, { title: 'Garrison', shadow });
  },
};

export default [garrison];

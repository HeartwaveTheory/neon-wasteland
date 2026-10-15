// PLASMA: chain lightning that ignores armour and hits air (Kingdom Rush's
// mage / tesla line). Signature: cyan + violet electricity.
//
// From the reference (ref/plasma.png), redrawn in our ink / cel / hatching style:
//   - a reactor of stacked dark-steel drums on the shared octagonal plate
//   - a spiral skirt of ribbed blue-steel fins (a helical staircase of blades)
//     wrapping the middle, with blue / violet neon cables under and over it
//   - a side emitter lens on the upper drum spitting a cyan arc
//   - the crown (head layer): a flared crown ring with a cyan neon strip and
//     cable loops (two of them live plasma lines) hanging under it, wedge
//     buttresses on its deck, four tall leaning canisters on bracket arms (cyan
//     on the left, violet on the right) with plasma filaments, a stepped hub, a
//     spindle wound with three copper coil rings round a white-hot core, and the
//     big steel torus on a flared neck (copper wraps, a glowing hole with a cone)
//     as the top silhouette; three holographic rings orbit the spindle and arcs
//     jump core -> canisters, canister -> canister and off the torus
//   - at the foot: a hanging holo sign, twin violet gas tanks, a terminal box
//     with a cyan screen, a green gas tank with a copper pipe, a warning sign
//     and a graffiti tag
//
// Layering: the base is split into three sub-parts inside <g id="base"> so the
// neon under the skirt stays under the fins (each K.part draws its glow on top
// of its own solids): b-low (plate, drums, cable band), b-skirt (fins, upper
// drum, collar, spike rod) and b-props (the props in front). The head is split
// the same way inside <g id="head" data-pivot>: h-back (ring, deck, back
// buttresses + canisters, cable loops, far halves of the holo rings), h-mid
// (hub, coils, spindle, far half of the torus) and h-front (near torus half,
// front buttresses + canisters, near holo halves, arcs).
import { T, CX, GY, P, f } from '../tkit.mjs';

const pts = (a) => a.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
const lerp = (a, b, t) => a + (b - a) * t;
const Q = 0.5; // ellipse ratio of the view (ry = rx * Q), same as the plate
const ep = (cx, y, r, a) => [cx + Math.cos(a) * r, y + Math.sin(a) * r * Q];
const arcP = (cx, y, r, a0, a1, n = 8) => { const o = []; for (let i = 0; i <= n; i++) o.push(ep(cx, y, r, lerp(a0, a1, i / n))); return o; };
const poly = (p, fill, sw = 0, extra = '') => `<polygon points="${pts(p)}" fill="${fill}"${sw ? ` stroke="${P.ink}" stroke-width="${sw}" stroke-linejoin="round"` : ''}${extra}/>`;
const line = (p, col, w, extra = '') => `<polyline points="${pts(p)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;

// Palettes (light -> dark)
const STEEL = [T.gun[0], T.gun[1], T.gun[2], T.gun[3], T.gun[4]];
const FIN = ['#9fb4e6', '#6d81b8', '#4b5a8c', '#323d63', '#1f2640'];   // blue-tinted fin steel
const COPPER = ['#ffb27a', '#d9773f', '#9c4c1f', '#5f2a0d'];
const TANKG = ['#8fb27f', '#5f8456', '#3f5e3c', '#273d27'];            // green-painted gas tank
const SIGNY = ['#ffd84a', '#d9a514', '#8f6a0a'];
const RUBBER = '#26232c';
const CY = T.cyan, VI = T.violet, BL = T.blue;

// ------------------------------------------------------------------ helpers
// Front half of a cylinder side between two heights.
function band(cx, yTop, yBot, rx) {
  const ry = rx * Q;
  return `M${f(cx - rx)} ${f(yTop)} A${f(rx)} ${f(ry)} 0 0 0 ${f(cx + rx)} ${f(yTop)} L${f(cx + rx)} ${f(yBot)} A${f(rx)} ${f(ry)} 0 0 1 ${f(cx - rx)} ${f(yBot)} Z`;
}
// Riveted panel cladding round the front of a cylinder: lit left, dark right.
function staves(K, { cx, yTop, yBot, r, n = 8, tones = STEEL, rivets = true, stroke = 2.4, from = Math.PI, to = 0 }) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a0 = lerp(from, to, i / n) - 0.012, a1 = lerp(from, to, (i + 1) / n) + 0.012;
    const top = arcP(cx, yTop, r, a0, a1, 5), bot = arcP(cx, yBot, r, a1, a0, 5);
    const u = Math.cos((a0 + a1) / 2);
    const b = -u * 0.95 + K.rand(-0.12, 0.12);
    const tone = b > 0.5 ? tones[0] : b > -0.05 ? tones[1] : b > -0.6 ? tones[2] : tones[3];
    s += poly([...top, ...bot], tone, stroke);
    if (b > 0.25) s += line(arcP(cx - 1, yTop + 3, r - 2, a0 - 0.01, a1 + 0.01, 4), T.rim, 1.8, ' opacity=".5"');
    if (rivets) {
      const am = (a0 + a1) / 2;
      const [x, y1] = ep(cx, yTop, r, am), [, y2] = ep(cx, yBot, r, am);
      s += K.rivets([[x, y1 + 5], [x, y2 - 5]], 1.9);
    }
  }
  return s;
}
// Ring band (a hoop) round the front of a cylinder.
function hoopF(cx, y, rx, w, tone) {
  return `<path d="${band(cx, y - w / 2, y + w / 2, rx)}" fill="${tone}" stroke="${P.ink}" stroke-width="2.6" stroke-linejoin="round"/>`;
}
// A torus drawn as a shaded stroked ellipse (front half / back half / whole).
// part: 'all' | 'back' | 'front'. tones: [hi, mid, lo, deep].
function torus(cx, cy, R, r, tones, part = 'all', q = Q) {
  const rx = R, ry = R * q;
  let d;
  if (part === 'all') d = `M${f(cx - rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)}`;
  else if (part === 'front') d = `M${f(cx - rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 0 0 ${f(cx + rx)} ${f(cy)}`;
  else d = `M${f(cx - rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 0 1 ${f(cx + rx)} ${f(cy)}`;
  const cap = part === 'all' ? 'round' : 'butt';
  const st = (col, w, dy = 0, extra = '') => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${f(w)}" stroke-linecap="${cap}"${dy ? ` transform="translate(0 ${f(dy)})"` : ''}${extra}/>`;
  return st(P.ink, r * 2 + 6) + st(tones[2], r * 2) + st(tones[1], r * 1.15, -r * 0.4) + st(tones[0], r * 0.42, -r * 0.62, ' opacity=".9"');
}
// Run fn() (which may push glow) and wrap both its solids and its glow in a
// rotation about (ox, oy): for leaning canisters whose glow must lean too.
function tilted(K, deg, ox, oy, fn) {
  const saved = K.glows; K.glows = [];
  const solid = fn();
  const g = K.glows.join(''); K.glows = saved;
  const tr = `rotate(${f(deg)} ${f(ox)} ${f(oy)})`;
  if (g) K.glow(`<g transform="${tr}">${g}</g>`);
  return `<g transform="${tr}">${solid}</g>`;
}
// Saturated plasma fill + a writhing filament inside a K.canister's glass (the
// kit's glass is a pale core-to-colour gradient that greys out under the paint
// filter; this keeps the crown canisters reading cyan / violet at game scale).
function plasmaGlass(K, x, yBot, r, h, col) {
  const gy = yBot - 8, x0 = x - r + 3, w = (r - 3) * 2;
  let fil = `M${f(x)} ${f(gy - 2)}`;
  for (let i = 1; i <= 5; i++) fil += ` L${f(x + (i % 2 ? 1 : -1) * K.rand(2, r - 4))} ${f(gy - 2 - (h - 4) * i / 5)}`;
  K.glow(`<rect x="${f(x0)}" y="${f(gy - h)}" width="${f(w)}" height="${f(h)}" fill="${col.c}" opacity=".55"/>` +
    `<path d="${fil}" fill="none" stroke="${col.core}" stroke-width="1.8" stroke-linejoin="round" opacity=".95"/>` +
    `<ellipse cx="${f(x)}" cy="${f(gy - h / 2)}" rx="${f(r * 2.2)}" ry="${f(h * 0.75)}" fill="${col.c}" opacity=".35" filter="url(#bloom)"/>`);
  return '';
}
// Half of a holographic ring (glow only): 'back' = the far (upper) arc, drawn in
// a part behind the spindle; 'front' = the near arc, drawn in front of it.
function holoArc(K, cx, cy, rx, ry, col, half, { w = 2.2, dash = '14 6 3 6', rot = -6, op = 1 } = {}) {
  const d = `M${f(cx - rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 0 ${half === 'back' ? 1 : 0} ${f(cx + rx)} ${f(cy)}`;
  K.glow(`<g transform="rotate(${f(rot)} ${f(cx)} ${f(cy)})" opacity="${op}">` +
    `<path d="${d}" fill="none" stroke="${col.c}" stroke-width="${f(w * 3.6)}" opacity=".4" filter="url(#bloom)"/>` +
    `<path d="${d}" fill="none" stroke="${col.c}" stroke-width="${f(w)}" stroke-dasharray="${dash}"/>` +
    `<path d="${d}" fill="none" stroke="${col.core}" stroke-width="${f(w * 0.4)}" stroke-dasharray="${dash}"/></g>`);
  return '';
}
// A wedge buttress standing on a ring deck at angle a, leaning on the hub:
// tall at the inner radius ri, low at the outer ro. Only faces turned to the
// viewer are drawn; tones by how much each face turns to the upper-left light.
function buttress(K, cx, y, a, ri, ro, hI, hO, w, tones = STEEL) {
  const da = w / 2 / ro, di = w / 2 / ri;
  const pt = (r, aa, h) => { const [x, yy] = ep(cx, y, r, aa); return [x, yy - h]; };
  const i0 = pt(ri, a - di, 0), i1 = pt(ri, a + di, 0), o0 = pt(ro, a - da, 0), o1 = pt(ro, a + da, 0);
  const I0 = pt(ri, a - di, hI), I1 = pt(ri, a + di, hI), O0 = pt(ro, a - da, hO), O1 = pt(ro, a + da, hO);
  const tone = (nx) => (nx < -0.4 ? tones[0] : nx < 0.3 ? tones[1] : tones[2]);
  let s = '';
  const c = Math.cos(a), sn = Math.sin(a);
  if (c < 0) s += poly([i0, o0, O0, I0], tone(sn), 2.6);          // side at a - da (normal ~ (sin a, -cos a))
  if (c > 0) s += poly([i1, o1, O1, I1], tone(-sn), 2.6);         // side at a + da
  if (sn > 0) s += poly([o0, o1, O1, O0], tone(c), 2.6);          // outer face
  if (sn < 0) s += poly([i0, i1, I1, I0], tones[2], 2.6);         // inner face (back ones)
  s += poly([I0, O0, O1, I1], c < 0.2 ? tones[0] : tones[1], 2.6); // sloping top
  s += line([[I0[0] + 1, I0[1] + 2], [O0[0] + 1, O0[1] + 2]], T.rim, 1.6, ' opacity=".55"');
  if (sn > 0) s += K.rivets([[lerp(o0[0], O1[0], 0.5), lerp(o0[1], O1[1], 0.5) + 1]], 1.8);
  return s;
}

// The spiral skirt: a helical staircase of fin blades round the axis. Angles
// decrease from a0 (start, lowest) to a1 (end, highest); pi = left, pi/2 = front.
// Returns { back, front } svg strings (draw back, then the core, then front).
function skirt(K, { cx, y0, rate, a0, a1, ri, ro, droop, th, step, gap, skew, tones = FIN }) {
  const items = [];
  const n = Math.floor((a0 - a1) / step + 1e-6);
  for (let i = 0; i < n; i++) {
    const A = a0 - i * step - gap / 2, B = a0 - (i + 1) * step + gap / 2;
    const am = (A + B) / 2;
    const yc = y0 - rate * (a0 - am);
    const Pi = (a) => ep(cx, yc, ri, a);
    const Po = (a) => { const [x, y] = ep(cx, yc, ro, a + skew); return [x, y + droop]; };
    const dn = ([x, y]) => [x, y + th];
    const N = 4;
    const inner = [], outer = [];
    for (let q = 0; q <= N; q++) { inner.push(Pi(lerp(A, B, q / N))); outer.push(Po(lerp(A, B, q / N))); }
    const sA = Math.sin(am + skew * 0.5), cA = Math.cos(am + skew * 0.5);
    const front = sA > 0;
    let s = '';
    // end faces (the slab's ends): high-angle end faces +theta, visible on the right half
    if (Math.cos(A) > 0.05) s += poly([Pi(A), Po(A), dn(Po(A)), dn(Pi(A))], tones[4], 2.4);
    if (Math.cos(B) < -0.05) s += poly([Pi(B), Po(B), dn(Po(B)), dn(Pi(B))], tones[3], 2.4);
    // outer rim face (front fins only)
    if (front) {
      const rim = [...outer, ...outer.slice().reverse().map(dn)];
      const rt = cA < -0.35 ? tones[2] : cA < 0.3 ? tones[3] : tones[4];
      s += poly(rim, rt, 2.4);
    }
    // top face: light from the upper-left (back-left faces brightest)
    const b = -(cA + 0.6 * sA) + K.rand(-0.15, 0.15);
    const tone = b > 0.55 ? tones[0] : b > -0.15 ? tones[1] : b > -0.8 ? tones[2] : tones[3];
    const top = [...inner, ...outer.slice().reverse()];
    s += poly(top, tone, 2.6);
    // raised rib down the blade, lit edge on the leading (left) side
    const ribA = lerp(A, B, 0.5);
    const r0 = Pi(ribA), r1 = Po(ribA);
    s += line([r0, r1], P.ink, 4.2) + line([[r0[0] - 0.8, r0[1] - 1], [r1[0] - 0.8, r1[1] - 1]], b > 0 ? tones[0] : tones[1], 1.8);
    if (b > -0.4) s += line([[Pi(A)[0] + 1, Pi(A)[1] + 1.5], [Po(A)[0] + 1, Po(A)[1] + 1.5]], T.rim, 1.5, ' opacity=".45"');
    // a small bolted plate near the outer end
    if (i % 2 === 0) {
      const c = [lerp(r0[0], r1[0], 0.72), lerp(r0[1], r1[1], 0.72)];
      s += `<rect x="${f(c[0] - 4)}" y="${f(c[1] - 3)}" width="8" height="6" rx="1" fill="${tones[2]}" stroke="${P.ink}" stroke-width="1.8" transform="rotate(${f((am * 180) / Math.PI - 90)} ${f(c[0])} ${f(c[1])})"/>`;
    }
    const rm = (ri + ro) / 2;
    items.push({ key: 0.87 * rm * Math.sin(am) + 0.6 * (y0 - yc), back: Math.sin(am) < 0, s });
  }
  items.sort((p, q) => p.key - q.key);
  return { back: items.filter((o) => o.back).map((o) => o.s).join(''), front: items.filter((o) => !o.back).map((o) => o.s).join('') };
}
// A point on the skirt helix (for cables lying on / hanging under it).
function helixPt(o, a, r, dy = 0) {
  const yc = o.y0 - o.rate * (o.a0 - a);
  const t = (r - o.ri) / (o.ro - o.ri);
  const [x, y] = ep(o.cx, yc, r, a + o.skew * t);
  return [x, y + o.droop * t + dy];
}
// Smooth path through points (quadratic midpoints).
function smooth(p) {
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 1; i < p.length - 1; i++) {
    const mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2;
    d += ` Q${f(p[i][0])} ${f(p[i][1])} ${f(mx)} ${f(my)}`;
  }
  const l = p[p.length - 1];
  return d + ` L${f(l[0])} ${f(l[1])}`;
}
// Thin neon cable (a smaller kit neon) along a path.
const neonCable = (K, d, col, w = 2.6) => K.neon(d, col, w);

// Glass gas tank on a steel foot, with a painted mark (violet = plasma gas).
function gasTank(K, x, yBot, r, h, col) {
  let s = K.canister(x, yBot, r, h, col);
  // steel straps over the glass
  const gy = yBot - 8;
  s += hoopF(x, gy - h * 0.62, r, 3, STEEL[3]);
  return s;
}
// Cross-section helper: a hanging sign board with a holo face.
function hangSign(K, x, y, w, h) {
  let s = `<rect x="${f(x - 3)}" y="${f(y - 3)}" width="${f(w + 6)}" height="${f(h + 6)}" rx="2" fill="${STEEL[3]}" stroke="${P.ink}" stroke-width="3"/>`;
  s += K.holo(x, y, w, h, CY, 'none');
  let tl = '';
  for (let i = 0; i < 4; i++) { const yy = y + 5 + i * (h - 8) / 4; tl += `<path d="M${f(x + 4)} ${f(yy)} h${f(K.rand(w * 0.35, w * 0.8))}" stroke="${CY.core}" stroke-width="2" stroke-linecap="round"/>`; }
  K.glow(tl);
  return s;
}

// ------------------------------------------------------------------ the tower
const plasma = {
  id: 'plasma', family: 'plasma', tier: 'I', order: 1, name: 'Plasma',
  role: 'Chain lightning that jumps between enemies, ignores armour and hits air.',
  weapon: 'A Tesla crown: a copper-coiled spindle and torus fed by glowing plasma canisters, arcing to targets.',
  muzzle: [256, 44],
  build(K) {
    const cx = CX;
    const shadow = K.shadow(cx, GY, 124, 62, 150);

    // geometry
    const A = { y: 402, h: 66, r: 74 };            // lower reactor drum
    const B = { y: A.y - A.h, h: 38, r: 62 };      // the screen tier
    const Cc = { y: B.y - B.h, top: 160, r: 40 };  // the upper drum (core) up to the collar
    const COL = { y: 160, h: 10, r: 54 };          // collar the crown sits on
    const SK = { cx, y0: 290, rate: 13.5, a0: Math.PI + 0.35, a1: -Math.PI - 0.5, ri: Cc.r - 2, ro: 106, droop: 13, th: 8, step: 0.36, gap: 0.05, skew: 0.12 };

    // ---------------- b-low: plate, back props, the lower drums, the cable band
    const low = K.part('b-low', () => {
      let s = '';
      s += K.basePlate({ led: CY, accent: VI });
      // back-left: pipe elbow into the drum, a junction box
      s += K.box({ x: cx - 116, y: 392, w: 26, h: 22, d: 18, tones: STEEL.slice(1) });
      s += K.pipe(`M${cx - 98} 378 Q${cx - 84} 370 ${cx - 72} 372`, 7, STEEL[2], STEEL[0]);
      // back-right: green gas tank with a copper pipe into the drum
      s += K.cyl({ cx: cx + 96, y: 392, rx: 22, ry: 11, h: 56, tones: TANKG, top: 'rim' });
      s += hoopF(cx + 96, 352, 22, 5, STEEL[3]) + hoopF(cx + 96, 382, 22, 5, STEEL[3]);
      s += K.pipe(`M${cx + 96} 334 V${326} Q${cx + 96} 318 ${cx + 86} 318 H${cx + 66}`, 6, COPPER[1], COPPER[0]);
      s += `<circle cx="${cx + 96}" cy="331" r="6" fill="${COPPER[2]}" stroke="${P.ink}" stroke-width="2.4"/>`;
      s += K.leds([[cx + 106, 364]], T.green, 2.4);
      // lower reactor drum: plinth ring, cladding, hoops
      s += K.cyl({ cx, y: A.y + 4, rx: A.r + 6, ry: (A.r + 6) * Q, h: 12, tones: STEEL.slice(1), top: 'flat', hatch: false });
      s += K.cyl({ cx, y: A.y - 6, rx: A.r, ry: A.r * Q, h: A.h - 6, tones: STEEL.slice(1), top: 'none' });
      s += staves(K, { cx, yTop: A.y - A.h + 6, yBot: A.y - 10, r: A.r, n: 9, tones: STEEL.slice(1) });
      s += hoopF(cx, A.y - A.h + 6, A.r + 1, 7, STEEL[3]);
      s += K.hatch(band(cx, A.y - A.h, A.y, A.r), { density: 0.55, bbox: [cx + A.r * 0.45, A.y - A.h, cx + A.r, A.y + A.r * Q] });
      // ledge (top of the lower drum)
      s += `<ellipse cx="${cx}" cy="${A.y - A.h}" rx="${A.r}" ry="${A.r * Q}" fill="${STEEL[1]}" stroke="${P.ink}" stroke-width="3.5"/>`;
      s += `<ellipse cx="${cx - 3}" cy="${A.y - A.h - 2}" rx="${A.r - 8}" ry="${(A.r - 8) * Q}" fill="${STEEL[0]}" opacity=".35"/>`;
      // warning sign (hand-painted humour) and a graffiti tag
      s += `<g transform="rotate(-4 ${cx - 40} ${A.y - 34})">` +
        `<rect x="${cx - 60}" y="${A.y - 46}" width="40" height="26" rx="2" fill="${SIGNY[0]}" stroke="${P.ink}" stroke-width="3"/>` +
        `<rect x="${cx - 57}" y="${A.y - 43}" width="34" height="5" fill="${P.ink}"/>` +
        `<path d="M${cx - 38} ${A.y - 36} l-6 8 h5 l-4 7 l9 -10 h-5 l4 -5 Z" fill="${P.ink}"/></g>`;
      s += K.text('NO HUGS', cx - 40, A.y - 23, { size: 6, color: P.ink, rot: -4 }).replace(/stroke-width="[^"]*"/, 'stroke-width="0"');
      s += K.graffiti(cx - 30, A.y - 6, 'ZAP!', '#9dff3a', { size: 15, rot: -8 });
      // the screen tier
      s += K.cyl({ cx, y: B.y, rx: B.r, ry: B.r * Q, h: B.h, tones: STEEL.slice(1), top: 'none' });
      s += staves(K, { cx, yTop: B.y - B.h, yBot: B.y - 2, r: B.r, n: 7, tones: STEEL.slice(1), rivets: false });
      s += hoopF(cx, B.y - 3, B.r + 1, 6, STEEL[3]);
      s += K.holo(cx + 16, B.y - 30, 34, 16, CY, 'bars');
      s += K.text('kV', cx + 33, B.y - 18, { size: 9, glowCol: CY });
      // core cylinder base (so the gap under the skirt reads as the core)
      s += `<ellipse cx="${cx}" cy="${B.y - B.h}" rx="${B.r}" ry="${B.r * Q}" fill="${STEEL[2]}" stroke="${P.ink}" stroke-width="3"/>`;
      s += K.cyl({ cx, y: B.y - B.h + 2, rx: Cc.r + 4, ry: (Cc.r + 4) * Q, h: 16, tones: STEEL.slice(1), top: 'none', hatch: false });
      // the glowing cable band round the top of the tier, under the skirt
      const cols = [BL, VI, CY, VI];
      cols.forEach((c, k) => {
        const p = [];
        for (let q = 0; q <= 14; q++) {
          const a = lerp(Math.PI + 0.1, -0.1, q / 14);
          const [x, y] = ep(cx, B.y - B.h - 2 + k * 3.2, Cc.r + 10 + k * 2, a);
          p.push([x, y + Math.sin(q * 1.7 + k) * 1.6]);
        }
        s += neonCable(K, smooth(p), c, 2.6);
      });
      return s;
    });

    // ---------------- b-skirt: spiral fins, the upper drum, collar, cables
    const sk = K.part('b-skirt', () => {
      let s = '';
      const fins = skirt(K, SK);
      s += fins.back;
      // the upper drum (core)
      s += K.cyl({ cx, y: Cc.y - 8, rx: Cc.r, ry: Cc.r * Q, h: Cc.y - 8 - Cc.top, tones: STEEL.slice(1), top: 'none' });
      s += staves(K, { cx, yTop: Cc.top + 6, yBot: 212, r: Cc.r, n: 5, tones: STEEL.slice(1) });
      s += staves(K, { cx, yTop: 212, yBot: 262, r: Cc.r, n: 5, tones: STEEL.slice(1) });
      s += hoopF(cx, 212, Cc.r + 1, 7, STEEL[3]);
      // small green status screen, front-right
      s += K.holo(cx + 12, 238, 14, 12, T.green, 'bars');
      // thick hose from under the crown down the right side into the skirt
      s += K.pipe(`M${cx + 30} 196 C${cx + 56} 212 ${cx + 52} 236 ${cx + 40} 252`, 7, RUBBER, '#55506a');
      for (const t of [0.25, 0.5, 0.75]) {
        const x = lerp(cx + 30, cx + 40, t) + Math.sin(t * Math.PI) * 14, y = lerp(196, 252, t);
        s += `<path d="M${f(x - 5)} ${f(y - 2)} l10 3" stroke="${P.ink}" stroke-width="1.6" opacity=".7"/>`;
      }
      s += fins.front;
      // neon cables lying on the fins (front pass and the top end)
      for (const [r, c, dy] of [[62, VI, -2], [82, BL, -1], [97, CY, 2]]) {
        const p = [];
        for (let q = 0; q <= 26; q++) p.push(helixPt(SK, lerp(SK.a0 - 0.45, -0.1, q / 26), r, dy));
        s += neonCable(K, smooth(p), c, r === 97 ? 2.2 : 2.8);
        const p2 = [];
        for (let q = 0; q <= 8; q++) p2.push(helixPt(SK, lerp(-Math.PI + 0.02, SK.a1 + 0.12, q / 8), r - 4, dy));
        s += neonCable(K, smooth(p2), c, 2.4);
      }
      // the emitter lens on the front of the upper drum, spitting an arc
      s += K.cyl({ cx: cx - 8, y: 250, rx: 14, ry: 7, h: 6, tones: STEEL.slice(1), top: 'none', hatch: false });
      s += K.barrel({ x1: cx - 2, y1: 234, x2: cx - 18, y2: 244, r: 11, tones: STEEL.slice(1), muzzle: 'lens', color: CY, rings: 1, ringTone: COPPER[1] });
      K.bolt(cx - 22, 246, cx - 86, 280, CY, { jag: 9, seg: 6, w: 3, fork: true });
      // collar ring (the crown's mount; mostly hidden under the head)
      s += K.cyl({ cx, y: COL.y, rx: COL.r, ry: COL.r * Q, h: COL.h, tones: STEEL.slice(1), top: 'flat', hatch: false });
      // the spike rod on the right, under the crown, with cables draped over it
      s += K.pipe(`M${cx + 36} 214 L${cx + 102} 220`, 5, T.rust[1], T.rust[0]);
      s += K.spike(cx + 102, 220, 20, 5, 11);
      s += K.cable(cx + 52, 216, cx + 80, 219, 22, 3.4, '#8a4fd8') + K.cable(cx + 60, 216, cx + 94, 220, 13, 3, '#3b6fd8') + K.cable(cx + 74, 218, cx + 98, 220, 26, 2.8, '#c04fd8');
      return s;
    });

    // ---------------- b-props: the foot props in front of the drum
    const props = K.part('b-props', () => {
      let s = '';
      // hanging holo sign on a post (left)
      s += K.post(cx - 104, 318, 414, 9, STEEL.slice(1));
      s += K.beam(cx - 104, 322, cx - 140, 322, 7, STEEL.slice(1));
      s += K.beam(cx - 104, 340, cx - 124, 323, 5, STEEL.slice(1));
      s += `<path d="M${cx - 136} 325 v8 M${cx - 116} 325 v8" stroke="${P.ink}" stroke-width="2.4"/>`;
      s += hangSign(K, cx - 142, 334, 30, 34);
      // cables from the drum to the gas tanks
      s += K.cable(cx - 20, 344, cx - 12, 420, 6, 4.5, '#7b3fa8');
      s += K.cable(cx - 2, 344, cx + 4, 418, 4, 3.6, RUBBER);
      // twin violet gas tanks, front centre
      s += gasTank(K, cx - 16, 462, 11, 30, VI);
      s += gasTank(K, cx + 12, 468, 11, 30, VI);
      s += K.cable(cx - 16, 416, cx + 12, 422, -14, 3.4, '#7b3fa8');
      // terminal box (front right) with a cyan screen and pipes into the drum
      s += K.pipe(`M${cx + 50} 412 V398 Q${cx + 50} 392 ${cx + 44} 392`, 6, STEEL[2], STEEL[0]);
      s += K.pipe(`M${cx + 64} 410 V392`, 6, STEEL[2], STEEL[0]);
      s += K.box({ x: cx + 38, y: 458, w: 42, h: 44, d: 26, tones: STEEL.slice(1) });
      s += K.holo(cx + 44, 420, 30, 16, CY, 'bars');
      s += `<path d="M${cx + 59} 440 V456" stroke="${P.ink}" stroke-width="2"/>`;
      s += K.rivets([[cx + 42, 418], [cx + 76, 418], [cx + 42, 454], [cx + 76, 454]], 1.6);
      s += K.leds([[cx + 66, 446], [cx + 72, 446]], VI, 1.8);
      return s;
    });

    const base = `<g id="base">${low}${sk}${props}</g>`;

    // ---------------- head: the Tesla crown. Three sub-parts inside <g id="head">
    // so the far halves of the holo rings and coils pass BEHIND the spindle:
    // h-back (ring, deck, back buttresses + canisters, cable loops), h-mid (hub,
    // spindle, copper coils, torus), h-front (front buttresses + canisters, arcs).
    const RG = { lip: 178, lipR: 68, yb: 170, yt: 148, r: 63 };  // the crown ring
    const piv = [cx, 160];
    const CANS = [[2.72, CY], [-2.12, CY], [-0.8, VI], [0.36, VI]];
    const BUTS = [-1.5, -0.2, 1.22, 2.08, 3.5];
    const TOR = { y: 51, R: 29, r: 6.5, q: 0.6 };                 // the torus
    const COILS = [[111, 23], [99, 20], [87, 17]];                  // copper coil rings (y, R)
    const HOLO = [
      { y: 94, rx: 100, ry: 22, col: CY, w: 3, dash: '24 5 6 5 2 5', rot: -6 },
      { y: 76, rx: 64, ry: 14, col: CY, w: 2, dash: '9 5', rot: -3 },
      { y: 110, rx: 82, ry: 18, col: VI, w: 1.8, dash: '3 6', rot: -9 },
    ];
    const TORT = ['#d3dbe6', '#a1abbd', '#6f798c', '#464d5b'];      // bright torus steel
    const canPos = (a) => ep(cx, RG.yt + 6, 66, a);
    const canAt = (a, col) => {
      const [bx, by] = ep(cx, RG.yt + 2, 46, a);
      const [x, y] = canPos(a);
      let c = K.beam(bx, by, x, y - 2, 10, STEEL.slice(1));                 // bracket arm
      c += tilted(K, Math.cos(a) * 9, x, y + 2, () => K.canister(x, y + 2, 10, 32, col) + hoopF(x, y - 24, 10, 3, STEEL[3]) + plasmaGlass(K, x, y + 2, 10, 32, col));
      return c;
    };

    const hBack = K.part('h-back', () => {
      let s = '';
      // flared lip, ring body, neon strip, front screen
      s += K.cyl({ cx, y: RG.lip, rx: RG.lipR, ry: RG.lipR * Q, h: RG.lip - RG.yb, tones: STEEL.slice(1), top: 'flat', topTone: STEEL[2], hatch: false });
      s += K.cyl({ cx, y: RG.yb, rx: RG.r, ry: RG.r * Q, h: RG.yb - RG.yt, tones: STEEL.slice(1), top: 'none', hatch: false });
      s += staves(K, { cx, yTop: RG.yt + 2, yBot: RG.yb - 1, r: RG.r, n: 10, tones: STEEL.slice(1), rivets: false, stroke: 2.2 });
      s += K.hatch(band(cx, RG.yt, RG.yb, RG.r), { density: 0.6, bbox: [cx + RG.r * 0.45, RG.yt, cx + RG.r, RG.yb + RG.r * Q] });
      s += K.neonRing(cx, RG.yb - 6, RG.r + 0.5, (RG.r + 0.5) * Q, CY, 2.6);
      s += K.rivets(arcP(cx, RG.yt + 5, RG.r - 1, Math.PI - 0.12, 0.12, 9), 1.8);
      s += K.holo(cx + 6, RG.yt + RG.r * Q + 2, 20, 11, T.green, 'bars');
      // cable loops hanging under the crown ring
      const loops = [[3.0, 2.4, 26, '#3b6fd8'], [2.62, 2.0, 38, '#8a4fd8'], [2.2, 1.62, 22, '#c04fd8'], [1.8, 1.2, 34, '#3b6fd8'],
        [1.4, 0.86, 24, '#2fb7c4'], [1.05, 0.46, 36, '#8a4fd8'], [0.66, 0.12, 24, '#3b6fd8']];
      for (const [a1, a2, sag, tone] of loops) {
        const [x1, y1] = ep(cx, RG.lip - 3, RG.lipR - 5, a1), [x2, y2] = ep(cx, RG.lip - 3, RG.lipR - 5, a2);
        s += K.cable(x1, y1, x2, y2, sag, 3.4, tone);
      }
      // two of them are live (glowing) plasma lines
      for (const [a1, a2, sag, col] of [[2.4, 1.75, 28, VI], [1.2, 0.6, 26, CY]]) {
        const [x1, y1] = ep(cx, RG.lip - 3, RG.lipR - 9, a1), [x2, y2] = ep(cx, RG.lip - 3, RG.lipR - 9, a2);
        s += K.neon(`M${f(x1)} ${f(y1)} Q${f((x1 + x2) / 2)} ${f(Math.max(y1, y2) + sag)} ${f(x2)} ${f(y2)}`, col, 2.4);
      }
      // the deck
      s += `<ellipse cx="${cx}" cy="${RG.yt}" rx="${RG.r}" ry="${RG.r * Q}" fill="${STEEL[1]}" stroke="${P.ink}" stroke-width="3.2"/>`;
      s += `<ellipse cx="${cx - 2}" cy="${RG.yt - 1}" rx="${RG.r - 6}" ry="${(RG.r - 6) * Q}" fill="${STEEL[0]}" opacity=".3"/>`;
      s += `<ellipse cx="${cx}" cy="${RG.yt + 1}" rx="${RG.r - 14}" ry="${(RG.r - 14) * Q}" fill="${STEEL[3]}" stroke="${P.ink}" stroke-width="2.2"/>`;
      // back buttresses and canisters, far to near
      const items = [];
      for (const a of BUTS) if (Math.sin(a) < 0.05) items.push([Math.sin(a), () => buttress(K, cx, RG.yt, a, 38, 60, Math.sin(a) > 0.05 ? 14 : 21, Math.sin(a) > 0.05 ? 7 : 9, Math.sin(a) > 0.05 ? 12 : 16)]);
      for (const [a, col] of CANS) if (Math.sin(a) < 0) items.push([Math.sin(a), () => canAt(a, col)]);
      items.sort((p, q) => p[0] - q[0]);
      for (const [, fn] of items) s += fn();
      // back halves of the holo rings (dimmer, behind the spindle)
      for (const h of HOLO) holoArc(K, cx, h.y, h.rx, h.ry, h.col, 'back', { w: h.w, dash: h.dash, rot: h.rot, op: 0.75 });
      return s;
    });

    const hMid = K.part('h-mid', () => {
      let s = '';
      // stepped hub on the deck
      s += K.cyl({ cx, y: RG.yt + 4, rx: 38, ry: 19, h: 14, tones: STEEL.slice(1), top: 'flat', hatch: false });
      s += K.rivets(arcP(cx, RG.yt - 3, 37, Math.PI - 0.2, 0.2, 6), 1.7);
      s += K.cyl({ cx, y: RG.yt - 10, rx: 27, ry: 13.5, h: 10, tones: STEEL.slice(1), top: 'flat', hatch: false });
      s += K.neonRing(cx, RG.yt - 14, 27.5, 13.75, VI, 2.4);
      s += K.cyl({ cx, y: RG.yt - 20, rx: 16, ry: 8, h: 8, tones: STEEL, top: 'rim', hatch: false });
      // copper coils (back halves), the spindle, coils (front halves)
      for (const [y, R] of COILS) s += torus(cx, y, R, 3, COPPER, 'back');
      s += K.cyl({ cx, y: RG.yt - 26, rx: 6, ry: 3, h: RG.yt - 26 - 64, tones: STEEL, top: 'none', hatch: false });
      for (const [y, R] of COILS) s += torus(cx, y, R, 3, COPPER, 'front');
      // the plasma core between the coils
      K.glow(`<ellipse cx="${cx}" cy="99" rx="20" ry="15" fill="${CY.c}" opacity=".5" filter="url(#bloom)"/>` +
        `<ellipse cx="${cx}" cy="99" rx="9" ry="7" fill="${CY.c}" opacity=".9"/><ellipse cx="${cx}" cy="99" rx="5" ry="4" fill="${CY.core}"/>` +
        `<path d="M${cx - 16} 99 H${cx + 16}" stroke="${CY.core}" stroke-width="1.4" opacity=".9"/>`);
      // flared neck carrying the torus
      s += `<path d="M${cx - 6} 66 L${cx - 6} 62 Q${cx - 7} 56 ${cx - 14} 54 L${cx + 14} 54 Q${cx + 7} 56 ${cx + 6} 62 L${cx + 6} 66 Z" fill="${STEEL[1]}" stroke="${P.ink}" stroke-width="2.6" stroke-linejoin="round"/>`;
      // the torus: dark hole with a plasma glow, the far half, the cone (near half in h-front)
      s += `<ellipse cx="${cx}" cy="${TOR.y}" rx="${TOR.R}" ry="${f(TOR.R * TOR.q)}" fill="${T.dark[4]}" stroke="${P.ink}" stroke-width="2"/>`;
      s += `<ellipse cx="${cx}" cy="${TOR.y + 5}" rx="15" ry="6.5" fill="${STEEL[2]}" stroke="${P.ink}" stroke-width="2.2"/>`;
      s += torus(cx, TOR.y, TOR.R, TOR.r, TORT, 'back', TOR.q);
      s += `<path d="M${cx - 8} ${TOR.y + 5} Q${cx - 5} ${TOR.y - 4} ${cx} ${TOR.y - 12} Q${cx + 5} ${TOR.y - 4} ${cx + 8} ${TOR.y + 5} Z" fill="${STEEL[1]}" stroke="${P.ink}" stroke-width="2.4" stroke-linejoin="round"/>` +
        `<path d="M${cx - 4} ${TOR.y + 3} Q${cx - 3} ${TOR.y - 4} ${cx} ${TOR.y - 9}" stroke="${T.rim}" stroke-width="1.6" fill="none" opacity=".7"/>`;
      K.glow(`<ellipse cx="${cx}" cy="${TOR.y + 2}" rx="${TOR.R - 8}" ry="7" fill="${CY.c}" opacity=".55" filter="url(#bloom)"/>` +
        `<ellipse cx="${cx}" cy="${TOR.y + 3}" rx="${TOR.R - 12}" ry="4" fill="${CY.c}" opacity=".5"/>`);
      return s;
    });

    const hFront = K.part('h-front', () => {
      let s = '';
      // the torus near half, copper wraps, a rim highlight on the lit upper-left
      s += torus(cx, TOR.y, TOR.R, TOR.r, TORT, 'front', TOR.q);
      for (const a of [2.5, 0.7, -0.75, -2.45]) {
        const [x1, y1] = ep(cx, TOR.y, TOR.R - TOR.r, a), [x2, y2] = ep(cx, TOR.y, TOR.R + TOR.r, a);
        const k = TOR.q / Q;
        s += line([[x1, TOR.y + (y1 - TOR.y) * k - 1], [x2, TOR.y + (y2 - TOR.y) * k - 1]], P.ink, 6) +
          line([[x1, TOR.y + (y1 - TOR.y) * k - 1], [x2, TOR.y + (y2 - TOR.y) * k - 1]], COPPER[1], 2.8);
      }
      s += `<path d="M${f(cx - TOR.R - 2)} ${f(TOR.y - 4)} A${f(TOR.R + 2)} ${f((TOR.R + 2) * TOR.q)} 0 0 1 ${f(cx - 4)} ${f(TOR.y - TOR.R * TOR.q - 6)}" fill="none" stroke="${T.rim}" stroke-width="2" opacity=".75"/>`;
      const items = [];
      for (const a of BUTS) if (Math.sin(a) >= 0.05) items.push([Math.sin(a), () => buttress(K, cx, RG.yt, a, 38, 60, Math.sin(a) > 0.05 ? 14 : 21, Math.sin(a) > 0.05 ? 7 : 9, Math.sin(a) > 0.05 ? 12 : 16)]);
      for (const [a, col] of CANS) if (Math.sin(a) >= 0) items.push([Math.sin(a), () => canAt(a, col)]);
      items.sort((p, q) => p[0] - q[0]);
      for (const [, fn] of items) s += fn();
      // near halves of the holo rings
      for (const h of HOLO) holoArc(K, cx, h.y, h.rx, h.ry, h.col, 'front', { w: h.w, dash: h.dash, rot: h.rot });
      // arcs: core to the canisters, between canister caps, sparks off the torus
      const top = (a) => { const [x, y] = canPos(a); return [x + Math.cos(a) * 7, y - 52]; };
      const [l1, l2, r1, r2] = CANS.map(([a]) => top(a));
      K.bolt(cx - 12, 98, l1[0] + 4, l1[1] + 4, CY, { jag: 7, seg: 5, w: 2.6, fork: false });
      K.bolt(cx + 12, 94, r2[0] - 4, r2[1] + 4, VI, { jag: 7, seg: 5, w: 2.6, fork: false });
      K.bolt(l1[0], l1[1], l2[0], l2[1], CY, { jag: 6, seg: 4, w: 2.2, fork: false });
      K.bolt(r1[0], r1[1], r2[0], r2[1], VI, { jag: 6, seg: 4, w: 2.2, fork: false });
      K.bolt(cx - TOR.R - 4, TOR.y - 4, cx - 66, TOR.y - 28, CY, { jag: 6, seg: 4, w: 2.6, fork: true });
      K.bolt(cx + TOR.R + 4, TOR.y - 6, cx + 62, TOR.y - 34, CY, { jag: 6, seg: 4, w: 2.6, fork: false });
      K.bolt(cx - 6, TOR.y - 22, cx - 18, TOR.y - 42, CY, { jag: 4, seg: 3, w: 2, fork: false });
      K.bolt(cx - 20, TOR.y + 14, l2[0] + 2, l2[1] - 2, CY, { jag: 5, seg: 4, w: 2, fork: false });
      K.bolt(cx + 20, TOR.y + 14, r1[0] - 2, r1[1] - 2, VI, { jag: 5, seg: 4, w: 2, fork: false });
      return s;
    });
    const head = `<g id="head" data-pivot="${f(piv[0])},${f(piv[1])}">${hBack}${hMid}${hFront}</g>`;

    return K.doc(base + head, { title: 'Plasma', shadow });
  },
};

export default [plasma];

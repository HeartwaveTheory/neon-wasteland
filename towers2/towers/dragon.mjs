// DRAGON: area denial. Lobs globs of napalm that leave fire patches burning on
// the road (strong on slow, dense, armoured crowds; ground only). Signature:
// hot-pink neon + flame orange on dark gunmetal.
//
// A punk dragon in the Neon Wasteland style (same ink / cel / hatching / scrap
// tech as the other four towers), on the shared octagonal plate:
//   - body: a squat furnace / napalm tank: a riveted steel skirt with spray-paint
//     graffiti ("BURN IT LOUD"), a middle wrapped in studded black leather panels
//     (silver pyramid studs on the seams and straps, a buckle, a red tartan patch
//     held by safety pins, a pink circle-A), a furnace door at the front whose
//     grate glows orange, a spiked steel shoulder ring with a hot-pink neon tube
//     under its lip, a chain sagging across the front
//   - neck: a segmented scrap-plate neck in an S curve rising from the tank deck
//     (vertical at the top, under the pivot), bronze throat plates down its front,
//     hot-pink fins down its back, a ribbed napalm hose, a copper pipe and a gauge
//   - at the foot: a guitar-amp speaker stack with a pink neon "DRAGON" sign on top
//     (front left), napalm drums with hazard bands and a flame decal (front right),
//     a ripped black flag with a pink circle-A on a pole at the back right
//   - head layer: a big faceted scrap-metal dragon head facing left, built as a
//     loft of bolted plates in its own oblique frame (like the railgun's gun):
//     a long snout, a jaw open on jagged steel teeth with a forked pierced tongue,
//     chin spikes and a hazard stripe, a glowing orange eye under an angry brow
//     plate (with eyeliner and a brow spike), a cheekbone ridge, chrome horns, a
//     hot-pink neon mohawk of liberty spikes, an ear frill with rings and a safety
//     pin, a stapled crack, a chrome septum ring, smoke from the nostrils, fire
//     licking from the mouth; under it a spiked / studded leather collar with a
//     dangling chain
//
// Layering: <g id="base"> holds b-body (plate, tank, neck) and b-props (amp, sign,
// drums, flag, chain). The head is one part whose pivot is the top of the neck:
// the collar and chain are centred on the pivot's x and the neck is vertical
// there, so the game can mirror the head to face right and it still sits on the
// neck. The septum ring is drawn in the glow pass after the fire so it stays on top.
import { T, CX, GY, P, f } from '../tkit.mjs';

const pts = (a) => a.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
const lerp = (a, b, t) => a + (b - a) * t;
const lerpP = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];
const poly = (p, fill, sw = 0, extra = '') => `<polygon points="${pts(p)}" fill="${fill}"${sw ? ` stroke="${P.ink}" stroke-width="${sw}" stroke-linejoin="round"` : ''}${extra}/>`;
const line = (p, col, w, extra = '') => `<polyline points="${pts(p)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const pathOf = (p) => `M${pts(p).replace(/ /g, ' L')}Z`;
const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
const M = (p) => `${f(p[0])} ${f(p[1])}`;
const n4 = (v) => (+v).toFixed(4);
const Q = 0.5; // ellipse ratio of the view, same as the plate
const ep = (cx, y, r, a) => [cx + Math.cos(a) * r, y + Math.sin(a) * r * Q];
const arcP = (cx, y, r, a0, a1, n = 8) => { const o = []; for (let i = 0; i <= n; i++) o.push(ep(cx, y, r, lerp(a0, a1, i / n))); return o; };

// Palettes (light -> dark)
const G = T.gun, D = T.dark;
const PINK = T.magenta, FIRE = T.orange, CY = T.cyan;
const HOT = ['#ffb3ea', '#ff5ccf', '#d6209c', '#8c0f6a', '#560845'];   // hot-pink paint (fins)
const LEATHER = ['#5c5866', '#403c48', '#2c2932', '#1d1b21'];          // black leather
const CHROME = ['#f2f6fa', '#c3ccd8', '#8a95a5', '#535b68'];
const NAPALM = ['#f59a4a', '#d2622a', '#963c14', '#5c2208'];           // orange-painted drums
const BONE = ['#efe9dc', '#cfc6b2', '#9c937f'];                         // teeth
const COPPER = ['#ffb27a', '#d9773f', '#9c4c1f', '#5f2a0d'];
const GUM = ['#9a2a3a', '#6a1424', '#3a0a12'];
const TONGUE = ['#ff7aa8', '#e0457a', '#a3204f'];
const TOLEX = ['#3a3a40', '#2a2a2f', '#1c1c20'];
const RED_KNOB = '#c8402d';
const BRONZE = ['#a8643a', '#7a4a2a', '#5a3420', '#3a2114'];              // throat plates (rusted copper)

// ------------------------------------------------------------ cylinder helpers
function band(cx, yTop, yBot, rx) {
  const ry = rx * Q;
  return `M${f(cx - rx)} ${f(yTop)} A${f(rx)} ${f(ry)} 0 0 0 ${f(cx + rx)} ${f(yTop)} L${f(cx + rx)} ${f(yBot)} A${f(rx)} ${f(ry)} 0 0 1 ${f(cx - rx)} ${f(yBot)} Z`;
}
// A strip of a surface of revolution between angles a0 -> a1 and heights y0 -> y1.
function strip(cx, rOf, y0, y1, a0, a1, nA = 5, nY = 4) {
  const o = [];
  for (let i = 0; i <= nA; i++) o.push(ep(cx, y0, rOf(y0), lerp(a0, a1, i / nA)));
  for (let j = 1; j < nY; j++) { const y = lerp(y0, y1, j / nY); o.push(ep(cx, y, rOf(y), a1)); }
  for (let i = nA; i >= 0; i--) o.push(ep(cx, y1, rOf(y1), lerp(a0, a1, i / nA)));
  for (let j = nY - 1; j > 0; j--) { const y = lerp(y0, y1, j / nY); o.push(ep(cx, y, rOf(y), a0)); }
  return o;
}
function toneAt(K, a, tones, jit = 0.1) {
  const b = -Math.cos(a) * 0.95 + K.rand(-jit, jit);
  return b > 0.5 ? tones[0] : b > -0.05 ? tones[1] : b > -0.6 ? tones[2] : tones[3];
}
function staves(K, { cx, y0, y1, rOf, n = 8, tones, stroke = 2.4, carbon = true, rim = true, from = Math.PI, to = 0 }) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a0 = lerp(from, to, i / n) - 0.012, a1 = lerp(from, to, (i + 1) / n) + 0.012, am = (a0 + a1) / 2;
    const p = strip(cx, rOf, y0, y1, a0, a1);
    s += poly(p, toneAt(K, am, tones), stroke);
    if (carbon) s += K.carbon(p, { op: 0.12, scale: 5 });
    if (rim && -Math.cos(am) > 0.2) s += line(arcP(cx, y0 + 2.5, rOf(y0) - 1.5, a0 - 0.01, a1 + 0.01, 4), T.rim, 1.8, ' opacity=".45"');
  }
  return s;
}
function shadeHatch(K, cx, y0, y1, rOf, density = 0.6) {
  const p = strip(cx, rOf, y0, y1, Math.PI, 0, 20, 8);
  const r = Math.max(rOf(y0), rOf(y1));
  return K.hatch(pathOf(p), { density, bbox: [cx + r * 0.42, y0 - 4, cx + r + 4, y1 + r * Q + 4] });
}

// ------------------------------------------------------------ punk bits
// Silver pyramid stud.
function stud(x, y, r = 2.8, glint = false) {
  let s = `<polygon points="${pts([[x - r, y], [x, y - r], [x + r, y], [x, y + r]])}" fill="${CHROME[2]}" stroke="${P.ink}" stroke-width="1.3" stroke-linejoin="round"/>` +
    `<polygon points="${pts([[x - r, y], [x, y - r], [x, y]])}" fill="${CHROME[0]}"/><polygon points="${pts([[x, y], [x + r, y], [x, y + r]])}" fill="${CHROME[3]}"/>`;
  if (glint) s += `<circle cx="${f(x - r * 0.35)}" cy="${f(y - r * 0.35)}" r="${f(r * 0.32)}" fill="#fff"/>`;
  return s;
}
// Chrome ring (piercing / chain link seen face-on).
function ring(x, y, rx, ry = rx, rot = 0, w = 2) {
  const t = rot ? ` transform="rotate(${f(rot)} ${f(x)} ${f(y)})"` : '';
  return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="none" stroke="${P.ink}" stroke-width="${f(w + 2.6)}"${t}/>` +
    `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="none" stroke="${CHROME[1]}" stroke-width="${f(w)}"${t}/>` +
    `<path d="M${f(x - rx * 0.8)} ${f(y - ry * 0.45)} A${f(rx)} ${f(ry)} 0 0 1 ${f(x - rx * 0.1)} ${f(y - ry)}" fill="none" stroke="${CHROME[0]}" stroke-width="${f(w * 0.6)}"${t}/>`;
}
// Safety pin from (x, y) along angle (degrees), length len.
// Classic shape: a single coil loop at the back (x 0), two thin straight bars
// that meet at the coil and run (almost parallel) to a hooded clasp head at the front.
function safetyPin(x, y, len = 24, ang = 0, k = 1) {
  const L = len / k, bars = `M2.6 -2.6 L${f(L - 6)} -2.4 M2.6 2.6 L${f(L - 6)} 0.2`;
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(ang)}) scale(${k})">` +
    `<path d="${bars}" stroke="${P.ink}" stroke-width="3.4" stroke-linecap="round"/>` +
    `<path d="${bars}" stroke="${CHROME[1]}" stroke-width="1.4" stroke-linecap="round"/>` +
    `<path d="M3 -2.4 L${f(L - 7)} -2.3" stroke="${CHROME[0]}" stroke-width=".7"/>` +
    `<circle cx="0" cy="0" r="3.4" fill="none" stroke="${P.ink}" stroke-width="3.6"/><circle cx="0" cy="0" r="3.4" fill="none" stroke="${CHROME[1]}" stroke-width="1.6"/>` +
    `<path d="M-2.4 -2 A3.4 3.4 0 0 1 1.6 -3" fill="none" stroke="#fff" stroke-width=".9"/>` +
    `<path d="M${f(L - 8)} -4.4 h5.6 q2.8 0 2.8 2.6 v1.2 q0 2.6 -2.8 2.6 h-5.6 Z" fill="${CHROME[1]}" stroke="${P.ink}" stroke-width="1.8" stroke-linejoin="round"/>` +
    `<path d="M${f(L - 7)} -3.3 h4.6" stroke="#fff" stroke-width="1" opacity=".9"/></g>`;
}
// Chain hanging from p0 to p1 with a sag (quadratic), alternating face-on / edge-on links.
function chain(p0, p1, sag, link = 7, w = 1.8) {
  const c = [(p0[0] + p1[0]) / 2, Math.max(p0[1], p1[1]) + sag];
  const at = (t) => [(1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0], (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1]];
  let L = 0, prev = p0;
  for (let i = 1; i <= 40; i++) { const q = at(i / 40); L += Math.hypot(q[0] - prev[0], q[1] - prev[1]); prev = q; }
  const n = Math.max(2, Math.round(L / (link * 1.15)));
  let s = '';
  for (let i = 0; i <= n; i++) {
    const t = i / n, q = at(t), q2 = at(Math.min(1, t + 0.01)), q1 = at(Math.max(0, t - 0.01));
    const ang = (Math.atan2(q2[1] - q1[1], q2[0] - q1[0]) * 180) / Math.PI;
    if (i % 2 === 0) s += ring(q[0], q[1], link * 0.62, link * 0.38, ang, w);
    else {
      const a = (ang * Math.PI) / 180, dx = Math.cos(a) * link * 0.55, dy = Math.sin(a) * link * 0.55;
      s += line([[q[0] - dx, q[1] - dy], [q[0] + dx, q[1] + dy]], P.ink, w + 3) + line([[q[0] - dx, q[1] - dy], [q[0] + dx, q[1] + dy]], CHROME[2], w);
    }
  }
  return s;
}
// A pink spike-fin (cel shaded: lit front half, shaded back half). base: two points, tip.
function fin(b0, b1, tip, { sw = 2.8 } = {}) {
  const mid = lerpP(b0, b1, 0.45), back = lerpP(b0, b1, 0.82);
  return poly([b0, tip, b1], HOT[1], sw) + poly([b0, tip, mid], HOT[0]) + poly([back, tip, b1], HOT[2]) +
    line([lerpP(b0, tip, 0.1), lerpP(b0, tip, 0.8)], '#fff0fa', 1.4, ' opacity=".9"') + poly([b0, tip, b1], 'none', sw);
}

// ------------------------------------------------------------ the body
const TX = CX;                                   // tank axis
const SKIRT = { y0: 366, y1: 396, r: 84 };       // riveted steel skirt
const BODY = { y0: 312, y1: 368, r: 78 };        // leather-wrapped tank
const SHO = { y0: 298, y1: 314, r: 82 };         // spiked shoulder ring
// The neck: an S-curved spine from the deck to the pivot (top of the neck).
const PIV = [272, 176];
const NECK = { p0: [262, 300], c1: [306, 268], c2: [268, 244], p3: PIV, r0: 44, r1: 32 };
const spine = (t) => {
  const { p0, c1, c2, p3 } = NECK, u = 1 - t;
  return [u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p3[1]];
};
const neckR = (t) => lerp(NECK.r0, NECK.r1, t);

function skirt(K) {
  const { y0, y1, r } = SKIRT, rOf = () => r;
  let s = `<path d="${band(TX, y0, y1, r)}" fill="${G[4]}" stroke="${P.ink}" stroke-width="3.5"/>`;
  s += staves(K, { cx: TX, y0, y1, rOf, n: 10, tones: [G[1], G[2], D[1], D[2]] });
  for (let i = 0; i <= 10; i++) { const a = lerp(Math.PI, 0, i / 10); const [x, y] = ep(TX, y1 - 5, r, a); if (i > 0 && i < 10) s += K.rivets([[x, y]], 2.2); }
  s += shadeHatch(K, TX, y0, y1, rOf, 0.6);
  // graffiti on the front of the skirt
  s += K.graffiti(TX + 14, 424, 'BURN IT LOUD', PINK.c, { size: 11.5, rot: -5 });
  return s;
}
function body(K) {
  const { y0, y1, r } = BODY, rOf = () => r;
  let s = `<path d="${band(TX, y0, y1, r)}" fill="${LEATHER[3]}" stroke="${P.ink}" stroke-width="3.5"/>`;
  // leather panels: staves with stitched seams, studs along each seam
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a0 = lerp(Math.PI, 0, i / n) - 0.01, a1 = lerp(Math.PI, 0, (i + 1) / n) + 0.01, am = (a0 + a1) / 2;
    const p = strip(TX, rOf, y0, y1, a0, a1);
    s += poly(p, toneAt(K, am, LEATHER, 0.06), 2.6);
    // a soft sheen on the lit panels
    if (-Math.cos(am) > 0.1) {
      const [x, y] = ep(TX, (y0 + y1) / 2 - 6, r, am);
      s += `<ellipse cx="${f(x - 2)}" cy="${f(y)}" rx="${f(Math.abs(Math.sin(am)) * 6 + 2)}" ry="16" fill="${LEATHER[0]}" opacity=".5"/>`;
    }
    // stitches
    if (i > 0) {
      const sx = ep(TX, y0, r, a0);
      s += `<path d="M${f(sx[0] + 2)} ${f(sx[1] + 4)} V${f(sx[1] + (y1 - y0) - 4)}" stroke="${CHROME[3]}" stroke-width="1.3" stroke-dasharray="3 3" opacity=".9"/>`;
    }
  }
  // two studded straps along the top and bottom seams: one even row of big
  // silver pyramid studs each (skipping the furnace door), a buckle at the front right
  for (const yy of [y0 + 7, y1 - 7]) {
    const w = 11;
    s += `<path d="${band(TX, yy - w / 2, yy + w / 2, r + 1)}" fill="${LEATHER[2]}" stroke="${P.ink}" stroke-width="2.4"/>`;
    s += line(arcP(TX, yy - w / 2 + 1.8, r + 0.5, Math.PI * 0.97, Math.PI * 0.62, 8), LEATHER[0], 1.4, ' opacity=".8"');
    for (let i = 1; i < 18; i++) {
      const a = lerp(Math.PI, 0, i / 18);
      if (Math.abs(a - Math.PI / 2) < 0.3) continue; // the furnace door
      if (yy > y0 + 20 && Math.abs(a - 0.42) < 0.16) continue; // the buckle
      const [x, y] = ep(TX, yy, r + 1, a);
      const lit = -Math.cos(a);
      s += stud(x, y, lit > 0.6 ? 3.6 : lit > -0.6 ? 3.8 : 3, lit > -0.7);
    }
  }
  {
    const [bx, by] = ep(TX, y1 - 7, r + 1, 0.42);
    s += `<rect x="${f(bx - 7)}" y="${f(by - 7)}" width="14" height="14" rx="2" fill="none" stroke="${P.ink}" stroke-width="5.2"/><rect x="${f(bx - 7)}" y="${f(by - 7)}" width="14" height="14" rx="2" fill="none" stroke="${CHROME[1]}" stroke-width="2.2"/>`;
    s += `<path d="M${f(bx)} ${f(by - 6)} V${f(by + 6)}" stroke="${CHROME[2]}" stroke-width="2"/>`;
  }
  // tartan patch (left front) held by safety pins
  {
    const tid = K.id('tt');
    K.def(`<pattern id="${tid}" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)"><rect width="14" height="14" fill="#b3202e"/>` +
      `<rect y="4" width="14" height="5" fill="#152018" opacity=".55"/><rect x="4" width="5" height="14" fill="#152018" opacity=".55"/>` +
      `<rect y="11" width="14" height="1.2" fill="#f2c94c" opacity=".85"/><rect x="11" width="1.2" height="14" fill="#f2c94c" opacity=".85"/>` +
      `<rect y="1.5" width="14" height="0.8" fill="#fff" opacity=".25"/><rect x="1.5" width="0.8" height="14" fill="#fff" opacity=".25"/></pattern>`);
    const p = strip(TX, () => r + 1.5, y0 + 15, y1 - 14, 2.42, 1.96, 5, 2);
    s += poly(p, `url(#${tid})`, 2.4);
    const inner = strip(TX, () => r + 1.6, y0 + 18, y1 - 17, 2.38, 2.0, 5, 2);
    s += `<polygon points="${pts(inner)}" fill="none" stroke="#f2e6c8" stroke-width="1.2" stroke-dasharray="2.5 2.5" opacity=".85"/>`;
    const [px, py] = ep(TX, y0 + 18, r + 2, 2.36);
    s += safetyPin(px - 2, py - 2, 22, 18);
    const [qx, qy] = ep(TX, y1 - 18, r + 2, 2.02);
    s += safetyPin(qx - 18, qy + 1, 20, -14);
  }
  // pink spray-paint circle-A (right front)
  {
    const [ax, ay] = ep(TX, (y0 + y1) / 2 + 1, r + 1, 0.72);
    s += `<g transform="translate(${f(ax)} ${f(ay)}) scale(.8 1) rotate(-8)" opacity=".9"><circle r="11" fill="none" stroke="${PINK.c}" stroke-width="2.8"/>` +
      `<path d="M-8 9 L0 -12 L8 9 M-6 2 H8" fill="none" stroke="${PINK.c}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M-3 12 v5 M7 7 v6" stroke="${PINK.c}" stroke-width="1.6"/></g>`;
  }
  s += shadeHatch(K, TX, y0, y1, rOf, 0.55);
  return s;
}
// The furnace door at the front: an arched riveted frame, a grate glowing orange.
function furnace(K) {
  const [fx, fy] = ep(TX, BODY.y1 - 2, BODY.r + 2, Math.PI / 2);
  const w = 46, h = 50;
  const x0 = fx - w / 2, x1 = fx + w / 2, yb = fy, yt = fy - h;
  const arch = `M${f(x0)} ${f(yb)} V${f(yt + 16)} Q${f(x0)} ${f(yt)} ${f(fx)} ${f(yt)} Q${f(x1)} ${f(yt)} ${f(x1)} ${f(yt + 16)} V${f(yb)} Z`;
  let s = `<path d="${arch}" fill="${G[2]}" stroke="${P.ink}" stroke-width="3.5"/>`;
  s += `<path d="M${f(x0 + 2)} ${f(yb - 2)} V${f(yt + 16)} Q${f(x0 + 2)} ${f(yt + 2)} ${f(fx)} ${f(yt + 2)}" fill="none" stroke="${T.rim}" stroke-width="2" opacity=".6"/>`;
  const ix0 = x0 + 8, ix1 = x1 - 8, iyt = yt + 9, iyb = yb - 7;
  const inner = `M${f(ix0)} ${f(iyb)} V${f(iyt + 12)} Q${f(ix0)} ${f(iyt)} ${f(fx)} ${f(iyt)} Q${f(ix1)} ${f(iyt)} ${f(ix1)} ${f(iyt + 12)} V${f(iyb)} Z`;
  s += `<path d="${inner}" fill="#2a0e04" stroke="${P.ink}" stroke-width="2.6"/>`;
  K.glow(`<path d="${inner}" fill="${K.vgrad(FIRE.core, FIRE.deep)}" opacity=".95"/>` +
    `<ellipse cx="${f(fx)}" cy="${f(iyb - 12)}" rx="34" ry="26" fill="${FIRE.c}" opacity=".5" filter="url(#bloom)"/>`);
  // grate bars (solid, over the glow: draw them as a separate glow-free group on top)
  let bars = '';
  for (let k = 0; k < 4; k++) {
    const yy = iyt + 8 + k * 8.5;
    bars += line([[ix0 + 1, yy], [ix1 - 1, yy]], P.ink, 5.2) + line([[ix0 + 1, yy - 0.6], [ix1 - 1, yy - 0.6]], G[2], 2.2);
  }
  bars += line([[fx, iyt + 1], [fx, iyb]], P.ink, 5) + line([[fx - 0.5, iyt + 1], [fx - 0.5, iyb]], G[1], 2);
  K.glow(bars);
  s += K.rivets([[x0 + 4, yb - 6], [x1 - 4, yb - 6], [x0 + 4, yt + 18], [x1 - 4, yt + 18], [fx, yt + 4]], 1.9);
  // handle and hinges
  s += `<rect x="${f(x1 - 3)}" y="${f(yt + 24)}" width="9" height="5" rx="2" fill="${G[1]}" stroke="${P.ink}" stroke-width="2"/>`;
  for (const yy of [yt + 14, yb - 12]) s += `<rect x="${f(x0 - 5)}" y="${f(yy)}" width="8" height="7" rx="1.5" fill="${G[3]}" stroke="${P.ink}" stroke-width="2"/>`;
  // flame stencil above the door
  s += `<path d="M${f(fx)} ${f(yt - 5)} c-6 -4 -4 -10 0 -14 c0 5 6 6 4 12 c-1 2 -3 2 -4 2 Z" fill="${FIRE.c}" stroke="${P.ink}" stroke-width="1.4" opacity=".9"/>`;
  return s;
}
function shoulder(K) {
  const { y0, y1, r } = SHO, rOf = () => r;
  let s = '';
  // spikes at the back, poking out past the silhouette
  for (const ad of [200, 340]) s += ringSpike(K, (y0 + y1) / 2, r - 4, ad, 24, 11);
  s += `<path d="${band(TX, y0, y1, r)}" fill="${G[3]}" stroke="${P.ink}" stroke-width="3.5"/>`;
  s += staves(K, { cx: TX, y0, y1, rOf, n: 12, tones: [G[0], G[1], G[2], G[3]], carbon: false });
  s += K.hatch(band(TX, y0, y1, r), { density: 0.5, len: [6, 12], bbox: [TX + r * 0.5, y0 - 4, TX + r, y1 + r * Q] });
  for (let i = 1; i < 12; i++) { const [x, y] = ep(TX, (y0 + y1) / 2, r, lerp(Math.PI, 0, i / 12)); s += `<circle cx="${f(x)}" cy="${f(y)}" r="3.2" fill="${G[2]}" stroke="${P.ink}" stroke-width="1.8"/><circle cx="${f(x - 1)}" cy="${f(y - 1)}" r="1.1" fill="${T.rim}" opacity=".8"/>`; }
  // the deck
  s += `<ellipse cx="${f(TX)}" cy="${f(y0)}" rx="${f(r)}" ry="${f(r * Q)}" fill="${G[2]}" stroke="${P.ink}" stroke-width="3.5"/>`;
  s += `<ellipse cx="${f(TX)}" cy="${f(y0)}" rx="${f(r - 9)}" ry="${f((r - 9) * Q)}" fill="${D[2]}" stroke="${P.ink}" stroke-width="2.2"/>`;
  s += line(arcP(TX, y0, r - 3, Math.PI * 1.05, Math.PI * 1.6, 10), T.rim, 2, ' opacity=".5"');
  s += K.rivets([0.4, 1.2, 2.0, 2.8, 3.6, 4.4, 5.2, 6.0].map((a) => ep(TX, y0, r - 4.5, a)), 1.8);
  // hot-pink neon tube under the shoulder lip
  s += K.neonRing(TX, y1 - 1, r - 2, (r - 2) * Q, PINK, 3.4);
  // side spikes
  s += ringSpike(K, y0 + 8, r, 186, 26, 12) + ringSpike(K, y0 + 8, r, -6, 26, 12);
  s += ringSpike(K, y1, r, 150, 18, 9) + ringSpike(K, y1, r, 30, 18, 9);
  return s;
}
function ringSpike(K, y, r, aDeg, len = 22, w = 10) {
  const a = (aDeg * Math.PI) / 180;
  const [x, yy] = ep(TX, y, r - 2, a);
  const k = Math.max(0.55, Math.hypot(Math.cos(a), Math.sin(a) * Q));
  return K.spike(x, yy, len * k, (Math.atan2(Math.sin(a) * Q, Math.cos(a)) * 180) / Math.PI, w);
}

// The neck: stacked scrap-plate rings along the spine, pink fins down its back.
function neck(K) {
  let s = '';
  const N = 7;
  const segs = [];
  for (let i = 0; i < N; i++) {
    const t0 = i / N, t1 = (i + 1) / N;
    segs.push({ b: spine(t0), t: spine(t1 + 0.03), rb: neckR(t0) + 3, rt: neckR(t1) });
  }
  // flange on the deck
  const fl = spine(0);
  s += K.ao(fl[0] + 4, fl[1] + 2, NECK.r0 + 14, (NECK.r0 + 14) * Q, 0.6);
  s += K.cyl({ cx: fl[0], y: fl[1] + 6, rx: NECK.r0 + 9, ry: (NECK.r0 + 9) * Q, h: 9, tones: [G[1], G[2], G[3], G[4]], top: 'flat', topTone: G[2], stroke: 3, hatch: false });
  s += K.rivets([0.3, 1.1, 1.9, 2.7].map((a) => ep(fl[0], fl[1] - 3, NECK.r0 + 5, a)), 1.8);
  // swept-up fins on the lower neck's rear ridge, behind the rings (the top
  // fins are in the head layer, so they flip with the head; these stay well
  // below the jaw whichever way the head faces)
  for (const t of [0.2, 0.36]) {
    const p = spine(t), r = neckR(t), x = p[0] + r - 5;
    const h = lerp(26, 22, t);
    s += fin([x - 4, p[1] - 8], [x - 2, p[1] + 10], [x + h * 0.36, p[1] - h]);
  }
  // rings from the bottom up
  segs.forEach((g, i) => {
    const tones = i % 3 === 1 ? [D[0], D[1], D[2], D[3]] : [G[0], G[1], G[2], G[3]];
    const P0 = [], P1 = [];
    for (let k = 0; k <= 12; k++) {
      const a = lerp(Math.PI, 0, k / 12);
      P0.push(ep(g.t[0], g.t[1], g.rt, a));
      P1.push(ep(g.b[0], g.b[1], g.rb, a));
    }
    const sil = [...P0, ...P1.slice().reverse()];
    s += poly(sil, tones[3], 3.2);
    // vertical staves: lit left -> shaded right
    for (let k = 0; k < 6; k++) {
      const q = [P0[k * 2], P0[k * 2 + 2], P1[k * 2 + 2], P1[k * 2]];
      const am = lerp(Math.PI, 0, (k + 0.5) / 6);
      s += poly(q, toneAt(K, am, tones, 0.05), 1.6);
    }
    // the throat: a rusted copper belly plate down the front-left of every ring
    {
      const bp = [];
      for (let k = 0; k <= 5; k++) bp.push(ep(g.t[0], g.t[1] + 1.5, g.rt + 0.5, lerp(2.3, 1.6, k / 5)));
      for (let k = 5; k >= 0; k--) bp.push(ep(g.b[0], g.b[1] - 1, g.rb, lerp(2.3, 1.6, k / 5)));
      s += poly(bp, BRONZE[1], 2.2);
      s += poly([...bp.slice(0, 3), ...bp.slice(9, 12)], BRONZE[0]);
      s += line(bp.slice(0, 6).map((p) => add(p, [0, 2])), BRONZE[0], 1.6, ' opacity=".9"');
      s += poly(bp, 'none', 2.2);
    }
    s += poly(sil, 'none', 3.2);
    // a hot-orange seam glowing in the gap under the ring (the furnace shows through)
    if (i > 0) {
      const seam = P1.slice(1, 12).map((p) => add(p, [0, 3]));
      s += line(seam, FIRE.c, 5, ' opacity=".35"') + line(seam, FIRE.c, 2.2) + line(seam.slice(2, 8), '#ffd36b', 0.9);
    }
    s += line(P0.slice(1, 6).map((p) => add(p, [0, 2.4])), T.rim, 1.8, ' opacity=".5"');
    s += K.rivets([ep(g.b[0], g.b[1], g.rb - 2, 2.4), ep(g.b[0], g.b[1], g.rb - 2, 1.6), ep(g.b[0], g.b[1], g.rb - 2, 0.9)].map((p) => add(p, [0, -4])), 1.8);
    s += K.hatch(pathOf(sil), { density: 0.5, len: [5, 10], w: 1.5, bbox: [g.b[0] + g.rb * 0.35, g.t[1] - 6, g.b[0] + g.rb + 4, g.b[1] + g.rb * Q + 2] });
    // the top segment is capped (hidden under the head and collar in game)
    if (i === segs.length - 1) s += `<ellipse cx="${f(g.t[0])}" cy="${f(g.t[1])}" rx="${f(g.rt)}" ry="${f(g.rt * Q)}" fill="${D[3]}" stroke="${P.ink}" stroke-width="3"/>`;
  });
  return s;
}
// Hoses feeding the neck from the deck: a ribbed napalm hose (front left), a
// copper pipe (right), a pressure gauge.
function hoses(K) {
  let s = '';
  const P0 = [208, 310], C1 = [186, 280], C2 = [214, 248], P3 = [252, 246];
  const bz = (t) => { const u = 1 - t; return [u * u * u * P0[0] + 3 * u * u * t * C1[0] + 3 * u * t * t * C2[0] + t * t * t * P3[0], u * u * u * P0[1] + 3 * u * u * t * C1[1] + 3 * u * t * t * C2[1] + t * t * t * P3[1]]; };
  s += K.pipe(`M${M(P0)} C${M(C1)} ${M(C2)} ${M(P3)}`, 10, '#2b2730', '#5a5562');
  for (const t of [0.14, 0.3, 0.46, 0.62, 0.78]) {
    const q = bz(t), q2 = bz(t + 0.02), ang = (Math.atan2(q2[1] - q[1], q2[0] - q[0]) * 180) / Math.PI;
    s += `<rect x="${f(q[0] - 2.2)}" y="${f(q[1] - 7)}" width="4.4" height="14" rx="1.5" transform="rotate(${f(ang)} ${f(q[0])} ${f(q[1])})" fill="${NAPALM[1]}" stroke="${P.ink}" stroke-width="1.8"/>`;
  }
  // clamp where it enters the neck, valve block on the deck
  s += `<rect x="${f(P3[0] - 6)}" y="${f(P3[1] - 9)}" width="10" height="18" rx="2" fill="${G[2]}" stroke="${P.ink}" stroke-width="2.4"/>`;
  s += K.box({ x: 196, y: 318, w: 22, h: 12, d: 14, tones: [G[0], G[1], G[2], G[3]], stroke: 2.6 });
  s += `<circle cx="207" cy="306" r="5" fill="${RED_KNOB}" stroke="${P.ink}" stroke-width="2.2"/>`;
  // a copper pipe on the right
  s += K.pipe('M326 306 Q330 284 306 276', 5, COPPER[1], COPPER[0]);
  s += `<circle cx="326" cy="305" r="5" fill="${COPPER[2]}" stroke="${P.ink}" stroke-width="2.2"/>`;
  // pressure gauge on the deck (needle in the red, of course)
  s += `<circle cx="236" cy="300" r="8" fill="${BONE[0]}" stroke="${P.ink}" stroke-width="2.6"/><path d="M236 300 l6 -3" stroke="${FIRE.deep}" stroke-width="1.8"/><path d="M230 301 a6 6 0 0 1 11 -5" stroke="${PINK.c}" stroke-width="1.6" fill="none"/>`;
  return s;
}

// ------------------------------------------------------------ props
// Neon tube letters on a 10 x 12 box centred on 0 (strokes, not font glyphs, so
// every letter reads: the R has an open bowl and a kicked leg).
const GLYPH = {
  D: 'M-4.4 -6 V6 H-0.5 Q4.8 6 4.8 0 Q4.8 -6 -0.5 -6 Z',
  R: 'M-4.4 6 V-6 H0.8 Q4.8 -6 4.8 -2.6 Q4.8 0.8 0.8 0.8 H-4.4 M0.2 0.8 L5 6',
  A: 'M-5 6 L0 -6 L5 6 M-2.9 1.4 H2.9',
  G: 'M4.6 -3.4 Q3.6 -6 0 -6 Q-4.9 -6 -4.9 0 Q-4.9 6 0 6 Q4.8 6 4.8 1 H0.6',
  O: 'M0 -6 Q4.9 -6 4.9 0 Q4.9 6 0 6 Q-4.9 6 -4.9 0 Q-4.9 -6 0 -6 Z',
  N: 'M-4.4 6 V-6 L4.4 6 V-6',
};
// Vertical neon sign in a dark frame (like K.vsign) with tube-stroke letters.
function neonSign(K, x, y, w, h, str, col) {
  let s = `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="4" fill="#1d1a24" stroke="${P.ink}" stroke-width="3.5"/>`;
  s += K.rivets([[x + 5, y + 5], [x + w - 5, y + 5], [x + 5, y + h - 5], [x + w - 5, y + h - 5]], 1.6);
  const n = str.length, step = (h - 14) / n, k = Math.min((w - 9) / 10, (step * 0.84) / 12);
  let d = '';
  for (let i = 0; i < n; i++) {
    const cx = x + w / 2, cy = y + 7 + step * (i + 0.5);
    d += `<path transform="translate(${f(cx)} ${f(cy)}) scale(${n4(k)})" d="${GLYPH[str[i]]}"${NS}/>`;
  }
  // the tubes' dark housings in the frame, then the glowing tubes
  s += `<g fill="none" stroke="#0e0c12" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round">${d}</g>`;
  K.glow(`<rect x="${f(x + 2)}" y="${f(y + 2)}" width="${f(w - 4)}" height="${f(h - 4)}" rx="3" fill="none" stroke="${col.c}" stroke-width="2.4"/><rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${col.c}" opacity=".25" filter="url(#bloom)"/>` +
    `<g fill="none" stroke="${col.c}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".75" filter="url(#bloom)">${d}</g>` +
    `<g fill="none" stroke="${col.c}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${d}</g>` +
    `<g fill="none" stroke="${col.core}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">${d}</g>`);
  return s;
}
// Guitar-amp speaker stack: a 4-speaker cab and a head with knobs and a pink logo.
function amp(K) {
  let s = '';
  const x = 126, y = 452, w = 58, h = 46, d = 26;
  s += K.box({ x, y, w, h, d, tones: [TOLEX[0], TOLEX[1], TOLEX[2], TOLEX[2]], stroke: 3.2 });
  // grille cloth and four speakers
  const gx = x + 5, gy = y - h + 5, gw = w - 10, gh = h - 10;
  const gid = K.id('gr');
  K.def(`<pattern id="${gid}" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="#2e2c30"/><rect width="1.5" height="1.5" fill="#46434a"/></pattern>`);
  s += `<rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" fill="url(#${gid})" stroke="${P.ink}" stroke-width="2.2"/>`;
  for (const [cx, cy] of [[gx + gw * 0.27, gy + gh * 0.28], [gx + gw * 0.73, gy + gh * 0.28], [gx + gw * 0.27, gy + gh * 0.72], [gx + gw * 0.73, gy + gh * 0.72]]) {
    s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="8.6" fill="#1b1a1e" stroke="${P.ink}" stroke-width="2"/><circle cx="${f(cx)}" cy="${f(cy)}" r="5.6" fill="#3b3940"/><circle cx="${f(cx)}" cy="${f(cy)}" r="2.4" fill="#1b1a1e"/>` +
      `<path d="M${f(cx - 6)} ${f(cy - 3)} a7 7 0 0 1 5 -4" stroke="#6b6873" stroke-width="1.4" fill="none"/>`;
  }
  // piping and corners
  for (const [cx, cy] of [[x + 3, y - h + 3], [x + w - 3, y - h + 3], [x + 3, y - 3], [x + w - 3, y - 3]]) s += `<rect x="${f(cx - 3.5)}" y="${f(cy - 3.5)}" width="7" height="7" rx="1.5" fill="${CHROME[2]}" stroke="${P.ink}" stroke-width="1.6"/>`;
  // the head unit on top
  const hx = x + 1, hy = y - h - 2, hw = w - 2, hh = 18;
  s += K.box({ x: hx, y: hy, w: hw, h: hh, d: d - 4, tones: [TOLEX[0], TOLEX[1], TOLEX[2], TOLEX[2]], stroke: 3 });
  s += `<rect x="${hx + 4}" y="${hy - hh + 4}" width="${hw - 8}" height="7" fill="${BONE[1]}" stroke="${P.ink}" stroke-width="1.6"/>`;
  for (let i = 0; i < 6; i++) s += `<circle cx="${f(hx + 9 + i * 8)}" cy="${f(hy - hh + 7.5)}" r="2.3" fill="${P.ink}"/>`;
  K.glow(`<rect x="${f(hx + 12)}" y="${f(hy - 5.5)}" width="26" height="3" rx="1.5" fill="${PINK.c}"/><rect x="${f(hx + 8)}" y="${f(hy - 8)}" width="34" height="8" fill="${PINK.c}" opacity=".45" filter="url(#bloom)"/>`);
  // the handle on top
  s += `<path d="M${f(hx + hw * 0.36 + 4)} ${f(hy - hh - 6)} h14" stroke="${P.ink}" stroke-width="5" stroke-linecap="round"/>`;
  // curly guitar cable to the tank
  let d2 = `M${x + w - 2} ${y - 6}`;
  for (let k = 0; k < 4; k++) d2 += ` q4 6 8 1 q-2 -6 4 -1`;
  d2 += ' q10 6 22 2';
  s += `<path d="${d2}" fill="none" stroke="${P.ink}" stroke-width="4.6" stroke-linecap="round"/><path d="${d2}" fill="none" stroke="#3b6fd8" stroke-width="2" stroke-linecap="round"/>`;
  return s;
}
// Napalm drum: orange paint, black hazard band, a flame decal.
function napalm(K, x, yBot, r = 13) {
  let s = K.cyl({ cx: x, y: yBot, rx: r, ry: r * Q, h: r * 2.4, tones: NAPALM, top: 'rim', stroke: 3, hatch: false });
  const yb = yBot - r * 1.2;
  const hid = K.id('hb');
  K.def(`<clipPath id="${hid}"><path d="${band(x, yb - 5, yb + 5, r)}"/></clipPath>`);
  s += `<g clip-path="url(#${hid})">${K.hazard([[x - r - 2, yb - 8], [x + r + 2, yb - 8], [x + r + 2, yb + 8 + r * Q], [x - r - 2, yb + 8 + r * Q]], { w: 3.5 })}</g>`;
  s += `<path d="${band(x, yb - 5, yb + 5, r)}" fill="none" stroke="${P.ink}" stroke-width="2.2"/>`;
  s += K.hoop(x, yBot - r * 2.1, r, r * Q, 3, P.ink);
  s += `<path d="M${f(x - 2)} ${f(yBot - r * 0.15)} c-5 -3 -3 -8 0 -11 c0 4 5 5 3 9 c-1 2 -2 2 -3 2 Z" fill="${FIRE.core}" stroke="${P.ink}" stroke-width="1.3"/>`;
  s += `<path d="M${f(x - r + 2.5)} ${f(yBot - r * 2.2)} V${f(yBot - 2)}" stroke="${NAPALM[0]}" stroke-width="1.8" opacity=".7"/>`;
  return s;
}
// Ripped black flag with a pink circle-A on a pole.
function flag(K, x, yBot, yTop) {
  let s = '';
  const w = 44, h = 28, fy = yTop + 4;
  const cloth = `M${f(x)} ${f(fy)} C${f(x + w * 0.4)} ${f(fy - 5)} ${f(x + w * 0.7)} ${f(fy + 4)} ${f(x + w)} ${f(fy - 1)} L${f(x + w - 4)} ${f(fy + h * 0.45)} L${f(x + w + 2)} ${f(fy + h * 0.62)} L${f(x + w - 8)} ${f(fy + h * 0.7)} L${f(x + w - 14)} ${f(fy + h + 3)} L${f(x + w - 22)} ${f(fy + h * 0.8)} L${f(x + w * 0.42)} ${f(fy + h + 6)} L${f(x + w * 0.3)} ${f(fy + h * 0.85)} L${f(x + w * 0.16)} ${f(fy + h)} L${f(x + 2)} ${f(fy + h * 0.9)} Z`;
  s += `<path d="${cloth}" fill="#24212a" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>`;
  const cid = K.id('c');
  K.def(`<clipPath id="${cid}"><path d="${cloth}"/></clipPath>`);
  s += `<g clip-path="url(#${cid})"><rect x="${f(x)}" y="${f(fy - 6)}" width="12" height="${h + 14}" fill="#3a3642"/><path d="M${f(x + w * 0.62)} ${f(fy)} q-4 18 1 ${h + 6}" stroke="#141217" stroke-width="5" fill="none" opacity=".8"/></g>`;
  const ax = x + w * 0.46, ay = fy + h * 0.44;
  s += `<g transform="translate(${f(ax)} ${f(ay)}) scale(.86)"><circle r="9.5" fill="none" stroke="${PINK.c}" stroke-width="2.8"/><path d="M-7 8 L0 -11 L7 8 M-5 2 H8" fill="none" stroke="${PINK.c}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  s += `<path d="${cloth}" fill="none" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>`;
  // pole
  s += line([[x, yBot], [x, yTop - 6]], P.ink, 8) + line([[x, yBot], [x, yTop - 6]], G[2], 3.6) + line([[x - 1, yBot], [x - 1, yTop - 6]], G[0], 1.2, ' opacity=".8"');
  s += K.spike(x, yTop - 6, 11, -90, 8);
  return s;
}

// ------------------------------------------------------------ the head frame
// Oblique frame of the head (squashed like the plate): a along the snout towards
// the mouth (left), b across towards the viewer, c up. Origin = the pivot.
const HU = [-0.97, 0.12], HN = [0.24, 0.485];
const H = (a, b, c) => [PIV[0] + HU[0] * a + HN[0] * b, PIV[1] + HU[1] * a + HN[1] * b - c];
// Transforms that lay local 2D drawings flat on the head's near side (x towards
// the back of the head = screen right, y down) and on its top (x back, y towards viewer).
const sideT = (p, k = 1) => `matrix(${n4(-HU[0] * k)} ${n4(-HU[1] * k)} 0 ${k} ${f(p[0])} ${f(p[1])})`;
const topT = (p, k = 1) => `matrix(${n4(-HU[0] * k)} ${n4(-HU[1] * k)} ${n4(HN[0] * k)} ${n4(HN[1] * k)} ${f(p[0])} ${f(p[1])})`;
const NS = ' vector-effect="non-scaling-stroke"';

// Upper head loft: [a, cTop, cShoulder, cBottom, wTop, wShoulder, wBottom].
const STA = [
  [-46, 52, 38, 14, 12, 22, 18],
  [-22, 78, 58, 6, 22, 35, 30],
  [12, 88, 68, 4, 24, 39, 33],
  [46, 86, 66, 22, 22, 36, 31],
  [76, 74, 57, 24, 17, 30, 28],
  [116, 66, 51, 25, 14, 26, 25],
  [152, 64, 49, 27, 13, 24, 23],
  [174, 55, 44, 29, 10, 20, 20],
];
const NOSE = STA[STA.length - 1][0];
function prof(a) {
  let i = 0;
  while (i < STA.length - 2 && a > STA[i + 1][0]) i++;
  const A = STA[i], B = STA[i + 1], t = Math.max(0, Math.min(1, (a - A[0]) / (B[0] - A[0])));
  const v = A.map((x, k) => lerp(x, B[k], t));
  return { a: v[0], ct: v[1], cs: v[2], cb: v[3], wt: v[4], ws: v[5], wb: v[6] };
}
// Lower jaw: hinged at (a, c) = JH, opened by JA radians; stations [s, depth, wTop, wBottom].
const JH = [30, 20], JA = (16 * Math.PI) / 180;
const JST = [[0, 20, 30, 26], [44, 24, 28, 23], [98, 18, 22, 19], [136, 13, 18, 14]];
const CHIN = JST[JST.length - 1][0];
const J = (s, b, c) => H(JH[0] + s * Math.cos(JA) + c * Math.sin(JA), b, JH[1] - s * Math.sin(JA) + c * Math.cos(JA));
const jprof = (s) => {
  let i = 0;
  while (i < JST.length - 2 && s > JST[i + 1][0]) i++;
  const A = JST[i], B = JST[i + 1], t = Math.max(0, Math.min(1, (s - A[0]) / (B[0] - A[0])));
  return { d: lerp(A[1], B[1], t), wt: lerp(A[2], B[2], t), wb: lerp(A[3], B[3], t) };
};

const FAM = { gun: [G[0], G[1], G[2], G[3]], dark: [D[0], D[1], D[2], D[3]], rust: [T.rust[0], T.rust[1], T.rust[2], T.rust[3]] };
// Plate family per segment of the loft (scrap: mismatched plates).
const SEGF = ['dark', 'gun', 'gun', 'dark', 'gun', 'dark', 'gun'];

// Tapered curved horn from root (screen) through ctrl to tip; r0 = root radius.
function horn(K, p0, c, p1, r0, tones) {
  const at = (t) => [(1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0], (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1]];
  const up = [], dn = [], mid = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const t = i / n, q = at(t), q2 = at(Math.min(1, t + 0.02)), q1 = at(Math.max(0, t - 0.02));
    const dx = q2[0] - q1[0], dy = q2[1] - q1[1], L = Math.hypot(dx, dy) || 1;
    let nx = -dy / L, ny = dx / L;
    if (ny > 0) { nx = -nx; ny = -ny; }
    const r = r0 * Math.pow(1 - t, 0.85) + 0.6;
    up.push([q[0] + nx * r, q[1] + ny * r]); dn.push([q[0] - nx * r, q[1] - ny * r]); mid.push([q[0] + nx * r * 0.15, q[1] + ny * r * 0.15]);
  }
  const outline = [...up, ...dn.slice().reverse()];
  let s = poly(outline, tones[2], 3);
  s += poly([...up, ...mid.slice().reverse()], tones[1]);
  s += line(up.slice(1, n - 2).map((p, i) => lerpP(p, mid[i + 1], 0.35)), tones[0], 1.8, ' opacity=".85"');
  for (const t of [0.18, 0.36, 0.54]) {
    const i = Math.round(t * n);
    s += line([lerpP(up[i], mid[i], -0.1), lerpP(dn[i], mid[i], -0.1)], P.ink, 1.8, ' opacity=".75"');
  }
  s += poly(outline, 'none', 3);
  return s;
}

// ------------------------------------------------------------ the head
// The spiked / studded leather collar round the neck under the head (centred on
// the pivot's x so it stays put when the game mirrors the head).
const COLLAR = { y: PIV[1] + 26, r: 40, w: 15 };
function chromeSpike(x, y, len, ang, w = 9) {
  const a = (ang * Math.PI) / 180, nx = -Math.sin(a), ny = Math.cos(a);
  const tip = [x + Math.cos(a) * len, y + Math.sin(a) * len];
  const b1 = [x + nx * w / 2, y + ny * w / 2], b2 = [x - nx * w / 2, y - ny * w / 2];
  const lit = ny < 0 ? b1 : b2;
  return poly([b1, tip, b2], CHROME[2], 2.6) + poly([lit, tip, [x, y]], CHROME[0]) + poly([b1, tip, b2], 'none', 2.6);
}
function collarBack(K) {
  const { y, r } = COLLAR, cx = PIV[0];
  let s = '';
  for (const ad of [196, 232, 268, 304, 344]) {
    const a = (ad * Math.PI) / 180;
    const [x, yy] = ep(cx, y - 2, r - 3, a);
    s += chromeSpike(x, yy, 16, (Math.atan2(Math.sin(a) * Q - 0.45, Math.cos(a)) * 180) / Math.PI, 9);
  }
  return s;
}
function collarFront(K) {
  const { y, r, w } = COLLAR, cx = PIV[0];
  let s = `<path d="${band(cx, y - w / 2, y + w / 2, r)}" fill="${K.bands(LEATHER)}" stroke="${P.ink}" stroke-width="3.2"/>`;
  s += line(arcP(cx, y - w / 2 + 2.2, r - 1, Math.PI * 0.96, Math.PI * 0.42, 10), LEATHER[0], 1.8, ' opacity=".9"');
  for (const dy of [-w / 2 + 3.5, w / 2 - 3]) s += `<path d="M${f(cx - r + 3)} ${f(y + dy)} A${f(r)} ${f(r * Q)} 0 0 0 ${f(cx + r - 3)} ${f(y + dy)}" fill="none" stroke="${CHROME[3]}" stroke-width="1.2" stroke-dasharray="2.5 2.5"/>`;
  // studs between the spikes, chrome spikes pointing out and down
  for (const ad of [158, 122, 58, 22]) { const [x, yy] = ep(cx, y, r + 0.5, (ad * Math.PI) / 180); s += stud(x, yy, 3.2); }
  for (const ad of [176, 140, 104, 76, 40, 4]) {
    const a = (ad * Math.PI) / 180;
    const [x, yy] = ep(cx, y, r - 1, a);
    const ang = (Math.atan2(Math.sin(a) * Q + 0.32, Math.cos(a)) * 180) / Math.PI;
    s += chromeSpike(x, yy, 17 * Math.max(0.62, Math.hypot(Math.cos(a), Math.sin(a) * Q)), ang, 9);
  }
  // the D-ring at the front with a dangling chain
  const [dx, dy] = ep(cx, y + 5, r, Math.PI / 2 + 0.12);
  s += `<path d="M${f(dx - 6)} ${f(dy - 2)} h12 v3 a6 6 0 0 1 -12 0 Z" fill="none" stroke="${P.ink}" stroke-width="5.4"/><path d="M${f(dx - 6)} ${f(dy - 2)} h12 v3 a6 6 0 0 1 -12 0 Z" fill="none" stroke="${CHROME[1]}" stroke-width="2.2"/>`;
  s += chain([dx, dy + 7], [dx + 30, dy + 4], 30, 7, 1.9);
  return s;
}

// A comic flame jet (glow layer, thin ink edge): tongues flowing along dir
// (degrees, 0 = right) from (x, y), length L. Orange with a yellow core, pink tips.
function flameJet(K, x, y, L, dir, { w = 1 } = {}) {
  const S = (pp) => pp.map(([a, b]) => [a * L / 100, b * L / 100 * w]);
  const shape = (pp) => {
    const q = S(pp);
    let d = `M${f(q[0][0])} ${f(q[0][1])}`;
    for (let i = 1; i + 1 < q.length; i += 2) d += ` Q${f(q[i][0])} ${f(q[i][1])} ${f(q[i + 1][0])} ${f(q[i + 1][1])}`;
    return d + 'Z';
  };
  const outer = [[0, -8], [16, -24], [38, -22], [54, -22], [80, -34], [62, -14], [68, -7], [86, -6], [104, 1], [80, 8], [68, 11], [78, 20], [88, 32], [54, 24], [32, 19], [12, 15], [0, 8]];
  const mid = [[2, -6], [16, -17], [34, -15], [48, -14], [66, -22], [54, -8], [60, -3], [76, -2], [90, 2], [70, 6], [58, 8], [64, 14], [70, 22], [46, 16], [28, 13], [12, 10], [2, 6]];
  const core = [[4, -4], [14, -9], [28, -8], [40, -7], [52, -10], [44, -2], [50, 0], [60, 1], [68, 2], [54, 4], [44, 5], [46, 9], [48, 13], [34, 9], [22, 7], [10, 6], [4, 4]];
  const tr = `translate(${f(x)} ${f(y)}) rotate(${f(dir)})`;
  const pid = K.id('fp');
  K.def(`<linearGradient id="${pid}" x1="0" y1="0" x2="${f(L)}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${FIRE.deep}"/><stop offset=".55" stop-color="#ff5a1a"/><stop offset="1" stop-color="${PINK.c}"/></linearGradient>`);
  K.glow(`<g transform="${tr}"><path d="${shape(outer)}" fill="${PINK.c}" opacity=".45" filter="url(#bloom)"/>` +
    `<path d="${shape(outer)}" fill="url(#${pid})" stroke="${P.ink}" stroke-width="2.6" stroke-linejoin="round"/>` +
    `<path d="${shape(mid)}" fill="${FIRE.c}"/><path d="${shape(core)}" fill="#ffd36b"/>` +
    `<path d="${shape(core)}" fill="${FIRE.core}" transform="translate(${f(-L * 0.04)} 0) scale(.7)"/></g>`);
}
// A cloud of smoke: overlapping puffs (one silhouette, so one ink outline).
function smoke(x, y, r, op = 0.9) {
  const c = [[0, 0, 1], [-r * 0.8, r * 0.25, 0.7], [r * 0.75, r * 0.3, 0.75], [r * 0.1, -r * 0.6, 0.65]];
  let s = c.map(([dx, dy, k]) => `<circle cx="${f(x + dx)}" cy="${f(y + dy)}" r="${f(r * k)}" fill="#8f8a9b"/>`).join('');
  s += c.map(([dx, dy, k]) => `<circle cx="${f(x + dx - r * k * 0.25)}" cy="${f(y + dy - r * k * 0.3)}" r="${f(r * k * 0.6)}" fill="#bdb8c8"/>`).join('');
  return `<g opacity="${op}">${s}</g>`;
}

// The top of the mohawk's run down the neck: swept-back pink fins on the back of
// the neck under the skull. They are in the head layer so they flip with it and
// always run down the back; their roots sit inside the neck on both facings.
function neckFins(K) {
  let s = '';
  for (const [y, h] of [[248, 24], [231, 28], [214, 30]]) {
    const x = 296;
    s += fin([x - 2, y - 9], [x, y + 9], [x + h * 0.95, y - h * 0.72]);
  }
  return s;
}
function head(K) {
  let s = '';
  s += neckFins(K);
  s += collarBack(K);
  // far horn (behind the skull)
  s += horn(K, H(-14, -18, 70), H(-70, -24, 70), H(-98, -26, 114), 12, [CHROME[1], CHROME[2], CHROME[3]]);
  s += collarFront(K);

  // ---- the mouth: inner wall, gums, tongue, far teeth
  const upEdge = [], loNear = [], loFar = [];
  for (let a = 46; a <= NOSE; a += 8) { const p = prof(a); upEdge.push(H(a, p.wb, p.cb)); }
  { const p = prof(NOSE); upEdge.push(H(NOSE, p.wb, p.cb)); }
  for (let si = 0; si <= CHIN; si += 8) { const j = jprof(si); loNear.push(J(si, j.wt, 0)); loFar.push(J(si, -j.wt, 0)); }
  { const j = jprof(CHIN); loNear.push(J(CHIN, j.wt, 0)); loFar.push(J(CHIN, -j.wt, 0)); }
  const gap = [...upEdge, ...loNear.slice().reverse()];
  const mg = K.id('mg');
  const g0 = H(60, 0, 10), g1 = H(NOSE, 0, 10);
  K.def(`<linearGradient id="${mg}" gradientUnits="userSpaceOnUse" x1="${f(g0[0])}" y1="${f(g0[1])}" x2="${f(g1[0])}" y2="${f(g1[1])}"><stop offset="0" stop-color="#1e0608"/><stop offset=".55" stop-color="#7a1608"/><stop offset="1" stop-color="#ff8a1e"/></linearGradient>`);
  s += poly(gap, `url(#${mg})`, 2.6);
  s += poly([...loNear, ...loFar.slice().reverse()], GUM[1], 2.2);
  // forked tongue with a stud
  {
    const tg = [];
    for (let si = 30; si <= CHIN - 26; si += 10) { const w = lerp(9, 5, (si - 30) / (CHIN - 56)); tg.push([si, w]); }
    const L = tg.map(([si, w]) => J(si, w, 1)), R = tg.map(([si, w]) => J(si, -w, 1));
    const tip = [J(CHIN - 8, 6, 1), J(CHIN - 18, 0, 1), J(CHIN - 8, -6, 1)];
    s += poly([...L, tip[0], tip[1], tip[2], ...R.slice().reverse()], TONGUE[1], 2.2);
    s += line(tg.slice(1).map(([si]) => J(si, 0, 1)), TONGUE[2], 1.4, ' opacity=".8"');
    s += poly([...L.slice(0, -1), ...tg.slice(0, -1).map(([si, w]) => J(si, w * 0.3, 1)).reverse()], TONGUE[0], 0, ' opacity=".7"');
    const st = J(CHIN - 46, 0, 2);
    s += `<circle cx="${f(st[0])}" cy="${f(st[1])}" r="2.8" fill="${CHROME[1]}" stroke="${P.ink}" stroke-width="1.4"/><circle cx="${f(st[0] - 0.8)}" cy="${f(st[1] - 0.8)}" r="0.9" fill="#fff"/>`;
  }
  // far lower teeth (darker, deeper in the mouth)
  for (let si = 22; si <= CHIN - 6; si += 15) {
    const j = jprof(si), p = J(si, -j.wt + 2, 0), q = J(si + 5, -j.wt + 2, 0), tp = J(si + 2, -j.wt + 2, 9);
    s += poly([add(p, [3, 0]), tp, add(q, [-3, 0])], BONE[2], 1.6);
  }

  // ---- the lower jaw: near side, chin, near teeth, spikes under the chin
  {
    const top = [], bot = [];
    for (const [si] of JST) { const j = jprof(si); top.push(J(si, j.wt, 0)); bot.push(J(si, j.wb, -j.d)); }
    // spikes along the underside (behind the jaw side)
    for (const [si, len] of [[30, 16], [70, 14], [108, 11]]) { const j = jprof(si), p = J(si, j.wb - 4, -j.d + 3); s += chromeSpike(p[0], p[1], len, 118, 8); }
    for (let i = 0; i < JST.length - 1; i++) {
      const q = [top[i], top[i + 1], bot[i + 1], bot[i]];
      s += poly(q, i === 0 ? D[2] : i === 1 ? G[2] : G[1], 2.8);
      s += K.carbon(q, { op: 0.12, scale: 5 });
      s += line([add(top[i], [1.5, 2.4]), add(top[i + 1], [-1, 2.4])], T.rim, 1.6, ' opacity=".45"');
    }
    // chin cap
    const e = JST[JST.length - 1], j = jprof(e[0]);
    s += poly([J(e[0], -j.wt, 0), J(e[0], j.wt, 0), J(e[0], j.wb, -j.d), J(e[0], -j.wb, -j.d)], G[1], 2.8);
    s += K.hatch(pathOf([top[0], top[1], bot[1], bot[0]]), { density: 0.6, len: [5, 10], w: 1.5 });
    s += K.rivets([lerpP(top[1], bot[1], 0.55), lerpP(top[2], bot[2], 0.5)], 1.8);
    // hazard stripe on the chin (the Borderlands touch)
    {
      const hz = [J(CHIN - 24, j.wt + 0.5, -2), J(CHIN - 2, j.wt + 0.5, -2), J(CHIN - 2, j.wb + 0.5, -11), J(CHIN - 24, j.wb + 0.5, -11)];
      s += K.hazard(hz, { w: 3.2 });
    }
    // lower teeth on the near edge, pointing up
    const sizes = [9, 7, 12, 8, 10, 7, 15, 9, 8];
    let k = 0;
    for (let si = 14; si <= CHIN - 8; si += 15) {
      const jj = jprof(si), p = J(si, jj.wt, 0), q = J(si + 9, jj.wt, 0), h = sizes[k++ % sizes.length];
      const tp = J(si + 4, jj.wt, h);
      s += poly([p, tp, q], BONE[1], 2.2) + poly([p, tp, lerpP(p, q, 0.5)], BONE[0]);
    }
  }

  // ---- the upper head: bands of bolted plates
  const PT = STA.map(([a, ct, cs, cb, wt, ws, wb]) => ({ FT: H(a, -wt, ct), NT: H(a, wt, ct), NS: H(a, ws, cs), NB: H(a, wb, cb), FS: H(a, -ws, cs), FB: H(a, -wb, cb) }));
  for (let i = 0; i < STA.length - 1; i++) {
    const A = PT[i], B = PT[i + 1], fam = FAM[SEGF[i]];
    const side = [A.NS, B.NS, B.NB, A.NB], cham = [A.NT, B.NT, B.NS, A.NS], top = [A.FT, B.FT, B.NT, A.NT];
    s += poly(side, fam[2], 3);
    s += K.carbon(side, { op: 0.14, scale: 5 });
    s += poly(cham, fam[1], 3);
    s += poly(top, fam[0], 3);
    if (SEGF[i] !== 'rust') s += K.carbon(top, { op: 0.1, scale: 5 });
    s += line([add(A.NT, [0, 1.6]), add(B.NT, [0, 1.6])], T.rim, 1.6, ' opacity=".55"');
    s += K.rivets([lerpP(lerpP(A.NS, B.NS, 0.12), lerpP(A.NB, B.NB, 0.12), 0.15), lerpP(lerpP(A.NS, B.NS, 0.88), lerpP(A.NB, B.NB, 0.88), 0.15),
      lerpP(lerpP(A.NS, B.NS, 0.12), lerpP(A.NB, B.NB, 0.12), 0.85), lerpP(lerpP(A.NS, B.NS, 0.88), lerpP(A.NB, B.NB, 0.88), 0.85)], 1.8);
  }
  s += K.hatch(pathOf([PT[0].NS, PT[2].NS, PT[2].NB, PT[0].NB]), { density: 0.55, len: [6, 11], w: 1.6 });
  // the nose cap (front)
  {
    const E = PT[PT.length - 1];
    s += poly([E.FT, E.NT, E.NS, E.NB, E.FB, E.FS], G[1], 3);
    s += line([add(E.FT, [1.5, 2]), add(E.NT, [1, 1.5])], T.rim, 1.6, ' opacity=".6"');
  }
  // the lip plate along the mouth line with rivets
  {
    const a0 = 48, a1 = NOSE, top = [], bot = [];
    for (let a = a0; a <= a1 + 0.1; a += (a1 - a0) / 11) { const p = prof(a); top.push(H(a, p.wb + 1, p.cb + 7)); bot.push(H(a, p.wb + 1, p.cb)); }
    s += poly([...top, ...bot.slice().reverse()], G[1], 2.4);
    s += line(top.map((p) => add(p, [0, 1.5])), T.rim, 1.4, ' opacity=".5"');
    s += K.rivets(top.filter((_, i) => i % 2).map((p, i) => lerpP(p, bot[i * 2 + 1], 0.5)), 1.5);
  }
  // upper teeth along the near mouth edge, pointing down (two big fangs)
  {
    const sizes = [8, 11, 7, 18, 9, 12, 8, 10, 20, 9];
    let k = 0;
    for (let a = 54; a <= NOSE - 8; a += 12.5) {
      const p0 = prof(a), p1 = prof(a + 10);
      const pa = H(a, p0.wb + 1, p0.cb + 1), pb = H(a + 10, p1.wb + 1, p1.cb + 1), h = sizes[k++ % sizes.length];
      const tp = add(lerpP(pa, pb, 0.6), [-1.5, h]);
      s += poly([pa, tp, pb], BONE[1], 2.2) + poly([pa, tp, lerpP(pa, pb, 0.5)], BONE[0]);
    }
  }

  // ---- the eye: socket, glowing orange eye, eyeliner, a heavy angry brow plate with a spike
  {
    const p = prof(58), e = H(58, p.ws - 1, p.cs - 11);
    s += `<g transform="${sideT(e)}"><path d="M-15 2 Q-2 -12 15 -6 Q8 8 -15 2 Z" fill="#120d10" stroke="${P.ink}" stroke-width="2.4"${NS}/></g>`;
    K.glow(`<g transform="${sideT(e)}"><ellipse cx="0" cy="-1" rx="20" ry="13" fill="${FIRE.c}" opacity=".6" filter="url(#bloom)"/>` +
      `<path d="M-11 1 Q-1 -9 11 -5 Q5 5 -11 1 Z" fill="${K.vgrad(FIRE.core, FIRE.c)}"/>` +
      `<path d="M1 -6 Q3 -1 1 4" stroke="#2a0b02" stroke-width="2.6" fill="none"/><circle cx="-4" cy="-3" r="1.3" fill="#fff"/></g>`);
    const br = H(52, p.ws + 4, p.cs + 6);
    s += chromeSpike(br[0] + 22, br[1] - 14, 22, -28, 9);
    s += `<g transform="${sideT(e)}"><path d="M11 -5 L23 -13 L13 -3 Z" fill="${P.ink}"/>` +
      `<path d="M-24 4 L-13 -11 L6 -17 L28 -24 L26 -12 L4 -8 L-11 -2 Z" fill="${G[1]}" stroke="${P.ink}" stroke-width="3"${NS} stroke-linejoin="round"/>` +
      `<path d="M-21 2 L-12 -10 L6 -16 L26 -22.5" fill="none" stroke="${G[0]}" stroke-width="2"${NS}/>` +
      `<path d="M-11 -2 L4 -8 L26 -12" fill="none" stroke="${P.ink}" stroke-width="3.5" opacity=".55"${NS}/></g>`;
    s += K.rivets([add(e, [18, -19]), add(e, [-3, -13])], 1.7);
  }
  // ---- nostrils (on the top of the snout)
  for (const b of [-8, 8]) {
    const n = H(NOSE - 12, b, prof(NOSE - 12).ct + 1);
    s += `<g transform="${topT(n)}"><ellipse rx="8.5" ry="6.5" fill="${G[1]}" stroke="${P.ink}" stroke-width="2.6"${NS}/><ellipse cx="-1.5" cy="0.8" rx="4.6" ry="3.4" fill="#120d10"/></g>`;
  }
  // ---- the cheekbone: a raised riveted ridge from under the eye back to the ear
  {
    const pts0 = [], pts1 = [];
    for (const a of [44, 26, 8, -10, -26]) { const p = prof(a); pts0.push(H(a, p.ws + 3, p.cs - 18 - (44 - a) * 0.12)); pts1.push(H(a, p.ws + 3, p.cs - 27 - (44 - a) * 0.1)); }
    const ridge = [...pts0, ...pts1.slice().reverse()];
    s += poly(ridge, G[1], 2.8);
    s += line(pts0.map((p) => add(p, [0, 1.8])), G[0], 1.8, ' opacity=".9"');
    s += poly([...pts1, ...pts1.slice().reverse().map((p) => add(p, [0, 6]))], P.ink, 0, ' opacity=".35" filter="url(#soft)"');
    s += K.rivets([lerpP(pts0[1], pts1[1], 0.5), lerpP(pts0[3], pts1[3], 0.5)], 1.7);
  }
  // ---- a rusty plate bolted on the snout top, a stapled crack on the cheek
  {
    const c = H(NOSE - 52, 0, prof(NOSE - 52).ct + 0.5);
    s += `<g transform="${topT(c)}"><rect x="-13" y="-9" width="24" height="17" fill="${T.rust[1]}" stroke="${P.ink}" stroke-width="2.2"${NS}/><rect x="-11" y="-7" width="20" height="4" fill="${T.rust[0]}" opacity=".8"/>` +
      `<circle cx="-9" cy="4" r="1.6" fill="${P.ink}"/><circle cx="7" cy="4" r="1.6" fill="${P.ink}"/><circle cx="-9" cy="-4" r="1.6" fill="${P.ink}"/><circle cx="7" cy="-4" r="1.6" fill="${P.ink}"/></g>`;
    const k = H(-4, prof(-4).ws, 30);
    s += `<g transform="${sideT(k)}"><path d="M-14 -10 L-6 -4 L-9 3 L0 8 L-2 15" fill="none" stroke="${P.ink}" stroke-width="2.4" stroke-linejoin="round"${NS}/>` +
      [[-10, -7], [-7, 0], [-4, 6], [-1, 12]].map(([x, y]) => `<path d="M${x - 4} ${y - 2} L${x + 4} ${y + 2}" stroke="${P.ink}" stroke-width="3.4"/><path d="M${x - 4} ${y - 2} L${x + 4} ${y + 2}" stroke="${CHROME[1]}" stroke-width="1.5"/>`).join('') + `</g>`;
  }
  // ---- a scrap patch and a pink tag on the snout
  {
    const p = prof(NOSE - 70), c = H(NOSE - 70, p.ws, (p.cs + p.cb) / 2 + 4);
    s += `<g transform="${sideT(c)}"><rect x="-9" y="-7" width="18" height="12" fill="${T.rust[1]}" stroke="${P.ink}" stroke-width="2"${NS}/><path d="M-6 -4 h12" stroke="${T.rust[0]}" stroke-width="1.5"/>` +
      `<circle cx="-6" cy="2" r="1.3" fill="${P.ink}"/><circle cx="6" cy="2" r="1.3" fill="${P.ink}"/></g>`;
    const h2 = H(NOSE - 38, prof(NOSE - 38).ws, prof(NOSE - 38).cs - 6);
    s += `<g transform="${sideT(h2)}"><path d="M-4 0 l3 -5 l3 5 l3 -5 l3 5" fill="none" stroke="${PINK.c}" stroke-width="2.2" stroke-linejoin="round"${NS}/></g>`;
  }

  // ---- the mohawk: hot-pink liberty spikes along the top centre line
  {
    const fins = [[60, 24], [44, 38], [27, 49], [10, 54], [-7, 51], [-23, 42], [-37, 31], [-48, 19]];
    let glowD = '', glowF = '';
    for (const [a, h] of fins) {
      const p = prof(a);
      const b0 = H(a + 12, 0, prof(a + 12).ct - 4), b1 = H(a - 10, 0, prof(a - 10).ct - 4), tip = H(a - 15, 0, p.ct + h);
      s += fin(b0, b1, tip, { sw: 3 });
      glowD += `M${M(lerpP(b0, b1, 0.2))} L${M(lerpP(lerpP(b0, b1, 0.2), tip, 0.92))} `;
      glowF += `<polygon points="${pts([b0, tip, b1])}"/>`;
    }
    K.glow(`<g fill="${PINK.c}" opacity=".6" filter="url(#bloom)">${glowF}</g>` +
      `<path d="${glowD}" stroke="${PINK.core}" stroke-width="2" stroke-linecap="round" fill="none" opacity=".95"/>`);
  }
  // ---- the ear frill (near side, behind the cheek): a scalloped fan on chrome
  // spines, rings pierced through its edge and a safety pin across it
  {
    const root = H(-4, 37, 36), t1 = H(-52, 42, 70), t2 = H(-68, 44, 42), t3 = H(-50, 42, 12);
    const e1 = lerpP(root, t1, 0.86), e2 = lerpP(root, t2, 0.88), e3 = lerpP(root, t3, 0.86);
    const m12 = lerpP(lerpP(e1, e2, 0.5), root, 0.22), m23 = lerpP(lerpP(e2, e3, 0.5), root, 0.22);
    const mem = `M${M(root)} L${M(e1)} Q${M(m12)} ${M(e2)} Q${M(m23)} ${M(e3)} Z`;
    for (const t of [t1, t2, t3]) s += chromeSpike(...lerpP(root, t, 0.6), Math.hypot(t[0] - root[0], t[1] - root[1]) * 0.42, (Math.atan2(t[1] - root[1], t[0] - root[0]) * 180) / Math.PI, 7);
    s += `<path d="${mem}" fill="${HOT[2]}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>`;
    s += `<path d="M${M(root)} L${M(e1)} Q${M(m12)} ${M(e2)} Z" fill="${HOT[1]}"/>`;
    s += line([lerpP(root, e1, 0.2), lerpP(root, e1, 0.95)], HOT[0], 1.6, ' opacity=".9"');
    for (const t of [e1, e2, e3]) s += line([root, t], P.ink, 5.2) + line([root, t], G[1], 2.4) + line([add(root, [0, -1]), add(t, [0, -1])], G[0], 0.9, ' opacity=".8"');
    s += `<path d="${mem}" fill="none" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>`;
    // two hoops hanging from the lower scallop (earrings), a safety pin across the upper half
    const q23 = lerpP(lerpP(e2, e3, 0.5), m23, 0.5);
    s += ring(q23[0] + 1, q23[1] + 6, 3.8, 5, 0, 1.9) + ring(e3[0] - 1, e3[1] + 5, 3.4, 4.4, 0, 1.8);
    const sp = lerpP(root, e1, 0.3);
    s += safetyPin(sp[0], sp[1] + 3, 30, 4, 1.15);
    s += `<circle cx="${f(root[0])}" cy="${f(root[1])}" r="5.5" fill="${G[2]}" stroke="${P.ink}" stroke-width="2.4"/><circle cx="${f(root[0] - 1.5)}" cy="${f(root[1] - 1.5)}" r="1.6" fill="${T.rim}"/>`;
  }
  // ---- the near horn
  s += horn(K, H(-14, 18, 72), H(-72, 26, 72), H(-102, 30, 118), 13, [CHROME[0], CHROME[1], CHROME[2]]);

  // ---- smoke from the nostrils
  {
    const n = H(NOSE - 12, 0, prof(NOSE - 12).ct + 6);
    s += smoke(n[0] - 2, n[1] - 10, 5, 0.9) + smoke(n[0] + 8, n[1] - 26, 7, 0.75);
  }
  // ---- fire licking from the mouth
  {
    const m = MUZ;
    K.glow(`<ellipse cx="${f(m[0] + 10)}" cy="${f(m[1])}" rx="44" ry="26" fill="${FIRE.c}" opacity=".55" filter="url(#bloom)"/>`);
    flameJet(K, m[0] + 24, m[1] + 2, 86, 184, { w: 1 });
    for (const [dx, dy, r] of [[-62, -16, 2.2], [-70, 8, 1.8], [-46, 22, 1.6], [-80, -6, 1.4], [-30, -26, 1.5]]) K.glow(`<circle cx="${f(m[0] + dx)}" cy="${f(m[1] + dy)}" r="${r * 2.6}" fill="${FIRE.c}" opacity=".6" filter="url(#bloom)"/><circle cx="${f(m[0] + dx)}" cy="${f(m[1] + dy)}" r="${r}" fill="${FIRE.core}"/>`);
  }
  // ---- the nose ring: a chrome septum ring hanging from the snout tip (drawn
  // after the fire so it stays on top; its ends tuck into the nose)
  {
    const [cx, cy] = H(NOSE + 3, 0, 27), rx = 9, ry = 11;
    const P1 = [cx + rx * Math.cos((212 * Math.PI) / 180), cy + ry * Math.sin((212 * Math.PI) / 180)];
    const P2 = [cx + rx * Math.cos((-32 * Math.PI) / 180), cy + ry * Math.sin((-32 * Math.PI) / 180)];
    const d = `M${M(P1)} A${rx} ${ry} 0 1 0 ${M(P2)}`;
    K.glow(`<path d="${d}" fill="none" stroke="${P.ink}" stroke-width="7.4" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${CHROME[1]}" stroke-width="3.4" stroke-linecap="round"/>` +
      `<path d="M${f(cx - rx * 0.95)} ${f(cy + ry * 0.2)} A${rx} ${ry} 0 0 0 ${f(cx - rx * 0.2)} ${f(cy + ry * 0.98)}" fill="none" stroke="${CHROME[0]}" stroke-width="1.6" stroke-linecap="round"/>` +
      `<circle cx="${f(cx + rx * 0.98)}" cy="${f(cy + ry * 0.15)}" r="3.4" fill="${CHROME[1]}" stroke="${P.ink}" stroke-width="2"/>`);
  }
  return s;
}
// The mouth (muzzle): between the jaws at the front.
const MUZ = (() => { const a = H(NOSE, 6, 22), b = J(CHIN, 6, 0); return lerpP(a, b, 0.45).map((v) => +v.toFixed(1)); })();

// ------------------------------------------------------------------ the tower
const dragon = {
  id: 'dragon', family: 'dragon', tier: 'I', order: 5, name: 'Dragon',
  role: 'Area denial: lobs globs of napalm that leave fire patches burning on the road; best against slow, dense, armoured crowds, useless against drones.',
  weapon: 'A scrap-metal punk dragon head on a napalm-tank furnace that spits arcing globs of burning napalm from its mouth.',
  muzzle: MUZ,
  build(K) {
    const shadow = K.shadow(CX + 8, GY, 124, 60, 150);
    const bodyP = K.part('b-body', () => {
      let s = K.basePlate({ cx: CX, cy: GY, grate: false, hazard: false, led: CY, accent: PINK });
      s += K.ao(TX + 8, SKIRT.y1 + 4, SKIRT.r + 12, (SKIRT.r + 12) * Q, 0.55);
      // the flag at the back right (behind the tank); its top stays >= 20 px under
      // the jaw when the head is mirrored to face right (the snout covers x 344-504)
      s += flag(K, 362, 380, 268);
      s += skirt(K);
      s += body(K);
      s += furnace(K);
      // the shoulder's shadow on the leather
      const cid = K.id('c');
      K.def(`<clipPath id="${cid}"><path d="${band(TX, BODY.y0, BODY.y1, BODY.r)}"/></clipPath>`);
      s += `<g clip-path="url(#${cid})"><ellipse cx="${f(TX + 6)}" cy="${f(SHO.y1 + SHO.r * Q + 2)}" rx="${f(SHO.r)}" ry="9" fill="${P.ink}" opacity=".55" filter="url(#soft)"/></g>`;
      s += shoulder(K);
      s += neck(K);
      s += hoses(K);
      return s;
    });
    const props = K.part('b-props', () => {
      let s = '';
      // the chain sagging across the tank front
      // two swags of chain across the tank, hooked on the furnace door's frame
      // (they hang between the studded straps, so the stud rows stay clear)
      for (const [a0, a1] of [[2.95, 1.93], [1.21, 0.2]]) {
        const p0 = ep(TX, BODY.y0 + 17, BODY.r + 2, a0), p1 = ep(TX, BODY.y0 + 17, BODY.r + 2, a1);
        s += chain(p0, p1, 13, 7, 1.8);
        for (const q of [p0, p1]) s += `<circle cx="${f(q[0])}" cy="${f(q[1])}" r="3" fill="${G[2]}" stroke="${P.ink}" stroke-width="2"/>`;
      }
      // the amp stack with the vertical neon sign on top (front left)
      s += amp(K);
      s += `<path d="M150 404 V392 M174 404 V392" stroke="${P.ink}" stroke-width="4"/>`;
      s += neonSign(K, 140, 286, 24, 108, 'DRAGON', PINK);
      // napalm drums (front right)
      s += napalm(K, 372, 418, 13) + napalm(K, 350, 440, 14);
      s += K.box({ x: 302, y: 458, w: 24, h: 14, d: 14, tones: [NAPALM[0], NAPALM[1], NAPALM[2], NAPALM[3]], stroke: 2.6 });
      return s;
    });
    const headP = K.part('head', () => head(K), PIV);
    return K.doc(`<g id="base">${bodyP}${props}</g>` + headP, { title: 'Dragon', shadow });
  },
};

export default [dragon];

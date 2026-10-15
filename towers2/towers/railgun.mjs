// RAILGUN: a slow, heavy, piercing shot that punches through a line of enemies
// (Kingdom Rush's artillery role). Signature: orange rail glow + red laser.
//
// From the reference (ref/railgun.png), redrawn in our ink / cel / hatching style:
//   - a massive round armoured tower on the shared octagonal plate that flares at
//     the bottom (a bell of dark block-panel wall with raised buttresses), then a
//     waist of stacked sections: a yellow-striped hazard hoop, a coolant ring whose
//     slots glow copper-orange behind paired capsules, two riveted steel bands with
//     big rivets, a spiked upper ring
//   - the crown: a wide ring painted in orange / black hazard stripes between steel
//     lips, a riveted bracket plate with stud spikes at the front, spikes left and
//     right (and two at the back), a recessed deck with a grate ring
//   - at the foot: an arched armoured door (front left) with a plank door, a grate
//     and hazard strips before it, a cluster of hydraulic pods on the left with a
//     red hose, graffiti on the lower front (magenta / cyan / green), olive shells
//     with brass bands stacked in two piles, two rusty barrels at the right
//   - head layer: a turntable and an A-frame yoke with a trunnion hub carrying the
//     railgun: a receiver with a yellow readout, a rear block with an orange vent,
//     kill tallies and a hanging armour plate, a long twin-rail barrel open on the
//     near side so its orange core glows the whole length, cyan accent stripes and
//     ring, yellow chevrons, a cyan tip light, a C-shaped muzzle; a small green
//     screen on a cable; a laser sight with a red beam
//
// Layering: <g id="base"> holds two parts so the props get their own ink outline
// over the tower: b-body (plate, tower, crown) and b-props (pods, door, shells,
// barrels). The head is one part; the gun is drawn in its own oblique frame
// (G(a, b, c): a along the barrel towards the muzzle, b towards the viewer, c up),
// squashed like the plate's ellipses so it sits on the round turntable.
import { T, CX, GY, P, f } from '../tkit.mjs';

const pts = (a) => a.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
const lerp = (a, b, t) => a + (b - a) * t;
const Q = 0.5; // ellipse ratio of the view (ry = rx * Q), same as the plate
const D2R = Math.PI / 180;
const ep = (cx, y, r, a) => [cx + Math.cos(a) * r, y + Math.sin(a) * r * Q];
const arcP = (cx, y, r, a0, a1, n = 8) => { const o = []; for (let i = 0; i <= n; i++) o.push(ep(cx, y, r, lerp(a0, a1, i / n))); return o; };
const poly = (p, fill, sw = 0, extra = '') => `<polygon points="${pts(p)}" fill="${fill}"${sw ? ` stroke="${P.ink}" stroke-width="${sw}" stroke-linejoin="round"` : ''}${extra}/>`;
const line = (p, col, w, extra = '') => `<polyline points="${pts(p)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const pathOf = (p) => `M${pts(p).replace(/ /g, ' L')}Z`;
const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
const n4 = (v) => (+v).toFixed(4);

const TX = CX + 8; // tower axis: the tower sits a little right of the plate centre
const OR = T.orange, RED = T.red, CY = T.cyan, GRN = T.green, MAG = T.magenta;
// Palettes (light -> dark)
const WALL = [T.dark[0], T.dark[1], T.dark[2], T.dark[3], T.dark[4]];    // recessed block wall
const PANEL = [T.gun[1], T.gun[2], T.dark[1], T.dark[2], T.dark[4]];     // raised armour panels
const BAND = [T.gun[0], T.gun[1], T.gun[2], T.gun[3]];                   // steel hoops
const HAZ = ['#f7a64a', '#e8862a', '#b05a12', '#6e3308'];                // painted orange
const COPPER = ['#ffb27a', '#d9773f', '#9c4c1f', '#5f2a0d'];
const HOSE = ['#d0574a', '#9c3328'];
const GT = { top: '#98a3b6', end: T.gun[1], side: T.gun[2], deep: T.gun[3] }; // gun faces

// The tower stack (centre-line heights of each ring; the front of a ring is y + r * Q).
const CR = { yT: 156, yB: 198, r: 94 };          // crown
const S1 = { y0: 198, y1: 232, r: 69 };          // spiked upper ring
const H1 = { y: 239, r: 73, w: 14 };             // riveted band
const S2 = { y0: 246, y1: 270, r: 67 };
const H2 = { y: 276, r: 72, w: 13 };             // riveted band
const S3 = { y0: 282, y1: 306, r: 65 };          // coolant ring
const H3 = { y: 310, r: 70, w: 11 };             // hazard hoop
const FL = { y0: 314, y1: 392, r0: 65, r1: 82 }; // flared foot
const flR = (y) => FL.r0 + (FL.r1 - FL.r0) * Math.pow(Math.min(1, Math.max(0, (y - FL.y0) / (FL.y1 - FL.y0))), 1.7);

// ------------------------------------------------------------------ helpers
// Front half of a cylinder side between two heights.
function band(cx, yTop, yBot, rx) {
  const ry = rx * Q;
  return `M${f(cx - rx)} ${f(yTop)} A${f(rx)} ${f(ry)} 0 0 0 ${f(cx + rx)} ${f(yTop)} L${f(cx + rx)} ${f(yBot)} A${f(rx)} ${f(ry)} 0 0 1 ${f(cx - rx)} ${f(yBot)} Z`;
}
// A strip of a surface of revolution between angles a0 -> a1 (a0 left) and
// centre-line heights y0 -> y1; rOf(y) = radius at that height.
function strip(cx, rOf, y0, y1, a0, a1, nA = 5, nY = 6) {
  const o = [];
  for (let i = 0; i <= nA; i++) o.push(ep(cx, y0, rOf(y0), lerp(a0, a1, i / nA)));
  for (let j = 1; j < nY; j++) { const y = lerp(y0, y1, j / nY); o.push(ep(cx, y, rOf(y), a1)); }
  for (let i = nA; i >= 0; i--) o.push(ep(cx, y1, rOf(y1), lerp(a0, a1, i / nA)));
  for (let j = nY - 1; j > 0; j--) { const y = lerp(y0, y1, j / nY); o.push(ep(cx, y, rOf(y), a0)); }
  return o;
}
// Cel tone for a surface facing angle a (light from the left).
function toneAt(K, a, tones, jit = 0.12) {
  const b = -Math.cos(a) * 0.95 + K.rand(-jit, jit);
  return b > 0.5 ? tones[0] : b > -0.05 ? tones[1] : b > -0.6 ? tones[2] : tones[3];
}
// Panel staves round the front of a ring: lit left, dark right, carbon, seams.
function staves(K, { cx = TX, y0, y1, rOf, n = 8, tones = PANEL, seams = 0, rivets = false, carbon = true, stroke = 2.4, from = Math.PI, to = 0 }) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a0 = lerp(from, to, i / n) - 0.012, a1 = lerp(from, to, (i + 1) / n) + 0.012;
    const am = (a0 + a1) / 2;
    const p = strip(cx, rOf, y0, y1, a0, a1);
    s += poly(p, toneAt(K, am, tones), stroke);
    if (carbon) s += K.carbon(p, { op: 0.14, scale: 5 });
    if (-Math.cos(am) > 0.2) s += line(arcP(cx, y0 + 2.5, rOf(y0) - 1.5, a0 - 0.01, a1 + 0.01, 4), T.rim, 1.8, ' opacity=".45"');
    for (let k = 1; k <= seams; k++) {
      const y = lerp(y0, y1, k / (seams + 1) + ((i % 2) ? 0.06 : -0.06));
      s += line(arcP(cx, y, rOf(y), a0, a1, 4), P.ink, 1.7, ' opacity=".6"');
    }
    if (rivets) {
      const [x1, yy1] = ep(cx, y0, rOf(y0), am), [x2, yy2] = ep(cx, y1, rOf(y1), am);
      s += K.rivets([[x1, yy1 + 5], [x2, yy2 - 5]], 1.9);
    }
  }
  return s;
}
// Hatching over the right (shadow) third of a ring.
function shadeHatch(K, y0, y1, rOf, density = 0.65) {
  const p = strip(TX, rOf, y0, y1, Math.PI, 0, 20, 8);
  const r = Math.max(rOf(y0), rOf(y1));
  return K.hatch(pathOf(p), { density, bbox: [TX + r * 0.42, y0 - 4, TX + r + 4, y1 + r * Q + 4] });
}
// Plain armoured ring section.
function section(K, { y0, y1, r }, n = 8, seams = 0) {
  const rOf = () => r;
  let s = `<path d="${band(TX, y0, y1, r)}" fill="${PANEL[4]}" stroke="${P.ink}" stroke-width="3.5"/>`;
  s += staves(K, { y0, y1, rOf, n, seams });
  s += shadeHatch(K, y0, y1, rOf);
  return s;
}
// Protruding steel hoop with a lit top ledge and big rivets; haz = hazard patch at the front.
function hoop(K, { y, r, w }, { rivets = [160, 128, 96, 64, 32], haz = false } = {}) {
  let s = `<ellipse cx="${f(TX)}" cy="${f(y - w / 2)}" rx="${f(r)}" ry="${f(r * Q)}" fill="${BAND[1]}" stroke="${P.ink}" stroke-width="2.8"/>`;
  s += `<path d="${band(TX, y - w / 2, y + w / 2, r)}" fill="${K.bands(BAND)}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>`;
  s += line(arcP(TX, y - w / 2 + 2, r - 1.5, Math.PI * 0.97, Math.PI * 0.42, 12), T.rim, 2, ' opacity=".55"');
  if (haz) s += K.hazard(strip(TX, () => r, y - w / 2 + 2, y + w / 2 - 2, 108 * D2R, 72 * D2R, 6, 2), { w: 5 });
  s += K.hatch(band(TX, y - w / 2, y + w / 2, r), { density: 0.5, len: [6, 12], bbox: [TX + r * 0.5, y - w, TX + r, y + w / 2 + r * Q] });
  for (const ad of rivets) {
    const [x, yy] = ep(TX, y, r, ad * D2R);
    if (haz && ad > 70 && ad < 110) continue;
    s += `<circle cx="${f(x)}" cy="${f(yy)}" r="3.6" fill="${BAND[2]}" stroke="${P.ink}" stroke-width="2"/><circle cx="${f(x - 1.1)}" cy="${f(yy - 1.2)}" r="1.3" fill="${T.rim}" opacity=".8"/>`;
  }
  return s;
}
// A spike sticking out of a ring at angle aDeg (screen length foreshortened).
function ringSpike(K, y, r, aDeg, len = 22, w = 10) {
  const a = aDeg * D2R;
  const [x, yy] = ep(TX, y, r - 2, a);
  const k = Math.max(0.55, Math.hypot(Math.cos(a), Math.sin(a) * Q));
  return K.spike(x, yy, len * k, Math.atan2(Math.sin(a) * Q, Math.cos(a)) / D2R, w);
}
// Cel shading overlay for painted bands (hard stops, ink at rising opacity to the right).
function shadeGrad(K) {
  const id = K.id('sh');
  const st = [[0, '#fff', 0.12], [0.28, '#000', 0], [0.6, P.ink, 0.3], [0.84, P.ink, 0.5]];
  let g = '';
  st.forEach(([o, c, op], i) => { const e = i + 1 < st.length ? st[i + 1][0] : 1; g += `<stop offset="${o}" stop-color="${c}" stop-opacity="${op}"/><stop offset="${e}" stop-color="${c}" stop-opacity="${op}"/>`; });
  K.def(`<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">${g}</linearGradient>`);
  return `url(#${id})`;
}
function mesh(K, pitch = 6, col = T.gun[1]) {
  const id = K.id('ms');
  K.def(`<pattern id="${id}" width="${pitch}" height="${pitch}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="${pitch}" height="${pitch}" fill="${T.dark[4]}"/><path d="M0 0 V${pitch} M0 0 H${pitch}" stroke="${col}" stroke-width="1.4"/></pattern>`);
  return `url(#${id})`;
}

// ------------------------------------------------------------------ the tower
// The coolant ring: raised panels with recessed slots that glow copper-orange
// behind pairs of capsules.
function coolant(K, { y0, y1, r }) {
  let s = `<path d="${band(TX, y0, y1, r)}" fill="${T.dark[4]}" stroke="${P.ink}" stroke-width="3.5"/>`;
  const n = 8;
  const glowFill = K.vgrad('#ffcf8a', '#c4561a');
  const panels = [];
  for (let i = 0; i < n; i++) {
    const a0 = lerp(Math.PI, 0, i / n), a1 = lerp(Math.PI, 0, (i + 1) / n), am = (a0 + a1) / 2;
    if (i % 2 === 0) { panels.push([a0, a1, am]); continue; }
    // the slot: warm inner light, then two capsules across it
    const sp = strip(TX, () => r - 3, y0 + 3, y1 - 3, a0, a1, 5, 3);
    s += poly(sp, glowFill, 2.4);
    const [xl] = ep(TX, y0, r, a0), [xr] = ep(TX, y0, r, a1);
    const w = Math.abs(xr - xl) * 0.78;
    if (w > 7) {
      for (const t of [0.34, 0.72]) {
        const yc = lerp(y0, y1, t);
        const [x, yy] = ep(TX, yc, r - 3, am);
        s += `<rect x="${f(x - w / 2)}" y="${f(yy - 3.6)}" width="${f(w)}" height="7.2" rx="3.6" fill="${T.dark[2]}" stroke="${P.ink}" stroke-width="2"/>`;
        s += `<rect x="${f(x - w / 2 + 2)}" y="${f(yy - 2.6)}" width="${f(w - 4)}" height="2" rx="1" fill="${T.gun[1]}" opacity=".8"/>`;
        for (const u of [0.22, 0.78]) s += `<rect x="${f(x - w / 2 + w * u - 1.6)}" y="${f(yy - 3.6)}" width="3.2" height="7.2" fill="${COPPER[1]}" stroke="${P.ink}" stroke-width="1.2"/>`;
      }
      const [gx, gy] = ep(TX, (y0 + y1) / 2, r, am);
      K.glow(`<ellipse cx="${f(gx)}" cy="${f(gy)}" rx="${f(w * 0.75)}" ry="15" fill="${OR.c}" opacity=".4" filter="url(#bloom)"/>`);
    }
  }
  for (const [a0, a1, am] of panels) {
    const p = strip(TX, () => r + 1.5, y0, y1, a0 + 0.02, a1 - 0.02);
    s += poly(p, toneAt(K, am, PANEL), 2.6);
    s += K.carbon(p, { op: 0.14, scale: 5 });
    if (-Math.cos(am) > 0.2) s += line(arcP(TX, y0 + 2.5, r, a0, a1, 4), T.rim, 1.8, ' opacity=".45"');
  }
  s += shadeHatch(K, y0, y1, () => r, 0.5);
  return s;
}

// A buttress plate running down the flare at angle am, sticking out more at the foot.
function buttress(K, am, da = 0.085) {
  const { y0, y1 } = FL;
  const bump = (y) => 2 + 8 * Math.pow((y - y0) / (y1 - y0), 1.4);
  const rB = (y) => flR(y) + bump(y);
  const a0 = am + da, a1 = am - da;
  const front = strip(TX, rB, y0, y1, a0, a1, 3, 12);
  const edge = am > Math.PI / 2 ? a1 : a0; // the side that faces the viewer
  const side = [];
  for (let j = 0; j <= 12; j++) { const y = lerp(y0, y1, j / 12); side.push(ep(TX, y, flR(y), edge)); }
  for (let j = 12; j >= 0; j--) { const y = lerp(y0, y1, j / 12); side.push(ep(TX, y, rB(y), edge)); }
  let s = poly(side, am > Math.PI / 2 ? T.dark[3] : T.gun[2], 2.6);
  s += poly(front, toneAt(K, am, PANEL, 0.05), 3);
  s += K.carbon(front, { op: 0.16, scale: 5 });
  if (-Math.cos(am) > -0.5) {
    const e = [];
    for (let j = 0; j <= 12; j++) { const y = lerp(y0 + 2, y1 - 2, j / 12); e.push(ep(TX + 1.6, y, rB(y) - 1, a0 - 0.012)); }
    s += line(e, T.rim, 2, ' opacity=".5"');
  }
  const rv = [];
  for (const t of [0.18, 0.5, 0.82]) { const y = lerp(y0, y1, t); rv.push(ep(TX, y, rB(y), am)); }
  s += K.rivets(rv, 2.2);
  return s;
}

// The flared foot: a bell of block-panel wall with buttresses, graffiti on the front.
function flare(K) {
  const { y0, y1 } = FL;
  let s = poly(strip(TX, flR, y0, y1, Math.PI, 0, 24, 12), WALL[4], 3.5);
  s += staves(K, { y0, y1, rOf: flR, n: 12, tones: WALL, seams: 2, stroke: 2.2 });
  s += shadeHatch(K, y0, y1, flR, 0.6);
  for (const ad of [172, 108, 68, 28]) s += buttress(K, ad * D2R);
  // graffiti on the front panels (spray paint, not neon)
  s += K.graffiti(TX - 4, 404, 'PEW', CY.c, { size: 15, rot: -9 });
  s += heart(TX - 22, 374, 7, MAG.c);
  s += `<path d="M${f(TX + 4)} 424 l8 -6 l4 5 l9 -8" stroke="${GRN.c}" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>`;
  s += K.graffiti(TX + 49, 392, 'ZK', MAG.c, { size: 13, rot: -16 });
  s += `<path d="M${f(TX + 40)} 412 q6 -10 12 -2 q6 8 12 -4" stroke="${CY.c}" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".8"/>`;
  return s;
}
function heart(x, y, r, col) {
  return `<path d="M${f(x)} ${f(y + r)} C${f(x - r * 1.6)} ${f(y - r * 0.2)} ${f(x - r * 0.7)} ${f(y - r * 1.4)} ${f(x)} ${f(y - r * 0.5)} C${f(x + r * 0.7)} ${f(y - r * 1.4)} ${f(x + r * 1.6)} ${f(y - r * 0.2)} ${f(x)} ${f(y + r)} Z" fill="none" stroke="${col}" stroke-width="3" stroke-linejoin="round" opacity=".85"/>` +
    `<path d="M${f(x - r * 0.4)} ${f(y - r * 0.2)} l${f(r * 0.6)} ${f(r * 0.5)}" stroke="${col}" stroke-width="2.4" opacity=".8"/>`;
}

// The crown: a wide ring in orange / black hazard paint between steel lips, a
// recessed deck with a grate ring, bracket plates, stud spikes and side spikes.
function crown(K) {
  const { yT, yB, r } = CR;
  let s = '';
  // spikes at the back (behind the wall, poking out past its silhouette)
  for (const ad of [208, 332]) s += ringSpike(K, (yT + yB) / 2 - 4, r - 6, ad, 26, 11);
  const wall = band(TX, yT, yB, r);
  s += `<path d="${wall}" fill="${HAZ[1]}" stroke="${P.ink}" stroke-width="4"/>`;
  const pid = K.id('oh');
  K.def(`<pattern id="${pid}" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)"><rect width="24" height="24" fill="${HAZ[1]}"/><rect width="11" height="24" fill="${P.ink}" opacity=".93"/></pattern>`);
  s += `<path d="${band(TX, yT + 9, yB - 7, r)}" fill="url(#${pid})"/>`;
  s += `<path d="${band(TX, yT, yT + 9, r)}" fill="${K.bands(BAND)}" stroke="${P.ink}" stroke-width="2.6"/>`;
  s += `<path d="${band(TX, yB - 7, yB, r)}" fill="${K.bands([T.gun[1], T.gun[2], T.gun[3], T.gun[4]])}" stroke="${P.ink}" stroke-width="2.6"/>`;
  // block seams
  for (let i = 1; i < 11; i++) {
    const a = lerp(Math.PI, 0, i / 11) + K.rand(-0.04, 0.04);
    const [x, y] = ep(TX, yT, r, a);
    s += `<path d="M${f(x)} ${f(y + 1)} V${f(y + yB - yT - 1)}" stroke="${P.ink}" stroke-width="2.4" opacity=".85"/>`;
  }
  s += `<path d="${wall}" fill="${shadeGrad(K)}"/>`;
  s += K.hatch(wall, { density: 0.55, bbox: [TX + r * 0.5, yT, TX + r, yB + r * Q] });
  s += line(arcP(TX, yT + 2.5, r - 1.5, Math.PI * 0.98, Math.PI * 0.45, 14), T.rim, 2.2, ' opacity=".6"');
  s += `<path d="${wall}" fill="none" stroke="${P.ink}" stroke-width="4"/>`;
  // the deck: rim of blocks, recess with a back wall, floor with a grate ring
  s += `<ellipse cx="${f(TX)}" cy="${f(yT)}" rx="${f(r)}" ry="${f(r * Q)}" fill="${K.bands([T.gun[0], T.gun[1], T.gun[2], T.gun[3]])}" stroke="${P.ink}" stroke-width="4"/>`;
  const ri = r - 14;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + 0.1;
    const [x0, y0] = ep(TX, yT, ri, a), [x1, y1] = ep(TX, yT, r, a);
    s += `<path d="M${f(x0)} ${f(y0)} L${f(x1)} ${f(y1)}" stroke="${P.ink}" stroke-width="2.2" opacity=".75"/>`;
  }
  s += `<ellipse cx="${f(TX)}" cy="${f(yT)}" rx="${f(ri)}" ry="${f(ri * Q)}" fill="${T.dark[3]}" stroke="${P.ink}" stroke-width="2.8"/>`;
  const cid = K.id('c');
  K.def(`<clipPath id="${cid}"><ellipse cx="${f(TX)}" cy="${f(yT)}" rx="${f(ri)}" ry="${f(ri * Q)}"/></clipPath>`);
  const fy = yT + 6;
  let fl = `<ellipse cx="${f(TX)}" cy="${f(fy)}" rx="${f(ri)}" ry="${f(ri * Q)}" fill="${T.dark[2]}" stroke="${P.ink}" stroke-width="2.4"/>`;
  const go = ri - 6, gi = 50;
  fl += `<path d="M${f(TX - go)} ${f(fy)} A${f(go)} ${f(go * Q)} 0 1 0 ${f(TX + go)} ${f(fy)} A${f(go)} ${f(go * Q)} 0 1 0 ${f(TX - go)} ${f(fy)} Z M${f(TX - gi)} ${f(fy)} A${f(gi)} ${f(gi * Q)} 0 1 1 ${f(TX + gi)} ${f(fy)} A${f(gi)} ${f(gi * Q)} 0 1 1 ${f(TX - gi)} ${f(fy)} Z" fill="${mesh(K)}" fill-rule="evenodd" stroke="${P.ink}" stroke-width="2"/>`;
  s += `<g clip-path="url(#${cid})">${fl}</g>`;
  s += K.rivets([0.3, 1.1, 1.9, 2.7, 3.5, 4.3, 5.1, 5.9].map((a) => ep(TX, yT, r - 7, a)), 2);
  // side bracket plates and the big front bracket with two stud spikes
  for (const ad of [142, 38]) s += bracket(K, ad * D2R, 16, 0);
  s += bracket(K, Math.PI / 2, 26, 2);
  // side spikes
  s += ringSpike(K, yT + 16, r, 184, 28, 12) + ringSpike(K, yB - 6, r, 177, 24, 10);
  s += ringSpike(K, yT + 16, r, -4, 28, 12) + ringSpike(K, yB - 6, r, 3, 24, 10);
  return s;
}
// A riveted steel bracket plate down the crown face at angle a; studs = cone studs.
function bracket(K, a, w, studs) {
  const { yT, yB, r } = CR;
  const [x, yt] = ep(TX, yT, r + 1, a);
  const k = Math.abs(Math.sin(a));
  const hw = (w / 2) * Math.max(0.55, k);
  const yb = yt + (yB - yT) + (studs ? 16 : 6);
  const p = [[x - hw, yt - 5], [x + hw, yt - 5], [x + hw, yb - 6], [x + hw - 6, yb], [x - hw + 6, yb], [x - hw, yb - 6]];
  let s = poly(p, a > Math.PI * 0.6 ? T.gun[1] : a < Math.PI * 0.4 ? T.gun[3] : T.gun[2], 3.2);
  s += `<path d="M${f(x - hw + 2.5)} ${f(yt - 2)} V${f(yb - 6)}" stroke="${T.rim}" stroke-width="2" opacity=".6"/>`;
  s += `<path d="M${f(x + hw - 3)} ${f(yt)} V${f(yb - 6)}" stroke="${P.ink}" stroke-width="2" opacity=".5"/>`;
  if (studs) {
    for (const yy of [yt + 12, yb - 13]) {
      s += `<circle cx="${f(x)}" cy="${f(yy)}" r="6.5" fill="${T.gun[2]}" stroke="${P.ink}" stroke-width="2.6"/>`;
      s += `<path d="M${f(x - 5.5)} ${f(yy - 1)} L${f(x + 0.5)} ${f(yy + 1.5)} L${f(x - 1)} ${f(yy - 6)} Z" fill="${T.gun[0]}"/>`;
      s += `<circle cx="${f(x + 0.5)}" cy="${f(yy + 1.5)}" r="1.4" fill="${P.ink}"/>`;
    }
  } else s += K.rivets([[x, yt + 4], [x, yb - 9]], 2);
  return s;
}

// ------------------------------------------------------------------ props
// Hydraulic pod: a steel capsule with copper bands and a dome cap.
function pod(K, x, yBot, r = 8, h = 40) {
  let s = K.cyl({ cx: x, y: yBot, rx: r, ry: r * Q, h, tones: [T.gun[1], T.gun[2], T.gun[3], T.gun[4]], top: 'none', stroke: 3, hatch: false });
  s += `<path d="M${f(x - r)} ${f(yBot - h)} A${f(r)} ${f(r * 1.05)} 0 0 1 ${f(x + r)} ${f(yBot - h)} A${f(r)} ${f(r * Q)} 0 0 1 ${f(x - r)} ${f(yBot - h)} Z" fill="${T.gun[1]}" stroke="${P.ink}" stroke-width="3"/>`;
  s += `<path d="M${f(x - r * 0.55)} ${f(yBot - h - r * 0.45)} q${f(r * 0.3)} ${f(-r * 0.4)} ${f(r * 0.7)} ${f(-r * 0.5)}" stroke="${T.rim}" stroke-width="2" fill="none" opacity=".7"/>`;
  s += K.hoop(x, yBot - h * 0.28, r + 0.5, (r + 0.5) * Q, 5, COPPER[1]) + K.hoop(x, yBot - h * 0.66, r + 0.5, (r + 0.5) * Q, 4, COPPER[2]);
  s += `<path d="M${f(x - r + 2.5)} ${f(yBot - h + 2)} V${f(yBot - 3)}" stroke="${T.rim}" stroke-width="1.6" opacity=".45"/>`;
  return s;
}
// The arched armoured porch with a plank door, at angle am on the flare's foot.
function door(K, am) {
  const rr = FL.r1 + 10;
  const [bx, by] = ep(TX, FL.y1 + 2, rr, am);
  const tl = Math.hypot(Math.sin(am), Math.cos(am) * Q);
  const t = [Math.sin(am) / tl, (-Math.cos(am) * Q) / tl];          // along the face, left -> right
  const rl = Math.hypot(Math.cos(am), Math.sin(am) * Q);
  const din = [(-Math.cos(am) / rl) * 16, ((-Math.sin(am) * Q) / rl) * 16]; // into the tower
  const M = (px, py) => [bx + t[0] * px, by + t[1] * px + py];
  const w = 46, h = 64, fr = 9;
  const O = [M(-w / 2, 0), M(-w / 2, -h + 14), M(-w / 2 + 14, -h), M(w / 2 - 14, -h), M(w / 2, -h + 14), M(w / 2, 0)];
  let s = '';
  // roof facets and the right side, receding into the tower
  s += poly([O[1], O[2], add(O[2], din), add(O[1], din)], T.gun[1], 3);
  s += poly([O[2], O[3], add(O[3], din), add(O[2], din)], T.gun[0], 3);
  s += poly([O[3], O[4], add(O[4], din), add(O[3], din)], T.gun[2], 3);
  s += poly([O[4], O[5], add(O[5], din), add(O[4], din)], T.dark[2], 3);
  s += K.hatch(pathOf([O[4], O[5], add(O[5], din), add(O[4], din)]), { density: 0.9, len: [6, 12] });
  // front frame
  s += poly(O, T.gun[1], 3.5);
  s += K.carbon(O, { op: 0.16, scale: 5 });
  const I = [M(-w / 2 + fr, 0), M(-w / 2 + fr, -h + fr + 11), M(-w / 2 + fr + 9, -h + fr), M(w / 2 - fr - 9, -h + fr), M(w / 2 - fr, -h + fr + 11), M(w / 2 - fr, 0)];
  // frame block joints and a lit edge
  for (const [a, b] of [[M(-w / 2, -24), M(-w / 2 + fr, -24)], [M(w / 2 - fr, -30), M(w / 2, -30)], [M(-4, -h), M(-4, -h + fr)], [M(-w / 2 + 6, -h + 8), M(-w / 2 + fr + 3, -h + fr + 5)]]) s += line([a, b], P.ink, 2.2, ' opacity=".8"');
  s += line([add(O[0], [1.8, -2]), add(O[1], [1.8, 1]), add(O[2], [1, 2]), add(O[3], [-1, 2])], T.rim, 2, ' opacity=".55"');
  // the plank door, set back, with its left reveal and straps
  s += poly(I, P.wood[2], 3);
  const cid = K.id('c');
  K.def(`<clipPath id="${cid}"><polygon points="${pts(I)}"/></clipPath>`);
  let d = '';
  for (let k = 1; k < 5; k++) { const px = -w / 2 + fr + k * ((w - fr * 2) / 5); d += line([M(px, 0), M(px, -h)], P.ink, 1.8, ' opacity=".7"'); }
  d += poly([I[0], I[1], add(I[1], din, 0.35), add(I[0], din, 0.35)], P.ink, 0, ' opacity=".55"');
  d += poly([I[1], I[2], I[3], I[4], add(I[4], [0, 7]), add(I[1], [0, 7])], P.ink, 0, ' opacity=".35"');
  for (const py of [-12, -34]) d += line([M(-w / 2 + fr, py), M(w / 2 - fr, py)], P.ink, 4.4) + line([M(-w / 2 + fr, py - 0.5), M(w / 2 - fr, py - 0.5)], P.iron[2], 1.8);
  d += line([M(-w / 2 + fr + 2, -h + fr + 12), M(-w / 2 + fr + 2, -2)], P.wood[0], 1.8, ' opacity=".6"');
  s += `<g clip-path="url(#${cid})">${d}</g>`;
  const [lx, ly] = M(-5, -24);
  s += `<ellipse cx="${f(lx)}" cy="${f(ly)}" rx="3.6" ry="4.2" fill="${P.brass[1]}" stroke="${P.ink}" stroke-width="2"/><circle cx="${f(lx)}" cy="${f(ly)}" r="1.3" fill="${P.ink}"/>`;
  s += K.rivets([M(-w / 2 + 4.5, -6), M(w / 2 - 4.5, -6), M(-w / 2 + 4.5, -h + 18), M(w / 2 - 4.5, -h + 18)], 1.8);
  // a sticker on the frame
  const [sx, sy] = M(w / 2 - 6, -h + 22);
  s += `<rect x="${f(sx - 3)}" y="${f(sy)}" width="6" height="8" fill="${MAG.c}" stroke="${P.ink}" stroke-width="1.4" opacity=".9" transform="rotate(14 ${f(sx)} ${f(sy)})"/>`;
  return { s, M, din, w };
}

// ------------------------------------------------------------------ the gun
// Oblique frame of the gun (squashed like the plate): a along the barrel towards
// the muzzle, b across it towards the viewer, c up.
const U = [-0.8762, 0.241], N = [0.4819, 0.4381];
const frame = (O) => (a, b, c) => [O[0] + U[0] * a + N[0] * b, O[1] + U[1] * a + N[1] * b - c];
// SVG transforms that put local 2D drawings on the gun's faces (no mirroring).
const sideM = (G, a, b, c) => { const [x, y] = G(a, b, c); return `matrix(${n4(-U[0])} ${n4(-U[1])} 0 1 ${f(x)} ${f(y)})`; };
const endM = (G, a, b, c) => { const [x, y] = G(a, b, c); return `matrix(${n4(N[0])} ${n4(N[1])} 0 1 ${f(x)} ${f(y)})`; };
const NS = ' vector-effect="non-scaling-stroke"';
// A box in the gun frame: top, near side (b1) and front end (a1) are the visible faces.
function gbox(G, [a0, a1], [b0, b1], [c0, c1], { top = GT.top, side = GT.side, end = GT.end, sw = 3, rim = true } = {}) {
  const tp = [G(a0, b0, c1), G(a1, b0, c1), G(a1, b1, c1), G(a0, b1, c1)];
  const sd = [G(a0, b1, c1), G(a1, b1, c1), G(a1, b1, c0), G(a0, b1, c0)];
  const en = [G(a1, b0, c1), G(a1, b1, c1), G(a1, b1, c0), G(a1, b0, c0)];
  let s = poly(sd, side, sw) + poly(en, end, sw) + poly(tp, top, sw);
  if (rim) s += line([add(G(a0, b1, c1), [0, 2]), add(G(a1, b1, c1), [1.5, 2])], T.rim, 1.8, ' opacity=".5"');
  return s;
}

function gun(K) {
  const tc = [TX + 6, 143]; // turntable top centre
  const O = [tc[0], tc[1] - 56];
  const G = frame(O);
  let s = '';
  // turntable on the crown deck, with its own contact shadow
  s += K.ao(tc[0] + 6, 160, 56, 22, 0.5);
  s += K.cyl({ cx: tc[0], y: 162, rx: 54, ry: 27, h: 8, tones: [T.gun[1], T.gun[2], T.gun[3], T.gun[4]], top: 'flat', topTone: T.gun[2], stroke: 3.5, hatch: false });
  s += K.rivets([0.4, 1.2, 2.0, 2.8, 3.6, 4.4, 5.2, 6.0].map((a) => ep(tc[0], 154, 48, a)), 1.9);
  s += K.cyl({ cx: tc[0], y: 154, rx: 42, ry: 21, h: 11, tones: [T.gun[0], T.gun[1], T.gun[2], T.gun[3]], top: 'flat', topTone: T.gun[1], stroke: 3.5, hatch: true });
  s += `<ellipse cx="${f(tc[0])}" cy="${f(tc[1])}" rx="34" ry="17" fill="none" stroke="${P.ink}" stroke-width="2" opacity=".6"/>`;
  s += K.neonRing(tc[0], 149, 42.5, 21.25, CY, 2.6);
  // the yoke: far cheek, base, (gun), near cheek
  const cheek = [[-30, -46], [30, -46], [24, -32], [12, -16], [-12, -16], [-24, -32]];
  s += poly(cheek.map(([a, c]) => G(a, -26, c)), T.dark[2], 3);
  s += gbox(G, [-30, 30], [-24, 24], [-56, -46], { top: T.gun[1], side: T.dark[1], end: T.gun[2] });
  // rear block with an orange vent, kill tallies and a hanging armour plate
  s += gbox(G, [-96, -60], [-19, 19], [-12, 28], { side: T.gun[2], end: T.gun[2] });
  s += K.carbon([G(-96, 19, 28), G(-60, 19, 28), G(-60, 19, -12), G(-96, 19, -12)], { op: 0.16, scale: 5 });
  // receiver
  s += gbox(G, [-64, 34], [-21, 21], [-20, 26]);
  s += K.carbon([G(-64, 21, 26), G(34, 21, 26), G(34, 21, -20), G(-64, 21, -20)], { op: 0.12, scale: 5 });
  s += line([G(-30, 21, 26), G(-30, 21, -20)], P.ink, 2, ' opacity=".7"') + line([G(-64, 21, 2), G(34, 21, 2)], P.ink, 1.8, ' opacity=".55"');
  s += gbox(G, [-58, 22], [-13, 13], [26, 32], { top: T.gun[0] });
  s += K.rivets([G(-52, 13, 29), G(-30, 13, 29), G(-8, 13, 29), G(14, 13, 29)], 1.6);
  // readout panel (yellow dots + chevrons) on the receiver
  s += poly([G(28, 21, 23), G(-6, 21, 23), G(-6, 21, 7), G(28, 21, 7)], '#1c1e25', 2.2);
  let dots = '';
  for (let i = 0; i < 6; i++) dots += `<rect x="${f(4 + i * 4.6)}" y="-21" width="2.8" height="4" fill="${P.hazard[0]}"/>`;
  for (let i = 0; i < 3; i++) dots += `<path d="M${f(8 + i * 6)} -9 l3 -5 h3 l-3 5 Z" fill="${P.hazard[0]}"/>`;
  s += `<g transform="${sideM(G, 28, 21, 0)}">${dots}</g>`;
  // the orange vent on the rear block
  s += poly([G(-63, 19, 24), G(-75, 19, 24), G(-75, 19, 6), G(-63, 19, 6)], '#2a1406', 2.2);
  let vent = '';
  for (let i = 0; i < 3; i++) vent += `<rect x="1.5" y="${f(-22 + i * 5.6)}" width="9" height="2.8" fill="${OR.core}"/>`;
  K.glow(`<g transform="${sideM(G, -63, 19, 0)}"><rect x="0" y="-24" width="12" height="18" fill="${OR.c}" opacity=".85"/>${vent}</g>` +
    `<circle cx="${f(G(-69, 19, 15)[0])}" cy="${f(G(-69, 19, 15)[1])}" r="14" fill="${OR.c}" opacity=".45" filter="url(#bloom)"/>`);
  // kill tallies (yellow paint)
  let tl = '';
  for (let i = 0; i < 4; i++) tl += `M${f(4 + i * 4)} -2 v-11 `;
  tl += 'M2 -4 L19 -11 M24 -2 v-11 M28 -2 v-11';
  s += `<g transform="${sideM(G, -76, 19, 0)}"><path d="${tl}" stroke="${P.ink}" stroke-width="3.6" stroke-linecap="round"${NS}/><path d="${tl}" stroke="${P.hazard[0]}" stroke-width="1.6" stroke-linecap="round"${NS}/></g>`;
  // hanging armour plate at the back
  const hp = [[-98, 30], [-80, 30], [-80, 8], [-88, -2], [-88, -30], [-98, -30]];
  s += poly(hp.map(([a, c]) => G(a, 20, c)), T.dark[3], 2.6);
  s += poly(hp.map(([a, c]) => G(a, 23.5, c)), T.gun[2], 3);
  s += K.rivets([G(-93, 23.5, 22), G(-93, 23.5, -22), G(-84, 23.5, 22)], 1.8);
  s += `<path d="M${pts([G(-96, 23.5, -4), G(-90, 23.5, -4)]).replace(' ', ' L')}" stroke="${RED.c}" stroke-width="2.4" opacity=".75"/>`;
  // barrel collar + the long twin-rail barrel, open on the near side
  s += gbox(G, [34, 64], [-19, 15], [-23, 23], { side: T.gun[2], end: T.gun[3] });
  const A0 = 64, A1 = 184, R = 15, H = 20;
  s += gbox(G, [A0, A1], [-R, R], [-H, H]);
  s += K.carbon([G(A0, R, H), G(A1, R, H), G(A1, R, -H), G(A0, R, -H)], { op: 0.1, scale: 5 });
  // the slot (between the rails) with its floor, and the glowing core
  const sl = 8.5;
  s += poly([G(40, R, sl), G(A1, R, sl), G(A1, R, -sl), G(40, R, -sl)], T.dark[4], 2.4);
  s += poly([G(40, R, -sl), G(A1, R, -sl), G(A1, 5, -sl), G(40, 5, -sl)], T.dark[2]);
  // the C-shaped muzzle: the gap between the rails on the end face
  s += poly([G(A1, R, sl), G(A1, -7, sl), G(A1, -7, -sl), G(A1, R, -sl)], T.dark[4], 2.2);
  s += line([G(A1, -15, H - 2), G(A1, R, H - 2)], T.rim, 1.6, ' opacity=".5"');
  s += K.neon(`M${pts([G(44, 10, 0), G(A1 - 2, 10, 0)]).replace(' ', ' L')}`, OR, 5.5);
  K.glow(`<polygon points="${pts([G(44, R, sl - 2), G(A1, R, sl - 2), G(A1, R, -sl + 2), G(44, R, -sl + 2)])}" fill="${OR.c}" opacity=".35" filter="url(#bloom)"/>` +
    `<circle cx="${f(G(A1, 6, 0)[0])}" cy="${f(G(A1, 6, 0)[1])}" r="9" fill="${OR.c}" opacity=".6" filter="url(#bloom)"/>`);
  // rail ribs along the lower lip
  for (let a = 54; a < A1 - 6; a += 13) s += poly([G(a, R, -sl), G(a + 4, R, -sl), G(a + 4, R, -H + 4), G(a, R, -H + 4)], T.gun[0], 1.4);
  // yellow chevrons on the top, the cyan stripe and ring, the tip light
  for (let i = 0; i < 4; i++) {
    const a = 74 + i * 9;
    s += poly([G(a, -R, H), G(a + 4, -R, H), G(a + 10, R, H), G(a + 6, R, H)], P.hazard[0], 1.4);
    s += poly([G(a + 6, R, H), G(a + 10, R, H), G(a + 10, R, H - 6), G(a + 6, R, H - 6)], P.hazard[1], 1.4);
  }
  s += K.neon(`M${pts([G(70, R - 2, H), G(A1 - 4, R - 2, H)]).replace(' ', ' L')}`, CY, 2.4);
  const ra = 156;
  s += K.neon(`M${pts([G(ra, -R + 2, H), G(ra, R, H), G(ra, R, sl + 1)]).replace(/ /g, ' L')}`, CY, 3);
  s += K.neon(`M${pts([G(ra, R, -sl - 1), G(ra, R, -H + 1)]).replace(' ', ' L')}`, CY, 3);
  s += K.leds([G(A1 - 4, -4, H)], CY, 2.6);
  // duct tape round the collar (the Borderlands fix)
  s += poly([G(46, -19, 23), G(53, -19, 23), G(55, 15, 23), G(48, 15, 23)], '#a19e96', 1.6);
  s += poly([G(48, 15, 23), G(55, 15, 23), G(55, 15, -23), G(48, 15, -23)], '#8e8b84', 1.6);
  // near cheek of the yoke with the trunnion hub
  s += poly(cheek.map(([a, c]) => G(a, 22, c)), T.dark[3], 2.6);
  s += poly(cheek.map(([a, c]) => G(a, 26, c)), T.gun[2], 3.2);
  s += K.carbon(cheek.map(([a, c]) => G(a, 26, c)), { op: 0.14, scale: 5 });
  s += line([add(G(-24, 26, -32), [1.5, 0]), add(G(-12, 26, -16), [1.5, 1.5]), add(G(12, 26, -16), [0, 1.5])], T.rim, 1.8, ' opacity=".5"');
  s += `<g transform="${sideM(G, 0, 26, -30)}"><circle r="12.5" fill="${T.gun[3]}" stroke="${P.ink}" stroke-width="3"${NS}/></g>`;
  s += `<g transform="${sideM(G, 0, 30, -30)}"><circle r="10" fill="${T.gun[1]}" stroke="${P.ink}" stroke-width="2.6"${NS}/><circle r="4.5" fill="${T.gun[3]}" stroke="${P.ink}" stroke-width="2"${NS}/><path d="M-7 -4 A8 8 0 0 1 2 -8" stroke="${T.rim}" stroke-width="2" fill="none"${NS}/></g>`;
  s += K.rivets([G(-22, 26, -42), G(22, 26, -42)], 1.8);
  // the small green screen box on a cable
  s += K.pipe(`M${pts([G(-47, 28, -30)])} Q${pts([G(-44, 34, -52)])} ${pts([G(-26, 24, -50)])}`, 3.4, '#3b6fd8', '#8fb0ff');
  s += gbox(G, [-60, -34], [22, 32], [-30, -6], { side: T.gun[3], end: T.gun[2], top: T.gun[1] });
  const scr = [G(-57, 32, -9), G(-37, 32, -9), G(-37, 32, -27), G(-57, 32, -27)];
  s += poly(scr, GRN.deep, 2);
  let grid = '';
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) grid += `<rect x="${f(3 + c * 4.4)}" y="${f(3 + r * 4.8)}" width="2.8" height="2.6" fill="${GRN.core}"/>`;
  K.glow(`<polygon points="${pts(scr)}" fill="${GRN.c}" opacity=".85"/><g transform="${sideM(G, -37, 32, -9)}" opacity=".9">${grid}</g>` +
    `<polygon points="${pts(scr)}" fill="${GRN.c}" opacity=".4" filter="url(#bloom)"/>`);
  // laser sight on a post, with a cable loop to the receiver, and its red beam
  s += gbox(G, [16, 24], [-4, 4], [32, 37], { rim: false });
  s += K.pipe(`M${pts([G(10, 2, 42)])} Q${pts([G(-6, 2, 62)])} ${pts([G(-28, 0, 32)])}`, 3, HOSE[1], HOSE[0]);
  s += gbox(G, [8, 32], [-8, 8], [36, 47], { top: T.gun[0] });
  s += line([G(30, 8, 45), G(12, 8, 45)], P.ink, 1.6, ' opacity=".6"');
  const lens = G(32, 0, 41.5);
  s += `<g transform="${endM(G, 32, 0, 41.5)}"><circle r="4.6" fill="${RED.deep}" stroke="${P.ink}" stroke-width="2"${NS}/></g>`;
  const end = G(250, 0, 22);
  const bid = K.id('lb');
  K.def(`<linearGradient id="${bid}" gradientUnits="userSpaceOnUse" x1="${f(lens[0])}" y1="${f(lens[1])}" x2="${f(end[0])}" y2="${f(end[1])}"><stop offset="0" stop-color="${RED.c}" stop-opacity=".95"/><stop offset=".55" stop-color="${RED.c}" stop-opacity=".55"/><stop offset="1" stop-color="${RED.c}" stop-opacity="0"/></linearGradient>`);
  K.glow(`<path d="M${f(lens[0])} ${f(lens[1])} L${f(end[0])} ${f(end[1])}" stroke="url(#${bid})" stroke-width="5" opacity=".6" filter="url(#bloom)"/>` +
    `<path d="M${f(lens[0])} ${f(lens[1])} L${f(end[0])} ${f(end[1])}" stroke="url(#${bid})" stroke-width="1.8" stroke-linecap="round"/>` +
    `<g transform="${endM(G, 32, 0, 41.5)}"><circle r="3" fill="${RED.core}"/></g><circle cx="${f(lens[0])}" cy="${f(lens[1])}" r="9" fill="${RED.c}" opacity=".7" filter="url(#bloom)"/>`);
  return s;
}

// ------------------------------------------------------------------ the tower
const railgun = {
  id: 'railgun', family: 'railgun', tier: 'I', order: 1, name: 'Railgun',
  role: 'Slow, heavy artillery: each shot pierces a whole line of enemies on the road.',
  weapon: 'A twin-rail magnetic cannon on a yoke turret, with a glowing orange core and a red laser sight.',
  muzzle: [113, 135],
  build(K) {
    const shadow = K.shadow(CX + 8, GY, 122, 60, 140);
    const body = K.part('b-body', () => {
      let s = K.basePlate({ cx: CX, cy: GY, grate: false, hazard: false, led: T.cyan, accent: T.red });
      s += K.ao(TX + 8, FL.y1 + 4, FL.r1 + 14, (FL.r1 + 14) * Q, 0.55);
      s += flare(K);
      s += hoop(K, H3, { rivets: [164, 136, 44, 16], haz: true });
      s += coolant(K, S3);
      s += hoop(K, H2);
      s += section(K, S2, 8, 1);
      s += hoop(K, H1, { rivets: [166, 140, 114, 88, 62, 36, 12] });
      s += section(K, S1, 8, 0);
      // the crown's shadow on the ring below it
      const cid = K.id('c');
      K.def(`<clipPath id="${cid}"><path d="${band(TX, S1.y0, S1.y1, S1.r)}"/></clipPath>`);
      s += `<g clip-path="url(#${cid})"><ellipse cx="${f(TX + 6)}" cy="${f(CR.yB + CR.r * Q + 2)}" rx="${f(CR.r)}" ry="10" fill="${P.ink}" opacity=".6" filter="url(#soft)"/></g>`;
      s += ringSpike(K, 218, S1.r, 186, 22, 10) + ringSpike(K, 220, S1.r, 152, 20, 9) + ringSpike(K, 220, S1.r, 28, 20, 9) + ringSpike(K, 218, S1.r, -6, 22, 10);
      s += crown(K);
      return s;
    });
    const props = K.part('b-props', () => {
      let s = '';
      // hydraulic pods on the left, with a red hose curling on the plate
      s += K.pipe(`M150 418 C132 424 138 440 160 438 S186 430 178 448`, 4.5, HOSE[0], '#ff9a8a');
      s += pod(K, 158, 402, 8, 42) + pod(K, 168, 410, 8.5, 48) + pod(K, 179, 417, 8, 40);
      // the porch, a grate and hazard strips before it
      const dr = door(K, 134 * D2R);
      const out = [-dr.din[0], -dr.din[1]];
      const gp = [dr.M(-dr.w / 2 + 3, 4), dr.M(dr.w / 2 - 3, 4), add(dr.M(dr.w / 2 - 3, 4), out, 0.95), add(dr.M(-dr.w / 2 + 3, 4), out, 0.95)];
      s += poly(gp, mesh(K, 5), 2.6);
      s += K.hazard([dr.M(dr.w / 2 + 1, 6), dr.M(dr.w / 2 + 24, 6), add(dr.M(dr.w / 2 + 24, 6), out, 0.6), add(dr.M(dr.w / 2 + 1, 6), out, 0.6)], { w: 4.5 });
      s += dr.s;
      // rusty barrels at the right
      s += K.drum(352, 402, 13, 'rust') + K.drum(364, 423, 13, 'rust');
      s += `<rect x="356" y="403" width="11" height="9" fill="${P.hazard[0]}" stroke="${P.ink}" stroke-width="1.6" transform="rotate(-4 361 407)"/><path d="M359 410 l3 -5 l3 5 Z" fill="${P.ink}"/>`;
      // olive shells with brass bands, stacked in two piles (tips to the lower left)
      const ang = 158;
      for (const [x, y] of [[334, 430], [341, 440], [348, 451], [337, 425], [344, 435]]) s += K.shell(x, y, 40, ang, 7.5);
      for (const [x, y] of [[286, 446], [293, 456], [289, 441]]) s += K.shell(x, y, 38, ang, 7.5);
      return s;
    });
    const piv = [TX + 6, 150];
    const head = K.part('head', () => gun(K), piv);
    return K.doc(`<g id="base">${body}${props}</g>` + head, { title: 'Railgun', shadow });
  },
};

export default [railgun];

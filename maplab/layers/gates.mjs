// Enemy gates (north): where the two roads enter the map. They replace the
// reference's two timber gatehouses and read as "enemies come from here":
// red warning lights, hazard stripes, red holo DANGER signs, skull graffiti, spikes.
//
//   left gate:  a busted AEGIS checkpoint in a scrap wall: two concrete guard
//               pillars with red beacons, a snapped boom barrier, knocked-over
//               barriers, a bandit lookout behind the wall
//   right gate: the scrap wall torn open where the road comes through: peeled
//               sheets, rebar, rubble, a bandit buggy that rammed it, warning posts
//
// Owner: north. Also exports the north artist's shared helpers (pond.mjs and
// mine.mjs import them). Coordinates are 2x map px; light from the upper-left;
// depth recedes up-right (kit convention: depth d -> 0.22 d right, 0.5 d up).
import { P, MP, f } from '../mapkit.mjs';

// ------------------------------------------------------------ palette
export const WARN = { c: '#ff3b2f', core: '#ffe2d6', deep: '#8a1208' };   // enemy red
export const AMB = MP.amber;
export const TOX = MP.toxic;
export const MAG = P.laser;
export const CYN = P.shock;
export const CON = ['#c4ae92', '#93857a', '#5e5366', '#463e4f', '#2e2836'];
export const STL = ['#c4cbc9', '#8c969a', '#5c6273', '#3d4152', '#272a36'];
export const RST = ['#de8f52', '#b0612f', '#7a3f22', '#4e2414'];
export const GALV = ['#b8b2a6', '#8d877c', '#625d55', '#423e39'];
export const YEL = ['#f4cf55', '#d6a634', '#9c7420', '#614611'];
export const OLIVE = ['#a6a77e', '#7f8160', '#55594a', '#3a3d34', '#25271f'];
export const DIRT = ['#c48d55', '#a3733f', '#7f562c', '#5a3a1c'];
export const SHADOW = '#22172e';

// ------------------------------------------------------------ svg helpers
export const pts = (a) => a.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
export const dpoly = (a) => `M${a.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')}Z`;
export const poly = (a, fill, sw = 3.5, extra = '') => `<polygon points="${pts(a)}" fill="${fill}"${sw ? ` stroke="${P.ink}" stroke-width="${sw}" stroke-linejoin="round"` : ''}${extra}/>`;
export const ln = (x1, y1, x2, y2, col, w, extra = '') => `<path d="M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="round"${extra}/>`;
export const rect = (x, y, w, h, fill, sw = 3, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${sw ? ` stroke="${P.ink}" stroke-width="${sw}"` : ''}${extra}/>`;
export const P3 = (x, y, z = 0, h = 0) => [x + 0.22 * z, y - 0.5 * z - h];
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

// ------------------------------------------------------------ cast shadows
// Soft violet shadows to the lower-right, collected while building and drawn
// into the ground layer.
export function shade() {
  const list = [];
  const hull = (p) => {
    const a = p.slice().sort((u, v) => u[0] - v[0] || u[1] - v[1]);
    const cr = (o, u, v) => (u[0] - o[0]) * (v[1] - o[1]) - (u[1] - o[1]) * (v[0] - o[0]);
    const lo = [], up = [];
    for (const q of a) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (const q of a.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  };
  const off = (p, h) => p.map(([a, b]) => [a + 0.55 * h, b + 0.16 * h]);
  return {
    box(x, y, w, h, d) { const fp = [[x, y], [x + w, y], P3(x + w, y, d), P3(x, y, d)]; list.push(hull(fp.concat(off(fp, h)))); },
    pole(x, y, h, r = 5) { list.push([[x - r, y], [x + r, y], [x + r + 0.55 * h, y + 0.16 * h], [x - r + 0.55 * h, y + 0.16 * h]]); },
    line(x0, y0, x1, y1, h, t = 6) { const fp = [[x0, y0], [x1, y1], [x1 + t, y1 - t], [x0 + t, y0 - t]]; list.push(hull(fp.concat(off(fp, h)))); },
    blob(cx, cy, rx, ry) { const p = []; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } list.push(p); },
    render(K, op = 0.5) {
      const fid = K.id('nsh');
      K.def(`<filter id="${fid}" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="5"/></filter>`);
      return `<g filter="url(#${fid})" opacity="${op}">${list.map((p) => poly(p, SHADOW, 0)).join('')}</g>`;
    },
  };
}

// ------------------------------------------------------------ structures
// Block in the oblique view, cel-shaded, with cast-concrete detail (after hq.mjs).
export function blk(K, sh, o) {
  const { x, y, w, h, d, t = CON, sw = 4.5, seams = 46, stains = true, grime = true, front, top, hatch = true,
    topFill, sideFill, frontFill, lip = true, shadow = true, chips = true } = o;
  if (shadow && sh) sh.box(x, y, w, h, d);
  const dx = d * 0.22, dy = d * 0.5;
  const F = [[x, y - h], [x + w, y - h], [x + w, y], [x, y]];
  const S = [[x + w, y - h], [x + w + dx, y - h - dy], [x + w + dx, y - dy], [x + w, y]];
  const T = [[x, y - h], [x + dx, y - h - dy], [x + w + dx, y - h - dy], [x + w, y - h]];
  let s = poly(S, sideFill || t[2], sw);
  if (hatch && d > 14) s += K.hatch(dpoly(S), { density: 0.9, op: 0.5, len: [10, 26] });
  s += poly(F, frontFill || t[1], sw);
  const cid = K.id('nbf');
  K.def(`<clipPath id="${cid}"><polygon points="${pts(F)}"/></clipPath>`);
  let inner = '';
  inner += `<rect x="${f(x)}" y="${f(y - h)}" width="${f(Math.min(22, w * 0.14))}" height="${f(h)}" fill="${t[0]}" opacity=".4"/>`;
  inner += `<rect x="${f(x + w - Math.min(26, w * 0.16))}" y="${f(y - h)}" width="${f(Math.min(26, w * 0.16))}" height="${f(h)}" fill="${t[3]}" opacity=".35"/>`;
  if (seams) for (let xx = x + seams; xx < x + w - 10; xx += seams) inner += ln(xx, y - h, xx, y, t[3], 2.4, ' opacity=".7"');
  if (stains) for (let k = 0; k < Math.max(2, w / 40); k++) {
    const xx = x + K.rand(6, w - 6);
    inner += `<path d="M${f(xx)} ${f(y - h + 2)} q${f(K.rand(-3, 3))} ${f(h * 0.3)} ${f(K.rand(-2, 2))} ${f(K.rand(h * 0.25, h * 0.8))}" stroke="${t[4] || t[3]}" stroke-width="${f(K.rand(3, 8))}" opacity=".3" fill="none" stroke-linecap="round"/>`;
  }
  if (grime) {
    const gh = Math.min(24, h * 0.26);
    inner += `<rect x="${f(x)}" y="${f(y - gh)}" width="${f(w)}" height="${f(gh)}" fill="${t[4] || t[3]}" opacity=".35"/>`;
  }
  if (chips) for (let k = 0; k < Math.max(1, w / 90); k++) {
    const xx = x + K.rand(6, w - 18);
    inner += `<path d="M${f(xx)} ${f(y - h)} l${f(K.rand(4, 8))} ${f(K.rand(4, 8))} l${f(K.rand(4, 9))} ${f(-K.rand(3, 7))}" fill="${t[3]}" stroke="${P.ink}" stroke-width="1.8"/>`;
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
export function plate(K, x, y, w, h, tones = RST, { rivets = true, stripe = false, dent = true } = {}) {
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

// Bullet holes punched in a face.
export function bulletHoles(K, x0, y0, x1, y1, n = 5) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = K.rand(x0, x1), y = K.rand(y0, y1), r = K.rand(1.8, 3);
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r + 2.2)}" fill="none" stroke="#e8dccb" stroke-width="1.4" opacity=".55"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${P.ink}"/>`;
  }
  return s;
}

// Rotating warning beacon on a little base.
export function beacon(K, x, y, col = WARN, r = 8) {
  let s = rect(x - r - 3, y - 5, r * 2 + 6, 7, STL[3], 2.5);
  s += `<path d="M${f(x - r)} ${f(y - 5)} A${r} ${f(r * 1.15)} 0 0 1 ${f(x + r)} ${f(y - 5)} Z" fill="${col.c}" stroke="${P.ink}" stroke-width="2.5"/>`;
  s += `<path d="M${f(x - r * 0.5)} ${f(y - 5)} V${f(y - 5 - r * 0.95)} M${f(x + r * 0.5)} ${f(y - 5)} V${f(y - 5 - r * 0.95)}" stroke="${P.ink}" stroke-width="1.8"/>`;
  K.glow(`<circle cx="${f(x)}" cy="${f(y - 9)}" r="${f(r * 3.6)}" fill="${col.c}" opacity=".6" filter="url(#bloom)"/><ellipse cx="${f(x - 2)}" cy="${f(y - 10)}" rx="${f(r * 0.45)}" ry="${f(r * 0.35)}" fill="${col.core}"/>`);
  return s;
}

// A wedge of coloured light (a rotating beacon's beam, a searchlight), light layer.
export function beam(K, x, y, ang, len, spread, col, op = 0.3) {
  const id = K.id('nbm');
  const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
  K.def(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f(x)}" y1="${f(y)}" x2="${f(ex)}" y2="${f(ey)}"><stop offset="0" stop-color="${col.c}" stop-opacity="${op}"/><stop offset="1" stop-color="${col.c}" stop-opacity="0"/></linearGradient>`);
  const nx = -Math.sin(ang) * spread, ny = Math.cos(ang) * spread;
  K.lights.push(`<polygon points="${pts([[x, y], [ex + nx, ey + ny], [ex - nx, ey - ny]])}" fill="url(#${id})"/>`);
}

// Skull (graffiti, holo icons, flags). r ~ half the skull's width.
export function skullSvg(cx, cy, r, fill, hole, { bones = false, stroke = null, sw = 2.5, op = 1 } = {}) {
  const k = r / 18;
  const T = (x, y) => `${f(cx + x * k)} ${f(cy + y * k)}`;
  let s = `<g opacity="${op}">`;
  if (bones) for (const [a, b] of [[[-23, 4], [23, 27]], [[23, 4], [-23, 27]]]) {
    const bone = (col, extra) => `<path d="M${T(...a)} L${T(...b)}" stroke="${col}" stroke-width="${f(6.5 * k + extra)}" stroke-linecap="round"/>` +
      [a, b].map(([px, py]) => `<circle cx="${f(cx + (px + (px < 0 ? -1 : 1) * 1.5) * k)}" cy="${f(cy + (py - 3) * k)}" r="${f(3.6 * k + extra / 2)}" fill="${col}"/><circle cx="${f(cx + (px + (px < 0 ? -1 : 1) * 1.5) * k)}" cy="${f(cy + (py + 3) * k)}" r="${f(3.6 * k + extra / 2)}" fill="${col}"/>`).join('');
    if (stroke) s += bone(stroke, sw * 2);
    s += bone(fill, 0);
  }
  const cran = `M${T(-17, 2)} C${T(-19, -15)} ${T(-9, -21)} ${T(0, -21)} C${T(9, -21)} ${T(19, -15)} ${T(17, 2)} C${T(16, 7)} ${T(12, 8)} ${T(11, 10)} L${T(11, 16)} L${T(-11, 16)} L${T(-11, 10)} C${T(-12, 8)} ${T(-16, 7)} ${T(-17, 2)} Z`;
  s += `<path d="${cran}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"` : ''}/>`;
  s += `<ellipse cx="${f(cx - 7 * k)}" cy="${f(cy + 0.5 * k)}" rx="${f(5.2 * k)}" ry="${f(5.8 * k)}" fill="${hole}"/><ellipse cx="${f(cx + 7 * k)}" cy="${f(cy + 0.5 * k)}" rx="${f(5.2 * k)}" ry="${f(5.8 * k)}" fill="${hole}"/>`;
  s += `<path d="M${T(0, 5.5)} L${T(-3, 10.5)} L${T(3, 10.5)} Z" fill="${hole}"/>`;
  s += `<path d="M${T(-5.5, 11.5)} V${f(cy + 16 * k)} M${T(-1.8, 11.5)} V${f(cy + 16 * k)} M${T(1.8, 11.5)} V${f(cy + 16 * k)} M${T(5.5, 11.5)} V${f(cy + 16 * k)}" stroke="${hole}" stroke-width="${f(1.7 * k)}"/>`;
  return s + '</g>';
}

// Spray-painted skull and crossbones with overspray and drips (put it on a wall).
export function skullTag(K, x, y, r, col = '#f3ede0', { rot = -5, bones = true } = {}) {
  let s = `<g transform="rotate(${rot} ${f(x)} ${f(y)})">`;
  s += `<ellipse cx="${f(x)}" cy="${f(y + r * 0.2)}" rx="${f(r * 1.45)}" ry="${f(r * 1.25)}" fill="${col}" opacity=".12"/>`;
  s += skullSvg(x, y, r, col, '#1d1712', { bones, op: 0.92 });
  for (let i = 0; i < 4; i++) { const xx = x + K.rand(-r, r); const yy = y + r * K.rand(0.7, 1.1); s += `<path d="M${f(xx)} ${f(yy)} v${f(K.rand(5, 16))}" stroke="${col}" stroke-width="2" opacity=".75" stroke-linecap="round"/>`; }
  return s + '</g>';
}

// Red/white barrier stripes.
export function stripes(K, w = 12, a = '#f1e9dc', b = '#d8342a') {
  const id = K.id('nst');
  K.def(`<pattern id="${id}" width="${w * 2}" height="${w * 2}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="${w * 2}" height="${w * 2}" fill="${a}"/><rect width="${w}" height="${w * 2}" fill="${b}"/></pattern>`);
  return `url(#${id})`;
}

// Red holographic sign in a steel bezel. Returns the solid part; the face glows.
export function holoSign(K, x, y, w, h, label, col = WARN, { sub = '', skull = true, size } = {}) {
  let s = '';
  s += rect(x - 10, y - 10, w + 20, h + 20, '#221e27', 4.5);
  s += rect(x - 7, y - 8, w + 14, 6, '#3b3543', 0);
  s += K.rivets([[x - 5, y - 5], [x + w + 5, y - 5], [x - 5, y + h + 5], [x + w + 5, y + h + 5]], 2.4);
  s += K.holo(x, y, w, h, col, 'none');
  const ic = skull ? h * 0.92 : 0;
  if (skull) K.glow(skullSvg(x + ic * 0.55, y + h * 0.5 - h * 0.04, h * 0.3, col.core, col.deep));
  const fs = size || Math.min(h * (sub ? 0.46 : 0.6), ((w - ic) / label.length) * 1.42);
  const tx = x + ic + (w - ic) / 2;
  s += K.text(label, tx, y + h * (sub ? 0.5 : 0.52) + fs * 0.36 - (sub ? 2 : 0), { size: fs, glowCol: col });
  if (sub) s += K.text(sub, tx, y + h - 6, { size: Math.max(9, h * 0.19), glowCol: col, font: 'Chakra' });
  // glitch: a couple of displaced scanline slices
  for (let i = 0; i < 3; i++) {
    const gy = y + K.rand(4, h - 6), gw = K.rand(w * 0.15, w * 0.4), gx = x + K.rand(0, w - gw);
    K.glow(`<rect x="${f(gx + K.rand(-8, 8))}" y="${f(gy)}" width="${f(gw)}" height="${f(K.rand(2, 4))}" fill="${col.core}" opacity=".55"/>`);
  }
  K.glow(`<rect x="${f(x + w + 2)}" y="${f(y + h * 0.3)}" width="${f(K.rand(8, 16))}" height="3" fill="${col.c}" opacity=".7"/>`);
  K.haze(x + w / 2, y + h / 2, w * 0.85, h * 1.7, col, 0.24);
  return s;
}

// Steel I-beam post with a lit flange.
export function ibeam(x, yTop, yBot, w = 10, tones = STL, tip = true) {
  let s = rect(x - w / 2, yTop, w, yBot - yTop, tones[2], 3);
  s += rect(x - w / 2, yTop, w * 0.38, yBot - yTop, tones[0], 0, ' opacity=".7"');
  s += ln(x + w * 0.15, yTop + 3, x + w * 0.15, yBot - 3, tones[3], 1.6);
  if (tip) s += poly([[x - w / 2, yTop], [x - 1, yTop - 13], [x + w / 2, yTop]], tones[1], 2.6);
  return s;
}

// Czech hedgehog anti-vehicle spikes (three welded beams).
export function hedgehog(K, sh, x, y, s = 44, tones = ['#a9a49a', '#77736b', '#4f4b46']) {
  if (sh) sh.blob(x + s * 0.3, y + 4, s * 0.62, s * 0.16);
  let o = K.ao(x, y + 1, s * 0.5, s * 0.14, 0.4);
  o += K.beam(x + s * 0.5, y + 2, x - s * 0.36, y - s * 0.86, 9, tones);
  o += K.beam(x - s * 0.18, y - s * 0.66, x + s * 0.24, y - s * 0.16, 8, tones);
  o += K.beam(x - s * 0.5, y, x + s * 0.42, y - s * 0.84, 9, tones);
  o += K.rivets([[x - s * 0.03, y - s * 0.43]], 2.6);
  return o;
}

// Concrete jersey barrier with a hazard band and red reflectors.
export function jersey(K, sh, x, y, w = 66, h = 30, { paint = true, red = true } = {}) {
  let s = blk(K, sh, { x, y, w, h, d: 22, t: CON, seams: 0, sw: 3.5, hatch: true, lip: true, chips: true });
  s += ln(x + 3, y - h * 0.4, x + w - 3, y - h * 0.4, CON[3], 2.2, ' opacity=".7"');
  if (paint) s += K.hazard([[x + 3, y - h + 5], [x + w - 3, y - h + 5], [x + w - 3, y - h + 13], [x + 3, y - h + 13]], { w: 5 });
  if (red) s += K.leds([[x + 9, y - h * 0.28], [x + w - 9, y - h * 0.28]], WARN, 2.2);
  return s;
}

// Dusty wasteland ground inside a polygon (covers inpainted sand so the road
// keeps its edge): soft-edged dirt, mottling, cracks, pebbles, dry scrub, and a
// darker rim along the edge.
export function wasteland(K, poly0, { tone = '#b07a43', rim = null, soft = 4, box, mottle = 1 } = {}) {
  const cid = K.id('nwl'), fid = K.id('nwf'), rid = K.id('nwr');
  K.def(`<clipPath id="${cid}"><polygon points="${pts(poly0)}"/></clipPath>`);
  K.def(`<filter id="${fid}" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${soft}"/></filter>`);
  K.def(`<filter id="${rid}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>`);
  const xs = poly0.map((p) => p[0]), ys = poly0.map((p) => p[1]);
  const [x0, y0, x1, y1] = box || [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  let s = `<polygon points="${pts(poly0)}" fill="${tone}" filter="url(#${fid})"/>`;
  if (rim) s += `<polyline points="${pts(rim)}" fill="none" stroke="#6f4626" stroke-width="5" stroke-linejoin="round" opacity=".55" filter="url(#${rid})"/>`;
  let m = '';
  const area = (x1 - x0) * (y1 - y0);
  for (let k = 0; k < (area / 1400) * mottle; k++) {
    const x = K.rand(x0, x1), y = K.rand(y0, y1), dark = K.r() < 0.5;
    m += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(K.rand(10, 40))}" ry="${f(K.rand(4, 12))}" fill="${dark ? '#6f4626' : '#e0ad6c'}" opacity="${f(K.rand(0.15, 0.32))}"/>`;
  }
  for (let k = 0; k < area / 9000; k++) {
    let x = K.rand(x0, x1), y = K.rand(y0, y1), d = `M${f(x)} ${f(y)}`;
    for (let j = 0; j < 4; j++) { x += K.rand(-20, 20); y += K.rand(-7, 7); d += ` L${f(x)} ${f(y)}`; }
    m += `<path d="${d}" stroke="#4a2f1a" stroke-width="1.8" fill="none" opacity=".5"/>`;
  }
  for (let k = 0; k < area / 700; k++) {
    const x = K.rand(x0, x1), y = K.rand(y0, y1), r = K.rand(1.4, 3.6);
    m += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r)}" ry="${f(r * 0.65)}" fill="${P.ink}" opacity=".5"/>`;
  }
  for (let k = 0; k < area / 3500; k++) {
    const x = K.rand(x0, x1), y = K.rand(y0, y1);
    let t = '';
    for (let j = 0; j < 5; j++) t += `M${f(x + j * 2 - 4)} ${f(y)} q${f(K.rand(-3, 3))} -6 ${f(K.rand(-6, 6))} ${f(-K.rand(6, 12))}`;
    m += `<path d="${t}" stroke="#5f5a2c" stroke-width="2" fill="none" opacity=".75"/>`;
  }
  return s + `<g clip-path="url(#${cid})">${m}</g>`;
}

// Rubble of scrap: small plates, chunks and pipe bits lying flat (objects layer).
export function scrapBits(K, cx, cy, rx, ry, n = 8, avoid = null) {
  let s = '';
  const items = [];
  for (let i = 0; i < n * 3 && items.length < n; i++) {
    const a = K.rand(0, Math.PI * 2), r = Math.sqrt(K.r());
    const x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r;
    if (avoid && avoid(x, y)) continue;
    items.push([x, y]);
  }
  items.sort((p, q) => p[1] - q[1]);
  for (const [x, y] of items) {
    const t = K.r();
    if (t < 0.45) { // bent sheet
      const w = K.rand(14, 30), h = K.rand(6, 12), sk = K.rand(-6, 6);
      s += poly([[x - w / 2, y], [x + w / 2, y + sk * 0.3], [x + w / 2 + 4, y - h + sk * 0.3], [x - w / 2 + 3, y - h]], K.pick([RST[1], GALV[1], STL[1], YEL[1]]), 2.4);
      s += ln(x - w / 2 + 4, y - h + 2, x + w / 2, y - h + 2 + sk * 0.3, '#ffffff', 1.4, ' opacity=".35"');
    } else if (t < 0.75) { // concrete chunk
      s += K.rock(x, y, K.rand(5, 10));
    } else { // pipe bit
      const L = K.rand(16, 30), a2 = K.rand(-0.5, 0.5);
      s += K.pipe(`M${f(x - Math.cos(a2) * L / 2)} ${f(y - Math.sin(a2) * L / 2)} L${f(x + Math.cos(a2) * L / 2)} ${f(y + Math.sin(a2) * L / 2)}`, 5, RST[1], RST[0]);
    }
  }
  return s;
}

// One junk panel of a scrap wall: q = [topLeft, topRight, bottomRight, bottomLeft].
function wallPanel(K, q, kind) {
  const xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), yt = Math.min(...ys), yb = Math.max(...ys);
  const w = x1 - x0, hh = yb - yt;
  const cid = K.id('nwp');
  K.def(`<clipPath id="${cid}"><polygon points="${pts(q)}"/></clipPath>`);
  let s = '', inner = '';
  if (kind === 'corr') {
    const tn = K.pick([RST, GALV, RST, ['#a9b6ad', '#76877f', '#4e5c57', '#33403c']]);
    s += K.corrugated(q, { tones: tn, angle: 0, pitch: 8 });
    for (let k = 0; k < 3; k++) { const xx = K.rand(x0 + 4, x1 - 4); inner += `<path d="M${f(xx)} ${f(yt)} v${f(K.rand(hh * 0.3, hh * 0.8))}" stroke="${RST[2]}" stroke-width="${f(K.rand(3, 6))}" opacity=".45" stroke-linecap="round"/>`; }
    inner += ln(x0, yt + 9, x1, yt + 9, P.ink, 1.6, ' opacity=".5"') + ln(x0, yb - 10, x1, yb - 10, P.ink, 1.6, ' opacity=".5"');
  } else if (kind === 'plate') {
    const tn = K.pick([STL, RST, OLIVE]);
    s += poly(q, tn[1], 3.5);
    inner += rect(x0, yt, w, 7, tn[0], 0, ' opacity=".55"');
    inner += ln(x0 + 2, yt + hh * K.rand(0.35, 0.6), x1, yt + hh * K.rand(0.35, 0.6), tn[3] || tn[2], 2.6, ' opacity=".8"');
    inner += K.rivets([[x0 + 6, yt + 12], [x1 - 6, yt + 12], [x0 + 6, yb - 8], [x1 - 6, yb - 8]], 2.2);
    inner += plate(K, x0 + K.rand(4, w * 0.3), yt + hh * K.rand(0.25, 0.45), K.rand(w * 0.35, w * 0.55), hh * K.rand(0.22, 0.32), K.pick([RST, GALV, YEL]), { dent: false });
  } else if (kind === 'cont') {
    const tn = MP.container[K.pick(['red', 'blue', 'teal', 'yellow'])];
    s += poly(q, tn[1], 3.5);
    for (let xx = x0 + 5; xx < x1; xx += 9) inner += ln(xx, yt, xx, yb, tn[3], 2.4, ' opacity=".6"') + ln(xx + 3, yt, xx + 3, yb, tn[0], 1.4, ' opacity=".35"');
    inner += rect(x0, yt, w, 6, tn[0], 0, ' opacity=".5"');
    inner += K.text(K.pick(['BW-7', '03', 'XL', 'K9', '88']), x0 + w * 0.5, yt + hh * 0.52, { size: Math.min(15, w * 0.3), color: '#f1e4c8', opacity: 0.75 });
  } else if (kind === 'door') {
    const tn = MP.container[K.pick(['red', 'blue', 'yellow', 'teal'])];
    s += poly(q, tn[1], 3.5);
    const wy0 = yt + hh * 0.12, wy1 = yt + hh * 0.46;
    const win = [[x0 + w * 0.16, wy1], [x0 + w * 0.2, wy0], [x1 - w * 0.12, wy0], [x1 - w * 0.12, wy1]];
    inner += poly(win, '#2f3a44', 3);
    inner += ln(win[1][0] + 4, wy0 + 4, win[1][0] + 12, wy1 - 6, '#8fb3c2', 2, ' opacity=".7"');
    inner += `<path d="M${f(x0 + w * 0.55)} ${f(wy0 + 6)} l-6 9 l8 4 l-5 8" stroke="#d9e6ea" stroke-width="1.4" fill="none" opacity=".75"/>`;
    inner += rect(x1 - w * 0.36, yt + hh * 0.56, w * 0.18, 5, '#2b2630', 2);
    inner += ln(x0 + 3, yt + hh * 0.52, x1 - 3, yt + hh * 0.52, tn[3], 2.2);
    inner += `<ellipse cx="${f(x0 + w * 0.4)}" cy="${f(yt + hh * 0.75)}" rx="${f(w * 0.22)}" ry="${f(hh * 0.08)}" fill="${RST[1]}" opacity=".8"/>`;
  } else if (kind === 'conc') {
    s += poly(q, CON[1], 3.5);
    inner += rect(x0, yt, w, 8, CON[0], 0, ' opacity=".6"');
    inner += K.hazard([[x0, yb - 26], [x1, yb - 26], [x1, yb - 12], [x0, yb - 12]], { w: 7 });
    for (let k = 0; k < 2; k++) { let cx = K.rand(x0 + 6, x1 - 6), cy = yt + K.rand(10, hh * 0.4), d = `M${f(cx)} ${f(cy)}`; for (let j = 0; j < 3; j++) { cx += K.rand(-8, 8); cy += K.rand(6, 12); d += ` L${f(cx)} ${f(cy)}`; } inner += `<path d="${d}" stroke="${P.ink}" stroke-width="1.8" fill="none" opacity=".7"/>`; }
  } else if (kind === 'sign') {
    s += poly(q, YEL[1], 3.5);
    inner += rect(x0, yt, w, 6, YEL[0], 0, ' opacity=".6"');
    const cx = x0 + w / 2, cy = yt + hh * 0.42, a = Math.min(w, hh) * 0.26;
    inner += `<path d="M${f(cx - a)} ${f(cy - a)} L${f(cx)} ${f(cy)} L${f(cx - a)} ${f(cy + a)} M${f(cx)} ${f(cy - a)} L${f(cx + a)} ${f(cy)} L${f(cx)} ${f(cy + a)}" stroke="${P.ink}" stroke-width="${f(a * 0.45)}" fill="none" stroke-linejoin="miter"/>`;
  }
  // foot grime + a few bullet holes
  inner += rect(x0, yb - 16, w, 16, '#2a1f18', 0, ' opacity=".3"');
  if (K.r() < 0.5) inner += bulletHoles(K, x0 + 4, yt + 10, x1 - 4, yb - 20, 3);
  s += `<g clip-path="url(#${cid})">${inner}</g>` + poly(q, 'none', 3.5);
  return s;
}

// Scrap wall: junk panels between steel posts along a ground line (the front
// foot) from (x0, y0) to (x1, y1). tornStart / tornEnd rip that end open.
// deco(at, hAt) can paint on it (graffiti); returns { s, at, hAt }.
export function scrapWall(K, sh, x0, y0, x1, y1, o = {}) {
  const { h = 96, tornStart = false, tornEnd = false, kinds = ['corr', 'plate', 'cont', 'corr', 'door', 'conc', 'corr', 'sign', 'corr', 'plate'], tear = 0.32, endFace = true } = o;
  const L = Math.hypot(x1 - x0, y1 - y0);
  const at = (u) => [lerp(x0, x1, u), lerp(y0, y1, u)];
  const cuts = [0];
  for (let t = K.rand(34, 56); t < L - 22; t += K.rand(36, 60)) cuts.push(t / L);
  cuts.push(1);
  const hk = (u) => {
    let k = 1;
    if (tornStart && u < tear) k = lerp(0.3, 1, smooth(u / tear));
    if (tornEnd && u > 1 - tear) k = lerp(0.3, 1, smooth((1 - u) / tear));
    return h * k;
  };
  sh.line(x0, y0, x1, y1, h);
  const dpt = 16, dx = dpt * 0.22, dy = dpt * 0.5;
  let s = '', tops = [];
  let ki = Math.floor(K.rand(0, kinds.length));
  const H = cuts.map((u) => hk(u) * K.rand(0.92, 1.05));
  for (let i = 0; i < cuts.length - 1; i++) {
    const [ax, ay] = at(cuts[i]), [bx, by] = at(cuts[i + 1]);
    let ha = H[i], hb = H[i + 1];
    // panels sit a bit below / above their neighbours: a ragged skyline
    const lift = K.rand(-7, 7);
    ha += lift; hb += lift;
    const q = [[ax - 1, ay - ha], [bx + 1, by - hb], [bx + 1, by], [ax - 1, ay]];
    // torn panels get a ragged top
    const torn = (tornStart && cuts[i] < tear) || (tornEnd && cuts[i + 1] > 1 - tear);
    if (torn) {
      const m = [lerp(ax, bx, 0.5), lerp(ay - ha, by - hb, 0.5) + K.rand(-10, 12)];
      q.splice(1, 0, m, [lerp(ax, bx, 0.72), lerp(ay - ha, by - hb, 0.72) - K.rand(4, 14)]);
    }
    s += wallPanel(K, q, kinds[ki++ % kinds.length]);
    s += poly([q[0], [q[0][0] + dx, q[0][1] - dy], [q[q.length - 3][0] + dx, q[q.length - 3][1] - dy], q[q.length - 3]], GALV[0], 2.4);
    tops.push([q[0], q[q.length - 3]]);
  }
  // visible end face at the right end
  if (endFace && !tornEnd) {
    const [ex, ey] = at(1), eh = H[H.length - 1];
    s += poly([[ex, ey - eh], [ex + dx, ey - eh - dy], [ex + dx, ey - dy], [ex, ey]], GALV[2], 3);
  }
  // posts with spike tips, barbed wire along the tops
  let posts = '';
  for (let i = 0; i < cuts.length; i++) {
    const [px, py] = at(cuts[i]);
    const ph = H[i] + 12;
    const torn = (tornStart && i === 0) || (tornEnd && i === cuts.length - 1);
    if (torn) continue;
    posts += ibeam(px, py - ph, py + 3, 10, STL, true);
  }
  let wire = '';
  for (const [a, b] of tops) {
    let d = '';
    const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 5));
    for (let k = 0; k <= n; k++) { const u = k / n; d += `${k ? 'L' : 'M'}${f(lerp(a[0], b[0], u) + 2)} ${f(lerp(a[1], b[1], u) - 7 + Math.sin(k * 1.9) * 4)}`; }
    wire += `<path d="${d}" stroke="${P.ink}" stroke-width="2.4" fill="none"/>`;
  }
  return { s: s + posts + wire, at, hAt: (u) => hk(u) };
}

// The ripped-open end of a scrap wall: a peeled sheet bent out toward the
// breach, bent rebar, a leaning snapped post. dir +1 = breach to the right.
export function tornEnd(K, x, y, h, dir = 1) {
  let s = '';
  // snapped post leaning into the gap
  s += `<path d="M${f(x)} ${f(y + 3)} L${f(x + dir * 4)} ${f(y - h * 0.55)} L${f(x + dir * 22)} ${f(y - h * 1.05)}" stroke="${P.ink}" stroke-width="11" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`;
  s += `<path d="M${f(x)} ${f(y + 3)} L${f(x + dir * 4)} ${f(y - h * 0.55)} L${f(x + dir * 22)} ${f(y - h * 1.05)}" stroke="${STL[1]}" stroke-width="5" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`;
  // rebar
  for (let k = 0; k < 3; k++) {
    const yy = y - h * (0.18 + k * 0.17);
    const d = `M${f(x)} ${f(yy)} q${f(dir * 14)} ${f(-6 - k * 3)} ${f(dir * K.rand(24, 38))} ${f(K.rand(-14, 4))}`;
    s += `<path d="${d}" stroke="${P.ink}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${RST[1]}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  }
  // peeled sheet: inner (back) face showing, hinged on the post, bent toward us
  const fl = [[x + dir * 2, y - h * 0.82], [x + dir * 30, y - h * 0.68], [x + dir * 46, y - h * 0.4], [x + dir * 40, y - h * 0.12], [x + dir * 52, y + 10], [x + dir * 6, y + 2]];
  s += K.corrugated(fl, { tones: ['#8d877c', '#625d55', '#423e39'], angle: dir * 22, pitch: 8 });
  s += `<path d="M${f(fl[1][0])} ${f(fl[1][1])} l${f(dir * 5)} 5 l${f(-dir * 2)} 6 l${f(dir * 6)} 4 l${f(-dir * 1)} 8" stroke="${P.ink}" stroke-width="2.4" fill="none"/>`;
  s += ln(fl[0][0], fl[0][1] + 2, fl[1][0], fl[1][1] + 2, '#d9d2c0', 2, ' opacity=".6"');
  return s;
}

// Concrete guard pillar of the checkpoint: hazard foot, red neon strip, beacon.
function guardPillar(K, sh, x, y, { w = 46, h = 132, d = 40, label = '', tag = '', cam = false, side = 1 } = {}) {
  let s = blk(K, sh, {
    x, y, w, h, d, t: CON, seams: 0,
    front: (fx0, fy0, fx1, fy1) => {
      let r = '';
      r += K.hazard([[fx0 + 3, fy1 - 34], [fx1 - 3, fy1 - 34], [fx1 - 3, fy1 - 4], [fx0 + 3, fy1 - 4]], { w: 8 });
      r += plate(K, fx0 + 7, fy0 + 14, w - 14, 30, STL, {});
      if (label) r += K.text(label, (fx0 + fx1) / 2, fy0 + 33, { size: 10, color: '#efe5cb', opacity: 0.95 });
      r += K.neon(`M${f(fx0 + 9)} ${f(fy0 + 54)} V${f(fy0 + 84)}`, WARN, 3.6);
      r += K.neon(`M${f(fx1 - 9)} ${f(fy0 + 54)} V${f(fy0 + 84)}`, WARN, 3.6);
      r += bulletHoles(K, fx0 + 14, fy0 + 50, fx1 - 14, fy1 - 40, 4);
      if (tag) r += K.graffiti((fx0 + fx1) / 2 + 2, fy1 - 40, tag, '#f3ede0', { size: 11, rot: -12 });
      return r;
    },
    top: (T) => { const [tx, ty] = P3(x + w / 2, y, d / 2, h); return beacon(K, tx, ty + 4, WARN, 9); },
  });
  // floodlight / camera on the outer corner
  if (cam) {
    const cx = side > 0 ? x + w + 4 : x - 4, cy = y - h + 26;
    s += rect(cx - 3, cy - 4, 6, 14, STL[3], 2.2);
    s += `<g transform="rotate(${side > 0 ? 38 : -38} ${f(cx)} ${f(cy + 8)})">` + rect(cx - 6, cy + 6, 26 * side, 13, STL[2], 2.8) + `</g>`;
    s += `<path d="M${f(cx + side * 10)} ${f(cy + 26)} q${f(side * 4)} 12 ${f(side * -2)} 26" stroke="${P.ink}" stroke-width="2.6" fill="none"/>`;
  }
  const [bx, by] = P3(x + w / 2, y, d / 2, h);
  K.lightPool(x + w / 2 + 10, y + 16, 110, 34, WARN, 0.32);
  K.haze(bx, by - 6, 70, 50, WARN, 0.3);
  beam(K, bx, by - 8, side > 0 ? 0.5 : 2.7, 190, 34, WARN, 0.18);
  return s;
}

// Bandit lookout behind the left wall: scrap hut on pipe stilts, searchlight, flag.
function lookout(K, sh, x, yBot) {
  const w = 76, legH = 60, hutH = 46, d = 40;
  const deckY = yBot - legH;
  sh.box(x, yBot, w, legH + hutH, d);
  let s = '';
  // legs: back pair first
  const legs = [[x + 8, d], [x + w - 8, d], [x + 8, 0], [x + w - 8, 0]];
  for (const [lx, z] of legs) {
    const [a, b] = P3(lx, yBot, z, 0), [c, e] = P3(lx, yBot, z, legH);
    s += K.pipe(`M${f(a)} ${f(b)} L${f(c)} ${f(e)}`, 7, STL[2], STL[0]);
    if (z === d) continue;
  }
  s += K.pipe(`M${f(x + 8)} ${f(yBot - 6)} L${f(x + w - 8)} ${f(deckY + 8)} M${f(x + w - 8)} ${f(yBot - 6)} L${f(x + 8)} ${f(deckY + 8)}`, 4, RST[2], RST[1]);
  // ladder
  s += `<path d="M${f(x + 30)} ${f(yBot)} V${f(deckY)} M${f(x + 44)} ${f(yBot)} V${f(deckY)}" stroke="${P.ink}" stroke-width="4"/>`;
  for (let yy = yBot - 8; yy > deckY; yy -= 11) s += ln(x + 30, yy, x + 44, yy, P.ink, 2.6);
  // deck
  s += blk(K, null, { x: x - 6, y: deckY + 4, w: w + 12, h: 9, d: d + 6, t: RST, seams: 0, stains: false, grime: false, chips: false, hatch: false, sw: 3.2, lip: false, shadow: false });
  // hut
  s += blk(K, null, {
    x, y: deckY - 4, w, h: hutH, d, t: GALV, seams: 0, shadow: false,
    front: (fx0, fy0, fx1, fy1) => {
      let r = K.corrugated([[fx0, fy0], [fx1, fy0], [fx1, fy1], [fx0, fy1]], { tones: RST, angle: 0, pitch: 8 });
      r += plate(K, fx0 + 46, fy0 + 24, 26, 20, GALV, {});
      // gun slit with a red glow
      r += rect(fx0 + 10, fy0 + 10, 44, 11, '#120e10', 2.6);
      K.glow(`<rect x="${f(fx0 + 12)}" y="${f(fy0 + 13)}" width="40" height="5" fill="${WARN.c}" opacity=".9"/><ellipse cx="${f(fx0 + 36)}" cy="${f(fy0 + 18)}" rx="40" ry="12" fill="${WARN.c}" opacity=".35" filter="url(#bloom)"/>`);
      r += skullSvg(fx0 + 24, fy0 + 34, 8, '#f3ede0', '#2a1f18', { op: 0.9 });
      return r;
    },
    top: (T) => K.corrugated([[T[0][0] - 6, T[0][1] + 2], [T[1][0] - 4, T[1][1] - 3], [T[2][0] + 8, T[2][1] - 3], [T[3][0] + 8, T[3][1] + 2]], { tones: GALV, angle: 20, pitch: 9 }),
  });
  // searchlight on the right corner, aimed down the road
  const sx = x + w + 4, sy = deckY - hutH - 6;
  s += ln(sx, sy + 10, sx, sy - 4, P.ink, 5);
  s += `<g transform="rotate(32 ${f(sx)} ${f(sy - 8)})">` + rect(sx - 8, sy - 16, 26, 16, STL[3], 3) + `</g>`;
  s += K.leds([[sx + 12, sy - 2]], { c: '#ffd6c8', core: '#ffffff' }, 4);
  beam(K, sx + 12, sy, 0.62, 360, 60, { c: '#ffd9c4' }, 0.16);
  // bandit flag
  const fx = x + 6, ftop = deckY - hutH - 48;
  s += `<path d="M${f(fx)} ${f(deckY - hutH)} V${f(ftop)}" stroke="${P.ink}" stroke-width="7" stroke-linecap="round"/><path d="M${f(fx)} ${f(deckY - hutH)} V${f(ftop)}" stroke="${STL[1]}" stroke-width="3"/>`;
  const cloth = `M${f(fx + 2)} ${f(ftop + 2)} C${f(fx + 22)} ${f(ftop - 4)} ${f(fx + 38)} ${f(ftop + 6)} ${f(fx + 50)} ${f(ftop + 2)} L${f(fx + 46)} ${f(ftop + 22)} L${f(fx + 54)} ${f(ftop + 38)} C${f(fx + 36)} ${f(ftop + 42)} ${f(fx + 20)} ${f(ftop + 32)} ${f(fx + 2)} ${f(ftop + 38)} Z`;
  s += `<path d="${cloth}" fill="${P.red[1]}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>`;
  s += `<path d="M${f(fx + 4)} ${f(ftop + 4)} L${f(fx + 18)} ${f(ftop + 2)} L${f(fx + 16)} ${f(ftop + 34)} L${f(fx + 4)} ${f(ftop + 36)} Z" fill="${P.red[0]}" opacity=".7"/>`;
  s += skullSvg(fx + 26, ftop + 19, 8, '#f3ede0', P.red[3], { bones: true, op: 0.95 });
  K.lightPool(x + w * 0.5, yBot + 8, 80, 22, WARN, 0.18);
  return s;
}

// ------------------------------------------------------------ left gate
// Old timber gatehouses, palisade and stone stair, inpainted to ground.
const ERASE_L = [[0, 0], [104, 0], [150, 36], [244, 56], [298, 92], [396, 62], [404, 0], [648, 0], [660, 110], [646, 196], [580, 230], [506, 234],
  [470, 206], [334, 196], [316, 236], [300, 272], [186, 272], [0, 284]];

function leftGate(K, sh) {
  let o = '';
  // behind the wall
  o += K.part('gl-lookout', () => lookout(K, sh, -6, 172));
  o += K.part('gl-rocks-n', () => K.rock(560, 40, 22) + K.rock(600, 56, 16) + K.rock(470, 96, 14) + K.rock(196, 66, 15) + K.rock(640, 120, 18));
  o += K.part('gl-hedgehogs-n', () => hedgehog(K, sh, 456, 150, 40) + hedgehog(K, sh, 252, 112, 36));
  // right wall segment, then the right pillar
  o += K.part('gl-wall-r', () => {
    const W = scrapWall(K, sh, 560, 190, 712, 168, { h: 92, kinds: ['conc', 'corr', 'cont', 'plate', 'corr'] });
    let s = W.s;
    s += skullTag(K, 640, 132, 19, '#f3ede0', { rot: -4 });
    s += K.graffiti(676, 166, 'RR', '#ff3d3d', { size: 16, rot: -8 });
    return s;
  });
  o += K.part('gl-pillar-r', () => guardPillar(K, sh, 520, 194, { label: 'CP-7', tag: 'OPEN 24/7', cam: true, side: 1 }));
  // left wall segment with the big skull and the DANGER sign
  o += K.part('gl-wall-l', () => {
    const W = scrapWall(K, sh, -30, 272, 262, 232, { h: 100, kinds: ['corr', 'cont', 'plate', 'corr', 'door', 'corr', 'conc'] });
    let s = W.s;
    s += skullTag(K, 66, 208, 25, '#f3ede0', { rot: -6 });
    s += K.graffiti(176, 226, 'RUST RAIDERS', '#ff3d3d', { size: 17, rot: -7 });
    s += K.graffiti(196, 196, 'KEEP OUT', '#f3ede0', { size: 12, rot: -9 });
    s += ln(160, 196, 234, 182, '#ff3d3d', 3.2, ' opacity=".9"');
    return s;
  });
  o += K.part('gl-sign', () => {
    let s = '';
    for (const px of [144, 226]) s += ibeam(px, 104, px === 144 ? 150 : 140, 9, STL, false);
    s += K.beam(144, 136, 226, 114, 6, STL);
    s += holoSign(K, 114, 52, 140, 48, 'DANGER', WARN, { sub: 'NO ENTRY' });
    return s;
  });
  o += K.part('gl-pillar-l', () => {
    let s = guardPillar(K, sh, 258, 230, { label: 'AEGIS', side: -1 });
    // boom barrier: pivot box on the pillar, the arm snapped off short
    s += blk(K, sh, { x: 304, y: 230, w: 22, h: 40, d: 22, t: STL, seams: 0, stains: false, chips: false, hatch: false, sw: 3 });
    s += `<g transform="rotate(-9 318 196)">` + rect(318, 190, 58, 11, stripes(K, 9), 3) + `</g>`;
    s += `<path d="M${f(372)} ${f(178)} l8 4 l-5 4 l7 5 l-9 2" fill="${'#f1e9dc'}" stroke="${P.ink}" stroke-width="2.4" stroke-linejoin="round"/>`;
    return s;
  });
  // in front: the snapped boom arm, knocked-over barriers, spikes, rubble
  o += K.part('gl-front', () => {
    let s = '';
    s += `<g transform="rotate(-14 300 262)">` + rect(258, 256, 96, 11, stripes(K, 9), 3) + `</g>`;
    s += hedgehog(K, sh, 352, 266, 42) + hedgehog(K, sh, 420, 282, 38);
    s += jersey(K, sh, 600, 248, 64, 30);
    s += `<g transform="rotate(-16 690 266)">` + jersey(K, null, 660, 266, 60, 28, { red: false }) + `</g>`;
    s += hedgehog(K, sh, 700, 230, 40);
    s += scrapBits(K, 340, 236, 40, 14, 5) + scrapBits(K, 580, 222, 24, 10, 3);
    return s;
  });

  // ground
  let g = '';
  g += wasteland(K, [[0, 0], [108, 0], [150, 40], [172, 70], [230, 100], [290, 140], [330, 190], [340, 240], [300, 276], [0, 290]], { rim: [[108, 0], [150, 40], [172, 70], [230, 100], [290, 140], [330, 190], [340, 240]] });
  g += wasteland(K, [[290, 0], [655, 0], [668, 110], [650, 196], [530, 205], [510, 185], [470, 150], [420, 110], [395, 70], [340, 30]], { rim: [[530, 205], [510, 185], [470, 150], [420, 110], [395, 70], [340, 30], [290, 0]] });
  g += K.tracks('M210 0 C260 70 350 140 420 216 C470 268 540 304 610 350', { w: 12, op: 0.2 });
  // scorch where the barrier was blown
  const sid = K.id('nsc');
  K.def(`<radialGradient id="${sid}"><stop offset="0" stop-color="#1b1310" stop-opacity=".5"/><stop offset=".6" stop-color="#1b1310" stop-opacity=".22"/><stop offset="1" stop-color="#1b1310" stop-opacity="0"/></radialGradient>`);
  g += `<ellipse cx="420" cy="214" rx="120" ry="38" fill="url(#${sid})"/>`;
  g += K.stain(452, 236, 26, '#1b1612', 0.4) + K.stain(386, 190, 18, '#1b1612', 0.35);
  // red light spilling over the breach
  K.haze(420, 200, 220, 90, WARN, 0.16);
  return { o, g };
}

// ------------------------------------------------------------ right gate
const ERASE_R = [[2372, 72], [2492, 72], [2574, 96], [2662, 104], [2722, 140], [2728, 272], [2600, 286], [2470, 286], [2372, 288]];

function rightGate(K, sh) {
  let o = '';
  o += K.part('gr-rocks-n', () => K.rock(2700, 170, 18) + K.rock(2666, 196, 13) + K.rock(2410, 104, 16) + K.rock(2470, 150, 12) + hedgehog(K, sh, 2636, 230, 36));
  // left segment: torn at its right end (the breach)
  o += K.part('gr-wall-l', () => {
    const W = scrapWall(K, sh, 2196, 274, 2444, 240, { h: 96, tornEnd: true, kinds: ['corr', 'plate', 'cont', 'corr', 'door', 'corr'] });
    let s = W.s;
    s += skullTag(K, 2252, 214, 22, '#f3ede0', { rot: -5 });
    s += K.graffiti(2338, 226, 'TURN BACK', '#ff3d3d', { size: 16, rot: -8 });
    s += tornEnd(K, 2444, 240, 34, 1);
    return s;
  });
  o += K.part('gr-sign', () => {
    let s = '';
    for (const px of [2290, 2378]) s += ibeam(px, 132, px === 2290 ? 178 : 168, 9, STL, false);
    s += holoSign(K, 2262, 80, 144, 48, 'DANGER', WARN, { sub: 'BANDIT ZONE' });
    return s;
  });
  // right segment: torn at its left end, low near the breach
  o += K.part('gr-wall-r', () => {
    const W = scrapWall(K, sh, 2604, 266, 2790, 246, { h: 88, tornStart: true, tear: 0.45, kinds: ['corr', 'sign', 'plate', 'corr', 'cont'] });
    let s = W.s;
    s += tornEnd(K, 2604, 266, 30, -1);
    s += skullTag(K, 2740, 206, 17, '#ff3d3d', { rot: -3, bones: false });
    return s;
  });
  // warning posts at both torn ends
  o += K.part('gr-posts', () => {
    let s = '';
    for (const [px, py] of [[2462, 252], [2588, 276]]) {
      sh.pole(px, py, 120, 5);
      s += ibeam(px, py - 116, py + 2, 11, STL, false);
      s += K.hazard([[px - 5.5, py - 30], [px + 5.5, py - 30], [px + 5.5, py - 4], [px - 5.5, py - 4]], { w: 5 });
      s += beacon(K, px, py - 116, WARN, 8);
      K.lightPool(px + 8, py + 12, 90, 28, WARN, 0.3);
      beam(K, px, py - 124, px < 2500 ? 2.6 : 0.55, 170, 30, WARN, 0.16);
    }
    return s;
  });
  // the bandit buggy that rammed through, and the junk in front
  o += K.part('gr-wreck', () => {
    let s = K.wreck(2632, 312, { w: 124, color: 'yellow', flip: true });
    sh.box(2632, 312, 124, 50, 50);
    // spiked ram on its nose (left, toward the road)
    s += rect(2618, 280, 12, 30, STL[3], 3);
    for (let k = 0; k < 3; k++) s += poly([[2618, 284 + k * 9], [2600, 288 + k * 9], [2618, 292 + k * 9]], STL[1], 2.4);
    s += skullSvg(2700, 290, 10, '#1d1712', MP.container.yellow[1], { op: 0.85 });
    s += K.text('BEEP BEEP', 2690, 296, { size: 12, color: '#1d1712', opacity: 0.85 });
    s += K.flame(2730, 266, 30, 8);
    return s;
  });
  o += K.part('gr-front', () => {
    let s = '';
    s += hedgehog(K, sh, 2396, 290, 42) + hedgehog(K, sh, 2600, 340, 38);
    s += jersey(K, sh, 2338, 296, 62, 30);
    s += `<g transform="rotate(12 2580 300)">` + jersey(K, null, 2560, 302, 56, 26, { red: false }) + `</g>`;
    s += scrapBits(K, 2470, 262, 34, 12, 5, (x) => x > 2478 && x < 2560) + scrapBits(K, 2610, 290, 30, 12, 4);
    return s;
  });

  let g = '';
  g += wasteland(K, [[2372, 64], [2492, 60], [2574, 90], [2604, 104], [2580, 130], [2530, 190], [2480, 250], [2456, 292], [2372, 292]], { tone: '#ae875d', soft: 12, mottle: 0.35, rim: [[2604, 104], [2580, 130], [2530, 190], [2480, 250], [2456, 292]] });
  g += wasteland(K, [[2662, 98], [2724, 134], [2730, 274], [2600, 290], [2540, 292], [2560, 250], [2600, 210], [2660, 160], [2702, 120]], { tone: '#ae875d', soft: 8, mottle: 0.5, rim: [[2540, 292], [2560, 250], [2600, 210], [2660, 160], [2702, 120]] });
  g += K.tracks('M2800 0 C2740 80 2620 150 2540 230 C2500 270 2486 320 2470 380', { w: 12, op: 0.2 });
  const sid = K.id('nsc');
  K.def(`<radialGradient id="${sid}"><stop offset="0" stop-color="#1b1310" stop-opacity=".5"/><stop offset=".6" stop-color="#1b1310" stop-opacity=".22"/><stop offset="1" stop-color="#1b1310" stop-opacity="0"/></radialGradient>`);
  g += `<ellipse cx="2524" cy="262" rx="120" ry="40" fill="url(#${sid})"/>`;
  g += K.stain(2560, 300, 24, '#1b1612', 0.4);
  K.haze(2524, 240, 200, 90, WARN, 0.16);
  return { o, g };
}

// ------------------------------------------------------------ layer
export default {
  name: 'gates',
  z: 40,
  erase: [ERASE_L, ERASE_R],
  build(K) {
    const sh = shade();
    const L = leftGate(K, sh);
    const R = rightGate(K, sh);
    const ground = L.g + R.g + sh.render(K);
    return { ground, objects: L.o + R.o, light: '' };
  },
};

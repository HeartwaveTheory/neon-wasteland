// Tower concept kit: a shared drawing vocabulary so every tower matches the map
// (hand-painted 3/4 top-down, thick dark-brown ink, cel-shaded, light from the
// upper-left, shadows to the lower-right) with a cyberpunk / Borderlands layer
// (neon tubes, scrap tech, cables, stencil decals, hatching in the shadows).
//
// Canvas: 512 x 512. Ground centre of a tower is (256, GROUND_Y). The build pads
// on the map are ellipses about 0.5 as tall as wide; a tower's footprint should
// stay inside rx 140 / ry 70 around that point (front edge at y 490).
//
// Every primitive returns an SVG string. Neon / glow is collected separately per
// part (K.part) so the ink-outline filter never outlines a glow halo.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const W = 512, H = 512, CX = 256, GROUND_Y = 420, FOOT_RX = 140, FOOT_RY = 70;

// ---------------------------------------------------------------- palette
// Sampled from the reference map, then pushed slightly for cel shading.
// Arrays run light -> dark.
export const P = {
  ink:   '#1a140e',
  stone: ['#c2b8a3', '#998f7d', '#736b5e', '#4e4840', '#2f2b26'],
  wood:  ['#a98157', '#83603d', '#5f4227', '#3f2b19', '#26190e'],
  iron:  ['#b3aea4', '#888379', '#615d56', '#413e39', '#272521'],
  steel: ['#c9d2d4', '#8f9ca0', '#62707a', '#3e4a52', '#252d33'],
  rust:  ['#d9975a', '#b46c36', '#894a20', '#5d3014'],
  teal:  ['#a4d0c6', '#73aaa4', '#4c8382', '#305b5d', '#1d3a3c'],
  brass: ['#f3da92', '#d2a650', '#9e7431', '#644817'],
  dirt:  ['#dcbb98', '#c6a079', '#b18c69', '#8d7152'],
  warm:  ['#fff4c8', '#ffd36b', '#f29a2e', '#b85a14'],
  hazard: ['#ffd23a', '#d9a514'],
  red:   ['#f0715a', '#c8402d', '#8e2418', '#5a140c'],
  // Family neon (glow colour, hot core). One hue per family so towers read at a glance.
  laser:   { c: '#ff2f8a', core: '#ffe0ef', deep: '#a1104f' },   // magenta
  missile: { c: '#b4ff2e', core: '#f2ffd6', deep: '#5e9a0c' },   // acid green
  fire:    { c: '#ff7a1a', core: '#fff1b8', deep: '#b33a06' },   // orange
  shock:   { c: '#38f2ff', core: '#eaffff', deep: '#0a8fa6' },   // cyan
  violet:  { c: '#a77bff', core: '#efe6ff', deep: '#5b2fc4' },
};

// Brands stencilled on the towers (fictional, our own).
export const BRAND = { laser: 'PRISMATIK', missile: 'BOOMWERKS', fire: 'SCORCH&SONS', shock: 'VOLTAMP' };

// ---------------------------------------------------------------- helpers
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const f = (n) => +(+n).toFixed(1);
const pts = (a) => a.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

let FONT_CSS = null;
function fontCss() {
  if (FONT_CSS) return FONT_CSS;
  const b = readFileSync(path.join(HERE, '..', 'fonts', 'bungee.woff2')).toString('base64');
  const c = readFileSync(path.join(HERE, '..', 'fonts', 'chakra700.woff2')).toString('base64');
  FONT_CSS = `@font-face{font-family:'Bungee';src:url(data:font/woff2;base64,${b}) format('woff2')}` +
    `@font-face{font-family:'Chakra';font-weight:700;src:url(data:font/woff2;base64,${c}) format('woff2')}`;
  return FONT_CSS;
}

// ---------------------------------------------------------------- the kit
export class Kit {
  constructor(seed = 1) {
    this.r = rng(seed);
    this.seed = seed;
    this.n = 0;
    this.defs = [];
    this.glows = null;
    this.usesFont = false;
  }
  id(p = 'k') { return `${p}${++this.n}`; }
  rand(a = 0, b = 1) { return lerp(a, b, this.r()); }
  pick(a) { return a[Math.floor(this.r() * a.length)]; }
  def(s) { this.defs.push(s); }
  glow(s) { if (this.glows) this.glows.push(s); else this._loose = (this._loose || '') + s; return ''; }

  // A named layer: solid geometry gets the ink outline, glow goes on top
  // un-outlined. pivot = [x, y] for parts that rotate in game (the weapon head).
  part(name, fn, pivot) {
    const saved = this.glows;
    this.glows = [];
    const solid = fn();
    const g = this.glows.join('');
    this.glows = saved;
    const pv = pivot ? ` data-pivot="${f(pivot[0])},${f(pivot[1])}"` : '';
    return `<g id="${name}"${pv}><g filter="url(#outline)">${solid}</g><g class="glow">${g}</g></g>`;
  }

  // Full document. Parts are drawn back to front in the order given.
  doc(body, { title = '', shadow = '', w = W, h = H } = {}) {
    const font = this.usesFont ? `<style>${fontCss()}</style>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">` +
      `<title>${title}</title><defs>${font}${baseDefs(this.seed)}${this.defs.join('')}</defs>` +
      `<g id="shadow">${shadow}</g><g id="art" filter="url(#paint)">${body}</g></svg>`;
  }

  // ------------------------------------------------------------ shading
  // Hard-stop gradient across a form: cel-shaded bands, light from the left.
  // tones: [hi, mid, lo, deep]. Returns url(#id).
  bands(tones, { x1 = 0, y1 = 0, x2 = 1, y2 = 0, stops } = {}) {
    const id = this.id('g');
    const [hi, mid, lo, deep = lo] = tones;
    const s = stops || [[0, mid], [0.1, hi], [0.42, mid], [0.74, lo], [0.9, deep]];
    let st = '';
    for (let i = 0; i < s.length; i++) {
      const [o, c] = s[i];
      const end = i + 1 < s.length ? s[i + 1][0] : 1;
      st += `<stop offset="${o}" stop-color="${c}"/><stop offset="${end}" stop-color="${c}"/>`;
    }
    this.def(`<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${st}</linearGradient>`);
    return `url(#${id})`;
  }
  // Soft vertical gradient (for cloth, glass, screens).
  vgrad(a, b, { x2 = 0, y2 = 1 } = {}) {
    const id = this.id('v');
    this.def(`<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`);
    return `url(#${id})`;
  }
  radial(inner, outer, { r = 0.5, fx = 0.4, fy = 0.35, mid } = {}) {
    const id = this.id('r');
    const m = mid ? `<stop offset="0.45" stop-color="${mid}"/>` : '';
    this.def(`<radialGradient id="${id}" r="${r}" fx="${fx}" fy="${fy}"><stop offset="0" stop-color="${inner}"/>${m}<stop offset="1" stop-color="${outer}"/></radialGradient>`);
    return `url(#${id})`;
  }

  // Borderlands-style hatching: loose diagonal ink strokes clipped to a shape.
  hatch(d, { density = 0.9, angle = -55, len = [10, 22], w = 2, op = 0.55, bbox } = {}) {
    const cid = this.id('c');
    this.def(`<clipPath id="${cid}"><path d="${d}"/></clipPath>`);
    const [x0, y0, x1, y1] = bbox || pathBox(d);
    const area = (x1 - x0) * (y1 - y0);
    const n = Math.round((area / 140) * density);
    const a = (angle * Math.PI) / 180;
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = this.rand(x0 - 6, x1 + 6), y = this.rand(y0 - 6, y1 + 6);
      const l = this.rand(len[0], len[1]);
      s += `M${f(x)} ${f(y)}l${f(Math.cos(a) * l)} ${f(Math.sin(a) * l)}`;
    }
    return `<g clip-path="url(#${cid})"><path d="${s}" stroke="${P.ink}" stroke-width="${w}" stroke-linecap="round" opacity="${op}" fill="none"/></g>`;
  }

  // ------------------------------------------------------------ ground
  // Cast shadow on the pad: an ellipse plus a smear to the lower right.
  shadow(cx = CX, y = GROUND_Y, rx = 120, ry = 60, len = 60) {
    return `<g filter="url(#soft)" opacity="0.42"><ellipse cx="${f(cx + len * 0.35)}" cy="${f(y + 6)}" rx="${f(rx + len * 0.3)}" ry="${f(ry)}" fill="${P.ink}"/>` +
      `<path d="M${f(cx - rx * 0.2)} ${f(y - ry * 0.6)} L${f(cx + rx + len)} ${f(y - ry * 0.2)} L${f(cx + rx + len * 0.9)} ${f(y + ry * 0.7)} L${f(cx)} ${f(y + ry)} Z" fill="${P.ink}" opacity="0.7"/></g>`;
  }

  // Loose rocks / rubble at the foot of a tower (like the map's boulders).
  rubble(cx, y, n = 5, spread = 120, size = [10, 20]) {
    let s = '';
    const rocks = [];
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1;
      const x = cx + side * this.rand(spread * 0.55, spread);
      const yy = y + this.rand(-8, 18);
      rocks.push([x, yy, this.rand(size[0], size[1])]);
    }
    rocks.sort((a, b) => a[1] - b[1]);
    for (const [x, yy, r] of rocks) s += this.rock(x, yy, r);
    return s;
  }
  rock(x, y, r) {
    const k = 7, pp = [];
    for (let i = 0; i < k; i++) {
      const a = Math.PI + (i / (k - 1)) * Math.PI;
      const rr = r * this.rand(0.75, 1.1);
      pp.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.85]);
    }
    pp.push([x + r * 0.9, y + r * 0.25], [x - r * 0.9, y + r * 0.25]);
    const top = [[x - r * 0.75, y - r * 0.35], [x - r * 0.2, y - r * 0.8], [x + r * 0.35, y - r * 0.55], [x + r * 0.1, y - r * 0.1], [x - r * 0.4, y]];
    return `<polygon points="${pts(pp)}" fill="${P.stone[2]}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>` +
      `<polygon points="${pts(top)}" fill="${P.stone[1]}"/>` +
      `<path d="M${f(x + r * 0.15)} ${f(y - r * 0.5)} L${f(x + r * 0.35)} ${f(y + r * 0.2)}" stroke="${P.ink}" stroke-width="2" opacity=".6"/>`;
  }

  // ------------------------------------------------------------ masonry
  // Round stone drum (foundation or tower body). y = bottom centre (front of
  // the bottom ellipse is at y + ry). cap: 'flag' | 'planks' | 'iron' | 'none'.
  stoneDrum({ cx = CX, y = GROUND_Y - 20, rx = 120, ry = 62, h = 60, rowH = 26, tones = P.stone, cap = 'flag', hatch = true, moss = false }) {
    const top = y - h;
    let s = `<path d="M${f(cx - rx)} ${f(top)} A${rx} ${ry} 0 0 0 ${f(cx + rx)} ${f(top)} L${f(cx + rx)} ${f(y)} A${rx} ${ry} 0 0 1 ${f(cx - rx)} ${f(y)} Z" fill="${tones[4]}" stroke="${P.ink}" stroke-width="4"/>`;
    const rows = Math.max(1, Math.round(h / rowH));
    const rh = h / rows;
    for (let i = 0; i < rows; i++) {
      const yt = top + i * rh, yb = yt + rh;
      const nb = Math.max(4, Math.round((rx * Math.PI) / 52));
      const off = (i % 2) * 0.5 + this.rand(-0.15, 0.15);
      const cuts = [Math.PI];
      for (let j = 1; j < nb + 1; j++) {
        const t = (j - off) / nb;
        if (t > 0.03 && t < 0.97) cuts.push(Math.PI * (1 - t) + this.rand(-0.06, 0.06));
      }
      cuts.push(0);
      cuts.sort((a, b) => b - a);
      for (let j = 0; j < cuts.length - 1; j++) {
        const a0 = cuts[j] - 0.025, a1 = cuts[j + 1] + 0.025;
        if (a0 <= a1) continue;
        const poly = [];
        const N = 6;
        for (let q = 0; q <= N; q++) { const a = lerp(a0, a1, q / N); poly.push([cx + Math.cos(a) * rx, yt + 2 + Math.sin(a) * ry]); }
        for (let q = N; q >= 0; q--) { const a = lerp(a0, a1, q / N); poly.push([cx + Math.cos(a) * rx, yb - 2 + Math.sin(a) * ry]); }
        const u = Math.cos((a0 + a1) / 2);
        const b = -u * 0.95 + this.rand(-0.22, 0.22);
        const tone = b > 0.45 ? tones[0] : b > -0.05 ? tones[1] : b > -0.55 ? tones[2] : tones[3];
        s += `<polygon points="${pts(poly)}" fill="${tone}" stroke="${P.ink}" stroke-width="2.4" stroke-linejoin="round"/>`;
        if (b > 0.2) { // lit top edge
          const e = [];
          for (let q = 0; q <= N; q++) { const a = lerp(a0, a1, q / N); e.push([cx + Math.cos(a) * (rx - 2), yt + 4.5 + Math.sin(a) * ry]); }
          s += `<polyline points="${pts(e)}" fill="none" stroke="${tones[0]}" stroke-width="2" opacity=".8"/>`;
        }
        if (this.r() < 0.18) { // crack
          const a = lerp(a0, a1, this.rand(0.3, 0.7));
          const x = cx + Math.cos(a) * rx, yy = yt + rh * 0.3 + Math.sin(a) * ry;
          s += `<path d="M${f(x)} ${f(yy)} l${f(this.rand(-5, 5))} ${f(rh * 0.25)} l${f(this.rand(-4, 4))} ${f(rh * 0.25)}" stroke="${P.ink}" stroke-width="1.8" fill="none" opacity=".7"/>`;
        }
      }
    }
    if (hatch) {
      const d = `M${f(cx + rx * 0.35)} ${f(top)} L${f(cx + rx)} ${f(top)} L${f(cx + rx)} ${f(y)} A${rx} ${ry} 0 0 1 ${f(cx + rx * 0.35)} ${f(y + ry * 0.94)} Z`;
      s += this.hatch(`M${f(cx - rx)} ${f(top)} A${rx} ${ry} 0 0 0 ${f(cx + rx)} ${f(top)} L${f(cx + rx)} ${f(y)} A${rx} ${ry} 0 0 1 ${f(cx - rx)} ${f(y)} Z`,
        { density: 0.75, bbox: [cx + rx * 0.4, top, cx + rx, y + ry] });
      void d;
    }
    if (moss) s += this.moss(cx, y, rx, ry);
    s += this.cap(cx, top, rx, ry, cap, tones);
    return s;
  }
  moss(cx, y, rx, ry) {
    let s = '';
    for (let i = 0; i < 5; i++) {
      const a = this.rand(0.3, 2.8);
      const x = cx + Math.cos(a) * rx * 0.95, yy = y + Math.sin(a) * ry - 2;
      s += `<ellipse cx="${f(x)}" cy="${f(yy)}" rx="${f(this.rand(8, 16))}" ry="${f(this.rand(3, 6))}" fill="#5f6b3a" opacity=".85"/>`;
    }
    return s;
  }
  // Top surface of a drum.
  cap(cx, top, rx, ry, kind = 'flag', tones = P.stone) {
    if (kind === 'none') return '';
    const e = `<ellipse cx="${f(cx)}" cy="${f(top)}" rx="${f(rx)}" ry="${f(ry)}"`;
    if (kind === 'flag') {
      let s = `${e} fill="${tones[1]}" stroke="${P.ink}" stroke-width="4"/>`;
      s += `<ellipse cx="${f(cx - rx * 0.08)}" cy="${f(top - ry * 0.08)}" rx="${f(rx * 0.8)}" ry="${f(ry * 0.72)}" fill="${tones[0]}" opacity=".55"/>`;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + this.rand(-0.3, 0.3);
        s += `<path d="M${f(cx + Math.cos(a) * rx * 0.25)} ${f(top + Math.sin(a) * ry * 0.25)} L${f(cx + Math.cos(a) * rx * 0.97)} ${f(top + Math.sin(a) * ry * 0.97)}" stroke="${P.ink}" stroke-width="2" opacity=".55"/>`;
      }
      s += `<ellipse cx="${f(cx)}" cy="${f(top)}" rx="${f(rx * 0.25)}" ry="${f(ry * 0.25)}" fill="none" stroke="${P.ink}" stroke-width="2" opacity=".55"/>`;
      return s;
    }
    if (kind === 'planks') {
      const cid = this.id('c');
      this.def(`<clipPath id="${cid}"><ellipse cx="${f(cx)}" cy="${f(top)}" rx="${f(rx)}" ry="${f(ry)}"/></clipPath>`);
      let s = `${e} fill="${P.wood[1]}"/><g clip-path="url(#${cid})">`;
      const pw = 22;
      for (let x = cx - rx; x < cx + rx; x += pw) {
        const tone = this.pick([P.wood[0], P.wood[1], P.wood[1], P.wood[2]]);
        s += `<rect x="${f(x)}" y="${f(top - ry)}" width="${pw}" height="${f(ry * 2)}" fill="${tone}" stroke="${P.ink}" stroke-width="2.2"/>`;
        s += `<circle cx="${f(x + pw / 2)}" cy="${f(top - ry * 0.5 + this.rand(-4, 4))}" r="1.8" fill="${P.ink}"/><circle cx="${f(x + pw / 2)}" cy="${f(top + ry * 0.5 + this.rand(-4, 4))}" r="1.8" fill="${P.ink}"/>`;
      }
      s += `</g>${e} fill="none" stroke="${P.ink}" stroke-width="4"/>`;
      return s;
    }
    if (kind === 'iron') {
      let s = `${e} fill="${P.iron[1]}" stroke="${P.ink}" stroke-width="4"/>`;
      s += `<ellipse cx="${f(cx - rx * 0.06)}" cy="${f(top - ry * 0.06)}" rx="${f(rx * 0.82)}" ry="${f(ry * 0.8)}" fill="${P.iron[0]}" opacity=".5"/>`;
      s += `<ellipse cx="${f(cx)}" cy="${f(top)}" rx="${f(rx * 0.86)}" ry="${f(ry * 0.86)}" fill="none" stroke="${P.ink}" stroke-width="2" opacity=".6"/>`;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        s += `<circle cx="${f(cx + Math.cos(a) * rx * 0.93)}" cy="${f(top + Math.sin(a) * ry * 0.93)}" r="2.4" fill="${P.ink}"/>`;
      }
      return s;
    }
    return '';
  }

  // Crenellated parapet ring on top of a drum. Returns {back, front}; draw
  // back before whatever stands on the roof and front after it.
  merlons({ cx = CX, y, rx, ry, h = 22, n = 10, tones = P.stone, depth = 12 }) {
    const back = [], front = [];
    for (let i = 0; i < n; i++) {
      if (i % 2) continue;
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      const am = (a0 + a1) / 2;
      const isFront = Math.sin(am) > 0;
      const p0 = [cx + Math.cos(a0) * rx, y + Math.sin(a0) * ry];
      const p1 = [cx + Math.cos(a1) * rx, y + Math.sin(a1) * ry];
      const q0 = [cx + Math.cos(a0) * (rx - depth), y + Math.sin(a0) * (ry - depth * 0.55)];
      const q1 = [cx + Math.cos(a1) * (rx - depth), y + Math.sin(a1) * (ry - depth * 0.55)];
      const u = Math.cos(am);
      const faceTone = -u > 0.3 ? tones[1] : -u > -0.3 ? tones[2] : tones[3];
      let s = '';
      // top of the merlon
      s += `<polygon points="${pts([[p0[0], p0[1] - h], [p1[0], p1[1] - h], [q1[0], q1[1] - h], [q0[0], q0[1] - h]])}" fill="${tones[0]}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>`;
      // outer face
      if (isFront) s += `<polygon points="${pts([[p0[0], p0[1] - h], [p1[0], p1[1] - h], [p1[0], p1[1]], [p0[0], p0[1]]])}" fill="${faceTone}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>`;
      else s += `<polygon points="${pts([[q0[0], q0[1] - h], [q1[0], q1[1] - h], [q1[0], q1[1]], [q0[0], q0[1]]])}" fill="${tones[2]}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>`;
      (isFront ? front : back).push({ s, y: Math.sin(am) });
    }
    back.sort((a, b) => a.y - b.y); front.sort((a, b) => a.y - b.y);
    return { back: back.map((o) => o.s).join(''), front: front.map((o) => o.s).join('') };
  }

  // Rectangular block (stone plinth, crate, metal housing) in the map's
  // oblique view: front face, top face and the right side receding up-right.
  // x,y = bottom-left of the FRONT face. d = depth (drawn as d*0.5 up, d*0.22 right).
  box({ x, y, w, h, d = 40, tones = P.stone, stroke = 4, hatchSide = true, top = true }) {
    const dx = d * 0.22, dy = d * 0.5;
    const front = [[x, y - h], [x + w, y - h], [x + w, y], [x, y]];
    const side = [[x + w, y - h], [x + w + dx, y - h - dy], [x + w + dx, y - dy], [x + w, y]];
    const tp = [[x, y - h], [x + dx, y - h - dy], [x + w + dx, y - h - dy], [x + w, y - h]];
    let s = `<polygon points="${pts(side)}" fill="${tones[2]}" stroke="${P.ink}" stroke-width="${stroke}" stroke-linejoin="round"/>`;
    if (hatchSide) s += this.hatch(`M${pts(side).replace(/ /g, ' L')}Z`, { density: 0.8 });
    s += `<polygon points="${pts(front)}" fill="${tones[1]}" stroke="${P.ink}" stroke-width="${stroke}" stroke-linejoin="round"/>`;
    if (top) s += `<polygon points="${pts(tp)}" fill="${tones[0]}" stroke="${P.ink}" stroke-width="${stroke}" stroke-linejoin="round"/>`;
    return s;
  }
  // Stone blocks drawn onto a flat front face (for plinths and walls).
  blocks({ x, y, w, h, rowH = 24, bw = 44, tones = P.stone }) {
    let s = '';
    const rows = Math.max(1, Math.round(h / rowH));
    const rh = h / rows;
    for (let i = 0; i < rows; i++) {
      const yt = y - h + i * rh;
      let xx = x - (i % 2 ? bw * 0.5 : 0) + this.rand(-6, 0);
      while (xx < x + w) {
        const bx0 = Math.max(x, xx) + 1.5, bx1 = Math.min(x + w, xx + bw * this.rand(0.8, 1.2)) - 1.5;
        if (bx1 - bx0 > 6) {
          const t = (bx0 + bx1) / 2 - x;
          const b = 0.6 - (t / w) * 1.1 + this.rand(-0.2, 0.2);
          const tone = b > 0.35 ? tones[0] : b > -0.1 ? tones[1] : tones[2];
          s += `<rect x="${f(bx0)}" y="${f(yt + 1.5)}" width="${f(bx1 - bx0)}" height="${f(rh - 3)}" rx="2" fill="${tone}" stroke="${P.ink}" stroke-width="2.2"/>`;
        }
        xx = bx1 + 1.5;
      }
    }
    return s;
  }

  // ------------------------------------------------------------ timber
  // Square post with a lit left face and a dark right face.
  post(x, yTop, yBot, w = 14, tones = P.wood) {
    const hw = w / 2;
    return `<rect x="${f(x - hw)}" y="${f(yTop)}" width="${f(w)}" height="${f(yBot - yTop)}" fill="${tones[2]}" stroke="${P.ink}" stroke-width="3.2"/>` +
      `<rect x="${f(x - hw)}" y="${f(yTop)}" width="${f(w * 0.48)}" height="${f(yBot - yTop)}" fill="${tones[1]}"/>` +
      `<path d="M${f(x - hw + 2)} ${f(yTop + 4)} V${f(yBot - 4)}" stroke="${tones[0]}" stroke-width="2"/>` +
      `<path d="M${f(x + hw * 0.3)} ${f(yTop + (yBot - yTop) * 0.2)} v${f((yBot - yTop) * 0.25)}" stroke="${P.ink}" stroke-width="1.6" opacity=".6"/>` +
      `<rect x="${f(x - hw)}" y="${f(yTop)}" width="${f(w)}" height="${f(yBot - yTop)}" fill="none" stroke="${P.ink}" stroke-width="3.2"/>`;
  }
  // Diagonal plank / brace between two points.
  beam(x1, y1, x2, y2, w = 10, tones = P.wood) {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
    const nx = (-dy / L) * (w / 2), ny = (dx / L) * (w / 2);
    const poly = [[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]];
    const lit = [[x1 - nx, y1 - ny], [x2 - nx, y2 - ny], [x2 - nx * 0.2, y2 - ny * 0.2], [x1 - nx * 0.2, y1 - ny * 0.2]];
    return `<polygon points="${pts(poly)}" fill="${tones[2]}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>` +
      `<polygon points="${pts(lit)}" fill="${tones[1]}"/>` +
      `<polygon points="${pts(poly)}" fill="none" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>`;
  }
  // Sharpened palisade stakes in a row (front fence of a platform).
  stakes(x0, x1, yBot, h = 40, n = 6, tones = P.wood) {
    let s = '';
    const step = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const x = x0 + step * (i + 0.5), w = step * 0.86, hh = h * this.rand(0.85, 1.1);
      const poly = [[x - w / 2, yBot], [x - w / 2, yBot - hh], [x, yBot - hh - w * 0.7], [x + w / 2, yBot - hh], [x + w / 2, yBot]];
      s += `<polygon points="${pts(poly)}" fill="${tones[2]}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>` +
        `<polygon points="${pts([[x - w / 2, yBot], [x - w / 2, yBot - hh], [x, yBot - hh - w * 0.7], [x - w * 0.05, yBot]])}" fill="${tones[1]}"/>` +
        `<polygon points="${pts(poly)}" fill="none" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>`;
    }
    return s;
  }
  // Plank deck (a flat platform) seen from above-front.
  deck({ x, y, w, d = 50, th = 12, tones = P.wood }) {
    const dx = d * 0.22, dy = d * 0.5;
    let s = `<polygon points="${pts([[x, y], [x + w, y], [x + w, y + th], [x, y + th]])}" fill="${tones[2]}" stroke="${P.ink}" stroke-width="3.2" stroke-linejoin="round"/>`;
    s += `<polygon points="${pts([[x + w, y], [x + w + dx, y - dy], [x + w + dx, y - dy + th], [x + w, y + th]])}" fill="${tones[3]}" stroke="${P.ink}" stroke-width="3.2" stroke-linejoin="round"/>`;
    const n = Math.max(3, Math.round(w / 22));
    for (let i = 0; i < n; i++) {
      const a = x + (w / n) * i, b = a + w / n;
      const tone = this.pick([tones[0], tones[1], tones[1]]);
      s += `<polygon points="${pts([[a, y], [b, y], [b + dx, y - dy], [a + dx, y - dy]])}" fill="${tone}" stroke="${P.ink}" stroke-width="2.2" stroke-linejoin="round"/>`;
    }
    s += `<polygon points="${pts([[x, y], [x + w, y], [x + w + dx, y - dy], [x + dx, y - dy]])}" fill="none" stroke="${P.ink}" stroke-width="3.2" stroke-linejoin="round"/>`;
    return s;
  }

  // ------------------------------------------------------------ metal
  // Upright cylinder (tank, drum, turret ring). y = bottom centre.
  cyl({ cx, y, rx, ry, h, tones = P.iron, top = 'flat', topTone, stroke = 4, hatch = true }) {
    const t = y - h;
    const fill = this.bands(tones);
    let s = `<path d="M${f(cx - rx)} ${f(t)} L${f(cx - rx)} ${f(y)} A${f(rx)} ${f(ry)} 0 0 0 ${f(cx + rx)} ${f(y)} L${f(cx + rx)} ${f(t)} Z" fill="${fill}" stroke="${P.ink}" stroke-width="${stroke}" stroke-linejoin="round"/>`;
    if (hatch && rx > 14) s += this.hatch(`M${f(cx + rx * 0.5)} ${f(t)} L${f(cx + rx)} ${f(t)} L${f(cx + rx)} ${f(y)} A${f(rx)} ${f(ry)} 0 0 1 ${f(cx + rx * 0.5)} ${f(y + ry * 0.86)} Z`, { density: 0.7 });
    if (top !== 'none') {
      s += `<ellipse cx="${f(cx)}" cy="${f(t)}" rx="${f(rx)}" ry="${f(ry)}" fill="${topTone || tones[0]}" stroke="${P.ink}" stroke-width="${stroke}"/>`;
      if (top === 'rim') s += `<ellipse cx="${f(cx)}" cy="${f(t)}" rx="${f(rx * 0.72)}" ry="${f(ry * 0.72)}" fill="${tones[2]}" stroke="${P.ink}" stroke-width="2.5"/>`;
    }
    return s;
  }
  // Horizontal band around a cylinder (a hoop / strap).
  hoop(cx, y, rx, ry, w = 8, tone = P.iron[3]) {
    return `<path d="M${f(cx - rx)} ${f(y - w / 2)} A${f(rx)} ${f(ry)} 0 0 0 ${f(cx + rx)} ${f(y - w / 2)} L${f(cx + rx)} ${f(y + w / 2)} A${f(rx)} ${f(ry)} 0 0 1 ${f(cx - rx)} ${f(y + w / 2)} Z" fill="${tone}" stroke="${P.ink}" stroke-width="2.5"/>`;
  }
  // A barrel lying along an axis (laser emitter, rocket tube, flame nozzle).
  // From (x1,y1) back to (x2,y2) muzzle. r = radius. muzzle: 'open' | 'lens' | 'cap'.
  barrel({ x1, y1, x2, y2, r = 12, tones = P.iron, muzzle = 'open', color, rings = 2, ringTone = P.iron[3] }) {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L;
    let nx = -uy, ny = ux;
    if (ny > 0) { nx = -nx; ny = -ny; } // n points "up" (lit side)
    const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
    const P4 = (k) => [[x1 + nx * r * k, y1 + ny * r * k], [x2 + nx * r * k, y2 + ny * r * k]];
    const [a1, a2] = P4(1), [b1, b2] = P4(-1), [h1, h2] = P4(0.55), [m1, m2] = P4(0.05), [d1, d2] = P4(-0.55);
    const er = r * 0.42;
    let s = `<ellipse cx="${f(x1)}" cy="${f(y1)}" rx="${f(er)}" ry="${f(r)}" transform="rotate(${f(ang)} ${f(x1)} ${f(y1)})" fill="${tones[2]}" stroke="${P.ink}" stroke-width="3.5"/>`;
    s += `<polygon points="${pts([a1, a2, b2, b1])}" fill="${tones[1]}" stroke="${P.ink}" stroke-width="3.5" stroke-linejoin="round"/>`;
    s += `<polygon points="${pts([a1, a2, h2, h1])}" fill="${tones[0]}"/>`;
    s += `<polygon points="${pts([m1, m2, b2, b1])}" fill="${tones[2]}"/>`;
    s += `<polygon points="${pts([d1, d2, b2, b1])}" fill="${tones[3] || tones[2]}"/>`;
    s += `<polygon points="${pts([a1, a2, b2, b1])}" fill="none" stroke="${P.ink}" stroke-width="3.5" stroke-linejoin="round"/>`;
    for (let i = 1; i <= rings; i++) {
      const t = i / (rings + 1);
      const cx = lerp(x1, x2, t), cy = lerp(y1, y2, t);
      s += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(er * 0.9)}" ry="${f(r * 1.12)}" transform="rotate(${f(ang)} ${f(cx)} ${f(cy)})" fill="none" stroke="${P.ink}" stroke-width="5"/>` +
        `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(er * 0.9)}" ry="${f(r * 1.12)}" transform="rotate(${f(ang)} ${f(cx)} ${f(cy)})" fill="none" stroke="${ringTone}" stroke-width="2.4"/>`;
    }
    // muzzle face
    s += `<ellipse cx="${f(x2)}" cy="${f(y2)}" rx="${f(er)}" ry="${f(r)}" transform="rotate(${f(ang)} ${f(x2)} ${f(y2)})" fill="${tones[2]}" stroke="${P.ink}" stroke-width="3.5"/>`;
    if (muzzle === 'open') s += `<ellipse cx="${f(x2)}" cy="${f(y2)}" rx="${f(er * 0.6)}" ry="${f(r * 0.6)}" transform="rotate(${f(ang)} ${f(x2)} ${f(y2)})" fill="${P.ink}"/>`;
    if (muzzle === 'lens' && color) {
      s += `<ellipse cx="${f(x2)}" cy="${f(y2)}" rx="${f(er * 0.7)}" ry="${f(r * 0.72)}" transform="rotate(${f(ang)} ${f(x2)} ${f(y2)})" fill="${color.c}" stroke="${P.ink}" stroke-width="2"/>` +
        `<ellipse cx="${f(x2 - ux * 1)}" cy="${f(y2 - r * 0.15)}" rx="${f(er * 0.3)}" ry="${f(r * 0.3)}" transform="rotate(${f(ang)} ${f(x2)} ${f(y2)})" fill="${color.core}"/>`;
      this.glow(`<circle cx="${f(x2)}" cy="${f(y2)}" r="${f(r * 1.7)}" fill="${color.c}" opacity=".55" filter="url(#bloom)"/>`);
    }
    return s;
  }
  rivets(list, r = 2.4, tone = P.ink) {
    return list.map(([x, y]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${tone}"/><circle cx="${f(x - r * 0.35)}" cy="${f(y - r * 0.35)}" r="${f(r * 0.4)}" fill="${P.iron[0]}"/>`).join('');
  }
  rivetLine(x1, y1, x2, y2, n, r = 2.4) {
    const l = [];
    for (let i = 0; i < n; i++) { const t = n === 1 ? 0.5 : i / (n - 1); l.push([lerp(x1, x2, t), lerp(y1, y2, t)]); }
    return this.rivets(l, r);
  }
  // Flat metal plate polygon with an optional lit edge.
  plate(poly, tones = P.iron, { stroke = 3.5, edge = true } = {}) {
    let s = `<polygon points="${pts(poly)}" fill="${tones[1]}" stroke="${P.ink}" stroke-width="${stroke}" stroke-linejoin="round"/>`;
    if (edge) s += `<polyline points="${pts(poly.slice(0, 2).map(([x, y]) => [x + 1.5, y + 2.5]))}" stroke="${tones[0]}" stroke-width="2.5" fill="none"/>`;
    return s;
  }
  // Pipe along a path: ink casing, body colour, highlight.
  pipe(d, w = 8, tone = P.iron[2], hi = P.iron[0]) {
    return `<path d="${d}" fill="none" stroke="${P.ink}" stroke-width="${w + 5}" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${d}" fill="none" stroke="${tone}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${d}" fill="none" stroke="${hi}" stroke-width="${f(w * 0.28)}" stroke-linecap="round" stroke-linejoin="round" transform="translate(-1 -${f(w * 0.25)})" opacity=".8"/>`;
  }
  // Rubber cable hanging between two points.
  cable(x1, y1, x2, y2, sag = 30, w = 4.5, tone = '#2e2a33') {
    const d = `M${f(x1)} ${f(y1)} Q${f((x1 + x2) / 2)} ${f(Math.max(y1, y2) + sag)} ${f(x2)} ${f(y2)}`;
    return `<path d="${d}" fill="none" stroke="${P.ink}" stroke-width="${w + 3.5}" stroke-linecap="round"/>` +
      `<path d="${d}" fill="none" stroke="${tone}" stroke-width="${w}" stroke-linecap="round"/>` +
      `<path d="${d}" fill="none" stroke="#6b6577" stroke-width="1.2" stroke-linecap="round" transform="translate(0 -1.2)" opacity=".8"/>`;
  }
  // Yellow/black hazard stripes inside a polygon.
  hazard(poly, { w = 12, a = 'hazard' } = {}) {
    const id = this.id('hz');
    this.def(`<pattern id="${id}" width="${w * 2}" height="${w * 2}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="${w * 2}" height="${w * 2}" fill="${P.hazard[0]}"/><rect width="${w}" height="${w * 2}" fill="${P.ink}"/></pattern>`);
    void a;
    return `<polygon points="${pts(poly)}" fill="url(#${id})" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>`;
  }

  // ------------------------------------------------------------ cyber layer
  // Neon tube along a path: dark housing, colour tube, hot core, bloom.
  neon(d, col, w = 5) {
    this.glow(`<path d="${d}" fill="none" stroke="${col.c}" stroke-width="${w * 3.2}" stroke-linecap="round" stroke-linejoin="round" opacity=".7" filter="url(#bloom)"/>` +
      `<path d="${d}" fill="none" stroke="${col.c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${d}" fill="none" stroke="${col.core}" stroke-width="${f(w * 0.42)}" stroke-linecap="round" stroke-linejoin="round"/>`);
    return `<path d="${d}" fill="none" stroke="${P.ink}" stroke-width="${w + 5}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  // Neon ring around a cylinder: only the front half is visible.
  neonRing(cx, cy, rx, ry, col, w = 5) {
    return this.neon(`M${f(cx - rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 0 0 ${f(cx + rx)} ${f(cy)}`, col, w);
  }
  // Glowing orb / capacitor bulb.
  orb(cx, cy, r, col) {
    const fill = this.radial(col.core, col.c, { mid: col.c, r: 0.6 });
    this.glow(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 2.3)}" fill="${col.c}" opacity=".5" filter="url(#bloom)"/>` +
      `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}" stroke="${P.ink}" stroke-width="3.5"/>` +
      `<ellipse cx="${f(cx - r * 0.35)}" cy="${f(cy - r * 0.4)}" rx="${f(r * 0.28)}" ry="${f(r * 0.18)}" fill="#fff" opacity=".9" transform="rotate(-30 ${f(cx - r * 0.35)} ${f(cy - r * 0.4)})"/>`);
    return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r + 2)}" fill="${P.ink}"/>`;
  }
  // Small indicator lights.
  leds(list, col, r = 3) {
    for (const [x, y] of list) this.glow(`<circle cx="${f(x)}" cy="${f(y)}" r="${r * 2.6}" fill="${col.c}" opacity=".55" filter="url(#bloom)"/><circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${col.core}"/>`);
    return list.map(([x, y]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r + 1.8}" fill="${P.ink}"/>`).join('');
  }
  // Lightning arc between two points (glow only, no ink).
  bolt(x1, y1, x2, y2, col, { jag = 14, seg = 7, w = 3.5, fork = true } = {}) {
    const p = [[x1, y1]];
    for (let i = 1; i < seg; i++) {
      const t = i / seg;
      p.push([lerp(x1, x2, t) + this.rand(-jag, jag), lerp(y1, y2, t) + this.rand(-jag, jag)]);
    }
    p.push([x2, y2]);
    let d = `M${pts(p).replace(/ /g, ' L')}`;
    if (fork) {
      const k = Math.floor(this.rand(2, seg - 1));
      const [fx, fy] = p[k];
      d += ` M${f(fx)} ${f(fy)} L${f(fx + this.rand(-30, 30))} ${f(fy + this.rand(-10, 30))} L${f(fx + this.rand(-40, 40))} ${f(fy + this.rand(10, 40))}`;
    }
    this.glow(`<path d="${d}" fill="none" stroke="${col.c}" stroke-width="${w * 3.5}" stroke-linejoin="round" stroke-linecap="round" opacity=".55" filter="url(#bloom)"/>` +
      `<path d="${d}" fill="none" stroke="${col.c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>` +
      `<path d="${d}" fill="none" stroke="${col.core}" stroke-width="${f(w * 0.4)}" stroke-linejoin="round" stroke-linecap="round"/>`);
    return '';
  }
  // Comic flame: layered teardrops with a thin ink outline. angle in degrees
  // (0 = pointing up). s = size (height in px).
  flame(x, y, s = 40, angle = 0, col = P.fire, { blue = false } = {}) {
    const outer = blue ? '#3fa8ff' : col.deep, mid = blue ? '#7fe0ff' : col.c, inner = blue ? '#e8fbff' : col.core;
    const tear = (k, wob) => {
      const h = s * k, w = s * k * 0.42;
      const tip = this.rand(-wob, wob);
      return `M0 0 C${f(-w)} ${f(-h * 0.1)} ${f(-w * 0.9)} ${f(-h * 0.55)} ${f(tip)} ${f(-h)} C${f(w * 0.2 + tip * 0.5)} ${f(-h * 0.7)} ${f(w)} ${f(-h * 0.5)} ${f(w * 0.8)} ${f(-h * 0.15)} C${f(w * 0.5)} ${f(h * 0.12)} ${f(-w * 0.5)} ${f(h * 0.12)} 0 0 Z`;
    };
    const g = `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(angle)})">` +
      `<path d="${tear(1, s * 0.15)}" fill="${outer}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="${tear(0.72, s * 0.1)}" fill="${mid}" transform="translate(0 ${f(s * 0.04)})"/>` +
      `<path d="${tear(0.42, s * 0.06)}" fill="${inner}" transform="translate(0 ${f(s * 0.06)})"/></g>`;
    this.glow(`<circle cx="${f(x + Math.sin((angle * Math.PI) / 180) * s * 0.45)}" cy="${f(y - Math.cos((angle * Math.PI) / 180) * s * 0.45)}" r="${f(s * 0.75)}" fill="${blue ? '#3fa8ff' : col.c}" opacity=".45" filter="url(#bloom)"/>` + g);
    return '';
  }
  // Holo screen / sign: dark frame, translucent face, scanlines, glyph.
  holo(x, y, w, h, col, glyph = 'target', { skew = 0 } = {}) {
    const id = this.id('sl');
    this.def(`<pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1.6" fill="${col.core}" opacity=".35"/></pattern>`);
    const tr = skew ? ` transform="skewY(${skew})"` : '';
    let gl = '';
    const mx = x + w / 2, my = y + h / 2, r = Math.min(w, h) * 0.3;
    if (glyph === 'target') gl = `<circle cx="${f(mx)}" cy="${f(my)}" r="${f(r)}" fill="none" stroke="${col.core}" stroke-width="2"/><path d="M${f(mx - r * 1.5)} ${f(my)}H${f(mx + r * 1.5)}M${f(mx)} ${f(my - r * 1.5)}V${f(my + r * 1.5)}" stroke="${col.core}" stroke-width="1.6"/>`;
    if (glyph === 'bars') { for (let i = 0; i < 4; i++) { const bh = h * this.rand(0.2, 0.7); gl += `<rect x="${f(x + 5 + i * (w - 10) / 4)}" y="${f(y + h - 4 - bh)}" width="${f((w - 10) / 4 - 3)}" height="${f(bh)}" fill="${col.core}" opacity=".9"/>`; } }
    if (glyph === 'bolt') gl = `<path d="M${f(mx + r * 0.3)} ${f(my - r * 1.3)} L${f(mx - r * 0.6)} ${f(my + r * 0.1)} L${f(mx + r * 0.1)} ${f(my + r * 0.1)} L${f(mx - r * 0.3)} ${f(my + r * 1.3)} L${f(mx + r * 0.7)} ${f(my - r * 0.2)} L${f(mx)} ${f(my - r * 0.2)} Z" fill="${col.core}"/>`;
    if (glyph === 'flame') gl = `<path d="M${f(mx)} ${f(my + r * 1.2)} C${f(mx - r * 1.2)} ${f(my + r * 0.6)} ${f(mx - r * 0.4)} ${f(my - r * 0.4)} ${f(mx)} ${f(my - r * 1.3)} C${f(mx + r * 0.2)} ${f(my - r * 0.3)} ${f(mx + r * 1.2)} ${f(my)} ${f(mx)} ${f(my + r * 1.2)} Z" fill="${col.core}"/>`;
    if (glyph === 'rocket') gl = `<path d="M${f(mx - r)} ${f(my + r)} L${f(mx + r * 0.8)} ${f(my - r * 0.8)} M${f(mx + r * 0.2)} ${f(my - r * 0.9)} L${f(mx + r * 0.9)} ${f(my - r * 0.9)} L${f(mx + r * 0.9)} ${f(my - r * 0.2)}" stroke="${col.core}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    if (glyph === 'skull') gl = `<circle cx="${f(mx)}" cy="${f(my - r * 0.2)}" r="${f(r * 0.8)}" fill="${col.core}"/><rect x="${f(mx - r * 0.45)}" y="${f(my + r * 0.3)}" width="${f(r * 0.9)}" height="${f(r * 0.6)}" fill="${col.core}"/><circle cx="${f(mx - r * 0.3)}" cy="${f(my - r * 0.2)}" r="${f(r * 0.22)}" fill="${col.deep}"/><circle cx="${f(mx + r * 0.3)}" cy="${f(my - r * 0.2)}" r="${f(r * 0.22)}" fill="${col.deep}"/>`;
    this.glow(`<g${tr}><rect x="${f(x - 4)}" y="${f(y - 4)}" width="${f(w + 8)}" height="${f(h + 8)}" fill="${col.c}" opacity=".35" filter="url(#bloom)"/>` +
      `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${col.deep}" opacity=".85"/>` +
      `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="url(#${id})"/>${gl}` +
      `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="none" stroke="${col.c}" stroke-width="2.5"/></g>`);
    return `<rect x="${f(x - 4)}" y="${f(y - 4)}" width="${f(w + 8)}" height="${f(h + 8)}" fill="${P.ink}"${tr}/>`;
  }
  // Stencil / sign text. glowCol makes it a neon sign instead of paint.
  text(str, x, y, { size = 14, color = P.hazard[0], rot = 0, glowCol = null, font = 'Bungee', anchor = 'middle', skew = 0, opacity = 1 } = {}) {
    this.usesFont = true;
    const tr = `translate(${f(x)} ${f(y)}) rotate(${f(rot)})${skew ? ` skewY(${skew})` : ''}`;
    const t = `<text transform="${tr}" font-family="${font}, sans-serif" font-weight="700" font-size="${size}" text-anchor="${anchor}"`;
    if (glowCol) {
      this.glow(`${t} fill="${glowCol.c}" opacity=".8" filter="url(#bloom)">${str}</text>${t} fill="${glowCol.core}" stroke="${glowCol.c}" stroke-width="1.2" paint-order="stroke">${str}</text>`);
      return '';
    }
    return `${t} fill="${color}" opacity="${opacity}" stroke="${P.ink}" stroke-width="${f(size * 0.16)}" paint-order="stroke" stroke-linejoin="round">${str}</text>`;
  }
  // Tattered cloth banner on a little pole (the map's teal pennants).
  banner(x, y, w = 26, h = 54, tones = P.teal, { pole = 70, wave = 1 } = {}) {
    const top = y - pole;
    let s = `<rect x="${f(x - 2.5)}" y="${f(top - 6)}" width="5" height="${f(pole + 6)}" fill="${P.wood[2]}" stroke="${P.ink}" stroke-width="2.5"/>`;
    s += `<circle cx="${f(x)}" cy="${f(top - 8)}" r="4" fill="${P.brass[1]}" stroke="${P.ink}" stroke-width="2.5"/>`;
    const bx = x + 2, by = top;
    const cloth = `M${f(bx)} ${f(by)} C${f(bx + w * 0.5)} ${f(by - 4 * wave)} ${f(bx + w)} ${f(by + 3 * wave)} ${f(bx + w + 2)} ${f(by + 2)} L${f(bx + w + 4 * wave)} ${f(by + h)} L${f(bx + w * 0.62)} ${f(by + h * 0.78)} L${f(bx + w * 0.35)} ${f(by + h * 0.98)} L${f(bx + 2)} ${f(by + h * 0.8)} Z`;
    s += `<path d="${cloth}" fill="${tones[2]}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>`;
    s += `<path d="M${f(bx + 3)} ${f(by + 3)} L${f(bx + w * 0.4)} ${f(by + 2)} L${f(bx + w * 0.3)} ${f(by + h * 0.75)} L${f(bx + 3)} ${f(by + h * 0.72)} Z" fill="${tones[1]}"/>`;
    s += `<path d="${cloth}" fill="none" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>`;
    return s;
  }
  // Contact shadow where a form meets the ground or a floor (ambient occlusion).
  ao(cx, y, rx, ry, op = 0.55) {
    return `<ellipse cx="${f(cx + 4)}" cy="${f(y + 2)}" rx="${f(rx)}" ry="${f(ry)}" fill="${P.ink}" opacity="${op}" filter="url(#soft)"/>`;
  }
  // Bolted sign board with neon lettering (readable at 2x, a colour blip at 1x).
  sign(x, y, w, h, str, col, { size, rot = 0 } = {}) {
    const fs = size || Math.min(h * 0.62, (w / Math.max(4, str.length)) * 1.45);
    const cx = x + w / 2;
    let s = `<g transform="rotate(${f(rot)} ${f(cx)} ${f(y + h / 2)})">`;
    s += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="3" fill="#2a2430" stroke="${P.ink}" stroke-width="3.5"/>`;
    s += `<rect x="${f(x + 3)}" y="${f(y + 3)}" width="${f(w - 6)}" height="${f(h * 0.3)}" fill="#3b3444"/>`;
    s += this.rivets([[x + 5, y + 5], [x + w - 5, y + 5], [x + 5, y + h - 5], [x + w - 5, y + h - 5]], 1.8);
    s += `</g>`;
    this.usesFont = true;
    const t = `<text transform="translate(${f(cx)} ${f(y + h / 2 + fs * 0.36)}) rotate(${f(rot)})" font-family="Bungee, sans-serif" font-size="${f(fs)}" text-anchor="middle"`;
    this.glow(`${t} fill="${col.c}" opacity=".9" filter="url(#bloom)">${str}</text>${t} fill="${col.core}" stroke="${col.c}" stroke-width="1.4" paint-order="stroke">${str}</text>`);
    return s;
  }
  // Lantern / warm window glow like the map's lit windows.
  window(x, y, w = 14, h = 20) {
    this.glow(`<ellipse cx="${f(x + w / 2)}" cy="${f(y + h / 2)}" rx="${f(w * 1.2)}" ry="${f(h)}" fill="${P.warm[2]}" opacity=".45" filter="url(#bloom)"/>`);
    return `<path d="M${f(x)} ${f(y + h)} V${f(y + w / 2)} A${f(w / 2)} ${f(w / 2)} 0 0 1 ${f(x + w)} ${f(y + w / 2)} V${f(y + h)} Z" fill="${this.vgrad(P.warm[0], P.warm[2])}" stroke="${P.ink}" stroke-width="3"/>`;
  }
  // Satellite / radar dish facing up-left.
  dish(cx, cy, r = 26, tones = P.steel, rot = -25) {
    return `<g transform="rotate(${rot} ${f(cx)} ${f(cy)})"><ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(r)}" ry="${f(r * 0.55)}" fill="${tones[2]}" stroke="${P.ink}" stroke-width="3.5"/>` +
      `<ellipse cx="${f(cx)}" cy="${f(cy - r * 0.06)}" rx="${f(r * 0.85)}" ry="${f(r * 0.42)}" fill="${tones[0]}"/>` +
      `<ellipse cx="${f(cx + r * 0.15)}" cy="${f(cy + r * 0.02)}" rx="${f(r * 0.55)}" ry="${f(r * 0.26)}" fill="${tones[1]}"/>` +
      `<path d="M${f(cx)} ${f(cy)} L${f(cx)} ${f(cy - r * 0.9)}" stroke="${P.ink}" stroke-width="3"/><circle cx="${f(cx)}" cy="${f(cy - r * 0.9)}" r="4" fill="${tones[3]}" stroke="${P.ink}" stroke-width="2.5"/></g>`;
  }
  // Thin antenna mast with a blinking tip.
  antenna(x, yBot, h = 60, col = null) {
    let s = `<path d="M${f(x)} ${f(yBot)} V${f(yBot - h)}" stroke="${P.ink}" stroke-width="5" stroke-linecap="round"/><path d="M${f(x)} ${f(yBot)} V${f(yBot - h)}" stroke="${P.iron[1]}" stroke-width="2" stroke-linecap="round"/>`;
    s += `<path d="M${f(x - 8)} ${f(yBot - h * 0.6)} H${f(x + 8)} M${f(x - 5)} ${f(yBot - h * 0.8)} H${f(x + 5)}" stroke="${P.ink}" stroke-width="2.5"/>`;
    if (col) s += this.leds([[x, yBot - h - 3]], col, 3);
    return s;
  }
}

// Bounding box of a path's numbers (good enough for hatch extents).
function pathBox(d) {
  const n = d.match(/-?\d+(\.\d+)?/g).map(Number);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i + 1 < n.length; i += 2) {
    x0 = Math.min(x0, n[i]); x1 = Math.max(x1, n[i]);
    y0 = Math.min(y0, n[i + 1]); y1 = Math.max(y1, n[i + 1]);
  }
  return [x0, y0, x1, y1];
}

// Shared filters: ink outline (dilated silhouette), painterly wobble + grain,
// bloom for neon, soft blur for shadows.
function baseDefs(seed) {
  const s = (seed % 97) + 3;
  return `
<filter id="outline" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
  <feMorphology in="SourceAlpha" operator="dilate" radius="3.2" result="d"/>
  <feFlood flood-color="${P.ink}"/><feComposite in2="d" operator="in" result="o"/>
  <feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
<filter id="paint" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="${s}" result="warp"/>
  <feDisplacementMap in="SourceGraphic" in2="warp" scale="3.2" xChannelSelector="R" yChannelSelector="G" result="wob"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="${s + 1}" result="mot"/>
  <feColorMatrix in="mot" type="matrix" values="0.6 0 0 0 0.64  0.6 0 0 0 0.62  0.6 0 0 0 0.58  0 0 0 0 1" result="motC"/>
  <feBlend in="wob" in2="motC" mode="multiply" result="m1"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.018 0.16" numOctaves="2" seed="${s + 2}" result="br"/>
  <feColorMatrix in="br" type="matrix" values="0.5 0 0 0 0.72  0.5 0 0 0 0.7  0.5 0 0 0 0.67  0 0 0 0 1" result="brC"/>
  <feBlend in="m1" in2="brC" mode="multiply" result="m2"/>
  <feComposite in="m2" in2="wob" operator="in" result="m3"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="${s + 3}" result="fine"/>
  <feColorMatrix in="fine" type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.08  0 0 0 0 0.05  -1.6 0 0 0 0.72" result="speck"/>
  <feComposite in="speck" in2="wob" operator="in" result="speck2"/>
  <feMerge><feMergeNode in="m3"/><feMergeNode in="speck2"/></feMerge>
</filter>
<filter id="bloom" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="7"/></filter>
<filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>`;
}

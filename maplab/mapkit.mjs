// Map-scale drawing kit for the Neon Wasteland map. Extends the tower kit
// (../towerlab/kit.mjs: read it for stone, timber, iron, neon, flames, bolts,
// holo screens, signs, banners, dishes, antennae, hatching ...) with props for a
// cyberpunk x Borderlands wasteland: shipping containers, corrugated metal,
// concrete, chain-link fences, power pylons and lines, billboards, barrels,
// tyres, wrecked cars, street lights, light pools and graffiti.
//
// Coordinates are MAP pixels at 2x: the map is 3344 x 1882 (the reference
// picture is 1672 x 941; multiply its coordinates by 2). At this scale a tower
// sprite is drawn at 1:1, so the kit's line weights match the towers.
//
// Three kinds of output per layer (see compose.mjs):
//   ground  - flat things on the ground, no ink outline (decals, patches, tracks, pools)
//   objects - standing things: wrap them in K.part(name, fn) to get the ink outline + glows
//   light   - additive light (screen blend): light pools, beams, haze. Use K.lightPool etc.
export { P, BRAND, f, rng } from '../towerlab/kit.mjs';
import { Kit, P, f } from '../towerlab/kit.mjs';

export const MW = 3344, MH = 1882;
const pts = (a) => a.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
const lerp = (a, b, t) => a + (b - a) * t;

// Extra palette for the wasteland.
export const MP = {
  sand: ['#f0c27a', '#d9a15a', '#b97f40', '#8a5a2b', '#5c3a1c'],
  concrete: ['#c9c4bb', '#a29d94', '#7b776f', '#55524c', '#36342f'],
  rustmetal: ['#d98a4e', '#b0612f', '#82431f', '#552910'],
  container: {
    red: ['#e0644a', '#b8432f', '#842a1c', '#561a10'],
    blue: ['#4f9cc2', '#33739a', '#22506e', '#163346'],
    yellow: ['#f2c443', '#cf9a22', '#9a6d12', '#62440a'],
    teal: ['#63b3a6', '#3f8a80', '#2a625b', '#1a3f3a'],
    grey: ['#a7a8a6', '#7f817f', '#5a5c5a', '#3b3c3b'],
  },
  toxic: { c: '#9dff3a', core: '#efffcf', deep: '#2f7a0a' },
  hot: { c: '#ff3d6e', core: '#ffe1ea', deep: '#8a0f33' },
  amber: { c: '#ffb52e', core: '#fff1c8', deep: '#9a5a00' },
};

export class MapKit extends Kit {
  constructor(seed = 1) { super(seed); this.lights = []; }

  // A full-map SVG document (same filters as the towers).
  mapDoc(body, { w = MW, h = MH, title = 'map layer' } = {}) {
    return this.doc(body, { title, w, h });
  }
  // Plain SVG without the paint filter (used for the light layer).
  rawDoc(body, { w = MW, h = MH } = {}) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs>${this.defs.join('')}<filter id="bloomL" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="14"/></filter></defs>${body}</svg>`;
  }

  // ------------------------------------------------------------ ground
  // Irregular sand patch with a soft edge: paints over old features on the map.
  groundPatch(cx, cy, rx, ry, { tones = MP.sand, soft = 10, jag = 0.18, n = 18 } = {}) {
    const p = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = 1 + this.rand(-jag, jag);
      p.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
    }
    const d = smoothPath(p);
    const fid = this.id('gp');
    this.def(`<filter id="${fid}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${soft}"/></filter>`);
    let s = `<path d="${d}" fill="${tones[1]}" filter="url(#${fid})"/>`;
    // dusty mottling and pebbles
    for (let i = 0; i < Math.round((rx * ry) / 900); i++) {
      const a = this.rand(0, Math.PI * 2), r = Math.sqrt(this.r()) * 0.85;
      const x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r;
      const t = this.r();
      if (t < 0.55) s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(this.rand(8, 26))}" ry="${f(this.rand(3, 9))}" fill="${this.pick([tones[0], tones[2]])}" opacity="${f(this.rand(0.25, 0.5))}"/>`;
      else if (t < 0.85) s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(this.rand(1.5, 3.5))}" ry="${f(this.rand(1, 2.5))}" fill="${P.ink}" opacity=".55"/>`;
      else s += `<path d="M${f(x)} ${f(y)} q${f(this.rand(-10, 10))} ${f(this.rand(-3, 3))} ${f(this.rand(-20, 20))} ${f(this.rand(-2, 2))}" stroke="${tones[3]}" stroke-width="1.6" fill="none" opacity=".6"/>`;
    }
    return s;
  }
  // Cracked asphalt / concrete apron (flat), with paint lines.
  apron(poly, { tone = '#4a4440', crack = true, lines = [] } = {}) {
    let s = `<polygon points="${pts(poly)}" fill="${tone}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>`;
    const [x0, y0, x1, y1] = bbox(poly);
    const cid = this.id('ap');
    this.def(`<clipPath id="${cid}"><polygon points="${pts(poly)}"/></clipPath>`);
    let inner = '';
    for (let i = 0; i < ((x1 - x0) * (y1 - y0)) / 5000; i++) {
      const x = this.rand(x0, x1), y = this.rand(y0, y1);
      inner += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(this.rand(10, 40))}" ry="${f(this.rand(4, 14))}" fill="${this.pick(['#5a534d', '#3d3834', '#2f2b28'])}" opacity="${f(this.rand(0.3, 0.6))}"/>`;
    }
    if (crack) for (let i = 0; i < ((x1 - x0) * (y1 - y0)) / 22000; i++) {
      let x = this.rand(x0, x1), y = this.rand(y0, y1), d = `M${f(x)} ${f(y)}`;
      for (let k = 0; k < 4; k++) { x += this.rand(-22, 22); y += this.rand(-10, 10); d += ` L${f(x)} ${f(y)}`; }
      inner += `<path d="${d}" stroke="${P.ink}" stroke-width="1.8" fill="none" opacity=".75"/>`;
    }
    for (const l of lines) inner += `<path d="${l.d}" stroke="${l.color || '#e8c33a'}" stroke-width="${l.w || 6}" stroke-dasharray="${l.dash || ''}" fill="none" opacity=".9"/>`;
    s += `<g clip-path="url(#${cid})">${inner}</g>`;
    return s;
  }
  // Tyre tracks along a path (two parallel dashed ruts).
  tracks(d, { w = 22, tone = '#5c3a1c', op = 0.35 } = {}) {
    return `<path d="${d}" fill="none" stroke="${tone}" stroke-width="${w + 7}" stroke-dasharray="14 9" opacity="${op}"/>` +
      `<path d="${d}" fill="none" stroke="${MP.sand[1]}" stroke-width="${w}" opacity="${op + 0.15}"/>`;
  }
  // Oil / coolant stain.
  stain(cx, cy, r, color = '#1b1612', op = 0.45) {
    const p = [];
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const k = this.rand(0.6, 1.15); p.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * 0.5 * k]); }
    return `<path d="${smoothPath(p)}" fill="${color}" opacity="${op}"/>`;
  }

  // ------------------------------------------------------------ structures
  // Shipping container in the map's oblique view. x,y = bottom-left of the front face.
  container({ x, y, w = 120, h = 52, d = 50, color = 'red', text = '', doors = false }) {
    const t = MP.container[color] || color;
    let s = this.box({ x, y, w, h, d, tones: [t[0], t[1], t[2], t[3]], stroke: 3.5 });
    // corrugation ribs on the front
    for (let xx = x + 8; xx < x + w - 4; xx += 9) s += `<path d="M${f(xx)} ${f(y - h + 4)} V${f(y - 4)}" stroke="${t[3]}" stroke-width="2" opacity=".55"/>`;
    // ribs on the side
    const dx = d * 0.22, dy = d * 0.5;
    for (let k = 1; k < 5; k++) { const u = k / 5; s += `<path d="M${f(x + w + dx * u)} ${f(y - h - dy * u + 4)} V${f(y - dy * u - 4)}" stroke="${t[3]}" stroke-width="2" opacity=".6"/>`; }
    // rust streaks
    for (let k = 0; k < 3; k++) { const xx = x + this.rand(10, w - 10); s += `<path d="M${f(xx)} ${f(y - h + 6)} v${f(this.rand(10, h * 0.7))}" stroke="${MP.rustmetal[1]}" stroke-width="${f(this.rand(2, 4))}" opacity=".55" stroke-linecap="round"/>`; }
    if (doors) s += `<path d="M${f(x + w * 0.5)} ${f(y - h + 3)} V${f(y - 3)}" stroke="${P.ink}" stroke-width="2.5"/><path d="M${f(x + w * 0.42)} ${f(y - h * 0.6)} v${f(h * 0.25)} M${f(x + w * 0.58)} ${f(y - h * 0.6)} v${f(h * 0.25)}" stroke="${P.ink}" stroke-width="3.5"/>`;
    if (text) s += this.text(text, x + w / 2, y - h * 0.35, { size: Math.min(16, h * 0.32), color: '#f1e4c8', opacity: 0.85 });
    return s;
  }
  // Corrugated sheet fill inside a polygon (roofs, walls, patches).
  corrugated(poly, { tones = MP.rustmetal, angle = 90, pitch = 8 } = {}) {
    const id = this.id('cg');
    this.def(`<pattern id="${id}" width="${pitch}" height="${pitch}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})"><rect width="${pitch}" height="${pitch}" fill="${tones[1]}"/><rect width="${pitch * 0.35}" height="${pitch}" fill="${tones[0]}"/><rect x="${pitch * 0.7}" width="${pitch * 0.3}" height="${pitch}" fill="${tones[2]}"/></pattern>`);
    return `<polygon points="${pts(poly)}" fill="url(#${id})" stroke="${P.ink}" stroke-width="3.5" stroke-linejoin="round"/>`;
  }
  // Concrete block / bunker with panel seams, stains and an optional stripe.
  concrete({ x, y, w, h, d = 50, tones = MP.concrete, seams = true, stripe = false }) {
    let s = this.box({ x, y, w, h, d, tones: [tones[0], tones[1], tones[2], tones[3]] });
    if (seams) for (let xx = x + 40; xx < x + w - 10; xx += 40 + this.rand(-6, 6)) s += `<path d="M${f(xx)} ${f(y - h + 3)} V${f(y - 3)}" stroke="${tones[3]}" stroke-width="2" opacity=".7"/>`;
    for (let k = 0; k < Math.max(2, w / 50); k++) { const xx = x + this.rand(6, w - 6); s += `<path d="M${f(xx)} ${f(y - h + 3)} q${f(this.rand(-3, 3))} ${f(h * 0.3)} 0 ${f(this.rand(h * 0.3, h * 0.8))}" stroke="${tones[3]}" stroke-width="${f(this.rand(3, 7))}" opacity=".35" fill="none" stroke-linecap="round"/>`; }
    if (stripe) s += this.hazard([[x + 2, y - 14], [x + w - 2, y - 14], [x + w - 2, y - 4], [x + 2, y - 4]], { w: 7 });
    return s;
  }
  // Chain-link fence segment with posts and barbed wire on top.
  chainFence(x1, y1, x2, y2, h = 46) {
    const id = this.id('cl');
    this.def(`<pattern id="${id}" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0 V9 M0 0 H9" stroke="#8d8a84" stroke-width="1.4"/></pattern>`);
    let s = `<polygon points="${pts([[x1, y1 - h], [x2, y2 - h], [x2, y2], [x1, y1]])}" fill="url(#${id})" opacity=".85"/>`;
    const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 60));
    for (let i = 0; i <= n; i++) { const t = i / n; const x = lerp(x1, x2, t), y = lerp(y1, y2, t); s += `<path d="M${f(x)} ${f(y)} V${f(y - h - 8)}" stroke="${P.ink}" stroke-width="6" stroke-linecap="round"/><path d="M${f(x)} ${f(y)} V${f(y - h - 8)}" stroke="${P.iron[1]}" stroke-width="2.5" stroke-linecap="round"/>`; }
    // barbed wire coil
    let d = '';
    const L = Math.hypot(x2 - x1, y2 - y1);
    for (let k = 0; k <= L; k += 7) { const t = k / L; const x = lerp(x1, x2, t), y = lerp(y1, y2, t) - h - 6 + Math.sin(k * 0.9) * 4; d += `${k ? 'L' : 'M'}${f(x)} ${f(y)}`; }
    s += `<path d="${d}" stroke="${P.ink}" stroke-width="2.6" fill="none"/>`;
    s += `<path d="M${f(x1)} ${f(y1 - h)} L${f(x2)} ${f(y2 - h)} M${f(x1)} ${f(y1 - 4)} L${f(x2)} ${f(y2 - 4)}" stroke="${P.ink}" stroke-width="3"/>`;
    return s;
  }
  // Lattice power pylon. Returns the svg; arm tips are at (x ± w*0.6, yBot-h*0.86).
  pylon(x, yBot, h = 220, w = 70) {
    const top = yBot - h;
    const L = [[x - w / 2, yBot], [x - w * 0.12, top + h * 0.1]], R = [[x + w / 2, yBot], [x + w * 0.12, top + h * 0.1]];
    let d = `M${f(L[0][0])} ${f(L[0][1])} L${f(L[1][0])} ${f(L[1][1])} L${f(x)} ${f(top)} L${f(R[1][0])} ${f(R[1][1])} L${f(R[0][0])} ${f(R[0][1])}`;
    const steps = 7;
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps, t1 = (i + 1) / steps;
      const a = [lerp(L[0][0], L[1][0], t0), lerp(L[0][1], L[1][1], t0)], b = [lerp(R[0][0], R[1][0], t1), lerp(R[0][1], R[1][1], t1)];
      const c = [lerp(R[0][0], R[1][0], t0), lerp(R[0][1], R[1][1], t0)], e = [lerp(L[0][0], L[1][0], t1), lerp(L[0][1], L[1][1], t1)];
      d += ` M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])} M${f(c[0])} ${f(c[1])} L${f(e[0])} ${f(e[1])} M${f(a[0])} ${f(a[1])} L${f(c[0])} ${f(c[1])}`;
    }
    const ay = yBot - h * 0.86, ay2 = yBot - h * 0.66;
    d += ` M${f(x - w * 0.62)} ${f(ay)} L${f(x + w * 0.62)} ${f(ay)} M${f(x - w * 0.5)} ${f(ay2)} L${f(x + w * 0.5)} ${f(ay2)}`;
    let s = `<path d="${d}" fill="none" stroke="${P.ink}" stroke-width="6.5" stroke-linejoin="round" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${P.iron[1]}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>`;
    for (const xx of [x - w * 0.62, x + w * 0.62, x - w * 0.5, x + w * 0.5]) {
      const yy = Math.abs(xx - x) > w * 0.55 ? ay : ay2;
      s += `<rect x="${f(xx - 3)}" y="${f(yy)}" width="6" height="12" rx="2" fill="#d9d2c0" stroke="${P.ink}" stroke-width="2.2"/>`;
    }
    return s;
  }
  // Sagging power line through points (draw after the pylons).
  powerline(points, { sag = 26, w = 2.6 } = {}) {
    let d = '';
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, y1] = points[i], [x2, y2] = points[i + 1];
      d += `${i ? '' : `M${f(x1)} ${f(y1)}`} Q${f((x1 + x2) / 2)} ${f((y1 + y2) / 2 + sag)} ${f(x2)} ${f(y2)}`;
    }
    return `<path d="${d}" fill="none" stroke="${P.ink}" stroke-width="${w + 2.2}"/><path d="${d}" fill="none" stroke="#3a3540" stroke-width="${w}"/>`;
  }
  // Billboard on legs with a neon / holo face (str shown as neon letters).
  billboard(x, yBot, w, h, str, col, { legs = 70, glyph = null, tilt = 0 } = {}) {
    const top = yBot - legs - h;
    let s = this.post(x + w * 0.22, top + h - 6, yBot, 10, P.iron) + this.post(x + w * 0.78, top + h - 6, yBot, 10, P.iron);
    s += this.beam(x + w * 0.22, yBot - legs * 0.3, x + w * 0.78, top + h + 6, 6, P.iron);
    s += `<g transform="rotate(${tilt} ${f(x + w / 2)} ${f(top + h / 2)})"><rect x="${f(x - 6)}" y="${f(top - 6)}" width="${f(w + 12)}" height="${f(h + 12)}" fill="${P.iron[3]}" stroke="${P.ink}" stroke-width="4"/></g>`;
    s += this.holo(x, top, w, h, col, glyph || 'bars');
    if (str) s += this.text(str, x + w / 2, top + h * 0.62, { size: Math.min(h * 0.42, (w / str.length) * 1.5), glowCol: col });
    // catwalk lamps
    s += this.leds([[x + 8, top - 10], [x + w - 8, top - 10]], col, 2.5);
    return s;
  }
  // Oil drum (upright cylinder) with a hazard band or a colour.
  drum(x, yBot, r = 13, color = 'rust') {
    const tones = color === 'rust' ? [MP.rustmetal[0], MP.rustmetal[1], MP.rustmetal[2], MP.rustmetal[3]] : (MP.container[color] || P.iron);
    return this.cyl({ cx: x, y: yBot, rx: r, ry: r * 0.5, h: r * 2.4, tones, top: 'rim', stroke: 3, hatch: false }) +
      this.hoop(x, yBot - r * 0.8, r, r * 0.5, 4, P.ink) + this.hoop(x, yBot - r * 1.7, r, r * 0.5, 4, P.ink);
  }
  tyre(x, y, r = 14) {
    return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r)}" ry="${f(r * 0.55)}" fill="#26221f" stroke="${P.ink}" stroke-width="3"/><ellipse cx="${f(x)}" cy="${f(y - 1)}" rx="${f(r * 0.45)}" ry="${f(r * 0.22)}" fill="${P.ink}"/>` +
      `<path d="M${f(x - r * 0.8)} ${f(y - r * 0.2)} q${f(r * 0.8)} ${f(-r * 0.5)} ${f(r * 1.6)} 0" stroke="#4a4440" stroke-width="2" fill="none"/>`;
  }
  // Rusted wreck of a muscle car / pickup, facing left or right.
  wreck(x, yBot, { w = 120, color = 'red', flip = false } = {}) {
    const t = MP.container[color] || MP.container.red;
    const g = (inner) => `<g transform="${flip ? `translate(${f(x * 2 + w)} 0) scale(-1 1)` : ''}">${inner}</g>`;
    let s = '';
    s += this.box({ x, y: yBot - 12, w, h: 26, d: 50, tones: [t[0], t[1], t[2], t[3]], stroke: 3.5 });
    s += `<polygon points="${pts([[x + w * 0.3, yBot - 38], [x + w * 0.42, yBot - 60], [x + w * 0.78, yBot - 60], [x + w * 0.86, yBot - 38]])}" fill="${t[1]}" stroke="${P.ink}" stroke-width="3.5" stroke-linejoin="round"/>`;
    s += `<polygon points="${pts([[x + w * 0.45, yBot - 56], [x + w * 0.55, yBot - 56], [x + w * 0.52, yBot - 41], [x + w * 0.38, yBot - 41]])}" fill="#2f3a44" stroke="${P.ink}" stroke-width="2.5"/>`;
    for (let k = 0; k < 4; k++) s += `<ellipse cx="${f(x + this.rand(10, w - 10))}" cy="${f(yBot - this.rand(18, 34))}" rx="${f(this.rand(6, 14))}" ry="${f(this.rand(3, 6))}" fill="${MP.rustmetal[1]}" opacity=".8"/>`;
    s += this.tyre(x + w * 0.2, yBot - 6, 13) + this.tyre(x + w * 0.8, yBot - 6, 13);
    return g(s);
  }
  // Street lamp; adds a light pool to the light layer.
  streetLight(x, yBot, h = 110, col = MP.amber, { arm = 34, dir = -1 } = {}) {
    let s = `<path d="M${f(x)} ${f(yBot)} V${f(yBot - h)} h${f(dir * arm)}" fill="none" stroke="${P.ink}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += `<path d="M${f(x)} ${f(yBot)} V${f(yBot - h)} h${f(dir * arm)}" fill="none" stroke="${P.iron[1]}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
    const lx = x + dir * arm, ly = yBot - h;
    s += `<rect x="${f(lx - 12)}" y="${f(ly - 4)}" width="24" height="10" rx="3" fill="${P.iron[3]}" stroke="${P.ink}" stroke-width="3"/>`;
    s += this.leds([[lx, ly + 8]], col, 5);
    this.lightPool(lx + dir * 6, yBot + 6, 90, 40, col, 0.5);
    this.lightCone(lx, ly + 8, lx + dir * 10, yBot, 70, col, 0.18);
    return s;
  }
  // Spray-paint tag (flat, put it in ground or on a wall).
  graffiti(x, y, str, color = '#ff3d9a', { size = 26, rot = -6 } = {}) {
    this.usesFont = true;
    let s = `<text transform="translate(${f(x)} ${f(y)}) rotate(${rot})" font-family="Bungee, sans-serif" font-size="${size}" text-anchor="middle" fill="${color}" opacity=".85" stroke="${P.ink}" stroke-width="2" paint-order="stroke">${str}</text>`;
    for (let i = 0; i < 4; i++) { const xx = x + this.rand(-size * str.length * 0.3, size * str.length * 0.3); s += `<path d="M${f(xx)} ${f(y + 2)} v${f(this.rand(6, 18))}" stroke="${color}" stroke-width="2" opacity=".7"/>`; }
    return s;
  }

  // ------------------------------------------------------------ light layer
  // These collect into this.lights; compose.mjs draws them with a screen blend.
  lightPool(cx, cy, rx, ry, col, op = 0.45) {
    const id = this.id('lp');
    this.def(`<radialGradient id="${id}"><stop offset="0" stop-color="${col.c}" stop-opacity="${op}"/><stop offset=".55" stop-color="${col.c}" stop-opacity="${op * 0.35}"/><stop offset="1" stop-color="${col.c}" stop-opacity="0"/></radialGradient>`);
    this.lights.push(`<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="url(#${id})"/>`);
    return '';
  }
  lightCone(x1, y1, x2, y2, spread, col, op = 0.2) {
    const id = this.id('lc');
    this.def(`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col.c}" stop-opacity="${op}"/><stop offset="1" stop-color="${col.c}" stop-opacity="0"/></linearGradient>`);
    this.lights.push(`<polygon points="${pts([[x1 - 6, y1], [x1 + 6, y1], [x2 + spread, y2], [x2 - spread, y2]])}" fill="url(#${id})"/>`);
    return '';
  }
  // Soft coloured haze over an area (neon spill, toxic fumes).
  haze(cx, cy, rx, ry, col, op = 0.25) { return this.lightPool(cx, cy, rx, ry, col, op); }
}

// Catmull-Rom closed curve through points.
export function smoothPath(p) {
  const n = p.length;
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + 'Z';
}
function bbox(poly) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return [x0, y0, x1, y1];
}

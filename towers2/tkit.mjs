// Tower kit v2: the dark-steel cyberpunk tower look from the user's tower
// reference (ref/towers.jpg: SNIPER, PLASMA, RAILGUN, GARRISON), drawn with the
// same ink / light / cel rules as the Neon Wasteland map so towers sit on it.
//
// Builds on MapKit (../maplab/mapkit.mjs) which builds on the tower kit
// (../towerlab/kit.mjs). Read both. Sprite canvas 512 x 512, ground centre
// (256, 420); the shared octagonal base plate is the footprint.
export { P, MP, BRAND, f, rng, smoothPath } from '../maplab/mapkit.mjs';
import { MapKit, P, MP, f } from '../maplab/mapkit.mjs';

export const CX = 256, GY = 420;
const pts = (a) => a.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
const lerp = (a, b, t) => a + (b - a) * t;

// Palette sampled from the tower reference (light -> dark).
export const T = {
  gun: ['#aab5c6', '#7c8698', '#576072', '#3a404c', '#24272e'],     // blue gunmetal
  dark: ['#6f7586', '#4f5462', '#3a3d48', '#2a2c34', '#1b1c22'],    // near-black plating
  rim: '#cfe3e8',                                                   // pale cyan edge highlight
  rust: ['#c0733f', '#94522a', '#6a3518', '#45210c'],
  wood: ['#8a6a4f', '#6a4f3a', '#4c3829', '#33251a'],
  olive: ['#8d936a', '#6d7350', '#4f5439', '#353926'],
  brass: ['#f1d27e', '#c99a3c', '#8f6823', '#5a3f10'],
  cyan:    { c: '#3ff0ff', core: '#e8ffff', deep: '#0b7f95' },
  violet:  { c: '#a35cff', core: '#f0e4ff', deep: '#4c1fa0' },
  magenta: { c: '#ff3dc8', core: '#ffe2f6', deep: '#8c0f6a' },
  orange:  { c: '#ff8a1e', core: '#fff0c8', deep: '#a34400' },
  red:     { c: '#ff3a3a', core: '#ffe0e0', deep: '#8c0d0d' },
  blue:    { c: '#3a7bff', core: '#e2ecff', deep: '#0d2f8c' },
  green:   { c: '#7dff5a', core: '#ecffe2', deep: '#1f7a0c' },
};

export class TowerKit extends MapKit {
  // Carbon-fibre / brushed texture laid over a polygon (Borderlands-y plating).
  carbon(poly, { op = 0.28, scale = 6 } = {}) {
    const id = this.id('cf');
    this.def(`<pattern id="${id}" width="${scale}" height="${scale}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="${scale / 2}" height="${scale / 2}" fill="#000" opacity=".55"/><rect x="${scale / 2}" y="${scale / 2}" width="${scale / 2}" height="${scale / 2}" fill="#000" opacity=".55"/></pattern>`);
    return `<polygon points="${pts(poly)}" fill="url(#${id})" opacity="${op}"/>`;
  }
  // Armour plate polygon: fill, carbon texture, lit edge, rivets at corners.
  armour(poly, tones = T.gun, { carbon = true, rivets = true, edge = true, stroke = 3.5 } = {}) {
    let s = `<polygon points="${pts(poly)}" fill="${tones[1]}" stroke="${P.ink}" stroke-width="${stroke}" stroke-linejoin="round"/>`;
    if (carbon) s += this.carbon(poly);
    if (edge) s += `<polyline points="${pts([poly[poly.length - 1], poly[0], poly[1]].map(([x, y], i) => [x + (i === 1 ? 2 : 1.5), y + 2]))}" fill="none" stroke="${T.rim}" stroke-width="2" opacity=".55"/>`;
    if (rivets) s += this.rivets(poly.map(([x, y]) => { const c = centroid(poly); return [lerp(x, c[0], 0.12), lerp(y, c[1], 0.12)]; }), 2.2);
    return s;
  }

  // The shared octagonal base plate every tower stands on (cyan LED tiles on the
  // front faces, a grate, hazard stripes, bolts). Returns svg; top surface y = GY - th.
  basePlate({ cx = CX, cy = GY, rx = 136, ry = 68, th = 16, led = T.cyan, accent = T.red, grate = true, hazard = true } = {}) {
    const oct = (dy = 0, k = 1) => {
      const p = [];
      for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + (i / 8) * Math.PI * 2; p.push([cx + Math.cos(a) * rx * k, cy - th + dy + Math.sin(a) * ry * k]); }
      return p; // index 0..3 = lower (front) half going clockwise from right
    };
    const top = oct(0), bot = oct(th);
    let s = this.ao(cx + 10, cy + 6, rx * 1.02, ry * 0.95, 0.5);
    // side faces (front half: edges 7-0, 0-1, 1-2, 2-3, 3-4)
    const faces = [[7, 0], [0, 1], [1, 2], [2, 3], [3, 4]];
    for (const [a, b] of faces) {
      const poly = [top[a], top[b], bot[b], bot[a]];
      const mx = (top[a][0] + top[b][0]) / 2 - cx;
      const tone = mx < -rx * 0.3 ? T.gun[2] : mx > rx * 0.3 ? T.gun[4] : T.gun[3];
      s += `<polygon points="${pts(poly)}" fill="${tone}" stroke="${P.ink}" stroke-width="3.5" stroke-linejoin="round"/>`;
      // LED tile in the middle of the face
      const u0 = 0.36, u1 = 0.64;
      const p0 = [lerp(top[a][0], top[b][0], u0), lerp(top[a][1], top[b][1], u0) + th * 0.32];
      const p1 = [lerp(top[a][0], top[b][0], u1), lerp(top[a][1], top[b][1], u1) + th * 0.32];
      if (Math.abs(mx) < rx * 0.95) {
        const col = (a === 1 || a === 3) && accent ? accent : led;
        s += this.neon(`M${f(p0[0])} ${f(p0[1])} L${f(p1[0])} ${f(p1[1])}`, col, 3.2);
      }
    }
    // top surface
    s += `<polygon points="${pts(top)}" fill="${T.gun[2]}" stroke="${P.ink}" stroke-width="4" stroke-linejoin="round"/>`;
    s += this.carbon(top, { op: 0.18 });
    s += `<polygon points="${pts(oct(0, 0.86))}" fill="none" stroke="${T.gun[3]}" stroke-width="3"/>`;
    s += `<polyline points="${pts([top[4], top[5], top[6], top[7]])}" fill="none" stroke="${T.rim}" stroke-width="2.2" opacity=".5"/>`;
    // panel seams
    for (const k of [0, 2, 4, 6]) s += `<path d="M${f(lerp(cx, top[k][0], 0.86))} ${f(lerp(cy - th, top[k][1], 0.86))} L${f(top[k][0])} ${f(top[k][1])}" stroke="${P.ink}" stroke-width="2.2" opacity=".7"/>`;
    if (grate) {
      const gx = cx - rx * 0.62, gy = cy - th + ry * 0.38;
      const g = [[gx, gy], [gx + 46, gy - 4], [gx + 58, gy + 16], [gx + 12, gy + 20]];
      s += `<polygon points="${pts(g)}" fill="${T.dark[3]}" stroke="${P.ink}" stroke-width="2.5"/>`;
      for (let i = 1; i < 6; i++) { const t = i / 6; s += `<path d="M${f(lerp(g[0][0], g[3][0], t))} ${f(lerp(g[0][1], g[3][1], t))} L${f(lerp(g[1][0], g[2][0], t))} ${f(lerp(g[1][1], g[2][1], t))}" stroke="${T.gun[1]}" stroke-width="1.6" opacity=".7"/>`; }
    }
    if (hazard) {
      const hx = cx + rx * 0.18, hy = cy - th + ry * 0.62;
      s += this.hazard([[hx, hy], [hx + 56, hy - 8], [hx + 60, hy + 2], [hx + 4, hy + 10]], { w: 5 });
    }
    s += this.rivets([top[0], top[1], top[2], top[3], top[4], top[7]].map(([x, y]) => [lerp(x, cx, 0.07), lerp(y, cy - th, 0.07)]), 2.4);
    return s;
  }

  // Cone spike sticking out of a surface at an angle (degrees, 0 = right).
  spike(x, y, len = 26, angle = 0, w = 10) {
    const a = (angle * Math.PI) / 180, nx = -Math.sin(a), ny = Math.cos(a);
    const tip = [x + Math.cos(a) * len, y + Math.sin(a) * len];
    const b1 = [x + nx * w / 2, y + ny * w / 2], b2 = [x - nx * w / 2, y - ny * w / 2];
    const lit = ny < 0 ? b1 : b2;
    return `<polygon points="${pts([b1, tip, b2])}" fill="${T.gun[2]}" stroke="${P.ink}" stroke-width="2.8" stroke-linejoin="round"/>` +
      `<polygon points="${pts([lit, tip, [x, y]])}" fill="${T.gun[0]}"/>` +
      `<polygon points="${pts([b1, tip, b2])}" fill="none" stroke="${P.ink}" stroke-width="2.8" stroke-linejoin="round"/>`;
  }
  // Ladder from (x, y1) down to (x, y2).
  ladder(x, y1, y2, w = 22, tones = T.wood) {
    let s = '';
    for (let y = y1 + 10; y < y2 - 4; y += 13) s += `<path d="M${f(x - w / 2)} ${f(y)} H${f(x + w / 2)}" stroke="${P.ink}" stroke-width="6" stroke-linecap="round"/><path d="M${f(x - w / 2)} ${f(y)} H${f(x + w / 2)}" stroke="${tones[1]}" stroke-width="2.6" stroke-linecap="round"/>`;
    for (const xx of [x - w / 2, x + w / 2]) s += `<path d="M${f(xx)} ${f(y1)} V${f(y2)}" stroke="${P.ink}" stroke-width="7" stroke-linecap="round"/><path d="M${f(xx)} ${f(y1)} V${f(y2)}" stroke="${tones[0]}" stroke-width="3" stroke-linecap="round"/>`;
    return s;
  }
  // Camouflage / cargo net draped over a polygon (sagging bottom edge).
  net(poly, { tone = '#3a3f48', op = 0.95 } = {}) {
    const id = this.id('nt');
    this.def(`<pattern id="${id}" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0 V9 M0 0 H9" stroke="#8d96a6" stroke-width="1.3"/></pattern>`);
    return `<polygon points="${pts(poly)}" fill="${tone}" opacity="${op}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/><polygon points="${pts(poly)}" fill="url(#${id})" opacity=".8"/>`;
  }
  // Floodlight on a bracket; the beam goes to the glow layer. dir: degrees.
  floodlight(x, y, dir = 200, col = { c: '#fff2c4', core: '#ffffff', deep: '#b8a060' }, r = 10) {
    const a = (dir * Math.PI) / 180;
    const fx = x + Math.cos(a) * r * 0.6, fy = y + Math.sin(a) * r * 0.6;
    const L = 150, spread = 0.32;
    const b1 = [fx + Math.cos(a - spread) * L, fy + Math.sin(a - spread) * L], b2 = [fx + Math.cos(a + spread) * L, fy + Math.sin(a + spread) * L];
    const gid = this.id('fl');
    this.def(`<radialGradient id="${gid}" cx="${f(fx)}" cy="${f(fy)}" r="${L}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${col.c}" stop-opacity=".55"/><stop offset="1" stop-color="${col.c}" stop-opacity="0"/></radialGradient>`);
    this.glow(`<polygon points="${pts([[fx, fy], b1, b2])}" fill="url(#${gid})"/>`);
    let s = `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r + 2)}" fill="${T.dark[2]}" stroke="${P.ink}" stroke-width="3.2"/>`;
    s += `<ellipse cx="${f(fx)}" cy="${f(fy)}" rx="${f(r * 0.55)}" ry="${f(r * 0.8)}" transform="rotate(${f(dir)} ${f(fx)} ${f(fy)})" fill="${col.core}" stroke="${P.ink}" stroke-width="2.4"/>`;
    this.glow(`<circle cx="${f(fx)}" cy="${f(fy)}" r="${f(r * 1.6)}" fill="${col.c}" opacity=".7" filter="url(#bloom)"/>`);
    return s;
  }
  // Loudspeaker horn pointing in dir (degrees).
  megaphone(x, y, dir = 200, s0 = 1) {
    const a = (dir * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
    const L = 34 * s0, r0 = 6 * s0, r1 = 15 * s0;
    const p = [[x + nx * r0, y + ny * r0], [x + ux * L + nx * r1, y + uy * L + ny * r1], [x + ux * L - nx * r1, y + uy * L - ny * r1], [x - nx * r0, y - ny * r0]];
    let s = `<polygon points="${pts(p)}" fill="${T.gun[1]}" stroke="${P.ink}" stroke-width="3.2" stroke-linejoin="round"/>`;
    s += `<polygon points="${pts([p[0], p[1], [x + ux * L, y + uy * L], [x, y]])}" fill="${T.gun[0]}" opacity=".7"/>`;
    s += `<ellipse cx="${f(x + ux * L)}" cy="${f(y + uy * L)}" rx="${f(r1 * 0.45)}" ry="${f(r1)}" transform="rotate(${f(dir)} ${f(x + ux * L)} ${f(y + uy * L)})" fill="${T.dark[3]}" stroke="${P.ink}" stroke-width="3"/>`;
    s += `<circle cx="${f(x - ux * 6)}" cy="${f(y - uy * 6)}" r="${f(8 * s0)}" fill="${T.gun[2]}" stroke="${P.ink}" stroke-width="3"/>`;
    return s;
  }
  // Little quadcopter drone with glowing rotors.
  drone(x, y, col = T.cyan, s0 = 1) {
    let s = '';
    const arms = [[-22, -6], [22, -6], [-16, 6], [16, 6]].map(([dx, dy]) => [x + dx * s0, y + dy * s0]);
    for (const [ax, ay] of arms) s += `<path d="M${f(x)} ${f(y)} L${f(ax)} ${f(ay)}" stroke="${P.ink}" stroke-width="6" stroke-linecap="round"/><path d="M${f(x)} ${f(y)} L${f(ax)} ${f(ay)}" stroke="${T.gun[2]}" stroke-width="2.5" stroke-linecap="round"/>`;
    s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(12 * s0)}" ry="${f(7 * s0)}" fill="${T.gun[1]}" stroke="${P.ink}" stroke-width="3"/>`;
    for (const [ax, ay] of arms) {
      this.glow(`<ellipse cx="${f(ax)}" cy="${f(ay - 3)}" rx="${f(11 * s0)}" ry="${f(4 * s0)}" fill="${col.c}" opacity=".45" filter="url(#bloom)"/><ellipse cx="${f(ax)}" cy="${f(ay - 3)}" rx="${f(10 * s0)}" ry="${f(3.2 * s0)}" fill="none" stroke="${col.core}" stroke-width="1.6" opacity=".9"/>`);
    }
    s += this.leds([[x, y + 4 * s0]], col, 2.4);
    this.glow(`<ellipse cx="${f(x)}" cy="${f(y + 40 * s0)}" rx="${f(18 * s0)}" ry="${f(5 * s0)}" fill="${col.c}" opacity=".35" filter="url(#bloom)"/>`);
    return s;
  }
  // Vertical neon sign: letters stacked top to bottom in a dark frame.
  vsign(x, y, w, h, str, col) {
    let s = `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="4" fill="#1d1a24" stroke="${P.ink}" stroke-width="3.5"/>`;
    s += this.rivets([[x + 5, y + 5], [x + w - 5, y + 5], [x + 5, y + h - 5], [x + w - 5, y + h - 5]], 1.6);
    this.usesFont = true;
    const n = str.length, step = (h - 14) / n, fs = Math.min(w * 0.7, step * 0.9);
    let t = '';
    for (let i = 0; i < n; i++) t += `<text x="${f(x + w / 2)}" y="${f(y + 9 + step * (i + 0.5) + fs * 0.35)}" font-family="Bungee, sans-serif" font-size="${f(fs)}" text-anchor="middle">${str[i]}</text>`;
    this.glow(`<rect x="${f(x + 2)}" y="${f(y + 2)}" width="${f(w - 4)}" height="${f(h - 4)}" rx="3" fill="none" stroke="${col.c}" stroke-width="2.4"/><rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${col.c}" opacity=".25" filter="url(#bloom)"/>` +
      `<g fill="${col.c}" opacity=".85" filter="url(#bloom)">${t}</g><g fill="${col.core}" stroke="${col.c}" stroke-width="1" paint-order="stroke">${t}</g>`);
    return s;
  }
  // Glowing glass canister / capacitor tube with metal caps (upright).
  canister(x, yBot, r = 12, h = 36, col = T.cyan) {
    let s = this.cyl({ cx: x, y: yBot, rx: r + 3, ry: (r + 3) * 0.5, h: 8, tones: T.gun, top: 'flat', stroke: 3, hatch: false });
    const gy = yBot - 8;
    const fill = this.vgrad(col.core, col.c, { x2: 1, y2: 0 });
    s += `<path d="M${f(x - r)} ${f(gy - h)} L${f(x - r)} ${f(gy)} A${f(r)} ${f(r * 0.5)} 0 0 0 ${f(x + r)} ${f(gy)} L${f(x + r)} ${f(gy - h)} Z" fill="${col.deep}" stroke="${P.ink}" stroke-width="3"/>`;
    this.glow(`<path d="M${f(x - r + 3)} ${f(gy - h)} L${f(x - r + 3)} ${f(gy)} A${f(r - 3)} ${f((r - 3) * 0.5)} 0 0 0 ${f(x + r - 3)} ${f(gy)} L${f(x + r - 3)} ${f(gy - h)} Z" fill="${fill}" opacity=".9"/>` +
      `<rect x="${f(x - r * 0.55)}" y="${f(gy - h + 4)}" width="${f(r * 0.3)}" height="${f(h - 6)}" fill="#fff" opacity=".55"/>` +
      `<circle cx="${f(x)}" cy="${f(gy - h / 2)}" r="${f(r * 2.4)}" fill="${col.c}" opacity=".35" filter="url(#bloom)"/>`);
    s += this.cyl({ cx: x, y: gy - h + 2, rx: r + 3, ry: (r + 3) * 0.5, h: 9, tones: T.gun, top: 'rim', stroke: 3, hatch: false });
    return s;
  }
  // Ammo shell lying on the ground, pointing along angle (degrees).
  shell(x, y, len = 46, angle = -20, r = 9) {
    const a = (angle * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a);
    const x2 = x + ux * len * 0.68, y2 = y + uy * len * 0.68;
    let s = this.barrel({ x1: x, y1: y, x2, y2, r, tones: T.olive, muzzle: 'cap', rings: 0 });
    const tx = x + ux * len, ty = y + uy * len, nx = -uy, ny = ux;
    s += `<path d="M${f(x2 + nx * r)} ${f(y2 + ny * r)} Q${f(tx + nx * r * 0.2)} ${f(ty + ny * r * 0.2)} ${f(tx)} ${f(ty)} Q${f(tx - nx * r * 0.2)} ${f(ty - ny * r * 0.2)} ${f(x2 - nx * r)} ${f(y2 - ny * r)} Z" fill="${T.olive[1]}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>`;
    const bx = x + ux * len * 0.5, by = y + uy * len * 0.5;
    s += `<path d="M${f(bx + nx * r)} ${f(by + ny * r)} L${f(bx - nx * r)} ${f(by - ny * r)}" stroke="${T.brass[1]}" stroke-width="5"/>`;
    return s;
  }
  // Pile of sandbags along a line.
  sandbags(x1, y1, x2, y2, rows = 2) {
    let s = '';
    const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 26));
    for (let r = 0; r < rows; r++) for (let i = 0; i < n - r; i++) {
      const t = (i + 0.5 + r * 0.5) / n;
      const x = lerp(x1, x2, t), y = lerp(y1, y2, t) - r * 12;
      s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="15" ry="8" fill="${T.olive[1]}" stroke="${P.ink}" stroke-width="2.8"/><path d="M${f(x - 9)} ${f(y - 3)} q9 -4 18 0" stroke="${T.olive[0]}" stroke-width="2" fill="none"/>`;
    }
    return s;
  }
  // Holographic ring (ellipse) around a vertical axis: glow-only, dashed.
  holoRing(cx, cy, rx, ry, col = T.cyan, { w = 2.4, dash = '14 6 3 6' } = {}) {
    this.glow(`<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="none" stroke="${col.c}" stroke-width="${w * 3}" opacity=".35" filter="url(#bloom)"/>` +
      `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="none" stroke="${col.c}" stroke-width="${w}" stroke-dasharray="${dash}" opacity=".9"/>`);
    return '';
  }
  // Coloured cable bundle hanging between two points (several strands).
  cables(x1, y1, x2, y2, sag = 30, colors = ['#3b6fd8', '#8a4fd8', '#2e2a33']) {
    return colors.map((c, i) => this.cable(x1 + i * 3, y1 + i * 2, x2 + i * 3, y2 + i * 2, sag + i * 6, 3.4, c)).join('');
  }
}

function centroid(poly) {
  let x = 0, y = 0;
  for (const [a, b] of poly) { x += a; y += b; }
  return [x / poly.length, y / poly.length];
}

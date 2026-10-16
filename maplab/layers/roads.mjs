// Road dressing, kept subtle so the road stays the clearest path: faint tyre
// tracks along the three roads, a few oil stains, and red/amber reflector
// posts along the edges so the route reads even at 1x.
import { P, MP, f } from '../mapkit.mjs';
import { PADS } from './pads.mjs';

// Road centre lines in 2x map px: the game's ROUTE_L / ROUTE_R doubled (traced along the middle of the painted road
// by prototype/tools/trace_road.py), each from its gate through the junction and the HQ plaza to the AEGIS gate.
const LEFT = [[290, -60], [290, 22], [314, 58], [348, 90], [376, 126], [406, 162], [442, 188], [484, 210], [518, 246], [550, 278], [576, 314], [598, 354], [630, 390], [662, 422], [698, 454], [742, 472], [782, 492], [826, 500], [870, 502], [914, 510], [958, 510], [1002, 510], [1046, 510], [1090, 498], [1134, 486], [1178, 486], [1222, 484], [1266, 478], [1310, 476], [1354, 474], [1398, 474], [1442, 476], [1486, 496], [1526, 514], [1566, 540], [1606, 562], [1646, 590], [1678, 622], [1710, 654], [1740, 686], [1768, 722], [1774, 766], [1774, 810], [1772, 854], [1770, 898], [1770, 942], [1770, 986], [1770, 1030], [1772, 1066], [1772, 1110], [1772, 1154], [1772, 1198], [1770, 1242], [1770, 1286], [1770, 1330], [1770, 1374], [1770, 1410], [1770, 1440]];
const RIGHT = [[2566, -60], [2566, 166], [2548, 210], [2524, 250], [2500, 290], [2476, 330], [2474, 374], [2462, 418], [2430, 454], [2394, 482], [2354, 504], [2310, 518], [2266, 530], [2222, 548], [2178, 562], [2134, 576], [2094, 594], [2060, 622], [2030, 658], [1994, 686], [1950, 700], [1906, 714], [1866, 734], [1830, 766], [1798, 802], [1776, 842], [1770, 886], [1770, 930], [1770, 974], [1770, 1018], [1772, 1042], [1772, 1086], [1772, 1130], [1772, 1174], [1772, 1218], [1770, 1262], [1770, 1306], [1770, 1350], [1770, 1394], [1770, 1410], [1770, 1440]];
// Road half-width at each point (2x px): reflector posts stand just outside it.
const HW_L = [0.0, 2.0, 10.0, 28.0, 40.8, 24.8, 28.4, 26.4, 43.6, 38.0, 53.2, 68.0, 53.6, 56.8, 50.0, 52.4, 52.8, 45.2, 44.0, 51.2, 52.0, 51.6, 58.0, 52.4, 54.4, 62.0, 63.6, 54.4, 46.0, 50.0, 56.4, 61.2, 59.6, 56.4, 52.4, 60.0, 53.6, 70.4, 69.2, 65.2, 70.4, 57.2, 54.0, 59.2, 57.2, 62.8, 60.0, 58.0, 58.0, 58.0, 58.0, 58.0, 58.0, 58.0, 58.0, 36.0, 0.0, 0.0];
const HW_R = [0.0, 2.0, 24.4, 11.6, 21.6, 25.2, 28.0, 30.0, 33.6, 37.2, 34.8, 38.8, 48.0, 52.0, 45.2, 34.0, 24.0, 26.0, 33.6, 37.2, 17.2, 36.8, 45.6, 53.2, 67.2, 61.2, 56.0, 60.4, 72.0, 58.0, 58.0, 58.0, 58.0, 58.0, 58.0, 58.0, 58.0, 58.0, 16.0, 0.0, 0.0];
const JUNCTION_Y = 760; // the right road joins the left one here; below it, draw the shared stretch once

// Open Catmull-Rom path through points.
function open(p) {
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[Math.max(0, i - 1)], p1 = p[i], p2 = p[i + 1], p3 = p[Math.min(p.length - 1, i + 2)];
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}
// Offset each point sideways by k (or k(i)); positive = right of travel.
function offset(p, k) {
  return p.map(([x, y], i) => {
    const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const kk = typeof k === 'function' ? k(i) : k;
    return [x - (dy / L) * kk, y + (dx / L) * kk];
  });
}
// Evenly spaced points along a polyline (with the index of the segment they fall in).
function along(p, step, skip = 0) {
  const out = [];
  let acc = -skip;
  for (let i = 0; i < p.length - 1; i++) {
    const [x1, y1] = p[i], [x2, y2] = p[i + 1], L = Math.hypot(x2 - x1, y2 - y1);
    for (let t = 0; t < L; t += 1) { acc += 1; if (acc >= step) { acc = 0; out.push([x1 + ((x2 - x1) * t) / L, y1 + ((y2 - y1) * t) / L, i]); } }
  }
  return out;
}
const onPad = (x, y) => PADS.some(([cx, cy, rx, ry]) => ((x - cx) / (rx * 1.15)) ** 2 + ((y - cy) / (ry * 1.25)) ** 2 < 1);

export default {
  name: 'roads', z: 15,
  build(K) {
    let ground = '';
    const rightTop = RIGHT.filter(([, y]) => y <= JUNCTION_Y + 40);
    for (const road of [LEFT, rightTop]) {
      for (const k of [-16, 16]) ground += `<path d="${open(offset(road, k))}" fill="none" stroke="${MP.sand[3]}" stroke-width="9" stroke-dasharray="26 14" stroke-linecap="round" opacity=".22"/>`;
    }
    for (const [x, y, r] of [[1180, 500, 26], [1760, 650, 30], [1772, 860, 22], [2200, 540, 24], [700, 470, 20]]) ground += K.stain(x, y, r, '#3a2a1c', 0.28);

    const objects = K.part('roads', () => {
      let s = '';
      // reflector posts just outside both edges, away from the gates, the HQ and the pads
      const posts = [];
      for (const [road, hw] of [[LEFT, HW_L], [rightTop, HW_R]]) {
        for (const side of [-1, 1]) {
          const edge = offset(road, (i) => side * ((hw[i] || 40) + 14));
          for (const [x, y, i] of along(edge, 150, 60)) {
            if (i < 3 || y > 1400 || (hw[i] || 0) < 16 || onPad(x, y)) continue;   // stop short of the HQ (Layout v2: y 1440)
            posts.push([x, y, side]);
          }
        }
      }
      posts.sort((a, b) => a[1] - b[1]);
      for (const [x, y, side] of posts) {
        s += `<path d="M${f(x)} ${f(y)} V${f(y - 22)}" stroke="${P.ink}" stroke-width="7" stroke-linecap="round"/><path d="M${f(x)} ${f(y)} V${f(y - 22)}" stroke="#e8e2d2" stroke-width="3.2" stroke-linecap="round"/>`;
        s += K.leds([[x, y - 18]], side < 0 ? MP.hot : MP.amber, 2.2);
      }
      return s;
    });
    return { ground, objects, light: '' };
  },
};

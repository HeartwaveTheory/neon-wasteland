// Road dressing, kept subtle so the road stays the clearest path: faint tyre
// tracks along the three roads, a few oil stains, and red/amber reflector
// posts along the edges so the route reads even at 1x.
import { P, MP, f, smoothPath } from '../mapkit.mjs';

// Road centre lines in 2x map px (from the gates to the junction to the HQ).
const LEFT = [[470, 130], [505, 320], [660, 450], [1000, 505], [1400, 530], [1660, 600], [1760, 720]];
const RIGHT = [[2540, 130], [2420, 300], [2240, 460], [1960, 560], [1800, 690]];
const SOUTH = [[1770, 720], [1766, 900], [1772, 1070]];

// Open Catmull-Rom path through points.
function open(p) {
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[Math.max(0, i - 1)], p1 = p[i], p2 = p[i + 1], p3 = p[Math.min(p.length - 1, i + 2)];
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}
// Offset a polyline sideways (positive = right of travel).
function offset(p, k) {
  return p.map(([x, y], i) => {
    const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    return [x - (dy / L) * k, y + (dx / L) * k];
  });
}
// Evenly spaced points along a polyline.
function along(p, step, skip = 0) {
  const out = [];
  let acc = -skip;
  for (let i = 0; i < p.length - 1; i++) {
    const [x1, y1] = p[i], [x2, y2] = p[i + 1], L = Math.hypot(x2 - x1, y2 - y1);
    for (let t = 0; t < L; t += 1) { acc += 1; if (acc >= step) { acc = 0; out.push([x1 + ((x2 - x1) * t) / L, y1 + ((y2 - y1) * t) / L]); } }
  }
  return out;
}
void smoothPath;

export default {
  name: 'roads', z: 15,
  build(K) {
    let ground = '';
    for (const road of [LEFT, RIGHT, SOUTH]) {
      for (const k of [-16, 16]) ground += `<path d="${open(offset(road, k))}" fill="none" stroke="${MP.sand[3]}" stroke-width="9" stroke-dasharray="26 14" stroke-linecap="round" opacity=".22"/>`;
    }
    for (const [x, y, r] of [[1180, 520, 26], [1720, 650, 34], [1790, 860, 22], [2160, 500, 24], [620, 420, 20]]) ground += K.stain(x, y, r, '#3a2a1c', 0.28);

    const objects = K.part('roads', () => {
      let s = '';
      // reflector posts on both edges of the stretches between gates and junction
      const posts = [];
      for (const [road, w] of [[LEFT.slice(2), 92], [RIGHT.slice(1), 92], [SOUTH, 96]]) {
        for (const side of [-1, 1]) posts.push(...along(offset(road, side * w), 150, 40).map((p) => [...p, side]));
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

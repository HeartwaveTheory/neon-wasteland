// Build pads: the ten places towers stand (Layout v2, LAYOUT.md). Low concrete
// octagons with a hazard ring, a faded build mark and cyan corner lights, so
// they read instantly as "build here" and never as decoration.
import { P, MP, f } from '../mapkit.mjs';

// Pad centres and slab radii in 2x map px: the game's PADS (1x) doubled. 1-4 stand in the reference's dirt
// circles; 5-10 are new: 5-8 each get a cleared dirt patch (NEW_CLEARINGS), 9 and 10 stand on the HQ plaza's sand.
const RX = 88, RY = 44;
export const PADS = [[916, 324], [2050, 436], [1096, 690], [2394, 724], [370, 410],
  [2236, 330], [1310, 644], [660, 660], [1550, 1260], [1990, 1260]].map(([x, y]) => [x, y, RX, RY]);
const NEW_CLEARINGS = PADS.slice(4, 8);
// the old clearings' bright packed sand (sampled from the base), with darker dirt for the mottling
const CLEARING = ['#fbdca0', '#f4cc8a', '#d9ad6c', '#8a5a2b', '#5c3a1c'];

const pts = (a) => a.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
const lerp = (a, b, t) => a + (b - a) * t;

function oct(cx, cy, R, r, k = 1, dy = 0) {
  const p = [];
  for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + (i / 8) * Math.PI * 2; p.push([cx + Math.cos(a) * R * k, cy + dy + Math.sin(a) * r * k]); }
  return p; // 0..3 = lower (front) half, clockwise from the right
}

function pad(K, [cx, cy, rx, ry], i) {
  // a little larger than a tower's base plate at game scale (rx 62 / ry 32)
  const R = rx, r = ry, th = 9;
  const top = oct(cx, cy, R, r), lip = oct(cx, cy, R, r, 1, th);
  let s = '';
  // front faces, toned by which way they face (light from the upper-left)
  for (const [a, b] of [[7, 0], [0, 1], [1, 2], [2, 3], [3, 4]]) {
    const mx = (top[a][0] + top[b][0]) / 2 - cx;
    const tone = mx < -R * 0.3 ? MP.concrete[2] : mx > R * 0.3 ? MP.concrete[4] : MP.concrete[3];
    s += `<polygon points="${pts([top[a], top[b], lip[b], lip[a]])}" fill="${tone}" stroke="${P.ink}" stroke-width="4" stroke-linejoin="round"/>`;
  }
  // top slab
  s += `<polygon points="${pts(top)}" fill="${MP.concrete[1]}" stroke="${P.ink}" stroke-width="4" stroke-linejoin="round"/>`;
  s += `<polygon points="${pts(oct(cx - R * 0.04, cy - r * 0.05, R, r, 0.9))}" fill="${MP.concrete[0]}" opacity=".35"/>`;
  s += `<polyline points="${pts([top[4], top[5], top[6], top[7]].map(([x, y]) => [x + 2, y + 3]))}" fill="none" stroke="#e6e1d6" stroke-width="2.5" opacity=".7"/>`;
  // expansion joints to the corners
  for (const k of [0, 2, 4, 6]) {
    const [x, y] = top[k], [x2, y2] = oct(cx, cy, R, r, 0.8)[k];
    s += `<path d="M${f(x2)} ${f(y2)} L${f(x)} ${f(y)}" stroke="${P.ink}" stroke-width="2.2" opacity=".55"/>`;
  }
  // hazard ring (even-odd, so the ring is closed all the way round)
  const hz = K.id('hz');
  K.def(`<pattern id="${hz}" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" fill="${P.hazard[0]}"/><rect width="6" height="12" fill="${P.ink}"/></pattern>`);
  const o = oct(cx, cy, R, r, 0.8), n = oct(cx, cy, R, r, 0.66);
  const ring = `M${pts(o).replace(/ /g, ' L')} Z M${pts(n).replace(/ /g, ' L')} Z`;
  s += `<path d="${ring}" fill="url(#${hz})" fill-rule="evenodd" stroke="${P.ink}" stroke-width="3.2" stroke-linejoin="round"/>`;
  // worn paint: a few scuffs across the stripes
  for (let k = 0; k < 5; k++) {
    const a = K.rand(0, Math.PI * 2), x = cx + Math.cos(a) * R * 0.73, y = cy + Math.sin(a) * r * 0.73;
    s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(K.rand(5, 10))}" ry="${f(K.rand(2, 4))}" fill="${MP.concrete[1]}" opacity=".7"/>`;
  }
  // inner panel, darker, with a faded build mark (a stencilled plus in a ring)
  s += `<polygon points="${pts(n)}" fill="${MP.concrete[2]}" opacity=".9"/>`;
  s += `<polygon points="${pts(oct(cx, cy, R, r, 0.5))}" fill="none" stroke="${MP.concrete[3]}" stroke-width="3" opacity=".6"/>`;
  const pr = r * 0.26;
  s += `<path d="M${f(cx - pr * 1.8)} ${f(cy)} H${f(cx + pr * 1.8)} M${f(cx)} ${f(cy - pr)} V${f(cy + pr)}" stroke="${P.hazard[0]}" stroke-width="5" stroke-linecap="round" opacity=".5"/>`;
  s += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(pr * 2.3)}" ry="${f(pr * 1.3)}" fill="none" stroke="${P.hazard[0]}" stroke-width="2.6" stroke-dasharray="9 7" opacity=".45"/>`;
  // grime, an oil stain and a crack
  s += K.stain(cx + R * 0.22, cy + r * 0.12, R * 0.18, '#2a2420', 0.3);
  const c0 = [cx - R * 0.35, cy - r * 0.05];
  s += `<path d="M${f(c0[0])} ${f(c0[1])} l${f(-7)} ${f(5)} l${f(-5)} ${f(-2)} l${f(-8)} ${f(6)}" stroke="${P.ink}" stroke-width="2" fill="none" opacity=".6"/>`;
  // bolts on the rim
  s += K.rivets(oct(cx, cy, R, r, 0.9).map(([x, y], k) => [lerp(x, top[k][0], 0.5), lerp(y, top[k][1], 0.5)]), 2);
  // cyan corner lights and a faint glow pool
  s += K.leds(oct(cx, cy, R, r, 0.9).filter((_, k) => k % 2 === 0), P.shock, 3);
  K.lightPool(cx, cy, R * 1.1, r * 1.1, P.shock, 0.1);
  void i;
  return s;
}

export default {
  name: 'pads', z: 20,
  build(K) {
    // the new pads get a dirt clearing like the old pads' (which are in the base), so they sit on cleared
    // ground instead of rocks or brush; then a soft contact shadow under each slab (ground, no outline)
    let ground = NEW_CLEARINGS.map(([cx, cy, rx, ry]) => K.groundPatch(cx + 4, cy + 6, rx * 1.5, ry * 1.6, { tones: CLEARING, soft: 6, jag: 0.16 })).join('');
    ground += PADS.map(([cx, cy, rx, ry]) => K.ao(cx + 7, cy + 9, rx * 1.04, ry * 1.02, 0.45)).join('');
    const objects = K.part('pads', () => PADS.map((p, i) => pad(K, p, i)).join(''));
    return { ground, objects, light: '' };
  },
};

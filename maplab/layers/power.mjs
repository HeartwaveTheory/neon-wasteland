// Power: two lines of lattice pylons running out from the AEGIS HQ.
// East: from the HQ's antenna tower over the right cliffs and off the map edge.
// West: over the forest to the CHOP SHOP, where the bandits have tapped it
// (a sagging stolen cable with a sign).
import { P, MP, f } from '../mapkit.mjs';

// [x, yBot, h] in 2x map px.
const EAST = [[2300, 1086, 230], [2840, 1064, 236], [3240, 968, 240]];
const WEST = [[1200, 1124, 226], [800, 1200, 232]];

// Arm tips (4 insulators) of a pylon, matching mapkit.pylon's geometry.
function tips([x, yBot, h], w = 70) {
  const ay = yBot - h * 0.86, ay2 = yBot - h * 0.66;
  return { hiL: [x - w * 0.62, ay + 12], hiR: [x + w * 0.62, ay + 12], loL: [x - w * 0.5, ay2 + 12], loR: [x + w * 0.5, ay2 + 12] };
}

export default {
  name: 'power', z: 60,
  build(K) {
    // footing shadows on the ground
    let ground = '';
    for (const [x, y] of [...EAST, ...WEST]) ground += K.ao(x + 8, y + 2, 46, 14, 0.4);

    const objects = K.part('power', () => {
      let s = '';
      // concrete footings + pylons, back (smaller y) first
      const all = [...EAST, ...WEST].sort((a, b) => a[1] - b[1]);
      for (const [x, y, h] of all) {
        s += K.concrete({ x: x - 34, y: y + 8, w: 68, h: 12, d: 20, seams: false });
        s += K.pylon(x, y, h);
        s += K.leds([[x, y - h - 4]], MP.hot, 3.2); // aircraft warning light
      }
      // east line: HQ antenna tower crossarm -> pylons -> off the right edge
      const e = EAST.map((p) => tips(p));
      const start = [[2058, 1088], [2062, 1120]];
      s += K.powerline([start[0], e[0].hiL, e[1].hiL, e[2].hiL, [3344, 700]], { sag: 34 });
      s += K.powerline([start[1], e[0].loL, e[1].loL, e[2].loL, [3344, 740]], { sag: 40 });
      s += K.powerline([e[0].hiR, e[1].hiR, e[2].hiR, [3344, 780]], { sag: 30 });
      // west line: HQ west wing roof -> pylons -> the chop shop's stolen tap
      const w = WEST.map((p) => tips(p));
      s += K.powerline([[1420, 1160], w[0].hiR, w[1].hiR, [600, 1222]], { sag: 36 });
      s += K.powerline([[1426, 1176], w[0].loR, w[1].loR], { sag: 42 });
      s += K.powerline([w[0].hiL, w[1].hiL, [420, 1080]], { sag: 30 });
      // the bandits' tap: a crude clamp box on the line's end with a skull tag
      s += K.box({ x: 586, y: 1238, w: 26, h: 20, d: 14, tones: MP.rustmetal, stroke: 3 });
      s += K.leds([[598, 1224]], MP.hot, 2.4);
      return s;
    });
    return { ground, objects, light: '' };
  },
};

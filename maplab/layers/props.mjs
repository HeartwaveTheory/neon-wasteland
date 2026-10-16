// Props in the open land: three brand billboards, two street lamps at the
// junction, a road sign pointing to the HQ, two roadside wrecks and junk.
// Everything stays off the road surface and off the pads.
import { P, MP, f } from '../mapkit.mjs';

const LIME = { c: P.missile.c, core: P.missile.core, deep: P.missile.deep };

export default {
  name: 'props', z: 45,
  build(K) {
    let ground = '';
    // dirt scuffs under the props so they sit on the land
    for (const [x, y, rx] of [[1170, 252, 90], [1510, 884, 92], [2030, 892, 92], [529, 606, 80], [2480, 590, 80]]) ground += K.ao(x + 8, y, rx, rx * 0.3, 0.32);

    const objects = K.part('props', () => {
      let s = '';
      // --- far (top) first
      // PRISMATIK billboard on the rocks between pad 1 and the pond
      s += K.billboard(1100, 252, 150, 66, 'PRISMATIK', P.laser, { legs: 58, glyph: 'target' });
      // wreck on the right road's shoulder, below the right gate
      s += K.wreck(2430, 600, { w: 112, color: 'blue', flip: false });
      s += K.tyre(2560, 596, 12) + K.drum(2400, 600, 11);
      // wreck below the left road, just left of pad 8 (its tyres on the far side, off the pad)
      s += K.tyre(436, 610, 12) + K.tyre(452, 604, 11);
      s += K.wreck(470, 606, { w: 118, color: 'red', flip: false });
      // road sign at the junction: "AEGIS HQ" with an arrow down the road
      s += K.post(1924, 552, 650, 8, P.iron) + K.post(2004, 552, 650, 8, P.iron);
      s += K.sign(1900, 520, 130, 40, 'AEGIS ↓', P.shock, { rot: -3 });
      // street lamps either side of the junction
      s += K.streetLight(1600, 720, 130, MP.amber, { dir: 1, arm: 38 });
      s += K.streetLight(1950, 740, 130, MP.amber, { dir: -1, arm: 38 });
      // BOOMWERKS and VOLTAMP billboards flanking the road down to the HQ
      s += K.billboard(1440, 884, 150, 70, 'BOOMWERKS', LIME, { legs: 64, glyph: 'rocket', tilt: -2 });
      s += K.billboard(1960, 892, 150, 70, 'VOLTAMP', P.shock, { legs: 64, glyph: 'bolt', tilt: 2 });
      s += K.drum(1420, 892, 11, 'rust') + K.drum(2126, 896, 11, 'yellow');
      return s;
    });
    return { ground, objects, light: '' };
  },
};

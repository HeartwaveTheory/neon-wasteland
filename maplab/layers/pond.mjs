// Pond (top centre) -> a toxic coolant pool: glowing green sludge with an ink
// edge and a crusted mud bank, a cracked concrete lip on the far side, two waste
// pipes dumping into it, drums (one floating, one spilling), bleached dead trees,
// a NO SWIMMING sign with a lifebuoy, a rubber duck, green haze over it all.
//
// Owner: north. Coordinates are 2x map px. Stays clear of the road (lower left)
// and the build pad (right).
import { P, MP, f, smoothPath } from '../mapkit.mjs';
import { TOX, WARN, STL, RST, GALV, CON, YEL, pts, poly, ln, rect, P3, lerp, shade, skullSvg, beacon, hedgehog } from './gates.mjs';

// the pool outline (covers the old pond, its lobes and the old fence post)
const POOL = [[1556, 250], [1600, 226], [1668, 220], [1730, 236], [1790, 260], [1846, 280], [1912, 286], [1950, 300], [1942, 326], [1892, 336],
  [1846, 348], [1818, 380], [1804, 420], [1766, 452], [1704, 462], [1648, 450], [1612, 420], [1574, 388], [1548, 344], [1540, 296]];
const CX = 1720, CY = 340;
const scaleP = (p, k, dy = 0) => p.map(([x, y]) => [CX + (x - CX) * k, CY + (y - CY) * k + dy]);
const SL = { c: '#9dff3a', core: '#efffcf', deep: '#2f7a0a' };

function hardRadial(K, stops, { cx = 0.5, cy = 0.5, r = 0.55 } = {}) {
  const id = K.id('prg');
  let st = '';
  for (let i = 0; i < stops.length; i++) {
    const [o, c] = stops[i];
    const end = i + 1 < stops.length ? stops[i + 1][0] : 1;
    st += `<stop offset="${o}" stop-color="${c}"/><stop offset="${end}" stop-color="${c}"/>`;
  }
  K.def(`<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${st}</radialGradient>`);
  return `url(#${id})`;
}

function pool(K) {
  const d = smoothPath(POOL);
  const cid = K.id('pcl'), b1 = K.id('pb'), b2 = K.id('pb');
  K.def(`<clipPath id="${cid}"><path d="${d}"/></clipPath>`);
  K.def(`<filter id="${b1}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>`);
  K.def(`<filter id="${b2}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>`);
  let s = '';
  // chemical crust and dead mud around the bank
  s += `<path d="${smoothPath(scaleP(POOL, 1.16, 4))}" fill="#9b9440" opacity=".45" filter="url(#${b1})"/>`;
  s += `<path d="${smoothPath(scaleP(POOL, 1.07, 3))}" fill="#3a3418" opacity=".85" filter="url(#${b2})"/>`;
  // crust flecks on the bank
  for (let i = 0; i < 70; i++) {
    const a = K.rand(0, Math.PI * 2), k = K.rand(1.04, 1.16);
    const x = CX + Math.cos(a) * 205 * k, y = CY + Math.sin(a) * 125 * k;
    s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(K.rand(3, 10))}" ry="${f(K.rand(1.5, 4))}" fill="${K.pick(['#d6e36a', '#b9c24e', '#e8f08a'])}" opacity="${f(K.rand(0.35, 0.7))}"/>`;
  }
  // the liquid: deep base, then the lit body offset down so the far bank shades a crescent
  s += `<path d="${d}" fill="#24560a"/>`;
  const body = hardRadial(K, [[0, '#cfff66'], [0.18, '#a2ea3a'], [0.42, '#74c424'], [0.68, '#509a18'], [0.86, '#3a7412']], { cx: 0.5, cy: 0.58, r: 0.62 });
  let inner = `<path d="${d}" fill="${body}" transform="translate(6 18)"/>`;
  // darker sludge currents breaking up the surface
  for (const c of ['M1580 300 C1620 280 1660 296 1700 282', 'M1700 420 C1740 410 1770 420 1790 400', 'M1840 300 C1870 296 1900 306 1930 302', 'M1600 380 C1630 372 1650 384 1680 372']) inner += `<path d="${c}" stroke="#3d7f12" stroke-width="7" fill="none" stroke-linecap="round" opacity=".55"/>`;
  // ripples, swirls, scum, bubbles
  for (let i = 0; i < 9; i++) {
    const x = K.rand(1600, 1840), y = K.rand(280, 420), rx = K.rand(16, 44);
    inner += `<path d="M${f(x - rx)} ${f(y)} A${f(rx)} ${f(rx * 0.32)} 0 0 0 ${f(x + rx)} ${f(y)}" stroke="#efffc0" stroke-width="3" fill="none" opacity=".7"/>`;
  }
  inner += `<path d="M1630 322 C1680 300 1740 340 1790 318 C1820 306 1846 316 1860 330" stroke="#ff4fd8" stroke-width="2" fill="none" opacity=".3"/>`;
  inner += `<path d="M1640 330 C1690 310 1744 350 1796 326" stroke="#5ff4ff" stroke-width="1.6" fill="none" opacity=".35"/>`;
  for (let i = 0; i < POOL.length; i++) {
    const [x, y] = POOL[i];
    const ix = lerp(x, CX, 0.12), iy = lerp(y, CY, 0.12) + 6;
    inner += `<ellipse cx="${f(ix)}" cy="${f(iy)}" rx="${f(K.rand(14, 30))}" ry="${f(K.rand(5, 9))}" fill="#eef7a0" opacity="${f(K.rand(0.35, 0.6))}"/>`;
  }
  for (let i = 0; i < 28; i++) {
    const x = K.rand(1590, 1900), y = K.rand(262, 440), r = K.rand(1.8, 5.5);
    inner += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="none" stroke="#f4ffd8" stroke-width="1.6" opacity=".75"/><circle cx="${f(x - r * 0.35)}" cy="${f(y - r * 0.35)}" r="${f(r * 0.3)}" fill="#ffffff" opacity=".8"/>`;
  }
  // splash rings under the two outfalls
  for (const [x, y] of [[1642, 262], [1798, 288]]) {
    for (const k of [1, 1.8, 2.7]) inner += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(14 * k)}" ry="${f(5 * k)}" fill="none" stroke="#f4ffd0" stroke-width="${f(3 - k * 0.6)}" opacity="${f(0.85 - k * 0.2)}"/>`;
    inner += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="16" ry="6" fill="#f4ffd0" opacity=".6"/>`;
  }
  s += `<g clip-path="url(#${cid})">${inner}</g>`;
  s += `<path d="${d}" fill="none" stroke="${P.ink}" stroke-width="5" stroke-linejoin="round"/>`;
  // wet lit lip along the near (south) shore
  s += `<path d="M1592 412 C1630 448 1690 466 1760 452 C1790 444 1806 424 1810 400" stroke="#cfe86a" stroke-width="2.4" fill="none" opacity=".6"/>`;
  // spilled sludge trickling from the tipped drum on the right bank
  s += `<path d="M1866 396 C1852 392 1840 380 1826 372" stroke="${SL.c}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".85"/>`;
  s += K.stain(1872, 404, 18, '#4f7d12', 0.55);
  return s;
}

// Big waste pipe on little stilts, ending in an outfall that pours sludge.
function wastePipe(K, sh, path, out, { w = 20, tone = RST, stilts = [] } = {}) {
  let s = '';
  for (const [x, y, h] of stilts) {
    sh.pole(x, y + h, h, 3);
    s += `<path d="M${f(x - 7)} ${f(y + h)} L${f(x)} ${f(y)} L${f(x + 7)} ${f(y + h)}" stroke="${P.ink}" stroke-width="6" fill="none" stroke-linejoin="round"/><path d="M${f(x - 7)} ${f(y + h)} L${f(x)} ${f(y)} L${f(x + 7)} ${f(y + h)}" stroke="${STL[1]}" stroke-width="2.4" fill="none" stroke-linejoin="round"/>`;
  }
  s += K.pipe(path, w, tone[1], tone[0]);
  // dark band of grime along the underside
  s += `<path d="${path}" fill="none" stroke="${tone[2]}" stroke-width="${f(w * 0.3)}" transform="translate(1 ${f(w * 0.28)})" opacity=".8" stroke-linecap="round" stroke-linejoin="round"/>`;
  // outfall: a downturned mouth, flange, sludge pouring into the pool
  const [ox, oy, ly] = out; // mouth x, mouth y, liquid surface y
  s += `<ellipse cx="${f(ox)}" cy="${f(oy)}" rx="${f(w * 0.85)}" ry="${f(w * 0.36)}" fill="${tone[2]}" stroke="${P.ink}" stroke-width="3.5"/>`;
  s += `<ellipse cx="${f(ox)}" cy="${f(oy)}" rx="${f(w * 0.6)}" ry="${f(w * 0.24)}" fill="#15210a"/>`;
  s += `<path d="M${f(ox - w * 0.85)} ${f(oy - 7)} H${f(ox + w * 0.85)}" stroke="${P.ink}" stroke-width="4"/>`;
  K.glow(`<path d="M${f(ox - w * 0.45)} ${f(oy)} C${f(ox - w * 0.5)} ${f(oy + (ly - oy) * 0.5)} ${f(ox - w * 0.62)} ${f(ly - 6)} ${f(ox - w * 0.7)} ${f(ly)} L${f(ox + w * 0.7)} ${f(ly)} C${f(ox + w * 0.6)} ${f(ly - 6)} ${f(ox + w * 0.5)} ${f(oy + (ly - oy) * 0.5)} ${f(ox + w * 0.45)} ${f(oy)} Z" fill="${SL.c}" stroke="${P.ink}" stroke-width="2.5"/>` +
    `<path d="M${f(ox - 2)} ${f(oy + 3)} C${f(ox - 3)} ${f(oy + (ly - oy) * 0.5)} ${f(ox - 4)} ${f(ly - 6)} ${f(ox - 5)} ${f(ly - 2)}" stroke="${SL.core}" stroke-width="3" fill="none" stroke-linecap="round"/>` +
    `<circle cx="${f(ox)}" cy="${f((oy + ly) / 2)}" r="${f(w * 1.4)}" fill="${SL.c}" opacity=".45" filter="url(#bloom)"/>`);
  K.lightPool(ox, ly + 4, 70, 26, TOX, 0.5);
  return s;
}

// Bleached dead tree: twisted trunk and bare branches (the part's outline inks it).
function deadTree(K, x, y, h, { lean = 0.08, dir = 1 } = {}) {
  const tx = x + lean * h * dir, ty = y - h;
  const bark = '#8a7d72', dark = '#4e433d';
  let s = `<ellipse cx="${f(x + 6)}" cy="${f(y + 2)}" rx="16" ry="5" fill="${P.ink}" opacity=".5"/>`;
  s += `<path d="M${f(x - 9)} ${f(y)} C${f(x - 6)} ${f(y - h * 0.4)} ${f(tx - 6)} ${f(y - h * 0.6)} ${f(tx - 2)} ${f(ty)} L${f(tx + 2)} ${f(ty)} C${f(tx + 4)} ${f(y - h * 0.55)} ${f(x + 7)} ${f(y - h * 0.35)} ${f(x + 10)} ${f(y)} Z" fill="${bark}"/>`;
  s += `<path d="M${f(x + 3)} ${f(y - 4)} C${f(x + 4)} ${f(y - h * 0.35)} ${f(tx + 2)} ${f(y - h * 0.6)} ${f(tx + 1)} ${f(ty + 10)}" stroke="${dark}" stroke-width="4" fill="none" opacity=".8"/>`;
  const br = (u, ang, len, wd) => {
    const bx = lerp(x, tx, u), by = lerp(y, ty, u);
    const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
    const mx = (bx + ex) / 2 + K.rand(-8, 8), my = (by + ey) / 2 + K.rand(-10, 4);
    let q = `<path d="M${f(bx)} ${f(by)} Q${f(mx)} ${f(my)} ${f(ex)} ${f(ey)}" stroke="${bark}" stroke-width="${wd}" fill="none" stroke-linecap="round"/>`;
    // twigs
    for (let k = 0; k < 2; k++) {
      const a2 = ang + K.rand(-0.9, 0.9);
      q += `<path d="M${f(ex)} ${f(ey)} l${f(Math.cos(a2) * len * 0.35)} ${f(Math.sin(a2) * len * 0.35)}" stroke="${bark}" stroke-width="${f(wd * 0.5)}" fill="none" stroke-linecap="round"/>`;
    }
    return q;
  };
  s += br(0.45, -2.4, h * 0.36, 5) + br(0.55, -0.6, h * 0.4, 5) + br(0.75, -2.0, h * 0.28, 3.6) + br(0.82, -0.9, h * 0.3, 3.4) + br(0.96, -1.7, h * 0.18, 3);
  return s;
}

// Low warning sign south of the pool with a lifebuoy leaning on its post.
function noSwim(K, sh, x, y) {
  sh.pole(x, y, 56, 4);
  let s = K.post(x, y - 50, y, 8, STL);
  s += rect(x - 50, y - 92, 100, 46, '#e9dfc6', 3.5);
  s += rect(x - 50, y - 92, 100, 18, P.red[1], 3);
  s += K.text('NO SWIMMING', x, y - 78, { size: 10.5, color: '#fff2e0', opacity: 1 });
  s += skullSvg(x - 22, y - 60, 9, P.ink, '#e9dfc6', { op: 0.9 });
  s += K.text('EVER', x + 16, y - 54, { size: 12, color: P.ink, opacity: 1 });
  s += `<path d="M${f(x + 30)} ${f(y - 88)} l10 34" stroke="${RST[1]}" stroke-width="3" opacity=".7"/>`;
  // lifebuoy leaning on the post
  const bx = x + 20, by = y - 16;
  s += `<g transform="rotate(-20 ${f(bx)} ${f(by)})"><ellipse cx="${f(bx)}" cy="${f(by)}" rx="16" ry="14" fill="none" stroke="${P.ink}" stroke-width="14"/>` +
    `<ellipse cx="${f(bx)}" cy="${f(by)}" rx="16" ry="14" fill="none" stroke="#f1e9dc" stroke-width="8"/>` +
    `<ellipse cx="${f(bx)}" cy="${f(by)}" rx="16" ry="14" fill="none" stroke="#d8342a" stroke-width="8" stroke-dasharray="11.8 11.8"/></g>`;
  return s;
}

// Cracked concrete lip of the reservoir along the far shore.
function lip(K) {
  let s = '';
  const segs = [[[1566, 250], [1628, 232]], [[1636, 230], [1712, 236]]];
  for (const [[ax, ay], [bx, by]] of segs) {
    const h = 22, th = 12;
    const top = [[ax, ay - h], [bx, by - h], [bx + th * 0.22, by - h - th * 0.5], [ax + th * 0.22, ay - h - th * 0.5]];
    s += poly([[ax, ay - h], [bx, by - h], [bx, by], [ax, ay]], CON[1], 3.5);
    s += K.hazard([[ax + 2, ay - h + 4], [bx - 2, by - h + 4], [bx - 2, by - h + 11], [ax + 2, ay - h + 11]], { w: 5 });
    s += poly(top, CON[0], 3);
    s += `<path d="M${f(ax)} ${f(ay - 5)} L${f(bx)} ${f(by - 5)}" stroke="#7fbf2a" stroke-width="6" opacity=".7"/>`;
  }
  s += K.text('COOLANT 03', 1674, 226, { size: 9, color: '#f1e4c8', opacity: 0.9 });
  // broken chunk tipped into the sludge
  s += poly([[1720, 262], [1752, 254], [1758, 270], [1726, 278]], CON[2], 3.2);
  s += poly([[1720, 262], [1752, 254], [1746, 246], [1716, 252]], CON[0], 3);
  return s;
}

// A drum floating half-sunk, a tyre and a rubber duck on the sludge.
function floaters(K) {
  let s = '';
  // tipped floating drum
  s += `<g transform="rotate(-18 1692 384)">` +
    `<rect x="1672" y="370" width="40" height="22" rx="4" fill="${YEL[1]}" stroke="${P.ink}" stroke-width="3"/>` +
    `<ellipse cx="1712" cy="381" rx="6" ry="11" fill="${YEL[2]}" stroke="${P.ink}" stroke-width="3"/>` +
    `<path d="M1684 371 V391 M1700 371 V391" stroke="${P.ink}" stroke-width="3"/></g>`;
  s += `<path d="M1668 394 q26 8 52 -4" stroke="#efffc0" stroke-width="2.4" fill="none"/>`;
  // tyre
  s += `<ellipse cx="1806" cy="332" rx="17" ry="8" fill="#26221f" stroke="${P.ink}" stroke-width="3"/><ellipse cx="1806" cy="331" rx="7" ry="3" fill="#7fd02a"/>`;
  // rubber duck, glowing a bit too much
  s += `<ellipse cx="1612" cy="300" rx="11" ry="6.5" fill="#ffd23a" stroke="${P.ink}" stroke-width="2.6"/><circle cx="1620" cy="291" r="5.5" fill="#ffd23a" stroke="${P.ink}" stroke-width="2.6"/><path d="M1625 291 l6 1.5 l-6 1.5 Z" fill="#ff8a1a" stroke="${P.ink}" stroke-width="1.6"/><circle cx="1621" cy="289.5" r="1.2" fill="${P.ink}"/>`;
  K.glow(`<circle cx="1614" cy="296" r="14" fill="#ffd23a" opacity=".35" filter="url(#bloom)"/>`);
  return s;
}

function drums(K, sh) {
  let s = '';
  // left bank cluster (between the pool and the road)
  sh.blob(1584, 438, 30, 9);
  s += K.drum(1580, 418, 12, 'yellow') + K.drum(1604, 428, 12, 'rust') + K.drum(1572, 442, 12, 'blue');
  s += `<path d="M1574 404 l6 -9 l6 9 Z" fill="${P.ink}"/><path d="M1580 398 v3" stroke="${YEL[0]}" stroke-width="1.6"/>`;
  // right bank: a stack and one tipped over, spilling
  sh.blob(1870, 384, 28, 8);
  s += K.drum(1880, 370, 12, 'yellow') + K.drum(1862, 382, 12, 'rust');
  s += K.barrel({ x1: 1898, y1: 392, x2: 1870, y2: 398, r: 11, tones: YEL, muzzle: 'open', rings: 2 });
  K.glow(`<ellipse cx="1866" cy="399" rx="6" ry="9" fill="${SL.c}" opacity=".9"/>`);
  return s;
}

export default {
  name: 'pond',
  z: 30,
  // the old fence post on the right shore (the pool and its bank cover the rest)
  erase: [[[1850, 280], [1890, 280], [1896, 400], [1852, 404]]],
  build(K) {
    const sh = shade();
    let ground = pool(K);
    let objects = '';
    objects += K.part('pd-tree-back', () => deadTree(K, 1700, 214, 112, { lean: -0.06 }));
    objects += K.part('pd-pipe-a', () => wastePipe(K, sh, 'M1494 118 C1504 150 1530 176 1572 194 C1606 208 1630 212 1642 222', [1642, 230, 264], { w: 20, tone: RST, stilts: [[1536, 180, 30], [1596, 204, 24]] }));
    objects += K.part('pd-pipe-b', () => wastePipe(K, sh, 'M1904 112 C1880 150 1830 178 1812 214 C1804 232 1800 246 1798 254', [1798, 262, 290], { w: 22, tone: [GALV[0], GALV[1], GALV[3]], stilts: [[1866, 156, 30]] }) +
      // valve wheel on the pipe
      `<circle cx="1842" cy="186" r="12" fill="none" stroke="${P.ink}" stroke-width="7"/><circle cx="1842" cy="186" r="12" fill="none" stroke="#d8342a" stroke-width="3.5"/><path d="M1830 186 H1854 M1842 174 V198" stroke="${P.ink}" stroke-width="3"/>`);
    objects += K.part('pd-lip', () => lip(K));
    objects += K.part('pd-tree-left', () => deadTree(K, 1528, 300, 124, { lean: 0.1 }));
    objects += K.part('pd-floaters', () => floaters(K));
    objects += K.part('pd-tree-water', () => deadTree(K, 1770, 400, 96, { lean: 0.12, dir: -1 }) +
      `<ellipse cx="1772" cy="401" rx="20" ry="6" fill="none" stroke="#efffc0" stroke-width="2.4"/>`);
    objects += K.part('pd-tree-right', () => deadTree(K, 1946, 304, 104, { lean: 0.1 }));
    objects += K.part('pd-drums', () => drums(K, sh));
    objects += K.part('pd-sign', () => noSwim(K, sh, 1716, 500));
    ground += sh.render(K, 0.45);
    // light: toxic glow over the pool, vapour, spill on the banks
    K.haze(1730, 330, 290, 170, TOX, 0.13);
    K.haze(1700, 290, 150, 70, TOX, 0.1);
    K.lightPool(1730, 360, 220, 110, TOX, 0.12);
    return { ground, objects, light: '' };
  },
};

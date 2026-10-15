// Mine / quarry (top right) -> a scrap refinery and data mine.
//
//   the cave:   a steel tunnel portal with magenta neon and a DATA MINE sign,
//               server racks glowing violet down the tunnel, rails coming out
//   the yard:   scrap carts with glowing data-shard loads on the rails, a dump
//               hopper and a conveyor lifting the scrap into a rusty refinery
//               (smelter glow, exhaust stacks), coolant tanks and pipes, a rusty
//               drill rig on the quarry ledge, the SCRAP 4 CASH shack
//
// Owner: north. Coordinates are 2x map px. Stays east of the right road.
import { P, MP, f } from '../mapkit.mjs';
import { WARN, AMB, MAG, CYN, CON, STL, RST, GALV, YEL, OLIVE, pts, dpoly, poly, ln, rect, P3, lerp, shade, blk, plate, beacon, beam, holoSign, ibeam, bulletHoles, skullSvg, wasteland } from './gates.mjs';

const DATA = { c: '#b07bff', core: '#f1e8ff', deep: '#4b2a9c' };   // data shards: violet
const FIRE = P.fire;
const DARK = ['#4d4a52', '#3a3740', '#2a2830', '#1d1b22'];

// ------------------------------------------------------------ cave portal
function portal(K, sh) {
  const x0 = 3104, x1 = 3246, yB = 412, yT = 292, ch = 22, fw = 18, dd = 18;
  const inner = [[x0, yB], [x0, yT + ch], [x0 + ch, yT], [x1 - ch, yT], [x1, yT + ch], [x1, yB]];
  const outer = [[x0 - fw, yB + 2], [x0 - fw, yT + ch - 7], [x0 + ch - 7, yT - fw], [x1 - ch + 7, yT - fw], [x1 + fw, yT + ch - 7], [x1 + fw, yB]];
  let s = '';
  // tunnel interior
  s += poly(inner, '#120d18', 0);
  const vx = 3180, vy = 338, vw = 34, vh = 30; // far end
  const cid = K.id('mpc');
  K.def(`<clipPath id="${cid}"><polygon points="${pts(inner)}"/></clipPath>`);
  let t = '';
  // receding ribs
  for (const k of [0.82, 0.62, 0.45, 0.3]) {
    const ax = lerp(vx - vw / 2, x0, k), bx = lerp(vx + vw / 2, x1, k), ay = lerp(vy - vh / 2, yT, k), by = lerp(vy + vh / 2, yB, k);
    t += `<polygon points="${pts([[ax, by], [ax, ay + ch * k], [ax + ch * k, ay], [bx - ch * k, ay], [bx, ay + ch * k], [bx, by]])}" fill="none" stroke="#3b3346" stroke-width="${f(5 * k + 1)}"/>`;
  }
  // server racks along both walls, LEDs
  for (const side of [-1, 1]) {
    for (const k of [0.78, 0.56, 0.4]) {
      const ex = side < 0 ? lerp(vx - vw / 2, x0, k) : lerp(vx + vw / 2, x1, k);
      const ix = side < 0 ? lerp(vx - vw / 2, x0, k - 0.14) : lerp(vx + vw / 2, x1, k - 0.14);
      const ty = lerp(vy - vh / 2, yT, k) + 18 * k, by = lerp(vy + vh / 2, yB, k);
      const ty2 = lerp(vy - vh / 2, yT, k - 0.14) + 18 * (k - 0.14), by2 = lerp(vy + vh / 2, yB, k - 0.14);
      t += `<polygon points="${pts([[ex, ty], [ix, ty2], [ix, by2], [ex, by]])}" fill="#221b2c" stroke="#0b080f" stroke-width="2"/>`;
      for (let r = 0; r < 4; r++) {
        const u = 0.2 + r * 0.18, lx = lerp(ex, ix, 0.5), ly = lerp(lerp(ty, by, u), lerp(ty2, by2, u), 0.5);
        const col = K.pick([DATA, CYN, MAG, DATA]);
        K.glow(`<circle cx="${f(lx + K.rand(-3, 3))}" cy="${f(ly)}" r="${f(2.2 * k + 0.8)}" fill="${col.core}"/><circle cx="${f(lx)}" cy="${f(ly)}" r="${f(6 * k)}" fill="${col.c}" opacity=".5"/>`);
      }
    }
  }
  t += `<path d="M${f(vx - 10)} ${f(vy + vh / 2)} L${f(x0 + 40)} ${f(yB)} M${f(vx + 10)} ${f(vy + vh / 2)} L${f(x1 - 40)} ${f(yB)}" stroke="#6b6474" stroke-width="3"/>`;
  s += `<g clip-path="url(#${cid})">${t}</g>`;
  K.glow(`<rect x="${f(vx - vw / 2)}" y="${f(vy - vh / 2)}" width="${vw}" height="${vh}" fill="${DATA.c}" opacity=".85"/><rect x="${f(vx - vw / 2 + 6)}" y="${f(vy - vh / 2 + 5)}" width="${vw - 12}" height="${vh - 10}" fill="${DATA.core}" opacity=".85"/>` +
    `<ellipse cx="${vx}" cy="${vy}" rx="64" ry="50" fill="${DATA.c}" opacity=".35" filter="url(#bloom)"/>`);
  // frame: depth faces (top + right), then the face
  const ring = `M${outer.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')}Z M${inner.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')}Z`;
  const D = [0.22 * dd, -0.5 * dd];
  s += poly([outer[2], [outer[2][0] + D[0], outer[2][1] + D[1]], [outer[3][0] + D[0], outer[3][1] + D[1]], outer[3]], STL[0], 3.5);
  s += poly([outer[3], [outer[3][0] + D[0], outer[3][1] + D[1]], [outer[4][0] + D[0], outer[4][1] + D[1]], outer[4]], STL[1], 3.5);
  s += poly([outer[4], [outer[4][0] + D[0], outer[4][1] + D[1]], [outer[5][0] + D[0], outer[5][1] + D[1]], outer[5]], STL[2], 3.5);
  s += `<path d="${ring}" fill="${STL[1]}" fill-rule="evenodd" stroke="${P.ink}" stroke-width="4" stroke-linejoin="round"/>`;
  s += `<path d="M${f(outer[1][0] + 4)} ${f(outer[1][1])} L${f(outer[2][0] + 3)} ${f(outer[2][1] + 4)} L${f(outer[3][0] - 2)} ${f(outer[3][1] + 4)}" stroke="${STL[0]}" stroke-width="4" fill="none"/>`;
  s += K.hazard([[x0 - fw + 3, yB - 34], [x0 - 3, yB - 34], [x0 - 3, yB - 3], [x0 - fw + 3, yB - 3]], { w: 6 }) + K.hazard([[x1 + 3, yB - 34], [x1 + fw - 3, yB - 34], [x1 + fw - 3, yB - 3], [x1 + 3, yB - 3]], { w: 6 });
  s += K.rivets([[x0 - 9, yT + 40], [x0 - 9, yT + 70], [x1 + 9, yT + 40], [x1 + 9, yT + 70], [x0 + 40, yT - 9], [x1 - 40, yT - 9], [3175, yT - 9]], 2.6);
  // magenta neon along the opening
  s += K.neon(`M${f(x0 + 5)} ${f(yB - 2)} L${f(x0 + 5)} ${f(yT + ch + 2)} L${f(x0 + ch + 2)} ${f(yT + 5)} L${f(x1 - ch - 2)} ${f(yT + 5)} L${f(x1 - 5)} ${f(yT + ch + 2)} L${f(x1 - 5)} ${f(yB - 2)}`, MAG, 3.6);
  // DATA MINE sign on the lintel
  const sx = 3108, sy = 232, sw = 136, shh = 36;
  s += ibeam(sx + 26, sy + shh, yT - fw + 2, 8, STL, false) + ibeam(sx + sw - 26, sy + shh, yT - fw + 2, 8, STL, false);
  s += K.sign(sx, sy, sw, shh, 'DATA MINE', MAG, { size: 21 });
  s += beacon(K, sx + sw + 18, yT - fw + 4, AMB, 7);
  K.haze(3176, 300, 150, 110, MAG, 0.18);
  K.lightPool(3176, 424, 130, 36, DATA, 0.4);
  K.lightPool(3176, 246, 100, 30, MAG, 0.25);
  return s;
}

// ------------------------------------------------------------ rails (ground)
function rails(K, d, { gauge = 9, horiz = false } = {}) {
  const off = horiz ? [0, gauge * 0.6] : [gauge, 0];
  let s = `<path d="${d}" fill="none" stroke="#3a2a1d" stroke-width="${gauge * 2 + 14}" stroke-dasharray="6 7" opacity=".85"/>`;
  s += `<path d="${d}" fill="none" stroke="#5c4632" stroke-width="${gauge * 2 + 4}" opacity=".35"/>`;
  for (const k of [-1, 1]) {
    s += `<path d="${d}" fill="none" stroke="${P.ink}" stroke-width="4.6" transform="translate(${f(off[0] * k)} ${f(off[1] * k)})"/>`;
    s += `<path d="${d}" fill="none" stroke="#b9b4ab" stroke-width="1.8" transform="translate(${f(off[0] * k)} ${f(off[1] * k - 1)})"/>`;
  }
  return s;
}

// ------------------------------------------------------------ scrap cart
function cart(K, sh, x, y, { load = DATA, tilt = 0, w = 64 } = {}) {
  sh.box(x - w / 2, y, w, 40, 34);
  const hw = w / 2, d = 30, dx = d * 0.22, dy = d * 0.5;
  let s = `<g transform="rotate(${tilt} ${f(x)} ${f(y)})">`;
  // tub: side (right), front, rim
  const F = [[x - hw, y - 44], [x + hw, y - 44], [x + hw - 6, y - 12], [x - hw + 6, y - 12]];
  const S = [[x + hw, y - 44], [x + hw + dx, y - 44 - dy], [x + hw + dx - 5, y - 12 - dy], [x + hw - 6, y - 12]];
  s += poly(S, RST[2], 3.2) + K.hatch(dpoly(S), { density: 0.8 });
  // load (behind the front lip): scrap plates and glowing shards
  const lx0 = x - hw + 6, lx1 = x + hw + dx - 6;
  const heap = [[lx0, y - 44], [lx0 + 8, y - 56], [x - 10, y - 62 - dy * 0.3], [x + 6, y - 66 - dy * 0.4], [x + 20, y - 58 - dy * 0.5], [lx1, y - 48 - dy]];
  s += poly(heap.concat([[lx1, y - 44 - dy], [lx0, y - 44]]), '#4a4440', 3);
  s += poly([[x - 18, y - 52], [x - 4, y - 62], [x + 2, y - 52]], GALV[1], 2.4) + poly([[x + 8, y - 54], [x + 22, y - 62], [x + 26, y - 50]], RST[1], 2.4);
  for (const [sx, sy, sh2, a] of [[x - 12, y - 52, 20, -12], [x + 10, y - 56, 24, 10], [x + 26, y - 54, 16, 24], [x - 22, y - 50, 14, -30]]) {
    const pts2 = [[sx, sy], [sx - 5, sy - sh2 * 0.4], [sx, sy - sh2], [sx + 5, sy - sh2 * 0.4]];
    K.glow(`<g transform="rotate(${a} ${f(sx)} ${f(sy)})"><polygon points="${pts(pts2)}" fill="${load.c}" stroke="${P.ink}" stroke-width="2.4" stroke-linejoin="round"/><path d="M${f(sx - 1)} ${f(sy - 3)} L${f(sx)} ${f(sy - sh2 + 4)}" stroke="${load.core}" stroke-width="2"/></g>`);
  }
  K.glow(`<ellipse cx="${f(x + 4)}" cy="${f(y - 58)}" rx="${f(w * 0.6)}" ry="18" fill="${load.c}" opacity=".45" filter="url(#bloom)"/>`);
  s += poly(F, RST[1], 3.5);
  s += rect(x - hw + 2, y - 46, w - 4, 7, RST[0], 3);
  s += ln(x - hw + 10, y - 30, x + hw - 10, y - 30, RST[3], 2.4);
  s += K.rivets([[x - hw + 9, y - 36], [x + hw - 9, y - 36], [x - hw + 12, y - 18], [x + hw - 12, y - 18]], 2);
  s += `<ellipse cx="${f(x - hw * 0.1)}" cy="${f(y - 24)}" rx="${f(hw * 0.4)}" ry="4" fill="${RST[3]}" opacity=".5"/>`;
  // wheels
  for (const wx of [x - hw * 0.55, x + hw * 0.55]) s += `<circle cx="${f(wx)}" cy="${f(y - 8)}" r="9" fill="#2b2726" stroke="${P.ink}" stroke-width="3"/><circle cx="${f(wx)}" cy="${f(y - 8)}" r="3" fill="${STL[1]}"/>`;
  s += '</g>';
  K.lightPool(x + 6, y + 4, w * 0.9, 18, load, 0.3);
  return s;
}

// ------------------------------------------------------------ refinery
const REF = { x: 2944, y: 566, w: 138, h: 104, d: 64 };
function refinery(K, sh) {
  const { x, y, w, h, d } = REF;
  let s = '';
  // exhaust stacks at the back of the roof (drawn first, behind the box top)
  for (const [u, sh2] of [[0.22, 92], [0.42, 70]]) {
    const [cx, cy] = P3(x + w * u, y, d * 0.75, h);
    sh.pole(cx, y - d * 0.3, sh2 + h * 0.5, 6);
    s += K.cyl({ cx, y: cy, rx: 11, ry: 5, h: sh2, tones: RST, top: 'rim' });
    s += K.hoop(cx, cy - sh2 * 0.35, 11, 5, 5, WARN.deep) + K.hoop(cx, cy - sh2 * 0.6, 11, 5, 4, P.ink);
    // smoke
    const top = cy - sh2;
    for (const [ox, oy, r] of [[-2, -10, 12], [8, -26, 15], [22, -44, 18]]) s += `<circle cx="${f(cx + ox)}" cy="${f(top + oy)}" r="${r}" fill="#6d6670" opacity=".85"/><circle cx="${f(cx + ox - r * 0.3)}" cy="${f(top + oy - r * 0.3)}" r="${f(r * 0.55)}" fill="#958d93" opacity=".8"/>`;
  }
  s += blk(K, sh, {
    x, y, w, h, d, t: ['#cf8a55', '#a65d33', '#6e3c25', '#4a2717', '#2e170d'], seams: 0, topFill: '#6d6370',
    front: (fx0, fy0, fx1, fy1) => {
      let r = '';
      r += K.corrugated([[fx0, fy0], [fx1, fy0], [fx1, fy1], [fx0, fy1]], { tones: RST, angle: 0, pitch: 9 });
      r += plate(K, fx0 + 8, fy0 + 10, 48, 30, GALV, {});
      r += K.text('REFINERY', fx0 + 32, fy0 + 30, { size: 8, color: P.ink, opacity: 0.85 });
      // smelter mouth
      const mx = fx0 + 70, my = fy1 - 64;
      r += rect(mx - 6, my - 6, 62, 58, STL[3], 3.5);
      r += rect(mx, my, 50, 46, '#2a120a', 3);
      K.glow(`<rect x="${f(mx + 3)}" y="${f(my + 14)}" width="44" height="30" fill="${FIRE.c}"/><rect x="${f(mx + 8)}" y="${f(my + 22)}" width="34" height="18" fill="${FIRE.core}"/>` +
        `<ellipse cx="${f(mx + 25)}" cy="${f(my + 30)}" rx="60" ry="36" fill="${FIRE.c}" opacity=".45" filter="url(#bloom)"/>`);
      r += rect(mx, my, 50, 14, STL[2], 3);
      for (let k = 1; k < 4; k++) r += ln(mx + k * 12.5, my + 14, mx + k * 12.5, my + 46, P.ink, 2.4);
      // molten ingot tray under the mouth
      r += rect(mx - 2, fy1 - 14, 54, 10, STL[2], 3);
      r += K.hazard([[fx0 + 3, fy1 - 18], [mx - 10, fy1 - 18], [mx - 10, fy1 - 4], [fx0 + 3, fy1 - 4]], { w: 6 });
      r += K.neon(`M${f(fx0 + 6)} ${f(fy0 + 50)} H${f(fx0 + 60)}`, MAG, 3.2);
      r += K.graffiti(fx0 + 30, fy1 - 26, 'HOT!', '#ffd23a', { size: 13, rot: -8 });
      return r;
    },
    top: (T) => {
      // roof hopper where the conveyor drops in (right end)
      const [hx, hy] = P3(x + w - 30, y, d * 0.45, h);
      let r = poly([[hx - 26, hy - 30], [hx + 26, hy - 30], [hx + 14, hy], [hx - 14, hy]], STL[1], 3.5);
      r += poly([[hx - 26, hy - 30], [hx - 20, hy - 38], [hx + 32, hy - 38], [hx + 26, hy - 30]], STL[0], 3);
      r += K.hazard([[hx - 22, hy - 26], [hx + 22, hy - 26], [hx + 19, hy - 19], [hx - 19, hy - 19]], { w: 4 });
      // roof vents
      const [vx, vy] = P3(x + 44, y, d * 0.35, h);
      r += rect(vx - 14, vy - 12, 28, 12, STL[2], 3) + ln(vx - 10, vy - 6, vx + 10, vy - 6, P.ink, 2);
      return r;
    },
  });
  // pipe from the tanks into the left wall
  K.lightPool(x + 95, y + 14, 90, 30, FIRE, 0.45);
  return s;
}

// ------------------------------------------------------------ conveyor
function conveyor(K, sh, x1, y1, x2, y2, gy2) {
  // (x1, y1) low end at the dump hopper, (x2, y2) high end over the refinery
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
  const nx = -dy / L, ny = dx / L; // normal
  const W = 13;
  const A = [x1 + nx * W, y1 + ny * W], B = [x2 + nx * W, y2 + ny * W], C = [x2 - nx * W, y2 - ny * W], D = [x1 - nx * W, y1 - ny * W];
  let s = '';
  // trestle legs
  for (const t of [0.3, 0.68]) {
    const px = lerp(x1, x2, t), py = lerp(y1, y2, t) + 10, g = lerp(y1 + 26, gy2, t);
    sh.pole(px, g, g - py, 5);
    s += `<path d="M${f(px - 14)} ${f(g)} L${f(px)} ${f(py)} L${f(px + 14)} ${f(g)} M${f(px - 9)} ${f(lerp(py, g, 0.6))} H${f(px + 9)}" stroke="${P.ink}" stroke-width="8" fill="none" stroke-linejoin="round"/>` +
      `<path d="M${f(px - 14)} ${f(g)} L${f(px)} ${f(py)} L${f(px + 14)} ${f(g)} M${f(px - 9)} ${f(lerp(py, g, 0.6))} H${f(px + 9)}" stroke="${YEL[1]}" stroke-width="3.5" fill="none" stroke-linejoin="round"/>`;
  }
  // side frame (thickness under the belt), belt, rails
  const lowSide = ny > 0 ? [C, D] : [A, B];
  s += poly([B, C, [C[0], C[1] + 12], [D[0], D[1] + 12], D, A], YEL[2], 3.5);
  s += poly([A, B, C, D], '#2a2530', 3.5);
  const cid = K.id('mcv');
  K.def(`<clipPath id="${cid}"><polygon points="${pts([A, B, C, D])}"/></clipPath>`);
  let belt = '';
  for (let k = 0; k < L; k += 11) belt += ln(lerp(A[0], B[0], k / L), lerp(A[1], B[1], k / L), lerp(D[0], C[0], k / L), lerp(D[1], C[1], k / L), '#3f3946', 2.2);
  s += `<g clip-path="url(#${cid})">${belt}</g>`;
  // cargo on the belt: scrap lumps and glowing shards
  for (let k = 0; k < 6; k++) {
    const t = 0.1 + k * 0.15 + K.rand(-0.03, 0.03), px = lerp(x1, x2, t), py = lerp(y1, y2, t);
    if (k % 2) {
      K.glow(`<polygon points="${pts([[px - 6, py + 2], [px - 2, py - 10], [px + 6, py - 4], [px + 4, py + 4]])}" fill="${DATA.c}" stroke="${P.ink}" stroke-width="2"/><circle cx="${f(px)}" cy="${f(py - 3)}" r="12" fill="${DATA.c}" opacity=".4" filter="url(#bloom)"/>`);
    } else s += poly([[px - 8, py + 3], [px - 4, py - 7], [px + 7, py - 5], [px + 8, py + 4]], K.pick([GALV[1], RST[1], STL[1]]), 2.4);
  }
  s += `<path d="M${f(A[0])} ${f(A[1])} L${f(B[0])} ${f(B[1])}" stroke="${YEL[0]}" stroke-width="4" stroke-linecap="round"/><path d="M${f(D[0])} ${f(D[1] + 1)} L${f(C[0])} ${f(C[1] + 1)}" stroke="${YEL[1]}" stroke-width="4" stroke-linecap="round"/>`;
  s += K.rivetLine(D[0], D[1] + 7, C[0], C[1] + 7, 9, 2);
  void lowSide;
  return s;
}

// Dump hopper at the foot of the conveyor (carts tip into it).
function dumpHopper(K, sh, x, y) {
  let s = blk(K, sh, { x: x - 34, y, w: 68, h: 34, d: 40, t: CON, seams: 0, sw: 3.5 });
  const [tx, ty] = P3(x, y, 20, 34);
  s += poly([[tx - 38, ty - 18], [tx + 38, ty - 18], [tx + 24, ty + 6], [tx - 24, ty + 6]], STL[2], 3.5);
  s += poly([[tx - 30, ty - 14], [tx + 30, ty - 14], [tx + 20, ty + 2], [tx - 20, ty + 2]], '#1d1820', 0);
  s += K.hazard([[x - 31, y - 14], [x + 31, y - 14], [x + 31, y - 4], [x - 31, y - 4]], { w: 6 });
  return s;
}

// ------------------------------------------------------------ tanks + pipes
function tanks(K, sh) {
  let s = '';
  const T = [[2770, 508, 27, 92], [2832, 496, 23, 74]];
  for (const [cx, y, r, h] of T) {
    sh.box(cx - r, y, r * 2, h, r * 1.4);
    s += K.ao(cx, y + 2, r * 1.1, r * 0.4, 0.4);
    s += K.cyl({ cx, y, rx: r, ry: r * 0.45, h, tones: ['#c9c1b2', '#9a9184', '#6c6560', '#4a4542'], top: 'rim' });
    s += K.hoop(cx, y - h * 0.18, r, r * 0.45, 7, WARN.deep);
    s += K.hazard([[cx - r + 3, y - h * 0.18 - 3], [cx + r - 3, y - h * 0.18 - 3], [cx + r - 3, y - h * 0.18 + 3], [cx - r + 3, y - h * 0.18 + 3]], { w: 4 });
    s += K.hoop(cx, y - h * 0.72, r, r * 0.45, 5, P.ink);
    // level gauge (magenta)
    s += rect(cx - r * 0.55 - 4, y - h * 0.66, 8, h * 0.4, '#1d1820', 2.5);
    K.glow(`<rect x="${f(cx - r * 0.55 - 2)}" y="${f(y - h * 0.48)}" width="4" height="${f(h * 0.21)}" fill="${MAG.core}"/><rect x="${f(cx - r * 0.55 - 6)}" y="${f(y - h * 0.5)}" width="12" height="${f(h * 0.25)}" fill="${MAG.c}" opacity=".45" filter="url(#bloom)"/>`);
    s += `<path d="M${f(cx + r * 0.2)} ${f(y - h + 6)} v${f(h * 0.5)}" stroke="${RST[1]}" stroke-width="5" opacity=".6" stroke-linecap="round"/>`;
  }
  // ladder on the big tank
  s += `<path d="M2788 ${508 - 4} V${508 - 92} M2798 ${508 - 6} V${508 - 94}" stroke="${P.ink}" stroke-width="3"/>`;
  for (let yy = 500; yy > 420; yy -= 10) s += ln(2788, yy, 2798, yy - 1, P.ink, 2);
  s += K.text('COOL', 2758, 470, { size: 9, color: P.ink, opacity: 0.8 });
  return s;
}
function pipes(K, sh) {
  let s = '';
  // tank tops -> refinery wall, on a pipe bridge
  s += K.pipe('M2770 418 C2770 392 2800 388 2834 392 L2900 400 C2930 404 2944 420 2944 446', 9, STL[2], STL[0]);
  s += K.pipe('M2838 470 C2870 470 2900 482 2944 494', 8, RST[1], RST[0]);
  s += ibeam(2898, 404, 456, 8, STL, false);
  sh.pole(2898, 456, 50, 4);
  return s;
}

// ------------------------------------------------------------ drill rig
function drillRig(K, sh, x, yB, h = 252) {
  const bw = 76, tw = 24, top = yB - h;
  sh.box(x - bw / 2, yB, bw, h * 0.8, 40);
  let s = '';
  const legL = (t) => [lerp(x - bw / 2, x - tw / 2, t), lerp(yB, top, t)];
  const legR = (t) => [lerp(x + bw / 2, x + tw / 2, t), lerp(yB, top, t)];
  // back legs (depth), darker
  const D = [8, -16];
  s += K.beam(x - bw / 2 + D[0], yB + D[1], x - tw / 2 + D[0], top + D[1], 7, DARK);
  s += K.beam(x + bw / 2 + D[0], yB + D[1], x + tw / 2 + D[0], top + D[1], 7, DARK);
  // drill string down the middle
  s += K.pipe(`M${f(x + 3)} ${f(top + 20)} V${f(yB - 6)}`, 7, STL[1], STL[0]);
  // cross bracing
  let br = '';
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = legL(i / n), b = legR((i + 1) / n), c = legR(i / n), e = legL((i + 1) / n);
    br += `M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])} M${f(c[0])} ${f(c[1])} L${f(e[0])} ${f(e[1])} M${f(a[0])} ${f(a[1])} L${f(c[0])} ${f(c[1])}`;
  }
  s += `<path d="${br}" stroke="${P.ink}" stroke-width="6.5" fill="none" stroke-linecap="round"/><path d="${br}" stroke="${RST[1]}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  // front legs
  s += K.beam(...legL(0), ...legL(1), 10, RST);
  s += K.beam(...legR(0), ...legR(1), 10, RST);
  // corrugated skirt round the bottom third
  const sk = [legL(0.34), legR(0.34), legR(0), legL(0)];
  s += K.corrugated([[sk[0][0] - 4, sk[0][1]], [sk[1][0] + 4, sk[1][1]], [sk[2][0] + 6, sk[2][1] + 2], [sk[3][0] - 6, sk[3][1] + 2]], { tones: GALV, angle: 0, pitch: 8 });
  s += K.hazard([[sk[3][0] - 4, yB - 22], [sk[2][0] + 4, yB - 22], [sk[2][0] + 5, yB - 6], [sk[3][0] - 5, yB - 6]], { w: 7 });
  s += skullSvg(x, yB - 52, 11, '#f3ede0', '#3a2a1d', { bones: true, op: 0.9 });
  // crown block, sheave, beacon
  s += blk(K, null, { x: x - tw / 2 - 10, y: top + 6, w: tw + 20, h: 18, d: 18, t: YEL, seams: 0, stains: false, chips: false, grime: false, hatch: false, sw: 3.2, shadow: false });
  s += `<circle cx="${f(x + 2)}" cy="${f(top - 6)}" r="11" fill="${STL[2]}" stroke="${P.ink}" stroke-width="3.5"/><circle cx="${f(x + 2)}" cy="${f(top - 6)}" r="4" fill="${P.ink}"/>`;
  s += beacon(K, x - 12, top - 14, WARN, 7);
  s += K.neon(`M${f(legR(0.4)[0] + 4)} ${f(legR(0.4)[1])} L${f(legR(0.9)[0] + 4)} ${f(legR(0.9)[1])}`, MAG, 3);
  // winch house at the foot
  s += blk(K, sh, { x: x - bw / 2 - 40, y: yB + 8, w: 44, h: 34, d: 30, t: OLIVE, seams: 0, sw: 3.5,
    front: (fx0, fy0) => rect(fx0 + 8, fy0 + 9, 16, 10, '#1d1820', 2.4) + K.leds([[fx0 + 32, fy0 + 12]], AMB, 2.6) });
  s += K.cable(x - bw / 2 - 18, yB - 26, x - 4, top + 16, -10, 2.6);
  K.haze(x - 12, top - 16, 60, 40, WARN, 0.25);
  return s;
}

// ------------------------------------------------------------ shack
function shack(K, sh) {
  const x = 2614, y = 466, w = 104, h = 58, d = 52;
  let s = '';
  s += blk(K, sh, {
    x, y, w, h, d, t: GALV, seams: 0,
    front: (fx0, fy0, fx1, fy1) => {
      let r = K.corrugated([[fx0, fy0], [fx1, fy0], [fx1, fy1], [fx0, fy1]], { tones: ['#a9b6ad', '#76877f', '#4e5c57'], angle: 0, pitch: 8 });
      r += plate(K, fx0 + 58, fy0 + 6, 40, 26, RST, {});
      // door with a warm light, counter window
      r += rect(fx0 + 10, fy0 + 14, 26, fy1 - fy0 - 14, '#2a1f18', 3);
      K.glow(`<rect x="${f(fx0 + 13)}" y="${f(fy0 + 17)}" width="20" height="${f(fy1 - fy0 - 20)}" fill="${P.warm[1]}" opacity=".85"/><ellipse cx="${f(fx0 + 23)}" cy="${f(fy1 - 14)}" rx="30" ry="16" fill="${P.warm[2]}" opacity=".4" filter="url(#bloom)"/>`);
      r += rect(fx0 + 58, fy0 + 34, 38, 12, '#2a1f18', 2.6);
      K.glow(`<rect x="${f(fx0 + 60)}" y="${f(fy0 + 36)}" width="34" height="8" fill="${MAG.c}" opacity=".6"/>`);
      r += K.text('OPEN', fx0 + 77, fy0 + 23, { size: 8, glowCol: MAG });
      r += K.graffiti(fx0 + 76, fy1 - 2, '$$$', '#9dff3a', { size: 11, rot: -6 });
      return r;
    },
    top: (T) => K.corrugated([[T[0][0] - 8, T[0][1] + 4], [T[1][0] - 6, T[1][1] - 2], [T[2][0] + 10, T[2][1] - 2], [T[3][0] + 10, T[3][1] + 4]], { tones: RST, angle: 22, pitch: 10 }),
  });
  // holo sign on the roof
  // holo sign on the front edge of the roof
  s += holoSign(K, x - 6, y - h - 40, w + 12, 30, 'SCRAP 4 CA$H', MAG, { skull: false });
  // dish and a lamp
  s += K.dish(x + w - 6, y - h - 10, 14, P.steel, -30);
  s += K.leds([[x + 23, y - h - 4]], AMB, 3);
  K.lightPool(x + 30, y + 12, 70, 22, AMB, 0.4);
  return s;
}

// Tyre stack and a junk heap beside the shack.
function junk(K, sh) {
  let s = '';
  sh.blob(2748, 470, 30, 8);
  s += K.tyre(2742, 476, 15) + K.tyre(2742, 466, 15) + K.tyre(2742, 456, 15);
  s += K.drum(2584, 490, 12, 'rust') + K.drum(2600, 500, 12, 'yellow');
  return s;
}

// Amber yard light on a pole.
function yardLamp(K, sh, x, y, dir = 1) {
  sh.pole(x, y, 110, 4);
  return K.streetLight(x, y, 110, AMB, { arm: 30, dir });
}

// ------------------------------------------------------------ layer
const ERASE = [
  [[2596, 366], [2734, 366], [2734, 474], [2596, 474]],                                   // tent
  [[2852, 158], [2934, 158], [2934, 436], [2852, 436]],                                   // derrick poles
  [[2946, 328], [3112, 330], [3204, 384], [3246, 418], [3246, 474], [3150, 604], [3040, 604], [2946, 540]], // headframe, stair, chute, cart
  [[2726, 408], [2836, 408], [2836, 570], [2716, 570]],                                   // block + cart
  [[2846, 488], [2966, 488], [2966, 576], [2846, 576]],                                   // cart
  [[3146, 600], [3250, 600], [3250, 694], [3146, 694]],                                   // cart
  [[2540, 438], [2614, 438], [2614, 562], [2540, 562]],                                   // fence posts
  [[3222, 548], [3312, 548], [3312, 632], [3222, 632]],                                   // fence posts
];

export default {
  name: 'mine',
  z: 40,
  erase: ERASE,
  build(K) {
    const sh = shade();
    let ground = '';
    // yard dressing over the inpainted patches
    ground += rails(K, 'M3176 414 C3178 480 3186 540 3196 608');
    ground += rails(K, 'M3150 640 C3060 652 2960 652 2856 642', { horiz: true });
    ground += K.stain(3150, 620, 30, '#1b1612', 0.4) + K.stain(2990, 590, 26, '#1b1612', 0.35) + K.stain(2780, 520, 22, '#1b1612', 0.3);
    ground += K.tracks('M2560 560 C2640 600 2760 640 2860 660', { w: 12, op: 0.18 });

    let o = '';
    o += K.part('mn-rig', () => drillRig(K, sh, 2892, 436));
    o += K.part('mn-portal', () => portal(K, sh));
    o += K.part('mn-shack', () => shack(K, sh));
    o += K.part('mn-junk', () => junk(K, sh));
    o += K.part('mn-tanks', () => tanks(K, sh));
    o += K.part('mn-pipes', () => pipes(K, sh));
    o += K.part('mn-cart-portal', () => cart(K, sh, 3178, 470, { w: 58 }));
    o += K.part('mn-refinery', () => refinery(K, sh));
    o += K.part('mn-conveyor', () => conveyor(K, sh, 3172, 588, 3062, 450, 566));
    o += K.part('mn-hopper', () => dumpHopper(K, sh, 3186, 628));
    o += K.part('mn-cart-dump', () => cart(K, sh, 3214, 618, { w: 58, tilt: -16 }));
    o += K.part('mn-cart-yard', () => cart(K, sh, 2930, 650, { w: 62 }));
    o += K.part('mn-lamps', () => yardLamp(K, sh, 3270, 560, -1));
    ground += sh.render(K, 0.5);
    K.haze(3000, 520, 300, 140, MAG, 0.06);
    return { ground, objects: o, light: '' };
  },
};

// Enemy and trooper sprites for Neon Wasteland, drawn with the tower kit so they
// share the towers' ink, light (upper-left) and texture. Inspiration: the user's
// reference ref/enemies.jpg (SCOUT, RAIDER, ENFORCER, MECH).
//
// Every unit faces right on a 160 x 160 canvas, feet on the ground at y = 150
// (x = 80). Frames: 6 walk frames (phase 0..5/6) then 2 attack frames. The game
// flips a unit to face left and draws its own ground shadow.
import { TowerKit, T, P, f } from '../towers2/tkit.mjs';

export const SIZE = 160, GX = 80, GY = 150, WALK = 6, ATTACK = 2;
const TAU = Math.PI * 2;
const pts = (a) => a.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ------------------------------------------------------------------ helpers
// A thick limb between two points: ink casing, colour, lit edge (upper-left).
function limb(a, b, w, tone, lit) {
  const d = `M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])}`;
  let s = `<path d="${d}" stroke="${P.ink}" stroke-width="${f(w + 5)}" stroke-linecap="round"/>`;
  s += `<path d="${d}" stroke="${tone}" stroke-width="${f(w)}" stroke-linecap="round"/>`;
  if (lit) s += `<path d="${d}" stroke="${lit}" stroke-width="${f(w * 0.3)}" stroke-linecap="round" transform="translate(${f(-w * 0.2)} ${f(-w * 0.12)})" opacity=".75"/>`;
  return s;
}
// Two-bone IK: the knee for hip h, foot ft, bone lengths l1, l2. dir +1 = knee forward (+x).
function knee(h, ft, l1, l2, dir = 1) {
  const dx = ft[0] - h[0], dy = ft[1] - h[1];
  const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
  const a = Math.atan2(dy, dx);
  const k = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const ang = a - dir * k;
  return [h[0] + Math.cos(ang) * l1, h[1] + Math.sin(ang) * l1];
}
// Foot position in a walk cycle: back along the ground, forward through the air.
function foot(hipX, phase, off, stride, lift, groundY = GY) {
  const t = TAU * (phase + off);
  return [hipX - stride * Math.cos(t), groundY - lift * Math.max(0, Math.sin(t))];
}
function poly(p, fill, sw = 3.2) { return `<polygon points="${pts(p)}" fill="${fill}" stroke="${P.ink}" stroke-width="${sw}" stroke-linejoin="round"/>`; }
function circ(x, y, r, fill, sw = 3) { return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}" stroke="${P.ink}" stroke-width="${sw}"/>`; }
function ell(x, y, rx, ry, fill, sw = 3, rot = 0) { return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" transform="rotate(${f(rot)} ${f(x)} ${f(y)})" fill="${fill}" stroke="${P.ink}" stroke-width="${sw}"/>`; }
// Glowing blade from a to b (a = hilt).
function blade(K, a, b, col, w = 5) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  const g0 = [a[0] - ux * 13, a[1] - uy * 13];
  let s = limb(g0, a, 4.5, '#2b2833');                                   // grip
  s += `<path d="M${f(a[0] - uy * 6)} ${f(a[1] + ux * 6)} L${f(a[0] + uy * 6)} ${f(a[1] - ux * 6)}" stroke="${P.ink}" stroke-width="5" stroke-linecap="round"/>`; // guard
  K.glow(`<path d="M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])}" stroke="${col.c}" stroke-width="${w * 3.4}" stroke-linecap="round" opacity=".55" filter="url(#bloom)"/>` +
    `<path d="M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])}" stroke="${col.c}" stroke-width="${w}" stroke-linecap="round"/>` +
    `<path d="M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])}" stroke="${col.core}" stroke-width="${f(w * 0.4)}" stroke-linecap="round"/>`);
  s += `<path d="M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])}" stroke="${P.ink}" stroke-width="${w + 4}" stroke-linecap="round"/>`;
  return s;
}
// Neon sneaker at foot position, pointing forward.
function sneaker(x, y, sole, lace, body = '#2b2833') {
  let s = poly([[x - 8, y - 9], [x + 4, y - 10], [x + 13, y - 3], [x + 13, y + 1], [x - 9, y + 1]], body, 3);
  s += `<path d="M${f(x - 9)} ${f(y - 1)} H${f(x + 13)}" stroke="${sole}" stroke-width="3.2"/>`;
  s += `<path d="M${f(x - 1)} ${f(y - 9)} l3 4 M${f(x + 3)} ${f(y - 8)} l3 4" stroke="${lace}" stroke-width="2"/>`;
  return s;
}

// ------------------------------------------------------------------ RAIDER
// Cyber ninja: purple helmet with a glowing magenta visor, olive jacket, two
// neon katanas (magenta raised behind, cyan held low), neon sneakers.
function raider(K, fr, pal = {}) {
  const atk = fr.attack;                    // null, 0 (wind-up) or 1 (slash)
  const p = fr.phase || 0;
  const bob = atk == null ? -Math.abs(Math.sin(TAU * p)) * 2.4 : atk === 1 ? 3 : -1;
  const hip = [78, 103 + bob];
  const jacket = pal.jacket || ['#77806d', '#59614f', '#3e4537', '#2a2f25'];
  const helm = pal.helm || ['#b48cff', '#7d4fd6', '#4f2a9e', '#2e1763'];
  const visor = pal.visor || T.magenta;
  const pants = pal.pants || ['#5a5d68', '#3f414b', '#2b2c33'];
  return K.part('unit', () => {
    let s = '';
    // far leg
    const stride = atk == null ? 13 : 0;
    const fb = atk == null ? foot(hip[0] - 4, p, 0.5, stride, 9) : [hip[0] - 14, GY];
    const kb = knee([hip[0] - 4, hip[1]], fb, 24, 25, 1);
    s += limb([hip[0] - 4, hip[1]], kb, 11, pants[2]) + limb(kb, fb, 10, pants[2]);
    s += sneaker(fb[0], fb[1], pal.sole2 || T.magenta.c, T.cyan.c, '#22202a');
    // far arm + raised magenta katana
    const sh1 = [70, 74 + bob];
    const hand1 = atk === 1 ? [96, 72 + bob] : atk === 0 ? [62, 50 + bob] : [58, 66 + bob];
    const el1 = knee(sh1, hand1, 15, 15, -1);
    s += limb(sh1, el1, 9, jacket[2]) + limb(el1, hand1, 8, jacket[2]);
    const tip1 = atk === 1 ? [146, 100 + bob] : atk === 0 ? [80, 6 + bob] : [36, 14 + bob];
    s += blade(K, hand1, tip1, pal.blade1 || T.magenta, 4.5);
    s += circ(hand1[0], hand1[1], 5, '#d9a07a', 2.6);
    // torso: jacket over dark shirt
    const tor = [[62, 72 + bob], [96, 69 + bob], [101, 101 + bob], [64, 105 + bob]];
    s += poly(tor, jacket[1]);
    s += poly([[64, 73 + bob], [76, 72 + bob], [73, 104 + bob], [65, 105 + bob]], jacket[0], 0);
    s += poly([[82, 71 + bob], [94, 70 + bob], [96, 100 + bob], [84, 102 + bob]], '#2b2c33', 2.4);   // shirt
    s += `<path d="M${f(84)} ${f(72 + bob)} L${f(86)} ${f(101 + bob)}" stroke="${T.cyan.c}" stroke-width="1.6" opacity=".9"/>`;          // zip piping
    s += K.hatch(`M96 ${f(69 + bob)} L101 ${f(101 + bob)} L90 ${f(103 + bob)} L88 ${f(70 + bob)} Z`, { density: 1.2, len: [5, 9], w: 1.4 });
    s += poly([[63, 99 + bob], [100, 96 + bob], [101, 103 + bob], [64, 106 + bob]], '#2b2833', 2.4);  // belt
    s += `<rect x="78" y="${f(97 + bob)}" width="7" height="6" fill="${T.brass[1]}" stroke="${P.ink}" stroke-width="1.6"/>`;
    // collar
    s += poly([[66, 73 + bob], [76, 64 + bob], [80, 72 + bob]], jacket[0], 2.4) + poly([[92, 70 + bob], [97, 62 + bob], [99, 72 + bob]], jacket[1], 2.4);
    // near leg
    const ff = atk == null ? foot(hip[0] + 6, p, 0, stride, 9) : [hip[0] + 18, GY];
    const kf = knee([hip[0] + 6, hip[1]], ff, 24, 25, 1);
    s += limb([hip[0] + 6, hip[1]], kf, 12, pants[1], pants[0]) + limb(kf, ff, 11, pants[1], pants[0]);
    s += ell(kf[0] + 2, kf[1], 6, 5, helm[2], 2.4);                       // knee pad
    s += sneaker(ff[0], ff[1], pal.sole1 || T.cyan.c, T.magenta.c);
    // helmet
    const hx = 84, hy = 50 + bob;
    s += limb([72, 60 + bob], [64, 76 + bob], 3.5, '#3a7bff');             // cable to the back
    s += circ(hx, hy, 17, helm[1], 3.4);
    s += `<path d="M${f(hx - 15)} ${f(hy - 6)} A17 17 0 0 1 ${f(hx + 8)} ${f(hy - 16)}" stroke="${helm[0]}" stroke-width="4" fill="none" opacity=".9"/>`;
    s += `<path d="M${f(hx + 2)} ${f(hy + 16)} A17 17 0 0 0 ${f(hx + 16)} ${f(hy + 4)}" stroke="${helm[3]}" stroke-width="5" fill="none"/>`;
    s += poly([[hx - 20, hy - 14], [hx - 12, hy - 22], [hx - 10, hy - 12]], helm[2], 2.4);   // fin
    s += circ(hx - 12, hy + 4, 5, '#8f96a6', 2.6);                          // ear piece
    // visor: a glowing band across the front
    const vis = [[hx - 4, hy - 4], [hx + 14, hy - 8], [hx + 18, hy + 2], [hx + 12, hy + 11], [hx + 1, hy + 9]];
    s += poly(vis, visor.deep, 3);
    K.glow(`<polygon points="${pts(vis)}" fill="${visor.c}" opacity=".95"/><polygon points="${pts(vis.map(([x, y]) => [x + 2, y + 1]))}" fill="${visor.c}" opacity=".5" filter="url(#bloom)"/>` +
      `<path d="M${f(hx)} ${f(hy - 3)} L${f(hx + 13)} ${f(hy - 6)}" stroke="${visor.core}" stroke-width="2.2" stroke-linecap="round"/>`);
    // near arm + low cyan katana
    const sh2 = [94, 76 + bob];
    const hand2 = atk === 0 ? [108, 58 + bob] : atk === 1 ? [114, 98 + bob] : [110, 98 + bob];
    const el2 = knee(sh2, hand2, 15, 15, 1);
    s += limb(sh2, el2, 10, jacket[1], jacket[0]) + limb(el2, hand2, 9, jacket[1], jacket[0]);
    s += `<path d="M${f(el2[0] - 3)} ${f(el2[1] - 4)} l6 3" stroke="${pal.stripe || T.magenta.c}" stroke-width="2.4"/>`;
    const tip2 = atk === 0 ? [126, 18 + bob] : atk === 1 ? [150, 138] : [144, 122 + bob];
    s += blade(K, hand2, tip2, pal.blade2 || T.cyan, 4.5);
    s += circ(hand2[0], hand2[1], 5.5, '#2b2833', 2.6);                      // fingerless glove
    if (atk === 1) K.glow(`<path d="M${f(96)} ${f(30)} Q${f(150)} ${f(40)} ${f(150)} ${f(132)}" stroke="${(pal.blade2 || T.cyan).c}" stroke-width="5" fill="none" opacity=".45" filter="url(#bloom)"/>`);
    return s;
  });
}

// ------------------------------------------------------------------ TROOPER (AEGIS, friendly) / MERC
function trooper(K, fr, pal = {}) {
  const atk = fr.attack, p = fr.phase || 0;
  const bob = atk == null ? -Math.abs(Math.sin(TAU * p)) * 2.2 : atk === 1 ? 2 : -1;
  const hip = [78, 104 + bob];
  const arm = pal.armour || ['#5b8fe0', '#2f62b8', '#1f428a', '#132b5c'];
  const vis = pal.visor || T.cyan;
  return K.part('unit', () => {
    let s = '';
    const stride = atk == null ? 12 : 0;
    const fb = atk == null ? foot(hip[0] - 4, p, 0.5, stride, 8) : [hip[0] - 12, GY];
    const kb = knee([hip[0] - 4, hip[1]], fb, 24, 24, 1);
    s += limb([hip[0] - 4, hip[1]], kb, 12, '#2d3038') + limb(kb, fb, 11, '#2d3038');
    s += poly([[fb[0] - 8, fb[1] - 8], [fb[0] + 10, fb[1] - 8], [fb[0] + 13, fb[1] + 1], [fb[0] - 9, fb[1] + 1]], '#1d1f25', 3);
    // torso armour
    s += poly([[60, 72 + bob], [98, 70 + bob], [102, 104 + bob], [62, 106 + bob]], T.gun[2]);
    s += poly([[64, 74 + bob], [96, 72 + bob], [98, 94 + bob], [66, 96 + bob]], arm[1], 3);
    s += poly([[66, 75 + bob], [80, 74 + bob], [79, 94 + bob], [67, 95 + bob]], arm[0], 0);
    s += `<path d="M66 ${f(86 + bob)} L97 ${f(84 + bob)}" stroke="${P.ink}" stroke-width="2"/>`;
    s += K.leds([[90, 79 + bob]], vis, 2);
    s += poly([[62, 100 + bob], [101, 98 + bob], [102, 106 + bob], [63, 108 + bob]], '#2b2833', 2.4);
    // near leg
    const ff = atk == null ? foot(hip[0] + 6, p, 0, stride, 8) : [hip[0] + 16, GY];
    const kf = knee([hip[0] + 6, hip[1]], ff, 24, 24, 1);
    s += limb([hip[0] + 6, hip[1]], kf, 13, '#3e424d', '#5a5f6c') + limb(kf, ff, 12, '#3e424d', '#5a5f6c');
    s += ell(kf[0] + 2, kf[1], 6.5, 5.5, arm[1], 2.6);
    s += poly([[ff[0] - 8, ff[1] - 9], [ff[0] + 10, ff[1] - 9], [ff[0] + 14, ff[1] + 1], [ff[0] - 9, ff[1] + 1]], '#24262d', 3);
    // helmet with a visor
    const hx = 82, hy = 52 + bob;
    s += circ(hx, hy, 16, T.gun[1], 3.4);
    s += `<path d="M${f(hx - 14)} ${f(hy - 6)} A16 16 0 0 1 ${f(hx + 6)} ${f(hy - 15)}" stroke="${T.gun[0]}" stroke-width="4" fill="none"/>`;
    s += poly([[hx - 17, hy + 2], [hx + 17, hy + 1], [hx + 15, hy + 9], [hx - 15, hy + 10]], T.gun[3], 2.6);   // brim
    const v = [[hx - 2, hy - 4], [hx + 15, hy - 6], [hx + 16, hy + 2], [hx - 2, hy + 3]];
    s += poly(v, vis.deep, 2.6);
    K.glow(`<polygon points="${pts(v)}" fill="${vis.c}"/><polygon points="${pts(v)}" fill="${vis.c}" opacity=".5" filter="url(#bloom)"/>`);
    s += circ(hx - 10, hy - 2, 4, arm[2], 2.2);
    // shoulder pad + arm with a shock baton
    s += ell(92, 76 + bob, 10, 7, arm[1], 3, -10);
    const sh = [94, 80 + bob];
    const hand = atk === 0 ? [104, 60 + bob] : atk === 1 ? [116, 96 + bob] : [108, 96 + bob];
    const el = knee(sh, hand, 14, 14, 1);
    s += limb(sh, el, 10, arm[1], arm[0]) + limb(el, hand, 9, arm[1], arm[0]);
    const tip = atk === 0 ? [118, 30 + bob] : atk === 1 ? [146, 110] : [134, 82 + bob];
    s += limb(hand, tip, 6, T.gun[2]);
    K.glow(`<circle cx="${f(tip[0])}" cy="${f(tip[1])}" r="${atk === 1 ? 9 : 5}" fill="${vis.c}" opacity=".85" filter="url(#bloom)"/><circle cx="${f(tip[0])}" cy="${f(tip[1])}" r="3" fill="${vis.core}"/>`);
    s += circ(hand[0], hand[1], 5.5, '#24262d', 2.6);
    return s;
  });
}

// ------------------------------------------------------------------ SCOUT (robot dog)
function scout(K, fr) {
  const atk = fr.attack, p = fr.phase || 0;
  const bob = atk == null ? Math.sin(TAU * p * 2) * 1.6 : atk === 1 ? 4 : -2;
  const lunge = atk === 1 ? 8 : atk === 0 ? -4 : 0;
  const by = 92 + bob;
  return K.part('unit', () => {
    let s = '';
    const hipB = [46 + lunge, by + 8], shF = [104 + lunge, by + 8];
    const L1 = 22, L2 = 26;
    const legs = [
      // [hip point, cycle offset, knee dir, near?]
      [hipB, 0.5, 1, false], [shF, 0.0, -1, false],
      [hipB, 0.0, 1, true], [shF, 0.5, -1, true],
    ];
    const drawLeg = ([h, off, dir, near]) => {
      const hp = [h[0] + (near ? 4 : -4), h[1]];
      const ft = atk == null ? foot(hp[0], p, off, 14, 10) : [hp[0] + (near ? 6 : -4) * (atk === 1 ? 1.4 : 0.5), GY];
      const kn = knee(hp, ft, L1, L2, dir);
      const tone = near ? T.gun[1] : T.gun[3];
      let t = limb(hp, kn, near ? 8 : 7, tone, near ? T.gun[0] : null) + limb(kn, ft, near ? 6.5 : 5.5, tone);
      t += circ(kn[0], kn[1], near ? 4.5 : 3.5, near ? T.gun[2] : T.gun[4], 2.4);
      t += poly([[ft[0] - 5, ft[1] - 4], [ft[0] + 7, ft[1] - 4], [ft[0] + 9, ft[1] + 1], [ft[0] - 5, ft[1] + 1]], T.gun[3], 2.4);
      return t;
    };
    s += legs.filter((l) => !l[3]).map(drawLeg).join('');
    // tail and antennae
    s += limb([34 + lunge, by - 2], [22 + lunge, by - 22 - bob], 5, T.gun[2]) + limb([22 + lunge, by - 22 - bob], [26 + lunge, by - 40], 4, T.gun[2]);
    for (const [ax, ah] of [[62, 34], [70, 44], [78, 30]]) {
      s += `<path d="M${f(ax + lunge)} ${f(by - 12)} L${f(ax - 6 + lunge)} ${f(by - 12 - ah)}" stroke="${P.ink}" stroke-width="4.5" stroke-linecap="round"/><path d="M${f(ax + lunge)} ${f(by - 12)} L${f(ax - 6 + lunge)} ${f(by - 12 - ah)}" stroke="${T.gun[0]}" stroke-width="1.8" stroke-linecap="round"/>`;
    }
    s += K.leds([[64 + lunge, by - 48]], T.red, 2.6);
    // body: hip block, ribbed belly, chest
    s += poly([[30 + lunge, by - 12], [62 + lunge, by - 16], [64 + lunge, by + 14], [34 + lunge, by + 14]], T.gun[2]);
    s += poly([[58 + lunge, by - 16], [98 + lunge, by - 18], [96 + lunge, by + 10], [60 + lunge, by + 12]], T.gun[1]);
    for (let k = 0; k < 4; k++) s += `<path d="M${f(64 + k * 8 + lunge)} ${f(by - 14)} V${f(by + 10)}" stroke="${T.gun[3]}" stroke-width="3"/>`;
    s += poly([[92 + lunge, by - 20], [118 + lunge, by - 16], [118 + lunge, by + 14], [94 + lunge, by + 14]], T.gun[1]);
    s += `<polyline points="${pts([[32 + lunge, by - 10], [60 + lunge, by - 14], [96 + lunge, by - 16], [116 + lunge, by - 14]])}" stroke="${T.rim}" stroke-width="2.4" fill="none" opacity=".7"/>`;
    s += K.hatch(`M30 ${f(by + 4)} L118 ${f(by + 4)} L118 ${f(by + 14)} L30 ${f(by + 14)} Z`, { density: 1.2, len: [5, 9], w: 1.4 });
    s += `<path d="M${f(40 + lunge)} ${f(by + 4)} q6 -6 14 -2" stroke="${T.rust[1]}" stroke-width="4" fill="none" opacity=".8"/>`;
    // joint discs
    s += circ(46 + lunge, by + 2, 9, T.gun[2], 3) + circ(46 + lunge, by + 2, 4, T.gun[4], 2);
    s += circ(106 + lunge, by + 2, 9, T.gun[2], 3) + circ(106 + lunge, by + 2, 4, T.gun[4], 2);
    // neck + head
    const hx = 126 + lunge, hy = by - 26 + (atk === 1 ? 6 : 0);
    s += limb([110 + lunge, by - 12], [hx - 6, hy + 6], 12, T.gun[2]);
    s += poly([[hx - 12, hy - 4], [hx - 8, hy - 26], [hx - 2, hy - 8]], T.gun[2], 2.8);   // ear
    s += poly([[hx - 16, hy - 10], [hx + 8, hy - 12], [hx + 12, hy + 4], [hx - 14, hy + 8]], T.gun[1]);                    // skull
    const jaw = atk === 1 ? 8 : 0;
    s += poly([[hx + 4, hy - 8], [hx + 26, hy - 4], [hx + 26, hy + 4], [hx + 6, hy + 6]], T.gun[2]);                         // snout
    s += poly([[hx + 2, hy + 6], [hx + 24, hy + 6 + jaw * 0.6], [hx + 20, hy + 13 + jaw], [hx, hy + 12]], T.gun[3], 2.8);   // jaw
    s += `<path d="M${f(hx + 4)} ${f(hy + 6)} l3 4 l3 -4 l3 4 l3 -4 l3 4 l3 -4" stroke="${T.rust[0]}" stroke-width="2" fill="none"/>`;
    s += circ(hx + 25, hy - 2, 2.6, P.ink, 0);
    // eye
    s += circ(hx + 2, hy - 4, 5.5, P.ink, 0);
    K.glow(`<circle cx="${f(hx + 2)}" cy="${f(hy - 4)}" r="11" fill="${T.cyan.c}" opacity=".6" filter="url(#bloom)"/><circle cx="${f(hx + 2)}" cy="${f(hy - 4)}" r="4.2" fill="${T.cyan.c}"/><circle cx="${f(hx + 1)}" cy="${f(hy - 5)}" r="1.8" fill="${T.cyan.core}"/>`);
    s += legs.filter((l) => l[3]).map(drawLeg).join('');
    return s;
  });
}

// ------------------------------------------------------------------ ENFORCER
// Hulking armour, spiked dome shoulders, a recessed angry face, rainbow cables,
// glowing orange chest vent, a gatling arm.
function enforcer(K, fr) {
  const atk = fr.attack, p = fr.phase || 0;
  const bob = atk == null ? -Math.abs(Math.sin(TAU * p)) * 2.6 : atk === 1 ? 3 : 0;
  const hip = [80, 116 + bob];
  const G = T.gun;
  return K.part('unit', () => {
    let s = '';
    const stride = atk == null ? 10 : 0;
    const legPair = (near) => {
      const hp = [hip[0] + (near ? 10 : -10), hip[1]];
      const ft = atk == null ? foot(hp[0], p, near ? 0 : 0.5, stride, 7) : [hp[0] + (near ? 8 : -6), GY];
      const kn = knee(hp, ft, 18, 18, 1);
      const tone = near ? G[1] : G[3];
      let t = limb(hp, kn, 17, tone, near ? G[0] : null) + limb(kn, ft, 15, tone);
      t += poly([[kn[0] - 9, kn[1] - 8], [kn[0] + 9, kn[1] - 9], [kn[0] + 10, kn[1] + 6], [kn[0] - 8, kn[1] + 7]], near ? G[2] : G[4], 2.8);
      t += poly([[ft[0] - 12, ft[1] - 10], [ft[0] + 12, ft[1] - 11], [ft[0] + 16, ft[1] + 1], [ft[0] - 13, ft[1] + 1]], near ? G[3] : G[4], 3);
      return t;
    };
    s += legPair(false);
    // rainbow cables from the back of the helmet down to the hips
    const cab = ['#3ff0ff', '#7dff5a', '#ff3dc8', '#ff8a1e'];
    cab.forEach((c, i) => {
      const d = `M${f(66 - i * 3)} ${f(40 + bob)} C${f(40 - i * 4)} ${f(30 + bob)} ${f(30 - i * 3)} ${f(70 + bob)} ${f(44 + i * 2)} ${f(96 + bob)}`;
      s += `<path d="${d}" stroke="${P.ink}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${c}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`;
    });
    // far shoulder dome + big fist arm
    s += circ(50, 58 + bob, 19, G[2], 3.4);
    const fist = atk === 1 ? [40, 122 + bob] : atk === 0 ? [30, 70 + bob] : [36, 104 + bob];
    s += limb([48, 70 + bob], fist, 15, G[3]);
    s += `<rect x="${f(fist[0] - 12)}" y="${f(fist[1] - 11)}" width="24" height="22" rx="7" fill="${G[2]}" stroke="${P.ink}" stroke-width="3.2"/>`;
    s += `<path d="M${f(fist[0] - 10)} ${f(fist[1] - 3)} H${f(fist[0] + 10)} M${f(fist[0] - 10)} ${f(fist[1] + 4)} H${f(fist[0] + 10)}" stroke="${P.ink}" stroke-width="2"/>`;
    // torso
    const tor = [[52, 50 + bob], [112, 48 + bob], [120, 92 + bob], [104, 118 + bob], [60, 120 + bob], [46, 92 + bob]];
    s += poly(tor, G[1], 3.6);
    s += poly([[54, 52 + bob], [80, 51 + bob], [74, 118 + bob], [60, 119 + bob], [48, 92 + bob]], G[0], 0);
    s += `<path d="M58 ${f(80 + bob)} L114 ${f(78 + bob)} M64 ${f(104 + bob)} L110 ${f(102 + bob)}" stroke="${P.ink}" stroke-width="2.6"/>`;
    s += K.hatch(`M98 ${f(48 + bob)} L120 ${f(92 + bob)} L104 ${f(118 + bob)} L96 ${f(118 + bob)} Z`, { density: 1.1, len: [6, 11], w: 1.5 });
    s += K.rivets([[56, 56 + bob], [108, 54 + bob], [58, 112 + bob], [104, 110 + bob]], 2.2);
    // chest vent (glows orange)
    const vent = [[70, 84 + bob], [98, 83 + bob], [99, 100 + bob], [71, 101 + bob]];
    s += poly(vent, '#3a2416', 3);
    K.glow(`<polygon points="${pts(vent)}" fill="${T.orange.c}" opacity=".35" filter="url(#bloom)"/>` +
      [76, 84, 92].map((x) => `<rect x="${x - 2.5}" y="${f(86 + bob)}" width="5" height="13" rx="2.5" fill="${T.orange.c}"/><rect x="${x - 1}" y="${f(87 + bob)}" width="2" height="10" fill="${T.orange.core}"/>`).join(''));
    // round helmet with a big angry face in it
    const hx = 86, hy = 34 + bob;
    s += circ(hx, hy, 22, G[2], 3.6);
    s += `<path d="M${f(hx - 19)} ${f(hy - 8)} A22 22 0 0 1 ${f(hx + 8)} ${f(hy - 21)}" stroke="${G[0]}" stroke-width="4.5" fill="none" opacity=".9"/>`;
    s += ell(hx + 3, hy + 3, 14, 16, '#d9876a', 3);                                                   // face
    s += `<path d="M${f(hx - 9)} ${f(hy + 8)} Q${f(hx + 3)} ${f(hy + 20)} ${f(hx + 16)} ${f(hy + 8)}" stroke="#a85a44" stroke-width="3" fill="none" opacity=".7"/>`;   // jaw shade
    s += poly([[hx - 10, hy - 10], [hx + 2, hy - 13], [hx + 4, hy - 3], [hx - 10, hy - 1]], '#7c8698', 2);        // cyborg plate
    s += K.rivets([[hx - 7, hy - 8]], 1.4);
    s += `<path d="M${f(hx - 6)} ${f(hy - 3)} L${f(hx + 2)} ${f(hy + 1)} M${f(hx + 6)} ${f(hy + 1)} L${f(hx + 14)} ${f(hy - 4)}" stroke="${P.ink}" stroke-width="3" stroke-linecap="round"/>`;   // angry brows
    K.glow(`<circle cx="${f(hx - 1)}" cy="${f(hy + 4)}" r="2.6" fill="#ff3a3a"/><circle cx="${f(hx + 10)}" cy="${f(hy + 4)}" r="2.6" fill="#ff3a3a"/><circle cx="${f(hx - 1)}" cy="${f(hy + 4)}" r="6" fill="#ff3a3a" opacity=".45" filter="url(#bloom)"/>`);
    s += `<rect x="${f(hx - 4)}" y="${f(hy + 10)}" width="15" height="6" rx="1" fill="#f1e4c8" stroke="${P.ink}" stroke-width="2"/><path d="M${f(hx + 1)} ${f(hy + 10)} v6 M${f(hx + 6)} ${f(hy + 10)} v6 M${f(hx - 4)} ${f(hy + 13)} h15" stroke="${P.ink}" stroke-width="1.3"/>`;
    // rainbow cables arching from the helmet over both shoulders
    const loops = [`M${f(hx - 14)} ${f(hy - 14)} C${f(hx - 26)} ${f(hy - 40)} ${f(hx - 50)} ${f(hy - 22)} ${f(hx - 40)} ${f(hy + 8)}`,
      `M${f(hx + 12)} ${f(hy - 18)} C${f(hx + 20)} ${f(hy - 44)} ${f(hx + 46)} ${f(hy - 30)} ${f(hx + 34)} ${f(hy + 2)}`];
    for (const d of loops) {
      s += `<path d="${d}" stroke="${P.ink}" stroke-width="11" fill="none" stroke-linecap="round"/>`;
      ['#3ff0ff', '#7dff5a', '#ffd23a', '#ff3dc8'].forEach((c, i) => { s += `<path d="${d}" stroke="${c}" stroke-width="2.2" fill="none" stroke-linecap="round" transform="translate(${f((i - 1.5) * 1.6)} ${f((i - 1.5) * 1.6)})"/>`; });
    }
    // near shoulder dome with studs
    s += circ(114, 56 + bob, 21, G[1], 3.6);
    s += `<path d="M98 ${f(46 + bob)} A21 21 0 0 1 126 ${f(40 + bob)}" stroke="${G[0]}" stroke-width="4" fill="none" opacity=".9"/>`;
    for (const [sx, sy] of [[108, 42], [122, 50], [114, 64]]) s += circ(sx, sy + bob, 3.6, G[3], 2.2);
    // gatling arm pointing forward-down
    const gun0 = [118, 80 + bob], gun1 = atk === 0 ? [152, 84 + bob] : [152, 102 + bob];
    s += limb([112, 70 + bob], gun0, 15, G[2]);
    s += K.barrel({ x1: gun0[0], y1: gun0[1], x2: gun1[0], y2: gun1[1], r: 9, tones: [G[1], G[2], G[3], G[4]], muzzle: 'open', rings: 2 });
    if (atk === 1) K.glow(`<circle cx="${f(gun1[0] + 3)}" cy="${f(gun1[1])}" r="12" fill="${T.orange.c}" opacity=".8" filter="url(#bloom)"/><circle cx="${f(gun1[0] + 3)}" cy="${f(gun1[1])}" r="5" fill="${T.orange.core}"/>`);
    s += legPair(true);
    return s;
  });
}

// ------------------------------------------------------------------ MECH (boss)
// Rusty walker: hazard-striped cab, cyan eye lamp, a cannon on top, a missile
// pod, exhaust stacks (the game adds smoke), stubby arms.
function mech(K, fr) {
  const atk = fr.attack, p = fr.phase || 0;
  const bob = atk == null ? -Math.abs(Math.sin(TAU * p)) * 2.2 : atk === 1 ? 5 : -2;
  const R = T.rust, O = ['#8d8a6a', '#6d6a50', '#4f4c39', '#353326'];
  return K.part('unit', () => {
    let s = '';
    const legPair = (near) => {
      const hp = [near ? 92 : 64, 102 + bob];
      const ft = atk == null ? foot(hp[0], p, near ? 0 : 0.5, 9, 7) : [hp[0] + (near ? 4 : -4), GY];
      const kn = knee(hp, ft, 22, 26, -1);
      const tone = near ? O[1] : O[3];
      let t = limb(hp, kn, 14, tone, near ? O[0] : null) + limb(kn, ft, 12, tone);
      t += circ(kn[0], kn[1], near ? 7 : 6, near ? R[1] : R[3], 2.8);
      t += poly([[ft[0] - 14, ft[1] - 9], [ft[0] + 14, ft[1] - 10], [ft[0] + 18, ft[1] + 1], [ft[0] - 15, ft[1] + 1]], near ? O[2] : O[3], 3);
      t += `<path d="M${f(ft[0] + 10)} ${f(ft[1] - 1)} l6 0 M${f(ft[0] + 12)} ${f(ft[1] - 6)} l6 2" stroke="${P.ink}" stroke-width="2.4"/>`;
      return t;
    };
    s += legPair(false);
    // exhaust stacks + missile pod at the back
    for (const [x, h] of [[46, 34], [56, 26]]) s += `<rect x="${x - 4}" y="${f(26 + bob - h + 30)}" width="8" height="${h}" fill="${T.gun[2]}" stroke="${P.ink}" stroke-width="2.8"/>` + `<rect x="${x - 5}" y="${f(26 + bob - h + 28)}" width="10" height="5" fill="${T.gun[3]}" stroke="${P.ink}" stroke-width="2.4"/>`;
    s += K.box({ x: 26, y: 78 + bob, w: 26, h: 34, d: 14, tones: [R[0], R[1], R[2], R[3]], stroke: 3, hatchSide: false });
    for (let k = 0; k < 6; k++) { const cx = 31 + (k % 2) * 10, cy = 50 + Math.floor(k / 2) * 10 + bob; s += circ(cx, cy, 3.2, T.red.deep, 2); }
    K.glow([0, 1, 2, 3, 4, 5].map((k) => `<circle cx="${31 + (k % 2) * 10}" cy="${f(50 + Math.floor(k / 2) * 10 + bob)}" r="2" fill="#ff5a4a"/>`).join(''));
    // cab
    const cab = [[46, 42 + bob], [116, 38 + bob], [124, 70 + bob], [116, 104 + bob], [52, 106 + bob], [42, 74 + bob]];
    s += poly(cab, O[1], 3.6);
    s += poly([[48, 44 + bob], [76, 42 + bob], [72, 104 + bob], [52, 105 + bob], [44, 74 + bob]], O[0], 0);
    s += K.hazard([[52, 90 + bob], [112, 88 + bob], [113, 98 + bob], [53, 100 + bob]], { w: 6 });
    s += K.hazard([[96, 44 + bob], [114, 42 + bob], [118, 56 + bob], [100, 58 + bob]], { w: 5 });
    for (let k = 0; k < 5; k++) s += `<ellipse cx="${f(58 + k * 13)}" cy="${f(72 + bob + (k % 2) * 6)}" rx="${f(5 + (k % 3))}" ry="3" fill="${R[1]}" opacity=".75"/>`;  // rust
    s += K.hatch(`M100 ${f(38 + bob)} L124 ${f(70 + bob)} L116 ${f(104 + bob)} L100 ${f(104 + bob)} Z`, { density: 1.1, len: [6, 11], w: 1.5 });
    s += K.rivets([[52, 48 + bob], [110, 44 + bob], [56, 100 + bob], [110, 98 + bob]], 2.4);
    // eye lamp + small amber lamp + warning decal
    s += circ(110, 66 + bob, 8, T.gun[3], 3);
    K.glow(`<circle cx="110" cy="${f(66 + bob)}" r="14" fill="${T.cyan.c}" opacity=".6" filter="url(#bloom)"/><circle cx="110" cy="${f(66 + bob)}" r="5" fill="${T.cyan.c}"/><circle cx="109" cy="${f(65 + bob)}" r="2" fill="${T.cyan.core}"/>` +
      `<circle cx="96" cy="${f(52 + bob)}" r="3" fill="#ffd23a"/>`);
    s += poly([[82, 60 + bob], [90, 60 + bob], [86, 53 + bob]], P.hazard[0], 1.6);
    // cannon on top
    const c1 = atk === 0 ? [144, 14 + bob] : [148, 24 + bob];
    s += K.box({ x: 62, y: 42 + bob, w: 30, h: 14, d: 12, tones: [T.gun[1], T.gun[2], T.gun[3], T.gun[4]], stroke: 3, hatchSide: false });
    s += K.barrel({ x1: 82, y1: 30 + bob, x2: c1[0], y2: c1[1], r: 7, tones: [T.gun[1], T.gun[2], T.gun[3], T.gun[4]], muzzle: 'open', rings: 2 });
    s += `<rect x="66" y="${f(14 + bob)}" width="12" height="10" fill="${T.gun[2]}" stroke="${P.ink}" stroke-width="2.6"/>`;
    K.glow(`<rect x="69" y="${f(17 + bob)}" width="6" height="4" fill="${T.cyan.c}"/>`);
    if (atk === 1) K.glow(`<circle cx="${f(c1[0] + 4)}" cy="${f(c1[1])}" r="14" fill="${T.orange.c}" opacity=".85" filter="url(#bloom)"/><circle cx="${f(c1[0] + 4)}" cy="${f(c1[1])}" r="6" fill="${T.orange.core}"/>`);
    // stubby near arm with a claw
    const hand = atk === 1 ? [130, 112 + bob] : [126, 100 + bob];
    s += limb([112, 78 + bob], hand, 12, O[2], O[1]);
    s += poly([[hand[0] - 6, hand[1] - 6], [hand[0] + 8, hand[1] - 4], [hand[0] + 10, hand[1] + 6], [hand[0] - 4, hand[1] + 8]], T.gun[2], 2.8);
    s += legPair(true);
    return s;
  });
}

// ------------------------------------------------------------------ DRONE (flying)
function drone(K, fr) {
  const p = fr.phase || 0;
  const tilt = fr.attack === 1 ? 6 : 0;
  return K.part('unit', () => {
    let s = '';
    const cx = 80, cy = 84;
    const rot = [[-40, -14], [40, -14], [-30, 12], [30, 12]];
    // far arms first
    for (const [dx, dy] of rot) s += limb([cx, cy], [cx + dx, cy + dy], 7, dy < 0 ? T.gun[3] : T.gun[2]);
    for (const [dx, dy] of rot) s += `<rect x="${f(cx + dx - 6)}" y="${f(cy + dy - 8)}" width="12" height="9" rx="3" fill="${T.gun[2]}" stroke="${P.ink}" stroke-width="2.6"/>`;
    // body
    s += ell(cx, cy, 24, 15, T.gun[1], 3.4, tilt);
    s += `<path d="M${cx - 18} ${cy - 6} Q${cx} ${cy - 16} ${cx + 18} ${cy - 6}" stroke="${T.gun[0]}" stroke-width="3" fill="none"/>`;
    s += K.hazard([[cx - 16, cy + 4], [cx + 16, cy + 4], [cx + 14, cy + 9], [cx - 14, cy + 9]], { w: 4 });
    s += `<path d="M${cx - 2} ${cy - 14} l-4 -16" stroke="${P.ink}" stroke-width="4" stroke-linecap="round"/>`;
    s += K.leds([[cx - 6, cy - 31]], T.red, 2.2);
    s += circ(cx + 14, cy, 7, P.ink, 0);
    K.glow(`<circle cx="${cx + 14}" cy="${cy}" r="13" fill="#ff3a3a" opacity=".6" filter="url(#bloom)"/><circle cx="${cx + 14}" cy="${cy}" r="5" fill="#ff3a3a"/><circle cx="${cx + 13}" cy="${cy - 1}" r="2" fill="#ffe0e0"/>`);
    // rotor blur discs (spin with the frame)
    for (const [dx, dy] of rot) {
      const a = (p * 360 + dx * 3) % 180;
      K.glow(`<ellipse cx="${cx + dx}" cy="${cy + dy - 9}" rx="19" ry="6" fill="#ff8a6a" opacity=".22"/>` +
        `<ellipse cx="${cx + dx}" cy="${cy + dy - 9}" rx="18" ry="5" fill="none" stroke="#ffe6dc" stroke-width="1.4" opacity=".75"/>` +
        `<path d="M${f(cx + dx - Math.cos((a * Math.PI) / 180) * 17)} ${f(cy + dy - 9 - Math.sin((a * Math.PI) / 180) * 4.6)} L${f(cx + dx + Math.cos((a * Math.PI) / 180) * 17)} ${f(cy + dy - 9 + Math.sin((a * Math.PI) / 180) * 4.6)}" stroke="#fff" stroke-width="2" opacity=".85"/>`);
    }
    return s;
  });
}

// ------------------------------------------------------------------ registry
// height: how tall the unit is in the sprite (px), for the game's scale.
export const UNITS = {
  raider:   { name: 'Raider',   draw: raider,   height: 140 },
  scout:    { name: 'Scout',    draw: scout,    height: 112 },
  enforcer: { name: 'Enforcer', draw: enforcer, height: 136 },
  mech:     { name: 'Mech',     draw: mech,     height: 140 },
  drone:    { name: 'Drone',    draw: drone,    height: 70 },
  trooper:  { name: 'Trooper',  draw: trooper,  height: 116 },
  merc:     { name: 'Merc',     draw: (K, fr) => trooper(K, fr, { armour: ['#e0955b', '#b8652f', '#8a421f', '#5c2b13'], visor: T.orange }), height: 116 },
};
export function frames() {
  const out = [];
  for (let k = 0; k < WALK; k++) out.push({ phase: k / WALK, attack: null });
  for (let a = 0; a < ATTACK; a++) out.push({ phase: 0, attack: a });
  return out;
}
export function svgFor(id, fr, seed = 7) {
  const K = new TowerKit(seed);
  const body = UNITS[id].draw(K, fr);
  return K.doc(body, { title: id, w: SIZE, h: SIZE });
}

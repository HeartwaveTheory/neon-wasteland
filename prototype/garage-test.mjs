// Garage and Garrison checks. The Garage: three mechanics who block and soak up hits but deal little damage, and its
// field (enemies inside its range move slower, a boss half as much). The Garrison's troopers: laser pistols that shoot
// what's in reach (flyers too, armour doesn't count), from the hand, while they still block. Screenshots: a close-up of
// both towers in a fight (shots/22-garage.png and 22b-garrison.png, 2.3x) and the default cameras (shots/23 desktop, 24 phone).
// Run after build.py: node garage-test.mjs
// Playwright: $PLAYWRIGHT (path to its index.mjs) or the cloud workspace's copy.
const { chromium } = await import(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs');
import { mkdirSync } from 'node:fs';
mkdirSync('shots', { recursive: true });
const browser = await chromium.launch();
const errs = [];
let fails = 0;
const check = (name, ok, info = '') => { console.log((ok ? 'ok    ' : 'FAIL  ') + name + (info ? '  [' + info + ']' : '')); if (!ok) fails++; };
async function open(w, h, touch) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: touch ? 3 : 1, hasTouch: touch, isMobile: touch });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(`${w}x${h} pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(`${w}x${h} console: ${m.text()}`); });
  await page.goto('file://' + process.cwd() + '/dist/_test.html');
  await page.waitForFunction(() => window.__NW && document.fonts.status === 'loaded');
  await page.waitForTimeout(200);
  // helpers inside the page: park an enemy on a route (speed 0 unless given), road points round a pad
  await page.evaluate(() => {
    const N = window.__NW;
    window.park = (type, path, d, o = {}) => {
      const S = N.S, def = { ...N.ENEMIES[type], speed: o.speed ?? 0 }, hp = o.hp ?? 1e6;
      const e = { id: S.uid++, type, def, path, d, off: o.off ?? 0, hp, maxHp: hp, x: 0, y: 0, face: 1, cd: 0, blockers: [], seed: d, hit: 0, dead: false };
      const p = N.leadPoint(e, 0); e.x = p.x; e.y = p.y; S.enemies.push(e); return e;
    };
    window.ed = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) / 0.7);
    // a road point (route, d) whose distance from (x, y) is in [lo, hi], scanning from the gate
    window.roadAt = (x, y, lo, hi, path = 'L') => {
      const P = N.PATHS[path];
      for (let d = 0; d < P.len; d += 2) { const p = N.leadPoint({ path, d, off: 0, def: { speed: 0 } }, 0); const k = ed(p, { x, y }); if (k >= lo && k <= hi) return { d, x: p.x, y: p.y, k }; }
      return null;
    };
    window.fresh = () => { N.restart(); N.S.paused = true; N.S.gold = 99999; N.S.lives = 999; };
  });
  return page;
}

// ------------------------------------------------------------------ logic (deterministic: paused, stepped by hand)
const p = await open(1280, 720, false);
const r = await p.evaluate(() => {
  const N = window.__NW, G = N.TOWERS.garage, R = N.TOWERS.garrison, out = {};
  const PAD = 5, pad = N.PADS[PAD];

  // 1. a Garage sends out three mechanics to a rally point on the road, inside its range
  fresh(); let S = N.S;
  N.build(PAD, 'garage'); let tw = S.towers[PAD];
  N.step(4);
  out.mechs = tw.troops.map((t) => t.kind + ':' + t.maxHp);
  out.rallyIn = +ed(pad, tw.rally).toFixed(1);
  const OFF = [[-16, -6], [16, -6], [0, 10]];   // game.html trooperPost
  out.atPost = Math.max(...tw.troops.map((t, k) => Math.hypot(t.x - tw.rally.x - OFF[k][0], t.y - tw.rally.y - OFF[k][1])));

  // 2. the field: a drone (nothing blocks it) flies through at 75% speed inside the range, full speed outside;
  // a raider walking past (away from the mechanics) the same; a boss loses half as much
  const pIn = roadAt(pad.x, pad.y, 0, G.range[0] - 15, 'R'), pOut = roadAt(pad.x, pad.y, G.range[0] + 40, 9999, 'R');
  const speedOver = (e, sec = 1) => { const d0 = e.d; N.step(sec); return +((e.d - d0) / sec).toFixed(2); };
  let e = park('drone', 'R', pIn.d, { speed: 52 }); out.droneIn = speedOver(e, 0.5); e.dead = true;
  e = park('drone', 'R', 0, { speed: 52 }); out.droneOut = speedOver(e, 0.5); e.dead = true;
  for (const t of tw.troops) { t.dead = true; t.respawn = 999; }   // the mechanics out of the way: nothing blocks the raider
  e = park('raider', 'R', pIn.d, { speed: 40 }); out.raiderIn = speedOver(e, 0.5); out.raiderBlocked = e.blockers.length; e.dead = true;
  for (const t of tw.troops) t.respawn = 0;
  N.step(0.1);
  e = park('mech', 'R', pIn.d, { speed: 17 }); out.bossIn = speedOver(e, 0.5); out.bossSlowMark = e.slow; e.dead = true;
  N.upgrade(PAD); N.upgrade(PAD);
  e = park('drone', 'R', pIn.d, { speed: 52 }); out.droneIn3 = speedOver(e, 0.5); e.dead = true;
  N.step(0.1);

  // 3. the mechanics soak up hits: an enforcer they block hits for 14, a level 1 mechanic (armour 0.3) loses 9.8;
  // they hit back for little; idle, they patch themselves up
  fresh(); S = N.S;
  N.build(PAD, 'garage'); tw = S.towers[PAD];
  N.step(4);
  const near = roadAt(tw.rally.x, tw.rally.y, 0, 14, N.PATHS.L.len > 0 ? 'L' : 'R') || roadAt(tw.rally.x, tw.rally.y, 0, 14, 'R');
  const en = park('enforcer', near ? (roadAt(tw.rally.x, tw.rally.y, 0, 14, 'L') ? 'L' : 'R') : 'R', near.d);
  N.step(1.5);
  const blocker = en.blockers[0];
  out.blocked = !!blocker && blocker.kind === 'mechanic';
  const hp0 = blocker ? blocker.hp : 0;
  en.cd = 0; N.step(0.05);
  out.hitTaken = blocker ? +(hp0 - blocker.hp).toFixed(2) : null;
  const h1 = en.hp; N.step(10); out.mechDps = +((h1 - en.hp) / 10).toFixed(2);
  out.mechSrc = Math.round(S.stats.dmg.garage || 0);
  en.dead = true; N.step(0.2);
  const m = tw.troops[0]; m.hp = m.maxHp - 100; N.step(3); out.regen3s = Math.round(m.hp - (m.maxHp - 100));
  // a mechanic that falls comes back after the respawn time
  const m2 = tw.troops[1]; m2.hp = 1; const killer = park('raider', 'L', 0); m2.tower = tw;
  m2.dead = true; m2.respawn = G.respawn[0]; killer.dead = true;
  N.step(G.respawn[0] - 0.5); out.backEarly = !tw.troops[1].dead && tw.troops[1] !== m2;
  N.step(1); out.backAfter = !tw.troops[1].dead && tw.troops[1] !== m2;

  // 4. Garrison troopers: shoot a drone in reach, an armoured enforcer for full damage (energy), from the hand; still block
  fresh(); S = N.S;
  N.build(PAD, 'garrison'); tw = S.towers[PAD];
  N.step(4);
  const sky = roadAt(tw.rally.x, tw.rally.y, 40, 80, 'R') || roadAt(tw.rally.x, tw.rally.y, 40, 80, 'L');
  const dr = park('drone', 'R', sky.d);
  for (const t of tw.troops) t.cd = 0;
  let shot = null;
  for (let k = 0; k < 60 && !shot; k++) { N.step(1 / 60); shot = S.fx.find((f) => f.kind === 'laser'); }
  out.droneShot = +(dr.maxHp - dr.hp).toFixed(2);
  const shooter = shot && tw.troops.find((t) => Math.hypot(t.x + t.face * 9.5 - shot.x1, t.y - 5.5 - shot.y1) < 0.5);
  out.fromHand = !!shooter;
  dr.dead = true; N.step(0.5);
  const close = roadAt(tw.rally.x, tw.rally.y, 0, 14, 'R');
  const armd = park('enforcer', 'R', close.d);
  for (const t of tw.troops) t.cd = 9;
  N.step(1);
  const blk = armd.blockers.filter((b) => b.kind === 'trooper').length;
  out.trooperBlocks = blk;
  const t0 = tw.troops.find((t) => armd.blockers.includes(t)) || tw.troops[0];
  const before = armd.hp; t0.cd = 0; N.step(1 / 60);
  out.laserHit = +(before - armd.hp).toFixed(2); out.laserDmg = R.troopDmg[0];
  armd.dead = true; N.step(0.3);
  const outOfReach = roadAt(tw.rally.x, tw.rally.y, R.reach[0] + 60, 9999, 'L');
  const far2 = park('raider', 'L', outOfReach.d);
  for (const t of tw.troops) t.cd = 0;
  N.step(1.5); out.outOfReachHurt = +(far2.maxHp - far2.hp).toFixed(2);

  // 5. the info panel and the menu
  fresh(); S = N.S; N.build(PAD, 'garage');
  S.sel = { pad: PAD, pick: null }; N.showInfo();
  out.info = document.getElementById('info').textContent;
  out.rallyBtn = N.menuButtons().some((b) => b.kind === 'rally');
  S.sel = { pad: 2, pick: 'garage' }; N.showInfo();
  out.blurb = document.getElementById('info').textContent;
  S.sel = null; N.showInfo();
  return out;
});
console.log(JSON.stringify(r));
const G = await p.evaluate(() => window.__NW.TOWERS.garage);
check('a Garage sends out three mechanics', r.mechs.length === 3 && r.mechs.every((m) => m === 'mechanic:' + G.troopHp[0]), r.mechs.join(' '));
check('their rally point is on the road inside its range, and they reach their posts', r.rallyIn <= G.range[0] && r.atPost < 3, `${r.rallyIn} px, ${r.atPost.toFixed(1)} off`);
check('field: a drone inside the range flies at 75% speed', Math.abs(r.droneIn - 52 * (1 - G.slow[0])) < 0.2, `${r.droneIn} (52 outside: ${r.droneOut})`);
check('field: full speed outside the range', Math.abs(r.droneOut - 52) < 0.2, r.droneOut);
check('field: a walking raider inside the range is slowed too', Math.abs(r.raiderIn - 40 * (1 - G.slow[0])) < 0.2 && r.raiderBlocked === 0, `${r.raiderIn}, blockers ${r.raiderBlocked}`);
check('field: a boss loses half as much', Math.abs(r.bossIn - 17 * (1 - G.slow[0] / 2)) < 0.1, `${r.bossIn} (mark ${r.bossSlowMark})`);
check('field: level 3 slows 35%', Math.abs(r.droneIn3 - 52 * (1 - G.slow[2])) < 0.2, r.droneIn3);
check('mechanics block (an enforcer)', r.blocked);
check('mechanics soak up hits: armour 0.3 takes an enforcer hit of 14 down to 9.8', Math.abs(r.hitTaken - 14 * (1 - G.troopArmor[0])) < 0.01, r.hitTaken);
check('mechanics deal little damage (three of them: under 6 a second on an enforcer, armour 0.5)', r.mechDps > 0 && r.mechDps < 6, `${r.mechDps}/s, src garage ${r.mechSrc}`);
check('idle mechanics patch themselves up (12 HP/s)', r.regen3s >= 30 && r.regen3s <= 37, r.regen3s);
check('a fallen mechanic comes back after its respawn time', !r.backEarly && r.backAfter, `${r.backEarly} -> ${r.backAfter}`);
check('troopers shoot a drone in reach', r.droneShot > 0, r.droneShot);
check('the laser leaves the trooper\'s hand', r.fromHand);
check('troopers still block', r.trooperBlocks >= 1, r.trooperBlocks);
check('a laser hits an armoured enforcer for its full damage (energy)', r.laserHit === r.laserDmg, `${r.laserHit} of ${r.laserDmg}`);
check('troopers don\'t shoot past their reach', r.outOfReachHurt === 0, r.outOfReachHurt);
check('info panel: Garage stats', /GARAGE · LEVEL 1/.test(r.info) && /25% slower/.test(r.info), r.info);
check('info panel: Garage blurb when picked', /GARAGE · 100 SCRAP/.test(r.blurb), r.blurb);
check('a Garage has a Rally button', r.rallyBtn);

// ------------------------------------------------------------------ close-up: both towers in a fight
const scene = async (q, cam) => q.evaluate((cam) => {
  const N = window.__NW; N.start(); fresh(); N.resize(); const S = N.S;
  N.build(5, 'garage'); N.upgrade(5);
  N.build(4, 'garrison'); N.upgrade(4);
  N.step(4);
  const add = (t, path, d, off) => park(t, path, d, { speed: N.ENEMIES[t].speed, hp: N.ENEMIES[t].hp * 8, off });
  // the left road past the Garrison, the shared road past the Garage
  add('raider', 'L', 560, -0.4); add('scout', 'L', 520, 0.5); add('enforcer', 'L', 470, -0.2); add('drone', 'L', 540, 0); add('raider', 'L', 430, 0.6);
  add('enforcer', 'R', 820, 0.3); add('raider', 'R', 790, -0.5); add('raider', 'R', 760, 0.4); add('scout', 'R', 730, -0.2); add('drone', 'R', 800, 0);
  N.step(3.2);
  for (let k = 0; k < 120 && !S.fx.some((f) => f.kind === 'laser' && f.life > 0.07); k++) N.step(1 / 60);
  if (cam) { N.CAM.s = cam.s; N.CAM.x = cam.x; N.CAM.y = cam.y; }
  return { lasers: S.fx.filter((f) => f.kind === 'laser').length, slowed: S.enemies.filter((e) => e.slow > 0).length, fighting: S.troops.filter((t) => t.kind === 'mechanic' && t.target).length };
}, cam);
const s1 = await scene(p, { s: 2.3, x: 590, y: 470 });
await p.waitForTimeout(300);
check('close-up scene: lasers in flight, enemies slowed, mechanics fighting', s1.lasers >= 1 && s1.slowed >= 2 && s1.fighting >= 1, JSON.stringify(s1));
await p.screenshot({ path: 'shots/22-garage.png' });
await p.evaluate(() => { const N = window.__NW; N.CAM.x = 400; N.CAM.y = 160; });
await p.waitForTimeout(200);
await p.screenshot({ path: 'shots/22b-garrison.png' });
const s2 = await scene(p, null);
await p.waitForTimeout(300);
await p.screenshot({ path: 'shots/23-garage-desktop.png' });
const q = await open(844, 390, true);
const s3 = await scene(q, null);
await q.evaluate(() => { const N = window.__NW; N.CAM.x = 420; N.CAM.y = 160; });
await q.waitForTimeout(300);
await q.screenshot({ path: 'shots/24-garage-phone.png' });
check('default-camera shots: the fight is on', s2.slowed >= 1 && s3.slowed >= 1, JSON.stringify([s2, s3]));

console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
console.log(fails ? `${fails} FAILED` : 'all garage checks ok');
await browser.close();
process.exit(fails || errs.length ? 1 : 0);

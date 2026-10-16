// Dragon tower checks: fire patches burn over time, never stack, at most 3 per dragon, burn ignores armour,
// afterburn, the lob leads its target and prefers enemies not on fire, drones and troopers are never hurt, restart
// clears everything, 2x speed; with the real art the head faces its target and the glob leaves the mouth
// (shots/16-dragon-aim.png); selling puts the fire out; the five-button build menu and the info panel on desktop, phones
// and short landscape screens (shots/13-15, 19-21); the fire at the game's default camera (shots/17 desktop, 18 phone),
// and a 2.3x close-up of it (shots/12-dragon.png). Run after build.py: node dragon-test.mjs
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
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
  // helpers inside the page: park an enemy on a route (speed 0 unless given), find the road point nearest a pad
  await page.evaluate(() => {
    const N = window.__NW;
    window.park = (type, path, d, o = {}) => {
      const S = N.S, def = { ...N.ENEMIES[type], speed: o.speed ?? 0 }, hp = o.hp ?? 1e6;
      const e = { id: S.uid++, type, def, path, d, off: o.off ?? 0, hp, maxHp: hp, x: 0, y: 0, face: 1, cd: 0, blockers: [], seed: d, hit: 0, dead: false };
      const p = N.leadPoint(e, 0); e.x = p.x; e.y = p.y; S.enemies.push(e); return e;
    };
    window.roadNear = (i, path = 'L') => {
      const pad = N.PADS[i], P = N.PATHS[path]; let best = null;
      for (let d = 0; d < P.len; d += 4) { const e = { path, d, off: 0, def: { speed: 0 } }; const p = N.leadPoint(e, 0); const k = Math.hypot(p.x - pad.x, (p.y - pad.y) / 0.7); if (!best || k < best.k) best = { d, k, x: p.x, y: p.y }; }
      return best;
    };
    window.fresh = () => { N.restart(); N.S.paused = true; N.S.gold = 99999; N.S.lives = 999; };
  });
  return page;
}

// ------------------------------------------------------------------ logic (deterministic: paused, stepped by hand)
const p = await open(1280, 720, false);
await p.mouse.click(5, 300);   // a real pointerdown starts the synth (paused: the tap does nothing else), so spit/sizzle play below
const r = await p.evaluate(() => {
  const N = window.__NW, T = N.TOWERS.dragon, out = {};
  const stepUntil = (fn, max = 10) => { for (let t = 0; t < max; t += 1 / 60) { if (fn()) return t; N.step(1 / 60); } return -1; };
  const own = (tw) => N.S.patches.filter((q) => q.owner === tw.id);

  // 1. a lob lands, splashes, leaves a patch that burns for its duration, then 1 s of afterburn at half rate
  fresh(); let S = N.S;
  N.build(2, 'dragon'); let tw = S.towers[2];
  const spot = roadNear(2, 'L');
  const a = park('raider', 'L', spot.d);
  const before = a.hp;
  out.landT = +stepUntil(() => S.patches.length > 0).toFixed(2);
  out.impact = +(before - a.hp).toFixed(2);
  tw.cd = 999;                                     // no more lobs: measure the patch alone
  const p0 = S.patches[0]; out.patchR = p0.r; out.patchDur = p0.max;
  let h = a.hp; N.step(1); out.burn1s = +(h - a.hp).toFixed(2);
  h = a.hp; const tEnd = stepUntil(() => S.patches.length === 0); out.restOfPatch = +(h - a.hp).toFixed(2); out.patchLived = +(1 + tEnd).toFixed(2);
  out.scorch = S.decals.filter((d) => d.scorch).length;
  out.burningAfter = a.burnT > 0 && !a.inFire;
  h = a.hp; N.step(1.2); out.afterburn = +(h - a.hp).toFixed(2); out.burnStopped = !(a.burnT > 0);
  h = a.hp; N.step(1); out.afterAll = +(h - a.hp).toFixed(2);

  // 2. armour does not matter: an Enforcer (50% armour) burns at the same rate
  fresh(); S = N.S;
  const en = park('enforcer', 'L', spot.d), ra = park('raider', 'R', 200);
  S.patches.push(N.makePatch(1, en.x, en.y, 30, T.burn[0], 50));
  N.step(1 / 60); h = en.hp; N.step(1); out.enforcerBurn = +(h - en.hp).toFixed(2);

  // 3. no stacking: three patches on one spot (the three levels) burn at the strongest rate, two equal ones at one rate
  fresh(); S = N.S;
  const b = park('raider', 'L', spot.d);
  for (const dps of T.burn) S.patches.push(N.makePatch(100 + dps, b.x, b.y, 30, dps, 50));
  N.step(1 / 60); h = b.hp; N.step(1); out.stack3 = +(h - b.hp).toFixed(2);
  S.patches = [N.makePatch(1, b.x, b.y, 30, T.burn[0], 50), N.makePatch(2, b.x + 4, b.y, 30, T.burn[0], 50)];
  N.step(1 / 60); h = b.hp; N.step(1); out.stack2 = +(h - b.hp).toFixed(2);

  // 4. at most 3 live patches per dragon: fire it 12 times quickly at a column of enemies
  fresh(); S = N.S;
  N.build(2, 'dragon'); tw = S.towers[2]; N.upgrade(2); N.upgrade(2);
  for (let k = -3; k <= 3; k++) park('raider', 'L', spot.d + k * 22, { off: (k % 2) * 0.6 });
  let maxOwn = 0, lobs = 0, lastG = null; const soot = new Set();
  for (let n = 0; n < 12; n++) {
    tw.cd = 0;
    for (let s = 0; s < 42; s++) {
      N.step(1 / 60); maxOwn = Math.max(maxOwn, own(tw).length); for (const d of S.decals) if (d.scorch) soot.add(d);
      const g = S.globs[S.globs.length - 1]; if (g && g !== lastG) { lobs++; lastG = g; }
    }
  }
  N.step(1); maxOwn = Math.max(maxOwn, own(tw).length);
  out.maxOwn = maxOwn; out.ownNow = own(tw).length; out.lobs = lobs; out.scorch4 = soot.size; out.sootLeft = S.decals.filter((d) => d.scorch).length;
  out.sootSoft = [...soot].every((d) => d.spr && d.max <= 4 && d.r <= d.spr.w);
  // a second dragon gets its own 3
  N.build(0, 'dragon'); const tw2 = S.towers[0]; N.upgrade(0); N.upgrade(0);
  for (let n = 0; n < 6; n++) { tw.cd = 0; tw2.cd = 0; N.step(0.7); }
  out.twoDragons = [own(tw).length, own(tw2).length, S.patches.length];

  // 5. drones and troopers are never hurt; the dragon never lobs at a drone
  fresh(); S = N.S;
  N.build(2, 'dragon'); tw = S.towers[2];
  const dr = park('drone', 'L', spot.d);
  N.step(4); out.droneOnlyLobs = S.globs.length + S.patches.length;
  N.castSquad(spot.x, spot.y); N.step(0.6);
  const mercs = S.troops.filter((t) => t.kind === 'merc');
  S.patches.push(N.makePatch(1, spot.x, spot.y, 42, 26, 50));
  for (const m of mercs) { m.hp = m.maxHp - 20; }                  // hurt a little: regen only when idle; fire must not add damage
  const mh = mercs.map((m) => m.hp);
  N.build(0, 'garrison'); const gar = S.towers[0]; N.setRally(0, spot.x, spot.y);
  N.step(3);
  out.droneHurt = +(dr.maxHp - dr.hp).toFixed(2); out.droneBurning = !!(dr.burnT > 0);
  out.mercsHurt = mercs.some((m, k) => m.hp < mh[k] - 0.01); out.mercsInFire = mercs.filter((m) => Math.hypot(m.x - spot.x, (m.y - spot.y) / 0.7) < 42).length;
  out.troopersHurt = gar.troops.some((t) => t.hp < t.maxHp); out.troopersInFire = gar.troops.filter((t) => Math.hypot(t.x - spot.x, (t.y - spot.y) / 0.7) < 42).length;

  // 6. the lob leads a walking enemy: the glob lands where it walks to
  fresh(); S = N.S;
  N.build(2, 'dragon'); tw = S.towers[2];
  const w = park('raider', 'L', spot.d - 90, { speed: 40, off: 0.5 });
  stepUntil(() => S.globs.length > 0);
  const g = S.globs[0]; let miss = null;
  stepUntil(() => { if (!S.globs.length) { miss = Math.hypot(w.x - g.x1, (w.y - g.y1) / 0.7); return true; } return false; });
  out.leadMiss = +miss.toFixed(2); out.walkerInFire = w.inFire;
  // ...and prefers an enemy that is not on fire: the leader stands in a patch, the next one does not
  fresh(); S = N.S;
  N.build(2, 'dragon'); tw = S.towers[2];
  const lead = park('raider', 'L', spot.d + 20), back = park('raider', 'L', spot.d - 40);
  S.patches.push(N.makePatch(1, lead.x, lead.y, 30, 12, 50));
  out.prefers = N.dragonTarget(tw, T.range[0]) === back ? 'unburnt' : 'burning';
  S.patches = []; out.plain = N.dragonTarget(tw, T.range[0]) === lead ? 'closest to HQ' : 'other';

  // 7. fire kills give the bounty
  fresh(); S = N.S;
  const weak = park('raider', 'L', spot.d, { hp: 20 }); const g1 = S.gold;
  S.patches.push(N.makePatch(1, weak.x, weak.y, 30, N.TOWERS.dragon.burn[0], 50));
  N.step(2.5); out.killGold = S.gold - g1; out.kills = S.stats.kills;

  // 8. restart clears patches, globs, burning
  fresh(); S = N.S;
  N.build(2, 'dragon'); park('raider', 'L', spot.d);
  stepUntil(() => S.patches.length > 0); N.step(0.3); tw = S.towers[2]; tw.cd = 0; N.step(0.2);
  out.beforeRestart = [S.patches.length, S.globs.length, S.enemies.filter((e) => e.burnT > 0).length];
  N.restart();
  out.afterRestart = [N.S.patches.length, N.S.globs.length, N.S.enemies.length, N.S.decals.length];

  // 9. selling a dragon puts out its fire (live patches and globs in flight), so sell/rebuild can't stack patches on a pad
  fresh(); S = N.S;
  N.build(2, 'dragon'); N.upgrade(2); N.upgrade(2); tw = S.towers[2];
  for (let k = -3; k <= 3; k++) park('raider', 'L', spot.d + k * 22, { off: (k % 2) * 0.6 });
  for (let n = 0; n < 3; n++) { tw.cd = 0; N.step(0.7); }
  tw.cd = 0; stepUntil(() => S.globs.length > 0, 1);
  const other = N.makePatch(77, spot.x + 300, spot.y, 30, 18, 50); S.patches.push(other);   // another dragon's patch stays
  out.beforeSell = [own(tw).length, S.globs.filter((g) => g.owner === tw.id).length];
  N.sell(2); N.step(0.7);
  out.afterSell = [S.patches.filter((q) => q.owner === tw.id).length, S.globs.length, S.patches.includes(other) ? 1 : 0];
  let maxPad = 0;
  for (let n = 0; n < 4; n++) {   // sell and rebuild four times, lobbing between: never more than 3 patches from pad 2
    N.build(2, 'dragon'); const t2 = S.towers[2];
    for (let k = 0; k < 4; k++) { t2.cd = 0; for (let s = 0; s < 42; s++) { N.step(1 / 60); maxPad = Math.max(maxPad, S.patches.filter((q) => q.owner !== 77).length); } }
    N.sell(2);
  }
  out.maxPad = maxPad;
  return out;
});
console.log(JSON.stringify(r));
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const D = await p.evaluate(() => window.__NW.TOWERS.dragon);
const T = { burn: D.burn, life: D.patchLife, r: D.patchR, dmg: D.dmg };
console.log('dragon numbers:', JSON.stringify(T));
check('lob lands about 0.6 s after the first shot (cd 0.5)', near(r.landT, 1.1, 0.05), r.landT + 's');
check('impact splash deals the level 1 damage', near(r.impact, T.dmg[0], 0.6), r.impact);
check('patch radius and duration (level 1)', r.patchR === T.r[0] && r.patchDur === T.life[0], `${r.patchR}, ${r.patchDur}s`);
check(`patch burns ${T.burn[0]}/s`, near(r.burn1s, T.burn[0], 0.3), r.burn1s + '/s');
check('patch keeps burning for its whole duration', near(r.restOfPatch, T.burn[0] * (T.life[0] - 1), 1), r.restOfPatch);
check('patch ends after its duration', near(r.patchLived, T.life[0], 0.05), r.patchLived + 's');
check('ended patch leaves a scorch mark', r.scorch === 1, r.scorch);
check('afterburn: 1 s at half rate after the fire', r.burningAfter && near(r.afterburn, T.burn[0] / 2, 0.3) && r.burnStopped, r.afterburn);
check('no burning after the afterburn', r.afterAll === 0, r.afterAll);
check('burn ignores armour (Enforcer 50%)', near(r.enforcerBurn, T.burn[0], 0.3), r.enforcerBurn + '/s');
check(`no stacking: ${T.burn.join(' + ')} patches burn at ${T.burn[2]}/s`, near(r.stack3, T.burn[2], 0.5), r.stack3 + '/s');
check(`no stacking: two ${T.burn[0]}/s patches burn at ${T.burn[0]}/s`, near(r.stack2, T.burn[0], 0.3), r.stack2 + '/s');
check('max 3 live patches per dragon', r.maxOwn === 3 && r.ownNow === 3 && r.lobs >= 10, `max ${r.maxOwn}, now ${r.ownNow}, lobs ${r.lobs}`);
check('every put-out patch leaves a soft scorch mark (gone after 3.5 s)', r.scorch4 >= r.lobs - 3 && r.sootSoft, `${r.scorch4} marks for ${r.lobs} lobs, ${r.sootLeft} still showing`);
check('each dragon keeps its own 3', r.twoDragons[0] === 3 && r.twoDragons[1] === 3 && r.twoDragons[2] === 6, r.twoDragons.join('/'));
check('the dragon never lobs at a drone', r.droneOnlyLobs === 0, r.droneOnlyLobs);
check('drones are not hurt by fire', r.droneHurt === 0 && !r.droneBurning, r.droneHurt);
check('squad mercs in the fire are not hurt', !r.mercsHurt && r.mercsInFire > 0, `in fire ${r.mercsInFire}`);
check('garrison troopers in the fire are not hurt', !r.troopersHurt && r.troopersInFire > 0, `in fire ${r.troopersInFire}`);
check('the lob leads a walking enemy', r.leadMiss < 4 && r.walkerInFire, `lands ${r.leadMiss} from it`);
check('prefers an enemy not on fire', r.prefers === 'unburnt' && r.plain === 'closest to HQ', `${r.prefers}, ${r.plain}`);
check('fire kills pay the bounty', r.killGold > 0 && r.kills === 1, `+${r.killGold}`);
check('selling a dragon puts out its patches and globs', r.beforeSell[0] === 3 && r.beforeSell[1] === 1 && r.afterSell[0] === 0 && r.afterSell[1] === 0 && r.afterSell[2] === 1, `${r.beforeSell} -> ${r.afterSell}`);
check('sell/rebuild never leaves more than 3 patches on a pad', r.maxPad === 3, 'max ' + r.maxPad);
check('restart clears patches, globs and burning', r.beforeRestart[0] > 0 && r.afterRestart.every((n) => n === 0), `${r.beforeRestart} -> ${r.afterRestart}`);

// ------------------------------------------------------------------ 2x speed in the real game loop
const sp = await p.evaluate(async () => {
  const N = window.__NW; fresh(); const S = N.S;
  N.start(); S.speed = 2;
  const spot = roadNear(2, 'L');
  const e = park('raider', 'L', spot.d);
  S.patches.push(N.makePatch(1, e.x, e.y, 30, N.TOWERS.dragon.burn[0], 600));
  const t0 = S.t, h0 = e.hp, w0 = performance.now();
  await new Promise((res) => setTimeout(res, 1500));
  const gameT = S.t - t0, wall = (performance.now() - w0) / 1000, lost = h0 - e.hp;
  S.paused = true; S.speed = 1;
  return { ratio: gameT / wall, perGameSecond: lost / gameT, age: S.patches[0] ? S.patches[0].age : -1, gameT };
});
check('2x speed: game time runs twice as fast', sp.ratio > 1.6 && sp.ratio < 2.2, sp.ratio.toFixed(2) + 'x');
check(`2x speed: patch burns ${T.burn[0]} per game second`, near(sp.perGameSecond, T.burn[0], 0.6), sp.perGameSecond.toFixed(2));
check('2x speed: patch ages in game time', near(sp.age, sp.gameT, 0.1), `${sp.age.toFixed(2)} vs ${sp.gameT.toFixed(2)}`);

// ------------------------------------------------------------------ info panel
const info = await p.evaluate(() => {
  const N = window.__NW; fresh(); const S = N.S; N.build(2, 'dragon');
  S.sel = { pad: 2, pick: null }; N.showInfo(); const a = document.getElementById('info').textContent;
  S.sel = null; S.towers[2] = null; S.sel = { pad: 2, pick: 'dragon' }; N.showInfo(); const b = document.getElementById('info').textContent;
  S.sel = null; N.showInfo(); return [a, b];
});
check('info panel: dragon stats', info[0].includes(`burns ${T.burn[0]}/s for ${T.life[0]}s`) && info[0].includes(`Upgrade 150 (${T.burn[1]}/s, ${T.life[1]}s)`), info[0]);
check('info panel: dragon blurb when picked', /DRAGON · 110 SCRAP/.test(info[1]), info[1]);

// ------------------------------------------------------------------ the real art: the head turns to its target, the glob leaves the mouth
// Two dragons spit at once: pad 0 at a raider on the road to its left, pad 2 at one to its right (each out of the other's range).
const aim = await p.evaluate(() => {
  const N = window.__NW; fresh(); const S = N.S, H = N.TOWERS.dragon.head;
  N.build(0, 'dragon'); N.build(2, 'dragon');
  const roadSide = (i, sgn) => {   // the road point in range of pad i furthest to one side of it
    const pad = N.PADS[i], P = N.PATHS.L; let best = null;
    for (let d = 0; d < P.len; d += 3) {
      const q = N.leadPoint({ path: 'L', d, off: 0, def: { speed: 0 } }, 0);
      if (Math.hypot(q.x - pad.x, (q.y - pad.y) / 0.7) > 190) continue;
      if (!best || sgn * (q.x - pad.x) > sgn * (best.x - pad.x)) best = { d, x: q.x, y: q.y };
    }
    return best;
  };
  const L = park('raider', 'L', roadSide(0, -1).d), R = park('raider', 'L', roadSide(2, 1).d);
  const out = [];
  for (let k = 0; k < 120 && S.globs.length < 2; k++) N.step(1 / 60);
  N.step(2 / 60);   // just after the spit: head reared, glob leaving the mouth
  for (const [i, tg] of [[0, L], [2, R]]) {
    const tw = S.towers[i], pad = N.PADS[i], g = S.globs.find((q) => q.owner === tw.id);
    const m = N.mouthAt(tw), pivX = pad.x + (H.pivot[0] - 256) * 0.23;
    out.push({ pad: i, targetSide: Math.sign(tg.x - pad.x), mouthSide: Math.sign(m[0] - pivX), flip: tw.flip,
      fromMouth: g ? +Math.hypot(g.x0 - m[0], g.y0 - m[1]).toFixed(2) : -1, rear: +N.headPose(tw).ang.toFixed(3) });
  }
  N.CAM.s = 2.3; N.CAM.x = 503 - innerWidth / 2.3 / 2; N.CAM.y = 250 - innerHeight / 2.3 / 2 - 40;
  return out;
});
for (const a of aim) {
  check(`pad ${a.pad}: the head faces its target (${a.targetSide < 0 ? 'left' : 'right'})`, a.targetSide !== 0 && a.mouthSide === a.targetSide, `flip ${a.flip}`);
  check(`pad ${a.pad}: the glob leaves the dragon's mouth`, a.fromMouth >= 0 && a.fromMouth < 2.5, a.fromMouth + ' px');
  check(`pad ${a.pad}: the head rears nose-up when it spits`, a.rear * a.targetSide < 0, 'tilt ' + a.rear);
}
await p.waitForTimeout(120);
await p.screenshot({ path: 'shots/16-dragon-aim.png' });

// ------------------------------------------------------------------ zoomed screenshot of the fire
await p.evaluate(() => {
  const N = window.__NW; fresh(); const S = N.S;
  N.build(0, 'dragon'); N.upgrade(0); N.upgrade(0);
  N.build(2, 'garrison'); N.upgrade(2); N.setRally(2, 560, 250);
  const add = (t, d, off) => { const e = park(t, 'L', d, { speed: N.ENEMIES[t].speed, hp: N.ENEMIES[t].hp * 6, off }); return e; };
  add('raider', 452, -0.5); add('enforcer', 430, 0.4); add('raider', 405, 0.7); add('scout', 380, -0.6); add('raider', 352, 0.1);
  add('enforcer', 322, -0.3); add('raider', 290, 0.5); add('raider', 262, -0.7); add('drone', 400, 0);
  N.step(6.2);
  for (let k = 0; k < 300 && !(S.globs.length && S.globs[0].t > 0.3); k++) N.step(1 / 60);   // catch a glob mid-flight
  N.CAM.s = 2.3; N.CAM.x = 236; N.CAM.y = 46;
});
await p.waitForTimeout(300);
const scene = await p.evaluate(() => { const S = window.__NW.S; return { patches: S.patches.length, globs: S.globs.length, burning: S.enemies.filter((e) => e.burnT > 0).length, alive: S.enemies.length }; });
check('screenshot scene: patches burning with enemies in them', scene.patches >= 2 && scene.burning >= 2, JSON.stringify(scene));
await p.screenshot({ path: 'shots/12-dragon.png' });   // close-up (2.3x is above the game's max zoom): judge the effects from 17 and 18

// ------------------------------------------------------------------ the fire at the default camera (what players see)
// 1280x720 (CAM 0.77) and an 844x390 phone at 3x (CAM 0.50): a level 3 dragon on pad 0 and pad 2, a column of enemies, a glob in flight
const fireScene = async (q) => q.evaluate(() => {
  const N = window.__NW; N.start(); fresh(); N.resize(); const S = N.S;   // start(): close the title screen on a newly opened page
  N.build(0, 'dragon'); N.upgrade(0); N.upgrade(0); N.build(2, 'dragon'); N.upgrade(2);
  N.build(1, 'plasma'); N.build(3, 'sniper');
  const add = (t, d, off) => park(t, 'L', d, { speed: N.ENEMIES[t].speed, hp: N.ENEMIES[t].hp * 8, off });
  add('raider', 470, -0.5); add('enforcer', 440, 0.4); add('raider', 410, 0.7); add('scout', 385, -0.6); add('raider', 352, 0.1);
  add('enforcer', 322, -0.3); add('raider', 290, 0.5); add('raider', 262, -0.7); add('raider', 230, 0.2); add('drone', 400, 0);
  N.step(5.5);
  for (let k = 0; k < 300 && !(S.globs.length && S.globs[0].t > 0.3); k++) N.step(1 / 60);
  return { cam: +N.CAM.s.toFixed(2), patches: S.patches.length, globs: S.globs.length, burning: S.enemies.filter((e) => e.burnT > 0).length };
});
{
  const s1 = await fireScene(p); await p.waitForTimeout(250); await p.screenshot({ path: 'shots/17-dragon-desktop.png' });
  check('default-camera shot (1280x720): patches and a glob in flight', s1.patches >= 2 && s1.globs >= 1 && Math.abs(s1.cam - 0.77) < 0.02, JSON.stringify(s1));
  const ph = await open(844, 390, true);
  const s2 = await fireScene(ph); await ph.waitForTimeout(250); await ph.screenshot({ path: 'shots/18-dragon-phone.png' });
  check('default-camera shot (844x390 @3x): patches and a glob in flight', s2.patches >= 2 && s2.globs >= 1 && Math.abs(s2.cam - 0.5) < 0.02, JSON.stringify(s2));
}

// ------------------------------------------------------------------ build menu: five buttons, every pad, phones
// Short landscape screens (Chrome on Android with its address bar is about 300 px tall) and portrait phones included.
// On every pad, before a pick, with each pick, and on a built tower's menu: buttons on screen, apart, not under the HUD
// or the info panel; and the info panel never covers the HUD (the SQUAD button in portrait).
for (const [w, h, touch, shot] of [[1280, 720, false, '15-menu-desktop'], [844, 390, true, '13-menu-phone'], [640, 360, true, ''], [740, 300, true, '19-menu-short'],
  [740, 320, true, ''], [568, 320, true, '20-menu-568'], [390, 844, true, '14-menu-portrait'], [360, 640, true, '21-menu-360']]) {
  const q = shot || touch || w !== 1280 ? await open(w, h, touch) : p;
  const res = await q.evaluate(() => {
    const N = window.__NW; fresh(); N.start(); N.S.paused = true;
    const hud = ['.hud.tl', '.hud.tr', '.hud.bl'].map((s) => document.querySelector(s).getBoundingClientRect());
    const VW = innerWidth, VH = innerHeight, bad = [];
    const over = (a, R) => R.width && a.l < R.right && a.r > R.left && a.t < R.bottom && a.b > R.top;
    for (let i = 0; i < N.PADS.length; i++) {
      for (const pick of [null, 'dragon', 'sniper', 'railgun', 'garrison', 'built']) {
        N.S.towers[i] = null;
        if (pick === 'built') { N.build(i, 'dragon'); N.S.sel = { pad: i, pick: null }; } else N.S.sel = { pad: i, pick };
        N.showInfo();
        const info = document.getElementById('info').getBoundingClientRect();
        const B = N.menuButtons(), tag = `pad ${i} ${pick || 'none'}`;
        if (pick !== 'built' && B.length !== 5) bad.push(`${tag}: ${B.length} buttons`);
        for (const b of B) {
          const name = b.tower || b.kind;
          const box = { l: b.x - b.r, r: b.x + b.r, t: b.y - b.r - (b.tower === pick || b.tower === 'dragon' ? 16 : 0), b: b.y + b.r + (b.cost != null ? 10 : 0) };
          if (box.l < 0 || box.r > VW || box.t < 0 || box.b > VH) bad.push(`${tag} ${name} off screen`);
          for (const [k, R] of [...hud, info].entries()) if (over(box, R)) bad.push(`${tag} ${name} under ${['hud-tl', 'hud-tr', 'spells', 'info'][k]}`);
          for (const o of B) if (o !== b && Math.hypot(o.x - b.x, o.y - b.y) < 2 * b.r + 12) bad.push(`${tag} ${name}/${o.tower || o.kind} too close`);
        }
        const ib = { l: info.left, r: info.right, t: info.top, b: info.bottom };
        for (const [k, R] of hud.entries()) if (info.width && over(ib, R)) bad.push(`${tag} info covers ${['hud-tl', 'hud-tr', 'spells'][k]}`);
        if (info.width && (info.left < 0 || info.right > VW || info.top < 0 || info.bottom > VH)) bad.push(`${tag} info off screen`);
      }
      N.S.towers[i] = null;
    }
    N.S.sel = null; N.showInfo();
    return bad;
  });
  check(`menu ${w}x${h}: buttons on screen, apart, clear of the HUD and the info panel on every pad`, res.length === 0, res.slice(0, 4).join('; ') + (res.length > 4 ? ` (+${res.length - 4})` : ''));
  if (shot) {
    // real taps: open pad 2, pick the dragon, tap again to build
    const tapAt = async (x, y) => { if (touch) await q.touchscreen.tap(x, y); else await q.mouse.click(x, y); await q.waitForTimeout(80); };
    await q.evaluate(() => { const N = window.__NW; N.S.paused = false; N.CAM.x = Math.max(0, N.PADS[2].x - innerWidth / N.CAM.s / 2); });
    await q.waitForTimeout(50);
    const [px, py] = await q.evaluate(() => window.__NW.toScreen(window.__NW.PADS[2].x, window.__NW.PADS[2].y));
    await tapAt(px, py);
    const [bx, by] = await q.evaluate(() => { const b = window.__NW.menuButtons().find((m) => m.tower === 'dragon'); return b ? [b.x, b.y] : [0, 0]; });
    await tapAt(bx, by);
    const picked = await q.evaluate(() => window.__NW.S.sel && window.__NW.S.sel.pick);
    await q.waitForTimeout(150);
    await q.screenshot({ path: `shots/${shot}.png` });
    await tapAt(bx, by);
    const built = await q.evaluate(() => window.__NW.S.towers[2] && window.__NW.S.towers[2].kind);
    check(`menu ${w}x${h}: tap pad, tap Dragon, tap again builds it`, picked === 'dragon' && built === 'dragon', `${picked} -> ${built}`);
  }
}

console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
console.log(fails ? `${fails} FAILED` : 'all dragon checks ok');
await browser.close();
process.exit(fails || errs.length ? 1 : 0);

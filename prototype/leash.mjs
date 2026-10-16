// Leash test: troopers must stay inside their tower's range and near their rally point.
// Playwright: $PLAYWRIGHT (path to its index.mjs) or the cloud workspace's copy.
const { chromium } = await import(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs');
const browser = await chromium.launch();
const page = await browser.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('file://' + process.cwd() + '/dist/_test.html');
await page.waitForFunction(() => window.__NW);
const r = await page.evaluate(() => {
  const N = window.__NW; N.start(); const S = N.S; S.gold = 99999; S.lives = 9999;
  for (let i = 0; i < N.PADS.length; i++) N.build(i, 'garrison');
  const SQ = 0.7, ed = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) / SQ);
  const rally0 = S.towers.map((tw) => +ed(N.PADS[tw.i], tw.rally).toFixed(0));
  N.startWave(); S.spawning = [];
  const add = (t, g, d) => { const def = N.ENEMIES[t]; S.enemies.push({ id: S.uid++, type: t, def, path: g, d, off: Math.random() * 2 - 1, hp: def.hp * 3, maxHp: def.hp * 3, x: 0, y: 0, face: 1, cd: 0, blockers: [], seed: d, hit: 0, dead: false }); };
  let maxTower = 0, maxRally = 0, engaged = 0;
  for (let t = 0; t < 60; t += 0.25) {
    if (Math.round(t * 4) % 6 === 0) { add('scout', 'L', 0); add('scout', 'R', 0); }
    if (Math.round(t * 4) % 20 === 0) { add('enforcer', 'L', 0); add('enforcer', 'R', 0); }
    N.step(0.25);
    for (const tr of S.troops) {
      if (tr.dead || tr.kind !== 'trooper') continue;
      const tw = tr.tower;
      maxTower = Math.max(maxTower, ed(N.PADS[tw.i], tr) - N.TOWERS.garrison.range[tw.lvl]);
      if (tr.target && Math.hypot(tr.x - tr.target.x, tr.y - tr.target.y) < 36) { engaged++; maxRally = Math.max(maxRally, ed(tw.rally, tr)); }
    }
  }
  return { rally0, range: N.TOWERS.garrison.range[0], beyondTowerRange: +maxTower.toFixed(1), maxFromRallyInMelee: +maxRally.toFixed(1), engaged, leaked: S.stats.leaked };
});
console.log(JSON.stringify(r));
console.log(errs.length ? errs.join('\n') : 'no errors');
await browser.close();

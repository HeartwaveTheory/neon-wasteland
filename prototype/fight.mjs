// Visual check: a zoomed fight on the left road with every unit type on screen.
// Playwright: $PLAYWRIGHT (path to its index.mjs) or the cloud workspace's copy.
const { chromium } = await import(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('file://' + process.cwd() + '/dist/_test.html');
await page.waitForFunction(() => window.__NW && document.fonts.status === 'loaded');
await page.evaluate(() => {
  const N = window.__NW; N.start(); const S = N.S; S.gold = 9999; S.lives = 999;
  N.build(0, 'sniper'); N.build(2, 'garrison'); N.build(1, 'plasma'); N.upgrade(2);
  N.setRally(2, 520, 255);
  N.startWave(); S.spawning = [];
  const add = (t, d, g = 'L', off = 0) => { const def = N.ENEMIES[t]; S.enemies.push({ id: 9000 + d, type: t, def, path: g, d, off, hp: def.hp * 0.8, maxHp: def.hp, x: 0, y: 0, face: 1, cd: 0, blockers: [], seed: d, hit: 0, dead: false }); };
  add('raider', 470, 'L', -0.5); add('enforcer', 440, 'L', 0.5); add('scout', 400, 'L', -0.8); add('raider', 360, 'L', 0.7);
  add('drone', 420, 'L', 0); add('mech', 300, 'L', 0); add('scout', 520, 'L', 0.4);
  N.step(2.2);
  N.CAM.s = 2.2; N.CAM.x = 250; N.CAM.y = 140;
});
await page.waitForTimeout(400);
await page.screenshot({ path: 'shots/11-fight.png' });
console.log(errs.length ? errs.join('\n') : 'no errors');
await browser.close();

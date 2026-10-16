// Visual check: a crowd of every enemy type walking both routes with no towers in the way.
// Playwright: $PLAYWRIGHT (path to its index.mjs) or the cloud workspace's copy.
const { chromium } = await import(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('file://' + process.cwd() + '/dist/_test.html');
await page.waitForFunction(() => window.__NW && document.fonts.status === 'loaded');
await page.evaluate(() => {
  const N = window.__NW; N.start(); const S = N.S; S.lives = 999;
  S.spawning = [];
  N.startWave(); S.spawning = [];
  const kinds = ['raider', 'scout', 'enforcer', 'drone', 'raider', 'raider', 'enforcer', 'scout'];
  for (let k = 0; k < 40; k++) {
    for (const g of ['L', 'R']) {
      const e = { id: 5000 + k * 2 + (g === 'L' ? 0 : 1), type: kinds[k % kinds.length], def: N.ENEMIES[kinds[k % kinds.length]], path: g, d: k * 28, off: Math.random() * 2 - 1, hp: 50, maxHp: 60, x: 0, y: 0, face: 1, cd: 0, blockers: [], seed: k, hit: 0, dead: false };
      S.enemies.push(e);
    }
  }
  N.step(0.05); S.paused = true;
  N.CAM.s = 1; N.CAM.x = 0; N.CAM.y = 0;
});
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/10-walk.png' });
console.log(errs.length ? errs.join('\n') : 'no errors');
await browser.close();

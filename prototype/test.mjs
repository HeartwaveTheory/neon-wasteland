// Playtest harness: loads the built game inside an artifact-like skeleton.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const body = readFileSync('dist/neon-wasteland.html', 'utf8');

mkdirSync('shots', { recursive: true });
const browser = await chromium.launch();
const errors = [];
async function open(w, h, touch) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: touch ? 3 : 1, hasTouch: touch, isMobile: touch });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${w}x${h} pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${w}x${h} console: ${m.text()}`); });
  await page.goto('file://' + process.cwd() + '/dist/_test.html');
  await page.waitForFunction(() => window.__NW && document.fonts.status === 'loaded');
  await page.waitForTimeout(300);
  return page;
}
const mode = process.argv[2] || 'ui';
if (mode === 'ui') {
  // desktop: start screen, then real taps to build
  const p = await open(1280, 720, false);
  await p.screenshot({ path: 'shots/01-start.png' });
  await p.click('#btnPlay');
  await p.waitForTimeout(200);
  const tapWorld = async (x, y) => { const [sx, sy] = await p.evaluate(([x, y]) => window.__NW.toScreen(x, y), [x, y]); await p.mouse.click(sx, sy); await p.waitForTimeout(60); };
  await tapWorld(458, 162);               // open pad 1 menu
  await p.screenshot({ path: 'shots/02-menu.png' });
  const btns = await p.evaluate(() => { const S = window.__NW.S; return null; });
  // the build buttons: read positions from the game's menu logic via a tap on the first (sniper)
  const pos = await p.evaluate(() => { const pad = window.__NW.PADS[0]; const [cx, cy] = window.__NW.toScreen(pad.x, pad.y - 70); return [cx, cy]; });
  const R = 62, a = (-135 * Math.PI) / 180;
  const bx = Math.max(R + 30, pos[0]) + Math.cos(a) * R, by = Math.max(R + 40, pos[1]) + Math.sin(a) * R;
  await p.mouse.click(bx, by); await p.waitForTimeout(60);
  await p.screenshot({ path: 'shots/03-picked.png' });
  await p.mouse.click(bx, by); await p.waitForTimeout(200);
  const built = await p.evaluate(() => window.__NW.S.towers.map((t) => t && t.kind));
  console.log('after UI build:', JSON.stringify(built), 'gold', await p.evaluate(() => window.__NW.S.gold));
  // build the rest via hooks, start, and run a bit
  await p.evaluate(() => { const N = window.__NW; N.build(1, 'plasma'); N.build(2, 'garrison'); N.startWave(); N.step(14); });
  await p.waitForTimeout(150);
  await p.screenshot({ path: 'shots/04-wave1.png' });
  await p.evaluate(() => { const N = window.__NW; N.S.gold += 2000; N.build(3, 'railgun'); for (let i = 0; i < 4; i++) { N.upgrade(i); N.upgrade(i); } while (N.S.wave < 6) { N.startWave(); N.step(6); } N.step(12); N.castAir(700, 262); N.step(0.7); });
  await p.waitForTimeout(150);
  await p.screenshot({ path: 'shots/05-wave6.png' });
  // phone landscape
  const q = await open(844, 390, true);
  await q.screenshot({ path: 'shots/06-phone-start.png' });
  await q.tap('#btnPlay'); await q.waitForTimeout(200);
  await q.evaluate(() => { const N = window.__NW; N.build(0, 'sniper'); N.build(1, 'plasma'); N.startWave(); N.step(10); });
  await q.waitForTimeout(150);
  await q.screenshot({ path: 'shots/07-phone-land.png' });
  const r = await open(390, 844, true);
  await r.tap('#btnPlay'); await r.waitForTimeout(200);
  await r.screenshot({ path: 'shots/08-phone-portrait.png' });
}
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();

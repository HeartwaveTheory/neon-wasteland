// The critters (rats, crows, a stray dog): they start off the road and the pads, roam, scatter from trouble (crows take
// off and land elsewhere), and the page stays error-free. Close-ups: shots/40-critters-plaza.png, 41 (a clearing),
// 42 (scattering from an airstrike). Run after build.py: node critters-test.mjs
const { chromium } = await import(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs');
import { mkdirSync } from 'node:fs';
mkdirSync('shots', { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 900, height: 520 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + process.cwd() + '/dist/_test.html');
await p.waitForFunction(() => window.__NW && document.fonts.status === 'loaded');
await p.evaluate(() => window.__NW.start());
let fails = 0;
const check = (name, ok, info = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${info ? '  [' + info + ']' : ''}`); if (!ok) fails++; };
// distance from a point to the nearest route, and inside a pad's ring
const where = () => p.evaluate(() => { const N = window.__NW; return N.critters().map((c) => {
  let road = 1e9;
  for (const k of ['L', 'R']) { const P = N.PATHS[k]; for (let i = 0; i < P.pts.length - 1; i++) { const [x1, y1] = P.pts[i], [x2, y2] = P.pts[i + 1]; const vx = x2 - x1, vy = y2 - y1, L2 = vx * vx + vy * vy || 1; const t = Math.max(0, Math.min(1, ((c.x - x1) * vx + (c.y - y1) * vy) / L2)); road = Math.min(road, Math.hypot(c.x - x1 - vx * t, c.y - y1 - vy * t)); } }
  const pad = N.PADS.some((q) => ((c.x - q.x) / 44) ** 2 + ((c.y - q.y) / 23) ** 2 < 1);
  return { ...c, road, pad };
}); });
const c0 = await where();
const kinds = c0.reduce((o, c) => (o[c.kind] = (o[c.kind] || 0) + 1, o), {});
check('critters live on the map', kinds.rat >= 5 && kinds.crow >= 3 && kinds.dog >= 1, JSON.stringify(kinds));
check('none start on the road or a pad', c0.every((c) => c.road > 30 && !c.pad), 'closest to the road ' + Math.min(...c0.map((c) => c.road)).toFixed(0));
await p.waitForTimeout(8000);
const c1 = await where();
check('they roam', c1.filter((c, i) => Math.hypot(c.x - c0[i].x, c.y - c0[i].y) > 4).length >= c1.length * 0.6, c1.filter((c, i) => Math.hypot(c.x - c0[i].x, c.y - c0[i].y) > 4).length + ' of ' + c1.length + ' moved');
check('they keep off the road and the pads', c1.every((c) => c.state === 'fly' || (c.road > 26 && !c.pad)), 'closest ' + Math.min(...c1.filter((c) => c.state !== 'fly').map((c) => c.road)).toFixed(0));
const shot = async (name, x, y, s) => { await p.evaluate(([x, y, s]) => { const N = window.__NW; N.CAM.s = s; N.CAM.x = x - innerWidth / s / 2; N.CAM.y = y - innerHeight / s / 2; }, [x, y, s]); await p.waitForTimeout(150); await p.screenshot({ path: `shots/${name}.png` }); };
await shot('40-critters-plaza', 885, 720, 2.6);
await shot('41-critters-clearing', 520, 300, 2.6);
// trouble: an airstrike on each plaza (and each clearing): crows take off, the rest run
const pos = await p.evaluate(() => window.__NW.critters());
await p.evaluate((pos) => { const N = window.__NW; const c = pos.find((q) => q.kind === 'crow'); N.castAir(c.x + 20, c.y); }, pos);
let flew = false, ran = false;
for (let k = 0; k < 30 && !(flew && ran); k++) {
  await p.waitForTimeout(100);
  const now = await p.evaluate(() => window.__NW.critters());
  flew = flew || now.some((c) => c.state === 'fly');
  ran = ran || now.some((c) => c.state === 'run');
}
await shot('42-critters-scatter', pos.find((q) => q.kind === 'crow').x, pos.find((q) => q.kind === 'crow').y, 2.2);
check('a crow takes off from an airstrike', flew);
// an enemy right next to a rat or the dog: it runs
await p.evaluate(() => {   // a parked enemy (it doesn't walk) set down right beside one of them
  const N = window.__NW, c = N.critters().find((q) => q.kind !== 'crow'), e = N.spawnEnemy('enforcer', 'L');
  e.hp = e.maxHp = 1e9; e.def = { ...e.def, speed: 0 }; e.x = c.x + 12; e.y = c.y;
});
for (let k = 0; k < 10 && !ran; k++) { await p.waitForTimeout(50); ran = (await p.evaluate(() => window.__NW.critters())).some((c) => c.state === 'run'); }
check('rats and the dog run from trouble', ran);
await p.waitForTimeout(6000);
const c2 = await p.evaluate(() => window.__NW.critters());
check('crows land again', c2.filter((c) => c.kind === 'crow' && c.state === 'fly').length <= 1, c2.filter((c) => c.state === 'fly').length + ' still flying');
console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors');
console.log(fails || errs.length ? `${fails} critter checks failed` : 'all critter checks ok');
await b.close();
process.exit(fails || errs.length ? 1 : 0);

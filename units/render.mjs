// Renders every unit's frames into a sprite strip and a review sheet.
//   node render.mjs            -> out/<id>.png (8 frames x 320 px, 2x), out/review.png
//   node render.mjs raider     -> only ids containing "raider"
// Playwright: $PLAYWRIGHT (path to its index.mjs) or the cloud workspace's copy.
const { chromium } = await import(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs');
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UNITS, frames, svgFor, SIZE } from './units.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out');
mkdirSync(OUT, { recursive: true });
const want = process.argv.slice(2);
const ids = Object.keys(UNITS).filter((id) => !want.length || want.some((w) => id.includes(w)));
// On-screen heights in map pixels (the old procedural enemies scaled down 35%).
export const GAME_H = { raider: 29, scout: 23, enforcer: 33, mech: 50, drone: 17, trooper: 26, merc: 26 };

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
const uri = (svg) => 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');

for (const id of ids) {
  const imgs = frames().map((fr) => `<img src="${uri(svgFor(id, fr))}" width="${SIZE}" height="${SIZE}">`).join('');
  await page.setViewportSize({ width: SIZE * 8, height: SIZE });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent"><div id="row" style="display:flex;width:${SIZE * 8}px">${imgs}</div></body></html>`);
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
  await (await page.$('#row')).screenshot({ path: path.join(OUT, `${id}.png`), omitBackground: true });
  console.log('ok', id);
}

// Review: frames at 2x on a dark ground, then every unit at game size on the road (with a 2x zoom of that).
const rows = ids.map((id) => `<div class="row"><b>${UNITS[id].name}</b><div class="strip" style="background-image:url(${id}.png)"></div></div>`).join('');
const units = ids.map((id, k) => {
  const s = GAME_H[id] / UNITS[id].height, w = SIZE * s;
  return `<div class="u" style="left:${40 + k * 46}px;top:${70 - (150 * s)}px;width:${w}px;height:${w}px;background:url(${id}.png) 0 0/${w * 8}px ${w}px"></div>`;
}).join('');
writeFileSync(path.join(OUT, '_review.html'), `<!doctype html><html><head><style>
body{margin:0;background:#22252b;font:700 14px system-ui;color:#f1e4c8}.wrap{padding:12px;display:grid;gap:8px}
.row{display:flex;align-items:center;gap:10px}.row b{width:80px}.strip{width:1280px;height:160px;background-size:1280px 160px;background-repeat:no-repeat}
.road{position:relative;width:400px;height:110px;background:url(../../prototype/assets/map.webp) -1000px -485px/3344px 1882px;transform-origin:0 0}
.u{position:absolute}.scale{display:flex;gap:14px;align-items:flex-start}</style></head><body><div class="wrap">${rows}
<div class="scale"><div><div class="road">${units}</div>game size</div><div><div class="road" style="transform:scale(2.4);margin-bottom:154px;margin-right:560px">${units}</div>2.4x</div></div></div></body></html>`);
await page.setViewportSize({ width: 1400, height: 1000 });
await page.goto('file://' + path.join(OUT, '_review.html'));
await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
await page.waitForTimeout(200);
await (await page.$('.wrap')).screenshot({ path: path.join(OUT, 'review.png') });
console.log('ok review');
await browser.close();

// Renders the tower designs.
//   node render.mjs                 every tower: svg, png, layers, review sheet
//   node render.mjs sniper          only ids containing "sniper"
//   node render.mjs --sheet         also the lineup (out/lineup.png) and the towers on the map (out/on-map.png)
// Outputs go to out/. Review sheets (out/review/<id>.png) show the tower at full
// size, at true game scale on one of the map's build pads, and at 2x on the pad.
// Playwright: $PLAYWRIGHT (path to its index.mjs) or the cloud workspace's copy.
const { chromium } = await import(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs');
import { readdirSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TowerKit as Kit } from './tkit.mjs';
const GROUND_Y = 420, CX = 256;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out');
const args = process.argv.slice(2);
const wantSheet = args.includes('--sheet');
const filters = args.filter((a) => !a.startsWith('--'));
for (const d of ['svg', 'png', 'layers', 'review']) mkdirSync(path.join(OUT, d), { recursive: true });
// Always use the current Neon Wasteland map (falls back to the old reference).
const MAP = path.join(OUT, 'map.png');
const NEWMAP = path.join(HERE, '..', 'maplab', 'out', 'map.png');
copyFileSync(existsSync(NEWMAP) ? NEWMAP : path.join(HERE, '..', 'ref', 'map.png'), MAP);

// Build pads on the reference map (centre x, y, rx, ry) in map pixels.
export const PADS = [[458, 162, 80, 40], [1025, 218, 90, 48], [548, 345, 92, 47], [1197, 362, 92, 47]];
const GAME_SCALE = 0.5; // sprite px -> map px (footprint rx 150 -> 75 on a ~90 pad)

const FAMILIES = ['sniper', 'plasma', 'railgun', 'garrison', 'dragon'];
const towers = [];
for (const fn of readdirSync(path.join(HERE, 'towers')).filter((f) => f.endsWith('.mjs')).sort()) {
  const m = await import(path.join(HERE, 'towers', fn) + `?t=${Date.now()}`);
  const list = Array.isArray(m.default) ? m.default : [m.default];
  towers.push(...list);
}
towers.sort((a, b) => FAMILIES.indexOf(a.family) - FAMILIES.indexOf(b.family) || a.order - b.order);
const pick = filters.length ? towers.filter((t) => filters.some((q) => t.id.includes(q))) : towers;

function seedOf(id) { let h = 2166136261; for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) % 100000; }

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });

async function shotSvg(svg, file, hide = []) {
  const css = hide.map((h) => `#${h}{display:none}`).join('');
  await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;background:transparent}${css}</style></head><body>${svg}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  const el = await page.$('svg');
  await el.screenshot({ path: file, omitBackground: true });
}

// A tile of the map around a pad with the tower standing on it.
function padTile(id, z, pad = PADS[2], cw = 330, up = 250, down = 75) {
  const [px, py] = pad;
  const s = GAME_SCALE;
  return `<div class="tile" style="width:${cw * z}px;height:${(up + down) * z}px;background:url(map.png) ${-(px - cw / 2) * z}px ${-(py - up) * z}px / ${1672 * z}px ${941 * z}px no-repeat">` +
    `<img src="png/${id}.png" style="position:absolute;left:${(cw / 2 - CX * s) * z}px;top:${(up - GROUND_Y * s) * z}px;width:${512 * s * z}px"></div>`;
}
const CSS = `body{margin:0;background:#2a221a;font:600 14px/1.3 'Chakra Petch',system-ui,sans-serif;color:#f1e3c8}
.tile{position:relative;overflow:hidden;border:3px solid #1a140e;border-radius:6px;flex:none}
.full{width:512px;height:512px;flex:none;border:3px solid #1a140e;border-radius:6px;background:radial-gradient(circle at 50% 70%,#b18c69,#7a5c3d)}
h1{font:400 22px Bungee,sans-serif;margin:0 0 6px;color:#ffd23a;-webkit-text-stroke:1px #1a140e}
.row{display:flex;gap:14px;align-items:flex-end}.lab{font-size:12px;opacity:.8;margin-top:4px}`;
const FONTCSS = `@font-face{font-family:Bungee;src:url(../../fonts/bungee.woff2)}@font-face{font-family:'Chakra Petch';font-weight:700;src:url(../../fonts/chakra700.woff2)}`;

for (const t of pick) {
  const K = new Kit(seedOf(t.id));
  const svg = t.build(K);
  writeFileSync(path.join(OUT, 'svg', `${t.id}.svg`), svg);
  await shotSvg(svg, path.join(OUT, 'png', `${t.id}.png`));
  if (svg.includes('id="head"')) {
    await shotSvg(svg, path.join(OUT, 'layers', `${t.id}-base.png`), ['head']);
    await shotSvg(svg, path.join(OUT, 'layers', `${t.id}-head.png`), ['shadow', 'base', 'front']);
  }
  const html = `<!doctype html><html><head><style>${FONTCSS}${CSS}</style></head><body><div style="padding:14px">
<h1>${t.name} <span style="font:600 15px Chakra Petch,sans-serif;color:#f1e3c8;-webkit-text-stroke:0">${t.family} · tier ${t.tier}</span></h1>
<div class="row"><div><div class="full"><img src="png/${t.id}.png" width="512"></div><div class="lab">full size (512)</div></div>
<div><div class="row">${padTile(t.id, 1)}${padTile(t.id, 2)}</div><div class="lab">on the map's build pad: true game scale, and 2x</div></div></div></div></body></html>`;
  const hf = path.join(OUT, `_review-${t.id}.html`);
  writeFileSync(hf, html);
  await page.setViewportSize({ width: 1700, height: 640 });
  await page.goto('file://' + hf);
  await page.evaluate(() => document.fonts.ready);
  const box = await page.$('body > div');
  await box.screenshot({ path: path.join(OUT, 'review', `${t.id}.png`) });
  console.log('ok', t.id);
}

if (wantSheet) {
  // Lineup like the user's reference: the towers side by side on a dark ground, with neon names.
  let cells = '';
  for (const t of towers) cells += `<div class="cell"><img src="png/${t.id}.png" width="460"><div class="name">${t.name.toUpperCase()}</div></div>`;
  writeFileSync(path.join(OUT, '_lineup.html'), `<!doctype html><html><head><style>${FONTCSS}
    body{margin:0;background:#2a2c31}.wrap{display:flex;gap:0;padding:20px 30px 34px;background:radial-gradient(120% 90% at 50% 40%,#34373d,#202226)}
    .cell{display:flex;flex-direction:column;align-items:center}.cell img{display:block;margin:0 -20px}
    .name{font:400 46px Bungee,sans-serif;color:#8ff4ff;text-shadow:0 0 14px #3ff0ff,0 0 2px #fff;letter-spacing:.04em;margin-top:-6px}</style></head>
    <body><div class="wrap">${cells}</div></body></html>`);
  await page.setViewportSize({ width: 2600, height: 700 });
  await page.goto('file://' + path.join(OUT, '_lineup.html'));
  await page.evaluate(() => document.fonts.ready);
  await (await page.$('.wrap')).screenshot({ path: path.join(OUT, 'lineup.png') });
  console.log('ok lineup');

  // The four towers standing on the map's four build pads, at game scale.
  const ids = towers.map((t) => t.id).slice(0, 4);
  let imgs = '';
  ids.forEach((id, i) => {
    const [px, py] = PADS[i];
    imgs += `<img src="png/${id}.png" style="position:absolute;left:${px - CX * GAME_SCALE}px;top:${py - GROUND_Y * GAME_SCALE}px;width:${512 * GAME_SCALE}px">`;
  });
  writeFileSync(path.join(OUT, '_map.html'), `<!doctype html><html><body style="margin:0"><div style="position:relative;width:1672px;height:941px;background:url(map.png)">${imgs}</div></body></html>`);
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.goto('file://' + path.join(OUT, '_map.html'));
  await page.screenshot({ path: path.join(OUT, 'on-map.png') });
  await page.screenshot({ path: path.join(OUT, 'on-map-zoom.png'), clip: { x: 330, y: 40, width: 1000, height: 420 } });
  console.log('ok on-map');
}
await browser.close();

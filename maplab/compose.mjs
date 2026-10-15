// Composes the Neon Wasteland map: restyled base + every overlay layer.
//
//   node compose.mjs                 full map -> out/map-2x.png, out/map.png (1x) and every crop
//   node compose.mjs --crop hq       just one region (fast) -> out/crops/hq.png
//   node compose.mjs --crop hq --only hq   ... with only the named layer(s) on top (comma list)
//   node compose.mjs --base          force re-running restyle.py first
//   node compose.mjs --list          list crops and layers
//
// Layers live in layers/*.mjs:
//   export default {
//     name: 'hq', z: 50,                       // z orders layers (ground below objects always)
//     erase: [[[x, y], ...], ...],             // optional polygons (2x map px) inpainted out of the base
//     build(K) { return { ground: '', objects: '', light: '' } }   // K is a fresh MapKit
//   }
// The base is re-generated automatically when the erase polygons change.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readdirSync, writeFileSync, readFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MapKit, MW, MH } from './mapkit.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out');
const TMP = path.join(OUT, 'tmp', String(process.pid));
mkdirSync(path.join(OUT, 'crops'), { recursive: true });
mkdirSync(TMP, { recursive: true });

// Named regions in 2x map px: [x, y, w, h].
export const CROPS = {
  hq: [1100, 940, 1300, 820],
  'gate-left': [0, 0, 820, 420],
  'gate-right': [2180, 0, 900, 420],
  pond: [1480, 100, 640, 420],
  mine: [2480, 60, 864, 680],
  lumber: [240, 1080, 940, 680],
  quarry: [2320, 920, 1024, 680],
  'pads-north': [620, 140, 1820, 520],
  'pads-south': [840, 480, 1800, 420],
  junction: [1460, 480, 700, 600],
  'south-edge': [700, 1480, 1500, 402],
};

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const crop = opt('--crop');
const only = opt('--only') ? opt('--only').split(',') : null;

const layers = [];
for (const fn of readdirSync(path.join(HERE, 'layers')).filter((f) => f.endsWith('.mjs')).sort()) {
  const m = await import(path.join(HERE, 'layers', fn) + `?t=${Date.now()}`);
  layers.push({ file: fn, ...m.default });
}
layers.sort((a, b) => (a.z || 0) - (b.z || 0));
if (args.includes('--list')) {
  console.log('crops:', Object.keys(CROPS).join(', '));
  console.log('layers:', layers.map((l) => `${l.name}(z${l.z})`).join(', '));
  process.exit(0);
}

const atomic = (file, data) => { const t = `${file}.${process.pid}.tmp`; writeFileSync(t, data); renameSync(t, file); };
function seedOf(id) { let h = 2166136261; for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) % 100000; }

const browser = await chromium.launch();
const page = await browser.newPage();

// ---- 1. erase mask -> restyled base
const erase = layers.flatMap((l) => l.erase || []);
const eraseJson = JSON.stringify(erase);
const hash = createHash('md5').update(eraseJson + readFileSync(path.join(HERE, 'restyle.py'))).digest('hex');
const hashFile = path.join(OUT, 'base.hash');
const stale = !existsSync(path.join(OUT, 'base.png')) || !existsSync(hashFile) || readFileSync(hashFile, 'utf8') !== hash;
if (stale || args.includes('--base')) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${MW}" height="${MH}" viewBox="0 0 ${MW} ${MH}"><rect width="${MW}" height="${MH}" fill="#000"/>${erase.map((p) => `<polygon points="${p.map((q) => q.join(',')).join(' ')}" fill="#fff"/>`).join('')}</svg>`;
  await page.setViewportSize({ width: MW, height: MH });
  await page.setContent(`<!doctype html><html><body style="margin:0">${svg}</body></html>`);
  const tmpMask = path.join(TMP, 'erase-mask.png');
  await page.screenshot({ path: tmpMask });
  renameSync(tmpMask, path.join(OUT, 'erase-mask.png'));
  execFileSync(path.join(HERE, '..', 'venv', 'bin', 'python'), ['-I', path.join(HERE, 'restyle.py')], { cwd: HERE, stdio: 'inherit' });
  atomic(hashFile, hash);
}

// ---- 2. each layer -> ground svg, objects svg, light svg (separate documents so ids never collide)
const ground = [], objects = [], lights = [];
for (const l of layers) {
  if (only && !only.includes(l.name)) continue;
  const K = new MapKit(seedOf(l.name));
  const r = l.build(K) || {};
  const pre = path.join(TMP, l.name);
  if (r.ground) { writeFileSync(`${pre}-ground.svg`, K.mapDoc(r.ground)); ground.push(`${pre}-ground.svg`); }
  if (r.objects) { writeFileSync(`${pre}-objects.svg`, K.mapDoc(r.objects)); objects.push(`${pre}-objects.svg`); }
  const lightSvg = (r.light || '') + K.lights.join('');
  if (lightSvg) { writeFileSync(`${pre}-light.svg`, K.rawDoc(lightSvg)); lights.push(`${pre}-light.svg`); }
}

// ---- 3. stack and shoot
const stack = (x, y) => `<div style="position:absolute;left:${-x}px;top:${-y}px;width:${MW}px;height:${MH}px">` +
  `<img src="file://${path.join(OUT, 'base.png')}" style="position:absolute;left:0;top:0;width:${MW}px;height:${MH}px">` +
  [...ground, ...objects].map((s) => `<img src="file://${s}" style="position:absolute;left:0;top:0;width:${MW}px;height:${MH}px">`).join('') +
  lights.map((s) => `<img src="file://${s}" style="position:absolute;left:0;top:0;width:${MW}px;height:${MH}px;mix-blend-mode:screen">`).join('') +
  `</div>`;
async function shoot(x, y, w, h, file) {
  const html = path.join(TMP, `page-${w}x${h}.html`);
  writeFileSync(html, `<!doctype html><html><body style="margin:0;overflow:hidden;background:#000"><div style="position:relative;width:${w}px;height:${h}px;overflow:hidden">${stack(x, y)}</div></body></html>`);
  await page.setViewportSize({ width: w, height: h });
  await page.goto('file://' + html);
  await page.waitForLoadState('load');
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => null))));
  const t = path.join(TMP, path.basename(file));
  await page.screenshot({ path: t });
  renameSync(t, file);
}

if (crop) {
  const c = CROPS[crop];
  if (!c) throw new Error(`unknown crop ${crop}; known: ${Object.keys(CROPS).join(', ')}`);
  await shoot(c[0], c[1], c[2], c[3], path.join(OUT, 'crops', `${crop}${only ? '-only' : ''}.png`));
  console.log('ok crop', crop);
} else {
  await shoot(0, 0, MW, MH, path.join(OUT, 'map-2x.png'));
  execFileSync(path.join(HERE, '..', 'venv', 'bin', 'python'), ['-I', '-c',
    `import cv2,sys\nim=cv2.imread(sys.argv[1]);cv2.imwrite(sys.argv[2],cv2.resize(im,(im.shape[1]//2,im.shape[0]//2),interpolation=cv2.INTER_AREA))\nfor a in sys.argv[3:]:\n  n,x,y,w,h=a.split(':');x,y,w,h=map(int,(x,y,w,h));cv2.imwrite(sys.argv[2].replace('map.png','crops/'+n+'.png'),im[y:y+h,x:x+w])`,
    path.join(OUT, 'map-2x.png'), path.join(OUT, 'map.png'), ...Object.entries(CROPS).map(([n, c]) => `${n}:${c.join(':')}`)]);
  console.log('ok full map + crops');
}
await browser.close();

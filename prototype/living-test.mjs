// Living map check (Map v3): the acid, lights and particles start, stay under the particle cap, and stay cheap.
// Takes frames that show the motion (shots/20-living-*.png, a contact sheet of crops over time) and a short clip
// (shots/living.webm), and measures render time at phone sizes (headless Chromium, software drawing: a phone's GPU is
// faster). Run after build.py:  node living-test.mjs
// Playwright: $PLAYWRIGHT (path to its index.mjs) or the cloud workspace's copy.
const { chromium } = await import(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs');
import { mkdirSync, renameSync, readdirSync, rmSync } from 'node:fs';

mkdirSync('shots', { recursive: true });
const browser = await chromium.launch();
const errors = [];
let bad = 0;
const check = (name, ok, info = '') => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  [' + info + ']' : '')); if (!ok) bad++; };
async function open(w, h, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: opts.dpr || 1, hasTouch: !!opts.touch, isMobile: !!opts.touch, reducedMotion: opts.reduced ? 'reduce' : 'no-preference', recordVideo: opts.video ? { dir: 'shots/video', size: { width: w, height: h } } : undefined });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${w}x${h} pageerror: ${e.message}`));
  await page.goto('file://' + process.cwd() + '/dist/_test.html');
  await page.waitForFunction(() => window.__NW && window.__NW.living().ready && document.fonts.status === 'loaded');
  await page.evaluate(() => { const N = window.__NW; N.start(); N.build(0, 'sniper'); N.build(1, 'plasma'); N.build(2, 'dragon'); N.build(3, 'garrison'); N.startWave(); });
  return { ctx, page };
}

// 1. desktop: it runs, frames over time, a short clip
{
  const { ctx, page } = await open(1280, 720, { video: true });
  await page.waitForTimeout(2500);
  const st = await page.evaluate(() => window.__NW.living());
  check('acid areas found', st.acid === 12, st.acid + ' areas');
  check('particles alive and under the cap', st.parts > 10 && st.parts <= st.cap, `${st.parts} / ${st.cap}`);
  for (let k = 0; k < 4; k++) { await page.screenshot({ path: `shots/20-living-${k}.png` }); await page.waitForTimeout(350); }
  await page.waitForTimeout(3000);
  await ctx.close();
  const dir = 'shots/video', f = readdirSync(dir).find((n) => n.endsWith('.webm'));
  if (f) { renameSync(`${dir}/${f}`, 'shots/living.webm'); rmSync(dir, { recursive: true, force: true }); }
  check('clip recorded', !!f, 'shots/living.webm');
}
// 2. phone sizes: render time (the whole frame, and the living map's share of it)
for (const [w, h] of [[844, 390], [390, 844]]) {
  const { ctx, page } = await open(w, h, { dpr: 3, touch: true });
  await page.waitForTimeout(4000);
  const st = await page.evaluate(() => window.__NW.living());
  // frames actually shown per second (includes the browser's drawing, not just the script)
  const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(f); }));
  check(`${w}x${h} @3x: render under 12 ms a frame`, st.renderMs < 12, `render ${st.renderMs.toFixed(2)} ms, living map ${st.ms.toFixed(2)} ms, ${st.parts} particles`);
  check(`${w}x${h} @3x: holds 50+ frames a second`, fps >= 50, `${fps.toFixed(0)} fps`);
  if (w === 844) await page.screenshot({ path: 'shots/21-living-phone.png' });
  await ctx.close();
}
// 3. reduced motion: calmer, fewer particles
{
  const { ctx, page } = await open(1280, 720, { reduced: true });
  await page.waitForTimeout(3000);
  const st = await page.evaluate(() => window.__NW.living());
  check('reduced motion: fewer particles, no pulses', st.parts <= Math.round(st.cap * 0.35) && st.pulses === 0, `${st.parts} particles, ${st.pulses} pulses`);
  await ctx.close();
}
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
console.log(bad || errors.length ? `${bad} living-map checks failed` : 'all living-map checks ok');
await browser.close();
process.exit(bad || errors.length ? 1 : 0);

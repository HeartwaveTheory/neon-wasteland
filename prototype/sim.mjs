// Bot playtests: several strategies, full 10-wave games at simulation speed.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('file://' + process.cwd() + '/dist/_test.html');
await page.waitForFunction(() => window.__NW);
const STRATS = {
  mixed:      { plan: ['plasma', 'plasma', 'garrison', 'sniper'], spells: true },
  mixed_nosp: { plan: ['plasma', 'plasma', 'garrison', 'sniper'], spells: false },
  snipers:    { plan: ['sniper', 'sniper', 'sniper', 'sniper'], spells: true },
  plasma:     { plan: ['plasma', 'plasma', 'plasma', 'plasma'], spells: true },
  rail_gar:   { plan: ['garrison', 'railgun', 'railgun', 'garrison'], spells: true },
  railgun:    { plan: ['railgun', 'railgun', 'railgun', 'railgun'], spells: true },
  garrisons:  { plan: ['garrison', 'garrison', 'garrison', 'garrison'], spells: true },
  rail_plas:  { plan: ['plasma', 'plasma', 'railgun', 'railgun'], spells: true },
  snip_rail:  { plan: ['sniper', 'plasma', 'railgun', 'sniper'], spells: true },
  lazy:       { plan: ['sniper', 'plasma', 'garrison', 'railgun'], spells: false, noUpgrade: true },
};
const runs = Number(process.argv[2] || 3);
for (const [name, st] of Object.entries(STRATS)) {
  const res = [];
  for (let r = 0; r < runs; r++) {
    res.push(await page.evaluate((st) => {
      const N = window.__NW; N.restart(); N.start(); const S = N.S;
      const order = [0, 1, 2, 3];
      let t = 0; const log = [];
      while (!S.over && t < 1200) {
        // build towers in plan order, then upgrade the cheapest upgrade
        for (const i of order) if (!S.towers[i] && S.gold >= N.TOWERS[st.plan[i]].cost[0]) N.build(i, st.plan[i]);
        if (!st.noUpgrade && S.towers.every(Boolean)) {
          const ups = S.towers.map((tw, i) => (tw.lvl < 2 ? [N.TOWERS[tw.kind].cost[tw.lvl + 1], i] : null)).filter(Boolean).sort((a, b) => a[0] - b[0]);
          if (ups.length && S.gold >= ups[0][0]) N.upgrade(ups[0][1]);
        }
        if (!S.started) N.startWave();
        if (st.spells) {
          const live = S.enemies.filter((e) => !e.dead);
          if (S.cd.air <= 0 && live.length >= 4) {
            let best = null, bn = 0;
            for (const e of live) { const n = live.filter((o) => Math.hypot(o.x - e.x, (o.y - e.y) / 0.7) < 46).length; if (n > bn) { bn = n; best = e; } }
            if (best && bn >= 3) N.castAir(best.x, best.y);
          }
          if (S.cd.squad <= 0) {
            const lead = live.filter((e) => !e.def.air).sort((a, b) => (N.PATHS[a.path].len - a.d) - (N.PATHS[b.path].len - b.d))[0];
            if (lead && N.PATHS[lead.path].len - lead.d < 260) N.castSquad(lead.x, lead.y);
          }
        }
        N.step(0.5); t += 0.5;
      }
      return { won: S.won, lives: S.lives, wave: S.wave, gold: S.gold, lvls: S.towers.map((tw) => tw ? tw.lvl + 1 : 0).join(''), t: Math.round(t) };
    }, st));
  }
  const wins = res.filter((r) => r.won).length;
  console.log(name.padEnd(11), `wins ${wins}/${runs}`, res.map((r) => `${r.won ? 'W' : 'L'}${r.wave}:${r.lives}hp`).join(' '), '| lvls', res[0].lvls, 'gold', res[0].gold);
}
await browser.close();

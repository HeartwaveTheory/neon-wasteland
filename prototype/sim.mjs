// Bot playtests: several strategies, full 10-wave games at simulation speed.
//   node sim.mjs [runs] [strategy,strategy,...]
// Each bot builds its plan on pads 1-4 as soon as it can afford each tower, then spends everything on the cheapest upgrade.
// Playwright: $PLAYWRIGHT (path to its index.mjs) or the cloud workspace's copy.
const { chromium } = await import(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs');
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
  // the Dragon (fire patches, ground only): one in a mixed build, dragon-heavy builds, builds with no anti-air
  mix_drg:    { plan: ['plasma', 'plasma', 'dragon', 'sniper'], spells: true },     // the dragon instead of the garrison
  mix_drg_ns: { plan: ['plasma', 'plasma', 'dragon', 'sniper'], spells: false },
  gar_drg:    { plan: ['plasma', 'plasma', 'garrison', 'dragon'], spells: true },   // garrison holds them in the fire
  drg_rail:   { plan: ['sniper', 'plasma', 'railgun', 'dragon'], spells: true },
  drg_noairR: { plan: ['plasma', 'dragon', 'garrison', 'sniper'], spells: true },   // nothing hits drones on the right road
  drg_plas:   { plan: ['plasma', 'dragon', 'dragon', 'plasma'], spells: true },
  drg_pp:     { plan: ['plasma', 'plasma', 'dragon', 'dragon'], spells: true },
  drg3:       { plan: ['dragon', 'dragon', 'dragon', 'plasma'], spells: true },
  drg_gar:    { plan: ['garrison', 'dragon', 'dragon', 'garrison'], spells: true }, // no anti-air
  dragons:    { plan: ['dragon', 'dragon', 'dragon', 'dragon'], spells: true },
};
const runs = Number(process.argv[2] || 3);
const only = process.argv[3] ? process.argv[3].split(',') : null;
for (const [name, st] of Object.entries(STRATS)) {
  if (only && !only.includes(name)) continue;
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
      return { won: S.won, lives: S.lives, wave: S.wave, gold: S.gold, lvls: S.towers.map((tw) => tw ? tw.lvl + 1 : 0).join(''), t: Math.round(t), dmg: S.stats.dmg };
    }, st));
  }
  const wins = res.filter((r) => r.won).length;
  // share of all damage dealt, per source (towers, troopers, spells), over every run
  const tot = {}; for (const r of res) for (const [k, v] of Object.entries(r.dmg || {})) tot[k] = (tot[k] || 0) + v;
  const sum = Object.values(tot).reduce((a, b) => a + b, 0) || 1;
  const share = Object.entries(tot).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round((100 * v) / sum)}%`).join(' ');
  const avg = (res.reduce((a, r) => a + (r.won ? r.lives : 0), 0) / Math.max(1, wins)).toFixed(1);
  console.log(name.padEnd(11), `wins ${wins}/${runs}`, wins ? `(avg ${avg}hp)` : '', runs <= 5 ? res.map((r) => `${r.won ? 'W' : 'L'}${r.wave}:${r.lives}hp`).join(' ') : '', '| lvls', res[0].lvls, 'gold', res[0].gold, '| dmg', share);
}
await browser.close();

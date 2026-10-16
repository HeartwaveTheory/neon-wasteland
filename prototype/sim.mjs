// Bot playtests: several strategies, full 10-wave games at simulation speed.
// Playwright: $PLAYWRIGHT (path to its index.mjs) or the cloud workspace's copy.
const { chromium } = await import(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright/index.mjs');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('file://' + process.cwd() + '/dist/_test.html');
await page.waitForFunction(() => window.__NW);
// Layout v2 has 10 pads. Bots fill them the way a good player does: around the junction first (2, 7, 1), then the
// shared stretch to the HQ (9) and the rest. A plan lists the towers for the first pads in that order (its length is
// how many pads the bot uses); the bot builds each as soon as it can afford it, then spends everything on the cheapest
// upgrade. Run: node sim.mjs [runs] [strategy,strategy,...]
const PAD_ORDER = [1, 6, 0, 8, 2, 5, 9, 3, 4, 7];   // pads 2, 7, 1, 9, 3, 6, 10, 4, 5, 8 (0-based)
const MIX6 = ['plasma', 'plasma', 'garrison', 'sniper', 'railgun', 'plasma'];
const MIX10 = [...MIX6, 'sniper', 'railgun', 'plasma', 'garrison'];
const all = (k, n = 10) => Array(n).fill(k);
const STRATS = {
  mixed:      { plan: MIX6, spells: true },                                          // six towers, upgraded
  mixed_nosp: { plan: MIX6, spells: false },
  mixed4:     { plan: ['plasma', 'plasma', 'garrison', 'sniper'], spells: true },    // only four pads, as on the old map
  mixed10:    { plan: MIX10, spells: true },                                         // every pad
  mixed10_ns: { plan: MIX10, spells: false },
  lazy:       { plan: MIX10, spells: false, noUpgrade: true },                       // every pad, never upgrades
  lazy_sp:    { plan: MIX10, spells: true, noUpgrade: true },
  // one tower type on every pad
  snipers:    { plan: all('sniper'), spells: true },
  plasma:     { plan: all('plasma'), spells: true },
  railgun:    { plan: all('railgun'), spells: true },
  garrisons:  { plan: all('garrison'), spells: true },
  dragons:    { plan: all('dragon'), spells: true },
  // pairs
  rail_plas:  { plan: ['plasma', 'railgun', 'plasma', 'railgun', 'plasma', 'railgun'], spells: true },
  snip_rail:  { plan: ['sniper', 'railgun', 'sniper', 'railgun', 'plasma', 'sniper'], spells: true },
  // no anti-air: nothing hits drones
  rail_gar:   { plan: ['garrison', 'railgun', 'railgun', 'garrison', 'railgun', 'dragon', 'railgun', 'garrison', 'dragon', 'railgun'], spells: true },
  // the Dragon (fire patches, ground only)
  mix_drg:    { plan: ['plasma', 'plasma', 'dragon', 'sniper', 'railgun', 'plasma'], spells: true },   // the dragon instead of the garrison
  mix_drg_ns: { plan: ['plasma', 'plasma', 'dragon', 'sniper', 'railgun', 'plasma'], spells: false },
  gar_drg:    { plan: ['plasma', 'plasma', 'garrison', 'dragon', 'sniper', 'plasma'], spells: true }, // garrison holds them in the fire
  drg_heavy:  { plan: ['dragon', 'plasma', 'dragon', 'dragon', 'plasma', 'dragon'], spells: true },
};
const only = process.argv[3] ? process.argv[3].split(',') : null;
const runs = Number(process.argv[2] || 3);
for (const [name, st] of Object.entries(STRATS)) {
  if (only && !only.includes(name)) continue;
  const res = [];
  for (let r = 0; r < runs; r++) {
    res.push(await page.evaluate(([st, PAD_ORDER]) => {
      const N = window.__NW; N.restart(); N.start(); const S = N.S;
      const order = PAD_ORDER.slice(0, st.plan.length), kind = (i) => st.plan[order.indexOf(i)];
      let t = 0; const log = [];
      while (!S.over && t < 1200) {
        // build towers in plan order, then upgrade the cheapest upgrade
        for (const i of order) if (!S.towers[i] && S.gold >= N.TOWERS[kind(i)].cost[0]) N.build(i, kind(i));
        if (!st.noUpgrade && order.every((i) => S.towers[i])) {
          const ups = S.towers.map((tw, i) => (tw && tw.lvl < 2 ? [N.TOWERS[tw.kind].cost[tw.lvl + 1], i] : null)).filter(Boolean).sort((a, b) => a[0] - b[0]);
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
    }, [st, PAD_ORDER]));
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

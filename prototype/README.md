# Neon Wasteland: playable prototype

`neon-wasteland.html` is the whole game in one file. Open it in a browser (it works on phones; landscape shows the whole
map, and in portrait you drag to look around). It is a Kingdom Rush-style tower defense on the Neon Wasteland map:

- **5 towers** to build on the map's 10 build pads, each with 3 levels:
  - **Sniper:** long range, hits flyers, weak against armour.
  - **Plasma:** chain lightning that ignores armour.
  - **Railgun:** a piercing line shot, ground only.
  - **Garrison:** three troopers block the road, with a movable rally point.
  - **Dragon:** a punk scrap-metal dragon that lobs napalm. Each glob leaves a fire patch on the road that burns
    every ground enemy walking through it (18/26/36 a second for 4/5/6 s, through armour). Patches don't stack, each
    dragon keeps at most 3, and drones and your own troopers are never hurt.
- **5 enemies**: scav, rider (fast), brute (armoured), drone (flying, can't be blocked), and the Warlord boss in wave 10.
- **2 spells**: Airstrike (3 missiles) and Drop Squad (2 mercs who block for 18 s).
- **Waves**: 10 waves from two gates. Tapping the skull calls a wave early for bonus scrap. Selling refunds 60%.
- **Stars**: 18+ lives left is 3 stars, 6+ is 2 stars.

The map is Layout v2 (`../maplab/LAYOUT.md`): 10 smaller pads (the old four plus six new ones) and a half-size AEGIS
HQ further down, so the road runs on through the HQ plaza and enemies walk about 170 px further.

Balance, from bot playtests (`sim.mjs`, 10 runs per strategy). The bots fill pads like a good player, around the junction
first (pads 2, 7, 1, 9, 3, 6, 10, 4, 5, 8), build each planned tower as soon as they can afford it, then spend everything
on the cheapest upgrade. With 10 pads, ten unupgraded towers were too strong, so level 1 hits a little softer and level 3
harder, and the start is 280 scrap (was 300).

| Strategy | Result |
|---|---|
| Mixed towers on 6 pads, with spells | wins every time, 16–17 lives on average |
| Same, without spells | wins 8 in 10, with about 6 lives |
| Mixed on all 10 pads, upgraded, with spells | wins every time, about 14 lives (without spells: loses) |
| Mixed on only 4 pads | wins 3 in 10 |
| No upgrades, every pad filled | loses at wave 8–10 (with spells, scrapes 3 wins in 10) |
| All sniper, all railgun, all garrison, all dragon | loses |
| All plasma | wins with about 10 lives: the boss always gets through |
| Plasma + railgun | wins with about 5 lives |
| Sniper + railgun (one plasma) | wins 6 in 10 |
| No anti-air (railgun, garrison, dragon) | loses at wave 8 |
| Mixed with a dragon instead of the garrison | wins with about 10 lives (about 4 without spells) |
| Mixed with garrison and dragon | wins 7 in 10, with about 3 lives |
| Four dragons and two plasmas | loses |

Plasma is still the strongest tower (about half of all damage in every mixed build), as it was on the old map.

The game's numbers are in the Game Tuner (`../tuner.json`, `tuning.schema.json`); `node tuning-check.mjs` checks the
schema's defaults still match `game.html`.

Source: `game.html` with placeholders; `build.py` embeds `assets/` (the map and each tower's base and head layer, exported
from `../maplab` and `../towers2`) and the fonts into `dist/neon-wasteland.html`. `test.mjs` takes screenshots and
`sim.mjs` runs the bot playtests (`node sim.mjs [runs] [strategy,...]`); `dragon-test.mjs` checks the dragon's fire,
aim and the five-button build menu on every pad; `leash.mjs` checks garrison troopers stay in range. They need Playwright:
set `PLAYWRIGHT` to its `index.mjs` (they fall back to the cloud workspace's `/opt/node22` copy), and run them from this
folder after `build.py`. `build.py` writes `dist/neon-wasteland.html`: copy it over `neon-wasteland.html`, the file testers get.
`tools/trace_road.py` traces the enemy routes along the middle of the painted road (run it again if the map changes,
then paste its output into `game.html`); `walk.mjs` renders a crowd of enemies on both routes to check them.

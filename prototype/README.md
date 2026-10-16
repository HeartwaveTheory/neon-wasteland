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

The map is **Map v3**: a painting (`../art/map-v3-source.webp`, 1672 × 941, the game's 1x size) with the full-size
AEGIS HQ and the roads as painted. It has **10 build pads**: the painting's 4 (pads 1-4) and 6 more the game draws to
match them (pads 5-10: concrete octagon, hazard ring, cyan corner lights, on a cleared dirt patch with a contact shadow,
one size smaller so they fit on open ground beside the roads). The pads, HQ, gates and routes are measured from the
painting (the routes with `tools/trace_road.py`). It is half the resolution of the old 2x map art, so it looks softer on
phones: a 2x repaint would fix that.

**The living map** (`game.html`, "living map"), all drawn under the units: the acid moves (a drifting caustic shimmer on
the pool, streaks running down the falls and along the streams, bubbles popping), the lights glow and breathe (signs
flicker now and then, the gate beacons blink, the fires flicker, the welder at the chop shop flashes), particles rise
(embers off the fire, smoke from the data mine, toxic vapour off the acid, dust in the lamplight, sparks off the pylons),
energy pulses run along the power lines to the HQ, a searchlight sweeps from the HQ's watchtower, and the data-mine
portal swirls. The acid is found in the painting at load (its bright toxic green, inside hand-placed boxes); the lights,
wires and smoke sources are placed by hand. It's calmer with reduced motion (slower acid, steady lights, a third of the
particles, no pulses), stops while the tab is hidden, and its strength is in the Game Tuner (`fx.*`).

Balance, from bot playtests (`sim.mjs`, 10 runs per strategy). The bots fill pads like a good player, the junction and
the merged stretch first (pads 10, 2, 9, 8, then 3, 7, 1, 4, 5, 6), build each planned tower as soon as they can afford
it, then spend everything on the cheapest upgrade. With 10 pads, filling every pad with level-1 towers was too strong,
so level 1 hits a little softer and level 3 harder, the start is 270 scrap (was 300), enemies gain 6% health a wave
(was 5%) and the boss has 3000 HP (was 3400).

| Strategy | Result |
|---|---|
| Mixed towers on 6 pads, with spells | wins every time, with about 10 lives (9–12): the boss gets through more often than not |
| Same, without spells | wins with about 6 lives |
| Mixed on only 4 pads | wins 9 in 10, with about 7 lives |
| Mixed on all 10 pads, with spells | wins 6 in 10 (without spells: loses) |
| No upgrades, every pad filled | loses (with spells, scrapes 3 wins in 10) |
| All sniper, all railgun, all garrison, all dragon | loses |
| All plasma | wins with about 9 lives: the boss always gets through |
| Plasma + railgun, or sniper + railgun (one plasma) | wins with about 7 lives |
| No anti-air (railgun, garrison, dragon) | loses |
| Mixed with a dragon instead of the garrison | wins with about 7 lives (about 5 without spells) |
| Mixed with garrison and dragon | wins 3 in 10 |
| Dragon-heavy (four dragons, two plasmas) | loses |

Plasma is still the strongest tower (about two thirds of the damage in the mixed build), as before.

The game's numbers are in the Game Tuner (`../tuner.json`, `tuning.schema.json`); `node tuning-check.mjs` checks the
schema's defaults still match `game.html`.

Source: `game.html` with placeholders; `build.py` embeds `assets/` (the map, `assets/map.webp`, is the Map v3 painting;
each tower's base and head layer is exported from `../towers2`) and the fonts into `dist/neon-wasteland.html`. `test.mjs` takes screenshots and
`sim.mjs` runs the bot playtests (`node sim.mjs [runs] [strategy,...]`); `dragon-test.mjs` checks the dragon's fire,
aim and the five-button build menu on every pad; `leash.mjs` checks garrison troopers stay in range; `living-test.mjs` checks the living map, measures its frame rate at
phone sizes and saves frames and a short clip of it (`shots/`). They need Playwright:
set `PLAYWRIGHT` to its `index.mjs` (they fall back to the cloud workspace's `/opt/node22` copy), and run them from this
folder after `build.py`. `build.py` writes `dist/neon-wasteland.html`: copy it over `neon-wasteland.html`, the file testers get.
`tools/trace_road.py` traces the enemy routes along the middle of the painted road (run it again if the map changes,
then paste its output into `game.html`); `walk.mjs` renders a crowd of enemies on both routes to check them.

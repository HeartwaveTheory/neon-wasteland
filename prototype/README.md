# Neon Wasteland: playable prototype

`neon-wasteland.html` is the whole game in one file. Open it in a browser (it works on phones; landscape shows the whole
map, and in portrait you drag to look around). It is a Kingdom Rush-style tower defense on the Neon Wasteland map:

- **5 towers** to build on the map's 4 build pads, each with 3 levels:
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

The map is **Map v3**: a painting (`../art/map-v3-source.webp`, 1672 × 941, the game's 1x size) with its 4 build pads,
the full-size AEGIS HQ and the roads as painted. The pads, HQ, gates and routes are measured from it (the routes with
`tools/trace_road.py`). It is half the resolution of the old 2x map art, so it looks softer on phones: a 2x repaint
would fix that.

**The living map** (`game.html`, "living map"), all drawn under the units: the acid moves (a drifting caustic shimmer on
the pool, streaks running down the falls and along the streams, bubbles popping), the lights glow and breathe (signs
flicker now and then, the gate beacons blink, the fires flicker, the welder at the chop shop flashes), particles rise
(embers off the fire, smoke from the data mine, toxic vapour off the acid, dust in the lamplight, sparks off the pylons),
energy pulses run along the power lines to the HQ, a searchlight sweeps from the HQ's watchtower, and the data-mine
portal swirls. The acid is found in the painting at load (its bright toxic green, inside hand-placed boxes); the lights,
wires and smoke sources are placed by hand. It's calmer with reduced motion (slower acid, steady lights, a third of the
particles, no pulses), stops while the tab is hidden, and its strength is in the Game Tuner (`fx.*`).

Balance, from bot playtests (`sim.mjs`, 10 runs per strategy; each bot builds its four towers as soon as it can afford
them, then spends everything on the cheapest upgrade). On this map the boss has 2800 HP (was 3400), so a good mixed build
can sometimes stop it.

| Strategy | Result |
|---|---|
| Mixed towers with spells (plasma, plasma, garrison, sniper) | wins every time, with 6–16 lives (about 12 on average) |
| Same, without spells | loses at wave 10 |
| Sniper + railgun (with one plasma), or plasma + railgun | wins with 19–20 lives |
| All sniper, all railgun, all garrison, all dragon | loses |
| All plasma | wins with about 10 lives: the boss always gets through |
| No anti-air (railgun + garrison, or dragons + garrisons) | loses at wave 7 |
| No upgrades | loses at wave 7 |
| Mixed with a dragon instead of the garrison | wins with about 9 lives (loses without spells) |
| Mixed with a dragon instead of the sniper | wins with about 17 lives |
| Sniper, plasma, railgun, dragon | wins with about 15 lives |
| Two dragons + two plasmas | wins with about 7 lives |
| Three dragons, or no anti-air on the right road | loses |

Plasma is still the strongest tower (about three quarters of the damage in the mixed build), as before.

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

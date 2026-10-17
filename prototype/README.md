# Neon Wasteland: playable prototype

`neon-wasteland.html` is the whole game in one file. Open it in a browser (it works on phones; landscape shows the whole
map, and in portrait you drag to look around). It is a Kingdom Rush-style tower defense on the Neon Wasteland map:

- **6 towers** to build on the map's 7 build pads, each with 3 levels:
  - **Sniper:** long range, hits flyers, weak against armour.
  - **Plasma:** chain lightning that ignores armour.
  - **Railgun:** a piercing line shot, ground only.
  - **Garrison:** three troopers with laser pistols block the road at a movable rally point and shoot whatever is in
    reach, flyers too (5/8/11 a shot, armour doesn't count).
  - **Garage:** a mechanics' garage (from `../art/garage/reference.png`). Its three mechanics (a driller, a riveter
    and one with a wrench) block the road and soak up hits (240/360/520 HP, armour 0.3/0.4/0.5, they patch
    themselves up between fights) but barely scratch an enemy (4/6/8 a hit). Every enemy inside its range moves
    25/30/35% slower, flyers too (a boss half as much): a red field on the ground, a red ring round each slowed enemy.
  - **Dragon:** a punk scrap-metal dragon that lobs napalm. Each glob leaves a fire patch on the road that burns
    every ground enemy walking through it (18/26/36 a second for 4/5/6 s, through armour). Patches don't stack, each
    dragon keeps at most 3, and drones and your own troopers are never hurt.
- **5 enemies**: the raider, the scout (a fast robot dog), the enforcer (armoured), the drone (flying, can't be
  blocked), and the mech boss in wave 10. The raider, scout, enforcer and mech come from the enemy turnaround sheet
  (`../art/enemies/`): they turn to face where they walk (front, three-quarter, side or back) and their legs step in
  time with the ground. The Garrison's troopers and the Squad's mercs wear the raider's rig in AEGIS blue and orange
  (the troopers with two laser pistols instead of its blades). The Garage's three mechanics wear it too, in the
  gunmetal and red of the mechanics in the garage painting (a grey or red helmet, a red or steel visor), each with his
  tool: a drill, a rivet gun, a wrench.
- **2 spells**: Airstrike (3 missiles) and Drop Squad (2 mercs who block for 18 s).
- **Waves**: 10 waves from two gates. Tapping the skull calls a wave early for bonus scrap. Selling refunds 60%.
- **Stars**: 18+ lives left is 3 stars, 6+ is 2 stars.

The map is **Map v3**: a painting (`../art/map-v3-source.webp`, 1672 × 941, the game's 1x size), with a smaller layout
made on it by `../maplab/map_v3_layout.py` (it writes `assets/map.webp`):

- **7 small pads** instead of 4 big ones: the painting's 4 pads at about half size (its own pad art, scaled) on cleared
  ground painted to match the road's sand (`paint_ground`: golden and ochre patches, brush strokes, pebbles, cracks,
  scraps, tyre tracks, worn rings round the pads, shade by the rocks), a 5th beside the 3rd on the same ledge, and 2 on the plaza either side of the road.
- **A half-size AEGIS HQ**, further down the plaza; the road (with its rope fences) runs on through the plaza to its
  gate, so enemies walk about 180 px further. Its power lines run from the same two pylons to the smaller HQ.

The map image is 2x (3344 × 1882) so it stays sharp when zoomed in: the script upscales its 1x composite 4x with
Real-ESRGAN's anime model (`../art/upscale/upscale.py`), brings it down to 2x and cel-shades it there; the game draws it
over the 1x map coordinates. The pads, HQ, gates and routes are measured from that map (the routes with `tools/trace_road.py`), and the living map's
HQ lights, searchlight and power-line pulses move with the HQ (`hqAt` in `game.html`). The painting is half the
resolution of the old 2x map art, so it looks softer on phones: a 2x repaint would fix that.

**Ruins and debris** (also made by `map_v3_layout.py`), clear of the road, the pads, the flags and the fences:

- Wrecks cut from the painting and wrecked at 4x (`wreck`): a burnt-out container recoloured to rust, a caved-in shed,
  a dead army truck (smashed windscreen, a wheel gone and its axle on a cinder block), and two ore cars crashed at the
  edges of the pad clearings. Their damage: soot from the top, rust patches, dents, roof holes with a dark inside, a
  rusty rim, bent flaps and soot rising above. Labels are painted out so they don't read as the HQ's own buildings.
- Small props drawn in the painting's style (`maplab/props.py`, 4x, ink outlines, lit from the upper left): oil drums
  (hazard yellow, rust red, blue; standing or knocked over), tyre stacks and a leaning tyre, crates (one smashed), bent
  scrap sheets, a rusty pipe and a toppled street lamp with its glass on the ground.
- Scorch marks under the burnt wrecks, oil under the truck and the spilt drums, rubble at the bases.

**The look:** everything is cel-shaded with one filter (`../art/cel/`): flat bands of light with hard-edged shadows,
ink on the edges, hatching in the shadows. The characters are also graded into the map's warm dusk light (warm greys,
violet shadows, an orange rim of light from the upper left, road dust on their feet) and drawn about as soft as the map.

**Aiming:** the Sniper's rifle and the Railgun's cannon turn to point at their target (up to about 40° and 32°), and
every shot (rifle tracer, rail beam, plasma bolt, dragon glob) leaves from the posed muzzle (`mouthAt`), recoil and all.

**The living map** (`game.html`, "living map"), all drawn under the units: the acid moves (a drifting caustic shimmer on
the pool, streaks running down the falls and along the streams, bubbles popping), the lights glow and breathe (signs
flicker now and then, the gate beacons blink, the fires flicker, the welder at the chop shop flashes), particles rise
(embers off the fire, smoke from the data mine, toxic vapour off the acid, dust in the lamplight, sparks off the pylons),
energy pulses run along the power lines to the HQ, a searchlight sweeps from the HQ's watchtower, and the data-mine
portal swirls. The acid is found in the painting at load (its bright toxic green, inside hand-placed boxes); the lights,
wires and smoke sources are placed by hand. It's calmer with reduced motion (slower acid, steady lights, a third of the
particles, no pulses), stops while the tab is hidden, and its strength is in the Game Tuner (`fx.*`).

Balance, from bot playtests (`sim.mjs`, 4 to 10 runs per strategy; each bot builds its plan on all 7 pads as soon as it can
afford each tower, a four-tower plan carrying on with its first three on pads 5-7, then spends everything on the
cheapest upgrade). The numbers are the same as before the smaller layout: the 3 extra pads spread the scrap thinner, so
the longer road makes it only a little easier. The boss has 2800 HP.

| Strategy | Result |
|---|---|
| Mixed towers with spells (plasma, plasma, garrison, sniper) | wins every time, with about 18 lives (15 using only pads 1-4) |
| Same, without spells | wins with about 17 lives |
| Mixed with the Garage instead of the Garrison | wins every time, with about 18 lives (13 without spells) |
| Plasma, plasma, Garage, dragon | wins every time, with about 17 lives |
| Garage + railgun, Garage + Garrison, Garage + snipers, all Garage | loses (at wave 10, 10, 9 and 5-7) |
| Sniper + railgun (with one plasma), or plasma + railgun | wins with 6–10 lives |
| All sniper, all railgun, all garrison, all dragon | loses |
| All plasma | wins with about 9 lives |
| No anti-air (railgun + garrison, or dragons + garrisons) | loses at wave 8 (the troopers' lasers hit flyers, but not enough on their own) |
| No upgrades | loses at wave 10 |
| Mixed with a dragon instead of the garrison | wins with about 7 lives (loses without spells) |
| Mixed with a dragon instead of the sniper | wins with about 16 lives |
| Sniper, plasma, railgun, dragon | wins with about 7 lives |
| Two dragons + two plasmas | wins with about 7 lives |
| Three dragons | loses |
| Plasma, dragon, garrison, sniper (nothing but the troopers hits drones on the right road) | wins with about 2 lives |

Plasma is still the strongest tower (about three quarters of the damage in the mixed build), as before. The laser
Garrison deals about 15% of it (its melee troopers dealt about 9%); the Garage about 5%: it's there to hold enemies
and slow them for the others.

The game's numbers are in the Game Tuner (`../tuner.json`, `tuning.schema.json`); `node tuning-check.mjs` checks the
schema's defaults still match `game.html`.

Source: `game.html` with placeholders; `build.py` embeds `assets/` (the map, `assets/map.webp`, is the Map v3 painting;
each tower's base and head layer is exported from `../towers2`) and the fonts into `dist/neon-wasteland.html`. `test.mjs` takes screenshots and
`sim.mjs` runs the bot playtests (`node sim.mjs [runs] [strategy,...]`); `dragon-test.mjs` checks the dragon's fire,
aim and the six-button build menu on every pad; `garage-test.mjs` checks the Garage (its field, its mechanics) and the
Garrison's lasers; `leash.mjs` checks both towers' troops stay in range; `living-test.mjs` checks the living map, measures its frame rate at
phone sizes and saves frames and a short clip of it (`shots/`). They need Playwright:
set `PLAYWRIGHT` to its `index.mjs` (they fall back to the cloud workspace's `/opt/node22` copy), and run them from this
folder after `build.py`. `build.py` writes `dist/neon-wasteland.html`: copy it over `neon-wasteland.html`, the file testers get.
`tools/trace_road.py` traces the enemy routes along the middle of the painted road (run it again if the map changes,
then paste its output into `game.html`); `walk.mjs` renders a crowd of enemies on both routes to check them.

# Neon Wasteland: playable prototype

`neon-wasteland.html` is the whole game in one file. Open it in a browser (it works on phones; landscape shows the whole
map, and in portrait you drag to look around). It is a Kingdom Rush-style tower defense on the Neon Wasteland map:

- **4 towers** on the map's 4 build pads, each with 3 levels:
  - **Sniper:** long range, hits flyers, weak against armour.
  - **Plasma:** chain lightning that ignores armour.
  - **Railgun:** a piercing line shot, ground only.
  - **Garrison:** three troopers block the road, with a movable rally point.
- **5 enemies**: scav, rider (fast), brute (armoured), drone (flying, can't be blocked), and the Warlord boss in wave 10.
- **2 spells**: Airstrike (3 missiles) and Drop Squad (2 mercs who block for 18 s).
- **Waves**: 10 waves from two gates. Tapping the skull calls a wave early for bonus scrap. Selling refunds 60%.
- **Stars**: 18+ lives left is 3 stars, 6+ is 2 stars.

Balance, from bot playtests (`sim.mjs`, 3 runs per strategy):

| Strategy | Result |
|---|---|
| Mixed towers with spells | wins with 11–16 lives |
| Same, without spells | about a coin flip |
| Plasma + railgun, or sniper + railgun | wins |
| All sniper | loses at wave 8 (swarms) |
| All railgun, all garrison | lose at wave 7 (no anti-air) |
| No upgrades | loses at wave 7 |

Source: `game.html` with placeholders; `build.py` embeds `assets/` (the map and each tower's base and head layer, exported
from `../maplab` and `../towers2`) and the fonts into `dist/neon-wasteland.html`. `test.mjs` takes screenshots and
`sim.mjs` runs the bot playtests (both need Playwright).
`tools/trace_road.py` traces the enemy routes along the middle of the painted road (run it again if the map changes,
then paste its output into `game.html`); `walk.mjs` renders a crowd of enemies on both routes to check them.

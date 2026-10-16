# Layout v2: smaller pads, more of them, a smaller HQ and a longer road

**Replaced by Map v3** (issue #4): the game now uses the painted map with its 4 pads and full-size HQ.

**Built** (issue #2): `layers/pads.mjs`, `layers/hq.mjs` (the compound is scaled in `build()`; `roadOn` paints the new
stretch), `layers/power.mjs` (the first pylon of each line moved onto the plaza so the spans clear pads 9 and 10),
`layers/props.mjs` (the red wreck moved off pad 8) and `layers/roads.mjs`; the game's pads, HQ, routes and balance.

The user asked: **shrink the build pads so at least 3 more fit comfortably, and shrink the end building (the AEGIS HQ)
so enemies walk further before they reach the end.** Coordinates: **1x** = the game's logical map (1672 × 941),
**2x** = the map art (3344 × 1882). Ground distances use the game's ellipse metric (`edist`: dy divided by 0.7).

## Build pads: 10, each smaller

Pad size, **1x**: drawn slab rx **44**, ry **22** (2x: 88 × 44). The old slab was 2x rx 150–184. A tower's base plate at
game scale is rx 31 / ry 16 (1x), so it sits on the pad with margin. Tap target in the game: rx 50 / ry 27.

| # | 1x centre | note |
|---|---|---|
| 1 | (458, 162) | old pad, left road (in its old clearing) |
| 2 | (1025, 218) | old pad, right road |
| 3 | (548, 345) | old pad, left road |
| 4 | (1197, 362) | old pad, right road (far side) |
| 5 | (185, 205) | NEW, below the left gate, on the rocks left of the road |
| 6 | (1118, 165) | NEW, below the right gate's DANGER wall, left of the right road |
| 7 | (655, 322) | NEW, right of pad 3, toward the BOOMWERKS billboard |
| 8 | (330, 330) | NEW, below the left road, under the red wreck |
| 9 | (775, 630) | NEW, in the HQ plaza, left of the new road stretch |
| 10 | (995, 630) | NEW, in the HQ plaza, right of the new road stretch |

Every pad is 105–155 (edist) from the nearest road centre: inside every tower's range (the shortest is 200), off the road
surface. The six new pads need a **dirt clearing** under them (a ground patch matching the old pads' clearings), so they
sit on cleared ground instead of on rocks or brush. Nothing tall (billboards, lamps, pylons, wrecks) may stand on a pad.

## The HQ: half size, moved down; the road runs on to it

- The whole AEGIS compound (layer `hq`: gate, sign, mast, watchtower, barricades, main block, power block, ramp,
  crates, lamps, poles, barracks, garage, truck, cables, flags, fences, its forecourt and shadows, its light) is
  scaled by **s = 0.5** with the transform `p' = A + s · (p − A0)`, **2x**: A0 = (1770, 1096) (where the road met the HQ:
  the top of the AEGIS gantry), A = **(1770, 1440)**. In 1x: the old road end (884, 548) becomes **(885, 720)**.
- Keep the HQ layer's `erase` polygon and its sand `dressing` **unscaled**: they still remove the old castle and cover the
  whole old footprint with plaza sand, so the space the HQ gives up becomes open plaza.
- The power lines that start at the HQ (`layers/power.mjs`, the east line from the antenna tower and the west line from
  the west wing) must start at the same HQ points after the transform.
- **Road extension:** the road continues from 1x (884, 548) straight down to **(885, 720)** through the plaza, painted
  to match the existing road (same bright sand, same width, same edge treatment), with the faint tyre tracks and the
  reflector posts continuing along it (posts must avoid pads 9 and 10). It must be the brightest surface there, so the
  route tracer (`prototype/tools/trace_road.py`, which follows the road's brightness) follows it to the new gate.

## The game (`prototype/game.html`)

- `PADS` = the 10 centres above; pad drawing and tap sizes from the pad size above; the level chevrons and anything sized
  to the old pads follow.
- `HQ = { x: 885, y: 720 }`; the routes end at the new gate (re-traced from the new map with `tools/trace_road.py`, end
  point (884, 720)).
- More pads and a longer road make the game easier: **rebalance with the bot playtests** (`sim.mjs`) so mixed builds
  with spells still win with roughly 10–16 lives, weak strategies (one tower type, no upgrades, no anti-air) still lose,
  and no single tower dominates.

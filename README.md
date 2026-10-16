# Neon Wasteland

A Kingdom Rush-style tower defense with a cyberpunk × Borderlands look: the map, the first four towers, and a playable
prototype (`prototype/neon-wasteland.html`, one file, open it in a browser).

## What's here

- `art/map.png` (1672 × 941) and `art/map-2x.webp`: the **Neon Wasteland** map. It is the user's reference map
  (`maplab/ref/map.webp`) repainted as a sun-baked Borderlands-style canyon with cyberpunk tech: the two enemy gates, the
  junction and the AEGIS HQ at the bottom. Layout v2 (`maplab/LAYOUT.md`) has 10 smaller build pads and a half-size HQ
  further down, with the road running on through its plaza.
- `art/towers/*.png` (512 × 512) and `art/towers/layers/*-base.png` / `*-head.png`: the first four towers, drawn from the
  user's tower reference (`towers2/ref/towers.jpg`). Each has a static base layer and a weapon / top layer the game can
  turn or animate:
  - **SNIPER**: long range, single target
  - **PLASMA**: chain lightning
  - **RAILGUN**: a piercing heavy shot
  - **GARRISON**: troops that block the road
- `art/towers-lineup.png` and `art/towers-on-map.webp`: the set side by side, and the towers on the map's pads at game scale.

## How it's made

Everything is drawn in code (SVG) with one shared kit, so the map and the towers share ink weight, lighting (from
the upper-left) and texture:

| File | What it is |
|---|---|
| `towerlab/kit.mjs` | core kit |
| `maplab/mapkit.mjs` | map props |
| `towers2/tkit.mjs` | tower parts |
| `maplab/MAP.md`, `towers2/BRIEF.md` | the art briefs |

To rebuild (Node 22 with Playwright's Chromium, Python 3 with OpenCV):

```
python3 -m venv venv && venv/bin/pip install opencv-python-headless numpy
cd maplab && node compose.mjs              # map -> maplab/out/map.png, map-2x.png, crops
cd ../towers2 && node render.mjs --sheet   # towers -> towers2/out/png, layers, lineup.png, on-map.png
```

The scripts import Playwright from `$PLAYWRIGHT` (the path to its `index.mjs`), or the cloud workspace's copy at
`/opt/node22/lib/node_modules/playwright` when that isn't set, e.g.
`PLAYWRIGHT=~/path/to/node_modules/playwright/index.mjs node compose.mjs`.

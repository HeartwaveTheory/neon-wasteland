# The cel-shaded look

`celshade.py` is one filter that gives the whole game its cel-shaded (Borderlands-style) look: the broad light of each
surface snapped into a few flat bands with hard-edged steps, the painted detail laid back on top, ink on the real
edges, and hatching in the darkest band. Its `px` says how many of an image's pixels make one pixel of the 1x map, so
lines and hatching come out the same size on screen for every asset.

It runs as the last step of each asset's script:

| Asset | Script | Strength |
|---|---|---|
| The map (`prototype/assets/map.webp`) | `maplab/map_v3_layout.py` (on the 4x-upscaled map brought to 2x, the size it ships at) | full |
| The towers (`prototype/assets/<tower>-<base/head>.webp`) | `art/cel/towers.py`, from the unshaded originals in `raw/towers/` | lighter (they're already inked) |
| The enemies and troops (`prototype/assets/units/`) | `art/enemies/turnaround.py` (`grade`) | full, no extra outline |

Never edit the tower `.webp` files in `prototype/assets/` by hand: change the originals in `raw/towers/` (or re-export
them from `towers2/`) and run `venv/bin/python -I art/cel/towers.py`. Then rebuild the game (`python3 prototype/build.py`).

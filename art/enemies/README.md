# Enemy sprites from the concept sheet

`concept.png` (2000 × 1116) is the enemy concept sheet: the scout, raider, enforcer and mech, each on a pedestal in a
gold frame. The game's sprites for those four are cut straight from it, so in the game they look exactly like it.

`cut.py` (run it with the repo's `venv`: `venv/bin/python -I art/enemies/cut.py`) does it:

1. **Cut:** inside a box round each enemy, it keeps the regions the art's black ink lines close off, minus those that
   reach the box's edge (the wall and the pedestal) or match the wall's or pedestal's colour (gaps between the legs),
   plus the ink round them. A few spots are set by hand: `DROP` / `DROP_AT` (background it still kept), `WALLS`
   (where the pants fade into the shadow with no ink line), `KEEP` / `KEEP_INK` (the mech's vent box, the antennae),
   `HOLES` (a wall line, a drip of pedestal ink). `cutouts/*.png` are the results at full size.
2. **Strip:** each cut-out faces right (the concepts face left, so the scout, raider and mech are flipped), scaled so
   it fits the game's 320 px frame, feet at (160, 300), into `prototype/assets/units/<name>.webp`: frames 0-5 walk (a
   bob, a sway and a squash on each step), 6-7 attack (a wind-up leaning back, then the hit lunging forward). It
   prints each sprite's height in the game's 160-unit frame: that is `sh` in `game.html` (`ENEMIES`).

`review.png` shows all four strips. Rebuild the game afterwards (`python3 prototype/build.py`).

# Enemy and troop sprites from the turnaround sheet

`turnaround.png` (2000 × 1116) is the enemy turnaround sheet: the scout, raider, enforcer and mech, each drawn from the
front, three-quarter, side and back. The game's sprites for those four, and for the player's troops, come from it, so
they look exactly like it. (`concept.png` is the earlier single-pose concept, kept for reference.)

`turnaround.py` (run it with the repo's `venv`: `venv/bin/python -I art/enemies/turnaround.py`) makes them:

1. **Cut:** each figure is cut from the sheet: the regions its black ink lines close off, minus the background, the
   grid, the disc it stands on and its glowing ring, and the painted shadow; plus the ink round them, and its neon (the
   blades, the eyes) by colour. A few things are set by hand: `LEGS` (each leg's rough centre), `FORCE` (the raider's
   backpack, drawn with grey lines), `DARK_LEGS` (the raider's near-black legs).
2. **Rig:** each figure is split into its body and its legs at the hip (`RIG`). In the side and three-quarter views the
   legs swing from the hip and lift (a trot for the dog: the far legs are darker copies half a stride out); in the front
   and back views they step, lifting in turn, and the body rocks over the planted foot and bobs.
3. **Sheets:** `prototype/assets/units/<name>.webp`: one row per view (front, three-quarter, side, back), 8 walk frames
   then 2 attack frames (a wind-up, then the hit, side on), feet at the bottom middle. It prints each
   sprite's height in the game's 160-unit frame: `sh` in `game.html` (`ENEMIES`, and `SHEETS` for the troops).
4. **The look:** before rigging, each figure is graded into the map's look (`grade`): its light warmed (orange from
   the upper left, violet in the shadow), its colours calmed and its highlights softened, its lines a warm near-black,
   grime and road dust on its legs, a warm rim light, then the game's cel shading (`../cel/celshade.py`). The frames are
   saved at 128 px, about as soft as the map.
5. **Troops:** the Garrison's troopers and the Drop Squad's mercs wear the raider's rig re-skinned (`SKINS`): AEGIS blue
   with a cyan visor, and orange.

In the game (`game.html`, `SHEETS` / `viewOf`), every unit shows the view that matches where it's heading (coming down
the screen: its front; on a diagonal: its three-quarter view; across: its side; going up: its back) and turns smoothly;
its walk frames follow the ground it covers (`stride`), so the feet don't slide.

`review.jpg` shows every sheet. Rebuild the game afterwards (`python3 prototype/build.py`).

# Enemy sprites from video

**Replaced (Oct 17, 2026):** the game's raider, scout and mech now come from the enemy concept sheet (`../enemies/`).
These sheets are kept for reference.

The game's **raider**, **scout** and **mech** are cut from short animated clips of the Forge's enemy concepts. The
enforcer and drone still use the drawn-in-code art from `units/` until they get clips of their own.

| Sheet | What | Frames | Speed |
|---|---|---|---|
| `raider-run.webp` | the raider running right | 9 | 12 fps |
| `scout-run.webp` | the scout (robot dog) galloping right | 14 | 24 fps |
| `mech-walk.webp` | the mech walking right, one full stride | 36 | 12 fps |

Each sheet is one seamless loop on a transparent background, with a `.json` beside it: frame size, columns and rows,
frame count, fps, and the feet anchor (where the character touches the ground). The ground shadow from the clips is
removed: the game draws its own.

## How they were made

1. **Concepts:** Forge request `51e01455` (Leonardo, `.forge/51e01455.json`): `assets/forge/concepts/*.jpg`.
2. **Clips:** the lead animated the raider, scout and mech concepts into 6.5 s videos with Hailuo (MiniMax), 768 × 768:
   "make this guy just keep walking right quickly", "make this guy walk slowly to the right", "make this robotic dog
   keep running and hopping".
3. **Sheets:** `tools/extract.py <videos dir> ..` keys out the flat grey background, removes the ground shadow and
   packs the chosen loop.
4. **Game strips:** `tools/strips.py .. ../../prototype/assets/units` turns each sheet into the game's unit strip
   (8 frames of 320 px, feet at (160, 300); frames 0–5 walk, 6–7 attack). The clips have no attack, so frames 6–7
   are stand-ins (the walk pose leaned back, then lunging forward) until there are attack clips.

Run both with the repo's `venv` (OpenCV, NumPy, Pillow). Then rebuild the game (`python3 prototype/build.py`).

## Rights

These come from Leonardo concept art, which TEAM.md treats as concept work only until Leonardo confirms the studio
owns it. The studio lead chose to ship them anyway on Oct 16, 2026. Hailuo's terms for the clips haven't been checked
either. Don't copy these into `HeartwaveAssets` until both are settled.

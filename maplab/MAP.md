# Neon Wasteland map: brief

**No longer the game's map** (Map v3, issue #4): the game uses the painted map `../art/map-v3-source.webp`. This
folder made the earlier, code-drawn map and is kept for reference.

We are redesigning the reference map (`ref/map.png`, 1672 × 941, a hand-painted fantasy frontier valley) into a
**cyberpunk × Borderlands** tower-defense map, chosen direction **"Neon Wasteland"**:

> A Borderlands-style sun-baked canyon (ochre dust, rust-red cliffs, thick ink outlines, hatching, cel-shaded
> colour bands) with cyberpunk tech bolted on: neon signs, holo billboards, cables and power lines, a corp HQ
> fortress as the base, a toxic coolant pool. Dusk light (warm orange key light from the upper-left, violet-indigo
> shadows) so the neon pops, but bright enough to read on a phone.

The **layout stays the reference's**: the same roads, the same four build pads, the same cliffs and forests
(restyled), the base at the bottom centre. We repaint and replace; we don't move the gameplay.

The towers will be redesigned later to match this map, so the map sets the look for the whole game.

## Gameplay readability (the map is a game board first)

- Enemies enter at the **two gates** (top-left road end, top-right road end), the roads **merge at the junction**
  (~ 2x (1760, 760)), and run down to the **HQ** at the bottom centre, which the player defends.
- The **road must stay the clearest, brightest path** on the map. Never block or cover a road with objects.
  Dressing on the road (tyre tracks, stains, guide lights, lane paint) must stay subtle.
- The **four build pads** must read instantly as "build a tower here". Nothing tall may stand on or right in front of a pad.
- Enemy gates should read as danger (red / hazard / warning lights); the HQ as home (cyan / friendly).
- At 1x (`out/map.png`, the size the player sees) everything important reads from shape and colour alone.

## The look

**Borderlands:** heavy dark ink outlines (`P.ink` #1a140e), cel-shaded bands, hatching in shadows, chunky
exaggerated shapes, junk-built everything (corrugated metal, scrap plates, welded pipes, tyres, wrecked cars),
spray-paint graffiti, skull and bandit motifs, humour in the details. Never copy Borderlands IP (no Claptrap,
no vault symbol, no real manufacturer names).

**Cyberpunk:** neon tubes and signs, holo billboards, LED strips, antennae, dishes, power pylons and sagging
cables, megacorp branding, light pools on the ground under lamps and signs, coloured haze.

**Shared rules with the towers (they will stand on this map):** high 3/4 top-down view (front faces + tops, right
sides just visible), light from the upper-left, shadows to the lower-right, 2x map scale = tower sprite scale 1:1.

**Colour plan:** ochre / rust / dusty olive for the land; violet-indigo shadows; neon accents: **cyan** (friendly,
HQ), **magenta** (ads, city), **amber** (street lamps), **red** (enemy gates, warnings), **toxic green** (coolant
pool, waste). Neon is an accent, not wallpaper: the land stays the majority.

**Brands for signs and ads** (fictional, ours): PRISMATIK (lasers), BOOMWERKS (missiles), SCORCH&SONS (fire),
VOLTAMP (electric). Invent others freely (a noodle bar, a scrap dealer, a bandit gang tag). The HQ's own name is
the HQ artist's call (short, neon, readable).

## Regions and owners (2x map px; the reference's coordinates × 2)

| Owner | Region | Was | Becomes |
|---|---|---|---|
| stylist | everything (`restyle.py`) | painted frontier | the cel-shaded Neon Wasteland base: palette, ink, hatching, light |
| hq | `hq` crop: x 1100–2400, y 940–1760 | castle, its walls, two huts, fences and banners | the corp HQ fortress you defend: concrete and scrap walls, neon sign, dishes, gate where the road ends, holo flags |
| north | `gate-left`, `gate-right`, `pond`, `mine` crops | two timber gatehouses, a pond, a quarry mine | enemy gates (breach in a scrap wall, warning lights, skull graffiti), a toxic coolant pool with waste pipes, a scrap refinery / data mine |
| flanks | `lumber`, `quarry`, `south-edge` crops | lumber camp (left), stone quarry (bottom right), cliffs | a bandit chop-shop / shanty camp, a container yard / junkyard with a crane or magnet, graffiti and junk on the south cliffs |
| routes | `pads-north`, `pads-south`, `junction` crops + the open land between regions | dirt pads, roads, scattered scenery | concrete tech build pads, road dressing (tracks, stains, guide lights, lane paint at the junction, a road sign), power pylons and lines across the map, billboards and small props in the open land |

Stay inside your regions (routes: in the open land and along the roads, not inside other owners' crops). Where
regions meet, keep it plain so neighbours can join up.

Key coordinates (2x): the 10 pads are `PADS` in `layers/pads.mjs` (Layout v2, `LAYOUT.md`: slab rx 88 / ry 44). Left gate: road enters ~ (300–560, 0–200).
Right gate: road enters ~ (2400–2860, 0–220). Junction ~ (1760, 760). HQ / castle complex ~ (1300–2100, 1020–1660).
Pond ~ (1580–2000, 190–420). Mine ~ (2560–3344, 120–660). Lumber camp ~ (360–1000, 1180–1600). Quarry ~ (2400–3344, 1000–1520).

## Technical

- `compose.mjs` builds the map: the restyled base (`restyle.py` → `out/base.png`) + every layer in `layers/*.mjs`.
  - `node compose.mjs --crop <name>` renders one region fast → `out/crops/<name>.png` (native 2x pixels).
  - `node compose.mjs --crop <name> --only <layer>` shows only your layer on the base.
  - `node compose.mjs` renders the whole map → `out/map-2x.png`, `out/map.png` (1x) and every crop.
  - `node compose.mjs --list` lists crops and layers.
- A layer: `export default { name, z, erase, build(K) }`. `build` returns `{ ground, objects, light }` strings:
  - `ground`: flat things without ink outline (patches, decals, tracks, pools, stains).
  - `objects`: standing things, wrapped in `K.part('<unique name>', () => ...)` for the ink outline and neon glow.
    Draw back to front (higher y = nearer = later).
  - `light`: additive light (screen blend). Prefer `K.lightPool`, `K.lightCone`, `K.haze`, which collect automatically.
- `erase`: polygons (2x px) that `restyle.py` inpaints out of the base before styling, so old buildings don't peek
  out around new ones. Changing them re-runs the restyle automatically (~10 s). Pair it with a `K.groundPatch` under
  your new structure.
- `mapkit.mjs` = the tower kit (`../towerlab/kit.mjs`: read both fully) + map props: containers, corrugated metal,
  concrete, chain-link fences, pylons and power lines, billboards, drums, tyres, wrecks, street lights, graffiti,
  ground patches, aprons, tracks, stains, light pools.
- **Only edit your own files.** Never edit `mapkit.mjs`, `../towerlab/kit.mjs` or `compose.mjs`, or another owner's
  layer (other artists work in parallel). Put extra helpers in your own layer file. If a kit primitive is broken,
  work around it locally and say so in your report. The stylist alone edits `restyle.py`.
- The base can be regenerated by another artist while you work (atomic writes, so it's safe). Re-render if it changed.

## How to work

1. Read this file, `mapkit.mjs`, `../towerlab/kit.mjs`, `compose.mjs`; look at `ref/map.png` and the reference
   crops (`ref/grid-*.png` have a 100 px grid in 1x coordinates).
2. Render your crop(s), **look at them with the Read tool**, fix, repeat. Expect many rounds. Judge at native size
   (the crop) and at 1x (`out/map.png` after a full compose).
3. Before you finish: run a full compose and look at `out/map.png` and your crops once more.

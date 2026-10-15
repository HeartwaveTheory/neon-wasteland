# First tower assets: brief

The user gave a tower reference (`ref/towers.jpg`; one crop per tower in `ref/<name>.png`, close-ups in
`ref/<name>-top.png` / `-bot.png`) and asked us to use it as **inspiration for the first 2D tower assets**.
Four towers: **SNIPER, PLASMA, RAILGUN, GARRISON**.

They stand on the **Neon Wasteland** map (`../maplab/out/map.png`, being finished in parallel by other artists): a
Borderlands-style cel-shaded ochre canyon with cyberpunk tech. So: take the reference's designs, silhouettes and
details, and draw them in our kit's style (thick dark ink outlines, cel-shaded bands, hatching in shadows, light
from the upper-left, shadow to the lower-right). Dark steel towers on ochre ground read strongly; keep them dark
and neon-lit like the reference.

Inspiration, not a copy: keep each tower's identity and its signature features (listed below), redraw everything
ourselves, simplify where the game scale needs it, and add our own touches where they help.

## Shared look (all four)

- The **octagonal base plate** (`K.basePlate`) with cyan LED tiles is the shared footprint (ground centre
  (256, 420), rx ~136 / ry ~68). Junk on the plate: barrels, shells, crates, grates, hazard stripes, sandbags.
- Dark blue **gunmetal** and near-black plating (`T.gun`, `T.dark`), carbon-fibre texture, rivets, pale-cyan edge
  highlights (`T.rim`), rust accents, cables in blue / violet, spikes.
- **Neon**: cyan and violet are the shared accents; each tower has a signature colour (below).
- Tall and narrow like the reference: ~340–390 px from the ground (top no higher than y ≈ 24), at most ~300 px wide.
- Borderlands humour in small doses (a sticker, graffiti, a duct-taped fix, a hand-painted warning).

## The four towers

**SNIPER**: long range, single target, hits air (Kingdom Rush's archer / musketeer line). Signature: violet
neon + a red laser sight.
- A tall timber-and-steel scaffold on a stone-block foot, X-braced legs, a ladder up the front right.
- The sniper nest on top: mesh floor, a hazard-striped armour shield with a cyan crosshair holo icon, antennae and
  two satellite dishes.
- **Head layer**: a big sniper rifle with a scope on a tripod / bipod, a red laser-sight beam.
- A camo net canopy draped under the nest, blue / violet cables hanging, a vertical violet neon sign "SNIPER",
  a second cyan sign, two floodlights on the right, a corrugated awning at the foot.

**PLASMA**: chain lightning that ignores armour, hits air (Kingdom Rush's mage / tesla line). Signature: cyan +
violet electricity.
- A cylindrical reactor of stacked dark-steel drums; a spiral skirt of ribbed blue / violet coil fins and cables
  wrapping the middle; a side emitter lens spitting an arc.
- **Head layer**: the crown: a big torus on a spindle with copper rings, 4–5 glowing canisters (cyan and violet)
  around it, holographic rings orbiting, electric arcs.
- Cable loops round the crown, pipes, a terminal box with a cyan screen, gas tanks at the foot, a graffiti tag,
  a warning sign.

**RAILGUN**: a slow, heavy, piercing shot that punches through a line of enemies (Kingdom Rush's artillery role).
Signature: orange rail glow + red laser.
- A massive round armoured tower that flares at the bottom: ribbed steel bands with big rivets, a hazard band,
  copper-glowing coolant slots between bands, spikes round the top ring.
- An arched armoured door on the front left, a cluster of hydraulic pods on the left, bright graffiti on the lower
  front (magenta / cyan / green), olive ammo shells with brass bands stacked on the plate, rusty barrels.
- **Head layer**: the railgun on a yoke: long twin rails with a glowing orange core, blue accent stripes, a small
  green screen, a red laser sight.

**GARRISON**: sends a squad of scrap troopers (and a drone) out to block the road (Kingdom Rush's barracks).
Signature: red / blue police lights + violet skull banner.
- A boxy bunker-tower of corrugated sheets and riveted plates, spikes everywhere, a jail-bar gate at the bottom
  front (where the troops come out), plank barricade fragments, a pipe chimney with a spike tip.
- **Head layer**: the armoured top cabin with a visor slot, a blue neon emblem, red / blue police lights, an
  antenna, a megaphone (with a light beam), the violet skull banner on a pole.
- Floodlights, a little drone hovering at the side, hand-painted signs, barrels, tools on the plate.

## Technical

- One file per tower: `towers/<name>.mjs` exporting `[ { id: '<name>', family: '<name>', tier: 'I', order: 1,
  name: 'Sniper', role, weapon, muzzle: [x, y], build(K) } ]`. `role` / `weapon`: one plain sentence each.
- `K` is a `TowerKit` (`tkit.mjs`) = MapKit (`../maplab/mapkit.mjs`) + the tower kit (`../towerlab/kit.mjs`).
  Read all three fully. Look at `../towerlab/towers/laser.mjs` for a full tower example (structure, parts, glow).
- Parts back to front: `K.part('base', …)` (static), `K.part('head', …, pivot)` (the weapon / animated top;
  must be complete on its own), optional `K.part('front', …)`. Shadow via `K.doc(body, { title, shadow })`.
- Glow only through the kit's glow helpers. Don't edit the shared kits or `render.mjs`; put helpers in your file.
- Render: `cd <towers2> && node render.mjs <name>` → `out/png/<name>.png`, `out/layers/<name>-base.png` /
  `-head.png`, `out/review/<name>.png` (full size, on a map pad at true game scale, and 2x).
  `node render.mjs --sheet` → `out/lineup.png` (all four side by side like the reference) and `out/on-map.png`.

## Quality bar

Put each review sheet next to the matching `ref/<name>.png`: the silhouette and the signature features should be
recognisable at a glance, with comparable richness. At true game scale on the pad, the tower must read from
silhouette + signature colour alone. No floating parts, no z-order mistakes, light from the upper-left.

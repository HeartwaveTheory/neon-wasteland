# DRAGON: the punk dragon fire tower (spec)

The user asked for: **a tower that launches patches of flames that stay on the ground for a period of time, with a
punk dragon theme.** It is the 5th tower in the Neon Wasteland prototype (`prototype/game.html`), next to Sniper,
Plasma, Railgun and Garrison.

## Role in the game

Area denial on the road. It does little damage on impact, but the fire it leaves keeps burning everything that walks
through it, so it is strongest on slow, dense, armoured crowds (Raiders in a column, Enforcers held by a Garrison) and
weak against fast Scouts and useless against flying Drones. It must not make the other towers pointless.

## Mechanics (starting numbers; tune them with the bot playtests)

| | Lv 1 | Lv 2 | Lv 3 |
|---|---|---|---|
| Cost (build / upgrade) | 110 | +150 | +210 |
| Range (ground ellipse, like the others) | 210 | 225 | 240 |
| Time between lobs (s) | 2.4 | 2.2 | 2.0 |
| Impact splash damage | 10 | 16 | 24 |
| Fire patch radius (logical px, ground ellipse) | 30 | 36 | 42 |
| Patch duration (s) | 4 | 5 | 6 |
| Burn damage per second in a patch | 12 | 18 | 26 |

- **The lob:** the dragon spits a glob of napalm that flies in an arc (about 0.6 s) to where its target **will be**
  when it lands: lead the target along its path by the flight time, so patches land on the road in front of enemies.
  Ground targets only (`air: false`); it never targets drones.
- **The patch:** where the glob lands, a fire patch burns for the duration. Every ground enemy inside takes burn damage
  each tick. Burn ignores armour (napalm sticks).
- **No stacking:** an enemy standing in several patches burns only from the strongest one, so piling up patches is not
  a free multiplier. Each Dragon keeps at most 3 live patches; a 4th removes its oldest.
- **Afterburn:** an enemy that leaves a patch keeps burning for 1 s at half the patch's rate (shows small flames on it).
- **Drones** are not hurt by patches. **Troopers** and squad mercs are not hurt by them either (friendly fire off).
- When a patch ends it leaves a short-lived scorch mark on the road (the existing `S.decals`).
- **Targeting:** like the other towers (the enemy closest to the HQ in range), but prefer an enemy that is **not already
  standing in fire**, so the dragon spreads its patches.

## Look (art)

A **punk dragon** in the Neon Wasteland style: the same ink weight, light from the upper-left, cel shading, hatching,
scrap metal and neon as the other four towers (`towers2/towers/*.mjs`), on the shared octagonal base plate
(`K.basePlate`).

- **The head (the `head` layer, which the game flips to face its target):** a big scrap-metal dragon head, bolted plates,
  a long snout with a jaw full of jagged teeth, glowing orange eyes, horns, and a **neon hot-pink mohawk** of spiky fins
  down the head and neck. Punk details: a **nose ring** and ear piercings (rings), a safety pin through one ear-fin,
  a **studded / spiked collar**, a chain. Fire licks from the mouth and smoke from the nostrils. The mouth is the muzzle.
- **The neck and body (`base` layer):** a segmented scrap-plate neck rising from a furnace / napalm-tank body, studded
  black leather panels with silver studs, a tartan patch, spikes, safety pins, a ripped flag, chains, pipes feeding
  the neck. At the foot: napalm drums with hazard stripes, a guitar-amp speaker stack (punk rock), spray-paint graffiti
  (own text, e.g. "BURN IT LOUD", a circle-A), a vertical neon sign in hot pink.
- **Signature colours:** hot pink neon + flame orange (the fire), on dark gunmetal. Different from the other towers'
  violet (Sniper), cyan (Plasma), orange-rail (Railgun) and blue-police (Garrison) at a glance.
- Tall and readable at game scale (the game draws towers at 0.23x of the 512 px sprite): silhouette first: the dragon
  head with its pink mohawk on top of a neck must read as "dragon" at a glance.
- Same technical rules as `towers2/BRIEF.md`: id `dragon`, family `dragon`, tier `I`, order 5, name `Dragon`, ground
  centre (256, 420), top no higher than y ~24; parts `base` then `head` (with a pivot), optional `front`; fill in
  `role`, `weapon` and `muzzle` (the mouth).

## Effects in the game (canvas)

- **The glob:** a pink-orange blob with a bright core, a smoke and ember trail, flying in an arc with a shadow on the
  ground that grows as it falls; a splash burst on impact.
- **The patch:** a dark burnt puddle (ground ellipse) with dancing flame tongues across it (animated, several layered
  flames, orange with yellow cores and pink tips), embers rising, a soft glow (additive). It flares up when created and
  dies down at the end.
- **Burning enemies:** small flames on them while they burn.
- **The dragon head:** opens/recoils when it spits (like the other towers' recoil), and a small mouth flame flickers.

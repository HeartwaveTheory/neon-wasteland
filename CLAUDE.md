# Neon Wasteland: notes for Claude

**Read `TEAM.md` in HeartwaveTheory/studio first, at the start of every session**
(`gh api repos/HeartwaveTheory/studio/contents/TEAM.md -H "Accept: application/vnd.github.raw"`, or attach the
studio repo). It's how our team works: branches, claims, the logs, and publishing by merging.

## The game

**Neon Wasteland**: a Kingdom Rush-style tower defense with a cyberpunk × Borderlands look. It's the lead's game, in
HeartwaveTheory since Oct 16, 2026. `README.md` covers the art and how it's drawn; `prototype/README.md` covers the
playable prototype (towers, enemies, spells, waves, balance).

## The prototype

- `prototype/game.html` is the source. `prototype/neon-wasteland.html` is the whole game in one file (map, towers and
  fonts embedded): the file testers play. Rebuild it after every change to `game.html` or `prototype/assets/`, and
  commit both.
- It's a web app that plays in a phone's browser (TEAM.md, "Phone prototypes are web apps").
- `prototype/README.md` covers the build script (`build.py`), the screenshot and bot-playtest scripts (`test.mjs`,
  `sim.mjs`, `dragon-test.mjs`, `leash.mjs`, `living-test.mjs`, `walk.mjs`) and `tools/trace_road.py`.
- The map is a painting (`art/map-v3-source.webp`, copied to `prototype/assets/map.webp`); `maplab/` no longer makes it.
  Pads, HQ, gates, routes and the living map's lights, acid boxes and wires are measured on it in 1x pixels. The Node scripts find Playwright
  through `$PLAYWRIGHT` (the path to its `index.mjs`).
- The game's numbers are connected to the Game Tuner (`tuner.json`, `prototype/tuning.schema.json`). Change a tuned
  number in `game.html` and the schema's `default` together; `node prototype/tuning-check.mjs` checks they match.

## Publishing

Merging into `main` publishes `prototype/neon-wasteland.html` to the Playtest Vault automatically
(`.github/workflows/vault-publish.yml`, with GitHub's own sign-in: no key in the repo).

- The pull request's title is the patch note, and `Resolves: <note ids>` marks tester notes done.
- `[skip publish]` holds a merge back (anywhere in the title, body or commit message, so don't quote it in a pull
  request that should publish), and a title starting with `WIP:` doesn't publish.
- Never bump the version yourself: the vault picks it.
- `splash.png` at the top of the repo is the game's cover on the vault.

Every change adds a `log/<date>-<name>-<issue>.md` entry (TEAM.md, "The logs").

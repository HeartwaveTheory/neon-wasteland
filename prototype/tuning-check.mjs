// Game Tuner check: every setting in tuning.schema.json must name a number in game.html, and its `default` must be
// the number the code uses right now (the Game Tuner compares the lead's numbers against it).
//
//   node tuning-check.mjs
//
// Keys map onto the game's data like this:
//   economy.startGold / startLives / waveGap / hpPerWave / bountyScale -> START_GOLD, START_LIVES, WAVE_GAP, HP_PER_WAVE, BOUNTY
//   towers.<tower>.<stat>.<level 1-3>   -> TOWERS[tower][stat][level - 1]
//   enemies.<enemy>.<stat>              -> ENEMIES[enemy][stat]
//   spells.<spell>.<stat>               -> SPELLS[spell][stat]
//   napalm.<stat>                       -> NAPALM[stat]
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(HERE, 'game.html'), 'utf8');
// the data section of the game script: map data, towers, enemies, waves, economy and spells (no DOM)
const a = src.indexOf('// ---------------------------------------------------------------- map data');
const b = src.indexOf('// ---------------------------------------------------------------- state');
if (a < 0 || b < a) throw new Error('could not find the data section in game.html');
const data = vm.runInNewContext(src.slice(a, b) + ';({ TOWERS, ENEMIES, SPELLS, NAPALM, START_GOLD, START_LIVES, WAVE_GAP, HP_PER_WAVE, BOUNTY })', { Math });

const ECON = { startGold: 'START_GOLD', startLives: 'START_LIVES', waveGap: 'WAVE_GAP', hpPerWave: 'HP_PER_WAVE', bountyScale: 'BOUNTY' };
function codeValue(key) {
  const [head, ...rest] = key.split('.');
  if (head === 'economy') return data[ECON[rest[0]]];
  if (head === 'towers') { const v = data.TOWERS[rest[0]]?.[rest[1]]; return Array.isArray(v) ? v[Number(rest[2]) - 1] : undefined; }
  if (head === 'enemies') return data.ENEMIES[rest[0]]?.[rest[1]];
  if (head === 'spells') return data.SPELLS[rest[0]]?.[rest[1]];
  if (head === 'napalm') return data.NAPALM[rest[0]];
  return undefined;
}

const schema = JSON.parse(readFileSync(path.join(HERE, 'tuning.schema.json'), 'utf8'));
const bad = [];
const seen = new Set();
for (const s of schema.settings) {
  if (seen.has(s.key)) bad.push(`${s.key}: listed twice`);
  seen.add(s.key);
  const v = codeValue(s.key);
  if (typeof v !== 'number') bad.push(`${s.key}: not a number in game.html`);
  else if (v !== s.default) bad.push(`${s.key}: schema default ${s.default}, code ${v}`);
  if (!(s.min <= s.default && s.default <= s.max)) bad.push(`${s.key}: default ${s.default} outside ${s.min}-${s.max}`);
}
console.log(bad.length ? 'tuning check FAILED:\n  ' + bad.join('\n  ') : `tuning check ok: ${schema.settings.length} settings match game.html`);
process.exit(bad.length ? 1 : 0);

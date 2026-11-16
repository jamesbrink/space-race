// Bakes UT1 - TAI, how far the Earth's turning has fallen behind atomic time, into src/world/ut1.ts (time.ts reads it):
//   node tools/ut1-bake.mjs [--cache <dir>]
//
// Source: the IERS's EOP C01 series (Paris Observatory, hpiers.obspm.fr/iers/eop/eopc01/eopc01.1900-now.dat): UT1 - TAI
// every 0.05 Besselian year, from 1956 (the first year with a measured value) to the latest, each to a tenth of a millisecond or
// better. Fetched once into the cache (default ~/.cache/space-race/eop; never committed) with a generic client name.
// UT1 - TAI is smooth where UT1 - UTC is not (UTC stepped by leap seconds, and before 1972 by tenths and rate offsets),
// so it is what is interpolated; time.ts adds TAI - UTC from its own table. Kept as its first value and then each
// step's change, in tenths of a millisecond.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const cache = args.includes('--cache') ? args[args.indexOf('--cache') + 1] : join(homedir(), '.cache/space-race/eop');
mkdirSync(cache, { recursive: true });
const URL = 'https://hpiers.obspm.fr/iers/eop/eopc01/eopc01.1900-now.dat';
const path = join(cache, 'eopc01.1900-now.dat');
if (!existsSync(path)) {
  const res = await fetch(URL, { headers: { 'User-Agent': 'ephemeris-bake' } });
  if (!res.ok) throw new Error(`${URL}: ${res.status}`);
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  console.log('fetched', URL);
}

// columns: the epoch (decimal year), x, its error, y, its error, UT1 - TAI (s), its error, ...; 99.99 where there is none
const rows = readFileSync(path, 'utf8')
  .split('\n')
  .filter((l) => l.trim() && !l.startsWith('#'))
  .map((l) => l.trim().split(/\s+/).map(Number))
  .filter((c) => c[5] !== 99.99 && Number.isFinite(c[5]));
const step = 0.05;
for (let i = 1; i < rows.length; i++) if (Math.abs(rows[i][0] - rows[i - 1][0] - step) > 1e-6) throw new Error(`a gap at ${rows[i][0]}`);
const tenths = rows.map((c) => Math.round(c[5] * 1e4));
const changes = tenths.map((v, i) => (i ? v - tenths[i - 1] : v));
const lines = [];
for (let i = 0; i < changes.length; i += 20) lines.push(`  ${changes.slice(i, i + 20).join(', ')},`);
writeFileSync(
  join(root, 'src/world/ut1.ts'),
  `/**
 * UT1 - TAI, baked by tools/ut1-bake.mjs from the IERS's EOP C01 series (Paris Observatory): every ${step} year from
 * ${rows[0][0].toFixed(2)} to ${rows.at(-1)[0].toFixed(2)} (Besselian years: B = 1900 + (JD - 2415020.31352) / 365.242198781),
 * in tenths of a millisecond, as the first value
 * and then each step's change. time.ts reads it (\`ut1MinusUtc\`). Do not edit by hand: run \`pnpm ut1\`.
 */
export const UT1_TAI_FROM = ${rows[0][0].toFixed(1)};
export const UT1_TAI_STEP = ${step};
export const UT1_TAI_CHANGES: readonly number[] = [
${lines.join('\n')}
];
`,
);
// (laid out as the formatter lays it, so a bake again of the same data changes nothing)
execFileSync(join(root, 'node_modules/.bin/biome'), ['format', '--write', join(root, 'src/world/ut1.ts')], { stdio: 'ignore' });
console.log(`src/world/ut1.ts: ${rows.length} values, ${rows[0][0]} to ${rows.at(-1)[0]}`);

// Bakes the Moon's gravity field, cut to a degree, into src/world/grgm900c.ts, which src/world/lunargravity.ts reads:
//   node tools/lunar-gravity-bake.mjs [--degree 30] [--cache <dir>] [--check]
//
// Source: GRGM900C (Lemoine et al. 2014, Geophysical Research Letters 41, doi:10.1002/2014GL060027), the Goddard field
// to degree and order 900 from the whole of the GRAIL mission's tracking, as NASA's Planetary Data System keeps it
// (GRAIL-L-LGRS-5-RDR-V1.0, shadr/gggrx_0900c_sha.tab, with its label gggrx_0900c_sha.lbl): fully normalised
// coefficients, a reference radius of 1738.0 km, GM 4902.79996708864 km^3/s^2, in the Moon's principal-axis frame as
// DE421 has it. The table is a header line and then a line for each degree and order from (1, 0) up, so the first few
// tens of kilobytes are all that a cut to a low degree needs: only those are fetched (a ranged request), once, into
// the cache (default ~/.cache/space-race/lunar-gravity; never committed).
//
// What the cut leaves out, printed for the heights a flight is at (the root mean square, over a sphere at that height,
// of the radial pull of the degrees left out, from the table's own coefficients as far as was fetched): at 110 km a
// cut at degree 30 leaves out 4.8 mGal of the field's 50; at 15 km, 56 of its 98. `--check` only reports.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);
const cache = opt('cache', join(homedir(), '.cache/space-race/lunar-gravity'));
const degree = Number(opt('degree', '30'));
const TABLE = 'https://pds-geosciences.wustl.edu/grail/grail-l-lgrs-5-rdr-v1/grail_1001/shadr/gggrx_0900c_sha.tab';
/** How much of the table is fetched, bytes: its lines are 122 bytes, so this is complete to degree 312. */
const FETCHED = 6_000_000;

mkdirSync(cache, { recursive: true });
const path = join(cache, 'gggrx_0900c_sha.head.tab');
if (!existsSync(path)) {
  // (a generic client name: nothing about whoever runs this is sent)
  const res = await fetch(TABLE, { headers: { 'User-Agent': 'lunar-gravity-bake', Range: `bytes=0-${FETCHED - 1}` } });
  if (!res.ok) throw new Error(`${TABLE}: ${res.status}`);
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  console.log('fetched the first', FETCHED, 'bytes of', TABLE);
}
const lines = readFileSync(path, 'utf8').split('\n');
const head = lines[0].split(',').map(Number);
const [radius, gm, normalised] = [head[0] * 1e3, head[1] * 1e9, head[5]];
if (normalised !== 1) throw new Error('the table is not of fully normalised coefficients');
/** Each degree's coefficients, by order: [C, S]. The last line fetched may be cut short, and its degree is not complete. */
const table = [[[1, 0]]];
for (const line of lines.slice(1, -1)) {
  const p = line.split(',');
  if (p.length < 6) continue;
  const [n, m, c, s] = [Number(p[0]), Number(p[1]), Number(p[2]), Number(p[3])];
  table[n] ??= [];
  table[n][m] = [c, s];
}
const complete = table.findLastIndex((row, n) => row && row.length === n + 1 && row.every(Boolean));
if (degree > complete) throw new Error(`only complete to degree ${complete} in what was fetched`);

/** The root mean square over the sphere `height` m up of the radial pull of degrees `from` to `to`, m/s^2. */
const pull = (height, from, to) => {
  const r = radius + height;
  let sum = 0;
  for (let n = from; n <= to; n++) {
    let power = 0;
    for (const [c, s] of table[n]) power += c * c + s * s;
    sum += ((n + 1) * (radius / r) ** n) ** 2 * power;
  }
  return (gm / (r * r)) * Math.sqrt(sum);
};
for (const height of [15e3, 60e3, 110e3, 300e3])
  console.log(
    `${String(height / 1e3).padStart(4)} km up: the field (degrees 2 to ${complete}) ${(pull(height, 2, complete) * 1e5).toFixed(1)} mGal; a cut at ${degree} leaves out ${(pull(height, degree + 1, complete) * 1e5).toFixed(2)} mGal`,
  );

if (!args.includes('--check')) {
  const c = [];
  const s = [];
  for (let n = 0; n <= degree; n++)
    for (let m = 0; m <= n; m++) {
      c.push(table[n][m][0]);
      s.push(table[n][m][1]);
    }
  const list = (xs) =>
    xs.map((x) => (x === 0 ? '0' : x.toExponential(16).replace('e+0', 'e0').replace(/0+e/, 'e').replace('.e', 'e'))).join(', ');
  const out = join(root, 'src/world/grgm900c.ts');
  writeFileSync(
    out,
    `/**
 * The Moon's gravity field GRGM900C (Lemoine et al. 2014, GRL 41, doi:10.1002/2014GL060027; NASA PDS
 * GRAIL-L-LGRS-5-RDR-V1.0, shadr/gggrx_0900c_sha.tab), cut to degree and order ${degree}: written by
 * tools/lunar-gravity-bake.mjs, which says what the cut leaves out. Not edited by hand. Fully normalised coefficients,
 * degree by degree and order by order within each (0,0; 1,0; 1,1; 2,0 ...), in the Moon's principal-axis frame; read by
 * world/lunargravity.ts.
 */
export const GRGM900C = {
  /** The Moon's GM, m^3/s^2, and the field's reference radius, m: the table's own (4902.79996708864 km^3/s^2, 1738.0 km). */
  gm: ${gm},
  radius: ${radius},
  degree: ${degree},
  // biome-ignore format: a table
  c: [${list(c)}],
  // biome-ignore format: a table
  s: [${list(s)}],
} as const;
`,
  );
  console.log(`wrote ${out}: degree ${degree}, ${c.length} coefficients of each kind`);
}

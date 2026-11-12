// Bakes the sky's fixed lights (src/world/stars.ts, viewer/heavens.ts) from public catalogues:
//   node tools/stars.mjs [--cache <dir>]
//
//   src/world/stars.ts        the 518 stars of magnitude 4.0 and brighter, in the bundle: the sky's first frame
//   public/sky/stars.bin      every star of the Bright Star Catalogue with a place and a magnitude (9,096), brightest
//                             first: six little-endian float32 each, as STARS has them (stars.ts: STAR_STRIDE)
//   public/sky/milkyway.jpg   the Milky Way and the rest of the sky's unresolved light, 2048 x 1024, equirectangular
//                             in J2000 (right ascension 0 in the middle, increasing to the left; north up)
//
// Sources, fetched into the cache (default ~/.cache/space-race/sky; never committed):
// - Hoffleit and Warren, The Bright Star Catalogue, 5th revised edition (preliminary), 1991: CDS catalogue V/50,
//   public domain. Fetched from the copy at the Smithsonian Astrophysical Observatory's Telescope Data Center
//   (the same file, bsc5.dat), CDS's own ftp not answering on the day.
// - NASA/Goddard Space Flight Center Scientific Visualization Studio, "Deep Star Maps 2020" (SVS 4851):
//   milkyway_2020_4k.exr, the Milky Way alone in celestial coordinates, made from Gaia DR2, Hipparcos-2 and
//   Tycho-2. NASA's, not copyrighted; credit NASA/GSFC SVS. Converted with ImageMagick (`magick` on PATH).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const cache = args.includes('--cache') ? args[args.indexOf('--cache') + 1] : join(homedir(), '.cache/space-race/sky');
mkdirSync(cache, { recursive: true });
mkdirSync(join(root, 'public/sky'), { recursive: true });

const CATALOGUE = 'http://tdc-www.harvard.edu/catalogs/bsc5.dat.gz';
const MILKY_WAY = 'https://svs.gsfc.nasa.gov/vis/a000000/a004800/a004851/milkyway_2020_4k.exr';
async function fetched(url, name) {
  const path = join(cache, name);
  if (!existsSync(path)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
    console.log('fetched', url);
  }
  return path;
}

// The catalogue's lines are fixed columns (its ReadMe; bytes from 1): 76-83 right ascension h m s and 84-90
// declination d m s, equinox and epoch J2000; 103-107 V; 110-114 B-V; 149-154 and 155-160 the yearly proper motion
// in right ascension (on the sky: times the cosine of the declination already) and declination, arcseconds, FK5.
const text = gunzipSync(readFileSync(await fetched(CATALOGUE, 'bsc5.dat.gz'))).toString('latin1');
const stars = [];
for (const line of text.split('\n')) {
  const num = (from, to) => Number.parseFloat(line.slice(from - 1, to));
  if (!line.slice(75, 77).trim() || !line.slice(102, 107).trim()) continue; // (fourteen entries are novae and the like, with no place)
  const ra = (num(76, 77) + num(78, 79) / 60 + num(80, 83) / 3600) * 15;
  const dec = (line[83] === '-' ? -1 : 1) * (num(85, 86) + num(87, 88) / 60 + num(89, 90) / 3600);
  const bv = num(110, 114);
  const pmRa = num(149, 154),
    pmDec = num(155, 160);
  // (a star with no colour measured is taken as the Sun's, 0.65: there are a few dozen, all faint)
  stars.push([
    ra,
    dec,
    num(103, 107),
    Number.isFinite(bv) ? bv : 0.65,
    Number.isFinite(pmRa) ? pmRa : 0,
    Number.isFinite(pmDec) ? pmDec : 0,
  ]);
}
stars.sort((a, b) => a[2] - b[2]);

const bin = new Float32Array(stars.length * 6);
stars.forEach((s, i) => {
  bin.set(s, i * 6);
});
writeFileSync(join(root, 'public/sky/stars.bin'), Buffer.from(bin.buffer));

const bright = stars.filter((s) => s[2] <= 4.0);
const row = (s) =>
  `  ${s[0].toFixed(3)}, ${s[1].toFixed(3)}, ${s[2].toFixed(2)}, ${s[3].toFixed(2)}, ${s[4].toFixed(3)}, ${s[5].toFixed(3)},`;
const source = readFileSync(join(root, 'src/world/stars.ts'), 'utf8');
const open = 'export const STARS: readonly number[] = [\n';
const from = source.indexOf(open),
  to = source.indexOf('\n];', from);
if (from < 0 || to < 0) throw new Error('src/world/stars.ts: the table was not found');
writeFileSync(join(root, 'src/world/stars.ts'), `${source.slice(0, from + open.length)}${bright.map(row).join('\n')}${source.slice(to)}`);

// the Milky Way: the map is linear light; kept as an sRGB JPEG at half its size
const exr = await fetched(MILKY_WAY, 'milkyway_2020_4k.exr');
execFileSync('magick', [
  exr,
  '-set',
  'colorspace',
  'RGB',
  '-resize',
  '2048x1024',
  '-colorspace',
  'sRGB',
  '-quality',
  '86',
  join(root, 'public/sky/milkyway.jpg'),
]);
console.log(`${stars.length} stars (${bright.length} to magnitude 4.0), public/sky/stars.bin, public/sky/milkyway.jpg`);

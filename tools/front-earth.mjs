// Bakes the Earth as the front page sees it from the Moon (src/viewer/farearth.ts): the globe's own maps at the size
// that distance needs, and the day's cloud, sea ice and snow.
//   node tools/front-earth.mjs [--cache <dir>] [--only surface|colour|day]
//   node tools/front-earth.mjs --lunar [--cache <dir>]   the day alone over each Apollo landing site, at the hour its LM
//                       touched down (missions/usa/places/moon/: `landed`), for the Earth in its sky (viewer/lunar/setting.ts):
//                       public/lunar/<site>.earth.day.jpg and <site>.earth.json
//
// Written to public/front/, each the six faces of a cube side by side (+X, -X, +Y, -Y, +Z, -Z of the Earth's own
// frame, as tools/globe.mjs lays a face out):
//   earth.surface.png   512 a face: red the land's distance to the shore, green the ice's, blue the relief
//                       (the bytes of public/globe/land, ice and relief, each the mean of the 4 x 4 it stands for)
//   earth.colour.jpg    1024 a face: the land's colours (public/globe/colour, the mean of each 2 x 2)
//   earth.day.jpg       512 a face: the day itself, from ERA5 at the hour nearest the front page's instant:
//                       red how much of the Sun's light the cloud there sends back, green the share of the sea
//                       under ice, blue the share of the land under snow
//   earth.json          what each is, of when, and from what
//
// So the Earth from the Moon is the same Earth the globe draws (run `pnpm globe` and `pnpm globe:surface` first if
// those have changed), and a lower level of detail is this rebuild, never a hand edit.
//
// The day is ECMWF's ERA5 reanalysis (Hersbach and others 2020; Copernicus Climate Change Service), read from the
// public copy Google keeps (ARCO-ERA5: gs://gcp-public-data-arco-era5, a quarter of a degree, hourly from 1940): one
// hour of five fields, each 721 x 1440, fetched once into the cache (~/.cache/space-race/era5, 12 MB). A reanalysis
// is a weather model run again over the observations there were: for 1961, the surface and balloon network and no
// satellite, so the northern continents' weather is well held and the southern oceans' is the model's own. Derived,
// and says so. What is made of it:
//   cloud   c A(tau / c), where c is the cell's total cloud cover, tau its cloud's optical depth from the water and
//           ice it holds (3 W / (2 rho r): droplets of 10 micrometres, crystals of 30) and A(tau) the share a layer
//           that deep sends back, 0.15 tau / (2 + 0.15 tau) (two streams, asymmetry 0.85)
//   ice     the sea ice's area fraction, as given
//   snow    the share of the ground covered: the snow's depth as water over 25 mm (ERA5's own rule: full at 10 cm
//           of snow at a density of 250 kg a cubic metre)
// ImageMagick's `magick` reads the globe's JPEGs and writes these; everything else is done here.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INSTANT } from '../src/app/front/view.ts';
import { ARCO, COLS, ROWS, unblosc } from './era5.mjs';
import { readGreyPng, writeRgbPng } from './png.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const cache = opt('cache', join(homedir(), '.cache/space-race/era5'));
const only = opt('only', null);
const globe = join(root, 'public/globe');
const out = join(root, 'public/front');
mkdirSync(out, { recursive: true });
mkdirSync(cache, { recursive: true });

/** Each face's (name, major axis, s axis, t axis) as OpenGL picks them: tools/globe.mjs's own table. */
const FACES = [
  ['px', [1, 0, 0], [0, 0, -1], [0, -1, 0]],
  ['nx', [-1, 0, 0], [0, 0, 1], [0, -1, 0]],
  ['py', [0, 1, 0], [1, 0, 0], [0, 0, 1]],
  ['ny', [0, -1, 0], [1, 0, 0], [0, 0, -1]],
  ['pz', [0, 0, 1], [1, 0, 0], [0, -1, 0]],
  ['nz', [0, 0, -1], [-1, 0, 0], [0, -1, 0]],
];
const SURFACE = 512;
const COLOUR = 1024;
const DAY = 512;
const sizeOf = (file) => `${(statSync(join(out, file)).size / 1e6).toFixed(2)} MB`;

/** Write three bytes a texel as a JPEG (through a PPM in the cache, by ImageMagick). */
function writeJpeg(path, data, w, h, quality, sampling) {
  const ppm = join(cache, 'out.ppm');
  writeFileSync(ppm, Buffer.concat([Buffer.from(`P6\n${w} ${h}\n255\n`, 'ascii'), data]));
  execFileSync('magick', [ppm, '-strip', '-sampling-factor', sampling, '-quality', String(quality), path]);
}

/** The mean of each `by` x `by` block of a one-channel map. */
function shrink(data, size, by) {
  const n = size / by;
  const small = new Uint8Array(n * n);
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let y = 0; y < by; y++) for (let x = 0; x < by; x++) sum += data[(j * by + y) * size + i * by + x];
      small[j * n + i] = Math.round(sum / (by * by));
    }
  return small;
}

function surface() {
  const strip = new Uint8Array(SURFACE * 6 * SURFACE * 3);
  FACES.forEach(([face], f) => {
    ['land', 'ice', 'relief'].forEach((name, channel) => {
      const { width, height, data } = readGreyPng(readFileSync(join(globe, `${name}.${face}.png`)));
      if (width !== height || width % SURFACE) throw new Error(`${name}.${face}.png is ${width} x ${height}`);
      const small = shrink(data, width, width / SURFACE);
      for (let j = 0; j < SURFACE; j++)
        for (let i = 0; i < SURFACE; i++) strip[(j * SURFACE * 6 + f * SURFACE + i) * 3 + channel] = small[j * SURFACE + i];
    });
  });
  writeRgbPng(join(out, 'earth.surface.png'), strip, SURFACE * 6, SURFACE);
  console.log(`earth.surface.png  ${SURFACE * 6} x ${SURFACE}  ${sizeOf('earth.surface.png')}`);
}

function colour() {
  const strip = Buffer.alloc(COLOUR * 6 * COLOUR * 3);
  FACES.forEach(([face], f) => {
    const raw = execFileSync('magick', [join(globe, `colour.${face}.jpg`), '-resize', `${COLOUR}x${COLOUR}!`, '-depth', '8', 'rgb:-'], {
      maxBuffer: 1 << 28,
    });
    if (raw.length !== COLOUR * COLOUR * 3) throw new Error(`colour.${face}.jpg did not come out ${COLOUR} square`);
    for (let j = 0; j < COLOUR; j++) raw.copy(strip, (j * COLOUR * 6 + f * COLOUR) * 3, j * COLOUR * 3, (j + 1) * COLOUR * 3);
  });
  writeJpeg(join(out, 'earth.colour.jpg'), strip, COLOUR * 6, COLOUR, 86, '4:2:0');
  console.log(`earth.colour.jpg   ${COLOUR * 6} x ${COLOUR}  ${sizeOf('earth.colour.jpg')}`);
}

// --- the day, from ERA5 ---

/** One of ERA5's fields at an hour (hours since 1900-01-01 00:00 UTC), 721 rows from the north pole by 1440 from Greenwich eastward. */
async function field(name, hour) {
  const file = join(cache, `${name}.${hour}.blosc`);
  if (!existsSync(file)) {
    const res = await fetch(`${ARCO}/${name}/${hour}.0.0`);
    if (!res.ok) throw new Error(`${name} at hour ${hour}: ${res.status}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  const data = unblosc(readFileSync(file));
  if (data.length !== ROWS * COLS) throw new Error(`${name}: ${data.length} values`);
  return data;
}

/** A field at a place (degrees north and east), between its four nearest values. */
function at(data, latitude, longitude) {
  const y = Math.min(ROWS - 1, Math.max(0, (90 - latitude) * 4));
  const x = ((((longitude % 360) + 360) % 360) * 4) % COLS;
  const j = Math.min(ROWS - 2, Math.floor(y)),
    i = Math.floor(x);
  const fy = y - j,
    fx = x - i;
  const i1 = (i + 1) % COLS;
  const v = (jj, ii) => {
    const value = data[jj * COLS + ii];
    return Number.isFinite(value) ? value : 0; // (the sea ice has no value over land)
  };
  return (v(j, i) * (1 - fx) + v(j, i1) * fx) * (1 - fy) + (v(j + 1, i) * (1 - fx) + v(j + 1, i1) * fx) * fy;
}

async function day(instant = INSTANT, path = join(out, 'earth.day.jpg')) {
  // the hour nearest the instant
  const hour = Math.round((Date.parse(instant) - Date.UTC(1900, 0, 1)) / 3_600_000);
  const when = new Date(Date.UTC(1900, 0, 1) + hour * 3_600_000).toISOString();
  const [cover, water, ice, seaIce, snow] = await Promise.all(
    ['total_cloud_cover', 'total_column_cloud_liquid_water', 'total_column_cloud_ice_water', 'sea_ice_cover', 'snow_depth'].map((n) =>
      field(n, hour),
    ),
  );
  // what the cloud in each cell sends back of the Sun's light
  const cloud = new Float32Array(ROWS * COLS);
  for (let k = 0; k < cloud.length; k++) {
    const c = Math.min(1, Math.max(0, cover[k]));
    if (c < 0.01) continue;
    const tau = (150 * Math.max(0, water[k]) + 54.5 * Math.max(0, ice[k])) / c; // (3 W / 2 rho r: 1.5 / (1000 x 10e-6), 1.5 / (917 x 30e-6))
    cloud[k] = (c * 0.15 * tau) / (2 + 0.15 * tau);
  }
  const strip = Buffer.alloc(DAY * 6 * DAY * 3);
  const F = 1 / 298.257223563;
  let sum = 0;
  FACES.forEach(([, ma, sa, ta], f) => {
    for (let j = 0; j < DAY; j++)
      for (let i = 0; i < DAY; i++) {
        const s = ((i + 0.5) / DAY) * 2 - 1,
          t = ((j + 0.5) / DAY) * 2 - 1;
        const d = [ma[0] + s * sa[0] + t * ta[0], ma[1] + s * sa[1] + t * ta[1], ma[2] + s * sa[2] + t * ta[2]];
        // the direction from the centre as a place on the ellipsoid (geodetic latitude from geocentric)
        const longitude = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
        const latitude = (Math.atan2(d[2], Math.hypot(d[0], d[1]) * (1 - F) ** 2) * 180) / Math.PI;
        const o = (j * DAY * 6 + f * DAY + i) * 3;
        const a = at(cloud, latitude, longitude);
        sum += a;
        strip[o] = Math.round(255 * Math.min(1, a));
        strip[o + 1] = Math.round(255 * Math.min(1, Math.max(0, at(seaIce, latitude, longitude))));
        strip[o + 2] = Math.round(255 * Math.min(1, Math.max(0, at(snow, latitude, longitude) / 0.025)));
      }
  });
  writeJpeg(path, strip, DAY * 6, DAY, 90, '4:4:4');
  console.log(
    `${path.split('/').pop()}  ${DAY * 6} x ${DAY}  ${(statSync(path).size / 1e6).toFixed(2)} MB  ${when}  mean cloud albedo ${(sum / (6 * DAY * DAY)).toFixed(3)}`,
  );
  return when;
}

const DATA =
  'ECMWF ERA5 hourly data on single levels (Hersbach et al. 2020, doi:10.24381/cds.adbb2d47), from the ARCO-ERA5 copy ' +
  '(Carver and Merose 2023); contains modified Copernicus Climate Change Service information';

if (args.includes('--lunar')) {
  const { LUNAR_SITES } = await import('../missions/usa/places/moon/sites.ts');
  const lunar = join(root, 'public/lunar');
  for (const s of LUNAR_SITES) {
    const when = await day(s.landed.at, join(lunar, `${s.id}.earth.day.jpg`));
    writeFileSync(
      join(lunar, `${s.id}.earth.json`),
      `${JSON.stringify({ day: { file: `${s.id}.earth.day.jpg`, face: DAY, channels: ['cloud', 'sea ice', 'snow'], at: when, for: s.landed }, data: `${DATA}. Fetched ${new Date().toISOString().slice(0, 10)}` }, null, 2)}\n`,
    );
  }
  process.exit(0);
}

if (!only || only === 'surface') surface();
if (!only || only === 'colour') colour();
const when = !only || only === 'day' ? await day() : JSON.parse(readFileSync(join(out, 'earth.json'), 'utf8')).day.at;
writeFileSync(
  join(out, 'earth.json'),
  `${JSON.stringify(
    {
      faces: FACES.map(([name]) => name),
      surface: { file: 'earth.surface.png', face: SURFACE, channels: ['land', 'ice', 'relief'] },
      colour: { file: 'earth.colour.jpg', face: COLOUR },
      day: { file: 'earth.day.jpg', face: DAY, channels: ['cloud', 'sea ice', 'snow'], at: when },
      data:
        'Surface and colour: public/globe (Natural Earth, NOAA ETOPO 2022, NASA Blue Marble Next Generation May 2004; docs/sources.md). ' +
        'Day: ECMWF ERA5 hourly data on single levels (Hersbach et al. 2020, doi:10.24381/cds.adbb2d47), from the ARCO-ERA5 copy ' +
        '(Carver and Merose 2023); contains modified Copernicus Climate Change Service information. Fetched 2026-11-13',
    },
    null,
    2,
  )}\n`,
);
console.log('earth.json');

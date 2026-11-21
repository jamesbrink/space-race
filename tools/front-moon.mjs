// Bakes the Moon as the front page sees it (src/viewer/moon.ts): its colour, and its relief at three sizes, finest
// where the camera starts.
//   node tools/front-moon.mjs [--cache <dir>] [--only colour|whole|wide|near|site] [--find-site]
//   node tools/front-moon.mjs --sites [<landing site id> ...]    each Apollo landing site's finest map, for the flight scene (below)
//
// Written to public/front/:
//   moon.colour.jpg   the whole Moon's colour, 2048 x 1024: longitude -180 at the left edge to 180, north at the top
//   moon.whole.jpg    the whole Moon's relief on the same grid (5.3 km a texel at the equator)
//   moon.wide.jpg     the relief of the limb the camera looks across, 1024 square on a plane touching the Moon
//                     (gnomonic: straight lines on it are great circles), 3.7 km a texel at its middle, 2,900 km across
//   moon.near.jpg     the same, finer and smaller: 1536 square, 481 m a texel, 728 km across, under where the camera
//                     starts; its blue is not its height but how high the ground stands toward the Sun (below)
//   moon.near.height.png  that ground's heights, whole: 768 square, a byte across the range moon.json gives
//   moon.near.colour.jpg  the colour of the same ground as moon.near.jpg, on the same plane, 640 square (1.1 km a texel)
//   moon.site.bin     the ground round where the camera starts (view.ts `SITE`), whole: 257 x 257 heights 250 m apart
//                     on the plane touching the Moon there (a point's place on it is its direction's east and north
//                     parts times the Moon's radius), little-endian 16-bit, quarter metres above the site's ground
//   moon.json         where each plane touches, what it covers, how its bytes are read, and what it was made for
//
// A relief texel is red and green the ground's slope and blue its height. The slope is the rise over the run along
// two level directions at that place: for the whole Moon east and north; for a plane, the plane's own east brought
// level there, and the direction a quarter turn anticlockwise from it. Each is kept as 128 + 127 sign(s) sqrt(|s|)
// (a slope of 1 is 45 degrees: the square root gives gentle ground the fine steps), and the height as a byte across
// the range the file's entry in moon.json gives, metres above the sphere of 1,737,400 m that the Moon's heights are
// measured from. The shader lights each pixel by its slope and moves each vertex by its height.
//
// The finest map's blue is the ground's own horizon toward the Sun as it stands at the front page's instant: the
// greatest angle above the level of any ground along the Sun's bearing, out to 200 km (a byte across 45 degrees).
// Where the Sun is lower than that the texel is in a shadow cast on it, and the shader says so. It holds while the
// Sun keeps near that bearing, which it does for the hours the camera is near; the shader lets it go as the Sun moves on.
//
// Where the planes touch follows from the front page's own figures (src/app/front/view.ts: the instant, and the place the
// camera starts from, whose plane with the Earth crosses the limb where the Earth stands), so this is run again when
// those change; tests/front.test.mjs fails until it is.
//
// The place itself is found here and written into view.ts by hand: `--find-site` lists the places along the
// south-western limb where the ground is level toward the Earth and the Earth stands half risen over a level horizon,
// levellest first (it bakes nothing). `--only site` then bakes the ground round view.ts's place, says what is seen from
// it, and works out how near the ground comes to the camera all the way along its path (`site.clear`: the scene's near
// plane is set by it); it fails if the path meets the ground.
//
// The sources, both NASA's and public domain (docs/sources.md, "The Moon"), are the CGI Moon Kit's (Scientific
// Visualization Studio, 2019): `lroc_color_poles_8k.tif` (the Lunar Reconnaissance Orbiter Camera's wide-angle
// mosaic) and the laser altimeter's heights `ldem_64_uint.tif` (64 texels a degree) and `ldem_16_uint.tif`, fetched
// once into the cache (~/.cache/space-race/moon, 615 MB). The heights are whole half-metres above a radius of
// 1,727,400 m, one row a strip, uncompressed, so they are read here straight from the file; ImageMagick's `magick`
// unpacks the colour and writes the JPEGs.
import { execFileSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cameraAt, INSTANT, instantAt, limbAngle, limbOf, limbPoint, PATH, pathAt, SITE, SITE_DIR, skyAt } from '../src/app/front/view.ts';
import { cross, DEG, dot, sub, unit } from '../src/world/frames.ts';
import { MOON_RADIUS, selenographic } from '../src/world/moon.ts';
import { writeGreyPng } from './png.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const cache = opt('cache', join(homedir(), '.cache/space-race/moon'));
const only = opt('only', null);
let out = join(root, 'public/front');
mkdirSync(out, { recursive: true });
/** The files' names begin with this: the front page's `moon`, a landing site's own id (`--sites`). */
let prefix = 'moon';
mkdirSync(cache, { recursive: true });
/** JPEG quality of the relief: its slopes are read back as numbers, so it is kept high and its colours whole (4:4:4). */
const QUALITY = 87;
const KIT = 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720';
const sizeOf = (file) => `${(statSync(join(out, file)).size / 1e6).toFixed(2)} MB`;

async function source(name) {
  const file = join(cache, name);
  if (!existsSync(file)) {
    console.log(`fetching ${name}`);
    execFileSync('curl', ['-fsSL', '-o', file, `${KIT}/${name}`], { stdio: 'inherit' });
  }
  return file;
}

/** The heights of one of the kit's unsigned maps: metres above the reference sphere, rows from the north, columns from longitude -180. */
function heights(file) {
  const fd = openSync(file, 'r');
  const head = Buffer.alloc(8);
  readSync(fd, head, 0, 8, 0);
  if (head.toString('ascii', 0, 2) !== 'II' || head.readUInt16LE(2) !== 42) throw new Error(`${file}: not a little-endian TIFF`);
  const ifd = head.readUInt32LE(4);
  const n = Buffer.alloc(2);
  readSync(fd, n, 0, 2, ifd);
  const entries = Buffer.alloc(n.readUInt16LE(0) * 12);
  readSync(fd, entries, 0, entries.length, ifd + 2);
  const tags = new Map();
  for (let i = 0; i < entries.length; i += 12)
    tags.set(entries.readUInt16LE(i), {
      count: entries.readUInt32LE(i + 4),
      value: entries.readUInt16LE(i + 2) === 3 ? entries.readUInt16LE(i + 8) : entries.readUInt32LE(i + 8),
    });
  const [width, height] = [tags.get(256).value, tags.get(257).value];
  if (tags.get(258).value !== 16 || tags.get(259).value !== 1 || tags.get(278).value !== 1 || tags.get(273).count !== height)
    throw new Error(`${file}: expected 16 bits, uncompressed, a row a strip`);
  const offsets = Buffer.alloc(height * 4);
  readSync(fd, offsets, 0, offsets.length, tags.get(273).value);
  const data = new Float32Array(width * height);
  const row = Buffer.alloc(width * 2);
  for (let j = 0; j < height; j++) {
    readSync(fd, row, 0, row.length, offsets.readUInt32LE(j * 4));
    for (let i = 0; i < width; i++) data[j * width + i] = 1_727_400 + 0.5 * row.readUInt16LE(i * 2) - MOON_RADIUS;
  }
  closeSync(fd);
  return { width, height, data };
}

/** A map's height toward a direction in the Moon's frame (unit), metres: between its four nearest texels. */
function heightAt(map, d) {
  const { width, height, data } = map;
  const x = ((Math.atan2(d[1], d[0]) / (2 * Math.PI) + 0.5) * width - 0.5 + width) % width;
  const y = Math.min(height - 1, Math.max(0, (0.5 - Math.asin(Math.max(-1, Math.min(1, d[2]))) / Math.PI) * height - 0.5));
  const i = Math.floor(x),
    j = Math.min(height - 2, Math.floor(y));
  const fx = x - i,
    fy = y - j;
  const i1 = (i + 1) % width;
  return (
    (data[j * width + i] * (1 - fx) + data[j * width + i1] * fx) * (1 - fy) +
    (data[(j + 1) * width + i] * (1 - fx) + data[(j + 1) * width + i1] * fx) * fy
  );
}

/** The mean height over a square `across` radians wide about a direction, level directions `tx` and `ty`: `n` x `n` readings, for a texel coarser than the map it is read from. */
function meanHeight(map, d, tx, ty, across, n) {
  if (n === 1) return heightAt(map, d);
  let sum = 0;
  for (let b = 0; b < n; b++)
    for (let a = 0; a < n; a++) {
      const x = ((a + 0.5) / n - 0.5) * across,
        y = ((b + 0.5) / n - 0.5) * across;
      sum += heightAt(map, unit([d[0] + x * tx[0] + y * ty[0], d[1] + x * tx[1] + y * ty[1], d[2] + x * tx[2] + y * ty[2]]));
    }
  return sum / (n * n);
}

const slopeByte = (s) => Math.round(128 + 127 * Math.sign(s) * Math.sqrt(Math.min(1, Math.abs(s))));

/**
 * A relief map: for each texel, `toward(i, j)` gives its direction and the level direction its first slope is
 * taken along (the second is a quarter turn anticlockwise from it, seen from above); `run` is the texel's size on
 * the ground, metres, which the slope is taken over; `mean`: readings a side that each height is the mean of.
 * `third(d, z)`: what the blue byte is, where it is not the height (the finest map keeps its heights apart).
 */
function relief(map, w, h, run, toward, mean = 1, third = null) {
  const heightsOut = new Float32Array(w * h);
  const rgb = Buffer.alloc(w * h * 3);
  const step = run / 2 / MOON_RADIUS;
  let low = Number.POSITIVE_INFINITY,
    high = Number.NEGATIVE_INFINITY;
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const [d, tx] = toward(i, j);
      const ty = cross(d, tx);
      const off = (t, k) => unit([d[0] + k * step * t[0], d[1] + k * step * t[1], d[2] + k * step * t[2]]);
      const read = (at) => meanHeight(map, at, tx, ty, 2 * step, mean);
      const z = read(d);
      heightsOut[j * w + i] = z;
      low = Math.min(low, z);
      high = Math.max(high, z);
      const o = (j * w + i) * 3;
      rgb[o] = slopeByte((read(off(tx, 1)) - read(off(tx, -1))) / run);
      rgb[o + 1] = slopeByte((read(off(ty, 1)) - read(off(ty, -1))) / run);
      if (third) rgb[o + 2] = third(d, z);
    }
  // (the range, rounded outward to a hundred metres)
  low = Math.floor(low / 100) * 100;
  high = Math.ceil(high / 100) * 100;
  if (!third) for (let k = 0; k < w * h; k++) rgb[k * 3 + 2] = Math.round((255 * (heightsOut[k] - low)) / (high - low));
  return { rgb, low, high, heights: heightsOut };
}

function writeJpeg(path, data, w, h, quality, sampling) {
  const ppm = join(cache, 'out.ppm');
  writeFileSync(ppm, Buffer.concat([Buffer.from(`P6\n${w} ${h}\n255\n`, 'ascii'), data]));
  execFileSync('magick', [ppm, '-strip', '-sampling-factor', sampling, '-quality', String(quality), path]);
}

// --- where the planes touch: behind the limb point the Earth stands over, toward where the camera starts ---
const sky = skyAt(instantAt(0));
const e = unit(sky.earth);
const limb = limbOf(sky);
/** The direction `behind` metres of ground behind the limb point, away from the Earth, in the camera's plane. */
const behindLimb = (behind) => {
  const a = Math.PI / 2 + behind / MOON_RADIUS;
  return unit([
    Math.cos(a) * e[0] + Math.sin(a) * limb[0],
    Math.cos(a) * e[1] + Math.sin(a) * limb[1],
    Math.cos(a) * e[2] + Math.sin(a) * limb[2],
  ]);
};
/** A plane touching the Moon at `centre`, `across` metres square, `side` texels a side. */
function plane(name, centre, across, side) {
  const east = unit(cross([0, 0, 1], centre));
  const north = cross(centre, east);
  const half = Math.tan(across / 2 / MOON_RADIUS);
  return { name, centre, east, north, half, side, metres: (2 * half * MOON_RADIUS) / side };
}
const PLANES = {
  near: plane('near', behindLimb(150_000), 728_000, 1536),
  wide: plane('wide', behindLimb(800_000), 2_900_000, 1024),
};

/** The steepest horizon a byte holds, radians: the Sun is never that high over ground it is to cast long shadows on. */
const HORIZON = Math.PI / 4;
/**
 * How high the ground stands toward the Sun from a point of it (direction `d`, height `z`): the greatest angle
 * above the level, radians, of any ground along the Sun's bearing out to 200 km, the Moon's curve allowed for.
 * Where the Sun is lower than this the point is in shadow.
 */
function horizonToward(map, sun, d, z) {
  const k = dot(sun, d);
  const along = unit([sun[0] - k * d[0], sun[1] - k * d[1], sun[2] - k * d[2]]);
  const from = [d[0] * (MOON_RADIUS + z), d[1] * (MOON_RADIUS + z), d[2] * (MOON_RADIUS + z)];
  let most = 0;
  let reach = 0;
  for (let n = 1; n <= 104; n++) {
    reach += n <= 64 ? 481 : reach * 0.05; // (every texel for 31 km, then a twentieth further each time)
    const a = reach / MOON_RADIUS;
    const [c, sn] = [Math.cos(a), Math.sin(a)];
    const to = [c * d[0] + sn * along[0], c * d[1] + sn * along[1], c * d[2] + sn * along[2]];
    const r = MOON_RADIUS + heightAt(map, to);
    const v = [to[0] * r - from[0], to[1] * r - from[1], to[2] * r - from[2]];
    const up = dot(v, d) / Math.hypot(v[0], v[1], v[2]);
    if (up > most) most = up;
  }
  return Math.asin(most);
}

/**
 * `sun`: the direction the finest map's cast shadows are worked out toward (a unit vector in the Moon's frame), or a
 * function giving it for each texel's direction (a landing site's: due east there); null for a map with none.
 */
function bakePlane(p, map, mean = 1, sun = null) {
  const { centre, east, north, half, side } = p;
  const toward = typeof sun === 'function' ? sun : () => sun;
  const third = sun ? (d, z) => Math.round(255 * Math.min(1, horizonToward(map, toward(d), d, z) / HORIZON)) : null;
  const {
    rgb,
    low,
    high,
    heights: z,
  } = relief(
    map,
    side,
    side,
    p.metres,
    (i, j) => {
      const x = ((i + 0.5) / side) * 2 * half - half,
        y = half - ((j + 0.5) / side) * 2 * half;
      const d = unit([
        centre[0] + x * east[0] + y * north[0],
        centre[1] + x * east[1] + y * north[1],
        centre[2] + x * east[2] + y * north[2],
      ]);
      // the plane's east, brought level here
      const k = dot(east, d);
      return [d, unit([east[0] - k * d[0], east[1] - k * d[1], east[2] - k * d[2]])];
    },
    mean,
    third,
  );
  const file = `${prefix}.${p.name}.jpg`;
  writeJpeg(join(out, file), rgb, side, side, QUALITY, '4:4:4');
  console.log(`${file}  ${side} x ${side}  ${sizeOf(file)}  ${low} to ${high} m  ${p.metres.toFixed(0)} m a texel`);
  const at = selenographic(centre);
  const made = { file, centre, east, north, half, side, metres: p.metres, low, high, at };
  if (!sun) return made;
  // its heights, kept whole (a JPEG's errors in a height are hills): the mean of each 2 x 2, a byte across the range
  const small = side / 2;
  const bytes = new Uint8Array(small * small);
  for (let j = 0; j < small; j++)
    for (let i = 0; i < small; i++) {
      const at4 = 2 * j * side + 2 * i;
      const mean4 = (z[at4] + z[at4 + 1] + z[at4 + side] + z[at4 + side + 1]) / 4;
      bytes[j * small + i] = Math.round((255 * (mean4 - low)) / (high - low));
    }
  const heightFile = `${prefix}.${p.name}.height.png`;
  writeGreyPng(join(out, heightFile), bytes, small, small);
  console.log(`${heightFile}  ${small} x ${small}  ${sizeOf(heightFile)}`);
  return { ...made, height: heightFile, heightMetres: 2 * p.metres, horizon: HORIZON };
}

function bakeWhole(map) {
  const w = 2048,
    h = 1024;
  const { rgb, low, high } = relief(
    map,
    w,
    h,
    (2 * Math.PI * MOON_RADIUS) / w,
    (i, j) => {
      const lon = ((i + 0.5) / w) * 2 * Math.PI - Math.PI,
        lat = Math.PI / 2 - ((j + 0.5) / h) * Math.PI;
      const d = [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
      return [d, [-Math.sin(lon), Math.cos(lon), 0]];
    },
    3,
  );
  writeJpeg(join(out, 'moon.whole.jpg'), rgb, w, h, QUALITY, '4:4:4');
  console.log(`moon.whole.jpg  ${w} x ${h}  ${sizeOf('moon.whole.jpg')}  ${low} to ${high} m`);
  return { file: 'moon.whole.jpg', width: w, height: h, low, high };
}

/** The colour of the ground a plane covers, on that plane: from the kit's mosaic, read whole (8192 x 4096, three bytes a texel). */
function bakePlaneColour(p, file, side) {
  const [w, h] = [8192, 4096];
  const raw = execFileSync('magick', [file, '-depth', '8', 'rgb:-'], { maxBuffer: w * h * 3 + 1024 });
  if (raw.length !== w * h * 3) throw new Error(`${file}: not ${w} x ${h}`);
  const { centre, east, north, half } = p;
  const rgb = Buffer.alloc(side * side * 3);
  for (let j = 0; j < side; j++)
    for (let i = 0; i < side; i++) {
      const x = ((i + 0.5) / side) * 2 * half - half,
        y = half - ((j + 0.5) / side) * 2 * half;
      const d = unit([
        centre[0] + x * east[0] + y * north[0],
        centre[1] + x * east[1] + y * north[1],
        centre[2] + x * east[2] + y * north[2],
      ]);
      // between the four nearest texels
      const u = ((Math.atan2(d[1], d[0]) / (2 * Math.PI) + 0.5) * w - 0.5 + w) % w,
        v = Math.min(h - 1, Math.max(0, (0.5 - Math.asin(d[2]) / Math.PI) * h - 0.5));
      const i0 = Math.floor(u),
        j0 = Math.min(h - 2, Math.floor(v));
      const fx = u - i0,
        fy = v - j0,
        i1 = (i0 + 1) % w;
      for (let c = 0; c < 3; c++)
        rgb[(j * side + i) * 3 + c] = Math.round(
          (raw[(j0 * w + i0) * 3 + c] * (1 - fx) + raw[(j0 * w + i1) * 3 + c] * fx) * (1 - fy) +
            (raw[((j0 + 1) * w + i0) * 3 + c] * (1 - fx) + raw[((j0 + 1) * w + i1) * 3 + c] * fx) * fy,
        );
    }
  const name = `${prefix}.${p.name}.colour.jpg`;
  writeJpeg(join(out, name), rgb, side, side, 88, '4:2:0');
  console.log(`${name}  ${side} x ${side}  ${sizeOf(name)}`);
  return name;
}

function bakeColour(file) {
  const w = 2048,
    h = 1024;
  execFileSync('magick', [
    file,
    '-resize',
    `${w}x${h}!`,
    '-strip',
    '-sampling-factor',
    '4:2:0',
    '-quality',
    '88',
    join(out, 'moon.colour.jpg'),
  ]);
  // its mean, in linear light: the shader scales it so that the Moon is as bright as it is (viewer/moon.ts)
  const mean = execFileSync('magick', [
    join(out, 'moon.colour.jpg'),
    '-colorspace',
    'RGB',
    '-resize',
    '1x1!',
    '-format',
    '%[fx:mean]',
    'info:',
  ])
    .toString()
    .trim();
  console.log(`moon.colour.jpg  ${w} x ${h}  ${sizeOf('moon.colour.jpg')}  mean (linear) ${mean}`);
  return { file: 'moon.colour.jpg', width: w, height: h, mean: Number(mean) };
}

// --- the place the camera starts from ---
const along = (a, b, ca, cb) => [ca * a[0] + cb * b[0], ca * a[1] + cb * b[1], ca * a[2] + cb * b[2]];
/**
 * What is seen from `over` metres above the ground toward a direction `d`: the ground's height, the Earth's centre
 * above the level, the horizon toward the Earth (its height above the level and how far off it is), how much the
 * horizon's height varies 8 degrees either side, how far from level the ground is out to 8 km that way (root mean
 * square and worst, seen from the place), and the Sun's height and bearing from the Earth's (anticlockwise). Radians.
 */
function seenFrom(map, d, over) {
  const z = heightAt(map, d);
  const eye = along(d, d, MOON_RADIUS + z + over, 0);
  const toEarth = unit(sub(sky.earth, eye));
  const forward = unit(along(toEarth, d, 1, -dot(toEarth, d)));
  const left = cross(d, forward);
  const horizons = [];
  let squares = 0,
    count = 0,
    worst = 0;
  for (let a = -8; a <= 8; a += 2) {
    const way = unit(along(forward, left, Math.cos(a * DEG), Math.sin(a * DEG)));
    let most = -1,
      reach = 0,
      far = 0;
    while (reach < 300_000) {
      reach += Math.max(250, reach * 0.02);
      const to = along(d, way, Math.cos(reach / MOON_RADIUS), Math.sin(reach / MOON_RADIUS));
      const ground = heightAt(map, to);
      const v = sub(along(to, to, MOON_RADIUS + ground, 0), eye);
      const up = dot(v, d) / Math.hypot(v[0], v[1], v[2]);
      if (up > most) [most, far] = [up, reach];
      if (reach < 8000) {
        const slope = Math.atan2(ground - z, reach);
        squares += slope * slope;
        count++;
        worst = Math.max(worst, Math.abs(slope));
      }
    }
    horizons.push([Math.asin(most), far]);
  }
  const heightsOf = horizons.map((h) => h[0]);
  const sun = unit(sky.sun);
  return {
    ground: z,
    earth: Math.asin(dot(d, toEarth)),
    horizon: horizons[4][0],
    horizonAt: horizons[4][1],
    spread: Math.max(...heightsOf) - Math.min(...heightsOf),
    rough: Math.sqrt(squares / count),
    worst,
    sunUp: Math.asin(dot(d, sun)),
    sunFrom: Math.atan2(dot(sun, left), dot(sun, forward)),
  };
}

/** The places along the limb that would do, levellest first (view.ts `SITE` says what is asked of one). */
function findSite(map) {
  const found = [];
  // (round the limb from `--find-site`'s two angles, 198 to 218 if none are given: the south-south-west)
  const at = args.indexOf('--find-site');
  const [from, to] = [Number(args[at + 1]) || 198, Number(args[at + 2]) || 218];
  for (let angle = from; angle <= to; angle += 0.05) {
    const n = limbPoint(sky, angle);
    for (let toward = -1; toward <= 4; toward += 0.04) {
      const d = unit(along(e, n, Math.sin(toward * DEG), Math.cos(toward * DEG)));
      const s = seenFrom(map, d, PATH.from);
      const clear = s.earth - s.horizon;
      if (clear > 0.05 * DEG && clear < 0.45 * DEG && s.spread < 0.25 * DEG && s.rough < 1.2 * DEG && s.worst < 3 * DEG)
        found.push({ at: selenographic(d), clear, ...s });
    }
  }
  found.sort((a, b) => a.rough + a.spread - (b.rough + b.spread));
  const deg = (x) => (x / DEG).toFixed(2);
  for (const f of found)
    console.log(
      `${f.at.longitude.toFixed(2)} E ${f.at.latitude.toFixed(2)} N  ground ${f.ground.toFixed(0)} m  Earth ${deg(f.earth)} over a horizon at ${deg(f.horizon)}, ` +
        `${(f.horizonAt / 1000).toFixed(0)} km off (${deg(f.clear)} clear, level within ${deg(f.spread)})  ground within ${deg(f.rough)} of level (worst ${deg(f.worst)})  ` +
        `Sun ${deg(f.sunUp)} up, ${deg(f.sunFrom)} from the Earth`,
    );
}

/** The site's ground, 257 heights a side 250 m apart, and how near the ground comes to the camera along its path. */
function bakeSite(map) {
  const up = SITE_DIR;
  const east = unit(cross([0, 0, 1], up));
  const north = cross(up, east);
  const ground = heightAt(map, up);
  if (Math.abs(ground - SITE.ground.value) > 0.05)
    throw new Error(`view.ts says the site's ground is ${SITE.ground.value} m; the heights say ${ground.toFixed(2)}`);
  const [side, metres, quantum] = [257, 250, 0.25];
  const grid = new Int16Array(side * side);
  for (let j = 0; j < side; j++)
    for (let i = 0; i < side; i++) {
      const x = ((i - (side - 1) / 2) * metres) / MOON_RADIUS,
        y = ((j - (side - 1) / 2) * metres) / MOON_RADIUS;
      const d = along(along(east, north, x, y), up, 1, Math.sqrt(1 - x * x - y * y));
      const q = Math.round((heightAt(map, d) - ground) / quantum);
      if (Math.abs(q) > 32767) throw new Error('the ground round the site is out of a 16-bit height’s range');
      grid[j * side + i] = q;
    }
  writeFileSync(join(out, 'moon.site.bin'), Buffer.from(grid.buffer));
  console.log(`moon.site.bin  ${side} x ${side}  ${sizeOf('moon.site.bin')}  ${metres} m apart`);
  const s = seenFrom(map, up, PATH.from);
  const toEarth = unit(sky.earth);
  const deg = (x) => Number((x / DEG).toFixed(3));
  console.log(
    `  from ${PATH.from} m: the Earth's centre ${deg(s.earth)} up, the horizon ${deg(s.horizon)} at ${(s.horizonAt / 1000).toFixed(1)} km; ` +
      `the Sun ${deg(s.sunUp)} up, ${deg(s.sunFrom)} from the Earth's bearing`,
  );
  // How near the ground comes to the camera along its path: at heights a quarter apart, the least distance to any
  // ground within three heights of the point under the camera (and 5 km: the libration moves the path a little).
  const over = [],
    least = [];
  for (let h = PATH.from; h < 400_000; h *= 1.25) {
    let [t0, t1] = [0, PATH.seconds];
    for (let k = 0; k < 60; k++) {
      const mid = (t0 + t1) / 2;
      if (pathAt(mid).over < h) t0 = mid;
      else t1 = mid;
    }
    const eye = cameraAt(t1, skyAt(instantAt(t1))).position;
    const under = unit(eye);
    const a = unit(cross([0, 0, 1], under)),
      b = cross(under, a);
    const reach = Math.max(5000, 3 * h);
    let nearest = Number.POSITIVE_INFINITY;
    const n = 60;
    for (let j = -n; j <= n; j++)
      for (let i = -n; i <= n; i++) {
        const [x, y] = [(i / n) * reach, (j / n) * reach];
        const r = Math.hypot(x, y) / MOON_RADIUS;
        const to = r ? along(under, unit(along(a, b, x, y)), Math.cos(r), Math.sin(r)) : under;
        const p = along(to, to, MOON_RADIUS + heightAt(map, to), 0);
        nearest = Math.min(nearest, Math.hypot(p[0] - eye[0], p[1] - eye[1], p[2] - eye[2]));
        if (Math.hypot(...p) > Math.hypot(...eye) && r * MOON_RADIUS < 0.02 * h + 300)
          throw new Error(`the path is under the ground ${(h / 1000).toFixed(1)} km up`);
      }
    over.push(Math.round(h * 10) / 10);
    least.push(Math.round(nearest));
  }
  console.log(
    `  the ground's least distance along the path: ${over.map((h, i) => `${(h / 1000).toFixed(2)}:${(least[i] / 1000).toFixed(2)}`).join(' ')} km`,
  );
  return {
    file: 'moon.site.bin',
    at: { longitude: SITE.longitude.value, latitude: SITE.latitude.value },
    ground,
    up,
    east,
    north,
    side,
    metres,
    quantum,
    towardEarth: Math.atan2(dot(toEarth, north), dot(toEarth, east)),
    seen: {
      from: PATH.from,
      earth: deg(s.earth),
      horizon: deg(s.horizon),
      horizonAt: s.horizonAt,
      sunUp: deg(s.sunUp),
      sunFrom: deg(s.sunFrom),
    },
    clear: { over, least },
  };
}

/**
 * `--sites [<id> ...]`: for each Apollo landing site (src/world/lunar-sites.json, from missions/usa/places/moon/), the finest
 * map on a plane touching the Moon `UPRANGE` back along the way its LM came in (the site's `approach`), so that it holds the
 * descent from where it began, 480 to 520 km out, and the ground ahead of the LM; the same size and texel as the front
 * page's (728 km across, 481 m a texel) with its heights and its colour, written to public/lunar/<id>.moon.json,
 * <id>.near.jpg, <id>.near.height.png and <id>.near.colour.jpg. The flight scene draws the nearest site's over the whole
 * Moon's maps, which it shares with the front page (viewer/flightmoon.ts). Its cast shadows are worked out toward the
 * east at every texel: every Apollo LM came down in the lunar morning with the Sun low in the east, and the shader
 * believes them while the Sun's bearing over the map is within a few degrees of that (viewer/moon.ts).
 */
const UPRANGE = 200_000;
if (args.includes('--sites')) {
  const lunar = JSON.parse((await import('node:fs')).readFileSync(join(root, 'src/world/lunar-sites.json'), 'utf8'));
  const asked = args.slice(args.indexOf('--sites') + 1).filter((a) => !a.startsWith('--'));
  const ids = asked.length ? asked : Object.keys(lunar.sites);
  out = join(root, 'public/lunar');
  mkdirSync(out, { recursive: true });
  const fine = heights(await source('ldem_64_uint.tif'));
  const colour = await source('lroc_color_poles_8k.tif');
  for (const id of ids) {
    const s = lunar.sites[id];
    if (!s) throw new Error(`no landing site ${id} in lunar-sites.json`);
    prefix = id;
    const [lat, lon] = s.landing.map((x) => x * DEG);
    const up = [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
    const eastOf = (d) => unit(cross([0, 0, 1], d));
    const east = eastOf(up);
    const north = cross(up, east);
    // back along the approach (degrees true, the way it was flown at the LM)
    const a = s.approach * DEG;
    const ahead = [0, 1, 2].map((i) => Math.cos(a) * north[i] + Math.sin(a) * east[i]);
    const b = UPRANGE / MOON_RADIUS;
    const centre = unit(along(up, ahead, Math.cos(b), -Math.sin(b)));
    const p = plane('near', centre, 728_000, 1536);
    const near = bakePlane(p, fine, 1, eastOf);
    near.colour = bakePlaneColour(p, colour, 640);
    const meta = {
      about: `The Moon round ${s.name}, for the flight scene (viewer/flightmoon.ts): written by tools/front-moon.mjs --sites; do not edit.`,
      site: id,
      landing: s.landing,
      uprange: UPRANGE,
      near,
      cast: 'east',
      data:
        'NASA Scientific Visualization Studio, CGI Moon Kit (E. Wright, 2019; svs.gsfc.nasa.gov/4720): colour from the Lunar ' +
        'Reconnaissance Orbiter Camera wide-angle mosaic, heights from the Lunar Orbiter Laser Altimeter. Public domain; credit ' +
        'NASA/GSFC/Arizona State University',
    };
    writeFileSync(join(out, `${id}.moon.json`), `${JSON.stringify(meta, null, 2)}\n`);
    console.log(`${id}.moon.json`);
  }
  process.exit(0);
}

const metaFile = join(out, 'moon.json');
const meta = existsSync(metaFile) ? JSON.parse((await import('node:fs')).readFileSync(metaFile, 'utf8')) : {};
if (args.includes('--find-site')) {
  findSite(heights(await source('ldem_64_uint.tif')));
  process.exit(0);
}
if (!only || only === 'colour') meta.colour = bakeColour(await source('lroc_color_poles_8k.tif'));
if (!only || only === 'whole' || only === 'wide') {
  const coarse = heights(await source('ldem_16_uint.tif'));
  if (!only || only === 'whole') meta.whole = bakeWhole(coarse);
  if (!only || only === 'wide') meta.wide = bakePlane(PLANES.wide, coarse, 2);
}
if (!only || only === 'near' || only === 'site') {
  const fine = heights(await source('ldem_64_uint.tif'));
  if (!only || only === 'site') meta.site = bakeSite(fine);
}
if (!only || only === 'near') {
  meta.near = bakePlane(PLANES.near, heights(await source('ldem_64_uint.tif')), 1, unit(sky.sun));
  meta.near.colour = bakePlaneColour(PLANES.near, await source('lroc_color_poles_8k.tif'), 640);
}
meta.for = {
  instant: INSTANT,
  limb: limbAngle(sky),
  limbAt: selenographic(limb),
  site: [SITE.longitude.value, SITE.latitude.value],
  sun: unit(sky.sun),
};
meta.data =
  'NASA Scientific Visualization Studio, CGI Moon Kit (E. Wright, 2019; svs.gsfc.nasa.gov/4720): colour from the Lunar ' +
  'Reconnaissance Orbiter Camera wide-angle mosaic, heights from the Lunar Orbiter Laser Altimeter. Public domain; credit ' +
  'NASA/GSFC/Arizona State University. Fetched 2026-11-13';
writeFileSync(metaFile, `${JSON.stringify(meta, null, 2)}\n`);
console.log('moon.json');

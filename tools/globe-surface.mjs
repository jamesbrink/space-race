// Bakes what the Earth's surface is like, for the globe seen from orbit (viewer/globe.ts): how high
// the ground and how deep the sea's bed (relief), and what colour the land is (colour).
//   node tools/globe-surface.mjs [--cache <dir>] [--size 2048] [--only globe|region]
//
// Written to public/globe/:
//   relief.<face>.png              six cube faces, the same faces as land.<face>.png (tools/globe.mjs)
//   colour.<face>.jpg              the same faces, sRGB
//   <region>.relief.png            a region on one gnomonic plane (world/region.ts), rows north to south
//   <region>.colour.jpg            the same plane and box
//   <region>.surface.json          the plane, the box and the two maps' sizes, for the viewer
//
// A relief texel is the mean height over its area, metres above sea level (the ice's surface on
// land, the bed under the sea), kept in a byte by world/relief.ts's encodeRelief. A colour texel is
// the mean colour of the land in it; a texel with no land is filled from the nearest land (DILATE
// texels out, then one flat tone), because the reader cuts the sea out itself along a finer shore
// and must never find the sea's colour in a texel beside it.
//
// The sources, both public domain (docs/sources.md, "The Earth's surface from orbit"), are fetched
// once into the cache (~/.cache/space-race/globe-surface, about 600 MB, with as much again
// unpacked): NOAA's ETOPO 2022 at 60 arc-seconds for the globe and 15 for the regions, and NASA's
// Blue Marble Next Generation for May 2004, without relief shading or bathymetry, at 21600 x 10800
// for the globe and the 500 m tile for the regions. GDAL unpacks them (gdal_translate and
// gdalbuildvrt on PATH, or through `nix shell nixpkgs#gdal`) and ImageMagick's `magick` writes the
// JPEGs; everything between is done here, so the projection is this file's and region.ts's alone.
import { execFileSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planeAt, surfaceDirection, toPlane } from '../src/world/region.ts';
import { encodeRelief } from '../src/world/relief.ts';
import { gaussianRadius } from '../src/world/surface.ts';
import { writeGreyPng } from './png.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};

const ETOPO = 'https://www.ngdc.noaa.gov/thredds/fileServer/global/ETOPO2022';
const BMNG = 'https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/may';
/** What the outputs say of themselves (the region's .json). */
const DATA =
  'Relief: NOAA NCEI, ETOPO 2022 Global Relief Model (ice surface), doi:10.25921/fd45-gt74, CC0-1.0, not subject to copyright in the United States. ' +
  'Colour: NASA Earth Observatory, Blue Marble Next Generation, May 2004 (R. Stöckli), not copyrighted; credit NASA. Both fetched 2026-11-11';

/** How near the sea a texel is "by the sea", texels. */
const COAST = 2;
/** Texels the land's colour is carried out over the sea. */
const DILATE = 32;
/** Passes of a 3 x 3 mean over what was carried out. */
const SMOOTH = 6;
/** The colour of the sea beyond that, sRGB bytes: a middling land tone, so no mip level of the map turns dark or blue at a shore. */
const TONE = [104, 102, 78];
/** Each texel is the mean of this many samples a side of the source under it. */
const SAMPLES = 4;
/** JPEG quality. */
const QUALITY = 88;
/** The regions: bounds in degrees, and the middle its plane touches the sphere at. */
const REGIONS = [{ name: 'cape-canaveral', south: 20.5, north: 31.5, west: -84.5, east: -72.5, centre: [26.0, -78.5], metres: 450 }];
/** Blue Marble's 500 m tile over each region: its file and its north-west corner, degrees. Tiles are 90 degrees square, 240 pixels a degree. */
const TILE = { file: 'world.200405.3x21600x21600.B1.jpg', west: -90, north: 90 };

const cache = opt('cache', join(homedir(), '.cache', 'space-race', 'globe-surface'));
const work = join(cache, 'work');
const out = join(root, 'public', 'globe');
for (const dir of [cache, work, out]) if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

/** A source file in the cache, fetched if it is not there. */
function fetched(url) {
  const path = join(cache, url.slice(url.lastIndexOf('/') + 1));
  if (!existsSync(path)) {
    console.log('fetching', url);
    execFileSync('curl', ['-fL', '--retry', '3', '-o', `${path}.part`, url], { stdio: 'inherit' });
    renameSync(`${path}.part`, path);
  }
  return path;
}

/** Run a GDAL program: from PATH if it is there, otherwise out of nixpkgs. */
let gdalOnPath = null;
function gdal(program, ...argv) {
  if (gdalOnPath === null) {
    try {
      execFileSync('gdal_translate', ['--version'], { stdio: 'ignore' });
      gdalOnPath = true;
    } catch {
      gdalOnPath = false;
    }
  }
  const [cmd, all] = gdalOnPath ? [program, argv] : ['nix', ['shell', 'nixpkgs#gdal', '-c', program, ...argv]];
  execFileSync(cmd, all, { stdio: ['ignore', 'ignore', 'inherit'] });
}

/** A file's bytes, however large (readFileSync stops at 2 GiB). */
function bytes(path, length) {
  if (statSync(path).size !== length) throw new Error(`${path}: ${statSync(path).size} bytes, expected ${length}`);
  const buffer = new ArrayBuffer(length);
  const fd = openSync(path, 'r');
  for (let at = 0; at < length; )
    at += readSync(fd, new Uint8Array(buffer, at, Math.min(1 << 30, length - at)), 0, Math.min(1 << 30, length - at), at);
  closeSync(fd);
  return buffer;
}

/**
 * A source unpacked to plain numbers: a grid of `width` x `height` cells, rows north to south, its
 * north-west corner at (west, north) degrees and `per` cells to a degree. Heights are 32-bit
 * floats, metres; colours are three bytes a cell. The unpacked file is kept in the cache.
 */
function unpack(name, source, type, grid, window = []) {
  const path = join(work, `${name}.raw`);
  const size = grid.width * grid.height * (type === 'Float32' ? 4 : 3);
  if (!existsSync(path) || statSync(path).size !== size) {
    console.log('unpacking', name);
    gdal('gdal_translate', '-q', '-of', 'ENVI', '-ot', type, '-co', 'INTERLEAVE=BIP', ...window, source, `${path}.part`);
    renameSync(`${path}.part`, path);
  }
  const data = bytes(path, size);
  return { ...grid, data: type === 'Float32' ? new Float32Array(data) : new Uint8Array(data) };
}

/** ETOPO's surface at 60 arc-seconds, and Blue Marble at the same: the whole Earth, 60 cells a degree. */
function globeSources() {
  const grid = { width: 21600, height: 10800, west: -180, north: 90, per: 60 };
  const nc = fetched(`${ETOPO}/60s/60s_surface_elev_netcdf/ETOPO_2022_v1_60s_N90W180_surface.nc`);
  const jpg = fetched(`${BMNG}/world.200405.3x21600x10800.jpg`);
  return { relief: unpack('etopo-60s', `NETCDF:"${nc}":z`, 'Float32', grid), colour: unpack('bmng-60s', jpg, 'Byte', grid) };
}

/** ETOPO's surface at 15 arc-seconds and Blue Marble's 500 m tile over a box of whole degrees: 240 cells a degree. */
function regionSources(name, west, east, south, north) {
  const per = 240;
  const grid = { width: (east - west) * per, height: (north - south) * per, west, north, per };
  // ETOPO's 15-second tiles are 15 degrees square and named by their north-west corner
  const tiles = [];
  for (let n = Math.ceil(north / 15) * 15; n > south; n -= 15)
    for (let w = Math.floor(west / 15) * 15; w < east; w += 15) {
      const tile = `ETOPO_2022_v1_15s_${n < 0 ? 'S' : 'N'}${String(Math.abs(n)).padStart(2, '0')}${w < 0 ? 'W' : 'E'}${String(Math.abs(w)).padStart(3, '0')}_surface.nc`;
      tiles.push(`NETCDF:"${fetched(`${ETOPO}/15s/15s_surface_elev_netcdf/${tile}`)}":z`);
    }
  const vrt = join(work, `${name}-etopo-15s.vrt`);
  gdal('gdalbuildvrt', '-q', '-overwrite', vrt, ...tiles);
  const relief = unpack(`${name}-etopo-15s`, vrt, 'Float32', grid, ['-projwin', west, north, east, south].map(String));
  if (west < TILE.west || east > TILE.west + 90 || north > TILE.north || south < TILE.north - 90)
    throw new Error(`${name}: outside Blue Marble tile ${TILE.file}`);
  const window = ['-srcwin', (west - TILE.west) * per, (TILE.north - north) * per, grid.width, grid.height].map(String);
  const colour = unpack(`${name}-bmng-500m`, fetched(`${BMNG}/${TILE.file}`), 'Byte', grid, window);
  return { relief, colour };
}

// WGS 84 (bodies.ts), as tools/globe.mjs has it: its `direction` takes a latitude and longitude on the ellipsoid to
// the unit direction from the centre that the maps are looked up by. This is that, turned round.
const F = 1 / 298.257223563;
const E2 = F * (2 - F);
const DEG = 180 / Math.PI;

/** Each face's (major axis, s axis, t axis) as OpenGL picks them: tools/globe.mjs's own table. */
const FACES = [
  ['px', [1, 0, 0], [0, 0, -1], [0, -1, 0]],
  ['nx', [-1, 0, 0], [0, 0, 1], [0, -1, 0]],
  ['py', [0, 1, 0], [1, 0, 0], [0, 0, 1]],
  ['ny', [0, -1, 0], [1, 0, 0], [0, 0, -1]],
  ['pz', [0, 0, 1], [1, 0, 0], [0, -1, 0]],
  ['nz', [0, 0, -1], [-1, 0, 0], [0, -1, 0]],
];

/**
 * One map sampled from the sources. `toward(u, v)` gives the direction from the Earth's centre
 * (not of unit length) through the point u texels right and v texels down from the map's top
 * left; the map is `w` x `h` with `pad` more texels all round, which are worked (so that the
 * land's colour is carried in from beyond an edge) and then cut off. Returns the bytes to write.
 */
function sample(src, w, h, pad, toward) {
  const W = w + 2 * pad,
    H = h + 2 * pad;
  const { relief: R, colour: C } = src;
  const relief = new Uint8Array(w * h);
  const rgb = new Float32Array(W * H * 3);
  const land = new Uint8Array(W * H);
  // the same again counting only what is surely land, for the texels by the sea (below)
  const sure = new Float32Array(W * H * 3);
  const sureCount = new Uint8Array(W * H);
  const sea = new Uint8Array(W * H);
  const n = SAMPLES * SAMPLES;
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      let sum = 0,
        count = 0,
        r = 0,
        g = 0,
        b = 0,
        count2 = 0,
        r2 = 0,
        g2 = 0,
        b2 = 0;
      for (let a = 0; a < SAMPLES; a++)
        for (let c = 0; c < SAMPLES; c++) {
          const d = toward(i - pad + (c + 0.5) / SAMPLES, j - pad + (a + 0.5) / SAMPLES);
          const lon = Math.atan2(d[1], d[0]) * DEG;
          const lat = Math.atan2(d[2], (1 - E2) * Math.hypot(d[0], d[1])) * DEG;
          // the cell of each source the sample falls in: longitude goes round, latitude stops at the poles
          const rx = (((Math.floor((lon - R.west) * R.per) % (360 * R.per)) + 360 * R.per) % (360 * R.per)) | 0;
          const ry = Math.max(0, Math.min(R.height - 1, Math.floor((R.north - lat) * R.per)));
          const cx = (((Math.floor((lon - C.west) * C.per) % (360 * C.per)) + 360 * C.per) % (360 * C.per)) | 0;
          const cy = Math.max(0, Math.min(C.height - 1, Math.floor((C.north - lat) * C.per)));
          if (rx >= R.width || cx >= C.width) throw new Error(`a sample at ${lat}, ${lon} is outside the source`);
          const height = R.data[ry * R.width + rx];
          sum += height;
          const k = (cy * C.width + cx) * 3;
          const cr = C.data[k],
            cg = C.data[k + 1],
            cb = C.data[k + 2];
          if (isWater(height, cr, cg, cb)) continue;
          r += cr;
          g += cg;
          b += cb;
          count++;
          if (looksWet(cr, cg, cb)) continue;
          r2 += cr;
          g2 += cg;
          b2 += cb;
          count2++;
        }
      const at = j * W + i;
      if (count) {
        land[at] = 1;
        rgb[at * 3] = r / count;
        rgb[at * 3 + 1] = g / count;
        rgb[at * 3 + 2] = b / count;
      }
      sureCount[at] = count2;
      if (count2) {
        sure[at * 3] = r2 / count2;
        sure[at * 3 + 1] = g2 / count2;
        sure[at * 3 + 2] = b2 / count2;
      }
      if (sum <= 0) sea[at] = 1;
      if (i >= pad && i < w + pad && j >= pad && j < h + pad) relief[(j - pad) * w + i - pad] = encodeRelief(sum / n);
    }
  // By the sea (within COAST texels of a texel whose mean height is none) the two sources do not lie
  // exactly on one another, and water painted where ETOPO has ground would be carried out as the
  // land's colour: there, only what does not look like water counts. Inland, a lake keeps its colour.
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const at = j * W + i;
      if (!land[at]) continue;
      let coastal = false;
      for (let dj = -COAST; dj <= COAST && !coastal; dj++)
        for (let di = -COAST; di <= COAST; di++)
          if (i + di >= 0 && i + di < W && j + dj >= 0 && j + dj < H && sea[at + dj * W + di]) {
            coastal = true;
            break;
          }
      if (!coastal) continue;
      if (sureCount[at]) rgb.set(sure.subarray(at * 3, at * 3 + 3), at * 3);
      else land[at] = 0;
    }
  spread(rgb, land, W, H);
  const colour = new Uint8Array(w * h * 3);
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++)
      for (let k = 0; k < 3; k++)
        colour[(j * w + i) * 3 + k] = Math.max(0, Math.min(255, Math.round(rgb[((j + pad) * W + i + pad) * 3 + k])));
  return { relief, colour };
}

/**
 * Whether a sample of Blue Marble shows water and not land. Its deep sea is one flat colour
 * (2, 5, 20), a little disturbed by the JPEG; its shallows (the Bahama Banks, reefs) are painted,
 * bluer than they are red, where ETOPO has the bed at or under sea level. Land under sea level
 * (the Caspian's shore, the polders) is land: it is not blue. Snow is as blue as it is red, and
 * stands above the sea.
 */
function isWater(height, r, g, b) {
  if (r < 16 && g < 20 && b > 8 && b < 40 && b > r + 6) return true;
  return height <= 0 && b > r;
}

/** Whether a sample of Blue Marble looks like water whatever ETOPO says is under it: clearly bluer than red (snow in shadow is a little; a painted shallow is a lot), or as dark as the deep sea. */
function looksWet(r, g, b) {
  return b - r > 0.2 * Math.max(g, b) || r + g + b < 60;
}

/** Carry the land's colour out over the texels that have none: each takes the mean of its neighbours that had a colour the round before, DILATE rounds; the rest take TONE. */
function spread(rgb, land, W, H) {
  let edge = [];
  const near = (at, i, j, visit) => {
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        if ((di || dj) && i + di >= 0 && i + di < W && j + dj >= 0 && j + dj < H) visit(at + dj * W + di);
      }
  };
  // the first round's texels: sea beside land
  const queued = new Uint8Array(W * H);
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const at = j * W + i;
      if (land[at]) continue;
      let beside = false;
      near(at, i, j, (k) => {
        if (land[k]) beside = true;
      });
      if (beside) {
        edge.push(at);
        queued[at] = 1;
      }
    }
  for (let round = 0; round < DILATE && edge.length; round++) {
    const next = [];
    const found = new Float32Array(edge.length * 3);
    edge.forEach((at, e) => {
      let r = 0,
        g = 0,
        b = 0,
        count = 0;
      const i = at % W,
        j = (at - i) / W;
      near(at, i, j, (k) => {
        if (land[k]) {
          r += rgb[k * 3];
          g += rgb[k * 3 + 1];
          b += rgb[k * 3 + 2];
          count++;
        } else if (!queued[k]) {
          queued[k] = 1;
          next.push(k);
        }
      });
      found[e * 3] = r / count;
      found[e * 3 + 1] = g / count;
      found[e * 3 + 2] = b / count;
    });
    edge.forEach((at, e) => {
      land[at] = 1;
      rgb.set(found.subarray(e * 3, e * 3 + 3), at * 3);
    });
    edge = next;
  }
  for (let at = 0; at < W * H; at++) if (!land[at]) rgb.set(TONE, at * 3);
  // what was carried out lies in streaks, each the colour of one texel of the shore: smoothed (the land itself is not touched)
  const filled = [];
  for (let at = 0; at < W * H; at++) if (queued[at] && land[at]) filled.push(at);
  const next = new Float32Array(filled.length * 3);
  for (let pass = 0; pass < SMOOTH; pass++) {
    filled.forEach((at, e) => {
      const i = at % W,
        j = (at - i) / W;
      let r = rgb[at * 3],
        g = rgb[at * 3 + 1],
        b = rgb[at * 3 + 2],
        count = 1;
      near(at, i, j, (k) => {
        if (!land[k]) return;
        r += rgb[k * 3];
        g += rgb[k * 3 + 1];
        b += rgb[k * 3 + 2];
        count++;
      });
      next[e * 3] = r / count;
      next[e * 3 + 1] = g / count;
      next[e * 3 + 2] = b / count;
    });
    filled.forEach((at, e) => {
      rgb.set(next.subarray(e * 3, e * 3 + 3), at * 3);
    });
  }
}

/** Write three bytes a texel as a JPEG (through a PPM in the cache, by ImageMagick). */
function writeJpeg(path, data, w, h) {
  const ppm = join(work, 'out.ppm');
  writeFileSync(ppm, Buffer.concat([Buffer.from(`P6\n${w} ${h}\n255\n`, 'ascii'), data]));
  execFileSync('magick', [ppm, '-strip', '-sampling-factor', '4:2:0', '-quality', String(QUALITY), path]);
}

const sizeOf = (file) => `${(statSync(join(out, file)).size / 1e6).toFixed(2)} MB`;

function bakeGlobe(size) {
  const src = globeSources();
  for (const [name, ma, sa, ta] of FACES) {
    const began = performance.now();
    // s = -1 is the left of texel 0 and t = -1 the top of row 0, as tools/globe.mjs projects them
    const { relief, colour } = sample(src, size, size, DILATE + 2, (u, v) => {
      const s = (u / size) * 2 - 1,
        t = (v / size) * 2 - 1;
      return [ma[0] + s * sa[0] + t * ta[0], ma[1] + s * sa[1] + t * ta[1], ma[2] + s * sa[2] + t * ta[2]];
    });
    writeGreyPng(join(out, `relief.${name}.png`), relief, size, size);
    writeJpeg(join(out, `colour.${name}.jpg`), colour, size, size);
    console.log(
      `relief.${name}.png ${sizeOf(`relief.${name}.png`)}, colour.${name}.jpg ${sizeOf(`colour.${name}.jpg`)}, ${Math.round(performance.now() - began)} ms`,
    );
  }
}

function bakeRegion(region) {
  const began = performance.now();
  const [lat0, lon0] = region.centre;
  const plane = planeAt(lat0, lon0);
  // the smallest rectangle of the plane that holds the bounds: their corners and their edges, walked
  let x0 = Infinity,
    x1 = -Infinity,
    y0 = Infinity,
    y1 = -Infinity;
  const take = (lat, lon) => {
    const [x, y] = toPlane(plane, surfaceDirection(lat, lon));
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  };
  for (let k = 0; k <= 1000; k++) {
    const lat = region.south + ((region.north - region.south) * k) / 1000,
      lon = region.west + ((region.east - region.west) * k) / 1000;
    take(lat, region.west);
    take(lat, region.east);
    take(region.south, lon);
    take(region.north, lon);
  }
  const radius = gaussianRadius(lat0);
  const width = Math.round(((x1 - x0) * radius) / region.metres),
    height = Math.round(((y1 - y0) * radius) / region.metres);
  const metres = (((x1 - x0) / width + (y1 - y0) / height) / 2) * radius;
  // the plane's rectangle reaches past the bounds between its corners: what it covers, in whole degrees
  const { centre: c, east: e, north: n } = plane;
  const toward = (u, v) => {
    const x = x0 + ((x1 - x0) * u) / width,
      y = y1 - ((y1 - y0) * v) / height;
    return [c[0] + x * e[0] + y * n[0], c[1] + x * e[1] + y * n[1], c[2] + x * e[2] + y * n[2]];
  };
  let west = Infinity,
    east = -Infinity,
    south = Infinity,
    north = -Infinity;
  for (let k = 0; k <= 1000; k++)
    for (const d of [
      toward((width * k) / 1000, 0),
      toward((width * k) / 1000, height),
      toward(0, (height * k) / 1000),
      toward(width, (height * k) / 1000),
    ]) {
      const lon = Math.atan2(d[1], d[0]) * DEG,
        lat = Math.atan2(d[2], (1 - E2) * Math.hypot(d[0], d[1])) * DEG;
      west = Math.min(west, lon);
      east = Math.max(east, lon);
      south = Math.min(south, lat);
      north = Math.max(north, lat);
    }
  const src = regionSources(
    region.name,
    Math.floor(west - 0.01),
    Math.ceil(east + 0.01),
    Math.floor(south - 0.01),
    Math.ceil(north + 0.01),
  );
  const { relief, colour } = sample(src, width, height, 0, toward);
  const files = { relief: `${region.name}.relief.png`, colour: `${region.name}.colour.jpg`, json: `${region.name}.surface.json` };
  writeGreyPng(join(out, files.relief), relief, width, height);
  writeJpeg(join(out, files.colour), colour, width, height);
  const map = (file) => ({ file, width, height, metres: Number(metres.toFixed(3)) });
  const json = {
    region: region.name,
    data: DATA,
    centre: region.centre,
    box: [x0, x1, y0, y1],
    relief: map(files.relief),
    colour: map(files.colour),
    fade: 0.05 * Math.min(x1 - x0, y1 - y0),
  };
  writeFileSync(join(out, files.json), `${JSON.stringify(json, null, 2)}\n`);
  console.log(
    `${files.relief} ${sizeOf(files.relief)}, ${files.colour} ${sizeOf(files.colour)}: ${width} x ${height}, ${metres.toFixed(1)} m a texel, ${Math.round(performance.now() - began)} ms`,
  );
}

const only = opt('only', null);
if (only !== 'region') bakeGlobe(Number(opt('size', 2048)));
if (only !== 'globe') for (const region of REGIONS) bakeRegion(region);

// Bakes the weather round a site (src/viewer/weather.ts: weatherAt) for the clouds seen from height
// (viewer/clouds.ts, viewer/globe.ts): how much of the sky the cumulus cover, the high cloud, the
// middle decks, on the site's own horizontal plane.
//   node tools/globe-weather.mjs <site module>
//
// <site module> is a sites/<site>.ts exporting a SiteDef with a `region`; the map is written to
// public/globe/<region>.weather.png (red: cumulus cover; green: cirrus; blue: the middle deck; alpha: land).
// It reads the globe's own baked maps for where the land is and how high (public/globe/land.*.png
// from tools/globe.mjs, relief.*.png from tools/globe-surface.mjs): bake those first. Everything
// in the map is estimated: see weather.ts.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { EXTENT, landShare, SIDE, weatherAt } from '../src/viewer/weather.ts';
import { DEG, siteFrame, siteToEcef } from '../src/world/frames.ts';
import { decodeRelief } from '../src/world/relief.ts';
import { gaussianRadius } from '../src/world/surface.ts';
import { readGreyPng, writeRgbPng } from './png.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sitePath = process.argv[2];
if (!sitePath) throw new Error('usage: node tools/globe-weather.mjs <sites/<site>.ts>');
const def = Object.values(await import(pathToFileURL(resolve(sitePath)).href)).find((v) => v && typeof v === 'object' && v.region);
if (!def) throw new Error(`${sitePath}: no SiteDef with a region`);
const site = siteFrame(def);

/** The cube's faces as tools/globe.mjs writes them: major axis, s axis, t axis. */
const FACES = [
  ['px', [1, 0, 0], [0, 0, -1], [0, -1, 0]],
  ['nx', [-1, 0, 0], [0, 0, 1], [0, -1, 0]],
  ['py', [0, 1, 0], [1, 0, 0], [0, 0, 1]],
  ['ny', [0, -1, 0], [1, 0, 0], [0, 0, -1]],
  ['pz', [0, 0, 1], [1, 0, 0], [0, -1, 0]],
  ['nz', [0, 0, -1], [-1, 0, 0], [0, -1, 0]],
];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cube = (name) =>
  FACES.map(([f]) => {
    const png = readFileSync(join(root, 'public/globe', `${name}.${f}.png`));
    return { data: readGreyPng(png).data, size: png.readUInt32BE(16) };
  });
/** A cube map read toward a direction, between its four nearest texels; and the cosine from the face's middle. */
export function sample(faces, d) {
  let best = 0;
  for (let k = 1; k < 6; k++) if (dot(d, FACES[k][1]) > dot(d, FACES[best][1])) best = k;
  const [, ma, sa, ta] = FACES[best];
  const { data, size } = faces[best];
  const m = dot(d, ma);
  const x = Math.min(size - 1.001, Math.max(0, ((dot(d, sa) / m + 1) / 2) * size - 0.5)),
    y = Math.min(size - 1.001, Math.max(0, ((dot(d, ta) / m + 1) / 2) * size - 0.5));
  const i = Math.floor(x),
    j = Math.floor(y),
    fx = x - i,
    fy = y - j;
  const at = (a, b) => data[b * size + a];
  const v = at(i, j) * (1 - fx) * (1 - fy) + at(i + 1, j) * fx * (1 - fy) + at(i, j + 1) * (1 - fx) * fy + at(i + 1, j + 1) * fx * fy;
  return { v, m: m / Math.hypot(d[0], d[1], d[2]), size };
}

const land = cube('land');
const relief = cube('relief');
/** Distances to the shore are kept to this many texels (tools/globe.mjs: SPREAD). */
const SPREAD = 8;
const EARTH = 6_371_000;
const R = gaussianRadius(site.latitude);
// the wind at the site blows toward 270 (viewer/cape.ts: CLOUDS, from the record's surface wind): east, north
const WIND = [-1, 0];

const out = new Uint8Array(SIDE * SIDE * 4);
const byte = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));
for (let j = 0; j < SIDE; j++) {
  const n = (0.5 - (j + 0.5) / SIDE) * EXTENT;
  for (let i = 0; i < SIDE; i++) {
    const e = ((i + 0.5) / SIDE - 0.5) * EXTENT;
    // the point of the sea straight under (e, n) on the site's plane: its x and z in the site's frame, and down the curve
    const r2 = e * e + n * n;
    const y = -r2 / (R + Math.sqrt(Math.max(R * R - r2, 0)));
    const b = site.bearingX * DEG;
    const p = siteToEcef(site, [e * Math.sin(b) + n * Math.cos(b), y, e * Math.cos(b) - n * Math.sin(b)]);
    const l = sample(land, p);
    const shore = (((l.v - 128) * SPREAD) / 127) * ((2 / l.size) * EARTH * l.m * Math.sqrt(l.m)) * 1e-3;
    const height = decodeRelief(sample(relief, p).v);
    const w = weatherAt(e, n, { shore, height }, WIND);
    const at = (j * SIDE + i) * 4;
    out[at] = byte(w.cumulus);
    out[at + 1] = byte(w.cirrus);
    out[at + 2] = byte(w.deck);
    out[at + 3] = byte(landShare({ shore, height }));
  }
}
const file = join(root, 'public/globe', `${def.region.name}.weather.png`);
writeRgbPng(file, out, SIDE, SIDE, 4);
console.log(file, `${SIDE} x ${SIDE}, ${(EXTENT / SIDE / 1000).toFixed(1)} km a texel`);

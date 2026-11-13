// Bakes the weather round a site on a flight's day (src/viewer/weather.ts: weatherAt) for the clouds seen from
// height (viewer/clouds.ts, viewer/globe.ts): how much of the sky the cumulus cover, the high cloud, the middle
// decks, on the site's own horizontal plane.
//   node tools/globe-weather.mjs <flight module> [<flight module> ...]
//
// <flight module> is a flights/<flight>/flight.ts exporting a Flight with a `site` that has a `region` and a
// `weather` of its own; its map is written to public/globe/<region>.<date>.weather.png (the date its launch's, UTC;
// red: cumulus cover; green: high cloud; blue: the middle deck; alpha: land). One map for each region and day:
// weather.ts says why. It reads the globe's own baked maps for where the land is and how high
// (public/globe/land.*.png from tools/globe.mjs, relief.*.png from tools/globe-surface.mjs): bake those first.
// Everything in the map is estimated but what the flight's record says (its `weather`: the high cloud over the
// site, and `beyond`): see weather.ts.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dayOf } from '../src/viewer/day.ts';
import { EXTENT, landShare, mapDayOf, SIDE, weatherAt } from '../src/viewer/weather.ts';
import { DEG, ecefToGeodetic, siteFrame, siteToEcef } from '../src/world/frames.ts';
import { decodeRelief } from '../src/world/relief.ts';
import { gaussianRadius } from '../src/world/surface.ts';
import { readGreyPng, writeRgbPng } from './png.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const flights = process.argv.slice(2);
if (!flights.length) throw new Error('usage: node tools/globe-weather.mjs <flights/<flight>/flight.ts> ...');

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
const byte = (v) => Math.max(0, Math.min(255, Math.round(v * 255)));

for (const path of flights) {
  const flight = Object.values(await import(pathToFileURL(resolve(path)).href)).find(
    (v) => v && typeof v === 'object' && v.site && v.launch,
  );
  if (!flight?.site.region) throw new Error(`${path}: no Flight whose site has a region`);
  if (!flight.weather) throw new Error(`${path}: the flight has no weather of its own: a site's default has no map (viewer/day.ts)`);
  const site = siteFrame(flight.site);
  const R = gaussianRadius(site.latitude);
  // the day as the viewer has it: the way the low wind blows, the record's high cloud over the site and what it says beyond
  const day = dayOf(flight);
  const map = mapDayOf(day);
  const located = map.beyond.length > 0; // (only a record that speaks of a stretch of country asks where a place is)
  const out = new Uint8Array(SIDE * SIDE * 4);
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
      const place = { shore, height };
      if (located) {
        const g = ecefToGeodetic(p);
        place.latitude = g.latitude;
        place.longitude = g.longitude;
      }
      const w = weatherAt(e, n, place, map);
      const at = (j * SIDE + i) * 4;
      out[at] = byte(w.cumulus);
      out[at + 1] = byte(w.cirrus);
      out[at + 2] = byte(w.deck);
      out[at + 3] = byte(landShare(place));
    }
  }
  const file = join(root, 'public/globe', `${day.map}.weather.png`);
  writeRgbPng(file, out, SIDE, SIDE, 4);
  console.log(file, `${SIDE} x ${SIDE}, ${(EXTENT / SIDE / 1000).toFixed(1)} km a texel`);
}

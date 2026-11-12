// The relief maps (tools/globe-surface.mjs): the byte a height is kept in (world/relief.ts), and
// the baked files read back at places whose heights are known, which pins the cube's faces and the
// region's plane: a face turned or a row order flipped puts sea where Everest should be.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { placeOnPlane, planeAt, surfaceDirection } from '../src/world/region.ts';
import { decodeRelief, encodeRelief, RELIEF, RELIEF_GLSL } from '../src/world/relief.ts';
import { readGreyPng } from '../tools/png.mjs';

const globe = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'globe');

test('a height comes back from its byte within one step', () => {
  for (const h of [-1, -5, -20, -200, -4000, 1, 50, 500, 3000, 8000]) {
    const v = encodeRelief(h);
    assert.ok(Number.isInteger(v) && v >= 1 && v <= 255, `${h} m: ${v}`);
    // one step: the heights of the bytes each side of the one written
    const lo = decodeRelief(v - 1),
      hi = decodeRelief(v + 1);
    assert.ok(lo < h && h < hi, `${h} m is byte ${v}, between ${lo} and ${hi} m`);
    assert.ok(Math.abs(decodeRelief(v) - h) <= (hi - lo) / 2, `${h} m comes back as ${decodeRelief(v)}`);
  }
});

test('the fixed points: sea level, the deepest trench, the highest mountain, and nothing written as no data', () => {
  assert.equal(encodeRelief(0), RELIEF.sea);
  assert.equal(decodeRelief(RELIEF.sea), 0);
  assert.equal(encodeRelief(-RELIEF.deepest), 1);
  assert.equal(encodeRelief(RELIEF.highest), 255);
  assert.ok(Math.abs(decodeRelief(1) + RELIEF.deepest) < 1e-6);
  assert.ok(Math.abs(decodeRelief(255) - RELIEF.highest) < 1e-6);
  for (const h of [-20000, -11500, 9000, 1e6]) assert.notEqual(encodeRelief(h), RELIEF.none);
  assert.equal(encodeRelief(-20000), 1);
  assert.equal(encodeRelief(1e6), 255);
  // shallow water is finely kept: under half a metre a step at 5 m down
  const v = encodeRelief(-5);
  assert.ok(decodeRelief(v) - decodeRelief(v - 1) < 0.5);
});

test('the byte never falls as the height rises, and the height rises with every byte', () => {
  let last = 0;
  for (let h = -11000; h <= 8850; h += 0.5) {
    const v = encodeRelief(h);
    assert.ok(v >= last, `${h} m`);
    last = v;
  }
  for (let v = 1; v < 255; v += 0.25) assert.ok(decodeRelief(v + 0.25) > decodeRelief(v), `byte ${v}`);
});

test('the shader decodes as decodeRelief does', () => {
  // the GLSL is three lines of arithmetic: run as JavaScript with GLSL's max and exp, it must give the same heights
  const body = RELIEF_GLSL.slice(RELIEF_GLSL.indexOf('{') + 1, RELIEF_GLSL.lastIndexOf('}')).replace(/float /g, 'const ');
  const glsl = new Function('v', 'max', 'exp', body);
  for (let v = 1; v <= 255; v += 0.5) {
    const want = decodeRelief(v);
    assert.ok(Math.abs(glsl(v, Math.max, Math.exp) - want) <= 1e-6 * Math.max(1, Math.abs(want)), `byte ${v}`);
  }
});

/** The cube's faces as tools/globe.mjs writes them and OpenGL samples them: major axis, s axis, t axis. */
const FACES = [
  ['px', [1, 0, 0], [0, 0, -1], [0, -1, 0]],
  ['nx', [-1, 0, 0], [0, 0, 1], [0, -1, 0]],
  ['py', [0, 1, 0], [1, 0, 0], [0, 0, 1]],
  ['ny', [0, -1, 0], [1, 0, 0], [0, 0, -1]],
  ['pz', [0, 0, 1], [1, 0, 0], [0, -1, 0]],
  ['nz', [0, 0, -1], [-1, 0, 0], [0, -1, 0]],
];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const faces = new Map();

/** The height the globe's relief has toward a place, metres: the texel the direction from the Earth's centre falls in. */
function globeHeight(latitude, longitude) {
  const d = surfaceDirection(latitude, longitude);
  const [name, ma, sa, ta] = FACES.reduce((best, face) => (dot(d, face[1]) > dot(d, best[1]) ? face : best));
  if (!faces.has(name)) faces.set(name, readGreyPng(readFileSync(join(globe, `relief.${name}.png`))));
  const { width, height, data } = faces.get(name);
  const m = dot(d, ma);
  // s = -1 is the left of texel 0, t = -1 the top of row 0
  const i = Math.floor(((dot(d, sa) / m + 1) / 2) * width),
    j = Math.floor(((dot(d, ta) / m + 1) / 2) * height);
  return decodeRelief(data[j * width + i]);
}

test('the globe: Everest is high and the Challenger Deep is deep', () => {
  const everest = globeHeight(27.99, 86.93);
  assert.ok(everest > 5000, `Everest's texel: ${everest} m`);
  const challenger = globeHeight(11.35, 142.2);
  assert.ok(challenger < -7000, `the Challenger Deep's texel: ${challenger} m`);
  // and the faces are whole: nothing is "no data"
  for (const { data } of faces.values()) assert.ok(!data.includes(RELIEF.none));
});

test("the region: the Bahama Banks are shallow, the Tongue of the Ocean deep, Orlando a little above the sea, on region.ts's plane", () => {
  const json = JSON.parse(readFileSync(join(globe, 'cape-canaveral.surface.json'), 'utf8'));
  const { width, height, data } = readGreyPng(readFileSync(join(globe, json.relief.file)));
  assert.equal(width, json.relief.width);
  assert.equal(height, json.relief.height);
  const plane = planeAt(json.centre[0], json.centre[1]);
  const [x0, x1, y0, y1] = json.box;
  const at = (latitude, longitude) => {
    const [x, y] = placeOnPlane(plane, latitude, longitude);
    // x runs east along a row; rows run north to south
    const i = Math.floor(((x - x0) / (x1 - x0)) * width),
      j = Math.floor(((y1 - y) / (y1 - y0)) * height);
    assert.ok(i >= 0 && i < width && j >= 0 && j < height, `${latitude}, ${longitude} is on the map`);
    return decodeRelief(data[j * width + i]);
  };
  // ETOPO at these places (the 15-second tile, asked of GDAL): -18 m, -1 m, -6 m; -963 m, -2,006 m; 31 m.
  // Its soundings on Little Bahama Bank are sparse, and at 26.9 N 78.0 W it has 18 m where charts have under 10.
  const bank = at(26.9, -78.0);
  assert.ok(bank > -30 && bank < 0, `Little Bahama Bank, north of Grand Bahama: ${bank} m`);
  const bankWest = at(27.0, -78.5);
  assert.ok(bankWest > -15 && bankWest < 0, `Little Bahama Bank, north of West End: ${bankWest} m`);
  const great = at(24.5, -78.9);
  assert.ok(great > -15 && great < 0, `Great Bahama Bank, west of Andros: ${great} m`);
  const wall = at(25.0, -77.6);
  assert.ok(wall < -500, `Tongue of the Ocean, its east wall: ${wall} m`);
  const tongue = at(25.0, -77.8);
  assert.ok(tongue < -1000, `Tongue of the Ocean: ${tongue} m`);
  const orlando = at(28.5, -81.4);
  assert.ok(orlando > 5 && orlando < 60, `Orlando: ${orlando} m`);
  // the box holds the bounds it was made for, and the fade is a twentieth of its smaller side
  for (const [latitude, longitude] of [
    [20.5, -84.5],
    [20.5, -72.5],
    [31.5, -84.5],
    [31.5, -72.5],
    [31.5, -78.5],
    [20.5, -78.5],
  ]) {
    const [x, y] = placeOnPlane(plane, latitude, longitude);
    assert.ok(x >= x0 - 1e-12 && x <= x1 + 1e-12 && y >= y0 - 1e-12 && y <= y1 + 1e-12, `${latitude}, ${longitude}`);
  }
  assert.ok(Math.abs(json.fade - 0.05 * Math.min(x1 - x0, y1 - y0)) < 1e-12);
  assert.ok(!data.includes(RELIEF.none));
});

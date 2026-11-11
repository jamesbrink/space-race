// src/world/region.ts: the gnomonic plane a region's map is drawn on, against what a gnomonic projection
// is (great circles straight, distance from the middle the tangent of the angle); and the Cape's baked
// map (public/globe/cape-canaveral.*, tools/globe-region.mjs) against published places: land where
// they are on land, water where they are on the water, and the shore as it stood in 1961.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { angleBetween, cross, dot, geodeticToEcef, length, unit } from '../src/world/frames.ts';
import { angleFromMiddle, fromPlane, placeOnPlane, planeAt, surfaceDirection, toPlane } from '../src/world/region.ts';
import { readGreyPng } from '../tools/png.mjs';

const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} vs ${b}`);

test('the plane touches the sphere at its middle, east and north along it', () => {
  const p = planeAt(28.44, -80.57);
  const [x, y] = toPlane(p, p.centre);
  near(x, 0, 1e-15, 'x at the middle');
  near(y, 0, 1e-15, 'y at the middle');
  near(dot(p.east, p.centre), 0, 1e-15, 'east is square to the middle');
  near(dot(p.north, p.centre), 0, 1e-15, 'north is square to the middle');
  near(p.east[2], 0, 1e-15, 'east is level: no part along the axis');
  assert.ok(p.north[2] > 0, 'north goes toward the pole');
  // a place a little east is +x, a little north +y
  assert.ok(placeOnPlane(p, 28.44, -80.5)[0] > 0);
  assert.ok(placeOnPlane(p, 28.5, -80.57)[1] > 0);
  // the direction to a place is the ellipsoid's point, not the geodetic normal
  const d = surfaceDirection(28.44, -80.57);
  near(angleBetween(d, unit(geodeticToEcef({ latitude: 28.44, longitude: -80.57, height: 0 }))), 0, 1e-15, 'direction');
});

test('it is gnomonic: great circles are straight, and the distance from the middle is tan of the angle', () => {
  const p = planeAt(27.6, -78.35);
  const a = surfaceDirection(28.44, -80.57);
  const b = surfaceDirection(27.23, -75.88);
  const pole = unit(cross(a, b));
  const [ax, ay] = toPlane(p, a);
  const [bx, by] = toPlane(p, b);
  for (const f of [0.1, 0.37, 0.5, 0.81]) {
    // a point on the great circle through a and b, by slerp
    const w = angleBetween(a, b);
    const s = unit(a.map((v, i) => (Math.sin((1 - f) * w) * v + Math.sin(f * w) * b[i]) / Math.sin(w)));
    near(dot(s, pole), 0, 1e-12, 'on the great circle');
    const [sx, sy] = toPlane(p, s);
    const off = ((bx - ax) * (sy - ay) - (by - ay) * (sx - ax)) / Math.hypot(bx - ax, by - ay);
    near(off, 0, 1e-12, `straight at ${f}`);
    near(angleFromMiddle(sx, sy), angleBetween(s, p.centre), 1e-12, `tan at ${f}`);
  }
  // and back again
  const [x, y] = toPlane(p, b);
  near(angleBetween(fromPlane(p, x, y), b), 0, 1e-12, 'fromPlane undoes toPlane');
  assert.equal(
    toPlane(
      p,
      p.centre.map((v) => -v),
    ),
    null,
    'the far side never meets it',
  );
  near(length(fromPlane(p, 0.1, -0.2)), 1, 1e-15, 'a unit direction');
});

const root = join(import.meta.dirname, '..');
const meta = JSON.parse(readFileSync(join(root, 'public/globe/cape-canaveral.json'), 'utf8'));
const maps = Object.fromEntries(
  meta.levels.map((l) => [
    l.name,
    { ...l, plane: planeAt(...l.centre), png: readGreyPng(readFileSync(join(root, 'public/globe', l.file))) },
  ]),
);
/** The baked distance to the shore at a place, metres (positive on land), from one map, bilinear as the GPU reads it. */
function shore(name, lat, lon) {
  const m = maps[name];
  const [x, y] = placeOnPlane(m.plane, lat, lon);
  const [x0, x1, y0, y1] = m.box;
  assert.ok(x > x0 && x < x1 && y > y0 && y < y1, `${lat}, ${lon} is on the ${name} map`);
  const tx = ((x - x0) / (x1 - x0)) * m.width - 0.5,
    ty = ((y1 - y) / (y1 - y0)) * m.height - 0.5;
  const i = Math.floor(tx),
    j = Math.floor(ty),
    fx = tx - i,
    fy = ty - j;
  const at = (a, b) => m.png.data[b * m.width + a];
  const v = (at(i, j) * (1 - fx) + at(i + 1, j) * fx) * (1 - fy) + (at(i, j + 1) * (1 - fx) + at(i + 1, j + 1) * fx) * fy;
  return ((v - 128) * meta.spread * m.metres) / 127;
}

test('the maps are what the viewer expects', () => {
  assert.equal(meta.spread, 8);
  assert.deepEqual(Object.keys(maps).sort(), ['near', 'wide']);
  for (const m of Object.values(maps)) {
    assert.equal(m.png.width, m.width);
    assert.equal(m.png.height, m.height);
    assert.ok(m.width <= 4096 && m.height <= 4096, 'within what every GPU takes');
  }
  near(maps.near.metres, 39.1, 0.1, 'near map, metres a texel');
});

test('the Cape: land and water where the published places are', () => {
  const places = [
    // [what, latitude, longitude, land?, maps]
    ["Launch Complex 5's launcher (sites/lc-5.ts)", 28.439426, -80.573292, true, ['near', 'wide']],
    ['Cape Canaveral Light (Wikipedia: 28 27 35 N, 80 32 36 W)', 28.45972, -80.54333, true, ['near']],
    ['the Atlantic 5 km east of the pad', 28.4394, -80.522, false, ['near', 'wide']],
    ['the Banana River abreast of the pad', 28.44, -80.625, false, ['near', 'wide']],
    ['Merritt Island abreast of the pad', 28.44, -80.685, true, ['near', 'wide']],
    ['the Indian River at Cocoa', 28.355, -80.715, false, ['near']],
    ['Mosquito Lagoon', 28.8, -80.78, false, ['near']],
    ['Lake Okeechobee, its middle', 26.95, -80.82, false, ['wide']],
    ['Freeport, Grand Bahama (Wikipedia: 26 32 N, 78 42 W)', 26.533, -78.7, true, ['wide']],
    ['Marsh Harbour airport, Great Abaco (Wikipedia: 26 30 40 N, 77 05 02 W)', 26.5111, -77.0839, true, ['wide']],
    ["Freedom 7's landing, 27 13.7 N 75 53 W (the flight's README)", 27.228, -75.883, false, ['wide']],
  ];
  for (const [what, lat, lon, land, on] of places)
    for (const name of on) {
      const d = shore(name, lat, lon);
      assert.ok(land ? d > 0 : d < 0, `${what}: ${d.toFixed(0)} m from the shore on the ${name} map`);
    }
});

test('the shore is drawn as it stood on 5 May 1961: later causeways gone, later canals filled', () => {
  // the Bennett Causeway (1963) across the Indian River, and the NASA Causeway (1964), are water again
  assert.ok(shore('near', 28.4027, -80.733) < -40, 'Bennett Causeway, Indian River');
  assert.ok(shore('near', 28.5273, -80.76) < -40, 'NASA Causeway, Indian River');
  // the Canaveral Barge Canal (1965) across Merritt Island, and Complex 39's turning basin, are land again
  assert.ok(shore('near', 28.4091, -80.69) > 40, 'Canaveral Barge Canal');
  assert.ok(shore('near', 28.5835, -80.6435) > 40, "Complex 39's turning basin");
  // the SR 520 causeway (1941) stands: land along it across the Indian River
  assert.ok(shore('near', 28.3567, -80.712) > 0, 'Merritt Island Causeway, 1941');
});

// The Moon's made ground (src/viewer/moonground.ts) and the ground round the front page's site as the altimeter has
// it (src/viewer/moonsite.ts): that what is made is the same every time, that its craters are as many as the law it
// cites says, and that the site's ground is read as it was baked.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PATH, SITE, SITE_DIR } from '../src/app/front/view.ts';
import { CRATER_SHARE, CRATERS, cellOf, craterIn, octaveDiameter } from '../src/viewer/moonground.ts';
import { SiteGround } from '../src/viewer/moonsite.ts';
import { MOON_RADIUS } from '../src/world/moon.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const near = (got, want, tolerance, what) =>
  assert.ok(Math.abs(got - want) <= tolerance, `${what}: got ${got}, want ${want} within ${tolerance}`);

test('the made craters are the same every time: a cell’s crater is its numbers hashed', () => {
  // (these are what the shader draws there too: the same sums on the same whole numbers. A change here moves every
  // crater on the front page's ground, and the blocks laid out round them)
  assert.deepEqual(craterIn(0, 0, 0), craterIn(0, 0, 0));
  const some = [craterIn(3, -7, 2), craterIn(-120, 44, 6), craterIn(1000, 1000, 11)].map((c) => c && [c.x, c.y, c.diameter, c.age]);
  assert.deepEqual(
    some.map((c) => c?.map((v) => Number(v.toFixed(4)))),
    [
      [2359.7884, -9251.5091, 288.4222, 0.1724],
      [-7813.2048, 2540.7146, 26.9364, 0.0317],
      [1991.8465, 1983.3675, 0.627, 0.6311],
    ],
  );
  // a crater lies in its own cell, give or take the octave's shift, and is of its octave's sizes
  for (let k = 0; k < CRATERS.octaves; k++)
    for (let i = -20; i < 20; i++) {
      const c = craterIn(i, 3 * i + k, k);
      if (!c) continue;
      const d = octaveDiameter(k);
      assert.ok(c.diameter >= d && c.diameter <= 2 * d, `octave ${k}: ${c.diameter} m`);
      assert.deepEqual(cellOf(c.x, c.y, k), [i, 3 * i + k], 'in its own cell');
      assert.ok(c.age >= 0 && c.age <= 1);
    }
});

test('there are as many craters of each size as the Moon’s old ground has: N(> D) = 0.079 D^-2 a square kilometre', () => {
  near(CRATER_SHARE, 0.948, 0.001, 'the share of cells that hold one (derived from the law)');
  assert.ok(CRATER_SHARE <= 1, 'no more than one a cell');
  assert.ok(['documented', 'assumed', 'derived', 'estimated'].includes(CRATERS.k.confidence) && CRATERS.k.source.length > 40);
  // count them on a square 40 km a side, in the octaves from 64 m up
  const side = 40_000;
  const found = [];
  for (let k = 0; octaveDiameter(k) >= 64; k++) {
    const [i0, j0] = cellOf(0, 0, k);
    const [i1, j1] = cellOf(side, side, k);
    for (let j = j0 - 1; j <= j1 + 1; j++)
      for (let i = i0 - 1; i <= i1 + 1; i++) {
        const c = craterIn(i, j, k);
        if (c && c.x >= 0 && c.x < side && c.y >= 0 && c.y < side) found.push(c.diameter);
      }
  }
  for (const d of [100, 200, 400, 800]) {
    const counted = found.filter((x) => x > d).length;
    // (the law, less what would be over 2,048 m, which the altimeter's map has and this does not make)
    const law = CRATERS.k.value * (side / 1000) ** 2 * ((d / 1000) ** -2 - 2.048 ** -2);
    assert.ok(Math.abs(counted / law - 1) < 0.1, `wider than ${d} m: ${counted}, the law says ${law.toFixed(0)}`);
  }
  // one in ten is fresh enough to have a sharp rim, and most are worn
  const ages = [];
  for (let i = 0; i < 4000; i++) {
    const c = craterIn(i, -i, 5);
    if (c) ages.push(c.age);
  }
  near(ages.filter((a) => a < 0.1).length / ages.length, 0.1, 0.02, 'the share under a tenth of the way to worn away');
});

test('the ground round the site is the bake’s, smooth, and the path is clear of it', () => {
  const meta = JSON.parse(readFileSync(join(root, 'public/front/moon.json'), 'utf8')).site;
  const file = readFileSync(join(root, 'public/front', meta.file));
  const site = new SiteGround(meta, new Int16Array(file.buffer, file.byteOffset, file.length / 2));
  near(site.height(0, 0), 0, 1e-12, 'the site’s own ground is where heights are measured from');
  assert.deepEqual(site.point(0, 0), [0, 0, 0]);
  near(Math.hypot(...site.origin), MOON_RADIUS + SITE.ground.value, 0.05, 'the site, from the Moon’s centre');
  near(site.reach, 32_000, 1e-9, 'heights to 32 km from it');
  // at a point of the grid the height is the grid's; between points it has no step and no corner
  const at = (i, j) => file.readInt16LE(2 * ((128 + j) * meta.side + 128 + i)) * meta.quantum;
  near(site.height(750, -1250), at(3, -5), 1e-9, 'a point of the grid');
  for (const [x, y] of [
    [249.999, 400],
    [-3000.001, 1750],
    [5000, 749.9999],
  ]) {
    near(site.height(x, y), site.height(x + 0.002, y + 0.002), 0.01, `no step at ${x}, ${y}`);
    const slope = (x0) => (site.height(x0 + 0.5, y) - site.height(x0 - 0.5, y)) / 1;
    near(slope(x - 1), slope(x + 1), 0.002, `no corner at ${x}, ${y}`);
  }
  // a place on the plane is its direction's east and north parts, times the Moon's radius; up is up
  const d = site.direction(12_000, -5_000);
  near(MOON_RADIUS * (d[0] * meta.east[0] + d[1] * meta.east[1] + d[2] * meta.east[2]), 12_000, 1e-6, 'east');
  near(MOON_RADIUS * (d[0] * meta.north[0] + d[1] * meta.north[1] + d[2] * meta.north[2]), -5_000, 1e-6, 'north');
  const n = site.normal(0, 0);
  assert.ok(
    n[0] * SITE_DIR[0] + n[1] * SITE_DIR[1] + n[2] * SITE_DIR[2] > Math.cos((3 * Math.PI) / 180),
    'the ground at the site is within 3 degrees of level',
  );
  // the plain is level: within 8 km toward the Earth the ground is within 1.2 degrees of level from the site, root mean square
  const [c, s] = [Math.cos(meta.towardEarth), Math.sin(meta.towardEarth)];
  let squares = 0;
  for (let r = 250; r <= 8000; r += 250) squares += Math.atan2(site.height(r * c, r * s), r) ** 2;
  assert.ok(Math.sqrt(squares / 32) < (1.2 * Math.PI) / 180, 'level toward the Earth');
  // how near the ground comes: the camera's own height at the start, never nearer than it is asked about, none known from far
  near(site.clearance(PATH.from), PATH.from, 1, 'the ground is 40 m under the camera at the start');
  for (const over of [40, 300, 2000, 9000, 50_000, 300_000])
    assert.ok(site.clearance(over) <= over * 1.6 && site.clearance(over) > 0.6 * over);
  assert.equal(site.clearance(1e6), null, 'beyond what the bake worked out');
});

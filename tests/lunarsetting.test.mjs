// The Moon as a place (viewer/lunar/): its light as numbers (light.ts), the landing site a SiteDef is (ground.ts
// lunarSiteOf), the flight's crew who went out (lc39.ts `surface`), its LM as it stood (app/surface.ts), and the sky from a site (world/moonsky.ts, the front
// page's, shared): the Sun's height there against where the ephemeris puts the point under it.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { LUNAR_SITES } from '../missions/usa/places/moon/sites.ts';
import { flights } from '../missions/index.ts';
import { DAY_EXPOSURE } from '../src/viewer/daysky.ts';
import { landerPose } from '../src/viewer/lunar/ground.ts';
import { ADAPTS, disc, exposureFor, NIGHT_FACTOR, SUN_RADIUS } from '../src/viewer/lunar/light.ts';
import { DEG } from '../src/world/frames.ts';
import { fromSelenographic } from '../src/world/moon.ts';
import { skyAt } from '../src/world/moonsky.ts';
import { julianDate } from '../src/world/time.ts';

const root = join(import.meta.dirname, '..');
/** A GLB's nodes, by name, each with its extras. */
const nodesOf = (file) => {
  const glb = readFileSync(file);
  return JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8')).nodes;
};
const allNodes = (file) => new Set(nodesOf(file).map((n) => n.name));
/** The nodes of a GLB a walker climbs (`climb` in their extras). */
const climbs = (file) => nodesOf(file).filter((n) => n.extras?.climb);
/** Which site each landing flight stood at. */
const siteOf = {
  'apollo-11': 'tranquility',
  'apollo-12': 'ocean-of-storms',
  'apollo-14': 'fra-mauro',
  'apollo-15': 'hadley',
  'apollo-16': 'descartes',
  'apollo-17': 'taurus-littrow',
};

test('the Sun comes up as its disc does: none below the horizon, half on it, all above, and never a step', () => {
  assert.equal(disc(-2 * SUN_RADIUS), 0);
  assert.ok(Math.abs(disc(0) - 0.5) < 1e-12);
  assert.equal(disc(2 * SUN_RADIUS), 1);
  let last = 0;
  for (let e = -1.5 * SUN_RADIUS; e <= 1.5 * SUN_RADIUS; e += SUN_RADIUS / 500) {
    const d = disc(e);
    assert.ok(d >= last - 1e-15, 'it only grows');
    assert.ok(d - last < 0.0021, `no step: ${d - last} at ${e / DEG} degrees`);
    last = d;
  }
});

test("the exposure follows the light on the ground smoothly, from the night's to under the day's", () => {
  const albedo = 0.15;
  assert.ok(Math.abs(exposureFor(0, albedo) - DAY_EXPOSURE * NIGHT_FACTOR) < 1e-9, 'the night: eight times the day');
  let last = Number.POSITIVE_INFINITY;
  for (let g = 0; g <= 5; g += 0.001) {
    const e = exposureFor(g, albedo);
    assert.ok(e <= last + 1e-12, 'more light, no more exposure');
    if (Number.isFinite(last)) assert.ok(last - e < 0.05, `no step at ${g}`);
    last = e;
  }
  // the square root of the eye's adapting (ADAPTS): a quarter of the light, twice the exposure, where it is not capped
  assert.ok(Math.abs(exposureFor(1, albedo) / exposureFor(4, albedo) - 4 ** ADAPTS) < 1e-12);
});

test('every landing site is a SiteDef on the Moon with the instant its LM landed, read on its mission report, and how it stood', () => {
  assert.equal(LUNAR_SITES.length, 6);
  for (const s of LUNAR_SITES) {
    assert.equal(s.site.body, 'moon', s.id);
    // (UTC seconds: from the report's range zero and elapsed time, both read on the page, added)
    assert.ok(Number.isFinite(s.landed.value) && s.landed.value > Date.UTC(1969, 0, 1) / 1000, `${s.id}: ${s.landed.value}`);
    assert.equal(s.landed.confidence, 'derived', s.id);
    assert.match(s.landed.source, /Mission Report, [MJ]SC-0\d+ .*table \d-I .*p\. \d/);
    for (const k of ['heading', 'pitch', 'roll']) {
      const m = s.rest[k];
      assert.ok(
        Number.isFinite(m.value) && ['documented', 'derived', 'estimated', 'assumed'].includes(m.confidence) && m.source,
        `${s.id} rest.${k}`,
      );
    }
    // the pitch and the roll at rest are what each report gives (Apollo 11's roll it does not); no report gives a heading
    assert.equal(s.rest.pitch.confidence, 'documented', s.id);
    assert.equal(s.rest.heading.confidence, 'estimated', s.id);
    assert.ok(Math.abs(s.rest.heading.value - s.approach.value) < 1e-9, `${s.id}: the heading at rest is taken as the approach`);
  }
});

test("the crew who went out onto the Moon are the landing flights' commanders and LM pilots, and nobody else", () => {
  const out = flights.flatMap((f) => f.models.filter((m) => m.surface).map((m) => `${f.id.split('/').pop()} ${m.id}`));
  const landed = ['apollo-11', 'apollo-12', 'apollo-14', 'apollo-15', 'apollo-16', 'apollo-17'];
  assert.deepEqual(out.sort(), landed.flatMap((f) => [`${f} crew`, `${f} lmp`]).sort());
  for (const f of flights) for (const m of f.models) if (m.surface) assert.ok(m.walker, `${f.id} ${m.id} is walked as`);
});

test('the crew who went out are walked on the Moon in what they wore there, built to the figure contract, at every level', () => {
  for (const f of flights)
    for (const m of f.models.filter((x) => x.surface)) {
      const glb = join(root, 'public', m.surface.url);
      for (const file of [glb, glb.replace(/\.glb$/, '.lod1.glb'), glb.replace(/\.glb$/, '.lod2.glb')]) {
        assert.ok(existsSync(file), `${f.id} ${m.id}: ${file} is missing: run pnpm model`);
        const nodes = allNodes(file);
        // (the eyes are measured off the finest level: flights.test.mjs, as every walker's)
        for (const joint of [
          'Hips',
          'Spine',
          'Head',
          'Foot.L',
          'Foot.R',
          'Torso_PortableLifeSupport',
          'Torso_OxygenPurgeSystem',
          ...(file === glb ? [m.walker.eyes] : []),
        ])
          assert.ok(nodes.has(joint) || nodes.has(joint.replace('.', '')), `${f.id} ${m.id}: no ${joint} in ${file}`);
      }
    }
});

test('each LM that landed has its forward hatch on a hinge, a ladder to climb, and its pads where its stay sets them on the ground', () => {
  const landers = flights.flatMap((f) => f.models.filter((m) => m.lander).map((m) => [f, m]));
  assert.deepEqual(landers.map(([f]) => f.id.split('/').pop()).sort(), [
    'apollo-11',
    'apollo-12',
    'apollo-14',
    'apollo-15',
    'apollo-16',
    'apollo-17',
  ]);
  for (const [f, m] of landers) {
    const glb = join(root, 'public', m.url);
    for (const file of [glb, glb.replace(/\.glb$/, '.lod1.glb'), glb.replace(/\.glb$/, '.lod2.glb')]) {
      const nodes = allNodes(file);
      assert.ok(nodes.has('LM_ForwardHatch'), `${f.id}: no hatch in ${file}`);
      assert.ok(climbs(file).length === 1, `${f.id}: one ladder to climb in ${file}`);
    }
    assert.equal(m.lander.pads.length, 4);
    // boarded and left by the hatch, from the porch, as the commander and the pilot who went out
    assert.deepEqual(
      m.seats.map((s) => [s.from, s.egress?.join(), s.figure]),
      [
        ['LM_ForwardHatch', 'surface', 'crew'],
        ['LM_ForwardHatch', 'surface', 'lmp'],
      ],
    );
    const hatch = m.parts.flatMap((p) => p.actions ?? []).find((a) => a.on === 'LM_ForwardHatch');
    assert.ok(hatch?.do.kind === 'toggle', `${f.id}: the hatch is opened by hand`);
    // stood at its site, its pads come to the ground on the whole, and none more than a grid's step off it (a 2 m square's
    // slope over a pad's reach)
    const site = LUNAR_SITES.find((s) => s.id === siteOf[f.id.split('/').pop()]);
    const rest = { heading: site.rest.heading.value, pitch: site.rest.pitch.value, roll: site.rest.roll.value };
    const flat = landerPose(rest, m.lander.pads, () => 0);
    assert.ok(Math.abs(flat.pads.reduce((a, p) => a + p.y, 0) / 4) < 1e-9, 'on level ground the pads average on it');
    const tipped = Math.max(...flat.pads.map((p) => Math.abs(p.y)));
    const tilt = Math.hypot(rest.pitch, rest.roll) * DEG;
    assert.ok(tipped <= 4.26 * Math.sin(tilt) + 1e-6, `${f.id}: tipped ${tipped.toFixed(3)} m at a pad`);
  }
});

test('the Sun over each site at its landing is low in the east, as every LM came down in the lunar morning', () => {
  for (const s of LUNAR_SITES) {
    const [latitude, longitude] = [s.site.latitude.value, s.site.longitude.value];
    const up = fromSelenographic(longitude, latitude);
    const east = [-Math.sin(longitude * DEG), Math.cos(longitude * DEG), 0];
    const sky = skyAt(julianDate(new Date(s.landed.value * 1000).toISOString()));
    const l = Math.hypot(...sky.sun);
    const toSun = sky.sun.map((v) => v / l);
    const elevation = Math.asin(toSun.reduce((a, v, i) => a + v * up[i], 0)) / DEG;
    // (the angle from the point under the Sun is the Sun's height's complement, the site's height and the Sun's distance aside)
    const sub = fromSelenographic(sky.subSolar.longitude, sky.subSolar.latitude);
    const apart = Math.acos(sub.reduce((a, v, i) => a + v * up[i], 0)) / DEG;
    assert.ok(Math.abs(90 - apart - elevation) < 0.02, `${s.id}: ${elevation} against ${90 - apart}`);
    assert.ok(elevation > 5 && elevation < 20, `${s.id}: the Sun ${elevation.toFixed(1)} degrees up`);
    assert.ok(toSun.reduce((a, v, i) => a + v * east[i], 0) > 0, `${s.id}: in the east`);
  }
});

// The Moon as a place (viewer/lunar/): its light as numbers (light.ts), the landing site a SiteDef is (ground.ts
// lunarSiteOf), the flight's crew who went out (lc39.ts `landed`), and the sky from a site (world/moonsky.ts, the front
// page's, shared): the Sun's height there against where the ephemeris puts the point under it.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LUNAR_SITES } from '../missions/usa/places/moon/sites.ts';
import { flights } from '../missions/index.ts';
import { DAY_EXPOSURE } from '../src/viewer/daysky.ts';
import { ADAPTS, disc, exposureFor, NIGHT_FACTOR, SUN_RADIUS } from '../src/viewer/lunar/light.ts';
import { DEG } from '../src/world/frames.ts';
import { fromSelenographic } from '../src/world/moon.ts';
import { skyAt } from '../src/world/moonsky.ts';
import { julianDate } from '../src/world/time.ts';

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

test('every landing site is a SiteDef on the Moon with the instant its LM landed', () => {
  assert.equal(LUNAR_SITES.length, 6);
  for (const s of LUNAR_SITES) {
    assert.equal(s.site.body, 'moon', s.id);
    assert.ok(Number.isFinite(Date.parse(s.landed.at)), `${s.id}: ${s.landed.at}`);
    assert.match(s.landed.source, /Mission Report/);
  }
});

test("the crew who went out onto the Moon are the landing flights' commanders and LM pilots, and nobody else", () => {
  const out = flights.flatMap((f) => f.models.filter((m) => m.surface).map((m) => `${f.id.split('/').pop()} ${m.id}`));
  const landed = ['apollo-11', 'apollo-12', 'apollo-14', 'apollo-15', 'apollo-16', 'apollo-17'];
  assert.deepEqual(out.sort(), landed.flatMap((f) => [`${f} crew`, `${f} lmp`]).sort());
  for (const f of flights) for (const m of f.models) if (m.surface) assert.ok(m.walker, `${f.id} ${m.id} is walked as`);
});

test('the Sun over each site at its landing is low in the east, as every LM came down in the lunar morning', () => {
  for (const s of LUNAR_SITES) {
    const [latitude, longitude] = [s.site.latitude.value, s.site.longitude.value];
    const up = fromSelenographic(longitude, latitude);
    const east = [-Math.sin(longitude * DEG), Math.cos(longitude * DEG), 0];
    const sky = skyAt(julianDate(s.landed.at));
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

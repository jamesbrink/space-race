// The sky as the viewer draws it (src/viewer/heavens.ts): what is up, what is hidden, and that
// the stars are turned to the place and hour. The positions themselves are tests/world.test.mjs's.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { airmass, DAY_ADAPTED, dayLight, limitingMagnitude, starLimit } from '../src/viewer/daysky.ts';
import { Heavens } from '../src/viewer/heavens.ts';
import { skyFrom } from '../src/world/ephemeris.ts';
import { DEG } from '../src/world/frames.ts';
import { julianDate } from '../src/world/time.ts';

const LC5 = { latitude: 28.439426, longitude: -80.573292, height: -27, bearingX: 295 };
const at = (iso, air = true) => {
  const h = new Heavens(LC5, air, 1);
  h.at(skyFrom(LC5, julianDate(iso)));
  return h;
};
const near = (got, want, tolerance, what) =>
  assert.ok(Math.abs(got - want) <= tolerance, `${what}: got ${got}, want ${want} within ${tolerance}`);

test('air: one thickness overhead, about 38 at the horizon', () => {
  near(airmass(90), 1, 1e-3, 'zenith');
  near(airmass(30), 2, 0.01, '30 degrees');
  near(airmass(0), 38, 1, 'horizon');
});

test('daylight hides the stars in order of faintness', () => {
  let last = Infinity;
  for (let el = -30; el <= 60; el += 1) {
    const limit = limitingMagnitude(el);
    assert.ok(limit <= last, `the higher the Sun, the fewer the stars (at ${el})`);
    last = limit;
  }
  assert.equal(limitingMagnitude(-30), 6.5);
  assert.ok(limitingMagnitude(50) < -1.46, 'Sirius does not show by day');
  assert.ok(limitingMagnitude(50) > -4.4, 'Venus at its brightest just does');
});

test('mid-morning is the look the place was tuned to: warm white sunlight at full strength', () => {
  const day = dayLight(50, null);
  assert.equal(day.light.from, 'sun');
  near(day.light.intensity, 3.9, 1e-9, 'strength');
  day.light.colour.forEach((c, i) => near(c, [1, 0.84, 0.63][i], 1e-9, 'colour'));
  day.zenith.forEach((c, i) => near(c, [0.025, 0.11, 0.42][i], 0.002, 'zenith'));
  day.horizon.forEach((c, i) => near(c, [0.4, 0.58, 0.86][i], 0.002, 'horizon'));
  day.glow.forEach((c) => assert.equal(c, 0, 'no twilight glow at mid-morning'));
  day.cloud.forEach((c) => near(c, 1.02, 0.04, 'white cloud'));
  near(day.exposure, 0.8, 1e-9, 'exposure');
  assert.equal(day.ambient, 1);
});

test('the Sun reddens and weakens as it sinks, and is gone when its disc is', () => {
  let last = Infinity;
  for (const el of [50, 30, 15, 8, 4, 2, 1, 0.3, 0]) {
    const { light } = dayLight(el, null);
    assert.equal(light.from, 'sun');
    assert.ok(light.intensity < last + 1e-9, `weaker at ${el}`);
    last = light.intensity;
    assert.ok(light.colour[0] >= light.colour[1] && light.colour[1] >= light.colour[2], `red over green over blue at ${el}`);
  }
  const low = dayLight(1, null).light;
  assert.ok(low.colour[2] < 0.05 && low.intensity < 1.2 && low.intensity > 0.02, 'a degree up: a dim red light that still casts a shadow');
  assert.equal(dayLight(-0.5, null).light.from, 'none');
  assert.equal(dayLight(-0.5, null).light.intensity, 0);
});

test('twilight: the sky dims in step, a glow stands toward the Sun, and the eye opens', () => {
  let sky = Infinity;
  let exposure = 0;
  for (let el = 20; el >= -20; el -= 1) {
    const d = dayLight(el, null);
    assert.ok(d.ambient <= sky, `no brighter at ${el}`);
    assert.ok(d.exposure >= exposure - 1e-9, `the eye no more closed at ${el}`);
    assert.ok(d.zenith[2] >= d.zenith[0], `the zenith stays blue at ${el}`);
    sky = d.ambient;
    exposure = d.exposure;
  }
  const dusk = dayLight(-3, null);
  assert.ok(dusk.glow[0] > dusk.glow[1] && dusk.glow[1] > dusk.glow[2], 'the glow is orange');
  assert.ok(dusk.glow[0] > dusk.horizon[0], 'and brighter than the horizon it stands on');
  dayLight(-16, null).glow.forEach((c) => assert.equal(c, 0, 'gone by full night'));
  near(dayLight(-20, null).exposure, 6.4, 1e-9, 'night exposure');
});

test('by night the light is the Moon’s, if it is up', () => {
  const full = dayLight(-30, { elevation: 60, lit: 1 });
  assert.equal(full.light.from, 'moon');
  near(full.light.intensity, 3.9 * 0.006, 0.002, 'full moonlight');
  assert.ok(dayLight(-30, { elevation: 60, lit: 0.1 }).light.intensity < full.light.intensity / 5, 'a crescent gives little');
  assert.ok(dayLight(-30, { elevation: 3, lit: 1 }).light.intensity < full.light.intensity / 3, 'a low Moon is dimmed by the air');
  assert.equal(dayLight(-30, null).light.from, 'none');
  assert.equal(dayLight(40, { elevation: 60, lit: 1 }).light.from, 'sun', 'by day the Moon lights nothing');
});

test('the Sun hands over to the Moon through darkness: the one light turns round only when it is out', () => {
  const moon = { elevation: 40, lit: 0.8 };
  let last = dayLight(1, moon).light;
  let swapped = false;
  for (let el = 1; el >= -1; el -= 0.001) {
    const { light } = dayLight(el, moon);
    assert.ok(Math.abs(light.intensity - last.intensity) < 0.01, `no step at ${el.toFixed(3)}`);
    if (light.from !== last.from) {
      swapped = true;
      assert.ok(light.intensity < 1e-3 && last.intensity < 1e-3, `out where it turns, at ${el.toFixed(3)}`);
    }
    last = light;
  }
  assert.ok(swapped && last.from === 'moon', 'and the Moon has it after');
});

test('Freedom 7’s liftoff from the ground: the Sun high in the east, the Moon low and nearly lost', () => {
  const h = at('1961-05-05T14:34:13Z');
  near(h.sunElevation, 50.26, 0.01, 'the Sun’s apparent elevation');
  assert.ok(h.sunDir.x < -0.5, 'behind the hatch side');
  near(h.sunDir.length(), 1, 1e-12, 'a direction');
  assert.equal(h.moonUp, true);
  near(h.moonElevation, 4.78, 0.01, 'the Moon’s apparent elevation, lifted 0.17 degrees by the air');
  near(h.moonLit, 0.736, 0.002, 'lit');
  const light = h.moon.uMoonLight.value;
  assert.ok(light > 0 && light < 0.03, `through eleven thicknesses of air it adds a few per cent to the haze: ${light}`);
  near(h.moon.uMoonSize.value, Math.sin((1941.28 / 7200) * DEG), 1e-6, 'its true size');
  // the Sun as the Moon sees it is the Sun's own direction, to a sixth of a degree
  assert.ok(h.moon.uMoonSun.value.angleTo(h.sunDir) < 0.2 * DEG);
  const [stars, planets] = h.stars.children;
  assert.equal(stars.geometry.getAttribute('position').count, 518);
  assert.equal(planets.geometry.getAttribute('position').count, 7);
});

test('the same instant from above the air: nothing lifted, nothing dimmed, every star out', () => {
  const h = at('1961-05-05T14:34:13Z', false);
  near(h.sunElevation, 50.25, 0.01, 'geometric');
  near(h.moonElevation, 4.6, 0.01, 'geometric');
  assert.equal(h.moon.uMoonLight.value, 0.16);
  assert.equal(h.stars.children[0].material.uniforms.uLimit.value, 6.5);
  h.show(-3.8, 0.5);
  assert.equal(h.stars.children[0].material.uniforms.uLimit.value, -3.8);
  assert.equal(h.stars.children[0].material.uniforms.uGain.value, 0.5);
});

test('a Moon under the horizon is not in the ground’s sky', () => {
  // 5 May 1961, 22:00 EST: the waning Moon does not rise until after midnight
  const h = at('1961-05-06T03:00:00Z');
  assert.ok(h.moonDir.y < 0);
  assert.equal(h.moonUp, false);
  assert.equal(h.moon.uMoonLight.value, 0);
  assert.equal(at('1961-05-06T03:00:00Z', false).moonUp, true, 'from orbit the Earth itself hides it, by depth');
});

test('the stars are turned to the place and hour: Polaris stands due north at the latitude', () => {
  const h = at('1961-05-01T03:00:00Z');
  const stars = h.stars.children[0];
  const position = stars.geometry.getAttribute('position');
  let polaris = -1;
  for (let i = 0; i < position.count; i++) if (position.getZ(i) > 0.9999) polaris = i; // J2000: +Z is the pole
  assert.ok(polaris >= 0);
  const d = stars.geometry.getAttribute('position').clone();
  d.applyMatrix4(stars.matrix);
  const [x, y, z] = [d.getX(polaris), d.getY(polaris), d.getZ(polaris)];
  near(Math.asin(y) / DEG, LC5.latitude, 1.0, 'elevation');
  // north in the pad's frame is (sin 25, 0, cos 25)
  near(Math.atan2(x, z) / DEG, 25, 1.2, 'bearing in the pad’s frame');
});

test('moved to another instant, the same sky object follows: the vectors shaders hold are the same ones', () => {
  const h = at('1961-05-05T14:34:13Z');
  const [sun, moon, planets] = [h.sunDir, h.moonDir, h.stars.children[1]];
  const before = sun.clone();
  h.at(skyFrom(LC5, julianDate('1961-05-05T15:34:13Z')));
  assert.equal(h.sunDir, sun);
  assert.equal(h.moonDir, moon);
  assert.equal(h.moon.uMoon.value, moon);
  assert.equal(h.stars.children[1], planets, 'the planets are moved, not rebuilt');
  assert.equal(h.stars.children.length, 2);
  near(sun.angleTo(before) / DEG, 14.4, 0.2, 'an hour later the Sun has gone 14.4 degrees (15 times the cosine of its declination)');
  near(h.sunElevation, 63.0, 0.2, 'and climbed');
});

test('the stars come out as the air above the eye thins, a magnitude for each 2.512 times less of it, and no further than the eye allows', () => {
  const noon = limitingMagnitude(50);
  assert.equal(starLimit(noon, 1), noon, 'at the sea: the ground’s own limit');
  assert.ok(Math.abs(starLimit(noon, 1 / 2.512) - (noon + 1)) < 1e-3);
  let last = noon;
  for (let h = 0; h <= 200_000; h += 500) {
    const limit = starLimit(noon, Math.exp(-h / 8000));
    assert.ok(limit >= last && limit - last < 0.2, `no step at ${h} m`);
    last = limit;
  }
  assert.equal(last, DAY_ADAPTED, 'by day above the air: the sunlit eye’s limit');
  assert.equal(starLimit(limitingMagnitude(-30), 0), 6.5, 'by night: every star the eye sees');
  assert.equal(starLimit(limitingMagnitude(-30), 1), 6.5);
});

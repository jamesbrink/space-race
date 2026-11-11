// The sky as the viewer draws it (src/viewer/heavens.ts): what is up, what is hidden, and that
// the stars are turned to the place and hour. The positions themselves are tests/world.test.mjs's.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { airmass, daylight, heavens, limitingMagnitude } from '../src/viewer/heavens.ts';
import { skyFrom } from '../src/world/ephemeris.ts';
import { DEG } from '../src/world/frames.ts';
import { julianDate } from '../src/world/time.ts';

const LC5 = { latitude: 28.439426, longitude: -80.573292, height: -27, bearingX: 295 };
const at = (iso, air = true) => heavens(LC5, skyFrom(LC5, julianDate(iso)), air, 1, 1);
const near = (got, want, tolerance, what) =>
  assert.ok(Math.abs(got - want) <= tolerance, `${what}: got ${got}, want ${want} within ${tolerance}`);

test('air: one thickness overhead, about 38 at the horizon', () => {
  near(airmass(90 * DEG), 1, 1e-3, 'zenith');
  near(airmass(30 * DEG), 2, 0.01, '30 degrees');
  near(airmass(0), 38, 1, 'horizon');
});

test('daylight hides the stars in order of faintness', () => {
  assert.equal(daylight(50), 1);
  assert.equal(daylight(-18), 0);
  assert.ok(daylight(-3) > 0 && daylight(-3) < 1, 'twilight is in between');
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

test('Freedom 7’s liftoff from the ground: the Sun high in the east, the Moon low and nearly lost', () => {
  const h = at('1961-05-05T14:34:13Z');
  near(h.sunElevation, 50.26, 0.01, 'the Sun’s apparent elevation');
  assert.ok(h.sunDir.x < -0.5, 'behind the hatch side');
  near(h.sunDir.length(), 1, 1e-12, 'a direction');
  assert.equal(h.moonUp, true);
  near(Math.asin(h.moonDir.y) / DEG, 4.78, 0.01, 'the Moon’s apparent elevation, lifted 0.17 degrees by the air');
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
  near(Math.asin(h.moonDir.y) / DEG, 4.6, 0.01, 'geometric');
  assert.equal(h.moon.uMoonLight.value, 0.16);
  assert.equal(h.stars.children[0].material.uniforms.uLimit.value, 6.5);
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

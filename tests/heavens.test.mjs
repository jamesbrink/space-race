// The sky as the viewer draws it (src/viewer/heavens.ts): what is up, what is hidden, and that
// the stars are turned to the place and hour. The positions themselves are tests/world.test.mjs's.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  adaptedTo,
  airmass,
  dayLight,
  EYE_LEAST,
  LAND_REFLECTANCE,
  limitingMagnitude,
  moonLux,
  moonPhase,
  NIGHT_FLOOR,
  NIGHT_LUX,
  opening,
  starLimit,
  sunLux,
} from '../src/viewer/daysky.ts';
import { Heavens } from '../src/viewer/heavens.ts';
import { skyFrom } from '../src/world/ephemeris.ts';
import { blackBody, starColour, starTemperature } from '../src/world/stars.ts';
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
  // (on the scene's scale, lifted with the rest of the night: what it is beside the sky is the next test's)
  assert.ok(full.light.intensity > 0.05 && full.light.intensity < 0.3, `full moonlight: ${full.light.intensity}`);
  assert.ok(dayLight(-30, { elevation: 60, lit: 0.1 }).lux < full.lux / 50, 'a crescent gives little');
  assert.ok(dayLight(-30, { elevation: 3, lit: 1 }).lux < full.lux / 3, 'a low Moon is dimmed by the air');
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
  const sunlit = 5.2; // (an eye with a sunlit vehicle in view: eye.ts limitUnder)
  assert.equal(starLimit(noon, 1, sunlit), noon, 'at the sea: the ground’s own limit');
  assert.ok(Math.abs(starLimit(noon, 1 / 2.512, sunlit) - (noon + 1)) < 1e-3);
  let last = noon;
  for (let h = 0; h <= 200_000; h += 500) {
    const limit = starLimit(noon, Math.exp(-h / 8000), sunlit);
    assert.ok(limit >= last && limit - last < 0.2, `no step at ${h} m`);
    last = limit;
  }
  assert.equal(last, sunlit, 'by day above the air: the eye’s own limit for what is lit in its view');
  assert.equal(starLimit(limitingMagnitude(-30), 0, 6.5), 6.5, 'by night with nothing lit in view: every star the eye sees');
  assert.equal(starLimit(limitingMagnitude(-30), 1, 6.5), 6.5);
  assert.equal(starLimit(limitingMagnitude(-30), 0, 5.6), 5.6, 'by night above the air with the sunlit Earth in view: what it leaves');
  assert.equal(starLimit(limitingMagnitude(-30), 1, 4), 6.5, 'and from the ground a sunlit Earth no one there sees dims nothing');
  for (let h = 0; h <= 200_000; h += 500) {
    const a = starLimit(limitingMagnitude(-30), Math.exp(-h / 8000), 5.6);
    assert.ok(a <= 6.5 && a >= 5.6, `by night, between the two at ${h} m`);
  }
});

test('above the air nothing dims a low star, and the horizon it sets behind has dipped', () => {
  const h = new Heavens(LC5, true, 1);
  const [stars] = h.stars.children;
  assert.deepEqual(stars.material.uniforms.uAir.value.toArray(), [1, 0], 'on the ground: all the air, a level horizon');
  h.show(6.5, 1, 0, 150_000);
  const [air, dip] = stars.material.uniforms.uAir.value.toArray();
  assert.equal(air, 0);
  assert.ok(Math.abs(Math.asin(-dip) / DEG - 12.3) < 0.1, 'from 150 km the horizon is 12.3 degrees under the level');
  assert.deepEqual(h.band.material.uniforms.uAir.value.toArray(), [air, dip], 'and the Milky Way goes by the same');
});

test('far out, what the stars are hidden behind is the Earth’s own disc round the eye’s plumb line, not the site’s horizon', () => {
  const h = new Heavens(LC5, true, 1);
  const [stars] = h.stars.children;
  const u = stars.material.uniforms;
  assert.equal(u.uUp.value, h.up, 'the stars’ plumb line is the sky’s');
  assert.equal(h.band.material.uniforms.uUp.value, h.up, 'and the Milky Way’s');
  // 100,000 km out over the night side, the plumb line far from the site's: the Earth is 3.4 degrees in radius
  h.up.set(0.6, -0.8, 0);
  h.horizon(100_000_000);
  const dip = u.uAir.value.y;
  const radius = Math.acos(-dip) / DEG;
  assert.ok(Math.abs(radius - Math.asin(6371 / 106_371) / DEG) < 0.05, `the hidden cap is the Earth’s disc: ${radius.toFixed(2)} degrees`);
  // a star under the site's horizon (y < 0) but well off the Earth is in the sky; one beside the nadir is hidden
  const shown = (d) => d.x * h.up.x + d.y * h.up.y + d.z * h.up.z > dip;
  assert.ok(shown({ x: 0, y: -1, z: 0 }), 'straight under the site, far from the Earth as seen from out there: shown');
  assert.ok(!shown({ x: -0.6, y: 0.8, z: 0 }), 'toward the Earth’s middle: hidden');
  h.horizon(-5);
  assert.equal(u.uAir.value.y + 0, 0, 'under the sea is the sea’s level');
});

test('the stars’ shader counts each star from the faintest the eye sees, and the cel look is the same stars', () => {
  const h = new Heavens(LC5, false, 2);
  const [stars] = h.stars.children;
  const source = stars.material.vertexShader;
  assert.match(source, /uLimit - mag/, 'brightness from the eye’s limit');
  h.cel(true);
  assert.equal(stars.material.uniforms.uCel.value, 1);
  assert.equal(h.band.material.uniforms.uCel.value, 1);
  h.cel(false);
  assert.equal(stars.material.uniforms.uCel.value, 0);
  h.show(4.5, 1);
  assert.equal(h.band.parent.visible, false, 'with stars of the fifth magnitude gone, the Milky Way is not drawn at all');
  h.show(6.5, 1);
  assert.equal(h.band.parent.visible, true);
});

// ---- the night as there is light (daysky.ts): the published figures, the eye's limits, and nothing that steps

test('the Sun’s light on level ground is USNO Circular 171’s', () => {
  // the circular's own figures, from its subroutine ATMOS: 124,000 lux overhead, 3 at -6 degrees, 0.0044 at -12
  near(sunLux(90), 123_800, 100, 'overhead');
  near(sunLux(-6), 3.0, 0.02, 'end of civil twilight');
  near(sunLux(-12), 0.0044, 0.0001, 'end of nautical twilight');
  assert.ok(sunLux(-18) < NIGHT_FLOOR / 100, 'by the end of astronomical twilight, under a hundredth of the night sky');
  assert.equal(sunLux(-20) >= 0, true);
  // and between: it falls all the way, about tenfold every two or three degrees under the horizon
  let last = Infinity;
  for (let e = 30; e >= -25; e -= 0.05) {
    const lux = sunLux(e);
    assert.ok(lux <= last, `no brighter at ${e.toFixed(2)}`);
    last = lux;
  }
});

test('the night sky’s own light is the published 0.8 millilux, airglow the most of it', () => {
  near(NIGHT_FLOOR, 8e-4, 1e-12, 'all of it');
  assert.ok(NIGHT_LUX.airglow > NIGHT_LUX.zodiacal && NIGHT_LUX.zodiacal > NIGHT_LUX.galaxy && NIGHT_LUX.galaxy > NIGHT_LUX.stars);
  const night = dayLight(-30, null);
  near(night.lux, 8e-4, 1e-9, 'on the ground with no Moon and no twilight');
  // the eye on it is at about its own limit: the rods' threshold stands still under 10^-3.94 cd/m²
  near(Math.log10(night.adapted), -3.94, 0.1, 'adapted to the moonless night');
});

test('the Moon: 0.3 lux full and overhead, a quarter an eleventh of that, its light in proportion to the night’s', () => {
  near(moonLux(90, 1), 0.29, 0.01, 'full, overhead, through the air');
  near(moonPhase(0.5), 0.091, 0.002, 'a quarter Moon (Krisciunas and Schaefer)');
  near(moonPhase(1), 1, 1e-12, 'full');
  assert.ok(moonPhase(0.1) < 0.01, 'a thin crescent gives almost nothing');
  assert.equal(moonLux(-2, 1), 0, 'set');
  const moonless = dayLight(-30, null);
  const quarter = dayLight(-30, { elevation: 25, lit: 0.5 });
  const full = dayLight(-30, { elevation: 60, lit: 1 });
  near(quarter.lux / moonless.lux, (moonLux(25, 0.5) + NIGHT_FLOOR) / NIGHT_FLOOR, 1e-5, 'what there is, as it is');
  // drawn: the moonlit ground plainly brighter than the moonless, the full Moon's brighter still, by less than it is
  const shown = (d) => d.exposure * d.lifted * d.lux;
  assert.ok(shown(quarter) > 1.5 * shown(moonless) && shown(full) > 1.5 * shown(quarter), 'each brighter on the screen');
  assert.ok(shown(full) / shown(moonless) < full.lux / moonless.lux, 'the eye makes up most of it');
});

test('the land and the sky by night share one exposure: their levels are the light there is, in its proportions', () => {
  // with no Moon and no twilight the scene's sky light (ambient) is the night sky's lux over sunset's on the day's
  // scale, lifted: a darker night (none is darker than the floor) draws both alike
  for (const e of [-20, -25, -40]) {
    const d = dayLight(e, null);
    near(d.ambient / (d.lifted * d.lux), dayLight(-0.0001, null).ambient / dayLight(-0.0001, null).lux, 1e-6, `at ${e}`);
  }
  // the Moon's beam on the ground and the sky's light on it stand as the circular has them (a beam of strength b
  // puts 0.8 b sin h / sin 50 on the day's scale, a sky of level L 0.2 L)
  const m = dayLight(-30, { elevation: 40, lit: 1 });
  const beam = (0.8 * (m.light.intensity / 3.9) * Math.sin(40 * DEG)) / Math.sin(50 * DEG);
  near(
    (beam + 0.2 * m.ambient) / (m.lifted * m.lux),
    (dayLight(-0.0001, null).ambient * 0.2) / dayLight(-0.0001, null).lux,
    1e-6,
    'the Moon’s beam and the sky alike',
  );
});

test('the eye opens as far as an eye goes and no further; the tone mapping takes eightfold and the light’s own levels the rest', () => {
  assert.equal(opening(EYE_LEAST / 10, 100), opening(EYE_LEAST, 100), 'under the rods’ limit it opens no more');
  assert.ok(opening(EYE_LEAST * 10, 100) < opening(EYE_LEAST, 100));
  for (let e = 0; e >= -40; e -= 0.5) {
    const d = dayLight(e, null);
    assert.ok(d.exposure <= 6.4 + 1e-9, `exposure under the cap at ${e}`);
    assert.ok(d.lifted >= 1, `nothing pushed down at ${e}`);
  }
  near(adaptedTo(1, 1), Math.sqrt(LAND_REFLECTANCE) / Math.PI, 1e-12, 'half sky, half land');
  // the deep night's drawn ground against sunset's: dimmer by the eye's law, not by the million it is (the tone mapping's
  // toe takes it down further on the screen)
  const sunset = dayLight(-0.0001, null);
  const night = dayLight(-30, null);
  const ratio = (night.exposure * night.lifted * night.lux) / (sunset.exposure * sunset.lifted * sunset.lux);
  assert.ok(ratio > 0.1 && ratio < 0.8, `the moonless land is drawn at ${ratio.toFixed(3)} of sunset’s`);
});

test('light never steps: every figure of the day’s light runs smoothly from noon to the depth of night and back, Moon or none', () => {
  const figures = (d) => [
    d.light.intensity,
    d.exposure,
    d.exposure * d.lifted,
    d.ambient,
    ...d.zenith,
    ...d.horizon,
    ...d.glow,
    ...d.cloud,
    ...d.haze,
  ];
  for (const moon of [null, { elevation: 25, lit: 0.5 }]) {
    const sweep = [];
    for (let e = 30; e >= -30; e -= 0.01) sweep.push([e, figures(dayLight(e, moon))]);
    const most = sweep[0][1].map((_, i) => Math.max(...sweep.map(([, f]) => Math.abs(f[i]))));
    // A step: a change from one hundredth of a degree to the next far larger than the changes either side of it (a
    // smooth figure changes by about as much from one to the next), and more than a millionth of the most it comes to.
    // And nothing changes by more than 5 % of itself (or of a fifth of its most) in a hundredth of a degree.
    for (let k = 2; k < sweep.length - 1; k++) {
      const [e, now] = sweep[k];
      now.forEach((v, i) => {
        const d = (j) => Math.abs(sweep[j][1][i] - sweep[j - 1][1][i]);
        const here = d(k);
        const where = `figure ${i} at ${e.toFixed(2)} degrees${moon ? ' under the Moon' : ''}`;
        assert.ok(
          here <= 4 * Math.max(d(k - 1), d(k + 1)) + 1e-6 * most[i],
          `${where}: a step of ${here} beside ${d(k - 1)} and ${d(k + 1)}`,
        );
        assert.ok(here <= 0.05 * Math.max(Math.abs(v), most[i] / 5), `${where}: changes by ${here} of ${v}`);
      });
    }
  }
});

test('above the horizon the day is the tuned day, to the bit: nothing seen at liftoff has moved', () => {
  // the four flights with a launch site lift off with the Sun 20 to 51 degrees up
  for (const [e, exposure, ambient] of [
    [50, 0.8, 1],
    [20.6, 0.9649, 1],
  ]) {
    const d = dayLight(e, null);
    near(d.exposure, exposure, 1e-4, `exposure at ${e}`);
    assert.equal(d.ambient, ambient);
    assert.equal(d.lifted, 1);
  }
});

test('at the four liftoffs from a launch site the day is the one recorded before the night was drawn, every figure to the bit', async () => {
  const { readFileSync } = await import('node:fs');
  const { flights } = await import('../missions/index.ts');
  const { siteFrame } = await import('../src/world/frames.ts');
  const recorded = JSON.parse(readFileSync(new URL('./fixtures/day-at-liftoff.json', import.meta.url), 'utf8')).flights;
  for (const [id, was] of Object.entries(recorded)) {
    const flight = flights.find((f) => f.id === id);
    const site = siteFrame(flight.site);
    const h = new Heavens(site, true, 1);
    h.at(skyFrom(site, julianDate(flight.launch)));
    assert.equal(h.sunElevation, was.sunElevation, `${id}: the Sun where it was`);
    const moon = h.moonUp ? { elevation: h.moonElevation, lit: h.moonLit } : null;
    assert.deepEqual(moon, was.moon, `${id}: the Moon where it was`);
    const d = dayLight(h.sunElevation, moon);
    const now = {
      light: d.light,
      sun: d.sun,
      zenith: d.zenith,
      horizon: d.horizon,
      glow: d.glow,
      cloud: d.cloud,
      ambient: d.ambient,
      exposure: d.exposure,
      adaptation: d.adaptation,
      haze: d.haze,
      limitingMagnitude: d.limitingMagnitude,
    };
    assert.deepStrictEqual(JSON.parse(JSON.stringify(now)), was.light, `${id}: the day's light`);
  }
});

test('a star’s colour is its black body’s: the Sun cream, Vega a little blue of white, Betelgeuse orange', () => {
  // Ballesteros: the Sun's B-V of 0.65 is about 5,800 K; Vega's -0.03 about 9,600 K
  near(starTemperature(0.65), 5800, 150, 'the Sun');
  near(starTemperature(-0.03), 9600, 1000, 'Vega (a black body: the formula is some 10 % high for a hot star)');
  // D65 is the screen's white, and a black body of 6,504 K is near it (D65 lies 0.003 off the locus, toward green)
  const white = blackBody(6504);
  for (const c of white) near(c / white[1], 1, 0.08, 'a black body at D65’s temperature is all but white');
  const [r, g, b] = starColour(0.65);
  assert.ok(r > g && g > b, 'the Sun is warmer than white');
  const vega = starColour(-0.03);
  assert.ok(vega[2] > vega[0], 'Vega is bluer than white');
  const betelgeuse = starColour(1.85);
  assert.ok(betelgeuse[0] > 2 * betelgeuse[2], 'Betelgeuse is orange');
  // the locus at 2,000 and 10,000 K: red-orange, and blue-white
  const [r2, , b2] = blackBody(2000);
  assert.ok(r2 > 5 * b2);
  const [r10, , b10] = blackBody(10_000);
  assert.ok(b10 > r10);
});

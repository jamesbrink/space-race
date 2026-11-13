// src/world against published values: Meeus's worked examples for the series it is built from,
// and JPL Horizons (ssd.jpl.nasa.gov/horizons, DE441, queried November 2026) for what the whole
// chain gives from a place on the ground: airless apparent azimuth and elevation, observer range.
import assert from 'node:assert/strict';
import { globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { AU, BODIES, EARTH, MOON, PLANETS, SUN, WGS84_B } from '../src/world/bodies.ts';
import { moonPhase, moonPosition, planetMagnitude, refraction, skyFrom, sunPosition } from '../src/world/ephemeris.ts';
import {
  angleBetween,
  DEG,
  ecefToGeodetic,
  ecefToInertial,
  ecefToInertialVelocity,
  ecefToSite,
  enuToSite,
  equatorial,
  fromEquatorial,
  fromHorizontal,
  geodeticToEcef,
  horizontal,
  inertialToEcef,
  inertialToEcefVelocity,
  inertialToJ2000,
  j2000ToInertial,
  j2000ToSite,
  length,
  rotate,
  siteFrame,
  siteToEcef,
  siteToEnu,
} from '../src/world/frames.ts';
import { STAR_STRIDE, STARS, starDirection, yearsFrom2000 } from '../src/world/stars.ts';
import {
  deltaT,
  greenwichMeanSiderealTime,
  greenwichSiderealTime,
  isoDate,
  julianDate,
  nutation,
  terrestrialTime,
} from '../src/world/time.ts';

const near = (got, want, tolerance, what) =>
  assert.ok(Math.abs(got - want) <= tolerance, `${what}: got ${got}, want ${want} within ${tolerance}`);
/** Degrees between two (azimuth, elevation) pairs given in degrees. */
const apart = (seen, az, el) => angleBetween(fromHorizontal(seen.azimuth, seen.elevation), fromHorizontal(az * DEG, el * DEG)) / DEG;
const hours = (h, m, s) => ((h + m / 60 + s / 3600) * 15 * DEG) % (2 * Math.PI);

/** Launch Complex 5's launcher (OpenStreetMap relation 16884747), +X on 295 degrees true. */
const LC5 = { latitude: 28.439426, longitude: -80.573292, height: 3, bearingX: 295 };
const LIFTOFF = julianDate('1961-05-05T14:34:13Z');

test('a Julian date from an ISO instant, and back', () => {
  assert.equal(julianDate('2000-01-01T12:00:00Z'), 2451545.0);
  assert.equal(julianDate('1957-10-04T19:26:24Z'), 2436116.31); // Meeus example 7.a: Sputnik 1
  near(LIFTOFF, 2437425.107095, 5e-7, 'Freedom 7 liftoff');
  assert.equal(julianDate('1961-05-05T09:34:13-05:00'), LIFTOFF, 'Eastern Standard Time');
  assert.equal(julianDate('1961-05-05'), 2437424.5, 'a bare date is midnight UTC');
  assert.equal(isoDate(LIFTOFF), '1961-05-05T14:34:13.000Z');
  assert.throws(() => julianDate('liftoff'));
});

test('delta-T against the measured values (Astronomical Almanac, table K9)', () => {
  near(deltaT(1961.0), 33.59, 0.3, '1961.0');
  near(deltaT(1961.34), 33.7, 0.3, 'May 1961');
  near(deltaT(1969.54), 39.9, 0.5, 'July 1969');
  near(deltaT(2000.0), 63.83, 0.3, '2000.0');
  near(deltaT(2020.0), 69.36, 2.5, '2020.0: the fit predates the Earth speeding up');
  near((terrestrialTime(LIFTOFF) - LIFTOFF) * 86400, 33.7, 0.3, 'TT - UT at liftoff');
});

test('sidereal time: Meeus examples 12.a and 12.b, and Horizons at the pad', () => {
  const midnight = julianDate('1987-04-10T00:00:00Z');
  near(greenwichMeanSiderealTime(midnight), hours(13, 10, 46.3668), hours(0, 0, 0.0001), 'mean, 10 April 1987 0h');
  near(greenwichMeanSiderealTime(julianDate('1987-04-10T19:21:00Z')), hours(8, 34, 57.0896), hours(0, 0, 0.0001), 'mean, 19:21');
  // apparent: 13h10m46.1351s. The four-term nutation is good to half an arcsecond, 0.03 s of time
  near(greenwichSiderealTime(midnight), hours(13, 10, 46.1351), hours(0, 0, 0.03), 'apparent');
  // Horizons, local apparent sidereal time at LC-5 at liftoff: 0.0802662402 h
  const local = (greenwichSiderealTime(LIFTOFF) / DEG + LC5.longitude + 360) % 360;
  near(local / 15, 0.0802662402, 0.05 / 3600, 'local apparent sidereal time at the pad');
});

test('nutation and obliquity: Meeus example 22.a', () => {
  const n = nutation(2446895.5); // 10 April 1987, 0h TD
  const arcsec = DEG / 3600;
  near(n.longitude / arcsec, -3.788, 0.5, 'in longitude');
  near(n.obliquity / arcsec, 9.443, 0.1, 'in obliquity');
  near(n.meanObliquity / DEG, 23 + 26 / 60 + 27.407 / 3600, 1e-6, 'mean obliquity');
});

test('geodetic to Earth-fixed and back', () => {
  assert.deepEqual(geodeticToEcef({ latitude: 0, longitude: 0, height: 0 }), [6378137, 0, 0]);
  near(geodeticToEcef({ latitude: 90, longitude: 0, height: 0 })[2], 6356752.314245, 1e-6, 'the polar radius');
  near(WGS84_B, 6356752.314245, 1e-6, 'WGS 84 b');
  // Horizons gives the pad's cylindrical coordinates for the same geodetic input: 5612.69531 km from the axis, 3019.41684 km north
  const pad = geodeticToEcef({ ...LC5, height: 3 });
  near(Math.hypot(pad[0], pad[1]), 5612695.31, 0.01, 'LC-5 distance from the axis');
  near(pad[2], 3019416.84, 0.01, 'LC-5 distance north of the equator');
  for (const g of [
    LC5,
    { latitude: 45.92, longitude: 63.342, height: 100 }, // Baikonur
    { latitude: -89.9999, longitude: 12, height: 2835 },
    { latitude: 90, longitude: 0, height: -100 },
    { latitude: 0, longitude: 179.9999, height: 187_400 }, // Freedom 7's apogee height
    { latitude: -33.3, longitude: -70.6, height: 384_400_000 }, // the Moon's distance
    { latitude: 61.5, longitude: -149.9, height: -6_000_000 }, // most of the way to the centre
  ]) {
    const back = ecefToGeodetic(geodeticToEcef(g));
    near(back.latitude, g.latitude, 1e-11, `latitude of ${JSON.stringify(g)}`);
    if (Math.abs(g.latitude) < 90) near(back.longitude, g.longitude, 1e-11, 'longitude');
    near(back.height, g.height, 1e-6, 'height');
  }
});

test('the site frame: +X on the stated bearing, +Y up, +Z a quarter turn clockwise from +X', () => {
  const close = (got, want, what, tolerance = 1e-12) => got.forEach((v, i) => near(v, want[i], tolerance, what));
  // on the compass (bearingX 90: +X east) the viewer's -Z is north, as cape.ts lays its scenery out
  close(enuToSite(90, [0, 1, 0]), [0, 0, -1], 'north on the compass frame');
  // LC-5: +X is 295 degrees true, so +Z bears 025 and the rails run along Z (site.py's docstring)
  close(siteToEnu(295, [1, 0, 0]), [Math.sin(295 * DEG), Math.cos(295 * DEG), 0], '+X');
  close(siteToEnu(295, [0, 0, 1]), [Math.sin(25 * DEG), Math.cos(25 * DEG), 0], '+Z');
  close(siteToEnu(295, [0, 1, 0]), [0, 0, 1], '+Y');
  // true north in the pad's Blender frame is (sin 25, -cos 25, 0); Blender (x, y, z) is the viewer's (x, z, -y)
  close(enuToSite(295, [0, 1, 0]), [Math.sin(25 * DEG), 0, Math.cos(25 * DEG)], 'north in the pad frame');
  close(enuToSite(295, siteToEnu(295, [3, -4, 5])), [3, -4, 5], 'there and back');

  // a point 520 ft along the rails toward pad 6 (bearing 025): the same place by either route
  const p = [0, 0, 158.5];
  const ecef = siteToEcef(LC5, p);
  close(ecefToSite(LC5, ecef), p, 'site to Earth-fixed and back', 1e-8); // a double holds a nanometre at the Earth's radius
  const there = ecefToGeodetic(ecef);
  near((there.latitude - LC5.latitude) * 110_826.5, 158.5 * Math.cos(25 * DEG), 0.01, 'metres north');
  near((there.longitude - LC5.longitude) * 97_960, 158.5 * Math.sin(25 * DEG), 0.05, 'metres east');
  // flat scenery leaves the curved Earth: 10 km out, the tangent plane is 7.8 m above the ellipsoid
  near(ecefToGeodetic(siteToEcef(LC5, [10_000, 0, 0])).height - LC5.height, 7.84, 0.05, 'the drop of the Earth in 10 km');
});

test('Earth-fixed to inertial: the turn is the sidereal time, and the ground has a speed', () => {
  const gast = greenwichSiderealTime(LIFTOFF);
  const pad = geodeticToEcef(LC5);
  const inertial = ecefToInertial(pad, gast);
  near(length(inertial), length(pad), 1e-6, 'a rotation keeps length');
  near(inertial[2], pad[2], 0, 'about the pole');
  near(equatorial(inertial).ra, (gast + LC5.longitude * DEG + 2 * Math.PI) % (2 * Math.PI), 1e-12, 'the pad is at its local sidereal time');
  inertialToEcef(inertial, gast).forEach((v, i) => near(v, pad[i], 1e-6, 'and back'));
  // standing still on the pad is moving east at 409 m/s
  const v = ecefToInertialVelocity(pad, [0, 0, 0], gast);
  near(length(v), 409.3, 0.1, 'the pad’s inertial speed');
  inertialToEcefVelocity(inertial, v, gast).forEach((c) => near(c, 0, 1e-9, 'which is no speed over the ground'));
});

test('precession: Meeus example 21.b, Theta Persei from J2000 to 2028', () => {
  // mean place at J2000 with proper motion applied: 41.054063, 49.227750; at 2028 November 13.19 TD: 41.547214, 49.348483
  const jd = 2462088.69;
  const mean = j2000ToInertial(fromEquatorial(41.054063 * DEG, 49.22775 * DEG), jd);
  const { ra, dec } = equatorial(mean);
  // the result here also carries nutation (under 0.006 degrees), which the example leaves out
  near(ra / DEG, 41.547214, 0.008, 'right ascension');
  near(dec / DEG, 49.348483, 0.004, 'declination');
  const back = equatorial(inertialToJ2000(mean, jd));
  near(back.ra / DEG, 41.054063, 1e-10, 'and back');
  near(back.dec / DEG, 49.22775, 1e-10, 'and back');
});

test('the Sun: Meeus example 25.a against his high-precision result (25.b)', () => {
  const sun = sunPosition(2448908.5); // 13 October 1992, 0h TD
  const { ra, dec } = equatorial(sun);
  near(ra / DEG, 198.378121, 0.005, 'right ascension 13h13m30.749s');
  near(dec / DEG, -7.783817, 0.005, 'declination -7d47m01.74s');
  near(length(sun) / AU, 0.99760775, 0.0001, 'distance, au');
});

test('the Moon: Meeus example 47.a', () => {
  const moon = moonPosition(2448724.5); // 12 April 1992, 0h TD
  const { ra, dec } = equatorial(moon);
  near(ra / DEG, 134.68847, 0.003, 'right ascension');
  near(dec / DEG, 13.768368, 0.003, 'declination');
  near(length(moon) / 1000, 368409.7, 30, 'distance, km');
});

test('the Moon’s phase: Meeus example 48.a', () => {
  const phase = moonPhase(sunPosition(2448724.5), moonPosition(2448724.5), [0, 0, 1], [0, 0, 1]);
  near(phase.phaseAngle / DEG, 69.0756, 0.01, 'phase angle');
  near(phase.illuminated, 0.6786, 0.0002, 'illuminated fraction');
  near(phase.brightLimb.fromNorth / DEG, 285.0, 0.1, 'position angle of the bright limb');
});

// Horizons: [place, instant, Sun azimuth, elevation, range (au), Moon azimuth, elevation, range (au), Moon lit (%), waxing]
const HORIZONS = [
  [
    'LC-5 at Freedom 7’s liftoff',
    LC5,
    '1961-05-05T14:34:13Z',
    98.75663,
    50.249359,
    1.0087826173,
    245.226747,
    4.604129,
    0.00246798719629,
    73.57741,
    false,
  ],
  [
    'Baikonur at Vostok 1’s liftoff',
    { latitude: 45.92, longitude: 63.342, height: 100 },
    '1961-04-12T06:07:00Z',
    142.073403,
    46.903058,
    1.00259982745,
    193.282687,
    35.052322,
    0.00243625120246,
    11.5588,
    false,
  ],
  [
    'LC-39A at Apollo 11’s liftoff',
    { latitude: 28.608, longitude: -80.604, height: 10 },
    '1969-07-16T13:32:00Z',
    83.541069,
    36.459251,
    1.01637121122,
    76.37127,
    14.748514,
    0.00268896836224,
    3.87227,
    true,
  ],
  [
    '0 N 0 E at J2000',
    { latitude: 0, longitude: 0, height: 0 },
    '2000-01-01T12:00:00Z',
    178.072194,
    66.952802,
    0.98328839414,
    257.206634,
    30.568243,
    0.00266805599679,
    23.51965,
    false,
  ],
  [
    'Greenwich on the day of the 2024 eclipse',
    { latitude: 51.4769, longitude: 0, height: 46 },
    '2024-04-08T18:00:00Z',
    274.424812,
    6.180313,
    1.00149900181,
    274.816783,
    5.154866,
    0.00240079733172,
    0.00912,
    false,
  ],
];

for (const [name, place, iso, sunAz, sunEl, sunAu, moonAz, moonEl, moonAu, lit, waxing] of HORIZONS) {
  test(`the Sun and the Moon from ${name}, against JPL Horizons`, () => {
    const sky = skyFrom({ bearingX: 0, ...place }, julianDate(iso));
    near(apart(sky.sun, sunAz, sunEl), 0, 0.01, 'the Sun’s direction, degrees (the brief: 0.02)');
    near(sky.sun.distance / AU, sunAu, 6e-5, 'the Sun’s distance, au');
    near(apart(sky.moon, moonAz, moonEl), 0, 0.02, 'the Moon’s direction, degrees (the brief: 0.3)');
    near(sky.moon.distance / 1000, (moonAu * AU) / 1000, 60, 'the Moon’s distance, km');
    near(sky.moon.illuminated * 100, lit, 0.02, 'how much of the Moon is lit, per cent');
    assert.equal(sky.moon.waxing, waxing, 'waxing');
  });
}

test('the sky over Launch Complex 5 at Freedom 7’s liftoff', () => {
  const sky = skyFrom(LC5, LIFTOFF);
  // what the record states (flight.ts, lc-5.md): the Sun on 098.8 at 50.2, the Moon on 245.2 at 4.6
  near(sky.sun.azimuth / DEG, 98.76, 0.01, 'Sun azimuth');
  near(sky.sun.elevation / DEG, 50.25, 0.01, 'Sun elevation');
  near(sky.moon.azimuth / DEG, 245.23, 0.01, 'Moon azimuth');
  near(sky.moon.elevation / DEG, 4.6, 0.01, 'Moon elevation');
  near((sky.moon.elevation + refraction(sky.moon.elevation)) / DEG, 4.78, 0.01, 'and as air lifts it');
  near(sky.sun.angularRadius / DEG, 1901.76 / 7200, 1e-4, 'the Sun’s apparent radius (Horizons: 1901.76 arcseconds across)');
  near(sky.moon.angularRadius / DEG, 1941.28 / 7200, 1e-4, 'the Moon’s (1941.28)');
  assert.equal(sky.moon.waxing, false, 'a waning gibbous Moon: last quarter was on 7 May');
  // the lit limb points at the Sun: up and to the left for someone facing the Moon
  assert.ok(sky.moon.brightLimb.fromZenith > 0 && sky.moon.brightLimb.fromZenith < Math.PI / 2);

  // directions are in the pad's frame: the Sun is behind the hatch side (+X), so the hatch was in shade
  assert.ok(sky.sun.direction[0] < -0.5, 'the Sun is on the -X side');
  const back = horizontal(siteToEnu(LC5.bearingX, sky.sun.direction));
  near(back.azimuth, sky.sun.azimuth, 1e-12, 'the site direction is the azimuth');
  near(back.elevation, sky.sun.elevation, 1e-12, 'and the elevation');

  // Horizons, the planets from the pad: azimuth, elevation, and the tolerance mean elements earn
  const want = {
    mercury: [93.972834, 47.234853, 0.02],
    venus: [154.485544, 66.418734, 0.02],
    mars: [54.896509, -14.094055, 0.02],
    jupiter: [233.042421, 20.763927, 0.15],
    saturn: [236.518311, 14.957388, 0.3],
    uranus: [44.270993, -33.78521, 0.05],
    neptune: [286.554493, -52.493323, 0.05],
  };
  assert.equal(sky.planets.length, 7);
  for (const p of sky.planets) {
    const [az, el, tolerance] = want[p.body.id];
    near(apart(p, az, el), 0, tolerance, `${p.body.name}’s direction, degrees`);
  }
  // Venus was a 16 per cent crescent a week before greatest brilliancy, 68 degrees up
  near(sky.planets.find((p) => p.body.id === 'venus').magnitude, -4.2, 0.2, 'Venus’s magnitude');
  near(sky.planets.find((p) => p.body.id === 'jupiter').magnitude, -2.0, 0.3, 'Jupiter’s magnitude');
});

test('refraction: Saemundsson’s formula at the usual check points', () => {
  near(refraction(0) / DEG, 28.98 / 60, 0.01, 'at the horizon, about 29 arcminutes');
  near(refraction(45 * DEG) / DEG, 0.99 / 60, 0.002, 'at 45 degrees, a minute of arc');
  near(refraction(90 * DEG), 0, 1e-5, 'none overhead');
});

test('a planet’s magnitude follows Mueller’s formulae', () => {
  const venus = BODIES.find((b) => b.id === 'venus');
  // 1 au from the observer and root 2 from the Sun, phase angle 45: -4.00 + 5 log10(1.414) + 0.01322 * 45 + 0.0000004247 * 45^3
  near(planetMagnitude(venus, [0, AU, 0], [AU, 0, 0]), -4.0 + 0.7526 + 0.5949 + 0.0387, 1e-3, 'Venus');
});

/**
 * Where seven bright stars stood over Launch Complex 5 at Freedom 7's liftoff (azimuth from north through east and
 * elevation, degrees, no refraction), by the IAU's own routines (ERFA 2.0, the open SOFA: `atci13` for proper
 * motion, parallax, light deflection, aberration and precession-nutation from Hipparcos places, then the Earth
 * Rotation Angle), with UT taken as UT1 and TT 33.6 s ahead of it. An independent chain from another catalogue.
 */
const STARS_AT_LIFTOFF = [
  ['Sirius', 101.28715533, -16.71611586, 100.5385, -16.1302],
  ['Arcturus', 213.91530029, 19.18240916, 323.1339, -32.9068],
  ['Alpha Centauri A', 219.90205833, -60.83399269, 207.3782, -48.969],
  ['Vega', 279.23473479, 38.78368896, 302.9266, 22.9555],
  ['Polaris', 37.95456067, 89.26410897, 0.4903, 29.2522],
  ['Canopus', 95.98795783, -52.69566138, 138.2171, -24.9064],
  ['Capella', 79.17232794, 45.99799147, 50.4955, 28.5096],
];

test('the stars at liftoff are where the IAU’s routines put them, to 0.012 degrees', () => {
  const sky = skyFrom(LC5, LIFTOFF);
  const m = j2000ToSite(LC5, sky.siderealTime, sky.jdTT);
  const years = yearsFrom2000(sky.jdTT);
  near(years, -38.66, 0.01, 'years from 2000.0 to 5 May 1961');
  for (const [name, ra, dec, azimuth, elevation] of STARS_AT_LIFTOFF) {
    // the star in our own table: the nearest to that place
    let at = -1,
      least = Infinity;
    for (let i = 0; i < STARS.length; i += STAR_STRIDE) {
      const off = angleBetween(fromEquatorial(STARS[i] * DEG, STARS[i + 1] * DEG), fromEquatorial(ra * DEG, dec * DEG));
      if (off < least) [at, least] = [i, off];
    }
    assert.ok(least / DEG < 0.01, `${name} is in the table`);
    const ours = rotate(m, starDirection(STARS[at], STARS[at + 1], STARS[at + 4], STARS[at + 5], years));
    const theirs = enuToSite(LC5.bearingX, fromHorizontal(azimuth * DEG, elevation * DEG));
    // what is left out: aberration (0.006 at most), the table's thousandth of a degree, parallax
    near(angleBetween(ours, theirs) / DEG, 0, 0.012, name);
  }
});

test('a star is carried along its proper motion: Alpha Centauri stood 0.04 degrees from its place in 2000', () => {
  const i = STARS.findIndex((v, k) => k % STAR_STRIDE === 0 && Math.abs(v - 219.9) < 1e-6 && STARS[k + 2] === -0.01);
  assert.ok(i >= 0);
  const then = starDirection(STARS[i], STARS[i + 1], STARS[i + 4], STARS[i + 5], -38.66);
  const now = starDirection(STARS[i], STARS[i + 1], STARS[i + 4], STARS[i + 5], 0);
  near(angleBetween(then, now) / DEG, (3.709 * 38.66) / 3600, 2e-4, '3.709 arcseconds a year for 38.66 years');
  near(angleBetween(now, fromEquatorial(STARS[i] * DEG, STARS[i + 1] * DEG)), 0, 1e-12, 'and at 2000.0 it is the catalogue’s place');
  // without it the star would be out by all of that: more than three times what the test above allows
  assert.ok(angleBetween(then, now) / DEG > 0.036);
});

test('the whole catalogue is baked: every star the eye sees, brightest first, the bright table at its head', () => {
  const file = readFileSync(new URL('../public/sky/stars.bin', import.meta.url));
  const all = new Float32Array(file.buffer, file.byteOffset, file.byteLength / 4);
  assert.equal(all.length / STAR_STRIDE, 9096);
  let to65 = 0;
  for (let i = 0; i < all.length; i += STAR_STRIDE) {
    assert.ok(all[i] >= 0 && all[i] < 360 && Math.abs(all[i + 1]) <= 90 && all[i + 2] < 8.1 && all[i + 3] > -0.5 && all[i + 3] < 6);
    if (i) assert.ok(all[i + 2] >= all[i + 2 - STAR_STRIDE], 'brightest first');
    if (all[i + 2] <= 6.5) to65++;
  }
  assert.ok(to65 > 8300 && to65 < 8500, `${to65} stars to magnitude 6.5`);
  for (let i = 0; i < STARS.length; i++) near(all[i], STARS[i], 2e-3, `number ${i} of the bright table`);
});

test('the stars: a catalogue star lands where it should in a site’s sky', () => {
  assert.equal(STARS.length % STAR_STRIDE, 0);
  assert.equal(STARS.length / STAR_STRIDE, 518);
  // brightest first: Sirius, Canopus, Arcturus
  assert.deepEqual(STARS.slice(0, 6), [101.287, -16.716, -1.46, 0.0, -0.553, -1.205]);
  assert.ok(STARS[2] <= STARS[2 + STAR_STRIDE] && STARS[2 + STAR_STRIDE] <= STARS[2 + 2 * STAR_STRIDE]);
  for (let i = 0; i < STARS.length; i += STAR_STRIDE) {
    assert.ok(STARS[i] >= 0 && STARS[i] < 360 && Math.abs(STARS[i + 1]) <= 90 && STARS[i + 2] <= 4.0, `star ${i / STAR_STRIDE}`);
  }
  // Polaris (2.02 mag, RA 37.95, Dec +89.26) stands as high as the latitude, due north, at any hour
  const polaris = STARS.findIndex((v, i) => i % STAR_STRIDE === 1 && v > 89);
  assert.ok(polaris > 0, 'Polaris is in the table');
  const sky = skyFrom(LC5, LIFTOFF);
  const m = j2000ToSite(LC5, sky.siderealTime, sky.jdTT);
  const seen = horizontal(siteToEnu(LC5.bearingX, rotate(m, fromEquatorial(STARS[polaris - 1] * DEG, STARS[polaris] * DEG))));
  near(seen.elevation / DEG, LC5.latitude, 1.0, 'Polaris’s elevation is the latitude, within its 0.9 degrees from the pole');
  assert.ok(Math.min(seen.azimuth, 2 * Math.PI - seen.azimuth) / DEG < 1.1, 'and it is north');
  // the matrix agrees with the ephemeris: the Sun's own J2000 direction lands on the Sun (parallax: 9 arcseconds)
  const sunJ2000 = inertialToJ2000(sunPosition(sky.jdTT), sky.jdTT);
  near(angleBetween(rotate(m, sunJ2000), sky.sun.direction) / DEG, 0, 0.003, 'the Sun by the star matrix');
});

test('the bodies: every number has a source, and the figures hang together', () => {
  assert.equal(BODIES.length, 10);
  for (const b of BODIES) {
    for (const q of [b.gm, b.equatorialRadius, b.polarRadius, b.rotationPeriod]) {
      assert.ok(['documented', 'derived', 'estimated'].includes(q.confidence), `${b.name}: confidence`);
      assert.ok(q.source.length > 8, `${b.name}: source`);
      assert.ok(Number.isFinite(q.value));
    }
    assert.ok(b.polarRadius.value <= b.equatorialRadius.value, `${b.name}: flattened, not stretched`);
    assert.ok(b.pole.source.length > 8);
  }
  for (const p of [...PLANETS, EARTH]) assert.ok(p.elements && p.elements.source.length > 8, `${p.name} has elements`);
  // Kepler's third law ties each mean orbit to the Sun's GM: the period from a against the rate of L
  for (const p of [...PLANETS, EARTH]) {
    const a = p.elements.a[0] * AU;
    const years = (2 * Math.PI * Math.sqrt(a ** 3 / SUN.gm.value)) / (365.25 * 86400);
    near(years, 36000 / p.elements.L[1], years * 2e-3, `${p.name}’s year`);
  }
  // surface gravity from GM and radius: 9.80 at the Earth's equator (before spin), 1.62 on the Moon
  near(EARTH.gm.value / EARTH.equatorialRadius.value ** 2, 9.798, 0.001, 'g');
  near(MOON.gm.value / MOON.equatorialRadius.value ** 2, 1.624, 0.001, 'lunar g');
  near(EARTH.rotationPeriod.value, 86164.1, 0.01, 'the Earth’s turn against the stars, seconds');
  // a satellite skimming the Earth's equator takes 84.5 minutes
  near((2 * Math.PI * Math.sqrt(EARTH.equatorialRadius.value ** 3 / EARTH.gm.value)) / 60, 84.49, 0.01, 'the lowest orbit');
});

test('every flight that has a site gives it sourced numbers, and its sky is the one its record states', async () => {
  // missions/index.ts imports without extensions (it is bundled); each flight.ts loads as it stands
  const files = globSync('missions/*/*/flights/*/flight.ts', { cwd: join(import.meta.dirname, '..') });
  const flights = await Promise.all(files.map(async (f) => (await import(pathToFileURL(join(import.meta.dirname, '..', f)).href)).flight));
  assert.ok(flights.length > 0);
  for (const flight of flights) {
    assert.ok(Number.isFinite(julianDate(flight.launch)), `${flight.id}: launch instant`);
    if (!flight.site) continue; // (only its vehicle is built: it has the gallery and no place yet, src/address.ts)
    for (const key of ['latitude', 'longitude', 'height', 'bearingX']) {
      const m = flight.site[key];
      assert.ok(Number.isFinite(m.value), `${flight.id}: site.${key}`);
      assert.ok(['documented', 'derived', 'estimated'].includes(m.confidence), `${flight.id}: site.${key} confidence`);
      assert.ok(m.source.length > 8, `${flight.id}: site.${key} source`);
    }
    assert.ok(flight.site.zone.name.length > 1 && Math.abs(flight.site.zone.utcOffset) <= 14, `${flight.id}: the site's civil time`);
  }
  // Freedom 7: the figures quoted in its README ("The sky at liftoff") and in sites/lc-5.md
  const mr3 = flights.find((f) => f.id === 'usa/mercury/mr-3-freedom-7');
  const sky = skyFrom(siteFrame(mr3.site), julianDate(mr3.launch));
  near(sky.sun.azimuth / DEG, 98.8, 0.05, 'Sun azimuth');
  near(sky.sun.elevation / DEG, 50.2, 0.05, 'Sun elevation');
  near(sky.moon.azimuth / DEG, 245.2, 0.05, 'Moon azimuth');
  near(sky.moon.elevation / DEG, 4.6, 0.05, 'Moon elevation');
  near(sky.moon.illuminated, 0.74, 0.005, 'Moon lit');
  // Vostok 1: the figures quoted in its README ("The sky at liftoff")
  const vostok1 = flights.find((f) => f.id === 'ussr/vostok/vostok-1');
  const over = skyFrom(siteFrame(vostok1.site), julianDate(vostok1.launch));
  near(over.sun.azimuth / DEG, 142.1, 0.05, 'Sun azimuth over Site 1');
  near(over.sun.elevation / DEG, 46.9, 0.05, 'Sun elevation over Site 1');
  near(over.moon.azimuth / DEG, 193.3, 0.05, 'Moon azimuth over Site 1');
  near(over.moon.elevation / DEG, 35.0, 0.06, 'Moon elevation over Site 1');
  near(over.moon.illuminated, 0.12, 0.005, 'Moon lit over Site 1');
  // Vostok 2: the figures quoted in its README ("The sky at liftoff")
  const vostok2 = flights.find((f) => f.id === 'ussr/vostok/vostok-2');
  const august = skyFrom(siteFrame(vostok2.site), julianDate(vostok2.launch));
  near(august.sun.azimuth / DEG, 132.0, 0.05, 'Sun azimuth over Site 1, 6 August');
  near(august.sun.elevation / DEG, 52.6, 0.05, 'Sun elevation over Site 1, 6 August');
  near(august.moon.azimuth / DEG, 234.3, 0.05, 'Moon azimuth over Site 1, 6 August');
  near(august.moon.elevation / DEG, 50.6, 0.05, 'Moon elevation over Site 1, 6 August');
  near(august.moon.illuminated, 0.235, 0.005, 'Moon lit over Site 1, 6 August');
  assert.equal(august.moon.waxing, false, 'the Moon Titov called waning');
  // Vostok 3 and Vostok 4: the figures quoted in their READMEs ("The sky at liftoff")
  const vostok3 = flights.find((f) => f.id === 'ussr/vostok/vostok-3');
  const first = skyFrom(siteFrame(vostok3.site), julianDate(vostok3.launch));
  near(first.sun.azimuth / DEG, 197.8, 0.05, 'Sun azimuth over Site 1, 11 August 1962');
  near(first.sun.elevation / DEG, 58.4, 0.05, 'Sun elevation over Site 1, 11 August 1962');
  near(first.moon.azimuth / DEG, 90.5, 0.05, 'Moon azimuth over Site 1, 11 August 1962');
  near(first.moon.elevation / DEG, -27.4, 0.05, 'Moon elevation over Site 1, 11 August 1962');
  near(first.moon.illuminated, 0.766, 0.005, 'Moon lit over Site 1, 11 August 1962');
  assert.equal(first.moon.waxing, true, 'the Moon Kamanin called almost full the evening before');
  const vostok4 = flights.find((f) => f.id === 'ussr/vostok/vostok-4');
  const second = skyFrom(siteFrame(vostok4.site), julianDate(vostok4.launch));
  near(second.sun.azimuth / DEG, 185.1, 0.05, 'Sun azimuth over Site 1, 12 August 1962');
  near(second.sun.elevation / DEG, 59.1, 0.05, 'Sun elevation over Site 1, 12 August 1962');
  near(second.moon.azimuth / DEG, 76.3, 0.05, 'Moon azimuth over Site 1, 12 August 1962');
  near(second.moon.elevation / DEG, -41.7, 0.05, 'Moon elevation over Site 1, 12 August 1962');
  near(second.moon.illuminated, 0.848, 0.005, 'Moon lit over Site 1, 12 August 1962');
  // Vostok 5 and Vostok 6: the figures quoted in their READMEs ("The sky at liftoff")
  const vostok5 = flights.find((f) => f.id === 'ussr/vostok/vostok-5');
  const afternoon = skyFrom(siteFrame(vostok5.site), julianDate(vostok5.launch));
  near(afternoon.sun.azimuth / DEG, 268.3, 0.05, 'Sun azimuth over Site 1, 14 June 1963');
  near(afternoon.sun.elevation / DEG, 34.95, 0.05, 'Sun elevation over Site 1, 14 June 1963');
  near(afternoon.moon.azimuth / DEG, 321.5, 0.05, 'Moon azimuth over Site 1, 14 June 1963');
  near(afternoon.moon.elevation / DEG, -47.6, 0.05, 'Moon elevation over Site 1, 14 June 1963');
  near(afternoon.moon.illuminated, 0.547, 0.005, 'Moon lit over Site 1, 14 June 1963');
  assert.equal(afternoon.moon.waxing, false, 'the waning Moon Bykovskiy timed his ship’s roll by');
  const vostok6 = flights.find((f) => f.id === 'ussr/vostok/vostok-6');
  const midday = skyFrom(siteFrame(vostok6.site), julianDate(vostok6.launch));
  near(midday.sun.azimuth / DEG, 231.3, 0.05, 'Sun azimuth over Site 1, 16 June 1963');
  near(midday.sun.elevation / DEG, 59.3, 0.05, 'Sun elevation over Site 1, 16 June 1963');
  near(midday.moon.azimuth / DEG, 273.7, 0.05, 'Moon azimuth over Site 1, 16 June 1963');
  near(midday.moon.elevation / DEG, -3.2, 0.05, 'Moon elevation over Site 1, 16 June 1963');
  near(midday.moon.illuminated, 0.337, 0.005, 'Moon lit over Site 1, 16 June 1963');
  assert.equal(midday.moon.waxing, false, 'a waning crescent, five days before new');
  // Sigma 7: the figures quoted in its README ("The sky at liftoff")
  const ma8 = flights.find((f) => f.id === 'usa/mercury/ma-8-sigma-7');
  const october = skyFrom(siteFrame(ma8.site), julianDate(ma8.launch));
  near(october.sun.azimuth / DEG, 101.2, 0.05, 'Sun azimuth over Complex 14, 3 October 1962');
  near(october.sun.elevation / DEG, 12.0, 0.05, 'Sun elevation over Complex 14, 3 October 1962');
  near(october.moon.azimuth / DEG, 88.3, 0.05, 'Moon azimuth over Complex 14, 3 October 1962');
  near(october.moon.elevation / DEG, -38.9, 0.05, 'Moon elevation over Complex 14, 3 October 1962');
  near(october.moon.illuminated, 0.195, 0.005, 'Moon lit over Complex 14, 3 October 1962');
  assert.equal(october.moon.waxing, true, 'the young Moon Schirra found beside Venus on his third pass');
});

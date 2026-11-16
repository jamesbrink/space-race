// src/world/jpl.ts and ephemeris.ts with DE440 loaded: the baked file against what it was baked from, and the sky and the
// Moon's state against JPL Horizons (ssd.jpl.nasa.gov/horizons, DE441, queried 16 November 2026: observer tables, airless
// apparent azimuth and elevation and observer range; vector tables, the Moon and the Sun from the Earth's centre, ICRF,
// geometric, at UT instants that Horizons turns into TDB). Meeus, the fallback, is held to his own examples and to
// Horizons at its own accuracy in tests/world.test.mjs.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { AU, C, EARTH, MOON } from '../src/world/bodies.ts';
import { ephemerisOf, loadEphemeris, moonPosition, skyFrom, stateOf, sunPosition, toDate, useEphemeris } from '../src/world/ephemeris.ts';
import { angleBetween, DEG, dot, fromHorizontal, length, scale, sub } from '../src/world/frames.ts';
import { julianDate, terrestrialTime } from '../src/world/time.ts';

const near = (got, want, tolerance, what) =>
  assert.ok(Math.abs(got - want) <= tolerance, `${what}: got ${got}, want ${want} within ${tolerance}`);
const apart = (seen, az, el) => angleBetween(fromHorizontal(seen.azimuth, seen.elevation), fromHorizontal(az * DEG, el * DEG)) / DEG;
const bytes = new Uint8Array(readFileSync(join(import.meta.dirname, '../public/ephemeris/de440.bin'))).slice().buffer;
const tt = (iso) => terrestrialTime(julianDate(iso));

test('with nothing loaded the answer is Meeus’s, and says so; loading needs a page to fetch from', async () => {
  useEphemeris(null);
  assert.equal(ephemerisOf(tt('1969-07-16T13:32:00Z')), 'Meeus');
  const s = stateOf('moon', tt('1969-07-16T13:32:00Z'));
  assert.equal(s.source, 'Meeus');
  assert.equal(s.confidence, 'estimated');
  assert.equal(s.frame, 'icrf');
  assert.throws(() => stateOf('sun', tt('1969-07-16T13:32:00Z'), 'ssb'), /barycentre/);
  assert.equal(await loadEphemeris(), false, 'a test has no page to fetch from');
});

test('the baked file: what it covers, how near DE440 each series was measured, and how big it is', () => {
  useEphemeris(bytes);
  assert.ok(bytes.byteLength < 1.0e6, `${bytes.byteLength} bytes`);
  // DE440's Earth-Moon mass ratio, as the kernel has it, against the GMs bodies.ts carries (IERS's Earth, DE440's Moon)
  const s = stateOf('moon', tt('1969-07-16T13:32:00Z'));
  assert.equal(s.source, 'DE440');
  assert.equal(s.confidence, 'derived');
  const earth = stateOf('earth', tt('1969-07-16T13:32:00Z'), 'emb');
  near(length(s.r) / length(earth.r) - 1, EARTH.gm.value / MOON.gm.value, 2e-6, 'the Earth-Moon mass ratio');
  assert.equal(ephemerisOf(tt('1957-10-04T19:28:34Z')), 'DE440', 'Sputnik 1 is inside it');
  assert.equal(ephemerisOf(tt('2034-12-31T00:00:00Z')), 'DE440');
  assert.equal(ephemerisOf(tt('1956-06-01T00:00:00Z')), 'Meeus', 'before it');
  assert.equal(ephemerisOf(tt('2035-06-01T00:00:00Z')), 'Meeus', 'after it');
  assert.equal(stateOf('moon', tt('2040-01-01T00:00:00Z')).source, 'Meeus');
});

// Horizons vectors: the Moon from the Earth's centre, km and km/s, at Apollo 8's and Apollo 11's translunar injection and
// lunar orbit insertion (ground elapsed times from Apollo by the Numbers, NASA SP-2000-4029, and the Apollo 11 Mission
// Report, MSC-00171, table 7-II, on liftoffs at 12:51:00 and 13:32:00 UTC)
const MOON_VECTORS = [
  [
    'Apollo 8’s translunar injection, 002:56:05.5',
    '1968-12-21T15:47:05.510Z',
    [1.645508419398558e5, -2.820747935607884e5, -1.543122464861492e5],
    [0.9898968366034635, 0.4039106473550427, 0.2086366717205937],
  ],
  [
    'Apollo 8’s lunar orbit insertion, 069:08:20.4',
    '1968-12-24T09:59:20.400Z',
    [3.454393857557733e5, -1.299748536161678e5, -7.372226297563261e4],
    [0.4798393268145082, 0.8151798762484334, 0.4370262864682401],
  ],
  [
    'Apollo 11’s translunar injection, 002:50:13.2',
    '1969-07-16T16:22:13.200Z',
    [-2.960224832126472e5, 2.427471105229392e5, 1.280891331885557e5],
    [-0.6470837021240047, -0.639756375612812, -0.3550195716904096],
  ],
  [
    'Apollo 11’s lunar orbit insertion, 075:49:50.4',
    '1969-07-19T17:21:50.400Z',
    [-3.924552584029632e5, 3.688020273600054e4, 1.510802799259513e4],
    [-0.05266645235114598, -0.872649678056636, -0.474818732531424],
  ],
];

for (const [what, iso, r, v] of MOON_VECTORS) {
  test(`the Moon at ${what}: Horizons’s state vector to 10 m and 0.05 mm/s`, (t) => {
    useEphemeris(bytes);
    const s = stateOf('moon', tt(iso));
    const dr = length(sub(s.r, scale(r, 1e3)));
    const dv = length(sub(s.v, scale(v, 1e3)));
    t.diagnostic(`${dr.toFixed(2)} m and ${(dv * 1e3).toFixed(4)} mm/s from Horizons`);
    assert.ok(dr < 10, `${dr} m`);
    assert.ok(dv < 5e-5, `${dv} m/s`);
    // and the Earth from the Moon is the same, turned round
    assert.deepEqual(stateOf('earth', tt(iso), 'moon').r, scale(s.r, -1));
  });
}

test('the Sun from the Earth’s centre: Horizons’s vectors to half a kilometre', (t) => {
  useEphemeris(bytes);
  for (const [iso, r] of [
    ['1969-07-16T13:32:00Z', [-6.246116642957308e7, 1.271860437858264e8, 5.515202860514432e7]],
    ['2024-04-08T18:00:00Z', [1.416139221747265e8, 4.487716214754935e7, 1.945277248834027e7]],
  ]) {
    const d = length(sub(stateOf('sun', tt(iso)).r, scale(r, 1e3)));
    t.diagnostic(`${iso}: ${(d / 1e3).toFixed(3)} km`);
    assert.ok(d < 500, `${iso}: ${d} m`);
  }
  // (before 1962 Horizons reads "UT" as UT1 and makes TT from it by its own delta-T, 0.33 s from the TT the leap-second
  // table gives: the Moon 345 m along its orbit, the Sun 10 km. That is the reference's time, not the ephemeris)
  const r = [1.154437839692363e5, -3.30900547127258e5, -1.180598058001805e5];
  const v = [1.004790393996095, 0.3317482487821948, 0.07230774584081959];
  const off = sub(stateOf('moon', tt('1961-05-05T14:34:13Z')).r, scale(r, 1e3));
  near(dot(off, v) / dot(v, v) / 1e3, 0.325, 0.01, 'Freedom 7’s Moon: seconds along its motion');
});

// Horizons: [place, instant, Sun azimuth, elevation, range (au), Moon azimuth, elevation, range (au), Moon lit (%)]: as in
// tests/world.test.mjs, held here to what DE440 earns
const SKIES = [
  [
    'LC-5 at Freedom 7’s liftoff',
    { latitude: 28.439426, longitude: -80.573292, height: 3 },
    '1961-05-05T14:34:13Z',
    98.75663,
    50.249359,
    1.0087826173,
    245.226747,
    4.604129,
    0.00246798719629,
    73.57741,
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
  ],
];

/**
 * Horizons's observer range is astrometric: from where the observer is to where the light left the body, in the solar
 * system's frame, so it carries the body's own barycentric motion over the light-time (the Earth's 30 km/s, for the Moon:
 * up to 40 km). The geometric distance here, made comparable: less the body's barycentric velocity along the line, times
 * the light-time.
 */
const astrometric = (seen, body, jdTT) => {
  const v = toDate(stateOf(body, jdTT, 'ssb'), jdTT).v;
  return seen.distance - (dot(seen.inertial, v) * seen.distance) / C;
};

for (const [name, place, iso, sunAz, sunEl, sunAu, moonAz, moonEl, moonAu, lit] of SKIES) {
  test(`the Sun and the Moon from ${name}, against JPL Horizons, with DE440`, (t) => {
    useEphemeris(bytes);
    const sky = skyFrom({ bearingX: 0, ...place }, julianDate(iso));
    assert.equal(ephemerisOf(sky.jdTT), 'DE440');
    // UT1 is taken to be UTC (time.ts). At J2000 UT1 - UTC was +0.355 s (IERS Bulletin B): 5.3 arcseconds of the Earth's
    // turn, which is all of the 4.6 seen there; elsewhere under half an arcsecond is left
    const turn = iso.startsWith('2000') ? 0.0015 : 0.00015;
    const [s, m] = [apart(sky.sun, sunAz, sunEl), apart(sky.moon, moonAz, moonEl)];
    t.diagnostic(`the Sun ${(s * 3600).toFixed(2)}" and the Moon ${(m * 3600).toFixed(2)}" from Horizons`);
    near(s, 0, turn, 'the Sun’s direction, degrees');
    near(m, 0, turn, 'the Moon’s direction, degrees');
    const [sd, md] = [astrometric(sky.sun, 'sun', sky.jdTT) - sunAu * AU, astrometric(sky.moon, 'moon', sky.jdTT) - moonAu * AU];
    t.diagnostic(`its range ${(sd / 1e3).toFixed(2)} km and the Moon’s ${(md / 1e3).toFixed(3)} km from Horizons’s`);
    // (the Sun's within its fit, 0.4 km; the Moon's within where UT1 - UTC puts the observer, 165 m at J2000)
    near(sd / 1e3, 0, 1, 'the Sun’s range, km');
    near(md / 1e3, 0, 0.2, 'the Moon’s range, km');
    near(sky.moon.illuminated * 100, lit, 0.003, 'how much of the Moon is lit, per cent');
  });
}

test('the planets from LC-5 at Freedom 7’s liftoff, with DE440: to half an arcsecond, where mean elements gave a tenth of a degree', () => {
  useEphemeris(bytes);
  const want = {
    mercury: [93.972834, 47.234853],
    venus: [154.485544, 66.418734],
    mars: [54.896509, -14.094055],
    jupiter: [233.042421, 20.763927],
    saturn: [236.518311, 14.957388],
    uranus: [44.270993, -33.78521],
    neptune: [286.554493, -52.493323],
  };
  const sky = skyFrom({ latitude: 28.439426, longitude: -80.573292, height: 3, bearingX: 295 }, julianDate('1961-05-05T14:34:13Z'));
  for (const p of sky.planets) near(apart(p, ...want[p.body.id]) * 3600, 0, 0.5, `${p.body.name}’s direction, arcseconds`);
});

test('the sky does not step when DE440 arrives: Meeus is within 0.01 degrees of it for the Sun and 0.017 for the Moon, 1957 to 2035', (t) => {
  let [sun, moon, far] = [0, 0, 0];
  for (let jd = 2_435_840; jd < 2_464_328; jd += 3.7) {
    useEphemeris(null);
    const [s0, m0] = [sunPosition(jd), moonPosition(jd)];
    useEphemeris(bytes);
    const [s1, m1] = [sunPosition(jd), moonPosition(jd)];
    sun = Math.max(sun, angleBetween(s0, s1) / DEG);
    moon = Math.max(moon, angleBetween(m0, m1) / DEG);
    far = Math.max(far, Math.abs(length(m0) - length(m1)));
  }
  t.diagnostic(`at most: the Sun ${sun.toFixed(4)}, the Moon ${moon.toFixed(4)} degrees and ${(far / 1e3).toFixed(0)} km`);
  // (the shadows are drawn again only when the light has moved 0.05 degrees; a pixel at a 50 degree field on 1080 lines is 0.046)
  assert.ok(sun < 0.01, `the Sun ${sun}`);
  assert.ok(moon < 0.017, `the Moon ${moon}`);
});

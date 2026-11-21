// The Moon's own frame (src/world/moon.ts) against published values: Meeus's worked example for the
// librations, and JPL Horizons (ssd.jpl.nasa.gov/horizons, DE441, the Moon from the Earth's centre,
// queried 13 November 2026) for the points of the Moon under the Earth and under the Sun.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { useEphemeris } from '../src/world/ephemeris.ts';
import { MOON } from '../src/world/bodies.ts';
import { angleBetween, cross, DEG, dot, length } from '../src/world/frames.ts';
import {
  fromMoon,
  fromSelenographic,
  meanEarthAxes,
  MOON_RADIUS,
  moonAxes,
  physicalLibration,
  principalAxes,
  selenographic,
} from '../src/world/moon.ts';
import { centuries, julianDate, terrestrialTime } from '../src/world/time.ts';

const near = (got, want, tolerance, what) =>
  assert.ok(Math.abs(got - want) <= tolerance, `${what}: got ${got}, want ${want} within ${tolerance}`);

test('the physical librations: Meeus example 53.a (12 April 1992, 0h TD)', () => {
  const { rho, sigma, tau } = physicalLibration(centuries(2448724.5));
  near(rho, -0.01042, 5e-6, 'rho');
  near(sigma, -0.01574, 5e-6, 'sigma');
  near(tau, 0.02673, 5e-6, 'tau');
});

test('the Moon’s axes are a frame: three unit vectors at right angles, right-handed', () => {
  for (const iso of ['1961-04-12T06:07:00Z', '1992-04-12T00:00:00Z', '2024-04-08T18:00:00Z']) {
    const [x, y, z] = moonAxes(terrestrialTime(julianDate(iso)));
    for (const v of [x, y, z]) near(length(v), 1, 1e-12, 'a unit axis');
    near(dot(x, y), 0, 1e-12, 'x.y');
    near(dot(y, z), 0, 1e-12, 'y.z');
    near(length(cross(cross(x, y), z)), 0, 1e-12, 'x cross y is z');
    assert.ok(dot(cross(x, y), z) > 0, 'right-handed');
    // its pole is 1.54 degrees from the ecliptic's and never far from the Earth's pole's 23.4 from that
    near(angleBetween(z, [0, 0, 1]) / DEG, 23.44, 1.6, 'the Moon’s pole from the Earth’s');
  }
});

// Horizons, the Moon from the Earth's centre: [instant, the point under the Earth (degrees east, north), the point
// under the Sun, the Sun's elongation from the Moon seen from the Earth (S-O-T), how much of the Moon is lit (%)]
const HORIZONS = [
  ['1961-04-12T06:07:00Z', 1.512864, 0.928532, 220.828573, -1.146141, 39.2248, 11.31328],
  ['1992-04-12T00:00:00Z', 358.767779, 4.175197, 67.885314, 1.453634, 110.8013, 67.86193],
  ['1968-12-24T16:38:00Z', 7.82637, 2.750997, 120.533736, -1.526953, 67.1114, 30.66391],
  ['2024-04-08T18:00:00Z', 1.951469, -0.437737, 182.158132, 0.113031, 0.3868, 0.00113],
];

for (const [iso, earthLon, earthLat, sunLon, sunLat, elongation, lit] of HORIZONS) {
  test(`the points of the Moon under the Earth and the Sun at ${iso}, against JPL Horizons`, () => {
    const m = fromMoon(terrestrialTime(julianDate(iso)));
    // to 0.03 degrees on the Moon: 900 m of ground (Horizons' frame is the mean-Earth one; Meeus's series is his own fit)
    const apart = (got, lon, lat) => angleBetween(fromSelenographic(got.longitude, got.latitude), fromSelenographic(lon, lat)) / DEG;
    near(apart(m.subEarth, earthLon, earthLat), 0, 0.03, 'the point under the Earth');
    near(apart(m.subSolar, sunLon, sunLat), 0, 0.03, 'the point under the Sun');
    // the Earth's phase seen from the Moon is the Sun's elongation from the Moon seen from the Earth
    near(m.earthPhase / DEG, elongation, 0.01, 'the angle at the Earth between the Sun and the Moon');
    // and the Earth is lit by as much as the Moon is dark, all but a hair (the Sun is not infinitely far)
    near(m.earthLit * 100, 100 - lit, 0.3, 'the Earth’s lit share');
  });
}

test('Meeus’s own figures for 12 April 1992: the libration and the Sun’s place over the Moon', () => {
  // example 53.a: l = -1.23, b = +4.20; the Sun's selenographic place that day, l0 = 67.89, b0 = +1.46
  const m = fromMoon(2448724.5);
  near(m.subEarth.longitude, -1.23, 0.01, 'libration in longitude');
  near(m.subEarth.latitude, 4.2, 0.01, 'libration in latitude');
  near(m.subSolar.longitude, 67.89, 0.01, 'the Sun’s selenographic longitude');
  near(m.subSolar.latitude, 1.46, 0.01, 'the Sun’s selenographic latitude');
});

test('a place on the Moon as a direction, and back', () => {
  for (const [lon, lat] of [
    [0, 0],
    [-87.2, -62],
    [179.5, 45],
    [-150, -89],
  ]) {
    const back = selenographic(fromSelenographic(lon, lat));
    near(back.longitude, lon, 1e-9, 'longitude');
    near(back.latitude, lat, 1e-9, 'latitude');
  }
  assert.deepEqual(fromSelenographic(0, 0), [1, 0, 0], '+X is the middle of the near side');
  assert.equal(MOON_RADIUS, MOON.equatorialRadius.value, 'one radius: the sphere its maps’ heights are measured from');
});

/**
 * The IAU's series for the Moon's orientation (Archinal et al. 2011, "Report of the IAU Working Group on Cartographic
 * Coordinates and Rotational Elements: 2009", Celest. Mech. Dyn. Astr. 109, 101, table 2): a fit to the mean-Earth frame,
 * good to about 150 m on the ground. Rows from the ICRF to the Moon's frame, at a Julian date (TDB, taken as TT).
 */
function iauMoon(jd) {
  const d = jd - 2_451_545.0;
  const T = d / 36_525;
  const E = [
    0,
    125.045 - 0.0529921 * d,
    250.089 - 0.1059842 * d,
    260.008 + 13.0120009 * d,
    176.625 + 13.3407154 * d,
    357.529 + 0.9856003 * d,
    311.589 + 26.4057084 * d,
    134.963 + 13.064993 * d,
    276.617 + 0.3287146 * d,
    34.226 + 1.7484877 * d,
    15.134 - 0.1589763 * d,
    119.743 + 0.0036096 * d,
    239.961 + 0.1643573 * d,
    25.053 + 12.9590088 * d,
  ].map((x) => x * DEG);
  const [S, C] = [Math.sin, Math.cos];
  const ra =
    269.9949 +
    0.0031 * T -
    3.8787 * S(E[1]) -
    0.1204 * S(E[2]) +
    0.07 * S(E[3]) -
    0.0172 * S(E[4]) +
    0.0072 * S(E[6]) -
    0.0052 * S(E[10]) +
    0.0043 * S(E[13]);
  const dec =
    66.5392 +
    0.013 * T +
    1.5419 * C(E[1]) +
    0.0239 * C(E[2]) -
    0.0278 * C(E[3]) +
    0.0068 * C(E[4]) -
    0.0029 * C(E[6]) +
    0.0009 * C(E[7]) +
    0.0008 * C(E[10]) -
    0.0009 * C(E[13]);
  const W =
    38.3213 +
    13.17635815 * d -
    1.4e-12 * d * d +
    3.561 * S(E[1]) +
    0.1208 * S(E[2]) -
    0.0642 * S(E[3]) +
    0.0158 * S(E[4]) +
    0.0252 * S(E[5]) -
    0.0066 * S(E[6]) -
    0.0047 * S(E[7]) -
    0.0046 * S(E[8]) +
    0.0028 * S(E[9]) +
    0.0052 * S(E[10]) +
    0.004 * S(E[11]) +
    0.0019 * S(E[12]) -
    0.0044 * S(E[13]);
  // the pole and the prime meridian: Rz(W) Rx(90 - dec) Rz(90 + ra), each a turn of the axes
  const z = (a) => [
    [C(a), S(a), 0],
    [-S(a), C(a), 0],
    [0, 0, 1],
  ];
  const x = (a) => [
    [1, 0, 0],
    [0, C(a), S(a)],
    [0, -S(a), C(a)],
  ];
  const mul = (a, b) => a.map((r) => [0, 1, 2].map((j) => r[0] * b[0][j] + r[1] * b[1][j] + r[2] * b[2][j]));
  return mul(z(W * DEG), mul(x((90 - dec) * DEG), z((90 + ra) * DEG)));
}

test('the mean-Earth frame from DE440’s principal axes: within the IAU’s series’ 150 m, where the principal axes are not', () => {
  const de440 = new Uint8Array(readFileSync(join(import.meta.dirname, '../public/ephemeris/de440.bin'))).slice().buffer;
  // (on the ground: the most any of the three axes is turned from the other frame's, times the Moon's radius)
  const off = (a, b) => MOON_RADIUS * Math.max(...[0, 1, 2].map((i) => angleBetween(a[i], b[i])));
  useEphemeris(de440);
  try {
    for (const jd of [2_440_211.5 /* 1968 December 24 */, 2_440_423.4 /* 1969 July 20 */, 2_441_000.5, 2_451_545.0, 2_459_000.5]) {
      const me = meanEarthAxes(jd);
      assert.equal(me.source, 'DE440');
      const iau = iauMoon(jd);
      const [got, pa] = [off(me.axes, iau), off(principalAxes(jd).axes, iau)];
      assert.ok(got < 150, `at ${jd}: ${got.toFixed(0)} m from the IAU's`);
      assert.ok(pa > 600, `at ${jd}: the principal axes ${pa.toFixed(0)} m from the IAU's`);
    }
  } finally {
    useEphemeris(null);
  }
  // without DE440, Meeus's axes, and said so
  const meeus = meanEarthAxes(2_440_423.4);
  assert.equal(meeus.source, 'Meeus');
  assert.equal(meeus.confidence, 'estimated');
});

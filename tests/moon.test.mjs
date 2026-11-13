// The Moon's own frame (src/world/moon.ts) against published values: Meeus's worked example for the
// librations, and JPL Horizons (ssd.jpl.nasa.gov/horizons, DE441, the Moon from the Earth's centre,
// queried 13 November 2026) for the points of the Moon under the Earth and under the Sun.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MOON } from '../src/world/bodies.ts';
import { angleBetween, cross, DEG, dot, length } from '../src/world/frames.ts';
import { fromMoon, fromSelenographic, MOON_RADIUS, moonAxes, physicalLibration, selenographic } from '../src/world/moon.ts';
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

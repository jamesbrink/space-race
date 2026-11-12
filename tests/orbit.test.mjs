// src/world/orbit.ts against published values: Vallado's worked examples (Fundamentals of
// Astrodynamics and Applications, 4th ed.: examples 2-2, 2-5, 2-6), orbits whose figures are in
// every textbook (the geostationary radius, the Sun-synchronous inclination at 800 km, the critical
// inclination), and Vostok 1's own published heights against its own published period. Where no
// published case was found (the shadow) the test says so and holds the code to geometry instead.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gravity as flyGravity, J2 } from '../src/sim/fly.ts';
import { EARTH, EARTH_ROTATION_RATE, WGS84_A } from '../src/world/bodies.ts';
import { cross, DEG, dot, geodeticToEcef, length, scale, sub, unit } from '../src/world/frames.ts';
import {
  axisOfPeriod,
  coast,
  crossings,
  drift,
  EARTH_J2,
  eccentricAnomaly,
  elementsOf,
  energy,
  gravity,
  inertialToSite,
  meanAnomaly,
  nodalPeriod,
  period,
  planeThrough,
  secularRates,
  siteToInertial,
  stateOf,
  subpoint,
  sunlit,
  trueAnomaly,
} from '../src/world/orbit.ts';

const near = (got, want, tolerance, what) =>
  assert.ok(Math.abs(got - want) <= tolerance, `${what}: got ${got}, want ${want} within ${tolerance}`);
const KM = 1000;
const TAU = 2 * Math.PI;

test('elements from a position and velocity: Vallado example 2-5', () => {
  const el = elementsOf([6524.834 * KM, 6862.875 * KM, 6448.296 * KM], [4901.327, 5533.756, -1976.341]);
  near(el.a / KM, 36127.343, 0.5, 'semi-major axis, km');
  near(el.e, 0.832853, 2e-6, 'eccentricity');
  near(el.i / DEG, 87.87, 0.001, 'inclination');
  near(el.node / DEG, 227.898, 0.002, 'node');
  near(el.argp / DEG, 53.38, 0.01, 'argument of perigee');
  near(el.nu / DEG, 92.335, 0.001, 'true anomaly');
  near((el.a * (1 - el.e ** 2)) / KM, 11067.79, 0.1, 'semi-parameter, km');
});

test('a position and velocity from elements: Vallado example 2-6', () => {
  const p = 11067.79 * KM;
  const e = 0.83285;
  const s = stateOf({ a: p / (1 - e * e), e, i: 87.87 * DEG, node: 227.89 * DEG, argp: 53.38 * DEG, nu: 92.335 * DEG });
  const want = { r: [6525.344, 6861.535, 6449.125], v: [4.902276, 5.533124, -1.975709] };
  for (let k = 0; k < 3; k++) {
    near(s.r[k] / KM, want.r[k], 0.5, `r[${k}], km`);
    near(s.v[k] / KM, want.v[k], 0.0005, `v[${k}], km/s`);
  }
});

test('elements and state are each other’s inverse, on every kind of ellipse', () => {
  const cases = [
    { a: 6_625_000, e: 0.011, i: 64.95 * DEG, node: 1, argp: 2, nu: 3 },
    { a: 26_560_000, e: 0.74, i: 63.4 * DEG, node: 5, argp: 4.7, nu: 0.2 },
    { a: 7_000_000, e: 0, i: 98 * DEG, node: 0.3, argp: 0, nu: 4 }, // circular: nu is the argument of latitude
    { a: 42_164_000, e: 0.1, i: 0, node: 0, argp: 1.1, nu: 2 }, // equatorial: argp is from +X
    { a: 7_000_000, e: 0.02, i: 120 * DEG, node: 6, argp: 0.1, nu: 6.1 }, // retrograde
  ];
  for (const el of cases) {
    const s = stateOf(el);
    const back = elementsOf(s.r, s.v);
    for (const key of ['a', 'e', 'i', 'node', 'argp', 'nu']) {
      const tolerance = key === 'a' ? 1e-3 : 1e-9;
      const miss = key === 'a' || key === 'e' || key === 'i' ? back[key] - el[key] : Math.sin((back[key] - el[key]) / 2);
      near(miss, 0, tolerance, `${key} of ${JSON.stringify(el)}`);
    }
  }
});

test('Kepler’s equation: Vallado example 2-2', () => {
  near(eccentricAnomaly(235.4 * DEG, 0.4) / DEG, 220.512074, 1e-6, 'eccentric anomaly');
  for (const e of [0, 0.011, 0.4, 0.83, 0.99])
    for (let m = 0.1; m < TAU; m += 0.7)
      near(Math.sin((meanAnomaly(trueAnomaly(m, e), e) - m) / 2), 0, 1e-11, `mean anomaly ${m} at e ${e}`);
});

test('periods everyone prints: a sidereal day at the geostationary radius, and back', () => {
  // 42,164 km and 86,164.09 s: Vallado table of orbit types; any textbook
  near(period(42_164_170) / 1, 86_164.09, 1, 'geostationary period, s');
  near(axisOfPeriod(86_164.0905) / KM, 42_164.17, 0.02, 'geostationary radius, km');
});

test('Vostok 1’s published heights give its published period, each in its own convention', () => {
  // OKB-1's report of 3 May 1961: 181 by 327 km, 89.44 min. Heights over a ball of 6,371 km.
  near(period(6_371_000 + (181_000 + 327_000) / 2) / 60, 89.44, 0.01, 'OKB-1: period, min');
  // NASA NSSDC, 1961-012A: 169 by 315 km, 89.34 min. Heights over the equatorial radius.
  near(period(WGS84_A + (169_000 + 315_000) / 2) / 60, 89.34, 0.01, 'NSSDC: period, min');
  // TASS on the day: 175 by 302 km, 89.1 min
  near(period(6_371_000 + (175_000 + 302_000) / 2) / 60, 89.1, 0.03, 'TASS: period, min');
});

test('J2’s steady rates: the Sun-synchronous orbit and the critical inclination', () => {
  // an 800 km circular orbit is Sun-synchronous at 98.6 degrees (Wertz and Larson, SMAD; Vallado section 11.4.1):
  // its node goes east once a year, 360 degrees in 365.2422 days
  const year = TAU / (365.2422 * 86_400);
  const sso = secularRates(WGS84_A + 800_000, 0, 98.6 * DEG);
  near(sso.node / year, 1, 0.01, 'node rate at 800 km and 98.6 degrees, in turns a year');
  // the perigee stands still at 63.4349 degrees, where 5 cos^2 i = 1 (Molniya's inclination)
  near(secularRates(26_560_000, 0.74, Math.acos(Math.sqrt(1 / 5))).argp, 0, 1e-20, 'perigee rate at the critical inclination');
  near(Math.acos(Math.sqrt(1 / 5)) / DEG, 63.4349, 1e-4, 'the critical inclination');
  // a prograde low orbit's node goes west (Vostok 1's by 3.7 degrees a day: computed here, not a published figure),
  // and from node to node it is within a few seconds of Kepler's period
  const vostok = secularRates(6_625_000, 0.011, 64.95 * DEG);
  assert.ok(vostok.node < 0, 'westward');
  near((vostok.node * 86_400) / DEG, -3.7, 0.05, 'Vostok 1: node, degrees a day');
  near(nodalPeriod(6_625_000, 0.011, 64.95 * DEG) - period(6_625_000), 0, 5, 'nodal period less Kepler’s, s');
});

test('the same gravity as the simulator’s', () => {
  assert.equal(EARTH_J2, J2);
  const r = [3_000_000, -4_000_000, 4_500_000];
  assert.deepEqual(gravity(r), flyGravity(r));
});

test('a coast with no oblateness is Kepler’s orbit: once round and back where it began', () => {
  const start = stateOf({ a: 6_625_000, e: 0.011, i: 64.95 * DEG, node: 1, argp: 2, nu: 0 });
  const T = period(6_625_000);
  for (const [most, tolerance] of [
    [1, 0.01],
    [10, 0.5],
    [30, 40],
    [60, 700],
  ]) {
    const end = coast(start, T, most, 0);
    const miss = length(sub(end.r, start.r));
    console.log(`  # Kepler orbit, step ${most} s: ${miss.toExponential(2)} m out after one revolution`);
    assert.ok(miss < tolerance, `step ${most} s: ${miss} m out after one revolution, want under ${tolerance}`);
  }
});

test('a coast keeps its energy and its angular momentum about the pole, over 108 minutes', () => {
  const start = stateOf({ a: 6_625_000, e: 0.011, i: 64.95 * DEG, node: 1, argp: 2, nu: 0 });
  const e0 = energy(start);
  const h0 = cross(start.r, start.v)[2];
  // the bounds the plan quotes for time acceleration: relative drift in energy after 108 minutes at each step
  for (const [most, bound] of [
    [1, 1e-12],
    [10, 1e-10],
    [30, 2e-8],
    [60, 1e-6],
  ]) {
    const end = coast(start, 108 * 60, most);
    const drifted = Math.abs((energy(end) - e0) / e0);
    console.log(`  # J2 orbit, step ${most} s: energy drifts ${drifted.toExponential(2)} of itself in 108 min`);
    assert.ok(drifted < bound, `step ${most} s: energy drifted ${drifted}, want under ${bound}`);
    near((cross(end.r, end.v)[2] - h0) / h0, 0, bound * 10, `step ${most} s: angular momentum about the pole`);
  }
});

test('the integrated orbit’s node and perigee drift as J2’s steady rates say', () => {
  const el = { a: 6_900_000, e: 0.02, i: 64.95 * DEG, node: 1, argp: 0.5, nu: 0 };
  const rates = secularRates(el.a, el.e, el.i);
  const revolutions = 30;
  const T = nodalPeriod(el.a, el.e, el.i) * revolutions;
  const end = coast(stateOf(el), T, 10);
  const got = elementsOf(end.r, end.v);
  // osculating elements wobble by parts in a thousand; over thirty revolutions the steady drift shows through to a few per cent
  near((got.node - el.node) / (rates.node * T), 1, 0.03, 'node drift, against the rate');
  near((got.argp - el.argp) / (rates.argp * T), 1, 0.25, 'perigee drift, against the rate');
  const mean = drift(el, T);
  near(Math.sin((mean.node - got.node) / 2), 0, 2e-3, 'drift(): node');
});

test('the hand-over between a site and the inertial frame', () => {
  const site = { latitude: 45.92025, longitude: 63.34225, height: 78, bearingX: 37.5 };
  const gast = 2.345;
  const stood = siteToInertial(site, [0, 0, 0], [0, 0, 0], gast);
  // standing still on the turning Earth: eastward at the rotation rate times the distance from the axis
  const fixed = geodeticToEcef(site);
  near(length(stood.v), EARTH_ROTATION_RATE * Math.hypot(fixed[0], fixed[1]), 1e-9, 'speed of a place at rest, m/s');
  near(length(stood.v), 323.9, 0.5, 'Tyuratam goes east at 324 m/s');
  near(dot(stood.v, stood.r), 0, 1e-3, 'and not up');
  const here = subpoint(stood.r, gast);
  near(here.latitude, site.latitude, 1e-9, 'latitude');
  near(here.longitude, site.longitude, 1e-9, 'longitude');
  near(here.height, site.height, 1e-6, 'height');
  // there and back
  const s = siteToInertial(site, [1200, 3400, -560], [7, -8, 9], gast);
  const back = inertialToSite(site, s, gast);
  for (let k = 0; k < 3; k++) {
    near(back.p[k], [1200, 3400, -560][k], 1e-6, `position ${k}`);
    near(back.v[k], [7, -8, 9][k], 1e-9, `velocity ${k}`);
  }
  // a quarter of a sidereal day on, a body left in the inertial frame is 90 degrees of longitude west
  const later = subpoint(stood.r, gast + Math.PI / 2);
  near(((site.longitude - later.longitude + 540) % 360) - 180, 90, 1e-9, 'the Earth turns east under it');
});

test('the plane of a given inclination through a place', () => {
  const place = geodeticToEcef({ latitude: 45.92025, longitude: 63.34225, height: 0 });
  for (const northbound of [true, false]) {
    const n = planeThrough(place, 64.95 * DEG, northbound);
    near(length(n), 1, 1e-12, 'a unit vector');
    near(Math.acos(n[2]) / DEG, 64.95, 1e-9, 'inclination');
    near(dot(n, unit(place)), 0, 1e-12, 'the place is in the plane');
    assert.equal(cross(n, place)[2] > 0, northbound, 'crossed going the way asked');
    // the bearing it is crossed on: sin Az = cos i / cos(geocentric latitude), the textbook's launch azimuth
    const up = unit(place);
    const east = unit(cross([0, 0, 1], up));
    const north = cross(up, east);
    const along = unit(cross(n, up));
    const azimuth = Math.atan2(dot(along, east), dot(along, north)) / DEG;
    const geocentric = Math.asin(up[2]);
    const want = Math.asin(Math.cos(64.95 * DEG) / Math.cos(geocentric)) / DEG;
    near(azimuth, northbound ? want : 180 - want, 1e-9, 'azimuth');
  }
  assert.equal(
    planeThrough(geodeticToEcef({ latitude: 70, longitude: 0, height: 0 }), 64.95 * DEG),
    null,
    'no such plane beyond its reach',
  );
});

test('the Earth’s shadow: geometry (no published case was found to hold it to)', () => {
  const AU = 149_597_870_700;
  const sun = [AU, 0, 0];
  assert.equal(sunlit([7_000_000, 0, 0], sun), 1, 'between the Earth and the Sun');
  assert.equal(sunlit([-7_000_000, 0, 0], sun), 0, 'straight behind the Earth');
  assert.equal(sunlit([0, 7_000_000, 0], sun), 1, 'over the terminator');
  // the penumbra is the Sun's own width across: a quarter of a degree either side of the geometric edge
  const r = 6_625_000;
  const edge = Math.PI / 2 + Math.acos(WGS84_A / r); // from the Sun's direction, where the Earth's limb cuts the Sun's centre
  const at = (angle) => sunlit([r * Math.cos(angle), r * Math.sin(angle), 0], sun);
  near(at(edge), 0.5, 0.01, 'half the Sun at the edge');
  assert.equal(at(edge - 0.3 * DEG), 1);
  assert.equal(at(edge + 0.3 * DEG), 0);
  assert.ok(at(edge - 0.1 * DEG) > at(edge) && at(edge) > at(edge + 0.1 * DEG), 'and it dims the whole way across');
  // a circular orbit with the Sun in its plane is dark for asin(R/r)/pi of it (a cylinder of shadow: any textbook)
  const T = period(r);
  const n = TAU / T;
  const marks = crossings((t) => at(n * t), 0, T, 20);
  assert.equal(marks.length, 2);
  assert.ok(!marks[0].rising && marks[1].rising, 'in, then out');
  near((marks[1].t - marks[0].t) / T, Math.asin(WGS84_A / r) / Math.PI, 2e-4, 'the dark part of a revolution');
  near((marks[1].t - marks[0].t) / 60, 36.9, 0.3, 'about 37 minutes of an 89-minute orbit');
});

test('GM is the one bodies.ts records', () => {
  near(EARTH.gm.value, 3.986004418e14, 1e6, 'the Earth’s GM');
  near(length(scale(gravity([WGS84_A, 0, 0], 0), 1)), 9.798, 0.001, 'point-mass gravity at the equator, m/s^2');
});

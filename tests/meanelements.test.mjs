// src/world/meanelements.ts: Kozai's first-order J2 theory (AJ 64, 367, 1959) held to itself, to his own second form of
// it (eq. 13), to two published mean orbits with their published periods (Jason-3's handbook; Sentinel-3A's orbit as
// AVISO publishes it), and to the repo's own J2 propagator (orbit.ts `coast`): Vostok 1's and Vostok 2's published orbits,
// read as mean elements with a nodal period, flown round, go round in their published periods, where read as osculating
// they are 8 to 12 s out. Vallado's worked examples of mean elements were not to hand (docs/sources.md) and are not used.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SITE1 } from '../missions/ussr/places/tyuratam/site-1.ts';
import { EARTH_J2, WGS84_A } from '../src/world/bodies.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { add, cross, DEG, dot, geodeticToEcef, length, scale, unit } from '../src/world/frames.ts';
import {
  alongPublished,
  apsisRadius,
  CONVENTION,
  ellipsoidRadius,
  fromPublished,
  kozaiAxis,
  meanOf,
  meanOrbitOf,
  meanRates,
  osculatingOf,
  periodsOf,
  shortPeriodic,
  stateOfMean,
} from '../src/world/meanelements.ts';
import { coast, elementsOf, planeThrough, stateOf } from '../src/world/orbit.ts';

const near = (got, want, tolerance, what) =>
  assert.ok(Math.abs(got - want) <= tolerance, `${what}: got ${got}, want ${want} within ${tolerance}`);
const KM = 1000;
const TAU = 2 * Math.PI;
const A2 = 1.5 * EARTH_J2 * WGS84_A * WGS84_A;
const angle = (x) => Math.atan2(Math.sin(x), Math.cos(x));

/** The instants a coast from `s` at `t0` crosses the equator going north, to `until`: stepped at 5 s, each crossing found by halving to 1e-8 s. */
function northbound(s, t0, until) {
  const out = [];
  const h = 5;
  for (let t = t0; t < until; t += h) {
    const next = coast(s, h, h);
    if (s.r[2] < 0 && next.r[2] >= 0) {
      let [lo, hi] = [0, h];
      for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2;
        if (coast(s, mid, 1).r[2] < 0) lo = mid;
        else hi = mid;
      }
      out.push(t + (lo + hi) / 2);
    }
    s = next;
  }
  return out;
}
/** The mean time between successive northbound crossings, s. */
const nodalOf = (crossings) => (crossings.at(-1) - crossings[0]) / (crossings.length - 1);

// The two orbits as their records give them (missions/ussr/vostok/flights/vostok-{1,2}/orbital.ts `orbit`). Vostok 1: OKB-1's
// report of 3 May 1961, 181 by 327 km, 64°57′, 89.44 min. Vostok 2: the FAI record file, p. 224, 183 by 244 km, 64°56′,
// 88.46 min. The radius is the record's (derived there): it is used only by the osculating reading.
const VOSTOK = [
  { name: 'Vostok 1', perigee: 181 * KM, apogee: 327 * KM, inclination: 64.95 * DEG, period: 89.44 * 60, radius: 6_371 * KM },
  { name: 'Vostok 2', perigee: 183 * KM, apogee: 244 * KM, inclination: (64 + 56 / 60) * DEG, period: 88.46 * 60, radius: 6_363 * KM },
];

test('eq. 12 is the average over the mean anomaly of eq. 10: every short-periodic term less it averages to nothing', () => {
  for (const e of [1e-3, 0.0046, 0.05, 0.3, 0.6])
    for (const i of [30, 64.93, 98.6, 140])
      for (const argp of [0.3, 2.1, 4]) {
        const N = 4096;
        const sum = { a: 0, xi: 0, eta: 0, i: 0, node: 0, lambda: 0 };
        const most = { ...sum };
        for (let k = 0; k < N; k++) {
          const d = shortPeriodic({ a: 7_000 * KM, e, i: i * DEG, node: 1, argp, mean: (k * TAU) / N });
          for (const key in sum) {
            sum[key] += d[key] / N;
            most[key] = Math.max(most[key], Math.abs(d[key]));
          }
        }
        for (const key in sum) {
          assert.ok(most[key] > 0 || key === 'i' || key === 'node', `${key} has a term`);
          near(sum[key] / (most[key] || 1), 0, 1e-10, `e ${e}, i ${i}, w ${argp}: the average of ${key}'s term, of its largest`);
        }
      }
});

test('the 1/e terms cancel: on a circle the theory is Kozai’s eq. 13 for the radius and the argument of latitude', () => {
  // Eq. 13 at e = 0, from his own second derivation (p. 371): r = a-bar + A2/(6 p) sin^2 i cos 2u, and
  // L = u-bar - A2/p^2 (1/2 - 7/12 sin^2 i) sin 2u, a-bar Kozai's mean axis (p. 372)
  let worst = { r: 0, u: 0 };
  for (const a of [6_600 * KM, 7_200 * KM])
    for (const i of [20, 64.93, 98.6])
      for (let u = 0.1; u < TAU; u += 0.7) {
        const s2 = Math.sin(i * DEG) ** 2;
        const s = stateOfMean({ a, e: 0, i: i * DEG, node: 0.4, argp: 0, mean: u });
        const r = kozaiAxis(a, 0, i * DEG) + (A2 / (6 * a)) * s2 * Math.cos(2 * u);
        const el = elementsOf(s.r, s.v);
        const L = u - (A2 / (a * a)) * (0.5 - (7 / 12) * s2) * Math.sin(2 * u);
        worst = { r: Math.max(worst.r, Math.abs(length(s.r) - r)), u: Math.max(worst.u, Math.abs(angle(el.argp + el.nu - L))) };
      }
  console.log(
    `  # against eq. 13: radius within ${worst.r.toFixed(2)} m, argument of latitude within ${(worst.u * 6.6e6).toFixed(2)} m along the track`,
  );
  assert.ok(worst.r < 20, 'radius: within J2 squared (some 15 m)');
  assert.ok(worst.u * 6.6e6 < 20, 'argument of latitude: within J2 squared');
  // and the terms are the same either side of the least eccentricity the theory works at
  const at = (e) => osculatingOf({ a: 6_600 * KM, e, i: 64.93 * DEG, node: 0.4, argp: 1, mean: 2 });
  const [p, q] = [stateOf(at(0)), stateOf(at(1e-7))];
  near(length(p.r.map((x, k) => x - q.r[k])), 0, 1.5, 'e 0 against 1e-7: metres (a e is 0.66 m)');
});

test('mean to osculating and back is the same mean orbit', () => {
  for (const m of [
    { a: 6_574.6 * KM, e: 0.0046, i: 64.93 * DEG, node: 1, argp: 2, mean: 0.5 },
    { a: 7_714.4 * KM, e: 0.0001, i: 66.04 * DEG, node: 4, argp: 1.57, mean: 3 },
    { a: 7_177.9 * KM, e: 0.0011, i: 98.65 * DEG, node: 5, argp: 1.57, mean: 6 },
    { a: 26_560 * KM, e: 0.74, i: 63.4 * DEG, node: 2, argp: 4.7, mean: 0.2 },
    { a: 8_000 * KM, e: 0.1, i: 30 * DEG, node: 0.3, argp: 0.1, mean: 6.2 },
  ]) {
    const back = meanOf(stateOfMean(m));
    near(back.a - m.a, 0, 1e-4, `${m.a}: a, m`);
    near(back.i - m.i, 0, 1e-12, `${m.a}: i`);
    near(Math.sin((back.node - m.node) / 2), 0, 1e-12, `${m.a}: node`);
    near(back.e * Math.cos(back.argp) - m.e * Math.cos(m.argp), 0, 1e-12, `${m.a}: e cos w`);
    near(back.e * Math.sin(back.argp) - m.e * Math.sin(m.argp), 0, 1e-12, `${m.a}: e sin w`);
    near(Math.sin((back.mean + back.argp - m.mean - m.argp) / 2), 0, 1e-12, `${m.a}: M + w`);
  }
});

test('a published mean orbit with its published nodal period and node rate: Jason-3', () => {
  // Jason-3 Products Handbook (CNES, EUMETSAT, NASA, NOAA), issue 1.5, 17 September 2018, Table 5, "mean classical orbit
  // elements": a 7,714.432 km, e 0.000098, i 66.042 deg; Table 6: nodal period 6,745.7605 s, inertial nodal rate
  // -2.07707 deg/day. The first-order theory leaves out J2 squared and J4 (Kozai's eqs. 27 and 28), worth some 0.07 % of
  // the node rate here and milliseconds of the period.
  const [a, e, i] = [7_714_432, 0.000098, 66.042 * DEG];
  const T = periodsOf(a, e, i);
  console.log(
    `  # Jason-3: nodal ${T.nodal.toFixed(4)} s (handbook 6,745.7605); anomalistic ${T.anomalistic.toFixed(3)}; Kepler ${T.kepler.toFixed(3)}`,
  );
  near(T.nodal, 6_745.7605, 0.01, 'nodal period, s');
  const node = (meanRates(a, e, i).node * 86_400) / DEG;
  console.log(`  # Jason-3: node ${node.toFixed(5)} deg/day (handbook -2.07707)`);
  near(node / -2.07707, 1, 0.001, 'node rate, of the handbook’s');
  // and the other way: the axis whose nodal period is the handbook's, to the metre (eq. 14's a-bar would be 2.2 km less)
  const back = meanOrbitOf({ perigee: 0, apogee: 2 * e * 7_714_432, inclination: i, period: 6_745.7605, radius: 7_714_432 });
  near(back.a, 7_714_432, 5, 'axis of the handbook’s nodal period, m');
  console.log(
    `  # Jason-3: axis of the nodal period ${(back.a / KM).toFixed(4)} km; Kozai’s a-bar of it ${(kozaiAxis(a, e, i) / KM).toFixed(4)} km`,
  );
});

test('a Sun-synchronous published orbit: Sentinel-3A’s node goes round with the Sun, its nodal period is its repeat’s', () => {
  // AVISO, "Sentinel-3 orbit": a 7,177.926540 km, e 0.001148, i 98.65 deg, nodal period 100.987 min, 385 revolutions in
  // 27 days. Sun-synchronous: the node turns 360 degrees in a tropical year (365.2422 days). The node to 1 %: the first
  // order leaves out J2 squared and J4 (Kozai's eq. 27, which takes it to 0.4 %; the rest is whose mean axis it is).
  const [a, e, i] = [7_177_926.54, 0.001148, 98.65 * DEG];
  const year = 360 / 365.2422;
  const node = (meanRates(a, e, i).node * 86_400) / DEG;
  const T = periodsOf(a, e, i).nodal;
  console.log(
    `  # Sentinel-3A: node ${node.toFixed(5)} deg/day (the Sun's ${year.toFixed(5)}); nodal period ${T.toFixed(3)} s (27 d / 385 = ${((27 * 86_400) / 385).toFixed(3)})`,
  );
  near(node / year, 1, 0.01, 'node rate, of the Sun’s');
  near(T / 60, 100.987, 0.001, 'nodal period, min');
  near(T, (27 * 86_400) / 385, 0.05, 'nodal period against the repeat, s');
});

test('from node to node the period is where the perigee stands: an eccentric orbit at 30 degrees, flown round', () => {
  // the perigee moves 0.5 degree a revolution here: passing the node near perigee takes longer than near apogee, by seconds
  for (const argp of [0, 90, 180]) {
    const m = { a: 8_000 * KM, e: 0.15, i: 30 * DEG, node: 1, argp: argp * DEG, mean: 0.3 };
    const T = periodsOf(m.a, m.e, m.i, m.argp);
    const flown = nodalOf(northbound(stateOfMean(m), 0, 6.2 * T.nodal));
    const average = periodsOf(m.a, m.e, m.i).nodal;
    console.log(
      `  # e 0.15, i 30, perigee ${argp} deg from the node: flown ${flown.toFixed(3)} s, node to node ${T.nodal.toFixed(3)}, the average ${average.toFixed(3)}`,
    );
    near(flown, T.nodal, 0.15, `perigee at ${argp}: node to node, s`);
  }
});

test('Vostok 1’s and Vostok 2’s published orbits, flown round by orbit.ts’s J2: read as mean, they go round in their published periods', () => {
  for (const o of VOSTOK) {
    for (const kind of ['nodal', 'osculating']) {
      const got = [];
      for (const u of [0, 45, 70, 135]) {
        const { state } = fromPublished({ ...o, kind }, { node: 1, latitude: u * DEG, anomaly: 0 });
        got.push(nodalOf(northbound(state, 0, 6.2 * o.period)) - o.period);
      }
      console.log(
        `  # ${o.name}, read as ${kind}: from 0, 45, 70 and 135 deg past the node, the nodal period over six revolutions less the published ${(o.period / 60).toFixed(2)} min: ${got.map((x) => `${x.toFixed(3)} s`).join(', ')}`,
      );
      if (kind === 'nodal') for (const miss of got) near(miss, 0, 0.03, `${o.name}: nodal period, s`);
      else assert.ok(Math.max(...got.map(Math.abs)) > 7, `${o.name}: as osculating it is not the published period`);
    }
    const m = meanOrbitOf(o);
    console.log(
      `  # ${o.name}: mean axis ${(m.a / KM).toFixed(3)} km, e ${m.e.toFixed(5)}; the heights are then over ${(m.radius / KM).toFixed(3)} km (the record’s ${(o.radius / KM).toFixed(0)}); Kepler ${m.periods.kepler.toFixed(2)} s, anomalistic ${m.periods.anomalistic.toFixed(2)} s, nodal ${m.periods.nodal.toFixed(2)} s`,
    );
  }
});

test('along a flown orbit the mean elements stand still while the osculating ones go round, and drift at the theory’s rates', () => {
  const o = VOSTOK[1];
  const { state, mean } = fromPublished(o, { node: 1, latitude: 70 * DEG, anomaly: 0 });
  const rates = meanRates(mean.a, mean.e, mean.i);
  let s = state;
  const spread = { osc: [Infinity, -Infinity], mean: [Infinity, -Infinity], lambda: 0, node: 0, e: 0, i: 0 };
  for (let t = 0; t <= 2 * o.period; t += 60) {
    const m = meanOf(s);
    const a = elementsOf(s.r, s.v).a;
    spread.osc = [Math.min(spread.osc[0], a), Math.max(spread.osc[1], a)];
    spread.mean = [Math.min(spread.mean[0], m.a), Math.max(spread.mean[1], m.a)];
    spread.lambda = Math.max(spread.lambda, Math.abs(angle(m.mean + m.argp - mean.mean - mean.argp - (rates.mean + rates.argp) * t)));
    spread.node = Math.max(spread.node, Math.abs(angle(m.node - mean.node - rates.node * t)));
    spread.e = Math.max(spread.e, Math.abs(m.e - mean.e));
    spread.i = Math.max(spread.i, Math.abs(m.i - mean.i));
    s = coast(s, 60, 5);
  }
  const osc = spread.osc[1] - spread.osc[0];
  const kept = spread.mean[1] - spread.mean[0];
  console.log(
    `  # Vostok 2 over two revolutions: osculating a over ${(osc / KM).toFixed(2)} km, mean a over ${kept.toFixed(1)} m; mean M + w off its rate by ${(spread.lambda * mean.a).toFixed(1)} m along the track, the node by ${(spread.node * mean.a).toFixed(1)} m; e within ${spread.e.toExponential(1)}, i within ${(spread.i / DEG).toExponential(1)} deg`,
  );
  assert.ok(osc > 15 * KM, 'the osculating axis goes round by J2’s short-periodic term');
  assert.ok(kept < 30, 'the mean axis stands to J2 squared');
  // (Kozai's second-order secular terms, eqs. 27 and 28, are not in it: some 150 m a revolution here, 0.02 s)
  assert.ok(spread.lambda * mean.a < 400, 'M + w goes at n-bar + dw/dt, to J2 squared');
  assert.ok(spread.node * mean.a < 30, 'the node at dOmega/dt');
  assert.ok(spread.e < 2e-5 && spread.i < 2e-6, 'e and i stand');
});

test('the published orbit as each kind of period, and as the old osculating reading, exactly', () => {
  const o = VOSTOK[1];
  for (const kind of ['nodal', 'anomalistic', 'kepler'])
    near(meanOrbitOf({ ...o, kind }).periods[kind], o.period, 1e-6, `${kind} period, s`);
  // no period: the axis is the radius plus the mean height
  near(meanOrbitOf({ ...o, period: undefined }).a, o.radius + 213_500, 1e-9, 'axis without a period, over the radius given, m');
  // and with none given, over the convention's: the ellipsoid's radius under the apsis, the perigee at asin(sin i sin w)
  near(
    meanOrbitOf({ ...o, period: undefined, radius: undefined }, 1.4).a,
    CONVENTION.radius.value(o.inclination, 1.4) + 213_500,
    1e-9,
    'and over the default, m',
  );
  assert.throws(() => meanOrbitOf({ ...o, period: undefined, radius: undefined }), /needs the ball/, 'which needs where the perigee is');
  // the ellipsoid's radius: the equatorial at the equator, the polar at the pole, 6,361.1 km under Vostok’s perigee (63.05 degrees geocentric)
  near(ellipsoidRadius(0), 6_378_137, 1e-6, 'equatorial, m');
  near(ellipsoidRadius(Math.PI / 2), 6_356_752.314245, 1e-6, 'polar, m');
  near(apsisRadius(o.inclination, Math.PI / 2), ellipsoidRadius(o.inclination), 1e-6, 'a perigee at the orbit’s northernmost, m');
  near(apsisRadius(o.inclination, 0), 6_378_137, 1e-6, 'a perigee on the equator, m');
  // the osculating reading is what src/sim/orbital.ts `injectionState` and src/sim/staged.ts `published` give, to the bit
  const at = { node: 1.1, latitude: 1.2, anomaly: 0.3 };
  const a = o.radius + (o.perigee + o.apogee) / 2;
  const old = stateOf({ a, e: (o.apogee - o.perigee) / (2 * a), i: o.inclination, node: 1.1, argp: 1.2 - 0.3, nu: 0.3 });
  assert.deepEqual(fromPublished({ ...o, kind: 'osculating' }, at).state, old);
  const r = [3_000_000, 4_000_000, 4_500_000];
  const v = [-5_000, 1_000, 4_000];
  const speed = Math.sqrt(3.986004418e14 * (2 / length(r) - 1 / a));
  assert.deepEqual(alongPublished({ ...o, kind: 'osculating' }, r, v).state.v, scale(unit(v), speed));
});

test('a spacecraft left where an ascent leaves it is given the speed of the published period, and keeps it', () => {
  for (const o of VOSTOK) {
    // a place over 55 N going north-east, level and a little climbing, as a cutoff leaves it
    const r = scale([0.45, 0.32, 0.83], (WGS84_A + o.perigee) / Math.hypot(0.45, 0.32, 0.83));
    const east = unit(cross([0, 0, 1], r));
    const north = unit(cross(r, east));
    const v = scale(add(add(scale(east, 0.5), scale(north, 0.86)), scale(unit(r), 0.003)), 7_800);
    const { state, mean } = alongPublished(o, r, v);
    assert.deepEqual(state.r, r);
    near(dot(unit(state.v), unit(v)), 1, 1e-15, 'the direction kept');
    near(periodsOf(mean.a, mean.e, mean.i, mean.argp).nodal, o.period, 1e-6, `${o.name}: the mean orbit’s nodal period, node to node, s`);
    const flown = nodalOf(northbound(state, 0, 6.2 * o.period));
    console.log(
      `  # ${o.name}, along: ${length(state.v).toFixed(3)} m/s; flown round, nodal ${(flown - o.period).toFixed(3)} s from the published`,
    );
    near(flown, o.period, 0.03, `${o.name}: nodal period flown, s`);
  }
});

test('Vostok 2 against TASS’s equator crossings: a check, nothing adjusted to it', () => {
  // TASS: the second orbit ended at 11:48 Moscow time, the seventh began at 17:42 (vostok-2/mission.md, "The braking
  // burn"). The injection is the record's estimated one (vostok-2/orbital.ts `injection`: the type's cutoff at 677.08 s,
  // 27.5 degrees of arc downrange in the plane through Site 1 at liftoff, perigee there), worked as src/sim/orbital.ts
  // `injectionState` works it; the ascent flown puts it within a degree or two (the report in issue #8 gives that run's).
  const frame = frameOf({ launch: '1961-08-06T06:00:00Z' });
  const site = { latitude: SITE1.latitude.value, longitude: SITE1.longitude.value, height: SITE1.height.value };
  const pad = frame.toDate(frame.toInertial(geodeticToEcef(site), 0));
  const o = VOSTOK[1];
  const n = planeThrough(pad, o.inclination, true);
  const from = unit(pad);
  const arc = 27.5 * DEG;
  const there = add(scale(from, Math.cos(arc)), scale(cross(n, from), Math.sin(arc)));
  const node = Math.atan2(n[0], -n[1]);
  const toNode = [Math.cos(node), Math.sin(node), 0];
  const latitude = Math.atan2(dot(there, cross(n, toNode)), dot(there, toNode));
  const t0 = 677.08;
  const msk = (t) => 9 * 3600 + t; // seconds after midnight, Moscow time (liftoff 09:00:00)
  const clock = (s) => new Date(s * 1000).toISOString().slice(11, 19);
  for (const kind of ['osculating', 'nodal']) {
    const { state } = fromPublished({ ...o, kind }, { node, latitude, anomaly: 0 });
    const c = northbound(state, t0, t0 + 7 * o.period).map(msk);
    const at = (h, m) =>
      c.reduce((best, x) => (Math.abs(x - (h * 3600 + m * 60 + 30)) < Math.abs(best - (h * 3600 + m * 60 + 30)) ? x : best));
    const [first, second] = [at(11, 48), at(17, 42)];
    console.log(
      `  # Vostok 2 as ${kind}: crosses northbound at ${clock(first)} and ${clock(second)} (TASS 11:48 and 17:42): ${(first - (11 * 3600 + 48 * 60)).toFixed(0)} and ${(second - (17 * 3600 + 42 * 60)).toFixed(0)} s after the minute began`,
    );
    if (kind === 'nodal') {
      // TASS gives the minute: within two of it, both times, from an injection estimated to a degree or two (some 25 s each)
      assert.ok(Math.abs(first - (11 * 3600 + 48.5 * 60)) < 120 && Math.abs(second - (17 * 3600 + 42.5 * 60)) < 120, 'near TASS’s minutes');
      near((second - first) / 4, o.period, 0.1, 'four revolutions between them, at the published period, s');
    }
  }
});

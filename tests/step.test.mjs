// src/sim/core/rk4.ts: the one fixed-step integrator every simulator steps by, against Kepler's closed form and against the
// predictor's error-controlled pair (src/sim/predict.ts `propagate`).
//
// Tolerances, set from the method before it was run: a fourth-order method's error at a fixed time falls as the step to the
// fourth, so halving the step cuts it sixteen-fold (between 13 and 19 once the step is small enough to be in that regime);
// the predictor holds each step to a millimetre, so the two agree to a millimetre where the fixed step is small.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rk4, rk4Body } from '../src/sim/core/rk4.ts';
import { propagate } from '../src/sim/predict.ts';
import { spin } from '../src/sim/rigid.ts';
import { EARTH, WGS84_A } from '../src/world/bodies.ts';
import { LIFTOFF } from '../src/world/earthframe.ts';
import { cross, DEG, length, sub } from '../src/world/frames.ts';
import { elementsOf, gravity, meanAnomaly, period, stateOf, trueAnomaly } from '../src/world/orbit.ts';

const MU = EARTH.gm.value;
/** An ellipse 300 by 2,000 km over the equatorial radius, inclined 51.6 degrees, at perigee. */
const START = stateOf({ a: WGS84_A + 1_150_000, e: 1_700_000 / (2 * (WGS84_A + 1_150_000)), i: 51.6 * DEG, node: 0.3, argp: 1.1, nu: 0 });
const pointMass = (s) => gravity(s.r, 0);

/** Kepler's own place `t` seconds on from a state: the same ellipse, its mean anomaly advanced. */
function kepler(s, t) {
  const el = elementsOf(s.r, s.v);
  const n = (2 * Math.PI) / period(el.a);
  return stateOf({ ...el, nu: trueAnomaly(meanAnomaly(el.nu, el.e) + n * t, el.e) });
}

/** The fixed-step integrator carried `seconds` on in steps of `h`. */
function flown(s, seconds, h) {
  let x = s;
  const n = Math.round(seconds / h);
  for (let k = 0; k < n; k++) x = rk4(x, k * h, h, pointMass);
  return x;
}

test('halving the step cuts the fourth-order method’s error sixteen-fold', (t) => {
  const T = 3000;
  const want = kepler(START, T);
  const errors = [40, 20, 10, 5].map((h) => length(sub(flown(START, T, h).r, want.r)));
  t.diagnostic(`after ${T} s, steps of 40, 20, 10 and 5 s: ${errors.map((e) => `${e.toPrecision(3)} m`).join(', ')}`);
  for (let k = 1; k < errors.length; k++) {
    const ratio = errors[k - 1] / errors[k];
    assert.ok(ratio > 13 && ratio < 19, `from ${[40, 20, 10, 5][k - 1]} s to ${[40, 20, 10, 5][k]} s: ${ratio.toFixed(2)} times less`);
  }
  assert.ok(errors.at(-1) < 0.5, 'and at five seconds, under half a metre');
});

test('the fixed step and the predictor’s pair, the same forces, agree to a millimetre', (t) => {
  // gravity with J2 alone, nothing pushing: a coast flown by both. The flier schedules two instants, so the pair ends a step
  // exactly on each and hands the state it reached there to `arrive`: its own integrated state, not the path's cubic.
  const marks = [600, 3000];
  const reached = {};
  const quiet = {
    kind: 'coast',
    cutoff: null,
    quiet: Number.NEGATIVE_INFINITY,
    chute: false,
    ground: () => 0,
    burning: () => false,
    push: () => [0, 0, 0],
    next: (at) => marks.find((m) => m > at + 1e-9) ?? Infinity,
    below: () => Number.NEGATIVE_INFINITY,
    arrive: (at, r) => {
      reached[at] = r;
      return {};
    },
  };
  const start = { t: 0, r: START.r, v: START.v };
  const job = propagate(quiet, start, { site: { latitude: 0, longitude: 0, height: 0 }, seaLevel: 0, frame: LIFTOFF }, { limit: 4000 });
  job.run();
  const apart = (T) => {
    let x = START;
    for (let k = 0; k < T; k++) x = rk4(x, k, 1, (s) => gravity(s.r));
    return length(sub(x.r, reached[T]));
  };
  const [coast, round] = marks.map(apart);
  t.diagnostic(`after ${marks[0]} s: ${(coast * 1000).toFixed(3)} mm apart; after ${marks[1]} s: ${(round * 1000).toFixed(3)} mm`);
  assert.ok(coast < 1e-3 && round < 1e-3, `${coast} and ${round} m apart`);
});

test('a rigid body’s step: a body turning freely keeps its angular momentum, and its mass follows its rate', () => {
  const inertia = [2, 3, 5];
  const rate = (d) => {
    const L = d.w.map((w, k) => inertia[k] * w);
    const wxL = cross(d.w, L);
    return { r: d.v, v: [0, 0, 0], q: spin(d.q, d.w), w: wxL.map((x, k) => -x / inertia[k]), mass: -2 };
  };
  let d = { r: [0, 0, 0], v: [1, 0, 0], q: [1, 0, 0, 0], w: [0.3, 1.1, -0.2], mass: 100 };
  const momentum = (b) => {
    const L = b.w.map((w, k) => inertia[k] * w);
    // body to frame
    const [qw, qx, qy, qz] = b.q;
    const rot = [
      [1 - 2 * (qy * qy + qz * qz), 2 * (qx * qy - qz * qw), 2 * (qx * qz + qy * qw)],
      [2 * (qx * qy + qz * qw), 1 - 2 * (qx * qx + qz * qz), 2 * (qy * qz - qx * qw)],
      [2 * (qx * qz - qy * qw), 2 * (qy * qz + qx * qw), 1 - 2 * (qx * qx + qy * qy)],
    ];
    return rot.map((row) => row[0] * L[0] + row[1] * L[1] + row[2] * L[2]);
  };
  const L0 = momentum(d);
  for (let k = 0; k < 1000; k++) d = rk4Body(d, k * 0.01, 0.01, rate);
  assert.ok(length(sub(momentum(d), L0)) < 1e-8 * length(L0), 'the angular momentum in the frame');
  assert.ok(Math.abs(d.mass - 80) < 1e-9, 'the mass, by its rate');
  assert.ok(Math.abs(d.r[0] - 10) < 1e-9, 'and the place, by its velocity');
  assert.ok(Math.abs(Math.hypot(...d.q) - 1) < 1e-15, 'the attitude a unit quaternion');
  // without a mass, none is made
  const noMass = rk4Body({ r: [0, 0, 0], v: [0, 0, 0], q: [1, 0, 0, 0], w: [0, 0, 0] }, 0, 1, (x) => ({
    r: x.v,
    v: [0, 0, 0],
    q: [0, 0, 0, 0],
    w: [0, 0, 0],
  }));
  assert.equal(noMass.mass, undefined);
  assert.ok(MU > 0);
});

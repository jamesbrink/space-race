// src/sim/predict.ts: looking ahead from a state. Held against Kepler's closed forms, against
// fly.ts's own `coast`, and against the flight the live simulator then flies.
//
// Tolerances, set from the physics before it was run:
//   - elements of a state built from an ellipse are that ellipse's, to rounding;
//   - a path in space is the same integration as `coast` at a coarser step: metres after an orbit;
//   - J2 moves an orbit's height by up to about 10 km against Kepler's and its period by seconds;
//     it also turns the orbit's plane about the pole (0.45 degrees a turn at 200 km and 32 degrees),
//     so "once round" ends that far from where it began;
//     heights above the sea are above the ellipsoid, which is 21 km lower at the poles than at the
//     equator, so an orbit's apogee and perigee over the sea are held to Kepler's within 25 km;
//   - a coast predicted from after cutoff leaves out separation's push (0.6 m/s of 2,300), the
//     retrorockets (which Freedom 7 fired at apogee, as a test: about 150 m/s, taking 30 km off the
//     range) and lift, so it is held to the flight flown hands off: 2 per cent in range and apogee.
//     (Hands off, the live spacecraft still saves itself coming down: the range is held, the time is not.)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { autopilot, flyLive } from '../src/sim/autopilot.ts';
import { coast } from '../src/sim/fly.ts';
import { AIR_TOP, elements, predict, predictor, programmeAxis } from '../src/sim/predict.ts';
import { vehicle } from '../src/sim/vehicle.ts';
import { EARTH, WGS84_A } from '../src/world/bodies.ts';
import { angleBetween, DEG, length, siteFrame, sub } from '../src/world/frames.ts';

const near = (got, want, tolerance, what) =>
  assert.ok(Math.abs(got - want) <= tolerance, `${what}: got ${got}, want ${want} within ${tolerance}`);
const SITE = siteFrame(flight.site);
const SEA = flight.site.seaLevel.value;
const TR = flight.trajectory;
const MU = EARTH.gm.value;
const V = vehicle(TR, SITE, SEA);

/** A state at the perigee of an orbit with these heights above the equatorial radius, inclined `i` degrees, over the equator. */
function atPerigee(perigee, apogee, i = 0) {
  const rp = WGS84_A + perigee;
  const ra = WGS84_A + apogee;
  const a = (rp + ra) / 2;
  const speed = Math.sqrt(MU * (2 / rp - 1 / a));
  return { r: [rp, 0, 0], v: [0, speed * Math.cos(i * DEG), speed * Math.sin(i * DEG)], a, rp, ra };
}
const state = (o, mass = 1300) => ({ t: 0, r: o.r, v: o.v, mass, phase: 'capsule' });

test('elements: a circular orbit at 200 km', () => {
  const o = atPerigee(200_000, 200_000, 32.5);
  const e = elements(o.r, o.v);
  near(e.e, 0, 1e-12, 'eccentricity');
  near(e.a, WGS84_A + 200_000, 1e-3, 'semi-major axis');
  near(e.period, 2 * Math.PI * Math.sqrt(o.a ** 3 / MU), 1e-6, 'period');
  near(e.period / 60, 88.49, 0.01, 'which is 88.5 minutes');
  near(e.apoapsisHeight, 200_000, 1e-2, 'apoapsis height');
  near(e.periapsisHeight, 200_000, 1e-2, 'periapsis height');
  near(e.inclination / DEG, 32.5, 1e-9, 'inclination');
});

test('elements: an eccentric orbit, from any point of it', () => {
  const o = atPerigee(250_000, 4_000_000, 51.6);
  const e0 = elements(o.r, o.v);
  near(e0.e, (o.ra - o.rp) / (o.ra + o.rp), 1e-12, 'eccentricity');
  near(e0.periapsisHeight, 250_000, 1e-2, 'periapsis height');
  near(e0.apoapsisHeight, 4_000_000, 1e-2, 'apoapsis height');
  near(e0.period, 2 * Math.PI * Math.sqrt(o.a ** 3 / MU), 1e-6, 'period');
  // carried a third of the way round under a point mass's gravity, they are the same elements
  const on = coast(o.r, o.v, e0.period / 3, 1, 0);
  const e1 = elements(on.r, on.v);
  near(e1.a, e0.a, 0.5, 'semi-major axis, later');
  near(e1.e, e0.e, 1e-7, 'eccentricity, later');
  near(e1.inclination, e0.inclination, 1e-9, 'inclination, later');
  // and a hyperbola is said to be one
  const away = elements(o.r, [0, 12_000, 0]);
  assert.ok(away.e > 1 && away.period === Infinity && away.apoapsis === Infinity, 'not an ellipse');
});

test('a circular 200 km state is predicted as a closed orbit, once round', () => {
  const o = atPerigee(200_000, 200_000, 32.5);
  const p = predict(TR, SITE, SEA, state(o));
  assert.equal(p.outcome, 'orbit');
  assert.equal(p.impact, null);
  assert.ok(p.orbit, 'it has elements');
  near(p.orbit.period, 2 * Math.PI * Math.sqrt(o.a ** 3 / MU), 1e-6, 'period');
  near(p.orbit.apoapsisHeight, 200_000, 1e-2, 'apoapsis height from the elements');
  near(p.orbit.periapsisHeight, 200_000, 1e-2, 'periapsis height from the elements');
  // the path ends a turn of 360 degrees on, a period later give or take what J2 does to it
  const last = p.points[p.points.length - 1];
  near(last.t, p.orbit.period, 20, 'once round takes a period');
  near(angleBetween(last.r, o.r) / DEG, 0, 0.6, 'and ends over where it began');
  for (const pt of p.points) near(pt.altitude, 200_000, 25_000, `height at ${pt.t.toFixed(0)} s`);
  // (2 to 4 ms on a quiet machine: bounds on the clock are for a busy one)
  assert.ok(p.cost < 500, `it took ${p.cost.toFixed(1)} ms`);
});

test("an eccentric orbit: apogee and perigee where Kepler has them, and the path is coast()'s", () => {
  const o = atPerigee(AIR_TOP + 50_000, 4_000_000, 51.6);
  const p = predict(TR, SITE, SEA, state(o));
  assert.equal(p.outcome, 'orbit');
  near(p.orbit.apoapsisHeight, 4_000_000, 1e-2, 'apoapsis height from the elements');
  near(p.orbit.periapsisHeight, AIR_TOP + 50_000, 1e-2, 'periapsis height from the elements');
  assert.ok(p.apogee && p.perigee, 'both ends are found on the path');
  near(p.apogee.altitude, 4_000_000, 25_000, 'apogee over the sea');
  near(p.apogee.t, p.orbit.period / 2, 30, 'apogee is half a period on');
  near(p.perigee.altitude, AIR_TOP + 50_000, 25_000, 'perigee over the sea');
  // the same integration as fly.ts's, at the predictor's coarser step: every tenth point against coast() at 1 s
  for (let i = 10; i < p.points.length; i += Math.ceil(p.points.length / 10)) {
    const pt = p.points[i];
    const want = coast(o.r, o.v, pt.t, 1);
    near(length(sub(pt.r, want.r)), 0, 60, `the path at ${pt.t.toFixed(0)} s against coast(), m`);
  }
});

test('a state short of orbit comes down: an impact, with its range from the pad', () => {
  // 200 km up over the pad, going east at 6 km/s: it is not staying up
  const pad = V.start();
  const up = pad.r.map((x) => x / length(pad.r));
  const r = pad.r.map((x, i) => x + up[i] * 200_000);
  const east = [-r[1] / Math.hypot(r[0], r[1]), r[0] / Math.hypot(r[0], r[1]), 0];
  const p = predict(TR, SITE, SEA, { t: 0, r, v: east.map((x) => x * 6000), mass: 1300, phase: 'capsule' });
  assert.equal(p.outcome, 'impact');
  assert.equal(p.orbit, null);
  assert.equal(p.apogee, null, 'it is already coming down');
  assert.ok(p.impact.range > 1_500_000 && p.impact.range < 4_000_000, `range ${p.impact.range}`);
  near(p.impact.altitude, 0, 1, 'it ends at the sea');
  // under its parachutes: a spacecraft alone lets them out by itself
  near(p.impact.speed, 9, 3, "at a parachute's speed");
});

test('standing on the pad there is nothing to predict; with the engine to burn, the flight', () => {
  const s = V.sample(V.start());
  const start = { t: 0, r: s.centre, v: s.v, mass: s.mass, phase: s.phase };
  assert.equal(predict(TR, SITE, SEA, start).outcome, 'none');
  const guided = predict(TR, SITE, SEA, start, { burn: { axis: (t) => programmeAxis(V, t), until: TR.engine.cutoff.value } });
  assert.equal(guided.kind, 'guided');
  assert.equal(guided.outcome, 'impact');
  near(guided.apogee.altitude, 201_000, 6000, 'apogee of the plan');
  // a pilot's trim leans it: two degrees further downrange is a lower, longer flight
  const leaned = predict(TR, SITE, SEA, start, {
    burn: { axis: (t) => programmeAxis(V, t, { pitch: 2 * DEG, yaw: 0 }), until: TR.engine.cutoff.value },
  });
  assert.ok(
    leaned.apogee.altitude < guided.apogee.altitude - 3000 && leaned.impact.range > guided.impact.range + 10_000,
    'leaned downrange',
  );
});

test('Freedom 7: a coast predicted after cutoff is the coast then flown', () => {
  // the autopilot flies to cutoff by the record, then every later event is left out
  const sequenced = autopilot(V);
  const pilot = (s) => {
    const c = sequenced(s);
    return { ...c, tower: false, separate: false, retro: false, retropack: false };
  };
  const run = flyLive(V, pilot, 0.5);
  assert.ok(run.state.landing, 'it came down');
  const at = (t) => run.samples.find((s) => s.t >= t);
  const flownApogee = run.results.apogee;
  const flownRange = run.results.range;
  for (const t of [150, 250, 400]) {
    const s = at(t);
    const p = predict(TR, SITE, SEA, { t: s.t, r: s.centre, v: s.v, mass: s.mass, phase: s.phase });
    assert.equal(p.outcome, 'impact');
    near(
      p.impact.range / flownRange,
      1,
      0.02,
      `range predicted at T+${t}: ${(p.impact.range / 1000).toFixed(1)} km against ${(flownRange / 1000).toFixed(1)} flown`,
    );
    // (not its time: the spacecraft's own automatic functions pull it off the falling booster and bring it down under parachutes, minutes later)
    if (s.t < run.results.apogeeAt) {
      near(p.apogee.altitude / flownApogee, 1, 0.02, `apogee predicted at T+${t}`);
      near(p.apogee.t, run.results.apogeeAt, 3, `time of apogee predicted at T+${t}`);
    } else assert.equal(p.apogee, null, 'past apogee there is none ahead');
  }
});

test('Freedom 7 as the record flies it: the guided plan from the pad, and the coast from the spacecraft alone', () => {
  const run = flyLive(V, autopilot(V), 0.5);
  const s0 = run.samples[0];
  const plan = predict(
    TR,
    SITE,
    SEA,
    { t: 0, r: s0.centre, v: s0.v, mass: s0.mass, phase: s0.phase },
    {
      burn: { axis: (t) => programmeAxis(V, t), until: TR.engine.cutoff.value },
    },
  );
  near(plan.apogee.altitude / run.results.apogee, 1, 0.02, 'apogee planned from the pad against the one flown');
  near(plan.apogee.t, run.results.apogeeAt, 3, 'and when');
  // after retrofire and the pack's going, what is left is the spacecraft falling: the prediction is the landing
  const late = run.samples.find((s) => s.t >= 400);
  const p = predict(TR, SITE, SEA, { t: late.t, r: late.centre, v: late.v, mass: late.mass, phase: late.phase });
  near(
    p.impact.range / run.results.range,
    1,
    0.005,
    `range predicted at T+400: ${(p.impact.range / 1000).toFixed(1)} km against ${(run.results.range / 1000).toFixed(1)}`,
  );
  near(p.impact.t, run.results.duration, 10, 'time of landing predicted at T+400');
  near(p.impact.speed, run.results.landingSpeed, 1.5, 'and the speed at the sea');
});

test('it can be worked out in slices, to the same answer', (t) => {
  const run = flyLive(V, autopilot(V), 0.5, 210);
  const s = run.samples[run.samples.length - 1];
  const start = { t: s.t, r: s.centre, v: s.v, mass: s.mass, phase: s.phase };
  const whole = predict(TR, SITE, SEA, start);
  for (let warm = 0; warm < 3; warm++) predict(TR, SITE, SEA, start);
  const job = predictor(TR, SITE, SEA, start);
  assert.throws(() => job.result, /not finished/);
  let slices = 0;
  let longest = 0;
  for (let done = false; !done; slices++) {
    const began = performance.now();
    done = job.run(1);
    longest = Math.max(longest, performance.now() - began);
  }
  assert.ok(slices > 1, `it took ${slices} slices`);
  // (how long a slice takes is the clock's to say, not a test's on a shared machine: the browser's figure is `sr.path.cost`)
  t.diagnostic(`the longest slice took ${longest.toFixed(2)} ms`);
  assert.equal(job.result.steps, whole.steps);
  assert.deepEqual(job.result.impact, whole.impact);
  assert.deepEqual(job.result.points, whole.points);
  assert.ok(whole.points.length <= 480, `${whole.points.length} points`);
});

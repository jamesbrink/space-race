// src/world/earthframe.ts: the one frame a flight is flown in. Its turns there and back are the identity to rounding, it
// agrees with frames.ts and time.ts (the sidereal time it turns the Earth by is time.ts's), and the frame fixed at liftoff
// is the frame of date turned back about the pole by that sidereal time, so a flight flown in either is the same flight.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight as freedom7 } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { EARTH_ROTATION_RATE } from '../src/world/bodies.ts';
import { between, datedOf, earthFrame, frameOf, LIFTOFF } from '../src/world/earthframe.ts';
import { sunPosition } from '../src/world/ephemeris.ts';
import {
  cross,
  DEG,
  dot,
  ecefToGeodetic,
  ecefToInertial,
  ecefToInertialVelocity,
  enuAxes,
  geodeticToEcef,
  inertialToEcef,
  inertialToEcefVelocity,
  length,
  sub,
} from '../src/world/frames.ts';
import { greenwichSiderealTime, julianDate, terrestrialTime } from '../src/world/time.ts';

const near = (got, want, tolerance, what) =>
  assert.ok(Math.abs(got - want) <= tolerance, `${what}: got ${got}, want ${want} within ${tolerance}`);
const apart = (a, b) => length(sub(a, b));
const JD = julianDate(freedom7.launch);
const DATED = earthFrame(JD, true);
const FIXED = earthFrame(JD, false);
// a place 200 km over the Cape going east at orbital speed, and some instants of a flight
const R = geodeticToEcef({ latitude: 28.5, longitude: -80.6, height: 200_000 });
const V = [-2000, 7000, 1500];
const TIMES = [0, 0.05, 141.8, 900, 5400, 86_400];

test('the frame of date turns the Earth by the sidereal time; the frame fixed at liftoff, from nothing', () => {
  near(DATED.gast0, greenwichSiderealTime(JD), 0, 'of date: the sidereal time at liftoff');
  near(FIXED.gast0, 0, 0, 'fixed at liftoff: the Earth’s own axes then');
  for (const f of [DATED, FIXED]) {
    for (const t of TIMES) near(f.angle(t), f.gast0 + EARTH_ROTATION_RATE * t, 0, `the angle at ${t} s`);
    near(f.spin[2], EARTH_ROTATION_RATE, 0, 'turning at the sidereal rate');
    near(f.jdUT(86_400) - f.jdUT(0), 1, 1e-9, 'a day of seconds is a day');
    near(f.jdTT(0), terrestrialTime(JD), 0, 'TT at liftoff');
  }
  assert.throws(() => earthFrame(Number.NaN, true), /needs the instant/);
  assert.equal(LIFTOFF.gast0, 0);
  assert.throws(() => LIFTOFF.fromDate(V), /no date/, 'a frame with no date cannot place the Sun');
});

test('there and back is the identity, positions and velocities, at every instant', () => {
  for (const f of [DATED, FIXED, LIFTOFF])
    for (const t of TIMES) {
      near(apart(f.toInertial(f.toFixed(R, t), t), R), 0, 1e-8, `position at ${t} s`);
      const p = f.toFixed(R, t);
      const u = f.velocityToFixed(R, V, t);
      near(apart(f.velocityToInertial(p, u, t), V), 0, 1e-9, `velocity at ${t} s`);
      if (f !== LIFTOFF) near(apart(f.toDate(f.fromDate(V)), V), 0, 1e-9, 'into the frame of date and back');
    }
});

test('it is frames.ts’s turn, by its own angle: the same arithmetic, to the bit', () => {
  for (const f of [DATED, FIXED])
    for (const t of TIMES) {
      const g = f.angle(t);
      assert.deepEqual(f.toFixed(R, t), inertialToEcef(R, g));
      assert.deepEqual(f.toInertial(R, t), ecefToInertial(R, g));
      assert.deepEqual(f.velocityToFixed(R, V, t), inertialToEcefVelocity(R, V, g));
      assert.deepEqual(f.velocityToInertial(R, V, t), ecefToInertialVelocity(R, V, g));
      assert.deepEqual(f.place(R, t), ecefToGeodetic(inertialToEcef(R, g)));
      assert.deepEqual(
        f.upOver({ latitude: 28.5, longitude: -80.6 }, t),
        ecefToInertial(enuAxes({ latitude: 28.5, longitude: -80.6 }).up, g),
      );
      assert.deepEqual(f.overGround(R, V), sub(V, cross(f.spin, R)));
    }
});

test('the frame fixed at liftoff is the frame of date turned back about the pole by the sidereal time then', () => {
  const g = greenwichSiderealTime(JD);
  for (const t of TIMES) {
    // the same place on the Earth is the same point in each frame, turned by g
    const fixed = FIXED.toInertial(R, t);
    const dated = DATED.toInertial(R, t);
    near(apart(ecefToInertial(fixed, g), dated), 0, 1e-8, `at ${t} s`);
    near(apart(between(FIXED, DATED)(fixed), dated), 0, 1e-8, `between the two at ${t} s`);
    near(apart(between(DATED, FIXED)(dated), fixed), 0, 1e-8, `and back at ${t} s`);
    // and the Earth's own things are the same in both: the place under a point, up there
    const pf = FIXED.place(fixed, t);
    const pd = DATED.place(dated, t);
    near(pf.latitude, pd.latitude, 1e-12, 'latitude');
    near(pf.longitude, pd.longitude, 1e-12, 'longitude');
    near(pf.height, pd.height, 1e-8, 'height');
  }
  // what is of date (the Sun) is turned into the frame fixed at liftoff, and in the frame of date is as it is
  const sun = sunPosition(terrestrialTime(JD));
  assert.deepEqual(DATED.fromDate(sun), sun);
  near(apart(FIXED.fromDate(sun), inertialToEcef(sun, g)), 0, 0, 'into the frame fixed at liftoff');
  // the plumb line at the pad at liftoff, in each: the same direction, turned
  const pad = { latitude: freedom7.site.latitude.value, longitude: freedom7.site.longitude.value };
  near(dot(ecefToInertial(FIXED.upOver(pad, 0), g), DATED.upOver(pad, 0)), 1, 1e-15, 'up on the pad');
  near(DEG, Math.PI / 180, 0, '(degrees)');
});

test('a flight’s frame is made once from its liftoff; its frame of date likewise', () => {
  assert.equal(frameOf(freedom7), frameOf({ launch: freedom7.launch }));
  assert.equal(datedOf(freedom7), datedOf({ launch: freedom7.launch }));
  assert.equal(datedOf(freedom7).ofDate, true);
  near(datedOf(freedom7).gast0, greenwichSiderealTime(JD), 0, 'the frame of date’s angle');
  near(frameOf(freedom7).jd0, JD, 0, 'from the flight’s own liftoff');
});

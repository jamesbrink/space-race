// src/world/earthframe.ts: the one frame a flight is flown in. Its turns there and back are the identity to rounding, it
// agrees with frames.ts and time.ts (the sidereal time it turns the Earth by is time.ts's), and the frame fixed at liftoff
// is the frame of date turned back about the pole by that sidereal time, so a flight flown in either is the same flight.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight as freedom7 } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { EARTH_ROTATION_RATE } from '../src/world/bodies.ts';
import { between, earthFrame, frameOf, LIFTOFF, OF_DATE, sinceLiftoff } from '../src/world/earthframe.ts';
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
  j2000ToInertial,
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
  // what is in the ICRF (DE440's states) comes in by the frame of date at liftoff, whichever the frame, and stays put in it
  const star = [0.6, -0.48, 0.64];
  const atLiftoff = j2000ToInertial(star, terrestrialTime(JD));
  near(apart(DATED.fromIcrf(star), atLiftoff), 0, 1e-15, 'the ICRF in the frame of date at liftoff');
  near(apart(FIXED.fromIcrf(star), inertialToEcef(atLiftoff, g)), 0, 1e-15, 'and in the frame fixed at liftoff');
  assert.throws(() => LIFTOFF.fromIcrf(star), /no date/, 'a frame with no date has no ICRF either');
});

test('a frame turns to the ICRF and back, and two flights’ frames differ by the precession between their liftoffs', () => {
  for (const frame of [DATED, FIXED]) {
    near(apart(frame.fromIcrf(frame.toIcrf(R)), R), 0, 1e-8, 'there and back, m');
    near(apart(frame.toIcrf(frame.fromIcrf(V)), V), 0, 1e-11, 'back and there, m/s');
    near(length(frame.toIcrf(R)), length(R), 1e-8, 'a turn keeps a length');
  }
  // the frame of date is the ICRF turned by frames.ts's bias, precession and nutation of the liftoff's date
  near(apart(DATED.toIcrf(j2000ToInertial(R, terrestrialTime(JD))), R), 0, 1e-8, 'the turn to date, undone');
  // Freedom 7's frame and one of a liftoff 120 days on: the general precession is 50.3 arcseconds a year, 16.5 in 120
  // days, and the nutation's change in that time a second or two more or less
  const later = earthFrame(JD + 120, true);
  const moved = apart(later.fromIcrf(DATED.toIcrf([1, 0, 0])), [1, 0, 0]) / (DEG / 3600);
  assert.ok(moved > 12 && moved < 21, `the equinox ${moved.toFixed(2)} arcseconds on`);
  // and an instant on a flight's clock is exact to the millisecond it is recorded to
  near(sinceLiftoff(DATED, julianDate('1961-05-05T14:49:35.123Z')), 922.123, 0, 'Freedom 7, 14:34:13 to 14:49:35.123');
  near(sinceLiftoff(DATED, JD - 167_970.972 / 86_400), -167_970.972, 0, 'two days before it, to the millisecond');
});

test('a flight is flown in its frame of date, made once from its liftoff', () => {
  assert.equal(OF_DATE, true);
  assert.equal(frameOf(freedom7), frameOf({ launch: freedom7.launch }));
  assert.equal(frameOf(freedom7).ofDate, true);
  near(frameOf(freedom7).gast0, greenwichSiderealTime(JD), 0, 'the frame of date’s angle');
  near(frameOf(freedom7).jd0, JD, 0, 'from the flight’s own liftoff');
});

// Flown in either frame, a flight is the same flight: every sample within a millimetre once turned into the other, and
// every result within rounding of itself.
const { fly } = await import('../src/sim/fly.ts');
const { flyLive } = await import('../src/sim/autopilot.ts');
const { vehicle } = await import('../src/sim/vehicle.ts');
const { flyWhole, steer } = await import('../src/sim/staged.ts');
const { siteFrame } = await import('../src/world/frames.ts');
const { flight: vostok1 } = await import('../missions/ussr/vostok/flights/vostok-1/flight.ts');

/** Every sample of two runs of one flight, one in each frame (`fixed`, `dated`), a millimetre apart at most; the largest gap, m. */
const sameRun = (fixed, dated, turn, what) => {
  assert.equal(fixed.length, dated.length, `${what}: as many samples`);
  let most = 0;
  fixed.forEach((s, i) => {
    near(s.t, dated[i].t, 1e-6, `${what}: the same instants`);
    most = Math.max(most, apart(s.r, turn(dated[i].r)));
  });
  assert.ok(most < 1e-3, `${what}: ${most} m apart at most`);
  return most;
};
/**
 * Every figure of two runs' results within rounding of itself (and a NaN a NaN). (The true anomaly where the ascent cuts
 * off is that of an orbit all but round, so its rounding is in millionths of a degree: given as `loose`, degrees; and it
 * is an angle, the same a whole turn on: cut off level, it is as soon a hair under 360 as a hair over nothing.)
 */
const sameResults = (a, b, what, loose = {}) => {
  for (const [k, x] of Object.entries(a))
    if (typeof x !== 'number') continue;
    else if (k === 'anomaly' && Number.isFinite(x))
      near(((((b[k] - x + 180) % 360) + 360) % 360) - 180, 0, loose[k] ?? 1e-9, `${what}: ${k}: ${b[k]} against ${x}`);
    else if (Number.isFinite(x)) near(b[k], x, loose[k] ?? 1e-9 * Math.max(1, Math.abs(x)), `${what}: ${k}`);
    else assert.equal(String(b[k]), String(x), `${what}: ${k}`);
};

test('Freedom 7 flown whole and live in the frame fixed at liftoff and in the frame of date: the same flight', (t) => {
  const site = siteFrame(freedom7.site);
  const sea = freedom7.site.seaLevel.value;
  const turn = between(DATED, FIXED);
  const a = fly(freedom7.plan, site, sea, undefined, undefined, undefined, FIXED);
  const b = fly(freedom7.plan, site, sea, undefined, undefined, undefined, DATED);
  t.diagnostic(`whole: samples at most ${sameRun(a.samples, b.samples, turn, 'fly').toExponential(2)} m apart`);
  sameResults(a.results, b.results, 'fly');
  const la = flyLive(vehicle(freedom7.plan, site, sea, { frame: FIXED }));
  const lb = flyLive(vehicle(freedom7.plan, site, sea, { frame: DATED }));
  t.diagnostic(`live: samples at most ${sameRun(la.samples, lb.samples, turn, 'live').toExponential(2)} m apart`);
  sameResults(la.results, lb.results, 'live');
});

test('Vostok 1 flown whole in both frames: the law solved, the ascent, the coast and the descent, the same flight', (t) => {
  const site = siteFrame(vostok1.site);
  const sea = vostok1.site.seaLevel.value;
  const jd = julianDate(vostok1.launch);
  const [fixed, dated] = [earthFrame(jd, false), earthFrame(jd, true)];
  const plan = vostok1.plan;
  const xa = steer(plan, site, fixed, sea);
  const xb = steer(plan, site, dated, sea);
  near(xa.kick, xb.kick, 1e-12, 'the law solved the same: its pitch-over');
  near(xa.rate, xb.rate, 1e-15, 'and its tangent');
  const a = flyWhole(plan, site, fixed, sea, xb, 10);
  const b = flyWhole(plan, site, dated, sea, xb, 10);
  const turn = between(dated, fixed);
  const up = sameRun(a.ascent.samples, b.ascent.samples, turn, 'ascent');
  const round = sameRun(a.coast.samples, b.coast.samples, turn, 'coast');
  t.diagnostic(`ascent at most ${up.toExponential(2)} m apart, coast ${round.toExponential(2)} m`);
  sameResults(a.ascent.summary, b.ascent.summary, 'ascent', { anomaly: 1e-5 });
  // (the landing's miss across the track is a few hundred metres left of two places thousands of kilometres off: its
  // rounding is the places', a millimetre, not a part in a thousand million of itself)
  sameResults(a.coast.results, b.coast.results, 'coast', { crossTrack: 1e-3, alongTrack: 1e-3 });
  for (const id of Object.keys(b.down.landed)) sameResults(a.down.landed[id], b.down.landed[id], `${id} down`);
});

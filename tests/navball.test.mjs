// src/navball.ts `ballOf`: the ball's orientation and its markers, from a position, velocity and
// attitude in the simulator's frame. Held against the geometry they must come out as, on states
// built from the flight's own site and launch axes.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { ballOf, ballPoint } from '../src/navball.ts';
import { aboutAxis, fromAxes, multiply, turn } from '../src/sim/rigid.ts';
import { vehicle } from '../src/sim/vehicle.ts';
import { EARTH_ROTATION_RATE } from '../src/world/bodies.ts';
import { add, angleBetween, cross, DEG, dot, length, scale, siteFrame, sub, unit } from '../src/world/frames.ts';

const near = (got, want, tolerance, what) =>
  assert.ok(Math.abs(got - want) <= tolerance, `${what}: got ${got}, want ${want} within ${tolerance}`);
const SITE = siteFrame(flight.site);
const V = vehicle(flight.trajectory, SITE, flight.site.seaLevel.value);
const AZIMUTH = flight.trajectory.azimuth.value;
const { up, downrange, left } = V.launch;
const SPIN = [0, 0, EARTH_ROTATION_RATE];
const NOSE = [0, 0, 1];
/** The attitude with the nose tilted `tilt` degrees from the launch vertical down the azimuth, as the stack flies it. */
const tilted = (tilt) => {
  const [c, s] = [Math.cos(tilt * DEG), Math.sin(tilt * DEG)];
  const nose = add(scale(up, c), scale(downrange, s));
  const back = sub(scale(up, s), scale(downrange, c)); // body +Z: against the azimuth on the pad
  return fromAxes(nose, left, back);
};
const pad = V.start();

test('on the pad the nose is straight up: pitch 90, no roll, and the zenith on the nose', () => {
  const b = ballOf(pad.r, pad.v, pad.q, 0);
  near(b.pitch, 90, 0.01, 'pitch');
  near(b.roll, 0, 1e-9, 'roll');
  near(angleBetween(b.zenith, NOSE) / DEG, 0, 0.01, 'the zenith from the nose');
  // which way it will tip: pitching forward takes the nose down the azimuth, so that is the heading it reads
  near(b.heading, AZIMUTH, 0.01, 'heading, straight up');
  // and the launch azimuth is at the bottom of the ball: W, which tips the nose downrange, takes it there
  const ahead = ballPoint(b, AZIMUTH * DEG, 0);
  near(ahead[0], 0, 1e-3, 'the azimuth on the horizon, across');
  near(ahead[1], -1, 1e-3, 'the azimuth on the horizon, at the bottom of the ball');
});

test('tilted 45 degrees down the azimuth it reads that heading and pitch 45', () => {
  const b = ballOf(pad.r, pad.v, tilted(45), 0);
  near(b.heading, AZIMUTH, 0.01, 'heading');
  near(b.pitch, 45, 0.01, 'pitch');
  near(b.roll, 0, 0.01, 'roll');
  // the sky is above the nose on the ball and the horizon straight below it
  assert.ok(b.zenith[1] > 0.7 && Math.abs(b.zenith[0]) < 1e-6, `the zenith is up the ball: ${b.zenith}`);
  const horizon = ballPoint(b, AZIMUTH * DEG, 0);
  near(horizon[0], 0, 1e-6, 'the horizon ahead, across');
  near(Math.asin(-horizon[1]) / DEG, 45, 0.01, 'the horizon ahead, degrees below the nose');
});

test('the ball is a rotation: north, east and up are at right angles, and ballPoint puts each where it is', () => {
  const b = ballOf(pad.r, pad.v, multiply(aboutAxis(unit([0.3, -0.5, 0.8]), 1.1), tilted(30)), 120);
  for (const [a, c, what] of [
    [b.north, b.east, 'north.east'],
    [b.north, b.zenith, 'north.up'],
    [b.east, b.zenith, 'east.up'],
  ])
    near(dot(a, c), 0, 1e-12, what);
  for (const a of [b.north, b.east, b.zenith]) near(length(a), 1, 1e-12, 'a unit vector');
  // the ball is seen from inside (right, up, toward the nose), which is a mirror's handedness: north is to the left of east with the sky up
  near(angleBetween(cross(b.north, b.east), b.zenith), 0, 1e-9, 'seen from inside, north x east is up');
  near(angleBetween(ballPoint(b, 90 * DEG, 0), b.east), 0, 1e-12, 'bearing 090 is east');
  near(angleBetween(ballPoint(b, 0, 90 * DEG), b.zenith), 0, 1e-12, 'elevation 90 is the zenith');
  // the heading and pitch it reads are where the nose is on the ball
  near(angleBetween(ballPoint(b, b.heading * DEG, b.pitch * DEG), NOSE) / DEG, 0, 1e-6, 'the nose is at its own heading and pitch');
});

test('flying at no angle of attack, surface prograde sits on the nose', () => {
  const q = tilted(40);
  const nose = turn(q, [1, 0, 0]);
  // 900 m/s through the air along the nose, 30 km up the launch vertical
  const r = add(pad.r, scale(up, 30_000));
  const v = add(cross(SPIN, r), scale(nose, 900));
  const b = ballOf(r, v, q, 0);
  near(angleBetween(b.surface.prograde, NOSE) / DEG, 0, 1e-6, 'surface prograde from the nose');
  near(b.surface.speed, 900, 1e-6, 'surface speed');
  // the space-fixed marker is off it, toward the east, by the ground's own speed
  assert.ok(angleBetween(b.orbit.prograde, NOSE) / DEG > 5, 'orbit prograde is elsewhere');
});

test("at liftoff the two frames differ by the pad's eastward speed", () => {
  // just off the pad: 10 m/s straight up through the air
  const v = add(cross(SPIN, pad.r), scale(up, 10));
  const b = ballOf(pad.r, v, pad.q, 0);
  const ground = length(cross(SPIN, pad.r));
  near(ground, 408.6, 1, 'the pad goes east at about 409 m/s (frames.ts)');
  near(b.surface.speed, 10, 1e-9, 'surface speed');
  near(b.orbit.speed, Math.hypot(10, ground), 1e-6, 'orbit speed');
  near(angleBetween(b.surface.prograde, b.zenith) / DEG, 0, 1e-6, 'surface prograde is straight up');
  // orbit prograde is nearly due east, on the horizon
  near(angleBetween(b.orbit.prograde, b.east) / DEG, Math.atan2(10, ground) / DEG, 1e-6, 'orbit prograde is that far above due east');
  // the difference of the two velocities, on the ball, is east at the pad's speed
  const d = sub(scale(b.orbit.prograde, b.orbit.speed), scale(b.surface.prograde, b.surface.speed));
  near(length(d), ground, 1e-6, "the difference is the pad's speed");
  near(angleBetween(d, b.east) / DEG, 0, 1e-6, 'and it is eastward');
  // standing still on the pad there is no surface marker at all
  const still = ballOf(pad.r, pad.v, pad.q, 0);
  assert.equal(still.surface.prograde, null);
  assert.equal(still.surface.retrograde, null);
  assert.ok(still.orbit.prograde, 'but it is going east in space');
});

test('retrograde is opposite prograde; radial and normal are at right angles to it and to each other', () => {
  const q = tilted(70);
  const r = add(pad.r, scale(up, 150_000));
  const v = add(cross(SPIN, r), add(scale(downrange, 1800), scale(up, 600)));
  const b = ballOf(r, v, q, 200);
  for (const side of [b.surface, b.orbit]) near(angleBetween(side.prograde, side.retrograde) / DEG, 180, 1e-9, 'retrograde from prograde');
  const o = b.orbit;
  near(dot(o.prograde, o.radialOut), 0, 1e-12, 'radial is across the motion');
  near(dot(o.prograde, o.normal), 0, 1e-12, 'normal is across the motion');
  near(dot(o.radialOut, o.normal), 0, 1e-12, 'radial is across normal');
  near(angleBetween(o.radialOut, o.radialIn) / DEG, 180, 1e-9, 'radial in from radial out');
  near(angleBetween(o.normal, o.antinormal) / DEG, 180, 1e-9, 'antinormal from normal');
  assert.ok(dot(o.radialOut, b.zenith) > 0.9, 'radial out is mostly up');
  // an orbit going east of south from 28 north has its axis in the northern sky
  assert.ok(
    dot(scale(b.right, o.normal[0]), [0, 0, 1]) + dot(scale(b.up, o.normal[1]), [0, 0, 1]) + dot(scale(b.forward, o.normal[2]), [0, 0, 1]) >
      0,
    'normal is north',
  );
});

test('a roll turns the ball about the nose and nothing else', () => {
  const q = tilted(45);
  const r = add(pad.r, scale(up, 20_000));
  const v = add(cross(SPIN, r), add(scale(downrange, 500), scale(up, 450)));
  const flat = ballOf(r, v, q, 0);
  const angle = 30 * DEG;
  const rolled = ballOf(r, v, multiply(q, aboutAxis([1, 0, 0], angle)), 0); // right-handed about the nose: right side down
  near(rolled.heading, flat.heading, 1e-9, 'heading');
  near(rolled.pitch, flat.pitch, 1e-9, 'pitch');
  near(rolled.roll - flat.roll, 30, 1e-9, 'roll');
  // every direction keeps its distance from the nose and goes round it by the roll, the other way: the ball turns against the vehicle
  const [c, s] = [Math.cos(angle), Math.sin(angle)];
  for (const [a, b, what] of [
    [flat.zenith, rolled.zenith, 'the zenith'],
    [flat.north, rolled.north, 'north'],
    [flat.surface.prograde, rolled.surface.prograde, 'prograde'],
  ]) {
    near(b[2], a[2], 1e-12, `${what}: toward the nose`);
    near(b[0], a[0] * c - a[1] * s, 1e-12, `${what}: across`);
    near(b[1], a[0] * s + a[1] * c, 1e-12, `${what}: up`);
  }
});

test("guidance's target is where the programme points, and on the nose when it is being held", () => {
  const t = 60;
  const axis = V.programme(t);
  const tilt = angleBetween(axis, up) / DEG;
  const q = tilted(tilt);
  const b = ballOf(pad.r, pad.v, q, 0, axis);
  near(angleBetween(b.target, NOSE) / DEG, 0, 1e-6, 'the target from the nose');
  const off = ballOf(pad.r, pad.v, tilted(tilt - 5), 0, axis);
  near(angleBetween(off.target, NOSE) / DEG, 5, 1e-6, 'five degrees short of it');
  assert.ok(off.target[1] < 0 && Math.abs(off.target[0]) < 1e-9, 'and it is further downrange: toward the bottom of the ball');
  assert.equal(ballOf(pad.r, pad.v, q, 0).target, null);
});

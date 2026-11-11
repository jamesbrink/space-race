// src/viewer/ascent.ts: where the scene puts the flown vehicle. A flight flown by hand is placed by its own samples'
// attitude; flown by the autopilot it is the record's flight, so the two placements must agree, and neither may jump.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { flight } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { autopilot, flyLive } from '../src/sim/autopilot.ts';
import { vehicle } from '../src/sim/vehicle.ts';
import { Ascent } from '../src/viewer/ascent.ts';
import { siteFrame } from '../src/world/frames.ts';

const TR = flight.trajectory;
const PAD = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(0, 1, 0),
  flight.models.find((m) => m.id === flight.flies.model).rotationY ?? 0,
);
const live = () => {
  const v = vehicle(TR, siteFrame(flight.site), flight.site.seaLevel.value);
  const flown = flyLive(v, autopilot(v), 0.1);
  return {
    samples: flown.samples,
    duration: flown.results.duration,
    cutoff: TR.engine.cutoff.value,
    dropped: flight.flies.drops.map((d) => d.at),
    live: true,
  };
};
const at = (ascent, t) => {
  const p = new THREE.Vector3();
  const q = new THREE.Quaternion();
  assert.ok(ascent.place(t, PAD, p, q), `placed at ${t}`);
  return { p, q };
};

test('a flight flown live under the autopilot is placed where the record’s is, and turned as it is', () => {
  const record = Ascent.of(flight);
  const flown = Ascent.of(flight);
  flown.use(live());
  // just off the pad the model stands as it was built, where it was built
  const start = at(flown, 0.2);
  assert.ok(start.q.angleTo(PAD) < 0.002, 'upright as on the pad');
  assert.ok(start.p.distanceTo(at(record, 0.2).p) < 0.05, 'where the record has it');
  // going up: the same flight but for the lift the record's leaves out (tests/vehicle.test.mjs: 2 per cent in height and range)
  for (const t of [10, 40, 80, 120, 140]) {
    const a = at(record, t);
    const b = at(flown, t);
    const far = a.p.length();
    assert.ok(
      a.p.distanceTo(b.p) < Math.max(1, 0.02 * far),
      `position at ${t} s: ${a.p.distanceTo(b.p).toFixed(1)} m apart, ${far.toFixed(0)} m out`,
    );
    // (about the nose the record's placement has no roll of its own: compare where the nose points)
    const nose = (q) => new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    assert.ok(nose(a.q).angleTo(nose(b.q)) < THREE.MathUtils.degToRad(1), `attitude at ${t} s`);
  }
});

test('a live flight’s model never jumps: not at cutoff, the tower, separation, retrofire, the parachutes', () => {
  const run = live();
  const ascent = Ascent.of(flight);
  ascent.use(run);
  const speed = (t) => run.samples.findLast((s) => s.t <= t).speed;
  let before = at(ascent, 0.5);
  let worst = { turn: 0, at: 0 };
  for (let t = 0.5 + 1 / 60; t < run.duration; t += 1 / 60) {
    const now = at(ascent, t);
    const moved = now.p.distanceTo(before.p);
    // (the Earth's turning is in `speed`, space-fixed, so it bounds the motion in the site's frame with room to spare)
    assert.ok(moved <= (speed(t) * 1.5) / 60 + 1.0, `position at ${t.toFixed(2)} s moved ${moved.toFixed(2)} m in a frame`);
    const turned = now.q.angleTo(before.q);
    if (turned > worst.turn) worst = { turn: turned, at: t };
    before = now;
  }
  // the fastest it turns is the turnaround on the jets and the swing as a parachute fills: well under 3 degrees a frame
  assert.ok(
    worst.turn < THREE.MathUtils.degToRad(3),
    `turned ${THREE.MathUtils.radToDeg(worst.turn).toFixed(2)} degrees in a frame at ${worst.at.toFixed(2)} s`,
  );
});

test('after it lands, a live flight stays where it came down; the record’s goes back to its pad', () => {
  const run = live();
  const flown = Ascent.of(flight);
  flown.use(run);
  assert.ok(flown.flying(run.duration + 60));
  assert.ok(at(flown, run.duration + 60).p.distanceTo(at(flown, run.duration).p) < 1e-6);
  const record = Ascent.of(flight);
  assert.equal(record.flying(run.duration + 60), false);
});

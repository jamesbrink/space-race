// src/viewer/onfoot/going.ts: people walking off a site or onto it (types.ts Going), as a place on the ground at each
// instant of the clock. No pop at either end (AGENTS.md, "Nothing breaks the spell"), no corner in the distance gone (the
// gait's phase is that distance: walking.md), a bend walked round.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceAt, endOf, goneAt, lengthOf, PACE, QUICKEN, routeOf } from '../src/viewer/onfoot/going.ts';

const m = (value) => ({ value, confidence: 'estimated', source: 'a test' });
/** Off west along a road, round a right-angled bend, and on out of sight. */
const OFF = {
  kind: 'leaves',
  at: m(100),
  stagger: 1.5,
  way: [
    [-10, 0],
    [-40, 0],
    [-40, -60],
  ],
  confidence: 'estimated',
  source: 'a test',
};
const ON = { ...OFF, kind: 'comes' };
const FROM = [2, 3];
const FRAME = 1 / 60;

test('a figure that leaves stands where it was built until it sets off, then walks the way to its end and is out of sight', () => {
  const before = goneAt(OFF, FROM, 99.9);
  assert.deepEqual([before.x, before.z, before.heading, before.out, before.walked], [2, 3, null, false, 0], 'standing as built');
  assert.deepEqual([goneAt(OFF, FROM, 100).x, goneAt(OFF, FROM, 100).z], FROM, 'and still there the instant it sets off');
  const length = lengthOf(routeOf(OFF, FROM));
  const end = endOf(OFF, FROM);
  assert.ok(
    Math.abs(end - 100 - length / PACE - QUICKEN) < 1e-9,
    `the walk takes its length at its pace and a start and a stop: ${end - 100}`,
  );
  const mid = goneAt(OFF, FROM, 120);
  assert.ok(!mid.out && mid.heading !== null && Math.abs(mid.pace - PACE) < 1e-9, 'under way at its pace');
  const there = goneAt(OFF, FROM, end + 0.01);
  assert.deepEqual([there.x, there.z, there.out, there.heading], [-40, -60, true, null], 'at the way’s end, out of sight');
  // the next of its group a stagger later
  assert.ok(goneAt(OFF, FROM, 101, 1.5).walked === 0 && goneAt(OFF, FROM, 101).walked > 0);
});

test('no pop: from frame to frame it moves no further than its pace, speeds up and slows down gradually, and turns round a bend', () => {
  for (const going of [OFF, ON]) {
    let was = goneAt(going, FROM, 98);
    let most = 0;
    let turn = 0;
    for (let t = 98 + FRAME; t < endOf(going, FROM) + 2; t += FRAME) {
      const now = goneAt(going, FROM, t);
      const step = Math.hypot(now.x - was.x, now.z - was.z);
      assert.ok(step <= PACE * FRAME + 1e-9, `${going.kind} at ${t.toFixed(3)}: a step of ${step}`);
      assert.ok(Math.abs(now.pace - was.pace) <= (PACE / QUICKEN) * FRAME + 1e-9, `${going.kind} at ${t.toFixed(3)}: its pace jumps`);
      assert.ok(now.walked >= was.walked, 'never back');
      if (now.heading !== null && was.heading !== null) {
        const d = Math.abs(Math.atan2(Math.sin(now.heading - was.heading), Math.cos(now.heading - was.heading)));
        turn = Math.max(turn, d);
      }
      most = Math.max(most, step);
      was = now;
    }
    // round the bend at walking pace: a quarter turn over the stride either side, no faster than a walker turns at a
    // walk (walking.md: 7 radians a second, `FACE`)
    assert.ok(turn <= 7 * FRAME, `${going.kind}: turns at most ${((turn * 180) / Math.PI).toFixed(2)} degrees a frame`);
    assert.ok(most > 0.9 * PACE * FRAME, 'and it does walk');
  }
});

test('a figure that comes is out of sight until it sets off, comes in from the way’s far end and stops where it was built', () => {
  const before = goneAt(ON, FROM, 99);
  assert.ok(before.out && before.x === -40 && before.z === -60, 'out of sight, at the far end');
  const end = endOf(ON, FROM);
  const after = goneAt(ON, FROM, end + 5);
  assert.deepEqual([after.x, after.z, after.out, after.heading, after.pace], [2, 3, false, null, 0], 'standing where it was built');
  // walking toward its spot: the heading points from where it is along the way back
  const late = goneAt(ON, FROM, end - 2);
  const toward = Math.atan2(-(FROM[1] - late.z), FROM[0] - late.x);
  assert.ok(
    late.heading !== null && Math.abs(Math.atan2(Math.sin(late.heading - toward), Math.cos(late.heading - toward))) < 1e-6,
    'toward its spot',
  );
});

test('a group that walks to another place is never out of sight: each ends where it stood moved by `to`, and stands there', () => {
  const TO = { ...OFF, way: [[-10, 0]], to: [20, -5] };
  const route = routeOf(TO, FROM);
  assert.deepEqual(route[route.length - 1], [FROM[0] + 20, FROM[1] - 5], 'its own spot there');
  const end = endOf(TO, FROM);
  for (const t of [end, end + 1, end + 600]) {
    const there = goneAt(TO, FROM, t);
    assert.deepEqual([there.x, there.z, there.out, there.heading, there.pace], [22, -2, false, null, 0], `standing there at ${t}`);
  }
  const half = goneAt(TO, FROM, (100 + end) / 2);
  assert.ok(!half.out && half.heading !== null, 'walking on the way');
});

test('a walk too short to reach its pace is walked at what it can, and still arrives at rest', () => {
  const short = distanceAt(0, PACE, 0.1);
  for (let tau = 0; tau <= short.total + 0.1; tau += 0.01) {
    const { s, v } = distanceAt(tau, PACE, 0.1);
    assert.ok(s >= 0 && s <= 0.1 + 1e-12 && v <= PACE);
  }
  assert.deepEqual(distanceAt(short.total, PACE, 0.1), { s: 0.1, v: 0, total: short.total });
});

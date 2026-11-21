// The frame the clouds are worked out in (src/viewer/cloudframe.ts): the scene's own near the site, rolled after the
// eye over the Earth once it is far from it, so that no cloud is drawn out into streaks a quarter of the way round.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAP, CloudFrame, HARD, SOFT } from '../src/viewer/cloudframe.ts';
import { EARTH_SPHERE } from '../src/world/bodies.ts';

const R = EARTH_SPHERE;
const RAD = Math.PI / 180;
/** The way from the Earth's middle to a place `angle` round from the site (radians) on the bearing `az`, in the scene's axes. */
const way = (angle, az = 0.4) => [Math.sin(angle) * Math.cos(az), Math.cos(angle), Math.sin(angle) * Math.sin(az)];
const unit = (v) => {
  const l = Math.hypot(...v);
  return v.map((c) => c / l);
};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** Carry the eye from over the site to `angle` round from it, 200 km up, in steps of `step` radians. */
function flown(angle, step = 0.02 * RAD, az = 0.4, frame = new CloudFrame()) {
  for (let a = 0; a < angle; a += step) frame.follow(...way(a, az).map((c) => c * (R + 200_000)));
  frame.follow(...way(angle, az).map((c) => c * (R + 200_000)));
  return frame;
}
/**
 * How the clouds' plane lies over the ground round a place: 10 km along two ways square to one another on the ground
 * there, as lengths on the plane, and the cosine of the angle between them on it.
 */
function metric(plane, at) {
  const up = unit(at);
  const east = unit(cross(Math.abs(up[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], up));
  const north = cross(up, east);
  const step = 10_000 / R;
  const p0 = plane(...up);
  const d = [east, north].map((t) => {
    const p = plane(...unit(up.map((c, i) => c + step * t[i])));
    return [p[0] - p0[0], p[1] - p0[1]];
  });
  const l = d.map((v) => Math.hypot(...v));
  return { lengths: l.map((x) => x / 10_000), cos: (d[0][0] * d[1][0] + d[0][1] * d[1][1]) / (l[0] * l[1]) };
}

test('near the site the clouds’ frame is the scene’s, to the bit', () => {
  const frame = new CloudFrame();
  for (const angle of [0, 0.3 * CAP, 0.99 * CAP])
    for (const az of [0, 1, 2.5, 4.4]) {
      assert.equal(frame.follow(...way(angle, az).map((c) => c * (R + 150_000))), false);
      assert.deepEqual(frame.turn, [1, 0, 0, 0, 1, 0, 0, 0, 1]);
      assert.deepEqual(frame.roll, [0, 0]);
      assert.equal(frame.rolling, false);
    }
  // (and a point of the Earth is where it was on the plane: straight down onto the site's own)
  assert.deepEqual(frame.plane(0.6, 0.8, 0), [R * 0.6, 0]);
});

test('a quarter of the way round, the site’s own plane draws the ground out fifty times one way; the rolled plane does not', () => {
  const at = way(89 * RAD);
  // (what was drawn: a point of the Earth put straight down onto the site's plane. Apollo 8, 28 minutes up)
  const old = metric((x, _y, z) => [R * x, R * z], at);
  assert.ok(Math.max(...old.lengths) / Math.min(...old.lengths) > 50, `the site's plane: ${old.lengths}`);
  for (const angle of [10, 45, 89, 135, 179.5, 250, 359]) {
    const frame = flown(angle * RAD);
    const m = metric((x, y, z) => frame.plane(x, y, z), way(angle * RAD));
    for (const l of m.lengths)
      assert.ok(Math.abs(l - 1) < 0.004, `${angle} degrees round: 10 km of ground is ${(l * 10).toFixed(3)} km of the plane`);
    assert.ok(Math.abs(m.cos) < 0.002, `${angle} degrees round: square on the ground is square on the plane (${m.cos})`);
  }
});

test('as far round as can be seen from a low orbit, the plane is the ground to a few hundredths', () => {
  // (from 190 km the horizon is 14 degrees off)
  const frame = flown(120 * RAD);
  for (const off of [5, 10, 14]) {
    const m = metric((x, y, z) => frame.plane(x, y, z), way((120 + off) * RAD));
    assert.ok(Math.min(...m.lengths) > Math.cos((off + 3.5) * RAD) - 0.002, `${off} degrees from the eye: ${m.lengths}`);
    assert.ok(Math.max(...m.lengths) < 1.002);
  }
});

test('the ground under the eye keeps its place on the plane as the frame is rolled, and what is beside it slips by little', () => {
  const frame = flown(60 * RAD);
  const step = 0.07 * RAD; // (7.8 km: a low orbit's second)
  const under = way(60 * RAD + step);
  const beside = unit(way(60 * RAD + step).map((c, i) => c + 0.02 * way(60 * RAD, 0.4 + Math.PI / 2)[i])); // (127 km to one side)
  const before = [frame.plane(...under), frame.plane(...beside)];
  frame.follow(...under.map((c) => c * (R + 200_000)));
  const after = [frame.plane(...under), frame.plane(...beside)];
  assert.ok(Math.hypot(after[0][0] - before[0][0], after[0][1] - before[0][1]) < 1e-3, 'under the eye: where it was');
  const slip = Math.hypot(after[1][0] - before[1][0], after[1][1] - before[1][1]);
  // (by 1 - cos of how far round from the eye it is, of the eye's own step over the ground, and the frame's own lean)
  assert.ok(slip < 0.004 * step * R, `127 km beside it: ${slip.toFixed(2)} m of a ${(step * R).toFixed(0)} m step`);
});

test('however far it is flown the turn stays a turn and the roll stays where a float holds a metre', () => {
  const frame = new CloudFrame();
  // (two hundred orbits at 51.8 degrees over a turning Earth, a second of flight at a time at sixteen times life's pace)
  let most = 0;
  const tilt = 51.8 * RAD;
  for (let i = 0; i < 200 * 345; i++) {
    const a = (i / 345) * 2 * Math.PI,
      spin = -(i / 345) * (88 / 1436) * 2 * Math.PI;
    const p = [Math.cos(a), Math.sin(a) * Math.sin(tilt), Math.sin(a) * Math.cos(tilt)];
    const q = [p[0] * Math.cos(spin) - p[2] * Math.sin(spin), p[1], p[0] * Math.sin(spin) + p[2] * Math.cos(spin)];
    frame.follow(...q.map((c) => c * (R + 200_000)));
    most = Math.max(most, Math.abs(frame.roll[0]), Math.abs(frame.roll[1]));
  }
  assert.ok(most <= HARD + 300_000, `the roll reached ${most}`);
  const t = frame.turn;
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      const dot = t[i * 3] * t[j * 3] + t[i * 3 + 1] * t[j * 3 + 1] + t[i * 3 + 2] * t[j * 3 + 2];
      assert.ok(Math.abs(dot - (i === j ? 1 : 0)) < 1e-12, `rows ${i} and ${j}: ${dot}`);
    }
});

test('past its soft limit the roll is put back when nobody could tell, and only then', () => {
  const frame = new CloudFrame();
  const step = 0.05 * RAD;
  let a = 0;
  const go = (unseen) => frame.follow(...way(a, 0).map((c) => c * (R + 200_000)), unseen);
  while (Math.max(...frame.roll.map(Math.abs)) < SOFT + 100_000) {
    a += step;
    go(false);
  }
  const was = [...frame.roll];
  a += step;
  go(false);
  assert.ok(Math.hypot(frame.roll[0] - was[0], frame.roll[1] - was[1]) < 2 * step * R, 'seen: it goes on');
  a += step;
  go(true);
  assert.ok(
    Math.max(...frame.roll.map(Math.abs)) <= SOFT + 1 && Math.hypot(frame.roll[0] - was[0], frame.roll[1] - was[1]) > SOFT,
    'unseen: put back behind',
  );
});

test('a cut back to the site gives the scene’s frame again; flown back, the frame it came with', () => {
  const cut = flown(100 * RAD);
  assert.equal(cut.rolling, true);
  assert.equal(cut.follow(0, R + 50, 0), true);
  assert.deepEqual(cut.turn, [1, 0, 0, 0, 1, 0, 0, 0, 1]);
  assert.deepEqual(cut.roll, [0, 0]);
  assert.equal(cut.rolling, false);
  const back = flown(20 * RAD);
  for (let a = 20; a >= 0; a -= 0.05) back.follow(...way(a * RAD).map((c) => c * (R + 200_000)));
  assert.equal(back.rolling, true, 'no jump: nothing is put back under the eye');
});

test('opened far from the site, or cut to the far side, the frame’s pole is under the eye', () => {
  for (const angle of [40, 90, 179.9, 180]) {
    const frame = new CloudFrame();
    const at = way(angle * RAD, 1.1);
    assert.equal(frame.follow(...at.map((c) => c * (R + 300_000))), true);
    const [x, y, z] = frame.into(...at);
    assert.ok(y > 0.9999999 && Math.hypot(x, z) < 1e-6, `${angle} degrees: the eye is at (${x}, ${y}, ${z}) of its frame`);
    for (const c of [...frame.turn, ...frame.roll]) assert.ok(Number.isFinite(c));
  }
});

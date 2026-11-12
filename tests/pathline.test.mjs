// The predicted path's line as numbers (src/viewer/pathline.ts): it keeps off the vehicle, it comes in as
// lunar-lift's did, its ribbon is laid along the points, and a prediction made again of the same flight is
// eased from exactly where the line already is, so nothing moves when nothing has changed.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { autopilot, flyLive } from '../src/sim/autopilot.ts';
import { predict } from '../src/sim/predict.ts';
import { vehicle } from '../src/sim/vehicle.ts';
import { siteFrame } from '../src/world/frames.ts';
import { atInstants, clearOf, fadeIn, strip } from '../src/viewer/pathline.ts';

const near = (got, want, tolerance, what) =>
  assert.ok(Math.abs(got - want) <= tolerance, `${what}: got ${got}, want ${want} within ${tolerance}`);

test("nothing within the gap, all of it from three gaps, and lunar-lift's stops on the way", () => {
  for (const gap of [0.5, 19, 2000]) {
    for (const d of [0, 0.1 * gap, 0.5 * gap, gap]) assert.equal(fadeIn(d, gap), 0, `at ${d / gap} gaps`);
    for (const d of [3 * gap, 10 * gap, 1e9]) assert.equal(fadeIn(d, gap), 1, `at ${d / gap} gaps`);
    // (lunar-lift: [1, 1.4, 2, 2.8, 4] gaps ahead, [0, 0.14, 0.42, 0.78, 1] of the line; here over three gaps, not four)
    const at = (stop) => gap * (1 + ((stop - 1) * 2) / 3);
    near(fadeIn(at(1.4), gap), 0.14, 0.04, 'at the first stop');
    near(fadeIn(at(2), gap), 0.42, 0.06, 'at the second');
    near(fadeIn(at(2.8), gap), 0.78, 0.06, 'at the third');
    let last = 0;
    for (let d = gap; d <= 3 * gap; d += gap / 50) {
      const a = fadeIn(d, gap);
      assert.ok(a >= last, 'it only comes in');
      last = a;
    }
  }
});

test('nothing within the outline on the screen, all of it a margin beyond', () => {
  assert.equal(clearOf(10, 40, 16), 0);
  assert.equal(clearOf(40, 40, 16), 0);
  assert.equal(clearOf(56, 40, 16), 1);
  assert.ok(clearOf(48, 40, 16) > 0 && clearOf(48, 40, 16) < 1);
  assert.equal(clearOf(0, 0, 16), 1, 'with no outline (from inside the vehicle), nothing is held off');
});

test('the ribbon: two vertices a point, offsets from the anchor, and the direction between neighbours', () => {
  const at = [1000, 0, 0, 1010, 0, 0, 1020, 10, 0, 1020, 20, 0];
  const position = new Float32Array(4 * 6);
  const along = new Float32Array(4 * 6);
  strip(at, 4, [1000, 0, 0], position, along);
  assert.deepEqual([...position.slice(0, 6)], [0, 0, 0, 0, 0, 0]);
  assert.deepEqual([...position.slice(18, 24)], [20, 20, 0, 20, 20, 0]);
  for (let i = 0; i < 8; i++) near(Math.hypot(along[i * 3], along[i * 3 + 1], along[i * 3 + 2]), 1, 1e-6, `vertex ${i}'s direction`);
  // at a corner, the chord between its neighbours: half way round
  near(Math.atan2(along[7], along[6]), Math.atan2(10, 20), 1e-6, 'the second point looks from the first to the third');
});

test('eased from itself, a prediction made again does not move; from another, each instant from where it was', () => {
  const SITE = siteFrame(flight.site);
  const SEA = flight.site.seaLevel.value;
  const TR = flight.trajectory;
  const V = vehicle(TR, SITE, SEA);
  const run = flyLive(V, autopilot(V), 0.5, 230);
  const s = run.samples.find((x) => x.t >= 220);
  const start = { t: s.t, r: s.centre, v: s.v, mass: s.mass, phase: s.phase };
  const a = predict(TR, SITE, SEA, start);
  const b = predict(TR, SITE, SEA, start);
  const flat = (p) => ({
    t: Float64Array.from(p.points, (x) => x.t),
    at: Float64Array.from(p.points.flatMap((x) => x.r)),
    n: p.points.length,
  });
  const [A, B] = [flat(a), flat(b)];
  const out = Float64Array.from(B.at);
  assert.equal(atInstants(A.t, A.at, A.n, B.t, B.n, out), B.n);
  assert.deepEqual([...out], [...B.at], 'the same flight: the same places, to the last bit');
  // a moment later: the instants they share are where the first had them, to a metre
  const later = run.samples.find((x) => x.t >= 220.5);
  const c = flat(predict(TR, SITE, SEA, { t: later.t, r: later.centre, v: later.v, mass: later.mass, phase: later.phase }));
  const from = Float64Array.from(c.at);
  const set = atInstants(A.t, A.at, A.n, c.t, c.n, from);
  assert.ok(set >= c.n - 1, `${set} of ${c.n} instants were on the line before`);
  let worst = 0;
  for (let i = 0; i < c.n; i++)
    worst = Math.max(worst, Math.hypot(from[i * 3] - c.at[i * 3], from[i * 3 + 1] - c.at[i * 3 + 1], from[i * 3 + 2] - c.at[i * 3 + 2]));
  assert.ok(worst < 50, `the line moves ${worst.toFixed(2)} m at most from one prediction to the next`);
});

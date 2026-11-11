import assert from 'node:assert/strict';
import { test } from 'node:test';
import { relax } from '../src/viewer/hose.ts';

/** A chain of `n` points laid straight from a to b, settled for `ticks`. */
function hang(a, b, length, { n = 16, ticks = 240, floor = null, keepOut = null, aOut = [0, -1, 0], bOut = [0, -1, 0] } = {}) {
  const points = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) points[i * 3 + k] = a[k] + ((b[k] - a[k]) * i) / (n - 1);
  const before = points.slice();
  const link = length / (n - 1);
  for (let t = 0; t < ticks; t++) relax(points, before, a, aOut, b, bOut, link, 1 / 60, floor, keepOut);
  const at = (i) => [points[i * 3], points[i * 3 + 1], points[i * 3 + 2]];
  const links = Array.from({ length: n - 1 }, (_, i) => Math.hypot(...at(i).map((v, k) => v - at(i + 1)[k])));
  return { points, before, at, links, link, n };
}

test('a hose hangs between its ends: they are where they are put, it sags below them, and it is as long as it is', () => {
  const h = hang([0, 1, 0], [0.5, 1, 0], 1);
  assert.deepEqual(h.at(0), [0, 1, 0]);
  assert.deepEqual(
    h.at(h.n - 1).map((v) => +v.toFixed(6)),
    [0.5, 1, 0],
  );
  const lowest = Math.min(...Array.from({ length: h.n }, (_, i) => h.at(i)[1]));
  assert.ok(lowest < 0.7 && lowest > 0.45, `it hangs to ${lowest}`);
  const total = h.links.reduce((x, y) => x + y, 0);
  assert.ok(Math.abs(total - 1) < 0.03, `its links add up to ${total}`);
  for (const l of h.links) assert.ok(Math.abs(l - h.link) < h.link * 0.25, `a link of ${l} against ${h.link}`);
});

test('it leaves each end the way its fitting points', () => {
  const h = hang([0, 1, 0], [0.5, 1, 0], 1, { aOut: [1, 0, 0], bOut: [0, 1, 0] });
  assert.ok(Math.abs(h.at(1)[0] - h.link) < 1e-6 && Math.abs(h.at(1)[1] - 1) < 1e-6, 'out along +x from the first');
  assert.ok(Math.abs(h.at(h.n - 2)[1] - (1 + h.link)) < 1e-6, 'and up from the last');
});

test('it lies on the ground where it reaches it, and goes round what it is kept out of', () => {
  const grounded = hang([0, 0.3, 0], [0.4, 0.3, 0], 1.2, { floor: 0 });
  for (let i = 0; i < grounded.n; i++) assert.ok(grounded.at(i)[1] >= -1e-6);
  assert.ok(Array.from({ length: grounded.n }, (_, i) => grounded.at(i)[1]).filter((y) => y < 0.01).length >= 3, 'some of it lies flat');
  // from one side of a post to the other: no point of it is inside the post
  const post = { x: 0, z: 0, radius: 0.2, bottom: 0, top: 2 };
  const round = hang([-0.3, 1, 0.02], [0.3, 1, 0], 1.2, { keepOut: post, aOut: [0, 0, 1], bOut: [0, 0, 1] });
  for (let i = 1; i < round.n - 1; i++)
    assert.ok(Math.hypot(round.at(i)[0], round.at(i)[2]) >= 0.2 - 1e-6 || round.at(i)[1] <= 0, `point ${i} is outside the post`);
});

test('pulled further than it is long it is straight and taut, and it comes to rest', () => {
  const taut = hang([0, 1, 0], [2, 1, 0], 1, { aOut: [1, 0, 0], bOut: [-1, 0, 0] });
  for (let i = 0; i < taut.n; i++) assert.ok(Math.abs(taut.at(i)[1] - 1) < 0.05, 'no sag in a taut hose');
  const still = hang([0, 1, 0], [0.5, 1, 0], 1, { ticks: 600 });
  const was = still.points.slice();
  relax(still.points, still.before, [0, 1, 0], [0, -1, 0], [0.5, 1, 0], [0, -1, 0], still.link, 1 / 60);
  for (let i = 0; i < was.length; i++) assert.ok(Math.abs(was[i] - still.points[i]) < 5e-4, 'settled: it no longer moves');
});

test('an end that moves takes the hose with it, a moment behind', () => {
  const h = hang([0, 1, 0], [0.5, 1, 0], 1);
  const mid = h.at(8)[0];
  relax(h.points, h.before, [0.3, 1, 0], [0, -1, 0], [0.8, 1, 0], [0, -1, 0], h.link, 1 / 60);
  const after = h.at(8)[0];
  assert.ok(after > mid && after < mid + 0.3, `the middle went ${after - mid} of the 0.3 its ends did`);
});

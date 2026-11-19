// Manoeuvres made on another craft (src/sim/pursuit.ts), on orbits made up here: the target flown on its own forces; a
// burn solved to put it at a stated place at a stated instant; the coelliptic burn; the braking held at a station. Each
// is held to what it is for, by flying on under gravity (world/orbit.ts `step`) and looking.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { coelliptic, flownFrom, placeFrom, reach, stationPush } from '../src/sim/pursuit.ts';
import { EARTH } from '../src/world/bodies.ts';
import { add, cross, dot, length, scale, sub, unit } from '../src/world/frames.ts';
import { step } from '../src/world/orbit.ts';

const GM = EARTH.gm.value;
const NONE = () => [0, 0, 0];
/** A state on a circular orbit of radius `r`, inclined 30 degrees, `angle` radians round from its node. */
function circular(r, angle = 0, climb = 0) {
  const n = [0, -Math.sin(Math.PI / 6), Math.cos(Math.PI / 6)];
  const x = [1, 0, 0];
  const y = cross(n, x);
  const up = add(scale(x, Math.cos(angle)), scale(y, Math.sin(angle)));
  const forward = cross(n, up);
  return { r: scale(up, r), v: add(scale(forward, Math.sqrt(GM / r)), scale(up, climb)) };
}
/** Gravity and a burn flown ahead: 1 s steps through the burn, 10 s after (the `Ahead` a run gives). */
const ahead = (s, from, to, burn) => {
  let x = s;
  let at = from;
  while (at < to - 1e-9) {
    const firing = burn && at < burn.until - 1e-9;
    const h = Math.min(firing ? 1 : 10, (firing ? burn.until : to) - at);
    x = step(x, at, h, firing ? () => scale(burn.line, burn.accel) : undefined);
    at += h;
  }
  return x;
};

test('a target is flown from where it began, and an instant asked for twice is the same state', () => {
  const start = { t: 100, ...circular(6_650_000) };
  const target = flownFrom(start, NONE, () => false);
  assert.equal(target.at(99), undefined, 'nothing before it began');
  assert.deepEqual(target.at(100), { r: start.r, v: start.v });
  const far = target.at(100 + 5400);
  // asked for in another order, and between its kept states
  const other = flownFrom(start, NONE, () => false);
  other.at(100 + 86_400);
  assert.deepEqual(other.at(100 + 5400), far);
  let s = { r: start.r, v: start.v };
  for (let k = 0; k < 540; k++) s = step(s, 0, 10);
  assert.ok(length(sub(far.r, s.r)) < 1e-6, 'its kept states are ten-second steps of gravity');
  const mid = target.at(100 + 5405);
  assert.ok(length(sub(mid.r, step(s, 0, 5).r)) < 1e-3, 'and between two it is within a millimetre of the orbit');
  // one that comes down is gone from then
  const falls = flownFrom(start, NONE, (_, at) => at > 1000);
  assert.ok(falls.at(1000));
  assert.equal(falls.at(1200), undefined);
});

test('where a point is from a craft: ahead along its orbit, above it, and across', () => {
  const craft = circular(6_650_000);
  const there = circular(6_660_000, 0.01);
  const p = placeFrom(craft, there.r);
  assert.ok(Math.abs(p.ahead - 0.01 * 6_660_000) < 1e-3, `ahead ${p.ahead}`);
  assert.ok(Math.abs(p.above - 10_000) < 1e-6, `above ${p.above}`);
  assert.ok(Math.abs(p.across) < 1e-6);
  const behind = placeFrom(craft, circular(6_650_000, -0.001).r);
  assert.ok(behind.ahead < 0 && Math.abs(behind.above) < 1e-6);
});

test('a burn solved to reach the target puts it where it was aimed, whatever the guess', () => {
  const target = flownFrom({ t: 0, ...circular(6_650_000, 0.02) }, NONE, () => false);
  const craft = circular(6_630_000);
  const want = { ahead: 5_000, above: 1_000 };
  const at = 2400;
  for (const guess of [[0, 0, 0], scale(unit(craft.v), 8), scale(unit(craft.r), -5)]) {
    const burn = reach(ahead, target, craft, 0, 0.5, want, at, guess);
    assert.ok(burn, 'a burn is found');
    const end = ahead(craft, 0, at, { line: burn.line, accel: 0.5, until: burn.length });
    const p = placeFrom(end, target.at(at).r);
    assert.ok(Math.abs(p.ahead - want.ahead) < 1 && Math.abs(p.above - want.above) < 1 && Math.abs(p.across) < 1, JSON.stringify(p));
    assert.ok(burn.length > 0 && burn.length < 200, `it burns ${burn.length} s`);
  }
  // nothing to aim at: no burn, and the caller flies the record's
  assert.equal(
    reach(
      ahead,
      flownFrom({ t: 5000, ...circular(6_650_000) }, NONE, () => false),
      craft,
      0,
      0.5,
      want,
      at,
      [0, 0, 0],
    ),
    null,
  );
});

test('the coelliptic burn leaves the height between the two the same all the way round', () => {
  // the target on an orbit with some eccentricity, the craft 15 km below and 150 km behind, climbing a little
  const t0 = circular(6_650_000, 0.03);
  const target = flownFrom({ t: 0, r: t0.r, v: scale(t0.v, 1.004) }, NONE, () => false);
  // (a quarter of an hour on: the target passed over the craft's place a few seconds ago, when it was already flying)
  const T0 = 900;
  const now = target.at(T0);
  const n = [0, -Math.sin(Math.PI / 6), Math.cos(Math.PI / 6)];
  const angle = Math.atan2(dot(now.r, cross(n, [1, 0, 0])), now.r[0]);
  const craft = circular(6_635_000, angle - 150_000 / 6_650_000, 3);
  const dv = coelliptic(target, craft, T0);
  assert.ok(dv && length(dv) < 60, `a burn of ${length(dv)} m/s`);
  const heights = (state) => {
    const out = [];
    let s = state;
    // (the height between them where the craft is: the target taken as it passes over the craft's place)
    for (let t = 0; t <= 5400; t += 300) {
      let over = target.at(T0 + t);
      let dt = 0;
      for (let k = 0; k < 4; k++) {
        dt -= placeFrom(s, over.r).ahead / length(over.r) / (length(cross(over.r, over.v)) / length(over.r) ** 2);
        over = target.at(T0 + t + dt);
      }
      out.push(length(over.r) - length(s.r));
      for (let k = 0; k < 30; k++) s = step(s, 0, 10);
    }
    return out;
  };
  const spread = (xs) => Math.max(...xs) - Math.min(...xs);
  const [before, after] = [heights(craft), heights({ r: craft.r, v: add(craft.v, dv) })];
  assert.ok(spread(before) > 5_000, `left alone the height between them wanders ${spread(before).toFixed(0)} m`);
  assert.ok(spread(after) < 600, `after the burn it stays within ${spread(after).toFixed(0)} m round a revolution`);
});

test('a braking commanded on the target comes to rest at its station by the instant given, within its thrust, and stays', () => {
  const target = flownFrom({ t: 0, ...circular(6_650_000, 0.001) }, NONE, () => false);
  const want = { ahead: 25, above: 0 };
  // two kilometres behind and a little below, closing at some 7 m/s
  let s = circular(6_649_300, 0.001 - 2000 / 6_650_000);
  s = { r: s.r, v: add(s.v, scale(unit(s.v), 6)) };
  const [by, cap] = [700, 0.06];
  let most = 0;
  let given = 0;
  const range = (state, t) => length(sub(target.at(t).r, state.r));
  for (let t = 0; t < 2000; t += 1) {
    const push = stationPush(target, s, t, want, by, cap);
    most = Math.max(most, length(push));
    given += length(push);
    s = step(s, t, 1, (q, at) => stationPush(target, q, at, want, by, cap));
    if (t + 1 >= by) assert.ok(Math.abs(range(s, t + 1) - 25) < 1.5, `at ${t + 1} s it is ${range(s, t + 1).toFixed(2)} m off`);
  }
  assert.ok(most <= cap + 1e-12, 'never more than the engine gives');
  const p = placeFrom(s, target.at(2000).r);
  assert.ok(
    Math.abs(p.ahead - 25) < 0.5 && Math.abs(p.above) < 0.5,
    `the target ${p.ahead.toFixed(2)} m ahead, ${p.above.toFixed(2)} above`,
  );
  assert.ok(length(sub(target.at(2000).v, s.v)) < 0.05, 'at rest by it');
  assert.ok(given > 6 && given < 14, `it took ${given.toFixed(1)} m/s to stop some 7`);
  // with no target there is nothing to command
  assert.deepEqual(
    stationPush(
      flownFrom({ t: 9999, ...circular(6_650_000) }, NONE, () => false),
      s,
      0,
      want,
      by,
      cap,
    ),
    [0, 0, 0],
  );
});

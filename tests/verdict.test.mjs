// src/sim/verdict.ts: how a flight flown by hand ended, in words, against the limits the flight's data gives.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { autopilot, flyLive, Tally } from '../src/sim/autopilot.ts';
import { vehicle } from '../src/sim/vehicle.ts';
import { verdict } from '../src/sim/verdict.ts';
import { siteFrame } from '../src/world/frames.ts';

const TR = flight.trajectory;
const v = vehicle(TR, siteFrame(flight.site), flight.site.seaLevel.value);
const record = autopilot(v);
/** Fly a whole flight under a pilot and say how it ended. */
function ended(pilot) {
  const tally = new Tally();
  let state = v.start();
  while (!state.landing && state.t < 3600) {
    const next = v.tick(state, pilot);
    if (next.ticks === state.ticks) break;
    state = next;
    tally.note(v.sample(state), state, v);
  }
  return verdict(state, tally.results, TR, tally.peakG);
}

test('the record’s flight is down under the main parachute, and survivable', () => {
  const end = ended(record);
  assert.match(end.how, /^Down under the main parachute at \d+\.\d m\/s$/);
  assert.deepEqual(end.why, []);
  assert.equal(end.survivable, true);
  assert.match(end.against, /estimated/, 'and it says how sure the limits are');
});

test('nothing commanded with the sequence off: it says what was not done, and that it was not survivable', () => {
  const end = ended((s) => ({ ...record(s), automatic: false }));
  assert.match(end.how, /^Hit the sea at \d+ m\/s$/);
  assert.ok(end.why.includes('No parachute was deployed.'));
  assert.ok(end.why.some((w) => /The landing was at .* the limit taken is 12\.0 m\/s/.test(w)));
  assert.equal(end.survivable, false);
});

test('an abort off the pad says so, and is survivable by the limits taken', () => {
  const end = ended((s) => ({ ...record(s), abort: true }));
  assert.match(end.why[0], /^Aborted on the escape rocket 0\.0 s after ignition\.$/);
  assert.match(end.why[1], /^It came down \d+ m from the pad, \d+ m at its highest\.$/);
  assert.ok(!end.why.some((w) => /retropack/.test(w)), 'the abort’s own sequence dropped the retropack');
  assert.equal(end.survivable, true);
});

test('an abort off the pad with the engine never lit does not speak of an ignition', () => {
  // as the flight deck does it: X twice before Space (cockpit.ts)
  const end = ended(() => ({ throttle: 0, pitch: 0, yaw: 0, roll: 0, abort: true }));
  assert.equal(end.why[0], 'Aborted off the pad on the escape rocket: the engine was never lit.');
  assert.match(end.how, /^Down under the main parachute/);
});

test('a flight with no limits given is not judged', () => {
  const tr = structuredClone(TR);
  delete tr.body.capsule.limits;
  const bare = vehicle(tr, siteFrame(flight.site), flight.site.seaLevel.value);
  const flown = flyLive(bare);
  assert.equal(verdict(flown.state, flown.results, tr, 11).survivable, null);
});

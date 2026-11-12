// src/sim/lever.ts: the flight deck's throttle lever, driven against a vehicle that throttles. Freedom 7's A-7 is
// fixed thrust, so its deck hides the lever; the fixture is its trajectory with an engine that has a range and two
// starts (not a real engine, and it says so). What is held: the lever's figure is the engine's throttle the tick
// after it is moved, through the same autopilot and `blend` the cockpit flies by.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { autopilot, blend } from '../src/sim/autopilot.ts';
import { G0 } from '../src/sim/fly.ts';
import { Lever, NOTCH } from '../src/sim/lever.ts';
import { TICK, vehicle } from '../src/sim/vehicle.ts';
import { siteFrame } from '../src/world/frames.ts';

const SITE = siteFrame(flight.site);
const SEA = flight.site.seaLevel.value;
const near = (got, want, tolerance, what) =>
  assert.ok(Math.abs(got - want) <= tolerance, `${what}: got ${got}, want ${want} within ${tolerance}`);

const tr = structuredClone(flight.trajectory);
tr.body.engine = { kind: 'liquid', throttle: [0.4, 1], starts: 2, confidence: 'estimated', source: 'a test fixture: not a real engine' };
const v = vehicle(tr, SITE, SEA);
const FLOW = tr.engine.thrust.value / (G0 * tr.engine.isp.value);

/** The cockpit's pilot, as cockpit.ts makes it: the autopilot that does not light the engine, the lever laid over it. */
function deck(lever, sequence = true) {
  const auto = autopilot(v, { launch: false, sequence });
  const cut = (s) => sequence && s.abortAt === null && s.t >= tr.engine.cutoff.value - 1e-9;
  return (s) => blend(auto(s), { throttle: lever.asks(cut(s)) });
}
function until(state, pilot, t) {
  while (state.t < t - TICK / 2 && !state.landing) {
    const next = v.tick(state, pilot);
    if (next.ticks === state.ticks) break;
    state = next;
  }
  return state;
}

test('the lever is only being set until the engine is asked to start', () => {
  const lever = new Lever(tr.body.engine.throttle);
  assert.equal(lever.at, 1, 'it starts at the engine’s most');
  lever.move(0.7);
  assert.equal(lever.asks(), undefined, 'nothing is asked');
  const s = v.tick(v.start(), deck(lever));
  assert.ok(!s.ignited, 'and nothing is lit');
});

test('lit, the engine runs at the lever, and follows it the tick after it moves', () => {
  const lever = new Lever(tr.body.engine.throttle);
  lever.move(0.7);
  lever.lit = true;
  const pilot = deck(lever);
  let s = until(v.start(), pilot, 5);
  assert.ok(s.ignited && !s.cutoff);
  assert.equal(s.throttle, 0.7, 'lit at seven tenths');
  near(v.sample(s).burning.find((m) => m.name === 'main').thrust / tr.engine.thrust.value, 0.7, 0.01, 'seven tenths of rated thrust');
  // a notch at a time, as the arrow keys move it
  const mass = s.mass;
  lever.notch(1);
  s = v.tick(s, pilot);
  near(s.throttle, 0.7 + NOTCH, 1e-12, 'a notch up');
  s = until(s, pilot, s.t + 1);
  near(mass - s.mass, FLOW * (0.7 + NOTCH) * 1.01, FLOW * TICK * 1.5, 'and it burns in proportion');
  lever.move(5);
  s = v.tick(s, pilot);
  assert.equal(s.throttle, 1, 'no further than its most');
  assert.equal(lever.at, 1);
});

test('under its least the engine is off; the lever up again starts it once more, and no more than it can be started', () => {
  const lever = new Lever(tr.body.engine.throttle);
  lever.lit = true;
  const pilot = deck(lever);
  let s = until(v.start(), pilot, 20);
  lever.move(0.2);
  s = v.tick(s, pilot);
  assert.ok(s.cutoff && s.throttle === 0, 'off under four tenths');
  s = until(s, pilot, 22);
  lever.move(0.5);
  s = v.tick(s, pilot);
  assert.ok(!s.cutoff && s.starts === 2 && s.throttle === 0.5, 'started again at the lever');
  lever.move(0);
  s = v.tick(s, pilot);
  assert.ok(s.cutoff, 'shut down');
  lever.move(1);
  s = until(s, pilot, s.t + 1);
  assert.ok(s.cutoff && s.starts === 2, 'two starts are all it has');
});

test('the sequencer’s cutoff is not undone by a lever left where it was; with the sequencer off the lever has it', () => {
  const at = tr.engine.cutoff.value;
  const lever = new Lever(tr.body.engine.throttle);
  lever.lit = true;
  let s = until(v.start(), deck(lever), at + 2);
  assert.ok(s.cutoff && s.starts === 1, 'cut off at the record’s time, and not lit again by the lever standing at full');
  near(v.sample(until(v.start(), deck(lever), at - 1)).burning.length, 1, 0, 'burning until then');
  const hand = new Lever(tr.body.engine.throttle);
  hand.lit = true;
  s = until(v.start(), deck(hand, false), at + 2);
  assert.ok(!s.cutoff, 'nobody cut it: it burns on');
});

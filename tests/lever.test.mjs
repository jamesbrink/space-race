// src/sim/lever.ts: the flight deck's throttle lever, driven against a vehicle that throttles. The fixture is Freedom 7's
// plan with an engine that has a documented range and two starts (not a real engine, and it says so); Freedom 7's own
// A-7 ran at one thrust, and has the game's range (`handRange`, estimated), which the last tests fly. What is held: the
// lever's figure is the engine's throttle the tick after it is moved, through the same autopilot and `blend` the cockpit
// flies by.
import assert from 'node:assert/strict';
import { natured } from './ballistic.mjs';
import { ballisticOf } from '../src/sim/fly.ts';
import { test } from 'node:test';
import { flight } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { autopilot, blend } from '../src/sim/autopilot.ts';
import { G0 } from '../src/world/bodies.ts';
import { HAND_LEAST, handRange, Lever, NOTCH } from '../src/sim/lever.ts';
import { TICK, vehicle } from '../src/sim/vehicle.ts';
import { siteFrame } from '../src/world/frames.ts';
import { skyOf } from '../src/sim/air.ts';

const SITE = siteFrame(flight.site);
const SEA = flight.site.seaLevel.value;
const near = (got, want, tolerance, what) =>
  assert.ok(Math.abs(got - want) <= tolerance, `${what}: got ${got}, want ${want} within ${tolerance}`);

const plan = natured(flight.plan, {
  kind: 'liquid',
  throttle: [0.4, 1],
  starts: 2,
  confidence: 'estimated',
  source: 'a test fixture: not a real engine',
});
const v = vehicle(plan, SITE, SEA);
const { engine, cutoff } = ballisticOf(plan);
const FLOW = engine.thrust.seaLevel.value / (G0 * engine.isp.seaLevel.value);

/** The cockpit's pilot, as cockpit.ts makes it: the autopilot that does not light the engine, the lever laid over it. */
function deck(lever, sequence = true) {
  const auto = autopilot(v, { launch: false, sequence });
  const cut = (s) => sequence && s.abortAt === null && s.t >= cutoff - 1e-9;
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
  const lever = new Lever(engine.throttle.range);
  assert.equal(lever.at, 1, 'it starts at the engine’s most');
  lever.move(0.7);
  assert.equal(lever.asks(), undefined, 'nothing is asked');
  const s = v.tick(v.start(), deck(lever));
  assert.ok(!s.ignited, 'and nothing is lit');
});

test('lit, the engine runs at the lever, and follows it the tick after it moves', () => {
  const lever = new Lever(engine.throttle.range);
  lever.move(0.7);
  lever.lit = true;
  const pilot = deck(lever);
  let s = until(v.start(), pilot, 5);
  assert.ok(s.ignited && !s.cutoff);
  assert.equal(s.throttle, 0.7, 'lit at seven tenths');
  // (seven tenths of the jet's vacuum thrust, less the air's push on the nozzle's exit, which no throttle takes off: sim/thrust.ts)
  const atPad = skyOf(plan).air(v.sample(s).altitude).pressure;
  near(
    v.sample(s).burning.find((m) => m.engine === v.engine).thrust,
    0.7 * engine.thrust.vacuum.value - engine.exitArea.value * atPad,
    1e-6,
    'seven tenths of the vacuum thrust, less the air on the exit',
  );
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
  const lever = new Lever(engine.throttle.range);
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
  const at = cutoff;
  const lever = new Lever(engine.throttle.range);
  lever.lit = true;
  let s = until(v.start(), deck(lever), at + 2);
  assert.ok(s.cutoff && s.starts === 1, 'cut off at the record’s time, and not lit again by the lever standing at full');
  near(v.sample(until(v.start(), deck(lever), at - 1)).burning.length, 1, 0, 'burning until then');
  const hand = new Lever(engine.throttle.range);
  hand.lit = true;
  s = until(v.start(), deck(hand, false), at + 2);
  assert.ok(!s.cutoff, 'nobody cut it: it burns on');
});

test('every liquid engine has a lever: its own range, or the game’s where it ran at one thrust; a solid has none', () => {
  assert.deepEqual([handRange(engine).least, handRange(engine).most, handRange(engine).real], [0.4, 1, true], 'the fixture’s own range');
  const own = handRange(ballisticOf(flight.plan).engine);
  assert.ok(own && !own.real && own.confidence === 'estimated', 'the A-7 ran at one thrust: the range is the game’s, and says so');
  assert.equal(own.least, HAND_LEAST);
  assert.match(own.source, /one thrust/);
  assert.ok(own.fixed, 'no setting of it on record');
  assert.equal(
    handRange({ kind: 'liquid', throttle: { curve: {} } }).fixed,
    false,
    'throttled by its programme: not fixed, the range still the game’s',
  );
  assert.equal(handRange({ kind: 'solid' }), null, 'a solid: no lever');
});

test('Freedom 7’s own engine follows the lever over the game’s range, and under it is cut and cannot start again', () => {
  const real = vehicle(flight.plan, SITE, SEA);
  const lever = new Lever(handRange(ballisticOf(flight.plan).engine));
  lever.lit = true;
  const auto = autopilot(real, { launch: false, sequence: true });
  const pilot = (s) => blend(auto(s), { throttle: lever.asks() });
  let s = real.start();
  while (s.t < 10) s = real.tick(s, pilot);
  assert.equal(s.throttle, 1, 'full: as flown');
  lever.move(0.7);
  s = real.tick(s, pilot);
  assert.equal(s.throttle, 0.7, 'seven tenths, which the real engine could not do');
  lever.move(HAND_LEAST - 0.05);
  s = real.tick(s, pilot);
  assert.ok(s.cutoff && s.throttle === 0, 'under the least: cut');
  lever.move(1);
  for (let i = 0; i < 10; i++) s = real.tick(s, pilot);
  assert.ok(s.cutoff && s.starts === 1, 'it starts once');
});

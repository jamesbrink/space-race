// An abort off the pad, against the aborts that were flown.
//
// The escape rocket's line of thrust passes to one side of the centre of mass (`body.escape.offset`), so the spacecraft
// is tipped over as it is pulled and comes down clear of the booster it left; the sequence after it is the capsule's own
// (`body.escape.sequence`). Nothing is fitted. The records are `body.escape.record` (flight.ts) and the Langley trial's
// (fixtures/pad-abort), each with a tolerance set before the simulator flew it; a figure outside its tolerance is written
// down in MISSES with why, and the test holds the run to that: an unrecorded miss fails, and so does a recorded one that
// has gone away or moved.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { autopilot, blend, Tally } from '../src/sim/autopilot.ts';
import { G0 } from '../src/sim/fly.ts';
import { TICK, vehicle } from '../src/sim/vehicle.ts';
import { verdict } from '../src/sim/verdict.ts';
import { siteFrame } from '../src/world/frames.ts';
import { ELEVATION, padAbort, RECORD } from './fixtures/pad-abort/trajectory.ts';

const SITE = siteFrame(flight.site);
const SEA = flight.site.seaLevel.value;
const PAD = SITE.height - SEA;
const TR = flight.trajectory;
const FT = 0.3048;
const LB = 0.45359237;
const near = (got, want, tolerance, what) =>
  assert.ok(Math.abs(got - want) <= tolerance, `${what}: got ${got}, want ${want} within ${tolerance}`);

/** An abort off the pad, the engine never lit, flown to the ground by the spacecraft's own sequence. */
function abort(tr, options = {}, hand = {}) {
  const v = vehicle(tr, SITE, SEA, options);
  const auto = autopilot(v, { launch: false });
  const tally = new Tally();
  let state = v.start();
  const phases = [];
  let speed = 0;
  let turned = 0;
  let turnedByTower = 0;
  while (!state.landing && state.t < 600) {
    const next = v.tick(state, (s) => blend(auto(s), { abort: true, ...hand }));
    if (next.ticks === state.ticks) break;
    turned += Math.hypot(next.w[1], next.w[2]) * TICK;
    if (!next.shed.tower) turnedByTower = turned;
    state = next;
    const sample = v.sample(state);
    tally.note(sample, state, v);
    speed = Math.max(speed, sample.groundSpeed);
    if (phases.at(-1) !== sample.phase) phases.push(sample.phase);
  }
  const got = {
    apogee: tally.results.apogee - PAD,
    range: tally.results.range,
    duration: state.landing?.t ?? Number.NaN,
    speed,
    landingSpeed: state.landing?.vertical ?? Number.NaN,
  };
  return { v, state, tally, phases, got, revolutions: turnedByTower / (2 * Math.PI) };
}

const SAME_SHAPE =
  'the air on the spacecraft with its tower on is Freedom 7’s estimates: one drag curve end on (TM X-491, at no angle of attack), a side’s drag area and a heat shield’s slope that are ours. ' +
  'It tumbles, as the trial did, and how much of the climb the air takes then is those estimates';
const UNKNOWN_BEACH =
  'what spacecraft No. 1 weighed that day and how far its launcher leaned are not in anything read: it is flown here as Freedom 7’s spacecraft (3,764 lb with its tower, the retropack dropped) off the 1959 trial’s 71 degrees. ' +
  'No. 1 was stripped of most of its systems (This New Ocean, p. 261), so it was lighter and went higher and stayed up longer';
// How these runs were come by, so that it is on record. The first run of the Langley trial left the tower's own side
// out of the air on the spacecraft-with-tower (only the spacecraft's side was pushed on): 2,160 ft up (+10.8 %), 2,587 ft
// out (+62 %), 78.6 s (+25 %), half a turn before the tower went. The tower's side (`body.sheds`' estimate for the tower
// flying alone, 1.2 sq m, unchanged) was then added to that configuration, as an omission put right, and that was done
// after the first run had been seen: 1,763 ft (-9.6 %), 1,918 ft (+20 %), 61.9 s (-1.9 %), two turns. Freedom 7's own
// abort went from 2,223 ft and 288 m from the pad to 1,850 ft and 231 m. No figure was chosen to bring a result in, but
// the reader should know the order things happened in.
/** Every figure outside its tolerance: by how much (a fraction of the record), give or take `slack`, and why. */
const MISSES = {
  'TM X-422': {
    speed: {
      by: -0.095,
      slack: 0.02,
      why:
        'it leaves 17 m/s slow. The motor is burned by one "typical" static firing’s curve (its impulse is the figure’s to 2 per cent), and the air’s drag while it burns is the end-on curve at no angle of attack: ' +
        'either the trial’s motor gave more than the typical one or the drag end on is less than taken. Not known which',
    },
    landingSpeed: {
      by: -0.051,
      slack: 0.01,
      why: 'just outside 5 per cent: the fixture comes down under Freedom 7’s 63 ft parachute, whose drag area is derived from 29 ft/s at 2,579 lb, and the model’s was a 64 ft one of another make',
    },
  },
  'Beach Abort, 9 May 1960': {
    apogee: { by: -0.386, slack: 0.03, why: UNKNOWN_BEACH },
    duration: { by: -0.376, slack: 0.03, why: `follows from the height. ${UNKNOWN_BEACH}` },
  },
  'off the pad, upright': {
    apogee: {
      by: -0.26,
      slack: 0.03,
      why: `the maker’s round figure is reached to 3 per cent with the thrust through the centre of mass (2,565 ft); set off it, the spacecraft tumbles and the air takes a quarter of the climb. ${SAME_SHAPE}`,
    },
  },
};

function hold(got, records, misses, t) {
  for (const c of records) {
    const off = got[c.of] - c.value;
    const line = `${c.test}: ${c.label} ${got[c.of].toFixed(1)} ${c.unit} against ${c.value.toFixed(1)} (${off >= 0 ? '+' : ''}${((off / c.value) * 100).toFixed(1)} %)`;
    const miss = misses[c.of];
    if (Math.abs(off) <= c.tolerance) {
      assert.ok(!miss, `${c.of} is now within its tolerance: take it off the list of misses. ${line}`);
      t.diagnostic(`ok    ${line}`);
      continue;
    }
    assert.ok(miss, `${c.of} misses and no reason is recorded. ${line}`);
    assert.ok(
      Math.abs(off / c.value - miss.by) <= miss.slack,
      `${c.of}: the miss has moved from the ${miss.by} recorded to ${(off / c.value).toFixed(3)}. ${line}`,
    );
    t.diagnostic(`MISS  ${line}: ${miss.why}`);
  }
}

const upright = abort(TR);

test('the Langley trial of 1959, flown from its own weights off its own launcher, against what it did', (t) => {
  const tr = padAbort();
  // the fixture is the report's: 3,109 lb at take-off, about station 77.8, 6,100 slug-ft2 in pitch
  const v = vehicle(tr, SITE, SEA, { elevation: ELEVATION });
  const off = v.tick(v.start(), { throttle: 0, pitch: 0, yaw: 0, roll: 0, abort: true });
  const props = v.mass({ ...off, mass: 3109 * LB, t: 0 });
  near(props.mass / LB, 3109, 1e-6, 'the weight that leaves');
  near(
    (props.centre + tr.body.capsule.centre.value - (tr.body.capsule.centre.value - 19.5 * 0.0254)) / 0.0254,
    77.8,
    0.01,
    'its centre of mass',
  );
  near(props.across / 1.3558179619, 6100, 5, 'its moment of inertia in pitch (the rod has a radius: 3 slug-ft2 more)');
  const run = abort(tr, { elevation: ELEVATION });
  hold(run.got, RECORD, MISSES['TM X-422'], t);
  // what the report says of how it went, not held to a figure: about one and a quarter turns in pitch by the time the tower went
  t.diagnostic(
    `turned ${run.revolutions.toFixed(2)} times before the tower went (the trial: about 1 1/4); tower off at ${run.state.towerAt.toFixed(1)} s, drogue ${run.state.drogueAt.toFixed(1)} s, main ${run.state.mainAt.toFixed(1)} s; greatest load ${run.tally.abort.peakG.toFixed(1)} g (the trial: about 22 g for 0.1 s)`,
  );
  assert.ok(run.revolutions > 0.25, 'it is turned over by the thrust set off its centre of mass, as the trial was');
});

test('Freedom 7’s own abort off the pad, against the Beach Abort and the maker’s figure', (t) => {
  const record = TR.body.escape.record;
  hold(
    upright.got,
    record.filter((c) => c.test === 'off the pad, upright'),
    MISSES['off the pad, upright'],
    t,
  );
  const beach = abort(TR, { elevation: ELEVATION });
  hold(
    beach.got,
    record.filter((c) => c.test === 'Beach Abort, 9 May 1960'),
    MISSES['Beach Abort, 9 May 1960'],
    t,
  );
  assert.equal(record.length, 4, 'every record is held to');
});

test('it comes down clear of the pad, by the thrust line alone', (t) => {
  const { got, state } = upright;
  assert.ok(state.landing, 'it came down');
  // the booster it left is 1.78 m across and the pad's own structures stand within 30 m of it
  assert.ok(got.range > 50, `it lands ${got.range.toFixed(0)} m from the pad`);
  // with the line through the centre of mass it comes straight back down
  const tr = structuredClone(TR);
  tr.body.escape.offset.value = 0;
  const straight = abort(tr);
  assert.ok(straight.got.range < 5, `and with no offset, ${straight.got.range.toFixed(1)} m from it: on its own booster`);
  assert.ok(straight.got.apogee > got.apogee, 'the turning costs it height');
  // which way: toward `escape.toward`, downrange as it stands
  const east = (state.landing.longitude - SITE.longitude) * Math.cos(SITE.latitude * (Math.PI / 180));
  const north = state.landing.latitude - SITE.latitude;
  const bearing = ((Math.atan2(east, north) * 180) / Math.PI + 360) % 360;
  near(bearing, TR.azimuth.value, 5, 'carried along the launch azimuth');
  t.diagnostic(
    `upright: ${(got.apogee / FT).toFixed(0)} ft up, ${got.range.toFixed(0)} m (${(got.range / FT).toFixed(0)} ft) from the pad on ${bearing.toFixed(0)} degrees, down at ${got.duration.toFixed(1)} s and ${got.landingSpeed.toFixed(2)} m/s; ` +
      `with no offset ${(straight.got.apogee / FT).toFixed(0)} ft and ${straight.got.range.toFixed(1)} m`,
  );
});

test('the sequence is the capsule’s own: retropack off as it leaves, tower at the top, drogue two seconds on, main two more', () => {
  const { state: s, phases, tally } = upright;
  const seq = TR.body.escape.sequence;
  assert.deepEqual(s.shed, { tower: true, booster: true, retropack: true });
  assert.deepEqual(
    s.released.map((r) => r.on),
    ['separation', 'retropack', 'tower'],
  );
  near(s.released[1].t, 0, TICK, 'the retropack goes as the spacecraft leaves');
  assert.ok(s.released[1].stands, 'onto the top of the booster it sat on, which stands: it stays there');
  assert.ok(s.towerAt >= 1.9, 'the tower is kept while its rocket burns');
  near(s.towerAt, tally.results.apogeeAt, 2 * TICK, 'and goes at the top of the climb');
  near(s.drogueAt - s.towerAt, seq.drogue.value, TICK, 'the drogue two seconds after the tower');
  near(s.mainAt - s.drogueAt, seq.main.value, TICK, 'the main two seconds after the drogue');
  assert.deepEqual(phases.slice(-3), ['drogue', 'main', 'landed'], phases.join(', '));
  assert.ok(!s.torn.drogue && !s.torn.main, 'neither parachute is let out in more air than it can take');
  // down at the record's landing speed, the pack having gone: 29 ft/s
  near(s.landing.vertical / (29 * FT), 1, 0.05, 'onto the surface at the main parachute’s speed');
  assert.ok(s.landing.lean < 5, 'hanging upright');
  // the rocket burns what it carries: the tower left lighter by it
  const tower = s.released[2];
  const stood = TR.body.parts.find((p) => p.sheds === 'tower').mass;
  near(stood - tower.mass, TR.body.escape.propellant.value, 0.5, 'the tower is lighter by the rocket’s propellant');
});

test('the rocket burns by its own curve, and the load is its thrust on what it pulls', () => {
  const { tally } = upright;
  const curve = TR.body.escape.curve.points;
  const peak = Math.max(...curve.map((p) => p[1]));
  const pulled = TR.retropack.mass.value + TR.body.parts.find((p) => p.sheds === 'tower').mass;
  // (set from the inputs: the curve's greatest thrust on the spacecraft and tower, the pack gone and a third of the propellant burned by then)
  near(tally.abort.peakG, peak / (pulled * G0), 0.6, 'the greatest load');
  assert.ok(tally.abort.peakG < TR.body.capsule.limits.load.value, 'under the load the pilot is taken to live through');
  // the figure's own legend: 56,795 lb-s between the points where the thrust is a tenth of its greatest
  let impulse = 0;
  for (let i = 1; i < curve.length; i++) {
    const [t0, f0] = curve[i - 1];
    const [t1, f1] = curve[i];
    const cut = 0.1 * peak;
    if (Math.min(f0, f1) >= cut) impulse += ((f0 + f1) / 2) * (t1 - t0);
    else if (Math.max(f0, f1) > cut) {
      // the part of the segment above a tenth
      const part = (Math.max(f0, f1) - cut) / Math.abs(f1 - f0);
      impulse += ((Math.max(f0, f1) + cut) / 2) * (t1 - t0) * part;
    }
  }
  near(impulse / (56_795 * 4.4482216), 1, 0.01, 'the curve as read encloses the impulse its figure states');
});

test('with the sequence off nothing follows the rocket: no tower let go, no parachute', () => {
  const { state: s } = abort(TR, {}, { automatic: false });
  assert.deepEqual(s.shed, { tower: false, booster: true, retropack: false });
  assert.equal(s.drogueAt, null);
  assert.equal(s.mainAt, null);
  assert.ok(s.landing.vertical > 30, `it hits at ${s.landing.vertical.toFixed(0)} m/s`);
});

test('the verdict says what happened: aborted off the pad, how high, how far from it, under what', () => {
  const { state, tally, got } = upright;
  const end = verdict(state, tally.results, TR, tally.peakG);
  assert.equal(end.why[0], 'Aborted off the pad on the escape rocket: the engine was never lit.');
  assert.equal(end.why[1], `It came down ${got.range.toFixed(0)} m from the pad, ${tally.results.apogee.toFixed(0)} m at its highest.`);
  assert.match(end.how, /^Down under the main parachute at \d+\.\d m\/s$/);
  assert.ok(!end.why.some((w) => /retropack/.test(w)), 'the retropack went with the abort');
  assert.equal(end.survivable, true);
});

test('an abort begun above the sequence’s ceiling has its parachutes at their heights', () => {
  const v = vehicle(TR, SITE, SEA);
  const auto = autopilot(v);
  let s = v.start();
  // 100 s up the record's flight is above 42,000 ft
  while (!s.landing && s.t < 3600) {
    const next = v.tick(s, (x) => blend(auto(x), { abort: x.t >= 100 ? true : undefined }));
    if (next.ticks === s.ticks) break;
    s = next;
  }
  assert.ok(s.abortHeight > TR.body.escape.sequence.ceiling.value, `begun at ${(s.abortHeight / FT).toFixed(0)} ft`);
  assert.ok(s.landing && s.drogueAt !== null && s.mainAt !== null);
  assert.ok(s.drogueAt - s.towerAt > 10, 'the drogue waits for its height');
  assert.ok(s.shed.retropack, 'the retropack went as it left');
});

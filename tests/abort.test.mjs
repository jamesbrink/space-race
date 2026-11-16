// An abort off the pad, against the aborts that were flown.
//
// The escape rocket's line of thrust passes to one side of the centre of mass (`body.escape.offset`), so the spacecraft
// is tipped over as it is pulled and comes down clear of the booster it left; the sequence after it is the capsule's own
// (`body.escape.sequence`). Nothing is fitted. The records are `body.escape.record` (flight.ts) and the Langley trial's
// (fixtures/pad-abort), each with a tolerance set before the simulator flew it; a figure outside its tolerance is written
// down in src/sim/misses.ts with why, and the test holds the run to that: an unrecorded miss fails, and so does a recorded one that
// has gone away or moved.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight as freedom7 } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { autopilot, blend, Tally } from '../src/sim/autopilot.ts';
import { G0 } from '../src/world/bodies.ts';
import { TICK, vehicle } from '../src/sim/vehicle.ts';
import { verdict } from '../src/sim/verdict.ts';
import { siteFrame } from '../src/world/frames.ts';
import { BALLISTIC } from './ballistic.mjs';
import { ELEVATION, padAbort, RECORD } from './fixtures/pad-abort/trajectory.ts';
import { holdChecks, missesOf } from './misses.mjs';

const FT = 0.3048;
const LB = 0.45359237;
const near = (got, want, tolerance, what) =>
  assert.ok(Math.abs(got - want) <= tolerance, `${what}: got ${got}, want ${want} within ${tolerance}`);
/** Where a flight stands: its site's frame, the sea there, and the pad's height above the sea. */
const placeOf = (flight) => {
  const site = siteFrame(flight.site);
  const sea = flight.site.seaLevel.value;
  return { site, sea, pad: site.height - sea };
};

/** An abort off the pad, the engine never lit, flown to the ground by the spacecraft's own sequence. */
function abort(flight, tr, options = {}, hand = {}) {
  const { site, sea, pad } = placeOf(flight);
  const v = vehicle(tr, site, sea, options);
  const auto = autopilot(v, { launch: false });
  const tally = new Tally();
  let state = v.start();
  const phases = [];
  let speed = 0;
  let turned = 0;
  let turnedByTower = 0;
  while (!state.landing && state.t < 600) {
    const next = v.tick(state, (s) => blend(auto(s), { events: ['abort'], ...hand }));
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
    apogee: tally.results.apogee - pad,
    range: tally.results.range,
    duration: state.landing?.t ?? Number.NaN,
    speed,
    landingSpeed: state.landing?.vertical ?? Number.NaN,
  };
  return { v, state, tally, phases, got, revolutions: turnedByTower / (2 * Math.PI) };
}

// How these runs were come by, so that it is on record. The first run of the Langley trial left the tower's own side
// out of the air on the spacecraft-with-tower (only the spacecraft's side was pushed on): 2,160 ft up (+10.8 %), 2,587 ft
// out (+62 %), 78.6 s (+25 %), half a turn before the tower went. The tower's side (`body.sheds`' estimate for the tower
// flying alone, 1.2 sq m, unchanged) was then added to that configuration, as an omission put right, and that was done
// after the first run had been seen: 1,763 ft (-9.6 %), 1,918 ft (+20 %), 61.9 s (-1.9 %), two turns. Freedom 7's own
// abort went from 2,223 ft and 288 m from the pad to 1,850 ft and 231 m. No figure was chosen to bring a result in, but
// the reader should know the order things happened in.
/** A run's figures held to the records of one test, by tests/misses.mjs's rule: the misses are src/sim/misses.ts's, `abort:<test>`. */
function hold(got, records, owner, t) {
  const test = records[0].test;
  holdChecks(
    records.map((c) => ({ ...c, id: c.of, label: `${c.test}: ${c.label}` })),
    (id) => got[id],
    missesOf(owner, `abort:${test}`),
    { name: test, log: (l) => t.diagnostic(l) },
  );
}

test('the Langley trial of 1959, flown from its own weights off its own launcher, against what it did', (t) => {
  const tr = padAbort();
  // the fixture is the report's: 3,109 lb at take-off, about station 77.8, 6,100 slug-ft2 in pitch
  const { site, sea } = placeOf(freedom7);
  const v = vehicle(tr, site, sea, { elevation: ELEVATION });
  const off = v.tick(v.start(), { throttle: 0, pitch: 0, yaw: 0, roll: 0, events: ['abort'] });
  const props = v.mass({ ...off, mass: 3109 * LB, t: 0 });
  near(props.mass / LB, 3109, 1e-6, 'the weight that leaves');
  near(
    (props.centre + tr.body.capsule.centre.value - (tr.body.capsule.centre.value - 19.5 * 0.0254)) / 0.0254,
    77.8,
    0.01,
    'its centre of mass',
  );
  near(props.across / 1.3558179619, 6100, 5, 'its moment of inertia in pitch (the rod has a radius: 3 slug-ft2 more)');
  const run = abort(freedom7, tr, { elevation: ELEVATION });
  hold(run.got, RECORD, 'fixtures/pad-abort', t);
  // what the report says of how it went, not held to a figure: about one and a quarter turns in pitch by the time the tower went
  t.diagnostic(
    `turned ${run.revolutions.toFixed(2)} times before the tower went (the trial: about 1 1/4); tower off at ${run.state.towerAt.toFixed(1)} s, drogue ${run.state.drogueAt.toFixed(1)} s, main ${run.state.mainAt.toFixed(1)} s; greatest load ${run.tally.abort.peakG.toFixed(1)} g (the trial: about 22 g for 0.1 s)`,
  );
  assert.ok(run.revolutions > 0.25, 'it is turned over by the thrust set off its centre of mass, as the trial was');
});

// Every ballistic flight with an escape system: the same rocket and the same sequence on its own spacecraft, from its own pad.
for (const flight of BALLISTIC.filter((f) => f.trajectory.body?.escape)) {
  const { site, sea } = placeOf(flight);
  const name = `${flight.designation} (${flight.callsign})`;
  // In still air: the records are the Beach Abort's (whose wind is not in anything read) and the maker's figure (which
  // has none); what the flight's own wind does to an abort off its pad is asked at the end of 'it comes down clear of the pad'.
  const TR = { ...flight.trajectory, winds: undefined };
  const upright = abort(flight, TR);

  test(`${name}: its own abort off the pad, against the Beach Abort and the maker’s figure`, (t) => {
    const record = TR.body.escape.record;
    hold(
      upright.got,
      record.filter((c) => c.test === 'off the pad, upright'),
      flight.id,
      t,
    );
    const beach = abort(flight, TR, { elevation: ELEVATION });
    hold(
      beach.got,
      record.filter((c) => c.test === 'Beach Abort, 9 May 1960'),
      flight.id,
      t,
    );
    assert.equal(record.length, 4, 'every record is held to');
  });

  test(`${name}: it comes down clear of the pad, by the thrust line alone`, (t) => {
    const { got, state } = upright;
    assert.ok(state.landing, 'it came down');
    // the booster it left is 1.78 m across and the pad's own structures stand within 30 m of it
    assert.ok(got.range > 50, `it lands ${got.range.toFixed(0)} m from the pad`);
    // with the line through the centre of mass it comes straight back down
    const tr = structuredClone(TR);
    tr.body.escape.offset.value = 0;
    const straight = abort(flight, tr);
    assert.ok(straight.got.range < 5, `and with no offset, ${straight.got.range.toFixed(1)} m from it: on its own booster`);
    assert.ok(straight.got.apogee > got.apogee, 'the turning costs it height');
    // which way: toward `escape.toward`, downrange as it stands
    const east = (state.landing.longitude - site.longitude) * Math.cos(site.latitude * (Math.PI / 180));
    const north = state.landing.latitude - site.latitude;
    const bearing = ((Math.atan2(east, north) * 180) / Math.PI + 360) % 360;
    near(bearing, TR.azimuth.value, 5, 'carried along the launch azimuth');
    t.diagnostic(
      `upright: ${(got.apogee / FT).toFixed(0)} ft up, ${got.range.toFixed(0)} m (${(got.range / FT).toFixed(0)} ft) from the pad on ${bearing.toFixed(0)} degrees, down at ${got.duration.toFixed(1)} s and ${got.landingSpeed.toFixed(2)} m/s; ` +
        `with no offset ${(straight.got.apogee / FT).toFixed(0)} ft and ${straight.got.range.toFixed(1)} m`,
    );
    // on the day, in the day's wind: the surface wind (12 knots from 070, Postlaunch Report, section 10.3 and Figure
    // 10.3-1) blows against the throw downrange, and the spacecraft under its parachute goes with it
    const day = abort(flight, flight.trajectory);
    assert.ok(
      day.state.landing && day.got.range > 50,
      `in the day's wind it still comes down clear of the pad: ${day.got.range.toFixed(0)} m`,
    );
    // (Freedom 7's surface wind, 12 knots from 070, is against the throw; another day's is its own, and is said)
    if (flight.id === freedom7.id) assert.ok(day.got.range < got.range, 'and nearer it, the wind being against the throw');
    t.diagnostic(
      `in the day's wind: ${(day.got.apogee / FT).toFixed(0)} ft up, ${day.got.range.toFixed(0)} m from the pad, down at ${day.got.duration.toFixed(1)} s`,
    );
  });

  test(`${name}: the sequence is the capsule’s own: retropack off as it leaves, tower at the top, drogue two seconds on, main two more`, () => {
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

  test(`${name}: the rocket burns by its own curve, and the load is its thrust on what it pulls`, () => {
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

  test(`${name}: with the sequence off nothing follows the rocket: no tower let go, no parachute`, () => {
    const { state: s } = abort(flight, TR, {}, { automatic: false });
    assert.deepEqual(s.shed, { tower: false, booster: true, retropack: false });
    assert.equal(s.drogueAt, null);
    assert.equal(s.mainAt, null);
    assert.ok(s.landing.vertical > 30, `it hits at ${s.landing.vertical.toFixed(0)} m/s`);
  });

  test(`${name}: the verdict says what happened: aborted off the pad, how high, how far from it, under what`, () => {
    const { state, tally, got } = upright;
    const end = verdict(state, tally.results, TR, tally.peakG);
    assert.equal(end.why[0], 'Aborted off the pad on the escape rocket: the engine was never lit.');
    assert.equal(end.why[1], `It came down ${got.range.toFixed(0)} m from the pad, ${tally.results.apogee.toFixed(0)} m at its highest.`);
    assert.match(end.how, /^Down under the main parachute at \d+\.\d m\/s$/);
    assert.ok(!end.why.some((w) => /retropack/.test(w)), 'the retropack went with the abort');
    assert.equal(end.survivable, true);
  });

  test(`${name}: an abort begun above the sequence’s ceiling has its parachutes at their heights`, () => {
    const v = vehicle(TR, site, sea);
    const auto = autopilot(v);
    let s = v.start();
    // 100 s up the record's flight is above 42,000 ft
    while (!s.landing && s.t < 3600) {
      const next = v.tick(s, (x) => blend(auto(x), { events: x.t >= 100 ? ['abort'] : undefined }));
      if (next.ticks === s.ticks) break;
      s = next;
    }
    assert.ok(s.abortHeight > TR.body.escape.sequence.ceiling.value, `begun at ${(s.abortHeight / FT).toFixed(0)} ft`);
    assert.ok(s.landing && s.drogueAt !== null && s.mainAt !== null);
    assert.ok(s.drogueAt - s.towerAt > 10, 'the drogue waits for its height');
    assert.ok(s.shed.retropack, 'the retropack went as it left');
  });
}

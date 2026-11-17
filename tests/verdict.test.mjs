// src/sim/verdict.ts: how a flight flown by hand ended, in words, against the limits the flight's data gives.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BALLISTIC, edited, R } from './ballistic.mjs';
import { autopilot, flyLive, Tally } from '../src/sim/autopilot.ts';
import { vehicle } from '../src/sim/vehicle.ts';
import { verdict } from '../src/sim/verdict.ts';
import { siteFrame } from '../src/world/frames.ts';

// every ballistic flight (tests/ballistic.mjs), each held as Freedom 7 was first
for (const flight of BALLISTIC) {
  const named = (what) => (flight.id === 'usa/mercury/mr-3-freedom-7' ? what : `${flight.callsign}: ${what}`);
  const PLAN = flight.plan;
  const v = vehicle(PLAN, siteFrame(flight.site), flight.site.seaLevel.value);
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
    return verdict(state, tally.results, PLAN, tally.peakG);
  }

  test(named('the record’s flight is down under the main parachute, and survivable'), () => {
    const end = ended(record);
    assert.match(end.how, /^Down under the main parachute at \d+\.\d m\/s$/);
    assert.deepEqual(end.why, []);
    assert.equal(end.survivable, true);
    assert.match(end.against, /estimated/, 'and it says how sure the limits are');
  });

  test(named('nothing commanded with the sequence off: it says what was not done, and that it was not survivable'), () => {
    const end = ended((s) => ({ ...record(s), automatic: false }));
    assert.match(end.how, /^Hit the sea at \d+ m\/s$/);
    assert.ok(end.why.includes('No parachute was deployed.'));
    assert.ok(end.why.some((w) => /The landing was at .* the limit taken is 12\.0 m\/s/.test(w)));
    assert.equal(end.survivable, false);
  });

  test(named('an abort off the pad says so, and is survivable by the limits taken'), () => {
    const end = ended((s) => ({ ...record(s), events: [R.abort.id] }));
    assert.match(end.why[0], /^Aborted on the escape rocket 0\.0 s after ignition\.$/);
    assert.match(end.why[1], /^It came down \d+ m from the pad, \d+ m at its highest\.$/);
    assert.ok(!end.why.some((w) => /retropack/.test(w)), 'the abort’s own sequence dropped the retropack');
    assert.equal(end.survivable, true);
  });

  test(named('an abort off the pad with the engine never lit does not speak of an ignition'), () => {
    // as the flight deck does it: X twice before Space (cockpit.ts)
    const end = ended(() => ({ throttle: 0, pitch: 0, yaw: 0, roll: 0, events: [R.abort.id] }));
    assert.equal(end.why[0], 'Aborted off the pad on the escape rocket: the engine was never lit.');
    assert.match(end.how, /^Down under the main parachute/);
  });

  test(named('a flight with no limits given is not judged'), () => {
    // (the crew's limits gone: from the plan's, and from the spacecraft's own)
    const plan = edited(PLAN, (_, c) => {
      c.limits = c.limits.filter((l) => l.of !== 'landing-speed' && l.of !== 'load');
      delete c.rigid.capsule.limits;
    });
    const bare = vehicle(plan, siteFrame(flight.site), flight.site.seaLevel.value);
    const flown = flyLive(bare);
    assert.equal(verdict(flown.state, flown.results, plan, 11).survivable, null);
  });
}

// what it came down in and on, from each flight's own data (plan.ts `Lands`), never a word of the verdict's own: the record
// flown of each flight that comes down at sea, and one on land, said in its own ship's name and nobody else's
{
  const { globSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { pathToFileURL } = await import('node:url');
  const { downVerdict, landsOf } = await import('../src/sim/verdict.ts');
  const { orbitalFlown } = await import('../src/sim/run.ts');
  const root = join(import.meta.dirname, '..');
  const flights = (
    await Promise.all(
      globSync('missions/*/*/flights/*/flight.ts', { cwd: root }).map(
        async (f) => (await import(pathToFileURL(join(root, f)).href)).flight,
      ),
    )
  ).filter((f) => f.plan);

  test('every flight that is flown says what its crew came down in, and on what', () => {
    for (const f of flights) {
      const lands = f.plan.craft[0].lands;
      assert.ok(lands, `${f.callsign}: no Craft.lands`);
      assert.ok(lands.on === 'land' || lands.on === 'sea', `${f.callsign}: ${lands.on}`);
      assert.match(lands.ship, /^the [a-z]/, `${f.callsign}: "${lands.ship}" as a sentence goes on`);
    }
  });

  const ships = new Set(flights.map((f) => f.plan.craft[0].lands?.ship).filter(Boolean));
  for (const id of ['usa/mercury/ma-6-friendship-7', 'usa/gemini/gt-3', 'ussr/vostok/vostok-1']) {
    const f = flights.find((x) => x.id === id);
    if (!f) continue;
    test(`${f.callsign}: the record flown is said to come down in its own ship's name and nobody else's`, () => {
      const whole = orbitalFlown(f);
      const v = downVerdict(
        f.plan,
        whole,
        (t) => `T+${t.toFixed(0)}`,
        () => 0,
      );
      const { ship } = landsOf(f.plan);
      const said = [v.how, ...v.why, v.against].join(' ').toLowerCase();
      assert.doesNotMatch(v.how, /Still in orbit/, 'it came down');
      assert.ok(said.includes(ship), `"${said}" names ${ship}`);
      for (const other of ships)
        if (!ship.includes(other) && !other.includes(ship)) assert.ok(!said.includes(other), `"${said}" names ${other}`);
      assert.doesNotMatch(said, /on the ground at|from the field|the ball\b/, 'no word of one flight’s own');
    });
  }
}

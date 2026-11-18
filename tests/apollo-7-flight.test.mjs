import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/apollo/flights/apollo-7/flight.ts';
import { afloatAt, floatOn } from '../src/sim/afloat.ts';
import { targetAt } from '../src/sim/orbital-target.ts';
import { between, recordOf } from '../src/sim/run.ts';
import { wavesOf } from '../src/sim/sea.ts';
import { length, sub } from '../src/world/frames.ts';

test('Apollo 7 flies to the Atlantic and rights itself by inflating three bags', () => {
  const run = recordOf(flight);
  assert.ok(run.afloat);
  const landing = run.afloat.from;
  assert.ok(Math.abs(landing - 936543) < 150, 'splashdown within 150 seconds of 260:09:03');
  const heel = (at) => (Math.acos(Math.cos(afloatAt(run.afloat, landing + at).heel)) * 180) / Math.PI;
  assert.ok(heel(535) > 130, 'still inverted when the crew starts the pumps');
  assert.ok(heel(777) < 45, 'apex-up by the end of the recorded recovery phase');
  const config = flight.flies.uprighting;
  const uninflated = floatOn(config.body, wavesOf(flight.weather.sea.trains), 0, 780, { initialHeel: Math.PI });
  assert.ok(Math.cos(afloatAt(uninflated, 777).heel) < 0, 'without inflation the capsule stays inverted');
});

test('the detached S-IVB and the CSM have distinct positions and preserve the observed rendezvous range', () => {
  const run = recordOf(flight),
    config = flight.flies.target;
  for (const fix of config.fixes) {
    const t = fix.at.value;
    const state = targetAt(flight, run, t);
    assert.ok(state);
    const range = length(sub(state.r, between(run.samples, t).r));
    assert.ok(Math.abs(range - Math.hypot(fix.ahead.value, fix.above.value)) < 0.1, `range at ${t}: ${range}`);
  }
  const first = flight.flies.drops.find((d) => d.on === config.drop);
  const center = between(run.samples, 30 * 3600);
  assert.ok(
    Math.abs(length(sub(targetAt(flight, run, 30 * 3600).r, center.r)) - 70 * 0.3048) < 0.2,
    'station-keeping holds between the two reported events',
  );
  const manual = Object.create(run);
  manual.dropped = [...run.dropped];
  const i = flight.flies.drops.indexOf(first);
  manual.dropped[i] = first.at + 10;
  const release = manual.dropped[i];
  assert.ok(
    length(sub(targetAt(flight, manual, release).v, between(run.samples, release).v)) > 0.5,
    'the freely coasting stage receives the separation impulse',
  );
  assert.equal(targetAt(flight, run, first.at - 1), undefined);
  assert.equal(targetAt(flight, run, config.until.value + 1), undefined);
});

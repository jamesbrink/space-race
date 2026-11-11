// A slider joined to the clock (src/world/sequence.ts), and Freedom 7's pad as the case in hand.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { localTime } from '../src/world/clock.ts';
import { faults, sliderAt, timeAt } from '../src/world/sequence.ts';
import { julianDate } from '../src/world/time.ts';

const near = (got, want, tolerance, what) =>
  assert.ok(Math.abs(got - want) <= tolerance, `${what}: got ${got}, want ${want} within ${tolerance}`);

const SEQ = [
  { at: -100, slider: 0 },
  { at: -60, slider: 0 }, // nothing moves for forty seconds
  { at: -20, slider: 0.5 },
  { at: 0, slider: 0.6 },
  { at: 50, slider: 1 },
];

test('the slider follows the clock between keyframes and holds outside them', () => {
  assert.equal(sliderAt(SEQ, -1e6), 0);
  assert.equal(sliderAt(SEQ, -100), 0);
  assert.equal(sliderAt(SEQ, -80), 0, 'standing still');
  assert.equal(sliderAt(SEQ, -40), 0.25);
  assert.equal(sliderAt(SEQ, -20), 0.5);
  near(sliderAt(SEQ, -10), 0.55, 1e-12, 'between');
  assert.equal(sliderAt(SEQ, 0), 0.6);
  assert.equal(sliderAt(SEQ, 25), 0.8);
  assert.equal(sliderAt(SEQ, 1e6), 1);
  assert.equal(sliderAt([], 5), 0);
});

test('and the clock can be found from the slider: where it stood still, the moment it came to rest', () => {
  assert.equal(timeAt(SEQ, 0), -100, 'the far left of the slider is the start');
  assert.equal(timeAt(SEQ, 0.25), -40);
  assert.equal(timeAt(SEQ, 0.6), 0);
  assert.equal(timeAt(SEQ, 1), 50);
  assert.equal(timeAt(SEQ, 2), 50);
  for (const v of [0.01, 0.1, 0.33, 0.5, 0.57, 0.6, 0.9, 1]) near(sliderAt(SEQ, timeAt(SEQ, v)), v, 1e-12, `there and back at ${v}`);
  assert.equal(
    timeAt(
      [
        { at: 0, slider: 0 },
        { at: 10, slider: 0.5 },
        { at: 30, slider: 0.5 },
        { at: 40, slider: 1 },
      ],
      0.5,
    ),
    10,
  );
});

test('a sequence out of order is caught', () => {
  assert.deepEqual(faults(SEQ), []);
  assert.equal(faults([{ at: 0, slider: 0 }]).length, 1);
  assert.equal(
    faults([
      { at: 0, slider: 0.5 },
      { at: -1, slider: 0.4 },
    ]).length,
    2,
  );
  assert.equal(
    faults([
      { at: 0, slider: 0 },
      { at: 1, slider: 1.2 },
    ]).length,
    1,
  );
});

test('Freedom 7’s pad: the morning on its slider is the morning on the clock', () => {
  const pad = flight.models.find((m) => m.id === 'pad');
  const seq = pad.sequence;
  assert.deepEqual(faults(seq), []);
  for (const k of seq) {
    assert.ok(['documented', 'derived', 'estimated'].includes(k.confidence), `${k.event}: confidence`);
    assert.ok(k.source.length > 8 && k.event.length > 3, `${k.event}: source`);
  }
  assert.equal(seq[0].slider, 0);
  assert.equal(seq.at(-1).slider, 1);
  const launch = julianDate(flight.launch);
  const est = (t) => localTime(launch + t / 86400, flight.site.zone.utcOffset).text;
  // the two instants the reports give by the wall clock
  assert.equal(est(timeAt(seq, 0)), '05:20:00', 'the slider starts as the pilot goes aboard');
  assert.equal(est(seq.find((k) => /gantry removed/i.test(k.event)).at), '06:37:00');
  // liftoff is the clock's zero, and the events of the last minute are where the count puts them
  assert.equal(seq.find((k) => /liftoff/i.test(k.event)).at, 0);
  assert.equal(seq.find((k) => /umbilical/i.test(k.event)).at, -35);
  assert.equal(seq.find((k) => /boom/i.test(k.event)).at, -14);
  // what the other sections ask of the pad are instants on this sequence
  for (const model of flight.models) {
    for (const w of model.with ?? []) {
      if (!('at' in w)) continue;
      assert.equal(w.model, 'pad');
      assert.ok(w.at >= seq[0].at && w.at <= seq.at(-1).at, `${model.id} asks for an instant on the pad's morning`);
    }
  }
  // studying the vehicle, the pad is as it was at liftoff: the structure away, both masts down
  const vehicle = flight.models.find((m) => m.id === 'vehicle');
  assert.equal(vehicle.with.find((w) => w.model === 'pad').at, 0);
  near(sliderAt(seq, 0), 0.8, 1e-9, 'liftoff on the slider');
});

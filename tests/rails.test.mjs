// src/sim/rails.ts: a coast flown on rails, for a clock faster than an hour a second. It must be the coast the fixed-step
// simulator flies (orbital.ts `flyOrbit`), end exactly on the instant asked for, come out the same flown in one span or in a
// fast clock's frames, and say when the clock may run on and where it must stop.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/ussr/vostok/flights/vostok-1/flight.ts';
import { airAt } from '../src/sim/air.ts';
import { coastOf, flyOrbit, shipPush, solarAt } from '../src/sim/orbital.ts';
import { apart, coast, coastBy, due, onRails, RAILS_FLOOR } from '../src/sim/rails.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { siteFrame } from '../src/world/frames.ts';

const frame = frameOf(flight);
const sea = flight.site.seaLevel.value;
const flown = flyOrbit(flight.plan, siteFrame(flight.site), frame, sea);
// (the coast as flown, before the braking attitude is taken: the spacecraft falling round under J2 and the air's drag)
const quiet = flown.samples.filter((s) => s.t < coastOf(flight.plan).on - 600);
const first = quiet[0];
const last = quiet.at(-1);
const drag = (t, r, v) => {
  const a = airAt(frame, r, v, t, sea);
  return shipPush(flight.plan, t, a.wind, a.altitude, null, solarAt(frame, r, t, a.altitude));
};

test('on rails the coast is the one the simulator flies: within 10 cm and a tenth of a millimetre a second over most of a revolution', () => {
  assert.ok(last.t - first.t > 3000, `${(last.t - first.t).toFixed(0)} s of coast`);
  const railed = coast(first, first.t, last.t, undefined, drag);
  const off = apart(railed, last);
  console.log(
    `# ${(last.t - first.t).toFixed(0)} s on rails in ${railed.steps} steps: ${off.r.toFixed(3)} m and ${(off.v * 1000).toFixed(3)} mm/s from the fixed-step run`,
  );
  assert.ok(off.r < 0.1 && off.v < 1e-4, `${off.r} m, ${off.v} m/s`);
  assert.ok(railed.steps < 200, `${railed.steps} steps`);
});

test('it ends exactly on the instant asked for, and flown in a fast clock’s frames it is the same coast', () => {
  const t1 = first.t + 1234.5;
  const one = coast(first, first.t, t1, undefined, drag);
  // (at 10,000 times a frame of a sixtieth of a second is 167 s; at 100,000, 1,667 s)
  for (const span of [167, 1667]) {
    const framed = coastBy(first, first.t, t1, span, undefined, drag);
    const off = apart(one, framed);
    assert.ok(off.r < 0.05 && off.v < 1e-4, `in frames of ${span} s: ${off.r} m, ${off.v} m/s`);
  }
  // and back again to where it began
  const back = coast(one, t1, first.t, undefined, drag);
  assert.ok(apart(back, first).r < 0.5, `there and back: ${apart(back, first).r} m`);
  // a span of nothing is no step
  assert.equal(coast(first, 10, 10).steps, 0);
});

test('the clock is held at the next instant to live, and let go only while there is nothing to do but fall round', () => {
  assert.equal(due([10, 50, Infinity, 30], 20), 30);
  assert.ok(Number.isNaN(due([10, Infinity], 20)), 'nothing to come: NaN');
  assert.ok(onRails({ altitude: 200_000, burning: [] }));
  assert.ok(!onRails({ altitude: 200_000, burning: [{ engine: 'x', thrust: 1 }] }), 'not while an engine burns');
  assert.ok(!onRails({ altitude: RAILS_FLOOR - 1, burning: [] }), 'not in the air');
  assert.ok(!onRails({ altitude: 200_000, burning: [] }, true), 'not with something asked for');
});

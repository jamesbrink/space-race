import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Demo, IDLE_FIRST, pace, programme, tour, workingHours } from '../src/demo.ts';
import { Clock } from '../src/world/clock.ts';

const flight = {
  designation: 'Test 1',
  callsign: 'Test',
  launch: '1961-05-05T14:34:13Z',
  models: [
    {
      id: 'vehicle',
      name: 'Vehicle',
      scale: '',
      slider: ['a', 'b'],
      cutaway: true,
      parts: [
        { node: 'Capsule', name: 'Capsule', summary: '' },
        { node: 'Couch', name: 'Couch', summary: '', inside: true },
      ],
    },
    {
      id: 'pad',
      name: 'Pad',
      scale: '',
      slider: ['a', 'b'],
      sequence: [
        { at: -15000, slider: 0 },
        { at: 0, slider: 0.8 },
      ],
      parts: [
        { node: 'Tower', name: 'Tower', summary: '', moves: [{ kind: 'slide' }] },
        { node: 'Slab', name: 'Slab', summary: '' },
      ],
    },
  ],
};

test('the count is watched slowly, the day long enough to see everything, the night quickly', () => {
  const working = workingHours(flight);
  assert.deepEqual(working, [-15300, 300]);
  assert.equal(programme(-5000, working, true), 'work', 'hardware at work is watched whether or not it is dark');
  assert.equal(programme(20000, working, false), 'day');
  assert.equal(programme(40000, working, true), 'night');
  assert.ok(pace('night') > pace('work') && pace('night') > pace('day'));
});

test('at work the tour stays with what moves; by day it sees everything; by night, only the place', () => {
  assert.deepEqual(tour(flight, 'work'), [
    { model: 'pad', kind: 'whole' },
    { model: 'pad', kind: 'part', node: 'Tower' },
  ]);
  const all = tour(flight, 'day');
  assert.deepEqual(
    all.filter((s) => s.model === 'vehicle').map((s) => s.kind),
    ['whole', 'apart', 'part', 'apart', 'part', 'window'],
    'a section that comes apart is taken apart for its outside, put together, then opened for its inside',
  );
  assert.ok(!all.some((s) => s.model === 'pad' && s.kind === 'apart'), 'a section on the clock is not taken apart by the show');
  assert.deepEqual(tour(flight, 'night'), [{ model: 'pad', kind: 'whole' }]);
});

test('left alone it starts, goes from one thing to the next, and a touch ends it with the clock back at launch', () => {
  const clock = new Clock(flight.launch);
  const seen = [];
  let on = false;
  const demo = new Demo(flight, clock, {
    show: (m) => seen.push(m),
    whole() {},
    part: (n) => seen.push(n),
    apart() {},
    window: () => true,
    say: (t) => seen.push(t.title),
    dark: () => false,
    busy: () => false,
    running: (r) => (on = r),
  });
  demo.tick(IDLE_FIRST - 1);
  assert.equal(demo.active, false);
  demo.tick(2);
  assert.ok(demo.active && on && clock.running);
  for (let i = 0; i < 40; i++) demo.tick(1);
  assert.ok(seen.includes('pad') && seen.includes('Tower'), 'the machinery was looked at');
  demo.stop();
  assert.ok(!demo.active && !on && !clock.running);
  assert.equal(clock.t, 0);
  assert.equal(clock.rate, 1);
});

test('a touch on the clock itself leaves the clock where it is', () => {
  const clock = new Clock(flight.launch);
  const demo = new Demo(flight, clock, {
    show() {},
    whole() {},
    part() {},
    apart() {},
    window: () => true,
    say() {},
    dark: () => false,
    busy: () => false,
    running() {},
  });
  demo.start();
  demo.tick(1);
  demo.stop(true);
  assert.notEqual(clock.t, 0);
});

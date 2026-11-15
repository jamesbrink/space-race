// The one machine (src/sim/craft.ts): what a plan's hardware lets be done, and when its events come due. On a small
// plan of its own, so that each rule is seen alone; the flights' plans fly on it in stagedlive.test.mjs and the rest.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aboard, act, due, fire, heldBy, holds, lit, part, startCraft } from '../src/sim/craft.ts';
import { problems } from '../src/sim/plan.ts';

const m = (value = 1) => ({ value, confidence: 'estimated', source: 'test' });
const starts = (count, ground = false) => ({ count, ground, confidence: 'estimated', source: 'test' });
const plan = {
  kind: 'orbital',
  craft: [
    {
      id: 'stack',
      label: 'Stack',
      mass: m(4),
      bodies: ['first', 'second', 'fairing', 'ship'].map((id) => ({ id, label: id, count: 1, mass: m() })),
      joints: [
        { id: 'first', label: 'Staging', gone: ['first'] },
        { id: 'second', label: 'Ship off', gone: ['second', 'first'] },
        { id: 'fairing', label: 'Fairing', gone: ['fairing'], covers: ['ship'], holds: ['second'] },
      ],
      engines: [
        {
          id: 'first',
          label: 'First',
          body: 'first',
          count: 1,
          tanks: [],
          thrust: { vacuum: m() },
          kind: 'liquid',
          starts: starts(1, true),
          burn: m(),
        },
        {
          id: 'second',
          label: 'Second',
          body: 'second',
          count: 1,
          tanks: [],
          thrust: { vacuum: m() },
          kind: 'liquid',
          throttle: { range: [0.4, 1] },
          starts: starts(2),
          burn: m(),
        },
        {
          id: 'kick',
          label: 'Kick',
          body: 'ship',
          count: 1,
          tanks: [],
          thrust: { vacuum: m() },
          kind: 'solid',
          burn: m(),
          starts: starts(1),
        },
      ],
      tanks: [],
      thrusters: [],
      chutes: [
        { id: 'drogue', label: 'Drogue', body: 'ship', dragArea: m(), fills: m() },
        { id: 'main', label: 'Main', body: 'ship', dragArea: m(), fills: m(), instead: ['drogue'] },
      ],
      limits: [],
      drag: [],
    },
  ],
  events: [
    { id: 'liftoff', label: 'Liftoff', when: [{ time: 0 }], do: [{ ignite: 'first' }], automatic: true, source: 'test' },
    {
      id: 'staging',
      label: 'Staging',
      when: [{ speed: 100, apparent: 'first' }],
      do: [{ cut: 'first' }, { separate: 'first' }, { ignite: 'second' }],
      automatic: true,
      source: 'test',
    },
    { id: 'arm', label: 'Timer started', when: [{ command: 'arm' }], do: [{ arm: 'timer' }], automatic: false, source: 'test' },
    {
      id: 'timer',
      label: 'Timer',
      when: [{ after: 'arm', wait: 5 }],
      do: [{ attitude: 'retro' }],
      automatic: true,
      armed: false,
      source: 'test',
    },
    { id: 'drogue', label: 'Drogue', when: [{ height: 1000, going: 'down' }], do: [{ deploy: 'drogue' }], automatic: true, source: 'test' },
  ],
  attitude: [
    { id: 'up', label: 'Up', hold: { free: true }, source: 'test' },
    { id: 'retro', label: 'Retro', hold: { retro: m() }, source: 'test' },
  ],
  checks: [],
};
const sense = (x = {}) => ({ t: 0, height: 0, falling: false, speed: 0, apparent: () => 0, g: 1, held: true, ...x });

test('the test plan is whole', () => assert.deepEqual(problems(plan), []));

test('an engine lights, burns and is cut; it starts only as often as it can, and one lit only on the ground is not lit in the air', () => {
  let s = startCraft(plan);
  assert.equal(s.attitude, 'up');
  s = act(plan, s, { ignite: 'first' }, 0, true).state;
  assert.ok(lit(s, 'first', 1));
  s = act(plan, s, { cut: 'first' }, 10, false).state;
  assert.ok(!lit(s, 'first', 10) && lit(s, 'first', 9.99));
  assert.deepEqual(
    act(plan, s, { ignite: 'first' }, 11, false).refused.map((r) => r.why),
    ['starts'],
  );
  const air = act(plan, startCraft(plan), { ignite: 'first' }, 5, false);
  assert.deepEqual(
    air.refused.map((r) => r.why),
    ['ground'],
  );
  // the second starts twice
  let t = act(plan, startCraft(plan), { ignite: 'second' }, 0, false).state;
  t = act(plan, t, { cut: 'second' }, 1, false).state;
  t = act(plan, t, { ignite: 'second' }, 2, false).state;
  assert.ok(lit(t, 'second', 2) && t.engines.second.starts === 2);
  t = act(plan, t, { throttle: 'second', to: 0.1 }, 3, false).state;
  assert.equal(t.engines.second.throttle, 0.4, 'held to its least');
});

test('a solid cannot be cut or throttled', () => {
  const s = act(plan, startCraft(plan), { ignite: 'kick' }, 0, false).state;
  assert.deepEqual(
    act(plan, s, { cut: 'kick' }, 1, false).refused.map((r) => r.why),
    ['solid'],
  );
  assert.ok(lit(act(plan, s, { cut: 'kick' }, 1, false).state, 'kick', 2));
});

test('a joint let go parts when the simulator says; it takes what is on it; one held by another waits for it', () => {
  let s = act(plan, startCraft(plan), { separate: 'second' }, 10, false).state;
  assert.equal(s.joints.second.loose, 10);
  assert.ok(aboard(s, 'second'), 'let go is not gone');
  assert.equal(heldBy(plan, s, 'second')?.id, 'fairing');
  s = act(plan, s, { separate: 'fairing' }, 11, false).state;
  s = part(plan, s, 'fairing', 11);
  assert.equal(heldBy(plan, s, 'second'), null);
  s = part(plan, s, 'second', 12);
  assert.equal(s.bodies.second, 12);
  assert.equal(s.bodies.first, 12, 'what hung on it goes with it');
  assert.ok(aboard(s, 'ship'));
  assert.deepEqual(
    act(plan, s, { ignite: 'second' }, 13, false).refused.map((r) => r.why),
    ['gone'],
  );
});

test('a parachute out lets go the one it takes the place of', () => {
  let s = act(plan, startCraft(plan), { deploy: 'drogue' }, 1, false).state;
  s = act(plan, s, { deploy: 'main' }, 5, false).state;
  assert.equal(s.chutes.drogue.off, 5);
  assert.equal(s.chutes.main.out, 5);
});

test('events come due on their triggers, once; an armed one waits for its arming and then its time', () => {
  let s = startCraft(plan);
  assert.deepEqual(
    due(plan, s, sense()).map((e) => e.id),
    ['liftoff'],
  );
  s = fire(plan, s, 'liftoff', 0, true).state;
  assert.deepEqual(due(plan, s, sense({ t: 1 })), [], 'once');
  assert.deepEqual(
    due(plan, s, sense({ t: 50, apparent: (id) => (id === 'first' ? 100 : 0) })).map((e) => e.id),
    ['staging'],
  );
  const staged = fire(plan, s, 'staging', 50, false).state;
  assert.ok(!lit(staged, 'first', 50) && lit(staged, 'second', 50) && staged.joints.first.loose === 50);
  assert.deepEqual(due(plan, staged, sense({ t: 60 })), [], 'the timer waits to be armed');
  let armed = fire(plan, staged, 'arm', 60, false).state;
  assert.equal(armed.armed.timer, 60);
  assert.deepEqual(due(plan, armed, sense({ t: 64.9 })), []);
  assert.deepEqual(
    due(plan, armed, sense({ t: 65 })).map((e) => e.id),
    ['timer'],
  );
  armed = fire(plan, armed, 'timer', 65, false).state;
  assert.equal(armed.attitude, 'retro');
  assert.ok(holds({ height: 1000, going: 'down' }, armed, sense({ height: 999, falling: true })));
  assert.ok(!holds({ height: 1000, going: 'down' }, armed, sense({ height: 999, falling: false })));
  assert.ok(holds({ command: 'arm' }, armed, sense({ commands: new Set(['arm']) })));
});

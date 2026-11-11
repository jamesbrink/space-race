import assert from 'node:assert/strict';
import { test } from 'node:test';
import { choices, lookUp, nameOf, sameTarget, spaced } from '../src/actions.ts';
import { seat, sector } from '../src/wheel.ts';

/** A flight with nothing of any real one in it: a machine with a part that can be worked, and two people. */
const part = (node, extra = {}) => ({ node, name: `The ${node}`, summary: '', detail: '', explode: [0, 0, 0], order: 0, ...extra });
const flight = {
  models: [
    {
      id: 'rig',
      name: 'Rig',
      parts: [part('Arm', { actions: [{ id: 'lower', label: 'Lower it', do: { kind: 'slider', to: 0.5 } }] }), part('Cab')],
    },
    { id: 'ann', name: 'Ann', walker: {}, parts: [part('Hat')] },
    { id: 'bob', name: 'Bob', walker: {}, parts: [] },
  ],
};
const ids = (target, as = 'ann') => choices(target, flight, as).map((c) => c.id);

test('a part offers its information, the verbs its flight gave it, and a closer look from outside', () => {
  assert.deepEqual(ids({ model: 'rig', node: 'Arm' }), ['info', 'action:lower', 'inspect']);
  assert.deepEqual(ids({ model: 'rig', node: 'Cab' }), ['info', 'inspect']);
  const lower = choices({ model: 'rig', node: 'Arm' }, flight, 'ann')[1];
  assert.deepEqual(lower.verb, { do: 'action', model: 'rig', action: flight.models[0].parts[0].actions[0] });
  assert.equal(lower.label, 'Lower it');
});

test('a window can be looked through, whatever it is a window of', () => {
  assert.deepEqual(ids({ model: 'rig', node: 'Cab', pane: true }), ['info', 'look', 'inspect']);
  assert.deepEqual(ids({ pane: true }), ['look']);
  assert.deepEqual(ids({ place: 'GuardHut', pane: true }), ['look', 'inspect']);
});

test('another figure can be become; nobody becomes themselves; a figure with no part hit still can', () => {
  assert.deepEqual(ids({ model: 'bob' }, 'ann'), ['become']);
  assert.deepEqual(ids({ model: 'ann', node: 'Hat' }, 'bob'), ['info', 'become', 'inspect']);
  assert.deepEqual(ids({ model: 'ann', node: 'Hat' }, 'ann'), ['info', 'inspect']);
  assert.equal(choices({ model: 'bob' }, flight, 'ann')[0].label, 'Become Bob');
});

test('a ladder can be climbed, whatever else it is part of', () => {
  assert.deepEqual(ids({ climb: true }), ['climb']);
  assert.deepEqual(ids({ model: 'rig', node: 'Cab', climb: true }), ['climb', 'info', 'inspect']);
  assert.equal(nameOf({ model: 'rig', node: 'Cab', climb: true }, flight), 'Ladder');
  assert.ok(!sameTarget({ model: 'rig', node: 'Cab' }, { model: 'rig', node: 'Cab', climb: true }));
});

test('a model hit where it has no part, and nothing at all, offer nothing', () => {
  assert.deepEqual(ids({ model: 'rig' }), []);
  assert.deepEqual(ids({}), []);
});

test('a target is called by its part, else its model, else its place spelled out', () => {
  assert.equal(nameOf({ model: 'rig', node: 'Arm' }, flight), 'The Arm');
  assert.equal(nameOf({ model: 'bob' }, flight), 'Bob');
  assert.equal(nameOf({ place: 'Pad6Gantry' }, flight), 'Pad 6 gantry');
  assert.equal(nameOf({ pane: true }, flight), 'Window');
  assert.equal(spaced('Blockhouse'), 'Blockhouse');
  assert.equal(lookUp({ model: 'rig', node: 'Nope' }, flight).part, undefined);
});

test('two targets are the same when every field is', () => {
  assert.ok(sameTarget(null, null));
  assert.ok(sameTarget({ model: 'rig', node: 'Arm' }, { model: 'rig', node: 'Arm' }));
  assert.ok(!sameTarget({ model: 'rig', node: 'Arm' }, { model: 'rig', node: 'Arm', pane: true }));
  assert.ok(!sameTarget({ model: 'rig' }, null));
});

test('wheel seats start at the top and go clockwise', () => {
  const near = ([x, y], [ex, ey]) => assert.ok(Math.abs(x - ex) < 1e-9 && Math.abs(y - ey) < 1e-9, `${[x, y]} != ${[ex, ey]}`);
  near(seat(0, 4), [0, -1]);
  near(seat(1, 4), [1, 0]);
  near(seat(2, 4), [0, 1]);
  near(seat(3, 4), [-1, 0]);
  near(seat(0, 1), [0, -1]);
});

test('a push points at the seat nearest its direction, and a short one at nothing', () => {
  for (const count of [1, 2, 3, 4, 5, 8])
    for (let i = 0; i < count; i++) {
      const [x, y] = seat(i, count);
      assert.equal(sector(x * 50, y * 50, count), i, `${i} of ${count}`);
      // a little to either side of a seat is still that seat
      const a = Math.atan2(x, -y);
      for (const off of [-0.4, 0.4]) assert.equal(sector(Math.sin(a + off / count), -Math.cos(a + off / count), count), i);
    }
  assert.equal(sector(3, 4, 4, 10), null);
  assert.equal(sector(30, 40, 4, 10), 2, 'more down than right, of four: the bottom seat');
  assert.equal(sector(0, 0, 4), null);
  assert.equal(sector(1, 0, 0), null);
  assert.equal(sector(-1, 0, 2), 0, 'exactly between two seats: one of them, never nothing');
});

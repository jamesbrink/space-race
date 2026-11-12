// The names on the parts of a thing taken apart (src/viewer/labels.ts): which parts have come
// clear, and where their labels go.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight as mr3 } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { exhibit } from '../src/address.ts';
import { cleared, LABEL_H, layOut, spread } from '../src/viewer/labels.ts';

const part = (explode, order, moves) => ({ explode, order, ...(moves ? { moves } : {}) });
const frame = { left: 0, right: 1000, top: 0, bottom: 600 };

test('nothing is named while the thing is together, and everything that moves apart is by the end', () => {
  const parts = [part([0, 6, 0], 0), part([0, 4, 0], 1), part([0, 2, 0], 2), part([0, 0, 0], 3)];
  assert.deepEqual(cleared(parts, 0), [false, false, false, false]);
  assert.deepEqual(cleared(parts, 1), [true, true, true, true]);
});

test('parts are named in the order they leave', () => {
  const parts = [part([0, 6, 0], 0), part([0, 4, 0], 1), part([0, 2, 0], 2), part([0, 0, 0], 3)];
  let before = 0;
  const seen = [];
  for (let t = 0; t <= 1.0001; t += 0.01) {
    const now = cleared(parts, t);
    const count = now.filter(Boolean).length;
    assert.ok(count >= before, `a name went away at ${t.toFixed(2)}`);
    before = count;
    now.forEach((on, i) => {
      if (on && !seen.includes(i)) seen.push(i);
    });
  }
  assert.deepEqual(seen.slice(0, 1), [0], 'the first to leave is the first named');
  assert.equal(seen.at(-1), 3, 'the part that stays is named last, when the rest has left it');
});

test('two parts that leave together and stay together do not hold each other back', () => {
  // a hatch beside its afterbody: the same height, a little to one side
  const parts = [part([0, 5, 0], 0), part([1, 5, 0], 0), part([0, 0, 0], 1)];
  const half = cleared(parts, 0.5);
  assert.ok(half[0] && half[1]);
  // and two with the very same travel are judged by their other neighbours only
  const same = [part([0, 5, 0], 0), part([0, 5, 0], 0), part([0, 0, 0], 1)];
  assert.deepEqual(cleared(same, 1), [false, true, true], 'a part with no neighbour it parts from is not named');
});

test('a part with motions of its own is no part of an exploded view', () => {
  const parts = [part([0, 5, 0], 0), part([0, 0, 0], 1, [{ kind: 'slide', by: [1, 0, 0], from: 0, to: 1 }]), part([0, 0, 0], 2)];
  assert.equal(cleared(parts, 1)[1], false);
});

test('some of a model`s parts are judged against the whole model`s timing', () => {
  // the last two of twelve: alone, they would be taken to leave from the start
  const parts = [part([0, 3, 0], 10), part([0, 0, 0], 11)];
  assert.deepEqual(cleared(parts, 0.3, 11), [false, false]);
  assert.deepEqual(cleared(parts, 1, 11), [true, true]);
});

test('every part of Freedom 7 is named by the time it is apart, and none while it is together', () => {
  const vehicle = exhibit(mr3);
  assert.ok(cleared(vehicle.parts, 0).every((on) => !on));
  assert.ok(cleared(vehicle.parts, 1).every(Boolean));
});

test('labels stand in a column beside the parts, in their order, none on another', () => {
  const anchors = [100, 110, 118, 300, 304].map((y, i) => ({ id: `p${i}`, x: 500, y, r: 40, width: 120 }));
  const placed = layOut(anchors, frame);
  assert.equal(placed.length, anchors.length);
  assert.ok(placed.every((p) => p.side === 'right'));
  assert.ok(
    placed.every((p) => p.x === placed[0].x),
    'one column',
  );
  assert.ok(placed[0].x >= 540, 'beyond the widest part');
  const ys = placed.map((p) => p.y);
  for (let i = 1; i < ys.length; i++) assert.ok(ys[i] - ys[i - 1] >= LABEL_H, `labels ${i - 1} and ${i} overlap`);
  assert.deepEqual(
    placed.map((p) => p.id),
    anchors.map((a) => a.id),
    'in the order of their parts',
  );
  // each leader starts on its own part
  placed.forEach((p, i) => assert.deepEqual(p.from, { x: anchors[i].x, y: anchors[i].y }));
});

test('a part off to the left is named on the left', () => {
  const anchors = [
    { id: 'stack', x: 500, y: 200, r: 30, width: 100 },
    { id: 'more', x: 502, y: 300, r: 30, width: 100 },
    { id: 'hatch', x: 380, y: 250, r: 12, width: 100 },
  ];
  const placed = layOut(anchors, frame);
  const hatch = placed.find((p) => p.id === 'hatch');
  assert.equal(hatch.side, 'left');
  assert.ok(hatch.x < 380);
  assert.ok(placed.filter((p) => p.id !== 'hatch').every((p) => p.side === 'right'));
});

test('labels stay on the page', () => {
  // against the right edge the column comes back in; off the frame a part is not named
  const anchors = [
    { id: 'near-edge', x: 960, y: 100, r: 60, width: 150 },
    { id: 'off', x: 1200, y: 100, r: 10, width: 150 },
    { id: 'above', x: 500, y: -40, r: 10, width: 150 },
  ];
  const placed = layOut(anchors, frame);
  assert.deepEqual(
    placed.map((p) => p.id),
    ['near-edge'],
  );
  assert.ok(placed[0].x + 150 <= frame.right);
  // at the foot they are pushed up, not off
  const low = [590, 592, 594].map((y, i) => ({ id: `l${i}`, x: 500, y, r: 10, width: 80 }));
  for (const p of layOut(low, frame)) assert.ok(p.y + LABEL_H / 2 <= frame.bottom && p.y - LABEL_H / 2 >= frame.top);
});

test('more names than a column has room for: the ones nearest the middle are kept', () => {
  const small = { left: 0, right: 1000, top: 0, bottom: 100 };
  const anchors = Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, x: 500, y: 4 + i * 8, r: 10, width: 80 }));
  const placed = layOut(anchors, small);
  assert.ok(placed.length < anchors.length && placed.length >= 3);
  const ys = placed.map((p) => p.y);
  for (let i = 1; i < ys.length; i++) assert.ok(ys[i] - ys[i - 1] >= LABEL_H);
  assert.ok(ys[0] - LABEL_H / 2 >= small.top && ys.at(-1) + LABEL_H / 2 <= small.bottom);
});

test('spreading keeps each as near where it wanted to be as the rest allow', () => {
  assert.deepEqual(spread([10, 100, 200], 0, 300, 27), [10, 100, 200], 'nothing in the way: nothing moves');
  const pair = spread([100, 100], 0, 300, 20);
  assert.equal(pair[1] - pair[0], 20);
  assert.equal((pair[0] + pair[1]) / 2, 100, 'two that wanted the same place share it');
  const foot = spread([290, 295, 299], 0, 300, 20);
  assert.deepEqual(foot, [260, 280, 300]);
  const head = spread([1, 2, 3], 0, 300, 20);
  assert.deepEqual(head, [0, 20, 40]);
});

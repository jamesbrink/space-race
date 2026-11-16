// When leaving a flight asks, and when the deck keeps the flight instead (src/deck/leaving.ts): only a flight the visitor
// has taken over and that has not ended, or ended a moment ago, is at stake; watching one as flown loses nothing.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GRACE, inProgress, verdict } from '../src/deck/leaving.ts';

const flying = { byHand: true, over: false, since: 0 };

test('a flight watched as flown loses nothing, by any way out', () => {
  for (const over of [false, true])
    for (const way of ['within', 'beyond']) assert.equal(verdict({ byHand: false, over, since: over ? 1 : 0 }, way), 'free');
});

test('a flight flown by hand, still going: kept within the flight, asked about beyond it', () => {
  assert.equal(verdict(flying, 'within'), 'keep');
  assert.equal(verdict(flying, 'beyond'), 'ask');
});

test('one that has ended is no longer at stake once its moment of grace has gone', () => {
  assert.ok(inProgress({ byHand: true, over: true, since: GRACE - 0.1 }));
  assert.ok(!inProgress({ byHand: true, over: true, since: GRACE }));
  assert.equal(verdict({ byHand: true, over: true, since: GRACE + 10 }, 'beyond'), 'free');
  assert.equal(verdict({ byHand: true, over: true, since: GRACE + 10 }, 'within'), 'free');
});

test('a run that ended a moment ago is asked about beyond the flight, and not kept within it (there is nothing to resume)', () => {
  const landed = { byHand: true, over: true, since: 1 };
  assert.equal(verdict(landed, 'beyond'), 'ask');
  assert.equal(verdict(landed, 'within'), 'free');
});

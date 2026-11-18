// What an act does to a run flown by hand (src/deck/leaving.ts). Only a flight the visitor has taken over and that has not
// ended, or ended a moment ago, is at stake; watching one as flown loses nothing. Such a run is kept wherever the visitor
// goes: parked within the flight, written to the browser's storage beyond it. Asked first: starting over with it going
// on, and a way beyond the flight when the browser will not keep it or it has just come down.
//
// (Until November 2026 every way beyond the flight asked, for nothing could keep the run there; a run is now kept by the
// browser, so that rule is this one's `saved: false` row: it asks where, and only where, the run would still be lost.)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GRACE, inProgress, verdict } from '../src/deck/leaving.ts';

const flying = { byHand: true, over: false, since: 0, saved: true };
const WAYS = ['within', 'beyond', 'again'];

test('a flight watched as flown loses nothing, by any way out nor by starting over', () => {
  for (const over of [false, true])
    for (const saved of [false, true])
      for (const way of WAYS) assert.equal(verdict({ byHand: false, over, since: over ? 1 : 0, saved }, way), 'free');
});

test('a flight flown by hand, still going, is kept wherever the visitor goes, and nothing is asked', () => {
  assert.equal(verdict(flying, 'within'), 'keep');
  assert.equal(verdict(flying, 'beyond'), 'keep');
});

test('only where the browser will not keep it does a way beyond the flight ask; within it is kept all the same', () => {
  const unkept = { ...flying, saved: false };
  assert.equal(verdict(unkept, 'beyond'), 'ask');
  assert.equal(verdict(unkept, 'within'), 'keep');
});

test('starting over with a run flown by hand going on throws it away, and is asked first; once it has ended it is not', () => {
  assert.equal(verdict(flying, 'again'), 'ask');
  assert.equal(verdict({ ...flying, saved: false }, 'again'), 'ask');
  assert.equal(verdict({ ...flying, over: true, since: 1 }, 'again'), 'free');
  assert.equal(verdict({ ...flying, over: true, since: GRACE + 1 }, 'again'), 'free');
});

test('one that has ended is no longer at stake once its moment of grace has gone', () => {
  assert.ok(inProgress({ byHand: true, over: true, since: GRACE - 0.1, saved: true }));
  assert.ok(!inProgress({ byHand: true, over: true, since: GRACE, saved: true }));
  for (const way of WAYS) assert.equal(verdict({ byHand: true, over: true, since: GRACE + 10, saved: true }, way), 'free');
});

test('a run that ended a moment ago is asked about beyond the flight (its result goes), and not kept within it (there is nothing to resume)', () => {
  for (const saved of [false, true]) {
    const landed = { byHand: true, over: true, since: 1, saved };
    assert.equal(verdict(landed, 'beyond'), 'ask');
    assert.equal(verdict(landed, 'within'), 'free');
  }
});

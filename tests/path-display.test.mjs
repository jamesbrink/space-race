// A paused display and a synthetic slow UI job. No flight trajectory is calculated here.
import assert from 'node:assert/strict';
import test from 'node:test';
import { FlightPath } from '../src/viewer/path.ts';

function pausedDisplay(jobTime, jobPlan) {
  const view = Object.create(FlightPath.prototype);
  Object.assign(view, {
    scope: { frame: () => 1 },
    sample: { t: 12 },
    wantedAt: null,
    want: () => ({ key: '12|manual', plan: 'manual' }),
    shown: { key: '12|manual', plan: 'manual', result: { from: 12 } },
    job: { key: jobTime + '|' + jobPlan, from: jobTime, plan: jobPlan, run: { run: () => true, result: { from: jobTime } } },
    spent: { slice: 0, frames: 0 },
    build(result, key, plan) {
      this.shown = { key, plan, result };
    },
    place() {},
  });
  return view;
}
test('a delayed display job cannot replace the valid result for the paused frame', () => {
  for (const [at, mode] of [
    [10, 'manual'],
    [12, 'previous selection'],
    [14, 'manual'],
  ]) {
    const path = pausedDisplay(at, mode);
    path.tick();
    assert.equal(path.shown.key, '12|manual');
    assert.equal(path.job, null);
  }
});

test('job age and simulation timestamps stay separate while a paused display is waiting', () => {
  const path = pausedDisplay(10, 'manual');
  path.shown.key = '10|manual';
  path.shown.result.from = 10;
  path.wantedAt = performance.now() - 8200;
  const status = path.freshness;
  assert.equal(status.current, false);
  assert.deepEqual([status.sampleTime, status.displayedFrom, status.jobFrom], [12, 10, 10]);
  assert.ok(status.waitingMs >= 8200);
});

test('a queued UI job is superseded when the existing display is valid again', () => {
  const path = pausedDisplay(10, 'manual');
  let slices = 0;
  path.shown = { key: '9|manual', result: { from: 9 }, plan: 'manual' };
  path.job = null;
  path.doneAt = -Infinity;
  path.sample.t = 10;
  path.want = () => ({ key: path.sample.t + '|manual', plan: 'manual' });
  path.holds = () => path.sample.t === 12;
  path.source = { predict: () => ({ run: () => ++slices >= 2, result: { from: 10 } }) };
  path.tick();
  assert.equal(path.job.key, '10|manual');
  path.sample.t = 12;
  path.tick();
  assert.equal(path.shown.key, '12|manual');
  assert.equal(path.shown.result.from, 9);
  assert.equal(path.freshness.current, true);
  assert.equal(path.freshness.waitingMs, 0);
});

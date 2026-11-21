// A paused display and a synthetic slow UI job. No flight trajectory is calculated here.
import assert from 'node:assert/strict';
import test from 'node:test';
import { FlightPath } from '../src/viewer/path.ts';

/** A curve of no points: a display whose flight has left it cannot be measured against it (path.ts `leftBy`). */
const NONE = { n: 0 };

function pausedDisplay(jobTime, jobPlan) {
  const view = Object.create(FlightPath.prototype);
  Object.assign(view, {
    scope: { frame: () => 1 },
    // (not the map's view: its own markers and lines are none)
    source: { active: false },
    mapped: false,
    craftMark: null,
    others: new Map(),
    refMarks: [],
    refApsis: null,
    heavens: [],
    leftNow: new Float64Array(6),
    sample: { t: 12 },
    wantedAt: null,
    want: () => ({ key: '12|manual', plan: 'manual' }),
    shown: { key: '12|manual', plan: 'manual', result: { from: 12 }, curve: NONE },
    job: { key: jobTime + '|' + jobPlan, from: jobTime, plan: jobPlan, run: { run: () => true, result: { from: jobTime } } },
    spent: { slice: 0, frames: 0 },
    build(result, key, plan) {
      this.shown = { key, plan, result, curve: NONE };
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
  path.shown = { key: '9|manual', result: { from: 9 }, plan: 'manual', curve: NONE };
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

test('an advancing clock can be waiting continuously while recently completed updates stay bright', () => {
  const path = pausedDisplay(11, 'manual');
  path.wantedAt = performance.now() - 8000;
  path.doneAt = performance.now() - 7000;
  path.shown.key = '10|manual';
  path.holds = () => false;
  assert.equal(path.stale, true);
  path.tick();
  assert.equal(path.shown.key, '11|manual');
  assert.equal(path.freshness.current, false);
  assert.ok(path.freshness.waitingMs >= 8000);
  assert.equal(path.stale, false);
});

test('changing the selection hides the old meshes, marker layer and readout while waiting for a new result', () => {
  const path = pausedDisplay(12, 'obsolete');
  path.shown.plan = 'obsolete';
  let readout = 'old';
  let redrawn = false;
  Object.assign(path, {
    mesh: { visible: true },
    flownMesh: { visible: true },
    ringMesh: { visible: true, userData: {} },
    // (the record's line goes with the rest, and the line ahead's own ribbon is emptied)
    refMesh: { visible: true },
    ahead: { n: 5, geometry: { setDrawRange() {} } },
    flown: { n: 0 },
    marksEl: { hidden: false, classList: { toggle() {} } },
    marks: [],
    host: {
      overlay() {
        redrawn = true;
      },
    },
    panelsRead: Infinity,
    doneAt: performance.now(),
    say(result) {
      readout = result;
    },
    place: FlightPath.prototype.place,
  });
  path.tick();
  assert.equal(path.shown, null);
  assert.deepEqual([path.mesh.visible, path.flownMesh.visible, path.ringMesh.visible, path.refMesh.visible], [false, false, false, false]);
  assert.equal(path.ahead.n, 0);
  assert.ok(redrawn && path.marksEl.hidden);
  assert.deepEqual(path.laidOut, []);
  assert.equal(readout, null);
});

test('the prediction starts from the point the simulator flies, not where the vehicle is drawn (issue #186)', () => {
  // (a launch vehicle's sample: its datum, which the stack's forces move, and the spacecraft's centre 90 m up its axis,
  // where it is drawn: orbitdeck.ts hands the datum on as `flies`)
  const datum = [6_500_000, 0, 0];
  const centre = [6_500_090, 0, 0];
  for (const [flies, from] of [
    [datum, datum],
    [undefined, centre],
  ]) {
    const asked = [];
    const path = pausedDisplay(12, 'manual');
    Object.assign(path, {
      sample: { t: 20, r: datum, centre, ...(flies ? { flies } : {}), v: [0, 7800, 0], mass: 1, riding: false, escaping: false, out: null },
      shown: null,
      job: null,
      doneAt: -Infinity,
      want: () => ({ key: '20|manual', plan: 'manual' }),
      source: { predict: (start) => (asked.push(start), { run: () => false, result: { from: 20 } }) },
    });
    path.tick();
    assert.equal(asked.length, 1);
    assert.deepEqual(asked[0].r, from, flies ? 'from the point it flies' : 'with none given, from its centre');
  }
  // (and the curve on show is held to that point: a prediction made from the datum still stands with the flight on it)
  const path = pausedDisplay(12, 'manual');
  const c = { n: 2, t: Float64Array.of(0, 100), r: Float64Array.of(...datum, ...datum), v: Float64Array.of(0, 0, 0, 0, 0, 0) };
  path.camera = null;
  path.at3 = new Float64Array(3);
  const s = { t: 20, r: datum, centre, flies: datum, v: [0, 0, 0] };
  assert.equal(FlightPath.prototype.holds.call(path, { curve: c, result: { outcome: 'impact', kind: 'coast' } }, s), true);
  assert.equal(
    FlightPath.prototype.holds.call(path, { curve: c, result: { outcome: 'impact', kind: 'coast' } }, { ...s, flies: undefined }),
    false,
  );
});

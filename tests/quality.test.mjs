import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FLOOR, PATIENCE, Quality, STEP, WINDOW } from '../src/viewer/quality.ts';

/** Run `seconds` of frames at `fps` from `t`; returns the time after them and how often the scale changed. */
function run(q, t, fps, seconds) {
  const ms = 1000 / fps;
  let changes = 0;
  for (let i = 0; i < seconds * fps; i++) {
    t += ms;
    if (q.frame(ms, t)) changes++;
  }
  return { t, changes };
}

test('a machine that keeps up is never touched', () => {
  const q = new Quality();
  q.auto = true;
  q.setFull(2);
  assert.equal(run(q, 0, 60, 600).changes, 0);
  assert.equal(run(q, 0, 120, 60).changes, 0);
  assert.equal(run(q, 0, 31, 60).changes, 0);
  assert.equal(run(q, 0, 41, 120).changes, 0, 'twenty-four milliseconds a frame is slow, and not this net\u2019s business');
  assert.equal(q.scale, 1);
});

test('a slow pace takes the resolution down a step a window, and never under one pixel a CSS pixel', () => {
  const q = new Quality();
  q.auto = true;
  q.setFull(2);
  let { t } = run(q, 0, 22, (WINDOW / 1000) * 0.9);
  assert.equal(q.scale, 1, 'not before it has been slow for a whole window');
  ({ t } = run(q, t, 22, 0.5));
  assert.ok(Math.abs(q.scale - STEP) < 1e-9);
  // (each step buys frames here, as it does where the pixels are what is slow)
  let fps = 15;
  while (q.scale > FLOOR && t < 600_000) {
    const before = q.scale;
    ({ t } = run(q, t, fps, 0.5));
    if (q.scale < before) fps += 1.5;
  }
  assert.equal(q.scale, FLOOR);
  run(q, t, 25, 60);
  assert.equal(q.scale, FLOOR, 'and no further');
  const plain = new Quality();
  plain.auto = true;
  plain.setFull(1);
  assert.equal(run(plain, 0, 12, 60).changes, 0, 'a plain screen has nothing to give');
  assert.equal(plain.scale, 1);
});

test('a hitch, a still view and a rest are not a pace', () => {
  const q = new Quality();
  q.auto = true;
  q.setFull(2);
  let t = 0;
  // slow frames, but never a whole window of them together
  for (let k = 0; k < 20; k++) {
    ({ t } = run(q, t, 20, 3));
    t += 400;
    q.frame(400, t); // a hitch
    ({ t } = run(q, t, 20, 3));
    q.idle(); // nothing drawn for a while
  }
  assert.equal(q.scale, 1);
  q.rest(t, 5000);
  ({ t } = run(q, t, 20, 4.5));
  assert.equal(q.scale, 1, 'slow while resting (loading) is not counted');
});

test('it comes back up when there is room, and a try that fails waits twice as long', () => {
  const q = new Quality();
  q.auto = true;
  q.setFull(2);
  let { t } = run(q, 0, 22, 4.2);
  const low = q.scale;
  assert.ok(low < 1);
  // good again, but not tried before its patience is out
  ({ t } = run(q, t, 60, PATIENCE / 1000 - 3));
  assert.equal(q.scale, low);
  ({ t } = run(q, t, 60, 6));
  assert.equal(q.scale, 1, 'one step back was all there was');
  // a machine that is slow at full and fine a step down: it must not hunt
  const hunter = new Quality();
  hunter.auto = true;
  hunter.setFull(2);
  let at = 0;
  let ups = 0;
  while (at < 1_200_000) {
    const ms = hunter.scale === 1 ? 1000 / 26 : 1000 / 60;
    const before = hunter.scale;
    at += ms;
    hunter.frame(ms, at);
    if (hunter.scale > before) ups++;
  }
  assert.ok(ups <= 7, `tried full ${ups} times in twenty minutes`);
  assert.ok(hunter.scale >= STEP - 1e-9);
});

test('Full is full: the setting off puts it back at once and keeps it there', () => {
  const q = new Quality();
  q.auto = true;
  q.setFull(2);
  let { t } = run(q, 0, 22, 4.2);
  assert.ok(q.scale < 1);
  q.auto = false;
  assert.equal(q.frame(33, t + 33), true);
  assert.equal(q.scale, 1);
  ({ t } = run(q, t, 20, 30));
  assert.equal(q.scale, 1);
});

test('fewer pixels that buy no frames are given back: where the processor sets the pace it is drawn at full', () => {
  const q = new Quality();
  q.auto = true;
  q.setFull(2);
  const { t } = run(q, 0, 20, 60);
  assert.equal(q.scale, 1);
  assert.equal(run(q, t, 20, 120).changes, 0, 'and left alone a good while');
});

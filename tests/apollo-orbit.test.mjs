import assert from 'node:assert/strict';
import { test } from 'node:test';
import { apollo7Plan } from '../missions/usa/apollo/flights/apollo-7/orbital.ts';
import { descending } from '../src/sim/fliers.ts';
import { coastEngineState, coastOf, flyDown, movesOf } from '../src/sim/orbital.ts';
import { propagate } from '../src/sim/predict.ts';
import { byHand, givenUp, sequenceOf, stagesOf } from '../src/sim/staged.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { add, cross, geodeticToEcef, scale } from '../src/world/frames.ts';

test('Apollo 7 holds the S-IVB through insertion and uses one SPS for all eight firings', () => {
  const engines = stagesOf(apollo7Plan).map((stage) => stage.engine.id);
  assert.deepEqual(engines, ['h1-inboard', 'h1-outboard', 'sivb-j2']);
  assert.deepEqual(
    sequenceOf(apollo7Plan)
      .stages.slice(0, 2)
      .map((stage) => stage.joint),
    ['sib-separation', 'sib-separation'],
  );
  assert.equal(sequenceOf(apollo7Plan).stages.at(-1).sep, 10_502.4);
  const burns = movesOf(apollo7Plan).filter((move) => move.engine === 'sps');
  assert.deepEqual(
    burns.map((move) => move.lit),
    Array.from({ length: 7 }, (_, i) => `sps-${i + 1}`),
  );
  assert.ok(burns.every((move) => move.fuel > 0));
  assert.ok(Math.abs(burns[3].off - burns[3].on - 2.67) < 1e-8, 'the half-second firing command leaves a measured thrust tail');
  const final = coastOf(apollo7Plan);
  assert.equal(final.on, 259 * 3600 + 39 * 60 + 16.3);
  assert.ok(Math.abs(final.off - final.on - 12.4) < 1e-8);
  assert.equal(coastEngineState(apollo7Plan, 'sps', final.on - 1).starts, 1);
  assert.equal(coastEngineState(apollo7Plan, 'sps', final.off).starts, 0);
  assert.ok(coastEngineState(apollo7Plan, 'sps', final.off).kg > 0, 'fuel and start count are separate limitations');
});

test('Apollo 7 takeover preserves past starts and drops future replay fixes', () => {
  const burns = movesOf(apollo7Plan).filter((move) => move.engine === 'sps');
  const at = burns[2].off + 30;
  const free = givenUp(apollo7Plan, at);
  assert.equal(coastEngineState(free, 'sps', at).starts, 5);
  assert.deepEqual(coastEngineState(free, 'sps', at), coastEngineState(apollo7Plan, 'sps', at));
  assert.ok(movesOf(free).every((move) => move.on < at));
  assert.ok(coastOf(free).on > 1e8);
  const manual = byHand(free, at + 20, [1, 0, 0]);
  assert.equal(coastOf(manual).on, at + 20);
  assert.equal(coastEngineState(manual, 'sps', coastOf(manual).off).starts, 4);
  assert.ok(manual.record.coastFixes.every((fix) => fix.at.value <= at + 20));
});

test('Apollo 7 descent predicts the fractional drogue delay after a long coast', () => {
  const t = 936214.12345;
  const frame = frameOf({ launch: '1968-10-11T15:02:45Z' });
  const site = { latitude: 27.54, longitude: -64.07, height: 0 };
  const r = frame.toInertial(geodeticToEcef({ ...site, height: coastOf(apollo7Plan).floor }), t);
  const start = { t, r, v: add(cross(frame.spin, r), scale(frame.up(r, t), -120)) };
  const fixed = flyDown(apollo7Plan, frame, 0, start);
  const adaptive = propagate(descending(apollo7Plan, frame, 0, start, { follow: 'cm' }), start, {
    frame,
    site,
    seaLevel: 0,
  });
  adaptive.run();
  const drogue = adaptive.result.events.find((e) => e.kind === 'drogue');
  assert.ok(Math.abs(drogue.t - (t + 1.6)) < 1e-6);
  assert.ok(Math.abs(adaptive.result.impact.t - fixed.landed.cm.at) < 2);
});

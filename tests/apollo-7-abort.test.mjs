import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/apollo/flights/apollo-7/flight.ts';
import { downOf } from '../src/sim/descent.ts';
import { launchEscape, planAfterEscape, withEscapeTranslation, withServiceAbort } from '../src/sim/launchescape.ts';
import { detachedStageAt, targetAt } from '../src/sim/orbital-target.ts';
import { coastEngineState, flyDown, flyOrbit, shipOf } from '../src/sim/orbital.ts';
import { abortAt } from '../src/sim/plan.ts';
import { ascend, steer } from '../src/sim/staged.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { add, cross, geodeticToEcef, scale, siteFrame, unit } from '../src/world/frames.ts';

const plan = flight.plan;
const frame = frameOf(flight);
const site = siteFrame(flight.site);
const sea = flight.site.seaLevel.value;

test('Apollo 7 pad abort clears the pad, jettisons the tower and puts the drogues out before the mains', () => {
  const r = frame.toInertial(geodeticToEcef(site), 0);
  const tower = abortAt(plan, 0).escape.tower;
  const track = launchEscape(plan, tower, { t: 0, r, v: cross(frame.spin, r), axis: frame.up(r, 0) }, frame, sea);
  const end = track.at(-1);
  assert.ok(track[0].thrust > 0);
  assert.ok(track.at(24).mass < track[0].mass);
  assert.ok(Math.abs(end.t - 14) < 1e-6);
  assert.ok(frame.place(end.r, end.t).height - sea > 850, 'well clear of the pad before tower release');
  const post = planAfterEscape(plan, tower, end.t);
  const cover = end.t + tower.coverAfter.low.value;
  const hands = { given: { [downOf(post).ejection]: cover }, switched: [] };
  const coast = flyOrbit(post, site, frame, sea, 1, end, hands);
  const down = flyDown(post, frame, sea, coast.samples.at(-1), hands);
  const chutes = down.opened.cm;
  assert.ok(Math.abs(down.ejected - cover) < 1e-6);
  assert.ok(Math.abs(chutes['Twin drogues'] - 16) < 1e-6);
  assert.ok(chutes['Three main parachutes'] >= chutes['Twin drogues'] + 10);
  assert.ok(down.landed.cm.longitude > site.longitude + 0.01, 'the pitch sends the capsule seaward');
  assert.ok(down.landed.cm.at > chutes['Three main parachutes']);
});

test('Apollo 7 launches the high-altitude escape while climbing and carries the tower to the barometric release', () => {
  const t = 150;
  const r = frame.toInertial(geodeticToEcef({ ...site, height: 65_000 }), t);
  const up = frame.up(r, t);
  const east = unit(cross(frame.spin, r));
  const motion = add(scale(east, 1800), scale(up, 1200));
  const tower = abortAt(plan, t).escape.tower;
  const start = { t, r, v: add(cross(frame.spin, r), motion), axis: unit(motion) };
  const end = launchEscape(plan, tower, start, frame, sea).at(-1);
  const height = frame.place(end.r, end.t).height - sea;
  assert.ok(end.t > t + 30);
  assert.ok(height <= tower.jettison.height.value && height > tower.jettison.height.value - 150);
  assert.ok(end.mach <= tower.turn.mach.value, 'turnaround has reached the canards’ range');
});

test('Apollo 7 Mode II translates for twenty seconds and uses its own entry once free from S-IVB', () => {
  const t = 250;
  const mode = abortAt(plan, t);
  const motor = mode.escape.separate.motor;
  const branch = withEscapeTranslation(plan, motor.engine, t, motor.duration.value, [1, 0, 0]);
  const ship = shipOf(branch);
  assert.equal(ship.parted, t + 20);
  assert.deepEqual(
    ship.moves.map(({ engine, on, off }) => [engine, on, off]),
    [['sm-rcs', t, t + 20]],
  );
  assert.equal(branch.record.coastFixes, undefined);
});

test('Apollo 7 Mode III fires retrograde and Mode IV preserves a deorbit reserve', () => {
  const ascent = ascend(plan, site, frame, sea, steer(plan, site, frame, sea));
  const direct = abortAt(plan, 580).escape.separate.service;
  const orbit = abortAt(plan, 610).escape.separate.service;
  assert.equal(abortAt(plan, 566, true), null);
  assert.equal(abortAt(plan, 567, true).escape.separate.service.goal.kind, 'orbit');
  assert.equal(abortAt(plan, 573).escape.separate.service.goal.kind, 'recovery');
  assert.equal(abortAt(plan, 627), null);
  for (const [at, mode, sense] of [
    [580, direct, -1],
    [610, orbit, 1],
  ]) {
    const from = ascent.samples.find((sample) => sample.t >= at);
    const result = withServiceAbort(plan, mode, from, from.axis, frame, site, sea);
    const ship = shipOf(result.plan);
    const burn = ship.moves.find((move) => move.engine === 'sps');
    assert.ok(result.duration > 0);
    assert.equal(burn.aim.sense, sense);
    assert.ok(burn.fuel > 0);
    assert.equal(coastEngineState(result.plan, 'sps', burn.off).starts, 7);
    if (mode.goal.kind === 'orbit') {
      assert.ok(result.achieved >= mode.goal.target.value);
      assert.ok(coastEngineState(result.plan, 'sps', burn.off).kg >= ship.fuel);
      assert.equal(ship.parted, Number.MAX_SAFE_INTEGER);
    } else {
      assert.ok(Number.isFinite(result.achieved));
      assert.equal(ship.parted, burn.off);
    }
  }
});

test('Apollo 7 airborne abort draws the discarded stage until impact without creating rendezvous telemetry', () => {
  const t = 150;
  const r = frame.toInertial(geodeticToEcef({ ...site, height: sea + 5000 }), t);
  const axis = frame.up(r, t);
  const v = add(cross(frame.spin, r), scale(axis, -120));
  const sample = { t, r, v, axis };
  const dropped = flight.flies.drops.map((drop) => (drop.on === flight.flies.target.drop ? t : Infinity));
  const run = { frame, samples: [sample], at: () => sample, dropped, launchAborted: true };
  assert.equal(targetAt(flight, run, t), undefined);
  assert.deepEqual(detachedStageAt(flight, run, t).r, r);
  const early = detachedStageAt(flight, run, t + 10);
  assert.ok(frame.place(early.r, t + 10).height < sea + 5000);
  assert.equal(detachedStageAt(flight, run, t + 1800), undefined);
  assert.deepEqual(detachedStageAt(flight, run, t + 10), early, 'rewinding still draws the airborne stage');
  const pad = { ...run, dropped: dropped.map((at) => (at === t ? 0 : at)) };
  assert.equal(detachedStageAt(flight, pad, t), undefined, 'the pad abort leaves the stack parked');
});

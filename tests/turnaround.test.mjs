// After the spacecraft has turned round, the autopilot holds the side that is to face the Earth toward it
// (`trajectory.body.capsule.earthward`: the periscope's side, so the pilot is head up), and leaves the roll alone
// where a flight gives no such side. That side lay down range on the pad (the launcher was turned to the azimuth:
// sites/lc-5.md), so it is toward the Earth all the way up as well.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { autopilot, flyLive } from '../src/sim/autopilot.ts';
import { upAt } from '../src/sim/forces.ts';
import { unturn } from '../src/sim/rigid.ts';
import { vehicle } from '../src/sim/vehicle.ts';
import { siteFrame } from '../src/world/frames.ts';

/** How far round the long axis the given side is from facing the Earth, degrees, at each sample. */
function off(sample, degrees) {
  const up = upAt(sample.r, sample.t);
  const down = unturn(sample.attitude, [-up[0], -up[1], -up[2]]);
  const a = (degrees * Math.PI) / 180;
  const side = [0, -Math.sin(a), Math.cos(a)];
  return (Math.abs(Math.atan2(side[1] * down[2] - side[2] * down[1], side[1] * down[1] + side[2] * down[2])) * 180) / Math.PI;
}
const at = (run, t) => run.samples.find((s) => s.t >= t);

test('turned round, the periscope side is rolled to the Earth and held there until the air takes it', () => {
  const tr = flight.trajectory;
  const side = tr.body.capsule.earthward.value;
  const v = vehicle(tr, siteFrame(flight.site), flight.site.seaLevel.value);
  const run = flyLive(v, autopilot(v), 0.5);
  // going up it is where the pad left it: down range, which is underneath once the stack has tilted
  for (const t of [30, 60, 120])
    assert.ok(off(at(run, t), side) < 3, `periscope side ${off(at(run, t), side).toFixed(1)} degrees off the Earth going up, at ${t} s`);
  // it turns round as the record has it, by a yaw: the periscope's side stays toward the Earth all the way round
  const left = tr.separation.at.value;
  for (const t of [left + 5, left + 10, left + 15, left + 20, left + 30])
    assert.ok(
      off(at(run, t), side) < 10,
      `periscope side ${off(at(run, t), side).toFixed(1)} degrees off the Earth in the turnaround, at ${t.toFixed(0)} s`,
    );
  // half a minute after the spacecraft has left, it is there, and it stays through the top of the flight
  for (const t of [left + 40, left + 100, run.results.apogeeAt, run.results.apogeeAt + 60])
    assert.ok(off(at(run, t), side) < 3, `periscope side ${off(at(run, t), side).toFixed(1)} degrees off the Earth at ${t.toFixed(0)} s`);
  // and it does not cost the flight: the automatic supply is not run dry by it
  assert.ok(at(run, run.results.apogeeAt).rcs.left[0] > 0.5 * tr.body.capsule.rcs.supplies[0].propellant.value);
});

// (with no side named the automatic control turns the long axis the short way round, pitching over, which leaves the
// pilot head down; with one it goes the short way to the whole attitude, which end for end is a yaw: autopilot.ts `turnBoth`)
test('a spacecraft that names no such side keeps the roll it had', () => {
  const tr = structuredClone(flight.trajectory);
  delete tr.body.capsule.earthward;
  const v = vehicle(tr, siteFrame(flight.site), flight.site.seaLevel.value);
  const run = flyLive(v, autopilot(v), 0.5);
  const side = flight.trajectory.body.capsule.earthward.value;
  assert.ok(off(at(run, run.results.apogeeAt), side) > 45);
});

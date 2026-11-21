import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Quaternion, Vector3 } from 'three';
import { LunarRover } from '../src/viewer/lunar-rover.ts';
import { LunarTerrain } from '../src/world/lunar-terrain.ts';
import { hierarchy } from './glb.mjs';

const modelOf = (mission) => {
  const file = readFileSync(`public/models/usa/apollo/apollo-${mission}/rover.glb`);
  return hierarchy(JSON.parse(file.subarray(20, 20 + file.readUInt32LE(12)).toString('utf8')));
};
/** Where a bearing wheel's tread is against the ground under it, metres (it hangs: null). */
const treadGap = (rover, w, height) => {
  if (!w.contact) return null;
  const axle = new Vector3(0, 0, 1).applyQuaternion(w.wheel.getWorldQuaternion(new Quaternion()));
  const up = new Vector3(0, 1, 0).applyQuaternion(rover.body.getWorldQuaternion(new Quaternion()));
  const tread = w.wheel.getWorldPosition(new Vector3()).addScaledVector(up.addScaledVector(axle, -up.dot(axle)).normalize(), -w.radius);
  return tread.y - height(tread.x, tread.z);
};

for (const mission of [15, 16, 17]) {
  test(`Apollo ${mission} drives, steers at both axles, brakes and keeps its tyres on the slope`, () => {
    const ground = { radius: 100, height: (x, z) => x * 0.12 + Math.sin(z * 2) * 0.09, blocked: (x) => x < -3 };
    const rover = new LunarRover(modelOf(mission), ground);
    const step = (pedal, steer, brake = false, steps = 120) => {
      for (let i = 0; i < steps; i++) rover.drive(pedal, steer, brake, 1 / 60);
    };
    // four seconds up a slope of 1 in 8 under the Moon's gravity: what its motors and the ground give it
    step(1, 0, false, 240);
    assert.ok(rover.motion.x > 2.5 && rover.motion.speed > 1, `up the slope: ${rover.motion.x.toFixed(2)} m, ${rover.motion.speed.toFixed(2)} m/s`);
    assert.ok(rover.wheels.every((w) => w.phase < (-0.9 * rover.motion.x) / w.radius));
    step(1, 1, false, 40);
    const [fl, fr, rl, rr] = rover.wheels;
    assert.ok(fl.steer.rotation.y > fr.steer.rotation.y && fr.steer.rotation.y > 0);
    assert.ok(rl.steer.rotation.y < rr.steer.rotation.y && rr.steer.rotation.y < 0);
    assert.ok(rover.motion.heading > 0 && rover.motion.z < 0);
    for (const w of rover.wheels) {
      const gap = treadGap(rover, w, ground.height);
      assert.ok(gap !== null && Math.abs(gap) < 0.001, `${w.steer.name} ${gap}`);
    }
    step(0, 0, true);
    assert.equal(rover.motion.speed, 0);
    const at = rover.distance;
    step(0, 0, true);
    assert.equal(rover.distance, at);
    step(-1, 0);
    assert.ok(rover.motion.speed < 0 && rover.distance > at);
    const obstacle = new LunarRover(modelOf(mission), ground, { x: -2.9, z: 0, heading: Math.PI, distance: 0 });
    for (let i = 0; i < 180; i++) obstacle.drive(1, 0, false, 1 / 60);
    assert.ok(obstacle.motion.x >= -3 && obstacle.distance < 0.101);
  });
}

for (const mission of [15, 16, 17]) {
  test(`Apollo ${mission} independent suspension holds both ends of every moving link on uneven ground`, () => {
    const model = modelOf(mission);
    let amplitude = 0;
    const ground = { radius: 100, height: (x, z) => amplitude * Math.tanh(3 * x) * Math.tanh(3 * z) };
    const rover = new LunarRover(model, ground);
    const local = (n) => rover.body.worldToLocal(n.getWorldPosition(new Vector3()));
    const links = [];
    for (const id of ['FL', 'FR', 'RL', 'RR']) {
      for (const kind of ['Lower', 'Upper', 'Damper', 'Tie']) {
        const label = `LRV_Link_${id}_${kind}`;
        const inner = model.getObjectByName(label + '_In');
        const tip = model.getObjectByName(label + '_Out');
        const target = model.getObjectByName(`LRV_Mount_${id}_${kind}`);
        links.push({ id, kind, inner, tip, target, start: local(inner), end: local(tip), label });
      }
    }
    for (const bump of [-0.176, 0.176]) {
      amplitude = bump;
      for (let step = 0; step < 40; step++) rover.drive(0, Math.sign(bump), false, 1 / 60);
      for (const { id, kind, inner, tip, target, start, end, label } of links) {
        const from = local(inner),
          to = local(tip);
        assert.ok(start.distanceTo(from) < 0.0001, label + ' chassis pivot moved');
        assert.ok(to.distanceTo(local(target)) < 0.0001, label + ' missed moving attachment');
        // (on its springs the frame rides the twist as well as it can: each wheel goes up or down by most of a hand)
        assert.ok(Math.abs(to.y - end.y) > 0.04, label + ' stayed rigid through the bump');
        if (kind === 'Lower' || kind === 'Upper') {
          assert.ok(Math.abs(to.distanceTo(from) - end.distanceTo(start)) < 0.0001, label + ' wishbone stretched');
        } else if (kind === 'Damper') {
          const piston = model.getObjectByName('LRV_Piston_' + id),
            barrel = model.getObjectByName('LRV_Barrel_' + id);
          assert.ok(local(piston).distanceTo(to) < 0.0001 && local(barrel).distanceTo(from) < 0.0001, label + ' telescope detached');
          assert.ok(
            [piston, barrel].every((p) => Math.abs(p.getWorldScale(new Vector3()).y - 1) < 0.0001),
            label + ' damper component stretched',
          );
          assert.ok(to.distanceTo(from) < 1.32 * end.distanceTo(start), label + ' piston left its barrel');
        }
      }
    }
  });
}

test('Hadley tread contact stays on the survey surface through a full steering reversal', () => {
  const tile = readFileSync('public/lunar/hadley.terrain.bin');
  const terrain = new LunarTerrain(tile.buffer.slice(tile.byteOffset, tile.byteOffset + tile.byteLength));
  const height = (x, z) => terrain.height(x, z);
  const rover = new LunarRover(modelOf(15), { radius: 9000, height }, { x: 23.5, z: -77, heading: 0, distance: 0 });
  for (let i = 0; i < 100; i++) {
    rover.drive(0, i < 51 ? 1 : -1, false, 1 / 60);
    for (const wheel of rover.wheels) {
      const gap = treadGap(rover, wheel, height);
      assert.ok(gap !== null && Math.abs(gap) < 0.0001, `${wheel.wheel.name} ${gap}`);
    }
  }
});

test('on the level it is no faster than the handbook’s 14 km/h, and it gathers speed no harder than the ground gives in a sixth of a g', () => {
  const rover = new LunarRover(modelOf(15), { radius: 1000, height: () => 0 });
  let most = 0;
  let accel = 0;
  let last = 0;
  for (let i = 0; i < 60 * 30; i++) {
    rover.drive(1, 0, false, 1 / 60);
    most = Math.max(most, rover.motion.speed);
    accel = Math.max(accel, (rover.motion.speed - last) * 60);
    last = rover.motion.speed;
  }
  assert.ok(most <= 14 / 3.6 + 1e-9, `${(most * 3.6).toFixed(2)} km/h`);
  assert.ok(most > 13 / 3.6, `it reached only ${(most * 3.6).toFixed(2)} km/h in half a minute`);
  // (traction-limited at a start: the grip times the Moon's gravity, 0.6 x 1.62 m/s², estimated)
  assert.ok(accel < 1.0, `${accel.toFixed(2)} m/s²`);
});

test('at a crawl at full lock it turns within the handbook’s 122 in wall to wall; at speed it slides wide of its wheels', () => {
  const rover = new LunarRover(modelOf(15), { radius: 1000, height: () => 0 });
  // (the bicycle about its middle: its inner wheel's 50 degrees, LS006-002-2H section 1.3.4)
  assert.ok(Math.abs(rover.vehicle.chassis.lock - Math.atan(1.143 / (0.9144 + 1.143 / Math.tan((50 * Math.PI) / 180)))) < 1e-3);
  // lock to lock in 5.5 s
  assert.ok(Math.abs((2 * rover.vehicle.chassis.lock) / rover.vehicle.chassis.rate - 5.5) < 1e-6);
  // its wheels over to full lock where it stands, then once round at a crawl
  for (let i = 0; i < 60 * 4; i++) rover.drive(0, 1, false, 1 / 60);
  const points = [];
  const h0 = rover.motion.heading;
  for (let i = 0; i < 60 * 120 && rover.motion.heading - h0 < 2 * Math.PI; i++) {
    rover.drive(rover.motion.speed < 0.3 ? 1 : 0, 1, false, 1 / 60);
    points.push([rover.motion.x, rover.motion.z]);
  }
  assert.ok(rover.motion.heading - h0 >= 2 * Math.PI, 'it did not come round');
  // the middle of the circle its middle ran on (the mean of once round), and the furthest any of it reached from there:
  // the outer front fender's edge
  const cx = points.reduce((s, p) => s + p[0], 0) / points.length;
  const cz = points.reduce((s, p) => s + p[1], 0) / points.length;
  const middle = Math.hypot(rover.motion.x - cx, rover.motion.z - cz);
  const outer = Math.hypot(middle + 0.9144 + 0.1143, 1.143);
  assert.ok(Math.abs(outer - 122 * 0.0254) < 0.13, `wall to wall ${outer.toFixed(3)} m`);
  // at 12 km/h with full lock its turn is held to what the ground gives across: no tighter than v² / (0.6 g)
  const fast = new LunarRover(modelOf(15), { radius: 2000, height: () => 0 });
  for (let i = 0; i < 60 * 20; i++) fast.drive(fast.motion.speed < 12 / 3.6 ? 1 : 0, 0, false, 1 / 60);
  const v = fast.motion.speed;
  for (let i = 0; i < 60 * 4; i++) fast.drive(0, 1, false, 1 / 60);
  const h1 = fast.motion.heading;
  for (let i = 0; i < 60 * 2; i++) fast.drive(0, 1, false, 1 / 60);
  const rate = (fast.motion.heading - h1) / 2;
  assert.ok(fast.motion.steer > 0.5, 'its wheels went over');
  assert.ok(rate < (0.6 * 1.624) / Math.max(0.5, fast.motion.speed) + 1e-6, `it turned at ${rate.toFixed(3)} rad/s at ${v.toFixed(2)} m/s`);
});

test('in a sixth of a g it leaves the ground over a bump at speed, and comes down again on its springs', () => {
  // a ridge 20 cm high across its way, 1.5 m wide, 15 m on (estimated: a crater's rim)
  const ridge = (x) => 0.2 * Math.max(0, 1 - Math.abs(x - 15) / 0.75);
  const rover = new LunarRover(modelOf(15), { radius: 1000, height: (x) => ridge(x) });
  let lifted = 0;
  let down = 0;
  for (let i = 0; i < 60 * 20; i++) {
    rover.drive(1, 0, false, 1 / 60);
    const off = rover.wheels.filter((w) => !w.contact).length;
    if (off) lifted++;
    if (rover.motion.x > 25 && off === 0) down++;
  }
  assert.ok(rover.motion.x > 25, 'it did not get over');
  assert.ok(lifted > 6, `no wheel left the ground for more than a tenth of a second (${lifted} frames)`);
  assert.ok(down > 60, 'it did not come down on all four again');
});

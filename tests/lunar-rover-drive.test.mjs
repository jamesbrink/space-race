import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Quaternion, Vector3 } from 'three';
import { LunarRover } from '../src/viewer/lunar-rover.ts';
import { LunarTerrain } from '../src/world/lunar-terrain.ts';
import { hierarchy } from './glb.mjs';

for (const mission of [15, 16]) {
  test(`Apollo ${mission} drives, steers at both axles, brakes and keeps its tyres on the slope`, () => {
    const file = readFileSync(`public/models/usa/apollo/apollo-${mission}/rover.glb`);
    const model = hierarchy(JSON.parse(file.subarray(20, 20 + file.readUInt32LE(12)).toString('utf8')));
    const ground = { radius: 100, height: (x, z) => x * 0.12 + Math.sin(z * 2) * 0.09, blocked: (x) => x < -3 };
    const rover = new LunarRover(model, ground);
    const step = (pedal, steer, brake = false, steps = 120) => {
      for (let i = 0; i < steps; i++) rover.drive(pedal, steer, brake, 1 / 60);
    };
    step(1, 0);
    assert.ok(rover.motion.x > 4 && rover.motion.speed > 0);
    assert.ok(rover.wheels.every((w) => w.phase < -8));
    step(1, 1, false, 40);
    const [fl, fr, rl, rr] = rover.wheels;
    assert.ok(fl.steer.rotation.y > fr.steer.rotation.y && fr.steer.rotation.y > 0);
    assert.ok(rl.steer.rotation.y < rr.steer.rotation.y && rr.steer.rotation.y < 0);
    assert.ok(rover.motion.heading > 0 && rover.motion.z < 0);
    const up = new Vector3(0, 1, 0).applyQuaternion(rover.body.quaternion);
    for (const w of rover.wheels) {
      const axle = new Vector3(0, 0, 1).applyQuaternion(w.wheel.getWorldQuaternion(new Quaternion()));
      const tireUp = up.clone().addScaledVector(axle, -up.dot(axle)).normalize();
      const tread = w.wheel.getWorldPosition(new Vector3()).addScaledVector(tireUp, -w.radius);
      assert.ok(Math.abs(tread.y - ground.height(tread.x, tread.z)) < 0.001, w.steer.name);
    }
    step(0, 0, true);
    assert.equal(rover.motion.speed, 0);
    const at = rover.distance;
    step(0, 0, true);
    assert.equal(rover.distance, at);
    step(-1, 0);
    assert.ok(rover.motion.speed < 0 && rover.distance > at);
    const obstacle = new LunarRover(model, ground, { x: -2.9, z: 0, heading: Math.PI, distance: 0 });
    for (let i = 0; i < 180; i++) obstacle.drive(1, 0, false, 1 / 60);
    assert.ok(obstacle.motion.x >= -3 && obstacle.distance < 0.101);
  });
}

for (const mission of [15, 16]) {
  test(`Apollo ${mission} independent suspension holds both ends of every moving link on uneven ground`, () => {
    const file = readFileSync(`public/models/usa/apollo/apollo-${mission}/rover.glb`);
    const model = hierarchy(JSON.parse(file.subarray(20, 20 + file.readUInt32LE(12)).toString('utf8')));
    const ground = {
      radius: 100,
      height(x, z) {
        return amplitude * Math.tanh(3 * x) * Math.tanh(3 * z);
      },
    };
    let amplitude = 0;
    const rover = new LunarRover(model, ground);
    const local = (n) => rover.body.worldToLocal(n.getWorldPosition(new Vector3()));
    const links = [];
    for (const id of ['FL', 'FR', 'RL', 'RR']) {
      for (const kind of ['Lower', 'Upper', 'Damper', 'Tie']) {
        const label = `LRV_Link_${id}_${kind}`;
        const inner = model.getObjectByName(label + '_In');
        const tip = model.getObjectByName(label + '_Out');
        const target = model.getObjectByName(`LRV_Mount_${id}_${kind}`);
        const start = local(inner),
          end = local(tip);
        links.push({ id, kind, inner, tip, target, start, end, label });
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
        assert.ok(Math.abs(to.y - end.y) > 0.08, label + ' stayed rigid through the bump');
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
  const file = readFileSync('public/models/usa/apollo/apollo-15/rover.glb');
  const model = hierarchy(JSON.parse(file.subarray(20, 20 + file.readUInt32LE(12)).toString('utf8')));
  const tile = readFileSync('public/lunar/hadley.terrain.bin');
  const terrain = new LunarTerrain(tile.buffer.slice(tile.byteOffset, tile.byteOffset + tile.byteLength));
  const rover = new LunarRover(
    model,
    { radius: 9000, height: (x, z) => terrain.height(x, z) },
    { x: 23.5, z: -77, heading: 0, distance: 0 },
  );
  for (let i = 0; i < 100; i++) {
    rover.drive(0, i < 51 ? 1 : -1, false, 1 / 60);
    for (const wheel of rover.wheels) {
      const axle = new Vector3(0, 0, 1).applyQuaternion(wheel.wheel.getWorldQuaternion(new Quaternion()));
      const up = new Vector3(0, 1, 0).applyQuaternion(rover.body.quaternion);
      const contact = wheel.wheel
        .getWorldPosition(new Vector3())
        .addScaledVector(up.addScaledVector(axle, -up.dot(axle)).normalize(), -wheel.radius);
      assert.ok(Math.abs(contact.y - terrain.height(contact.x, contact.z)) < 0.0001, wheel.wheel.name);
    }
  }
});

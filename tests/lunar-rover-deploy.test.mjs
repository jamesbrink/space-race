// The rover as it came off its LM (missions/usa/apollo/vehicles/lrv_deploy.py; rover-gallery.ts `deployment`): held to
// its built models, read from their JSON alone.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Box3, Quaternion, Vector3 } from 'three';
import { LANDER_PLACE, roverModel } from '../missions/usa/apollo/vehicles/rover-gallery.ts';
import { framesOf, hierarchy } from './glb.mjs';

const gltfOf = (url) => {
  const file = readFileSync(url);
  return JSON.parse(file.subarray(20, 20 + file.readUInt32LE(12)).toString('utf8'));
};
/** A node's motion (types.ts Move `run`) at a sample: how far it has moved and how it has turned. */
const sample = (run, i) => {
  const a = 7 * (i < 0 ? run.length / 7 + i : i);
  return { by: new Vector3(run[a], run[a + 1], run[a + 2]), turn: new Quaternion(run[a + 3], run[a + 4], run[a + 5], run[a + 6]) };
};
const LANDERS = { 15: ['falcon', 'LM10'], 16: ['orion', 'LM11'], 17: ['challenger', 'LM12'] };

for (const mission of [15, 16, 17]) {
  test(`Apollo ${mission}'s rover is to the vehicle contract and comes out of quadrant I of its LM`, () => {
    const url = `public/models/usa/apollo/apollo-${mission}/rover.glb`;
    const root = hierarchy(gltfOf(url));
    const lrv = root.getObjectByName('LRV');
    assert.ok(lrv, 'no vehicle node');
    const u = lrv.userData;
    assert.equal(u.vehicle, 'Lunar Roving Vehicle');
    assert.equal(u.suspension, 'wishbone');
    assert.ok(u.rear_steer && u.inner_lock === 50 && u.steer_time === 5.5);
    // (the site stands it by the figure quoted in rover-gallery.ts: the model's own)
    u.lander_place.forEach((v, i) => assert.ok(Math.abs(v - LANDER_PLACE[i]) < 1e-4, `lander_place[${i}] ${v} against ${LANDER_PLACE[i]}`));
    const deploy = roverModel(mission).lunarRover.deploy;
    const moves = deploy.parts[0].moves;
    for (const move of moves) {
      const node = root.getObjectByName(move.node);
      assert.ok(node, `no node ${move.node}`);
      if (move.kind === 'run') assert.ok(Array.isArray(node.userData.run) && node.userData.run.length % 7 === 0 && node.userData.run.length >= 14, move.node);
    }
    for (const fn of deploy.parts[0].functions) for (const n of fn.nodes) assert.ok(moves.some((m) => m.node === n), `${fn.name}: ${n} has no move`);
    // deployed, the two motions that carry the whole of it come to nothing: it stands as built
    const tilt = sample(root.getObjectByName('LRV_Tilt').userData.run, -1);
    const lower = sample(root.getObjectByName('LRV_Lower').userData.run, -1);
    const end = tilt.turn.clone().multiply(lower.turn);
    const at = lower.by.clone().applyQuaternion(tilt.turn).add(tilt.by);
    assert.ok(at.length() < 0.001, `deployed it is ${at.length().toFixed(4)} m from where it was built`);
    assert.ok(end.angleTo(new Quaternion()) < 0.002, 'deployed it is turned from how it was built');
    for (const c of ['LRV_Fore', 'LRV_Aft', 'LRV_Corner_FL', 'LRV_Corner_FR', 'LRV_Corner_RL', 'LRV_Corner_RR'])
      assert.ok(sample(root.getObjectByName(c).userData.run, -1).turn.angleTo(new Quaternion()) < 1e-4, `${c} is not unfolded`);
    // stowed, its floor is where its LM's model has the folded rover's centre frame (lm10_equipment.rover)
    const rover = framesOf(url);
    const floor = rover.box('LRV_BeadedFloor');
    const middle = new Vector3(...floor.lo).add(new Vector3(...floor.hi)).multiplyScalar(0.5);
    const stowed = sample(root.getObjectByName('LRV_Tilt').userData.run, 0);
    const place = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), LANDER_PLACE[3]);
    const inLander = middle.applyQuaternion(stowed.turn).add(stowed.by).applyQuaternion(place).add(new Vector3(...LANDER_PLACE.slice(0, 3)));
    const [lander, prefix] = LANDERS[mission];
    const folded = framesOf(`public/models/usa/apollo/apollo-${mission}/${lander}.glb`).box(`${prefix}_CenterChassis`);
    const bay = new Box3(new Vector3(...folded.lo), new Vector3(...folded.hi));
    const centre = bay.getCenter(new Vector3());
    // (along the bay's face and up it, to 5 cm; out of its face, within the folded frame's thickness and the floor's)
    const off = inLander.clone().sub(centre);
    assert.ok(Math.abs(off.y) < 0.05, `stowed, its floor's middle is ${off.y.toFixed(3)} m off the bay's height`);
    assert.ok(Math.hypot(off.x, off.z) < 0.12, `stowed, its floor's middle is ${Math.hypot(off.x, off.z).toFixed(3)} m from the folded rover's`);
  });
}

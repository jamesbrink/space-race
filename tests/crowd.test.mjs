// src/viewer/onfoot/crowd.ts: a group's people walked on the clock (Part `going`), each a node of his own with the crew's
// joints carrying his number (crew/ground_party.py `Walkers`). Where each is follows the clock and nothing else; standing he
// is as built; walking his legs are the gait's for the distance gone; out of sight he is shrunk to nothing, and the group's
// meshes are not drawn once all of them are.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { aside, Crowd, cyclesAt } from '../src/viewer/onfoot/crowd.ts';
import { cycleLength, Gait } from '../src/viewer/onfoot/gait.ts';
import { endOf, PACE } from '../src/viewer/onfoot/going.ts';

const m = (value) => ({ value, confidence: 'estimated', source: 'a test' });
/** The crew's joints, where a man's are standing (metres from the joint above, his left +X, facing +Z), each with its parent. */
const JOINTS = {
  Hips: [null, 0, 0.95, 0],
  Spine: ['Hips', 0, 0.12, 0],
  Head: ['Spine', 0, 0.5, 0],
  'UpperArm.L': ['Spine', 0.19, 0.38, 0],
  'LowerArm.L': ['UpperArm.L', 0.03, -0.3, 0],
  'Hand.L': ['LowerArm.L', 0.01, -0.25, 0],
  'UpperArm.R': ['Spine', -0.19, 0.38, 0],
  'LowerArm.R': ['UpperArm.R', -0.03, -0.3, 0],
  'Hand.R': ['LowerArm.R', -0.01, -0.25, 0],
  'UpperLeg.L': ['Hips', 0.1, -0.03, 0],
  'LowerLeg.L': ['UpperLeg.L', 0.01, -0.44, 0],
  'Foot.L': ['LowerLeg.L', 0.02, -0.4, 0],
  'UpperLeg.R': ['Hips', -0.1, -0.03, 0],
  'LowerLeg.R': ['UpperLeg.R', -0.01, -0.44, 0],
  'Foot.R': ['LowerLeg.R', -0.02, -0.4, 0],
};

/** A model with one group of `n` people standing in a row along +X (or where `spot(i)` puts the i-th), facing -Z, named as the loader names them. */
function model(n, spot = (i) => [i * 1.0, 0]) {
  const root = new THREE.Group();
  const group = new THREE.Group();
  group.name = 'G';
  group.position.set(5, 0, 2);
  const people = new THREE.Group();
  people.name = 'G_People';
  root.add(group);
  group.add(people);
  for (let i = 1; i <= n; i++) {
    const person = new THREE.Bone();
    person.name = `G_Person_${i}`;
    const [x, z] = spot(i);
    person.position.set(x, 0, z);
    person.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
    people.add(person);
    const made = {};
    for (const [joint, [parent, x, y, z]] of Object.entries(JOINTS)) {
      const bone = new THREE.Bone();
      // (the loader drops the dot from a name: UpperArmL_3)
      bone.name = `${joint.replace('.', '')}_${i}`;
      bone.position.set(x, y, z);
      (parent ? made[parent] : person).add(bone);
      made[joint] = bone;
    }
  }
  root.updateMatrixWorld(true);
  return { root, group };
}

const OFF = {
  kind: 'leaves',
  at: m(100),
  stagger: 1,
  way: [
    [0, 10],
    [-50, 10],
  ],
  confidence: 'estimated',
  source: 'a test',
};

test('a joint with a number after it is one of a group’s people’s, found within his own node', () => {
  const { root } = model(2);
  const person = root.getObjectByName('G_Person_2');
  const limbs = new Gait().limbsOf(person);
  assert.ok(Math.abs(limbs.thigh - 0.44) < 0.01 && Math.abs(limbs.shin - 0.4) < 0.01, JSON.stringify(limbs));
});

test('standing he is as built; walking he is on his way with his legs going; at its end he is out of sight', () => {
  const { root, group } = model(3);
  const crowd = new Crowd(root, group, [OFF], null);
  assert.equal(crowd.people, 3);
  const person = root.getObjectByName('G_Person_1');
  const home = person.position.clone();
  crowd.set(50);
  assert.ok(person.position.equals(home) && person.scale.x === 1, 'standing where he was built');
  person.traverse((bone) => {
    if (bone !== person) assert.ok(Math.abs(bone.quaternion.w) > 1 - 1e-12, `${bone.name} unturned`);
  });
  crowd.set(110);
  assert.ok(person.position.distanceTo(home) > 1, 'walking');
  const thigh = root.getObjectByName('UpperLegL_1');
  const knee = root.getObjectByName('LowerLegL_1');
  assert.ok(thigh.quaternion.w < 1 - 1e-6 || knee.quaternion.w < 1 - 1e-6, 'his legs going');
  crowd.set(10000);
  assert.equal(person.scale.x, 0, 'out of sight');
});

test('the same instant is the same pose, however it was come to; and from frame to frame he goes no faster than a walk', () => {
  const a = model(3);
  const b = model(3);
  const one = new Crowd(a.root, a.group, [OFF], null);
  const two = new Crowd(b.root, b.group, [OFF], null);
  for (let t = 90; t < 130; t += 1 / 60) one.set(t);
  two.set(5000);
  two.set(129.99);
  one.set(129.99);
  const pa = a.root.getObjectByName('G_Person_2');
  const pb = b.root.getObjectByName('G_Person_2');
  assert.ok(pa.position.distanceTo(pb.position) < 1e-9 && pa.quaternion.angleTo(pb.quaternion) < 1e-9, 'the same place');
  const ka = a.root.getObjectByName('LowerLegL_2').quaternion;
  const kb = b.root.getObjectByName('LowerLegL_2').quaternion;
  assert.ok(ka.angleTo(kb) < 1e-9, 'the same pose');
  const was = new THREE.Vector3();
  let most = 0;
  let worst = 0;
  one.set(98.9);
  for (let t = 99; t < 160; t += 1 / 60) {
    was.copy(pa.position);
    one.set(t);
    if (pa.scale.x && pa.position.distanceTo(was) > most) [most, worst] = [pa.position.distanceTo(was), t];
  }
  assert.ok(most <= (PACE / 60) * 1.05, `at most ${(most * 60).toFixed(2)} m/s at ${worst}`);
});

test('a group that walks to another place stands there facing what it was sent to face, and goes on from there', () => {
  const { root, group } = model(2);
  const to = { ...OFF, way: [[8, 0]], to: [6, 0], faces: [100, 2] };
  const later = { ...OFF, at: m(400) };
  const crowd = new Crowd(root, group, [to, later], null);
  const person = root.getObjectByName('G_Person_1');
  const built = person.getWorldPosition(new THREE.Vector3());
  crowd.set(300);
  root.updateMatrixWorld(true);
  const there = person.getWorldPosition(new THREE.Vector3());
  assert.ok(Math.abs(there.x - built.x - 6) < 1e-9 && Math.abs(there.z - built.z) < 1e-9, 'moved by `to`');
  const ahead = new THREE.Vector3(0, 0, 1).applyQuaternion(person.quaternion);
  assert.ok(ahead.x > 0.99, 'facing +X, toward what it faces');
  crowd.set(401);
  root.updateMatrixWorld(true);
  assert.ok(person.getWorldPosition(new THREE.Vector3()).distanceTo(there) < 2, 'setting off from there, not from where it was built');
});

test('the group’s meshes are not drawn once every one of them is out of sight', () => {
  const { root, group } = model(1);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial());
  group.getObjectByName('G_People').add(mesh);
  mesh.bind(new THREE.Skeleton([root.getObjectByName('G_Person_1')]));
  const crowd = new Crowd(root, group, [OFF], null);
  crowd.set(110);
  assert.ok(mesh.visible && mesh.boundingSphere.radius > 1, 'drawn, its bounds where he is');
  crowd.set(endOf(OFF, [6, 2], 0) + 10);
  assert.equal(mesh.visible, false);
});

test('a way laid to one side keeps its distance from it, corners and all', () => {
  const way = [
    [0, 0],
    [10, 0],
    [10, 10],
  ];
  const left = aside(way, 1);
  // (the model's frame: x east, z south; going east, the left is north, -z)
  assert.deepEqual(left[0], [0, -1]);
  assert.ok(Math.abs(left[1][0] - 11) < 1e-9 && Math.abs(left[1][1] + 1) < 1e-9, `the corner: ${left[1]}`);
  assert.deepEqual(aside(way, 0), way);
});

test('the stride’s cycles go with the distance walked: at a steady pace, a cycle a stride', () => {
  const length = 100;
  const leg = 0.9;
  const tau = 30;
  const steady = cyclesAt(tau + 1, PACE, length, leg) - cyclesAt(tau, PACE, length, leg);
  assert.ok(Math.abs(steady - PACE / cycleLength(PACE, leg)) < 1e-9);
  let was = 0;
  for (let t = 0; t < 80; t += 0.01) {
    const now = cyclesAt(t, PACE, length, leg);
    assert.ok(now >= was - 1e-12, 'never backward');
    was = now;
  }
});

test('a body of people leaving by one way: none walks through another, the back rows with further to go as well', () => {
  // six rows of eight, 1.1 m apart, the way's first point off one corner of the body and the way going off past it
  const { root, group } = model(48, (i) => [((i - 1) % 8) * 1.1, Math.floor((i - 1) / 8) * 1.2]);
  const off = {
    ...OFF,
    stagger: 0.8,
    way: [
      [-3, 9],
      [-40, 9],
      [-300, 9],
    ],
  };
  const crowd = new Crowd(root, group, [off], null);
  const people = Array.from({ length: 48 }, (_, i) => root.getObjectByName(`G_Person_${i + 1}`));
  const p = people.map(() => new THREE.Vector3());
  let least = Number.POSITIVE_INFINITY;
  let when = '';
  for (let t = 99; t < 400; t += 0.1) {
    crowd.set(t);
    root.updateMatrixWorld(true);
    people.forEach((o, i) => o.getWorldPosition(p[i]));
    for (let i = 0; i < 48; i++)
      for (let j = i + 1; j < 48; j++) {
        if (!people[i].scale.x || !people[j].scale.x) continue;
        const d = Math.hypot(p[i].x - p[j].x, p[i].z - p[j].z);
        if (d < least) [least, when] = [d, `${people[i].name} and ${people[j].name} at ${t.toFixed(1)}`];
      }
  }
  assert.ok(least >= 0.6, `${least.toFixed(2)} m apart: ${when}`);
});

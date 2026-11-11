import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { JOINTS } from '../src/viewer/gait.ts';
import { Limp, POINTS, Ragdoll } from '../src/viewer/ragdoll.ts';

/** A stick figure with the fifteen joints where a 1.8 m man has them, standing as built. */
function figure() {
  const root = new THREE.Group();
  const made = {};
  const add = (name, parent, x, y, z) => {
    const o = new THREE.Object3D();
    o.name = name;
    o.position.set(x, y, z);
    (made[parent] ?? root).add(o);
    made[name] = o;
    return o;
  };
  add('Hips', null, 0, 0.98, 0);
  add('Spine', 'Hips', 0, 0.15, 0);
  add('Head', 'Spine', 0, 0.5, 0);
  for (const [s, x] of [
    ['L', 1],
    ['R', -1],
  ]) {
    add(`UpperArm${s}`, 'Spine', 0.2 * x, 0.4, 0);
    add(`LowerArm${s}`, `UpperArm${s}`, 0, -0.3, 0);
    add(`Hand${s}`, `LowerArm${s}`, 0, -0.27, 0);
    add(`UpperLeg${s}`, 'Hips', 0.09 * x, -0.05, 0);
    add(`LowerLeg${s}`, `UpperLeg${s}`, 0, -0.43, 0);
    add(`Foot${s}`, `LowerLeg${s}`, 0, -0.42, 0);
  }
  root.updateMatrixWorld(true);
  return { root, made };
}
/** A flat floor at a height, with a wall beyond x = 2. */
const world =
  (floor = 0) =>
  (p, r) => {
    const out = new THREE.Vector3();
    if (p.y < floor + r) {
      p.y = floor + r;
      out.y = 1;
    }
    if (p.x > 2 - r) {
      p.x = 2 - r;
      out.x = -1;
    }
    return out.lengthSq() ? out.normalize() : null;
  };
const rest = () => {
  const { root } = figure();
  return Ragdoll.of(root);
};

test('a figure without all its joints is not a ragdoll, and one with them is', () => {
  assert.ok(rest());
  const lacking = new THREE.Group();
  lacking.add(Object.assign(new THREE.Object3D(), { name: 'Hips' }));
  assert.equal(Ragdoll.of(lacking), null);
  assert.equal(POINTS.slice(0, 15).join(), JOINTS.join(), "its first fifteen points are the joints, in the gait's own order");
});

test('thrown from a height it keeps its bones their length, stays out of the floor, and comes to rest', () => {
  const doll = rest();
  doll.throw(new THREE.Vector3(2, -8, 0.5));
  // lift it: start four metres up
  doll.shift(new THREE.Vector3(0, 4, 0));
  let worst = 0;
  let t = 0;
  let lowest = Infinity;
  while (!doll.atRest && t < 10) {
    doll.step(1 / 60, world());
    worst = Math.max(worst, doll.strain);
    lowest = Math.min(lowest, ...doll.points.map((p) => p.y));
    t += 1 / 60;
  }
  assert.ok(doll.atRest && t < 6.9, `at rest by its own account after ${t} s`);
  assert.ok(worst < 0.25, `no stick is ever stretched or crushed by a quarter, even as it hits: ${worst}`);
  assert.ok(doll.strain < 0.03, `and lying still every stick is within 3% of its length: ${doll.strain}`);
  assert.ok(lowest >= 0.055, `nothing went into the floor: ${lowest}`);
  assert.ok(doll.hips.y < 0.4, `it is lying down: hips at ${doll.hips.y}`);
  assert.ok(Math.max(...doll.points.map((p) => p.x)) <= 2, 'and the wall held it');
  const [hx, hz] = doll.headward;
  assert.ok(Math.abs(Math.hypot(hx, hz) - 1) < 1e-6 && typeof doll.faceDown === 'boolean');
});

test('the bones are laid along the points: each joint is where its point is', () => {
  const { root, made } = figure();
  const doll = Ragdoll.of(root);
  doll.throw(new THREE.Vector3(1, -6, 0));
  for (let i = 0; i < 90; i++) doll.step(1 / 60, world());
  const p = doll.points;
  for (const [i, name] of POINTS.slice(0, 15).entries()) {
    const at = made[name.replace('.', '')].getWorldPosition(new THREE.Vector3());
    // a bone is as long as it was built; its point may be a few per cent off that while the sticks are still settling
    assert.ok(
      at.distanceTo(p[i]) < 0.06,
      `${name}: bone at ${at.toArray().map((v) => v.toFixed(2))}, point at ${p[i].toArray().map((v) => v.toFixed(2))}`,
    );
  }
});

test('a limp figure standing on a floor with nothing pushing it folds up and lies still, and does not gain energy', () => {
  const { root } = figure();
  const doll = Ragdoll.of(root);
  doll.throw(new THREE.Vector3(0, 0, 0));
  let fastest = 0;
  for (let i = 0; i < 600; i++) {
    doll.step(1 / 60, world());
    if (i > 240) fastest = Math.max(fastest, doll.speed);
  }
  assert.ok(doll.atRest && fastest < 1.5, `still after four seconds: ${fastest} m/s at most`);
});

test('the solver alone: two points and a stick fall as one and stop on the floor a stick apart', () => {
  const limp = new Limp(POINTS.map((_, i) => new THREE.Vector3(i * 0.2, 1, 0)));
  limp.throw(
    limp.points.map((_, i) => new THREE.Vector3(i * 0.2, 1, 0)),
    new THREE.Vector3(),
    new THREE.Vector3(),
  );
  for (let i = 0; i < 300; i++) limp.step(1 / 60, world());
  assert.ok(limp.strain() < 0.05 && limp.speed < 1);
  for (const p of limp.points) assert.ok(p.y > 0.05);
});

test('a knee never bends forward nor an elbow back, and a thigh does not swing far behind the trunk, however it lands', () => {
  const P = (doll, name) => doll.points[POINTS.indexOf(name)];
  // how far a joint lies on the wrong side of the line between the ends of its limb, as a fraction of that line
  const wrong = (doll, [a, b, c, side, l, r]) => {
    const line = P(doll, c).clone().sub(P(doll, a));
    const length = line.length();
    line.divideScalar(length);
    const h = P(doll, l).clone().sub(P(doll, r));
    const across = h.length();
    h.addScaledVector(line, -h.dot(line));
    if (h.length() < 0.7 * across) return 0; // (along the trunk's left and right, which way is its front is not defined)
    const n = line.clone().cross(h.normalize());
    return Math.max(0, -P(doll, b).clone().sub(P(doll, a)).dot(n) * side) / length;
  };
  const limbs = ['L', 'R'].flatMap((s) => [
    [`UpperLeg.${s}`, `LowerLeg.${s}`, `Foot.${s}`, 1, 'UpperLeg.L', 'UpperLeg.R'],
    [`UpperArm.${s}`, `LowerArm.${s}`, `Hand.${s}`, -1, 'UpperArm.L', 'UpperArm.R'],
  ]);
  const hips = ['L', 'R'].map((s) => ['Spine', `UpperLeg.${s}`, `LowerLeg.${s}`, -1, 'UpperLeg.L', 'UpperLeg.R']);
  for (const v of [
    [0, -8, 0],
    [3, -8, 0],
    [-3, -10, 1],
    [0.5, -6, -4],
    [4, -3, 2],
  ]) {
    const doll = rest();
    doll.throw(new THREE.Vector3(...v));
    doll.shift(new THREE.Vector3(0, 3, 0));
    let worst = 0;
    let lying = 0;
    let behind = 0;
    for (let i = 0; i < 360; i++) {
      doll.step(1 / 60, world());
      // (as it hits, a frame may catch a limb on its way back from being flung: lying, none is)
      for (const limb of limbs) worst = Math.max(worst, wrong(doll, limb));
      if (doll.atRest) for (const limb of limbs) lying = Math.max(lying, wrong(doll, limb));
      if (doll.atRest) for (const hip of hips) behind = Math.max(behind, wrong(doll, hip));
    }
    assert.ok(doll.atRest, `thrown at ${v}: it comes to rest`);
    assert.ok(
      worst < 0.2 && lying < 0.08,
      `thrown at ${v}: a joint bent the wrong way by ${worst} of its limb, and by ${lying} lying still`,
    );
    assert.ok(behind < 0.15, `thrown at ${v}: lying, a thigh is swung behind the trunk by ${behind}`);
  }
});

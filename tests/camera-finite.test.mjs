// The camera is never put somewhere that is not a number (src/viewer/camera/maths.ts `plumbIn`, `finitePose`; index.ts
// `update`). A view of the whole Earth turns about its centre, where the ellipsoid has no normal: the plumb line there was
// not a number, every rig framed on it went the same way, and the page drew nothing (Soyuz 3, the path test's view from
// far out and then the chase). There the plumb line is the scene's up; and a pose that is not a number is not used.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { finitePose, plumbIn } from '../src/viewer/camera/maths.ts';
import { ellipsoidNormal } from '../src/world/surface.ts';

const AXES = [
  [1, 0, 0],
  [0, 0, 1],
  [0, -1, 0],
];

test('at the Earth’s centre there is no normal, and the plumb line is the scene’s up', () => {
  assert.ok(ellipsoidNormal([0, 0, 0]).some(Number.isNaN), 'the ellipsoid has no normal at its centre');
  const up = plumbIn(ellipsoidNormal([0, 0, 0]), AXES, new THREE.Vector3());
  assert.deepEqual(up.toArray(), [0, 1, 0]);
});

test('elsewhere the plumb line is the normal in the scene’s axes', () => {
  // (on the equator at Greenwich the normal is the first axis: the scene's +X)
  const n = ellipsoidNormal([6_378_137, 0, 0]);
  const up = plumbIn(n, AXES, new THREE.Vector3());
  assert.ok(Math.abs(up.x - 1) < 1e-12 && Math.abs(up.y) < 1e-12 && Math.abs(up.z) < 1e-12, up.toArray().join());
});

test('a pose that is not a number is told from one that is', () => {
  const good = { position: new THREE.Vector3(1, 2, 3), quaternion: new THREE.Quaternion() };
  assert.ok(finitePose(good));
  assert.ok(!finitePose({ ...good, position: new THREE.Vector3(Number.NaN, 0, 0) }));
  assert.ok(!finitePose({ ...good, quaternion: new THREE.Quaternion(Number.NaN, 0, 0, 1) }));
});

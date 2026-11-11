import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { Flyer, flySpeed } from '../src/viewer/fly.ts';

test('a free camera flies faster the higher it is, up to a limit', () => {
  assert.ok(flySpeed(0, false) > 0);
  assert.ok(flySpeed(100, false) > flySpeed(2, false));
  assert.equal(flySpeed(1e6, false), flySpeed(1e7, false));
  assert.ok(flySpeed(10, true) > flySpeed(10, false));
});

test('it goes where it is looking, keeps its heading, and stays above its floor', () => {
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 10, 0);
  camera.lookAt(10, 10, 0); // along +x, level
  const flyer = new Flyer();
  flyer.read(camera);
  const target = new THREE.Vector3(10, 10, 0);
  flyer.drive(camera, new Set(['w']), false, 1, 0.35, 0);
  flyer.aim(camera, target, false);
  assert.ok(camera.position.x > 1 && Math.abs(camera.position.z) < 1e-6 && Math.abs(camera.position.y - 10) < 1e-6);
  assert.ok(target.x > camera.position.x, 'what orbiting would turn about stays ahead of the camera');
  flyer.drive(camera, new Set(['q']), false, 100, 0.35, 0);
  assert.equal(camera.position.y, 0.35);
});

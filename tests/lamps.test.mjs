import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { Lamps } from '../src/viewer/lamps.ts';

/** A site with more rooms than there are room lights, in a row 20 m apart, on something that can be moved. */
function site(rooms = 8) {
  const scene = new THREE.Scene();
  const building = new THREE.Group();
  for (let i = 0; i < rooms; i++) {
    const room = new THREE.Object3D();
    room.name = `Light_Room_${i}`;
    room.position.set(i * 20, 2, 0);
    building.add(room);
  }
  scene.add(building);
  scene.updateMatrixWorld(true);
  const lamps = new Lamps();
  lamps.add(building, scene);
  const lights = scene.children.filter((o) => o.isPointLight);
  return { scene, building, lamps, lights };
}

/** Hand the lights round until nothing more changes (a light takes a moment to come on: the clock is put on a tenth of a second each time). */
function settle(lamps, eye) {
  const real = performance.now;
  let now = real.call(performance);
  performance.now = () => now;
  try {
    for (let i = 0; i < 200; i++) {
      now += 100;
      if (!lamps.near(eye) && !lamps.near(eye)) return;
    }
  } finally {
    performance.now = real;
  }
  assert.fail('the lights never settled');
}

/** How many lists are sorted during `run`: the lights are handed round by sorting the rooms by distance. */
function sorted(run) {
  let n = 0;
  const own = Array.prototype.sort;
  Array.prototype.sort = function (...args) {
    n++;
    return own.apply(this, args);
  };
  try {
    run();
  } finally {
    Array.prototype.sort = own;
  }
  return n;
}

test('with the eye and the rooms where they were and the lights settled, handing them round again does nothing', () => {
  const { building, lamps, lights } = site();
  assert.ok(lights.length > 0 && lights.length < building.children.length, 'fewer lights than rooms');
  const eye = new THREE.Vector3(1, 1.7, 3);
  settle(lamps, eye);
  const lit = lights.map((l) => [l.position.clone(), l.intensity]);
  assert.ok(
    lights.some((l) => l.intensity > 0 && l.position.distanceTo(new THREE.Vector3(0, 2, 0)) < 1e-9),
    'the room beside the eye is lit',
  );
  assert.equal(
    sorted(() => assert.equal(lamps.near(eye.clone()), false)),
    0,
    'nothing was handed round',
  );
  lights.forEach((l, i) => {
    assert.ok(l.position.equals(lit[i][0]));
    assert.equal(l.intensity, lit[i][1]);
  });
});

test('the eye moving, or a room, is seen at once', () => {
  const { building, lamps, lights } = site();
  const eye = new THREE.Vector3(1, 1.7, 3);
  settle(lamps, eye);
  // the eye goes to the far end: the lights are handed to the rooms there
  const far = new THREE.Vector3(141, 1.7, 3);
  assert.ok(sorted(() => lamps.near(far)) > 0, 'the eye moved: handed round again');
  settle(lamps, far);
  assert.ok(
    lights.some((l) => l.intensity > 0 && l.position.distanceTo(new THREE.Vector3(140, 2, 0)) < 1e-9),
    'the room at the far end is lit',
  );
  // the building moves: seen the same frame, before anything has brought its world matrices up to date
  building.position.z = 5;
  assert.equal(lamps.near(far), true, 'a room moved: its light goes with it');
  assert.ok(lights.some((l) => l.position.distanceTo(new THREE.Vector3(140, 2, 5)) < 1e-9));
  settle(lamps, far);
  // and `place` (hardware moved by hand) always hands them round again
  assert.ok(sorted(() => lamps.place()) > 0);
});

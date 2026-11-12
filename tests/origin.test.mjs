import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { absolute, Origin, uOrigin } from '../src/viewer/origin.ts';

/** A scene far from its origin, with the two kinds of light the draw has to mind, and a stand-in for the renderer. */
function world() {
  const scene = new THREE.Scene();
  const thing = new THREE.Mesh();
  thing.position.set(31234.5, 12.25, -8123.75);
  const sun = new THREE.DirectionalLight();
  sun.castShadow = true;
  const sky = new THREE.HemisphereLight();
  sky.position.set(0.2, 1, 0.1);
  scene.add(thing, sun, sun.target, sky);
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(31230.125, 14, -8120.5);
  const plane = new THREE.Plane(new THREE.Vector3(1, 0, 0), -31234);
  const renderer = { shadowMap: { needsUpdate: false, autoUpdate: false } };
  scene.updateMatrixWorld();
  camera.updateMatrixWorld();
  return { scene, thing, sun, sky, camera, plane, renderer, origin: new Origin(renderer, scene, camera, [plane], [sun, sky]) };
}

test('the draw sees everything from the eye, and everything is back where it was to the last bit', () => {
  const { scene, thing, sky, camera, plane, origin } = world();
  const eye = camera.position.clone();
  const before = {
    thing: thing.matrixWorld.clone(),
    camera: camera.matrixWorld.clone(),
    sky: sky.position.clone(),
    constant: plane.constant,
  };
  let drawn = false;
  origin.draw(() => {
    drawn = true;
    scene.updateMatrixWorld(); // (as the renderer does)
    assert.deepEqual(camera.position.toArray(), [0, 0, 0]);
    assert.deepEqual(new THREE.Vector3().setFromMatrixPosition(thing.matrixWorld).toArray(), thing.position.clone().sub(eye).toArray());
    assert.deepEqual(uOrigin.value, { x: eye.x, y: eye.y, z: eye.z });
    // a hemisphere light's place is a direction: the scene's move must not turn it
    assert.ok(new THREE.Vector3().setFromMatrixPosition(sky.matrixWorld).distanceTo(before.sky) < 1e-9);
    // a point on the cutaway's plane is still on it
    assert.ok(Math.abs(plane.distanceToPoint(new THREE.Vector3(31234, 0, 0).sub(eye))) < 1e-9);
    // and what is read during the draw can be put back
    assert.deepEqual(absolute(new THREE.Vector3().setFromMatrixPosition(thing.matrixWorld)).toArray(), thing.position.toArray());
  });
  assert.ok(drawn);
  assert.deepEqual(thing.matrixWorld.toArray(), before.thing.toArray());
  assert.deepEqual(camera.matrixWorld.toArray(), before.camera.toArray());
  assert.deepEqual(sky.position.toArray(), before.sky.toArray());
  assert.equal(plane.constant, before.constant);
});

test('a shadow map drawn from one eye is looked up from another', () => {
  const { sun, camera, renderer, origin } = world();
  const eye1 = camera.position.clone();
  // the frame the map is drawn: three leaves the lookup for eye-relative positions
  const drawnAt = new THREE.Matrix4().makeRotationX(0.3).setPosition(1, 2, 3);
  renderer.shadowMap.needsUpdate = true;
  origin.draw(() => {
    sun.shadow.matrix.copy(drawnAt);
    renderer.shadowMap.needsUpdate = false;
  });
  // a later frame, the eye somewhere else, the map not drawn again
  camera.position.set(31200, 20, -8100);
  const p = new THREE.Vector3(31234.5, 12.25, -8123.75);
  origin.draw(() => {
    const now = p
      .clone()
      .sub(camera.position.clone().add(new THREE.Vector3(uOrigin.value.x, uOrigin.value.y, uOrigin.value.z)))
      .applyMatrix4(sun.shadow.matrix);
    const then = p.clone().sub(eye1).applyMatrix4(drawnAt);
    assert.ok(now.distanceTo(then) < 1e-9, `${now.toArray()} against ${then.toArray()}`);
  });
});

test('a light that is not lighting the scene is left alone', () => {
  const { sun, sky, camera, renderer, origin } = world();
  sun.visible = false;
  sky.removeFromParent();
  const lookup = sun.shadow.matrix.clone();
  renderer.shadowMap.needsUpdate = true;
  origin.draw(() => {
    assert.deepEqual(sky.position.toArray(), [0.2, 1, 0.1], 'a sky light out of the scene is not moved');
  });
  camera.position.x += 5;
  renderer.shadowMap.needsUpdate = false;
  origin.draw(() => {});
  assert.deepEqual(sun.shadow.matrix.toArray(), lookup.toArray(), 'nothing was remembered for a light that was not shown');
});

test('a light added later is given to it', () => {
  const { scene, camera, origin } = world();
  const later = new THREE.HemisphereLight();
  later.position.set(0, 1, 0);
  scene.add(later);
  origin.light(later);
  origin.draw(() => {
    assert.deepEqual(later.position.toArray(), [
      camera.position.x + uOrigin.value.x,
      1 + uOrigin.value.y,
      camera.position.z + uOrigin.value.z,
    ]);
  });
  assert.deepEqual(later.position.toArray(), [0, 1, 0]);
});

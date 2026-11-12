// The Sun's second shadow map (src/viewer/shadows.ts): when it is drawn, and what is left out of it.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { FarShadow } from '../src/viewer/shadows.ts';

/** A stage's worth: a renderer whose shadows are drawn on demand, a Sun, and a place 100 m across. */
function rig() {
  const renderer = { shadowMap: { needsUpdate: false, autoUpdate: false } };
  const sun = new THREE.DirectionalLight();
  sun.castShadow = true;
  sun.position.set(-70, 90, 20);
  const far = new FarShadow(renderer, sun, () => new THREE.Box3(new THREE.Vector3(-50, 0, -50), new THREE.Vector3(50, 30, 50)));
  /** What three does with the request: draws the maps asked for, and the request is spent. */
  const draw = () => {
    const drawn = { fine: false, far: false };
    if (renderer.shadowMap.needsUpdate) {
      drawn.fine = sun.shadow.autoUpdate || sun.shadow.needsUpdate;
      drawn.far = far.light.shadow.autoUpdate || far.light.shadow.needsUpdate;
      far.light.shadow.needsUpdate = false;
      renderer.shadowMap.needsUpdate = false;
    }
    return drawn;
  };
  return { renderer, sun, far, draw };
}

test('the shader reads two maps for the Sun, and the second light gives no light', () => {
  const chunk = THREE.ShaderChunk.lights_fragment_begin;
  assert.ok(chunk.includes('NUM_DIR_LIGHT_SHADOWS == 3'), 'the patch found three’s loop');
  assert.ok(
    chunk.includes('getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal ) * skyOpen'),
    'the sky’s light is scaled by how much sky is overhead',
  );
  assert.ok(THREE.ShaderChunk.lights_fragment_maps.includes('getIBLIrradiance( geometryNormal ) * skyOpen'), 'and so is its reflection');
  assert.ok(chunk.includes('directionalShadowMap[ 1 ]'));
  const { far } = rig();
  assert.equal(far.light.intensity, 0);
  assert.ok(far.light.castShadow && !far.light.shadow.autoUpdate);
  assert.ok(
    !far.sky.shadow.autoUpdate && far.sky.intensity === 0,
    'the map that looks down belongs to a third, which gives no light either',
  );
});

test('it is fitted to the whole place along the Sun’s light, and drawn with the fine map when something asks', () => {
  const { renderer, sun, far, draw } = rig();
  far.before(null, true);
  assert.deepEqual(draw(), { fine: true, far: true }, 'the first frame');
  const camera = far.light.shadow.camera;
  assert.ok(camera.right > 70 && camera.right < 90, `half-width ${camera.right}`);
  const along = far.light.position.clone().sub(far.light.target.position).normalize();
  assert.ok(along.distanceTo(sun.position.clone().sub(sun.target.position).normalize()) < 1e-9);
  far.after();
  // nothing asked: nothing drawn
  far.before(null, true);
  assert.deepEqual(draw(), { fine: false, far: false });
  // a structure moved: both
  renderer.shadowMap.needsUpdate = true;
  far.before(null, true);
  assert.deepEqual(draw(), { fine: true, far: true });
  far.after();
});

test('what is not the light moving is followed a few times a second; the light, at once', () => {
  const { renderer, sun, far, draw } = rig();
  far.before(null);
  draw();
  far.after();
  renderer.shadowMap.needsUpdate = true;
  far.before(null);
  assert.deepEqual(draw(), { fine: true, far: false }, 'drawn a moment ago: it waits');
  far.after();
  far.before(null, true);
  assert.deepEqual(draw(), { fine: true, far: true }, 'and has not forgotten');
  far.after();
  sun.position.set(-60, 95, 20);
  renderer.shadowMap.needsUpdate = true;
  far.before(null);
  assert.deepEqual(draw(), { fine: true, far: true }, 'the light is followed in the same frame');
});

test('on foot: the walker’s own motion asks for the fine map alone, and the far map takes a frame to itself without him', () => {
  const { renderer, sun, far, draw } = rig();
  const figure = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  body.castShadow = true;
  figure.add(body);
  far.before(figure, true);
  draw();
  far.after();
  // walking: every frame the fine map, never the far one
  for (let i = 0; i < 40; i++) {
    far.nearOnly();
    far.before(figure, true);
    assert.deepEqual(draw(), { fine: true, far: false });
    far.after();
  }
  // a lift starts moving while he walks: the far map waits a few frames for a gap, then takes one frame
  renderer.shadowMap.needsUpdate = true;
  let waited = 0;
  for (; waited < 40; waited++) {
    far.nearOnly();
    far.before(figure, true);
    const cast = body.castShadow;
    const drawn = draw();
    far.after();
    if (drawn.far) {
      assert.equal(drawn.fine, false, 'alone: his shadow would be left in it');
      assert.equal(cast, false, 'and his shadow is off while it is drawn');
      break;
    }
    assert.equal(cast, true);
  }
  assert.ok(waited > 0 && waited < 20, `waited ${waited} frames`);
  assert.ok(body.castShadow && sun.shadow.autoUpdate, 'put back');
  assert.ok(renderer.shadowMap.needsUpdate, 'and the fine map is owed its turn in the next frame');
  far.before(figure, true);
  assert.deepEqual(draw(), { fine: true, far: false });
  // standing still, the far map does not wait
  far.after();
  renderer.shadowMap.needsUpdate = true;
  far.refit();
  renderer.shadowMap.needsUpdate = false;
  far.before(figure, true);
  assert.deepEqual(draw(), { fine: false, far: true });
  far.after();
});

// The eye by night (src/viewer/eye.ts): its times, and what it measures in front of it. The light of the sky itself is
// daysky.ts's (tests/heavens.test.mjs); the pad's floods coming on, lamps.ts's (tests/lamps.test.mjs).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { adapt, DARK_SECONDS, Eye, LIGHT_SECONDS, shone, VIEW_KEEP } from '../src/viewer/eye.ts';

const near = (got, want, tolerance, what) =>
  assert.ok(Math.abs(got - want) <= tolerance, `${what}: got ${got}, want ${want} within ${tolerance}`);

test('the eye’s times are the published ones: light in a fraction of a second, dark over minutes', () => {
  assert.equal(LIGHT_SECONDS, 0.4, 'the rods’ light adaptation (Durand and Dorsey 2000)');
  assert.equal(DARK_SECONDS, 110, 'the cones’ pigment (Pattanaik et al. 2000)');
  // into more light: most of the way in its time, settled (95 %) within a second and a half
  near(adapt(0, 1, LIGHT_SECONDS), 1 - Math.exp(-1), 1e-12, 'a time constant');
  assert.ok(adapt(0, 1, 1.2) > 0.95, 'settled in a second or two');
  // into less: tens of seconds before much of it is done, minutes for all of it
  assert.ok(adapt(1, 0, 10) > 0.9, 'after ten seconds in the dark nine tenths of it is still to come');
  near(adapt(1, 0, DARK_SECONDS), Math.exp(-1), 1e-12, 'a time constant');
  assert.ok(adapt(1, 0, 600) < 0.01, 'and ten minutes on it is all but done');
  // a frame's worth at a time comes to the same as all at once
  let state = 0;
  for (let i = 0; i < 600; i++) state = adapt(state, 1, 1 / 60);
  near(state, adapt(0, 1, 10), 1e-9, 'frame by frame');
});

test('a lamp’s light on the ground is three’s spotlight’s: inverse power, the cone’s soft edge, the cut-off, the angle', () => {
  const lamp = {
    position: new THREE.Vector3(0, 20, 0),
    facing: new THREE.Vector3(0, -1, 0),
    intensity: 110,
    angle: THREE.MathUtils.degToRad(48),
    penumbra: 0.7,
    decay: 1.6,
    distance: 140,
  };
  const up = new THREE.Vector3(0, 1, 0);
  near(shone(lamp, new THREE.Vector3(0, 0, 0), up), (110 / 20 ** 1.6) * (1 - (20 / 140) ** 4) ** 2, 1e-9, 'straight under it');
  assert.equal(shone(lamp, new THREE.Vector3(100, 0, 0), up), 0, 'outside its beam');
  const edge = shone(lamp, new THREE.Vector3(15, 0, 0), up);
  assert.ok(edge > 0 && edge < shone(lamp, new THREE.Vector3(0, 0, 0), up), 'in the soft edge, less');
  assert.equal(shone({ ...lamp, intensity: 0 }, new THREE.Vector3(), up), 0, 'out');
});

/** An eye 1.7 m up at the origin looking along -Z, and a flood 20 m ahead lighting the ground there. */
function scene(lookingAway = false) {
  const camera = new THREE.PerspectiveCamera(70, 1.6, 0.1, 5000);
  camera.position.set(0, 1.7, 0);
  camera.lookAt(0, 0, lookingAway ? 20 : -20);
  camera.updateMatrixWorld();
  const lamp = {
    position: new THREE.Vector3(0, 15, -20),
    facing: new THREE.Vector3(0, -1, 0),
    intensity: 110,
    angle: THREE.MathUtils.degToRad(48),
    penumbra: 0.7,
    decay: 1.6,
    distance: 140,
  };
  return { camera, lamps: [lamp] };
}

test('what the eye measures: the lamps in view lift what it adapts to; with none, or none in view, nothing', () => {
  const eye = new Eye();
  const { camera, lamps } = scene();
  assert.equal(eye.measure(camera, 0, 0.02, []), 1, 'no lamps');
  const ahead = eye.measure(camera, 0, 0.02, lamps);
  assert.ok(ahead > 3, `a floodlit patch ahead on a moonless night: ${ahead.toFixed(1)} times the sky's light`);
  const away = scene(true);
  const behind = eye.measure(away.camera, 0, 0.02, away.lamps);
  assert.ok(behind < 1.5, `turned away from it: ${behind.toFixed(2)}`);
  assert.ok(eye.measure(camera, 0, 2, lamps) < ahead, 'by dusk the same lamps are less beside the sky');
});

test('the eye follows what it measures: no step, and settled at once only where it is told to be', () => {
  const eye = new Eye();
  assert.equal(eye.factor, 1, 'adapted to the sky alone: the setting’s exposure');
  // into the floodlight: quickly, never by more than a frame's share
  let last = eye.factor;
  for (let i = 0; i < 120; i++) {
    eye.step(20, 1 / 60, false);
    const f = eye.factor;
    assert.ok(f <= last && f / last > 0.9, `no step at frame ${i}`);
    last = f;
  }
  near(eye.factor, 20 ** (VIEW_KEEP - 1), 0.02 * eye.factor, 'within two per cent of where it settles, in two seconds');
  // out of it: slowly
  for (let i = 0; i < 600; i++) eye.step(1, 1 / 60, false);
  assert.ok(eye.factor < 0.5, 'ten seconds out it is still well short of the night');
  assert.ok(eye.factor > 20 ** (VIEW_KEEP - 1), 'though it has started');
  // a cut (frozen, the clock put somewhere): at once
  eye.step(1, 0, true);
  assert.equal(eye.factor, 1);
  eye.step(20, 0, true);
  near(eye.factor, 20 ** (VIEW_KEEP - 1), 1e-12, 'at once');
  eye.reset();
  assert.equal(eye.factor, 1);
});

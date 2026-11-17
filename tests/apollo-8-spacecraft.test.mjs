// Flight-specific spacecraft equipment in the shipped Gallery assets. Exercise the real slider on
// the exported node frames, including the clocked parent of the antenna deployment hinge.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Group, Vector3 } from 'three';
import { flight as apollo7 } from '../missions/usa/apollo/flights/apollo-7/flight.ts';
import { flight as apollo8 } from '../missions/usa/apollo/flights/apollo-8/flight.ts';
import { Exploder } from '../src/viewer/explode.ts';

function asset(flight, suffix = '') {
  const file = new URL(`../public/${flight.models[0].url.replace('.glb', `${suffix}.glb`)}`, import.meta.url);
  const bytes = readFileSync(file);
  return JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
}

function hierarchy(gltf) {
  function read(index) {
    const node = gltf.nodes[index];
    const frame = new Group();
    frame.name = node.name;
    if (node.matrix) {
      frame.matrix.fromArray(node.matrix).decompose(frame.position, frame.quaternion, frame.scale);
    } else {
      if (node.translation) frame.position.fromArray(node.translation);
      if (node.rotation) frame.quaternion.fromArray(node.rotation);
      if (node.scale) frame.scale.fromArray(node.scale);
    }
    frame.userData.mesh = node.mesh;
    for (const child of node.children ?? []) frame.add(read(child));
    return frame;
  }
  const scene = new Group();
  for (const index of gltf.scenes[gltf.scene ?? 0].nodes) scene.add(read(index));
  return scene;
}

const close = (actual, expected, tolerance, label) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${label}: ${actual} vs ${expected}`);
const position = (object) => object.getWorldPosition(new Vector3());

for (const suffix of ['', '.lod1', '.lod2']) {
  test(`CSM-103: four full-size reflectors swing from alongside the engine into the flight's deployment plane${suffix}`, () => {
    const gltf = asset(apollo8, suffix);
    const root = hierarchy(gltf);
    const hinge = root.getObjectByName('HGA_Deployment');
    const dishes = hinge.getObjectByName('HGA_FourReflectors').children;
    assert.equal(dishes.length, 4);
    const diameter = apollo8.specs.find((spec) => spec.label === 'High-gain reflector diameter').value;
    for (const dish of dishes) {
      const prim = gltf.meshes[dish.userData.mesh].primitives[0];
      const { min, max } = gltf.accessors[prim.attributes.POSITION];
      const span = max.map((hi, k) => (hi - min[k]) * dish.scale.getComponent(k)).sort((a, b) => a - b);
      close(span[1], diameter, 0.001, 'first reflector diameter');
      close(span[2], diameter, 0.001, 'second reflector diameter');
      assert.ok(span[0] > 0.02 && span[0] < diameter / 3, 'shallow, three-dimensional dish');
    }
    // Four distinct centres in a square, with side neighbours one aperture apart.
    const centres = dishes.map(position);
    for (const centre of centres) {
      const distances = centres.map((other) => centre.distanceTo(other)).sort((a, b) => a - b);
      assert.ok(distances[1] >= diameter && distances[1] < 1.2 * diameter);
      close(distances[1], distances[2], 0.001, 'square side');
      close(distances[3], Math.SQRT2 * distances[1], 0.001, 'square diagonal');
    }
    const explosion = new Exploder(root, apollo8.models[0].parts);
    const direction = () =>
      dishes
        .map(position)
        .reduce((sum, p) => sum.add(p), new Vector3())
        .divideScalar(4)
        .sub(position(hinge))
        .normalize();
    const service = root.getObjectByName('ServiceModule');
    const mount = position(hinge).sub(position(service));
    assert.ok(direction().y < -0.99, 'launch attitude, array aft of the hinge');
    for (let tick = 0; tick <= 100; tick++) {
      explosion.set(tick / 100);
      assert.ok(position(hinge).sub(position(service)).distanceTo(mount) < 0.001, 'the hinge stays with the service module');
    }
    const radial = direction();
    const bearing = (52.25 * Math.PI) / 180; // MR Fig. A.1-5, Apollo -Y toward +Z
    assert.ok(Math.abs(radial.y) < 0.06, 'deployed arm lies athwart the spacecraft');
    assert.ok(radial.dot(new Vector3(-Math.sin(bearing), 0, Math.cos(bearing))) > 0.99, 'deployed outboard at the recorded clocking');
    explosion.set(0);
    assert.ok(direction().y < -0.99, 'the assembled exhibit returns to launch attitude');
  });
}

test('CSM-103 carries three separate launch couches, six knee hinges and a combined tunnel hatch', () => {
  const older = hierarchy(asset(apollo7));
  const flight = hierarchy(asset(apollo8));
  for (const [index, role] of ['Commander', 'CommandModulePilot', 'LunarModulePilot'].entries()) {
    const couch = flight.getObjectByName(`FoldablePosition_${index + 1}`);
    assert.ok(couch.getObjectByName(`Seat_${role}`));
    for (const side of [-1, 1]) {
      const name = `CM_CouchKneeHinge_${index}_${side}`;
      assert.ok(couch.getObjectByName(name)?.userData.mesh !== undefined);
      assert.equal(older.getObjectByName(name), undefined);
    }
    assert.ok(older.getObjectByName(`UnitizedPosition_${index + 1}`));
    assert.equal(flight.getObjectByName(`UnitizedPosition_${index + 1}`), undefined);
  }
  const forward = flight.getObjectByName('ForwardCompartment');
  for (const name of ['CM_CombinedHatchBody', 'CM_CombinedHatchCap', 'CM_EqualizationValve']) {
    assert.ok(forward.getObjectByName(name)?.userData.mesh !== undefined);
    assert.equal(older.getObjectByName(name), undefined);
  }
  assert.ok(older.getObjectByName('CM_ForwardPressureHatch'));
  assert.equal(forward.getObjectByName('CM_ForwardPressureHatch'), undefined);
  assert.equal(older.getObjectByName('HighGainAntenna'), undefined);
});

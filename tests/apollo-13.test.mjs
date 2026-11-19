import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BufferAttribute, BufferGeometry, Matrix4 } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { aquariusStackParts } from '../missions/usa/apollo/flights/apollo-13/aquarius.ts';
import { flight } from '../missions/usa/apollo/flights/apollo-13/flight.ts';
import { lacks } from '../src/app/address.ts';
import { readGlb } from '../tools/glb-geometry.mjs';
import { assertAdapterClearance } from './apollo-adapter-clearance.mjs';
import { framesOf } from './glb.mjs';

const [stack, lander] = flight.models;
test('Apollo 13 offers the stack and Aquarius in the Gallery with the flown crew assignments', () => {
  assert.equal(lacks(flight, 'gallery'), null);
  assert.ok(lacks(flight, 'site'));
  assert.ok(lacks(flight, 'fly'));
  assert.deepEqual(
    flight.models.map((m) => m.id),
    ['vehicle', 'aquarius'],
  );
  assert.deepEqual(
    stack.seats.map((s) => s.label),
    ['Lovell’s left couch', 'Swigert’s centre couch', 'Haise’s right couch'],
  );
  assert.deepEqual(
    lander.seats.map((s) => s.label.split('’')[0]),
    ['Lovell', 'Haise'],
  );
});

for (const level of ['', '.lod1', '.lod2']) {
  test(`SA-508 carries Odyssey and Aquarius inside SLA-16 at ${level || 'full detail'}`, async () => {
    const file = (model) => new URL(`../public/${model.url.replace('.glb', `${level}.glb`)}`, import.meta.url);
    const rocket = framesOf(file(stack));
    assert.ok(Math.abs(rocket.box('LaunchEscape').hi[1] - 363 * 0.3048) < 0.03);
    for (let i = 0; i < 4; i++) {
      assert.ok(rocket.point(`SLA16_DoorPanel_${i}`));
      assert.ok(rocket.point(`SIC508_Bearing_${i + 1}`));
    }
    assert.ok(rocket.point('LunarImpactRadio'));
    assert.equal(rocket.point('LMMailbox'), null, 'the crew built the filter after launch');
    const returning = framesOf(file(lander));
    assert.ok(returning.point('LMMailbox'));
    assert.ok(rocket.point('LM3_DockingDrogue'));
    assert.equal(returning.point('LM3_DockingDrogue'), null, 'the removable drogue had been stowed for the return');
    assert.ok(returning.point('SpiderDockingFrame'), 'the fixed docking ring remained');
    assert.ok(rocket.point('OxygenShelf'));
    assert.ok(rocket.point('OxygenTankTwoCore'));
    await assertAdapterClearance(
      stack,
      aquariusStackParts.map((part) => part.node),
      level,
    );
  });
}

test('Aquarius packs the lunar drill and stem rack clear of the generator fins in both configurations', async () => {
  for (const model of [lander, stack]) {
    const { gltf, frames, triangles } = await readGlb(new URL(`../public/${model.url}`, import.meta.url));
    const index = (name) => gltf.nodes.findIndex((n) => n.name === name);
    function mesh(name) {
      const i = index(name);
      assert.notEqual(i, -1, name);
      const pieces = triangles(i);
      assert.equal(pieces.length, 1, name);
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(pieces[0].positions, 3));
      geometry.setIndex(new BufferAttribute(pieces[0].indices, 1));
      geometry.applyMatrix4(new Matrix4().fromArray(frames[i]));
      return geometry;
    }
    const fins = new MeshBVH(mesh('LM7_GeneratorRadiatorFins'));
    for (const item of ['LM7_LunarSurfaceDrill', 'LM7_DrillStemRack']) {
      assert.equal(fins.intersectsGeometry(mesh(item), new Matrix4()), false, `${model.id}: ${item} overlaps the RTG fins`);
    }
  }
});

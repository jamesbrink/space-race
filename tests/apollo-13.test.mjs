import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BufferAttribute, BufferGeometry, Matrix4 } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { flight as apollo10 } from '../missions/usa/apollo/flights/apollo-10/flight.ts';
import { aquariusStackParts } from '../missions/usa/apollo/flights/apollo-13/aquarius.ts';
import { flight } from '../missions/usa/apollo/flights/apollo-13/flight.ts';
import { lacks, openingFor } from '../src/app/address.ts';
import { readGlb } from '../tools/glb-geometry.mjs';
import { assertAdapterClearance } from './apollo-adapter-clearance.mjs';
import { framesOf } from './glb.mjs';

const [stack, lander] = flight.models;
test('Apollo 13 offers the stack and Aquarius in the Gallery with the flown crew assignments', () => {
  assert.equal(lacks(flight, 'gallery'), null);
  assert.equal(lacks(flight, 'site'), null);
  // (flown from the pad through the translunar injection: missions/usa/apollo/vehicles/saturn-v-plan.ts)
  assert.equal(lacks(flight, 'fly'), null);
  assert.deepEqual(
    flight.models.map((m) => m.id),
    ['vehicle', 'aquarius', 'pad', 'crew', 'pilot', 'lmp'],
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

test('Apollo 13 opens at Pad A on ML-3 and dates the crew and closeout operations to 11 April', () => {
  const pad = flight.models.find((m) => m.id === 'pad');
  const earlier = apollo10.models.find((model) => model.id === 'pad');
  assert.equal(pad.name, 'Mobile launcher 3');
  assert.equal(earlier.name, pad.name);
  assert.match(earlier.url, /pad-b\.glb$/);
  assert.equal(
    earlier.parts.some((part) => part.node === 'Substation'),
    false,
  );
  assert.ok(pad.parts.some((part) => part.node === 'Substation'));
  assert.match(pad.url, /pad-a-1970-04\.glb$/);
  assert.deepEqual(flight.site.zone, { name: 'EST', utcOffset: -5 });
  assert.deepEqual(openingFor(flight, { fly: false, named: '', clockAt: 0, running: false }), {
    at: -43200,
    model: 'pad',
    view: 'launcher',
  });
  assert.deepEqual(
    stack.seats.map((s) => [flight.models.find((m) => m.id === s.figure).name, ...s.open]),
    [
      ['Lovell', -9660, -7943],
      ['Swigert', -9660, -7943],
      ['Haise', -9660, -7943],
    ],
  );
  assert.equal(pad.sequence.find((k) => k.event.includes('leaves the hatch')).at, -2580);
  assert.equal(pad.sequence.find((k) => k.event.includes('First vehicle motion')).at, 0.3);
  const side = stack.parts.find((p) => p.node === 'SideHatch').clocked;
  const cover = stack.parts.find((p) => p.node === 'BoostCover').clocked;
  assert.ok(cover[0].to < side[0].to && side[0].to <= -12600);
  assert.ok(cover[1].from > side[1].to);
  assert.equal(cover[1].to, -5397);
  assert.equal(flight.weather.observed.at, flight.launch);
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

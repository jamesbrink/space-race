import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BufferAttribute, BufferGeometry, Matrix4 } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { flight } from '../missions/usa/apollo/flights/apollo-12/flight.ts';
import { lacks, openingFor } from '../src/app/address.ts';
import { Exploder } from '../src/viewer/explode.ts';
import { readGlb } from '../tools/glb-geometry.mjs';
import { framesOf, hierarchy } from './glb.mjs';

const [stack, intrepid] = flight.models;
const file = (model, level) => new URL('../public/' + model.url.replace('.glb', level + '.glb'), import.meta.url);

test('Apollo 12 offers the two Gallery exhibits, three couches and two standing stations', () => {
  assert.equal(lacks(flight, 'gallery'), null);
  assert.equal(lacks(flight, 'site'), null);
  assert.ok(lacks(flight, 'fly'));
  assert.deepEqual(
    flight.models.map((m) => m.id),
    ['vehicle', 'intrepid', 'pad', 'crew', 'pilot', 'lmp'],
  );
  assert.deepEqual(
    stack.seats.map((s) => s.label.split('’')[0]),
    ['Conrad', 'Gordon', 'Bean'],
  );
  assert.deepEqual(
    intrepid.seats.map((s) => s.label.split('’')[0]),
    ['Conrad', 'Bean'],
  );
  for (const [node, group] of [
    ['LMFuelCask', 'Descent stage'],
    ['LMScienceBay', 'Descent stage'],
    ['LMSurfaceEquipment', 'Descent stage'],
    ['LMHammocks', 'Ascent stage'],
  ]) {
    assert.equal(intrepid.parts.find((part) => part.node === node)?.group, group);
    assert.ok(
      intrepid.views.some((view) => view.onSelect && view.nodes?.includes(node)),
      node,
    );
  }
});

test('ML-2 starts its prelaunch sequence in EST and opens Yankee Clipper for crew ingress', () => {
  assert.deepEqual(openingFor(flight, { fly: false, named: '', clockAt: 0, running: false }), {
    at: -43200,
    model: 'pad',
    view: 'launcher',
  });
  assert.deepEqual(flight.site.zone, { name: 'EST', utcOffset: -5 });
  const pad = flight.models.find((m) => m.id === 'pad');
  assert.match(pad.url, /pad-a-1969-11\.glb$/);
  assert.equal(pad.sequence.find((k) => k.event.includes('First vehicle motion')).at, 0.25);
  assert.deepEqual(
    stack.seats.map((s) => [flight.models.find((m) => m.id === s.figure).name, ...s.open]),
    [
      ['Conrad', -10140, -8220],
      ['Gordon', -10140, -8220],
      ['Bean', -10140, -8220],
    ],
  );
});

for (const level of ['', '.lod1', '.lod2']) {
  test('SA-507 and Intrepid carry the flight equipment at ' + (level || 'full detail'), () => {
    const vehicle = framesOf(file(stack, level));
    assert.ok(Math.abs(vehicle.box('LaunchEscape').hi[1] - 363 * 0.3048) < 0.03);
    for (let i = 0; i < 4; i++) {
      assert.ok(vehicle.point('SLA15_DoorPanel_' + i));
      assert.ok(vehicle.point('SIC507_Bearing_' + (i + 1)));
    }
    for (const model of [stack, intrepid]) {
      const frames = framesOf(file(model, level));
      for (const node of ['LMFuelCask', 'LMScienceBay', 'LMSurfaceEquipment', 'LMHammocks']) {
        assert.ok(frames.point(node), node);
      }
      assert.equal(frames.point('LM3_ProbeHinge_0'), null);
      for (let i = 1; i < 4; i++) assert.ok(frames.point('LM3_ProbeHinge_' + i));
      if (!level) {
        for (const node of [
          'LM6_GraphiteCask',
          'LM6_ColorTVBody',
          'LM6_CentralStationPallet',
          'LM6_RTGPallet',
          'LM6_SNAP27Generator',
          'LMHammocks',
        ]) {
          assert.ok(frames.point(node), node);
        }
        const bundles = frames.box('LMHammocks');
        assert.ok(bundles.lo[2] < -0.5 && bundles.hi[2] > 0.5, 'two rolls stowed across the cabin');
        assert.equal(frames.point('LM5_ReflectorCover'), null);
      }
    }
    if (!level) {
      assert.ok(vehicle.point('CM108_InlineHydrogenSeparator'));
      assert.ok(vehicle.point('CM108_NylonRecoveryLoop'));
      assert.ok(vehicle.point('CM108_TelemetryPower_Legends_ink'));
    }
  });
}

// Work in the transformed triangle meshes, including the spacecraft's stowed pose.
// Regression: the extra equipment in quadrant II travels past SLA-15 before the legs unfold.
test('Intrepid clears the four SLA-15 panels through extraction and gear deployment', async () => {
  const { gltf, triangles } = await readGlb(file(stack, ''));
  const root = hierarchy(gltf);
  const motion = new Exploder(root, stack.parts);
  const indices = new Map(gltf.nodes.map((node, i) => [node.name, i]));
  function pieces(names) {
    const list = [];
    for (const name of names) {
      root.getObjectByName(name).traverse((obj) => {
        for (const { positions, indices: faces } of triangles(indices.get(obj.name))) {
          const geometry = new BufferGeometry();
          geometry.setAttribute('position', new BufferAttribute(positions, 3));
          geometry.setIndex(new BufferAttribute(faces, 1));
          geometry.computeBoundingBox();
          geometry.boundsTree = new MeshBVH(geometry);
          list.push({ obj, geometry, world: geometry.boundingBox.clone() });
        }
      });
    }
    return list;
  }
  const walls = pieces(['SpacecraftAdapter']);
  const payload = pieces([
    'LMFuelCask',
    'LMScienceBay',
    'LMSurfaceEquipment',
    'LMLandingGear',
    'LMPlumeDeflectors',
    'LMAscent',
    'LMPorch',
    'LMDescent',
    'LMEquipment',
  ]);
  const local = new Matrix4();
  for (let step = 0; step <= 100; step++) {
    motion.set(step / 100);
    root.updateMatrixWorld(true);
    for (const item of [...walls, ...payload]) item.world.copy(item.geometry.boundingBox).applyMatrix4(item.obj.matrixWorld);
    for (const wall of walls) {
      for (const item of payload) {
        if (!wall.world.intersectsBox(item.world)) continue;
        local.copy(wall.obj.matrixWorld).invert().multiply(item.obj.matrixWorld);
        assert.ok(
          !wall.geometry.boundsTree.intersectsGeometry(item.geometry, local),
          `${item.obj.name} enters ${wall.obj.name} at ${step}%`,
        );
      }
    }
  }
});

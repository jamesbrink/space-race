import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BufferAttribute, BufferGeometry, Matrix4, Ray, Vector3 } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { flight } from '../missions/usa/apollo/flights/apollo-11/flight.ts';
import { lacks } from '../src/app/address.ts';
import { Exploder } from '../src/viewer/explode.ts';
import { readGlb } from '../tools/glb-geometry.mjs';
import { framesOf, hierarchy } from './glb.mjs';

const [stack, eagle] = flight.models;
const file = (model, level = '') => new URL('../public/' + model.url.replace('.glb', level + '.glb'), import.meta.url);

test('Apollo 11 opens the two Gallery exhibits and uses the launch couch assignments', () => {
  assert.equal(lacks(flight, 'gallery'), null);
  assert.equal(lacks(flight, 'site'), null);
  assert.ok(lacks(flight, 'fly'));
  assert.deepEqual(
    stack.seats.map((s) => s.label),
    ['Armstrong’s left couch', 'Aldrin’s centre couch', 'Collins’s right couch'],
  );
  assert.deepEqual(
    eagle.seats.map((s) => s.label),
    ['Armstrong’s standing station', 'Aldrin’s standing station'],
  );
  assert.deepEqual(
    eagle.parts.filter((p) => ['LMPlumeDeflectors', 'LMSurfaceEquipment', 'LMScienceBay'].includes(p.node)).map((p) => p.group),
    Array(3).fill('Descent stage'),
  );
});

test('Columbia boards from ML-1 in July daylight time with the assigned launch suits and couches', () => {
  const { site, opens, models } = flight;
  assert.equal(site.zone.utcOffset, -4);
  assert.equal(site.zone.name, 'EDT');
  assert.deepEqual(opens, { at: -9480, model: 'pad', view: 'launcher' });
  const boarding = stack.seats.map(({ figure, open }) => {
    const astronaut = models.find((model) => model.id === figure);
    return [astronaut.name, astronaut.url.split('/').at(-1), open];
  });
  assert.deepEqual(boarding, [
    ['Armstrong', 'a7l-ev.glb', [-9480, -7620]],
    ['Aldrin', 'a7l-ev.glb', [-9480, -7620]],
    ['Collins', 'a7l-iv.glb', [-9480, -7620]],
  ]);
});

test('choosing either science bay from Parts opens its own inspection view on both exhibits', () => {
  for (const model of [stack, eagle]) {
    for (const [node, id] of [
      ['LMSurfaceEquipment', 'mesa'],
      ['LMScienceBay', 'seq'],
    ]) {
      assert.ok(model.parts.find((part) => part.node === node)?.inside);
      const view = model.views.find((v) => v.id === id);
      assert.ok(view?.onSelect && view.isolate);
      assert.deepEqual(view.nodes, [node]);
    }
  }
});

for (const suffix of ['', '.lod1', '.lod2']) {
  test(`Eagle carries three probes and leaves its scientific equipment on the Moon at ${suffix || 'full detail'}`, () => {
    for (const model of [stack, eagle]) {
      const frames = framesOf(file(model, suffix));
      assert.equal(frames.point('LM3_ProbeHinge_0'), null, 'ladder leg');
      for (let leg = 0; leg < 4; leg++) {
        assert.ok(frames.point('LM3_Footpad_' + leg));
        if (leg) assert.ok(frames.point('LM3_ProbeHinge_' + leg));
      }
      for (const node of ['LMPlumeDeflectors', 'LMSurfaceEquipment', 'LMScienceBay']) {
        const bounds = frames.box(node);
        assert.ok(
          bounds.hi.every((v, i) => v > bounds.lo[i]),
          node + ' has visible hardware',
        );
      }
      if (!suffix) {
        assert.ok(frames.point('LM5_LunarTVBody'));
        assert.ok(frames.point('LM5_TVCameraCarrier'));
        const seismic = frames.point('LM5_PassiveSeismicPackage');
        const reflector = frames.point('LM5_ReflectorCover');
        // Viewing quadrant II from outside, local right is -X, +Z. AS11-40-5927.
        assert.ok(seismic && reflector && seismic[0] > reflector[0] && seismic[2] < reflector[2]);
        assert.equal(!!frames.point('LM5_PilotWindowCamera'), model === eagle);
      }
    }
    const deployed = framesOf(file(eagle, suffix));
    assert.ok(Math.abs(deployed.box('LM3_Footpad_0').hi[0] - deployed.box('LM3_Footpad_2').lo[0] - 372.14 * 0.0254) < 0.002);
    const frames = framesOf(file(stack, suffix));
    assert.ok(Math.abs(frames.box('LaunchEscape').hi[1] - 363 * 0.3048) < 0.03);
  });
}

test('Eagle’s landing hardware clears the adapter walls throughout extraction', async () => {
  const { gltf, triangles } = await readGlb(file(stack));
  const scene = hierarchy(gltf);
  const slider = new Exploder(scene, stack.parts);
  const indices = new Map(gltf.nodes.map((n, i) => [n.name, i]));
  function solids(names) {
    const list = [];
    for (const name of names)
      scene.getObjectByName(name).traverse((object) => {
        for (const primitive of triangles(indices.get(object.name))) {
          const geo = new BufferGeometry();
          geo.setAttribute('position', new BufferAttribute(primitive.positions, 3));
          geo.setIndex(new BufferAttribute(primitive.indices, 1));
          geo.boundsTree = new MeshBVH(geo);
          list.push({ object, geometry: geo, tree: geo.boundsTree });
        }
      });
    return list;
  }
  const walls = solids(['SpacecraftAdapter']);
  const equipment = solids(['LMLandingGear', 'LMPlumeDeflectors', 'LMSurfaceEquipment', 'LMScienceBay']);
  const local = new Matrix4();
  for (let step = 0; step <= 100; step++) {
    slider.set(step / 100);
    scene.updateMatrixWorld(true);
    for (const wall of walls)
      for (const item of equipment) {
        local.copy(wall.object.matrixWorld).invert().multiply(item.object.matrixWorld);
        assert.ok(!wall.tree.intersectsGeometry(item.geometry, local), `${item.object.name} enters ${wall.object.name} at ${step}%`);
      }
  }
});

test('SA-506 rests on ML-1 at four bearing points between its F-1 engines at every detail level', async () => {
  const pad = flight.models.find((model) => model.id === 'pad');
  // Viewer +X is north at Pad A, +Z east. MSFC-MAN-504 figure 8-7 numbers position I in the east.
  const directions = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ];
  for (const suffix of ['', '.lod1', '.lod2']) {
    const vehicle = framesOf(file(stack, suffix));
    const { gltf, triangles } = await readGlb(file(pad, suffix));
    const scene = hierarchy(gltf);
    scene.position.fromArray(pad.position);
    scene.updateMatrixWorld(true);
    const supports = scene.getObjectByName('Holddown_Arms');
    const indices = new Map(gltf.nodes.map((node, i) => [node.name, i]));
    // Cast just above each sole onto the stationary bearing steel in the exported pad.
    const surfaces = supports.children.flatMap((child) =>
      triangles(indices.get(child.name)).map((mesh) => ({
        ...mesh,
        matrix: child.matrixWorld,
      })),
    );
    for (const [i, [north, east]] of directions.entries()) {
      const lug = vehicle.box('SIC506_BearingLug_' + (i + 1));
      const x = (lug.lo[0] + lug.hi[0]) / 2;
      const z = (lug.lo[2] + lug.hi[2]) / 2;
      assert.ok(north * x + east * z > 5 && Math.abs(east * x - north * z) < 0.001);
      const ray = new Ray(new Vector3(x, lug.lo[1] + 0.01, z), new Vector3(0, -1, 0));
      const a = new Vector3(),
        b = new Vector3(),
        c = new Vector3(),
        hit = new Vector3();
      let top = -Infinity;
      for (const mesh of surfaces) {
        for (let j = 0; j < mesh.indices.length; j += 3) {
          a.fromArray(mesh.positions, mesh.indices[j] * 3).applyMatrix4(mesh.matrix);
          b.fromArray(mesh.positions, mesh.indices[j + 1] * 3).applyMatrix4(mesh.matrix);
          c.fromArray(mesh.positions, mesh.indices[j + 2] * 3).applyMatrix4(mesh.matrix);
          if (ray.intersectTriangle(a, b, c, false, hit)) top = Math.max(top, hit.y);
        }
      }
      assert.ok(Math.abs(lug.lo[1] - top) < 0.001, `bearing ${i + 1}${suffix}: lug ${lug.lo[1]} m, support ${top} m`);
      const [engineX, , engineZ] = vehicle.point('F1_Mount_' + (i + 1));
      const [nextNorth, nextEast] = directions[(i + 1) % 4];
      assert.ok(Math.abs(Math.abs(engineX) - Math.abs(engineZ)) < 0.001);
      assert.ok(engineX * (north + nextNorth) > 0 && engineZ * (east + nextEast) > 0);
    }
  }
});

test('the four hold-down links release, three hoods close and every tail mast withdraws on the pad clock', async () => {
  const pad = flight.models.find((model) => model.id === 'pad');
  for (const level of ['', '.lod1', '.lod2']) {
    const { gltf } = await readGlb(file(pad, level));
    const root = hierarchy(gltf);
    const slider = new Exploder(root, pad.parts);
    const angleSince = (name, before) => before.angleTo(root.getObjectByName(name).quaternion);
    const rotation = (name) => root.getObjectByName(name).quaternion.clone();
    slider.clock(0.29);
    const original = new Map();
    for (let arm = 1; arm <= 4; arm++) {
      for (const name of [`Holddown_Link_${arm}`, `Holddown_Hood_${arm}`]) original.set(name, rotation(name));
    }
    for (const suffix of ['1_2', '3_2', '3_4']) {
      for (const name of ['Tail_Boom_' + suffix, 'Tail_Visor_' + suffix]) original.set(name, rotation(name));
    }
    slider.clock(9.3);
    for (const [name, before] of original) {
      const angle = angleSince(name, before);
      if (name === 'Holddown_Hood_1') assert.ok(angle < 1e-6, name);
      else assert.ok(angle > Math.PI / 4, name);
    }
    slider.clock(-9480);
    for (const [name, before] of original) assert.ok(angleSince(name, before) < 1e-6, name + ' returns for boarding');
  }
});

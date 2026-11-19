// The pad and rocket are separate assets. Check their decoded triangles together in the site frame.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Box3, BufferAttribute, BufferGeometry, Matrix4 } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { flight } from '../missions/usa/apollo/flights/apollo-11/flight.ts';
import { Exploder } from '../src/viewer/explode.ts';
import { sliderAt } from '../src/world/sequence.ts';
import { readGlb } from '../tools/glb-geometry.mjs';
import { hierarchy } from './glb.mjs';

async function surfaces(model, level) {
  const { gltf, triangles } = await readGlb(new URL('../public/' + model.url.replace('.glb', level + '.glb'), import.meta.url));
  const root = hierarchy(gltf);
  if (model.position) root.position.fromArray(model.position);
  root.updateMatrixWorld(true);
  const motion = new Exploder(root, model.parts);
  const byName = new Map(gltf.nodes.map((node, index) => [node.name, index]));
  const meshes = [];
  root.traverse((object) => {
    const index = byName.get(object.name);
    if (index === undefined) return;
    for (const primitive of triangles(index)) {
      const geo = new BufferGeometry();
      geo.setAttribute('position', new BufferAttribute(primitive.positions, 3));
      geo.setIndex(new BufferAttribute(primitive.indices, 1));
      geo.boundsTree = new MeshBVH(geo);
      geo.computeBoundingBox();
      meshes.push({ object, geo, world: new Box3() });
    }
  });
  function pose(t) {
    if (model.sequence) motion.set(sliderAt(model.sequence, t));
    motion.clock(t);
    root.updateMatrixWorld(true);
    for (const mesh of meshes) mesh.world.copy(mesh.geo.boundingBox).applyMatrix4(mesh.object.matrixWorld);
  }
  return { meshes, pose };
}
const stack = flight.models[0],
  pad = flight.models.find((m) => m.id === 'pad');
const times = new Set();
function sweep(a, b) {
  for (let i = 0; i <= 32; i++) times.add(a + ((b - a) * i) / 32);
}
for (const [i, k] of pad.sequence.entries()) {
  times.add(k.at);
  const next = pad.sequence[i + 1];
  if (next && k.slider !== next.slider) sweep(k.at, next.at);
}
for (const model of [stack, pad]) for (const part of model.parts) for (const move of part.clocked ?? []) sweep(move.from, move.to);
for (const level of ['', '.lod1', '.lod2']) {
  test('Apollo 11 pad structures clear SA-506 through boarding and retraction at ' + (level || 'full detail'), async () => {
    const rocket = await surfaces(stack, level),
      site = await surfaces(pad, level);
    const problems = new Map();
    const matrix = new Matrix4(),
      inverse = new Matrix4();
    for (const t of [...times].sort((a, b) => a - b)) {
      rocket.pose(t);
      site.pose(t);
      for (const surface of site.meshes) {
        inverse.copy(surface.object.matrixWorld).invert();
        for (const body of rocket.meshes) {
          if (!surface.world.intersectsBox(body.world)) continue;
          const key = surface.object.name + ' / ' + body.object.name;
          if (problems.has(key)) continue;
          matrix.multiplyMatrices(inverse, body.object.matrixWorld);
          if (surface.geo.boundsTree.intersectsGeometry(body.geo, matrix)) problems.set(key, Math.round(t * 100) / 100);
        }
      }
    }
    assert.deepEqual([...problems], []);
  });
}

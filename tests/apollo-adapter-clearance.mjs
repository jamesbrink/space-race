// Check the enclosure and payload in their actual exported frames throughout the Gallery slider.
import assert from 'node:assert/strict';
import { BufferAttribute, BufferGeometry, Matrix4 } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { Exploder } from '../src/viewer/explode.ts';
import { readGlb } from '../tools/glb-geometry.mjs';
import { hierarchy } from './glb.mjs';

export function assertAdapterClearance(stack, payloadNodes, level = '') {
  return assertEnclosureClearance(stack, ['SpacecraftAdapter'], payloadNodes, level);
}

export async function assertEnclosureClearance(stack, enclosureNodes, payloadNodes, level) {
  const { gltf, triangles } = await readGlb(new URL(`../public/${stack.url.replace('.glb', level + '.glb')}`, import.meta.url));
  const root = hierarchy(gltf);
  const motion = new Exploder(root, stack.parts);
  const indices = new Map(gltf.nodes.map((node, i) => [node.name, i]));
  function pieces(names) {
    const list = [];
    for (const name of names) {
      const group = root.getObjectByName(name);
      assert.ok(group, `missing payload or adapter node ${name}`);
      group.traverse((obj) => {
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
  const walls = pieces(enclosureNodes);
  const payload = pieces(payloadNodes);
  assert.ok(walls.length && payload.length);
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
}

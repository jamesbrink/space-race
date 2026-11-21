import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BufferAttribute, BufferGeometry, Matrix4 } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { LunarRover } from '../src/viewer/lunar-rover.ts';
import { readGlb } from '../tools/glb-geometry.mjs';
import { hierarchy } from './glb.mjs';

for (const mission of [15, 16, 17]) {
  for (const level of ['', '.lod1', '.lod2']) {
    test(`Apollo ${mission} rover ${level || 'full'} wheel assemblies clear the chassis and payload from lock to lock`, async () => {
      const { gltf, triangles } = await readGlb(
        new URL(`../public/models/usa/apollo/apollo-${mission}/rover${level}.glb`, import.meta.url),
      );
      const root = hierarchy(gltf);
      root.updateMatrixWorld(true);
      const indices = new Map(gltf.nodes.map((node, index) => [node.name, index]));
      function surfaces(group) {
        const result = [];
        group.traverse((object) => {
          for (const primitive of triangles(indices.get(object.name))) {
            const geometry = new BufferGeometry();
            geometry.setAttribute('position', new BufferAttribute(primitive.positions, 3));
            geometry.setIndex(new BufferAttribute(primitive.indices, 1));
            geometry.computeBoundingBox();
            geometry.boundsTree = new MeshBVH(geometry);
            result.push({ object, geometry, bounds: geometry.boundingBox.clone().applyMatrix4(object.matrixWorld) });
          }
        });
        return result;
      }
      // The A-arms and tie rods physically attach to the parts being steered: everything not on a corner is fixed (the
      // outermost of the vehicle's groups named for what they are, on its frames)
      const groups = [];
      const corner = (o) => o.name.startsWith('LRV_Corner_');
      const gather = (o) => {
        if (corner(o)) return;
        if (o.name.startsWith('Rover')) return void groups.push(o);
        for (const c of o.children) gather(c);
      };
      gather(root);
      const fixed = groups.flatMap(surfaces);
      assert.ok(fixed.some((part) => part.object.name === 'LRV_RCAColourCameraAndTCU'));
      const relative = new Matrix4();
      function assertClear(moving, pose) {
        for (const part of moving) {
          part.bounds.copy(part.geometry.boundingBox).applyMatrix4(part.object.matrixWorld);
          for (const item of fixed) {
            if (!part.bounds.intersectsBox(item.bounds)) continue;
            relative.copy(item.object.matrixWorld).invert().multiply(part.object.matrixWorld);
            assert.ok(
              !item.geometry.boundsTree.intersectsGeometry(part.geometry, relative),
              `${part.object.name} intersects ${item.object.name} at ${pose}`,
            );
          }
        }
      }

      const wheels = [];
      for (const corner of ['FL', 'FR', 'RL', 'RR']) {
        const steer = root.getObjectByName(`LRV_Steer_${corner}`);
        const moving = surfaces(steer);
        assert.ok(moving.some((part) => part.object.name === `LRV_FenderSkin_${corner}`));
        wheels.push(...moving);
        for (let degrees = -50; degrees <= 50; degrees += 2) {
          steer.rotation.y = (degrees * Math.PI) / 180;
          steer.updateMatrixWorld(true);
          assertClear(moving, `${degrees}°`);
        }
        steer.rotation.y = 0;
      }

      // Elevate opposite corners together. Camber and track change as the wishbones
      // swing; on this surface a long inboard fender lip can reach the chassis at lock.
      let bump = 0;
      const rover = new LunarRover(root, { radius: 100, height: (x, z) => bump * Math.tanh(3 * x) * Math.tanh(3 * z) });
      for (bump of [-0.176, -0.088, 0.088, 0.176]) {
        for (const steering of [-1, 1]) {
          for (let step = 0; step < 65; step++) {
            rover.drive(0, steering, false, 1 / 60);
            if (step % 4) continue;
            for (const item of fixed) item.bounds.copy(item.geometry.boundingBox).applyMatrix4(item.object.matrixWorld);
            assertClear(wheels, `diagonal bump ${bump} m, steer ${rover.motion.steer.toFixed(2)} rad`);
          }
        }
      }
    });
  }
}

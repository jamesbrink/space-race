import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { disposeTree } from '../src/viewer/dispose.ts';

// A tree let go frees what the renderer made for it as it was drawn: a skinned mesh's bones' texture among it (made by
// Skeleton.computeBoneTexture at the first draw, and held by the skeleton, not the geometry or the material). Each crew
// member at a pad is one: before, every rebuild of the pad's place left two of them on the GPU.
test('a skinned mesh let go lets go of its bones’ texture', () => {
  const bone = new THREE.Bone();
  const skeleton = new THREE.Skeleton([bone]);
  const geometry = new THREE.BoxGeometry();
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(geometry.attributes.position.count * 4), 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count * 4), 4));
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshStandardMaterial());
  mesh.add(bone);
  mesh.bind(skeleton);
  skeleton.computeBoneTexture();
  const texture = skeleton.boneTexture;
  assert.ok(texture, 'the bones’ texture is made');
  let freed = false;
  texture.addEventListener('dispose', () => {
    freed = true;
  });
  const root = new THREE.Group();
  root.add(mesh);
  disposeTree(root);
  assert.ok(freed, 'its texture is disposed');
  assert.equal(skeleton.boneTexture, null, 'and made again if the mesh is drawn again');
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bulkOf, surfaceOf } from '../src/viewer/bulk.ts';

test('the middle of a surface: each triangle by its area', () => {
  const box = surfaceOf(new THREE.BoxGeometry(2, 4, 6).translate(1, 2, 3));
  assert.ok(Math.abs(box.area - 2 * (2 * 4 + 4 * 6 + 2 * 6)) < 1e-9);
  assert.ok(box.middle.distanceTo(new THREE.Vector3(1, 2, 3)) < 1e-9);
  // a finely divided end does not pull the middle toward itself, as counting vertices did
  const plain = new THREE.PlaneGeometry(10, 1, 1, 1);
  const fine = new THREE.PlaneGeometry(10, 1, 1, 1);
  const busy = mergeGeometries([
    new THREE.PlaneGeometry(5, 1, 1, 1).translate(-2.5, 0, 0),
    new THREE.PlaneGeometry(5, 1, 64, 64).translate(2.5, 0, 0),
  ]);
  assert.ok(surfaceOf(busy).middle.distanceTo(surfaceOf(plain).middle) < 1e-9);
  assert.equal(surfaceOf(fine), surfaceOf(fine), 'worked out once');
  assert.equal(surfaceOf(new THREE.BufferGeometry()).area, 0);
});

test('a part`s middle does not depend on how it is cut into meshes', () => {
  const material = new THREE.MeshBasicMaterial();
  // a truck and its boom: a big body, a long thin arm off to one side, a small dense fitting
  const pieces = [
    new THREE.BoxGeometry(6, 2, 2).translate(0, 1, 0),
    new THREE.BoxGeometry(0.2, 0.2, 12).translate(2, 3, 6),
    new THREE.SphereGeometry(0.2, 48, 32).translate(-3, 2, 0),
  ];
  const apart = new THREE.Group();
  for (const g of pieces) apart.add(new THREE.Mesh(g, material));
  const joined = new THREE.Group().add(new THREE.Mesh(mergeGeometries(pieces.map((g) => g.clone())), material));
  for (const group of [apart, joined]) {
    group.position.set(100, 5, -40);
    group.rotation.y = 0.7;
    group.updateMatrixWorld(true);
  }
  const [a, b] = [new THREE.Vector3(), new THREE.Vector3()];
  assert.ok(bulkOf(apart, a) && bulkOf(joined, b));
  assert.ok(a.distanceTo(b) < 1e-6, `${a.distanceTo(b)} m apart`);
  // it is on the truck, not in the middle of the box round truck and boom
  const box = new THREE.Box3().setFromObject(apart).getCenter(new THREE.Vector3());
  assert.ok(a.distanceTo(box) > 1);
  // a hidden mesh does not count; nothing shown has no middle
  apart.children[1].visible = false;
  assert.ok(bulkOf(apart, b) && b.distanceTo(a) > 0.1);
  for (const mesh of apart.children) mesh.visible = false;
  assert.equal(bulkOf(apart, b), false);
});

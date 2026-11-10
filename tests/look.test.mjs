import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { Looks } from '../src/viewer/look.ts';

const scene = () => {
  const real = new THREE.MeshStandardMaterial({ name: 'paint-red', color: 0xff0000 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), real);
  const root = new THREE.Group().add(mesh);
  return { real, mesh, root };
};

test('cel swaps each material for a toon twin of the same colour, and real puts the original back', () => {
  const { real, mesh, root } = scene();
  const looks = new Looks();
  looks.add(root);
  assert.equal(mesh.material, real);
  looks.set('cel');
  assert.ok(mesh.material.isMeshToonMaterial);
  assert.equal(mesh.material.name, 'paint-red', 'the viewer keys on material names: the twin keeps it');
  assert.equal(mesh.material.color.getHex(), 0xff0000);
  looks.set('real');
  assert.equal(mesh.material, real);
});

test('what arrives later takes the look in force, and meshes that share a material share its twin', () => {
  const a = scene();
  const looks = new Looks();
  looks.set('cel');
  looks.add(a.root);
  const second = new THREE.Mesh(new THREE.BoxGeometry(), a.real);
  const late = new THREE.Group().add(second);
  looks.add(late);
  assert.ok(second.material.isMeshToonMaterial);
  assert.equal(second.material, a.mesh.material);
});

test('a twin follows its material when the cutaway clips it', () => {
  const { real, mesh, root } = scene();
  const looks = new Looks();
  looks.add(root);
  looks.set('cel');
  real.clippingPlanes = [new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)];
  real.side = THREE.DoubleSide;
  looks.sync(real);
  assert.equal(mesh.material.clippingPlanes, real.clippingPlanes);
  assert.equal(mesh.material.side, THREE.DoubleSide);
});

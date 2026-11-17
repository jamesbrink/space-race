import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { Outline, shownMeshes } from '../src/viewer/outline.ts';

const mesh = (name) => Object.assign(new THREE.Mesh(), { name });
const group = (name, ...children) => Object.assign(new THREE.Group(), { name }).add(...children);
const names = (list) => list.map((o) => o.name);

test('the outline draws the meshes of what is selected, and nothing else in the scene', () => {
  const a = mesh('a'),
    b = mesh('b'),
    other = mesh('other');
  const part = group('part', a, group('inner', b));
  const scene = new THREE.Scene().add(group('model', part, other));
  assert.deepEqual(names(shownMeshes([part], scene)), ['a', 'b']);
  assert.deepEqual(names(shownMeshes([a], scene)), ['a'], 'a mesh selected for itself');
  assert.deepEqual(names(shownMeshes([], scene)), []);
});

test('what is not on show is not outlined: hidden itself, under something hidden, or out of the scene', () => {
  const a = mesh('a'),
    b = mesh('b');
  const inner = group('inner', b);
  const part = group('part', a, inner);
  const level = group('level', part);
  const scene = new THREE.Scene().add(group('model', level));
  inner.visible = false;
  assert.deepEqual(names(shownMeshes([part], scene)), ['a'], 'a hidden branch');
  inner.visible = true;
  a.visible = false;
  assert.deepEqual(names(shownMeshes([part], scene)), ['b'], 'a hidden mesh');
  a.visible = true;
  level.visible = false; // (a level of detail that is not the one on show)
  assert.deepEqual(names(shownMeshes([part], scene)), [], 'under something hidden');
  level.visible = true;
  part.visible = false;
  assert.deepEqual(names(shownMeshes([part], scene)), [], 'hidden itself');
  part.visible = true;
  level.removeFromParent();
  assert.deepEqual(names(shownMeshes([part], scene)), [], 'not in the scene');
});

test('a mesh is listed once, with its children left to go with it', () => {
  const child = mesh('child');
  const parent = mesh('parent').add(child);
  const scene = new THREE.Scene().add(group('part', parent));
  assert.deepEqual(names(shownMeshes([scene.children[0]], scene)), ['parent']);
});

test('an outline resized before its next occluder draw can sample depth at the new frame size', () => {
  const outline = new Outline(new THREE.Scene(), new THREE.PerspectiveCamera(), () => null);
  // On a phone, switching Parts and View changes the canvas height while a
  // selection remains. The mask binds tScreens even without occluders, before
  // the target is drawn again when the cutaway reopens.
  for (const [width, height] of [
    [390, 342],
    [390, 432],
    [820, 620],
    [1280, 800],
    [390, 342],
  ]) {
    outline.setSize(width, height);
    const image = outline.prepareMaskMaterial.uniforms.tScreens.value.image;
    assert.equal(image.width, width);
    assert.equal(image.height, height);
  }
  outline.dispose();
});

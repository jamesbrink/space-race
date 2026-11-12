import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { halvesOf, Panes, paneOrder, twoPass } from '../src/viewer/panes.ts';

const glass = () =>
  new THREE.MeshPhysicalMaterial({ name: 'glass', transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
/** Three's own order for what is blended (WebGLRenderLists: reversePainterSortStable). */
const threes = (a, b) =>
  a.groupOrder !== b.groupOrder
    ? a.groupOrder - b.groupOrder
    : a.renderOrder !== b.renderOrder
      ? a.renderOrder - b.renderOrder
      : a.z !== b.z
        ? b.z - a.z
        : a.id - b.id;
const item = (object, z, renderOrder = 2) => ({ object, id: object.id, z, renderOrder, groupOrder: 0 });
function panes() {
  let order = null;
  const made = new Panes({ setTransparentSort: (fn) => (order = fn) }, (mesh, real) => {
    mesh.userData.real = real;
    mesh.material = real;
  });
  return { made, order: () => order };
}
function pane(material = glass()) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.renderOrder = 2;
  mesh.receiveShadow = true;
  return mesh;
}

test('only a clear two-sided material is drawn by three in two passes, and its halves are it with one side each', () => {
  const whole = glass();
  assert.ok(twoPass(whole));
  assert.ok(!twoPass(new THREE.MeshStandardMaterial({ side: THREE.DoubleSide })));
  assert.ok(!twoPass(new THREE.MeshStandardMaterial({ transparent: true })));
  const { back, front } = halvesOf(whole);
  assert.equal(back.side, THREE.BackSide);
  assert.equal(front.side, THREE.FrontSide);
  for (const half of [back, front]) {
    assert.ok(!twoPass(half), 'neither half is ever changed as it is drawn');
    assert.equal(half.name, 'glass');
    assert.equal(half.opacity, whole.opacity);
    assert.equal(half.depthWrite, false);
    assert.equal(half.type, whole.type);
  }
  assert.equal(halvesOf(whole), halvesOf(whole), 'made once');
  assert.equal(whole.side, THREE.DoubleSide, 'the whole one is left as it was');
});

test('a pane becomes itself and a twin under it; a material three draws in one pass is left alone', () => {
  const { made, order } = panes();
  assert.equal(order(), paneOrder, 'the renderer is told the order the twins need');
  const mesh = pane();
  const whole = mesh.material;
  made.add(mesh);
  assert.equal(mesh.children.length, 1);
  const twin = mesh.children[0];
  assert.equal(mesh.material, halvesOf(whole).front);
  assert.equal(twin.material, halvesOf(whole).back);
  assert.equal(twin.geometry, mesh.geometry);
  assert.equal(twin.renderOrder, 2);
  assert.equal(twin.name, '');
  assert.ok(twin.userData.ghost);
  mesh.position.set(3, 4, 5);
  mesh.rotation.y = 1;
  mesh.updateMatrixWorld(true);
  assert.deepEqual(twin.matrixWorld.elements, mesh.matrixWorld.elements, 'it lies exactly where the pane does');
  // a bounding sphere given to the pane (three sorts and culls by it) is the twin's too
  assert.equal(twin.boundingSphere, undefined);
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(1, 2, 3), 4);
  assert.equal(twin.boundingSphere, mesh.boundingSphere);
  const solid = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial());
  made.add(solid);
  assert.equal(solid.children.length, 0);
});

test('the twin is drawn straight before its pane, wherever three would have drawn the pane', () => {
  const { made } = panes();
  const [a, b, c] = [pane(), pane(), pane()];
  const other = new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial({ transparent: true })); // (smoke: not a pane)
  for (const mesh of [a, b, c]) made.add(mesh);
  // b and c at one depth; a further off; the smoke at the depth of b and c, and older than both twins
  const depth = new Map([
    [a, 30],
    [b, 10],
    [c, 10],
    [other, 10],
  ]);
  const before = [a, b, c, other].map((o) => item(o, depth.get(o), o === other ? 0 : 2)).sort(threes);
  // what three did: each pane's back faces, then its front faces, where the pane stood in its list
  const want = before.flatMap((i) => (depth.has(i.object) && i.object !== other ? [`back ${i.id}`, `front ${i.id}`] : [`other ${i.id}`]));
  const now = [a, a.children[0], b, b.children[0], c, c.children[0], other]
    .map((o) => item(o, depth.get(o) ?? depth.get(o.parent), o === other ? 0 : 2))
    .sort(() => 0.5 - Math.random())
    .sort(paneOrder);
  const got = now.map((i) =>
    i.object === other ? `other ${i.id}` : i.object.userData.ghost ? `back ${i.object.parent.id}` : `front ${i.id}`,
  );
  assert.deepEqual(got, want);
  // with no twins in it the order is three's own
  const plain = [a, b, c, other].map((o) => item(o, depth.get(o)));
  assert.deepEqual([...plain].sort(paneOrder), [...plain].sort(threes));
});

test('a ray still meets a pane from either side, and never its twin', () => {
  const { made } = panes();
  const mesh = pane();
  made.add(mesh);
  mesh.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  for (const from of [3, -3]) {
    ray.set(new THREE.Vector3(0.1, 0.3, from), new THREE.Vector3(0, 0, -Math.sign(from)));
    const hits = ray.intersectObject(mesh, true);
    assert.equal(hits.length, 1, `from z = ${from}`);
    assert.equal(hits[0].object, mesh);
  }
  assert.equal(mesh.material.side, THREE.FrontSide, 'and it is drawn with its front half as before');
});

test('switched off, every pane is one mesh with its whole material again', () => {
  const { made } = panes();
  const mesh = pane();
  const whole = mesh.material;
  made.add(mesh);
  made.enabled = false;
  assert.equal(mesh.material, whole);
  assert.equal(mesh.children[0].visible, false);
  const later = pane();
  made.add(later);
  assert.ok(twoPass(later.material), 'one added while it is off is left whole');
  assert.equal(later.children[0].visible, false);
  made.enabled = true;
  assert.equal(mesh.material, halvesOf(whole).front);
  assert.ok(mesh.children[0].visible && later.children[0].visible);
  assert.equal(later.material.side, THREE.FrontSide);
});

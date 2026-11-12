import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { through } from '../src/viewer/pick.ts';
import { Solids, WorldBox } from '../src/viewer/walk.ts';

/** A small scene with one of everything a pick has to deal with. */
function scene() {
  const root = new THREE.Group();
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(2, 0.6, 96, 12), new THREE.MeshBasicMaterial());
  knot.position.set(1, 2, -3);
  knot.rotation.set(0.3, 1.1, -0.4);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 24), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  ball.position.set(-3, 1, 0);
  ball.scale.set(1, 2.5, 0.7); // (not the same each way)
  const inside = new THREE.Mesh(new THREE.SphereGeometry(3, 32, 24), new THREE.MeshBasicMaterial({ side: THREE.BackSide }));
  inside.position.set(4, 0, 4);
  // one mesh, several materials, each with its own sides
  const crate = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2, 6, 6, 6), [
    new THREE.MeshBasicMaterial(),
    new THREE.MeshBasicMaterial({ side: THREE.BackSide }),
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial(),
    new THREE.MeshBasicMaterial(),
    new THREE.MeshBasicMaterial(),
  ]);
  crate.position.set(0, -2, 2);
  const small = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()); // (too few triangles for a hierarchy)
  small.position.set(2, 3, 3);
  const hidden = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial());
  hidden.position.set(0, 5, 0);
  hidden.visible = false; // (three's raycaster asks hidden things too)
  const child = new THREE.Mesh(new THREE.SphereGeometry(0.8, 24, 16), new THREE.MeshBasicMaterial());
  child.position.set(0, 2, 0);
  ball.add(child); // (a mesh under a mesh)
  const many = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 16, 12), new THREE.MeshBasicMaterial(), 3);
  for (let i = 0; i < 3; i++) many.setMatrixAt(i, new THREE.Matrix4().makeTranslation(i * 2 - 2, -4, -1));
  const turned = new THREE.Group().add(knot, inside);
  turned.rotation.y = 0.7;
  turned.scale.setScalar(1.3);
  root.add(turned, ball, crate, small, hidden, many);
  root.position.set(31000, 12, -8000); // (far from the origin, as a site is)
  root.updateMatrixWorld(true);
  return root;
}

/** Rays at the scene from all round it, some through its middle and some wide of it. */
function* rays(root, n) {
  let seed = 12345;
  const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const centre = root.position;
  for (let i = 0; i < n; i++) {
    const from = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5)
      .normalize()
      .multiplyScalar(14 + 10 * random())
      .add(centre);
    const at = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(12).add(centre);
    yield new THREE.Ray(from, at.sub(from).normalize());
  }
}

const same = (a, b, what) => {
  assert.equal(a.object, b.object, `${what}: the same mesh`);
  assert.ok(Math.abs(a.distance - b.distance) < 1e-9, `${what}: ${a.distance} against ${b.distance}`);
  assert.ok(a.point.distanceTo(b.point) < 1e-9, `${what}: the same place`);
};

test('a ray put through the hierarchies meets what three says it meets: every hit, in order', () => {
  const root = scene();
  const solids = new Solids();
  const raycaster = new THREE.Raycaster();
  let hits = 0;
  for (const ray of rays(root, 600)) {
    raycaster.ray.copy(ray);
    const three = raycaster.intersectObjects([root], true);
    const ours = through(raycaster, [root], (g) => solids.tree(g));
    assert.equal(ours.length, three.length, 'as many hits');
    hits += three.length;
    three.forEach((h, i) => {
      same(ours[i], h, `hit ${i}`);
      assert.equal(ours[i].faceIndex, h.faceIndex, 'the same triangle');
      assert.equal(ours[i].face.materialIndex, h.face.materialIndex);
      assert.ok(ours[i].face.normal.distanceTo(h.face.normal) < 1e-9, 'facing the same way');
      assert.equal(ours[i].instanceId, h.instanceId);
    });
  }
  assert.ok(hits > 400, `the rays met something (${hits} hits)`);
  assert.ok(solids.built >= 4, 'through hierarchies');
});

test('asked only for the first thing met, it is the first thing three meets', () => {
  const root = scene();
  const solids = new Solids();
  const raycaster = new THREE.Raycaster();
  let met = 0;
  for (const ray of rays(root, 600)) {
    raycaster.ray.copy(ray);
    const three = raycaster.intersectObjects([root], true);
    const ours = through(raycaster, [root], (g) => solids.tree(g), true);
    assert.equal(ours.length > 0, three.length > 0);
    if (!three.length) continue;
    met++;
    same(ours[0], three[0], 'the first');
    assert.ok(ours.length <= three.length);
  }
  assert.ok(met > 300);
  assert.equal(raycaster.firstHitOnly, undefined, 'the raycaster is left as it was');
});

test('a mesh with no hierarchy yet is asked as three asks it, to the same answer', () => {
  const root = scene();
  const solids = new Solids();
  const raycaster = new THREE.Raycaster();
  let turn = 0;
  const some = (g) => (turn++ % 2 ? solids.tree(g) : solids.fresh(g)); // (now and then there is none)
  for (const ray of rays(root, 300)) {
    raycaster.ray.copy(ray);
    const three = raycaster.intersectObjects([root], true);
    const ours = through(raycaster, [root], some);
    assert.equal(ours.length, three.length);
    three.forEach((h, i) => same(ours[i], h, `hit ${i}`));
  }
});

test("a hierarchy made before a geometry's vertices were moved is not trusted: the mesh is met where it is now", () => {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), new THREE.MeshBasicMaterial());
  mesh.updateMatrixWorld(true);
  const solids = new Solids();
  const raycaster = new THREE.Raycaster(new THREE.Vector3(0, 0, 10), new THREE.Vector3(0, 0, -1));
  solids.tree(mesh.geometry);
  assert.ok(solids.fresh(mesh.geometry), 'as made');
  assert.ok(Math.abs(through(raycaster, [mesh], (g) => solids.fresh(g))[0].distance - 9) < 1e-3);
  // (a hose: the same geometry, its vertices somewhere else)
  const position = mesh.geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) position.setZ(i, position.getZ(i) + 4);
  position.needsUpdate = true;
  mesh.geometry.computeBoundingSphere();
  mesh.geometry.computeBoundingBox();
  assert.equal(solids.fresh(mesh.geometry), null, 'no longer true of it');
  assert.ok(solids.has(mesh.geometry), 'though it is still there');
  const now = through(raycaster, [mesh], (g) => solids.fresh(g));
  assert.ok(Math.abs(now[0].distance - 5) < 1e-3, `met where it is now (${now[0].distance})`);
  assert.equal(now.length, raycaster.intersectObject(mesh).length);
});

test("a mesh's bounds in the world are worked out again only when it has moved, and are then what they would be", () => {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.TorusKnotGeometry(2, 0.6, 32, 8));
  group.add(mesh);
  mesh.position.set(3, 1, -2);
  mesh.rotation.set(0.2, 0.9, 0);
  group.updateMatrixWorld(true);
  const fresh = () => new THREE.Box3().copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
  const world = new WorldBox();
  assert.equal(world.fit(mesh), true, 'the first time');
  assert.ok(world.box.equals(fresh()));
  const kept = world.box.clone();
  assert.equal(world.fit(mesh), false, 'nothing has moved');
  group.updateMatrixWorld(true); // (worked out again to the same values)
  assert.equal(world.fit(mesh), false);
  assert.ok(world.box.equals(kept));
  group.position.x += 1e-9; // however little it moves
  group.updateMatrixWorld(true);
  assert.equal(world.fit(mesh), true, 'its parent moved');
  assert.ok(world.box.equals(fresh()));
  mesh.rotation.z = 1;
  mesh.updateMatrixWorld(true);
  assert.equal(world.fit(mesh), true, 'it turned');
  assert.ok(world.box.equals(fresh()));
  // its geometry's own bounds changed where they are kept
  mesh.geometry.translate(0, 5, 0);
  mesh.geometry.computeBoundingBox();
  assert.equal(world.fit(mesh), true, 'its geometry changed');
  assert.ok(world.box.equals(fresh()));
  mesh.geometry = new THREE.BoxGeometry(1, 1, 1);
  assert.equal(world.fit(mesh), true, 'another geometry');
  assert.ok(world.box.equals(fresh()));
});

test('what is solid is solid where it stands now: a mesh that has moved is found where it went', () => {
  const floor = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 4));
  floor.position.set(0, 1, 0);
  floor.updateMatrixWorld(true);
  const solids = new Solids();
  solids.set([floor]);
  const at = new THREE.Vector3(0, 2, 0);
  solids.gather(at, 2, 4);
  assert.ok(Math.abs(solids.below(0, 2, 0, null) - 1.1) < 1e-6);
  solids.gather(at, 2, 4); // (asked again, nothing moved)
  assert.ok(Math.abs(solids.below(0, 2, 0, null) - 1.1) < 1e-6);
  floor.position.y = 0.5; // a lift goes down
  floor.rotation.y = 0.4;
  floor.updateMatrixWorld(true);
  solids.gather(at, 2, 4);
  assert.ok(Math.abs(solids.below(0, 2, 0, null) - 0.6) < 1e-6);
  floor.position.x = 30; // and is driven off
  floor.updateMatrixWorld(true);
  solids.gather(at, 2, 4);
  assert.equal(solids.below(0, 2, 0, null), null);
  solids.gather(new THREE.Vector3(30, 2, 0), 2, 4);
  assert.ok(Math.abs(solids.below(30, 2, 0, null) - 0.6) < 1e-6);
});

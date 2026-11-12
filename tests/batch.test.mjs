import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { Batches, layoutOf, PROXY_LAYER, pack, unbatchable } from '../src/viewer/batch.ts';

const steel = () => new THREE.MeshStandardMaterial({ name: 'steel' });
const box = (material, x = 0, size = 1) => {
  const geometry = new THREE.BoxGeometry(size, size, size);
  geometry.clearGroups(); // (a box comes with a group a face; a model's mesh has none)
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.position.x = x;
  return mesh;
};
/** A model file of `n` boxes of one material in a row, in a scene, taken up by a `Batches`. */
function staged(n = 3) {
  const material = steel();
  const root = new THREE.Group();
  for (let i = 0; i < n; i++) root.add(box(material, i * 3, 1 + i));
  const scene = new THREE.Scene();
  scene.add(root);
  const batches = new Batches(scene, () => {});
  batches.add(root);
  scene.updateMatrixWorld(true);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(3, 2, 12);
  camera.lookAt(3, 0, 0);
  camera.updateMatrixWorld(true);
  const batch = batches.group.children[0];
  const draw = (cam = camera, shadow = false) =>
    shadow ? batch.onBeforeShadow(null, batch, camera, cam) : batch.onBeforeRender(null, scene, cam);
  return { material, root, scene, batches, camera, batch, draw };
}

test('a plain, opaque, shadowed mesh can be batched; what the viewer treats mesh by mesh cannot', () => {
  const ok = box(steel());
  ok.updateMatrixWorld(true);
  assert.equal(unbatchable(ok), null);
  const why = (change) => {
    const mesh = box(steel());
    change(mesh);
    mesh.updateMatrixWorld(true);
    return unbatchable(mesh);
  };
  assert.ok(why((m) => (m.material.transparent = true)));
  assert.ok(why((m) => (m.material.depthWrite = false)));
  assert.ok(why((m) => (m.material.name = 'glass')));
  assert.ok(why((m) => (m.material.name = 'lamp-amber')));
  assert.ok(why((m) => (m.renderOrder = 1)));
  assert.ok(why((m) => (m.castShadow = false)));
  assert.ok(why((m) => (m.userData.ghost = true)));
  assert.ok(why((m) => (m.onBeforeRender = () => {})));
  assert.ok(
    why((m) => m.scale.set(-1, 1, 1)),
    'a mirrored mesh is drawn with its faces wound the other way',
  );
  assert.ok(why((m) => (m.material = [m.material])));
  assert.ok(why((m) => m.geometry.addGroup(0, 6, 0)));
  // the real material is what counts while the cel look has its twin on the mesh
  assert.ok(
    why((m) => {
      m.userData.real = new THREE.MeshStandardMaterial({ name: 'glass' });
    }),
  );
});

test('geometries are packed end to end: every vertex as it was, every index moved on by the vertices before it', () => {
  const a = new THREE.BoxGeometry(1, 2, 3);
  const b = new THREE.SphereGeometry(1, 8, 6);
  const c = new THREE.BoxGeometry(2, 2, 2).toNonIndexed();
  assert.equal(layoutOf(a), layoutOf(b));
  const { geometry, ranges } = pack([a, b, c]);
  const counts = [a, b, c].map((g) => g.getAttribute('position').count);
  assert.equal(geometry.getAttribute('position').count, counts[0] + counts[1] + counts[2]);
  let before = 0;
  [a, b, c].forEach((g, k) => {
    for (const name of ['position', 'normal', 'uv']) {
      const from = g.getAttribute(name);
      const to = geometry.getAttribute(name);
      assert.deepEqual(
        Array.from(to.array.subarray(before * from.itemSize, (before + from.count) * from.itemSize)),
        Array.from(from.array),
        `${name} of geometry ${k}`,
      );
    }
    const { start, count } = ranges[k];
    const want = g.index ? Array.from(g.index.array, (i) => i + before) : Array.from({ length: counts[k] }, (_, i) => i + before);
    assert.equal(count, want.length);
    assert.deepEqual(Array.from(geometry.index.array.subarray(start, start + count)), want);
    before += counts[k];
  });
  assert.ok(geometry.index.array instanceof Uint16Array, 'few vertices: short indices');
  const many = new THREE.SphereGeometry(1, 300, 300);
  assert.ok(pack([many, many]).geometry.index.array instanceof Uint32Array);
  assert.notEqual(layoutOf(a), layoutOf(new THREE.BoxGeometry().deleteAttribute('uv')));
});

test('a batch takes its meshes off the camera`s layer and leaves them otherwise as they were', () => {
  const { root, batches, batch } = staged();
  assert.deepEqual(batches.count, { meshes: 3, batches: 1 });
  batches.prepare();
  for (const mesh of root.children) {
    assert.equal(mesh.layers.mask, 1 << PROXY_LAYER);
    assert.ok(mesh.visible && mesh.parent === root);
  }
  assert.ok(batch.visible && batch.isBatchedMesh && !batch.frustumCulled);
  assert.equal(new THREE.Box3().setFromObject(batches.group).isEmpty(), true, 'a batch is not a thing in the world');
  // off: everything is drawn alone again
  batches.enabled = false;
  for (const mesh of root.children) assert.equal(mesh.layers.mask, 1);
  assert.equal(batch.visible, false);
  batches.enabled = true;
  for (const mesh of root.children) assert.equal(mesh.layers.mask, 1 << PROXY_LAYER);
});

test('one mesh of a material is not worth a batch', () => {
  const { batches } = staged(1);
  assert.deepEqual(batches.count, { meshes: 0, batches: 0 });
});

test('each instance is given the matrices three would give its mesh, to the last bit', () => {
  const { root, scene, batches, camera, batch, draw } = staged();
  root.children[1].rotation.set(0.3, 1.1, -0.4);
  root.children[2].scale.set(1, 2.5, 0.5);
  root.position.set(-4e5, 12, 7e5); // (drawn from the eye: the scene is moved by minus the eye before a draw)
  camera.position.add(root.position);
  camera.updateMatrixWorld(true);
  scene.updateMatrixWorld(true);
  batches.prepare();
  draw();
  assert.equal(batch._multiDrawCount, 3);
  const data = batch._matricesTexture.image.data;
  const base = batch._indirectTexture.image.data[0];
  root.children.forEach((mesh, i) => {
    // as WebGLRenderer.renderObject has them, sent as WebGLUniforms sends them
    const modelView = new THREE.Matrix4().multiplyMatrices(camera.matrixWorldInverse, mesh.matrixWorld);
    const normal = new THREE.Matrix3().getNormalMatrix(modelView);
    const at = (base + i) * 48;
    assert.deepEqual(Array.from(data.subarray(at, at + 16)), Array.from(new Float32Array(modelView.elements)), 'model-view');
    assert.deepEqual(Array.from(data.subarray(at + 16, at + 32)), Array.from(new Float32Array(mesh.matrixWorld.elements)), 'world');
    const n = new Float32Array(normal.elements);
    assert.deepEqual(
      [0, 1, 2, 4, 5, 6, 8, 9, 10].map((k) => data[at + 32 + k]),
      Array.from(n),
      'normal',
    );
    const index = mesh.geometry.index;
    assert.equal(batch._multiDrawCounts[i], index.count);
    assert.equal(batch._multiDrawStarts[i] % index.array.BYTES_PER_ELEMENT, 0);
  });
});

test('a mesh moved between frames is drawn where it is; one out of view, hidden or out of the scene is not drawn', () => {
  const { root, scene, batches, batch, draw, camera } = staged();
  batches.prepare();
  draw();
  assert.equal(batch._multiDrawCount, 3);
  const data = batch._matricesTexture.image.data;
  // moved (a door swung): the next frame has it there
  root.children[0].position.y = 1.25;
  scene.updateMatrixWorld(true);
  batches.prepare();
  draw();
  const world = new THREE.Matrix4().fromArray(data, 16);
  assert.equal(world.elements[13], 1.25);
  // behind the camera: culled, as three culls a mesh by its bounding sphere
  root.children[1].position.z = 60;
  scene.updateMatrixWorld(true);
  batches.prepare();
  draw();
  assert.equal(batch._multiDrawCount, 2);
  root.children[1].frustumCulled = false; // (asked never to be culled: it is drawn)
  batches.prepare();
  draw();
  assert.equal(batch._multiDrawCount, 3);
  root.children[1].position.z = 0;
  // hidden itself, or under something hidden
  root.children[2].visible = false;
  scene.updateMatrixWorld(true);
  batches.prepare();
  draw();
  assert.equal(batch._multiDrawCount, 2);
  root.visible = false;
  batches.prepare();
  assert.equal(batch.visible, false);
  root.visible = root.children[2].visible = true;
  // taken out of the model and put somewhere else in the scene (a stage falling away): still drawn, where it is
  const holder = new THREE.Group();
  holder.position.set(0, 1, 0);
  scene.add(holder);
  holder.add(root.children[0]);
  scene.updateMatrixWorld(true);
  batches.prepare();
  draw();
  assert.equal(batch._multiDrawCount, 3);
  // out of the scene altogether
  scene.remove(holder);
  batches.prepare();
  draw();
  assert.equal(batch._multiDrawCount, 2);
  // the light's camera: its own view, and only the model-view matrix is wanted
  const light = new THREE.OrthographicCamera(-20, 20, 20, -20, 0.1, 100);
  light.position.set(0, 30, 0);
  light.lookAt(0, 0, 0);
  light.updateMatrixWorld(true);
  draw(light, true);
  const mesh = batch.instances.find((i) => i.live).mesh;
  const modelView = new THREE.Matrix4().multiplyMatrices(light.matrixWorldInverse, mesh.matrixWorld);
  const at = batch._indirectTexture.image.data[0] * 48;
  const lit = batch._matricesTexture;
  assert.deepEqual(Array.from(lit.image.data.subarray(at, at + 16)), Array.from(new Float32Array(modelView.elements)));
  draw(camera); // (and back to the eye's for the scene: its own matrices, in its own texture)
  assert.notEqual(batch._matricesTexture, lit);
  assert.deepEqual(
    Array.from(batch._matricesTexture.image.data.subarray(at, at + 16)),
    Array.from(new Float32Array(new THREE.Matrix4().multiplyMatrices(camera.matrixWorldInverse, mesh.matrixWorld).elements)),
  );
});

test('matrices are worked out again only when something has changed, and never sent to the texture last drawn from', () => {
  const { root, scene, batches, batch, draw, camera } = staged();
  const frame = () => {
    scene.updateMatrixWorld(true);
    batches.prepare();
    draw();
  };
  frame();
  assert.deepEqual(batches.tally, { worked: 1, kept: 0 });
  const first = batch._matricesTexture;
  const sent = first.version;
  frame();
  frame();
  assert.deepEqual(batches.tally, { worked: 1, kept: 2 }, 'a still view of a still scene: nothing to work out');
  assert.equal(batch._matricesTexture, first);
  assert.equal(first.version, sent, 'and nothing sent');
  assert.equal(batch._multiDrawCount, 3);
  // the camera moves
  camera.position.x += 0.5;
  camera.updateMatrixWorld(true);
  frame();
  assert.equal(batches.tally.worked, 2);
  assert.notEqual(batch._matricesTexture, first, 'the texture the last frame was drawn from is left to the GPU');
  // a mesh moves
  root.children[2].rotation.z = 0.2;
  frame();
  assert.equal(batches.tally.worked, 3);
  // a mesh is hidden
  root.children[1].visible = false;
  frame();
  assert.equal(batches.tally.worked, 4);
  assert.equal(batch._multiDrawCount, 2);
  frame();
  assert.equal(batches.tally.worked, 4);
  // a second draw in one frame through the same camera finds it done
  draw();
  assert.deepEqual(batches.tally, { worked: 4, kept: 1 + 2 });
  // the textures go round, so one is written again only after three others
  const seen = new Set();
  for (let i = 0; i < 8; i++) {
    camera.position.y += 0.1;
    camera.updateMatrixWorld(true);
    frame();
    seen.add(batch._matricesTexture);
  }
  assert.equal(seen.size, 4);
});

test('a mesh that stops matching its batch is drawn alone again, and comes back when it matches', () => {
  const { root, batches, batch, material, draw } = staged();
  const mesh = root.children[1];
  batches.prepare();
  mesh.material = steel();
  batches.prepare();
  draw();
  assert.equal(mesh.layers.mask, 1, 'on the camera`s layer: three draws it');
  assert.equal(batch._multiDrawCount, 2);
  mesh.material = material;
  mesh.castShadow = false;
  batches.prepare();
  assert.equal(mesh.layers.mask, 1);
  mesh.castShadow = true;
  batches.prepare();
  draw();
  assert.equal(mesh.layers.mask, 1 << PROXY_LAYER);
  assert.equal(batch._multiDrawCount, 3);
  // the batch's own material made clear (a lamp lit): none of it can be drawn in one unsorted call
  material.transparent = true;
  batches.prepare();
  assert.equal(batch.visible, false);
  for (const m of root.children) assert.equal(m.layers.mask, 1);
});

test('the shader reads an instance`s matrices where three reads a mesh`s, and nothing else is changed', () => {
  const chunk = THREE.ShaderChunk;
  assert.match(chunk.project_vertex, /#ifdef USE_BATCHING\s+mvPosition = batchingMatrix \* mvPosition;\s+#else/);
  assert.match(
    chunk.project_vertex,
    /mvPosition = modelViewMatrix \* mvPosition;\s+#endif\s+gl_Position = projectionMatrix \* mvPosition;/,
  );
  assert.match(chunk.defaultnormal_vertex, /transformedNormal = batchingNormal \* transformedNormal;\s+#else/);
  assert.match(chunk.defaultnormal_vertex, /transformedNormal = normalMatrix \* transformedNormal;\s+#endif/);
  assert.match(chunk.worldpos_vertex, /worldPosition = batchingWorld \* worldPosition;\s+#else/);
  assert.match(chunk.worldpos_vertex, /worldPosition = modelMatrix \* worldPosition;\s+#endif\s+#endif/);
  assert.match(chunk.batching_vertex, /mat4 batchingWorld = batchingRow\( batchingAt \+ 4 \);/);
});

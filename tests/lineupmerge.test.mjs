// A level of a vehicle joined by paint (src/app/lineup/merge.ts) and the shelf's keys (shelf.ts): what is joined and
// what keeps itself, every triangle kept and facing the way it faced, every corner where it was to under a
// millimetre in ten metres, each wearing its own paint, the spacecraft apart, and a file known by its bytes.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { BESIDE, backFacingMarkings, CORNERS, drawn, join, PAINTS, paintMaterial, paintOf } from '../src/app/lineup/merge.ts';
import { keyOf, Shelf } from '../src/app/lineup/shelf.ts';
import { floorPlates, sharedPaint, showPlates, showSharedPaint } from '../src/app/lineup/stand.ts';
import { Looks } from '../src/viewer/look.ts';

test('shared coarse paint batches only visible copies at rest, using their transforms and current look', () => {
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  const frustum = new THREE.Frustum().setFromProjectionMatrix(camera.projectionMatrix);
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshStandardMaterial({ name: 'lineup-paint' });
  const stands = Array.from({ length: 7 }, (_, i) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(i === 3 ? 100 : i, 0, -20);
    const root = new THREE.Group().add(mesh);
    root.updateMatrixWorld(true);
    return { levels: [root], coarsest: 0, shown: 0, fading: i === 2, standing: i !== 4, mesh };
  });
  stands[5].shown = 1;
  stands[6].mesh.visible = false;
  const groups = sharedPaint(stands);
  const toon = new THREE.MeshToonMaterial({ name: 'lineup-paint' });
  for (const { mesh } of stands) mesh.material = toon;
  const originals = [];
  showSharedPaint(groups, frustum, originals);
  const [{ batch }] = groups;
  assert.equal(batch.count, 2);
  assert.equal(batch.material, toon);
  assert.deepEqual(
    originals,
    stands.slice(0, 2).map(({ mesh }) => mesh),
  );
  originals.forEach((mesh, i) => {
    const matrix = new THREE.Matrix4();
    batch.getMatrixAt(i, matrix);
    assert.ok(matrix.equals(mesh.matrixWorld));
  });
});

test('different lineup files share matching painted buffers until the last owner leaves', async (t) => {
  t.mock.method(THREE.FileLoader.prototype, 'loadAsync', async (url) => Uint8Array.of(Number(url)).buffer);
  const shelf = new Shelf(async (_bytes, url) => {
    const color = url === '3' ? 'red' : 'white';
    const geometry = new THREE.BoxGeometry();
    if (url === '4') geometry.index.array.reverse();
    return new THREE.Group().add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color })));
  });
  const take = (url) => shelf.take(url, false, { key: '', of: () => null });
  const roots = await Promise.all(['1', '2', '3', '4'].map(async (url) => (await take(url)).root));
  const [first, second, repainted, reversed] = roots.map((root) => root.children[0].geometry);
  assert.equal(first, second);
  assert.notEqual(first, repainted);
  assert.notEqual(first, reversed);
  let disposals = 0;
  first.addEventListener('dispose', () => disposals++);
  shelf.give(roots[0]);
  await Promise.resolve();
  assert.equal(disposals, 0);
  for (const root of roots.slice(1)) shelf.give(root);
  await Promise.resolve();
  assert.equal(disposals, 1);
  assert.notEqual((await take('1')).root.children[0].geometry, first);
});

test('the shared plate draw keeps each visible stand’s scale, tint and back-to-front order', () => {
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.updateMatrixWorld(true);
  const frustum = new THREE.Frustum().setFromProjectionMatrix(camera.projectionMatrix);
  const stand = (x, z, radius, tint, strength, standing = true) => {
    const plate = new THREE.Object3D();
    plate.position.set(x, 0, z);
    plate.scale.setScalar(radius);
    plate.updateMatrixWorld(true);
    return { plate, plateColour: new THREE.Color(tint), plateStrength: strength, standing };
  };
  const near = stand(0, -4, 2, 0xff0000, 0.2);
  const far = stand(0, -12, 3, 0x0000ff, 0.085);
  const outside = stand(90, -4, 2, 0xffffff, 0.085);
  const away = stand(0, -8, 1, 0xffffff, 0.085, false);
  const plates = floorPlates(4);
  showPlates(plates, [near, outside, far, away], camera, frustum);
  assert.equal(plates.count, 2);
  const matrix = new THREE.Matrix4();
  const tints = plates.geometry.getAttribute('aTint');
  [far, near].forEach((expected, i) => {
    plates.getMatrixAt(i, matrix);
    assert.ok(matrix.equals(expected.plate.matrixWorld));
    assert.deepEqual([tints.getX(i), tints.getY(i), tints.getZ(i)], expected.plateColour.toArray());
    assert.equal(tints.getW(i), Math.fround(expected.plateStrength));
  });
});

const paint = (hex, options = {}) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.4, metalness: 0.2, ...options });

/** A level: a top-level node `Cabin` (the spacecraft) and `Booster`, each a group of meshes. */
function level() {
  const root = new THREE.Group();
  const cabin = new THREE.Group();
  cabin.name = 'Cabin';
  cabin.position.set(0, 20, 0);
  const booster = new THREE.Group();
  booster.name = 'Booster';
  const white = paint(0xffffff);
  const red = paint(0xff0000, { side: THREE.DoubleSide, roughness: 0.8 });
  const flag = paint(0xffffff, { map: new THREE.Texture() });
  const glass = paint(0x88aacc);
  glass.name = 'glass';
  cabin.add(new THREE.Mesh(new THREE.ConeGeometry(1.2, 3, 16), white));
  const port = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), glass);
  port.renderOrder = 2;
  cabin.add(port);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 18, 24), white);
  tank.position.y = 9;
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2, 1), red);
  fin.position.set(1.6, 1, 0);
  // a mirrored fin, as an export may make one
  const other = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2, 1), red);
  other.position.set(-1.6, 1, 0);
  other.scale.x = -1;
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.6), flag);
  decal.position.set(0, 12, 1.51);
  booster.add(tank, fin, other, decal);
  root.add(cabin, booster);
  root.userData.lod_above = [9, 3];
  root.updateMatrixWorld(true);
  return { root, white, red, flag, glass };
}

/** Every triangle of the meshes under `root`, as three corners in the root's frame, sorted so that two lists compare. */
function triangles(root, only = () => true) {
  root.updateMatrixWorld(true);
  const out = [];
  const v = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isMesh || !only(o)) return;
    const p = o.geometry.getAttribute('position');
    const list = o.geometry.index ? o.geometry.index.array : Array.from({ length: p.count }, (_, i) => i);
    for (let i = 0; i < list.length; i += 3) {
      const corners = [0, 1, 2].map((k) =>
        v
          .fromBufferAttribute(p, list[i + k])
          .applyMatrix4(o.matrixWorld)
          .toArray(),
      );
      // the face's normal by its winding: which way it faces (three turns a mirrored mesh's winding round as it draws it)
      const [a, b, c] = corners.map((x) => new THREE.Vector3(...x));
      const n = b.clone().sub(a).cross(c.clone().sub(a)).multiplyScalar(Math.sign(o.matrixWorld.determinant()));
      out.push({ centre: a.add(b).add(c).divideScalar(3), facing: n.lengthSq() ? n.normalize() : n });
    }
  });
  return out;
}

test('a material that is only paint is paint; one with a picture, glass or see-through keeps itself', () => {
  assert.deepEqual(paintOf(paint(0xff0000, { side: THREE.DoubleSide })), {
    colour: [1, 0, 0],
    emission: [0, 0, 0],
    roughness: 0.4,
    metalness: 0.2,
    both: true,
  });
  assert.equal(paintOf(paint(0xffffff, { map: new THREE.Texture() })), null);
  const glass = paint(0xffffff);
  glass.name = 'glass-visor';
  assert.equal(paintOf(glass), null);
  const target = paint(0xffffff, { emissive: 0x330000, emissiveIntensity: 0.55 });
  const pair = new THREE.Group();
  const tile = new THREE.PlaneGeometry(1, 1);
  pair.add(new THREE.Mesh(tile, paint(0xffffff)), new THREE.Mesh(tile, target));
  const joined = join(pair, []);
  assert.equal(joined.pieces.length, 1);
  assert.deepEqual(
    joined.pieces[0].paints.map((p) => p.emission[0]),
    [0, target.emissive.r * 0.55],
  );
  const bright = paintOf(target);
  assert.deepEqual(bright.emission, [target.emissive.r * 0.55, 0, 0]);
  for (const name of ['physical', 'toon']) {
    const shader = { ...THREE.ShaderLib[name], uniforms: {} };
    paintMaterial([bright]).onBeforeCompile(shader);
    assert.equal(shader.uniforms.uEmission.value[0], Math.fround(bright.emission[0]));
    assert.match(shader.fragmentShader, /totalEmissiveRadiance \+= uEmission/);
  }
  assert.equal(paintOf(paint(0xffffff, { emissiveMap: new THREE.Texture() })), null);
  assert.equal(paintOf(paint(0xffffff, { transparent: true, opacity: 0.5 })), null);
  assert.equal(paintOf(new THREE.MeshPhysicalMaterial()), null);
  assert.equal(paintOf(new THREE.MeshBasicMaterial()), null);
});

test('a level joined: paint in one piece for the spacecraft and one for the rest, the rest each in its own material', () => {
  const { root, flag } = level();
  const joined = join(root, ['Cabin']);
  const painted = joined.pieces.filter((p) => p.paints);
  assert.equal(painted.length, 2, 'two paint pieces: the spacecraft and the rest');
  assert.deepEqual(painted.map((p) => p.craft).sort(), [false, true]);
  assert.equal(painted.find((p) => !p.craft).paints.length, 2, 'white and red, each once');
  const own = joined.pieces.filter((p) => !p.paints);
  assert.equal(own.length, 2, 'the glass and the picture keep their own materials');
  assert.ok(own.some((p) => p.material === flag && !p.craft));
  assert.ok(
    own.some((p) => p.material.name === 'glass' && p.craft && p.renderOrder === 2),
    'glass keeps its turn to be drawn',
  );
  assert.deepEqual(joined.userData.lod_above, [9, 3], "the level's extras go with it");
  for (const p of painted) {
    assert.ok(p.geometry.getAttribute('position').array instanceof Int16Array, 'positions in shorts');
    assert.ok(p.geometry.getAttribute('normal').array instanceof Int8Array, 'normals in bytes');
    assert.ok(p.geometry.index.array instanceof Uint16Array, 'triangles listed in two bytes');
  }
});

test('what the spacecraft flew to meet is joined apart from the spacecraft and from the rest, by its name', () => {
  const { root, white } = level();
  const target = new THREE.Group();
  target.name = 'Target';
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 8, 16), white);
  can.position.set(-6, 4, 0);
  target.add(can);
  root.add(target);
  root.updateMatrixWorld(true);
  const before = triangles(root).length;
  const joined = join(root, ['Cabin'], false, ['Target']);
  const painted = joined.pieces.filter((p) => p.paints);
  assert.deepEqual(
    painted.map((p) => p.part).sort(),
    [BESIDE, 'craft', 'rest'],
    'three paint pieces: the spacecraft, its target, the rest',
  );
  assert.equal(painted.find((p) => p.part === BESIDE).craft, false, 'the target is no part of the spacecraft');
  const made = drawn(joined);
  assert.ok(made.children.some((c) => c.name === BESIDE && !c.userData.craft));
  assert.equal(triangles(made).length, before, 'every triangle kept');
  // with none stated, as before: two
  assert.equal(join(level().root, ['Cabin']).pieces.filter((p) => p.paints).length, 2);
  // part by part, it is its own parts, by their names
  assert.ok(
    drawn(join(root, ['Cabin'], true, ['Target'])).children.some((c) => c.name === 'Target'),
    'the finest level keeps its name',
  );
});

test('every triangle is kept, where it was to a millimetre in ten metres, facing the way it faced (a mirrored mesh too)', () => {
  const { root } = level();
  const before = triangles(root);
  const after = triangles(drawn(join(root, ['Cabin'])));
  assert.equal(after.length, before.length, `${after.length} triangles of ${before.length}`);
  const key = (t) =>
    t.centre
      .toArray()
      .map((x) => Math.round(x * 100))
      .join();
  const index = new Map(after.map((t) => [key(t), t]));
  let worst = 0;
  let turned = 0;
  for (const t of before) {
    const a = index.get(key(t)) ?? after.reduce((best, x) => (x.centre.distanceTo(t.centre) < best.centre.distanceTo(t.centre) ? x : best));
    worst = Math.max(worst, a.centre.distanceTo(t.centre));
    if (t.facing.lengthSq() && a.facing.dot(t.facing) < 0.99) turned++;
  }
  // the vehicle is 21.5 m tall: a short across half of it is 0.33 mm
  assert.ok(worst < 0.001, `the furthest a face moved: ${(worst * 1000).toFixed(3)} mm`);
  assert.equal(turned, 0, 'no face turned round');
});

test("each corner wears its own mesh's paint", () => {
  const { root, red } = level();
  const joined = join(root, null);
  const piece = joined.pieces.find((p) => p.paints);
  assert.equal(joined.pieces.filter((p) => p.paints).length, 1, 'with no spacecraft named, all paint is one piece');
  const at = piece.paints.findIndex((p) => p.both);
  assert.deepEqual(piece.paints[at].colour, [red.color.r, red.color.g, red.color.b]);
  const paints = piece.geometry.getAttribute('paint').array;
  // the two fins are 2 x 24 corners in red; the cone and the tank the rest, in white
  const reds = [...paints].filter((p) => p === at).length;
  assert.equal(reds, 2 * new THREE.BoxGeometry(0.1, 2, 1).getAttribute('position').count);
});

test('duplicated corners across a UV seam fit in one draw with 16-bit indices', () => {
  const root = new THREE.Group();
  const panel = new THREE.Group();
  root.add(panel);
  const mesh = new THREE.PlaneGeometry(1, 1, 255, 128);
  // Two coincident sets of positions with different UVs. A plain paint does not sample the UVs.
  const second = mesh.clone();
  second.getAttribute('uv').array.fill(0);
  const surface = paint(0xefefef);
  panel.add(new THREE.Mesh(mesh, surface), new THREE.Mesh(second, surface));
  assert.ok(2 * mesh.getAttribute('position').count > CORNERS);
  const { pieces } = join(root, null);
  assert.equal(pieces.length, 1);
  assert.ok(pieces[0].geometry.index.array instanceof Uint16Array);
  assert.equal(pieces[0].geometry.index.count, 2 * mesh.index.count);
});

test('a piece never holds more corners than two bytes can list, nor more paints than its shader carries', () => {
  const root = new THREE.Group();
  const node = new THREE.Group();
  node.name = 'Body';
  root.add(node);
  for (let i = 0; i < PAINTS + 6; i++) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), paint(new THREE.Color().setHSL(i / 50, 0.5, 0.5)));
    mesh.position.x = i * 3;
    node.add(mesh);
  }
  const joined = join(root, null);
  assert.ok(joined.pieces.length > 1);
  for (const p of joined.pieces) {
    assert.ok(p.geometry.getAttribute('position').count <= CORNERS);
    assert.ok(p.paints.length <= PAINTS);
  }
  const all = joined.pieces.reduce((n, p) => n + p.geometry.index.count, 0);
  const want = (PAINTS + 6) * new THREE.SphereGeometry(1, 48, 32).index.count;
  assert.equal(all, want, 'every triangle in one piece or another');
});

test("each vehicle draws a joined level in materials of its own, on the same geometry; the spacecraft's pieces say so", () => {
  const { root } = level();
  const joined = join(root, ['Cabin']);
  const [a, b] = [drawn(joined), drawn(joined)];
  assert.equal(a.children.length, joined.pieces.length);
  a.children.forEach((m, i) => {
    assert.equal(m.geometry, b.children[i].geometry, 'geometry shared');
    assert.notEqual(m.material, b.children[i].material, 'materials not');
    assert.equal(m.userData.craft, joined.pieces[i].craft);
  });
  assert.ok(a.userData.joined && a.userData.lod_above);
  // the paint shader: its key is shared by every piece, so it is one program
  const [x, y] = [paintMaterial([]), paintMaterial([])];
  assert.equal(x.customProgramCacheKey(), y.customProgramCacheKey());
  assert.equal(x.side, THREE.DoubleSide);
  const shader = {
    uniforms: {},
    vertexShader: THREE.ShaderLib.physical.vertexShader,
    fragmentShader: THREE.ShaderLib.physical.fragmentShader,
  };
  x.onBeforeCompile(shader);
  assert.ok(shader.uniforms.uPaint && shader.uniforms.uSurface);
  assert.match(shader.fragmentShader, /roughnessFactor = paintColour\.a/);
  assert.match(shader.fragmentShader, /diffuse \* paintColour\.rgb/);
  assert.match(shader.vertexShader, /vPaint = paint/);
  // and the cel look's (look.ts gives its twin the same patch)
  const toon = { uniforms: {}, vertexShader: THREE.ShaderLib.toon.vertexShader, fragmentShader: THREE.ShaderLib.toon.fragmentShader };
  x.onBeforeCompile(toon);
  assert.match(toon.fragmentShader, /diffuse \* paintColour\.rgb/);
});

test('a file is known by its bytes', () => {
  const a = new TextEncoder().encode('glTF one').buffer;
  const b = new TextEncoder().encode('glTF one').buffer;
  const c = new TextEncoder().encode('glTF two').buffer;
  assert.equal(keyOf(a), keyOf(b));
  assert.notEqual(keyOf(a), keyOf(c));
});

test('the finest level is joined part by part: each part a thing of its own, by its name, every triangle kept', () => {
  const { root } = level();
  const before = triangles(root).length;
  const joined = join(root, ['Cabin'], true);
  const names = new Set(joined.pieces.map((p) => p.part));
  assert.deepEqual([...names].sort(), ['Booster', 'Cabin']);
  assert.ok(joined.pieces.every((p) => p.craft === (p.part === 'Cabin')));
  const out = drawn(joined);
  assert.deepEqual([...new Set(out.children.map((c) => c.name))].sort(), ['Booster', 'Cabin']);
  assert.equal(triangles(out).length, before);
});

test('what is not a plain mesh is kept as it is', () => {
  const root = new THREE.Group();
  const node = new THREE.Group();
  node.name = 'Mast';
  node.position.set(0, 3, 0);
  const points = [new THREE.Vector3(), new THREE.Vector3(0, 2, 0)];
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial());
  line.position.x = 1;
  node.add(line, new THREE.Mesh(new THREE.BoxGeometry(), paint(0xffffff)));
  root.add(node);
  const out = drawn(join(root, null, true));
  const kept = out.children.find((c) => c.isLine);
  assert.ok(kept, 'the line is there');
  assert.deepEqual(kept.position.toArray(), [1, 3, 0], 'where it stood');
  assert.equal(kept.geometry, line.geometry);
  assert.notEqual(kept.material, line.material);
});

test('a Lineup window skips only an empty transparency pass', () => {
  const root = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ name: 'glass', side: THREE.DoubleSide, transparent: true });
  for (const angle of [-Math.PI / 4, Math.PI / 4]) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(), material);
    mesh.rotation.y = angle;
    root.add(mesh);
  }
  const [window] = drawn(join(root, null)).children;
  const camera = new THREE.PerspectiveCamera();
  for (const [x, z, single] of [
    [0, 5, true],
    [0, -5, true],
    [5, 0, false],
  ]) {
    camera.position.set(x, 0, z);
    window.onBeforeRender(null, null, camera, window.geometry, window.material);
    assert.equal(window.material.forceSinglePass, single);
  }
  window.onBeforeRender(null, null, new THREE.OrthographicCamera(), window.geometry, window.material);
  assert.equal(window.material.forceSinglePass, false);
});

test('small Lineup panes draw backs then fronts in one ordered mesh in both looks', () => {
  // Try the same two oppositely wound panes disjoint, overlapping and partly behind the near plane.
  for (const [separation, z, indexed] of [
    [3, -3, true],
    [0.1, -3, false],
    [0, -0.3, true],
  ]) {
    const root = new THREE.Group();
    const material = new THREE.MeshPhysicalMaterial({ name: 'glass', transparent: true, side: THREE.DoubleSide, depthWrite: false });
    for (const sign of [1, -1]) {
      const mesh = new THREE.Mesh(indexed ? new THREE.PlaneGeometry() : new THREE.PlaneGeometry().toNonIndexed(), material);
      mesh.position.set(sign * separation, 0, z + sign * 0.05);
      mesh.rotation.y = sign === 1 ? 0.7 : Math.PI - 0.8;
      if (!indexed) mesh.scale.x = -1;
      root.add(mesh);
    }
    const original = triangles(root);
    const made = drawn(join(root, null));
    const [pane] = made.children;
    assert.equal(made.children.length, 1);
    assert.equal(pane.material.side, THREE.FrontSide);
    assert.equal(material.side, THREE.DoubleSide, 'the source keeps its own material');
    const submitted = triangles(made);
    assert.equal(submitted.length, 2 * original.length);
    const geometry = pane.geometry;
    const normal = geometry.getAttribute('normal');
    for (const [i, triangle] of original.entries()) {
      for (const [offset, sign] of [
        [0, -1],
        [original.length, 1],
      ]) {
        const face = submitted[i + offset];
        assert.ok(face.centre.distanceTo(triangle.centre) < 1e-6);
        assert.ok(sign * face.facing.dot(triangle.facing) > 0.99999, 'winding');
        const lighting = new THREE.Vector3().fromBufferAttribute(normal, geometry.index.getX(3 * (i + offset)));
        assert.ok(sign * lighting.dot(triangle.facing) > 0.99999, 'lighting normal');
      }
    }
    for (const eye of [new THREE.Vector3(0, 0, 5), new THREE.Vector3(0, 0, -5)]) {
      const visible = (tri) => tri.facing.dot(eye.clone().sub(tri.centre)) > 0;
      const expected = [...original.filter((tri) => !visible(tri)), ...original.filter(visible)];
      const drawn = submitted.filter(visible);
      assert.equal(drawn.length, expected.length);
      drawn.forEach((tri, i) => assert.ok(tri.centre.distanceTo(expected[i].centre) < 1e-6, 'original back-then-front order'));
    }
    const looks = new Looks();
    looks.add(made);
    looks.set('cel');
    assert.equal(pane.material.side, THREE.FrontSide);
    assert.ok(pane.material.isMeshToonMaterial);
    looks.remove(made);
  }
});

test('Lineup glass with an active draw range keeps it', () => {
  const root = new THREE.Group();
  const geometry = new THREE.PlaneGeometry();
  geometry.setDrawRange(3, 3);
  const material = new THREE.MeshPhysicalMaterial({ name: 'glass', transparent: true, side: THREE.DoubleSide, depthWrite: false });
  root.add(new THREE.Mesh(geometry, material));
  const [pane] = drawn(join(root, null)).children;
  assert.deepEqual(pane.geometry.drawRange, { start: 3, count: 3 });
  assert.equal(pane.geometry.index.count, 6);
});

test('a one-sided marking is culled only when every triangle faces away from the eye', () => {
  const texture = new THREE.Texture();
  const source = new THREE.Group();
  const face = new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshStandardMaterial({ map: texture }));
  source.add(face);
  const level = drawn(join(source, null));
  const mesh = level.children[0];
  const eye = new THREE.Vector3(0, 0, -2);
  assert.deepEqual(backFacingMarkings(level, eye), [mesh]);
  assert.deepEqual(backFacingMarkings(level, eye.setZ(0)), []);
  assert.deepEqual(backFacingMarkings(level, eye.setZ(2)), []);
  const edge = new THREE.Mesh(new THREE.PlaneGeometry(), face.material);
  edge.rotation.y = Math.PI / 2;
  face.add(edge);
  const corner = drawn(join(source, null));
  assert.deepEqual(backFacingMarkings(corner, eye.set(2, 0, -2)), []);
  assert.equal(backFacingMarkings(corner, eye.set(-2, 0, -2)).length, 1);
  eye.set(0, 0, 2);
  level.rotation.y = Math.PI;
  level.scale.x = -1;
  assert.deepEqual(backFacingMarkings(level, eye), [mesh]);
  mesh.material.side = THREE.DoubleSide;
  assert.deepEqual(backFacingMarkings(level, eye), []);
  mesh.material.side = THREE.FrontSide;
  mesh.visible = false;
  assert.deepEqual(backFacingMarkings(level, eye), []);
});

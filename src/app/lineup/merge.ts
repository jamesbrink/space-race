import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * A level of a vehicle as the row draws it from across the hall: its meshes joined into a few draws (lineup/scene.ts
 * draws the finer levels this way, and the finest as built, part by part). Nothing is changed that can be seen.
 *
 * - **By paint.** Most of a vehicle's materials are paint and nothing else: a colour, a roughness, a metalness, one side
 *   or both (`paintOf`). Every mesh in one of those is joined into one geometry that carries, at each corner, which of
 *   them it wears (`paint`, a byte), and is drawn in one material that looks the paint up (`paintMaterial`: the
 *   colours and surfaces are uniforms, as exact as the GLB's own figures). A material that is more than paint (a
 *   picture, glass, a glow) keeps itself, and its meshes are joined among themselves.
 * - **Small.** A joined geometry's corners are kept in ten bytes where the GLB's take thirty-two: the position in three
 *   shorts across the piece's own box (to a sixty-five-thousandth of its longest side: under 1.5 mm on a 44 m vehicle,
 *   finer than the Draco compression it arrived in), the normal in three signed bytes, the paint in one. A piece holds
 *   no more than 65,535 corners, so that its triangles are listed in two bytes a corner.
 * - **By what stands there.** The spacecraft and the rest of the vehicle are joined apart (`craft`), so the row can stand
 *   the spacecraft alone from the same level.
 *
 * Each piece is a mesh whose position and scale put the shorts back into metres (the same scale on every axis, so that
 * the normals need nothing). Pure: it reads the level and makes geometries and materials, and touches no renderer
 * (tests/lineupmerge.test.mjs).
 */

/** How many paints one joined piece may wear: the uniforms its shader carries. */
export const PAINTS = 32;
/** The most corners a joined piece holds, so that two bytes list them. */
export const CORNERS = 65535;

/** A material that is nothing but paint. */
export interface Paint {
  colour: [number, number, number];
  roughness: number;
  metalness: number;
  /** Drawn from both sides (the GLB's `doubleSided`); otherwise its back faces are not drawn. */
  both: boolean;
}

/** What a material is if it is only paint, or null if it is more than that (and is to keep itself). */
export function paintOf(material: THREE.Material): Paint | null {
  const m = material as THREE.MeshStandardMaterial;
  if (!m.isMeshStandardMaterial || (m as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial || m.name.startsWith('glass')) return null;
  const maps = [m.map, m.emissiveMap, m.normalMap, m.bumpMap, m.roughnessMap, m.metalnessMap, m.aoMap, m.alphaMap, m.lightMap];
  if (maps.some(Boolean) || m.displacementMap || m.envMap) return null;
  if (m.transparent || m.alphaTest > 0 || m.opacity < 1 || m.vertexColors || m.flatShading || m.wireframe) return null;
  if ((m.emissive.r || m.emissive.g || m.emissive.b) && m.emissiveIntensity > 0) return null;
  if (m.envMapIntensity !== 1 || m.side === THREE.BackSide || m.polygonOffset || !m.depthWrite || !m.depthTest || !m.colorWrite)
    return null;
  if (m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile || m.clippingPlanes?.length) return null;
  return { colour: [m.color.r, m.color.g, m.color.b], roughness: m.roughness, metalness: m.metalness, both: m.side === THREE.DoubleSide };
}

const samePaint = (a: Paint, b: Paint): boolean =>
  a.colour.every((c, i) => c === b.colour[i]) && a.roughness === b.roughness && a.metalness === b.metalness && a.both === b.both;

/**
 * The material a joined piece is drawn in: the stages' own standard material, drawn from both sides, which takes each
 * corner's colour, roughness and metalness from its paint, and does not draw the back of a face whose paint is
 * one-sided. Its cel twin (look.ts) is patched the same way, and so is a fading twin (lod.ts): every piece of every
 * vehicle shares one program for each.
 */
export function paintMaterial(paints: readonly Paint[]): THREE.MeshStandardMaterial {
  const colour = new Float32Array(PAINTS * 4);
  const surface = new Float32Array(PAINTS * 4);
  paints.forEach((p, i) => {
    colour.set([...p.colour, p.roughness], i * 4);
    surface.set([p.metalness, p.both ? 1 : 0], i * 4);
  });
  const material = new THREE.MeshStandardMaterial({
    name: 'lineup-paint',
    color: 0xffffff,
    roughness: 1,
    metalness: 1,
    side: THREE.DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPaint = { value: colour };
    shader.uniforms.uSurface = { value: surface };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', 'attribute float paint;\nvarying float vPaint;\n#include <common>')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvPaint = paint;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `uniform vec4 uPaint[${PAINTS}];\nuniform vec4 uSurface[${PAINTS}];\nvarying float vPaint;\n#include <common>`,
      )
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        // (every corner of a face wears the same paint, so what arrives is that paint's number to the last bit, or near it)
        `int paintAt = int( vPaint + 0.5 );
	vec4 paintColour = uPaint[ paintAt ];
	vec4 paintSurface = uSurface[ paintAt ];
	if ( paintSurface.y < 0.5 && ! gl_FrontFacing ) discard;
	vec4 diffuseColor = vec4( diffuse * paintColour.rgb, opacity );`,
      )
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = paintColour.a;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = paintSurface.x;');
  };
  material.customProgramCacheKey = () => 'lineup-paint';
  return material;
}

/** One mesh of a level, where it is in the level's frame. */
interface Source {
  geometry: THREE.BufferGeometry;
  matrix: THREE.Matrix4;
  material: THREE.Material;
  craft: boolean;
  renderOrder: number;
}

/** A joined piece, as made once and drawn by every vehicle that has this level (`Joined.meshes`). */
export interface Piece {
  geometry: THREE.BufferGeometry;
  /** Paint (the paints it wears), or a material of its own (shared, as the level had it). */
  paints: Paint[] | null;
  material: THREE.Material | null;
  craft: boolean;
  /** What it was joined from: its part's top-level node, or `craft` or `rest`. */
  part: string;
  renderOrder: number;
  /** Something kept as it was (not a plain mesh), and where it stood in the level's frame. */
  object?: THREE.Object3D;
  matrix?: THREE.Matrix4;
  /** Where the piece's own frame is in the level's, for a piece in shorts: its middle, and the half of its longest side. */
  at: THREE.Vector3;
  scale: number;
}

/** A level, joined: its pieces, and what the level carried in its extras (`lod_above`). */
export interface Joined {
  pieces: Piece[];
  userData: Record<string, unknown>;
}

/** Corners and the triangles' list of a geometry, as numbers to walk. */
function listOf(geometry: THREE.BufferGeometry): ArrayLike<number> {
  const index = geometry.index;
  if (index) return index.array;
  const n = geometry.getAttribute('position').count;
  return Array.from({ length: n }, (_, i) => i);
}

/** Join paint sources (each under CORNERS corners, together under PAINTS paints) into one piece in shorts. */
function joinPaint(sources: readonly Source[], craft: boolean): Piece {
  const paints: Paint[] = [];
  const paintIndex = sources.map((s) => {
    const p = paintOf(s.material)!;
    let at = paints.findIndex((q) => samePaint(p, q));
    if (at < 0) at = paints.push(p) - 1;
    return at;
  });
  let corners = 0;
  let listed = 0;
  for (const s of sources) {
    corners += s.geometry.getAttribute('position').count;
    listed += s.geometry.index ? s.geometry.index.count : s.geometry.getAttribute('position').count;
  }
  // the box round it all, in the level's frame
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  for (const s of sources) {
    const position = s.geometry.getAttribute('position');
    for (let i = 0; i < position.count; i++) box.expandByPoint(v.fromBufferAttribute(position, i).applyMatrix4(s.matrix));
  }
  const at = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const scale = Math.max(1e-6, size.x / 2, size.y / 2, size.z / 2);
  const positions = new Int16Array(corners * 3);
  const normals = new Int8Array(corners * 3);
  const paint = new Uint8Array(corners);
  const list = corners > CORNERS ? new Uint32Array(listed) : new Uint16Array(listed);
  const n = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();
  const short = (x: number): number => Math.max(-32767, Math.min(32767, Math.round(x * 32767)));
  const byte = (x: number): number => Math.max(-127, Math.min(127, Math.round(x * 127)));
  // Source UV seams can duplicate corners. Plain paint has no UVs, so identical
  // encoded positions, normals and paint are exactly the same GPU vertex.
  const unique = new Map<string, number>();
  let written = 0;
  sources.forEach((s, k) => {
    const position = s.geometry.getAttribute('position');
    let normal = s.geometry.getAttribute('normal');
    if (!normal) {
      s.geometry.computeVertexNormals();
      normal = s.geometry.getAttribute('normal');
    }
    normalMatrix.getNormalMatrix(s.matrix);
    const remap = new Uint32Array(position.count);
    for (let i = 0; i < position.count; i++) {
      v.fromBufferAttribute(position, i).applyMatrix4(s.matrix).sub(at).divideScalar(scale);
      const x = short(v.x),
        y = short(v.y),
        z = short(v.z);
      n.fromBufferAttribute(normal, i).applyMatrix3(normalMatrix).normalize();
      const nx = byte(n.x),
        ny = byte(n.y),
        nz = byte(n.z);
      const colour = paintIndex[k]!;
      const key = String.fromCharCode(x, y, z, nx, ny, nz, colour);
      let index = unique.get(key);
      if (index === undefined) {
        index = unique.size;
        unique.set(key, index);
        positions.set([x, y, z], index * 3);
        normals.set([nx, ny, nz], index * 3);
        paint[index] = colour;
      }
      remap[i] = index;
    }
    // (a mirrored mesh's faces are wound the other way: put back, so that its fronts are still its fronts)
    const mirrored = s.matrix.determinant() < 0;
    const from = listOf(s.geometry);
    for (let i = 0; i + 2 < from.length; i += 3) {
      list[written++] = remap[from[i]!]!;
      list[written++] = remap[from[mirrored ? i + 2 : i + 1]!]!;
      list[written++] = remap[from[mirrored ? i + 1 : i + 2]!]!;
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions.slice(0, unique.size * 3), 3, true));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals.slice(0, unique.size * 3), 3, true));
  geometry.setAttribute('paint', new THREE.BufferAttribute(paint.slice(0, unique.size), 1));
  const indices = list.subarray(0, written);
  geometry.setIndex(
    new THREE.BufferAttribute(unique.size <= CORNERS && indices instanceof Uint32Array ? new Uint16Array(indices) : indices, 1),
  );
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return { geometry, paints, material: null, craft, part: '', renderOrder: 0, at, scale };
}

/** Whether geometries can be joined by three's own `mergeGeometries` without its complaining: the same attributes, the same way. */
function joinable(geometries: readonly THREE.BufferGeometry[]): boolean {
  const first = geometries[0]!;
  const names = Object.keys(first.attributes).sort().join();
  return geometries.every((g) => {
    if (Object.keys(g.attributes).sort().join() !== names || Boolean(g.index) !== Boolean(first.index)) return false;
    if (Object.keys(g.morphAttributes).length) return false;
    return Object.entries(g.attributes).every(([name, a]) => {
      const b = first.attributes[name] as THREE.BufferAttribute;
      const x = a as THREE.BufferAttribute;
      return (
        !(x as unknown as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute &&
        x.itemSize === b.itemSize &&
        x.normalized === b.normalized &&
        x.array.constructor === b.array.constructor
      );
    });
  });
}

/** Meshes in a material of their own, joined among themselves where they can be: as floats, in the level's frame. */
function joinOwn(sources: readonly Source[]): Piece[] {
  const placed = sources.map((s) => {
    const g = s.geometry.clone().applyMatrix4(s.matrix);
    if (s.matrix.determinant() < 0 && g.index) {
      const a = g.index.array;
      for (let i = 0; i + 2 < a.length; i += 3) [a[i + 1], a[i + 2]] = [a[i + 2]!, a[i + 1]!];
    }
    return g;
  });
  const first = sources[0]!;
  const one = (geometry: THREE.BufferGeometry): Piece => ({
    geometry,
    paints: null,
    material: first.material,
    craft: first.craft,
    part: '',
    renderOrder: first.renderOrder,
    at: new THREE.Vector3(),
    scale: 1,
  });
  if (placed.length === 1) return [one(placed[0]!)];
  const joined = joinable(placed) ? mergeGeometries(placed) : null;
  if (!joined) return placed.map(one);
  for (const g of placed) g.dispose();
  return [one(joined)];
}

/**
 * Join a level (as it arrived and was dressed: lineup/stand.ts `dress`). `craft`: the top-level nodes that are the
 * spacecraft (null: no part of it is; the spacecraft alone is then the whole of it). `byPart`: each top-level node (a
 * part, as the vehicle's parts list names it) joined by itself, so that it is still a thing of its own, by its name (the
 * finest level); otherwise the spacecraft and the rest each in as few pieces as there can be (the coarser levels, drawn
 * small). What is not a plain mesh (a line, points, a skinned or instanced mesh, one with morph targets) is kept as it is.
 * `beside`: the top-level nodes of what the spacecraft flew to meet (address.ts `targetNodes`), neither the spacecraft
 * nor the rest: joined apart from both (its pieces named `beside`), so the row can stand it by itself.
 */
/** What a joined level's pieces of the spacecraft's target are named, where they are not joined part by part. */
export const BESIDE = 'beside';

export function join(root: THREE.Object3D, craft: readonly string[] | null, byPart = false, beside: readonly string[] = []): Joined {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert();
  /** Paint sources by what they are joined into (a part's name, or the spacecraft or the rest), and own sources by that and their material. */
  const paint = new Map<string, { part: string; craft: boolean; sources: Source[] }>();
  const own = new Map<string, { part: string; sources: Source[] }>();
  const kept: Piece[] = [];
  for (const child of root.children) {
    // Its opaque enclosure stays closed in every Lineup pose. The Gallery loads the full source.
    if (child.userData.lineup_enclosed) continue;
    const isCraft = Boolean(craft?.includes(child.name));
    const into = byPart ? child.name : isCraft ? 'craft' : beside.includes(child.name) ? BESIDE : 'rest';
    child.traverse((o) => {
      if (!o.visible) return;
      const mesh = o as THREE.Mesh;
      const matrix = inverse.clone().multiply(o.matrixWorld);
      const plain =
        mesh.isMesh &&
        !Array.isArray(mesh.material) &&
        !(mesh as THREE.SkinnedMesh).isSkinnedMesh &&
        !(mesh as THREE.InstancedMesh).isInstancedMesh &&
        !Object.keys(mesh.geometry.morphAttributes).length;
      if (!plain) {
        const drawable = (o as THREE.Line).isLine || (o as THREE.Points).isPoints || mesh.isMesh;
        if (drawable)
          kept.push({
            geometry: mesh.geometry,
            paints: null,
            material: null,
            object: o,
            matrix,
            part: into,
            craft: isCraft,
            renderOrder: o.renderOrder,
            at: new THREE.Vector3(),
            scale: 1,
          });
        return;
      }
      const source: Source = {
        geometry: mesh.geometry,
        matrix,
        material: mesh.material as THREE.Material,
        craft: isCraft,
        renderOrder: mesh.renderOrder,
      };
      if (paintOf(source.material) && mesh.renderOrder === 0) {
        const group = paint.get(into) ?? { part: into, craft: isCraft, sources: [] };
        group.sources.push(source);
        paint.set(into, group);
      } else {
        const key = `${into}|${source.material.uuid}|${mesh.renderOrder}`;
        const group = own.get(key) ?? { part: into, sources: [] };
        group.sources.push(source);
        own.set(key, group);
      }
    });
  }
  const pieces: Piece[] = [];
  for (const { part, craft: isCraft, sources } of paint.values()) {
    // UV seams disappear in plain paint. Size a draw by its encoded corners, so a handful of duplicates
    // in the GLB cannot force another draw. Bound temporary allocations while finding that size.
    function emit(batch: Source[]) {
      if (!batch.length) return;
      const piece = joinPaint(batch, isCraft);
      if (batch.length === 1 || piece.geometry.getAttribute('position').count <= CORNERS) {
        pieces.push({ ...piece, part });
        return;
      }
      piece.geometry.dispose();
      const mid = Math.ceil(batch.length / 2);
      emit(batch.slice(0, mid));
      emit(batch.slice(mid));
    }
    let batch: Source[] = [];
    let corners = 0;
    let paints: Paint[] = [];
    for (const source of sources) {
      const count = source.geometry.getAttribute('position').count;
      const paint = paintOf(source.material)!;
      if (batch.length && (corners + count > 2 * CORNERS || (paints.length >= PAINTS && !paints.some((p) => samePaint(p, paint))))) {
        emit(batch);
        batch = [];
        corners = 0;
        paints = [];
      }
      batch.push(source);
      corners += count;
      if (!paints.some((p) => samePaint(p, paint))) paints.push(paint);
    }
    emit(batch);
  }
  for (const { part, sources } of own.values()) pieces.push(...joinOwn(sources).map((p) => ({ ...p, part })));
  pieces.push(...kept);
  return { pieces, userData: { ...root.userData } };
}

/** A double-sided transparent mesh normally takes two draws. If all triangles face the same way
 * from the eye, one of those draws is empty. Bound their plane equations once in mesh space. */
function cullEmptyGlassPass(mesh: THREE.Mesh): void {
  const material = mesh.material as THREE.Material;
  if (!material.transparent || material.side !== THREE.DoubleSide || !material.name.startsWith('glass')) return;
  const geometry = mesh.geometry;
  const points = geometry.getAttribute('position');
  const indices = geometry.index;
  geometry.computeBoundingSphere();
  const centre = geometry.boundingSphere!.center;
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    normal = new THREE.Vector3();
  const bounds = new THREE.Box3();
  let low = Infinity,
    high = -Infinity;
  for (let i = 0; i < (indices?.count ?? points.count); i += 3) {
    a.fromBufferAttribute(points, indices?.getX(i) ?? i);
    b.fromBufferAttribute(points, indices?.getX(i + 1) ?? i + 1).sub(a);
    normal
      .fromBufferAttribute(points, indices?.getX(i + 2) ?? i + 2)
      .sub(a)
      .cross(b);
    if (!normal.lengthSq()) continue;
    normal.normalize();
    bounds.expandByPoint(normal);
    const offset = a.sub(centre).dot(normal);
    low = Math.min(low, offset);
    high = Math.max(high, offset);
  }
  mesh.onBeforeRender = (_renderer, _scene, camera, _geometry, worn) => {
    if (!worn.transparent || worn.side !== THREE.DoubleSide) return;
    if (!(camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      worn.forceSinglePass = false;
      return;
    }
    camera.getWorldPosition(a);
    mesh.worldToLocal(a).sub(centre);
    let near = -high,
      far = -low;
    for (const axis of ['x', 'y', 'z'] as const) {
      const u = a[axis] * bounds.min[axis],
        v = a[axis] * bounds.max[axis];
      near += Math.min(u, v);
      far += Math.max(u, v);
    }
    worn.forceSinglePass = near > 1e-5 || far < -1e-5;
  };
}

/**
 * A vehicle's own drawing of a joined level: a mesh for each piece, sharing the piece's geometry (and an own piece's
 * pictures) with every other vehicle that has the same level, each in a material of its own (so that a vehicle's
 * change of look or of level is its own). Each piece is named for what it was joined from (its part's node, or `craft`
 * and `rest`), and the spacecraft's say so (`userData.craft`).
 */
export function drawn(joined: Joined): THREE.Group {
  const root = new THREE.Group();
  root.userData = { ...joined.userData, joined: true };
  for (const piece of joined.pieces) {
    let object: THREE.Object3D;
    if (piece.object) {
      object = piece.object.clone(false);
      piece.matrix!.decompose(object.position, object.quaternion, object.scale);
      const worn = (object as THREE.Mesh).material;
      if (worn) (object as THREE.Mesh).material = Array.isArray(worn) ? worn.map((m) => m.clone()) : worn.clone();
    } else {
      // (an own piece's material is copied too: the copy shares its pictures, which are the shelf's to let go)
      object = new THREE.Mesh(piece.geometry, piece.paints ? paintMaterial(piece.paints) : piece.material!.clone());
      cullEmptyGlassPass(object as THREE.Mesh);
      object.position.copy(piece.at);
      object.scale.setScalar(piece.scale);
    }
    object.renderOrder = piece.renderOrder;
    object.userData.craft = piece.craft;
    object.name = piece.part;
    root.add(object);
  }
  root.updateMatrixWorld(true);
  return root;
}

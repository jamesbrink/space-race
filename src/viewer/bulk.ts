import * as THREE from 'three';

/**
 * Where a thing's bulk is: the middle of its surface, each triangle counting for its area. Not the middle of the box
 * round it (a truck with a boom is pointed at on the truck), and not anything that depends on how the thing is cut
 * into meshes: counted by vertices, a part's middle moved by up to 17 cm when its meshes were joined at export.
 * Two meshes or one, the same triangles give the same point.
 */

/** A geometry's surface: its area, and the middle of it, in the geometry's own frame. Worked out once. */
const surfaces = new WeakMap<THREE.BufferGeometry, { area: number; middle: THREE.Vector3 }>();

export function surfaceOf(geometry: THREE.BufferGeometry): { area: number; middle: THREE.Vector3 } {
  const known = surfaces.get(geometry);
  if (known) return known;
  const at = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const middle = new THREE.Vector3();
  let area = 0;
  if (at) {
    const [a, b, c, ab, ac] = [0, 1, 2, 3, 4].map(() => new THREE.Vector3());
    const corners = index ? index.count : at.count;
    for (let i = 0; i + 2 < corners; i += 3) {
      a.fromBufferAttribute(at, index ? index.getX(i) : i);
      b.fromBufferAttribute(at, index ? index.getX(i + 1) : i + 1);
      c.fromBufferAttribute(at, index ? index.getX(i + 2) : i + 2);
      const size = ab.subVectors(b, a).cross(ac.subVectors(c, a)).length() / 2;
      middle.addScaledVector(a.add(b).add(c), size / 3);
      area += size;
    }
  }
  if (area > 0) middle.divideScalar(area);
  const found = { area, middle };
  surfaces.set(geometry, found);
  return found;
}

const point = new THREE.Vector3();

/**
 * The middle of the surface of every mesh under `object` that is shown, in the world, into `into`; false if there is
 * none. World matrices must be up to date. (A mesh scaled unevenly is weighed by its area as built times the mean of
 * its scales squared: near enough, and models are not built scaled.)
 */
export function bulkOf(object: THREE.Object3D, into: THREE.Vector3): boolean {
  let weight = 0;
  into.set(0, 0, 0);
  object.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible || mesh.userData.ghost) return;
    const { area, middle } = surfaceOf(mesh.geometry);
    if (!area) return;
    const e = mesh.matrixWorld.elements;
    const scale = (Math.hypot(e[0]!, e[1]!, e[2]!) * Math.hypot(e[4]!, e[5]!, e[6]!) * Math.hypot(e[8]!, e[9]!, e[10]!)) ** (2 / 3);
    into.addScaledVector(point.copy(middle).applyMatrix4(mesh.matrixWorld), area * scale);
    weight += area * scale;
  });
  if (!weight) return false;
  into.divideScalar(weight);
  return true;
}

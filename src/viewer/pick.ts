import * as THREE from 'three';
import type { MeshBVH } from 'three-mesh-bvh';

/**
 * What a ray meets, found through each mesh's bounding volume hierarchy.
 *
 * Three's own `Raycaster.intersectObjects` tests the ray against every triangle of every mesh whose
 * bounding sphere it passes through: under the pointer that is the whole vehicle and the structure
 * behind it, each time the pointer moves. The walker already keeps a hierarchy for each geometry it
 * has come near (walk.ts `Solids`); `through` puts the same ray to those, and gives what three would
 * have given: the same objects are asked in the same order (hidden ones too, as three asks them),
 * the same triangles are met at the same places, and the list is sorted the same way.
 *
 * With `first`, each mesh gives only the nearest place the ray meets it, which is all that is wanted
 * when the first thing met is the answer; the first of the list is then the first of three's. (Where
 * one mesh has two triangles in the same place, which of the two is named may differ.)
 *
 * Three's own test is still used for what a hierarchy cannot stand for or is not worth one: an
 * instanced or skinned mesh, anything that is not a plain mesh, a geometry of a few triangles, and
 * whatever `tree` has no hierarchy for.
 */

/** Fewer triangles than this and three's own test is as quick as building anything. */
const WORTH = 128;

/** How many triangles a geometry has. */
export const triangles = (geometry: THREE.BufferGeometry): number =>
  (geometry.index ? geometry.index.count : (geometry.getAttribute('position')?.count ?? 0)) / 3;

const plain = THREE.Mesh.prototype.raycast;
const sphere = new THREE.Sphere();
const byDistance = (a: THREE.Intersection, b: THREE.Intersection) => a.distance - b.distance;

/** Whether a mesh can be asked through a hierarchy at all: a plain mesh with enough triangles to be worth one. */
function suits(mesh: THREE.Mesh): boolean {
  if (mesh.raycast !== plain) return false; // (instanced, skinned and batched meshes have their own)
  const geometry = mesh.geometry;
  const position = geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
  if (!position || (position as unknown as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute) return false;
  return triangles(geometry) >= WORTH && !geometry.morphAttributes.position;
}

/**
 * Everything the raycaster's ray meets under `roots`, nearest first: `raycaster.intersectObjects(roots, true)`.
 * `tree` gives a geometry's hierarchy, or null where there is none to trust (not made yet, or made before the
 * geometry's vertices were moved): that mesh is asked three's way this time.
 */
export function through(
  raycaster: THREE.Raycaster,
  roots: readonly THREE.Object3D[],
  tree: (geometry: THREE.BufferGeometry) => MeshBVH | null,
  first = false,
): THREE.Intersection[] {
  const hits: THREE.Intersection[] = [];
  const quick = raycaster as THREE.Raycaster & { firstHitOnly?: boolean };
  const was = quick.firstHitOnly;
  quick.firstHitOnly = first;
  const ask = (object: THREE.Object3D): void => {
    if (object.layers.test(raycaster.layers)) {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh && suits(mesh)) {
        // (a ray that misses the mesh's bounds meets none of it: no hierarchy is made for what the pointer never crosses)
        const geometry = mesh.geometry;
        if (!geometry.boundingSphere) geometry.computeBoundingSphere();
        sphere.copy(geometry.boundingSphere!).applyMatrix4(mesh.matrixWorld);
        if (mesh.material !== undefined && raycaster.ray.intersectsSphere(sphere)) {
          const bvh = tree(geometry);
          if (bvh) bvh.raycastObject3D(mesh, raycaster, hits);
          else mesh.raycast(raycaster, hits);
        }
      } else if ((object.raycast(raycaster, hits) as unknown) === false) return; // (as three: an object may answer for all under it)
    }
    for (const child of object.children) ask(child);
  };
  try {
    for (const root of roots) ask(root);
  } finally {
    quick.firstHitOnly = was;
  }
  return hits.sort(byDistance);
}

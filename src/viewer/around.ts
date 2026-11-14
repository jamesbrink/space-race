import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { SiteAround } from '../types';
import { grain } from './surface';

/**
 * What stands round a site beyond its own place and is seen from it (`SiteDef.around`): a model built in the site's
 * frame, one node a thing, fetched with the scene and set down on the land as scenery. Scenery is never measured or
 * framed, so it does not pull the pad's shadow maps off the pad as a far building in the place's own model did
 * (site-1.md, "On the horizon"). It is built as the Cape's neighbouring complexes are (cape1961.ts `neighbours`): a
 * mesh for each material it wears, there from the start and empty until the model arrives, so that the look in force
 * and the walker have them before there is anything to see.
 */

/** Blender names a second material of a name `name.001`: the name is what the viewer keys on. */
const named = (name: string): string => name.replace(/\.\d{3}$/, '');

/**
 * `lift(x, z, half)`: how far to raise a thing whose middle is (x, z) in the scene and which reaches `half` metres from
 * it, over where its model has it, so that it stands on the land drawn there and not in it or over it.
 */
export function buildAround(
  around: SiteAround,
  lift: (x: number, z: number, half: number) => number,
): { meshes: THREE.Mesh[]; arrived: () => boolean } {
  const meshes = new Map<string, THREE.Mesh>();
  for (const name of around.wears) {
    const material = new THREE.MeshStandardMaterial({ name, color: 0x808080, roughness: 0.8 });
    material.shadowSide = THREE.DoubleSide; // as every model's surfaces cast (stage.ts: dress)
    grain(material);
    // nothing yet: one point underground, so that it is a mesh with a place to whoever lists the scene's meshes
    const nothing = new THREE.BufferGeometry().setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, -1e3, 0, 0, -1e3, 0, 0, -1e3, 0], 3),
    );
    const mesh = new THREE.Mesh(nothing, material);
    mesh.name = `Around_${name}`;
    mesh.castShadow = mesh.receiveShadow = true;
    meshes.set(name, mesh);
  }
  let news = false;
  // (no page: a test builds the place without it)
  if (typeof document !== 'undefined') {
    const draco = new DRACOLoader().setDecoderPath(`${import.meta.env.BASE_URL}draco/`);
    new GLTFLoader()
      .setDRACOLoader(draco)
      .loadAsync(import.meta.env.BASE_URL + around.model)
      .then((gltf) => {
        const lists = new Map<string, THREE.BufferGeometry[]>();
        gltf.scene.updateWorldMatrix(false, true);
        for (const name of around.nodes) {
          const node = gltf.scene.getObjectByName(name);
          if (!node) {
            console.warn(`around.ts: ${around.model} has no node "${name}": not drawn`);
            continue;
          }
          const box = new THREE.Box3().setFromObject(node);
          const middle = box.getCenter(new THREE.Vector3());
          node.position.y += lift(middle.x, middle.z, Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2);
          node.updateWorldMatrix(true, true);
          node.traverse((o) => {
            const part = o as THREE.Mesh;
            if (!part.isMesh) return;
            const from = part.material as THREE.MeshStandardMaterial;
            const key = named(from.name);
            const to = meshes.get(key);
            if (!to) {
              console.warn(`around.ts: ${around.model} wears "${from.name}", which its site's \`around.wears\` does not list: not drawn`);
              return;
            }
            // the material is the model's: its colour and finish are taken from it, here and on the twin a look may have made
            const real = (to.userData.real ?? to.material) as THREE.MeshStandardMaterial;
            real.color.copy(from.color);
            real.roughness = from.roughness;
            real.metalness = from.metalness;
            if (to.material !== real) (to.material as THREE.MeshToonMaterial).color.copy(from.color);
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', part.geometry.getAttribute('position').clone());
            g.setAttribute('normal', part.geometry.getAttribute('normal').clone());
            g.setIndex(part.geometry.getIndex()!.clone());
            g.applyMatrix4(part.matrixWorld);
            lists.set(key, [...(lists.get(key) ?? []), g]);
          });
        }
        for (const [name, list] of lists) {
          const mesh = meshes.get(name)!;
          mesh.geometry.dispose();
          mesh.geometry = mergeGeometries(list);
          mesh.geometry.computeBoundingBox();
          mesh.geometry.computeBoundingSphere();
        }
        news = true;
      })
      .catch((e) => console.warn(`what stands round the site (${around.model}) did not arrive, and is done without:`, e))
      .finally(() => draco.dispose());
  }
  return {
    meshes: [...meshes.values()],
    arrived: () => {
      const was = news;
      news = false;
      return was;
    },
  };
}

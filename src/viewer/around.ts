import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { SiteAround } from '../types';
import { Crossfade, LOD_ABOVE, type Levelled, lodUrl, Scenery } from './lod';
import { grain } from './surface';

/**
 * What stands round a place beyond its own model and is seen from it: the assembly building of Site 2 round Site 1
 * (`SiteDef.around`), the Cape's neighbouring launch complexes round LC-5 (cape1961.ts). A model of its own, one top-level
 * node a thing, fetched with the scene at each of its levels of detail and set down on the land as scenery. Scenery is
 * never measured or framed, so it does not pull the pad's shadow maps off the pad as a far building in the place's own
 * model did (site-1.md, "On the horizon").
 *
 * Each thing is a piece of a `Scenery` (lod.ts), as each building of the place round the pad is: drawn at the level its
 * own size on screen calls for (its node's `lod_above`, measured, or 8 and 2 px/m), and changing level by the same
 * cross-fade. A thing's meshes at each level are joined into one a material, so a building is a draw call for each
 * material it wears, and the levels coarser than the first are another draw of it (`ghost`: not solid to the walker,
 * who walks on the first). Its materials are made at once, one for each it wears (`wears`), each on a mesh that is a
 * point under the ground until the model arrives, so the look in force and the warming of every shader (`everyLevel`,
 * the fade's twins too) have them before there is anything to see; what arrives wears the same.
 */

/** Blender names a second material of a name `name.001`: the name is what the viewer keys on. */
const named = (name: string): string => name.replace(/\.\d{3}$/, '');

/** One thing of the model to draw: its node, and where it is to be put (moved, turned), from the node as built at the first level. */
export interface AroundThing {
  node: string;
  place?: (node: THREE.Object3D) => void;
}

export class Around implements Levelled {
  /** What goes in the scene: its levels (made when they arrive) and the materials' stand-ins, under one group. */
  readonly group = new THREE.Group();
  /** The things at their levels, once the first has arrived: for a test to hold a level (`Scenery.forced`). */
  scenery: Scenery | null = null;
  private readonly materials = new Map<string, THREE.Mesh>();
  /** The stand-ins twice over, for the fade's two sides to be warmed on (`everyLevel`). */
  private readonly warming = new Crossfade();
  private readonly standIns: [THREE.Group, THREE.Group] = [new THREE.Group(), new THREE.Group()];
  private news = false;
  private every: [boolean, boolean] = [false, false];

  constructor(url: string, things: AroundThing[], wears: readonly string[], tag: string) {
    this.group.name = `Around:${url}`;
    for (const name of wears) {
      const material = new THREE.MeshStandardMaterial({ name, color: 0x808080, roughness: 0.8 });
      material.shadowSide = THREE.DoubleSide; // as every model's surfaces cast (stage.ts: dress)
      grain(material);
      for (const [i, holder] of this.standIns.entries()) {
        // nothing yet: one point underground, so that it is a mesh with a place to whoever lists the scene's meshes
        const nothing = new THREE.BufferGeometry().setAttribute(
          'position',
          new THREE.Float32BufferAttribute([0, -1e3, 0, 0, -1e3, 0, 0, -1e3, 0], 3),
        );
        const mesh = new THREE.Mesh(nothing, material);
        mesh.name = `Around_${name}`;
        mesh.castShadow = mesh.receiveShadow = true;
        if (i) mesh.userData.ghost = true;
        holder.add(mesh);
        if (!i) this.materials.set(name, mesh);
      }
    }
    this.group.add(...this.standIns);
    // (no page: a test builds the place without it)
    if (typeof document === 'undefined') return;
    const draco = new DRACOLoader().setDecoderPath(`${import.meta.env.BASE_URL}draco/`);
    const loader = new GLTFLoader().setDRACOLoader(draco);
    const levels = [0, ...LOD_ABOVE.map((_, i) => i + 1)].map((level) =>
      loader.loadAsync(import.meta.env.BASE_URL + lodUrl(url, level)).then((gltf) => gltf.scene),
    );
    const placed = new Map<string, THREE.Object3D>();
    levels[0]!
      .then((scene) => {
        const full = this.level(scene, things, tag, placed, 0);
        this.scenery = new Scenery(full);
        if (this.every[0]) this.scenery.everyLevel(true, this.every[1]);
        this.news = true;
        return Promise.all(
          levels.slice(1).map((p, i) =>
            p
              .then((coarse) => {
                const object = this.level(coarse, things, tag, placed, i + 1);
                // (the scene may be on show: a thing already wanted this coarse changes to it over a moment)
                this.scenery!.add(i + 1, object, !this.every[0]);
                if (this.every[0]) this.scenery!.everyLevel(true, this.every[1]);
                this.news = true;
              })
              .catch((e) => console.warn(`${tag}: ${lodUrl(url, i + 1)} did not arrive, and its things are drawn finer:`, e)),
          ),
        );
      })
      .catch((e) => console.warn(`${tag}: what stands round the place (${url}) did not arrive, and is done without:`, e))
      .finally(() => draco.dispose());
  }

  /**
   * A level as it arrives: each thing put where its `place` puts it (worked out on the first level and taken by the
   * rest, which are built in the same frame), and its meshes joined into one a material, in the scene's frame.
   */
  private level(scene: THREE.Object3D, things: AroundThing[], tag: string, placed: Map<string, THREE.Object3D>, level: number) {
    const out = new THREE.Group();
    out.name = `${this.group.name}:${level}`;
    scene.updateWorldMatrix(false, true);
    for (const thing of things) {
      const node = scene.getObjectByName(thing.node);
      if (!node) {
        if (!level) console.warn(`${tag}: the model has no node "${thing.node}": not drawn`);
        continue;
      }
      const first = placed.get(thing.node);
      if (first) {
        node.position.copy(first.position);
        node.quaternion.copy(first.quaternion);
        node.scale.copy(first.scale);
      } else {
        thing.place?.(node);
        placed.set(thing.node, node);
      }
      node.updateWorldMatrix(true, true);
      const lists = new Map<string, THREE.BufferGeometry[]>();
      node.traverse((o) => {
        const part = o as THREE.Mesh;
        if (!part.isMesh) return;
        const from = part.material as THREE.MeshStandardMaterial;
        const key = named(from.name);
        const to = this.materials.get(key);
        if (!to) {
          console.warn(`${tag}: the model wears "${from.name}", which is not among what it is said to wear: not drawn`);
          return;
        }
        // the material is the model's (its first level's): its colour and finish, here and on the twin a look may have made
        if (!level) {
          const real = (to.userData.real ?? to.material) as THREE.MeshStandardMaterial;
          real.color.copy(from.color);
          real.roughness = from.roughness;
          real.metalness = from.metalness;
          if (to.material !== real) (to.material as THREE.MeshToonMaterial).color.copy(from.color);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', part.geometry.getAttribute('position').clone());
        g.setAttribute('normal', part.geometry.getAttribute('normal').clone());
        g.setIndex(part.geometry.getIndex()!.clone());
        g.applyMatrix4(part.matrixWorld);
        lists.set(key, [...(lists.get(key) ?? []), g]);
      });
      // the thing: a node of its name (what the scenery chooses a level for, its thresholds in its extras) of joined meshes
      const piece = new THREE.Group();
      piece.name = thing.node;
      piece.userData = { ...node.userData };
      for (const [key, list] of lists) {
        const stand = this.materials.get(key)!;
        const mesh = new THREE.Mesh(mergeGeometries(list), stand.material);
        if (stand.userData.real) mesh.userData.real = stand.userData.real;
        mesh.name = `${thing.node}_${key}`;
        mesh.castShadow = mesh.receiveShadow = true;
        mesh.geometry.computeBoundingBox();
        mesh.geometry.computeBoundingSphere();
        if (level) mesh.userData.ghost = true; // (another draw of the first level's: the walker walks on that)
        for (const g of list) g.dispose();
        piece.add(mesh);
      }
      out.add(piece);
    }
    this.group.add(out);
    out.updateMatrixWorld(true);
    return out;
  }

  /** Something has arrived since this was last asked (true once): it casts a shadow where there was nothing, or another. */
  arrived(): boolean {
    const was = this.news;
    this.news = false;
    return was;
  }

  choose(eye: THREE.Vector3, scale: number, dt?: number): boolean {
    return this.scenery?.choose(eye, scale, dt) ?? false;
  }

  /** Every level at once, and the fade's twins built on the stand-ins whatever has arrived (Stage.warm), or back to what suits. */
  everyLevel(on: boolean, fading = false): void {
    this.every = [on, fading];
    this.scenery?.everyLevel(on, fading);
    if (on && fading) this.warming.warm(this.standIns[0], this.standIns[1]);
    else this.warming.finish();
  }

  relook(): void {
    this.scenery?.relook();
  }
}

/**
 * What stands round a site (`SiteDef.around`), each thing on the land drawn under it: `lift(x, z, half)` is how far to
 * raise a thing whose middle is (x, z) in the scene and which reaches `half` metres from it, over where its model has
 * it, so that it stands on the land and not in it or over it.
 */
export function buildAround(around: SiteAround, lift: (x: number, z: number, half: number) => number): Around {
  const things = around.nodes.map((node) => ({
    node,
    place: (o: THREE.Object3D) => {
      const box = new THREE.Box3().setFromObject(o);
      const middle = box.getCenter(new THREE.Vector3());
      o.position.y += lift(middle.x, middle.z, Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2);
    },
  }));
  return new Around(around.model, things, around.wears, 'around.ts');
}

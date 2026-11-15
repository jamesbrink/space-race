import * as THREE from 'three';
import type { MeshBVH } from 'three-mesh-bvh';
import type { ModelDef } from '../../types.ts';
import type { Staged } from '../lod.ts';
import type { Solids } from '../onfoot/walk.ts';
import { through, triangles } from '../pick.ts';

/** Triangles a millisecond at which a geometry's hierarchy is taken to be made, when deciding whether one fits in the time to spare (`growTrees`): half what is measured. */
const TREE_RATE = 1000;
/** The most of a scenery object that is framed at once, metres across: beyond this a click looks at where it landed. */
const PLACE = 60;

/** An object a model names for people: what it is, a sentence about it, and the node itself. */
export interface Thing {
  label: string;
  about: string | null;
  object: THREE.Object3D;
}

/** What a pointer is on: a part of the model on show, or another model standing beside it. */
export interface Picked {
  node: string | null;
  model: string | null;
  /** Something in the place round the pad (Flight.surroundings): what it is called, and the part of it to go and look at. */
  place?: { name: string; box: THREE.Box3; title?: string; about?: string };
  /** The object itself, if the model names it for people (custom properties `label`, `about`): one searchlight, not all the ground equipment. */
  thing?: Thing;
  /** A window of the section's model: where on the pane, and which way the pane faces. */
  pane?: { point: THREE.Vector3; normal: THREE.Vector3 };
}
export const NOTHING: Picked = { node: null, model: null };

/** A shell whose skin has been taken off (Stage.setCutaway, in flight): it is not drawn, so a ray goes through it. */
export const skinless = (o: THREE.Object3D): boolean => ((o as THREE.Mesh).material as THREE.Material | undefined)?.visible === false;

/** The nearest object at or above `o` that the model names (a `label`, or a vehicle's `vehicle`). */
export function thingOf(o: THREE.Object3D): Thing | undefined {
  for (let at: THREE.Object3D | null = o; at; at = at.parent) {
    const label = (at.userData.label ?? at.userData.vehicle) as unknown;
    if (typeof label === 'string' && label) {
      const about = at.userData.about;
      return { label, about: typeof about === 'string' ? about : null, object: at };
    }
  }
  return undefined;
}

/** Whether `inner` is `outer` or somewhere under it. */
function contains(outer: THREE.Object3D, inner: THREE.Object3D | null): boolean {
  for (let o = inner; o; o = o.parent) if (o === outer) return true;
  return false;
}

/** What picking asks of the stage: what is on show, what is cut away, what the vehicle has shed. */
export interface PickHost {
  readonly camera: THREE.PerspectiveCamera;
  /** The cutaway's planes, in the scene's frame. */
  readonly cutPlanes: readonly THREE.Plane[];
  /** Whether the cutaway is open. */
  cut(): boolean;
  /** Every model of the flight, each with its levels of detail, and which of them is the section. */
  staged(): readonly Staged[];
  defs(): readonly ModelDef[];
  current(): number;
  /** The section's parts, by node. */
  parts(): ReadonlyMap<string, THREE.Object3D>;
  /** The place round the pad, if it has come. */
  surroundings(): THREE.Object3D | null;
  /** The setting's level floor, if it has one. */
  floor(): THREE.Object3D | null;
  /** The walker's solids, whose hierarchies a pick goes through (walk.ts). */
  solids(): Solids;
  /** Something in a cabin at a point (cabin.ts), for a part with no name of its own. */
  thingAt(point: THREE.Vector3): Thing | null | undefined;
  /** What the vehicle has let go, each in its holder. */
  shed(): readonly { holder: THREE.Object3D; drop: number }[];
  /** What a drop is called. */
  dropTitle(drop: number): string;
  /** The flown vehicle while it is off its pad; null on the pad. */
  flying(): Staged | null;
}

/**
 * What is under the pointer (stage/picker.ts): a part of the section, another model, a window, something in the place
 * round the pad, or (a right click) any spot at all; found through the hierarchies the walker keeps, which are made in
 * time nobody is waiting for (`growTrees`).
 */
export class Picker {
  constructor(private readonly h: PickHost) {}

  /** The place round the pad, as a list of roots (empty until it has come). */
  private around(): THREE.Object3D[] {
    const place = this.h.surroundings();
    return place ? [place] : [];
  }

  readonly raycaster = new THREE.Raycaster();

  readonly pointer = new THREE.Vector2();

  /**
   * A geometry's hierarchy for a pick, if it has one. Making one takes from a fraction of a millisecond to a frame
   * or more, and a ray crosses dozens of meshes, so the pointer never waits for it: a mesh without one is asked
   * three's way, which gives the same answer, and its hierarchy is owed (`growTrees`).
   */
  readonly pickTree = (geometry: THREE.BufferGeometry): MeshBVH | null => {
    const solids = this.h.solids();
    const tree = solids.fresh(geometry);
    if (!tree && !solids.has(geometry)) this.treesOwed.add(geometry); // (one that has gone stale stays stale: its vertices move)
    return tree;
  };

  readonly treesOwed = new Set<THREE.BufferGeometry>();

  /**
   * Make hierarchies that picks have wanted, in time nobody is waiting for: `spare` milliseconds of it. One is
   * started only if it should fit (a hierarchy is made at some two thousand triangles a millisecond, taken here
   * as a thousand); with `still` (nothing was drawn this frame, so nothing is in motion) one too big to fit is
   * made anyway, alone.
   */
  growTrees(spare: number, still: boolean): void {
    const until = performance.now() + spare;
    let made = 0;
    for (const geometry of this.treesOwed) {
      const left = until - performance.now();
      if (left <= 0) break;
      if (triangles(geometry) / TREE_RATE > left && !(still && !made)) continue;
      this.treesOwed.delete(geometry);
      this.h.solids().tree(geometry);
      made++;
    }
  }

  /**
   * What is under the pointer: one of this model's parts, or one of the models standing beside
   * it (the pad under the rocket, the pilot at its foot), which a click opens.
   */
  pick(): Picked {
    this.raycaster.setFromCamera(this.pointer, this.h.camera);
    // a ray does not know about the cutaway: skip what has been cut away to reach what is inside
    const gone = (h: THREE.Intersection) =>
      this.h.cut() && h.object.userData.shell && (skinless(h.object) || this.h.cutPlanes.every((p) => p.distanceToPoint(h.point) < 0));
    // (what three's own intersectObjects gives, found through the hierarchies the walker keeps: pick.ts. With
    // nothing cut away the first thing met is the answer, and each mesh need only say where the ray first meets it.)
    const roots = [...this.h.staged().map((s) => s.shown), ...this.around()];
    // nor about what is not being drawn: from the seat, the pilot's own visor is in front of the eye
    const hidden = (o: THREE.Object3D | null): boolean => (o ? !o.visible || hidden(o.parent) : false);
    const hit = through(this.raycaster, roots, this.pickTree, !this.h.cut()).find((h) => !gone(h) && !hidden(h.object));
    // something in the place round the pad: a click goes over to it
    const place = hit ? this.placeOf(hit.object, hit.point) : null;
    if (place) return { node: null, model: null, place };
    for (let o: THREE.Object3D | null = hit?.object ?? null; o; o = o.parent) {
      const at = this.h.staged().findIndex((s) => s.shown === o);
      if (at >= 0 && at !== this.h.current()) return { node: null, model: this.h.defs()[at]!.id };
      if (at === this.h.current()) break;
    }
    // a window pane of this model: a click goes up to it and looks in
    const mesh = hit?.object as THREE.Mesh | undefined;
    const of = (mesh?.material as THREE.Material | undefined)?.name ?? '';
    if (hit?.face && mesh && of.startsWith('glass') && !of.startsWith('glass-lens')) {
      const normal = hit.face.normal.clone().transformDirection(mesh.matrixWorld);
      if (normal.dot(this.raycaster.ray.direction) > 0) normal.negate(); // toward the viewer, whichever side was hit
      return { node: null, model: null, pane: { point: this.paneCentre(mesh, hit.point), normal } };
    }
    const thing = hit ? (thingOf(hit.object) ?? this.h.thingAt(hit.point) ?? undefined) : undefined;
    for (let o: THREE.Object3D | null = hit?.object ?? null; o; o = o.parent)
      if (this.h.parts().has(o.name)) return { node: o.name, model: null, ...(thing ? { thing } : {}) };
    return { node: null, model: null };
  }

  /** Something in the place round the pad that `object` belongs to: what it is called, and the part of it to go and look at. */
  placeOf(object: THREE.Object3D, point: THREE.Vector3): { name: string; box: THREE.Box3; title?: string; about?: string } | null {
    // (only the surroundings have places: a model's parts are its own, even one marked a vehicle)
    let o: THREE.Object3D | null = object;
    while (o && o !== this.h.surroundings()) o = o.parent;
    if (!o) return null;
    // A thing the model has named for people (a custom property `label`, or `vehicle` on a car)
    // is that thing, however deep it sits: one car in a car park, not the car park.
    const thing = thingOf(object);
    if (thing && thing.object !== this.h.surroundings() && !contains(thing.object, this.h.surroundings()))
      return {
        name: thing.object.name,
        box: new THREE.Box3().setFromObject(thing.object),
        title: thing.label,
        ...(thing.about ? { about: thing.about } : {}),
      };
    for (let o: THREE.Object3D | null = object; o && this.h.surroundings(); o = o.parent) {
      if (o.parent !== this.h.surroundings() && o.parent?.parent !== this.h.surroundings()) continue;
      if (!o.name || (o as THREE.Mesh).isMesh) continue;
      const box = new THREE.Box3().setFromObject(o);
      // a building is looked at whole; a road or a row of poles, where it was clicked
      if (box.getSize(new THREE.Vector3()).length() > PLACE)
        box.setFromCenterAndSize(point, new THREE.Vector3(PLACE, 6, PLACE).multiplyScalar(0.5));
      return { name: o.name, box };
    }
    return null;
  }

  /**
   * The middle of the window pane that `point` is on, not where the pointer happened to land:
   * the mean of the mesh's vertices within arm's reach of the point (one mesh may hold several windows).
   */
  paneCentre(mesh: THREE.Mesh, point: THREE.Vector3): THREE.Vector3 {
    const at = mesh.geometry.getAttribute('position');
    const centre = new THREE.Vector3();
    const v = new THREE.Vector3();
    let n = 0;
    for (let i = 0; i < at.count; i++) {
      mesh.localToWorld(v.fromBufferAttribute(at, i));
      if (v.distanceTo(point) > 0.6) continue;
      centre.add(v);
      n++;
    }
    return n ? centre.divideScalar(n) : point.clone();
  }

  /**
   * What is under the pointer, anywhere: on a model, in the place round it, or on the ground.
   * `floor` says whether it is something to stand on (it faces up).
   */
  spot(): {
    point: THREE.Vector3;
    floor: boolean;
    on: { craft: THREE.Vector3 | null; node: string | null; shed: { drop: number; name: string } | null };
  } | null {
    this.raycaster.setFromCamera(this.pointer, this.h.camera);
    const hit = this.raycaster
      .intersectObjects(
        [
          ...this.h.staged().map((s) => s.shown),
          ...this.h
            .shed()
            .filter((d) => d.holder.visible)
            .map((d) => d.holder), // (what the vehicle has let go, falling beside it)
          ...this.around(),
          ...[this.h.floor()].filter((o): o is THREE.Object3D => o !== null),
        ],
        true,
      )
      .find((h) => h.face && !(h.object as THREE.InstancedMesh).isInstancedMesh);
    if (!hit?.face) return null;
    const up = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).y;
    let shed: { drop: number; name: string } | null = null;
    for (let o: THREE.Object3D | null = hit.object; o && !shed; o = o.parent) {
      const piece = this.h.shed().find((d) => d.holder === o);
      if (piece) shed = { drop: piece.drop, name: this.h.dropTitle(piece.drop) };
    }
    // the flown vehicle, off its pad, and which of its parts
    const flier = this.h.flying();
    const parts = flier ? this.h.defs()[this.h.staged().indexOf(flier)]?.parts : undefined;
    let craft = false;
    let node: string | null = null;
    for (let o: THREE.Object3D | null = flier ? hit.object : null; o; o = o.parent) {
      if (node === null && parts?.some((p) => p.node === o.name)) node = o.name;
      if (o === flier!.group) craft = true;
    }
    const local = craft ? flier!.group.worldToLocal(hit.point.clone()) : null;
    return { point: hit.point.clone(), floor: up > 0.7, on: { craft: local, node: craft ? node : null, shed } };
  }
}

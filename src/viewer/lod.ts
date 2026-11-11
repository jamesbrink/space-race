import type * as THREE from 'three';
import { Group, Sphere, Box3 } from 'three';
import type { Part } from '../types';
import { markDriven } from './drive';
import { Exploder } from './explode';

/**
 * Pixels per metre above which each level of detail is worth drawing. Level 0 is the model as
 * built; 1 and 2 are the same scripts run at `--detail 0.6` and `0.3` (tools/build-model.mjs).
 * The thresholds are set where what the coarser level leaves out is smaller than a pixel: a
 * rivet is 15 mm across and is dropped at level 2, so level 2 is only shown under 12 px/m.
 * That is what makes the change invisible; there is no cross-fade to hide a difference.
 */
export const LOD_ABOVE = [40, 12] as const;

/** Where level `n` of a model lives, given the model's own URL. */
export const lodUrl = (url: string, level: number) => (level ? url.replace(/\.glb$/, `.lod${level}.glb`) : url);

/** Which level to show at `ppm` pixels per metre, given the one on show: a change needs a clear margin, so it does not flutter. */
export function chooseLevel(ppm: number, current: number): number {
  let level = current;
  while (level > 0 && ppm > LOD_ABOVE[level - 1]! * 1.12) level--;
  while (level < LOD_ABOVE.length && ppm < LOD_ABOVE[level]! * 0.9) level++;
  return level;
}

/** One model on the stage: its levels of detail, of which one is drawn, all taken apart together. */
export class Staged {
  readonly group = new Group();
  readonly sphere = new Sphere();
  private readonly levels: (THREE.Object3D | undefined)[] = [];
  private readonly exploders: Exploder[] = [];
  private level = 0;
  private wanted = 0;
  private t = 0;
  private readonly parts: Part[];
  /** What is being worked by hand, so that a level arriving later is posed the same (hold, loosen). */
  private readonly held = new Map<string, number>();
  private readonly loose = new Set<string>();

  constructor(full: THREE.Object3D, parts: Part[]) {
    this.parts = parts;
    this.add(0, full);
  }

  /** Call once it is placed: the sphere is what its distance from the camera is measured to. */
  measure(): void {
    new Box3().setFromObject(this.levels[0]!).getBoundingSphere(this.sphere);
  }

  add(level: number, object: THREE.Object3D): void {
    this.levels[level] = object;
    this.group.add(object);
    markDriven(object, this.parts);
    const exploder = new Exploder(object, this.parts);
    for (const [node, reading] of this.held) exploder.hold(node, reading);
    for (const node of this.loose) exploder.loosen(node, true);
    exploder.set(this.t);
    this.exploders.push(exploder);
    object.visible = false;
    this.show(this.wanted);
  }

  explode(t: number): void {
    this.t = t;
    for (const e of this.exploders) e.set(t);
  }

  /** Hold one node's motions at a slider reading of its own, at every level of detail (null: release it), and show it. */
  hold(node: string, reading: number | null): void {
    if (reading === null) this.held.delete(node);
    else this.held.set(node, reading);
    for (const e of this.exploders) {
      e.hold(node, reading);
      e.set(this.t);
    }
  }

  /** Let something else move one node at every level of detail (a vehicle driven by hand), or give it back to the slider. */
  loosen(node: string, on: boolean): void {
    if (on) this.loose.add(node);
    else this.loose.delete(node);
    for (const e of this.exploders) {
      e.loosen(node, on);
      e.set(this.t);
    }
  }

  /** Draw every level at once (so that all of them are built and sent to the GPU), or go back to the one that suits. */
  everyLevel(on: boolean): void {
    if (on) for (const o of this.levels) if (o) o.visible = true;
    if (!on) this.show(this.wanted);
  }

  /** The model as built: level 0, whether or not it is the one being drawn. */
  get full(): THREE.Object3D {
    return this.levels[0]!;
  }

  get shownLevel(): number {
    return this.level;
  }

  /** The level being drawn. */
  get shown(): THREE.Object3D {
    return this.levels[this.level]!;
  }

  /** A part's node in the level being drawn. */
  part(node: string): THREE.Object3D | undefined {
    return this.shown.getObjectByName(node);
  }

  /** Pick the level for this many pixels per metre (or the full one). True if what is drawn changed. */
  choose(ppm: number, full: boolean): boolean {
    this.wanted = full ? 0 : chooseLevel(ppm, this.wanted);
    return this.show(this.wanted);
  }

  /** Show the wanted level, or until it has arrived the nearest finer one that has. */
  private show(wanted: number): boolean {
    let level = wanted;
    while (level > 0 && !this.levels[level]) level--;
    const changed = level !== this.level || !this.shown.visible;
    this.levels.forEach((o, i) => o && (o.visible = i === level));
    this.level = level;
    return changed;
  }
}

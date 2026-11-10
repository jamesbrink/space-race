import * as THREE from 'three';
import type { Part } from '../types';

/**
 * How far along its travel a part is when the explode slider reads `t`.
 *
 * `t`      slider position, 0 (assembled) to 1 (fully apart)
 * `order`  the part's place in the sequence; 0 leaves first
 * `orders` the highest `order` in the flight
 * returns  0 (in place) to 1 (at its full `explode` offset)
 *
 * This is the whole feel of the exploded view. As written the parts leave in sequence,
 * each taking half the slider's travel, eased at both ends: the tower is gone before the
 * retropack starts to move. Alternatives worth trying: everything at once (`return t`),
 * a sharper cascade (a smaller WINDOW), or an overshoot so parts settle like hardware.
 */
export function partProgress(t: number, order: number, orders: number): number {
  const WINDOW = 0.5;
  const start = orders > 0 ? (order / orders) * (1 - WINDOW) : 0;
  const x = THREE.MathUtils.clamp((t - start) / WINDOW, 0, 1);
  return x * x * (3 - 2 * x);
}

/** Moves a flight's parts between their assembled and exploded positions. */
export class Exploder {
  private readonly entries: { object: THREE.Object3D; home: THREE.Vector3; part: Part }[] = [];
  private readonly orders: number;

  constructor(root: THREE.Object3D, parts: Part[]) {
    this.orders = Math.max(0, ...parts.map((p) => p.order));
    for (const part of parts) {
      const object = root.getObjectByName(part.node);
      if (!object) {
        console.warn(`explode: model has no node named ${part.node}`);
        continue;
      }
      // remember where it was built, so the model can be shown again later from a clean state
      const home = ((object.userData.home as THREE.Vector3 | undefined) ??= object.position.clone());
      this.entries.push({ object, home, part });
    }
  }

  set(t: number): void {
    for (const { object, home, part } of this.entries) {
      const k = partProgress(t, part.order, this.orders);
      object.position.set(home.x + part.explode[0] * k, home.y + part.explode[1] * k, home.z + part.explode[2] * k);
    }
  }
}

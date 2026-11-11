import * as THREE from 'three';
import type { Action, Move } from '../types';
// (with its extension: the tests run this file under Node, which adds none)
import { Sequence } from './explode.ts';

/**
 * Things on a site that work when somebody works them: a door that opens, a lift that goes up.
 * A flight declares them as `Action`s on its parts (types.ts); this plays them, on every level
 * of detail of the model at once, and they are solid as posed because everything is.
 *
 *   toggle  a sequence of `Move`s (the same swings and slides the slider plays) run forward, and
 *           backward when asked again: a door, a hatch, a gate
 *   lift    a node that slides between named stops and carries what stands on it
 *
 * Nothing here knows what any of them is called.
 */

/** A toggle's progress a moment later: toward open (1) or shut (0) at a steady pace, there in `seconds`. */
export function swingTo(k: number, open: boolean, dt: number, seconds: number): number {
  const step = dt / Math.max(0.05, seconds);
  return open ? Math.min(1, k + step) : Math.max(0, k - step);
}

/**
 * A lift's offset a moment later, on its way to a stop at `speed`: it starts and stops gently,
 * and arrives exactly. Stopping is by how far there is left (the last `SOFT` metres); starting is
 * by how fast it was going a moment ago, `was` m/s, which it may better only by `speed` every
 * `GATHER` seconds. Left out, it is taken to be at speed already.
 */
export function rideTo(at: readonly number[], stop: readonly number[], dt: number, speed: number, was = speed): [number, number, number] {
  const d = [stop[0]! - at[0]!, stop[1]! - at[1]!, stop[2]! - at[2]!];
  const left = Math.hypot(d[0]!, d[1]!, d[2]!);
  const pace = Math.min(speed * Math.min(1, 0.25 + left / SOFT), was + (speed * dt) / GATHER);
  const go = pace * dt;
  if (left <= go || left < 1e-4) return [stop[0]!, stop[1]!, stop[2]!];
  return [at[0]! + (d[0]! / left) * go, at[1]! + (d[1]! / left) * go, at[2]! + (d[2]! / left) * go];
}
const SOFT = 0.6;
const GATHER = 0.6;

interface Toggle {
  kind: 'toggle';
  k: number;
  open: boolean;
  seconds: number;
  sequences: Sequence[];
  nodes: THREE.Object3D[];
}

interface Lift {
  kind: 'lift';
  at: [number, number, number];
  stop: number;
  stops: { name: string; by: [number, number, number] }[];
  speed: number;
  /** How fast it went in the last frame, m/s: it sets off from rest (rideTo). */
  pace: number;
  /** The platform at each level of detail, and where it was built. */
  nodes: { node: THREE.Object3D; rest: THREE.Vector3 }[];
}

/** What a lift did in a frame: which nodes are its platform, and how far it went, in the world. */
export interface Carried {
  nodes: THREE.Object3D[];
  delta: THREE.Vector3;
}

export class Works {
  private readonly all = new Map<string, Toggle | Lift>();

  /**
   * The working of one action, made the first time it is asked for. `levels` are the model's
   * levels of detail (each holds the part under the same name); `part` is the part's node name.
   */
  private of(key: string, action: Action, levels: THREE.Object3D[], part: string): Toggle | Lift | null {
    let work = this.all.get(key);
    if (work) return work;
    const act = action.do;
    if (act.kind === 'toggle') {
      const parts = levels.flatMap((l) => l.getObjectByName(part) ?? []);
      const moves: Move[] = act.moves;
      work = {
        kind: 'toggle',
        k: 0,
        open: false,
        seconds: act.seconds ?? 1,
        sequences: parts.map((p) => new Sequence(p, p.position.clone(), moves)),
        nodes: parts.flatMap((p) => moves.map((m) => (m.node ? p.getObjectByName(m.node) : p)).flatMap((o) => o ?? [])),
      };
    } else if (act.kind === 'lift') {
      const nodes = levels.flatMap((l) => l.getObjectByName(part)?.getObjectByName(act.node) ?? []);
      work = {
        kind: 'lift',
        at: [...(act.stops[0]?.by ?? [0, 0, 0])] as [number, number, number],
        stop: 0,
        stops: act.stops,
        speed: act.speed ?? 1,
        pace: 0,
        nodes: nodes.map((node) => ({ node, rest: node.position.clone() })),
      };
    } else return null;
    this.all.set(key, work);
    return work;
  }

  /** Open what is shut and shut what is open. */
  toggle(key: string, action: Action, levels: THREE.Object3D[], part: string): void {
    const work = this.of(key, action, levels, part);
    if (work?.kind === 'toggle') work.open = !work.open;
  }

  /** Send a lift to one of its stops. */
  send(key: string, action: Action, levels: THREE.Object3D[], part: string, stop: number): void {
    const work = this.of(key, action, levels, part);
    if (work?.kind !== 'lift' || !work.stops[stop] || work.stop === stop) return;
    work.stop = stop;
    work.pace = 0; // (sent elsewhere on its way, it stops and sets off again: it does not turn round at speed)
  }

  /** Which of a lift's stops is nearest a height in the world. */
  nearest(key: string, action: Action, levels: THREE.Object3D[], part: string, y: number): number {
    const work = this.of(key, action, levels, part);
    const first = work?.kind === 'lift' ? work.nodes[0] : undefined;
    if (!first || work?.kind !== 'lift' || !first.node.parent) return 0;
    const world = new THREE.Vector3();
    let best = 0;
    let least = Infinity;
    work.stops.forEach((stop, i) => {
      const off = Math.abs(first.node.parent!.localToWorld(world.copy(first.rest).add(new THREE.Vector3(...stop.by))).y - y);
      if (off < least) [best, least] = [i, off];
    });
    return best;
  }

  /** Is this toggle open, or on its way to being? */
  isOpen(key: string): boolean {
    const work = this.all.get(key);
    return work?.kind === 'toggle' && work.open;
  }

  /** The stop this lift is at or bound for. */
  stopOf(key: string): number {
    const work = this.all.get(key);
    return work?.kind === 'lift' ? work.stop : 0;
  }

  /** The nodes that are this lift's platform (one a level of detail), once it has been used or asked about. */
  platform(key: string, action: Action, levels: THREE.Object3D[], part: string): THREE.Object3D[] {
    const work = this.of(key, action, levels, part);
    return work?.kind === 'lift' ? work.nodes.map((n) => n.node) : [];
  }

  /**
   * A frame: everything on its way goes a little further. Returns what the lifts did, for
   * whoever is standing on one, and null if nothing moved at all.
   */
  step(dt: number): Carried[] | null {
    let moved = false;
    const carried: Carried[] = [];
    for (const work of this.all.values()) {
      if (work.kind === 'toggle') {
        const k = swingTo(work.k, work.open, dt, work.seconds);
        if (k === work.k) continue;
        work.k = k;
        for (const s of work.sequences) s.set(k);
        for (const n of work.nodes) n.updateMatrixWorld(true);
        moved = true;
      } else {
        const to = rideTo(work.at, work.stops[work.stop]!.by, dt, work.speed, work.pace);
        if (to.every((v, i) => v === work.at[i])) {
          work.pace = 0;
          continue;
        }
        const delta = new THREE.Vector3(to[0] - work.at[0], to[1] - work.at[1], to[2] - work.at[2]);
        work.pace = dt > 0 ? delta.length() / dt : 0;
        work.at = to;
        for (const { node, rest } of work.nodes) {
          node.position.set(rest.x + to[0], rest.y + to[1], rest.z + to[2]);
          node.updateMatrixWorld(true);
        }
        // the slide is in the platform's parent's frame: in the world it is turned as that is
        const parent = work.nodes[0]?.node.parent;
        const length = delta.length();
        if (parent) delta.transformDirection(parent.matrixWorld).multiplyScalar(length);
        carried.push({ nodes: work.nodes.map((n) => n.node), delta });
        moved = true;
      }
    }
    return moved ? carried : null;
  }
}

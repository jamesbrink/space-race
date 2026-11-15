/**
 * What the walk, a driven vehicle and the site's machines would sound like, as events and states, for whoever makes
 * the sound. Nothing here plays anything and there are no recordings: this is the interface a sound engine implements,
 * fed by the gait (viewer/onfoot/gait.ts) through the walker (viewer/onfoot/walk.ts: `Walker.sounds`), and by whatever
 * poses a move (`machinery`). Every event is a moment in the stride or a pose of the hardware, never a timer, so what
 * is heard is what is seen.
 */
import type { Object3D } from 'three';
import type { Machine } from '../types.ts';

/** A foot coming down: which, how fast the figure was going (m/s), and what kind of step it was. */
export interface Footfall {
  foot: 'L' | 'R';
  /** Over the ground, m/s (on a ladder, up or down it). */
  pace: number;
  /** A stride on the level or a stair, a rung of a ladder, or the feet arriving from a jump or a fall. */
  kind: 'step' | 'rung' | 'landing';
  /** For a landing: how far it fell, metres. */
  height?: number;
}

/** A vehicle being driven, as it is heard: told each frame someone is at its wheel. */
export interface Driving {
  /** Where its engine is (over its front axle), in the scene's frame. */
  at: [number, number, number];
  /** Along its nose, m/s (negative backing), and the most it does. */
  speed: number;
  top: number;
  /** How far the pedal that drives it is down, 0 to 1 (the brake is not a throttle). */
  throttle: number;
  /** Its engine, by the name its place lists it under (PlaceDef.engines), or null if it gives none. */
  engine: string | null;
  /** The name of the material under it (its models' own), or null where it is on the land. */
  under: string | null;
}

export interface Sounds {
  /** A foot has landed: at phase 0.25 (left) or 0.75 (right) of the stride, or both on a landing. */
  footfall(event: Footfall): void;
  /**
   * Where in the breath the figure is, 0 to 1 (0: about to breathe in; 0.5: about to breathe
   * out), told each frame it changes. In a pressure suit the breath is heard in the helmet.
   */
  breath(phase: number): void;
  /** At the wheel of a vehicle, each frame (null: out of it again). Seated so, the figure makes no footfalls and no breath. */
  driving(state: Driving | null): void;
}

/** No sound: what the walker has until something that plays is given to it. */
export const silent: Sounds = {
  footfall: () => {},
  breath: () => {},
  driving: () => {},
};

/**
 * A move of the hardware as it was last posed (types.ts Move, a lift): what drives it, the node it moves (where it is
 * heard from), and how far along it is in its own measure (metres slid, driven or ridden; radians swung; the fraction
 * of a `run`), with the whole of its travel in the same measure (Infinity for a lift, which goes where it is sent).
 */
export interface Working {
  machine: Machine;
  node: Object3D;
  along: number;
  travel: number;
}

/**
 * Every move that names a machine, as last posed: the slider's, the clock's, a hand's (viewer/explode.ts `Sequence`,
 * viewer/onfoot/works.ts). Whoever poses one says so here, each time; whoever hears reads how far each has gone since it
 * last looked, so a move that is not being posed is still and silent. One move is one entry however many levels of
 * detail pose it (they are keyed by the move itself).
 */
export class Machinery {
  private readonly all = new Map<object, Working>();

  /** A move has just been posed. */
  posed(key: object, machine: Machine, node: Object3D, along: number, travel: number): void {
    const was = this.all.get(key);
    if (was) {
      was.node = node;
      was.along = along;
      was.travel = travel;
    } else this.all.set(key, { machine, node, along, travel });
  }

  /** Every move posed so far, by its key; one whose node has left the scene is forgotten. */
  working(): [object, Working][] {
    const out: [object, Working][] = [];
    for (const [key, w] of this.all) {
      let root: Object3D = w.node;
      while (root.parent) root = root.parent;
      if ((root as { isScene?: boolean }).isScene) out.push([key, w]);
      else this.all.delete(key);
    }
    return out;
  }
}

/** The page's one board of machinery. */
export const machinery = new Machinery();

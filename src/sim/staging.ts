/**
 * What happens when a hand stages a vehicle: the rules every vehicle is held to, whatever it is (the staged vehicle,
 * sim/stagedlive.ts; the ballistic one, sim/vehicle.ts). Pure arithmetic on what the vehicles already know; the figures
 * are each flight's data, every one a `Measure` with its confidence.
 *
 *   pressed    two bodies let go of each other part only once the one behind is no longer pushing the one in front:
 *              while what was let go would on its own gather speed faster than what it leaves (its thrust over its
 *              mass against the other's), it stays pressed against it, and pushes it on. So a stage let go while it
 *              burns harder than the rest stays on until it stops, and a spacecraft let go under thrust rides on its
 *              adapter until the engine below it is out. Drag is left out of the comparison: no figure divides the
 *              stack's drag between its parts.
 *   hot stage  an engine lit while the body it stands on is still joined fires into that body's top. The jet strikes
 *              the deflector there and is turned out through the joint's open side: only what escapes pushes the stack,
 *              and only by its share along the axis (the rest of its momentum the deflector and the joint's structure
 *              take, which are part of the stack: a force inside it). And the top takes the jet's heat, which it is
 *              made to stand for so long; past that it fails.
 */
import type { Measure } from '../types.ts';
import { DEG } from '../world/frames.ts';

/** Whether what was let go stays pressed against what it was let go of: it would on its own gather speed faster. */
export function pressed(behind: { thrust: number; mass: number }, ahead: { thrust: number; mass: number }): boolean {
  return behind.mass > 0 && ahead.mass > 0 && behind.thrust / behind.mass > ahead.thrust / ahead.mass;
}

/**
 * The share of an engine's thrust that pushes the stack while it fires into the body below it: what escapes the joint
 * (`open`), as far as it leaves along the axis (`turn` below the level). In vacuum, with the turn lossless (an upper
 * bound: a turn that slows the jet pushes less).
 */
export function hotStage(hot: { open: Measure; turn: Measure }): number {
  return hot.open.value * Math.sin(hot.turn.value * DEG);
}

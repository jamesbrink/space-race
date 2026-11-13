/**
 * What a structure is limited by, worked from the forces the simulator already has: nothing here
 * knows any flight, and the limits themselves are a flight's data (`Trajectory.body.limits`).
 *
 *   q          dynamic pressure, Pa.
 *   q alpha    dynamic pressure times the angle between the long axis and the motion through the
 *              air, Pa rad: what bends a slender stack. The air's sideways push on the nose and
 *              on the fins is in proportion to it, and they push at opposite ends.
 *   axial      every force but gravity along the long axis, over the weight: what a man's back
 *              and the tanks' walls feel, in g.
 *   lateral    the same across the axis, in g.
 *
 * The governing load on the stack going up is q alpha against its limit. A bending moment at the
 * weakest station would be the better measure, and the mass model (rigid.ts: uniform cylinders,
 * the propellant rigid) would give one; it is not used, because no bending strength of any station
 * is in anything read to hold it against. So: q alpha, with the lateral g reported beside it.
 *
 * What happens past a limit is fixed here, the same for every vehicle, and chosen, not recorded:
 *   caution    from CAUTION of the limit.
 *   failure    over the limit for HOLDS seconds together, or at SNAPS times it at once.
 * A parachute in more dynamic pressure than its limit tears, as it is let out or at any time after,
 * and so does one whose pull (that pressure times the drag area it has filled to) passes what its
 * lines take, where the flight gives that (vehicle.ts leaves it `torn` of its drag area). A load on the spacecraft past its own limit breaks nothing: it is reported.
 */
import { G0 } from './fly.ts';

/** The fraction of a limit at which the pilot is warned, how long over it a structure holds, s, and the fraction at which it goes at once. */
export const CAUTION = 0.8;
export const HOLDS = 0.5;
export const SNAPS = 1.5;

export interface Loads {
  /** Pa; radians; Pa rad. */
  q: number;
  alpha: number;
  qAlpha: number;
  /** In g: along the long axis (positive pushing the nose forward) and across it. */
  axial: number;
  lateral: number;
}

/** The loads at an instant: `force` is every force but gravity, N in the body's axes (+X the long axis); `alpha` the angle of the axis from the motion through the air, radians. */
export function loadsOf(force: readonly [number, number, number], mass: number, q: number, alpha: number): Loads {
  return { q, alpha, qAlpha: q * alpha, axial: force[0] / mass / G0, lateral: Math.hypot(force[1], force[2]) / mass / G0 };
}

/** How a structure stands against its limit: the load as a fraction of it now, the most it has been, and how long it has been over without a break, s. */
export interface Strain {
  load: number;
  most: number;
  over: number;
}

export const UNSTRAINED: Strain = { load: 0, most: 0, over: 0 };

/** The strain after `dt` more seconds at `load` (a fraction of the limit), and whether the structure has now gone. */
export function strain(before: Strain, load: number, dt: number): { strain: Strain; fails: boolean } {
  const over = load > 1 ? before.over + dt : 0;
  return { strain: { load, most: Math.max(before.most, load), over }, fails: load >= SNAPS || over >= HOLDS - 1e-9 };
}

/** 'safe', 'caution' from CAUTION of the limit, 'over' past it. */
export function standing(load: number): 'safe' | 'caution' | 'over' {
  return load > 1 ? 'over' : load >= CAUTION ? 'caution' : 'safe';
}

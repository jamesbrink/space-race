import type { Going } from '../../types.ts';

/**
 * People walking off a site or onto it (types.ts `Going`), as a place on the ground at each instant: pure, so that where
 * a figure is follows the clock and nothing else, and the gait (gait.ts) is driven by the distance it gives, never by a
 * timer. It knows no flight and no model: the figure that is walked so, a jointed one to the crew contract, is the
 * viewer's to pose (issue #24: the people at Site 1 are built merged by colour today, and are not walked yet).
 *
 *   leaves  standing where it was built until `at`, then off: from its own spot to the way's first point and along the
 *           way to its end, which the data puts out of sight; there it is gone.
 *   comes   the same walk backward in place: out of sight until `at`, then in from the way's far end, along it and to
 *           its own spot, where it stops and stands as it was built.
 *
 * It sets off and stops as a body does (`QUICKEN`: walking pace in a quarter of a second, as the walker's body), so the
 * distance gone has no corner in it; its heading is the way's over a stride either side, so a bend is walked round and
 * not turned on the spot.
 */

/** How long a body takes to come up to its pace from standing, and to stop from it, s (walk.ts `quicken`). */
export const QUICKEN = 0.25;
/** A walking pace where the data gives none, m/s (estimated: an unhurried walk). */
export const PACE = 1.4;
/** How far either side of where it is the way is looked along for its heading, metres: half a stride. */
const LOOK = 0.4;

/** Where one figure of a group is: on the ground at (x, z) in the model's frame, walking or standing, or out of sight. */
export interface Gone {
  x: number;
  z: number;
  /** Which way it walks, radians from +X toward -Z (the viewer's heading); null standing, where it faces as built. */
  heading: number | null;
  /** How far it has walked, metres, and how fast it walks now, m/s: the gait's phase and pace (gait.ts). */
  walked: number;
  pace: number;
  /** Out of sight: at the far end of its way (left, or not come yet). */
  out: boolean;
}

/** The route one figure walks: from its own spot (`from`) and along the way, metres (x, z) in the model's frame. */
export function routeOf(going: Pick<Going, 'way'>, from: readonly [number, number]): [number, number][] {
  return [[from[0], from[1]], ...going.way.map(([x, z]): [number, number] => [x, z])];
}

/** A route's length, metres. */
export function lengthOf(route: readonly (readonly [number, number])[]): number {
  let s = 0;
  for (let i = 1; i < route.length; i++) s += Math.hypot(route[i]![0] - route[i - 1]![0], route[i]![1] - route[i - 1]![1]);
  return s;
}

/** The point `s` metres along a route (clamped to its ends). */
export function along(route: readonly (readonly [number, number])[], s: number): [number, number] {
  let left = Math.max(0, s);
  for (let i = 1; i < route.length; i++) {
    const [ax, az] = route[i - 1]!;
    const [bx, bz] = route[i]!;
    const d = Math.hypot(bx - ax, bz - az);
    if (left <= d && d > 0) return [ax + ((bx - ax) * left) / d, az + ((bz - az) * left) / d];
    left -= d;
  }
  const end = route[route.length - 1]!;
  return [end[0], end[1]];
}

/**
 * How far a body has gone `tau` seconds after it set off at `pace` toward a walk of `length` metres: its speed comes up
 * over QUICKEN and goes down over QUICKEN to arrive at rest, linearly both ways, so where it is has no corner. A walk too
 * short to reach its pace is walked at what it can.
 */
export function distanceAt(tau: number, pace: number, length: number): { s: number; v: number; total: number } {
  if (length <= 0) return { s: 0, v: 0, total: 0 };
  // the most it reaches: its pace, or less on a walk shorter than a start and a stop at pace take
  const top = Math.min(pace, Math.sqrt((length * pace) / QUICKEN));
  const ramp = (QUICKEN * top) / pace; // seconds to come up to `top` at the same rate
  const cruise = (length - top * ramp) / top; // seconds at `top` (none on a short walk)
  const total = 2 * ramp + cruise;
  if (tau <= 0) return { s: 0, v: 0, total };
  if (tau >= total) return { s: length, v: 0, total };
  const a = top / ramp;
  if (tau <= ramp) return { s: 0.5 * a * tau * tau, v: a * tau, total };
  if (tau <= ramp + cruise) return { s: 0.5 * top * ramp + top * (tau - ramp), v: top, total };
  const left = total - tau;
  return { s: length - 0.5 * a * left * left, v: a * left, total };
}

/** When a figure's walk ends, s from launch: `at` (and its `delay` in the group) and its length at its pace. */
export function endOf(going: Going, from: readonly [number, number], delay = 0): number {
  return going.at.value + delay + distanceAt(0, going.pace?.value ?? PACE, lengthOf(routeOf(going, from))).total;
}

/** Where a figure that stood at `from` is at `t` (s from launch), `delay` seconds after the first of its group sets off. */
export function goneAt(going: Going, from: readonly [number, number], t: number, delay = 0): Gone {
  const route = routeOf(going, from);
  const length = lengthOf(route);
  const pace = going.pace?.value ?? PACE;
  const { s: walked, v } = distanceAt(t - going.at.value - delay, pace, length);
  // (leaving it is `walked` along the route from its spot; coming it is as far from the way's far end)
  const s = going.kind === 'leaves' ? walked : length - walked;
  const [x, z] = along(route, s);
  const out = going.kind === 'leaves' ? walked >= length : t <= going.at.value + delay;
  // (not yet off, or there: standing, as built, or out of sight)
  if (walked <= 0 || walked >= length) return { x, z, heading: null, walked, pace: 0, out };
  // the heading: the way over half a stride either side, so that a corner is walked round
  const [ax, az] = along(route, s - LOOK);
  const [bx, bz] = along(route, s + LOOK);
  const sign = going.kind === 'leaves' ? 1 : -1;
  const heading = Math.atan2(-(bz - az) * sign, (bx - ax) * sign);
  return { x, z, heading, walked, pace: v, out };
}

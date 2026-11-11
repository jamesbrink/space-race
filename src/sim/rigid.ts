/**
 * A rigid body's turning, and what a vehicle weighs where: quaternions, and the mass, centre of
 * mass and moments of inertia of a stack of cylinders some of which are draining. Doubles, no
 * three.js; nothing here knows any flight.
 *
 * A quaternion is [w, x, y, z] and turns body axes into the frame's: `turn(q, v)` is the vector
 * `v`, given in the body's axes, in the frame's. Body rates are in the body's axes, rad/s.
 */
import type { MassPart } from '../types';
import { cross, type Vec3 } from '../world/frames.ts';

export type Quat = readonly [w: number, x: number, y: number, z: number];

export const IDENTITY: Quat = [1, 0, 0, 0];

export const multiply = (a: Quat, b: Quat): Quat => [
  a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
  a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
  a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
  a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
];

export const conjugate = (q: Quat): Quat => [q[0], -q[1], -q[2], -q[3]];

export function normalize(q: Quat): Quat {
  const n = Math.hypot(q[0], q[1], q[2], q[3]);
  return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
}

/** A body vector in the frame's axes. */
export function turn(q: Quat, v: Vec3): Vec3 {
  const u: Vec3 = [q[1], q[2], q[3]];
  const t = cross(u, v);
  const c = cross(u, [t[0] + q[0] * v[0], t[1] + q[0] * v[1], t[2] + q[0] * v[2]]);
  return [v[0] + 2 * c[0], v[1] + 2 * c[1], v[2] + 2 * c[2]];
}

/** A frame vector in the body's axes. */
export const unturn = (q: Quat, v: Vec3): Vec3 => turn(conjugate(q), v);

/** The turn of `angle` radians about a unit `axis`. */
export function aboutAxis(axis: Vec3, angle: number): Quat {
  const s = Math.sin(angle / 2);
  return [Math.cos(angle / 2), axis[0] * s, axis[1] * s, axis[2] * s];
}

/** The attitude whose body axes are the three given unit vectors (right-handed, at right angles), in the frame. */
export function fromAxes(x: Vec3, y: Vec3, z: Vec3): Quat {
  // Shepperd's method, on the matrix whose columns are the axes
  const trace = x[0] + y[1] + z[2];
  let q: Quat;
  if (trace > 0) {
    const s = 2 * Math.sqrt(1 + trace);
    q = [s / 4, (y[2] - z[1]) / s, (z[0] - x[2]) / s, (x[1] - y[0]) / s];
  } else if (x[0] > y[1] && x[0] > z[2]) {
    const s = 2 * Math.sqrt(1 + x[0] - y[1] - z[2]);
    q = [(y[2] - z[1]) / s, s / 4, (y[0] + x[1]) / s, (z[0] + x[2]) / s];
  } else if (y[1] > z[2]) {
    const s = 2 * Math.sqrt(1 + y[1] - x[0] - z[2]);
    q = [(z[0] - x[2]) / s, (y[0] + x[1]) / s, s / 4, (z[1] + y[2]) / s];
  } else {
    const s = 2 * Math.sqrt(1 + z[2] - x[0] - y[1]);
    q = [(x[1] - y[0]) / s, (z[0] + x[2]) / s, (z[1] + y[2]) / s, s / 4];
  }
  return normalize(q);
}

/** How fast an attitude changes for body rates `w`: the quaternion's derivative. */
export function spin(q: Quat, w: Vec3): Quat {
  const d = multiply(q, [0, w[0], w[1], w[2]]);
  return [d[0] / 2, d[1] / 2, d[2] / 2, d[3] / 2];
}

/**
 * Euler's equations for a body that is the same all the way round its long axis (+X): the rates'
 * derivative under a torque, both in the body's axes. `roll` and `across` are the moments of
 * inertia about the long axis and about any axis across it through the centre of mass, kg m^2.
 */
export function euler(w: Vec3, torque: Vec3, roll: number, across: number): Vec3 {
  const h: Vec3 = [roll * w[0], across * w[1], across * w[2]];
  const g = cross(w, h);
  return [(torque[0] - g[0]) / roll, (torque[1] - g[1]) / across, (torque[2] - g[2]) / across];
}

export interface MassProperties {
  /** kg */
  mass: number;
  /** The centre of mass: metres along the long axis from the datum the parts' stations are measured from. */
  centre: number;
  /** Moments of inertia about the long axis and across it through the centre of mass, kg m^2. */
  roll: number;
  across: number;
}

/**
 * A stack of parts along one axis, each a uniform cylinder between two stations. A `fluid` part
 * is a liquid in a tank: `filled` (0 to 1) of what it held is left, lying against the tank's
 * lower end as it does under thrust, so its column shortens from the top. Liquids are taken as
 * rigid across the axis (no slosh) and as not turning with the tank about it (no roll inertia).
 * Parts whose `sheds` is in `gone` are left out.
 */
export function massOf(parts: readonly MassPart[], radius: number, filled: number, gone: ReadonlySet<string>): MassProperties {
  let mass = 0;
  let moment = 0;
  const each: [m: number, c: number, own: number][] = [];
  let roll = 0;
  for (const p of parts) {
    if (p.sheds && gone.has(p.sheds)) continue;
    const share = p.fluid ? Math.max(0, Math.min(1, filled)) : 1;
    const m = p.mass * share;
    if (m <= 0) continue;
    const span = (p.to - p.from) * share;
    const c = p.from + span / 2;
    const r = p.radius ?? radius;
    mass += m;
    moment += m * c;
    each.push([m, c, m * ((r * r) / 4 + (span * span) / 12)]);
    if (!p.fluid) roll += (m * r * r) / 2;
  }
  const centre = moment / mass;
  let across = 0;
  for (const [m, c, own] of each) across += own + m * (c - centre) ** 2;
  return { mass, centre, roll, across };
}

/** What a stack's fixed parts weigh, and what its liquids weighed full, kg. */
export function fixedAndFluid(parts: readonly MassPart[], gone: ReadonlySet<string>): { fixed: number; fluid: number } {
  let fixed = 0;
  let fluid = 0;
  for (const p of parts) {
    if (p.sheds && gone.has(p.sheds)) continue;
    if (p.fluid) fluid += p.mass;
    else fixed += p.mass;
  }
  return { fixed, fluid };
}

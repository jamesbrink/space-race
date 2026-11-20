/** Frictionless contact of two spherical hull elements. Sweep their centres over a step so two fast
 * bodies cannot trade places between samples. The normal impact is perfectly inelastic: we have no
 * measured coefficient of restitution for spacecraft hardware. Tangential motion is free. */

import { add, cross, dot, length, scale, sub, type Vec3 } from '../world/frames.ts';
import { nlerp, type Quat, unturn } from './rigid.ts';

/** One contact as read on the deck, in seconds from liftoff, m/s and joules. */
export interface Impact {
  on: string;
  name: string;
  t: number;
  speed: number;
  energy: number;
  broken?: readonly string[];
  activeBroken?: boolean;
  activeReleased?: string;
  /** Between two things let go, or one of them and what stands at the site: the vehicle and the spacecraft were not struck. */
  detached?: boolean;
}

/** How the deck titles a contact: one between pieces let go is said to be so, never the spacecraft's; a hard one, a breakup. */
export function impactTitle(hit: Impact): string {
  const breakup = Boolean(hit.activeBroken || hit.broken?.length);
  if (hit.detached) return breakup ? 'Detached hardware breakup' : 'Detached hardware contact';
  return breakup ? 'Impact breakup' : 'Spacecraft contact';
}

export interface ContactElement {
  before: Vec3;
  after: Vec3;
  velocity: Vec3;
  radius: number;
  mass: number;
  body?: ContactRotation;
}

export interface ContactRotation {
  start: Vec3;
  end: Vec3;
  q0: Quat;
  q1: Quat;
  w: Vec3;
  inertia: Vec3;
}

const ZERO: Vec3 = [0, 0, 0];

/** Generalized velocity and inverse mass along the contact normal. The arm runs to the
 * bead centre: the remaining radius is parallel to the impulse and adds no torque. */
function rotation(e: ContactElement, normal: Vec3, fraction: number, beyond: Vec3 = ZERO) {
  const body = e.body;
  if (!body) return { kick: ZERO, speed: 0, inverse: 0 };
  const first = sub(e.before, body.start),
    last = sub(e.after, body.end);
  const arm = add(add(first, scale(sub(last, first), fraction)), beyond);
  const lever = unturn(nlerp(body.q0, body.q1, fraction), cross(arm, normal));
  const kick = lever.map((n, i) => (body.inertia[i]! > 0 ? n / body.inertia[i]! : 0)) as unknown as Vec3;
  return { kick, speed: dot(lever, body.w), inverse: dot(lever, kick) };
}

export function contact(a: ContactElement, b: ContactElement, dt: number) {
  const start = sub(a.before, b.before);
  const end = sub(a.after, b.after);
  const motion = sub(end, start);
  const radius = a.radius + b.radius;
  const startGap = dot(start, start) - radius * radius;
  let fraction = 0;
  if (startGap > 0) {
    const speed2 = dot(motion, motion);
    const approach = -dot(start, motion);
    const discriminant = approach * approach - speed2 * startGap;
    if (approach <= 0 || discriminant < 0) return null;
    fraction = startGap / (approach + Math.sqrt(discriminant));
    if (fraction > 1) return null;
  }
  const line = add(start, scale(motion, fraction));
  const distance = length(line);
  if (!distance) return null;
  const normal = scale(line, 1 / distance);
  const ar = rotation(a, normal, fraction),
    br = rotation(b, normal, fraction);
  const closing = -dot(sub(a.velocity, b.velocity), normal) - ar.speed + br.speed;
  const penetration = radius - dot(end, normal);
  if (closing <= 0 && penetration <= 1e-8) return null;
  const inverseMass = 1 / a.mass + 1 / b.mass;
  const inverseSpin = ar.inverse + br.inverse;
  const impulse = Math.max(0, closing) / (inverseMass + inverseSpin);
  // Undo only the motion through the contact plane, in inverse proportion to the masses.
  const depth = Math.max(0, penetration - impulse * inverseSpin * dt * (1 - fraction));
  const change = (mass: number, sign: number, kick: Vec3) => ({
    r: scale(normal, (sign * depth) / (inverseMass * mass)),
    v: scale(normal, (sign * impulse) / mass),
    w: scale(kick, sign * impulse),
  });
  return {
    a: change(a.mass, 1, ar.kick),
    b: change(b.mass, -1, br.kick),
    impulse,
    energy: (impulse * Math.max(0, closing)) / 2,
    speed: Math.max(0, closing),
    after: dt * fraction,
  };
}

/**
 * The same contact against something that does not move (a structure at a site, the ground): `a` met a surface whose
 * outward normal is `normal` at `fraction` of the step, closing on it at `closing` m/s as the surface sees it. The
 * impulse is along the normal, at the bead, perfectly inelastic, as between two bodies; all of it changes `a`.
 * `depth`: how far past the surface the step would have carried the bead, which is undone along the normal.
 *
 * `rub`: the surface drags on what slides over it (Coulomb's law). `slide` is the velocity of the bead's point of
 * contact along the surface, as the surface sees it, and `friction` the coefficient: the impulse against the sliding
 * is at most that share of the normal one, and no more than stops the point. It acts at the point of contact (the
 * bead's centre less its radius along the normal), so something round rolls. Without it the surface is frictionless.
 */
export function strike(
  a: ContactElement,
  normal: Vec3,
  fraction: number,
  closing: number,
  depth: number,
  dt: number,
  rub?: { slide: Vec3; friction: number },
) {
  const ar = rotation(a, normal, fraction);
  const speed = Math.max(0, closing);
  const impulse = speed / (1 / a.mass + ar.inverse);
  let v = scale(normal, impulse / a.mass);
  let w = scale(ar.kick, impulse);
  let drag = 0;
  const sliding = rub ? length(rub.slide) : 0;
  if (rub && impulse > 0 && sliding > 1e-9) {
    const along = scale(rub.slide, 1 / sliding);
    const tr = rotation(a, along, fraction, scale(normal, -a.radius));
    drag = Math.min(rub.friction * impulse, sliding / (1 / a.mass + tr.inverse));
    v = add(v, scale(along, -drag / a.mass));
    w = add(w, scale(tr.kick, -drag));
  }
  return {
    r: scale(normal, Math.max(0, depth)),
    v,
    w,
    impulse,
    drag,
    energy: (impulse * speed) / 2,
    speed,
    after: dt * fraction,
  };
}

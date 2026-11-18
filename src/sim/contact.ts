/** Frictionless contact of two spherical hull elements. Sweep their centres over a step so two fast
 * bodies cannot trade places between samples. The normal impact is perfectly inelastic: we have no
 * measured coefficient of restitution for spacecraft hardware. Tangential motion is free. */
import { add, dot, length, scale, sub, type Vec3 } from '../world/frames.ts';

/** One contact as read on the deck, in seconds from liftoff, m/s and joules. */
export interface Impact {
  on: string;
  name: string;
  t: number;
  speed: number;
  energy: number;
}

export interface ContactElement {
  before: Vec3;
  after: Vec3;
  velocity: Vec3;
  radius: number;
  mass: number;
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
  const closing = -dot(sub(a.velocity, b.velocity), normal);
  const penetration = radius - dot(end, normal);
  if (closing <= 0 && penetration <= 1e-8) return null;
  const reduced = (a.mass * b.mass) / (a.mass + b.mass);
  const impulse = Math.max(0, closing) * reduced;
  // Undo only the motion through the contact plane, in inverse proportion to the masses.
  const depth = Math.max(0, penetration);
  const change = (mass: number, sign: number) => ({
    r: scale(normal, (sign * depth * reduced) / mass),
    v: scale(normal, (sign * impulse) / mass),
  });
  return {
    a: change(a.mass, 1),
    b: change(b.mass, -1),
    impulse,
    energy: (impulse * Math.max(0, closing)) / 2,
    speed: Math.max(0, closing),
    after: dt * fraction,
  };
}

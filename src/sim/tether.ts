import { add, cross, dot, length, scale, sub, type Vec3 } from '../world/frames.ts';
import type { DockBody } from './docking.ts';
import { turn, unturn } from './rigid.ts';

export function tetherAnchor(b: DockBody) {
  return add(b.r, turn(b.q, [0, b.port, 0]));
}
const inverseInertia = (b: DockBody, v: Vec3): Vec3 => {
  const l = unturn(b.q, v);
  return turn(b.q, [l[0] / b.inertia[0], l[1] / b.inertia[1], l[2] / b.inertia[2]]);
};

/** An inextensible strap between attachment points. It pulls only while taut. Relative normal
 * velocity and the two lever arms set the equal-and-opposite impulse and its angular effects. */
export function tetherImpulse(a: DockBody, b: DockBody, span: number, dt: number): number {
  const arms = [a, b].map((x) => turn(x.q, [0, x.port, 0]));
  const d = sub(add(a.r, arms[0]), add(b.r, arms[1])),
    distance = length(d);
  if (distance < span || distance === 0) return 0;
  const n = scale(d, 1 / distance);
  const pv = [a, b].map((x, i) => add(x.v, cross(turn(x.q, x.w), arms[i])));
  const rate = dot(sub(pv[0], pv[1]), n);
  // A first-order correction repays the small extension accumulated during one integration step.
  const outward = rate + (distance - span) / dt;
  if (outward <= 0) return 0;
  const leverage = arms.map((arm) => cross(arm, n));
  const inverse = 1 / a.mass + 1 / b.mass + [a, b].reduce((s, x, i) => s + dot(leverage[i], inverseInertia(x, leverage[i])), 0);
  const impulse = outward / inverse;
  [a, b].forEach((x, i) => {
    const j = (i ? 1 : -1) * impulse;
    x.v = add(x.v, scale(n, j / x.mass));
    x.w = add(x.w, unturn(x.q, inverseInertia(x, scale(leverage[i], j))));
  });
  return impulse / dt;
}

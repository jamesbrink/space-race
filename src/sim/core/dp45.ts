/**
 * The error-controlled integrator's step: Dormand and Prince's embedded 5(4) pair (J. R. Dormand and P. J. Prince, "A family
 * of embedded Runge-Kutta formulae", Journal of Computational and Applied Mathematics 6, 19-26, 1980, Table 2), for a point.
 * What a step's error is held to and how the next is sized are the caller's: the predictor's (predict.ts `propagate`) and a
 * coast on rails (rails.ts `coast`) each keep their own. The fixed-step integrator is core/rk4.ts; both take their
 * accelerations from `acceleration` there.
 */
import type { Vec3 } from '../../world/frames.ts';

/** The stages' instants, their weights, the fifth-order solution's (the last row), and its difference from the fourth's. */
export const C = [0, 1 / 5, 3 / 10, 4 / 5, 8 / 9, 1, 1];
export const A: readonly (readonly number[])[] = [
  [],
  [1 / 5],
  [3 / 40, 9 / 40],
  [44 / 45, -56 / 15, 32 / 9],
  [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729],
  [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656],
  [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84],
];
export const E = [71 / 57600, 0, -71 / 16695, 71 / 1920, -17253 / 339200, 22 / 525, -1 / 40];

/**
 * One step of `h` seconds from the point at `r`, `v` at `t`, whose acceleration there is `first` (the last step's last stage:
 * the pair is first-same-as-last) and at any instant, place and velocity `accel`. Returns the fifth-order state and the
 * size of its error in place, m, and in speed, m/s. `kr` and `kv` (seven each) are the stages' velocities and accelerations,
 * kept by the caller so that a long run allocates nothing; after the step `kv[6]` is the acceleration at its end.
 */
export function dp45(
  t: number,
  r: Vec3,
  v: Vec3,
  h: number,
  first: Vec3,
  accel: (at: number, p: Vec3, u: Vec3) => Vec3,
  kr: Vec3[],
  kv: Vec3[],
): { r: Vec3; v: Vec3; er: number; ev: number } {
  kr[0] = v;
  kv[0] = first;
  let r1: Vec3 = r;
  let v1: Vec3 = v;
  for (let i = 1; i < 7; i++) {
    let pr0 = r[0];
    let pr1 = r[1];
    let pr2 = r[2];
    let pv0 = v[0];
    let pv1 = v[1];
    let pv2 = v[2];
    const a = A[i]!;
    for (let j = 0; j < i; j++) {
      const w = a[j]! * h;
      if (w === 0) continue;
      const x = kr[j]!;
      const y = kv[j]!;
      pr0 += w * x[0];
      pr1 += w * x[1];
      pr2 += w * x[2];
      pv0 += w * y[0];
      pv1 += w * y[1];
      pv2 += w * y[2];
    }
    const p: Vec3 = [pr0, pr1, pr2];
    const u: Vec3 = [pv0, pv1, pv2];
    if (i === 6) {
      r1 = p;
      v1 = u;
    }
    kr[i] = u;
    kv[i] = accel(t + C[i]! * h, p, u);
  }
  let er0 = 0;
  let er1 = 0;
  let er2 = 0;
  let ev0 = 0;
  let ev1 = 0;
  let ev2 = 0;
  for (let j = 0; j < 7; j++) {
    const w = E[j]! * h;
    if (w === 0) continue;
    er0 += w * kr[j]![0];
    er1 += w * kr[j]![1];
    er2 += w * kr[j]![2];
    ev0 += w * kv[j]![0];
    ev1 += w * kv[j]![1];
    ev2 += w * kv[j]![2];
  }
  return { r: r1, v: v1, er: Math.hypot(er0, er1, er2), ev: Math.hypot(ev0, ev1, ev2) };
}

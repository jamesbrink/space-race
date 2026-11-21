/**
 * A body's gravity as spherical harmonics, and the Moon's: GRGM900C (world/grgm900c.ts, from GRAIL's tracking) cut to a
 * degree, as an acceleration at a place in the body's own frame. Pure, in doubles; tests/lunargravity.test.mjs holds it
 * to the published coefficients, to the closed forms of the second degree and to the gradient of the potential summed
 * another way.
 *
 * The sum is Cunningham's (L. E. Cunningham, "On the computation of the spherical harmonic terms needed during the
 * numerical integration of the orbital motion of an artificial satellite", Celestial Mechanics 2, 207-216, 1970), as
 * Montenbruck and Gill give it (Satellite Orbits, Springer 2000, section 3.2.4 and 3.2.5, equations 3.27 to 3.33): the
 * solid harmonics V and W built up by recurrence in the place's own coordinates, with no angle and no pole, and the
 * acceleration from them and the unnormalised coefficients. Unnormalised they overflow nothing below degree 80; the
 * field here is cut far below that.
 *
 * The frame is the body's: for the Moon the principal axes (world/moon.ts `principalAxes`), +Z the pole, +X toward the
 * mean Earth within a few arcminutes. The cut is `LUNAR_DEGREE`: what it leaves out is the bake's to say
 * (tools/lunar-gravity-bake.mjs: 4.8 mGal of the field's 50 at 110 km, root mean square over the sphere; 56 of 98 at 15
 * km, where a low pass before a landing wants more than this gives).
 */
import type { Vec3 } from './frames.ts';
import { GRGM900C } from './grgm900c.ts';

/** A field of harmonics as the sum takes it: the body's GM and reference radius, the degree it goes to, and the unnormalised coefficients, degree by degree and order by order. */
export interface Harmonics {
  gm: number;
  radius: number;
  degree: number;
  c: Float64Array;
  s: Float64Array;
}

/** Where degree `n` order `m` is in a table laid degree by degree. */
export const at = (n: number, m: number): number => (n * (n + 1)) / 2 + m;

/**
 * What a fully normalised coefficient of degree `n` and order `m` is multiplied by to give the unnormalised one: the
 * square root of (n - m)! (2n + 1) (2 - [m = 0]) / (n + m)!.
 */
export function normalisation(n: number, m: number): number {
  let ratio = 1;
  for (let k = n - m + 1; k <= n + m; k++) ratio /= k;
  return Math.sqrt((m === 0 ? 1 : 2) * (2 * n + 1) * ratio);
}

/** A field from a table of fully normalised coefficients, cut to `degree` (the table's own, unless less is asked). */
export function harmonics(
  table: { gm: number; radius: number; degree: number; c: readonly number[]; s: readonly number[] },
  degree = table.degree,
): Harmonics {
  if (degree > table.degree) throw new Error(`the table goes to degree ${table.degree}, not ${degree}`);
  const size = at(degree, degree) + 1;
  const c = new Float64Array(size);
  const s = new Float64Array(size);
  for (let n = 0; n <= degree; n++)
    for (let m = 0; m <= n; m++) {
      const k = normalisation(n, m);
      c[at(n, m)] = table.c[at(n, m)]! * k;
      s[at(n, m)] = table.s[at(n, m)]! * k;
    }
  return { gm: table.gm, radius: table.radius, degree, c, s };
}

/**
 * The acceleration of a field at a place in the body's own frame, m/s^2 (the place from its centre, m): the point mass
 * (degree 0) and every degree to the field's, or from `from` up (2: what the body's shape adds to the point mass).
 */
export function harmonicAcceleration(field: Harmonics, p: Vec3, from = 0): Vec3 {
  const { gm, radius: R, degree: N, c, s } = field;
  const [x, y, z] = p;
  const r2 = x * x + y * y + z * z;
  const [xr, yr, zr, rr] = [(x * R) / r2, (y * R) / r2, (z * R) / r2, (R * R) / r2];
  // V and W to degree N + 1, laid degree by degree
  const size = at(N + 1, N + 1) + 1;
  const V = new Float64Array(size);
  const W = new Float64Array(size);
  V[0] = R / Math.sqrt(r2);
  for (let m = 0; m <= N + 1; m++) {
    if (m > 0) {
      const [v, w] = [V[at(m - 1, m - 1)]!, W[at(m - 1, m - 1)]!];
      V[at(m, m)] = (2 * m - 1) * (xr * v - yr * w);
      W[at(m, m)] = (2 * m - 1) * (xr * w + yr * v);
    }
    for (let n = m + 1; n <= N + 1; n++) {
      const a = ((2 * n - 1) / (n - m)) * zr;
      const b = n - 2 >= m ? ((n + m - 1) / (n - m)) * rr : 0;
      V[at(n, m)] = a * V[at(n - 1, m)]! - (b ? b * V[at(n - 2, m)]! : 0);
      W[at(n, m)] = a * W[at(n - 1, m)]! - (b ? b * W[at(n - 2, m)]! : 0);
    }
  }
  let [ax, ay, az] = [0, 0, 0];
  // (the highest degree first: the smallest terms summed before the largest)
  for (let n = N; n >= from; n--) {
    for (let m = n; m >= 0; m--) {
      const [C, S] = [c[at(n, m)]!, s[at(n, m)]!];
      if (C === 0 && S === 0) continue;
      if (m === 0) {
        ax -= C * V[at(n + 1, 1)]!;
        ay -= C * W[at(n + 1, 1)]!;
      } else {
        const k = (n - m + 2) * (n - m + 1);
        const [vp, wp, vm, wm] = [V[at(n + 1, m + 1)]!, W[at(n + 1, m + 1)]!, V[at(n + 1, m - 1)]!, W[at(n + 1, m - 1)]!];
        ax += 0.5 * (-C * vp - S * wp + k * (C * vm + S * wm));
        ay += 0.5 * (-C * wp + S * vp + k * (-C * wm + S * vm));
      }
      az += (n - m + 1) * (-C * V[at(n + 1, m)]! - S * W[at(n + 1, m)]!);
    }
  }
  const g = gm / (R * R);
  return [g * ax, g * ay, g * az];
}

/** The degree the Moon's field is summed to: the bake's, and the decision's (tools/lunar-gravity-bake.mjs says what it leaves out). */
export const LUNAR_DEGREE = GRGM900C.degree;

/** The Moon's field, GRGM900C cut to `LUNAR_DEGREE`, in its principal-axis frame. Documented: its coefficients are the table's. */
export const MOON_FIELD: Harmonics = harmonics(GRGM900C);

/** The Moon's gravity at a place from its centre in its principal-axis frame, m/s^2: its point mass and its field to `LUNAR_DEGREE`. */
export const lunarGravity = (p: Vec3): Vec3 => harmonicAcceleration(MOON_FIELD, p);

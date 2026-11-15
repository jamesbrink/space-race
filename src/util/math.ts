/**
 * Small arithmetic said once: what every module that eased or blended a number had its own copy of.
 * Pure, with no imports, so the tests (Node) and the page share it.
 */

/** `x` held between `lo` and `hi`. */
export const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

/** From `a` at `t` = 0 to `b` at `t` = 1, and on past either end. */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * GLSL's smoothstep, in its order: 0 at `edge0`, 1 at `edge1`, the cubic 3t² - 2t³ between, held at the ends. Edges given
 * high to low step down. Edges that coincide (or are not numbers) give a step: 1 from `edge1` on, else 0.
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (!(Math.abs(edge1 - edge0) > 0)) return x >= edge1 ? 1 : 0;
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** 6x⁵ - 15x⁴ + 10x³ (Perlin's smootherstep): 0 to 1 as `x` goes 0 to 1, with no speed and no acceleration at either end. */
export const ease = (x: number): number => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * t * (t * (6 * t - 15) + 10);
};

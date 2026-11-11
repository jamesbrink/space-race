/**
 * Noise that gives the same answer in JavaScript and on the GPU. The ground's height is needed in
 * both places: the terrain's vertex shader lifts the land by it, and the walker and the plants
 * stand on it. Floating-point hashes (`fract(sin(...))`, the `NOISE` of space.ts) differ between
 * the two in their last bits, which is every bit they have; this one hashes integers, which
 * multiply and wrap identically in both, so only the smooth interpolation between lattice points
 * can differ, by a few parts in ten million.
 *
 * Each function is written twice, side by side: keep them in step.
 */

/** Lattice coordinates are shifted by this before hashing, so they are never negative (a negative int's conversion to uint is not to be relied on in GLSL). */
const SHIFT = 1 << 20;

/** A hash of a lattice point and a seed, 0 to 1. */
export function hash2(ix: number, iy: number, seed: number): number {
  let h = (Math.imul(ix + SHIFT, 374761393) + Math.imul(iy + SHIFT, 668265263) + Math.imul(seed, 1274126177)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

/** Smooth value noise, 0 to 1, varying over about one unit. */
export function noise2(x: number, y: number, seed: number): number {
  const ix = Math.floor(x),
    iy = Math.floor(y);
  let fx = x - ix,
    fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed),
    b = hash2(ix + 1, iy, seed),
    c = hash2(ix, iy + 1, seed),
    d = hash2(ix + 1, iy + 1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** Octaves of `noise2`, each twice as fine and half as strong: 0 to about 1. */
export function fbm2(x: number, y: number, seed: number, octaves = 4): number {
  let sum = 0,
    amp = 0.5;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise2(x, y, seed + i);
    x = x * 2.03 + 17.1;
    y = y * 2.03 + 3.7;
    amp *= 0.5;
  }
  return sum;
}

/** The same three, in GLSL ES 3.00. */
export const FIELD = /* glsl */ `
  float hash2(ivec2 i, int seed) {
    uint h = uint(i.x + ${SHIFT}) * 374761393u + uint(i.y + ${SHIFT}) * 668265263u + uint(seed) * 1274126177u;
    h = (h ^ (h >> 13u)) * 1274126177u;
    h = h ^ (h >> 16u);
    return float(h) / 4294967296.0;
  }
  float noise2(vec2 x, int seed) {
    vec2 i = floor(x), f = x - i;
    f = f * f * (3.0 - 2.0 * f);
    ivec2 n = ivec2(i);
    float a = hash2(n, seed), b = hash2(n + ivec2(1, 0), seed), c = hash2(n + ivec2(0, 1), seed), d = hash2(n + ivec2(1, 1), seed);
    return a + (b - a) * f.x + (c - a) * f.y + (a - b - c + d) * f.x * f.y;
  }
  float fbm2(vec2 x, int seed, int octaves) {
    float sum = 0.0, amp = 0.5;
    for (int i = 0; i < octaves; i++) {
      sum += amp * noise2(x, seed + i);
      x = x * 2.03 + vec2(17.1, 3.7);
      amp *= 0.5;
    }
    return sum;
  }
`;

/** A pseudo-random sequence from a seed, 0 to 1: for laying things out the same way every time. */
export function sequence(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

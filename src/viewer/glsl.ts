/**
 * GLSL said once: numbers written into shader text, and the shader code that more than one material reads.
 *
 * A figure written into a shader is part of its text, and the GPU's compiler orders and fuses arithmetic by the whole
 * expression (weather.ts, on `highOf`): the same number written with another digit is another program and may be
 * another pixel. So each caller keeps the digits it has always written (`vec3`'s `digits`), and this file only says
 * how once.
 */

/** A colour or a triple: three's `Color` (its `r`, `g`, `b`) or three numbers. */
export type Triple = readonly number[] | { readonly r: number; readonly g: number; readonly b: number };

/**
 * GLSL's `vec3(x, y, z)` for a colour or a triple. `digits`: decimals for each (`toFixed`; four unless said), or a
 * function that writes one number (the atmosphere's are `toExponential(6)`).
 */
export function vec3(c: Triple, digits: number | ((x: number) => string) = 4): string {
  const xyz = 'r' in c ? [c.r, c.g, c.b] : c;
  const f = typeof digits === 'number' ? (x: number) => x.toFixed(digits) : digits;
  return `vec3(${f(xyz[0]!)}, ${f(xyz[1]!)}, ${f(xyz[2]!)})`;
}

/**
 * GLSL: value noise on the lattice, and six octaves of it (`hash`, `noise`, `fbm`): the general grain that the land,
 * the plants, large surfaces and the sky's wisps are mottled with. Its hash is in floating point, so it is not the same
 * on every GPU to the last bit: where JavaScript must agree with a shader, use field.ts.
 */
export const NOISE = /* glsl */ `
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }
  float fbm(vec3 p) {
    float a = 0.5, s = 0.0;
    for (int i = 0; i < 6; i++) { s += a * noise(p); p = p * 2.03 + vec3(1.7, 9.2, 4.1); a *= 0.5; }
    return s;
  }
`;

/**
 * GLSL: a threshold for this pixel between 0 and 1, the same every frame, for whatever fades by drawing a share of its
 * pixels (a level of detail handed to the next, lod.ts; a plant coming into or out of its band, flora.ts): where a
 * thing is half faded, the pixels under half are drawn. Interleaved gradient noise (Jimenez, "Next Generation Post
 * Processing in Call of Duty: Advanced Warfare", SIGGRAPH 2014): no pattern the eye picks out, so nothing shimmers. An
 * expression, so that it can stand in a chunk that may be read twice.
 */
export const FADE_DITHER = /* glsl */ `fract(52.9829189 * fract(dot(floor(gl_FragCoord.xy), vec2(0.06711056, 0.00583715))))`;

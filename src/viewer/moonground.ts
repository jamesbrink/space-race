import type { Measure } from '../measure.ts';

/**
 * The Moon's ground below what was measured: the craters under two kilometres, the blocks lying on it and the
 * grain of its soil, made by rule and not by hand. The laser altimeter's map the front page is baked from ends at
 * 481 m a texel (tools/front-moon.mjs); everything here is finer than that and is **estimated**: no crater it draws
 * is a crater of the Moon's. What is real is how many there are of each size, which is the Moon's own law, and how
 * each is shaped and lit.
 *
 * It is one field, fixed to the ground: a place on it is a point of the plane that touches the Moon at the front
 * page's site (east and north of it, metres: `q`), and what is there follows from whole numbers hashed, so it is the
 * same at every frame, on every machine and after a reload, in the shader (`GROUND_GLSL`) and here (`craterIn`,
 * which the blocks are laid out by: viewer/moonrocks.ts).
 *
 * **Craters** come in octaves, each of diameters from `D` to `2D`, `D` halving from 1,024 m (above two kilometres the
 * altimeter has them) to 0.25 m. An octave's craters lie one to a square cell four `D` across, each somewhere in its cell and
 * there or not by `CRATERS.share`, so that their number is the equilibrium the Moon's old ground has come to, where
 * each new crater wears away as much as it adds: N(> D) = 0.079 D^-2 a square kilometre, D in km (`CRATERS`). Within
 * an octave the diameters follow the same D^-2. Each is a bowl a fifth as deep as it is wide with a raised rim when
 * fresh (Pike's figures for simple craters), and shallower and softer by its age, which is spread evenly (its depth
 * is the fresh one's by the cube of what is left of it): most are worn to dimples, one in four has a wall steep
 * enough to shadow at this Sun, and one in ten has a sharp rim and bright ground thrown round it.
 *
 * A crater is drawn on the pixel, not built: its slope turns the light, the shadow its sunward wall casts across its
 * floor is worked out from the bowl's shape and the Sun's height (the edge of the shadow in a bowl z = a r^2 is the
 * rim's circle moved toward the Sun by tan(height) / a), and the part of it the near rim hides from the eye, by the
 * same sum, is left as level ground. It has no relief of its own against the sky.
 *
 * **Grain** is the soil's own unevenness between and under the craters, as smooth noise at wavelengths from a few
 * pixels to a few dozen, slopes of a few degrees: for the look (estimated). It is drawn only where the ground is seen
 * squarely enough for it to read as grain (from high up); seen along itself, as from the start, it would be streaks.
 *
 * Nothing here cuts: an octave comes in over a range of sizes on the screen (a crater two pixels tall is not drawn,
 * one four tall is, wholly), so as the camera goes out the small ones are gone before they could shimmer and the
 * altimeter's ground is what is left.
 */

/** A figure with how far it can be trusted and where it came from. */
type Figure = Measure;

export const CRATERS = {
  /**
   * The equilibrium number of craters: N(> D) = `k` D^-2 a square kilometre, D in km. Trask's fit to Ranger's and
   * Lunar Orbiter's counts, N = 10^10.9 D^-2 per 10^6 km^2 with D in metres, which is 0.079 here.
   */
  k: {
    value: 0.079,
    confidence: 'estimated',
    source:
      'N. J. Trask (1966), "Size and spatial distribution of craters estimated from the Ranger photographs", JPL TR 32-800: N = 10^10.9 D^-2 per 10^6 km^2 (D in m), as remembered, not read again',
  } satisfies Figure,
  /** A fresh simple crater's depth, rim to floor, over its diameter; and its rim's height over the ground about it, over its diameter. */
  depth: {
    value: 0.2,
    confidence: 'estimated',
    source:
      'R. J. Pike (1977), "Size-dependence in the shape of fresh impact craters on the moon": depth 0.196 D^1.010 (km), as remembered',
  } satisfies Figure,
  rim: { value: 0.04, confidence: 'estimated', source: 'Pike (1977): rim height 0.036 D^1.014 (km), as remembered' } satisfies Figure,
  /** The smallest diameter of the first octave, metres, and how many octaves there are (each half the last). */
  first: 1024,
  octaves: 13,
  /** A cell's side in smallest diameters. */
  cell: 4,
} as const;

/**
 * The share of an octave's cells that hold a crater: the number of craters between D and 2D on a cell's ground,
 * k (1 - 1/4) D^-2 (cell D)^2 = 0.75 x 16 x 0.079 = 0.95 (derived).
 */
export const CRATER_SHARE = 0.75 * CRATERS.cell * CRATERS.cell * CRATERS.k.value;

/** How much each octave's grid is moved from the last, in cells, so that their lines do not fall together. */
const SHIFT = [0.37, 0.71] as const;

/** A whole number hashed to three (PCG's 3D hash, Jarzynski and Olano 2020): the same sums in the shader. */
function hash3(x: number, y: number, z: number): [number, number, number] {
  let a = (Math.imul(x >>> 0, 1664525) + 1013904223) >>> 0;
  let b = (Math.imul(y >>> 0, 1664525) + 1013904223) >>> 0;
  let c = (Math.imul(z >>> 0, 1664525) + 1013904223) >>> 0;
  a = (a + Math.imul(b, c)) >>> 0;
  b = (b + Math.imul(c, a)) >>> 0;
  c = (c + Math.imul(a, b)) >>> 0;
  a = (a ^ (a >>> 16)) >>> 0;
  b = (b ^ (b >>> 16)) >>> 0;
  c = (c ^ (c >>> 16)) >>> 0;
  a = (a + Math.imul(b, c)) >>> 0;
  b = (b + Math.imul(c, a)) >>> 0;
  c = (c + Math.imul(a, b)) >>> 0;
  return [a, b, c];
}

/** A crater of the field. */
export interface Crater {
  /** Its middle on the site's plane, metres east and north. */
  x: number;
  y: number;
  diameter: number;
  /** 0 fresh to 1 worn away. */
  age: number;
}

/** The smallest diameter of octave `k`, metres. */
export const octaveDiameter = (k: number): number => CRATERS.first / 2 ** k;

/** The crater in cell (`i`, `j`) of octave `k`, or none: what the shader draws there. */
export function craterIn(i: number, j: number, k: number): Crater | null {
  const h = hash3(i, j, k);
  if ((h[0] >>> 16) / 65535 > CRATER_SHARE) return null;
  const d = octaveDiameter(k);
  const side = CRATERS.cell * d;
  return {
    x: (i + (h[0] & 0xffff) / 65535 - SHIFT[0] * (k + 1)) * side,
    y: (j + (h[1] & 0xffff) / 65535 - SHIFT[1] * (k + 1)) * side,
    diameter: d / Math.sqrt(1 - 0.75 * ((h[2] & 0xffff) / 65535)),
    age: (h[1] >>> 16) / 65535,
  };
}

/** The cell of octave `k` a place is in. */
export function cellOf(x: number, y: number, k: number): [number, number] {
  const side = CRATERS.cell * octaveDiameter(k);
  return [Math.floor(x / side + SHIFT[0] * (k + 1)), Math.floor(y / side + SHIFT[1] * (k + 1))];
}

/**
 * GLSL (ES 3): `ground(q, F, aslant, sun, eye, slope, lit, bright)`. `q`: the place, metres east and north on the site's
 * plane. `F`: how much ground a pixel covers the long way, metres; `aslant`: the short way over the long way (1 seen
 * from above, 0.07 seen along itself from four degrees up). `sun` and `eye`: toward each, as east, north and
 * up parts (level ground's own up). Out: the ground's slope east and north (rise over run) to add to the map's, how
 * much of the Sun the craters' own walls leave (1: all), and how much brighter the ground is (fresh craters'
 * throw-out and the soil's mottle: about 0). `octaves` and `grains`: how many of each are worked through (fewer on a
 * lighter machine: the finest are left out).
 */
export const groundGlsl = (octaves: number, grains: number): string => /* glsl */ `
  uvec3 hash3(uvec3 v) {
    v = v * 1664525u + 1013904223u;
    v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
    v ^= v >> 16u;
    v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
    return v;
  }
  // how much of a bowl's inside a low direction (the Sun's, the eye's) does not reach: u is the place in the bowl, in
  // radii; toward is that direction on the level (unit); shift is tan(its height) over the bowl's a
  float behindRim(vec2 u, vec2 toward, float shift, float soft) {
    return smoothstep(0.0, soft, 1.0 - length(u - shift * toward));
  }
  // smooth noise and its slope (x: the value, -1 to 1; yz: its slope a cell)
  vec3 grain(vec2 p, uint k) {
    vec2 i = floor(p), f = p - i;
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0), du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
    ivec2 c = ivec2(i);
    float a = float(hash3(uvec3(c, k)).x >> 8u), b = float(hash3(uvec3(c + ivec2(1, 0), k)).x >> 8u);
    float d = float(hash3(uvec3(c + ivec2(0, 1), k)).x >> 8u), e = float(hash3(uvec3(c + ivec2(1, 1), k)).x >> 8u);
    vec4 v = vec4(a, b, d, e) / 8388607.5 - 1.0;
    float kx = v.y - v.x, ky = v.z - v.x, kxy = v.x - v.y - v.z + v.w;
    return vec3(v.x + kx * u.x + ky * u.y + kxy * u.x * u.y, du * vec2(kx + kxy * u.y, ky + kxy * u.x));
  }
  void ground(vec2 q, float F, float aslant, vec3 sun, vec3 eye, out vec2 slope, out float lit, out float bright) {
    slope = vec2(0.0);
    lit = 1.0;
    bright = 0.0;
    vec2 sunWay = normalize(sun.xy + 1e-6), eyeWay = normalize(eye.xy + 1e-6);
    float sunTan = max(sun.z, 0.0) / max(length(sun.xy), 1e-4), eyeTan = max(eye.z, 0.0) / max(length(eye.xy), 1e-4);
    for (int k = 0; k < ${octaves}; k++) {
      float D = ${CRATERS.first.toFixed(1)} * exp2(-float(k));
      // an octave is drawn where its craters are a few pixels tall, and comes in over a range of sizes
      float w = smoothstep(1.2, 3.2, 1.5 * D / F);
      if (w <= 0.0) break;
      float side = ${CRATERS.cell.toFixed(1)} * D;
      vec2 shift = vec2(${SHIFT[0]}, ${SHIFT[1]}) * float(k + 1);
      vec2 c = q / side + shift;
      ivec2 base = ivec2(floor(c - 0.5));
      for (int n = 0; n < 4; n++) {
        ivec2 cell = base + ivec2(n & 1, n >> 1);
        uvec3 h = hash3(uvec3(cell, k));
        if (float(h.x >> 16u) / 65535.0 > ${CRATER_SHARE.toFixed(4)}) continue;
        vec3 r = vec3(h & 0xffffu) / 65535.0;
        float age = float(h.y >> 16u) / 65535.0;
        float R = 0.5 * D / sqrt(1.0 - 0.75 * r.z);
        vec2 u = (q - (vec2(cell) + r.xy - shift) * side) / R;
        float s = length(u);
        if (s > 2.0) continue;
        // worn: shallower by its age, its rim's crest softer
        float worn = (1.0 - 0.92 * age) * (1.0 - 0.92 * age) * (1.0 - 0.92 * age);
        float deep = ${(2 * CRATERS.depth.value).toFixed(3)} * worn, rim = ${(2 * CRATERS.rim.value).toFixed(3)} * worn;
        float soft = 0.05 + 0.3 * age;
        float inside = 2.0 * deep * s;
        float outside = -3.0 * rim / (s * s * s * s + 1e-3) * (1.0 - smoothstep(1.4, 2.0, s));
        float crest = smoothstep(1.0 - soft, 1.0 + soft, s);
        float bowl = 1.0 - smoothstep(1.0 - 0.5 * soft, 1.0, s);
        float edge = max(0.05, 2.0 * F / R);
        // what the near rim hides from the eye is not drawn; what the sunward rim hides from the Sun is dark
        float seen = 1.0 - bowl * behindRim(u, eyeWay, eyeTan / deep, edge);
        slope += (w * seen * mix(inside, outside, crest) / max(s, 1e-4)) * u;
        // (a shadow goes before its crater does: a dark speck a pixel across is seen long after a dimple is not)
        lit *= 1.0 - w * w * seen * bowl * behindRim(u, sunWay, sunTan / deep, edge);
        bright += w * smoothstep(0.22, 0.0, age) * (1.0 - smoothstep(0.9, 2.0, s)) * 0.45;
      }
    }
    // the soil's grain: wavelengths from a few pixels to a few dozen. Seen along itself a round patch of it is a
    // streak a dozen times as wide as it is tall, and a field of them is a grain of lines across the picture that the
    // ground does not have: it is drawn by how squarely the ground is seen, and not at all under a tenth
    float mottle = 0.0, square = smoothstep(0.1, 0.5, aslant);
    for (int k = 0; k < ${grains}; k++) {
      float wave = 96.0 * exp2(-float(k));
      float w = smoothstep(2.5, 6.0, wave / F) * (1.0 - smoothstep(48.0, 200.0, wave / F));
      if (w * square <= 0.0) continue;
      vec3 g = grain(q / wave + 19.0 * float(k), uint(k + 64));
      slope += w * square * 0.022 * g.yz;
      mottle += w * square * g.x;
    }
    bright += 0.025 * mottle;
  }`;

/**
 * How much of the ground's light is left in a shadow, as a share of what level ground in the Sun sends back: what the
 * sunlit ground round about throws into it. For the look (estimated): a few per cent, as shadows on the Moon's
 * surface photographs have when the film is exposed for the ground.
 */
export const AMBIENT = 0.035;

/**
 * The share of the Sun's light the Earth sends to the Moon when all of its face is lit: a ball of the Earth's
 * breadth from there (0.95 degrees to its edge, 8.7e-4 steradians) sending back 0.3 of what falls on it evenly
 * (Lambert's law; 0.3 is its Bond albedo, which is not quite that): 0.3 / pi x 8.7e-4 = 8e-5 (derived). It is
 * multiplied by the share of the face that is lit. A twelve-thousandth of the Sun: it is there, and is not seen.
 */
export const EARTHSHINE = 8e-5;

/**
 * GLSL: `moonlight(albedo, n, d, v, sun, shade, matte)`: what the Moon's ground sends toward the eye. `n`: its normal;
 * `d`: level ground's up there; `v` and `sun`: toward the eye and the Sun; `shade`: how much of the Sun reaches it
 * (0 in a cast shadow); `matte`: how far from dust toward bare rock it is, which sends light back more as a matte
 * face does (0: the soil; the blocks are given 0.6, for the look: estimated). Needs `uSunLight` (the Sun's light over pi) and `uEarth` (toward the Earth, and the share of
 * the Sun's light it sends).
 *
 * The law is the Moon's own, not a matte ball's: dust that darkens little toward the limb (Lommel and Seeliger's
 * law, mixed with Lambert's by McEwen's lunar-Lambert weight for the phase angle, as remembered from his 1996 fit:
 * estimated), dimmer away from opposition (exp(-g / 60 degrees), fitted by eye to the Moon's phase curve between 20
 * and 60 degrees: estimated) and brighter again within a few degrees of it, where every grain hides its own shadow
 * (the opposition surge: a third more at 0 degrees, gone by 15, as 0.35 exp(-g / 4 degrees): estimated, from the
 * shape of Buratti, Hillier and Wang's 1996 Clementine curve as remembered). The albedo is the ground's at 30
 * degrees of phase and more, which is where the colour mosaic it comes from was made.
 */
export const LIGHT_GLSL = /* glsl */ `
  uniform vec3 uSunLight;
  uniform vec4 uEarth;
  vec3 moonlight(vec3 albedo, vec3 n, vec3 d, vec3 v, vec3 sun, float shade, float matte) {
    // (a slope may face away from the eye where the mesh, which is coarser, shows it all the same: it is taken as seen
    // no more aslant than a third of the level ground's angle there, or Lommel and Seeliger's law has nothing under the
    // line and the slope is a white patch)
    float mu0 = dot(n, sun), mu = max(dot(n, v), 0.34 * max(dot(d, v), 0.0));
    // (the Sun is half a degree across: the terminator is that soft, on the sphere as on a slope)
    float day = smoothstep(-0.0046, 0.0046, dot(d, sun));
    float lit = day * shade * max(mu0, 0.0);
    float g = degrees(acos(clamp(dot(sun, v), -1.0, 1.0)));
    float lunar = clamp(1.0 - 0.019 * g + 0.242e-3 * g * g - 1.46e-6 * g * g * g, 0.0, 1.0) * (1.0 - matte);
    float sent = lunar * 2.0 * lit / (max(mu0, 0.0) + mu + 1e-4) + (1.0 - lunar) * lit;
    sent *= exp(-g / 60.0) * (1.0 + 0.35 * exp(-g / 4.0));
    // in a shadow: what the sunlit ground round about throws in, and the Earth's light
    sent += ${AMBIENT.toFixed(3)} * day * (1.0 - shade * step(0.0, mu0)) * max(dot(d, sun), 0.0);
    sent += uEarth.w * max(dot(n, uEarth.xyz), 0.0);
    return albedo * uSunLight * sent;
  }`;

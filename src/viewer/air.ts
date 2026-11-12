import * as THREE from 'three';
import { fieldAs, noise2 } from './field.ts';

/**
 * The air between the eye and what it sees, for every material that takes the scene's fog.
 *
 * three's exponential fog thickens with distance alone, the same at the ground and a kilometre
 * up, so from the air a whole site was washed to the colour of the horizon while from the ground
 * the far tree line was not blue enough. The haze that does this is in the lowest kilometre or
 * so of the air and thins with height. So here the fog's density is the haze's at its base (per
 * metre, as `FogExp2.density`), falling off with height over `scale` metres, and what a ray sees
 * of it is the integral along the ray (Beer and Lambert): a surface keeps `exp(-tau)` of its own
 * light and takes the rest from the fog's colour, which is the light the haze scatters.
 *
 * A visibility V gives a base density of 3.912 / V (Koschmieder). The chunks are the stock fog
 * chunks with that in place of the stock formula: `FogExp2` stays the type, its colour and density
 * stay the setting's, and a material that replaces `fog_fragment` with its own still can.
 * Installed once, before anything is drawn.
 */
export interface Air {
  /** Metres over which the haze's density falls by e. */
  scale: number;
  /** The height (world y) at which the density is the fog's own: sea level. */
  base: number;
  /** Fair-weather cumulus, or none. */
  clouds?: Clouds;
}

/**
 * A layer of cumulus: flat bases at one height, tops heaped up to `depth` above, in cells of about
 * `size` metres covering `cover` of the sky, drifting with the wind. One field, read two ways:
 * the clouds are heaped on it and marched through (clouds.ts), and the ground and everything on it
 * take its shadow from the direct light (in the lights chunk, below); the uniform `cloudUniform`
 * moves it for both.
 */
export interface Clouds {
  /** Height of the bases above `Air.base`, metres. */
  height: number;
  /** How far the tops rise above the bases, metres. */
  depth: number;
  /** Fraction of the sky covered, 0 to 1. */
  cover: number;
  /** Across a cloud, metres. */
  size: number;
  /** The wind at the clouds' height: toward this direction in the world (x, z), metres a second. */
  wind: [number, number];
}

/**
 * The clouds' drift so far (x, z: metres) and the layer's base (y: world height) and top (w), for
 * every shader. A plain object, shared by reference by every material that copies it (as `uOrigin`
 * is: origin.ts), so moving it moves the clouds everywhere.
 */
const DRIFT = { x: 0, y: 1e5, z: 0, w: 1e5 };
export const cloudUniform: THREE.IUniform<typeof DRIFT> = { value: DRIFT };
for (const lib of Object.values(THREE.ShaderLib)) lib.uniforms.uCloudDrift = cloudUniform;

/**
 * How far the eye has risen out of the air, 0 on the ground to 1 above it (the globe sets it:
 * globe.ts `thin`). From the ground the haze is seen against the light, lit by what it scatters
 * forward along a long path; from above it sends back up only what it scatters backward, a third
 * as much or less (aerosol phase functions; estimated), neutral rather than warm. Every material
 * that takes the haze uses it, so the land round the site and the globe beyond it go together.
 */
const ABOVE = { x: 0, y: 0 }; // (a plain object, shared by reference as DRIFT is: x is the value)
export const hazeAboveUniform: THREE.IUniform<typeof ABOVE> = { value: ABOVE };
export const setHazeAbove = (above: number): void => {
  ABOVE.x = above;
};
for (const lib of Object.values(THREE.ShaderLib)) lib.uniforms.uHazeAbove = hazeAboveUniform;

let installed: Air | null = null;
let wind: [number, number] = [0, 0];

/** How far the billows of a cumulus have risen through it, metres: they churn upward as the cloud drifts (clouds.ts). */
export const cloudRise = { value: 0 };

/** Move the clouds on by `dt` seconds of wind. */
export function driftClouds(dt: number): void {
  DRIFT.x += wind[0] * dt;
  DRIFT.z += wind[1] * dt;
  cloudRise.value = (cloudRise.value + 0.4 * dt) % 1024; // (the billows' noise repeats every 1,024 m: clouds.ts)
}

/**
 * The noise the cloud field is cut from, before its threshold: in JavaScript; `cloudField` has it in GLSL.
 * Three octaves make the clouds; a fourth, four times as broad as a cloud, gathers them: cumulus stand in
 * groups with clear air between, the big ones together, scraps at the groups' edges (its weight estimated).
 */
const cloudNoise = (qx: number, qz: number): number =>
  noise2(qx * 0.23 + 1.7, qz * 0.23 + 5.3, 94) * 0.3 +
  noise2(qx, qz, 91) * 0.33 +
  noise2(qx * 2.13 + 7.1, qz * 2.13 + 7.1, 92) * 0.21 +
  noise2(qx * 4.37 + 3.3, qz * 4.37 + 3.3, 93) * 0.12 +
  0.04;

/** Half the breadth of a cloud's soft edge, in the noise's units. */
const SOFT = 0.1;
const cut = new WeakMap<Clouds, [number, number]>();

/**
 * The cloud field's edge: where it rises from 0 to 1. Noise is not spread evenly, so a threshold of
 * `1 - cover` covers some other fraction of the sky; the threshold is instead found from the
 * noise itself (the value that `cover` of a wide patch of it lies above), so that a record's
 * "1/10 cumulus" is a tenth of the sky.
 */
function edges(c: Clouds): [number, number] {
  let e = cut.get(c);
  if (!e) {
    const middle = cloudCutAt(c.cover);
    e = [middle - SOFT, middle + SOFT];
    cut.set(c, e);
  }
  return e;
}

/** A wide patch of the noise, sorted: what fraction of the sky lies above any value of it. */
let sorted: Float64Array | null = null;
function seen(): Float64Array {
  if (!sorted) {
    sorted = new Float64Array(240 * 240);
    for (let i = 0; i < 240; i++) for (let j = 0; j < 240; j++) sorted[i * 240 + j] = cloudNoise(i * 0.29 + 0.13, j * 0.31 + 0.07);
    sorted.sort();
  }
  return sorted;
}

/** The value of the noise that `cover` of the sky lies above: cut there, the field covers that much. */
export function cloudCutAt(cover: number): number {
  const s = seen();
  return s[Math.min(s.length - 1, Math.max(0, Math.floor((1 - cover) * s.length)))]!;
}

/** How many covers `cloudCutGlsl` knows the cut for: evenly spaced in the cover's square root, so thin covers are told apart. */
const CUTS = 17;
/**
 * GLSL: `cloudCutAt(float cover)`, as above, for a cover that varies from place to place (weather.ts): between the
 * cuts for CUTS covers. The noise is the same whatever the clouds' size, so this is too.
 */
export const cloudCutGlsl = (): string => /* glsl */ `
  const float CLOUD_CUTS[${CUTS}] = float[${CUTS}](${Array.from({ length: CUTS }, (_, i) => cloudCutAt((i / (CUTS - 1)) ** 2).toFixed(4)).join(', ')});
  float cloudCutAt(float cover) {
    float u = sqrt(clamp(cover, 0.0, 1.0)) * ${(CUTS - 1).toFixed(1)};
    int i = int(min(floor(u), ${(CUTS - 2).toFixed(1)}));
    return mix(CLOUD_CUTS[i], CLOUD_CUTS[i + 1], u - float(i));
  }`;

/**
 * The cloud field, in JavaScript and GLSL alike (field.ts's integer noise, so the clouds drawn and
 * the shadows cast agree): 0 clear, rising to 1 in a cloud's heart, at a point of the layer `xz`
 * metres in the world, for clouds drifted by `drift`.
 */
export function cloudAt(c: Clouds, x: number, z: number, driftX: number, driftZ: number): number {
  const qx = (x - driftX) / c.size,
    qz = (z - driftZ) / c.size;
  const n = cloudNoise(qx, qz);
  const [lo, hi] = edges(c);
  const t = Math.min(1, Math.max(0, (n - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
}
/**
 * GLSL: `cloudNoise(vec2 at)`, the noise the field is cut from at a point of the field's own frame
 * (metres, the drift taken off), with `noise2` from field.ts named `<prefix>noise2`; and the value
 * at which it is cut, where the field is one half: a tenth of the sky lies above it for 1/10 cover.
 */
export const cloudNoiseGlsl = (c: Clouds, prefix: string): string => /* glsl */ `
  float cloudNoise(vec2 at) {
    vec2 q = at / ${c.size.toFixed(1)};
    return ${prefix}noise2(q * 0.23 + vec2(1.7, 5.3), 94) * 0.3 + ${prefix}noise2(q, 91) * 0.33 + ${prefix}noise2(q * 2.13 + 7.1, 92) * 0.21
      + ${prefix}noise2(q * 4.37 + 3.3, 93) * 0.12 + 0.04;
  }`;
export const cloudMiddle = (c: Clouds): number => 0.5 * (edges(c)[0] + edges(c)[1]);

const cloudField = (c: Clouds | undefined) =>
  c
    ? /* glsl */ `
  ${fieldAs('air_')}
  ${cloudNoiseGlsl(c, 'air_')}
  float cloudAt(vec2 xz) {
    return smoothstep(${edges(c)[0].toFixed(3)}, ${edges(c)[1].toFixed(3)}, cloudNoise(xz - uCloudDrift.xz));
  }
  // How much of the direct light toward \`toLight\` (the scene's frame) reaches a point of the scene: read where the ray
  // toward it crosses the layer's middle, which far off is lower in the scene's frame as the sea falls away round the
  // Earth's curve. Where a cloud's shadow is under a pixel (\`fp\`, metres), the record's cover dims it evenly instead,
  // so a far coast does not crawl as the shadows drift.
  float cloudShade(vec3 world, vec3 toLight, float fp) {
    if (toLight.y <= 0.02) return 1.0;
    float layer = 0.5 * (uCloudDrift.y + uCloudDrift.w) - dot(world.xz, world.xz) / ${(2 * 6_371_000).toFixed(1)};
    vec2 under = world.xz + toLight.xz / toLight.y * (layer - world.y);
    float w = 0.25 * fp / ${c.size.toFixed(1)};
    // (a cloud stands where the noise is over its cut (clouds.ts), and the Sun's disc blurs the shadow of one 720 m up
    // by ten metres: so the shadow is the cloud's own size and darkens over 180 m in from its edge, as the cloud thickens)
    float dark = 0.8 * smoothstep(${(cloudMiddle(c) - 0.02).toFixed(3)} - w, ${(cloudMiddle(c) + 0.03).toFixed(3)} + w, cloudNoise(under - uCloudDrift.xz));
    return 1.0 - mix(dark, ${(0.8 * c.cover).toFixed(3)}, smoothstep(${(0.08 * c.size).toFixed(1)}, ${(0.5 * c.size).toFixed(1)}, fp));
  }`
    : '';

/** The air installed, for a material that works its haze out in its own way (globe.ts: over the curved sea). */
export const installedAir = (): Air | null => installed;

export function installAir(air: Air): void {
  if (installed && installed.scale === air.scale && installed.base === air.base && installed.clouds === air.clouds) return;
  installed = air;
  const c = air.clouds;
  if (c) {
    wind = c.wind;
    DRIFT.y = air.base + c.height;
    DRIFT.w = air.base + c.height + c.depth;
  }
  const chunks = THREE.ShaderChunk as unknown as Record<string, string>;
  chunks.fog_pars_vertex = /* glsl */ `
    #ifdef USE_FOG
      varying float vFogDepth;
      varying vec3 vFogWorld;
    #endif`;
  // where the vertex is in the world: the eye plus the view-space offset turned back (the view's rotation is orthonormal);
  // the scene is drawn from the eye (origin.ts), so the eye's place is uOrigin, not cameraPosition
  chunks.fog_vertex = /* glsl */ `
    #ifdef USE_FOG
      vFogDepth = - mvPosition.z;
      vFogWorld = cameraPosition + uOrigin + transpose(mat3(viewMatrix)) * mvPosition.xyz;
    #endif`;
  chunks.fog_pars_fragment = /* glsl */ `
    #ifdef USE_FOG
      uniform vec3 fogColor;
      varying float vFogDepth;
      varying vec3 vFogWorld;
      #ifdef FOG_EXP2
        uniform float fogDensity;
      #else
        uniform float fogNear;
        uniform float fogFar;
      #endif
      uniform vec4 uCloudDrift;
      uniform vec2 uHazeAbove;
      // the haze's colour as seen from where the eye is: hazeAboveUniform
      vec3 hazeSeen() { return mix(fogColor, vec3(dot(fogColor, vec3(0.2126, 0.7152, 0.0722))) * vec3(0.86, 0.95, 1.1) * 0.33, uHazeAbove.x); }
      ${cloudField(c)}
      // how much of the haze lies between the eye and a point, as a fraction of the light lost: 1 - exp(-tau)
      float airFog(vec3 at) {
        vec3 eye = cameraPosition + uOrigin;
        float a = max(eye.y - ${air.base.toFixed(2)}, 0.0) / ${air.scale.toFixed(1)};
        float b = max(at.y - ${air.base.toFixed(2)}, 0.0) / ${air.scale.toFixed(1)};
        // the mean density along the ray, as a fraction of the base's: the integral of exp(-h) between the two heights
        float mean = abs(a - b) < 1e-3 ? exp(-0.5 * (a + b)) : (exp(-min(a, b)) - exp(-max(a, b))) / abs(b - a);
        return 1.0 - exp(-fogDensity * distance(eye, at) * mean);
      }
    #endif`;
  // the shadow of a cloud: the direct light is taken from wherever the ray toward it crosses the layer's middle
  if (c && !chunks.lights_fragment_end.includes('cloudShade'))
    chunks.lights_fragment_end = /* glsl */ `${chunks.lights_fragment_end}
    #if defined( USE_FOG ) && NUM_DIR_LIGHTS > 0
      {
        vec3 toLight = transpose(mat3(viewMatrix)) * directionalLights[0].direction;
        float shade = cloudShade(vFogWorld, toLight, length(fwidth(vFogWorld.xz)));
        reflectedLight.directDiffuse *= shade;
        reflectedLight.directSpecular *= shade;
      }
    #endif`;
  chunks.fog_fragment = /* glsl */ `
    #ifdef USE_FOG
      #ifdef FOG_EXP2
        // (less of it the further the eye is out of the air: from above, the haze is the air's own: atmosphere.ts)
        float fogFactor = airFog(vFogWorld) * (1.0 - uHazeAbove.x);
      #else
        float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
      #endif
      gl_FragColor.rgb = mix( gl_FragColor.rgb, hazeSeen(), fogFactor );
    #endif`;
}

/** The haze's base density for a visibility in metres (Koschmieder: the distance at which contrast falls to 2 per cent). */
export const densityFor = (visibility: number): number => 3.912 / visibility;

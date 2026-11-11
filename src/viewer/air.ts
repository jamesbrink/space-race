import * as THREE from 'three';

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
 * `size` metres covering `cover` of the sky, drifting with the wind. One field, read three ways:
 * the sky draws it (`CLOUDS` in GLSL: `cloudsSeen`), the ground and everything on it take its
 * shadow from the direct light (in the lights chunk, below), and the uniform `cloudUniform` moves
 * it.
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

let installed: Air | null = null;
let wind: [number, number] = [0, 0];

/** Move the clouds on by `dt` seconds of wind. */
export function driftClouds(dt: number): void {
  DRIFT.x += wind[0] * dt;
  DRIFT.z += wind[1] * dt;
}

/** The cloud field in GLSL, with its own names (a material may have its own noise): `cloudAt(xz)`, 0 to 1, how much cloud is over a point at the layer. */
const cloudField = (c: Clouds | undefined) =>
  c
    ? /* glsl */ `
  float airHash(vec2 p) { p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
  float airNoise(vec2 x) {
    vec2 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(airHash(i), airHash(i + vec2(1.0, 0.0)), f.x), mix(airHash(i + vec2(0.0, 1.0)), airHash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  // 0 clear, rising to 1 in a cloud's heart; the layer's own coordinates move with the wind
  float cloudAt(vec2 xz) {
    vec2 q = (xz - uCloudDrift.xz) / ${c.size.toFixed(1)};
    float n = airNoise(q) * 0.5 + airNoise(q * 2.13 + 7.1) * 0.27 + airNoise(q * 4.37 + 3.3) * 0.15 + airNoise(q * 9.1 + 1.9) * 0.08;
    return smoothstep(${(1 - c.cover - 0.06).toFixed(3)}, ${(1 - c.cover + 0.14).toFixed(3)}, n);
  }`
    : '';

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
  if (c && !chunks.lights_fragment_end.includes('cloudAt'))
    chunks.lights_fragment_end = /* glsl */ `${chunks.lights_fragment_end}
    #if defined( USE_FOG ) && NUM_DIR_LIGHTS > 0
      {
        vec3 toLight = transpose(mat3(viewMatrix)) * directionalLights[0].direction;
        if (toLight.y > 0.02) {
          float layer = 0.5 * (uCloudDrift.y + uCloudDrift.w);
          vec2 under = vFogWorld.xz + toLight.xz / toLight.y * (layer - vFogWorld.y);
          float shade = 1.0 - 0.8 * smoothstep(0.1, 0.6, cloudAt(under));
          reflectedLight.directDiffuse *= shade;
          reflectedLight.directSpecular *= shade;
        }
      }
    #endif`;
  chunks.fog_fragment = /* glsl */ `
    #ifdef USE_FOG
      #ifdef FOG_EXP2
        float fogFactor = airFog(vFogWorld);
      #else
        float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
      #endif
      gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
    #endif`;
}

/** The sky's view of the clouds, in GLSL: `vec4 cloudsSeen(vec3 dir, vec3 eye, vec3 toSun)`, the cloud's light as a fraction of full sunlit white (rgb: 1 lit, toward 0.55 in its own shade) and its cover (a). For a sky shader that declares `uniform vec4 uCloudDrift`. */
export function cloudsSky(c: Clouds): string {
  return /* glsl */ `
  ${cloudField(c)}
  vec4 cloudsSeen(vec3 d, vec3 eye, vec3 toSun) {
    if (d.y < 0.002 || eye.y > uCloudDrift.w) return vec4(0.0);
    // march the slab from its base up through its tops: a cloud is as tall there as its density says, so it has a flat
    // base and a heaped top, and a ray low over the horizon passes through the sides of many
    float t0 = (uCloudDrift.y - eye.y) / d.y, t1 = (uCloudDrift.w - eye.y) / d.y;
    t0 = max(t0, 0.0);
    float span = min(t1 - t0, 40000.0);
    float cover = 0.0, lit = 0.0;
    const int STEPS = 10;
    for (int i = 0; i < STEPS; i++) {
      float t = t0 + span * (float(i) + 0.5) / float(STEPS);
      vec3 p = eye + d * t;
      float h = (p.y - uCloudDrift.y) / (uCloudDrift.w - uCloudDrift.y);   // 0 at the base, 1 at the tops
      float dens = cloudAt(p.xz);
      float inside = smoothstep(h * 0.9, h * 0.9 + 0.12, dens);   // the heart of a cloud reaches the tops, its edge only the base
      // light: the side toward the Sun and the top are white, the base grey
      // (seen from the Sun's side a cloud is its lit face; looking toward the Sun, its shaded one)
      float sun = mix(0.55, 1.0, smoothstep(0.0, 0.9, h)) * (0.8 + 0.2 * (0.5 - 0.5 * dot(d, toSun)));
      float a = inside * (1.0 - cover) * 0.6;
      lit += a * sun;
      cover += a;
      if (cover > 0.98) break;
    }
    // thinning toward the horizon: distant clouds are smaller than a step, and the haze takes them
    float far = smoothstep(0.0, 0.06, d.y);
    return vec4(vec3(lit / max(cover, 1e-4)), clamp(cover * 1.6, 0.0, 1.0) * far);
  }`;
}

/** The haze's base density for a visibility in metres (Koschmieder: the distance at which contrast falls to 2 per cent). */
export const densityFor = (visibility: number): number => 3.912 / visibility;

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

/**
 * The clouds as a thing in the scene: a slab from their bases to their tops, `reach` metres each
 * way round the eye, drawn after everything solid. Each pixel of its far side marches the eye's
 * ray through the slab and adds up the cloud it passes, so a cloud has a flat base and a heaped
 * top from below, from the side and from above, and stands in front of the ground when the eye
 * is over it. It takes the haze (air.ts) like anything else, and its light from the scene's Sun
 * and sky, read as it is drawn. Beyond `reach` the sky's own clouds carry on to the horizon.
 */
export class CloudLayer {
  readonly mesh: THREE.Mesh;
  private readonly sunDir = new THREE.Vector3(0, 1, 0);
  private readonly sunLight = new THREE.Color();
  private readonly skyLight = new THREE.Color();
  private readonly hazeColour = new THREE.Color();
  private readonly hazeDensity = { value: 0 };
  private sun: THREE.DirectionalLight | null = null;
  private sky: THREE.HemisphereLight | null = null;

  private readonly cel = { value: 0 };

  constructor(clouds: Clouds, air: Air, reach = 9000) {
    const base = air.base + clouds.height,
      top = base + clouds.depth;
    const geometry = new THREE.BoxGeometry(2 * reach, top - base, 2 * reach).translate(0, (base + top) / 2, 0);
    // a plain material whose shader is wholly replaced: so the cel look's twin of it (look.ts) is the same shader
    const material = new THREE.MeshBasicMaterial({ name: 'clouds', side: THREE.BackSide, transparent: true, depthWrite: false });
    const uniforms = {
      uCloudDrift: cloudUniform,
      uSunDir: { value: this.sunDir },
      uSunLight: { value: this.sunLight },
      uSkyLight: { value: this.skyLight },
      uHaze: { value: this.hazeColour },
      uHazeDensity: this.hazeDensity,
      uReach: { value: reach },
      uCel: this.cel,
    };
    const vertexShader = /* glsl */ `
        varying vec3 vAt;   // this point of the slab's far side, relative to the eye
        void main() {
          vec4 at = modelMatrix * vec4(position, 1.0);
          vAt = at.xyz - cameraPosition;
          gl_Position = projectionMatrix * viewMatrix * at;
        }`;
    const fragmentShader = /* glsl */ `
        uniform vec3 uOrigin, uSunDir, uSunLight, uSkyLight, uHaze;
        uniform float uHazeDensity, uReach, uCel;
        varying vec3 vAt;
        ${cloudField(clouds)}
        void main() {
          vec3 eye = cameraPosition + uOrigin;
          float far = length(vAt);
          vec3 d = vAt / far;
          // where the ray is inside the slab: from its entry (or the eye) to this far side
          float lo = uCloudDrift.y, hi = uCloudDrift.w;
          float t0 = 0.0, t1 = far;
          if (abs(d.y) > 1e-4) {
            float ta = (lo - eye.y) / d.y, tb = (hi - eye.y) / d.y;
            t0 = max(0.0, min(ta, tb));
            t1 = min(far, max(ta, tb));
          } else if (eye.y < lo || eye.y > hi) discard;
          if (t1 <= t0) discard;
          // steps scaled to the length inside, and fewer far off where a cloud is a few pixels
          const int STEPS = 14;
          float span = t1 - t0;
          float cover = 0.0;
          vec3 light = vec3(0.0);
          float jitter = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
          for (int i = 0; i < STEPS; i++) {
            float t = t0 + span * (float(i) + jitter) / float(STEPS);
            vec3 p = eye + d * t;
            float h = clamp((p.y - lo) / (hi - lo), 0.0, 1.0);   // 0 at the base, 1 at the tops
            float dens = cloudAt(p.xz);
            // the heart of a cloud reaches the tops, its edges only part way: a dome on a flat base
            float inside = smoothstep(h * h * 0.85, h * h * 0.85 + 0.1, dens) * smoothstep(0.0, 0.03, dens);
            if (inside <= 0.0) continue;
            // lit from above and from the Sun's side, grey underneath; the light that gets in falls off into the heart
            float toSun = clamp(cloudAt(p.xz + uSunDir.xz * 260.0) - dens, -1.0, 1.0);   // less cloud toward the Sun: a lit face
            float lit = clamp(0.35 + 0.65 * h + 0.5 * -toSun, 0.15, 1.0);
            vec3 c = uSunLight * lit * max(uSunDir.y, 0.05) * 0.9 + uSkyLight * (0.55 + 0.45 * h);
            float a = (1.0 - cover) * min(1.0, inside * span / float(STEPS) / 90.0);
            light += a * c;
            cover += a;
            if (cover > 0.985) break;
          }
          if (cover < 0.003) discard;
          vec3 col = light / cover;
          // drawn: two tones and a hard edge
          col = mix(col, mix(uSkyLight * 0.8 + uSunLight * 0.2, uSunLight * 0.85 + uSkyLight, step(0.62, dot(col, vec3(0.3)) / max(dot(uSunLight * 0.9 + uSkyLight, vec3(0.3)), 1e-4))), uCel);
          cover = mix(cover, step(0.35, cover), uCel);
          // the haze between the eye and the cloud, as air.ts takes it for everything else: at the cloud's middle
          vec3 mid = eye + d * 0.5 * (t0 + t1);
          float a = max(eye.y - ${air.base.toFixed(2)}, 0.0) / ${air.scale.toFixed(1)};
          float b = max(mid.y - ${air.base.toFixed(2)}, 0.0) / ${air.scale.toFixed(1)};
          float mean = abs(a - b) < 1e-3 ? exp(-0.5 * (a + b)) : (exp(-min(a, b)) - exp(-max(a, b))) / abs(b - a);
          float fogged = 1.0 - exp(-uHazeDensity * 0.5 * (t0 + t1) * mean);
          col = mix(col, uHaze, fogged);
          // out at the edge of the slab the sky's own clouds take over: fade over the last tenth
          float edge = 1.0 - smoothstep(0.85, 1.0, length(mid.xz - eye.xz) / uReach);
          gl_FragColor = vec4(col, cover * edge);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`;
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = vertexShader;
      shader.fragmentShader = fragmentShader;
    };
    material.customProgramCacheKey = () => 'clouds';
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 10; // after the land and everything on it
    this.mesh.raycast = () => {};
    this.mesh.onBeforeRender = (_renderer, scene) => this.light(scene);
  }

  /** The cel look: the clouds in two tones with a hard edge. */
  simplify(on: boolean): void {
    this.cel.value = Number(on);
  }

  /** Follow the eye (scene frame), so the slab is always round it. */
  follow(eye: THREE.Vector3): void {
    this.mesh.position.set(eye.x, 0, eye.z);
  }

  /** Take the light of the scene the slab is drawn in: its Sun, its sky, its haze. */
  private light(scene: THREE.Scene): void {
    if (!this.sun || !this.sky)
      scene.traverse((o) => {
        if ((o as THREE.DirectionalLight).isDirectionalLight && !this.sun) this.sun = o as THREE.DirectionalLight;
        if ((o as THREE.HemisphereLight).isHemisphereLight && !this.sky) this.sky = o as THREE.HemisphereLight;
      });
    if (this.sun) {
      this.sunDir.subVectors(this.sun.position, this.sun.target.position).normalize();
      this.sunLight.copy(this.sun.color).multiplyScalar(this.sun.intensity / Math.PI);
    }
    if (this.sky) this.skyLight.copy(this.sky.color).multiplyScalar(this.sky.intensity);
    const fog = scene.fog as THREE.FogExp2 | null;
    if (fog) {
      this.hazeColour.copy(fog.color);
      this.hazeDensity.value = fog.density;
    }
  }
}

/** The haze's base density for a visibility in metres (Koschmieder: the distance at which contrast falls to 2 per cent). */
export const densityFor = (visibility: number): number => 3.912 / visibility;

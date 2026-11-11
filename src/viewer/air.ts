import * as THREE from 'three';
import { fieldAs, noise2, sequence } from './field';

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

/** The cloud field's breadth of change: 0 at its threshold, 1 well inside a cloud. */
const edges = (c: Clouds): [number, number] => [1 - c.cover - 0.06, 1 - c.cover + 0.14];

/**
 * The cloud field, in JavaScript and GLSL alike (field.ts's integer noise, so the clouds drawn and
 * the shadows cast agree): 0 clear, rising to 1 in a cloud's heart, at a point of the layer `xz`
 * metres in the world, for clouds drifted by `drift`.
 */
export function cloudAt(c: Clouds, x: number, z: number, driftX: number, driftZ: number): number {
  const qx = (x - driftX) / c.size,
    qz = (z - driftZ) / c.size;
  const n =
    noise2(qx, qz, 91) * 0.5 +
    noise2(qx * 2.13 + 7.1, qz * 2.13 + 7.1, 92) * 0.27 +
    noise2(qx * 4.37 + 3.3, qz * 4.37 + 3.3, 93) * 0.15 +
    0.04;
  const [lo, hi] = edges(c);
  const t = Math.min(1, Math.max(0, (n - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
}
const cloudField = (c: Clouds | undefined) =>
  c
    ? /* glsl */ `
  ${fieldAs('air_')}
  float cloudAt(vec2 xz) {
    vec2 q = (xz - uCloudDrift.xz) / ${c.size.toFixed(1)};
    float n = air_noise2(q, 91) * 0.5 + air_noise2(q * 2.13 + 7.1, 92) * 0.27 + air_noise2(q * 4.37 + 3.3, 93) * 0.15 + 0.04;
    return smoothstep(${edges(c)[0].toFixed(3)}, ${edges(c)[1].toFixed(3)}, n);
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
 * The clouds as things in the scene: each cumulus a heap of round puffs, set where the cloud
 * field says there is cloud, bigger and higher in a cloud's heart, each puff a disc that always
 * faces the eye and is drawn as the sphere it stands for (its surface found per pixel, lit by the
 * Sun on that surface). Below the layer's base a puff is cut off flat: the cloud has a flat base.
 * They take the haze like anything else and their light from the scene's Sun and sky, read as
 * they are drawn. The field drifts with the wind; the puffs are laid out again round the eye once
 * it has moved far enough over the field.
 */
export class CloudLayer {
  /** The puffs and the sheet of their bases. */
  readonly group = new THREE.Group();
  private readonly mesh: THREE.InstancedMesh;
  private readonly floor: THREE.Mesh;
  private readonly sunDir = new THREE.Vector3(0, 1, 0);
  private readonly sunLight = new THREE.Color();
  private readonly skyLight = new THREE.Color();
  private readonly hazeColour = new THREE.Color();
  private readonly hazeDensity = { value: 0 };
  private readonly cel = { value: 0 };
  private sun: THREE.DirectionalLight | null = null;
  private sky: THREE.HemisphereLight | null = null;
  /** Where the eye was over the field (x, z) when the puffs were last laid out. */
  private laid = new THREE.Vector2(1e9, 1e9);
  /** Where the eye was (field's frame) when they were last put in order. */
  private readonly sorted = new THREE.Vector3(1e9, 0, 1e9);
  private readonly puffs: { x: number; y: number; z: number; radius: number; far: number }[] = [];
  private readonly clouds: Clouds;
  private readonly base: number;
  private readonly reach: number;
  private readonly spacing: number;

  constructor(clouds: Clouds, air: Air, reach = 11000) {
    this.clouds = clouds;
    this.base = air.base + clouds.height;
    this.reach = reach;
    this.spacing = clouds.size / 9;
    const capacity = 16000;
    const geometry = new THREE.PlaneGeometry(2, 2);
    // a plain material whose shader is wholly replaced: so the cel look's twin of it (look.ts) is the same shader
    const material = new THREE.MeshBasicMaterial({ name: 'clouds', alphaToCoverage: true, depthWrite: false });
    const uniforms = {
      uCloudDrift: cloudUniform,
      uSunDir: { value: this.sunDir },
      uSunLight: { value: this.sunLight },
      uSkyLight: { value: this.skyLight },
      uHaze: { value: this.hazeColour },
      uHazeDensity: this.hazeDensity,
      uCel: this.cel,
    };
    const vertexShader = /* glsl */ `
      uniform vec4 uCloudDrift;
      varying vec2 vUv;
      varying vec3 vCentre;   // the puff's centre, relative to the eye
      varying vec3 vSpot;     // this point of its disc, relative to the eye
      varying float vRadius, vSeed;
      void main() {
        vec3 centre = (modelMatrix * vec4(instanceMatrix[3].xyz, 1.0)).xyz;
        float radius = length(instanceMatrix[0].xyz);
        // the disc faces the eye, and is a little bigger than the sphere so its outline is the sphere's
        vec3 toEye = normalize(cameraPosition - centre);
        vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toEye));
        if (dot(right, right) < 0.5) right = vec3(1.0, 0.0, 0.0);
        vec3 up = cross(toEye, right);
        vec3 at = centre + (right * position.x + up * position.y) * radius * 1.05 + toEye * radius;
        vUv = position.xy * 1.05;
        vCentre = centre - cameraPosition;
        vSpot = at - cameraPosition;
        vRadius = radius;
        vSeed = fract(instanceMatrix[3].x * 0.0137 + instanceMatrix[3].z * 0.0071);
        gl_Position = projectionMatrix * viewMatrix * vec4(at, 1.0);
      }`;
    const fragmentShader = /* glsl */ `
      uniform vec4 uCloudDrift;
      uniform vec3 uOrigin, uSunDir, uSunLight, uSkyLight, uHaze;
      uniform float uHazeDensity, uCel;
      varying vec2 vUv;
      varying vec3 vCentre, vSpot;
      varying float vRadius, vSeed;
      ${fieldAs('air_')}
      void main() {
        // the ray from the eye through this pixel, against the puff's sphere
        vec3 d = normalize(vSpot);
        float b = dot(d, vCentre), c = dot(vCentre, vCentre) - vRadius * vRadius;
        float disc = b * b - c;
        float edge = 1.0 - length(vUv);
        if (edge < -0.06) discard;
        // its edge is cauliflower, not a circle: lumps of a fifth of the puff
        vec2 lump = vUv * 2.6 + vSeed * 17.0;
        float rim = air_noise2(lump, 5) * 0.6 + air_noise2(lump * 2.3, 6) * 0.4;
        float alpha = smoothstep(0.0, 0.16, edge - 0.3 * (rim - 0.5) - 0.04);
        if (alpha <= 0.0) discard;
        float t = b - sqrt(max(disc, 0.0));
        vec3 p = d * t;                               // the surface, relative to the eye
        vec3 world = p + cameraPosition + uOrigin;
        vec3 n = normalize(p - vCentre);
        // the layer's base: everything under it is gone, so the heap stands on a flat floor (drawn as its own sheet)
        if (world.y < uCloudDrift.y) discard;
        float h = clamp((world.y - uCloudDrift.y) / (uCloudDrift.w - uCloudDrift.y), 0.0, 1.0);
        // lit by the Sun across the sphere with a soft wrap; the underside grey with the light that comes up from below
        // (one puff among many: its own roundness is muted, the heap's height counts more)
        // each ball's own roundness counts for little: what is lit is the heap, by its height and which side faces the Sun
        vec3 heap = normalize(mix(n, vec3(0.0, 1.0, 0.0), 0.5));
        float sun = clamp(dot(heap, uSunDir) * 0.25 + 0.75, 0.0, 1.0) * (0.5 + 0.5 * smoothstep(0.0, 0.75, h));
        float grain = air_noise2(vUv * 6.0 + vSeed * 31.0, 7) * 0.5 + 0.5;
        vec3 col = uSunLight * sun * (0.9 + 0.2 * grain) + uSkyLight * (0.6 + 0.4 * max(n.y, 0.0));
        // drawn: two tones
        float bright = dot(col, vec3(0.3)) / max(dot(uSunLight + uSkyLight, vec3(0.3)), 1e-4);
        col = mix(col, mix(uSkyLight * 1.1 + uSunLight * 0.35, uSunLight * 0.95 + uSkyLight, step(0.55, bright)), uCel);
        alpha = mix(alpha, step(0.5, alpha), uCel);
        // the haze between the eye and the cloud (air.ts)
        vec3 eye = cameraPosition + uOrigin;
        float a = max(eye.y - ${air.base.toFixed(2)}, 0.0) / ${air.scale.toFixed(1)};
        float bb = max(world.y - ${air.base.toFixed(2)}, 0.0) / ${air.scale.toFixed(1)};
        float mean = abs(a - bb) < 1e-3 ? exp(-0.5 * (a + bb)) : (exp(-min(a, bb)) - exp(-max(a, bb))) / abs(bb - a);
        col = mix(col, uHaze, 1.0 - exp(-uHazeDensity * length(p) * mean));
        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`;
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = vertexShader;
      shader.fragmentShader = fragmentShader;
    };
    material.customProgramCacheKey = () => 'clouds';
    this.mesh = new THREE.InstancedMesh(geometry, material, capacity);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.raycast = () => {};
    this.mesh.onBeforeRender = (_renderer, scene) => this.light(scene);
    this.mesh.renderOrder = 11; // after everything solid, and after the bases' sheet

    // The clouds' flat bases, as one sheet under the whole layer facing down: where the field says there is
    // cloud it is the grey underside, lit by the sky and what the ground sends up, its edge soft
    const sheet = new THREE.MeshBasicMaterial({ name: 'clouds', alphaToCoverage: true, depthWrite: false });
    sheet.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = /* glsl */ `
        varying vec3 vSpot;
        void main() {
          vec4 at = modelMatrix * vec4(position, 1.0);
          vSpot = at.xyz - cameraPosition;
          gl_Position = projectionMatrix * viewMatrix * at;
        }`;
      shader.fragmentShader = /* glsl */ `
        uniform vec4 uCloudDrift;
        uniform vec3 uOrigin, uSunDir, uSunLight, uSkyLight, uHaze;
        uniform float uHazeDensity, uCel;
        varying vec3 vSpot;
        ${cloudField(clouds)}
        void main() {
          vec3 world = vSpot + cameraPosition + uOrigin;
          float dens = cloudAt(world.xz);
          // inside the puffs' footprint, and only where it is seen from below at some angle: edge on, the puffs' own
          // flat-cut bottoms are the base, and a sheet would stand out from under them like a saucer
          float alpha = smoothstep(0.55, 0.75, dens) * smoothstep(0.1, 0.35, normalize(vSpot).y);
          if (alpha <= 0.0) discard;
          // thicker cloud above, darker base
          vec3 col = uSkyLight * (0.62 - 0.12 * dens) + uSunLight * max(uSunDir.y, 0.0) * (0.22 - 0.1 * dens) + vec3(0.02, 0.018, 0.014);
          col = mix(col, uSkyLight * 0.75 + uSunLight * 0.1, uCel);
          alpha = mix(alpha, step(0.5, alpha), uCel);
          vec3 eye = cameraPosition + uOrigin;
          float a = max(eye.y - ${air.base.toFixed(2)}, 0.0) / ${air.scale.toFixed(1)};
          float bb = max(world.y - ${air.base.toFixed(2)}, 0.0) / ${air.scale.toFixed(1)};
          float mean = abs(a - bb) < 1e-3 ? exp(-0.5 * (a + bb)) : (exp(-min(a, bb)) - exp(-max(a, bb))) / abs(bb - a);
          col = mix(col, uHaze, 1.0 - exp(-uHazeDensity * length(vSpot) * mean));
          gl_FragColor = vec4(col, alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`;
    };
    sheet.customProgramCacheKey = () => 'cloud-bases';
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(2 * reach, 2 * reach, 1, 1).rotateX(Math.PI / 2), sheet);
    this.floor.position.y = this.base;
    this.floor.frustumCulled = false;
    this.floor.renderOrder = 10;
    this.floor.raycast = () => {};
    this.floor.onBeforeRender = (_renderer, scene) => this.light(scene);
    this.group.add(this.mesh, this.floor);
  }

  /** The cel look: the clouds in two tones with a hard edge. */
  simplify(on: boolean): void {
    this.cel.value = Number(on);
  }

  /** Follow the eye (scene frame): the puffs drift with the field and are laid out again round the eye as it moves over it. */
  follow(eye: THREE.Vector3): boolean {
    this.mesh.position.set(cloudUniform.value.x, 0, cloudUniform.value.z);
    this.floor.position.set(eye.x, this.base, eye.z);
    const fx = eye.x - cloudUniform.value.x,
      fz = eye.z - cloudUniform.value.z;
    if (Math.hypot(fx - this.laid.x, fz - this.laid.y) >= this.reach * 0.15) this.lay(fx, fz);
    else if (Math.hypot(fx - this.sorted.x, fz - this.sorted.z, eye.y - this.sorted.y) < 60) return false;
    this.sort(fx, eye.y, fz);
    return true;
  }

  /** Lay the puffs out over the field round (x, z) in the field's frame. */
  private lay(x: number, z: number): void {
    this.laid.set(x, z);
    const c = this.clouds,
      step = this.spacing;
    this.puffs.length = 0;
    const i0 = Math.floor((x - this.reach) / step),
      i1 = Math.floor((x + this.reach) / step),
      j0 = Math.floor((z - this.reach) / step),
      j1 = Math.floor((z + this.reach) / step);
    for (let i = i0; i <= i1 && this.puffs.length < this.mesh.instanceMatrix.count; i++)
      for (let j = j0; j <= j1 && this.puffs.length < this.mesh.instanceMatrix.count; j++) {
        const r = sequence((i * 73856093) ^ (j * 19349663));
        const px = (i + r()) * step,
          pz = (j + r()) * step;
        if (Math.hypot(px - x, pz - z) > this.reach) continue;
        const dens = cloudAt(c, px, pz, 0, 0);
        if (dens < 0.12) continue;
        // in the heart, big puffs heaped high; at the edge small ones low on the base
        const radius = step * (0.6 + 0.8 * dens) * (0.75 + 0.5 * r());
        // the lowest puffs sit with their middles under the base, so the base is cut flat across the whole cloud
        const height = this.base + radius * (0.1 + 0.3 * r()) + c.depth * 0.8 * dens ** 1.6 * (0.6 + 0.8 * r());
        this.puffs.push({ x: px, y: height, z: pz, radius, far: 0 });
      }
  }

  /**
   * Put the puffs in order, furthest from the eye first. They write no depth (two discs a few metres apart
   * in depth, seen from kilometres off, could not be told apart and would flicker), so each covers those
   * drawn before it: drawn far to near, the nearest is in front.
   */
  private sort(x: number, y: number, z: number): void {
    this.sorted.set(x, y, z);
    for (const p of this.puffs) p.far = (p.x - x) ** 2 + (p.y - y) ** 2 + (p.z - z) ** 2;
    this.puffs.sort((a, b) => b.far - a.far);
    const e = this.mesh.instanceMatrix.array as Float32Array;
    this.puffs.forEach((p, i) => {
      e.fill(0, i * 16, i * 16 + 16);
      e[i * 16] = e[i * 16 + 5] = e[i * 16 + 10] = p.radius;
      e[i * 16 + 12] = p.x;
      e[i * 16 + 13] = p.y;
      e[i * 16 + 14] = p.z;
      e[i * 16 + 15] = 1;
    });
    this.mesh.count = this.puffs.length;
    this.mesh.instanceMatrix.clearUpdateRanges();
    this.mesh.instanceMatrix.addUpdateRange(0, Math.max(1, this.puffs.length) * 16);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /** Take the light of the scene the clouds are drawn in: its Sun, its sky, its haze. */
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

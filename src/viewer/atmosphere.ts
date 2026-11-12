/**
 * The air as it scatters and dims light, from the ground to orbit: what makes the sky blue, the
 * horizon pale, the limb a layered glow, a low Sun red and the Earth's shadow dark.
 *
 * Three things are in the air (all per metre at the sea, falling off with height):
 *
 * - the gas itself, scattering by Rayleigh's law: 5.802, 13.558 and 33.1 e-6 for red, green and
 *   blue (680, 550 and 440 nm: Bucholtz 1995, as Bruneton and Neyret 2008 and Hillaire 2020 use
 *   them), thinning by e every 8 km;
 * - haze (aerosol), scattering nearly evenly across colours and mostly forward (Cornette and
 *   Shanks's phase function, g = 0.8): its amount at the sea is the setting's own haze (a
 *   visibility: air.ts), less what the gas already takes, thinning by e over the setting's own
 *   height (cape.ts: 1,400 m). It is the pale band that hugs the horizon;
 * - ozone, which only absorbs, in a layer about 25 km up (a tent 30 km wide: Hillaire 2020). It is
 *   why the zenith stays blue at twilight and the upper limb is a deep blue. Its Chappuis band
 *   peaks in the orange (575 to 603 nm), between the wavelengths the gas is sampled at: sampled
 *   there too (0.650, 1.881 and 0.085 e-6, as Hillaire has it) it took green and left red, and
 *   the limb and the horizon came out lavender. So it is taken as the band's mean over each of
 *   the screen's primaries instead: 1.94, 1.66 and 0.14 e-6, the same column (about 300 Dobson
 *   units). Derived from the band's shape as remembered (Serdyuchenko and others 2014), not read
 *   again: estimated.
 *
 * The method is Hillaire's ("A Scalable and Production Ready Sky and Atmosphere Rendering
 * Technique", 2020), cut down: two small tables are made once on the GPU, a few milliseconds:
 * **transmittance** (how much light gets from any height out to space along any direction: 256 x
 * 64, in Bruneton's parametrisation) and **multiple scattering** (light that has been scattered
 * more than once, as if evenly, by the Sun's height and the height in the air: 32 x 32). With
 * them, a shader walks a ray (`atmScatter`) and at each step adds the Sun's light scattered once
 * (dimmed on its way in, by the table; none in the Earth's shadow) and the light scattered many
 * times, and dims what lies behind. Nothing here knows the hour or the place: the Sun's direction
 * and strength are given.
 *
 * The numbers above are documented (their sources named); what is estimated is the haze's
 * amount and height (the setting's), its single-scattering albedo (0.92) and asymmetry (0.8),
 * and the ground's albedo in the second table (0.12: mostly sea).
 *
 * The pure functions (`airDensities`, `opticalDepth`, `transmittanceUv`, `transmittanceAt`) are the
 * same arithmetic in TypeScript, for the tests and for the Sun's own colour seen from a height.
 */
import * as THREE from 'three';

/** The top of the air, metres above the sea: above it there is nothing to scatter. */
export const TOP = 100_000;
/** The Earth's radius the tables are made for, metres (a shader gives heights above its own sphere: a few km in 6,371 changes nothing). */
export const GROUND = 6_371_000;
/** Rayleigh scattering at the sea, per metre, for red, green and blue; and the height over which the gas thins by e. */
export const RAYLEIGH = [5.802e-6, 13.558e-6, 33.1e-6] as const;
export const RAYLEIGH_SCALE = 8000;
/** Ozone's absorption at its layer's middle, per metre; the middle's height and the layer's half breadth. */
export const OZONE = [1.94e-6, 1.66e-6, 0.14e-6] as const;
export const OZONE_MIDDLE = 25_000;
export const OZONE_HALF = 15_000;
/** How much of what the haze takes it scatters (the rest it absorbs), and how far forward (Henyey and Greenstein's g). Estimated. */
export const HAZE_ALBEDO = 0.92;
export const HAZE_FORWARD = 0.8;

/** The haze: what it takes from a beam at the sea, per metre (scattering and absorbing together), and the height over which it thins by e. */
export interface Haze {
  extinction: number;
  scale: number;
}

/** The haze of a setting whose fog has this density (air.ts: densityFor a visibility), less what the gas takes of green light. */
export const hazeFor = (fogDensity: number, scale: number): Haze => ({ extinction: Math.max(fogDensity - RAYLEIGH[1], 2e-6), scale });

/** How much gas, haze and ozone there is at a height, as fractions of each one's most. */
export function airDensities(height: number, haze: Haze): [number, number, number] {
  const h = Math.max(height, 0);
  return [Math.exp(-h / RAYLEIGH_SCALE), Math.exp(-h / haze.scale), Math.max(0, 1 - Math.abs(h - OZONE_MIDDLE) / OZONE_HALF)];
}

/** What the air takes from a beam at a height, per metre, for red, green and blue. */
export function extinctionAt(height: number, haze: Haze): [number, number, number] {
  const [gas, dust, ozone] = airDensities(height, haze);
  return [0, 1, 2].map((c) => RAYLEIGH[c]! * gas + haze.extinction * dust + OZONE[c]! * ozone) as [number, number, number];
}

/** How far it is from a height to the top of the air along a direction `mu` (a cosine from straight up), metres. */
export function toTop(height: number, mu: number): number {
  const r = GROUND + height;
  return -r * mu + Math.sqrt(Math.max(r * r * mu * mu + (TOP - height) * (2 * GROUND + TOP + height), 0));
}

/** Whether a ray from a height along `mu` meets the ground. */
export const meetsGround = (height: number, mu: number): boolean => mu < 0 && (GROUND + height) ** 2 * (1 - mu * mu) < GROUND * GROUND;

/** The optical depth from a height out to the top of the air along `mu`, for red, green and blue (the ray taken not to meet the ground). */
export function opticalDepth(height: number, mu: number, haze: Haze, steps = 200): [number, number, number] {
  const r = GROUND + height;
  const length = toTop(height, mu);
  const tau: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < steps; i++) {
    const t = ((i + 0.5) / steps) * length;
    const k = extinctionAt(Math.sqrt(r * r + t * t + 2 * r * mu * t) - GROUND, haze);
    for (let c = 0; c < 3; c++) tau[c]! += (k[c]! * length) / steps;
  }
  return tau;
}

/** How much of a beam is left on its way from a height out to space along `mu`: none if the Earth is in the way. */
export function transmittanceAt(height: number, mu: number, haze: Haze): [number, number, number] {
  if (meetsGround(height, mu)) return [0, 0, 0];
  return opticalDepth(height, mu, haze).map((t) => Math.exp(-t)) as [number, number, number];
}

/** Where (a height, a direction) is kept in the transmittance table: Bruneton's parametrisation, each 0 to 1. */
export function transmittanceUv(height: number, mu: number): [number, number] {
  const H = Math.sqrt(TOP * (2 * GROUND + TOP));
  const rho = Math.sqrt(Math.max(height, 0) * (2 * GROUND + Math.max(height, 0)));
  const d = toTop(height, mu);
  const least = TOP - height,
    most = rho + H;
  return [(d - least) / (most - least), rho / H];
}

/** The height and direction a place in the table stands for. */
export function transmittanceFromUv(u: number, v: number): [number, number] {
  const H = Math.sqrt(TOP * (2 * GROUND + TOP));
  const rho = H * v;
  const r = Math.sqrt(rho * rho + GROUND * GROUND);
  const least = GROUND + TOP - r,
    most = rho + H;
  const d = least + u * (most - least);
  const mu = d === 0 ? 1 : (H * H - rho * rho - d * d) / (2 * r * d);
  return [r - GROUND, Math.min(1, Math.max(-1, mu))];
}

const f = (v: number): string => v.toExponential(6);
const v3 = (v: readonly number[]): string => `vec3(${v.map(f).join(', ')})`;

/** GLSL: the air's make-up and the table's parametrisation, for the tables' own shaders and for whoever reads them. `uAtmHaze`: the haze's extinction at the sea and its height. */
const MEDIUM = /* glsl */ `
  uniform vec2 uAtmHaze;
  const float ATM_TOP = ${f(TOP)}, ATM_GROUND = ${f(GROUND)};
  const vec3 ATM_RAYLEIGH = ${v3(RAYLEIGH)}, ATM_OZONE = ${v3(OZONE)};
  // gas, haze and ozone at a height, as fractions of each one's most
  vec3 atmDensities(float h) {
    h = max(h, 0.0);
    return vec3(exp(-h / ${f(RAYLEIGH_SCALE)}), exp(-h / uAtmHaze.y), max(0.0, 1.0 - abs(h - ${f(OZONE_MIDDLE)}) / ${f(OZONE_HALF)}));
  }
  vec3 atmExtinction(vec3 dens) { return ATM_RAYLEIGH * dens.x + uAtmHaze.x * dens.y + ATM_OZONE * dens.z; }
  vec3 atmScattering(vec3 dens) { return ATM_RAYLEIGH * dens.x + ${f(HAZE_ALBEDO)} * uAtmHaze.x * dens.y; }
  float atmToTop(float h, float mu) {
    float r = ATM_GROUND + h;
    return -r * mu + sqrt(max(r * r * mu * mu + (ATM_TOP - h) * (2.0 * ATM_GROUND + ATM_TOP + h), 0.0));
  }
  // the cosine, from straight up, of the direction that just grazes the ground from a height
  float atmHorizon(float h) { return -sqrt(max(h, 0.0) * (2.0 * ATM_GROUND + max(h, 0.0))) / (ATM_GROUND + max(h, 0.0)); }
  vec2 atmUv(float h, float mu) {
    h = clamp(h, 0.0, ATM_TOP);
    float H = sqrt(ATM_TOP * (2.0 * ATM_GROUND + ATM_TOP));
    float rho = sqrt(h * (2.0 * ATM_GROUND + h));
    float d = atmToTop(h, mu), least = ATM_TOP - h, most = rho + H;
    return vec2((d - least) / max(most - least, 1.0), rho / H);
  }`;

/**
 * GLSL for a shader that draws through the air. Uniforms: `tAtmT`, `tAtmMS` (the tables), `uAtmHaze`,
 * `uAtmSunLight` (the Sun's light above the air, in the scene's units).
 *
 * - `atmSunAt(h, mu)`: how much of the Sun's light reaches a height with the Sun `mu` (a cosine) from straight up:
 *   the table, and nothing in the Earth's shadow (which comes on over the Sun's own breadth).
 * - `atmScatter(centre, radius, dir, t0, t1, sun, light, through)`: along the ray from the eye (`centre`: the
 *   Earth's centre from the eye; `radius`: of the sea's sphere) from `t0` to `t1`, the light the air scatters toward
 *   the eye (returned, in the scene's units) and how much of what lies behind gets through.
 */
const scatterGlsl = (steps: number): string => /* glsl */ `
  uniform sampler2D tAtmT, tAtmMS;
  uniform vec3 uAtmSunLight;
  ${MEDIUM}
  vec3 atmSunAt(float h, float mu) {
    float edge = atmHorizon(h);
    float shadow = smoothstep(-0.0047, 0.0047, (mu - edge) / max(sqrt(1.0 - edge * edge), 0.05));
    return shadow > 0.0 ? texture(tAtmT, atmUv(h, max(mu, edge))).rgb * shadow : vec3(0.0);
  }
  vec3 atmScatter(vec3 centre, float radius, vec3 dir, float t0, float t1, vec3 sun, out vec3 through) {
    const int STEPS = ${steps};
    through = vec3(1.0);
    vec3 light = vec3(0.0);
    if (t1 <= t0) return light;
    float cosv = dot(dir, sun);
    float gas = 0.0596831 * (1.0 + cosv * cosv);   // Rayleigh's phase function: 3 / 16 pi (1 + cos^2)
    const float g = ${f(HAZE_FORWARD)};
    // Cornette and Shanks's, for the haze
    float dust = 0.1193662 * (1.0 - g * g) * (1.0 + cosv * cosv) / ((2.0 + g * g) * pow(1.0 + g * g - 2.0 * g * cosv, 1.5));
    float ta = t0;
    for (int i = 1; i <= STEPS; i++) {
      // (steps that lengthen away from the eye: what is near is seen through least air and matters most)
      float u = float(i) / float(STEPS);
      float tb = t0 + (t1 - t0) * u * (0.35 + 0.65 * u);
      vec3 p = dir * (0.5 * (ta + tb)) - centre;
      float r = length(p), h = max(r - radius, 0.0);
      vec3 dens = atmDensities(h);
      vec3 ext = atmExtinction(dens);
      float mu = dot(p, sun) / r;
      vec3 lit = atmSunAt(h, mu);
      vec3 many = texture(tAtmMS, vec2(0.5 + 0.5 * mu, h / ATM_TOP)).rgb;
      vec3 source = (ATM_RAYLEIGH * dens.x * gas + ${f(HAZE_ALBEDO)} * uAtmHaze.x * dens.y * dust) * lit + atmScattering(dens) * many;
      vec3 step_ = exp(-ext * (tb - ta));
      light += through * source * (1.0 - step_) / max(ext, vec3(1e-12));
      through *= step_;
      ta = tb;
    }
    return light * uAtmSunLight;
  }`;
/** In twenty steps: for the air itself, where it is all there is to see. */
export const ATMOSPHERE_GLSL = scatterGlsl(20);
/** In eight: for the air in front of something (a cloud), which is most of what is seen there. */
export const ATMOSPHERE_COARSE_GLSL = scatterGlsl(8);

const VERTEX = /* glsl */ `
  in vec3 position;
  out vec2 vUv;
  void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/** The transmittance table: for each height and direction, what is left of a beam on its way out to space. */
const TRANSMITTANCE = /* glsl */ `
  precision highp float;
  ${MEDIUM}
  in vec2 vUv;
  out vec4 oValue;
  void main() {
    float H = sqrt(ATM_TOP * (2.0 * ATM_GROUND + ATM_TOP));
    float rho = H * vUv.y;
    float r = sqrt(rho * rho + ATM_GROUND * ATM_GROUND);
    float least = ATM_GROUND + ATM_TOP - r, most = rho + H;
    float d = least + vUv.x * (most - least);
    float mu = d == 0.0 ? 1.0 : clamp((H * H - rho * rho - d * d) / (2.0 * r * d), -1.0, 1.0);
    vec3 tau = vec3(0.0);
    for (int i = 0; i < 60; i++) {
      float t = (float(i) + 0.5) / 60.0 * d;
      tau += atmExtinction(atmDensities(sqrt(r * r + t * t + 2.0 * r * mu * t) - ATM_GROUND)) * d / 60.0;
    }
    oValue = vec4(exp(-tau), 1.0);
  }`;

/**
 * The multiple-scattering table (Hillaire 2020, section 5.5): at a height, with the Sun at a height, the light
 * that reaches a point having been scattered twice, gathered from 64 directions, and how much of any light
 * scattered there is scattered again; the series of all further scatterings summed as a geometric one. Per unit of
 * the Sun's light, per unit of scattering.
 */
const MANY = /* glsl */ `
  precision highp float;
  uniform sampler2D tAtmT;
  ${MEDIUM}
  in vec2 vUv;
  out vec4 oValue;
  vec3 sunAt(float h, float mu) {
    float edge = atmHorizon(h);
    return mu > edge ? texture(tAtmT, atmUv(h, mu)).rgb : vec3(0.0);
  }
  void main() {
    float mus = vUv.x * 2.0 - 1.0;
    float h0 = clamp(vUv.y, 0.002, 0.998) * ATM_TOP;
    vec3 sun = vec3(sqrt(max(1.0 - mus * mus, 0.0)), mus, 0.0);
    float r0 = ATM_GROUND + h0;
    vec3 second = vec3(0.0), again = vec3(0.0);
    for (int a = 0; a < 8; a++) for (int b = 0; b < 8; b++) {
      float cz = 1.0 - 2.0 * (float(a) + 0.5) / 8.0, az = 6.2831853 * (float(b) + 0.5) / 8.0;
      float sz = sqrt(max(1.0 - cz * cz, 0.0));
      vec3 dir = vec3(sz * cos(az), cz, sz * sin(az));
      // to the ground or to the top
      float disc = r0 * r0 * (cz * cz - 1.0) + ATM_GROUND * ATM_GROUND;
      bool ground = cz < 0.0 && disc > 0.0;
      float len = ground ? -r0 * cz - sqrt(disc) : atmToTop(h0, cz);
      vec3 through = vec3(1.0), light = vec3(0.0), unit = vec3(0.0);
      for (int i = 0; i < 20; i++) {
        float t = (float(i) + 0.5) / 20.0 * len, dt = len / 20.0;
        vec3 p = vec3(0.0, r0, 0.0) + dir * t;
        float r = length(p), h = r - ATM_GROUND;
        vec3 dens = atmDensities(h), ext = atmExtinction(dens), sca = atmScattering(dens);
        vec3 step_ = exp(-ext * dt);
        vec3 held = through * (1.0 - step_) / max(ext, vec3(1e-12));
        light += held * sca * sunAt(h, dot(p, sun) / r) * 0.0795775;   // (scattered evenly: 1 / 4 pi)
        unit += held * sca;
        through *= step_;
      }
      if (ground) {
        // the ground sends back an eighth of what reaches it (mostly sea: estimated), evenly
        vec3 p = normalize(vec3(0.0, r0, 0.0) + dir * len);
        float up = dot(p, sun);
        light += through * sunAt(0.0, up) * max(up, 0.0) * 0.12 / 3.14159265;
      }
      second += light / 64.0;
      again += unit / 64.0;
    }
    oValue = vec4(second / (1.0 - again), 1.0);
  }`;

/**
 * What a shader that includes ATMOSPHERE_GLSL is given: the two tables (nothing until `Atmosphere` has made them),
 * the haze, and the Sun's light above the air in the scene's units. Shared by reference, so whoever sets the
 * Sun's light sets it for all.
 */
export const atmosphereUniforms = {
  tAtmT: { value: null as THREE.Texture | null },
  tAtmMS: { value: null as THREE.Texture | null },
  uAtmHaze: { value: new THREE.Vector2(3.5e-5, 1400) },
  uAtmSunLight: { value: new THREE.Color(4.5, 4.3, 4.0) },
  /** Toward the Sun itself, in the scene's frame, whatever lights the scene (by night the scene's light is the Moon). */
  uTrueSun: { value: new THREE.Vector3(0, 1, 0) },
};

/** Make the tables for a haze (a few milliseconds, once: nothing if they are made for it already). */
let madeFor = '';
export function makeAtmosphere(renderer: THREE.WebGLRenderer, haze: Haze): void {
  const key = `${haze.extinction} ${haze.scale}`;
  if (key === madeFor) return;
  madeFor = key;
  const table = (width: number, height: number) =>
    new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: false,
      generateMipmaps: false,
    });
  const u = atmosphereUniforms;
  u.tAtmT.value?.dispose();
  u.tAtmMS.value?.dispose();
  const transmittance = table(256, 64),
    many = table(32, 32);
  u.uAtmHaze.value.set(haze.extinction, haze.scale);
  const triangle = new THREE.BufferGeometry();
  triangle.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const was = renderer.getRenderTarget();
  for (const [fragmentShader, target] of [
    [TRANSMITTANCE, transmittance],
    [MANY, many],
  ] as const) {
    const material = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: VERTEX,
      fragmentShader,
      uniforms: { uAtmHaze: u.uAtmHaze, tAtmT: { value: transmittance.texture } },
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(triangle, material);
    mesh.frustumCulled = false;
    scene.add(mesh);
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    scene.remove(mesh);
    material.dispose();
  }
  renderer.setRenderTarget(was);
  triangle.dispose();
  u.tAtmT.value = transmittance.texture;
  u.tAtmMS.value = many.texture;
}

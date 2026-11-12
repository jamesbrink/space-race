import * as THREE from 'three';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';
import { installedAir } from './air.ts';
import { hash2 } from './field.ts';
import { uOrigin } from './origin.ts';

/**
 * The engine's fire and the smoke it leaves, as volumes. This one part of the picture is meant to
 * look real, not drawn (the rest of the scene is designed: AGENTS.md, "Being there"); in the cel
 * look the same volumes are cut into flat tones.
 *
 * Three things are marched along each ray, in one pass, the way the clouds are (clouds.ts): at half
 * the window's size each way in CSS pixels, as far as the scene's depth, and brought up to the
 * frame's size with each of its pixels taking only what lies in front of its own surface.
 *
 * - The fire (plume.ts): light given off by the gas, with a little of it taken back on the way out.
 *   A bright core at the exit, shock diamonds while there is air to stand them up, a turbulent
 *   orange skirt where the fuel-rich edge burns in the air; the jet's edge opens as the air thins
 *   until it is a wide faint balloon. Its eddies run aft with the clock's seconds, so one instant is
 *   one fire.
 * - The blast over the pad at liftoff, and the trail along the path flown (trail.ts): white smoke
 *   that scatters the Sun's light, dimmed by the smoke between it and the Sun (a few steps toward
 *   it), the sky's and the ground's, and the fire's own, falling off with the square of the distance.
 *
 * The fire is light, so it also lights: a point light at the nozzle (Plume.light), in the scene at
 * no strength while the engine is out. The smoke shades: everything lit through three's own lights
 * (the ground, the pad, the vehicle) loses the Sun's direct light by how much smoke lies between it
 * and the Sun (`smokeShade`, in the lights chunk beside the clouds' shadow, air.ts). That is worked
 * out, not looked up: the blast as a low disc, the trail as a few soft-edged stretches, so the
 * shadow is as smooth as its arithmetic, at any distance, with no texels to crawl. (Drawing the
 * smoke into the Sun's shadow map was tried first, each texel kept or dropped against a fixed
 * pattern by the smoke's opacity: the map's filter is too narrow to make a stipple grey, and it
 * showed as dots. What this gives up is the billows' outline in the shadow's edge.)
 *
 * The clouds are laid over the frame last; fire and smoke write no depth, so they tell the clouds
 * what they cover and how near they are through a veil (`veilMesh`, clouds.ts `veils`).
 *
 * Nothing here costs anything until a flight shows its fire or its smoke: the pass returns at once.
 */

/** The most nodes of the trail drawn at once (Trail.nodes). */
export const NODES = 64;

/** The engine's fire, as plume.ts keeps it. */
export interface Flame {
  /** At the nozzle's exit, the jet along its -Y; shown while it burns. */
  readonly mesh: THREE.Object3D;
  /** The exit's radius, metres. */
  readonly radius: number;
  on: number;
  time: number;
  bright: number;
  readonly light: THREE.PointLight;
  /** The jet's shape in the air it is in (plume.ts `plumeShape`). */
  shape(): { width: number; length: number; air: number; cell: number };
}

/** The smoke, as trail.ts keeps it. */
export interface Smoke {
  /** In the scene; shown while the flight is flown. */
  readonly mesh: THREE.Object3D;
  /** The clock's seconds, or null when nothing is flying. */
  now: number | null;
  nodes(now: number, out: Float64Array): number;
  pad(out: THREE.Vector3): THREE.Vector3 | null;
  /** The blast over the pad at `now` (trail.ts `blast`). */
  blast(): { radius: number; height: number; amount: number; rise: number };
}

let flame: Flame | null = null;
let smoke: Smoke | null = null;

/** Have the fire or the smoke drawn (the last of each to say so is the one drawn), or no longer. */
export function tend(source: Flame | Smoke, on = true): void {
  if ('radius' in source) flame = on ? source : flame === source ? null : flame;
  else smoke = on ? source : smoke === source ? null : smoke;
}

/** In the scene and shown all the way up. */
function shown(o: THREE.Object3D): boolean {
  let p: THREE.Object3D | null = o;
  for (; p?.parent; p = p.parent) if (!p.visible) return false;
  return !!p && p.visible && (p as THREE.Scene).isScene === true;
}

/** How fast the fire's eddies run aft, metres a second: what film shows of the skirt's billows, not the gas itself, which at 2 km/s would be another fire every frame (estimated). */
const FLOW = 16;
/** How much of the Sun's light a shadow of the thickest smoke takes. */
const SHADE = 0.8;

/**
 * The noise everything is cut from: 48 texels a side, repeating. Red: three octaves of smooth
 * noise (the fire's eddies). Green, blue, alpha: round lumps, 4, 8 and 16 to a tile (the smoke's
 * billows), each 1 at a lump's heart and 0 in the creases, as the clouds' are.
 */
function noiseMade(): THREE.Data3DTexture {
  const n = 48;
  const data = new Uint8Array(n * n * n * 4);
  const lattice = (cells: number, seed: number) => {
    const v = new Float32Array(cells * cells * cells * 3);
    for (let i = 0; i < cells; i++)
      for (let j = 0; j < cells; j++)
        for (let k = 0; k < cells; k++)
          for (let a = 0; a < 3; a++) v[((i * cells + j) * cells + k) * 3 + a] = hash2(i * cells + j, k, seed + a);
    return v;
  };
  const smooth = (f: number) => f * f * (3 - 2 * f);
  const octaves = [6, 12, 24].map((cells, o) => ({ cells, v: lattice(cells, 900 + o * 7) }));
  const balls = [4, 8, 16].map((cells, o) => ({ cells, v: lattice(cells, 950 + o * 7) }));
  for (let z = 0; z < n; z++)
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const at = ((z * n + y) * n + x) * 4;
        let sum = 0,
          amp = 0.5;
        for (const { cells, v } of octaves) {
          const p = [((x + 0.5) / n) * cells, ((y + 0.5) / n) * cells, ((z + 0.5) / n) * cells];
          const c = p.map(Math.floor);
          const f = p.map((q, i) => smooth(q - c[i]!));
          const g = (dx: number, dy: number, dz: number) =>
            v[((((c[0]! + dx) % cells) * cells + ((c[1]! + dy) % cells)) * cells + ((c[2]! + dz) % cells)) * 3]!;
          const mix = (a: number, b: number, t: number) => a + (b - a) * t;
          sum +=
            amp *
            mix(
              mix(mix(g(0, 0, 0), g(1, 0, 0), f[0]!), mix(g(0, 1, 0), g(1, 1, 0), f[0]!), f[1]!),
              mix(mix(g(0, 0, 1), g(1, 0, 1), f[0]!), mix(g(0, 1, 1), g(1, 1, 1), f[0]!), f[1]!),
              f[2]!,
            );
          amp *= 0.5;
        }
        data[at] = Math.round((255 * sum) / 0.875);
        balls.forEach(({ cells, v }, channel) => {
          const px = ((x + 0.5) / n) * cells,
            py = ((y + 0.5) / n) * cells,
            pz = ((z + 0.5) / n) * cells;
          const cx = Math.floor(px),
            cy = Math.floor(py),
            cz = Math.floor(pz);
          const wrap = (c: number) => ((c % cells) + cells) % cells;
          let best = 9;
          for (let dz = -1; dz <= 1; dz++)
            for (let dy = -1; dy <= 1; dy++)
              for (let dx = -1; dx <= 1; dx++) {
                const i = ((wrap(cx + dx) * cells + wrap(cy + dy)) * cells + wrap(cz + dz)) * 3;
                const ex = cx + dx + v[i]! - px,
                  ey = cy + dy + v[i + 1]! - py,
                  ez = cz + dz + v[i + 2]! - pz;
                best = Math.min(best, ex * ex + ey * ey + ez * ez);
              }
          data[at + 1 + channel] = Math.round(255 * Math.sqrt(Math.max(0, 1 - best * 2.2)));
        });
      }
  const texture = new THREE.Data3DTexture(data, n, n, n);
  texture.format = THREE.RGBAFormat;
  texture.wrapS = texture.wrapT = texture.wrapR = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/** The march's two results at its own size: light and cover; and where along the ray they are, with the fire's and the smoke's tones. */
const low = new THREE.WebGLRenderTarget(1, 1, {
  count: 2,
  type: THREE.HalfFloatType,
  format: THREE.RGBAFormat,
  minFilter: THREE.NearestFilter,
  magFilter: THREE.NearestFilter,
  depthBuffer: false,
});
low.textures[0]!.minFilter = low.textures[0]!.magFilter = THREE.LinearFilter; // (the veil reads it smoothly; the composite fetches texels)

/** What every shader here is given: where the fire, the blast and the trail are, from the eye, and the light on them. */
const u = {
  tNoise: { value: null as THREE.Data3DTexture | null },
  tDepth: { value: null as THREE.Texture | null },
  tColour: { value: low.textures[0]! },
  tInfo: { value: low.textures[1]! },
  uProjInv: { value: new THREE.Matrix4() },
  uRange: { value: new THREE.Vector2(0.1, 1000) },
  uTurn: { value: new THREE.Matrix3() },
  uLow: { value: new THREE.Vector2(1, 1) },
  uFrame: { value: new THREE.Vector2(1, 1) },
  /** The part of the frame anything is drawn in, as fractions of it: x0, y0, x1, y1. Empty: nothing is. */
  uRect: { value: new THREE.Vector4(0, 0, 0, 0) },
  uGrain: { value: 0.001 },
  uSun: { value: new THREE.Vector3(0, 1, 0) },
  uSunLight: { value: new THREE.Color() },
  uSkyLight: { value: new THREE.Color() },
  uGroundLight: { value: new THREE.Color() },
  uHaze: { value: new THREE.Color() },
  /** The haze: its density at the sea, the height over which it falls by e, the eye's height over the sea. */
  uAir: { value: new THREE.Vector3(0, 1400, 0) },
  uNozzle: { value: new THREE.Vector3() },
  uAxis: { value: new THREE.Vector3(0, -1, 0) },
  /** The fire: the exit's radius, how hard it burns, how much air there is (0 to 1), the clock's seconds. */
  uFlame: { value: new THREE.Vector4(1, 0, 1, 0) },
  /** Its shape: how wide the free jet swells and how long it is (exit radii), a shock cell's length (exit radii), how far its eddies have run (metres). */
  uShape: { value: new THREE.Vector4(1, 30, 3, 0) },
  uBright: { value: 1 },
  /** The fire's light on the smoke: where it is from, and its colour by its candela over pi. */
  uGlowAt: { value: new THREE.Vector3() },
  uGlow: { value: new THREE.Color(0, 0, 0) },
  uPad: { value: new THREE.Vector3() },
  /** The blast: its front's radius, its height, its extinction a metre, how far its billows have risen. */
  uBlast: { value: new THREE.Vector4(4, 3, 0, 0) },
  /** The trail's nodes, oldest first: place and spread; extinction on the path and metres along it. */
  uNodeP: { value: new Float32Array(NODES * 4) },
  uNodeQ: { value: new Float32Array(NODES * 4) },
  uNodes: { value: 0 },
  uCel: { value: 0 },
};

const DEPTH = /* glsl */ `
  uniform sampler2D tDepth;
  uniform mat4 uProjInv;
  uniform vec2 uRange;
  // the ray through a point of the frame, in the camera's frame
  vec3 viewRay(vec2 uv) {
    vec4 v = uProjInv * vec4(uv * 2.0 - 1.0, 1.0, 1.0);
    return normalize(v.xyz / v.w);
  }
  // how far along that ray the scene's surface is; the sky is endlessly far (as clouds.ts reads it)
  float sceneDistance(float depth, vec3 ray) {
    if (depth >= 1.0) return 1e9;
    float n = uRange.x, f = uRange.y;
    float z = n * f / (f * (1.0 - depth) + n * depth);
    return z / max(-ray.z, 1e-4);
  }`;

/** The smoke's two volumes, for the march and for their shadow: where they are, and how thick at a point (from the eye, the world's axes). */
const SMOKE = /* glsl */ `
  #define NODES ${NODES}
  uniform highp sampler3D tNoise;
  uniform vec3 uPad;
  uniform vec4 uBlast;
  uniform vec4 uNodeP[NODES];
  uniform vec4 uNodeQ[NODES];
  uniform int uNodes;
  // round lumps of three sizes: 1 at a lump's heart
  float billow(vec3 c, float lod) { return dot(textureLod(tNoise, c, lod).gba, vec3(0.5, 0.3, 0.2)); }

  // The blast: a low sheet running out from under the fire over the ground, rolled up into a wall at its front and
  // blown thin over the middle. Its billows grow as it spreads, so they run out with it, and churn slowly upward.
  float blastDensity(vec3 p, float lod) {
    vec3 q = p - uPad;
    float u = length(q.xz) / uBlast.x;
    if (q.y < -0.3 || u > 1.3 || q.y > uBlast.y * 1.25) return 0.0;
    float top = uBlast.y * (0.3 + 0.7 * smoothstep(0.15, 0.9, u));
    float body = smoothstep(0.0, 0.16, u) * (1.0 - smoothstep(0.8, 1.2, u));
    float tile = 4.0 * (2.0 + 0.16 * uBlast.x);
    float n = billow(vec3(q.x, q.y - uBlast.w, q.z) / tile, lod);
    return uBlast.z * smoothstep(0.0, 0.22, body * (1.0 - max(q.y, 0.0) / top) * 1.5 - (1.0 - n) * 0.85);
  }

  // The stretch of the trail between two nodes (a: the older; pa, pb: place and spread; qa, qb: extinction, metres along
  // the path), along u for len metres: thickest on the path, cut into billows that are as big as the smoke has spread.
  float trailDensity(vec3 p, vec4 pa, vec4 pb, vec4 qa, vec4 qb, vec3 u, float len, float lod) {
    float h = clamp(dot(p - pa.xyz, u) / len, 0.0, 1.0);
    float sigma = mix(qa.x, qb.x, h);
    if (sigma <= 0.0) return 0.0;
    float r = mix(pa.w, pb.w, h);
    vec3 rad = p - pa.xyz - u * (h * len);
    float x = length(rad) / r;
    if (x >= 1.0) return 0.0;
    float within = (1.0 - x * x) * (1.0 - x * x);   // soft across: no edge to it
    // lumps of the next size down and the next up from the spread, faded between: they grow without sliding
    vec3 c = rad + u * (qa.y + h * len);
    float k = log2(r), k0 = floor(k), s = exp2(k0) * 4.0;
    float n = mix(billow(c / s, lod), billow(c / (2.0 * s), max(lod - 1.0, 0.0)), k - k0);
    return sigma * within * 1.6 * smoothstep(0.0, 0.45, within + (n - 0.62) * 1.5);
  }

  // Where a ray from o along d is inside a cylinder (radius r about the line through a along u, between a and a + u * len):
  // from x to y along it; x > y if it misses.
  vec2 inCylinder(vec3 o, vec3 d, vec3 a, vec3 u, float len, float r) {
    vec3 oa = o - a;
    float du = dot(d, u), ou = dot(oa, u);
    vec3 dp = d - du * u, op = oa - ou * u;
    float qa = dot(dp, dp), qb = dot(dp, op), qc = dot(op, op) - r * r;
    float t0 = -1e9, t1 = 1e9;
    if (qa > 1e-9) {
      float disc = qb * qb - qa * qc;
      if (disc < 0.0) return vec2(1.0, -1.0);
      float root = sqrt(disc);
      t0 = (-qb - root) / qa;
      t1 = (-qb + root) / qa;
    } else if (qc > 0.0) return vec2(1.0, -1.0);
    if (abs(du) > 1e-6) {
      float e0 = -ou / du, e1 = (len - ou) / du;
      t0 = max(t0, min(e0, e1));
      t1 = min(t1, max(e0, e1));
    } else if (ou < 0.0 || ou > len) return vec2(1.0, -1.0);
    return vec2(t0, t1);
  }`;

const VERTEX = /* glsl */ `
  in vec3 position;
  in vec2 uv;
  out vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const MARCH = /* glsl */ `
  precision highp float; precision highp int;
  ${DEPTH}
  ${SMOKE}
  uniform mat3 uTurn;        // the camera's turn: its frame to the world's
  uniform vec2 uLow;         // this target's size, pixels
  uniform float uGrain;      // radians a pixel of it
  uniform vec3 uSun, uSunLight, uSkyLight, uGroundLight, uHaze, uAir;
  uniform vec3 uNozzle, uAxis, uGlowAt, uGlow;
  uniform vec4 uFlame, uShape;
  uniform float uBright;
  in vec2 vUv;
  layout(location = 0) out vec4 oColour;   // light sent toward the eye (premultiplied), and cover
  layout(location = 1) out vec4 oInfo;     // where along the ray it begins and ends; the fire's brightness; the smoke's light

  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
  struct Layer { vec4 c; float at, front, back; };   // light and cover; its middle, its near and far ends along the ray

  // the fraction of light lost to the haze between the eye and a point y above it and d away (air.ts: airFog)
  float hazeLost(float y, float d) {
    float a = max(uAir.z, 0.0) / uAir.y, b = max(uAir.z + y, 0.0) / uAir.y;
    float mean = abs(a - b) < 1e-3 ? exp(-0.5 * (a + b)) : (exp(-min(a, b)) - exp(-max(a, b))) / abs(b - a);
    return 1.0 - exp(-uAir.x * d * mean);
  }
  // which noise level a sample t along the ray wants, for lumps on a tile of so many metres: no finer than a pixel
  float lodFor(float t, float tile) { return max(log2(t * uGrain * 48.0 / tile), 0.0); }

  // White smoke at p, with tau of smoke between it and the Sun; up: 0 on its underside to 1 on its top. The Sun's light
  // comes through in octaves, as a cloud's does (each scattering deeper and less dimmed); then the sky's, the ground's, the fire's.
  vec3 smokeLit(vec3 p, float tau, float up, float toSun) {
    float sun = 0.6 * exp(-tau) + 0.28 * exp(-0.3 * tau) + 0.12 * exp(-0.07 * tau);
    sun *= 0.85 + 0.6 * pow(0.5 + 0.5 * toSun, 6.0);   // a thin edge against the Sun glows
    vec3 g = p - uGlowAt;
    return 0.92 * (uSunLight * sun + uSkyLight * (0.35 + 0.45 * up) + uGroundLight * 0.3 * (1.0 - up) + uGlow / (dot(g, g) + 12.0));
  }

  // ---- the fire -------------------------------------------------------------------------------------------------
  // The jet's edge x exit radii aft, in exit radii: the free jet swells to its width as the air lets it, and where there
  // is air the mixing layer spreads slowly outward.
  float edge(float x) {
    float w = uShape.x;
    return 1.0 + (w - 1.0) * (1.0 - exp(-max(x, 0.0) / (1.5 * w))) + 0.085 * max(x, 0.0) * uFlame.z;
  }
  // the fire's colour by how hot it is, 0 to 1 and over: orange where it is going out, pale yellow, nearly white (alcohol burns pale)
  vec3 glow(float heat) {
    vec3 c = mix(vec3(1.0, 0.3, 0.05), vec3(1.0, 0.56, 0.15), smoothstep(0.03, 0.35, heat));
    return mix(c, vec3(1.0, 0.9, 0.62), smoothstep(0.35, 1.0, heat));
  }
  // Light given off at q from the nozzle (rgb, by a metre of path over the exit's radius), and what is taken back (a).
  vec4 fire(vec3 q) {
    float R = uFlame.x, on = uFlame.y, air = uFlame.z;
    float x = dot(q, uAxis) / R;
    vec3 radial = q / R - uAxis * x;
    float r = length(radial);
    float L = uShape.y * mix(0.35, 1.0, on);
    if (x < -0.2 || x > L) return vec4(0.0);
    float b = edge(x), along = x / L;
    // eddies: noise drawn out along the jet and run aft with the clock, bigger as the jet widens
    vec3 c = radial * (0.3 / sqrt(b)) + uAxis * (x * 0.13 - uShape.w / (7.7 * R));
    // (three octaves of smooth noise keep near their middle: spread out to the whole of 0 to 1)
    float n = clamp((texture(tNoise, c - uAxis * (x * 0.06)).r - 0.5) * 2.8 + 0.5, 0.0, 1.0);   // (the big ones longer still)
    float fine = clamp((texture(tNoise, c * 3.1 + 0.37).r - 0.5) * 2.8 + 0.5, 0.0, 1.0);
    float rough = smoothstep(0.02, 0.3, along);            // smooth at the exit, torn further aft
    // the fire's own edge: the jet's, billowing, and in air drawn in to a ragged point where the burning is done
    float taper = mix(1.0, pow(max(1.0 - along, 0.0), 0.45), air);
    float rf = max(b * taper * (1.0 + (n - 0.5) * 1.1 * rough * (0.15 + 0.85 * air)), 0.05);
    float rr = r / rf;
    // the same gas over more area as the free jet swells: so much less light from each metre of it
    float jet = 1.0 + (uShape.x - 1.0) * (1.0 - exp(-max(x, 0.0) / (1.5 * uShape.x)));
    float gain = pow(jet, -1.5);
    float lit = smoothstep(-0.2, 0.05, x);
    // hottest on the axis at the exit, cooling aft and outward; torn into tongues toward the tail
    float heat = exp(-rr * rr * 2.4) * (1.0 - 0.8 * along);
    heat *= mix(1.0, smoothstep(0.22, 0.6, fine + 0.3 * (1.0 - along)), rough * air);
    // shock diamonds: where the jet's own waves cross on the axis the gas is squeezed hot again, and between them it
    // is stretched cool; fainter each cell, and only while there is air to hold the jet in
    float cell = x / uShape.z;
    float wave = 0.5 + 0.5 * cos(6.28318 * (cell - 0.62));
    float held = exp(-0.4 * cell) * step(0.1, cell) * air * air;
    float lozenge = exp(-pow(r / (b * (0.2 + 0.4 * (1.0 - wave))), 2.0));
    heat *= 1.0 - held * 0.45 * (1.0 - wave) * exp(-rr * rr * 3.0);
    float knot = held * pow(wave, 3.0) * lozenge;
    // the gas straight from the throat, white, for the first few radii whatever the air
    float core = exp(-r * r * 1.6) * exp(-x / (3.0 + 2.0 * air));
    // in air it burns; in none the gas only glows, paler and bluer, over the whole balloon
    vec3 tint = mix(vec3(0.7, 0.8, 1.0), glow(heat), 0.2 + 0.8 * smoothstep(0.0, 0.4, air));
    float fade = mix(1.0 - smoothstep(0.35, 1.0, along), 1.0, air);   // (with no air to burn in it has no tip: it thins away)
    float body = (1.0 - smoothstep(0.5, 1.05, rr)) * (1.0 - 0.6 * along);
    body *= mix(1.0, smoothstep(0.3, 0.7, fine + 0.35 * (1.0 - along)), rough * air);
    vec3 e = tint * ((0.5 * body + 2.4 * heat * heat) * gain * fade) + vec3(1.0, 0.93, 0.78) * (core * 2.0 + knot * 5.0 * gain);
    float k = ((0.15 * body + heat * 0.45) * gain + core * 0.3) * lit;
    return vec4(e * (lit * on * uBright), k * on);
  }
  Layer fireLayer(vec3 dir, float far) {
    Layer l = Layer(vec4(0.0), 0.0, 1e9, 0.0);
    float R = uFlame.x;
    if (uFlame.y <= 0.001) return l;
    float L = uShape.y;
    vec2 hit = inCylinder(vec3(0.0), dir, uNozzle - uAxis * (0.2 * R), uAxis, (L + 0.2) * R, edge(L) * 1.25 * R);
    float t = max(hit.x, 0.0), t1 = min(hit.y, far);
    if (t1 <= t) return l;
    float T = 1.0, weight = 0.0;
    vec3 col = vec3(0.0);
    for (int i = 0; i < 72; i++) {
      if (t >= t1 || T < 0.02) break;
      vec3 q = dir * t - uNozzle;
      float x = dot(q, uAxis) / R, r = length(q / R - uAxis * x), b = edge(x);
      // a step: an eighth of the jet's breadth there, longer the deeper in (looking along it); outside it, most of the way to its edge
      float ds = 0.11 * max(b, 0.5) * R * (1.0 + 0.05 * float(i));
      float out_ = (r - b * 1.25) * R;
      if (out_ > 0.0) { t += max(0.5 * out_, ds); continue; }
      ds = min(ds, t1 - t);
      vec4 f = fire(dir * (t + 0.5 * ds) - uNozzle);
      float w = T * dot(f.rgb, LUMA) * ds;
      col += T * f.rgb * (ds / R);
      l.at += w * t;
      weight += w;
      if (w > 1e-4) { l.front = min(l.front, t); l.back = t + ds; }
      T *= exp(-f.a * ds / R);
      t += ds;
    }
    if (weight <= 0.0) return l;
    l.at /= weight;
    l.c = vec4(col, 1.0 - T);
    return l;
  }

  // ---- the blast ------------------------------------------------------------------------------------------------
  Layer blastLayer(vec3 dir, float far, float toSun) {
    Layer l = Layer(vec4(0.0), 0.0, 1e9, 0.0);
    if (uBlast.z <= 0.0) return l;
    vec2 hit = inCylinder(vec3(0.0), dir, uPad, vec3(0.0, 1.0, 0.0), uBlast.y * 1.2, uBlast.x * 1.3);
    float t0 = max(hit.x, 0.0), t1 = min(hit.y, far);
    if (t1 <= t0) return l;
    float tile = 4.0 * (2.0 + 0.16 * uBlast.x);
    float lod = lodFor(t0, tile);
    float T = 1.0, weight = 0.0;
    vec3 col = vec3(0.0);
    const int STEPS = 40;
    float span = t1 - t0;
    for (int i = 0; i < STEPS; i++) {
      if (T < 0.02) break;
      // steps short at the near end, where a step is many pixels, and longer further in
      float sa = float(i) / float(STEPS), sb = float(i + 1) / float(STEPS);
      float ta = t0 + span * sa * (0.3 + 0.7 * sa), tb = t0 + span * sb * (0.3 + 0.7 * sb);
      float ds = tb - ta, t = 0.5 * (ta + tb);
      vec3 p = dir * t;
      float d = blastDensity(p, lod + log2(1.0 + ds));
      if (d <= 0.0) continue;
      float tau = 0.0;
      for (int k = 0; k < 4; k++) {
        float s = 1.5 * exp2(float(k));
        tau += blastDensity(p + uSun * (s * 0.75), lod + 0.6 * float(k)) * s;
      }
      float a = 1.0 - exp(-d * ds);
      float up = clamp((p.y - uPad.y) / uBlast.y, 0.0, 1.0);
      float w = T * a;
      col += w * smokeLit(p, tau, up, toSun);
      l.at += w * t;
      weight += w;
      if (l.front > 1e8) l.front = t - 0.5 * ds;
      l.back = t + 0.5 * ds;
      T *= 1.0 - a;
    }
    if (weight <= 0.0) return l;
    l.at /= weight;
    l.c = vec4(col, 1.0 - T);
    return l;
  }

  // ---- the trail ------------------------------------------------------------------------------------------------
  Layer trailLayer(vec3 dir, float far, float toSun) {
    Layer l = Layer(vec4(0.0), 0.0, 1e9, 0.0);
    if (uNodes < 2) return l;
    // the stretches are met in order along the ray: from the old end if the ray runs the way the flight went
    bool forward = dot(dir, uNodeP[uNodes - 1].xyz - uNodeP[0].xyz) > 0.0;
    float T = 1.0, weight = 0.0;
    vec3 col = vec3(0.0);
    for (int k = 0; k < NODES - 1; k++) {
      if (k >= uNodes - 1 || T < 0.02) break;
      int i = forward ? k : uNodes - 2 - k;
      vec4 pa = uNodeP[i], pb = uNodeP[i + 1], qa = uNodeQ[i], qb = uNodeQ[i + 1];
      if (max(qa.x, qb.x) <= 0.0) continue;
      vec3 u = pb.xyz - pa.xyz;
      float len = length(u);
      if (len < 1e-3) continue;
      u /= len;
      float r = max(pa.w, pb.w);
      vec2 hit = inCylinder(vec3(0.0), dir, pa.xyz, u, len, r);
      float t0 = max(hit.x, 0.0), t1 = min(hit.y, far);
      if (t1 <= t0) continue;
      float lod = lodFor(t0, 4.0 * r);
      const int STEPS = 10;
      float ds = (t1 - t0) / float(STEPS);
      for (int j = 0; j < STEPS; j++) {
        float t = t0 + (float(j) + 0.5) * ds;
        vec3 p = dir * t;
        float d = trailDensity(p, pa, pb, qa, qb, u, len, lod);
        if (d <= 0.0) continue;
        float tau = 0.0;
        for (int m = 0; m < 3; m++) {
          float s = r * (0.12 + 0.3 * float(m));
          tau += trailDensity(p + uSun * s, pa, pb, qa, qb, u, len, lod + 1.0) * r * 0.3;
        }
        float a = 1.0 - exp(-d * ds);
        float h = clamp(dot(p - pa.xyz, u), 0.0, len);
        float up = clamp(0.5 + 0.5 * (p.y - pa.y - u.y * h) / r, 0.0, 1.0);
        float w = T * a;
        col += w * smokeLit(p, tau, up, toSun);
        l.at += w * t;
        weight += w;
        l.front = min(l.front, t - 0.5 * ds);
        l.back = max(l.back, t + 0.5 * ds);
        T *= 1.0 - a;
      }
    }
    if (weight <= 0.0) return l;
    l.at /= weight;
    l.c = vec4(col, 1.0 - T);
    return l;
  }

  // one layer over another, whichever is nearer in front: where they are about as far off, something of both orders
  Layer over(Layer a, Layer b) {
    if (a.front > 1e8) return b;
    if (b.front > 1e8) return a;
    float k = smoothstep(-1.0, 1.0, (b.at - a.at) / (0.08 * min(a.at, b.at) + 0.5));   // 1: a is in front
    vec4 ab = a.c + (1.0 - a.c.a) * b.c, ba = b.c + (1.0 - b.c.a) * a.c;
    float wa = a.c.a + 1e-4, wb = b.c.a + 1e-4;
    return Layer(mix(ba, ab, k), (a.at * wa + b.at * wb) / (wa + wb), min(a.front, b.front), max(a.back, b.back));
  }

  void main() {
    oColour = vec4(0.0);
    oInfo = vec4(0.0);
    vec2 px = 0.5 / uLow;
    // the furthest of the scene under this pixel: the frame's pixels nearer than that cut their own share when it is laid over
    float depth = max(max(texture(tDepth, vUv + vec2(-0.5, -0.5) * px).x, texture(tDepth, vUv + vec2(0.5, -0.5) * px).x),
                      max(texture(tDepth, vUv + vec2(-0.5, 0.5) * px).x, texture(tDepth, vUv + vec2(0.5, 0.5) * px).x));
    vec3 ray = viewRay(vUv);
    float far = sceneDistance(depth, ray);
    vec3 dir = normalize(uTurn * ray);
    float toSun = dot(dir, uSun);
    Layer f = fireLayer(dir, far);
    Layer s = over(blastLayer(dir, far, toSun), trailLayer(dir, far, toSun));
    float smokeLight = s.c.a > 0.0 ? dot(s.c.rgb, LUMA) / (s.c.a * max(dot(uSunLight + uSkyLight, LUMA), 1e-5)) : 0.0;
    // the haze between: the smoke is seen through it as anything is, the fire dimmed by it
    if (s.front < 1e8) s.c = vec4(mix(s.c.rgb, uHaze * s.c.a, hazeLost(dir.y * s.at, s.at)), s.c.a);
    if (f.front < 1e8) f.c.rgb *= 1.0 - 0.8 * hazeLost(dir.y * f.at, f.at);
    float fireLight = dot(f.c.rgb, LUMA);
    Layer all = over(f, s);
    if (all.front > 1e8) return;
    oColour = all.c;
    oInfo = vec4(min(all.front, 6e4), min(all.back, 6e4), fireLight, smokeLight);
  }`;

/** The march brought up to the frame's size: each of its pixels takes, of the four low ones round it, what lies in front of its own surface. */
const OVER = /* glsl */ `
  precision highp float; precision highp int;
  ${DEPTH}
  uniform sampler2D tColour, tInfo;
  uniform vec3 uSunLight, uSkyLight;
  uniform vec4 uFlame;
  uniform float uCel, uBright;
  in vec2 vUv;
  out vec4 oColour;
  void main() {
    ivec2 size = textureSize(tColour, 0);
    vec2 p = vUv * vec2(size) - 0.5, i0 = floor(p), fr = p - i0;
    float d = sceneDistance(texture(tDepth, vUv).x, viewRay(vUv)) * 1.002;
    vec4 c = vec4(0.0);
    vec2 tone = vec2(0.0);
    for (int k = 0; k < 4; k++) {
      ivec2 at = clamp(ivec2(i0) + ivec2(k & 1, k >> 1), ivec2(0), size - 1);
      vec4 info = texelFetch(tInfo, at, 0);
      if (info.y <= 0.0) continue;
      float w = ((k & 1) == 1 ? fr.x : 1.0 - fr.x) * ((k >> 1) == 1 ? fr.y : 1.0 - fr.y);
      w *= info.y > info.x ? clamp((d - info.x) / (info.y - info.x), 0.0, 1.0) : step(info.x, d);
      c += w * texelFetch(tColour, at, 0);
      tone += w * info.zw;
    }
    if (uCel > 0.5) {
      // drawn: the fire in three flat tones by how bright it is, the smoke cut where it is a third opaque, in two
      float fire = tone.x / uBright, wf = max(fwidth(fire) * 0.7, 1e-3);
      float sa = c.a * step(1e-3, tone.y);   // (the fire takes a little light back too: that is not smoke)
      float smoke = smoothstep(0.3 - max(fwidth(sa), 1e-3), 0.3 + max(fwidth(sa), 1e-3), sa);
      vec3 grey = mix(uSkyLight * 1.1 + uSunLight * 0.35, uSunLight * 0.95 + uSkyLight, smoothstep(0.55, 0.6, tone.y / max(c.a, 1e-3)));
      vec3 flame = mix(vec3(1.0, 0.48, 0.16) * 1.8, vec3(1.0, 0.82, 0.31) * 3.0, smoothstep(0.9 - wf, 0.9 + wf, fire));
      flame = mix(flame, vec3(1.0, 0.96, 0.86) * 5.0, smoothstep(2.6 - wf, 2.6 + wf, fire));
      float lit = smoothstep(0.3 - wf, 0.3 + wf, fire);
      // (where the air is too thin to burn in, the fire is a pale veil, half seen through)
      float burns = smoothstep(0.0, 0.4, uFlame.z);
      flame = mix(vec3(0.8, 0.88, 1.0) * 1.6, flame, burns);
      c = mix(vec4(grey, 1.0) * smoke, vec4(flame * uBright, 1.0) * mix(0.5, 1.0, burns), lit);
    }
    if (c.a <= 0.0 && c.r + c.g + c.b <= 0.0) discard;
    oColour = c;
  }`;

/** What the fire and smoke cover, and how near they are, for the clouds laid over the frame later (clouds.ts `drawVeils`). */
const VEIL = /* glsl */ `
  precision highp float;
  ${DEPTH}
  uniform sampler2D tColour, tInfo;
  uniform mat4 projectionMatrix;
  uniform vec2 uFrame;
  uniform vec4 uRect, uFlame;
  uniform float uCel, uBright;
  out vec4 oColour;
  void main() {
    vec2 uv = gl_FragCoord.xy / uFrame;
    if (uv.x < uRect.x || uv.y < uRect.y || uv.x > uRect.z || uv.y > uRect.w) discard;
    vec4 info = texture(tInfo, uv);
    // (a fire is seen through, but the cloud behind it is not laid over its light)
    float cover = max(texture(tColour, uv).a, clamp(info.z, 0.0, 1.0));
    // (drawn, the fire is cut where OVER cuts it, and covers what it does there)
    if (uCel > 0.5) cover = max(cover, step(0.3, info.z / uBright) * mix(0.5, 1.0, smoothstep(0.0, 0.4, uFlame.z)));
    if (cover < 0.02 || info.y <= 0.0) discard;
    vec4 clip = projectionMatrix * vec4(0.0, 0.0, -info.x * max(-viewRay(uv).z, 1e-4), 1.0);
    gl_FragDepth = clamp(clip.z / clip.w * 0.5 + 0.5, 0.0, 1.0);
    oColour = vec4(0.0, 0.0, 0.0, cover);
  }`;

const raw = (vertexShader: string, fragmentShader: string, uniforms: Record<string, THREE.IUniform>) =>
  new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader, fragmentShader, uniforms, depthTest: false, depthWrite: false });

/** A triangle over the whole frame. */
function wholeFrame(): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  return g;
}

/**
 * What stands for the fire and smoke among the clouds' veils: drawn only when the veils are (on
 * their layer, which the clouds put it on; never with the scene), it writes how much of each pixel
 * they cover and how far off they begin.
 */
export function veilMesh(): THREE.Mesh {
  const material = raw('in vec3 position;\nvoid main() { gl_Position = vec4(position.xy, 0.0, 1.0); }', VEIL, u);
  material.depthTest = true;
  material.depthWrite = true;
  material.blending = THREE.NoBlending;
  const mesh = new THREE.Mesh(wholeFrame(), material);
  mesh.name = 'Exhaust';
  mesh.layers.disableAll();
  mesh.frustumCulled = false;
  mesh.raycast = () => {};
  return mesh;
}

/** Stretches of the trail whose shadow is worked out. */
const STRETCHES = 12;
/**
 * The smoke for `smokeShade`, in the scene's frame, shared by every material (a typed array, so three's copying of
 * a material's uniforms shares it, as it does `uOrigin`): the pad and the blast's extinction; its radius, its height
 * and how many nodes follow; then each node's place and spread, and its extinction on the path.
 */
const shade = new Float32Array(4 * (2 + 2 * (STRETCHES + 1)));
const uSmokeShade: THREE.IUniform<Float32Array> = { value: shade };
for (const lib of Object.values(THREE.ShaderLib)) lib.uniforms.uSmokeShade = uSmokeShade;
THREE.UniformsLib.fog = { ...THREE.UniformsLib.fog, uSmokeShade } as typeof THREE.UniformsLib.fog; // for a ShaderMaterial that takes the fog
{
  const chunks = THREE.ShaderChunk as unknown as Record<string, string>;
  // How much of the Sun's direct light reaches a point of the scene through the smoke: 1 with none in the way.
  chunks.lights_pars_begin = /* glsl */ `${chunks.lights_pars_begin}
    uniform vec4 uSmokeShade[${shade.length / 4}];
    float smokeShade(vec3 world, vec3 toLight) {
      float tau = 0.0;
      // the blast: a low disc on the pad. The light comes down through what is left of it above the point, and is
      // taken to cross it where it is halfway through that
      if (uSmokeShade[0].w > 0.0 && toLight.y > 0.02) {
        vec3 q = world - uSmokeShade[0].xyz;
        float R = uSmokeShade[1].x, H = uSmokeShade[1].y, y = max(q.y, 0.0);
        vec2 at = q.xz + toLight.xz * (0.5 * max(H - y, 0.0) / toLight.y);
        float u = length(at) / R;
        float top = H * (0.3 + 0.7 * smoothstep(0.15, 0.9, u));
        float body = smoothstep(0.0, 0.16, u) * (1.0 - smoothstep(0.75, 1.25, u));
        tau += uSmokeShade[0].w * 0.4 * body * max(top - y, 0.0) / max(toLight.y, 0.2);
      }
      // the trail: where the ray toward the light passes nearest each stretch, the smoke across it there
      int n = int(uSmokeShade[1].z);
      for (int i = 0; i < ${STRETCHES}; i++) {
        if (i >= n - 1) break;
        vec4 a = uSmokeShade[2 + 2 * i], b = uSmokeShade[4 + 2 * i];
        vec3 u = b.xyz - a.xyz;
        float len = max(length(u), 1e-3);
        u /= len;
        vec3 w = world - a.xyz;
        float ul = dot(u, toLight), across = max(1.0 - ul * ul, 0.06);
        float h = clamp((dot(w, u) - ul * dot(w, toLight)) / across, 0.0, len);
        vec3 on = a.xyz + u * h;
        float s = max(dot(on - world, toLight), 0.0);   // (only smoke on the light's side of the point)
        vec3 d = world + toLight * s - on;
        float k = h / len, r = mix(a.w, b.w, k), x2 = dot(d, d) / (r * r);
        if (x2 < 1.0) tau += mix(uSmokeShade[3 + 2 * i].x, uSmokeShade[5 + 2 * i].x, k) * r * 1.07 * (1.0 - x2) * (1.0 - x2) / sqrt(across);
      }
      return 1.0 - ${SHADE.toFixed(2)} * (1.0 - exp(-tau));
    }`;
  chunks.lights_fragment_end = /* glsl */ `${chunks.lights_fragment_end}
    #if defined( USE_FOG ) && NUM_DIR_LIGHTS > 0
      {
        float smoke = smokeShade(vFogWorld, transpose(mat3(viewMatrix)) * directionalLights[0].direction);
        reflectedLight.directDiffuse *= smoke;
        reflectedLight.directSpecular *= smoke;
      }
    #endif`;
}
/**
 * How much of a shadow the smoke casts, by the direct light's strength: all of one by day, none by night, when what
 * lights the pad is the fire and the floodlights, which this shadow would wrongly take too. Kept by the pass.
 */
let daylight = 1;

/**
 * Say what smoke there is for the shadow it casts (`smokeShade`): called when the smoke is shown at an instant
 * (Trail.show), before the frame is drawn. With no argument, or smoke that is not showing: none.
 */
export function shadeBy(source?: Smoke): void {
  shade.fill(0);
  if (!source || source.now === null || daylight <= 0) return;
  const b = source.blast();
  if (b.amount > 0 && source.pad(v)) {
    shade.set([v.x, v.y, v.z, daylight * blastSigma(b), b.radius, b.height]);
  }
  // the stretches with smoke in them, as a dozen at most
  const n = source.nodes(source.now, nodes);
  const worth = (i: number) => nodes[i * 6 + 3]! * nodes[i * 6 + 4]! > 0.003;
  let first = 0,
    last = n - 1;
  while (first < last && !worth(first)) first++;
  while (last > first && !worth(last)) last--;
  if (last <= first) return;
  const count = Math.min(STRETCHES + 1, last - first + 1);
  for (let k = 0; k < count; k++) {
    const i = first + Math.round((k * (last - first)) / (count - 1));
    // (six tenths of it: the billows cut that much out of the smoke that is drawn)
    shade.set([nodes[i * 6]!, nodes[i * 6 + 1]!, nodes[i * 6 + 2]!, nodes[i * 6 + 3]!, 0.6 * daylight * nodes[i * 6 + 4]!], 8 + 8 * k);
  }
  shade[6] = count;
}

/** The blast's extinction, a metre: as it runs out the same smoke lies over more ground. */
const blastSigma = (b: { radius: number; amount: number }): number => 0.4 * b.amount * Math.min(1, 24 / b.radius);

const eye = new THREE.Vector3();
const v = new THREE.Vector3();
const nodes = new Float64Array(NODES * 6);

/** Say where the fire, the blast and the trail are from the eye, as they stand now. Called before the march. */
function place(camera: THREE.Camera): void {
  u.tNoise.value ??= noiseMade();
  // (in the draw the scene is moved by minus the eye and the camera is at the origin: origin.ts. A place taken off
  // the camera's is from the eye either way)
  const o = uOrigin.value;
  eye.set(camera.position.x + o.x, camera.position.y + o.y, camera.position.z + o.z);
  const f = flame && shown(flame.mesh) ? flame : null;
  u.uFlame.value.y = 0;
  u.uGlow.value.setScalar(0);
  if (f) {
    const m = f.mesh.matrixWorld.elements;
    u.uNozzle.value.set(m[12]! - camera.position.x, m[13]! - camera.position.y, m[14]! - camera.position.z);
    u.uAxis.value.set(-m[4]!, -m[5]!, -m[6]!).normalize();
    const shape = f.shape();
    u.uFlame.value.set(f.radius, f.on, shape.air, f.time);
    u.uShape.value.set(shape.width, shape.length, shape.cell, (f.time * FLOW) % (7.7 * f.radius * 64));
    u.uBright.value = f.bright;
    u.uGlowAt.value.copy(u.uNozzle.value).addScaledVector(u.uAxis.value, 8 * f.radius);
    u.uGlow.value.copy(f.light.color).multiplyScalar(f.light.intensity / Math.PI);
  }
  const s = smoke && smoke.now !== null && shown(smoke.mesh) ? smoke : null;
  u.uBlast.value.z = 0;
  u.uNodes.value = 0;
  if (s) {
    const b = s.blast();
    if (b.amount > 0 && s.pad(v)) {
      u.uPad.value.set(v.x - eye.x, v.y - eye.y, v.z - eye.z);
      u.uBlast.value.set(b.radius, b.height, blastSigma(b), b.rise);
    }
    const n = s.nodes(s.now!, nodes);
    const P = u.uNodeP.value,
      Q = u.uNodeQ.value;
    for (let i = 0; i < n; i++) {
      P[i * 4] = nodes[i * 6]! - eye.x;
      P[i * 4 + 1] = nodes[i * 6 + 1]! - eye.y;
      P[i * 4 + 2] = nodes[i * 6 + 2]! - eye.z;
      P[i * 4 + 3] = nodes[i * 6 + 3]!;
      Q[i * 4] = nodes[i * 6 + 4]!;
      Q[i * 4 + 1] = nodes[i * 6 + 5]!;
    }
    u.uNodes.value = n;
  }
}

/** The part of the frame a ball (from the eye, in the camera's frame; radius r) can cover, added to `rect` (x0, y0, x1, y1 in -1 to 1). */
function cover(rect: THREE.Vector4, c: THREE.Vector3, r: number, px: number, py: number): void {
  const d = -c.z;
  if (d + r <= 0) return; // behind the eye
  if (d - r <= 0.01) {
    rect.set(-1, -1, 1, 1);
    return;
  }
  const lo = (a: number) => (a < 0 ? a / (d - r) : a / (d + r)),
    hi = (a: number) => (a > 0 ? a / (d - r) : a / (d + r));
  rect.x = Math.min(rect.x, px * lo(c.x - r));
  rect.y = Math.min(rect.y, py * lo(c.y - r));
  rect.z = Math.max(rect.z, px * hi(c.x + r));
  rect.w = Math.max(rect.w, py * hi(c.y + r));
}

/** What the pass asks of the clouds' pass (clouds.ts `CloudPass`). */
interface Marked {
  readonly mark: { texture: THREE.DepthTexture | null };
  readonly cel: boolean;
}

/**
 * The pass: marches the fire and the smoke and lays them over the frame where it stands. It goes
 * after the ink (so the fire is over the line drawn on what is behind it) and before the clouds,
 * which are told what it covered; the bloom after it takes the fire's light.
 */
export class ExhaustPass extends Pass {
  private readonly quad = new FullScreenQuad();
  private readonly march = raw(VERTEX, MARCH, u);
  private readonly lay = raw(VERTEX, OVER, u);
  private sun: THREE.DirectionalLight | null = null;
  private sky: THREE.HemisphereLight | null = null;
  private readonly turn = new THREE.Matrix4();
  private readonly back = new THREE.Matrix3();
  private readonly rect = new THREE.Vector4();
  private readonly at = new THREE.Vector3();
  private readonly cleared = new THREE.Color();
  private built = false;

  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly clouds: Marked;

  /** `clouds`: the clouds' pass, which marks the scene's depth and knows the look. */
  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, clouds: Marked) {
    super();
    this.scene = scene;
    this.camera = camera;
    this.clouds = clouds;
    this.needsSwap = false;
    this.lay.blending = THREE.CustomBlending;
    this.lay.blendSrc = THREE.OneFactor;
    this.lay.blendDst = THREE.OneMinusSrcAlphaFactor;
    this.lay.blendSrcAlpha = THREE.ZeroFactor;
    this.lay.blendDstAlpha = THREE.OneFactor;
    this.lay.transparent = true;
  }

  render(renderer: THREE.WebGLRenderer, _write: THREE.WebGLRenderTarget, frame: THREE.WebGLRenderTarget): void {
    u.uRect.value.set(0, 0, 0, 0);
    const burning = !!flame && shown(flame.mesh) && flame.on > 0.001;
    const smoking = !!smoke && smoke.now !== null && shown(smoke.mesh);
    const depth = this.clouds.mark.texture;
    if (!depth) return;
    if (!burning && !smoking) {
      // Before anyone is looking (Stage.warm shows the fire and the trail for a frame, with nothing burning) the
      // shaders are built, on one pixel: not at liftoff, in front of everyone.
      if (!this.built && ((flame && shown(flame.mesh)) || (smoke && shown(smoke.mesh)))) {
        this.built = true;
        place(this.camera);
        this.draw(renderer, frame, depth, new THREE.Vector4(-1, -1, -1, -1));
        u.uRect.value.set(0, 0, 0, 0);
      }
      return;
    }
    const camera = this.camera;
    place(camera);
    this.light();

    // the part of the frame they can be in
    const rect = this.rect.set(2, 2, -2, -2);
    const back = this.back.setFromMatrix4(this.turn.extractRotation(camera.matrixWorld)).transpose();
    const px = camera.projectionMatrix.elements[0]!,
      py = camera.projectionMatrix.elements[5]!;
    const ball = (p: THREE.Vector3, r: number) => cover(rect, this.at.copy(p).applyMatrix3(back), r, px, py);
    if (u.uFlame.value.y > 0) {
      const R = u.uFlame.value.x,
        shape = u.uShape.value;
      const half = 0.5 * shape.y * R;
      ball(v.copy(u.uNozzle.value).addScaledVector(u.uAxis.value, half), half + 1.3 * R * (shape.x + 0.05 * shape.y));
    }
    if (u.uBlast.value.z > 0) ball(v.copy(u.uPad.value), 1.3 * u.uBlast.value.x + 1.2 * u.uBlast.value.y);
    const P = u.uNodeP.value,
      Q = u.uNodeQ.value;
    for (let i = 0; i < u.uNodes.value; i++)
      if (Q[i * 4]! > 0 || Q[Math.max(i - 1, 0) * 4]! > 0 || Q[Math.min(i + 1, u.uNodes.value - 1) * 4]! > 0)
        ball(v.set(P[i * 4]!, P[i * 4 + 1]!, P[i * 4 + 2]!), P[i * 4 + 3]!);
    rect.set(Math.max(rect.x, -1), Math.max(rect.y, -1), Math.min(rect.z, 1), Math.min(rect.w, 1));
    if (rect.z <= rect.x || rect.w <= rect.y) return;
    this.built = true;
    this.draw(renderer, frame, depth, rect);
  }

  /** March what is in `rect` of the frame (-1 to 1) and lay it over the frame there. */
  private draw(renderer: THREE.WebGLRenderer, frame: THREE.WebGLRenderTarget, depth: THREE.DepthTexture, rect: THREE.Vector4): void {
    const camera = this.camera;
    // half the window's size each way in CSS pixels, as the clouds are marched
    const step = 2 * Math.max(1, renderer.getPixelRatio());
    const w = Math.max(1, Math.ceil(frame.width / step)),
      h = Math.max(1, Math.ceil(frame.height / step));
    if (w !== low.width || h !== low.height) low.setSize(w, h);
    u.uLow.value.set(w, h);
    u.uFrame.value.set(frame.width, frame.height);
    u.tDepth.value = depth;
    u.uProjInv.value.copy(camera.projectionMatrixInverse);
    u.uRange.value.set(camera.near, camera.far);
    u.uTurn.value.setFromMatrix4(this.turn.extractRotation(camera.matrixWorld));
    u.uGrain.value = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / h;
    u.uCel.value = Number(this.clouds.cel);
    // whole low pixels, and one more all round for the frame's pixels on the edge to blend with
    const x0 = Math.max(0, Math.floor((rect.x * 0.5 + 0.5) * w) - 1),
      y0 = Math.max(0, Math.floor((rect.y * 0.5 + 0.5) * h) - 1),
      x1 = Math.min(w, Math.ceil((rect.z * 0.5 + 0.5) * w) + 1),
      y1 = Math.min(h, Math.ceil((rect.w * 0.5 + 0.5) * h) + 1);
    const clear = renderer.getClearColor(this.cleared),
      alpha = renderer.getClearAlpha(),
      auto = renderer.autoClear;
    low.scissorTest = true;
    low.scissor.set(x0, y0, x1 - x0, y1 - y0);
    renderer.setRenderTarget(low);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, false, false);
    renderer.autoClear = false;
    this.quad.material = this.march;
    this.quad.render(renderer);
    renderer.setClearColor(clear, alpha);

    // over the frame as it stands, in place, inside the low pixels marched
    // (the depth is the scene's still: it need not be resolved out of the multisampled buffer again)
    const fx0 = Math.ceil(((x0 + 0.5) / w) * frame.width),
      fy0 = Math.ceil(((y0 + 0.5) / h) * frame.height),
      fx1 = Math.floor(((x1 - 0.5) / w) * frame.width),
      fy1 = Math.floor(((y1 - 0.5) / h) * frame.height);
    u.uRect.value.set(fx0 / frame.width, fy0 / frame.height, fx1 / frame.width, fy1 / frame.height);
    const resolve = frame.resolveDepthBuffer,
      test = frame.scissorTest;
    const was = frame.scissor.clone();
    frame.resolveDepthBuffer = false;
    frame.scissorTest = true;
    frame.scissor.set(fx0, fy0, Math.max(fx1 - fx0, 0), Math.max(fy1 - fy0, 0));
    renderer.setRenderTarget(frame);
    this.quad.material = this.lay;
    this.quad.render(renderer);
    frame.scissorTest = test;
    frame.scissor.copy(was);
    renderer.setRenderTarget(frame); // (with the whole frame open again for whoever draws next)
    frame.resolveDepthBuffer = resolve;
    renderer.autoClear = auto;
  }

  /** The scene's light, as the clouds take it (clouds.ts `light`): its Sun or Moon, its sky, what the ground sends up, the haze. */
  private light(): void {
    if (!this.sun || !this.sky)
      this.scene.traverse((o) => {
        if ((o as THREE.DirectionalLight).isDirectionalLight && !this.sun) this.sun = o as THREE.DirectionalLight;
        if ((o as THREE.HemisphereLight).isHemisphereLight && !this.sky) this.sky = o as THREE.HemisphereLight;
      });
    if (this.sun) {
      u.uSun.value.subVectors(this.sun.position, this.sun.target.position).normalize();
      u.uSunLight.value.copy(this.sun.color).multiplyScalar(this.sun.intensity / Math.PI);
      const c = u.uSunLight.value;
      daylight = THREE.MathUtils.smoothstep(0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b, 0.02, 0.25);
    }
    if (this.sky) {
      u.uSkyLight.value.copy(this.sky.color).multiplyScalar(this.sky.intensity);
      u.uGroundLight.value.copy(this.sky.groundColor).multiplyScalar(this.sky.intensity);
    }
    const fog = this.scene.fog as THREE.FogExp2 | null;
    const air = installedAir();
    if (fog && air) {
      u.uHaze.value.copy(fog.color);
      u.uAir.value.set(fog.density, air.scale, eye.y - air.base);
    } else u.uAir.value.set(0, 1400, 0);
  }

  dispose(): void {
    low.dispose();
    u.tNoise.value?.dispose();
    this.quad.dispose();
    this.march.dispose();
    this.lay.dispose();
  }
}

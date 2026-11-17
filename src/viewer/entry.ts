import * as THREE from 'three';
import { FADE_DITHER } from './glsl.ts';

/**
 * What the air's heat looks like (sim/heating.ts works out how much there is): a surface hot
 * enough to glow, the glowing gas round a blunt body coming down, and, going up through the speed
 * of sound in damp air, the collar of cloud the vehicle wears for a few seconds. Each is drawn from
 * a simulator's own numbers; how each looks is a drawing (`estimated`), and says how it is scaled.
 * Nothing here knows a flight: effects.ts hands these the surfaces and nodes a flight names.
 *
 * Incandescence. A surface at T kelvin glows the colour of a black body at T: Planck's law seen
 * through the CIE 1931 observer (the analytic fit of Wyman, Sloan and Shirley, 2013) in linear
 * sRGB, so 1,000 K is a deep red, 1,500 K orange, 2,500 K yellow and 6,500 K white. Its true
 * brightness runs over ten powers of ten between 800 K and 3,000 K, which no screen has, so it is
 * drawn as the eye takes it, as the 0.24th power of the luminance: 0.15 of a sunlit white at
 * 1,000 K, 1 at 1,500 K, 3 at 2,500 K (and the bloom takes what is over 1). At 800 K, where a
 * glow can first be seen in the dark, it is 0.03; at 600 K nothing. That curve is a judgement.
 *
 * The shock layer. Air stopped against a blunt face is hot enough to glow. It is drawn as a volume
 * of light: a thin cap standing off the face (0.14 of the body's radius, which is about where the
 * shock stands off a blunt body at high Mach number), a sheet shed from the shoulder that closes
 * to a neck a little behind the body's end, and a core streaming back from there. Rays are marched
 * through it from the eye and are absorbed by the body: the march cannot see the model, so it has the
 * body's profile, read once from the model's own skin (`profileOf`: a sphere is a sphere, and an
 * aerial is not body), and a ray is dimmed through a thin shell under it rather than stopped dead at
 * it, so where the profile stands off the hull the edge of what it hides is soft (`inside`). The light fades to nothing inside the box it is marched in, and the box is
 * drawn over the whole screen when the eye is in it or near it, so that neither the box's walls
 * nor the near plane is ever seen as an edge (GitHub issue #33). Its colour is a black body's at the gas's temperature (sim/heating.ts
 * `shockTemperature`); its brightness is the stagnation-point heat flux over 250 kW/m2, in the
 * scene's linear light, times how squarely the blunt end meets the air. So Mercury-Redstone's
 * 79 kW/m2 at 2.3 km/s is a faint orange wake at a third, a Mercury coming back from orbit (some
 * 700 kW/m2) is three times a sunlit white and blooms, and an Apollo from the Moon blazes. There is
 * no measurement of the glow's brightness behind that: it is a drawing scaled by the heating.
 *
 * The collar. Where the flow speeds up round a shoulder near Mach 1 the air cools, and in damp air
 * its water condenses into a cone of cloud that ends at the shock behind it. Drawn as a soft shell
 * flaring back from the node the flight names, for Mach 0.92 to 1.08, and only low down where the
 * air holds water: all of it under 3 km, none over 10 km (a judgement: the day's humidity aloft is
 * not in the record).
 */

const H = 6.626_070_15e-34;
const C = 2.997_924_58e8;
const KB = 1.380_649e-23;

/** One lobe of the fit to a colour-matching function: a Gaussian with a different width each side. */
const lobe = (nm: number, mid: number, below: number, above: number): number => {
  const d = (nm - mid) / (nm < mid ? below : above);
  return Math.exp(-0.5 * d * d);
};

/** A black body at `kelvin`: its colour in linear sRGB with the largest part 1, and its luminance in cd/m2. */
export function blackbody(kelvin: number): { r: number; g: number; b: number; luminance: number } {
  if (!(kelvin > 0)) return { r: 0, g: 0, b: 0, luminance: 0 };
  let x = 0;
  let y = 0;
  let z = 0;
  for (let nm = 380; nm <= 780; nm += 10) {
    const m = nm * 1e-9;
    const radiance = (2 * H * C * C) / m ** 5 / Math.expm1((H * C) / (m * KB * kelvin)); // W / (m2 sr m)
    x += radiance * (1.056 * lobe(nm, 599.8, 37.9, 31.0) + 0.362 * lobe(nm, 442.0, 16.0, 26.7) - 0.065 * lobe(nm, 501.1, 20.4, 26.2));
    y += radiance * (0.821 * lobe(nm, 568.8, 46.9, 40.5) + 0.286 * lobe(nm, 530.9, 16.3, 31.1));
    z += radiance * (1.217 * lobe(nm, 437.0, 11.8, 36.0) + 0.681 * lobe(nm, 459.0, 26.0, 13.8));
  }
  const r = Math.max(0, 3.2406 * x - 1.5372 * y - 0.4986 * z);
  const g = Math.max(0, -0.9689 * x + 1.8758 * y + 0.0415 * z);
  const b = Math.max(0, 0.0557 * x - 0.204 * y + 1.057 * z);
  const most = Math.max(r, g, b);
  if (!(most > 0)) return { r: 0, g: 0, b: 0, luminance: 0 };
  return { r: r / most, g: g / most, b: b / most, luminance: 683 * y * 10e-9 };
}

const L1000 = blackbody(1000).luminance;
/** How bright a surface at `kelvin` is drawn, in the scene's linear light (1 is a sunlit white): see the header. */
export function glowOf(kelvin: number): number {
  if (kelvin < 500) return 0;
  const drawn = 0.15 * (blackbody(kelvin).luminance / L1000) ** 0.24;
  return drawn < 0.004 ? 0 : drawn;
}

/** The heat flux, W/m2, at which the shock layer is drawn as bright as a sunlit white. */
export const GLOW_FLUX = 250_000;
/** How bright the shock layer is drawn for a stagnation-point heat flux, W/m2, with the blunt end `blunt` (0 to 1) to the air. */
export function wakeOf(flux: number, blunt: number): number {
  const drawn = (Math.max(0, flux) / GLOW_FLUX) * Math.max(0, Math.min(1, blunt)) ** 2;
  return drawn < 0.01 ? 0 : drawn;
}

/** How much of the collar there is at a Mach number and a height above the sea, m: 0 to 1. */
export function collarOf(mach: number, altitude: number): number {
  const near = Math.exp(-(((mach - 1) / 0.05) ** 2));
  const damp = 1 - THREE.MathUtils.smoothstep(altitude, 3000, 10_000);
  const drawn = near * damp;
  return drawn < 0.02 ? 0 : drawn;
}

/**
 * Surfaces that glow: every mesh under a root whose material bears one of a surface's names takes
 * an emissive colour from that surface's temperature, on the real material and on its cel twin
 * (look.ts keeps the real one in `userData.real` and puts whichever is in force on the mesh), and
 * has its own back when it has cooled.
 */
export class Incandescence {
  private readonly names: readonly (readonly string[])[];
  private meshes: THREE.Mesh[][] = [];
  private readonly own = new Map<THREE.Material, { colour: THREE.Color; intensity: number }>();
  private readonly lit: number[];
  private found: THREE.Object3D | null = null;
  private count = -1;

  /** `names[i]`: the material names of surface `i`. */
  constructor(names: readonly (readonly string[])[]) {
    this.names = names;
    this.lit = names.map(() => 0);
  }

  /** The meshes of each surface under `root`, looked for again when what is under it has changed (levels of detail arrive one by one). */
  private find(root: THREE.Object3D): void {
    let count = 0;
    root.traverse(() => void count++);
    if (root === this.found && count === this.count) return;
    this.found = root;
    this.count = count;
    this.meshes = this.names.map(() => []);
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || Array.isArray(mesh.material)) return;
      const name = ((mesh.userData.real as THREE.Material | undefined) ?? mesh.material).name;
      this.names.forEach((names, i) => {
        if (names.includes(name)) this.meshes[i]!.push(mesh);
      });
    });
  }

  /**
   * Show each surface at its temperature, K. `dim` scales the glow against the scene's exposure
   * (as the engine's fire is: plume.ts), so it is not a white blot by night. True if anything on
   * screen changed.
   */
  set(root: THREE.Object3D, kelvin: readonly number[], dim = 1): boolean {
    const glows = kelvin.map((k) => glowOf(k) * dim);
    if (!glows.some((g, i) => g > 0 || this.lit[i]! > 0)) return false;
    this.find(root);
    let changed = false;
    glows.forEach((glow, i) => {
      // (written every time while it glows: the look in force may have put another material on the mesh since)
      if (glow <= 0 && this.lit[i]! <= 0) return;
      if (Math.abs(glow - this.lit[i]!) > 1e-4) changed = true;
      this.lit[i] = glow;
      const hue = blackbody(kelvin[i]!);
      for (const mesh of this.meshes[i]!) {
        for (const material of new Set([mesh.material as THREE.Material, mesh.userData.real as THREE.Material | undefined])) {
          const m = material as THREE.MeshStandardMaterial | undefined;
          if (!m?.emissive) continue;
          if (!this.own.has(m)) this.own.set(m, { colour: m.emissive.clone(), intensity: m.emissiveIntensity });
          const own = this.own.get(m)!;
          if (glow > 0) {
            m.emissive.setRGB(hue.r, hue.g, hue.b);
            m.emissiveIntensity = glow;
          } else {
            m.emissive.copy(own.colour);
            m.emissiveIntensity = own.intensity;
          }
        }
      }
    });
    return changed;
  }
}

/** How many stations along the body its profile is taken at (`profileOf`). */
export const RINGS = 48;
/** How much skin a station must have at a radius to be body there: this share of a whole ring at that radius. */
const SOLID = 0.5;
/** The profile's radii are read in steps of this many of the body's radii, out to RADIAL of them. */
const RADIAL_STEP = 0.02;
const RADIAL = 3;
/** A body is never thinner than this, radii: less is a bundle of aerials or wires. */
const THIN = 0.25;

/** The body as the march stops at it: how far out its skin stands at each station along its axis, in its radii. */
export interface Profile {
  /** The skin's radius at each of RINGS stations, the first at `from`, `step` apart (radii along the axis from the face); 0 where there is no body. */
  rings: Float32Array;
  from: number;
  step: number;
  /** Where along the axis it is widest (the shoulder the sheet is shed from), and where its last station with body ends: radii from the face. */
  shoulder: number;
  end: number;
}

/**
 * A body's profile from its surface (`triangles`: nine numbers to a triangle, in its radii, its axis +y back from the
 * face's middle, which is the origin), over `length` radii behind the face. At each station it is the largest radius at
 * which the skin there would make at least half a ring (`SOLID`): the hull and the heat shield are body, and so is
 * whatever is closed round the axis; a whip aerial, a rod or a wire, which has next to no skin, is not; and what is
 * inside the skin (the cabin) is never reached. Each triangle is read at points spread over it (a long shingle of a
 * cone lies across many stations), each point carrying its share of the area. `weight` multiplies every area (a
 * caller that read only every n-th triangle gives n).
 */
export function profileOf(triangles: ArrayLike<number>, length: number, weight = 1): Profile {
  const from = -0.1;
  const step = (Math.max(length, 0.5) + 0.2 - from) / RINGS;
  const radial = Math.round(RADIAL / RADIAL_STEP);
  const area = new Float64Array(RINGS * radial);
  const put = (x: number, y: number, z: number, a: number): void => {
    const k = Math.floor((y - from) / step);
    if (k < 0 || k >= RINGS) return;
    const b = Math.min(radial - 1, Math.floor(Math.hypot(x, z) / RADIAL_STEP));
    area[k * radial + b]! += a;
  };
  // each triangle is halved across its longest side until none is longer than half a station, and each piece read at
  // its middle with its area: a long shingle of a cone lies across many stations, and is in each of them
  const most = 0.5 * Math.min(step, 4 * RADIAL_STEP);
  let stack = new Float64Array(9 * 64);
  for (let t = 0; t + 8 < triangles.length; t += 9) {
    for (let i = 0; i < 9; i++) stack[i] = triangles[t + i]!;
    let top = 9;
    while (top) {
      top -= 9;
      const o = top;
      const ab = Math.hypot(stack[o + 3]! - stack[o]!, stack[o + 4]! - stack[o + 1]!, stack[o + 5]! - stack[o + 2]!);
      const bc = Math.hypot(stack[o + 6]! - stack[o + 3]!, stack[o + 7]! - stack[o + 4]!, stack[o + 8]! - stack[o + 5]!);
      const ca = Math.hypot(stack[o]! - stack[o + 6]!, stack[o + 1]! - stack[o + 7]!, stack[o + 2]! - stack[o + 8]!);
      const longest = Math.max(ab, bc, ca);
      if (longest > most) {
        // (the corners taken so the longest side runs from p to q, and cut at its middle into two)
        const [p, q, r] = ab === longest ? [0, 3, 6] : bc === longest ? [3, 6, 0] : [6, 0, 3];
        if (stack.length < top + 18) {
          const more = new Float64Array(stack.length * 2);
          more.set(stack);
          stack = more;
        }
        const c = stack.slice(o, o + 9);
        for (let i = 0; i < 3; i++) {
          const m = 0.5 * (c[p + i]! + c[q + i]!);
          stack[top + i] = c[p + i]!;
          stack[top + 3 + i] = m;
          stack[top + 6 + i] = c[r + i]!;
          stack[top + 9 + i] = m;
          stack[top + 12 + i] = c[q + i]!;
          stack[top + 15 + i] = c[r + i]!;
        }
        top += 18;
        continue;
      }
      const ux = stack[o + 3]! - stack[o]!,
        uy = stack[o + 4]! - stack[o + 1]!,
        uz = stack[o + 5]! - stack[o + 2]!,
        vx = stack[o + 6]! - stack[o]!,
        vy = stack[o + 7]! - stack[o + 1]!,
        vz = stack[o + 8]! - stack[o + 2]!;
      const share = 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) * weight;
      if (share > 0)
        put(
          (stack[o]! + stack[o + 3]! + stack[o + 6]!) / 3,
          (stack[o + 1]! + stack[o + 4]! + stack[o + 7]!) / 3,
          (stack[o + 2]! + stack[o + 5]! + stack[o + 8]!) / 3,
          share,
        );
    }
  }
  const rings = new Float32Array(RINGS);
  for (let k = 0; k < RINGS; k++) {
    let held = 0;
    for (let b = radial - 1; b >= 0; b--) {
      held += area[k * radial + b]!;
      const r = (b + 0.5) * RADIAL_STEP;
      // (half a ring's skin at this radius over the station's length, and never less than half a ring of a quarter of
      // the radius: a flat face across the axis has it many times over, a bundle of aerials near the axis has not)
      if (held >= SOLID * 2 * Math.PI * Math.max(r, THIN) * step) {
        rings[k] = r < THIN / 2 ? 0 : r;
        break;
      }
    }
  }
  return shaped(rings, from, step);
}

/** A profile's shoulder and end, from its rings. */
function shaped(rings: Float32Array, from: number, step: number): Profile {
  let widest = 0;
  for (const r of rings) widest = Math.max(widest, r);
  // (the shoulder the middle of the stations within 2 per cent of the widest: a sphere is widest at its equator)
  let at = 0;
  let wide = 0;
  let end = 0;
  rings.forEach((r, k) => {
    if (widest > 0 && r >= 0.98 * widest) {
      at += from + (k + 0.5) * step;
      wide++;
    }
    if (r > 0) end = from + (k + 1) * step;
  });
  const shoulder = wide ? Math.max(at / wide, 0) : 0;
  return { rings, from, step, shoulder, end: Math.max(end, shoulder) };
}

/**
 * The body as `fit` describes it, before its own surface has been read (`ShockGlow.place`): a blunt face whose rim is
 * `depth` radii behind its middle (a paraboloid), then a cone narrowing evenly to 0.45 of the radius at `length`.
 */
export function profileFit(depth: number, length: number): Profile {
  const from = -0.1;
  const end = Math.max(depth + 0.5, length);
  const step = (end + 0.2 - from) / RINGS;
  const rings = new Float32Array(RINGS);
  for (let k = 0; k < RINGS; k++) {
    const y = from + (k + 0.5) * step;
    rings[k] =
      y < 0 || y > end
        ? 0
        : y < depth
          ? Math.sqrt(y / Math.max(depth, 1e-3))
          : 1 + (0.45 - 1) * ((y - depth) / Math.max(end - depth, 1e-3));
  }
  return { rings, from, step, shoulder: depth, end };
}

const VOLUME_VERT = /* glsl */ `
  uniform vec3 uHalf, uMid;
  uniform float uWhole;
  varying vec3 vAt, vEye;
  void main() {
    // in the volume's own frame, metres: +Y is downstream, the origin where the body meets the air first
    mat4 toBox = inverse(modelViewMatrix);
    vEye = (toBox * vec4(0.0, 0.0, 0.0, 1.0)).xyz * uHalf + uMid;
    if (uWhole > 0.5) {
      // The eye is in the box, or near enough to it that the near plane would cut its walls (a hole with straight edges
      // in the glow: #33). So it is drawn over the whole screen instead: the box's face toward -Z spread over it and the
      // other five drawn to nothing, each pixel looking along its own ray (the march finds where that ray is in the box).
      if (normal.z > -0.5) {
        gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
        vAt = vEye;
        return;
      }
      vec4 view = inverse(projectionMatrix) * vec4(position.xy, 0.0, 1.0);
      vAt = (toBox * vec4(view.xyz / view.w, 1.0)).xyz * uHalf + uMid;
      gl_Position = vec4(position.xy, 0.0, 1.0);
      return;
    }
    vAt = position * uHalf + uMid;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

/** How deep the body's shell is, radii, over which a ray is absorbed rather than stopped dead (`inside`): chosen, a few pixels at the chase view's nearest. */
const SHELL = 0.06;
/** How much a step's march under the shell takes of the light behind it: each step of 0.04 radii fully inside keeps exp(-OPAQUE * 0.04). Chosen: gone within a few steps. */
const OPAQUE = 60;

const VOLUME_FRAG = /* glsl */ `
  uniform vec3 uHalf, uMid, uGas, uFront;
  uniform float uR, uGlow, uTime, uCap, uTop, uLong;
  uniform float uRing[${RINGS}];
  uniform vec2 uRingAt;
  uniform mat3 uToBody;
  uniform vec3 uBodyAt;
  uniform mat4 uToClip;
  varying vec3 vAt, vEye;
  const int STEPS = 160;
  // lengths below are in radii of the body: y downstream from where it meets the air first, r from the axis through there
  // How far out the body's skin stands at y along its own axis (0: none there): its profile, read from the model (profileOf)
  float skin(float y) {
    float f = (y - uRingAt.x) / uRingAt.y - 0.5;
    if (f < -0.5 || f > ${(RINGS - 0.5).toFixed(1)}) return 0.0;
    int i = int(clamp(floor(f), 0.0, ${(RINGS - 1).toFixed(1)}));
    return mix(uRing[i], uRing[min(i + 1, ${RINGS - 1})], clamp(f - float(i), 0.0, 1.0));
  }
  // Is a point (radii, the volume's frame) inside the body? The body lies along its own axis, which the stream need not
  // (uToBody turns the one into the other), and its frame's origin is the middle of its face, which the volume's is only
  // when it comes down face first (uBodyAt: the volume's origin in the body's frame).
  // How far into the body a point is: 0 outside its skin, rising through a shell SHELL radii deep to 1 under it. The
  // stand-in is the body's profile, not its mesh, and stands a little off it here and there (where a band or a strap is
  // counted as skin): a ray stopped dead at it cut off all the light behind the body in a hard line a few pixels outside
  // the hull (Vostok 2's sphere over its instrument module, from beside: test:glow). Absorbed through the shell, a ray
  // that grazes it loses only what its chord through the shell takes, so the edge of what the body hides is soft; the
  // hull itself, drawn in front, still hides what is behind it.
  float inside(vec3 p) {
    vec3 b = uToBody * p + uBodyAt;
    float s = skin(b.y);
    return s > 0.0 ? 1.0 - smoothstep(s - ${SHELL.toFixed(3)}, s, length(b.xz)) : 0.0;
  }
  vec3 light(float y, float r) {
    // the cap: brightest just behind the shock, which stands 0.14 off the face and opens more slowly than it
    float behind = y - (-0.14 + 0.2 * r * r);
    // (squares written out: a power of a negative number is not a number on every GPU, and r - neck is negative inside the neck)
    float capR = r * r / 1.69;
    float cap = smoothstep(0.0, 0.035, behind) * exp(-6.0 * max(behind, 0.0)) * exp(-capR * capR);
    // the wake: a sheet from the shoulder closing to a neck, then a core streaming back
    float aft = y - uCap;
    float end = uTop - uCap + 0.8;                       // the neck: a little behind the body's end
    float neck = mix(1.04, 0.45, smoothstep(0.0, end, aft)) + 0.035 * max(aft - end, 0.0);
    float width = 0.06 + 0.035 * max(aft, 0.0);
    float sheetR = (r - neck) / width;
    float sheet = smoothstep(-0.2, 0.2, aft) * exp(-sheetR * sheetR) * exp(-max(aft, 0.0) / 2.2);
    float coreR = r / max(0.34 + 0.045 * aft, 0.05);
    float core = smoothstep(end - 1.1, end + 1.0, aft) * exp(-coreR * coreR) * exp(-max(aft - end, 0.0) / max(uLong, 1e-3));
    float runs = 1.0 + 0.14 * sin(aft * 4.0 - uTime * 26.0) * smoothstep(1.0, 4.0, aft);   // it streams: the clock's time, not the wall's
    return uFront * (3.2 * cap) + uGas * ((0.2 * sheet + 1.5 * core) * runs);
  }
  // The light goes to nothing before the box's side walls and its far end, so that no wall of the box is ever seen as
  // an edge where the light is cut off (#33): out from the axis, and down the stream over its last quarter.
  float within(vec3 p) {
    float wall = uHalf.x / uR, far = (uMid.y + uHalf.y) / uR;
    return (1.0 - smoothstep(0.6 * wall, 0.95 * wall, length(p.xz))) * (1.0 - smoothstep(0.75 * far, 0.97 * far, p.y));
  }
  void main() {
    vec3 dir = vAt - vEye;
    if (dot(dir, dir) < 1e-12) discard;       // (the eye on the wall itself: no direction to march along)
    dir = normalize(dir);
    // (a ray along a wall divides nothing by nothing where it starts on that wall: lean it off by a hair)
    dir = mix(dir, vec3(1e-7), vec3(lessThan(abs(dir), vec3(1e-7))));
    // where the ray is inside the box
    vec3 lo = (uMid - uHalf - vEye) / dir, hi = (uMid + uHalf - vEye) / dir;
    vec3 a = min(lo, hi), b = max(lo, hi);
    float t0 = max(max(a.x, a.y), max(a.z, 0.0)), t1 = min(b.x, min(b.y, b.z));
    if (t1 <= t0) discard;
    // Steps fine near the body, where the shock layer is a few hundredths of a radius thick, and longer down the wake,
    // where nothing changes over less than a radius; each pixel's begun a share of a step on from the next pixel's (a
    // fixed pattern, the same every frame), so the steps do not line up across the screen into rings.
    float t = t0 + ${FADE_DITHER} * 0.04 * uR;
    vec3 sum = vec3(0.0);
    float first = -1.0;
    float through = 1.0;                       // how much of the light from here on reaches the eye past the body
    for (int i = 0; i < STEPS; i++) {
      if (t >= t1) break;
      vec3 p = (vEye + dir * t) / uR;
      float body = inside(p);
      if (body > 0.0) {
        // (the body is in the way of everything behind it: absorbed through its shell, gone once well inside)
        through *= exp(-${OPAQUE.toFixed(1)} * body * 0.04);
        if (through < 0.004) break;
      }
      float r = length(p.xz);
      // how far the point is from the body (its axis, from the face to its end)
      float off = length(vec2(r, max(max(-p.y, p.y - uTop), 0.0)));
      // (and never more than a quarter of the wake's core across, where it is far down the stream)
      float stride = uR * clamp(0.04 + 0.1 * (off - 1.3), 0.04, 0.12 + 0.02 * max(p.y, 0.0));
      vec3 e = light(p.y, r) * within(p);
      if (first < 0.0 && max(e.r, max(e.g, e.b)) > 0.05) first = t;
      sum += through * e * (min(stride, t1 - t) / uR);
      t += stride;
    }
    sum *= uGlow;
    float most = max(sum.r, max(sum.g, sum.b));
    if (!(most >= 0.0) || most > 6.0e4) discard;   // (not a number: never into the frame, where the bloom would spread it)
    // faint light let go over a span, not cut at a level: a cut is an edge
    float kept = smoothstep(0.0005, 0.004, most);
    if (kept <= 0.0) discard;
    sum *= kept;
    most *= kept;
    // (for the clouds' own draw of what has no depth: where the light begins; never the eye itself, which has no depth)
    vec4 clip = uToClip * vec4((vEye + dir * max(first < 0.0 ? t0 : first, 1e-3) - uMid) / uHalf, 1.0);
    gl_FragDepth = clip.w > 0.0 ? clamp(clip.z / clip.w * 0.5 + 0.5, 0.0, 1.0) : 0.0;
    gl_FragColor = vec4(sum, min(0.6, most * 0.8));
  }`;

/** Triangles a body's profile is read from at the most: a finer model is read every n-th triangle (`ShockGlow.place`). */
const PROFILE_TRIANGLES = 20_000;

/** The glowing gas round a blunt body coming down: see the header. */
export class ShockGlow {
  readonly mesh: THREE.Mesh;
  private readonly uniforms: Record<string, THREE.IUniform>;
  /** The body's length behind its face as `fit` was given it, radii: how far back its surface is read. */
  private length = 1;
  /** The model the body's profile was read from, since the last `fit` (null: not yet), and how many nodes were under it then. */
  private profiled: THREE.Object3D | null = null;
  private counted = 0;
  private readonly eye = new THREE.Vector3();
  private readonly toBox = new THREE.Matrix4();
  private readonly turn = new THREE.Quaternion();
  private readonly parentTurn = new THREE.Quaternion();
  private readonly rotation = new THREE.Matrix4();
  private readonly along = new THREE.Vector3();
  /** The body the march stops at (`profile`). */
  private body: Profile = profileFit(0.25, 3.4);

  constructor() {
    this.uniforms = {
      uHalf: { value: new THREE.Vector3(1, 1, 1) },
      uMid: { value: new THREE.Vector3() },
      uR: { value: 1 },
      uGlow: { value: 0 },
      uTime: { value: 0 },
      uCap: { value: 0.25 },
      uTop: { value: 3.4 },
      uLong: { value: 5 },
      uRing: { value: new Float32Array(RINGS) },
      uRingAt: { value: new THREE.Vector2(0, 1) },
      uToBody: { value: new THREE.Matrix3() },
      uBodyAt: { value: new THREE.Vector3() },
      uWhole: { value: 0 },
      uGas: { value: new THREE.Color(1, 0.5, 0.2) },
      uFront: { value: new THREE.Color(1, 0.7, 0.4) },
      uToClip: { value: new THREE.Matrix4() },
    };
    const material = new THREE.ShaderMaterial({
      name: 'shock-glow',
      uniforms: this.uniforms,
      vertexShader: VOLUME_VERT,
      fragmentShader: VOLUME_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide, // the far walls: there whether the eye is outside the box or in it
      // light, added to what is behind it; its alpha is kept apart, for the clouds' draw of what has no depth (how much of it holds against cloud behind)
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    });
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), material);
    this.mesh.name = 'ShockGlow';
    this.mesh.frustumCulled = false;
    this.mesh.raycast = () => {};
    this.mesh.visible = false;
    this.mesh.renderOrder = 4;
    this.mesh.onBeforeRender = (_renderer, _scene, camera) => {
      (this.uniforms.uToClip!.value as THREE.Matrix4).multiplyMatrices(camera.projectionMatrix, this.mesh.modelViewMatrix);
      // the eye in the box's own frame (the box is -1 to 1 each way): drawn over the whole screen while it is in the box
      // or nearer its walls than twice the near plane, which would otherwise cut them
      const eye = this.eye.set(0, 0, 0).applyMatrix4(this.toBox.copy(this.mesh.modelViewMatrix).invert());
      const half = this.uniforms.uHalf!.value as THREE.Vector3;
      const near = 2 * ((camera as THREE.PerspectiveCamera).near ?? 0);
      const close = Math.abs(eye.x) < 1 + near / half.x && Math.abs(eye.y) < 1 + near / half.y && Math.abs(eye.z) < 1 + near / half.z;
      this.uniforms.uWhole!.value = close ? 1 : 0;
    };
    this.profile(profileFit(0.25, 3.4));
  }

  private readonly face = new THREE.Vector3();
  private readonly at = new THREE.Vector3();

  /** Stop the march at a body of this profile, and shed the wake from its shoulder and close it behind its end. */
  private profile(p: Profile): void {
    const u = this.uniforms;
    this.body = p;
    (u.uRing!.value as Float32Array).set(p.rings);
    (u.uRingAt!.value as THREE.Vector2).set(p.from, p.step);
    u.uCap!.value = p.shoulder;
    u.uTop!.value = Math.max(p.end, p.shoulder + 0.5);
  }

  /**
   * The body it stands round, in the model's own frame: `face` the middle of the blunt face,
   * `radius` the body's, `depth` how far the face's rim lies behind its middle and `length` how
   * long the body is behind the face, all metres. Until `place` has read the model's own surface
   * (`profileOf`), the body is taken to narrow evenly to 0.45 of its radius (`profileFit`).
   */
  fit(face: THREE.Vector3, radius: number, depth: number, length: number): void {
    const u = this.uniforms;
    this.face.copy(face);
    u.uR!.value = radius;
    this.length = length / radius;
    this.profile(profileFit(depth / radius, length / radius));
    this.profiled = null;
    const reach = 26 * radius; // how far back the box goes: the core has faded to nothing well before
    (u.uHalf!.value as THREE.Vector3).set(2.4 * radius, (reach + 0.6 * radius) / 2, 2.4 * radius);
    (u.uMid!.value as THREE.Vector3).set(0, (reach - 0.6 * radius) / 2, 0);
    this.mesh.scale.copy(u.uHalf!.value as THREE.Vector3);
  }

  /**
   * The model's surface in the body's frame (its radii, its axis +y from the face's middle), from every mesh of it on
   * show: what a craft has shed is not in it. At most PROFILE_TRIANGLES are read, every n-th of a finer model.
   */
  private surfaceOf(model: THREE.Object3D): { triangles: Float64Array; weight: number } {
    const radius = this.uniforms.uR!.value as number;
    const meshes: THREE.Mesh[] = [];
    let count = 0;
    model.updateWorldMatrix(true, true);
    const shown = (o: THREE.Object3D | null): boolean => !o || o === model || (o.visible && shown(o.parent));
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || (mesh as THREE.InstancedMesh).isInstancedMesh || !mesh.geometry?.getAttribute('position') || !shown(mesh)) return;
      meshes.push(mesh);
      const g = mesh.geometry;
      count += (g.index ? g.index.count : g.getAttribute('position').count) / 3;
    });
    const every = Math.max(1, Math.ceil(count / PROFILE_TRIANGLES));
    const out: number[] = [];
    const into = new THREE.Matrix4().copy(model.matrixWorld).invert();
    const m = new THREE.Matrix4();
    const v = new THREE.Vector3();
    let n = 0;
    for (const mesh of meshes) {
      m.multiplyMatrices(into, mesh.matrixWorld);
      const g = mesh.geometry;
      const position = g.getAttribute('position');
      const index = g.index;
      const triangles = (index ? index.count : position.count) / 3;
      for (let t = 0; t < triangles; t++, n++) {
        if (n % every) continue;
        for (let k = 0; k < 3; k++) {
          v.fromBufferAttribute(position, index ? index.getX(3 * t + k) : 3 * t + k).applyMatrix4(m);
          out.push((v.x - this.face.x) / radius, (v.y - this.face.y) / radius, (v.z - this.face.z) / radius);
        }
      }
    }
    return { triangles: Float64Array.from(out), weight: every };
  }

  /**
   * Stand it on the face of `model` (whose frame `fit` was given the face in), streaming `downstream`: a direction in
   * the frame of the mesh's own parent. The first time after a `fit`, and whenever the model has shed something since,
   * the body's profile is read from the model.
   */
  place(model: THREE.Object3D, downstream: THREE.Vector3): void {
    // (read again when what is under the model has changed: a craft sheds what it lets go into holders of their own, so
    // Vostok 2's instrument module, let go at T+90420, takes its part of the body with it)
    let count = 0;
    model.traverse(() => void count++);
    if (this.profiled !== model || count !== this.counted) {
      const { triangles, weight } = this.surfaceOf(model);
      if (triangles.length) this.profile(profileOf(triangles, this.length, weight));
      this.profiled = model;
      this.counted = count;
    }
    const u = this.uniforms;
    this.mesh.quaternion.setFromUnitVectors(Y, downstream);
    // from the box's frame (the stream's) to the body's own: the model's turn in the box's parent, undone
    const turn = model.getWorldQuaternion(this.turn);
    if (this.mesh.parent) turn.premultiply(this.mesh.parent.getWorldQuaternion(this.parentTurn).invert());
    turn.invert().multiply(this.mesh.quaternion);
    (u.uToBody!.value as THREE.Matrix3).setFromMatrix4(this.rotation.makeRotationFromQuaternion(turn));
    // The shock stands off whatever of the body meets the air first, which is the face only when the body comes down
    // face first: a sphere meets it wherever it is turned, and a craft still joined to what it will shed meets it as the
    // two do. So the box's axis runs down the stream through the point of the body furthest up it, the cap stands off
    // that point, the sheet is shed from the body's shoulder and closes behind its end, all as seen along the stream.
    const d = this.along.set(0, 1, 0).applyQuaternion(turn); // (downstream, in the body's frame)
    const across = Math.hypot(d.x, d.z);
    const { rings, from, step, shoulder } = this.body;
    let front = Number.POSITIVE_INFINITY;
    let back = Number.NEGATIVE_INFINITY;
    let foremost = -1;
    rings.forEach((s, k) => {
      if (!(s > 0)) return;
      const y = from + (k + 0.5) * step;
      if (d.y * y - s * across < front) {
        front = d.y * y - s * across;
        foremost = k;
      }
      back = Math.max(back, d.y * y + s * across);
    });
    const bodyAt = u.uBodyAt!.value as THREE.Vector3;
    if (foremost >= 0) {
      const s = rings[foremost]!;
      // (the foremost point: on its station's ring, on the side the stream comes from)
      bodyAt.set(across > 1e-6 ? (-s * d.x) / across : 0, from + (foremost + 0.5) * step, across > 1e-6 ? (-s * d.z) / across : 0);
      u.uCap!.value = Math.max(d.y * shoulder - front, 0);
      u.uTop!.value = Math.max(back - front, (u.uCap!.value as number) + 0.5);
    } else bodyAt.set(0, 0, 0);
    // the box's origin there, in the model's frame, then in the box's parent's
    this.at
      .copy(bodyAt)
      .multiplyScalar(u.uR!.value as number)
      .add(this.face);
    model.localToWorld(this.at);
    this.mesh.parent?.worldToLocal(this.at);
    // (the box's middle is off its origin along the stream)
    this.mesh.position.copy(this.at).addScaledVector(downstream, (u.uMid!.value as THREE.Vector3).y);
  }

  /**
   * Show it. `glow`: how bright (`wakeOf`); `gas`: the gas's temperature, K; `time`: the clock's,
   * s; `dim` as `Incandescence.set`. True if what is drawn changed.
   */
  set(glow: number, gas: number, time: number, dim = 1): boolean {
    const u = this.uniforms;
    const showing = glow > 0;
    const changed = showing || this.mesh.visible;
    this.mesh.visible = showing;
    if (!showing) return changed;
    u.uGlow!.value = glow * dim;
    u.uTime!.value = time;
    // the core streams further the harder it is heated
    u.uLong!.value = 3 + 4 * Math.min(4, glow);
    const hue = blackbody(gas);
    (u.uGas!.value as THREE.Color).setRGB(hue.r, hue.g, hue.b);
    // the cap is the hottest of it: the same hue, a little paler
    (u.uFront!.value as THREE.Color).setRGB(hue.r, hue.g * 0.8 + 0.2, hue.b * 0.7 + 0.3);
    return true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

const Y = new THREE.Vector3(0, 1, 0);

const COLLAR_RINGS = 14;
const COLLAR_ROUND = 40;

/** The collar of cloud at Mach 1: a shell flaring back from a shoulder, ending at the shock behind it. */
export class Collar {
  readonly mesh: THREE.Mesh;
  private readonly uniforms: Record<string, THREE.IUniform>;

  /** `radius`: the body's at the shoulder, m. The shell hangs from its object's origin along -Y (back down a vehicle flying nose first). */
  constructor(radius: number) {
    const at: number[] = [];
    const index: number[] = [];
    for (let i = 0; i <= COLLAR_RINGS; i++)
      for (let j = 0; j < COLLAR_ROUND; j++) at.push(i / COLLAR_RINGS, (j / COLLAR_ROUND) * Math.PI * 2);
    for (let i = 0; i < COLLAR_RINGS; i++)
      for (let j = 0; j < COLLAR_ROUND; j++) {
        const a = i * COLLAR_ROUND + j;
        const b = i * COLLAR_ROUND + ((j + 1) % COLLAR_ROUND);
        index.push(a, b, a + COLLAR_ROUND, b, b + COLLAR_ROUND, a + COLLAR_ROUND);
      }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('aAt', new THREE.Float32BufferAttribute(at, 2));
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(at.length * 1.5), 3)); // placed by the shader
    geometry.setIndex(index);
    this.uniforms = { uR: { value: radius }, uOn: { value: 0 }, uLight: { value: 1 } };
    this.mesh = new THREE.Mesh(
      geometry,
      new THREE.ShaderMaterial({
        name: 'collar',
        uniforms: this.uniforms,
        vertexShader: /* glsl */ `
          attribute vec2 aAt;
          uniform float uR;
          varying float vT, vF;
          void main() {
            float t = aAt.x, a = aAt.y;
            // from just clear of the skin to two and a half radii out, over three radii of length: a cone, a little bell-mouthed
            float r = uR * (1.12 + 1.4 * t + 0.5 * t * t);
            vec2 c = vec2(cos(a), sin(a));
            vec3 p = vec3(c.x * r, -3.0 * uR * t, c.y * r);
            vec3 n = normalize(vec3(c.x * 3.0, 1.4 + t, c.y * 3.0));
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            vF = abs(dot(normalize(normalMatrix * n), normalize(-mv.xyz)));
            vT = t;
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uOn, uLight;
          varying float vT, vF;
          void main() {
            // thin where it begins, thickest just before the shock cuts it off; seen edge-on it is deeper
            float along = smoothstep(0.0, 0.45, vT) * (1.0 - smoothstep(0.93, 1.0, vT));
            float cover = uOn * along * mix(0.75, 0.3, vF);
            if (cover < 0.004) discard;
            gl_FragColor = vec4(vec3(0.94, 0.96, 1.0) * uLight * cover, cover);
          }`,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
      }),
    );
    this.mesh.name = 'Collar';
    this.mesh.frustumCulled = false;
    this.mesh.raycast = () => {};
    this.mesh.visible = false;
  }

  /** `on`: how much of it there is (`collarOf`); `light`: how bright the day is, 1 in full sun. True if what is drawn changed. */
  set(on: number, light: number): boolean {
    const showing = on > 0;
    const changed = showing || this.mesh.visible;
    this.mesh.visible = showing;
    this.uniforms.uOn!.value = on;
    this.uniforms.uLight!.value = light;
    return changed;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

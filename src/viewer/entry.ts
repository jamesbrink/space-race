import * as THREE from 'three';

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
 * through it from the eye and stop at the body (a cap and a cone: a stand-in for the model, which
 * the march cannot see). Its colour is a black body's at the gas's temperature (sim/heating.ts
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

const VOLUME_VERT = /* glsl */ `
  uniform vec3 uHalf, uMid;
  varying vec3 vAt, vEye;
  void main() {
    // in the volume's own frame, metres: +Y is downstream, the origin the middle of the blunt face
    vAt = position * uHalf + uMid;
    vEye = (inverse(modelViewMatrix) * vec4(0.0, 0.0, 0.0, 1.0)).xyz * uHalf + uMid;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const VOLUME_FRAG = /* glsl */ `
  uniform vec3 uHalf, uMid, uGas, uFront;
  uniform float uR, uGlow, uTime, uCap, uTop, uTopR, uLong;
  uniform mat4 uToClip;
  varying vec3 vAt, vEye;
  const int STEPS = 72;
  // lengths below are in radii of the body: y downstream from the middle of the face, r from the axis
  bool inside(float y, float r) {
    float side = mix(1.0, uTopR, clamp((y - uCap) / max(uTop - uCap, 1e-3), 0.0, 1.0));
    return y > uCap * r * r && y < uTop && r < side;
  }
  vec3 light(float y, float r) {
    // the cap: brightest just behind the shock, which stands 0.14 off the face and opens more slowly than it
    float behind = y - (-0.14 + 0.2 * r * r);
    float cap = smoothstep(0.0, 0.035, behind) * exp(-6.0 * max(behind, 0.0)) * exp(-pow(r / 1.3, 4.0));
    // the wake: a sheet from the shoulder closing to a neck, then a core streaming back
    float aft = y - uCap;
    float end = uTop - uCap + 0.8;                       // the neck: a little behind the body's end
    float neck = mix(1.04, 0.45, smoothstep(0.0, end, aft)) + 0.035 * max(aft - end, 0.0);
    float width = 0.06 + 0.035 * max(aft, 0.0);
    float sheet = step(0.0, aft) * exp(-pow((r - neck) / width, 2.0)) * exp(-aft / 2.2);
    float core = smoothstep(end - 1.1, end + 1.0, aft) * exp(-pow(r / (0.34 + 0.045 * aft), 2.0)) * exp(-max(aft - end, 0.0) / uLong);
    float runs = 1.0 + 0.14 * sin(aft * 4.0 - uTime * 26.0) * smoothstep(1.0, 4.0, aft);   // it streams: the clock's time, not the wall's
    return uFront * (3.2 * cap) + uGas * ((0.2 * sheet + 1.5 * core) * runs);
  }
  void main() {
    vec3 dir = normalize(vAt - vEye);
    // where the ray is inside the box
    vec3 lo = (uMid - uHalf - vEye) / dir, hi = (uMid + uHalf - vEye) / dir;
    vec3 a = min(lo, hi), b = max(lo, hi);
    float t0 = max(max(a.x, a.y), max(a.z, 0.0)), t1 = min(b.x, min(b.y, b.z));
    if (t1 <= t0) discard;
    float dt = (t1 - t0) / float(STEPS);
    vec3 sum = vec3(0.0);
    float first = -1.0;
    for (int i = 0; i < STEPS; i++) {
      float t = t0 + (float(i) + 0.5) * dt;
      vec3 p = (vEye + dir * t) / uR;
      float r = length(p.xz);
      if (inside(p.y, r)) break;                // the body is in the way of everything behind it
      vec3 e = light(p.y, r);
      if (first < 0.0 && max(e.r, max(e.g, e.b)) > 0.05) first = t;
      sum += e * (dt / uR);
    }
    sum *= uGlow;
    float most = max(sum.r, max(sum.g, sum.b));
    if (most < 0.002) discard;
    // (for the clouds' own draw of what has no depth: where the light begins)
    vec4 clip = uToClip * vec4((vEye + dir * (first < 0.0 ? t0 : first) - uMid) / uHalf, 1.0);
    gl_FragDepth = clamp(clip.z / clip.w * 0.5 + 0.5, 0.0, 1.0);
    gl_FragColor = vec4(sum, min(0.6, most * 0.8));
  }`;

/** The glowing gas round a blunt body coming down: see the header. */
export class ShockGlow {
  readonly mesh: THREE.Mesh;
  private readonly uniforms: Record<string, THREE.IUniform>;

  constructor() {
    this.uniforms = {
      uHalf: { value: new THREE.Vector3(1, 1, 1) },
      uMid: { value: new THREE.Vector3() },
      uR: { value: 1 },
      uGlow: { value: 0 },
      uTime: { value: 0 },
      uCap: { value: 0.25 },
      uTop: { value: 3.4 },
      uTopR: { value: 0.45 },
      uLong: { value: 5 },
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
    };
  }

  private readonly face = new THREE.Vector3();
  private readonly at = new THREE.Vector3();

  /** The middle of the blunt face, as `fit` was given it. */
  get faceAt(): THREE.Vector3 {
    return this.face.clone();
  }

  /**
   * The body it stands round, in the model's own frame: `face` the middle of the blunt face,
   * `radius` the body's, `depth` how far the face's rim lies behind its middle and `length` how
   * long the body is behind the face, all metres. The body is taken to narrow evenly to 0.45
   * of its radius.
   */
  fit(face: THREE.Vector3, radius: number, depth: number, length: number): void {
    const u = this.uniforms;
    this.face.copy(face);
    u.uR!.value = radius;
    u.uCap!.value = depth / radius;
    u.uTop!.value = Math.max(depth / radius + 0.5, length / radius);
    const reach = 26 * radius; // how far back the box goes: the core has faded to nothing well before
    (u.uHalf!.value as THREE.Vector3).set(2.4 * radius, (reach + 0.6 * radius) / 2, 2.4 * radius);
    (u.uMid!.value as THREE.Vector3).set(0, (reach - 0.6 * radius) / 2, 0);
    this.mesh.scale.copy(u.uHalf!.value as THREE.Vector3);
  }

  /** Stand it on the face of `model` (whose frame `fit` was given the face in), streaming `downstream`: a direction in the frame of the mesh's own parent. */
  place(model: THREE.Object3D, downstream: THREE.Vector3): void {
    this.at.copy(this.face);
    model.localToWorld(this.at);
    this.mesh.parent?.worldToLocal(this.at);
    this.mesh.quaternion.setFromUnitVectors(Y, downstream);
    // (the box's middle is off the face along the stream)
    this.mesh.position.copy(this.at).addScaledVector(downstream, (this.uniforms.uMid!.value as THREE.Vector3).y);
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

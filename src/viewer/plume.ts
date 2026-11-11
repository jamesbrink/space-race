import * as THREE from 'three';

/**
 * The engine's fire, drawn: a shape, not a photograph of one (AGENTS.md, "Being there"). One tube
 * stands on the nozzle's exit, and its shader gives it everything: the outline, three flat tone
 * bands with hard edges (a pale core, a yellow middle, an orange mantle), the shock diamonds a jet
 * stands up while there is air round it, and the travelling bulges that are its flicker. As the
 * air thins the outline opens from a narrow column into the wide balloon an under-expanded nozzle
 * throws, and the paint thins to veils. The pattern is lunar-lift's flame (../lunar-lift/js/flame.js),
 * cut down to one engine.
 *
 * Its sizes are drawn to read, not measured: a column twelve exit diameters long at sea level, three
 * times as wide and twice as long in near vacuum. The exit's own size is the trajectory's (derived)
 * exit area. Alcohol and liquid oxygen burn cleaner than kerosene: no soot collar.
 */

const RINGS = 24;
const ROUND = 16;

const VERT = /* glsl */ `
  attribute vec2 aAt;          // x: 0 at the exit, 1 at the tip; y: angle round the jet
  uniform float uTime, uLen, uRad, uVac, uOn;
  varying float vT, vF;
  float radius(float t) {
    float sea = (1.1 + 1.1 * sin(min(t, 0.5) * 3.14159)) * pow(max(1.0 - t, 0.0), 0.75);
    sea *= 1.0 - 0.12 * pow(sin(3.14159 * t * 6.0), 2.0) * (1.0 - smoothstep(0.4, 0.65, t));   // the diamonds pinch it
    float open = (1.0 + 2.0 * (1.0 - exp(-4.0 * t))) * sqrt(max(1.0 - t * t * t * t, 0.0));      // a balloon, not a funnel
    float r = mix(sea, open, uVac) * uRad;
    return r * (1.0 + 0.07 * sin(t * 20.0 - uTime * 30.0) * smoothstep(0.08, 0.4, t));         // bulges running aft
  }
  void main() {
    float t = aAt.x, a = aAt.y;
    float len = uLen * uOn * mix(1.0, 2.0, uVac) * (1.0 + 0.05 * sin(uTime * 23.0));
    float r = radius(t) * mix(0.4, 1.0, uOn);
    r *= 1.0 + 0.2 * sin(a * 3.0 + uTime * 14.0) * smoothstep(0.45, 1.0, t) * (1.0 - uVac);        // the tail is not round
    float dr = (radius(t + 0.02) - radius(t)) / 0.02;
    vec2 c = vec2(cos(a), sin(a));
    vec3 p = vec3(c.x * r, -t * len, c.y * r);
    vec3 n = normalize(vec3(c.x * max(len, 1e-3), dr, c.y * max(len, 1e-3)));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vF = dot(normalize(normalMatrix * n), normalize(-mv.xyz));
    vT = t;
    gl_Position = projectionMatrix * mv;
  }`;

const FRAG = /* glsl */ `
  uniform float uTime, uVac, uBright;
  uniform vec3 cCore, cMid, cOut;
  varying float vT, vF;
  void main() {
    float lat = sqrt(1.0 - clamp(vF * vF, 0.0, 1.0));       // 0 on the centre line, 1 at the silhouette
    float wob = 0.06 * sin(vT * 24.0 - uTime * 28.0);
    float core = (0.5 - 0.48 * vT) * (1.0 - 0.45 * uVac) + wob;
    float mid = 0.8 - 0.4 * vT + wob;
    vec3 col = lat < core ? cCore : lat < mid ? cMid : cOut;
    // shock diamonds: lozenges on the axis, only where the air is thick enough to stand them up
    float d = abs(fract(vT * 6.0 + 0.1) - 0.5) * 2.0;
    if (vT < 0.55 && lat < 0.45 * (1.0 - d) * (1.0 - uVac) - 0.06) col = cCore * 1.4;
    // paint in thick air; in thin air flat veils, stepping down the length
    float steps = 1.0 - floor(clamp(vT * 1.15 + wob, 0.0, 0.999) * 3.0) / 3.0;
    float cover = mix(lat < mid ? 0.95 : 0.8, 0.5 * steps * (lat < core ? 1.6 : 1.0), uVac);
    gl_FragColor = vec4(col * uBright * cover, cover);
  }`;

export class Plume {
  readonly mesh: THREE.Mesh;
  private readonly uniforms: Record<string, THREE.IUniform>;

  /** `exitRadius` in metres; the tube hangs from its object's origin along -Y. */
  constructor(exitRadius: number) {
    const at: number[] = [];
    const index: number[] = [];
    for (let i = 0; i <= RINGS; i++) for (let j = 0; j < ROUND; j++) at.push((i / RINGS) ** 1.2, (j / ROUND) * Math.PI * 2);
    for (let i = 0; i < RINGS; i++)
      for (let j = 0; j < ROUND; j++) {
        const a = i * ROUND + j;
        const b = i * ROUND + ((j + 1) % ROUND);
        index.push(a, b, a + ROUND, b, b + ROUND, a + ROUND);
      }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('aAt', new THREE.Float32BufferAttribute(at, 2));
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(at.length * 1.5), 3)); // placed by the shader
    geometry.setIndex(index);
    this.uniforms = {
      uTime: { value: 0 },
      uLen: { value: 24 * exitRadius },
      uRad: { value: exitRadius },
      uVac: { value: 0 },
      uOn: { value: 0 },
      uBright: { value: 1 },
      // linear light, bright enough for the bloom to take the core
      cCore: { value: new THREE.Color(0xfff6dc).multiplyScalar(5) },
      cMid: { value: new THREE.Color(0xffd050).multiplyScalar(3) },
      cOut: { value: new THREE.Color(0xff7a2a).multiplyScalar(1.8) },
    };
    this.mesh = new THREE.Mesh(
      geometry,
      new THREE.ShaderMaterial({
        name: 'plume',
        uniforms: this.uniforms,
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor, // premultiplied: paint in thick air, veils in thin
      }),
    );
    this.mesh.name = 'Plume';
    this.mesh.frustumCulled = false; // its shape is the shader's: the geometry's bounds say nothing
    this.mesh.raycast = () => {}; // fire is not picked or stood on
    this.mesh.visible = false;
  }

  /**
   * How it burns now. `on`: 0 out to 1 at full thrust (eased at ignition and cutoff); `vacuum`: 0
   * in sea-level air to 1 in none; `exposure`: the scene's, so the fire is not a white blot by night.
   * True if what is drawn changed.
   */
  set(on: number, vacuum: number, time: number, exposure: number): boolean {
    const u = this.uniforms;
    const showing = on > 0.001;
    const changed = showing || this.mesh.visible;
    this.mesh.visible = showing;
    u.uOn!.value = on;
    u.uVac!.value = vacuum;
    u.uTime!.value = time;
    u.uBright!.value = 1 / Math.max(1, exposure / 0.8) ** 0.7;
    return changed;
  }
}

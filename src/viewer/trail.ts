import * as THREE from 'three';

/**
 * The trail a rocket leaves in the air, drawn: a soft white ribbon laid along the path its nozzle
 * has flown, turned to face the eye, widening and thinning as it ages and drawn only where there
 * was air to hold it. A designed shape, as the fire is (plume.ts), not smoke simulated: how wide
 * it spreads and how long it lasts are chosen to read, not measured. Alcohol and liquid oxygen
 * leave water, not soot: the trail is white, lit by the day.
 *
 * Points are added in the scene's frame as the flight goes (`reach`); the mesh holds them all,
 * so going back on the clock only draws fewer (`uNow`), and nothing is rebuilt.
 */

/** Seconds of flight between points. */
export const TRAIL_STEP = 0.5;
/** The most points: the powered flight is 142 s. */
const MOST = 400;

const VERT = /* glsl */ `
  attribute vec3 aAlong;      // the path's direction there
  attribute float aSide;      // -1 or 1: which edge of the ribbon
  attribute float aBorn;      // seconds of flight it was laid at
  attribute float aAir;       // how much air there was: 1 at sea level
  uniform float uNow;
  varying float vFade, vSide;
  void main() {
    float age = uNow - aBorn;
    vec4 centre = modelMatrix * vec4(position, 1.0);
    vec3 along = normalize(mat3(modelMatrix) * aAlong);
    vec3 toEye = normalize(cameraPosition - centre.xyz);
    vec3 across = normalize(cross(along, toEye));
    float width = 3.0 + 1.6 * max(age, 0.0);                    // metres, spreading with age
    width = min(width, 90.0);
    centre.xyz += across * aSide * width;
    // none ahead of the clock; laid from the nozzle, thinning with age and with the air it was laid in
    vFade = step(-0.001, age) * smoothstep(-0.05, 0.4, age) * exp(-age / 100.0) * aAir;
    vSide = aSide;
    gl_Position = projectionMatrix * viewMatrix * centre;
  }`;

const FRAG = /* glsl */ `
  uniform vec3 uLight;
  uniform float uOpacity;
  varying float vFade, vSide;
  void main() {
    float edge = 1.0 - vSide * vSide;                            // soft across: full on the line, nothing at the edges
    float a = vFade * edge * uOpacity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uLight, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

export class Trail {
  readonly mesh: THREE.Mesh;
  private readonly geometry = new THREE.BufferGeometry();
  private readonly material: THREE.ShaderMaterial;
  private count = 0;
  private readonly position = new Float32Array(MOST * 2 * 3);
  private readonly along = new Float32Array(MOST * 2 * 3);
  private readonly side = new Float32Array(MOST * 2);
  private readonly born = new Float32Array(MOST * 2);
  private readonly air = new Float32Array(MOST * 2);

  constructor() {
    const g = this.geometry;
    g.setAttribute('position', new THREE.BufferAttribute(this.position, 3));
    g.setAttribute('aAlong', new THREE.BufferAttribute(this.along, 3));
    g.setAttribute('aSide', new THREE.BufferAttribute(this.side, 1));
    g.setAttribute('aBorn', new THREE.BufferAttribute(this.born, 1));
    g.setAttribute('aAir', new THREE.BufferAttribute(this.air, 1));
    const index: number[] = [];
    for (let i = 0; i < MOST - 1; i++) index.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2);
    g.setIndex(index);
    g.setDrawRange(0, 0);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uNow: { value: 0 }, uLight: { value: new THREE.Color(1, 1, 1) }, uOpacity: { value: 0.8 } },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(g, this.material);
    this.mesh.frustumCulled = false; // (its bounds are the whole flight's, and change as it goes)
    this.mesh.renderOrder = 3; // after the fire
    this.mesh.raycast = () => {}; // not a thing to pick
    this.mesh.visible = false;
  }

  /** How many points are laid. */
  get laid(): number {
    return this.count;
  }

  /**
   * Put the trail's live end at the nozzle now, after the last point laid: points are half a
   * second apart, which at speed is hundreds of metres, and the trail must leave the fire itself.
   */
  head(at: THREE.Vector3, along: THREE.Vector3, now: number, air: number): void {
    if (this.count < 1 || this.count >= MOST) return;
    for (const s of [-1, 1]) {
      const i = this.count * 2 + (s > 0 ? 1 : 0);
      at.toArray(this.position, i * 3);
      along.toArray(this.along, i * 3);
      this.side[i] = s;
      this.born[i] = now;
      this.air[i] = air;
    }
    for (const name of ['position', 'aAlong', 'aSide', 'aBorn', 'aAir']) this.geometry.getAttribute(name).needsUpdate = true;
    this.geometry.setDrawRange(0, this.count * 6);
  }

  /** Stop drawing a live end: the engine is out, and the trail ends where it last burned. */
  headless(): void {
    this.geometry.setDrawRange(0, Math.max(0, this.count - 1) * 6);
  }

  /** Lay the next point: the nozzle at `born` seconds, going `along`, in air thinned to `air` of sea level's. */
  reach(at: THREE.Vector3, along: THREE.Vector3, born: number, air: number): void {
    if (this.count >= MOST) return;
    for (const s of [-1, 1]) {
      const i = this.count * 2 + (s > 0 ? 1 : 0);
      at.toArray(this.position, i * 3);
      along.toArray(this.along, i * 3);
      this.side[i] = s;
      this.born[i] = born;
      this.air[i] = air;
    }
    this.count++;
    for (const name of ['position', 'aAlong', 'aSide', 'aBorn', 'aAir']) this.geometry.getAttribute(name).needsUpdate = true;
    this.geometry.setDrawRange(0, Math.max(0, this.count - 1) * 6);
  }

  /** Show it at `now` seconds of flight (null: not flying), lit to `light` (the day's brightness, 0 to 1). */
  show(now: number | null, light: number): void {
    this.mesh.visible = now !== null && this.count > 1;
    if (now === null) return;
    this.material.uniforms.uNow!.value = now;
    (this.material.uniforms.uLight!.value as THREE.Color).setScalar(0.85 * Math.max(0.04, Math.min(1, light)));
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

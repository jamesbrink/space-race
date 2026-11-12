import * as THREE from 'three';
import type { Thruster } from '../types';

/**
 * The attitude jets, seen: a short pale cone at the nozzle of each chamber that is open, from the
 * flight's thruster data (`Body.capsule.rcs.thrusters`: where each stands and which way it pushes,
 * in the body's axes) and the run's own samples of which were firing (sim/vehicle.ts). The group
 * is hung on the flown model and given the body's axes there (viewer/ascent.ts `bodyFrame`), so a
 * jet is where the simulator has it pushing.
 *
 * What a jet looks like is estimated, not measured: decomposed peroxide leaves as steam and
 * oxygen, near invisible in vacuum, so each is a faint, soft-edged cone that fades along its
 * length, as long as nine centimetres times the root of its thrust in newtons (0.9 m for a 24 lbf
 * chamber, 0.2 m for a 1 lbf one: chosen to read from the chase camera's distance). It is its own
 * shader in both looks, like the engine's fire.
 */

const VERT = /* glsl */ `
  varying float vT;
  varying float vF;
  void main() {
    vT = uv.y;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vF = abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz)));
    gl_Position = projectionMatrix * mv;
  }`;
const FRAG = /* glsl */ `
  uniform float uBright;
  varying float vT;
  varying float vF;
  void main() {
    // dense at the nozzle, gone by the end; soft at the silhouette
    float a = pow(1.0 - vT, 1.6) * smoothstep(0.0, 0.7, vF) * 0.5;
    gl_FragColor = vec4(vec3(0.92, 0.96, 1.0) * uBright * a, a);
  }`;

/** How long a jet of `thrust` newtons is drawn, m. */
export const jetLength = (thrust: number): number => 0.09 * Math.sqrt(Math.max(0, thrust));

export class Jets {
  /** Hang it on the flown model; its matrix is the body's axes at the spacecraft's centre of mass (ascent.ts `bodyFrame`). */
  readonly group = new THREE.Group();
  private readonly cones: THREE.Mesh[] = [];
  private readonly rated: number[];
  private readonly material: THREE.ShaderMaterial;
  private lit = '';

  constructor(thrusters: readonly Thruster[]) {
    this.group.name = 'Jets';
    this.group.matrixAutoUpdate = false;
    this.rated = thrusters.map((t) => t.thrust);
    this.material = new THREE.ShaderMaterial({
      name: 'jet',
      uniforms: { uBright: { value: 1 } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    // a unit cone from its tip at the origin, widening along +Y to a fifth of its length across
    const unit = new THREE.CylinderGeometry(0.22, 0.02, 1, 12, 4, true);
    unit.translate(0, 0.5, 0);
    for (const t of thrusters) {
      const cone = new THREE.Mesh(unit, this.material);
      cone.name = `Jet_${t.name}`;
      cone.position.set(...t.at);
      // the jet leaves against the push
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...t.push).normalize().negate());
      cone.visible = false;
      cone.frustumCulled = false;
      cone.raycast = () => {};
      this.cones.push(cone);
      this.group.add(cone);
    }
  }

  /**
   * Show the chambers that are open: `firing` is each one's thrust, N (a sample's `rcs.firing`), or null for none.
   * `exposure`: the scene's, so a jet is not a white blot by night. True if what is drawn changed.
   */
  set(firing: readonly number[] | null, exposure: number): boolean {
    let lit = '';
    this.cones.forEach((cone, i) => {
      const thrust = firing?.[i] ?? 0;
      cone.visible = thrust > 0;
      if (thrust <= 0) return;
      cone.scale.setScalar(jetLength(thrust));
      lit += `${i}:${Math.round((thrust / this.rated[i]!) * 20)},`;
    });
    this.material.uniforms.uBright!.value = 1 / Math.max(1, exposure / 0.8) ** 0.7;
    const changed = lit !== this.lit;
    this.lit = lit;
    return changed;
  }

  dispose(): void {
    this.cones[0]?.geometry.dispose();
    this.material.dispose();
  }
}

import * as THREE from 'three';
import type { Thruster } from '../types.ts';
import { tendGas, type Vapour } from './exhaust.ts';
import { gasLength } from './fires.ts';
import { GAS_KINDS, GASES } from './flames.ts';
import { plumeShape } from './plume.ts';

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
 *
 * Below them, `GasJet`: a jet that is not a main engine's fire and is drawn as a volume (`ModelDef.jets`: a tank's vent,
 * a turbine's exhaust), marched with the smoke (exhaust.ts `gasLayer`).
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
    // (a varying is extrapolated past its triangle's edge at a multisampled pixel the triangle only partly covers, so
    // 1 - vT can be just under nothing there: a power of a negative number is not a number, and one such pixel in the
    // frame is the whole frame once the bloom has spread it)
    float a = pow(clamp(1.0 - vT, 0.0, 1.0), 1.6) * smoothstep(0.0, 0.7, vF) * 0.5;
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
    // (no part of the model's size: the stage fits its shadow map and its views to the model's bounds, and a jet that
    // is not firing, a metre out from the skin, would make the vehicle that much bigger once it had flown)
    unit.boundingBox = new THREE.Box3();
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

/**
 * A jet that is not a fire (`ModelDef.jets` of a gas: a tank's vent, a turbine's exhaust): marched with the smoke and lit
 * as it is (exhaust.ts `gasLayer`), white vapour or a thin veil of steam by what it is (flames.ts `GASES`). Here are its
 * place (`mesh`, at its mouth, the gas along its -Y, which is the node's own way out) and its state (`set`). It opens by
 * the pressure it leaves at against the air's, as an engine's fire does (plume.ts `plumeShape`).
 */
export class GasJet implements Vapour {
  /** At the mouth; nothing is drawn with it. Shown while it blows. */
  readonly mesh: THREE.Mesh;
  on = 0;
  width = 1;
  length: number;
  air = 1;
  time = 0;
  /** Its length at full strength, mouth radii (fires.ts `gasLength`). */
  private readonly full: number;

  /**
   * `radius`: the mouth's, m; `kind`: its entry in the march's tables (flames.ts `gasKindOf`); `thrust`: N, which its
   * length goes by; `exit`: the pressure it leaves at, atmospheres.
   */
  constructor(
    readonly radius: number,
    readonly kind: number,
    thrust: number,
    private readonly exit: number,
  ) {
    this.full = gasLength(thrust, radius, GASES[GAS_KINDS[kind] ?? 'oxygen'].reach);
    this.length = this.full;
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ visible: false }));
    this.mesh.name = 'GasJet';
    this.mesh.frustumCulled = false;
    this.mesh.raycast = () => {}; // (gas is not picked or stood on)
    this.mesh.visible = false;
    tendGas(this);
  }

  /** How it blows now: `on` 0 to 1, in the air `vacuum` gives (0 at the sea, 1 none), at the clock's `time`. True if what is drawn changed. */
  set(on: number, vacuum: number, time: number): boolean {
    const showing = on > 0.001;
    const changed = showing || this.mesh.visible;
    this.mesh.visible = showing;
    this.on = showing ? on : 0;
    const shape = plumeShape(vacuum, this.exit);
    this.width = shape.width;
    this.air = shape.air;
    this.length = this.full * (0.35 + 0.65 * this.on); // (a weaker jet is a shorter one, as a fire is: exhaust.ts `fire`)
    this.time = time;
    return changed;
  }

  dispose(): void {
    tendGas(this, false);
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

import * as THREE from 'three';
import { type Flame, tend } from './exhaust.ts';
import type { Cluster } from './fires.ts';

/**
 * The engine's fire: where it is, how hard it burns and what shape the air lets it take. It is
 * drawn as a volume, marched with the smoke it leaves (exhaust.ts); here are its place (`mesh`, at
 * the nozzle's exit, the jet along its -Y), its state (`set`) and the light it throws (`light`).
 *
 * The Redstone's A-7 burned alcohol and liquid oxygen: a clean, pale yellow fire you can see
 * through, with an orange skirt where the fuel-rich gas along the wall burns in the air, and no
 * soot. Its nozzle (3.61 to 1, 318 psi in the chamber) let the gas out at about nine tenths of an
 * atmosphere, so at sea level the jet is very nearly matched: a narrow column with faint shock
 * diamonds. As the air thins the same jet is more and more under-expanded and opens into a wide,
 * faint balloon (`plumeShape`). The exit's size is the trajectory's (derived) exit area; the rest is
 * estimated, from film and from the nozzle's figures.
 */

/** The pressure at the nozzle's exit, atmospheres: the A-7's chamber pressure over its nozzle's pressure ratio (estimated). */
const EXIT_PRESSURE = 0.9;
/** The fire's length at sea level, in exit radii: 14 m, a little over half the vehicle's length, as film of the launch has it (estimated). */
const LENGTH = 38;

/**
 * The jet's shape for `vacuum` (0 in sea-level air to 1 in none; ascent.ts: one minus the fourth
 * root of the pressure): how wide the free jet swells, in exit radii (the root of the exit's
 * pressure over the air's: a jet's area grows as the pressure it must come down to falls); its
 * length in exit radii; how much air there is to burn in and stand shocks up in (0 to 1); and the
 * length of a shock cell, exit radii.
 */
export function plumeShape(vacuum: number): { width: number; length: number; air: number; cell: number } {
  const pressure = Math.max(1 - Math.min(Math.max(vacuum, 0), 1), 1e-3) ** 4;
  const width = Math.min(Math.max(Math.sqrt(EXIT_PRESSURE / pressure), 1), 60);
  return { width, length: LENGTH * (1 + 0.5 * Math.sqrt(width - 1)), air: pressure ** 0.35, cell: 3.4 * width ** 0.8 };
}

/** The candela the fire throws at full thrust in sea-level air: enough to warm the pad by day and light it by night (estimated, by eye). */
const CANDELA = 260;
/** The exit area CANDELA was judged on, m^2: the A-7's, 652 sq in (Freedom 7's trajectory). */
const LIT_AREA = 652 * 0.0254 ** 2;
/**
 * A larger fire throws more light, but not in proportion: by the square root of its exit area against LIT_AREA, so that
 * the five engines of an R-7 light the pad some three times as brightly as one A-7 and not twenty (estimated, by eye:
 * night film of R-7 launches shows the pad lit as by day, and in proportion it was a white blot).
 */
const LIGHT_BY_AREA = 0.5;

/**
 * The jet's edge `x` exit radii aft, in exit radii, in the air `shape` gives (plumeShape): the free jet swells to its
 * width as the air lets it, and where there is air the mixing layer spreads slowly outward. The march's own (exhaust.ts
 * `edge`), here for what is worked out before it: how far a jet can reach, and where a cluster's chambers merge.
 */
export function jetEdge(shape: { width: number; air: number }, x: number): number {
  const w = shape.width;
  return 1 + (w - 1) * (1 - Math.exp(-Math.max(x, 0) / (1.5 * w))) + 0.085 * Math.max(x, 0) * shape.air;
}

export class Plume implements Flame {
  /** The nozzle's exit: nothing is drawn with it (the fire is drawn by exhaust.ts); shown while the engine burns. */
  readonly mesh: THREE.Mesh;
  /**
   * The fire's light on the pad, the vehicle's tail and the smoke: it goes where `mesh` goes (same parent), and
   * stays in the scene at no strength while the engine is out, so that lighting it builds no shader. Fires that burn
   * together share one (`lightFires`): each light is another shader variant for everything lit, and there is one fire.
   */
  readonly light: THREE.PointLight;
  /** Its own light, which `set` keeps; a shared one is `lightFires`'s. */
  private readonly own: boolean;
  /** How hard its main chambers (or its one exit) burn, 0 to 1, and its steering chambers. */
  on = 0;
  steering = 0;
  vacuum = 0;
  time = 0;
  bright = 1;

  /** The nozzle exit's radius, metres: of a cluster, its main chambers' together (the radius of their summed area). */
  radius: number;
  /** An engine of several chambers (fires.ts `clusterOf`), their exits across the mesh's X and Z; null for one round exit. */
  readonly cluster: Cluster | null;

  /** `exitRadius` in metres; the jet leaves the mesh's origin along its -Y. `light`: one shared with other fires (`lightFires`). */
  constructor(exitRadius: number, cluster: Cluster | null = null, light?: THREE.PointLight) {
    this.radius = exitRadius;
    this.cluster = cluster;
    this.own = !light;
    this.light = light ?? new THREE.PointLight(0xffb468, 0, 0, 2);
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ visible: false }));
    this.mesh.name = 'Plume';
    this.mesh.frustumCulled = false;
    this.mesh.raycast = () => {}; // fire is not picked or stood on
    this.mesh.visible = false;
    this.light.name = 'PlumeLight';
    tend(this);
  }

  /** Take it out of the scene and the drawing for good (its light is kept: it may be shared). */
  dispose(): void {
    tend(this, false);
    this.mesh.removeFromParent();
    if (this.own) this.light.removeFromParent();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }

  /** The jet's shape in the air it is in now. */
  shape(): ReturnType<typeof plumeShape> {
    return plumeShape(this.vacuum);
  }

  /**
   * How it burns now. `on`: 0 out to 1 at full thrust (eased at ignition and cutoff); `vacuum`: 0
   * in sea-level air to 1 in none; `time`: the clock's seconds, which is all the fire's motion is
   * worked from; `exposure`: the scene's, so the fire is not a white blot by night. True if what is
   * drawn changed.
   */
  set(on: number, vacuum: number, time: number, exposure: number, steering = 0): boolean {
    const showing = on > 0.001 || steering > 0.001;
    const changed = showing || this.mesh.visible;
    this.mesh.visible = showing;
    this.on = showing && on > 0.001 ? on : 0;
    this.steering = showing && this.cluster?.steering.length && steering > 0.001 ? steering : 0;
    this.vacuum = vacuum;
    this.time = time;
    this.bright = 1 / Math.max(1, exposure / 0.8) ** 0.7;
    if (!this.own) return changed;
    // the light sits in the fire a little under the exit, and dims as the fire thins with the air
    this.light.position.copy(this.mesh.position);
    this.light.position.y -= 8 * this.radius;
    this.light.intensity = CANDELA * this.on * this.bright * (0.25 + 0.75 * plumeShape(vacuum).air);
    return changed;
  }
}

/** A fire's exit area burning now, m^2, and all of it: its main chambers' at `on`, its steering chambers' at `steering`. */
function litArea(p: Plume): { now: number; all: number } {
  const main = Math.PI * p.radius ** 2;
  const steer = p.cluster ? p.cluster.steering.length * Math.PI * p.cluster.steeringRadius ** 2 : 0;
  return { now: p.on * main + p.steering * steer, all: main + steer };
}

const at = new THREE.Vector3();
const sum = new THREE.Vector3();

/**
 * The one light of fires that burn together (each Plume made with it): in the fire a little under the exits, at their
 * middle by how much of each burns, and as strong as the light of one fire as large as all of them together (by
 * LIGHT_BY_AREA) at how hard they burn. One fire alone is lit as `Plume.set` lights its own. The light's place is in
 * its parent's frame, which must be up to date in the world.
 */
export function lightFires(light: THREE.PointLight, plumes: readonly Plume[]): void {
  let now = 0,
    all = 0,
    bright = 1,
    air = 0;
  sum.set(0, 0, 0);
  for (const p of plumes) {
    if (!p.mesh.visible) continue;
    const a = litArea(p);
    if (a.now <= 0) continue;
    // (a little under its exit: down its own axis, so that a booster swinging away takes its share with it)
    p.mesh.updateWorldMatrix(true, false);
    p.mesh.localToWorld(at.set(0, -8 * p.radius, 0));
    sum.addScaledVector(at, a.now);
    now += a.now;
    all += a.all;
    bright = p.bright;
    air = plumeShape(p.vacuum).air;
  }
  if (now <= 0) {
    light.intensity = 0;
    return;
  }
  sum.divideScalar(now);
  if (light.parent) light.parent.worldToLocal(sum);
  light.position.copy(sum);
  light.intensity = CANDELA * (now / all) * (all / LIT_AREA) ** LIGHT_BY_AREA * bright * (0.25 + 0.75 * air);
}

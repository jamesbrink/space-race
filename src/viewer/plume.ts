import * as THREE from 'three';
import { type Flame, tend } from './exhaust.ts';

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

export class Plume implements Flame {
  /** The nozzle's exit: nothing is drawn with it (the fire is drawn by exhaust.ts); shown while the engine burns. */
  readonly mesh: THREE.Mesh;
  /**
   * The fire's light on the pad, the vehicle's tail and the smoke: it goes where `mesh` goes (same parent), and
   * stays in the scene at no strength while the engine is out, so that lighting it builds no shader.
   */
  readonly light = new THREE.PointLight(0xffb468, 0, 0, 2);
  on = 0;
  vacuum = 0;
  time = 0;
  bright = 1;

  /** The nozzle exit's radius, metres. */
  readonly radius: number;

  /** `exitRadius` in metres; the jet leaves the mesh's origin along its -Y. */
  constructor(exitRadius: number) {
    this.radius = exitRadius;
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ visible: false }));
    this.mesh.name = 'Plume';
    this.mesh.frustumCulled = false;
    this.mesh.raycast = () => {}; // fire is not picked or stood on
    this.mesh.visible = false;
    this.light.name = 'PlumeLight';
    tend(this);
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
  set(on: number, vacuum: number, time: number, exposure: number): boolean {
    const showing = on > 0.001;
    const changed = showing || this.mesh.visible;
    this.mesh.visible = showing;
    this.on = showing ? on : 0;
    this.vacuum = vacuum;
    this.time = time;
    this.bright = 1 / Math.max(1, exposure / 0.8) ** 0.7;
    // the light sits in the fire a little under the exit, and dims as the fire thins with the air
    this.light.position.copy(this.mesh.position);
    this.light.position.y -= 8 * this.radius;
    this.light.intensity = CANDELA * this.on * this.bright * (0.25 + 0.75 * plumeShape(vacuum).air);
    return changed;
  }
}

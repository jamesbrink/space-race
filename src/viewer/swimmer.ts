/**
 * Someone in the sea where the spacecraft came down (types `SwimmerDef`: Grissom), drawn on the record's clock: a copy of
 * one of the flight's figures, skeleton and all, put in its pose in the water, riding the day's sea that is drawn (sim/sea.ts
 * `surfaceAt`, the same function the capsule floats on) with his shoulders where his track has them over its surface;
 * then drawn up a craft's hoist (`RecoveryCraft.hoist`) in his pose on it, and gone once he is aboard. Nothing here
 * knows a flight: where he was and how he was posed are the flight's data.
 */
import * as THREE from 'three';
import { clone as cloneRigged } from 'three/addons/utils/SkeletonUtils.js';
import { surfaceAt, type Wave } from '../sim/sea.ts';
import type { RecoveryCraft, SwimmerDef } from '../types.ts';
import {
  ecefToGeodetic,
  ecefToSite,
  ecefToSiteDirection,
  enuAxes,
  enuToEcef,
  geodeticToEcef,
  type Site,
  type Vec3,
} from '../world/frames.ts';
import { jointKey } from './onfoot/gait.ts';

const toThree = (v: Vec3) => new THREE.Vector3(v[0], v[1], v[2]);
/** How far under the sheave his collar is as he comes aboard, m: his chest at the door's sill. Chosen. */
const AT_DOOR = 0.6;

/** Each joint's turn from standing, degrees about its own X then about the way he faces, as a quaternion (as sk_1.py `hanging_turns`). */
function turnOf([swing, aside]: [number, number]): THREE.Quaternion {
  const x = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(swing));
  return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), THREE.MathUtils.degToRad(aside)).multiply(x);
}

/** Where his track has him at `t`, straight between its points (held at its last), or null before it. */
function trackAt(track: SwimmerDef['track'], t: number): SwimmerDef['track'][number] | null {
  const n = track.length;
  if (n === 0 || t < track[0]!.at) return null;
  let i = 0;
  while (i < n - 1 && t > track[i + 1]!.at) i++;
  const [a, b] = [track[i]!, track[Math.min(i + 1, n - 1)]!];
  const k = b.at > a.at ? THREE.MathUtils.clamp((t - a.at) / (b.at - a.at), 0, 1) : 0;
  const mix = (x: number, y: number) => x + (y - x) * k;
  const turn = ((((b.heading - a.heading) % 360) + 540) % 360) - 180;
  return {
    at: t,
    east: mix(a.east, b.east),
    north: mix(a.north, b.north),
    shoulders: mix(a.shoulders, b.shoulders),
    heading: a.heading + turn * k,
  };
}

export class Swimmer {
  readonly group = new THREE.Group();
  private readonly figure: THREE.Object3D;
  private readonly joints = new Map<string, THREE.Object3D>();
  private readonly rest = new Map<THREE.Object3D, THREE.Quaternion>();
  private posed: 'swimming' | 'hoisted' | null = null;
  /** His shoulders' height over his origin (the floor between his feet), and his collar's, in each pose, m. */
  private readonly shoulder = { swimming: 1.45, hoisted: 1.45 };
  private shown = false;
  /** Where his collar is in the scene, as last placed: the hoist's cable is drawn to it. */
  readonly collar = new THREE.Vector3();

  readonly def: SwimmerDef;
  private readonly hoist: RecoveryCraft['hoist'] | undefined;
  private readonly site: Site;
  private readonly seaLevel: number;

  /** `full`: the figure's finest level, copied; `by`: the craft whose hoist lifts him. */
  constructor(def: SwimmerDef, full: THREE.Object3D, by: RecoveryCraft | undefined, site: Site, seaLevel: number) {
    this.def = def;
    this.hoist = by?.hoist;
    this.site = site;
    this.seaLevel = seaLevel;
    this.group.name = `swimmer:${def.name}`;
    this.group.visible = false;
    const root = cloneRigged(full);
    // (a copy's userData went through JSON: the real material each mesh is drawn from is the original's, as flightshow's hangers)
    const made: THREE.Object3D[] = [];
    full.traverse((o) => made.push(o));
    let n = 0;
    root.traverse((o) => {
      const was = made[n++];
      if (was && (o as THREE.Mesh).isMesh) {
        o.userData = { ...was.userData };
        (o as THREE.Mesh).material = (was as THREE.Mesh).material;
      }
      o.frustumCulled = false; // (posed away from its bounds as made)
    });
    root.position.set(0, 0, 0);
    root.quaternion.identity();
    root.scale.setScalar(1);
    for (const name of def.without) {
      const o = root.getObjectByName(name);
      if (o) o.visible = false;
    }
    root.traverse((o) => {
      this.joints.set(jointKey(o.name), o);
      this.rest.set(o, o.quaternion.clone());
    });
    this.figure = root;
    this.group.add(root);
    for (const pose of ['swimming', 'hoisted'] as const) {
      this.pose(pose);
      this.shoulder[pose] = this.shoulders();
    }
  }

  /** Put him in a pose (each joint's turn from standing, its rest turned by it). */
  private pose(which: 'swimming' | 'hoisted'): void {
    if (this.posed === which) return;
    this.posed = which;
    for (const [o, q] of this.rest) o.quaternion.copy(q);
    for (const [name, turn] of Object.entries(this.def[which])) {
      const joint = this.joints.get(jointKey(name));
      if (joint) joint.quaternion.copy(this.rest.get(joint)!).multiply(turnOf(turn));
    }
    this.figure.updateMatrixWorld(true);
  }

  /** The height of his shoulder joints over his origin, as he is posed, m. */
  private shoulders(): number {
    this.figure.position.set(0, 0, 0);
    this.figure.quaternion.identity();
    this.figure.updateMatrixWorld(true);
    const ys = ['UpperArm.L', 'UpperArm.R'].map((j) => this.joints.get(jointKey(j))?.getWorldPosition(new THREE.Vector3()).y ?? 1.45);
    return (ys[0]! + ys[1]!) / 2;
  }

  /**
   * Put him where his track has him at `t` (s from launch) about `down` (where the run on show came down, ECEF on the
   * sea; null: not shown), on the day's sea (`waves`, their instant counted from `t0`), or on the hoist whose sheave is at
   * `sheave` (in the scene). True if anything drawn changed.
   */
  set(t: number, down: Vec3 | null, waves: readonly Wave[], t0: number, sheave: THREE.Vector3 | null): boolean {
    const hoist = this.hoist;
    const aboard = hoist?.aboard.value ?? Number.POSITIVE_INFINITY;
    const at = down && t < aboard ? trackAt(this.def.track, t) : null;
    const shown = at !== null;
    const changed = shown !== this.shown;
    this.shown = shown;
    this.group.visible = shown;
    if (!at || !down) return changed;
    const g = ecefToGeodetic(down);
    const where = (east: number, north: number, height: number) =>
      toThree(ecefToSite(this.site, geodeticToEcef({ ...ecefToGeodetic(enuToEcef(g, [east, north, 0])), height: this.seaLevel + height })));
    const axes = enuAxes(g);
    const up = toThree(ecefToSiteDirection(this.site, axes.up)).normalize();
    const h = THREE.MathUtils.degToRad(at.heading);
    // (he faces his heading: the figure's +Z is the way he faces)
    const facing = toThree(ecefToSiteDirection(this.site, axes.east))
      .multiplyScalar(Math.sin(h))
      .add(toThree(ecefToSiteDirection(this.site, axes.north)).multiplyScalar(Math.cos(h)))
      .normalize();
    const turn = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(up.clone().cross(facing), up, facing));
    const lifting = hoist && sheave && t >= hoist.lift.value;
    this.pose(lifting ? 'hoisted' : 'swimming');
    const surface = surfaceAt(waves, t - t0, at.east, at.north).height;
    const inWater = where(at.east, at.north, surface + at.shoulders);
    if (lifting && hoist && sheave) {
      // (up the cable from where he was to the door, his collar under the sheave)
      const k = THREE.MathUtils.smoothstep(t, hoist.lift.value, hoist.aboard.value);
      this.collar.copy(inWater).lerp(sheave.clone().addScaledVector(up, -AT_DOOR), k);
    } else this.collar.copy(inWater);
    const shoulder = this.shoulder[lifting ? 'hoisted' : 'swimming'];
    this.group.position.copy(this.collar).addScaledVector(up, -shoulder);
    this.group.quaternion.copy(turn);
    this.group.updateMatrixWorld(true);
    return true;
  }
}

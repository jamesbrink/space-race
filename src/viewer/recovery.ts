/**
 * What came to a spacecraft where it came down (types `RecoveryCraft`): a craft flown on the record's clock about the
 * point the run on show came down at, its rotors turning, and its line to the spacecraft, straight while the simulator's
 * line pulls and sagging while it is slack. Everything it does is the flight's data and the instant: nothing here knows
 * a flight.
 */
import * as THREE from 'three';
import type { RecoveryCraft } from '../types.ts';
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
import type { Staged } from './lod.ts';

const toThree = (v: Vec3) => new THREE.Vector3(v[0], v[1], v[2]);
/** Seconds the line's hold takes over the craft's height as it comes taut, and gives it back as it is let go: chosen. */
const TAKES = 4;
/** Segments the line is drawn in. */
const SEGMENTS = 16;

/** Catmull-Rom between p1 and p2 (`k` 0 to 1), the points either side giving the slope. */
const spline = (p0: number, p1: number, p2: number, p3: number, k: number): number =>
  0.5 * (2 * p1 + (p2 - p0) * k + (2 * p0 - 5 * p1 + 4 * p2 - p3) * k * k + (3 * p1 - p0 - 3 * p2 + p3) * k * k * k);

/** Where the craft's track has it at `t`: east, north, height and heading (degrees), or null outside it. */
export function trackAt(track: RecoveryCraft['track'], t: number): { east: number; north: number; height: number; heading: number } | null {
  const n = track.length;
  if (n === 0 || t < track[0]!.at || t > track[n - 1]!.at) return null;
  let i = 0;
  while (i < n - 2 && t > track[i + 1]!.at) i++;
  const [a, b] = [track[i]!, track[Math.min(i + 1, n - 1)]!];
  const [p, q] = [track[Math.max(i - 1, 0)]!, track[Math.min(i + 2, n - 1)]!];
  const k = b.at > a.at ? (t - a.at) / (b.at - a.at) : 0;
  const at = (key: 'east' | 'north' | 'height') => spline(p[key], a[key], b[key], q[key], k);
  // (the heading the shorter way round)
  const turn = ((((b.heading - a.heading) % 360) + 540) % 360) - 180;
  return { east: at('east'), north: at('north'), height: at('height'), heading: a.heading + turn * THREE.MathUtils.smoothstep(k, 0, 1) };
}

/**
 * Where the craft's origin is at `t` (s from launch) about `down` (where the run on show came down, ECEF on the sea), in
 * the site's frame, as its track has it (before its line holds it): null outside its track. What the sound hears it from.
 */
export function craftAt(def: RecoveryCraft, t: number, down: Vec3, site: Site, seaLevel: number): Vec3 | null {
  const at = trackAt(def.track, t);
  if (!at) return null;
  const over = ecefToGeodetic(enuToEcef(ecefToGeodetic(down), [at.east, at.north, 0]));
  return ecefToSite(site, geodeticToEcef({ ...over, height: seaLevel + at.height }));
}

/** Where the craft's line is, given each frame by the flight on show. */
export interface LineState {
  /** The top of the spacecraft's `line.to` node, in the scene. */
  top: THREE.Vector3;
  /** What the simulator's line pulls with, N (0: slack). */
  tension: number;
  /** When the simulator's line first came taut, s from launch. */
  taut: number;
}

export class Recovery {
  readonly group = new THREE.Group();
  private readonly rotors: { node: THREE.Object3D; base: THREE.Quaternion; axis: THREE.Vector3; rate: number }[] = [];
  private readonly hook = new THREE.Vector3();
  private readonly line: THREE.Mesh | null = null;
  private shown = false;

  readonly def: RecoveryCraft;
  readonly staged: Staged;
  private readonly site: Site;
  private readonly seaLevel: number;

  constructor(def: RecoveryCraft, staged: Staged, site: Site, seaLevel: number) {
    this.def = def;
    this.staged = staged;
    this.site = site;
    this.seaLevel = seaLevel;
    this.group.name = `recovery:${def.name}`;
    this.group.add(staged.group);
    this.group.visible = false;
    this.findRotors();
    staged.group.updateMatrixWorld(true);
    const hook = def.line ? staged.full.getObjectByName(def.line.from) : undefined;
    if (hook) {
      this.hook.copy(hook.getWorldPosition(new THREE.Vector3()).sub(staged.group.getWorldPosition(new THREE.Vector3())));
      const material = new THREE.MeshStandardMaterial({ name: 'line-cable', color: 0x2b2a27, roughness: 0.7, metalness: 0.3 });
      this.line = new THREE.Mesh(new THREE.BufferGeometry(), material);
      this.line.name = 'recovery-line';
      this.line.castShadow = true;
      this.line.frustumCulled = false;
      this.line.visible = false;
      this.line.raycast = () => {};
      this.group.add(this.line);
    }
  }

  /** Every rotor node in every level (each level has its own copy): found again when a level arrives. */
  findRotors(): void {
    this.rotors.length = 0;
    for (const r of this.def.rotors)
      this.staged.group.traverse((o) => {
        if (o.name !== r.node) return;
        const base = (o.userData.rotorBase as THREE.Quaternion | undefined) ?? (o.userData.rotorBase = o.quaternion.clone());
        this.rotors.push({ node: o, base, axis: new THREE.Vector3(...r.axis).normalize(), rate: (r.rpm.value / 60) * 2 * Math.PI });
      });
  }

  /**
   * Put the craft where its track has it at `t` (s from launch) about `down` (where the run on show came down, ECEF on the
   * sea; null: nowhere, so not shown), with its line to `line`. True if anything drawn changed.
   */
  set(t: number, down: Vec3 | null, line: LineState | null): boolean {
    const at = down ? trackAt(this.def.track, t) : null;
    const shown = at !== null;
    const changed = shown !== this.shown;
    this.shown = shown;
    this.group.visible = shown;
    if (!at || !down) return changed;
    const g = ecefToGeodetic(down);
    const over = ecefToGeodetic(enuToEcef(g, [at.east, at.north, 0]));
    const position = toThree(ecefToSite(this.site, geodeticToEcef({ ...over, height: this.seaLevel + at.height })));
    const axes = enuAxes(over);
    const up = toThree(ecefToSiteDirection(this.site, axes.up)).normalize();
    const h = THREE.MathUtils.degToRad(at.heading);
    const forward = toThree(ecefToSiteDirection(this.site, axes.east))
      .multiplyScalar(Math.sin(h))
      .add(toThree(ecefToSiteDirection(this.site, axes.north)).multiplyScalar(Math.cos(h)))
      .normalize();
    const turn = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(forward, up, forward.clone().cross(up)));
    const def = this.def.line;
    const on = def && line && t >= def.on.value && t < def.off.value;
    if (on) {
      // (while the line pulls it holds the craft its length over the spacecraft's top, coming in as it comes taut and going as it is let go)
      const hook = this.hook.clone().applyQuaternion(turn).add(position);
      const lift = line.top.dot(up) + def.length.value - hook.dot(up);
      const k =
        THREE.MathUtils.smoothstep(t, line.taut, line.taut + TAKES) *
        (1 - THREE.MathUtils.smoothstep(t, def.off.value - TAKES, def.off.value));
      if (line.tension > 0 || k < 1) position.addScaledVector(up, lift * k);
    }
    this.group.position.copy(position);
    this.group.quaternion.copy(turn);
    for (const r of this.rotors)
      r.node.quaternion.copy(r.base).multiply(new THREE.Quaternion().setFromAxisAngle(r.axis, (r.rate * t) % (2 * Math.PI)));
    this.group.updateMatrixWorld(true);
    this.staged.measure();
    if (this.line) {
      this.line.visible = Boolean(on);
      if (on && def && line) this.drawLine(this.hook.clone().applyQuaternion(turn).add(position), line, def.length.value, def.radius, up);
    }
    return true;
  }

  /**
   * The line from the craft's hook (`from`, in the scene) to the spacecraft's top: straight while it pulls; slack, a
   * parabola of its length between the two (a sag s across a span d: length d + 8 s^2 / 3 d). Drawn in the group's frame.
   */
  private drawLine(from: THREE.Vector3, line: LineState, length: number, radius: number, up: THREE.Vector3): void {
    const d = from.distanceTo(line.top);
    const sag = line.tension > 0 || d >= length ? 0 : Math.sqrt((3 * d * (length - d)) / 8);
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      const k = i / SEGMENTS;
      points.push(
        from
          .clone()
          .lerp(line.top, k)
          .addScaledVector(up, -4 * sag * k * (1 - k)),
      );
    }
    const inverse = this.group.matrixWorld.clone().invert();
    for (const p of points) p.applyMatrix4(inverse);
    const old = this.line!.geometry;
    this.line!.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), SEGMENTS, radius, 6, false);
    old.dispose();
  }

  /** Its line's material and geometry; the model is the stage's to let go. */
  dispose(): void {
    if (!this.line) return;
    this.line.geometry.dispose();
    (this.line.material as THREE.Material).dispose();
  }
}

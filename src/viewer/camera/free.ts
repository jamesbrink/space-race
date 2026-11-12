import * as THREE from 'three';
import { Flyer } from '../fly.ts';
import { ease, journeySeconds, NEAREST } from './maths.ts';
import { looking, type Pose, type Rig, type World, Y } from './rig.ts';

/** How far the eye stays above the ground, metres. */
const FLOOR = 0.35;
/** How quickly a wheel's move is made, seconds. */
const DOLLY_TAU = 0.09;

const v = new THREE.Vector3();
const FORWARD = new THREE.Vector3(0, 0, -1);

/**
 * The free camera: it has no subject. The keys fly it along its own line of sight and sideways, a
 * drag turns it where it is, and the wheel takes it toward what it is pointed at by proportion (a
 * fifth of the way a notch, so it closes on a rivet as surely as on a building) or straight back.
 * It goes where it is sent (`goTo`) and is free again when it arrives.
 */
export class FreeRig implements Rig {
  readonly id = 'free' as const;
  readonly pivot = new THREE.Vector3();
  readonly lens = null;
  calm = false;
  private readonly body = new THREE.PerspectiveCamera();
  private readonly flyer = new Flyer();
  /** How far off what it is looking at is, metres: how far a notch of the wheel or a slide goes. */
  private ref = 20;
  /** What the wheel has asked for and has not been moved yet. */
  private readonly owed = new THREE.Vector3();
  private journey: { p0: THREE.Vector3; p1: THREE.Vector3; q0: THREE.Quaternion; q1: THREE.Quaternion; t: number; seconds: number } | null =
    null;

  private readonly world: World;
  private readonly fov: number;

  constructor(world: World, fov: number) {
    this.world = world;
    this.fov = fov;
  }

  get busy(): boolean {
    return Boolean(this.journey) || this.owed.lengthSq() > 1e-10;
  }

  enter(from: Pose, pivot: THREE.Vector3): void {
    this.body.position.copy(from.position);
    this.flyer.face(v.copy(FORWARD).applyQuaternion(from.quaternion));
    this.ref = THREE.MathUtils.clamp(from.position.distanceTo(pivot), 2, 1e6);
    this.owed.set(0, 0, 0);
    this.journey = null;
    this.aim();
  }

  /** Fly to where `pivot` is seen from `eyeAt`, turning to look at it on the way. */
  goTo(pivot: THREE.Vector3, eyeAt: THREE.Vector3, snap: boolean): void {
    const q1 = looking(eyeAt, pivot, Y, 0, new THREE.Quaternion());
    this.owed.set(0, 0, 0);
    this.ref = Math.max(eyeAt.distanceTo(pivot), NEAREST);
    if (snap || this.calm) {
      this.body.position.copy(eyeAt);
      this.flyer.face(v.copy(pivot).sub(eyeAt).normalize());
      this.journey = null;
      this.aim();
      return;
    }
    const from = this.body.position.clone().sub(this.pivot);
    this.journey = {
      p0: this.body.position.clone(),
      p1: eyeAt.clone(),
      q0: this.body.quaternion.clone(),
      q1,
      t: 0,
      seconds: journeySeconds(this.pivot, from, pivot, eyeAt.clone().sub(pivot)),
    };
  }

  update(dt: number, keys: ReadonlySet<string>, fast: boolean): void {
    const j = this.journey;
    if (j) {
      j.t = Math.min(1, j.t + dt / j.seconds);
      const k = ease(j.t);
      this.body.position.lerpVectors(j.p0, j.p1, k);
      this.body.quaternion.slerpQuaternions(j.q0, j.q1, k);
      if (j.t >= 1) {
        this.flyer.face(v.copy(FORWARD).applyQuaternion(j.q1));
        this.journey = null;
      }
    }
    const p = this.body.position;
    const above = this.world.clearance(p);
    const ground = Number.isFinite(above) ? p.y - above : p.y; // with no ground under it, one speed
    const before = v.copy(p);
    if (this.flyer.drive(this.body, keys, fast, dt, Number.isFinite(above) ? ground + FLOOR : -Infinity, ground) && !before.equals(p)) {
      this.journey = null;
      this.owed.set(0, 0, 0);
      if (Number.isFinite(above)) this.ref = Math.max(2, above); // (flown somewhere else: what it was looking at is behind it)
    }
    if (this.owed.lengthSq() > 0) {
      const k = this.calm ? 1 : 1 - Math.exp(-dt / DOLLY_TAU);
      p.addScaledVector(this.owed, k);
      this.owed.multiplyScalar(1 - k);
      if (this.owed.lengthSq() < 1e-10) this.owed.set(0, 0, 0);
    }
    // whatever moved it (the keys, the wheel, a slide, a journey), it stays above the ground it is now over
    const under = FLOOR - this.world.clearance(p);
    if (under > 0 && Number.isFinite(under)) p.y += under;
    if (!this.journey) this.aim();
    else this.pivot.copy(p).addScaledVector(v.copy(FORWARD).applyQuaternion(this.body.quaternion), THREE.MathUtils.clamp(this.ref, 2, 60));
  }

  /** Point the camera where it is headed, and keep what it would turn about a little way ahead of it. */
  private aim(): void {
    this.pivot.copy(this.body.position).addScaledVector(this.flyer.direction(), THREE.MathUtils.clamp(this.ref, 2, 60));
    this.flyer.aim(this.body, this.pivot, false);
  }

  pose(out: Pose): void {
    out.position.copy(this.body.position);
    out.quaternion.copy(this.body.quaternion);
    out.fov = this.fov;
  }

  drag(dx: number, dy: number, height: number, pan: boolean): void {
    this.journey = null;
    if (!pan) {
      this.flyer.look(dx, dy, this.fov);
      return;
    }
    // slid sideways and up: what is looked at goes with the pointer
    const scale = (2 * this.ref * Math.tan(THREE.MathUtils.degToRad(this.fov / 2))) / height;
    const q = this.body.quaternion;
    this.body.position
      .addScaledVector(v.set(1, 0, 0).applyQuaternion(q), -dx * scale)
      .addScaledVector(v.set(0, 1, 0).applyQuaternion(q), dy * scale);
  }

  fling(): void {}

  zoom(nepers: number, hit: THREE.Vector3 | null): void {
    if (!nepers) return;
    this.journey = null;
    const p = this.body.position;
    if (nepers < 0) {
      // toward what the pointer is on, by proportion; with nothing there, forward by as much as the last thing was far
      const to = hit ? v.copy(hit).sub(p) : null;
      if (to) this.ref = Math.max(to.length() - this.owed.length(), NEAREST);
      const step = Math.max(0, Math.min(this.ref * (1 - Math.exp(nepers)), this.ref - NEAREST));
      this.owed.addScaledVector(to ? to.normalize() : this.flyer.direction(), step);
      this.ref -= step;
    } else {
      const step = this.ref * (Math.exp(nepers) - 1);
      this.owed.addScaledVector(this.flyer.direction(), -step);
      this.ref += step;
    }
  }

  twist(): void {}
  home(): void {}
}

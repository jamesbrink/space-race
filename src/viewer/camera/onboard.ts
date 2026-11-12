import * as THREE from 'three';
import { approach, Zoom } from './maths.ts';
import { type Pose, type Rig, type World, X, Y } from './rig.ts';

/** How far the head turns from straight ahead, radians: round to the side and a little past, and up and down. */
const YAW = 2.3;
const PITCH = 1.25;
/** The lens: what it starts at, and how narrow and wide it goes, degrees. */
const LENS = 62;
const NARROW = 18;
const WIDE = 80;
/** Radians of turn for a pixel dragged, at the starting lens. */
const LOOK = 0.003;
/** How quickly the head comes back to straight ahead when asked, seconds. */
const BACK_TAU = 0.18;

const q = new THREE.Quaternion();
const p = new THREE.Vector3();
const s = new THREE.Vector3();

/**
 * First person, from a place in the vehicle (`Craft.seat`: a seat the flight's data names, with its
 * eye point): the camera is at the eyes and goes wherever the vehicle goes, turned as it is turned.
 * A drag or the arrows turn the head, within what a neck allows; the wheel changes the lens, not
 * the place. Straight ahead is the seat's +Z, up is its +Y.
 *
 * The contract for the data: `ModelDef.seats[]` gives `node` (a node of the model whose +Z looks
 * ahead and +Y is overhead) and `eye` (the eyes in that node's frame). Who sits where is the
 * flight's business; this rig only needs the frame.
 */
export class OnboardRig implements Rig {
  readonly id = 'onboard' as const;
  readonly pivot = new THREE.Vector3();
  calm = false;
  private yaw = 0;
  private pitch = 0;
  /** Coming back to straight ahead. */
  private returning = false;
  private readonly zoomer = new Zoom(Math.log(LENS));
  private readonly position = new THREE.Vector3();
  private readonly quaternion = new THREE.Quaternion();

  private readonly world: World;

  constructor(world: World) {
    this.world = world;
  }

  get lens(): number {
    return Math.exp(this.zoomer.now);
  }

  get busy(): boolean {
    return this.returning || this.zoomer.moving;
  }

  enter(): void {
    this.yaw = this.pitch = 0;
    this.returning = false;
    this.zoomer.set(Math.log(LENS));
    this.place();
  }

  private place(): void {
    const seat = this.world.craft()?.seat;
    if (!seat) return;
    seat.decompose(this.position, this.quaternion, s);
    // the camera looks along its own -Z: half a turn about the seat's vertical faces it ahead
    this.quaternion.multiply(q.setFromAxisAngle(Y, Math.PI + this.yaw)).multiply(q.setFromAxisAngle(X, this.pitch));
    this.pivot.copy(this.position).add(p.set(0, 0, -1).applyQuaternion(this.quaternion));
  }

  update(dt: number, keys: ReadonlySet<string>): void {
    const has = (k: string) => Number(keys.has(k));
    const turn = (has('arrowleft') - has('arrowright')) * 1.2 * dt;
    const tilt = (has('arrowup') - has('arrowdown')) * 0.9 * dt;
    if (turn || tilt) this.returning = false;
    this.yaw = THREE.MathUtils.clamp(this.yaw + turn, -YAW, YAW);
    this.pitch = THREE.MathUtils.clamp(this.pitch + tilt, -PITCH, PITCH);
    const zoom = (has('f') + has('-') - has('r') - has('+') - has('=')) * 1.4 * dt;
    if (zoom) this.zoomer.set(THREE.MathUtils.clamp(this.zoomer.now + zoom, Math.log(NARROW), Math.log(WIDE)));
    this.zoomer.step(dt, this.calm);
    if (this.returning) {
      this.yaw = this.calm ? 0 : approach(this.yaw, 0, BACK_TAU, dt);
      this.pitch = this.calm ? 0 : approach(this.pitch, 0, BACK_TAU, dt);
      if (Math.hypot(this.yaw, this.pitch) < 1e-3) {
        this.yaw = this.pitch = 0;
        this.returning = false;
      }
    }
    this.place();
  }

  pose(out: Pose): void {
    out.position.copy(this.position);
    out.quaternion.copy(this.quaternion);
    out.fov = this.lens;
  }

  /** A drag turns the head the way the pointer goes; a narrow lens turns less for a pixel, so what is looked at keeps pace with it. */
  drag(dx: number, dy: number): void {
    this.returning = false;
    const rate = LOOK * (this.lens / LENS);
    this.yaw = THREE.MathUtils.clamp(this.yaw - dx * rate, -YAW, YAW);
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * rate, -PITCH, PITCH);
  }

  fling(): void {}

  zoom(nepers: number): void {
    this.zoomer.push(nepers, Math.log(NARROW), Math.log(WIDE));
  }

  twist(): void {}

  /** Look straight ahead again, through the lens it started with. */
  home(): void {
    this.returning = true;
    this.zoomer.goal = Math.log(LENS);
  }
}

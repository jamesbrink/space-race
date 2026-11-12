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
const m = new THREE.Matrix4();

/**
 * First person, from a place in the vehicle (`Craft.seat`: a seat the flight's data names, with its
 * eye point): the camera is at the eyes and goes wherever the vehicle goes, turned as it is turned.
 * A drag or the arrows turn the head, within what a neck allows; the wheel changes the lens, not
 * the place. Straight ahead is the seat's +Z, up is its +Y. It can be told to look at something in
 * the cabin (`lookAt`: a window, the periscope's screen) and holds it until let go.
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

  /** How far the head turns from where the seat looks, radians: the seat's own (`CabinDef.head`), or a free neck's. */
  limits = { side: YAW, up: PITCH, down: PITCH };
  /**
   * Looking at something: a point in the seat's frame and the lens to see it through. The head goes to it and stays
   * on it, whatever the vehicle does, until it is let go (`lookAt(null)`) or the hands turn the head themselves.
   */
  private aim: { point: THREE.Vector3; lens: number; from: { yaw: number; pitch: number; lens: number } } | null = null;

  private readonly world: World;

  constructor(world: World) {
    this.world = world;
  }

  get lens(): number {
    return Math.exp(this.zoomer.now);
  }

  get busy(): boolean {
    return this.returning || this.turning || this.zoomer.moving;
  }

  /** What is being looked at (`lookAt`), if anything. */
  get looking(): boolean {
    return this.aim !== null;
  }

  /**
   * Turn the head to a place in the scene and look at it through `lens` degrees (a window, a screen), or with null
   * go back to where the head was before. The place is kept in the seat's frame: it is a thing in the cabin.
   */
  lookAt(point: THREE.Vector3 | null, lens = LENS): void {
    const seat = this.world.craft()?.seat;
    if (!point || !seat) {
      if (this.aim) {
        const { yaw, pitch, lens: was } = this.aim.from;
        this.aim = {
          point: p.set(Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), Math.cos(pitch) * Math.cos(yaw)).clone(),
          lens: was,
          from: this.aim.from,
        };
        this.leaving = true;
      }
      return;
    }
    const from = this.aim && !this.leaving ? this.aim.from : { yaw: this.yaw, pitch: this.pitch, lens: Math.exp(this.zoomer.goal) };
    this.aim = { point: point.clone().applyMatrix4(m.copy(seat).invert()), lens, from };
    this.leaving = false;
    this.returning = false;
  }
  /** The look is being let go: the head is on its way back, and is its own again when it gets there. */
  private leaving = false;
  /** The head is still on its way to what it was told to look at. */
  private turning = false;

  enter(): void {
    this.yaw = this.pitch = 0;
    this.aim = null;
    this.leaving = false;
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
    const { side, up, down } = this.limits;
    if (turn || tilt) {
      this.returning = false;
      this.aim = null;
    }
    this.yaw = THREE.MathUtils.clamp(this.yaw + turn, -side, side);
    this.pitch = THREE.MathUtils.clamp(this.pitch + tilt, -down, up);
    this.turning = false;
    if (this.aim) {
      const at = this.aim.point;
      const yaw = THREE.MathUtils.clamp(Math.atan2(at.x, at.z), -side, side);
      const pitch = THREE.MathUtils.clamp(Math.atan2(at.y, Math.hypot(at.x, at.z)), -down, up);
      this.yaw = this.calm ? yaw : approach(this.yaw, yaw, BACK_TAU, dt);
      this.pitch = this.calm ? pitch : approach(this.pitch, pitch, BACK_TAU, dt);
      this.zoomer.goal = Math.log(this.aim.lens);
      this.turning = Math.hypot(this.yaw - yaw, this.pitch - pitch) > 1e-4;
      if (this.leaving && Math.hypot(this.yaw - yaw, this.pitch - pitch) < 2e-3) {
        this.aim = null;
        this.leaving = false;
      }
    }
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
    this.aim = null; // (the hands have the head: it stays where they put it, through the lens it has)
    this.leaving = false;
    const rate = LOOK * (this.lens / LENS);
    this.yaw = THREE.MathUtils.clamp(this.yaw - dx * rate, -this.limits.side, this.limits.side);
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * rate, -this.limits.down, this.limits.up);
  }

  fling(): void {}

  zoom(nepers: number): void {
    this.zoomer.push(nepers, Math.log(NARROW), Math.log(WIDE));
  }

  twist(): void {}

  /** Look straight ahead again, through the lens it started with. */
  home(): void {
    this.aim = null;
    this.leaving = false;
    this.returning = true;
    this.zoomer.goal = Math.log(LENS);
  }
}

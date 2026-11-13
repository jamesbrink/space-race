import * as THREE from 'three';
import { Head, type Pose as HeadPose, type Lookout } from './head.ts';
import { Zoom } from './maths.ts';
import type { Pose, Rig, World } from './rig.ts';

/** How far the head turns from straight ahead, radians, when the seat says nothing (`CabinDef.head`): a free neck's. */
const YAW = 2.3;
const PITCH = 1.25;
/** The lens: what it starts at, and how narrow and wide it goes, degrees. */
const LENS = 62;
const NARROW = 18;
const WIDE = 80;
/** Radians of turn for a pixel dragged, at the starting lens. */
const LOOK = 0.003;

const p = new THREE.Vector3();
const s = new THREE.Vector3();
const q = new THREE.Quaternion();

/**
 * First person, from a place in the vehicle (`Craft.seat`: a seat the flight's data names, with its
 * eye point): the camera is at the eyes and goes wherever the vehicle goes, turned as it is turned.
 * The head is a person's in a couch (head.ts): a drag or the arrows turn it about the neck, within
 * the seat's limits; the wheel changes the lens, not the place. Straight ahead is the seat's +Z, up
 * is its +Y. Asked to (`lean`), the pilot leans to a port or the periscope's screen and looks out
 * through it, and comes back when asked again (`lean(null)`) or by 0.
 *
 * The contract for the data: `ModelDef.seats[]` gives `node` (a node of the model whose +Z looks
 * ahead and +Y is overhead) and `eye` (the eyes in that node's frame). Who sits where is the
 * flight's business; this rig only needs the frame.
 */
export class OnboardRig implements Rig {
  readonly id = 'onboard' as const;
  readonly pivot = new THREE.Vector3();
  private readonly zoomer = new Zoom(Math.log(LENS));
  private readonly position = new THREE.Vector3();
  private readonly quaternion = new THREE.Quaternion();
  private readonly head = new Head({ side: YAW, up: PITCH, down: PITCH });
  private readonly seen: HeadPose = { eye: new THREE.Vector3(), quaternion: new THREE.Quaternion(), lens: LENS };
  private seenLens = LENS;

  private readonly world: World;

  constructor(world: World) {
    this.world = world;
  }

  get calm(): boolean {
    return this.head.calm;
  }
  set calm(on: boolean) {
    this.head.calm = on;
  }

  /** How far the head turns from where the seat looks, radians: the seat's own (`CabinDef.head`), or a free neck's. */
  get limits(): { side: number; up: number; down: number } {
    return this.head.limits;
  }
  set limits(to: { side: number; up: number; down: number }) {
    this.head.limits = to;
  }

  /** The lens the view is seen through, degrees: the head's own, or the one leant to. */
  get lens(): number {
    return this.seenLens;
  }

  get busy(): boolean {
    return this.head.moving || this.zoomer.moving;
  }

  /** Leaning out to something (`lean`), or there. */
  get looking(): boolean {
    return this.head.out;
  }

  /** The head's own turn: to the left and up, radians (for tests and the debug handle). */
  get turned(): { yaw: number; pitch: number } {
    return { yaw: this.head.yaw, pitch: this.head.pitch };
  }

  /**
   * Lean to something to look out through (a port, the periscope's screen: in the scene, as the vehicle stands this
   * instant), or with null come back to the seat. What it is is kept in the seat's frame: it is a thing in the cabin.
   */
  lean(to: Lookout | null): void {
    const seat = this.world.craft()?.seat;
    if (seat) this.head.leanIn(to, seat, Math.exp(this.zoomer.now));
  }

  enter(): void {
    this.head.reset();
    this.zoomer.set(Math.log(LENS));
    this.place();
  }

  private place(): void {
    const seat = this.world.craft()?.seat;
    if (!seat) return;
    const seen = this.head.pose(Math.exp(this.zoomer.now), this.seen);
    seat.decompose(this.position, this.quaternion, s);
    this.seenLens = seen.lens;
    this.position.add(p.copy(seen.eye).applyQuaternion(this.quaternion));
    this.quaternion.multiply(q.copy(seen.quaternion));
    this.pivot.copy(this.position).add(p.set(0, 0, -1).applyQuaternion(this.quaternion));
  }

  update(dt: number, keys: ReadonlySet<string>): void {
    const has = (k: string) => Number(keys.has(k));
    const turn = (has('arrowleft') - has('arrowright')) * 1.2 * dt;
    const tilt = (has('arrowup') - has('arrowdown')) * 0.9 * dt;
    if (turn || tilt) this.head.turn(turn, tilt);
    const zoom = (has('f') + has('-') - has('r') - has('+') - has('=')) * 1.4 * dt;
    if (zoom && !this.head.zoom(zoom)) this.zoomer.set(THREE.MathUtils.clamp(this.zoomer.now + zoom, Math.log(NARROW), Math.log(WIDE)));
    this.zoomer.step(dt, this.calm);
    this.head.step(dt);
    this.place();
  }

  pose(out: Pose): void {
    out.position.copy(this.position);
    out.quaternion.copy(this.quaternion);
    out.fov = this.lens;
  }

  /** A drag turns the head the way the pointer goes; a narrow lens turns less for a pixel, so what is looked at keeps pace with it. */
  drag(dx: number, dy: number): void {
    const rate = LOOK * (this.lens / LENS);
    this.head.turn(-dx * rate, -dy * rate);
  }

  fling(): void {}

  zoom(nepers: number): void {
    if (!this.head.zoom(nepers)) this.zoomer.push(nepers, Math.log(NARROW), Math.log(WIDE));
  }

  twist(): void {}

  /** Look straight ahead again from the seat, through the lens it started with: back from a lean, if there is one. */
  home(): void {
    this.head.home(this.head.pose(Math.exp(this.zoomer.now), { eye: new THREE.Vector3(), quaternion: new THREE.Quaternion(), lens: 0 }));
    this.zoomer.goal = Math.log(LENS);
  }
}

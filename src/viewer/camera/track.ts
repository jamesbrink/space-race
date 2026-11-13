import * as THREE from 'three';
import { approach, trackFov, Zoom } from './maths.ts';
import { looking, type Pose, type Rig, type World, X, Y } from './rig.ts';

/** The lens a tracking camera has: from a long telescope's sliver of sky to a wide view of the pad, degrees. */
const NARROW = 0.25;
const WIDE = 50;
/** How much of the frame's height the vehicle is given, left to itself. */
const FILL = 0.3;
/** How much tighter or wider than that the wheel can ask for, nepers either way. */
const TRIM = 2.2;
/** How quickly the lens follows, seconds: a hand on a zoom ring, not a cut. */
const LENS_TAU = 0.35;
/** How far from the middle of the frame the vehicle can be put by a drag, in frame heights. */
const OFF = 0.38;
/**
 * The furthest a camera on the ground is any use, metres: there a vehicle of a few metres is a few thousandths of the
 * longest lens's frame, under a pixel. (Freedom 7 at its apogee was some 300 km from the pad.)
 */
export const TRACK_FAR = 1_000_000;

const up = new THREE.Vector3();
const to = new THREE.Vector3();
const q = new THREE.Quaternion();

/**
 * A camera standing at one place on the ground, following the vehicle as the films of a launch were
 * shot: it turns to keep the vehicle in frame and closes its lens as the vehicle goes away, until
 * the lens is as long as a lens gets and the vehicle shrinks to a point of light. The wheel asks for
 * a tighter or wider frame; a drag puts the vehicle off the middle of it. It never leaves where it
 * stands: `stand` puts it somewhere.
 */
export class TrackRig implements Rig {
  readonly id = 'pad' as const;
  readonly pivot = new THREE.Vector3();
  calm = false;
  /** Where it stands, in the scene. */
  readonly at = new THREE.Vector3();
  /** The fraction of the frame's height the controls cover at the bottom: the vehicle is kept in the middle of what is left. */
  inset = 0;
  private insetNow = 0;
  /** The frame's width over its height: on an upright phone the frame is narrower than OFF frame heights. */
  aspect = 1.6;
  private fov = 35;
  private radius = 10;
  /** The frame asked for: nepers tighter (negative) or wider than FILL gives. */
  private readonly trim = new Zoom(0);
  private offX = 0;
  private offY = 0;

  private readonly world: World;

  constructor(world: World) {
    this.world = world;
  }

  get lens(): number {
    return this.fov;
  }

  get busy(): boolean {
    return this.trim.moving || Math.abs(this.fov - this.wanted()) > 1e-3 || this.insetNow !== this.inset;
  }

  /** Stand it here. */
  stand(at: THREE.Vector3): void {
    this.at.copy(at);
  }

  /**
   * Whether a camera standing at `from` can see the vehicle: some of it above the level there (the scene is curved
   * beyond the site, so a vehicle down the range sinks below it as the sea does), and no further than `TRACK_FAR`.
   * Late in a flight, under its parachute hundreds of kilometres out, it cannot: the camera would look into the ground.
   */
  sees(from: THREE.Vector3): boolean {
    const craft = this.world.craft();
    if (!craft) return false;
    to.copy(craft.centre).applyMatrix4(craft.matrix).sub(from);
    return to.length() <= TRACK_FAR && to.dot(this.world.upAt(from, up)) > -craft.radius;
  }

  enter(from: Pose): void {
    this.fov = from.fov;
    this.trim.set(0);
    this.offX = this.offY = 0;
    this.follow();
  }

  private follow(): void {
    const craft = this.world.craft();
    if (!craft) return;
    this.pivot.copy(craft.centre).applyMatrix4(craft.matrix);
    this.radius = craft.radius;
  }

  /** The lens that frames the vehicle as asked, from where it is now. */
  private wanted(): number {
    return trackFov(this.radius, this.at.distanceTo(this.pivot), FILL * Math.exp(-this.trim.now), NARROW, WIDE);
  }

  update(dt: number, keys: ReadonlySet<string>): void {
    this.follow();
    const has = (k: string) => Number(keys.has(k));
    const zoom = (has('f') + has('-') - has('r') - has('+') - has('=')) * 1.4 * dt;
    if (zoom) this.trim.set(THREE.MathUtils.clamp(this.trim.now + zoom, -TRIM, TRIM));
    const across = OFF * Math.min(1, this.aspect);
    this.offX = THREE.MathUtils.clamp(this.offX + (has('arrowleft') - has('arrowright')) * 0.5 * dt, -across, across);
    this.offY = THREE.MathUtils.clamp(this.offY + (has('arrowup') - has('arrowdown')) * 0.5 * dt, -OFF, OFF);
    this.trim.step(dt, this.calm);
    // (by proportion: a lens closes as evenly from 40 degrees to 20 as from 2 to 1)
    const to = this.wanted();
    this.fov = this.calm ? to : Math.exp(approach(Math.log(this.fov), Math.log(to), LENS_TAU, dt));
    if (Math.abs(this.fov - to) < 1e-4 * to) this.fov = to;
    this.insetNow = this.calm ? this.inset : approach(this.insetNow, this.inset, 0.25, dt);
    if (Math.abs(this.insetNow - this.inset) < 1e-4) this.insetNow = this.inset;
  }

  pose(out: Pose): void {
    out.position.copy(this.at);
    this.world.upAt(this.at, up);
    looking(this.at, this.pivot, up, 0, out.quaternion);
    // off the middle of the frame by turning the camera where it stands: so many frame heights, whatever the lens
    const tall = THREE.MathUtils.degToRad(this.fov);
    out.quaternion
      .multiply(q.setFromAxisAngle(Y, this.offX * tall))
      .multiply(q.setFromAxisAngle(X, -(this.offY + this.insetNow / 2) * tall));
    out.fov = this.fov;
  }

  /** A drag moves the vehicle in the frame, with the pointer. */
  drag(dx: number, dy: number, height: number): void {
    const across = OFF * Math.min(1, this.aspect);
    this.offX = THREE.MathUtils.clamp(this.offX + dx / height, -across, across);
    this.offY = THREE.MathUtils.clamp(this.offY - dy / height, -OFF, OFF);
  }

  fling(): void {}

  zoom(nepers: number): void {
    this.trim.push(nepers, -TRIM, TRIM);
  }

  twist(): void {}

  /** The vehicle in the middle of the frame again, at the size the camera gives it. */
  home(): void {
    this.offX = this.offY = 0;
    this.trim.goal = 0;
  }
}

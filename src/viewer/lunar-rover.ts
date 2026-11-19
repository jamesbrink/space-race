import { Group, Matrix4, type Object3D, Quaternion, Vector3 } from 'three';
import type { LunarDrivingGround } from './lunar-driving-ground.ts';
import { type Motion, roll } from './onfoot/drive.ts';
import { fitPlane } from './runs.ts';

type Ground = Pick<LunarDrivingGround, 'height' | 'radius'> & { blocked?(x: number, z: number): boolean };
export type RoverParking = Pick<Motion, 'x' | 'z' | 'heading'> & { distance: number };
const UP = new Vector3(0, 1, 0);
const AXLE = new Vector3(0, 0, 1);
const HINGE = new Vector3(1, 0, 0);
const tip = new Vector3();
const direction = new Vector3();
const oriented = new Quaternion();
const turn = new Quaternion();
const axis = new Vector3();
const front = new Vector3();
const normal = new Vector3();
const right = new Vector3();
const basis = new Matrix4();

/** Scan the assembled rover in its own axes: +X forward, +Y up and +Z to the passenger's right. */
function need(root: Object3D, name: string): Object3D {
  const part = root.getObjectByName(name);
  if (!part) throw new Error('Rover model is missing ' + name);
  return part;
}

/** Each link's local +Y runs from its chassis pivot to its outboard joint. */
function linkAt(model: Object3D, id: string, kind: string) {
  const name = `LRV_Link_${id}_${kind}`;
  const link = need(model, name);
  const start = need(link, `${name}_In`);
  const end = need(link, `${name}_Out`);
  const mount = need(model, `LRV_Mount_${id}_${kind}`);
  const base = start.getWorldPosition(new Vector3());
  const outer = end.getWorldPosition(new Vector3());
  return {
    link,
    mount,
    base,
    outer,
    length: base.distanceTo(outer),
    rest: link.quaternion.clone(),
    axis: UP.clone().applyQuaternion(link.quaternion),
  };
}

type Link = ReturnType<typeof linkAt>;

/** Swing about the chassis bearing. A steering tie can vary its displayed span at the actuator. */
function aimLink(l: Link, variable: boolean): number {
  const target = l.mount.getWorldPosition(tip);
  l.link.parent!.worldToLocal(target);
  direction.subVectors(target, l.link.position);
  const scale = direction.length() / l.length;
  l.link.quaternion.copy(l.rest).premultiply(oriented.setFromUnitVectors(l.axis, direction.normalize()));
  if (variable) l.link.scale.y = scale;
  return scale;
}

function suspensionAt(model: Object3D, id: string) {
  const upper = linkAt(model, id, 'Upper'),
    lower = linkAt(model, id, 'Lower');
  const damper = linkAt(model, id, 'Damper'),
    tie = linkAt(model, id, 'Tie');
  // In the chassis YZ plane, the upper ball joint is the intersection of the upper arm's
  // circle about its inboard bearing and the upright's circle about its lower ball joint.
  const area =
    (lower.outer.z - upper.base.z) * (upper.outer.y - upper.base.y) - (lower.outer.y - upper.base.y) * (upper.outer.z - upper.base.z);
  return {
    upper,
    lower,
    damper,
    tie,
    barrel: need(model, `LRV_Barrel_${id}`),
    piston: need(model, `LRV_Piston_${id}`),
    side: Math.sign(lower.outer.z - lower.base.z),
    branch: Math.sign(area),
    uprightLength: upper.outer.distanceTo(lower.outer),
    restTilt: Math.atan2(upper.outer.z - lower.outer.z, upper.outer.y - lower.outer.y),
  };
}

/** The knuckle both changes track and gains camber as the lower arm rotates. All four rigid sides keep their length. */
function setTravel(
  w: { steer: Object3D; pin: Vector3; yaw: number; steerRest: Quaternion; suspension: ReturnType<typeof suspensionAt> },
  travel: number,
) {
  const { upper, lower, side, branch, uprightLength, restTilt } = w.suspension;
  const rise = Math.max(-lower.length + 1e-6, Math.min(lower.length - 1e-6, lower.outer.y + travel - lower.base.y));
  const lowY = lower.base.y + rise,
    lowZ = lower.base.z + side * Math.sqrt(lower.length ** 2 - rise ** 2);
  const dz = lowZ - upper.base.z,
    dy = lowY - upper.base.y;
  const d = Math.hypot(dz, dy);
  const reach = (upper.length ** 2 + d ** 2 - uprightLength ** 2) / (2 * d);
  if (Math.abs(reach) > upper.length) return false; // the four links cannot close beyond this toggle
  const across = branch * Math.sqrt(Math.max(0, upper.length ** 2 - reach ** 2));
  const highZ = upper.base.z + (dz * reach - dy * across) / d;
  const highY = upper.base.y + (dy * reach + dz * across) / d;
  const camber = Math.atan2(highZ - lowZ, highY - lowY) - restTilt;
  const tilt = oriented.setFromAxisAngle(HINGE, camber);
  w.steer.position
    .subVectors(w.pin, lower.outer)
    .applyQuaternion(tilt)
    .add(tip.set(lower.outer.x, lowY, lowZ));
  w.steer.quaternion.copy(w.steerRest).premultiply(turn.setFromAxisAngle(UP, w.yaw)).premultiply(tilt);
  return true;
}

/** Travel follows the lower arm's arc. On an uneven or steep facet the contact can move sideways
 * faster than it approaches the ground, so a failed secant step falls back to a bracketed intersection. */
function seatTread(errorAt: (travel: number) => number, vertical: number, min: number, max: number): void {
  const tolerance = 0.00005;
  let travel = 0,
    previous = 0,
    previousError = 0;
  for (let i = 0; i < 6; i++) {
    const error = errorAt(travel);
    if (Math.abs(error) < tolerance) return;
    if (!Number.isFinite(error)) break;
    const slope = (previousError - error) / (travel - previous);
    previous = travel;
    previousError = error;
    travel += error / (slope > 0.15 && slope < 5 ? slope : vertical);
    if (travel <= min || travel >= max) break;
  }
  // Find the physically reachable intersection nearest the normal ride height. Where the terrain
  // drops clear of the reachable suspension entirely, hold the closest valid pose.
  let best = 0,
    bestError = Infinity,
    left = NaN,
    right = NaN,
    at = min,
    lastError = NaN;
  for (let i = 0; i <= 32; i++) {
    const next = min + ((max - min) * i) / 32;
    const error = errorAt(next);
    if (Math.abs(error) < tolerance) return;
    if (Math.abs(error) < bestError) {
      best = next;
      bestError = Math.abs(error);
    }
    if (error * lastError < 0 && (!Number.isFinite(left) || Math.abs(at + next) < Math.abs(left + right))) {
      left = at;
      right = next;
    }
    at = next;
    lastError = error;
  }
  if (Number.isFinite(left)) {
    const side = Math.sign(errorAt(left));
    for (let i = 0; i < 20; i++) {
      best = (left + right) / 2;
      const error = errorAt(best);
      if (Math.abs(error) < tolerance) return;
      if (Math.sign(error) === side) left = best;
      else right = best;
    }
  } else errorAt(best);
}

export class LunarRover {
  readonly body = new Group();
  readonly eye: Object3D;
  readonly wheels;
  readonly controller: Object3D;
  private readonly controllerRest: Quaternion;
  private readonly chassis;
  private readonly wheelbase: number;
  private readonly ground: Ground;
  distance: number;
  motion: Motion;

  constructor(model: Object3D, ground: Ground, parked?: RoverParking) {
    this.ground = ground;
    this.body.add(model);
    this.body.updateMatrixWorld(true);
    this.eye = need(model, 'LRV_DriverEye');
    this.controller = need(model, 'LRV_HandController');
    this.controllerRest = this.controller.quaternion.clone();
    this.wheels = ['FL', 'FR', 'RL', 'RR'].map((id) => {
      const steer = need(model, 'LRV_Steer_' + id);
      const wheel = need(steer, 'LRV_Wheel_' + id);
      const hub = wheel.getWorldPosition(new Vector3());
      return {
        steer,
        wheel,
        hub,
        pin: steer.getWorldPosition(new Vector3()),
        radius: hub.y,
        suspension: suspensionAt(model, id),
        yaw: 0,
        steerRest: steer.quaternion.clone(),
        wheelRest: wheel.quaternion.clone(),
        phase: 0,
      };
    });
    const [fl, fr, rl] = this.wheels;
    this.wheelbase = fl.hub.x - rl.hub.x;
    // LS006-002-2H §1.3.4: opposed front and rear Ackermann steering, 50° inner-wheel lock.
    // The midpoint follows the same circle as the rear axle of a bicycle with half the wheelbase.
    const half = this.wheelbase / 2;
    const track = fr.pin.z - fl.pin.z;
    const lock = Math.atan(half / (track / 2 + half / Math.tan((50 * Math.PI) / 180)));
    // Operations handbook, sortie profile: 0–14 km/h. Reverse limit and pedal response approximate a hand-driven traverse.
    this.chassis = { wheelbase: half, lock, top: 14 / 3.6, reverse: 1.5 };
    this.motion = { x: parked?.x ?? 0, z: parked?.z ?? 0, heading: parked?.heading ?? 0, speed: 0, steer: 0 };
    this.distance = parked?.distance ?? 0;
    this.groundWheels();
  }

  drive(pedal: number, steering: number, brake: boolean, dt: number): void {
    const old = this.motion;
    const opposing = old.speed < 0 ? 1 : -1;
    const next = roll(old, brake ? (old.speed ? opposing : 0) : pedal, steering, dt, this.chassis);
    if (this.ground.blocked?.(next.x, next.z) || Math.hypot(next.x, next.z) >= this.ground.radius - 2) {
      next.x = old.x;
      next.z = old.z;
      next.heading = old.heading;
      next.speed = 0;
    }
    const travel = next.speed * dt;
    this.motion = next;
    this.distance += Math.abs(travel);
    const curve = Math.tan(next.steer) / this.chassis.wheelbase;
    for (const w of this.wheels) {
      // The spin axis sits outboard of the steering knuckle. Its offset runs along a radius
      // of the turn, changing rolling distance while keeping the same steering angle.
      const along = 1 + curve * w.pin.z;
      const across = curve * w.pin.x;
      w.yaw = Math.atan2(across, along);
      w.phase -= (travel * (Math.hypot(along, across) + curve * (w.hub.z - w.pin.z))) / w.radius;
      w.wheel.quaternion.copy(w.wheelRest).premultiply(turn.setFromAxisAngle(AXLE, w.phase));
    }
    // Pitch and roll of the hand controller from the operations handbook, figure 1-12.
    this.controller.quaternion
      .copy(this.controllerRest)
      .premultiply(turn.setFromAxisAngle(AXLE, brake ? 0.32 : -pedal * 0.24))
      .premultiply(turn.setFromAxisAngle(axis.set(1, 0, 0), -steering * 0.21));
    this.groundWheels();
  }

  private groundWheels(): void {
    const { x, z, heading } = this.motion;
    const cos = Math.cos(heading),
      sin = Math.sin(heading);
    const touches = this.wheels.map(({ hub }) => {
      const dx = hub.x * cos + hub.z * sin,
        dz = -hub.x * sin + hub.z * cos;
      return { x: dx, z: dz, d: this.ground.height(x + dx, z + dz) };
    });
    const plane = fitPlane(touches, 0);
    normal.set(-plane.b, 1, -plane.c).normalize();
    front.set(cos, plane.b * cos - plane.c * sin, -sin).normalize();
    right.crossVectors(front, normal).normalize();
    this.body.position.set(x, plane.a - plane.b * plane.x - plane.c * plane.z, z);
    this.body.quaternion.setFromRotationMatrix(basis.makeBasis(front, normal, right));
    for (const w of this.wheels) {
      const errorAt = (travel: number) => {
        if (!setTravel(w, travel)) return NaN;
        w.wheel.getWorldQuaternion(oriented);
        const axle = direction.copy(AXLE).applyQuaternion(oriented);
        const down = tip.copy(normal).addScaledVector(axle, -normal.dot(axle)).normalize().negate();
        const tread = w.wheel.getWorldPosition(axis).addScaledVector(down, w.radius);
        return this.ground.height(tread.x, tread.z) - tread.y;
      };
      const arm = w.suspension.lower;
      const middle = arm.base.y - arm.outer.y;
      seatTread(errorAt, normal.y, middle - arm.length, middle + arm.length);
      const { upper, lower, damper, tie, piston, barrel } = w.suspension;
      aimLink(upper, false);
      aimLink(lower, false);
      aimLink(tie, true);
      // The rod slides inside the barrel; both pieces retain their own lengths.
      const span = aimLink(damper, true);
      piston.scale.y = barrel.scale.y = 1 / span;
    }
    this.body.updateMatrixWorld(true);
  }
}

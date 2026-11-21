import { type Object3D, Quaternion, Vector3 } from 'three';

/**
 * A vehicle's independent suspension of double wishbones (tools/blender/vehicles.py `suspension: 'wishbone'`; the lunar
 * rover's: lunar-rovers.md): each wheel's upright hangs from an upper and a lower link that swing at their full length
 * about the frame, a damper whose two pieces slide in each other, and a steering tie that follows the knuckle. The model
 * names them under the vehicle's node `<name>`:
 *
 *   <name>_Steer_<corner>               the upright and what it carries: origin on its steering axis, at the hub's height
 *     <name>_Wheel_<corner>             the wheel: rolls about its own Z
 *     <name>_Mount_<corner>_<kind>      where a link's outer end meets it (Upper, Lower, Tie; the Damper's on the lower link)
 *   <name>_Link_<corner>_<kind>         a link: origin on its inner bearing, its own +Y along it to <..._In> and <..._Out>
 *   <name>_Barrel_<corner>, _Piston_    the damper's two pieces, each keeping its own length
 *
 * Everything is worked in the vehicle's own frame and put into each node's parent's, so the pieces may hang from frames
 * of their own (the rover's hinges), as long as those stand as built while it is driven.
 */

const UP = new Vector3(0, 1, 0);
const AXLE = new Vector3(0, 0, 1);
const HINGE = new Vector3(1, 0, 0);
const tip = new Vector3();
const direction = new Vector3();
const oriented = new Quaternion();
const turn = new Quaternion();
const axis = new Vector3();
const local = new Vector3();

function need(root: Object3D, name: string): Object3D {
  const part = root.getObjectByName(name);
  if (!part) throw new Error(`${root.name} is missing ${name}`);
  return part;
}

/** A point of a node in the vehicle's frame. */
const inVehicle = (root: Object3D, node: Object3D): Vector3 => root.worldToLocal(node.getWorldPosition(new Vector3()));

/** Each link's local +Y runs from its chassis pivot to its outboard joint. */
function linkAt(root: Object3D, id: string, kind: string) {
  const name = `${root.name}_Link_${id}_${kind}`;
  const link = need(root, name);
  const base = inVehicle(root, need(link, `${name}_In`));
  const outer = inVehicle(root, need(link, `${name}_Out`));
  return {
    link,
    mount: need(root, `${root.name}_Mount_${id}_${kind}`),
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

function suspensionAt(root: Object3D, id: string) {
  const upper = linkAt(root, id, 'Upper'),
    lower = linkAt(root, id, 'Lower');
  const damper = linkAt(root, id, 'Damper'),
    tie = linkAt(root, id, 'Tie');
  // In the chassis YZ plane, the upper ball joint is the intersection of the upper arm's
  // circle about its inboard bearing and the upright's circle about its lower ball joint.
  const area =
    (lower.outer.z - upper.base.z) * (upper.outer.y - upper.base.y) - (lower.outer.y - upper.base.y) * (upper.outer.z - upper.base.z);
  return {
    upper,
    lower,
    damper,
    tie,
    barrel: need(root, `${root.name}_Barrel_${id}`),
    piston: need(root, `${root.name}_Piston_${id}`),
    side: Math.sign(lower.outer.z - lower.base.z),
    branch: Math.sign(area),
    uprightLength: upper.outer.distanceTo(lower.outer),
    restTilt: Math.atan2(upper.outer.z - lower.outer.z, upper.outer.y - lower.outer.y),
  };
}

/** One wheel of it: its upright, its wheel and how far each has turned, and its links. */
export interface Corner {
  id: string;
  steer: Object3D;
  wheel: Object3D;
  /** Its hub and its steering pin as built, in the vehicle's frame. */
  hub: Vector3;
  pin: Vector3;
  radius: number;
  /** How far it is steered (about the vertical, radians) and how far it has rolled (about its axle, radians). */
  yaw: number;
  phase: number;
  /** Is its tread on the ground (it bears), or does it hang? */
  contact: boolean;
  /** The upright's turn as built, in the vehicle's frame, and the wheel's in its own parent's. */
  steerRest: Quaternion;
  wheelRest: Quaternion;
  suspension: ReturnType<typeof suspensionAt>;
  /** The upright's parent's turn and place in the vehicle's frame, as built (it is put there in the vehicle's terms). */
  parentTurn: Quaternion;
  parentAt: Vector3;
}

/** The corners a model names (`<name>_Steer_<corner>`), in the order front left, front right, rear left, rear right where it has those. */
export function cornersOf(root: Object3D): Corner[] {
  root.updateWorldMatrix(true, true);
  const prefix = `${root.name}_Steer_`;
  const ids: string[] = [];
  root.traverse((o) => {
    if (o.name.startsWith(prefix)) ids.push(o.name.slice(prefix.length));
  });
  const order = ['FL', 'FR', 'RL', 'RR'];
  ids.sort((a, b) => (order.indexOf(a) + 1 || 9) - (order.indexOf(b) + 1 || 9) || a.localeCompare(b));
  const rootTurn = root.getWorldQuaternion(new Quaternion()).invert();
  return ids.map((id) => {
    const steer = need(root, prefix + id);
    const wheel = need(steer, `${root.name}_Wheel_${id}`);
    const hub = inVehicle(root, wheel);
    const parent = steer.parent!;
    const parentTurn = rootTurn.clone().multiply(parent.getWorldQuaternion(new Quaternion()));
    return {
      id,
      steer,
      wheel,
      hub,
      pin: inVehicle(root, steer),
      radius: hub.y,
      yaw: 0,
      phase: 0,
      contact: true,
      steerRest: parentTurn.clone().multiply(steer.quaternion),
      wheelRest: wheel.quaternion.clone(),
      suspension: suspensionAt(root, id),
      parentTurn,
      parentAt: inVehicle(root, parent),
    };
  });
}

/**
 * Put a corner's upright where its lower arm's travel `travel` (metres up from as built, along the lower ball joint's
 * arc) has it: the knuckle both changes track and gains camber as the lower arm rotates, all four rigid sides keeping
 * their length. False beyond the toggle the four links cannot close past.
 */
export function setTravel(w: Corner, travel: number): boolean {
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
  // (worked in the vehicle's frame, and put in the upright's parent's)
  local
    .subVectors(w.pin, lower.outer)
    .applyQuaternion(tilt)
    .add(tip.set(lower.outer.x, lowY, lowZ))
    .sub(w.parentAt)
    .applyQuaternion(turn.copy(w.parentTurn).invert());
  w.steer.position.copy(local);
  w.steer.quaternion
    .copy(w.steerRest)
    .premultiply(turn.setFromAxisAngle(UP, w.yaw))
    .premultiply(tilt)
    .premultiply(oriented.copy(w.parentTurn).invert());
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

/**
 * Stand each corner as the frame now stands (its node already placed): one that bears has its tread put on the ground
 * (`height`) along its lower arm's arc; one that hangs is let down to `droop` (metres of travel from as built, negative);
 * then every link is aimed at its mount and the damper's pieces slid in each other. `up` is the frame's up in the world.
 */
export function standCorners(corners: Corner[], up: Vector3, height: (x: number, z: number) => number, droop: number): void {
  for (const w of corners) {
    const arm = w.suspension.lower;
    const middle = arm.base.y - arm.outer.y;
    if (w.contact) {
      const errorAt = (travel: number) => {
        if (!setTravel(w, travel)) return NaN;
        w.wheel.getWorldQuaternion(oriented);
        const wheelAxle = direction.copy(AXLE).applyQuaternion(oriented);
        const down = tip.copy(up).addScaledVector(wheelAxle, -up.dot(wheelAxle)).normalize().negate();
        const tread = w.wheel.getWorldPosition(axis).addScaledVector(down, w.radius);
        return height(tread.x, tread.z) - tread.y;
      };
      seatTread(errorAt, up.y, middle - arm.length, middle + arm.length);
    } else setTravel(w, Math.max(middle - arm.length + 1e-3, droop));
    const { upper, lower, damper, tie, piston, barrel } = w.suspension;
    aimLink(upper, false);
    aimLink(lower, false);
    aimLink(tie, true);
    // The rod slides inside the barrel; both pieces retain their own lengths.
    const span = aimLink(damper, true);
    piston.scale.y = barrel.scale.y = 1 / span;
  }
}

/**
 * Steer and roll the corners for a turn of `curve` (1/metres, about the middle of the wheelbase: both ends steer, each
 * on its own Ackermann geometry) and `travel` metres gone. The spin axis sits outboard of the steering knuckle: its
 * offset runs along a radius of the turn, changing rolling distance while keeping the same steering angle.
 */
export function steerCorners(corners: Corner[], curve: number, travel: number): void {
  for (const w of corners) {
    const along = 1 + curve * w.pin.z;
    const across = curve * w.pin.x;
    w.yaw = Math.atan2(across, along);
    w.phase -= (travel * (Math.hypot(along, across) + curve * (w.hub.z - w.pin.z))) / w.radius;
    w.wheel.quaternion.copy(w.wheelRest).premultiply(turn.setFromAxisAngle(AXLE, w.phase));
  }
}

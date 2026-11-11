import * as THREE from 'three';

/**
 * Driving. Any vehicle built to the contract (tools/blender/vehicles.py: one node with its
 * origin on the ground under the middle of its rear axle, facing its own +X, with `vehicle`,
 * `wheelbase`, `wheel_radius` and `turning_circle` in its extras, and under it
 * `<name>_Wheel_n`, `<name>_Knuckle_n` with `<name>_SteerWheel_n`, `<name>_Seat_Driver` and
 * `<name>_Stand_Driver`) can be got into and driven. This first version is kinematic: a bicycle
 * model, no suspension, no slip. What it needs of the world it asks through `Road`, so that a
 * physics engine can take the place of `roll` later without anything above it changing.
 *
 *   roll     where a vehicle is a moment later, given the pedals and the wheel (pure)
 *   Vehicle  one vehicle's nodes: it is put where `roll` says, its wheels turned and steered
 */

export interface Motion {
  /** The middle of the rear axle over the ground, metres, in the world. */
  x: number;
  z: number;
  /** Which way it faces: radians about the vertical; 0 faces +X and a positive turn is to its left. */
  heading: number;
  /** Along its own nose, m/s: negative in reverse. */
  speed: number;
  /** The front wheels' angle, radians: positive to the left. */
  steer: number;
  /** How long it has stood still with the brake on, seconds: after a moment of that, the brake pedal is reverse. */
  halted?: number;
}

export interface Chassis {
  wheelbase: number;
  /** The most the front wheels turn, radians. */
  lock: number;
  /** Flat out, forward and in reverse, m/s. */
  top: number;
  reverse: number;
}

/** What a turning circle (between kerbs, metres) means for the front wheels of a wheelbase: how far they turn at full lock. */
export const lockFor = (wheelbase: number, turningCircle: number): number => Math.atan(wheelbase / Math.max(wheelbase, turningCircle / 2));

/** How hard it gathers speed, brakes, and slows with the pedals let go, m/s²; how fast the wheel is turned, radians a second; and the speed at which only half the lock is to be had. */
const POWER = 2.4;
const BRAKES = 6.5;
const DRAG = 0.9;
const WHEEL = 1.4;
const CALM = 7;
/** How long it stands on the brake before the brake pedal means reverse, seconds. */
const PAUSE = 0.3;

/**
 * A vehicle a moment later. `pedal` is 1 for the throttle, -1 for the brake (and, once stopped,
 * reverse), 0 for neither; `wheel` is 1 for full lock to the left, -1 to the right. It follows
 * its rear axle round the circle its front wheels point along; the faster it goes, the less
 * lock there is to be had, so it cannot be thrown round at speed.
 */
export function roll(from: Motion, pedal: number, wheel: number, dt: number, chassis: Chassis): Motion {
  let { speed, steer } = from;
  const p = Math.max(-1, Math.min(1, pedal));
  if (p > 0) speed = speed < 0 ? Math.min(0, speed + BRAKES * dt) : Math.min(chassis.top, speed + POWER * p * dt);
  else if (p < 0) {
    if (speed > 0) speed = Math.max(0, speed - BRAKES * -p * dt);
    else if (speed < 0 || (from.halted ?? 0) >= PAUSE) speed = Math.max(-chassis.reverse, speed - POWER * 0.6 * -p * dt);
  } else speed = Math.abs(speed) <= DRAG * dt ? 0 : speed - Math.sign(speed) * DRAG * dt;
  const most = chassis.lock / (1 + (speed / CALM) ** 2);
  const want = Math.max(-1, Math.min(1, wheel)) * most;
  steer = Math.abs(want - steer) <= WHEEL * dt ? want : steer + Math.sign(want - steer) * WHEEL * dt;
  steer = Math.max(-most, Math.min(most, steer));
  const heading = from.heading + (speed / chassis.wheelbase) * Math.tan(steer) * dt;
  // (forward of a heading is (cos, -sin) over the ground: the viewer's +X turned to the left is toward -Z)
  const mid = (from.heading + heading) / 2;
  const halted = speed === 0 && p < 0 ? (from.halted ?? 0) + dt : 0;
  return { x: from.x + Math.cos(mid) * speed * dt, z: from.z - Math.sin(mid) * speed * dt, heading, speed, steer, halted };
}

/** What a vehicle asks of the world it drives in. */
export interface Road {
  /** The height of the ground under a point, looked for from a little above `near`; null where there is none. */
  ground(x: number, z: number, near: number): number | null;
  /** How far ahead the first solid thing is along a way over the ground, from a point, within `far` metres; null if nothing. */
  ahead(from: THREE.Vector3, way: THREE.Vector3, far: number): number | null;
}

const find = (root: THREE.Object3D, name: string): THREE.Object3D | undefined => {
  const key = name.replace(/[._]/g, '').toLowerCase();
  let found: THREE.Object3D | undefined;
  root.traverse((o) => {
    if (!found && o.name.replace(/[._]/g, '').toLowerCase() === key) found = o;
  });
  return found;
};

/** How many times further the steering wheel turns than the road wheels (a box of the 1950s: about four turns lock to lock). */
const GEARING = 16;
const COLUMN = new THREE.Vector3(0, 1, 0);
const spin = new THREE.Quaternion();
/** The tallest kerb its wheels take, metres: more than that ahead is a wall. */
const KERB = 0.25;

export class Vehicle {
  readonly root: THREE.Object3D;
  readonly chassis: Chassis;
  motion: Motion = { x: 0, z: 0, heading: 0, speed: 0, steer: 0 };
  private readonly radius: number;
  private readonly rolling: THREE.Object3D[] = [];
  private readonly knuckles: THREE.Object3D[] = [];
  /** Its steering wheel, and how it sat when found: it goes round with the front wheels, sixteen times as far. */
  private tiller: { node: THREE.Object3D; rest: THREE.Quaternion } | undefined;
  /** The driver's door, if it has one: the first door there is. */
  door: THREE.Object3D | undefined;
  private readonly seat: THREE.Object3D | undefined;
  private readonly stand: THREE.Object3D | undefined;
  /** How far its body reaches ahead of and behind the rear axle, and to each side, metres. */
  private readonly nose: number;
  private readonly tail: number;
  private readonly half: number;
  private turned = 0;
  private y = 0;

  /** `root` is the vehicle's node. Left out of its extras, a figure is taken: 3 m of wheelbase, 0.35 m wheels, an 12 m turning circle. */
  constructor(root: THREE.Object3D) {
    this.root = root;
    const u = root.userData;
    const wheelbase = Number(u.wheelbase) || 3;
    this.radius = Number(u.wheel_radius) || 0.35;
    this.chassis = { wheelbase, lock: lockFor(wheelbase, Number(u.turning_circle) || 12), top: Number(u.top_speed) || 11, reverse: 3 };
    // Its pieces are found by what the model says they are (extras `steer`, `seat`, `stand`,
    // `steering`), and failing that by the names the contract gives them.
    let seat: THREE.Object3D | undefined;
    let stand: THREE.Object3D | undefined;
    root.traverse((o) => {
      if (o === root) return;
      const tail = o.name.startsWith(root.name) ? o.name.slice(root.name.length) : o.name;
      if (/^_(Steer)?Wheel_\d+$/.test(tail)) this.rolling.push(o);
      if (o.userData.steer || /^_Knuckle_\d+$/.test(tail)) this.knuckles.push(o);
      if (!this.tiller && (o.userData.steering || /^_SteeringWheel$/.test(tail))) this.tiller = { node: o, rest: o.quaternion.clone() };
      // (the driver's is the seat called so, or the first there is)
      if (o.userData.seat && (!seat || /driver/i.test(o.name)) && !/driver/i.test(seat?.name ?? '')) seat = o;
      if (o.userData.stand && (!stand || /driver/i.test(o.name)) && !/driver/i.test(stand?.name ?? '')) stand = o;
      if ((o.userData.door || /^_Door_\d+$/.test(tail)) && (!this.door || /_Door_1$/.test(o.name))) this.door = o;
    });
    // a front wheel without a knuckle of its own is steered as it is, about its hub
    if (!this.knuckles.length) for (const o of this.rolling) if (/_SteerWheel_\d+$/.test(o.name)) this.knuckles.push(o);
    this.seat = seat ?? find(root, `${root.name}_Seat_Driver`);
    this.stand = stand ?? find(root, `${root.name}_Stand_Driver`);
    // its length and width, as built, in its own frame
    root.updateWorldMatrix(true, true);
    const inverse = root.matrixWorld.clone().invert();
    const box = new THREE.Box3();
    const corner = new THREE.Vector3();
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      const b = mesh.geometry.boundingBox!;
      for (const x of [b.min.x, b.max.x])
        for (const y of [b.min.y, b.max.y])
          for (const z of [b.min.z, b.max.z]) box.expandByPoint(corner.set(x, y, z).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse));
    });
    this.nose = Number.isFinite(box.max.x) ? box.max.x : wheelbase + 0.9;
    this.tail = Number.isFinite(box.min.x) ? -box.min.x : 1;
    this.half = Number.isFinite(box.max.z) ? Math.max(box.max.z, -box.min.z) : 0.9;
    this.read();
  }

  /** How far its front wheels are over, as a fraction of full lock: -1 hard right to 1 hard left. */
  get lock(): number {
    return this.motion.steer / this.chassis.lock;
  }

  /** The driver's seat's place and turn in the world: the hip point, with a figure's axes. */
  seatTurn(to: THREE.Quaternion): THREE.Quaternion {
    return (this.seat ?? this.root).getWorldQuaternion(to);
  }

  /** Has it somewhere to sit? */
  get drivable(): boolean {
    return Boolean(this.seat);
  }

  /** Take its place and facing from where its node stands now (it may have been moved since it was last driven). */
  read(): void {
    const p = this.root.getWorldPosition(new THREE.Vector3());
    const m = this.root.matrixWorld.elements;
    this.motion = { x: p.x, z: p.z, heading: Math.atan2(-m[2]!, m[0]!), speed: 0, steer: 0 };
    this.y = p.y;
  }

  /** Where the driver's hips are, and where one stands to get in or has got out to, in the world. */
  hips(to: THREE.Vector3): THREE.Vector3 {
    return (this.seat ?? this.root).getWorldPosition(to);
  }
  standing(to: THREE.Vector3): THREE.Vector3 {
    if (this.stand) return this.stand.getWorldPosition(to);
    // no place marked: beside the driver's door, a step out to the left of the seat
    return this.hips(to).add(
      new THREE.Vector3(Math.sin(this.motion.heading), 0, Math.cos(this.motion.heading)).multiplyScalar(-(this.half + 0.6)),
    );
  }

  /**
   * A frame at the pedals and the wheel. It goes where `roll` takes it unless something solid
   * is in the way of its nose (or its tail, backing), in which case it stops short; it stays on
   * whatever ground is under its axles, nose up or down as that lies.
   */
  drive(pedal: number, wheel: number, dt: number, road: Road): void {
    const was = this.motion;
    let next = roll(was, pedal, wheel, dt, this.chassis);
    const going = Math.sign(next.speed);
    if (going) {
      const way = new THREE.Vector3(Math.cos(was.heading) * going, 0, -Math.sin(was.heading) * going);
      const side = new THREE.Vector3(-way.z, 0, way.x);
      const reach = going > 0 ? this.nose : this.tail;
      const travel = Math.abs(next.speed) * dt + 0.15;
      // across its width at bumper height, and lower for a kerb too tall to climb
      for (const off of [-this.half, 0, this.half])
        for (const up of [KERB + 0.05, 0.6]) {
          const from = new THREE.Vector3(was.x, this.y + up, was.z).addScaledVector(side, off);
          const hit = road.ahead(from, way, reach + travel);
          if (hit !== null && hit < reach + travel) next = { ...was, speed: 0, steer: next.steer };
        }
    }
    this.motion = next;
    const rear = road.ground(next.x, next.z, this.y);
    const fx = next.x + Math.cos(next.heading) * this.chassis.wheelbase;
    const fz = next.z - Math.sin(next.heading) * this.chassis.wheelbase;
    const front = road.ground(fx, fz, this.y);
    // (its height follows the ground at up to 3 m/s: a kerb is climbed, not jumped)
    if (rear !== null) this.y += Math.max(-3 * dt, Math.min(3 * dt, rear - this.y));
    const pitch = rear !== null && front !== null ? Math.atan2(front - rear, this.chassis.wheelbase) : 0;
    this.place(pitch);
    this.turned += (next.speed * dt) / this.radius;
    // a wheel's axle is across the vehicle (its own Z here): forward rolls it about that, top going forward
    for (const wheel of this.rolling) wheel.rotation.z = -this.turned;
    for (const knuckle of this.knuckles) {
      knuckle.rotation.order = 'YZX';
      knuckle.rotation.y = next.steer;
    }
    // the steering wheel goes round with them: about its own column, as many times further as the box is geared
    if (this.tiller) this.tiller.node.quaternion.copy(this.tiller.rest).multiply(spin.setFromAxisAngle(COLUMN, next.steer * GEARING));
  }

  /** Put the node where the motion has it, in whatever frame its parent is in. */
  private place(pitch: number): void {
    const parent = this.root.parent;
    const at = new THREE.Vector3(this.motion.x, this.y, this.motion.z);
    let turn = this.motion.heading;
    if (parent) {
      parent.updateWorldMatrix(true, false);
      parent.worldToLocal(at);
      const m = parent.matrixWorld.elements;
      turn -= Math.atan2(-m[2]!, m[0]!);
    }
    this.root.position.copy(at);
    this.root.rotation.order = 'YZX';
    this.root.rotation.set(0, turn, pitch);
    this.root.updateMatrixWorld(true);
  }
}

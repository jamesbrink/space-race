import * as THREE from 'three';
import type { Driving } from '../../sound/audio.ts';
import type { Part } from '../../types.ts';
import { fitPlane } from '../runs.ts';
import { type Corner, cornersOf, standCorners, steerCorners } from './suspension.ts';
import type { Solids } from './walk.ts';

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
 *   rollOn   the same for one on its own suspension, whose motors, brakes and turns are what the ground gives (pure)
 *   Vehicle  one vehicle's nodes: it is put where `roll` says, its wheels turned and steered
 *
 * A vehicle whose model says more (vehicles.py's extras) is driven as it says. `rear_steer`: both ends steer, opposed,
 * and it turns about the middle of its wheelbase, where its origin is. `suspension: 'wishbone'`: its wheels hang on
 * double wishbones (suspension.ts) and it rides on them under the place's gravity (`Vehicle.gravity`): its frame heaves,
 * pitches and rolls on their springs at a fixed rate, a wheel that is lifted off the ground hangs, and with none on the
 * ground it flies; its motors, its brakes and how tight it can turn are what the ground under its wheels gives
 * (`rollOn`). The lunar rover is the one.
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
  /** How fast its wheels are turned, radians a second of `steer` (left out: `WHEEL`, a car's). */
  rate?: number;
}

/** What a turning circle (between kerbs, metres) means for the front wheels of a wheelbase: how far they turn at full lock. */
export const lockFor = (wheelbase: number, turningCircle: number): number => {
  // the circle between kerbs is the outer front wheel's; the rear axle, which the bicycle model turns about, runs inside it
  const front = Math.max(turningCircle / 2, wheelbase * Math.SQRT2);
  return Math.atan(wheelbase / Math.sqrt(front * front - wheelbase * wheelbase));
};

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
  const rate = chassis.rate ?? WHEEL;
  steer = Math.abs(want - steer) <= rate * dt ? want : steer + Math.sign(want - steer) * rate * dt;
  steer = Math.max(-most, Math.min(most, steer));
  const heading = from.heading + (speed / chassis.wheelbase) * Math.tan(steer) * dt;
  // (forward of a heading is (cos, -sin) over the ground: the viewer's +X turned to the left is toward -Z)
  const mid = (from.heading + heading) / 2;
  const halted = speed === 0 && p < 0 ? (from.halted ?? 0) + dt : 0;
  return { x: from.x + Math.cos(mid) * speed * dt, z: from.z - Math.sin(mid) * speed * dt, heading, speed, steer, halted };
}

/** What the ground gives a vehicle on its own suspension (`rollOn`), and what pulls it. */
export interface Traction {
  /** What falls here falls by, m/s². */
  gravity: number;
  /** All it weighs as it is driven, kg, and its motors' power together, W. */
  mass: number;
  power: number;
  /** The most the ground gives its tyres along or across, as a share of its weight (a coefficient of friction). */
  grip: number;
  /** What it loses to rolling, as a share of its weight. */
  rolling: number;
  /** The sine of its slope along its nose, positive with its nose up. */
  slope: number;
  /** The share of its wheels bearing on the ground, 0 to 1: nothing drives, brakes or steers it with none. */
  bearing: number;
}

/**
 * A vehicle on its own suspension a moment later: `roll`'s pedals and wheel, but what drives it is its motors' power
 * over its speed and what stops it its brakes, neither more than the ground under its wheels gives (`grip`); it loses
 * speed rolling and to the slope; and it turns as its wheels point only as tight as the ground holds it across, past
 * which it slides wide (its wheels still pointing as they are steered). Its wheel turns at `chassis.rate` and is not
 * cut back with speed: the ground does that. With no wheel on the ground nothing it does changes where it goes.
 */
export function rollOn(from: Motion, pedal: number, wheel: number, dt: number, chassis: Chassis, t: Traction): Motion {
  let { speed, steer } = from;
  const p = Math.max(-1, Math.min(1, pedal));
  const held = t.grip * t.gravity * t.bearing;
  const drive = Math.min(held, t.power / (t.mass * Math.max(Math.abs(speed), 0.5)));
  // (the pedal against the way it goes, or held on it stopped, is the brake)
  let braking = false;
  if (p > 0) {
    if (speed < 0) {
      speed = Math.min(0, speed + held * p * dt);
      braking = true;
    } else if (speed < chassis.top) speed = Math.min(chassis.top, speed + drive * p * dt);
  } else if (p < 0) {
    if (speed > 0) {
      speed = Math.max(0, speed - held * -p * dt);
      braking = true;
    } else if (speed > -chassis.reverse && (speed < 0 || (from.halted ?? 0) >= PAUSE)) speed = Math.max(-chassis.reverse, speed - drive * 0.6 * -p * dt);
    else braking = speed === 0;
  }
  // (rolling, and the slope's pull while it moves: stood still, or braked to a stand, its brakes hold it)
  if (speed !== 0 || (p !== 0 && !braking)) {
    const lost = t.rolling * t.gravity * t.bearing * dt;
    const was = speed;
    speed = Math.abs(speed) <= lost && p === 0 ? 0 : speed - Math.sign(speed) * Math.min(Math.abs(speed), lost);
    speed -= t.gravity * t.slope * t.bearing * dt;
    if (braking && Math.sign(speed) !== Math.sign(was)) speed = 0;
  }
  const want = Math.max(-1, Math.min(1, wheel)) * chassis.lock;
  const rate = chassis.rate ?? WHEEL;
  steer = Math.abs(want - steer) <= rate * dt ? want : steer + Math.sign(want - steer) * rate * dt;
  // how tight it turns: as its wheels point, as far as the ground holds it across
  let curve = Math.tan(steer) / chassis.wheelbase;
  const across = speed * speed * Math.abs(curve);
  if (across > held) curve = held > 0 ? (Math.sign(curve) * held) / (speed * speed) : 0;
  if (t.bearing === 0) curve = 0;
  const heading = from.heading + speed * curve * dt;
  const mid = (from.heading + heading) / 2;
  const halted = speed === 0 && p < 0 ? (from.halted ?? 0) + dt : 0;
  return { x: from.x + Math.cos(mid) * speed * dt, z: from.z - Math.sin(mid) * speed * dt, heading, speed, steer, halted };
}

/** What a vehicle asks of the world it drives in. */
export interface Road {
  /**
   * What could be under it or in its way this frame: the world round `centre` within `reach` metres sideways, `below` under
   * it and `above` over it, gathered before it asks `ground` and `ahead` (left out: they are asked of the whole world).
   */
  around?(centre: THREE.Vector3, reach: number, below: number, above: number): void;
  /** The height of the ground under a point, looked for from a little above `near`; null where there is none. */
  ground(x: number, z: number, near: number): number | null;
  /** How far ahead the first solid thing is along a way over the ground, from a point, within `far` metres; null if nothing. */
  ahead(from: THREE.Vector3, way: THREE.Vector3, far: number): number | null;
  /** What the last `ahead` that found something found, named by its mesh and the nodes it hangs from (said of a vehicle that is held, `Vehicle.blockedBy`). */
  struck?(): string | null;
}

/**
 * A road on the walker's solids (walk.ts `Solids`) and the open ground (`land`): with a gather of its own, made round the
 * vehicle each frame (`around`), so what it stands on and what is in its way are asked of what is round it and not of
 * whatever the solids last gathered for someone else (the walker's camera, the stage's indoors check, the near plane).
 */
export function roadOn(solids: Solids, land: (x: number, z: number) => number | null): Road {
  const own = solids.gathering();
  let struck: string | null = null;
  return {
    around: (centre, reach, below, above) => solids.within(own, () => solids.gather(centre, reach, below, above)),
    ground: (x, z, near) => solids.within(own, () => solids.below(x, near + 0.6, z, land(x, z))),
    ahead: (from, way, far) =>
      solids.within(own, () => {
        const hit = solids.cast(from, way, far);
        struck = hit ? nameOf(hit.mesh) : null;
        return hit?.distance ?? null;
      }),
    struck: () => struck,
  };
}

/** A mesh as it is told in words: its own name and the (up to) two named nodes it hangs from, inner to outer. */
const nameOf = (mesh: THREE.Object3D): string => {
  const names = [mesh.name || '(unnamed mesh)'];
  for (let o = mesh.parent; o && names.length < 3; o = o.parent)
    if (o.name && o.type !== 'Scene' && o.name !== names.at(-1)) names.push(o.name);
  return names.join(' < ');
};

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
const AXLE_Z = new THREE.Vector3(0, 0, 1);
const AXLE_X = new THREE.Vector3(1, 0, 0);
/** The tallest kerb its wheels take, metres: more than that ahead is a wall. */
const KERB = 0.25;
/** What falls on the Earth falls by, m/s²: a vehicle not told where it is (`Vehicle.gravity`). */
const G0 = 9.80665;
/** A vehicle on its suspension is stepped at this rate whatever the frames, the rest carried (walking.md, "Loose things tick at a fixed rate"), s. */
const TICK = 1 / 120;
/**
 * On its suspension, estimated: the share of its weight its tyres take along or across before they slip (wire mesh in
 * the lunar soil: the mobility reports in docs/sources.md, not read for a figure), what rolling costs it, how far a wheel
 * goes up past where it rides before it meets its bump stop (m), how much stiffer that stop is than the spring, and the
 * dampers' share of critical. Its reverse, m/s.
 */
const GRIP = 0.6;
const ROLLING = 0.08;
const JOUNCE = 0.1;
const STOP = 20;
const DAMPING = 0.3;
const BACKING = 1.5;
/** The hand controller's throw, radians: forward to its hard stop (about 14 degrees) and to the side (LS006-002-2H figures 1-12 and 1-13). */
const STICK_PITCH = 0.24;
const STICK_ROLL = 0.21;

/**
 * How a vehicle on its own suspension stands and moves up and down on it, in the world: its origin's height and how fast
 * that changes, and its pitch (nose up) and roll (its right side down), each with its rate; each wheel's spring as it was
 * a tick ago (for its damper); and the time not yet stepped.
 */
interface Bounce {
  vy: number;
  pitch: number;
  wp: number;
  roll: number;
  wr: number;
  last: number[];
  owed: number;
  /** Its springs: rate (N/m a wheel), its weight's share at rest (m of spring), its dampers (N·s/m), what it weighs (kg) and how it turns (kg·m²). */
  k: number;
  rest: number;
  damper: number;
  mass: number;
  pitchInertia: number;
  rollInertia: number;
  power: number;
}

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
  /** Every door it has: left out of its size (`measure`), which is the body's however they stand. */
  private readonly doors: THREE.Object3D[] = [];
  private readonly seat: THREE.Object3D | undefined;
  private readonly stand: THREE.Object3D | undefined;
  /**
   * How far its body reaches ahead of and behind the rear axle, and to each side, metres, as it stands when it is got into
   * (a tower folded or not), its doors left out: it is got into with the driver's open, and measured with it the GAZ-21 at
   * Site 1 was 3.8 m wide, its far side a metre off its flank, and would not go forward past a wall's corner it cleared.
   */
  private nose = 0;
  private tail = 0;
  private half = 0;
  /** The top of it over the ground, metres. */
  private top = 0;
  private turned = 0;
  private y = 0;
  /** How far the pedal that drives it was down in the last frame, 0 to 1: the throttle forward, the brake once it is backing. */
  private throttle = 0;
  /** What held it this frame, named (`Road.struck`): null while it is not held. */
  blockedBy: string | null = null;
  /** Both ends steer, opposed (extras `rear_steer`): it turns about the middle of its wheelbase, where its origin is. */
  readonly rearSteer: boolean;
  /** Its wheels on their double wishbones (extras `suspension: 'wishbone'`), each with whether it bears. Empty for a vehicle without. */
  readonly corners: Corner[] = [];
  /** How it rides on them: null for a vehicle without its own suspension, which is put on the ground as it goes. */
  private readonly bounce: Bounce | null = null;
  /** What falls where it is falls by, m/s² (the walker's place: OnFoot tells it). */
  gravity = G0;
  /** Its hand controller (extras `controller`, or `<name>_HandController`), and how it sat when found: it leans with the pedals and the wheel. */
  private stick: { node: THREE.Object3D; rest: THREE.Quaternion } | undefined;
  /** How far it has gone, metres, forward or back. */
  distance = 0;

  /** `root` is the vehicle's node. Left out of its extras, a figure is taken: 3 m of wheelbase, 0.35 m wheels, an 12 m turning circle. */
  constructor(root: THREE.Object3D) {
    this.root = root;
    const u = root.userData;
    const wheelbase = Number(u.wheelbase) || 3;
    this.radius = Number(u.wheel_radius) || 0.35;
    this.rearSteer = Boolean(u.rear_steer);
    // (both ends steering, opposed, it turns as a bicycle of half its wheelbase about its middle)
    const turns = this.rearSteer ? wheelbase / 2 : wheelbase;
    const inner = Number(u.inner_lock);
    const track = Number(u.track) || 1.5;
    // where the model gives its inner wheel's lock, that is its lock (the outer wheel's follows); else its turning circle's
    const lock = inner ? Math.atan(turns / (track / 2 + turns / Math.tan(THREE.MathUtils.degToRad(inner)))) : lockFor(turns, Number(u.turning_circle) || 12);
    const wishbones = u.suspension === 'wishbone';
    this.chassis = {
      wheelbase: turns,
      lock,
      top: Number(u.top_speed) || 11,
      reverse: wishbones ? Math.min(BACKING, Number(u.top_speed) || BACKING) : 3,
      // (lock to lock in `steer_time` seconds, where the model says)
      ...(Number(u.steer_time) ? { rate: (2 * lock) / Number(u.steer_time) } : {}),
    };
    if (wishbones) {
      this.corners = cornersOf(root);
      // its springs, from how far it sat down under its payload at the gravity it was rated for (extras): derived; its
      // dampers, stops and how it turns: estimated (a box of its length, breadth and a metre's height)
      const empty = Number(u.mass) || 200;
      const payload = Number(u.payload) || 0;
      const rated = Number(u.rated_gravity) || G0;
      const sag = Math.max(0.01, (Number(u.clearance_empty) || 0) - (Number(u.clearance_loaded) || 0));
      const mass = empty + payload;
      const k = payload ? (payload * rated) / (4 * sag) : (mass * rated) / (4 * 0.1);
      const length = 2 * Math.max(...this.corners.map((c) => Math.abs(c.hub.x)), 1) + 2 * this.radius;
      this.bounce = {
        vy: 0,
        pitch: 0,
        wp: 0,
        roll: 0,
        wr: 0,
        last: [],
        owed: 0,
        k,
        rest: (mass * rated) / (4 * k),
        damper: 2 * DAMPING * Math.sqrt((k * mass) / 4),
        mass,
        pitchInertia: (mass * (length * length + 1)) / 12,
        rollInertia: (mass * (track * track + 1)) / 12,
        power: Number(u.power) || 1000,
      };
    }
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
      if (!this.stick && (o.userData.controller || /^_HandController$/.test(tail))) this.stick = { node: o, rest: o.quaternion.clone() };
      // (the driver's is the seat called so, or the first there is)
      if (o.userData.seat && (!seat || /driver/i.test(o.name)) && !/driver/i.test(seat?.name ?? '')) seat = o;
      if (o.userData.stand && (!stand || /driver/i.test(o.name)) && !/driver/i.test(stand?.name ?? '')) stand = o;
      const door = o.userData.door || /^_Door_\d+$/.test(tail);
      if (door) this.doors.push(o);
      if (door && (!this.door || /_Door_1$/.test(o.name))) this.door = o;
    });
    // a front wheel without a knuckle of its own is steered as it is, about its hub
    if (!this.knuckles.length) for (const o of this.rolling) if (/_SteerWheel_\d+$/.test(o.name)) this.knuckles.push(o);
    this.seat = seat ?? find(root, `${root.name}_Seat_Driver`);
    this.stand = stand ?? find(root, `${root.name}_Stand_Driver`);
    this.read();
  }

  /** Its length and width as it stands now, in its own frame, but for its doors. */
  private measure(): void {
    const root = this.root;
    const wheelbase = this.chassis.wheelbase;
    root.updateWorldMatrix(true, true);
    const inverse = root.matrixWorld.clone().invert();
    const box = new THREE.Box3();
    const corner = new THREE.Vector3();
    const inDoor = (o: THREE.Object3D): boolean => {
      for (let p: THREE.Object3D | null = o; p && p !== root; p = p.parent) if (this.doors.includes(p)) return true;
      return false;
    };
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || inDoor(mesh)) return;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      const b = mesh.geometry.boundingBox!;
      for (const x of [b.min.x, b.max.x])
        for (const y of [b.min.y, b.max.y])
          for (const z of [b.min.z, b.max.z]) box.expandByPoint(corner.set(x, y, z).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse));
    });
    this.nose = Number.isFinite(box.max.x) ? box.max.x : wheelbase + 0.9;
    this.tail = Number.isFinite(box.min.x) ? -box.min.x : 1;
    this.half = Number.isFinite(box.max.z) ? Math.max(box.max.z, -box.min.z) : 0.9;
    this.top = Number.isFinite(box.max.y) ? box.max.y : 1.5;
  }

  /**
   * Where a chase view of it sits from a point in its cab (the driver's eyes): far enough back
   * to be clear of its tail and see the whole of it, and above its roof. Metres behind that
   * point along its length, and above it.
   */
  chase(from: THREE.Vector3): { back: number; up: number } {
    const local = this.root.worldToLocal(from.clone());
    const back = local.x + this.tail + 4;
    // (not so high that it looks down on a tower laid over the cab more than on the vehicle)
    return { back, up: THREE.MathUtils.clamp(this.top + 1.2 - local.y, 0.8, 0.45 * back) };
  }

  /** How far its front wheels are over, as a fraction of full lock: -1 hard right to 1 hard left. */
  get lock(): number {
    return this.motion.steer / this.chassis.lock;
  }

  /** The driver's seat's place and turn in the world: the hip point, with a figure's axes. */
  seatTurn(to: THREE.Quaternion): THREE.Quaternion {
    return (this.seat ?? this.root).getWorldQuaternion(to);
  }

  /** Where on its steering wheel's rim the hands go, in the wheel's own frame (found the first time they are asked for). */
  private rim: THREE.Vector3[] | null = null;

  /**
   * Where the driver's hands hold the wheel, in the world: at ten to two on the rim, going round
   * with it. `left` is the driver's left, as a way in the world (to tell the two hands apart).
   * False if it has no steering wheel.
   */
  grips(left: THREE.Vector3, toL: THREE.Vector3, toR: THREE.Vector3): boolean {
    const tiller = this.tiller;
    if (!tiller) return false;
    if (!this.rim) {
      // the rim lies square to the column (the node's own Y), as far out as the wheel reaches, less half the rim's thickness
      const box = new THREE.Box3();
      tiller.node.updateWorldMatrix(true, true);
      const inverse = tiller.node.matrixWorld.clone().invert();
      tiller.node.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        box.union(mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld.clone().premultiply(inverse)));
      });
      const radius = box.isEmpty() ? 0.2 : Math.max(0.1, Math.min(box.max.x - box.min.x, box.max.z - box.min.z) / 2 - 0.012);
      // twelve o'clock is the way up from the hub as the wheel stands at rest, in its own frame
      const turn = (tiller.node.parent?.getWorldQuaternion(new THREE.Quaternion()) ?? new THREE.Quaternion()).multiply(tiller.rest);
      const twelve = new THREE.Vector3(0, 1, 0).applyQuaternion(turn.invert()).setY(0);
      if (twelve.lengthSq() < 1e-6) twelve.set(1, 0, 0);
      twelve.normalize();
      // the hands at ten to two: sixty degrees either side of the top, about the column
      this.rim = [-1, 1].map((k) =>
        twelve
          .clone()
          .applyAxisAngle(COLUMN, (k * Math.PI) / 3)
          .multiplyScalar(radius),
      );
    }
    const [a, b] = this.rim.map((p) => tiller.node.localToWorld(p.clone()));
    const centre = tiller.node.getWorldPosition(new THREE.Vector3());
    // (the two are told apart by which lies further to the driver's left)
    const aLeft = a!.clone().sub(centre).dot(left) > b!.clone().sub(centre).dot(left);
    toL.copy(aLeft ? a! : b!);
    toR.copy(aLeft ? b! : a!);
    return true;
  }

  /** A point given in the driver's seat's own frame, in the world (`to` is changed), and back. */
  fromSeat(to: THREE.Vector3): THREE.Vector3 {
    return (this.seat ?? this.root).localToWorld(to);
  }
  toSeat(to: THREE.Vector3): THREE.Vector3 {
    return (this.seat ?? this.root).worldToLocal(to);
  }

  /** Is this node (part of) its steering wheel? */
  steers(node: THREE.Object3D): boolean {
    for (let o: THREE.Object3D | null = node; o && o !== this.root; o = o.parent) if (o === this.tiller?.node) return true;
    return false;
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
    const b = this.bounce;
    if (b) {
      // (on its suspension it is taken as it stands, tipped however it is: heading, then pitch, then roll)
      const turned = new THREE.Euler().setFromQuaternion(this.root.getWorldQuaternion(new THREE.Quaternion()), 'YZX');
      this.motion.heading = turned.y;
      Object.assign(b, { vy: 0, pitch: turned.z, wp: 0, roll: turned.x, wr: 0, last: [], owed: 0 });
    }
    this.measure();
  }

  /**
   * Stand it at rest on the ground under its wheels where it is, facing as it does: on its suspension, its frame on the
   * plane through the ground under its four hubs, each spring holding its share of its weight; without, on the ground
   * under its axles. What it is first stood on, before anything moves it.
   */
  standOn(road: Road): void {
    const b = this.bounce;
    if (!b) {
      this.drive(0, 0, 0, road);
      return;
    }
    const { x, z, heading } = this.motion;
    const cos = Math.cos(heading);
    const sin = Math.sin(heading);
    const touches = this.corners.map(({ hub }) => {
      const dx = hub.x * cos + hub.z * sin;
      const dz = -hub.x * sin + hub.z * cos;
      return { x: dx, z: dz, d: road.ground(x + dx, z + dz, this.y + 1) ?? this.y };
    });
    const plane = fitPlane(touches, 0);
    const normal = new THREE.Vector3(-plane.b, 1, -plane.c).normalize();
    const front = new THREE.Vector3(cos, plane.b * cos - plane.c * sin, -sin).normalize();
    const right = new THREE.Vector3().crossVectors(front, normal).normalize();
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(front, normal, right));
    const turned = new THREE.Euler().setFromQuaternion(q, 'YZX');
    this.y = plane.a - plane.b * plane.x - plane.c * plane.z;
    this.motion = { ...this.motion, heading: turned.y, speed: 0 };
    Object.assign(b, { vy: 0, pitch: turned.z, wp: 0, roll: turned.x, wr: 0, last: [], owed: 0 });
    this.ride(0, 0, 0, road, b);
  }

  /** At rest on its suspension, or with none: nothing more will happen to it until it is driven. */
  get still(): boolean {
    const b = this.bounce;
    if (this.motion.speed || this.motion.steer) return false;
    return !b || (Math.abs(b.vy) < 0.002 && Math.abs(b.wp) < 0.002 && Math.abs(b.wr) < 0.002 && this.corners.every((c) => c.contact));
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
    if (this.bounce) {
      this.ride(pedal, wheel, dt, road, this.bounce);
      return;
    }
    const was = this.motion;
    let next = roll(was, pedal, wheel, dt, this.chassis);
    // (the throttle is what drives it: forward, or the brake pedal once it has stopped and backs; braking is not)
    this.throttle = pedal > 0 && was.speed >= 0 ? pedal : pedal < 0 && next.speed < 0 ? -pedal : 0;
    // what is round it, gathered for itself: under it, ahead of its nose and behind its tail as far as it can go this frame
    const most = Math.max(this.nose, this.tail) + Math.abs(next.speed) * dt + 1;
    const middle = new THREE.Vector3(was.x, this.y + this.top / 2, was.z);
    road.around?.(middle, most + this.half, this.top / 2 + 3, this.top / 2 + 1);
    const going = Math.sign(next.speed);
    if (!going) this.blockedBy = null;
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
          if (hit !== null && hit < reach + travel) {
            next = { ...was, speed: 0, steer: next.steer };
            this.blockedBy = road.struck?.() ?? '(something solid)';
          }
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

  /**
   * A frame of a vehicle on its own suspension: what is in its way is looked for once, then it is stepped at `TICK`
   * whatever the frame, each step its springs pushing its frame off the ground under each wheel, the place's gravity
   * pulling it down, and `rollOn` moving it over the ground; then it is put where it is and each wheel stood on the
   * ground, or let hang.
   */
  private ride(pedal: number, wheel: number, dt: number, road: Road, b: Bounce): void {
    const was = this.motion;
    const ahead = Math.abs(was.speed) * dt + 1;
    const middle = new THREE.Vector3(was.x, this.y + this.top / 2, was.z);
    road.around?.(middle, Math.max(this.nose, this.tail) + ahead + this.half, this.top / 2 + 3, this.top / 2 + 1);
    // (going, what is ahead of its nose or behind its tail within a frame's travel and a little: a wall stops it)
    const going = Math.sign(was.speed || pedal);
    this.blockedBy = null;
    let blocked = false;
    if (going) {
      const way = new THREE.Vector3(Math.cos(was.heading) * going, 0, -Math.sin(was.heading) * going);
      const side = new THREE.Vector3(-way.z, 0, way.x);
      const reach = going > 0 ? this.nose : this.tail;
      const travel = Math.abs(was.speed) * dt + 0.15;
      for (const off of [-this.half, 0, this.half])
        for (const up of [KERB + 0.05, 0.6]) {
          const from = new THREE.Vector3(was.x, this.y + up, was.z).addScaledVector(side, off);
          const hit = road.ahead(from, way, reach + travel);
          if (hit !== null && hit < reach + travel) {
            blocked = true;
            this.blockedBy = road.struck?.() ?? '(something solid)';
          }
        }
    }
    this.throttle = pedal > 0 && was.speed >= 0 ? pedal : pedal < 0 && was.speed < 0 ? -pedal : 0;
    b.owed += Math.min(dt, 0.25);
    const g = this.gravity;
    const turn = new THREE.Quaternion();
    const euler = new THREE.Euler(0, 0, 0, 'YZX');
    const at = new THREE.Vector3();
    const hub = new THREE.Vector3();
    let gone = 0;
    while (b.owed >= TICK) {
      b.owed -= TICK;
      const m = this.motion;
      turn.setFromEuler(euler.set(b.roll, m.heading, b.pitch, 'YZX'));
      // each wheel's spring: how far the ground under it puts its hub over where it rides, and what that pushes
      let lift = 0;
      let nose = 0;
      let side = 0;
      let bearing = 0;
      this.corners.forEach((c, i) => {
        at.set(m.x, this.y, m.z).add(hub.copy(c.hub).applyQuaternion(turn));
        const ground = road.ground(at.x, at.z, at.y);
        const spring = ground === null ? -1 : b.rest + ground + c.radius - at.y;
        const rate = b.last[i] === undefined ? 0 : (spring - b.last[i]!) / TICK;
        b.last[i] = spring;
        c.contact = spring > 0;
        if (!c.contact) return;
        bearing++;
        const past = spring - b.rest - JOUNCE;
        const force = Math.max(0, b.k * spring + b.damper * rate + (past > 0 ? STOP * b.k * past : 0));
        lift += force;
        nose += force * c.hub.x;
        side -= force * c.hub.z;
      });
      b.vy += (lift / b.mass - g) * TICK;
      b.wp += (nose / b.pitchInertia) * TICK;
      b.wr += (side / b.rollInertia) * TICK;
      this.y += b.vy * TICK;
      b.pitch += b.wp * TICK;
      b.roll += b.wr * TICK;
      const traction: Traction = {
        gravity: g,
        mass: b.mass,
        power: b.power,
        grip: GRIP,
        rolling: ROLLING,
        slope: Math.sin(b.pitch),
        bearing: bearing / Math.max(1, this.corners.length),
      };
      let next = rollOn(m, blocked ? 0 : pedal, wheel, TICK, this.chassis, traction);
      // (held by what is in its way: it does not go on into it)
      if (blocked && Math.sign(next.speed) === going) next = { ...next, x: m.x, z: m.z, heading: m.heading, speed: 0 };
      gone += Math.hypot(next.x - m.x, next.z - m.z) * Math.sign(next.speed || m.speed);
      this.motion = next;
    }
    this.distance += Math.abs(gone);
    this.place(b.pitch, b.roll);
    this.turned += gone / this.radius;
    // its wheels: steered and rolled for the turn, then each stood on the ground under it or let hang
    steerCorners(this.corners, Math.tan(this.motion.steer) / this.chassis.wheelbase, gone);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.root.getWorldQuaternion(new THREE.Quaternion()));
    standCorners(this.corners, up, (x, z) => road.ground(x, z, this.y + 1) ?? this.y - 10, -b.rest);
    if (this.stick)
      this.stick.node.quaternion
        .copy(this.stick.rest)
        .premultiply(spin.setFromAxisAngle(AXLE_Z, pedal < 0 ? STICK_PITCH * 1.33 : -pedal * STICK_PITCH))
        .premultiply(spin.setFromAxisAngle(AXLE_X, -wheel * STICK_ROLL));
    this.root.updateMatrixWorld(true);
  }

  /**
   * It as it is heard (sound/audio.ts), but for what is under each of its wheels, which the walker asks of the solids:
   * its engine over its front axle, by the name its model gives it (`engine` from a drive's machine, else its `vehicle`),
   * and where each of its wheels is.
   */
  driving(): Omit<Driving, 'under'> {
    const m = this.motion;
    const u = this.root.userData;
    const name = typeof u.engine === 'string' ? u.engine : typeof u.vehicle === 'string' ? u.vehicle : null;
    const ahead = this.chassis.wheelbase;
    const hub = new THREE.Vector3();
    return {
      at: [m.x + Math.cos(m.heading) * ahead, this.y + this.radius, m.z - Math.sin(m.heading) * ahead],
      speed: m.speed,
      top: this.chassis.top,
      throttle: this.throttle,
      engine: name,
      wheels: (this.corners.length ? this.corners.map((c) => c.wheel) : this.rolling).map((w) => w.getWorldPosition(hub).toArray()),
    };
  }

  /** Put the node where the motion has it, in whatever frame its parent is in, its parent turned and tipped however it is. */
  private place(pitch: number, roll?: number): void {
    const parent = this.root.parent;
    const at = new THREE.Vector3(this.motion.x, this.y, this.motion.z);
    if (roll !== undefined) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(roll, this.motion.heading, pitch, 'YZX'));
      if (parent) {
        parent.updateWorldMatrix(true, false);
        parent.worldToLocal(at);
        q.premultiply(parent.getWorldQuaternion(new THREE.Quaternion()).invert());
      }
      this.root.position.copy(at);
      this.root.quaternion.copy(q);
      this.root.updateMatrixWorld(true);
      return;
    }
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

/**
 * A part that drives itself off in its flight's data (a `drive` move on the part's own node) can
 * be driven by hand too, if it is built as the contract above asks (facing +X, rolling about its
 * own Z, its wheels `<node>_Wheel_n` and `<node>_SteerWheel_n`): it is marked a vehicle here
 * from that move's figures, unless its model has marked it already.
 */
export function markDriven(root: THREE.Object3D, parts: Part[]): void {
  for (const part of parts) {
    const drive = part.moves?.find((m) => m.kind === 'drive' && !m.node);
    if (drive?.kind !== 'drive') continue;
    const contract =
      drive.forward[0] === 1 && drive.axle === 'z' && drive.wheels === `${part.node}_Wheel` && drive.steered === `${part.node}_SteerWheel`;
    const node = contract ? root.getObjectByName(part.node) : undefined;
    if (!node) continue;
    const u = node.userData;
    u.vehicle ??= part.name;
    if (drive.machine?.engine) u.engine ??= drive.machine.engine;
    u.wheelbase ??= drive.wheelbase;
    u.wheel_radius ??= drive.wheelRadius;
    if (drive.turningCircle) u.turning_circle ??= drive.turningCircle;
  }
}

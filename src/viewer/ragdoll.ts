import * as THREE from 'three';
// (with its extension: the tests run this file under Node, which adds none)
import { type Joint, jointKey } from './gait.ts';

/**
 * A figure gone limp: what a long fall does to it. No physics engine yet: a handful of points
 * (one at each joint, and at the top of the head and the toes) fall under gravity, are kept the
 * lengths of the bones apart, are kept out of the world, and lose their speed to it; the bones
 * are then turned to lie along the points. It tumbles, comes to rest, and that is all it does:
 * getting up again is a pose (gait.ts: `rising`), not this.
 *
 *   Limp     the points and the sticks between them, and one tick of them (pure: the world is a function it is handed)
 *   Ragdoll  a figure's bones bound to a Limp: taken from the pose it fell in, and put back along the points each frame
 *
 * It stands behind `Tumbler` so that an engine can take its place: start from a pose and a
 * velocity, step against a world, say when it is at rest.
 */

/** The points, by what they are. The first fifteen are the figure's joints (gait.ts), the rest are ends that have no joint of their own. */
export const POINTS = [
  'Hips',
  'Spine',
  'Head',
  'UpperArm.L',
  'UpperArm.R',
  'LowerArm.L',
  'LowerArm.R',
  'Hand.L',
  'Hand.R',
  'UpperLeg.L',
  'UpperLeg.R',
  'LowerLeg.L',
  'LowerLeg.R',
  'Foot.L',
  'Foot.R',
  'Crown',
  'Toe.L',
  'Toe.R',
] as const;
export type Point = (typeof POINTS)[number];
const at = (name: Point): number => POINTS.indexOf(name);

/**
 * What holds the points together: a bone (as long as it is), a brace (the trunk does not fold:
 * as long as it is), or a limit (no nearer than `least` of its length at rest, no further than
 * `most`: an elbow or a knee cannot close completely, a head cannot go right over).
 */
const STICKS: readonly [Point, Point, least?: number, most?: number][] = [
  // the trunk, braced so that it keeps its shape
  ['Hips', 'Spine'],
  ['Spine', 'Head'],
  ['Head', 'Crown'],
  ['Spine', 'UpperArm.L'],
  ['Spine', 'UpperArm.R'],
  ['UpperArm.L', 'UpperArm.R'],
  ['Hips', 'UpperLeg.L'],
  ['Hips', 'UpperLeg.R'],
  ['UpperLeg.L', 'UpperLeg.R'],
  ['UpperArm.L', 'UpperLeg.L'],
  ['UpperArm.R', 'UpperLeg.R'],
  ['UpperArm.L', 'UpperLeg.R'],
  ['UpperArm.R', 'UpperLeg.L'],
  ['Head', 'UpperArm.L'],
  ['Head', 'UpperArm.R'],
  ['Hips', 'Head', 0.9, 1.0],
  ['Spine', 'Crown', 0.8, 1.0],
  // the limbs
  ['UpperArm.L', 'LowerArm.L'],
  ['LowerArm.L', 'Hand.L'],
  ['UpperArm.R', 'LowerArm.R'],
  ['LowerArm.R', 'Hand.R'],
  ['UpperLeg.L', 'LowerLeg.L'],
  ['LowerLeg.L', 'Foot.L'],
  ['Foot.L', 'Toe.L'],
  ['UpperLeg.R', 'LowerLeg.R'],
  ['LowerLeg.R', 'Foot.R'],
  ['Foot.R', 'Toe.R'],
  // what a joint will not do: fold shut, or (the ankle) turn the foot along the shin
  ['UpperArm.L', 'Hand.L', 0.35, 1.0],
  ['UpperArm.R', 'Hand.R', 0.35, 1.0],
  ['UpperLeg.L', 'Foot.L', 0.45, 1.0],
  ['UpperLeg.R', 'Foot.R', 0.45, 1.0],
  ['LowerLeg.L', 'Toe.L', 0.85, 1.05],
  ['LowerLeg.R', 'Toe.R', 0.85, 1.05],
  // the legs do not cross far, and a hand does not go through the trunk
  ['Foot.L', 'Foot.R', 0.5, 6],
  ['LowerLeg.L', 'LowerLeg.R', 0.6, 5],
  ['Hand.L', 'Hips', 0.5, 5],
  ['Hand.R', 'Hips', 0.5, 5],
];

/**
 * What a joint will not do: bend the wrong way. Each is three points, `a` `b` `c`, with the joint
 * at `b`; seen across the trunk's left and right (`l` to `r`), `b` may lie to one `side` of the
 * line from `a` to `c` as far as it likes and to the other only as far as `most` degrees of bend
 * would take it. A knee comes forward of the line from hip to ankle as it bends, and goes back
 * past it only by a few degrees; an elbow goes back of the line from shoulder to wrist; a hip goes
 * back of the line from the chest to the knee as the thigh comes up in front, and forward of it
 * only as far as a thigh swings behind (about 25 degrees). Estimated from the usual ranges of
 * motion. The neck is held by its sticks.
 */
const BENDS: readonly { a: Point; b: Point; c: Point; side: 1 | -1; most: number; l: Point; r: Point }[] = [
  ...(['L', 'R'] as const).flatMap((s) => [
    { a: `UpperLeg.${s}`, b: `LowerLeg.${s}`, c: `Foot.${s}`, side: 1, most: 5, l: 'UpperLeg.L', r: 'UpperLeg.R' } as const,
    { a: `UpperArm.${s}`, b: `LowerArm.${s}`, c: `Hand.${s}`, side: -1, most: 5, l: 'UpperArm.L', r: 'UpperArm.R' } as const,
    { a: 'Spine', b: `UpperLeg.${s}`, c: `LowerLeg.${s}`, side: -1, most: 25, l: 'UpperLeg.L', r: 'UpperLeg.R' } as const,
  ]),
];

/** How big each point is, metres: the head and the trunk are not points. */
const RADIUS: Partial<Record<Point, number>> = { Hips: 0.14, Spine: 0.15, Head: 0.1, Crown: 0.12 };
const SMALL = 0.06;

/**
 * Where a point of this size may not be: given the point, it is moved out of the world and the
 * way out (a unit vector) is returned, or null if it was clear. Given where it was, `from`, a
 * point that has gone right through a surface since (a floor's one face, at the speed of a long
 * fall) is put back on the side it came from.
 */
export type Collide = (point: THREE.Vector3, radius: number, from?: THREE.Vector3) => THREE.Vector3 | null;

const GRAVITY = 9.81;
const t1 = new THREE.Vector3();
const t2 = new THREE.Vector3();
const t3 = new THREE.Vector3();
const t4 = new THREE.Vector3();
/** How much of its speed a point keeps each tick in the air, and along a surface it is touching (the rest is friction). */
const AIR = 0.995;
const GRIP = 0.4;

export class Limp {
  readonly points: THREE.Vector3[] = POINTS.map(() => new THREE.Vector3());
  private readonly before: THREE.Vector3[] = POINTS.map(() => new THREE.Vector3());
  /** Where each point was at the start of the tick (`before` is also its speed, and the world takes speed out of it). */
  private readonly start: THREE.Vector3[] = POINTS.map(() => new THREE.Vector3());
  private readonly sticks: { a: number; b: number; least: number; most: number }[] = [];
  private readonly touching: boolean[] = POINTS.map(() => false);
  /** Each bend (BENDS) with how far its joint may lie on the wrong side of its line, metres, from the bones' lengths at rest. */
  private readonly bends: { a: number; b: number; c: number; side: number; most: number; l: number; r: number }[] = [];
  /** The fastest any point moved in the last tick, m/s. */
  speed = 0;

  /** `rest` is where every point is in the figure standing as built: the sticks are measured off it. */
  constructor(rest: readonly THREE.Vector3[]) {
    for (const bend of BENDS) {
      const ab = rest[at(bend.a)]!.distanceTo(rest[at(bend.b)]!);
      const bc = rest[at(bend.b)]!.distanceTo(rest[at(bend.c)]!);
      // (bent by an angle, the joint lies off the line between the ends by ab·bc·sin(angle) / ac)
      const angle = THREE.MathUtils.degToRad(bend.most);
      const ac = Math.sqrt(ab * ab + bc * bc + 2 * ab * bc * Math.cos(angle));
      this.bends.push({
        a: at(bend.a),
        b: at(bend.b),
        c: at(bend.c),
        side: bend.side,
        most: (ab * bc * Math.sin(angle)) / (ac || 1),
        l: at(bend.l),
        r: at(bend.r),
      });
    }
    for (const [a, b, least, most] of STICKS) {
      const length = rest[at(a)]!.distanceTo(rest[at(b)]!);
      this.sticks.push({ a: at(a), b: at(b), least: length * (least ?? 1), most: length * (most ?? 1) });
    }
  }

  /** Start from where the points are now, all moving at `velocity`, with a turn about a level axis through the hips so that it tumbles and does not fall like a plank. */
  throw(from: readonly THREE.Vector3[], velocity: THREE.Vector3, spin: THREE.Vector3, dt = 1 / 60): void {
    const hips = from[0]!;
    this.points.forEach((p, i) => {
      p.copy(from[i]!);
      const turn = new THREE.Vector3().crossVectors(spin, new THREE.Vector3().subVectors(p, hips));
      this.before[i]!.copy(p).addScaledVector(velocity, -dt).addScaledVector(turn, -dt);
    });
  }

  /** Move every point, and where it was, by the same amount: the figure is somewhere else, doing what it was doing. */
  shift(by: THREE.Vector3): void {
    this.points.forEach((p, i) => {
      p.add(by);
      this.before[i]!.add(by);
    });
  }

  /** A tick: gravity, what holds it together, the world. */
  step(dt: number, collide: Collide, passes = 12): void {
    const g = GRAVITY * dt * dt;
    this.points.forEach((p, i) => {
      const was = this.before[i]!;
      const keep = this.touching[i] ? GRIP : AIR;
      const vx = (p.x - was.x) * keep;
      const vy = (p.y - was.y) * (this.touching[i] ? Math.min(keep, 0.9) : AIR);
      const vz = (p.z - was.z) * keep;
      was.copy(p);
      this.start[i]!.copy(p);
      p.set(p.x + vx, p.y + vy - g, p.z + vz);
    });
    for (let pass = 0; pass < passes; pass++) {
      // what the joints will not do first, so that the bones have the last word on their lengths
      this.joints();
      for (const s of this.sticks) {
        const a = this.points[s.a]!;
        const b = this.points[s.b]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const length = Math.hypot(dx, dy, dz) || 1e-9;
        const want = Math.min(s.most, Math.max(s.least, length));
        if (want === length) continue;
        const half = (length - want) / length / 2;
        a.set(a.x + dx * half, a.y + dy * half, a.z + dz * half);
        b.set(b.x - dx * half, b.y - dy * half, b.z - dz * half);
      }
      // the world, last in each pass: whatever else is asked of a point, it is not inside anything
      if (pass % 2 === 1 || pass === passes - 1)
        this.points.forEach((p, i) => {
          // (from where it started the tick: nothing goes through a floor, between frames or pushed by its own limbs)
          const out = collide(p, RADIUS[POINTS[i]!] ?? SMALL, this.start[i]);
          if (pass === passes - 1) this.touching[i] = out !== null;
          if (!out) return;
          // it does not bounce: what speed it had into the surface is gone
          const was = this.before[i]!;
          const into = (p.x - was.x) * out.x + (p.y - was.y) * out.y + (p.z - was.z) * out.z;
          if (into < 0) was.addScaledVector(out, into);
        });
    }
    this.speed = Math.max(...this.points.map((p, i) => p.distanceTo(this.before[i]!))) / dt;
  }

  /**
   * What the joints will not do, pass by pass (BENDS). A joint on the wrong side of its line is
   * put back on the right side by moving it one way and the two ends the other, so that the
   * three of them, and the figure, do not gain any speed from it: moved alone, a limb pushed off
   * its limit would fling the figure, and one lying against it would never lie still.
   */
  private joints(): void {
    const p = this.points;
    for (const bend of this.bends) {
      const a = p[bend.a]!;
      const b = p[bend.b]!;
      const c = p[bend.c]!;
      const line = t1.subVectors(c, a);
      const length = line.length();
      if (length < 1e-6) continue;
      line.divideScalar(length);
      // across the trunk, square to the line; where the line runs along the trunk's left and right there is no telling front from back, and it is let go by degrees
      const h = t2.subVectors(p[bend.l]!, p[bend.r]!);
      const across = h.length();
      h.addScaledVector(line, -h.dot(line));
      const sure = THREE.MathUtils.smoothstep(h.length() / (across || 1), 0.35, 0.7);
      if (!sure) continue;
      const n = t3.crossVectors(line, h.normalize()); // the front, for a limb hanging at the side
      const off = t4.subVectors(b, a).dot(n) * bend.side;
      if (off >= -bend.most) continue;
      // The joint one way and the ends the other, as much as each is free to go: an end held by the
      // world (lying on the ground) does not move, and the others take its share. (Pushed into the
      // ground and put back by it every pass, an end would leave the joint all the push, and a
      // figure lying against its limits would kick for ever.)
      const by = (-bend.most - off) * sure * bend.side;
      const wa = this.touching[bend.a] ? 0 : 1;
      const wc = this.touching[bend.c] ? 0 : 1;
      const wb = this.touching[bend.b] ? 0 : 2;
      if (!(wa + wb + wc)) continue;
      // (the joint's offset from the line changes by as much as the joint moves less the mean of the ends' moves)
      const k = by / (wb + (wa + wc) / 2);
      this.place(bend.b, n, k * wb);
      this.place(bend.a, n, -k * wa);
      this.place(bend.c, n, -k * wc);
    }
  }

  /** Move a point along a way. */
  private place(i: number, way: THREE.Vector3, by: number): void {
    if (by) this.points[i]!.addScaledVector(way, by);
  }

  /** How far each stick is from the length it should be, as a fraction of it: the worst of them. */
  strain(): number {
    return Math.max(
      ...this.sticks.map((s) => {
        const length = this.points[s.a]!.distanceTo(this.points[s.b]!);
        return length < s.least ? (s.least - length) / s.least : length > s.most ? (length - s.most) / s.most : 0;
      }),
    );
  }
}

/** Something that takes a figure from the moment it hits to the moment it lies still. A physics engine could be one. */
export interface Tumbler {
  /** A frame against the world. */
  step(dt: number, collide: Collide): void;
  /** Lying still for long enough? */
  readonly atRest: boolean;
  /** Where its hips are, in the world. */
  readonly hips: THREE.Vector3;
  /** Is it lying on its front? (Otherwise on its back.) And which way its head points over the ground, a unit (x, z). */
  readonly faceDown: boolean;
  readonly headward: [number, number];
}

/** How slow is still, m/s, and how long it must stay so, seconds; and how long anyone is left lying whatever the points say. */
const STILL = 0.4;
const SETTLE = 0.5;
const LONGEST = 7;

/** The joint each joint's bone points at, where it has one: turning the joint lays its bone along the line to that point. */
const AIMS: readonly [Joint, Point][] = [
  ['Spine', 'Head'],
  ['Head', 'Crown'],
  ['UpperArm.L', 'LowerArm.L'],
  ['LowerArm.L', 'Hand.L'],
  ['UpperArm.R', 'LowerArm.R'],
  ['LowerArm.R', 'Hand.R'],
  ['UpperLeg.L', 'LowerLeg.L'],
  ['LowerLeg.L', 'Foot.L'],
  ['Foot.L', 'Toe.L'],
  ['UpperLeg.R', 'LowerLeg.R'],
  ['LowerLeg.R', 'Foot.R'],
  ['Foot.R', 'Toe.R'],
];

/**
 * A figure's skeleton as a ragdoll: `root` holds the fifteen joints, by name. It must be handed
 * over standing as built once (`measure`), so that the bones' lengths and the way each lies at
 * rest are known; after that it can be thrown from any pose.
 */
export class Ragdoll implements Tumbler {
  private readonly joints = new Map<Point, THREE.Object3D>();
  private readonly limp: Limp;
  /** Where each bone's aim lies from its joint at rest, in the joint's own frame. */
  private readonly lie = new Map<Joint, THREE.Vector3>();
  /** The ends that have no joint: where each is from the joint it belongs to, in that joint's frame. */
  private readonly ends: [Point, Point, THREE.Vector3][] = [];
  private still = 0;
  private age = 0;

  /** `root`, standing as built, with its world matrices up to date. Null if it has not all fifteen joints. */
  static of(root: THREE.Object3D): Ragdoll | null {
    const doll = new Ragdoll(root);
    return doll.joints.size >= 15 ? doll : null;
  }

  private constructor(root: THREE.Object3D) {
    const wanted = new Map(POINTS.slice(0, 15).map((p) => [jointKey(p), p]));
    root.traverse((o) => {
      const point = wanted.get(jointKey(o.name));
      if (point && !this.joints.has(point)) this.joints.set(point, o);
    });
    const world = (p: Point) => this.joints.get(p)?.getWorldPosition(new THREE.Vector3()) ?? new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0).transformDirection(root.matrixWorld);
    const ahead = new THREE.Vector3(0, 0, 1).transformDirection(root.matrixWorld);
    // the ends: the top of the head a hand's length over its joint, each toe ahead of its ankle and down at the sole
    const ankle = world('Foot.L').y - root.getWorldPosition(new THREE.Vector3()).y;
    const extra: [Point, Point, THREE.Vector3][] = [
      ['Crown', 'Head', up.clone().multiplyScalar(0.2)],
      [
        'Toe.L',
        'Foot.L',
        ahead
          .clone()
          .multiplyScalar(0.17)
          .addScaledVector(up, -Math.max(0, ankle - 0.03)),
      ],
      [
        'Toe.R',
        'Foot.R',
        ahead
          .clone()
          .multiplyScalar(0.17)
          .addScaledVector(up, -Math.max(0, ankle - 0.03)),
      ],
    ];
    const rest = POINTS.map((p) => world(p));
    for (const [end, of, offset] of extra) {
      rest[at(end)]!.copy(world(of)).add(offset);
      const inverse = this.joints.get(of)?.getWorldQuaternion(new THREE.Quaternion()).invert() ?? new THREE.Quaternion();
      this.ends.push([end, of, offset.clone().applyQuaternion(inverse)]);
    }
    for (const [joint, aim] of AIMS) {
      const inverse = this.joints.get(joint)?.getWorldQuaternion(new THREE.Quaternion()).invert() ?? new THREE.Quaternion();
      this.lie.set(joint, rest[at(aim)]!.clone().sub(rest[at(joint)]!).applyQuaternion(inverse).normalize());
    }
    this.limp = new Limp(rest);
  }

  /** Go limp from the pose it is in now, moving at `velocity`. */
  throw(velocity: THREE.Vector3): void {
    const from = POINTS.map((p) => this.joints.get(p)?.getWorldPosition(new THREE.Vector3()) ?? new THREE.Vector3());
    for (const [end, of, offset] of this.ends) {
      const joint = this.joints.get(of)!;
      from[at(end)]!.copy(offset).applyQuaternion(joint.getWorldQuaternion(new THREE.Quaternion())).add(from[at(of)]!);
    }
    // it pitches the way it was going: about the level axis across its path, or about its own shoulders' line if it fell straight
    const across = new THREE.Vector3(velocity.z, 0, -velocity.x);
    if (across.lengthSq() < 0.04) across.subVectors(from[at('UpperArm.L')]!, from[at('UpperArm.R')]!).setY(0);
    this.limp.throw(from, velocity, across.normalize().multiplyScalar(-1.6));
    this.still = this.age = 0;
  }

  step(dt: number, collide: Collide): void {
    // in ticks no longer than a sixtieth of a second: a slow frame must not shoot it through a floor
    const ticks = Math.max(1, Math.min(4, Math.ceil(dt * 60)));
    for (let i = 0; i < ticks; i++) this.limp.step(dt / ticks, collide);
    this.age += dt;
    this.still = this.limp.speed < STILL ? this.still + dt : 0;
    this.pose();
  }

  get atRest(): boolean {
    return this.still >= SETTLE || this.age >= LONGEST;
  }

  get hips(): THREE.Vector3 {
    return this.limp.points[0]!;
  }

  /** The way out of its chest: across its shoulders and up its spine say which way that is. */
  private front(): THREE.Vector3 {
    const p = this.limp.points;
    const left = new THREE.Vector3().subVectors(p[at('UpperArm.L')]!, p[at('UpperArm.R')]!);
    const up = new THREE.Vector3().subVectors(p[at('Spine')]!, p[at('Hips')]!);
    return left.cross(up).normalize();
  }

  get faceDown(): boolean {
    return this.front().y < 0;
  }

  get headward(): [number, number] {
    const p = this.limp.points;
    const along = new THREE.Vector3().subVectors(p[at('Head')]!, p[at('Hips')]!).setY(0);
    if (along.lengthSq() < 1e-6) along.set(0, 0, 1);
    along.normalize();
    return [along.x, along.z];
  }

  /** Lay the bones along the points: the hips where theirs is and turned as the trunk is, and each bone after it pointed down its own line. */
  private pose(): void {
    const p = this.limp.points;
    const hips = this.joints.get('Hips')!;
    const parent = hips.parent!;
    parent.updateWorldMatrix(true, false);
    const parentTurn = parent.getWorldQuaternion(new THREE.Quaternion());
    // the trunk's own frame: its left across the hips, its up along the spine, its front out of the belly
    const up = new THREE.Vector3().subVectors(p[at('Spine')]!, p[0]!).normalize();
    const left = new THREE.Vector3().subVectors(p[at('UpperLeg.L')]!, p[at('UpperLeg.R')]!);
    left.addScaledVector(up, -left.dot(up)).normalize();
    const front = new THREE.Vector3().crossVectors(left, up);
    const turn = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(left, up, front));
    hips.position.copy(parent.worldToLocal(p[0]!.clone()));
    hips.quaternion.copy(parentTurn.clone().invert()).multiply(turn);
    const turned = new Map<THREE.Object3D, THREE.Quaternion>([[hips, turn]]);
    for (const [joint, aim] of AIMS) {
      const node = this.joints.get(joint)!;
      // (its parent among the joints has been turned already: the list goes down each limb in order)
      const above = turned.get(node.parent!) ?? node.parent!.getWorldQuaternion(new THREE.Quaternion());
      const want = new THREE.Vector3().subVectors(p[at(aim)]!, p[at(joint)]!).normalize().applyQuaternion(above.clone().invert());
      node.quaternion.setFromUnitVectors(this.lie.get(joint)!, want);
      turned.set(node, above.clone().multiply(node.quaternion));
    }
    hips.updateMatrixWorld(true);
  }

  /** The points, and the fastest of them, for whoever is watching (the tests; a camera). */
  get points(): THREE.Vector3[] {
    return this.limp.points;
  }
  get speed(): number {
    return this.limp.speed;
  }

  /** Lift or shift the whole figure, points and their motion alike. */
  shift(by: THREE.Vector3): void {
    this.limp.shift(by);
  }

  /** How badly the points are being held from where the sticks want them (see Limp.strain), for the tests. */
  get strain(): number {
    return this.limp.strain();
  }
}

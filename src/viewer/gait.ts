import * as THREE from 'three';

/**
 * How a jointed figure moves its limbs when it walks, runs, stands and jumps: no recorded
 * animation, only arithmetic from how far it has gone and how fast. The pose is a pure function
 * (`pose`), and `Gait` applies it to whatever of the joints a figure's model has.
 *
 * The joints are the ones every crew figure is built with (srlib.FIGURE), by name:
 *
 *   Hips ─ Spine ─ Head
 *        │       ├ UpperArm.L ─ LowerArm.L ─ Hand.L      (and .R)
 *        └ UpperLeg.L ─ LowerLeg.L ─ Foot.L              (and .R)
 *
 * Each has its origin on the joint and no rotation at rest, with +X to the figure's left, so a
 * turn about a joint's own X swings what hangs from it forward and back. **Positive is backward**
 * for a limb that hangs: a thigh goes forward with a negative turn, a knee bends with a positive
 * one, an elbow with a negative one, and the spine (which stands up from its joint) leans forward
 * with a positive one. A model with none of these joints is simply not moved.
 */
export const JOINTS = [
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
] as const;
export type Joint = (typeof JOINTS)[number];

/** A turn about each joint's own X, radians, and how far the hips are lifted (negative: lowered), metres. */
export type Pose = Record<Joint, number> & { rise: number };

/** The speeds the two gaits are drawn for, m/s: between them the pose is blended, below the first it fades to standing. */
const WALK = 1.4;
const RUN = 4;

/** A value that is `still` standing, `walk` at a walk and `run` at a run, and in between in between. */
function at(speed: number, walk: number, run: number, still = 0): number {
  if (speed <= WALK) return still + (walk - still) * Math.max(0, speed / WALK);
  return walk + (run - walk) * Math.min(1, (speed - WALK) / (RUN - WALK));
}

/** How far a thigh swings either side of straight down, radians: 25 degrees at a walk, 46 at a run. */
export const swing = (speed: number): number => at(speed, 0.44, 0.8);

/**
 * How far the figure goes in one whole cycle (a step with each foot), metres, on legs `leg`
 * long from hip to sole. It is what the swing of the legs covers, so that a planted foot stays
 * where it was planted; a run has both feet off the ground for part of each step and goes further.
 */
export function cycleLength(speed: number, leg = 0.9): number {
  const v = Math.max(speed, 0.2);
  return 4 * leg * Math.sin(swing(v)) * at(v, 1, 1.35, 1);
}

/**
 * The pose at a point in the cycle. `phase` counts cycles (its whole part does not matter): at 0
 * the legs pass each other with the left about to swing forward; at 0.25 the left foot is
 * furthest forward. `speed` is over the ground, m/s; at 0 the figure stands. `air` is 0 on the
 * ground and 1 off it (a jump, a fall): the legs tuck and the arms come up.
 */
export function pose(phase: number, speed: number, air = 0): Pose {
  const a = phase * Math.PI * 2;
  const s = Math.sin(a);
  const c = Math.cos(a);
  const thigh = swing(speed);
  // a knee bends while its leg swings forward (to clear the ground) and a little as it takes the weight
  const knee = at(speed, 0.95, 1.7);
  const stance = at(speed, 0.09, 0.3);
  const bend = (swinging: number) => stance + knee * Math.max(0, swinging) ** 2;
  const arm = at(speed, 0.26, 0.75);
  const elbow = at(speed, 0.12, 1.35);
  const lean = at(speed, 0.02, 0.16);
  const g = 1 - air;
  const out = {} as Pose;
  out['UpperLeg.L'] = -thigh * s * g - 0.5 * air;
  out['UpperLeg.R'] = thigh * s * g - 0.5 * air;
  out['LowerLeg.L'] = bend(c) * g + 0.9 * air;
  out['LowerLeg.R'] = bend(-c) * g + 0.9 * air;
  // a foot is turned back toward level, most of the way: flat when planted, toe down as it leaves
  out['Foot.L'] = -0.6 * (out['UpperLeg.L'] + out['LowerLeg.L']);
  out['Foot.R'] = -0.6 * (out['UpperLeg.R'] + out['LowerLeg.R']);
  // each arm goes with the opposite leg
  out['UpperArm.L'] = arm * s * g - 0.45 * air;
  out['UpperArm.R'] = -arm * s * g - 0.45 * air;
  out['LowerArm.L'] = -(elbow + 0.3 * arm * Math.max(0, -s)) * g - 0.6 * air;
  out['LowerArm.R'] = -(elbow + 0.3 * arm * Math.max(0, s)) * g - 0.6 * air;
  out['Hand.L'] = out['Hand.R'] = 0;
  out.Hips = 0;
  out.Spine = lean * g;
  out.Head = -0.6 * lean * g;
  // the hips are highest as one leg passes under them and lowest with the legs spread
  out.rise = -0.45 * (1 - Math.cos(thigh)) * Math.abs(s) * g;
  return out;
}

/** A joint's name as any exporter or loader may have left it: `UpperArm.L`, `UpperArm_L` and `UpperArmL` are one joint. */
export const jointKey = (name: string): string => name.replace(/[._\s]/g, '').toLowerCase();

/** The joints one model has, each with how it sat when it was found. */
interface Rig {
  joints: { joint: Joint; node: THREE.Object3D; rest: THREE.Quaternion; y: number }[];
  /** Hip to sole, metres, as built. */
  leg: number;
}

const X = new THREE.Vector3(1, 0, 0);
const turn = new THREE.Quaternion();

/** One figure's walk: where in its cycle it is, and the pose of whichever of its models is on show. */
export class Gait {
  phase = 0;
  /** The speed the pose is drawn for: the figure's own, smoothed, so a start and a stop take a moment. */
  private speed = 0;
  private air = 0;
  private readonly rigs = new WeakMap<THREE.Object3D, Rig | null>();
  private leg = 0.9;

  /** The joints under `root`, found by name the first time it is asked for; null if it has none. */
  private rig(root: THREE.Object3D): Rig | null {
    let rig = this.rigs.get(root);
    if (rig !== undefined) return rig;
    const wanted = new Map(JOINTS.map((j) => [jointKey(j), j]));
    const joints: Rig['joints'] = [];
    root.traverse((o) => {
      const joint = wanted.get(jointKey(o.name));
      if (!joint || joints.some((j) => j.joint === joint)) return;
      joints.push({ joint, node: o, rest: o.quaternion.clone(), y: o.position.y });
    });
    rig = null;
    if (joints.length) {
      const find = (j: Joint) => joints.find((x) => x.joint === j)?.node;
      const hip = find('UpperLeg.L');
      const foot = find('Foot.L');
      const scale = root.getWorldScale(new THREE.Vector3()).y || 1;
      // a foot's joint is at the ankle: the sole is a little under it
      const leg =
        hip && foot ? (hip.getWorldPosition(new THREE.Vector3()).y - foot.getWorldPosition(new THREE.Vector3()).y) / scale + 0.08 : 0.9;
      rig = { joints, leg };
    }
    this.rigs.set(root, rig);
    return rig;
  }

  /** Has this model joints to move? */
  jointed(root: THREE.Object3D): boolean {
    return this.rig(root) !== null;
  }

  /**
   * A frame has passed in which the figure went `distance` metres over the ground at `speed`,
   * on the ground or `airborne`. True if the pose has changed and is worth drawing again.
   */
  advance(distance: number, speed: number, airborne: boolean, dt: number): boolean {
    const was = [this.phase, this.speed, this.air];
    const ease = 1 - Math.exp(-dt * 9);
    this.speed += (speed - this.speed) * ease;
    if (speed === 0 && this.speed < 0.02) this.speed = 0;
    this.air += ((airborne ? 1 : 0) - this.air) * (1 - Math.exp(-dt * 14));
    if (!airborne && this.air < 0.01) this.air = 0;
    // by distance, not by time: the feet go as far as the figure does
    if (!airborne) this.phase = (this.phase + distance / cycleLength(this.speed, this.leg)) % 1;
    if (this.speed === 0 && this.air === 0) this.phase = 0; // standing: the next step starts from the same foot
    return was[0] !== this.phase || was[1] !== this.speed || was[2] !== this.air;
  }

  /** Put the model under `root` in the pose of the moment. False if it has no joints (it is left as built). */
  apply(root: THREE.Object3D): boolean {
    const rig = this.rig(root);
    if (!rig) return false;
    this.leg = rig.leg;
    const p = pose(this.phase, this.speed, this.air);
    for (const { joint, node, rest, y } of rig.joints) {
      node.quaternion.copy(rest).multiply(turn.setFromAxisAngle(X, p[joint]));
      if (joint === 'Hips') node.position.y = y + p.rise;
    }
    return true;
  }

  /** Stand the figure as it was built, and start the next walk from the beginning. */
  rest(root: THREE.Object3D): void {
    this.phase = this.speed = this.air = 0;
    const rig = this.rig(root);
    for (const { joint, node, rest, y } of rig?.joints ?? []) {
      node.quaternion.copy(rest);
      if (joint === 'Hips') node.position.y = y;
    }
  }
}

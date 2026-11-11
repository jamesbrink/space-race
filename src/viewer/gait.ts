import * as THREE from 'three';

/**
 * How a jointed figure moves its limbs when it walks, runs, stands and jumps: no recorded
 * animation, only arithmetic from how far it has gone and how fast. The pose is a pure function
 * (`pose`), and `Gait` applies it to whatever of the joints a figure's model has. `view` is the
 * same moment as the figure's own eyes get it: first person and third are one walk.
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

/**
 * A pose: a turn about each joint's own X, radians, and beside those the little that is not a
 * swing forward or back: how far the hips are lifted (negative: lowered) and shifted to the
 * figure's left, metres, and turns of a few joints about their own Z (sideways: positive swings a
 * hanging limb to the figure's left, and leans the spine to its right) and Y (a twist).
 */
export type Pose = Record<Joint, number> & {
  rise: number;
  shift: number;
  sideways: Partial<Record<Joint, number>>;
  twist: Partial<Record<Joint, number>>;
};

/** Everything a pose depends on. Only `phase` and `speed` are needed; the rest are 0 when left out. */
export interface Moment {
  /** Where in the cycle, in cycles (the whole part does not matter): at 0 the legs pass each other with the left about to swing forward; at 0.25 the left foot lands in front. */
  phase: number;
  /** Over the ground, m/s. At 0 the figure stands. */
  speed: number;
  /** 0 on the ground, 1 off it (a jump, a fall): the legs tuck and the arms come up. */
  air?: number;
  /** How far the knees have given, 0 to about 1.6: a landing, absorbed. 1 is a deep knee-bend. */
  crouch?: number;
  /** Breaths taken, counted in breaths (the whole part does not matter). */
  breath?: number;
  /** What each hand is carrying, 0 (nothing) to 1 (a case by its handle): that arm hangs straighter and swings a third as much, and the body leans a little away. */
  load?: { L: number; R: number };
}

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
 * How far the knees have given `t` seconds after a landing, as a fraction of the most they give:
 * down fast as the weight arrives, and up again over about a third of a second.
 */
export function give(t: number): number {
  const smooth = (x: number) => x * x * (3 - 2 * x);
  if (t <= 0 || t >= GIVE_DOWN + GIVE_UP) return 0;
  return t < GIVE_DOWN ? smooth(t / GIVE_DOWN) : 1 - smooth((t - GIVE_DOWN) / GIVE_UP);
}
const GIVE_DOWN = 0.07;
const GIVE_UP = 0.32;

/** The most the knees give on landing from a fall of `height` metres, as a crouch (see Moment): a hop is a flex, two metres a knee-bend. */
export const landing = (height: number): number => Math.min(1.6, 0.12 + 0.72 * Math.max(0, height));

/** How far the hips come down, metres, for a crouch of 1. */
const CROUCH_DROP = 0.15;

/** The pose of a moment: see Moment for what goes in, Pose for what comes out. */
export function pose(m: Moment): Pose {
  const { speed } = m;
  const air = m.air ?? 0;
  const crouch = m.crouch ?? 0;
  const load = m.load ?? { L: 0, R: 0 };
  const a = m.phase * Math.PI * 2;
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
  const breath = Math.sin((m.breath ?? 0) * Math.PI * 2);
  const out = { sideways: {}, twist: {} } as Pose;
  out['UpperLeg.L'] = (-thigh * s - 0.55 * crouch) * g - 0.5 * air;
  out['UpperLeg.R'] = (thigh * s - 0.55 * crouch) * g - 0.5 * air;
  out['LowerLeg.L'] = (bend(c) + 1.1 * crouch) * g + 0.9 * air;
  out['LowerLeg.R'] = (bend(-c) + 1.1 * crouch) * g + 0.9 * air;
  // a foot is turned back toward level, most of the way: flat when planted, toe down as it leaves
  out['Foot.L'] = -0.6 * (out['UpperLeg.L'] + out['LowerLeg.L']);
  out['Foot.R'] = -0.6 * (out['UpperLeg.R'] + out['LowerLeg.R']);
  // Each arm goes with the opposite leg. One that carries something hangs straighter and swings
  // a third as much, held a little out from the leg it would otherwise knock.
  const free = { L: 1 - load.L, R: 1 - load.R };
  const reach = { L: 1 - 0.67 * load.L, R: 1 - 0.67 * load.R };
  out['UpperArm.L'] = arm * s * g * reach.L - 0.45 * air * free.L + 0.1 * crouch * free.L;
  out['UpperArm.R'] = -arm * s * g * reach.R - 0.45 * air * free.R + 0.1 * crouch * free.R;
  out['LowerArm.L'] = (-(elbow + 0.3 * arm * Math.max(0, -s)) * g - 0.6 * air - 0.25 * crouch) * free.L - 0.06 * load.L;
  out['LowerArm.R'] = (-(elbow + 0.3 * arm * Math.max(0, s)) * g - 0.6 * air - 0.25 * crouch) * free.R - 0.06 * load.R;
  // what hangs from a hand swings a few degrees, a moment behind the stride
  const lag = Math.sin(a - 0.6) * at(speed, 0.07, 0.12) * g;
  out['Hand.L'] = -lag * load.L;
  out['Hand.R'] = lag * load.R;
  out.sideways['UpperArm.L'] = 0.09 * load.L;
  out.sideways['UpperArm.R'] = -0.09 * load.R;
  // the trunk leans a little away from a weight in one hand, and breathes
  out.sideways.Spine = 0.035 * (load.L - load.R);
  // the shoulders turn against the hips, with the arms
  out.twist.Spine = -at(speed, 0.05, 0.12) * s * g;
  out.Hips = 0;
  out.Spine = lean * g + 0.18 * crouch * g + 0.008 * breath;
  out.Head = -0.6 * lean * g - 0.12 * crouch * g - 0.004 * breath;
  // The hips are highest as one leg passes under them and lowest as a foot lands; they give with
  // the knees; and the whole figure rises a few millimetres with each breath.
  out.rise = (-at(speed, 0.035, 0.06) * s * s - CROUCH_DROP * crouch) * g + 0.003 * breath;
  // and they ride over whichever foot has the weight: the left's from its landing (phase 0.25) until the right's
  out.shift = at(speed, 0.018, 0.012) * Math.sin(a - Math.PI / 4) * g;
  return out;
}

/** Where the eyes are carried by a pose, and how the head is tipped: metres to the right and up from where they stand at rest, radians of roll (positive: the head tips to its left) and pitch (positive: up). */
export interface View {
  x: number;
  y: number;
  roll: number;
  pitch: number;
}

/**
 * What the figure sees of its own stride: the view through its eyes moves as its body does, from
 * the same moment, so a footfall seen from outside is a footfall felt inside. The eyes rise and
 * fall twice a stride with the hips, ride from side to side once, the head tips a degree toward
 * the planted foot and nods a little as each foot lands; a landing drops them with the knees.
 */
export function view(m: Moment): View {
  const p = pose(m);
  const g = 1 - (m.air ?? 0);
  const a = m.phase * Math.PI * 2;
  const amount = swing(m.speed) / swing(WALK);
  return {
    x: -p.shift,
    y: p.rise,
    roll: (p.shift / 0.018) * 0.016 * Math.min(1, amount),
    // the nod comes just after the foot has landed (phase 0.25 and 0.75)
    pitch: (-0.007 * amount * Math.max(0, Math.sin(2 * a - Math.PI / 2 - 0.5)) ** 2 - 0.05 * (m.crouch ?? 0)) * g,
  };
}

/** A joint's name as any exporter or loader may have left it: `UpperArm.L`, `UpperArm_L` and `UpperArmL` are one joint. */
export const jointKey = (name: string): string => name.replace(/[._\s]/g, '').toLowerCase();

/** The joints one model has, each with how it sat when it was found. */
interface Rig {
  joints: { joint: Joint; node: THREE.Object3D; rest: THREE.Quaternion; x: number; y: number }[];
  /** Hip to sole, metres, as built. */
  leg: number;
}

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const turn = new THREE.Quaternion();

/** How many times a second a standing figure's breathing is moved on: the rate a still view is redrawn at anyway. */
const BREATH_RATE = 12;
/** Seconds a breath takes: twelve a minute. */
const BREATH = 5;

/** What changed in a frame of a gait: nothing, only the breathing (too little to redraw a shadow for), or the stride. */
export type Stir = 0 | 1 | 2;

/** One figure's walk: where in its cycle it is, and the pose of whichever of its models is on show. */
export class Gait {
  phase = 0;
  /** The speed the pose is drawn for: the figure's own, smoothed, so a start and a stop take a moment. */
  private speed = 0;
  private air = 0;
  /** A landing being absorbed: how hard, and how long ago. */
  private hard = 0;
  private since = Infinity;
  private clock = 0;
  private breath = 0;
  /** What each hand carries, 0 to 1 (see Moment.load). */
  readonly load = { L: 0, R: 0 };
  /** Whether a standing figure breathes. (It costs a redraw a dozen times a second.) */
  breathing = true;
  private readonly rigs = new WeakMap<THREE.Object3D, Rig | null>();
  private leg = 0.9;

  /** The moment as it stands: what `pose` and `view` are asked. */
  get moment(): Moment {
    return {
      phase: this.phase,
      speed: this.speed,
      air: this.air,
      crouch: this.hard * give(this.since),
      breath: this.breath,
      load: this.load,
    };
  }

  /** The feet have come down from a fall of `height` metres: the knees give. */
  land(height: number): void {
    this.hard = landing(height);
    this.since = 0;
  }

  /** The joints under `root`, found by name the first time it is asked for; null if it has none. */
  private rig(root: THREE.Object3D): Rig | null {
    let rig = this.rigs.get(root);
    if (rig !== undefined) return rig;
    const wanted = new Map(JOINTS.map((j) => [jointKey(j), j]));
    const joints: Rig['joints'] = [];
    root.traverse((o) => {
      const joint = wanted.get(jointKey(o.name));
      if (!joint || joints.some((j) => j.joint === joint)) return;
      joints.push({ joint, node: o, rest: o.quaternion.clone(), x: o.position.x, y: o.position.y });
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
   * on the ground or `airborne`. Says how much the pose has changed: see Stir.
   */
  advance(distance: number, speed: number, airborne: boolean, dt: number): Stir {
    const was = [this.phase, this.speed, this.air, this.hard * give(this.since)];
    this.speed += (speed - this.speed) * (1 - Math.exp(-dt * 14));
    if (speed === 0 && this.speed < 0.02) this.speed = 0;
    this.air += ((airborne ? 1 : 0) - this.air) * (1 - Math.exp(-dt * 14));
    if (!airborne && this.air < 0.01) this.air = 0;
    this.since += dt;
    // by distance, not by time: the feet go as far as the figure does
    if (!airborne) this.phase = (this.phase + distance / cycleLength(this.speed, this.leg)) % 1;
    if (this.speed === 0 && this.air === 0) this.phase = 0; // standing: the next step starts from the same foot
    const now = [this.phase, this.speed, this.air, this.hard * give(this.since)];
    // breathing goes on in steps, a dozen a second: a still view is redrawn that often for the scenery anyway
    this.clock += dt;
    const breath = this.breathing ? Math.floor(this.clock * BREATH_RATE) / BREATH_RATE / BREATH : 0;
    const breathed = breath !== this.breath;
    this.breath = breath;
    return now.some((v, i) => v !== was[i]) ? 2 : breathed ? 1 : 0;
  }

  /** Put the model under `root` in the pose of the moment. False if it has no joints (it is left as built). */
  apply(root: THREE.Object3D): boolean {
    const rig = this.rig(root);
    if (!rig) return false;
    this.leg = rig.leg;
    const p = pose(this.moment);
    for (const { joint, node, rest, x, y } of rig.joints) {
      node.quaternion.copy(rest);
      // sideways and twist first, in the joint's own frame as built, then the swing
      const side = p.sideways[joint];
      const twist = p.twist[joint];
      if (twist) node.quaternion.multiply(turn.setFromAxisAngle(Y, twist));
      if (side) node.quaternion.multiply(turn.setFromAxisAngle(Z, side));
      node.quaternion.multiply(turn.setFromAxisAngle(X, p[joint]));
      if (joint === 'Hips') node.position.set(x + p.shift, y + p.rise, node.position.z);
    }
    return true;
  }

  /** Stand the figure as it was built, and start the next walk from the beginning. */
  rest(root: THREE.Object3D): void {
    this.phase = this.speed = this.air = this.hard = 0;
    const rig = this.rig(root);
    for (const { joint, node, rest, x, y } of rig?.joints ?? []) {
      node.quaternion.copy(rest);
      if (joint === 'Hips') node.position.set(x, y, node.position.z);
    }
  }
}

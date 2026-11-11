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
  /** On a ladder, 0 to 1: the hands are up on the rungs and the limbs go hand over hand, `phase` counting two rungs to the cycle. */
  climb?: number;
  /**
   * Falling, 0 to 1: more than a hop off the ground. The arms go out and up, the legs trail and
   * pedal (by `phase`, which runs on time while falling), the trunk pitches forward.
   */
  fall?: number;
  /**
   * Sitting at a wheel, 0 to 1: hips and knees at a right angle, the hands up on the wheel and
   * going round with it (`wheel`: -1 hard right to 1 hard left). The hips are the seat's.
   */
  sit?: number;
  wheel?: number;
  /**
   * Sitting, how much further back the trunk lies than an upright sitter's, radians: a tall
   * figure in a low car slides down and leans back until its head clears the roof. The thighs and
   * the head are turned back by as much, so the knees stay up and the eyes stay on the road.
   */
  recline?: number;
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
  // standing, the weight goes slowly from one foot to the other: a few millimetres, once in three breaths
  if (speed < WALK) out.shift += 0.005 * Math.sin(((m.breath ?? 0) * Math.PI * 2) / 3) * (1 - speed / WALK) * g;
  // Sitting at a wheel: thighs level, shins down, a little back in the seat, the hands at ten to two and turning with it.
  const seated = m.sit ?? 0;
  if (seated) {
    const round = 0.3 * (m.wheel ?? 0);
    const back = m.recline ?? 0;
    const sat = {
      'UpperArm.L': -1.05 - round,
      'UpperArm.R': -1.05 + round,
      'LowerArm.L': -0.75 + round,
      'LowerArm.R': -0.75 - round,
      'UpperLeg.L': -1.45 + back,
      'UpperLeg.R': -1.45 + back,
      'LowerLeg.L': 1.35 - 0.3 * back,
      'LowerLeg.R': 1.35 - 0.3 * back,
      'Foot.L': 0.1,
      'Foot.R': 0.1,
      'Hand.L': 0,
      'Hand.R': 0,
      Hips: -0.12 - back,
      // (and a man that tall slumps a little: the back rounds, the chin comes forward)
      Spine: 0.1 + 0.25 * back,
      Head: 0.02 + 0.75 * back,
    } satisfies Record<Joint, number>;
    for (const j of JOINTS) out[j] += (sat[j] - out[j]) * seated;
    out.rise *= 1 - seated;
    out.shift *= 1 - seated;
    for (const j of JOINTS) {
      if (out.sideways[j]) out.sideways[j] *= 1 - seated;
      if (out.twist[j]) out.twist[j] *= 1 - seated;
    }
  }
  // Falling: arms flung out and up, legs trailing and pedalling, pitched into it.
  const f = m.fall ?? 0;
  if (f) {
    const pedal = 0.35 * s;
    const down = {
      'UpperArm.L': -1.0,
      'UpperArm.R': -1.0,
      'LowerArm.L': -0.5,
      'LowerArm.R': -0.5,
      'UpperLeg.L': 0.15 - pedal,
      'UpperLeg.R': 0.15 + pedal,
      'LowerLeg.L': 0.7 + pedal,
      'LowerLeg.R': 0.7 - pedal,
      'Foot.L': 0.3,
      'Foot.R': 0.3,
      'Hand.L': 0,
      'Hand.R': 0,
      Hips: 0.12,
      Spine: 0.22,
      Head: -0.3,
    } satisfies Record<Joint, number>;
    for (const j of JOINTS) out[j] += (down[j] - out[j]) * f;
    out.sideways['UpperArm.L'] = (out.sideways['UpperArm.L'] ?? 0) + (1.15 * (1 - load.L) - (out.sideways['UpperArm.L'] ?? 0)) * f;
    out.sideways['UpperArm.R'] = (out.sideways['UpperArm.R'] ?? 0) + (-1.15 * (1 - load.R) - (out.sideways['UpperArm.R'] ?? 0)) * f;
    out.rise *= 1 - f;
    out.shift *= 1 - f;
  }
  // On a ladder everything above is set aside for the climb: hands up at the rungs, one reaching
  // as the other pulls; the knee of the leg going up bent high, the other pushing straight.
  const k = m.climb ?? 0;
  if (k) {
    const up = {
      'UpperArm.L': -2.1 - 0.45 * s,
      'UpperArm.R': -2.1 + 0.45 * s,
      'LowerArm.L': -0.7 + 0.45 * s,
      'LowerArm.R': -0.7 - 0.45 * s,
      'UpperLeg.L': -0.6 + 0.5 * s,
      'UpperLeg.R': -0.6 - 0.5 * s,
      'LowerLeg.L': 0.9 - 0.6 * s,
      'LowerLeg.R': 0.9 + 0.6 * s,
      'Foot.L': -0.2,
      'Foot.R': -0.2,
      'Hand.L': 0,
      'Hand.R': 0,
      Hips: 0,
      Spine: 0.06,
      Head: -0.25,
    } satisfies Record<Joint, number>;
    for (const j of JOINTS) out[j] += (up[j] - out[j]) * k;
    out.rise *= 1 - k;
    out.shift *= 1 - k;
    for (const j of JOINTS) {
      if (out.sideways[j]) out.sideways[j] *= 1 - k;
      if (out.twist[j]) out.twist[j] *= 1 - k;
    }
  }
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
  // on a ladder the eyes rise a little with each reach and tip toward the hand that has the rung
  const rung = m.climb ?? 0;
  return {
    x: -p.shift,
    y: p.rise + 0.012 * rung * Math.sin(2 * a) ** 2,
    roll: (p.shift / 0.018) * 0.016 * Math.min(1, amount) + 0.012 * rung * Math.sin(a),
    // the nod comes just after the foot has landed (phase 0.25 and 0.75)
    pitch: (-0.007 * amount * Math.max(0, Math.sin(2 * a - Math.PI / 2 - 0.5)) ** 2 - 0.05 * (m.crouch ?? 0)) * g,
  };
}

/**
 * Getting up off the ground, `t` seconds after starting to, from lying on the front or on the
 * back: up on to hands and knees (or sitting up), one knee, a crouch, standing. `hips` is how
 * high the hips are standing as built, metres. Null once it is over: the figure is on its feet.
 * It is laid out for a figure whose Hips joint stands over where its feet will be.
 */
export function rising(t: number, faceDown: boolean, hips = 0.98): Pose | null {
  const keys = faceDown ? PRONE : SUPINE;
  if (t >= keys.at(-1)![0]) return null;
  let i = 0;
  while (i < keys.length - 2 && t >= keys[i + 1]![0]) i++;
  const [t0, a] = keys[i]!;
  const [t1, b] = keys[i + 1]!;
  const u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
  const k = u * u * (3 - 2 * u);
  const out = { sideways: {}, twist: {}, shift: 0 } as Pose;
  for (const j of JOINTS) {
    const from = a[j] ?? a[SHARED[j] ?? j] ?? 0;
    const to = b[j] ?? b[SHARED[j] ?? j] ?? 0;
    out[j] = from + (to - from) * k;
  }
  // `up` is how high the hips are; the pose's `rise` is how far that is below where they stand
  const high = (key: Key) => (key.up === STAND ? hips : key.up);
  out.rise = high(a) + (high(b) - high(a)) * k - hips;
  return out;
}
/** A key of the get-up: a turn about X for each joint that has one (a side left out is as the other; `Arm`, `Leg` and so on serve both sides), and how high the hips are, metres (`STAND`: as built). */
type Key = Partial<Record<Joint | 'UpperArm' | 'LowerArm' | 'UpperLeg' | 'LowerLeg' | 'Foot', number>> & { up: number };
const STAND = -1;
const SHARED: Partial<Record<Joint, 'UpperArm' | 'LowerArm' | 'UpperLeg' | 'LowerLeg' | 'Foot'>> = {
  'UpperArm.L': 'UpperArm',
  'UpperArm.R': 'UpperArm',
  'LowerArm.L': 'LowerArm',
  'LowerArm.R': 'LowerArm',
  'UpperLeg.L': 'UpperLeg',
  'UpperLeg.R': 'UpperLeg',
  'LowerLeg.L': 'LowerLeg',
  'LowerLeg.R': 'LowerLeg',
  'Foot.L': 'Foot',
  'Foot.R': 'Foot',
};
const KNEEL: Key = {
  up: 0.52,
  Hips: 0.45,
  'UpperLeg.L': -1.75,
  'LowerLeg.L': 1.5,
  'UpperLeg.R': -0.45,
  'LowerLeg.R': 1.57,
  'Foot.R': 0.6,
  UpperArm: -0.4,
  LowerArm: -0.3,
};
const CROUCH: Key = { up: 0.72, Hips: 0.35, UpperLeg: -1.0, LowerLeg: 1.2, Foot: -0.2, UpperArm: -0.25, LowerArm: -0.4, Spine: 0.1 };
const UPRIGHT: Key = { up: STAND };
/** Lying on the front: flat, then up on hands and knees, one knee up, a crouch, standing, a moment to steady. */
const PRONE: readonly [number, Key][] = [
  [0, { up: 0.16, Hips: 1.5, UpperArm: -2.3, LowerArm: -0.9, Head: -0.3 }],
  [0.9, { up: 0.47, Hips: 1.3, UpperLeg: -1.3, LowerLeg: 1.55, UpperArm: -1.3, Head: -0.4 }],
  [1.7, KNEEL],
  [2.4, CROUCH],
  [2.9, UPRIGHT],
  [3.1, UPRIGHT],
];
/** Lying on the back: flat, sitting up on the hands, round on to one knee, a crouch, standing, a moment to steady. */
const SUPINE: readonly [number, Key][] = [
  [0, { up: 0.16, Hips: -1.5, UpperArm: 0.15 }],
  [0.9, { up: 0.15, Hips: -0.35, UpperLeg: -1.2, LowerLeg: 0.15, UpperArm: 0.7, LowerArm: -0.2, Head: 0.2 }],
  [1.8, KNEEL],
  [2.5, CROUCH],
  [3.0, UPRIGHT],
  [3.2, UPRIGHT],
];

/** A joint's name as any exporter or loader may have left it: `UpperArm.L`, `UpperArm_L` and `UpperArmL` are one joint. */
export const jointKey = (name: string): string => name.replace(/[._\s]/g, '').toLowerCase();

/** The joints one model has, each with how it sat when it was found. */
interface Rig {
  joints: { joint: Joint; node: THREE.Object3D; rest: THREE.Quaternion; x: number; y: number; z: number }[];
  /** Hip to sole, metres, as built. */
  leg: number;
}

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const turn = new THREE.Quaternion();
const want = new THREE.Quaternion();
const place = new THREE.Vector3();

/** How far up a ladder one cycle of the limbs goes, metres: a rung with each foot, at a foot apart. */
const RUNGS = 0.61;
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
  private climb = 0;
  private fall = 0;
  private sat = 0;
  /** Sitting (at a wheel): the pose eases in and out. And how far the wheel is over, -1 to 1. */
  seated = false;
  wheel = 0;
  /** Sitting: how far back it leans to fit under the roof (see Moment.recline). */
  recline = 0;
  /** Getting up off the ground: how long it has been at it, and from which side; null when it is not. */
  private up: { t: number; faceDown: boolean } | null = null;
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
      climb: this.climb,
      fall: this.fall,
      sit: this.sat,
      wheel: this.wheel,
      recline: this.recline,
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
      joints.push({ joint, node: o, rest: o.quaternion.clone(), x: o.position.x, y: o.position.y, z: o.position.z });
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

  /** How high the hips of the model under `root` stand over its feet as built, metres (0.98 if it has no joints to say). */
  hipHeight(root: THREE.Object3D): number {
    return this.rig(root)?.joints.find((j) => j.joint === 'Hips')?.y ?? 0.98;
  }

  /** Has this model joints to move? */
  jointed(root: THREE.Object3D): boolean {
    return this.rig(root) !== null;
  }

  /**
   * A frame has passed in which the figure went `distance` metres over the ground at `speed`,
   * on the ground or `airborne`. Says how much the pose has changed: see Stir.
   */
  advance(distance: number, speed: number, airborne: boolean, dt: number, climbing = false, dropped = 0): Stir {
    const was = [
      this.phase,
      this.speed,
      this.air,
      this.hard * give(this.since),
      this.climb,
      this.fall,
      this.up?.t ?? -1,
      this.sat,
      this.wheel,
    ];
    this.sat += ((this.seated ? 1 : 0) - this.sat) * (1 - Math.exp(-dt * 8));
    if (!this.seated && this.sat < 0.01) this.sat = 0;
    if (this.seated && this.sat > 0.99) this.sat = 1;
    // more than a hop's worth down from the top of it is a fall: the pose comes in over a fifth of a second
    const falling = airborne && dropped > 0.7 ? 1 : 0;
    this.fall += (falling - this.fall) * (1 - Math.exp(-dt * 12));
    if (!falling && this.fall < 0.01) this.fall = 0;
    if (this.up) this.up.t += dt;
    this.climb += ((climbing ? 1 : 0) - this.climb) * (1 - Math.exp(-dt * 10));
    if (!climbing && this.climb < 0.01) this.climb = 0;
    this.speed += (speed - this.speed) * (1 - Math.exp(-dt * 14));
    if (speed === 0 && this.speed < 0.02) this.speed = 0;
    this.air += ((airborne ? 1 : 0) - this.air) * (1 - Math.exp(-dt * 14));
    if (!airborne && this.air < 0.01) this.air = 0;
    this.since += dt;
    // by distance, not by time: the feet go as far as the figure does
    if (falling)
      this.phase = (this.phase + dt * 1.6) % 1; // the legs pedal on time: there is no ground to measure by
    else if (climbing) this.phase = (this.phase + distance / RUNGS) % 1;
    else if (!airborne) this.phase = (this.phase + distance / cycleLength(this.speed, this.leg)) % 1;
    if (this.speed === 0 && this.air === 0 && this.climb === 0 && this.fall === 0) this.phase = 0; // standing: the next step starts from the same foot
    const now = [
      this.phase,
      this.speed,
      this.air,
      this.hard * give(this.since),
      this.climb,
      this.fall,
      this.up?.t ?? -1,
      this.sat,
      this.wheel,
    ];
    // breathing goes on in steps, a dozen a second: a still view is redrawn that often for the scenery anyway
    this.clock += dt;
    const breath = this.breathing ? Math.floor(this.clock * BREATH_RATE) / BREATH_RATE / BREATH : 0;
    const breathed = breath !== this.breath;
    this.breath = breath;
    return now.some((v, i) => v !== was[i]) ? 2 : breathed ? 1 : 0;
  }

  /** Start getting up off the ground, from lying on the front or the back (the figure's hips must be over where its feet will be). */
  rise(faceDown: boolean): void {
    this.up = { t: 0, faceDown };
    this.phase = this.speed = this.air = this.fall = this.hard = 0;
  }

  /** Getting up, and how far along: null when it is on its feet. */
  get rising(): number | null {
    return this.up?.t ?? null;
  }

  /**
   * Put the model under `root` in the pose of the moment. False if it has no joints (it is left
   * as built). `toward` under 1 moves each joint only that fraction of the way from where it is
   * now: called every frame, the figure eases into the pose from wherever it was left (limp).
   */
  apply(root: THREE.Object3D, toward = 1): boolean {
    const rig = this.rig(root);
    if (!rig) return false;
    this.leg = rig.leg;
    const hips = rig.joints.find((j) => j.joint === 'Hips')?.y ?? 0.98;
    let p = this.up ? rising(this.up.t, this.up.faceDown, hips) : null;
    if (this.up && !p) this.up = null; // on its feet
    p ??= pose(this.moment);
    for (const { joint, node, rest, x, y, z } of rig.joints) {
      const q = want.copy(rest);
      // sideways and twist first, in the joint's own frame as built, then the swing
      const side = p.sideways[joint];
      const twist = p.twist[joint];
      if (twist) q.multiply(turn.setFromAxisAngle(Y, twist));
      if (side) q.multiply(turn.setFromAxisAngle(Z, side));
      q.multiply(turn.setFromAxisAngle(X, p[joint]));
      if (toward >= 1) node.quaternion.copy(q);
      else node.quaternion.slerp(q, toward);
      if (joint !== 'Hips') continue;
      if (toward >= 1) node.position.set(x + p.shift, y + p.rise, z);
      else node.position.lerp(place.set(x + p.shift, y + p.rise, z), toward);
    }
    return true;
  }

  /** Stand the figure as it was built, and start the next walk from the beginning. */
  rest(root: THREE.Object3D): void {
    this.phase = this.speed = this.air = this.hard = this.climb = this.fall = this.sat = this.wheel = 0;
    this.seated = false;
    this.up = null;
    const rig = this.rig(root);
    for (const { joint, node, rest, x, y, z } of rig?.joints ?? []) {
      node.quaternion.copy(rest);
      if (joint === 'Hips') node.position.set(x, y, z);
    }
  }
}

const s1 = new THREE.Vector3();
const s2 = new THREE.Vector3();
const s3 = new THREE.Vector3();
const s4 = new THREE.Vector3();
const r1 = new THREE.Quaternion();
const r2 = new THREE.Quaternion();

/** Turn a node so that the line from `from` to `at` (world points, `at` carried by the node) comes to point at `to`, in the world. */
function aim(node: THREE.Object3D, from: THREE.Vector3, at: THREE.Vector3, to: THREE.Vector3): void {
  const now = s3.subVectors(at, from);
  const want = s4.subVectors(to, from);
  if (now.lengthSq() < 1e-10 || want.lengthSq() < 1e-10) return;
  const turn = r1.setFromUnitVectors(now.normalize(), want.normalize());
  const world = node.getWorldQuaternion(r2).premultiply(turn);
  const parent = node.parent!.getWorldQuaternion(new THREE.Quaternion()).invert();
  node.quaternion.copy(parent.multiply(world));
  node.updateMatrixWorld(true);
}

/**
 * Put a posed figure's hand on something: the arm's two bones (`UpperArm`, `LowerArm`) are turned
 * so that the grip (`Grip.L`/`Grip.R` under the hand, else the hand itself) is at `target`, in the
 * world, bending the elbow the way the pose already had it. If the target is out of reach the arm
 * points at it as far as it goes. False if the figure has not the joints.
 */
export function reach(root: THREE.Object3D, side: 'L' | 'R', target: THREE.Vector3): boolean {
  const named = new Map<string, THREE.Object3D>();
  root.traverse((o) => {
    if (o.name) named.set(jointKey(o.name), o);
  });
  const upper = named.get(jointKey(`UpperArm.${side}`));
  const lower = named.get(jointKey(`LowerArm.${side}`));
  const hand = named.get(jointKey(`Grip.${side}`)) ?? named.get(jointKey(`Hand.${side}`));
  if (!upper?.parent || !lower?.parent || !hand) return false;
  root.updateWorldMatrix(true, true);
  const s = upper.getWorldPosition(new THREE.Vector3());
  const e = lower.getWorldPosition(new THREE.Vector3());
  const h = hand.getWorldPosition(new THREE.Vector3());
  const a = s.distanceTo(e);
  const b = e.distanceTo(h);
  const way = s1.subVectors(target, s);
  const d = THREE.MathUtils.clamp(way.length(), Math.abs(a - b) + 1e-3, a + b - 1e-3);
  way.normalize();
  // the elbow goes where the two bones meet on the way to the target, bent the way it is bent now
  const along = (a * a - b * b + d * d) / (2 * d);
  const out = s2.subVectors(e, s);
  out.addScaledVector(way, -out.dot(way));
  if (out.lengthSq() < 1e-8) out.set(0, -1, 0).addScaledVector(way, -way.y);
  out.normalize();
  const elbow = new THREE.Vector3()
    .copy(s)
    .addScaledVector(way, along)
    .addScaledVector(out, Math.sqrt(Math.max(0, a * a - along * along)));
  aim(upper, s, e, elbow);
  aim(lower, elbow, hand.getWorldPosition(new THREE.Vector3()), target);
  return true;
}

/**
 * How a figure sits in a seat under a roof: `tall` is the top of its head (helmet and all) over
 * its hips, standing, and `roof` the first thing over the seat's hip point, metres. If the head
 * would not clear it by a few centimetres, the figure sinks into the cushion (`drop`, up to 6 cm)
 * and then leans back (`recline`, radians, up to about 30 degrees) until it does. A man of six
 * foot two in a pressure suit does not sit up straight in a 1960 compact.
 */
export function seatFit(tall: number, roof: number): { drop: number; recline: number } {
  const room = roof - 0.04;
  const need = tall - room;
  if (!(need > 0)) return { drop: 0, recline: 0 };
  const drop = Math.min(0.06, need);
  return { drop, recline: Math.min(0.52, Math.acos(Math.min(1, (room + drop) / tall))) };
}

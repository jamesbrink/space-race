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
 *
 * The hips' height is in two parts. `rise` is what the eyes are carried by (`view`): the bob of
 * the stride, the knees' give, the breath. `sag` is how much further the figure's pelvis comes
 * down than that (never up) so that a foot landing a stride ahead is on the ground when it
 * lands: the figure's hips are `rise + sag` from where they were built, and the eyes know
 * nothing of `sag`.
 *
 * Nor of the pelvis's own motion, which is the figure's too. Walking, a pelvis turns with the leg
 * going forward (`twist.Hips`) and tips up on the side that has the weight (`sideways.Hips`),
 * and the legs lean in from the hips so that the feet land nearer one line than the hips are
 * wide (`sideways` of each thigh). The other joints' turns are still told as if the pelvis stood
 * square: `Gait.apply` takes the pelvis's turn out of what hangs from it (thighs, spine) and
 * keeps the soles level, so a thigh's X is still its swing forward and back as seen from the
 * side. `settle` is how much lower the hips are for all that (a leg that leans is shorter from
 * top to bottom, and the pelvis tips about the hip that carries it), metres.
 */
export type Pose = Record<Joint, number> & {
  rise: number;
  sag: number;
  settle: number;
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
  /** The legs' bones, metres. Left out: a man's proportions on legs 0.9 m from hip to sole. */
  limbs?: Limbs;
  /**
   * Where each foot is, when something knows better than the cycle does (`Gait`, which keeps a
   * planted foot where it was planted while the figure's speed changes, and steps the feet home
   * when it stops). Left out: where a steady stride at this phase and speed has them (`stride`).
   */
  feet?: Feet;
  /**
   * What a foot in the air has over the ground to clear, when the ground is not flat: how high the ground (or the
   * line the foot is carried along from the tread it left to the one it is going to) is above the figure's own, metres,
   * under a foot whose ankle is `x` ahead of the middle of the pelvis. Left out: the ground is flat.
   */
  over?: (side: 'L' | 'R', x: number) => number;
}

/**
 * The ground a figure walks on, as its gait is told of it: stairs, a kerb, a slope. `level` is the height of the
 * figure's own place (where the walker has it standing), and `at` the height of the ground a way `ahead` of the middle
 * of the figure and to its `left`, metres in the same measure; null where there is none within a step of `level` (a
 * wall, a drop). Left out, the ground is flat.
 */
export interface Terrain {
  level: number;
  at(ahead: number, left: number): number | null;
}

/** A leg's bones: hip to knee, knee to ankle, and the ankle above the sole, metres. */
export interface Limbs {
  thigh: number;
  shin: number;
  ankle: number;
  /** How far each hip joint is from the midline, metres. Left out: a tenth of the leg. */
  hip?: number;
  /** How far each ankle stands from the midline as built, metres. Left out: under its hip joint. */
  stand?: number;
}

/** A man's legs, `leg` metres from hip to sole: the proportions every crew figure is near enough to (a 0.43 m thigh and a 0.42 m shin on 0.93 m). */
export const limbsOf = (leg: number): Limbs => ({ thigh: 0.462 * leg, shin: 0.452 * leg, ankle: 0.086 * leg });

/**
 * A foot on the ground, or coming to it: where the point of the sole under its ankle is, metres
 * ahead of the hip joint (`x`) and above the ground the figure stands on (`y`), and how much the
 * leg is held to that, 0 to 1 (`hold`): at 1 the leg's angles follow from the foot's place and
 * the hip's, at 0 the leg swings as the stride has it.
 */
export interface Footing {
  x: number;
  y: number;
  hold: number;
  /** How far the foot is pitched over what being planted there makes it, radians (positive: toes down): a foot caught in the air, coming level as it comes down. */
  tip?: number;
  /** How far the thigh and the knee are turned over what being planted there makes them, radians: a leg caught in mid-swing, coming to its foot's over a few frames. */
  bent?: { thigh: number; knee: number };
  /** How much the foot is a standing figure's own, 0 to 1: a foot that is stood on is not part of the way through a stride (its knee is not unlocking to leave, its toes are not coming down from a landing). */
  own?: number;
  /**
   * A foot the figure has turned over: how far its spot is to the figure's left of where the stride or the stance would
   * have it, metres, and how far the foot is turned from the way the figure faces, radians (positive: toes to its left).
   * Both are 0 for a figure that goes straight.
   */
  aside?: number;
  turn?: number;
}
export interface Feet {
  L: Footing;
  R: Footing;
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

/**
 * How far the legs' swing carries the hips in a cycle at this speed: `cycleLength`, but nothing
 * at a standstill (there, `cycleLength` is kept from being nothing because distance is divided by it).
 */
const span = (speed: number, leg: number): number => 4 * leg * Math.sin(swing(speed)) * at(speed, 1, 1.35, 1);

/** How much of a run there is in the stride at this speed: none at a walk, all of it from 3 m/s, where both feet are off the ground between steps. */
function running(speed: number): number {
  const k = Math.min(1, Math.max(0, (speed - WALK) / (3 - WALK)));
  return k * k * (3 - 2 * k);
}

/** How far each side of the midline the feet land, metres: a walk's steps are a hand's width apart, a run's nearly on one line. Estimated. */
const track = (speed: number): number => at(speed, 0.065, 0.045, 0.065);
/** How far the pelvis turns each way with the leg going forward, radians: 4 degrees at a walk, 6 at a run. Estimated (the textbooks give 4 to 5 at a walk). */
const turning = (speed: number): number => at(speed, 0.07, 0.105);
/** How far the pelvis tips up on the side that has the weight, radians: about 3 degrees. Estimated (given as 4 to 5 for a man in ordinary clothes). */
const tipping = (speed: number): number => at(speed, 0.05, 0.06);

/**
 * A hip joint as the pelvis carries it: metres ahead of where it would be with the pelvis square,
 * and above where the hips' own height (`rise + sag`) would have it; how far of that it has come
 * down with the pelvis's tip (`dip`: nothing for the hip that carries, twice the middle's for the
 * other); and how its leg lies seen from in front, radians: `tilt` in from the upright now,
 * `splay` out from it as the figure stands.
 */
export interface Hip {
  ahead: number;
  up: number;
  dip: number;
  tilt: number;
  splay: number;
  /** What the tilt was worked from: how far in from the hip joint the foot's line is, and how high the joint is over a flat foot's ankle, metres. */
  inward?: number;
  over?: number;
}
/**
 * The pelvis's own motion at a moment of a stride, and where it puts the hip joints (see Pose).
 * The pelvis turns about the upright so that a hip is furthest forward as its foot lands, and
 * tips so that the hip over the planted foot is the high one; it tips about that hip, which
 * therefore stays at its height while the middle and the other hip come down. Level as each foot
 * lands, and coming level without a jerk: the tip goes as the square of the stride's cosine.
 * `lean` is how far each leg is turned in from where it stands, radians, which brings the feet
 * in from the figure's stance to the stride's line (`track`); `settle` is how much lower the
 * middle of the pelvis is for the tip and the lean (a figure that stands with its feet apart
 * comes up a hair as its legs come upright). `sway` is how far the hips ride to the figure's
 * left, over whichever foot has the weight, metres: each leg is turned back by that much (`L.lean`,
 * `R.lean`: radians in from where it stands), so a planted foot is not carried sideways with
 * them. `ground` is 1 on the ground and 0 off it: in the air the pelvis is square. `drop` is how
 * far the hips are below standing height (`rise + sag`, as a positive number): a leg that leans
 * reaches less far in the lower its hip is, so its lean is worked from the hip's real height, and
 * the foot stays on its line as the hips rise and fall over it.
 */
export function carriage(
  phase: number,
  speed: number,
  limbs: Limbs,
  ground = 1,
  drop = 0,
): { turn: number; tip: number; sway: number; settle: number; L: Hip & { lean: number }; R: Hip & { lean: number } } {
  const a = phase * Math.PI * 2;
  const s = Math.sin(a);
  const c = Math.cos(a);
  const leg = limbs.thigh + limbs.shin;
  const half = limbs.hip ?? 0.1 * (leg + limbs.ankle);
  const turn = -turning(speed) * s * ground;
  const tip = -tipping(speed) * c * Math.abs(c) * ground;
  // the feet come in from where they stand to the stride's line, as far as the stride is a stride
  const moving = Math.min(1, Math.max(0, speed / WALK));
  const stand = limbs.stand ?? half;
  const splay = Math.asin(Math.min(0.3, Math.max(-0.3, (stand - half) / leg)));
  const lean = Math.asin(Math.min(0.3, Math.max(0, (stand - track(speed)) / leg))) * moving * ground;
  // the hips ride over whichever foot has the weight: the left's from its landing (phase 0.25) until the right's
  const most = at(speed, 0.018, 0.012);
  const sway = most * Math.sin(a - Math.PI / 4) * ground;
  const down = half * Math.sin(Math.abs(tip));
  // (low enough for whichever leg is tilted furthest at any point of the stride: the planted one always reaches the ground)
  const furthest = Math.abs(lean - splay) + (most * ground) / leg;
  const settle = leg * (Math.cos(furthest) - Math.cos(splay)) - down;
  const ahead = -half * Math.cos(tip) * Math.sin(turn);
  const up = half * Math.sin(tip);
  // Each leg's tilt, from where its hip joint is to where its foot belongs: the stride's line, as far as the stride is
  // a stride, and where the figure stands otherwise. The hip is `sway` to the left of the middle and this high over the ankle.
  const line = stand - Math.max(0, stand - track(speed)) * moving * ground;
  // (a pelvis that has turned and tipped has its hip joints a hair nearer the middle)
  const across = half * Math.cos(tip) * Math.cos(turn);
  const tilted = (aside: number, lift: number): { tilt: number; lean: number; inward: number; over: number } => {
    const tilt = tiltTo(across + aside - line, leg * Math.cos(splay) - drop + lift, leg, splay);
    const turned = tilt + splay;
    return { tilt, lean: Math.abs(turned) < 1e-12 ? 0 : turned, inward: across + aside - line, over: leg * Math.cos(splay) - drop + lift };
  };
  const left = tilted(sway, settle + up);
  const right = tilted(-sway, settle - up);
  return {
    turn,
    tip,
    sway,
    settle,
    L: { ahead, up: settle + up, dip: down - up, tilt: left.tilt, splay, lean: left.lean, inward: left.inward, over: left.over },
    R: {
      ahead: -ahead,
      up: settle - up,
      dip: down + up,
      tilt: right.tilt,
      splay,
      lean: right.lean,
      inward: right.inward,
      over: right.over,
    },
  };
}

/**
 * A leg seen from in front. Its foot stands `splay` out from under its hip as built, and that offset stays what it is
 * however the knee bends (a knee does not move a foot sideways); the leg is turned in about the hip so that the ankle
 * comes `inward` of the hip joint with the joint `high` over it. `tiltTo` is that turn less the splay (so a leg as
 * built has a tilt of minus its splay); `inPlane` is how long the leg then has to be in its own plane, as its bones
 * measure it, for the joint to be `high` over the ankle, and `upright` the height a leg of that length stands.
 */
function tiltTo(inward: number, high: number, span: number, splay: number): number {
  const out = span * Math.sin(splay);
  return Math.atan2(inward, high) + Math.asin(Math.min(1, Math.max(-1, out / Math.hypot(inward, high)))) - splay;
}
function inPlane(span: number, hip: Hip, high: number): number {
  const turned = hip.tilt + hip.splay;
  return (high - span * Math.sin(hip.splay) * Math.sin(turned)) / (Math.cos(turned) * Math.cos(hip.splay));
}
function upright(span: number, hip: Hip, length: number): number {
  const turned = hip.tilt + hip.splay;
  return length * Math.cos(hip.splay) * Math.cos(turned) + span * Math.sin(hip.splay) * Math.sin(turned);
}

/**
 * `plant` for a leg whose hip joint the pelvis has carried: the foot's place is still told from
 * the middle of the pelvis standing square.
 */
export function planted(
  limbs: Limbs,
  x: number,
  y: number,
  drop: number,
  hip: Hip,
  least = 0,
  toes = 0,
  most = TOES_UP,
): { thigh: number; knee: number; pitch: number } {
  const leg = limbs.thigh + limbs.shin;
  // (in the tilted leg's own plane the ground is further off than it is straight down)
  return plant(limbs, x - hip.ahead, y, leg - y - inPlane(leg, hip, leg * Math.cos(hip.splay) - drop + hip.up - y), least, toes, most);
}

/**
 * A leg whose foot the figure has turned over: the foot's spot is `x` ahead of the middle of the pelvis and `aside` to
 * the figure's left of its own line, and the whole leg is turned `yaw` about the upright at its hip (positive: toes
 * to the left; `sign` is 1 for the left leg). In the leg's own frame the spot is `ahead`, and the hip is as `joint`
 * has it: leaning to where the spot now lies. Nothing turned and nothing aside: the hip as it was.
 */
function turnedOver(limbs: Limbs, hip: Hip, sign: number, x: number, aside: number, yaw: number): { ahead: number; joint: Hip } {
  if ((!yaw && !aside) || hip.inward === undefined || hip.over === undefined) return { ahead: x, joint: hip };
  const a = x - hip.ahead;
  const l = -sign * hip.inward + aside; // the ankle from its hip joint, to the figure's left
  const inward = -sign * (l * Math.cos(yaw) - a * Math.sin(yaw));
  const tilt = tiltTo(inward, hip.over, limbs.thigh + limbs.shin, hip.splay);
  return { ahead: hip.ahead + a * Math.cos(yaw) + l * Math.sin(yaw), joint: { ...hip, inward, tilt } };
}

/** `footOf` likewise: where a leg turned so has its ankle's sole, told from the middle of the pelvis standing square. */
export function footAt(limbs: Limbs, thigh: number, knee: number, drop: number, hip: Hip): [number, number] {
  const a = limbs.thigh;
  const b = limbs.shin;
  return [
    hip.ahead - (a * Math.sin(thigh) + b * Math.sin(thigh + knee)),
    (a + b) * Math.cos(hip.splay) - drop + hip.up - upright(a + b, hip, a * Math.cos(thigh) + b * Math.cos(thigh + knee)),
  ];
}

/**
 * How long a foot is on the ground, as the half of its stance in cycles either side of the moment
 * it is under the hip (phase 0.5 for the left, 0 for the right). At a walk it is half the cycle:
 * one foot lands as the other leaves. At a run it is brief, and the figure is in the air between.
 */
export const stance = (speed: number): number => 0.25 + (0.055 - 0.25) * running(speed);
/**
 * How long before its foot lands a swinging leg starts to reach for the foot's spot, and how long
 * after the foot leaves it has let go, cycles. Between landing and leaving the leg is wholly the
 * planted foot's; outside these, wholly the swing's. A walking leg reaches early: the hips are
 * coming down to the landing (`sag`), and a leg that only swung would trail its foot in the ground.
 */
const reaching = (speed: number): number => REACH_WALK + (REACH_RUN - REACH_WALK) * running(speed);
const letting = (speed: number): number => LET_WALK + (REACH_RUN - LET_WALK) * running(speed);
const REACH_WALK = 0.17;
const LET_WALK = 0.12;
const REACH_RUN = 0.065;

/**
 * Where a steady stride has the feet: each is planted from its landing until it leaves, a point
 * fixed on the ground that the hips ride over (as far ahead of them at its landing as behind
 * them when it leaves), and between times the leg swings. Pure, and what `pose` uses when it is
 * not told where the feet are.
 */
export function stride(phase: number, speed: number, leg = 0.9): Feet {
  const reach = span(speed, leg);
  const down = stance(speed);
  const before = reaching(speed);
  const after = letting(speed);
  const foot = (from: number): Footing => {
    const d = from - Math.round(from); // cycles since it was under the hip, -0.5 to 0.5
    const k = Math.min(1, Math.max(0, d < 0 ? (-d - down) / before : (d - down) / after));
    return { x: -d * reach, y: 0, hold: 1 - k * k * (3 - 2 * k) };
  };
  return { L: foot(phase - 0.5), R: foot(phase) };
}

/** How far the hips are below standing height, metres, for the stride and the knees' give: what `rise` is the negative of, on the ground and without the breath. */
function sink(phase: number, speed: number, crouch: number): number {
  const s2 = Math.sin(phase * Math.PI * 2) ** 2;
  // A walk is lowest as each foot lands and highest as the leg passes under; a run is the other
  // way about: low while a foot is down and taking the weight, highest in the air between.
  const run = running(speed);
  return at(speed, 0.035, 0.035) * (1 - run) * s2 + 0.072 * run * (1 - s2 * s2) + CROUCH_DROP * crouch;
}

/** How straight a knee gets at this speed (at a walk, straight), the bend it has taking the weight, and the bend of the leg swinging through: radians. */
const straightest = (speed: number): number => 0.3 * running(speed);
const bend = (speed: number, swinging: number): number => {
  const straight = straightest(speed);
  return (
    straight + (at(speed, 0.09, 0.3) - straight) * (1 - (1 - Math.abs(swinging)) ** 4) + at(speed, 0.95, 1.7) * Math.max(0, swinging) ** 2
  );
};

/**
 * How far below standing the hips have to be as a foot lands, metres: the height at which the
 * leg swinging forward, as the stride has it at that moment (at a walk: straight, the thigh at
 * the end of its swing), has its heel on the ground at the foot's spot, toes up. A leg does not
 * reach a spot a stride ahead from hips that are only the bob of the eyes below standing: a
 * walker's pelvis comes down to it. Never less than what the leg at its straightest needs with
 * the toes as far up as they go.
 */
function touchdown(limbs: Limbs, speed: number): number {
  const st = stance(speed);
  const a = (0.5 - st) * Math.PI * 2;
  const thigh = -swing(speed) * Math.sin(a);
  const knee = bend(speed, Math.cos(a));
  const all = limbs.thigh + limbs.shin + limbs.ankle;
  // (the left foot's landing: its hip is where the pelvis has it then, turned forward with the leg, and the leg leans in)
  const pelvis = carriage(0.5 - st, speed, limbs, 1, sink(0.5 - st, speed, 0));
  const hip = pelvis.L;
  // (standing, the hip joints are this far over the ankles: a leg that stands out from its hip stands a hair lower)
  const stood = all - (limbs.thigh + limbs.shin) * (1 - Math.cos(hip.splay));
  // the heel of the foot's spot, ahead of the hip; and the ankle of the swinging leg, ahead of the hip and below it
  const heel = st * span(speed, all) - HEEL - hip.ahead;
  const ahead = -(limbs.thigh * Math.sin(thigh) + limbs.shin * Math.sin(thigh + knee));
  const bones = limbs.thigh + limbs.shin;
  const below = upright(bones, hip, limbs.thigh * Math.cos(thigh) + limbs.shin * Math.cos(thigh + knee));
  // the ankle goes round its heel on a circle: where on it that leg's ankle is, as toes-up as an ankle goes at the most
  const radius = Math.hypot(HEEL, limbs.ankle);
  const level = Math.atan2(limbs.ankle, HEEL);
  const up = Math.min(TOES_UP, Math.max(0, Math.acos(Math.min(1, Math.max(-1, (ahead - heel) / radius))) - level));
  const swung = stood + hip.up - (below + radius * Math.sin(level + up));
  // and what the straightest leg needs, toes right up
  const least = straightest(speed);
  const leg = Math.sqrt(limbs.thigh ** 2 + limbs.shin ** 2 + 2 * limbs.thigh * limbs.shin * Math.cos(least));
  const reach = heel + radius * Math.cos(level + TOES_UP);
  const most =
    stood + hip.up - (radius * Math.sin(level + TOES_UP) + upright(bones, hip, Math.sqrt(Math.max(0, leg * leg - reach * reach))));
  return Math.max(swung, most);
}

/**
 * How much further the figure's pelvis comes down than the eyes' bob (`sink`), metres: all the
 * way to what the landing leg needs (`touchdown`) at the moment each foot lands, and nothing as
 * the hips pass over the planted foot. See `Pose.sag`.
 */
function sag(phase: number, speed: number, crouch: number, limbs: Limbs): number {
  if (speed <= 0) return 0;
  const st = stance(speed);
  const more = touchdown(limbs, speed) - sink(0.5 - st, speed, crouch);
  if (more <= 0) return 0;
  // most as each foot lands (the left at 0.5 - stance, the right half a cycle on), none midway between
  return more * (0.5 + 0.5 * Math.cos(4 * Math.PI * (phase - 0.5 + st))) ** SAG_SHAPE;
}
const SAG_SHAPE = 2;

/** How far the hips of the figure are below standing height, metres: the eyes' part and the pelvis's own. */
const lowered = (phase: number, speed: number, crouch: number, limbs: Limbs): number =>
  sink(phase, speed, crouch) + sag(phase, speed, crouch, limbs);

/**
 * How far a knee has bent by the time its foot leaves the ground, radians: what puts the thigh
 * where the stride's swing has it at that moment with the toes still on their spot and the heel
 * up. (A leg leaves the ground bending, not straight.) No less than the knee's straightest.
 */
function leaving(limbs: Limbs, speed: number, crouch: number): number {
  const st = stance(speed);
  const least = straightest(speed);
  const a = (0.5 + st) * Math.PI * 2;
  const thigh = -swing(speed) * Math.sin(a);
  const all = limbs.thigh + limbs.shin + limbs.ankle;
  // the knee, and the toes the foot rocks on: ahead of the hip, and above the ground
  // (from the left hip as the pelvis has it at that moment: turned back with the leg)
  const hip = carriage(0.5 + st, speed, limbs, 1, lowered(0.5 + st, speed, crouch, limbs)).L;
  const kx = hip.ahead - limbs.thigh * Math.sin(thigh);
  const ky = all - lowered(0.5 + st, speed, crouch, limbs) + hip.up - limbs.thigh * Math.cos(thigh);
  const px = -st * span(speed, all) + TOES;
  // the ankle is a shin from the knee and on its circle round the toes: of the two places, the one behind
  const radius = Math.hypot(TOES, limbs.ankle);
  const far = Math.hypot(px - kx, ky);
  if (far >= limbs.shin + radius || far <= Math.abs(limbs.shin - radius)) return least;
  const along = (limbs.shin ** 2 - radius ** 2 + far * far) / (2 * far);
  const off = Math.sqrt(Math.max(0, limbs.shin ** 2 - along * along));
  const ux = (px - kx) / far;
  const uy = -ky / far;
  const ax = kx + ux * along + uy * off;
  const ay = ky + uy * along - ux * off;
  const knee = Math.atan2(kx - ax, ky - ay) - thigh;
  return Math.min(least + 0.7, Math.max(least, knee));
}
/** How long before its foot leaves the ground a knee starts to bend for it, cycles. */
const UNLOCK = 0.1;
/** How long after its heel lands a foot takes to come down flat, cycles (or all of a stance shorter than that). */
const SLAP = 0.14;

/**
 * What a stance leg is asked for beside its foot's place, by where in its stance it is: how
 * straight its knee may be (`least`: it unlocks as the foot comes to leave), and how far up its
 * toes are kept (`toes`: as far as they were when the heel landed, coming down flat over the
 * moments after, the knee giving a little as it takes the weight; a foot let down as fast as the
 * hips come over it slaps).
 */
function asked(limbs: Limbs, side: 'L' | 'R', phase: number, speed: number, crouch: number): { least: number; toes: number; most: number } {
  const straight = straightest(speed);
  if (speed <= 0) return { least: straight, toes: 0, most: TOES_UP };
  const st = stance(speed);
  // cycles since the foot was under the hip, -0.5 to 0.5
  const from = phase - (side === 'L' ? 0.5 : 0);
  const d = from - Math.round(from);
  const smooth = (v: number) => v * v * (3 - 2 * v);
  const late = smooth(Math.min(1, Math.max(0, (d - (st - UNLOCK)) / UNLOCK)));
  const least = late > 0 ? straight + (leaving(limbs, speed, crouch) - straight) * late : straight;
  const landed = Math.min(1, Math.max(0, (d + st) / Math.min(SLAP, st)));
  if (landed >= 1) return { least, toes: 0, most: TOES_UP };
  // how far up the toes are as the heel lands: what the landing leg at its straightest has them at
  const all = limbs.thigh + limbs.shin + limbs.ankle;
  const pelvis = carriage(0.5 - st, speed, limbs, 1, lowered(0.5 - st, speed, crouch, limbs));
  const up = -planted(limbs, st * span(speed, all), 0, lowered(0.5 - st, speed, crouch, limbs), pelvis.L, straight).pitch;
  // (and until it lands they are no further up than that: a foot comes to its landing as it will land, and does not rock on a heel that is not down yet)
  return { least, toes: up * (1 - landed) ** 2, most: d < -st ? up : TOES_UP };
}

/**
 * The turns of a thigh and a knee (as `Pose` has them) that put the ankle over a point `x` ahead
 * of the hip and `y` above the ground, with the hips `drop` below standing height. The knee bends
 * forward only, and is never straighter than `least`. A point further off than the leg reaches is
 * pointed at: `short` is how far short of it the leg falls, metres.
 */
export function legTo(limbs: Limbs, x: number, y: number, drop: number, least = 0): { thigh: number; knee: number; short: number } {
  const a = limbs.thigh;
  const b = limbs.shin;
  const down = Math.max(0.2 * (a + b), a + b - drop - y);
  const longest = least ? Math.sqrt(a * a + b * b + 2 * a * b * Math.cos(least)) : a + b;
  let far = Math.hypot(x, down);
  // A leg all but straight bends a long way for a little: hips a millimetre lower are five degrees
  // of knee. The first millimetres are given to the foot (SLACK), so a knee does not pump at a breath.
  const shorter = longest - far;
  if (shorter > 0) far = longest - shorter * (1 - Math.exp(-shorter / SLACK));
  const knee = shorter <= 1e-9 ? least : Math.acos(Math.min(1, Math.max(-1, (far * far - a * a - b * b) / (2 * a * b))));
  // the thigh lies forward of the line from hip to ankle by the angle the bent knee gives it
  return { thigh: -(Math.atan2(x, down) + Math.atan2(b * Math.sin(knee), a + b * Math.cos(knee))), knee, short: Math.max(0, -shorter) };
}

/**
 * A leg whose foot is planted with the point of its sole under the ankle at `x` ahead of the hip
 * and `y` above the ground: the thigh's and the knee's turns, and how far the foot is pitched
 * from level, radians (positive: toes down). The knee is never straighter than `least`. While
 * the hips are near enough the foot is flat. Further off than the leg reaches it rocks, as a foot does: behind the hips the heel comes up
 * and the toes stay where they are; ahead of them the toes come up and the heel stays, as far as
 * an ankle bends (`most`: TOES_UP, or less for a foot that has not landed, which comes down as it
 * will land), and past that the foot is not down yet: the leg points at where it will be. A foot ahead that is on its heel keeps its toes up by `toes` at the least, however
 * near the hips have come: the knee bends for it.
 */
export function plant(
  limbs: Limbs,
  x: number,
  y: number,
  drop: number,
  least = 0,
  toes = 0,
  most = TOES_UP,
): { thigh: number; knee: number; pitch: number } {
  // (as long as the leg gets: with the knee as straight as it goes)
  const leg = Math.sqrt(limbs.thigh ** 2 + limbs.shin ** 2 + 2 * limbs.thigh * limbs.shin * Math.cos(least));
  const up = limbs.ankle;
  // from the hip joint: ahead, and down
  const hips = limbs.thigh + limbs.shin + up - drop - y;
  const flat = legTo(limbs, x, y, drop, least);
  const behind = x < 0;
  if (!flat.short && (behind || toes <= 0)) return { thigh: flat.thigh, knee: flat.knee, pitch: 0 };
  // the point it rocks on (the toes behind, the heel ahead), how far the ankle is from it, and the angle of that line from the ground with the foot flat
  const px = behind ? x + TOES : x - HEEL;
  const radius = Math.hypot(behind ? TOES : HEEL, up);
  const level = Math.atan2(up, behind ? TOES : HEEL);
  const far = Math.hypot(px, hips);
  // where a straight leg's ankle meets the circle the ankle goes round on: the lifted side of the line from the hip to the pivot
  let lifted = 0; // how far the foot has rocked, radians
  let reached = !flat.short;
  if (flat.short && far < leg + radius && far > Math.abs(leg - radius)) {
    const along = (leg * leg - radius * radius + far * far) / (2 * far);
    const off = Math.sqrt(Math.max(0, leg * leg - along * along));
    // (the line runs from the hip, at (0, hips) above the ground, to the pivot at (px, 0); its normal toward the heel's side)
    const ux = px / far;
    const uy = -hips / far;
    const side = behind ? 1 : -1;
    const ax = ux * along + side * uy * off;
    const ay = hips + uy * along - side * ux * off;
    lifted = Math.atan2(ay, behind ? px - ax : ax - px) - level;
    reached = lifted >= 0 && (behind || lifted <= most);
  }
  if (!reached) lifted = behind ? Math.PI / 2 - level : most;
  else if (!behind) lifted = Math.max(lifted, Math.min(toes, most));
  // the ankle, on its circle
  const angle = level + lifted;
  const ax = behind ? px - radius * Math.cos(angle) : px + radius * Math.cos(angle);
  const ay = radius * Math.sin(angle);
  const to = legTo(limbs, ax, y + ay - up, drop, least);
  return { thigh: to.thigh, knee: to.knee, pitch: behind ? lifted : -lifted };
}

/** Where a leg turned so has its ankle's sole: metres ahead of the hip and above the ground, the hips `drop` below standing. */
export function footOf(limbs: Limbs, thigh: number, knee: number, drop: number): [number, number] {
  const a = limbs.thigh;
  const b = limbs.shin;
  return [-(a * Math.sin(thigh) + b * Math.sin(thigh + knee)), a + b - drop - (a * Math.cos(thigh) + b * Math.cos(thigh + knee))];
}

/**
 * A swinging foot keeps off the ground. The swing is drawn by angle, and the hips under it come down a long way into a
 * runner's landing: where that would put the sole within CLEAR_BY of the ground, or under it, the leg is bent to hold
 * it up, coming in over CLEAR_OVER so that the knee is asked for it gradually (a runner's knee does bend into its
 * landing: it is the hips that are coming down). Metres.
 */
const CLEAR_BY = 0.004;
const CLEAR_OVER = 0.014;
/** How much of the drop of its hip a swinging leg takes up by bending: all of it and half as much again. */
const CLEAR = 1.5;
/** How much nearer the hip a planted foot may be than a straight leg reaches before the knee is asked to bend for all of it, metres. */
const SLACK = 0.012;
/** How far ahead of its ankle the ball of a foot is, and how far behind it the heel, metres: what a foot rocks on as it leaves and as it lands. Estimated. */
const TOES = 0.15;
const HEEL = 0.06;
/** How far the toes come up as the heel lands, radians: 25 degrees. Estimated. */
const TOES_UP = 0.44;

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
  // (at a walk the knee is straight as its foot lands: that is where the planted leg has it)
  const straight = straightest(speed);
  const arm = at(speed, 0.26, 0.75);
  const elbow = at(speed, 0.12, 1.35);
  const lean = at(speed, 0.02, 0.16);
  const g = 1 - air;
  const breath = Math.sin((m.breath ?? 0) * Math.PI * 2);
  const out = { sideways: {}, twist: {} } as Pose;
  // A leg swings as the stride has it, and while its foot is on the ground it is where that foot
  // and the hips put it: the foot stays where it was planted and the leg's angles follow, so
  // nothing slides. (Swung by angle alone, the foot wandered a hand's width either way under hips
  // going steadily forward.) The two are blended over the moments the foot lands and leaves.
  const limbs = m.limbs ?? limbsOf(0.9);
  const feet = m.feet ?? stride(m.phase, speed, limbs.thigh + limbs.shin + limbs.ankle);
  // The eyes' hips and the figure's: the pelvis comes down further than the eyes' bob to put the landing foot on the ground (`sag`).
  const bob = sink(m.phase, speed, crouch);
  const drop = bob + sag(m.phase, speed, crouch, limbs);
  // The pelvis's own motion, which the planted legs are solved from: it is the ground's while there is ground.
  const pelvis = carriage(m.phase, speed, limbs, g, drop);
  const leans = { L: 0, R: 0 };
  const twists = { L: 0, R: 0 };
  for (const side of ['L', 'R'] as const) {
    const sign = side === 'L' ? 1 : -1;
    let hip = -sign * thigh * s;
    let shin = bend(speed, sign * c);
    if (crouch) {
      // the knees give under a swinging leg too: its foot stays where the swing has it and the hips come down over it
      const [x, y] = footOf(limbs, hip, shin, bob - CROUCH_DROP * crouch);
      const stood = legTo(limbs, x, y, bob - CROUCH_DROP * crouch);
      const given = legTo(limbs, x, y, bob);
      hip += given.thigh - stood.thigh;
      shin += given.knee - stood.knee;
    }
    const foot = feet[side];
    let toe = 0;
    // The hip of the leg that swings comes down as the pelvis tips: the leg bends for it, and a little more (CLEAR), so its foot goes no lower than the swing had it.
    const dip = pelvis[side].dip;
    if (dip > 0) {
      const [x, y] = footOf(limbs, hip, shin, 0);
      const level = legTo(limbs, x, y, 0);
      const dipped = legTo(limbs, x, y, CLEAR * dip);
      hip += dipped.thigh - level.thigh;
      shin += dipped.knee - level.knee;
    }
    {
      const joint = pelvis[side];
      const [x, y] = footAt(limbs, hip, shin, drop, joint);
      const span = limbs.thigh + limbs.shin;
      const to = (h: number) =>
        legTo(limbs, x - joint.ahead, h, span - h - inPlane(span, joint, span * Math.cos(joint.splay) - drop + joint.up - h));
      // (its lowest point: the heel or the toes, as a swinging foot is pitched)
      const pitch = 0.4 * (hip + shin);
      const low = y + limbs.ankle * (1 - Math.cos(pitch)) + Math.min(HEEL * Math.sin(pitch), -TOES * Math.sin(pitch));
      // (over the ground under it, where that is not the figure's own: the next tread of a flight, a kerb)
      const floor = m.over ? Math.max(0, m.over(side, x)) : 0;
      const over = (low - floor - CLEAR_BY) / CLEAR_OVER;
      // (as far as it is striding: a figure standing has its feet on the ground; but a tread in the way is cleared at any pace)
      const striding = Math.max(Math.min(1, speed / WALK), Math.min(1, floor / 0.02));
      const held = low + (floor + CLEAR_BY + CLEAR_OVER * (over > 30 ? over : Math.log1p(Math.exp(over))) - low) * striding;
      if (held - low > 1e-6) {
        const was = to(y);
        const now = to(y + held - low);
        hip += now.thigh - was.thigh;
        shin = Math.max(0, shin + now.knee - was.knee);
      }
    }
    if (foot.hold > 0) {
      const stride = asked(limbs, side, m.phase, speed, crouch);
      const striding = 1 - (foot.own ?? 0);
      const least = straight + (stride.least - straight) * striding;
      const most = TOES_UP + (stride.most - TOES_UP) * striding;
      // A foot the figure has turned over stays on its spot, pointing the way it pointed: the whole leg is turned about
      // the upright at the hip by the foot's turn, and in the leg's own frame the spot is so far ahead and so far in.
      const yaw = foot.turn ?? 0;
      const { ahead, joint } = turnedOver(limbs, pelvis[side], sign, foot.x, foot.aside ?? 0, yaw);
      if (joint !== pelvis[side]) {
        leans[side] = (joint.tilt - pelvis[side].tilt) * foot.hold;
        twists[side] = yaw * foot.hold;
      }
      let leg = planted(limbs, ahead, foot.y, drop, joint, least, stride.toes * striding, most);
      // A foot rocking on its heel or its toes has its ankle higher than a flat foot's, and a leg that leans reaches less far
      // in from a higher ankle: the lean is worked again from where the ankle is, and the leg from that, so the foot
      // stays on its line through the whole of its stance.
      const lifted = footAt(limbs, leg.thigh, leg.knee, drop, joint)[1];
      if (joint.inward !== undefined && joint.over !== undefined && Math.abs(lifted) > 1e-5) {
        const tilt = tiltTo(joint.inward, joint.over - lifted, limbs.thigh + limbs.shin, joint.splay);
        leans[side] = (tilt - pelvis[side].tilt) * foot.hold;
        leg = planted(limbs, ahead, foot.y, drop, { ...joint, tilt }, least, stride.toes * striding, most);
      }
      hip += (leg.thigh - hip) * foot.hold;
      shin += (leg.knee - shin) * foot.hold;
      toe = leg.pitch + (foot.tip ?? 0);
    }
    if (foot.bent) {
      hip += foot.bent.thigh;
      shin = Math.max(0, shin + foot.bent.knee);
    }
    // a foot is turned back toward level: all the way while it is planted, most of the way as it swings (toe down as it leaves)
    // (the toes of a leg reaching for its landing come up late: a heel held low is a heel in the ground)
    const ankle = (thigh: number, knee: number) =>
      -(0.6 + 0.4 * foot.hold * g) * (thigh * g - 0.5 * air + knee * g + 0.9 * air) + toe * (toe < 0 ? foot.hold ** 2 : foot.hold) * g;
    // Where the ground is not flat, a foot that is partly its spot's and partly the swing's (leaving, or coming to its
    // landing) is over what is under it as well: between a foot on its tread and a foot over the riser ahead is a foot
    // in the riser. It is lifted where it is, the more the less it is planted: a foot goes up off a tread before it goes on.
    if (m.over && foot.hold > 0 && foot.hold < 1) {
      const joint = pelvis[side];
      const [x, y] = footAt(limbs, hip, shin, drop, joint);
      const span = limbs.thigh + limbs.shin;
      const to = (h: number) =>
        legTo(limbs, x - joint.ahead, h, span - h - inPlane(span, joint, span * Math.cos(joint.splay) - drop + joint.up - h));
      const pitch = hip + shin + ankle(hip, shin);
      const low = y + limbs.ankle * (1 - Math.cos(pitch)) + Math.min(HEEL * Math.sin(pitch), -TOES * Math.sin(pitch));
      const floor = Math.max(0, m.over(side, x));
      const over = (low - floor - CLEAR_BY) / CLEAR_OVER;
      // (a foot coming to its landing is held over the ground until it is all but down; one leaving is let up gently)
      const free = Math.min(1, (1 - foot.hold) / (foot.x > 0 ? 0.5 : 0.6));
      const held =
        low + (floor + CLEAR_BY + CLEAR_OVER * (over > 30 ? over : Math.log1p(Math.exp(over))) - low) * free * free * (3 - 2 * free);
      if (held - low > 1e-6) {
        const was = to(y);
        const now = to(y + held - low);
        hip += now.thigh - was.thigh;
        shin = Math.max(0, shin + now.knee - was.knee);
      }
    }
    out[`UpperLeg.${side}`] = hip * g - 0.5 * air;
    out[`LowerLeg.${side}`] = shin * g + 0.9 * air;
    out[`Foot.${side}`] = ankle(hip, shin);
  }
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
  // The shoulders turn against the hips, with the arms: the right shoulder forward as the left foot
  // lands. (A turn about the upright is positive when it takes the figure's right side forward.)
  out.twist.Spine = at(speed, 0.05, 0.12) * s * g;
  // and the pelvis with the legs: turned toward the foot going forward, tipped up over the planted one, the legs leaning in to the stride's line
  out.twist.Hips = pelvis.turn;
  out.sideways.Hips = pelvis.tip;
  out.sideways['UpperLeg.L'] = -(pelvis.L.lean + leans.L);
  out.sideways['UpperLeg.R'] = pelvis.R.lean + leans.R;
  if (twists.L) out.twist['UpperLeg.L'] = twists.L * g;
  if (twists.R) out.twist['UpperLeg.R'] = twists.R * g;
  out.settle = pelvis.settle;
  out.Hips = 0;
  out.Spine = lean * g + 0.18 * crouch * g + 0.008 * breath;
  out.Head = -0.6 * lean * g - 0.12 * crouch * g - 0.004 * breath;
  // The hips are highest as one leg passes under them and lowest as a foot lands (at a run,
  // lowest over the planted foot: `sink`); they give with the knees; and the whole figure rises
  // a few millimetres with each breath.
  out.rise = -bob * g + 0.003 * breath;
  out.sag = -(drop - bob) * g;
  // and they ride over whichever foot has the weight (`carriage`)
  out.shift = pelvis.sway;
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
    out.sag *= 1 - seated;
    out.settle *= 1 - seated;
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
    out.sag *= 1 - f;
    out.settle *= 1 - f;
    out.shift *= 1 - f;
    for (const j of ['Hips', 'UpperLeg.L', 'UpperLeg.R'] as const) {
      if (out.sideways[j]) out.sideways[j] *= 1 - f;
      if (out.twist[j]) out.twist[j] *= 1 - f;
    }
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
    out.sag *= 1 - k;
    out.settle *= 1 - k;
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
  const out = { sideways: {}, twist: {}, shift: 0, sag: 0, settle: 0 } as Pose;
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
  /** The leg's bones, as built. */
  limbs: Limbs;
}

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const turn = new THREE.Quaternion();
const want = new THREE.Quaternion();
const square = new THREE.Quaternion();
/** The joints that hang from the pelvis. */
const FROM_HIPS: ReadonlySet<Joint> = new Set(['Spine', 'UpperLeg.L', 'UpperLeg.R']);
const place = new THREE.Vector3();

/** How far a planted foot is turned on its leg as the figure turns over it, at the most, radians (35 degrees: past it the foot pivots on its spot), and what a radian of that counts as in metres out of place. Estimated. */
const FOOT_TURN = 0.61;
const TURNED_OUT = 0.17;

/**
 * A foot in the air over ground that is not flat (`Gait.over`): how steeply it rises to a riser ahead of it and comes
 * down behind a nosing, metres up for a metre along; the tallest step that is one, metres; and how finely the ground
 * along its way is asked for, metres (at fixed places along the way gone, so that what is under a place stays what it was).
 */
const STEEP = 3;
/** How much of its swing a foot takes to come up to the height of a tread above it (from the start of it), and to come down to one below (to the end of it). */
const PATH_UP = 0.75;
const PATH_DOWN = 0.5;
const STEP_MOST = 0.32;
const GRAIN = 0.02;
/**
 * Where a foot lands on ground that has steps in it (`Gait.settleOn`): the ground is asked for every EDGE_GRAIN along
 * the foot's line, a change of more than EDGE between two of those is an edge (a slope would have to stand at 67
 * degrees), and the foot keeps RISER_CLEAR from one that stands over it and goes at most OVERHANG over one that falls
 * away. A landing planned more than REPLAN from where the stride now has it is planned again. OWED_MOST is the most
 * of the cycle's phase that is ever owed for that, cycles, and OWED_RATE how much of a stride's own advance is paid.
 * All estimated.
 */
const EDGE_GRAIN = 0.015;
const EDGE = 0.035;
const RISER_CLEAR = 0.05;
const OVERHANG = 0.05;
const REPLAN = 0.3;
const OWED_MOST = 0.3;
const OWED_RATE = 0.6;
/** How far apart the two feet's claims on the figure's height are when the lower has it all but outright, metres. */
const CROSS = 0.04;

/** Slower than this over the ground, m/s, the figure is standing: its feet are stepped home. And how near home is home, metres. */
const STILL_PACE = 0.05;
const HOME = 0.02;

/** How fast a joint of a leg turns as a standing figure steps a foot home, at the most, radians a second: ten degrees in a sixtieth of a second. */
const LIMB_RATE = (600 * Math.PI) / 180;
/** How fast a leg caught in mid-swing by a stop comes to where its foot puts it: the share of what is left that goes in a second. */
const BENT_OUT = 12;

/** How long getting up takes to go from however the figure lay to its own keys, seconds. */
export const RISE_IN = 0.5;

/** How far apart a ladder's rungs are, metres (srlib.ladder: the first is this far above its foot), and how far up one cycle of the limbs goes: a rung with each foot. */
export const RUNG = 0.3;
const RUNGS = 2 * RUNG;

/**
 * On a ladder, which rung each hand and foot is on: its height above the ladder's foot, metres, when the climber's own
 * level (where the walker has his feet) is `y` above it. Each holds its rung for half a cycle while he rises a rung
 * past it, then goes up two in the other half: the left foot and the right hand together, then the others. A foot's
 * rung is the one at his level or the next above; a hand's is `reach` rungs above its foot's. By height alone: stop
 * on the ladder and they stop, come down and they come down the same rungs.
 */
export function rungs(y: number, reach = 5): { 'Foot.L': number; 'Foot.R': number; 'Hand.L': number; 'Hand.R': number } {
  const u = y / RUNGS;
  const on = (o: number, up: number): number => {
    const v = u - o;
    const f = v - Math.floor(v);
    const k = Math.max(0, (f - 0.5) / 0.5);
    return RUNGS * (o + Math.floor(v) + k * k * (3 - 2 * k)) + RUNG * (1 + up);
  };
  return { 'Foot.L': on(0, 0), 'Foot.R': on(0.5, 0), 'Hand.R': on(0, reach), 'Hand.L': on(0.5, reach) };
}
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
  /** How one model lay when it started to get up: each of its joints' turns, in the rig's order, and where its hips were. */
  private lain: { root: THREE.Object3D; joints: THREE.Quaternion[]; hips: THREE.Vector3 | undefined } | null = null;
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
  private limbs = limbsOf(0.9);
  /**
   * The feet over the ground. Walking, each is where the stride has it (`stride`) and `slip` is
   * how far from that its planted spot has come to be, metres: the spot stays where it is on the
   * ground while the figure's speed, and with it the length of its stride, changes under it.
   * Standing (`halted`), each foot is where it was when the figure stopped (`stood`: metres ahead
   * of the hip, and above the ground), and those out of place are stepped home one at a time
   * (`closing`), lifted: a foot on the ground is never slid. `own` is how much the standing feet
   * count, 1 while halted and easing to 0 as the figure sets off.
   */
  private readonly slip = { L: 0, R: 0 };
  private readonly last = { L: 0, R: 0 };
  /**
   * And when the figure turns: a planted foot stays on its spot and goes on pointing the way it did, so in the figure's
   * own frame it goes round the other way. `veer` is that for a striding foot (metres to the figure's left of the
   * stride's line, and radians), kept while it is planted and gone by its next landing; a standing foot has it in
   * `stood` (`z`, `yaw`), and is stepped home from it. A foot is not turned further on its leg than FOOT_TURN: past
   * that it pivots where it is.
   */
  private readonly veer = { L: { z: 0, yaw: 0 }, R: { z: 0, yaw: 0 } };
  /** How far to its own side each foot's line was when the feet were last moved, metres (`tread`). */
  private lined: number | null = null;
  private readonly stood = {
    L: { x: 0, y: 0, z: 0, yaw: 0, tip: 0, thigh: 0, knee: 0, was: { thigh: 0, knee: 0, pitch: 0 } },
    R: { x: 0, y: 0, z: 0, yaw: 0, tip: 0, thigh: 0, knee: 0, was: { thigh: 0, knee: 0, pitch: 0 } },
  };
  private halted = false;
  /** The feet a standing figure has just put down from a step (`close`), for `footfalls`. */
  private readonly put: ('L' | 'R')[] = [];
  private own = 0;
  /** Standing: how far the hips were below standing height when the feet in the air were last moved with them, metres. */
  private rode = 0;
  private closing: {
    side: 'L' | 'R';
    x: number;
    y: number;
    z: number;
    yaw: number;
    to: number;
    tip: number;
    high: number;
    t: number;
    takes: number;
    /** The ground where it was lifted and where it will be put down (`footing`), once they have been asked for. */
    from?: number;
    aim?: number;
  } | null = null;
  /**
   * The ground, where it is not flat (`Terrain`: what the last `advance` was given, or null). Each foot has its own
   * (`trod`, heights in the terrain's measure): `spot` is the ground under the place its leg is solved to; `from` the
   * tread it last stood on and `aim` the one it is going to, and `rides` its claim on the figure's height: its tread
   * while it is planted, and carried from the one to the other over its swing (`u`: how far through that it is). The
   * figure's own ground (`base`) is the lower of the two claims, eased where they cross: going up, the pelvis rises
   * over the leading foot while the other swings past and is carried level while it reaches for the next tread;
   * going down it is let down on the standing leg to the tread the other is coming to. `to` is where the foot means
   * to land, metres along the way gone (`gone`), chosen as it leaves so that it lands whole on a tread and not across
   * a riser (`settleOn`); `owed` is the cycle's phase still to be made up for landings moved so, taken a little with
   * every stride so that the steps come to the length the flight asks. `held` is how planted the stride had it last.
   */
  private terrain: Terrain | null = null;
  private gone = 0;
  private readonly trod = {
    L: { spot: 0, from: 0, aim: 0, rides: 0, u: 0, to: null as number | null, held: 1 },
    R: { spot: 0, from: 0, aim: 0, rides: 0, u: 0, to: null as number | null, held: 1 },
  };
  private base = 0;
  private owed = 0;
  private readonly profile = { L: new Map<number, number>(), R: new Map<number, number>() };
  /** The ground's heights, as far as the figure is on its feet on it: not in the air, on a ladder, in a seat or getting up. */
  private get footed(): number {
    return this.terrain && !this.up ? (1 - this.air) * (1 - this.climb) * (1 - this.sat) * (1 - this.fall) : 0;
  }
  /** How far the ground a foot's leg is solved to is above the figure's own, metres. */
  private above(side: 'L' | 'R'): number {
    return (this.trod[side].spot - this.base) * this.footed;
  }
  /** How far the figure's own ground is above where the walker has it standing, metres: what its hips are lifted by (`apply`). */
  get lift(): number {
    return this.terrain ? (this.base - this.terrain.level) * this.footed : 0;
  }
  /**
   * And the eyes': midway between the two feet's claims, which up or down an even flight is a straight slope, metres
   * above where the walker has the figure standing. (The pelvis goes up a flight in pulls; a head does not.)
   */
  get carried(): number {
    return this.terrain ? ((this.trod.L.rides + this.trod.R.rides) / 2 - this.terrain.level) * this.footed : 0;
  }

  /** The moment as it stands: what `pose` and `view` are asked. */
  get moment(): Moment {
    return {
      limbs: this.limbs,
      feet: this.feet(),
      over: this.footed ? this.over : undefined,
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

  /** Where the feet are now: the stride's, each planted spot kept where it was put, and the standing feet as far as they count. */
  private feet(grounded = true): Feet {
    const cycle = stride(this.phase, this.speed, this.leg);
    for (const side of ['L', 'R'] as const) {
      this.footOf(cycle[side], side);
      // (each on its own ground: the tread it stands on or is coming to, over the figure's)
      if (grounded && cycle[side].hold > 0 && this.footed) cycle[side].y += this.above(side);
    }
    return cycle;
  }

  /** One foot of `feet`, on flat ground. */
  private footOf(foot: Footing, side: 'L' | 'R'): void {
    const own = this.own;
    {
      if (foot.hold > 0) foot.x += this.slip[side];
      if (foot.hold > 0 && (this.veer[side].z || this.veer[side].yaw)) {
        foot.aside = this.veer[side].z;
        foot.turn = this.veer[side].yaw;
      }
      if (!own) return;
      const hold = own + (1 - own) * foot.hold;
      foot.x = (own * this.stood[side].x + (1 - own) * foot.hold * foot.x) / hold;
      if (this.stood[side].z || this.stood[side].yaw || foot.aside || foot.turn) {
        foot.aside = (own * this.stood[side].z + (1 - own) * foot.hold * (foot.aside ?? 0)) / hold;
        foot.turn = (own * this.stood[side].yaw + (1 - own) * foot.hold * (foot.turn ?? 0)) / hold;
      }
      foot.y = (own * this.stood[side].y) / hold;
      foot.tip = own * this.stood[side].tip;
      foot.own = own;
      if (this.stood[side].thigh || this.stood[side].knee)
        foot.bent = { thigh: own * this.stood[side].thigh, knee: own * this.stood[side].knee };
      foot.hold = hold;
    }
  }

  /** `Moment.over`: what a foot in the air is over, above the figure's own ground. */
  private readonly over = (side: 'L' | 'R', x: number): number => {
    const t = this.terrain;
    if (!t) return 0;
    const foot = this.trod[side];
    // The ground under the whole foot, and what is coming: a riser ahead of the toes is risen for before they reach
    // it, and a nosing behind the heel is come down from after it, at STEEP; less and less of that as the foot comes
    // to its landing, which is whole on its tread with nothing more to cross.
    const steep = STEEP / Math.max(0.4, Math.min(1, (1 - foot.u) / 0.3));
    const stand = this.limbs.stand ?? this.limbs.hip ?? 0.1 * this.leg;
    const left = (side === 'L' ? 1 : -1) * (this.lined ?? stand);
    const lo = x - HEEL - GRAIN;
    const hi = x + TOES + GRAIN;
    const reach = STEP_MOST / steep;
    // (and the line it is carried along from the tread it left to the one it is going to: up first and then along
    // going up, along first and then down going down, as a foot is taken over a nosing)
    const rising = foot.aim >= foot.from;
    const v = rising ? Math.min(1, foot.u / PATH_UP) : Math.max(0, (foot.u - (1 - PATH_DOWN)) / PATH_DOWN);
    let most = foot.from + (foot.aim - foot.from) * v * v * (3 - 2 * v);
    const seen = this.profile[side];
    for (let i = Math.ceil((lo - reach + this.gone) / GRAIN); i * GRAIN - this.gone <= hi + reach; i++) {
      const at = i * GRAIN - this.gone;
      let h = seen.get(i);
      if (h === undefined) seen.set(i, (h = t.at(at, left) ?? t.level));
      most = Math.max(most, h - steep * Math.max(0, at - hi, lo - at));
    }
    return (most - this.base) * this.footed;
  };

  /**
   * Where a foot coming down with its ankle `x` ahead is put instead, so that it lands whole on one tread: clear of
   * a riser that stands over it (ahead of the toes going up, behind the heel going down) and no more than a little
   * over an edge that falls away. `ground` is the ground's height along the foot's line. On a tread shorter than the
   * foot it is put in the middle; on open ground it is put where it was going, and so it is where there is no ground
   * within a step of `level` to put it on.
   */
  private settleOn(x: number, ground: (x: number) => number, level: number): { x: number; floor: number } {
    // (a stride that would come down two treads on, or past the edge of a drop, comes down on the nearest ground there is: short of it first)
    if (Math.abs(ground(x) - level) > STEP_MOST) {
      let near: number | null = null;
      for (let i = 1; near === null && i * EDGE_GRAIN <= REPLAN; i++)
        for (const way of [-1, 1]) {
          if (Math.abs(ground(x + way * i * EDGE_GRAIN) - level) > STEP_MOST) continue;
          near = x + way * (i + 1) * EDGE_GRAIN;
          break;
        }
      if (near === null) return { x, floor: level };
      x = near;
    }
    const edge = (way: 1 | -1, far: number): { at: number; higher: boolean } | null => {
      let last = ground(x);
      for (let i = 1; i * EDGE_GRAIN <= far; i++) {
        const h = ground(x + way * i * EDGE_GRAIN);
        if (Math.abs(h - last) > EDGE) {
          let a = x + way * (i - 1) * EDGE_GRAIN;
          let b = x + way * i * EDGE_GRAIN;
          for (let k = 0; k < 3; k++) {
            const mid = (a + b) / 2;
            if (Math.abs(ground(mid) - last) > EDGE) b = mid;
            else a = mid;
          }
          return { at: (a + b) / 2, higher: h > last };
        }
        last = h;
      }
      return null;
    };
    const back = edge(-1, HEEL + 0.22);
    const fore = edge(1, TOES + 0.22);
    const lo = back ? back.at + HEEL + (back.higher ? RISER_CLEAR : -OVERHANG) : Number.NEGATIVE_INFINITY;
    const hi = fore ? fore.at - TOES - (fore.higher ? RISER_CLEAR : -OVERHANG) : Number.POSITIVE_INFINITY;
    const to = lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, x));
    const floor = ground(to);
    return Math.abs(floor - level) > STEP_MOST ? { x, floor: level } : { x: to, floor };
  }

  /**
   * The ground under each foot, a frame on in which the figure went `distance` (see `terrain`): a planted foot's is
   * asked for where it stands, every frame, so a floor that moves carries it; a foot that leaves the ground chooses
   * where it will land, and one that starts to reach for its landing is given the spot.
   */
  private footing(distance: number, still: boolean, airborne: boolean): void {
    this.profile.L.clear();
    this.profile.R.clear();
    const t = this.terrain;
    if (!t) {
      this.owed = this.base = 0;
      for (const foot of [this.trod.L, this.trod.R]) {
        foot.spot = foot.from = foot.aim = foot.rides = foot.u = 0;
        foot.to = null;
        foot.held = 1;
      }
      return;
    }
    // (off the ground there is none to ask: the feet's are faded out as they were, and asked for again on landing)
    if (airborne || !this.footed) return;
    const stand = this.limbs.stand ?? this.limbs.hip ?? 0.1 * this.leg;
    const line = this.lined ?? stand;
    const cycle = stride(this.phase, this.speed, this.leg);
    const st = stance(this.speed);
    const standing = still || this.own >= 1;
    const since = (side: 'L' | 'R'): number => {
      const from = this.phase - (side === 'L' ? 0.5 : 0);
      return from - Math.round(from);
    };
    // a foot leaving the ground chooses its landing; one starting to reach for it is given the spot
    if (!standing)
      for (const side of ['L', 'R'] as const) {
        const foot = this.trod[side];
        const left = (side === 'L' ? 1 : -1) * line;
        // (ground more than a step above or below the foot that stands is not ground to step on: a wall to keep the
        // toes out of, a drop to keep the foot from; and a landing that finds none is made where the other foot stands)
        const stands = this.trod[side === 'L' ? 'R' : 'L'].spot;
        const ground = (x: number) => {
          const h = t.at(x, left);
          return h === null || h < stands - STEP_MOST ? stands - 1 : h > stands + STEP_MOST ? stands + 1 : h;
        };
        const h = cycle[side].hold;
        const d = since(side);
        const reach = span(this.speed, this.leg);
        if (h < 1 && foot.held >= 1 && (d > 0 || h <= 0)) {
          // (it lands as far ahead of the hips as the stride has it, when the figure has gone what is left of its swing)
          const ahead = st * reach + (1 - st - (d > 0 ? d : d + 1)) * cycleLength(this.speed, this.leg);
          const landing = this.settleOn(ahead, ground, stands);
          foot.to = this.gone + landing.x;
          foot.aim = landing.floor;
        } else if (h > 0 && h < 1 && d < 0 && foot.held <= 0) {
          const stride = cycle[side].x;
          let want = foot.to === null ? stride : foot.to - this.gone;
          if (Math.abs(want - stride) > REPLAN) want = stride;
          const landing = this.settleOn(want, ground, stands);
          this.slip[side] = landing.x - stride;
          if (reach > 0.05) this.owed = Math.max(-OWED_MOST, Math.min(OWED_MOST, this.owed - this.slip[side] / reach));
          foot.to = this.gone + landing.x;
        }
        foot.held = h;
      }
    const feet = this.feet(false);
    // What a foot stands on is the highest of what is under its heel, its ankle and its toes (a foot across a
    // sleeper rests on the sleeper, it is not in it), unless that is a step above the rest: then it is a wall.
    const under = (x: number, l: number, was: number): number => {
      const mid = t.at(x, l);
      if (mid === null) return was;
      let most = mid;
      for (const o of [-HEEL, TOES]) {
        const h = t.at(x + o, l);
        if (h !== null && h > most && h - mid <= STEP_MOST) most = h;
      }
      return most;
    };
    for (const side of ['L', 'R'] as const) {
      const foot = this.trod[side];
      const at = feet[side];
      const left = (side === 'L' ? 1 : -1) * line;
      if (standing) {
        const step = this.closing?.side === side ? this.closing : null;
        if (step) {
          // a foot stepped home is carried from the ground it left to the ground it is put on
          step.from ??= foot.spot;
          step.aim ??= under(step.to, left + (step.to && step.to === step.x ? step.z : 0), foot.spot);
          const u = Math.min(1, step.t / step.takes);
          foot.spot = step.from + (step.aim - step.from) * u * u * (3 - 2 * u);
        } else if (this.stood[side].y <= 0.002) foot.spot = under(at.x, left + (at.aside ?? 0), foot.spot);
        foot.from = foot.aim = foot.rides = foot.spot;
        foot.to = null;
        foot.held = 1;
        foot.u = 0;
        continue;
      }
      const h = cycle[side].hold;
      const d = since(side);
      if (h >= 1) {
        foot.spot = under(at.x, left + (at.aside ?? 0), foot.spot);
        foot.from = foot.aim = foot.rides = foot.spot;
        foot.u = 0;
        continue;
      }
      foot.u = Math.min(1, Math.max(0, ((d > 0 ? d : d + 1) - st) / Math.max(1e-6, 1 - 2 * st)));
      if (d > 0 || h <= 0) foot.spot = foot.from;
      else {
        // reaching: the ground at the spot it is given; what it was aimed at comes to that, if it was not that already
        foot.spot = under(at.x, left + (at.aside ?? 0), foot.spot);
        foot.aim += (foot.spot - foot.aim) * (1 - Math.exp(-distance / 0.03));
      }
      foot.rides = foot.from + (foot.aim - foot.from) * foot.u;
    }
    // the figure's own ground: the lower of the two feet's, eased where they cross, and exactly theirs where they agree
    const a = this.trod.L.rides;
    const b = this.trod.R.rides;
    this.base = (a + b - Math.sqrt((a - b) ** 2 + CROSS * CROSS) + CROSS) / 2;
  }

  /**
   * The feet, a frame on, in which the figure went `distance`. Moving, a planted foot is left
   * where it is on the ground. Standing `still` (`halt` has taken the feet where they were), each
   * that is out of place is stepped home.
   */
  private tread(distance: number, still: boolean, airborne: boolean, dt: number, turn = 0): void {
    // The figure turned `turn` about its own middle: a spot on the ground `x` ahead of it and `l` to its left is
    // now here, and a foot planted there points this much further to its right. (`home`: how far to the left the
    // foot's own line is.)
    const round = (at: { x: number; z: number; yaw: number }, home: number): void => {
      const l = home + at.z;
      const c = Math.cos(turn);
      const s = Math.sin(turn);
      [at.x, at.z] = [at.x * c + l * s, l * c - at.x * s - home];
      at.yaw = Math.max(-FOOT_TURN, Math.min(FOOT_TURN, at.yaw - turn));
    };
    // How far to its own side each foot's line is at this pace: where it stands, coming in to the stride's line as
    // the figure gets going (`carriage`). A planted foot does not come in with it: it stays where it is (`veer`).
    const stand = this.limbs.stand ?? this.limbs.hip ?? 0.1 * this.leg;
    const line = stand - Math.max(0, stand - track(this.speed)) * Math.min(1, Math.max(0, this.speed / WALK)) * (1 - this.air);
    const was = this.lined ?? line;
    this.lined = line;
    if (!still) {
      // setting off: a foot the stride keeps planted is planted where it stood, turned as it stood
      if (this.halted)
        for (const side of ['L', 'R'] as const) {
          this.veer[side].z = this.stood[side].z;
          this.veer[side].yaw = this.stood[side].yaw;
        }
      this.halted = false;
      this.closing = null;
      this.own *= Math.exp(-dt * 18);
      if (this.own < 0.01) this.own = 0;
      const cycle = stride(this.phase, this.speed, this.leg);
      for (const side of ['L', 'R'] as const) {
        const foot = cycle[side];
        const home = side === 'L' ? line : -line;
        // (a foot the standing figure left planted goes back with the ground while it still counts)
        if (this.own && !airborne) {
          this.stood[side].x -= distance;
          if (this.stood[side].y <= 0.002) this.stood[side].z += (side === 'L' ? 1 : -1) * (was - line);
          if (turn && this.stood[side].y <= 0.002) round(this.stood[side], home);
        }
        if (foot.hold <= 0) this.slip[side] = this.veer[side].z = this.veer[side].yaw = 0;
        // (a foot reaching for a spot it was given keeps that spot too: `footing`)
        else if (this.terrain && foot.hold < 1 && foot.x > 0 && !airborne) this.slip[side] -= distance + (foot.x - this.last[side]);
        else if (foot.hold >= 1 && !airborne) {
          this.slip[side] -= distance + (foot.x - this.last[side]);
          this.veer[side].z += (side === 'L' ? 1 : -1) * (was - line);
          if (turn) {
            const at = { x: foot.x + this.slip[side], z: this.veer[side].z, yaw: this.veer[side].yaw };
            round(at, home);
            this.slip[side] = at.x - foot.x;
            this.veer[side].z = at.z;
            this.veer[side].yaw = at.yaw;
          }
        }
        this.last[side] = foot.x;
      }
      return;
    }
    if ((turn || was !== line) && !airborne)
      for (const side of ['L', 'R'] as const) {
        if (this.stood[side].y > 0.002) continue;
        this.stood[side].z += (side === 'L' ? 1 : -1) * (was - line);
        if (!turn) continue; // (the line going out from under a foot is the hips' doing: the leg follows as it does them)
        // (what the turn itself asks of the leg is the leg's at once, as a step's is: only what moves the hips is followed after)
        const from = this.legOf(side);
        round(this.stood[side], side === 'L' ? line : -line);
        const to = this.legOf(side);
        this.stood[side].was.thigh += to.thigh - from.thigh;
        this.stood[side].was.knee += to.knee - from.knee;
        this.stood[side].was.pitch += to.pitch - from.pitch;
      }
    // A foot in the air is the body's, not the ground's: it goes up and down with the hips as the
    // stride's bob goes out of them. (Left where it was over the ground, hips rising a centimetre in
    // a frame pulled a leg that was all but straight straight: twenty degrees of knee at once.)
    const drop = lowered(this.phase, this.speed, this.hard * give(this.since), this.limbs);
    const risen = this.rode - drop;
    this.rode = drop;
    for (const side of ['L', 'R'] as const) {
      if (this.stood[side].y <= 0.002) continue;
      this.stood[side].y = Math.max(0, this.stood[side].y + risen);
      if (this.closing?.side === side) this.closing.y = Math.max(0, this.closing.y + risen);
    }
    if (!airborne) this.close(distance, dt);
  }

  /** Standing, after the feet have been moved (`tread`) and the ground under them asked for (`footing`). */
  private follow(dt: number): void {
    // The legs come to where their feet put them, and do not jump there: a leg caught in mid-swing
    // is not yet its foot's, and a knee all but straight turns ten degrees for three millimetres of
    // the hips' height, which the stride's bob going out of a figure that stops gives it in a frame.
    const ease = Math.exp(-dt * BENT_OUT);
    const fine = (v: number) => (Math.abs(v) < 1e-3 ? 0 : v);
    for (const side of ['L', 'R'] as const) {
      const foot = this.stood[side];
      const leg = this.legOf(side);
      foot.thigh = fine((foot.was.thigh - leg.thigh) * ease);
      foot.knee = fine((foot.was.knee - leg.knee) * ease);
      // (the foot that is stepping levels by the step: `close`)
      if (side !== this.closing?.side) foot.tip = fine((foot.was.pitch - leg.pitch) * Math.exp(-dt * 10));
      foot.was.thigh = leg.thigh + foot.thigh;
      foot.was.knee = Math.max(0, leg.knee + foot.knee);
      foot.was.pitch = leg.pitch + foot.tip;
    }
  }

  /** Standing: the feet go back with the ground the figure went over, and one that is out of place is stepped home. */
  private close(distance: number, dt: number): void {
    for (const side of ['L', 'R'] as const) this.stood[side].x -= distance;
    let step = this.closing;
    if (!step) {
      // One that is in the air comes down first: home, or straight down where it is if the other
      // is in the air too (somebody has to be standing). Then whichever stands furthest from home.
      const up = (side: 'L' | 'R') => this.stood[side].y > 0.002;
      // (how far out of place: over the ground, and a foot turned a right angle counts as one a foot's length away)
      const out = (side: 'L' | 'R') => Math.hypot(this.stood[side].x, this.stood[side].z) + TURNED_OUT * Math.abs(this.stood[side].yaw);
      const both = up('L') && up('R');
      const side = both ? (this.stood.L.y <= this.stood.R.y ? 'L' : 'R') : up('L') ? 'L' : up('R') ? 'R' : out('L') >= out('R') ? 'L' : 'R';
      const foot = this.stood[side];
      if (!up(side) && out(side) <= HOME) return; // near enough: they stand where they are
      const far = both ? 0 : out(side);
      step = this.closing = {
        side,
        x: foot.x,
        y: foot.y,
        z: foot.z,
        yaw: foot.yaw,
        to: both ? foot.x : 0,
        tip: foot.tip,
        // (lifted clear of the ground on the way, unless it is in the air already)
        high: Math.max(0, Math.min(0.08, 0.025 + 0.15 * far) - foot.y),
        t: 0,
        takes: Math.min(0.38, 0.14 + 0.5 * far),
      };
    }
    step.x -= distance;
    if (step.to) step.to -= distance;
    // (a foot in the air is the body's: it turns with the figure, and comes down where its home now is)
    const smooth = (v: number) => v * v * (3 - 2 * v);
    const foot = this.stood[step.side];
    const at = (t: number): number => {
      const u = Math.min(1, t / step.takes);
      // (it is over its place before it is down on it: a foot does not land going sideways)
      foot.x = step.to + (step.x - step.to) * (1 - smooth(Math.min(1, u / 0.8)));
      // (a foot coming straight down where it is, the other being in the air too, keeps its place and its turn for the next step)
      const there = step.to && step.to === step.x ? 1 : 1 - smooth(Math.min(1, u / 0.8));
      foot.z = step.z * there;
      foot.yaw = step.yaw * there;
      foot.y = step.y * (1 - smooth(u)) + step.high * Math.sin(Math.PI * u) ** 2;
      // (and level well before it is down: toes that were pointing down do not reach the ground first)
      foot.tip = step.tip * (1 - smooth(Math.min(1, u / 0.5)));
      return u;
    };
    // The step goes no faster than a leg bends: a straight leg lifted and brought in bends a long
    // way for a little (twenty degrees of knee in a sixtieth of a second, taken at its own pace),
    // so the frame's share of the step is cut until no joint of the leg turns faster than LIMB_RATE.
    const turns = (): [number, number, number] => {
      const leg = this.legOf(step.side);
      return [leg.thigh, leg.knee, leg.pitch + foot.tip - leg.thigh - leg.knee];
    };
    const from = turns();
    let take = dt;
    let u = at(step.t + take);
    for (let i = 0; i < 6; i++) {
      const to = turns();
      if (Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]), Math.abs(to[2] - from[2])) <= LIMB_RATE * dt) break;
      take *= 0.5;
      u = at(step.t + take);
    }
    step.t += take;
    // (what the step itself turned the leg by is the leg's at once: it is only what moves the hips that the leg follows after)
    const to = turns();
    foot.was.thigh += to[0] - from[0];
    foot.was.knee += to[1] - from[1];
    if (u >= 1) {
      foot.x = step.to;
      foot.y = 0;
      if (!(step.to && step.to === step.x)) foot.z = foot.yaw = 0;
      if (step.high > 0.02) this.put.push(step.side); // a foot lifted and put down is heard
      this.closing = null;
    }
  }

  /** A standing leg as its foot stands now (`stood`) puts it: what the pose makes of it while the feet are the figure's own. */
  private legOf(side: 'L' | 'R'): { thigh: number; knee: number; pitch: number } {
    const foot = this.stood[side];
    const drop = lowered(this.phase, this.speed, this.hard * give(this.since), this.limbs);
    const hip = carriage(this.phase, this.speed, this.limbs, 1 - this.air, drop)[side];
    const { ahead, joint } = turnedOver(this.limbs, hip, side === 'L' ? 1 : -1, foot.x, foot.z, foot.yaw);
    return planted(this.limbs, ahead, foot.y + this.above(side), drop, joint, straightest(this.speed));
  }

  /** The figure has stopped: a planted foot is taken where it is planted, and a swinging one where the pose has it, over the ground. */
  private halt(): void {
    const m = { ...this.moment, air: 0, fall: 0, climb: 0, sit: 0 };
    const p = pose(m);
    const drop = lowered(m.phase, m.speed, m.crouch ?? 0, this.limbs);
    // (as the pose just taken had the pelvis: on the ground)
    const pelvis = carriage(m.phase, m.speed, this.limbs, 1, drop);
    const flat = this.feet(false);
    for (const side of ['L', 'R'] as const) {
      const [x, y] = footAt(this.limbs, p[`UpperLeg.${side}`], p[`LowerLeg.${side}`], drop, pelvis[side]);
      // (the foot as it is on flat ground: what its own ground is over the figure's is the ground's, and is added again)
      const foot = flat[side];
      this.stood[side].x = x + (foot.x - x) * foot.hold;
      this.stood[side].y = Math.max(0, y - this.above(side)) * (1 - foot.hold) + foot.y * foot.hold;
      // and pitched as it was, over what a foot planted there would be: that goes out as it comes down
      const lean = p[`UpperLeg.${side}`] + p[`LowerLeg.${side}`] + p[`Foot.${side}`];
      this.stood[side].z = (foot.aside ?? 0) * foot.hold;
      this.stood[side].yaw = (foot.turn ?? 0) * foot.hold;
      this.veer[side].z = this.veer[side].yaw = 0;
      const over = turnedOver(
        this.limbs,
        pelvis[side],
        side === 'L' ? 1 : -1,
        this.stood[side].x,
        this.stood[side].z,
        this.stood[side].yaw,
      );
      const put = planted(this.limbs, over.ahead, this.stood[side].y + this.above(side), drop, over.joint, straightest(m.speed));
      this.stood[side].tip = lean - put.pitch;
      // and the leg turned as it was, over what that foot makes it: a leg part of the way through its swing is not yet its foot's
      this.stood[side].thigh = p[`UpperLeg.${side}`] - put.thigh;
      this.stood[side].knee = p[`LowerLeg.${side}`] - put.knee;
      this.stood[side].was = { thigh: p[`UpperLeg.${side}`], knee: p[`LowerLeg.${side}`], pitch: lean };
      this.slip[side] = 0;
    }
    this.rode = drop;
    this.halted = true;
    this.closing = null;
    this.own = 1;
  }

  /** The feet have come down from a fall of `height` metres: the knees give. */
  land(height: number): void {
    // From the crouch it is in, if it is in one (a second landing while the knees are still giving,
    // a jump wound up as they come back): the deeper of the two, taken up where the knees are now.
    const now = this.hard * give(this.since);
    const next = landing(height);
    if (now >= next) {
      // already deeper than this landing asks: it comes up from here
      this.hard = now;
      this.since = GIVE_DOWN;
    } else {
      // part of the way down already: the give is picked up where it passes through that (the inverse of its smooth step)
      this.hard = next;
      this.since = GIVE_DOWN * (0.5 - Math.sin(Math.asin(1 - (2 * now) / next) / 3));
    }
    this.landed = height;
  }

  /**
   * What the last `advance` brought down: each foot that landed in it (the left at phase 0.25, the
   * right at 0.75, by distance gone, so a footfall is heard when it is seen), and a landing's
   * height. For the sound (audio.ts); emptied by every advance.
   */
  readonly footfalls: ('L' | 'R')[] = [];
  /** A landing from a jump or a fall in the last advance, metres; null if none. */
  landed: number | null = null;
  /** Where in the breath it is, 0 to 1: continuous, where the pose's breathing moves in steps. */
  get breathPhase(): number {
    return this.breathing ? (this.clock / BREATH) % 1 : 0;
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
      // a foot's joint is at the ankle: the sole is a little under it, as far as the ankle stands over the model's own ground
      const over = foot ? root.worldToLocal(foot.getWorldPosition(new THREE.Vector3())).y : 0;
      const sole = over > 0.02 && over < 0.2 ? over : 0.08;
      const leg =
        hip && foot ? (hip.getWorldPosition(new THREE.Vector3()).y - foot.getWorldPosition(new THREE.Vector3()).y) / scale + sole : 0.9;
      // the bones as built, where the model has a knee to measure them by; else a man's proportions
      const knee = find('LowerLeg.L');
      const between = (a: THREE.Object3D, b: THREE.Object3D) =>
        a.getWorldPosition(new THREE.Vector3()).distanceTo(b.getWorldPosition(new THREE.Vector3())) / scale;
      const thigh = hip && knee ? between(hip, knee) : 0;
      const shin = knee && foot ? between(knee, foot) : 0;
      const limbs: Limbs =
        thigh > 0.05 && shin > 0.05 && leg - thigh - shin > 0 ? { thigh, shin, ankle: leg - thigh - shin } : limbsOf(leg);
      // how wide the hips are and how wide it stands, where the model has both legs to say
      const other = find('UpperLeg.R');
      const otherFoot = find('Foot.R');
      if (hip && other) limbs.hip = between(hip, other) / 2;
      if (foot && otherFoot) limbs.stand = between(foot, otherFoot) / 2;
      rig = { joints, leg, limbs };
    }
    this.rigs.set(root, rig);
    return rig;
  }

  /** How high the hips of the model under `root` stand over its feet as built, metres (0.98 if it has no joints to say). */
  hipHeight(root: THREE.Object3D): number {
    return this.rig(root)?.joints.find((j) => j.joint === 'Hips')?.y ?? 0.98;
  }

  /** How high the ankles' joints stand over the model's own ground as built, metres (0.1 if it has none). */
  ankleHeight(root: THREE.Object3D): number {
    const limbs = this.rig(root)?.limbs;
    return limbs ? limbs.ankle : 0.1;
  }

  /** Has this model joints to move? */
  jointed(root: THREE.Object3D): boolean {
    return this.rig(root) !== null;
  }

  /**
   * A frame has passed in which the figure went `distance` metres over the ground at `speed`,
   * on the ground or `airborne`, and turned `turn` radians about its feet. Says how much the
   * pose has changed: see Stir. A turn is the feet's too: a planted foot stays on its spot and keeps pointing the way
   * it did while the figure turns over it (`tread`), and standing, the feet are then stepped round to where they
   * belong, one at a time (`close`). Nothing is slid, and nothing walks on the spot.
   */
  advance(
    distance: number,
    speed: number,
    airborne: boolean,
    dt: number,
    climbing = false,
    dropped = 0,
    turn = 0,
    terrain: Terrain | null = null,
  ): Stir {
    this.terrain = terrain;
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
      ...this.treads(),
    ];
    // standing (and not sitting, climbing, falling or getting up), the feet are the figure's own: taken as the last frame drew them
    const still = speed < STILL_PACE && !climbing && !this.seated && !this.sat && !this.up && !this.fall && !(airborne && dropped > 0.7);
    if (still && !this.halted) this.halt();
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
    else if (!airborne) {
      // (and what is owed for landings moved on to their treads is made up a little with each stride: `footing`)
      const stride = distance / cycleLength(this.speed, this.leg);
      const paid = Math.sign(this.owed) * Math.min(Math.abs(this.owed), OWED_RATE * stride);
      this.owed -= paid;
      this.phase = (((this.phase + stride + paid) % 1) + 1) % 1;
      this.gone += distance;
    }
    if (this.speed === 0 && this.air === 0 && this.climb === 0 && this.fall === 0) this.phase = 0; // standing: the next step starts from the same foot
    this.tread(distance, still, airborne, dt, climbing || this.seated || this.sat || this.up || this.fall ? 0 : turn);
    this.footing(distance, still, airborne);
    if (still) this.follow(dt);
    // A foot lands as the phase passes a quarter (the left) and three quarters (the right): on the
    // ground, or on a rung. At a run it lands later than that, having been in the air (`stance`).
    this.footfalls.length = 0;
    this.footfalls.push(...this.put.splice(0));
    if (!airborne && !falling && this.phase !== was[0]) {
      const from = was[0]!;
      const to = this.phase < from ? this.phase + 1 : this.phase;
      const lands = climbing ? 0.25 : 0.5 - stance(this.speed);
      for (const [at, foot] of [
        [lands, 'L'],
        [lands + 0.5, 'R'],
        [lands + 1, 'L'],
        [lands + 1.5, 'R'],
      ] as const)
        if (from < at && to >= at) this.footfalls.push(foot);
    }
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
      ...this.treads(),
    ];
    // breathing goes on in steps, a dozen a second: a still view is redrawn that often for the scenery anyway
    this.clock += dt;
    const breath = this.breathing ? Math.floor(this.clock * BREATH_RATE) / BREATH_RATE / BREATH : 0;
    const breathed = breath !== this.breath;
    this.breath = breath;
    return now.some((v, i) => v !== was[i]) ? 2 : breathed ? 1 : 0;
  }

  /** Everything about the feet that the pose depends on, to tell whether a frame changed it. */
  private treads(): number[] {
    const { L, R } = this.stood;
    const v = this.veer;
    return [
      this.own,
      this.slip.L,
      this.slip.R,
      L.x,
      L.y,
      L.tip,
      L.thigh,
      L.knee,
      R.x,
      R.y,
      R.tip,
      R.thigh,
      R.knee,
      L.z,
      L.yaw,
      R.z,
      R.yaw,
      v.L.z,
      v.L.yaw,
      v.R.z,
      v.R.yaw,
      this.base,
      this.trod.L.spot,
      this.trod.R.spot,
      this.trod.L.rides,
      this.trod.R.rides,
      this.terrain?.level ?? 0,
    ];
  }

  /** Stand the feet under the hips, with nothing left over from the last stride. */
  private home(): void {
    this.slip.L = this.slip.R = this.last.L = this.last.R = 0;
    this.veer.L.z = this.veer.L.yaw = this.veer.R.z = this.veer.R.yaw = 0;
    this.lined = null;
    for (const foot of [this.stood.L, this.stood.R]) {
      foot.x = foot.y = foot.z = foot.yaw = foot.tip = foot.thigh = foot.knee = 0;
      foot.was = { thigh: 0, knee: 0, pitch: 0 };
    }
    this.halted = false;
    this.own = 0;
    this.closing = null;
  }

  /**
   * Start getting up off the ground, from lying on the front or the back (the figure's hips must
   * be over where its feet will be). `from` is the model as it lies: its joints are taken as they
   * are, and the first RISE_IN seconds of getting up go from that to the get-up's own keys, all
   * the way there at the end of them (`apply`). Eased toward the keys a fraction a frame and then
   * put on them, a knee jumped fifteen degrees at the hand-over.
   */
  rise(faceDown: boolean, from?: THREE.Object3D): void {
    const rig = from ? this.rig(from) : null;
    this.lain =
      from && rig
        ? {
            root: from,
            joints: rig.joints.map((j) => j.node.quaternion.clone()),
            hips: rig.joints.find((j) => j.joint === 'Hips')?.node.position.clone(),
          }
        : null;
    this.up = { t: 0, faceDown };
    this.phase = this.speed = this.air = this.fall = this.hard = 0;
    this.home();
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
    this.limbs = rig.limbs;
    const hips = rig.joints.find((j) => j.joint === 'Hips')?.y ?? 0.98;
    let p = this.up ? rising(this.up.t, this.up.faceDown, hips) : null;
    if (this.up && !p) this.up = null; // on its feet
    p ??= pose(this.moment);
    // getting up, the first moments are from however this model lay to the keys: all of the way by RISE_IN
    const lain = this.up && this.up.t < RISE_IN && this.lain?.root === root ? this.lain : null;
    if (!this.up || this.up.t >= RISE_IN) this.lain = null;
    const u = lain ? this.up!.t / RISE_IN : 1;
    const keyed = u * u * (3 - 2 * u);
    // The pelvis's own turn and tip are taken out of what hangs from it: the thighs and the spine
    // are told as if it stood square (see Pose), so each is turned back by what the pelvis turned.
    const pelvis = (p.twist.Hips ?? 0) || (p.sideways.Hips ?? 0);
    if (pelvis) {
      square.setFromAxisAngle(X, -p.Hips);
      square.multiply(turn.setFromAxisAngle(Z, -(p.sideways.Hips ?? 0)));
      square.multiply(turn.setFromAxisAngle(Y, -(p.twist.Hips ?? 0)));
      square.multiply(turn.setFromAxisAngle(X, p.Hips));
    }
    rig.joints.forEach(({ joint, node, rest, x, y, z }, i) => {
      const q = want.copy(rest);
      if (pelvis && FROM_HIPS.has(joint)) q.premultiply(square);
      // a leg that leans in from its hip keeps its sole level and its toes forward: the lean is taken out again at the ankle
      const leg = joint === 'Foot.L' ? 'L' : joint === 'Foot.R' ? 'R' : null;
      const lean = leg ? p.sideways[`UpperLeg.${leg}`] : 0;
      if (leg && lean) {
        const bent = p[`UpperLeg.${leg}`] + p[`LowerLeg.${leg}`];
        q.multiply(turn.setFromAxisAngle(X, -bent));
        q.multiply(turn.setFromAxisAngle(Z, -lean));
        q.multiply(turn.setFromAxisAngle(X, bent));
      }
      // sideways and twist first, in the joint's own frame as built, then the swing
      const side = p.sideways[joint];
      const twist = p.twist[joint];
      if (twist) q.multiply(turn.setFromAxisAngle(Y, twist));
      if (side) q.multiply(turn.setFromAxisAngle(Z, side));
      q.multiply(turn.setFromAxisAngle(X, p[joint]));
      if (lain) node.quaternion.copy(lain.joints[i]!).slerp(q, keyed);
      else if (toward >= 1) node.quaternion.copy(q);
      else node.quaternion.slerp(q, toward);
      if (joint !== 'Hips') return;
      // (and by what its own ground is over where it stands: the tread its lower foot is on, on a flight)
      place.set(x + p.shift, y + p.rise + p.sag + p.settle + (this.up ? 0 : this.lift), z);
      if (lain?.hips) node.position.copy(lain.hips).lerp(place, keyed);
      else if (toward >= 1) node.position.copy(place);
      else node.position.lerp(place, toward);
    });
    halfHips(root);
    return true;
  }

  /**
   * Stand the model's joints as they were built, and nothing else: the stride goes on from where
   * it is. (For measuring its bones: `apply` puts it back in the pose of the moment.)
   */
  asBuilt(root: THREE.Object3D): void {
    for (const { joint, node, rest, x, y, z } of this.rig(root)?.joints ?? []) {
      node.quaternion.copy(rest);
      if (joint === 'Hips') node.position.set(x, y, z);
    }
    halfHips(root);
  }

  /** How far the pose is the climb's, 0 to 1: it eases on and off a ladder, and what puts the hands and feet on the rungs eases with it. */
  get climbing(): number {
    return this.climb;
  }

  /** How far it is sat down, 0 (standing) to 1: what the pose is eased by, for whoever puts the figure in its seat (`sitAt`). */
  get sitting(): number {
    return this.sat;
  }

  /** Stand the figure as it was built, and start the next walk from the beginning. */
  rest(root: THREE.Object3D): void {
    this.phase = this.speed = this.air = this.hard = this.climb = this.fall = this.sat = this.wheel = 0;
    this.seated = false;
    this.up = null;
    this.lain = null;
    this.home();
    this.asBuilt(root);
  }
}

/** A figure's half-turn joints, each with the thigh it follows and how both sat when they were found. */
type Halves = { half: THREE.Object3D; thigh: THREE.Object3D; halfRest: THREE.Quaternion; thighRest: THREE.Quaternion }[];
const halves = new WeakMap<THREE.Object3D, Halves>();
const NO_TURN = new THREE.Quaternion();
const turned = new THREE.Quaternion();

/**
 * The cloth across each hip's crease follows a joint of its own, `HipHalf.L`/`.R` (a child of the
 * hips on the hip joint, beside the thigh, with nothing hanging from it): it is turned half as far
 * from rest as its thigh is, by the short way, so a thigh raised level folds the groin in two
 * steps of 45 degrees and the cloth there bunches instead of sinking. Called by whatever has just
 * posed the thighs under `root` (the gait, the ragdoll). A model built without the joint has
 * nothing to turn and is left as it is.
 */
export function halfHips(root: THREE.Object3D): void {
  let found = halves.get(root);
  if (!found) {
    const named = new Map<string, THREE.Object3D>();
    root.traverse((o) => {
      const key = jointKey(o.name);
      if (o.name && !named.has(key)) named.set(key, o);
    });
    found = [];
    for (const side of ['L', 'R']) {
      const half = named.get(jointKey(`HipHalf.${side}`));
      const thigh = named.get(jointKey(`UpperLeg.${side}`));
      if (half && thigh) found.push({ half, thigh, halfRest: half.quaternion.clone(), thighRest: thigh.quaternion.clone() });
    }
    halves.set(root, found);
  }
  for (const { half, thigh, halfRest, thighRest } of found) {
    // the thigh's turn from rest, in the frame both hang in (the pelvis's)
    turned.copy(thighRest).invert().premultiply(thigh.quaternion);
    half.quaternion.copy(NO_TURN).slerp(turned, 0.5).multiply(halfRest);
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
  return limbTo(root, `UpperArm.${side}`, `LowerArm.${side}`, [`Grip.${side}`, `Hand.${side}`], target);
}

/**
 * And a foot: the leg's two bones are turned so that the ankle (`Foot.L`/`.R`) is at `target`, in the world, the knee
 * bending the way the pose already had it; then the half-turn at the hip is put right for where the thigh now is.
 * (A rung under a climber's foot; the gait's own planted feet are solved in the pose.)
 */
export function step(root: THREE.Object3D, side: 'L' | 'R', target: THREE.Vector3): boolean {
  if (!limbTo(root, `UpperLeg.${side}`, `LowerLeg.${side}`, [`Foot.${side}`], target)) return false;
  halfHips(root);
  return true;
}

/** A limb of two bones, `from` and `mid`, turned so that its end (the first of `ends` the figure has) is at `target`. */
function limbTo(root: THREE.Object3D, from: string, mid: string, ends: string[], target: THREE.Vector3): boolean {
  const named = new Map<string, THREE.Object3D>();
  root.traverse((o) => {
    if (o.name && !named.has(jointKey(o.name))) named.set(jointKey(o.name), o);
  });
  const upper = named.get(jointKey(from));
  const lower = named.get(jointKey(mid));
  const hand = ends.map((e) => named.get(jointKey(e))).find((o) => o);
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

/** Somewhere a figure is put: where, and how it is turned. */
export interface Placed {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
}

/**
 * Put a figure that is sitting down, or getting up out of a seat, between where it stands beside
 * the seat and where it sits in it, by how far its pose is sat (`Gait.sitting`, 0 to 1): the
 * pose eases from standing to sitting, and the figure goes from the one place to the other with
 * it. (Put in the seat at once, it stood upright in the cab until the pose caught up.)
 */
export function sitAt(figure: Placed, stand: Placed, seat: Placed, sat: number): void {
  const u = Math.min(1, Math.max(0, sat));
  const k = u * u * (3 - 2 * u);
  figure.position.lerpVectors(stand.position, seat.position, k);
  figure.quaternion.slerpQuaternions(stand.quaternion, seat.quaternion, k);
}

/**
 * How a figure sits in a seat under a roof: `tall` is the top of its head (helmet and all) over
 * its hips, standing, and `roof` the first thing over the seat's hip point, metres. If the head
 * would not clear it by a few centimetres, the figure sinks into the cushion (`drop`, up to 8 cm)
 * and then leans back (`recline`, radians, up to 35 degrees) until it does. A man of six foot
 * two in a pressure suit does not sit up straight in a 1960 compact. Past that he does not fit,
 * and what is wrong is the cab: the stage keeps the eyes under its roof all the same.
 */
export function seatFit(tall: number, roof: number): { drop: number; recline: number } {
  const room = roof - 0.04;
  const need = tall - room;
  if (!(need > 0)) return { drop: 0, recline: 0 };
  const drop = Math.min(0.08, need);
  return { drop, recline: Math.min(0.61, Math.acos(Math.min(1, (room + drop) / tall))) };
}

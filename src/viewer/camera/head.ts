import * as THREE from 'three';
import { approach } from './maths.ts';

/**
 * A head in a seat: where the eyes are and which way they look, in the seat's own frame (+Z where the eyes rest, +Y the
 * top of the head, the eyes at the origin), as a strapped-in person's would be. It knows no camera, page or flight; the
 * on-board rig (onboard.ts) and the walker in a couch (walk.ts) both carry one, and it is tested in node
 * (tests/head.test.mjs). What it promises:
 *
 *  - The head turns aside about the neck, not about the eyes: they go round with it, as they do, so far; the eyes
 *    turn the rest of the way, and do all of a look up or down.
 *  - It turns only so far (`Limits`, the seat's own), and less far down the further it is turned aside: looking down
 *    over a shoulder is into the couch and the suit, which the helmet's own rim hides from a real wearer.
 *  - Asked to look out of something (`leanTo`: a port, the periscope's screen), the eyes go to it along a curve that
 *    comes in along the line it is looked through, eased at both ends, never a cut; and asked again, or let go, back.
 *  - The hands are never fought: what they do while it leans turns the look about the place it is leaning to.
 */

/** How far the head turns from where the eyes rest, radians: to either side, up and down (CabinDef.head). */
export interface Limits {
  side: number;
  up: number;
  down: number;
}

/** A place in the seat's frame to look from and the way to look (+Z of it is the gaze), and the lens to see it through, degrees. */
export interface Pose {
  eye: THREE.Vector3;
  /** A camera's turn: its -Z is the gaze and its +Y the top of the picture. */
  quaternion: THREE.Quaternion;
  lens: number;
}

/** Something to lean to and look out through, in the scene: a port's pane (`across` its glass) or a screen (`radius`). */
export type Lookout =
  | { kind: 'port'; at: THREE.Vector3; out: THREE.Vector3; across: number; stop?: number }
  | { kind: 'screen'; at: THREE.Vector3; facing: THREE.Vector3; radius: number };

/** Where to lean to: the eyes, the way they look (a unit vector), the lens, all in the seat's frame. */
export interface Lean {
  eye: THREE.Vector3;
  gaze: THREE.Vector3;
  lens: number;
}

/**
 * Where the neck turns the head about, from the eyes, in the seat's frame: 8 cm toward the chin and 7 cm behind them.
 * Estimated: an adult's eyes are some 8 to 10 cm in front of the axis the head turns on and the head is bowed in the
 * helmet, its eyes resting below the line of the face.
 */
export const NECK: Readonly<THREE.Vector3> = new THREE.Vector3(0, -0.08, -0.07);
/**
 * How much of a turn aside is the head's, radians: the eyes do the rest. A head in a helmet fixed to the suit, lying in
 * a couch with a headrest, turns only so far inside it (estimated). Up and down are the eyes' alone: the neck ring
 * holds the chin, and a head that bowed would put the eyes into the collar.
 */
export const HEAD_TURN = 0.6;
/** How far the look turns about the place it leans to, radians: across and up or down (the face at the glass). */
export const GLANCE = { side: 0.45, up: 0.35, down: 0.35 };
/**
 * How far from a port's pane the eyes stop, metres: the visor's breadth in front of them, and a little; and further,
 * where what stands round a port leaves no room for a face at it (Stage.approach tries each in turn).
 */
export const AT_GLASS = [0.16, 0.22, 0.3, 0.4];
/** How much of the picture's height the glass of a port fills, leaning to it: the rest is its frame. */
const PORT_FILL = 0.9;
/** How much of it the periscope's screen fills, and the nearest the eyes come to it, metres. */
const SCREEN_FILL = 0.8;
const AT_SCREEN = 0.3;
/** How long a lean takes, seconds: so much and so much a metre, never more than the most. */
const LEAN_START = 0.6;
const LEAN_PER_METRE = 1.1;
const LEAN_MOST = 1.7;
/** How quickly the head comes back to where the eyes rest when asked (0), seconds. */
const HOME_TAU = 0.18;
/** The narrowest and widest lens a lean may be zoomed to, degrees. */
const NARROW = 18;
const WIDE = 80;

const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const HALF = new THREE.Quaternion().setFromAxisAngle(Y, Math.PI); // (a camera looks along its -Z: half a turn faces it along +Z)
const qa = new THREE.Quaternion();
const qb = new THREE.Quaternion();
const va = new THREE.Vector3();
const vb = new THREE.Vector3();

/** The lens the seat's limits are for, degrees: a wider one sees further round, so the head turns less far down with it. */
export const LIMITS_LENS = 62;

/**
 * The head turned `yaw` (to the left, about +Y) and `pitch` (up), as far as `limits` allow, seen through `lens`: to either
 * side; up as far as up goes whatever the turn; down by less the further it is turned aside (half as far from half the
 * turn on: over a shoulder is the couch's headrest and the suit, which a helmet's rim hides from whoever wears it). What
 * the limit keeps out of the picture is at its lower edge, so through a lens wider than `LIMITS_LENS` the head goes
 * less far down by as much as that edge goes further, and through a narrower one further (to the hands in the lap,
 * looked at closely), never more than twice as far.
 */
export function clampHead(yaw: number, pitch: number, limits: Limits, lens = LIMITS_LENS): [number, number] {
  const y = THREE.MathUtils.clamp(yaw, -limits.side, limits.side);
  const aside = limits.side > 0 ? Math.min(1, Math.abs(y) / (0.5 * limits.side)) : 0;
  const wider = THREE.MathUtils.degToRad(lens - LIMITS_LENS) / 2;
  const down = THREE.MathUtils.clamp(limits.down * (1 - 0.5 * aside * aside) - wider, 0, 2 * limits.down);
  return [y, THREE.MathUtils.clamp(pitch, -down, limits.up)];
}

/** Which way the eyes look with the head turned so, in the seat's frame: a unit vector. */
export function gazeOf(yaw: number, pitch: number, out = new THREE.Vector3()): THREE.Vector3 {
  return out.set(Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), Math.cos(pitch) * Math.cos(yaw));
}

/** A camera's turn for the head turned so: its -Z along `gazeOf`, its +Y the top of the head. */
export function turnOf(yaw: number, pitch: number, out = new THREE.Quaternion()): THREE.Quaternion {
  return out.setFromAxisAngle(Y, Math.PI + yaw).multiply(qa.setFromAxisAngle(va.set(1, 0, 0), pitch));
}

/**
 * Where the eyes are with the head turned so, in the seat's frame: gone round the neck (`NECK`) with as much of the turn
 * aside as is the head's (`HEAD_TURN`). The look up or down does not move them.
 */
export function eyeOf(yaw: number, _pitch = 0, out = new THREE.Vector3()): THREE.Vector3 {
  // eye = neck + turn * (0 - neck), the turn about the head's top
  qb.setFromAxisAngle(Y, THREE.MathUtils.clamp(yaw, -HEAD_TURN, HEAD_TURN));
  return out.copy(NECK).negate().applyQuaternion(qb).add(NECK);
}

/** Where a gaze along `gaze` (a unit vector) is seen from: the shortest turn to it from where the eyes rest, so the head does not roll. */
export function turnTo(gaze: THREE.Vector3, out = new THREE.Quaternion()): THREE.Quaternion {
  return out.setFromUnitVectors(Z, gaze).multiply(HALF);
}

/**
 * Leaning to a port: its pane's middle `at`, the way it faces out `out` (a unit vector) and its glass `across`, metres,
 * all in the seat's frame. The eyes stop `stop` inside the pane on its line, looking out along it, through a lens
 * that has the glass fill most of the picture's height and the port's frame round it.
 */
export function portLean(at: THREE.Vector3, out: THREE.Vector3, across: number, stop = AT_GLASS[0]!): Lean {
  const gaze = out.clone().normalize();
  const lens = THREE.MathUtils.radToDeg(2 * Math.atan(across / 2 / stop / PORT_FILL));
  return { eye: at.clone().addScaledVector(gaze, -stop), gaze, lens: THREE.MathUtils.clamp(lens, NARROW, WIDE) };
}

/**
 * Leaning to a screen: its middle `at`, the way it faces (toward whoever looks at it) `facing` and its `radius`, in the
 * seat's frame; `from` is where the eyes are. They go toward it along its line, to no nearer than `AT_SCREEN`, and the
 * lens has it fill most of the picture.
 */
export function screenLean(at: THREE.Vector3, facing: THREE.Vector3, radius: number, from: THREE.Vector3): Lean {
  const n = facing.clone().normalize();
  const away = Math.min(AT_SCREEN, from.distanceTo(at));
  const lens = THREE.MathUtils.radToDeg(2 * Math.atan(radius / away / SCREEN_FILL));
  return { eye: at.clone().addScaledVector(n, away), gaze: n.negate(), lens: THREE.MathUtils.clamp(lens, NARROW, WIDE) };
}

/**
 * How far through a lean its three parts are, `k` (0 to 1) through its time: where the eyes are, which way they look,
 * and the lens. Going out the head turns to what it leans to first, then the eyes go in to it and the view closes on
 * it last, as a person turns to look and then leans in to see; coming back, the other way about. Each is eased at
 * both ends, and all three are 0 at the start and 1 at the end.
 */
export function leanPhases(k: number, out: boolean): [move: number, turn: number, lens: number] {
  const t = THREE.MathUtils.clamp(k, 0, 1);
  const early = ease(Math.min(1, t / 0.7));
  const late = ease(Math.max(0, (t - 0.3) / 0.7));
  return out ? [ease(t), early, late] : [ease(t), late, early];
}

/** How long a lean of `metres` takes, seconds. */
export function leanSeconds(metres: number): number {
  return Math.min(LEAN_MOST, LEAN_START + LEAN_PER_METRE * metres);
}

/** Eased at both ends and level at them: 0 to 1 as `k` goes 0 to 1 (Perlin's smootherstep). */
export function ease(k: number): number {
  const t = THREE.MathUtils.clamp(k, 0, 1);
  return t * t * t * (t * (6 * t - 15) + 10);
}

/**
 * The eyes' way from `from` to `to`, at `s` (0 to 1) along it: a curve that leaves `from` along `leave` and comes in to
 * `to` along `arrive` (unit vectors: the line looked through at each end), or straight at either end given null. Going
 * out to a port it comes in along the line looked out of; coming back it leaves along it: the same way, reversed.
 */
export function leanPath(
  from: THREE.Vector3,
  to: THREE.Vector3,
  leave: THREE.Vector3 | null,
  arrive: THREE.Vector3 | null,
  s: number,
  out = new THREE.Vector3(),
): THREE.Vector3 {
  const d = from.distanceTo(to);
  const p1 = leave ? va.copy(from).addScaledVector(leave, 0.45 * d) : va.copy(from).lerp(to, 0.3);
  const p2 = arrive ? vb.copy(to).addScaledVector(arrive, -0.45 * d) : vb.copy(from).lerp(to, 0.7);
  const u = 1 - s;
  return out
    .copy(from)
    .multiplyScalar(u * u * u)
    .addScaledVector(p1, 3 * u * u * s)
    .addScaledVector(p2, 3 * u * s * s)
    .addScaledVector(to, s * s * s);
}

export class Head {
  /** The head's own turn: to the left, and up, radians. */
  yaw = 0;
  pitch = 0;
  limits: Limits;
  /** Motion off: a lean, or coming back to rest, is there at once. */
  calm = false;
  /** Coming back to where the eyes rest (0). */
  private homing = false;
  /** The lean under way or held: where it started, where it is going (null: back to the head), how far through. */
  private lean: { from: Pose; to: Lean | null; t: number; of: number; leave: THREE.Vector3 | null } | null = null;
  /** The look turned about the place leant to, by the hands: across and up. */
  private glance = { yaw: 0, pitch: 0 };
  /** The lens leant to, zoomed by the wheel: nepers narrower (positive) or wider. */
  private zoomed = 0;

  constructor(limits: Limits) {
    this.limits = limits;
  }

  /** Leaning out to something, or there (not coming back). */
  get out(): boolean {
    return this.lean?.to != null;
  }

  /** Still on its way somewhere: leaning, coming back, or coming to rest. */
  get moving(): boolean {
    return (this.lean !== null && this.lean.t < this.lean.of) || this.homing;
  }

  /** Where it is leaning to, if anywhere. */
  get target(): Lean | null {
    return this.lean?.to ?? null;
  }

  reset(): void {
    this.yaw = this.pitch = 0;
    this.lean = null;
    this.homing = false;
    this.glance = { yaw: 0, pitch: 0 };
    this.zoomed = 0;
  }

  /** The hands turn the look: the head, within its limits; or, leaning to something, the look about it. */
  turn(yaw: number, pitch: number): void {
    this.homing = false;
    if (this.out) {
      this.glance.yaw = THREE.MathUtils.clamp(this.glance.yaw + yaw, -GLANCE.side, GLANCE.side);
      this.glance.pitch = THREE.MathUtils.clamp(this.glance.pitch + pitch, -GLANCE.down, GLANCE.up);
      return;
    }
    [this.yaw, this.pitch] = clampHead(this.yaw + yaw, this.pitch + pitch, this.limits, this.lens);
  }
  /** The lens the head last saw through by itself (`pose`), for its limits. */
  private lens = LIMITS_LENS;

  /** The wheel, leaning to something: its lens narrower (positive nepers) or wider. False when not leaning: the lens is the rig's. */
  zoom(nepers: number): boolean {
    const to = this.lean?.to;
    if (!to) return false;
    const most = Math.log(to.lens / NARROW);
    const least = Math.log(to.lens / WIDE);
    this.zoomed = THREE.MathUtils.clamp(this.zoomed - nepers, least, most);
    return true;
  }

  /**
   * Lean to something in the scene (`to`, as it stands this instant), or with null come back: `seat` is the frame of the
   * eyes in the scene now and `lens` the one the head sees through by itself. What it is is kept in the seat's frame.
   */
  leanIn(to: Lookout | null, seat: THREE.Matrix4, lens: number): void {
    const now = this.pose(lens, { eye: new THREE.Vector3(), quaternion: new THREE.Quaternion(), lens: 0 });
    if (!to) {
      this.leanTo(null, now);
      return;
    }
    const into = new THREE.Matrix4().copy(seat).invert();
    const at = to.at.clone().applyMatrix4(into);
    this.leanTo(
      to.kind === 'port'
        ? portLean(at, to.out.clone().transformDirection(into), to.across, to.stop)
        : screenLean(at, to.facing.clone().transformDirection(into), to.radius, now.eye),
      now,
    );
  }

  /** Back to where the eyes rest: from a lean if there is one, and the head round to straight ahead. */
  home(now: Pose): void {
    if (this.lean?.to) this.leanTo(null, now);
    this.homing = true;
  }

  /**
   * Lean to `to` (a place in the seat's frame and the way to look from it), or with null come back to the head as it
   * is turned; `now` is where the eyes are this instant (`pose`), which is where the move starts from.
   */
  leanTo(to: Lean | null, now: Pose): void {
    if (!to && !this.lean) return;
    const end = to?.eye ?? eyeOf(this.yaw, this.pitch);
    // (leaving something leant to, back along the line it was looked through)
    const leave = this.lean?.to ? this.lean.to.gaze.clone().negate() : null;
    this.lean = {
      from: { eye: now.eye.clone(), quaternion: now.quaternion.clone(), lens: now.lens },
      to,
      t: 0,
      of: this.calm ? 0 : leanSeconds(now.eye.distanceTo(end)),
      leave,
    };
    if (to) {
      this.glance = { yaw: 0, pitch: 0 };
      this.zoomed = 0;
    }
  }

  step(dt: number): void {
    const lean = this.lean;
    if (lean) {
      lean.t = Math.min(lean.of, lean.t + dt);
      if (!lean.to && lean.t >= lean.of) this.lean = null; // (back: the head is its own again)
    }
    if (this.homing) {
      this.yaw = this.calm ? 0 : approach(this.yaw, 0, HOME_TAU, dt);
      this.pitch = this.calm ? 0 : approach(this.pitch, 0, HOME_TAU, dt);
      if (Math.hypot(this.yaw, this.pitch) < 1e-3) {
        this.yaw = this.pitch = 0;
        this.homing = false;
      }
    }
  }

  /** Where the eyes are and which way they look, in the seat's frame, with `lens` the one the head sees through by itself. */
  pose(lens: number, out: Pose): Pose {
    // (a lens opened wider while looking down brings the look up by as much: the limits are what can be seen)
    if (lens !== this.lens) {
      this.lens = lens;
      if (!this.homing) [this.yaw, this.pitch] = clampHead(this.yaw, this.pitch, this.limits, lens);
    }
    eyeOf(this.yaw, this.pitch, out.eye);
    turnOf(this.yaw, this.pitch, out.quaternion);
    out.lens = lens;
    const lean = this.lean;
    if (!lean) return out;
    // where it is going: the place leant to, the look turned about it by the hands; or the head as it is now
    const to = lean.to;
    const end = this.end;
    if (to) {
      end.eye.copy(to.eye);
      turnTo(to.gaze, end.quaternion)
        .multiply(qa.setFromAxisAngle(Y, this.glance.yaw))
        .multiply(qa.setFromAxisAngle(va.set(1, 0, 0), this.glance.pitch));
      end.lens = THREE.MathUtils.clamp(to.lens * Math.exp(-this.zoomed), NARROW, WIDE);
      this.along.copy(to.gaze);
    } else {
      end.eye.copy(out.eye);
      end.quaternion.copy(out.quaternion);
      end.lens = lens;
      gazeOf(this.yaw, this.pitch, this.along);
    }
    const k = lean.of > 0 ? lean.t / lean.of : 1;
    const [move, turn, lensK] = leanPhases(k, to !== null);
    leanPath(lean.from.eye, end.eye, lean.leave, to ? this.along : null, move, out.eye);
    out.quaternion.copy(lean.from.quaternion).slerp(end.quaternion, turn);
    out.lens = Math.exp(THREE.MathUtils.lerp(Math.log(lean.from.lens), Math.log(end.lens), lensK));
    return out;
  }
  private readonly end: Pose = { eye: new THREE.Vector3(), quaternion: new THREE.Quaternion(), lens: 0 };
  private readonly along = new THREE.Vector3();
}

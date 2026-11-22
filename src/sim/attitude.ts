/**
 * A spacecraft's attitude in orbit as a rigid body turned by its own attitude jets (#148's second half): its orientation and
 * body rates, its moments of inertia from the record's mass properties at its mass (`ThrusterSet.inertia`), and every chamber
 * of its thruster set as hardware (`ThrusterSet.chambers`: where it stands and the way it pushes, so the torque it gives is
 * its own, cross-coupling and all), each drawing on the supply it names (`ThrusterSet.supplies`) at its thrust over g0 Isp.
 * Nothing here knows a flight.
 *
 * Two ways of flying it, as the hardware had them:
 *   Hold    the craft's own autopilot (an attitude hold with rate damping, as the Apollo stabilization and control system's
 *           and Gemini's attitude control electronics were): axis by axis, through the automatic system's chambers, on one
 *           switching line, the rate less what the hand asks plus the attitude error's lead (`lead`: the error times
 *           `rateband` over `deadband`, no more than the hand's rate), as the SCS summed its rate and attitude signals into
 *           one switching amplifier: still, it switches at `deadband`; on its attitude, at `rateband`. Past the line a chamber
 *           fires for as long as brings it back to the line and never less than `minimum` (its minimum impulse), so near
 *           it it limit-cycles in single pulses as the real ones did, and a craft far off is brought back at the hand's
 *           rate. The hand asks a rate (`rate` at full throw): the reference turned at that rate, so the attitude is held
 *           where it is let go. A line to point along (`aim`: guidance steering a burn) turns the reference to it.
 *   Direct  the keys open the hand's chambers on their axis while they are held, and nothing damps: a turn once started goes on.
 *
 * Time: steps of vehicle.ts's TICK while anything fires or is asked; quiet (nothing fires, nothing is asked and, under Hold,
 * every axis within its deadbands) it is flown free in longer steps, to just short of where the deadband could next be
 * reached and no more than `TURN` of a turn, each chosen from the state alone (`advance`): the states it comes to do not
 * depend on how often it is asked, so a run flown again from what the hands did comes to the same, frame by frame or not.
 *
 * Simplified: the principal axes are taken as the body's (the record's products of inertia, a few per cent of the moments,
 * are left out), and the centre of mass on the long axis; the chambers' thrust starts and stops at once, a pulse giving its
 * thrust times its time; what the jets push the craft along (their translation) is not flown, nor what the propellant they
 * burn takes off its mass; nothing else turns it (no gravity gradient, no air, no propellant slosh).
 */
import { clamp } from '../util/math.ts';
import { G0 } from '../world/bodies.ts';
import { add, cross, dot, length, scale, unit, type Vec3 } from '../world/frames.ts';
import type { FlightPlan, ThrusterSet } from './plan.ts';
import { aboutAxis, conjugate, eulerOf, multiply, normalize, type Quat, rotateFor, rotationOf, spin, turn } from './rigid.ts';
import { TICK } from './vehicle.ts';

/** The most a free step turns the craft, radians: the integrator's step is held to it. */
export const TURN = 0.02;
/** The longest free step, s. */
export const QUIET = 60;

const AXIS = { roll: 0, pitch: 1, yaw: 2 } as const;

/** One chamber as it is flown. */
export interface Jet {
  name: string;
  /** The axis its command turns about (0 roll, 1 pitch, 2 yaw) and the way (1 or -1), as `Thruster` names it. */
  axis: 0 | 1 | 2;
  sense: 1 | -1;
  /** Its torque at full thrust about the centre of mass, N m, in the body's axes: where it stands crossed with its push. */
  torque: Vec3;
  /** What it burns at full thrust, kg/s, and from which supply (by index). */
  flow: number;
  supply: number;
  /** Worked by the autopilot (an automatic supply's chamber) or by the hand direct (a manual supply's): one supply is both's. */
  auto: boolean;
  hand: boolean;
  /** From when it gives nothing, s from liftoff (`Thruster.isolated`): infinite for one that works throughout. */
  isolated: number;
}

/** A craft's attitude control as it is flown, from its thruster set. */
export interface Attitude {
  set: ThrusterSet;
  jets: Jet[];
  /** Each supply's name and what can be used of it, kg. */
  supplies: { name: string; full: number }[];
  /** s; radians; radians a second; the hand's rate at full throw, radians a second. */
  minimum: number;
  deadband: number;
  rateband: number;
  rate: number;
  /** The torque of the autopilot's chambers together about each axis, N m: [axis][0 the positive way, 1 the negative]. */
  authority: [number, number][];
  /** The moments of inertia at a mass, kg m^2: roll, pitch, yaw. */
  inertia(mass: number): Vec3;
}

export interface AttitudeState {
  t: number;
  /** Body to frame, and the body's rates, rad/s, in its own axes. */
  q: Quat;
  w: Vec3;
  /** The attitude the autopilot holds. */
  ref: Quat;
  /** What is left in each supply, kg. */
  left: readonly number[];
  /** How the chambers of each axis fired over the last step, of their full thrust, signed the way they turn (the deck's lamps). */
  firing: Vec3;
  /** What a pulse begun is still owed of its least time on each axis, s, signed the way it turns. */
  owed: Vec3;
}

export interface AttitudeControls {
  /** Hold (the autopilot) on, or the keys direct. */
  hold: boolean;
  /** The hand's throw on each axis, -1 to 1: roll, pitch, yaw. */
  stick: Vec3;
  /**
   * A line in the frame for the long axis to point along (guidance steering a burn, or turning to one), or none, or the line
   * at each instant (read at each step's own, so what is flown does not depend on when it is asked). Flown under the autopilot.
   */
  aim?: Vec3 | ((t: number) => Vec3 | null) | null;
  /** The craft's mass now, kg (its moments of inertia are the record's at that mass). */
  mass: number;
}

/** The moments of inertia at `mass` between the rows the record tabulates (each kept in order of mass), the nearest row's beyond them. */
export function inertiaAt(rows: readonly { mass: number; moments: Vec3 }[], mass: number): Vec3 {
  if (mass <= rows[0]!.mass) return rows[0]!.moments;
  for (let i = 1; i < rows.length; i++) {
    const [a, b] = [rows[i - 1]!, rows[i]!];
    if (mass <= b.mass) {
      const k = (mass - a.mass) / (b.mass - a.mass);
      return [0, 1, 2].map((j) => a.moments[j]! + (b.moments[j]! - a.moments[j]!) * k) as unknown as Vec3;
    }
  }
  return rows.at(-1)!.moments;
}

/** The torque of the autopilot's chambers among `jets` together about each axis, N m: [axis][0 the positive way, 1 the negative]. */
function authorityOf(jets: readonly Jet[]): [number, number][] {
  return [0, 1, 2].map((i) =>
    ([1, -1] as const).map((sense) =>
      jets.filter((j) => j.auto && j.axis === i && j.sense === sense).reduce((sum, j) => sum + Math.abs(j.torque[i]), 0),
    ),
  ) as [number, number][];
}

/** The craft's attitude control of `plan`: its hand's thruster set given as hardware with its supplies and inertia, or null (turned as a hand turns it, at its rate). */
export function attitudeOf(plan: FlightPlan): Attitude | null {
  const set = plan.craft[0]?.thrusters.find((t) => t.mode === 'manual' && t.chambers?.length && t.supplies?.length && t.inertia?.length);
  if (!set) return null;
  const supplies = set.supplies!;
  const modes = new Set(supplies.map((s) => s.mode));
  const jets = set.chambers!.map((c): Jet => {
    const supply = supplies.findIndex((s) => s.name === c.supply);
    const mode = supplies[supply]!.mode;
    return {
      name: c.name,
      axis: AXIS[c.axis],
      sense: c.sense,
      torque: scale(cross(c.at, c.push), c.thrust),
      flow: c.thrust / (G0 * supplies[supply]!.isp.value),
      supply,
      auto: modes.size === 1 || mode === 'automatic',
      hand: modes.size === 1 || mode === 'manual',
      isolated: c.isolated?.value ?? Number.POSITIVE_INFINITY,
    };
  });
  const authority = authorityOf(jets);
  const rows = set
    .inertia!.map((r) => ({ mass: r.mass.value, moments: [r.roll.value, r.pitch.value, r.yaw.value] as Vec3 }))
    .sort((a, b) => a.mass - b.mass);
  const DEG = Math.PI / 180;
  return {
    set,
    jets,
    supplies: supplies.map((s) => ({ name: s.name, full: s.propellant.value })),
    minimum: set.minimum?.value ?? 0,
    deadband: (set.deadband?.value ?? 0) * DEG,
    rateband: (set.rateband?.value ?? 0) * DEG,
    rate: (set.rate?.value ?? 0) * DEG,
    authority,
    inertia: (mass) => inertiaAt(rows, mass),
  };
}

/** The attitude taken up at `t`, held where it lies, every supply full. */
export function attitudeStart(a: Attitude, t: number, q: Quat, w: Vec3 = [0, 0, 0], left?: readonly number[]): AttitudeState {
  return { t, q, w, ref: q, left: left ?? a.supplies.map((s) => s.full), firing: [0, 0, 0], owed: [0, 0, 0] };
}

/** The line the controls point along at `t`, or null. */
const aimAt = (c: AttitudeControls, t: number): Vec3 | null => (typeof c.aim === 'function' ? c.aim(t) : (c.aim ?? null));

/** An attitude turned the short way so that its long axis lies along `aim`. */
export function aimed(ref: Quat, aim: Vec3): Quat {
  const x = turn(ref, [1, 0, 0]);
  const u = unit(aim);
  const c = clamp(dot(x, u), -1, 1);
  const axis = cross(x, u);
  const n = length(axis);
  if (n < 1e-12) return c > 0 ? ref : normalize(multiply(aboutAxis(turn(ref, [0, 1, 0]), Math.PI), ref));
  return normalize(multiply(aboutAxis(scale(axis, 1 / n), Math.atan2(n, c)), ref));
}

/** The error the autopilot sees: the turn from what it holds to where the craft lies, in its axes. */
export const errorOf = (s: Pick<AttitudeState, 'q' | 'ref'>): Vec3 => rotationOf(multiply(conjugate(s.ref), s.q));

/** One step of the rigid body with a torque held over it (RK4 on the quaternion and Euler's equations). */
function flyBody(q: Quat, w: Vec3, torque: Vec3, inertia: Vec3, h: number): { q: Quat; w: Vec3 } {
  const f = (q: Quat, w: Vec3): [Quat, Vec3] => [spin(q, w), eulerOf(w, torque, inertia)];
  const at = (q: Quat, w: Vec3, d: [Quat, Vec3], k: number): [Quat, Vec3] => [
    [q[0] + d[0][0] * k, q[1] + d[0][1] * k, q[2] + d[0][2] * k, q[3] + d[0][3] * k],
    add(w, scale(d[1], k)),
  ];
  const k1 = f(q, w);
  const k2 = f(...at(q, w, k1, h / 2));
  const k3 = f(...at(q, w, k2, h / 2));
  const k4 = f(...at(q, w, k3, h));
  const dq = [0, 1, 2, 3].map((i) => (k1[0][i]! + 2 * k2[0][i]! + 2 * k3[0][i]! + k4[0][i]!) / 6);
  const dw = [0, 1, 2].map((i) => (k1[1][i]! + 2 * k2[1][i]! + 2 * k3[1][i]! + k4[1][i]!) / 6);
  return {
    q: normalize([q[0] + dq[0]! * h, q[1] + dq[1]! * h, q[2] + dq[2]! * h, q[3] + dq[3]! * h]),
    w: [w[0] + dw[0]! * h, w[1] + dw[1]! * h, w[2] + dw[2]! * h],
  };
}

/**
 * The attitude error's part of the switching line, rad/s: the error over the deadband times the rate deadband (so that,
 * the craft still, it switches at the deadband, and the error at nought, at the rate deadband, as the Apollo SCS summed
 * its attitude and rate signals into one switching amplifier), no more than the hand's rate either way: a craft far off
 * is brought back at that rate.
 */
const lead = (a: Attitude, e: number): number => (a.deadband > 0 ? clamp((a.rateband / a.deadband) * e, -a.rate, a.rate) : 0);

/** Whether the autopilot has gas to work with: some automatic chamber's supply not empty. */
const canHold = (a: Attitude, s: AttitudeState): boolean => a.jets.some((j) => j.auto && s.left[j.supply]! > 0 && s.t < j.isolated);

/**
 * How long the craft may be flown free from `s` under `c` with nothing firing, s (whole ticks, at least two), or 0 where
 * something fires or is asked: under Hold, to nine tenths of the way to where an axis's error drifting at its rate meets
 * the deadband; and never more than `TURN` of a turn or `QUIET`.
 */
export function quietFor(a: Attitude, s: AttitudeState, c: AttitudeControls): number {
  if (s.owed[0] || s.owed[1] || s.owed[2]) return 0;
  // (an aim the reference already lies along, within half the deadband, is the hold's own: its line moves slowly in a coast)
  const aim = aimAt(c, s.t);
  if (aim && Math.acos(clamp(dot(turn(s.ref, [1, 0, 0]), unit(aim)), -1, 1)) > a.deadband / 2) return 0;
  if (c.stick[0] || c.stick[1] || c.stick[2]) return 0;
  const rate = length(s.w);
  let free = Math.min(QUIET, rate > 0 ? TURN / rate : QUIET);
  if ((c.hold || aim) && canHold(a, s)) {
    const e = errorOf(s);
    const k = a.deadband > 0 ? a.rateband / a.deadband : 0;
    for (let i = 0; i < 3; i++) {
      const sigma = s.w[i]! + lead(a, e[i]!);
      if (Math.abs(sigma) > a.rateband) return 0;
      // (how soon the switching line is met, the error drifting at the rate: its lead grows at k w)
      const moving = k * s.w[i]!;
      if (moving > 0) free = Math.min(free, (0.9 * (a.rateband - sigma)) / moving);
      else if (moving < 0) free = Math.min(free, (0.9 * (-a.rateband - sigma)) / moving);
    }
  }
  const n = Math.floor(free / TICK + 1e-9);
  return n >= 2 ? n * TICK : 0;
}

/** Flown free for `h` seconds: nothing fires. */
function coast(a: Attitude, s: AttitudeState, c: AttitudeControls, h: number): AttitudeState {
  const body = flyBody(s.q, s.w, [0, 0, 0], a.inertia(c.mass), h);
  // (with Hold off what it would hold is where it lies: Hold thrown on keeps that)
  return { ...s, t: s.t + h, q: body.q, w: body.w, ref: c.hold || aimAt(c, s.t) ? s.ref : body.q, firing: [0, 0, 0] };
}

/** What the chambers do over a step (`jetsFor`): their torque, N m in the body's axes, and the autopilot's and the supplies' state after it. */
export interface Firing {
  torque: Vec3;
  /** What the autopilot holds after the step, and whether it was working (Hold, or an aim): with it off what it holds is where the craft lies. */
  ref: Quat;
  auto: boolean;
  left: number[];
  firing: Vec3;
  owed: Vec3;
}

/**
 * The chambers over a step of `h` seconds worked as `c` asks, without flying the body (what a simulator that turns the
 * craft by other torques besides, a lander's on its legs, sim/surface.ts, adds to its own): under Hold (or an aim) the
 * autopilot's law on each axis, direct the hand's throw; a pulse owed from the last step runs on; each chamber as far as
 * its supply has propellant, its torque spread over the step for the time it is open.
 */
export function jetsFor(a: Attitude, s: AttitudeState, c: AttitudeControls, h: number): Firing {
  const inertia = a.inertia(c.mass);
  // (a chamber isolated for a fault gives nothing from then on, and the autopilot's authority is what is left)
  const isolated = a.jets.some((j) => s.t >= j.isolated);
  const authority = isolated ? authorityOf(a.jets.filter((j) => s.t < j.isolated)) : a.authority;
  // (a hand on the controls has them over guidance's line while it is there: let go, the line takes the craft back)
  const asked = c.stick[0] !== 0 || c.stick[1] !== 0 || c.stick[2] !== 0;
  const aim = asked ? null : aimAt(c, s.t);
  const auto = c.hold || Boolean(aim);
  let ref = aim ? aimed(s.ref, aim) : s.ref;
  const on: [number, number, number] = [0, 0, 0];
  if (auto) {
    const wc: Vec3 = aim ? [0, 0, 0] : ([0, 1, 2].map((i) => clamp(c.stick[i]!, -1, 1) * a.rate) as unknown as Vec3);
    ref = rotateFor(ref, wc, h);
    const e = errorOf({ q: s.q, ref });
    for (let i = 0; i < 3; i++) {
      // (the switching line: the rate off what is asked, and the error's lead, no more than the hand's rate)
      const sigma = s.w[i]! - wc[i]! + lead(a, e[i]!);
      const torque = authority[i]![sigma < 0 ? 0 : 1]!;
      if (Math.abs(sigma) > a.rateband && torque > 0)
        on[i] = -Math.sign(sigma) * Math.max(a.minimum, ((Math.abs(sigma) - a.rateband) * inertia[i]!) / torque);
    }
  } else for (let i = 0; i < 3; i++) on[i] = clamp(c.stick[i]!, -1, 1) * h;
  // (a pulse begun runs its least time out, the way it began)
  for (let i = 0; i < 3; i++) {
    const owed = s.owed[i]!;
    if (owed && (!on[i] || Math.sign(on[i]) === Math.sign(owed))) on[i] = Math.sign(owed) * Math.max(Math.abs(on[i]), Math.abs(owed));
  }
  const owed = on.map((x) => Math.sign(x) * Math.max(0, Math.abs(x) - h)) as unknown as Vec3;
  const now = on.map((x) => Math.sign(x) * Math.min(Math.abs(x), h));
  // (a chamber listed for two commands, a Gemini's side chamber for yaw and for roll, is one chamber: open for the longer)
  const opened = new Map<string, { jet: Jet; open: number }>();
  for (const j of a.jets) {
    const k = now[j.axis]!;
    if (!k || Math.sign(k) !== j.sense || !(auto ? j.auto : j.hand) || s.t >= j.isolated) continue;
    const was = opened.get(j.name);
    if (!was || was.open < Math.abs(k)) opened.set(j.name, { jet: j, open: Math.abs(k) });
  }
  const left = s.left.slice();
  let torque: Vec3 = [0, 0, 0];
  for (const { jet: j, open: asked } of opened.values()) {
    if (left[j.supply]! <= 0) continue;
    const open = j.flow * asked > left[j.supply]! ? left[j.supply]! / j.flow : asked;
    left[j.supply] = Math.max(0, left[j.supply]! - j.flow * open);
    torque = add(torque, scale(j.torque, open / h));
  }
  return { torque, ref, auto, left, firing: now.map((x) => x / h) as unknown as Vec3, owed };
}

/** One step of `h` seconds firing: the chambers as `jetsFor` works them, their torque held over the step on the rigid body. */
function fire(a: Attitude, s: AttitudeState, c: AttitudeControls, h: number): AttitudeState {
  const f = jetsFor(a, s, c, h);
  const body = flyBody(s.q, s.w, f.torque, a.inertia(c.mass), h);
  return { t: s.t + h, q: body.q, w: body.w, ref: f.auto ? f.ref : body.q, left: f.left, firing: f.firing, owed: f.owed };
}

/** One step of `h` seconds (a tick, or a partial step to an instant a command comes at): free where it is quiet, else firing. */
export function stepAttitude(a: Attitude, s: AttitudeState, c: AttitudeControls, h = TICK): AttitudeState {
  if (h <= 0) return s;
  return quietFor(a, s, c) >= h - 1e-12 ? coast(a, s, c, h) : fire(a, s, c, h);
}

/**
 * The craft flown on under `c` by whole steps that end by `until` (a tick while anything fires or is asked, a free step
 * while it is quiet), each chosen from the state it starts from: so the same controls from the same state come to the same
 * states however often this is asked. What is left short of `until` is flown the next time (`drift` shows it meanwhile).
 * Controls that change at an instant are taken from it: the state flown to it exactly under the old ones first
 * (`advanceTo`), as the coast does at the instant the deck last followed to, which a kept run writes down.
 */
export function advance(
  a: Attitude,
  s: AttitudeState,
  c: AttitudeControls,
  until: number,
  seen?: (s: AttitudeState) => void,
): AttitudeState {
  let x = s;
  for (let n = 0; n < 1e7; n++) {
    const free = quietFor(a, x, c);
    const h = free > 0 ? free : TICK;
    if (x.t + h > until + 1e-9) break;
    x = free > 0 ? coast(a, x, c, h) : fire(a, x, c, h);
    seen?.(x);
  }
  return x;
}

/** The craft flown on to exactly `at` (whole steps, then what is left as one step): where a command or a lighting comes. */
export function advanceTo(
  a: Attitude,
  s: AttitudeState,
  c: AttitudeControls,
  at: number,
  seen?: (s: AttitudeState) => void,
): AttitudeState {
  const x = advance(a, s, c, at, seen);
  if (!(at - x.t > 1e-9)) return x;
  const y = stepAttitude(a, x, c, at - x.t);
  seen?.(y);
  return y;
}

/** Whether two sets of controls ask the same (an aim compared by whether there is one: a line of guidance's is its own). */
export const sameControls = (p: AttitudeControls, q: AttitudeControls): boolean =>
  p.hold === q.hold && p.stick.every((x, i) => x === q.stick[i]) && Boolean(p.aim) === Boolean(q.aim) && p.mass === q.mass;

/** Where the craft lies at `at`, flown free from `s` (for drawing between the steps `advance` has taken: nothing is kept). */
export function drift(a: Attitude, s: AttitudeState, at: number, mass: number): Quat {
  let x = s;
  for (let n = 0; n < 1000 && at - x.t > 1e-9; n++) {
    const rate = length(x.w);
    const h = Math.min(at - x.t, rate > 0 ? TURN / rate : at - x.t);
    const body = flyBody(x.q, x.w, [0, 0, 0], a.inertia(mass), h);
    x = { ...x, t: x.t + h, q: body.q, w: body.w };
  }
  return x.q;
}

/** How many of its steps the deck flies a second of the page's time at the most, while it turns: what the clock is held to. */
export const STEPS_A_SECOND = 6400;

/**
 * The fastest the clock may run while the craft is as it is, times life's pace: `STEPS_A_SECOND` of its steps a second,
 * so 64 times while anything fires or is asked (each tick is flown), more as its free steps lengthen (a slow drift in a
 * deadband, some thousands of times), and no limit of its own while it is still (nothing turns it, nothing changes).
 */
export function paceFor(a: Attitude, s: AttitudeState, c: AttitudeControls): number {
  const free = quietFor(a, s, c);
  if (free === 0) return STEPS_A_SECOND * TICK;
  return s.w[0] === 0 && s.w[1] === 0 && s.w[2] === 0 ? Infinity : STEPS_A_SECOND * free;
}

/** What is left of all the supplies together, and what they held, kg. */
export function gasOf(a: Attitude, s: Pick<AttitudeState, 'left'>): { left: number; full: number } {
  return { left: s.left.reduce((sum, x) => sum + x, 0), full: a.supplies.reduce((sum, x) => sum + x.full, 0) };
}

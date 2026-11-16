/**
 * A vehicle flown live: stepped a frame at a time and steered, where fly.ts runs a whole flight
 * with its attitude prescribed. The same Newtonian flight (fly.ts's gravity, air, thrust and
 * drag, in the same frame that does not turn, from the same plan), and with it the
 * body's turning: a rigid body under the torques of its turned thrust, of the air on its nose and
 * fins, and of its attitude jets. Nothing here knows which flight it is or names a part: its hardware
 * is found in the plan by what it is (fly.ts `ballisticOf`), and what a flight adds for the turning
 * is the plan's rigid body (`Craft.rigid`, types.ts `Body`), each figure with its confidence.
 *
 * Axes. The body's +X is its long axis, nose forward. On the pad +X is up, +Z points against the
 * launch azimuth and +Y is level, to the left of the azimuth; so a positive turn about +Y (pitch)
 * tips the nose downrange, about +Z (yaw) to the left of the azimuth, and about +X (roll) is
 * right-handed about the nose. A control of +1 is the full torque about its axis in that sense.
 * The attitude is a quaternion from the body's axes to the frame's (rigid.ts); rates are the
 * body's, rad/s. `r` and `v` are the centre of mass's.
 *
 * Forces, beyond fly.ts's
 *   thrust    turned off the axis by the pitch and yaw controls, up to `control.deflection`, and
 *             acting at `control.station`: that is the steering torque. Roll is a torque about
 *             the axis from the same deflection on `control.rollArm`. The vanes answer at once.
 *   drag      fly.ts's curves, but along the body's axis by whichever end leads, falling off as the
 *             cosine of the angle (forces.ts, which also flies what is shed): end on it is fly.ts's.
 *   normal    each `surfaces` entry is pushed against its own sideways motion through the air:
 *             q A slope sin(angle), at its station. Together they are the lift, the weathercock
 *             (or its opposite, if the centre of pressure is ahead of the centre of mass) and the
 *             damping, since a surface far from the centre of mass moves sideways as the body turns.
 *   side      the cross-flow on the body's length (`body.side`, `capsule.side`), as the sine squared.
 *   parachute fly.ts's drag area, pulling at `capsule.chuteArm` along the air's motion past that
 *             place, so the spacecraft hangs. In more air than it can take, as it is let out or after, it tears (`worn`).
 *   staging   whatever leaves (tower, booster, retropack) is one body made two (forces.ts: `part`),
 *             momentum kept, and is put in `released` for shed.ts to fly.
 *   loads     the stack's bending load (q alpha) against the plan's limit (`LimitDef` qAlpha; loads.ts): past it the
 *             stack breaks at its joint.
 *   jets      the spacecraft's reaction control system, chamber by chamber (`capsule.rcs`): each one that is
 *             open pushes at its own nozzle along its own line, so it turns the spacecraft and shoves it
 *             too. The automatic system's chambers are valves, open or shut: a command under RCS_DEAD
 *             opens nothing, one under RCS_HIGH the axis's smallest chamber, a larger one its biggest.
 *             The manual system's (`Controls.manual`) are throttled by the hand between their least
 *             thrust and their most. Every chamber burns its thrust over g0 times its supply's specific
 *             impulse; the spacecraft is lighter by it; and a supply with less left than a tick's burning
 *             feeds nothing, so its axes cannot be steered. Which chambers are open is settled once a
 *             tick. Where a flight gives no hardware, `capsule.jets` is a pure torque about each axis.
 *   rocket    the escape rocket, on an abort: `body.escape`'s thrust for its burn, then falling
 *             evenly to nothing over as long as its total impulse says, along a line parallel to
 *             the axis that passes `escape.offset` to one side of the centre of mass: thrust times
 *             that is a torque, which tips the nose toward `escape.toward` and so carries the
 *             spacecraft aside. Its propellant (`escape.propellant`) leaves as it burns.
 * Mass, centre of mass and inertia follow the propellant down the tanks (rigid.ts: massOf). The
 * terms that come of mass leaving a turning body (jet damping) and of the centre of mass moving
 * along it are left out, and so are slosh, bending, thrust misalignment and the air rudders. The air
 * moves with the day's winds aloft where the plan gives them (`winds`, forces.ts: `blowOf`):
 * one sounding over the pad, taken as the same all along the flight, with no gusts.
 *
 * Time. The flight is integrated in ticks of TICK seconds by fourth-order Runge-Kutta, whatever
 * the frame's length: `step` keeps what is left of a frame for the next, so a flight is the same
 * flight at any frame rate. Controls and events take effect at the tick they arrive on (a time
 * not on the grid is late by under a tick; the record's times are all on it). A hundredth of a
 * second is a twentieth of the fastest thing here, the spacecraft swinging at 9 rad/s at the
 * greatest pressure of entry. `t` is seconds from ignition, when this engine lifts off.
 *
 * It stands on the pad, turning with the Earth, until its thrust is more than its weight. Coming
 * down, it stops where it meets the sea (or `floor`), and says how fast: the verdict is the caller's.
 *
 * An abort (`Controls.abort`, while the tower is aboard: on the pad, lit or not, or on the way up)
 * shuts the engine down for good and fires the escape rocket: the spacecraft leaves the booster
 * with its tower on, a body of the two (the spacecraft's own figures and the tower's part of the
 * stack) flying tower first through `ascentDrag`, which is that shape's. When the rocket is out
 * and the climb is over the tower is let go. What follows is the flight's own (`escape.sequence`):
 * the retropack dropped as the spacecraft leaves, and after an abort begun under `ceiling` the
 * drogue a set time after the tower and the main a set time after that, once under its height;
 * without one, the usual descent, the parachutes at their heights. Until the tower has gone no
 * parachute comes out. The rocket's line is taken as parallel to the axis (the real motor was
 * tilted a fraction of a degree to set it off the centre of mass: the sideways part of its thrust,
 * a few parts in a thousand, is left out), the tower's centre of mass and inertia are scaled with
 * its weight as the propellant goes, not moved, and the booster is left to itself.
 */
import type { MassPart } from '../types.ts';
import { clamp } from '../util/math.ts';
import { EARTH_ROTATION_RATE, G0 } from '../world/bodies.ts';
import { type EarthFrame, LIFTOFF } from '../world/earthframe.ts';
import {
  add,
  angleBetween,
  cross,
  DEG,
  dot,
  ecefToGeodetic,
  enuAxes,
  fromHorizontal,
  type Geodetic,
  geodeticToEcef,
  length,
  scale,
  sub,
  unit,
  type Vec3,
} from '../world/frames.ts';
import { gravity } from '../world/orbit.ts';
import { airAt, airDrag, skyOf } from './air.ts';
import { rk4Body } from './core/rk4.ts';
import { aboard, act, burnOut, type CraftState, chainedAt, fire, hasLeft, part as partJoint, startCraft } from './craft.ts';
import { along, axisOf, ballisticOf, chuteArea, type Doing, MEAN_RADIUS, type Sample } from './fly.ts';
import { airForces, floorAt, part, pieceOf, type Release } from './forces.ts';
import { ENTRY_G, loadsOf, type Strain, strain, tearOf, UNSTRAINED } from './loads.ts';
import type { Action, ChuteDef, FlightPlan } from './plan.ts';
import {
  aboutAxis,
  euler,
  fixedAndFluid,
  fromAxes,
  type MassProperties,
  massOf,
  multiply,
  type Quat,
  spin,
  turn,
  unturn,
} from './rigid.ts';
import { pressed } from './staging.ts';
import { nozzleThrust } from './thrust.ts';

/** The integration step, s. */
export const TICK = 0.01;
/** Seconds: an instant within this of a tick is on it (a sum of the record's figures misses the tick by its rounding). */
const ON_TICK = 1e-6;

/** What the pilot, or an autopilot, asks of the vehicle. Steering is -1 to 1 about each body axis. */
export interface Controls {
  /**
   * The engine's lever, 0 to 1 of rated thrust. What it does is the engine's nature (its `EngineDef`: kind, throttle, starts): one that does
   * not throttle runs at its rated thrust for anything above 0; one that does follows the lever between its least and
   * its most, and below its least it is off; 0 shuts a liquid engine down, and it starts again only as often as it
   * can be started; a solid, once lit, hears none of it. There is no lag: no figure for one is in any record read.
   */
  throttle: number;
  /**
   * The spacecraft's own automatic functions: the parachutes let out at their heights, and after an abort the tower
   * let go at the top of the climb. On unless this is false: then nothing of the kind happens until it is commanded.
   */
  automatic?: boolean;
  pitch: number;
  yaw: number;
  roll: number;
  /**
   * What a hand or the sequencer sets off at this tick, as the plan (sim/plan.ts) says it: actions on its hardware
   * (`{ separate }` a joint, `{ deploy }` a parachute), and its events by id, each its actions. Two the vehicle does whole:
   * the motors' sequence (the first lit now, the rest by their timer) and the abort (the event a hand's command sets off:
   * while the tower is aboard, the engine is shut down and the spacecraft pulled off the booster on the escape rocket).
   * Each is done as far as the vehicle lets it, so one asked again every tick until it is done is done once.
   */
  do?: readonly Action[];
  events?: readonly string[];
  /** On the spacecraft: the axes the hand has, worked through the manual system's chambers and its supply; the rest are the automatic system's. */
  manual?: { pitch?: boolean; yaw?: boolean; roll?: boolean };
}

/** The automatic chambers' valve logic: the least command that opens one, and the least that opens the axis's biggest. Chosen, not recorded. */
export const RCS_DEAD = 0.05;
export const RCS_HIGH = 0.3;

export const HANDS_OFF: Controls = { throttle: 0, pitch: 0, yaw: 0, roll: 0 };

/** The vehicle at one instant. Treat it as a value: `step` returns a new one. */
export interface VehicleState {
  /** Seconds from ignition, and the same in ticks. */
  t: number;
  ticks: number;
  /** What a frame left over, s. */
  carry: number;
  /** The centre of mass in the frame that does not turn, m and m/s. */
  r: Vec3;
  v: Vec3;
  /** Attitude, body to frame, and body rates, rad/s. */
  q: Quat;
  w: Vec3;
  /** kg */
  mass: number;
  /**
   * The engine has been started; it has stopped (or an abort has shut it down unlit); how many times it has been
   * started, and the fraction of its rated thrust it is running at: views of the machine's engine, as `craft` has it.
   */
  ignited: boolean;
  cutoff: boolean;
  starts: number;
  throttle: number;
  /** The vehicle is still standing on its pad. */
  held: boolean;
  /**
   * What is lit and what has left it, which parachute is out and which of the plan's events have happened: the one
   * machine's state (sim/craft.ts). What has left is asked of it (craft.ts `hasLeft`); the engine's fields above and
   * `retroAt` are its view, as the forces read it.
   */
  craft: CraftState;
  /** The moment the spacecraft left: the stack's centre of mass and axis then, and how the booster went on. */
  separation: null | { t: number; r: Vec3; v: Vec3; axis: Vec3; booster: { r: Vec3; v: Vec3 } };
  /** Everything let go so far, each as it was the instant it left: sim/shed.ts flies them on. */
  released: readonly Release[];
  /** The stack's bending load against its limit (the plan's qAlpha `LimitDef`; sim/loads.ts): all nothing where the flight gives none. */
  strain: Strain;
  /** The stack broke: when, at what fraction of the limit, in what dynamic pressure (Pa) and how far off the wind (degrees), and at which joint. */
  broke: null | { t: number; load: number; q: number; alpha: number; joint: string };
  /** A parachute torn by more air than it can take (its `ChuteDef.strength` and `pull`), as it was let out or after. */
  torn: { drogue: boolean; main: boolean };
  /** When each tore and by what: the dynamic pressure on its cloth, Pa, or the pull on its lines, N. */
  tore: { drogue: Tear | null; main: Tear | null };
  /** When the escape rocket was fired, if it has been, and how high the vehicle was then, m above the sea. */
  abortAt: number | null;
  abortHeight: number | null;
  /** When the tower was let go. */
  towerAt: number | null;
  /** When the first retrorocket lit: the motors' sequence begun, on the machine. */
  retroAt: number | null;
  /** The parachute now out, as fly.ts has it, and when each came out. */
  chute: { full: number; was: number; at: number; fills: number };
  drogueAt: number | null;
  mainAt: number | null;
  /** The reaction control system: kg left in each of `capsule.rcs.supplies`, and what each of its `thrusters` is pushing with this tick, N. Empty lists where the flight gives no hardware. */
  rcs: { left: readonly number[]; firing: readonly number[] };
  /** When the air was first felt coming down (a twentieth of a g). */
  enteredAt: number | null;
  /** When the spacecraft was let go of its booster while the booster still pushed it (staging.ts `pressed`): it rides on until the push ends. */
  loose: number | null;
  /** Where and how fast it came down, once it has: speeds through the air there, m/s, and the long axis's angle from the vertical, degrees. */
  landing: null | { t: number; vertical: number; horizontal: number; latitude: number; longitude: number; lean: number };
  /** The controls last applied. */
  controls: Controls;
}

/** A parachute's tearing: when, by which limit, and the dynamic pressure, Pa, and its pull, N, at that instant. */
export interface Tear {
  t: number;
  by: 'pressure' | 'pull';
  q: number;
  pull: number;
}

/** A sample as fly.ts gives them, and how the body lies. */
export interface LiveSample extends Sample {
  /** The parachute now out, as the state has it: what looks ahead (predict.ts) starts from it, filling or torn as it is. */
  chute: { full: number; was: number; at: number; fills: number };
  /** The long axis in the frame that does not turn, and the whole attitude (body to frame). */
  axis: Vec3;
  attitude: Quat;
  /** Body rates, rad/s. */
  rates: Vec3;
  /** The angle between the long axis and the motion through the air, degrees: 0 nose first, 180 heat shield first. */
  alpha: number;
  /** Every motor burning at this instant, by its engine's id in the plan, with its thrust, N: the booster's engine, the escape rocket, each retrorocket (an orbital record's summary, which has only the stack's whole thrust, gives it as the craft's). */
  burning: { engine: string; thrust: number }[];
  /** The reaction control system, as the state has it: kg left in each supply, N from each chamber. */
  rcs: { left: readonly number[]; firing: readonly number[] };
  /** What is left in the booster's tanks, kg, where the flight gives the engine's mixture ratio: null once the booster has gone. */
  tanks: { oxidizer: number; fuel: number } | null;
  /** The centre of mass, where `r` is the point fly.ts flies (see `Vehicle.sample`); once the spacecraft has left, its own, tower or no tower. */
  centre: Vec3;
  /** The stack's bending load as a fraction of its limit (sim/loads.ts), and the load across the long axis, g. */
  strain: number;
  lateral: number;
}

export type Pilot = (state: VehicleState) => Controls;

export interface Vehicle {
  /** The plan it is flown on (sim/plan.ts), whose machine (sim/craft.ts) its states' `craft` is; and the engine its lever works, by the plan's id. */
  readonly plan: FlightPlan;
  readonly engine: string;
  readonly site: Geodetic;
  /** The frame it is flown in (world/earthframe.ts): its states' positions, velocities and attitudes are in it. */
  readonly frame: EarthFrame;
  /** The launch axes in the frame that does not turn: up, level along the azimuth, and level to its left. */
  readonly launch: { up: Vec3; downrange: Vec3; left: Vec3 };
  /** The tilt programme's axis at `t`, in the same frame (fly.ts: axisOf). */
  programme(t: number): Vec3;
  /** Standing on the pad, engine off. */
  start(): VehicleState;
  /** One tick. */
  tick(state: VehicleState, controls: Controls | Pilot): VehicleState;
  /** A frame of `dt` seconds: as many whole ticks as it and the last frame's remainder hold. A pilot is asked afresh every tick. */
  step(state: VehicleState, controls: Controls | Pilot, dt: number): VehicleState;
  /**
   * The state as a sample. `r` is the point fly.ts flies and viewer/ascent.ts places the model by:
   * the stack's base, which stood on the site's origin, and after separation that point carried on
   * with the spacecraft as it lay then. Height and range are that point's before separation and
   * the centre of mass's after. `v` is the centre of mass's.
   */
  sample(state: VehicleState): LiveSample;
  /** Mass, centre of mass (m from the base; 0 for the spacecraft alone) and inertia now. */
  mass(state: VehicleState): MassProperties;
  /** What the booster's tanks hold at liftoff, kg, where the flight gives the engine's mixture ratio. */
  readonly tanks: { oxidizer: number; fuel: number } | null;
  /** The force (N, in the body's axes) and the torque about the spacecraft's own centre of mass (N m) of chamber `i` of `capsule.rcs.thrusters` pushing with `thrust` newtons. */
  jet(i: number, thrust: number): { force: Vec3; torque: Vec3 };
  /** How far the centre of pressure is behind the centre of mass, m: positive is stable. On the stack, nose first. */
  margin(state: VehicleState): number;
}

const X: Vec3 = [1, 0, 0];
const NONE: ReadonlySet<string> = new Set();

/** What changes smoothly: what Runge-Kutta carries. */
interface Dyn {
  r: Vec3;
  v: Vec3;
  q: Quat;
  w: Vec3;
  mass: number;
}

export interface VehicleOptions {
  /** The ground's height above the sea under a place, m. By default the pad's own level within a kilometre of it and the sea beyond. */
  floor?: (latitude: number, longitude: number) => number;
  /** A launcher that is not upright: the long axis's elevation as it stands, degrees, leaning along the azimuth. 90 unless given. */
  elevation?: number;
  /** The frame it is flown in (world/earthframe.ts): fixed at liftoff unless given. */
  frame?: EarthFrame;
}

/** A flight's vehicle, ready to be flown. `seaLevel` as in fly.ts. */
export function vehicle(plan: FlightPlan, site: Geodetic, seaLevel = 0, options: VehicleOptions = {}): Vehicle {
  // What the vehicle's hardware is in the plan, found by what it is and not by name (fly.ts).
  const roles = ballisticOf(plan);
  const stack = roles.craft;
  const body = stack.rigid;
  if (!body) throw new Error('this plan has no rigid body: it can be flown by fly(), not steered');
  /** The booster's engine (the booster is the body that stands on the pad): the one the lever works. */
  const engine = roles.engine;
  /** The escape rocket: the motor the abort lights, which the event a hand's command sets off. */
  const abortEvent = roles.abort;
  const escapeMotor = roles.escape?.id;
  /** The spacecraft's motors (its retrorockets), each lit by an event of the plan and burning for its `burn`; their own timer's events, the hardware's sequence once begun, whatever the switches say; and the event that begins it. */
  const motors = roles.motors;
  const chained = roles.chained;
  const retroEvent = roles.retro?.id ?? null;
  /** The joints that let the tower (what the escape rocket is on) and the retropack (what the motors are on) go. */
  const towerJoint = roles.towerJoint?.id;
  const packJoint = roles.packJoint?.id;
  const separation = roles.separation.id;
  const TOWER: ReadonlySet<string> = new Set(towerJoint === undefined ? [] : [towerJoint]);
  /** The parachutes: the main takes the drogue's place. */
  const mainChute = roles.main.id;
  const drogueChute = roles.drogue.id;
  /** The spacecraft alone as it leaves the booster, and once its pack has gone, kg: the record's figures at those partings. */
  const alone = roles.separation.after!.value;
  const packless = roles.packJoint?.after?.value ?? alone;
  /** The stack's limit in bending, and the joint it breaks at, where the flight gives one. */
  const bend = stack.limits.find((l) => l.of === 'qAlpha') ?? null;
  /** A joint let go and parted at once, on the machine (`s` is changed). */
  const parts = (s: VehicleState, joint: string): void => {
    s.craft = partJoint(plan, act(plan, s.craft, { separate: joint }, s.t, s.held).state, joint, s.t);
  };
  const eventById = new Map(plan.events.map((e) => [e.id, e]));
  /**
   * What a hand or the sequencer asks at this tick: a joint let go, a parachute out, an event set off. An event is its
   * actions, but for the abort and the motors' sequence, which the vehicle does whole.
   */
  const asks = (c: Controls) => {
    const events = new Set(c.events ?? []);
    const actions: Action[] = [
      ...(c.do ?? []),
      ...[...events].flatMap((id) => (id === abortEvent?.id || id === retroEvent ? [] : (eventById.get(id)?.do ?? []))),
    ];
    return {
      separate: (joint: string | undefined) => joint !== undefined && actions.some((x) => 'separate' in x && x.separate === joint),
      deploy: (chute: string) => actions.some((x) => 'deploy' in x && x.deploy === chute),
      event: (id: string | null | undefined) => !!id && events.has(id),
    };
  };
  const flow = roles.flow;
  const vacuum = engine.thrust.vacuum.value;
  const exitArea = engine.exitArea?.value ?? 0;
  const frame = options.frame ?? LIFTOFF;
  const earth = frame.spin;
  const pad = geodeticToEcef(site);
  // the day's wind: everything the air does here is done by air that moves with it
  const sky = skyOf(plan);
  const windAt = (r: Vec3, v: Vec3, at: number, sea: number) => airAt(frame, r, v, at, sea, sky);
  const programme = axisOf(plan, site, frame);
  const up0 = programme(-1e9);
  // (level along the launch azimuth, from the azimuth itself: a programme that never tilts has no direction to give)
  const [east, north] = fromHorizontal(roles.programme.azimuth.value * DEG, 0);
  const downrange0 = frame.toInertial(unit(add(scale(enuAxes(site).east, east), scale(enuAxes(site).north, north))), 0);
  const left0 = cross(up0, downrange0);
  // (as it stands: upright, unless the launcher leans it along the azimuth)
  const lean = (90 - (options.elevation ?? 90)) * DEG;
  const q0 = fromAxes(
    add(scale(up0, Math.cos(lean)), scale(downrange0, Math.sin(lean))),
    left0,
    sub(scale(up0, Math.sin(lean)), scale(downrange0, Math.cos(lean))),
  );

  const radius = body.radius.value;
  const capsule = body.capsule;
  const whole = fixedAndFluid(body.parts, NONE);
  const towerless = fixedAndFluid(body.parts, TOWER);
  const towerMass = whole.fixed - towerless.fixed;
  // the tower by itself, and how far up the axis from the spacecraft's own centre of mass its centre is
  const towerParts = body.parts.filter((p) => p.sheds !== undefined && p.sheds === towerJoint);
  const towerAlone = towerParts.length ? massOf(towerParts, radius, 0, NONE) : null;
  const rocket = body.escape && towerAlone ? body.escape : null;
  /** How long the escape rocket takes to die away after its burn, s: what is left of its impulse at a thrust falling evenly to nothing. */
  const escapeTail = rocket ? Math.max(0, (2 * (rocket.impulse.value - rocket.thrust.value * rocket.burn.value)) / rocket.thrust.value) : 0;
  // where the flight has the motor's own curve of thrust against time, that is what it burns by
  const escapeCurve = rocket?.curve ?? null;
  const escapeThrust = (since: number): number => {
    if (!rocket || since < 0) return 0;
    if (escapeCurve) return since >= escapeCurve.points.at(-1)![0] ? 0 : along(escapeCurve, since);
    if (since <= rocket.burn.value) return rocket.thrust.value;
    return escapeTail > 0 ? rocket.thrust.value * Math.max(0, 1 - (since - rocket.burn.value) / escapeTail) : 0;
  };
  /** Its whole impulse, N s: under the curve, or the figure given. */
  const escapeImpulse = escapeCurve
    ? escapeCurve.points.reduce((sum, p, i, all) => (i ? sum + ((p[1] + all[i - 1]![1]) / 2) * (p[0] - all[i - 1]![0]) : 0), 0)
    : (rocket?.impulse.value ?? 0);
  // the booster's two propellants, where the flight says how the engine draws them
  const tanks = ((): { oxidizer: number; fuel: number; mix: number; burnable: number } | null => {
    const mix = body.mixture?.value;
    const of = (kind: 'oxidizer' | 'fuel'): number =>
      body.parts.reduce((sum, p) => sum + (p.fluid && p.propellant === kind ? p.mass : 0), 0);
    const [oxidizer, fuel] = [of('oxidizer'), of('fuel')];
    if (!mix || oxidizer <= 0 || fuel <= 0) return null;
    return { oxidizer, fuel, mix, burnable: Math.min((oxidizer * (1 + mix)) / mix, fuel * (1 + mix)) };
  })();
  /** What is left in each tank when `burned` kg have gone through the engine. */
  const tanksLeft = (burned: number): { oxidizer: number; fuel: number } => ({
    oxidizer: Math.max(0, tanks!.oxidizer - (burned * tanks!.mix) / (1 + tanks!.mix)),
    fuel: Math.max(0, tanks!.fuel - burned / (1 + tanks!.mix)),
  });
  // the reaction control system: each chamber's supply, and what it burns for a newton
  const rcs = capsule.rcs ?? null;
  const jets = rcs?.thrusters ?? [];
  const supplyOf = jets.map((j) =>
    Math.max(
      0,
      rcs!.supplies.findIndex((u) => u.name === j.supply),
    ),
  );
  const burnOf = jets.map((_, i) => 1 / (G0 * rcs!.supplies[supplyOf[i]!]!.isp.value));
  const rcsFull = rcs?.supplies.map((u) => u.propellant.value) ?? [];
  const QUIET: readonly number[] = jets.map(() => 0);
  const rcsUsed = (s: VehicleState): number => rcsFull.reduce((sum, full, i) => sum + (full - s.rcs.left[i]!), 0);
  const rcsFlow = (s: VehicleState): number => (s.rcs.firing === QUIET ? 0 : s.rcs.firing.reduce((sum, f, i) => sum + f * burnOf[i]!, 0));
  const escapeOver = escapeCurve ? escapeCurve.points.at(-1)![0] : rocket ? rocket.burn.value + escapeTail : 0;
  // its line passes to one side of the centre of mass: the torque of a newton of it, N m in the body's axes (X cross the way it tips)
  const escapeArm = ((): Vec3 => {
    const offset = rocket?.offset?.value ?? 0;
    const a = (rocket?.toward?.value ?? 0) * DEG;
    return [0, offset * Math.cos(a), offset * Math.sin(a)];
  })();
  /** What the escape rocket burns for a newton-second, kg. */
  const escapeBurn = rocket?.propellant && escapeImpulse > 0 ? rocket.propellant.value / escapeImpulse : 0;
  const afterAbort = rocket?.sequence ?? null;
  const dryOut = tanks
    ? stack.mass.value - tanks.burnable
    : engine.depletion
      ? stack.mass.value - flow * engine.depletion.value
      : whole.fixed;
  const deflection = Math.sin(body.control.deflection.value * DEG);
  const retroEnd = roles.retroEnd;

  const fixed = (r: Vec3, at: number): Vec3 => frame.toFixed(r, at);
  const rangeOf = (r: Vec3, at: number): number => angleBetween(fixed(r, at), pad) * MEAN_RADIUS;
  const floor = options.floor ?? floorAt(site, seaLevel);

  const sheds = body.sheds ?? [];
  const stackSide = body.side ? { dragArea: body.side.dragArea.value, from: body.side.from.value, to: body.side.to.value } : null;
  const capsuleSide = capsule.side
    ? { dragArea: capsule.side.dragArea.value, from: capsule.side.from.value, to: capsule.side.to.value }
    : null;
  // the tower's own side, for the spacecraft pulled off with it on: stations from the spacecraft's centre of mass, as its own side's are
  const towerShed = sheds.find((d) => d.on === towerJoint) ?? null;
  const towerSide = towerShed
    ? {
        dragArea: towerShed.side.dragArea.value,
        from: towerShed.side.from.value - capsule.centre.value,
        to: towerShed.side.to.value - capsule.centre.value,
      }
    : null;
  // the retropack, where the flight gives it as a body: what it weighs, and how far below the spacecraft's centre of mass its own is
  const pack = sheds.find((d) => d.on === packJoint && d.mass && d.centre) ?? null;
  const packMoment = pack ? pack.mass!.value * (capsule.centre.value - pack.centre!.value) : 0;
  /** How full each of the booster's tanks is, with `mass` aboard. */
  const filling = (s: VehicleState, mass: number): number | ((p: MassPart) => number) => {
    const { fixed: dry, fluid } = hasLeft(s.craft, roles.tower) ? towerless : whole;
    if (!tanks) return fluid > 0 ? (mass - dry) / fluid : 0;
    const left = tanksLeft(dry + fluid - mass);
    return (p) => (p.propellant === 'oxidizer' ? left.oxidizer / tanks.oxidizer : p.propellant === 'fuel' ? left.fuel / tanks.fuel : 1);
  };
  /** What the spacecraft itself weighs once it has left the booster, tower or no tower: the record's weights, less what the jets have burned. */
  const capsuleMass = (s: VehicleState): number => (hasLeft(s.craft, roles.pack) ? packless : alone) - rcsUsed(s);
  const massNow = (s: VehicleState, mass: number): MassProperties => {
    if (hasLeft(s.craft, roles.booster.id)) {
      if (hasLeft(s.craft, roles.tower) || !towerAlone) {
        // (with the retropack gone from under it, what is left has its centre of mass that much nearer the small end)
        const centre = hasLeft(s.craft, roles.pack) ? packMoment / mass : 0;
        return { mass, centre, roll: mass * capsule.gyration.roll.value ** 2, across: mass * capsule.gyration.across.value ** 2 };
      }
      // pulled off by the escape rocket, the tower still on: the two as one body, its centre measured up the axis from the spacecraft's own.
      // The tower is whatever is aboard beyond the spacecraft: lighter than it stood by what its rocket has burned.
      const alone = Math.min(mass, capsuleMass(s));
      const tower = mass - alone;
      const share = tower / towerAlone.mass;
      const own = hasLeft(s.craft, roles.pack) ? packMoment / alone : 0;
      const reach = towerAlone.centre - capsule.centre.value;
      const centre = (alone * own + tower * reach) / mass;
      return {
        mass,
        centre,
        roll: alone * capsule.gyration.roll.value ** 2 + towerAlone.roll * share,
        across:
          alone * (capsule.gyration.across.value ** 2 + (own - centre) ** 2) + towerAlone.across * share + tower * (reach - centre) ** 2,
      };
    }
    return massOf(body.parts, radius, filling(s, mass), hasLeft(s.craft, roles.tower) ? TOWER : NONE);
  };
  /** The booster's engine on the machine: lit and not out (its starts, its lever and its cut are the machine's), at the fraction of its rated thrust it runs at. */
  const engineOf = (s: VehicleState) => s.craft.engines[engine.id]!;
  const burning = (s: VehicleState): boolean => Number.isFinite(engineOf(s).lit) && !Number.isFinite(engineOf(s).out);
  const throttleOf = (s: VehicleState): number => (burning(s) ? engineOf(s).throttle : 0);
  const solid = engine.kind === 'solid';
  /** The fraction of rated thrust the engine gives for a lever at `u`: what its nature allows. */
  const allowed = (u: number): number => {
    if (!(u > 0)) return 0;
    const range = solid ? undefined : engine.throttle?.range;
    if (!range) return 1;
    return u < range[0] - 1e-12 ? 0 : Math.min(u, range[1]);
  };
  /**
   * The thrust of the spacecraft's motors burning at `at`, N, and how many: each lit on the machine, still aboard, and
   * within its burn. Each lights and burns out on an instant that is the first's plus its wait and burn, which in the
   * record's figures fall on the ticks but for the rounding of a sum: one within `ON_TICK` of an instant is at it, and a
   * tick that holds one more truly inside it is flown in two there (`tick`).
   */
  const retros = (s: VehicleState, at: number): { thrust: number; count: number } => {
    let thrust = 0;
    let count = 0;
    for (const m of motors) {
      const lit = s.craft.engines[m.id]!.lit;
      if (aboard(s.craft, m.body) && at + ON_TICK >= lit && at + ON_TICK < lit + m.burn!.value) {
        thrust += m.thrust.vacuum.value;
        count += 1;
      }
    }
    return { thrust, count };
  };
  /** The instants within (from, to) at which a motor lights by its timer or burns out. */
  const retroMarks = (s: VehicleState, from: number, to: number): number[] => {
    const marks: number[] = [];
    for (const m of motors) {
      if (!aboard(s.craft, m.body)) continue;
      const lit = s.craft.engines[m.id]!.lit;
      if (Number.isFinite(lit)) marks.push(lit + m.burn!.value);
    }
    for (const ev of chained) {
      const at = s.craft.fired[ev.id] === undefined ? chainedAt(ev, s.craft) : null;
      if (at === null) continue;
      for (const a of ev.do)
        if ('ignite' in a) {
          const m = motors.find((x) => x.id === a.ignite)!;
          if (aboard(s.craft, m.body)) marks.push(at, at + m.burn!.value);
        }
    }
    return marks.filter((x) => x > from + ON_TICK && x < to - ON_TICK);
  };
  /** The motors' timer: each due by `upTo` is lit at its own instant (`s` is changed). */
  const byTimer = (s: VehicleState, upTo: number): void => {
    for (let again = true; again; ) {
      again = false;
      for (const ev of chained) {
        if (s.craft.fired[ev.id] !== undefined) continue;
        const at = chainedAt(ev, s.craft);
        if (at === null || at > upTo + ON_TICK) continue;
        s.craft = fire(plan, s.craft, ev.id, at, s.held).state;
        again = true;
      }
    }
  };

  /**
   * Every force but gravity (N, in the frame) and the torque about the centre of mass (N m, in the body), with what the air
   * is doing, at `at`; the retrorockets lit as they are from instant `as` (a step's start: within a step what burns is fixed).
   */
  const forces = (d: Dyn, at: number, s: VehicleState, as = at) => {
    const props = massNow(s, d.mass);
    const { altitude, air, wind, airspeed, mach, q, ground } = windAt(d.r, d.v, at, seaLevel);
    const riding = !hasLeft(s.craft, roles.booster.id);
    const escaping = s.abortAt !== null && !hasLeft(s.craft, roles.tower);
    let force: Vec3 = [0, 0, 0];
    let torque: Vec3 = [0, 0, 0];
    /** A force given in the body's axes, at a place along the axis from the centre of mass. */
    const push = (f: Vec3, arm: number): void => {
      force = add(force, turn(d.q, f));
      torque = add(torque, cross([arm, 0, 0], f));
    };
    if (air.density > 0) {
      // The air on the body (forces.ts), which each part of it meets at its own speed: turning in still air is damped too. Small end first the drag is the spacecraft's with its tower on (the shape an abort
      // flies, and the only nose-first curve there is: the spacecraft alone is given it too); blunt end first, the
      // spacecraft's own. The stack has the one curve, whichever end leads.
      const through = unturn(d.q, wind);
      // (only the leading end's curve is read)
      const leads = riding || through[0] > 0;
      const end = leads ? roles.stack.area.value * along(roles.stack.curve, mach) : roles.entry.area.value * along(roles.entry.drag, mach);
      const f = airForces(
        {
          area: roles.stack.area.value,
          ahead: end,
          astern: end,
          surfaces: riding ? body.surfaces : capsule.surfaces,
          side: riding ? stackSide : capsuleSide,
          more: escaping ? towerSide : null,
        },
        props.centre,
        through,
        d.w,
        air.density,
      );
      force = add(force, turn(d.q, f.force));
      torque = add(torque, f.torque);
      const chute = chuteArea(s.chute, at);
      if (chute > 0) {
        // it streams along the air's motion past where it is made fast, which the body's turning adds to
        const arm = capsule.chuteArm.value - props.centre;
        const u = add(through, cross(d.w, [arm, 0, 0]));
        push(airDrag(u, length(u), air.density, chute), arm);
      }
    }
    if (burning(s)) {
      // (throttled, the chamber's thrust goes with the lever and the nozzle's gain from thinner air is held as at full: no record says otherwise)
      const thrust = nozzleThrust(1, vacuum, throttleOf(s), exitArea, air.pressure);
      const c = s.controls;
      const [py, pz] = [-deflection * c.yaw, deflection * c.pitch];
      push([thrust * Math.sqrt(1 - py * py - pz * pz), thrust * py, thrust * pz], body.control.station.value - props.centre);
      torque = add(torque, [thrust * deflection * body.control.rollArm.value * c.roll, 0, 0]);
    }
    if (!riding) {
      const c = s.controls;
      if (rcs) {
        if (s.rcs.firing !== QUIET) {
          s.rcs.firing.forEach((thrust, i) => {
            if (thrust <= 0) return;
            const jet = jets[i]!;
            const f = scale(jet.push, thrust);
            force = add(force, turn(d.q, f));
            torque = add(torque, cross([jet.at[0] - props.centre, jet.at[1], jet.at[2]], f));
          });
        }
      } else if (s.mainAt === null && capsule.jets) {
        torque = add(torque, [capsule.jets.roll.value * c.roll, capsule.jets.pitch.value * c.pitch, capsule.jets.yaw.value * c.yaw]);
      }
      const lit = retros(s, as);
      if (lit.count > 0) push([lit.thrust, 0, 0], 0);
    }
    if (escaping) {
      const pull = escapeThrust(at - s.abortAt!);
      // its line passes beside the centre of mass, so it turns the spacecraft as it pulls: that carries it aside, and it does not come down where it left
      if (pull > 0) {
        push([pull, 0, 0], 0);
        torque = add(torque, scale(escapeArm, pull));
      }
    }
    return { force, torque, q, mach, altitude, wind, airspeed, ground, props };
  };

  const rate = (d: Dyn, at: number, s: VehicleState, as = at): Dyn => {
    const f = forces(d, at, s, as);
    return {
      r: d.v,
      v: add(gravity(d.r), scale(f.force, 1 / d.mass)),
      q: spin(d.q, d.w),
      w: euler(d.w, f.torque, f.props.roll, f.props.across),
      mass:
        (burning(s) ? -flow * throttleOf(s) : 0) -
        rcsFlow(s) -
        (escapeBurn > 0 && s.abortAt !== null && !hasLeft(s.craft, roles.tower) ? escapeBurn * escapeThrust(at - s.abortAt) : 0),
    };
  };
  /** A step from `at` (core/rk4.ts), with what burns and what is attached as it is from the step's start. */
  const rk4 = (d: Dyn, at: number, h: number, s: VehicleState): Dyn => rk4Body(d, at, h, (x, tt) => rate(x, tt, s, at));

  /** Standing on the turning Earth at `at`, with `mass` aboard: where that puts the centre of mass, and how it lies. */
  const standing = (s: VehicleState, at: number, mass: number): Dyn => {
    // (q0 is how it stood at liftoff in the flight's frame: turned since by the Earth's turning since)
    const q = multiply(aboutAxis([0, 0, 1], EARTH_ROTATION_RATE * at), q0);
    const r = add(frame.toInertial(pad, at), scale(turn(q, X), massNow(s, mass).centre));
    return { r, v: cross(earth, r), q, w: unturn(q, earth), mass };
  };

  const start = (): VehicleState => {
    const blank: VehicleState = {
      t: 0,
      ticks: 0,
      carry: 0,
      r: pad,
      v: [0, 0, 0],
      q: q0,
      w: [0, 0, 0],
      mass: stack.mass.value,
      ignited: false,
      cutoff: false,
      held: true,
      starts: 0,
      throttle: 0,
      craft: startCraft(plan),
      separation: null,
      released: [],
      strain: UNSTRAINED,
      broke: null,
      torn: { drogue: false, main: false },
      tore: { drogue: null, main: null },
      abortAt: null,
      abortHeight: null,
      towerAt: null,
      rcs: { left: rcsFull, firing: QUIET },
      retroAt: null,
      chute: { full: 0, was: 0, at: 0, fills: 1 },
      drogueAt: null,
      mainAt: null,
      enteredAt: null,
      loose: null,
      landing: null,
      controls: HANDS_OFF,
    };
    return { ...blank, ...standing(blank, 0, blank.mass) };
  };

  /** The point whose height says whether it has come down: the stack's base, the spacecraft's centre. */
  const foot = (s: VehicleState, d: Dyn): Vec3 =>
    sub(d.r, scale(turn(d.q, X), hasLeft(s.craft, roles.booster.id) ? (capsule.base?.value ?? 0) : massNow(s, d.mass).centre));
  const heightOf = (r: Vec3, at: number): { height: number; ground: number; latitude: number; longitude: number } => {
    const here = ecefToGeodetic(fixed(r, at));
    return {
      height: here.height - seaLevel,
      ground: floor(here.latitude, here.longitude),
      latitude: here.latitude,
      longitude: here.longitude,
    };
  };

  /** What the controls set off at this instant. */
  const command = (state: VehicleState, asked: Controls): VehicleState => {
    const c: Controls = { ...asked, pitch: clamp(asked.pitch, -1, 1), yaw: clamp(asked.yaw, -1, 1), roll: clamp(asked.roll, -1, 1) };
    let s: VehicleState = { ...state, controls: c };
    // a solid, lit, burns on whatever the lever says
    const lever = solid && burning(s) ? 1 : allowed(c.throttle);
    // (what has gone through the engine, not what the stack weighs: a tower let go early is not propellant burned)
    const spent =
      !hasLeft(s.craft, roles.booster.id) &&
      (hasLeft(s.craft, roles.tower) ? towerless : whole).fixed + whole.fluid - s.mass >= stack.mass.value - dryOut - 1e-6;
    // lit on the machine, which holds it to its starts and to the booster it is on
    if (!burning(s) && lever > 0 && !spent && s.abortAt === null) s.craft = act(plan, s.craft, { ignite: engine.id }, s.t, s.held).state;
    if (burning(s) && (lever === 0 || spent))
      s.craft = spent ? burnOut(s.craft, engine.id, s.t) : act(plan, s.craft, { cut: engine.id }, s.t, s.held).state;
    if (burning(s) && engineOf(s).throttle !== lever) s.craft = act(plan, s.craft, { throttle: engine.id, to: lever }, s.t, s.held).state;
    if (s.landing) return s;
    const ask = asks(c);
    if (
      ask.event(abortEvent?.id) &&
      rocket &&
      s.abortAt === null &&
      !hasLeft(s.craft, roles.tower) &&
      !hasLeft(s.craft, roles.booster.id)
    ) {
      s = pullOff(s);
    }
    if (s.held) return s;
    // (the escape rocket takes the tower with it only once it is out: until then the tower is what is pulling)
    if (ask.separate(towerJoint) && !hasLeft(s.craft, roles.tower) && (s.abortAt === null || s.t >= s.abortAt + escapeOver))
      s = dropTower(s);
    // let go while the booster still pushes, the spacecraft stays pressed on its adapter and rides it until the push ends
    if (ask.separate(separation) && !hasLeft(s.craft, roles.booster.id) && s.loose === null) {
      s.loose = s.t;
      s.craft = act(plan, s.craft, { separate: separation }, s.t, s.held).state;
    }
    if (s.loose !== null && !hasLeft(s.craft, roles.booster.id)) {
      const capsule = capsuleMass(s);
      const booster = {
        thrust: burning(s) ? (engine.thrust.seaLevel ?? engine.thrust.vacuum).value * throttleOf(s) : 0,
        mass: s.mass - capsule,
      };
      if (!pressed(booster, { thrust: 0, mass: capsule })) s = leave(s, roles.separation.push?.value ?? 0);
    }
    if (hasLeft(s.craft, roles.booster.id)) {
      // the motors' sequence begun: the first lit now, the rest by their timer (`byTimer`)
      if (retroEvent && ask.event(retroEvent) && s.craft.fired[retroEvent] === undefined && !hasLeft(s.craft, roles.pack))
        s.craft = fire(plan, s.craft, retroEvent, s.t, s.held).state;
      byTimer(s, s.t);
      if (ask.separate(packJoint) && !hasLeft(s.craft, roles.pack)) dropPack(s);
      // (no parachute comes out past a tower)
      if (ask.deploy(drogueChute) && hasLeft(s.craft, roles.tower) && s.drogueAt === null && s.mainAt === null) s = drogue(s);
      if (ask.deploy(mainChute) && hasLeft(s.craft, roles.tower) && s.mainAt === null) s = main(s);
    }
    const firing = valves(s, c);
    if (firing !== s.rcs.firing) s.rcs = { left: s.rcs.left, firing };
    return s;
  };
  /** The retropack goes, from a spacecraft that has left its booster (`s` is changed): with its tower still on, in an abort, as without. */
  const dropPack = (s: VehicleState): void => {
    // what the spacecraft is lighter by: the record's weights either side of it
    const lighter = alone - packless;
    if (pack) {
      // it leaves from under the spacecraft with the velocity that place had; what is left is lighter by it, about a centre of mass further up
      const two = part(
        { r: s.r, v: s.v, q: s.q, w: s.w, mass: s.mass, centre: massNow(s, s.mass).centre },
        { mass: pack.mass!.value, centre: pack.centre!.value - capsule.centre.value },
        pack.push?.value ?? 0,
      );
      s.released = [
        ...s.released,
        {
          on: pack.on,
          t: s.t,
          ...two.gone,
          q: s.q,
          w: s.w,
          centre: pack.centre!.value,
          roll: pack.mass!.value * pack.gyration!.roll.value ** 2,
          across: pack.mass!.value * pack.gyration!.across.value ** 2,
          rest: two.kept,
        },
      ];
      s.r = two.kept.r;
      s.v = two.kept.v;
    }
    parts(s, packJoint!);
    s.mass -= lighter;
  };
  /** Which chambers are open for this tick, and how hard each pushes, N: the commands through each system's own logic, and no more than its supply can feed. */
  const valves = (s: VehicleState, c: Controls): readonly number[] => {
    if (!rcs || !hasLeft(s.craft, roles.booster.id) || s.mainAt !== null || s.landing) return QUIET;
    const firing = jets.map(() => 0);
    let any = false;
    for (const axis of ['pitch', 'yaw', 'roll'] as const) {
      const u = c[axis];
      const mode = c.manual?.[axis] ? 'manual' : 'automatic';
      if (Math.abs(u) < RCS_DEAD) continue;
      // the chambers this command could open, smallest first
      const mine = jets
        .map((j, i) => ({ j, i }))
        .filter(({ j, i }) => j.axis === axis && j.sense === Math.sign(u) && rcs.supplies[supplyOf[i]!]!.mode === mode)
        .sort((a, b) => a.j.thrust - b.j.thrust);
      if (!mine.length) continue;
      const throttled = mine.filter(({ j }) => j.least !== undefined);
      if (throttled.length) {
        for (const { j, i } of throttled) firing[i] = j.least! + (j.thrust - j.least!) * Math.abs(u);
      } else {
        const { j, i } = Math.abs(u) >= RCS_HIGH ? mine[mine.length - 1]! : mine[0]!;
        firing[i] = j.thrust;
      }
      any = true;
    }
    if (!any) return QUIET;
    // a supply that cannot feed what is asked of it for a tick feeds nothing
    const asked = rcsFull.map(() => 0);
    firing.forEach((f, i) => {
      asked[supplyOf[i]!]! += f * burnOf[i]! * TICK;
    });
    firing.forEach((_, i) => {
      if (asked[supplyOf[i]!]! > s.rcs.left[supplyOf[i]!]!) firing[i] = 0;
    });
    return firing.some((f) => f > 0) ? firing : QUIET;
  };
  /**
   * Something leaves (forces.ts: `part`): the vehicle goes on as what is left, about its own centre of mass, and what
   * left is put down as it was that instant, for sim/shed.ts to fly. `whole` and `gone` are centres of mass along the
   * axis from one datum; `station` is the gone piece's from the stack's base. Momentum is kept between the two.
   */
  const letGo = (
    s: VehicleState,
    on: string,
    whole: number,
    gone: { mass: number; centre: number },
    station: number,
    inertia: { roll: number; across: number },
    push: number,
  ): void => {
    const two = part({ r: s.r, v: s.v, q: s.q, w: s.w, mass: s.mass, centre: whole }, gone, push);
    s.released = [
      ...s.released,
      { on, t: s.t, ...two.gone, q: s.q, w: s.w, centre: station, roll: inertia.roll, across: inertia.across, rest: two.kept },
    ];
    s.r = two.kept.r;
    s.v = two.kept.v;
    s.mass = two.kept.mass;
  };
  /** The tower goes. What is left has its centre of mass further down the axis: `r` goes to it. */
  const dropTower = (state: VehicleState): VehicleState => {
    const s: VehicleState = { ...state, towerAt: state.t };
    parts(s, towerJoint!);
    if (!towerAlone) return s;
    // (off the booster the centres are measured from the spacecraft's own, and the tower is what is aboard beyond the spacecraft: its rocket may have burned)
    const datum = hasLeft(state.craft, roles.booster.id) ? capsule.centre.value : 0;
    const gone = hasLeft(state.craft, roles.booster.id) ? Math.max(0, state.mass - capsuleMass(state)) : towerMass;
    const share = gone / towerMass;
    const def = sheds.find((d) => d.on === towerJoint);
    letGo(
      s,
      towerJoint!,
      massNow(state, state.mass).centre,
      { mass: gone, centre: towerAlone.centre - datum },
      towerAlone.centre,
      { roll: towerAlone.roll * share, across: towerAlone.across * share },
      def?.push?.value ?? 0,
    );
    // after an abort the escape rocket is burned out: shed.ts lights only what the tower still has
    if (state.abortAt !== null) s.released = [...s.released.slice(0, -1), { ...s.released.at(-1)!, aborted: true }];
    return s;
  };
  /** What the booster is as the spacecraft leaves it: everything but the spacecraft and whatever tower it takes, so that the two are the whole. */
  const boosterOf = (
    s: VehicleState,
    taken: number,
    takenCentre: number,
  ): { gone: { mass: number; centre: number }; inertia: { roll: number; across: number } } => {
    const all = massNow(s, s.mass);
    const mass = s.mass - taken;
    const gone = { mass, centre: (s.mass * all.centre - taken * takenCentre) / mass };
    const def = sheds.find((d) => d.on === separation);
    const piece = def ? pieceOf(body, def, filling(s, s.mass)) : null;
    // (without the flight's word on it, a uniform rod of the length below the spacecraft)
    return { gone, inertia: piece ?? { roll: (mass * radius * radius) / 2, across: (mass * (2 * gone.centre) ** 2) / 12 } };
  };
  /** The spacecraft parts from the booster, the two pushed apart along the axis at `speed`, shared by their masses. A tower still on goes first. */
  const leave = (state: VehicleState, speed: number): VehicleState => {
    const s = hasLeft(state.craft, roles.tower) ? { ...state } : dropTower(state);
    const axis = turn(s.q, X);
    const { gone, inertia } = boosterOf(s, alone, capsule.centre.value);
    s.separation = { t: s.t, r: s.r, v: s.v, axis, booster: { r: s.r, v: s.v } };
    letGo(s, separation, massNow(s, s.mass).centre, gone, gone.centre, inertia, speed);
    const booster = s.released[s.released.length - 1]!;
    s.separation.booster = { r: booster.r, v: booster.v };
    s.mass = alone;
    parts(s, separation);
    s.craft = burnOut(s.craft, engine.id, s.t); // the engine stays with the booster
    return s;
  };
  /** An abort: the engine is shut down, lit or not, and the spacecraft and its tower are a body of their own from this instant, the escape rocket alight. */
  const pullOff = (state: VehicleState): VehicleState => {
    const s: VehicleState = { ...state };
    // (the abort, on the machine: what it records of the plan's event; the escape rocket's burn is the vehicle's `escapeThrust`)
    s.craft = fire(plan, s.craft, abortEvent!.id, s.t, s.held).state;
    const axis = turn(s.q, X);
    const taken = alone + towerMass;
    // the two that leave together: their centre of mass on the stack
    const takenCentre = (alone * capsule.centre.value + towerMass * towerAlone!.centre) / taken;
    const { gone, inertia } = boosterOf(s, taken, takenCentre);
    s.abortAt = s.t;
    s.abortHeight = heightOf(s.r, s.t).height;
    // (shut down for good, whatever its kind: it goes with the booster)
    s.craft = burnOut(s.craft, engine.id, s.t);
    s.held = false;
    s.separation = { t: s.t, r: s.r, v: s.v, axis, booster: { r: s.r, v: s.v } };
    letGo(s, separation, massNow(s, s.mass).centre, gone, gone.centre, inertia, 0);
    const booster = s.released[s.released.length - 1]!;
    s.separation.booster = { r: booster.r, v: booster.v };
    s.mass = taken;
    parts(s, separation);
    // the abort's own sequence drops the retropack as the spacecraft leaves; off a stack still standing on its pad, onto the booster's top, where it stays
    if (afterAbort?.retropack && s.controls.automatic !== false) {
      dropPack(s);
      if (state.held && pack) s.released = [...s.released.slice(0, -1), { ...s.released.at(-1)!, stands: true }];
    }
    return s;
  };
  /** A parachute let out in more dynamic pressure than it can take tears as it comes out: what the plan says a torn canopy keeps of its drag area is left. */
  const tears = (s: VehicleState, ch: ChuteDef): Tear | null => {
    const q = windAt(s.r, s.v, s.t, seaLevel).q;
    return ch.strength && tearOf(q, 0, 0, { strength: ch.strength.value, torn: 0 }) ? { t: s.t, by: 'pressure', q, pull: 0 } : null;
  };
  const tornKeeps = roles.torn?.value ?? 1;
  const drogue = (s: VehicleState): VehicleState => {
    const torn = tears(s, roles.drogue);
    return {
      ...s,
      craft: act(plan, s.craft, { deploy: drogueChute }, s.t, s.held).state,
      drogueAt: s.t,
      torn: torn ? { ...s.torn, drogue: true } : s.torn,
      tore: torn ? { ...s.tore, drogue: torn } : s.tore,
      chute: { full: roles.drogue.dragArea.value * (torn ? tornKeeps : 1), was: 0, at: s.t, fills: roles.drogue.fills.value },
    };
  };
  /**
   * The parachute that is out, torn by the air it has since come into (`s` is as the step left it): by more dynamic
   * pressure than its cloth takes, or by more pull than its lines do, which is that pressure times the area it has
   * filled to. One let out where there is no air and carried full into the air goes this way. What is left streams:
   * what the plan says a torn canopy keeps of its drag area, or what it had filled to if that was less.
   */
  const worn = (s: VehicleState): VehicleState => {
    const which = s.mainAt !== null ? 'main' : s.drogueAt !== null ? 'drogue' : null;
    const ch = which === 'main' ? roles.main : roles.drogue;
    if (which === null || !ch.strength || !roles.torn || s.torn[which]) return s;
    const q = windAt(s.r, s.v, s.t, seaLevel).q;
    const area = chuteArea(s.chute, s.t);
    const tear = tearOf(q, area, ch.dragArea.value, {
      strength: ch.strength.value,
      pull: ch.pull?.value,
      torn: roles.torn.value,
    });
    if (tear === null) return s;
    const { by, pull, left } = tear;
    return {
      ...s,
      torn: { ...s.torn, [which]: true },
      tore: { ...s.tore, [which]: { t: s.t, by, q, pull } },
      chute: { full: left, was: left, at: s.t, fills: 1 },
    };
  };
  const main = (s: VehicleState): VehicleState => {
    const torn = tears(s, roles.main);
    return {
      ...s,
      craft: act(plan, s.craft, { deploy: mainChute }, s.t, s.held).state,
      mainAt: s.t,
      torn: torn ? { ...s.torn, main: true } : s.torn,
      tore: torn ? { ...s.tore, main: torn } : s.tore,
      chute: {
        full: roles.main.dragArea.value * (torn ? tornKeeps : 1),
        was: s.drogueAt === null ? 0 : s.chute.full,
        at: s.t,
        fills: roles.main.fills.value,
      },
    };
  };
  /** What bends the stack at a state (loads.ts): the dynamic pressure, Pa, and the long axis's angle off the wind, radians. */
  const bending = (d: Dyn, at: number): { q: number; alpha: number } => {
    const air = windAt(d.r, d.v, at, seaLevel);
    return { q: air.q, alpha: air.airspeed > 1 ? angleBetween(turn(d.q, X), air.wind) : 0 };
  };

  /** The engine and the motors as the machine has them, in the fields a state is read by. */
  const view = (s: VehicleState): VehicleState => {
    const e = engineOf(s);
    const ignited = Number.isFinite(e.lit);
    // (an abort shuts it down for good, lit or not)
    const cutoff = Number.isFinite(e.out) || s.abortAt !== null;
    const throttle = throttleOf(s);
    const retroAt = (retroEvent ? s.craft.fired[retroEvent] : undefined) ?? null;
    if (s.ignited === ignited && s.cutoff === cutoff && s.starts === e.starts && s.throttle === throttle && s.retroAt === retroAt) return s;
    return { ...s, ignited, cutoff, starts: e.starts, throttle, retroAt };
  };

  const tick = (state: VehicleState, controls: Controls | Pilot): VehicleState => view(advance(state, controls));
  const advance = (state: VehicleState, controls: Controls | Pilot): VehicleState => {
    if (state.landing) return state;
    let s = command(state, typeof controls === 'function' ? controls(state) : controls);
    if (!Number.isFinite(engineOf(s).lit) && s.abortAt === null) return s; // the clock starts with the engine, or with an abort before it
    const h = TICK;
    const ticks = s.ticks + 1;
    const t = ticks * h;
    if (s.held) {
      // it leaves when what holds it up is more than what holds it down: the Earth's turning helps a little
      const here: Dyn = { r: s.r, v: s.v, q: s.q, w: s.w, mass: s.mass };
      const lifts = add(add(gravity(s.r), scale(forces(here, s.t, s).force, 1 / s.mass)), scale(cross(earth, cross(earth, s.r)), -1));
      if (dot(lifts, frame.up(s.r, s.t)) > 0) s.held = false;
      else return { ...s, ...standing(s, t, burning(s) ? s.mass - flow * throttleOf(s) * h : s.mass), t, ticks };
    }
    const before: Dyn = { r: s.r, v: s.v, q: s.q, w: s.w, mass: s.mass };
    // A burn that ends within the tick ends there: the tick is flown in pieces, each from the instant before to the next
    // at which something stops or lights (the engine running dry, a motor by its timer), so a burn is all of its impulse
    // and no more. (The engine cut by a hand or the sequencer, and the events, are at the ticks they are asked on.)
    let dries = Number.POSITIVE_INFINITY;
    if (burning(s) && throttleOf(s) > 0) {
      const burned = (hasLeft(s.craft, roles.tower) ? towerless : whole).fixed + whole.fluid - s.mass;
      const at = s.t + (stack.mass.value - dryOut - burned) / (flow * throttleOf(s));
      if (at > s.t + ON_TICK && at < t - ON_TICK) dries = at;
    }
    const ends = [...(Number.isFinite(dries) ? [dries] : []), ...retroMarks(s, s.t, t)].sort((a, b) => a - b);
    let after = before;
    let from = s.t;
    // (what burns through each piece, as it is from the piece's start)
    let piece = s;
    for (const to of [...ends, t]) {
      after = rk4(after, from, to - from, piece);
      from = to;
      if (to === t) break;
      if (to === dries) piece = { ...piece, craft: burnOut(piece.craft, engine.id, dries) };
      if (motors.length) {
        const lit = { ...piece };
        byTimer(lit, to);
        if (lit.craft !== piece.craft) piece = lit;
      }
    }
    s = piece;
    const was = heightOf(foot(s, before), s.t);
    const now = heightOf(foot(s, after), t);
    const up = frame.upOver(now, t);
    const wind = sub(after.v, cross(earth, after.r));
    const falling = dot(wind, up) < 0;
    if (falling && now.height <= now.ground) {
      // back to the instant it touched, along the last step
      const part = clamp((was.height - now.ground) / (was.height - now.height || 1), 0, 1);
      const mix = (a: Vec3, b: Vec3): Vec3 => add(a, scale(sub(b, a), part));
      const r = mix(before.r, after.r);
      const v = mix(before.v, after.v);
      const at = s.t + h * part;
      const through = sub(v, cross(earth, r));
      const here = ecefToGeodetic(fixed(r, at));
      const plumb = frame.upOver(here, at);
      const vertical = -dot(through, plumb);
      return {
        ...s,
        ...after,
        r,
        v,
        t: at,
        ticks,
        landing: {
          t: at,
          vertical,
          horizontal: length(add(through, scale(plumb, vertical))),
          latitude: here.latitude,
          longitude: here.longitude,
          lean: angleBetween(turn(after.q, X), plumb) / DEG,
        },
      };
    }
    s = { ...s, ...after, t, ticks };
    if (bend && !hasLeft(s.craft, roles.booster.id)) {
      const loads = bending(after, t);
      const next = strain(s.strain, (loads.q * loads.alpha) / bend.value.value, h);
      s.strain = next.strain;
      if (next.fails) {
        // It breaks at its joint: the booster goes its own way, engine out. A spacecraft with its escape rocket still aboard is
        // pulled clear by it, taken as fired by the break itself (what the abort system watched is not in anything read).
        s.broke = { t, load: next.strain.load, q: loads.q, alpha: loads.alpha / DEG, joint: bend.at ?? separation };
        s = rocket && !hasLeft(s.craft, roles.tower) && s.abortAt === null ? pullOff(s) : leave(s, 0);
      }
    }
    s = worn(s);
    if (s.rcs.firing !== QUIET) {
      const left = s.rcs.left.slice();
      s.rcs.firing.forEach((f, i) => {
        left[supplyOf[i]!]! -= f * burnOf[i]! * h;
      });
      s.rcs = { left, firing: s.rcs.firing };
    }
    // an abort's own sequence: the rocket out and the climb over, the tower goes
    const automatic = s.controls.automatic !== false;
    if (automatic && s.abortAt !== null && !hasLeft(s.craft, roles.tower) && falling && t >= s.abortAt + escapeOver) s = dropTower(s);
    // ...and, begun low enough, its parachutes by the clock: the drogue so long after the tower, the main so long after that, once under its height
    const timed = afterAbort !== null && s.abortHeight !== null && s.abortHeight < afterAbort.ceiling.value;
    if (automatic && timed && hasLeft(s.craft, roles.tower) && s.towerAt !== null) {
      if (s.drogueAt === null && s.mainAt === null && t >= s.towerAt + afterAbort.drogue.value - 1e-9) s = drogue(s);
      if (s.drogueAt !== null && s.mainAt === null && t >= s.drogueAt + afterAbort.main.value - 1e-9 && now.height <= roles.mainHeight)
        s = main(s);
    }
    if (hasLeft(s.craft, roles.booster.id) && hasLeft(s.craft, roles.tower) && falling) {
      // what happens at a height, coming down (fly.ts), where the spacecraft's own sequence is left to do it
      if (automatic && !timed && s.drogueAt === null && s.mainAt === null && now.height <= roles.drogueHeight) s = drogue(s);
      if (automatic && !timed && s.drogueAt !== null && s.mainAt === null && now.height <= roles.mainHeight) s = main(s);
      const retroAt = retroEvent ? s.craft.fired[retroEvent] : undefined;
      if (s.enteredAt === null && retros(s, t).count === 0 && (retroAt === undefined || t > retroAt + retroEnd)) {
        if (length(forces(after, t, s).force) / after.mass / G0 >= ENTRY_G) s.enteredAt = t;
      }
    }
    return s;
  };

  const doingOf = (s: VehicleState): Doing => {
    const riding = !hasLeft(s.craft, roles.booster.id);
    return {
      riding,
      powered: riding && burning(s),
      escaping: !riding && !hasLeft(s.craft, roles.tower),
      entered: s.enteredAt !== null,
      out: s.mainAt !== null ? mainChute : s.drogueAt !== null ? drogueChute : null,
      landed: Boolean(s.landing),
    };
  };

  const sample = (s: VehicleState): LiveSample => {
    const d: Dyn = { r: s.r, v: s.v, q: s.q, w: s.w, mass: s.mass };
    const f = forces(d, s.t, s);
    const axis = turn(s.q, X);
    // the spacecraft's own centre of mass, which with its tower on is not the centre of the two
    const centre = hasLeft(s.craft, roles.booster.id) ? sub(s.r, scale(axis, f.props.centre)) : s.r;
    // the point fly.ts flies: the stack's base, and after separation that point as the spacecraft carried it off
    const point = s.separation ? sub(centre, scale(s.separation.axis, capsule.centre.value)) : sub(s.r, scale(axis, f.props.centre));
    const here = ecefToGeodetic(fixed(s.separation ? s.r : point, s.t));
    const up = frame.upOver(here, s.t);
    const climb = (v: Vec3): number => (length(v) > 1e-9 ? Math.asin(clamp(dot(v, up) / length(v), -1, 1)) / DEG : 90);
    return {
      t: s.t,
      ...doingOf(s),
      altitude: here.height - seaLevel,
      range: rangeOf(s.separation ? s.r : point, s.t),
      speed: length(s.v),
      groundSpeed: length(f.ground),
      climb: climb(s.v),
      groundClimb: climb(f.ground),
      g: s.held ? 1 : length(f.force) / s.mass / G0,
      q: f.q,
      mach: f.mach,
      mass: s.mass,
      latitude: here.latitude,
      longitude: here.longitude,
      r: point,
      v: s.v,
      axis,
      attitude: s.q,
      rates: s.w,
      alpha: f.airspeed > 1e-6 ? angleBetween(axis, f.wind) / DEG : 0,
      centre,
      chute: s.chute,
      strain: hasLeft(s.craft, roles.booster.id) ? 0 : s.strain.load,
      lateral: s.held ? 0 : loadsOf(unturn(s.q, f.force), s.mass, f.q, 0).lateral,
      burning: [
        ...(burning(s)
          ? [
              {
                engine: engine.id,
                thrust: nozzleThrust(1, vacuum, throttleOf(s), exitArea, sky.air(here.height - seaLevel).pressure),
              },
            ]
          : []),
        ...(s.abortAt !== null && !hasLeft(s.craft, roles.tower) && escapeThrust(s.t - s.abortAt) > 0
          ? [{ engine: escapeMotor!, thrust: escapeThrust(s.t - s.abortAt) }]
          : []),
        ...motors.flatMap((m) => {
          const lit = s.craft.engines[m.id]!.lit;
          return aboard(s.craft, m.body) && s.t >= lit && s.t < lit + m.burn!.value
            ? [{ engine: m.id, thrust: m.thrust.vacuum.value }]
            : [];
        }),
      ],
      rcs: s.rcs,
      tanks:
        tanks && !hasLeft(s.craft, roles.booster.id)
          ? tanksLeft((hasLeft(s.craft, roles.tower) ? towerless : whole).fixed + whole.fluid - s.mass)
          : null,
    };
  };

  return {
    plan,
    engine: engine.id,
    site,
    frame,
    launch: { up: up0, downrange: downrange0, left: left0 },
    programme,
    start,
    tick,
    step(state, controls, dt) {
      let s = state;
      // Whole ticks, counted: the time owed since the tick the last frame ended on, by the same sum however it was cut up
      // (the remainder is kept to a part in a million of a tick, so a hundred hundredths are a hundred ticks).
      const owed = s.carry + Math.max(0, dt);
      const n = Math.floor(owed / TICK + 1e-6);
      let carry = Math.max(0, owed - n * TICK);
      for (let i = 0; i < n && !s.landing; i++) {
        s = tick(s, controls);
        if (!Number.isFinite(engineOf(s).lit) && s.abortAt === null) {
          carry = 0; // nothing to catch up on while it stands unlit
          break;
        }
      }
      return s.carry === carry ? s : { ...s, carry: s.landing ? 0 : carry };
    },
    sample,
    mass: (s) => massNow(s, s.mass),
    tanks: tanks && { oxidizer: tanks.oxidizer, fuel: tanks.fuel },
    jet(i, thrust) {
      const jet = jets[i]!;
      const force = scale(jet.push, thrust);
      return { force, torque: cross(jet.at, force) };
    },
    margin(s) {
      const surfaces = hasLeft(s.craft, roles.booster.id) ? capsule.surfaces : body.surfaces;
      const slope = surfaces.reduce((sum, a) => sum + a.slope, 0);
      const pressure = surfaces.reduce((sum, a) => sum + a.slope * a.station, 0) / slope;
      const centre = massNow(s, s.mass).centre;
      // the stack flies nose first, and so does the spacecraft with its tower on: stable is the pressure behind (below) the mass; the spacecraft alone flies blunt end first
      return hasLeft(s.craft, roles.booster.id) && hasLeft(s.craft, roles.tower) ? pressure - centre : centre - pressure;
    },
  };
}

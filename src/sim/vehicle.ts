/**
 * A vehicle flown live: stepped a frame at a time and steered, where fly.ts runs a whole flight
 * with its attitude prescribed. The same Newtonian flight (fly.ts's gravity, air, thrust and
 * drag, in the same frame that does not turn, from the same `Flight.trajectory`), and with it the
 * body's turning: a rigid body under the torques of its turned thrust, of the air on its nose and
 * fins, and of its attitude jets. Nothing here knows which flight it is; what a flight adds for it
 * is `Trajectory.body` (types.ts), each figure with its confidence.
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
 *             place, so the spacecraft hangs. Let out in more pressure than it can take, it tears.
 *   staging   whatever leaves (tower, booster, retropack) is one body made two (forces.ts: `part`),
 *             momentum kept, and is put in `released` for shed.ts to fly.
 *   loads     the stack's bending load (q alpha) against `body.limits` (loads.ts): past it the
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
 *   rocket    the escape rocket, on an abort: `body.escape`'s thrust along the axis for its burn,
 *             then falling evenly to nothing over as long as its total impulse says.
 * Mass, centre of mass and inertia follow the propellant down the tanks (rigid.ts: massOf). The
 * terms that come of mass leaving a turning body (jet damping) and of the centre of mass moving
 * along it are left out, and so are slosh, bending, wind, thrust misalignment and the air rudders.
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
 * and the climb is over the tower is let go, and from there it is the usual descent: the
 * parachutes at their heights. Until the tower has gone no parachute comes out. The rocket's
 * push is taken as straight along the axis through the centre of mass (the real one was set a
 * little off it, to carry the spacecraft aside), its propellant's weight stays aboard until the
 * tower goes, and the booster is left to itself.
 */
import type { MassPart, Trajectory } from '../types';
import { EARTH_ROTATION_RATE } from '../world/bodies.ts';
import {
  add,
  angleBetween,
  cross,
  DEG,
  dot,
  ecefToGeodetic,
  ecefToInertial,
  enuAxes,
  fromHorizontal,
  type Geodetic,
  geodeticToEcef,
  inertialToEcef,
  length,
  scale,
  sub,
  unit,
  type Vec3,
} from '../world/frames.ts';
import { atmosphere } from './atmosphere.ts';
import { along, axisOf, G0, gravity, MEAN_RADIUS, P0, type Phase, type Sample } from './fly.ts';
import { airForces, part, pieceOf, type Release, upAt, upOver, windAt } from './forces.ts';
import { loadsOf, type Strain, strain, UNSTRAINED } from './loads.ts';
import {
  aboutAxis,
  euler,
  fixedAndFluid,
  fromAxes,
  type MassProperties,
  massOf,
  multiply,
  normalize,
  type Quat,
  spin,
  turn,
  unturn,
} from './rigid.ts';

/** The integration step, s. */
export const TICK = 0.01;

/** What the pilot, or an autopilot, asks of the vehicle. Steering is -1 to 1 about each body axis. */
export interface Controls {
  /**
   * The engine's lever, 0 to 1 of rated thrust. What it does is the engine's nature (`body.engine`): one that does
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
  /** Let the escape tower go. */
  tower?: boolean;
  /** Part the spacecraft from the booster. */
  separate?: boolean;
  /** Start the retrorockets' sequence. */
  retro?: boolean;
  /** Drop the retropack. */
  retropack?: boolean;
  /** Let a parachute out before its height. */
  drogue?: boolean;
  main?: boolean;
  /** On the spacecraft: the axes the hand has, worked through the manual system's chambers and its supply; the rest are the automatic system's. */
  manual?: { pitch?: boolean; yaw?: boolean; roll?: boolean };
  /** Abort on the escape rocket, while the tower is aboard: the engine is shut down and the spacecraft pulled off the booster. */
  abort?: boolean;
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
  /** The engine has been started; it has stopped; the vehicle is still standing on its pad. */
  ignited: boolean;
  cutoff: boolean;
  held: boolean;
  /** How many times the engine has been started, and the fraction of its rated thrust it is running at. */
  starts: number;
  throttle: number;
  /** What has left it. */
  shed: { tower: boolean; booster: boolean; retropack: boolean };
  /** The moment the spacecraft left: the stack's centre of mass and axis then, and how the booster went on. */
  separation: null | { t: number; r: Vec3; v: Vec3; axis: Vec3; booster: { r: Vec3; v: Vec3 } };
  /** Everything let go so far, each as it was the instant it left: sim/shed.ts flies them on. */
  released: readonly Release[];
  /** The stack's bending load against its limit (`body.limits.qAlpha`; sim/loads.ts): all nothing where the flight gives none. */
  strain: Strain;
  /** The stack broke: when, at what fraction of the limit, in what dynamic pressure (Pa) and how far off the wind (degrees), and at which joint. */
  broke: null | { t: number; load: number; q: number; alpha: number; joint: string };
  /** A parachute let out in more dynamic pressure than it can take, and torn. */
  torn: { drogue: boolean; main: boolean };
  /** When the escape rocket was fired, if it has been. */
  abortAt: number | null;
  /** When the first retrorocket lit. */
  retroAt: number | null;
  /** The parachute now out, as fly.ts has it, and when each came out. */
  chute: { full: number; was: number; at: number; fills: number };
  drogueAt: number | null;
  mainAt: number | null;
  /** The reaction control system: kg left in each of `capsule.rcs.supplies`, and what each of its `thrusters` is pushing with this tick, N. Empty lists where the flight gives no hardware. */
  rcs: { left: readonly number[]; firing: readonly number[] };
  /** When the air was first felt coming down (a twentieth of a g). */
  enteredAt: number | null;
  /** Where and how fast it came down, once it has: speeds through the air there, m/s, and the long axis's angle from the vertical, degrees. */
  landing: null | { t: number; vertical: number; horizontal: number; latitude: number; longitude: number; lean: number };
  /** The controls last applied. */
  controls: Controls;
}

/** A sample as fly.ts gives them, and how the body lies. */
export interface LiveSample extends Sample {
  /** The long axis in the frame that does not turn, and the whole attitude (body to frame). */
  axis: Vec3;
  attitude: Quat;
  /** Body rates, rad/s. */
  rates: Vec3;
  /** The angle between the long axis and the motion through the air, degrees: 0 nose first, 180 heat shield first. */
  alpha: number;
  /** Every motor burning at this instant, with its thrust, N: the engine ('main'), the escape rocket, each retrorocket. */
  burning: { name: string; thrust: number }[];
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
  readonly trajectory: Trajectory;
  readonly site: Geodetic;
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
const TOWER: ReadonlySet<string> = new Set(['tower']);
const clamp = (x: number, lo = -1, hi = 1): number => Math.min(hi, Math.max(lo, x));

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
}

/** A flight's vehicle, ready to be flown. `seaLevel` as in fly.ts. */
export function vehicle(trajectory: Trajectory, site: Geodetic, seaLevel = 0, options: VehicleOptions = {}): Vehicle {
  const tr = trajectory;
  const body = tr.body;
  if (!body) throw new Error('this trajectory has no `body`: it can be flown by fly(), not steered');
  const flow = tr.engine.thrust.value / (G0 * tr.engine.isp.value);
  const earth: Vec3 = [0, 0, EARTH_ROTATION_RATE];
  const pad = geodeticToEcef(site);
  const padHeight = site.height - seaLevel;
  const programme = axisOf(tr, site);
  const up0 = programme(-1e9);
  // (level along the launch azimuth, from the azimuth itself: a programme that never tilts has no direction to give)
  const [east, north] = fromHorizontal(tr.azimuth.value * DEG, 0);
  const downrange0 = unit(add(scale(enuAxes(site).east, east), scale(enuAxes(site).north, north)));
  const left0 = cross(up0, downrange0);
  const q0 = fromAxes(up0, left0, scale(downrange0, -1));

  const radius = body.radius.value;
  const capsule = body.capsule;
  const whole = fixedAndFluid(body.parts, NONE);
  const towerless = fixedAndFluid(body.parts, TOWER);
  const towerMass = whole.fixed - towerless.fixed;
  // the tower by itself, and how far up the axis from the spacecraft's own centre of mass its centre is
  const towerParts = body.parts.filter((p) => p.sheds === 'tower');
  const towerAlone = towerParts.length ? massOf(towerParts, radius, 0, NONE) : null;
  const rocket = body.escape && towerAlone ? body.escape : null;
  /** How long the escape rocket takes to die away after its burn, s: what is left of its impulse at a thrust falling evenly to nothing. */
  const escapeTail = rocket ? Math.max(0, (2 * (rocket.impulse.value - rocket.thrust.value * rocket.burn.value)) / rocket.thrust.value) : 0;
  const escapeThrust = (since: number): number => {
    if (!rocket || since < 0) return 0;
    if (since <= rocket.burn.value) return rocket.thrust.value;
    return escapeTail > 0 ? rocket.thrust.value * Math.max(0, 1 - (since - rocket.burn.value) / escapeTail) : 0;
  };
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
  const escapeOver = rocket ? rocket.burn.value + escapeTail : 0;
  const dryOut = tanks
    ? tr.liftoffMass.value - tanks.burnable
    : tr.engine.depletion
      ? tr.liftoffMass.value - flow * tr.engine.depletion.value
      : whole.fixed;
  const deflection = Math.sin(body.control.deflection.value * DEG);
  const retroOffsets = tr.retro.fires.map((f) => f.value - tr.retro.fires[0]!.value);
  const retroBurn = tr.retro.burn.value;
  const retroEnd = retroOffsets[retroOffsets.length - 1]! + retroBurn;

  const fixed = (r: Vec3, at: number): Vec3 => inertialToEcef(r, EARTH_ROTATION_RATE * at);
  const rangeOf = (r: Vec3, at: number): number => angleBetween(fixed(r, at), pad) * MEAN_RADIUS;
  const floor =
    options.floor ??
    ((latitude: number, longitude: number): number => {
      const here = geodeticToEcef({ latitude, longitude, height: site.height });
      return length(sub(here, pad)) < 1000 ? padHeight : 0;
    });

  const sheds = body.sheds ?? [];
  const limits = body.limits ?? null;
  const stackSide = body.side ? { dragArea: body.side.dragArea.value, from: body.side.from.value, to: body.side.to.value } : null;
  const capsuleSide = capsule.side
    ? { dragArea: capsule.side.dragArea.value, from: capsule.side.from.value, to: capsule.side.to.value }
    : null;
  // the retropack, where the flight gives it as a body: what it weighs, and how far below the spacecraft's centre of mass its own is
  const pack = sheds.find((d) => d.on === 'retropack' && d.mass && d.centre) ?? null;
  const packMoment = pack ? pack.mass!.value * (capsule.centre.value - pack.centre!.value) : 0;
  /** How full each of the booster's tanks is, with `mass` aboard. */
  const filling = (s: VehicleState, mass: number): number | ((p: MassPart) => number) => {
    const { fixed: dry, fluid } = s.shed.tower ? towerless : whole;
    if (!tanks) return fluid > 0 ? (mass - dry) / fluid : 0;
    const left = tanksLeft(dry + fluid - mass);
    return (p) => (p.propellant === 'oxidizer' ? left.oxidizer / tanks.oxidizer : p.propellant === 'fuel' ? left.fuel / tanks.fuel : 1);
  };
  const massNow = (s: VehicleState, mass: number): MassProperties => {
    if (s.shed.booster) {
      if (s.shed.tower || !towerAlone) {
        // (with the retropack gone from under it, what is left has its centre of mass that much nearer the small end)
        const centre = s.shed.retropack ? packMoment / mass : 0;
        return { mass, centre, roll: mass * capsule.gyration.roll.value ** 2, across: mass * capsule.gyration.across.value ** 2 };
      }
      // pulled off by the escape rocket, the tower still on: the two as one body, its centre measured up the axis from the spacecraft's own
      const alone = mass - towerAlone.mass;
      const reach = towerAlone.centre - capsule.centre.value;
      const centre = (towerAlone.mass * reach) / mass;
      return {
        mass,
        centre,
        roll: alone * capsule.gyration.roll.value ** 2 + towerAlone.roll,
        across: alone * (capsule.gyration.across.value ** 2 + centre ** 2) + towerAlone.across + towerAlone.mass * (reach - centre) ** 2,
      };
    }
    return massOf(body.parts, radius, filling(s, mass), s.shed.tower ? TOWER : NONE);
  };
  const burning = (s: VehicleState): boolean => s.ignited && !s.cutoff;
  const nature = body.engine;
  const solid = nature?.kind === 'solid';
  const startsAllowed = nature?.starts ?? 1;
  /** The fraction of rated thrust the engine gives for a lever at `u`: what its nature allows. */
  const allowed = (u: number): number => {
    if (!(u > 0)) return 0;
    const range = solid ? undefined : nature?.throttle;
    if (!range) return 1;
    return u < range[0] - 1e-12 ? 0 : Math.min(u, range[1]);
  };
  const retros = (s: VehicleState, at: number): number =>
    s.retroAt === null || s.shed.retropack ? 0 : retroOffsets.filter((o) => at >= s.retroAt! + o && at < s.retroAt! + o + retroBurn).length;

  /** Every force but gravity (N, in the frame) and the torque about the centre of mass (N m, in the body), with what the air is doing. */
  const forces = (d: Dyn, at: number, s: VehicleState) => {
    const props = massNow(s, d.mass);
    const { altitude, air, wind, airspeed, mach, q } = windAt(d.r, d.v, at, seaLevel);
    const riding = !s.shed.booster;
    const escaping = s.abortAt !== null && !s.shed.tower;
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
      const end = tr.area.value * along(leads ? tr.ascentDrag : tr.entryDrag, mach);
      const f = airForces(
        {
          area: tr.area.value,
          ahead: end,
          astern: end,
          surfaces: riding ? body.surfaces : capsule.surfaces,
          side: riding ? stackSide : capsuleSide,
        },
        props.centre,
        through,
        d.w,
        air.density,
      );
      force = add(force, turn(d.q, f.force));
      torque = add(torque, f.torque);
      const chute = s.chute.was + (s.chute.full - s.chute.was) * clamp((at - s.chute.at) / s.chute.fills, 0, 1);
      if (chute > 0) {
        // it streams along the air's motion past where it is made fast, which the body's turning adds to
        const arm = capsule.chuteArm.value - props.centre;
        const u = add(through, cross(d.w, [arm, 0, 0]));
        push(scale(u, -0.5 * air.density * length(u) * chute), arm);
      }
    }
    if (burning(s)) {
      // (throttled, the chamber's thrust goes with the lever and the nozzle's gain from thinner air is held as at full: no record says otherwise)
      const thrust = tr.engine.thrust.value * s.throttle + (P0 - air.pressure) * tr.engine.exitArea.value;
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
      const lit = retros(s, at);
      if (lit > 0) push([lit * tr.retro.thrust.value, 0, 0], 0);
    }
    if (escaping) {
      const pull = escapeThrust(at - s.abortAt!);
      if (pull > 0) push([pull, 0, 0], 0);
    }
    return { force, torque, q, mach, altitude, wind, airspeed, props };
  };

  const rate = (d: Dyn, at: number, s: VehicleState): Dyn => {
    const f = forces(d, at, s);
    return {
      r: d.v,
      v: add(gravity(d.r), scale(f.force, 1 / d.mass)),
      q: spin(d.q, d.w),
      w: euler(d.w, f.torque, f.props.roll, f.props.across),
      mass: (burning(s) ? -flow * s.throttle : 0) - rcsFlow(s),
    };
  };
  const nudge = (d: Dyn, k: Dyn, h: number): Dyn => ({
    r: add(d.r, scale(k.r, h)),
    v: add(d.v, scale(k.v, h)),
    q: [d.q[0] + k.q[0] * h, d.q[1] + k.q[1] * h, d.q[2] + k.q[2] * h, d.q[3] + k.q[3] * h],
    w: add(d.w, scale(k.w, h)),
    mass: d.mass + k.mass * h,
  });
  const rk4 = (d: Dyn, at: number, h: number, s: VehicleState): Dyn => {
    const k1 = rate(d, at, s);
    const k2 = rate(nudge(d, k1, h / 2), at + h / 2, s);
    const k3 = rate(nudge(d, k2, h / 2), at + h / 2, s);
    const k4 = rate(nudge(d, k3, h), at + h, s);
    const sum = (a: Vec3, b: Vec3, c: Vec3, e: Vec3): Vec3 => scale(add(add(a, scale(b, 2)), add(scale(c, 2), e)), 1 / 6);
    const next = nudge(
      d,
      {
        r: sum(k1.r, k2.r, k3.r, k4.r),
        v: sum(k1.v, k2.v, k3.v, k4.v),
        q: [0, 1, 2, 3].map((i) => (k1.q[i]! + 2 * k2.q[i]! + 2 * k3.q[i]! + k4.q[i]!) / 6) as unknown as Quat,
        w: sum(k1.w, k2.w, k3.w, k4.w),
        mass: (k1.mass + 2 * k2.mass + 2 * k3.mass + k4.mass) / 6,
      },
      h,
    );
    return { ...next, q: normalize(next.q) };
  };

  /** Standing on the turning Earth at `at`, with `mass` aboard: where that puts the centre of mass, and how it lies. */
  const standing = (s: VehicleState, at: number, mass: number): Dyn => {
    const angle = EARTH_ROTATION_RATE * at;
    const q = multiply(aboutAxis([0, 0, 1], angle), q0);
    const r = add(ecefToInertial(pad, angle), scale(turn(q, X), massNow(s, mass).centre));
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
      mass: tr.liftoffMass.value,
      ignited: false,
      cutoff: false,
      held: true,
      starts: 0,
      throttle: 0,
      shed: { tower: false, booster: false, retropack: false },
      separation: null,
      released: [],
      strain: UNSTRAINED,
      broke: null,
      torn: { drogue: false, main: false },
      abortAt: null,
      rcs: { left: rcsFull, firing: QUIET },
      retroAt: null,
      chute: { full: 0, was: 0, at: 0, fills: 1 },
      drogueAt: null,
      mainAt: null,
      enteredAt: null,
      landing: null,
      controls: HANDS_OFF,
    };
    return { ...blank, ...standing(blank, 0, blank.mass) };
  };

  /** The point whose height says whether it has come down: the stack's base, the spacecraft's centre. */
  const foot = (s: VehicleState, d: Dyn): Vec3 => (s.shed.booster ? d.r : sub(d.r, scale(turn(d.q, X), massNow(s, d.mass).centre)));
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
    const c: Controls = { ...asked, pitch: clamp(asked.pitch), yaw: clamp(asked.yaw), roll: clamp(asked.roll) };
    let s: VehicleState = { ...state, controls: c, shed: { ...state.shed } };
    // a solid, lit, burns on whatever the lever says
    const lever = solid && burning(s) ? 1 : allowed(c.throttle);
    // (what has gone through the engine, not what the stack weighs: a tower let go early is not propellant burned)
    const spent =
      !s.shed.booster && (s.shed.tower ? towerless : whole).fixed + whole.fluid - s.mass >= tr.liftoffMass.value - dryOut - 1e-6;
    if (!burning(s) && lever > 0 && s.starts < startsAllowed && !spent && !s.shed.booster && s.abortAt === null) {
      s.ignited = true;
      s.cutoff = false;
      s.starts += 1;
    }
    if (burning(s) && (lever === 0 || spent)) s.cutoff = true;
    s.throttle = burning(s) ? lever : 0;
    if (s.landing) return s;
    if (c.abort && rocket && s.abortAt === null && !s.shed.tower && !s.shed.booster) {
      s = pullOff(s);
    }
    if (s.held) return s;
    // (the escape rocket takes the tower with it only once it is out: until then the tower is what is pulling)
    if (c.tower && !s.shed.tower && (s.abortAt === null || s.t >= s.abortAt + escapeOver)) s = dropTower(s);
    if (c.separate && !s.shed.booster) s = leave(s, tr.separation.speed.value);
    if (s.shed.booster) {
      if (c.retro && s.retroAt === null && !s.shed.retropack) s.retroAt = s.t;
      if (c.retropack && !s.shed.retropack) {
        if (pack && s.shed.tower) {
          // it leaves from under the spacecraft with the velocity that place had; what is left is lighter by it, about a centre of mass further up
          const two = part(
            { r: s.r, v: s.v, q: s.q, w: s.w, mass: s.mass, centre: 0 },
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
        s.shed.retropack = true;
        s.mass = tr.retropack.mass.value - rcsUsed(s); // (the record's weight after it, less what the jets have burned)
      }
      // (no parachute comes out past a tower)
      if (c.drogue && s.shed.tower && s.drogueAt === null && s.mainAt === null) s = drogue(s);
      if (c.main && s.shed.tower && s.mainAt === null) s = main(s);
    }
    const firing = valves(s, c);
    if (firing !== s.rcs.firing) s.rcs = { left: s.rcs.left, firing };
    return s;
  };
  /** Which chambers are open for this tick, and how hard each pushes, N: the commands through each system's own logic, and no more than its supply can feed. */
  const valves = (s: VehicleState, c: Controls): readonly number[] => {
    if (!rcs || !s.shed.booster || s.mainAt !== null || s.landing) return QUIET;
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
    const s: VehicleState = { ...state, shed: { ...state.shed, tower: true } };
    if (!towerAlone) return s;
    // (off the booster the centres are measured from the spacecraft's own)
    const datum = state.shed.booster ? capsule.centre.value : 0;
    const def = sheds.find((d) => d.on === 'tower');
    letGo(
      s,
      'tower',
      massNow(state, state.mass).centre,
      { mass: towerMass, centre: towerAlone.centre - datum },
      towerAlone.centre,
      towerAlone,
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
    const def = sheds.find((d) => d.on === 'separation');
    const piece = def ? pieceOf(body, def, filling(s, s.mass)) : null;
    // (without the flight's word on it, a uniform rod of the length below the spacecraft)
    return { gone, inertia: piece ?? { roll: (mass * radius * radius) / 2, across: (mass * (2 * gone.centre) ** 2) / 12 } };
  };
  /** The spacecraft parts from the booster, the two pushed apart along the axis at `speed`, shared by their masses. A tower still on goes first. */
  const leave = (state: VehicleState, speed: number): VehicleState => {
    const s = state.shed.tower ? { ...state, shed: { ...state.shed } } : dropTower(state);
    const axis = turn(s.q, X);
    const { gone, inertia } = boosterOf(s, tr.separation.mass.value, capsule.centre.value);
    s.separation = { t: s.t, r: s.r, v: s.v, axis, booster: { r: s.r, v: s.v } };
    letGo(s, 'separation', massNow(s, s.mass).centre, gone, gone.centre, inertia, speed);
    const booster = s.released[s.released.length - 1]!;
    s.separation.booster = { r: booster.r, v: booster.v };
    s.mass = tr.separation.mass.value;
    s.shed.booster = true;
    if (burning(s)) s.cutoff = true; // the engine stays with the booster
    s.throttle = 0;
    return s;
  };
  /** An abort: the engine is shut down, lit or not, and the spacecraft and its tower are a body of their own from this instant, the escape rocket alight. */
  const pullOff = (state: VehicleState): VehicleState => {
    const s: VehicleState = { ...state, shed: { ...state.shed } };
    const axis = turn(s.q, X);
    const taken = tr.separation.mass.value + towerMass;
    // the two that leave together: their centre of mass on the stack
    const takenCentre = (tr.separation.mass.value * capsule.centre.value + towerMass * towerAlone!.centre) / taken;
    const { gone, inertia } = boosterOf(s, taken, takenCentre);
    s.abortAt = s.t;
    s.cutoff = true;
    s.throttle = 0;
    s.held = false;
    s.separation = { t: s.t, r: s.r, v: s.v, axis, booster: { r: s.r, v: s.v } };
    letGo(s, 'separation', massNow(s, s.mass).centre, gone, gone.centre, inertia, 0);
    const booster = s.released[s.released.length - 1]!;
    s.separation.booster = { r: booster.r, v: booster.v };
    s.mass = taken;
    s.shed.booster = true;
    return s;
  };
  /** A parachute let out in more dynamic pressure than it can take tears: `limits.torn` of its drag area is left. */
  const tears = (s: VehicleState, which: 'drogue' | 'main'): boolean =>
    limits !== null && windAt(s.r, s.v, s.t, seaLevel).q > limits[which].value;
  const drogue = (s: VehicleState): VehicleState => {
    const torn = tears(s, 'drogue');
    return {
      ...s,
      drogueAt: s.t,
      torn: torn ? { ...s.torn, drogue: true } : s.torn,
      chute: { full: tr.drogue.dragArea.value * (torn ? limits!.torn.value : 1), was: 0, at: s.t, fills: tr.drogue.fills.value },
    };
  };
  const main = (s: VehicleState): VehicleState => {
    const torn = tears(s, 'main');
    return {
      ...s,
      mainAt: s.t,
      torn: torn ? { ...s.torn, main: true } : s.torn,
      chute: {
        full: tr.main.dragArea.value * (torn ? limits!.torn.value : 1),
        was: s.drogueAt === null ? 0 : s.chute.full,
        at: s.t,
        fills: tr.main.fills.value,
      },
    };
  };
  /** What bends the stack at a state (loads.ts): the dynamic pressure, Pa, and the long axis's angle off the wind, radians. */
  const bending = (d: Dyn, at: number): { q: number; alpha: number } => {
    const air = windAt(d.r, d.v, at, seaLevel);
    return { q: air.q, alpha: air.airspeed > 1 ? angleBetween(turn(d.q, X), air.wind) : 0 };
  };

  const tick = (state: VehicleState, controls: Controls | Pilot): VehicleState => {
    if (state.landing) return state;
    let s = command(state, typeof controls === 'function' ? controls(state) : controls);
    if (!s.ignited && s.abortAt === null) return s; // the clock starts with the engine, or with an abort before it
    const h = TICK;
    const ticks = s.ticks + 1;
    const t = ticks * h;
    if (s.held) {
      // it leaves when what holds it up is more than what holds it down: the Earth's turning helps a little
      const here: Dyn = { r: s.r, v: s.v, q: s.q, w: s.w, mass: s.mass };
      const lifts = add(add(gravity(s.r), scale(forces(here, s.t, s).force, 1 / s.mass)), scale(cross(earth, cross(earth, s.r)), -1));
      if (dot(lifts, upAt(s.r, s.t)) > 0) s.held = false;
      else return { ...s, ...standing(s, t, burning(s) ? s.mass - flow * s.throttle * h : s.mass), t, ticks };
    }
    const before: Dyn = { r: s.r, v: s.v, q: s.q, w: s.w, mass: s.mass };
    const after = rk4(before, s.t, h, s);
    const was = heightOf(foot(s, before), s.t);
    const now = heightOf(foot(s, after), t);
    const up = upOver(now, t);
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
      const plumb = upOver(here, at);
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
    if (limits && !s.shed.booster) {
      const loads = bending(after, t);
      const next = strain(s.strain, (loads.q * loads.alpha) / limits.qAlpha.value, h);
      s.strain = next.strain;
      if (next.fails) {
        // It breaks at its joint: the booster goes its own way, engine out. A spacecraft with its escape rocket still aboard is
        // pulled clear by it, taken as fired by the break itself (what the abort system watched is not in anything read).
        s.broke = { t, load: next.strain.load, q: loads.q, alpha: loads.alpha / DEG, joint: limits.joint };
        s = rocket && !s.shed.tower && s.abortAt === null ? pullOff(s) : leave(s, 0);
        s.cutoff = true;
      }
    }
    if (s.rcs.firing !== QUIET) {
      const left = s.rcs.left.slice();
      s.rcs.firing.forEach((f, i) => {
        left[supplyOf[i]!]! -= f * burnOf[i]! * h;
      });
      s.rcs = { left, firing: s.rcs.firing };
    }
    // an abort's own sequence: the rocket out and the climb over, the tower goes
    const automatic = s.controls.automatic !== false;
    if (automatic && s.abortAt !== null && !s.shed.tower && falling && t >= s.abortAt + escapeOver) s = dropTower(s);
    if (s.shed.booster && s.shed.tower && falling) {
      // what happens at a height, coming down (fly.ts), where the spacecraft's own sequence is left to do it
      if (automatic && s.drogueAt === null && s.mainAt === null && now.height <= tr.drogue.altitude.value) s = drogue(s);
      if (automatic && s.drogueAt !== null && s.mainAt === null && now.height <= tr.main.altitude.value) s = main(s);
      if (s.enteredAt === null && retros(s, t) === 0 && (s.retroAt === null || t > s.retroAt + retroEnd)) {
        if (length(forces(after, t, s).force) / after.mass / G0 >= 0.05) s.enteredAt = t;
      }
    }
    return s;
  };

  const phaseOf = (s: VehicleState): Phase => {
    if (s.landing) return 'landed';
    if (!s.shed.booster) return burning(s) ? 'powered' : 'coast';
    if (!s.shed.tower) return 'escape';
    if (s.mainAt !== null) return 'main';
    if (s.drogueAt !== null) return 'drogue';
    return s.enteredAt !== null ? 'entry' : 'capsule';
  };

  const sample = (s: VehicleState): LiveSample => {
    const d: Dyn = { r: s.r, v: s.v, q: s.q, w: s.w, mass: s.mass };
    const f = forces(d, s.t, s);
    const axis = turn(s.q, X);
    // the spacecraft's own centre of mass, which with its tower on is not the centre of the two
    const centre = s.shed.booster ? sub(s.r, scale(axis, f.props.centre)) : s.r;
    // the point fly.ts flies: the stack's base, and after separation that point as the spacecraft carried it off
    const point = s.separation ? sub(centre, scale(s.separation.axis, capsule.centre.value)) : sub(s.r, scale(axis, f.props.centre));
    const here = ecefToGeodetic(fixed(s.separation ? s.r : point, s.t));
    const up = upOver(here, s.t);
    const climb = (v: Vec3): number => (length(v) > 1e-9 ? Math.asin(clamp(dot(v, up) / length(v))) / DEG : 90);
    return {
      t: s.t,
      phase: phaseOf(s),
      altitude: here.height - seaLevel,
      range: rangeOf(s.separation ? s.r : point, s.t),
      speed: length(s.v),
      groundSpeed: f.airspeed,
      climb: climb(s.v),
      groundClimb: climb(f.wind),
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
      strain: s.shed.booster ? 0 : s.strain.load,
      lateral: s.held ? 0 : loadsOf(unturn(s.q, f.force), s.mass, f.q, 0).lateral,
      burning: [
        ...(burning(s)
          ? [
              {
                name: 'main',
                thrust: tr.engine.thrust.value * s.throttle + (P0 - atmosphere(here.height - seaLevel).pressure) * tr.engine.exitArea.value,
              },
            ]
          : []),
        ...(s.abortAt !== null && !s.shed.tower && escapeThrust(s.t - s.abortAt) > 0
          ? [{ name: 'escape', thrust: escapeThrust(s.t - s.abortAt) }]
          : []),
        ...(s.retroAt === null || s.shed.retropack
          ? []
          : retroOffsets.flatMap((o, i) =>
              s.t >= s.retroAt! + o && s.t < s.retroAt! + o + retroBurn ? [{ name: `retro ${i + 1}`, thrust: tr.retro.thrust.value }] : [],
            )),
      ],
      rcs: s.rcs,
      tanks: tanks && !s.shed.booster ? tanksLeft((s.shed.tower ? towerless : whole).fixed + whole.fluid - s.mass) : null,
    };
  };

  return {
    trajectory: tr,
    site,
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
        if (!s.ignited && s.abortAt === null) {
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
      const surfaces = s.shed.booster ? capsule.surfaces : body.surfaces;
      const slope = surfaces.reduce((sum, a) => sum + a.slope, 0);
      const pressure = surfaces.reduce((sum, a) => sum + a.slope * a.station, 0) / slope;
      const centre = massNow(s, s.mass).centre;
      // the stack flies nose first, and so does the spacecraft with its tower on: stable is the pressure behind (below) the mass; the spacecraft alone flies blunt end first
      return s.shed.booster && s.shed.tower ? pressure - centre : centre - pressure;
    },
  };
}

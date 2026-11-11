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
 *   drag      fly.ts's, against the motion through the air, whatever the attitude.
 *   normal    each `surfaces` entry is pushed against its own sideways motion through the air:
 *             q A slope sin(angle), at its station. Together they are the lift, the weathercock
 *             (or its opposite, if the centre of pressure is ahead of the centre of mass) and the
 *             damping, since a surface far from the centre of mass moves sideways as the body turns.
 *   parachute fly.ts's drag area, but pulling at `capsule.chuteArm`, so the spacecraft hangs.
 *   jets      the spacecraft's attitude jets, as a pure torque about each axis.
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
 */
import type { AeroSurface, Trajectory } from '../types';
import { EARTH_ROTATION_RATE } from '../world/bodies.ts';
import {
  add,
  angleBetween,
  cross,
  DEG,
  dot,
  ecefToGeodetic,
  ecefToInertial,
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
  /** 1 runs the engine: it starts it on the pad, and going back to 0 shuts it down for good. The A-7 does not throttle and cannot be lit again. */
  throttle: 0 | 1;
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
  /** An abort on the escape rocket. Not flown yet: accepted and ignored. */
  abort?: boolean;
}

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
  /** What has left it. */
  shed: { tower: boolean; booster: boolean; retropack: boolean };
  /** The moment the spacecraft left: the stack's centre of mass and axis then, and how the booster went on. */
  separation: null | { t: number; r: Vec3; v: Vec3; axis: Vec3; booster: { r: Vec3; v: Vec3 } };
  /** When the first retrorocket lit. */
  retroAt: number | null;
  /** The parachute now out, as fly.ts has it, and when each came out. */
  chute: { full: number; was: number; at: number; fills: number };
  drogueAt: number | null;
  mainAt: number | null;
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
  /** The centre of mass, where `r` is the point fly.ts flies (see `Vehicle.sample`). */
  centre: Vec3;
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
  const tilted = programme(1e9);
  const downrange0 = unit(sub(tilted, scale(up0, dot(tilted, up0))));
  const left0 = cross(up0, downrange0);
  const q0 = fromAxes(up0, left0, scale(downrange0, -1));

  const radius = body.radius.value;
  const whole = fixedAndFluid(body.parts, NONE);
  const towerless = fixedAndFluid(body.parts, TOWER);
  const towerMass = whole.fixed - towerless.fixed;
  const dryOut = tr.engine.depletion ? tr.liftoffMass.value - flow * tr.engine.depletion.value : whole.fixed;
  const deflection = Math.sin(body.control.deflection.value * DEG);
  const capsule = body.capsule;
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

  const massNow = (s: VehicleState, mass: number): MassProperties => {
    if (s.shed.booster) {
      return { mass, centre: 0, roll: mass * capsule.gyration.roll.value ** 2, across: mass * capsule.gyration.across.value ** 2 };
    }
    const { fixed: dry, fluid } = s.shed.tower ? towerless : whole;
    return massOf(body.parts, radius, fluid > 0 ? (mass - dry) / fluid : 0, s.shed.tower ? TOWER : NONE);
  };
  const burning = (s: VehicleState): boolean => s.ignited && !s.cutoff;
  const retros = (s: VehicleState, at: number): number =>
    s.retroAt === null || s.shed.retropack ? 0 : retroOffsets.filter((o) => at >= s.retroAt! + o && at < s.retroAt! + o + retroBurn).length;

  /** Every force but gravity (N, in the frame) and the torque about the centre of mass (N m, in the body), with what the air is doing. */
  const forces = (d: Dyn, at: number, s: VehicleState) => {
    const props = massNow(s, d.mass);
    const altitude = ecefToGeodetic(fixed(d.r, at)).height - seaLevel;
    const air = atmosphere(altitude);
    const wind = sub(d.v, cross(earth, d.r));
    const airspeed = length(wind);
    const mach = airspeed / air.soundSpeed;
    const q = 0.5 * air.density * airspeed * airspeed;
    const riding = !s.shed.booster;
    let force: Vec3 = [0, 0, 0];
    let torque: Vec3 = [0, 0, 0];
    /** A force given in the body's axes, at a place along the axis from the centre of mass. */
    const push = (f: Vec3, arm: number): void => {
      force = add(force, turn(d.q, f));
      torque = add(torque, cross([arm, 0, 0], f));
    };
    if (airspeed > 0) {
      const area = riding ? tr.area.value * along(tr.ascentDrag, mach) : tr.area.value * along(tr.entryDrag, mach);
      force = add(force, scale(wind, (-q * area) / airspeed));
      const chute = s.chute.was + (s.chute.full - s.chute.was) * clamp((at - s.chute.at) / s.chute.fills, 0, 1);
      if (chute > 0) push(unturn(d.q, scale(wind, (-q * chute) / airspeed)), capsule.chuteArm.value);
      const surfaces: readonly AeroSurface[] = riding ? body.surfaces : capsule.surfaces;
      const through = unturn(d.q, wind);
      for (const surface of surfaces) {
        const arm = surface.station - props.centre;
        // this part of the body's own motion through the air: the whole's, and what the turning adds out here
        const u = add(through, cross(d.w, [arm, 0, 0]));
        const k = -0.5 * air.density * length(u) * tr.area.value * surface.slope;
        push([0, k * u[1], k * u[2]], arm);
      }
    }
    if (burning(s)) {
      const thrust = tr.engine.thrust.value + (P0 - air.pressure) * tr.engine.exitArea.value;
      const c = s.controls;
      const [py, pz] = [-deflection * c.yaw, deflection * c.pitch];
      push([thrust * Math.sqrt(1 - py * py - pz * pz), thrust * py, thrust * pz], body.control.station.value - props.centre);
      torque = add(torque, [thrust * deflection * body.control.rollArm.value * c.roll, 0, 0]);
    }
    if (!riding) {
      const c = s.controls;
      if (s.mainAt === null) {
        torque = add(torque, [capsule.jets.roll.value * c.roll, capsule.jets.pitch.value * c.pitch, capsule.jets.yaw.value * c.yaw]);
      }
      const lit = retros(s, at);
      if (lit > 0) push([lit * tr.retro.thrust.value, 0, 0], 0);
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
      mass: burning(s) ? -flow : 0,
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
      shed: { tower: false, booster: false, retropack: false },
      separation: null,
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
    if (!s.ignited && !s.cutoff && c.throttle === 1) s.ignited = true;
    if (burning(s) && (c.throttle === 0 || s.mass <= dryOut + 1e-6)) s.cutoff = true;
    if (s.held || s.landing) return s;
    const axis = turn(s.q, X);
    if (c.tower && !s.shed.tower && !s.shed.booster) {
      // what is left has its centre of mass further down the axis: `r` goes to it
      const before = massNow(s, s.mass).centre;
      s.shed.tower = true;
      s.mass -= towerMass;
      const moved = massNow(s, s.mass).centre - before;
      s.r = add(s.r, scale(axis, moved));
      s.v = add(s.v, turn(s.q, cross(s.w, [moved, 0, 0])));
    }
    if (c.separate && !s.shed.booster) {
      // the two are pushed apart along the axis; the capsule's share is the booster's part of the whole (fly.ts)
      const share = tr.separation.boosterMass.value / (tr.separation.boosterMass.value + tr.separation.mass.value);
      const speed = tr.separation.speed.value;
      const moved = capsule.centre.value - massNow(s, s.mass).centre;
      s.separation = { t: s.t, r: s.r, v: s.v, axis, booster: { r: s.r, v: sub(s.v, scale(axis, speed * (1 - share))) } };
      s.r = add(s.r, scale(axis, moved));
      s.v = add(add(s.v, turn(s.q, cross(s.w, [moved, 0, 0]))), scale(axis, speed * share));
      s.mass = tr.separation.mass.value;
      s.shed.booster = true;
      s.shed.tower = true;
      if (burning(s)) s.cutoff = true; // the engine stays with the booster
    }
    if (s.shed.booster) {
      if (c.retro && s.retroAt === null && !s.shed.retropack) s.retroAt = s.t;
      if (c.retropack && !s.shed.retropack) {
        s.shed.retropack = true;
        s.mass = tr.retropack.mass.value;
      }
      if (c.drogue && s.drogueAt === null && s.mainAt === null) s = drogue(s);
      if (c.main && s.mainAt === null) s = main(s);
    }
    return s;
  };
  const drogue = (s: VehicleState): VehicleState => ({
    ...s,
    drogueAt: s.t,
    chute: { full: tr.drogue.dragArea.value, was: 0, at: s.t, fills: tr.drogue.fills.value },
  });
  const main = (s: VehicleState): VehicleState => ({
    ...s,
    mainAt: s.t,
    chute: { full: tr.main.dragArea.value, was: s.drogueAt === null ? 0 : tr.drogue.dragArea.value, at: s.t, fills: tr.main.fills.value },
  });

  const tick = (state: VehicleState, controls: Controls | Pilot): VehicleState => {
    if (state.landing) return state;
    let s = command(state, typeof controls === 'function' ? controls(state) : controls);
    if (!s.ignited) return s; // the clock starts with the engine
    const h = TICK;
    const ticks = s.ticks + 1;
    const t = ticks * h;
    if (s.held) {
      // it leaves when what holds it up is more than what holds it down: the Earth's turning helps a little
      const here: Dyn = { r: s.r, v: s.v, q: s.q, w: s.w, mass: s.mass };
      const lifts = add(add(gravity(s.r), scale(forces(here, s.t, s).force, 1 / s.mass)), scale(cross(earth, cross(earth, s.r)), -1));
      if (dot(lifts, unit(s.r)) > 0) s.held = false;
      else return { ...s, ...standing(s, t, burning(s) ? s.mass - flow * h : s.mass), t, ticks };
    }
    const before: Dyn = { r: s.r, v: s.v, q: s.q, w: s.w, mass: s.mass };
    const after = rk4(before, s.t, h, s);
    const was = heightOf(foot(s, before), s.t);
    const now = heightOf(foot(s, after), t);
    const up = unit(after.r);
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
      const plumb = unit(r);
      const vertical = -dot(through, plumb);
      const here = ecefToGeodetic(fixed(r, at));
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
    if (s.shed.booster && falling) {
      // what happens at a height, coming down (fly.ts)
      if (s.drogueAt === null && s.mainAt === null && now.height <= tr.drogue.altitude.value) s = drogue(s);
      if (s.drogueAt !== null && s.mainAt === null && now.height <= tr.main.altitude.value) s = main(s);
      if (s.enteredAt === null && retros(s, t) === 0 && (s.retroAt === null || t > s.retroAt + retroEnd)) {
        if (length(forces(after, t, s).force) / after.mass / G0 >= 0.05) s.enteredAt = t;
      }
    }
    return s;
  };

  const phaseOf = (s: VehicleState): Phase => {
    if (s.landing) return 'landed';
    if (!s.shed.booster) return burning(s) ? 'powered' : 'coast';
    if (s.mainAt !== null) return 'main';
    if (s.drogueAt !== null) return 'drogue';
    return s.enteredAt !== null ? 'entry' : 'capsule';
  };

  const sample = (s: VehicleState): LiveSample => {
    const d: Dyn = { r: s.r, v: s.v, q: s.q, w: s.w, mass: s.mass };
    const f = forces(d, s.t, s);
    const axis = turn(s.q, X);
    // the point fly.ts flies: the stack's base, and after separation that point as the spacecraft carried it off
    const point = s.separation ? sub(s.r, scale(s.separation.axis, capsule.centre.value)) : sub(s.r, scale(axis, f.props.centre));
    const here = ecefToGeodetic(fixed(s.separation ? s.r : point, s.t));
    const up = unit(s.r);
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
      centre: s.r,
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
      let carry = s.carry + Math.max(0, dt);
      while (carry >= TICK && !s.landing) {
        s = tick(s, controls);
        carry -= TICK;
        if (!s.ignited) carry = 0; // nothing to catch up on while it stands unlit
      }
      return s.carry === carry ? s : { ...s, carry: s.landing ? 0 : carry };
    },
    sample,
    mass: (s) => massNow(s, s.mass),
    margin(s) {
      const surfaces = s.shed.booster ? capsule.surfaces : body.surfaces;
      const slope = surfaces.reduce((sum, a) => sum + a.slope, 0);
      const pressure = surfaces.reduce((sum, a) => sum + a.slope * a.station, 0) / slope;
      const centre = massNow(s, s.mass).centre;
      // the stack flies nose first, so stable is the pressure behind (below) the mass; the spacecraft flies blunt end first
      return s.shed.booster ? pressure - centre : centre - pressure;
    },
  };
}

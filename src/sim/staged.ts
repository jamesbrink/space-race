/**
 * The powered ascent of an orbital flight (`Flight.orbital`: orbital.ts), flown: stages burning together and in turn,
 * each dropped when the record says it left, on a stated steering law; then handed to the coast (orbital.ts: flyOrbit)
 * at the spacecraft's separation, so the whole flight is flown from the pad. Nothing here knows which flight it is:
 * every stage, event and figure is the flight's data, and the law is `AscentRecord.guidance`.
 *
 * Forces, in frames.ts's inertial frame of date (as the coast's), on a point that is the vehicle:
 *   gravity  world/orbit.ts's, with J2.
 *   thrust   each stage burning, `count` of them alike: its vacuum thrust less its nozzles' exit area times the air's
 *            pressure, times its throttle (`StageRecord.throttle`, rated where none is given). Flow is the vacuum
 *            thrust over g0 times the vacuum specific impulse, times the throttle: so the engine's propellant flow is
 *            the same in air as out of it, and sea-level thrust and impulse come out as the record has them when the
 *            exit area is the one the two thrusts give (`exitAreaOf`). It burns from `ignition` to `cutoff`, or until
 *            its `usable` propellant is gone if that is sooner (said in `Ascended.stops`). No build-up, no tail-off.
 *   drag     half rho v^2 Cd A against the motion through air that turns with the Earth (no wind: the day's winds
 *            aloft at Tyuratam have not been read), on `ascent.drag`'s areas and curves in turn.
 *   mass     what left the pad, less every stage's propellant burned, less each stage as it separates (what it
 *            weighed fuelled less what it burned: the record's own figures, which do not sum to the liftoff mass
 *            exactly; `Ascended.left` says what that leaves the spacecraft) and each other drop (the fairing).
 *
 * Attitude is prescribed, not flown, as fly.ts's is: the thrust lies along the law's axis (orbital.ts: Guidance). The
 * law's three unknowns are solved here (`steer`) so that the last cutoff comes at the target height, climb and
 * inclination; nothing else is chosen. A stage's own steering (vanes, verniers, the third stage's turbine exhaust) is
 * not modelled: the axis is where the law puts it, at once.
 *
 * Fixed steps of fourth-order Runge-Kutta, `STEP` long, each cut to end on the next event, so one input gives one
 * flight to the last bit.
 */
import type { Curve } from '../types';
import { EARTH, EARTH_ROTATION_RATE } from '../world/bodies.ts';
import {
  add,
  angleBetween,
  cross,
  DEG,
  dot,
  ecefToInertial,
  enuAxes,
  type Geodetic,
  geodeticToEcef,
  inertialToEcef,
  length,
  scale,
  sub,
  unit,
  type Vec3,
} from '../world/frames.ts';
import { elementsOf, period, planeThrough, type State, step, subpoint } from '../world/orbit.ts';
import { greenwichSiderealTime } from '../world/time.ts';
import { atmosphere } from './atmosphere.ts';
import { along, G0, MEAN_RADIUS, P0 } from './fly.ts';
import { flyDown, flyOrbit, type OrbitalFlight, type OrbitFlown, type StageRecord } from './orbital.ts';
import { fromAxes, normalize as normalizeQ, type Quat, turn as turnQ } from './rigid.ts';
import type { LiveSample } from './vehicle.ts';

/** The integration step, s. */
export const STEP = 0.05;

/** What the law solves for: the launch plane's inclination, the pitch-over's angle (both radians), and the tangent's rate of fall, 1/s. */
export interface Solved {
  plane: number;
  kick: number;
  rate: number;
}

/** The flight at one instant of the ascent. */
export interface AscentSample {
  /** Seconds from liftoff. */
  t: number;
  /** Height above the sea, m; over the ground from the pad, m; where it is over, degrees. */
  altitude: number;
  downrange: number;
  latitude: number;
  longitude: number;
  /** Space-fixed speed and speed through the air (which turns with the Earth), m/s; climb in each above the local level (the ellipsoid's), degrees. */
  speed: number;
  groundSpeed: number;
  climb: number;
  groundClimb: number;
  /** What an accelerometer reads, g; dynamic pressure, Pa; Mach number; kg. */
  g: number;
  q: number;
  mach: number;
  mass: number;
  /** Position and velocity in the inertial frame of date, m and m/s; and the thrust's axis there (the vehicle's long axis). */
  r: Vec3;
  v: Vec3;
  axis: Vec3;
  /** Total thrust, N. */
  thrust: number;
}

/** What the ascent gives figures for: the summary's fields, by name, for `AscentCheck` ids. */
export interface AscentSummary {
  /** The greatest dynamic pressure, Pa, and when. */
  maxQ: number;
  maxQAt: number;
  /** What the accelerometer reads a minute up, g; the greatest before the first stage leaves, on the core alone, and on the last stage. */
  minuteG: number;
  firstG: number;
  coreG: number;
  lastG: number;
  /** The orbit at the last cutoff, osculating: heights over the record's reference ball, m; degrees; s. */
  perigee: number;
  apogee: number;
  inclination: number;
  period: number;
  /** At the last cutoff: height over the ball, m; space-fixed speed, m/s; climb above the geocentric level, degrees. */
  cutoffAltitude: number;
  cutoffSpeed: number;
  cutoffClimb: number;
  /** Degrees round the orbit's plane from the pad's place at liftoff to the spacecraft at the last cutoff, and the true anomaly there: what the coast's `injection` estimates. */
  arc: number;
  anomaly: number;
  /** What the spacecraft weighs when it leaves the last stage, by the record's stage figures, kg: against its own published mass. */
  massLeft: number;
  /** When the last stage stopped, seconds from liftoff: its cutoff, or where it is cut on its velocity, the instant it reached it. */
  cutoffAt: number;
}

export interface Ascended {
  samples: AscentSample[];
  /** At each event of the record (`OrbitalFlight.events`) that falls within the ascent, by id: the instant before anything changes. */
  at: Record<string, AscentSample>;
  summary: AscentSummary;
  solved: Solved;
  /** For each stage: when its engine stopped, s (earlier than its cutoff if it ran dry), and the propellant left in each unit then, kg (of `usable`, or of `propellant`). */
  stops: number[];
  left: number[];
  /** The spacecraft's state as it separates, for the coast. */
  separation: { t: number; r: Vec3; v: Vec3 };
  /** The launch plane's pole (the law's thrust lies square to it): the vehicle's left, as it stood on the pad. */
  plane: Vec3;
}

/** The whole flight: ascent flown, then the coast from where it left the spacecraft. */
export interface FlownWhole {
  ascent: Ascended;
  coast: OrbitFlown;
  /** The bodies that come down from the ejection height, where the record has them (orbital.ts: flyDown). */
  down: ReturnType<typeof flyDown> | null;
}

/** One unit's nozzle exit area, m^2: given, or (vacuum less sea-level thrust) over one atmosphere. Nothing for an engine with no sea-level figure. */
export function exitAreaOf(s: StageRecord): number {
  if (s.exitArea) return s.exitArea.value;
  return s.thrust.seaLevel ? (s.thrust.vacuum.value - s.thrust.seaLevel.value) / P0 : 0;
}

/** One unit's rated propellant flow, kg/s. */
export const flowOf = (s: StageRecord): number => s.thrust.vacuum.value / (G0 * s.isp.vacuum.value);

/** The integral of a curve's value (or of 1 with none) from a to b: straight lines between its points, flat beyond its ends. */
export function integral(curve: Curve | undefined, a: number, b: number): number {
  if (b <= a) return 0;
  if (!curve) return b - a;
  const xs = [a, ...curve.points.map((p) => p[0]).filter((x) => x > a && x < b), b];
  let sum = 0;
  for (let i = 1; i < xs.length; i++) sum += ((along(curve, xs[i - 1]!) + along(curve, xs[i]!)) / 2) * (xs[i]! - xs[i - 1]!);
  return sum;
}

/**
 * When each stage burns: its ignition, and when it stops (its cutoff, or when its usable propellant is gone if sooner). A
 * stage cut on its velocity (`StageRecord.velocity`) stops here only when it runs dry: the run finds when it reaches its
 * speed, and that is its stop if it comes first.
 */
export function schedule(o: OrbitalFlight): { from: number; to: number; dry: boolean }[] {
  return o.stages.map((s) => {
    const from = s.ignition.value;
    // (a stage cut on its velocity burns until it is dry at the latest: its load over its flow, at the least throttle there is, past that)
    const cutoff = s.velocity ? from + (10 * (s.usable ?? s.propellant).value) / flowOf(s) : s.cutoff.value;
    const load = (s.usable ?? s.propellant).value;
    const burned = (t: number) => flowOf(s) * integral(s.throttle, from, t);
    if (burned(cutoff) <= load) return { from, to: cutoff, dry: false };
    let [lo, hi] = [from, cutoff];
    for (let k = 0; k < 60; k++) {
      const mid = (lo + hi) / 2;
      if (burned(mid) < load) lo = mid;
      else hi = mid;
    }
    return { from, to: lo, dry: true };
  });
}

/** The event instant a guidance target names. */
const instant = (o: OrbitalFlight, id: string): number => {
  const e = o.events.find((x) => x.id === id);
  if (!e) throw new Error(`no event '${id}' in the record`);
  return e.at.value;
};

/** The spacecraft's separation from the last stage: the last stage's separation time. */
const parting = (o: OrbitalFlight): number => {
  const last = o.stages[o.stages.length - 1]!;
  return (last.separation ?? last.cutoff).value;
};

export type Mode = 'vertical' | 'turn' | 'tangent';

/**
 * The stated steering law (orbital.ts: Guidance) with its unknowns given: where it puts the thrust's axis at a state, in
 * frames.ts's inertial frame of date. What the batch run flies (`ascend`) and what the live vehicle's guidance steers to
 * (sim/stagedlive.ts): one law. `thetaTurn` is the axis's angle above the local level as the tangent takes over.
 */
export function lawOf(o: OrbitalFlight, site: Geodetic, launchJd: number, x: Solved) {
  const g = o.ascent!.guidance;
  const gast0 = greenwichSiderealTime(launchJd);
  const pad = ecefToInertial(geodeticToEcef(site), gast0);
  const up0 = ecefToInertial(enuAxes(site).up, gast0); // the plumb line at liftoff, held by the gyros
  // the launch plane: through the plumb line and the aiming azimuth, where the record gives it; else the one solved for
  const aimed = (() => {
    if (!g.azimuth) return null;
    const { east, north } = enuAxes(site);
    const a = g.azimuth.value * DEG;
    const bearing = ecefToInertial(add(scale(east, Math.sin(a)), scale(north, Math.cos(a))), gast0);
    return unit(cross(up0, bearing));
  })();
  const n = aimed ?? planeThrough(pad, x.plane, o.injection.heading === 'north');
  if (!n) throw new Error(`no plane inclined ${x.plane / DEG} degrees passes over the pad`);
  const upIn = unit(sub(up0, scale(n, dot(n, up0)))); // the same, in the launch plane
  const down0 = unit(cross(n, unit(pad))); // level in the plane, the way it will go
  const tiltOf = (d: Vec3) => Math.atan2(dot(d, down0), dot(d, upIn));
  const tilted = (tilt: number): Vec3 => add(scale(upIn, Math.cos(tilt)), scale(down0, Math.sin(tilt)));
  const tVertical = g.vertical.value;
  const tKicked = tVertical + g.kick.value;
  const tTurn = g.turn.value;
  /** The local level in the plane, and up, at a position. */
  const localAt = (r: Vec3) => {
    const u = unit(sub(r, scale(n, dot(n, r))));
    return { u, h: unit(cross(n, u)) };
  };
  const axisAt = (s: State, t: number, m: Mode, wind: Vec3, thetaTurn: number): Vec3 => {
    if (m === 'vertical') return up0;
    if (m === 'turn') {
      // along the motion through the air, in the plane; leaned past it by the pitch-over while that lasts
      const w = sub(wind, scale(n, dot(n, wind)));
      const along = length(w) > 1e-9 ? tiltOf(w) : 0;
      const lean = t < tKicked ? x.kick * Math.sin((Math.PI * (t - tVertical)) / g.kick.value) ** 2 : 0;
      return tilted(along + lean);
    }
    const { u, h } = localAt(s.r);
    const theta = Math.atan(Math.tan(thetaTurn) - x.rate * (t - tTurn));
    return add(scale(h, Math.cos(theta)), scale(u, Math.sin(theta)));
  };
  /** Which part of the law holds at `t`. */
  const modeAt = (t: number): Mode => (t < tVertical ? 'vertical' : t < tTurn ? 'turn' : 'tangent');
  return { n, pad, up0, down0, localAt, axisAt, modeAt, tVertical, tKicked, tTurn };
}

/** The air at a state (atmosphere.ts, turning with the Earth, no wind): where it is over, its height, the air, the motion through it. */
export function airAt(seaLevel: number, launchJd: number) {
  const gast0 = greenwichSiderealTime(launchJd);
  const spin: Vec3 = [0, 0, EARTH_ROTATION_RATE];
  return (s: State, t: number) => {
    const here = subpoint(s.r, gast0 + EARTH_ROTATION_RATE * t);
    const altitude = here.height - seaLevel;
    const air = atmosphere(altitude);
    const wind = sub(s.v, cross(spin, s.r));
    const airspeed = length(wind);
    return { here, altitude, air, wind, airspeed, mach: airspeed / air.soundSpeed, q: 0.5 * air.density * airspeed * airspeed };
  };
}

/**
 * The stack's engines and drag, as the record has them: one stage's thrust at an instant and a pressure (each `count`
 * alike, vacuum thrust less exit area times the air's pressure, times its throttle), one unit's propellant burned while
 * lit from `from` to `to`, and the drag area for the shape that flies at a record instant `at` (`ascent.drag`'s piece
 * for it) and a Mach number. The batch run and the live vehicle both fly on these.
 */
export function stackOf(o: OrbitalFlight) {
  const a = o.ascent!;
  const flows = o.stages.map(flowOf);
  const areas = o.stages.map(exitAreaOf);
  const throttle = (i: number, t: number) => (o.stages[i]!.throttle ? along(o.stages[i]!.throttle!, t) : 1);
  return {
    flows,
    areas,
    throttle,
    burned: (i: number, from: number, t: number) => flows[i]! * integral(o.stages[i]!.throttle, from, t),
    thrust: (i: number, t: number, pressure: number) =>
      o.stages[i]!.count * throttle(i, t) * (o.stages[i]!.thrust.vacuum.value - pressure * areas[i]!),
    dragArea: (at: number, mach: number) => {
      const drag = a.drag.find((d) => at < d.until.value) ?? a.drag[a.drag.length - 1]!;
      return drag.area.value * along(drag.curve, mach);
    },
  };
}

/**
 * Fly the ascent with the law's unknowns as given. `site` and `launchJd` as flyOrbit's; `every`: how often a sample is
 * kept, s. Ends at the spacecraft's separation from the last stage.
 */
export function ascend(o: OrbitalFlight, site: Geodetic, launchJd: number, seaLevel: number, x: Solved, every = 0.5): Ascended {
  const a = o.ascent;
  if (!a) throw new Error('this orbital record has no `ascent`: only its coast can be flown');
  const g = a.guidance;
  const gast0 = greenwichSiderealTime(launchJd);
  const spin: Vec3 = [0, 0, EARTH_ROTATION_RATE];
  const gastAt = (t: number) => gast0 + EARTH_ROTATION_RATE * t;
  const radius = o.orbit.radius.value;
  const law = lawOf(o, site, launchJd, x);
  const { pad, n } = law;
  const stack = stackOf(o);

  const plan = schedule(o);
  // a stage cut on its velocity: the space-fixed speed its integrator stops it at (the design's, and the error it had)
  const cutAt = o.stages.map((st) => (st.velocity ? st.velocity.speed.value + (st.velocity.over?.value ?? 0) : Infinity));
  const burned = (i: number, t: number) => stack.burned(i, plan[i]!.from, Math.min(t, plan[i]!.to));
  const throttle = stack.throttle;
  const { tVertical, tKicked, tTurn } = law;
  const tEnd = instant(o, g.target.at);
  const tPart = parting(o);
  // a stage cut on its apparent velocity: the instant its integrator reaches its setting, found here from the mass flown
  // (the rocket's own thrust over its mass, summed from its ignition; in vacuum, with nothing else pushing, that is all an
  // accelerometer along the axis senses), before anything is flown. The stage's own thrust in vacuum: it is lit above the air
  const apparentCut = (i: number): number => {
    const st = o.stages[i]!;
    let sum = 0;
    const h = 0.01;
    const massAt = (t: number) => o.liftoffMass.value - droppedBy(t) - o.stages.reduce((m, s, j) => m + s.count * burned(j, t), 0);
    const pushAt = (t: number) => (st.count * throttle(i, t) * st.thrust.vacuum.value) / massAt(t);
    for (let t = plan[i]!.from; t < plan[i]!.to; t += h) {
      const step = ((pushAt(t) + pushAt(t + h)) / 2) * h;
      if (sum + step >= cutAt[i]!) return t + (h * (cutAt[i]! - sum)) / step;
      sum += step;
    }
    return plan[i]!.to;
  };
  const stageSep = o.stages.map((s) => (s.separation ? s.separation.value : Infinity));
  // what has left by an instant: a stage drops its fuelled mass less what it burned; another drop its own
  const droppedBy = (t: number) => {
    let m = 0;
    o.stages.forEach((s, i) => {
      if (stageSep[i]! <= t && i < o.stages.length - 1) m += s.count * (s.mass.value - burned(i, stageSep[i]!));
    });
    for (const d of a.drops) if (d.at.value <= t) m += d.mass.value;
    return m;
  };
  o.stages.forEach((st, i) => {
    if (st.velocity?.apparent) plan[i]!.to = Math.min(plan[i]!.to, apparentCut(i));
  });

  let mode: Mode = 'vertical';
  let thetaTurn = 0; // the thrust's angle above the local level as the tangent law takes over
  const localAt = law.localAt;
  const airOf = airAt(seaLevel, launchJd);
  const axisAt = (s: State, t: number, m: Mode, wind: Vec3): Vec3 => law.axisAt(s, t, m, wind, thetaTurn);
  /** Every force but gravity over the mass, m/s^2, at a state, with the stages burning and what has left fixed for the step. */
  const forces = (s: State, t: number, m: Mode, gone: number) => {
    const air = airOf(s, t);
    let thrust = 0;
    let mass = o.liftoffMass.value - gone;
    o.stages.forEach((st, i) => {
      mass -= st.count * burned(i, t);
      if (t >= plan[i]!.from && t < plan[i]!.to) thrust += stack.thrust(i, t, air.air.pressure);
    });
    const dragArea = stack.dragArea(t, air.mach);
    const axis = axisAt(s, t, m, air.wind);
    let f: Vec3 = scale(axis, thrust);
    if (air.airspeed > 0) f = add(f, scale(air.wind, (-air.q * dragArea) / air.airspeed));
    return { accel: scale(f, 1 / mass), mass, thrust, axis, air };
  };

  const sample = (s: State, t: number): AscentSample => {
    const f = forces(s, t, mode, droppedBy(t - 1e-9));
    const up = ecefToInertial(enuAxes(f.air.here).up, gastAt(t));
    const climb = (d: Vec3) => (length(d) > 1e-9 ? Math.asin(Math.max(-1, Math.min(1, dot(d, up) / length(d)))) / DEG : 90);
    return {
      t,
      altitude: f.air.altitude,
      downrange: angleBetween(inertialToEcef(s.r, gastAt(t)), geodeticToEcef(site)) * MEAN_RADIUS,
      latitude: f.air.here.latitude,
      longitude: f.air.here.longitude,
      speed: length(s.v),
      groundSpeed: f.air.airspeed,
      climb: climb(s.v),
      groundClimb: climb(f.air.wind),
      g: length(f.accel) / G0,
      q: f.air.q,
      mach: f.air.mach,
      mass: f.mass,
      r: s.r,
      v: s.v,
      axis: f.axis,
      thrust: f.thrust,
    };
  };

  const marks = [
    ...new Set([
      tVertical,
      tKicked,
      tTurn,
      tEnd,
      tPart,
      60,
      ...plan.flatMap((p) => [p.from, p.to]),
      ...stageSep.filter(Number.isFinite),
      ...a.drops.map((d) => d.at.value),
      ...o.events.map((e) => e.at.value),
    ]),
  ]
    .filter((m) => m > 0 && m <= tPart)
    .sort((p, q) => p - q);

  let t = 0;
  let state: State = { r: pad, v: cross(spin, pad) };
  const samples: AscentSample[] = [sample(state, 0)];
  const at: Record<string, AscentSample> = {};
  const summary: AscentSummary = {
    maxQ: 0,
    maxQAt: 0,
    minuteG: Number.NaN,
    firstG: 0,
    coreG: 0,
    lastG: 0,
    perigee: Number.NaN,
    apogee: Number.NaN,
    inclination: Number.NaN,
    period: Number.NaN,
    cutoffAltitude: Number.NaN,
    cutoffSpeed: Number.NaN,
    cutoffClimb: Number.NaN,
    arc: Number.NaN,
    anomaly: Number.NaN,
    massLeft: Number.NaN,
    cutoffAt: Number.NaN,
  };
  // which stage's burn bounds each of the three loads read: the first stage's separation, the next stage's stop, the last's
  const firstOff = Math.min(...stageSep);
  const coreOff = plan.length > 1 ? plan[1]!.to : firstOff;
  let kept = 0;

  while (t < tPart - 1e-9) {
    const mark = marks.find((m) => m > t + 1e-9) ?? tPart;
    const h = Math.min(STEP, mark - t);
    const gone = droppedBy(t);
    const m = mode;
    const [before, t0] = [state, t];
    state = step(state, t, h, (s, tt) => forces(s, tt, m, gone).accel);
    t = Math.abs(t + h - mark) < 1e-9 ? mark : t + h;
    // a stage cut on its velocity, when it reaches it in this step: the step is flown again to the instant it does, found by
    // the secant on the step's length (so the instant is a smooth function of the inputs, as the law's solution needs)
    const crossing = o.stages.findIndex(
      (st, i) => st.velocity && !st.velocity.apparent && t > plan[i]!.from && t <= plan[i]!.to && length(state.v) >= cutAt[i]!,
    );
    if (crossing >= 0 && length(before.v) < cutAt[crossing]!) {
      const want = cutAt[crossing]!;
      const at = (k: number) => length(step(before, t0, h * k, (q, tt) => forces(q, tt, m, gone).accel).v) - want;
      let [k0, f0, k1, f1] = [0, length(before.v) - want, 1, length(state.v) - want];
      for (let n = 0; n < 8 && Math.abs(f1) > 1e-9; n++) {
        const k2 = Math.min(1, Math.max(0, k1 - (f1 * (k1 - k0)) / (f1 - f0)));
        [k0, f0, k1, f1] = [k1, f1, k2, at(k2)];
      }
      state = step(before, t0, h * k1, (q, tt) => forces(q, tt, m, gone).accel);
      t = t0 + h * k1;
      plan[crossing]!.to = t;
    }
    const s = sample(state, t);
    // the loads, as they stand before whatever happens at this instant
    if (s.q > summary.maxQ) [summary.maxQ, summary.maxQAt] = [s.q, t];
    if (t <= firstOff) summary.firstG = Math.max(summary.firstG, s.g);
    else if (t <= coreOff) summary.coreG = Math.max(summary.coreG, s.g);
    else if (t <= plan[plan.length - 1]!.to) summary.lastG = Math.max(summary.lastG, s.g);
    if (t === 60) summary.minuteG = s.g;
    for (const e of o.events) if (e.at.value === t) at[e.id] = s;
    if (t === plan[plan.length - 1]!.to) {
      const el = elementsOf(state.r, state.v);
      summary.cutoffAt = t;
      summary.perigee = el.a * (1 - el.e) - radius;
      summary.apogee = el.a * (1 + el.e) - radius;
      summary.inclination = el.i / DEG;
      summary.period = period(el.a);
      summary.cutoffAltitude = length(state.r) - radius;
      summary.cutoffSpeed = length(state.v);
      summary.cutoffClimb = Math.asin(dot(unit(state.r), unit(state.v))) / DEG;
      summary.arc = angleBetween(pad, state.r) / DEG;
      summary.anomaly = el.nu / DEG;
    }
    // the law's own changes, at the end of a step
    if (mode === 'vertical' && t >= tVertical) mode = 'turn';
    if (mode === 'turn' && t >= tTurn) {
      const f = forces(state, t, mode, droppedBy(t));
      const { u } = localAt(state.r);
      thetaTurn = Math.asin(Math.max(-1, Math.min(1, dot(f.axis, u))));
      mode = 'tangent';
    }
    if (t - kept >= every - 1e-9 || marks.includes(t)) {
      samples.push(s);
      kept = t;
    }
  }
  // (`burned` is one unit's: a stage's count multiplies it)
  // (and the last stage, as it lets the spacecraft go, takes what it weighed fuelled less what it burned)
  const last = o.stages.length - 1;
  const lastLeft = o.stages[last]!.count * (o.stages[last]!.mass.value - burned(last, tPart));
  summary.massLeft =
    o.liftoffMass.value - droppedBy(tPart - 1e-9) - o.stages.reduce((sum, st, i) => sum + st.count * burned(i, tPart), 0) - lastLeft;
  return {
    samples,
    at,
    summary,
    solved: x,
    stops: plan.map((p) => p.to),
    left: o.stages.map((s, i) => (s.usable ?? s.propellant).value - burned(i, plan[i]!.to)),
    separation: { t: tPart, r: state.r, v: state.v },
    plane: n,
  };
}

/**
 * Solve the law's three unknowns so that the last cutoff comes at the target's height over the reference ball, its
 * climb and its inclination: Newton's method on finite differences, from a start that is the target's inclination, a
 * pitch-over of eight degrees and a tangent falling a thousandth a second. Throws if it does not converge:
 * a law that cannot reach its target is a finding, not something to paper over.
 */
export function steer(o: OrbitalFlight, site: Geodetic, launchJd: number, seaLevel = 0): Solved {
  const g = o.ascent!.guidance;
  const want = [o.orbit.radius.value + g.target.altitude.value, g.target.climb.value * DEG, g.target.inclination.value * DEG];
  if (g.azimuth) return steer2(o, site, launchJd, seaLevel, want);
  const miss = (x: Solved): number[] => {
    const s = ascend(o, site, launchJd, seaLevel, x, Infinity).summary;
    return [(s.cutoffAltitude + o.orbit.radius.value - want[0]!) / 10_000, s.cutoffClimb * DEG - want[1]!, s.inclination * DEG - want[2]!];
  };
  const vec = (x: Solved) => [x.plane, x.kick, x.rate];
  const of = (v: number[]): Solved => ({ plane: v[0]!, kick: v[1]!, rate: v[2]! });
  let x: Solved = { plane: want[2]!, kick: 8 * DEG, rate: 1e-3 };
  const eps = [1e-6, 1e-6, 1e-9];
  for (let k = 0; k < 30; k++) {
    const f = miss(x);
    if (Math.hypot(...f) < 1e-8) return x;
    const v = vec(x);
    const J = v.map((_, j) => {
      const w = [...v];
      w[j]! += eps[j]!;
      const fj = miss(of(w));
      return fj.map((y, i) => (y - f[i]!) / eps[j]!);
    }); // J[j][i] = d f_i / d x_j
    const d = solve3(
      [0, 1, 2].map((i) => [0, 1, 2].map((j) => J[j]![i]!)),
      f.map((y) => -y),
    );
    // a damped step: never more than two degrees of pitch-over or plane at once
    const most = Math.max(Math.abs(d[0]!) / (2 * DEG), Math.abs(d[1]!) / (2 * DEG), 1);
    x = of(v.map((y, i) => y + d[i]! / most));
  }
  throw new Error('the ascent’s steering law did not reach its target');
}

/** The law with its plane given by the aiming azimuth: two unknowns, the pitch-over and the tangent's rate, for height and climb. */
function steer2(o: OrbitalFlight, site: Geodetic, launchJd: number, seaLevel: number, want: number[]): Solved {
  const miss = (v: number[]): number[] => {
    const s = ascend(o, site, launchJd, seaLevel, { plane: Number.NaN, kick: v[0]!, rate: v[1]! }, Infinity).summary;
    return [(s.cutoffAltitude + o.orbit.radius.value - want[0]!) / 10_000, s.cutoffClimb * DEG - want[1]!];
  };
  let v = [8 * DEG, 1e-3];
  const eps = [1e-6, 1e-9];
  for (let k = 0; k < 30; k++) {
    const f = miss(v);
    if (Math.hypot(...f) < 1e-8) return { plane: Number.NaN, kick: v[0]!, rate: v[1]! };
    const J = [0, 1].map((j) => {
      const w = [...v];
      w[j]! += eps[j]!;
      return miss(w).map((y, i) => (y - f[i]!) / eps[j]!);
    }); // J[j][i] = d f_i / d x_j
    const det = J[0]![0]! * J[1]![1]! - J[1]![0]! * J[0]![1]!;
    const d = [(-f[0]! * J[1]![1]! + f[1]! * J[1]![0]!) / det, (-f[1]! * J[0]![0]! + f[0]! * J[0]![1]!) / det];
    const most = Math.max(Math.abs(d[0]!) / (2 * DEG), 1);
    v = v.map((y, i) => y + d[i]! / most);
  }
  throw new Error('the ascent’s steering law did not reach its target');
}

/** Cramer's rule for three equations. */
function solve3(A: number[][], b: number[]): number[] {
  const det = (m: number[][]) =>
    m[0]![0]! * (m[1]![1]! * m[2]![2]! - m[1]![2]! * m[2]![1]!) -
    m[0]![1]! * (m[1]![0]! * m[2]![2]! - m[1]![2]! * m[2]![0]!) +
    m[0]![2]! * (m[1]![0]! * m[2]![1]! - m[1]![1]! * m[2]![0]!);
  const D = det(A);
  return [0, 1, 2].map((j) => det(A.map((row, i) => row.map((y, k) => (k === j ? b[i]! : y)))) / D);
}

/** Fly the whole flight: the ascent on its solved law, then the coast from the spacecraft's separation (orbital.ts: flyOrbit). */
export function flyWhole(
  o: OrbitalFlight,
  site: Geodetic,
  launchJd: number,
  seaLevel = 0,
  solved?: Solved,
  every = 10,
  handover: 'flown' | 'published' = 'flown',
): FlownWhole {
  const x = solved ?? steer(o, site, launchJd, seaLevel);
  const ascent = ascend(o, site, launchJd, seaLevel, x);
  const coast = flyOrbit(
    o,
    site,
    launchJd,
    seaLevel,
    every,
    handover === 'published' ? published(o, ascent.separation) : ascent.separation,
  );
  const end = coast.samples[coast.samples.length - 1]!;
  const down = o.descent && end.phase === 'down' ? flyDown(o, launchJd, seaLevel, end) : null;
  return { ascent, coast, down };
}

/**
 * The spacecraft where the ascent flown left it, moving as fast as the published orbit has it there (vis-viva on its
 * semi-major axis, over the record's reference ball) along the way the ascent flown left it going. For a flight whose
 * ascent as flown does not reach the published orbit: the coast and what follows are then the record's orbit's, begun from
 * the place and instant the ascent gives instead of the estimated `injection`. What the scene and the deck show
 * (viewer/ascent.ts `orbitalFlown`), and the run the coast's and the descent's checks are held to (tests/staged.test.mjs).
 */
export function published(o: OrbitalFlight, at: { t: number; r: Vec3; v: Vec3 }): { t: number; r: Vec3; v: Vec3 } {
  const a = o.orbit.radius.value + (o.orbit.perigee.value + o.orbit.apogee.value) / 2;
  const speed = Math.sqrt(EARTH.gm.value * (2 / length(at.r) - 1 / a));
  return { t: at.t, r: at.r, v: scale(unit(at.v), speed) };
}

/**
 * The whole flight as samples the scene can show (viewer/ascent.ts places a run's samples by their own attitude): in
 * fly.ts's frame that does not turn (Greenwich on +X at liftoff, where frames.ts's inertial frame of date has it at the
 * sidereal time of liftoff), every `LiveSample` field filled. `centre` is the spacecraft's centre of mass, metres up the
 * stack from the base, which is the point the ascent flies; from the spacecraft's separation the coast's point is that
 * centre (carried on by the offset it had then, so nothing jumps). After the ejection height, the first of the
 * descent's bodies (`DescentRecord.bodies`) is the one followed.
 *
 * How it lies is the law's going up: the long axis (+X) along the thrust, +Y the launch plane's pole (its left, as it
 * stood on the pad), +Z back up range. After separation the record's attitudes are drawn, not flown: held as at
 * separation; turned over a minute to push along the braking burn's line from the solar orientation (the `orientation`
 * event) to the burn's end; held again; and from the modules' separation turned over half a minute to lie along its
 * motion through the air. The tumbles of the record (2 to 3 deg/s before orientation, 6 or 30 after the burn) are not.
 */
export function recordSamples(
  o: OrbitalFlight,
  whole: FlownWhole,
  launchJd: number,
  centre: number,
  sunAt: (t: number) => Vec3,
): LiveSample[] {
  const gast0 = greenwichSiderealTime(launchJd);
  const [c, s0] = [Math.cos(-gast0), Math.sin(-gast0)];
  const flat = (v: Vec3): Vec3 => [c * v[0] - s0 * v[1], s0 * v[0] + c * v[1], v[2]];
  const spin: Vec3 = [0, 0, EARTH_ROTATION_RATE];
  const n = whole.ascent.plane;
  const lie = (x: Vec3): Quat => {
    const y = unit(sub(n, scale(x, dot(n, x))));
    return fromAxes(flat(x), flat(y), flat(cross(x, y)));
  };
  const blank = {
    chute: { full: 0, was: 0, at: 0, fills: 1 },
    rates: [0, 0, 0] as Vec3,
    rcs: { left: [], firing: [] },
    tanks: null,
    strain: 0,
    lateral: 0,
  };
  const pad = whole.ascent.samples[0]!.r;
  const out: LiveSample[] = [];
  for (const s of whole.ascent.samples) {
    const axis = flat(s.axis);
    out.push({
      ...blank,
      t: s.t,
      phase: s.thrust > 0 ? 'powered' : 'coast',
      altitude: s.altitude,
      range: s.downrange,
      speed: s.speed,
      groundSpeed: s.groundSpeed,
      climb: s.climb,
      groundClimb: s.groundClimb,
      g: s.g,
      q: s.q,
      mach: s.mach,
      mass: s.mass,
      latitude: s.latitude,
      longitude: s.longitude,
      r: flat(s.r),
      v: flat(s.v),
      axis,
      attitude: lie(s.axis),
      alpha: angleBetween(s.axis, sub(s.v, cross(spin, s.r))) / DEG,
      burning: s.thrust > 0 ? [{ name: 'main', thrust: s.thrust }] : [],
      centre: add(flat(s.r), scale(axis, centre)),
    });
  }
  const parted = out[out.length - 1]!;
  const offset = sub(parted.centre, parted.r); // (in fly.ts's frame: the coast flies the point the ascent left, drawn as the centre of mass)
  const held = parted.attitude;
  const oriented = o.events.find((e) => e.id === 'orientation')?.at.value ?? o.retro.on.value - 60;
  const burnAt = whole.coast.samples.find((x) => x.t >= o.retro.on.value) ?? whole.coast.samples[0]!;
  const aimed = lie(scale(o.retro.aim.along === 'sun' ? unit(sub(sunAt(o.retro.on.value), burnAt.r)) : unit(burnAt.v), o.retro.aim.sense));
  const parts = o.entry.separation.value;
  const toward = (from: Quat, to: Quat, k: number): Quat => {
    const sign = from[0] * to[0] + from[1] * to[1] + from[2] * to[2] + from[3] * to[3] < 0 ? -1 : 1;
    return normalizeQ([0, 1, 2, 3].map((i) => from[i]! + (sign * to[i]! - from[i]!) * k) as unknown as Quat);
  };
  const descent = whole.down ? (Object.values(whole.down.tracks)[0] ?? []).slice(1) : [];
  const ending = [
    ...whole.coast.samples
      .filter((s) => s.t > parted.t)
      .map((s) => ({ t: s.t, r: s.r, v: s.v, g: s.g, q: s.q, mach: s.mach, down: false, entering: s.phase === 'entry' })),
    ...descent.map((s) => ({ t: s.t, r: s.r, v: s.v, g: 1, q: 0, mach: 0, down: true, entering: false })),
  ];
  for (const s of ending) {
    const wind = sub(s.v, cross(spin, s.r));
    let q: Quat;
    if (s.t < oriented) q = held;
    else if (s.t <= o.retro.off.value) q = toward(held, aimed, Math.min(1, (s.t - oriented) / 60));
    else if (s.t < parts) q = aimed;
    else q = toward(aimed, length(wind) > 1 ? lie(scale(unit(wind), -1)) : aimed, Math.min(1, (s.t - parts) / 30));
    const axis = turnQ(q, [1, 0, 0]);
    const gast = gast0 + EARTH_ROTATION_RATE * s.t;
    const here = subpoint(s.r, gast);
    const at = add(flat(s.r), offset);
    out.push({
      ...blank,
      t: s.t,
      phase: s.down ? 'main' : s.entering ? 'entry' : 'capsule',
      altitude: here.height,
      range: angleBetween(inertialToEcef(s.r, gast), inertialToEcef(pad, gast0)) * MEAN_RADIUS,
      speed: length(s.v),
      groundSpeed: length(wind),
      climb: 0,
      groundClimb: 0,
      g: s.g,
      q: s.q,
      mach: s.mach,
      mass: s.t >= parts ? o.entry.mass.value : o.mass.value,
      latitude: here.latitude,
      longitude: here.longitude,
      r: sub(at, scale(axis, centre)),
      v: flat(s.v),
      axis,
      attitude: q,
      alpha: 0,
      burning: s.t >= o.retro.on.value && s.t < o.retro.off.value ? [{ name: 'retro', thrust: 0 }] : [],
      centre: at,
    });
  }
  return out;
}

/**
 * The record with the braking burn made by hand (`OrbitalFlight.manual`): lit at `t`, pushing along `aim` (a unit vector in
 * frames.ts's inertial frame of date) for as long as the engine takes to give its integrator's impulse, and the modules
 * parting `manual.parting` after. What the flight deck flies from a hand's burn (orbitdeck.ts); the rest is the record's.
 */
export function byHand(o: OrbitalFlight, t: number, aim: Vec3): OrbitalFlight {
  const m = o.manual;
  if (!m) throw new Error('this record says nothing of what a hand could do');
  const burn = (o.mass.value * m.deltaV.value) / m.thrust.value;
  const plan = structuredClone(o);
  plan.retro.on.value = t;
  plan.retro.off.value = t + burn;
  plan.retro.deltaV.value = m.deltaV.value;
  plan.retro.aim = { ...plan.retro.aim, along: 'fixed', sense: 1, vector: aim };
  plan.entry.separation.value = t + burn + m.parting.value;
  return plan;
}

/** A check of an orbital flight's, with what the run gave for it: the ascent's, the coast's and the descent's in turn. */
export interface Held {
  id: string;
  label: string;
  value: number;
  unit: string;
  tolerance: number;
  got: number;
}

/** Every check an orbital record sets, against a whole flight flown (`flyWhole`): for the Flown panel and the debrief. */
export function held(o: OrbitalFlight, whole: FlownWhole): Held[] {
  const ascent = (id: string): number => {
    const [event, field] = id.split('.');
    if (!field) return (whole.ascent.summary as unknown as Record<string, number>)[id] ?? Number.NaN;
    return (whole.ascent.at[event!] as unknown as Record<string, number> | undefined)?.[field] ?? Number.NaN;
  };
  const down = (id: string): number => {
    if (id === 'apart') return whole.down?.apart ?? Number.NaN;
    const [body, field] = id.split('.');
    return (whole.down?.landed[body!] as unknown as Record<string, number> | undefined)?.[field!] ?? Number.NaN;
  };
  const of = (c: { id: string; label: string; value: number; unit: string; tolerance: number }, got: number): Held => ({
    id: c.id,
    label: c.label,
    value: c.value,
    unit: c.unit,
    tolerance: c.tolerance,
    got,
  });
  return [
    ...(o.ascent?.checks ?? []).map((c) => of(c, ascent(c.id))),
    ...o.checks.map((c) => of(c, whole.coast.results[c.id])),
    ...(o.descent?.checks ?? []).map((c) => of(c, down(c.id))),
  ];
}

/**
 * The engines lit at liftoff as one, for what the ear and the eye are given of them (viewer/effects.ts, sound/): their
 * summed sea-level thrust, N; the exhaust speed of that thrust over their summed flow, m/s; and their summed exit area, m^2.
 */
export function liftoffEngine(o: OrbitalFlight): { thrust: number; exhaustSpeed: number; exitArea: number } {
  const lit = o.stages.filter((s) => s.ignition.value <= 0 && s.thrust.seaLevel);
  const thrust = lit.reduce((sum, s) => sum + s.count * s.thrust.seaLevel!.value, 0);
  const flow = lit.reduce((sum, s) => sum + s.count * flowOf(s), 0);
  return { thrust, exhaustSpeed: flow > 0 ? thrust / flow : 0, exitArea: lit.reduce((sum, s) => sum + s.count * exitAreaOf(s), 0) };
}

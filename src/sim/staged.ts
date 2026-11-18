/**
 * The powered ascent of an orbital flight (its plan's stages and steering law), flown: stages burning together and in turn,
 * each dropped when the record says it left, on a stated steering law; then handed to the coast (orbital.ts: flyOrbit)
 * at the spacecraft's separation, so the whole flight is flown from the pad. Nothing here knows which flight it is:
 * every stage, event and figure is the flight's plan, and the law is its attitude held by a stated law (`{ law }`).
 *
 * Forces, in the flight's frame (world/earthframe.ts: of date, as the coast's), on a point that is the vehicle:
 *   gravity  world/orbit.ts's, with J2.
 *   thrust   each stage burning, `count` of them alike: its throttle (its engine's `throttle.curve`, rated where none is
 *            given) of its vacuum thrust, less its nozzles' exit area times the air's pressure (sim/thrust.ts). Flow is the vacuum
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
import type { Curve } from '../types.ts';
import { G0, P0 } from '../world/bodies.ts';
import type { EarthFrame } from '../world/earthframe.ts';
import {
  add,
  angleBetween,
  cross,
  DEG,
  dot,
  enuAxes,
  type Geodetic,
  geodeticToEcef,
  length,
  scale,
  sub,
  unit,
  type Vec3,
} from '../world/frames.ts';
import { alongPublished } from '../world/meanelements.ts';
import { elementsOf, period, planeThrough, type State, step } from '../world/orbit.ts';
import { type AirHere, airAt, airDrag, type Sky, STANDARD, skyOf } from './air.ts';
import { integrate, sensed } from './apparent.ts';
import { downOf } from './descent.ts';
import { ALONE, along, MEAN_RADIUS, RIDING } from './fly.ts';
import { ENTRY_G } from './loads.ts';
import {
  aimFor,
  aimOf,
  bankAt,
  type CoastContacts,
  chuteEvent,
  coastEngineState,
  coastEvents,
  type DescentFlown,
  type DescentHands,
  flyDown,
  flyOrbit,
  type Guidance,
  heightsBall,
  heightsBallAt,
  liftOf,
  movesOf,
  type OrbitFlown,
  publishedOf,
  shipOf,
  trackedState,
  trackingArc,
} from './orbital.ts';
import { type Action, type BodyDef, clockAt, type EngineDef, type EventDef, eventOf, type FlightPlan, type TankDef } from './plan.ts';
import { aboutAxis, fromAxes, multiply, normalize as normalizeQ, type Quat, turn as turnQ } from './rigid.ts';
import { nozzleThrust } from './thrust.ts';
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
  /** Position and velocity in the flight's frame, m and m/s; and the thrust's axis there (the vehicle's long axis). */
  r: Vec3;
  v: Vec3;
  axis: Vec3;
  /** Total thrust, N. */
  thrust: number;
}

/**
 * The ascent's summary at the last cutoff, from the state there: the osculating orbit over the record's reference ball,
 * the height, speed and climb, and how far round from the pad's place at liftoff (`pad`, in the same frame). One for the
 * batch run (`ascend`) and the live vehicle (stagedlive.ts `StagedTally`).
 */
export function atCutoff(
  plan: FlightPlan,
  t: number,
  s: { r: Vec3; v: Vec3 },
  pad: Vec3,
): Pick<
  AscentSummary,
  'cutoffAt' | 'perigee' | 'apogee' | 'inclination' | 'period' | 'cutoffAltitude' | 'cutoffSpeed' | 'cutoffClimb' | 'arc' | 'anomaly'
> {
  const radius = heightsBallAt(plan, pad);
  const el = elementsOf(s.r, s.v);
  return {
    cutoffAt: t,
    perigee: el.a * (1 - el.e) - radius,
    apogee: el.a * (1 + el.e) - radius,
    inclination: el.i / DEG,
    period: period(el.a),
    cutoffAltitude: length(s.r) - radius,
    cutoffSpeed: length(s.v),
    cutoffClimb: Math.asin(dot(unit(s.r), unit(s.v))) / DEG,
    arc: angleBetween(pad, s.r) / DEG,
    anomaly: el.nu / DEG,
  };
}

/** What the ascent gives figures for: the summary's fields, by name, for the ascent's check ids. */
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
  /** At each of the record's instants (`sequenceOf(plan).instants`) that falls within the ascent, by id: the instant before anything changes. */
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
  /** The thrust's angle above the local level as the tangent law took over (`Guidance`), radians: what the law flies from there. */
  thetaTurn: number;
}

/** The whole flight: ascent flown, then the coast from where it left the spacecraft. */
export interface FlownWhole {
  ascent: Ascended;
  coast: OrbitFlown;
  /** The bodies that come down from the ejection height, where the record has them (orbital.ts: flyDown). */
  down: ReturnType<typeof flyDown> | null;
}

/** One unit's nozzle exit area, m^2: given, or (vacuum less sea-level thrust) over one atmosphere. Nothing for an engine with no sea-level figure. */
export function exitAreaOf(e: Pick<EngineDef, 'exitArea' | 'thrust'>): number {
  if (e.exitArea) return e.exitArea.value;
  return e.thrust.seaLevel ? (e.thrust.vacuum.value - e.thrust.seaLevel.value) / P0 : 0;
}

/** One unit's rated propellant flow, kg/s. */
export const flowOf = (e: Pick<EngineDef, 'thrust' | 'isp'>): number => e.thrust.vacuum.value / (G0 * e.isp!.vacuum.value);

/**
 * A stage of an orbital plan: an engine that draws on a tank, with the body it is on and its tank, in the plan's order,
 * base first. Every figure is one unit's, and `count` of them are alike. A tank can be drawn on by several stages (an
 * Atlas's booster engines and its sustainer, both fed from the one tank, the boosters on a section that is dropped
 * with them): `shares` names them, and the tank is on its own body (`holder`), which need not be the stage's.
 */
export interface Stage {
  engine: EngineDef;
  body: BodyDef;
  tank: TankDef;
  count: number;
  /** What one unit's engine can burn, kg: its tank's usable load, or the whole of it (one unit of the tank's body's). */
  load: number;
  /** Its throttle setting against seconds from liftoff, where the record gives one. */
  throttle?: Curve;
  /** The stages that draw on its tank, itself among them, by index: `[i]` for a tank of its own. */
  shares: number[];
  /** The body its tank is on, and how many units of it there are. */
  holder: { id: string; count: number };
}
const stagesCache = new WeakMap<FlightPlan, Stage[]>();
/** An orbital plan's stages, base first. */
export function stagesOf(plan: FlightPlan): Stage[] {
  let out = stagesCache.get(plan);
  if (out) return out;
  const c = plan.craft[0]!;
  const tanked = c.engines.filter((e) => e.tanks.length && !e.flown);
  out = tanked.map((engine) => {
    const tank = c.tanks.find((t) => t.id === engine.tanks[0])!;
    const holder = c.bodies.find((b) => b.id === tank.body)!;
    return {
      engine,
      body: c.bodies.find((b) => b.id === engine.body)!,
      tank,
      count: engine.count,
      load: (tank.usable ?? tank.load).value,
      ...(engine.throttle?.curve ? { throttle: engine.throttle.curve } : {}),
      shares: tanked.flatMap((e, j) => (e.tanks[0] === tank.id ? [j] : [])),
      holder: { id: holder.id, count: holder.count },
    };
  });
  stagesCache.set(plan, out);
  return out;
}

/**
 * What has been drawn from the tanks a body carries by one unit of it, kg: each stage that draws on them, at its share
 * (its chambers over the body's units) of what one unit of it burned (`burned(j)`). For a stage's own tank, drawn by it
 * alone, this is that stage's own burned propellant to the bit (its share is one).
 */
export function drawnFrom(stages: readonly Stage[], body: string, burned: (j: number) => number): number {
  let sum = 0;
  stages.forEach((s, j) => {
    if (s.holder.id === body) sum += (s.count / s.holder.count) * burned(j);
  });
  return sum;
}

/** The steering law an orbital plan's ascent is flown on: the attitude held by a stated law. */
export function guidanceOf(plan: FlightPlan): Guidance {
  for (const a of plan.attitude) if ('law' in a.hold) return a.hold.law;
  throw new Error('this plan has no steering law: its ascent cannot be flown');
}

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
 * stage cut on its velocity (a `speed` trigger) stops here only when it runs dry: the run finds when it reaches its
 * speed, and that is its stop if it comes first.
 */
export function schedule(plan: FlightPlan, seq = sequenceOf(plan)): { from: number; to: number; dry: boolean }[] {
  const stages = stagesOf(plan);
  // (a stage cut on its velocity burns until it is dry at the latest: its load over its flow, at the least throttle there
  // is, past that; one with no cut of its own is shut down as it is let go)
  const cutoffOf = (i: number) => {
    const k = seq.stages[i]!;
    return k.speed ? k.from + (10 * stages[i]!.load) / flowOf(stages[i]!.engine) : (k.cut ?? k.sep);
  };
  /** When a tank several stages draw on is empty, each burning from its lighting to its own cut: Infinity if it never is. */
  const sharedDry = (shares: number[]): number => {
    const holder = stages[shares[0]!]!.holder;
    const load = stages[shares[0]!]!.load * holder.count;
    const drawn = (t: number) =>
      shares.reduce((sum, j) => {
        const from = seq.stages[j]!.from;
        return sum + stages[j]!.count * flowOf(stages[j]!.engine) * integral(stages[j]!.throttle, from, Math.min(t, cutoffOf(j)));
      }, 0);
    const from = Math.min(...shares.map((j) => seq.stages[j]!.from));
    const hi = Math.max(...shares.map((j) => cutoffOf(j)));
    return drawn(hi) <= load ? Infinity : spentAt(drawn, load, from, hi);
  };
  return stages.map((s, i) => {
    const k = seq.stages[i]!;
    const from = k.from;
    const cutoff = cutoffOf(i);
    if (s.shares.length > 1) {
      const dry = sharedDry(s.shares);
      return dry < cutoff ? { from, to: Math.max(from, dry), dry: true } : { from, to: cutoff, dry: false };
    }
    const load = s.load;
    const burned = (t: number) => flowOf(s.engine) * integral(s.throttle, from, t);
    if (burned(cutoff) <= load) return { from, to: cutoff, dry: false };
    return { from, to: spentAt(burned, load, from, cutoff), dry: true };
  });
}

/** When `burned` (rising with time) reaches `load`, between `from` and `hi`, by bisection to the last bit. */
export function spentAt(burned: (t: number) => number, load: number, from: number, hi: number): number {
  let lo = from;
  let top = hi;
  for (let k = 0; k < 60; k++) {
    const mid = (lo + top) / 2;
    if (burned(mid) < load) lo = mid;
    else top = mid;
  }
  return lo;
}

/**
 * The ascent's sequence as its plan has it (sim/plan.ts, written from the record by vostok-plan.ts): each stage's engine lit, cut (at
 * an instant, or on reaching a speed: space-fixed, or its integrator's apparent velocity) and its body let go, at the
 * instants the record's pilot sets them off; a drop's letting go; the record's instants by id. What happens when is read
 * from the plan's events, never from the stage records' own times. (The stages' engines are the plan's engines that draw
 * on tanks, in order; a stage's joint is the one that first lets its body go.)
 */
export function sequenceOf(plan: FlightPlan) {
  const c = plan.craft[0]!;
  const timeOf = (e: EventDef | undefined): number | null => {
    const w = e?.when.find((x) => 'time' in x);
    return w && 'time' in w ? w.time : null;
  };
  const doing = (test: (a: Action) => boolean) => plan.events.find((e) => e.automatic && e.do.some(test));
  const firstJoint = (body: string) => c.joints.filter((j) => j.gone.includes(body)).sort((a, b) => a.gone.length - b.gone.length)[0];
  const stages = c.engines
    .filter((e) => e.tanks.length && !e.flown)
    .map((e) => {
      const cut = doing((a) => 'cut' in a && a.cut === e.id);
      const joint = firstJoint(e.body);
      const speed = cut?.when.find((w) => 'speed' in w);
      return {
        from: timeOf(doing((a) => 'ignite' in a && a.ignite === e.id)) ?? Infinity,
        cut: cut && !speed ? timeOf(cut) : null,
        speed: speed && 'speed' in speed ? { value: speed.speed, apparent: Boolean(speed.apparent) } : null,
        sep: (joint && timeOf(doing((a) => 'separate' in a && a.separate === joint.id))) ?? Infinity,
        /** The joint that lets it go, and the record's instant of its own cut, where it has one. */
        joint: joint?.id ?? null,
        cutAt: cut?.at?.value ?? null,
      };
    });
  const drop = (id: string): number => timeOf(doing((a) => 'separate' in a && a.separate === id)) ?? Infinity;
  // what leaves that is no stage and no spacecraft (a fairing): a body that carries no engine and has no air of its own,
  // let go by a joint of its own
  const drops = c.bodies
    .filter((b) => !b.aero && !c.engines.some((e) => e.body === b.id && (e.tanks.length || e.flown)))
    .flatMap((body) => {
      const joint = c.joints.find((j) => j.gone.length === 1 && j.gone[0] === body.id);
      return joint ? [{ body, joint: joint.id, at: drop(joint.id) }] : [];
    });
  const instants = [
    ...plan.events.flatMap((e) => (e.record && e.at ? [{ id: e.record.id, at: e.at.value }] : [])),
    ...(plan.record?.marks ?? []).map((m) => ({ id: m.id, at: m.at.value })),
  ];
  /** The record's instant an id names (a guidance target). */
  const instant = (id: string): number => {
    const x = instants.find((k) => k.id === id);
    if (!x) throw new Error(`no event '${id}' in the record`);
    return x.at;
  };
  return { stages, drop, drops, instants, instant };
}

export type Mode = 'vertical' | 'turn' | 'tangent';

/**
 * The stated steering law (orbital.ts: Guidance) with its unknowns given: where it puts the thrust's axis at a state, in
 * frames.ts's inertial frame of date. What the batch run flies (`ascend`) and what the live vehicle's guidance steers to
 * (sim/stagedlive.ts): one law. `thetaTurn` is the axis's angle above the local level as the tangent takes over.
 */
export function lawOf(plan: FlightPlan, site: Geodetic, frame: EarthFrame, x: Solved) {
  const g = guidanceOf(plan);
  const pad = frame.toInertial(geodeticToEcef(site), 0);
  const up0 = frame.toInertial(enuAxes(site).up, 0); // the plumb line at liftoff, held by the gyros
  // the launch plane: through the plumb line and the aiming azimuth, where the record gives it; else the one solved for
  const aimed = (() => {
    if (!g.azimuth) return null;
    const { east, north } = enuAxes(site);
    const a = g.azimuth.value * DEG;
    const bearing = frame.toInertial(add(scale(east, Math.sin(a)), scale(north, Math.cos(a))), 0);
    return unit(cross(up0, bearing));
  })();
  const n = aimed ?? planeThrough(pad, x.plane, plan.record!.orbit!.injection.heading === 'north');
  if (!n) throw new Error(`no plane inclined ${x.plane / DEG} degrees passes over the pad`);
  const upIn = unit(sub(up0, scale(n, dot(n, up0)))); // the same, in the launch plane
  // level in the plane, the way it will go: square to the plumb line in the plane, so that the two are the axes the turn's
  // tilt is measured on and the axis tilted between them is a unit vector (until November 2026 it was square to the line to
  // the Earth's centre, which at Tyuratam leans 0.16 degrees from the plumb line: the axis came out up to 0.14 per cent long
  // or short, and the thrust along it with it)
  const down0 = unit(cross(n, upIn));
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
    if (g.programme) return tilted(along(g.programme, t) * DEG);
    if (m === 'vertical') return up0;
    if (m === 'turn') {
      // along the motion over the ground, in the plane (the turn the programme was made for: in calm air the motion through
      // it; the gyros hold the attitude it gives whatever the wind, which then sets the angle of attack); leaned past it by
      // the pitch-over while that lasts
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

/** The air at a state of the ascent, in the plan's air (air.ts `skyOf`: the day's column and its wind where it has one). */
export const airOf =
  (seaLevel: number, frame: EarthFrame, sky: Sky = STANDARD) =>
  (s: State, t: number): AirHere =>
    airAt(frame, s.r, s.v, t, seaLevel, sky);

/**
 * The stack's engines and drag, as the record has them: one stage's thrust at an instant and a pressure (each `count`
 * alike, its throttle of its vacuum thrust less exit area times the air's pressure: sim/thrust.ts), one unit's propellant burned while
 * lit from `from` to `to`, and the drag area for the shape that flies at a record instant `at` (`ascent.drag`'s piece
 * for it) and a Mach number. The batch run and the live vehicle both fly on these.
 */
export function stackOf(plan: FlightPlan) {
  const stages = stagesOf(plan);
  const drags = plan.craft[0]!.drag;
  const flows = stages.map((s) => flowOf(s.engine));
  const areas = stages.map((s) => exitAreaOf(s.engine));
  const throttle = (i: number, t: number) => (stages[i]!.throttle ? along(stages[i]!.throttle!, t) : 1);
  return {
    flows,
    areas,
    throttle,
    burned: (i: number, from: number, t: number) => flows[i]! * integral(stages[i]!.throttle, from, t),
    thrust: (i: number, t: number, pressure: number) =>
      nozzleThrust(stages[i]!.count, stages[i]!.engine.thrust.vacuum.value, throttle(i, t), areas[i]!, pressure),
    dragArea: (at: number, mach: number) => {
      const drag = drags.find((d) => at < d.until.value) ?? drags[drags.length - 1]!;
      return drag.area.value * along(drag.curve, mach);
    },
  };
}

/**
 * Fly the ascent with the law's unknowns as given. `site` and `frame` as flyOrbit's; `every`: how often a sample is
 * kept, s. Ends at the spacecraft's separation from the last stage.
 */
export function ascend(fp: FlightPlan, site: Geodetic, frame: EarthFrame, seaLevel: number, x: Solved, every = 0.5): Ascended {
  const stages = stagesOf(fp);
  const liftoff = fp.craft[0]!.mass.value;
  const g = guidanceOf(fp);
  const spin = frame.spin;
  const law = lawOf(fp, site, frame, x);
  const { pad, n } = law;
  const stack = stackOf(fp);

  const seq = sequenceOf(fp);
  const plan = schedule(fp, seq);
  // a stage cut on its velocity: the space-fixed speed its integrator stops it at (the design's, and the error it had)
  const cutAt = seq.stages.map((k) => k.speed?.value ?? Infinity);
  const burned = (i: number, t: number) => stack.burned(i, plan[i]!.from, Math.min(t, plan[i]!.to));
  const throttle = stack.throttle;
  const { tVertical, tKicked, tTurn } = law;
  const tEnd = seq.instant(g.target.at);
  // the spacecraft parts from the last stage as it is let go
  const tPart = seq.stages[seq.stages.length - 1]!.sep;
  // a stage cut on its apparent velocity: the instant its integrator reaches its setting, found here from the mass flown
  // (the rocket's own thrust over its mass, summed from its ignition; in vacuum, with nothing else pushing, that is all an
  // accelerometer along the axis senses), before anything is flown. The stage's own thrust in vacuum: it is lit above the air
  const apparentCut = (i: number): number => {
    const st = stages[i]!;
    const massAt = (t: number) => liftoff - droppedBy(t) - stages.reduce((m, s, j) => m + s.count * burned(j, t), 0);
    const pushAt = (t: number) => sensed(st.count, throttle(i, t), st.engine.thrust.vacuum.value, massAt(t));
    return integrate(pushAt, plan[i]!.from, plan[i]!.to, 0.01, cutAt[i]!).at;
  };
  const stageSep = seq.stages.map((k) => k.sep);
  const drops = seq.drops.map((d) => ({ at: d.at, mass: d.body.count * d.body.mass.value }));
  // what has left by an instant: a stage drops its fuelled mass less what it burned; another drop its own
  const droppedBy = (t: number) => {
    let m = 0;
    stages.forEach((s, i) => {
      if (stageSep[i]! <= t && i < stages.length - 1 && stages.findIndex((x) => x.body.id === s.body.id) === i) {
        const sep = stageSep[i]!;
        m += s.body.count * (s.body.mass.value - drawnFrom(stages, s.body.id, (j) => burned(j, sep)));
      }
    });
    for (const d of drops) if (d.at <= t) m += d.mass;
    return m;
  };
  seq.stages.forEach((k, i) => {
    if (k.speed?.apparent) plan[i]!.to = Math.min(plan[i]!.to, apparentCut(i));
  });

  let mode: Mode = 'vertical';
  let thetaTurn = 0; // the thrust's angle above the local level as the tangent law takes over
  const localAt = law.localAt;
  const airHere = airOf(seaLevel, frame, skyOf(fp));
  const axisAt = (s: State, t: number, m: Mode, wind: Vec3): Vec3 => law.axisAt(s, t, m, wind, thetaTurn);
  /**
   * Every force but gravity over the mass, m/s^2, at a state at `t`, with what burns, what has left and the shape that
   * flies all as they are from instant `as` (the step's start: a step ends on every instant they change at, so within it
   * they are fixed). Read at each stage's own instant, the stage that ends a step on a cutoff had that engine off and the
   * one that ends a step on an ignition had it lit: each burn was a sixth of a step late in starting and short at its end.
   */
  const forces = (s: State, t: number, m: Mode, gone: number, as = t) => {
    const air = airHere(s, t);
    let thrust = 0;
    let mass = liftoff - gone;
    stages.forEach((st, i) => {
      mass -= st.count * burned(i, t);
      if (as >= plan[i]!.from && as < plan[i]!.to) thrust += stack.thrust(i, t, air.air.pressure);
    });
    const dragArea = stack.dragArea(as, air.mach);
    const axis = axisAt(s, t, m, air.ground);
    let f: Vec3 = scale(axis, thrust);
    f = add(f, airDrag(air.wind, air.airspeed, air.air.density, dragArea));
    return { accel: scale(f, 1 / mass), mass, thrust, axis, air };
  };

  const sample = (s: State, t: number): AscentSample => {
    const f = forces(s, t, mode, droppedBy(t - 1e-9));
    const up = frame.upOver(f.air.here, t);
    const climb = (d: Vec3) => (length(d) > 1e-9 ? Math.asin(Math.max(-1, Math.min(1, dot(d, up) / length(d)))) / DEG : 90);
    return {
      t,
      altitude: f.air.altitude,
      downrange: angleBetween(frame.toFixed(s.r, t), geodeticToEcef(site)) * MEAN_RADIUS,
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
      ...drops.map((d) => d.at),
      ...fp.craft[0]!.drag.map((d) => d.until.value),
      ...(g.programme?.points ?? []).map(([at]) => at),
      ...(g.attached ? [...g.attached.align.map((t) => t.value), g.attached.freeze.value] : []),
      ...seq.instants.map((x) => x.at),
      ...(fp.record?.coastFixes ?? []).map((fix) => fix.at.value),
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
  const core = stages.findIndex((s) => s.body.id !== stages[0]!.body.id);
  const coreOff = core < 0 ? firstOff : plan[core]!.to;
  let kept = 0;

  while (t < tPart - 1e-9) {
    const mark = marks.find((m) => m > t + 1e-9) ?? tPart;
    const coasting = tPart - tEnd > 60 && t >= plan[plan.length - 1]!.to && t >= tEnd;
    const interval = coasting ? Math.max(10, every) : every;
    const h = Math.min(coasting ? 10 : STEP, mark - t);
    const gone = droppedBy(t);
    const m = mode;
    const [before, t0] = [state, t];
    state = step(state, t, h, (s, tt) => forces(s, tt, m, gone, t0).accel);
    t = Math.abs(t + h - mark) < 1e-9 ? mark : t + h;
    // a stage cut on its velocity, when it reaches it in this step: the step is flown again to the instant it does, found by
    // the secant on the step's length (so the instant is a smooth function of the inputs, as the law's solution needs)
    const crossing = seq.stages.findIndex(
      (k, i) => k.speed && !k.speed.apparent && t > plan[i]!.from && t <= plan[i]!.to && length(state.v) >= cutAt[i]!,
    );
    if (crossing >= 0 && length(before.v) < cutAt[crossing]!) {
      const want = cutAt[crossing]!;
      const at = (k: number) => length(step(before, t0, h * k, (q, tt) => forces(q, tt, m, gone, t0).accel).v) - want;
      let [k0, f0, k1, f1] = [0, length(before.v) - want, 1, length(state.v) - want];
      for (let n = 0; n < 8 && Math.abs(f1) > 1e-9; n++) {
        const k2 = Math.min(1, Math.max(0, k1 - (f1 * (k1 - k0)) / (f1 - f0)));
        [k0, f0, k1, f1] = [k1, f1, k2, at(k2)];
      }
      state = step(before, t0, h * k1, (q, tt) => forces(q, tt, m, gone, t0).accel);
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
    for (const x of seq.instants) if (x.at === t) at[x.id] = s;
    if (t === plan[plan.length - 1]!.to) Object.assign(summary, atCutoff(fp, t, state, pad));
    // the law's own changes, at the end of a step
    if (mode === 'vertical' && t >= tVertical) mode = 'turn';
    if (mode === 'turn' && t >= tTurn) {
      const f = forces(state, t, mode, droppedBy(t));
      const { u } = localAt(state.r);
      thetaTurn = Math.asin(Math.max(-1, Math.min(1, dot(f.axis, u))));
      mode = 'tangent';
    }
    if (t - kept >= interval - 1e-9 || marks.includes(t)) {
      samples.push(s);
      kept = t;
    }
  }
  // (`burned` is one unit's: a stage's count multiplies it)
  // (and the last stage, as it lets the spacecraft go, takes what it weighed fuelled less what it burned)
  const last = stages.length - 1;
  const lastBody = stages[last]!.body;
  const lastLeft = lastBody.count * (lastBody.mass.value - drawnFrom(stages, lastBody.id, (j) => burned(j, tPart)));
  summary.massLeft = liftoff - droppedBy(tPart - 1e-9) - stages.reduce((sum, st, i) => sum + st.count * burned(i, tPart), 0) - lastLeft;
  return {
    samples,
    at,
    summary,
    solved: x,
    stops: plan.map((p) => p.to),
    left: stages.map((s, i) => s.load - drawnFrom(stages, s.holder.id, (j) => burned(j, plan[i]!.to))),
    separation: { t: tPart, r: state.r, v: state.v },
    plane: n,
    thetaTurn,
  };
}

/**
 * Solve the law's three unknowns so that the last cutoff comes at the target's height over the reference ball, its
 * climb and its inclination: Newton's method on finite differences, from a start that is the target's inclination, a
 * pitch-over of eight degrees and a tangent falling a thousandth a second. Throws if it does not converge:
 * a law that cannot reach its target is a finding, not something to paper over.
 */
export function steer(plan: FlightPlan, site: Geodetic, frame: EarthFrame, seaLevel = 0): Solved {
  const g = guidanceOf(plan);
  if (g.programme && g.azimuth) return { plane: Number.NaN, kick: 0, rate: 0 };
  const radius = heightsBall(plan, site);
  const want = [radius + g.target.altitude.value, g.target.climb.value * DEG, g.target.inclination.value * DEG];
  if (g.azimuth) return steer2(plan, site, frame, seaLevel, want);
  const miss = (x: Solved): number[] => {
    const s = ascend(plan, site, frame, seaLevel, x, Infinity).summary;
    return [(s.cutoffAltitude + radius - want[0]!) / 10_000, s.cutoffClimb * DEG - want[1]!, s.inclination * DEG - want[2]!];
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
function steer2(plan: FlightPlan, site: Geodetic, frame: EarthFrame, seaLevel: number, want: number[]): Solved {
  const radius = heightsBall(plan, site);
  const miss = (v: number[]): number[] => {
    const s = ascend(plan, site, frame, seaLevel, { plane: Number.NaN, kick: v[0]!, rate: v[1]! }, Infinity).summary;
    return [(s.cutoffAltitude + radius - want[0]!) / 10_000, s.cutoffClimb * DEG - want[1]!];
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
  plan: FlightPlan,
  site: Geodetic,
  frame: EarthFrame,
  seaLevel = 0,
  solved?: Solved,
  every = 10,
  handover: 'flown' | 'published' = 'flown',
): FlownWhole {
  const x = solved ?? steer(plan, site, frame, seaLevel);
  const ascent = ascend(plan, site, frame, seaLevel, x);
  if (handover === 'published') followAscentFixes(plan, frame, ascent);
  const coast = flyOrbit(
    plan,
    site,
    frame,
    seaLevel,
    every,
    handover === 'published' ? published(plan, site, ascent.separation) : ascent.separation,
    undefined,
    undefined,
    handover === 'published',
  );
  const end = coast.samples[coast.samples.length - 1]!;
  const down = downOf(plan) && end.phase === 'down' ? flyDown(plan, frame, seaLevel, end) : null;
  return { ascent, coast, down };
}

/** Continue the attached stack's orbital coast from the tracked insertion and venting fixes. */
function followAscentFixes(plan: FlightPlan, frame: EarthFrame, ascent: Ascended): void {
  const fixes = plan.record?.coastFixes?.filter((fix) => fix.at.value <= ascent.separation.t);
  if (!fixes?.length) return;
  const samples = ascent.samples;
  let start = 0;
  for (const fix of fixes) {
    const end = samples.findIndex((s) => s.t === fix.at.value);
    if (end < 1 || end <= start) continue;
    const want = trackedState(fix, frame);
    const arc: State[] = [];
    let last: State = samples[start]!;
    for (let i = start + 1; i <= end; i++) {
      const s = samples[i]!;
      last = start === 0 ? s : step(last, samples[i - 1]!.t, s.t - samples[i - 1]!.t);
      arc.push(last);
    }
    const correct = trackingArc(samples[start]!.t, samples[end]!.t, last, want);
    for (let i = start + 1; i <= end; i++) {
      const s = samples[i]!;
      const state = i === end ? want : correct(arc[i - start - 1]!, s.t);
      const here = frame.place(state.r, s.t);
      const air = airAt(frame, state.r, state.v, s.t, 0);
      samples[i] = {
        ...s,
        ...state,
        altitude: here.height,
        latitude: here.latitude,
        longitude: here.longitude,
        speed: length(state.v),
        groundSpeed: air.airspeed,
        q: air.q,
        mach: air.mach,
      };
    }
    start = end;
  }
  const last = samples.at(-1)!;
  if (last.t === samples[start]!.t) ascent.separation = { t: last.t, r: last.r, v: last.v };
  const attached = guidanceOf(plan).attached;
  if (!attached) return;
  const [begin, end] = attached.align.map((t) => t.value) as [number, number];
  let held: Vec3 | null = null;
  for (const s of samples) {
    if (s.t < begin) continue;
    if (held) {
      s.axis = held;
      continue;
    }
    const up = frame.up(s.r, s.t);
    const horizontal = unit(sub(s.v, scale(up, dot(s.v, up))));
    const pitch = along(attached.pitch, s.t) * DEG;
    const axis = add(scale(horizontal, Math.cos(pitch)), scale(up, Math.sin(pitch)));
    const blend = Math.min(1, (s.t - begin) / (end - begin));
    s.axis = unit(add(scale(s.axis, 1 - blend), scale(axis, blend)));
    if (s.t >= attached.freeze.value) held = s.axis;
  }
}

/**
 * The coast and the descent flown again from `from` (where the spacecraft parted, on the run on show) on `plan` (as the
 * flight now has it: its burn, its modules' parting) with what a hand gave in the descent (orbital.ts `DescentHands`):
 * the flight deck's, after each event a hand gives (orbitdeck.ts). `ascent` is kept as it was.
 */
export function flyOn(
  plan: FlightPlan,
  site: Geodetic,
  frame: EarthFrame,
  seaLevel: number,
  ascent: Ascended,
  from: { t: number; r: Vec3; v: Vec3 },
  hands?: DescentHands,
  every = 1,
  contacts?: CoastContacts,
): FlownWhole {
  const coast = flyOrbit(plan, site, frame, seaLevel, every, from, hands, contacts);
  const end = coast.samples[coast.samples.length - 1]!;
  return { ascent, coast, down: downOf(plan) && end.phase === 'down' ? flyDown(plan, frame, seaLevel, end, hands) : null };
}

/**
 * The spacecraft where the ascent flown left it, moving as fast as the published orbit has it there (vis-viva on its
 * semi-major axis, over the record's reference ball) along the way the ascent flown left it going. For a flight whose
 * ascent as flown does not reach the published orbit: the coast and what follows are then the record's orbit's, begun from
 * the place and instant the ascent gives instead of the estimated `injection`. What the scene and the deck show
 * (sim/run.ts `orbitalFlown`), and the run the coast's and the descent's checks are held to (tests/staged.test.mjs).
 */
export function published(plan: FlightPlan, site: Geodetic, at: { t: number; r: Vec3; v: Vec3 }): { t: number; r: Vec3; v: Vec3 } {
  // (the speed that puts it on the published orbit read as mean elements, its period nodal: world/meanelements.ts)
  const s = alongPublished(publishedOf(plan, site), at.r, at.v).state;
  return { t: at.t, r: at.r, v: s.v };
}

/** Draw a passively stable sphere from the release attitude. Air drag can tip the heavy side
 * into the flow but gives no restoring roll about that line. The response between entry and
 * one g is a visual approximation; the measured pressure-centre offset and damping are unknown. */
export function passiveSpherePose(released: Quat, wind: Vec3, alignment: number): Quat {
  if (!alignment || length(wind) < 1) return released;
  const axis = turnQ(released, [1, 0, 0]),
    back = scale(unit(wind), -1);
  const normal = cross(axis, back),
    sine = length(normal);
  const angle = Math.atan2(sine, dot(axis, back));
  return normalizeQ(multiply(aboutAxis(sine > 1e-10 ? scale(normal, 1 / sine) : turnQ(released, [0, 1, 0]), angle * alignment), released));
}

/**
 * The whole flight as samples the scene can show (viewer/ascent.ts places a run's samples by their own attitude): in
 * the frame it was flown in (world/earthframe.ts), every `LiveSample` field filled. `centre` is the spacecraft's centre of mass, metres up the
 * stack from the base, which is the point the ascent flies; from the spacecraft's separation the coast's point is that
 * centre (carried on by the offset it had then, so nothing jumps). After the ejection height, the first of the
 * descent's bodies (descent.ts `downOf`) is the one followed.
 *
 * How it lies is the law's going up: the long axis (+X) along the thrust, +Y the launch plane's pole (its left, as it
 * stood on the pad), +Z back up range. After separation the record's attitudes are drawn, not flown: held as at
 * separation; turned over a minute to push along the braking burn's line from the solar orientation (the `orientation`
 * event) to the burn's end; held again. A passive sphere keeps its release attitude until aerodynamic entry. Other
 * spacecraft are turned over half a minute from module separation to lie along their
 * motion through the air. The tumbles of the record (2 to 3 deg/s before orientation, 6 or 30 after the burn) are not.
 */
export function recordSamples(
  plan: FlightPlan,
  whole: FlownWhole,
  frame: EarthFrame,
  centre: number,
  sunAt: (t: number) => Vec3,
  releaseAttitude?: Quat,
): LiveSample[] {
  const spin = frame.spin;
  const n = whole.ascent.plane;
  const lie = (x: Vec3): Quat => {
    const y = unit(sub(n, scale(x, dot(n, x))));
    return fromAxes(x, y, cross(x, y));
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
  const roll = guidanceOf(plan).roll;
  // (the summary has the stack's whole thrust and not each engine's: it is the craft's)
  const stack = plan.craft[0]!.id;
  const out: LiveSample[] = [];
  for (const s of whole.ascent.samples) {
    const axis = s.axis;
    out.push({
      ...blank,
      t: s.t,
      ...RIDING,
      powered: s.thrust > 0,
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
      r: s.r,
      v: s.v,
      axis,
      attitude: roll ? multiply(lie(s.axis), aboutAxis([1, 0, 0], along(roll, s.t) * DEG)) : lie(s.axis),
      alpha: angleBetween(s.axis, sub(s.v, cross(spin, s.r))) / DEG,
      burning: s.thrust > 0 ? [{ engine: stack, thrust: s.thrust }] : [],
      centre: add(s.r, scale(axis, centre)),
    });
  }
  const parted = out[out.length - 1]!;
  const offset = sub(parted.centre, parted.r); // (the coast flies the point the ascent left, drawn as the centre of mass)
  const held = releaseAttitude ?? parted.attitude;
  const ship = shipOf(plan);
  const lights = coastEvents(plan).on?.do.find((a) => 'ignite' in a);
  const braking = lights && 'ignite' in lights ? lights.ignite : null;
  // (turned to the burn's line from where the plan turns it to its aim, where that comes before the burn; else a minute before)
  const turned = plan.events.find((e) => e.automatic && e.do.some((a) => 'attitude' in a && a.attitude === ship.aimId));
  const turnedAt = turned?.when.find((w) => 'time' in w);
  const oriented = turnedAt && 'time' in turnedAt && turnedAt.time < ship.on ? turnedAt.time : ship.on - 60;
  // (over a minute, or as long as there is before the burn: a Mercury capsule's retrosequence is thirty seconds)
  const turning = Math.min(60, ship.on - oriented);
  const burnAt = whole.coast.samples.find((x) => x.t >= ship.on) ?? whole.coast.samples[0]!;
  const aimed = lie(
    ship.aim.aim === 'fixed'
      ? scale(unit(burnAt.v), ship.aim.sense)
      : aimOf(
          plan,
          burnAt.r,
          burnAt.v,
          () => sunAt(ship.on),
          () => frame.upOver(burnAt, burnAt.t),
        ),
  );
  const parts = ship.parted;
  const toward = (from: Quat, to: Quat, k: number): Quat => {
    const sign = from[0] * to[0] + from[1] * to[1] + from[2] * to[2] + from[3] * to[3] < 0 ? -1 : 1;
    return normalizeQ([0, 1, 2, 3].map((i) => from[i]! + (sign * to[i]! - from[i]!) * k) as unknown as Quat);
  };
  // (the first body as it is drawn, at rest on the drawn surface: `settled`; its figures are the flight's own)
  const followed = whole.down ? Object.keys(whole.down.tracks)[0] : undefined;
  const track = whole.down && followed ? (whole.down.tracks[followed] ?? []) : [];
  /** The plan's id of the followed body's parachute out at `t` (the last let out and not let go), or null. */
  const outAt = (t: number): string | null => {
    if (!whole.down || !followed) return null;
    const opened = whole.down.opened[followed] ?? {};
    const gone = whole.down.gone[followed] ?? {};
    let last: string | null = null;
    for (const [name, at] of Object.entries(opened))
      if (at <= t && !((gone[name] ?? Infinity) <= t) && (last === null || at >= opened[last]!)) last = name;
    return last === null ? null : chuteEvent(followed, last);
  };
  // (lowered by the ground's height, less what the offset already lowers it by at the landing: it rests on the drawn surface)
  const lift = track.length ? dot(offset, unit(track[track.length - 1]!.r)) : 0;
  const drawn = settled(track, (downOf(plan)?.ground ?? 0) + lift);
  const descent = track.slice(1).map((s, i) => ({ ...s, drawn: drawn[i + 1]!.r }));
  const ending = [
    ...whole.coast.samples
      // Keep both sides of the handover: the published coast can start with a different velocity.
      .filter((s) => s.t >= parted.t)
      .map((s) => ({
        t: s.t,
        r: s.r,
        v: s.v,
        g: s.g,
        q: s.q,
        mach: s.mach,
        down: false,
        entering: s.phase === 'entry',
        drawn: s.r,
        rotation: s.rotation,
      })),
    // (come through the entry, as the descent's bodies have)
    ...descent.map((s) => ({
      t: s.t,
      r: s.r,
      v: s.v,
      g: 1,
      q: 0,
      mach: 0,
      down: true,
      entering: true,
      drawn: s.drawn,
      rotation: undefined,
    })),
  ];
  // (heat shield first along the motion through the air; a lifting body banked is drawn at its trim, its long axis tipped
  // from there toward its lift: orbital.ts `liftOf`)
  const trim = ship.entry.aero.trim ? ship.entry.aero.trim.value * DEG : 0;
  const trimmed = (s: { t: number; r: Vec3 }, wind: Vec3): Vec3 => {
    const back = scale(unit(wind), -1);
    const bank = trim ? bankAt(ship, s.t) : null;
    if (bank === null) return back;
    const lift = liftOf(back, wind, unit(s.r), 1, bank);
    return length(lift) > 0 ? add(scale(back, Math.cos(trim)), scale(unit(lift), Math.sin(trim))) : back;
  };
  // the record's own periods by hand (`manual.periods`): turned over a minute to the orbital orientation the Vzor gives
  // (the long axis back along the motion, the braking engine's push against it), held so as the ship goes round, and left
  // there when the period ends; the slow turning that followed is not drawn
  const periods = plan.record?.manual?.periods ?? [];
  let rest = held;
  let supportedWind: Vec3 = [0, 0, 0];
  let baseAtRelease = held,
    alignment = 0,
    peakAlignment = 0,
    lastPassive = parts;
  let left: Quat | null = null;
  const manoeuvreTurn = plan.record?.manoeuvreTurn?.value ?? 0;
  const manoeuvreAttitudes = (manoeuvreTurn > 0 ? ship.moves : []).map((move) => {
    const start = whole.coast.samples.find((s) => s.t >= move.on) ?? whole.coast.samples[0]!;
    return {
      move,
      q: lie(
        aimFor(
          move.aim,
          start.r,
          start.v,
          () => sunAt(start.t),
          () => frame.up(start.r, start.t),
        ),
      ),
    };
  });
  for (const s of ending) {
    const wind = sub(s.v, cross(spin, s.r));
    let q: Quat;
    const by = s.t < oriented ? periods.find((p) => s.t >= p.from.value && s.t < p.to.value) : undefined;
    if (!by && left) {
      rest = left;
      left = null;
    }
    const move = manoeuvreAttitudes.find(({ move }) => s.t >= move.on - manoeuvreTurn && s.t <= move.off);
    const passive = ship.entry.aero.passiveSphere && s.t >= parts;
    if (passive) {
      if (length(wind) >= 1) {
        supportedWind = wind;
        if (s.entering) {
          peakAlignment = Math.max(peakAlignment, Math.min(1, Math.max(0, (s.g - ENTRY_G) / (1 - ENTRY_G))));
          // A late release in appreciable air starts from the same attitude as its departing instrument section.
          // Retain the display's thirty-second settling scale, with no alignment demand in free flight.
          alignment += (peakAlignment - alignment) * -Math.expm1(-(s.t - lastPassive) / 30);
        }
      }
      lastPassive = s.t;
      q = passiveSpherePose(baseAtRelease, supportedWind, alignment);
    } else if (move) q = left = toward(rest, move.q, Math.min(1, (s.t - move.move.on + manoeuvreTurn) / manoeuvreTurn));
    else if (by) q = left = toward(rest, lie(scale(unit(s.v), -1)), Math.min(1, (s.t - by.from.value) / 60));
    else if (s.t < oriented) q = rest;
    else if (s.t <= ship.off) q = toward(rest, aimed, Math.min(1, (s.t - oriented) / turning));
    else if (s.t < parts) q = aimed;
    else q = toward(aimed, length(wind) > 1 ? lie(trimmed(s, wind)) : aimed, Math.min(1, (s.t - parts) / 30));
    if (!passive) baseAtRelease = q;
    if (s.rotation) q = multiply(q, s.rotation.delta);
    const axis = turnQ(q, [1, 0, 0]);
    const here = frame.place(s.r, s.t);
    const at = add(s.drawn, offset);
    out.push({
      ...blank,
      t: s.t,
      ...ALONE,
      entered: s.entering,
      out: s.down ? outAt(s.t) : null,
      altitude: here.height,
      range: angleBetween(frame.toFixed(s.r, s.t), frame.toFixed(pad, 0)) * MEAN_RADIUS,
      speed: length(s.v),
      groundSpeed: length(wind),
      climb: 0,
      groundClimb: 0,
      g: s.g,
      q: s.q,
      mach: s.mach,
      mass: s.t >= parts ? ship.entry.mass : ship.mass,
      latitude: here.latitude,
      longitude: here.longitude,
      r: sub(at, scale(axis, centre)),
      v: s.v,
      axis,
      attitude: q,
      ...(passive && { passive: { wind: supportedWind, alignment } }),
      ...(s.rotation && { rotation: s.rotation, rates: s.rotation.rates }),
      alpha: angleBetween(axis, wind) / DEG,
      burning: [
        ...(s.t >= ship.on && s.t < Math.min(ship.off, parts) && braking ? [{ engine: braking, thrust: 0 }] : []),
        ...ship.moves.filter((m) => s.t >= m.on && s.t < m.off).map((m) => ({ engine: m.engine, thrust: m.accel * ship.mass })),
      ],
      centre: at,
    });
  }
  return out;
}

/**
 * A descent body's track as the scene draws it. The globe is drawn at the sea's height (world/surface.ts), not the ground's,
 * so what comes to rest `ground` metres above the sea is drawn lowered onto the drawn surface over its last kilometre: each
 * point by `ground` (with what the scene's offset of the centre of mass already moves it, along the plumb line at the
 * landing) times the part of that kilometre still to fall, along its own line from the Earth's centre (the plumb
 * line's lean from it moves the landing a tenth of a metre). Under a canopy that is a fifth of a metre a second on five: it
 * is not seen. The figures (the card's, the checks') are the flight's own; only where it is drawn moves.
 */
export function settled<P extends { t: number; r: Vec3 }>(track: readonly P[], ground: number): P[] {
  const last = track[track.length - 1];
  if (!last || !ground) return [...track];
  const bottom = length(last.r);
  return track.map((p) => {
    const r = length(p.r);
    const k = Math.max(0, 1 - (r - bottom) / 1000);
    return k > 0 ? { ...p, r: scale(p.r, (r - ground * k) / r) } : p;
  });
}

/** A descent as the scene draws it (`descentOf`). */
export interface DrawnDescent {
  /** Each body's path in the frame the flight was flown in, as `recordSamples` puts the spacecraft's centre of mass. */
  tracks: Record<string, { t: number; r: Vec3; v: Vec3 }[]>;
  /** When each body's parachutes came out and were let go, s from liftoff (orbital.ts `DescentFlown`). */
  opened: Record<string, Record<string, number>>;
  gone: Record<string, Record<string, number>>;
  /** When each tore, s from liftoff, by body and parachute: it streams from then. */
  torn: Record<string, Record<string, number>>;
}

/**
 * The descent of a whole flight (`whole.down`) in the frame and by the offset `recordSamples` gives the spacecraft's samples
 * (the run's own samples after the ejection are its first body's): every body's track, for the scene to carry what came
 * down on each (viewer/ascent.ts). Null where nothing came down.
 */
export function descentOf(whole: FlownWhole, centre: number, ground = 0): DrawnDescent | null {
  if (!whole.down) return null;
  const last = whole.ascent.samples[whole.ascent.samples.length - 1]!;
  return drawnOf(whole.down, scale(last.axis, centre), ground);
}

/**
 * A descent flown (orbital.ts `DescentFlown`) as the scene draws it: each body's track carried by `offset` (where the run's
 * own point is from the point flown, m) and its last kilometre lowered by `ground` to rest on the drawn surface (`settled`).
 */
export function drawnOf(down: DescentFlown, offset: Vec3, ground = 0): DrawnDescent {
  const tracks: DrawnDescent['tracks'] = {};
  for (const [id, track] of Object.entries(down.tracks))
    tracks[id] = settled(
      track.map((p) => ({ t: p.t, r: add(p.r, offset), v: p.v })),
      // (by the ground's height, less what the offset already lowers it by at the landing: it rests on the drawn surface)
      ground && track.length ? ground + dot(offset, unit(track[track.length - 1]!.r)) : 0,
    );
  const torn = Object.fromEntries(
    Object.entries(down.torn ?? {}).map(([id, of]) => [id, Object.fromEntries(Object.entries(of).map(([name, x]) => [name, x.t]))]),
  );
  return { tracks, opened: down.opened, gone: down.gone, torn };
}

/**
 * The plan with its coast's burn made by hand (`PlanRecord.manual`, and the burn's `EngineDef.deltaV`): commanded and lit
 * at `t`, pushing along `aim` (a unit vector in the flight's frame, world/earthframe.ts) for as long as the engine takes to
 * give its integrator's impulse, and the modules parting `manual.parting` after. The hand's command starts nothing the
 * automatic one would (a timer it arms is never armed). What the flight deck flies from a hand's burn (orbitdeck.ts); the
 * rest is the plan's. Each event keeps the record's instant (`at`): only when it is set off changes.
 */
export function byHand(plan: FlightPlan, t: number, aim: Vec3): FlightPlan {
  const parting = plan.record?.manual?.parting;
  const out = structuredClone(plan);
  const k = coastEvents(out);
  const deltaV = k.burn?.deltaV;
  if (!parting || !k.burn || !deltaV) throw new Error('this plan says nothing of what a hand could do');
  const resources = coastEngineState(plan, k.burn.id, t - 1e-9);
  if (resources.starts <= 0 || resources.kg <= 0) return out;
  if (out.record?.coastFixes) out.record.coastFixes = out.record.coastFixes.filter((fix) => fix.at.value <= t);
  // (a solid burns for as long as it burns; a liquid until its integrator has the impulse, at its chambers' thrust)
  const burn =
    k.burn.kind === 'solid' && k.burn.burn
      ? k.burn.burn.value
      : k.burn.tanks.length
        ? Math.min(shipOf(plan).fuel, resources.kg) / (k.burn.count * flowOf(k.burn))
        : (shipOf(plan).mass * deltaV.value) / (k.burn.count * k.burn.thrust.vacuum.value);
  // (the chain kept where the plan has one, each so long after the one before: t, t + burn and t + burn + parting all the same)
  if (k.command) {
    setOff(k.command, t);
    k.command.do = k.command.do.filter((a) => !('arm' in a));
  }
  if (!waits(k.on, 0)) setOff(k.on, t);
  if (k.on) for (const a of k.on.do) if ('ignite' in a) delete a.firingTime;
  if (!waits(k.off, burn)) setOff(k.off, t + burn);
  k.burn.flown = { ...k.burn.flown!, value: deltaV.value };
  const held = shipOf(plan).aimId;
  for (const a of out.attitude) if (a.id === held && 'aim' in a.hold) a.hold = { ...a.hold, aim: 'fixed', sense: 1, vector: aim };
  if (!waits(k.parting, parting.value)) setOff(k.parting, t + burn + parting.value);
  return out;
}

/**
 * The plan with its coast's burn given up: nothing commanded, lit, cut or parted by the clock (each at the largest safe
 * integer), until a hand does; and so its manoeuvres (orbital.ts `movesOf`), each lit and cut only as a hand does
 * (`movedTo`).
 */
export function givenUp(plan: FlightPlan, before = Number.NEGATIVE_INFINITY): FlightPlan {
  const out = structuredClone(plan);
  if (out.record?.coastFixes) out.record.coastFixes = out.record.coastFixes.filter((fix) => fix.at.value <= before);
  const k = coastEvents(out);
  if (clockAt(out, k.on) > before) for (const e of [k.command, k.on, k.off, k.parting]) setOff(e, Number.MAX_SAFE_INTEGER);
  for (const m of movesOf(plan)) if (m.on > before) for (const id of [m.lit, m.cut]) setOff(eventOf(out, id), Number.MAX_SAFE_INTEGER);
  return out;
}

/**
 * `plan` (the flight as it stands, its manoeuvres given up or some already moved) with the record's `k`th manoeuvre
 * (`movesOf(record)`, in order) made by hand: lit at `t` and cut as long after as on the record, its impulse kept, its
 * thrusters pushing along `axis` (the long axis, a unit vector in the flight's frame: the nose's way for a pair that
 * pushes toward it, the other for one that pushes `astern`). Each event keeps the record's instant (`at`).
 */
export function movedTo(record: FlightPlan, plan: FlightPlan, k: number, t: number, axis: Vec3): FlightPlan {
  const m = movesOf(record)[k];
  if (!m) throw new Error(`the record has no manoeuvre ${k}`);
  const out = structuredClone(plan);
  const lit = eventOf(out, m.lit)!;
  const held = `${m.lit}:by-hand`;
  out.attitude = [
    ...out.attitude.filter((a) => a.id !== held),
    {
      id: held,
      label: `${m.label}, by hand`,
      hold: { aim: 'fixed', sense: 1, vector: axis, confidence: 'documented' },
      source: 'the long axis as the hand held it',
    },
  ];
  setOff(lit, t);
  lit.do = [{ attitude: held }, ...lit.do.filter((a) => !('attitude' in a && a.attitude === held))];
  setOff(eventOf(out, m.cut), t + (m.off - m.on));
  return out;
}

/** The plan with the burn's body let go at `t` (the modules' parting, as a hand or the timer has it). */
export function partingAt(plan: FlightPlan, t: number): FlightPlan {
  const out = structuredClone(plan);
  setOff(coastEvents(out).parting, t);
  return out;
}

/** An event set off so long after the one it follows (its `after`'s wait made `wait`), if it follows one: whether it does. */
function waits(e: EventDef | undefined, wait: number): boolean {
  if (!e?.when.some((w) => 'after' in w)) return false;
  e.when = e.when.map((w) => ('after' in w ? { ...w, wait } : w));
  return true;
}

/** An event set off by the clock at another instant: its `time` trigger (or the event it followed, and its wait) made that instant; `at`, the record's instant, kept. */
function setOff(e: EventDef | undefined, t: number): void {
  if (!e) return;
  const rest = e.when.filter((w) => !('time' in w) && !('after' in w));
  e.when = rest.length < e.when.length ? [{ time: t }, ...rest] : e.when;
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

/** Every check an orbital plan sets, against a whole flight flown (`flyWhole`): for the Flown panel and the debrief. */
export function held(plan: FlightPlan, whole: FlownWhole): Held[] {
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
  const results = whole.coast.results as unknown as Record<string, number>;
  return plan.checks.flatMap((c) =>
    c.of === 'ascent'
      ? [of(c, ascent(c.id))]
      : c.of === 'orbit'
        ? [of(c, results[c.id] ?? Number.NaN)]
        : c.of === 'descent'
          ? [of(c, down(c.id))]
          : [],
  );
}

/**
 * The engines lit at liftoff as one, for what the ear and the eye are given of them (viewer/effects.ts, sound/): their
 * summed sea-level thrust, N; the exhaust speed of that thrust over their summed flow, m/s; and their summed exit area, m^2.
 */
export function liftoffEngine(plan: FlightPlan): { thrust: number; exhaustSpeed: number; exitArea: number } {
  const seq = sequenceOf(plan);
  const lit = stagesOf(plan).filter((s, i) => seq.stages[i]!.from <= 0 && s.engine.thrust.seaLevel);
  const thrust = lit.reduce((sum, s) => sum + s.count * s.engine.thrust.seaLevel!.value, 0);
  const flow = lit.reduce((sum, s) => sum + s.count * flowOf(s.engine), 0);
  return {
    thrust,
    exhaustSpeed: flow > 0 ? thrust / flow : 0,
    exitArea: lit.reduce((sum, s) => sum + s.count * exitAreaOf(s.engine), 0),
  };
}

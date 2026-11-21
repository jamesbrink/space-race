/**
 * The powered ascent of an orbital flight (its plan's stages and steering law), flown: stages burning together and in turn,
 * each dropped when the record says it left, on a stated steering law; then flown on by the coast (orbital.ts: flyOrbit)
 * from the state it has at the spacecraft's separation, so the whole flight is one state flown from the pad. Nothing here knows which flight it is:
 * every stage, event and figure is the flight's plan, and the law is its attitude held by a stated law (`{ law }`).
 *
 * Forces, in the flight's frame (world/earthframe.ts: of date, as the coast's), on a point that is the vehicle:
 *   gravity  world/orbit.ts's, with J2.
 *   thrust   each stage burning, `count` of them alike: its throttle (its engine's `throttle.curve`, rated where none is
 *            given) of its vacuum thrust, less its nozzles' exit area times the air's pressure (sim/thrust.ts). Flow is the vacuum
 *            thrust over g0 times the vacuum specific impulse, times the throttle (or the share of its flow the record
 *            has apart from its thrust's: `throttle.flow`, `Stage.drawn`): so the engine's propellant flow is
 *            the same in air as out of it, and sea-level thrust and impulse come out as the record has them when the
 *            exit area is the one the two thrusts give (`exitAreaOf`). It burns from `ignition` to `cutoff`, or until
 *            its `usable` propellant is gone if that is sooner (said in `Ascended.stops`). No build-up. Where the record
 *            gives its cutoff impulse (`EngineDef.decay`), its thrust falls from the cut to nothing over the impulse
 *            (`decayOf`), while its body is on.
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
import type { Curve, SitedFlight } from '../types.ts';
import { EARTH, G0, P0 } from '../world/bodies.ts';
import { type EarthFrame, frameOf, sinceLiftoff } from '../world/earthframe.ts';
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
  siteFrame,
  sub,
  unit,
  type Vec3,
} from '../world/frames.ts';
import { shortOfPublished } from '../world/meanelements.ts';
import { elementsOf, hermite, period, planeThrough, type State, sunlit } from '../world/orbit.ts';
import { sunPosition } from '../world/ephemeris.ts';
import { type AirHere, airAt, airDrag, type Sky, STANDARD, skyOf } from './air.ts';
import { integrate, sensed } from './apparent.ts';
import { componentsOf, followedOf, type Piece } from './components.ts';
import { fieldFor, stepIn } from './core/gravity.ts';
import { type CraftState, part as partJoint, startCraft } from './craft.ts';
import { downOf } from './descent.ts';
import { ALONE, along, MEAN_RADIUS, RIDING } from './fly.ts';
import { keptShare } from './forces.ts';
import { ENTRY_G } from './loads.ts';
import {
  aimFor,
  aimOf,
  bankOn,
  type CoastContacts,
  chuteEvent,
  coastEngineState,
  coastEvents,
  coastOf,
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
  type OrbitSample,
  orbitTarget,
  orientedAt,
  publishedOf,
  shipOf,
  TURNING,
  targetFrom,
} from './orbital.ts';
import type { Target } from './pursuit.ts';
import {
  type Action,
  type BodyDef,
  clockAt,
  type EngineDef,
  type EventDef,
  eventOf,
  type FlightPlan,
  type TankDef,
  type TargetDef,
} from './plan.ts';
import { type CraftStart, type CraftTrack, craftAt, flyProximity, laidOf, type ProximityFlown, splitRigid } from './proximity.ts';
import type { Railed, Stretched } from './rails.ts';
import { aboutAxis, attitudeBetween, fromAxes, multiply, normalize as normalizeQ, type Quat, rotateFor, turn as turnQ } from './rigid.ts';
import { enrolled } from './roster.ts';
import { nozzleThrust } from './thrust.ts';
import type { LiveSample } from './vehicle.ts';

/** The integration step, s. */
export const STEP = 0.05;

/**
 * What the law solves for: the launch plane's inclination, the pitch-over's angle (both radians), and the tangent's rate of
 * fall, 1/s. Where the record gives the aiming azimuth the plane is the record's (`plane` is then not a number) and what is
 * solved in its place is `yaw`: how far the closed loop holds the thrust out of the launch plane, toward the vehicle's
 * left, radians, from the instant the tangent takes over. After a stored programme, `kick` is the step in the thrust's
 * angle above the level as the tangent takes over from it (`lawOf`).
 */
export interface Solved {
  plane: number;
  kick: number;
  rate: number;
  yaw?: number;
  /**
   * Where the guidance has a stage lit again in orbit to leave it (`Guidance.injection`): that burn's own linear tangent,
   * its angle above the local level as it lights (radians), the rate its tangent falls at (1/s), and how far it is held out
   * of the plane of the motion toward the orbit's pole (radians), solved for the injection's target (`steer`).
   */
  injection?: { theta: number; rate: number; yaw: number };
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
  /**
   * The spacecraft's state as it separates, for the coast: from `ascend`, as the stack was that instant (the last sample's);
   * from `flyWhole`, pushed off by the joint that let it go (`partedOff`), which is what the coast begins from.
   */
  separation: { t: number; r: Vec3; v: Vec3 };
  /** What parted there, kg: the spacecraft that goes on, and the last stage as it was let go. */
  parted: { kept: number; gone: number };
  /** The launch plane's pole (the law's thrust lies square to it): the vehicle's left, as it stood on the pad. */
  plane: Vec3;
  /** The thrust's angle above the local level as the tangent law took over (`Guidance`), radians: what the law flies from there. */
  thetaTurn: number;
  /**
   * Where a stage lit again in orbit stopped (`Guidance.injection`): when, its height over the sea, m, space-fixed speed, m/s,
   * climb above the geocentric level and the orbit's inclination, degrees, eccentricity, twice the orbit's energy (C3,
   * m^2/s^2: negative, still bound to the Earth) and the mass, kg. The ascent's checks read it as `injection.<field>`.
   */
  injected?: {
    at: number;
    altitude: number;
    speed: number;
    climb: number;
    inclination: number;
    eccentricity: number;
    energy: number;
    mass: number;
  };
  /** Where it stood as the injection lit (`Resumed`), where it has one. */
  lighting?: Resumed;
}

/** The whole flight: ascent flown, then the coast from where it left the spacecraft. */
export interface FlownWhole {
  ascent: Ascended;
  coast: OrbitFlown;
  /** The bodies that come down from the ejection height, where the record has them (orbital.ts: flyDown). */
  down: ReturnType<typeof flyDown> | null;
  /** The craft the flight's manoeuvres are made on, where its plan has one: flown on its own forces (`targetOf`). */
  target?: Target;
  /** The plan as the coast and the descent flew it, where guidance timed the braking burn (`OrbitFlown.plan`). Left out, the flight's. */
  plan?: FlightPlan;
  /** Every craft of the run, where its plan has a joint made in flight (`flySeveral`): the coast is the followed one's. */
  crafts?: Crafts;
}

/** One unit's nozzle exit area, m^2: given, or (vacuum less sea-level thrust) over one atmosphere. Nothing for an engine with no sea-level figure. */
export function exitAreaOf(e: Pick<EngineDef, 'exitArea' | 'thrust'>): number {
  if (e.exitArea) return e.exitArea.value;
  return e.thrust.seaLevel ? (e.thrust.vacuum.value - e.thrust.seaLevel.value) / P0 : 0;
}

/** One unit's rated propellant flow, kg/s. */
export const flowOf = (e: Pick<EngineDef, 'thrust' | 'isp'>): number => e.thrust.vacuum.value / (G0 * e.isp!.vacuum.value);

/**
 * An engine's decay after its cut (`EngineDef.decay`), cut at `share` of its rated thrust: how long its thrust takes to
 * fall evenly from that to nothing, s, so as to give one unit's cutoff impulse. Null for an engine with none.
 */
export function decayOf(st: { engine: Pick<EngineDef, 'decay' | 'thrust'> }, share: number): { lasts: number } | null {
  const impulse = st.engine.decay?.value ?? 0;
  const thrust = share * st.engine.thrust.vacuum.value;
  return impulse > 0 && thrust > 0 ? { lasts: (2 * impulse) / thrust } : null;
}

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
  /** The share of its rated flow it draws against seconds from liftoff: its `throttle.flow` where the record has one, else its throttle setting. */
  drawn?: Curve;
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
      ...((engine.throttle?.flow ?? engine.throttle?.curve) ? { drawn: engine.throttle?.flow ?? engine.throttle?.curve } : {}),
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
export function schedule(
  plan: FlightPlan,
  seq = sequenceOf(plan),
  stopped: readonly (number | undefined)[] = [],
): { from: number; to: number; dry: boolean }[] {
  const stages = stagesOf(plan);
  // (a stage cut on its velocity burns until it is dry at the latest: its load over its flow, at the least throttle there
  // is, past that; one with no cut of its own is shut down as it is let go; one the run has already seen stop, `stopped`, stops then)
  const cutoffOf = (i: number) => {
    if (stopped[i] !== undefined) return stopped[i]!;
    const k = seq.stages[i]!;
    return k.speed || k.orbit ? k.from + (10 * stages[i]!.load) / flowOf(stages[i]!.engine) : (k.cut ?? k.sep);
  };
  /** When a tank several stages draw on is empty, each burning from its lighting to its own cut: Infinity if it never is. */
  const sharedDry = (shares: number[]): number => {
    const holder = stages[shares[0]!]!.holder;
    const load = stages[shares[0]!]!.load * holder.count;
    const drawn = (t: number) =>
      shares.reduce((sum, j) => {
        const from = seq.stages[j]!.from;
        return sum + stages[j]!.count * flowOf(stages[j]!.engine) * integral(stages[j]!.drawn, from, Math.min(t, cutoffOf(j)));
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
    const burned = (t: number) => flowOf(s.engine) * integral(s.drawn, from, t);
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
      const orbit = Boolean(cut?.when.some((w) => 'orbit' in w));
      const parting = joint && doing((a) => 'separate' in a && a.separate === joint.id);
      // let go so long after its own cut, where that cut is not the clock's (the guidance's, on the orbit): the record's
      // interval, kept from whenever the run cuts it
      const follows = cut && parting?.when.length === 1 ? parting.when.find((w) => 'after' in w && w.after === cut.id) : undefined;
      const wait = follows && 'after' in follows ? (follows.wait ?? 0) : null;
      return {
        from: timeOf(doing((a) => 'ignite' in a && a.ignite === e.id)) ?? Infinity,
        cut: cut && !speed && !orbit ? timeOf(cut) : null,
        speed: speed && 'speed' in speed ? { value: speed.speed, apparent: Boolean(speed.apparent) } : null,
        /** Cut by its guidance when the orbit it is on is the record's (a trigger `{ orbit }`). */
        orbit,
        /** When it is let go: at an instant of the clock's; or, let go `wait` after a cut that is not the clock's, the record's instant of it (the run's own is its stop and `wait`). */
        sep: (parting && (timeOf(parting) ?? (wait !== null ? (parting.at?.value ?? null) : null))) ?? Infinity,
        wait: parting && timeOf(parting) === null ? wait : null,
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
  /**
   * How the launch vehicle lies once it is in orbit and still attached, where the record gives its attitude programme
   * (`Guidance.attached`): turned from where the law left it (`from`) to the programme's pitch from the local level
   * along the motion over the alignment, and from the freeze held among the stars. Held, it climbs against the turning
   * level at the rate the stack goes round (its angular rate now, taken as steady since the freeze: within a few tenths
   * of a degree over the minutes it is held), so the law needs no memory of the state at the freeze and is the same
   * for every run. Part of the law: what the stage lets out pushes along it (`stackOf` `vent`).
   */
  const attachedAt = (s: State, t: number, from: Vec3): Vec3 => {
    const a = g.attached!;
    const [begin, end] = a.align.map((x) => x.value) as [number, number];
    const up = frame.up(s.r, t);
    const level = unit(sub(s.v, scale(up, dot(s.v, up))));
    const freeze = a.freeze.value;
    const turning = length(cross(s.r, s.v)) / dot(s.r, s.r);
    const pitch = along(a.pitch, Math.min(t, freeze)) * DEG + (t > freeze ? turning * (t - freeze) : 0);
    const axis = add(scale(level, Math.cos(pitch)), scale(up, Math.sin(pitch)));
    const blend = Math.min(1, (t - begin) / (end - begin));
    return blend >= 1 ? axis : unit(add(scale(from, 1 - blend), scale(axis, blend)));
  };
  const steady = (s: State, t: number, m: Mode, wind: Vec3, thetaTurn: number): Vec3 =>
    g.attached && t >= g.attached.align[0].value ? attachedAt(s, t, lawAt(s, t, m, wind, thetaTurn)) : lawAt(s, t, m, wind, thetaTurn);
  // a stage lit again in orbit to leave it (`Guidance.injection`): its own tangent from its lighting, in the plane of the motion
  // and held out of it by its yaw; before it lights, from `align` ahead of the record's lighting, the vehicle is turned to
  // where that law starts and held there. Its lighting is the run's (`lit`: the batch run's, the live vehicle's), else the record's
  const injection = injectionOf(plan);
  const injected = (s: State, since: number): Vec3 => {
    const k = x.injection!;
    const u = unit(s.r);
    const h = unit(sub(s.v, scale(u, dot(s.v, u))));
    const pole = unit(cross(s.r, s.v));
    const theta = Math.atan(Math.tan(k.theta) - k.rate * since);
    const inPlane = add(scale(h, Math.cos(theta)), scale(u, Math.sin(theta)));
    return add(scale(inPlane, Math.cos(k.yaw)), scale(pole, Math.sin(k.yaw)));
  };
  const axisAt = (s: State, t: number, m: Mode, wind: Vec3, thetaTurn: number, lit?: number): Vec3 => {
    if (!injection || !x.injection) return steady(s, t, m, wind, thetaTurn);
    const from = lit ?? injection.lit;
    if (t >= from) return injected(s, t - from);
    const begin = injection.lit - injection.align;
    if (t < begin) return steady(s, t, m, wind, thetaTurn);
    const blend = Math.min(1, (t - begin) / injection.align);
    const was = steady(s, t, m, wind, thetaTurn);
    return blend >= 1 ? injected(s, 0) : unit(add(scale(was, 1 - blend), scale(injected(s, 0), blend)));
  };
  const lawAt = (s: State, t: number, m: Mode, wind: Vec3, thetaTurn: number): Vec3 => {
    // a stored programme is the first part of the law, the gyros' own: it is flown open, as it was, until the tangent takes over
    if (g.programme && m !== 'tangent') return tilted(along(g.programme, t) * DEG);
    if (g.lost && t >= g.lost.at.value) return tilted(along(g.lost.tilt, t) * DEG);
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
    const inPlane = add(scale(h, Math.cos(theta)), scale(u, Math.sin(theta)));
    // out of the launch plane by the yaw the law solved for (the closed loop steering to the orbit's plane): none, in it
    return x.yaw ? add(scale(inPlane, Math.cos(x.yaw)), scale(n, Math.sin(x.yaw))) : inPlane;
  };
  /** Which part of the law holds at `t`. */
  const modeAt = (t: number): Mode => (t < tVertical ? 'vertical' : t < tTurn ? 'turn' : 'tangent');
  /**
   * The thrust's angle above the local level as the tangent takes over at a state, radians: where the turn left the axis;
   * after a stored programme, that and the step the law solves for (`Solved.kick`: the closed loop's first command, which
   * need not be where the open programme left the axis).
   */
  const thetaAt = (s: State, t: number, wind: Vec3): number => {
    const theta = Math.asin(Math.max(-1, Math.min(1, dot(axisAt(s, t, 'turn', wind, 0), localAt(s.r).u))));
    return g.programme ? theta + x.kick : theta;
  };
  return { n, pad, up0, down0, localAt, axisAt, modeAt, thetaAt, tVertical, tKicked, tTurn };
}

/**
 * A stage the guidance lights again in orbit to leave it (orbital.ts `Guidance.injection`): its index among the stages, the
 * record's instant of its lighting, s, and how long before that the vehicle is turned to its attitude, s. Null for a plan
 * with none (every flight but a Saturn V's).
 */
export function injectionOf(plan: FlightPlan): { stage: number; lit: number; align: number } | null {
  const g = guidanceOf(plan).injection;
  if (!g) return null;
  const stage = stagesOf(plan).findIndex((s) => s.engine.id === g.engine);
  if (stage < 0) throw new Error(`the injection lights '${g.engine}', which is no stage of the plan`);
  return { stage, lit: sequenceOf(plan).stages[stage]!.from, align: g.align.value };
}

/**
 * The stage whose cutoff the law's target is at (`Guidance.target.at`, the record's id of the event that cuts it): the last,
 * on every flight whose ascent ends there; an earlier one where a stage is lit again after it (the injection).
 */
export function targetStageOf(plan: FlightPlan): number {
  const stages = stagesOf(plan);
  const at = guidanceOf(plan).target.at;
  const cutting = plan.events.find((e) => (e.record?.id === at || e.id === at) && e.do.some((a) => 'cut' in a));
  const engine = cutting?.do.find((a) => 'cut' in a);
  const i = engine && 'cut' in engine ? stages.findIndex((s) => s.engine.id === engine.cut) : -1;
  return i < 0 ? stages.length - 1 : i;
}

/**
 * How far a state is short of the record's orbit (world/meanelements.ts `shortOfPublished`: nothing or less, reached), for a
 * plan whose guidance cuts a stage on it (plan.ts: a trigger `{ orbit }`); null for a plan with no such cut. One reading
 * for the batch run, the live vehicle's pilot and the path ahead.
 */
export function orbitShort(plan: FlightPlan, site: Geodetic): ((r: Vec3, v: Vec3) => number) | null {
  if (!sequenceOf(plan).stages.some((k) => k.orbit)) return null;
  const short = shortOfPublished(publishedOf(plan, site));
  // The orbit that counts is the one the spacecraft is left on, so the guidance cuts for what the parting will add: the
  // spacecraft's share of its last joint's push (`partedOff`), by the plan's own masses (the spacecraft as it is in orbit,
  // the last stage empty), along the way it is going. A guidance knows its own vehicle; it is not told the flight's state.
  const push = pushAhead(plan);
  if (!push) return short;
  return (r, v) => short(r, add(v, scale(unit(v), push)));
}

/**
 * The speed the last joint's push will give the spacecraft as it parts, m/s, by the plan's masses: the spacecraft as it is
 * in orbit against its last stage with its tanks empty. Nothing, for a plan whose last joint pushes nothing, or whose last
 * stage is lit again after the orbit is reached (an injection): the spacecraft is left on the orbit the injection gives,
 * and the parking orbit is cut for itself.
 */
export function pushAhead(plan: FlightPlan): number {
  if (injectionOf(plan)) return 0;
  const c = plan.craft[0]!;
  const last = stagesOf(plan).at(-1)!;
  const joint = sequenceOf(plan).stages.at(-1)!.joint;
  const push = c.joints.find((j) => j.id === joint)?.push ?? c.sheds?.find((shed) => shed.on === joint)?.push;
  const kept = plan.record?.orbit?.mass.value;
  if (!push || !kept) return 0;
  const held = c.tanks.filter((t) => t.body === last.body.id).reduce((sum, t) => sum + (t.usable ?? t.load).value, 0);
  return keptShare(push.value, kept, last.body.count * (last.body.mass.value - held));
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
  const lastBody = stages[stages.length - 1]!.body.id;
  const vents = (plan.craft[0]!.vents ?? []).filter((v) => v.body === lastBody);
  return {
    flows,
    areas,
    throttle,
    /**
     * What the last stage lets out at `t`, N along the long axis (`Craft.vents`): for whoever flies the stack to add
     * once that stage has stopped and while it is still on. Nothing outside its curves.
     */
    vent: (t: number): number => {
      let f = 0;
      for (const v of vents) {
        const p = v.thrust.points;
        if (t >= p[0]![0] && t <= p[p.length - 1]![0]) f += along(v.thrust, t);
      }
      return f;
    },
    burned: (i: number, from: number, t: number) => flows[i]! * integral(stages[i]!.drawn, from, t),
    thrust: (i: number, t: number, pressure: number) =>
      nozzleThrust(stages[i]!.count, stages[i]!.engine.thrust.vacuum.value, throttle(i, t), areas[i]!, pressure),
    /** What stage `i`, cut at `cut`, still gives at `t` as its thrust decays (`decayOf`), N: nothing past its decay or with none. */
    decay: (i: number, cut: number, t: number, pressure: number): number => {
      const d = decayOf(stages[i]!, throttle(i, cut));
      if (!d || t < cut || t >= cut + d.lasts) return 0;
      const k = throttle(i, cut) * (1 - (t - cut) / d.lasts);
      return nozzleThrust(stages[i]!.count, stages[i]!.engine.thrust.vacuum.value, k, areas[i]!, pressure);
    },
    dragArea: (at: number, mach: number) => {
      const drag = drags.find((d) => at < d.until.value) ?? drags[drags.length - 1]!;
      return drag.area.value * along(drag.curve, mach);
    },
    /**
     * The force on the base along the long axis at a record instant `at` and a height over the sea, N (`DragDef.base`):
     * forward where the base's pressure is over the air's. Nothing for a piece with none, or past its `until`.
     */
    base: (at: number, altitude: number): number => {
      const drag = drags.find((d) => at < d.until.value) ?? drags[drags.length - 1]!;
      const b = drag.base;
      if (!b || at >= b.until.value) return 0;
      return b.factor.value * along(b.pressure, altitude) * drag.area.value;
    },
  };
}

/**
 * Fly the ascent with the law's unknowns as given. `site` and `frame` as flyOrbit's; `every`: how often a sample is
 * kept, s. Ends at the spacecraft's separation from the last stage; with `toCutoff`, at the last stage's stop, which is
 * all the law's solution reads (`steer`: the summary there), so a stage carried on round the Earth is not flown to solve it.
 */
export function ascend(
  fp: FlightPlan,
  site: Geodetic,
  frame: EarthFrame,
  seaLevel: number,
  x: Solved,
  every = 0.5,
  toCutoff: boolean | 'injection' = false,
  resume?: Resumed,
): Ascended {
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
  // the stage whose cutoff the law's target is at (the last but where one is lit again after it), and that one (`injectionOf`)
  const cutoff = targetStageOf(fp);
  const injection = injectionOf(fp);
  const stopAt = toCutoff === 'injection' && injection ? injection.stage : cutoff;
  // the spacecraft parts from the last stage as it is let go: at its instant, or (where the plan lets it go so long after a
  // cut that is the guidance's) that long after the stage stops, which the run finds
  const lastOf = seq.stages[seq.stages.length - 1]!;
  let tPart = lastOf.wait === null ? lastOf.sep : Infinity;
  // a stage its guidance cuts on the orbit: how far the state is short of the record's (nothing or less: reached)
  const short = orbitShort(fp, site);
  /** How far past its guidance's cut a stage cut on the state is: its space-fixed speed over its setting, m/s, or the orbit's period over the record's, s. */
  const past = (i: number, s: State): number => (seq.stages[i]!.orbit ? -short!(s.r, s.v) : length(s.v) - cutAt[i]!);
  // (a last stage that is itself the spacecraft, an Agena putting itself in orbit, is let go of by nothing: the ascent ends
  // as its engine stops, which the run finds where it is cut on its speed)
  const own = !Number.isFinite(lastOf.sep) && lastOf.wait === null;
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
  // (what the stack that flies on gains as a joint below the spacecraft parts, `JointDef.ahead`: its own motors' impulse, at the instant)
  const aheads = fp.craft[0]!.joints.flatMap((j) => {
    const at = seq.stages.find((k) => k.joint === j.id)?.sep ?? seq.drop(j.id);
    return j.ahead && Number.isFinite(at) ? [{ at, dv: j.ahead.value }] : [];
  });
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

  let mode: Mode = resume?.mode ?? 'vertical';
  let thetaTurn = resume?.thetaTurn ?? 0; // the thrust's angle above the local level as the tangent law takes over
  const airHere = airOf(seaLevel, frame, skyOf(fp));
  // (the Moon and the Sun where the plan names them, `FlightPlan.gravity`: added to the step, not to what an accelerometer reads)
  const field = fieldFor(fp.gravity, frame);
  const axisAt = (s: State, t: number, m: Mode, wind: Vec3): Vec3 =>
    law.axisAt(s, t, m, wind, thetaTurn, injection ? plan[injection.stage]!.from : undefined);
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
      // (cut, and its body still on: what its decay still gives)
      else if (as >= plan[i]!.to && as < stageSep[i]! && plan[i]!.to > plan[i]!.from)
        thrust += stack.decay(i, plan[i]!.to, t, air.air.pressure);
    });
    // (the last stage, stopped and still on: what it lets out pushes the stack along its axis)
    if (as >= plan[plan.length - 1]!.to) thrust += stack.vent(t);
    // (the force on the base, where the drag has one: along the axis, as the thrust is)
    thrust += stack.base(as, air.altitude);
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
      ...plan.flatMap((p, i) => {
        const d = Number.isFinite(p.to) && p.to > p.from ? decayOf(stages[i]!, throttle(i, p.to)) : null;
        return d ? [p.to + d.lasts] : [];
      }),
      ...stageSep.filter(Number.isFinite),
      ...drops.map((d) => d.at),
      ...fp.craft[0]!.drag.map((d) => d.until.value),
      ...(g.programme?.points ?? []).map(([at]) => at),
      ...(g.lost ? [g.lost.at.value, ...g.lost.tilt.points.map(([at]) => at)] : []),
      ...(g.attached ? [...g.attached.align.map((t) => t.value), g.attached.freeze.value] : []),
      ...seq.instants.map((x) => x.at),
      ...(fp.record?.coastFixes ?? []).map((fix) => fix.at.value),
    ]),
  ]
    .filter((m) => m > 0 && m <= tPart && Number.isFinite(m))
    .sort((p, q) => p - q);

  let t = resume?.t ?? 0;
  let state: State = resume?.state ?? { r: pad, v: cross(spin, pad) };
  if (resume) {
    plan.splice(0, plan.length, ...resume.plan.map((p) => ({ ...p })));
    tPart = resume.tPart;
    marks.splice(0, marks.length, ...resume.marks);
  }
  const samples: AscentSample[] = [sample(state, t)];
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
  if (resume) Object.assign(summary, resume.summary);
  let kept = resume?.kept ?? 0;
  let injected: Ascended['injected'];
  let lighting: Resumed | undefined;
  /** The state as the injection stops (`Ascended.injected`): its sample's height and climb, and the orbit it leaves on. */
  const injectedAt = (at: number, st: State, sm: AscentSample): NonNullable<Ascended['injected']> => {
    const el = elementsOf(st.r, st.v);
    return {
      at,
      altitude: sm.altitude,
      speed: length(st.v),
      climb: Math.asin(dot(unit(st.r), unit(st.v))) / DEG,
      inclination: el.i / DEG,
      eccentricity: el.e,
      energy: dot(st.v, st.v) - (2 * EARTH.gm.value) / length(st.r),
      mass: sm.mass,
    };
  };

  while (t < tPart - 1e-9) {
    const mark = marks.find((m) => m > t + 1e-9) ?? tPart;
    // (coasting once past the law's target with nothing burning: every lighting is a mark, so a step never passes one)
    const coasting = tPart - tEnd > 60 && t >= tEnd && plan.every((p) => !(t >= p.from && t < p.to));
    const interval = coasting ? Math.max(10, every) : every;
    const h = Math.min(coasting ? 10 : STEP, mark - t);
    const gone = droppedBy(t);
    const m = mode;
    const [before, t0] = [state, t];
    state = stepIn(field, state, t, h, (s, tt) => forces(s, tt, m, gone, t0).accel);
    t = Math.abs(t + h - mark) < 1e-9 ? mark : t + h;
    // (an impulse: the stack as it stood and as it went on, two samples at the one instant)
    for (const k of aheads)
      if (t === k.at) {
        samples.push(sample(state, t));
        state = { r: state.r, v: add(state.v, scale(axisAt(state, t, mode, airHere(state, t).ground), k.dv)) };
      }
    // a stage cut on its velocity, when it reaches it in this step: the step is flown again to the instant it does, found by
    // the secant on the step's length (so the instant is a smooth function of the inputs, as the law's solution needs)
    const crossing = seq.stages.findIndex(
      (k, i) => (k.orbit || (k.speed && !k.speed.apparent)) && t > plan[i]!.from && t <= plan[i]!.to && past(i, state) >= 0,
    );
    if (crossing >= 0 && past(crossing, before) < 0) {
      const at = (k: number) =>
        past(
          crossing,
          stepIn(field, before, t0, h * k, (q, tt) => forces(q, tt, m, gone, t0).accel),
        );
      let [k0, f0, k1, f1] = [0, past(crossing, before), 1, past(crossing, state)];
      for (let n = 0; n < 8 && Math.abs(f1) > 1e-9; n++) {
        const k2 = Math.min(1, Math.max(0, k1 - (f1 * (k1 - k0)) / (f1 - f0)));
        [k0, f0, k1, f1] = [k1, f1, k2, at(k2)];
      }
      state = stepIn(field, before, t0, h * k1, (q, tt) => forces(q, tt, m, gone, t0).accel);
      t = t0 + h * k1;
      plan[crossing]!.to = t;
      // (a tank it shares runs dry later now it has stopped: the stages that draw on it with it burn on to their own cut)
      const shares = stages[crossing]!.shares;
      if (shares.length > 1) {
        const again = schedule(
          fp,
          seq,
          plan.map((p, i) => (i !== crossing && t < p.to && (seq.stages[i]!.speed || p.dry) ? undefined : p.to)),
        );
        // (and one cut on its speed that is lit again later on the same tank, an injection, burns what this one left)
        for (const j of shares)
          if (j !== crossing && plan[j]!.to > t && (!seq.stages[j]!.speed || (plan[j]!.dry && plan[j]!.from > t))) plan[j] = again[j]!;
      }
    }
    // the last stage has stopped: the spacecraft is let go so long after, where the plan has it follow the stop
    if (tPart === Infinity && lastOf.wait !== null && t >= plan[plan.length - 1]!.to) {
      tPart = plan[plan.length - 1]!.to + lastOf.wait;
      marks.push(tPart);
      marks.sort((p, q) => p - q);
    }
    // (one that is itself the spacecraft: the ascent ends as its engine stops)
    if (own && tPart === Infinity && t >= plan[plan.length - 1]!.to) tPart = t;
    const s = sample(state, t);
    // the loads, as they stand before whatever happens at this instant
    if (s.q > summary.maxQ) [summary.maxQ, summary.maxQAt] = [s.q, t];
    if (t <= firstOff) summary.firstG = Math.max(summary.firstG, s.g);
    else if (t <= coreOff) summary.coreG = Math.max(summary.coreG, s.g);
    else if (t <= plan[plan.length - 1]!.to) summary.lastG = Math.max(summary.lastG, s.g);
    if (t === 60) summary.minuteG = s.g;
    for (const x of seq.instants) if (x.at === t) at[x.id] = s;
    if (t === plan[cutoff]!.to) Object.assign(summary, atCutoff(fp, t, state, pad));
    if (injection && t === plan[injection.stage]!.to && Number.isFinite(plan[injection.stage]!.from)) injected = injectedAt(t, state, s);
    if (toCutoff && t === plan[stopAt]!.to) {
      tPart = t;
      samples.push(s);
      break;
    }
    // the law's own changes, at the end of a step
    if (mode === 'vertical' && t >= tVertical) mode = 'turn';
    if (mode === 'turn' && t >= tTurn) {
      thetaTurn = law.thetaAt(state, t, airHere(state, t).ground);
      mode = 'tangent';
    }
    // (kept at every mark, and where a stage its guidance cut on the state stopped: the run's own instant of it)
    if (t - kept >= interval - 1e-9 || marks.includes(t) || plan.some((p) => p.to === t)) {
      samples.push(s);
      kept = t;
    }
    // (where it stands as the injection lights: nothing after depends on how the ascent got there but this)
    if (injection && !lighting && t === plan[injection.stage]!.from)
      lighting = { t, state, mode, thetaTurn, plan: plan.map((p) => ({ ...p })), summary: { ...summary }, kept, tPart, marks: [...marks] };
  }
  // (`burned` is one unit's: a stage's count multiplies it)
  // (and the last stage, as it lets the spacecraft go, takes what it weighed fuelled less what it burned)
  const last = stages.length - 1;
  const lastBody = stages[last]!.body;
  const lastLeft = own ? 0 : lastBody.count * (lastBody.mass.value - drawnFrom(stages, lastBody.id, (j) => burned(j, tPart)));
  summary.massLeft = liftoff - droppedBy(tPart - 1e-9) - stages.reduce((sum, st, i) => sum + st.count * burned(i, tPart), 0) - lastLeft;
  return {
    samples,
    at,
    summary,
    solved: x,
    stops: plan.map((p) => p.to),
    left: stages.map((s, i) => s.load - drawnFrom(stages, s.holder.id, (j) => burned(j, plan[i]!.to))),
    separation: { t: tPart, r: state.r, v: state.v },
    parted: { kept: summary.massLeft, gone: lastLeft },
    plane: n,
    thetaTurn,
    ...(injected ? { injected } : {}),
    ...(lighting ? { lighting } : {}),
  };
}

/**
 * An ascent as it stood at an instant (`Ascended.lighting`: as a stage lit again in orbit lights), to go on from: the state, the
 * law's part and its angle, each stage's burn as the run has it, the summary so far, and the instants the steps end on.
 * What the injection's law is solved from (`inject`), so that what comes before it is flown once.
 */
export interface Resumed {
  t: number;
  state: State;
  mode: Mode;
  thetaTurn: number;
  plan: { from: number; to: number; dry: boolean }[];
  summary: AscentSummary;
  kept: number;
  tPart: number;
  marks: number[];
}

/**
 * Solve the law's three unknowns so that the last cutoff comes at the target's height (over the reference ball, or over the
 * ellipsoid under the cutoff where the record's height is that: `target.over`), its climb and its inclination: Newton's method on finite
 * differences. With no aiming azimuth the unknowns are the launch plane, the pitch-over and the tangent's rate, from a
 * start that is the target's inclination, a pitch-over of eight degrees and a tangent falling a thousandth a second. With
 * one, the plane is the record's and the third unknown is the yaw the tangent holds out of it (from none); after a stored
 * programme the pitch-over's place is taken by the step in the axis as the tangent takes over (from none). Throws if it
 * does not converge: a law that cannot reach its target is a finding, not something to paper over.
 */
export function steer(plan: FlightPlan, site: Geodetic, frame: EarthFrame, seaLevel = 0): Solved {
  if (plan.planned) return steer(plan.planned, site, frame, seaLevel);
  // (the same plan, site and frame solve to the same law: kept, so a page or a test asking again does not fly it all again;
  // a plan changed in place since is solved afresh, by what it says)
  const key = JSON.stringify([site, seaLevel, frame.jdTT(0), frame.toInertial([1, 0, 0], 0), frame.toInertial([0, 1, 0], 1000)]);
  const says = JSON.stringify(plan);
  const kept = solvedFor.get(plan)?.get(key);
  if (kept && kept.says === says) return { ...kept.x };
  const x = solve(plan, site, frame, seaLevel);
  if (!solvedFor.has(plan)) solvedFor.set(plan, new Map());
  solvedFor.get(plan)!.set(key, { says, x });
  return { ...x };
}
const solvedFor = new WeakMap<FlightPlan, Map<string, { says: string; x: Solved }>>();

/** `steer`'s work: the law's unknowns solved by Newton's method, as it says. */
function solve(plan: FlightPlan, site: Geodetic, frame: EarthFrame, seaLevel: number): Solved {
  const g = guidanceOf(plan);
  const radius = heightsBall(plan, site);
  const want = [radius + g.target.altitude.value, g.target.climb.value * DEG, g.target.inclination.value * DEG];
  const aimed = Boolean(g.azimuth);
  const vec = (x: Solved) => (aimed ? [x.kick, x.rate, x.yaw ?? 0] : [x.plane, x.kick, x.rate]);
  const of = (v: number[]): Solved =>
    aimed ? { plane: Number.NaN, kick: v[0]!, rate: v[1]!, yaw: v[2]! } : { plane: v[0]!, kick: v[1]!, rate: v[2]! };
  const miss = (x: Solved): number[] => {
    const a = ascend(plan, site, frame, seaLevel, x, Infinity, true);
    const s = a.summary;
    // (a sample's altitude is over the sea, which stands `seaLevel` over the ellipsoid)
    const high = g.target.over ? a.samples.at(-1)!.altitude + seaLevel - g.target.altitude.value : s.cutoffAltitude + radius - want[0]!;
    return [high / 10_000, s.cutoffClimb * DEG - want[1]!, s.inclination * DEG - want[2]!];
  };
  const start: Solved = aimed
    ? { plane: Number.NaN, kick: g.programme ? 0 : 8 * DEG, rate: 1e-3, yaw: 0 }
    : { plane: want[2]!, kick: 8 * DEG, rate: 1e-3 };
  // (a start the stack comes down from before its cutoff, where Newton's method from it does not converge: a heavy first
  // stage barely faster than its weight turns over on eight degrees of pitch-over and falls. The pitch-over is halved until
  // the cutoff is in the air, and bisected between that and the one that fell for the cutoff at the target's height, and
  // Newton's method goes again from there. Every flight whose solve converges from the start is not touched)
  const down = (y: Solved): number => miss(y)[0]! * 10_000 + (g.target.over ? g.target.altitude.value : want[0]! - radius);
  const airborne = (from: Solved): Solved => {
    let y = { ...from };
    let fell = y.kick;
    for (let k = 0; k < 20 && down(y) < 0; k++) [fell, y] = [y.kick, { ...y, kick: y.kick / 2 }];
    let climbs = y.kick;
    for (let k = 0; k < 30; k++) {
      const mid = { ...y, kick: (fell + climbs) / 2 };
      if (miss(mid)[0]! < 0) fell = mid.kick;
      else climbs = mid.kick;
    }
    return { ...y, kick: (fell + climbs) / 2 };
  };
  // (the angles a millionth of a radian, the rate a thousand-millionth a second)
  const eps = aimed ? [1e-6, 1e-9, 1e-6] : [1e-6, 1e-6, 1e-9];
  const angles = aimed ? [0, 2] : [0, 1];
  /** Newton's method from `x`: the solution, or null where it does not converge. */
  const newton = (from: Solved): Solved | null => {
    let x = from;
    // (eighty steps: a start that is far off, its damped steps two degrees at most, can take more than forty to come in, and
    // one that converges sooner stops where it did)
    for (let k = 0; k < 80; k++) {
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
      // a damped step: never more than two degrees of any angle at once
      const most = Math.max(...angles.map((i) => Math.abs(d[i]!) / (2 * DEG)), 1);
      x = of(v.map((y, i) => y + d[i]! / most));
      // (a plane inclined less than the pad's latitude does not pass over it: a step that would leave the planes that do is
      // held at their edge, so the solve goes on from one it can fly)
      x.plane = Math.max(x.plane, Math.abs(site.latitude) * DEG + 1e-4);
    }
    return null;
  };
  const found = newton(start) ?? newton(airborne(start));
  if (found) return g.injection ? inject(plan, site, frame, seaLevel, found) : found;
  throw new Error('the ascent’s steering law did not reach its target');
}

/**
 * The injection's law solved, once the ascent's is (`Guidance.injection`): its three unknowns (the angle it lights at above
 * the local level, its tangent's rate and its yaw out of the plane of the motion) by Newton's method on finite differences,
 * so that the stage lit again stops at the target's height (over the sea's ellipsoid where the record's is a trajectory
 * table's: `target.over`), climb and inclination, the stage cut as the record cuts it (its speed). From a start along the
 * level, its tangent falling a thousandth a second, in the plane. Throws if it does not converge.
 */
function inject(plan: FlightPlan, site: Geodetic, frame: EarthFrame, seaLevel: number, ascent: Solved): Solved {
  const g = guidanceOf(plan).injection!;
  const radius = heightsBall(plan, site);
  const want = [g.target.altitude.value, g.target.climb.value * DEG, g.target.inclination.value * DEG];
  const of = (v: number[]): Solved => ({ ...ascent, injection: { theta: v[0]!, rate: v[1]!, yaw: v[2]! } });
  // (what comes before the injection lights does not turn on its law: flown once, and each try goes on from there)
  let from: Resumed | undefined;
  const miss = (x: Solved): number[] => {
    const a = ascend(plan, site, frame, seaLevel, x, Infinity, 'injection', from);
    from ??= a.lighting;
    const s = a.injected;
    if (!s) throw new Error('the injection never stopped: its stage is not lit, or never reaches its cut');
    const high = g.target.over ? s.altitude + seaLevel : length(a.separation.r) - radius;
    return [(high - want[0]!) / 10_000, s.climb * DEG - want[1]!, s.inclination * DEG - want[2]!];
  };
  let v = [0, 1e-3, 0];
  const eps = [1e-6, 1e-9, 1e-6];
  for (let k = 0; k < 40; k++) {
    const f = miss(of(v));
    if (Math.hypot(...f) < 1e-8) return of(v);
    const J = v.map((_, j) => {
      const w = [...v];
      w[j]! += eps[j]!;
      const fj = miss(of(w));
      return fj.map((y, i) => (y - f[i]!) / eps[j]!);
    });
    const d = solve3(
      [0, 1, 2].map((i) => [0, 1, 2].map((j) => J[j]![i]!)),
      f.map((y) => -y),
    );
    const most = Math.max(Math.abs(d[0]!) / (2 * DEG), Math.abs(d[2]!) / (2 * DEG), 1);
    v = v.map((y, i) => y + d[i]! / most);
  }
  throw new Error('the injection’s steering law did not reach its target');
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

/**
 * Fly the whole flight: the ascent on its solved law, then the coast from the spacecraft's separation (orbital.ts: flyOrbit),
 * begun from the state the ascent left it in and no other: one state from the pad to the ground, changed only by what
 * pushes it. The record's orbit, tracking and landing are what the run is held against, never what it is put on.
 */
export function flyWhole(plan: FlightPlan, site: Geodetic, frame: EarthFrame, seaLevel = 0, solved?: Solved, every = 10): FlownWhole {
  const x = solved ?? steer(plan, site, frame, seaLevel);
  const ascent = ascend(plan, site, frame, seaLevel, x);
  ascent.separation = partedOff(plan, ascent);
  // (a plan with a joint made in flight flies its craft together from the parting, through the docking, before the coast)
  const several = formsJoints(plan) ? flySeveral(plan, frame, seaLevel, ascent) : null;
  const target = several ? several.target : targetOf(plan, frame, seaLevel, ascent);
  const coast = flyOrbit(plan, site, frame, seaLevel, every, several?.from ?? ascent.separation, undefined, undefined, undefined, target);
  if (several) coast.samples.unshift(...several.samples);
  const end = coast.samples[coast.samples.length - 1]!;
  // (the plan as the coast flew it: its braking burn where guidance timed it for the landing place, orbital.ts `LandingAim`)
  const flown = coast.plan ?? plan;
  const down = downOf(flown) && end.phase === 'down' ? flyDown(flown, frame, seaLevel, end) : null;
  const crafts = several ? craftsOf(several, coast) : undefined;
  return { ascent, coast, down, ...(target ? { target } : {}), ...(coast.plan ? { plan: coast.plan } : {}), ...(crafts ? { crafts } : {}) };
}

/** Whether a plan has a joint made in flight (`JointDef.formed`): only such a plan's run is flown as several craft. */
export const formsJoints = (plan: FlightPlan): boolean => plan.craft.some((c) => c.joints.some((j) => j.formed));

/**
 * A run's craft (simulator.md, "Several craft in one run"): each one's track while they were flown together
 * (sim/proximity.ts), and after it the followed craft's coast and every other's flight on gravity alone. `at` finds a
 * craft by any body of it.
 */
export interface Crafts {
  tracks: readonly CraftTrack[];
  /** When the craft stopped being flown together, s from liftoff: from then the followed one is the coast's. */
  until: number;
  /** The followed craft's bodies from then. */
  followed: readonly string[];
  at(body: string, t: number): State | undefined;
}

interface Several {
  flown: ProximityFlown;
  samples: OrbitSample[];
  from: { t: number; r: Vec3; v: Vec3 };
  followed: Piece;
  others: { piece: Piece; target: Target }[];
  target?: Target;
}

/**
 * When the craft stop being flown together: once every docking the record's crew fly has been captured and drawn hard
 * (its record's instant of contact, and its retraction), and every parting the clock sets off by three hours after it
 * that is not the coast's own (its burn's body, its descent's) has been made.
 */
function severalUntil(plan: FlightPlan, from: number): number {
  const joints = plan.craft.flatMap((c) => c.joints);
  const contacts = joints.flatMap((j) =>
    j.formed?.approach ? [j.formed.approach.contact.value + j.formed.capture.retract.value + 60] : [],
  );
  const last = Math.max(from, ...contacts);
  let coastJoints = new Set<string>();
  try {
    const parting = coastOf(plan).parting;
    coastJoints = new Set(eventOf(plan, parting ?? '')?.do.flatMap((a) => ('separate' in a ? [a.separate] : [])) ?? []);
  } catch {
    // (a plan with no coast of its own: every parting is its craft's)
  }
  const later = plan.events.flatMap((e) => {
    const at = clockAt(plan, e);
    const parts = e.do.some((a) => ('separate' in a && !coastJoints.has(a.separate)) || 'dock' in a);
    return parts && at > from && at <= last + 3 * 3600 && at < Number.MAX_SAFE_INTEGER ? [at] : [];
  });
  return Math.max(last, ...later) + 1;
}

/** The machine as the ascent leaves it at the parting, `t`: every event the record had happened by then, and its partings. */
function machineAt(plan: FlightPlan, t: number): CraftState {
  let s = startCraft(plan);
  const fired: Record<string, number> = {};
  for (const e of plan.events) {
    const at = clockAt(plan, e);
    const when = Number.isFinite(at) && at < Number.MAX_SAFE_INTEGER ? at : e.at?.value;
    if (when === undefined || when > t + 1e-9) continue;
    // (what the parting's own event does besides is the craft's to do as they are flown together from it: the
    // spacecraft's crew setting off to dock)
    if (when >= t - 1e-9 && e.do.some((a) => 'dock' in a)) {
      for (const a of e.do)
        if ('separate' in a)
          s = partJoint(plan, { ...s, joints: { ...s.joints, [a.separate]: { ...s.joints[a.separate]!, loose: when } } }, a.separate, when);
      continue;
    }
    fired[e.id] = when;
    for (const a of e.do) {
      if ('separate' in a)
        s = partJoint(plan, { ...s, joints: { ...s.joints, [a.separate]: { ...s.joints[a.separate]!, loose: when } } }, a.separate, when);
      if ('attitude' in a) s = { ...s, attitude: a.attitude };
    }
  }
  const last = sequenceOf(plan).stages.at(-1)!.joint;
  if (last && !Number.isFinite(s.joints[last]?.gone ?? Infinity)) s = partJoint(plan, s, last, t);
  return { ...s, fired: { ...s.fired, ...fired } };
}

/** Each body's mass at the parting, kg: a piece's mass (the ascent's figures) shared as its bodies weighed at the pad, the stage that burned taking what is left. */
function massesAt(plan: FlightPlan, pieces: readonly { bodies: readonly string[]; mass: number }[]): Record<string, number> {
  const out: Record<string, number> = {};
  const c = plan.craft[0]!;
  for (const p of pieces) {
    const defs = p.bodies.map((id) => c.bodies.find((b) => b.id === id)!);
    const burned = defs.filter((b) => c.tanks.some((k) => k.body === b.id));
    const whole = (b: BodyDef) => b.mass.value * b.count;
    if (burned.length === 1) {
      const rest = defs.filter((b) => b !== burned[0]).reduce((m, b) => m + whole(b), 0);
      for (const b of defs) out[b.id] = b === burned[0] ? p.mass - rest : whole(b);
    } else {
      const sum = defs.reduce((m, b) => m + whole(b), 0);
      for (const b of defs) out[b.id] = (whole(b) * p.mass) / sum;
    }
  }
  return out;
}

/** An orbit sample of a craft's state, as the coast keeps one (`phase` 'orbit', its accelerometer's reading given). */
function orbitSampleOf(frame: EarthFrame, seaLevel: number, s: { t: number; r: Vec3; v: Vec3 }, g = 0): OrbitSample {
  const air = airAt(frame, s.r, s.v, s.t, seaLevel);
  const here = frame.place(s.r, s.t);
  return {
    t: s.t,
    phase: 'orbit',
    altitude: air.altitude,
    latitude: here.latitude,
    longitude: here.longitude,
    speed: length(s.v),
    groundSpeed: air.airspeed,
    g,
    q: air.q,
    mach: air.mach,
    sunlit: sunlit(s.r, frame.fromDate(sunPosition(frame.jdTT(s.t)))),
    r: s.r,
    v: s.v,
  };
}

/**
 * The craft of a plan with a joint made in flight flown together from its spacecraft's parting (sim/proximity.ts): the
 * stack as the ascent left it split by the parting's joint as a rigid body (forces.ts `part`, the joint's push shared by
 * the masses), every craft of the plan met in flight where its target (`TargetDef.body`) has it then, flown to
 * `severalUntil`. The followed craft's samples there are the coast's first; the others fly on by gravity alone.
 */
function flySeveral(plan: FlightPlan, frame: EarthFrame, seaLevel: number, ascent: Ascended): Several {
  const last = ascent.samples.at(-1)!;
  const t0 = last.t;
  const s = machineAt(plan, t0);
  const pieces = componentsOf(plan, s, t0);
  const followed = followedOf(plan, s, t0);
  const kept = pieces.find((p) => p.id === followed.id)!;
  const joint = plan.craft[0]!.joints.find((j) => j.id === sequenceOf(plan).stages.at(-1)!.joint);
  const stage = pieces.find((p) => p.bodies.includes(joint?.gone[0] ?? ''));
  if (!joint || !stage || stage === kept) throw new Error('the spacecraft’s parting lets no craft of its own go');
  const masses = massesAt(plan, [
    { bodies: kept.bodies, mass: ascent.parted.kept },
    { bodies: stage.bodies, mass: ascent.parted.gone },
  ]);
  const axis = unit(last.axis);
  const q = fromAxes(axis, ascent.plane, cross(axis, ascent.plane));
  const whole = { r: last.r, v: last.v, q, w: [0, 0, 0] as Vec3, laid: laidOf(plan, [...kept.bodies, ...stage.bodies], masses) };
  const push = joint.push?.value ?? plan.craft[0]!.sheds?.find((x) => x.on === joint.id)?.push?.value ?? 0;
  const [a, b] = splitRigid(plan, whole, kept.bodies, stage.bodies, push);
  const start: CraftStart[] = [
    { ...a, bodies: kept.bodies },
    { ...b, bodies: stage.bodies },
  ];
  // (a craft the plan meets in flight: where its target has it as the parting is made. What left the stack before the
  // parting, a stage or a tower, is not flown here)
  const def = plan.target;
  const own = new Set(plan.craft[0]!.bodies.map((b) => b.id));
  for (const p of pieces) {
    if (p === kept || p === stage || p.bodies.some((b) => own.has(b))) continue;
    const there = def && 'body' in def && def.body && p.bodies.includes(def.body) ? metOf(def, frame, seaLevel).at(t0) : undefined;
    if (!there)
      throw new Error(
        `craft '${p.id}' of the plan is met in flight, and nothing says where it is at ${t0} s: give the target its \`body\``,
      );
    const x = unit(there.v);
    const y = unit(cross(there.r, there.v));
    start.push({ ...there, q: fromAxes(x, y, cross(x, y)), bodies: p.bodies });
    for (const id of p.bodies) masses[id] = plan.craft.flatMap((c) => c.bodies).find((x) => x.id === id)!.mass.value;
  }
  const until = severalUntil(plan, t0);
  const flown = flyProximity(plan, frame, t0, s, start, masses, until, 1);
  const end = followedOf(plan, flown.state, flown.t);
  // (the followed craft's samples: whichever craft held the commander's body, in order)
  const body = end.bodies.find((x) => kept.bodies.includes(x)) ?? end.bodies[0]!;
  const samples = flown.tracks
    .filter((k) => k.bodies.includes(body) && k.until > k.from)
    .flatMap((k) => k.samples.filter((x) => x.t < flown.t - 1e-9).map((x) => orbitSampleOf(frame, seaLevel, x)));
  const last_ = flown.crafts.find((c) => c.piece.id === end.id)!.rigid;
  const field = fieldFor(plan.gravity, frame);
  const others = flown.crafts
    .filter((c) => c.piece.id !== end.id)
    .map((c) => ({ piece: c.piece, target: onGravity({ t: flown.t, r: c.rigid.r, v: c.rigid.v }, field) }));
  // (the target, where it is a craft of this run: by a body of it, or the side a joint let go)
  const aimed =
    def && 'craft' in def ? def.craft : def && 'joint' in def ? plan.craft[0]!.joints.find((j) => j.id === def.joint)?.gone[0] : undefined;
  const named = aimed ? others.find((o) => o.piece.bodies.includes(aimed)) : undefined;
  return {
    flown,
    samples,
    from: { t: flown.t, r: last_.r, v: last_.v },
    followed: end,
    others,
    ...(named && aimed
      ? { target: { from: t0, at: (t: number) => (t <= flown.t ? craftAt(flown.tracks, aimed, t) : named.target.at(t)) } }
      : {}),
  };
}

/** A craft flown on from `start` by gravity alone (the run's field), in steps of 10 s, as far as it is asked. */
function onGravity(start: { t: number; r: Vec3; v: Vec3 }, field: ReturnType<typeof fieldFor>): Target {
  const kept: { t: number; r: Vec3; v: Vec3 }[] = [start];
  return {
    from: start.t,
    at(t) {
      if (t < start.t) return undefined;
      let last = kept[kept.length - 1]!;
      while (last.t < t) {
        last = { ...stepIn(field, last, last.t, 10), t: last.t + 10 };
        kept.push(last);
      }
      const i = Math.min(kept.length - 1, Math.max(1, Math.ceil((t - start.t) / 10)));
      const [a, b] = [kept[i - 1]!, kept[i]!];
      return hermite(a.t, a.r, a.v, b.t, b.r, b.v, t);
    },
  };
}

/** A coast's state at `t` between its samples: a quiet stretch flown again (`Sample.rails`), or the cubic across a step. */
function stateOn(xs: readonly OrbitSample[], t: number): State {
  let lo = 0;
  let hi = xs.length - 1;
  if (t <= xs[0]!.t) return xs[0]!;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid]!.t <= t) lo = mid;
    else hi = mid;
  }
  const [a, b] = [xs[lo]!, xs[hi]!];
  if (!(b.t > a.t)) return b;
  return a.rails ? a.rails.state({ t: a.t, r: a.r, v: a.v }, { t: b.t, r: b.r, v: b.v }, t) : hermite(a.t, a.r, a.v, b.t, b.r, b.v, t);
}

/** The run's craft from what was flown together and the coast after it. */
function craftsOf(several: Several, coast: OrbitFlown): Crafts {
  const { flown, followed, others } = several;
  const samples = coast.samples;
  return {
    tracks: flown.tracks,
    until: flown.t,
    followed: followed.bodies,
    at(body, t) {
      if (t <= flown.t) return craftAt(flown.tracks, body, t);
      if (followed.bodies.includes(body)) return t > samples[samples.length - 1]!.t ? undefined : stateOn(samples, t);
      return others.find((o) => o.piece.bodies.includes(body))?.target.at(t);
    },
  };
}

const wholes = new WeakMap<object, FlownWhole>();
/**
 * An orbital flight's record flown once (`flyWhole`, the coast kept every second), whoever asks first: the scene, the
 * Flown panel (run.ts `recordOf`, whose samples these are) and a flight whose target this flight's vehicle is
 * (`flightTarget`) have the same run.
 */
export function recordWhole(flight: SitedFlight): FlownWhole {
  const plan = flight.plan!;
  let whole = wholes.get(plan);
  if (!whole) wholes.set(plan, (whole = flyWhole(plan, siteFrame(flight.site), frameOf(flight), flight.site.seaLevel.value, undefined, 1)));
  return whole;
}

/**
 * Where a flight's record run has its vehicle, in order of time: the ascent's samples and the coast's from the parting
 * on, each the state the run flew (the same states, in the same order, as the record's run on show has: `recordSamples`).
 * It ends where the coast does: what is let loose to come down from it is no craft to be met.
 */
function trackOf(whole: FlownWhole): readonly Stretched[] {
  const up = whole.ascent.samples;
  const parted = up[up.length - 1]!.t;
  return [...up, ...whole.coast.samples.filter((s) => s.t >= parted)];
}

/**
 * Another flight's vehicle as a target (`TargetDef.flight`), in the frame of the flight that goes up to it: where the
 * other flight's record run has it at the same instant. The two clocks are set apart by the difference of the two
 * liftoffs, to the millisecond (world/earthframe.ts `sinceLiftoff`); the state is the run's own at that instant (a
 * sample's; within a quiet stretch of its coast of which only the ends were kept, the stretch flown again to it, as
 * run.ts `between` reads one, `Sample.rails`; or the cubic through the two either side, which are a step of the run
 * apart), turned from the
 * other flight's frame to the ICRF and from there into this one's (`toIcrf`, `fromIcrf`: each flight's frame is of
 * the date of its own liftoff, and the two differ by the precession and nutation between). Nothing is fitted, and
 * nothing is flown but what the run itself flies again between the ends it kept. The other's record is not flown until the target is first asked for. Before the other's liftoff
 * and after its coast's end there is no target.
 */
export function flightTarget(other: SitedFlight, frame: EarthFrame): Target {
  const theirs = frameOf(other);
  /** This flight's liftoff on the other's clock, s. */
  const later = sinceLiftoff(theirs, frame.jd0);
  const turned = (v: Vec3): Vec3 => frame.fromIcrf(theirs.toIcrf(v));
  let track: readonly Stretched[] | null = null;
  return {
    from: 0 - later,
    at(t) {
      track ??= trackOf(recordWhole(other));
      const at = t + later;
      if (!(at >= track[0]!.t) || at > track[track.length - 1]!.t) return undefined;
      let lo = 0;
      let hi = track.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (track[mid]!.t <= at) lo = mid;
        else hi = mid;
      }
      const a = track[lo]!;
      const b = track[hi]!;
      const s =
        at >= b.t
          ? b
          : at <= a.t || !(b.t > a.t)
            ? a
            : a.rails
              ? a.rails.state({ t: a.t, r: a.r, v: a.v }, { t: b.t, r: b.r, v: b.v }, at)
              : hermite(a.t, a.r, a.v, b.t, b.r, b.v, at);
      return { r: turned(s.r), v: turned(s.v) };
    },
  };
}

const met = new WeakMap<object, Map<EarthFrame, Target>>();
/**
 * A plan's target where it is no part of the flight's own vehicle: another flight's (`flightTarget`: the flight of
 * that id, as sim/roster.ts knows it) or a craft flown from a published orbit (orbital.ts `orbitTarget`). One for a
 * target and a frame, whoever asks: the record's run and one flown by hand have the same craft, which follows neither.
 */
export function metOf(def: Extract<TargetDef, { flight: string } | { orbit: unknown }>, frame: EarthFrame, seaLevel: number): Target {
  let known = met.get(def);
  if (!known) met.set(def, (known = new Map()));
  let target = known.get(frame);
  if (!target) {
    if ('flight' in def) {
      const other = enrolled(def.flight);
      if (!other)
        throw new Error(
          `the target is the flight '${def.flight}', which has not been enrolled (sim/roster.ts): load its flight.ts, or missions/index.ts`,
        );
      if (!other.site || other.plan?.kind !== 'orbital')
        throw new Error(`the target is the flight '${def.flight}', which is not flown into orbit`);
      target = flightTarget(other as SitedFlight, frame);
    } else target = orbitTarget(def, frame, seaLevel);
    known.set(frame, target);
  }
  return target;
}

const targets = new WeakMap<object, Target>();
/**
 * The flight's target (`FlightPlan.target`). Where it is what the spacecraft's last joint lets go: the stage flown on as
 * a craft of its own from the parting (orbital.ts `targetFrom`), its velocity the spacecraft's as it left (`partedOff`)
 * less the whole of the speed the joint pushed the two apart at, along the long axis as it lay. One for an ascent,
 * whoever asks: the record's coast and one flown on from the same ascent by hand have the same target, which follows
 * neither. Where it is another flight's vehicle or a published orbit, that craft (`metOf`), whatever the ascent.
 */
export function targetOf(plan: FlightPlan, frame: EarthFrame, seaLevel: number, ascent: Ascended): Target | undefined {
  const def = plan.target;
  if (!def) return undefined;
  // (a craft of this run is the several craft's to say: staged.ts `flySeveral`)
  if ('craft' in def) return undefined;
  if (!('joint' in def)) return metOf(def, frame, seaLevel);
  if (def.joint !== sequenceOf(plan).stages.at(-1)!.joint) return undefined;
  const key = ascent.separation;
  let target = targets.get(key);
  if (!target) {
    const c = plan.craft[0]!;
    const push = c.joints.find((j) => j.id === def.joint)?.push ?? c.sheds?.find((shed) => shed.on === def.joint)?.push;
    const axis = ascent.samples.at(-1)!.axis;
    const start = { t: key.t, r: key.r, v: sub(key.v, scale(axis, push?.value ?? 0)) };
    target = targetFrom(plan, frame, seaLevel, start);
    if (target) targets.set(key, target);
  }
  return target;
}

/**
 * The spacecraft as it leaves its last stage: the stack's state at the parting, with the spacecraft's share of the speed the
 * joint pushes the two apart at (its `push`, or that of what it sheds; forces.ts `keptShare`, by the two masses) along the
 * long axis as it lay. The one impulse of the ascent's end, and the live vehicle's own (stagedlive.ts `separationSpeed`):
 * the record's run and a flight flown by hand part alike.
 */
export function partedOff(plan: FlightPlan, ascent: Ascended): { t: number; r: Vec3; v: Vec3 } {
  const c = plan.craft[0]!;
  const joint = sequenceOf(plan).stages.at(-1)!.joint;
  const push = c.joints.find((j) => j.id === joint)?.push ?? c.sheds?.find((shed) => shed.on === joint)?.push;
  const at = ascent.separation;
  if (!push) return at;
  const axis = ascent.samples.at(-1)!.axis;
  return { t: at.t, r: at.r, v: add(at.v, scale(axis, keptShare(push.value, ascent.parted.kept, ascent.parted.gone))) };
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
  const target = targetOf(plan, frame, seaLevel, ascent);
  const coast = flyOrbit(plan, site, frame, seaLevel, every, from, hands, contacts, undefined, target);
  const end = coast.samples[coast.samples.length - 1]!;
  const flown = coast.plan ?? plan;
  return {
    ascent,
    coast,
    down: downOf(flown) && end.phase === 'down' ? flyDown(flown, frame, seaLevel, end, hands) : null,
    ...(target ? { target } : {}),
    ...(coast.plan ? { plan: coast.plan } : {}),
  };
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
  coastAtCentre = false,
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
  // A tower abort already flies the capsule centre. Ordinary staging flies on from the ascent datum.
  const offset: Vec3 = coastAtCentre ? [0, 0, 0] : sub(parted.centre, parted.r);
  const held = releaseAttitude ?? parted.attitude;
  const ship = shipOf(plan);
  const lights = coastEvents(plan).on?.do.find((a) => 'ignite' in a);
  const braking = lights && 'ignite' in lights ? lights.ignite : null;
  // (turned to the burn's line from where the plan turns it to its aim, where that comes before the burn; else a minute before)
  const oriented = orientedAt(plan, ship);
  // (over a minute, or as long as there is before the burn: a Mercury capsule's retrosequence is thirty seconds)
  const turning = Math.min(TURNING, ship.on - oriented);
  const burnAt = whole.coast.samples.find((x) => x.t >= ship.on) ?? whole.coast.samples[0]!;
  // (a coast with no burn is never turned to one: it keeps the attitude it was let go in)
  const aimed = ship.aim
    ? lie(
        ship.aim.aim === 'fixed'
          ? scale(unit(burnAt.v), ship.aim.sense)
          : aimOf(
              plan,
              burnAt.r,
              burnAt.v,
              () => sunAt(ship.on),
              () => frame.upOver(burnAt, burnAt.t),
            ),
      )
    : held;
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
        rails: s.rails,
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
      rails: undefined,
    })),
  ];
  // (heat shield first along the motion through the air; a lifting body banked is drawn at its trim, its long axis tipped
  // from there toward its lift: orbital.ts `liftOf`)
  const trim = ship.entry.aero.trim ? ship.entry.aero.trim.value * DEG : 0;
  const trimmed = (s: { t: number; r: Vec3 }, wind: Vec3): Vec3 => {
    const back = scale(unit(wind), -1);
    const bank = trim ? bankOn(ship, s.t, whole.coast.entry?.banks) : null;
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
  /** The spacecraft alone at an instant of the coast or the descent, lying as `q` has it. */
  const alone = (s: (typeof ending)[number], q: Quat, passive?: { wind: Vec3; alignment: number }): LiveSample => {
    const wind = sub(s.v, cross(spin, s.r));
    const axis = turnQ(q, [1, 0, 0]);
    const here = frame.place(s.r, s.t);
    const at = add(s.drawn, offset);
    return {
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
      ...(passive && { passive }),
      ...(s.rotation && { rotation: s.rotation, rates: s.rotation.rates }),
      alpha: angleBetween(axis, wind) / DEG,
      burning: [
        ...(s.t >= ship.on && s.t < Math.min(ship.off, parts) && braking ? [{ engine: braking, thrust: 0 }] : []),
        ...ship.moves.filter((m) => s.t >= m.on && s.t < m.off).map((m) => ({ engine: m.engine, thrust: m.accel * ship.mass })),
      ],
      centre: at,
      ...(s.rails && { rails: railsOf(s.rails) }),
    };
  };
  // A quiet stretch of the coast kept as its two ends (orbital.ts `flyOrbit`), for whatever reads this run between them
  // (sim/rails.ts `Railed`): the coast's own stretch flown again, at the centre of mass these samples draw it by, the
  // attitude turned evenly between the two ends' (nothing turns it faster in a stretch the coast let go: orbital.ts
  // `attendedOf`) and the little the air does read straight between them.
  const railing = new Map<Railed<OrbitSample>, Railed<LiveSample>>();
  const railsOf = (coast: Railed<OrbitSample>): Railed<LiveSample> => {
    const had = railing.get(coast);
    if (had) return had;
    const flown = (a: LiveSample, b: LiveSample, t: number) =>
      coast.state({ t: a.t, r: sub(a.centre, offset), v: a.v }, { t: b.t, r: sub(b.centre, offset), v: b.v }, t);
    const made: Railed<LiveSample> = {
      of: (x) => x.centre,
      state: (a, b, t) => {
        const at = coast.state({ t: a.t, r: sub(a.r, offset), v: a.v }, { t: b.t, r: sub(b.r, offset), v: b.v }, t);
        return { r: add(at.r, offset), v: at.v };
      },
      sample: (a, b, t) => {
        const k = (t - a.t) / (b.t - a.t);
        const at = flown(a, b, t);
        const mix = (x: number, y: number): number => x + (y - x) * k;
        const turned = a.rotation && { delta: rotateFor(a.rotation.delta, a.rotation.rates, t - a.t), rates: a.rotation.rates };
        return alone(
          {
            t,
            r: at.r,
            v: at.v,
            g: mix(a.g, b.g),
            q: mix(a.q, b.q),
            mach: mix(a.mach, b.mach),
            down: false,
            entering: a.entered,
            drawn: at.r,
            rotation: turned,
            rails: coast,
          },
          attitudeBetween(a, b, k),
        );
      },
    };
    railing.set(coast, made);
    return made;
  };
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
    if (coastAtCentre) {
      const elapsed = Math.max(0, s.t - whole.ascent.separation.t);
      q = length(wind) > 1 ? toward(held, lie(trimmed(s, wind)), Math.min(1, elapsed / 30)) : held;
    } else if (passive) {
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
    else if (by) q = left = toward(rest, lie(scale(unit(s.v), -1)), Math.min(1, (s.t - by.from.value) / TURNING));
    else if (s.t < oriented) q = rest;
    else if (s.t <= ship.off) q = toward(rest, aimed, Math.min(1, (s.t - oriented) / turning));
    else if (s.t < parts) q = aimed;
    else q = toward(aimed, length(wind) > 1 ? lie(trimmed(s, wind)) : aimed, Math.min(1, (s.t - parts) / 30));
    if (!passive) baseAtRelease = q;
    if (s.rotation) q = multiply(q, s.rotation.delta);
    out.push(alone(s, q, passive ? { wind: supportedWind, alignment } : undefined));
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
export function byHand(
  plan: FlightPlan,
  t: number,
  aim: Vec3,
  /**
   * The burn as a hand made it, flown live (sim/craftlive.ts): cut at `off`, having given `flown` m/s, the ship at `mass` kg
   * as it lit. Left out: the record's impulse at the engine's thrust, as above.
   */
  made?: { off: number; flown: number; mass: number },
): FlightPlan {
  const parting = plan.record?.manual?.parting;
  const out = structuredClone(plan);
  unaimed(out);
  const k = coastEvents(out);
  const deltaV = k.burn?.deltaV;
  if (!parting || !k.burn || !deltaV) throw new Error('this plan says nothing of what a hand could do');
  const resources = coastEngineState(plan, k.burn.id, t - 1e-9);
  if (resources.starts <= 0 || resources.kg <= 0) return out;
  if (out.record?.coastFixes) out.record.coastFixes = out.record.coastFixes.filter((fix) => fix.at.value <= t);
  // (a solid burns for as long as it burns; a liquid until its integrator has the impulse, at its chambers' thrust)
  const burn = made
    ? made.off - t
    : k.burn.kind === 'solid' && k.burn.burn
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
  if (k.on)
    for (const a of k.on.do)
      if ('ignite' in a) {
        delete a.firingTime;
        if (made) a.massAtIgnition = { value: made.mass, confidence: 'derived', source: MADE };
      }
  if (!waits(k.off, burn)) setOff(k.off, t + burn);
  k.burn.flown = made ? { value: made.flown, confidence: 'derived', source: MADE } : { ...k.burn.flown!, value: deltaV.value };
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
  unaimed(out);
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

/** What a burn written from one a hand made live says of its figures. */
const MADE = 'this flight’s own burn, made by hand and flown live (sim/craftlive.ts): its impulse the rocket equation’s on what it drew';

/**
 * `plan` with the record's `k`th manoeuvre (`movesOf(record)`) made by hand and flown live (sim/craftlive.ts `CraftBurn`),
 * as `movedTo` writes one, but lit at `made.on` and cut at `made.off` as the hand had them, its impulse the one it gave
 * (`Action.flown`, so what it drew is the rocket equation's from the ship's mass as it lit, `massAtIgnition`, as it was
 * live), along `axis` (the long axis it pushed along on the whole, as `movedTo`'s); nothing of the record's firing time or
 * of guidance's aim (`toward`) is kept. What the flight deck writes when a hand's manoeuvre stops (deck/phases/burn.ts).
 */
export function madeBy(
  record: FlightPlan,
  plan: FlightPlan,
  k: number,
  made: { on: number; off: number; axis: Vec3; flown: number; mass: number },
): FlightPlan {
  const m = movesOf(record)[k]!;
  const out = movedTo(record, plan, k, made.on, made.axis);
  for (const a of eventOf(out, m.lit)!.do)
    if ('ignite' in a && a.ignite === m.engine) {
      delete a.firingTime;
      delete a.toward;
      a.flown = { value: made.flown, confidence: 'derived', source: MADE };
      a.massAtIgnition = { value: made.mass, confidence: 'derived', source: MADE };
    }
  setOff(eventOf(out, m.cut), made.off);
  return out;
}

/** The plan with the burn's body let go at `t` (the modules' parting, as a hand or the timer has it). */
export function partingAt(plan: FlightPlan, t: number): FlightPlan {
  const out = structuredClone(plan);
  unaimed(out);
  setOff(coastEvents(out).parting, t);
  return out;
}

/** A plan a hand has changed is the hand's: its braking burn is lit when the plan says, not timed again by guidance (`LandingAim`). */
function unaimed(plan: FlightPlan): void {
  if (!plan.record?.landing?.aimed) return;
  const { aimed: _, ...landing } = plan.record.landing;
  plan.record.landing = landing;
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

/**
 * When the run stopped the engine an event of the plan cuts, s from liftoff (an ascent check's '<event>.stop'): its own
 * instant, cut or run dry, which is the record's only where the plan cuts it on the clock. NaN for an event that cuts no
 * stage's engine.
 */
export function stopOf(plan: FlightPlan, run: Pick<Ascended, 'stops'>, event: string): number {
  const cut = eventOf(plan, event)?.do.find((a) => 'cut' in a);
  const i = cut && 'cut' in cut ? stagesOf(plan).findIndex((s) => s.engine.id === cut.cut) : -1;
  return i < 0 ? Number.NaN : (run.stops[i] ?? Number.NaN);
}

/** Every check an orbital plan sets, against a whole flight flown (`flyWhole`): for the Flown panel and the debrief. */
export function held(plan: FlightPlan, whole: FlownWhole): Held[] {
  const ascent = (id: string): number => {
    const [event, field] = id.split('.');
    if (!field) return (whole.ascent.summary as unknown as Record<string, number>)[id] ?? Number.NaN;
    if (field === 'stop') return stopOf(plan, whole.ascent, event!);
    if (event === 'injection') return (whole.ascent.injected as Record<string, number> | undefined)?.[field] ?? Number.NaN;
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

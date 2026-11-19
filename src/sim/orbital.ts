/**
 * A flight that goes into orbit, as the record has it and as far as the simulator can fly it.
 *
 * It is flown from its plan (sim/plan.ts), which the flight's own vehicle modules write from its record (a Vostok's:
 * missions/ussr/vostok/vehicles/vostok-plan.ts, from the record's shape there, vostok-record.ts): every number an input
 * with its confidence and source, none fitted, and the checks set before anything was run. Several stages burning
 * together and in turn, an orbit that is published as heights and a period, a braking burn aimed by the Sun, an entry
 * from orbital speed.
 *
 * What is flown here is the coast (`flyOrbit`, below): from the orbit as published, or from the
 * state the ascent flown left it in, round to the braking burn, down through the air to the height
 * the pilot left at. The powered ascent is flown by sim/staged.ts from the plan's stages, on a
 * stated steering law where the programme flown has not been found.
 */
import type { Measure } from '../types.ts';
import { G0 } from '../world/bodies.ts';
import type { EarthFrame } from '../world/earthframe.ts';
import { sunPosition } from '../world/ephemeris.ts';
import { add, cross, DEG, dot, enuAxes, type Geodetic, geodeticToEcef, length, scale, sub, unit, type Vec3 } from '../world/frames.ts';
import {
  CONVENTION,
  flownApsisBall,
  fromPublished,
  meanOf,
  meanOrbitOf,
  type OnOrbit,
  type PeriodKind,
  type PublishedOrbit,
  periodsOf,
} from '../world/meanelements.ts';
import { elementsOf, planeThrough, type State, step, sunlit } from '../world/orbit.ts';
import { ratioOf } from '../world/thermosphere.ts';
import { airAt, airDrag } from './air.ts';
import { atmosphere, meanFreePath } from './atmosphere.ts';
import { Descent, type DescentContext, type DescentSnapshot, type DownBody, downOf } from './descent.ts';
import { along } from './fly.ts';
import { ENTRY_G } from './loads.ts';
import {
  type Action,
  type AeroDef,
  type AttitudeDef,
  type Craft,
  clockAt,
  type EngineDef,
  type EventDef,
  eventOf,
  type FlightPlan,
  type Hold,
  type OrbitFix,
  type Pursuit,
} from './plan.ts';
import { type Ahead, coelliptic, flownFrom, reach, stationPush, type Target } from './pursuit.ts';
import type { CoastRotation } from './rigid.ts';

/**
 * How the ascent is steered (sim/staged.ts): a stated law, not a stored programme, because the programme flown has not
 * been found. It rises along the plumb line for `vertical` seconds; pitches over toward the launch plane's downrange at an
 * even rate for `kick` seconds, to an angle the law solves for; holds that attitude until its motion through the air has
 * turned as far, and is then flown along that motion (no angle of attack, so no bending load through the dense air)
 * until `turn` seconds; from there to the last cutoff, by the linear-tangent law (the tangent of the thrust's angle above
 * the local level falls evenly with time) at a rate it solves for. The launch plane's inclination, the pitch-over's angle
 * and the tangent's rate are the three unknowns, solved so that at the last cutoff (`target.at`, an event) it is at
 * `target.altitude` above the orbit's reference ball, climbing at `target.climb`, in an orbit of `target.inclination`:
 * the design conditions, as a guidance designer's would be. They are results of the solution (`Steered.solved`), never
 * inputs, and the three targets are therefore not independent checks of the flight.
 *
 * With the aiming `azimuth` given the launch plane is the record's, and what is solved in its place is the yaw the tangent
 * holds out of that plane, so that the inclination is still reached (the closed loop steering to the orbit's plane). With a
 * stored `programme` the law's first part, to `turn`, is that programme flown open, and the tangent takes over from an
 * angle the law solves for. The last cutoff itself is the plan's event: at an instant, on a setting, or the guidance's own
 * on the orbit reached (plan.ts: a trigger `{ orbit }`), which is what makes the flight come out as it did on whatever
 * the vehicle as modelled gives (docs/agents/simulator.md, "One state, changed only by what pushes it").
 */
export interface Guidance {
  /** Space-fixed nose tilt downrange from the original launch vertical, degrees against seconds: flown open until `turn`, held flat past its last point. */
  programme?: import('../types.ts').Curve;
  /** Roll about the stack's axis, relative to the completed roll alignment, degrees against seconds. */
  roll?: import('../types.ts').Curve;
  /** Attitude programme for the launch vehicle still attached after orbital insertion. */
  attached?: { align: [Measure, Measure]; pitch: import('../types.ts').Curve; freeze: Measure };
  /**
   * The aiming azimuth, degrees east of north: the launch plane is the one through the plumb line and this bearing at the pad
   * at liftoff, held by the gyros among the stars. Given, the plane is not solved for and the target's inclination is not
   * aimed at: the orbit's inclination is then a result, and a check.
   */
  azimuth?: Measure;
  /**
   * Control lost, as the record has it: from `at`, s, the axis is where the vehicle turned, its tilt in the launch plane
   * from the launch vertical (as the turn's: toward downrange, past 180 back over the top), degrees against seconds, in
   * place of the law; flat beyond its last point. The law's own unknowns are then the planned flight's (`FlightPlan.planned`).
   * Until `until` the vehicle is out of anyone's control: a live vehicle follows it whatever the hands or the guidance switch
   * (sim/stagedlive.ts `stagedPilot`); after, a hand may steer it again.
   */
  lost?: { at: Measure; tilt: import('../types.ts').Curve; until?: Measure };
  vertical: Measure;
  kick: Measure;
  turn: Measure;
  target: {
    /** The event whose instant is the last cutoff: the record's id of it (a plan event's `record.id`, or a mark's). */
    at: string;
    altitude: Measure;
    /**
     * What `altitude` is over, where it is not the orbit's reference ball: `ellipsoid`, the WGS 84 ellipsoid under the place
     * of the cutoff, as a trajectory table's height at cutoff is (a height taken from the orbit's perigee is over the ball).
     */
    over?: 'ellipsoid';
    climb: Measure;
    inclination: Measure;
  };
}

/**
 * The pilot in the descent. He rides the first body until the ejection, and then `alone` (his seat, and from it himself
 * under his canopy). Each limit is what the verdict holds his flight to: a landing aboard (in his seat in the module), a
 * landing under his own canopy, and the air's blast (the greatest dynamic pressure) once he is out in it.
 */
export interface DescentCrew {
  /** The body the pilot comes down as once he has left the ship. Left out: the crew land in it, and nobody leaves. */
  alone?: string;
  /**
   * The words for whoever rode it, from the flight's own data: as a sentence begins with them ("He", "She", "The crew"),
   * as a sentence goes on ("he", "they"), what was theirs ("his", "their"), and whether a verb takes them as many.
   * Left out: one man's.
   */
  words?: CrewWords;
  /** The fastest landing lived through aboard the module, and (with `alone`) under his own canopy, m/s. */
  landing: { aboard: Measure; alone?: Measure };
  /** With `alone`: the most air he lives through out of the ship on his seat, Pa. */
  blast?: Measure;
  /** With `alone`: the fastest he can be out in the air, m/s: past it, the heat (which is not modelled) is taken to kill him. */
  fastest?: Measure;
  /** What a landing aboard meant, in the record's words: said beside the verdict on one. */
  aboard: string;
}

/** How the verdict and the deck speak of a crew (`DescentCrew.words`). */
export interface CrewWords {
  who: string;
  they: string;
  their: string;
  many: boolean;
}
/** The words for a descent's crew, as its plan's data gives them: one man's where it gives none. */
export const crewWords = (crew: { words?: CrewWords } | undefined): CrewWords =>
  crew?.words ?? { who: 'He', they: 'he', their: 'his', many: false };

/**
 * What a hand gave in the descent (the flight deck, orbitdeck.ts): each event at an instant, seconds from liftoff, by id
 * (`ejection`; `<body id>/<parachute name>`), and the automatic sequence's switch as it was thrown: from each instant on
 * as it says, on before the first. The automatic sequence (the barometric switches, the timer) acts only while it is on;
 * what a hand gives acts whatever it is. The modules' parting is the plan's own (`entry.separation`).
 */
export interface DescentHands {
  given: Record<string, number>;
  switched: { t: number; on: boolean }[];
}

/** Whether the automatic sequence is on at `t`. */
export function automatic(hands: DescentHands | undefined, t: number): boolean {
  let on = true;
  for (const s of hands?.switched ?? []) if (s.t <= t) on = s.on;
  return on;
}

/** The event that sets parachute `name` of body `id` out, as `DescentHands.given` names it. */
export const chuteEvent = (id: string, name: string): string => `${id}/${name}`;

/** A parachute's tearing: when, by which limit, and the dynamic pressure, Pa, and its pull, N, at that instant. */
export interface DescentTear {
  t: number;
  by: 'pressure' | 'pull';
  q: number;
  pull: number;
}

/** Where and when each body of the descent came down. */
export interface Landed {
  at: number;
  speed: number;
  latitude: number;
  longitude: number;
}

/** A descent flown (`flyDown`). */
export interface DescentFlown {
  /** Each body's landing, by id: those of the plan's descent bodies, and what they left behind (`replaces.leaves`). */
  landed: Record<string, Landed>;
  /** Between the first two bodies' landings, m. */
  apart: number;
  /** Each body's path, in the flight's frame, from where it began (a second apart, and its landing). */
  tracks: Record<string, { t: number; r: Vec3; v: Vec3 }[]>;
  /** When each body's parachutes came out, seconds from liftoff, by body and parachute name; and when each was let go (`instead`). */
  opened: Record<string, Record<string, number>>;
  gone: Record<string, Record<string, number>>;
  /** Each parachute that tore, by body and name; and the most dynamic pressure, Pa, and pull, N, each met while out. */
  torn: Record<string, Record<string, DescentTear>>;
  worst: Record<string, Record<string, { q: number; pull: number }>>;
  /** When each body's motors were lit (a soft-landing rocket), seconds from liftoff, by body and engine id. */
  fired: Record<string, Record<string, number>>;
  /** When the pilot left (the ejection), s from liftoff: NaN, never. */
  ejected: number;
  /** When the modules parted, s from liftoff (the plan's `entry.separation`, if it came before the first body landed): NaN, never. */
  parted: number;
  /** Each body's greatest dynamic pressure, Pa, load, g, and speed through the air, m/s, from when it began. */
  peak: Record<string, { q: number; g: number; speed: number }>;
  /** Bodies still up when the descent was given up: six hours on, in an orbit or near one. */
  up: string[];
  /** Each body's descent (sim/descent.ts) as it was from each instant it changed, by id: for a prediction begun part-way down. */
  states: Record<string, { t: number; state: DescentSnapshot }[]>;
}

/**
 * Fly the descent from where the coast hands over (`from`: its last sample's state and time). Point masses in the inertial
 * frame of date under J2 gravity and the standard air turning with the Earth (no wind: the day's at Saratov has not been
 * read), RK4 at 0.05 s in the air (1 s above 100 km, 10 s above 150 km, for a body let go high), each step cut to end on
 * an instant a hand gave. The first body is the entry body: it carries the pilot until the ejection (`entry.mass`; then its
 * own), the instrument module until the modules part (the whole ship's mass less the entry body's, and no more drag: the
 * coast's convention for the joined ship), and above the ejection height, where the coast would have flown it, it has the
 * coast's drag (`entry.area` on `entry.drag`). Every other body leaves it at the first of its `with` events, thrown clear.
 * Each event is the automatic sequence's (a parachute at its height or time after the ejection, the ejection at its
 * height) while that is on, and a hand's whenever one gave it (`hands`). Returns each body's landing, by id, and `apart`,
 * the distance between the first two, m. With `out` (`flyEjected`) the ejection is set off at `from`, which is the stack's,
 * the entry body is left on it, and each body comes down to `out.ground` under it.
 */
export function flyDown(
  plan: FlightPlan,
  frame: EarthFrame,
  seaLevel: number,
  from: { t: number; r: Vec3; v: Vec3 },
  hands?: DescentHands,
  out?: Ejected,
): DescentFlown {
  const d = downOf(plan);
  if (!d) throw new Error('this orbital plan has no descent');
  const spin = frame.spin;
  const ground = d.ground;
  /** The ground under a body at a state, m above the sea: the descent's, or the place's where it comes down by its launch vehicle. */
  const floor = out
    ? (q: State, at: number) => {
        const p = frame.place(q.r, at);
        return out.ground(p.latitude, p.longitude);
      }
    : () => ground;
  const parted = d.parted;
  const given = hands?.given ?? {};
  const landed: Record<string, Landed> = {};
  const tracks: Record<string, { t: number; r: Vec3; v: Vec3 }[]> = {};
  const opened: Record<string, Record<string, number>> = {};
  const gone: Record<string, Record<string, number>> = {};
  const torn: Record<string, Record<string, DescentTear>> = {};
  const worst: Record<string, Record<string, { q: number; pull: number }>> = {};
  const fired: Record<string, Record<string, number>> = {};
  const peak: Record<string, { q: number; g: number; speed: number }> = {};
  const up: string[] = [];
  const box = { at: Number.NaN };
  const snapshots: Record<string, { t: number; state: DescentSnapshot }[]> = {};
  const heightOf = (q: State, at: number) => frame.place(q.r, at).height - seaLevel;
  const airOf = (q: State) => sub(q.v, cross(spin, q.r));
  const [first, ...rest] = d.bodies;
  if (!first) throw new Error('a descent needs its entry body');
  const loose = new Set<string>();
  /** The bodies an event sets loose from the first, each from its state then, thrown clear against its motion through the air. */
  const queue: { body: DownBody; t: number; s: State }[] = out ? [] : [{ body: first, t: from.t, s: { r: from.r, v: from.v } }];
  const letLoose = (event: string, t: number, s: State) => {
    for (const body of rest) {
      if (loose.has(body.id) || !body.with.includes(event)) continue;
      loose.add(body.id);
      const wind = airOf(s);
      const speed = length(wind);
      const v = body.thrown && speed > 0 ? sub(s.v, scale(wind, body.thrown.value / speed)) : s.v;
      queue.push({ body, t, s: { r: s.r, v } });
    }
  };
  // the instants a hand gave, and the modules' parting, which a step ends on
  const cuts = [...Object.values(given), parted].filter(Number.isFinite).sort((p, q) => p - q);
  const ctx: DescentContext = {
    down: d,
    frame,
    seaLevel,
    ...(hands ? { hands } : {}),
    ejected: box,
    loose: letLoose,
    leaves: (body, t, s) => queue.push({ body, t, s }),
  };
  // (ejected from the launch vehicle: the entry body stays on it, and what the ejection sets loose leaves from the stack's state)
  if (out) {
    box.at = from.t;
    letLoose(d.ejection, from.t, { r: from.r, v: from.v });
  }
  for (let n = 0; n < queue.length; n++) {
    const { body, t: t0, s: s0 } = queue[n]!;
    // (the entry body carries the pilot until he leaves, and the instrument module until the modules part)
    const desc = new Descent(ctx, body, body === first, t0);
    const track: { t: number; r: Vec3; v: Vec3 }[] = (tracks[body.id] = [{ t: t0, r: s0.r, v: s0.v }]);
    opened[body.id] = desc.times;
    gone[body.id] = desc.gone;
    torn[body.id] = desc.torn;
    worst[body.id] = desc.worst;
    fired[body.id] = desc.lit;
    const states: { t: number; state: DescentSnapshot }[] = (snapshots[body.id] = []);
    let t = t0;
    let s: State = s0;
    const most = (peak[body.id] = {
      q: desc.pressure(s0, heightOf(s0, t0), t0),
      g: 0,
      speed: length(airOf(s0)),
    });
    const push = (q: State, at: number): Vec3 => desc.push(q, at);
    /** What is due and what wears at `t`, and the body as it then is, kept where it changed (for a prediction begun part-way down). */
    const after = (fn: () => void) => {
      const was = desc.key();
      fn();
      if (desc.key() !== was || !states.length) states.push({ t, state: desc.snapshot() });
    };
    let h = heightOf(s, t);
    let under = floor(s, t);
    after(() => desc.events(s, h, dot(airOf(s), s.r) < 0, true, t));
    const limit = t0 + 6 * 3600;
    let keptAt = t;
    while (h > under && t < limit) {
      const was = { s, t, h };
      const most_step = h > 150_000 ? 10 : h > 100_000 ? 1 : 0.05;
      const cut = [...cuts, ...desc.ends(t)].filter((c) => c > t + 1e-9).sort((p, q) => p - q)[0];
      let dt = cut !== undefined && cut - t < most_step ? cut - t : most_step;
      // (a motor set off at a height is lit where the body comes down through it, not a step past it: the step is cut short
      // to reach it, as the descent's falling speed has it, and goes a hair past so that it is crossed)
      const motor = desc.nextMotor();
      const sinking = -dot(airOf(s), unit(s.r));
      if (h > motor && sinking > 0 && (h - motor) / sinking < dt) dt = (h - motor) / sinking + 1e-6;
      desc.as = t;
      s = step(s, t, dt, push);
      t = cut !== undefined && Math.abs(t + dt - cut) < 1e-9 ? cut : t + dt;
      desc.as = t;
      h = heightOf(s, t);
      under = floor(s, t);
      if (h <= under) {
        const part = (was.h - under) / (was.h - h);
        s = { r: add(was.s.r, scale(sub(s.r, was.s.r), part)), v: add(was.s.v, scale(sub(s.v, was.s.v), part)) };
        t = was.t + dt * part;
        const here = frame.place(s.r, t);
        const up = frame.upOver(here, t);
        landed[body.id] = { at: t, speed: -dot(sub(s.v, cross(spin, s.r)), up), latitude: here.latitude, longitude: here.longitude };
        track.push({ t, r: s.r, v: s.v });
        break;
      }
      if (t - keptAt >= 1 - 1e-9) {
        track.push({ t, r: s.r, v: s.v });
        keptAt = t;
      }
      most.q = Math.max(most.q, desc.pressure(s, h, t));
      most.g = Math.max(most.g, length(push(s, t)) / G0);
      most.speed = Math.max(most.speed, length(airOf(s)));
      after(() => {
        desc.events(s, h, h < was.h, false, t);
        desc.wear(s, h, t);
      });
    }
    if (!landed[body.id]) {
      up.push(body.id);
      if (track.at(-1)!.t < t) track.push({ t, r: s.r, v: s.v });
    }
  }
  const ids = d.bodies.map((b) => b.id);
  const [a, b] = [landed[ids[0]!], landed[ids[1]!]];
  const apart =
    a && b
      ? length(
          sub(
            geodeticToEcef({ latitude: a.latitude, longitude: a.longitude, height: 0 }),
            geodeticToEcef({ latitude: b.latitude, longitude: b.longitude, height: 0 }),
          ),
        )
      : Number.NaN;
  const down = out ? Number.NEGATIVE_INFINITY : (landed[first.id]?.at ?? Number.POSITIVE_INFINITY);
  return {
    landed,
    apart,
    tracks,
    opened,
    gone,
    torn,
    worst,
    fired,
    ejected: box.at,
    parted: parted < down ? parted : Number.NaN,
    peak,
    up,
    states: snapshots,
  };
}

/**
 * The crew ejected from their launch vehicle (an abort's seat, `AbortMode.escape.eject`): `ground` is the ground under a place,
 * m above the sea (the launch vehicle's own: forces.ts `floorAt`).
 */
export interface Ejected {
  ground: (latitude: number, longitude: number) => number;
}

/**
 * The crew ejected from the launch vehicle at `from` (the spacecraft's state on the stack, at that instant): the descent's
 * ejection (`Down.ejection`) set off there, and what it sets loose (the pilot on his seat, the hatches it blows) flown down
 * as `flyDown` flies them from the falling ball, each thrown clear against its motion through the air, on their own
 * parachutes as the descent has them, to the ground under the place each comes down on. The entry body is not flown: it
 * stays on the stack. Null where the descent has no crew that leaves the ship (`DescentCrew.alone`): nobody to eject.
 */
export function flyEjected(
  plan: FlightPlan,
  frame: EarthFrame,
  seaLevel: number,
  from: { t: number; r: Vec3; v: Vec3 },
  out: Ejected,
): DescentFlown | null {
  if (!downOf(plan) || plan.craft[0]!.crew?.alone === undefined) return null;
  return flyDown(plan, frame, seaLevel, from, undefined, out);
}

/**
 * How long an orbit lasts: from `from` (a state in `frame`, at seconds from liftoff) under J2
 * gravity and the standard air turning with the Earth, the ship (whole, or the entry body once the modules have parted)
 * on the coast's own drag (`orbitDrag`: free-molecular up there, the joined ship's figure until the modules part), RK4 at
 * 30 s, until it is down to 120 km (from there it comes down within the revolution) or `days` have gone. Seconds from
 * `from.t` to there, or Infinity. With `ORBIT_DRAG.decay` off, the ball's free-molecule figure on its disc whatever is
 * flying, as until November 2026.
 */
export function decay(plan: FlightPlan, frame: EarthFrame, seaLevel: number, from: { t: number; r: Vec3; v: Vec3 }, days = 60): number {
  const spin = frame.spin;
  const ship = shipOf(plan);
  const cd = ship.entry.aero.rarefied?.value ?? along(ship.entry.aero.drag, 25);
  const parted = from.t >= ship.parted;
  const mass = parted ? ship.entry.mass : ship.mass;
  const cdA = cd * ship.entry.aero.area.value;
  const heightOf = (q: State, at: number) => frame.place(q.r, at).height - seaLevel;
  const push = (q: State, at: number): Vec3 => {
    const h = heightOf(q, at);
    const air = atmosphere(h);
    const wind = sub(q.v, cross(spin, q.r));
    const speed = length(wind);
    const density = air.density * solarAt(frame, q.r, at, h);
    return scale(airDrag(wind, speed, density, ORBIT_DRAG.decay ? orbitDrag(ship, !parted, h, speed / air.soundSpeed) : cdA), 1 / mass);
  };
  let s: State = { r: from.r, v: from.v };
  let t = from.t;
  const end = from.t + days * 86_400;
  while (t < end) {
    s = step(s, t, 30, push);
    t += 30;
    if (heightOf(s, t) < 120_000) return t - from.t;
  }
  return Number.POSITIVE_INFINITY;
}

/** What the record gives figures for, as the coast has them. */
export interface OrbitResults {
  /**
   * Node to node on the orbit the coast begins on, s: the nodal period of its mean elements with the perigee where it
   * stands (world/meanelements.ts `meanOf`, `periodsOf`: Kozai's first order), which is what the published period is.
   */
  period: number;
  /** The greatest height above the orbit's reference ball before the braking burn, m. */
  apogee: number;
  /** Into the Earth's shadow and out of it, seconds from liftoff (half the Sun's disc hidden). NaN: it never was. */
  shadowIn: number;
  shadowOut: number;
  /** Where it was over as the braking engine lit: degrees north and east. */
  retroLatitude: number;
  retroLongitude: number;
  /** How far the push was from straight against the motion, degrees. */
  retroOffRetrograde: number;
  /** The perigee the burn left it on, m above the reference ball: under the ground or not, it is where an airless orbit would go. */
  retroPerigee: number;
  /** Height above the sea at `entry.separation`, m. */
  separationAltitude: number;
  /** Coming down through 100 km: seconds from liftoff, speed through the air (m/s) and how far below level it was going, degrees. */
  interfaceAt: number;
  interfaceSpeed: number;
  interfaceAngle: number;
  /** When it first feels a twentieth of a g, s; the greatest reading, in g, and when; the greatest dynamic pressure, Pa. */
  entryAt: number;
  entryG: number;
  entryGAt: number;
  entryQ: number;
  /** Reaching the ejection height: seconds from liftoff, where (degrees), and how fast it was falling, m/s. */
  ejectionAt: number;
  ejectionLatitude: number;
  ejectionLongitude: number;
  ejectionSpeed: number;
  /** That place against the record's landing, m: along its own track over the ground (beyond is positive) and to the right of it. */
  alongTrack: number;
  crossTrack: number;
  /**
   * The orbit at an instant a check states (`CheckWhen` `reading: 'orbit'`), by the check's id: only those a plan's checks
   * ask for are here. The coast's state at the instant read as mean elements (world/meanelements.ts `meanOf`), as the
   * published orbit is read (`fromPublished`): perigee and apogee a(1 - e) and a(1 + e) less the ball the published
   * orbit's heights are over (`heightsBall`: the ellipsoid under the apsis), m, and the nodal period with the perigee where it stands, s.
   */
  [reading: `${string}.${OrbitReading}`]: number;
  /** The impulse each manoeuvre of the coast gave on this run, m/s, by the event that lit it (`BurnFlown.velocity`). */
  [burn: `${string}.velocity`]: number;
  /** How far the target was at an instant a check states (`CheckWhen` `reading: 'range'`), m, by the check's id: on a run flown with its target. */
  [sighting: `${string}.range`]: number;
}
/** What a check of the orbit at an instant reads. */
export type OrbitReading = 'perigee' | 'apogee' | 'period';

/** The plan's checks of the orbit at an instant, grouped by instant, earliest first. */
function readingsOf(plan: FlightPlan): { at: number; ids: string[] }[] {
  const by = new Map<number, string[]>();
  for (const c of plan.checks)
    if (c.of === 'orbit' && c.when && 'reading' in c.when && c.when.reading === 'orbit')
      by.set(c.when.at, [...(by.get(c.when.at) ?? []), c.id]);
  return [...by].map(([at, ids]) => ({ at, ids })).sort((a, b) => a.at - b.at);
}

export type OrbitPhase = 'orbit' | 'braking' | 'descent' | 'entry' | 'down';

/** The coast at one instant. */
export interface OrbitSample {
  rotation?: CoastRotation;
  /** Seconds from liftoff. */
  t: number;
  phase: OrbitPhase;
  /** Height above the sea, m, and the place below: degrees north and east. */
  altitude: number;
  latitude: number;
  longitude: number;
  /** Speed in the frame that does not turn, and through air that turns with the Earth, m/s. */
  speed: number;
  groundSpeed: number;
  /** What an accelerometer reads, in g; dynamic pressure, Pa; Mach number. */
  g: number;
  q: number;
  mach: number;
  /** How much of the Sun's disc it sees: 1 in sunlight, 0 in the Earth's shadow. */
  sunlit: number;
  /** Position and velocity in the flight's frame (world/earthframe.ts), m and m/s. */
  r: Vec3;
  v: Vec3;
}

/**
 * A manoeuvre as a run flew it: lit and cut, the impulse it gave, m/s, and the line it pushed along where it kept one
 * (the flight's frame). Guidance's own where it solved the burn on the target (sim/pursuit.ts), the plan's otherwise.
 */
export interface BurnFlown {
  /** The events that lit and cut it, by id. */
  lit: string;
  cut: string;
  on: number;
  off: number;
  velocity: number;
  line?: Vec3;
  solved: boolean;
}

export interface OrbitFlown {
  samples: OrbitSample[];
  results: OrbitResults;
  /** The coast's manoeuvres as this run flew them, in the order lit; left out with none. */
  burns?: BurnFlown[];
}

/** Where the air is taken to begin for the choice of step, and where it is thick: m above the sea. */
const THIN = 150_000;
const THICK = 100_000;
/** The entry interface the results are quoted at, m above the sea: a convention, not a property of the air. */
const INTERFACE = 100_000;

/**
 * Where the record puts the injection on its orbit, in a frame whose +Z is the pole and in which `pad` is the launch
 * site's place at liftoff: the node of the plane of the published inclination through the pad, the argument of latitude
 * `injection.arc` round from the pad, and the true anomaly there.
 */
function injectionOn(o: NonNullable<NonNullable<FlightPlan['record']>['orbit']>, pad: Vec3): OnOrbit {
  const i = o.inclination.value * DEG;
  const n = planeThrough(pad, i, o.injection.heading === 'north');
  if (!n) throw new Error(`no orbit inclined ${o.inclination.value} degrees passes over the pad`);
  const arc = o.injection.arc.value * DEG;
  const from = unit(pad);
  const at = add(scale(from, Math.cos(arc)), scale(cross(n, from), Math.sin(arc)));
  const node = Math.atan2(n[0], -n[1]);
  const toNode: Vec3 = [Math.cos(node), Math.sin(node), 0];
  const latitude = Math.atan2(dot(at, cross(n, toNode)), dot(at, toNode));
  return { node, latitude, anomaly: o.injection.anomaly.value * DEG };
}

/**
 * The orbit the record gives, as a position and velocity at `injection.at`, in the flight's frame (world/earthframe.ts):
 * the elements are of date and are worked in the frame of date, then turned into it. The plane is the one of the
 * published inclination through the launch site's place at liftoff; the place on it and the perigee are `injection`'s.
 */
export function injectionState(plan: FlightPlan, site: Geodetic, frame: EarthFrame): State {
  const o = shipOf(plan).orbit;
  const pad = frame.toDate(frame.toInertial(geodeticToEcef(site), 0));
  // (the published orbit read as mean elements, its period nodal: world/meanelements.ts; the place on it is the mean orbit's)
  const s = fromPublished(publishedOf(plan, site), injectionOn(o, pad)).state;
  return { r: frame.fromDate(s.r), v: frame.fromDate(s.v) };
}

/**
 * A tracking fix as a state in the integrator's frame: what a run is compared with at that instant, its residual recorded.
 * Never a state a run is put on: a run's state is changed by what pushes it and by nothing else.
 */
export function trackedState(fix: OrbitFix, frame: EarthFrame): State {
  const place = { latitude: fix.latitude.value, longitude: fix.longitude.value, height: fix.altitude.value };
  const t = fix.at.value;
  const r = frame.toInertial(geodeticToEcef(place), t);
  const up = unit(r);
  const east = unit(cross([0, 0, 1], up));
  const north = cross(up, east);
  const heading = fix.heading.value * DEG;
  const climb = fix.climb.value * DEG;
  const flat = add(scale(north, Math.cos(heading)), scale(east, Math.sin(heading)));
  return { r, v: scale(add(scale(flat, Math.cos(climb)), scale(up, Math.sin(climb))), fix.speed.value) };
}

/**
 * The ball the record's heights are over, m, so that it never contradicts the record's own figures:
 * - the one it states (Friendship 7's equatorial radius);
 * - the oblate earth where it says its heights are the apsides flown over it (`over`, Gemini 3's, from the Gemini IV and V
 *   reports): the ellipsoid under the apsis and the lift of the mean orbit's apsides over the radii flown there
 *   (world/meanelements.ts `flownApsisBall`, some 6 km at 30 degrees), so that every height read off the run as a mean
 *   orbit's is a flown apsis over the ellipsoid;
 * - with heights and a period published for the one orbit, the ball those three imply (derived: the mean orbit's axis
 *   whose nodal period is the published one, less the mean height, `meanOrbitOf`'s `radius`; no free figure), which is
 *   the ellipsoid's radius under an apsis at the latitude they imply, not always the injection's (Vostok 1's 41 degrees,
 *   Vostok 5's 47: tests/apsis.test.mjs, each flight's mission.md);
 * - with heights alone (Vostok 3), the convention (world/meanelements.ts `CONVENTION.radius`, assumed on the sister
 *   flights' sets that fit it): the WGS 84 ellipsoid's radius under the apsis where the record's injection puts the
 *   perigee (its argument of latitude less its anomaly; the apogee opposite, at the same radius).
 * Every height of the record becomes a radius over it, and every height read off a run of the record (the apogee flown
 * round, the orbit at a stated instant, the ascent's at its last cutoff and its target) is over it.
 */
export const heightsBall = (plan: FlightPlan, site: Geodetic): number => heightsBallAt(plan, geodeticToEcef(site));

/** `heightsBall` with the pad's place at liftoff given in any frame whose +Z is the pole: an argument of latitude does not turn with the Earth. */
export function heightsBallAt(plan: FlightPlan, pad: Vec3): number {
  const o = plan.record!.orbit!;
  if (o.radius) return o.radius.value;
  const argp = perigeeAt(plan, pad);
  const i = o.inclination.value * DEG;
  // (the oblate earth, its heights the apsides flown: the ellipsoid under the apsis and the mean orbit's lift there)
  if (o.over?.is === 'oblate') return flownApsisBall(o.perigee.value, o.apogee.value, i, argp);
  // (heights and a period of the one orbit: the ball the three imply, read as the coast reads them; heights alone: the ellipsoid)
  if (o.period)
    return meanOrbitOf(
      { perigee: o.perigee.value, apogee: o.apogee.value, inclination: i, period: o.period.value, ...(o.kind ? { kind: o.kind.is } : {}) },
      argp,
    ).radius;
  return CONVENTION.radius.value(i, argp);
}

/** The published orbit's argument of perigee where the record's injection puts it (its argument of latitude less its anomaly), rad; `pad` as `heightsBallAt`'s. */
export function perigeeAt(plan: FlightPlan, pad: Vec3): number {
  const at = injectionOn(plan.record!.orbit!, pad);
  return at.latitude - at.anomaly;
}

/**
 * A record's published orbit as world/meanelements.ts reads it: its heights, inclination and period, the period of the
 * kind its `CONVENTION` takes (nodal, estimated; a record with none gives none, and the heights' mean over its ball is
 * then the axis), over the ball its heights are over (`heightsBall`). `kind` 'osculating' reads it as every run here read it
 * before: the heights over the ball as the osculating orbit.
 */
export function publishedOf(plan: FlightPlan, site: Geodetic, kind?: PeriodKind): PublishedOrbit {
  const o = plan.record!.orbit!;
  return {
    perigee: o.perigee.value,
    apogee: o.apogee.value,
    inclination: o.inclination.value * DEG,
    ...(o.period ? { period: o.period.value } : {}),
    radius: heightsBall(plan, site),
    ...((kind ?? o.kind?.is) ? { kind: kind ?? o.kind!.is } : {}),
  };
}
/**
 * The drag of a body in orbit, switched by where it is flown: the coast's (flyOrbit, the predicted path, the descent's
 * entry body above the ejection height) and the orbit's life (`decay`). Off, each flies what it did until November 2026,
 * which gives the old capture back to the bit: the coast the entry curve's continuum figure on the ball's disc whatever
 * the air, the decay the ball's free-molecule figure on its disc.
 */
export const ORBIT_DRAG = { coast: true, decay: true };

/**
 * The upper air by the day's Sun (world/thermosphere.ts: Jacchia 1971 on the day's 10.7 cm flux and Kp), switched. Off,
 * the 1976 standard's mean air everywhere, as until November 2026 (the old capture to the bit).
 */
export const SOLAR_AIR = { on: true };

/**
 * The factor the day's Sun puts on the standard's density at a place in the flight's frame (`r`, at `at` seconds from
 * liftoff, `height` m above the sea): world/thermosphere.ts `ratioOf` at the place's latitude and the Sun's declination
 * and local hour angle there, derived from the day's indices (documented). 1 below 90 km, with `SOLAR_AIR` off, and on a
 * day whose indices are not held (the standard flown, and said by `solarDay`).
 */
export function solarAt(frame: EarthFrame, r: Vec3, at: number, height: number): number {
  if (!SOLAR_AIR.on || height <= 90_000) return 1;
  const sun = sunPosition(frame.jdTT(at));
  const p = frame.toDate(r);
  const declination = Math.asin(sun[2] / length(sun));
  const hourAngle = Math.atan2(p[1], p[0]) - Math.atan2(sun[1], sun[0]);
  return ratioOf(height, frame.jdUT(at), frame.place(r, at).latitude * DEG, declination, hourAngle) ?? 1;
}

/**
 * The share of the free-molecule figure in a drag at a Knudsen number (the mean free path over the body's length):
 * Wilmoth, Mitcheltree and Moss, "Low-density aerodynamics of the Stardust sample return capsule", J. Spacecraft and
 * Rockets 36(3), 436-441, 1999, eqs. 1 and 2, sin^2 pi (a1 + a2 log10 Kn), with the limits they took, the continuum at
 * Kn 0.001 and the free-molecule at 10, so a1 = 3/8 and a2 = 1/8 (derived from those limits). For the 2.43 m ship in the
 * standard air: free-molecular above about 145 km, half and half at 103, continuum below about 76 km.
 */
export function rarefaction(knudsen: number): number {
  if (!(knudsen > 0.001)) return 0;
  if (knudsen >= 10) return 1;
  return Math.sin(Math.PI * (3 / 8 + Math.log10(knudsen) / 8)) ** 2;
}

/**
 * What a spacecraft in orbit drags, its drag coefficient times area, m^2, at a height above the sea and a Mach number:
 * the joined ship (`joined`, until the modules part) or the body that comes down. In continuum flow the body that comes
 * down's curve on its own area, joined or not (no figure for the joined ship's has been read: it is the coast's
 * convention, and on the record the modules part above the air that matters); in free-molecule flow the joined craft's
 * figure (`Craft.rarefied`) or the body's own (`AeroDef.rarefied`) on its area; between, bridged by the Knudsen number
 * (`rarefaction`) on the joined craft's length or the body's diameter. Without a free-molecule figure, the continuum's.
 */
export function orbitDrag(ship: Ship, joined: boolean, height: number, mach: number): number {
  const e = ship.entry.aero;
  const continuum = e.area.value * along(e.drag, mach);
  const free = joined ? ship.rarefied : e.rarefied && { drag: e.rarefied, area: e.area, length: null };
  if (!free) return continuum;
  const length = free.length ? free.length.value : 2 * Math.sqrt(e.area.value / Math.PI);
  return continuum + (free.drag.value * free.area.value - continuum) * rarefaction(meanFreePath(height) / length);
}

/**
 * What pushes the spacecraft on its own, but gravity, m/s^2 (the coast's forces: flyOrbit's, and the predicted path's,
 * sim/fliers.ts): the air on what flies (`orbitDrag`: the joined ship's figure and mass until the modules part, the entry body's after), at an
 * instant, its motion through the air `wind` (m/s, in any frame: the push comes back in the same one) and its height above
 * the sea; and, while `aim` is given (a unit vector in that frame), the braking engine's even acceleration along it.
 * `sun`: the factor the day's Sun puts on the standard's density there (`solarAt`). `more`: a manoeuvre's push, m/s^2, in
 * the same frame (`movingAt`), and the plumb line there, which the entry body's lift is turned from (`liftOf`): it lifts
 * only alone, with a lift of its own, while a bank is held.
 */
export function shipPush(
  plan: FlightPlan,
  at: number,
  wind: Vec3,
  altitude: number,
  aim: Vec3 | null,
  sun = 1,
  more?: { push?: Vec3 | null; up?: () => Vec3 },
): Vec3 {
  const ship = shipOf(plan);
  const air = atmosphere(altitude);
  const airspeed = length(wind);
  const mach = airspeed / air.soundSpeed;
  const mass = at >= ship.parted ? ship.entry.mass : ship.mass;
  const area = ORBIT_DRAG.coast
    ? orbitDrag(ship, at < ship.parted, altitude, mach)
    : ship.entry.aero.area.value * along(ship.entry.aero.drag, mach);
  let drag = scale(airDrag(wind, airspeed, air.density * sun, area), 1 / mass);
  // (the entry body alone, trimmed and banked: its lift square to its motion through the air, turned from the plumb line)
  const lift = ship.entry.aero.lift;
  const bank = lift && more?.up && at >= ship.parted ? bankAt(ship, at) : null;
  if (lift && bank !== null) drag = add(drag, liftOf(drag, wind, more!.up!(), along(lift, mach), bank));
  if (more?.push) drag = add(drag, more.push);
  // (the braking engine is on the instrument module: parted, it pushes no more)
  return aim ? add(drag, scale(aim, ship.flown / (ship.off - ship.on))) : drag;
}

/**
 * A lifting body's lift, m/s^2: `ratio` (lift over drag) times the drag `drag` (m/s^2), square to the motion through the
 * air `wind`, in the plane of the motion and the plumb line `up` and turned about the motion by `bank` degrees, lift up at
 * 0 and to the right of the motion at 90. Nothing where the motion is along the plumb line.
 */
export function liftOf(drag: Vec3, wind: Vec3, up: Vec3, ratio: number, bank: number): Vec3 {
  const w = unit(wind);
  const level = sub(up, scale(w, dot(up, w)));
  const size = length(level);
  if (!(size > 1e-9) || !ratio) return [0, 0, 0];
  const n = scale(level, 1 / size);
  const right = cross(w, n);
  const b = bank * DEG;
  return scale(add(scale(n, Math.cos(b)), scale(right, Math.sin(b))), ratio * length(drag));
}

/** The bank held at `at`, degrees: the last a plan's event set at or before it; null while none is held. */
export function bankAt(ship: Pick<Ship, 'banks'>, at: number): number | null {
  let held: number | null = null;
  for (const b of ship.banks) if (b.at <= at) held = b.bank;
  return held;
}

/**
 * The line a burn pushes along as it lights, for the attitude it is held in (`hold`), from the spacecraft's place and
 * velocity then (and the Sun's place, asked for only when the aim is at the Sun, and the plumb line, for a pitch below the
 * level), all in the flight's frame (world/earthframe.ts).
 */
export function aimFor(a: Extract<Hold, { aim: unknown }>, r: Vec3, v: Vec3, sun: () => Vec3, up: () => Vec3 = () => unit(r)): Vec3 {
  const line = a.aim === 'fixed' && a.vector ? a.vector : a.aim === 'sun' ? sub(sun(), r) : a.aim === 'normal' ? cross(r, v) : v;
  const along = scale(unit(line), a.sense);
  if ((!a.below && !a.yaw) || a.aim !== 'velocity') return along;
  // (along or against the motion, laid level, turned about the plumb line by `yaw` toward the left of the motion, then
  // pitched down below the level by `below`: the plumb line where it is)
  const u = up();
  const flat = unit(sub(along, scale(u, dot(along, u))));
  const y = (a.yaw?.value ?? 0) * DEG;
  const left = unit(cross(u, scale(flat, a.sense)));
  const level = y === 0 ? flat : add(scale(flat, Math.cos(y)), scale(left, Math.sin(y)));
  const b = (a.below?.value ?? 0) * DEG;
  return add(scale(level, Math.cos(b)), scale(u, -Math.sin(b)));
}

/**
 * The line the braking engine pushes along as it lights, from the spacecraft's place and velocity then (and the Sun's
 * place, asked for only when the aim is at the Sun), all in the flight's frame (world/earthframe.ts): flyOrbit's, and
 * the predicted path's.
 */
export function aimOf(plan: FlightPlan, r: Vec3, v: Vec3, sun: () => Vec3, up: () => Vec3 = () => unit(r)): Vec3 {
  const aim = shipOf(plan).aim;
  if (!aim) throw new Error('this plan’s coast has no burn to aim');
  return aimFor(aim, r, v, sun, up);
}

/**
 * A burn of the coast other than its braking burn: a manoeuvre (Gemini's thrusters changing the orbit, by hand). `on` and
 * `off` are when the clock lights and cuts it; it pushes `accel` m/s^2 along the line its attitude (`aim`, the one the
 * attitude event last set off at or before it lit) gives as it lights, fixed from there.
 */
export interface Move {
  engine: string;
  label: string;
  /** The events that light and cut it, by id. */
  lit: string;
  cut: string;
  on: number;
  off: number;
  accel: number;
  aim: Extract<Hold, { aim: unknown }>;
  /** Propellant carried by a restartable engine and drawn by this firing, kg. */
  fuel?: number;
  /**
   * What it is for, where it is made on the flight's target (`Action.ignite.toward`): with the target there, guidance
   * solves its line and length as it lights (sim/pursuit.ts) and `aim`, `accel` times its recorded length and `off` are
   * the record's, which the solved burn is held against. `most`: the most its engine can push the ship, m/s^2.
   */
  toward?: Pursuit;
  most?: number;
}

/** Capacity of the propulsion system carried into the coast. */
function coastTank(plan: FlightPlan, engine: EngineDef): number {
  const tank = plan.craft[0]!.tanks.find((t) => t.id === engine.tanks[0]);
  return tank ? (tank.usable ?? tank.load).value : Infinity;
}

function rocketFuel(engine: EngineDef, mass: number, velocity: number): number {
  return mass * -Math.expm1(-velocity / (G0 * engine.isp!.vacuum.value));
}

/**
 * The coast's manoeuvres, in the order lit: each automatic lighting on the clock of an engine of the first craft that is
 * neither a stage nor the final deorbit firing, up to that engine's next cut on the
 * clock. It pushes the lighting's own impulse (`Action.flown`) evenly over that time, or else its engine's chambers at
 * their vacuum thrust over the ship's mass in orbit (what they burn is not taken off), along the attitude held as it lit (against it for one that pushes `astern`),
 * which must be an aim. None for a plan with no such engine: every flight flown before Gemini's.
 */
export function movesOf(plan: FlightPlan): Move[] {
  const c = plan.craft[0]!;
  const deorbit = coastEvents(plan).on;
  const engines = c.engines.filter((e) => !e.tanks.length || e.flown);
  if (!engines.length) return [];
  const timed = plan.events
    .filter((e) => e.automatic)
    .map((e) => ({ e, at: clockAt(plan, e) }))
    .filter((x) => x.at < Number.MAX_SAFE_INTEGER)
    .sort((p, q) => p.at - q.at);
  const holdAt = (t: number): AttitudeDef | undefined => {
    let held: AttitudeDef | undefined = plan.attitude[0];
    for (const x of timed)
      if (x.at <= t) for (const a of x.e.do) if ('attitude' in a) held = plan.attitude.find((d) => d.id === a.attitude) ?? held;
    return held;
  };
  const mass = plan.record?.orbit?.mass.value ?? c.mass.value;
  const out: Move[] = [];
  for (const engine of engines)
    for (const x of timed)
      for (const a of x.e.do) {
        if (x.e === deorbit || !('ignite' in a) || a.ignite !== engine.id) continue;
        const cut = timed.find((y) => y.at > x.at && y.e.do.some((b) => 'cut' in b && b.cut === engine.id));
        if (!cut) continue;
        const hold = holdAt(x.at);
        if (!hold || !('aim' in hold.hold)) throw new Error(`${x.e.id} lights ${engine.id} in an attitude that is not an aim`);
        const off = Math.max(cut.at, x.at + (a.firingTime?.value ?? 0));
        const prior = out.filter((m) => m.engine === engine.id);
        const used = prior.reduce((sum, m) => sum + (m.fuel ?? 0), 0);
        if (prior.length >= engine.starts.count || used >= coastTank(plan, engine)) continue;
        const burnMass = a.massAtIgnition?.value ?? mass - used;
        const want = a.flown?.value ?? ((engine.count * engine.thrust.vacuum.value) / burnMass) * (off - x.at);
        const fuel = engine.tanks.length ? Math.min(coastTank(plan, engine) - used, rocketFuel(engine, burnMass, want)) : undefined;
        const velocity = fuel === undefined ? want : -G0 * engine.isp!.vacuum.value * Math.log1p(-fuel / burnMass);
        const size = velocity / (off - x.at);
        // (a forward-firing pair pushes toward the tail: against the line its attitude points the nose along)
        const accel = engine.astern ? -size : size;
        out.push({
          engine: engine.id,
          label: x.e.label,
          lit: x.e.id,
          cut: cut.e.id,
          on: x.at,
          off,
          accel,
          aim: hold.hold,
          ...(fuel === undefined ? {} : { fuel }),
          ...(a.toward ? { toward: a.toward, most: (engine.count * engine.thrust.vacuum.value) / burnMass } : {}),
        });
      }
  return out.sort((p, q) => p.on - q.on);
}

/**
 * The manoeuvres' push from the instant `as` the ship is from, m/s^2, each along its line (`lines`, by its index, fixed as
 * it lit); null with none burning. A braking held on the target has no line: its thrust is commanded as it goes (`holding`).
 */
export function movingAt(moves: readonly Move[], lines: readonly (Vec3 | undefined)[], as: number): Vec3 | null {
  let push: Vec3 | null = null;
  moves.forEach((m, i) => {
    const line = lines[i];
    if (line && as >= m.on && as < m.off) push = add(push ?? [0, 0, 0], scale(line, m.accel));
  });
  return push;
}

/**
 * The spacecraft in orbit as its plan has it, for the coast: the published orbit and the ship's mass on it; the burn the
 * record's coast flies (the engine with the record's impulse, `EngineDef.flown`), lit and cut at its instants and pushing
 * along the attitude held by an aim (`Hold.aim`); the body that comes down (the first with its own air, `BodyDef.aero`),
 * at the mass the parting joint leaves (`JointDef.after`) from the instant it parts; and where the record has it land.
 */
export function shipOf(plan: FlightPlan): Ship {
  let ship = ships.get(plan);
  if (ship) return ship;
  const c = plan.craft[0]!;
  const orbit = plan.record!.orbit!;
  const coast = coastOf(plan);
  // (a flight whose coast has no burn of the record's, an uncrewed target, stays up: nothing is lit, nothing parts, and
  // what it flies is what it is; one that never reached orbit is down where it meets the sea)
  const burn = c.engines.find((e) => e.flown);
  const manoeuvres = movesOf(plan);
  const ignition = burn && coastEvents(plan).on?.do.find((a) => 'ignite' in a && a.ignite === burn.id);
  const prior = manoeuvres.filter((m) => m.engine === burn?.id && m.on < coast.on);
  const used = prior.reduce((sum, m) => sum + (m.fuel ?? 0), 0);
  const burnMass = (ignition && 'ignite' in ignition ? ignition.massAtIgnition?.value : undefined) ?? orbit.mass.value - used;
  const available = burn ? coastTank(plan, burn) - used : 0;
  const velocity = burn?.flown?.value ?? 0;
  const fuel = burn?.tanks.length ? Math.max(0, Math.min(available, rocketFuel(burn, burnMass, velocity))) : 0;
  const joint = burn && c.joints.find((j) => j.gone.includes(burn.body));
  const entry = c.bodies.find((b) => b.aero) ?? c.bodies[c.bodies.length - 1]!;
  if (!entry.aero) throw new Error(`the plan's '${entry.id}' has no air of its own to fly its coast on`);
  // (the aim the burn lights in: the one an event turns it to at or before its lighting, else the plan's last aim)
  let aim: AttitudeDef | undefined;
  for (const a of plan.attitude) if ('aim' in a.hold) aim = a;
  let turnedAt = Number.NEGATIVE_INFINITY;
  const banks: { at: number; bank: number }[] = [];
  for (const e of plan.events) {
    if (!e.automatic) continue;
    const at = clockAt(plan, e);
    for (const a of e.do) {
      const def = 'attitude' in a ? plan.attitude.find((d) => d.id === a.attitude) : undefined;
      if (!def) continue;
      if ('aim' in def.hold && at <= coast.on && at >= turnedAt) {
        aim = def;
        turnedAt = at;
      }
      if ('bank' in def.hold && at < Number.MAX_SAFE_INTEGER) banks.push({ at, bank: def.hold.bank.value });
    }
  }
  banks.sort((p, q) => p.at - q.at);
  ship = {
    orbit,
    mass: orbit.mass.value,
    ...coast,
    ...(burn ? {} : { floor: Math.max(coast.floor, 0) }),
    flown: burn?.tanks.length ? -G0 * burn.isp!.vacuum.value * Math.log1p(-fuel / burnMass) : velocity,
    fuel,
    ...(aim ? { aim: aim.hold as Extract<Hold, { aim: unknown }>, aimId: aim.id } : {}),
    entry: { id: entry.id, mass: joint?.after?.value ?? orbit.mass.value, aero: entry.aero },
    ...(c.rarefied ? { rarefied: c.rarefied } : {}),
    ...(plan.record!.landing ? { landing: plan.record!.landing } : {}),
    moves: manoeuvres,
    banks,
  };
  ships.set(plan, ship);
  return ship;
}
export interface Ship {
  orbit: NonNullable<NonNullable<FlightPlan['record']>['orbit']>;
  /** The spacecraft in orbit, kg. */
  mass: number;
  /** The burn lit and cut, the body it is on let go, the height what comes down is let loose at, and the events of the last two (`coastOf`). */
  on: number;
  off: number;
  parted: number;
  floor: number;
  parting: string | null;
  loose: string | null;
  /** The impulse the record's coast flies, m/s, evenly from `on` to `off`, along `aim`. */
  flown: number;
  fuel: number;
  /** Where the burn is aimed, and the attitude that holds it, by id: none where the coast has no burn. */
  aim?: Extract<Hold, { aim: unknown }>;
  aimId?: string;
  /** What comes down: its id, its mass once parted, kg, and its own air. */
  entry: { id: string; mass: number; aero: AeroDef };
  /** The joined ship in the free-molecule flow of its orbit (`Craft.rarefied`), where the plan gives it. */
  rarefied?: NonNullable<Craft['rarefied']>;
  /** Where the record has it come down: none for one that stays up, or whose end the record does not place. */
  landing?: NonNullable<NonNullable<FlightPlan['record']>['landing']>;
  /** The coast's manoeuvres, in the order lit (`movesOf`). */
  moves: Move[];
  /** The banks the plan's events hold the entry body at, from their instants, degrees, in order (`Hold.bank`). */
  banks: { at: number; bank: number }[];
}
const ships = new WeakMap<FlightPlan, Ship>();

/** Propellant and starts left in an orbital engine at this instant. */
export function coastEngineState(plan: FlightPlan, id: string, at: number): { starts: number; kg: number } {
  const engine = plan.craft[0]!.engines.find((e) => e.id === id);
  if (!engine) return { starts: 0, kg: 0 };
  const ship = shipOf(plan);
  const burns = ship.moves.filter((m) => m.engine === id && m.on <= at);
  const deorbit = Boolean(engine.flown && ship.on <= at);
  const used = burns.reduce((sum, m) => sum + (m.fuel ?? 0) * Math.min(1, (at - m.on) / (m.off - m.on)), 0);
  const final = deorbit ? ship.fuel * Math.min(1, (at - ship.on) / (ship.off - ship.on)) : 0;
  return { starts: engine.starts.count - burns.length - Number(deorbit), kg: Math.max(0, coastTank(plan, engine) - used - final) };
}

/**
 * The coast's instants as the plan has them (sim/plan.ts, written from the record by vostok-plan.ts, or that plan as a hand changed
 * it): the burn the record's coast flies (the engine with the record's impulse, `EngineDef.flown`) lit and cut, the
 * body it is on let go, and the height at which what comes down is let loose after that (the event set off by height once
 * the parting has happened). Never: the largest safe integer, as a plan given up has it, or Infinity.
 */
export function coastOf(plan: FlightPlan): Coast {
  const timeOf = (e: EventDef | undefined): number => clockAt(plan, e);
  const { burn, on, off, parting } = coastEvents(plan);
  const ignition = on?.do.find((a) => 'ignite' in a && a.ignite === burn?.id);
  const firingTime = ignition && 'ignite' in ignition ? (ignition.firingTime?.value ?? 0) : 0;
  // (a solid nothing cuts burns until it is spent: so long after it is lit)
  const spent = !off && burn?.kind === 'solid' && burn.burn ? timeOf(on) + burn.burn.value : Number.POSITIVE_INFINITY;
  const down =
    parting && plan.events.find((e) => e.when.some((w) => 'after' in w && w.after === parting.id) && e.when.some((w) => 'height' in w));
  const height = down?.when.find((w) => 'height' in w);
  return {
    on: timeOf(on),
    off: off ? Math.max(timeOf(off), timeOf(on) + firingTime) : spent,
    parted: timeOf(parting),
    floor: height && 'height' in height ? height.height : Number.NEGATIVE_INFINITY,
    parting: parting?.id ?? null,
    loose: down?.id ?? null,
  };
}
/**
 * The events the coast's instants are read from: the burn the record's coast flies, lit and cut, and its body let go (the
 * automatic events that do them); the command its lighting follows (the event it is set off `after`), where it has one,
 * and what that command arms (a timer it starts).
 */
export function coastEvents(plan: FlightPlan): {
  burn?: EngineDef;
  command?: EventDef;
  armed: EventDef[];
  on?: EventDef;
  off?: EventDef;
  parting?: EventDef;
} {
  const c = plan.craft[0]!;
  const doing = (test: (a: Action) => boolean) => plan.events.find((e) => e.automatic && e.do.some(test));
  const burn = c.engines.find((e) => e.flown);
  if (!burn) return { armed: [] };
  const joint = c.joints.find((j) => j.gone.includes(burn.body));
  const parting = joint && doing((a) => 'separate' in a && a.separate === joint.id);
  const on = [...plan.events].reverse().find((e) => e.automatic && e.do.some((a) => 'ignite' in a && a.ignite === burn.id));
  const off =
    on && plan.events.slice(plan.events.indexOf(on) + 1).find((e) => e.automatic && e.do.some((a) => 'cut' in a && a.cut === burn.id));
  const follows = on?.when.find((w) => 'after' in w);
  const command = follows && 'after' in follows ? eventOf(plan, follows.after) : undefined;
  const armed = (command?.do ?? []).flatMap((a) => ('arm' in a ? [eventOf(plan, a.arm)!] : []));
  return {
    burn,
    ...(command ? { command } : {}),
    armed,
    ...(on ? { on } : {}),
    ...(off ? { off } : {}),
    ...(parting ? { parting } : {}),
  };
}
export interface Coast {
  /** The burn lit and cut, the body it is on let go, the height what comes down is let loose at, s and m. */
  on: number;
  off: number;
  parted: number;
  floor: number;
  /** The events that let the burn's body go and that set what comes down loose at `floor`, by id. */
  parting: string | null;
  loose: string | null;
}

/**
 * The flight's target (`FlightPlan.target`) as a craft of its own from `start`, where it began (a stage let go: the
 * stack's state at the parting with the stage's side of the joint's push): gravity, and the air of the day's Sun on its
 * drag area at its mass, down to the top of the thick air, where it is taken to be gone. Undefined for a plan with none.
 */
export function targetFrom(
  plan: FlightPlan,
  frame: EarthFrame,
  seaLevel: number,
  start: { t: number; r: Vec3; v: Vec3 },
): Target | undefined {
  const def = plan.target;
  if (!def) return undefined;
  const k = def.dragArea.value / def.mass.value;
  return flownFrom(
    start,
    (s, at) => {
      const air = airAt(frame, s.r, s.v, at, seaLevel);
      return airDrag(air.wind, air.airspeed, air.air.density * solarAt(frame, s.r, at, air.altitude) * k, 1);
    },
    (s, at) => frame.place(s.r, at).height - seaLevel < THICK,
  );
}

/** Local rigid-body encounters on a hand-flown coast. The scene gets the same corrected
 * position and velocity that the next integration step starts from. */
export interface CoastContacts {
  rotation?(t: number, incoming?: boolean): CoastRotation | undefined;
  limit(t: number): number;
  advance(before: State, from: number, after: State, to: number, impulse?: (t: number, dv: Vec3) => void): State;
}

/**
 * Fly the coast: from the published orbit round to the braking burn, and down through the air to
 * the height the pilot left at. `site` is where it was launched from and `frame` the flight's (world/earthframe.ts:
 * made from the instant of liftoff), which between them fix the orbit's plane, the Earth's turning under it and the Sun.
 * `seaLevel` is the sea's height above the ellipsoid, taken as the same everywhere. `every`: how
 * often a sample is kept, s. With `hands` (the flight deck's descent by hand), the coast hands
 * over to flyDown at the first event of the descent a hand gave, if that comes before the height.
 *
 * Forces: gravity with J2 (world/orbit.ts); the air of atmosphere.ts turning with the Earth, on
 * what flies (`orbitDrag`: in the free-molecule flow of the orbit the joined ship's figure until the modules part and
 * the entry body's after, in the continuum below the entry body's curve, bridged between by the Knudsen number); the braking burn as an even acceleration, which the modules' parting ends (the
 * engine is on the instrument module); each manoeuvre's push (`movesOf`), along the line it lit on; the entry body's lift
 * where it has one, while a bank is held (`liftOf`). No wind.
 * Fixed steps of fourth-order Runge-Kutta: 10 s above 150 km, 1 s to 100 km and through the
 * burn, 0.05 s below, each cut to end on the next event, so one input gives one flight.
 */
export function flyOrbit(
  plan: FlightPlan,
  site: Geodetic,
  frame: EarthFrame,
  seaLevel = 0,
  every = 10,
  from?: { t: number; r: Vec3; v: Vec3 },
  hands?: DescentHands,
  contacts?: CoastContacts,
  stopAt = Infinity,
  pursued?: Target,
): OrbitFlown {
  const sunAt = (t: number): Vec3 => frame.fromDate(sunPosition(frame.jdTT(t)));
  const ship = shipOf(plan);
  const { on, off, parted, floor } = ship;
  // (this run's own: a burn guidance solves ends when it has given what was solved, not at the record's instant)
  const moves = ship.moves.map((m) => ({ ...m }));
  /** The manoeuvres held on the target, by index: braking and station-keeping, their thrust commanded as they go. */
  const holding: boolean[] = moves.map(() => false);
  const burns: BurnFlown[] = [];
  const radius = heightsBall(plan, site);
  const interfaceHeight = plan.record?.entryInterface?.value ?? INTERFACE;
  /** Each manoeuvre's line, fixed as it lit (`movesOf`). */
  const lines: (Vec3 | undefined)[] = moves.map(() => undefined);
  const lifts = Boolean(ship.entry.aero.lift && ship.banks.length);

  // (from the published orbit, or from wherever the ascent flown left the spacecraft: sim/staged.ts)
  let t = from ? from.t : ship.orbit.injection.at.value;
  let state: State = from ? { r: from.r, v: from.v } : injectionState(plan, site, frame);
  // (the record's tracking fixes are instants a sample is kept at, so the run can be held against each: they move nothing)
  const fixes = (plan.record?.coastFixes ?? []).filter((fix) => fix.at.value > t);
  let aim: Vec3 = [0, 0, 0];
  /** The line the braking engine pushes along, fixed where it lay as the engine lit. */
  const aimAt = (s: State, at: number): Vec3 =>
    aimOf(
      plan,
      s.r,
      s.v,
      () => sunAt(at),
      () => frame.upOver(frame.place(s.r, at), at),
    );

  // (no wind: none has been read for the coast's places)
  // (the coast and what comes down from it are far from the pad, hours on: the standard air, and calm: air.ts `skyOf`)
  const airOf = (s: State, at: number) => airAt(frame, s.r, s.v, at, seaLevel);
  /**
   * Everything but gravity, m/s^2, with the ship as it is from instant `as` (the engine lit or not, the modules joined or
   * not) at a state at `at`. A step ends on every instant the ship changes at, so within a step it is as it was at the
   * step's start: the burn's last step is pushed to its end, and the step before the modules part carries the whole ship.
   * (Read at each stage's own instant, the stage that ends a step on the cutoff had the engine off, and the burn came out
   * a sixth of a step short: 0.5 m/s of Vostok 1's 136.)
   */
  const either = (a: Vec3 | null, b: Vec3 | null): Vec3 | null => (a && b ? add(a, b) : (a ?? b));
  /** The thrust commanded on the target by the manoeuvres held on it (`holding`), m/s^2; null with none. */
  const held = (s: State, at: number, as: number): Vec3 | null => {
    let out: Vec3 | null = null;
    moves.forEach((m, i) => {
      if (!holding[i] || as < m.on || as >= m.off || !m.toward || !('station' in m.toward)) return;
      const want = { ahead: m.toward.station.ahead.value, above: m.toward.station.above.value };
      out = add(out ?? [0, 0, 0], stationPush(pursued!, s, at, want, ship.moves[i]!.off, m.most!));
    });
    return out;
  };
  const pushAs = (s: State, at: number, as: number): Vec3 => {
    const air = airOf(s, at);
    const more =
      moves.length || lifts
        ? { push: either(movingAt(moves, lines, as), held(s, at, as)), up: () => frame.upOver(frame.place(s.r, at), at) }
        : undefined;
    return shipPush(
      plan,
      as,
      air.wind,
      air.altitude,
      as >= on && as < off && as < parted ? aim : null,
      solarAt(frame, s.r, at, air.altitude),
      more,
    );
  };
  const push = (s: State, at: number): Vec3 => pushAs(s, at, at);
  /** The run's own forces flown ahead with a burn, for guidance to solve one on (sim/pursuit.ts `Ahead`): the air, and the burn; steps of 1 s through it and 10 s after. */
  const flyAhead: Ahead = (s, from, to, burn) => {
    let x = s;
    let at = from;
    while (at < to - 1e-9) {
      const firing = burn !== undefined && at < burn.until - 1e-9;
      const h = Math.min(firing ? 1 : 10, (firing ? burn.until : to) - at);
      const as = at;
      const thrust = firing ? { push: scale(burn.line, burn.accel) } : undefined;
      x = step(x, at, h, (q, when) => {
        const air = airOf(q, when);
        return shipPush(plan, as, air.wind, air.altitude, null, solarAt(frame, q.r, when, air.altitude), thrust);
      });
      at += h;
    }
    return x;
  };
  const phaseAt = (at: number, g: number, was: OrbitPhase): OrbitPhase =>
    at < on ? 'orbit' : at < off ? 'braking' : was === 'entry' || g >= ENTRY_G ? 'entry' : 'descent';

  let phase: OrbitPhase = 'orbit';
  const sample = (s = state, at = t, incoming = false): OrbitSample => {
    const rotation = contacts?.rotation?.(at, incoming);
    const air = airOf(s, at);
    const here = frame.place(s.r, at);
    return {
      t: at,
      phase,
      altitude: air.altitude,
      latitude: here.latitude,
      longitude: here.longitude,
      speed: length(s.v),
      groundSpeed: air.airspeed,
      g: length(push(s, at)) / G0,
      ...(rotation && { rotation }),
      q: air.q,
      mach: air.mach,
      sunlit: sunlit(s.r, sunAt(at)),
      r: s.r,
      v: s.v,
    };
  };

  /** The nodal period of the orbit a state is on (in the frame of date, whose +Z is the pole), by its mean elements. */
  const nodalOf = (s: State): number => {
    const m = meanOf({ r: frame.toDate(s.r), v: frame.toDate(s.v) });
    return periodsOf(m.a, m.e, m.i, m.argp).nodal;
  };
  const results: OrbitResults = {
    period: nodalOf(state),
    apogee: 0,
    shadowIn: Number.NaN,
    shadowOut: Number.NaN,
    retroLatitude: Number.NaN,
    retroLongitude: Number.NaN,
    retroOffRetrograde: Number.NaN,
    retroPerigee: Number.NaN,
    separationAltitude: Number.NaN,
    interfaceAt: Number.NaN,
    interfaceSpeed: Number.NaN,
    interfaceAngle: Number.NaN,
    entryAt: Number.NaN,
    entryG: 0,
    entryGAt: Number.NaN,
    entryQ: 0,
    ejectionAt: Number.NaN,
    ejectionLatitude: Number.NaN,
    ejectionLongitude: Number.NaN,
    ejectionSpeed: Number.NaN,
    alongTrack: Number.NaN,
    crossTrack: Number.NaN,
  };

  // (the orbit at the instants the checks ask for: read off a state stepped there from the step's start, so the run is flown
  // as it would be without them)
  const readings = readingsOf(plan).filter((x) => x.at >= t);
  const read = (s: State, ids: string[]): void => {
    const m = meanOf({ r: frame.toDate(s.r), v: frame.toDate(s.v) });
    const got: Record<OrbitReading, number> = {
      perigee: m.a * (1 - m.e) - radius,
      apogee: m.a * (1 + m.e) - radius,
      period: periodsOf(m.a, m.e, m.i, m.argp).nodal,
    };
    for (const id of ids) {
      const field = id.slice(id.lastIndexOf('.') + 1) as OrbitReading;
      if (field in got) results[id as `${string}.${OrbitReading}`] = got[field];
    }
  };

  /** A manoeuvre's end moved to where guidance put it: the steps end on it. */
  const endAt = (m: Move, at: number): void => {
    m.off = at;
    marks = [...marks, at].sort((p, q) => p - q);
  };
  /**
   * A manoeuvre lit: along the attitude the plan holds, for the record's time; or, made on the target with the target
   * there, as guidance solves it from the state now (sim/pursuit.ts), ending when it has given what was solved.
   */
  const light = (m: Move, i: number): void => {
    const planned = aimFor(
      m.aim,
      state.r,
      state.v,
      () => sunAt(t),
      () => frame.upOver(frame.place(state.r, t), t),
    );
    const size = Math.abs(m.accel);
    const sense = m.accel < 0 ? -1 : 1;
    const record = {
      lit: m.lit,
      cut: m.cut,
      on: t,
      off: m.off,
      velocity: size * (m.off - m.on),
      line: scale(planned, sense),
      solved: false,
    };
    lines[i] = planned;
    const toward = pursued?.at(t) ? m.toward : undefined;
    if (toward && 'station' in toward) {
      lines[i] = undefined;
      holding[i] = true;
      endAt(m, toward.until.value);
      burns.push({ lit: m.lit, cut: m.cut, on: t, off: m.off, velocity: 0, solved: true });
      return;
    }
    const solved = !toward
      ? null
      : 'reach' in toward
        ? reach(
            flyAhead,
            pursued!,
            state,
            t,
            size,
            { ahead: toward.reach.ahead.value, above: toward.reach.above.value },
            toward.at.value,
            scale(record.line, record.velocity),
          )
        : (() => {
            const dv = coelliptic(pursued!, state, t);
            return dv && { line: unit(dv), length: length(dv) / size };
          })();
    if (!solved) {
      burns.push(record);
      return;
    }
    lines[i] = scale(solved.line, sense);
    endAt(m, t + solved.length);
    burns.push({ ...record, off: m.off, velocity: size * solved.length, line: solved.line, solved: true });
  };
  /** The instants the checks ask how far the target is at: a step ends on each, and nothing else is done there. */
  const ranges = plan.checks.flatMap((c) => (c.of === 'orbit' && c.when && 'reading' in c.when && c.when.reading === 'range' ? [c] : []));
  /** What happens at the instant now reached. */
  const arrive = (): void => {
    moves.forEach((m, i) => {
      if (t === m.on) light(m, i);
    });
    for (const c of ranges) {
      const it = (c.when as { at: number }).at === t ? pursued?.at(t) : undefined;
      if (it) results[c.id as `${string}.range`] = length(sub(it.r, state.r));
    }
    if (t === on) {
      aim = aimAt(state, t);
      const here = frame.place(state.r, t);
      results.retroLatitude = here.latitude;
      results.retroLongitude = here.longitude;
      results.retroOffRetrograde = Math.acos(Math.max(-1, Math.min(1, -dot(aim, unit(state.v))))) / DEG;
    }
    if (t === off) {
      const el = elementsOf(state.r, state.v);
      results.retroPerigee = el.a * (1 - el.e) - radius;
    }
    if (t === parted) results.separationAltitude = airOf(state, t).altitude;
  };
  for (const [i, move] of moves.entries())
    if (move.on < t && move.toward && 'station' in move.toward && t < move.toward.until.value && pursued?.at(t)) {
      // (begun part-way through a braking held on the target: it is held on from here)
      holding[i] = true;
      move.off = move.toward.until.value;
    } else if (move.on < t && t < move.off)
      lines[i] = aimFor(
        move.aim,
        state.r,
        state.v,
        () => sunAt(t),
        () => frame.up(state.r, t),
      );
  if (on < t && t < off) aim = aimAt(state, t);
  /** The plumb line at a sample's place, in the inertial frame. */
  const upAt = (s: OrbitSample): Vec3 => frame.upOver(s, s.t);

  // (the coast hands over to the descent at the ejection height, or at the first event of the descent a hand gave: flyDown)
  const handover = Math.min(...Object.values(hands?.given ?? {}).filter((g) => g > t));
  let marks = [
    on,
    off,
    parted,
    stopAt,
    handover,
    ...moves.flatMap((m) => [m.on, m.off]),
    ...ship.banks.map((b) => b.at),
    ...fixes.map((f) => f.at.value),
    ...ranges.map((c) => (c.when as { at: number }).at),
  ]
    .filter(Number.isFinite)
    .sort((p, q) => p - q);
  arrive();
  const samples: OrbitSample[] = [sample()];
  let kept = t;
  let before = samples[0]!;
  /** Where it was over as it came through the interface: the landing's miss is measured along the line from there. */
  let gate: Vec3 | null = null;
  // (six hours past the last thing planned, or past now with nothing planned: a day in orbit is flown round to its burn; a
  // coast with no burn at all, an uncrewed target that stays up, three days: as far as the clock's coasting rates take it)
  const span = Number.isFinite(on) || moves.length ? 6 * 3600 : 3 * 86_400;
  const LIMIT = Math.min(stopAt, Math.max(t, ...marks.filter((m) => m < Number.MAX_SAFE_INTEGER)) + span);
  const target =
    ship.landing && geodeticToEcef({ latitude: ship.landing.latitude.value, longitude: ship.landing.longitude.value, height: 0 });

  const impulses: { at: number; dv: Vec3 }[] = [];
  const rememberImpulse = (at: number, dv: Vec3): void => {
    impulses.push({ at, dv });
  };
  while (t < LIMIT) {
    const mark = marks.find((m) => m > t + 1e-9);
    const burning = (t >= on && t < off) || moves.some((m) => t >= m.on && t < m.off);
    const most = before.altitude > THIN ? (burning ? 1 : 10) : before.altitude > THICK ? 1 : 0.05;
    const h = Math.min(most, mark === undefined ? most : mark - t, contacts?.limit(t) ?? Infinity);
    const last = state;
    const as = t;
    // (what a braking held on the target has given: the thrust commanded at each step's start, over the step)
    holding.forEach((is, i) => {
      if (!is || as < moves[i]!.on || as >= moves[i]!.off) return;
      const burn = burns.find((b) => b.lit === moves[i]!.lit && b.solved);
      if (burn) burn.velocity += length(held(state, as, as) ?? [0, 0, 0]) * h;
    });
    state = step(state, t, h, (s, at) => pushAs(s, at, as));
    t = mark !== undefined && Math.abs(t + h - mark) < 1e-9 ? mark : t + h;
    const free = state;
    if (contacts) state = contacts.advance(last, as, free, t, rememberImpulse);
    const touched = state !== free;
    if (touched) {
      // Keep both sides of the velocity jump. A cubic across it draws the cabin through the
      // other hull even when the step ended clear. The detached body keeps the same break.
      if (samples.at(-1)!.t < as) samples.push(before);
      impulses.sort((a, b) => a.at - b.at);
      let dr: Vec3 = [0, 0, 0];
      let dv: Vec3 = [0, 0, 0];
      let previous = as;
      for (const hit of impulses) {
        const at = Math.min(t, Math.max(as, hit.at));
        const incoming = at === as ? last : at === t ? free : step(last, as, at - as, (s, when) => pushAs(s, when, as));
        dr = add(dr, scale(dv, at - previous));
        const r = add(incoming.r, dr);
        if (samples.at(-1)!.t < at) samples.push(sample({ r, v: add(incoming.v, dv) }, at, true));
        dv = add(dv, hit.dv);
        samples.push(sample({ r, v: add(incoming.v, dv) }, at));
        previous = at;
      }
      impulses.length = 0;
    }
    while (readings.length && readings[0]!.at <= t) {
      const x = readings.shift()!;
      read(x.at === t ? state : step(last, as, x.at - as, (s, at) => pushAs(s, at, as)), x.ids);
    }
    arrive();
    let now = sample();
    phase = phaseAt(t, now.g, phase);
    now = { ...now, phase };

    if (t <= on) results.apogee = Math.max(results.apogee, length(state.r) - radius);
    // the shadow's edge, where half the Sun is hidden: placed along the step
    if (before.sunlit >= 0.5 !== now.sunlit >= 0.5) {
      const at = before.t + ((0.5 - before.sunlit) / (now.sunlit - before.sunlit)) * (now.t - before.t);
      if (now.sunlit < 0.5 && Number.isNaN(results.shadowIn)) results.shadowIn = at;
      else if (now.sunlit >= 0.5 && Number.isNaN(results.shadowOut)) results.shadowOut = at;
    }
    if (t > off) {
      if (Number.isNaN(results.interfaceAt) && before.altitude > interfaceHeight && now.altitude <= interfaceHeight) {
        const part = (before.altitude - interfaceHeight) / (before.altitude - now.altitude);
        const air = airOf(state, t);
        results.interfaceAt = before.t + part * (now.t - before.t);
        results.interfaceSpeed = air.airspeed;
        results.interfaceAngle = -Math.asin(dot(air.wind, upAt(now)) / air.airspeed) / DEG;
        gate = geodeticToEcef({ latitude: now.latitude, longitude: now.longitude, height: 0 });
      }
      if (Number.isNaN(results.entryAt) && now.g >= ENTRY_G) results.entryAt = t;
      if (now.g > results.entryG) {
        results.entryG = now.g;
        results.entryGAt = t;
      }
      results.entryQ = Math.max(results.entryQ, now.q);
    }
    // (down through the ejection height, burn or no burn: a coast begun short of an orbit comes down without one)
    if (t === handover) {
      phase = 'down';
      samples.push({ ...now, phase });
      break;
    }
    if (now.altitude <= floor && now.altitude < before.altitude) {
      // back along the last step to the instant it came through the height
      const part = (before.altitude - floor) / (before.altitude - now.altitude);
      state = { r: add(last.r, scale(sub(state.r, last.r), part)), v: add(last.v, scale(sub(state.v, last.v), part)) };
      t = before.t + part * (now.t - before.t);
      phase = 'down';
      const end = sample();
      results.ejectionAt = t;
      results.ejectionLatitude = end.latitude;
      results.ejectionLongitude = end.longitude;
      results.ejectionSpeed = -dot(airOf(state, t).wind, upAt(end));
      const under = geodeticToEcef({ latitude: end.latitude, longitude: end.longitude, height: 0 });
      if (gate && ship.landing && target) {
        const axes = enuAxes({ latitude: ship.landing.latitude.value, longitude: ship.landing.longitude.value });
        const level = (d: Vec3): Vec3 => sub(d, scale(axes.up, dot(d, axes.up)));
        const track = unit(level(sub(under, gate)));
        const miss = level(sub(under, target));
        results.alongTrack = dot(miss, track);
        results.crossTrack = dot(miss, cross(track, axes.up));
      }
      samples.push(end);
      break;
    }
    if (touched || t - kept >= every - 1e-9 || marks.includes(t)) {
      samples.push(now);
      kept = t;
    }
    before = now;
  }
  for (const b of burns) results[`${b.lit}.velocity`] = b.velocity;
  return { samples, results, ...(burns.length ? { burns } : {}) };
}

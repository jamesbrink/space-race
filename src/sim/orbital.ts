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
import { fromPublished, meanOf, meanOrbitOf, type PeriodKind, periodsOf, type PublishedOrbit } from '../world/meanelements.ts';
import { elementsOf, planeThrough, type State, step, sunlit } from '../world/orbit.ts';
import { airAt, airDrag } from './air.ts';
import { ratioOf } from '../world/thermosphere.ts';
import { atmosphere, meanFreePath } from './atmosphere.ts';
import { Descent, type DescentContext, type DescentSnapshot, type DownBody, downOf } from './descent.ts';
import {
  type Action,
  type AeroDef,
  type AttitudeDef,
  clockAt,
  type Craft,
  type EngineDef,
  type EventDef,
  eventOf,
  type FlightPlan,
  type Hold,
} from './plan.ts';
import { along } from './fly.ts';
import { ENTRY_G } from './loads.ts';

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
 */
export interface Guidance {
  /**
   * The aiming azimuth, degrees east of north: the launch plane is the one through the plumb line and this bearing at the pad
   * at liftoff, held by the gyros among the stars. Given, the plane is not solved for and the target's inclination is not
   * aimed at: the orbit's inclination is then a result, and a check.
   */
  azimuth?: Measure;
  vertical: Measure;
  kick: Measure;
  turn: Measure;
  target: {
    /** The event whose instant is the last cutoff: the record's id of it (a plan event's `record.id`, or a mark's). */
    at: string;
    altitude: Measure;
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
 * the distance between the first two, m.
 */
export function flyDown(
  plan: FlightPlan,
  frame: EarthFrame,
  seaLevel: number,
  from: { t: number; r: Vec3; v: Vec3 },
  hands?: DescentHands,
): DescentFlown {
  const d = downOf(plan);
  if (!d) throw new Error('this orbital plan has no descent');
  const spin = frame.spin;
  const ground = d.ground;
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
  const queue: { body: DownBody; t: number; s: State }[] = [{ body: first, t: from.t, s: { r: from.r, v: from.v } }];
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
  for (let n = 0; n < queue.length; n++) {
    const { body, t: t0, s: s0 } = queue[n]!;
    // (the entry body carries the pilot until he leaves, and the instrument module until the modules part)
    const desc = new Descent(ctx, body, n === 0, t0);
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
    after(() => desc.events(s, h, dot(airOf(s), s.r) < 0, true, t));
    const limit = t0 + 6 * 3600;
    let keptAt = t;
    while (h > ground && t < limit) {
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
      if (h <= ground) {
        const part = (was.h - ground) / (was.h - h);
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
  const down = landed[first.id]?.at ?? Number.POSITIVE_INFINITY;
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
   * orbit's heights are over (`meanOrbitOf`'s `radius`), m, and the nodal period with the perigee where it stands, s.
   */
  [reading: `${string}.${OrbitReading}`]: number;
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

export interface OrbitFlown {
  samples: OrbitSample[];
  results: OrbitResults;
}

/** Where the air is taken to begin for the choice of step, and where it is thick: m above the sea. */
const THIN = 150_000;
const THICK = 100_000;
/** The entry interface the results are quoted at, m above the sea: a convention, not a property of the air. */
const INTERFACE = 100_000;

/**
 * The orbit the record gives, as a position and velocity at `injection.at`, in the flight's frame (world/earthframe.ts):
 * the elements are of date and are worked in the frame of date, then turned into it. The plane is the one of the
 * published inclination through the launch site's place at liftoff; the place on it and the perigee are `injection`'s.
 */
export function injectionState(plan: FlightPlan, site: Geodetic, frame: EarthFrame): State {
  const o = shipOf(plan).orbit;
  const pad = frame.toDate(frame.toInertial(geodeticToEcef(site), 0));
  const i = o.inclination.value * DEG;
  const n = planeThrough(pad, i, o.injection.heading === 'north');
  if (!n) throw new Error(`no orbit inclined ${o.inclination.value} degrees passes over latitude ${site.latitude}`);
  const arc = o.injection.arc.value * DEG;
  const from = unit(pad);
  const at = add(scale(from, Math.cos(arc)), scale(cross(n, from), Math.sin(arc)));
  const node = Math.atan2(n[0], -n[1]);
  const toNode: Vec3 = [Math.cos(node), Math.sin(node), 0];
  const latitudeArgument = Math.atan2(dot(at, cross(n, toNode)), dot(at, toNode));
  const nu = o.injection.anomaly.value * DEG;
  // (the published orbit read as mean elements, its period nodal: world/meanelements.ts; the place on it is the mean orbit's)
  const s = fromPublished(publishedOf(o), { node, latitude: latitudeArgument, anomaly: nu }).state;
  return { r: frame.fromDate(s.r), v: frame.fromDate(s.v) };
}

/**
 * A record's published orbit as world/meanelements.ts reads it: its heights, inclination and period, the period of the
 * kind its `CONVENTION` takes (nodal, estimated; a record with none gives none, and the heights' mean over its ball is then
 * the axis), the ball the heights are over only where that is wanted. `kind`
 * 'osculating' reads it as every run here read it before: the heights over the record's ball as the osculating orbit.
 */
export function publishedOf(o: NonNullable<NonNullable<FlightPlan['record']>['orbit']>, kind?: PeriodKind): PublishedOrbit {
  return {
    perigee: o.perigee.value,
    apogee: o.apogee.value,
    inclination: o.inclination.value * DEG,
    ...(o.period ? { period: o.period.value } : {}),
    radius: o.radius.value,
    ...(kind ? { kind } : {}),
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
 * `sun`: the factor the day's Sun puts on the standard's density there (`solarAt`).
 */
export function shipPush(plan: FlightPlan, at: number, wind: Vec3, altitude: number, aim: Vec3 | null, sun = 1): Vec3 {
  const ship = shipOf(plan);
  const air = atmosphere(altitude);
  const airspeed = length(wind);
  const mach = airspeed / air.soundSpeed;
  const mass = at >= ship.parted ? ship.entry.mass : ship.mass;
  const area = ORBIT_DRAG.coast
    ? orbitDrag(ship, at < ship.parted, altitude, mach)
    : ship.entry.aero.area.value * along(ship.entry.aero.drag, mach);
  const drag = scale(airDrag(wind, airspeed, air.density * sun, area), 1 / mass);
  // (the braking engine is on the instrument module: parted, it pushes no more)
  return aim ? add(drag, scale(aim, ship.flown / (ship.off - ship.on))) : drag;
}

/**
 * The line the braking engine pushes along as it lights, from the spacecraft's place and velocity then (and the Sun's
 * place, asked for only when the aim is at the Sun), all in the flight's frame (world/earthframe.ts): flyOrbit's, and
 * the predicted path's.
 */
export function aimOf(plan: FlightPlan, r: Vec3, v: Vec3, sun: () => Vec3, up: () => Vec3 = () => unit(r)): Vec3 {
  const a = shipOf(plan).aim;
  const along = scale(unit(a.aim === 'fixed' && a.vector ? a.vector : a.aim === 'sun' ? sub(sun(), r) : v), a.sense);
  if (!a.below || a.aim !== 'velocity') return along;
  // (along or against the motion, laid level and then pitched down below the level by `below`: the plumb line where it is)
  const u = up();
  const level = unit(sub(along, scale(u, dot(along, u))));
  const b = a.below.value * DEG;
  return add(scale(level, Math.cos(b)), scale(u, -Math.sin(b)));
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
  const burn = c.engines.find((e) => e.flown)!;
  const joint = c.joints.find((j) => j.gone.includes(burn.body))!;
  const entry = c.bodies.find((b) => b.aero)!;
  let aim: AttitudeDef | undefined;
  for (const a of plan.attitude) if ('aim' in a.hold) aim = a;
  ship = {
    orbit,
    mass: orbit.mass.value,
    ...coast,
    flown: burn.flown!.value,
    aim: aim!.hold as Extract<Hold, { aim: unknown }>,
    aimId: aim!.id,
    entry: { id: entry.id, mass: joint.after!.value, aero: entry.aero! },
    ...(c.rarefied ? { rarefied: c.rarefied } : {}),
    landing: plan.record!.landing!,
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
  aim: Extract<Hold, { aim: unknown }>;
  /** The attitude that holds it, by id. */
  aimId: string;
  /** What comes down: its id, its mass once parted, kg, and its own air. */
  entry: { id: string; mass: number; aero: AeroDef };
  /** The joined ship in the free-molecule flow of its orbit (`Craft.rarefied`), where the plan gives it. */
  rarefied?: NonNullable<Craft['rarefied']>;
  landing: NonNullable<NonNullable<FlightPlan['record']>['landing']>;
}
const ships = new WeakMap<FlightPlan, Ship>();

/**
 * The coast's instants as the plan has them (sim/plan.ts, written from the record by vostok-plan.ts, or that plan as a hand changed
 * it): the burn the record's coast flies (the engine with the record's impulse, `EngineDef.flown`) lit and cut, the
 * body it is on let go, and the height at which what comes down is let loose after that (the event set off by height once
 * the parting has happened). Never: the largest safe integer, as a plan given up has it, or Infinity.
 */
export function coastOf(plan: FlightPlan): Coast {
  const timeOf = (e: EventDef | undefined): number => clockAt(plan, e);
  const { burn, on, off, parting } = coastEvents(plan);
  // (a solid nothing cuts burns until it is spent: so long after it is lit)
  const spent = !off && burn?.kind === 'solid' && burn.burn ? timeOf(on) + burn.burn.value : Number.POSITIVE_INFINITY;
  const down =
    parting && plan.events.find((e) => e.when.some((w) => 'after' in w && w.after === parting.id) && e.when.some((w) => 'height' in w));
  const height = down?.when.find((w) => 'height' in w);
  return {
    on: timeOf(on),
    off: off ? timeOf(off) : spent,
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
  const on = doing((a) => 'ignite' in a && a.ignite === burn.id);
  const off = doing((a) => 'cut' in a && a.cut === burn.id);
  const parting = joint && doing((a) => 'separate' in a && a.separate === joint.id);
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
 * engine is on the instrument module). No lift, no wind.
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
): OrbitFlown {
  const sunAt = (t: number): Vec3 => frame.fromDate(sunPosition(frame.jdTT(t)));
  const ship = shipOf(plan);
  const { on, off, parted, floor } = ship;
  const radius = ship.orbit.radius.value;

  // (from the published orbit, or from wherever the ascent flown left the spacecraft: sim/staged.ts)
  let t = from ? from.t : ship.orbit.injection.at.value;
  let state: State = from ? { r: from.r, v: from.v } : injectionState(plan, site, frame);
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
  const pushAs = (s: State, at: number, as: number): Vec3 => {
    const air = airOf(s, at);
    return shipPush(
      plan,
      as,
      air.wind,
      air.altitude,
      as >= on && as < off && as < parted ? aim : null,
      solarAt(frame, s.r, at, air.altitude),
    );
  };
  const push = (s: State, at: number): Vec3 => pushAs(s, at, at);
  const phaseAt = (at: number, g: number, was: OrbitPhase): OrbitPhase =>
    at < on ? 'orbit' : at < off ? 'braking' : was === 'entry' || g >= ENTRY_G ? 'entry' : 'descent';

  let phase: OrbitPhase = 'orbit';
  const sample = (): OrbitSample => {
    const air = airOf(state, t);
    const here = frame.place(state.r, t);
    return {
      t,
      phase,
      altitude: air.altitude,
      latitude: here.latitude,
      longitude: here.longitude,
      speed: length(state.v),
      groundSpeed: air.airspeed,
      g: length(push(state, t)) / G0,
      q: air.q,
      mach: air.mach,
      sunlit: sunlit(state.r, sunAt(t)),
      r: state.r,
      v: state.v,
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
  const ball = readings.length ? meanOrbitOf(publishedOf(ship.orbit)).radius : 0;
  const read = (s: State, ids: string[]): void => {
    const m = meanOf({ r: frame.toDate(s.r), v: frame.toDate(s.v) });
    const got: Record<OrbitReading, number> = {
      perigee: m.a * (1 - m.e) - ball,
      apogee: m.a * (1 + m.e) - ball,
      period: periodsOf(m.a, m.e, m.i, m.argp).nodal,
    };
    for (const id of ids) {
      const field = id.slice(id.lastIndexOf('.') + 1) as OrbitReading;
      if (field in got) results[id as `${string}.${OrbitReading}`] = got[field];
    }
  };

  /** What happens at the instant now reached. */
  const arrive = (): void => {
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
  /** The plumb line at a sample's place, in the inertial frame. */
  const upAt = (s: OrbitSample): Vec3 => frame.upOver(s, s.t);

  // (the coast hands over to the descent at the ejection height, or at the first event of the descent a hand gave: flyDown)
  const handover = Math.min(...Object.values(hands?.given ?? {}).filter((g) => g > t));
  const marks = [on, off, parted, handover].filter(Number.isFinite).sort((p, q) => p - q);
  const samples: OrbitSample[] = [sample()];
  let kept = t;
  let before = samples[0]!;
  /** Where it was over as it came through the interface: the landing's miss is measured along the line from there. */
  let gate: Vec3 | null = null;
  // (six hours past the last thing planned, or past now with nothing planned: a day in orbit is flown round to its burn)
  const LIMIT = Math.max(t, ...marks.filter((m) => m < Number.MAX_SAFE_INTEGER)) + 6 * 3600;
  const target = geodeticToEcef({ latitude: ship.landing.latitude.value, longitude: ship.landing.longitude.value, height: 0 });

  while (t < LIMIT) {
    const mark = marks.find((m) => m > t + 1e-9);
    const burning = t >= on && t < off;
    const most = before.altitude > THIN ? (burning ? 1 : 10) : before.altitude > THICK ? 1 : 0.05;
    const h = Math.min(most, mark === undefined ? most : mark - t);
    const last = state;
    const as = t;
    state = step(state, t, h, (s, at) => pushAs(s, at, as));
    t = mark !== undefined && Math.abs(t + h - mark) < 1e-9 ? mark : t + h;
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
      if (Number.isNaN(results.interfaceAt) && before.altitude > INTERFACE && now.altitude <= INTERFACE) {
        const part = (before.altitude - INTERFACE) / (before.altitude - now.altitude);
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
    {
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
        if (gate) {
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
    }
    if (t - kept >= every - 1e-9 || marks.includes(t)) {
      samples.push(now);
      kept = t;
    }
    before = now;
  }
  return { samples, results };
}

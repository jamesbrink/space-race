/**
 * A flight that goes into orbit, as the record has it and as far as the simulator can fly it.
 *
 * `Flight.orbital` (types.ts) is to an orbital flight what `Flight.trajectory` is to a ballistic
 * one: every number an input with its confidence and source, none fitted, and `checks` set before
 * anything was run. It is a different shape because the flight is: several stages burning
 * together and in turn, an orbit that is published as heights and a period, a braking burn aimed
 * by the Sun, an entry from orbital speed. `Trajectory` (one engine, one tilt programme, a capsule
 * with retrorockets and two parachutes) is left as it is.
 *
 * What is flown here is the coast (`flyOrbit`, below): from the orbit as published, or from the
 * state the ascent flown left it in, round to the braking burn, down through the air to the height
 * the pilot left at. The powered ascent is flown by sim/staged.ts from `stages` and `ascent`, on a
 * stated steering law where the programme flown has not been found.
 */
import type { Confidence, Curve, Measure, ShedBody } from '../types';
import { EARTH_ROTATION_RATE } from '../world/bodies.ts';
import { sunPosition } from '../world/ephemeris.ts';
import {
  add,
  cross,
  DEG,
  dot,
  ecefToInertial,
  enuAxes,
  type Geodetic,
  geodeticToEcef,
  length,
  scale,
  sub,
  unit,
  type Vec3,
} from '../world/frames.ts';
import { elementsOf, period, planeThrough, type State, stateOf, step, subpoint, sunlit } from '../world/orbit.ts';
import { greenwichSiderealTime, terrestrialTime } from '../world/time.ts';
import { atmosphere } from './atmosphere.ts';
import { along, G0 } from './fly.ts';

/** One stage, or one of several alike, as the record has it. Masses in kg, thrust in N, specific impulse in s, times in seconds from liftoff. */
export interface StageRecord {
  name: string;
  /** How many alike burn together. Each figure below is for one. */
  count: number;
  engine: string;
  /** The model's nodes that are this stage, one per unit (types.ts: Part.node). */
  nodes: string[];
  /** Fuelled, as it left the pad; empty; and what it burned. Where the sources' three do not sum, each is as published and `source` says so. */
  mass: Measure;
  dry: Measure;
  propellant: Measure;
  /** At sea level (left out for an engine lit above the air) and in vacuum. */
  thrust: { seaLevel?: Measure; vacuum: Measure };
  isp: { seaLevel?: Measure; vacuum: Measure };
  ignition: Measure;
  cutoff: Measure;
  /** When it left what flew on. Left out: it was never dropped. */
  separation?: Measure;
  /**
   * For the ascent flown (sim/staged.ts). The nozzles' exit area, m^2, for one: the thrust in air is the vacuum thrust less
   * this times the air's pressure. Left out, it is (vacuum less sea-level thrust) over one atmosphere, as `exitAreaOf` says.
   */
  exitArea?: Measure;
  /** What of `propellant` goes through the chambers (less the turbopump's peroxide and the tanks' pressurising gas), kg: the engine stops when it is gone. Left out: all of it. */
  usable?: Measure;
  /** The fraction of its rated thrust and flow it runs at, against seconds from liftoff: straight lines between. Left out: rated throughout. */
  throttle?: Curve;
}

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
  vertical: Measure;
  kick: Measure;
  turn: Measure;
  target: {
    /** The event whose instant is the last cutoff: an `EventRecord.id`. */
    at: string;
    altitude: Measure;
    climb: Measure;
    inclination: Measure;
  };
}

/** The ascent as the simulator flies it (sim/staged.ts): what it needs beyond the stages. */
export interface AscentRecord {
  guidance: Guidance;
  /** The stack's drag: from liftoff, each entry until its `until` (seconds from liftoff; the last holds to the end), its reference area, m^2, and its coefficient against Mach number. */
  drag: { until: Measure; area: Measure; curve: Curve }[];
  /** What leaves that is no stage (the fairing): when, and its mass, kg. */
  drops: { id: string; at: Measure; mass: Measure }[];
  /** The spacecraft's centre of mass above the flown model's origin (`Flight.flies.datum`), m: what the scene turns it about once alone. */
  centre?: Measure;
  /** What leaves, each flown on as a body of its own in the scene (sim/shed.ts), by the `Flight.flies.drops[].on` that lets it go. Each gives its own mass, centre and gyration. */
  sheds?: ShedBody[];
  /** The ascent's own checks: an event's id and a field of `EventState` ('boosters.altitude'), or a field of `AscentSummary`. Tolerances set before it was flown. */
  checks: AscentCheck[];
}

/** A figure the record gives for the ascent, to hold the flown one to. As `OrbitCheck`: SI, the tolerance set first. */
export interface AscentCheck {
  id: string;
  label: string;
  value: number;
  unit: string;
  tolerance: number;
  confidence: Confidence;
  source: string;
}

/** Something that happened at an instant, with how sure the instant is. `id` is for code to find it by; a flight's own words go in `label`. */
export interface EventRecord {
  id: string;
  label: string;
  /** Seconds from liftoff. */
  at: Measure;
  /** What other sources give for the same instant, where they disagree: said, not chosen between in silence. */
  also?: string;
}

/** Which way an engine pushed the vehicle: along (1) or against (-1) the line to the Sun, or its own motion in the frame that does not turn. */
export interface Aim {
  /** 'fixed': along `vector`, as a hand aimed it (the flight deck's manual descent, orbitdeck.ts). */
  along: 'sun' | 'velocity' | 'fixed';
  /** For 'fixed': the line pushed along, a unit vector in frames.ts's inertial frame of date. */
  vector?: Vec3;
  sense: 1 | -1;
  confidence: Confidence;
  source: string;
}

/** A result the record gives for the orbital part of a flight: `id` names a field of `OrbitResults`. As types.ts's FlightCheck: SI, and a tolerance set before the simulator was run. */
export interface OrbitCheck {
  id: keyof OrbitResults;
  label: string;
  value: number;
  unit: string;
  tolerance: number;
  confidence: Confidence;
  source: string;
}

export interface OrbitalFlight {
  /** The launch vehicle as flown, for the record and for the ascent when it is flown. */
  stages: StageRecord[];
  /** Everything that left the pad, kg. */
  liftoffMass: Measure;
  /** The flight's instants, in order. */
  events: EventRecord[];
  /** What flying the ascent needs beyond `stages` (sim/staged.ts). Left out: only the coast is flown, from the published orbit. */
  ascent?: AscentRecord;
  /**
   * The orbit as published: heights of perigee and apogee in metres above a ball of `radius`
   * (the convention is the publisher's and is recorded with it), inclination in degrees, period
   * in seconds. Taken as the osculating orbit at `injection.at`.
   */
  orbit: {
    radius: Measure;
    perigee: Measure;
    apogee: Measure;
    inclination: Measure;
    period: Measure;
  };
  /**
   * Where on that orbit the spacecraft was, and when. The orbit's plane is the one of the
   * published inclination through the launch site's place in the frame that does not turn at
   * liftoff, crossed going `heading`: derived, and it leaves out whatever the launch vehicle
   * steered out of plane.
   */
  injection: {
    /** Seconds from liftoff at which the orbit is taken to begin. */
    at: Measure;
    heading: 'north' | 'south';
    /** Degrees round the orbit's plane from the launch site's place at liftoff to the spacecraft at `at`. */
    arc: Measure;
    /** True anomaly at `at`, degrees: 0 is perigee. */
    anomaly: Measure;
  };
  /** The spacecraft in orbit, kg. */
  mass: Measure;
  /** The braking burn: thrust from `on` to `off` (seconds from liftoff), changing the speed by `deltaV` m/s in all, evenly, along `aim` held fixed in the frame that does not turn. */
  retro: {
    on: Measure;
    off: Measure;
    deltaV: Measure;
    aim: Aim;
  };
  /** What comes down: from `separation` (seconds from liftoff) a body of `mass` kg with drag coefficient `drag` against Mach number on `area` m^2, and no lift. */
  entry: {
    separation: Measure;
    mass: Measure;
    area: Measure;
    drag: Curve;
  };
  /** The height above the sea at which the pilot left, m: the coast is flown down to it. */
  ejection: { altitude: Measure };
  /** What comes down from there, each body on its own (`flyDown`). Left out: the flight ends at the ejection height. */
  descent?: DescentRecord;
  /**
   * What a pilot could do by hand, where the spacecraft allowed it (the flight deck, orbitdeck.ts): the code that frees the
   * hand controls, how fast the hand controller turns the spacecraft (deg/s), and the braking engine as a hand fires it:
   * its thrust (N) and the impulse its integrator shuts it down at (m/s), the modules parting `parting` seconds after.
   */
  manual?: { code: Measure; rate: Measure; thrust: Measure; deltaV: Measure; parting: Measure };
  /** Where and when the record has the landing: degrees north and east, seconds from liftoff. */
  landing: {
    latitude: Measure;
    longitude: Measure;
    at: Measure;
  };
  checks: OrbitCheck[];
}

/**
 * From the ejection height down: each body (the pilot on his seat, the empty descent module) a point that starts where
 * the coast ended, moving as it was, with its own mass and drag, and the parachutes it puts out in turn: each from a
 * height (falling through it) or a time after the ejection, adding its drag area over the time it takes to fill. A
 * parachute marked `replaces` takes the place of what was out before it (the pilot's canopy replaces the seat's drag
 * and its stabilising parachute: he has left the seat). Ground at `ground` m above the sea.
 */
export interface DescentRecord {
  ground: Measure;
  bodies: {
    id: string;
    label: string;
    mass: Measure;
    /** Drag coefficient times area of the body alone, m^2. */
    dragArea: Measure;
    chutes: {
      name: string;
      /** Let out falling through this height above the sea, m, or this long after the ejection, s. */
      altitude?: Measure;
      after?: Measure;
      dragArea: Measure;
      fills: Measure;
      /** What it leaves behind as it comes out: the body's own drag and every parachute before it (it is a new body: the man off his seat), with this mass now. */
      replaces?: { mass: Measure };
    }[];
  }[];
  /** Figures for the descent: `<body id>.at` (landing, s from liftoff), `<body id>.speed` (falling, m/s), `apart` (m between the landings). */
  checks: AscentCheck[];
}

/** Where and when each body of the descent came down. */
export interface Landed {
  at: number;
  speed: number;
  latitude: number;
  longitude: number;
}

/**
 * Fly the descent from the coast's end (`from`: its last sample's state and time). Point masses in the inertial frame of
 * date under J2 gravity and the standard air turning with the Earth (no wind: the day's at Saratov has not been read),
 * RK4 at 0.05 s. Returns each body's landing, by id, and `apart`, the distance between the first two, m.
 */
export function flyDown(
  o: OrbitalFlight,
  launchJd: number,
  seaLevel: number,
  from: { t: number; r: Vec3; v: Vec3 },
): { landed: Record<string, Landed>; apart: number; tracks: Record<string, { t: number; r: Vec3; v: Vec3 }[]> } {
  const d = o.descent;
  if (!d) throw new Error('this orbital record has no `descent`');
  const gast0 = greenwichSiderealTime(launchJd);
  const spin: Vec3 = [0, 0, EARTH_ROTATION_RATE];
  const ground = d.ground.value;
  const landed: Record<string, Landed> = {};
  const tracks: Record<string, { t: number; r: Vec3; v: Vec3 }[]> = {};
  for (const body of d.bodies) {
    const track: { t: number; r: Vec3; v: Vec3 }[] = (tracks[body.id] = [{ t: from.t, r: from.r, v: from.v }]);
    let t = from.t;
    let s: State = { r: from.r, v: from.v };
    let mass = body.mass.value;
    let base = body.dragArea.value; // what is out for good: the body's own, and every parachute filled
    let filling: { area: number; at: number; fills: number } | null = null;
    const out = new Set<number>();
    const heightOf = (q: State, at: number) => subpoint(q.r, gast0 + EARTH_ROTATION_RATE * at).height - seaLevel;
    const areaAt = (at: number) => base + (filling ? filling.area * Math.min(1, Math.max(0, (at - filling.at) / filling.fills)) : 0);
    const push = (q: State, at: number): Vec3 => {
      const air = atmosphere(heightOf(q, at));
      const wind = sub(q.v, cross(spin, q.r));
      const speed = length(wind);
      return speed > 0 ? scale(wind, (-0.5 * air.density * speed * areaAt(at)) / mass) : [0, 0, 0];
    };
    let h = heightOf(s, t);
    for (let k = 0; k < 400_000 && h > ground; k++) {
      const was = { s, t, h };
      s = step(s, t, 0.05, push);
      t += 0.05;
      h = heightOf(s, t);
      if (h <= ground) {
        const part = (was.h - ground) / (was.h - h);
        s = { r: add(was.s.r, scale(sub(s.r, was.s.r), part)), v: add(was.s.v, scale(sub(s.v, was.s.v), part)) };
        t = was.t + 0.05 * part;
        const here = subpoint(s.r, gast0 + EARTH_ROTATION_RATE * t);
        const up = ecefToInertial(enuAxes(here).up, gast0 + EARTH_ROTATION_RATE * t);
        landed[body.id] = { at: t, speed: -dot(sub(s.v, cross(spin, s.r)), up), latitude: here.latitude, longitude: here.longitude };
        track.push({ t, r: s.r, v: s.v });
        break;
      }
      if (k % 20 === 19) track.push({ t, r: s.r, v: s.v });
      body.chutes.forEach((c, i) => {
        if (out.has(i)) return;
        const due = c.altitude ? h <= c.altitude.value && h < was.h : c.after ? t - from.t >= c.after.value : false;
        if (!due) return;
        out.add(i);
        // what was filling is full now, or is left behind with the seat
        if (c.replaces) {
          base = 0;
          mass = c.replaces.mass.value;
        } else if (filling) base += filling.area;
        filling = { area: c.dragArea.value, at: t, fills: c.fills.value };
      });
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
  return { landed, apart, tracks };
}

/** What the record gives figures for, as the coast has them. */
export interface OrbitResults {
  /** Once round the published orbit by Kepler's law, s: the published heights against the published period. */
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
  /** Position and velocity in frames.ts's inertial frame of date, m and m/s. */
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
 * The orbit the record gives, as a position and velocity at `injection.at`, in the inertial frame
 * of date. The plane is the one of the published inclination through the launch site's place at
 * liftoff; the place on it and the perigee are `injection`'s.
 */
export function injectionState(o: OrbitalFlight, site: Geodetic, launchJd: number): State {
  const pad = ecefToInertial(geodeticToEcef(site), greenwichSiderealTime(launchJd));
  const i = o.orbit.inclination.value * DEG;
  const n = planeThrough(pad, i, o.injection.heading === 'north');
  if (!n) throw new Error(`no orbit inclined ${o.orbit.inclination.value} degrees passes over latitude ${site.latitude}`);
  const arc = o.injection.arc.value * DEG;
  const from = unit(pad);
  const at = add(scale(from, Math.cos(arc)), scale(cross(n, from), Math.sin(arc)));
  const node = Math.atan2(n[0], -n[1]);
  const toNode: Vec3 = [Math.cos(node), Math.sin(node), 0];
  const latitudeArgument = Math.atan2(dot(at, cross(n, toNode)), dot(at, toNode));
  const nu = o.injection.anomaly.value * DEG;
  const a = o.orbit.radius.value + (o.orbit.perigee.value + o.orbit.apogee.value) / 2;
  const e = (o.orbit.apogee.value - o.orbit.perigee.value) / (2 * a);
  return stateOf({ a, e, i, node, argp: latitudeArgument - nu, nu });
}

/**
 * Fly the coast: from the published orbit round to the braking burn, and down through the air to
 * the height the pilot left at. `site` is where it was launched from and `launchJd` when (a Julian
 * date in UT), which between them fix the orbit's plane, the Earth's turning under it and the Sun.
 * `seaLevel` is the sea's height above the ellipsoid, taken as the same everywhere. `every`: how
 * often a sample is kept, s.
 *
 * Forces: gravity with J2 (world/orbit.ts); the air of atmosphere.ts turning with the Earth, on
 * `entry`'s body throughout (before the modules part the whole ship is heavier and no rounder,
 * and is above the air that matters); the braking burn as an even acceleration. No lift, no wind.
 * Fixed steps of fourth-order Runge-Kutta: 10 s above 150 km, 1 s to 100 km and through the
 * burn, 0.05 s below, each cut to end on the next event, so one input gives one flight.
 */
export function flyOrbit(
  o: OrbitalFlight,
  site: Geodetic,
  launchJd: number,
  seaLevel = 0,
  every = 10,
  from?: { t: number; r: Vec3; v: Vec3 },
): OrbitFlown {
  const gast0 = greenwichSiderealTime(launchJd);
  const spin: Vec3 = [0, 0, EARTH_ROTATION_RATE];
  const gastAt = (t: number): number => gast0 + EARTH_ROTATION_RATE * t;
  const sunAt = (t: number): Vec3 => sunPosition(terrestrialTime(launchJd + t / 86_400));
  const [on, off, parted] = [o.retro.on.value, o.retro.off.value, o.entry.separation.value];
  const braking = o.retro.deltaV.value / (off - on);

  // (from the published orbit, or from wherever the ascent flown left the spacecraft: sim/staged.ts)
  let t = from ? from.t : o.injection.at.value;
  let state: State = from ? { r: from.r, v: from.v } : injectionState(o, site, launchJd);
  let aim: Vec3 = [0, 0, 0];
  /** The line the braking engine pushes along, fixed where it lay as the engine lit. */
  const aimAt = (s: State, at: number): Vec3 =>
    scale(
      unit(
        o.retro.aim.along === 'fixed' && o.retro.aim.vector ? o.retro.aim.vector : o.retro.aim.along === 'sun' ? sub(sunAt(at), s.r) : s.v,
      ),
      o.retro.aim.sense,
    );

  const airAt = (s: State, at: number) => {
    const altitude = subpoint(s.r, gastAt(at)).height - seaLevel;
    const air = atmosphere(altitude);
    const wind = sub(s.v, cross(spin, s.r));
    const airspeed = length(wind);
    const mach = airspeed / air.soundSpeed;
    const q = 0.5 * air.density * airspeed * airspeed;
    return { altitude, wind, airspeed, mach, q };
  };
  /** Everything but gravity, m/s^2. */
  const push = (s: State, at: number): Vec3 => {
    const air = airAt(s, at);
    const mass = at >= parted ? o.entry.mass.value : o.mass.value;
    const drag: Vec3 =
      air.airspeed > 0 ? scale(air.wind, (-air.q * o.entry.area.value * along(o.entry.drag, air.mach)) / (air.airspeed * mass)) : [0, 0, 0];
    return at >= on && at < off ? add(drag, scale(aim, braking)) : drag;
  };
  const phaseAt = (at: number, g: number, was: OrbitPhase): OrbitPhase =>
    at < on ? 'orbit' : at < off ? 'braking' : was === 'entry' || g >= 0.05 ? 'entry' : 'descent';

  let phase: OrbitPhase = 'orbit';
  const sample = (): OrbitSample => {
    const air = airAt(state, t);
    const here = subpoint(state.r, gastAt(t));
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

  const a0 = o.orbit.radius.value + (o.orbit.perigee.value + o.orbit.apogee.value) / 2;
  const results: OrbitResults = {
    period: period(from ? elementsOf(from.r, from.v).a : a0),
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

  /** What happens at the instant now reached. */
  const arrive = (): void => {
    if (t === on) {
      aim = aimAt(state, t);
      const here = subpoint(state.r, gastAt(t));
      results.retroLatitude = here.latitude;
      results.retroLongitude = here.longitude;
      results.retroOffRetrograde = Math.acos(Math.max(-1, Math.min(1, -dot(aim, unit(state.v))))) / DEG;
    }
    if (t === off) {
      const el = elementsOf(state.r, state.v);
      results.retroPerigee = el.a * (1 - el.e) - o.orbit.radius.value;
    }
    if (t === parted) results.separationAltitude = airAt(state, t).altitude;
  };
  /** The plumb line at a sample's place, in the inertial frame. */
  const upAt = (s: OrbitSample): Vec3 => ecefToInertial(enuAxes(s).up, gastAt(s.t));

  const marks = [on, off, parted].sort((p, q) => p - q);
  const samples: OrbitSample[] = [sample()];
  let kept = t;
  let before = samples[0]!;
  /** Where it was over as it came through the interface: the landing's miss is measured along the line from there. */
  let gate: Vec3 | null = null;
  const LIMIT = t + 6 * 3600;
  const target = geodeticToEcef({ latitude: o.landing.latitude.value, longitude: o.landing.longitude.value, height: 0 });

  while (t < LIMIT) {
    const mark = marks.find((m) => m > t + 1e-9);
    const burning = t >= on && t < off;
    const most = before.altitude > THIN ? (burning ? 1 : 10) : before.altitude > THICK ? 1 : 0.05;
    const h = Math.min(most, mark === undefined ? most : mark - t);
    const last = state;
    state = step(state, t, h, push);
    t = mark !== undefined && Math.abs(t + h - mark) < 1e-9 ? mark : t + h;
    arrive();
    let now = sample();
    phase = phaseAt(t, now.g, phase);
    now = { ...now, phase };

    if (t <= on) results.apogee = Math.max(results.apogee, length(state.r) - o.orbit.radius.value);
    // the shadow's edge, where half the Sun is hidden: placed along the step
    if (before.sunlit >= 0.5 !== now.sunlit >= 0.5) {
      const at = before.t + ((0.5 - before.sunlit) / (now.sunlit - before.sunlit)) * (now.t - before.t);
      if (now.sunlit < 0.5 && Number.isNaN(results.shadowIn)) results.shadowIn = at;
      else if (now.sunlit >= 0.5 && Number.isNaN(results.shadowOut)) results.shadowOut = at;
    }
    if (t > off) {
      if (Number.isNaN(results.interfaceAt) && before.altitude > INTERFACE && now.altitude <= INTERFACE) {
        const part = (before.altitude - INTERFACE) / (before.altitude - now.altitude);
        const air = airAt(state, t);
        results.interfaceAt = before.t + part * (now.t - before.t);
        results.interfaceSpeed = air.airspeed;
        results.interfaceAngle = -Math.asin(dot(air.wind, upAt(now)) / air.airspeed) / DEG;
        gate = geodeticToEcef({ latitude: now.latitude, longitude: now.longitude, height: 0 });
      }
      if (Number.isNaN(results.entryAt) && now.g >= 0.05) results.entryAt = t;
      if (now.g > results.entryG) {
        results.entryG = now.g;
        results.entryGAt = t;
      }
      results.entryQ = Math.max(results.entryQ, now.q);
      const floor = o.ejection.altitude.value;
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
        results.ejectionSpeed = -dot(airAt(state, t).wind, upAt(end));
        const under = geodeticToEcef({ latitude: end.latitude, longitude: end.longitude, height: 0 });
        if (gate) {
          const axes = enuAxes({ latitude: o.landing.latitude.value, longitude: o.landing.longitude.value });
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

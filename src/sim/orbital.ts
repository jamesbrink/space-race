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
 * What is flown from it today is the coast (`flyOrbit`, below): from the orbit as published,
 * round to the braking burn, down through the air to the height the pilot left at. The powered
 * ascent is recorded (`stages`, `events`) and not yet flown: it wants a pitch programme, drag and
 * a throttle history that have not been found (the flight's mission.md says what could stand in).
 */
import type { Confidence, Curve, Measure } from '../types';

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
  along: 'sun' | 'velocity';
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
  /** Where and when the record has the landing: degrees north and east, seconds from liftoff. */
  landing: {
    latitude: Measure;
    longitude: Measure;
    at: Measure;
  };
  checks: OrbitCheck[];
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

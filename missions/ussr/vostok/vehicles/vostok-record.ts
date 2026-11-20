/**
 * A Vostok flight's record, as its flight's orbital.ts gives it (on the 8K72K's and the 3KA's figures, vostok-8k72k.ts and
 * vostok-3ka.ts): the stages and events as the record has them, the orbit as published, the braking burn, the entry, the
 * descent and the checks, every number with its confidence and source. Only vostok-plan.ts writes a plan from it, and
 * vostok-flies.ts what the scene shows; nothing in src/ reads it.
 */
import type { Confidence, Curve, Heating, Measure, ShedBody } from '../../../../src/types.ts';
import type { Vec3 } from '../../../../src/world/frames.ts';
import type { DescentCrew, Guidance, OrbitResults } from '../../../../src/sim/orbital.ts';
import type { AbortMode, Craft, LandingAim, Lands, Nozzle } from '../../../../src/sim/plan.ts';

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
  /** Its nozzle's pressures, for its fire's shape (plan.ts `Nozzle`): handed on to the plan's engine. */
  nozzle?: Nozzle;
  /** What of `propellant` goes through the chambers (less the turbopump's peroxide and the tanks' pressurising gas), kg: the engine stops when it is gone. Left out: all of it. */
  usable?: Measure;
  /** The fraction of its rated thrust and flow it runs at, against seconds from liftoff: straight lines between. Left out: rated throughout. */
  throttle?: Curve;
  /**
   * Cut off as an integrator cut it: when the space-fixed speed reaches `speed` (what the design asked) plus `over` (the
   * error it had on the day), m/s. `apparent`: what the integrator counts is instead the apparent velocity, the sensed
   * acceleration (every force but gravity over the mass, along the axis) summed from this stage's ignition, which in
   * vacuum is the rocket equation's own: its effective exhaust speed times the log of the mass ratio. With it, `cutoff` is
   * the record's instant, held as a check and not flown to.
   */
  velocity?: { speed: Measure; over?: Measure; apparent?: boolean };
  /**
   * Cut off by the vehicle's control system when the orbit reached is the record's (sim/plan.ts: a trigger `{ orbit }`), on
   * the state as flown: for a last stage whose own setting has not been found. `cutoff` is then the record's instant of it,
   * a figure the run is held to and not flown to, and the stage lets the spacecraft go as long after it stops as the record
   * has between the two. How sure it is that it was cut so, and from what.
   */
  orbit?: { confidence: Confidence; source: string };
  /**
   * How its engines can be started (sim/stagedlive.ts): how many times, and whether only on the ground (igniters put up
   * the nozzles from the pad). Left out: once, anywhere. A hand that asks for more is told why not.
   */
  start?: { count: number; ground: boolean; confidence: Confidence; source: string };
  /**
   * Lit while the stage it stands on (the one before it in `stages`) is still joined, its jet strikes that stage's top
   * (sim/staging.ts `hotStage`): `open`, the share of the joint's side the turned jet escapes through (the rest stopped by
   * its structure); `turn`, the angle below the level at which what escapes leaves the deflector, degrees; `endures`, how
   * many seconds at full thrust the stage below's top stands it, after which its tank fails and the stack breaks up.
   */
  hot?: { open: Measure; turn: Measure; endures: Measure };
}

/** The ascent as the simulator flies it (sim/staged.ts): what it needs beyond the stages. */
export interface AscentRecord {
  guidance: Guidance;
  /** The stack's drag: from liftoff, each entry until its `until` (seconds from liftoff; the last holds to the end), its reference area, m^2, and its coefficient against Mach number. */
  drag: { until: Measure; area: Measure; curve: Curve }[];
  /**
   * What leaves that is no stage (the fairing): when, and its mass, kg. `q`: the most dynamic pressure it was made to be let
   * go in, Pa (sim/stagedlive.ts says when a hand lets it go in more, and what is not modelled of it); `covers`: the
   * spacecraft is inside it, and cannot leave while it is on.
   */
  drops: { id: string; at: Measure; mass: Measure; q?: Measure; covers?: boolean }[];
  /**
   * What the launch vehicle's structure stands going up (sim/loads.ts's rule, as a ballistic flight's `body.limits`): the
   * dynamic pressure times the angle off the wind, Pa rad, and the load along the axis, g. Past either it breaks up.
   */
  limits?: { qAlpha: Measure; axial: Measure };
  /**
   * What the spacecraft's escape did if the launch vehicle failed, by the time it failed: each mode until `until` seconds
   * from liftoff (its source there), in a few words, and what of it the deck flies (plan.ts `AbortMode`).
   */
  aborts?: AbortMode[];
  /**
   * What the live vehicle needs to be turned (sim/stagedlive.ts): the angular acceleration the stack's steering gives at
   * full throw while its engines burn, deg/s^2, about each axis alike. Without it the vehicle can be ridden but not steered.
   */
  steering?: { authority: Measure };
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
  /** For 'fixed': the line pushed along, a unit vector in the flight's frame (world/earthframe.ts `frameOf`). */
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
  /**
   * The orbit at a stated instant, s from liftoff, as a later published orbit gives it: `id` is then `<name>.perigee`,
   * `<name>.apogee` (m above the ball the published orbit's heights are over) or `<name>.period` (nodal, s), the coast's
   * state at that instant read as mean elements, as the published orbit is (orbital.ts `flyOrbit`). Left out: a result of the coast.
   */
  at?: number;
}

export interface VostokRecord {
  /** The stack as one craft of the plan: its id and words. Left out: the Vostok-K's, `vostok-8k72k`. */
  craft?: { id: string; label: string };
  /** The launch vehicle as flown, for the record and for the ascent when it is flown. */
  stages: StageRecord[];
  /** Everything that left the pad, kg. */
  liftoffMass: Measure;
  /** The flight's instants, in order. */
  events: EventRecord[];
  /** What flying the ascent needs beyond `stages` (sim/staged.ts). Left out: only the coast is flown, from the published orbit. */
  ascent?: AscentRecord;
  /**
   * The orbit as published: heights of perigee and apogee in metres, inclination in degrees, period in seconds, read as
   * mean elements (orbital.ts `publishedOf`), so a Vostok's record names no ball (orbital.ts `heightsBall`): with a period,
   * the ball the heights and period imply; with heights alone, the WGS 84 ellipsoid under the injection's apsis
   * (world/meanelements.ts `CONVENTION.radius`, assumed: what the sister flights' own heights and periods require). The period is left out where none is traceable: the axis is then the heights'
   * mean over that ball, and the period the coast reports is the derived nodal one of that mean orbit.
   */
  orbit: {
    perigee: Measure;
    apogee: Measure;
    inclination: Measure;
    period?: Measure;
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
  /**
   * How long the ship could stay up on what it carried, days, for a flight that does not come down (the card of the flight
   * deck, against `decay`); and the ball's drag coefficient in the free-molecule flow of the high air, where the orbit
   * decays (the entry's curve is for the air it enters, not for days at 180 km).
   */
  supplies?: { days: Measure; rarefied: Measure };
  /** The joined ship in the free-molecule flow of its orbit (plan.ts `Craft.rarefied`). Left out: the 3KA's (vostok-3ka.ts `SHIP_RAREFIED`). */
  rarefied?: NonNullable<Craft['rarefied']>;
  /**
   * The height above the sea at which the pilot left, m: the coast is flown down to it. `event`: what happened there, where
   * it was not an ejection (a ship whose crew landed in it begins its own sequence at that height, the parachute container's
   * cover shot off): its id and words, and what a hand asking for it is called on the deck. Left out: the seat's ejection.
   */
  ejection: { altitude: Measure; event?: { id: string; label: string; asked: string } };
  /** What comes down from there, each body on its own (`flyDown`). Left out: the flight ends at the ejection height. */
  descent?: DescentRecord;
  /**
   * The air's heat at the entry body's stagnation point, for the shock layer drawn (viewer/effects.ts): worked from each
   * sample's height and speed on `noseRadius` (sim/heating.ts). Surfaces only where their figures are known.
   */
  heating?: Heating;
  /**
   * What a pilot could do by hand, where the spacecraft allowed it (the flight deck, orbitdeck.ts): the code that frees the
   * hand controls (left out: they had no lock), how fast the hand controller turns the spacecraft (deg/s), and the braking engine as a hand fires it:
   * its thrust (N) and the impulse its integrator shuts it down at (m/s), the modules parting `parting` seconds after.
   */
  manual?: {
    code?: Measure;
    rate: Measure;
    thrust: Measure;
    deltaV: Measure;
    parting: Measure;
    /**
     * The record's own periods of orientation by hand, by plan (Vostok 2's two: the lock's code given to the pilot), each
     * from and to, seconds from liftoff, and what it was. As flown the deck gives the hands the attitude within them
     * (orbitdeck.ts `planHands`) and the record's drawing turns the ship to its orbital orientation (staged.ts `recordSamples`).
     */
    periods?: { from: Measure; to: Measure; what: string }[];
  };
  /** Where and when the record has the landing: degrees north and east, seconds from liftoff. */
  landing: {
    latitude: Measure;
    longitude: Measure;
    at: Measure;
    /** The place, as the flight's card names it ('Smelovka'). */
    near?: string;
    /** That the braking burn was timed for this place, where it was (sim/plan.ts `LandingAim`). */
    aimed?: LandingAim;
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
  /**
   * The first is the entry body itself (the descent module): it carries the pilot until the ejection, and the instrument
   * module until the modules part, and is flown from where the coast hands over. Each other body leaves it at the first of
   * its `with` events.
   */
  bodies: DescentBody[];
  /** What a canopy torn by the air keeps of its drag area (as `Limits.torn`, a ballistic flight's). */
  torn?: Measure;
  /** The pilot: where he rides, and what he is held to (the flight deck's verdict, orbitdeck.ts). Left out: no verdict. */
  crew?: DescentCrew;
  /** What the crew came down in and what on, as the decks' cards and the verdict say it (sim/plan.ts `Lands`). */
  lands: Lands;
  /** What did each event of the descent on the day, and what the pilot could do about it: said where a hand is offered one. */
  automatic?: string;
  /** Figures for the descent: `<body id>.at` (landing, s from liftoff), `<body id>.speed` (falling, m/s), `apart` (m between the first two bodies' landings). */
  checks: AscentCheck[];
}

/** One body of a descent (`DescentRecord.bodies`). */
export interface DescentBody {
  id: string;
  label: string;
  mass: Measure;
  /** Drag coefficient times area of the body alone, m^2. */
  dragArea: Measure;
  /**
   * How fast it is thrown clear as it leaves, m/s, added against its motion through the air (a hatch blown off, a seat on
   * its rockets: the rails' own line, which leans from that, is not known to a point mass).
   */
  thrown?: Measure;
  /** The events that set it loose from the first body, the first of them (`DescentHands.given`'s names). Left out: the ejection. */
  with?: string[];
  chutes: DescentChute[];
  /** The solid rockets it fires coming down (a soft-landing motor in the parachute's lines, set off by a probe at the ground). */
  motors?: DescentMotor[];
}

/**
 * A solid motor a descent body fires as it comes down through a height, once a parachute of its own is out: it pushes
 * against the body's motion through the air (sim/descent.ts `DownMotor`) at `thrust` for `burn`.
 */
export interface DescentMotor {
  /** The engine's id in the plan, and its words. */
  id: string;
  label: string;
  /** The parachute of the same body that must be out first (its `name`). */
  after: string;
  /** The height above the sea it is set off at, falling, m. */
  altitude: Measure;
  thrust: Measure;
  burn: Measure;
}

/** A parachute of a descent body. */
export interface DescentChute {
  name: string;
  /** Let out falling through this height above the sea, m, or this long after the ejection, s. */
  altitude?: Measure;
  after?: Measure;
  dragArea: Measure;
  fills: Measure;
  /** Parachutes of the same body this one takes the place of: each is let go (its drag with it) as this one comes out. */
  instead?: string[];
  /**
   * What it leaves behind as it comes out: the body's own drag and every parachute before it (it is a new body: the man off
   * his seat), with this mass now. What is left behind (`leaves`) comes down on its own from there: the mass the body had
   * less this one (derived), on its own drag area, which counts the parachutes it keeps.
   */
  replaces?: { mass: Measure; leaves?: { id: string; label: string; dragArea: Measure } };
  /**
   * The tear rule (as a ballistic flight's `Limits`): the most dynamic pressure its cloth takes, Pa, and the most its lines
   * pull, N (the pressure times the area it has filled to), whenever it is out. Past either it tears: `DescentRecord.torn`
   * of its drag area is left. Left out: it never tears.
   */
  strength?: Measure;
  pull?: Measure;
}

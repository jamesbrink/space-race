/**
 * What a flight is flown from, one shape for every kind of flight: the craft (its bodies, the joints between them, its
 * engines and the tanks they draw on, its thrusters, its parachutes, what it can stand), the events that change it
 * (each a set of triggers and the actions they set off), the attitudes it is held in, the gravity it flies through
 * and the record's figures it is held to. The machine that keeps a craft's state through its events is sim/craft.ts.
 *
 * It replaces two shapes that were each one kind of flight: one engine on a tilt programme with a capsule, its
 * retrorockets and two parachutes, and stages on a steering law with a braking burn and a descent of separate bodies.
 * A flight's launch vehicle's module writes its plan from the flight's own figures (missions/usa/mercury/vehicles/
 * mercury-redstone.ts `plan`, missions/ussr/vostok/vehicles/vostok-plan.ts), and tests/plan.test.mjs holds each plan to
 * what it was written from.
 *
 * Nothing in it is code: a new flight of a kind already flown (a Gemini on its Titan, with hot staging, translation
 * thrusters and a lifting entry) is a new plan, not a new branch in the simulator. Every figure is a `Measure` with
 * its confidence, as everywhere; ids are for code to find things by and a flight's own words go in `label`.
 */
import type { Confidence, Measure } from '../measure.ts';
import type { AbortRecord, AbortSequence, Aloft, Body, Burns, Curve, Heating, ShedBody, Thruster, Winds } from '../types.ts';
import type { Vec3 } from '../world/frames.ts';
import type { PeriodKind } from '../world/meanelements.ts';
import type { DescentCrew, Guidance } from './orbital.ts';

/** Which deck flies it and how the record's run is made: up and down again, or up into orbit and down from it. */
export type PlanKind = 'ballistic' | 'orbital';

export interface FlightPlan {
  kind: PlanKind;
  /** What leaves the pad is the first; any other is one it meets in flight. */
  craft: Craft[];
  /** Everything that changes a craft, in the record's order. */
  events: EventDef[];
  /** The ways it can be held, which events switch between (`{ attitude }`). The first is held from liftoff. */
  attitude: AttitudeDef[];
  /** What pulls on it (sim/core/gravity.ts). Left out: the Earth with its oblateness, the default there. */
  gravity?: GravityDef;
  /** The day's winds aloft over the pad (sim/air.ts `blowOf`). Left out: the air turns with the Earth and no more. */
  winds?: Winds;
  /**
   * The day's column of air over the pad (types.ts `DayWeather.aloft`: a sounding's, or ERA5's at the hour nearest
   * liftoff), which the simulator flies through where it reaches (sim/air.ts `skyOf`). Left out: the 1976 standard.
   */
  aloft?: Aloft;
  /** The craft its manoeuvres in orbit are made on, where it has one (sim/pursuit.ts). */
  target?: TargetDef;
  /** The record's figures, to hold a run to: set before anything was flown. */
  checks: PlanCheck[];
  /** What the record has that is not flown from but held to or shown: the published orbit, where it came down. */
  record?: PlanRecord;
  /**
   * The flight as it was to be flown, where the record's went otherwise (an engine that failed, control lost: a steering
   * law's `lost`): the ascent's law is solved on it (sim/staged.ts `steer`), as the vehicle's guidance was set for it, and
   * this plan is flown on that solution.
   */
  planned?: FlightPlan;
}

/** A craft: bodies held together by joints, and what is fixed to them. */
export interface Craft {
  id: string;
  label: string;
  /** Everything that leaves the pad, kg: the record's figure, which its bodies' masses need not sum to where the sources do not. */
  mass: Measure;
  /** Base first: the first is what stands on the pad, the last what carries the crew. */
  bodies: BodyDef[];
  joints: JointDef[];
  engines: EngineDef[];
  tanks: TankDef[];
  thrusters: ThrusterSet[];
  chutes: ChuteDef[];
  limits: LimitDef[];
  /** The stack's drag going up: from liftoff, each entry until its `until` (the last holds to the end), on its reference area. */
  drag: DragDef[];
  /** The craft as a rigid body that turns, where the live simulator needs one (types/sim.ts `Body`). */
  rigid?: Body;
  /** What the air's heat does to it (sim/heating.ts). */
  heating?: Heating;
  /**
   * The craft joined as it flies in orbit, in the free-molecule flow of the air there: its drag coefficient on `area`, its
   * projected area held along the motion or turning as the record has it, and the length its Knudsen number is taken
   * on (sim/orbital.ts `orbitDrag`). Left out, the coast flies the body that comes down's continuum figure.
   */
  rarefied?: { drag: Measure; area: Measure; length: Measure };
  /** The crew in it: where they ride and what they are held to. */
  crew?: DescentCrew;
  /**
   * What the crew came down in and what on, as the decks' cards and the verdict say it (sim/verdict.ts `landsOf`). Left
   * out, they say neither: 'the spacecraft', and the surface.
   */
  lands?: Lands;
  /** What leaves, each flown on as a body of its own in the scene (sim/shed.ts), by the `Flight.flies.drops[].on` that lets it go. */
  sheds?: ShedBody[];
  /** What its stages let out after their engines have stopped (`VentDef`). */
  vents?: VentDef[];
}

/**
 * What a stage lets out once its engine has stopped, while it is still joined to what flies on: boil-off through its
 * vents, propellant dumped through its engine. A force along the stack's long axis toward the nose, N against seconds
 * from liftoff (nothing outside the curve), flown by every run of the ascent alike (staged.ts `stackOf`: the batch run,
 * the live vehicle, the path under guidance) along the attitude then held. What it lets out is not taken off the mass.
 */
export interface VentDef {
  id: string;
  label: string;
  /** The stage it is on, by its body's id. */
  body: string;
  thrust: Curve;
}

/** What a flight's crew came down in, and on what, in the words of the flight's own data (`Craft.lands`). */
export interface Lands {
  /** What the record's landing was on: the land, or the sea. */
  on: 'land' | 'sea';
  /** What came down with the crew in it, as a sentence names it: 'the descent module', 'the capsule', 'the spacecraft'. */
  ship: string;
  /**
   * What the card's heading goes on to say when it went down after it was afloat (sim/afloat.ts: the run afloat's top
   * went under), in the flight's own words, after a semicolon: Liberty Bell 7's 'it sank, its hatch blown'. Left out, it
   * says nothing more.
   */
  sank?: string;
}

/** One piece of a craft that can part from the rest: a stage, a tower, a fairing, a retropack, a descent module, a seat. */
export interface BodyDef {
  id: string;
  label: string;
  /** How many alike (a stage's strap-ons): each figure below is one unit's, and the body's is `count` times it (so a dropped stage's mass is `count * (mass - burned)`, exactly as it is flown). */
  count: number;
  /** Its mass as it leaves the pad, kg, with what is in its tanks; its mass empty, where the record gives one. */
  mass: Measure;
  dry?: Measure;
  /** The model's nodes that are this body, one per unit (types.ts: Part.node). */
  nodes?: string[];
  /** How it meets the air on its own, once parted (an entry, a descent): drag and, for a lifting body, lift. */
  aero?: AeroDef;
  /** How fast it is thrown clear as it leaves, m/s, against its motion through the air (a hatch blown, a seat on its rockets). */
  thrown?: Measure;
}

/** How a body meets the air: coefficients against Mach number on a reference area; lift as a ratio to drag at its trim. */
export interface AeroDef {
  /** This body passively rights its offset mass in the airflow after parting. */
  passiveSphere?: boolean;
  area: Measure;
  drag: Curve;
  /**
   * Lift over drag against Mach number, at `trim`: a capsule flown with its centre of mass off its axis (a lifting entry).
   * Flown on the body alone, in the coast's entry, while a bank is held (`Hold.bank`); left out, it makes none.
   */
  lift?: Curve;
  /** The angle of attack it trims at, degrees: how it is drawn, its long axis that far off its motion toward its lift. */
  trim?: Measure;
  /** Its drag coefficient times area, m^2, where a single figure is all the record gives (a pilot on his seat). */
  dragArea?: Measure;
  /** Its drag coefficient in the free-molecule flow of the high air, where an orbit decays. */
  rarefied?: Measure;
}

/** What holds two bodies together, and what parts when it is let go. */
export interface JointDef {
  id: string;
  label: string;
  /** The bodies that leave when it is let go (with what else is on them); the rest fly on. */
  gone: string[];
  /**
   * How fast the two sides are pushed apart, m/s. Of the spacecraft's own last joint the two share it by their masses (sim/
   * staged.ts `partedOff`); of a joint below it, which lets a stage go from the stack, it is the stage's speed away from what
   * flies on, given wholly to what leaves (sim/run.ts `orbitalRelease`), as its retrorockets gave it: the stack gains
   * nothing from it (`ahead` is what it gains).
   */
  push?: Measure;
  /**
   * What the stack that flies on gains as a joint below the spacecraft parts, m/s along its axis, where the record has motors
   * of its own firing then (an upper stage's ullage motors): their impulse over the stack's mass, given at the parting (the
   * motors' few seconds taken as one instant). Nothing where the record has none.
   */
  ahead?: Measure;
  /** Bodies it holds in (a fairing over the spacecraft), and the joints it keeps from parting while it is on: theirs cannot leave until it has gone. */
  covers?: string[];
  holds?: string[];
  /** The most dynamic pressure it was made to part in, Pa. */
  q?: Measure;
  /**
   * An engine above lit while this joint holds fires into what is below (sim/staging.ts `hotStage`): `open`, the share
   * of the joint's side its jet escapes through; `turn`, the angle below the level it leaves at, degrees; `endures`, how
   * many seconds at full thrust what is below stands it.
   */
  hot?: { engine: string; open: Measure; turn: Measure; endures: Measure };
  /**
   * The engines above this joint, while it holds, that would fire into a closed interstage: one with no open side to let
   * the jet out, as the hot-staged joints have (`hot`). Lit by a hand before the joint has gone, the jet is shut in against
   * what is below and the stack breaks up (sim/staging.ts `CLOSED_ENDURES`, sim/stagedlive.ts).
   */
  closed?: { engines: string[] };
  /** The record's instant it parted, s from liftoff: what the drag's pieces and the checks are keyed on. */
  at?: Measure;
  /** What the record has flying on once it has parted, kg, and what left, kg: the run takes these, not its bodies' sum. */
  after?: Measure;
  leaves?: Measure;
  /**
   * The record's Earth-fixed heading of the motion as it parted, degrees true, where the record gives one. Nothing is
   * flown from it: tests/sim.test.mjs and tools/figures.mjs start the spacecraft's half from the record's state then.
   */
  heading?: Measure;
}

/** An engine: how many chambers alike, what each gives, what it draws on and how it can be worked. */
export interface EngineDef {
  id: string;
  label: string;
  /** The body it is on: it goes with it. */
  body: string;
  /** Chambers alike: each figure below is for one. */
  count: number;
  /** The tanks it draws on: it stops when any of them is empty. */
  tanks: string[];
  /** N and s, at sea level (left out for one lit above the air) and in vacuum. */
  thrust: { seaLevel?: Measure; vacuum: Measure };
  /** Left out for a motor whose propellant is not drawn from a tank (a retrorocket: its body's mass at its drop says it). */
  isp?: { seaLevel?: Measure; vacuum: Measure };
  /** Nozzle exit area, m^2, for one: the thrust in air is the vacuum thrust less this times the air's pressure. */
  exitArea?: Measure;
  /** A solid cannot be throttled or shut down: lit, it burns until it is spent. */
  kind: 'liquid' | 'solid';
  /** For a solid, or a liquid given only its time: how long it burns, s, and its whole impulse where the thrust tails off, N s. */
  burn?: Measure;
  impulse?: Measure;
  /** A curve of its thrust against seconds from firing, N, where one has been read: what it burns by. */
  curve?: Curve;
  /**
   * The least and the most it can be throttled to, as fractions of rated thrust; and the record's setting against seconds
   * from liftoff. `flow`: the share of its rated propellant flow it draws against seconds from liftoff, where the record has
   * that apart from its thrust's (a J-2 shifted to a lower mixture ratio gives more impulse for each kilogram, so its flow
   * falls by more than its thrust): without it the flow follows the thrust's setting (`curve`), the impulse unchanged.
   */
  throttle?: { range?: [least: number, most: number]; curve?: Curve; flow?: Curve };
  /**
   * Its cutoff impulse, N s, one unit's, where the record gives one: what it still gives once it has been cut, from the
   * cutoff signal to no thrust (or to its stage's parting, where that is all the record gives). Its thrust falls evenly
   * from what it was at the cut to nothing, taking twice the impulse over that thrust (the straight fall is an estimate);
   * it pushes while its body is on and draws nothing from the tank, what a decay burns being of the stage's residual, which
   * leaves with it. A stage cut by its guidance on the state it reached has none here: the guidance timed its cut with its
   * decay in it (sim/staged.ts `decayOf`).
   */
  decay?: Measure;
  /** How far its thrust can be turned off the axis, degrees, and where the turned thrust acts, m from the base. */
  gimbal?: { deflection: Measure; station?: Measure };
  /**
   * How many times it can be started, and whether only on the ground (igniters put up the nozzles from the pad). With no
   * source nothing read says: it is then taken to start once, anywhere, and that is an estimate.
   */
  starts: { count: number; ground: boolean; confidence: Confidence; source?: string };
  /** Its nozzle's pressures, for the shape its fire takes in the air (viewer/plume.ts). Nothing in the simulator reads it. */
  nozzle?: Nozzle;
  /** What it burns, for its fire's look (viewer/flames.ts). */
  burns?: Burns;
  /**
   * A failure the record has: lit, it shuts down so long after, s, whoever lit it and whatever is asked (a hard start). The
   * record's run flies the record's own cut; a live vehicle cuts it this long after its own lighting (sim/stagedlive.ts).
   */
  fails?: { after: Measure };
  /**
   * The engine whose chambers these are, lit again (an S-IVB's J-2 restarted for the translunar injection: a stage of its own
   * on the tank it shares, so what it burns is worked from its own lighting): the two are one engine, and neither can be lit
   * while the other burns (sim/craft.ts `act`).
   */
  again?: string;
  /** The impulse its integrator shuts it down at, m/s, where the record gives one (a braking engine). */
  deltaV?: Measure;
  /** The impulse the record says it gave, m/s: what the record's run applies evenly between its lighting and its cut. */
  flown?: Measure;
  /** How long it can burn before a propellant runs out, s, where that is all the record gives of its tanks. */
  depletion?: Measure;
  /**
   * It pushes toward the tail (-X), not the nose: a forward-firing thruster. The attitude held says where the nose points
   * (a manoeuvre's aim, orbital.ts `movesOf`), and its push is the other way along that line.
   */
  astern?: true;
}

/**
 * An engine's nozzle as its fire needs it (viewer/plume.ts): the pressure in its chambers, Pa; how far its nozzle
 * expands the gas, exit area over throat; and the pressure the gas leaves at, Pa, which is what the free jet comes down
 * from to the air's (an exit below the air's is a narrow column, one above it a balloon). Each a Measure: where the
 * figures are not documented they are estimated here, in the data, and say how they were reached.
 */
export interface Nozzle {
  chamber?: Measure;
  expansion?: Measure;
  exit: Measure;
}

/** What an engine or a thruster set draws on. */
export interface TankDef {
  id: string;
  label: string;
  body: string;
  /** What it holds as it leaves the pad, kg; what of that goes through the chambers, where it is less: one unit's, on a body of several (`BodyDef.count`). */
  load: Measure;
  usable?: Measure;
  /** One of an engine's two propellants, or both as one load; or attitude control's. */
  holds: 'propellant' | 'oxidizer' | 'fuel' | 'control';
  /** For a control supply: its specific impulse, s. */
  isp?: Measure;
}

/** A set of thrusters worked together: they turn the craft, push it along, or both. */
export interface ThrusterSet {
  id: string;
  label: string;
  body: string;
  /** What they are for: rotation (attitude), translation (manoeuvre: Gemini's OAMS), or both. */
  does: ('rotation' | 'translation')[];
  /** The supply that feeds them, and who works them. */
  tank?: string;
  mode: 'automatic' | 'manual';
  /** Every chamber, where they are known as hardware. */
  chambers?: Thruster[];
  /** Otherwise the torque they give about each axis at full command, N m, or the angular acceleration, deg/s^2, alike about each. */
  torque?: { roll: Measure; pitch: Measure; yaw: Measure };
  authority?: Measure;
  /** For translation without chambers: the thrust along each of the body's axes, N. */
  push?: Measure;
  /** How fast a hand turns the craft with them, deg/s, where it is a rate the controller asks for. */
  rate?: Measure;
  /**
   * They turn a launch vehicle with no engine of its stages burning, while their body is on (an upper stage's own attitude
   * jets: the S-IVB's auxiliary propulsion modules, which held it in its parking orbit), at their `authority`; the steering
   * set without this flag turns it only while an engine burns (sim/stagedlive.ts, what the steering gives now).
   */
  coasting?: true;
}

/** A parachute: on a body, drag area added over the time it takes to fill. */
export interface ChuteDef {
  id: string;
  label: string;
  body: string;
  dragArea: Measure;
  fills: Measure;
  /** Parachutes on the same body it takes the place of: each is let go as this comes out. */
  instead?: string[];
  /**
   * It is a new body as it comes out (the man off his seat): the body's own drag and every parachute before it go, its
   * mass is now this, and what is left behind comes down on its own drag area.
   */
  replaces?: { mass: Measure; leaves?: { id: string; label: string; dragArea: Measure } };
  /** The most dynamic pressure its cloth takes, Pa, and the most its lines pull, N. Left out: it never tears. */
  strength?: Measure;
  pull?: Measure;
  /**
   * A fault of the hardware's, flown on an orbital flight's descent (descent.ts): commanded out, it stays in its container
   * (`stays`: no drag, nothing let go for it, never out for what waits on it); or let out while one of the parachutes `by`
   * (ids, on its body) is still out, it is caught in that one's shadow and streams unfilled, as a torn canopy (`fouls`).
   */
  stays?: { confidence: Confidence; source: string };
  fouls?: { by: string[]; confidence: Confidence; source: string };
}

/** A limit the craft is held to: past it, something gives. */
export interface LimitDef {
  of: 'qAlpha' | 'axial' | 'chute-q' | 'chute-pull' | 'landing-speed' | 'load' | 'blast' | 'fastest';
  value: Measure;
  /** For a structure: the joint it breaks at. For a parachute: which. For a crew limit: aboard, or alone. */
  at?: string;
}

/** A piece of the stack's drag going up. */
export interface DragDef {
  until: Measure;
  area: Measure;
  curve: Curve;
}

/**
 * Something that happens: when every one of its triggers holds, its actions are set off together, once. `automatic`
 * says whether the craft's own sequence does it (the record's pilot gives it either way; a hand that has taken over
 * gives the automatic ones only while the sequence is on).
 */
export interface EventDef {
  id: string;
  label: string;
  when: Trigger[];
  do: Action[];
  automatic: boolean;
  /** The record's instant, s from liftoff, where it has one: for the record's run and the checks. */
  at?: Measure;
  /** What other sources give for the same instant, where they disagree. */
  also?: string;
  /** The record's own event this is, by its id and in its words, where the record names one. */
  record?: { id: string; label: string };
  /** What a hand asking for it is called on the flight deck ('Jettison the retropack'), where that is not the deck's own word for what it does. */
  asked?: string;
  source: string;
  /** Not set off until another event arms it (`{ arm }`): a timer that is started. */
  armed?: false;
}

/** When an event happens. */
export type Trigger =
  /** At an instant, s from liftoff. */
  | { time: number }
  /** So long after another event, s. */
  | { after: string; wait?: number }
  /** Passing a height above the sea, m, going up or down. */
  | { height: number; going: 'up' | 'down' }
  /** A speed reached, m/s: in the frame that does not turn, or the apparent velocity an engine's integrator has summed since it lit. */
  | { speed: number; apparent?: string }
  /**
   * The record's orbit reached: the guidance's own cutoff, on the state as flown. It holds once the orbit the state is on
   * has the published period (world/meanelements.ts `shortOfPublished`: the published figures read as the coast reads
   * them), so the engine is cut on what the flight has done and not at an instant. The record's instant of it is then a
   * figure to hold the run to (`at`), not a command.
   */
  | { orbit: 'published' }
  /** A load reached, g, rising or falling through it. */
  | { g: number; going: 'up' | 'down' }
  /** A hand's command, by name. */
  | { command: string }
  /** Past the top of its climb, falling. */
  | { falling: true };

/** What an event does. */
export type Action =
  /**
   * `flown`: the impulse the record says this lighting gave, m/s, where an engine is lit more than once in the coast and the
   * record gives each burn its own (a manoeuvre's, read off the spacecraft's velocity indicator): the record's run flies it
   * evenly between this lighting and the engine's next cut, along the attitude then held (orbital.ts `movesOf`). Without
   * it a manoeuvre is flown at its engine's thrust over the ship's mass.
   * `toward`: what the burn was for, where it was made on another craft (`FlightPlan.target`): guidance then solves it on
   * the state the run is in as it lights, and the record's impulse and attitude are what the solved burn is held against
   * (sim/pursuit.ts).
   */
  | { ignite: string; flown?: Measure; firingTime?: Measure; massAtIgnition?: Measure; toward?: Pursuit }
  | { cut: string }
  | { throttle: string; to: number }
  | { separate: string }
  | { deploy: string }
  | { release: string }
  | { attitude: string }
  | { arm: string };

/**
 * What a burn made on another craft is for (`Action.ignite.toward`): the command guidance carries out on the live state
 * of both (sim/pursuit.ts), as the ground or the crew worked it from where the two then were. Where the target is from
 * the craft is given the same way throughout: `ahead`, m along the craft's orbit (the arc between the two, on the
 * target's radius), and `above`, the target's distance from the Earth's centre less the craft's.
 */
export type Pursuit =
  /** Aimed so that the target is at this place from the craft at the instant `at`, s from liftoff, and in its plane. */
  | { reach: { ahead: Measure; above: Measure }; at: Measure }
  /** Leaves the craft on an orbit of the target's shape, the height between them the same all the way round. */
  | { coelliptic: true }
  /**
   * Braked to rest with the target at this place from it by the firing's recorded end, and held there until `until`,
   * s from liftoff: thrust commanded all the while from the range and its rate, within what the engine can give. The
   * crew's own pulses are not on any record read.
   */
  | { station: { ahead: Measure; above: Measure }; until: Measure };

/**
 * Another craft a flight's manoeuvres are made on: a craft of its own, integrated from where it began on the forces it
 * has (gravity and the air on `dragArea`, its drag coefficient times its area, m^2, at `mass`, kg), which nothing the
 * spacecraft does changes. `joint`: it is what that joint of the first craft lets go, flown on from the parting.
 */
export interface TargetDef {
  joint: string;
  label: string;
  mass: Measure;
  dragArea: Measure;
}

/** A way of holding the craft's attitude. */
export interface AttitudeDef {
  id: string;
  label: string;
  hold: Hold;
  source: string;
}

export type Hold =
  /** Tilted from the launch vertical toward an azimuth by a stored programme, degrees against seconds, in inertial space. */
  | { programme: Curve; azimuth: Measure }
  /** A stated steering law, solved for its targets (sim/staged.ts `steer`). */
  | { law: Guidance }
  /**
   * Along or against the line to the Sun, the motion, the orbit's normal (r x v: toward the orbit's pole, so a push along it
   * turns the plane), or a fixed line in the flight's frame. Along the motion, `below` pitches it down from the level (the
   * plumb line's) by so many degrees, in the plane of the motion: a Mercury capsule's retrofire attitude, its blunt end up
   * 34 degrees, so the push is back along the motion and down. `yaw` turns the line in
   * the level about the plumb line before it is pitched, by so many degrees toward the left of the motion (negative, the
   * right): a retrofire flown off its attitude (Aurora 7's).
   */
  | { aim: 'sun' | 'velocity' | 'normal' | 'fixed'; sense: 1 | -1; vector?: Vec3; below?: Measure; yaw?: Measure; confidence: Confidence }
  /** Against the motion over the ground, pitched below the horizontal, degrees (retrorockets). */
  | { retro: Measure }
  /** Blunt end first, its roll kept so a side faces the Earth (degrees about the long axis from the body's +Z). */
  | { blunt: true; earthward?: Measure }
  /**
   * A lifting body's lift turned about its motion through the air by a bank angle, degrees: lift up at 0, to the right of the
   * motion at 90 (orbital.ts `liftOf`). Its lift is flown only while a bank is held: trimmed and its roll kept.
   */
  | { bank: Measure }
  /** Left to itself. */
  | { free: true };

/** The bodies that pull on it, by sim/core/gravity.ts's terms. */
export interface GravityDef {
  central: 'earth' | 'moon';
  terms: ('j2' | 'moon' | 'sun')[];
}

/**
 * A figure the record gives, and how near a run must come: SI, the tolerance set first. `id` is what the run calls it.
 * `when` says where in the flight it is read, for a figure that is not a run's own result: at an instant, at an event,
 * or the most while some bodies are aboard or an engine burns.
 */
export interface PlanCheck {
  id: string;
  label: string;
  value: number;
  unit: string;
  tolerance: number;
  confidence: Confidence;
  source: string;
  /** Which part of the flight it is of: the ascent, the orbit, the descent, or the whole (a ballistic flight's). */
  of: 'ascent' | 'orbit' | 'descent' | 'flight';
  when?: CheckWhen;
}

/**
 * Where a check is read, where it is not an event's state or a result of the whole run: the g at an instant; the most g
 * with given bodies aboard or a stage burning; or the orbit at an instant (`reading: 'orbit'`: the check's id is
 * `<name>.perigee`, `.apogee` or `.period`, the coast's state then read as mean elements: orbital.ts `flyOrbit`).
 */
export type CheckWhen =
  | { at: number; reading: 'g' | 'orbit' }
  /** How far the flight's target is from the spacecraft at an instant, m (the check's id is `<name>.range`): orbital.ts `flyOrbit`, flown with its target. */
  | { at: number; reading: 'range' }
  | { most: 'g'; aboard: string[]; gone?: string[] }
  | { most: 'g'; burning: string };

/** A solid escape tower and the capsule it carried before jettison. */
export interface TowerEscape {
  engine: string;
  cover: string;
  service: string;
  stages: string[];
  tower: string;
  propellant: Measure;
  dragArea: Measure;
  /** Rounded escape hull and pad geometry it can strike. Stations are relative to the escape pivot. */
  hull?: {
    centre: Measure;
    spheres: readonly { station: Measure; radius: Measure }[];
    obstacles: readonly { node: string; name: string }[];
  };
  pitch: { until: Measure; angle: Measure; takes: Measure };
  canards: Measure;
  turn: { mach: Measure; takes: Measure };
  jettison: { after: Measure; height: Measure };
  coverAfter: { low: Measure; high: Measure };
  mainsAfterCover: Measure;
}

/** A service engine abort targeting either a recovery range or a survivable parking orbit. */
export interface ServiceAbort {
  engine: string;
  translation: { engine: string; duration: Measure };
  mass: Measure;
  goal: { kind: 'recovery' | 'orbit'; target: Measure };
}

/**
 * One mode of a spacecraft's escape from its launch vehicle (`PlanRecord.aborts`): what it did, by the record, if the vehicle
 * failed before `until`. `escape` is what of it the deck flies, as the record says it, in order: every engine burning shut
 * down (`cut`); the crew ejected on their seats (`eject`: at once, or as the falling stack comes down through `falling`, m
 * above the sea), which is the descent's own ejection flown from the stack (orbital.ts `flyEjected`); the spacecraft let go
 * of its last stage (`separate`), and with `entry` its descent module (the entry body) parted from it at once, to come down as from orbit.
 */
export interface AbortMode {
  /** Earliest use, for an alternative available before the preceding mode ends. */
  from?: Measure;
  until: Measure;
  does: string;
  escape?: {
    cut?: true;
    tower?: TowerEscape;
    eject?: { falling?: Measure };
    separate?: { entry?: true; motor?: { engine: string; duration: Measure }; service?: ServiceAbort };
  };
}

/** The record's mode of escape for an instant on the launch vehicle, s from liftoff (the first whose `until` is past it), or null. */
export function abortAt(plan: FlightPlan, t: number, preferOrbit = false): AbortMode | null {
  return (
    plan.record?.aborts?.find(
      (mode) =>
        t >= (mode.from?.value ?? -Infinity) &&
        t < mode.until.value &&
        (!preferOrbit || mode.escape?.separate?.service?.goal.kind === 'orbit'),
    ) ?? null
  );
}

/**
 * That the braking burn was timed to bring the ship down at the landing place (`PlanRecord.landing.aimed`): the ground
 * worked its instant from where the ship then was, so guidance does the same on the state the run is in (orbital.ts
 * `flyOrbit`): the burn is lit, in its recorded attitude and with its recorded impulse, at the instant from which the
 * run's own forces bring it down level with that place along its track, and everything the plan sets off by the clock
 * from the burn's command on follows by as much. The recorded instant is then a figure the run is held to
 * (`OrbitResults.retroLate`). `late`: how long after the intended instant the burn was in fact lit, s, where the record
 * says it was not lit when intended: applied to the instant solved. `from`: where the ground timed more than the burn
 * itself for the place (a burn before it that set up the entry, and the attitude turned to for that), the instant, s from
 * liftoff, from which everything the clock sets off is the braking burn's chain and keeps its recorded interval to it:
 * guidance works the instant before it, and moves it with the burn. Left out, the chain begins at the burn's command (or
 * its lighting). Left out of a landing, the burn is lit by the clock at its recorded instant: a flight whose burn was not
 * timed for the place it came down at.
 */
export interface LandingAim {
  late?: Measure;
  from?: Measure;
  confidence: Confidence;
  source: string;
}

/** The record's own figures that a run is not flown from. */
export interface PlanRecord {
  /**
   * Ground-tracking fixes, in time order: what a run is compared with (a sample is kept at each instant; the difference
   * is the run's residual: tools/residuals.mjs). No run, the record's or a hand's, is put on one.
   */
  coastFixes?: OrbitFix[];
  /** Lead time for the rendered slew into a coast maneuver's thrust direction, seconds. */
  manoeuvreTurn?: Measure;
  /** The mission's conventional entry interface, if it differs from the simulator's default, m. */
  entryInterface?: Measure;
  /**
   * The orbit as published: heights, inclination, period; the injection on it. The heights are over `radius` where the
   * record states the ball they are over (Friendship 7's), over the oblate earth as flown apsides where it says so
   * (`over`: Gemini 3's), over the ball the heights and period imply where it gives a
   * period, and otherwise over the WGS 84 ellipsoid under the apsis (orbital.ts `heightsBall`, `CONVENTION.radius`). Without a period (none traceable), the mean orbit's
   * axis is the heights' mean over that ball (`meanOrbitOf`), and its period is the derived nodal one the coast reports
   * (`OrbitResults.period`).
   */
  orbit?: {
    radius?: Measure;
    /**
     * Where a source names the figure its heights are over and not a number: `oblate`, the heights of the apsides flown
     * over the ellipsoid under them (Gemini's final elements), so the ball the mean orbit's heights stand on is
     * world/meanelements.ts `flownApsisBall` (orbital.ts `heightsBall`), and how sure.
     */
    over?: { is: 'oblate'; confidence: Confidence; source: string };
    perigee: Measure;
    apogee: Measure;
    inclination: Measure;
    period?: Measure;
    /** What kind of period the published one is, where the record says (world/meanelements.ts `CONVENTION.kind` otherwise), and how sure. */
    kind?: { is: PeriodKind; confidence: Confidence; source: string };
    injection: { at: Measure; heading: 'north' | 'south'; arc: Measure; anomaly: Measure };
    /** The spacecraft in orbit, kg. */
    mass: Measure;
  };
  /**
   * Where and when it came down; `near`, the place in the record's own words: on land the place it was near ('Smelovka'),
   * at sea the water and where in it ('the Atlantic, east of Grand Turk'), as `Craft.lands.on` says which.
   */
  landing?: { latitude: Measure; longitude: Measure; at: Measure; near?: string; aimed?: LandingAim };
  /** How long it could stay up, days. */
  supplies?: Measure;
  /**
   * Where the coast is bound once the run's last burn is made, in the record's words ('the Moon'), and what the flight did
   * next that is not flown, in a sentence: a flight flown to its injection and no further (a Saturn V's). Its end is said
   * as on its way there, not as an orbit that decays (sim/verdict.ts `downVerdict`, deck/orbitdeck.ts).
   */
  bound?: { for: string; next: string };
  /** The ground the descent comes down to, m above the sea. */
  ground?: Measure;
  /** What a canopy torn by the air keeps of its drag area. */
  torn?: Measure;
  /** What did each event of the descent on the day: said where a hand is offered one. */
  automatic?: string;
  /** What a pilot could do by hand: the code that frees the controls (none: they had no lock), how long after a burn by hand the modules part (s), the record's periods of orientation by hand. */
  manual?: { code?: Measure; parting?: Measure; periods?: { from: Measure; to: Measure; what: string }[] };
  /**
   * What the spacecraft's escape did if the launch vehicle failed, by the time it failed: each mode until `until` seconds
   * from liftoff, in a few words, and what of it can be flown (`escape`). A mode without `escape` is said, not flown.
   */
  aborts?: AbortMode[];
  /** The spacecraft's centre of mass above the flown model's origin, m. */
  centre?: Measure;
  /** What the spacecraft's own sequence does after an abort, and what pad aborts flown did (types/sim.ts `Body.escape`). */
  abort?: { sequence?: AbortSequence; record?: AbortRecord[] };
  /**
   * The record's instants that set nothing off (the orbit reached, the module down), by id: for the timeline and the checks.
   * `lands` names the body whose landing an instant is: a run has its own instant for it, where it put that body down.
   */
  marks?: { id: string; label: string; at: Measure; also?: string; lands?: string }[];
}

/** Space-fixed velocity expressed at a published geodetic position. Heading and flight path use the geocentric horizon. */
export interface OrbitFix {
  at: Measure;
  latitude: Measure;
  longitude: Measure;
  altitude: Measure;
  speed: Measure;
  heading: Measure;
  climb: Measure;
}

/** Everything in a plan that can be named, by kind, for the checks below and the machine's look-ups. */
export function names(plan: FlightPlan) {
  const craft = plan.craft;
  return {
    bodies: new Set(craft.flatMap((c) => c.bodies.map((b) => b.id))),
    joints: new Set(craft.flatMap((c) => c.joints.map((j) => j.id))),
    engines: new Set(craft.flatMap((c) => c.engines.map((e) => e.id))),
    tanks: new Set(craft.flatMap((c) => c.tanks.map((t) => t.id))),
    thrusters: new Set(craft.flatMap((c) => c.thrusters.map((t) => t.id))),
    chutes: new Set(craft.flatMap((c) => c.chutes.map((ch) => ch.id))),
    events: new Set(plan.events.map((e) => e.id)),
    attitudes: new Set(plan.attitude.map((a) => a.id)),
  };
}

/**
 * What is wrong with a plan, in words: an id used twice, a reference to something that is not there, an event that can
 * never happen. Empty when it is whole. A plan is checked before it is flown, so a mistake in the data is a sentence
 * and not a run that goes wrong.
 */
/**
 * Whether a plan can be flown by hand: a ballistic one has the rigid body its live vehicle steers (`Craft.rigid`); one into
 * orbit an ascent on a steering law (an attitude held by `law`), which its live vehicle flies.
 */
export function flownByHand(plan: FlightPlan | undefined): boolean {
  if (!plan) return false;
  return plan.kind === 'ballistic' ? Boolean(plan.craft[0]?.rigid) : plan.attitude.some((a) => 'law' in a.hold);
}

export function problems(plan: FlightPlan): string[] {
  const out: string[] = [];
  // (a figure that is not a number is a fault in the data, wherever it is: a simulator handed one flies nowhere, and says
  // so far from the cause. An instant that never comes is the largest safe integer or Infinity, and is a number.)
  const seen = new Set<object>();
  const weigh = (x: unknown, at: string): void => {
    if (!x || typeof x !== 'object' || seen.has(x)) return;
    seen.add(x);
    if ('confidence' in x && 'value' in x && 'source' in x) {
      if (typeof x.value !== 'number' || Number.isNaN(x.value)) out.push(`${at} is not a number: ${String(x.value)}`);
      return;
    }
    for (const [key, child] of Object.entries(x)) weigh(child, Array.isArray(x) ? `${at}[${key}]` : `${at}.${key}`);
  };
  weigh({ craft: plan.craft, events: plan.events, attitude: plan.attitude, checks: plan.checks, record: plan.record }, 'plan');
  const n = names(plan);
  const unique = (kind: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) out.push(`${kind} '${id}' is named twice`);
      seen.add(id);
    }
  };
  unique(
    'craft',
    plan.craft.map((c) => c.id),
  );
  unique(
    'body',
    plan.craft.flatMap((c) => c.bodies.map((b) => b.id)),
  );
  unique(
    'joint',
    plan.craft.flatMap((c) => c.joints.map((j) => j.id)),
  );
  unique(
    'engine',
    plan.craft.flatMap((c) => c.engines.map((e) => e.id)),
  );
  unique(
    'tank',
    plan.craft.flatMap((c) => c.tanks.map((t) => t.id)),
  );
  unique(
    'thruster set',
    plan.craft.flatMap((c) => c.thrusters.map((t) => t.id)),
  );
  unique(
    'chute',
    plan.craft.flatMap((c) => c.chutes.map((ch) => ch.id)),
  );
  unique(
    'event',
    plan.events.map((e) => e.id),
  );
  unique(
    'attitude',
    plan.attitude.map((a) => a.id),
  );
  const need = (set: Set<string>, kind: string, id: string, where: string) => {
    if (!set.has(id)) out.push(`${where} names ${kind} '${id}', which is not in the plan`);
  };
  for (const c of plan.craft) {
    if (!c.bodies.length) out.push(`craft '${c.id}' has no bodies`);
    for (const j of c.joints) {
      for (const b of [...j.gone, ...(j.covers ?? [])]) need(n.bodies, 'body', b, `joint '${j.id}'`);
      for (const h of j.holds ?? []) need(n.joints, 'joint', h, `joint '${j.id}'`);
      if (j.hot) need(n.engines, 'engine', j.hot.engine, `joint '${j.id}'`);
      for (const e of j.closed?.engines ?? []) need(n.engines, 'engine', e, `joint '${j.id}'`);
    }
    for (const e of c.engines) {
      need(n.bodies, 'body', e.body, `engine '${e.id}'`);
      for (const t of e.tanks) need(n.tanks, 'tank', t, `engine '${e.id}'`);
      if (e.kind === 'solid' && !e.burn && !e.curve && !e.tanks.length)
        out.push(`solid engine '${e.id}' has nothing to say how long it burns`);
    }
    for (const t of c.tanks) need(n.bodies, 'body', t.body, `tank '${t.id}'`);
    for (const t of c.thrusters) {
      need(n.bodies, 'body', t.body, `thruster set '${t.id}'`);
      if (t.tank) need(n.tanks, 'tank', t.tank, `thruster set '${t.id}'`);
      if (!t.does.length) out.push(`thruster set '${t.id}' does nothing`);
    }
    for (const ch of c.chutes) {
      need(n.bodies, 'body', ch.body, `chute '${ch.id}'`);
      for (const i of [...(ch.instead ?? []), ...(ch.fouls?.by ?? [])]) need(n.chutes, 'chute', i, `chute '${ch.id}'`);
    }
    for (const l of c.limits)
      if (l.at && (l.of === 'qAlpha' || l.of === 'axial') && !n.joints.has(l.at) && !n.bodies.has(l.at))
        out.push(`limit '${l.of}' breaks at '${l.at}', which is not in the plan`);
  }
  for (const e of plan.events) {
    const where = `event '${e.id}'`;
    if (!e.when.length) out.push(`${where} has no trigger`);
    for (const w of e.when) {
      if ('after' in w) need(n.events, 'event', w.after, where);
      if ('apparent' in w && w.apparent) need(n.engines, 'engine', w.apparent, where);
    }
    for (const a of e.do) {
      if ('ignite' in a) need(n.engines, 'engine', a.ignite, where);
      else if ('cut' in a) need(n.engines, 'engine', a.cut, where);
      else if ('throttle' in a) need(n.engines, 'engine', a.throttle, where);
      else if ('separate' in a) need(n.joints, 'joint', a.separate, where);
      else if ('deploy' in a) need(n.chutes, 'chute', a.deploy, where);
      else if ('release' in a) need(n.chutes, 'chute', a.release, where);
      else if ('attitude' in a) need(n.attitudes, 'attitude', a.attitude, where);
      else if ('arm' in a) need(n.events, 'event', a.arm, where);
    }
    if (e.armed === false && !plan.events.some((x) => x.do.some((a) => 'arm' in a && a.arm === e.id)))
      out.push(`${where} waits to be armed, and nothing arms it`);
  }
  if (!plan.attitude.length) out.push('the plan has no attitude to hold from liftoff');
  // (a launch vehicle flown on a steering law is turned by something: with no authority stated its live vehicle cannot follow
  // the law or a hand, and goes where it was pointed on the pad)
  if (plan.attitude.some((a) => 'law' in a.hold) && !plan.craft.some((c) => c.thrusters.some((t) => t.authority && t.authority.value > 0)))
    out.push('the plan is steered by a law and nothing steers it: no thruster set states the angular acceleration it gives (`authority`)');
  for (const k of plan.checks)
    if (k.when && 'aboard' in k.when)
      for (const b of [...k.when.aboard, ...(k.when.gone ?? [])]) need(n.bodies, 'body', b, `check '${k.id}'`);
    else if (k.when && 'burning' in k.when) need(n.engines, 'engine', k.when.burning, `check '${k.id}'`);
  return out;
}

/** The plan's event by id. */
export function eventOf(plan: FlightPlan, id: string): EventDef | undefined {
  return plan.events.find((e) => e.id === id);
}

/**
 * When the clock sets an event off on a plan, s from liftoff: at its `time`, or so long after the event it follows
 * (`after`, plus its `wait`), the latest where it has several; never (Infinity) for one nothing on the clock sets off.
 * Its other triggers (a height, a speed) are not the clock's, and are not read here.
 */
export function clockAt(plan: FlightPlan, e: EventDef | undefined, seen: ReadonlySet<string> = new Set()): number {
  if (!e || seen.has(e.id)) return Infinity;
  let at = Number.NEGATIVE_INFINITY;
  for (const w of e.when)
    if ('time' in w) at = Math.max(at, w.time);
    else if ('after' in w) at = Math.max(at, clockAt(plan, eventOf(plan, w.after), new Set([...seen, e.id])) + (w.wait ?? 0));
  return at === Number.NEGATIVE_INFINITY ? Infinity : at;
}

/** The first event that sets off an action, as the record has it: when the record does it, if it does. */
export function eventDoing(plan: FlightPlan, test: (a: Action) => boolean): EventDef | undefined {
  return plan.events.find((e) => e.do.some(test));
}

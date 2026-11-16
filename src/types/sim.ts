/** What the simulator flies from: a ballistic stack as a rigid body, its bodies, motors, thrusters, parachutes and limits. */
import type { Confidence, Measure } from '../measure.ts';

/** The simulator's own results, which a flight names (type-only: nothing here runs the simulator). */
export type { Results } from '../sim/fly.ts';

/** What an engine burns, for its fire's look (viewer/flames.ts: each one's colours, light and opacity, with their sources). */
export type Burns = 'alcohol-lox' | 'kerosene-lox' | 'hydrazine-n2o4' | 'amine-nitric' | 'solid-perchlorate';

/**
 * How an engine can be worked (sim/vehicle.ts). Left out, an engine is a liquid one at fixed thrust that is started
 * once and can be shut down.
 */
export interface EngineNature {
  /** A solid cannot be throttled or shut down: lit, it burns until it is spent. */
  kind: 'liquid' | 'solid';
  /** The least and the most it can be throttled to, as fractions of rated thrust. Left out: it does not throttle. Asked for less than the least, it is off. */
  throttle?: [least: number, most: number];
  /** How many times it can be started. */
  starts: number;
  confidence: Confidence;
  source: string;
}

/** A curve read off a published figure or table: points in order of x, straight lines between, held flat beyond the ends. */
export interface Curve {
  points: [x: number, y: number][];
  confidence: Confidence;
  source: string;
}

/** The wind at one height: how fast, m/s, and the bearing it blows from, degrees clockwise from true north (a meteorologist's wind). */
export interface WindLevel {
  /** Metres above the sea. */
  height: number;
  speed: Measure;
  from: Measure;
}

/**
 * The winds aloft over the launch site on the day, as a sounding has them: levels in order of height, straight lines
 * between (in the wind's east and north parts, so a swing through north is a swing and not a spin), the lowest held
 * down to the surface, and above the highest falling evenly to nothing at `calmAbove` (metres above the sea), beyond
 * which nothing is known and nothing is flown. The same wind is taken all along the flight: one sounding, at one place.
 */
export interface Winds {
  levels: WindLevel[];
  calmAbove: Measure;
}

/**
 * One surface the air heats, as a lump: so much of it per square metre to warm, taking a share of
 * the heat flux at the stagnation point and radiating what its emissivity lets it (sim/heating.ts).
 */
export interface HeatedSurface {
  name: string;
  /** The names of the materials (as the model's GLBs have them) that are this surface: the viewer makes them glow by its temperature. */
  materials: string[];
  /**
   * The fraction of the reference stagnation-point heat flux it takes, averaged over it: `up` while
   * the vehicle flies nose first, `down` blunt end first. Left out, it is out of the air then (a heat
   * shield under its booster).
   */
  share: { up?: Measure; down?: Measure };
  /** What there is to warm, kg per square metre of surface. */
  arealMass: Measure;
  /** J/(kg K), taken as constant. */
  specificHeat: Measure;
  /** Of the heated face, 0 to 1. */
  emissivity: Measure;
  /** What it must not reach, K, and what that limit is (it melts, it loses its strength). */
  limit: Measure;
}

export interface Heating {
  /** The radius the reference stagnation-point heat flux is worked on, m: the blunt end's radius of curvature. */
  noseRadius: Measure;
  /** Every surface's temperature at liftoff, K. */
  starts: Measure;
  /** The first is the one the instruments read (the heat shield). None: only the flux and the shock layer are worked. */
  surfaces: HeatedSurface[];
  /** A ball: its face is as blunt whichever way it meets the air, so its shock layer is whole at any attitude. */
  round?: boolean;
}

/**
 * One part of a vehicle's mass: a uniform cylinder between two stations, metres along the long
 * axis from the vehicle's base. The confidence is the least sure of its figures.
 */
export interface MassPart {
  name: string;
  from: number;
  to: number;
  /** kg: for a `fluid`, what the tank holds at liftoff. */
  mass: number;
  /** Metres, where it is not the body's. */
  radius?: number;
  /** A liquid in a tank: it drains, with every other, as the engine burns, and lies against the tank's lower end. */
  fluid?: boolean;
  /** Which of the engine's two propellants a liquid is: with the body's `mixture`, each kind drains at its own rate. */
  propellant?: 'oxidizer' | 'fuel';
  /** What takes it away: 'tower' for the escape tower's jettison. */
  sheds?: string;
  confidence: Confidence;
  source: string;
}

/**
 * Something the air pushes sideways on (a nose, the fins): the slope of its normal-force
 * coefficient against angle of attack, per radian, on the stack's drag `area` (plan.ts `Craft.drag`), acting at a
 * station. The whole vehicle's slope is their sum, its centre of pressure their mean, and its
 * damping follows from where each stands.
 */
export interface AeroSurface {
  name: string;
  /** Metres from the base on the stack; for the spacecraft alone, from its centre of mass toward its small end. */
  station: number;
  slope: number;
  confidence: Confidence;
  source: string;
}

/** A tank of attitude-control propellant and the system it feeds. */
export interface RcsSupply {
  name: string;
  /** Who works its chambers: the automatic system (an autopilot's commands) or the manual one (a hand's: `Controls.manual`). */
  mode: 'automatic' | 'manual';
  /** What can be used of what it holds, kg, and the propellant's specific impulse, s: a chamber burns its thrust over g0 times this, kg/s. */
  propellant: Measure;
  isp: Measure;
}

/**
 * One chamber of a reaction control system. The spacecraft's axes are the body's (sim/vehicle.ts): +X to the small end,
 * and a positive command turns it right-handed about its axis.
 */
export interface Thruster {
  name: string;
  /** The `RcsSupply` that feeds it, by name. */
  supply: string;
  /** The command that opens it: the axis, and the sense of the turn it gives (1 or -1). */
  axis: 'pitch' | 'yaw' | 'roll';
  sense: 1 | -1;
  /** Where its nozzle is, m from the spacecraft's centre of mass in the body's axes. */
  at: [x: number, y: number, z: number];
  /** The way it pushes the spacecraft, a unit vector in the body's axes: its jet leaves the other way. */
  push: [x: number, y: number, z: number];
  /** N. On or off, unless `least` is given: then the chamber is throttled by the command between `least` and this. */
  thrust: number;
  least?: number;
  confidence: Confidence;
  source: string;
}

/** A vehicle as a rigid body: mass along its length, where the air and the engine push, and what steers it. */
export interface Body {
  /** The body's radius, m: what a part's own inertia is worked from. */
  radius: Measure;
  /** The stack on the pad, base to tip. The fixed parts and the liquids sum to `liftoffMass`. */
  parts: MassPart[];
  surfaces: AeroSurface[];
  control: {
    /** The furthest the thrust can be turned off the axis, degrees, either way in pitch and in yaw. */
    deflection: Measure;
    /** Where the turned thrust acts, m from the base. */
    station: Measure;
    /** The arm the same deflection has about the long axis, m: roll torque is thrust times the sine of the deflection times this. */
    rollArm: Measure;
  };
  /** How the engine can be worked: its kind, whether and how far it throttles, how often it starts. */
  engine?: EngineNature;
  /**
   * Oxidizer to fuel, by mass, as the engine draws them. With it, and the liquids among `parts` marked `propellant`, the
   * two tanks are drawn down separately and the engine stops when either is empty (instead of at `engine.depletion`).
   */
  mixture?: Measure;
  /** When the escape tower is let go on a flight without an abort, seconds from liftoff. */
  tower?: { at: Measure };
  /**
   * The escape rocket, for an abort (sim/vehicle.ts): its thrust along the vehicle's axis, N, how long it holds it, s, and
   * its whole impulse, N s; what the impulse has over thrust times burn is spent as the thrust falls evenly to nothing.
   * It pulls the spacecraft off with every part that `sheds: 'tower'` still on.
   */
  escape?: {
    thrust: Measure;
    burn: Measure;
    impulse: Measure;
    /** Its thrust against time from firing, N against s, where a firing of the motor has been read: then this is what it burns by, in place of the three figures above. Its last point is where it is out. */
    curve?: Curve;
    /** What it burns, kg: the tower is lighter by it when the rocket is out. Without it nothing is taken off. */
    propellant?: Measure;
    /**
     * How its nozzles are turned out from the motor's centreline, degrees: so that the blast clears what is under it.
     * `thrust` is the resultant along the axis, so this takes nothing more off it; it is here for the record and for whoever draws the fire.
     */
    cant?: Measure;
    /**
     * How far to one side of the centre of mass its line of thrust passes, m: thrust times this is a torque that tips
     * the spacecraft over as it is pulled, which is what carries it clear of the booster it left. And the side it is
     * carried toward: degrees about the long axis, right-handed, from the body's -Z (downrange, as it stands on the pad).
     */
    offset?: Measure;
    toward?: Measure;
    /** What the spacecraft's own sequence does after an abort (`Controls.automatic`). Without it: the parachutes at their heights, as on any descent. */
    sequence?: AbortSequence;
    /** What a pad abort of this system did when it was tried, to hold the simulator's against (`of` names what: m, m/s, s). Never fitted to. */
    record?: AbortRecord[];
  };
  /** The spacecraft alone, after separation. */
  capsule: {
    /** Its centre of mass on the stack, m from the base. */
    centre: Measure;
    /** Radii of gyration about its long axis and across it, m. */
    gyration: { roll: Measure; across: Measure };
    surfaces: AeroSurface[];
    /** The torque its attitude jets give about each axis at full command, N m: used only where the jets are not given as hardware (`rcs`). */
    jets?: { roll: Measure; pitch: Measure; yaw: Measure };
    /** The reaction control system as hardware: what feeds it and every chamber. */
    rcs?: {
      supplies: RcsSupply[];
      thrusters: Thruster[];
      /**
       * A rate command mode, where the capsule had one (No. 11 on): the hand's stick asks for a rate of turn, `full`
       * degrees a second at full throw, and the system works the manual chambers to hold it within `deadband` degrees a
       * second, damping to none with the stick let go (sim/autopilot.ts `rateCommand`; the deck's Rate command switch).
       */
      rate?: { full: Measure; deadband: Measure };
    };
    /** How far its blunt end is from its centre of mass, m: that end is what meets the ground or the sea. Without it, the centre of mass does. */
    base?: Measure;
    /** How far from its centre of mass, toward the small end, a parachute pulls, m. */
    chuteArm: Measure;
    /**
     * The side its automatic control keeps toward the Earth once it has turned round, blunt end first (the side its
     * periscope looks out of, so its pilot is head up): degrees about the long axis, right-handed, from the body's +Z
     * (sim/vehicle.ts: on the pad +Z points against the launch azimuth). Without it the roll is left where it was.
     */
    earthward?: Measure;
    /** What a pilot aboard is taken to live through: the speed it may meet the surface at, m/s, and the greatest load, g. Said on the card that ends a flight flown by hand (sim/verdict.ts). */
    limits?: { landingSpeed: Measure; load: Measure };
    /** The spacecraft side on to the air: without it, its drag at an angle is its end-on drag and its surfaces' only. */
    side?: Broadside;
  };
  /** The stack side on to the air, likewise: stations in metres from the base. */
  side?: Broadside;
  /** What the vehicle lets go, each flown on as a body of its own (src/sim/shed.ts). */
  sheds?: ShedBody[];
  /** What the structure and the parachutes can take (src/sim/loads.ts). Left out: nothing ever breaks. */
  limits?: Limits;
}

/** What follows an abort without anyone's hand. */
export interface AbortSequence {
  /** The retropack is dropped as the spacecraft leaves the booster. */
  retropack: boolean;
  /** An abort begun under this height, m above the sea, has its parachutes by the clock; one begun above it, at their heights as on any descent. */
  ceiling: Measure;
  /** The drogue comes out this long after the tower has gone, s; and the main this long after the drogue, s, once under its own height. */
  drogue: Measure;
  main: Measure;
}

/** A figure from a pad abort that was flown, and how near the simulator's own must come: the tolerance set before it was run. */
export interface AbortRecord {
  /** Which trial it is from. */
  test: string;
  of: 'apogee' | 'range' | 'duration' | 'speed' | 'landingSpeed';
  label: string;
  /** SI. */
  value: number;
  unit: string;
  tolerance: number;
  confidence: Confidence;
  source: string;
}

/**
 * A body side on to the air: the drag coefficient times the side's area, m^2, spread evenly along a stretch of the long
 * axis (stations as the body's surfaces are measured). The air's push on each piece of the stretch goes as the square of
 * that piece's own sideways speed through it, so it is nothing to speak of at a small angle, the whole of the drag
 * broadside, and what slows a tumble.
 */
export interface Broadside {
  dragArea: Measure;
  from: Measure;
  to: Measure;
}

/**
 * Something a vehicle lets go that then flies on as a rigid body of its own (src/sim/shed.ts). Its mass is what the
 * vehicle loses at that event and its centre of mass is where that mass was, so the two together keep the momentum
 * they had. Its long axis is the vehicle's, +X toward the nose.
 */
export interface ShedBody {
  /** The plan's joint that lets it go, as `Flight.flies.drops[].on` names it (a body among several after a slash). */
  on: string;
  name: string;
  /** The stretch of the stack it is, m from the base, and its radius, m: its ends, for what touches the ground first. */
  from: Measure;
  to: Measure;
  radius: Measure;
  /**
   * What it weighs, kg, its centre of mass, m from the base, and its radii of gyration about its long axis and across
   * it, m: needed only where none of the stack's `parts` lies within its stretch (those give all of them, as `massOf`
   * has them, with what is left in their tanks). With them, the vehicle is lighter by `mass` when it goes.
   */
  mass?: Measure;
  centre?: Measure;
  gyration?: { roll: Measure; across: Measure };
  /** Its drag coefficient times area, m^2, moving nose end first and tail end first; `side` is the same, broadside. */
  ahead: Measure;
  astern: Measure;
  side: Broadside;
  /** What the air pushes sideways on in proportion to its angle (fins): stations from the base, slopes on the stack's drag `area`. */
  surfaces?: AeroSurface[];
  /** How fast it and the vehicle are pushed apart along the axis, m/s, shared between them by their masses. The 'separation' event's is `separation.speed`. */
  push?: Measure;
  /** The rockets of its own that light as it leaves, all at once: their thrusts add. */
  motors?: ShedMotor[];
  /**
   * A strap-on, standing beside the stack rather than on its axis, and how it leaves (sim/shed.ts `apart`): its lower ties
   * let go, what thrust its engine still gives swings its tail outward about the ball joint at its tip until the ball
   * leaves its socket, and it flies from there with the turn and the outward speed the swing gave it. A vent on its
   * oxidizer tank is one of its `motors` (with a `station`, so it turns it).
   */
  apart?: {
    /** Where it stands round the stack, degrees about the long axis from the way down range (the body's -Z) toward the stack's left (+Y). */
    bearing: number;
    /** Its own axis's distance from the stack's, m: its centre of mass is on it. */
    across: Measure;
    /** The ball joint at its tip, which it swings about: its station, m from the base, and its distance from the stack's axis, m. */
    pivot: { station: Measure; across: Measure };
    /** The thrust its engine still gives as it swings, once the stage has been cut (N): the tail-off. */
    tailOff: Measure;
    /** How far it swings, degrees, before its ball leaves the socket. */
    swing: Measure;
  };
}

/**
 * A rocket a shed body carries and lights as it leaves: its thrust, N, for `burn` seconds, along the body's +X turned
 * `cant` degrees toward its +Z (through the centre of mass, where it does not turn it, unless a `station` is given). What is left of `impulse` (N s) after
 * that is spent falling evenly to nothing, as `Body.escape`'s is.
 */
export interface ShedMotor {
  name: string;
  thrust: Measure;
  burn: Measure;
  impulse?: Measure;
  cant?: Measure;
  /** 'abort': this is the rocket an abort burns (`Body.escape`), so a body let go after one (`Release.aborted`) does not light it again. */
  unless?: 'abort';
  /** Where along the body its thrust acts, m from the base: off the centre of mass and canted, it turns the body. Left out: through the centre of mass. */
  station?: Measure;
}

/** What a vehicle can take before something gives (src/sim/loads.ts). Each is a figure with its confidence like any other. */
export interface Limits {
  /**
   * The stack going up: dynamic pressure times the angle between the long axis and the motion through the air, Pa rad,
   * which is what bends a slender vehicle. Past it the stack breaks at `joint`: the event (as `ShedBody.on`) whose
   * two sides part.
   */
  qAlpha: Measure;
  joint: string;
  /**
   * The greatest dynamic pressure each parachute's cloth can take, Pa. In more, it tears, whether it is being let out
   * or has been out for a minute: `torn` of its drag area is left.
   */
  drogue: Measure;
  main: Measure;
  torn: Measure;
  /**
   * The greatest pull each parachute's lines and riser can take, N: the dynamic pressure times the drag area it has
   * filled to. Past it, it tears the same way. A canopy that is full pulls far harder at a given pressure than one
   * still filling, so this is what gives when one let out where there is no air meets the air full. Left out for a
   * parachute: only its cloth's limit holds.
   */
  pull?: { drogue?: Measure; main?: Measure };
}

/**
 * A parachute as it is drawn (viewer/chute.ts): a canopy of gores on suspension lines that meet on a riser. What it does
 * to the flight is the plan's (its `ChuteDef`: drag area and filling time); these are its looks, each with its
 * confidence all the same.
 */
export interface ChuteDef {
  /** Which of the simulator's parachutes it is: the plan's parachute of that id, or with `body` that body's parachute's `name`. */
  on: 'drogue' | 'main' | (string & {});
  /**
   * A body of an orbital flight's descent (a plan body with its own `aero`, sim/orbital.ts flyDown) whose parachute this is:
   * out when flyDown lets it out, filling over its `fills`, gone when it is let go (`instead`, `replaces`), streaming
   * against the motion through the air of whatever it is made fast to.
   */
  body?: string;
  /**
   * The node it is made fast to, in the flown model or in a figure carried down on a descent (`flies.hangs`): at the
   * middle of the top of that node's bounds (+Y in its own frame), or its origin for a node with nothing under it.
   */
  at: string;
  /** How the cloth is cut: a ringsail's rings and sails with slots between, a ribbon parachute's ribbons, more gap than cloth, or a solid round canopy. */
  cut: 'ringsail' | 'ribbon' | 'solid';
  /** The canopy's diameter as made (laid flat), m. Filled, it is about two thirds of that across. */
  diameter: Measure;
  /** How many gores, and so how many suspension lines. */
  gores: Measure;
  /** The length of a suspension line, skirt to where they meet, m; and of the riser from there down to the vehicle, m. */
  lines: Measure;
  riser: Measure;
  /** The gores' colours in turn round the canopy, as CSS hex. */
  colours: { value: string[]; confidence: Confidence; source: string };
  /**
   * A reefed stage: the mouth held to `mouth` of its full width until `until` seconds after coming out, then let open,
   * full at the plan's `fills`. Left out, the mouth opens evenly from out to full.
   */
  reefed?: { mouth: Measure; until: Measure };
  /**
   * Seconds from being thrown out to line stretch: until then it is paying out, a streamer on lines not yet their
   * length, and it fills over what is left of `fills`. Drawn only: the simulator's drag grows from the moment it is out.
   */
  stretch?: Measure;
}

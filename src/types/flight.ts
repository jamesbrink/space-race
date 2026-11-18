/** What a flight is as data (missions/<nation>/<programme>/flights/<flight>/flight.ts): its record, its figures and checks, and its models. */
import type { Confidence, Measure } from '../measure.ts';
import type { FlightPlan } from '../sim/plan.ts';
import type { ModelDef } from './model.ts';
import type { AfloatDef, Burns, ChuteDef, HoistDef, LooseDef, Results } from './sim.ts';
import type { SiteDef } from './site.ts';
import type { DayWeather } from './weather.ts';

export interface Spec {
  /** Which thing the figure describes: 'Spacecraft', 'Launch vehicle', 'Launch pad', 'Pressure suit'. */
  group: string;
  label: string;
  /** SI. Imperial originals go in `note`. */
  value: number;
  unit: string;
  confidence: Confidence;
  note?: string;
}

export interface Motor {
  name: string;
  count: number;
  /** Per motor, newtons. */
  thrustN: number;
  /** Seconds. Left out for a thruster that fires in pulses. */
  burnS?: number;
  /** Caption when a single burn duration cannot describe this engine. Thrusters default to pulsed. */
  operation?: string;
  propellant: string;
  /** What kind of motor it is: a solid, once lit, burns to its own end and answers no command. */
  kind?: 'liquid' | 'solid';
  confidence: Confidence;
  note?: string;
}

export interface TimelineEvent {
  /** Seconds from liftoff. */
  t: number;
  event: string;
}

/** A result the reports give, for the simulator to be held against: tests/sim.test.mjs flies the plan and compares. */
export interface FlightCheck {
  /** What src/sim/fly.ts calls it, a field of its `Results`: 'apogee', 'range', 'separationSpeed'. */
  id: keyof Results;
  label: string;
  /** SI. */
  value: number;
  unit: string;
  /** How near the simulator must come, in the same unit: set before the simulator was run, not after. */
  tolerance: number;
  confidence: Confidence;
  source: string;
}

/** Geodetic coordinates and the local inertial velocity at an orbital tracking fix. */
export type OrbitalFix = Record<'t' | 'latitude' | 'longitude' | 'height' | 'speed' | 'flightPath' | 'heading', Measure>;
export interface Flight {
  /** <nation>/<program>/<flight>: also its path under missions/ and public/models/. */
  id: string;
  nation: string;
  agency: string;
  program: string;
  designation: string;
  callsign: string;
  spacecraft: string;
  launchVehicle: string;
  /** ISO 8601, UTC. */
  launch: string;
  launchSite: string;
  /**
   * Where that is, as numbers: the sky over the models is computed from this and `launch`. Left out: the flight has no
   * place to be shown in yet, only its vehicle in the gallery (src/app/address.ts `entrances`).
   */
  site?: SiteDef;
  /**
   * How its launch site first shows: at the instant `at`, seconds from liftoff (negative before it), on the section
   * `model` framed by its view `view` (both of the flight's own; left out, the first model and its home view). An
   * address that names a section opens on that section, at `at`. Left out, liftoff, on the first model. Flying it
   * starts at liftoff whatever this says (cockpit.ts): there is no countdown to fly. src/app/address.ts `openingFor`.
   */
  opens?: { at: number; model?: string; view?: string };
  /**
   * The weather it stood under at liftoff, as recorded (DayWeather): its launch site's sky is drawn from it. Left out,
   * the place's own (`PlaceDef.weather`), which is an estimate; with neither, a clear sky, which is one too.
   */
  weather?: DayWeather;
  crew: string[];
  summary: string;
  facts: { label: string; value: string }[];
  timeline: TimelineEvent[];
  specs: Spec[];
  motors: Motor[];
  /** What the flight's run is checked against (src/sim): the reports' figures. */
  checks?: FlightCheck[];
  /** What the Flown panel says under the checks: how the simulator's run stands against the reports today, and why. This flight's own verdict, in a sentence or three. */
  flownNote?: string;
  /**
   * What the flight is flown from, one shape for every kind (src/sim/plan.ts): its craft, the events that change it, the
   * attitudes it is held in, the checks. Left out: it cannot be flown yet. Written by the flight's launch vehicle's module
   * from the flight's own figures (a Mercury-Redstone's by mercury-redstone.ts `plan`, a Vostok's by vostok-plan.ts).
   */
  plan?: FlightPlan;
  /** Terminal orbital operations. The named masses and orbit are drawn from this flight's specifications. */
  docking?: {
    interface: 'probe' | 'cone' | 'shrouded';
    target: string;
    targetMass: string;
    fixes?: readonly [OrbitalFix, OrbitalFix?];
    transpose?: { at: number; startGap: Measure; departing: Measure; standOff: Measure; turnAfter: Measure; roll: Measure };
    fault?: {
      at: number;
      firstPulse: number;
      pause: number;
      undock: number;
      backAway: number;
      isolate: number;
      recovery: number;
      force: Measure;
      axialArm: Measure;
      rollArm: Measure;
    };
    tether?: { length: Measure; rotation: Measure; at: number; releaseAt: number };
    burns?: { label: string; at: number; deltaV: Measure; duration?: Measure; thrust: Measure; pitch: Measure; yaw: Measure }[];
    carrier?: {
      mass: Measure;
      arm: Measure;
      inertia: readonly [Measure, Measure, Measure];
      extractAt: number;
      pulses: readonly { after: number; seconds: number }[];
      nodes: readonly string[];
      jettisoned: readonly string[];
    };
    jets?: {
      body: 0 | 1;
      node: string;
      radius: number;
      direction?: [number, number, number];
      offset?: number;
      main?: boolean;
      tip?: boolean;
    }[];
    controls: Record<'ahead' | 'astern' | 'lateral' | 'attitude', Measure>;
    closureSpeed?: Measure;
    retractTime?: Measure;
    /** Axisymmetric port locations and moments about the body axes at the two recorded captures. */
    massProperties?: readonly (readonly { arm: Measure; inertia: readonly [Measure, Measure, Measure] }[])[];
    at: number;
  };
  /**
   * The flight in the scene: which model the run carries off the pad (after liftoff it is
   * where the simulator has it), and the parts of it that leave it on the way, at seconds from
   * liftoff: each then flies on as a body of its own where the plan's `Craft.sheds` gives one for its `on` (sim/shed.ts).
   */
  flies?: {
    model: string;
    /**
     * `on`: what in the plan lets them go, by its id (a joint, or a parachute that pulls it off as it comes out; a body among
     * several a joint lets go after a slash, `<joint>/<name>`), for a flight flown by hand (sim/vehicle.ts), where it happens
     * when the pilot says.
     */
    drops: {
      at: number;
      nodes: string[];
      /** A parachute's coming out can let something go too: for those, `at` is the record's time and the run on show gives its own. */
      on?: string;
      /** It leaves hanging under that parachute (the plan's id of it), which goes with it, instead of falling free. */
      under?: string;
      /**
       * It comes down on bodies of the orbital flight's descent (the plan's descent bodies, sim/orbital.ts flyDown) rather than as a
       * shed body: carried along each body's track in turn, each from where that body's track begins (a body left behind
       * begins where it was left), turning as it goes to lie with its +Y against its motion through the air (where its
       * parachute is made fast). `hide`: nodes of it not drawn from then on (the pilot, gone from the seat he left).
       */
      rides?: { body: string; hide?: string[] }[];
    }[];
    /**
     * A figure of the flight's (a model id) carried down on a body of the descent from when that body's parachute `from`
     * comes out, in the pose its `Harness` node's extras give (`hang_joints`, `hang`: sk-1.md), its Harness where the body is.
     */
    hangs?: { model: string; body: string; from: string }[];
    /** By when the spacecraft has turned from the booster's attitude to heat shield first, seconds from liftoff: it turns evenly from separation. */
    turned?: number;
    /**
     * A hatch the pilot can blow (No. 11's explosive hatch): its node in the flown model, what the deck calls blowing it,
     * and what it means. Blown, it leaves as a body of its own (`loose`, sim/loose.ts: its mass and the impulse that threw
     * it off, along its outward normal from where it is on the hull, `at`) and lies on the sea where it falls. Blown in
     * flight (`aloft`: the cabin open to space, the entry with a hole in the side) the flight flies on as if the cabin were
     * closed and the debrief says what that would have meant; down in the sea the opening it leaves (`opens`, an opening
     * of `afloat.body`'s spaces) lets the sea in (`afloat`), and the debrief tells what the record has after (`record`).
     * Offered with the spacecraft alone and after it is down (cockpit.ts `can('hatch')`).
     */
    hatch?: {
      node: string;
      label: string;
      aloft: string;
      afloat: string;
      record: string;
      opens: string;
      /** The mass of the body afloat that goes with it (`AfloatDef.leaves[].id`). */
      leaves: string;
      loose: LooseDef;
      /**
       * Its middle: height above the hull's lowest point and distance out from the long axis, m; how far its outward normal
       * tilts above the level (toward the top), degrees; where round the long axis it is in flight, degrees from the body's
       * +Z toward its +Y (sim/vehicle.ts); and the bearing it faces afloat, degrees true. The flown model has it on its +X.
       */
      at: { height: Measure; out: Measure; tilt: Measure; round: Measure; heading: Measure };
    };
    /**
     * The spacecraft in the sea once it is down (sim/afloat.ts): its hull, spaces and weight afloat, what the record has
     * after the landing (each instant from liftoff with its confidence: the hatch, the crew out, the helicopter's line
     * taut and cast loose), the record's helicopter (`hoist`), how far under it is lost to sight, and the record's figures
     * the run afloat is held to (tests/afloat.test.mjs, misses under `afloat`).
     */
    afloat?: {
      body: AfloatDef;
      /** The crew, as the body's `leaves` has him: he goes out through the hatch. */
      crew: string;
      /** Seconds from the hatch to the crew out, where a hand blows it. */
      goesOut: Measure;
      record: { hatch: Measure; out: Measure; taut: Measure; cast: Measure };
      hoist: HoistDef;
      sight: Measure;
      /** The spaces of `body` whose water is drawn (viewer/flooding.ts): those that can be seen into, by their ids. */
      seen?: string[];
      checks: { id: string; label: string; value: number; unit: string; tolerance: number; source: string }[];
    };
    /** Where the flown model's origin is along the stack, m from the base the body's stations are measured from: what is shed is turned about its own centre of mass by it. */
    datum?: number;
    /**
     * A ballistic flight's one engine: the node whose lowest point is the nozzle's exit, its area the plan engine's. Its
     * fire is drawn from there from liftoff to the cutoff.
     */
    engine?: string;
    /**
     * Every other fire, each an engine (viewer/fires.ts), drawn while it burns: each engine of a stage (all of them,
     * strap-ons and core alike), an upper stage, a braking engine. `on` names the plan's engine it is (`EngineDef.id`):
     * it burns between the instants the run has that engine burn, a stage's at its throttle, the coast's burn (the engine
     * with the record's impulse, `EngineDef.flown`) between the plan's instants of it or a hand's. `node`: with `radius` (the exit's, m), a node whose lowest point is
     * one round exit; without, a node holding only the engine's nozzles (its bells), whose every chamber, main or
     * steering, is found in the model's geometry and drawn from its own exit. `burns`: what it burns, which gives the
     * fire its colours, its light and how much of what is behind it it hides (viewer/flames.ts); left out, alcohol and oxygen.
     */
    fires?: { node: string; radius?: number; on: string; burns?: Burns }[];
    /** What `engine`'s fire burns: its colours, light and how much it hides (viewer/flames.ts). Left out, alcohol and oxygen. */
    burns?: Burns;
    /** The parachutes, drawn (viewer/chute.ts) when the simulator lets each out. */
    chutes?: ChuteDef[];
    /** What the air does to it that is drawn (viewer/effects.ts), by the nodes and materials it happens to. */
    air?: {
      /** The node whose lower end (-Y in the model's frame) is the blunt face that meets the air coming down: the shock layer's glow stands off it. */
      shield?: string;
      /** The node at whose top the body stops widening: the collar of cloud at Mach 1 forms there and trails back. */
      collar?: string;
      /** The names of the materials that are frost on a cold tank: ice falls from there at liftoff. */
      frost?: string[];
    };
  };
  models: ModelDef[];
  /** What came to it where it came down, on the record's clock (viewer/recovery.ts): the helicopter that hooked Liberty Bell 7. */
  recovery?: RecoveryCraft[];
  /** Who was in the sea where it came down, until a recovery craft had him (viewer/swimmer.ts). */
  swimmer?: SwimmerDef;
  /** The place round the pad, built like a model (the site's own: places/<place>/<package>/model/<date>.py) but scenery: it cannot be picked or taken apart. A relative URL. */
  surroundings?: string;
}

/** A flight that says where it flew from: what the site, its sky, the clock's face and the simulator are given. */
export type SitedFlight = Flight & { site: SiteDef };

/**
 * A craft that came to the spacecraft where it came down, flown on the record's clock (viewer/recovery.ts): in from where
 * it waited, round it, down over it, its line on it, and away. Drawn on the record's run (a run flown by hand comes down
 * where nobody was waiting) about where that run came down. Its model is a GLB of its own with its levels beside it, not
 * one of the flight's models: it is not a section of the gallery, and it stands nowhere on the site.
 */
export interface RecoveryCraft {
  name: string;
  /** Its model, relative to the base (lod.ts `lodUrl` finds its levels): +X forward, +Y up, its origin on the ground under its rotor. */
  url: string;
  /**
   * Where it was: each point an instant from launch, s, its origin's metres east and north of where the spacecraft came
   * down and height over the still sea, and the way it faced, degrees from north. Between two points it flies a smooth
   * line; before the first and after the last it is not in the scene. What the record gives of each is in `source`.
   */
  track: { at: number; east: number; north: number; height: number; heading: number }[];
  confidence: Confidence;
  source: string;
  /**
   * What turns as it flies: each node about its own axis (in its parent's frame) at its rate, rev/min; its blades, which
   * are heard as they pass (sound/model.ts `rotorcraftTimbres`), and whether it is the main rotor.
   */
  rotors: { node: string; axis: [number, number, number]; rpm: Measure; blades: Measure; main: boolean }[];
  /** Its engine as it is heard: a piston engine's cylinders and its rate, rev/min. */
  engine?: { cylinders: Measure; rpm: Measure };
  /**
   * Its line to the spacecraft: from its node `from` (the line's origin) to the top of the flown model's node `to`, on from
   * `on` to `off` (s from launch), `length` long. While the simulator's line pulls (sim/afloat.ts: the run's `tension`) it is
   * straight and holds the craft up over the spacecraft by its length; slack, it sags. Let go, it hangs from the craft.
   */
  line?: { from: string; to: string; on: Measure; off: Measure; length: Measure; radius: number };
  /**
   * Its rescue hoist, for a swimmer (`Flight.swimmer`, whose `by` names this craft): its boom node swung out about its
   * own `axis` by `out` radians from `on`, and the empty `sheave` the cable leaves it at, down to the swimmer's collar; from
   * `lift` he is drawn up it, aboard at `aboard` (s from launch). Before `grab` the cable hangs to the sea under the
   * sheave (the collar swinging in the water); from it, to his collar. The cable is drawn straight.
   */
  hoist?: {
    boom: string;
    axis: [number, number, number];
    out: number;
    sheave: string;
    on: Measure;
    grab: Measure;
    lift: Measure;
    aboard: Measure;
    radius: number;
  };
}

/**
 * Someone in the sea where the spacecraft came down (viewer/swimmer.ts): a figure of the flight's (`model`), from when he
 * went out until a craft's hoist (`by`, its `RecoveryCraft.hoist`) has him aboard. Where he was is a track like a
 * craft's: each point an instant, his metres east and north of where the spacecraft came down, how high his shoulders
 * stood over the sea's surface there (m; under it, negative), and the way he faced. He rides the day's sea that is drawn.
 * His pose in the water and on the hoist is each joint's turn from standing (degrees about its own X, then about the
 * way he faces: as `flies.hangs`' figures), and what of the figure he did not have there is not drawn. `seat`: the nodes of him in the flown model's cabin (a name's prefix), not
 * drawn once he is out. What the record gives of each is in `source`.
 */
export interface SwimmerDef {
  name: string;
  model: string;
  by: string;
  track: { at: number; east: number; north: number; shoulders: number; heading: number }[];
  swimming: Record<string, [number, number]>;
  hoisted: Record<string, [number, number]>;
  /** Nodes of the figure he did not have in the sea (a helmet he left in the cabin, a ventilator), not drawn. */
  without: string[];
  seat?: string;
  confidence: Confidence;
  source: string;
}

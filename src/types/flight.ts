/** What a flight is as data (missions/<nation>/<programme>/flights/<flight>/flight.ts): its record, its figures and checks, and its models. */
import type { Confidence, Measure } from '../measure.ts';
import type { ModelDef } from './model.ts';
import type { FlightPlan } from '../sim/plan.ts';
import type { Burns, ChuteDef, OrbitalFlight, Results } from './sim.ts';
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
   * A flight into orbit, as the record has it (src/sim/orbital.ts: stages, events, the orbit, the braking burn, the entry, with
   * its own checks), which its plan is written from (missions/ussr/vostok/vehicles/vostok-plan.ts).
   */
  orbital?: OrbitalFlight;
  /**
   * What the flight is flown from, one shape for every kind (src/sim/plan.ts): its craft, the events that change it, the
   * attitudes it is held in, the checks. Left out: it cannot be flown yet. Written by the flight's launch vehicle's module
   * from the flight's own figures (a Mercury-Redstone's by mercury-redstone.ts `plan`, a Vostok's by vostok-plan.ts).
   */
  plan?: FlightPlan;
  /**
   * The flight in the scene: which model the run carries off the pad (after liftoff it is
   * where the simulator has it), and the parts of it that leave it on the way, at seconds from
   * liftoff: each then flies on as a body of its own where the plan's `Craft.sheds` gives one for its `on` (sim/shed.ts).
   */
  flies?: {
    model: string;
    /** `on`: which of the simulator's events lets them go, for a flight flown by hand (sim/vehicle.ts), where it happens when the pilot says. */
    drops: {
      at: number;
      nodes: string[];
      /** A parachute's coming out can let something go too: for those, `at` is the record's time and the run on show gives its own. */
      on?: 'tower' | 'separation' | 'retropack' | 'drogue' | 'main' | (string & {});
      /** It leaves hanging under that parachute, which goes with it, instead of falling free. */
      under?: 'drogue' | 'main';
      /**
       * It comes down on bodies of the orbital flight's descent (`orbital.descent`, sim/orbital.ts flyDown) rather than as a
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
     * A hatch the pilot can blow (No. 11's explosive hatch): its node in the flown model (hidden once it has gone), what
     * the deck calls blowing it, and what it means. Nothing of it reaches the physics. Blown in flight (`aloft`: the
     * cabin open to space, the entry with a hole in the side) the flight flies on, and the debrief says what that would
     * have meant; blown afloat the spacecraft floods (`afloat`) and goes under in `under` seconds, drawn so, and the
     * debrief tells what the record has after (`record`). Offered with the spacecraft alone and after
     * it is down (cockpit.ts `can('hatch')`).
     */
    hatch?: { node: string; label: string; aloft: string; afloat: string; under: Measure; record: string };
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
  /** The place round the pad, built like a model (the site's own: places/<place>/<package>/model/<date>.py) but scenery: it cannot be picked or taken apart. A relative URL. */
  surroundings?: string;
}

/** A flight that says where it flew from: what the site, its sky, the clock's face and the simulator are given. */
export type SitedFlight = Flight & { site: SiteDef };

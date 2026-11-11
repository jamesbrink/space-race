/**
 * The shape every flight's data file has. The viewer renders it today; the simulator will
 * fly from the same numbers, so each one says how far it can be trusted.
 */

/**
 * documented — a published figure (NASA report, manufacturer manual, museum record).
 * derived    — computed from documented figures; the note says how.
 * estimated  — read off photographs or drawings, or chosen to look right. Replace these
 *              before a simulation depends on them.
 */
export type Confidence = 'documented' | 'derived' | 'estimated';

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
  confidence: Confidence;
  note?: string;
}

export interface TimelineEvent {
  /** Seconds from liftoff. */
  t: number;
  event: string;
}

/**
 * How a wheeled vehicle drives. All lengths in metres, viewer space (+Y up); positions are in
 * the part node's own coordinates.
 */
export interface Drive {
  /** Where its rear axle goes on the ground, as (x, z) from where it starts: a smooth curve through these. */
  path: [number, number][];
  /** The middle of the rear axle: what the vehicle turns about. */
  pivot: [number, number, number];
  /** Which way it faces as built: a unit (x, z). */
  forward: [number, number];
  /** It backs along the route instead of driving nose first. */
  reverse?: boolean;
  wheelRadius: number;
  /** Rear axle to front axle. */
  wheelbase: number;
  /**
   * Between kerbs at full lock, metres: what it can be driven round on foot (viewer/drive.ts).
   * A vehicle that drives itself off this way can also be got into and driven, if its model has
   * a `_Seat_Driver` and faces +X with its wheels named as the vehicle contract names them.
   */
  turningCircle?: number;
  /** Nodes named this and a number (`_1`, `_2`) roll. */
  wheels: string;
  /** Nodes named this and a number roll and steer. */
  steered: string;
  /** Which of a wheel node's own axes is its axle. */
  axle: 'x' | 'z';
}

/**
 * One motion in a part's sequence, played over a stretch of the model's slider: `from` and `to`
 * are positions on it, 0 to 1, and the motion eases in and out between them. `node` is a
 * node inside the part (default: the part itself). Motions on one node add up, in order.
 *
 * swing  turn `angle` radians (right-handed) about `axis` through the node's own origin: the
 *        model puts a hinged piece's origin on its hinge.
 * slide  move by `by` metres.
 * drive  a wheeled vehicle follows a route, turning with it, wheels rolling and steering.
 *
 * Axes and offsets are in the node's parent's coordinates (viewer space: +Y up).
 */
export type Move = { from: number; to: number; node?: string } & (
  | { kind: 'swing'; axis: [number, number, number]; angle: number }
  | { kind: 'slide'; by: [number, number, number] }
  | ({ kind: 'drive' } & Drive)
);

/**
 * One instant on a model's slider: at `at` seconds from launch the slider reads `slider`
 * (world/sequence.ts). The time is the record, with its confidence and source like any number;
 * where it falls on the slider is layout, chosen so each event can be seen.
 */
export interface Keyframe {
  at: number;
  slider: number;
  /** What happens then: 'Gantry removed: the structure starts for the edge of the pad'. */
  event: string;
  confidence: Confidence;
  source: string;
}

/**
 * Something a person standing at a part can do to it: a verb on the action wheel (src/actions.ts),
 * offered beside the ones every part has (Info, Inspect). A flight adds verbs here as data; the
 * wheel knows none of them by name.
 *
 * slider  run the part's model along its slider to `to` (0 to 1), at the pace it always moves:
 *         whatever `moves` the model's parts have play out, so "Roll the structure back" or
 *         "Lower the cab" is a position on the slider.
 * toggle  a door, a hatch, a gate: play `moves` (swings and slides, each on a named node of the
 *         part with its origin on its hinge; `from` and `to` are fractions of this action's own
 *         run) forward over `seconds` (default 1), and backward when chosen again, when the verb
 *         shown is `back` ('Close'). It is solid as posed, so an open door must clear its opening.
 * lift    `node` is a platform, built at its first stop; each stop is a name and a slide `by`
 *         from where it was built, metres, in the node's parent's coordinates (as a `slide` move).
 *         It travels at `speed` (default 1 m/s) and carries whoever stands on it. Standing on
 *         it the wheel offers "Ride to <name>" for each other stop; from anywhere else, "Call".
 *
 * A node driven by a toggle or a lift must have the same name at every level of detail, and must
 * not also be moved by the part's slider `moves`: the two would fight over it.
 */
export interface Action {
  /** Unique among the part's actions. */
  id: string;
  /** The verb as the wheel shows it: 'Roll back', 'Open'. */
  label: string;
  /**
   * Offer it only when what is faced is under this node of the part (the door itself, a call
   * button, the lift's car). Left out, it is offered anywhere on the part.
   */
  on?: string;
  do:
    | { kind: 'slider'; to: number }
    | { kind: 'toggle'; moves: Move[]; seconds?: number; back: string }
    | { kind: 'lift'; node: string; stops: { name: string; by: [number, number, number] }[]; speed?: number };
}

export interface Part {
  /** Name of the top-level node in the GLB. */
  node: string;
  name: string;
  summary: string;
  detail: string;
  /** Key figures shown under the description: material, size, mass, rating. */
  facts?: [label: string, value: string][];
  /**
   * Names and rules for the part's functions. A function is one thing the part does: the moves
   * (`moves`) of one node, or of several that go together, over the stretch of the slider they
   * span. Every node that moves is a function whether it is listed here or not; listing it gives
   * it a name, a pace and its interlocks. A function can be worked by hand (held, at its pace,
   * released to stop) from the wheel on foot or from the part's panel, instead of only by the
   * slider; the slider is the script, and a function worked by hand holds until the script next
   * moves the hardware.
   */
  functions?: {
    /** The node or nodes whose moves it is (Move.node; the part's own node for a move that names none). */
    nodes: string[];
    /** What it is called: 'Roll along the rails', 'White room'. */
    name: string;
    /** What each end of its travel is called, the start of the slider's stretch first: ['Closed', 'Open']. */
    ends?: [string, string];
    /** How long its whole travel takes when held, seconds. */
    seconds?: number;
    /** Offer it on foot only when what is faced is under this node (its controls). Left out: anywhere on the part. */
    at?: string;
    /**
     * The lever that works it: a node the model marks `lever`, with `swing` (degrees) about its
     * own `axis` in its extras. While the function is run by hand the lever is held over that far,
     * forward running it toward the end of its travel and back toward the start, and springs
     * back to the middle when let go.
     */
    lever?: string;
    /**
     * What must be so before it will move: other functions of the same part (by their first node),
     * each at least or at most this far along its travel (0 to 1). `why` is said when it is refused.
     */
    needs?: { node: string; atLeast?: number; atMost?: number; why: string }[];
  }[];
  /** What can be done to it from close by, on foot, beyond reading about it (see Action). */
  actions?: Action[];
  /** A heading in the parts list: parts with the same group are listed together under it. */
  group?: string;
  /** It is inside something: selecting it opens the cutaway so it can be seen. */
  inside?: boolean;
  /** Where the part goes at full explode: metres, viewer space (+Y is the nose). */
  explode: [number, number, number];
  /**
   * How it really leaves, as a sequence of motions (a boom lowers, legs fold, a truck drives
   * off), each timed against the slider, instead of one slide along `explode`.
   */
  moves?: Move[];
  /** Parts leave in this order as the explode slider advances; 0 goes first. */
  order: number;
}

/**
 * What is drawn behind a model: Earth from orbit, a dark studio, or a launch site on the ground.
 * A new site is a new name here and a new entry in `Settings` (viewer/backdrops.ts).
 */
export type BackdropKind = 'orbit' | 'studio' | 'cape-canaveral';

/**
 * A camera framing: look at height `centreY` from far enough back to fit `span` metres.
 * Leave both out and the view frames the model itself, however far it has been taken apart.
 */
export interface ViewDef {
  id: string;
  label: string;
  centreY?: number;
  span?: number;
  /**
   * Parts (node names) this view is of. It frames them wherever they are now, so it follows
   * them as the model is taken apart, and `centreY` and `span` are not needed.
   */
  nodes?: string[];
  /** Where the camera stands, as a direction from the subject (default: front right, slightly above). */
  from?: [number, number, number];
}

/** One thing a flight lets you look at: its vehicle, its pad, its pilot. */
export interface ModelDef {
  id: string;
  name: string;
  /** Relative to the site root (no leading slash): the viewer prefixes Vite's base path. */
  url: string;
  /** The line under the controls, e.g. '25.41 m on the pad'. */
  scale: string;
  backdrop: BackdropKind;
  /** Labels for the two ends of the slider; left out, the model has no slider. */
  slider?: [string, string];
  /**
   * The slider tells a sequence of events (a launch morning), and these are the instants along it:
   * the model is then on the simulation clock (world/clock.ts, world/sequence.ts). Its slider is
   * where the clock's instant falls on the sequence, dragging it moves the clock, and running the
   * clock plays the events at their own pace. Left out: the slider is not time, and the model is
   * wherever it is put, at once (an exploded view).
   */
  sequence?: Keyframe[];
  parts: Part[];
  /** Framings offered beside the automatic wide view of everything on show. */
  views: ViewDef[];
  /** The model has internals and flagged shells (srlib.mark_shells): offer a cutaway. */
  cutaway?: boolean;
  /**
   * This model is a person the site can be walked as (viewer/walk.ts): the walk starts where the
   * figure stands, at its eye height, looking the way it faces. A flight may have several.
   */
  walker?: {
    /** The node (anywhere in the model) whose middle is the eye level; without it a usual fraction of the figure's height is used. */
    eyes?: string;
    /** Which way the figure faces as built: a unit (x, z) in the model's own coordinates (default [0, 1]: +Z, Blender's front). */
    forward?: [number, number];
    /**
     * Nodes of the model that stay behind when the figure walks: what it had put down or was
     * plugged into, which is not drawn while it is being walked as.
     */
    hide?: string[];
    /**
     * What the figure has in its hands when it walks (viewer/carry.ts): each a rigid node of the
     * model whose origin is its handle, taken into the named hand at the model's `Grip.L` or
     * `Grip.R`. `hose` is a line back to the figure: the two anchor nodes it hangs between (it
     * leaves each along the anchor's +Y; `from`, on the item, carries `hose_length` and
     * `hose_radius` in its extras) and `mesh`, the hose as modelled for the figure at rest,
     * which is hidden while it is carried.
     */
    carries?: { node: string; hand: 'L' | 'R'; hose?: { mesh?: string; from: string; to: string } }[];
    /** Half the figure's width, metres: how near its middle can come to a wall (default 0.26, a clothed adult's shoulders). */
    radius?: number;
  };
  /** Where the model stands in the flight's one scene, metres (default: the origin). The floor is y = 0. */
  position?: [number, number, number];
  /** Which way it faces: radians about the vertical. */
  rotationY?: number;
  /** Offer the wide view of everything on show (default: yes). Not for a model that is small in it. */
  wide?: boolean;
  /** Which spec groups are this model's: they are listed first. */
  specGroups?: string[];
  /**
   * Lamps the model carries: cabin floodlights, so an interior seen through a window is not a
   * black hole. Positions in the model's own coordinates, metres; `reach` is where it fades out.
   */
  lights?: { position: [number, number, number]; colour: number; intensity: number; reach: number }[];
  /** The view shown first (default: 'all', everything on show). */
  home?: string;
  /**
   * The state the flight's other models take while this one is being studied (the pad cleared for
   * launch while the rocket is looked at). For a model with a `sequence` it is an instant, `at`
   * seconds from launch: choosing this section puts the clock there, unless the clock is running.
   * For any other it is how far along its slider, 0 to 1. A model not listed is left to the clock,
   * or shown as built.
   */
  with?: ({ model: string; exploded: number } | { model: string; at: number })[];
}

/** A figure that is not a model's dimension (a place on the Earth), with how far it can be trusted and where it came from. */
export interface Measure {
  value: number;
  confidence: Confidence;
  /** Document and section, or the survey or map it was read from; for `derived`, how. */
  source: string;
}

/**
 * Where a site is on the Earth, and how its own frame lies there (src/world/frames.ts: Site). The
 * origin is the model's origin (the launcher's centre on the pad's surface); from it and the
 * launch instant the Sun, the Moon and the stars are put where they were (src/world/ephemeris.ts).
 */
export interface SiteDef {
  name: string;
  /** Degrees north, WGS 84. */
  latitude: Measure;
  /** Degrees east, WGS 84: negative in the Americas. */
  longitude: Measure;
  /** Metres above the WGS 84 ellipsoid, which is not sea level. */
  height: Measure;
  /** Where mean sea level is there, metres above the ellipsoid (the geoid's height: negative where the sea is below it). */
  seaLevel: Measure;
  /** The bearing of the site frame's +X, degrees clockwise from true north. +Y is up; +Z bears 90 degrees more. */
  bearingX: Measure;
  /** The civil time kept there on the day: what its clocks were called, and their hours ahead of UTC (negative west of Greenwich). */
  zone: { name: string; utcOffset: number };
}

/** A curve read off a published figure or table: points in order of x, straight lines between, held flat beyond the ends. */
export interface Curve {
  points: [x: number, y: number][];
  confidence: Confidence;
  source: string;
}

/**
 * What the simulator flies a ballistic flight from (src/sim/fly.ts): one engine burn on a stored
 * tilt programme, then a capsule that separates, fires its retrorockets and comes down under
 * parachutes. SI throughout; the source's own units are in each `source`. Every number here is an
 * input: none is fitted to make the result come out.
 */
export interface Trajectory {
  /** The bearing flown, degrees clockwise from true north. */
  azimuth: Measure;
  /** Everything that leaves the pad, kg. */
  liftoffMass: Measure;
  engine: {
    /** Thrust at sea level, N, and specific impulse there, s: the flow is their quotient over g0. */
    thrust: Measure;
    isp: Measure;
    /** Nozzle exit area, m^2: thrust grows by this times the fall in air pressure. */
    exitArea: Measure;
    /** Seconds from liftoff at which it is shut down. */
    cutoff: Measure;
  };
  /** The tilt programme: degrees from the vertical at launch against seconds, held in inertial space by the gyros, in the plane of the azimuth. */
  tilt: Curve;
  /** The area drag coefficients are referred to, m^2. */
  area: Measure;
  /** Drag coefficient against Mach number, going up on the booster. */
  ascentDrag: Curve;
  separation: {
    /** Seconds from liftoff. */
    at: Measure;
    /** The capsule alone, kg, and what it leaves behind, kg. */
    mass: Measure;
    boosterMass: Measure;
    /** How fast the two part, m/s, shared between them by their masses. */
    speed: Measure;
  };
  retro: {
    /** When each retrorocket lights, seconds from liftoff. */
    fires: Measure[];
    /** Each one's thrust, N, and burning time, s. */
    thrust: Measure;
    burn: Measure;
    /** How far below the local horizontal the thrust on the capsule points, degrees; horizontally it is against the motion. */
    pitch: Measure;
  };
  /** The retropack is dropped: when, and the capsule's mass afterwards, kg. */
  retropack: { at: Measure; mass: Measure };
  /** Drag coefficient against Mach number, coming down heat shield first. */
  entryDrag: Curve;
  /** Each parachute: the height it is let out at, m, the drag area (coefficient times area) it adds once full, m^2, and how long it takes to fill, s. */
  drogue: { altitude: Measure; dragArea: Measure; fills: Measure };
  main: { altitude: Measure; dragArea: Measure; fills: Measure };
}

/** A result the reports give, for the simulator to be held against: tests/sim.test.mjs integrates the trajectory and compares. */
export interface FlightCheck {
  /** What src/sim/fly.ts calls it: 'apogee', 'range', 'maxSpeed'. */
  id: string;
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
  /** Where that is, as numbers: the sky over the models is computed from this and `launch`. */
  site: SiteDef;
  crew: string[];
  summary: string;
  facts: { label: string; value: string }[];
  timeline: TimelineEvent[];
  specs: Spec[];
  motors: Motor[];
  /** What the flight is integrated from, and what the result is checked against (src/sim). Left out: it cannot be flown yet. */
  trajectory?: Trajectory;
  checks?: FlightCheck[];
  /**
   * The flight in the scene: which model the trajectory carries off the pad (after liftoff it is
   * where the simulator has it), and the parts of it that leave it on the way, at seconds from
   * liftoff (and are no longer drawn: what happens to them is not flown yet).
   */
  flies?: {
    model: string;
    drops: { at: number; nodes: string[] }[];
    /** By when the spacecraft has turned from the booster's attitude to heat shield first, seconds from liftoff: it turns evenly from separation. */
    turned?: number;
    /** The node whose lowest point is the nozzle's exit: the engine's fire is drawn from there while it burns. */
    engine?: string;
  };
  models: ModelDef[];
  /** The place round the pad, built like a model (the site's own: sites/<site>/model/<date>.py) but scenery: it cannot be picked or taken apart. A relative URL. */
  surroundings?: string;
}

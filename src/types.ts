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
  /** Nodes whose names start with this roll. */
  wheels: string;
  /** Nodes whose names start with this roll and steer. */
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
   * The state the flight's other models take while this one is being studied: how far along
   * their own sliders, 0 to 1 (the pad cleared for launch while the rocket is looked at).
   * A model not listed is shown as built.
   */
  with?: { model: string; exploded: number }[];
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
  /** The bearing of the site frame's +X, degrees clockwise from true north. +Y is up; +Z bears 90 degrees more. */
  bearingX: Measure;
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
  models: ModelDef[];
  /** The place round the pad, built like a model (model/surroundings.py) but scenery: it cannot be picked or taken apart. A relative URL. */
  surroundings?: string;
}

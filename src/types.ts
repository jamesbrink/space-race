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
 * A part that drives away instead of sliding: a truck. All lengths in metres, viewer space
 * (+Y up); positions are in the part node's own coordinates.
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

export interface Part {
  /** Name of the top-level node in the GLB. */
  node: string;
  name: string;
  summary: string;
  detail: string;
  /** Key figures shown under the description: material, size, mass, rating. */
  facts?: [label: string, value: string][];
  /** A heading in the parts list: parts with the same group are listed together under it. */
  group?: string;
  /** It is inside something: selecting it opens the cutaway so it can be seen. */
  inside?: boolean;
  /** Where the part goes at full explode: metres, viewer space (+Y is the nose). */
  explode: [number, number, number];
  /** It leaves by driving this route instead of sliding along `explode`. */
  drive?: Drive;
  /**
   * It leaves by turning on a hinge instead of sliding: a mast that falls back, a boom that
   * lowers. `pivot` is a point on the hinge line and `axis` its direction, in the part node's
   * own coordinates (metres, +Y up); `angle` is how far it turns, radians, right-handed about `axis`.
   */
  swing?: { pivot: [number, number, number]; axis: [number, number, number]; angle: number };
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
  /** Where the model stands in the flight's one scene, metres (default: the origin). The floor is y = 0. */
  position?: [number, number, number];
  /** Which way it faces: radians about the vertical. */
  rotationY?: number;
  /** Offer the wide view of everything on show (default: yes). Not for a model that is small in it. */
  wide?: boolean;
  /** Which spec groups are this model's: they are listed first. */
  specGroups?: string[];
  /** The view shown first (default: 'all', everything on show). */
  home?: string;
  /**
   * The state the flight's other models take while this one is being studied: how far along
   * their own sliders, 0 to 1 (the pad cleared for launch while the rocket is looked at).
   * A model not listed is shown as built.
   */
  with?: { model: string; exploded: number }[];
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
  crew: string[];
  summary: string;
  facts: { label: string; value: string }[];
  timeline: TimelineEvent[];
  specs: Spec[];
  motors: Motor[];
  models: ModelDef[];
}

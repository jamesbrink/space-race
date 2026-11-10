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
  burnS: number;
  propellant: string;
  confidence: Confidence;
  note?: string;
}

export interface TimelineEvent {
  /** Seconds from liftoff. */
  t: number;
  event: string;
}

export interface Part {
  /** Name of the top-level node in the GLB. */
  node: string;
  name: string;
  summary: string;
  detail: string;
  /** Key figures shown under the description: material, size, mass, rating. */
  facts?: [label: string, value: string][];
  /** It is inside something: selecting it opens the cutaway so it can be seen. */
  inside?: boolean;
  /** Where the part goes at full explode: metres, viewer space (+Y is the nose). */
  explode: [number, number, number];
  /** Parts leave in this order as the explode slider advances; 0 goes first. */
  order: number;
}

/** What is drawn behind a model: Earth from apogee, the Cape at ground level, or a dark studio. */
export type BackdropKind = 'orbit' | 'ground' | 'studio';

/** A camera framing: look at height `centreY` from far enough back to fit `span` metres. */
export interface ViewDef {
  id: string;
  label: string;
  centreY: number;
  span: number;
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
  /** Framings offered beside the automatic 'Everything'. */
  views: ViewDef[];
  /** The model has internals and flagged shells (srlib.mark_shells): offer a cutaway. */
  cutaway?: boolean;
  /** Where the model stands, metres (default: the origin). The floor is y = 0. */
  position?: [number, number, number];
  /** Which way it faces: radians about the vertical. */
  rotationY?: number;
  /** The view shown first (default: 'all', everything on show). */
  home?: string;
  /** Other models of this flight shown alongside for context, e.g. the vehicle standing on its pad. */
  with?: {
    model: string;
    position: [number, number, number];
    rotationY?: number;
    /** Show it with its own slider at this position, 0 to 1 (e.g. a pad already cleared for launch). */
    exploded?: number;
  }[];
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

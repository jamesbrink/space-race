/**
 * The shape every flight's data file has. The viewer renders it today; the simulator will
 * fly from the same numbers, so each one says how far it can be trusted.
 */
import type { Results } from './sim/fly.ts';
import type { OrbitalFlight } from './sim/orbital.ts';

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
  /** What kind of motor it is: a solid, once lit, burns to its own end and answers no command. */
  kind?: 'liquid' | 'solid';
  confidence: Confidence;
  note?: string;
}

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
  /**
   * What can be commanded of it while the flight is being flown, from a right click on it: each one of the steps the
   * flight deck can set off (cockpit.ts `ask`), which this part is the hardware of. One is offered only while it can
   * still be done (`Cockpit.can`), and does what the deck's own key or the cabin's own control would.
   */
  commands?: Command[];
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
  /**
   * What the hardware did at its own times, on a model whose slider is something else (a vehicle's takes it apart):
   * motions on the flight's clock, `from` and `to` in seconds from launch, each on a named node of the part (with its
   * origin on its hinge, built where it stood at liftoff). Played wherever there is a clock (the launch site, the
   * flight), in step with the hardware on it; where there is none (the gallery) the part stands as built. The periscope's
   * door opening and shutting through the flight. A node moved here is not also moved by `moves`.
   */
  clocked?: Move[];
  /** Parts leave in this order as the explode slider advances; 0 goes first. */
  order: number;
}

/** A step of the flight that can be set off by hand, and what the menu calls it on the part it belongs to. */
export interface Command {
  label: string;
  ask: 'cutoff' | 'tower' | 'separate' | 'retro' | 'retropack' | 'drogue' | 'main';
}

/**
 * What is drawn behind a model: Earth from orbit, a dark studio, or a launch site on the ground.
 * A new site is a new name here and a new entry in `Settings` (viewer/backdrops.ts).
 */
export type BackdropKind = 'orbit' | 'studio' | 'cape-canaveral' | 'tyuratam';

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

/**
 * What an instrument can read (viewer/gauges.ts makes them from the flight at the clock's instant, flown or from the
 * record): `altitude` m above the sea; `descent` m/s downward; `g` what an accelerometer along the long axis reads;
 * `elapsed` s from liftoff (nought before it); `timeOfDay` s since midnight by the site's clocks; `pitch`, `yaw`,
 * `roll` degrees as the spacecraft's own gyros had them (gauges.ts states the convention) and `pitchRate`, `yawRate`,
 * `rollRate` degrees a second; `supply0`, `supply1`... the fraction left in each reaction-control supply
 * (`trajectory.body.capsule.rcs.supplies`, in order). Anything else an instrument shows is not simulated: it is
 * given a `value` and says so.
 */
export type Quantity =
  | 'altitude'
  | 'descent'
  | 'g'
  | 'elapsed'
  | 'timeOfDay'
  | 'pitch'
  | 'yaw'
  | 'roll'
  | 'pitchRate'
  | 'yawRate'
  | 'rollRate'
  | `supply${number}`;

/** What a lamp can tell: an event of the flight that has happened (`tower` gone, `separated` from the booster, `retro` fired, `retropack` dropped, `entry` felt at a twentieth of a g, `drogue` and `main` out, `abort`), or `ready`: on the pad before ignition. */
export type Signal = 'ready' | 'tower' | 'separated' | 'retro' | 'retropack' | 'entry' | 'drogue' | 'main' | 'abort';

/**
 * A model's inside, as somewhere to sit and fly from (viewer/cabin.ts). Every node named is a node of the model at its
 * full level of detail. What each is called and what is said about it is read when the pointer is on it, on board or
 * in the cutaway. Nothing in the viewer knows any one spacecraft: a new one is described here.
 */
export interface CabinDef {
  /** Nodes whose meshes are indoors: lit by the model's own `lights` and what comes in at the windows, not by the open sky. */
  within: string[];
  /** How far the head turns from where the seat looks, radians: to either side, up, and down. Default: a free neck. */
  head?: { side: number; up: number; down: number };
  /** Which way the top of the pilot's head points, in the model's frame (default +Z): what the roll needle calls up. */
  overhead?: [number, number, number];
  /**
   * Needles, bars and counter wheels. `node` is the moving piece, its origin on its pivot; how it reads is in its own
   * extras, written by the script that drew its face (`turn`: value, radians pairs about the face's normal; `slide`:
   * value, metres pairs; `drum`: digits on a wheel, with `place` the power of ten it shows), so the scale has one home.
   * `reads` is the quantity and `per` what one unit of the face is in that quantity's units (a face in thousands of
   * feet reads metres with `per: 304.8`). An instrument of something not simulated has `value` instead, in the face's
   * units, and stands there.
   */
  instruments: { node: string; name: string; about: string; reads?: Quantity; per?: number; value?: number }[];
  /** Lamps: lit, in `colour`, while the signal holds. One with no signal shows something not simulated: it stays dark and says so. */
  lamps?: { node: string; name: string; about: string; shows?: Signal; colour?: number }[];
  /**
   * Controls that are the controls: a click on one does what the flight deck's key does (`does`: a command of
   * src/cockpit.ts: 'tower', 'separate', 'retro', 'retropack', 'drogue', 'main', 'abort'). One with no `does` is
   * there to be read about. How it moves when worked is in the node's extras (`pull` or `press`, metres along its axis).
   */
  controls?: { node: string; name: string; about: string; does?: string }[];
  /**
   * Windows, as light: where each pane is (`at`) and the way it faces out of the model (`out`, a unit vector), in the
   * model's frame, and how wide its glass is, metres. What is outside each (sky, the Earth, black) is looked at a
   * couple of times a second and comes in as a light of that colour and of the strength its area gives. Each is also
   * something to lean to and look out of on board (viewer/lookouts.ts), by `name` ("Window" if it has none).
   */
  windows?: { at: [number, number, number]; out: [number, number, number]; across: number; name?: string }[];
  /** The hand controller: the node tips about these axes of its own (unit vectors) by `throw` radians at full command, and twists for yaw. */
  stick?: { node: string; throw: number; pitch: [number, number, number]; roll: [number, number, number]; yaw: [number, number, number] };
  /**
   * A periscope: what its objective sees is drawn on `screen` (a mesh of the model). `at` is the objective and `axis`
   * the way it looks, `up` what of the outside is at the top of the picture and `top` which way on the screen that
   * is (default: the same), all in the model's frame (viewer's axes, metres); `fields` the whole angle seen at each
   * power, degrees, widest first.
   */
  periscope?: {
    screen: string;
    name: string;
    about: string;
    at: [number, number, number];
    axis: [number, number, number];
    up: [number, number, number];
    top?: [number, number, number];
    fields: number[];
  };
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
  /**
   * Places in the model a walker can take (a couch, a seat): boarded on foot from the wheel, at
   * `from` (a node of the model: the hatch), while the clock is within `open` (seconds from
   * launch; boarding does not move the clock). Seated, the eyes are at `eye` in `node`'s frame
   * (metres; default its origin), looking along its +Z, and the nodes in `hide` are not drawn
   * (the helmet's visor that would be in front of the eyes). `standIn` is for a model that has no
   * such node yet: the node is made at the middle of this mesh, its +Z along `look` and its +Y as
   * near `up` as that allows (both in the model's frame; without `up`, whichever way the shortest
   * turn leaves it). Say so where it is used: it is a placeholder, not the model.
   * The same place is where the camera sits on board (viewer/camera/onboard.ts): the first seat is the one it uses.
   * `figure` is the flight's model of whoever sits here as he stands outside (a model with a `walker`): there is one
   * of him, so while the flight deck is taken that figure is not also drawn standing on the pad.
   */
  seats?: {
    node: string;
    label: string;
    from: string;
    open: [number, number];
    eye?: [number, number, number];
    hide?: string[];
    /**
     * Where the seat can be left for the outside, and so whether a walk outside is offered: 'pad' through the hatch
     * while `open`, 'orbit' in flight (an EVA), 'sea' after landing. Left out: on the pad only. Nothing in the viewer
     * offers 'orbit' or 'sea' yet; a spacecraft that allowed them says so here and the offer follows the data.
     */
    egress?: ('pad' | 'orbit' | 'sea')[];
    standIn?: { mesh: string; look: [number, number, number]; up?: [number, number, number] };
    figure?: string;
  }[];
  /** The inside of it as a place to be: instruments that read, lamps that light, controls that work, windows to look out of (CabinDef). */
  cabin?: CabinDef;
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
  /** The country round the site seen in its flights, which the globe draws from a finer map than its own (RegionDef). */
  region?: RegionDef;
  /**
   * The sky a flight from here stands under when it gives none of its own (`Flight.weather`): the place's usual fair
   * morning, every figure of it `estimated`. A flight's own day replaces all of it, never part.
   */
  weather?: DayWeather;
}

/** A wind as a station reports it: the bearing it blows from, degrees clockwise from true north, and its speed, m/s. */
export interface Wind {
  from: Measure;
  speed: Measure;
}

/**
 * One layer of cloud, as an observer under it reports it. `cover` is the fraction of the sky it hides, 0 to 1 (a
 * station's okta is an eighth, and means that eighth give or take a sixteenth); `base` is metres above the station's
 * ground. `kind` is the observer's genus: the viewer draws cumulus as heaps, altocumulus as a deck of cloudlets,
 * cirrus as fibres and cirrostratus as a veil.
 */
export interface CloudLayer {
  kind: 'cumulus' | 'altocumulus' | 'cirrus' | 'cirrostratus';
  cover: Measure;
  base: Measure;
  /** What the record says of it that the figures do not: how it was coded, what else was said of it. */
  note?: string;
}

/** What a report says of the sky over a stretch of country, not over one station: "northern Florida obscured by high cirrus". */
export interface WeatherBeyond {
  /** The words of the record. */
  what: string;
  /** The country it speaks of, degrees north and east (WGS 84): our reading of the words, so `estimated` unless the record gives bounds. */
  south: number;
  north: number;
  west: number;
  east: number;
  /** How much of the sky there the high cloud hides, and the low: either left out where the record says nothing of it. */
  high?: Measure;
  low?: Measure;
  confidence: Confidence;
  source: string;
}

/**
 * The weather a flight stood under: what was observed at or nearest its site at the hour nearest its liftoff, layer by
 * layer, each figure with its confidence and source like any other (`documented`: station, hour and document;
 * `derived`: how; `estimated`: says so). The viewer draws the sky from this (viewer/day.ts) and nothing else: a layer
 * left out is a layer the record does not have, and no cumulus and no deck are drawn at the site without one. What lay
 * beyond the station's own sky is estimated (viewer/weather.ts), except where `beyond` has the record's word for it.
 */
export interface DayWeather {
  /** The observation the documented figures are documented for: where, and when (ISO 8601, UTC). */
  observed: { where: string; at: string; source: string };
  /**
   * The low cloud: cumulus. `depth`: how far the tallest tops stand over the bases, metres; `size`: across a cloud,
   * metres; `wind`: what the layer drifts on, which is the wind at its own height.
   */
  low?: CloudLayer & { depth: Measure; size: Measure; wind: Wind };
  /** The middle deck: altocumulus. */
  middle?: CloudLayer;
  /**
   * The high cloud. `depth`: its optical depth looked straight up through (as the classes of Sassen and Cho, 1992, are
   * commonly quoted: to 0.3 thin cirrus, to 3 cirrostratus the Sun's disc still shows through). A station does not
   * measure it, so it is `estimated`, within what the report implies (a thin layer: no ceiling). Left out: no high
   * cloud is recorded at the site, and what the map's own estimate has there stands.
   */
  high?: CloudLayer & { depth: Measure };
  /** The wind at the surface. */
  wind: Wind;
  /** How far the eye sees along the ground, metres. A station reports it up to a limit: past the limit it is estimated, and says so. */
  visibility: Measure;
  /** The height over which the haze thins by e, metres (viewer/air.ts). */
  haze: Measure;
  /** What the record says of the sky away from the station. */
  beyond?: WeatherBeyond[];
}

/**
 * The country round a site, drawn on the globe from a finer coast than Natural Earth's:
 * tools/globe-region.mjs bakes it from OpenStreetMap to public/globe/<name>.*, and viewer/globe.ts
 * draws it where it covers and its own 1:10 million map elsewhere.
 */
export interface RegionDef {
  /** The stem of its files. */
  name: string;
  /** Its bounds, degrees north and east (WGS 84). */
  south: number;
  north: number;
  west: number;
  east: number;
  /** Why these bounds: what the flights from the site see. */
  why: string;
  /** The date the shore is drawn as (ISO): works in `later` built after it are undone. Today's map is the shore as it stands. */
  asOf: string;
  /** What has been built since that changed the shore: each undone in the bake if built after `asOf`. */
  later: LaterWork[];
}

/** A causeway filled or a channel dug: the shore as it was before, along a line. */
export interface LaterWork {
  what: string;
  /** The year it was finished. */
  built: number;
  /** What was there before it: water where a causeway now stands, land where a canal is now cut. */
  was: 'water' | 'land';
  /** The line it follows, [latitude, longitude] degrees, and the width put back along it, metres. */
  path: [number, number][];
  width: number;
  /** For the date, and for the line (read off OpenStreetMap unless it says otherwise). */
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
 * What the simulator flies a ballistic flight from (src/sim/fly.ts): one engine burn on a stored
 * tilt programme, then a capsule that separates, fires its retrorockets and comes down under
 * parachutes. SI throughout; the source's own units are in each `source`. Every number here is an
 * input: none is fitted to make the result come out.
 */
export interface Trajectory {
  /** The bearing flown, degrees clockwise from true north. */
  azimuth: Measure;
  /** The day's winds aloft (sim/forces.ts: `blowOf`): the air everything is flown through moves with them. Left out: the air turns with the Earth and no more. */
  winds?: Winds;
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
    /** How long it can burn before a propellant runs out, s: the live simulator (sim/vehicle.ts) stops it then if nobody has, unless the body gives the engine's `mixture`. */
    depletion?: Measure;
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
  /** The vehicle as a body that turns: what the live simulator (src/sim/vehicle.ts) needs beyond the above. `fly` does not read it. */
  body?: Body;
  /** What the air's heat does to it (src/sim/heating.ts): neither simulator's flight depends on it. */
  heating?: Heating;
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
  /** The first is the one the instruments read (the heat shield). */
  surfaces: HeatedSurface[];
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
 * coefficient against angle of attack, per radian, on the trajectory's `area`, acting at a
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
    rcs?: { supplies: RcsSupply[]; thrusters: Thruster[] };
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
  /** The event that lets it go, as `Flight.flies.drops[].on` names it: 'tower', 'separation', 'retropack'. */
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
  /** What the air pushes sideways on in proportion to its angle (fins): stations from the base, slopes on the trajectory's `area`. */
  surfaces?: AeroSurface[];
  /** How fast it and the vehicle are pushed apart along the axis, m/s, shared between them by their masses. The 'separation' event's is `separation.speed`. */
  push?: Measure;
  /** The rockets of its own that light as it leaves, all at once: their thrusts add. */
  motors?: ShedMotor[];
}

/**
 * A rocket a shed body carries and lights as it leaves: its thrust, N, for `burn` seconds, along the body's +X turned
 * `cant` degrees toward its +Z (through the centre of mass: it does not turn it). What is left of `impulse` (N s) after
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
 * to the flight is the trajectory's (`drogue`, `main`: drag area and filling time); these are its looks, each with its
 * confidence all the same.
 */
export interface ChuteDef {
  /** Which of the simulator's parachutes it is. */
  on: 'drogue' | 'main';
  /** The node of the flown model it is made fast to: at the middle of the top of that node's bounds (+Y in its own frame). */
  at: string;
  /** How the cloth is cut: a ringsail's rings and sails with slots between, or a ribbon parachute's ribbons, more gap than cloth. */
  cut: 'ringsail' | 'ribbon';
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
   * full at the trajectory's `fills`. Left out, the mouth opens evenly from out to full.
   */
  reefed?: { mouth: Measure; until: Measure };
  /**
   * Seconds from being thrown out to line stretch: until then it is paying out, a streamer on lines not yet their
   * length, and it fills over what is left of `fills`. Drawn only: the simulator's drag grows from the moment it is out.
   */
  stretch?: Measure;
}

/** A result the reports give, for the simulator to be held against: tests/sim.test.mjs integrates the trajectory and compares. */
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
   * place to be shown in yet, only its vehicle in the gallery (src/address.ts `entrances`).
   */
  site?: SiteDef;
  /**
   * The weather it stood under at liftoff, as recorded (DayWeather): its launch site's sky is drawn from it. Left out,
   * the site's own (`SiteDef.weather`), which is an estimate; with neither, a clear sky, which is one too.
   */
  weather?: DayWeather;
  crew: string[];
  summary: string;
  facts: { label: string; value: string }[];
  timeline: TimelineEvent[];
  specs: Spec[];
  motors: Motor[];
  /** What the flight is integrated from, and what the result is checked against (src/sim). Left out: it cannot be flown yet. */
  trajectory?: Trajectory;
  checks?: FlightCheck[];
  /** What the Flown panel says under the checks: how the simulator's run stands against the reports today, and why. This flight's own verdict, in a sentence or three. */
  flownNote?: string;
  /**
   * A flight into orbit, as the record has it (src/sim/orbital.ts: stages, events, the orbit, the braking burn, the entry, with
   * its own checks). Beside `trajectory`, not in it: a flight has whichever its kind of flight is, and one with only this is
   * not offered to be flown by hand yet.
   */
  orbital?: OrbitalFlight;
  /**
   * The flight in the scene: which model the trajectory carries off the pad (after liftoff it is
   * where the simulator has it), and the parts of it that leave it on the way, at seconds from
   * liftoff: each then flies on as a body of its own where `trajectory.body.sheds` gives one for its `on` (sim/shed.ts).
   */
  flies?: {
    model: string;
    /** `on`: which of the simulator's events lets them go, for a flight flown by hand (sim/vehicle.ts), where it happens when the pilot says. */
    drops: {
      at: number;
      nodes: string[];
      /** A parachute's coming out can let something go too: for those, `at` is the record's time and the run on show gives its own. */
      on?: 'tower' | 'separation' | 'retropack' | 'drogue' | 'main';
      /** It leaves hanging under that parachute, which goes with it, instead of falling free. */
      under?: 'drogue' | 'main';
    }[];
    /** By when the spacecraft has turned from the booster's attitude to heat shield first, seconds from liftoff: it turns evenly from separation. */
    turned?: number;
    /** Where the flown model's origin is along the stack, m from the base the body's stations are measured from: what is shed is turned about its own centre of mass by it. */
    datum?: number;
    /** The node whose lowest point is the nozzle's exit: the engine's fire is drawn from there while it burns. */
    engine?: string;
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
  /** The place round the pad, built like a model (the site's own: sites/<site>/model/<date>.py) but scenery: it cannot be picked or taken apart. A relative URL. */
  surroundings?: string;
}

/** A flight that says where it flew from: what the site, its sky, the clock's face and the simulator are given. */
export type SitedFlight = Flight & { site: SiteDef };

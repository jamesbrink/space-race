/** A model and its parts: what each is, how it moves, its views, its cabin and its mechanisms. */
import type { Confidence, Measure } from '../measure.ts';
import type { Burns } from './sim.ts';

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
  /** Rear axle to front axle (a rail wagon's: its rear bogie's middle to its front one's). */
  wheelbase: number;
  /**
   * It is a rail wagon: both its bogies are on the route, the one `wheelbase` ahead of the rear as well, and the body
   * lies along the line between them, as it does on a track (left out: a road vehicle, whose rear axle follows the
   * route and which points along it). Beyond the route's end the front bogie goes on along its last heading.
   */
  bogies?: boolean;
  /**
   * Between kerbs at full lock, metres: what it can be driven round on foot (viewer/onfoot/drive.ts).
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
 * What a thing that slides or drives runs on (a `slide`'s or a `drive`'s `runs`), so that at every instant of its move
 * it stands on it, neither in it nor over it (viewer/runs.ts): each wheel on what is under its tread, the body pitched
 * and rolled between them, its height wherever that puts it. Without it a move is level, at the height it was built at.
 * Say what the honest surface is: the model's own rails for a rail wagon, the land for a road painted on it.
 */
export interface Runs {
  /**
   * Nodes of the flight's models, the place round the pad among them, whose tops it runs on: a node's name ('DeckRails'),
   * or `node/material` for only its meshes whose material's name begins so ('Hardstand/steel-rail'), since the viewer
   * keys on materials and a node may hold the ties and the ballast with its rails.
   */
  on?: string[];
  /**
   * And the site's own ground, the land (Setting.groundAt): what a road or an apron painted on it lies on, and the track
   * beyond the modelled rails. Where the highest thing under a tread is one `on` names (a rail's head), the land beside
   * it is not what the wheel runs on (a flange over a flangeway the land only paints).
   */
  ground?: boolean;
  /**
   * A slide's wheels: nodes named this and a number (`_1`, `_2`), each with its origin on its axle (a drive's are its own
   * `wheels` and `steered`). They roll with the distance run. Left out, it has none and stands on its own lowest points
   * (a hut's skids, a cart's wheels that are not nodes of their own).
   */
  wheels?: string;
  /**
   * A rail wagon's bogies: nodes named this and a number (`_1`, `_2`), children of what moves, each a bogie's frame
   * with its origin on its pivot. Each is kept over its wheel sets (the wheels nearest it as built, which stay the
   * wagon's own children: each is put on the track by itself): moved with their middle, turned about its pivot to
   * the line through them, which is the track under it, and pitched with them over a change of grade.
   */
  bogies?: string;
  /**
   * How far apart the joints of the rails it runs on are, metres along them, where they are jointed: each wheel knocks over
   * each (sound/model.ts `Works`). Left out, they are not (a road, the land) or nothing says.
   */
  joints?: Measure;
  /** A slide's wheels' radius where the tread bears, metres. */
  wheelRadius?: number;
  /** Which of a slide's wheel's own axes is its axle. */
  axle?: 'x' | 'z';
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
 *        Either, given `runs` (Runs), stands on what it runs on at every instant: its wheels on the rails or the ground
 *        under them, its body pitched between them.
 * run    the node's own motion, worked out by the script that built it and written in the node's extras (`run`: seven
 *        figures a sample, evenly spaced through the motion: how far it has moved, x y z in metres, and how it has
 *        turned, a quaternion x y z w, both in its parent's coordinates and from where it was built). A linkage: a
 *        door on its hinge, the link that pushes it, the housing that carries the link, each a node with its own
 *        `run`, all played over the same stretch so they stay joined. `back` plays it from its end to its start.
 *        It is not eased (the samples carry the motor's own start and stop) and it does not add to other moves: the
 *        node stands where the last `run` to have begun has it.
 *
 * Axes and offsets are in the node's parent's coordinates (viewer space: +Y up).
 */
export type Move = { from: number; to: number; node?: string; machine?: Machine } & (
  | { kind: 'swing'; axis: [number, number, number]; angle: number }
  | { kind: 'slide'; by: [number, number, number]; runs?: Runs }
  | { kind: 'run'; back?: boolean }
  | ({ kind: 'drive'; runs?: Runs } & Drive)
);

/**
 * People of a group walking off a site, or onto it, each figure along a way a person could take, on the gait
 * (viewer/onfoot/going.ts `goneAt`): where the record says they went, or else away along the nearest road until out of
 * sight, and said so. Not yet a field of a part: it waits for the people to be built as figures that can walk (a
 * `<group>_Person_<n>` node each, jointed to the crew contract, srlib.FIGURE; issue #24), and until then a group that
 * leaves is taken out of sight on the clock (site-1.parts.ts `leaves`).
 *
 * leaves  each figure stands where it was built until `at` (and its place in the group's `stagger`), then walks from its
 *         spot to the way's first point and on along it to its end, which is out of sight; there it is gone.
 * comes   the same backward: in from the way's far end at `at`, along it, to its own spot, where it stands as built.
 */
export interface Going {
  kind: 'leaves' | 'comes';
  /** When the first sets off, seconds from launch on the flight's clock. */
  at: Measure;
  /** How much later each next figure of the group sets off than the one before, s. */
  stagger: number;
  /** The way, metres (x, z) in the model's frame, from near the group to out of sight (`leaves`) or the reverse order's start. */
  way: [number, number][];
  /** Its walking pace, m/s (left out: an unhurried walk, going.ts `PACE`). */
  pace?: Measure;
  /** Where they went and why this way: the record's, or the nearest road out of sight (estimated). */
  confidence: Confidence;
  source: string;
}

/**
 * What drives a move, for what it is heard as while it moves (sound/model.ts `MACHINES`, each kind's timbre and level):
 *
 * motor       an electric motor through a gearbox: a platform's drive, a periscope's door
 * winch       an electric winch: a drum, a brake, a cable paying out
 * hydraulic   a pump and its rams: an aerial tower's jib, an erector's boom
 * rails       a structure on its own powered rail trucks: motors, and steel wheels on its rails
 * locomotive  a wagon drawn or pushed along its track by a diesel locomotive, which is not drawn (`engine`)
 * road        a road vehicle under its own engine (`engine`), its tyres on what is under each of its wheels
 * towed       a trailer behind something: its tyres and its rattle, no engine of its own
 * skids       dragged over the ground on runners
 * hand        pushed, wheeled or folded by hand
 * lift        a lift's car on its way up or down
 * door        a door, a gate or a hatch on its hinges: the latch as it shuts
 * release     let go and falling under its own weight, or its weights': a mast, a support arm; the landing
 * none        not a machine (a pose held from before the slider, people going out of sight): silent, and said so
 *
 * How each really sounded is not recorded anywhere we have read: what is known is what drove it, and that is what
 * `confidence` and `source` are about. A move that names no machine is silent (tests/sound.test.mjs lists any at a site).
 */
export type MachineKind =
  | 'motor'
  | 'winch'
  | 'hydraulic'
  | 'rails'
  | 'locomotive'
  | 'road'
  | 'towed'
  | 'skids'
  | 'hand'
  | 'lift'
  | 'door'
  | 'release'
  | 'none';

export interface Machine {
  kind: MachineKind;
  confidence: Confidence;
  /** Why this kind: what the record says drove it, or that nothing does. */
  source: string;
  /** A `road` vehicle's or a `locomotive`'s engine: the name its place lists it under (PlaceDef.engines). */
  engine?: string;
}

/**
 * A road vehicle's or a locomotive's engine, as it is heard (sound/model.ts `engineVoice`): four-stroke, so it fires
 * `cylinders / 2` times a turn, between `idle` and `most` revolutions a minute. Listed by its place (PlaceDef.engines)
 * under the name a vehicle's model gives itself (its extras' `vehicle`) or a move's machine names.
 */
export interface Engine {
  fuel: 'petrol' | 'diesel';
  cylinders: number;
  /** Revolutions a minute at idle, and the most it was run to (its rated speed, where that is published), each with its own confidence. */
  idle: Measure;
  most: Measure;
  /** Which engine it was, its fuel and its cylinders: how sure, and whose. */
  confidence: Confidence;
  source: string;
}

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
 * Something a person standing at a part can do to it: a verb on the action wheel (src/app/actions.ts),
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
    | { kind: 'lift'; node: string; stops: { name: string; by: [number, number, number] }[]; speed?: number; machine?: Machine };
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

/**
 * A step of the flight that can be set off by hand, and what the menu calls it on the part it belongs to. `work:<id>`
 * works a mechanism of the model by hand (`ModelDef.mechanisms`, by its id: a periscope), sending it the other way from
 * where it is headed: `label` is then what putting it out is called and `back` what drawing it in is.
 */
export interface Command {
  label: string;
  /**
   * What it asks: an event of a ballistic flight's (sim/vehicle.ts), a mechanism worked (`work:<id>`), or a step of an
   * orbital flight's launch vehicle (`step:<ignite|cut|separate>:<stage index>`, `step:drop:<drop id>`: sim/stagedlive.ts), or an
   * event of its descent (`descent:modules`, `descent:ejection`, `descent:<body id>/<parachute name>`: sim/orbital.ts flyDown).
   */
  ask:
    | 'cutoff'
    | 'tower'
    | 'separate'
    | 'retro'
    | 'retropack'
    | 'drogue'
    | 'main'
    | 'hatch'
    | `work:${string}`
    | `step:${string}`
    | `descent:${string}`;
  back?: string;
}

/**
 * What is drawn behind a model: Earth from orbit, a dark studio, or the ground of the flight's place round its pad
 * (`Flight.site`: its `place`, whose ground is viewer/scenery/ground.ts's from the place's own module).
 */
export type BackdropKind = 'orbit' | 'studio' | 'ground';

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
 * (`Craft.rigid.capsule.rcs.supplies`, in order). Anything else an instrument shows is not simulated: it is
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
 * A lamp lit by a position of the cabin's lights' switch (CabinDef.lighting): one of the model's `lights`, by its index,
 * in its own colour at its whole strength; or `light` in `colour` at `level` of its strength (a red bulb in the same
 * fitting, a dim duty light). Its fitting glows in the same colour, as brightly.
 */
export type CabinLamp = number | { light: number; colour?: number; level?: number };

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
   * units, and stands there. One whose readings the record gives at instants (a pilot reading his gauges out on the
   * radio) has `history` instead: each reading at `at` seconds from liftoff, or `at` seconds after the event `from` of
   * an orbital flight's record (as the run on show has it), straight between readings and held beyond the last.
   */
  instruments: {
    node: string;
    name: string;
    about: string;
    reads?: Quantity;
    per?: number;
    value?: number;
    history?: { at: number; from?: string; value: number }[];
  }[];
  /**
   * Lamps: lit, in `colour`, while the signal holds. One with no signal shows something not simulated: it stays dark and says so.
   * On a flight into orbit a lamp can show an event of its record (`event:` and the record's id of one: a plan event's `record.id`, or a mark's), lit
   * from its instant as the run on show has it (a burn by hand moves the burn's events) until the instant of `until`'s, if given.
   */
  lamps?: { node: string; name: string; about: string; shows?: Signal | `event:${string}`; until?: string; colour?: number }[];
  /**
   * Controls that are the controls: a click on one does what the flight deck's key does (`does`: a command of
   * src/deck/cockpit.ts: 'tower', 'separate', 'retro', 'retropack', 'drogue', 'main', 'abort'; or of an orbital flight's deck,
   * src/deck/orbitdeck.ts: 'retro', and `code:` and a numeral for a key of its logical lock). One with no `does` is
   * there to be read about. How it moves when worked is in the node's extras (`pull` or `press`, metres along its axis).
   * One with `works` works a mechanism of the model by hand (`ModelDef.mechanisms`, by its id): sent the other way
   * from where it is headed, in a flight being flown by hand (src/deck/cockpit.ts `work`). One that `holds` a state of the
   * flight deck (orbitdeck.ts `holds`: 'free', the hand controls freed) stands at the second of its `throw` positions
   * (its node's extras) while the deck says that state holds, and at its first otherwise, so the cabin and the deck agree.
   *
   * A thrown control. A control whose node carries `throw` in its extras (a toggle or a tumbler: a turn about its own X
   * for each of its positions, the first as it was built) is a switch: a click throws it to its next position (and round
   * to the first), the lever goes over as a switch's does, and it stays there. `says` names its positions, in order. What
   * it switches says so by naming it as its `control` (`lighting.control`, `globe.control`), and is told each time it is
   * thrown; one with `does` also asks the flight deck for that command when thrown; one that `holds` stands as the deck's
   * state has it while the flight is flown by hand, and as the hand last threw it otherwise. Every switch that switches
   * something is also a button in the seat's bar, as the lights' always was.
   */
  controls?: { node: string; name: string; about: string; does?: string; works?: string; holds?: string; says?: string[] }[];
  /**
   * Windows, as light: where each pane is (`at`) and the way it faces out of the model (`out`, a unit vector), in the
   * model's frame, and how wide its glass is, metres. What is outside each (sky, the Earth, black) is looked at a
   * couple of times a second and comes in as a light of that colour and of the strength its area gives. Each is also
   * something to lean to and look out of on board (viewer/lookouts.ts), by `name` ("Window" if it has none).
   */
  windows?: { at: [number, number, number]; out: [number, number, number]; across: number; name?: string }[];
  /**
   * The cabin's own lights and their switch. `control` is a thrown control of the model (its extras carry `throw`: a
   * turn about its own X for each position the switch has, the first as it was built; `controls` above); left out where
   * the model has no switch built for them yet (say so), and they are thrown from the page alone. `ways` says, position
   * by position, what the switch reads there and which of the model's `lights` it lights (`CabinLamp`: by index, and in
   * what colour and how brightly; the rest are dark). `fittings` are the meshes that glow with each of `lights`, in the
   * same order, each with a material of its own: they glow in their lamp's colour and as brightly as it is lit. The
   * cabin opens with the switch as it was built; what the build shaded is shaded for the lamps on and for the lamps off
   * (viewer/cabin.ts), mixed by how much of the lamps' strength is lit, so a dark cabin is lit by its windows, its
   * periscope and its telelights.
   */
  lighting?: { control?: string; name: string; about: string; ways: { says: string; lit: CabinLamp[] }[]; fittings?: string[] };
  /**
   * A globe that shows where the spacecraft is (the Vostok's Globus): `node` turns about its own centre so that a point
   * of the Earth stands under the cross (the node's own +Z as built) with the way the spacecraft goes over it toward the
   * node's own +Y as built. The node's own +Y is the Earth's axis toward the north, and its own +Z is the meridian of
   * Greenwich as built. Its surface shows the land and the sea from the globe's own map (viewer/globe.ts). Which point is
   * its mode's (`modes`, the first as built; with none, `place`): `place`, the point under the spacecraft at the clock's
   * instant; `landing`, where it would come down if the braking engine were fired now (the simulator's own prediction of
   * that descent, viewer/cabin.ts `burnNow`). `control` is the thrown control (`controls`) that changes the mode, a
   * position for each mode; `lamp`, a lamp of `lamps` lit while its mode is on.
   */
  globe?: {
    node: string;
    name: string;
    about: string;
    control?: string;
    modes?: { says: string; shows: 'place' | 'landing'; lamp?: string }[];
  };
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
    /**
     * The mechanism that puts its objective out (`ModelDef.mechanisms`, by its id): the screen shows the outside only
     * as far as that is out, and with it drawn in shows what the objective then looks at, the dark behind its door.
     * Left out: the objective is always out.
     */
    mechanism?: string;
    at: [number, number, number];
    axis: [number, number, number];
    up: [number, number, number];
    top?: [number, number, number];
    fields: number[];
    /** Its screen carries the Mercury periscope's reticle, drawn on it (default); false for a screen whose rulings are the model's own. */
    reticle?: boolean;
    /**
     * A ring of ports round the screen (the Vzor's): `mesh` of the model, coaxial with the screen, shows what lies `from`
     * to `to` degrees off the axis, the nearer the axis the nearer the middle, each port the bearing it stands at; so the
     * horizon stands at one radius in every port only when the axis is on the Earth's centre.
     */
    ring?: { mesh: string; from: number; to: number };
  };
}

/**
 * A mechanism of a model that runs out and in to a programme on the flight's clock, and that the pilot of a flight
 * flown by hand can work (src/sim/mechanism.ts): one motion with one figure, its travel, 0 drawn in and 1 out. Its
 * motion is the model's own: the `Part.clocked` moves of `nodes`, which play the same travel at each of `events`
 * (out, or in: the same motion the other way). Wherever there is a clock it follows `events`; in a flight flown by
 * hand it follows them while the sequencer is on, a hand's command (its control in the cabin, its switch among the
 * flight deck's keys, a `Command` on its part) sends it the other way and holds it there until the programme's next event, and with the sequencer
 * off it moves only when told.
 */
export interface MechanismDef {
  id: string;
  name: string;
  /** What its two ends are called: drawn in, and out. */
  says: [string, string];
  /** The nodes it moves: each has `Part.clocked` moves, timed by `events`. */
  nodes: string[];
  /** The instants it is sent out (true) or in (false), seconds from launch, in order. It is built drawn in. */
  events: [number, boolean][];
  /** How long the whole travel takes, seconds. */
  takes: number;
  /** An instant at which one of `events` sends it out from fully in: the clocked moves from there over `takes` are the travel itself. */
  from: number;
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
   * This model is a person the site can be walked as (viewer/onfoot/walk.ts): the walk starts where the
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
     * What the figure has in its hands when it walks (viewer/onfoot/carry.ts): each a rigid node of the
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
  /** What of it runs to a programme on the flight's clock and can be taken by a hand (MechanismDef): a periscope and its door. */
  mechanisms?: MechanismDef[];
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
  /**
   * What leaves the model's nozzles that is not a main engine's fire (viewer/jets.ts): a tank's vent, a turbine's exhaust,
   * a solid's burst. The model's because its nodes are, and because the gallery shows the model without its flight's
   * `flies`; when each blows is the flight's plan's (`JetDef.when`).
   */
  jets?: JetDef[];
}

/** What a jet is made of, which is how it looks (viewer/jets.ts `GASES`). */
export type Gas =
  /** Cold oxygen gas from a tank's vent: white vapour that thins and is gone. */
  | 'oxygen'
  /** Steam and oxygen from decomposed hydrogen peroxide, a turbine's exhaust: clear at the mouth, a thin white veil aft. */
  | 'steam'
  /** A solid motor's burst: a fire (viewer/plume.ts), of what `burns` says. */
  | 'solid';

/**
 * A jet that is not a main engine's fire: what leaves a node of the model, of what, how hard and when (viewer/jets.ts).
 * The node's origin is on the jet's axis in the mouth's plane and its own +Z (the exported file's +Y) the way the jet
 * pushes: the gas leaves along its -Z, at every instant, so a booster tumbling away carries its vent's jet with it.
 */
export interface JetDef {
  node: string;
  gas: Gas;
  /** What a solid burns, for its fire's look (viewer/flames.ts). Left out, the era's polysulphide and perchlorate. */
  burns?: Burns;
  /** The mouth's radius, m. Left out, the mouths are found in the node's geometry (viewer/fires.ts `exitsOf`), each a jet. */
  radius?: Measure;
  /** Its thrust, N, all its mouths together; with `when.shed`, the simulator's motor's thrust is read instead. */
  thrust?: Measure;
  /** Its mass flow, kg/s, and the speed the gas leaves at, m/s, where known: for the reader, nothing draws by them. */
  flow?: Measure;
  speed?: Measure;
  /** The pressure the gas leaves at, Pa: the jet opens by it against the air's, as an engine's fire does (plume.ts `plumeShape`). */
  exit: Measure;
  when: JetWhen;
}

/** When a jet blows, by the flight's plan (sim/plan.ts). */
export type JetWhen =
  /** While the plan's engine of this id burns, as hard as it does (a turbine's exhaust while its engine runs). */
  | { with: string }
  /** From when the plan's shed body `shed` (`ShedBody.on`) leaves, as long and as hard as the simulator flies its motor `motor` (sim/shed.ts). */
  | { shed: string; motor: string }
  /**
   * As an engine of its own: while the plan's engine of this id burns on the run on show, read off the flight's fire that
   * names it. With no run that fires it (a flight with no plan), it is drawn in the gallery while its part is chosen,
   * burning as rated in no air, so the way it fires can be seen.
   */
  | { engine: string };

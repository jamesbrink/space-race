import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { MeshBVH } from 'three-mesh-bvh';
import { sameTarget, type Target, type Workings } from '../actions';
import type { Action, Flight as FlightData, ModelDef } from '../types';
import type { Clock } from '../world/clock.ts';
import { sliderAt, timeAt } from '../world/sequence.ts';
import { Ascent, type Run } from './ascent';
import { GROUND_Y, type Setting, Settings, unhurried } from './backdrops';
import { bulkOf } from './bulk';
import { Cabin, type CabinThing } from './cabin';
import { Cameras, type RigId, type Scene } from './camera/index.ts';
import type { Craft } from './camera/rig.ts';
import { Carry } from './carry';
import { Chute } from './chute';
import { CloudPass } from './clouds';
import { Vehicle } from './drive';
import type { Effects } from './effects';
import { ExhaustPass } from './exhaust';
import { type Fn, functionsOf, refusal, scriptedAt, sliderFor } from './explode';
import { jointKey, pose, reach, rungs, seatFit, sitAt, step } from './gait';
import { Jets } from './jets';
import { Bloom } from './bloom';
import { Lamps } from './lamps';
import { LOD_ABOVE, lodUrl, Scenery, Staged } from './lod';
import { InkPass, type Look, Looks } from './look';
import { Origin } from './origin';
import { Outline } from './outline';
import { Panes } from './panes';
import { through, triangles } from './pick';
import { Plume } from './plume';
import { Quality } from './quality';
import { type Collide, Ragdoll, type Tumbler } from './ragdoll';
import { ShadowCache } from './shadowcache';
import { depthBias, FarShadow } from './shadows';
import { wearTexture } from './space';
import { grain, mark } from './surface';
import { TRAIL_STEP, Trail } from './trail';
import { EYE_FRACTION, type Hit, Walker } from './walk';
import { Works } from './works';

/** Materials (by the name Blender gave them) that get the wear map. */
const WORN =
  /^(shingle|heatsink|aluminium|titanium|tower|steel|strap|paint-booster|paint-structure|paint-cabin|couch|concrete|suit|galvanised)/;
/** Materials that also take it as a bump map: cloth and poured concrete are never flat. */
const ROUGH_SURFACE = /^(suit|concrete)/;

/**
 * Window glass. Mostly you look through it; what you see of the pane itself is the sky in it,
 * strongest at a glancing angle. Models name a material `glass` and put the real thing behind it:
 * a room, or a dark `window-void` standing in for an unlit interior.
 */
const GLASS = new THREE.MeshPhysicalMaterial({
  name: 'glass',
  // nearly black, nearly clear: a pane has almost no colour of its own, only what it reflects
  color: 0x0c1418,
  transparent: true,
  opacity: 0.16,
  roughness: 0.02,
  metalness: 0,
  ior: 1.52,
  specularIntensity: 1,
  clearcoat: 1,
  clearcoatRoughness: 0.02,
  envMapIntensity: 1.6,
  side: THREE.DoubleSide,
  depthWrite: false,
});

/** A helmet visor: the same pane, but the face behind it is in the helmet's shade and the sky is on the glass. */
const VISOR = GLASS.clone();
VISOR.name = 'glass-visor';
VISOR.opacity = 0.5;
/** A lens (`glass-lens`): thick glass over a dark barrel. Less of it is seen through and more of the sky is on it, and it is not a window to go and look in at. */
const LENS = GLASS.clone();
LENS.name = 'glass-lens';
LENS.opacity = 0.34;
LENS.envMapIntensity = 2.4;

const UP = new THREE.Vector3(0, 1, 0);
const ONE = new THREE.Vector3(1, 1, 1);
/** How far off something a vehicle has shed is still drawn, m: an 18 m booster is half a pixel at this distance. It is flown on beyond it (sim/shed.ts). */
const SHED_SIGHT = 40_000;
/** How long a vehicle's door is given to swing before the figure gets in or out through it, seconds. */
const DOOR_SECONDS = 1.05;
const DOWN = new THREE.Vector3(0, -1, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const spin = new THREE.Quaternion();
/** While walking: half the width of ground the shadow map covers round the walker, metres (a texel is then a little over a centimetre). */
const WALK_SHADOW = 26;
/** The nearest the orbiting camera's near plane ever comes, metres (the eye itself stops 5 cm short of a surface: camera/maths.ts NEAREST). */
const NEAR_LEAST = 0.03;
/** Seconds the near plane takes to go most of the way out to where it may stand (`fitDepth`); it comes in at once. */
const NEAR_EASE = 0.25;
/** Metres: taller than anything that grows at a site (flora.ts: the tallest palm), for a near plane fitted from well above it. */
const CANOPY = 30;
/** Metres from where a parachute is made fast within which all of it is (the main's lines and canopy, with room). */
const CHUTE_REACH = 60;
/** How much the exposure opens up in a room by day (as a share added), and over how many seconds; how far the rays that ask whether the eye is in one go, metres. */
/** The exposure the eye settles on in a room: 2.1 times the sunlit ground's 0.8 (daysky.ts: DAY_EXPOSURE). */
const INDOORS_EXPOSURE = 1.68;
const INDOORS_SECONDS = 0.9;
const INDOORS_REACH = 12;
const ENCLOSING = [
  [0, 1, 0],
  [1, 0, 0],
  [-1, 0, 0],
  [0, 0, 1],
  [0, 0, -1],
  [1, 1, 0],
  [-1, 1, 0],
  [0, 1, 1],
  [0, 1, -1],
].map(([x, y, z]) => new THREE.Vector3(x, y, z).normalize());
/** Texels along a side of the Sun's shadow map, as the orbiting views use it. */
const SHADOW_MAP = 4096;
/** Triangles a millisecond at which a geometry's hierarchy is taken to be made, when deciding whether one fits in the time to spare (`growTrees`): half what is measured. */
const TREE_RATE = 1000;
/** After the clock has been put somewhere, the hardware plays the last stretch before that instant (seconds of the sequence) at this many times life. */
const CATCH_UP_NEAR = 20;
const CATCH_UP_PACE = 4;
/** The most of a scenery object that is framed at once, metres across: beyond this a click looks at where it landed. */
const PLACE = 60;
/** How much stronger the sky's fill light is in the cel look. */
const CEL_FILL = 4.5;

/** What a pointer is on: a part of the model on show, or another model standing beside it. */
interface Picked {
  node: string | null;
  model: string | null;
  /** Something in the place round the pad (Flight.surroundings): what it is called, and the part of it to go and look at. */
  place?: { name: string; box: THREE.Box3; title?: string; about?: string };
  /** The object itself, if the model names it for people (custom properties `label`, `about`): one searchlight, not all the ground equipment. */
  thing?: Thing;
  /** A window of the section's model: where on the pane, and which way the pane faces. */
  pane?: { point: THREE.Vector3; normal: THREE.Vector3 };
}
const NOTHING: Picked = { node: null, model: null };

/** An object a model names for people: what it is, a sentence about it, and the node itself. */
/** One model on its way in (Stage.load): how much of it has arrived, in bytes where the fetch says how big it is (total 0 until it does). */
export interface LoadPart {
  label: string;
  fraction: number;
  loaded: number;
  total: number;
}
/** What Stage.warm is doing: the place round the pad and the coarser levels arriving, the clouds made, the shaders built, a few frames to settle. */
export type WarmStep = 'place' | 'clouds' | 'shaders' | 'settle';

export interface Thing {
  label: string;
  about: string | null;
  object: THREE.Object3D;
}

/** A click on board that was on nothing. */
const NO_THING: CabinThing = { label: '', about: null, object: new THREE.Object3D() };

/** The nearest object at or above `o` that the model names (a `label`, or a vehicle's `vehicle`). */
export function thingOf(o: THREE.Object3D): Thing | undefined {
  for (let at: THREE.Object3D | null = o; at; at = at.parent) {
    const label = (at.userData.label ?? at.userData.vehicle) as unknown;
    if (typeof label === 'string' && label) {
      const about = at.userData.about;
      return { label, about: typeof about === 'string' ? about : null, object: at };
    }
  }
  return undefined;
}

/** Whether `inner` is `outer` or somewhere under it. */
function contains(outer: THREE.Object3D, inner: THREE.Object3D | null): boolean {
  for (let o = inner; o; o = o.parent) if (o === outer) return true;
  return false;
}

/** Put every part of a model back where it was built. */
function rest(object: THREE.Object3D): void {
  object.traverse((o) => o.userData.home && o.position.copy(o.userData.home as THREE.Vector3));
}

/**
 * The 3D half of the app: one scene holding all of a flight's models, in its setting. One of
 * them is the section being studied: its parts can be picked, cut open and taken apart. Moving
 * between sections is a flight of the camera, never a change of scene.
 */
export class Stage {
  /** The instant everything is shown at: the setting's sky and light follow it. Stopped, it costs nothing. */
  clock: Clock | null = null;
  /**
   * The instant the hardware is shown at. A model with a `sequence` stands where its sequence has
   * it then. It is the clock's instant while the clock runs; after a jump (a scrub, a section
   * chosen) it catches the clock up over a second or two, so a structure rolls back and a truck
   * drives off instead of vanishing.
   */
  private shownT = 0;
  /** The clock moved hardware this frame: something operated by hand gives way to the script. */
  scripted = false;
  onHover: (node: string | null) => void = () => {};
  onSelect: (node: string | null) => void = () => {};
  onInteract: () => void = () => {};
  /** A model standing beside the one on show was clicked: the caller opens it. */
  onModel: (id: string) => void = () => {};
  onHoverModel: (id: string | null) => void = () => {};
  /** The pointer is over something in the place round the pad (its node's name), or has left it. A click goes over to it. */
  onHoverPlace: (name: string | null, title?: string, about?: string) => void = () => {};
  /** The pointer is over a named object inside a part (a searchlight among the ground equipment), or has left it. */
  onHoverThing: (thing: Thing | null) => void = () => {};
  /** A named object was clicked: say what it is. */
  onThing: (thing: Thing | null) => void = () => {};
  private hoveredThing: THREE.Object3D | null = null;
  /** The camera has been sent to something in the place round the pad. */
  onVisit: () => void = () => {};
  /** The pointer is over a window of the section's model (a click looks in), or has left it. */
  onHoverWindow: (over: boolean) => void = () => {};
  /** A right click on something: where on the page, where in the world, and whether it can be stood on. */
  onSpot: (page: { x: number; y: number }, point: THREE.Vector3, floor: boolean) => void = () => {};
  /** The reset key (0): back to where the section starts. */
  onHome: () => void = () => {};
  /**
   * Walking on foot as one of the flight's figures (a model with a `walker`) is starting (called
   * before anything changes, so the caller can open that model's section first) or has ended
   * (the caller sends the camera somewhere).
   */
  onWalk: (on: boolean, model: string) => void = () => {};
  /** While walking: what is being looked at from within arm's reach has changed (null: nothing that is anything). */
  onWalkTarget: (target: Target | null) => void = () => {};
  /** While walking: the act key, or a finger held on the view. The caller offers what can be done with the target. */
  onWalkAct: () => void = () => {};
  /** While walking: the view was changed between the figure's eyes and over its shoulder. */
  onWalkView: (third: boolean) => void = () => {};
  /** While walking, the view has gone from through the eyes to outside the figure, or back (over the shoulder, down after a fall, at the wheel's chase view). */
  onWalkEyes: (through: boolean) => void = () => {};
  private throughEyes: boolean | null = null;
  /** While walking: the mouse has been captured for looking round, or let go. */
  onWalkLook: (captured: boolean) => void = () => {};
  /** First-person walking (walk.ts). While it is active the orbiting camera's rules are all suspended. */
  readonly walk: Walker;
  /** The last tap, and the figure that can be walked as that it landed on, for telling a double tap on one. */
  private tap: { t: number; x: number; y: number; walker: string | null } = { t: 0, x: 0, y: 0, walker: null };
  /** Which model is being walked as: an index into `staged`, or -1. */
  private walked = -1;
  /**
   * Functions being worked by hand (explode.ts: Fn), by `<model index>/<function id>`: how far
   * along its travel each has been put (0 to 1), and how fast it is moving (in travels a second
   * times its pace: it eases to a stop). The slider is the script; these hold until the script
   * next moves the hardware, then ease back to it.
   */
  private readonly handset = new Map<
    string,
    { at: number; fn: Fn; v: number; pace: number; push: number; back?: boolean; lever?: number }
  >();
  /** A model's parts that have been driven by hand (a truck that drives itself off in the script, driven instead): the slider leaves them be until the script next moves it. */
  private readonly driven = new Map<string, { at: number; node: string }>();
  /** For a vehicle driven by hand, its named pieces paired with the same pieces in its model's other levels of detail, which are put as it is. */
  private readonly twins = new WeakMap<THREE.Object3D, [THREE.Object3D, THREE.Object3D][]>();
  /** Levers found by name in each level of detail (swingLever). */
  private readonly levers = new WeakMap<THREE.Object3D, Map<string, THREE.Object3D | null>>();
  private readonly fns = new WeakMap<object, Fn[]>();
  /** The lifts a model marks under each of its top-level nodes, found once (markedOn). */
  private readonly lifts = new WeakMap<THREE.Object3D, Action[]>();
  /** What each level of detail of a figure carries when it is walked as (carry.ts), made the first time. */
  private readonly carries = new WeakMap<THREE.Object3D, Carry[]>();
  /** The doors and lifts of the flight's models, as they stand (works.ts). */
  private readonly works = new Works();
  private walkDt = 0;
  private carriedLevel: THREE.Object3D | null = null;
  private readonly below = new THREE.Vector3();
  /** While walking: the figure is drawn into the shadow map only (the view is through its eyes). */
  private unseen = false;
  /** While walking: what is being looked at from within reach, and where the ray met it. */
  private aim: { target: Target; hit: Hit; box?: THREE.Box3; vehicle?: THREE.Object3D } | null = null;
  /** A figure knocked off its feet by a long fall, tumbling (ragdoll.ts) until it lies still; and each level of detail's ragdoll, made once. */
  private tumble: Tumbler | null = null;
  private readonly dolls = new WeakMap<THREE.Object3D, Ragdoll | null>();
  /** The vehicle the walker is at the wheel of (drive.ts), and every vehicle that has been driven, by its node. */
  private wheel: Vehicle | null = null;
  /** Getting into or out of a vehicle through its door: which, which way, and how long the door has been swinging. */
  private boarding: { vehicle: Vehicle; out: boolean; t: number; door: ReturnType<Stage['doorOf']> } | null = null;
  private readonly vehicles = new WeakMap<THREE.Object3D, Vehicle>();
  /** The orbiting camera's lens, vertical degrees. Views are framed for it even while the walker's wider one is easing in or out. */
  private readonly lens = 35;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(35, 1, 0.05, 9000);
  /** The camera: every rig, and the hands on the page (camera/index.ts). Nothing else moves the view when nobody is being walked as. */
  readonly cam: Cameras;
  /** The rig in charge of the camera has changed (the hands, the page, or the vehicle leaving the pad). */
  onRig: (id: RigId) => void = () => {};
  private readonly composer: EffectComposer;
  /** The buffer the scene is drawn into: multisampled, with the frame's depth. */
  private readonly frameTarget: THREE.WebGLRenderTarget;
  /** The cumulus, marched through and laid over the frame (clouds.ts). */
  private readonly clouds: CloudPass;
  /** Draws the scene from the eye (origin.ts): the GPU sees only eye-relative positions; everything the code reads stays where it is. */
  readonly origin: Origin;
  private readonly backdropPass: RenderPass;
  private readonly outline: Outline;
  private readonly settings: Settings;
  private readonly sun = new THREE.DirectionalLight(0xffffff, 4);
  /** The Sun's shadow maps, by their size in texels a side (`shadowGrain`). */
  private readonly shadowMaps = new Map<number, THREE.WebGLRenderTarget>();
  private readonly fill = new THREE.HemisphereLight(0, 0, 0.5);
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly timer = new THREE.Timer();
  private readonly loader = new GLTFLoader();
  private readonly loaded = new Map<string, Promise<THREE.Object3D>>();
  private readonly wear = wearTexture();
  /** Which way everything is drawn, real or cel (look.ts), and the cel look's ink line. */
  private readonly looks = new Looks();
  /** Every pane of glass, each drawn as two meshes so that three need not look its material up again twice a frame (panes.ts). */
  readonly glazing: Panes;
  private shadowsOwed = false;
  /** What is still on its way after `load` returns: coarser levels of detail, the place round the pad. */
  private arriving: Promise<unknown>[] = [];
  /** The floodlights the models carry: lit when the Sun is down. */
  private lamps = new Lamps();
  /** The flight off the pad (ascent.ts), and what has been done to the model that flies: the clock's instant it was put at, the nodes it has shed, how far it moved this frame. */
  private ascent: Ascent | null = null;
  private flightData: FlightData | null = null;
  /** The flight is being flown by hand: the keys that steer it are not the camera's. */
  piloted = false;
  /** The inside of the model that has one (`ModelDef.cabin`): its instruments, lamps, controls and periscope (cabin.ts). */
  cabin: Cabin | null = null;
  /** On board, a control in the cabin was worked (`does`: a flight deck command), or something to look out through was chosen. */
  onCabin: (thing: CabinThing) => void = () => {};
  /**
   * What is drawn without depth and may stand in front of cloud: the engine's fire, its trail and
   * every pane of glass. The clouds pass draws them again on their own so cloud behind them shows
   * through by as much as they let through (clouds.ts `veils`).
   */
  private readonly veils: THREE.Object3D[] = [];
  /**
   * What the flight's air does that is seen and felt (effects.ts), given by the page: `lift` shows it at the clock's
   * instant, and `shaker` moves the camera for one draw and returns how to put it back, so nothing but the draw sees it.
   */
  effects: Effects | null = null;
  shaker: ((camera: THREE.PerspectiveCamera, sky: THREE.Camera) => (() => void) | null) | null = null;
  /** The flown vehicle's engine fire, hung at its nozzle's exit (plume.ts). */
  private plume: Plume | null = null;
  /** The trail it leaves in the air while the engine burns (trail.ts), in the scene's frame. */
  private trail: Trail | null = null;
  private readonly lifted = {
    t: Number.NaN,
    flying: false,
    shed: '',
    shrank: false,
    /** Whether its shadow could fall inside the shadow map when last put somewhere. */
    shadowed: false,
    hidden: [] as THREE.Object3D[],
    by: new THREE.Vector3(),
  };
  /**
   * What the flown vehicle has shed and is still seen falling away (ascent.ts `shed`): each node
   * taken out of the model's full level into a holder that stands where its parent would be, so it
   * keeps its own place and turn under it; `rel` is that parent in the model's frame.
   */
  private readonly debris: { node: THREE.Object3D; parent: THREE.Object3D; drop: number; holder: THREE.Group; rel: THREE.Matrix4 }[] = [];
  private readonly ink = new InkPass();
  /** The glow (bloom.ts): strength, radius and threshold as three's pass had them. */
  readonly bloom = new Bloom(0.14, 0.6, 2.4);
  private bloomWas: UnrealBloomPass | null = null;

  /**
   * The glow the old way, for measuring the new against it (`?plain` sets it): three's own pass, at the drawing
   * buffer's size with its blurs in texels, blended over the multisampled frame. Made the first time it is asked for.
   */
  get bloomOld(): boolean {
    return this.bloomWas?.enabled ?? false;
  }
  set bloomOld(on: boolean) {
    if (on && !this.bloomWas) {
      this.bloomWas = new UnrealBloomPass(new THREE.Vector2(1, 1), this.bloom.strength, this.bloom.radius, this.bloom.threshold);
      this.composer.insertPass(this.bloomWas, this.composer.passes.indexOf(this.bloom));
      const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
      this.bloomWas.setSize(size.x, size.y);
    }
    if (this.bloomWas) this.bloomWas.enabled = on;
    this.bloom.enabled = !on;
    this.dirty = true;
  }

  private setting: Setting;
  private root: THREE.Group | null = null;
  /** The place round the pad (Flight.surroundings): scenery, outside `root`, so it is never measured, picked or framed. */
  private surroundings: THREE.Object3D | null = null;
  /** Its levels of detail, chosen building by building (lod.ts): `surroundings` is its level 0. */
  private scenery: Scenery | null = null;
  /** The Sun's second shadow map: everything that stands at the place, coarsely (shadows.ts). */
  private readonly far: FarShadow;
  /** On foot, the fine map's still casters kept from one frame to the next, and only the figure drawn again (shadowcache.ts). */
  /** The net under the frame rate: the drawing's resolution, lowered only while the machine cannot keep up (quality.ts). */
  readonly quality = new Quality();
  /** Frames drawn one after another, and the share of full resolution the canvas is at now. */
  private run = 0;
  private pixelScale = 1;
  private frameAt = 0;
  /** What the stars were last sized for: a pixel ratio, in a sky (their points are sized in the drawing's pixels). */
  private starsFor: { ratio: number; sky: THREE.Scene | null } = { ratio: 0, sky: null };
  readonly shadowCache: ShadowCache;
  /** When the last walk ended (`performance.now()`), until the maps it used have been let go; 0: nothing is owed. */
  private walkEnded = 0;
  /** Every model of the flight, in the flight's order, each with its levels of detail. */
  private staged: Staged[] = [];
  private defs: ModelDef[] = [];
  /** Which of them is the section being studied. */
  private current = 0;
  /** How far apart each model is taken (0 to 1), and how far it is being moved to. */
  private apart: number[] = [];
  private apartGoal: number[] = [];
  /** Where each model's own slider was left: what it returns to when it is the section again. */
  private apartOwn: number[] = [];
  private hoveredModel: string | null = null;
  private hoveredPlace: string | null = null;
  private overPane = false;
  private parts = new Map<string, THREE.Object3D>();
  private hovered: string | null = null;
  private selected: string | null = null;
  private pointerDirty = false;
  /** A press in progress: where it began and what was under it then. */
  private down: ({ x: number; y: number } & Picked) | null = null;
  /** What the camera was last sent to look at; cleared when the user moves it. */
  private following: { view?: string; part?: string } | null = null;
  /** Called when the framing stops being a named view (the user orbited, or a part was chosen). */
  onView: (id: string | null) => void = () => {};
  private centreY = 0;
  /** The cutaway: a quarter of every shell removed, the quarter facing the default camera. */
  private readonly cutPlanes = [new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)];
  /** Per model file: each shell material's own clipped copy. Only the section's own model is ever cut. */
  private readonly shellMaterials = new Map<string, Map<THREE.Material, THREE.Material>>();
  private cut = false;
  private readonly bounds = new THREE.Sphere();
  /** Something on show has changed and the next frame must be drawn. */
  private dirty = true;
  /**
   * Nothing is drawn yet: the page is opening, under its curtain. A draw that needs a shader which is not built
   * waits for it there and then, on the main thread, one shader at a time; with models arriving that was most of
   * the time the page stood blocked. Held until `warm` has had them all built at once, off the main thread.
   */
  private held = true;
  /** `?plain` in the address: everything the old way, for measuring the new against it (tools/bench.mjs). */
  private readonly plain: boolean;
  private sinceDrawn = 0;
  private frames = 0;
  private drawn = 0;
  private work = 0;
  private statsAt = performance.now();
  private readonly lastView = new THREE.Matrix4();
  private readonly lastProjection = new THREE.Matrix4();
  /** How much of the bottom of the canvas the controls cover, 0 to 1: views are framed above it. */
  private inset = 0.26;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // nothing that casts a shadow moves by itself: the map is redrawn when something is changed
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.localClippingEnabled = true;
    this.renderer.info.autoReset = false; // counted per frame drawn, across every pass (stats())
    this.glazing = new Panes(this.renderer, (mesh, real) => this.looks.give(mesh, real));
    // (`?plain` in the address draws the old way, for measuring one against the other: tools/bench.mjs)
    const query = new URLSearchParams(location.search);
    this.plain = query.has('plain');
    if (this.plain) this.glazing.enabled = this.held = false;

    // models are Draco-compressed; the decoder is served from public/draco (the WebAssembly build, run in up to four
    // workers), and is fetched now, beside the first model, not after it has arrived
    this.loader.setDRACOLoader(new DRACOLoader().setDecoderPath(`${import.meta.env.BASE_URL}draco/`).preload());
    this.settings = new Settings(this.renderer);
    this.setting = this.settings.get('orbit');

    this.sun.castShadow = true;
    this.shadowGrain(SHADOW_MAP, 1);
    this.sun.shadow.bias = -0.0002;
    this.sun.shadow.normalBias = 0.012;
    this.scene.add(this.sun, this.sun.target, this.fill);
    // the whole place has shadows, under the fine map (shadows.ts): its light comes after the Sun and gives none
    this.far = new FarShadow(this.renderer, this.sun, () => this.shadowed());
    this.scene.add(this.far.light, this.far.light.target, this.far.sky, this.far.sky.target);
    // (not while he is limp, driving or getting in: what moves then is more than the figure where it stands)
    this.shadowCache = new ShadowCache(
      this.renderer,
      this.sun,
      () =>
        this.far.waiting ||
        this.far.light.shadow.needsUpdate ||
        this.far.sky.shadow.needsUpdate ||
        this.tumble !== null ||
        this.wheel !== null ||
        this.boarding !== null,
      () => this.far.nearOnly(),
    );
    if (this.plain) this.shadowCache.enabled = false;

    // Taking hold of the view (a drag, moving or turning it by key) stops the drift round it and lets go of whatever
    // it was framed on. Zooming lets go of the framing but leaves it turning; a tilt changes neither.
    this.cam = new Cameras(
      this.camera,
      canvas,
      this.world(),
      {
        taken: (how) => {
          if (how === 'tilt') return;
          if (this.following) {
            // what it was framed on is still watched: the hands' distance and direction are kept, and the subject is kept in frame (keepWatched)
            this.watched = { ...this.following, seen: true, stale: true };
            this.following = null;
            this.onView(null);
          } else if (this.watched) this.watched.stale = true;
          if (how === 'move') this.onInteract();
        },
        home: () => this.onHome(),
        rig: (id) => this.rigChanged(id),
      },
      this.lens,
    );

    // Multisampled HDR target: trusses are all thin bright lines against a plain background.
    // The depth texture is explicit: left to its default the target gets 16 bits of depth, which
    // cannot tell concrete from the ground 6 cm under it across the pad. 24 bits can.
    const target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: 4,
      depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedIntType),
    });
    this.composer = new EffectComposer(this.renderer, target);
    // The composer's other buffer is a copy of that one: multisampled, with its own depth. Only the ink pass ever
    // draws into it (one quad, in the cel look), after which the two changed places, so the scene was drawn into
    // each in turn and both had to be whole. It is a plain texture here, and the two are put back after each frame
    // (`step`): the scene is always drawn into `target`, and a second multisampled frame with its depth is never made.
    this.frameTarget = target;
    this.composer.renderTarget2.dispose();
    this.composer.renderTarget2 = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
    this.composer.readBuffer = target;
    this.composer.writeBuffer = this.composer.renderTarget2;
    this.backdropPass = new RenderPass(this.setting.backdrop.scene, this.setting.backdrop.camera);
    this.composer.addPass(this.backdropPass);
    const main = new RenderPass(this.scene, this.camera);
    main.clear = false;
    main.clearDepth = true;
    this.composer.addPass(main);
    this.clouds = new CloudPass(this.scene, this.camera);
    this.clouds.veils = this.veils; // (read live: panes arrive as each level of detail does)
    this.composer.addPass(this.clouds.mark); // the scene's depth, for the clouds laid over after the ink
    this.ink.enabled = false; // straight after the scene, while the frame's depth is still the scene's
    this.composer.addPass(this.ink);
    this.composer.addPass(new ExhaustPass(this.scene, this.camera, this.clouds)); // the engine's fire and its smoke, marched (exhaust.ts): over the ink, under the clouds and the bloom
    this.composer.addPass(this.clouds);
    // (the frame's depth says where a part is hidden; glass and what the cutaway has opened are not in it)
    this.outline = new Outline(
      this.scene,
      this.camera,
      () => this.clouds.mark.texture,
      () => this.screens(),
    );
    this.outline.edgeStrength = 3;
    this.outline.edgeThickness = 1;
    this.outline.edgeGlow = 0.4;
    this.outline.visibleEdgeColor.set(0xffc46b);
    this.outline.hiddenEdgeColor.set(0x9a7434); // dimmer than the visible edge, but still an outline
    this.composer.addPass(this.outline);
    this.composer.addPass(this.bloom);
    const output = new OutputPass();
    this.clouds.adopt(output); // (the clouds are laid over the frame as it goes to the screen)
    this.bloom.adopt(output); // (and the glow added under them, in the same pass)
    if (this.plain) this.bloomOld = true;
    this.composer.addPass(output);
    this.origin = new Origin(this.renderer, this.scene, this.camera, this.cutPlanes, [this.sun, this.far.light, this.far.sky, this.fill]); // (the only light with a shadow, the only sky light)
    this.applySetting();

    // A tap sends no pointermove first, so every handler that picks reads the pointer itself.
    const aim = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    canvas.addEventListener('pointermove', (e) => {
      aim(e);
      this.pointerDirty = e.pointerType === 'mouse'; // a finger has no hover
    });
    canvas.addEventListener('pointerleave', () => this.setHover(NOTHING));
    // The pick is made when the press starts: by the time it ends the page may have been laid
    // out again (a phone's sheet closes on the press) and the same point is a different part.
    // A right click (not a right drag, which moves the view) asks what can be done at that spot.
    let asked: { x: number; y: number } | null = null;
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      asked = e.button === 2 && !this.walk.active ? { x: e.clientX, y: e.clientY } : null;
    });
    canvas.addEventListener('pointerup', (e) => {
      const from = asked;
      asked = null;
      if (e.button !== 2 || !from || Math.hypot(e.clientX - from.x, e.clientY - from.y) >= 5) return;
      aim(e);
      const spot = this.spot();
      if (spot) this.onSpot({ x: e.clientX, y: e.clientY }, spot.point, spot.floor);
    });
    canvas.addEventListener('pointerdown', (e) => {
      if (this.walk.active) return; // on foot there is nothing to pick: a drag looks round
      if (e.button !== 0) return; // right and middle buttons pan and zoom; they select nothing
      aim(e);
      this.down = { x: e.clientX, y: e.clientY, ...this.pick() };
    });
    canvas.addEventListener('pointerup', (e) => {
      const down = this.down;
      this.down = null;
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) >= 5) return;
      // a second tap straight after one on a figure that can be walked as: walk as it (the first has already been acted on)
      const last = this.tap;
      const again = last.walker && e.timeStamp - last.t < 400 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 30;
      // the figure is another model standing by, or the section's own model (any part of it)
      const on = down.model ? this.defs.find((m) => m.id === down.model) : down.node !== null ? this.def : null;
      this.tap = { t: e.timeStamp, x: e.clientX, y: e.clientY, walker: on?.walker ? on.id : null };
      if (again) return void this.enterWalk(last.walker!);
      // on board nothing is selected or flown to: a click works what is clicked, or looks out through it, or lets go of that
      if (this.cam.rig === 'onboard')
        return void this.onCabin(
          down.pane
            ? { label: '', about: null, object: this.scene, lookout: 'pane', ...down.pane }
            : ((down.thing as CabinThing) ?? NO_THING),
        );
      if (down.pane) this.lookIn(down.pane.point, down.pane.normal);
      else if (down.place) this.visit(down.place.box);
      else if (down.model && !down.node) this.onModel(down.model);
      else {
        this.onSelect(down.node);
        this.onThing(down.thing ?? null);
      }
    });
    canvas.addEventListener('pointercancel', () => (this.down = null));
    // the pixel ratio changes when the window moves to another display or the page is zoomed
    const watchRatio = () => {
      matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener('change', watchRatio, { once: true });
      this.resize();
    };
    watchRatio();

    this.walk = new Walker(canvas, this.camera, {
      solids: () => this.solidRoots(),
      // a setting's floor is one level plane: its height is asked for, not its triangles
      ground: () => this.setting.floor?.position.y ?? null,
      groundAt: (x, z) => this.groundAt(x, z),
      plantsOut: (at, margin) => this.setting.plantsOut?.(at, margin) ?? 0,
      reach: () => Math.max(this.bounds.radius, this.setting.reach ?? 0),
      leave: () => this.exitWalk(),
      act: () => this.onWalkAct(),
      viewed: (third) => this.onWalkView(third),
      locked: (on) => this.onWalkLook(on),
    });

    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  private get def(): ModelDef | null {
    return this.defs[this.current] ?? null;
  }

  /** The section's own model. */
  private get main(): THREE.Object3D | null {
    return this.staged[this.current]?.group ?? null;
  }

  /** Put all of a flight's models on the stage, each where it stands. Rejects if any cannot be fetched. */
  async load(flight: FlightData, onProgress?: (fraction: number, parts?: LoadPart[]) => void): Promise<void> {
    // The bar is weighted by bytes once every model's size is known (the fetch's Content-Length); until then it is their average.
    const parts: LoadPart[] = flight.models.map((m) => ({ label: m.name, fraction: 0, loaded: 0, total: 0 }));
    const scenes = await Promise.all(
      flight.models.map((m, i) =>
        this.fetch(m.url, (f, loaded = 0, total = 0) => {
          const part = parts[i]!;
          Object.assign(part, { fraction: f, loaded: f === 1 && total === 0 ? part.total : loaded, total: total || part.total });
          const sized = parts.every((p) => p.total > 0);
          const all = sized ? parts.reduce((a, p) => a + p.total, 0) : parts.length;
          onProgress?.(parts.reduce((a, p) => a + (sized ? p.fraction * p.total : p.fraction), 0) / all, parts);
        }),
      ),
    );
    if (this.root) this.scene.remove(this.root);
    if (this.setting.floor) this.scene.remove(this.setting.floor);
    for (const o of this.setting.scenery) this.scene.remove(o);
    if (this.setting.globe) this.scene.remove(this.setting.globe.group);
    this.defs = flight.models;
    this.staged = flight.models.map((def, i) => {
      rest(scenes[i]!);
      const staged = new Staged(scenes[i]!, def.parts);
      staged.group.position.set(...(def.position ?? [0, 0, 0]));
      staged.group.rotation.y = def.rotationY ?? 0;
      const lamps = (def.lights ?? []).map((l) => {
        const lamp = new THREE.PointLight(l.colour, l.intensity, l.reach, 2);
        lamp.position.set(...l.position);
        staged.group.add(lamp);
        return lamp;
      });
      if (def.cabin && flight.site) {
        if (def.cabin.head) this.cam.onboard.limits = { ...def.cabin.head };
        this.cabin?.dispose();
        this.cabin = new Cabin(this.cabinHost(), { ...flight, site: flight.site }, def, staged.group, staged.full, lamps);
      }
      return staged;
    });
    this.apart = this.staged.map(() => 0);
    this.apartGoal = this.staged.map(() => 0);
    this.apartOwn = this.staged.map(() => 0);
    this.root = new THREE.Group();
    this.root.add(...this.staged.map((s) => s.group));
    this.scene.add(this.root);
    this.root.updateMatrixWorld(true);
    for (const s of this.staged) s.measure();
    this.far.refit();
    this.lamps.clear();
    this.ascent = Ascent.of(flight);
    this.lifted.t = Number.NaN;
    this.debris.length = 0; // (their holders were under the last flight's root)
    this.veils.splice(0, this.veils.length, ...this.veils.filter((o) => o.parent)); // (the last flight's are gone with its models)
    this.flightData = flight;
    this.hangPlume(flight);
    this.lamps = new Lamps();
    for (const s of this.staged) this.lamps.add(s.full, this.scene);
    // the coarser levels arrive behind the scenes; a model that has none simply stays as it is
    const staged = this.staged;
    this.arriving = [];
    flight.models.forEach((def, i) => {
      for (let level = 1; level <= (this.fullDetail ? 0 : LOD_ABOVE.length); level++)
        this.arriving.push(
          this.fetch(lodUrl(def.url, level)).then((object) => {
            if (staged !== this.staged) return;
            rest(object);
            staged[i]!.add(level, object);
            this.lamps.glow(object);
            this.dirty = true;
          }),
        );
    });
    // (a flight with no site has no place and no hour: its models stand in a setting that needs neither)
    this.setting = this.settings.get(flight.models[0]!.backdrop, flight.site ? { site: flight.site, launch: flight.launch } : undefined);
    this.applySetting();
    // the place round the pad arrives when it arrives: the flight can be studied without it
    for (const o of this.scenery?.all ?? (this.surroundings ? [this.surroundings] : [])) this.scene.remove(o);
    this.surroundings = null;
    this.scenery = null;
    const place = flight.surroundings;
    if (place)
      this.arriving.push(
        this.fetch(place).then((object) => {
          if (staged !== this.staged) return;
          this.surroundings = object;
          this.far.refit();
          this.scene.add(object);
          const scenery = (this.scenery = new Scenery(object));
          this.lamps.add(object, this.scene); // its floods, and a light in each room where the model hangs one (Light_<room>)
          this.renderer.shadowMap.needsUpdate = true;
          this.dirty = true;
          // its coarser levels, for the buildings that are far off
          for (let level = 1; level <= LOD_ABOVE.length; level++)
            this.arriving.push(
              this.fetch(lodUrl(place, level)).then((coarse) => {
                if (this.scenery !== scenery) return;
                this.scene.add(coarse);
                scenery.add(level, coarse);
                this.lamps.glow(coarse);
                this.renderer.shadowMap.needsUpdate = true;
                this.dirty = true;
              }),
            );
        }),
      );
    for (const p of this.arriving) p.catch((e) => console.warn('a level of detail did not arrive, and is done without:', e));
    this.section(flight.models[0]!.id, true);
  }

  /**
   * Make one model the section being studied and fly to where it starts. The others take the
   * state the section asks for (the pad cleared for launch while the rocket is studied), moving
   * there as they would: the structure rolls back, the truck drives off.
   */
  section(id: string, snap = false, asItStands = false): void {
    const at = this.defs.findIndex((m) => m.id === id);
    if (at < 0) return;
    this.setCutaway(false);
    this.current = at;
    const def = this.defs[at]!;
    const own = this.staged[at]!;
    this.parts = new Map(
      def.parts.flatMap((p) => {
        const o = own.full.getObjectByName(p.node);
        return o ? [[p.node, o] as const] : [];
      }),
    );
    this.defs.forEach((other, i) => {
      // its own state is wherever its slider was left; the others take what this section asks of them
      // Going on foot, or coming back from it, leaves every model as it stands: a tower that rolled
      // away as you stepped onto it would be no place to stand.
      // A model on the clock stands where the clock has it. What this section asks of it is an
      // instant, and the clock is put there: unless it is running, which is someone watching time pass.
      const asked = def.with?.find((w) => w.model === other.id);
      if (other.sequence && this.clock) {
        if (asked && 'at' in asked && !asItStands && !this.clock.running) this.clock.seek(asked.at);
        if (snap) {
          this.shownT = this.clock.t;
          this.follow(0);
        }
        return;
      }
      if (asItStands) this.apartGoal[i] = this.apart[i]!;
      else this.apartGoal[i] = i === at ? this.apartOwn[i]! : asked && 'exploded' in asked ? asked.exploded : 0;
      if (snap) this.setApart(i, this.apartGoal[i]!);
    });
    this.highlight(null, null);
    this.fitShadows();
    this.view(def.home ?? 'all', snap);
  }

  /** How far apart a model has been taken, 0 to 1: what its slider should read. */
  exploded(id: string): number {
    const at = this.defs.findIndex((m) => m.id === id);
    const sequence = this.defs[at]?.sequence;
    // on the clock, the slider reads the clock's instant, which the hardware may still be catching up
    if (sequence && this.clock) return sliderAt(sequence, this.clock.t);
    return this.apartOwn[at] ?? 0;
  }

  private setApart(i: number, t: number): void {
    this.apart[i] = t;
    this.staged[i]?.explode(t);
    this.lamps.place(); // lamps ride the hardware they are on
    this.dirty = true;
    this.shadowsOwed = true; // drawn again in frame(): at once, or a few times a second in a view nobody is steering
  }

  private fetch(url: string, onProgress?: (fraction: number, loaded?: number, total?: number) => void): Promise<THREE.Object3D> {
    let promise = this.loaded.get(url);
    if (!promise) {
      promise = this.loader
        .loadAsync(import.meta.env.BASE_URL + url, (e) => {
          if (e.total) onProgress?.(e.loaded / e.total, e.loaded, e.total);
        })
        .then((gltf) => {
          this.dress(gltf.scene, url);
          return gltf.scene;
        });
      this.loaded.set(url, promise);
      promise.catch(() => this.loaded.delete(url)); // a failure is not remembered: the next try fetches again
    }
    void promise.then(() => onProgress?.(1));
    return promise;
  }

  /** What Blender's export cannot carry: shadows, anisotropy, and the wear on every surface. */
  private dress(object: THREE.Object3D, url: string): void {
    const anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const seen = new Set<THREE.Material>();
    const clear: THREE.Mesh[] = [];
    object.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = mesh.receiveShadow = true;
      const shell = Boolean(mesh.userData.shell);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat.name.startsWith('glass')) {
        const pane = mat.name.startsWith('glass-visor') ? VISOR : mat.name.startsWith('glass-lens') ? LENS : GLASS;
        mesh.material = shell ? this.shellOf(pane, url) : pane;
        mesh.castShadow = false;
        mesh.renderOrder = 2; // after everything opaque, so what is behind is already drawn
        this.veils.push(mesh); // a cloud behind it is seen through it, tinted as everything else is (clouds.ts)
        if (!shell) clear.push(mesh); // (a shell's material is changed when the cutaway opens: three draws that one its own way)
        return;
      }
      if (!seen.has(mat)) {
        seen.add(mat);
        if (mat.map) mat.map.anisotropy = anisotropy;
        if (WORN.test(mat.name)) {
          mat.roughnessMap = this.wear;
          mat.roughness = Math.min(1, mat.roughness * 1.3);
        }
        if (ROUGH_SURFACE.test(mat.name)) {
          mat.bumpMap = this.wear;
          mat.bumpScale = 0.6;
        }
        grain(mat); // what a large plain surface looks like from a metre away
        // Both faces cast. Three's default is the faces turned from the light, which for a wall or a roof is its inside:
        // the shadow then begins at the very surface a room's walls meet, and light crept in along every joint (a
        // lit line round each ceiling and down each corner). From both, a wall's shadow begins at its outside.
        mat.shadowSide = THREE.DoubleSide;
        // and the sky's light reaches it only where the sky is overhead (shadows.ts: a room is lit by its lamps)
        mat.defines = { ...mat.defines, SKY_OVERHEAD: '' };
      }
      if (shell) mesh.material = this.shellOf(mat, url);
      const marked = mark(mesh); // a scorch or a stain fades out at its rim
      if (marked) {
        mesh.material = marked;
        mesh.castShadow = false;
        mesh.renderOrder = 1;
      }
    });
    for (const pane of clear) this.glazing.add(pane);
    this.looks.add(object);
  }

  /**
   * A shell's own copy of a material: the one the cutaway clips. Internals keep the original,
   * so a tank dome and the pipe inside it can share "aluminium" and only the dome is cut.
   */
  private shellOf(material: THREE.Material, url: string): THREE.Material {
    let shells = this.shellMaterials.get(url);
    if (!shells) this.shellMaterials.set(url, (shells = new Map()));
    let copy = shells.get(material);
    if (!copy) {
      copy = material.clone();
      copy.userData.side = material.side;
      copy.clipIntersection = true; // cut away only where both planes agree: one quadrant
      copy.clipShadows = true; // and let the light in through the opening
      shells.set(material, copy);
    }
    return copy;
  }

  /** Open or close the cutaway. With it open, shells show their inner faces too. */
  setCutaway(on: boolean): void {
    this.cut = on;
    this.cabin?.opened(on);
    this.dirty = true;
    const at = this.main?.position ?? new THREE.Vector3();
    for (const plane of this.cutPlanes) plane.constant = -plane.normal.dot(at);
    // only the section's own model opens (and only its full level has an inside to show)
    for (const [url, shells] of this.shellMaterials) {
      const open = on && url === this.def?.url;
      for (const m of shells.values()) {
        if (Boolean(m.clippingPlanes) === open) continue;
        m.clippingPlanes = open ? this.cutPlanes : null;
        m.side = open ? THREE.DoubleSide : (m.userData.side as THREE.Side);
        m.needsUpdate = true;
        this.looks.sync(m);
      }
    }
    this.renderer.shadowMap.needsUpdate = true; // the light comes in through the opening
  }

  /**
   * The setting has moved to another instant (Setting.at): take up its light again. Shadows are
   * drawn again only if the light has moved far enough to show.
   */
  private relight(shadows: boolean): void {
    const s = this.setting;
    this.scene.environment = s.environment;
    this.scene.environmentIntensity = s.environmentIntensity; // how bright the sky is changes every frame; what it looks like, by bakes
    this.sun.color.set(s.sunColor);
    this.sun.intensity = s.sunIntensity;
    this.fill.intensity = s.fill[2] * (this.looks.current === 'cel' ? CEL_FILL : 1);
    this.expose();
    // the floodlights come on as the direct light fails (the Sun low, or only the Moon)
    this.lamps.set(1 - THREE.MathUtils.smoothstep(s.sunIntensity, 0.25, 1.6), this.renderer.toneMappingExposure);
    if (shadows) {
      if (this.walk.active) this.fitWalkShadows(true);
      else {
        const target = this.sun.target.position;
        const back = this.sun.position.distanceTo(target); // as far up the light's line as it was fitted
        this.sun.position.copy(target).addScaledVector(s.sunDir, back);
      }
      this.renderer.shadowMap.needsUpdate = true;
    }
    this.dirty = true;
  }

  private applySetting(): void {
    const s = this.setting;
    this.backdropPass.scene = s.backdrop.scene;
    this.backdropPass.camera = s.backdrop.camera;
    this.scene.environment = s.environment;
    this.scene.environmentIntensity = s.environmentIntensity;
    this.sun.color.set(s.sunColor);
    this.sun.intensity = s.sunIntensity;
    this.fill.color.set(s.fill[0]);
    this.fill.groundColor.set(s.fill[1]);
    this.light();
    this.expose();
    if (s.floor) this.scene.add(s.floor);
    for (const o of s.scenery) this.scene.add(o);
    for (const o of [s.floor, ...s.scenery]) if (o) this.looks.add(o);
    if (s.globe) {
      this.scene.add(s.globe.group);
      this.looks.add(s.globe.mesh);
    }
    this.scene.fog = s.fog;
    this.renderer.shadowMap.needsUpdate = true;
    this.dirty = true;
  }

  /** Put a rig in charge of the camera (camera/rig.ts: RigId). The view itself does not jump on changing. */
  setCamera(mode: RigId): void {
    this.cam.set(mode);
  }

  /** The rigs there are to choose from as things stand, and the one C goes to next. */
  get cameras(): RigId[] {
    return this.cam.available();
  }

  get nextCamera(): RigId {
    return this.cam.next();
  }

  private rigChanged(id: RigId): void {
    this.following = this.watched = null;
    this.onView(null);
    // on board, what would be in front of the eyes is not drawn (the seat's `hide`)
    const at = this.defs.findIndex((m) => m.id === this.ascent?.model);
    this.showSeatHidden(at, this.defs[at]?.seats?.[0]?.hide, id !== 'onboard');
    this.cabin?.board(id === 'onboard');
    // leaving the vehicle, the shadows go back to the section: fitted to it where the clock has it now (it may just have
    // been put back on its pad, and not yet been moved there by a frame)
    if (id === 'orbit' || id === 'free') {
      this.lift();
      this.fitShadows();
    }
    this.renderer.shadowMap.needsUpdate = true;
    this.dirty = true;
    this.onRig(id);
  }

  /** What the camera may ask of the scene (camera/index.ts: Scene). */
  private world(): Scene {
    const UNDER = (x: number, z: number) => Math.max(0, this.setting.groundAt?.(x, z) ?? GROUND_Y);
    const clearance = (p: THREE.Vector3): number => {
      // Wherever the site's ground is drawn (out to its horizon) there is ground to stay above; beyond it, the globe's
      // sea (the site's level is not the sea's 100 km off); with neither, nothing.
      if (!this.setting.floor) return Infinity;
      if (Math.hypot(p.x, p.z) <= (this.setting.horizon ?? this.setting.reach ?? Infinity)) return p.y - UNDER(p.x, p.z);
      return this.setting.globe?.altitude(p) ?? Infinity;
    };
    return {
      // Up is the plumb line where the subject is: the site's +Y on the site, leaning with the Earth's curve beyond it
      // (by the arc flown: 4.8 degrees at the landing), so the horizon downrange is level. It leans in over the second
      // span of the site's ground beyond its edge, too little at a time to be seen.
      upAt: (p, out) => {
        const globe = this.setting.globe;
        const edge = this.setting.horizon ?? Infinity;
        const lean = globe ? THREE.MathUtils.smoothstep(Math.hypot(p.x, p.z), edge, 2 * edge) : 0;
        return lean > 0
          ? globe!
              .up(p, out)
              .lerp(UP, 1 - lean)
              .normalize()
          : out.copy(UP);
      },
      clearance,
      // on the ground there is a site to go over; anywhere else, only the models
      reach: () => ({ centre: this.bounds.center, radius: Math.max(this.bounds.radius, this.setting.reach ?? 0) }),
      far: () => Math.max(30, 4 * this.bounds.radius, this.setting.horizon ?? this.setting.reach ?? 0),
      maxPolar: () => this.setting.maxPolar,
      minPolar: () => this.setting.minPolar ?? 0,
      craft: () => this.craft(),
      solidAt: (x, y) => {
        this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
        const { origin, direction } = this.raycaster.ray;
        // a ray does not know about the cutaway: skip what has been cut away to reach what is inside
        const gone = (h: THREE.Intersection) =>
          this.cut && h.object.userData.shell && this.cutPlanes.every((c) => c.distanceToPoint(h.point) < 0);
        const roots = [...this.staged.map((s) => s.shown), ...(this.surroundings ? [this.surroundings] : [])];
        const hit = through(this.raycaster, roots, this.pickTree, !this.cut).find((h) => !gone(h));
        // the ground is a height, not a mesh: where the ray comes down onto it
        let ground: THREE.Vector3 | null = null;
        if (this.setting.floor && direction.y < -1e-4) {
          let height = UNDER(origin.x, origin.z);
          const at = new THREE.Vector3();
          for (let i = 0; i < 6; i++) {
            at.copy(origin).addScaledVector(direction, (height - origin.y) / direction.y);
            height = UNDER(at.x, at.z);
          }
          if (origin.y > height && Math.hypot(at.x, at.z) <= (this.setting.horizon ?? this.setting.reach ?? Infinity)) ground = at;
        }
        if (hit && (!ground || hit.distance <= origin.distanceTo(ground))) return { point: hit.point.clone(), ground: false };
        return ground && { point: ground, ground: true };
      },
      free: () => !this.walk.active && !this.asleep,
      piloted: () => this.piloted,
      watching: () => !this.inert && !this.frozen && this.defs[this.current]?.id === this.ascent?.model,
    };
  }

  private cabinHost() {
    return {
      renderer: this.renderer,
      scene: this.scene,
      camera: this.camera,
      draw: (render: () => void) => this.origin.draw(render),
      sky: () => this.setting.backdrop,
      upAt: (p: THREE.Vector3, out: THREE.Vector3) => this.setting.globe?.up(p, out) ?? out.copy(UP),
      redraw: () => {
        this.dirty = true;
      },
      reshade: () => {
        this.renderer.shadowMap.needsUpdate = true;
        this.dirty = true;
      },
    };
  }

  /**
   * From the seat, look out through something (a pane: `point` on it; the periscope's screen), or with null stop and
   * look where the head was. A pane is looked through from the eye, so what is seen is the scene itself beyond the
   * glass; the periscope's screen is brought to fill the view, and asked for again while it does, changes its power.
   */
  lookOut(thing: CabinThing | null): string | null {
    const rig = this.cam.onboard;
    if (this.cam.rig !== 'onboard') return null;
    const screen = thing?.lookout === 'screen' ? this.cabin?.screen : null;
    if (screen) {
      const fields = this.defs.find((m) => m.cabin?.periscope)?.cabin?.periscope?.fields ?? [];
      const again = this.lookingAt === 'screen' && rig.looking;
      const power = again ? (this.cabin?.power() ?? 0) : (this.cabin?.power(0) ?? 0);
      this.lookingAt = 'screen';
      if (this.cabin) this.cabin.watched = true;
      // the screen fills four fifths of the view's height
      // (from the seat's own eye, as the vehicle stands this instant: the camera is where it was a frame ago, kilometres a second behind)
      const seat = this.craft()?.seat;
      const away = screen.point.distanceTo(seat ? new THREE.Vector3().setFromMatrixPosition(seat) : this.camera.position);
      rig.lookAt(screen.point, THREE.MathUtils.radToDeg(2 * Math.atan(screen.radius / away / 0.8)));
      this.dirty = true;
      return fields.length > 1 ? `${power ? 'High' : 'Low'} power · ${fields[power]}\u00b0 · click again to change` : null;
    }
    if (thing?.lookout === 'pane' && thing.point) {
      this.lookingAt = 'pane';
      if (this.cabin) this.cabin.watched = false;
      rig.lookAt(thing.point, 38);
      this.dirty = true;
      return null;
    }
    if (rig.looking) rig.lookAt(null);
    if (this.cabin) this.cabin.watched = false;
    this.lookingAt = null;
    this.dirty = true;
    return null;
  }
  private lookingAt: 'pane' | 'screen' | null = null;
  /** From the seat, something is being looked out through (`lookOut`). */
  get lookingOut(): boolean {
    return this.lookingAt !== null && this.cam.rig === 'onboard' && this.cam.onboard.looking;
  }

  /** The view is from the seat: what is drawn over the scene without depth (the predicted path) would be drawn across the cabin's walls. */
  aboard(): boolean {
    return this.cam.rig === 'onboard' && !this.walk.active;
  }

  /**
   * Whoever sits in the flown model's seat is aboard it, or back outside: the flight's figure of him standing on the
   * pad (`seats[].figure`) is not drawn while he is in the couch. There is one of him.
   */
  crewAboard(on: boolean): void {
    const at = this.defs.findIndex((m) => m.id === this.ascent?.model);
    for (const seat of this.defs[at]?.seats ?? []) {
      const figure = this.staged[this.defs.findIndex((m) => m.id === seat.figure)];
      if (figure && figure.group.visible === on) {
        figure.group.visible = !on;
        this.renderer.shadowMap.needsUpdate = true;
        this.dirty = true;
      }
    }
    this.cabin?.piloted(on);
  }

  /** The flown vehicle as the camera needs it (camera/rig.ts: Craft): its frame, the middle and size of what is left of it, a place to see from inside it. */
  private craft(): Craft | null {
    const s = this.flier;
    if (!s) return null;
    const c = (this.crafted ??= {
      matrix: s.group.matrixWorld,
      centre: new THREE.Vector3(),
      radius: 1,
      shape: 0,
      flying: false,
      seat: null as THREE.Matrix4 | null,
      of: null as Staged | null,
      shed: '',
      level: null as THREE.Object3D | null,
      place: null as THREE.Object3D | null,
    });
    const at = this.defs.findIndex((m) => m.id === this.ascent?.model);
    const seat = this.defs[at]?.seats?.[0];
    if (c.of !== s) c.place = seat ? this.seatNode(at, seat) : null; // (found once: the first place its data gives to see from)
    if (c.of !== s || c.shed !== this.lifted.shed || c.level !== s.shown) {
      // measured when what is left of it changes, not every frame: the box round what is still drawn of it
      c.of = s;
      c.shed = this.lifted.shed;
      c.level = s.shown;
      c.matrix = s.group.matrixWorld;
      const left = new THREE.Box3();
      s.shown.traverseVisible((o) => {
        if ((o as THREE.Mesh).isMesh) left.expandByObject(o);
      });
      if (!left.isEmpty()) {
        const centre = s.group.worldToLocal(left.getCenter(new THREE.Vector3()));
        const radius = left.getSize(new THREE.Vector3()).length() / 2;
        // (a coarser level of the same thing is the same shape: only a real change counts as one)
        if (centre.distanceTo(c.centre) > 0.05 * radius || Math.abs(radius - c.radius) > 0.05 * radius) c.shape++;
        c.centre.copy(centre);
        c.radius = radius;
      }
    }
    c.flying = this.lifted.flying;
    // the eyes, in the seat's frame
    const node = c.place;
    if (node && seat) {
      node.updateWorldMatrix(true, false);
      c.seat = (c.seat ?? new THREE.Matrix4())
        .copy(node.matrixWorld)
        .multiply(new THREE.Matrix4().makeTranslation(...(seat.eye ?? ([0, 0, 0] as const))));
    } else c.seat = null;
    return c;
  }
  private crafted: (Craft & { of: Staged | null; shed: string; level: THREE.Object3D | null; place: THREE.Object3D | null }) | null = null;

  /** While a rig that is about the vehicle is in charge, the Sun's shadow map goes with the vehicle, so it shades itself all the way up. */
  private shadeCraft(): void {
    const c = this.cam.rig === 'orbit' || this.cam.rig === 'free' ? null : this.crafted;
    if (!c) return;
    const by = c.centre.clone().applyMatrix4(c.matrix).sub(this.sun.target.position);
    if (by.lengthSq() < 1e-6) return;
    this.sun.position.add(by);
    this.sun.target.position.add(by);
    this.shadowsOwed = true;
  }

  /**
   * Show a flight being flown by hand (ascent.ts `Run`) in place of the record's, or the record's again (null).
   * The trail starts afresh: the one laid belongs to the flight before.
   */
  flyRun(run: Run | null): void {
    if (!this.ascent) return;
    this.ascent.use(run);
    this.effects?.use(run);
    this.stand();
    if (this.flightData) this.hangPlume(this.flightData);
    this.lifted.t = Number.NaN;
    this.dirty = true;
  }

  /**
   * Stand the flown model on its pad, whole, wherever the run before had it: what it had shed is put back in it and
   * shown. The fire is hung on it as it stands there (`hangPlume` measures the nozzle on the model upright, and finds
   * the engine in the model, not carried off with a booster that has left); `lift` then puts it where the run on show
   * has it at the clock's instant, and does what follows from its having moved.
   */
  private stand(): void {
    const s = this.flier;
    const def = this.defs.find((m) => m.id === this.ascent?.model);
    if (!s || !def) return;
    for (const d of this.debris.splice(0)) {
      d.parent.add(d.node);
      d.holder.removeFromParent();
    }
    for (const o of this.lifted.hidden) o.visible = true;
    this.lifted.hidden = [];
    this.lifted.shed = '';
    s.group.position.set(...(def.position ?? [0, 0, 0]));
    s.group.quaternion.setFromAxisAngle(UP, def.rotationY ?? 0);
    s.group.updateMatrixWorld(true);
    this.shadowsOwed = true;
  }

  /**
   * Something drawn over the flight that is no part of it (the predicted path, path.ts): put in the scene, where
   * cloud behind it shows through it as through the fire. Given again, it has changed: the frame is drawn again.
   */
  overlay(object: THREE.Object3D): void {
    if (object.parent !== this.scene) this.scene.add(object);
    if (!this.veils.includes(object)) this.veils.push(object);
    this.dirty = true;
  }

  /** The model the flight carries off the pad, if there is one. */
  private get flier(): Staged | null {
    const id = this.ascent?.model;
    return this.staged[this.defs.findIndex((m) => m.id === id)] ?? null;
  }

  /**
   * Put the flown vehicle where the simulator has it at the clock's instant (ascent.ts): from
   * liftoff to landing it flies, without what it has shed; before and after it stands on its pad.
   */
  private lift(): void {
    this.lifted.by.set(0, 0, 0);
    const ascent = this.ascent;
    const s = this.flier;
    if (!ascent || !s || !this.clock) return;
    const t = this.clock.t;
    if (t === this.lifted.t) return;
    this.lifted.t = t;
    const def = this.defs.find((m) => m.id === ascent.model)!;
    const g = s.group;
    const before = g.position.clone();
    const pad = new THREE.Quaternion().setFromAxisAngle(UP, def.rotationY ?? 0);
    const flying = ascent.place(t, pad, g.position, g.quaternion);
    if (!flying && !this.lifted.flying) return; // standing on its pad, as it was
    if (!flying) {
      g.position.set(...(def.position ?? [0, 0, 0]));
      g.quaternion.copy(pad);
    }
    const changed = flying !== this.lifted.flying;
    this.lifted.flying = flying;
    const shed = ascent.dropped(t);
    if (shed.join() !== this.lifted.shed) {
      this.lifted.shed = shed.join();
      for (const o of this.lifted.hidden) o.visible = true;
      this.lifted.hidden = [];
      const names = new Set(shed);
      g.traverse((o) => {
        if (names.has(o.name) && o.visible) {
          o.visible = false;
          this.lifted.hidden.push(o);
        }
      });
      this.renderer.shadowMap.needsUpdate = true;
      this.lifted.shrank = flying;
    }
    this.fall(ascent, s, pad, t, flying);
    this.hang(ascent, s, pad, t, flying);
    const { on, vacuum } = ascent.burn(t);
    this.plume?.set(on, vacuum, t, this.renderer.toneMappingExposure); // (its flicker is the clock's: the same instant is the same fire)
    this.layTrail(ascent, pad, t, flying);
    this.effects?.set(t, flying, g, s.full, this.clock.rate, this.renderer.toneMappingExposure, this.setting.sunIntensity, this.veils);
    this.lifted.by.subVectors(g.position, before);
    g.updateMatrixWorld(true);
    s.measure(); // levels of detail are chosen by the distance to it
    if (changed) this.fitBounds(); // (a vehicle in flight is left out of them, so they change only as it leaves and comes back)
    this.dirty = true;
    // its shadow is drawn again only while it can fall inside the shadow map (which goes with it under the chase camera):
    // a rocket long gone from a map fitted to the pad casts nothing there
    const box = this.sun.shadow.camera;
    const within =
      (this.cam.rig !== 'orbit' && this.cam.rig !== 'free') || g.position.distanceTo(this.sun.target.position) < 2 * box.right + 60;
    if (within || this.lifted.shadowed || changed || this.lifted.shrank) this.shadowsOwed = true;
    this.lifted.shrank = false;
    this.lifted.shadowed = within;
  }

  /**
   * Carry what the vehicle has shed away from it: the tower on its own rocket, the booster and
   * the retropack falling behind (ascent.ts `shed`), instead of their vanishing. Each is the full
   * level's own node, moved into a holder in the scene while it falls and put back when the clock
   * goes back before it left or the flight is over.
   */
  private fall(ascent: Ascent, s: Staged, pad: THREE.Quaternion, t: number, flying: boolean): void {
    const gone = (i: number) => flying && t >= ascent.drops[i]!.at;
    for (let k = this.debris.length - 1; k >= 0; k--) {
      const d = this.debris[k]!;
      if (gone(d.drop)) continue;
      d.parent.add(d.node);
      d.holder.removeFromParent();
      this.debris.splice(k, 1);
    }
    s.group.updateMatrixWorld(true);
    const into = new THREE.Matrix4().copy(s.group.matrixWorld).invert();
    ascent.drops.forEach((drop, i) => {
      if (!gone(i) || this.debris.some((d) => d.drop === i)) return;
      for (const name of drop.nodes) {
        const node = s.full.getObjectByName(name);
        const parent = node?.parent;
        if (!node || !parent || !this.root) continue;
        const holder = new THREE.Group();
        holder.matrixAutoUpdate = false;
        this.root.add(holder);
        holder.add(node);
        node.visible = true; // (hidden with the rest of what was shed, at every level, a moment ago)
        this.debris.push({ node, parent, drop: i, holder, rel: into.clone().multiply(parent.matrixWorld) });
      }
    });
    const at = new THREE.Vector3();
    const turn = new THREE.Quaternion();
    for (const d of this.debris) {
      // (what the flight gives no body for is not drawn; nor is anything past SHED_SIGHT of both the eye and the vehicle, which
      // the camera may be about to go to: it is under a pixel there, and is flown on all the same)
      d.holder.visible =
        ascent.shed(d.drop, t, pad, at, turn) &&
        Math.min(at.distanceTo(this.camera.position), at.distanceTo(s.group.position)) < SHED_SIGHT;
      if (!d.holder.visible) continue;
      // (what left under a parachute is lost to sight: drawn smaller, to nothing)
      d.holder.matrix.compose(at, turn, ONE.clone().multiplyScalar(ascent.seen(d.drop, t))).multiply(d.rel);
      d.holder.matrixWorldNeedsUpdate = true;
    }
  }

  /** The flown vehicle's parachutes (`Flight.flies.chutes`), made the first time the vehicle flies, and its attitude jets (viewer/jets.ts). */
  private chutes: Chute[] | null = null;
  private jets: Jets | null = null;

  /**
   * Draw the parachutes as the run has them at `t` (ascent.ts `chute`, viewer/chute.ts): each made fast to the node the
   * flight names, on the full level's own node, so one that leaves with what it carried off goes where `fall` puts that.
   */
  private hang(ascent: Ascent, s: Staged, pad: THREE.Quaternion, t: number, flying: boolean): void {
    // the attitude jets: a cone at each chamber that is open, on the model in the body's own axes
    const thrusters = this.flightData?.trajectory?.body?.capsule.rcs?.thrusters;
    const frame = thrusters && !this.jets ? ascent.bodyFrame(pad) : null;
    if (thrusters && frame) {
      this.jets = new Jets(thrusters);
      this.jets.group.matrix.copy(frame);
      s.group.add(this.jets.group);
    }
    this.jets?.set(flying ? ascent.jets(t) : null, this.renderer.toneMappingExposure);
    if (!ascent.chutes.length) return;
    this.chutes ??= ascent.chutes.map((def) => {
      // (the node may be away already, carried off in `fall`'s holder)
      const chute = new Chute(def, s.full.getObjectByName(def.at) ?? this.debris.find((d) => d.node.name === def.at)?.node ?? s.full);
      this.scene.add(chute.group);
      this.looks.add(chute.group);
      return chute;
    });
    const light = this.setting.sunIntensity / 3 + 0.1;
    this.chutes.forEach((chute, i) => chute.set(flying ? ascent.chute(i, t, pad) : null, light));
  }

  /**
   * Lay the trail up to `t` (it is laid once, point by point, as far as the clock has gone while
   * the engine burns; going back only shows less of it) and show it as it stands at `t`.
   */
  private layTrail(ascent: Ascent, pad: THREE.Quaternion, t: number, flying: boolean): void {
    const trail = this.trail;
    const nozzle = this.plume?.mesh.position;
    if (!trail || !nozzle) return;
    const upTo = flying ? Math.min(t, ascent.cutoff) : -1;
    const at = new THREE.Vector3();
    const turn = new THREE.Quaternion();
    while ((trail.laid + 1) * TRAIL_STEP <= upTo) {
      const born = (trail.laid + 1) * TRAIL_STEP;
      if (!ascent.place(born, pad, at, turn)) break;
      at.add(nozzle.clone().applyQuaternion(turn));
      const along = UP.clone().applyQuaternion(turn);
      trail.reach(at, along, born, Math.exp(-Math.max(0, at.y - GROUND_Y) / 8000));
    }
    // and from the last point to the nozzle as it is now, while it burns
    if (flying && t < ascent.cutoff && ascent.place(t, pad, at, turn)) {
      at.add(nozzle.clone().applyQuaternion(turn));
      trail.head(at, UP.clone().applyQuaternion(turn), t, Math.exp(-Math.max(0, at.y - GROUND_Y) / 8000));
    } else trail.headless();
    trail.show(flying ? t : null, this.setting.sunIntensity / 3 + 0.1);
  }

  /** Hang the engine's fire under the flown vehicle's nozzle (`Flight.flies.engine`), measured as it stands on the pad. */
  private hangPlume(flight: FlightData): void {
    const gone = [this.plume?.mesh, this.trail?.mesh];
    for (const chute of this.chutes ?? []) {
      chute.group.removeFromParent();
      this.looks.remove(chute.group); // (or every flight's parachutes would be kept, and dressed again at each change of look)
      chute.dispose();
    }
    this.chutes = null;
    this.jets?.group.removeFromParent();
    this.jets?.dispose();
    this.jets = null;
    this.veils.splice(0, this.veils.length, ...this.veils.filter((o) => !gone.includes(o as THREE.Mesh)));
    this.plume?.mesh.removeFromParent();
    this.plume?.light.removeFromParent();
    // (its mesh draws nothing, but the clouds' pass has drawn it among the veils, so the renderer holds its geometry)
    this.plume?.mesh.geometry.dispose();
    (this.plume?.mesh.material as THREE.Material | undefined)?.dispose();
    this.plume = null;
    this.trail?.mesh.removeFromParent();
    this.trail?.dispose();
    this.trail = null;
    const s = this.flier;
    const engine = flight.flies?.engine && s?.full.getObjectByName(flight.flies.engine);
    const exitArea = flight.trajectory?.engine.exitArea.value;
    if (!s || !engine || !exitArea) return;
    const box = new THREE.Box3().setFromObject(engine);
    const exit = new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2);
    this.plume = new Plume(Math.sqrt(exitArea / Math.PI));
    this.plume.mesh.position.copy(s.group.worldToLocal(exit));
    s.group.add(this.plume.mesh, this.plume.light); // (the light stays in the scene, at no strength until the engine burns: lighting it builds no shader)
    this.trail = new Trail();
    this.scene.add(this.trail.mesh);
    this.veils.push(this.plume.mesh, this.trail.mesh); // (cloud behind them shows through them: clouds.ts)
  }

  /** Bring the view back to what the camera is about; with a flight in the air and the view elsewhere, to the vehicle, wherever it has got to. */
  refind(): void {
    this.cam.refind();
    this.dirty = true;
  }

  get cameraMode(): RigId {
    return this.cam.rig;
  }

  /** The flown vehicle is in the air and the camera is not with it: the page offers the way back to it. */
  get vehicleAway(): boolean {
    return this.lifted.flying && !this.walk.active && (this.cam.rig === 'orbit' || this.cam.rig === 'free');
  }

  /** Draw everything as it would look (`real`) or as a cel-shaded drawing with ink lines (`cel`). */
  setLook(look: Look): void {
    this.looks.set(look);
    this.ink.enabled = look === 'cel';
    this.light();
    this.dirty = true;
  }

  /**
   * The light that depends on the look. A drawing has no reflections to fill its shade, so the
   * sky's fill is raised until shade is a flat tone of the surface's colour and not black; and
   * its colours are left as painted, where the real look rolls bright ones off like film.
   */
  private light(): void {
    const cel = this.looks.current === 'cel';
    this.clouds.cel = cel;
    this.fill.intensity = this.setting.fill[2] * (cel ? CEL_FILL : 1);
    this.setting.simplify?.(cel);
    this.renderer.toneMapping = cel ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping;
  }

  /**
   * Tell the stage how many pixels at the bottom of the canvas the controls cover, and (`top`) how many at the top
   * something else does: views are framed in what is left between them. `across`: the width a view is fitted to, as a
   * share of the canvas's width, about its middle. Left at 1 a view is fitted to the whole width as if nothing covered
   * any of the height, which leaves room to spare; whoever knows what is clear (panels down the sides, a short wide
   * strip between a title and a control block) gives the clear width over the clear height's share.
   */
  setInset(pixels: number, top = 0, across = 1): void {
    const tall = Math.max(1, this.canvas.clientHeight);
    const inset = THREE.MathUtils.clamp(pixels / tall, 0, 0.5);
    const head = THREE.MathUtils.clamp(top / tall, 0, 0.3);
    const sides = THREE.MathUtils.clamp(across, 0.25, 4);
    if (Math.abs(inset - this.inset) < 0.01 && Math.abs(head - this.head) < 0.01 && Math.abs(sides - this.sides) < 0.01) return;
    this.inset = inset;
    this.head = head;
    this.sides = sides;
    this.cam.inset = inset - head; // (the pivot is seen in the middle of what is left clear, whatever the distance)
    this.refollow();
  }

  /** How much of the top of the canvas is covered, 0 to 0.3 (setInset). */
  private head = 0;
  /** The width a view is fitted to, as a share of the canvas's (setInset). */
  private sides = 1;

  /** Frame again whatever the camera was last sent to: the canvas or the model has changed shape. */
  private refollow(): void {
    const snap = !this.cam.travelling; // a flight under way is sent to the new framing instead of cut short
    if (this.following?.part) this.focus(this.following.part, snap, undefined, true);
    else if (this.following?.view) this.view(this.following.view, snap, true);
    else this.keepWatched();
  }

  /**
   * What the hands took the view from (the subject last framed), whether it was in the frame when they last let go,
   * and whether they have had hold of the view since that was looked at.
   */
  private watched: { view?: string; part?: string; seen: boolean; stale: boolean } | null = null;

  /** The box round one model, or (null) round everything on show: but for a vehicle in flight, which is not part of the place while it is away. */
  private wholeOf(model: THREE.Object3D | null, box: THREE.Box3): THREE.Box3 {
    if (model) return box.setFromObject(model);
    // (the models only: what a flight leaves under the root, shed parts and effects, is not part of the place)
    return box.copy(this.modelsBox(this.lifted.flying ? this.flier?.group : null));
  }

  /** The middle of what `of` names: a part, or a view's subject as `view` frames it. */
  private middleOf(of: { view?: string; part?: string }): THREE.Vector3 | null {
    const box = new THREE.Box3();
    const part = of.part ? this.parts.get(of.part) : undefined;
    if (part) box.setFromObject(part);
    else if (of.view && this.root) {
      const named = this.def?.views.find((v) => v.id === of.view);
      const subjects = (named?.nodes ?? []).flatMap((n) => this.parts.get(n) ?? []);
      if (subjects.length) for (const o of subjects) box.expandByObject(o);
      else this.wholeOf(named ? this.main : null, box);
    }
    return box.isEmpty() ? null : box.getCenter(new THREE.Vector3());
  }

  /**
   * A view the hands have set is not framed again when its subject moves by itself (the slider, the clock): its
   * distance and direction are theirs. Only if the subject was in the frame and would leave it does the view move,
   * sideways, and no further than brings it back to the edge of the middle of the frame.
   */
  private keepWatched(): void {
    const w = this.watched;
    if (!w?.seen || w.stale || this.cam.rig !== 'orbit') return;
    const middle = this.middleOf(w);
    const by = middle && this.cam.offFrame(middle);
    if (by?.lengthSq()) this.cam.shift(by);
  }

  /** Once the hands have let go of a view they took, look whether its subject is in the frame: what `keepWatched` goes by. */
  private lookWatched(): void {
    const w = this.watched;
    if (!w?.stale || this.cam.handled || this.cam.keys.size) return;
    w.stale = false;
    const middle = this.cam.rig === 'orbit' ? this.middleOf(w) : null;
    w.seen = Boolean(middle) && this.cam.offFrame(middle!).lengthSq() === 0;
  }

  /** Take the section's model apart this far (its slider). */
  setExplode(t: number): void {
    // A slider that is a sequence of events is the clock seen through the hardware: taking hold of
    // it stops the clock and puts it at that instant, and the hardware follows (follow).
    if (this.def?.sequence && this.clock) {
      this.clock.pause();
      this.clock.seek(timeAt(this.def.sequence, t));
      return;
    }
    this.apartGoal[this.current] = this.apartOwn[this.current] = t;
    this.setApart(this.current, t);
    if (this.stood) this.ground();
    this.fitBounds();
    this.refollow(); // keep looking at what was asked for, until the user takes the camera themselves
  }

  /**
   * Stand every model that is on the clock where its sequence has it. The hardware's instant
   * chases the clock's: in step with it while it runs, and after a jump hurrying over what is far
   * off and playing the last stretch (CATCH_UP_NEAR seconds of the morning) at CATCH_UP_PACE times
   * life, so what happens just before where the clock was put is seen happening.
   */
  private follow(dt: number): void {
    this.scripted = false;
    const clock = this.clock;
    if (!clock) return;
    const far = Math.abs(clock.t - this.shownT);
    if (far > 0) {
      const step = this.frozen
        ? far
        : dt * (CATCH_UP_PACE + 3 * Math.max(0, far - CATCH_UP_NEAR) + (clock.running ? Math.abs(clock.rate) : 0));
      this.shownT = far <= step ? clock.t : this.shownT + Math.sign(clock.t - this.shownT) * step;
    }
    let following = false;
    this.defs.forEach((def, i) => {
      if (!def.sequence || !this.staged[i]) return;
      const to = sliderAt(def.sequence, this.shownT);
      if (to === this.apart[i]) return;
      this.apartGoal[i] = this.apartOwn[i] = to;
      this.setApart(i, to);
      this.scripted = true;
      if (i === this.current) following = true;
    });
    if (!this.scripted) return;
    this.fitBounds();
    if (following) this.refollow(); // keep looking at what was asked for, as it moves
  }

  /** Move every model toward the state it has been asked for: a rollback or a drive-off takes a few seconds. */
  private settle(dt: number): void {
    let moved = false;
    let following = false;
    this.apartGoal.forEach((goal, i) => {
      const now = this.apart[i]!;
      if (now === goal) return;
      const far = Math.abs(goal - now);
      // a model sent somewhere by another section takes a few seconds (one on the clock is not moved here: follow)
      const step = this.frozen ? 1 : dt / 4; // (a test wants the scene still at once)
      this.setApart(i, far <= step ? goal : now + Math.sign(goal - now) * step);
      moved = true;
      if (i === this.current) following = true;
    });
    if (!moved) return;
    this.fitBounds();
    if (following) this.refollow(); // keep looking at what was asked for, as it moves
  }

  /**
   * Drift slowly round the subject. While the view drifts the wheel only changes how close it is; zooming toward
   * the pointer moves the point being turned about, and that is for a view the user has taken (camera/orbit.ts).
   */
  setAutoRotate(on: boolean): void {
    this.cam.drift = on;
  }

  /** Highlight a part from outside (the parts list). */
  highlight(hovered: string | null, selected: string | null = this.selected): void {
    this.hovered = hovered;
    this.selected = selected;
    this.dirty = true;
    // outlined in the level of detail that is on show
    this.outline.selectedObjects = [...new Set([hovered, selected])].flatMap((n) => {
      const o = n ? this.staged[this.current]?.part(n) : undefined;
      return o ? [o] : [];
    });
  }

  /**
   * What hides a part from the outline although it writes no depth into the frame, or not all of it (outline.ts):
   * every pane of glass, and while the cutaway is open the shells it has opened, whole.
   */
  private screens(): readonly THREE.Object3D[] {
    const own = this.staged[this.current]?.shown;
    const { veils, screensOf: of } = this;
    if (of.own !== own || of.cut !== this.cut || of.veils !== veils.length || of.last !== veils.at(-1)) {
      const glass = (o: THREE.Object3D) => Boolean(((o as THREE.Mesh).material as THREE.Material | undefined)?.name?.startsWith('glass'));
      const list = this.veils.filter(glass);
      if (this.cut) own?.traverse((o) => void ((o as THREE.Mesh).isMesh && o.userData.shell && list.push(o)));
      this.screensOf = { own, cut: this.cut, veils: this.veils.length, last: this.veils.at(-1), list };
    }
    return this.screensOf.list;
  }
  private screensOf: Partial<{ own: THREE.Object3D; last: THREE.Object3D }> & { cut: boolean; veils: number; list: THREE.Object3D[] } = {
    cut: false,
    veils: -1,
    list: [],
  };

  /** Fly to one part and frame it, keeping the direction the camera is already looking from. */
  focus(node: string, snap = false, from?: { turn: number; rise: number }, again = false): void {
    const object = this.parts.get(node);
    if (!object) return;
    this.lift(); // (what is framed is where the clock has it now, not where it was last drawn)
    this.frameBox(new THREE.Box3().setFromObject(object), snap, from, this.defs[this.current]?.id === this.ascent?.model, again);
    this.following = { part: node };
  }

  /**
   * Be ready to be looked at. The scene can be drawn as soon as the models are in, but the
   * first frames of it are not smooth: the coarser levels of detail and the place round the pad
   * are still arriving, and every material's shader is built the first time it is drawn, which
   * holds the page for a moment each time. This waits for what is arriving (up to `patience`
   * milliseconds), builds every shader without holding the page, and lets a few frames go by,
   * so that whoever lifts the curtain afterwards sees motion that is already steady.
   */
  async warm(patience = 9000, onStep?: (step: WarmStep, fraction: number) => void): Promise<void> {
    // (made a little at a time while the rest arrives; a setting with no air has no clouds to make)
    const clouds = this.setting.fog ? this.clouds.warm() : Promise.resolve();
    const settled = Promise.allSettled(this.arriving);
    // (said as it happens, for whoever is showing how far along it is: the list grows as the place brings its own levels)
    let arrived = 0;
    const counted = new Set<Promise<unknown>>();
    const count = () => {
      for (const p of this.arriving) {
        if (counted.has(p)) continue;
        counted.add(p);
        void p
          .catch(() => {})
          .then(() => {
            arrived++;
            count();
            onStep?.('place', arrived / Math.max(1, this.arriving.length));
          });
      }
    };
    count();
    onStep?.('place', 0);
    await Promise.race([settled, new Promise((done) => setTimeout(done, patience))]);
    onStep?.('place', 1);
    onStep?.('clouds', 0);
    const frames = async (n: number) => {
      for (let i = 0; i < n; i++) {
        this.dirty = true;
        await new Promise((done) => requestAnimationFrame(done));
      }
    };
    await clouds;
    onStep?.('clouds', 1);
    onStep?.('shaders', 0);
    // Everything that will ever be drawn is drawn now, unseen: every level of detail, whether
    // or not it is in view, by day and with the lamps lit (a scene with lamps on is a different
    // set of shaders). What is built and sent to the GPU here is not built in front of anyone.
    const culled: THREE.Object3D[] = [];
    this.scene.traverse((o) => {
      if (o.frustumCulled) {
        o.frustumCulled = false;
        culled.push(o);
      }
    });
    for (const s of this.staged) s.everyLevel(true);
    this.scenery?.everyLevel(true);
    this.rehearse();
    if (this.plume) this.plume.mesh.visible = true; // the engine's fire too: it is first seen at liftoff
    if (this.trail) this.trail.mesh.visible = true; // (and its trail: drawn empty, its shader is built)
    const globe = this.setting.globe;
    const shown = globe && [globe.mesh.visible, globe.air.visible];
    if (globe) globe.mesh.visible = globe.air.visible = true; // the Earth and its air, first seen on the way up
    // (and each of those twice: a level of detail giving way to another is drawn by shaders of its own, lod.ts)
    const passes = [
      [1, true],
      [0, true],
      [1, false],
      [0, false],
    ] as const;
    // And every picture a material carries is sent to the GPU now, whether or not what wears it is shown: a hidden
    // thing's (the cabin's panels, 4096 square) was sent when it was first drawn, in front of whoever had just zoomed
    // in on the vehicle, and held that frame for a fifth of a second. A large one a frame, so none of this holds the page.
    {
      const sent = new Set<THREE.Texture>();
      const pictures: THREE.Texture[] = [];
      this.scene.traverse((o) => {
        const worn = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        for (const m of worn ? (Array.isArray(worn) ? worn : [worn]) : [])
          for (const v of Object.values(m)) {
            const t = v as THREE.Texture | null;
            if (!t?.isTexture || sent.has(t) || !(t.image as { width?: number } | null)?.width) continue;
            if ((t as THREE.CubeTexture).isCubeTexture || (t as unknown as { isRenderTargetTexture?: boolean }).isRenderTargetTexture)
              continue;
            sent.add(t);
            if (!(this.renderer.properties.get(t) as { __webglTexture?: unknown }).__webglTexture) pictures.push(t);
          }
      });
      for (const t of pictures) {
        this.renderer.initTexture(t);
        const { width, height } = t.image as { width: number; height: number };
        if (width * height >= 1024 * 1024) await frames(1);
      }
    }
    for (const [i, [night, fading]] of passes.entries()) {
      for (const s of this.staged) s.everyLevel(true, fading);
      this.scenery?.everyLevel(true, fading);
      this.lamps.set(night, 1);
      // Built for the buffer the scene is drawn into: a shader for the canvas (tone-mapped, in the screen's colours) is
      // another shader, and built for that every one of them was built again, one at a time, as the first frame was drawn.
      const target = this.renderer.getRenderTarget();
      if (!this.plain) this.renderer.setRenderTarget(this.frameTarget);
      const built = [this.renderer.compileAsync(this.scene, this.camera)];
      // (and the sky's, which is a scene of its own drawn into the same buffer)
      if (!this.plain) built.push(this.renderer.compileAsync(this.setting.backdrop.scene, this.setting.backdrop.camera));
      this.renderer.setRenderTarget(target);
      await Promise.all(built).catch(() => {}); // (a browser without parallel compile builds them as they are drawn)
      this.held = false; // (the first frame is drawn now, with its shaders ready)
      this.quality.rest(performance.now(), 8000); // (and the first seconds are slow for reasons that pass: maps arriving, the other look's shaders)
      this.renderer.shadowMap.needsUpdate = true;
      await frames(2);
      onStep?.('shaders', (i + 1) / passes.length);
    }
    onStep?.('settle', 0);
    for (const o of culled) o.frustumCulled = true;
    for (const s of this.staged) s.everyLevel(false);
    this.scenery?.everyLevel(false);
    if (this.plume) this.plume.mesh.visible = false;
    if (this.trail) this.trail.mesh.visible = false;
    if (globe && shown) [globe.mesh.visible, globe.air.visible] = shown;
    this.relight(true);
    await frames(3);
    onStep?.('settle', 1);
    if (!this.plain) this.prebuild(this.looks.current === 'cel' ? 'real' : 'cel');
  }

  /**
   * Have everything the flight will put in the scene made now, unseen: the frost that comes off at liftoff, the glow
   * of the entry, the attitude jets, the parachutes. Each was made the first time it was wanted, and its shader built
   * there and then, with the page stopped for it in the middle of the flight (141 ms at liftoff). Made here, hidden
   * as they are until their moment, they are in the scene when `warm` has every shader built.
   */
  private rehearse(): void {
    const ascent = this.ascent;
    const s = this.flier;
    if (!ascent || !s || !this.clock || this.plain) return;
    const def = this.defs.find((m) => m.id === ascent.model)!;
    const pad = new THREE.Quaternion().setFromAxisAngle(UP, def.rotationY ?? 0);
    const t = this.clock.t;
    s.group.updateMatrixWorld(true);
    this.effects?.set(t, false, s.group, s.full, this.clock.rate, this.renderer.toneMappingExposure, this.setting.sunIntensity, this.veils);
    this.hang(ascent, s, pad, t, false);
  }

  /**
   * Ask for the other look's shaders now, to be built behind what is on show: the first change of look (T) then has
   * them, where it used to stop the page for seconds building them one after another. The meshes wear the other
   * look's materials only for the length of this call, in which nothing is drawn.
   */
  private prebuild(look: Look): void {
    const now = this.looks.current;
    if (look === now) return;
    this.looks.set(look);
    const target = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.frameTarget);
    void this.renderer.compileAsync(this.scene, this.camera).catch(() => {});
    this.renderer.setRenderTarget(target);
    this.looks.set(now);
  }

  /** The view is not being steered (the idle show): the light may be followed less closely, for even frames. */
  setUnhurried(on: boolean): void {
    unhurried(on);
  }

  /** The Sun is down: what is seen is what the lamps light. */
  get dark(): boolean {
    return this.setting.sunIntensity < 0.6;
  }

  /** Nothing is picked out under the pointer: the scene is being shown, not used. */
  inert = false;
  /** The curtain is up (the flight is still arriving and warming): nothing is picked, hovered or chosen behind it. */
  veiled = false;

  /** Where on the page a part's middle, or a point in the world, is now; null if it is behind the camera. */
  screenOf(what: string | THREE.Vector3): { x: number; y: number } | null {
    const point = new THREE.Vector3();
    if (typeof what === 'string') {
      const object = this.parts.get(what);
      if (!object) return null;
      // where its bulk is (bulk.ts): the middle of its surface, however it is cut into meshes
      if (!bulkOf(object, point)) return null;
    } else point.copy(what);
    point.project(this.camera);
    if (point.z > 1) return null;
    const r = this.canvas.getBoundingClientRect();
    return { x: r.left + ((point.x + 1) / 2) * r.width, y: r.top + ((1 - point.y) / 2) * r.height };
  }

  /** The windows of the section's model: the middle of each pane and the way it faces, outward. */
  panes(): { point: THREE.Vector3; normal: THREE.Vector3 }[] {
    const model = this.main;
    const out: { point: THREE.Vector3; normal: THREE.Vector3 }[] = [];
    if (!model) return out;
    const middle = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
    this.staged[this.current]!.full.traverse((o) => {
      const mesh = o as THREE.Mesh;
      const material = (mesh.userData.real ?? mesh.material) as THREE.Material | undefined;
      const at = mesh.isMesh ? mesh.geometry.getAttribute('position') : undefined;
      const facing = mesh.isMesh ? mesh.geometry.getAttribute('normal') : undefined;
      if (
        !at ||
        !facing ||
        !material ||
        Array.isArray(material) ||
        !material.name.startsWith('glass') ||
        material.name.startsWith('glass-visor') ||
        material.name.startsWith('glass-lens') ||
        mesh.userData.ghost // (a pane's twin, panes.ts: the pane itself has been counted)
      )
        return;
      const first = mesh.localToWorld(new THREE.Vector3().fromBufferAttribute(at, 0));
      const point = this.paneCentre(mesh, first);
      const normal = new THREE.Vector3().fromBufferAttribute(facing, 0).transformDirection(mesh.matrixWorld);
      // outward: away from the middle of the model it is a window of
      if (normal.dot(point.clone().sub(middle).setY(0)) < 0) normal.negate();
      out.push({ point, normal });
    });
    return out;
  }

  /** How fast the view drifts round its subject, as a multiple of the usual: a show turns faster than a study. */
  setDrift(times: number): void {
    this.cam.driftTimes = times;
  }

  /** Come round the subject on show by `turn` radians, to `rise` radians above the level, at the same distance: a new angle on the same thing. */
  swing(turn: number, rise: number): void {
    this.cam.swing(turn, rise);
  }

  /** Go over to something that is not part of any model (a building beside the pad) and look at it: the view then turns about it. */
  visit(box: THREE.Box3): void {
    this.frameBox(box, false);
    this.onVisit();
  }

  /** Fly to whatever fills `box` and frame it, keeping the direction the camera is already looking from. */
  private frameBox(box: THREE.Box3, snap: boolean, from?: { turn: number; rise: number }, onCraft = false, again = false): void {
    const size = box.getSize(new THREE.Vector3());
    const target = box.getCenter(new THREE.Vector3());
    // never closer than a 1.6 m subject would be: a small part is seen with its surroundings
    const span = Math.max(size.y, Math.hypot(size.x, size.z) / (this.camera.aspect * this.sides), 1.6);
    const dir = this.cam.direction();
    if (from) {
      // seen from somewhere else: round from where the camera is, and at a height of its own
      const flat = new THREE.Vector3(dir.x, 0, dir.z).normalize().applyAxisAngle(UP, from.turn);
      dir.copy(flat.multiplyScalar(Math.cos(from.rise)).addScaledVector(UP, Math.sin(from.rise)));
    }
    if (this.setting.floor) dir.setY(Math.max(dir.y, 0.12)).normalize();
    this.following = this.watched = null;
    this.onView(null);
    // no closer than just outside the part: nearer than that the camera is inside its skin
    this.cam.frame({
      centre: target,
      distance: this.cam.fit(span, 0.5),
      direction: dir,
      min: Math.max(0.35, Math.min(size.x, size.z) * 0.62),
      snap,
      onCraft,
      again,
    });
  }

  /**
   * Go up to a window and look through it: the camera swings round to face the pane square on,
   * close enough that the opening fills the view, looking at what is just inside.
   */
  lookIn(point: THREE.Vector3, normal: THREE.Vector3): void {
    this.following = this.watched = null;
    this.onView(null);
    this.onInteract(); // drifting round would carry the view off the window again
    this.cam.frame({ centre: point.clone().addScaledVector(normal, -0.45), distance: 1, direction: normal, min: 0.2 });
  }

  /** Frame 'all' (everything on show) or one of the model's named views. */
  view(id: string, snap = false, keepDirection = false): void {
    if (!this.root || !this.def) return;
    this.lift(); // (what is framed is where the clock has it now, not where it was last drawn: the clock may just have been put back)
    const named = this.def.views.find((v) => v.id === id);
    // 'all' is everything on show; a named view with no numbers is the model alone, as it stands;
    // one that names parts is those parts wherever they are now, so it follows them as they come apart
    const box = new THREE.Box3();
    const subjects = (named?.nodes ?? []).flatMap((n) => this.parts.get(n) ?? []);
    if (subjects.length) for (const o of subjects) box.expandByObject(o);
    else this.wholeOf(named ? this.main : null, box);
    const size = box.getSize(new THREE.Vector3());
    const centreY = named?.centreY ?? (box.min.y + box.max.y) / 2;
    // a wide, low subject (a launch pad) must fit by width as well as by height
    const span =
      named?.span ?? Math.max(size.y, Math.hypot(size.x, size.z) / (this.camera.aspect * this.sides)) * (subjects.length ? 1.12 : 1);
    // the subject fills most of the frame above the controls, which sit over the bottom of it
    const fill = (1 - this.inset - this.head) * 0.9;
    const distance = span / 2 / Math.tan(THREE.MathUtils.degToRad(this.lens / 2)) / fill;
    // a named view looks at the model's own axis; 'all' looks at the middle of everything
    const mid = box.getCenter(new THREE.Vector3());
    const target =
      named && !subjects.length
        ? new THREE.Vector3(this.main!.position.x, centreY, this.main!.position.z)
        : new THREE.Vector3(mid.x, centreY, mid.z);
    const lift = this.setting.floor ? 0.16 : span < 4 ? 0.22 : 0.1;
    // (the subject sits in the middle of the frame that the controls leave clear: the camera aims under it, camera/maths.ts aimBelow)
    // Framed again because the subject changed shape (the slider, a resize): from wherever the
    // camera has got to, so a view that is drifting round or has been tilted is not thrown back.
    const from = keepDirection
      ? this.cam.direction()
      : named?.from
        ? // a view's direction is given for the model as the flight stands it: it turns with a model that has been turned (a figure walked somewhere else)
          new THREE.Vector3(...named.from).applyAxisAngle(UP, (this.main?.rotation.y ?? 0) - (this.def.rotationY ?? 0))
        : new THREE.Vector3(-0.62, lift, 0.78); // the sunlit side, and the one the cutaway opens toward
    this.following = { view: id };
    this.watched = null;
    this.onView(id);
    // no further out than half as far again as it takes to see everything on show: beyond that
    // the subject is a speck in a field of scrub
    const all = this.modelsBox().getSize(new THREE.Vector3());
    const widest = Math.max(all.y, Math.hypot(all.x, all.z) / this.camera.aspect);
    const wide = (1.5 * widest) / 2 / Math.tan(THREE.MathUtils.degToRad(this.lens / 2)) / fill;
    this.cam.frame({
      centre: target,
      distance,
      direction: from,
      min: Math.max(0.35, Math.min(1.4, span * 0.2)),
      // ...unless there is a place round it worth seeing from the air: then as far as the place goes
      max: Math.max(30, wide, this.setting.horizon ?? this.setting.reach ?? 0),
      snap,
      onCraft: this.def.id === this.ascent?.model,
      whole: !subjects.length,
      again: keepDirection,
    });
  }

  /** Measure everything on show, for the camera's depth range and its limits. Called whenever something moves. */
  /**
   * The bounds of the flight's models, but for `without`. The models, not everything under the root: what a flight has
   * shed is there too while it falls away, and the glow of entry and the ice stay where they were last drawn, hundreds
   * of kilometres downrange. Measured with them, the place was that wide for ever after: the depth range with it (the
   * near plane at a metre and a half from across the pad, the far one at the landing), and how far a view may pull back.
   */
  private modelsBox(without?: THREE.Object3D | null): THREE.Box3 {
    const all = new THREE.Box3();
    for (const s of this.staged) if (s.group !== without) all.expandByObject(s.group);
    return all;
  }

  private fitBounds(): void {
    if (!this.root) return;
    // a vehicle in flight is left out: the view's limits are the place's (fitDepth reaches out to it)
    const flying = this.lifted.flying ? this.flier?.group : null;
    const all = this.modelsBox(flying);
    this.bounds.set(all.getCenter(new THREE.Vector3()), all.getSize(new THREE.Vector3()).length() / 2 + 0.5);
    this.centreY = this.bounds.center.y;
  }

  /** What stands at the place, for the far shadow map: every model where it stands (not one in flight) and the place round them. */
  private shadowed(): THREE.Box3 | null {
    if (!this.root) return null;
    const box = this.modelsBox(this.lifted.flying ? (this.flier?.group ?? null) : null);
    if (this.surroundings) box.expandByObject(this.surroundings);
    return box;
  }

  /**
   * Aim the shadow map, once per section. It is spent on the model being studied and its
   * surroundings, since one map stretched over a whole launch pad gives the rocket sawtooth
   * shadows; and it is sized for that model fully taken apart, so that moving the slider never
   * changes it. (Refitting it as parts moved made every other shadow on the pad shift and
   * change sharpness with the slider.)
   */
  private fitShadows(): void {
    const own = this.staged[this.current];
    if (!this.root || !own) return;
    this.fitBounds();
    const box = new THREE.Box3().setFromObject(own.group);
    own.explode(1);
    box.expandByObject(own.group);
    own.explode(this.apart[this.current] ?? 0);
    const centre = box.getCenter(new THREE.Vector3());
    const radius = Math.min(
      this.bounds.radius,
      box.getSize(new THREE.Vector3()).length() / 2 + Math.max(6, box.getSize(new THREE.Vector3()).length() * 0.5),
    );
    this.sun.target.position.copy(centre);
    this.sun.position.copy(centre).addScaledVector(this.setting.sunDir, radius + 10);
    Object.assign(this.sun.shadow.camera, { left: -radius, right: radius, top: radius, bottom: -radius, near: 1, far: 2 * radius + 20 });
    this.sun.shadow.camera.updateProjectionMatrix();
    this.sun.shadow.normalBias = Math.max(0.012, radius / 900);
    this.shadowGrain(SHADOW_MAP, this.setting.shadowRadius ?? 1);
    depthBias(this.sun.shadow); // (a length, a few texels of the map: not a share of the camera's depth, shadows.ts)
    this.renderer.shadowMap.needsUpdate = true;
  }

  /**
   * Give the Sun's shadow map this many texels a side and this much softening of its edges. There is one map for
   * each size asked for (the section's, and the finer one on foot), kept: going on foot and back changes which is
   * in use, and frees and allocates nothing. Whoever changes the size has the map drawn again.
   *
   * The maps are made here, not left to three (WebGLShadowMap makes one where `shadow.map` is null). Its own is a
   * render target with the default colour texture beside the depth: four bytes a texel that nothing reads, 256 MB
   * at 8192 a side. A WebGL render target has to have a colour texture, so this one has the smallest there is, one
   * byte a texel. The depth texture is exactly three's for a PCF shadow: 24 bits (in 32), compared in the lookup,
   * linearly filtered.
   */
  private shadowGrain(size: number, radius: number): void {
    const shadow = this.sun.shadow;
    shadow.radius = radius;
    if (shadow.mapSize.x === size && shadow.map) return;
    shadow.mapSize.set(size, size);
    let map = this.shadowMaps.get(size);
    if (!map) {
      map = new THREE.WebGLRenderTarget(size, size, { format: THREE.RedFormat, type: THREE.UnsignedByteType, generateMipmaps: false });
      map.texture.name = 'sun.shadowMapUnread';
      const depth = new THREE.DepthTexture(size, size, THREE.UnsignedIntType);
      depth.name = 'sun.shadowMap';
      depth.format = THREE.DepthFormat;
      depth.compareFunction = THREE.LessEqualCompare;
      depth.minFilter = depth.magFilter = THREE.LinearFilter;
      map.depthTexture = depth;
      this.shadowMaps.set(size, map);
    }
    shadow.map = map;
  }

  /**
   * Half a minute after a walk: the maps only a walk uses are let go, the fine one (8192 a side is a quarter of a
   * gigabyte) and the still casters' copy of it. The next walk makes them again in its first frame.
   */
  private freeWalkShadows(): void {
    this.walkEnded = 0;
    this.shadowCache.release();
    for (const [size, map] of this.shadowMaps) {
      if (size <= SHADOW_MAP || this.sun.shadow.map === map) continue;
      map.depthTexture?.dispose();
      map.dispose();
      this.shadowMaps.delete(size);
    }
  }

  /**
   * How the shadow map is spent on foot. From eye height a wall two metres off that the Sun
   * grazes shows every texel of the map as a tooth along a shadow's edge, so the map is made as
   * fine as the machine allows: 8192 a side over 52 m of ground (6 mm a texel) where the GPU
   * takes a texture that size and is not a phone's, and otherwise the usual 4096 over a smaller
   * 36 m (9 mm); and its edges are softened by a texel or two either way.
   */
  private walkShadow(): { half: number; size: number; radius: number } {
    const big = this.renderer.capabilities.maxTextureSize >= 8192 && !matchMedia('(pointer: coarse)').matches;
    return big ? { half: WALK_SHADOW, size: 8192, radius: 1.5 } : { half: 18, size: SHADOW_MAP, radius: 2 };
  }

  /**
   * Keep the near plane as far out as what is there allows, every frame, whatever the rig. Depth precision at
   * distance d is about d² / (near × 2²⁴): with a fixed 5 cm near plane, faces 3 mm apart fight from across the pad,
   * and with one 15 m out the pad's slab and the ground under it, 12 cm apart, fight from 20 km up. So the plane
   * stands at half the way to the nearest thing drawn in the scene's depth, and that is asked of what is there, not
   * guessed from what the camera turns about (it was a quarter of the pivot's distance, and a free camera's pivot is
   * a point just in front of the lens): the ground or the sea under the eye; the flown vehicle, what it has shed and
   * its parachutes; and every solid thing and plant (`uncut`). Twenty kilometres over the site with nothing nearer
   * than the ground that is a plane kilometres out and depth steps of centimetres down there. It comes in at once
   * (nothing is ever cut) and goes out over a moment (`NEAR_EASE`: it never steps); a frozen stage has it at once.
   */
  private fitDepth(dt: number): void {
    const eye = this.camera.position;
    const toCentre = eye.distanceTo(this.bounds.center);
    const toTarget = eye.distanceTo(this.cam.pivot);
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * Math.hypot(1, this.camera.aspect);
    const corner = Math.hypot(1, tan);
    let near = Number.POSITIVE_INFINITY;
    let plants = true;
    // (beyond the site there is no ground at the camera's feet to keep in view)
    if (this.setting.floor && Math.hypot(eye.x, eye.z) <= (this.setting.reach ?? Infinity)) {
      // Never past the ground at the camera's feet. The nearest ground in view is at the corner of the frame, no
      // nearer along the view than the camera's height times the cosine of the frame's half-diagonal; a near plane
      // beyond that slices the foreground away. From well above, what grows on the ground is counted with it (the
      // tallest palm is under `CANOPY`), and the plants are not asked one by one.
      let height = eye.y - GROUND_Y;
      if (height > 4 * CANOPY) {
        height -= CANOPY;
        plants = false;
      }
      near = Math.min(near, (0.9 * height) / corner);
    }
    // beyond the site's ground the globe's sea is under the camera instead, and it is seen out to its horizon
    const globe = this.setting.globe;
    if (globe?.mesh.visible) near = Math.min(near, (0.9 * globe.altitude(eye)) / corner);
    let far = Math.max(toCentre + this.bounds.radius + (this.setting.horizon ?? 10), globe?.reach(eye) ?? 0);
    // a vehicle in flight is seen as far off as it is, and the near plane is never beyond it
    const flier = this.lifted.flying ? this.flier : null;
    if (flier) {
      const to = eye.distanceTo(flier.sphere.center);
      // (with room to spare: the far plane is only moved when it is 2 % out, and a vehicle going away from a camera that
      // stands still, the pad camera's, would otherwise be beyond it between one move and the next)
      far = Math.max(far, 1.05 * (to + flier.sphere.radius));
      near = Math.min(near, Math.max(NEAR_LEAST, 0.5 * (to - flier.sphere.radius), 0.01 * toTarget));
      // ...nor beyond what it has shed, which is no longer part of it, nor a parachute (reshaped as it fills: its
      // bounds as made say nothing, so it is taken as everything within its lines' length of where it is made fast)
      const box = this.depthBox;
      const at = this.depthAt;
      for (const d of this.debris) near = Math.min(near, (0.5 * box.setFromObject(d.holder).distanceToPoint(eye)) / corner);
      for (const chute of this.chutes ?? [])
        if (chute.group.visible)
          near = Math.min(near, (0.5 * Math.max(0, chute.group.getWorldPosition(at).distanceTo(eye) - CHUTE_REACH)) / corner);
    }
    // (a setting with no ground and no sea, a studio: the models are all there is, and are asked below)
    if (near === Number.POSITIVE_INFINITY) near = Math.max(NEAR_LEAST, 0.5 * (toCentre - this.bounds.radius), 0.01 * toTarget);
    near = this.uncut(Math.max(NEAR_LEAST, near), plants);
    // in at once, out over a moment
    const was = this.nearEased;
    if (!(near > was) || this.frozen || !(dt > 0)) this.nearEased = near;
    else this.nearEased = Math.min(near, was * (near / was) ** (1 - Math.exp(-dt / NEAR_EASE)));
    near = this.nearEased;
    if (Math.abs(near - this.camera.near) > near * 0.02 || Math.abs(far - this.camera.far) > far * 0.02) {
      this.camera.near = near;
      this.camera.far = far;
      this.camera.updateProjectionMatrix();
    }
  }
  private nearEased = NEAR_LEAST;
  private readonly depthBox = new THREE.Box3();
  private readonly depthAt = new THREE.Vector3();

  /** How far indoors the eye is, 0 in the open to 1 in a room: eased, never stepped (`adapt`). */
  private indoors = 0;
  private readonly enclosed = { at: Number.NEGATIVE_INFINITY, share: 0 };

  /**
   * The exposure: the setting's, for the sky and the Sun there are, opened up indoors as an eye opens. A room by
   * day is lit by what comes in at its door and windows, a few hundredths of the light outside; at the daylight
   * exposure it was a dark slab with a bright hole in it. Indoors the eye settles on the room, whatever the hour:
   * the exposure goes to the one a room by day has (`INDOORS_EXPOSURE`), up from the sunlit ground's and down from the
   * night's, which is an eye among floodlights and showed a lamp-lit room four times over or, at dusk, a third as
   * bright as the same room an hour later. So a room's lamps (the models' `Light_` marks) need one strength, not one
   * for each hour; and the fittings' own glow is told what it is being seen at (`Lamps.exposed`).
   */
  private expose(): void {
    const s = this.setting;
    const exposure = s.exposure + (INDOORS_EXPOSURE - s.exposure) * this.indoors;
    this.renderer.toneMappingExposure = exposure;
    this.lamps.exposed(exposure);
  }

  /**
   * A frame's worth of the eye getting used to where it is. How enclosed it is is asked a few times a second: nine
   * rays from the eye (straight up, four level, four half way up) and the share of them that meet something within
   * `INDOORS_REACH`. A room with its door open still stops eight; a platform overhead with the pad open all round
   * stops one or two, and is shade, not indoors. The exposure follows over a second or so, as an eye does, and
   * `walking` false lets it go back.
   */
  private adapt(dt: number, walking: boolean): void {
    const now = performance.now();
    if (walking && now - this.enclosed.at > 200) {
      this.enclosed.at = now;
      const eye = this.camera.position;
      const solids = this.walk.solids;
      solids.gather(eye, INDOORS_REACH, INDOORS_REACH);
      let met = 0;
      for (const ray of ENCLOSING) if (solids.cast(eye, ray, INDOORS_REACH)) met++;
      this.enclosed.share = met / ENCLOSING.length;
    }
    const want = walking ? THREE.MathUtils.smoothstep(this.enclosed.share, 0.6, 0.85) : 0;
    if (want === this.indoors) return;
    const next = this.frozen ? want : this.indoors + (want - this.indoors) * (1 - Math.exp(-dt / INDOORS_SECONDS));
    this.indoors = Math.abs(want - next) < 1e-3 ? want : next;
    this.expose();
    this.dirty = true;
  }

  /**
   * The near plane brought in, if it must be, so that it cuts nothing: `near` is where the view's subject and the
   * ground would let it be, which knows nothing of what stands between (orbiting the pad from 150 m it was 19 m out,
   * and the other pad's gantry, 15 m in front of the eye, was sliced away). So the nearest surface of anything solid
   * is asked for (the walker's `Solids`: every model as posed and the place round them, exactly, by their hierarchies),
   * and the plants, which are not solid, are asked for where they stand (`Setting.plantsClear`). The plane's corner, not its middle, is what must stay short of the thing. Depth resolution is spent only
   * where something really is that near, which is where it was being cut.
   */
  private uncut(near: number, plants = true): number {
    if (near <= NEAR_LEAST) return near;
    const eye = this.camera.position;
    // (a still eye is asked again only a few times a second, for what may have moved toward it)
    const kept = this.uncutKept;
    const now = performance.now();
    if (!this.frozen && kept.eye.equals(eye) && kept.asked >= near && now - kept.at < 250) return Math.min(near, kept.near);
    const corner = Math.hypot(1, Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * Math.hypot(1, this.camera.aspect));
    // (the plane at half the way to the nearest thing: so things are looked for twice as far as its corner reaches)
    const reach = 2 * near * corner;
    let clear = reach;
    if (plants) clear = this.setting.plantsClear?.(eye, clear) ?? clear;
    const solids = this.walk.solids;
    solids.set(this.solidRoots());
    solids.gather(eye, clear, clear);
    clear = solids.clear(eye, clear);
    const fitted = clear >= reach ? near : Math.max(NEAR_LEAST, (0.5 * clear) / corner);
    kept.eye.copy(eye);
    kept.asked = near;
    kept.near = clear >= reach ? Number.POSITIVE_INFINITY : fitted;
    kept.at = now;
    return fitted;
  }
  private readonly uncutKept = { eye: new THREE.Vector3(Number.NaN), asked: 0, near: 0, at: 0 };

  /**
   * Draw each model at the level of detail its size on screen calls for. The model being
   * studied is always complete while it is cut open: only the full level has an inside.
   */
  private fitDetail(dt: number): void {
    const scale = this.renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
    const eye = this.camera.position;
    // one level gives way to another over a moment (lod.ts: Crossfade); a test wants the scene as it will be, at once
    const fade = this.frozen ? Number.POSITIVE_INFINITY : dt;
    let changed = false;
    this.staged.forEach((s, i) => {
      changed = s.choose(eye, scale, this.fullDetail || (i === this.current && this.cut), fade) || changed;
    });
    if (this.scenery?.choose(eye, scale, fade)) changed = true;
    if (!changed) return;
    this.dirty = true;
    this.renderer.shadowMap.needsUpdate = true;
    this.highlight(this.hovered);
  }

  /**
   * What is solid to the walker: every model but the one walked as, the place round the pad, the setting's scenery.
   * Asked every frame, and the same list is given until one of them is another object (a level of detail changed,
   * another figure is walked as, the setting changed).
   */
  private solidRoots(): THREE.Object3D[] {
    const kept = this.solidsKept;
    const scenery = this.setting.scenery;
    let same = kept.walked === this.walked && kept.surroundings === this.surroundings && kept.scenery === scenery;
    same &&= kept.count === scenery.length && kept.shown.length === this.staged.length;
    for (let i = 0; same && i < kept.shown.length; i++) same = kept.shown[i] === this.staged[i]!.shown;
    if (!same) {
      kept.walked = this.walked;
      kept.surroundings = this.surroundings;
      kept.scenery = scenery;
      kept.count = scenery.length;
      kept.shown = this.staged.map((s) => s.shown);
      kept.roots = [
        ...kept.shown.filter((_, i) => i !== this.walked), // every model but the one you are
        ...(this.surroundings ? [this.surroundings] : []),
        ...scenery,
      ];
    }
    return kept.roots;
  }
  private readonly solidsKept = {
    walked: -2,
    surroundings: null as THREE.Object3D | null,
    scenery: null as THREE.Object3D[] | null,
    count: 0,
    shown: [] as THREE.Object3D[],
    roots: [] as THREE.Object3D[],
  };

  /**
   * A geometry's hierarchy for a pick, if it has one. Making one takes from a fraction of a millisecond to a frame
   * or more, and a ray crosses dozens of meshes, so the pointer never waits for it: a mesh without one is asked
   * three's way, which gives the same answer, and its hierarchy is owed (`growTrees`).
   */
  private readonly pickTree = (geometry: THREE.BufferGeometry): MeshBVH | null => {
    const solids = this.walk.solids;
    const tree = solids.fresh(geometry);
    if (!tree && !solids.has(geometry)) this.treesOwed.add(geometry); // (one that has gone stale stays stale: its vertices move)
    return tree;
  };
  private readonly treesOwed = new Set<THREE.BufferGeometry>();

  /**
   * Make hierarchies that picks have wanted, in time nobody is waiting for: `spare` milliseconds of it. One is
   * started only if it should fit (a hierarchy is made at some two thousand triangles a millisecond, taken here
   * as a thousand); with `still` (nothing was drawn this frame, so nothing is in motion) one too big to fit is
   * made anyway, alone.
   */
  private growTrees(spare: number, still: boolean): void {
    const until = performance.now() + spare;
    let made = 0;
    for (const geometry of this.treesOwed) {
      const left = until - performance.now();
      if (left <= 0) break;
      if (triangles(geometry) / TREE_RATE > left && !(still && !made)) continue;
      this.treesOwed.delete(geometry);
      this.walk.solids.tree(geometry);
      made++;
    }
  }

  /**
   * What is under the pointer: one of this model's parts, or one of the models standing beside
   * it (the pad under the rocket, the pilot at its foot), which a click opens.
   */
  private pick(): Picked {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    // a ray does not know about the cutaway: skip what has been cut away to reach what is inside
    const gone = (h: THREE.Intersection) =>
      this.cut && h.object.userData.shell && this.cutPlanes.every((p) => p.distanceToPoint(h.point) < 0);
    // (what three's own intersectObjects gives, found through the hierarchies the walker keeps: pick.ts. With
    // nothing cut away the first thing met is the answer, and each mesh need only say where the ray first meets it.)
    const roots = [...this.staged.map((s) => s.shown), ...(this.surroundings ? [this.surroundings] : [])];
    // nor about what is not being drawn: from the seat, the pilot's own visor is in front of the eye
    const hidden = (o: THREE.Object3D | null): boolean => (o ? !o.visible || hidden(o.parent) : false);
    const hit = through(this.raycaster, roots, this.pickTree, !this.cut).find((h) => !gone(h) && !hidden(h.object));
    // something in the place round the pad: a click goes over to it
    const place = hit ? this.placeOf(hit.object, hit.point) : null;
    if (place) return { node: null, model: null, place };
    for (let o: THREE.Object3D | null = hit?.object ?? null; o; o = o.parent) {
      const at = this.staged.findIndex((s) => s.shown === o);
      if (at >= 0 && at !== this.current) return { node: null, model: this.defs[at]!.id };
      if (at === this.current) break;
    }
    // a window pane of this model: a click goes up to it and looks in
    const mesh = hit?.object as THREE.Mesh | undefined;
    const of = (mesh?.material as THREE.Material | undefined)?.name ?? '';
    if (hit?.face && mesh && of.startsWith('glass') && !of.startsWith('glass-lens')) {
      const normal = hit.face.normal.clone().transformDirection(mesh.matrixWorld);
      if (normal.dot(this.raycaster.ray.direction) > 0) normal.negate(); // toward the viewer, whichever side was hit
      return { node: null, model: null, pane: { point: this.paneCentre(mesh, hit.point), normal } };
    }
    const thing = hit ? (thingOf(hit.object) ?? this.cabin?.thingAt(hit.point) ?? undefined) : undefined;
    for (let o: THREE.Object3D | null = hit?.object ?? null; o; o = o.parent)
      if (this.parts.has(o.name)) return { node: o.name, model: null, ...(thing ? { thing } : {}) };
    return { node: null, model: null };
  }

  /** Something in the place round the pad that `object` belongs to: what it is called, and the part of it to go and look at. */
  private placeOf(object: THREE.Object3D, point: THREE.Vector3): { name: string; box: THREE.Box3; title?: string; about?: string } | null {
    // (only the surroundings have places: a model's parts are its own, even one marked a vehicle)
    let o: THREE.Object3D | null = object;
    while (o && o !== this.surroundings) o = o.parent;
    if (!o) return null;
    // A thing the model has named for people (a custom property `label`, or `vehicle` on a car)
    // is that thing, however deep it sits: one car in a car park, not the car park.
    const thing = thingOf(object);
    if (thing && thing.object !== this.surroundings && !contains(thing.object, this.surroundings))
      return {
        name: thing.object.name,
        box: new THREE.Box3().setFromObject(thing.object),
        title: thing.label,
        ...(thing.about ? { about: thing.about } : {}),
      };
    for (let o: THREE.Object3D | null = object; o && this.surroundings; o = o.parent) {
      if (o.parent !== this.surroundings && o.parent?.parent !== this.surroundings) continue;
      if (!o.name || (o as THREE.Mesh).isMesh) continue;
      const box = new THREE.Box3().setFromObject(o);
      // a building is looked at whole; a road or a row of poles, where it was clicked
      if (box.getSize(new THREE.Vector3()).length() > PLACE)
        box.setFromCenterAndSize(point, new THREE.Vector3(PLACE, 6, PLACE).multiplyScalar(0.5));
      return { name: o.name, box };
    }
    return null;
  }

  /**
   * The middle of the window pane that `point` is on, not where the pointer happened to land:
   * the mean of the mesh's vertices within arm's reach of the point (one mesh may hold several windows).
   */
  private paneCentre(mesh: THREE.Mesh, point: THREE.Vector3): THREE.Vector3 {
    const at = mesh.geometry.getAttribute('position');
    const centre = new THREE.Vector3();
    const v = new THREE.Vector3();
    let n = 0;
    for (let i = 0; i < at.count; i++) {
      mesh.localToWorld(v.fromBufferAttribute(at, i));
      if (v.distanceTo(point) > 0.6) continue;
      centre.add(v);
      n++;
    }
    return n ? centre.divideScalar(n) : point.clone();
  }

  private setHover({ node, model, pane, place, thing }: Picked): void {
    if (model !== this.hoveredModel) {
      this.hoveredModel = model;
      this.onHoverModel(model);
    }
    if ((place?.name ?? null) !== this.hoveredPlace)
      this.onHoverPlace((this.hoveredPlace = place?.name ?? null), place?.title, place?.about);
    if (Boolean(pane) !== this.overPane) this.onHoverWindow((this.overPane = Boolean(pane)));
    this.canvas.style.cursor = node || model || pane || place ? 'pointer' : 'grab';
    const thingChanged = (thing?.object ?? null) !== this.hoveredThing;
    this.hoveredThing = thing?.object ?? null;
    if (node !== this.hovered) {
      this.highlight(node);
      this.onHover(node);
    }
    // (after the part: a named object inside it is what the label is about)
    if (thingChanged || (thing && node !== this.hovered)) this.onHoverThing(thing ?? null);
  }
  private resize(): void {
    const w = this.canvas.clientWidth,
      h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.fitPixels();
    this.quality.rest(performance.now(), 3000); // (every target is made again: slow for a moment, and not the machine's pace)
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.refollow(); // a framing made for the old shape no longer fits
  }

  /**
   * The drawing's pixels for the canvas as it is: the screen's own, up to two a CSS pixel, times what the net under the
   * frame rate allows (quality.ts: 1 on a machine that keeps up). The canvas keeps its place and size on the page.
   */
  private fitPixels(scale = this.pixelScale): void {
    const w = this.canvas.clientWidth,
      h = this.canvas.clientHeight;
    if (!w || !h) return;
    // a phone's GPU has four times the pixels to fill per inch and a fraction of the power
    const coarse = matchMedia('(pointer: coarse)').matches;
    const full = Math.min(window.devicePixelRatio, coarse ? 1.5 : 2);
    this.quality.setFull(full);
    this.pixelScale = scale;
    this.renderer.setPixelRatio(full * scale);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    this.bloom.fit(w, h);
    this.dirty = true;
  }

  /** The stars are points sized in the drawing's pixels: told when those change, or the sky does, so they keep their size on the screen. */
  private sizeStars(sky: THREE.Scene): void {
    const ratio = this.renderer.getPixelRatio();
    if (this.starsFor.ratio === ratio && this.starsFor.sky === sky) return;
    this.starsFor = { ratio, sky };
    sky.traverse((o) => {
      const uniform = ((o as THREE.Points).material as THREE.ShaderMaterial | undefined)?.uniforms?.uPixel;
      if ((o as THREE.Points).isPoints && uniform) uniform.value = ratio;
    });
  }

  /**
   * For the diagnostics readout: how fast the loop is turning over and what a drawn frame costs.
   * `fps` is the loop (what motion would get); `drawn` is how many of those frames were actually
   * drawn, since a still view is not redrawn.
   */
  stats(): { fps: number; drawn: number; ms: number; triangles: number; calls: number; levels: number[]; scale: number } {
    const now = performance.now();
    const seconds = Math.max(1e-3, (now - this.statsAt) / 1000);
    const out = {
      fps: this.frames / seconds,
      drawn: this.drawn / seconds,
      ms: this.frames ? this.work / this.frames : 0,
      triangles: this.renderer.info.render.triangles,
      calls: this.renderer.info.render.calls,
      levels: this.staged.map((s) => s.shownLevel),
      scale: this.pixelScale,
    };
    this.statsAt = now;
    this.frames = this.drawn = this.work = 0;
    return out;
  }

  private frame(): void {
    const began = performance.now();
    if (this.setting.attend?.(this.camera.position)) this.dirty = true;
    if (this.lamps.near(this.camera.position, false, this.frozen)) this.dirty = true; // the rooms nearest the eye are the ones lit
    // Hardware that has moved wants its shadows drawn again, in the same frame: a shadow drawn
    // a moment late lags behind what casts it and then jumps after it.
    if (this.shadowsOwed) {
      this.renderer.shadowMap.needsUpdate = true;
      this.shadowsOwed = false;
    }
    const drawn = this.drawn;
    this.step();
    this.frames++;
    this.work += performance.now() - began;
    // the pace of frames drawn one after another is what the net under the frame rate goes by (quality.ts)
    // A view that is still is always drawn at full: the frame after the last one that moved is drawn again at the
    // screen's own pixels, and the lowered resolution comes back only once it has been moving again for a few frames.
    if (this.drawn === drawn) {
      this.run = 0;
      this.quality.idle();
      if (this.pixelScale < 1) this.fitPixels(1);
    } else {
      if (this.run > 0 && this.quality.frame(began - this.frameAt, began)) this.run = Math.min(this.run, 3); // (taken up below)
      this.run++;
      if (this.run > 3 && this.pixelScale !== this.quality.scale) this.fitPixels(this.quality.scale);
    }
    this.frameAt = began;
    // (after the frame's own work is counted: a frame that drew nothing has time to spare, one that took under half its time has a little)
    if (this.treesOwed.size) {
      if (this.drawn === drawn) this.growTrees(6, true);
      else if (performance.now() - began < 8) this.growTrees(1.5, false);
    }
  }

  private step(): void {
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.1);
    // the simulation's clock: the setting follows it, and says when that is worth showing
    if (this.clock) {
      this.clock.advance(dt);
      // (over the globe, the height is above the sea under the eye, which downrange is far below the site's level)
      const height = this.setting.globe?.altitude(this.camera.position) ?? this.camera.position.y - GROUND_Y;
      const change = this.setting.at?.(this.clock.jdUT, height);
      if (change) this.relight(change.shadows);
    }
    this.follow(dt);
    this.lift();
    if (this.clock) this.cabin?.step(dt, this.clock.t, this.clock.jdUT, this.renderer.toneMappingExposure);
    this.settle(dt);
    this.runWorks(dt);
    this.runFunctions(dt);
    if (this.walk.active) this.stepWalk(dt);
    else {
      if (!this.cam.ownsLens && this.walk.lens(dt)) this.dirty = true; // after a walk the lens closes again over half a second
      // the camera: the rig in charge moves, and says where the view is from (the near plane is fitted after, fitDepth)
      this.cam.update(dt);
      this.camStepped += dt;
      if (this.indoors > 0) this.adapt(dt, false); // (off foot again: the eye goes back to the day)
      this.lookWatched();
      this.shadeCraft();
      this.fitDetail(dt);
      if (this.pointerDirty && !this.down) {
        this.pointerDirty = false;
        const under = this.inert || this.veiled ? NOTHING : this.pick();
        // (from the seat a part is not something to choose: only what is in reach is, and a window to look out of)
        // (and nothing is named over a view being looked through: what it is has been said in the note line)
        this.setHover(this.cam.rig === 'onboard' ? (this.lookingOut ? NOTHING : { ...under, node: null, model: null }) : under);
      }
      this.fitDepth(dt);
    }
    const { backdrop } = this.setting;
    if (!this.frozen) {
      backdrop.update(dt);
      this.setting.tick?.(dt);
    }
    backdrop.scene.visible = !this.frozen;
    backdrop.camera.quaternion.copy(this.camera.quaternion);
    if (backdrop.camera.aspect !== this.camera.aspect || backdrop.camera.fov !== this.camera.fov) {
      backdrop.camera.fov = this.camera.fov; // the walker's lens is wider, and the sky must turn with the ground
      backdrop.camera.aspect = this.camera.aspect;
      backdrop.camera.updateProjectionMatrix();
    }
    // Draw only what has changed. A still view of a place where something moves by itself
    // (surf, cloud) is redrawn a dozen times a second, which is enough for scenery; a still
    // view of anything else is not redrawn at all.
    this.camera.updateMatrixWorld();
    const moved = !this.lastView.equals(this.camera.matrixWorld) || !this.lastProjection.equals(this.camera.projectionMatrix);
    this.sinceDrawn += dt;
    const ambient = this.frozen ? 0.5 : 1 / 12;
    if (!(this.dirty || moved || this.renderer.shadowMap.needsUpdate || this.sinceDrawn >= ambient)) return;
    if (this.held) return;
    // A frozen frame owes nothing to an earlier one: its shadow maps are drawn with it. (Kept, a map is of the scene
    // as it stood when something last asked: plants in the forms the eye was then near enough for, for one.)
    if (this.frozen) this.renderer.shadowMap.needsUpdate = true;
    this.lastView.copy(this.camera.matrixWorld);
    this.lastProjection.copy(this.camera.projectionMatrix);
    this.dirty = false;
    this.ink.range(this.camera);
    this.renderer.info.reset();
    this.drawn++;
    this.setting.view?.(this.camera);
    this.sizeStars(backdrop.scene);
    const unshake = this.shaker?.(this.camera, backdrop.camera);
    const walking = this.walk.active ? (this.staged[this.walked]?.group ?? null) : null;
    this.shadowCache.figure = walking;
    if (walking) this.walkEnded = 0;
    else if (this.walkEnded && performance.now() - this.walkEnded > 30_000) this.freeWalkShadows();
    this.far.before(walking, this.frozen);
    if (this.lookingAt && !this.cam.onboard.looking) this.lookOut(null); // (the hands took the head back)
    this.cabin?.see(); // (what its periscope shows, drawn first: the screen is part of this frame)
    // (a frozen stage keeps nothing of an earlier frame: the clouds' blend with their last frames is the one thing that would)
    (this.clouds as { frozen?: boolean }).frozen = this.frozen;
    this.bloom.before();
    this.origin.draw(() => this.composer.render(this.sinceDrawn));
    this.far.after();
    unshake?.();
    if (this.composer.readBuffer !== this.frameTarget) this.composer.swapBuffers(); // (the ink pass changed them over: see the constructor)
    this.sinceDrawn = 0;
  }

  /**
   * Get down and walk as one of the flight's figures (`model`: a model with a `walker`; left out,
   * the first there is). The camera becomes its eyes, where it stands, looking the way it faces,
   * and the keys and the mouse become the walker's (walk.ts). The figure itself is put away
   * while you are it. Eye height and stature are the model's own: the middle of the node its
   * `walker.eyes` names above its soles, and the top of its bounds; they are as good as the model.
   */
  enterWalk(model?: string, from?: THREE.Vector3): boolean {
    const at = this.defs.findIndex((m) => m.walker && (!model || m.id === model));
    if (at < 0 || !this.root || this.walk.active) return false;
    if (from) {
      // put the figure there first: the walk starts wherever the figure stands
      const figure = this.staged[at]!;
      figure.group.position.copy(from);
      figure.group.updateMatrixWorld(true);
      figure.measure();
    }
    this.onWalk(true, this.defs[at]!.id);
    this.following = null;
    this.cam.keys.clear();
    this.down = null;
    this.setHover(NOTHING);
    this.highlight(null, null);
    this.embody(at);
    return true;
  }

  /**
   * What is under the pointer, anywhere: on a model, in the place round it, or on the ground.
   * `floor` says whether it is something to stand on (it faces up).
   */
  private spot(): { point: THREE.Vector3; floor: boolean } | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster
      .intersectObjects(
        [
          ...this.staged.map((s) => s.shown),
          ...(this.surroundings ? [this.surroundings] : []),
          ...(this.setting.floor ? [this.setting.floor] : []),
        ],
        true,
      )
      .find((h) => h.face && !(h.object as THREE.InstancedMesh).isInstancedMesh);
    if (!hit?.face) return null;
    const up = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).y;
    return { point: hit.point.clone(), floor: up > 0.7 };
  }

  /** The model being walked as, or null. */
  get walkingAs(): string | null {
    return this.defs[this.walked]?.id ?? null;
  }

  /**
   * While walking as one figure, become another (a model with a `walker`): the first is left
   * standing where it was walked to, and the walk goes on from where the second stands.
   */
  becomeWalk(model: string): boolean {
    const at = this.defs.findIndex((m) => m.walker && m.id === model);
    if (at < 0 || !this.walk.active || at === this.walked) return false;
    this.standFigure();
    this.embody(at);
    return true;
  }

  /** Put the walker in a figure's place: its eyes, its height, the way it faces. The figure itself is put away. */
  private embody(at: number): void {
    const walker = this.defs[at]!.walker!;
    this.walked = at;
    this.setAim(null);
    const figure = this.staged[at]!;
    this.scene.updateMatrixWorld(true);
    const feet = figure.group.getWorldPosition(new THREE.Vector3());
    const height = new THREE.Box3().setFromObject(figure.full).max.y - feet.y;
    const eyes = walker.eyes ? figure.full.getObjectByName(walker.eyes) : undefined;
    const eye = eyes ? new THREE.Box3().setFromObject(eyes).getCenter(new THREE.Vector3()).y - feet.y : height * EYE_FRACTION;
    // you look the way the figure faces: its own forward, turned as the model is turned on the stage
    const [fx, fz] = walker.forward ?? [0, 1];
    const toward = new THREE.Vector3(fx, 0, fz).transformDirection(figure.group.matrixWorld).setY(0).setLength(10).add(feet);
    figure.group.visible = false;
    this.unseen = false;
    this.leftBehind(at, false);
    // what it carries goes into its hands, at every level of detail, and its arms know the weight
    this.walk.gait.load.L = this.walk.gait.load.R = 0;
    for (const level of figure.group.children)
      for (const carry of this.carriesOf(level, at)) {
        carry.take();
        if (carry.ready) this.walk.gait.load[carry.hand] = 1;
      }
    this.renderer.shadowMap.needsUpdate = true; // its shadow goes with it
    this.dirty = true;
    this.walk.start(feet, toward, eye, height, walker.radius);
    this.fitWalkShadows(true);
  }

  /** The figure being walked as is stood where it was walked to, facing the way it was looking, and can be seen again. */
  private standFigure(): void {
    const at = this.walked;
    const figure = this.staged[at];
    if (!figure) return;
    figure.group.position.copy(this.walk.body.position);
    figure.group.rotation.y = this.facing(at);
    this.tumble = null;
    for (const level of figure.group.children) this.walk.gait.rest(level); // standing as it was built, at every level of detail
    this.shadowOnly(figure.group, (this.unseen = false));
    for (const level of figure.group.children) for (const carry of this.carriesOf(level, at)) carry.putDown();
    this.walk.gait.load.L = this.walk.gait.load.R = 0;
    this.leftBehind(at, true);
    figure.group.visible = true;
    figure.group.updateMatrixWorld(true);
    figure.measure();
    this.fitBounds();
  }

  /** Stop walking: the figure is back where it stood, and the orbiting camera takes over from where the walker was looking. */
  exitWalk(): void {
    if (!this.walk.active) return;
    const at = this.walked;
    if (this.boarded) this.leaveSeat(); // (out of a couch first, back where he boarded it)
    if (this.wheel) {
      // leaving the walk from a driving seat: out at once, no ceremony
      const vehicle = this.wheel;
      this.wheel = null;
      this.boarding = null;
      this.walk.sit(null, vehicle.standing(new THREE.Vector3()));
    }
    this.standFigure();
    this.setAim(null);
    this.walk.stop();
    this.walked = -1;
    this.walkEnded = performance.now();
    // the camera takes the view up from this very place, turning about a point a few steps ahead, so the flight back starts from here
    this.cam.adopt(this.camera.position.clone().add(this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(3)));
    this.renderer.shadowMap.needsUpdate = true;
    this.dirty = true;
    this.onWalk(false, this.defs[at]?.id ?? '');
  }

  /**
   * What a ray from the walker's eyes has met, in the flight's terms: which model and part, whether
   * it is a window, or which place in the surroundings. Null for scenery that is nothing in particular.
   */
  /**
   * The doors and lifts a model marks on its own nodes (extras `door` with a `swing` in degrees
   * about the vertical, anticlockwise from above; `lift` with the heights of its `stops`), as
   * the Actions they amount to: the door `mesh` is part of, and every lift under the same
   * top-level node (a lift is called from anywhere on its structure). `root` is the model.
   */
  private markedOn(mesh: THREE.Object3D, root: THREE.Object3D): Target['marked'] {
    const actions: Action[] = [];
    let top: THREE.Object3D = mesh;
    for (let o: THREE.Object3D | null = mesh; o && o !== root; o = o.parent) {
      if (o.name) top = o;
      if (o.userData.door && o.name)
        actions.push({
          id: `door:${o.name}`,
          label: 'Open',
          do: {
            kind: 'toggle',
            back: 'Close',
            moves: [
              {
                kind: 'swing',
                node: o.name,
                axis: [0, 1, 0],
                angle: THREE.MathUtils.degToRad(Number(o.userData.swing) || 100),
                from: 0,
                to: 1,
              },
            ],
          },
        });
    }
    let lifts = this.lifts.get(top);
    if (!lifts) {
      lifts = [];
      top.traverse((o) => {
        // a stop is a height above where the car was built, or [across, up] where the car also shifts
        // sideways as it rises (up a leaning leg), or all three; in metres, in the car's parent's frame
        const stops = o.userData.stops as (number | number[])[] | undefined;
        if (!o.userData.lift || !o.name || !Array.isArray(stops)) return;
        const names = o.userData.stop_names as string[] | undefined;
        lifts!.push({
          id: `lift:${o.name}`,
          label: 'Call the lift',
          do: {
            kind: 'lift',
            node: o.name,
            stops: stops.map((stop, i) => {
              const [a = 0, b = 0, c = 0] = typeof stop === 'number' ? [0, stop] : stop.length === 2 ? [stop[0], stop[1]] : stop;
              return { name: names?.[i] ?? (i ? `level ${i}` : 'the bottom'), by: [a, b, c] as [number, number, number] };
            }),
          },
        });
      });
      this.lifts.set(top, lifts);
    }
    actions.push(...lifts);
    return actions.length && top.name ? { under: top.name, actions } : undefined;
  }

  private targetOf(hit: Hit): { target: Target; box?: THREE.Box3 } | null {
    const material = hit.mesh.material as THREE.Material | THREE.Material[];
    const pane = (Array.isArray(material) ? material[0] : material)?.name.startsWith('glass') || undefined;
    const climb = Boolean(hit.mesh.userData.climb || hit.mesh.parent?.userData.climb) || undefined;
    const place = this.placeOf(hit.mesh, hit.point);
    if (place) return { target: { place: place.name, pane, climb, marked: this.markedOn(hit.mesh, this.surroundings!) }, box: place.box };
    const names: string[] = [];
    for (let o: THREE.Object3D | null = hit.mesh; o; o = o.parent) {
      const at = this.staged.findIndex((s) => s.shown === o);
      if (at < 0) {
        names.push(o.name);
        continue;
      }
      const def = this.defs[at]!;
      return {
        target: {
          model: def.id,
          node: def.parts.find((p) => names.includes(p.node))?.node,
          pane,
          climb,
          path: names.filter(Boolean),
          marked: this.markedOn(hit.mesh, o),
        },
      };
    }
    return pane || climb ? { target: { pane, climb } } : null;
  }

  private setAim(aim: Stage['aim']): void {
    const changed = !sameTarget(aim?.target ?? null, this.aim?.target ?? null);
    this.aim = aim;
    if (changed) this.onWalkTarget(aim?.target ?? null);
  }

  /** While walking: lean in to the window being looked at, and look through it. */
  walkLookIn(): void {
    const hit = this.aim?.hit;
    if (!hit || !this.aim?.target.pane) return;
    const centre = this.paneCentre(hit.mesh, hit.point);
    this.walk.peek(centre.clone().addScaledVector(hit.normal, 0.4), hit.normal.clone().negate());
  }

  /** While walking: get onto the ladder being looked at, from its foot or from the deck at its top. */
  walkClimb(): void {
    const hit = this.aim?.hit;
    if (hit && this.aim?.target.climb) this.walk.body.mount(this.walk.solids.ladderOf(hit.mesh));
  }

  /** Is the walker at the wheel of something? */
  get driving(): boolean {
    return this.wheel !== null;
  }

  /**
   * While walking: get into the vehicle being looked at and drive it (drive.ts). The walking
   * keys become its pedals and wheel, the eyes are at its driver's seat, and it is not in its
   * own way. False if it has nowhere to sit.
   */
  walkDrive(): boolean {
    const root = this.aim?.vehicle;
    if (!root || this.wheel || this.boarding) return false;
    let vehicle = this.vehicles.get(root);
    if (!vehicle) this.vehicles.set(root, (vehicle = new Vehicle(root)));
    if (!vehicle.drivable) return false;
    // through the driver's door, if it has one: it opens, he gets in, it shuts
    const door = vehicle.door ? this.doorOf(vehicle.door) : null;
    if (door && !this.works.isOpen(door.key)) this.works.toggle(door.key, door.action, door.levels, door.under);
    this.boarding = { vehicle, out: false, t: door ? 0 : DOOR_SECONDS, door };
    this.walk.hold(
      () => {},
      () => {},
    );
    this.setAim(null);
    return true;
  }

  /** The working of a door a model marks (`door`, `swing`): the same one the wheel's Open and Close use, so the two agree on how it stands. */
  private doorOf(node: THREE.Object3D): { key: string; action: Action; levels: THREE.Object3D[]; under: string } | null {
    let at = -1;
    let root: THREE.Object3D | null = null;
    for (let o: THREE.Object3D | null = node; o && !root; o = o.parent) {
      at = this.staged.findIndex((s) => s.shown === o);
      if (at >= 0 || o === this.surroundings) root = o;
    }
    if (!root) return null;
    // the flight's own working of that door, where it declares one, is the one its Open and Close use
    const model = at >= 0 ? this.defs[at]!.id : '';
    for (const part of at >= 0 ? this.defs[at]!.parts : [])
      for (const action of part.actions ?? [])
        if (action.do.kind === 'toggle' && action.do.moves[0]?.node === node.name)
          return { key: `${model}/${part.node}/${action.id}`, action, levels: this.levelsOf(model), under: part.node };
    const marked = this.markedOn(node, root);
    const action = marked?.actions.find((a) => a.id === `door:${node.name}`);
    if (!marked || !action) return null;
    return { key: `${model}/${marked.under}/${action.id}`, action, levels: this.levelsOf(model), under: marked.under };
  }

  /** A frame of getting in or out: once the door has swung, the figure changes places and the door is shut behind it. */
  private board(dt: number): void {
    const b = this.boarding;
    if (!b) return;
    b.t += dt;
    if (b.t < DOOR_SECONDS) return;
    this.boarding = null;
    this.walk.release();
    if (b.out) {
      this.wheel = null;
      b.vehicle.motion.speed = 0;
      this.walk.sit(null, b.vehicle.standing(new THREE.Vector3()));
    } else this.takeWheel(b.vehicle);
    if (b.door && this.works.isOpen(b.door.key)) this.works.toggle(b.door.key, b.door.action, b.door.levels, b.door.under);
  }

  /** The model and part a vehicle's node is, if it is one of a model's parts (not scenery). */
  private ownerOf(node: THREE.Object3D): { at: number; node: string } | null {
    for (let o: THREE.Object3D | null = node.parent; o; o = o.parent) {
      const at = this.staged.findIndex((s) => s.group === o);
      if (at >= 0) return this.defs[at]!.parts.some((p) => p.node === node.name) ? { at, node: node.name } : null;
    }
    return null;
  }

  /** Why the vehicle at the wheel will not move, if it will not: the interlocks of the function that drives it, if it is a part that has one. */
  get wheelRefusal(): string | null {
    const root = (this.wheel ?? this.boarding?.vehicle)?.root;
    const owner = root && this.ownerOf(root);
    if (!owner) return null;
    const def = this.defs[owner.at]!;
    return this.functions(def.id, owner.node).find((f) => f.fn.nodes.includes(owner.node))?.refused ?? null;
  }

  /** Put a vehicle's pieces in its model's other levels of detail where they are in the one being driven. */
  private mirror(root: THREE.Object3D): void {
    let pairs = this.twins.get(root);
    if (!pairs) {
      pairs = [];
      const owner = this.ownerOf(root);
      for (const level of owner ? this.staged[owner.at]!.group.children : []) {
        const twin = level.getObjectByName(root.name);
        if (!twin || twin === root) continue;
        const named = new Map<string, THREE.Object3D>();
        twin.traverse((o) => o.name && named.set(o.name, o));
        root.traverse((o) => {
          const other = named.get(o.name);
          if (other) pairs!.push([o, other]);
        });
      }
      this.twins.set(root, pairs);
    }
    for (const [from, to] of pairs) {
      to.position.copy(from.position);
      to.quaternion.copy(from.quaternion);
    }
  }

  /** Sitting: how far he has sunk into the cushion (seatFit), where his eyes are in the seat's frame, and in his head's. */
  private sunk = 0;
  /** How far the first thing over the seat's hip point is above it, metres. */
  private headroom = Number.POSITIVE_INFINITY;
  private seatEyes: THREE.Vector3 | null = null;
  private headEye: THREE.Vector3 | null = null;

  /** One of the fifteen joints of a figure's level of detail, by name. */
  private jointOf(root: THREE.Object3D, joint: string): THREE.Object3D | undefined {
    let found: THREE.Object3D | undefined;
    const key = jointKey(joint);
    root.traverse((o) => {
      if (!found && jointKey(o.name) === key) found = o;
    });
    return found;
  }

  /** Sit the walker at a vehicle's wheel: the keys are its pedals and wheel from now on. */
  private takeWheel(vehicle: Vehicle): void {
    const root = vehicle.root;
    vehicle.read();
    this.wheel = vehicle;
    const walk = this.walk;
    // How he fits: the first thing over the seat's hip point (before the vehicle is left out of the
    // solids) against the top of his head over his hips. A tall man sinks and leans back (seatFit).
    const shown = this.staged[this.walked]?.shown ?? this.scene;
    const hip = vehicle.hips(new THREE.Vector3());
    walk.solids.gather(hip, 1, 0.5, 2.5);
    // (straight up from the hips, past the steering wheel if that is over them)
    const up = new THREE.Vector3(hip.x, hip.y + 0.15, hip.z);
    let roof = walk.solids.cast(up, UP, 2.5);
    for (let i = 0; roof && vehicle.steers(roof.mesh) && i < 3; i++) roof = walk.solids.cast(up.setY(roof.point.y + 0.01), UP, 2.5);
    this.headroom = roof ? roof.point.y - hip.y : Number.POSITIVE_INFINITY;
    const fit = seatFit(walk.body.height - walk.gait.hipHeight(shown), this.headroom);
    walk.gait.recline = fit.recline;
    this.sunk = fit.drop;
    this.seatEyes = null;
    // where the eyes are in the head: measured off the figure as it stands at the door
    const head = this.jointOf(shown, 'Head');
    if (head) {
      head.updateWorldMatrix(true, false);
      const feet = walk.body.position;
      this.headEye = head.worldToLocal(head.getWorldPosition(new THREE.Vector3()).setY(feet.y + walk.eye));
      this.headEye.z += 0.09; // (in front of the neck's pivot)
    } else this.headEye = null;
    walk.solids.without = root;
    const road = {
      ground: (x: number, z: number, near: number) => walk.solids.below(x, near + 0.6, z, this.groundAt(x, z)),
      ahead: (from: THREE.Vector3, way: THREE.Vector3, far: number) => walk.solids.cast(from, way, far)?.distance ?? null,
    };
    const driven = vehicle;
    // a part of a model (a truck the script drives off) is taken out of the slider's hands while it is driven, and left where it is driven to
    const owner = this.ownerOf(root);
    if (owner) {
      this.driven.set(`${owner.at}/${root.name}`, owner);
      this.staged[owner.at]!.loosen(root.name, true);
    }
    walk.sit({
      drive: (pedal, steer, dt) => {
        // (it will not move while its interlocks say no: a tower up, its legs down)
        driven.drive(this.wheelRefusal ? 0 : pedal, steer, dt, road);
        if (driven.motion.speed || driven.motion.steer) {
          if (owner) this.mirror(root);
          this.dirty = true;
          this.renderer.shadowMap.needsUpdate = true;
        }
      },
      // a sitter's eyes are where the posed head has them, in the seat's frame (so they go with it at once); until it has been posed, as far over the hips as standing
      eyes: (to) =>
        this.seatEyes
          ? driven.fromSeat(to.copy(this.seatEyes))
          : driven.hips(to).setY(to.y + walk.eye - walk.gait.hipHeight(this.staged[this.walked]?.shown ?? this.scene)),
      facing: () => driven.motion.heading,
      chase: () => driven.chase(this.camera.position),
    });
    this.setAim(null);
  }

  /** In a place in a model (ModelDef.seats): which, the node the eyes are carried by, and where the walker stood to board it. */
  private boarded: {
    model: string;
    seat: NonNullable<ModelDef['seats']>[number];
    node: THREE.Object3D;
    from: THREE.Vector3;
    facing: number;
  } | null = null;

  /** The place in a model the walker is in, if it is in one. */
  get seated(): { model: string; seat: string; label: string } | null {
    const b = this.boarded;
    return b && { model: b.model, seat: b.seat.node, label: b.seat.label };
  }

  /**
   * While walking: take a place in a model (a couch). Refused, with the reason, outside the time
   * it could be boarded: the clock is not moved for it. The eyes go to the place's, its view is
   * the walker's to turn, and E (leaveSeat) gets out again where he got in.
   */
  boardSeat(model: string, name: string): string | null {
    const at = this.defs.findIndex((m) => m.id === model);
    const seat = this.defs[at]?.seats?.find((s) => s.node === name);
    if (!seat || this.wheel || this.boarded || !this.walk.active) return 'there is nowhere to sit';
    const now = this.clock?.t ?? 0;
    if (now < seat.open[0] || now > seat.open[1]) {
      // (as the count would say it: T− hours and minutes)
      const span = (t: number) =>
        `T${t < 0 ? '−' : '+'}${Math.floor(Math.abs(t) / 3600)} h ${String(Math.floor((Math.abs(t) % 3600) / 60)).padStart(2, '0')} min`;
      return `${seat.label} could be boarded from ${span(seat.open[0])} to ${span(seat.open[1])}`;
    }
    const place = this.seatNode(at, seat);
    if (!place) return 'there is nowhere to sit';
    const node: THREE.Object3D = place;
    node.updateWorldMatrix(true, false);
    const ahead = new THREE.Vector3(0, 0, 1).transformDirection(node.matrixWorld);
    // (looking nearly straight up or down, which way is ahead over the ground is the way the place's top points)
    const flat = Math.hypot(ahead.x, ahead.z) > 0.2 ? ahead : new THREE.Vector3(0, 1, 0).transformDirection(node.matrixWorld);
    const facing = Math.atan2(-flat.z, flat.x);
    this.boarded = { model, seat, node, from: this.walk.body.position.clone(), facing };
    this.showSeatHidden(at, seat.hide, false);
    const eye = new THREE.Vector3(...(seat.eye ?? [0, 0, 0]));
    this.walk.sit({ drive: () => {}, eyes: (to) => node.localToWorld(to.copy(eye)), facing: () => facing });
    this.walk.pitch = THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(ahead.y, -1, 1)), -1.45, 1.45);
    this.setAim(null);
    this.dirty = true;
    return null;
  }

  /** The node a seat is (ModelDef.seats): the model's own, or, until the model has one, a placeholder made at the middle of its stand-in, facing along `look`. */
  private seatNode(at: number, seat: NonNullable<ModelDef['seats']>[number]): THREE.Object3D | null {
    const level = this.staged[at]?.full;
    if (!level) return null;
    let place = level.getObjectByName(seat.node);
    if (!place && seat.standIn) {
      const mesh = level.getObjectByName(seat.standIn.mesh);
      if (!mesh?.parent) return null;
      level.updateWorldMatrix(true, true);
      const middle = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
      const look = new THREE.Vector3(...seat.standIn.look).transformDirection(level.matrixWorld);
      place = new THREE.Object3D();
      place.name = seat.node;
      mesh.parent.add(place);
      place.position.copy(mesh.parent.worldToLocal(middle));
      const parent = mesh.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
      const turn = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), look);
      if (seat.standIn.up) {
        // (+Z along `look`, +Y as near `up` as that allows)
        const up = new THREE.Vector3(...seat.standIn.up).transformDirection(level.matrixWorld);
        const across = new THREE.Vector3().crossVectors(up, look).normalize();
        turn.setFromRotationMatrix(new THREE.Matrix4().makeBasis(across, new THREE.Vector3().crossVectors(look, across), look));
      }
      place.quaternion.copy(parent.multiply(turn));
      console.info(`seat ${seat.node}: a placeholder at the middle of ${seat.standIn.mesh}; the model has no such node`);
    }
    return place ?? null;
  }

  /** Out of the place taken (boardSeat), standing where he boarded it from. */
  leaveSeat(): void {
    const b = this.boarded;
    if (!b) return;
    this.boarded = null;
    this.showSeatHidden(
      this.defs.findIndex((m) => m.id === b.model),
      b.seat.hide,
      true,
    );
    this.walk.sit(null, b.from);
    const figure = this.staged[this.walked];
    if (figure) figure.group.visible = true;
    this.renderer.shadowMap.needsUpdate = true;
    this.dirty = true;
  }

  private showSeatHidden(at: number, names: string[] | undefined, shown: boolean): void {
    if (names?.length) this.staged[at]?.group.traverse((o) => names.includes(o.name) && (o.visible = shown));
  }

  /** While driving: get out (the door opens first, and shuts behind), and stand beside the driver's door. */
  walkAlight(): void {
    const vehicle = this.wheel;
    if (!vehicle || this.boarding) return;
    vehicle.motion.speed = 0;
    const door = vehicle.door ? this.doorOf(vehicle.door) : null;
    if (door && !this.works.isOpen(door.key)) this.works.toggle(door.key, door.action, door.levels, door.under);
    this.boarding = { vehicle, out: true, t: door ? 0 : DOOR_SECONDS, door };
    this.walk.hold(
      () => {},
      () => {},
    );
  }

  /** While walking: stop, and go and look at the place in the surroundings that was being looked at. */
  walkVisit(): void {
    const box = this.aim?.box;
    this.exitWalk();
    if (box) this.visit(box);
  }

  /** Run a model along its slider to `to` (0 to 1), at the pace it always moves: what an Action of kind `slider` does. */
  operate(model: string, to: number): void {
    const at = this.defs.findIndex((m) => m.id === model);
    const sequence = this.defs[at]?.sequence;
    // on the clock, running a model along its slider is going to that moment: the hardware follows, and so does the Sun
    if (sequence && this.clock) this.clock.seek(timeAt(sequence, THREE.MathUtils.clamp(to, 0, 1)));
    else if (at >= 0) this.apartGoal[at] = this.apartOwn[at] = THREE.MathUtils.clamp(to, 0, 1);
  }

  /** The functions of one part of a model (what it does, each workable by hand), with how far along each is and why it will not move, if it will not. */
  functions(model: string, node: string): { fn: Fn; value: number; refused: string | null }[] {
    const at = this.defs.findIndex((m) => m.id === model);
    const part = this.defs[at]?.parts.find((p) => p.node === node);
    if (!part) return [];
    let fns = this.fns.get(part);
    if (!fns) this.fns.set(part, (fns = functionsOf(part)));
    const value = (id: string) => {
      const fn = fns!.find((f) => f.id === id);
      return this.handset.get(`${at}/${id}`)?.v ?? (fn ? scriptedAt(fn, this.apart[at] ?? 0) : 0);
    };
    return fns.map((fn) => ({ fn, value: value(fn.id), refused: refusal(fn, value) }));
  }

  /**
   * Work a function by hand. `push` is 1 to run it toward the end of its travel, -1 back, 0 to
   * let go: it runs at its own pace for as long as it is pushed and eases to a stop. Returns why
   * it will not move, if it will not.
   */
  pushFunction(model: string, node: string, id: string, push: number): string | null {
    const found = this.functions(model, node).find((f) => f.fn.id === id);
    if (!found) return null;
    const at = this.defs.findIndex((m) => m.id === model);
    const key = `${at}/${id}`;
    if (push && found.refused) return found.refused;
    const held = this.handset.get(key) ?? { at, fn: found.fn, v: found.value, pace: 0, push: 0 };
    held.push = push;
    if (push) held.back = false; // taken in hand again
    this.handset.set(key, held);
    return null;
  }

  /** Put a function straight to a place along its travel (a slider in a panel). Returns where it now is: where it was, if it will not move. */
  setFunction(model: string, node: string, id: string, v: number): number {
    const found = this.functions(model, node).find((f) => f.fn.id === id);
    if (!found || found.refused) return found?.value ?? 0;
    const at = this.defs.findIndex((m) => m.id === model);
    this.handset.set(`${at}/${id}`, { at, fn: found.fn, v: THREE.MathUtils.clamp(v, 0, 1), pace: 0, push: 0 });
    this.poseFunction(at, found.fn, v);
    return v;
  }

  private poseFunction(at: number, fn: Fn, v: number | null): void {
    for (const node of fn.nodes) this.staged[at]?.hold(node, v === null ? null : sliderFor(fn, v));
    this.dirty = true;
    this.renderer.shadowMap.needsUpdate = true;
  }

  /** A frame of the functions worked by hand: those being pushed run, the rest stay; and all of them go back to the script when the script moves. */
  private runFunctions(dt: number): void {
    // a vehicle driven by hand goes back where the script has it when the script moves it, unless it is being driven
    if (this.scripted)
      for (const [key, { at, node }] of this.driven) {
        if (this.wheel?.root.name === node && this.ownerOf(this.wheel.root)?.at === at) continue;
        this.driven.delete(key);
        this.staged[at]?.loosen(node, false);
        this.dirty = true;
        this.renderer.shadowMap.needsUpdate = true;
      }
    if (!this.handset.size) return;
    let moved = false;
    for (const [key, held] of this.handset) {
      const { fn, at } = held;
      const script = scriptedAt(fn, this.apart[at] ?? 0);
      if (this.scripted && !held.push) held.back = true;
      if (held.back && !held.push) {
        // the script has moved the hardware: back to where it has this function, at the function's own pace (or in a few seconds, if that is longer), and let go
        const step = dt / Math.min(fn.seconds, 6);
        held.v = Math.abs(script - held.v) <= step ? script : held.v + Math.sign(script - held.v) * step;
        if (held.v === script) {
          this.handset.delete(key);
          this.poseFunction(at, fn, null);
        } else this.poseFunction(at, fn, held.v);
        moved = true;
        continue;
      }
      // pushed, it gathers its pace over a quarter of a second; let go, it loses it as quickly
      held.pace += (held.push - held.pace) * (1 - Math.exp(-dt / 0.2));
      if (!held.push && Math.abs(held.pace) < 0.01) held.pace = 0;
      // its lever is held over as far as it is being pushed, and springs back to the middle
      if (fn.lever && held.lever !== held.pace) this.swingLever(at, fn.lever, (held.lever = held.pace));
      if (!held.pace) continue;
      const to = THREE.MathUtils.clamp(held.v + (held.pace * dt) / fn.seconds, 0, 1);
      if (to === held.v) continue;
      held.v = to;
      this.poseFunction(at, fn, to);
      moved = true;
    }
    if (moved) this.fitBounds();
  }

  /** Hold a lever (Part.functions: lever) over by `k` of its swing, -1 to 1, at every level of detail. */
  private swingLever(at: number, name: string, k: number): void {
    for (const level of this.staged[at]?.group.children ?? []) {
      let found = this.levers.get(level);
      if (!found) this.levers.set(level, (found = new Map()));
      if (!found.has(name)) found.set(name, level.getObjectByName(name) ?? null);
      const lever = found.get(name);
      if (!lever) continue;
      const rest = ((lever.userData.rest as THREE.Quaternion | undefined) ??= lever.quaternion.clone());
      const axis = String(lever.userData.axis ?? 'z');
      const turn = THREE.MathUtils.degToRad(Number(lever.userData.swing) || 25) * k;
      lever.quaternion.copy(rest).multiply(spin.setFromAxisAngle(axis === 'x' ? X_AXIS : axis === 'y' ? UP : Z_AXIS, turn));
    }
    this.dirty = true;
  }

  /** The levels of detail of a model: an action moves the same node in each. */
  private levelsOf(model: string): THREE.Object3D[] {
    if (!model) return this.scenery?.all ?? (this.surroundings ? [this.surroundings] : []); // scenery: its levels, finest first
    return this.staged[this.defs.findIndex((m) => m.id === model)]?.group.children ?? [];
  }

  /**
   * Work something a part declares as an action (types.ts: Action): open or shut a toggle, or
   * send a lift to a stop (`'call'`: to the stop nearest the walker's feet).
   */
  workAction(model: string, node: string, action: Action, stop?: number | 'call'): void {
    const key = `${model}/${node}/${action.id}`;
    const levels = this.levelsOf(model);
    if (action.do.kind === 'toggle') this.works.toggle(key, action, levels, node);
    else if (action.do.kind === 'lift') {
      const at = stop === 'call' || stop === undefined ? this.works.nearest(key, action, levels, node, this.walk.body.position.y) : stop;
      this.works.send(key, action, levels, node, at);
    }
  }

  /** How the doors and lifts stand: what the wheel needs to know to name their verbs. */
  readonly workings: Workings = {
    open: (model, node, action) => this.works.isOpen(`${model}/${node}/${action.id}`),
    stop: (model, node, action) => this.works.stopOf(`${model}/${node}/${action.id}`),
    riding: (model, node, action) =>
      this.standsOn(this.works.platform(`${model}/${node}/${action.id}`, action, this.levelsOf(model), node)),
  };

  /** Is the walker standing on (a mesh under) one of these nodes? */
  private standsOn(nodes: THREE.Object3D[]): boolean {
    const walk = this.walk;
    if (!walk.active || !walk.body.grounded || !nodes.length) return false;
    const from = walk.body.position.clone().setY(walk.body.position.y + 0.3);
    const under = walk.solids.cast(from, new THREE.Vector3(0, -1, 0), 0.7);
    for (let o: THREE.Object3D | null = under?.mesh ?? null; o; o = o.parent) if (nodes.includes(o)) return true;
    return false;
  }

  /** A frame of the doors and lifts: whatever is on its way goes on, and a lift takes the walker with it. */
  private runWorks(dt: number): void {
    const carried = this.works.step(dt);
    if (!carried) return;
    this.dirty = true;
    this.renderer.shadowMap.needsUpdate = true;
    // (whoever stands on a lift is carried by the walker's own rule: Walker.ride)
  }

  /** What one level of detail of a figure carries, as its flight says (ModelDef.walker.carries). */
  private carriesOf(level: THREE.Object3D, at: number): Carry[] {
    let made = this.carries.get(level);
    if (!made) {
      const defs = level.children.length ? (this.defs[at]!.walker?.carries ?? []) : [];
      made = defs.map((def) => new Carry(level, def, (mesh) => this.looks.add(mesh)));
      this.carries.set(level, made);
    }
    return made;
  }

  /** How a figure's model is turned on the stage to face the way the walker's body faces (which looks along (-sin, -cos) of its heading). */
  private facing(at: number): number {
    const [fx, fz] = this.defs[at]!.walker?.forward ?? [0, 1];
    return this.walk.heading + Math.PI - Math.atan2(fx, fz);
  }

  /** Show or hide what a figure does not take with it when it walks (walker.hide), at every level of detail. */
  private leftBehind(at: number, shown: boolean): void {
    const names = this.defs[at]!.walker?.hide;
    if (names?.length) this.staged[at]!.group.traverse((o) => names.includes(o.name) && (o.visible = shown));
  }

  /** The seat the figure is in, or was in and is still getting up out of. */
  private satIn: Vehicle | null = null;

  /**
   * Seen over the shoulder, the figure being walked as is drawn: where the walker's body is,
   * facing the way it is going, its limbs in the stride of the moment if its model has joints
   * (gait.ts) and rigid if it has not. Through its own eyes, or with the camera pressed up
   * against its head by a wall, it is not drawn.
   */
  private poseFigure(): void {
    const at = this.walked;
    const figure = this.staged[at];
    if (!figure) return;
    const walk = this.walk;
    const group = figure.group;
    // at the wheel of something it sits: its hips on the seat's hip point, its hands on the wheel and going round with it
    walk.gait.seated = this.wheel !== null;
    if (this.wheel) walk.gait.wheel = this.wheel.lock;
    // in a couch the figure is the model's own (the pilot built into it): the walker's is not drawn
    if (this.boarded) {
      if (group.visible) {
        group.visible = false;
        this.renderer.shadowMap.needsUpdate = true;
        this.dirty = true;
      }
      return;
    }
    if (this.fallen(figure, at)) return;
    // Through its own eyes the figure is still there for the light: it is drawn into the shadow
    // map and into nothing else, so you see your own shadow walk in front of you.
    const unseen = !walk.outside;
    const was = this.placedAs.copy(group.quaternion);
    const from = this.below.copy(group.position);
    // (on foot it is where the walker has it: a moment behind a body put on to a ladder or off one at once)
    group.rotation.set(0, this.facing(at), 0);
    group.position.copy(walk.stands);
    // the seat it is in, or is still getting up out of
    const sat = walk.gait.sitting;
    if (this.wheel) this.satIn = this.wheel;
    else if (!sat) this.satIn = null;
    const seat = this.satIn;
    if (seat) {
      // Seated, it is turned as the seat is (the seat has a figure's axes: a tilted seat tilts him)
      // and its hips are on the seat's hip point, sunk into the cushion as far as he must be to fit.
      // It goes between there and where it stands beside the door as its pose goes between sitting
      // and standing (sitAt): put in the seat at once, it stood upright in the cab for a moment.
      const [fx, fz] = this.defs[at]!.walker?.forward ?? [0, 1];
      const turn = seat.seatTurn(this.seatQ).multiply(spin.setFromAxisAngle(UP, -Math.atan2(fx, fz)));
      group.parent?.updateWorldMatrix(true, false);
      const parent = group.parent?.getWorldQuaternion(new THREE.Quaternion()) ?? new THREE.Quaternion();
      const hips = seat.hips(new THREE.Vector3()).addScaledVector(UP, -this.sunk);
      hips.sub(new THREE.Vector3(0, walk.gait.hipHeight(figure.shown), 0).applyQuaternion(turn));
      const stand = { position: group.position.clone(), quaternion: group.quaternion.clone() };
      // (at the wheel the walker's body is in the seat: he stands where he got in)
      if (this.wheel) {
        seat.standing(stand.position);
        group.parent?.worldToLocal(stand.position);
      }
      sitAt(
        group,
        stand,
        { position: group.parent ? group.parent.worldToLocal(hips) : hips, quaternion: parent.invert().multiply(turn) },
        sat,
      );
    }
    const placed = !group.visible || this.unseen !== unseen || !group.quaternion.equals(was) || !group.position.equals(from);
    group.visible = true;
    if (this.unseen !== unseen) this.shadowOnly(group, (this.unseen = unseen));
    // (getting up, the gait takes it from however it was lying to the first of the get-up: Gait.rise)
    walk.gait.apply(figure.shown);
    if (this.wheel) this.atTheWheel(figure.shown, group);
    if (walk.body.on && walk.gait.climbing > 0) this.onTheLadder(figure.shown, group);
    if (walk.down === 'rising' && walk.gait.rising === null) {
      walk.stand(group.position); // on its feet: the legs are the walker's again
      for (const level of group.children) for (const carry of this.carriesOf(level, at)) carry.pickUp(); // and what it dropped is in its hand again
    }
    this.carryOn(figure, at);
    // Breathing alone moves him by millimetres: seen from outside it is worth drawing, but
    // nobody's shadow is redrawn for it.
    if (placed || walk.stir === 2) this.far.nearOnly(); // its shadow walks with it (in the fine map: the far one leaves it out)
    if (placed || walk.stir === 2 || (walk.stir === 1 && !unseen)) this.dirty = true;
  }

  /**
   * Seated at a wheel and posed: the hands are put on its rim at ten to two (they go round with
   * it), and where the eyes are is taken off the posed head, in the seat's frame, for the view.
   */
  private atTheWheel(root: THREE.Object3D, group: THREE.Object3D): void {
    const wheel = this.wheel!;
    group.updateMatrixWorld(true);
    const left = new THREE.Vector3(1, 0, 0).transformDirection(group.matrixWorld);
    const toL = new THREE.Vector3();
    const toR = new THREE.Vector3();
    if (wheel.grips(left, toL, toR)) {
      reach(root, 'L', toL);
      reach(root, 'R', toR);
    }
    const head = this.headEye && this.jointOf(root, 'Head');
    if (!head) return;
    // (and always under its roof: a cab too low for him puts his helmet through it, not the view)
    this.seatEyes = wheel.toSeat(head.localToWorld(this.headEye!.clone()));
    this.seatEyes.y = Math.min(this.seatEyes.y, this.headroom - 0.12);
  }

  /**
   * On a ladder and posed: the feet are put on its rungs and the hands on the rungs above, each on the one its height
   * up the ladder gives it (gait.ts: `rungs`), as far as the pose is the climb's. The ladder is known by its box: the
   * rungs run across the middle of it, a foot apart from a foot above its foot.
   */
  private onTheLadder(root: THREE.Object3D, group: THREE.Object3D): void {
    const walk = this.walk;
    const on = walk.body.on!;
    const k = walk.gait.climbing;
    group.updateMatrixWorld(true);
    const at = rungs(walk.body.position.y - on.bottom);
    // (he faces the rungs: his left is across them)
    const left = new THREE.Vector3(-on.nz, 0, on.nx);
    const ankle = this.jointOf(root, 'Foot.L');
    // (the ankle over the sole, as the figure stands: its joint's height in the figure's own frame, as built)
    const sole = ankle ? Math.max(0.05, Math.min(0.15, walk.gait.ankleHeight(root))) : 0.1;
    const to = new THREE.Vector3();
    const now = new THREE.Vector3();
    for (const side of ['L', 'R'] as const) {
      const s = side === 'L' ? 1 : -1;
      // the ball of the foot on the rung: the ankle a little out from it and over it; a hand round the rung
      const foot = this.jointOf(root, `Foot.${side}`);
      if (foot) {
        to.set(on.x + on.nx * 0.06, on.bottom + at[`Foot.${side}`] + sole, on.z + on.nz * 0.06).addScaledVector(left, s * 0.1);
        step(root, side, foot.getWorldPosition(now).lerp(to, k));
      }
      const hand = this.jointOf(root, `Grip.${side}`) ?? this.jointOf(root, `Hand.${side}`);
      if (hand) {
        to.set(on.x + on.nx * 0.02, on.bottom + at[`Hand.${side}`], on.z + on.nz * 0.02).addScaledVector(left, s * 0.15);
        reach(root, side, hand.getWorldPosition(now).lerp(to, k));
      }
    }
  }

  /** What is in the figure's hands hangs plumb and swings a little behind the stride; a hose hangs from it. */
  private carryOn(figure: Staged, at: number, collide?: Collide): void {
    const carried = this.carriesOf(figure.shown, at);
    if (!carried.length) return;
    const walk = this.walk;
    figure.group.updateMatrixWorld(true);
    const now = pose(walk.gait.moment);
    const p = walk.body.position;
    // (down, there is no upright body to keep the hose out of)
    const body = walk.down ? null : { x: p.x, z: p.z, radius: 0.17, bottom: p.y, top: p.y + walk.eye - 0.25 };
    // a level of detail that has just come on show lays its hose afresh; and a hose still swinging after he has stopped is drawn until it hangs still
    const fresh = this.carriedLevel !== figure.shown;
    this.carriedLevel = figure.shown;
    for (const carry of carried) {
      if (fresh) carry.relay();
      // (one let go of in a fall is kept out of the world as the figure is)
      if (!carry.update(this.walkDt, now[`Hand.${carry.hand}`], walk.body.grounded ? p.y + 0.02 : null, body, collide ?? this.solid))
        continue;
      this.dirty = true;
      // (what he carries is part of him: on foot its shadow is the fine map's alone, as his is, and asking for all the
      // shadows had the far map drawn again ten times a second for a hose it leaves out)
      if (this.walk.active) this.far.nearOnly();
      else this.renderer.shadowMap.needsUpdate = true;
    }
  }

  /**
   * A figure off its feet. A fall the walker could not land (`walk.fell`) hands the figure to a
   * ragdoll, from the pose it hit in and at the speed it hit; while that tumbles the figure is
   * wherever its points are and the walker's body is held under its hips. When it lies still it
   * is turned over to the gait to get up: the figure's own place is moved to under its hips,
   * facing the way it lies, without moving a bone in the world, and the get-up starts from
   * there. True while the ragdoll has the figure (the caller has nothing to pose).
   */
  private fallen(figure: Staged, at: number): boolean {
    const walk = this.walk;
    const group = figure.group;
    const root = figure.shown;
    if (walk.fell) {
      const { velocity } = walk.fell;
      walk.fell = null;
      let doll = this.dolls.get(root);
      if (doll === undefined) {
        // its bones are measured standing as built, once; then it is put back in the pose it was in
        // (the joints only: the stride, the fall it is in, are the gait's still, or it would be thrown as it was built)
        group.position.copy(walk.body.position);
        group.rotation.y = this.facing(at);
        walk.gait.asBuilt(root);
        group.updateMatrixWorld(true);
        doll = Ragdoll.of(root);
        this.dolls.set(root, doll);
      }
      if (!doll) {
        walk.stand(walk.body.position); // a figure with no joints cannot go limp: it lands on its feet after all
        return false;
      }
      walk.gait.apply(root);
      group.updateMatrixWorld(true);
      doll.throw(velocity);
      this.tumble = doll;
      // what was in its hands goes as it hits, and lands on its own
      for (const carry of this.carriesOf(root, at)) carry.drop(velocity);
    }
    const doll = this.tumble;
    if (!doll) return false;
    group.visible = true;
    // (seen from outside as it falls; but where the camera cannot pull back from the head, a wall
    // behind it, the figure and what it carried are not drawn in front of the eyes)
    const unseen = !walk.outside;
    if (this.unseen !== unseen) this.shadowOnly(group, (this.unseen = unseen));
    const lift = new THREE.Vector3();
    doll.step(Math.max(this.walkDt, 1e-3), this.solid);
    this.carryOn(figure, at);
    // the walker's body lies under the hips, on whatever is there
    const hips = doll.hips;
    const floor = walk.solids.below(hips.x, hips.y + 0.2, hips.z, this.groundAt(hips.x, hips.z)) ?? hips.y;
    walk.pin(lift.set(hips.x, floor, hips.z));
    this.renderer.shadowMap.needsUpdate = true;
    this.dirty = true;
    if (!doll.atRest) return true;
    // Lying still. The figure is put under its own hips, facing the way it lies (head first on its
    // front, feet first on its back), and its hips are given back the place and turn they have
    // in the world: nothing is seen to move. Then it gets up.
    this.tumble = null;
    const joint = root.getObjectByName('Hips');
    const [hx, hz] = doll.headward;
    const [fx, fz] = doll.faceDown ? [hx, hz] : [-hx, -hz];
    walk.heading = Math.atan2(-fx, -fz);
    if (joint?.parent) {
      const where = joint.getWorldPosition(new THREE.Vector3());
      const turned = joint.getWorldQuaternion(new THREE.Quaternion());
      group.position.set(hips.x, floor, hips.z);
      group.rotation.y = this.facing(at);
      group.updateMatrixWorld(true);
      joint.position.copy(joint.parent.worldToLocal(where));
      joint.quaternion.copy(joint.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).multiply(turned);
    }
    walk.pin(group.position);
    walk.down = 'rising';
    walk.gait.rise(doll.faceDown, root);
    return false;
  }

  private readonly sweep = new THREE.Vector3();
  private readonly seatQ = new THREE.Quaternion();
  private readonly placedAs = new THREE.Quaternion();
  /** The open ground under a point: the land's height where the setting has relief (Setting.groundAt), else its level floor; null where there is none. */
  private groundAt(x: number, z: number): number | null {
    return this.setting.groundAt?.(x, z) ?? this.setting.floor?.position.y ?? null;
  }

  /** The world as something falling meets it (ragdoll.ts: Collide): the solids round the walker, and under everything the open ground, which is a level and not a mesh. */
  private readonly solid: Collide = (point, radius, from) => {
    let swept: THREE.Vector3 | null = null;
    // gone right through a surface since `from`: back on the side it came from, touching it
    if (from) {
      const way = this.sweep.subVectors(point, from);
      const far = way.length();
      const hit = far > 1e-5 ? this.walk.solids.cast(from, way.divideScalar(far), far + radius) : null;
      if (hit && hit.distance < far + radius) {
        // (back along the way it came, to where it met the surface: not out sideways, which would throw it)
        point.copy(from).addScaledVector(way, Math.max(0, hit.distance - radius));
        swept = hit.normal;
      }
    }
    // (put back where it came from, it is touching what it went through: pushed out of the nearest surface instead, a point inside a slab can be sent out of its underside)
    const out = swept ?? this.walk.solids.out(point, radius);
    const ground = this.groundAt(point.x, point.z);
    if (ground === null || point.y >= ground + radius) return out;
    point.y = ground + radius;
    return out ? out.setY(out.y + 1).normalize() : new THREE.Vector3(0, 1, 0);
  };

  /**
   * Make everything under `root` cast its shadow and otherwise draw nothing, or put it back. It
   * is done as each mesh is drawn (the shadow pass does not call these), on whatever material
   * the look in force has given it, so it survives a change of look and touches no shared state.
   */
  private shadowOnly(root: THREE.Object3D, on: boolean): void {
    const hide = (_r: unknown, _s: unknown, _c: unknown, _g: unknown, material: THREE.Material) => {
      material.userData.wrote ??= [material.colorWrite, material.depthWrite];
      material.colorWrite = material.depthWrite = false;
    };
    const show = (_r: unknown, _s: unknown, _c: unknown, _g: unknown, material: THREE.Material) => {
      const wrote = material.userData.wrote as [boolean, boolean] | undefined;
      if (!wrote) return;
      [material.colorWrite, material.depthWrite] = wrote;
      material.userData.wrote = undefined;
    };
    const nothing = THREE.Object3D.prototype.onBeforeRender;
    root.traverse((o) => {
      if (!(o as THREE.Mesh).isMesh) return;
      o.onBeforeRender = on ? hide : nothing;
      o.onAfterRender = on ? show : nothing;
    });
  }

  /**
   * While walking, the shadow map is spent on the ground round the walker: the section's own fit
   * (fitShadows) is a few metres round where the figure started, and a figure walked out of it
   * had no shadow at all. The map moves in steps of whole texels, in the light's own frame, so
   * that a shadow's edge does not crawl as he walks; and it reaches up the Sun's line far enough
   * for whatever stands over him to shade him.
   */
  private fitWalkShadows(force = false): void {
    const p = this.walk.body.position;
    const shadow = this.sun.shadow;
    const { half, size, radius } = this.walkShadow();
    // It goes with the walker a metre at a time (in whole texels, below), not in leaps: it is drawn again every frame
    // he moves anyway, for his own shadow, and where it hands over to the far map (shadows.ts) must not jump.
    if (!force && this.sun.target.position.distanceTo(p) < 1) return;
    this.shadowGrain(size, radius);
    const dir = this.setting.sunDir;
    const right = new THREE.Vector3().crossVectors(UP, dir).normalize();
    const up = new THREE.Vector3().crossVectors(dir, right);
    const texel = (2 * half) / shadow.mapSize.x;
    const snap = (v: number) => Math.round(v / texel) * texel;
    const centre = new THREE.Vector3()
      .addScaledVector(right, snap(p.dot(right)))
      .addScaledVector(up, snap(p.dot(up)))
      .addScaledVector(dir, p.dot(dir));
    const back = Math.min(400, this.bounds.radius + 20);
    this.sun.target.position.copy(centre);
    this.sun.position.copy(centre).addScaledVector(dir, back);
    Object.assign(shadow.camera, {
      left: -half,
      right: half,
      top: half,
      bottom: -half,
      near: 1,
      far: back + half + 20,
    });
    shadow.camera.updateProjectionMatrix();
    shadow.normalBias = Math.max(0.012, half / 900);
    depthBias(shadow);
    this.far.nearOnly(); // (the fine map is moved: the far one stays where it is)
  }

  /** For the diagnostics: the figure is being shown from outside but its model has no joints, so it glides. */
  get walkRigid(): boolean {
    const figure = this.staged[this.walked];
    return Boolean(figure && this.walk.active && this.walk.third && !this.walk.gait.jointed(figure.shown));
  }

  /** A frame on foot. None of the orbiting camera's rules apply: no drift, no bounds, no picking, its own depth range. */
  private stepWalk(dt: number): void {
    if (this.walk.update(dt)) this.dirty = true;
    this.adapt(dt, true);
    const through = !this.walk.outside;
    if (through !== this.throughEyes) this.onWalkEyes((this.throughEyes = through));
    const hit = this.walk.aimed;
    const found = hit && this.targetOf(hit);
    if (found && hit) {
      // is it the very thing being stood on? (the page is slower to point that out)
      const feet = this.walk.body.position;
      const floor = this.walk.body.grounded && this.walk.solids.cast(this.below.set(feet.x, feet.y + 0.3, feet.z), DOWN, 0.8);
      const under = floor ? this.targetOf(floor)?.target : null;
      const t = found.target;
      if (under && under.model === t.model && under.node === t.node && under.place === t.place) t.underfoot = true;
    }
    // is it (part of) something that can be driven? the nearest node above it that says it is a vehicle
    let vehicle: THREE.Object3D | undefined;
    for (let o: THREE.Object3D | null = hit?.mesh ?? null; o && !vehicle; o = o.parent) if (o.userData.vehicle && o.name) vehicle = o;
    const called = typeof vehicle?.userData.vehicle === 'string' ? (vehicle.userData.vehicle as string) : undefined;
    if (found && vehicle) Object.assign(found.target, { vehicle: vehicle.name, vehicleName: called });
    const aim =
      found && hit
        ? { ...found, hit, vehicle }
        : hit && vehicle
          ? { target: { vehicle: vehicle.name, vehicleName: called }, hit, vehicle }
          : null;
    this.setAim(this.wheel || this.boarded ? null : aim); // (at the wheel, or in a couch, there is nothing to point at)
    this.fitDetail(dt);
    this.walkDt = dt;
    this.board(dt);
    this.poseFigure();
    this.fitWalkShadows();
    // the walker keeps its own near plane (centimetres, indoors); the far one is the site's, as for orbiting
    const far = Math.max(
      this.camera.position.distanceTo(this.bounds.center) + this.bounds.radius + (this.setting.horizon ?? 10),
      this.setting.globe?.reach(this.camera.position) ?? 0,
    );
    if (Math.abs(far - this.camera.far) > far * 0.02) {
      this.camera.far = far;
      this.camera.updateProjectionMatrix();
    }
  }

  // --- a stage that is a room and not a place: what the gallery asks of its own (src/gallery.ts) ---

  /**
   * Every model is drawn in full, whatever its size on screen, and its coarser levels are not
   * fetched: a thing shown to be studied is never the coarser one. Set before `load`.
   */
  fullDetail = false;

  private asleep = false;
  /**
   * Stop (another stage has the page) or start again. Asleep it draws nothing, hears no key and
   * advances no clock: everything on it is, when it wakes, exactly as it was left.
   */
  sleep(on: boolean): void {
    if (on === this.asleep) return;
    this.asleep = on;
    this.cam.keys.clear();
    this.renderer.setAnimationLoop(on ? null : () => this.frame());
    if (on) return;
    this.timer.update(); // (the time it slept is not time that passed)
    this.renderer.shadowMap.needsUpdate = true;
    this.dirty = true;
  }

  get sleeping(): boolean {
    return this.asleep;
  }

  /** The setting on show, for whoever built it and has more to say to it than a stage knows (the studio's tone: studio.ts). */
  get place(): Setting {
    return this.setting;
  }

  /** The setting has been changed where it stands (its tone, what stands in it): take it up again. */
  reset(): void {
    this.applySetting();
    this.fitShadows();
  }

  /** Fetch a model that is no part of the flight and dress it as the flight's are (the gallery's figure for scale). Whoever asks puts it somewhere. */
  model(url: string): Promise<THREE.Object3D> {
    return this.fetch(url).then((object) => {
      rest(object);
      return object;
    });
  }

  /** What the section's model has had taken off the stage (`only`), and where each piece goes back. */
  private readonly away: { node: THREE.Object3D; parent: THREE.Object3D }[] = [];
  /** The section's model stands on the floor, whatever is left of it and however far apart it is: how far it was lifted to stand there put together. */
  private stood: { lift: number; low: number } | null = null;

  /**
   * Leave on the stage only these parts of the section's model (their nodes; null: all of it
   * again), standing on the floor at y = 0: a spacecraft without its booster stands where the
   * booster stood, not in the air above it. The rest is taken out of the model, not hidden, so
   * that everything measured, framed, picked and shadowed is what is there. For a stage drawn in
   * full (`fullDetail`): the coarser levels know nothing of it. Returns how far up the model's own
   * origin now is, put together: what a height measured in the model's frame is to be raised by.
   */
  only(nodes: readonly string[] | null): number {
    const own = this.staged[this.current];
    const def = this.def;
    if (!own || !def) return 0;
    for (const { node, parent } of this.away.splice(0)) parent.add(node);
    for (const part of nodes ? def.parts : []) {
      const node = nodes!.includes(part.node) ? null : own.full.getObjectByName(part.node);
      if (!node?.parent) continue;
      this.away.push({ node, parent: node.parent });
      node.removeFromParent();
    }
    // put together and measured to the vertex (a box round boxes stands it a hair above the floor)
    const apart = this.apart[this.current] ?? 0;
    own.explode(0);
    own.group.position.y = 0;
    own.group.updateMatrixWorld(true);
    const exact = new THREE.Box3().setFromObject(own.full, true);
    this.stood = { lift: exact.isEmpty() ? 0 : -exact.min.y, low: new THREE.Box3().setFromObject(own.full).min.y };
    own.explode(apart);
    this.ground();
    this.section(def.id);
    return this.stood.lift;
  }

  /** Keep the section's model on the floor as it comes apart: a part that leaves downward lifts the rest, it does not go through the floor. */
  private ground(): void {
    const own = this.staged[this.current];
    if (!own || !this.stood) return;
    own.group.position.y = 0;
    own.group.updateMatrixWorld(true);
    const low = new THREE.Box3().setFromObject(own.full).min.y;
    own.group.position.y = this.stood.lift + Math.max(0, this.stood.low - low);
    own.group.updateMatrixWorld(true);
    own.measure();
    this.lamps.place();
  }

  /**
   * Each part of the section's model in its place in the whole, put together: how high it stands (metres from the
   * model's own origin) and how far out from the axis it reaches. For a diagram of the whole; ask before `only`.
   */
  outlines(): { node: string; low: number; high: number; reach: number }[] {
    const own = this.staged[this.current];
    if (!own) return [];
    const apart = this.apart[this.current] ?? 0;
    own.explode(0);
    own.group.updateMatrixWorld(true);
    const at = own.group.position;
    const out = [...this.parts].flatMap(([node, object]) => {
      const box = new THREE.Box3().setFromObject(object);
      if (box.isEmpty()) return [];
      const reach = Math.max(
        Math.abs(box.min.x - at.x),
        Math.abs(box.max.x - at.x),
        Math.abs(box.min.z - at.z),
        Math.abs(box.max.z - at.z),
      );
      return [{ node, low: box.min.y - at.y, high: box.max.y - at.y, reach }];
    });
    own.explode(apart);
    return out;
  }

  /** The box round the section's model as it would stand put together, without taking it apart or putting it together to find out. */
  extent(): THREE.Box3 {
    const own = this.staged[this.current];
    const box = new THREE.Box3();
    if (!own) return box;
    const apart = this.apart[this.current] ?? 0;
    const y = own.group.position.y;
    own.explode(0);
    if (this.stood) own.group.position.y = this.stood.lift;
    own.group.updateMatrixWorld(true);
    box.setFromObject(own.full);
    own.explode(apart);
    own.group.position.y = y;
    own.group.updateMatrixWorld(true);
    return box;
  }

  /**
   * Where on the page one of the section's parts is: the middle of the box round it, and how far
   * to either side of that the box reaches, in pixels. Null: no such part, or it is behind the camera.
   */
  frameOf(node: string): { x: number; y: number; r: number } | null {
    const object = this.parts.get(node);
    if (!object?.parent) return null;
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) return null;
    const size = box.getSize(new THREE.Vector3());
    const middle = box.getCenter(new THREE.Vector3());
    const away = middle.clone().sub(this.camera.position).dot(this.camera.getWorldDirection(new THREE.Vector3()));
    if (away <= this.camera.near) return null;
    const at = this.screenOf(middle);
    const rect = this.canvas.getBoundingClientRect();
    const scale = rect.height / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
    return at && { ...at, r: ((Math.hypot(size.x, size.z) / 2) * scale) / away };
  }

  /** For tests: nothing moves unless the camera is moved, and the sky (stars are single pixels) is hidden. */
  frozen = false;

  /** For tests: the seconds the camera's rig has been stepped through in all (tools/camera-test.mjs sets a camera's movement against the time it was moved for, not against the clock's). */
  camStepped = 0;

  /** For tests: a named view, turned `azimuthDeg` about the vertical and nudged `nudgeDeg` more. */
  shot(viewId: string, azimuthDeg: number, nudgeDeg = 0): void {
    this.cam.drift = false;
    this.cam.set('orbit', true);
    this.view(viewId, true);
    this.following = this.watched = null; // an exact pose: a resize must not frame it again
    this.cam.turn(THREE.MathUtils.degToRad(azimuthDeg + nudgeDeg));
  }

  /** For tests and screenshots: stop the drift and put the camera somewhere exact. */
  pose(azimuthDeg: number, elevationDeg: number, distance: number, targetY = this.centreY, targetX = 0, targetZ = 0): void {
    this.following = this.watched = null;
    const az = THREE.MathUtils.degToRad(azimuthDeg),
      el = THREE.MathUtils.degToRad(elevationDeg);
    const pivot = new THREE.Vector3(targetX, targetY, targetZ);
    this.cam.place(
      pivot,
      new THREE.Vector3(
        targetX + distance * Math.cos(el) * Math.cos(az),
        targetY + distance * Math.sin(el),
        targetZ + distance * Math.cos(el) * Math.sin(az),
      ),
    );
    this.dirty = true;
  }
}

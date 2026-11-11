import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { sameTarget, type Target, type Workings } from '../actions';
import type { Action, Flight as FlightData, ModelDef } from '../types';
import type { Clock } from '../world/clock.ts';
import { sliderAt, timeAt } from '../world/sequence.ts';
import { Ascent } from './ascent';
import { GROUND_Y, type Setting, Settings, unhurried } from './backdrops';
import { Carry } from './carry';
import { Vehicle } from './drive';
import { type Fn, functionsOf, refusal, scriptedAt, sliderFor } from './explode';
import { type CameraMode, Flyer } from './fly';
import { jointKey, pose, reach, seatFit } from './gait';
import { Lamps } from './lamps';
import { LOD_ABOVE, lodUrl, Scenery, Staged } from './lod';
import { CloudPass } from './clouds';
import { InkPass, type Look, Looks } from './look';
import { Origin } from './origin';
import { Plume } from './plume';
import { type Collide, Ragdoll, type Tumbler } from './ragdoll';
import { wearTexture } from './space';
import { grain, mark } from './surface';
import { TRAIL_STEP, Trail } from './trail';
import { EYE_FRACTION, type Hit, Walker } from './walk';
import { Works } from './works';

/** Materials (by the name Blender gave them) that get the wear map. */
const WORN = /^(shingle|heatsink|aluminium|titanium|tower|steel|strap|paint-booster|paint-structure|concrete|suit|galvanised)/;
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

const UP = new THREE.Vector3(0, 1, 0);
const ONE = new THREE.Vector3(1, 1, 1);
/** How long a vehicle's door is given to swing before the figure gets in or out through it, seconds. */
const DOOR_SECONDS = 1.05;
const DOWN = new THREE.Vector3(0, -1, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const spin = new THREE.Quaternion();
/** While walking: half the width of ground the shadow map covers round the walker, metres (a texel is then a little over a centimetre). */
const WALK_SHADOW = 26;
/** Texels along a side of the Sun's shadow map, as the orbiting views use it. */
const SHADOW_MAP = 4096;
/** After the clock has been put somewhere, the hardware plays the last stretch before that instant (seconds of the sequence) at this many times life. */
const CATCH_UP_NEAR = 20;
const CATCH_UP_PACE = 4;
/** The lowest a free camera flies, metres above the surface the model stands on. */
const FLY_FLOOR = 0.35;
/** The most of a scenery object that is framed at once, metres across: beyond this a click looks at where it landed. */
const PLACE = 60;
/** How much stronger the sky's fill light is in the cel look. */
const CEL_FILL = 4.5;

/** A camera flight under way: where the orbit point and the camera's offset from it start and end. */
interface Journey {
  target0: THREE.Vector3;
  target1: THREE.Vector3;
  offset0: THREE.Vector3;
  offset1: THREE.Vector3;
  t: number;
  seconds: number;
}

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
export interface Thing {
  label: string;
  about: string | null;
  object: THREE.Object3D;
}

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
  private readonly controls: OrbitControls;
  private readonly composer: EffectComposer;
  /** The cumulus, marched through and laid over the frame (clouds.ts). */
  private readonly clouds: CloudPass;
  /** Draws the scene from the eye (origin.ts): the GPU sees only eye-relative positions; everything the code reads stays where it is. */
  readonly origin: Origin;
  private readonly backdropPass: RenderPass;
  private readonly outline: OutlinePass;
  private readonly settings: Settings;
  private readonly sun = new THREE.DirectionalLight(0xffffff, 4);
  private readonly fill = new THREE.HemisphereLight(0, 0, 0.5);
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly timer = new THREE.Timer();
  private readonly loader = new GLTFLoader();
  private readonly loaded = new Map<string, Promise<THREE.Object3D>>();
  private readonly wear = wearTexture();
  /** How the view is moved when nobody is being walked as: turning about a subject, or flying free. */
  private mode: CameraMode = 'orbit';
  private readonly flyer = new Flyer();
  private fast = false;
  /** Which way everything is drawn, real or cel (look.ts), and the cel look's ink line. */
  private readonly looks = new Looks();
  private shadowsOwed = false;
  /** What is still on its way after `load` returns: coarser levels of detail, the place round the pad. */
  private arriving: Promise<unknown>[] = [];
  /** The floodlights the models carry: lit when the Sun is down. */
  private lamps = new Lamps();
  /** The flight off the pad (ascent.ts), and what has been done to the model that flies: the clock's instant it was put at, the nodes it has shed, how far it moved this frame. */
  private ascent: Ascent | null = null;
  /** The flown vehicle's engine fire, hung at its nozzle's exit (plume.ts). */
  private plume: Plume | null = null;
  /** The trail it leaves in the air while the engine burns (trail.ts), in the scene's frame. */
  private trail: Trail | null = null;
  private readonly lifted = {
    t: Number.NaN,
    flying: false,
    shed: '',
    shrank: false,
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

  private setting: Setting;
  private root: THREE.Group | null = null;
  /** The place round the pad (Flight.surroundings): scenery, outside `root`, so it is never measured, picked or framed. */
  private surroundings: THREE.Object3D | null = null;
  /** Its levels of detail, chosen building by building (lod.ts): `surroundings` is its level 0. */
  private scenery: Scenery | null = null;
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
  private flyTo: Journey | null = null;
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
  /** Keys being held down, lower case. */
  private readonly held = new Set<string>();
  /** Something on show has changed and the next frame must be drawn. */
  private dirty = true;
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

    // models are Draco-compressed; the decoder is served from public/draco
    this.loader.setDRACOLoader(new DRACOLoader().setDecoderPath(`${import.meta.env.BASE_URL}draco/`));
    this.settings = new Settings(this.renderer);
    this.setting = this.settings.get('orbit');

    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(SHADOW_MAP, SHADOW_MAP);
    this.sun.shadow.bias = -0.0002;
    this.sun.shadow.normalBias = 0.012;
    this.scene.add(this.sun, this.sun.target, this.fill);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5;
    this.controls.zoomToCursor = true; // the wheel zooms toward what the pointer is on
    this.controls.screenSpacePanning = false; // panning slides over the ground, not up into the sky
    // Taking hold of the view (a drag) stops the drift round it. Zooming does not: the wheel
    // changes how close the view is, and it goes on turning.
    let wheel = false;
    canvas.addEventListener('wheel', () => (wheel = true), { capture: true, passive: true });
    this.controls.addEventListener('start', () => {
      this.following = null;
      this.onView(null);
      this.flyTo = null;
      if (!wheel) this.onInteract();
      wheel = false;
    });

    // Multisampled HDR target: trusses are all thin bright lines against a plain background.
    // The depth texture is explicit: left to its default the target gets 16 bits of depth, which
    // cannot tell concrete from the ground 6 cm under it across the pad. 24 bits can.
    const target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: 4,
      depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedIntType),
    });
    this.composer = new EffectComposer(this.renderer, target);
    this.backdropPass = new RenderPass(this.setting.backdrop.scene, this.setting.backdrop.camera);
    this.composer.addPass(this.backdropPass);
    const main = new RenderPass(this.scene, this.camera);
    main.clear = false;
    main.clearDepth = true;
    this.composer.addPass(main);
    this.clouds = new CloudPass(this.scene, this.camera);
    this.composer.addPass(this.clouds.mark); // the scene's depth, for the clouds laid over after the ink
    this.ink.enabled = false; // straight after the scene, while the frame's depth is still the scene's
    this.composer.addPass(this.ink);
    this.composer.addPass(this.clouds);
    this.outline = new OutlinePass(new THREE.Vector2(1, 1), this.scene, this.camera);
    this.outline.edgeStrength = 3;
    this.outline.edgeThickness = 1;
    this.outline.edgeGlow = 0.4;
    this.outline.visibleEdgeColor.set(0xffc46b);
    this.outline.hiddenEdgeColor.set(0x9a7434); // dimmer than the visible edge, but still an outline
    this.composer.addPass(this.outline);
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.14, 0.6, 2.4));
    const output = new OutputPass();
    this.clouds.adopt(output); // (the clouds are laid over the frame as it goes to the screen)
    this.composer.addPass(output);
    // A multisampled target resolves its depth after every draw into it by default, and every pass after the
    // scene's draws into one: a costly resolve of depth nothing has changed. Only the scene's own draw writes
    // the depth the ink and the clouds read, so only it resolves.
    for (const t of [this.composer.renderTarget1, this.composer.renderTarget2]) t.resolveDepthBuffer = false;
    const drawScene = main.render.bind(main);
    main.render = (renderer, write, read, delta, mask) => {
      read.resolveDepthBuffer = true;
      drawScene(renderer, write, read, delta, mask);
      read.resolveDepthBuffer = false;
    };
    this.origin = new Origin(this.renderer, this.scene, this.camera, this.cutPlanes);
    this.applySetting();

    // A tap sends no pointermove first, so every handler that picks reads the pointer itself.
    const aim = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    let looked: { x: number; y: number } | null = null;
    canvas.addEventListener('pointerdown', (e) => {
      if (this.mode !== 'fly' || this.walk.active) return;
      looked = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId); // the drag goes on if the pointer leaves the canvas
    });
    for (const end of ['pointerup', 'pointercancel'] as const) canvas.addEventListener(end, () => (looked = null));
    canvas.addEventListener('pointermove', (e) => {
      aim(e);
      // Flying free, a drag with either button turns the camera the way the mouse goes. The
      // distance is measured here from one event to the next: the browser's own movementX is
      // scaled differently from one display to another, which made the view lurch.
      if (this.mode === 'fly' && !this.walk.active && e.buttons & 3 && looked) {
        this.flyer.look(e.clientX - looked.x, e.clientY - looked.y, this.camera.fov);
        looked = { x: e.clientX, y: e.clientY };
        this.flyTo = null;
        this.dirty = true;
        return; // nothing is hovered while the view is being turned
      }
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
      if (down.pane) this.lookIn(down.pane.point, down.pane.normal);
      else if (down.place) this.visit(down.place.box);
      else if (down.model && !down.node) this.onModel(down.model);
      else {
        this.onSelect(down.node);
        this.onThing(down.thing ?? null);
      }
    });
    canvas.addEventListener('pointercancel', () => (this.down = null));
    // Keys fly the view: WASD moves it over the site, E and Q lift and lower it, the arrows swing
    // it round and tilt it, R and F (or + and -) zoom, 0 goes back to where the section starts. Held keys
    // are applied each frame. The legend in the corner of the page (ui.ts) lists these.
    const KEYS = new Set(['w', 'a', 's', 'd', 'q', 'e', 'r', 'f', '+', '=', '-', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      this.fast = e.shiftKey;
      const el = e.target as HTMLElement;
      const typing = el.matches?.('input, textarea, select, [contenteditable]');
      const widget = key.startsWith('arrow') && el.closest?.('[role=tablist], input');
      if (e.metaKey || e.ctrlKey || e.altKey || typing || widget || this.walk.active) return; // on foot the keys are the walker's
      if (key === '0' || key === 'home') return this.onHome(); // 0, since a laptop has no Home key
      if (!KEYS.has(key)) return;
      e.preventDefault();
      if (!this.held.has(key)) {
        // Tilting and zooming adjust the view and leave it drifting; a tilt even keeps it framed
        // on what was chosen. Moving or turning it by hand takes it over.
        const tilt = key === 'arrowup' || key === 'arrowdown';
        const zoom = ['r', 'f', '+', '=', '-'].includes(key);
        this.flyTo = null;
        if (!tilt) {
          this.following = null;
          this.onView(null);
        }
        if (!tilt && !zoom) this.onInteract();
      }
      this.held.add(key);
    });
    window.addEventListener('keyup', (e) => {
      this.held.delete(e.key.toLowerCase());
      this.fast = e.shiftKey;
    });
    canvas.addEventListener(
      'wheel',
      (e) => {
        if (this.mode !== 'fly' || this.walk.active) return;
        this.flyTo = null;
        this.flyer.dolly(this.camera, Math.sign(e.deltaY), FLY_FLOOR, this.setting.floor ? GROUND_Y : this.camera.position.y);
        this.dirty = true;
      },
      { passive: true },
    );
    window.addEventListener('blur', () => this.held.clear());
    // the pixel ratio changes when the window moves to another display or the page is zoomed
    const watchRatio = () => {
      matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener('change', watchRatio, { once: true });
      this.resize();
    };
    watchRatio();

    this.walk = new Walker(canvas, this.camera, {
      solids: () => [
        ...this.staged.flatMap((s, i) => (i === this.walked ? [] : [s.shown])), // every model but the one you are
        ...(this.surroundings ? [this.surroundings] : []),
        ...this.setting.scenery,
      ],
      // a setting's floor is one level plane: its height is asked for, not its triangles
      ground: () => this.setting.floor?.position.y ?? null,
      groundAt: (x, z) => this.groundAt(x, z),
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
  async load(flight: FlightData, onProgress?: (fraction: number) => void): Promise<void> {
    const fractions = new Array<number>(flight.models.length).fill(0);
    const scenes = await Promise.all(
      flight.models.map((m, i) =>
        this.fetch(m.url, (f) => {
          fractions[i] = f;
          onProgress?.(fractions.reduce((a, b) => a + b, 0) / fractions.length); // the bar is the average of them all
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
      for (const l of def.lights ?? []) {
        const lamp = new THREE.PointLight(l.colour, l.intensity, l.reach, 2);
        lamp.position.set(...l.position);
        staged.group.add(lamp);
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
    this.lamps.clear();
    this.ascent = Ascent.of(flight);
    this.lifted.t = Number.NaN;
    this.debris.length = 0; // (their holders were under the last flight's root)
    this.hangPlume(flight);
    this.lamps = new Lamps();
    for (const s of this.staged) this.lamps.add(s.full, this.scene);
    // the coarser levels arrive behind the scenes; a model that has none simply stays as it is
    const staged = this.staged;
    this.arriving = [];
    flight.models.forEach((def, i) => {
      for (let level = 1; level <= LOD_ABOVE.length; level++)
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
    this.setting = this.settings.get(flight.models[0]!.backdrop, flight);
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
    for (const p of this.arriving) p.catch(() => {}); // a level that does not arrive is done without
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

  private fetch(url: string, onProgress?: (fraction: number) => void): Promise<THREE.Object3D> {
    let promise = this.loaded.get(url);
    if (!promise) {
      promise = this.loader
        .loadAsync(import.meta.env.BASE_URL + url, (e) => {
          if (e.total) onProgress?.(e.loaded / e.total);
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
    object.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = mesh.receiveShadow = true;
      const shell = Boolean(mesh.userData.shell);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat.name.startsWith('glass')) {
        const pane = mat.name.startsWith('glass-visor') ? VISOR : GLASS;
        mesh.material = shell ? this.shellOf(pane, url) : pane;
        mesh.castShadow = false;
        mesh.renderOrder = 2; // after everything opaque, so what is behind is already drawn
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
      }
      if (shell) mesh.material = this.shellOf(mat, url);
      const marked = mark(mesh); // a scorch or a stain fades out at its rim
      if (marked) {
        mesh.material = marked;
        mesh.castShadow = false;
        mesh.renderOrder = 1;
      }
    });
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
    this.renderer.toneMappingExposure = s.exposure;
    // the floodlights come on as the direct light fails (the Sun low, or only the Moon)
    this.lamps.set(1 - THREE.MathUtils.smoothstep(s.sunIntensity, 0.25, 1.6), s.exposure);
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
    this.controls.maxPolarAngle = s.maxPolar;
    this.renderer.toneMappingExposure = s.exposure;
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

  /**
   * How the view is moved: `orbit` turns about what was chosen, `fly` is a free camera that looks
   * where it is pointed and goes where it is sent. The view itself does not jump on changing.
   */
  setCamera(mode: CameraMode): void {
    if (mode === this.mode) return;
    this.mode = mode;
    this.following = null;
    this.onView(null);
    this.controls.enabled = mode !== 'fly' && !this.walk.active;
    if (mode === 'fly') {
      this.flyTo = null;
      this.controls.autoRotate = false;
      this.flyer.read(this.camera);
    }
    // the chase starts by going to the vehicle; leaving it, the shadows go back to the section
    const flier = this.flier;
    if (mode === 'chase' && flier) this.frameBox(new THREE.Box3().setFromObject(flier.group), false);
    else this.fitShadows();
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
    const { on, vacuum } = ascent.burn(t);
    this.plume?.set(on, vacuum, performance.now() / 1000, this.renderer.toneMappingExposure);
    this.layTrail(ascent, pad, t, flying);
    this.lifted.by.subVectors(g.position, before);
    g.updateMatrixWorld(true);
    s.measure(); // levels of detail are chosen by the distance to it
    this.fitBounds();
    this.dirty = true;
    this.shadowsOwed = true;
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
      if (!ascent.shed(d.drop, t, pad, at, turn)) continue;
      d.holder.matrix.compose(at, turn, ONE).multiply(d.rel);
      d.holder.matrixWorldNeedsUpdate = true;
    }
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
    this.plume?.mesh.removeFromParent();
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
    s.group.add(this.plume.mesh);
    this.trail = new Trail();
    this.scene.add(this.trail.mesh);
    this.clouds.veils = [this.plume.mesh, this.trail.mesh]; // (cloud behind them shows through them: clouds.ts)
  }

  /**
   * The chase camera: it turns about the vehicle as the orbiting one does about anything, and is
   * carried along with it, so the view moves only as the user moves it. The Sun's shadow map is
   * carried too, so the vehicle shades itself all the way up.
   */
  private chase(): void {
    const by = this.lifted.by;
    this.controls.target.add(by);
    this.camera.position.add(by);
    if (this.flyTo) {
      this.flyTo.target0.add(by);
      this.flyTo.target1.add(by);
    }
    this.sun.position.add(by);
    this.sun.target.position.add(by);
    // it has shed something: the view closes in on what is left
    const g = this.flier?.group;
    if (!this.lifted.shrank || !g) return;
    this.lifted.shrank = false;
    const left = new THREE.Box3();
    g.traverseVisible((o) => {
      if ((o as THREE.Mesh).isMesh) left.expandByObject(o);
    });
    if (!left.isEmpty()) this.frameBox(left, false);
  }

  get cameraMode(): CameraMode {
    return this.mode;
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

  /** Tell the stage how many pixels at the bottom of the canvas the controls cover. */
  setInset(pixels: number): void {
    const inset = THREE.MathUtils.clamp(pixels / Math.max(1, this.canvas.clientHeight), 0, 0.5);
    if (Math.abs(inset - this.inset) < 0.01) return;
    this.inset = inset;
    this.refollow();
  }

  /** Frame again whatever the camera was last sent to: the canvas or the model has changed shape. */
  private refollow(): void {
    const snap = !this.flyTo; // a flight under way is sent to the new framing instead of cut short
    if (this.following?.part) this.focus(this.following.part, snap);
    else if (this.following?.view) this.view(this.following.view, snap, true);
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

  setAutoRotate(on: boolean): void {
    this.controls.autoRotate = on && this.mode !== 'fly'; // a free camera has nothing to drift round
    // While the view drifts round its subject the wheel only changes how close it is. Zooming
    // toward the pointer moves the point being orbited: that is for a view the user has taken.
    this.controls.zoomToCursor = !on;
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

  /** Fly to one part and frame it, keeping the direction the camera is already looking from. */
  focus(node: string, snap = false, from?: { turn: number; rise: number }): void {
    const object = this.parts.get(node);
    if (!object) return;
    this.frameBox(new THREE.Box3().setFromObject(object), snap, from);
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
  async warm(patience = 9000): Promise<void> {
    const clouds = this.clouds.warm(); // (made a little at a time while the rest arrives)
    const settled = Promise.allSettled(this.arriving);
    await Promise.race([settled, new Promise((done) => setTimeout(done, patience))]);
    const frames = async (n: number) => {
      for (let i = 0; i < n; i++) {
        this.dirty = true;
        await new Promise((done) => requestAnimationFrame(done));
      }
    };
    await clouds;
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
    if (this.plume) this.plume.mesh.visible = true; // the engine's fire too: it is first seen at liftoff
    if (this.trail) this.trail.mesh.visible = true; // (and its trail: drawn empty, its shader is built)
    const globe = this.setting.globe;
    const shown = globe && [globe.mesh.visible, globe.air.visible];
    if (globe) globe.mesh.visible = globe.air.visible = true; // the Earth and its air, first seen on the way up
    for (const night of [1, 0]) {
      this.lamps.set(night, 1);
      await this.renderer.compileAsync(this.scene, this.camera).catch(() => {}); // (a browser without parallel compile builds them as they are drawn)
      this.renderer.shadowMap.needsUpdate = true;
      await frames(2);
    }
    for (const o of culled) o.frustumCulled = true;
    for (const s of this.staged) s.everyLevel(false);
    this.scenery?.everyLevel(false);
    if (this.plume) this.plume.mesh.visible = false;
    if (this.trail) this.trail.mesh.visible = false;
    if (globe && shown) [globe.mesh.visible, globe.air.visible] = shown;
    this.relight(true);
    await frames(3);
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

  /** Where on the page a part's middle, or a point in the world, is now; null if it is behind the camera. */
  screenOf(what: string | THREE.Vector3): { x: number; y: number } | null {
    const point = new THREE.Vector3();
    if (typeof what === 'string') {
      const object = this.parts.get(what);
      if (!object) return null;
      // Where its bulk is, not the middle of the box round it: a truck with a boom is pointed
      // at on the truck. Each mesh counts for as much as it has vertices, which goes with size.
      let weight = 0;
      const middle = new THREE.Vector3();
      object.traverse((o) => {
        const mesh = o as THREE.Mesh;
        const count = mesh.isMesh ? (mesh.geometry.getAttribute('position')?.count ?? 0) : 0;
        if (!count || !mesh.visible) return;
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        point.addScaledVector(mesh.localToWorld(mesh.geometry.boundingBox!.getCenter(middle)), count);
        weight += count;
      });
      if (!weight) return null;
      point.divideScalar(weight);
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
        material.name.startsWith('glass-visor')
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
    this.controls.autoRotateSpeed = 0.5 * times;
  }

  /** Come round the subject on show by `turn` radians, to `rise` radians above the level, at the same distance: a new angle on the same thing. */
  swing(turn: number, rise: number): void {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const distance = offset.length();
    const flat = new THREE.Vector3(offset.x, 0, offset.z).normalize().applyAxisAngle(UP, turn);
    offset.copy(flat.multiplyScalar(Math.cos(rise)).addScaledVector(UP, Math.sin(rise))).multiplyScalar(distance);
    this.fly(this.controls.target.clone(), this.controls.target.clone().add(offset));
  }

  /** Go over to something that is not part of any model (a building beside the pad) and look at it: the view then turns about it. */
  visit(box: THREE.Box3): void {
    this.frameBox(box, false);
    this.onVisit();
  }

  /** Fly to whatever fills `box` and frame it, keeping the direction the camera is already looking from. */
  private frameBox(box: THREE.Box3, snap: boolean, from?: { turn: number; rise: number }): void {
    const size = box.getSize(new THREE.Vector3());
    const target = box.getCenter(new THREE.Vector3());
    // never closer than a 1.6 m subject would be: a small part is seen with its surroundings
    const span = Math.max(size.y, Math.hypot(size.x, size.z) / this.camera.aspect, 1.6);
    const distance = span / 2 / Math.tan(THREE.MathUtils.degToRad(this.lens / 2)) / 0.5;
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    if (from) {
      // seen from somewhere else: round from where the camera is, and at a height of its own
      const flat = new THREE.Vector3(dir.x, 0, dir.z).normalize().applyAxisAngle(UP, from.turn);
      dir.copy(flat.multiplyScalar(Math.cos(from.rise)).addScaledVector(UP, Math.sin(from.rise)));
    }
    if (this.setting.floor) dir.setY(Math.max(dir.y, 0.12)).normalize();
    // no closer than just outside the part: nearer than that the camera is inside its skin
    this.controls.minDistance = Math.max(0.35, Math.min(size.x, size.z) * 0.62);
    this.following = null;
    this.onView(null);
    const position = target.clone().addScaledVector(dir, distance);
    if (snap) {
      this.controls.target.copy(target);
      this.camera.position.copy(position);
      this.controls.update();
    } else this.fly(target, position);
  }

  /**
   * Go up to a window and look through it: the camera swings round to face the pane square on,
   * close enough that the opening fills the view, looking at what is just inside.
   */
  lookIn(point: THREE.Vector3, normal: THREE.Vector3): void {
    const target = point.clone().addScaledVector(normal, -0.45);
    const position = point.clone().addScaledVector(normal, 0.55);
    this.following = null;
    this.onView(null);
    this.onInteract(); // drifting round would carry the view off the window again
    this.controls.minDistance = 0.2;
    this.fly(target, position);
  }

  /** Frame 'all' (everything on show) or one of the model's named views. */
  view(id: string, snap = false, keepDirection = false): void {
    if (!this.root || !this.def) return;
    const named = this.def.views.find((v) => v.id === id);
    // 'all' is everything on show; a named view with no numbers is the model alone, as it stands;
    // one that names parts is those parts wherever they are now, so it follows them as they come apart
    const box = new THREE.Box3();
    const subjects = (named?.nodes ?? []).flatMap((n) => this.parts.get(n) ?? []);
    if (subjects.length) for (const o of subjects) box.expandByObject(o);
    else box.setFromObject(named && this.main ? this.main : this.root);
    const size = box.getSize(new THREE.Vector3());
    const centreY = named?.centreY ?? (box.min.y + box.max.y) / 2;
    // a wide, low subject (a launch pad) must fit by width as well as by height
    const span = named?.span ?? Math.max(size.y, Math.hypot(size.x, size.z) / this.camera.aspect) * (subjects.length ? 1.12 : 1);
    // the subject fills most of the frame above the controls, which sit over the bottom of it
    const fill = (1 - this.inset) * 0.9;
    const distance = span / 2 / Math.tan(THREE.MathUtils.degToRad(this.lens / 2)) / fill;
    // a named view looks at the model's own axis; 'all' looks at the middle of everything
    const mid = box.getCenter(new THREE.Vector3());
    const target =
      named && !subjects.length
        ? new THREE.Vector3(this.main!.position.x, centreY, this.main!.position.z)
        : new THREE.Vector3(mid.x, centreY, mid.z);
    const lift = this.setting.floor ? 0.16 : span < 4 ? 0.22 : 0.1;
    // aim under the subject, so it sits in the middle of the frame that the controls leave clear
    target.y -= ((span / fill) * this.inset) / 2;
    // Framed again because the subject changed shape (the slider, a resize): from wherever the
    // camera has got to, so a view that is drifting round or has been tilted is not thrown back.
    const from = keepDirection
      ? this.camera.position.clone().sub(this.controls.target)
      : named?.from
        ? // a view's direction is given for the model as the flight stands it: it turns with a model that has been turned (a figure walked somewhere else)
          new THREE.Vector3(...named.from).applyAxisAngle(UP, (this.main?.rotation.y ?? 0) - (this.def.rotationY ?? 0))
        : new THREE.Vector3(-0.62, lift, 0.78); // the sunlit side, and the one the cutaway opens toward
    const position = target.clone().addScaledVector(from.normalize(), distance);
    this.following = { view: id };
    this.onView(id);
    this.controls.minDistance = Math.max(0.35, Math.min(1.4, span * 0.2));
    // no further out than half as far again as it takes to see everything on show: beyond that
    // the subject is a speck in a field of scrub
    const all = new THREE.Box3().setFromObject(this.root).getSize(new THREE.Vector3());
    const widest = Math.max(all.y, Math.hypot(all.x, all.z) / this.camera.aspect);
    const wide = (1.5 * widest) / 2 / Math.tan(THREE.MathUtils.degToRad(this.lens / 2)) / fill;
    // ...unless there is a site round it worth seeing from the air
    this.controls.maxDistance = Math.max(30, wide, this.setting.reach ?? 0);
    if (snap) {
      this.controls.target.copy(target);
      this.camera.position.copy(position);
      this.controls.update();
    } else this.fly(target, position);
  }

  /**
   * Send the camera somewhere. It swings round what it is looking at while that slides to the
   * new subject, and pulls back or closes in as it goes: an arc, not a straight line through
   * the rocket. Longer journeys take longer, up to a limit.
   */
  private fly(target: THREE.Vector3, position: THREE.Vector3): void {
    const from = this.camera.position.clone().sub(this.controls.target);
    const to = position.clone().sub(target);
    const journey =
      this.controls.target.distanceTo(target) +
      Math.abs(to.length() - from.length()) +
      from.angleTo(to) * Math.min(from.length(), to.length());
    this.flyTo = {
      target0: this.controls.target.clone(),
      target1: target.clone(),
      offset0: from,
      offset1: to,
      t: 0,
      seconds: THREE.MathUtils.clamp(0.7 + 0.55 * Math.log2(1 + journey / 4), 0.9, 2.8),
    };
  }

  /** Measure everything on show, for the camera's depth range and its limits. Called whenever something moves. */
  private fitBounds(): void {
    if (!this.root) return;
    // a vehicle in flight is left out: the view's limits are the place's (fitDepth reaches out to it)
    const flying = this.lifted.flying ? this.flier?.group : null;
    const all = new THREE.Box3();
    for (const o of this.root.children) if (o !== flying) all.expandByObject(o);
    this.bounds.set(all.getCenter(new THREE.Vector3()), all.getSize(new THREE.Vector3()).length() / 2 + 0.5);
    this.centreY = this.bounds.center.y;
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
    // a texel of the map covers more ground the wider it is spread; a wall the Sun grazes needs the depth bias to match
    this.sun.shadow.bias = -Math.max(0.0002, radius / 40000);
    this.shadowGrain(SHADOW_MAP, 1);
    this.renderer.shadowMap.needsUpdate = true;
  }

  /** Give the Sun's shadow map this many texels a side and this much softening of its edges (a change of size makes a new map). */
  private shadowGrain(size: number, radius: number): void {
    const shadow = this.sun.shadow;
    shadow.radius = radius;
    if (shadow.mapSize.x === size) return;
    shadow.mapSize.set(size, size);
    shadow.map?.dispose();
    shadow.map = null;
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

  /** Panning cannot carry the orbit point off what is on show: there is nothing out there to look at. */
  private keepInBounds(): void {
    if (this.mode === 'chase') return; // the subject is wherever the vehicle has got to
    const t = this.controls.target;
    const off = t.clone().sub(this.bounds.center);
    // on the ground there is a site to walk over; anywhere else, only the model
    const reach = Math.max(this.bounds.radius, this.setting.reach ?? 0);
    if (off.length() <= reach) return;
    const back = off.clone().setLength(reach).add(this.bounds.center).sub(t);
    t.add(back);
    this.camera.position.add(back);
  }

  /** Move the view by whatever keys are held: over the ground, round the subject, in and out. */
  private drive(dt: number): void {
    if (this.mode === 'fly') {
      const ground = this.setting.floor ? GROUND_Y : this.camera.position.y; // with no ground under it, one speed
      if (this.flyer.drive(this.camera, this.held, this.fast, dt, this.setting.floor ? FLY_FLOOR : -Infinity, ground)) this.flyTo = null;
      return;
    }
    if (!this.held.size) return;
    const has = (...keys: string[]) => keys.some((k) => this.held.has(k));
    const offset = this.camera.position.clone().sub(this.controls.target);
    const distance = offset.length();
    const forward = new THREE.Vector3(-offset.x, 0, -offset.z).normalize();
    const right = new THREE.Vector3().crossVectors(forward, UP);
    const step = new THREE.Vector3()
      .addScaledVector(forward, Number(has('w')) - Number(has('s')))
      .addScaledVector(right, Number(has('d')) - Number(has('a')))
      .addScaledVector(UP, (Number(has('e')) - Number(has('q'))) * 0.7)
      .multiplyScalar(distance * 0.9 * dt * (this.fast ? 3 : 1)); // a screen's width in about a second, at any zoom; Shift hurries
    this.controls.target.add(step);
    this.camera.position.add(step);
    const turn = (Number(has('arrowleft')) - Number(has('arrowright'))) * 1.2 * dt;
    // tilt: up the sky or down toward the horizon, within what the setting allows
    const tilt = (Number(has('arrowup')) - Number(has('arrowdown'))) * 0.9 * dt;
    if (tilt) {
      const polar = THREE.MathUtils.clamp(offset.angleTo(UP) - tilt, 0.05, this.controls.maxPolarAngle);
      const flat = new THREE.Vector3(offset.x, 0, offset.z).normalize();
      offset.copy(flat.multiplyScalar(Math.sin(polar)).addScaledVector(UP, Math.cos(polar))).multiplyScalar(distance);
    }
    const zoom = Math.exp((Number(has('f', '-')) - Number(has('r', '+', '='))) * 1.4 * dt);
    const to = THREE.MathUtils.clamp(distance * zoom, this.controls.minDistance, this.controls.maxDistance);
    offset.applyAxisAngle(UP, turn).setLength(to);
    this.camera.position.copy(this.controls.target).add(offset);
  }

  /**
   * Up, for the orbiting camera, is the plumb line where the subject is: the site's +Y on the
   * site, leaning with the Earth's curve beyond it (by the arc flown: 4.8 degrees at the landing),
   * so the horizon downrange is level. It leans in over the second span of the site's ground
   * beyond its edge, too little at a time to be seen.
   */
  private alignUp(): void {
    const globe = this.setting.globe;
    const t = this.controls.target;
    const edge = this.setting.horizon ?? Infinity;
    const lean = globe ? THREE.MathUtils.smoothstep(Math.hypot(t.x, t.z), edge, 2 * edge) : 0;
    const up =
      lean > 0
        ? globe!
            .up(t, new THREE.Vector3())
            .lerp(UP, 1 - lean)
            .normalize()
        : UP;
    if (this.camera.up.angleTo(up) < 1e-7) return;
    this.camera.up.copy(up);
    // OrbitControls keeps the turn from its up to +Y, made once: it is made again
    const c = this.controls as unknown as { _quat: THREE.Quaternion; _quatInverse: THREE.Quaternion };
    c._quat.setFromUnitVectors(up, UP);
    c._quatInverse.copy(c._quat).invert();
  }

  /**
   * Where there is ground, the camera stays above it, and so does the point it orbits: a
   * camera under the pad sees the inside of the concrete and the underside of the terrain.
   */
  private keepAboveGround(): void {
    if (!this.setting.floor) return;
    // Wherever the site's ground is drawn (out to its horizon), the camera stays above it, and so
    // does the point it turns about: a camera under the ground sees the underside of the land.
    // Beyond the drawn ground there is nothing to be under (and the site's level is not the sea's 100 km off).
    const c = this.camera.position;
    const extent = this.setting.horizon ?? this.setting.reach ?? Infinity;
    const EYE = 0.35; // metres above the ground under it
    if (Math.hypot(c.x, c.z) > extent) {
      // out there, above the globe's sea
      const globe = this.setting.globe;
      const below = globe ? EYE - globe.altitude(c) : 0;
      if (globe && below > 0) {
        c.addScaledVector(globe.up(c, new THREE.Vector3()), below);
        this.camera.lookAt(this.controls.target);
      }
      return;
    }
    const under = (x: number, z: number) => Math.max(0, this.setting.groundAt?.(x, z) ?? GROUND_Y);
    const t = this.controls.target;
    const floorT = under(t.x, t.z) + 0.1;
    if (t.y < floorT) t.y = floorT;
    const floorC = under(c.x, c.z) + EYE;
    if (c.y < floorC) {
      c.y = floorC;
      this.camera.lookAt(t);
    }
  }

  /**
   * Keep the near plane as far out as the view allows, every frame. Depth precision at
   * distance d is about d² / (near × 2²⁴): with a fixed 5 cm near plane, faces 3 mm apart
   * fight from across the pad. Pushed out like this the resolution stays under a third of a
   * millimetre, which is what lets the models' 1 mm clearance rule (srlib.check_clearance) hold.
   */
  private fitDepth(): void {
    const toCentre = this.camera.position.distanceTo(this.bounds.center);
    const toTarget = this.camera.position.distanceTo(this.controls.target);
    let near = Math.max(0.03, 0.5 * (toCentre - this.bounds.radius), 0.01 * toTarget);
    // (beyond the site there is no ground at the camera's feet to keep in view)
    if (this.setting.floor && Math.hypot(this.camera.position.x, this.camera.position.z) <= (this.setting.reach ?? Infinity)) {
      // ...but never past the ground at the camera's feet. The nearest ground in view is at the
      // corner of the frame, no nearer along the view than the camera's height times the cosine
      // of the frame's half-diagonal; a near plane beyond that slices the foreground away.
      const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * Math.hypot(1, this.camera.aspect);
      const height = this.camera.position.y - GROUND_Y;
      // nor past scenery between the camera and what it is looking at
      near = Math.min(near, Math.max(0.03, (0.9 * height) / Math.hypot(1, tan)), Math.max(0.03, 0.25 * toTarget));
    }
    // beyond the site's ground the globe's sea is under the camera instead, and it is seen out to its horizon
    const globe = this.setting.globe;
    if (globe?.mesh.visible) {
      const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * Math.hypot(1, this.camera.aspect);
      near = Math.min(near, Math.max(0.03, (0.9 * globe.altitude(this.camera.position)) / Math.hypot(1, tan)));
    }
    let far = Math.max(toCentre + this.bounds.radius + (this.setting.horizon ?? 10), globe?.reach(this.camera.position) ?? 0);
    // a vehicle in flight is seen as far off as it is, and the near plane is never beyond it
    const flier = this.lifted.flying ? this.flier : null;
    if (flier) {
      const to = this.camera.position.distanceTo(flier.sphere.center);
      far = Math.max(far, to + flier.sphere.radius);
      near = Math.min(near, Math.max(0.03, 0.5 * (to - flier.sphere.radius), 0.01 * toTarget));
    }
    if (Math.abs(near - this.camera.near) > near * 0.02 || Math.abs(far - this.camera.far) > far * 0.02) {
      this.camera.near = near;
      this.camera.far = far;
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * Draw each model at the level of detail its size on screen calls for. The model being
   * studied is always complete while it is cut open: only the full level has an inside.
   */
  private fitDetail(): void {
    const scale = this.renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
    let changed = false;
    this.staged.forEach((s, i) => {
      const distance = Math.max(this.camera.position.distanceTo(s.sphere.center) - s.sphere.radius * 0.6, s.sphere.radius * 0.1);
      changed = s.choose(scale / distance, i === this.current && this.cut) || changed;
    });
    if (this.scenery?.choose(this.camera.position, scale)) changed = true;
    if (!changed) return;
    this.dirty = true;
    this.renderer.shadowMap.needsUpdate = true;
    this.highlight(this.hovered);
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
    const hit = this.raycaster
      .intersectObjects([...this.staged.map((s) => s.shown), ...(this.surroundings ? [this.surroundings] : [])], true)
      .find((h) => !gone(h));
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
    if (hit?.face && mesh && (mesh.material as THREE.Material).name.startsWith('glass')) {
      const normal = hit.face.normal.clone().transformDirection(mesh.matrixWorld);
      if (normal.dot(this.raycaster.ray.direction) > 0) normal.negate(); // toward the viewer, whichever side was hit
      return { node: null, model: null, pane: { point: this.paneCentre(mesh, hit.point), normal } };
    }
    const thing = hit ? thingOf(hit.object) : undefined;
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
    for (let o: THREE.Object3D | null = object; o && o !== this.surroundings; o = o.parent) {
      const title = (o.userData.label ?? o.userData.vehicle) as unknown;
      if (typeof title === 'string' && title) {
        const about = o.userData.about;
        return { name: o.name, box: new THREE.Box3().setFromObject(o), title, ...(typeof about === 'string' ? { about } : {}) };
      }
    }
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
    // a phone's GPU has four times the pixels to fill per inch and a fraction of the power
    const coarse = matchMedia('(pointer: coarse)').matches;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.5 : 2));
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
    this.refollow(); // a framing made for the old shape no longer fits
  }

  /**
   * For the diagnostics readout: how fast the loop is turning over and what a drawn frame costs.
   * `fps` is the loop (what motion would get); `drawn` is how many of those frames were actually
   * drawn, since a still view is not redrawn.
   */
  stats(): { fps: number; drawn: number; ms: number; triangles: number; calls: number; levels: number[] } {
    const now = performance.now();
    const seconds = Math.max(1e-3, (now - this.statsAt) / 1000);
    const out = {
      fps: this.frames / seconds,
      drawn: this.drawn / seconds,
      ms: this.frames ? this.work / this.frames : 0,
      triangles: this.renderer.info.render.triangles,
      calls: this.renderer.info.render.calls,
      levels: this.staged.map((s) => s.shownLevel),
    };
    this.statsAt = now;
    this.frames = this.drawn = this.work = 0;
    return out;
  }

  private frame(): void {
    const began = performance.now();
    if (this.setting.attend?.(this.camera.position)) this.dirty = true;
    if (this.lamps.near(this.camera.position)) this.dirty = true; // the rooms nearest the eye are the ones lit
    // Hardware that has moved wants its shadows drawn again, in the same frame: a shadow drawn
    // a moment late lags behind what casts it and then jumps after it.
    if (this.shadowsOwed) {
      this.renderer.shadowMap.needsUpdate = true;
      this.shadowsOwed = false;
    }
    this.step();
    this.frames++;
    this.work += performance.now() - began;
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
    if (this.mode === 'chase') this.chase();
    if (this.flyTo) {
      const f = this.flyTo;
      f.t = Math.min(1, f.t + dt / f.seconds);
      const k = f.t * f.t * f.t * (f.t * (f.t * 6 - 15) + 10); // eased at both ends
      this.controls.target.lerpVectors(f.target0, f.target1, k);
      // the offset turns and changes length separately: lengths blend by ratio, so a long pull-back starts gently
      const turn = new THREE.Quaternion().setFromUnitVectors(f.offset0.clone().normalize(), f.offset1.clone().normalize());
      const offset = f.offset0.clone().applyQuaternion(new THREE.Quaternion().slerp(turn, k));
      offset.setLength(f.offset0.length() * (f.offset1.length() / f.offset0.length()) ** k);
      this.camera.position.copy(this.controls.target).add(offset);
      if (f.t >= 1) this.flyTo = null;
    }
    this.settle(dt);
    this.runWorks(dt);
    this.runFunctions(dt);
    if (this.walk.active) this.stepWalk(dt);
    else {
      if (this.walk.lens(dt)) this.dirty = true; // after a walk the lens closes again over half a second
      this.drive(dt);
      this.fitDetail();
      if (this.mode === 'fly') this.flyer.aim(this.camera, this.controls.target, Boolean(this.flyTo));
      else {
        this.alignUp();
        this.controls.update(dt);
      }
      this.keepInBounds();
      this.keepAboveGround();
      if (this.pointerDirty && !this.down) {
        this.pointerDirty = false;
        this.setHover(this.inert ? NOTHING : this.pick());
      }
      this.fitDepth();
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
    this.lastView.copy(this.camera.matrixWorld);
    this.lastProjection.copy(this.camera.projectionMatrix);
    this.dirty = false;
    this.ink.range(this.camera);
    this.renderer.info.reset();
    this.drawn++;
    this.origin.draw(() => this.composer.render(this.sinceDrawn));
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
    this.flyTo = null;
    this.following = null;
    this.held.clear();
    this.down = null;
    this.setHover(NOTHING);
    this.highlight(null, null);
    this.controls.enabled = false;
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
    this.controls.enabled = this.mode !== 'fly';
    this.flyer.read(this.camera);
    // orbit a point a few steps ahead, so the flight back starts from this very view
    this.controls.target.copy(this.camera.position).add(this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(3));
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
    const level = this.staged[at]!.full;
    let place = level.getObjectByName(seat.node);
    if (!place && seat.standIn) {
      // (a placeholder until the model has the node: at the middle of the stand-in, facing along `look`)
      const mesh = level.getObjectByName(seat.standIn.mesh);
      if (!mesh?.parent) return 'there is nowhere to sit';
      level.updateWorldMatrix(true, true);
      const middle = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
      const look = new THREE.Vector3(...seat.standIn.look).transformDirection(level.matrixWorld);
      place = new THREE.Object3D();
      place.name = seat.node;
      mesh.parent.add(place);
      place.position.copy(mesh.parent.worldToLocal(middle));
      const parent = mesh.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
      place.quaternion.copy(parent.multiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), look)));
      console.info(`seat ${seat.node}: a placeholder at the middle of ${seat.standIn.mesh}; the model has no such node`);
    }
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
    if (this.wheel) {
      // Seated, it is turned as the seat is (the seat has a figure's axes: a tilted seat tilts him)
      // and its hips are on the seat's hip point, sunk into the cushion as far as he must be to fit.
      const [fx, fz] = this.defs[at]!.walker?.forward ?? [0, 1];
      const turn = this.wheel.seatTurn(this.seatQ).multiply(spin.setFromAxisAngle(UP, -Math.atan2(fx, fz)));
      group.parent?.updateWorldMatrix(true, false);
      const parent = group.parent?.getWorldQuaternion(new THREE.Quaternion()) ?? new THREE.Quaternion();
      group.quaternion.copy(parent.invert().multiply(turn));
      const hips = this.wheel.hips(new THREE.Vector3()).addScaledVector(UP, -this.sunk);
      hips.sub(new THREE.Vector3(0, walk.gait.hipHeight(figure.shown), 0).applyQuaternion(turn));
      group.position.copy(group.parent ? group.parent.worldToLocal(hips) : hips);
    } else {
      group.rotation.set(0, this.facing(at), 0);
      group.position.copy(walk.body.position);
    }
    const placed = !group.visible || this.unseen !== unseen || !group.quaternion.equals(was) || !group.position.equals(from);
    group.visible = true;
    if (this.unseen !== unseen) this.shadowOnly(group, (this.unseen = unseen));
    // getting up, it eases out of however it was lying and into the first of the get-up over the first half second
    const rising = walk.gait.rising;
    walk.gait.apply(figure.shown, rising !== null && rising < 0.5 ? 1 - Math.exp(-this.walkDt * 10) : 1);
    if (this.wheel) this.atTheWheel(figure.shown, group);
    if (walk.down === 'rising' && walk.gait.rising === null) {
      walk.stand(group.position); // on its feet: the legs are the walker's again
      for (const level of group.children) for (const carry of this.carriesOf(level, at)) carry.pickUp(); // and what it dropped is in its hand again
    }
    this.carryOn(figure, at);
    // Breathing alone moves him by millimetres: seen from outside it is worth drawing, but
    // nobody's shadow is redrawn for it.
    if (placed || walk.stir === 2) this.renderer.shadowMap.needsUpdate = true; // its shadow walks with it
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
      this.renderer.shadowMap.needsUpdate = true;
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
        group.position.copy(walk.body.position);
        group.rotation.y = this.facing(at);
        walk.gait.rest(root);
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
    walk.gait.rise(doll.faceDown);
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
    if (!force && this.sun.target.position.distanceTo(p) < half * 0.35) return;
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
    shadow.bias = -Math.max(0.0002, half / 40000);
    this.renderer.shadowMap.needsUpdate = true;
  }

  /** For the diagnostics: the figure is being shown from outside but its model has no joints, so it glides. */
  get walkRigid(): boolean {
    const figure = this.staged[this.walked];
    return Boolean(figure && this.walk.active && this.walk.third && !this.walk.gait.jointed(figure.shown));
  }

  /** A frame on foot. None of the orbiting camera's rules apply: no drift, no bounds, no picking, its own depth range. */
  private stepWalk(dt: number): void {
    if (this.walk.update(dt)) this.dirty = true;
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
    this.fitDetail();
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

  /** For tests: nothing moves unless the camera is moved, and the sky (stars are single pixels) is hidden. */
  frozen = false;

  /** For tests: a named view, turned `azimuthDeg` about the vertical and nudged `nudgeDeg` more. */
  shot(viewId: string, azimuthDeg: number, nudgeDeg = 0): void {
    this.controls.autoRotate = false;
    this.flyTo = null;
    this.view(viewId, true);
    this.following = null; // an exact pose: a resize must not frame it again
    const offset = this.camera.position.clone().sub(this.controls.target);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(azimuthDeg + nudgeDeg));
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
  }

  /** For tests and screenshots: stop the drift and put the camera somewhere exact. */
  pose(azimuthDeg: number, elevationDeg: number, distance: number, targetY = this.centreY, targetX = 0, targetZ = 0): void {
    this.controls.autoRotate = false;
    this.flyTo = null;
    this.following = null;
    const az = THREE.MathUtils.degToRad(azimuthDeg),
      el = THREE.MathUtils.degToRad(elevationDeg);
    this.controls.target.set(targetX, targetY, targetZ);
    this.camera.position.set(
      targetX + distance * Math.cos(el) * Math.cos(az),
      targetY + distance * Math.sin(el),
      targetZ + distance * Math.cos(el) * Math.sin(az),
    );
    this.controls.update();
  }
}

import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Target } from '../app/actions.ts';
import { targetNodes } from '../app/address.ts';
import { readingFor } from '../sim/mechanism.ts';
import type { Flight as FlightData, ModelDef } from '../types.ts';
import { bodyOf, EARTH_SPHERE, gravityOn } from '../world/bodies.ts';
import { loadEphemeris } from '../world/ephemeris.ts';
import { lunarGround, lunarSiteOf } from './lunar/ground.ts';
import type { Clock } from '../world/clock.ts';
import { siteFrame, type Vec3 } from '../world/frames.ts';
import { sliderAt, timeAt } from '../world/sequence.ts';
import type { Ascent } from './ascent.ts';
import { GROUND_Y, type Setting, Settings, unhurried } from './backdrops.ts';
import { SUN_LUX } from './daysky.ts';
import { bulkOf } from './bulk.ts';
import { Cabin, type CabinThing } from './cabin.ts';
import { Cameras, type RigId, type Scene } from './camera/index.ts';
import type { MapOf } from './camera/rig.ts';
import type { MapFocus } from './camera/map.ts';
import { disposeTree } from './dispose.ts';
import type { Effects } from './effects.ts';
import { Eye, type Glaring, StarEye, veiled } from './eye.ts';
import { ground, lay, layering } from './laid.ts';
import { Lamps } from './lamps.ts';
import { type Levelled, LOD_ABOVE, lodUrl, Scenery, Staged } from './lod.ts';
import { type Look, Looks } from './look.ts';
import { refused, sayRefused } from './lost.ts';
import { HandWorks } from './onfoot/handworks.ts';
import { OnFoot } from './onfoot/onfoot.ts';
import { Solids, Walker } from './onfoot/walk.ts';
import { compileLast, drawLast, undrawLast } from './overlay.ts';
import { Panes } from './panes.ts';
import { through } from './pick.ts';
import { fitIndices, fitPictures } from './pictures.ts';
import { Recovery } from './recovery.ts';
import { Surfaces } from './runs.ts';
import { uShadowFade } from './shadows.ts';
import { OrbitBackdrop, wearTexture } from './space.ts';
import { CabinView } from './stage/cabinview.ts';
import { FlightShow } from './stage/flightshow.ts';
import { Framing } from './stage/framing.ts';
import { NOTHING, type Picked, Picker, skinless, type Thing } from './stage/picker.ts';
import { makeRenderer, Pipeline } from './stage/pipeline.ts';
import { Shadows } from './stage/shadows.ts';
import { grain, mark } from './surface.ts';
import { GLASS, LENS, visorOf } from './glass.ts';
import { tier } from './tier.ts';

/** Materials (by the name Blender gave them) that get the wear map. */
const WORN =
  /^(shingle|heatsink|aluminium|titanium|tower|steel|strap|paint-booster|paint-structure|paint-cabin|couch|concrete|suit|galvanised)/;
/** Materials that also take it as a bump map: cloth and poured concrete are never flat. */
const ROUGH_SURFACE = /^(suit|concrete)/;

const UP = new THREE.Vector3(0, 1, 0);

/** How much the exposure opens up in a room by day (as a share added), and over how many seconds; how far the rays that ask whether the eye is in one go, metres. */
/**
 * The Sun's light square on to it above the air, lux (daysky.ts: the USNO circular's), and the Earth's Bond albedo (NASA
 * Goddard, "Earth fact sheet": 0.294): what the sunlit Earth and the Sun lay over the stars above the air (`seeStars`).
 * Documented. And how much of the Sun's light the vehicle gives back: painted metal, white and black, half. Estimated.
 */
const EARTH_ALBEDO = 0.294;
const VEHICLE_ALBEDO = 0.5;
/** The Moon's Bond albedo (NASA Goddard, "Moon fact sheet": 0.11), for the light it lays over the stars as the Earth's is (`seeStars`). */
const MOON_ALBEDO = 0.11;
/** The exposure the eye settles on in a room: 2.1 times the sunlit ground's 0.8 (daysky.ts: DAY_EXPOSURE). */
const INDOORS_EXPOSURE = 1.68;
const INDOORS_SECONDS = 0.9;
/**
 * The sky's light on level ground, in the scene's units, for each unit of the setting's fill: the hemisphere light gives
 * its sky colour's 0.55 of it, and the reflections as much again and a little more (backdrops.ts: ENVIRONMENT). Measured
 * on the day's look, to the tenth: it is what the lamps' light is set against (eye.ts).
 */
const SKY_ON_GROUND = 1.8;
/**
 * The eye's colour vision goes as the light does, between these (cd/m²): all the cones' above the second, all the rods'
 * under the first. The mesopic range, 0.01 to 3 cd/m² (CIE 41, 1978). How far toward the rods' sight the night is drawn
 * at the bottom is for the look (`RODS_MOST`): estimated.
 */
const MESOPIC = [0.01, 3] as const;
const RODS_MOST = 0.8;
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
/** After the clock has been put somewhere, the hardware plays the last stretch before that instant (seconds of the sequence) at this many times life. */
const CATCH_UP_NEAR = 20;
const CATCH_UP_PACE = 4;
/** How much stronger the sky's fill light is in the cel look. */
const CEL_FILL = 4.5;

/** One model on its way in (Stage.load): how much of it has arrived, in bytes where the fetch says how big it is (total 0 until it does). */
export interface LoadPart {
  label: string;
  fraction: number;
  loaded: number;
  total: number;
}
/** What Stage.warm is doing: the place round the pad and the coarser levels arriving, the clouds made, the shaders built, a few frames to settle. */
export type WarmStep = 'place' | 'clouds' | 'shaders' | 'settle';
export type { Thing };

/** A click on board that was on nothing. */
const NO_THING: CabinThing = { label: '', about: null, object: new THREE.Object3D() };

/** A staged model owns its scene graph, including the pose of every joint, even when another figure wears the same GLB. */
function modelKey(model: ModelDef, level = 0): string {
  return `${model.id}:${lodUrl(model.url, level)}`;
}

/** Put every part of a model back where it was built. */
function rest(object: THREE.Object3D): void {
  object.traverse((o) => o.userData.home && o.position.copy(o.userData.home as THREE.Vector3));
}

/**
 * What a picture is, as text: its name (the image's file, as the model was built: lettering is set in the repo's own
 * font from the same words), its size, and how it is read. Two with the same are the same picture; null for one with no
 * name, which is never taken for another.
 */
function pictureKey(t: THREE.Texture): string | null {
  const image = t.image as { width?: number; height?: number } | null;
  if (!t.name || !image?.width) return null;
  return [
    t.name,
    image.width,
    image.height,
    t.colorSpace,
    t.flipY,
    t.wrapS,
    t.wrapT,
    t.channel,
    t.offset.toArray(),
    t.repeat.toArray(),
    t.rotation,
  ].join('|');
}

/**
 * The 3D half of the app: one scene holding all of a flight's models, in its setting. One of
 * them is the section being studied: its parts can be picked, cut open and taken apart. Moving
 * between sections is a flight of the camera, never a change of scene.
 */
/** Take out of a model's scene the nodes its def says are not drawn where it stands (`ModelDef.absent`). */
function absent(scene: THREE.Object3D, def: ModelDef): void {
  for (const name of def.absent ?? []) scene.getObjectByName(name)?.removeFromParent();
}

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
  /** Is the hardware catching the clock up after a jump (`follow`: the last stretch at CATCH_UP_PACE times life), not in step with it? */
  get catchingUp(): boolean {
    return this.clock !== null && this.shownT !== this.clock.t;
  }
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
  onHoverWindow: (over: boolean, name?: string) => void = () => {};
  /**
   * A right click on something: where on the page, where in the world, whether it can be stood on, and whether it is
   * the flown vehicle off its pad (`craft`: the spot in the vehicle's own frame, which is where it still is a moment
   * later when the vehicle has gone on), with the part of it that was hit (`node`: Part.node, or null).
   */
  onSpot: (
    page: { x: number; y: number },
    point: THREE.Vector3,
    floor: boolean,
    on: { craft: THREE.Vector3 | null; node: string | null; shed: { drop: number; name: string } | null },
  ) => void = () => {};
  /** The reset key (0): back to where the section starts. */
  onHome: () => void = () => {};
  /** The skin has been opened or put back, whoever asked (a key, a switch, a part chosen inside): what shows it is told. */
  onCutaway: (on: boolean) => void = () => {};
  /** The view has been sent to follow something the vehicle let go (its name), or is back with the vehicle (null). */
  onFollow: (name: string | null) => void = () => {};
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
  /** While walking: the mouse has been captured for looking round, or let go. */
  onWalkLook: (captured: boolean) => void = () => {};
  /** While walking: Escape has let the captured mouse go, and the walk goes on (onfoot/escape.ts). */
  onWalkFreed: () => void = () => {};
  /** First-person walking (walk.ts). While it is active the orbiting camera's rules are all suspended. */
  readonly walk: Walker;
  /** The last tap, and the figure that can be walked as that it landed on, for telling a double tap on one. */
  private tap: { t: number; x: number; y: number; walker: string | null } = { t: 0, x: 0, y: 0, walker: null };
  private readonly blockAt = new THREE.Vector3();
  private readonly blockWay = new THREE.Vector3();
  /** The orbiting camera's lens, vertical degrees. Views are framed for it even while the walker's wider one is easing in or out. */
  private readonly lens = 35;

  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(35, 1, 0.05, 9000);
  /** The camera: every rig, and the hands on the page (camera/index.ts). Nothing else moves the view when nobody is being walked as. */
  readonly cam: Cameras;
  /** The rig in charge of the camera has changed (the hands, the page, or the vehicle leaving the pad). */
  onRig: (id: RigId) => void = () => {};
  /** What the camera is sent to frame, in what the controls leave clear (stage/framing.ts). */
  readonly framing: Framing;
  /** The view from a seat: which is sat in, what is looked out of, the lean to it (stage/cabinview.ts). */
  readonly seats: CabinView;
  /** What is under the pointer (stage/picker.ts). */
  readonly picker: Picker;
  /** The flight on show: the vehicle where the clock has it, what it sheds, its fires, trail and parachutes (stage/flightshow.ts). */
  readonly show: FlightShow;
  /** The functions of the models' parts worked by hand, and their levers (onfoot/handworks.ts). */
  readonly hands: HandWorks;
  /** Being at the place on foot: the figure walked as, what it aims at, drives, boards, carries and works (onfoot/onfoot.ts). */
  readonly onFoot: OnFoot;
  /** The Sun's shadows: its fine map and where it is spent, the far map under it (stage/shadows.ts). */
  readonly shadows: Shadows;
  /** The frame from the scene to the screen: the passes, the drawing's resolution, the near plane (stage/pipeline.ts). */
  readonly pipe: Pipeline;
  private readonly settings: Settings;
  private readonly fill = new THREE.HemisphereLight(0, 0, 0.5);
  /** Kept for the plumb line's turn toward the Moon's vertical (`world`): made once. */
  private readonly upTurn = new THREE.Quaternion();
  private readonly upNone = new THREE.Quaternion();
  private readonly upMoon = new THREE.Vector3();
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
  /** What falls on foot at the flight's place falls by, m/s^2: the body its site stands on (world/bodies.ts). */
  private underfoot = gravityOn(bodyOf(undefined));
  /** The floodlights the models carry: lit when the Sun is down. */
  private lamps = new Lamps();
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

  /** For measuring: the ground's layers drawn apart in depth (laid.ts), or where they are. */
  set layered(on: boolean) {
    for (const material of layering(on)) this.looks.sync(material);
    this.dirty = true;
  }

  private setting: Setting;
  private root: THREE.Group | null = null;
  /** The place round the pad (Flight.surroundings): scenery, outside `root`, so it is never measured, picked or framed. */
  private surroundings: THREE.Object3D | null = null;
  /** Its levels of detail, chosen building by building (lod.ts): `surroundings` is its level 0. */
  private scenery: Scenery | null = null;
  /** What chooses its own levels of detail beyond the models: the place round the pad, and the setting's scenery round that (lod.ts `Levelled`). */
  /** The terrain's height under the models' zero (the pad's grade, SiteDef.grade: backdrops.ts `Setting.grade`). */
  private get grade(): number {
    return this.setting.grade ?? GROUND_Y;
  }
  /**
   * The paving's level against the models' zero: the zero itself at a pad laid at grade, and under it at one whose zero
   * is a deck on a stand (Complex 14's is 22 ft up). The land is drawn its 12 cm under a paving everywhere, so it is
   * the grade less those.
   */
  private get paved(): number {
    return Math.min(0, this.grade - GROUND_Y);
  }

  private get sceneries(): Levelled[] {
    return [...(this.scenery ? [this.scenery] : []), ...(this.setting.levels ?? [])];
  }
  /** Every model of the flight, in the flight's order, each with its levels of detail. */
  private staged: Staged[] = [];
  /** What came to the spacecraft where it came down (recovery.ts): flown about the point by the flight on show, not one of its models. */
  private recovered: Recovery[] = [];
  /** What a thing that slides or drives runs on (Move `runs`: viewer/runs.ts): the flight's models, the place and the land. */
  private readonly surfaces = new Surfaces((x, z) => this.groundAt(x, z));
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
  /** The scene is being drawn for someone: a level of detail that arrives now comes in as a change of level does, over a moment (lod.ts). */
  private get onShow(): boolean {
    return !this.held && !this.frozen && !this.asleep;
  }
  /** What the device is taken to be able to hold, and what follows from it (tier.ts): fixed as the page opens. */
  readonly tier = tier();
  /** `?plain` in the address: everything the old way, for measuring the new against it (tools/bench.mjs). */
  private readonly plain: boolean;
  private sinceDrawn = 0;
  private readonly lastView = new THREE.Matrix4();
  private readonly lastProjection = new THREE.Matrix4();

  constructor(private readonly canvas: HTMLCanvasElement) {
    // (a context the browser takes away stops the loop for good: lost.ts)
    this.renderer = makeRenderer(canvas, () => {
      this.lost = true;
    });
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

    // (taking hold of the view lets go of whatever it was framed on: Framing.taken)
    this.cam = new Cameras(
      this.camera,
      canvas,
      this.world(),
      {
        taken: (how) => this.framing.taken(how),
        home: () => this.onHome(),
        // (following a stage that has left, the reset key comes back to the vehicle)
        back: () => {
          if (this.show.followed === null) return false;
          this.show.followShed(null);
          return true;
        },
        rig: (id) => this.rigChanged(id),
      },
      this.lens,
    );
    this.framing = new Framing({
      canvas,
      camera: this.camera,
      cam: this.cam,
      lens: this.lens,
      parts: () => this.parts,
      def: () => this.def,
      main: () => this.main,
      root: () => this.root,
      onCraft: () => this.defs[this.current]?.id === this.ascent?.model,
      flying: () => (this.lifted.flying ? (this.flier?.group ?? null) : null),
      modelsBox: (without) => this.modelsBox(without),
      lift: () => this.show.lift(),
      setting: () => this.setting,
      centreY: () => this.centreY,
      redraw: () => {
        this.dirty = true;
      },
      onView: (id) => this.onView(id),
      onInteract: () => this.onInteract(),
      onVisit: () => this.onVisit(),
    });
    this.seats = new CabinView({
      cam: this.cam,
      walk: () => this.walk,
      bounds: this.bounds,
      defs: () => this.defs,
      staged: () => this.staged,
      current: () => this.current,
      exhibit: () => this.exhibit,
      flown: () => this.ascent?.model,
      craft: () => this.show.craft(),
      cabin: () => this.cabin,
      boarded: () => this.onFoot.boarded,
      partOf: (name) => this.partOf(name),
      shed: () => this.debris,
      redraw: () => {
        this.dirty = true;
      },
      reshade: () => {
        this.renderer.shadowMap.needsUpdate = true;
        this.dirty = true;
      },
      onSeat: () => this.onSeat(),
      onLean: (at) => this.onLean(at),
    });
    this.shadows = new Shadows({
      renderer: this.renderer,
      camera: this.camera,
      cam: this.cam,
      bounds: this.bounds,
      plain: this.plain,
      setting: () => this.setting,
      exhibit: () => this.exhibit,
      frozen: () => this.frozen,
      redraw: () => {
        this.dirty = true;
      },
      oweShadows: () => {
        this.shadowsOwed = true;
      },
      cover: () => this.shadowed(),
      section: () => this.sectionBox(),
      fitBounds: () => this.fitBounds(),
      cabin: () => this.seats.cabinBox(),
      walker: () => this.walk.body.position,
      craft: () => (this.show.followed !== null && this.show.shedCraft) || this.show.crafted,
      busy: () => this.onFoot.tumble !== null || this.onFoot.wheel !== null || this.onFoot.boarding !== null,
    });
    this.show = new FlightShow({
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      cam: this.cam,
      sun: this.shadows.sun,
      veils: this.veils,
      looks: this.looks,
      plain: this.plain,
      clock: () => this.clock,
      defs: () => this.defs,
      staged: () => this.staged,
      root: () => this.root,
      setting: () => this.setting,
      grade: () => this.grade,
      effects: () => this.effects,
      cut: () => this.cut,
      setCutaway: (on) => this.setCutaway(on),
      fitBounds: () => this.fitBounds(),
      exhibited: () => this.seats.exhibited(),
      exhibit: () => this.exhibit,
      selected: () => this.selected,
      seatIndex: () => this.seats.seatAt,
      seatNode: (at, seat) => this.seats.seatNode(at, seat),
      redraw: () => {
        this.dirty = true;
      },
      oweShadows: () => {
        this.shadowsOwed = true;
      },
      onFollow: (name) => this.onFollow(name),
      recovery: () => this.recovered,
    });
    const { sun, far } = this.shadows;
    this.scene.add(sun, sun.target, this.fill);
    this.scene.add(far.light, far.light.target, far.sky, far.sky.target);

    this.pipe = new Pipeline(this.renderer, this.scene, this.camera, {
      backdrop: this.setting.backdrop,
      veils: this.veils,
      screens: () => this.screens(),
      cutPlanes: this.cutPlanes,
      plain: this.plain,
      redraw: () => {
        this.dirty = true;
      },
      depth: {
        bounds: this.bounds,
        frozen: () => this.frozen,
        pivot: () => this.cam.pivot,
        setting: () => this.setting,
        grade: () => this.grade,
        flying: () => (this.lifted.flying ? this.flier : null),
        shed: () => this.debris,
        chutes: () => this.show.chutes,
        solids: () => this.walk.solids,
        solidRoots: () => this.solidRoots(),
        owe: (geometry: THREE.BufferGeometry) => this.picker.treesOwed.add(geometry),
      },
    });
    // (the only light with a shadow, the only sky light)
    for (const light of [sun, far.light, far.sky, this.fill]) this.pipe.origin.light(light);
    this.applySetting();

    this.picker = new Picker({
      camera: this.camera,
      cutPlanes: this.cutPlanes,
      cut: () => this.cut,
      staged: () => this.staged,
      defs: () => this.defs,
      current: () => this.current,
      parts: () => this.parts,
      surroundings: () => this.surroundings,
      floor: () => this.setting.floor ?? null,
      solids: () => this.walk.solids,
      thingAt: (point) => this.cabin?.thingAt(point),
      shed: () => this.debris,
      dropTitle: (drop) => this.show.dropTitle(drop),
      flying: () => (this.lifted.flying ? this.flier : null),
    });
    // A tap sends no pointermove first, so every handler that picks reads the pointer itself.
    const aim = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      this.picker.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
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
      const spot = this.picker.spot();
      if (spot) this.onSpot({ x: e.clientX, y: e.clientY }, spot.point, spot.floor, spot.on);
    });
    canvas.addEventListener('pointerdown', (e) => {
      if (this.walk.active) return; // on foot there is nothing to pick: a drag looks round
      if (e.button !== 0) return; // right and middle buttons pan and zoom; they select nothing
      aim(e);
      this.down = { x: e.clientX, y: e.clientY, ...this.picker.pick() };
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
      if (down.pane) this.framing.lookIn(down.pane.point, down.pane.normal);
      else if (down.place) this.framing.visit(down.place.box);
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
      shoulder: this.cam.shoulder,
      solids: () => this.solidRoots(),
      // a setting's floor is one level plane: its height is asked for, not its triangles
      ground: () => this.setting.floor?.position.y ?? null,
      groundAt: (x, z) => this.groundAt(x, z),
      paved: () => this.paved,
      plantsOut: (at, margin) => this.setting.plantsOut?.(at, margin) ?? 0,
      reach: () => Math.max(this.bounds.radius, this.setting.reach ?? 0),
      leave: () => this.onFoot.exitWalk(),
      act: () => this.onWalkAct(),
      viewed: (third) => {
        if (this.walk.active) this.cam.foot(this.walk.view, third); // (through the eyes or over the shoulder: camera/foot.ts)
        this.onWalkView(third);
      },
      locked: (on) => this.onWalkLook(on),
      freed: () => this.onWalkFreed(),
    });

    this.hands = new HandWorks({
      defs: () => this.defs,
      staged: () => this.staged,
      apart: () => this.apart,
      scripted: () => this.scripted,
      redraw: () => {
        this.dirty = true;
      },
      reshade: () => {
        this.dirty = true;
        this.renderer.shadowMap.needsUpdate = true;
      },
      fitBounds: () => this.fitBounds(),
    });
    this.onFoot = new OnFoot({
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      cam: this.cam,
      walk: this.walk,
      bounds: this.bounds,
      looks: this.looks,
      shadows: this.shadows,
      seats: this.seats,
      picker: this.picker,
      defs: () => this.defs,
      staged: () => this.staged,
      surroundings: () => this.surroundings,
      scenery: () => this.scenery,
      setting: () => this.setting,
      clock: () => this.clock,
      cabin: () => this.cabin,
      functions: (model, node) => this.hands.functions(model, node),
      scripted: () => this.scripted,
      groundAt: (x, z) => this.groundAt(x, z),
      fitBounds: () => this.fitBounds(),
      fitDetail: (dt) => this.fitDetail(dt),
      adapt: (dt, walking) => this.adapt(dt, walking),
      visit: (box) => this.framing.visit(box),
      redraw: () => {
        this.dirty = true;
      },
      onWalk: (on, model) => this.onWalk(on, model),
      onWalkTarget: (target) => this.onWalkTarget(target),
      onWalkEyes: (through) => this.onWalkEyes(through),
      onSeat: () => this.onSeat(),
      gravity: () => this.underfoot,
    });

    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  /** The flight off the pad (ascent.ts): the run on show, whose model flies. */
  private get ascent(): Ascent | null {
    return this.show.ascent;
  }

  /** The model the flight carries off the pad, if there is one. */
  private get flier(): Staged | null {
    return this.show.flier;
  }

  /** What has been done to the model that flies: the clock's instant it was put at, whether it is off its pad, what it has shed. */
  private get lifted(): FlightShow['lifted'] {
    return this.show.lifted;
  }

  /** What the vehicle has let go, each node in a holder of its own. */
  private get debris(): FlightShow['debris'] {
    return this.show.debris;
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
    // (a load asked for after this one, or the flight let go meanwhile, supersedes it: it stops where it is)
    const token = ++this.loads;
    // The bar is weighted by bytes once every model's size is known (the fetch's Content-Length); until then it is their average.
    const parts: LoadPart[] = flight.models.map((m) => ({ label: m.name, fraction: 0, loaded: 0, total: 0 }));
    // (only where there is a site for them to fly at: the gallery has none)
    const recovery = flight.site ? (flight.recovery ?? []) : [];
    // (on the Moon: the site's ground before its setting is built, and DE440 for the Sun and the Earth over it: lunar/setting.ts)
    const lunar = lunarSiteOf(flight.site);
    const [craftScenes, scenes] = await Promise.all([
      Promise.all(recovery.map((r) => this.fetch(r.url))),
      Promise.all(
        flight.models.map((m, i) =>
          this.fetch(
            m.url,
            (f, loaded = 0, total = 0) => {
              const part = parts[i]!;
              Object.assign(part, { fraction: f, loaded: f === 1 && total === 0 ? part.total : loaded, total: total || part.total });
              const sized = parts.every((p) => p.total > 0);
              const all = sized ? parts.reduce((a, p) => a + p.total, 0) : parts.length;
              onProgress?.(parts.reduce((a, p) => a + (sized ? p.fraction * p.total : p.fraction), 0) / all, parts);
            },
            modelKey(m),
          ),
        ),
      ),
      lunar ? Promise.all([lunarGround(lunar), loadEphemeris()]) : null,
    ]);
    if (token !== this.loads) return;
    if (this.root) this.scene.remove(this.root);
    if (this.setting.floor) this.scene.remove(this.setting.floor);
    for (const o of this.setting.scenery) this.scene.remove(o);
    if (this.setting.globe) this.scene.remove(this.setting.globe.group);
    if (this.setting.moon) this.scene.remove(this.setting.moon.group);
    for (const o of this.setting.selfDrawn ?? []) this.scene.remove(o);
    // (another flight than the one on show: what is the last one's alone is let go, and every piece forgets it)
    if (this.root) this.forget();
    this.releaseModels(flight);
    this.defs = flight.models;
    this.surfaces.set([]);
    this.staged = flight.models.map((def, i) => {
      rest(scenes[i]!);
      absent(scenes[i]!, def);
      const staged = new Staged(scenes[i]!, def.parts, this.surfaces);
      staged.group.position.set(...(def.position ?? [0, 0, 0]));
      staged.group.rotation.y = def.rotationY ?? 0;
      // (tipped as it came to rest, about its own axes once turned: the heading, then the pitch, then the roll)
      if (def.attitude) staged.group.rotation.set(def.attitude.roll, def.rotationY ?? 0, def.attitude.pitch, 'YZX');
      const lamps = (def.lights ?? []).map((l) => {
        const lamp = new THREE.PointLight(l.colour, l.intensity, l.reach, 2);
        lamp.position.set(...l.position);
        staged.group.add(lamp);
        return lamp;
      });
      // (at a site the cabin reads the flight at the clock's instant; in the gallery, with no flight to read, it stands as built)
      if (def.cabin) {
        if (def.cabin.head) this.cam.onboard.limits = { ...def.cabin.head };
        this.cabin?.dispose();
        this.cabin = new Cabin(this.cabinHost(), flight, def, staged.group, staged.full, lamps);
        this.cabin.exposed(this.renderer.toneMappingExposure);
        if (this.cut) this.cabin.opened(true); // (made with the cutaway already open)
      }
      return staged;
    });
    this.apart = this.staged.map(() => 0);
    this.apartGoal = this.staged.map(() => 0);
    this.apartOwn = this.staged.map(() => 0);
    this.root = new THREE.Group();
    this.root.add(...this.staged.map((s) => s.group));
    this.scene.add(this.root);
    // (what came to it where it came down stands in the scene, not under the root: it is no part of what is framed)
    this.arriving = [];
    this.recovered = recovery.map((def, i) => {
      rest(craftScenes[i]!);
      const r = new Recovery(def, new Staged(craftScenes[i]!, []), siteFrame(flight.site!), flight.site!.seaLevel.value);
      this.scene.add(r.group);
      this.looks.add(r.group);
      for (let level = 1; level <= (this.fullDetail ? 0 : LOD_ABOVE.length); level++)
        this.awaitLevel(
          this.fetch(lodUrl(def.url, level)).then((object) => {
            if (!this.recovered.includes(r)) return;
            rest(object);
            r.staged.add(level, object, this.onShow);
            r.findRotors();
            this.dirty = true;
          }),
        );
      return r;
    });
    this.root.updateMatrixWorld(true);
    for (const s of this.staged) s.measure();
    this.shadows.far.refit();
    this.lamps.clear();
    this.veils.splice(0, this.veils.length, ...this.veils.filter((o) => this.shows(o))); // (the last flight's are gone with its models)
    this.show.load(flight);
    this.lamps = new Lamps();
    for (const s of this.staged) this.lamps.add(s.full, this.scene);
    // the coarser levels arrive behind the scenes; a model that has none simply stays as it is
    const staged = this.staged;
    flight.models.forEach((def, i) => {
      for (let level = 1; level <= (this.fullDetail ? 0 : LOD_ABOVE.length); level++)
        this.awaitLevel(
          this.fetch(lodUrl(def.url, level), undefined, modelKey(def, level)).then((object) => {
            if (staged !== this.staged) return;
            rest(object);
            absent(object, def);
            staged[i]!.add(level, object, this.onShow);
            this.lamps.glow(object);
            this.renderer.shadowMap.needsUpdate = true; // (if it is the level now drawn, its shadow is another shape)
            this.dirty = true;
          }),
        );
    });
    this.underfoot = gravityOn(bodyOf(flight.site?.body));
    // (a flight with no site has no place and no hour: its models stand in a setting that needs neither)
    const kind = flight.models[0]!.backdrop;
    const when = flight.site ? { site: flight.site, launch: flight.launch, weather: flight.weather, plan: flight.plan } : undefined;
    // Another place, or the same place on another day, is another setting: the one left is let go first, before the
    // next is built, so that what the place installs for its day (its air and weather: air.ts, weathermap.ts, the
    // atmosphere) is the next one's, and nothing of the last stays on the GPU.
    const another = this.settings.keyOf(kind, when) !== this.settingKey;
    if (another) {
      for (const o of [this.setting.floor, ...this.setting.scenery, this.setting.globe?.mesh, this.setting.globe?.swellMesh])
        if (o) this.looks.remove(o);
      this.settings.drop(this.setting);
    }
    this.setting = this.settings.get(kind, when);
    this.settingKey = this.settings.keyOf(kind, when);
    this.applySetting();
    // (what stays on the stage, a model the two flights share and the stage's own, is built again under the new place's
    // text: programs.ts)
    if (another)
      this.scene.traverse((o) => {
        for (const m of (o as THREE.Mesh).material ? [(o as THREE.Mesh).material].flat() : []) (m as THREE.Material).needsUpdate = true;
      });
    // (what slides or drives stands on the models and the land: the place's rails and roads too once it has come)
    this.surfaces.set(this.staged.map((s) => s.full));
    for (const s of this.staged) s.resurface();
    // the place round the pad arrives when it arrives: the flight can be studied without it
    for (const o of this.scenery?.all ?? (this.surroundings ? [this.surroundings] : [])) this.scene.remove(o);
    this.surroundings = null;
    this.scenery = null;
    const place = flight.surroundings;
    if (place)
      this.awaitLevel(
        this.fetch(place).then((object) => {
          if (staged !== this.staged) return;
          this.surroundings = object;
          this.shadows.far.refit();
          this.scene.add(object);
          object.updateMatrixWorld(true);
          this.surfaces.set([...staged.map((s) => s.full), object]);
          for (const s of staged) s.resurface();
          const scenery = (this.scenery = new Scenery(object));
          this.lamps.add(object, this.scene); // its floods, and a light in each room where the model hangs one (Light_<room>)
          this.renderer.shadowMap.needsUpdate = true;
          this.dirty = true;
          // its coarser levels, for the buildings that are far off
          for (let level = 1; level <= LOD_ABOVE.length; level++)
            this.awaitLevel(
              this.fetch(lodUrl(place, level)).then((coarse) => {
                if (this.scenery !== scenery) return;
                this.scene.add(coarse);
                scenery.add(level, coarse, this.onShow);
                this.lamps.glow(coarse);
                this.renderer.shadowMap.needsUpdate = true;
                this.dirty = true;
              }),
            );
        }),
      );
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
    this.shadows.fitShadows();
    this.framing.view(def.home ?? 'all', snap);
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
    // (an exhibit taken apart reaches further than one standing whole: the far map is fitted to it again as it starts and ends)
    if (this.exhibit && i === this.current && t > 0 !== (this.apart[i] ?? 0) > 0) this.shadows.far.refit();
    this.apart[i] = t;
    this.staged[i]?.explode(t);
    this.lamps.place(); // lamps ride the hardware they are on
    this.dirty = true;
    this.shadowsOwed = true; // drawn again in step(): at once, or a few times a second in a view nobody is steering
  }

  /** An optional scene or detail level can fail independently, even if requested after warming began. */
  private awaitLevel(level: Promise<void>): void {
    this.arriving.push(level.catch((error) => console.warn('A level of detail could not be loaded:', error)));
  }

  private fetch(url: string, onProgress?: (fraction: number, loaded?: number, total?: number) => void, key = url): Promise<THREE.Object3D> {
    let promise = this.loaded.get(key);
    if (!promise) {
      promise = this.loader
        .loadAsync(import.meta.env.BASE_URL + url, (e) => {
          if (e.total) onProgress?.(e.loaded / e.total, e.loaded, e.total);
        })
        .then(async (gltf) => {
          await fitPictures(gltf.scene); // (the tier's sizes, before anything is sent to the GPU: pictures.ts)
          // A superseded fetch is disposed by releaseModels. It must never register materials for its replacement.
          if (this.loaded.get(key) !== promise) return gltf.scene;
          this.sharePictures(gltf.scene);
          fitIndices(gltf.scene);
          this.dress(gltf.scene, key);
          return gltf.scene;
        });
      this.loaded.set(key, promise);
      promise.catch(() => {
        if (this.loaded.get(key) === promise) this.loaded.delete(key); // a retry may already own the key
      });
    }
    if (onProgress)
      void promise.then(
        () => onProgress(1),
        () => {},
      );
    return promise;
  }

  /** What Blender's export cannot carry: shadows, anisotropy, and the wear on every surface. */
  /** Each picture the models of the flight on show wear, by what it is (`pictureKey`): one copy for all of them. */
  private pictures = new Map<string, THREE.Texture>();

  /**
   * Have every material of `object` wear the copy of a picture another model already wears, where it is the same picture:
   * the crew's suit, the spacecraft and its cabin each carry the NASA insignia and the pilot's name, and each file its own
   * copy (Liberty Bell 7's site held three of each on foot, 4 MiB of a phone's budget). Its own copy is let go.
   */
  private sharePictures(object: THREE.Object3D): void {
    const seen = new Set<THREE.Material>();
    const unused = new Set<THREE.Texture>();
    const stillUsed = new Set<unknown>();
    object.traverse((o) => {
      const worn = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      for (const m of worn ? (Array.isArray(worn) ? worn : [worn]) : []) {
        if (seen.has(m)) continue;
        seen.add(m);
        const slots = m as unknown as Record<string, unknown>;
        for (const [slot, value] of Object.entries(slots)) {
          const t = value as THREE.Texture | null;
          if (!t?.isTexture) continue;
          const key = pictureKey(t);
          if (!key) {
            stillUsed.add(t.image);
            continue;
          }
          const kept = this.pictures.get(key);
          if (!kept) this.pictures.set(key, t);
          else if (kept !== t) {
            slots[slot] = kept;
            unused.add(t);
          }
        }
      }
    });
    // Multiple materials can reference one texture, and different samplers can share an image.
    // Closing it during traversal changes its width to zero and prevents later slots finding their key.
    for (const t of this.pictures.values()) stillUsed.add(t.image);
    const images = new Set([...unused].map((t) => t.image as { close?: () => void } | null));
    for (const t of unused) t.dispose();
    for (const image of images) if (!stillUsed.has(image)) image?.close?.();
  }

  private dress(object: THREE.Object3D, url: string): void {
    const anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const seen = new Set<THREE.Material>();
    const clear: THREE.Mesh[] = [];
    object.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) {
        // GLTFLoader expands a multi-material mesh into a group of drawable primitives.
        // Its extras stay on the group. Give each primitive the authored shell flag.
        if (o.userData.shell) {
          for (const child of o.children) if ((child as THREE.Mesh).isMesh) child.userData.shell = o.userData.shell;
        }
        return;
      }
      mesh.castShadow = mesh.receiveShadow = true;
      const shell = Boolean(mesh.userData.shell);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat.name.startsWith('glass')) {
        const pane = mat.name.startsWith('glass-visor') ? visorOf(mat) : mat.name.startsWith('glass-lens') ? LENS : GLASS;
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
        lay(mat); // what lies on the ground is kept apart from what it lies on, at any distance (laid.ts)
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
        lay(marked); // (its own material, made from the one just laid)
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

  /** Whether the cutaway is open. */
  get cutaway(): boolean {
    return this.cut;
  }

  /**
   * Open or close the cutaway. With it open, shells show their inner faces too. On the vehicle while it is flying
   * the skin is not cut but taken off whole: the cut is a pair of planes standing in the place, which a vehicle that
   * has left and turned is no longer between, and what is wanted up there is the whole of what is inside, to scale.
   */
  setCutaway(on: boolean): void {
    this.cut = on;
    this.cabin?.opened(on);
    // (whoever opens it: a room's lamp on what is inside comes with the opening, never apart from it)
    this.setting.inside?.(on);
    this.dirty = true;
    this.onCutaway(on);
    const at = this.main?.position ?? new THREE.Vector3();
    const [x, z] = this.def?.cutawayQuadrant ?? [-1, 1];
    this.cutPlanes[0]!.normal.set(-x, 0, 0);
    this.cutPlanes[1]!.normal.set(0, 0, -z);
    for (const plane of this.cutPlanes) plane.constant = -plane.normal.dot(at);
    const whole = on && this.lifted.flying && this.def?.id === this.ascent?.model;
    // only the section's own model opens (and only its full level has an inside to show)
    const active = this.def && modelKey(this.def);
    for (const [key, shells] of this.shellMaterials) {
      const mine = on && key === active;
      const open = mine && !whole;
      for (const m of shells.values()) {
        m.visible = !(mine && whole); // (not drawn, and no shadow from it: the Sun is on what is inside)
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
    this.shadows.sun.color.set(s.sunColor);
    this.shadows.sun.intensity = s.sunIntensity;
    this.fill.intensity = s.fill[2] * (this.looks.current === 'cel' ? CEL_FILL : 1);
    this.expose();
    // the floodlights as the place has them (SiteDef.lamps); where it has none, they come on as the direct light fails
    this.lamps.set(s.lamps ?? 1 - THREE.MathUtils.smoothstep(s.sunIntensity, 0.25, 1.6), this.renderer.toneMappingExposure);
    if (shadows) {
      if (this.walk.active) this.shadows.fitWalkShadows(true);
      else {
        const target = this.shadows.sun.target.position;
        const back = this.shadows.sun.position.distanceTo(target); // as far up the light's line as it was fitted
        this.shadows.sun.position.copy(target).addScaledVector(s.sunDir, back);
      }
      this.renderer.shadowMap.needsUpdate = true;
    }
    this.dirty = true;
  }

  private applySetting(): void {
    const s = this.setting;
    this.pipe.setBackdrop(s.backdrop);
    this.scene.environment = s.environment;
    this.scene.environmentIntensity = s.environmentIntensity;
    this.shadows.sun.color.set(s.sunColor);
    this.shadows.sun.intensity = s.sunIntensity;
    this.fill.color.set(s.fill[0]);
    this.fill.groundColor.set(s.fill[1]);
    this.light();
    this.eye.reset();
    this.starEye.reset();
    s.stars?.(this.starEye.limit);
    this.eyeCut = true;
    this.expose();
    if (s.floor) this.scene.add(s.floor);
    s.floor?.traverse((o) => {
      const material = (o as THREE.Mesh).material;
      if (material && !Array.isArray(material)) ground(material); // (under everything laid on it: laid.ts)
    });
    for (const o of s.scenery) this.scene.add(o);
    for (const o of [s.floor, ...s.scenery]) if (o) this.looks.add(o);
    if (s.globe) {
      this.scene.add(s.globe.group);
      this.looks.add(s.globe.mesh);
      if (s.globe.swellMesh) this.looks.add(s.globe.swellMesh);
    }
    // (the Moon draws itself in both looks: the setting tells it which, Setting.simplify)
    if (s.moon) this.scene.add(s.moon.group);
    for (const o of s.selfDrawn ?? []) this.scene.add(o);
    this.scene.fog = s.fog;
    this.pipe.clouds.setAir(s.air?.air ?? null, s.weather ?? null, s.globe && ((eye) => s.globe!.altitude(eye)));
    this.renderer.shadowMap.needsUpdate = true;
    this.dirty = true;
  }

  /**
   * A mechanism of a model worked by hand (types.ts: MechanismDef; sim/mechanism.ts): its nodes stand `travel` of the
   * way out (0 to 1) whatever the clock's programme has them at, or with null follow the clock again. The cabin is
   * told, for what its periscope then sees.
   */
  setMechanism(id: string, travel: number | null): void {
    const at = this.defs.findIndex((m) => m.mechanisms?.some((x) => x.id === id));
    const mechanism = this.defs[at]?.mechanisms?.find((x) => x.id === id);
    const staged = this.staged[at];
    if (!mechanism || !staged) return;
    if (staged.work(mechanism.nodes, travel === null ? null : readingFor(mechanism, mechanism.from, travel))) {
      this.dirty = true;
      this.shadowsOwed = true;
    }
    this.cabin?.setMechanism(id, travel);
  }

  /** Put a rig in charge, blending out the old view unless the camera is being set behind the curtain. */
  setCamera(mode: RigId, snap = false): void {
    this.cam.set(mode, snap);
  }

  /**
   * What a map of the flight is of (camera/rig.ts `MapOf`: the Earth, how far it has turned, how far what is shown of
   * the flight reaches), given by whoever draws the flight's path (app/session.ts: viewer/path.ts `mapOf`). Without it,
   * or while it gives null, there is no map to go to.
   */
  mapOf: (() => MapOf | null) | null = null;

  /** How far the Moon itself is drawn over the sky (viewer/flightmoon.ts `covers`): 0 where this stage has none, or it is not drawn. */
  get moonCovers(): number {
    return this.setting.moon?.covers ?? 0;
  }

  /** Into the map (camera/map.ts), or back out of it to the view it was taken from. */
  setMap(on: boolean): void {
    this.cam.mapped(on);
  }

  /** In the map: turn about the other of the vehicle and the Earth. Says which it now is, or null out of the map. */
  mapFocus(): { focus: MapFocus; next: MapFocus } | null {
    const focus = this.cam.refocus();
    if (focus) this.dirty = true;
    return focus;
  }

  /** The rigs there are to choose from as things stand, and the one C goes to next. */
  get cameras(): RigId[] {
    return this.cam.available();
  }

  get nextCamera(): RigId {
    return this.cam.next();
  }

  private rigChanged(id: RigId): void {
    // (only the rigs that go with something can go with a stage that has left: any other is about the vehicle or the place)
    if (this.show.followed !== null && id !== 'chase' && id !== 'locked' && id !== 'pad') this.show.unfollow();
    this.framing.following = this.framing.watched = null;
    this.onView(null);
    // on board, what would be in front of the eyes is not drawn (the seat's `hide`)
    const at = this.seats.seatHolder;
    this.seats.showSeatHidden(at, this.defs[at]?.seats?.[this.seats.seatAt]?.hide, id !== 'onboard');
    this.cabin?.board(id === 'onboard');
    // leaving the vehicle, the shadows go back to the section: fitted to it where the clock has it now (it may just have
    // been put back on its pad, and not yet been moved there by a frame)
    if (id === 'orbit' || id === 'free' || (id === 'onboard' && this.exhibit)) {
      this.show.lift();
      this.shadows.fitShadows();
    }
    this.renderer.shadowMap.needsUpdate = true;
    this.dirty = true;
    this.onRig(id);
  }

  /** What the camera may ask of the scene (camera/index.ts: Scene). */
  private world(): Scene {
    // What there is to stay above: the land, and the paving laid over it (`paved`: the models' zero at a pad laid at grade)
    const UNDER = (x: number, z: number) => Math.max(this.paved, this.setting.groundAt?.(x, z) ?? this.grade);
    const clearance = (p: THREE.Vector3): number => {
      // Wherever the site's ground is drawn (out to its horizon) there is ground to stay above; beyond it, the globe's
      // sea (the site's level is not the sea's 100 km off); with neither, nothing.
      if (!this.setting.floor) return Infinity;
      if (Math.hypot(p.x, p.z) <= (this.setting.horizon ?? this.setting.reach ?? Infinity)) return p.y - UNDER(p.x, p.z);
      const globe = this.setting.globe;
      // (and over the sea where a flight came down, its waves as drawn: swell.ts; and over the Moon's ground once it is drawn)
      const over = globe ? globe.altitude(p) - globe.swellHeight(p) : Infinity;
      const moon = this.setting.moon;
      return moon?.drawn ? Math.min(over, moon.altitude(p)) : over;
    };
    return {
      // Up is the plumb line where the subject is: the site's +Y on the site, leaning with the Earth's curve beyond it
      // (by the arc flown: 4.8 degrees at the landing), so the horizon downrange is level. It leans in over the second
      // span of the site's ground beyond its edge, too little at a time to be seen.
      upAt: (p, out) => {
        const globe = this.setting.globe;
        const edge = this.setting.horizon ?? Infinity;
        const lean = globe ? THREE.MathUtils.smoothstep(Math.hypot(p.x, p.z), edge, 2 * edge) : 0;
        const earth =
          lean > 0
            ? globe!
                .up(p, out)
                .lerp(UP, 1 - lean)
                .normalize()
            : out.copy(UP);
        // near the Moon, its vertical: turned evenly from the Earth's to it across its sphere (flightmoon.ts `toward`)
        const moon = this.setting.moon;
        const toward = moon ? moon.toward(p) : 0;
        if (toward <= 0) return earth;
        const turn = this.upTurn.setFromUnitVectors(earth, moon!.up(p, this.upMoon));
        return out.applyQuaternion(this.upNone.identity().slerp(turn, toward)).normalize();
      },
      clearance,
      // on the ground there is a site to go over; anywhere else, only the models
      reach: () => ({ centre: this.bounds.center, radius: Math.max(this.bounds.radius, this.setting.reach ?? 0) }),
      far: () => Math.max(30, 4 * this.bounds.radius, this.setting.horizon ?? this.setting.reach ?? 0),
      maxPolar: () => this.setting.maxPolar,
      minPolar: () => this.setting.minPolar ?? 0,
      // (a map is of the globe the place stands on, and of a flight: nobody on foot has one)
      map: () => {
        if (!this.setting.globe || this.walk.active) return null;
        const of = this.mapOf?.() ?? null;
        const moon = this.setting.moon;
        // (and the Moon, where it is drawn, to turn about: camera/map.ts)
        return of && moon?.drawn ? { ...of, moon: { centre: moon.centre, radius: moon.radius } } : of;
      },
      craft: () => this.show.craft(),
      // (asked by the chase view as it is first framed, a few rays at most: the solids the near plane asks, less the vehicle)
      blocked: (from, to) => {
        const solids = this.walk.solids;
        const was = solids.without;
        solids.set(this.solidRoots());
        solids.without = this.flier?.group ?? null;
        const length = from.distanceTo(to);
        const half = length / 2 + 1;
        solids.gather(this.blockAt.lerpVectors(from, to, 0.5), half, half, half);
        const hit = solids.cast(from, this.blockWay.subVectors(to, from).divideScalar(Math.max(length, 1e-9)), length);
        solids.without = was;
        return hit !== null;
      },
      solidAt: (x, y) => {
        this.picker.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
        const { origin, direction } = this.picker.raycaster.ray;
        // a ray does not know about the cutaway: skip what has been cut away to reach what is inside
        const gone = (h: THREE.Intersection) =>
          this.cut && h.object.userData.shell && (skinless(h.object) || this.cutPlanes.every((c) => c.distanceToPoint(h.point) < 0));
        const roots = [...this.staged.map((s) => s.shown), ...(this.surroundings ? [this.surroundings] : [])];
        const hit = through(this.picker.raycaster, roots, this.picker.pickTree, !this.cut).find((h) => !gone(h));
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
      draw: (render: () => void) => this.pipe.origin.draw(render),
      sky: () => this.setting.backdrop,
      upAt: (p: THREE.Vector3, out: THREE.Vector3) => this.setting.globe?.up(p, out) ?? out.copy(UP),
      earth: () => this.setting.globe?.landMap ?? null,
      overlays: () => this.overlays,
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
   * This stage shows an exhibit (the gallery's): nothing flies, and its seats (`ModelDef.seats`) can be sat in where it
   * stands, one at a time (`sit`). At a site only the flown vehicle's first seat is sat in, and only in flight.
   */
  exhibit = false;

  /** The part (a top-level node named in the model's parts) a node of the model on show is in, or null. */
  partOf(name: string): string | null {
    for (let o = this.staged[this.current]?.full.getObjectByName(name) ?? null; o; o = o.parent) if (this.parts.has(o.name)) return o.name;
    return null;
  }

  /** Told when a couch is boarded on foot or left: what can be looked out of has changed. */
  onSeat: () => void = () => {};
  /** Told whenever what is leant to changes (by the act, by 0, by leaving the seat): the page's buttons follow it. */
  onLean: (at: number | null) => void = () => {};

  /** Where the canvas is on the page. */
  viewRect(): DOMRect {
    return this.canvas.getBoundingClientRect();
  }

  /** Which look the scene is drawn in (look.ts). */
  get look(): Look {
    return this.looks.current;
  }

  /**
   * Something drawn over the flight that is no part of it (the predicted path, path.ts): put in the scene and drawn over
   * the finished frame (overlay.ts `drawLast`), hidden by the scene's surfaces and by the cloud in front of it, never
   * cut by the cloud behind it. Given again, it has changed: the frame is drawn again.
   */
  overlay(object: THREE.Object3D): void {
    if (object.parent !== this.scene) {
      this.scene.add(object);
      drawLast(object);
    }
    if (!this.overlays.includes(object)) this.overlays.push(object);
    this.dirty = true;
  }
  /** What has been put over the flight (`overlay`): drawn unseen in `warm`, so its shaders are built with the rest. */
  private readonly overlays: THREE.Object3D[] = [];

  /**
   * Be told in every frame that is drawn, once the camera and the vehicle stand where this frame has them and before
   * anything is drawn: what is laid out for the view over the flight (the predicted path's line, which starts at the
   * vehicle) is laid out for this frame's, not the last one's. (Laid in a frame callback of its own, it ran after the
   * draw, and the line drawn started where the vehicle had been a frame before: 130 m behind a ship in orbit at life's
   * rate, 1,300 km at ten thousand times it.) Returns what lets it go.
   */
  beforeDraw(fn: () => void): () => void {
    this.laying.add(fn);
    return () => this.laying.delete(fn);
  }
  private readonly laying = new Set<() => void>();

  /** Take back something put over the flight (`overlay`): whoever put it there is gone (a flight's page left: app/session.ts). */
  unoverlay(object: THREE.Object3D): void {
    object.removeFromParent();
    undrawLast(object);
    const at = this.overlays.indexOf(object);
    if (at >= 0) this.overlays.splice(at, 1);
    this.dirty = true;
  }

  /** Whether `o` is in the scene (under it, however deep). */
  private shows(o: THREE.Object3D): boolean {
    for (let at: THREE.Object3D | null = o; at; at = at.parent) if (at === this.scene) return true;
    return false;
  }

  /**
   * The page that drove this stage has gone (to another flight: app/session.ts), and the next has yet to load its own:
   * a load or a warm on its way stops where it is, nothing is drawn until the next flight has been loaded and warmed,
   * and whoever was told of what happens on it is told no more (the next page tells it whom to tell). What is on it
   * stays, for `load` to keep what the next flight shares with it and let go of the rest.
   */
  quiet(): void {
    this.loads++;
    this.held = true;
    const self = this as unknown as Record<string, unknown>;
    for (const key of Object.keys(self)) if (/^on[A-Z]/.test(key) && typeof self[key] === 'function') self[key] = () => {};
  }

  /**
   * Let go of the flight on show, with none to follow on this stage (its page has gone, and the next has no use for
   * it): everything it fetched and the place round its pad leave the scene and the GPU. The setting stays, for a next
   * flight at the same place and day.
   */
  unload(): void {
    this.quiet();
    if (this.root) {
      this.scene.remove(this.root);
      for (const o of this.scenery?.all ?? (this.surroundings ? [this.surroundings] : [])) this.scene.remove(o);
      this.forget();
    }
    // (and what else it fetched for the flight: a figure for scale, a crew to walk as)
    this.releaseModels(null);
    this.pictures.clear();
    this.veils.length = 0;
    this.screensOf = { cut: false, veils: 0, list: [] };
    this.lamps.clear();
    this.root = null;
    this.surroundings = null;
    this.scenery = null;
    this.staged = [];
    this.arriving = [];
    this.defs = [];
    this.parts = new Map();
    this.dirty = true;
  }

  /** A warm stopped part way (another flight since): what it drew whatever its frustum is culled again. */
  private unculled(culled: THREE.Object3D[]): void {
    for (const o of culled) o.frustumCulled = true;
  }

  /** Loads asked for (and flights let go): a load or a warm that finds another asked for since stops where it is. */
  private loads = 0;

  /** The key of the setting on show (`Settings.keyOf`): another flight at another place or day is another setting. */
  private settingKey = 'orbit';

  /** Evict the same GLTF roots that dress registered, including levels still arriving and auxiliary models. */
  private releaseModels(next: FlightData | null): void {
    const keep = new Set<string>();
    if (next) {
      for (let level = 0; level <= LOD_ABOVE.length; level++) {
        for (const model of next.models) keep.add(modelKey(model, level));
        if (next.surroundings) keep.add(lodUrl(next.surroundings, level));
        if (next.site) for (const craft of next.recovery ?? []) keep.add(lodUrl(craft.url, level));
      }
    }
    for (const [key, fetched] of this.loaded) {
      if (keep.has(key)) continue;
      this.loaded.delete(key);
      this.shellMaterials.delete(key);
      void fetched.then(
        (object) => {
          this.looks.remove(object);
          this.glazing.remove(object);
          disposeTree(object);
        },
        () => {},
      );
    }
  }

  /**
   * Let go of the flight on show as another comes on (`load`): its models and what they wore on the GPU (a model the
   * next flight also has is kept), the place round its pad if the next has another, and every piece's state of it (the
   * cabin, a walk, what is worked by hand, a seat, what was followed and framed). The renderer, the camera, the passes
   * and the shadow maps stay: a stage is made once and shows flight after flight (app/session.ts).
   */
  private forget(): void {
    if (this.walk.active) this.onFoot.exitWalk();
    if (this.cam.rig !== 'orbit') this.cam.set('orbit', true);
    this.cabin?.dispose();
    this.cabin = null;
    this.pictures.clear(); // (the next flight's models share among themselves)
    for (const r of this.recovered.splice(0)) {
      this.scene.remove(r.group);
      r.staged.group.removeFromParent(); // the GLTFs belong to the cache, only the lines belong to Recovery
      this.looks.remove(r.group);
      r.dispose();
    }
    this.hands.reset();
    this.onFoot.reset();
    this.seats.reset();
    this.framing.following = this.framing.watched = null;
    this.picker.treesOwed.clear();
    for (const { node, parent } of this.away.splice(0)) parent.add(node);
    this.stood = null;
    // (what stood beside the model goes with it)
    for (const node of [...this.beside.children]) this.beside.parent?.add(node);
    this.beside.removeFromParent();
    this.besideStood = null;
  }

  /** Bring the view back to what the camera is about; with a flight in the air and the view elsewhere, to the vehicle, wherever it has got to. */
  refind(): void {
    if (this.show.followed !== null) return void this.show.followShed(null);
    this.cam.refind();
    this.dirty = true;
  }

  get cameraMode(): RigId {
    return this.cam.rig;
  }

  /** Direction on the screen to an offscreen vehicle, as seen from either walking camera. */
  walkVehicleDirection(): string {
    const model = this.flier ?? this.staged[this.defs.findIndex((m) => m.id === 'vehicle')];
    if (!model?.group.visible) return '';
    const target = new THREE.Vector3();
    if (!this.show.vessel(target)) model.box.getCenter(target);
    const screen = target.clone().project(this.camera);
    if (Math.abs(screen.x) <= 1 && Math.abs(screen.y) <= 1 && screen.z >= -1 && screen.z <= 1) return '';
    const view = this.camera.worldToLocal(target);
    if (view.z >= 0 && Math.abs(view.x) < view.z) return 'Vehicle behind';
    if (Math.abs(screen.y) > Math.abs(screen.x) && view.z < 0) return view.y > 0 ? '↑ Vehicle above' : '↓ Vehicle below';
    return view.x < 0 ? '← Vehicle left' : 'Vehicle right →';
  }

  /** The flown vehicle is in the air and the camera is not with it: the page offers the way back to it. */
  get vehicleAway(): boolean {
    return this.lifted.flying && !this.walk.active && (this.cam.rig === 'orbit' || this.cam.rig === 'free');
  }

  /** Draw everything as it would look (`real`) or as a cel-shaded drawing with ink lines (`cel`). */
  setLook(look: Look): void {
    this.looks.set(look);
    // (a level of detail giving way to another goes on doing so, in the materials of this look: lod.ts)
    for (const s of this.staged) s.relook();
    for (const s of this.sceneries) s.relook();
    this.pipe.ink.enabled = look === 'cel';
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
    this.pipe.clouds.cel = cel;
    this.fill.intensity = this.setting.fill[2] * (cel ? CEL_FILL : 1);
    this.setting.simplify?.(cel);
    this.renderer.toneMapping = cel ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping;
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
    this.framing.refollow(); // keep looking at what was asked for, until the user takes the camera themselves
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
    // what moves on the clock on a model whose slider is not the clock (a vehicle's periscope door), in step with the rest
    for (const staged of this.staged)
      if (staged?.clock(this.shownT)) {
        this.dirty = true;
        this.shadowsOwed = true;
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
    if (following) this.framing.refollow(); // keep looking at what was asked for, as it moves
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
    if (following) this.framing.refollow(); // keep looking at what was asked for, as it moves
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
    this.pipe.outline.selectedObjects = [...new Set([hovered, selected])].flatMap((n) => {
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

  /**
   * Be ready to be looked at. The scene can be drawn as soon as the models are in, but the
   * first frames of it are not smooth: the coarser levels of detail and the place round the pad
   * are still arriving, and every material's shader is built the first time it is drawn, which
   * holds the page for a moment each time. This waits for what is arriving (up to `patience`
   * milliseconds), builds every shader without holding the page, and lets a few frames go by,
   * so that whoever lifts the curtain afterwards sees motion that is already steady.
   */
  async warm(patience = 9000, onStep?: (step: WarmStep, fraction: number) => void): Promise<void> {
    const token = this.loads;
    // (made a little at a time while the rest arrives; a setting with no air has no clouds to make)
    const clouds = this.setting.fog ? this.pipe.clouds.warm() : Promise.resolve();
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
    if (token !== this.loads) return; // (another flight since: app/session.ts)
    onStep?.('place', 1);
    onStep?.('clouds', 0);
    const frames = async (n: number) => {
      for (let i = 0; i < n; i++) {
        this.dirty = true;
        await new Promise((done) => requestAnimationFrame(done));
      }
    };
    await clouds;
    if (token !== this.loads) return; // (another flight since: app/session.ts)
    onStep?.('clouds', 1);
    onStep?.('shaders', 0);
    // (at the size it will be drawn: the canvas is sized as a frame begins, and none may have begun yet)
    this.pipe.fit();
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
    for (const s of this.sceneries) s.everyLevel(true);
    this.show.rehearse();
    const covered = this.uncover(true);
    for (const h of this.show.plumes) h.plume.mesh.visible = true; // the engines' fires too: they are first seen at liftoff
    for (const m of this.show.jetMeshes()) m.visible = true; // (and the jets that are not fires: the same march)
    if (this.show.trail) this.show.trail.mesh.visible = true; // (and its trail: drawn empty, its shader is built)
    // (and what is drawn over the flight, the predicted path: each of its meshes, empty, so its shaders are built. It
    // wears no picture and its buffers are a few hundred kilobytes, so on either tier, tier.ts, this sends nothing to speak of)
    const overlaid = new Map<THREE.Object3D, boolean>();
    for (const o of this.overlays)
      o.traverse((each) => {
        overlaid.set(each, each.visible);
        each.visible = true;
      });
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
    // thing's was sent when it was first drawn, in front of whoever had just zoomed in, and held that frame. A large
    // one a frame, so none of this holds the page. Not the cabin's (its panels, 155 MiB with their mip levels, for an
    // inside nobody may go to): those are the cabin's to send, a picture a frame as the eye comes toward it
    // (cabin.ts, `send`). And on the lighter tier (tier.ts) none: there a picture is sent when what wears it is first drawn.
    if (tier().warmPictures) {
      const sent = new Set<THREE.Texture>();
      const pictures: THREE.Texture[] = [];
      this.scene.traverse((o) => {
        const worn = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        for (const m of worn ? (Array.isArray(worn) ? worn : [worn]) : [])
          for (const v of Object.values(m)) {
            const t = v as THREE.Texture | null;
            if (!t?.isTexture || sent.has(t) || this.cabin?.pictures.has(t) || !(t.image as { width?: number } | null)?.width) continue;
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
    // (on the lighter tier, tier.ts, every level is built but only what is in view is drawn, so only that is sent to
    // the GPU: the rest of three levels of everything is sent when it is first drawn)
    const drawAll = (on: boolean) => {
      for (const o of culled) o.frustumCulled = !on;
      if (!on) for (const s of this.staged) s.everyLevel(false);
      if (!on) for (const s of this.sceneries) s.everyLevel(false);
    };
    for (const [i, [night, fading]] of passes.entries()) {
      // (nothing drawn while every level is out to be built: drawn, all of it would be sent)
      if (!tier().warmLevels) {
        this.held = true;
        drawAll(true);
      }
      for (const s of this.staged) s.everyLevel(true, fading);
      for (const s of this.sceneries) s.everyLevel(true, fading);
      this.lamps.set(night, 1);
      this.warming = true; // (the floods lit for their shaders' sake: no eye is to adapt to them)
      // Built for the buffer the scene is drawn into: a shader for the canvas (tone-mapped, in the screen's colours) is
      // another shader, and built for that every one of them was built again, one at a time, as the first frame was drawn.
      const target = this.renderer.getRenderTarget();
      if (!this.plain) this.renderer.setRenderTarget(this.pipe.frameTarget);
      const built = [this.renderer.compileAsync(this.scene, this.camera)];
      // (and the sky's, which is a scene of its own drawn into the same buffer)
      if (!this.plain) built.push(this.renderer.compileAsync(this.setting.backdrop.scene, this.setting.backdrop.camera));
      this.renderer.setRenderTarget(target);
      // (and what is drawn last, over the finished frame, for the canvas it is drawn into: overlay.ts)
      built.push(compileLast(this.renderer, this.scene, this.camera));
      await Promise.all(built).catch(() => {}); // (a browser without parallel compile builds them as they are drawn)
      if (token !== this.loads) return void this.unculled(culled); // (another flight since: app/session.ts)
      if (!tier().warmLevels) drawAll(false);
      this.held = false; // (the first frame is drawn now, with its shaders ready)
      this.pipe.quality.rest(performance.now(), 8000); // (and the first seconds are slow for reasons that pass: maps arriving, the other look's shaders)
      this.renderer.shadowMap.needsUpdate = true;
      await frames(2);
      if (token !== this.loads) return void this.unculled(culled); // (another flight since: app/session.ts)
      onStep?.('shaders', (i + 1) / passes.length);
    }
    onStep?.('settle', 0);
    for (const o of culled) o.frustumCulled = true;
    for (const s of this.staged) s.everyLevel(false);
    for (const s of this.sceneries) s.everyLevel(false);
    for (const h of this.show.plumes) h.plume.mesh.visible = false;
    for (const m of this.show.jetMeshes()) m.visible = false;
    if (this.show.trail) this.show.trail.mesh.visible = false;
    this.uncover(false, covered);
    for (const [o, visible] of overlaid) o.visible = visible;
    if (globe && shown) [globe.mesh.visible, globe.air.visible] = shown;
    this.relight(true);
    this.warming = false;
    this.eyeCut = true;
    await frames(3);
    if (token !== this.loads) return void this.unculled(culled); // (another flight since: app/session.ts)
    onStep?.('settle', 1);
    // (an allocation the GPU refused while all that was made: said, with the way back in the lighter tier; lost.ts)
    if (refused(this.renderer, [this.pipe.frameTarget])) sayRefused();
    if (!this.plain && tier().prebuildLook) this.prebuild(this.looks.current === 'cel' ? 'real' : 'cel');
  }

  /**
   * Show (`on`) what the flight keeps out of sight until its moment, for shaders to be built for it and its buffers sent:
   * the attitude jets and the parachutes `rehearse` made, and the inside of the cabin, drawn only from near it. Three
   * builds only for what is shown: hidden, the jets' shader was built and the inside's 93 meshes sent in the frame the
   * capsule left its booster (40 ms), and the parachutes' three shaders as the drogue came out (25 to 120 ms). Returns
   * what it showed, to be given back (`on` false) and hidden again.
   */
  private uncover(on: boolean, shown: THREE.Object3D[] = []): THREE.Object3D[] {
    this.cabin?.everything(on);
    if (!on) {
      for (const o of shown) o.visible = false;
      return [];
    }
    const hidden = [...(this.show.jets?.group.children ?? []), ...(this.show.chutes ?? []).map((c) => c.group)].filter((o) => !o.visible);
    for (const o of hidden) o.visible = true;
    return hidden;
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
    this.renderer.setRenderTarget(this.pipe.frameTarget);
    const covered = this.uncover(true); // (what is out of sight has the other look's shaders too)
    void this.renderer.compileAsync(this.scene, this.camera).catch(() => {});
    this.uncover(false, covered);
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
      const point = this.picker.paneCentre(mesh, first);
      const normal = new THREE.Vector3().fromBufferAttribute(facing, 0).transformDirection(mesh.matrixWorld);
      // outward: away from the middle of the model it is a window of
      if (normal.dot(point.clone().sub(middle).setY(0)) < 0) normal.negate();
      out.push({ point, normal });
    });
    return out;
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
    if (this.orbitalBox) return this.orbitalBox;
    if (!this.root) return null;
    const box = this.modelsBox(this.lifted.flying ? (this.flier?.group ?? null) : null);
    if (this.surroundings) box.expandByObject(this.surroundings);
    // (an exhibit taken apart, as far apart as its slider goes: the far map is all there is where the fine one is spent on a part)
    if (this.exhibit && (this.apart[this.current] ?? 0) > 0) {
      const section = this.sectionBox();
      if (section) box.union(section);
    }
    return box;
  }

  /** The section's model as it stands and fully taken apart, together: what its shadow map is sized for. */
  private sectionBox(): THREE.Box3 | null {
    if (this.orbitalBox) return this.orbitalBox;
    const own = this.staged[this.current];
    if (!this.root || !own) return null;
    const box = new THREE.Box3().setFromObject(own.group);
    own.explode(1);
    box.expandByObject(own.group);
    own.explode(this.apart[this.current] ?? 0);
    return box;
  }

  /**
   * Tell the setting the instant and where the eye is: the sky, the haze and the stars for the eye's height (`at`,
   * which says when that is worth showing), what is made or chosen round the eye (the globe's mesh and the air's ball,
   * the land's cells, which form each plant is drawn in and how far through its fade), and which rooms' lamps are
   * lit. Asked once the rig or the walk has put the camera where this frame draws it from, never as the frame begins:
   * from there it was the last frame's eye, a frame's travel behind (in flight 30 m; in a fast zoom tens of metres),
   * and the plants' fading bands, the haze, the lit rooms and the air's ball were drawn for an eye no longer there.
   * Before `fitDepth`, which asks whether the globe is shown.
   */
  private attend(): void {
    // (the place first: the sky's plumb line at the eye is set there, and `at` bakes the reflections with it)
    if (this.setting.attend?.(this.camera.position, this.frozen)) this.dirty = true;
    if (this.clock) {
      // (over the globe, the height is above the sea under the eye, which downrange is far below the site's level)
      const height = this.setting.globe?.altitude(this.camera.position) ?? this.camera.position.y - this.grade;
      const change = this.setting.at?.(this.clock.jdUT, height, this.frozen);
      if (change?.jumped) this.eyeCut = true;
      if (change) this.relight(change.shadows);
    }
    if (this.lamps.near(this.camera.position, false, this.frozen)) this.dirty = true; // the rooms nearest the eye are the ones lit
  }

  /** How far indoors the eye is, 0 in the open to 1 in a room: eased, never stepped (`adapt`). */
  private indoors = 0;
  /** What the eye is adapted to beyond the sky's light: the lamps in front of it (eye.ts). */
  readonly eye = new Eye();
  /** And above the air, what it sees of the stars for what is lit in its view (eye.ts `StarEye`). */
  readonly starEye = new StarEye();
  /** The lit things in view above the air, made once and moved each frame: the sunlit Earth, the Sun, the vehicle. */
  private readonly glare: Glaring[] = [0, 1, 2, 3].map(() => ({ toward: new THREE.Vector3(), radius: 0, lux: 0 }));
  /** The eye is to be settled at once on the next frame: the clock jumped, another place, on or off foot (a cut, not a walk). */
  private eyeCut = true;
  private eyeWalking = false;
  /** `warm` is building the floods' shaders with them lit: what the eye would measure then is not the scene's. */
  private warming = false;
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
    const factor = this.eye.factor;
    const outside = factor === 1 ? s.exposure : s.exposure * factor;
    const exposure = outside + (INDOORS_EXPOSURE - outside) * this.indoors;
    this.renderer.toneMappingExposure = exposure;
    this.lamps.exposed(exposure);
    this.cabin?.exposed(exposure);
    s.eye?.(factor);
    const ground = s.sunIntensity * Math.max(s.sunDir.y, 0) + SKY_ON_GROUND * s.fill[2];
    this.pipe.night(exposure, this.rods() * (1 - this.indoors), ground / Math.PI, 1 - this.indoors);
  }

  /**
   * How much of the eye is the rods' (0 by day), by the luminance of the night's own land and sky (the setting's,
   * daysky.ts): what is lit far brighter than that (a lamp's patch) is seen in colour all the same (Pipeline.night).
   */
  private rods(): number {
    const s = this.setting;
    if (s.adapted === undefined) return 0;
    const at = Math.log10(Math.max(s.adapted, 1e-9));
    return RODS_MOST * (1 - THREE.MathUtils.smoothstep(at, Math.log10(MESOPIC[0]), Math.log10(MESOPIC[1])));
  }

  /**
   * The eye on what is in front of it (eye.ts): how much the lamps lit in view add to the sky's light, and a frame's
   * worth of adapting to that, in the world's time (the clock's rate, at least the frame's). A cut is taken at once: a
   * frozen stage, the clock put somewhere, another place, going on foot or coming off it.
   */
  private see(dt: number): void {
    const s = this.setting;
    if (this.walk.active !== this.eyeWalking) {
      this.eyeWalking = this.walk.active;
      this.eyeCut = true;
    }
    const lamps = this.lamps.shining();
    const ground = s.sunIntensity * Math.max(s.sunDir.y, 0) + SKY_ON_GROUND * s.fill[2];
    // (the camera as this frame draws it: its world matrix is otherwise brought up to date only just before the draw,
    // and a view measured a frame late is a frozen frame that is not the same frame: test:frozen, "step")
    if (lamps.length) this.camera.updateMatrixWorld();
    const over = lamps.length && !this.warming ? this.eye.measure(this.camera, this.grade, ground, lamps) : 1;
    const rate = this.clock?.running ? Math.max(1, Math.abs(this.clock.rate)) : 1;
    const atOnce = this.frozen || this.eyeCut || this.held || this.warming;
    if (this.eye.step(over, dt * rate, atOnce)) {
      this.expose();
      this.dirty = true;
    }
    this.seeStars(dt * rate, atOnce);
    this.eyeCut = false;
  }

  /**
   * Above the air the sky is black at noon, and what hides the stars is what else is lit in view (eye.ts `StarEye`):
   * the sunlit Earth (a sphere of the Earth's Bond albedo, 0.294, lit as a Lambert surface: its light at the eye by
   * its phase from here), the Sun itself, and the vehicle (`vehicleSphere`, half of it lit and giving back `VEHICLE_ALBEDO`
   * of the light: estimated; not while the eye is inside it). Each counts by how far out of the air the eye is
   * (`Setting.space`), so from the ground nothing does, and the eye follows the veil over its own times.
   */
  /**
   * The vehicle as a sphere where it is now: the one in flight (measured in its own frame when it changes, and every
   * two seconds as it sheds what it sheds), else the models' bounds (the orbital stage's craft).
   */
  private vehicleSphere(): THREE.Sphere {
    const flier = this.lifted.flying ? (this.flier?.group ?? null) : null;
    if (!flier) return this.bounds;
    const sized = this.sized;
    const now = performance.now();
    flier.updateWorldMatrix(true, false);
    if (sized.of !== flier || now - sized.at > 2000) {
      sized.of = flier;
      sized.at = now;
      new THREE.Box3().setFromObject(flier).getBoundingSphere(sized.local);
      sized.local.applyMatrix4(sized.inverse.copy(flier.matrixWorld).invert());
    }
    return sized.world.copy(sized.local).applyMatrix4(flier.matrixWorld);
  }
  private readonly sized = {
    of: null as THREE.Object3D | null,
    at: 0,
    local: new THREE.Sphere(),
    world: new THREE.Sphere(),
    inverse: new THREE.Matrix4(),
  };

  private seeStars(dt: number, atOnce: boolean): void {
    const s = this.setting;
    if (!s.stars || !s.globe) return;
    const out = s.space ?? 0;
    let veil = 0;
    if (out > 0) {
      const eye = this.camera.position;
      const sunlit = s.sunlit ?? 0;
      const [earth, sun, vehicle, moon] = this.glare as [Glaring, Glaring, Glaring, Glaring];
      // the Earth: under the eye's plumb line, at its height plus the Earth's radius
      s.globe.up(eye, earth.toward).negate();
      const d = EARTH_SPHERE + Math.max(s.globe.altitude(eye), 0);
      const r = Math.min(1, EARTH_SPHERE / d);
      earth.radius = Math.asin(r);
      const phase = Math.acos(THREE.MathUtils.clamp(-s.globe.sun.dot(earth.toward), -1, 1)); // the Sun and the eye, seen from the Earth
      earth.lux = (2 / 3) * EARTH_ALBEDO * SUN_LUX * r * r * ((Math.sin(phase) + (Math.PI - phase) * Math.cos(phase)) / Math.PI);
      sun.toward.copy(s.globe.sun);
      sun.radius = 0.00465;
      sun.lux = SUN_LUX * sunlit;
      const near = this.vehicleSphere();
      vehicle.toward.copy(near.center).sub(eye);
      const away = vehicle.toward.length();
      vehicle.lux = 0;
      if (away > 1.05 * near.radius && near.radius > 0) {
        vehicle.toward.divideScalar(away);
        const across = near.radius / away;
        vehicle.radius = Math.asin(across);
        vehicle.lux = 0.5 * VEHICLE_ALBEDO * SUN_LUX * sunlit * across * across;
      }
      // the sunlit Moon, as the Earth is, with its normal albedo (flightmoon.ts `shine`)
      moon.lux = 0;
      if (s.moon?.drawn) {
        const m = s.moon.shine(eye);
        moon.toward.copy(m.toward);
        moon.radius = m.radius;
        const r = Math.sin(m.radius);
        moon.lux = (2 / 3) * MOON_ALBEDO * SUN_LUX * r * r * ((Math.sin(m.phase) + (Math.PI - m.phase) * Math.cos(m.phase)) / Math.PI);
      }
      this.camera.updateMatrixWorld();
      veil = out * veiled(this.camera, this.glare);
    }
    if (this.starEye.step(veil, dt, atOnce)) {
      s.stars(this.starEye.limit);
      this.dirty = true;
    }
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
    for (const r of this.recovered) if (r.group.visible && r.staged.choose(eye, scale, this.fullDetail, fade)) changed = true;
    for (const s of this.sceneries) if (s.choose(eye, scale, fade)) changed = true;
    if (!changed) return;
    this.dirty = true;
    this.renderer.shadowMap.needsUpdate = true;
    this.highlight(this.hovered);
  }

  /**
   * What is solid to the walker: every model but the one walked as, the place round the pad, the setting's scenery,
   * and whatever the flown vehicle has let go that is still drawn (a spent stage lying on the pad is walked round and
   * driven round like anything else: its nodes are out of their model while it is loose, FlightShow `debris`; a figure
   * that came down on a parachute is a person, and people are not solid). Asked every frame, and the same list is
   * given until one of them is another object (a level of detail changed, another figure is walked as, the setting
   * changed, a piece left or was taken back).
   */
  private solidRoots(): THREE.Object3D[] {
    const kept = this.solidsKept;
    const scenery = this.setting.scenery;
    const drops = this.show.ascent?.drops.length ?? 0;
    let loose = 0;
    let same = kept.walked === this.onFoot.walked && kept.surroundings === this.surroundings && kept.scenery === scenery;
    same &&= kept.count === scenery.length && kept.shown.length === this.staged.length;
    for (let i = 0; same && i < kept.shown.length; i++) same = kept.shown[i] === this.staged[i]!.shown;
    for (const d of this.debris) if (d.drop < drops && d.holder.visible) same &&= kept.loose[loose++] === d.holder;
    same &&= loose === kept.loose.length;
    if (!same) {
      kept.walked = this.onFoot.walked;
      kept.surroundings = this.surroundings;
      kept.scenery = scenery;
      kept.count = scenery.length;
      kept.shown = this.staged.map((s) => s.shown);
      kept.loose = this.debris.filter((d) => d.drop < drops && d.holder.visible).map((d) => d.holder);
      kept.roots = [
        ...kept.shown.filter((_, i) => i !== this.onFoot.walked), // every model but the one you are
        ...(this.surroundings ? [this.surroundings] : []),
        ...scenery,
        ...kept.loose,
      ];
    }
    return kept.roots;
  }

  /** Read an escape against the pad's authored pose at abort, independent of the displayed clock. */
  withEscapePad<T>(
    t: number,
    held: readonly (readonly [string, number])[] | undefined,
    query: (pad: THREE.Object3D | undefined, holds: readonly (readonly [string, number])[]) => T,
  ): T {
    const i = this.defs.findIndex((def) => def.id === 'pad');
    const staged = this.staged[i];
    if (!staged) return query(undefined, []);
    const sequence = this.defs[i]?.sequence;
    return staged.atSlider(sequence ? sliderAt(sequence, t) : (this.apart[i] ?? 0), held, (holds) => query(staged.full, holds));
  }

  padSweeper<T extends { node: string }>(pad: THREE.Object3D | undefined, obstacles: readonly T[]) {
    const structures = obstacles.flatMap((obstacle) => {
      const root = pad?.getObjectByName(obstacle.node);
      if (!root) return [];
      root.updateWorldMatrix(true, true);
      return [{ root, obstacle, bounds: new THREE.Box3().setFromObject(root) }];
    });
    const solids = new Solids();
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const middle = new THREE.Vector3();
    const region = new THREE.Box3();
    return (from: Vec3, to: Vec3, radius: number) => {
      a.fromArray(from);
      b.fromArray(to);
      region.makeEmpty().expandByPoint(a).expandByPoint(b).expandByScalar(radius);
      const span = a.distanceTo(b) / 2 + radius;
      middle.lerpVectors(a, b, 0.5);
      let first: { fraction: number; obstacle: T; normal: Vec3 } | null = null;
      for (const { root, obstacle, bounds } of structures) {
        if (!bounds.intersectsBox(region)) continue;
        solids.set([root]);
        solids.gather(middle, span, span);
        const hit = solids.sweepSphere(a, b, radius);
        if (hit && (!first || hit.fraction < first.fraction)) first = { fraction: hit.fraction, obstacle, normal: hit.normal.toArray() };
      }
      return first;
    };
  }

  private readonly solidsKept = {
    walked: -2,
    surroundings: null as THREE.Object3D | null,
    scenery: null as THREE.Object3D[] | null,
    count: 0,
    shown: [] as THREE.Object3D[],
    loose: [] as THREE.Object3D[],
    roots: [] as THREE.Object3D[],
  };

  private setHover({ node, model, pane, place, thing }: Picked): void {
    if (model !== this.hoveredModel) {
      this.hoveredModel = model;
      this.onHoverModel(model);
    }
    if ((place?.name ?? null) !== this.hoveredPlace)
      this.onHoverPlace((this.hoveredPlace = place?.name ?? null), place?.title, place?.about);
    if (Boolean(pane) !== this.overPane) {
      // (from a seat, which window it is: one to lean to and look out of)
      const from = pane && this.cam.rig === 'onboard' ? this.seats.lookouts()[this.seats.lookoutAt(pane.point)]?.name : undefined;
      this.onHoverWindow((this.overPane = Boolean(pane)), from);
    }
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
    this.pipe.resize();
    this.pipe.quality.rest(performance.now(), 3000); // (every target is made again: slow for a moment, and not the machine's pace)
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.framing.refollow(); // a framing made for the old shape no longer fits
  }

  /** For the diagnostics readout: how fast the loop is turning over and what a drawn frame costs (stage/pipeline.ts). */
  stats(): { fps: number; drawn: number; ms: number; triangles: number; calls: number; levels: number[]; scale: number } {
    return this.pipe.stats(this.staged.map((s) => s.shownLevel));
  }

  /** The near and far planes fitted to what is there, every frame (stage/pipeline.ts: `Pipeline.fitDepth`). */
  private fitDepth(dt: number): void {
    this.pipe.fitDepth(dt);
  }

  private frame(): void {
    const began = performance.now();
    if (this.setting.arrived?.()) {
      // (buildings where there were none: both of the Sun's maps and the sky's are of the place without them; asking
      // here is heard by the far map and, through it, by the fine one kept on foot: shadows.ts, shadowcache.ts)
      this.renderer.shadowMap.needsUpdate = true;
      this.dirty = true;
    }
    const drawn = this.pipe.drawn;
    this.step();
    this.pipe.counted(began);
    this.pipe.paced(began, this.pipe.drawn !== drawn);
    // (after the frame's own work is counted: a frame that drew nothing has time to spare, one that took under half its time has a little)
    if (this.picker.treesOwed.size) {
      if (this.pipe.drawn === drawn) this.picker.growTrees(6, true);
      else if (performance.now() - began < 8) this.picker.growTrees(1.5, false);
    }
  }

  private step(): void {
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.1);
    // the simulation's clock (the setting follows it once the eye is placed: `attend`)
    this.clock?.advance(dt);
    this.follow(dt);
    this.show.lift();
    const cabinDt = this.frozen ? 0 : dt;
    if (this.clock) this.cabin?.step(cabinDt, this.clock.t, this.clock.jdUT);
    else if (this.exhibit) this.cabin?.step(cabinDt, 0, Number.NaN); // (no clock: it stands as built)
    this.settle(dt);
    this.onFoot.runWorks(dt);
    this.onFoot.runDriven();
    this.hands.run(dt);
    if (this.walk.active) {
      this.onFoot.stepWalk(dt);
      this.attend();
    } else {
      if (!this.cam.ownsLens && this.walk.lens(dt)) this.dirty = true; // after a walk the lens closes again over half a second
      // the camera: the rig in charge moves, and says where the view is from (the near plane is fitted after, fitDepth); on a
      // frozen stage at once, as if motion were off (`Cameras.calm`), so a still scene is drawn the same twice: the aim
      // eased under a panel that had changed size went on turning the view for seconds after it was frozen (path test, "pad")
      const calm = this.cam.calm;
      if (this.frozen && !calm) this.cam.calm = true;
      this.cam.update(dt);
      if (this.frozen && !calm) this.cam.calm = false;
      this.camStepped += dt;
      this.shadows.steerFocus(dt);
      this.onFoot.emerge();
      if (this.indoors > 0) this.adapt(dt, false); // (off foot again: the eye goes back to the day)
      this.framing.lookWatched();
      this.shadows.shadeCraft();
      this.fitDetail(dt);
      if (this.pointerDirty && !this.down) {
        this.pointerDirty = false;
        const under = this.inert || this.veiled ? NOTHING : this.picker.pick();
        // (from the seat a part is not something to choose: only what is in reach is, and a window to look out of)
        // (and nothing is named over a view being looked through: what it is has been said in the note line)
        this.setHover(this.cam.rig === 'onboard' ? (this.seats.lookingOut ? NOTHING : { ...under, node: null, model: null }) : under);
      }
      this.attend();
      this.fitDepth(dt);
    }
    this.see(dt);
    const { backdrop } = this.setting;
    if (!this.frozen) {
      backdrop.update(dt);
      this.setting.tick?.(dt);
    }
    // Frozen, the sky is drawn and only its stars are held back: points a pixel across, which a test's nudge of the
    // camera moves from pixel to pixel. (The whole sky was once held back, when it was little more than its stars: the
    // clouds' sheets, laid over it, were then drawn over nothing, a black band over every frozen frame's horizon.)
    const hold = this.frozen ? backdrop.scene : null;
    if (this.starsHeld !== hold) {
      const stars = (sky: THREE.Scene, on: boolean) =>
        sky.traverse((o) => {
          if ((o as THREE.Points).isPoints) o.visible = on;
        });
      if (this.starsHeld) stars(this.starsHeld, true);
      if (hold) stars(hold, false);
      this.starsHeld = hold;
    }
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
    // The craft and the fine Sun target have reached this frame's positions. A map asked for
    // by either belongs to this draw. Requests raised during the draw remain owed for the next.
    if (this.shadowsOwed) {
      this.renderer.shadowMap.needsUpdate = true;
      this.shadowsOwed = false;
    }
    if (!(this.dirty || moved || this.renderer.shadowMap.needsUpdate || this.sinceDrawn >= ambient)) return;
    if (this.held) return;
    // A frozen frame owes nothing to an earlier one: its shadow maps are drawn with it. (Kept, a map is of the scene
    // as it stood when something last asked: plants in the forms the eye was then near enough for, for one.)
    if (this.frozen) this.renderer.shadowMap.needsUpdate = true;
    this.lastView.copy(this.camera.matrixWorld);
    this.lastProjection.copy(this.camera.projectionMatrix);
    for (const lay of this.laying) lay();
    this.dirty = false;
    this.pipe.begin();
    this.setting.view?.(this.camera);
    this.pipe.sizeStars(backdrop.scene);
    const unshake = this.shaker?.(this.camera, backdrop.camera);
    const walking = this.walk.active ? (this.staged[this.onFoot.walked]?.group ?? null) : null;
    this.shadows.before(walking, this.frozen);
    // (back from a lean by another way than asking: 0, another camera, out of the seat)
    this.seats.unleant();
    this.cabin?.see(); // (what its periscope shows, drawn first: the screen is part of this frame)
    uShadowFade.value.x = 1 - this.shadows.fineShare; // (shared by every stage's materials: each sets it for its own draw)
    this.pipe.draw(this.sinceDrawn, this.frozen);
    this.shadows.far.after();
    unshake?.();
    this.sinceDrawn = 0;
  }

  /**
   * Get down and walk as one of the flight's figures (`model`: a model with a `walker`; left out,
   * the first there is). The camera becomes its eyes, where it stands, looking the way it faces,
   * and the keys and the mouse become the walker's (walk.ts). The figure itself is put away
   * while you are it. Eye height and stature are the model's own: the middle of the node its
   * `walker.eyes` names above its soles, and the top of its bounds; they are as good as the model.
   */
  enterWalk(model?: string, from?: THREE.Vector3, facing?: number): boolean {
    const at = this.defs.findIndex((m) => m.walker && (!model || m.id === model));
    if (at < 0 || !this.root || this.walk.active) return false;
    if (from) {
      // put the figure there first: the walk starts wherever the figure stands (and facing the way asked, about the vertical)
      const figure = this.staged[at]!;
      figure.group.position.copy(from);
      if (facing !== undefined) figure.group.rotation.y = facing;
      figure.group.updateMatrixWorld(true);
      figure.measure();
    }
    this.onWalk(true, this.defs[at]!.id);
    this.framing.following = null;
    this.cam.keys.clear();
    this.down = null;
    this.setHover(NOTHING);
    this.highlight(null, null);
    this.onFoot.embody(at);
    return true;
  }

  /**
   * Out of the lander's hatch (`ModelDef.lander.out`) as it stands on the stage: the point in the world whoever goes out stands
   * at, and the way out over the ground it faces (the lander's +x, as `enterWalk`'s `facing`), or null with no lander.
   */
  landerOut(): { at: THREE.Vector3; facing: number } | null {
    const i = this.defs.findIndex((m) => m.lander?.out);
    const lander = this.staged[i];
    if (!lander) return null;
    lander.group.updateMatrixWorld(true);
    return {
      at: lander.group.localToWorld(new THREE.Vector3(...this.defs[i]!.lander!.out!)),
      facing: lander.group.rotation.y + Math.PI / 2,
    };
  }

  /** A right click's "Look at this" on a place: the view goes to the spot and turns about it. */
  lookAt(point: THREE.Vector3): void {
    this.framing.visit(new THREE.Box3().setFromCenterAndSize(point, new THREE.Vector3(8, 4, 8)));
  }

  /**
   * And on the flown vehicle in flight: the chase view, aimed at a spot on the vehicle (`local`, in the vehicle's own
   * frame, as `onSpot` gave it) and carried with it. The spot is taken where the vehicle is now, not where it was
   * when it was pointed at: at 300 m/s that is a hundred metres astern by the time the menu is answered.
   */
  lookAtCraft(local: THREE.Vector3): void {
    const flier = this.lifted.flying ? this.flier : null;
    if (!flier) return;
    flier.group.updateWorldMatrix(true, false);
    const point = flier.group.localToWorld(local.clone());
    this.framing.frameBox(new THREE.Box3().setFromCenterAndSize(point, new THREE.Vector3(2, 2, 2)), false, undefined, true);
  }

  /** Run a model along its slider to `to` (0 to 1), at the pace it always moves: what an Action of kind `slider` does. */
  operate(model: string, to: number): void {
    const at = this.defs.findIndex((m) => m.id === model);
    const sequence = this.defs[at]?.sequence;
    // on the clock, running a model along its slider is going to that moment: the hardware follows, and so does the Sun
    if (sequence && this.clock) this.clock.seek(timeAt(sequence, THREE.MathUtils.clamp(to, 0, 1)));
    else if (at >= 0) this.apartGoal[at] = this.apartOwn[at] = THREE.MathUtils.clamp(to, 0, 1);
  }

  /**
   * The land round the site as the simulator comes down on it (sim/sitecontact.ts `Ground`): its height in the pad's
   * frame wherever the setting has relief, out to the furthest thing placed there. Null for a setting with no land.
   */
  get land(): { at(x: number, z: number): number | null; reach: number } | null {
    const at = this.setting.groundAt;
    return at ? { at: (x, z) => at(x, z), reach: this.setting.horizon ?? this.setting.reach ?? 0 } : null;
  }

  /** The open ground under a point: the land's height where the setting has relief (Setting.groundAt), else its level floor; null where there is none. */
  private groundAt(x: number, z: number): number | null {
    return this.setting.groundAt?.(x, z) ?? this.setting.floor?.position.y ?? null;
  }

  /** The made surface the land is painted as at (x, z) in the world (Setting.paintedAt: a road, an apron), or null where it is the land's own. */
  paintedAt(x: number, z: number): string | null {
    return this.setting.paintedAt?.(x, z) ?? null;
  }

  // --- a stage that is a room and not a place: what the gallery asks of its own (src/ui/gallery.ts) ---

  /**
   * Every model is drawn in full, whatever its size on screen, and its coarser levels are not
   * fetched: a thing shown to be studied is never the coarser one. Set before `load`.
   */
  fullDetail = false;

  private asleep = false;
  /** Its WebGL context was taken away (lost.ts): the loop is stopped for good. */
  private lost = false;
  /**
   * Stop (another stage has the page) or start again. Asleep it draws nothing, hears no key and
   * advances no clock: everything on it is, when it wakes, exactly as it was left.
   */
  sleep(on: boolean): void {
    if (on === this.asleep) return;
    this.asleep = on;
    this.cam.keys.clear();
    if (this.lost) return; // (its context has gone: nothing is drawn on it again, lost.ts)
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
    this.shadows.fitShadows();
  }

  private orbitalBox: THREE.Box3 | null = null;

  /** Fly independent objects drawn on the orbital stage. A cached local sphere encloses each
   * craft as it turns, so the depth range tracks their actual separation without measuring every mesh again. */
  orbitalBodies(
    bodies: THREE.Group[],
    details: THREE.Object3D[] = [],
  ): (sun: THREE.Vector3, angularRadius: number, illumination: number) => void {
    const local = bodies.map((body) => new THREE.Box3().setFromObject(body, true).getBoundingSphere(new THREE.Sphere()));
    const sphere = new THREE.Sphere();
    const box = (this.orbitalBox = new THREE.Box3());
    this.setting.scenery.push(...bodies);
    for (const body of [...bodies, ...details]) {
      this.scene.add(body);
      this.looks.add(body);
    }
    return (sun, angularRadius, illumination) => {
      this.bounds.makeEmpty();
      bodies.forEach((body, i) => {
        if (!body.visible) return;
        body.updateWorldMatrix(true, false);
        this.bounds.union(sphere.copy(local[i]!).applyMatrix4(body.matrixWorld));
      });
      this.bounds.getBoundingBox(box);
      this.setting.sunDir.copy(sun);
      if (this.setting.backdrop instanceof OrbitBackdrop) this.setting.backdrop.sunlight(sun, angularRadius);
      this.shadows.sun.intensity = 4 * illumination;
      this.shadows.fitShadows();
      this.shadows.far.refit();
      this.shadowsOwed = true;
      this.dirty = true;
    };
  }

  /** Fetch a model that is no part of the flight and dress it as the flight's are (the gallery's figure for scale). Whoever asks puts it somewhere. */
  model(url: string): Promise<THREE.Object3D> {
    return this.fetch(url).then((object) => {
      rest(object);
      return object;
    });
  }

  /** A separate, assembled model for an interactive exhibit. The caller owns its resources and pose. */
  async exhibitModel(url: string, signal: AbortSignal): Promise<THREE.Group> {
    const response = await fetch(import.meta.env.BASE_URL + url, { signal });
    if (!response.ok) throw new Error(`Could not load ${url} (${response.status})`);
    const { scene } = await this.loader.parseAsync(await response.arrayBuffer(), '');
    try {
      signal.throwIfAborted();
      await fitPictures(scene);
      signal.throwIfAborted();
      fitIndices(scene);
      scene.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = true;
      });
      return scene;
    } catch (error) {
      disposeTree(scene);
      throw error;
    }
  }

  /** What the section's model has had taken off the stage (`only`), and where each piece goes back. */
  private readonly away: { node: THREE.Object3D; parent: THREE.Object3D }[] = [];
  /** The section's model stands on the floor, whatever is left of it and however far apart it is: how far it was lifted to stand there put together. */
  private stood: { lift: number; low: number } | null = null;
  /**
   * What of the section's model stands beside the rest on a floor of its own (`ModelDef.target`: what the spacecraft
   * flew to meet), held together under the model and apart from the rest of it: the rest is lowered to the floor when
   * part of it is taken away, and lifted as it comes apart downward, and this is not. `stood`: as `stood`, of it.
   */
  private readonly beside = new THREE.Group();
  private besideStood: { lift: number; low: number } | null = null;

  /**
   * Leave on the stage only these parts of the section's model (their nodes; null: all of it
   * again), standing on the floor at y = 0: a spacecraft without its booster stands where the
   * booster stood, not in the air above it. The rest is taken out of the model, not hidden, so
   * that everything measured, framed, picked and shadowed is what is there. For a stage drawn in
   * full (`fullDetail`): the coarser levels know nothing of it. Returns how far up the model's own
   * origin now is, put together: what a height measured in the model's frame is to be raised by.
   */
  /** How low a part's node of the model on show reaches, metres in the world (null: it has none, or nothing drawn under it). */
  lowest(node: string): number | null {
    const found = this.staged[this.current]?.full.getObjectByName(node);
    if (!found) return null;
    found.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(found, true);
    // (in the model as built: what stands beside it is measured where the model has it, not where it has been stood)
    const stoodAt = found.parent === this.beside ? this.beside.getWorldScale(new THREE.Vector3()).y * this.beside.position.y : 0;
    return box.isEmpty() ? null : box.min.y - stoodAt;
  }

  /** Temporarily expose an assembly at its installed height in the full-detail Gallery. */
  inspect(nodes: readonly string[]): () => void {
    const hidden = [...this.parts].filter(([name, part]) => part.visible && !nodes.includes(name)).map(([, part]) => part);
    for (const part of hidden) part.visible = false;
    this.dirty = true;
    this.shadows.fitShadows();
    return () => {
      for (const part of hidden) part.visible = true;
      this.dirty = true;
      this.shadows.fitShadows();
    };
  }

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
    // what the spacecraft flew to meet is held apart from the rest (once: it stays so)
    this.beside.name = 'Beside';
    this.beside.position.set(0, 0, 0);
    if (this.beside.parent !== own.full) {
      // (another model's: its parts go back under it)
      for (const node of [...this.beside.children]) this.beside.parent?.add(node);
      own.full.add(this.beside);
    }
    for (const name of targetNodes(def)) {
      const node = own.full.getObjectByName(name);
      if (node?.parent === own.full) this.beside.add(node);
    }
    // put together and measured to the vertex (a box round boxes stands it a hair above the floor)
    const apart = this.apart[this.current] ?? 0;
    own.explode(0);
    own.group.position.y = 0;
    own.group.updateMatrixWorld(true);
    const exact = this.restBox(own, true);
    this.stood = { lift: exact.isEmpty() ? 0 : -exact.min.y, low: this.restBox(own).min.y };
    const exactBeside = new THREE.Box3().setFromObject(this.beside, true);
    this.besideStood = exactBeside.isEmpty() ? null : { lift: -exactBeside.min.y, low: new THREE.Box3().setFromObject(this.beside).min.y };
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
    this.beside.position.y = 0;
    own.group.updateMatrixWorld(true);
    const rest = this.restBox(own);
    own.group.position.y = rest.isEmpty() ? 0 : this.stood.lift + Math.max(0, this.stood.low - rest.min.y);
    this.standBeside(own);
    own.group.updateMatrixWorld(true);
    own.measure();
    this.lamps.place();
  }

  /** The box round the section's model without what stands beside it (`precise`: to the vertex). */
  private restBox(own: { full: THREE.Object3D }, precise = false): THREE.Box3 {
    const box = new THREE.Box3();
    for (const child of own.full.children) if (child !== this.beside) box.expandByObject(child, precise);
    return box;
  }

  /**
   * Stand what is beside the model on the floor, wherever the model itself has been put (`own.group` lowered, or
   * lifted as it comes apart): its own lowest part on the floor, as it stands now. Its holder is at nought while it
   * is measured.
   */
  private standBeside(own: { full: THREE.Object3D; group: THREE.Object3D }): void {
    this.beside.position.y = 0;
    if (!this.besideStood || !this.beside.children.length) return;
    const at = own.group.position.y;
    own.group.position.y = 0;
    own.group.updateMatrixWorld(true);
    const low = new THREE.Box3().setFromObject(this.beside).min.y;
    own.group.position.y = at;
    const lift = this.besideStood.lift + Math.max(0, this.besideStood.low - low);
    // (in the model's own measure: a model is drawn at a metre to the metre, but its holder's is the scale that counts)
    this.beside.position.y = (lift - at) / own.full.getWorldScale(new THREE.Vector3()).y;
  }

  /**
   * Each part of the section's model in its place in the whole, put together: how high it stands (metres from the
   * model's own origin) and how far out from the axis it reaches. For a diagram of the whole; ask before `only`.
   */
  outlines(): { node: string; low: number; high: number; reach: number }[] {
    const own = this.staged[this.current];
    if (!own) return [];
    const apart = this.apart[this.current] ?? 0;
    const beside = this.beside.position.y;
    own.explode(0);
    this.beside.position.y = 0; // (each part where the model has it: what stands beside too)
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
    this.beside.position.y = beside;
    own.group.updateMatrixWorld(true);
    return out;
  }

  /** The box round the section's model as it would stand put together, without taking it apart or putting it together to find out. */
  extent(): THREE.Box3 {
    const own = this.staged[this.current];
    const box = new THREE.Box3();
    if (!own) return box;
    const apart = this.apart[this.current] ?? 0;
    const y = own.group.position.y;
    const beside = this.beside.position.y;
    own.explode(0);
    if (this.stood) own.group.position.y = this.stood.lift;
    if (this.stood) this.standBeside(own);
    own.group.updateMatrixWorld(true);
    box.setFromObject(own.full);
    own.explode(apart);
    own.group.position.y = y;
    this.beside.position.y = beside;
    own.group.updateMatrixWorld(true);
    return box;
  }

  /**
   * Where on the page one of the section's parts is: the middle of the box round it, and how far
   * to either side of that the box reaches, in pixels. Null: no such part, or it is behind the camera.
   */
  frameOf(node: string): { x: number; y: number; r: number } | null {
    const object = this.parts.get(node);
    if (!object?.parent || !object.visible) return null;
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

  /** For tests: nothing moves unless the camera is moved, and the sky's stars (single pixels) are hidden. */
  frozen = false;
  /** The sky whose stars are held back for a frozen stage (`frozen`), if any. */
  private starsHeld: THREE.Scene | null = null;

  /** For tests: the seconds the camera's rig has been stepped through in all (tools/camera-test.mjs sets a camera's movement against the time it was moved for, not against the clock's). */
  camStepped = 0;

  /** For tests: a named view, turned `azimuthDeg` about the vertical and nudged `nudgeDeg` more. */
  shot(viewId: string, azimuthDeg: number, nudgeDeg = 0): void {
    this.framing.shot(viewId, azimuthDeg, nudgeDeg);
  }

  /** For tests and screenshots: stop the drift and put the camera somewhere exact. */
  /**
   * For tests and screenshots: the orbiting camera `height` metres over the Moon's sphere at a selenographic latitude and
   * longitude (degrees), looking on `azimuthDeg` (from north through east) and `elevationDeg` above its level, at a pivot
   * `distance` metres off that way. The clock is the flight's: set it first (the Moon is where it was then). False where
   * this stage has no Moon.
   */
  moonPose(latitude: number, longitude: number, height: number, azimuthDeg: number, elevationDeg: number, distance = 2000): boolean {
    const moon = this.setting.moon;
    if (!moon || !this.clock) return false;
    // (the Moon put where it is at the clock's instant, so the pose is about the Moon as the frame draws it)
    moon.at(this.clock.jdUT, 1);
    const { at, east, north, up } = moon.over(latitude, longitude, height);
    const [az, el] = [THREE.MathUtils.degToRad(azimuthDeg), THREE.MathUtils.degToRad(elevationDeg)];
    const look = north
      .clone()
      .multiplyScalar(Math.cos(az) * Math.cos(el))
      .addScaledVector(east, Math.sin(az) * Math.cos(el))
      .addScaledVector(up, Math.sin(el));
    this.framing.following = this.framing.watched = null;
    this.cam.place(at.clone().addScaledVector(look, distance), at, true);
    this.dirty = true;
    return true;
  }

  pose(azimuthDeg: number, elevationDeg: number, distance: number, targetY = this.centreY, targetX = 0, targetZ = 0): void {
    this.framing.pose(azimuthDeg, elevationDeg, distance, targetY, targetX, targetZ);
  }
}

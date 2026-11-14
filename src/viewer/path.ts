import * as THREE from 'three';
import { prefs } from '../prefs.ts';
import type { Phase } from '../sim/fly.ts';
import { type Burn, type Prediction, type Predictor, predictor, programmeAxis, type Sequence } from '../sim/predict.ts';
import type { SitedFlight } from '../types';
import { EARTH_ROTATION_RATE } from '../world/bodies.ts';
import {
  ecefToSite,
  ecefToSiteDirection,
  geodeticToEcef,
  inertialToEcef,
  length,
  type Site,
  siteFrame,
  type Vec3,
} from '../world/frames.ts';
import { absolute, uOrigin } from './origin.ts';
import { atInstants, strip } from './pathline.ts';
import {
  type Box,
  type ChipIn,
  type ChipOut,
  type Clear,
  crossFade,
  layWords,
  type MarkIn,
  type MarkOut,
  unseen,
  type Words,
} from './pathmarks.ts';

/**
 * The predicted path, drawn: where the vehicle goes from here if nothing more is done (sim/predict.ts),
 * as a line ahead of it with its apogee, the events on the way and where it comes down marked; and,
 * fainter, the line it has flown.
 *
 * The model for how it behaves is lunar-lift's (../lunar-lift, js/predictor.js): the prediction is
 * worked out a few times a second and kept as data, and drawn every frame from where the vehicle is.
 *
 * - **Clear of the vehicle.** Nothing of the line within a gap of the vehicle's middle (a little more than half its
 *   length, or a fifth of the view's half height at the vehicle, whichever is more), then it comes in from nothing
 *   over the next two gaps on lunar-lift's curve (pathline.ts: `fadeIn`), measured in the scene; and on the screen
 *   nothing within the vehicle's outline, taken as a capsule along its long axis as broad as it is, and a margin.
 *   The flown line keeps the same distance behind. From inside the vehicle (on board) the outline is off and the
 *   cabin's own walls hide the line: it is seen through the windows, and no marker is laid over the cabin.
 * - **Hidden by what is in front of it**: it is drawn after the solid scene, tested against its depth
 *   and writing none, a hundredth of the way nearer than it is (so the sea it comes down to does not
 *   hide its end); beyond the far plane it is at the far plane, behind everything; and the Earth's
 *   bulk hides it where the globe is not drawn (a sphere through the site's sea, tested along the ray).
 * - **A width on the screen, not in the world**: a ribbon pushed out across its own direction in the
 *   vertex shader, a core of `CORE` CSS pixels each side with a pixel's soft edge, a thin dark casing
 *   (what reads against bright sky, cloud and sea) and a glow to `HALF` (what reads against black),
 *   thinning to two thirds of that far off; in the cel look a flat core with an ink edge.
 * - **Never in the cabin**: from inside the vehicle nothing within its radius of the eye is drawn, so the line is
 *   seen through the windows even while the vehicle drawn catches up with the flight after the clock has run fast.
 * - **Never at the eye**: nothing nearer than just past the near plane is drawn (it fades out before it), and a
 *   point nearer than half that is moved along the line to there, so no vertex is behind the eye, where a ribbon
 *   turns inside out across the screen.
 * - **Still when nothing changes, eased when it does**: predict.ts gives the path at instants of its
 *   own, so a prediction made again of the same flight gives the same points; a new one is eased in
 *   from where the last one had it over `EASE` seconds.
 * - **Drawn from the eye** (origin.ts): points are kept in doubles and given to the GPU as offsets from
 *   the prediction's first point, where the mesh stands.
 *
 * Frames. The prediction is in the simulator's frame, which does not turn. `surface` draws each point
 * where it will be over the ground at its own instant (the Earth turned to that instant, then the
 * site's frame, as viewer/ascent.ts places the vehicle): it meets the sea where the vehicle will.
 * `orbit` draws the path as it lies in the frame that does not turn: each point with the Earth turned
 * to the prediction's start, the mesh turned back about the Earth's axis as the clock goes on. Only a
 * path that goes round is drawn in `orbit` (the navball's O chooses); one that comes down is drawn
 * over the ground, where it comes down.
 *
 * The markers (pathmarks.ts lays them out) are glyphs on the line, each with a label and a figure,
 * from the prediction itself: its apogee, its events (predict.ts: what the sequencer will do, the
 * parachutes, the first 0.05 g and the greatest load) and where it ends. On the surface where it
 * comes down there is a ring. The few that matter now (the apogee ahead, the next event, where it ends)
 * have besides a chip at the edge of the clear part of the view, on the bearing to them, for when their
 * place is not in view (off the window, under a panel, behind the eye: pathmarks.ts `layChips`): it
 * fades in as the marker on the line fades out and the other way about, and fades out and in again
 * where its place leaps, never gliding over the page. From the seat only the chips (with the deck on
 * show: from the couch alone the page has none of it).
 *
 * The work is kept off the frame: a prediction is begun at most five times a second and worked out in
 * slices of `SLICE` milliseconds, one a frame. Each frame only uniforms change; the line's vertices are
 * written once a prediction.
 */

/** The most points of a prediction, and of the line flown. */
const MOST = 1024;
const FLOWN = 1024;
/** Milliseconds of prediction worked in one frame, and the least time between one prediction's end and the next's beginning. */
const SLICE = 1.5;
const EVERY = 200;
/** Half the line's core and half the ribbon with its glow, CSS pixels; the flown line's core. */
const CORE = 1.3;
const HALF = 5;
const FLOWN_CORE = 0.9;
/** Seconds a new prediction is eased in over; how old the one on show may be, while a newer one is wanted, before it is said to be stale. */
const EASE = 0.3;
const STALE = 1.5;
/** Points round the ring where it comes down, and its radius on the screen, CSS pixels. */
const RING = 48;
const RING_PX = 9;
/** Seconds a chip at the edge fades in or out over. */
const CHIP_FADE = 0.2;

const VERT = /* glsl */ `
  #include <common>
  attribute vec3 aFrom;       // where the prediction before had this instant: eased from (uMix)
  attribute vec3 aAlong;      // the path's direction here
  attribute float aSide;      // -1 or 1: which edge of the ribbon
  attribute float aT;         // seconds from the prediction's start
  uniform float uMix;
  uniform vec2 uView;         // the target's size, pixels
  uniform float uHalf;        // half the ribbon's width, pixels
  uniform float uNear;        // nothing nearer the eye than this is drawn, m
  uniform vec2 uThin;         // the ribbon thins to two thirds between these distances from the eye, m
  uniform float uRing;        // the ring's radius, m
  uniform vec3 uEarth;        // the Earth's centre in the scene's frame
  uniform float uRadius;      // and its radius at the site's sea
  varying float vSide, vT, vHide, vEye, vHalf;
  varying vec3 vLocal;
  void main() {
  #ifdef RING
    vec3 local = position * uRing;
  #else
    vec3 local = mix(aFrom, position, uMix);
  #endif
    vLocal = local;
    vT = aT;
    vSide = aSide;
    vec4 view = modelViewMatrix * vec4(local, 1.0);
    vec3 dir = mat3(modelViewMatrix) * aAlong;
    float dl = length(dir);
    dir = dl > 1e-9 ? dir / dl : vec3(0.0, 0.0, -1.0);
    // never at the eye: a point nearer than half uNear is moved along the line to there (and not drawn: the fragment fades
    // everything nearer than uNear), so no vertex is behind the eye, where its ribbon would turn inside out across the screen
    float least = 0.5 * uNear;
    if (view.z > -least && abs(dir.z) > 1e-3) view.xyz += dir * ((-least - view.z) / dir.z);
    view.z = min(view.z, -least);
    vEye = length(view.xyz);
    // which way the line runs on the screen here, from a point a little along it (kept in front of the eye)
    vec3 on = view.xyz + dir * (0.01 * vEye);
    on.z = min(on.z, 0.5 * view.z);
    vec4 here = projectionMatrix * view;
    vec4 there = projectionMatrix * vec4(on, 1.0);
    vec2 run = (there.xy / there.w - here.xy / here.w) * uView;
    float len = length(run);
    run = len > 1e-6 ? run / len : vec2(1.0, 0.0);
    vHalf = uHalf * mix(1.0, 0.67, smoothstep(uThin.x, uThin.y, vEye));
    // its depth a hundredth nearer than it is (the same place on the screen), and never past the far plane
    vec4 clip = projectionMatrix * vec4(view.xyz * 0.99, 1.0);
    clip.xy += vec2(-run.y, run.x) * aSide * vHalf / uView * 2.0 * clip.w;
    clip.z = min(clip.z, clip.w * 0.99999);
    gl_Position = clip;
    // behind the Earth: the ray from the eye to this point passes inside it (drawn from the eye, so the eye is uOrigin)
    vec3 from = (modelMatrix * vec4(local, 1.0)).xyz - cameraPosition;
    vec3 centre = uEarth - uOrigin - cameraPosition;
    float k = clamp(dot(centre, from) / max(dot(from, from), 1e-6), 0.0, 1.0);
    vHide = 1.0 - smoothstep(uRadius - 14000.0, uRadius - 2000.0, length(centre - from * k));
  }`;

const FRAG = /* glsl */ `
  uniform vec3 uColour, uInk;
  uniform float uNow, uCut, uEnd, uOpacity, uCel, uCore, uHalf, uNear, uGap, uRatio;
  uniform vec3 uShip;         // the vehicle's middle, in this mesh's own frame
  uniform vec4 uShipSeg;      // and on the target: its long axis from end to end, pixels
  uniform float uShipW;       // and how far round that the line keeps off, pixels (0: not at all)
  varying float vSide, vT, vHide, vEye, vHalf;
  varying vec3 vLocal;
  void main() {
  #if defined(FLOWN)
    if (vT > uNow) discard;
  #elif !defined(RING)
    if (vT < uNow) discard;
  #endif
    float px = abs(vSide) * vHalf;
    float c = uCore * vHalf / uHalf;
    vec3 colour = uColour;
    float a;
    if (uCel > 0.5) {
      // a flat line with an ink edge, as everything else in the cel look is drawn
      float edge = c + 1.3 * uRatio;
      a = 1.0 - smoothstep(edge - 0.6, edge + 0.6, px);
      colour = mix(uColour, uInk, smoothstep(c - 0.6, c + 0.6, px));
    } else {
      // the core over a thin dark casing over a soft glow: the casing is what reads against a bright sky, cloud or sea,
      // the glow against black (each laid over the one under it)
      float body = 1.0 - smoothstep(c - 0.6, c + 0.6, px);
      float rim = 0.65 * (1.0 - smoothstep(c + 1.2 * uRatio - 0.6, c + 1.2 * uRatio + 0.6, px));
      float g = max(0.0, 1.0 - px / vHalf);
      float glow = 0.3 * g * g;
      vec3 under = uInk * rim + uColour * glow * (1.0 - rim);
      float behind = rim + glow * (1.0 - rim);
      a = body + behind * (1.0 - body);
      colour = (uColour * body + under * (1.0 - body)) / max(a, 1e-4);
    }
  #ifndef RING
    // clear of the vehicle: along the line in the scene, coming in from nothing over three gaps; and on the screen, outside its ring
    float d = distance(vLocal, uShip);
    float x = clamp(0.631 * log2(max(d, 1e-3) / uGap), 0.0, 1.0);
    a *= x * x * (3.0 - 2.0 * x);
    if (uShipW > 0.0) {
      vec2 p = gl_FragCoord.xy - uShipSeg.xy;
      vec2 ab = uShipSeg.zw - uShipSeg.xy;
      float h = clamp(dot(p, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
      a *= smoothstep(uShipW, uShipW + 16.0 * uRatio, length(p - ab * h));
    }
  #endif
    a *= smoothstep(uNear, 1.6 * uNear, vEye);
  #if !defined(FLOWN) && !defined(RING)
    if (vT < uCut) {
      float dash = fract(vT / 3.0);                                     // under power: dashes, three seconds of flight each
      a *= mix(0.25, 1.0, smoothstep(0.0, 0.04, dash) * (1.0 - smoothstep(0.6, 0.64, dash)));
    }
    if (uEnd > uNow) a *= 1.0 - smoothstep(0.75, 1.0, (vT - uNow) / (uEnd - uNow)); // a closed orbit fades before it meets its start
  #endif
    a *= (1.0 - vHide) * uOpacity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(colour, a);
  }`;

/** What draws it in the scene and says where things are on it (viewer/stage.ts). */
export interface PathHost {
  /** Put something in the scene, over the flight; given again, it has changed and the frame is to be drawn again. */
  overlay(object: THREE.Object3D): void;
  /** The flown vehicle: its middle in the scene's frame into `out` and its long axis into `axis`, the radius of a ball round it, half its length and its breadth. Null if nothing flies. */
  vessel(out: THREE.Vector3, axis?: THREE.Vector3): { radius: number; half: number; across: number } | null;
  /** Where the canvas is on the page. */
  viewRect(): DOMRect;
  /** Which look the scene is drawn in. */
  readonly look: 'real' | 'cel';
  /** The view is from inside the vehicle, at its panel: nothing is labelled over the cabin. */
  aboard?(): boolean;
}

/** A sample of the flight as the flight deck shows it (sim/vehicle.ts: LiveSample), and the live state it came from, or null when looking back. */
export interface PathSample {
  t: number;
  r: Vec3;
  v: Vec3;
  mass: number;
  phase: Phase;
  centre?: Vec3;
  /** The parachute out, as the live state has it (filling, or torn). */
  chute?: { full: number; was: number; at: number; fills: number };
}
/** What of the live state (sim/vehicle.ts: VehicleState) the path reads: what is lit and done, and what has been let go. */
export interface PathLive {
  ignited: boolean;
  cutoff: boolean;
  abortAt?: number | null;
  retroAt?: number | null;
  shed?: { tower?: boolean; booster?: boolean; retropack?: boolean };
}
export interface PathSource {
  readonly active: boolean;
  /** The vehicle's programme and launch axes (sim/vehicle.ts: Vehicle), and how it is being flown. */
  readonly craft: { programme(t: number): Vec3; launch: { downrange: Vec3; left: Vec3 } } | null;
  readonly steering: { guidance: boolean; sequence?: boolean; trim: { pitch: number; yaw: number } };
  listen(fn: (sample: PathSample, live: PathLive | null) => void): void;
  /**
   * A flight with no `trajectory` (one into orbit: orbitdeck.ts) predicts its own path from a sample, with whatever its
   * deck has planned, and says what that plan is (`plan`: when it changes, the path is made again).
   */
  predict?(start: { t: number; r: Vec3; v: Vec3 }): Predictor | null;
  readonly plan?: string;
}

const clock = (seconds: number): string => {
  const s = Math.max(0, Math.round(seconds));
  return s >= 3600
    ? `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
    : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const km = (m: number): string => (m / 1000).toFixed(Math.abs(m) < 99_950 ? 1 : 0);

/** Each kind of marker: its name on the line and how much it matters (pathmarks.ts). The next event ahead counts for more. */
const KINDS = {
  apogee: ['Ap', 100],
  perigee: ['Pe', 92],
  down: ['Down', 95],
  impact: ['Impact', 95],
  cutoff: ['Cutoff', 62],
  tower: ['Tower jett', 40],
  separation: ['Separation', 46],
  retro: ['Retrofire', 58],
  retropack: ['Pack jett', 38],
  entry: ['0.05 g', 50],
  peak: ['Max', 54],
  drogue: ['Drogue', 48],
  main: ['Main', 52],
} as const satisfies Record<string, readonly [string, number]>;
type Kind = keyof typeof KINDS;
const NEXT = 25;

/** A marker of the prediction on show: where (in the mesh's unturned frame), when, and what it says beside its name. */
interface Mark {
  id: string;
  kind: Kind;
  at: THREE.Vector3;
  t: number;
  figure: string;
  /** Its glyph and label on the line; `ex, ey` where the glyph is on the page. */
  el: HTMLElement;
  ex: number;
  ey: number;
  /** Where the layout puts its label on the page (the box's top left), or null if it is not on the line. */
  label: { x: number; y: number } | null;
  /** Its chip at the edge of the view, for when it matters now and its place is not in view (pathmarks.ts: `layChips`). */
  chip: Chip;
  /** Its words as drawn now, on the line and as the chip, faded from one to the other in place (pathmarks.ts: `crossFade`). */
  words: Words;
  written: string;
}

/** A chip as the layout asks for it (in the draw): the box's top left on the page, or null for none, and its pointer. */
interface Chip {
  el: HTMLElement;
  want: { x: number; y: number } | null;
  px: number;
  py: number;
  angle: number;
  /** The pointer as it is drawn now. */
  at: { px: number; py: number; angle: number };
  written: string;
}

/** A prediction on show: its points in the scene's frame as they lie before the mesh is turned (doubles), and where it is eased from. */
interface Shown {
  key: string;
  result: Prediction;
  frame: 'surface' | 'orbit';
  t: Float64Array;
  at: Float64Array;
  from: Float64Array;
  n: number;
  anchor: THREE.Vector3;
  began: number;
}

const ink = new THREE.Color(0x0a0b0e);
const amber = new THREE.Color(0xffc46b);
const pale = new THREE.Color(0xe9e4d8);

export class FlightPath {
  readonly mesh: THREE.Mesh;
  private readonly flownMesh: THREE.Mesh;
  private readonly ringMesh: THREE.Mesh;
  private readonly geometry = new THREE.BufferGeometry();
  private readonly position = new Float32Array(MOST * 2 * 3);
  private readonly fromAttr = new Float32Array(MOST * 2 * 3);
  private readonly along = new Float32Array(MOST * 2 * 3);
  private readonly at = new Float32Array(MOST * 2);
  private readonly scratch = new Float32Array(MOST * 2 * 3);
  private readonly flownGeometry = new THREE.BufferGeometry();
  private readonly flownPosition = new Float32Array(FLOWN * 2 * 3);
  private readonly flownAlong = new Float32Array(FLOWN * 2 * 3);
  private readonly flownAt = new Float32Array(FLOWN * 2);
  /** The line flown: instants and places in the frame that does not turn, as heard from the flight deck. */
  private readonly flown = { t: new Float64Array(FLOWN), r: new Float64Array(FLOWN * 3), n: 0, built: -1, frame: '' as string };
  private readonly flownAnchor = new THREE.Vector3();
  private readonly uniforms: Record<string, THREE.IUniform>;
  private readonly materials: THREE.ShaderMaterial[] = [];
  private readonly flight: SitedFlight;
  private readonly site: Site;
  private readonly source: PathSource;
  private readonly host: PathHost;
  private readonly marksEl: HTMLElement;
  private readonly readout: HTMLElement;
  private readonly button: HTMLElement | null;
  /** The Earth's centre and axis in the site's frame. */
  private readonly centre: THREE.Vector3;
  private readonly axis: THREE.Vector3;

  private on = !prefs.get('pathOff');
  private guided = prefs.get('pathGuided');
  private frame: 'surface' | 'orbit' = 'surface';
  /** The sample on show and the live state's part in it. */
  private sample: PathSample | null = null;
  private live: PathLive | null = null;
  private job: { run: Predictor; key: string; began: number } | null = null;
  private shown: Shown | null = null;
  private wantedAt = 0;
  private doneAt = 0;
  private raf = 0;
  /** The turn of the mesh now (orbit), and the instant on show. */
  private readonly turn = new THREE.Quaternion();
  private now = 0;
  private marks: Mark[] = [];
  private laid = new Map<string, MarkOut>();
  private drawnAt = -1;
  /** Where the page's panels are, in the window: a label is not drawn over one. Given by the page, which knows its panels. */
  obstacles: () => DOMRect[] = () => [];
  private panels: Box[] = [];
  private rect = new DOMRect(0, 0, 1, 1);
  private panelsRead = 0;
  private charWidth = 0;
  /** What the last prediction cost, for whoever asks (`sr.path.cost`): milliseconds in all, the longest slice, and how many frames it was spread over. */
  cost = { ms: 0, slice: 0, frames: 0, steps: 0 };
  private spent = { slice: 0, frames: 0 };

  /**
   * `parent` takes the markers; `readout` is where the switch and the figures go (beside the navball); `button` is the
   * flight deck's own switch for the path, if it has one.
   */
  constructor(
    parent: HTMLElement,
    readout: HTMLElement,
    source: PathSource,
    flight: SitedFlight,
    host: PathHost,
    button?: HTMLElement | null,
  ) {
    this.flight = flight;
    this.source = source;
    this.host = host;
    this.site = siteFrame(flight.site);
    this.button = button ?? null;
    this.centre = new THREE.Vector3(...ecefToSite(this.site, [0, 0, 0]));
    this.axis = new THREE.Vector3(...ecefToSiteDirection(this.site, [0, 0, 1]));

    const sea = geodeticToEcef({ latitude: this.site.latitude, longitude: this.site.longitude, height: flight.site.seaLevel.value });
    this.uniforms = {
      uOrigin,
      uMix: { value: 1 },
      uView: { value: new THREE.Vector2(1, 1) },
      uHalf: { value: HALF },
      uNear: { value: 1 },
      uThin: { value: new THREE.Vector2(2e4, 6e5) },
      uRing: { value: 1 },
      uEarth: { value: this.centre },
      uRadius: { value: length(sea) },
      uColour: { value: new THREE.Color() },
      uInk: { value: new THREE.Color() },
      uNow: { value: 0 },
      uCut: { value: -1 },
      uEnd: { value: -1 },
      uOpacity: { value: 0.95 },
      uCel: { value: 0 },
      uCore: { value: CORE },
      uGap: { value: 10 },
      uRatio: { value: 1 },
      uShip: { value: new THREE.Vector3() },
      uShipSeg: { value: new THREE.Vector4() },
      uShipW: { value: 0 },
    };
    const strip = (geometry: THREE.BufferGeometry, count: number, position: Float32Array, along: Float32Array, at: Float32Array) => {
      geometry.setAttribute('position', new THREE.BufferAttribute(position, 3).setUsage(THREE.DynamicDrawUsage));
      geometry.setAttribute('aAlong', new THREE.BufferAttribute(along, 3).setUsage(THREE.DynamicDrawUsage));
      geometry.setAttribute('aT', new THREE.BufferAttribute(at, 1).setUsage(THREE.DynamicDrawUsage));
      const side = new Float32Array(count * 2);
      const index = new Uint16Array((count - 1) * 6);
      for (let i = 0; i < count; i++) {
        side[2 * i] = -1;
        side[2 * i + 1] = 1;
        if (i < count - 1) index.set([2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2], i * 6);
      }
      geometry.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
      geometry.setIndex(new THREE.BufferAttribute(index, 1));
      geometry.setDrawRange(0, 0);
    };
    strip(this.geometry, MOST, this.position, this.along, this.at);
    this.geometry.setAttribute('aFrom', new THREE.BufferAttribute(this.fromAttr, 3).setUsage(THREE.DynamicDrawUsage));
    strip(this.flownGeometry, FLOWN, this.flownPosition, this.flownAlong, this.flownAt);
    this.flownGeometry.setAttribute('aFrom', this.flownGeometry.getAttribute('position'));
    // the ring where it comes down: a loop in the level there, drawn the same way
    const ring = new THREE.BufferGeometry();
    {
      const position = new Float32Array((RING + 1) * 2 * 3);
      const along = new Float32Array((RING + 1) * 2 * 3);
      for (let i = 0; i <= RING; i++) {
        const a = (2 * Math.PI * i) / RING;
        for (const k of [2 * i, 2 * i + 1]) {
          position.set([Math.cos(a), 0, Math.sin(a)], k * 3);
          along.set([-Math.sin(a), 0, Math.cos(a)], k * 3);
        }
      }
      strip(ring, RING + 1, position, along, new Float32Array((RING + 1) * 2));
      ring.setAttribute('aFrom', ring.getAttribute('position'));
      ring.setDrawRange(0, RING * 6);
    }

    const make = (
      geometry: THREE.BufferGeometry,
      name: string,
      order: number,
      own: Record<string, THREE.IUniform>,
      defines: Record<string, string>,
    ) => {
      const material = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: { ...this.uniforms, ...own },
        defines,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
      });
      this.materials.push(material);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = name;
      mesh.frustumCulled = false;
      mesh.renderOrder = order; // after the fire, the trail of smoke and the air (globe.ts: 10), which would haze an instrument's line
      mesh.raycast = () => {}; // not a thing to pick
      mesh.visible = false;
      // the frame's own camera and the vehicle where this frame has it: the clear gap, the ring, the labels (`prepare`)
      mesh.onBeforeRender = (renderer, _scene, camera) => this.prepare(renderer, camera as THREE.PerspectiveCamera);
      return mesh;
    };
    this.flownMesh = make(
      this.flownGeometry,
      'Flown path',
      11,
      {
        uShip: { value: new THREE.Vector3() },
        uCore: { value: FLOWN_CORE },
        uColour: { value: new THREE.Color() },
        uOpacity: { value: 0.5 },
        uNow: { value: 0 },
      },
      { FLOWN: '' },
    );
    this.mesh = make(this.geometry, 'Predicted path', 12, {}, {});
    this.ringMesh = make(ring, 'Where the path comes down', 12, { uMix: { value: 1 } }, { RING: '' });
    this.mesh.add(this.flownMesh, this.ringMesh); // (one object for the stage: the others are placed in the scene's frame by `place`)
    this.flownMesh.matrixAutoUpdate = this.ringMesh.matrixAutoUpdate = true;

    this.marksEl = document.createElement('div');
    this.marksEl.className = 'path-marks';
    this.marksEl.hidden = true;
    parent.prepend(this.marksEl); // first, so under every panel

    this.readout = document.createElement('div');
    this.readout.className = 'path-read';
    this.readout.innerHTML = `
      <p class="path-head">
        <button data-path="show" class="switch" aria-pressed="true" title="The predicted path: where it goes from here if nothing more is done, its apogee, what happens on the way and where it comes down (J)"><kbd>J</kbd>Path</button>
        <span class="path-as" data-path-cell="as"></span>
      </p>
      <p class="path-kind" data-path-row="kind" role="group" aria-label="Which future the path shows while the engine burns" title="While the engine burns: the path if guidance flies on to the record's cutoff, or if the engine were cut now (K)">
        <kbd>K</kbd><button data-path="guided" aria-pressed="true">To cutoff</button><button data-path="coast" aria-pressed="false">Cut now</button>
      </p>
      <p data-path-row="apogee" title="The greatest height ahead, above the sea, and how long until it"><span>Ap</span><b data-path-cell="apogee">–</b></p>
      <p data-path-row="end"><span data-path-cell="endName">Down</span><b data-path-cell="end">–</b></p>`;
    readout.append(this.readout);
    this.readout.addEventListener('click', (e) => {
      const what = (e.target as HTMLElement).closest<HTMLElement>('[data-path]')?.dataset.path;
      if (what === 'show') this.show(!this.on);
      if (what === 'guided' || what === 'coast') this.setGuided(what === 'guided');
      (document.activeElement as HTMLElement | null)?.blur?.(); // or Space, the next event's key, would press it again
    });
    this.button?.addEventListener('click', () => this.show(!this.on));
    window.addEventListener('keydown', (e) => {
      const typing = (e.target as HTMLElement).matches?.('input:not([type=range]), textarea');
      if (!source.active || e.repeat || e.metaKey || e.ctrlKey || e.altKey || typing) return;
      const key = e.key.toLowerCase();
      if (key === 'j') this.show(!this.on); // (J: M is kept for the map)
      if (key === 'k' && this.choosing()) this.setGuided(!this.guided);
    });
    source.listen((sample, live) => {
      this.sample = sample;
      this.live = live;
      if (live) this.fly(sample);
      this.wake();
    });
    host.overlay(this.mesh); // in the scene from the first, unseen, so its shaders are built with the rest (Stage.warm)
    this.show(this.on, false);
    this.setGuided(this.guided, false);
  }

  /** Whether the path is drawn. */
  get showing(): boolean {
    return this.on;
  }

  /** The prediction on show, if there is one. */
  get prediction(): Prediction | null {
    return this.shown?.result ?? null;
  }

  /** The markers on the page now, for whoever asks (`sr.path.laidOut`): each with its label's box when it has one. */
  get laidOut(): MarkOut[] {
    return [...this.laid.values()];
  }

  /** Draw the path, or put it away. Remembered. */
  show(on: boolean, remember = true): void {
    this.on = on;
    if (remember) prefs.set('pathOff', !on);
    this.button?.setAttribute('aria-pressed', String(on));
    this.readout.querySelector('[data-path=show]')!.setAttribute('aria-pressed', String(on));
    this.readout.classList.toggle('off', !on);
    this.wake();
  }

  /** While the engine burns: the path if guidance flies on to the record's cutoff (true), or if the engine were cut now. Remembered. */
  setGuided(on: boolean, remember = true): void {
    this.guided = on;
    if (remember) prefs.set('pathGuided', on);
    this.wake();
  }

  /** The navball's frame: an orbit is drawn in it. A path that comes down is drawn over the ground whatever it is. */
  setFrame(frame: 'surface' | 'orbit'): void {
    if (frame === this.frame) return;
    this.frame = frame;
    if (this.shown) this.build(this.shown.result, this.shown.key, false);
    this.wake();
  }

  private wake(): void {
    if (!this.raf) this.raf = requestAnimationFrame(() => this.tick());
  }

  /** On the pad, waiting to be lit. (Not: gone from it unlit on the escape rocket, whose engine is shut down and has no programme left to fly.) */
  private waiting(): boolean {
    return this.live !== null && !this.live.ignited && !this.live.cutoff;
  }

  private burning(): boolean {
    return this.live?.ignited === true && !this.live.cutoff;
  }

  /** Whether there is a choice of future to make (K): the engine burns, under guidance, with a programme left to fly. */
  private choosing(): boolean {
    const tr = this.flight.trajectory;
    return this.burning() && this.source.steering.guidance && this.source.craft !== null && !!tr && (this.sample?.t ?? 0) < this.until();
  }

  /** When the engine stops if nobody stops it: the record's cutoff with the sequencer on; with it off, when it runs dry. */
  private until(): number {
    const e = this.flight.trajectory!.engine;
    return this.source.steering.sequence === false ? (e.depletion?.value ?? e.cutoff.value) : e.cutoff.value;
  }

  /** What the sequencer will do from the live state: nothing if it is off, or after an abort but the parachutes. */
  private sequence(): Sequence | undefined {
    const tr = this.flight.trajectory!;
    const live = this.live;
    if (!live) return undefined;
    const on = this.source.steering.sequence !== false;
    if (!on) return { chutes: false };
    if (live.abortAt !== null && live.abortAt !== undefined) return { chutes: true };
    const shed = live.shed ?? {};
    const offsets = tr.retro.fires.map((f) => f.value - tr.retro.fires[0]!.value);
    const retroAt = live.retroAt ?? tr.retro.fires[0]!.value;
    return {
      ...(tr.body?.tower && !shed.tower ? { tower: tr.body.tower.at.value } : {}),
      ...(!shed.booster ? { separation: tr.separation.at.value } : {}),
      ...(!shed.retropack ? { retro: offsets.map((o) => retroAt + o), retropack: tr.retropack.at.value } : {}),
      chutes: true,
    };
  }

  /** Which future is to be shown from the sample on show: null for none (off, not flying, down). */
  private want(): { key: string; burn: Burn | null; sequence: Sequence | undefined } | null {
    const s = this.sample;
    const tr = this.flight.trajectory;
    if (!s || !this.on || !this.source.active || s.phase === 'landed') return null;
    // (a flight into orbit: its deck predicts, from the sample on show and what it has planned)
    if (!tr) return this.source.predict && s.t > 0 ? { key: `${s.t}|${this.source.plan ?? ''}`, burn: null, sequence: undefined } : null;
    const craft = this.source.craft;
    const { trim, guidance } = this.source.steering;
    const until = this.until();
    const waiting = this.waiting();
    // on the pad there is only the plan to show; in the air, whichever was asked for while there is an engine to burn under guidance
    const plan = craft !== null && s.t < until && (waiting || (this.choosing() && this.guided));
    if (waiting && (!plan || !guidance)) return null;
    const sequence = this.sequence();
    return {
      key: `${s.t}|${plan ? `g${trim.pitch}|${trim.yaw}` : 'c'}|${JSON.stringify(sequence ?? null)}|${this.live ? 'live' : 'past'}`,
      burn: plan ? { axis: (t) => programmeAxis(craft, t, trim), until } : null,
      sequence,
    };
  }

  /** A frame: a slice of the prediction being worked out, a new one begun if it is time, and the line turned and eased. */
  private tick(): void {
    this.raf = 0;
    const want = this.want();
    const s = this.sample;
    if (!want || !s) {
      this.job = null;
      if (this.shown || this.mesh.visible) {
        this.shown = null;
        this.mesh.visible = this.flownMesh.visible = this.ringMesh.visible = false;
        this.host.overlay(this.mesh);
      }
      this.marksEl.hidden = true;
      this.say(null);
      return; // (asleep until the next sample, or a switch)
    }
    this.raf = requestAnimationFrame(() => this.tick());
    const tr = this.flight.trajectory;
    if (this.shown?.key !== want.key && !this.wantedAt) this.wantedAt = performance.now();
    if (!this.job && this.shown?.key !== want.key && performance.now() - this.doneAt >= EVERY) {
      const start = { t: s.t, r: s.centre ?? s.r, v: s.v, mass: s.mass, phase: s.phase, ...(s.chute ? { chute: s.chute } : {}) };
      const options = {
        points: MOST - 2,
        ...(want.burn ? { burn: want.burn } : {}),
        ...(want.sequence ? { sequence: want.sequence } : {}),
      };
      const run = tr ? predictor(tr, this.site, this.flight.site.seaLevel.value, start, options) : this.source.predict!(start);
      if (!run) return;
      this.job = {
        run,
        key: want.key,
        began: performance.now(),
      };
      this.spent = { slice: 0, frames: 0 };
    }
    if (this.job) {
      const began = performance.now();
      const done = this.job.run.run(SLICE);
      this.spent.slice = Math.max(this.spent.slice, performance.now() - began);
      this.spent.frames++;
      if (done) {
        const result = this.job.run.result;
        this.cost = { ms: result.cost, slice: this.spent.slice, frames: this.spent.frames, steps: result.steps };
        this.build(result, this.job.key, true);
        this.job = null;
        this.doneAt = performance.now();
        this.wantedAt = this.shown?.key === want.key ? 0 : this.wantedAt;
      }
    }
    if (this.shown?.key === want.key) this.wantedAt = 0;
    this.place(s.t);
  }

  /** A point of the prediction in the scene's frame: over the ground at its own instant, or (orbit) with the Earth as it was at `from`. */
  private point(r: Vec3, t: number, from: number, frame: 'surface' | 'orbit', into: THREE.Vector3): THREE.Vector3 {
    const turned = EARTH_ROTATION_RATE * (frame === 'orbit' ? from : t);
    return into.set(...ecefToSite(this.site, inertialToEcef(r, turned)));
  }

  /** Where the mesh is turned to at `now`: an orbit's path lies still among the stars while the scene's frame turns with the Earth. */
  private turnAt(shown: Shown, now: number, into: THREE.Quaternion): THREE.Quaternion {
    return into.setFromAxisAngle(this.axis, shown.frame === 'orbit' ? -EARTH_ROTATION_RATE * (now - shown.result.from) : 0);
  }

  /** Lay the line along a prediction, eased from where the one on show has it now (`ease`). */
  private build(result: Prediction, key: string, ease: boolean): void {
    const points = result.points;
    const n = result.outcome === 'none' ? 0 : Math.min(MOST, points.length);
    const frame = result.outcome === 'orbit' ? this.frame : 'surface';
    const t = new Float64Array(n);
    const at = new Float64Array(n * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      t[i] = points[i]!.t;
      this.point(points[i]!.r, points[i]!.t, result.from, frame, v).toArray(at, i * 3);
    }
    const anchor = new THREE.Vector3().fromArray(at, 0);
    const next: Shown = { key, result, frame, t, at, from: at.slice(), n, anchor, began: performance.now() };
    // eased from the line on show: each instant from where it is drawn now (in the scene, then into this one's unturned frame)
    const old = this.shown;
    if (ease && old && old.n > 1 && n > 0) {
      const mix = this.mixOf(old);
      const turn = this.turnAt(old, this.now, new THREE.Quaternion()).premultiply(
        this.turnAt(next, this.now, new THREE.Quaternion()).invert(),
      );
      const drawn = new Float64Array(old.n * 3);
      const p = new THREE.Vector3();
      for (let m = 0; m < old.n; m++) {
        for (let c = 0; c < 3; c++) p.setComponent(c, old.from[m * 3 + c]! + (old.at[m * 3 + c]! - old.from[m * 3 + c]!) * mix);
        p.sub(this.centre)
          .applyQuaternion(turn)
          .add(this.centre)
          .toArray(drawn, m * 3);
      }
      atInstants(old.t, drawn, old.n, t, n, next.from);
    }
    this.shown = next;
    // the vertices: offsets from the first point, which is where the mesh stands
    const origin = anchor.toArray() as [number, number, number];
    strip(at, n, origin, this.position, this.along);
    strip(next.from, n, origin, this.fromAttr, this.scratch);
    for (let i = 0; i < n; i++) this.at[2 * i] = this.at[2 * i + 1] = t[i]! - result.from;
    for (const name of ['position', 'aFrom', 'aAlong', 'aT']) {
      const attribute = this.geometry.getAttribute(name) as THREE.BufferAttribute;
      attribute.clearUpdateRanges();
      attribute.addUpdateRange(0, Math.max(1, n) * 2 * attribute.itemSize);
      attribute.needsUpdate = true;
    }
    this.geometry.setDrawRange(0, Math.max(0, n - 1) * 6);
    const u = this.uniforms;
    u.uCut!.value = result.cutoff === null ? -1 : result.cutoff - result.from;
    u.uEnd!.value = result.outcome === 'orbit' && n > 0 ? t[n - 1]! - result.from : -1;
    u.uMix!.value = ease && old ? 0 : 1;
    this.markOut(next);
    this.host.overlay(this.mesh);
  }

  /** How far the line on show has come from where it was eased from. */
  private mixOf(shown: Shown): number {
    const k = Math.min(1, Math.max(0, (performance.now() - shown.began) / (EASE * 1000)));
    return k * k * (3 - 2 * k);
  }

  /** The markers of a prediction: its apogee (or an orbit's apogee and perigee), its events, and its end. */
  private markOut(shown: Shown): void {
    const r = shown.result;
    const list: { kind: Kind; t: number; r: Vec3; figure: string }[] = [];
    if (r.apogee) list.push({ kind: 'apogee', t: r.apogee.t, r: r.apogee.r, figure: `${km(r.apogee.altitude)} km` });
    if (r.outcome === 'orbit' && r.perigee)
      list.push({ kind: 'perigee', t: r.perigee.t, r: r.perigee.r, figure: `${km(r.perigee.altitude)} km` });
    for (const e of r.events)
      list.push({ kind: e.kind, t: e.t, r: e.r, figure: e.kind === 'peak' && e.value ? `${e.value.toFixed(1)} g` : '' });
    if (r.impact) list.push({ kind: r.chute ? 'down' : 'impact', t: r.impact.t, r: r.impact.r, figure: `${km(r.impact.range)} km` });
    const kept = new Map(this.marks.map((m) => [m.id, m]));
    const marks: Mark[] = [];
    const seen = new Set<string>();
    for (const m of list) {
      let id: string = m.kind;
      for (let k = 2; seen.has(id); k++) id = `${m.kind}${k}`;
      seen.add(id);
      const was = kept.get(id);
      kept.delete(id);
      const el = was?.el ?? this.markEl(m.kind);
      marks.push({
        id,
        kind: m.kind,
        t: m.t,
        figure: m.figure,
        at: this.point(m.r, m.t, r.from, shown.frame, was?.at ?? new THREE.Vector3()),
        el,
        ex: was?.ex ?? 0,
        ey: was?.ey ?? 0,
        label: was?.label ?? null,
        chip: was?.chip ?? this.chipOf(m.kind),
        words: was?.words ?? unseen(),
        written: was?.written ?? '',
      });
    }
    for (const gone of kept.values()) {
      gone.el.remove();
      gone.chip.el.remove();
    }
    this.marks = marks;
    // where it comes down, on the surface: a ring in the level there
    const ring = this.ringMesh;
    if (r.impact && shown.frame === 'surface') {
      const at = this.point(r.impact.r, r.impact.t, r.from, 'surface', new THREE.Vector3());
      ring.position.copy(at).sub(shown.anchor);
      const up = at.clone().sub(this.centre).normalize();
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
      ring.userData.at = at;
    } else ring.userData.at = null;
  }

  private markEl(kind: Kind): HTMLElement {
    const el = document.createElement('div');
    el.className = `path-mark path-${kind}`;
    el.innerHTML = '<i></i><span></span>';
    this.marksEl.append(el);
    return el;
  }

  private chipOf(kind: Kind): Chip {
    const el = document.createElement('div');
    el.className = `path-chip path-${kind}`;
    el.innerHTML = '<i></i><span></span>';
    el.style.opacity = '0';
    this.marksEl.append(el);
    return { el, want: null, px: 0, py: 0, angle: 0, at: { px: 0, py: 0, angle: 0 }, written: '' };
  }

  /** The line flown: a point for every second or so heard from the flight deck, kept in the frame that does not turn. */
  private fly(s: PathSample): void {
    const f = this.flown;
    const last = f.n ? f.t[f.n - 1]! : Number.NEGATIVE_INFINITY;
    if (s.t < last - 1e-6) f.n = 0; // a new flight
    if (s.phase === 'landed' || s.t - last < 1) return;
    if (f.n === FLOWN) {
      // full: every other point let go
      for (let i = 1; i < FLOWN / 2; i++) {
        f.t[i] = f.t[2 * i]!;
        f.r.copyWithin(i * 3, 2 * i * 3, 2 * i * 3 + 3);
      }
      f.n = FLOWN / 2;
    }
    const r = s.centre ?? s.r;
    f.t[f.n] = s.t;
    f.r.set(r, f.n * 3);
    f.n++;
  }

  /** Lay the flown line's vertices (when a point has been added, or the frame changed): offsets from its newest point, so it is exact at the vehicle. */
  private buildFlown(frame: 'surface' | 'orbit', from: number): void {
    const f = this.flown;
    const key = `${frame}|${frame === 'orbit' ? from : 0}`;
    if (f.built === f.n && f.frame === key) return;
    f.built = f.n;
    f.frame = key;
    const n = f.n;
    const p = new THREE.Vector3();
    const all = new Float64Array(n * 3);
    for (let i = 0; i < n; i++) this.point([f.r[i * 3]!, f.r[i * 3 + 1]!, f.r[i * 3 + 2]!], f.t[i]!, from, frame, p).toArray(all, i * 3);
    if (n) this.flownAnchor.fromArray(all, (n - 1) * 3);
    strip(all, n, this.flownAnchor.toArray() as [number, number, number], this.flownPosition, this.flownAlong);
    for (let i = 0; i < n; i++) this.flownAt[2 * i] = this.flownAt[2 * i + 1] = f.t[i]!;
    for (const name of ['position', 'aAlong', 'aT']) {
      const attribute = this.flownGeometry.getAttribute(name) as THREE.BufferAttribute;
      attribute.clearUpdateRanges();
      attribute.addUpdateRange(0, Math.max(1, n) * 2 * attribute.itemSize);
      attribute.needsUpdate = true;
    }
    this.flownGeometry.setDrawRange(0, Math.max(0, n - 1) * 6);
  }

  /** Each frame, before it is drawn: the line turned with the Earth if it is an orbit's, the instant on show, the ease. */
  private place(now: number): void {
    const shown = this.shown;
    const seen = shown !== null && shown.n > 1;
    const changed = this.mesh.visible !== seen;
    this.mesh.visible = seen;
    this.flownMesh.visible = seen && this.flown.n > 1;
    this.ringMesh.visible = seen && shown?.result.impact !== null && shown?.frame === 'surface';
    if (changed) this.host.overlay(this.mesh);
    if (performance.now() - this.panelsRead > 200) {
      // (where the panels and the canvas are is asked a few times a second, here and not in the draw, which must not ask the page's layout)
      this.panels = this.obstacles().map((p) => ({ x0: p.left, y0: p.top, x1: p.right, y1: p.bottom }));
      this.rect = this.host.viewRect();
      this.panelsRead = performance.now();
      if (!this.charWidth) {
        const probe = document.createElement('span');
        probe.className = 'path-mark-probe';
        probe.textContent = 'M'.repeat(20);
        this.marksEl.append(probe);
        this.charWidth = probe.offsetWidth / 20 || 7;
        probe.remove();
      }
    }
    this.marksEl.hidden = !seen;
    // (from the seat only the chips: nothing is laid on the line over the cabin)
    this.marksEl.classList.toggle('aboard', this.host.aboard?.() === true);
    this.drawChips();
    if (!seen || !shown) {
      this.say(shown?.result ?? null);
      return;
    }
    const u = this.uniforms;
    const mix = this.mixOf(shown);
    // (a prediction is begun five times a second while the flight goes on: the one on show is stale only if none has come for a while)
    const stale = this.wantedAt > 0 && performance.now() - Math.max(this.wantedAt, this.doneAt) > STALE * 1000;
    const nowFrom = now - shown.result.from;
    if (u.uNow!.value !== nowFrom || u.uMix!.value !== mix || this.now !== now) {
      u.uNow!.value = nowFrom;
      u.uMix!.value = mix;
      this.now = now;
      this.turnAt(shown, now, this.turn);
      this.mesh.quaternion.copy(this.turn);
      this.carried(shown.anchor, this.mesh.position);
      // the flown line and the ring are children of the mesh: placed in its frame
      this.buildFlown(shown.frame, shown.result.from);
      const inverse = this.unturn.copy(this.turn).invert();
      const local = (p: THREE.Vector3, into: THREE.Object3D) =>
        into.position.copy(p).sub(this.centre).applyQuaternion(this.turn).add(this.centre).sub(this.mesh.position).applyQuaternion(inverse);
      local(this.flownAnchor, this.flownMesh);
      // (the flown line is in the frame the path is drawn in: over the ground, or with the Earth as it was at the prediction's start)
      this.flownMesh.quaternion.identity();
      const ringAt = this.ringMesh.userData.at as THREE.Vector3 | null;
      if (ringAt) local(ringAt, this.ringMesh);
      (this.flownMesh.material as THREE.ShaderMaterial).uniforms.uNow!.value = now;
      this.host.overlay(this.mesh);
    }
    const opacity = stale ? 0.55 : 0.95;
    if (u.uOpacity!.value !== opacity) {
      u.uOpacity!.value = opacity;
      this.host.overlay(this.mesh);
    }
    this.say(shown.result, now, stale);
  }

  /** A point of the unturned frame where the mesh's turn puts it now, in the scene's frame. */
  private carried(p: THREE.Vector3, into: THREE.Vector3): THREE.Vector3 {
    return into.copy(p).sub(this.centre).applyQuaternion(this.turn).add(this.centre);
  }

  private readonly eye = new THREE.Vector3();
  private readonly ship = new THREE.Vector3();
  private readonly axis2 = new THREE.Vector3();
  private readonly v = new THREE.Vector3();
  private readonly w = new THREE.Vector3();
  private readonly size = new THREE.Vector2();
  private readonly inverse = new THREE.Quaternion();
  private readonly unturn = new THREE.Quaternion();
  private readonly p = new THREE.Vector3();
  private readonly q = new THREE.Vector3();
  private readonly clip = new THREE.Vector4();
  private chipsLaid = new Map<string, ChipOut>();
  private chipsAt = 0;

  /**
   * In the draw, once a frame, with the camera and the vehicle as this frame has them: how wide the line is on this
   * target, how far it keeps from the vehicle and from the eye, the ring's size, and the markers laid out on the page.
   */
  private prepare(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): void {
    const frame = renderer.info.render.frame;
    if (frame === this.drawnAt) return;
    this.drawnAt = frame;
    const u = this.uniforms;
    const target = renderer.getRenderTarget();
    if (target) this.size.set(target.width, target.height);
    else renderer.getDrawingBufferSize(this.size);
    (u.uView!.value as THREE.Vector2).copy(this.size);
    const cssWidth = Math.max(1, this.rect.width || window.innerWidth);
    const ratio = this.size.x / cssWidth;
    u.uRatio!.value = ratio;
    u.uHalf!.value = HALF * ratio;
    u.uCore!.value = CORE * ratio;
    (this.flownMesh.material as THREE.ShaderMaterial).uniforms.uCore!.value = FLOWN_CORE * ratio;
    // the frame is exposed for the hour (daysky.ts) after this is drawn: the line is given what comes out as its colour whatever that is
    const exposure = 0.9 / Math.max(0.05, renderer.toneMappingExposure);
    const cel = this.host.look === 'cel';
    u.uCel!.value = cel ? 1 : 0;
    (u.uColour!.value as THREE.Color).copy(amber).multiplyScalar(exposure);
    (u.uInk!.value as THREE.Color).copy(ink).multiplyScalar(exposure);
    ((this.flownMesh.material as THREE.ShaderMaterial).uniforms.uColour!.value as THREE.Color).copy(pale).multiplyScalar(exposure);

    // the eye and the vehicle in the scene's frame (in the draw the scene stands with the eye at its origin: origin.ts)
    const eye = absolute(this.eye.copy(camera.position));
    const vessel = this.host.vessel(this.ship, this.axis2);
    const radius = vessel?.radius ?? null;
    const ship = this.ship;
    const toShip = radius === null ? Number.POSITIVE_INFINITY : ship.distanceTo(eye);
    const aboard = radius !== null && toShip < 1.2 * radius;
    const reach = Number.isFinite(toShip) ? toShip : eye.distanceTo(this.mesh.position);
    const tanHalf = Math.tan((camera.fov * Math.PI) / 360) / Math.max(camera.zoom, 1e-6);
    // (just past the near plane, which stands at half the way to the nearest thing: Stage.fitDepth; and, near a vehicle
    // close by, a seventh of the way to it, so a line that comes at the eye has gone before it is a smear across the view;
    // and from inside it, nothing within its own radius: the line is seen through the windows and never in the cabin, even
    // while the vehicle drawn is still catching up with the flight after the clock has run fast and the line starts
    // where the flight is, metres off)
    u.uNear!.value = Math.max(1.02 * camera.near, 0.15 * Math.min(reach, 4000), aboard && radius !== null ? radius : 0);
    // the gap: the vehicle's radius and a half, or a fifth of the half height of the view at the vehicle (a tenth of the
    // distance through an ordinary lens; through the pad camera's long one, so much less that the line is seen leave it)
    u.uGap!.value = vessel === null ? 1 : Math.max(1.1 * vessel.half, 0.2 * toShip * tanHalf);
    (u.uThin!.value as THREE.Vector2).set(Math.max(2e4, 40 * reach), Math.max(6e5, 1200 * reach));
    // the vehicle in each mesh's own frame: the path's, and the flown line's (a child of it)
    this.inverse.copy(this.mesh.quaternion).invert();
    const inMesh = this.v
      .copy(radius === null ? this.mesh.position : ship)
      .sub(this.mesh.position)
      .applyQuaternion(this.inverse);
    (u.uShip!.value as THREE.Vector3).copy(inMesh);
    ((this.flownMesh.material as THREE.ShaderMaterial).uniforms.uShip!.value as THREE.Vector3).copy(inMesh).sub(this.flownMesh.position);
    // ...and on the target: its outline as a capsule, its long axis from end to end and as broad as it is, with a margin
    // (none from inside it)
    const project = (p: THREE.Vector3, into: THREE.Vector3): THREE.Vector3 | null => {
      into.copy(p).sub(eye).add(camera.position).applyMatrix4(camera.matrixWorldInverse);
      if (into.z > -1e-3) return null;
      return into.applyMatrix4(camera.projectionMatrix);
    };
    const seg = u.uShipSeg!.value as THREE.Vector4;
    let clear: Clear = { ax: 0, ay: 0, bx: 0, by: 0, r: 0 };
    u.uShipW!.value = 0;
    if (vessel && !aboard) {
      const a = project(this.w.copy(ship).addScaledVector(this.axis2, vessel.half), this.w);
      const ax = a ? a.x : Number.NaN;
      const ay = a ? a.y : Number.NaN;
      const b = project(this.w.copy(ship).addScaledVector(this.axis2, -vessel.half), this.w);
      if (b && Number.isFinite(ax)) {
        const across = (vessel.across / (toShip * tanHalf)) * (this.size.y / 2);
        u.uShipW!.value = 1.15 * across + 4 * ratio;
        seg.set(((ax + 1) / 2) * this.size.x, ((ay + 1) / 2) * this.size.y, ((b.x + 1) / 2) * this.size.x, ((b.y + 1) / 2) * this.size.y);
        const css = (x: number, y: number) => [((x + 1) / 2) * this.rect.width, ((1 - y) / 2) * this.rect.height] as const;
        const [cax, cay] = css(ax, ay);
        const [cbx, cby] = css(b.x, b.y);
        clear = { ax: cax, ay: cay, bx: cbx, by: cby, r: u.uShipW!.value / ratio + 16 };
      }
    }
    // the ring where it comes down: so many pixels across, wherever it is seen from
    const ringAt = this.ringMesh.userData.at as THREE.Vector3 | null;
    if (ringAt) u.uRing!.value = ((RING_PX * ratio) / (this.size.y / 2)) * tanHalf * ringAt.distanceTo(eye);
    this.layout(eye, camera, clear);
  }

  /**
   * The markers on the page: each projected, its words written, and all of them laid out together (pathmarks.ts); then
   * the chips, for those that matter now and are not in view. From the seat only the chips: nothing is laid on the line
   * over the cabin.
   */
  private layout(eye: THREE.Vector3, camera: THREE.PerspectiveCamera, clear: Clear): void {
    const shown = this.shown;
    if (!shown || this.marksEl.hidden) return;
    const aboard = this.host.aboard?.() === true;
    const now = this.now;
    const rect = this.rect;
    const ins: MarkIn[] = [];
    const chips: ChipIn[] = [];
    const where = new Map<string, { x: number; y: number }>();
    const next = this.marks.find((m) => m.t > now && m.kind !== 'apogee' && m.kind !== 'perigee')?.id;
    let x0 = Number.POSITIVE_INFINITY;
    let x1 = Number.NEGATIVE_INFINITY;
    let y0 = Number.POSITIVE_INFINITY;
    let y1 = Number.NEGATIVE_INFINITY;
    const p = this.p;
    const centre = this.v.copy(this.centre);
    const radius = this.uniforms.uRadius!.value as number;
    const width = this.charWidth || 7;
    for (const m of this.marks) {
      if (m.t <= now) continue;
      const scene = this.carried(m.at, p);
      // behind the Earth?
      const from = this.w.copy(scene).sub(eye);
      const k = Math.min(1, Math.max(0, this.q.copy(centre).sub(eye).dot(from) / Math.max(from.lengthSq(), 1e-6)));
      const hidden = centre.distanceTo(this.q.copy(eye).addScaledVector(from, k)) < radius - 8000;
      // on the target, as it is before it is divided: its way from the middle of the view holds wherever it lies, behind the eye too
      const view = this.q.copy(scene).sub(eye).add(camera.position).applyMatrix4(camera.matrixWorldInverse);
      const clip = this.clip.set(view.x, view.y, view.z, 1).applyMatrix4(camera.projectionMatrix);
      const front = view.z < -1e-3 && clip.w > 0;
      const x = front ? ((clip.x / clip.w + 1) / 2) * rect.width : Number.NaN;
      const y = front ? ((1 - clip.y / clip.w) / 2) * rect.height : Number.NaN;
      const words = this.words(m, now);
      if (m.el.dataset.words !== words) {
        m.el.dataset.words = words;
        m.el.lastElementChild!.innerHTML = words;
        m.chip.el.lastElementChild!.innerHTML = words;
      }
      const w = m.el.lastElementChild!.textContent!.length * width + 14;
      const rank = KINDS[m.kind][1] + (m.id === next ? NEXT : 0);
      if (!aboard && front && !hidden && Math.abs(clip.x / clip.w) <= 1.5 && Math.abs(clip.y / clip.w) <= 1.5) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
        where.set(m.id, { x, y });
        ins.push({ id: m.id, x, y, rank, w, h: 18 });
      }
      // a chip for the few that matter now: the apogee ahead (the perigee, going round), the next event, where it ends
      if (m.kind === 'apogee' || m.kind === 'perigee' || m.kind === 'down' || m.kind === 'impact' || m.id === next)
        chips.push({
          id: m.id,
          rank,
          w,
          h: 18,
          at: front ? { x, y } : null,
          dx: (clip.x * rect.width) / 2,
          dy: (-clip.y * rect.height) / 2,
        });
    }
    const span = Number.isFinite(x0) ? Math.max(x1 - x0, y1 - y0) : 0;
    const field = {
      width: rect.width,
      height: rect.height,
      panels: this.panels.map((b) => ({ x0: b.x0 - rect.left, y0: b.y0 - rect.top, x1: b.x1 - rect.left, y1: b.y1 - rect.top })),
      clear,
    };
    // the markers on the line, then the chips for those not on it, off what is on it: a marker is laid once
    const out = layWords(ins, chips, field, span, rect.width / 2, rect.height / 2, { marks: this.laid, chips: this.chipsLaid });
    this.laid = new Map(out.marks.map((o) => [o.id, o]));
    this.chipsLaid = new Map(out.chips.map((c) => [c.id, c]));
    for (const m of this.marks) {
      const o = this.laid.get(m.id);
      const at = where.get(m.id);
      const glyph = Boolean(o?.glyph && at);
      m.el.classList.toggle('gone', !glyph);
      m.label = glyph && at && o?.box ? { x: rect.left + o.box.x0, y: rect.top + o.box.y0 } : null;
      // (one going is moved on as it fades, while it has a place)
      if (at) {
        m.ex = rect.left + at.x;
        m.ey = rect.top + at.y;
        m.el.style.transform = `translate(${m.ex.toFixed(1)}px, ${m.ey.toFixed(1)}px)`;
      }
      const c = this.chipsLaid.get(m.id);
      const chip = m.chip;
      chip.want = c?.box ? { x: rect.left + c.box.x0, y: rect.top + c.box.y0 } : null;
      if (!c?.box) continue;
      // (a place that has leapt, round another chip or a panel, is gone to by fading out and in again, not by gliding over the page)
      if (c.leap) m.words.leap = true;
      chip.px = c.px - c.box.x0;
      chip.py = c.py - c.box.y0;
      chip.angle = c.angle;
    }
  }

  /**
   * Each frame (in `tick`, drawn or not): each marker's words where the layout last put them, on the line or as a chip,
   * faded from one to the other in place (pathmarks.ts: `crossFade`), never at two places at once. A chip whose place
   * has leapt fades out, and comes in again where it is going.
   */
  private drawChips(): void {
    const t = performance.now();
    const dt = Math.min(0.1, Math.max(0, (t - this.chipsAt) / 1000));
    this.chipsAt = t;
    const on = !this.marksEl.hidden;
    for (const m of this.marks) {
      const c = m.chip;
      const w = m.words;
      const ahead = on && m.t > this.now;
      crossFade(w, ahead ? m.label : null, ahead ? c.want : null, dt / CHIP_FADE);
      // (the pointer is the layout's while the chip is where the layout put it)
      if (w.own && c.want && w.chip.x === c.want.x && w.chip.y === c.want.y) {
        c.at.px = c.px;
        c.at.py = c.py;
        c.at.angle = c.angle;
      }
      // (one not shown is written once, and not every frame)
      const l = w.label;
      const label =
        l.op > 0
          ? `opacity:${l.op.toFixed(3)};transform:translate(${(l.x - m.ex).toFixed(1)}px,${(l.y - m.ey).toFixed(1)}px)`
          : 'opacity:0';
      if (label !== m.written) {
        m.written = label;
        (m.el.lastElementChild as HTMLElement).setAttribute('style', label);
      }
      const ch = w.chip;
      const box = ch.op > 0 ? `opacity:${ch.op.toFixed(3)};transform:translate(${ch.x.toFixed(1)}px,${ch.y.toFixed(1)}px)` : 'opacity:0';
      const a = c.at;
      // (standing over the label as it goes, it has no pointer: it is the label's words)
      const pointer = w.own ? `translate(${a.px.toFixed(1)}px,${a.py.toFixed(1)}px) rotate(${a.angle.toFixed(3)}rad) translateX(5px)` : '';
      if (`${box}|${pointer}` === c.written) continue;
      c.written = `${box}|${pointer}`;
      c.el.setAttribute('style', box);
      const tip = c.el.firstElementChild as HTMLElement;
      tip.style.transform = pointer;
      tip.style.visibility = pointer ? '' : 'hidden';
    }
  }

  /** What a marker says: its name, its figure, and how long until it. */
  private words(m: Mark, now: number): string {
    return `<b>${KINDS[m.kind][0]}</b>${m.figure ? ` ${m.figure}` : ''} <em>${clock(m.t - now)}</em>`;
  }

  /** The switch and the figures beside the navball: whose future it is, the apogee, how it ends. */
  private say(result: Prediction | null, now = 0, stale = false): void {
    const set = (id: string, text: string) => {
      const el = this.readout.querySelector<HTMLElement>(`[data-path-cell=${id}]`)!;
      if (el.textContent !== text) el.textContent = text;
    };
    const row = (id: string, on: boolean) => {
      const el = this.readout.querySelector<HTMLElement>(`[data-path-row=${id}]`)!;
      if (el.hidden === on) el.hidden = !on;
    };
    const choosing = this.on && this.choosing();
    row('kind', choosing);
    for (const b of this.readout.querySelectorAll<HTMLElement>('[data-path=guided], [data-path=coast]'))
      b.setAttribute('aria-pressed', String((b.dataset.path === 'guided') === this.guided));
    const sequencer = this.source.steering.sequence !== false;
    set(
      'as',
      !this.on
        ? 'off'
        : stale
          ? 'working…'
          : this.waiting()
            ? this.source.steering.guidance
              ? 'as planned'
              : 'no plan'
            : choosing
              ? ''
              : this.burning()
                ? 'if cut now'
                : !this.live
                  ? 'looking back'
                  : sequencer
                    ? 'as sequenced'
                    : 'hands off',
    );
    // (said in full where the pointer rests: the line has room for a word or two)
    const as = this.readout.querySelector<HTMLElement>('[data-path-cell=as]')!;
    as.title = !this.on
      ? ''
      : stale
        ? 'The path on show is more than a second and a half old: a newer one is being worked out'
        : this.waiting()
          ? this.source.steering.guidance
            ? 'On the pad: the path guidance will fly, the record’s programme to the record’s cutoff, then the sequencer’s events'
            : 'Guidance is off (G): there is no plan to show until the engine is lit'
          : this.burning() && !choosing
            ? 'The path if the engine were cut now (guidance is off, so there is no plan to show)'
            : !this.live
              ? 'Looking back at what was flown: the path from that instant with nothing done by the pilot or the sequencer, the parachutes coming out at their heights'
              : sequencer
                ? 'What happens from here if the pilot does nothing more: the sequencer sets off each event at the record’s time, and the parachutes come out at their heights'
                : 'The sequencer is off (B): nothing happens by itself, no retrofire and no parachute, so the path falls as it is';
    row('apogee', this.on);
    row('end', this.on);
    if (!result || result.outcome === 'none') {
      set('apogee', '–');
      set('endName', 'Down');
      set('end', '–');
      return;
    }
    set('apogee', result.apogee && result.apogee.t > now ? `${km(result.apogee.altitude)} km · ${clock(result.apogee.t - now)}` : 'passed');
    const end = this.readout.querySelector<HTMLElement>('[data-path-row=end]')!;
    if (result.outcome === 'orbit' && result.orbit) {
      set('endName', 'Orbit');
      set('end', `${(result.orbit.period / 60).toFixed(1)} min${result.perigee ? ` · Pe ${km(result.perigee.altitude)} km` : ''}`);
      end.title = `Once round in this time, lowest at this height. Drawn ${this.frame === 'orbit' ? 'in the frame that does not turn' : 'over the turning Earth'} (O)`;
    } else if (result.impact) {
      set('endName', result.chute ? 'Down' : 'Impact');
      set('end', `${km(result.impact.range)} km · ${clock(result.impact.t - now)}`);
      end.title = result.chute
        ? 'Where it comes down under its parachute: the distance from the pad over the ground, and how long until then'
        : 'Where it meets the surface with no parachute out: the distance from the pad over the ground, and how long until then';
    } else {
      set('endName', 'End');
      set('end', 'not within six hours');
    }
  }
}

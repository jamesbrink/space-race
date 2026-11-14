import * as THREE from 'three';
import { prefs } from '../prefs.ts';
import type { Phase } from '../sim/fly.ts';
import { apsides, type Burn, type Prediction, type Predictor, predictor, programmeAxis, type Sequence } from '../sim/predict.ts';
import type { SitedFlight } from '../types';
import { EARTH_ROTATION_RATE, WGS84_B } from '../world/bodies.ts';
import { ecefToSite, ecefToSiteDirection, type Site, siteFrame, type Vec3 } from '../world/frames.ts';
import { absolute, uOrigin } from './origin.ts';
import { type Curve, curveAt, curveOf, limbPx, type Ribbon, ribbon, sample } from './pathline.ts';
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
 * The predicted path, drawn: where the vehicle goes from here if nothing more is done (sim/predict.ts, or the deck's own
 * predictor: one `Predictor` and one `Prediction` whichever made it), as a line ahead of it with what falls out of the
 * prediction marked on it; and, fainter, the line it has flown. Nothing here knows a flight, a programme or what kind
 * of path it is given: every rule below is one of the screen or of the path's own motion, the same for a lob, an
 * ascent, an orbit, a fall.
 *
 * - **A curve, sampled for the screen** (pathline.ts). The prediction is kept as its instants with a place and a
 *   velocity at each, and between them the cubic those fix; each frame the stretch from the vehicle to the end is cut
 *   into chords until none strays more than `ERROR_PX` from the curve as seen from the eye. So the line is as fine as
 *   the view needs wherever the camera is (close by, it follows the curve to the vehicle; from far out an orbit once
 *   round reads as an ellipse), however coarsely the predictor kept it, and the chords stay put as the clock goes on.
 * - **From the vehicle.** The line starts at the instant on the path nearest the vehicle as the stage draws it, and is
 *   taken onto the vehicle there (the vehicle drawn and the flight differ by the stage's interpolation): the offset
 *   is let go over the next ten gaps of the line. A path further than two gaps from the vehicle is another path and is
 *   drawn where it is. The flown line ends at the vehicle the same way.
 * - **Clear of the vehicle.** Nothing of the line within a gap of the vehicle's middle (a little more than half its
 *   length, or a fifth of the view's half height at the vehicle, whichever is more), then it comes in from nothing
 *   over the next two gaps on lunar-lift's curve (pathline.ts: `fadeIn`), measured in the scene; and on the screen
 *   nothing within the vehicle's outline, taken as a capsule along its long axis as broad as it is, and a margin.
 *   From inside the vehicle (on board) the outline is off and the cabin's own walls hide the line: it is seen through
 *   the windows, and no marker is laid over the cabin.
 * - **A width on the screen, not in the world, and the same everywhere**: each chord is a quad pushed out across its
 *   own direction on the screen (from both its ends as projected, never from a direction in the world, which near the
 *   eye or along the line of sight projects to anything), mitred to the next at each join, a core of `CORE` CSS pixels
 *   each side with a pixel's soft edge, a thin dark casing (what reads against bright sky, cloud and sea) and a glow
 *   to `HALF` (what reads against black); in the cel look a flat core with an ink edge. It never thins with distance:
 *   a line too thin to cover a pixel breaks into dots.
 * - **Never at the eye**: each chord is cut where it crosses a plane just in front of the near plane and nothing behind
 *   that plane is drawn (pathline.ts `clipNear`: no vertex is ever behind the eye, where a ribbon turns inside out
 *   across the screen); the line fades in over the next doubling of the distance from the eye, so where it passes the
 *   camera it is seen leaving, not cut. From inside the vehicle nothing within its radius of the eye is drawn, so the
 *   line is seen through the windows even while the vehicle drawn catches up with the flight after the clock has run fast.
 * - **Hidden by what is in front of it**: drawn after the solid scene, tested against its depth and writing none, a
 *   hundredth of the way nearer than it is (so the sea it comes down to does not hide its end); beyond the far plane
 *   it is at the far plane, behind everything; and the Earth hides it by a sphere, tested for every pixel of the
 *   ribbon (pathline.ts `limbPx`) with a pixel's soft edge, so where the line goes behind the limb it ends at the limb.
 *   The sphere is the Earth's polar radius: inside the surface everywhere, so it never hides what is on the ground.
 * - **Still when nothing changes, eased when it does**: a new prediction is eased in from where the last one had each
 *   instant over `EASE` seconds; a prediction made again of the same flight lies on the same curve, so nothing moves.
 * - **Drawn from the eye** (origin.ts): points are kept in doubles and given to the GPU as offsets from the vehicle,
 *   where the mesh stands; what the fragment shader tests (the limb, the eye, the vehicle) is given it in the view's
 *   own frame, worked out in doubles.
 *
 * Frames. The prediction is in the simulator's frame, which does not turn. `surface` draws each point where it will be
 * over the ground at its own instant (the Earth turned to that instant, then the site's frame, as viewer/ascent.ts places
 * the vehicle): it meets the sea where the vehicle will. `orbit` draws the path as it lies in the frame that does not
 * turn: each point with the Earth turned to the instant on show. Only a path that comes round without meeting the ground
 * is drawn in `orbit` (the navball's O chooses); one that comes down is drawn over the ground, where it comes down.
 *
 * The markers (pathmarks.ts lays them out) are glyphs on the line, each with a label and a figure, all of them found
 * in the prediction itself: its next apoapsis and periapsis (predict.ts `apsides`: where its radial speed changes
 * sign, whatever the path), its events (what the sequencer will do, the burn, the parachutes, the first 0.05 g and the
 * greatest load) and where it ends. On the surface where it comes down there is a ring. One whose place is behind the
 * Earth is drawn there, dimmed: it is in view, the Earth is in front of it. The few that matter now (the apsides ahead,
 * the next event, where it ends) have besides a chip at the edge of the clear part of the view, on the bearing to them,
 * for when their place is not in view (off the window, under a panel, behind the eye: pathmarks.ts `layChips`): it
 * fades in as the marker on the line fades out and the other way about, and fades out and in again where its place
 * leaps, never gliding over the page. From the seat only the chips (with the deck on show: from the couch alone the
 * page has none of it).
 *
 * The work is kept off the frame: a prediction is begun at most five times a second and worked out in slices of
 * `SLICE` milliseconds, one a frame. The line is sampled again only when the eye, the instant or the prediction has
 * moved (a few hundred chords: `sr.path.drawn` says how many and what it took).
 */

/** The most chords of the line ahead and of the line flown; the most points of the line flown kept. */
const MOST = 4096;
const FLOWN_MOST = 2048;
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
/** Gaps of the line: within this many of the vehicle it is taken onto the vehicle; over this many the offset is let go. */
const PIN_WITHIN = 2;
const PIN_OVER = 10;
/**
 * The curve on show stands while the flight keeps to it (`holds`): within a metre and a centimetre a second (the same
 * coast worked again agrees to centimetres over an orbit), and, for a path that comes round, while it still reaches
 * nineteen twentieths of the way round ahead.
 */
const HOLD_M = 1;
const HOLD_MS = 0.01;
const HOLD_ROUND = 0.95;

const VERT = /* glsl */ `
  #include <common>
  attribute vec3 aOther;      // the chord's other end
  attribute vec3 aBeyond;     // the point past this end along the line (this end again at an open end)
  attribute float aSide;      // -1 or 1: which edge of the ribbon
  attribute float aEnd;       // 0 at the chord's start, 1 at its end
  attribute float aT;         // seconds from the line's zero
  uniform vec2 uView;         // the target's size, pixels
  uniform float uHalf;        // half the ribbon's width, pixels
  uniform float uClip;        // nothing nearer the eye than this plane is drawn, m (just past the near plane)
  uniform float uRing;        // the ring's radius, m
  varying float vSide, vT;
  varying vec3 vView;         // this point in the view's frame (the eye at the origin), m
  vec3 toView(vec3 p) { return (modelViewMatrix * vec4(p, 1.0)).xyz; }
  vec2 toScreen(vec3 v) { vec4 c = projectionMatrix * vec4(v, 1.0); return c.xy / c.w * 0.5 * uView; }
  // from a (in front of the plane) toward b: b, or where the chord crosses the plane if b is behind it
  vec3 cut(vec3 a, vec3 b) {
    float za = a.z + uClip, zb = b.z + uClip;
    return zb <= 0.0 ? b : mix(a, b, za / (za - zb));
  }
  void main() {
  #ifdef RING
    vec3 self = position * uRing, other = aOther * uRing, beyond = aBeyond * uRing;
  #else
    vec3 self = position, other = aOther, beyond = aBeyond;
  #endif
    vT = aT;
    vSide = aSide;
    vec3 s = toView(self), o = toView(other), b = toView(beyond);
    bool behind = s.z > -uClip;
    // never at the eye: a chord all behind the plane is not drawn (put outside the view, its triangles are culled);
    // one that crosses it is cut there, this end moved along the chord to the plane
    if (behind && o.z > -uClip) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); vView = vec3(0.0); return; }
    if (behind) s = cut(o, s);
    else o = cut(s, o);
    // the chord's way on the screen, from its start to its end, and the neighbour's, for the mitre at this end
    vec2 ps = toScreen(s), po = toScreen(o);
    float end = step(0.5, aEnd);
    vec2 run = mix(po - ps, ps - po, end);
    float len = length(run);
    run = len > 1e-6 ? run / len : vec2(1.0, 0.0);
    vec2 normal = vec2(-run.y, run.x);
    float stretch = 1.0;
    if (!behind && distance(beyond, self) > 0.0) {
      vec2 pb = toScreen(b.z > -uClip ? cut(s, b) : b);
      vec2 next = mix(ps - pb, pb - ps, end);
      float l2 = length(next);
      vec2 m = normal + (l2 > 1e-6 ? vec2(-next.y, next.x) / l2 : normal);
      // (mitred where it turns by less than 120 degrees on the screen; a sharper turn is left square, never narrowed)
      if (length(m) > 1e-3 && dot(normalize(m), normal) >= 0.5) {
        m = normalize(m);
        stretch = 1.0 / dot(m, normal);
        normal = m;
      }
    }
    vView = s;
    // its depth a hundredth nearer than it is (the same place on the screen), and never past the far plane
    vec4 clip = projectionMatrix * vec4(s * 0.99, 1.0);
    clip.xy += normal * aSide * stretch * uHalf / uView * 2.0 * clip.w;
    clip.z = min(clip.z, clip.w * 0.99999);
    gl_Position = clip;
  }`;

const FRAG = /* glsl */ `
  uniform vec3 uColour, uInk;
  uniform float uCut, uOpacity, uCel, uCore, uHalf, uClip, uGap, uRatio;
  uniform vec3 uShip;         // the vehicle's middle in the view's frame
  uniform vec4 uShipSeg;      // and on the target: its long axis from end to end, pixels
  uniform float uShipW;       // and how far round that the line keeps off, pixels (0: not at all)
  uniform vec3 uCentre;       // the Earth's centre in the view's frame
  uniform float uRadius;      // the sphere that hides the line, m
  uniform float uPxPerRad;    // pixels to a radian of the view
  varying float vSide, vT;
  varying vec3 vView;
  void main() {
    float px = abs(vSide) * uHalf;
    float c = uCore;
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
      float g = max(0.0, 1.0 - px / uHalf);
      float glow = 0.3 * g * g;
      vec3 under = uInk * rim + uColour * glow * (1.0 - rim);
      float behind = rim + glow * (1.0 - rim);
      a = body + behind * (1.0 - body);
      colour = (uColour * body + under * (1.0 - body)) / max(a, 1e-4);
    }
    float eye = length(vView);
  #ifndef RING
    // clear of the vehicle: along the line in the scene, coming in from nothing over three gaps; and on the screen, outside its ring
    float d = distance(vView, uShip);
    float x = clamp(0.631 * log2(max(d, 1e-3) / uGap), 0.0, 1.0);
    a *= x * x * (3.0 - 2.0 * x);
    if (uShipW > 0.0) {
      vec2 p = gl_FragCoord.xy - uShipSeg.xy;
      vec2 ab = uShipSeg.zw - uShipSeg.xy;
      float h = clamp(dot(p, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
      // (only where the line is nearer the eye than the vehicle: behind it, the vehicle hides it, and it is seen leave the outline)
      float before = clamp((length(uShip) - eye) / uGap, 0.0, 1.0);
      a *= mix(1.0, smoothstep(uShipW, uShipW + 16.0 * uRatio, length(p - ab * h)), before);
    }
  #endif
    // never at the eye: in from the plane over the next doubling of the distance
    a *= smoothstep(uClip, 2.0 * uClip, eye);
    // behind the Earth: the ray from the eye to here passes inside its sphere first (by how many pixels: pathline.ts limbPx)
    float k = dot(uCentre, vView) / max(eye * eye, 1e-6);
    if (k > 0.0 && k < 1.0) a *= smoothstep(-0.7, 0.7, (length(uCentre - vView * k) - uRadius) / max(eye * k, 1e-3) * uPxPerRad);
  #if !defined(FLOWN) && !defined(RING)
    if (vT < uCut) {
      float dash = fract(vT / 3.0);                                     // under power: dashes, three seconds of flight each
      a *= mix(0.25, 1.0, smoothstep(0.0, 0.04, dash) * (1.0 - smoothstep(0.6, 0.64, dash)));
    }
  #endif
    a *= uOpacity;
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

/** A marker of the prediction on show: where it is in the simulator's frame and when, where that is in the scene now, and what it says beside its name. */
interface Mark {
  id: string;
  kind: Kind;
  r: Vec3;
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

/** A prediction on show: its curve in the simulator's frame, the frame it is drawn in, and the one it is eased from. */
interface Shown {
  key: string;
  /** What the prediction was made with, besides the instant (want: the plan, the future chosen): while that holds and the flight keeps to the curve, the curve stands. */
  plan: string;
  result: Prediction;
  frame: 'surface' | 'orbit';
  curve: Curve;
  began: number;
  was: Shown | null;
}

/** A line's buffers on the GPU and in doubles: the ribbon's, and the points it was last sampled at (scene frame). */
interface Line {
  geometry: THREE.BufferGeometry;
  buf: Ribbon;
  t: Float64Array;
  p: Float64Array;
  n: number;
}

const ink = new THREE.Color(0x0a0b0e);
const amber = new THREE.Color(0xffc46b);
const pale = new THREE.Color(0xe9e4d8);

/** A ribbon's geometry for `chords` chords: four vertices each (its two ends, each with its two edges), all but which edge and which end written each time it is sampled. */
function ribbonGeometry(chords: number): Line {
  const geometry = new THREE.BufferGeometry();
  const buf: Ribbon = {
    position: new Float32Array(chords * 12),
    other: new Float32Array(chords * 12),
    beyond: new Float32Array(chords * 12),
    at: new Float32Array(chords * 4),
  };
  geometry.setAttribute('position', new THREE.BufferAttribute(buf.position, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aOther', new THREE.BufferAttribute(buf.other, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aBeyond', new THREE.BufferAttribute(buf.beyond, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aT', new THREE.BufferAttribute(buf.at, 1).setUsage(THREE.DynamicDrawUsage));
  const side = new Float32Array(chords * 4);
  const end = new Float32Array(chords * 4);
  const index = new Uint16Array(chords * 6);
  for (let s = 0; s < chords; s++) {
    side.set([-1, 1, -1, 1], s * 4);
    end.set([0, 0, 1, 1], s * 4);
    const v = s * 4;
    index.set([v, v + 1, v + 2, v + 1, v + 3, v + 2], s * 6);
  }
  geometry.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
  geometry.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  geometry.setDrawRange(0, 0);
  return { geometry, buf, t: new Float64Array(chords + 1), p: new Float64Array((chords + 1) * 3), n: 0 };
}

/** Write a line's ribbon from its sampled points, offsets from `anchor`, and say which of it changed. */
function upload(line: Line, anchor: readonly [number, number, number], zero: number, closed = false): void {
  const chords = ribbon(line.t, line.p, line.n, anchor, zero, line.buf, closed);
  for (const name of ['position', 'aOther', 'aBeyond', 'aT']) {
    const attribute = line.geometry.getAttribute(name) as THREE.BufferAttribute;
    attribute.clearUpdateRanges();
    attribute.addUpdateRange(0, Math.max(1, chords) * 4 * attribute.itemSize);
    attribute.needsUpdate = true;
  }
  line.geometry.setDrawRange(0, chords * 6);
}

export class FlightPath {
  readonly mesh: THREE.Mesh;
  private readonly flownMesh: THREE.Mesh;
  private readonly ringMesh: THREE.Mesh;
  private readonly ahead = ribbonGeometry(MOST);
  private readonly behind = ribbonGeometry(FLOWN_MOST);
  /** The line flown: instants and places in the frame that does not turn, as heard from the flight deck. */
  private readonly flown = { t: new Float64Array(FLOWN), r: new Float64Array(FLOWN * 3), n: 0 };
  private flownCurve: { curve: Curve; key: string } | null = null;
  private readonly uniforms: Record<string, THREE.IUniform>;
  private readonly materials: THREE.ShaderMaterial[] = [];
  private readonly flight: SitedFlight;
  private readonly site: Site;
  private readonly source: PathSource;
  private readonly host: PathHost;
  private readonly marksEl: HTMLElement;
  private readonly readout: HTMLElement;
  private readonly button: HTMLElement | null;
  /** The Earth's centre in the site's frame, and the columns of the turn from the Earth's frame into the site's. */
  private readonly centre: THREE.Vector3;
  private readonly basis: number[];

  private on = !prefs.get('pathOff');
  private guided = prefs.get('pathGuided');
  private frame: 'surface' | 'orbit' = 'surface';
  /** The sample on show and the live state's part in it. */
  private sample: PathSample | null = null;
  private live: PathLive | null = null;
  private job: { run: Predictor; key: string; plan: string; began: number } | null = null;
  private shown: Shown | null = null;
  private wantedAt = 0;
  private doneAt = 0;
  private raf = 0;
  /** The instant on the path the vehicle is drawn at, and what the line was last sampled for. */
  private now = 0;
  private sampledFor = '';
  private marks: Mark[] = [];
  private laid = new Map<string, MarkOut>();
  private drawnAt = -1;
  /** The camera the stage last drew through (the line is sampled for it), and the size of what it drew into. */
  private camera: THREE.PerspectiveCamera | null = null;
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
   * The line as last sampled, for whoever asks (`sr.path.drawn`, the path test): chords ahead and flown, what sampling
   * them took, the instant it starts at, how far it was taken to meet the vehicle, and the gap.
   */
  drawn = { ahead: 0, flown: 0, ms: 0, now: 0, pinned: 0, offset: 0, gap: 0 };

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
    this.basis = [
      ...ecefToSiteDirection(this.site, [1, 0, 0]),
      ...ecefToSiteDirection(this.site, [0, 1, 0]),
      ...ecefToSiteDirection(this.site, [0, 0, 1]),
    ];

    this.uniforms = {
      uOrigin,
      uView: { value: new THREE.Vector2(1, 1) },
      uHalf: { value: HALF },
      uClip: { value: 1 },
      uRing: { value: 1 },
      uCentre: { value: new THREE.Vector3() },
      uRadius: { value: WGS84_B },
      uPxPerRad: { value: 1000 },
      uColour: { value: new THREE.Color() },
      uInk: { value: new THREE.Color() },
      uCut: { value: -1 },
      uOpacity: { value: 0.95 },
      uCel: { value: 0 },
      uCore: { value: CORE },
      uGap: { value: 10 },
      uRatio: { value: 1 },
      uShip: { value: new THREE.Vector3() },
      uShipSeg: { value: new THREE.Vector4() },
      uShipW: { value: 0 },
    };
    // the ring where it comes down: a loop in the level there, drawn the same way
    const ring = ribbonGeometry(RING);
    for (let i = 0; i <= RING; i++) {
      const a = (2 * Math.PI * i) / RING;
      ring.t[i] = 0;
      ring.p.set([Math.cos(a), 0, Math.sin(a)], i * 3);
    }
    ring.n = RING + 1;
    upload(ring, [0, 0, 0], 0, true);

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
      this.behind.geometry,
      'Flown path',
      11,
      { uCore: { value: FLOWN_CORE }, uColour: { value: new THREE.Color() }, uOpacity: { value: 0.5 } },
      { FLOWN: '' },
    );
    this.mesh = make(this.ahead.geometry, 'Predicted path', 12, {}, {});
    this.ringMesh = make(ring.geometry, 'Where the path comes down', 12, {}, { RING: '' });
    this.mesh.add(this.flownMesh, this.ringMesh); // (one object for the stage: all three are drawn from the same anchor)
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
    if (this.shown) this.build(this.shown.result, this.shown.key, this.shown.plan, false);
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
  private want(): { key: string; plan: string; burn: Burn | null; sequence: Sequence | undefined } | null {
    const s = this.sample;
    const tr = this.flight.trajectory;
    if (!s || !this.on || !this.source.active || s.phase === 'landed') return null;
    // (a flight into orbit: its deck predicts, from the sample on show and what it has planned)
    if (!tr)
      return this.source.predict && s.t > 0
        ? { key: `${s.t}|${this.source.plan ?? ''}`, plan: this.source.plan ?? '', burn: null, sequence: undefined }
        : null;
    const craft = this.source.craft;
    const { trim, guidance } = this.source.steering;
    const until = this.until();
    const waiting = this.waiting();
    // on the pad there is only the plan to show; in the air, whichever was asked for while there is an engine to burn under guidance
    const plan = craft !== null && s.t < until && (waiting || (this.choosing() && this.guided));
    if (waiting && (!plan || !guidance)) return null;
    const sequence = this.sequence();
    const what = `${plan ? `g${trim.pitch}|${trim.yaw}` : 'c'}|${JSON.stringify(sequence ?? null)}|${this.live ? 'live' : 'past'}`;
    return {
      key: `${s.t}|${what}`,
      plan: what,
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
    // (the flight still on the curve on show, with the same plan: that curve is still its future, and nothing is predicted again)
    if (this.shown && this.shown.key !== want.key && this.shown.plan === want.plan && this.holds(this.shown, s)) this.shown.key = want.key;
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
        plan: want.plan,
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
        this.build(result, this.job.key, this.job.plan, true);
        this.job = null;
        this.doneAt = performance.now();
        this.wantedAt = this.shown?.key === want.key ? 0 : this.wantedAt;
      }
    }
    if (this.shown?.key === want.key) this.wantedAt = 0;
    this.place();
  }

  /**
   * A place of the simulator's frame (`r` at `o`) in the scene's, into `out` at `p`: over the ground at its own instant
   * `t` (`surface`), or with the Earth turned to `now` (`orbit`: as it lies among the stars).
   */
  private sceneOf(
    r: ArrayLike<number>,
    o: number,
    t: number,
    frame: 'surface' | 'orbit',
    now: number,
    out: Float64Array | number[],
    p: number,
  ): void {
    const turned = EARTH_ROTATION_RATE * (frame === 'orbit' ? now : t);
    const cos = Math.cos(turned);
    const sin = Math.sin(turned);
    const x = r[o]! * cos + r[o + 1]! * sin;
    const y = -r[o]! * sin + r[o + 1]! * cos;
    const z = r[o + 2]!;
    const b = this.basis;
    out[p] = this.centre.x + b[0]! * x + b[3]! * y + b[6]! * z;
    out[p + 1] = this.centre.y + b[1]! * x + b[4]! * y + b[7]! * z;
    out[p + 2] = this.centre.z + b[2]! * x + b[5]! * y + b[8]! * z;
  }

  /**
   * Whether the curve on show is still the flight's future from this sample: the sample lies on it, within `HOLD_M`
   * metres and `HOLD_MS` metres a second (a coast is; under thrust the prediction's own future departs within a frame
   * or two, unless it is the burn the prediction flies), and, if it comes round, it still reaches most of the way round
   * ahead. The same physics from the same state gives the same curve, so it is not worked out again.
   */
  private holds(shown: Shown, s: PathSample): boolean {
    const c = shown.curve;
    if (c.n < 2 || s.t < c.t[0]! || s.t > c.t[c.n - 1]!) return false;
    if (shown.result.outcome === 'orbit' && c.t[c.n - 1]! - s.t < HOLD_ROUND * (c.t[c.n - 1]! - c.t[0]!)) return false;
    const at = this.at3;
    const vel = [0, 0, 0];
    curveAt(c, s.t, at, 0, 0, vel);
    const r = s.centre ?? s.r;
    return (
      Math.hypot(at[0]! - r[0], at[1]! - r[1], at[2]! - r[2]) <= HOLD_M &&
      Math.hypot(vel[0]! - s.v[0], vel[1]! - s.v[1], vel[2]! - s.v[2]) <= HOLD_MS
    );
  }

  /** Lay the line along a prediction, eased from where the one on show has it now (`ease`). */
  private build(result: Prediction, key: string, plan: string, ease: boolean): void {
    const n = result.outcome === 'none' ? 0 : result.points.length;
    const frame = result.outcome === 'orbit' ? this.frame : 'surface';
    const old = this.shown;
    const next: Shown = {
      key,
      plan,
      result,
      frame,
      curve: curveOf(n ? result.points : []),
      began: performance.now(),
      // (eased from the line on show as it is drawn now: from the one it was itself eased from, if that is still going)
      was: ease && old && old.curve.n > 1 && n > 0 ? old : null,
    };
    if (next.was) next.was.was = null;
    this.shown = next;
    this.uniforms.uCut!.value = result.cutoff === null ? -1 : result.cutoff - result.from;
    this.sampledFor = '';
    this.markOut(next);
    this.host.overlay(this.mesh);
  }

  /** How far the line on show has come from where it was eased from. */
  private mixOf(shown: Shown): number {
    const k = Math.min(1, Math.max(0, (performance.now() - shown.began) / (EASE * 1000)));
    return k * k * (3 - 2 * k);
  }

  /** The markers of a prediction, all found in it: its next apoapsis and periapsis, its events, and its end. */
  private markOut(shown: Shown): void {
    const r = shown.result;
    const list: { kind: Kind; t: number; r: Vec3; figure: string }[] = [];
    const points = r.points;
    const height = (a: { t: number; r: Vec3 }) => {
      // (above the sea as the prediction has it at the point before: the Earth's radius there changes too slowly to matter between two)
      let i = 0;
      while (i + 1 < points.length && points[i + 1]!.t <= a.t) i++;
      const p = points[i]!;
      return Math.hypot(...a.r) - (Math.hypot(...p.r) - p.altitude);
    };
    for (const kind of ['apo', 'peri'] as const) {
      const a = apsides(points, r.from).find((x) => x.kind === kind);
      if (a) list.push({ kind: kind === 'apo' ? 'apogee' : 'perigee', t: a.t, r: a.r, figure: `${km(height(a))} km` });
    }
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
        r: m.r,
        figure: m.figure,
        at: was?.at ?? new THREE.Vector3(),
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
      const at: number[] = [0, 0, 0];
      this.sceneOf(r.impact.r, 0, r.impact.t, 'surface', 0, at, 0);
      const v = new THREE.Vector3(...at);
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().sub(this.centre).normalize());
      ring.userData.at = v;
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

  /** The line flown as a curve: the points kept, and the sample on show after them (the flight as it is now). */
  private flownNow(): Curve | null {
    const f = this.flown;
    const s = this.sample;
    if (f.n < 1 || !s || !this.live) return null;
    const key = `${f.n}|${f.t[f.n - 1]}|${s.t}`;
    if (this.flownCurve?.key === key) return this.flownCurve.curve;
    const points: { t: number; r: ArrayLike<number> }[] = [];
    for (let i = 0; i < f.n; i++) points.push({ t: f.t[i]!, r: f.r.subarray(i * 3, i * 3 + 3) });
    if (s.t > f.t[f.n - 1]! + 1e-6) points.push({ t: s.t, r: s.centre ?? s.r });
    const curve = curveOf(points);
    this.flownCurve = { curve, key };
    return curve.n > 1 ? curve : null;
  }

  private readonly at3 = new Float64Array(3);
  private readonly at3b = new Float64Array(3);
  private readonly lensEye: [number, number, number] = [0, 0, 0];

  /** Where the line on show puts instant `t` in the scene now, eased from the one before; and, if `pin`, taken onto the vehicle near it. */
  private alongAt(shown: Shown, t: number, out: Float64Array, o: number, mix: number): void {
    const c = shown.curve;
    curveAt(c, t, this.at3, 0);
    this.sceneOf(this.at3, 0, t, shown.frame, this.now, out, o);
    const was = shown.was;
    if (was && mix < 1 && t >= was.curve.t[0]! && t <= was.curve.t[was.curve.n - 1]!) {
      curveAt(was.curve, t, this.at3, 0);
      this.sceneOf(this.at3, 0, t, was.frame, this.now, this.at3b, 0);
      for (let k = 0; k < 3; k++) out[o + k] = this.at3b[k]! + (out[o + k]! - this.at3b[k]!) * mix;
    }
  }

  /**
   * Each frame: the line turned with the Earth if it is an orbit's, the instant on show found where the vehicle is drawn,
   * the ease, and the line sampled again for the eye if anything of that has moved.
   */
  private place(): void {
    const shown = this.shown;
    const seen = shown !== null && shown.curve.n > 1;
    const changed = this.mesh.visible !== seen;
    this.mesh.visible = seen;
    this.flownMesh.visible = seen && this.flown.n > 0 && this.live !== null;
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
    const mix = this.mixOf(shown);
    if (mix >= 1) shown.was = null;
    // (a prediction is begun five times a second while the flight goes on: the one on show is stale only if none has come for a while)
    const stale = this.wantedAt > 0 && performance.now() - Math.max(this.wantedAt, this.doneAt) > STALE * 1000;
    this.lay(shown, mix);
    const opacity = stale ? 0.55 : 0.95;
    if (this.uniforms.uOpacity!.value !== opacity) {
      this.uniforms.uOpacity!.value = opacity;
      this.host.overlay(this.mesh);
    }
    this.say(shown.result, this.now, stale);
  }

  private readonly vessel = new THREE.Vector3();
  private readonly vesselAxis = new THREE.Vector3();
  private readonly pinBy = new Float64Array(3);
  private readonly lineSize = new THREE.Vector2(1, 1);

  /** The gap the line keeps from the vehicle (`prepare` gives it to the shader): its radius and a half, or a fifth of the half height of the view at it. */
  private gapOf(half: number, toShip: number, tanHalf: number): number {
    // (a tenth of the distance through an ordinary lens; through the pad camera's long one, so much less that the line is seen leave it)
    return Math.max(1.1 * half, 0.2 * toShip * tanHalf);
  }

  /** Find the instant on show where the vehicle is drawn, and sample both lines for the eye if anything has moved. */
  private lay(shown: Shown, mix: number): void {
    const camera = this.camera;
    const s = this.sample;
    if (!camera || !s) return;
    const c = shown.curve;
    const t0 = c.t[0]!;
    const t1 = c.t[c.n - 1]!;
    const vessel = this.host.vessel(this.vessel, this.vesselAxis);
    const eye = camera.position;
    const tanHalf = Math.tan((camera.fov * Math.PI) / 360) / Math.max(camera.zoom, 1e-6);
    const toShip = vessel ? this.vessel.distanceTo(eye) : Number.POSITIVE_INFINITY;
    const gap = vessel ? this.gapOf(vessel.half, toShip, tanHalf) : 0;
    // the instant on the path nearest the vehicle as it is drawn (Newton's steps along the line from the sample's instant)
    let now = Math.min(t1, Math.max(t0, s.t));
    const p = this.at3b;
    const q = new Float64Array(3);
    this.now = now;
    if (vessel) {
      for (let k = 0; k < 4; k++) {
        this.now = now;
        const h = 0.05;
        this.alongAt(shown, now + h, p, 0, mix);
        this.alongAt(shown, now - h, q, 0, mix);
        const dx = (p[0]! - q[0]!) / (2 * h);
        const dy = (p[1]! - q[1]!) / (2 * h);
        const dz = (p[2]! - q[2]!) / (2 * h);
        const vv = dx * dx + dy * dy + dz * dz;
        if (vv < 1e-6) break;
        this.alongAt(shown, now, p, 0, mix);
        const step = ((this.vessel.x - p[0]!) * dx + (this.vessel.y - p[1]!) * dy + (this.vessel.z - p[2]!) * dz) / vv;
        now = Math.min(t1, Math.max(t0, now + Math.max(-10, Math.min(10, step))));
        if (Math.abs(step) < 1e-4) break;
      }
    }
    this.now = now;
    this.alongAt(shown, now, p, 0, mix);
    this.alongAt(shown, Math.min(t1, now + 0.05), q, 0, mix);
    const speed = Math.hypot(q[0]! - p[0]!, q[1]! - p[1]!, q[2]! - p[2]!) / 0.05;
    const pin = this.pinBy;
    pin.fill(0);
    let offset = 0;
    if (vessel) {
      pin[0] = this.vessel.x - p[0]!;
      pin[1] = this.vessel.y - p[1]!;
      pin[2] = this.vessel.z - p[2]!;
      offset = Math.hypot(pin[0]!, pin[1]!, pin[2]!);
      if (offset > PIN_WITHIN * gap) pin.fill(0);
    }
    const pinned = pin[0] !== 0 || pin[1] !== 0 || pin[2] !== 0;
    // (the offset let go over the next ten gaps of the line: as an interval of time at the speed there)
    const over = pinned ? Math.max(1e-3, (PIN_OVER * gap) / Math.max(speed, 1e-3)) : 1;
    const weight = (dt: number) => {
      const x = Math.min(1, Math.abs(dt) / over);
      return 1 - x * x * (3 - 2 * x);
    };
    // what the line is sampled for: if none of it has moved, the line drawn is the one already there
    const e = camera.quaternion;
    const m = camera.projectionMatrix.elements;
    const flown = this.flownNow();
    const key = [
      eye.x,
      eye.y,
      eye.z,
      e.x,
      e.y,
      e.z,
      e.w,
      m[0],
      m[5],
      m[8],
      m[9],
      camera.near,
      this.lineSize.y,
      now,
      mix,
      shown.key,
      shown.frame,
      this.vessel.x,
      this.vessel.y,
      this.vessel.z,
      flown?.n ?? 0,
      flown ? flown.t[flown.n - 1] : 0,
    ].join();
    // the markers where the line has them now
    for (const mk of this.marks) {
      const a: number[] = [0, 0, 0];
      this.sceneOf(mk.r, 0, mk.t, shown.frame, now, a, 0);
      mk.at.set(a[0]!, a[1]!, a[2]!);
    }
    if (key === this.sampledFor) return;
    this.sampledFor = key;
    const began = performance.now();
    this.lensEye[0] = eye.x;
    this.lensEye[1] = eye.y;
    this.lensEye[2] = eye.z;
    const lens = {
      eye: this.lensEye,
      pxPerRad: this.lineSize.y / 2 / tanHalf,
      near: 1.02 * camera.near,
    };
    const anchor: [number, number, number] = vessel ? [this.vessel.x, this.vessel.y, this.vessel.z] : [p[0]!, p[1]!, p[2]!];
    // ahead: from the vehicle to the end
    const ahead = this.ahead;
    const along = (t: number, out: Float64Array, o: number) => {
      this.alongAt(shown, t, out, o, mix);
      if (pinned) {
        const w = weight(t - now);
        for (let k = 0; k < 3; k++) out[o + k] = out[o + k]! + pin[k]! * w;
      }
    };
    this.along = along;
    ahead.n = sample(along, c.t, now, t1, lens, MOST, ahead.t, ahead.p);
    upload(ahead, anchor, shown.result.from);
    // behind: the line flown, from its first point to the vehicle, in the frame the path is drawn in
    const behind = this.behind;
    behind.n = 0;
    if (flown) {
      const f1 = Math.min(now, flown.t[flown.n - 1]!);
      const v = this.at3;
      behind.n = sample(
        (t, out, o) => {
          curveAt(flown, t, v, 0);
          this.sceneOf(v, 0, t, shown.frame, now, out, o);
          if (pinned) {
            const w = weight(f1 - t);
            for (let k = 0; k < 3; k++) out[o + k] = out[o + k]! + pin[k]! * w;
          }
        },
        flown.t,
        flown.t[0]!,
        f1,
        lens,
        FLOWN_MOST,
        behind.t,
        behind.p,
      );
    }
    upload(behind, anchor, 0);
    this.mesh.position.set(...anchor);
    this.mesh.quaternion.identity();
    this.flownMesh.position.set(0, 0, 0);
    this.flownMesh.quaternion.identity();
    const ringAt = this.ringMesh.userData.at as THREE.Vector3 | null;
    if (ringAt) this.ringMesh.position.copy(ringAt).sub(this.mesh.position);
    this.drawn = {
      ahead: Math.max(0, ahead.n - 1),
      flown: Math.max(0, behind.n - 1),
      ms: performance.now() - began,
      now,
      pinned: pinned ? offset : 0,
      offset,
      gap,
    };
    this.host.overlay(this.mesh);
  }

  /** Where the line ahead, as last sampled, has instant `t` in the scene's frame (the curve it was cut from): for the path test. */
  where(t: number): number[] {
    const out = new Float64Array(3);
    this.along?.(t, out, 0);
    return [...out];
  }
  private along: ((t: number, out: Float64Array, o: number) => void) | null = null;

  /** The line ahead as last sampled, in the scene's frame: for the path test (`sr.path.line()`). */
  line(): { t: number[]; p: number[]; flown: number[] } {
    return {
      t: [...this.ahead.t.subarray(0, this.ahead.n)],
      p: [...this.ahead.p.subarray(0, this.ahead.n * 3)],
      flown: [...this.behind.p.subarray(0, this.behind.n * 3)],
    };
  }

  private readonly eye = new THREE.Vector3();
  private readonly ship = new THREE.Vector3();
  private readonly axis2 = new THREE.Vector3();
  private readonly w = new THREE.Vector3();
  private readonly size = new THREE.Vector2();
  private readonly unturn = new THREE.Quaternion();
  private readonly q = new THREE.Vector3();
  private readonly clip = new THREE.Vector4();
  private chipsLaid = new Map<string, ChipOut>();
  private chipsAt = 0;

  /**
   * In the draw, once a frame, with the camera and the vehicle as this frame has them: how wide the line is on this
   * target, how far it keeps from the vehicle and from the eye, where the Earth and the vehicle are in the view's frame,
   * the ring's size, and the markers laid out on the page.
   */
  private prepare(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): void {
    const frame = renderer.info.render.frame;
    if (frame === this.drawnAt) return;
    this.drawnAt = frame;
    const first = this.camera === null;
    this.camera = camera;
    const u = this.uniforms;
    const target = renderer.getRenderTarget();
    if (target) this.size.set(target.width, target.height);
    else renderer.getDrawingBufferSize(this.size);
    renderer.getDrawingBufferSize(this.lineSize); // (the line is sampled for the canvas, whatever this draw is drawn into)
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
    const tanHalf = Math.tan((camera.fov * Math.PI) / 360) / Math.max(camera.zoom, 1e-6);
    // (just past the near plane, which stands at half the way to the nearest thing: Stage.fitDepth; and from inside the
    // vehicle, nothing within its own radius: the line is seen through the windows and never in the cabin, even while the
    // vehicle drawn is still catching up with the flight after the clock has run fast and the line starts where the
    // flight is, metres off)
    u.uClip!.value = Math.max(1.02 * camera.near, aboard && radius !== null ? radius : 0);
    u.uGap!.value = vessel === null ? 1 : this.gapOf(vessel.half, toShip, tanHalf);
    u.uPxPerRad!.value = this.size.y / 2 / tanHalf;
    // the Earth's centre and the vehicle in the view's frame, worked out in doubles
    this.unturn.copy(camera.quaternion).invert();
    (u.uCentre!.value as THREE.Vector3).copy(this.centre).sub(eye).applyQuaternion(this.unturn);
    if (vessel) (u.uShip!.value as THREE.Vector3).copy(ship).sub(eye).applyQuaternion(this.unturn);
    else (u.uShip!.value as THREE.Vector3).set(0, 0, 1e20);
    // ...and on the target: its outline as a capsule, its long axis from end to end and as broad as it is, with a margin
    // (none from inside it)
    const project = (p: THREE.Vector3, into: THREE.Vector3): THREE.Vector3 | null => {
      into.copy(p).sub(eye).applyQuaternion(this.unturn);
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
    if (first) this.wake(); // (the line is sampled for a camera: the first is known only now)
  }

  /**
   * The markers on the page: each projected, its words written, and all of them laid out together (pathmarks.ts); then
   * the chips, for those that matter now and are not in view. From the seat only the chips: nothing is laid on the line
   * over the cabin. One whose place is behind the Earth is laid on its place, dimmed.
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
    const centre = this.centre.toArray();
    const eyeAt = eye.toArray();
    const width = this.charWidth || 7;
    const pxPerRad = this.uniforms.uPxPerRad!.value as number;
    for (const m of this.marks) {
      if (m.t <= now) continue;
      const scene = m.at;
      // behind the Earth? (laid on its place all the same, dimmed: it is in view, the Earth is in front of it)
      const hidden = limbPx(eyeAt, scene.toArray(), centre, WGS84_B, pxPerRad) < 0;
      m.el.classList.toggle('behind', hidden);
      // on the target, as it is before it is divided: its way from the middle of the view holds wherever it lies, behind the eye too
      const view = this.q.copy(scene).sub(eye).applyQuaternion(this.unturn);
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
      if (!aboard && front && Math.abs(clip.x / clip.w) <= 1.5 && Math.abs(clip.y / clip.w) <= 1.5) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
        where.set(m.id, { x, y });
        ins.push({ id: m.id, x, y, rank, w, h: 18 });
      }
      // a chip for the few that matter now: the apsides ahead, the next event, where it ends
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
    // (the next apoapsis ahead, as it is marked on the line: found in the path whatever it is)
    const ap = this.marks.find((m) => m.kind === 'apogee' && m.t > now);
    set('apogee', ap ? `${ap.figure} · ${clock(ap.t - now)}` : 'passed');
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

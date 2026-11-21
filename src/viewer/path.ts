import * as THREE from 'three';
import { prefs } from '../app/prefs.ts';
import { type CraftState, hasLeft } from '../sim/craft.ts';
import { ballisticOf } from '../sim/fly.ts';
import { clockAt, eventOf } from '../sim/plan.ts';
import {
  apsides,
  type Burn,
  type Prediction,
  type Predictor,
  predictor,
  programmeAxis,
  type Sequence,
  type Start,
} from '../sim/predict.ts';
import type { Sample } from '../sim/fly.ts';
import { filled, recordOf } from '../sim/run.ts';
import type { SitedFlight } from '../types.ts';
import { moonOnEarthFlight, type Passed } from '../sim/core/gravity.ts';
import { EARTH, EARTH_ROTATION_RATE, WGS84_A, WGS84_B } from '../world/bodies.ts';
import { step } from '../world/orbit.ts';
import { type EarthFrame, frameOf } from '../world/earthframe.ts';
import { ecefToSite, ecefToSiteDirection, type Site, siteFrame, type Vec3 } from '../world/frames.ts';
import { absolute, uOrigin } from './origin.ts';
import { cloudAheadGlsl, sceneDepthGlsl, uDepthRange, uLast, uSceneDepth } from './overlay.ts';
import {
  type Curve,
  curveAt,
  curveOf,
  pieceOf,
  DEPTH_DIM,
  DEPTH_LEAST,
  DEPTH_THIN,
  departure,
  drawnIn,
  carried,
  limbPx,
  overHorizon,
  type Ribbon,
  ribbon,
  type Sweep,
  sample,
  slope,
  sweepOf,
  tailOf,
  turnsPast,
} from './pathline.ts';
import {
  type Box,
  type ChipIn,
  type ChipOut,
  type Clear,
  crossFade,
  GLYPH,
  layMarks,
  layWords,
  type MarkIn,
  type MarkOut,
  unseen,
  type Words,
} from './pathmarks.ts';
import {
  apsesOf,
  REF_AIR,
  REF_BACK,
  REF_EVERY,
  REF_KNOTS,
  type RefMark,
  type RefSample,
  recordMarks,
  referenceCurve,
  windowOf,
} from './pathref.ts';
import type { MapOf } from './camera/rig.ts';
import { esc } from '../util/dom.ts';
import { capsOf, is, isTyping, modified } from '../util/keys.ts';
import { Scope } from '../util/scope.ts';
import { disposeTree } from './dispose.ts';

/**
 * The predicted path, drawn: where the vehicle goes from here if nothing more is done (sim/predict.ts, or the deck's own
 * predictor: one `Predictor` and one `Prediction` whichever made it), as a line ahead of it with what falls out of the
 * prediction marked on it; and, from far out only and in a quiet grey of its own, the line it has flown. Nothing here
 * knows a flight, a programme or what kind of path it is given: every rule below is one of the screen or of the path's
 * own motion, the same for a lob, an ascent, an orbit, a fall.
 *
 * - **A curve, sampled for the screen** (pathline.ts). The prediction is kept as its instants with a place and a
 *   velocity at each, and between them the cubic those fix; each frame the stretch from the vehicle to the end is cut
 *   into chords until none strays more than `ERROR_PX` from the curve as seen from the eye. So the line is as fine as
 *   the view needs wherever the camera is (close by, it follows the curve to the vehicle; from far out an orbit
 *   reads as an ellipse), however coarsely the predictor kept it, and the chords stay put as the clock goes on.
 * - **From the vehicle, ahead of it, never behind it.** The line starts at the instant on the path nearest the vehicle
 *   as the stage draws it, whatever the age of the prediction under it, and is taken onto the vehicle there (the vehicle
 *   drawn and the flight differ by the stage's interpolation): the offset is let go over the next ten reaches of the
 *   line, or a hundred times the offset (under a degree of bend), whichever is longer. A path further than two reaches
 *   (`reachOf`) and `PIN_FAR` from the vehicle is another path and is drawn where it is. An orbit the clock has outrun (hours a
 *   second, on rails) before a prediction from where the vehicle is can be made is drawn from the same curve whole
 *   turns on (pathline.ts `turnsPast`), and taken onto the vehicle however far off its slow turn has left it. A path
 *   once round comes back to where it began, which is behind the vehicle: its line stops short of that by the angle
 *   beyond both horizons and `TAIL_SHORT` (`endOf`, pathline.ts `tailOf`), turned round from where the vehicle is now,
 *   so nothing near the vehicle sees its end, and goes out over `TAIL_FADE` before it. No end of it is cut square: one
 *   cut off by its horizon of time goes out over its last stretch, and only one that meets the ground (with its ring)
 *   ends there.
 * - **Clear of the vehicle.** Nothing of the line within a gap of the vehicle's middle (a little more than half its
 *   length, and `GAP_PX`), then it comes in from nothing over `FADE_LENGTHS` of the vehicle's length, or `FADE_PX` as
 *   seen at the vehicle where it is small (pathline.ts: `fadeIn`): a rule of the screen, the same at every zoom, so the
 *   line is seen to leave the vehicle and is never a hole round it; and on the screen nothing within the vehicle's
 *   outline, taken as a capsule along its long axis as broad as it is, and a margin.
 *   From inside the vehicle (on board) the outline is off and the cabin's own walls hide the line: it is seen through
 *   the windows, and no marker is laid over the cabin.
 * - **The line flown is not the path.** From near the vehicle it is not drawn at all: a line behind the vehicle is read
 *   as the way it goes, whatever it is drawn in. From `FLOWN_NEAR` out it comes in, all of it from `FLOWN_FAR` (the
 *   whole flight seen from space): a thin cool grey core with no casing or glow, at half strength, the last revolution
 *   or so of the flight (`FLOWN_SPAN`), its far end coming in from nothing, carried to the vehicle along the line ahead;
 *   the path's figures name it while it is drawn.
 * - **A width on the screen, not in the world, and narrower with depth**: each chord is a quad pushed out across its
 *   own direction on the screen (from both its ends as projected, never from a direction in the world, which near the
 *   eye or along the line of sight projects to anything), mitred to the next at each join, a core of `CORE` CSS pixels
 *   each side with a pixel's soft edge, a thin dark casing (what reads against bright sky, cloud and sea) and a glow
 *   to `HALF` (what reads against black); in the cel look a flat core with an ink edge. That is what it is at the
 *   vehicle. The deeper into the view it goes (pathline.ts `depthOf`: by the logarithm of the distance, from the
 *   vehicle's to the furthest of the line) the narrower and fainter it is drawn, to `DEPTH_THIN` of the width and
 *   `DEPTH_DIM` of the strength, so the curve has depth: what is far is seen to be far, and a path seen from near its
 *   own plane no longer reads as a line that turns square into the horizon. Its core is never under a pixel across: a
 *   line too thin to cover a pixel breaks into dots.
 * - **Never at the eye**: each chord is cut where it crosses a plane just in front of the near plane and nothing behind
 *   that plane is drawn (pathline.ts `clipNear`: no vertex is ever behind the eye, where a ribbon turns inside out
 *   across the screen); the line fades in over the next doubling of the distance from the eye, so where it passes the
 *   camera it is seen leaving, not cut. From inside the vehicle nothing within its radius of the eye is drawn, so the
 *   line is seen through the windows even while the vehicle drawn catches up with the flight after the clock has run fast.
 * - **Hidden by what is in front of it, and by nothing behind it**: drawn over the finished frame (overlay.ts
 *   `drawLast`: after the fire and smoke, the clouds, the air and the glow), tested against the scene's depth in its own
 *   fragment shader and writing none, a hundredth of the way nearer than it is (so the sea it comes down to does not
 *   hide its end), and covered by as much of the clouds' march as lies in front of it. (Drawn under the clouds, as it
 *   was, the clouds' composite cut the cloud behind it by as much as it let through, and its faint glow and edge over
 *   cloud let the ground under the cloud through in dashes; drawn with the scene, it lay under the smoke behind it.) The
 *   Earth hides it by its ellipsoid, tested for every pixel of the ribbon (pathline.ts `limbPx`), faded over the pixel
 *   and a half before the limb, so where the line goes behind the limb it ends at the limb, cleanly however it grazes
 *   it, and a line that comes down to the ground there is gone before the globe's own depth can cut it in steps. The
 *   ellipsoid is the globe's (WGS 84): a point on the ground seen from above is never behind it.
 * - **Still when nothing changes, eased when it does**: a new prediction is eased in from where the last one had each
 *   instant over `EASE` seconds; a prediction made again of the same flight lies on the same curve, so nothing moves.
 * - **With the flight between predictions**: under thrust the flight leaves the curve on show at once, and the next
 *   prediction is a third of a second off. Each frame the curve on show (and the one it is eased from) is drawn carried
 *   with the flight (pathline.ts `departure`, `carried`: moved by how far the flight has left it, and by how much faster
 *   it goes for every second on, which is where a coast from the flight lies to the first order), its markers and ring
 *   with it. So the line goes on with the vehicle and does not stand and lunge with each prediction, which from the
 *   chase view was the line shaking along itself. A path flown under guidance is held to its programme and not carried.
 *   That holds to the first order only: a flight that has left a coast on show by more than `PIN_FAR` (a burn the clock
 *   ran through within a frame at hours a second, the injection to the Moon) is on another path, and the curve carried
 *   with it would bend as the old orbit does, not as its own: that curve goes, and nothing is drawn ahead until the next
 *   prediction has been made (`leftBy`).
 * - **The record's flight is there from the pad** (pathref.ts): the run the record itself makes of the flight, as a
 *   line of reference beside the two above, whatever is or is not predicted: thin, dashed, in a colour of its own
 *   (`plan`: the magenta a flight plan's course is drawn in), cased in ink and with no glow. It is the record's and
 *   nothing of the live flight moves it. Drawn in the frame the prediction on show is drawn in (so the two can be laid
 *   against each other), over the turning ground with none; from a little behind the instant on show (that part from
 *   far out only, as the line flown) to where the record ends or has gone once round (`windowOf`); its dashes are so
 *   many pixels long wherever they are seen from (`REF_DASH`: cut in the record's own seconds, a power of two of them
 *   chosen for each pixel and faded into the next, so they stand in the world and never crawl along it); and its key
 *   events marked under everything of the prediction's (`recordMarks`: staging, cutoff, a burn, retrofire, its highest
 *   point ahead, where it came down). It follows the path's switch, and is drawn on the map whatever that says.
 * - **Drawn from the eye** (origin.ts): points are kept in doubles and given to the GPU as offsets from the vehicle,
 *   where the mesh stands; what the fragment shader tests (the limb, the eye, the vehicle) is given it in the view's
 *   own frame, worked out in doubles.
 *
 * Which frame a path is drawn in follows from the path (`frameFor`), never from a flight or a phase of one. One that comes
 * down before the Earth has turned far under it (pathline.ts `WOUND`) is drawn over the ground, where it comes down. Any other is
 * drawn in the navball's frame, but as it lies among the stars on the map, and wherever it reaches beyond the
 * stationary radius (`STATIONARY`): out there the ground turns under a path faster than the path goes round, and a
 * line drawn over the ground is the Earth's turning, a spiral, not the path (a path to the Moon drawn so was three
 * rings round the Earth). The record's line drawn over the ground stops at that radius for the same reason
 * (`layRef`). On the map from far enough out the Moon is marked where it is, to scale, and where the path on show
 * passes it (sim/predict.ts `Pass`) the passing is marked on the line, with the Moon's way from now to then and its
 * outline where it will be (`layBodies`).
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

/** The most chords of the line ahead and of the line flown; the most points of the line flown kept, and the most of the flight they go back over, s. */
const MOST = 4096;
const FLOWN_MOST = 2048;
const FLOWN = 1024;
/** (a revolution of a low orbit and a little more: a flight of days is not kept whole, so its points stay close enough to draw it as a curve) */
const FLOWN_SPAN = 6000;
/** Seconds between the points taken into the line flown where the run let go of its own in a quiet coast (sim/rails.ts): a coast's long step. */
const FLOWN_EVERY = 10;
/** A run's sample as the line flown takes it: with its velocity and the stretch it begins, where the run kept only that stretch's ends. */
type Tracked = { t: number; r: Vec3; centre?: Vec3; v?: Vec3; rails?: Sample['rails'] };
/** The most chords of the record's line; half its core, CSS pixels; how much of it is drawn; and a dash and its gap together, CSS pixels (about: the shader says how). */
const REF_MOST = 1024;
const REF_CORE = 0.9;
const REF_OPACITY = 0.85;
const REF_DASH = 14;
/** The record's line is sampled between instants on this grid, s (so it is not sampled again as the instant on show moves on), and its seconds are counted from a multiple of `REF_ZERO` (single precision on the GPU; a power of two, so the dashes do not shift when it changes). */
const REF_GRID = 64;
const REF_ZERO = 4096;
/** Milliseconds of prediction worked in one frame, and the least time between one prediction's end and the next's beginning. */
const SLICE = 1.5;
const EVERY = 200;
/** Half the line's core and half the ribbon with its glow, CSS pixels; the flown line's core. */
const CORE = 1.3;
const HALF = 5;
const FLOWN_CORE = 0.6;
/** How much of the line flown is drawn, at most: it is where the vehicle has been, read only from far out, and never mistaken for the way ahead. */
const FLOWN_OPACITY = 0.55;
/**
 * The line flown is not drawn from near the vehicle (a line behind it reads as the path, whatever its colour): from the
 * eye this far from the vehicle, m, it comes in, and all of it from this far (the whole flight seen from space).
 */
const FLOWN_NEAR = 300_000;
const FLOWN_FAR = 1_500_000;
/** How long the line flown's far end takes to come in, s, at most (it is cut where the flight's kept points begin). */
const FLOWN_LEAD = 600;
/** Seconds a new prediction is eased in over; how old the one on show may be, while a newer one is wanted, before it is said to be stale. */
const EASE = 0.3;
const STALE = 1.5;
/** Points round the ring where it comes down, and its radius on the screen, CSS pixels. */
const RING = 48;
const RING_PX = 9;
/** Seconds a chip at the edge fades in or out over. */
const CHIP_FADE = 0.2;
/**
 * The clearance at the vehicle (`gapOf`, `fadeOf`): nothing of the line within a little more than half the vehicle's
 * length and `GAP_PX` more, then it comes in from nothing over `FADE_LENGTHS` of the vehicle's length, or `FADE_PX`
 * where the vehicle is small: a rule of the screen, the same at every zoom, so the line is seen to leave the vehicle
 * and never as a hole round it.
 */
const GAP_PX = 3;
const FADE_PX = 40;
const FADE_LENGTHS = 1;
/**
 * A path drawn once round comes back to where it began, behind the vehicle. Its line stops short of that, by the angle
 * round the Earth beyond which nothing near the vehicle can see it (the vehicle's horizon and the path's own: pathline.ts
 * `overHorizon`) and `TAIL_SHORT` more, and goes out over the `TAIL_FADE` before that (radians). So from beside the
 * vehicle the line is never seen behind it, and from far out the orbit is seen to go most of the way round and fade.
 */
const TAIL_SHORT = (12 * Math.PI) / 180;
const TAIL_FADE = (30 * Math.PI) / 180;
/** And a path cut off by its horizon of time (`limit`) goes out over its last this much of the time ahead, at most `LIMIT_FADE_MOST` s. */
const LIMIT_FADE = 0.08;
const LIMIT_FADE_MOST = 900;
/**
 * Reaches of the line (`reachOf`): within this many of the vehicle, or `PIN_FAR` m, it is taken onto the vehicle (a
 * prediction made from an earlier state, the clock running fast, lies off it by as much as the physics of the two differ
 * over the time between); over this many the offset is let go.
 */
const PIN_WITHIN = 2;
const PIN_FAR = 20_000;
const PIN_OVER = 10;
/** And over at least this many times the offset itself: so taking it onto the vehicle bends the line by under a degree. */
const PIN_SLOPE = 100;
/**
 * The curve on show stands while a new prediction would not move it on the screen (`holds`): by more than `MOVE_PX`
 * anywhere it is drawn, it passes within a metre of the flight (where the line starts), and, for a path that comes
 * round, while it still reaches nineteen twentieths of the way round ahead. With no view yet, within a metre and a
 * centimetre a second.
 */
const MOVE_PX = 0.5;
const HOLD_M = 1;
const HOLD_MS = 0.01;
const HOLD_ROUND = 0.95;
/** How fast a coast's departure from a curve grows, times its difference in velocity: an orbit's along its track, 3 dv t, the fastest. */
const GROWTH = 3;

/** How deep in the view a point is, 0 to 1 (pathline.ts `depthOf`): `uDepth` is the nearest the depth counts from, m, and one over the logarithm of the span it is measured over. */
const DEPTH = /* glsl */ `
  uniform vec2 uDepth;
  float depthOf(float d) { return clamp(log(max(d, uDepth.x) / uDepth.x) * uDepth.y, 0.0, 1.0); }`;

const VERT = /* glsl */ `
  #include <common>
  ${DEPTH}
  attribute vec3 aOther;      // the chord's other end
  attribute vec3 aBeyond;     // the point past this end along the line (this end again at an open end)
  attribute float aSide;      // -1 or 1: which edge of the ribbon
  attribute float aEnd;       // 0 at the chord's start, 1 at its end
  attribute float aT;         // seconds from the line's zero
  uniform vec2 uView;         // the target's size, pixels
  uniform float uHalf;        // half the ribbon's width, pixels
  uniform float uClip;        // nothing nearer the eye than this plane is drawn, m (just past the near plane)
  uniform float uRing;        // the ring's radius, m
  uniform float uThin;        // how wide the line is where it is deepest in the view, of its width at the vehicle
  varying float vSide, vT, vWide;
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
    if (behind && o.z > -uClip) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); vView = vec3(0.0); vWide = 1.0; return; }
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
    // narrower the deeper in the view it is (pathline.ts depthOf): what is far is seen to be far
    vWide = mix(1.0, uThin, depthOf(length(s)));
    // its depth a hundredth nearer than it is (the same place on the screen), and never past the far plane
    vec4 clip = projectionMatrix * vec4(s * 0.99, 1.0);
    clip.xy += normal * aSide * stretch * vWide * uHalf / uView * 2.0 * clip.w;
    clip.z = min(clip.z, clip.w * 0.99999);
    gl_Position = clip;
  }`;

const FRAG = /* glsl */ `
  #include <common>
  ${sceneDepthGlsl}
  ${cloudAheadGlsl}
  ${DEPTH}
  uniform vec3 uColour, uInk;
  uniform float uCut, uOpacity, uCel, uCore, uHalf, uClip, uGap, uFade, uRatio, uDim;
  uniform float uBehind;      // how much of the line is drawn where the Earth is in front of it (0: none; the map draws it faintly)
  uniform vec3 uRef;          // the record's line: the instant on show (seconds from the line's zero), how much of what is before it is drawn, and a dash and its gap, pixels
  uniform vec4 uEnds;         // its ends, in seconds from the line's zero: it comes in from x over y, and goes out by z over w (no fade where y or w is 0)
  uniform vec3 uShip;         // the vehicle's middle in the view's frame
  uniform vec4 uShipSeg;      // and on the target: its long axis from end to end, pixels
  uniform float uShipW;       // and how far round that the line keeps off, pixels (0: not at all)
  uniform vec3 uCentre;       // the Earth's centre in the view's frame
  uniform vec3 uPole;         // and its axis, north
  uniform float uRadius;      // the ellipsoid that hides the line: its equator's radius, m
  uniform float uStretch;     // and how much longer than its polar radius that is (a/b - 1)
  uniform float uPxPerRad;    // pixels to a radian of the view
  uniform vec2 uView;         // the target's size, pixels
  varying float vSide, vT, vWide;
  varying vec3 vView;
  void main() {
    float eye = length(vView);
    // behind the Earth: the ray from the eye to here passes inside its ellipsoid first (by how many pixels: pathline.ts
    // limbPx; stretched along the pole, it is a sphere), faded over the pixel and a half before the limb, so a line that
    // goes down behind it, to the ground, has gone before the globe's own depth, which is nearer by only the 1 % the
    // line is drawn nearer by where the ray grazes it, can cut it as a step or a speckle
    vec3 e = -uCentre + uPole * dot(-uCentre, uPole) * uStretch;
    vec3 f = vView + uPole * dot(vView, uPole) * uStretch;
    float k = -dot(e, f) / max(dot(f, f), 1e-6);
    float seen = k > 0.0 && k < 1.0 ? smoothstep(0.0, 1.4, (length(e + f * k) - uRadius) / max(length(f) * k, 1e-3) * uPxPerRad) : 1.0;
    // behind what the scene has drawn (the vehicle, the ground, the cabin's walls): a hundredth nearer than it is, so the
    // sea it comes down to does not hide its end (overlay.ts: the finished frame it is drawn over has no depth of its own).
    // (In the map what the Earth hides is drawn faintly, uBehind: there the Earth's own depth is not asked.)
  #ifdef REF
    // (the record's line stands on the pad before anything flies, through the vehicle from its middle, and no gap round a
    // vehicle keeps it off one that is not flying: so it is nearer than it is by five centimetres at most, and what is in
    // front of it, the vehicle's own skin, hides it)
    if ((uBehind <= 0.0 || seen >= 1.0) && behindScene(-vView.z * (1.0 - min(0.01, 0.05 / max(eye, 1e-3))), uView)) discard;
  #else
    if ((uBehind <= 0.0 || seen >= 1.0) && behindScene(-vView.z * 0.99, uView)) discard;
  #endif
    // (the ribbon is narrower the deeper it is, and its core with it: never under a pixel across, which breaks into dots)
    float ribbonHalf = uHalf * vWide;
    float px = abs(vSide) * ribbonHalf;
    float c = max(uCore * vWide, 0.6 * uRatio);
    vec3 colour = uColour;
    float a;
  #ifdef FLOWN
    // the line flown: a thin pale core and nothing round it, so it is never read as the line ahead
    a = 1.0 - smoothstep(c - 0.6, c + 0.6, px);
  #else
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
      float g = max(0.0, 1.0 - px / ribbonHalf);
  #ifdef REF
      float glow = 0.0;                                                 // the record's line: a core in its casing, and no glow
  #else
      float glow = 0.3 * g * g;
  #endif
      vec3 under = uInk * rim + uColour * glow * (1.0 - rim);
      float behind = rim + glow * (1.0 - rim);
      a = body + behind * (1.0 - body);
      colour = (uColour * body + under * (1.0 - body)) / max(a, 1e-4);
    }
  #endif
  #ifndef RING
    // its ends: never a square cut (a path cut off by its horizon, an orbit stopped short of coming round, where the flown line's points begin)
    if (uEnds.y > 0.0) a *= smoothstep(uEnds.x, uEnds.x + uEnds.y, vT);
    if (uEnds.w > 0.0) a *= 1.0 - smoothstep(uEnds.z - uEnds.w, uEnds.z, vT);
    // clear of the vehicle: along the line in the scene, coming in from nothing over a span that is so many pixels at the
    // vehicle (pathline.ts fadeIn); and on the screen, outside its ring
    float d = distance(vView, uShip);
    float x = clamp(0.631 * log2(1.0 + 2.0 * max(d - uGap, 0.0) / max(uFade, 1e-6)), 0.0, 1.0);
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
    // fainter the deeper in the view it is, as it is narrower
    a *= mix(1.0, uDim, depthOf(eye));
    a *= mix(uBehind, 1.0, seen);
  #ifdef REF
    {
      // dashes, so many pixels long wherever they are seen from: cut in the record's own seconds, so they stand in the
      // world and do not crawl along the line as the eye moves; the period a power of two of seconds, the one that is
      // uRef.z pixels here or the next under it, faded into the one over it (so a dash and the gap after it become one
      // dash as the line goes away, and no dash is ever cut or leaps), each edge soft over a pixel
      float perPx = max(fwidth(vT), 1e-7);
      float level = log2(uRef.z * perPx);
      float period = exp2(floor(level));
      float soft = perPx / period;
      float p0 = fract(vT / period), p1 = fract(0.5 * vT / period);
      float d0 = smoothstep(0.0, soft, p0) * (1.0 - smoothstep(0.5, 0.5 + soft, p0));
      float d1 = smoothstep(0.0, 0.5 * soft, p1) * (1.0 - smoothstep(0.5, 0.5 + 0.5 * soft, p1));
      a *= mix(d0, d1, smoothstep(0.0, 1.0, fract(level)));
      // what the flight has passed: only from far out, as the line flown
      a *= mix(uRef.y, 1.0, smoothstep(uRef.x - 4.0 * perPx, uRef.x, vT));
    }
  #endif
  #if !defined(FLOWN) && !defined(RING) && !defined(REF)
    if (vT < uCut) {
      float dash = fract(vT / 3.0);                                     // under power: dashes, three seconds of flight each
      a *= mix(0.25, 1.0, smoothstep(0.0, 0.04, dash) * (1.0 - smoothstep(0.6, 0.64, dash)));
    }
  #endif
    // under the cloud in front of it, by as much as that cloud is opaque (overlay.ts: it is drawn over the finished frame)
    a *= uOpacity * (1.0 - cloudAhead(gl_FragCoord.xy / uView, eye));
    if (a < 0.004) discard;
    gl_FragColor = vec4(colour, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
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
  /**
   * Be told in each frame drawn, with the camera and the vehicle where that frame has them, before it is drawn (Stage.beforeDraw):
   * the line is laid out for the frame it is drawn in. Returns what lets it go.
   */
  beforeDraw?(fn: () => void): () => void;
  /**
   * The view is the map (camera/map.ts): the path is drawn whatever its switch says, an orbit whole and as it lies among
   * the stars, what the Earth hides faintly, the line flown from any distance, with the vehicle and what else flies marked.
   */
  map?(): boolean;
  /** Go to the map, or back from it to the view it was taken from (M). */
  setMap?(on: boolean): void;
  /** What the flown vehicle is called on the map. */
  readonly craftName?: string;
  /** What else flies in the run at the instant on show (viewer/ascent.ts `others`), and where one of them was at an instant before it (`otherAt`). */
  others?(): readonly OtherCraft[];
  otherAt?(drop: number, t: number): { r: Vec3; v: Vec3 } | null;
  /** How far the Moon itself is drawn over the sky where it is (viewer/flightmoon.ts `covers`, 0 to 1): its outline on the map gives way to it. */
  moonCovers?(): number;
}

/** Something else that flies in the run (a stage let go, the flight's target): which drop of the flight's it is, its name, when it left, and its state in the frame that does not turn. */
export interface OtherCraft {
  drop: number;
  name: string;
  from: number;
  r: Vec3;
  v: Vec3;
  down: boolean;
}

/** A sample of the flight as the flight deck shows it (sim/vehicle.ts: LiveSample), and the live state it came from, or null when looking back. */
export interface PathSample {
  t: number;
  r: Vec3;
  v: Vec3;
  mass: number;
  /** What it is doing (sim/fly.ts `Doing`), as the predictor starts from it (sim/predict.ts `Start`). */
  riding: boolean;
  escaping: boolean;
  out: string | null;
  landed: boolean;
  /** Where the vehicle is drawn from, where that is not `r` (a spacecraft's centre of mass, on the stack or alone): the line flown and the map take it. */
  centre?: Vec3;
  /**
   * The point its simulator flies, where that is neither `centre` nor `r` would say: on a launch vehicle the stack's own
   * (its datum, `r`), which the stack's forces move, while it is drawn from the spacecraft's centre up its axis. The
   * prediction starts from it and is held to it (`fliesOf`), so the path is the live state's own future.
   */
  flies?: Vec3;
  /** The long axis (the body's +X) in the frame, where the sample says how it lies. */
  axis?: Vec3;
  /** The parachute out, as the live state has it (filling, or torn). */
  chute?: { full: number; was: number; at: number; fills: number };
}
/** What of the live state (sim/vehicle.ts: VehicleState) the path reads: what is lit and done, and the machine's state (what has left). */
export interface PathLive {
  ignited: boolean;
  cutoff: boolean;
  abortAt?: number | null;
  retroAt?: number | null;
  craft?: CraftState;
}
export interface PathSource {
  readonly active: boolean;
  /** The vehicle's programme and launch axes (sim/vehicle.ts: Vehicle), and how it is being flown. */
  readonly craft: { programme(t: number): Vec3; launch: { downrange: Vec3; left: Vec3 } } | null;
  readonly steering: { guidance: boolean; sequence?: boolean; trim: { pitch: number; yaw: number } };
  listen(fn: (sample: PathSample, live: PathLive | null) => void): void;
  /**
   * A flight whose plan is not ballistic (one into orbit: orbitdeck.ts) predicts its own path from a sample, with whatever its
   * deck has planned, in at most `points` points, and says what that plan is (`plan`: when it changes, the path is made
   * again) and, while engines burn, which future it shows (`pathAs`).
   */
  predict?(start: Start, points: number, guided?: boolean): Predictor | null;
  /** Whether that deck can show the future under guidance now (its engines burn under guidance with a cutoff to come): K chooses it. */
  readonly guidable?: boolean;
  readonly plan?: string;
  readonly pathAs?: { short: string; long: string } | null;
  /**
   * A flight whose deck flies a run of its own and hands on no live state (orbitdeck.ts): the run's own samples from its
   * start, in order of time, at least through `until` (the instant on show: none later is read), from which the line
   * flown is drawn. Without it the line flown is gathered from the samples heard with live state; either way it is kept
   * and drawn by the one rule (`keep`, `flownNow`).
   */
  track?(until: number): readonly { t: number; r: Vec3; centre?: Vec3 }[];
  /**
   * The flight as it was meant to be flown: the record's own run from its start to its end, its samples in order of time
   * and in the form `track` gives the line flown in (a sample that has its velocity, `v`, is laid by it). The line of
   * reference is drawn from it (pathref.ts): the same array each time it is asked while the run is the same one, for the
   * line is made again whenever it is given another. Without it the path asks the simulator for the record's run itself
   * (sim/run.ts `recordOf`, made once a flight), which is the same run.
   */
  intended?(): readonly RefSample[];
}

/** The point a sample's simulator flies (`PathSample.flies`), which the path predicts from and holds to. */
const fliesOf = (s: PathSample): Vec3 => s.flies ?? s.centre ?? s.r;

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
  burnout: ['Burnout', 36],
  retropack: ['Pack jett', 38],
  entry: ['0.05 g', 50],
  peak: ['Max', 54],
  drogue: ['Drogue', 48],
  main: ['Main', 52],
  // (the nearest it comes to another body, named by that body: the Moon)
  pass: ['', 97],
  // (on the map: the vehicle itself, and each other thing that flies; their words are their names)
  craft: ['', 130],
  other: ['', 30],
  // (and another body where it is: the Moon)
  body: ['', 90],
  // (the record's own events, on its line: under everything of the prediction's, so where the two meet the prediction's is the one read)
  ref: ['', 20],
} as const satisfies Record<string, readonly [string, number]>;
type Kind = keyof typeof KINDS;
const NEXT = 25;
/** What each mark of the record's line is called on it (pathref.ts `RefKind`), and its highest point; and how much each matters among them (as the prediction's own of the same kind among its: pathmarks.ts offers fewer the smaller the line is on the screen). */
const REF_WORDS = { staging: 'Staging', cutoff: 'Cutoff', retro: 'Retrofire', burn: 'Burn', down: 'Down', apogee: 'Ap' } as const;
const REF_RANK = { staging: 46, cutoff: 62, retro: 58, burn: 36, down: 95, apogee: 100 } as const;

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
  /** A mark of the record's line: what it is called and how much it matters among them, and whether it is outside what of that line is drawn now (then it is not laid out). */
  name?: string;
  rank?: number;
  off?: boolean;
}

/**
 * The record's run as the line of reference: its curve (pathref.ts `referenceCurve`), how far round it has gone at each
 * point and the furthest it gets from the Earth's centre, its marks' instants and its highest points', and the samples
 * it was made from (made again if they are others).
 */
interface Reference {
  of: readonly RefSample[];
  n: number;
  curve: Curve;
  sweep: Sweep;
  top: number;
  marks: readonly RefMark[];
  apses: readonly number[];
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
  /** How far it had come from the one before when a newer one began to ease from it: it stays there. */
  held?: number;
  /**
   * The piece of the curve last asked for (pathline.ts `curveAt`'s hint): the line is sampled along it in order of time,
   * so each place is found from the last in a step or two. (Found from the first piece each time, as it was, a line of a
   * few thousand chords over a curve of a few thousand points took tens of milliseconds a frame on a phone.)
   */
  hint: number;
  /** How far round the Earth the curve has gone at each of its points, and the greatest distance from the Earth's centre it reaches (for where an orbit's line stops: `endOf`), once asked. */
  sweep?: Sweep;
  top?: number;
  /**
   * How far the flight on show has left this curve (pathline.ts `departure`: its place's part, then its velocity's), and
   * the instant that was measured at: the curve is drawn carried with the flight by that much (`alongAt`), so under
   * thrust the line goes with the vehicle from one prediction to the next. All zero while the flight keeps to the curve.
   */
  left: Float64Array;
  leftAt: number;
}

/** A line's buffers on the GPU and in doubles: the ribbon's, and the points it was last sampled at (scene frame). */
interface Line {
  geometry: THREE.BufferGeometry;
  buf: Ribbon;
  t: Float64Array;
  p: Float64Array;
  n: number;
}

/** Something else that flies, on the map: its line (the way it came, and from above the air the way it goes), its marker, and when its line was last made and cut. */
interface Other {
  line: Line;
  mesh: THREE.Mesh;
  curve: Curve | null;
  /** Whether the way it goes ends where it comes down into the air (cut there), not at the end of what is looked ahead (where it goes out). */
  lands: boolean;
  /** The flight's instant the curve was made at and the wall's. */
  at: number;
  made: number;
  /**
   * Its chords as last cut: the wall's instant, the flight's, the eye they were cut for, the frame they are in and the
   * place they are measured from. Cut again when the eye has moved or the curve is another, a few times a second at most.
   */
  cut: number;
  cutAt: number;
  cutFor: [number, number, number];
  cutIn: 'surface' | 'orbit';
  anchor: [number, number, number];
  mark: Mark;
}
/** The most chords of another body's line, the points its way here is kept as, and the most steps of its way on. */
const OTHER_MOST = 768;
const OTHER_KEPT = 96;
const OTHER_STEPS = 720;
/** Seconds between two of those steps; the least time between two makings of its line and between two cuttings of it, ms. */
const OTHER_STEP = 10;
const OTHER_EVERY = 500;
const OTHER_CUT = 120;
/**
 * The height, m, above which another body's way on is drawn as a coast under gravity alone, and at which that line stops
 * coming down: under it the air decides where a spent stage goes within minutes, which is its own flight's to say
 * (sim/shed.ts) and is not predicted here; over it the air takes an orbit down over revolutions, which the one
 * revolution drawn does not show. Estimated: chosen as the height a spent stage's orbit does not outlast a revolution from.
 */
const OTHER_AIR = 120_000;
/**
 * On the map the Earth's outline is drawn, a thin line round its limb as the eye sees it: its night side is black on a
 * black sky, and an orbit over it then reads as a line hung in space beside a crescent. So many points round, this far
 * over the ellipsoid's equatorial radius (m: clear of the limb by a pixel from where the whole Earth is seen), this strong.
 */
const LIMB = 128;
const LIMB_OVER = 40_000;
const LIMB_OPACITY = 0.5;
const limbColour = new THREE.Color(0x6f86a6);
/** How much of what the Earth hides is drawn on the map. */
const BEHIND = 0.3;
/**
 * The radius of the stationary orbit, m: where something going round the Earth keeps pace with the ground under it,
 * (GM / w^2)^(1/3) from the Earth's GM and its rate of turning (derived: 42,164 km). Beyond it the ground turns under
 * a path faster than the path goes round, so a line drawn over the turning ground is wound round the Earth by the
 * Earth's own turning and says nothing of where the path goes: there a path is drawn as it lies among the stars.
 */
export const STATIONARY = (EARTH.gm.value / EARTH_ROTATION_RATE ** 2) ** (1 / 3);
/**
 * Another body (the Moon) is marked on the map from where the eye is this far from the Earth's centre, as a part of
 * that body's own distance, coming in up to the second figure: nearer in, the map is of the Earth and what goes round
 * it, and the Moon is a direction, not a place on it. Estimated.
 */
const BODY_FROM = 0.3;
const BODY_FULL = 0.4;
/** The points round its outline, the most chords of its way to where the path passes it and the points that way is kept as, and how strong its lines are. */
const BODY_RING = 96;
const BODY_MOST = 256;
const BODY_KNOTS = 48;
const BODY_OPACITY = 0.7;
/** The Moon's line and outline: the pale grey of its own ground, nothing like the amber, the blue-white of what flies, or the Earth's outline. */
const moonGrey = new THREE.Color(0xd9d6cc);

/**
 * Another body on the map (the Moon): its marker where it is now and its outline there, to scale; and, where the path
 * on show passes it, its way from now to then and its outline where it will be. `key` is what its lines were last
 * laid for (the eye, the instant, the frame, the passing).
 */
interface Heavenly {
  body: Passed;
  mark: Mark;
  disc: Line;
  discMesh: THREE.Mesh;
  discAt: [number, number, number];
  meet: Line;
  meetMesh: THREE.Mesh;
  meetAt: [number, number, number];
  way: Line;
  wayMesh: THREE.Mesh;
  wayAt: [number, number, number];
  key: number[];
  strength: number;
  /** How much of its outline where it is now gives way to the body drawn there (the flight scene's Moon, once it is a disc of a few pixels). */
  drawn: number;
}

const UP = new THREE.Vector3(0, 1, 0);
const RIGHT = new THREE.Vector3(1, 0, 0);
const ink = new THREE.Color(0x0a0b0e);
/** The line of something else that flies: a cool blue-white, nothing like the amber of the way ahead nor the grey of the way it came. */
const other = new THREE.Color(0x9cc9e6);
const amber = new THREE.Color(0xffc46b);
/** The line flown: a cool grey, nothing like the amber of the way ahead (and the key beside the navball draws it so: navball.css). */
const pale = new THREE.Color(0x8e9cab);
/** The record's line: the magenta a flight plan's course is drawn in on a navigation display, nothing like the amber, the grey, the blue-white or anything of the Earth under it (navball.css draws its key and its marks so). */
const plan = new THREE.Color(0xf08bd2);

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
  /** The Earth's outline, on the map (`LIMB`). */
  private readonly limbMesh: THREE.Mesh;
  private readonly limb = ribbonGeometry(LIMB);
  private readonly ahead = ribbonGeometry(MOST);
  private readonly behind = ribbonGeometry(FLOWN_MOST);
  /** The record's line (pathref.ts): its ribbon, its mesh, and the record as a curve once it has been asked for. */
  private readonly intended = ribbonGeometry(REF_MOST);
  private readonly refMesh: THREE.Mesh;
  private ref: Reference | null = null;
  private refMarks: Mark[] = [];
  private refApsis: Mark | null = null;
  /** What the record's line was last sampled for, the place its points are measured from, and what of it is drawn (`layRef`). */
  private readonly refKey = new Float64Array(12).fill(Number.NaN);
  private refAnchor: [number, number, number] = [0, 0, 0];
  private refAlong: ((t: number, out: Float64Array, o: number) => void) | null = null;
  /** The record's line as last laid, for whoever asks (`sr.path.drawnRef`, the path test): its chords, what sampling them took, the stretch of the record drawn (s from liftoff) and the frame it is drawn in. */
  drawnRef = { chords: 0, ms: 0, from: 0, to: 0, frame: 'surface' as 'surface' | 'orbit', marks: 0 };
  /** Whether anything is drawn with no prediction on show (the line flown, the record's line, the map's own): `place`. */
  private bare = false;
  /** The line flown: instants and places in the frame that does not turn, as heard from the flight deck. */
  private readonly flown = { t: new Float64Array(FLOWN), r: new Float64Array(FLOWN * 3), n: 0 };
  private readonly flownCurve = {
    curve: { t: new Float64Array(FLOWN + 1), r: new Float64Array((FLOWN + 1) * 3), v: new Float64Array((FLOWN + 1) * 3), n: 0 } as Curve,
    kept: -1,
    last: Number.NaN,
    at: Number.NaN,
  };
  private readonly uniforms: Record<string, THREE.IUniform>;
  private readonly materials: THREE.ShaderMaterial[] = [];
  private readonly flight: SitedFlight;
  /** The frame the runs and predictions shown are in (world/earthframe.ts). */
  private readonly earth: EarthFrame;
  private readonly site: Site;
  private readonly source: PathSource;
  private readonly host: PathHost;
  private readonly marksEl: HTMLElement;
  private readonly readout: HTMLElement;
  private readonly button: HTMLElement | null;
  /** The Earth's centre in the site's frame, and the columns of the turn from the Earth's frame into the site's; its axis, north, in the site's frame. */
  private readonly centre: THREE.Vector3;
  private readonly basis: number[];
  private readonly pole: THREE.Vector3;
  private readonly poleAt: number[];

  /**
   * Shown or not. Off until it is asked for (J, or its switch), and then as it was left: a new visitor sees the vehicle and
   * the sky first, not a line across them. (`pathOff` is how the choice was kept when it began shown: someone who put it
   * back on by hand then still has it.)
   */
  private on = prefs.chosen('pathOn') ? prefs.get('pathOn') : prefs.chosen('pathOff') && !prefs.get('pathOff');
  private guided = prefs.get('pathGuided');
  private frame: 'surface' | 'orbit' = 'surface';
  /** The sample on show and the live state's part in it. */
  private sample: PathSample | null = null;
  private live: PathLive | null = null;
  private job: { run: Predictor; key: string; plan: string; from: number; began: number; ready?: boolean } | null = null;
  private shown: Shown | null = null;
  private wantedAt: number | null = null;
  private doneAt = 0;
  private raf = 0;
  /** What it hangs on the window and the frame (util/scope.ts): let go of with the page it is on. */
  private readonly scope = new Scope();
  /** What lets go of the stage's call before each draw (`PathHost.beforeDraw`). */
  private readonly unlay: (() => void) | null;
  /**
   * The instant on the path the vehicle is drawn at (the curve's), and what the line was last sampled for; and how far
   * the flight's instants are past the curve's (whole revolutions of an orbit the clock has outrun: `lay`), 0 but then.
   */
  private now = 0;
  private shift = 0;
  private sampledFor = '';
  private readonly keyNow = new Float64Array(21).fill(Number.NaN);
  private readonly markAt = new Float64Array(3);
  private marks: Mark[] = [];
  /** On the map: the vehicle's own marker, and with `others` each other body's (laid out with the path's, never a chip). */
  private craftMark: Mark | null = null;
  private readonly others = new Map<number, Other>();
  /** The other bodies marked on the map (`layBodies`): made when the map first wants them. */
  private heavens: Heavenly[] = [];
  /** The view is the map (`PathHost.map`), as the last frame found it. */
  private mapped = false;
  private laid = new Map<string, MarkOut>();
  private laidRef = new Map<string, MarkOut>();
  private drawnAt = -1;
  /** The camera the stage last drew through (the line is sampled for it), and the size of what it drew into. */
  private camera: THREE.PerspectiveCamera | null = null;
  /** The page's panels on show: a label is not drawn over one. Given by the page, which knows its panels. */
  obstacles: () => readonly Element[] = () => [];
  private panels: Box[] = [];
  private rect = new DOMRect(0, 0, 1, 1);
  private panelsRead = 0;
  /** The frame the markers and chips were last laid out in, and whether the panels they were laid against are as they stand. */
  private laidAt = -1;
  private laidCurrent = false;
  /**
   * A panel that changes size (a row of its own shown, the deck's words wrapping, a note come under the clock) has the
   * panels read again at once and the markers laid out again in the next frame drawn, so nothing is laid against a panel
   * as it stood a moment ago.
   */
  private readonly panelWatch = this.scope.observer(() => {
    this.panelsRead = 0;
  });
  private charWidth = 0;
  /** What the last prediction cost, for whoever asks (`sr.path.cost`): milliseconds in all, the longest slice, and how many frames it was spread over. */
  cost = { ms: 0, slice: 0, frames: 0, steps: 0 };
  private spent = { slice: 0, frames: 0 };
  /**
   * The line as last sampled, for whoever asks (`sr.path.drawn`, the path test): chords ahead and flown, what sampling
   * them took, the instant it starts at, how far it was taken to meet the vehicle, and the gap.
   */
  drawn = { ahead: 0, flown: 0, ms: 0, now: 0, pinned: 0, offset: 0, gap: 0, fade: 0, reach: 0, end: 0, endOver: 0, flownOpacity: 0 };
  /**
   * For the path test only: the line flown drawn in the line ahead's colour, width and strength, the same geometry and the
   * same rules, so its own pixels can be told from a bright scene by the same measure (drawn pale at half strength, as it
   * is, a stretch of it over white cloud or the pale smoke differs from the frame without it by less than the measure's
   * threshold, and a whole line was counted as pieces).
   */
  flownAsAhead = false;

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
    this.earth = frameOf(flight);
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
    this.poleAt = this.basis.slice(6, 9);
    this.pole = new THREE.Vector3(...this.poleAt);

    this.uniforms = {
      uOrigin,
      tSceneDepth: uSceneDepth,
      uDepthRange,
      ...uLast,
      uView: { value: new THREE.Vector2(1, 1) },
      uHalf: { value: HALF },
      uClip: { value: 1 },
      uRing: { value: 1 },
      uCentre: { value: new THREE.Vector3() },
      uPole: { value: new THREE.Vector3(0, 1, 0) },
      uRadius: { value: WGS84_A },
      uStretch: { value: WGS84_A / WGS84_B - 1 },
      uPxPerRad: { value: 1000 },
      uDepth: { value: new THREE.Vector2(1, 1) },
      uThin: { value: DEPTH_THIN },
      uDim: { value: DEPTH_DIM },
      uBehind: { value: 0 },
      uColour: { value: new THREE.Color() },
      uInk: { value: new THREE.Color() },
      uCut: { value: -1 },
      uOpacity: { value: 0.95 },
      uCel: { value: 0 },
      uCore: { value: CORE },
      uGap: { value: 10 },
      uFade: { value: 10 },
      uRatio: { value: 1 },
      uShip: { value: new THREE.Vector3() },
      uShipSeg: { value: new THREE.Vector4() },
      uShipW: { value: 0 },
      uRef: { value: new THREE.Vector3(0, 1, REF_DASH) },
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
        depthTest: false,
        side: THREE.DoubleSide,
      });
      this.materials.push(material);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = name;
      mesh.frustumCulled = false;
      mesh.renderOrder = order; // (the line flown under the line ahead, among what is drawn last)
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
      {
        uCore: { value: FLOWN_CORE },
        uColour: { value: new THREE.Color() },
        uOpacity: { value: FLOWN_OPACITY },
        uEnds: { value: new THREE.Vector4() },
      },
      { FLOWN: '' },
    );
    this.refMesh = make(
      this.intended.geometry,
      'The record’s path',
      10,
      {
        uCore: { value: REF_CORE },
        uColour: { value: new THREE.Color() },
        uOpacity: { value: REF_OPACITY },
        uEnds: { value: new THREE.Vector4(0, 0, 0, 0) },
        uRef: { value: new THREE.Vector3(0, 0, REF_DASH) },
        // (its own depth: how deep it goes into the view is its own, whatever the prediction beside it does)
        uDepth: { value: new THREE.Vector2(1, 1) },
      },
      { REF: '' },
    );
    this.mesh = make(this.ahead.geometry, 'Predicted path', 12, { uEnds: { value: new THREE.Vector4() } }, {});
    this.ringMesh = make(ring.geometry, 'Where the path comes down', 12, { uEnds: { value: new THREE.Vector4() } }, { RING: '' });
    this.limbMesh = make(
      this.limb.geometry,
      'The Earth’s outline on the map',
      9,
      // (no ends: a ring; a Vector4 begins with a 1 in its last place, which would be an end to go out by)
      {
        uCore: { value: FLOWN_CORE },
        uColour: { value: new THREE.Color() },
        uOpacity: { value: LIMB_OPACITY },
        uEnds: { value: new THREE.Vector4(0, 0, 0, 0) },
      },
      { FLOWN: '' },
    );
    this.mesh.add(this.refMesh, this.flownMesh, this.ringMesh, this.limbMesh); // (one object for the stage: all of them are drawn from the same anchor)
    this.refMesh.matrixAutoUpdate =
      this.flownMesh.matrixAutoUpdate =
      this.ringMesh.matrixAutoUpdate =
      this.limbMesh.matrixAutoUpdate =
        true;

    this.marksEl = document.createElement('div');
    this.marksEl.className = 'path-marks';
    this.marksEl.hidden = true;
    parent.prepend(this.marksEl); // first, so under every panel

    this.readout = document.createElement('div');
    this.readout.className = 'path-read';
    this.readout.innerHTML = `
      <p class="path-head">
        <button data-path="show" class="switch" aria-pressed="true" title="The predicted path: where it goes from here if nothing more is done, its apogee, what happens on the way and where it comes down (J)"><kbd>J</kbd>Path</button>
        <button data-path="map" class="switch" aria-pressed="false" title="The map: the whole path from far out, the way it came and what else flies, the Earth turning under it; again for the view it was taken from (${capsOf('map.show').join(' ')})"><kbd>${capsOf('map.show')[0]}</kbd>Map</button>
        <span class="path-as" data-path-cell="as"></span>
      </p>
      <p class="path-kind" data-path-row="kind" role="group" aria-label="Which future the path shows while the engine burns" title="While the engine burns: the path if guidance flies on to the record's cutoff, or if the engine were cut now (K)">
        <kbd>K</kbd><button data-path="guided" aria-pressed="true">To cutoff</button><button data-path="coast" aria-pressed="false">Cut now</button>
      </p>
      <p data-path-row="apogee" title="The greatest height ahead, above the sea, and how long until it"><span>Ap</span><b data-path-cell="apogee">–</b></p>
      <p data-path-row="pass" hidden title="The nearest the path comes to another body: the height over its surface there, and how long until then"><span data-path-cell="passName">Moon</span><b data-path-cell="pass">–</b></p>
      <p data-path-row="end"><span data-path-cell="endName">Down</span><b data-path-cell="end">–</b></p>
      <p class="path-flown" data-path-row="flown" hidden title="The thin grey line, drawn only from far out: where the vehicle has been, its last revolution or so. The amber line is the way ahead"><span>Flown</span><b><i></i>the way it came</b></p>
      <p class="path-flown path-planned" data-path-row="ref" hidden title="The dashed line: the flight as the record has it, from the pad to where it came down, with what happened on it. It is the record’s, and nothing flown here moves it. The amber line is where this flight is going"><span>Record</span><b><i></i>to hold to</b></p>`;
    readout.append(this.readout);
    this.readout.addEventListener('click', (e) => {
      const what = (e.target as HTMLElement).closest<HTMLElement>('[data-path]')?.dataset.path;
      if (what === 'show') this.show(!this.on);
      if (what === 'map') this.toMap(!this.mapped);
      if (what === 'guided' || what === 'coast') this.setGuided(what === 'guided');
      (document.activeElement as HTMLElement | null)?.blur?.(); // or Space, the next event's key, would press it again
    });
    this.button?.addEventListener('click', () => this.show(!this.on));
    this.scope.on(window, 'keydown', (e) => {
      const typing = isTyping(e);
      if (!source.active || e.repeat || modified(e) || typing) return;
      if (is(e, 'path.show')) this.show(!this.on);
      if (is(e, 'map.show')) this.toMap(!this.mapped);
      if (is(e, 'path.choose') && this.choosing()) this.setGuided(!this.guided);
    });
    source.listen((sample, live) => {
      this.sample = sample;
      this.live = live;
      if (source.track) this.follow(source.track(sample.t), sample.t);
      else if (live && !sample.landed) this.keep(sample.t, sample.centre ?? sample.r);
      this.wake();
    });
    host.overlay(this.mesh); // in the scene from the first, unseen, so its shaders are built with the rest (Stage.warm)
    // (laid out again in the frame it is drawn in, from where the vehicle is drawn: laid only in a frame of its own, after
    // the draw, it started where the vehicle had been a frame before, behind it)
    this.unlay =
      host.beforeDraw?.(() => {
        const shown = this.shown;
        if (shown && this.mesh.visible && shown.curve.n > 1) this.lay(shown, this.mixOf(shown));
        else if (this.bare && this.mesh.visible) this.layBare();
      }) ?? null;
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

  /** Wall time spent waiting is independent of the simulation clock, which may be paused or accelerated. */
  get freshness() {
    const want = this.want();
    return {
      current: !!want && this.shown?.key === want.key,
      sampleTime: this.sample?.t ?? null,
      displayedFrom: this.shown?.result.from ?? null,
      jobFrom: this.job?.from ?? null,
      waitingMs: this.wantedAt === null ? 0 : performance.now() - this.wantedAt,
    };
  }

  /** A moving sample can continuously request another path while fresh completions keep arriving. */
  private get stale(): boolean {
    return this.wantedAt !== null && performance.now() - Math.max(this.wantedAt, this.doneAt) > STALE * 1000;
  }

  /** The markers on the page now, for whoever asks (`sr.path.laidOut`): each with its label's box when it has one. */
  get laidOut(): MarkOut[] {
    return this.marksEl.hidden ? [] : [...this.laid.values()];
  }

  /** Draw the path, or put it away. Remembered. */
  /** The page has gone to another flight: off the window, no more frames, and the line's buffers let go (the stage takes it out: Stage.unoverlay). */
  dispose(): void {
    this.scope.dispose();
    this.unlay?.();
    this.raf = 0;
    disposeTree(this.mesh);
  }

  show(on: boolean, remember = true): void {
    this.on = on;
    if (remember) prefs.set('pathOn', on);
    this.button?.setAttribute('aria-pressed', String(on));
    this.readout.querySelector('[data-path=show]')!.setAttribute('aria-pressed', String(on));
    this.readout.classList.toggle('off', !on && !this.mapped);
    this.wake();
  }

  /** To the map, or back from it (M, its switch): the stage's to do (`PathHost.setMap`), and what is drawn follows the view it then has (`remap`). */
  private toMap(on: boolean): void {
    this.host.setMap?.(on);
    this.wake();
  }

  /** The view has become the map, or stopped being it: an orbit is drawn in the map's frame, the switch says so, and what else flies is let go with it. */
  private remap(): void {
    const mapped = Boolean(this.source.active && this.host.map?.());
    if (mapped === this.mapped) return;
    this.mapped = mapped;
    this.readout.querySelector('[data-path=map]')!.setAttribute('aria-pressed', String(mapped));
    this.readout.classList.toggle('off', !this.on && !mapped);
    this.uniforms.uBehind!.value = mapped ? BEHIND : 0;
    this.sampledFor = '';
    if (this.shown) this.build(this.shown.result, this.shown.key, this.shown.plan, false);
    if (!mapped) this.unmark();
    this.host.overlay(this.mesh);
  }

  /** Take the map's own markers and lines away. */
  private unmark(): void {
    for (const o of this.others.values()) this.dropOther(o);
    this.others.clear();
    this.craftMark?.el.remove();
    this.craftMark?.chip.el.remove();
    this.craftMark = null;
    for (const h of this.heavens) {
      for (const mesh of [h.discMesh, h.meetMesh, h.wayMesh]) {
        mesh.removeFromParent();
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
      h.mark.el.remove();
      h.mark.chip.el.remove();
    }
    this.heavens = [];
  }

  private dropOther(o: Other): void {
    o.mesh.removeFromParent();
    o.line.geometry.dispose();
    (o.mesh.material as THREE.Material).dispose();
    o.mark.el.remove();
    o.mark.chip.el.remove();
  }

  /**
   * What a map of the flight is of (camera/rig.ts `MapOf`), at the clock's instant `t`: the Earth, how far it has turned,
   * and how far what is drawn of the flight reaches from its centre and from the vehicle (the path on show, the line
   * flown, the vehicle itself). Null with nothing flown.
   */
  mapOf(t: number): MapOf | null {
    const s = this.sample;
    if (!s || !this.source.active) return null;
    const r = s.centre ?? s.r;
    let reach = Math.hypot(r[0], r[1], r[2]);
    let extent = 0;
    const take = (p: ArrayLike<number>, n: number) => {
      // (a few hundred of its points: the furthest of a curve is not between two of them by more than a part in a thousand)
      const every = Math.max(1, Math.floor(n / 256));
      for (let i = 0; i < n; i += every) {
        const x = p[i * 3]!;
        const y = p[i * 3 + 1]!;
        const z = p[i * 3 + 2]!;
        reach = Math.max(reach, Math.hypot(x, y, z));
        extent = Math.max(extent, Math.hypot(x - r[0], y - r[1], z - r[2]));
      }
    };
    if (this.shown && this.shown.curve.n > 1) take(this.shown.curve.r, this.shown.curve.n);
    if (this.flown.n > 1) take(this.flown.r, this.flown.n);
    // (and what of the record's line is drawn: its points within that stretch)
    const ref = this.refMesh.visible ? this.ref : null;
    if (ref) {
      const c = ref.curve;
      const a = pieceOf(c, this.drawnRef.from);
      const b = Math.min(c.n, pieceOf(c, this.drawnRef.to) + 2);
      if (b - a > 1) take(c.r.subarray(a * 3, b * 3), b - a);
    }
    return { centre: this.centre, pole: this.pole, radius: WGS84_A, turned: this.earth.angle(t), reach, extent };
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
    if (!this.raf) this.raf = this.scope.frame(() => this.tick());
  }

  /** Whether there is a flight to draw anything of, predicted or not: one on the flight deck, with the path asked for or the map up. */
  private base(): boolean {
    return this.sample !== null && this.source.active && (this.on || this.mapped);
  }

  /** The prediction on show is no longer the flight's: it goes, and its markers and ring with it (what is drawn with none stays: `place`). */
  private unpredict(): void {
    this.shown = null;
    this.sampledFor = '';
    // (its markers are kept, unseen, for the next prediction to take up as they are: `markOut`)
    for (const m of this.marks) m.off = true;
    this.ringMesh.userData.at = null;
    this.ahead.n = 0;
    this.ahead.geometry.setDrawRange(0, 0);
    this.along = null;
    this.host.overlay(this.mesh);
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
    if (!this.ballistic) return this.source.guidable === true;
    return this.burning() && this.source.steering.guidance && this.source.craft !== null && (this.sample?.t ?? 0) < this.until();
  }

  /** Whether the flight's path is predicted here, from the programme of its deck's vehicle (a deck that predicts its own, `PathSource.predict`, is one into orbit's). */
  private get ballistic(): boolean {
    return !this.source.predict;
  }

  /** When the engine stops if nobody stops it: the record's cutoff with the sequencer on; with it off, when it runs dry. */
  private until(): number {
    const b = ballisticOf(this.flight.plan!);
    return this.source.steering.sequence === false ? (b.engine.depletion?.value ?? b.cutoff) : b.cutoff;
  }

  /**
   * What the sequencer will do from the live state: nothing if it is off, or after an abort but the parachutes. Otherwise
   * one rule for any ballistic plan, from its events in the plan's order: each the sequencer sets off on the clock, by what
   * it does as the predictor flies it (sim/predict.ts `Sequence`). A joint let go (the tower's, the booster's, the pack's:
   * sim/fly.ts `ballisticOf`) comes at the instant the clock sets it off, unless what it lets go has left already; the
   * motors are lit so long after the first as the plan's waits say, the first at the instant the live vehicle lit it (or
   * the plan's), unless what they are on has left. The first event to do a thing is the one that does it.
   */
  private sequence(): Sequence | undefined {
    const plan = this.flight.plan!;
    const live = this.live;
    if (!live) return undefined;
    const on = this.source.steering.sequence !== false;
    if (!on) return { chutes: false };
    if (live.abortAt !== null && live.abortAt !== undefined) return { chutes: true };
    const b = ballisticOf(plan);
    const left = (body: string): boolean => live.craft !== undefined && hasLeft(live.craft, body);
    const retroAt = live.retroAt ?? b.retroAt;
    const out: Omit<Sequence, 'chutes'> = {};
    for (const e of plan.events) {
      const at = e.automatic ? clockAt(plan, e) : Infinity;
      if (!Number.isFinite(at)) continue;
      for (const a of e.do) {
        if ('separate' in a) {
          const joint = b.craft.joints.find((j) => j.id === a.separate);
          if (!joint || joint.gone.some(left)) continue;
          if (joint === b.towerJoint) out.tower ??= at;
          else if (joint === b.separation && out.separation === undefined) {
            out.separation = at;
            out.axis = this.jointAxis(at);
          } else if (joint === b.packJoint) out.retropack ??= at;
        } else if ('ignite' in a) {
          const motor = b.motors.find((m) => m.id === a.ignite);
          if (!motor || left(motor.body)) continue;
          const wait = e.when.reduce((w, x) => ('after' in x ? (x.wait ?? 0) : w), 0);
          (out.retro ??= []).push(retroAt + wait);
        }
      }
    }
    return { ...out, chutes: true };
  }

  /**
   * The stack's long axis at an instant to come, for the joint the spacecraft and booster part along: the tilt programme's
   * under guidance (with its trim), as the autopilot holds it; otherwise the axis it has now, which nothing is turning.
   */
  private jointAxis(at: number): Vec3 {
    const craft = this.source.craft;
    const { trim, guidance } = this.source.steering;
    if (craft && guidance) return programmeAxis(craft, at, trim);
    return this.sample?.axis ?? (craft ? craft.programme(at) : [0, 0, 1]);
  }

  /** Which future is to be shown from the sample on show: null for none (off, not flying, down). */
  private want(): { key: string; plan: string; burn: Burn | null; sequence: Sequence | undefined; guided?: boolean } | null {
    const s = this.sample;
    if (!s || !(this.on || this.mapped) || !this.source.active || s.landed) return null;
    // (a flight into orbit: its deck predicts, from the sample on show and what it has planned)
    if (!this.ballistic) {
      if (!this.source.predict || !(s.t > 0)) return null;
      // (and under guidance, whichever future was asked for: K)
      const guided = this.choosing() && this.guided;
      const plan = `${this.source.plan ?? ''}|${guided ? 'guided' : 'cut'}`;
      return { key: `${s.t}|${plan}`, plan, burn: null, sequence: undefined, guided };
    }
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
    this.remap();
    const want = this.want();
    const s = this.sample;
    if (!want || !s) {
      this.wantedAt = null;
      this.job = null;
      if (this.shown) this.unpredict();
      // (nothing predicted: on the pad with guidance off, or down. The line flown, the record's line and the map's own are drawn all the same)
      if (this.base()) {
        this.raf = this.scope.frame(() => this.tick());
        this.place();
        return;
      }
      if (this.mesh.visible) {
        this.bare = false;
        this.mesh.visible = this.flownMesh.visible = this.ringMesh.visible = this.refMesh.visible = false;
        this.unmark();
        this.host.overlay(this.mesh);
      }
      this.marksEl.hidden = true;
      this.say(null);
      this.flownKey(false);
      this.refKeyRow(false);
      return; // (asleep until the next sample, or a switch)
    }
    this.raf = this.scope.frame(() => this.tick());
    // A different choice or a rewind before the start of a result makes that result inapplicable.
    if (this.shown && (this.shown.plan !== want.plan || this.shown.result.from > s.t)) this.unpredict();
    // (and so does a coast the flight has left by more than another path lies off (`PIN_FAR`): carried with it to the first
    // order, it would bend as the orbit it was made on does, not as the flight's own)
    if (this.shown && this.shown.result.kind !== 'guided' && this.leftBy(this.shown, s) > PIN_FAR) this.unpredict();
    // (the flight still on the curve on show, with the same plan: that curve is still its future, and nothing is predicted again)
    if (this.shown && this.shown.key !== want.key && this.shown.plan === want.plan && this.holds(this.shown, s)) this.shown.key = want.key;
    if (this.shown?.key !== want.key && this.wantedAt === null) this.wantedAt = performance.now();
    if (this.job && (this.job.plan !== want.plan || this.job.from > s.t || this.shown?.key === want.key)) this.job = null;
    if (!this.job && this.shown?.key !== want.key && performance.now() - this.doneAt >= EVERY) {
      const start = {
        t: s.t,
        r: fliesOf(s),
        v: s.v,
        mass: s.mass,
        riding: s.riding,
        escaping: s.escaping,
        out: s.out,
        ...(s.chute ? { chute: s.chute } : {}),
      };
      const options = {
        points: MOST - 2,
        ...(want.burn ? { burn: want.burn } : {}),
        ...(want.sequence ? { sequence: want.sequence } : {}),
        frame: this.earth,
      };
      const run = this.ballistic
        ? predictor(this.flight.plan!, this.site, this.flight.site.seaLevel.value, start, options)
        : this.source.predict!(start, MOST - 2, want.guided === true);
      if (!run) {
        // (the source has no future to give from here, a vehicle in pieces: the one on show was another flight's, and goes)
        this.doneAt = performance.now();
        this.wantedAt = null;
        if (this.shown) this.unpredict();
        this.place();
        return;
      }
      this.job = {
        run,
        key: want.key,
        from: s.t,
        plan: want.plan,
        began: performance.now(),
      };
      this.spent = { slice: 0, frames: 0 };
    }
    if (this.job) {
      const began = performance.now();
      const done = this.job.run.run(SLICE);
      const spent = performance.now() - began;
      this.spent.slice = Math.max(this.spent.slice, spent);
      this.spent.frames++;
      // (a prediction finished late in its slice is laid along in the next frame: the line's making is work of its own)
      if (done && spent > SLICE / 2 && !this.job.ready) this.job.ready = true;
      else if (done) {
        const result = this.job.run.result;
        this.cost = { ms: result.cost, slice: this.spent.slice, frames: this.spent.frames, steps: result.steps };
        this.build(result, this.job.key, this.job.plan, true);
        this.job = null;
        this.doneAt = performance.now();
        this.wantedAt = this.shown?.key === want.key ? null : this.wantedAt;
      }
    }
    if (this.shown?.key === want.key) this.wantedAt = null;
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
    const turned = this.earth.angle(frame === 'orbit' ? now : t);
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
   * Whether the curve on show is still the flight's future from this sample, as far as anyone can see. The sample is
   * `dr` from the curve at its instant and `dv` off its velocity; a prediction made again from it would lie within
   * dr + `GROWTH` dv tau of the curve at each instant tau ahead (a coast's departure grows no faster: under thrust it
   * grows each frame, so the curve goes as soon as it is seen to). While that is under `MOVE_PX` as seen from the eye at
   * every point of the curve that is drawn where it is (past the stretch that is taken onto the vehicle, `PIN_OVER`
   * gaps), the curve stands; and one that comes round must still reach most of the way round. The same physics from the
   * same state gives the same curve, so it is not worked out again.
   */
  private holds(shown: Shown, s: PathSample): boolean {
    const c = shown.curve;
    if (c.n < 2 || s.t < c.t[0]! || s.t > c.t[c.n - 1]!) return false;
    if (shown.result.outcome === 'orbit' && c.t[c.n - 1]! - s.t < HOLD_ROUND * (c.t[c.n - 1]! - c.t[0]!)) return false;
    const at = this.at3;
    const vel = [0, 0, 0];
    curveAt(c, s.t, at, 0, 0, vel);
    const r = fliesOf(s);
    const dr = Math.hypot(at[0]! - r[0], at[1]! - r[1], at[2]! - r[2]);
    const dv = Math.hypot(vel[0]! - s.v[0], vel[1]! - s.v[1], vel[2]! - s.v[2]);
    // (the line starts at the vehicle: the curve must pass within a metre of the flight, whatever the eye)
    const camera = this.camera;
    // (and a burn the prediction flies is held to the metre and the centimetre a second: the live vehicle's guidance lags
    // its programme, under a degree, which a departure from the curve now does not foretell)
    if (dr > HOLD_M || !camera || shown.result.kind === 'guided') return dr <= HOLD_M && dv <= HOLD_MS;
    const eye = absolute(this.eye.copy(camera.position));
    const vessel = this.host.vessel(this.ship, this.axis2);
    const tanHalf = Math.tan((camera.fov * Math.PI) / 360) / Math.max(camera.zoom, 1e-6);
    const pxPerRad = this.size.y / 2 / tanHalf;
    const toShip = vessel ? this.ship.distanceTo(eye) : Number.POSITIVE_INFINITY;
    const near = vessel ? PIN_OVER * this.reachOf(vessel.half, toShip, tanHalf) : 0;
    const q = this.holdAt;
    // (at most a couple of hundred of the curve's points, evenly: the curve is fine enough that between two the bound changes little)
    const every = Math.max(1, Math.floor(c.n / 200));
    for (let i = 0; i < c.n; i += every) {
      const tau = c.t[i]! - s.t;
      if (tau < 0) continue;
      this.sceneOf(c.r, i * 3, c.t[i]!, shown.frame, s.t, q, 0);
      if (vessel && Math.hypot(q[0]! - this.ship.x, q[1]! - this.ship.y, q[2]! - this.ship.z) < near) continue;
      const d = Math.max(Math.hypot(q[0]! - eye.x, q[1]! - eye.y, q[2]! - eye.z), camera.near);
      if (((dr + GROWTH * dv * tau) / d) * pxPerRad > MOVE_PX) return false;
    }
    return true;
  }
  private readonly holdAt = new Float64Array(3);

  /** How far the flight at sample `s` is from the curve on show at its instant, m (pathline.ts `departure`; 0 outside the curve's span). */
  private leftBy(shown: Shown, s: PathSample): number {
    const left = this.leftNow;
    if (!departure(shown.curve, s.t, fliesOf(s), s.v, left)) return 0;
    return Math.hypot(left[0]!, left[1]!, left[2]!);
  }
  private readonly leftNow = new Float64Array(6);

  /** Lay the line along a prediction, eased from where the one on show has it now (`ease`). */
  private build(result: Prediction, key: string, plan: string, ease: boolean): void {
    const n = result.outcome === 'none' ? 0 : result.points.length;
    const frame = this.frameFor(result);
    const old = this.shown;
    const next: Shown = {
      key,
      plan,
      result,
      frame,
      curve: curveOf(n ? result.points : []),
      hint: 0,
      left: new Float64Array(6),
      leftAt: result.from,
      began: performance.now(),
      // (eased from the line on show as it is drawn now: from the one it was itself eased from, if that is still going)
      was: ease && old && old.curve.n > 1 && n > 0 ? old : null,
    };
    // (one still easing in is held where it is drawn now, and eased from: so a prediction every fifth of a second under
    // power, sooner than the ease, moves the line on from where it is, never back to where the last one was going)
    if (next.was) {
      next.was.held = this.mixOf(next.was);
      if (next.was.was) next.was.was.was = null;
    }
    this.shown = next;
    this.uniforms.uCut!.value = result.cutoff === null ? -1 : result.cutoff - result.from;
    this.sampledFor = '';
    this.markOut(next);
    this.host.overlay(this.mesh);
  }

  /** The frame a prediction is drawn in, from the path alone (pathline.ts `drawnIn`): how far the Earth turns before it comes down, and whether it reaches beyond the stationary radius. */
  private frameFor(result: Prediction): 'surface' | 'orbit' {
    if (result.outcome === 'none') return 'surface';
    let top = 0;
    for (const p of result.points) top = Math.max(top, Math.hypot(p.r[0], p.r[1], p.r[2]));
    const turned = result.impact ? EARTH_ROTATION_RATE * (result.impact.t - result.from) : null;
    return drawnIn(turned, top > STATIONARY, this.mapped, this.frame);
  }

  /** How far the line on show has come from where it was eased from. */
  private mixOf(shown: Shown): number {
    if (shown.held !== undefined) return shown.held;
    const k = Math.min(1, Math.max(0, (performance.now() - shown.began) / (EASE * 1000)));
    return k * k * (3 - 2 * k);
  }

  /** The markers of a prediction, all found in it: its next apoapsis and periapsis, its events, and its end. */
  private markOut(shown: Shown): void {
    const r = shown.result;
    const list: { kind: Kind; t: number; r: Vec3; figure: string; name?: string }[] = [];
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
    // (what happens on the way, in order of time: its events, and the nearest it comes to another body, named by the body)
    const happens: { kind: Kind; t: number; r: Vec3; figure: string; name?: string }[] = [
      ...r.events.map((e) => ({
        kind: e.kind as Kind,
        t: e.t,
        r: e.r,
        figure: e.kind === 'peak' && e.value ? `${e.value.toFixed(1)} g` : '',
      })),
      ...r.passes.map((p) => ({ kind: 'pass' as Kind, t: p.t, r: p.r, figure: p.strikes ? 'impact' : `${km(p.height)} km`, name: p.body })),
    ];
    list.push(...happens.sort((a, b) => a.t - b.t));
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
        ...(m.name ? { name: m.name } : {}),
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

  /**
   * The line flown, one rule whatever it is heard from: a point for every second or so of the flight, kept in the frame
   * that does not turn; full, every other point let go. An instant before the last is a new flight.
   */
  private keep(t: number, r: Vec3): void {
    const f = this.flown;
    const last = f.n ? f.t[f.n - 1]! : Number.NEGATIVE_INFINITY;
    if (t < last - 1e-6) f.n = 0; // a new flight
    if (t - last < 1) return;
    if (f.n === FLOWN) {
      // full: what is more than `FLOWN_SPAN` old let go (a flight of days is not kept whole: its points would lie minutes
      // apart, too far to draw the curve between them); if that is not enough, every other point
      let old = 0;
      while (old < f.n - 1 && f.t[old]! < t - FLOWN_SPAN) old++;
      if (old > 0) {
        f.t.copyWithin(0, old, f.n);
        f.r.copyWithin(0, old * 3, f.n * 3);
        f.n -= old;
      }
      if (f.n > (3 * FLOWN) / 4) {
        for (let i = 1; i < f.n / 2; i++) {
          f.t[i] = f.t[2 * i]!;
          f.r.copyWithin(i * 3, 2 * i * 3, 2 * i * 3 + 3);
        }
        f.n = Math.ceil(f.n / 2);
      }
    }
    f.t[f.n] = t;
    f.r.set(r, f.n * 3);
    f.n++;
  }

  /**
   * The line flown from a run's own samples (`PathSource.track`), through the instant on show: each sample not yet taken
   * is kept by the same rule as a sample heard (`keep`), all but the last (the run's head, which a deck flying it puts
   * in place again every frame until it keeps one; the sample on show ends the line, `flownNow`). If the last one taken
   * is no longer where it was, or the instant has gone back before it, the run is another (flown again, or from earlier)
   * and its line is taken again from the start.
   */
  private follow(track: readonly Tracked[], until: number): void {
    const was = this.taken;
    const at = was.n > 0 ? track[was.n - 1] : undefined;
    const p = at ? (at.centre ?? at.r) : null;
    if (
      was.n > 0 &&
      (!at || !p || at.t !== was.t || p[0] !== was.r[0] || p[1] !== was.r[1] || p[2] !== was.r[2] || until < Math.max(was.t, was.filled))
    ) {
      this.flown.n = 0;
      was.n = 0;
      was.filled = Number.NEGATIVE_INFINITY;
    }
    /**
     * Where a quiet stretch of a coast was kept as its two ends (`Sample.rails`), the points between them, flown again,
     * as close as a coast keeps them: from `from` on, up to `to`. Not for what is too old to be kept (`FLOWN_SPAN`).
     */
    const fill = (a: Tracked, b: Tracked, from: number, to: number): void => {
      if (!a.rails || !a.v || !b.v || !(b.t - a.t > FLOWN_EVERY) || to < until - 2 * FLOWN_SPAN) return;
      const of = a.rails.of as unknown as (x: Tracked) => Vec3;
      const [p0, p1] = [
        { t: a.t, r: of(a), v: a.v },
        { t: b.t, r: of(b), v: b.v },
      ];
      for (let k = Math.max(1, Math.floor((from - a.t) / FLOWN_EVERY) + 1); a.t + k * FLOWN_EVERY < Math.min(b.t, to + 1e-9); k++) {
        const t = a.t + k * FLOWN_EVERY;
        this.keep(t, a.rails.state(p0, p1, t).r);
        was.filled = t;
      }
    };
    for (let i = was.n; i < track.length - 1; i++) {
      const x = track[i]!;
      if (x.t > until) break;
      const before = i > 0 ? track[i - 1]! : undefined;
      if (before) fill(before, x, Math.max(before.t, was.filled), x.t);
      const r = x.centre ?? x.r;
      this.keep(x.t, r);
      was.n = i + 1;
      was.t = x.t;
      was.r = r;
    }
    // (and on from the last sample taken to the instant on show, within the stretch it begins)
    const [last, next] = [was.n > 0 ? track[was.n - 1] : undefined, track[was.n]];
    if (last && next && was.n < track.length - 1) fill(last, next, Math.max(last.t, was.filled), until);
    this.tracked = true;
  }
  /** How much of the run's samples has been taken into the line flown, the last of them (its instant and place), and how far on from it a quiet stretch has been filled. */
  private readonly taken: { n: number; t: number; r: Vec3; filled: number } = {
    n: 0,
    t: Number.NEGATIVE_INFINITY,
    r: [0, 0, 0],
    filled: Number.NEGATIVE_INFINITY,
  };
  /** Whether the line flown is the run's (`follow`): drawn with no live state. */
  private tracked = false;

  /** The line flown as a curve: the points kept, and the sample on show after them (the flight as it is now). */
  private flownNow(): Curve | null {
    const f = this.flown;
    const s = this.sample;
    if (f.n < 1 || !s || (!this.live && !this.tracked)) return null;
    const c = this.flownCurve;
    const last = f.t[f.n - 1]!;
    if (c.kept === f.n && c.last === last && c.at === s.t) return c.curve.n > 1 ? c.curve : null;
    // (written into the same buffers each time: while the flight goes on it changes every frame, and a curve made anew
    // each time was a few hundred small objects a frame for the collector)
    const curve = c.curve;
    curve.t.set(f.t.subarray(0, f.n));
    curve.r.set(f.r.subarray(0, f.n * 3));
    curve.n = f.n;
    if (s.t > last + 1e-6) {
      curve.t[f.n] = s.t;
      curve.r.set(s.centre ?? s.r, f.n * 3);
      curve.n++;
    }
    for (let i = 0; i < curve.n; i++) slope(curve, i);
    c.kept = f.n;
    c.last = last;
    c.at = s.t;
    return curve.n > 1 ? curve : null;
  }

  private readonly at3 = new Float64Array(3);
  private readonly at3b = new Float64Array(3);
  private readonly easeAt = new Float64Array(3);
  private readonly lensEye: [number, number, number] = [0, 0, 0];

  /** Where the line on show puts instant `t` in the scene now, eased from the one before (and that from its own, held). */
  private alongAt(shown: Shown, t: number, out: Float64Array, o: number, mix: number): void {
    shown.hint = curveAt(shown.curve, t, this.at3, 0, shown.hint);
    carried(this.at3, 0, t, shown.left, shown.leftAt);
    this.sceneOf(this.at3, 0, t + this.shift, shown.frame, this.now + this.shift, out, o);
    const was = shown.was;
    if (was && mix < 1 && t >= was.curve.t[0]! && t <= was.curve.t[was.curve.n - 1]!) {
      const from = was.was ? new Float64Array(3) : this.easeAt;
      this.alongAt(was, t, from, 0, this.mixOf(was));
      for (let k = 0; k < 3; k++) out[o + k] = from[k]! + (out[o + k]! - from[k]!) * mix;
    }
  }

  /**
   * Each frame: the line turned with the Earth if it is an orbit's, the instant on show found where the vehicle is drawn,
   * the ease, and the line sampled again for the eye if anything of that has moved.
   */
  private place(): void {
    const shown = this.shown;
    const seen = shown !== null && shown.curve.n > 1;
    // (with no prediction to draw, what does not need one is drawn: the line's mesh carries the others, its own ribbon empty)
    const bare = !seen && this.base();
    const visible = seen || bare;
    const changed = this.mesh.visible !== visible || this.bare !== bare;
    this.mesh.visible = visible;
    this.bare = bare;
    if (bare && changed) {
      this.ahead.n = 0;
      this.ahead.geometry.setDrawRange(0, 0);
      this.sampledFor = '';
    }
    this.flownMesh.visible = visible && this.flown.n > 0 && (this.live !== null || this.tracked);
    this.ringMesh.visible = seen && shown?.result.impact !== null && shown?.frame === 'surface';
    if (!visible) this.refMesh.visible = false;
    if (changed) this.host.overlay(this.mesh);
    if (performance.now() - this.panelsRead > 200) {
      // (where the panels and the canvas are is asked a few times a second, here and not in the draw, which must not ask the page's layout)
      const panels = this.obstacles();
      const boxes = boxesOf(panels);
      const rect = this.host.viewRect();
      // (laid out again in the next frame drawn only if something has moved: the layout is then of the panels as they stand)
      if (!sameBoxes(boxes, this.panels) || !sameRect(rect, this.rect)) {
        this.panels = boxes;
        this.rect = rect;
        this.laidCurrent = false;
        if (this.mesh.visible) this.host.overlay(this.mesh);
      }
      for (const el of panels) this.panelWatch.observe(el); // (one watched already is watched once)
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
    this.marksEl.hidden = !visible;
    // (from the seat only the chips: nothing is laid on the line over the cabin)
    this.marksEl.classList.toggle('aboard', this.host.aboard?.() === true);
    this.drawChips();
    if (!seen || !shown) {
      if (bare) this.layBare();
      this.say(shown?.result ?? null);
      return;
    }
    const mix = this.mixOf(shown);
    if (mix >= 1) shown.was = null;
    // (a prediction is begun five times a second while the flight goes on: the one on show is stale only if none has come for a while)
    const stale = this.stale;
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

  /**
   * How far the line may be from the vehicle and still be taken onto it (`PIN_WITHIN`, `PIN_OVER`, `holds`), m: a little
   * more than half its length, or a tenth of the view's height at it when it is small. (Not the gap the line keeps:
   * that is `gapOf`.)
   */
  private reachOf(half: number, toShip: number, tanHalf: number): number {
    return Math.max(1.1 * half, 0.2 * toShip * tanHalf);
  }
  /** Metres at the vehicle to a pixel of the target. */
  private perPx(toShip: number, tanHalf: number): number {
    return (toShip * tanHalf) / Math.max(1, this.size.y / 2);
  }
  /**
   * The gap the line keeps from the vehicle's middle (`prepare` gives it to the shader), m: a little more than half its
   * length and `GAP_PX`, so it is not seen leave the nose, and never a hole round the vehicle.
   */
  private gapOf(half: number, toShip: number, tanHalf: number): number {
    return 1.1 * half + GAP_PX * this.perPx(toShip, tanHalf);
  }
  /** The span the line comes in over past the gap, m: `FADE_LENGTHS` of the vehicle, or `FADE_PX` at it where it is small. */
  private fadeOf(half: number, toShip: number, tanHalf: number): number {
    return Math.max(FADE_LENGTHS * 2 * half, FADE_PX * this.perPx(toShip, tanHalf));
  }

  /**
   * Where the line ahead ends, as an instant, and over how many seconds before that it goes out (0: it is not faded,
   * it meets the ground with its ring). A path once round stops short of coming back to the vehicle (`TAIL_SHORT`,
   * beyond both horizons: `overHorizon`), turned round from where the vehicle is now, and goes out over `TAIL_FADE` of
   * its turn before that; one cut off by its horizon of time goes out over the last of it.
   */
  private endOf(shown: Shown, now: number): { to: number; over: number } {
    const c = shown.curve;
    const t1 = c.t[c.n - 1]!;
    const outcome = shown.result.outcome;
    if (outcome !== 'orbit' && outcome !== 'limit') return { to: t1, over: 0 };
    const limit = { to: t1, over: Math.min(LIMIT_FADE_MOST, LIMIT_FADE * Math.max(0, t1 - now)) };
    if (c.n < 2) return limit;
    if (!shown.sweep) {
      shown.sweep = sweepOf(c);
      let top = 0;
      for (let i = 0; i < c.n; i++) top = Math.max(top, Math.hypot(c.r[i * 3]!, c.r[i * 3 + 1]!, c.r[i * 3 + 2]!));
      shown.top = top;
    }
    // (one cut off by its time before it has gone half round cannot come back to the vehicle: its last stretch goes out)
    if (outcome === 'limit' && shown.sweep.at[c.n - 1]! < Math.PI) return limit;
    const here = this.at3;
    curveAt(c, now, here, 0, shown.hint);
    const short = overHorizon(Math.hypot(here[0]!, here[1]!, here[2]!), shown.top ?? 0, WGS84_B) + TAIL_SHORT;
    return tailOf(c, shown.sweep, now, short, TAIL_FADE, limit.over);
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
    const reach = vessel ? this.reachOf(vessel.half, toShip, tanHalf) : 0;
    // the instant on the path nearest the vehicle as it is drawn (Newton's steps along the line from the sample's instant),
    // its way along the line taken from instants on it: at its ends, from one side. (Taken from both sides at its start,
    // the instant before was off the curve, its place held where the curve begins while the Earth under it was turned on,
    // so over the turning Earth the way was the Earth's turn, hundreds of metres a second, and a vehicle drawn a moment
    // past the sample, under a parachute going a few metres a second, was found at the start and left metres off it.)
    // (an orbit the clock has run past the end of, at a rate of hours a second, before a prediction from where the vehicle
    // is now can be made: the curve is gone round again, whole revolutions on, so the line still starts at the vehicle;
    // its slow turn in a revolution, the Earth's bulge, is taken up where it is taken onto the vehicle)
    this.shift = shown.result.outcome === 'orbit' ? turnsPast(s.t, t0, t1) : 0;
    // how far the flight has left the curve on show, and the one it is eased from: each is drawn carried with it by that
    // much (a path flown under guidance is held to its programme instead, and made again as soon as the flight leaves it)
    for (let x: Shown | null = shown; x; x = x.was) {
      if (x.result.kind === 'guided' || !departure(x.curve, s.t, fliesOf(s), s.v, x.left)) x.left.fill(0);
      x.leftAt = s.t;
    }
    let now = Math.min(t1, Math.max(t0, s.t - this.shift));
    const p = this.at3b;
    const q = new Float64Array(3);
    this.now = now;
    if (vessel) {
      for (let k = 0; k < 4; k++) {
        this.now = now;
        const h = 0.05;
        const before = Math.max(t0, now - h);
        const after = Math.min(t1, now + h);
        if (!(after > before)) break;
        this.alongAt(shown, after, p, 0, mix);
        this.alongAt(shown, before, q, 0, mix);
        const dx = (p[0]! - q[0]!) / (after - before);
        const dy = (p[1]! - q[1]!) / (after - before);
        const dz = (p[2]! - q[2]!) / (after - before);
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
      if (offset > Math.max(PIN_WITHIN * reach, PIN_FAR) && this.shift === 0) pin.fill(0);
    }
    const pinned = pin[0] !== 0 || pin[1] !== 0 || pin[2] !== 0;
    // (the offset let go over the next ten gaps of the line, or a hundred times the offset if that is longer, so the line bends by
    // under a degree: as an interval of time at the speed there)
    const over = pinned ? Math.max(1e-3, Math.max(PIN_OVER * reach, PIN_SLOPE * offset) / Math.max(speed, 1e-3)) : 1;
    const weight = (dt: number) => {
      const x = Math.min(1, Math.abs(dt) / over);
      return 1 - x * x * (3 - 2 * x);
    };
    // what the line is sampled for: if none of it has moved, the line drawn is the one already there
    const e = camera.quaternion;
    const m = camera.projectionMatrix.elements;
    const flown = this.flownNow();
    // (compared number by number in a buffer kept for it: a string made of them every frame was garbage every frame)
    const key = this.keyNow;
    const values = [eye.x, eye.y, eye.z, e.x, e.y, e.z, e.w, m[0]!, m[5]!, m[8]!, m[9]!, camera.near, this.lineSize.y, now, mix];
    let same = this.sampledFor === shown.key + shown.frame;
    const put = (i: number, x: number) => {
      if (key[i] !== x) same = false;
      key[i] = x;
    };
    for (let i = 0; i < values.length; i++) put(i, values[i]!);
    // where the line ends, and how it goes out there (eased with the line: the one it is eased from has its own)
    const end = this.endOf(shown, now);
    if (shown.was && mix < 1) {
      const was = this.endOf(shown.was, now);
      end.to = was.to + (end.to - was.to) * mix;
      end.over = was.over + (end.over - was.over) * mix;
    }
    // On the map an orbit is drawn whole: on past the curve's end along the stretch of it already flown, a revolution
    // later, back to the vehicle (`round`: the curve's span, s). It does not stop short of the vehicle, nor go out. (The
    // vehicle drawn at the curve's very start too, as it is under thrust, where every prediction is made from the instant
    // on show: then the curve is the revolution, and nothing of it is gone round again.)
    const round = this.mapped && shown.frame === 'orbit' && shown.result.outcome === 'orbit' && this.shift === 0 ? t1 - t0 : 0;
    if (round) {
      end.to = now + round;
      end.over = 0;
    }
    const ends = (this.mesh.material as THREE.ShaderMaterial).uniforms.uEnds!.value as THREE.Vector4;
    ends.set(0, 0, end.to - shown.result.from, end.over);
    put(15, this.vessel.x);
    put(16, this.vessel.y);
    put(17, this.vessel.z);
    put(18, flown?.n ?? 0);
    put(19, flown ? flown.t[flown.n - 1]! : 0);
    // (and whether the line flown is drawn, which is sampled only then: its strength is set as the frame is drawn, after
    // this, so the eye gone out in one frame from where it is not drawn left it unsampled with nothing else to move, issue #179)
    put(20, this.flownAsAhead || this.drawn.flownOpacity > 0 ? 1 : 0);
    // the markers where the line has them now
    const a = this.markAt;
    const from = this.at3;
    for (const mk of this.marks) {
      from.set(mk.r);
      carried(from, 0, mk.t, shown.left, shown.leftAt);
      this.sceneOf(from, 0, mk.t + this.shift, shown.frame, now + this.shift, a, 0);
      mk.at.set(a[0]!, a[1]!, a[2]!);
    }
    // (and the ring where it comes down)
    const impact = shown.result.impact;
    const ringAt = this.ringMesh.userData.at as THREE.Vector3 | null;
    if (impact && ringAt) {
      from.set(impact.r);
      carried(from, 0, impact.t, shown.left, shown.leftAt);
      this.sceneOf(from, 0, impact.t, 'surface', 0, a, 0);
      ringAt.set(a[0]!, a[1]!, a[2]!);
    }
    this.lensEye[0] = eye.x;
    this.lensEye[1] = eye.y;
    this.lensEye[2] = eye.z;
    const lens = {
      eye: this.lensEye,
      pxPerRad: this.lineSize.y / 2 / tanHalf,
      near: 1.02 * camera.near,
    };
    // on the map: the vehicle's own marker where it is drawn, and what else flies
    this.layOthers(shown.frame, now + this.shift, lens, vessel ? this.vessel : null);
    this.layRef(shown.frame, now + this.shift, lens, vessel !== null, toShip);
    if (same) {
      this.hang();
      return;
    }
    this.sampledFor = shown.key + shown.frame;
    const began = performance.now();
    const anchor: [number, number, number] = vessel ? [this.vessel.x, this.vessel.y, this.vessel.z] : [p[0]!, p[1]!, p[2]!];
    // ahead: from the vehicle to the end
    const ahead = this.ahead;
    // (the orbit's closing stretch: the curve a revolution earlier, moved by what the curve's two ends differ by, the
    // Earth's bulge turning the orbit a little each time round, less and less of it toward the vehicle, so the line
    // neither steps where the curve ends nor misses the vehicle where it closes)
    const closing = new Float64Array(3);
    if (round) {
      this.alongAt(shown, t1, closing, 0, mix);
      this.alongAt(shown, t0, q, 0, mix);
      for (let k = 0; k < 3; k++) closing[k] = closing[k]! - q[k]!;
    }
    const along = (t: number, out: Float64Array, o: number) => {
      if (round && t > t1) {
        this.alongAt(shown, t - round, out, o, mix);
        const left = 1 - Math.min(1, (t - t1) / Math.max(now - t0, 1e-6));
        for (let k = 0; k < 3; k++) out[o + k] = out[o + k]! + closing[k]! * left;
      } else this.alongAt(shown, t, out, o, mix);
      if (pinned) {
        const w = weight(t - now);
        for (let k = 0; k < 3; k++) out[o + k] = out[o + k]! + pin[k]! * w;
      }
    };
    this.along = along;
    ahead.n = sample(along, c.t, now, round ? end.to : Math.min(t1, end.to), lens, MOST, ahead.t, ahead.p);
    upload(ahead, anchor, shown.result.from);
    // behind: the line flown, from its first point to the vehicle, in the frame the path is drawn in
    const behind = this.behind;
    behind.n = 0;
    this.alongFlown = null;
    const flownEnds = (this.flownMesh.material as THREE.ShaderMaterial).uniforms.uEnds!.value as THREE.Vector4;
    flownEnds.set(0, 0, 0, 0);
    // (not sampled while it is not drawn: from near the vehicle)
    if (flown && (this.flownAsAhead || this.drawn.flownOpacity > 0)) {
      // (to the vehicle: the samples heard end a few seconds behind where it is drawn, and from there the line ahead's
      // own curve, taken onto the vehicle as it is, carries it the rest of the way)
      // (the line flown is in the flight's own instants; the line ahead's are its curve's, whole revolutions back: `shift`)
      const shift = this.shift;
      const last = flown.t[flown.n - 1]!;
      const f1 = Math.max(now + shift, last);
      const v = this.at3;
      let hint = 0;
      const alongFlown = (t: number, out: Float64Array, o: number) => {
        if (t > last && t - shift >= t0) {
          along(t - shift, out, o);
          return;
        }
        hint = curveAt(flown, t, v, 0, hint);
        this.sceneOf(v, 0, t, shown.frame, now + shift, out, o);
        if (pinned) {
          const w = weight(f1 - t);
          for (let k = 0; k < 3; k++) out[o + k] = out[o + k]! + pin[k]! * w;
        }
      };
      this.alongFlown = alongFlown;
      behind.n = sample(alongFlown, flown.t, flown.t[0]!, f1, lens, FLOWN_MOST, behind.t, behind.p);
      // (its far end comes in from nothing, where the points kept begin)
      flownEnds.set(flown.t[0]!, Math.min(FLOWN_LEAD, 0.1 * (f1 - flown.t[0]!)), 0, 0);
    }
    upload(behind, anchor, 0);
    this.mesh.position.set(...anchor);
    this.hang();
    this.mesh.quaternion.identity();
    this.flownMesh.position.set(0, 0, 0);
    this.flownMesh.quaternion.identity();
    if (ringAt) this.ringMesh.position.copy(ringAt).sub(this.mesh.position);
    // how deep the line goes into the view (pathline.ts depthOf): from the vehicle, or the nearest of it, to the furthest of it
    let nearest = Number.POSITIVE_INFINITY;
    let furthest = 0;
    for (const line of [ahead, behind])
      for (let i = 0; i < line.n; i++) {
        const d = Math.hypot(line.p[i * 3]! - eye.x, line.p[i * 3 + 1]! - eye.y, line.p[i * 3 + 2]! - eye.z);
        nearest = Math.min(nearest, d);
        furthest = Math.max(furthest, d);
      }
    const depthFrom = Math.max(vessel ? Math.max(toShip, vessel.radius) : nearest, 1.02 * camera.near);
    if (Number.isFinite(depthFrom))
      (this.uniforms.uDepth!.value as THREE.Vector2).set(
        depthFrom,
        1 / Math.max(Math.log(Math.max(furthest, depthFrom) / depthFrom), Math.log(DEPTH_LEAST)),
      );
    this.drawn = {
      ahead: Math.max(0, ahead.n - 1),
      flown: Math.max(0, behind.n - 1),
      ms: performance.now() - began,
      now,
      pinned: pinned ? offset : 0,
      offset,
      gap,
      fade: vessel ? this.fadeOf(vessel.half, toShip, tanHalf) : 0,
      reach,
      end: end.to,
      endOver: end.over,
      flownOpacity: this.drawn.flownOpacity,
    };
    this.host.overlay(this.mesh);
  }

  /** Every marker there is to lay out: the path's own, and on the map the vehicle's and each other body's. */
  private every(): Mark[] {
    if (!this.craftMark && !this.others.size && !this.refMarks.length && !this.refApsis && !this.heavens.length) return this.marks;
    const all = [...this.marks, ...this.refMarks];
    if (this.refApsis) all.push(this.refApsis);
    if (this.craftMark) all.push(this.craftMark);
    for (const o of this.others.values()) all.push(o.mark);
    for (const h of this.heavens) all.push(h.mark);
    return all;
  }

  /** A marker of the map's own (the vehicle, another body): a glyph and a name, always ahead, never a chip. */
  private extraMark(kind: 'craft' | 'other' | 'ref' | 'body', id: string, name: string): Mark {
    return {
      id,
      kind,
      t: Number.POSITIVE_INFINITY,
      r: [0, 0, 0],
      figure: name,
      at: new THREE.Vector3(),
      el: this.markEl(kind),
      ex: 0,
      ey: 0,
      label: null,
      chip: this.chipOf(kind),
      words: unseen(),
      written: '',
    };
  }

  /**
   * On the map, each frame: the vehicle's marker where it is drawn, and each other thing that flies (`PathHost.others`: a
   * stage let go, the flight's target) with its marker and its line, in the frame the path is drawn in. Its line is the
   * way it came since it left (as the line flown, the last revolution or so) and, from above `OTHER_AIR`, the way it goes:
   * a coast under gravity alone from where it is, to where it comes down to that height, once round, or two hours (lower,
   * its flight is the air's, which is not predicted here, and it has no line ahead). The line is made again as the clock
   * goes on and cut into chords for the eye a few times a second: the chords stand in the scene, so between two cuttings
   * they are where they were, only as fine as the eye last needed. One that comes down is let go.
   */
  private layOthers(
    frame: 'surface' | 'orbit',
    t: number,
    lens: { eye: readonly [number, number, number]; pxPerRad: number; near: number },
    craft: THREE.Vector3 | null,
  ): void {
    if (this.limbMesh.visible !== this.mapped) {
      this.limbMesh.visible = this.mapped;
      this.limbFor[0] = Number.NaN;
    }
    if (!this.mapped) {
      if (this.craftMark || this.others.size || this.heavens.length) this.unmark();
      return;
    }
    this.outline(lens.eye);
    this.mapAt = t;
    this.layBodies(frame, t, lens);
    if (craft) {
      this.craftMark ??= this.extraMark('craft', 'craft', this.host.craftName ?? 'Vehicle');
      this.craftMark.at.copy(craft);
    } else if (this.craftMark) {
      this.craftMark.el.remove();
      this.craftMark.chip.el.remove();
      this.craftMark = null;
    }
    const list = this.host.others?.() ?? [];
    for (const [drop, o] of this.others)
      if (!list.some((x) => x.drop === drop && !x.down)) {
        this.dropOther(o);
        this.others.delete(drop);
      }
    const wall = performance.now();
    const a = this.markAt;
    for (const x of list) {
      if (x.down) continue;
      let o = this.others.get(x.drop);
      if (!o) {
        const line = ribbonGeometry(OTHER_MOST);
        const material = new THREE.ShaderMaterial({
          vertexShader: VERT,
          fragmentShader: FRAG,
          uniforms: {
            ...this.uniforms,
            uCore: { value: FLOWN_CORE },
            uColour: { value: new THREE.Color() },
            uOpacity: { value: 0.8 },
            uEnds: { value: new THREE.Vector4() },
          },
          defines: { FLOWN: '' },
          transparent: true,
          depthWrite: false,
          depthTest: false,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(line.geometry, material);
        mesh.name = `Path of ${x.name}`;
        mesh.frustumCulled = false;
        mesh.renderOrder = 10;
        mesh.raycast = () => {};
        mesh.layers.mask = this.mesh.layers.mask; // (drawn last with the rest: overlay.ts)
        // (drawn before the path's own lines: what they are all drawn with is worked out for the frame by whichever is first)
        mesh.onBeforeRender = (renderer, _scene, camera) => this.prepare(renderer, camera as THREE.PerspectiveCamera);
        this.mesh.add(mesh);
        o = {
          line,
          mesh,
          curve: null,
          lands: false,
          at: Number.NaN,
          made: 0,
          cut: 0,
          cutAt: t,
          cutFor: [Number.NaN, 0, 0],
          cutIn: frame,
          anchor: [0, 0, 0],
          mark: this.extraMark('other', `other${x.drop}`, x.name),
        };
        this.others.set(x.drop, o);
      }
      this.sceneOf(x.r, 0, t, frame, t, a, 0);
      o.mark.at.set(a[0]!, a[1]!, a[2]!);
      // its line: made again when the clock has gone back, or on by a hundredth of what it shows, at most twice a second
      const span = Math.min(FLOWN_SPAN, Math.max(0, t - x.from));
      if (!o.curve || t < o.at || (t - o.at > Math.max(1, 0.01 * span) && wall - o.made > OTHER_EVERY)) {
        const made = this.otherCurve(x, t, span);
        o.curve = made.curve;
        o.lands = made.lands;
        o.at = t;
        o.made = wall;
        o.cut = 0;
      }
      const c = o.curve;
      const eye = lens.eye;
      const moved = o.cutFor[0] !== eye[0] || o.cutFor[1] !== eye[1] || o.cutFor[2] !== eye[2] || o.cutIn !== frame;
      if (c && c.n > 1 && (o.cut === 0 || (moved && wall - o.cut > OTHER_CUT))) {
        o.cut = wall;
        o.cutAt = t;
        o.cutFor = [eye[0], eye[1], eye[2]];
        o.cutIn = frame;
        let hint = 0;
        const v = new Float64Array(3);
        const place = (at: number, out: Float64Array, p: number) => {
          hint = curveAt(c, at, v, 0, hint);
          this.sceneOf(v, 0, at, frame, t, out, p);
        };
        o.line.n = sample(place, c.t, c.t[0]!, c.t[c.n - 1]!, lens, OTHER_MOST, o.line.t, o.line.p);
        o.anchor = [a[0]!, a[1]!, a[2]!];
        upload(o.line, o.anchor, 0);
        // (the far end of the way it came comes in from nothing; the way it goes ends where it meets the air, or goes out)
        const ends = (o.mesh.material as THREE.ShaderMaterial).uniforms.uEnds!.value as THREE.Vector4;
        const t1 = c.t[c.n - 1]!;
        ends.set(c.t[0]!, Math.min(FLOWN_LEAD, 0.1 * (t - c.t[0]!)), t1, o.lands ? 0 : 0.08 * Math.max(0, t1 - t));
        this.host.overlay(this.mesh);
      }
      o.mesh.visible = Boolean(c && c.n > 1);
    }
  }

  /**
   * The record's run as the line of reference, made once (and again only if the samples it is given are others): the
   * deck's own (`PathSource.intended`), or the simulator's record of the flight (sim/run.ts `recordOf`, made once a
   * flight and by then made for the scene), from which its marks are found whichever gave the samples. Null for a
   * flight with no record to fly.
   */
  private reference(): Reference | null {
    const plan = this.flight.plan;
    const run = plan ? recordOf(this.flight) : null;
    const kept: readonly RefSample[] | undefined = this.source.intended?.() ?? run?.track();
    if (!kept || kept.length < 2) return null;
    if (this.ref && this.ref.of === kept && this.ref.n === kept.length) return this.ref;
    // (what a long coast let go of its samples put back, as close as it ever kept them: the curve is kept by its curvature
    // from them, and held to them. Not for a flight of so many days that the curve has fewer points than the run kept)
    const samples = filled(kept as readonly Sample[], REF_EVERY, REF_KNOTS) as readonly RefSample[];
    // (where it came down is marked only if it did: a run that ends still up, on its way to the Moon, has no such place)
    const end = run?.samples[run.samples.length - 1];
    const down = run && end && end.altitude < REF_AIR ? run.duration : Number.POSITIVE_INFINITY;
    const marks = run && plan ? recordMarks(run.events, (id) => eventOf(plan, id)?.do, run.samples, down, EARTH.gm.value, WGS84_A) : [];
    const curve = referenceCurve(
      samples,
      marks.map((m) => m.t),
    );
    let top = 0;
    for (let i = 0; i < curve.n; i++) top = Math.max(top, Math.hypot(curve.r[i * 3]!, curve.r[i * 3 + 1]!, curve.r[i * 3 + 2]!));
    for (const m of [...this.refMarks, ...(this.refApsis ? [this.refApsis] : [])]) {
      m.el.remove();
      m.chip.el.remove();
    }
    // its marks: each named by what the run does there; where it came down says how far from the pad
    const last = run?.samples[run.samples.length - 1];
    this.refMarks = marks.map((m, i) => ({
      ...this.extraMark('ref', `ref${i}`, m.kind === 'down' && last ? `${km(last.range)} km` : ''),
      name: REF_WORDS[m.kind],
      rank: REF_RANK[m.kind],
    }));
    const apses = apsesOf(curve);
    this.refApsis = apses.length
      ? { ...this.extraMark('ref', 'refAp', ''), name: REF_WORDS.apogee, rank: REF_RANK.apogee, off: true }
      : null;
    this.refKey.fill(Number.NaN);
    this.ref = { of: kept, n: kept.length, curve, sweep: sweepOf(curve), top, marks, apses };
    return this.ref;
  }

  /**
   * The record's line, each frame, whatever is or is not predicted: in `frame` (the prediction's on show; over the
   * turning ground with none) at the flight's instant `t`. What of the record is drawn follows the instant (pathref.ts
   * `windowOf`), by the line's ends in its shader; its chords are cut only between instants on a grid (`REF_GRID`) and
   * only when the eye has moved or, drawn as it lies among the stars, the Earth has turned under it: so on the pad, and
   * from a camera that stands, nothing of it is worked out again, and nothing the live flight does moves it. Its marks
   * are laid where the record has them, those ahead and within what is drawn.
   */
  private layRef(
    frame: 'surface' | 'orbit',
    t: number,
    lens: { eye: readonly [number, number, number]; pxPerRad: number; near: number },
    craft: boolean,
    toShip: number,
  ): void {
    const ref = this.reference();
    const mesh = this.refMesh;
    if (!ref || ref.curve.n < 2) {
      if (mesh.visible) {
        mesh.visible = false;
        this.host.overlay(this.mesh);
      }
      return;
    }
    const c = ref.curve;
    const t0 = c.t[0]!;
    const t1 = c.t[c.n - 1]!;
    const at = Math.min(t1, Math.max(t0, t));
    const v = this.refAt;
    let hint = curveAt(c, at, v, 0, 0);
    const short = overHorizon(Math.hypot(v[0]!, v[1]!, v[2]!), ref.top, WGS84_B) + TAIL_SHORT;
    const w = windowOf(c, ref.sweep, at, REF_BACK, short, TAIL_FADE);
    // (over the turning ground, no further than the stationary radius: beyond it the line would be the Earth's turning,
    // wound round it once a day, and not the record's way. Among the stars it is drawn whole)
    if (frame === 'surface' && ref.top > STATIONARY) {
      const leaves = this.leavesAt(c, Math.max(at, w.from), w.to);
      if (leaves < w.to) {
        w.over = Math.max(0, Math.min(leaves - Math.max(at, w.from), Math.max(w.over, 0.3 * (leaves - Math.max(at, w.from)))));
        w.to = leaves;
      }
    }
    if (!(w.to > w.from)) {
      if (mesh.visible) {
        mesh.visible = false;
        this.host.overlay(this.mesh);
      }
      for (const m of [...this.refMarks, ...(this.refApsis ? [this.refApsis] : [])]) m.off = true;
      return;
    }
    const a = Math.max(t0, Math.floor(w.from / REF_GRID) * REF_GRID);
    const b = Math.min(t1, Math.ceil(w.to / REF_GRID) * REF_GRID);
    const zero = Math.floor(a / REF_ZERO) * REF_ZERO;
    const own = (mesh.material as THREE.ShaderMaterial).uniforms;
    const ends = own.uEnds!.value as THREE.Vector4;
    const dashes = own.uRef!.value as THREE.Vector3;
    let moved = !mesh.visible;
    if (ends.x !== w.from - zero || ends.z !== w.to - zero || dashes.x !== t - zero) moved = true;
    ends.set(w.from - zero, w.lead, w.to - zero, w.over);
    dashes.x = t - zero;
    mesh.visible = true;
    // its marks where the record has them (the line ahead's instants are its curve's: `shift`)
    const p = this.markAt;
    const mark = (m: Mark, at: number): void => {
      m.t = at - this.shift;
      m.off = !(at > t && at <= w.to - 0.5 * w.over);
      if (m.off) return;
      hint = curveAt(c, at, v, 0, hint);
      this.sceneOf(v, 0, at, frame, t, p, 0);
      m.at.set(p[0]!, p[1]!, p[2]!);
    };
    for (let i = 0; i < this.refMarks.length; i++) mark(this.refMarks[i]!, ref.marks[i]!.t);
    const apsis = this.refApsis;
    if (apsis) {
      const next = ref.apses.find((x) => x > t);
      if (next === undefined) apsis.off = true;
      else {
        if (apsis.t + this.shift !== next) {
          // (its height over the sea: the record's own at the sample before, and how much further from the centre it is here)
          const run = recordOf(this.flight);
          const s = run?.at(next);
          curveAt(c, next, v, 0, hint);
          apsis.figure = s
            ? `${km(s.altitude + Math.hypot(v[0]!, v[1]!, v[2]!) - Math.hypot(...((s as RefSample).centre ?? s.r)))} km`
            : '';
        }
        mark(apsis, next);
      }
    }
    // what its chords were cut for: if none of it has moved, they stand
    const key = this.refKey;
    const values = [
      lens.eye[0],
      lens.eye[1],
      lens.eye[2],
      lens.pxPerRad,
      lens.near,
      a,
      b,
      frame === 'orbit' ? 1 : 0,
      frame === 'orbit' ? t : 0,
    ];
    let same = true;
    for (let i = 0; i < values.length; i++) {
      if (key[i] !== values[i]) same = false;
      key[i] = values[i]!;
    }
    if (same) {
      if (moved) this.host.overlay(this.mesh);
      return;
    }
    const began = performance.now();
    let h = 0;
    const along = (x: number, out: Float64Array, o: number) => {
      h = curveAt(c, x, v, 0, h);
      this.sceneOf(v, 0, x, frame, t, out, o);
    };
    this.refAlong = along;
    const line = this.intended;
    line.n = sample(along, c.t.subarray(0, c.n), a, b, lens, REF_MOST, line.t, line.p);
    if (craft) this.refAnchor = [this.vessel.x, this.vessel.y, this.vessel.z];
    else {
      along(at, p, 0);
      this.refAnchor = [p[0]!, p[1]!, p[2]!];
    }
    upload(line, this.refAnchor, zero);
    // how deep it goes into the view (pathline.ts depthOf): from the vehicle, or the nearest of it, to the furthest of it
    let nearest = Number.POSITIVE_INFINITY;
    let furthest = 0;
    for (let i = 0; i < line.n; i++) {
      const d = Math.hypot(line.p[i * 3]! - lens.eye[0], line.p[i * 3 + 1]! - lens.eye[1], line.p[i * 3 + 2]! - lens.eye[2]);
      nearest = Math.min(nearest, d);
      furthest = Math.max(furthest, d);
    }
    const depthFrom = Math.max(craft ? toShip : nearest, lens.near);
    if (Number.isFinite(depthFrom))
      (own.uDepth!.value as THREE.Vector2).set(
        depthFrom,
        1 / Math.max(Math.log(Math.max(furthest, depthFrom) / depthFrom), Math.log(DEPTH_LEAST)),
      );
    this.drawnRef = {
      chords: Math.max(0, line.n - 1),
      ms: performance.now() - began,
      from: w.from,
      to: w.to,
      frame,
      marks: this.refMarks.length + (apsis ? 1 : 0),
    };
    this.host.overlay(this.mesh);
  }
  private readonly refAt = new Float64Array(3);

  /** The first of a curve's own instants from `from` to `to` at which it is beyond the stationary radius (`to` if it is not, in that stretch). */
  private leavesAt(c: Curve, from: number, to: number): number {
    for (let i = pieceOf(c, from); i < c.n && c.t[i]! <= to; i++)
      if (Math.hypot(c.r[i * 3]!, c.r[i * 3 + 1]!, c.r[i * 3 + 2]!) > STATIONARY) return Math.max(from, c.t[i]!);
    return to;
  }

  /**
   * With nothing predicted, on the map: whether what is drawn (the record's line as far as it is drawn from here, and the
   * flight where it is) reaches beyond the stationary radius, and so is drawn as it lies among the stars.
   */
  private bareHigh(t: number, s: PathSample): boolean {
    const r = s.centre ?? s.r;
    if (Math.hypot(r[0], r[1], r[2]) > STATIONARY) return true;
    const ref = this.reference();
    if (!ref || ref.curve.n < 2 || ref.top <= STATIONARY) return false;
    const c = ref.curve;
    const at = Math.min(c.t[c.n - 1]!, Math.max(c.t[0]!, t));
    const v = this.refAt;
    curveAt(c, at, v, 0, 0);
    const short = overHorizon(Math.hypot(v[0]!, v[1]!, v[2]!), ref.top, WGS84_B) + TAIL_SHORT;
    const w = windowOf(c, ref.sweep, at, REF_BACK, short, TAIL_FADE);
    return this.leavesAt(c, w.from, w.to) < w.to;
  }

  /**
   * With no prediction to draw (on the pad with guidance off and nothing lit, or down): what needs none is laid all the
   * same, each frame, at the flight's instant and over the turning ground. The line flown from its first point to the
   * vehicle (from far out and on the map, as ever), the record's line (`layRef`), and on the map the Earth's outline, the
   * vehicle's marker and whatever else flies (`layOthers`). The line ahead's own ribbon is empty.
   */
  private layBare(): void {
    const camera = this.camera;
    const s = this.sample;
    if (!camera || !s) return;
    const vessel = this.host.vessel(this.vessel, this.vesselAxis);
    const eye = camera.position;
    const tanHalf = Math.tan((camera.fov * Math.PI) / 360) / Math.max(camera.zoom, 1e-6);
    const toShip = vessel ? this.vessel.distanceTo(eye) : Number.POSITIVE_INFINITY;
    const now = s.t;
    this.now = now;
    this.shift = 0;
    // (over the turning ground; on the map, what reaches beyond the stationary radius as it lies among the stars: `frameFor`)
    const frame = this.mapped && this.bareHigh(now, s) ? 'orbit' : 'surface';
    // (standing on the pad nothing flies, and the stage has no vehicle to give: the flight's own place is where it is)
    if (!vessel) {
      this.sceneOf(s.centre ?? s.r, 0, now, 'surface', now, this.markAt, 0);
      this.vessel.set(this.markAt[0]!, this.markAt[1]!, this.markAt[2]!);
    }
    const flown = this.flownNow();
    const e = camera.quaternion;
    const m = camera.projectionMatrix.elements;
    const key = this.keyNow;
    const values = [eye.x, eye.y, eye.z, e.x, e.y, e.z, e.w, m[0]!, m[5]!, m[8]!, m[9]!, camera.near, this.lineSize.y, now, 1];
    values.push(this.vessel.x, this.vessel.y, this.vessel.z, flown?.n ?? 0, flown ? flown.t[flown.n - 1]! : 0);
    values.push(this.flownAsAhead || this.drawn.flownOpacity > 0 ? 1 : 0);
    let same = this.sampledFor === `bare${frame}`;
    for (let i = 0; i < values.length; i++) {
      if (key[i] !== values[i]) same = false;
      key[i] = values[i]!;
    }
    this.lensEye[0] = eye.x;
    this.lensEye[1] = eye.y;
    this.lensEye[2] = eye.z;
    const lens = { eye: this.lensEye, pxPerRad: this.lineSize.y / 2 / tanHalf, near: 1.02 * camera.near };
    this.layOthers(frame, now, lens, this.vessel);
    this.layRef(frame, now, lens, true, this.vessel.distanceTo(eye));
    if (same) {
      this.hang();
      return;
    }
    this.sampledFor = `bare${frame}`;
    const began = performance.now();
    const anchor: [number, number, number] = [this.vessel.x, this.vessel.y, this.vessel.z];
    const behind = this.behind;
    behind.n = 0;
    this.alongFlown = null;
    const flownEnds = (this.flownMesh.material as THREE.ShaderMaterial).uniforms.uEnds!.value as THREE.Vector4;
    flownEnds.set(0, 0, 0, 0);
    // (not sampled while it is not drawn: from near the vehicle)
    if (flown && (this.flownAsAhead || this.drawn.flownOpacity > 0)) {
      const v = this.at3;
      let hint = 0;
      const alongFlown = (t: number, out: Float64Array, o: number) => {
        hint = curveAt(flown, t, v, 0, hint);
        this.sceneOf(v, 0, t, frame, now, out, o);
      };
      this.alongFlown = alongFlown;
      const f1 = flown.t[flown.n - 1]!;
      behind.n = sample(alongFlown, flown.t, flown.t[0]!, f1, lens, FLOWN_MOST, behind.t, behind.p);
      flownEnds.set(flown.t[0]!, Math.min(FLOWN_LEAD, 0.1 * (f1 - flown.t[0]!)), 0, 0);
    }
    upload(behind, anchor, 0);
    this.mesh.position.set(...anchor);
    this.hang();
    this.mesh.quaternion.identity();
    this.flownMesh.position.set(0, 0, 0);
    this.flownMesh.quaternion.identity();
    let nearest = Number.POSITIVE_INFINITY;
    let furthest = 0;
    for (let i = 0; i < behind.n; i++) {
      const d = Math.hypot(behind.p[i * 3]! - eye.x, behind.p[i * 3 + 1]! - eye.y, behind.p[i * 3 + 2]! - eye.z);
      nearest = Math.min(nearest, d);
      furthest = Math.max(furthest, d);
    }
    const depthFrom = Math.max(vessel ? Math.max(toShip, vessel.radius) : nearest, 1.02 * camera.near);
    if (Number.isFinite(depthFrom))
      (this.uniforms.uDepth!.value as THREE.Vector2).set(
        depthFrom,
        1 / Math.max(Math.log(Math.max(furthest, depthFrom) / depthFrom), Math.log(DEPTH_LEAST)),
      );
    this.drawn = {
      ahead: 0,
      flown: Math.max(0, behind.n - 1),
      ms: performance.now() - began,
      now,
      pinned: 0,
      offset: 0,
      gap: vessel ? this.gapOf(vessel.half, toShip, tanHalf) : 0,
      fade: vessel ? this.fadeOf(vessel.half, toShip, tanHalf) : 0,
      reach: 0,
      end: now,
      endOver: 0,
      flownOpacity: this.drawn.flownOpacity,
    };
    this.host.overlay(this.mesh);
  }

  /**
   * The Earth's outline as the eye sees it (`LIMB`): the circle in which the cone from the eye touches a ball `LIMB_OVER`
   * over the Earth's equatorial radius, which is a circle of that ball square to the line from its centre to the eye.
   */
  private readonly limbN = new THREE.Vector3();
  private readonly limbU = new THREE.Vector3();
  private readonly limbV = new THREE.Vector3();
  private outline(eye: readonly [number, number, number]): void {
    // (drawn again only when the eye has moved)
    const was = this.limbFor;
    if (was[0] === eye[0] && was[1] === eye[1] && was[2] === eye[2]) return;
    was[0] = eye[0];
    was[1] = eye[1];
    was[2] = eye[2];
    const c = this.centre;
    const n = this.limbN.set(eye[0] - c.x, eye[1] - c.y, eye[2] - c.z);
    const d = n.length();
    const rho = WGS84_A + LIMB_OVER;
    if (!(d > 1.001 * rho)) {
      this.limb.geometry.setDrawRange(0, 0); // (from inside that ball there is no outline to draw)
      return;
    }
    n.divideScalar(d);
    const u = this.limbU.crossVectors(n, Math.abs(n.y) < 0.9 ? UP : RIGHT).normalize();
    const v = this.limbV.crossVectors(n, u);
    const along = (rho * rho) / d;
    const radius = rho * Math.sqrt(1 - (rho * rho) / (d * d));
    const at: [number, number, number] = [c.x + n.x * along, c.y + n.y * along, c.z + n.z * along];
    const line = this.limb;
    for (let i = 0; i <= LIMB; i++) {
      const a = (2 * Math.PI * i) / LIMB;
      const x = Math.cos(a) * radius;
      const y = Math.sin(a) * radius;
      line.t[i] = 0;
      line.p[i * 3] = at[0] + u.x * x + v.x * y;
      line.p[i * 3 + 1] = at[1] + u.y * x + v.y * y;
      line.p[i * 3 + 2] = at[2] + u.z * x + v.z * y;
    }
    line.n = LIMB + 1;
    upload(line, at, 0, true);
    this.limbAt = at;
    this.host.overlay(this.mesh);
  }
  /** The eye the outline was last drawn for, and the place its points are measured from. */
  private readonly limbFor: [number, number, number] = [Number.NaN, 0, 0];
  private limbAt: [number, number, number] = [0, 0, 0];

  /**
   * The map's own lines hung where they belong under the path's mesh, which stands at the vehicle: each is measured from
   * a place of its own (the Earth's outline from its middle, another body's line from where that body was when its
   * chords were cut), so they are put there again whenever the path's mesh has moved. After the mesh is placed, never
   * before: hung from where it stood a frame ago, they were out by as far as the vehicle went in that frame.
   */
  private hang(): void {
    const m = this.mesh.position;
    // (and the record's line, measured from where the vehicle was when its chords were last cut)
    this.refMesh.position.set(this.refAnchor[0] - m.x, this.refAnchor[1] - m.y, this.refAnchor[2] - m.z);
    if (!this.mapped) return;
    this.limbMesh.position.set(this.limbAt[0] - m.x, this.limbAt[1] - m.y, this.limbAt[2] - m.z);
    for (const h of this.heavens) {
      h.discMesh.position.set(h.discAt[0] - m.x, h.discAt[1] - m.y, h.discAt[2] - m.z);
      h.meetMesh.position.set(h.meetAt[0] - m.x, h.meetAt[1] - m.y, h.meetAt[2] - m.z);
      h.wayMesh.position.set(h.wayAt[0] - m.x, h.wayAt[1] - m.y, h.wayAt[2] - m.z);
    }
    const c = this.centre;
    for (const o of this.others.values()) {
      // (chords cut as the line lay among the stars at one instant are, at a later one, where the Earth's turn since has
      // left them in the scene, which is fixed to the Earth: turned back about its axis by that much)
      const turned = o.cutIn === 'orbit' ? this.earth.angle(this.mapAt) - this.earth.angle(o.cutAt) : 0;
      o.mesh.quaternion.setFromAxisAngle(this.pole, -turned);
      const at = this.hung.set(o.anchor[0] - c.x, o.anchor[1] - c.y, o.anchor[2] - c.z).applyQuaternion(o.mesh.quaternion);
      o.mesh.position.set(at.x + c.x - m.x, at.y + c.y - m.y, at.z + c.z - m.z);
    }
  }
  private readonly hung = new THREE.Vector3();
  /** The flight's instant the map's lines were last laid for. */
  private mapAt = 0;

  /** Another body's line as a curve in the frame that does not turn (`layOthers`): the way it came over the last `span` seconds, then the way it goes from above the air. */
  private otherCurve(x: OtherCraft, t: number, span: number): { curve: Curve | null; lands: boolean } {
    const points: { t: number; r: Vec3; v: Vec3 }[] = [];
    const n = Math.max(1, Math.min(OTHER_KEPT, Math.ceil(span)));
    for (let i = 0; i < n && span > 0; i++) {
      const at = t - span + (span * i) / n;
      const was = this.host.otherAt?.(x.drop, at);
      if (was) points.push({ t: at, r: was.r, v: was.v });
    }
    points.push({ t, r: x.r, v: x.v });
    // its height over the ellipsoid, near enough (the radius of the ellipsoid along the line to it)
    const height = (r: Vec3): number => {
      const d = Math.hypot(r[0], r[1], r[2]);
      const s = r[2] / Math.max(d, 1);
      return d - (WGS84_A * WGS84_B) / Math.hypot(WGS84_B * Math.sqrt(1 - s * s), WGS84_A * s);
    };
    let lands = false;
    if (height(x.r) > OTHER_AIR) {
      let state = { r: x.r, v: x.v };
      let turned = 0;
      for (let i = 1; i <= OTHER_STEPS; i++) {
        const next = step(state, t + (i - 1) * OTHER_STEP, OTHER_STEP);
        const cos =
          (state.r[0] * next.r[0] + state.r[1] * next.r[1] + state.r[2] * next.r[2]) / (Math.hypot(...state.r) * Math.hypot(...next.r));
        turned += Math.acos(Math.min(1, Math.max(-1, cos)));
        state = next;
        points.push({ t: t + i * OTHER_STEP, r: state.r, v: state.v });
        if (height(state.r) <= OTHER_AIR) {
          lands = true;
          break;
        }
        if (turned >= 2 * Math.PI) break;
      }
    }
    return { curve: points.length > 1 ? curveOf(points) : null, lands };
  }

  /** Where the line ahead, as last sampled, has instant `t` in the scene's frame (the curve it was cut from): for the path test. */
  where(t: number): number[] {
    const out = new Float64Array(3);
    this.along?.(t, out, 0);
    return [...out];
  }
  private along: ((t: number, out: Float64Array, o: number) => void) | null = null;
  /** The same of the line flown. */
  flownWhere(t: number): number[] {
    const out = new Float64Array(3);
    this.alongFlown?.(t, out, 0);
    return [...out];
  }
  private alongFlown: ((t: number, out: Float64Array, o: number) => void) | null = null;

  /** The line ahead as last sampled, in the scene's frame: for the path test (`sr.path.line()`). */
  line(): { t: number[]; p: number[]; flown: number[]; flownT: number[]; ref: number[]; refT: number[] } {
    // (nothing on show, nothing to give: the buffers keep the last line drawn)
    if (!this.mesh.visible) return { t: [], p: [], flown: [], flownT: [], ref: [], refT: [] };
    const ahead = this.shown ? this.ahead.n : 0;
    const ref = this.refMesh.visible ? this.intended.n : 0;
    return {
      t: [...this.ahead.t.subarray(0, ahead)],
      p: [...this.ahead.p.subarray(0, ahead * 3)],
      flown: [...this.behind.p.subarray(0, this.behind.n * 3)],
      flownT: [...this.behind.t.subarray(0, this.behind.n)],
      ref: [...this.intended.p.subarray(0, ref * 3)],
      refT: [...this.intended.t.subarray(0, ref)],
    };
  }
  /** Where the record's line, as last sampled, has the record's instant `t` in the scene's frame: for the path test. */
  refWhere(t: number): number[] {
    const out = new Float64Array(3);
    this.refAlong?.(t, out, 0);
    return [...out];
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
    const flown = (this.flownMesh.material as THREE.ShaderMaterial).uniforms;
    flown.uCore!.value = (this.flownAsAhead ? CORE : FLOWN_CORE) * ratio;
    // the frame is exposed for the hour (daysky.ts) after this is drawn: the line is given what comes out as its colour whatever that is
    const exposure = 0.9 / Math.max(0.05, renderer.toneMappingExposure);
    const cel = this.host.look === 'cel';
    u.uCel!.value = cel ? 1 : 0;
    (u.uColour!.value as THREE.Color).copy(amber).multiplyScalar(exposure);
    (u.uInk!.value as THREE.Color).copy(ink).multiplyScalar(exposure);
    (flown.uColour!.value as THREE.Color).copy(this.flownAsAhead ? amber : pale).multiplyScalar(exposure);

    // the eye and the vehicle in the scene's frame (in the draw the scene stands with the eye at its origin: origin.ts)
    const eye = absolute(this.eye.copy(camera.position));
    const vessel = this.host.vessel(this.ship, this.axis2);
    const radius = vessel?.radius ?? null;
    const ship = this.ship;
    const toShip = radius === null ? Number.POSITIVE_INFINITY : ship.distanceTo(eye);
    const aboard = radius !== null && toShip < 1.2 * radius;
    // the line flown: only from far out, where the whole flight is seen (from near the vehicle a line behind it is read as
    // the path, whatever it is drawn in), coming in as the eye goes out
    const k = Math.min(1, Math.max(0, (toShip - FLOWN_NEAR) / (FLOWN_FAR - FLOWN_NEAR)));
    const away = radius === null || this.mapped ? 1 : k * k * (3 - 2 * k);
    const outline = (this.limbMesh.material as THREE.ShaderMaterial).uniforms;
    outline.uCore!.value = FLOWN_CORE * ratio;
    (outline.uColour!.value as THREE.Color).copy(limbColour).multiplyScalar(exposure);
    for (const o of this.others.values()) {
      const own = (o.mesh.material as THREE.ShaderMaterial).uniforms;
      own.uCore!.value = FLOWN_CORE * ratio;
      (own.uColour!.value as THREE.Color).copy(other).multiplyScalar(exposure);
    }
    for (const h of this.heavens)
      for (const [mesh, strength] of [
        [h.discMesh, 1 - h.drawn],
        [h.meetMesh, 0.6],
        [h.wayMesh, 0.6],
      ] as const) {
        const own = (mesh.material as THREE.ShaderMaterial).uniforms;
        own.uCore!.value = FLOWN_CORE * ratio;
        (own.uColour!.value as THREE.Color).copy(moonGrey).multiplyScalar(exposure);
        own.uOpacity!.value = BODY_OPACITY * strength * h.strength;
      }
    flown.uOpacity!.value = this.flownAsAhead ? u.uOpacity!.value : FLOWN_OPACITY * away;
    // the record's line: its colour and widths on this target, and what the flight has passed of it only from far out, as the line flown
    const ref = (this.refMesh.material as THREE.ShaderMaterial).uniforms;
    ref.uCore!.value = REF_CORE * ratio;
    (ref.uColour!.value as THREE.Color).copy(plan).multiplyScalar(exposure);
    const dashes = ref.uRef!.value as THREE.Vector3;
    dashes.y = away;
    dashes.z = REF_DASH * ratio;
    this.refKeyRow(this.refMesh.visible);
    this.drawn.flownOpacity = this.flownAsAhead ? 1 : away;
    this.flownKey(away > 0 && this.flownMesh.visible && this.behind.n > 1);
    const tanHalf = Math.tan((camera.fov * Math.PI) / 360) / Math.max(camera.zoom, 1e-6);
    // (just past the near plane, which stands at half the way to the nearest thing: Stage.fitDepth; and from inside the
    // vehicle, nothing within its own radius: the line is seen through the windows and never in the cabin, even while the
    // vehicle drawn is still catching up with the flight after the clock has run fast and the line starts where the
    // flight is, metres off)
    u.uClip!.value = Math.max(1.02 * camera.near, aboard && radius !== null ? radius : 0);
    u.uGap!.value = vessel === null ? 1 : this.gapOf(vessel.half, toShip, tanHalf);
    u.uFade!.value = vessel === null ? 1 : this.fadeOf(vessel.half, toShip, tanHalf);
    u.uPxPerRad!.value = this.size.y / 2 / tanHalf;
    // the Earth's centre and the vehicle in the view's frame, worked out in doubles
    this.unturn.copy(camera.quaternion).invert();
    (u.uCentre!.value as THREE.Vector3).copy(this.centre).sub(eye).applyQuaternion(this.unturn);
    (u.uPole!.value as THREE.Vector3).copy(this.pole).applyQuaternion(this.unturn);
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
    // (on the map the vehicle is a point with a marker on it: nothing is kept off its outline)
    if (vessel && !aboard && !this.mapped) {
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
    if (this.marksEl.hidden) return;
    const aboard = this.host.aboard?.() === true;
    const now = this.now;
    const rect = this.rect;
    const ins: MarkIn[] = [];
    // (the record's own marks: laid after all the rest and round them, by how far across the screen they reach themselves)
    const refIns: MarkIn[] = [];
    const refBox = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
    const chips: ChipIn[] = [];
    const where = new Map<string, { x: number; y: number }>();
    const next = this.marks.find((m) => m.t > now && !m.off && m.kind !== 'apogee' && m.kind !== 'perigee')?.id;
    let x0 = Number.POSITIVE_INFINITY;
    let x1 = Number.NEGATIVE_INFINITY;
    let y0 = Number.POSITIVE_INFINITY;
    let y1 = Number.NEGATIVE_INFINITY;
    const centre = this.centre.toArray();
    const eyeAt = eye.toArray();
    const width = this.charWidth || 7;
    const pxPerRad = this.uniforms.uPxPerRad!.value as number;
    for (const m of this.every()) {
      if (m.t <= now || m.off) continue;
      const scene = m.at;
      // behind the Earth? (laid on its place all the same, dimmed: it is in view, the Earth is in front of it)
      const hidden = limbPx(eyeAt, scene.toArray(), centre, WGS84_A, pxPerRad, this.poleAt, WGS84_B) < 0;
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
      const rank = m.rank ?? KINDS[m.kind][1] + (m.id === next ? NEXT : 0);
      if (m.kind === 'ref') {
        if (!aboard && front && Math.abs(clip.x / clip.w) <= 1.5 && Math.abs(clip.y / clip.w) <= 1.5) {
          refBox[0] = Math.min(refBox[0]!, x);
          refBox[1] = Math.max(refBox[1]!, x);
          refBox[2] = Math.min(refBox[2]!, y);
          refBox[3] = Math.max(refBox[3]!, y);
          where.set(m.id, { x, y });
          refIns.push({ id: m.id, x, y, rank, w, h: 18 });
        }
        continue;
      }
      if (!aboard && front && Math.abs(clip.x / clip.w) <= 1.5 && Math.abs(clip.y / clip.w) <= 1.5) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
        where.set(m.id, { x, y });
        ins.push({ id: m.id, x, y, rank, w, h: 18 });
      }
      // a chip for the few that matter now: the apsides ahead, the next event, where it ends
      if (m.kind === 'apogee' || m.kind === 'perigee' || m.kind === 'pass' || m.kind === 'down' || m.kind === 'impact' || m.id === next)
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
    this.laidAt = this.drawnAt;
    this.laidCurrent = this.panelsRead > 0;
    this.laid = new Map(out.marks.map((o) => [o.id, o]));
    if (refIns.length) {
      // (what is laid already is in their way as a panel is: the prediction's markers and chips, the vehicle's, another body's)
      const taken = [...field.panels];
      for (const o of out.marks) {
        const at = where.get(o.id);
        if (o.glyph && at) taken.push({ x0: at.x - GLYPH, y0: at.y - GLYPH, x1: at.x + GLYPH, y1: at.y + GLYPH });
        if (o.box) taken.push(o.box);
      }
      for (const c of out.chips) if (c.box) taken.push(c.box);
      const refSpan = Math.max(refBox[1]! - refBox[0]!, refBox[3]! - refBox[2]!);
      for (const o of layMarks(refIns, { ...field, panels: taken }, refSpan, this.laidRef)) this.laid.set(o.id, o);
      this.laidRef = new Map(refIns.map((m) => [m.id, this.laid.get(m.id)!]));
    } else if (this.laidRef.size) this.laidRef = new Map();
    this.chipsLaid = new Map(out.chips.map((c) => [c.id, c]));
    for (const m of this.every()) {
      const o = this.laid.get(m.id);
      const at = where.get(m.id);
      const glyph = Boolean(o?.glyph && at);
      // (the map's own markers are places: the vehicle's and another body's glyph is drawn wherever it is in view, and
      // its name where the layout has room for it)
      const place = m.kind === 'craft' || m.kind === 'other' || m.kind === 'body';
      m.el.classList.toggle('gone', place ? !at : !glyph);
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
   * Whether the markers' words stand where the layout last put them, laid out against the panels as they stand: every
   * fade between the label and the chip over, every chip drawn at its place (none fading out to come in elsewhere). For
   * the path test, which measures what is drawn only then: the layout keeps a chip's way round and its slide from one
   * frame to the next (pathmarks.ts `layChips`), so where a chip stands while it eases depends on where it came from,
   * and only the place it settles at is held to the rules.
   */
  chipsSettled(): boolean {
    if (this.marksEl.hidden) return true;
    if (!this.laidCurrent || this.laidAt < 0) return false;
    // (the panels laid against are the panels there are now: asked of the page here, which only the test calls)
    if (!sameBoxes(boxesOf(this.obstacles()), this.panels) || !sameRect(this.host.viewRect(), this.rect)) {
      this.panelsRead = 0;
      this.laidCurrent = false;
      return false;
    }
    for (const m of this.every()) {
      const w = m.words;
      const ahead = m.t > this.now && !m.off;
      const label = ahead && m.label !== null;
      const chip = ahead && !label && m.chip.want !== null;
      if (w.label.op !== (label ? 1 : 0) || w.chip.op !== (chip ? 1 : 0)) return false;
      if (chip && (w.leap || w.chip.x !== m.chip.want!.x || w.chip.y !== m.chip.want!.y)) return false;
    }
    return true;
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
    for (const m of this.every()) {
      const c = m.chip;
      const w = m.words;
      const ahead = on && m.t > this.now && !m.off;
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

  /** The legend's word for the line flown, shown while it is drawn (from far out). */
  private flownKey(on: boolean): void {
    const row = this.readout.querySelector<HTMLElement>('[data-path-row=flown]');
    if (row && row.hidden === on) row.hidden = !on;
  }

  /** The legend's word for the record's line, shown while it is drawn. */
  private refKeyRow(on: boolean): void {
    const row = this.readout.querySelector<HTMLElement>('[data-path-row=ref]');
    if (row && row.hidden === on) row.hidden = !on;
  }

  /** What a marker says: its name, its figure, and how long until it. */
  private words(m: Mark, now: number): string {
    if (m.kind === 'craft' || m.kind === 'other' || m.kind === 'body') return `<b>${esc(m.figure)}</b>`;
    if (m.kind === 'ref' || m.kind === 'pass')
      return `<b>${esc(m.name ?? '')}</b>${m.figure ? ` ${m.figure}` : ''} <em>${clock(m.t - now)}</em>`;
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
    const on = this.on || this.mapped;
    const choosing = on && this.choosing();
    row('kind', choosing);
    for (const b of this.readout.querySelectorAll<HTMLElement>('[data-path=guided], [data-path=coast]'))
      b.setAttribute('aria-pressed', String((b.dataset.path === 'guided') === this.guided));
    const sequencer = this.source.steering.sequence !== false;
    // (a deck that predicts for itself says what its path is)
    const own = !this.ballistic ? (this.source.pathAs ?? null) : null;
    set(
      'as',
      !on
        ? 'off'
        : stale
          ? 'working…'
          : this.waiting()
            ? this.source.steering.guidance
              ? 'as planned'
              : 'by hand'
            : choosing
              ? ''
              : own
                ? own.short
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
    as.title = !on
      ? ''
      : stale
        ? 'The display is waiting for an updated path and has received none in the last 1.5 seconds'
        : this.waiting()
          ? this.source.steering.guidance
            ? 'On the pad: the path guidance will fly, the record’s programme to the record’s cutoff, then the sequencer’s events'
            : 'Guidance is off (G): nothing is predicted until the engine is lit. The dashed line is the record’s flight, to be flown by hand'
          : own
            ? own.long
            : this.burning() && !choosing
              ? 'The path if the engine were cut now (guidance is off, so there is no plan to show)'
              : !this.live
                ? 'Looking back at what was flown: the path from that instant with nothing done by the pilot or the sequencer, the parachutes coming out at their heights'
                : sequencer
                  ? 'What happens from here if the pilot does nothing more: the sequencer sets off each event at the record’s time, and the parachutes come out at their heights'
                  : 'The sequencer is off (B): nothing happens by itself, no retrofire and no parachute, so the path falls as it is';
    row('apogee', on);
    row('end', on);
    // (the nearest it comes to another body ahead, as it is marked on the line; one it meets is how the path ends, below)
    const pass = result?.passes.find((p) => p.t > now && !p.strikes);
    row('pass', on && Boolean(pass));
    if (pass) {
      set('passName', pass.body);
      set('pass', `${km(pass.height)} km · ${clock(pass.t - now)}`);
    }
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
      end.title = `Once round in this time, lowest at this height. Drawn ${this.mapped ? 'on the map as it lies among the stars' : this.frame === 'orbit' ? 'in the frame that does not turn (O)' : 'over the turning Earth (O)'}`;
    } else if (result.impact) {
      set('endName', result.chute ? 'Down' : 'Impact');
      set('end', `${km(result.impact.range)} km · ${clock(result.impact.t - now)}`);
      end.title = result.chute
        ? 'Where it comes down under its parachute: the distance from the pad over the ground, and how long until then'
        : 'Where it meets the surface with no parachute out: the distance from the pad over the ground, and how long until then';
    } else if (result.outcome === 'strike' && result.passes.length) {
      const struck = result.passes[result.passes.length - 1]!;
      set('endName', struck.body);
      set('end', `impact · ${clock(struck.t - now)}`);
      end.title = 'Where it meets the surface of another body, and how long until then';
    } else if (result.outcome === 'escape') {
      set('endName', 'End');
      set('end', `leaves the Earth · ${clock(result.points[result.points.length - 1]!.t - now)}`);
      end.title = 'It passes out of the Earth’s sphere of influence, 925,000 km from its centre, and is followed no further';
    } else {
      set('endName', 'End');
      set('end', `not within ${spanOf(result.horizon)}`);
      end.title =
        'It neither comes down nor comes round in the time looked ahead, which is as long as the orbit it is on takes to go round';
    }
  }

  /**
   * On the map, each frame: each other body (the Moon) where it is, once the eye is far enough out for it to be a place
   * on the map (`BODY_FROM`). Its marker by its name, its outline to scale; and, while the path on show passes it and is
   * drawn as it lies among the stars, its way from now to the passing and its outline where it will be then, so the
   * path is seen to go to where the Moon is going, not to where it is. Its place is the one the prediction's gravity
   * takes (sim/core/gravity.ts: DE440's where it is loaded, else Meeus's). Laid again only when the eye, the instant,
   * the frame or the passing has changed.
   */
  private layBodies(
    frame: 'surface' | 'orbit',
    t: number,
    lens: { eye: readonly [number, number, number]; pxPerRad: number; near: number },
  ): void {
    if (!this.heavens.length) {
      const body = moonOnEarthFlight(this.earth).body;
      if (body) this.heavens = [this.heavenly(body)];
    }
    const eye = lens.eye;
    const c = this.centre;
    const out = Math.hypot(eye[0] - c.x, eye[1] - c.y, eye[2] - c.z);
    const a = this.markAt;
    for (const h of this.heavens) {
      const r = h.body.where(t);
      const k = Math.min(1, Math.max(0, (out / Math.hypot(r[0], r[1], r[2]) - BODY_FROM) / (BODY_FULL - BODY_FROM)));
      h.strength = k * k * (3 - 2 * k);
      const on = h.strength > 0;
      // (the next passing of it ahead on the path on show, where that is drawn among the stars: over the turning ground a
      // place days ahead is wound round the Earth)
      const shown = this.shown;
      const pass =
        on && frame === 'orbit' && shown ? shown.result.passes.find((p) => p.body === h.body.name && p.t + this.shift > t) : undefined;
      if (h.discMesh.visible !== on || h.meetMesh.visible !== Boolean(pass)) {
        h.discMesh.visible = on;
        h.meetMesh.visible = h.wayMesh.visible = Boolean(pass);
        h.key[0] = Number.NaN;
        this.host.overlay(this.mesh);
      }
      h.mark.off = !on;
      if (!on) continue;
      this.sceneOf(r, 0, t, frame, t, a, 0);
      h.mark.at.set(a[0]!, a[1]!, a[2]!);
      // (the Moon itself drawn there, lit, once it is more than a few pixels across: its outline where it is now is let go,
      // and its marker, its outline where the path passes it and its way there are kept, which mark a place to come)
      const across =
        (2 * h.body.radius * lens.pxPerRad) / Math.max(h.body.radius, Math.hypot(a[0]! - eye[0], a[1]! - eye[1], a[2]! - eye[2]));
      h.drawn = THREE.MathUtils.smoothstep(across, 4, 8) * (this.host.moonCovers?.() ?? 0);
      const key = [eye[0], eye[1], eye[2], t, frame === 'orbit' ? 1 : 0, pass ? pass.t : -1, pass ? pass.distance : -1];
      if (key.every((x, i) => x === h.key[i])) continue;
      h.key = key;
      h.discAt = this.ringRound(h.disc, [a[0]!, a[1]!, a[2]!], h.body.radius, eye);
      if (pass) {
        const at = pass.t + this.shift;
        this.sceneOf(pass.centre, 0, at, frame, t, a, 0);
        h.meetAt = this.ringRound(h.meet, [a[0]!, a[1]!, a[2]!], h.body.radius, eye);
        // its way there: its own places from now to then, each with the way it is going
        const span = Math.max(1, at - t);
        const curve = curveOf(
          Array.from({ length: BODY_KNOTS + 1 }, (_, i) => {
            const x = t + (span * i) / BODY_KNOTS;
            const [p, q] = [h.body.where(x + 1), h.body.where(x - 1)];
            return { t: x, r: h.body.where(x), v: [(p[0] - q[0]) / 2, (p[1] - q[1]) / 2, (p[2] - q[2]) / 2] as Vec3 };
          }),
        );
        let hint = 0;
        const v = new Float64Array(3);
        const place = (x: number, into: Float64Array, o: number) => {
          hint = curveAt(curve, x, v, 0, hint);
          this.sceneOf(v, 0, x, frame, t, into, o);
        };
        h.way.n = sample(place, curve.t, t, t + span, lens, BODY_MOST, h.way.t, h.way.p);
        h.wayAt = [h.discAt[0], h.discAt[1], h.discAt[2]];
        upload(h.way, h.wayAt, t);
        // (it leaves the body's outline and comes in to the one it will have: neither end is cut square)
        ((h.wayMesh.material as THREE.ShaderMaterial).uniforms.uEnds!.value as THREE.Vector4).set(0, 0.04 * span, span, 0.04 * span);
      }
      this.host.overlay(this.mesh);
    }
  }

  /** Another body as the map draws it: its marker and its three lines, hung under the path's mesh with the map's other lines. */
  private heavenly(body: Passed): Heavenly {
    const line = (chords: number, name: string): [Line, THREE.Mesh] => {
      const made = ribbonGeometry(chords);
      const material = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          ...this.uniforms,
          uCore: { value: FLOWN_CORE },
          uColour: { value: new THREE.Color() },
          uOpacity: { value: BODY_OPACITY },
          // (no ends: a Vector4 begins with a 1 in its last place, which would be an end to go out by)
          uEnds: { value: new THREE.Vector4(0, 0, 0, 0) },
        },
        defines: { FLOWN: '' },
        transparent: true,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(made.geometry, material);
      mesh.name = name;
      mesh.frustumCulled = false;
      mesh.renderOrder = 9;
      mesh.raycast = () => {};
      mesh.visible = false;
      mesh.layers.mask = this.mesh.layers.mask; // (drawn last with the rest: overlay.ts)
      mesh.onBeforeRender = (renderer, _scene, camera) => this.prepare(renderer, camera as THREE.PerspectiveCamera);
      this.mesh.add(mesh);
      return [made, mesh];
    };
    const [disc, discMesh] = line(BODY_RING, `The ${body.name}’s outline on the map`);
    const [meet, meetMesh] = line(BODY_RING, `The ${body.name}’s outline where the path passes it`);
    const [way, wayMesh] = line(BODY_MOST, `The ${body.name}’s way to where the path passes it`);
    const mark = this.extraMark('body', `body${body.name}`, body.name);
    mark.off = true;
    return {
      body,
      mark,
      disc,
      discMesh,
      discAt: [0, 0, 0],
      meet,
      meetMesh,
      meetAt: [0, 0, 0],
      way,
      wayMesh,
      wayAt: [0, 0, 0],
      key: [],
      strength: 0,
      drawn: 0,
    };
  }

  /**
   * A ball's outline as the eye sees it, into a line of `BODY_RING` chords: the circle in which the cone from the eye
   * touches the ball, as the Earth's own is drawn (`outline`). The place its points are measured from.
   */
  private ringRound(
    line: Line,
    centre: readonly [number, number, number],
    radius: number,
    eye: readonly [number, number, number],
  ): [number, number, number] {
    const n = this.limbN.set(eye[0] - centre[0], eye[1] - centre[1], eye[2] - centre[2]);
    const d = n.length();
    if (!(d > 1.001 * radius)) {
      line.geometry.setDrawRange(0, 0);
      return [centre[0], centre[1], centre[2]];
    }
    n.divideScalar(d);
    const u = this.limbU.crossVectors(n, Math.abs(n.y) < 0.9 ? UP : RIGHT).normalize();
    const v = this.limbV.crossVectors(n, u);
    const along = (radius * radius) / d;
    const across = radius * Math.sqrt(1 - (radius * radius) / (d * d));
    const at: [number, number, number] = [centre[0] + n.x * along, centre[1] + n.y * along, centre[2] + n.z * along];
    for (let i = 0; i <= BODY_RING; i++) {
      const angle = (2 * Math.PI * i) / BODY_RING;
      const x = Math.cos(angle) * across;
      const y = Math.sin(angle) * across;
      line.t[i] = 0;
      line.p[i * 3] = at[0] + u.x * x + v.x * y;
      line.p[i * 3 + 1] = at[1] + u.y * x + v.y * y;
      line.p[i * 3 + 2] = at[2] + u.z * x + v.z * y;
    }
    line.n = BODY_RING + 1;
    upload(line, at, 0, true);
    return at;
  }
}

/** How far ahead a prediction looked, in words: the six hours of the least, else hours, or days from two of them. */
function spanOf(seconds: number): string {
  const hours = seconds / 3600;
  if (Math.abs(hours - 6) < 1e-6) return 'six hours';
  return hours < 48 ? `${Math.round(hours)} hours` : `${Math.round(hours / 24)} days`;
}

/** Where the panels on show are, in the window. */
function boxesOf(panels: readonly Element[]): Box[] {
  return panels
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0)
    .map((p) => ({ x0: p.left, y0: p.top, x1: p.right, y1: p.bottom }));
}
const sameBoxes = (a: readonly Box[], b: readonly Box[]): boolean =>
  a.length === b.length && a.every((x, i) => x.x0 === b[i]!.x0 && x.y0 === b[i]!.y0 && x.x1 === b[i]!.x1 && x.y1 === b[i]!.y1);
const sameRect = (a: DOMRect, b: DOMRect): boolean => a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;

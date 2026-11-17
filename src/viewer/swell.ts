/**
 * The sea where a flight comes down, drawn as it moved: a square of the day's sea round the point (`Globe.swell`), its
 * surface the same function of the instant and the place the simulator floats the capsule on (sim/sea.ts `surfaceAt`),
 * so what rides it rides the swell that is drawn and its waterline is the sea's.
 *
 * The square is a mesh of its own, laid on the sea's surface (the ellipsoid raised to the sea's level, as the globe's
 * is) and drawn by the globe's own shading (globe.ts `shade`): its colour, its light and its glint are the globe's, and
 * the globe leaves the square to it (a `Hole`). Its waves are put on it two ways: its points are raised by them where
 * the mesh is fine enough to carry them, and every pixel is lit by their slope where they are larger than it. Both die
 * away to nothing by its edge (and by the size of a pixel, for the slope): there it is the globe's level sea, in the
 * same light, so the two are one surface with no seam and no step.
 *
 * Designed, not photographic: the waves are the record's trains, each one clean long-crested sine (sim/sea.ts), and in
 * the light alone the short waves on them (`chopOf`), sines too, as many as a sea's glitter needs and with the slope
 * the hour's wind gives; no noise or foam laid on to look like a photograph of the sea. In the cel look the trains'
 * slopes and a few short waves fall into its flat tones (`RIPPLES`), so the swell is drawn as bands.
 */
import * as THREE from 'three';
import { surfaceAt, type Wave } from '../sim/sea.ts';
import { G0 } from '../world/bodies.ts';
import { add, cross, dot, scale, sub, unit, type Vec3 } from '../world/frames.ts';
import { ellipsoidNormal, seaPoint } from '../world/surface.ts';

/** Half the square's side, metres: past the swell's crests as a helicopter or the chase camera sees them, chosen. */
export const SWELL_HALF = 2000;
/** The square's mesh: segments a side, and the share of its spacing that is even (the rest grows outward as the cube). */
const SEGMENTS = 160;
const EVEN = 0.03;
/** How far in from its edge, as a share of `SWELL_HALF`, the waves have died away (from the first share to the second): chosen. */
const FADE = [0.55, 0.95] as const;

/** Where the mesh's `u`, -1 to 1, falls across the square, metres from its middle; and the spacing of its points there. */
const spread = (u: number): number => SWELL_HALF * (EVEN * u + (1 - EVEN) * u * u * u);
const pitch = (u: number): number => (SWELL_HALF * (EVEN + 3 * (1 - EVEN) * u * u) * 2) / SEGMENTS;

/** The square's mesh, its points to be filled for a place by `fillSwell`. */
export function swellGeometry(): THREE.BufferGeometry {
  const n = SEGMENTS + 1;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * n * 3), 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * n * 3), 3));
  geometry.setAttribute('aEarth', new THREE.BufferAttribute(new Float32Array(n * n * 3), 3));
  const swell = new Float32Array(n * n * 3);
  const index: number[] = [];
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const [u, v] = [(2 * i) / SEGMENTS - 1, (2 * j) / SEGMENTS - 1];
      swell.set([spread(u), spread(v), Math.max(pitch(u), pitch(v))], (j * n + i) * 3);
      if (i < SEGMENTS && j < SEGMENTS) {
        const a = j * n + i;
        index.push(a, a + 1, a + n, a + 1, a + n + 1, a + n); // (counter-clockwise seen from above: east, then north)
      }
    }
  geometry.setAttribute('aSwell', new THREE.BufferAttribute(swell, 3));
  geometry.setIndex(index);
  return geometry;
}

/** The square laid round a point of the sea: where its middle is, and its east, north and up, in the scene's frame. */
export interface SwellFrame {
  anchor: Vec3;
  east: Vec3;
  north: Vec3;
  up: Vec3;
}

/**
 * Lay the square's mesh round `centre` (ECEF, on the sea), on the sea `seaLevel` m over the ellipsoid: each point east and
 * north of the middle along the sea's surface, put on it (seaPoint), with the sea's normal there and its direction from
 * the Earth's centre, in the scene's frame (`toSite`, `toSiteDirection`), relative to the middle.
 */
export function fillSwell(
  geometry: THREE.BufferGeometry,
  centre: Vec3,
  seaLevel: number,
  toSite: (q: Vec3) => Vec3,
  toSiteDirection: (d: Vec3) => Vec3,
): SwellFrame {
  const up = ellipsoidNormal(centre);
  const east = unit(cross([0, 0, 1], up));
  const north = cross(up, east);
  const anchor = toSite(centre);
  const swell = geometry.getAttribute('aSwell').array as Float32Array;
  const positions = geometry.getAttribute('position').array as Float32Array;
  const normals = geometry.getAttribute('normal').array as Float32Array;
  const earth = geometry.getAttribute('aEarth').array as Float32Array;
  for (let k = 0; k < swell.length; k += 3) {
    const q = seaPoint(add(centre, add(scale(east, swell[k]!), scale(north, swell[k + 1]!))), seaLevel);
    const p = sub(toSite(q), anchor);
    const n = toSiteDirection(ellipsoidNormal(q));
    const d = unit(q);
    positions.set(p, k);
    normals.set(n, k);
    earth.set(d, k);
  }
  for (const name of ['position', 'normal', 'aEarth']) geometry.getAttribute(name).needsUpdate = true;
  geometry.computeBoundingSphere();
  return { anchor, east: toSiteDirection(east), north: toSiteDirection(north), up: toSiteDirection(up) };
}

/** From the scene's frame to the square's own (east, up, north), whose middle is its origin: the globe's `Hole.frame` for it. */
export function swellHoleFrame(f: SwellFrame, out: THREE.Matrix4): THREE.Matrix4 {
  const v = (a: Vec3) => new THREE.Vector3(a[0], a[1], a[2]);
  return out.makeBasis(v(f.east), v(f.up), v(f.north)).setPosition(v(f.anchor)).invert();
}

/** A float as GLSL text. */
const f = (x: number) => (Number.isInteger(x) ? x.toFixed(1) : x.toPrecision(9));

/**
 * GLSL for both stages: `vec3 swellAt(vec2 p, float size)`, the surface's height over still water at `p` (metres east and
 * north of the middle) at the instant `uSwellT` (seconds from the instant its trains are counted from), with its slope
 * east and north, of the trains larger than `size` metres (a mesh's spacing, a pixel's footprint): each smaller one fades
 * out between a third and an eighth of its length, and all of them toward the square's edge. The trains are sim/sea.ts's,
 * as text: the day's sea is written into the shader, not handed to it (rendering.md, "A day is written into the shaders").
 */
export function swellGlsl(waves: readonly Wave[], size: [number, number], short = false): string {
  const terms = (list: readonly Wave[], scale = '', by = size) =>
    list
      .map((w) => {
        const length = (2 * Math.PI) / Math.hypot(w.k[0], w.k[1]);
        return /* glsl */ `
    {
      float keep = 1.0 - smoothstep(${f(length / by[0])}, ${f(length / by[1])}, size);
      float theta = ${f(w.omega)} * uSwellT - ${f(w.k[0])} * p.x - ${f(w.k[1])} * p.y + ${f(w.phase)};
      float a = ${f(w.a)} * keep${scale};
      s += vec3(a * cos(theta), a * sin(theta) * vec2(${f(w.k[0])}, ${f(w.k[1])}));
    }`;
      })
      .join('');
  // (the short waves, for the light only: in the drawn look the few that fall into its bands, in the real look the day's chop)
  const shorts = short
    ? `
    #ifdef TOON${terms(ripplesOf(waves))}
    #else${terms(chopOf(waves), ' * uSwellChop', CHOP_FADE)}
    #endif`
    : '';
  return /* glsl */ `
  uniform float uSwellT;   // seconds from the instant the trains are counted from (Globe.swellAt)
  uniform vec3 uSwellEast, uSwellNorth;   // the square's east and north, in the scene's frame
  uniform float uSwellChop;   // the short waves' root-mean-square slope at the hour's wind (chopSlope)
  vec3 swellAt(vec2 p, float size) {
    vec3 s = vec3(0.0);${terms(waves)}${shorts}
    return s * (1.0 - smoothstep(${f(FADE[0] * SWELL_HALF)}, ${f(FADE[1] * SWELL_HALF)}, length(p)));
  }`;
}

/**
 * The drawn look's short waves on the shortest of the day's trains, which nothing rides: a few, so they fall into its
 * flat tones as bands. Each is that train's direction turned by `turn` degrees, at `period` of its period (so a
 * deep-water wave of that period), and `steep` high for its length (amplitude times wavenumber). For the light only, in
 * the fragment. Estimated: chosen to look right, not read off any record. (The real look draws the chop: `chopOf`.)
 */
const RIPPLES = [
  { turn: -35, period: 0.55, steep: 0.03 },
  { turn: 30, period: 0.42, steep: 0.025 },
  { turn: 5, period: 0.3, steep: 0.02 },
] as const;

function ripplesOf(waves: readonly Wave[]): Wave[] {
  const shortest = waves.reduce<Wave | null>((a, w) => (a && a.omega > w.omega ? a : w), null);
  if (!shortest) return [];
  const k0 = Math.hypot(shortest.k[0], shortest.k[1]);
  const along = Math.atan2(shortest.k[0], shortest.k[1]);
  return RIPPLES.map((r, i) => {
    const k = k0 / (r.period * r.period);
    const b = along + (r.turn * Math.PI) / 180;
    return { a: r.steep / k, omega: shortest.omega / r.period, k: [k * Math.sin(b), k * Math.cos(b)], phase: 1.3 + 2.39996 * i };
  });
}

/**
 * The real look's short waves, which nothing rides: a real sea is a spread of waves, of which the record's trains are
 * the long ones, and its glitter is the Sun in the facets of the short ones. A few sines laid over the trains crossed
 * them in a lattice that showed as a checkerboard in the glitter; this is a spread of `CHOP` of them (40), so many and so
 * scattered in length and heading that no two are in step anywhere and no pattern repeats in the square. Their lengths
 * run evenly in the logarithm from `CHOP_LONG` of the shortest train's down to `CHOP_SHORT`, each nudged off its even
 * place; their headings lie round that train's (the waves the wind raised), most near it and a few far out to either
 * side (`CHOP_SPREAD`); their phases a golden angle apart. Each carries an even share of the slope (a saturated sea's
 * slope is spread evenly over the octaves of its length), so that together their root-mean-square slope is 1, and the
 * shader scales them by the hour's (`uSwellChop`: chopSlope). Each moves as a wave of its length on deep water, surface
 * tension included. For the light only, in the fragment: no point is raised by them and the simulator does not know
 * them. All of it estimated: the count, the lengths, the spread and the share per octave are chosen, and only their
 * slope together is the record's wind's, through Cox and Munk.
 */
const CHOP = 40;
/**
 * The chop's fade by a pixel's size: a wave is whole where six pixels or more span its length and gone at three. Nearer
 * the pixel than that (the trains' fade, four to one and a half) the shortest of them beat against the pixels in a fine
 * woven grain, which the glitter of a real sea never shows.
 */
const CHOP_FADE: [number, number] = [6, 3];
/** The longest of the chop, as a share of the shortest train's length; the shortest, metres (a few centimetres: the ripples a breath of wind raises). */
const CHOP_LONG = 0.8;
const CHOP_SHORT = 0.04;
/** Degrees either side of the shortest train's heading the chop's headings reach. */
const CHOP_SPREAD = 80;
/** Surface tension over density of sea water, m^3/s^2: what makes a ripple of a few centimetres outrun gravity's wave. */
const TENSION = 7.4e-5;

export function chopOf(waves: readonly Wave[]): Wave[] {
  const shortest = waves.reduce<Wave | null>((a, w) => (a && a.omega > w.omega ? a : w), null);
  if (!shortest) return [];
  const along = Math.atan2(shortest.k[0], shortest.k[1]);
  const long = CHOP_LONG * ((2 * Math.PI) / Math.hypot(shortest.k[0], shortest.k[1]));
  const golden = (Math.sqrt(5) - 1) / 2;
  const steep = Math.sqrt(2 / CHOP);
  return Array.from({ length: CHOP }, (_, i) => {
    // (two sequences that never fall in step: the length's nudge on the square root of 2, the heading on the golden ratio)
    const nudge = ((i * Math.SQRT2) % 1) - 0.5;
    const length = long * (CHOP_SHORT / long) ** ((i + 0.5 + 0.8 * nudge) / CHOP);
    const u = 2 * ((0.5 + i * golden) % 1) - 1;
    const b = along + (CHOP_SPREAD * Math.sign(u) * Math.abs(u) ** 1.5 * Math.PI) / 180;
    const k = (2 * Math.PI) / length;
    return {
      a: steep / k,
      omega: Math.sqrt(G0 * k + TENSION * k * k * k),
      k: [k * Math.sin(b), k * Math.cos(b)],
      phase: 0.7 + 2.39996 * i,
    };
  });
}

/**
 * The chop's root-mean-square slope for a sea whose waves' slopes have a mean square of `slopes` in all (globe.ts
 * `seaSlopes`, Cox and Munk at the hour's wind): what the trains do not carry themselves (a sine's mean square slope is
 * half its amplitude times wavenumber, squared). Estimated, as the chop is.
 */
export function chopSlope(slopes: number, waves: readonly Wave[]): number {
  const trains = waves.reduce((sum, w) => sum + (w.a * Math.hypot(w.k[0], w.k[1])) ** 2 / 2, 0);
  return Math.sqrt(Math.max(slopes - trains, 0));
}

/** The trains' fade by size, for the mesh's points (a train shows in the mesh where its spacing is under a sixth of it) and for a pixel's slope (under a quarter). */
export const MESH_FADE: [number, number] = [6, 3];
export const PIXEL_FADE: [number, number] = [4, 1.5];

/**
 * The drawn sea's height over still water at a point `p` of the scene, at `t` seconds from the trains' instant: the
 * simulator's surface (sim/sea.ts `surfaceAt`) faded toward the square's edge as it is drawn. What the camera stays over.
 */
export function swellHeight(f: SwellFrame, waves: readonly Wave[], t: number, p: Vec3): number {
  const d = sub(p, f.anchor);
  const [e, n] = [dot(d, f.east), dot(d, f.north)];
  const fade = 1 - THREE.MathUtils.smoothstep(Math.hypot(e, n), FADE[0] * SWELL_HALF, FADE[1] * SWELL_HALF);
  return fade > 0 ? fade * surfaceAt(waves, t, e, n).height : 0;
}

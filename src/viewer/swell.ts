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
 * Designed, not photographic: the waves are the record's trains, each one clean long-crested sine (sim/sea.ts), with
 * no noise or foam laid on to look like a photograph of the sea; in the cel look the same slopes fall into its flat
 * tones, so the swell is drawn as bands.
 */
import * as THREE from 'three';
import { surfaceAt, type Wave } from '../sim/sea.ts';
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
export function swellGlsl(waves: readonly Wave[], size: [number, number], ripples = false): string {
  const terms = [...waves, ...(ripples ? ripplesOf(waves) : [])]
    .map((w) => {
      const length = (2 * Math.PI) / Math.hypot(w.k[0], w.k[1]);
      return /* glsl */ `
    {
      float keep = 1.0 - smoothstep(${f(length / size[0])}, ${f(length / size[1])}, size);
      float theta = ${f(w.omega)} * uSwellT - ${f(w.k[0])} * p.x - ${f(w.k[1])} * p.y + ${f(w.phase)};
      float a = ${f(w.a)} * keep;
      s += vec3(a * cos(theta), a * sin(theta) * vec2(${f(w.k[0])}, ${f(w.k[1])}));
    }`;
    })
    .join('');
  return /* glsl */ `
  uniform float uSwellT;   // seconds from the instant the trains are counted from (Globe.swellAt)
  uniform vec3 uSwellEast, uSwellNorth;   // the square's east and north, in the scene's frame
  vec3 swellAt(vec2 p, float size) {
    vec3 s = vec3(0.0);${terms}
    return s * (1.0 - smoothstep(${f(FADE[0] * SWELL_HALF)}, ${f(FADE[1] * SWELL_HALF)}, length(p)));
  }`;
}

/**
 * Short waves drawn on the shortest of the day's trains, which nothing rides: a real sea is a spread of waves, of which
 * the record's trains are the long ones, and one sine for each left the water near the eye as smooth as oil. Each is
 * that train's direction turned by `turn` degrees, at `period` of its period (so a deep-water wave of that period), and
 * `steep` high for its length (amplitude times wavenumber). For the light only, in the fragment: no point is raised by
 * them and the simulator does not know them. Estimated: chosen so the sea near the eye has the grain of a moderate
 * breeze's chop, not read off any record.
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

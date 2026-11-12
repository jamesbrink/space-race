import * as THREE from 'three';
import { LC5 } from '../../missions/usa/mercury/sites/lc-5.ts';
import { type Air, type Clouds, driftClouds, installAir } from './air';
import { buildCape1961, CLEARINGS, COAST, HARBOR_EAST, HARBOR_WEST, INDIAN, RIVER, RIVER_WEST, shoreAt } from './cape1961';
import { fbm2 } from './field';
import { Flora, type FloraSpec } from './flora';
import { Land, type LandSpec, type Palette } from './land';

/**
 * Cape Canaveral round Launch Complex 5, May 1961, as scenery: the ground the complex stands on,
 * out to the horizon. Everything here is laid out on the compass, in metres from pad 5: +X is
 * east (the Atlantic), -Z north. The pad model has its own frame (the capsule's hatch on +X,
 * the service structure's rails along Z), which lies at an angle to the compass; COMPASS turns
 * the one into the other, and the whole site is turned by it.
 *
 * The complex itself (the blockhouse, pad 6, the track, the huts, the parked cars) is not here: it
 * is modelled in Blender like the pad, in the pad's frame (Flight.surroundings; sites/lc-5.md).
 * Nor is the rest of the Cape's hardware: the other complexes, the lighthouse and the line of the
 * shore are cape1961.ts, each at its published place. This file is the land itself, as parameters
 * to the machinery in land.ts (the ground) and flora.ts (what grows on it): which communities
 * grow where, the colours of sand, grass and leaf, the roads, and the sea.
 *
 * What is documented and what is estimated is set out in missions/usa/mercury/sites/lc-5.md,
 * "The land". In short: the shore and the complexes' places are documented; the plant
 * communities, their order from the sea and their heights are published descriptions of the
 * Cape's vegetation; the clearing round Complex 5/6 is its fence line on the period's site plan;
 * the firebreaks, the colours and every density are read off photographs of 1961 to 1965 or
 * chosen by eye.
 */

/**
 * The pad model's frame on the compass: its +X (the hatch) faces 295 degrees, west-north-west, so the compass frame's
 * +X (east, 090) is 205 degrees round from it. Radians about the vertical, from the site's own record.
 */
export const COMPASS = THREE.MathUtils.degToRad(LC5.bearingX.value - 90);
const COS = Math.cos(COMPASS);
const SIN = Math.sin(COMPASS);
/** A direction on the compass (bearing in degrees), as a point `distance` metres along it. */
const bearing = (degrees: number, distance: number): [number, number] => {
  const a = THREE.MathUtils.degToRad(degrees);
  return [distance * Math.sin(a), -distance * Math.cos(a)];
};
const FT = 0.3048;
/** A point given in the pad model's own frame, in feet as its scripts have it (x toward the hatch side, y along the rails to the south-south-west), on the compass. */
const site = (x: number, y: number): [number, number] => [x * FT * COS + y * FT * SIN, x * FT * SIN - y * FT * COS];
const RAIL = 25; // the structure's track runs 025/205 degrees, through pads 5 and 6 and on to complex 26

/** Ground the modelled complex stands on, where nothing grows: [x, y, radius] in the pad model's feet. */
const KEPT: [number, number, number][] = [
  [212, -283, 104], // the blockhouse, the ready rooms and their paving
  [238, -192, 30], // the hut behind it and its transformer yard
  [300, -155, 34], // the hut by the road
  [137, -107, 26], // the generator building
  [50, -262, 24], // the shed by the track
  [-92, -148, 38], // the cable racks
  [-148, -140, 14], // the scaffold stair
];
/** Strips kept clear the same way: the two cable trenches and the turnout's curve, as [x0, y0, x1, y1, half-width] in feet. */
const STRIPS: [number, number, number, number, number][] = [
  [100, -99, 178, -241, 10],
  [100, -421, 178, -281, 10],
  [-10, -185, -40, -290, 26],
  [-40, -290, -95, -360, 26],
  [-95, -360, -150, -410, 26],
];

/** The neighbouring pads, each in its own clearing. */
const NEAR = CLEARINGS.filter(([x, z]) => Math.hypot(x, z) < 4000);
const FAR = 11000; // how far the ground is drawn: past Complex 34, 9.2 km up the coast

/** Made ways, as [x0, z0, x1, z1, half-width, kind]: 0 the rail line's ballast, 1 shell road. Drawn in the terrain's shader: no geometry to fight with. */
const TRACKS: [number, number, number, number, number, number][] = [
  [...bearing(RAIL + 180, 95), ...bearing(RAIL, 700), 4.2, 0], // the rail line's ballast, on past pad 6 to Complex 26's two pads
  [...site(166, 0), ...site(404, 0), 4.0, 1], // the stub road from the foot of the apron's ramp
  // the perimeter road just inside the fence, all round: TM X-53107 Figure 7-6 (the MR site plan), which matches
  // today's roads (OSM ways 1220192254, 1219671682) within 6 m; the side behind the blockhouse is F16_016's. Derived
  [...site(404, 394), ...site(404, -909), 3.6, 1],
  [...site(-407, 394), ...site(-407, -909), 3.6, 1],
  [...site(-407, 394), ...site(404, 394), 3.6, 1],
  [...site(-407, -909), ...site(404, -909), 3.6, 1],
  [...site(404, -215), ...site(293, -215), 3.2, 1], // the drive in to the blockhouse,
  [...site(293, -215), ...site(293, -349), 3.4, 1], // past its back door,
  [...site(293, -349), ...site(404, -349), 3.2, 1], // and out again
  [...site(276, -147), ...site(404, -147), 4.4, 1], // the hut's parking
];

/** A colour as an sRGB hex (three converts it to its linear working space). */
const srgb = (hex: number) => new THREE.Color(hex);
/**
 * The ground's colours: estimated. Hues from period colour photographs of the Cape (docs/sources.md, The Cape), then
 * cleaned as the look asks (AGENTS.md, Designed, not photographic): each cover one clear tone, lighter and more saturated
 * than a photograph's, so sand, grass and scrub read apart from any height.
 */
const PALETTE: Palette = {
  sand: srgb(0xd9cfae),
  sandDark: srgb(0xbdb08a),
  herbDry: srgb(0xa9a566),
  herbGreen: srgb(0x7c9450),
  litter: srgb(0x4a4332),
  leaf: srgb(0x35532f),
  leafLit: srgb(0x648a45),
  leafOther: srgb(0x577a3a),
};
const glsl3 = (c: THREE.Color) => `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`;

/** GLSL both the cover's bake and the terrain's shader use: the shore, the ways, the clearings. */
const SHARED = /* glsl */ `
  uniform vec2 uCoast[${COAST.length}];   // the Atlantic shore: (metres north, metres east) of pad 5, northward
  uniform vec2 uRiver[${RIVER.length}];   // the Banana River's east shore, the same way
  uniform vec2 uRiverWest[${RIVER_WEST.length}];   // its west shore, Merritt Island's east
  uniform vec2 uIndian[${INDIAN.length}];   // the Indian River's east shore, Merritt Island's west
  uniform vec2 uHarborWest[${HARBOR_WEST.length}];   // Newfound Harbor's west shore
  uniform vec2 uHarborEast[${HARBOR_EAST.length}];   // and its east
  uniform vec4 uTracks[${TRACKS.length}];
  uniform vec2 uTrackKind[${TRACKS.length}];   // half-width, kind
  uniform vec3 uClear[${NEAR.length}];    // the neighbouring pads: (x, z, radius of the pad itself)
  uniform vec3 uSites[${CLEARINGS.length}];   // every complex placed, and the lighthouse: the ground is flat round each
  uniform vec3 uKept[${KEPT.length}];     // ground the complex's models stand on: (x, z, radius), metres
  uniform vec4 uStrips[${STRIPS.length}];
  uniform float uStripWidth[${STRIPS.length}];
  float coastAt(float north) {
    float x = uCoast[0].y;
    for (int i = 0; i < ${COAST.length - 1}; i++)
      if (north >= uCoast[i].x) x = mix(uCoast[i].y, uCoast[i + 1].y, clamp((north - uCoast[i].x) / (uCoast[i + 1].x - uCoast[i].x), 0.0, 1.0));
    return x;
  }
  float riverAt(float north) {
    float x = uRiver[0].y;
    for (int i = 0; i < ${RIVER.length - 1}; i++)
      if (north >= uRiver[i].x) x = mix(uRiver[i].y, uRiver[i + 1].y, clamp((north - uRiver[i].x) / (uRiver[i + 1].x - uRiver[i].x), 0.0, 1.0));
    return x;
  }
  float riverWestAt(float north) {
    float x = uRiverWest[0].y;
    for (int i = 0; i < ${RIVER_WEST.length - 1}; i++)
      if (north >= uRiverWest[i].x) x = mix(uRiverWest[i].y, uRiverWest[i + 1].y, clamp((north - uRiverWest[i].x) / (uRiverWest[i + 1].x - uRiverWest[i].x), 0.0, 1.0));
    return x;
  }
  float indianAt(float north) {
    float x = uIndian[0].y;
    for (int i = 0; i < ${INDIAN.length - 1}; i++)
      if (north >= uIndian[i].x) x = mix(uIndian[i].y, uIndian[i + 1].y, clamp((north - uIndian[i].x) / (uIndian[i + 1].x - uIndian[i].x), 0.0, 1.0));
    return x;
  }
  float harborWestAt(float north) {
    float x = uHarborWest[0].y;
    for (int i = 0; i < ${HARBOR_WEST.length - 1}; i++)
      if (north >= uHarborWest[i].x) x = mix(uHarborWest[i].y, uHarborWest[i + 1].y, clamp((north - uHarborWest[i].x) / (uHarborWest[i + 1].x - uHarborWest[i].x), 0.0, 1.0));
    return x;
  }
  float harborEastAt(float north) {
    float x = uHarborEast[0].y;
    for (int i = 0; i < ${HARBOR_EAST.length - 1}; i++)
      if (north >= uHarborEast[i].x) x = mix(uHarborEast[i].y, uHarborEast[i + 1].y, clamp((north - uHarborEast[i].x) / (uHarborEast[i + 1].x - uHarborEast[i].x), 0.0, 1.0));
    return x;
  }
  float segment(vec2 p, vec4 s) {
    vec2 a = s.xy, b = s.zw, ab = b - a;
    return length(p - a - ab * clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0));
  }
  // a point on the compass, in the pad model's frame (metres)
  vec2 toPad(vec2 p) { return vec2(p.x * ${COS.toFixed(6)} + p.y * ${SIN.toFixed(6)}, -p.x * ${SIN.toFixed(6)} + p.y * ${COS.toFixed(6)}); }
  // metres inland of the surf line: the Cape's own shore (cape1961.ts), wandering a little about it
  float inland(vec2 p) { return coastAt(-p.y) - p.x + 26.0 * (fbm2(vec2(p.y * 0.006, 4.0), 5, 3) - 0.45); }
  // metres from the nearest river's shore, out of the water (negative in it): the Banana River between its two shores, the Indian River west of its east one,
  // Newfound Harbor between its two
  float riverward(vec2 p) {
    float n = -p.y;
    float d = min(min(max(p.x - riverAt(n), riverWestAt(n) - p.x), p.x - indianAt(n)), max(harborWestAt(n) - p.x, p.x - harborEastAt(n)));
    return d - 30.0 * (fbm2(p * 0.0035, 6, 3) - 0.45);
  }
  // the nearest made way: how far from its edge (negative inside), and its kind
  float way(vec2 p, out float kind) {
    float best = 1e9;
    kind = 1.0;
    for (int i = 0; i < ${TRACKS.length}; i++) {
      float d = segment(p, uTracks[i]) - uTrackKind[i].x;
      if (d < best) { best = d; kind = uTrackKind[i].y; }
    }
    return best;
  }
  // the firebreaks: sand lines through the scrub on a grid square to the rails, some lengths of it not cut
  float firebreak(vec2 p) {
    vec2 rail = vec2(dot(p, vec2(0.42262, -0.90631)), dot(p, vec2(0.90631, 0.42262)));   // along 025 degrees, along 115
    vec2 cellSize = vec2(270.0, 240.0);
    vec2 c = (rail + vec2(205.0, 185.0)) / cellSize;
    vec2 f = abs(fract(c) - 0.5) * cellSize;   // metres from the cell's middle lines
    ivec2 n = ivec2(floor(c));
    float alongU = hash2(n, 51) > 0.55 ? f.y : 1e9;   // a line across the rails' direction, cut or not
    float alongV = hash2(n, 52) > 0.45 ? f.x : 1e9;
    return min(alongU, alongV) - 3.0;
  }
  // the clearing round Complex 5/6: the frangible fence round its perimeter road, and the fence's jog out round the car park
  // at the gate (TM X-53107 Figure 7-6, scaled by the pads' 520 ft; lc-5.md, The land)
  float lc56(vec2 p) {
    vec2 pad = toPad(p);
    vec2 q = abs(vec2(pad.y - 80.5, pad.x - 1.0)) - vec2(216.0, 138.0) + 10.0;
    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 10.0;
    vec2 g = abs(vec2(pad.y - 16.5, pad.x - 138.5)) - vec2(40.5, 18.5);
    return min(d, length(max(g, 0.0)) + min(max(g.x, g.y), 0.0));
  }
  // ground worn to sand at the edge of the two pads' concrete and round the blockhouse's paving: the aprons
  float apron(vec2 p) {
    vec2 pad = toPad(p);
    float d = max(abs(pad.x), abs(pad.y)) - 40.0;
    d = min(d, max(abs(pad.x), abs(pad.y - 158.5)) - 40.0);
    d = min(d, length(pad - vec2(66.0, 84.0)) - 34.0);
    return d;
  }
  // where the complex's models stand: nothing grows there
  float built(vec2 p) {
    vec2 pad = toPad(p);
    float d = max(abs(pad.x), abs(pad.y)) - 44.0;
    d = min(d, max(abs(pad.x), abs(pad.y - 158.5)) - 40.0);
    for (int i = 0; i < ${KEPT.length}; i++) d = min(d, length(p - uKept[i].xy) - uKept[i].z);
    for (int i = 0; i < ${STRIPS.length}; i++) d = min(d, segment(p, uStrips[i]) - uStripWidth[i]);
    return d;
  }`;

/**
 * How the haze thins with height, metres (air.ts). The Cape's May mornings are mixed up to the
 * cumulus bases, median 720 m (NOAA ISD, the Skid Strip, 1959 to 1963): the haze is taken to
 * fall off over about twice that. Estimated.
 */
const HAZE_SCALE = 1400;

/**
 * The cumulus at launch: scattered, no ceiling, at 09:00 EST (NOAA ISD, the Skid Strip); bases at
 * 720 m, the median for May mornings 1959 to 1963 (the 07:00 deck was at 750 m). The wind aloft is
 * taken as the surface's, from 090, a little stronger. Cover is the record's for liftoff: "1/10
 * cumulus" (MR-3 Postlaunch Report, 10.3, p. 87; documented), which is the flight's own observation
 * and so preferred to the station's "scattered" at 09:00. Their depth and size are estimated.
 */
const CLOUDS: Clouds = {
  height: 720,
  depth: 650,
  cover: 0.1,
  size: 1500,
  wind: [-7 * COS, 7 * SIN], // toward 270, in the pad's frame
};

/** The sea's surface, metres above the ground at the complex (GROUND_Y): the land there is about 9.5 ft above NAVD 88 (USGS 3DEP). */
const SEA = -2.9;

/*
 * The lie of the land, in metres above the ground at the complex, written twice: in JavaScript for
 * the walker and the plants, in GLSL for the mesh. Keep the two in step, line for line.
 *
 * From the sea: the bed falls 2.2 m in every 100 offshore, with a bar 75 m out; the beach face rises
 * 1.35 m in its first 30 m to a berm, then the foredune to its crest 1 m higher, 45 to 62 m inland
 * (crest 6 to 8 ft above NAVD 88: USGS 3DEP, today's), then down into the swale behind it. Inland,
 * old beach ridges and swales half a metre apart, their low ground the same swales the cover map
 * keeps grassy; toward the Banana River the land goes down to its water. Wherever anything is
 * built (the complex's clearing, its roads, every other complex) the ground is exactly level at
 * the complex's height, easing out to the natural lie over 40 m: nothing the models stand on moves.
 */
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const inlandAt = (x: number, z: number) => shoreAt(COAST, -z) - x + 26 * (fbm2(z * 0.006, 4, 5, 3) - 0.45);
const riverwardAt = (x: number, z: number) => {
  const n = -z;
  const d = Math.min(
    Math.min(Math.max(x - shoreAt(RIVER, n), shoreAt(RIVER_WEST, n) - x), x - shoreAt(INDIAN, n)),
    Math.max(shoreAt(HARBOR_WEST, n) - x, x - shoreAt(HARBOR_EAST, n)),
  );
  return d - 30 * (fbm2(x * 0.0035, z * 0.0035, 6, 3) - 0.45);
};
const lc56At = (x: number, z: number) => {
  const px = x * COS + z * SIN,
    pz = -x * SIN + z * COS;
  const qx = Math.abs(pz - 80.5) - 216 + 10,
    qy = Math.abs(px - 1) - 138 + 10;
  const d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - 10;
  const gx = Math.abs(pz - 16.5) - 40.5,
    gy = Math.abs(px - 138.5) - 18.5;
  return Math.min(d, Math.hypot(Math.max(gx, 0), Math.max(gy, 0)) + Math.min(Math.max(gx, gy), 0));
};
const wayAt = (x: number, z: number) => {
  let best = 1e9;
  for (const [x0, z0, x1, z1, w] of TRACKS) {
    const dx = x1 - x0,
      dz = z1 - z0;
    const t = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - x0 - dx * t, z - z0 - dz * t) - w);
  }
  return best;
};
/**
 * The track's ballast off the pads: the bed is 0.23 m under the pads' surface (site.py: the
 * ballast's top at -0.75 ft), below the sand round the paving (GROUND_Y, 12 cm under), so along it
 * the ground is let down to where it was laid, 0.45 m under, and comes back up over a few metres
 * either side: the bed stands proud of its own ground as track does. Where it runs, in the pad's
 * frame (metres; +y toward pad 6): the main line 5.03 m either side of the middle (the pairs at
 * 10.5 ft, the bed 6 ft beyond), from 75.6 m south of pad 5 to 214.3 m north (TRACK_END, TRACK_NORTH),
 * and the turnout's curve (SPUR_Y 185 ft, SPUR_R 250 ft, from 6 to 63 degrees, 6.5 ft either side).
 */
const BED_DOWN = 0.33;
const trackAt = (x: number, z: number): number => {
  const px = x * COS + z * SIN,
    py = -x * SIN + z * COS;
  const qx = Math.abs(px) - 5.03,
    qy = Math.abs(py - 69.35) - 144.95;
  let d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0);
  for (const xp of [-3.2, 3.2]) {
    const cx = xp - 76.2,
      cy = 56.39;
    const t = Math.atan2(py - cy, px - cx);
    if (t > 0.1 && t < 1.1) d = Math.min(d, Math.abs(Math.hypot(px - cx, py - cy) - 76.2) - 1.98);
  }
  return d;
};
function relief(x: number, z: number): number {
  const s = inlandAt(x, z);
  const crest = 1.05 * (0.75 + 0.5 * fbm2(z * 0.012, 7, 73, 3));
  const bar = (s + 75) / 18;
  let h =
    SEA -
    0.022 * Math.max(-s, 0) +
    0.45 * Math.exp(-bar * bar) +
    1.35 * smooth(0, 30, s) +
    0.15 * smooth(30, 45, s) +
    crest * smooth(44, 62, s) -
    0.45 * smooth(60, 88, s);
  const swale = Math.sin(s * 0.057 + 3 * fbm2(x * 0.004, z * 0.004, 35, 3)) * 0.5 + 0.5;
  const inner = -0.55 - 0.5 * (swale - 0.5) + 0.3 * (fbm2(x * 0.008, z * 0.008, 71, 3) - 0.45);
  h += (inner - h) * smooth(110, 220, s);
  const r = riverwardAt(x, z);
  h = SEA - 0.015 * Math.max(-r, 0) + (h - (SEA - 0.015 * Math.max(-r, 0))) * smooth(-8, 70, r);
  let d = Math.min(lc56At(x, z) - 25, wayAt(x, z) - 6);
  for (const [cx, cz, cr] of CLEARINGS) d = Math.min(d, Math.hypot(x - cx, z - cz) - cr - 85);
  return Math.min(h * smooth(0, 40, d), 0.05) - BED_DOWN * (1 - smooth(0.3, 2.8, trackAt(x, z)));
}
const RELIEF = /* glsl */ `
  float track(vec2 p) {   // trackAt, above
    vec2 pad = toPad(p);
    vec2 q = vec2(abs(pad.x) - 5.03, abs(pad.y - 69.35) - 144.95);
    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
    for (int i = 0; i < 2; i++) {
      vec2 c = vec2((i == 0 ? -3.2 : 3.2) - 76.2, 56.39);
      float t = atan(pad.y - c.y, pad.x - c.x);
      if (t > 0.1 && t < 1.1) d = min(d, abs(length(pad - c) - 76.2) - 1.98);
    }
    return d;
  }
  float relief(vec2 p) {
    float s = inland(p);
    float crest = 1.05 * (0.75 + 0.5 * fbm2(vec2(p.y * 0.012, 7.0), 73, 3));
    float bar = (s + 75.0) / 18.0;
    float h = ${SEA.toFixed(2)} - 0.022 * max(-s, 0.0) + 0.45 * exp(-bar * bar)
      + 1.35 * smoothstep(0.0, 30.0, s) + 0.15 * smoothstep(30.0, 45.0, s)
      + crest * smoothstep(44.0, 62.0, s) - 0.45 * smoothstep(60.0, 88.0, s);
    float swale = sin(s * 0.057 + 3.0 * fbm2(p * 0.004, 35, 3)) * 0.5 + 0.5;
    float inner = -0.55 - 0.5 * (swale - 0.5) + 0.3 * (fbm2(p * 0.008, 71, 3) - 0.45);
    h += (inner - h) * smoothstep(110.0, 220.0, s);
    float r = riverward(p);
    float bank = ${SEA.toFixed(2)} - 0.015 * max(-r, 0.0);
    h = bank + (h - bank) * smoothstep(-8.0, 70.0, r);
    float kind;
    float d = min(lc56(p) - 25.0, way(p, kind) - 6.0);
    for (int i = 0; i < ${CLEARINGS.length}; i++) d = min(d, length(p - uSites[i].xy) - uSites[i].z - 85.0);
    return min(h * smoothstep(0.0, 40.0, d), 0.05) - ${BED_DOWN.toFixed(2)} * (1.0 - smoothstep(0.3, 2.8, track(p)));
  }`;

/**
 * The swell, as height above the still sea at a point: crests along the shore, a 7.7 s period
 * (NOAA buoy 41009's median for May), about a metre from trough to crest offshore (its median
 * significant height, 0.95 m), steepening over the bar and the shore where it breaks. Drawn, not
 * stood on: the walker meets the still sea.
 */
const PHASE = /* glsl */ `
  // where a point is in the swell's cycle: crests 55 m apart, coming ashore every 7.7 s, not ruler-straight
  float swellPhase(vec2 p) {
    float out_ = -inland(p);
    return out_ * 6.2832 / 55.0 + uTime * 6.2832 / 7.7 + 1.6 * (noise2(vec2(p.y * 0.015, 1.0), 81) - 0.5);
  }`;
const SWELL = /* glsl */ `
  ${PHASE}
  float lift(vec2 p, float ground, float far) {
    float depth = ${SEA.toFixed(2)} - ground;
    if (depth <= 0.0 || inland(p) > 0.0) return 0.0;   // the river lies still
    float crest = pow(0.5 + 0.5 * sin(swellPhase(p)), 3.0);
    float amp = 0.32 * smoothstep(0.0, 0.7, depth) * (1.0 + 0.5 * (1.0 - smoothstep(0.8, 2.5, depth)));
    return (crest * 2.0 - 0.45) * amp * (1.0 - smoothstep(120.0, 350.0, far));   // too gentle to see further off, where the mesh is too coarse to carry it
  }`;

/**
 * What covers the ground, as the communities lie on the Cape's barrier island (Oddy and others
 * 1999; FNAI 2010): bare beach to the dune; sea oats and grasses on the dune with sea grape;
 * then the coastal strand, saw palmetto, sea grape and wax myrtle pruned low by the salt and
 * rising inland; then coastal and oak scrub, near-continuous, two metres high, with sandy
 * openings; and toward the Banana River, hammock. Over that, what people had made: the
 * complexes' graded and grassed clearings, the roads, the firebreaks.
 */
const COVER = /* glsl */ `
  vec4 coverA(vec2 p) {
    float shore = inland(p);
    float river = riverward(p);
    // the community's order, coast to river: 0 the surf line, 0.75 the scrub inland, 1 the river's hammock
    float zone = 0.75 * clamp(shore / 400.0, 0.0, 1.0) + 0.25 * (1.0 - smoothstep(150.0, 700.0, river));
    // the scrub: close to continuous, with sandy openings of tens of metres and grassier swales between old beach ridges
    float open = fbm2(p * 0.011, 31, 4);
    float swale = sin(shore * 0.057 + 3.0 * fbm2(p * 0.004, 35, 3)) * 0.5 + 0.5;
    swale = smoothstep(0.62, 0.95, swale) * smoothstep(0.42, 0.6, fbm2(p * 0.005, 36, 3));   // not every swale holds water long enough to keep the scrub out
    float woody = 0.93 - 0.75 * smoothstep(0.56, 0.68, open) - 0.45 * swale;
    woody -= 0.25 * smoothstep(0.55, 0.75, noise2(p * 0.07, 33));   // gaps between shrubs, metres across
    float herb = 0.2 + 0.7 * (1.0 - woody) * (0.75 + 0.35 * noise2(p * 0.04, 34));   // the openings are grassed, thin in places
    // from the sea: beach, then the dune's grasses with patches of sea grape, then the strand thickening inland
    float beach = 1.0 - smoothstep(38.0, 48.0, shore);
    float dune = smoothstep(38.0, 48.0, shore) * (1.0 - smoothstep(70.0, 95.0, shore));
    woody *= smoothstep(55.0, 110.0, shore);
    woody = max(woody, dune * 0.5 * smoothstep(0.55, 0.7, noise2(p * 0.05, 37)));
    herb = mix(herb, 0.85 + 0.15 * noise2(p * 0.1, 38) - 0.55 * smoothstep(0.62, 0.75, noise2(p * 0.03, 39)), dune);   // sea oats, with blowouts
    herb *= 1.0 - beach;
    // toward the river the hammock closes overhead; at its edge, marsh grass
    float marsh = 1.0 - smoothstep(20.0, 90.0, river);
    woody = mix(woody, 0.15, marsh);
    herb = mix(herb, 0.8, marsh);
    // the clearings: Complex 5/6's fenced rectangle and an oval of grass round each neighbouring pad
    float cleared = 1.0 - smoothstep(-2.0, 4.0, lc56(p) + 3.0 * (noise2(p * 0.2, 39) - 0.5));
    for (int i = 0; i < ${NEAR.length}; i++) {
      float d = length(p - uClear[i].xy) - uClear[i].z - 75.0 + 14.0 * (noise2(p * 0.03, 40 + i) - 0.5);
      cleared = max(cleared, 1.0 - smoothstep(-2.0, 4.0, d));
    }
    // mown grass, thin and patchy, sand showing through; a few shrubs left standing near the edge
    float mown = 0.82 + 0.4 * (fbm2(p * 0.06, 41, 3) - 0.5) - 0.5 * smoothstep(0.62, 0.78, noise2(p * 0.025, 42));
    woody = mix(woody, 0.09 * smoothstep(0.6, 0.85, noise2(p * 0.15, 43)), cleared);
    herb = mix(herb, mown, cleared);
    // graded aprons round the pads and the blockhouse: sand, a little grass coming back
    float graded = 1.0 - smoothstep(-6.0, 6.0, apron(p) + 8.0 * (noise2(p * 0.08, 44) - 0.5));
    herb = mix(herb, 0.12 + 0.2 * noise2(p * 0.3, 45), graded);
    woody *= 1.0 - graded;
    // the ways: bare, with a grass verge; firebreaks harrowed sand going back to grass
    float kind;
    float road = way(p, kind);
    float onRoad = 1.0 - smoothstep(-0.5, 1.5, road);
    float verge = 1.0 - smoothstep(1.5, 4.5, road);
    float fire = (1.0 - smoothstep(-1.0, 1.5, firebreak(p))) * (1.0 - cleared) * smoothstep(110.0, 160.0, shore);
    woody *= (1.0 - verge) * (1.0 - fire);
    herb = mix(herb, 0.35, verge);
    herb = mix(herb, 0.3 + 0.2 * noise2(p * 0.2, 46), fire);
    herb *= 1.0 - onRoad;
    // nothing grows where the complex's models stand, nor in the sea
    float models = 1.0 - smoothstep(-0.5, 0.5, built(p));
    herb *= 1.0 - models;
    woody *= 1.0 - models;
    float sea = smoothstep(-1.0, 1.0, -shore) + smoothstep(-1.0, 1.0, -river);
    woody *= 1.0 - sea;
    herb *= 1.0 - sea;
    float bare = clamp(1.0 - woody - herb, 0.0, 1.0);
    return vec4(woody, herb, bare, zone);
  }
  vec4 coverB(vec2 p) {
    float shore = inland(p);
    float kind;
    float road = way(p, kind);
    float worked = max(1.0 - smoothstep(-6.0, 6.0, apron(p)), 1.0 - smoothstep(-0.5, 1.5, road));
    worked = max(worked, 0.35 * (1.0 - smoothstep(-2.0, 4.0, lc56(p))));
    // wet: the marsh at the river's edge, and the bottoms of the swales inland
    float wet = 1.0 - smoothstep(10.0, 60.0, riverward(p));
    wet = max(wet, (1.0 - smoothstep(-1.02, -0.8, relief(p))) * smoothstep(150.0, 250.0, shore) * 0.6);
    // loose dry sand: the beach above the swash and the dune's blowouts
    float loose = smoothstep(4.0, 12.0, shore) * (1.0 - smoothstep(60.0, 90.0, shore));
    return vec4(worked, wet, loose, 0.0);
  }`;

/** How high a closed stand of woody plants grows here, metres: low and wind-shorn by the sea, two metres in the scrub, a hammock's trees by the river. */
const CANOPY = /* glsl */ `
  float canopyHeight(vec4 A, vec4 B) {
    float zone = A.a;
    return mix(mix(0.9, 2.1, smoothstep(0.12, 0.42, zone)), 6.0, smoothstep(0.82, 0.98, zone));
  }`;

/** The Cape's own marks on the ground: the roads and the rail line's ballast, and the sea and river. */
const PAINT = /* glsl */ `
  ${PHASE}
  void paint(vec2 p, vec4 A, vec4 B, inout Ground g) {
    // shell roads: crushed shell, two wheel ruts pressed darker; the ballast is grey stone
    float kind;
    float road = way(p, kind);
    float on = 1.0 - smoothstep(-0.6, 0.8, road + 0.5 * (noise(vec3(p * 0.9, 20.0)) - 0.5));
    if (on > 0.0) {
      vec3 shell = vec3(0.42, 0.40, 0.35) * (0.86 + 0.22 * noise(vec3(p * 0.7, 21.0)));
      vec3 ballast = vec3(0.30, 0.29, 0.27) * (0.8 + 0.4 * mix(0.5, noise(vec3(p * 22.0, 22.0)), seen(0.04)));
      // the ruts: a wheel's track 0.75 m in from each edge, where the shell is ground fine and darker
      float rut = (1.0 - smoothstep(0.15, 0.4, abs(-road - 0.75))) * step(0.5, kind);
      shell *= 1.0 - 0.18 * rut * seen(0.3);
      vec3 c = mix(ballast, shell, step(0.5, kind));
      g.albedo = mix(g.albedo, c, on);
      g.bump = mix(g.bump, 0.01 * (noise(vec3(p * 12.0, 23.0)) - 0.5) - 0.02 * rut, on);
    }
    // The Atlantic. The ground's own height says where the water is and how deep (the mesh is the water's
    // surface over it); the swell's phase says where its crests are, and where it is shallow they break.
    float shore = inland(p);
    float depth = ${SEA.toFixed(2)} - vLand.y;
    // the beach: dry sand paler and finer above the reach of the waves, a line of wrack where the last high water left it
    float beach = 1.0 - smoothstep(36.0, 50.0, shore);
    // (a tint on the ground's own sand, so its grain carries on down the beach)
    vec3 dry = vec3(0.62, 0.56, 0.45) / ${glsl3(PALETTE.sand)};
    g.albedo = mix(g.albedo, g.albedo * mix(vec3(1.0), dry, 0.75), beach);
    // (a scatter of weed and shell along a line, thin and broken: bits of a few centimetres)
    float wrack = (1.0 - smoothstep(0.1, 0.7, abs(shore - 17.0 - 3.0 * noise(vec3(p.y * 0.05, 0.0, 25.0))))) * smoothstep(0.55, 0.7, noise(vec3(p * 9.0, 26.0))) * smoothstep(0.35, 0.6, noise(vec3(p * 0.4, 28.0)));
    g.albedo = mix(g.albedo, vec3(0.12, 0.1, 0.07), 0.7 * wrack * seen(0.05));
    // the swash: each wave runs up the beach face and draws back; the sand it leaves is dark and shines
    float run = 4.0 + 3.0 * sin(uTime * 0.816 + p.y * 0.05) + 1.5 * sin(uTime * 0.37 + p.y * 0.013);
    float swash = 1.0 - smoothstep(run - 0.5, run + 0.5, shore);
    float wet = (1.0 - smoothstep(run + 0.5, 11.0 + 2.0 * noise(vec3(p.y * 0.03, 0.0, 27.0)), shore)) * beach;
    g.albedo *= 1.0 - 0.42 * wet;
    g.rough = mix(g.rough, 0.25, wet);
    // the water: green over sand where it is shallow, blue-grey offshore
    float sea = max(smoothstep(-0.05, 0.05, depth), swash * smoothstep(-1.0, 0.0, shore + 1.0));
    float deep = clamp(depth / 6.0, 0.0, 1.0);
    deep = mix(deep, floor(deep * 3.0 + 0.5) / 3.0, uCel);   // the sea in bands, drawn
    vec3 water = mix(vec3(0.16, 0.29, 0.25), mix(vec3(0.045, 0.14, 0.16), vec3(0.018, 0.07, 0.12), smoothstep(0.4, 1.0, deep)), smoothstep(0.0, 0.35, deep));
    water = mix(water, g.albedo * vec3(0.75, 0.9, 0.85), (1.0 - smoothstep(0.0, 0.35, depth)) * 0.6);   // the sand shows through a thin sheet
    // foam: the crest breaks where the water is shallow (on the bar, at the shore), a band of white
    // trailing behind it and thinning, broken along its length; and the swash's lacy edge
    float ph = swellPhase(p);
    float behind = fract(-ph / 6.2832 + 0.25);   // 0 at the crest, rising toward the next one behind it
    float breaking = (1.0 - smoothstep(0.7, 1.5, depth)) * (1.0 - smoothstep(-2.0, 0.0, shore));
    float lace = noise(vec3(p * 0.35, uTime * 0.2)) * 0.6 + noise(vec3(p * 1.4, uTime * 0.35 + 3.0)) * 0.4;
    // (the crest itself a solid white roll as it breaks; behind it a sheet of foam going to lace and then to nothing)
    float roll = exp(-behind * 30.0) * smoothstep(0.15, 0.4, lace);
    float trail = exp(-behind * 4.0) * smoothstep(0.15 + 0.6 * behind, 0.5 + 0.35 * behind, lace);
    float foam = breaking * max(roll, trail);
    foam = max(foam, (1.0 - smoothstep(0.0, 0.6, abs(shore - run))) * mix(0.6, smoothstep(0.3, 0.6, lace), seen(0.3)));
    foam = max(foam, smoothstep(0.5, 0.9, depth) * (1.0 - smoothstep(1.2, 2.2, depth)) * (1.0 - smoothstep(-2.0, 0.0, shore)) * 0.25 * smoothstep(0.55, 0.8, lace));
    foam = mix(foam, step(0.45, foam), uCel);
    sea = mix(sea, step(0.5, sea), uCel);
    g.albedo = mix(g.albedo, mix(water, vec3(0.86, 0.88, 0.86), foam), sea);
    g.rough = mix(g.rough, mix(0.08, 0.7, foam), sea);
    // its surface: wind waves on the swell, all running ashore from the east within forty degrees, each as tall as a
    // fortieth of its length and moving at its own speed (deep water: c = sqrt(g L / 2 pi)); each fades out before it is under a pixel
    float waves = 0.0;
    for (int k = 0; k < 8; k++) {
      float L = 11.0 * pow(0.68, float(k));
      float a = 3.1416 + (hash(vec3(float(k), 1.0, 2.0)) - 0.5) * 1.8;
      vec2 dir = vec2(cos(a), sin(a));
      float w = 6.2832 / L;
      // short-crested: each train comes and goes along its crests
      float group = smoothstep(0.25, 0.75, noise(vec3(p * (0.35 / L), float(k) * 3.1 + uTime * 0.05)));
      waves += L / 70.0 * group * sin(w * dot(dir, p) + 3.0 * noise(vec3(p * (0.6 / L), float(k))) - sqrt(9.8 * w) * uTime + float(k) * 1.7) * seen(L * 0.6);
    }
    waves += 0.03 * (noise(vec3(p * 0.45, uTime * 0.3)) - 0.5) * seen(2.0) + 0.012 * (noise(vec3(p * 2.6, uTime * 0.8)) - 0.5) * seen(0.4);
    g.bump = mix(g.bump, waves * (1.0 - foam) + 0.02 * foam * lace, sea);
    g.water = max(g.water, sea * (1.0 - foam));
    // the Banana River: flat water, no surf
    float river = smoothstep(-3.0, 3.0, -riverward(p));
    river = mix(river, step(0.5, river), uCel);
    g.albedo = mix(g.albedo, vec3(0.045, 0.1, 0.11), river);
    g.rough = mix(g.rough, 0.16, river);
    g.water = max(g.water, river);
  }`;

/** The Cape's ground, as land.ts takes it. */
function landSpec(): LandSpec {
  return {
    near: 2048,
    texels: 2048,
    far: FAR,
    shared: SHARED,
    cover: COVER,
    relief,
    reliefGlsl: RELIEF,
    sea: SEA,
    lift: SWELL,
    canopy: CANOPY,
    crown: 2.6,
    paint: PAINT,
    uniforms: {
      uCoast: { value: COAST.map(([n, x]) => new THREE.Vector2(n, x)) },
      uRiver: { value: RIVER.map(([n, x]) => new THREE.Vector2(n, x)) },
      uRiverWest: { value: RIVER_WEST.map(([n, x]) => new THREE.Vector2(n, x)) },
      uIndian: { value: INDIAN.map(([n, x]) => new THREE.Vector2(n, x)) },
      uHarborWest: { value: HARBOR_WEST.map(([n, x]) => new THREE.Vector2(n, x)) },
      uHarborEast: { value: HARBOR_EAST.map(([n, x]) => new THREE.Vector2(n, x)) },
      uTracks: { value: TRACKS.map((t) => new THREE.Vector4(t[0], t[1], t[2], t[3])) },
      uTrackKind: { value: TRACKS.map((t) => new THREE.Vector2(t[4], t[5])) },
      uClear: { value: NEAR.map(([x, z, r]) => new THREE.Vector3(x, z, r)) },
      uSites: { value: CLEARINGS.map(([x, z, r]) => new THREE.Vector3(x, z, r)) },
      uKept: { value: KEPT.map(([x, y, r]) => new THREE.Vector3(...site(x, y), r * FT)) },
      uStrips: { value: STRIPS.map(([x0, y0, x1, y1]) => new THREE.Vector4(...site(x0, y0), ...site(x1, y1))) },
      uStripWidth: { value: STRIPS.map((s) => s[4] * FT) },
    },
    palette: PALETTE,
  };
}

const c = srgb;

/**
 * What grows, and where along the zone from the surf (0) through the scrub (0.75) to the river's
 * hammock (1). Species and their order are published (Oddy and others 1999; FNAI 2010); the
 * shares, heights and colours are estimated from the photographs.
 */
function floraSpec(): FloraSpec {
  return {
    spacing: { woody: 1.7, herb: 2.2, tree: 10 },
    // salt-pruned near the sea: the strand's canopy "slants up away from the coast" (FNAI)
    stature: (zone) => Math.min(1, 0.45 + (zone / 0.42) * 0.55),
    wind: { toward: THREE.MathUtils.degToRad(270), strength: 1 }, // the morning's breeze, from 090 at 10 knots (NOAA ISD, Cape station, 09:00 EST)
    species: [
      {
        name: 'saw-palmetto',
        form: { kind: 'fan', fans: [9, 14], blade: [0.34, 0.46] },
        layer: 'woody',
        abundance: [
          [0.08, 0],
          [0.14, 0.4],
          [0.3, 1],
          [0.6, 0.65],
          [1, 0.3],
        ],
        height: [1.0, 1.8],
        colours: [c(0x4a6a34), c(0x6a8a44)],
        near: 34,
        reach: 330,
        sway: 0.45,
        rough: 0.6,
      },
      {
        name: 'scrub-oak',
        form: { kind: 'shrub', masses: [4, 6], spread: 1.5 },
        layer: 'woody',
        abundance: [
          [0.15, 0],
          [0.3, 0.3],
          [0.5, 1],
          [0.85, 0.8],
          [1, 0.5],
        ],
        height: [1.1, 2.0],
        colours: [c(0x3b5c33), c(0x5a8042)],
        near: 30,
        reach: 330,
        sway: 0.2,
        rough: 0.88,
      },
      {
        name: 'wax-myrtle',
        form: { kind: 'shrub', masses: [3, 5], spread: 1.0 },
        layer: 'woody',
        abundance: [
          [0.14, 0],
          [0.25, 0.35],
          [0.5, 0.15],
          [0.9, 0.45],
        ],
        height: [1.6, 3.0],
        colours: [c(0x56783a), c(0x74964a)],
        near: 30,
        reach: 330,
        sway: 0.35,
        rough: 0.85,
      },
      {
        name: 'sea-grape',
        form: { kind: 'shrub', masses: [3, 5], spread: 1.6 },
        layer: 'woody',
        abundance: [
          [0.08, 0.6],
          [0.18, 0.9],
          [0.3, 0.35],
          [0.45, 0],
        ],
        height: [1.0, 2.2],
        colours: [c(0x3f6a30), c(0x5e8a3e)],
        near: 30,
        reach: 330,
        sway: 0.25,
        rough: 0.75,
      },
      {
        name: 'cabbage-palm',
        form: { kind: 'palm', trunk: [0.016, 0.022], fronds: 14 },
        layer: 'tree',
        abundance: [
          [0.12, 0.012],
          [0.3, 0.006],
          [0.6, 0.002],
          [0.85, 0.04],
          [1, 0.15],
        ],
        height: [5, 11],
        colours: [c(0x456e32), c(0x64903f)],
        near: 90,
        reach: 1800,
        sway: 0.3,
        rough: 0.5,
      },
      {
        name: 'sea-oats',
        form: { kind: 'shrub', masses: [2, 4], spread: 1.1 }, // a low clump of pale grass on the dune
        layer: 'herb',
        abundance: [
          [0.07, 0],
          [0.09, 1],
          [0.15, 1],
          [0.2, 0],
        ],
        height: [0.5, 0.9],
        colours: [c(0xc2b878), c(0x9aa05a)],
        near: 30,
        reach: 260,
        sway: 0.6,
        rough: 0.85,
      },
    ],
  };
}

/** Everything round the pad. `groundY` is the terrain's height; the pad's own surface is 0. */
export function buildCape(
  renderer: THREE.WebGLRenderer,
  groundY: number,
): {
  floor: THREE.Mesh;
  scenery: THREE.Object3D[];
  tick: (dt: number) => void;
  /** Draw the land and its plants in full, or simplified for the cel look. */
  simplify: (on: boolean) => void;
  /** Where the eye is (world): what is near it is drawn in full. True if that changed what is drawn. */
  attend: (eye: THREE.Vector3) => boolean;
  /** The camera as it is about to draw: the ground out of its sight is not drawn. */
  view: (camera: THREE.Camera) => void;
  /** The ground's height at a point in the world (the pad's frame): flat at `groundY` wherever anything is built. */
  groundAt: (x: number, z: number) => number;
  plantsClear: (at: THREE.Vector3, within: number) => number;
  plantsOut: (at: THREE.Vector3, margin: number) => number;
} {
  // the haze lies in the lowest air, under the cumulus at 720 m, and thins upward (air.ts)
  const air: Air = { scale: HAZE_SCALE, base: groundY + SEA, clouds: CLOUDS };
  installAir(air); // (the cumulus are drawn by the stage's cloud pass: clouds.ts)
  const land = new Land(renderer, landSpec(), groundY, COMPASS);
  const flora = new Flora(floraSpec(), land);
  flora.group.position.y = groundY;
  const built = buildCape1961((x, z) => groundY + land.heightAt(x, z)); // the other complexes and the lighthouse, where they stood, each on its own ground
  // laid out on the compass, then turned as one to lie round the pad model
  const site = new THREE.Group();
  site.add(flora.group, ...built);
  site.rotation.y = COMPASS;
  site.updateMatrixWorld(true);
  const eye = new THREE.Vector3();
  const local = (at: THREE.Vector3) => {
    site.worldToLocal(eye.copy(at));
    eye.y -= groundY;
    return eye;
  };
  return {
    floor: land.mesh,
    scenery: [site],
    tick: (dt) => {
      driftClouds(dt);
      land.tick(dt);
      flora.tick(dt);
    },
    simplify: (on) => {
      land.simplify(on);
      flora.simplify(on);
    },
    attend: (at) => {
      local(at);
      land.attend(eye);
      return flora.attend(eye);
    },
    view: (camera) => land.view(camera),
    plantsClear: (at, within) => flora.clear(local(at), within),
    plantsOut: (at, margin) => {
      const still = flora.out(local(at), margin);
      eye.y += groundY;
      site.localToWorld(eye);
      at.x = eye.x;
      at.z = eye.z;
      return still;
    },
    groundAt: (x, z) => {
      // the world point on the compass: the inverse of the site's turn
      const cx = x * COS - z * SIN,
        cz = x * SIN + z * COS;
      return groundY + land.heightAt(cx, cz);
    },
  };
}

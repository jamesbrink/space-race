import * as THREE from 'three';
import type { SiteAround } from '../../../../src/types.ts';
import { smoothstep } from '../../../../src/util/math.ts';
import { buildAround } from '../../../../src/viewer/around.ts';
import { fbm2, noise2 } from '../../../../src/viewer/field.ts';
import { vec3 } from '../../../../src/viewer/glsl.ts';
import type { LandSpec } from '../../../../src/viewer/land.ts';
import type { Compass } from '../../../../src/viewer/scenery/compass.ts';
import { type GroundSpec, stood } from '../../../../src/viewer/scenery/ground.ts';
import { SCARP_FRAME_GLSL, SITE_RELIEF_GLSL, siteRelief } from './relief.ts';
import { SITE1 } from './site-1.ts';
import { SITE31 } from './site-31.ts';
import {
  STEPPE,
  STEPPE_COVER,
  type SteppeSeason,
  seasonOf,
  steppeCel,
  steppeCelGround,
  steppeFlora,
  steppeGround,
  steppePalette,
  steppeTone,
} from './steppe.ts';
import { CENTRE_TRACK, RAILS } from './tracks.ts';
import { TYURATAM_GROUND as MAPPED } from './tyuratam-ground.ts';
import { HEIGHTS_GLSL, heightsAt, segmentDistance, WAYS_GLSL, WORKS_FOR_KINDS, WORKS_PAINT, waySurface, worksUniforms } from './works.ts';

/**
 * The steppe round Site 1 at Tyuratam, April 1961, as scenery: the ground the platform stands on,
 * out to the horizon. Everything here is given in Site 1's own frame, which lies on the compass
 * (missions/ussr/places/tyuratam/site-1.ts: its +X is due east): +X east, -Z north, metres from the
 * rocket's axis. Round Site 1 that is the land's frame itself; round any other pad here it is put where
 * Site 1 lies from that pad (viewer/scenery/compass.ts `frame`, through world/frames.ts), as the Cape's
 * ground puts what is given in Complex 5's frame (`inSite1`, below).
 *
 * The pad, the flame pit and the launch system are not here: they are modelled in Blender, in the
 * same frame (places/tyuratam/site1/). The land has the pit's outline cut out of it, where the pit's own model
 * is the ground, and the tracks that came onto the platform and the roads painted on it. What is documented and
 * what is estimated is in missions/ussr/places/tyuratam/site-1.md, "The land". In short: the pit's
 * rim and the tracks are today's map (OpenStreetMap), which the CIA's photographs of 1957 agree
 * with. The ground itself and what grows on it are the steppe's (steppe.ts: the kind of country, its
 * sources and what of it is estimated); this file says where on it the ground lies low, and what the
 * builders made of it: the graded apron, the tracks' beds, the ground worn inside the fence and round
 * the spoil heap, and the ruts beside the ways the traffic came.
 */

/** The flame pit's rim, metres east and north of the rocket's axis: the same outline as places/tyuratam/site1/platform.py (RIM). Keep the two in step. */
const RIM: [number, number][] = [
  [-18, 59],
  [-15, 65.5],
  // (the cut that ran north from the rim in 1959, filled today: PIC/JR-2/60 Figure 5)
  [-13.5, 78],
  [-10, 93],
  [-4.5, 108],
  [0, 114],
  [3.5, 108],
  [5, 96],
  [4.5, 82],
  [18, 89.5],
  [29.5, 92.5],
  [44, 91],
  [148.5, 62.5],
  [229.5, 24.5],
  [237.5, 16],
  [239, 1.5],
  [239, -10.5],
  [234.5, -15.5],
  [194.5, -21],
  [166, -31.5],
  [138.5, -51],
  [105, -69.5],
  [76, -83],
  [65, -92],
  [62.5, -92],
  [58.5, -86],
  [35, -86.5],
  [1.5, -85.5],
  [-10, -81.5],
  [-17, -74],
  [-24, -52],
  [-26, -23],
];

/**
 * The tracks that ran onto the platform are tracks.ts's `RAILS` (their lines, their sources, and the bends that are
 * curved where the place's model lays the rails: site1/deck.py): the centre track, the four spurs beside it and the
 * line from the assembly building.
 */
/** How far apart the painted sleepers lie, metres (estimated). */
const SLEEPERS = 0.55;
/** Each a segment (x0, z0, x1, z1) in the land's frame (+Z is south). */
const SEGMENTS: [number, number, number, number][] = RAILS.flatMap((line) =>
  line.slice(1).map((b, i): [number, number, number, number] => [line[i]![0], -line[i]![1], b[0], -b[1]]),
);
/** How far along its own track each of those segments begins, metres: so that the sleepers are spaced along the track and not along each chord of a bend. */
const SEGMENT_FROM: number[] = RAILS.flatMap((line) => {
  let along = 0;
  return line.slice(1).map((b, i) => {
    const from = along;
    along += Math.hypot(b[0] - line[i]![0], b[1] - line[i]![1]);
    return from % SLEEPERS;
  });
});

/**
 * The roads, metres east and north: painted on the land as the tracks are, since they lay flush with it. Their lines are
 * today's (OpenStreetMap, simplified to two metres), each one a road on the CIA's line drawing of the area as it was in
 * 1959 (PIC/JR-2/60 Figure 5): the road in from the south-west (way 54570611), the road round the pit and back past the
 * command bunker (way 172571827), the road from the storage bunker south to the propellant shed (way 172441909, as far
 * as the northern spur: the drawing shows no crossing of the tracks), and the short drives off them to the storage
 * bunker's three bays, the check-out shop's gate and the gas receivers by the platform, which are ours. That they were
 * concrete, and six metres wide, is estimated. Keep in step with places/tyuratam/site1/place.py (ROADS), which keeps posts off them.
 */
const ROADS: [number, number][][] = [
  [
    [-1851.8, -774.8],
    [-1504.9, -117.6],
    [-1482.1, -88.6],
    [-1461.7, -70.7],
    [-1415.4, -42.7],
    [-1366.9, -27.2],
    [-1335.8, -23.2],
    [-603.8, -25.3],
    [-85.6, -22.6],
    [-48.0, -20.5],
  ],
  [
    [-85.6, -22.6],
    [-81.0, -33.8],
    [-86.8, -91.8],
    [-81.0, -109.3],
    [-69.5, -121.0],
    [-38.7, -132.4],
    [-9.4, -134.8],
    [58.9, -135.0],
    [86.3, -126.0],
    [222.3, -45.9],
    [230.8, -37.7],
    [238.2, -25.0],
    [242.7, -3.0],
    [241.7, 9.2],
    [235.5, 29.9],
    [219.6, 48.7],
    [152.3, 83.7],
    [69.8, 120.8],
    [46.2, 135.1],
    [36.9, 154.0],
    [34.2, 225.0],
    [31.3, 233.5],
    [21.4, 245.4],
    [5.7, 250.2],
    [-82.7, 249.4],
    [-81.7, 199.6],
    [-83.5, 34.0],
  ],
  [
    [-82.0, 186.06],
    [-57.7, 186.06],
  ],
  [
    [-82.0, 207.4],
    [-57.7, 207.4],
  ],
  [
    [-82.4, 228.74],
    [-57.7, 228.74],
  ],
  [
    [-82.4, 230.3],
    [-92.0, 230.3],
  ],
  // (off the road round the pit's tip onto the road down into the pit, which the pit's own model carries on: platform.py)
  [
    [242.4, 0.0],
    [235.0, 0.0],
  ],
];
const ROAD_SEGMENTS: [number, number, number, number][] = ROADS.flatMap((line) =>
  line.slice(1).map((b, i): [number, number, number, number] => [line[i]![0], -line[i]![1], b[0], -b[1]]),
);
/** Half a road's width, metres (estimated). */
const ROAD_HALF = 3;

/** Half the platform and the abutment behind it, metres (places/tyuratam/site1/site.py: 135 ft square; platform.py: 25 ft). */
const HALF = (135 * 0.3048) / 2;
const ABUTMENT = 25 * 0.3048;
/** The ground cleared and graded round the platform's landward side, where the tracks come on, metres from its edge (estimated). */
const APRON = 70;
/**
 * The apron: the ground west of the platform laid in concrete slabs with the rails flush in them, metres east and north
 * (the film, «Первый рейс к звёздам», 43:26 to 43:29, looking down from the erector's head at about 06:55: site-1.md, "The
 * apron"). From the abutment's west face (documented) west to beyond what the frame shows (its far end, 90 m, estimated);
 * south to 21 m from the centre track, 4 m beyond the bus's side, where the film has bare earth begin (derived, from the
 * bus's breadth for a scale: good to a few metres); north to 20 m, short of the propellant shed's bank (estimated: the
 * film shows the north side only as far as the truck, 4 m from the centre track). Each slab 1.5 m along the tracks by 3 m
 * across them, laid in rows along them (estimated, read off the film at the bus's scale).
 */
const SLABS = { east: -(HALF + ABUTMENT), west: -90, north: 20, south: -21, along: 1.5, across: 3 };
/**
 * Over the apron the band of concrete along each track is not paint: the land is left open this far either side of the
 * track's middle line, metres, and the place's model lays the band there at the land's level with a flangeway cut beside
 * each rail (site1/deck.py `STRIP`, `_band`: keep the two in step). The land is a surface in cells of half a metre and
 * cannot be grooved; its height there is still answered as the band's top, which is what is walked and driven on.
 */
const STRIP = 1.2;
/** How far the ground is drawn: past the horizon from any height a person stands at (4.7 km at 1.7 m). */
const FAR = 8000;

const glsl = (v: number) => v.toFixed(3);

/** The outer fence's sides, metres from the rocket's axis (site-1.md, "The place round the pad": derived from HTA/JR-4/58 and today's imagery). */
const FENCE = { south: 191, east: 435, west: -484, north: 303 };
/** The spoil heap's extent, metres east (from, to) and north (from, to): site-1.md (Figure 5 fitted to today's imagery). */
const SPOIL: [number, number, number, number] = [181, 381, 72, 292];

/**
 * Where the wheels went off the made ways: bands of ruts beside them, as half a band's breadth (metres) and how worn
 * (0 to 1), along lines metres east and north. That the builders' trucks ground the steppe's crust to dust and the
 * dusty roads "got to be two to three kilometers wide" is Chertok's (Rockets and People, vol. II, p. 314, of 1955 to
 * 1957); by 1961 the concrete road took the traffic, and the bands are drawn narrower and fading. Their lines (beside
 * the road in from the south-west, and along the track west to the assembly building) and breadths are estimated.
 */
const RUTS: { line: [number, number][]; half: number; worn: number }[] = [
  { line: ROADS[0]!, half: 70, worn: 0.75 },
  { line: CENTRE_TRACK.slice(0, -1), half: 35, worn: 0.5 },
  // along the embankment's brow north of the tracks, 3 m in from it (relief.ts BROW): the way along the top of the fall
  {
    line: [
      [-335, 5],
      [-125, 28],
      [-75, 38],
      [40, 38],
    ],
    half: 3,
    worn: 0.45,
  },
];
const RUT_SEGMENTS = RUTS.flatMap(({ line, half, worn }) =>
  line.slice(1).map((b, i) => ({ s: [line[i]![0], -line[i]![1], b[0], -b[1]] as [number, number, number, number], half, worn })),
);

/** GLSL both the cover's bake and the terrain's shader use: the pit's rim, the tracks, the made ground. */
const SHARED = /* glsl */ `
  ${HEIGHTS_GLSL}
  ${WAYS_GLSL}
  uniform vec2 uRim[${RIM.length}];
  uniform vec4 uRails[${SEGMENTS.length}];
  uniform vec4 uRoads[${ROAD_SEGMENTS.length}];
  float segment(vec2 p, vec4 s) {
    vec2 a = s.xy, b = s.zw, ab = b - a;
    return length(p - a - ab * clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0));
  }
  // how far inside the flame pit's rim, metres (negative outside it): the land is not drawn there, the pit's model is the ground
  float inPit(vec2 p) {
    vec2 q = vec2(p.x, -p.y);
    float best = 1e9;
    bool odd = false;
    for (int i = 0; i < ${RIM.length}; i++) {
      vec2 a = uRim[i], b = uRim[i == ${RIM.length - 1} ? 0 : i + 1];
      best = min(best, segment(q, vec4(a, b)));
      if ((a.y > q.y) != (b.y > q.y) && q.x < a.x + (b.x - a.x) * (q.y - a.y) / (b.y - a.y)) odd = !odd;
    }
    return odd ? best : -best;
  }
  // the nearest track's middle line, metres
  float rail(vec2 p) {
    float best = 1e9;
    for (int i = 0; i < ${SEGMENTS.length}; i++) best = min(best, segment(p, uRails[i]));
    return best;
  }
  // the nearest road's middle line, metres (nothing is asked past the box the roads lie in)
  float road(vec2 p) {
    if (p.x < -1880.0 || p.x > 270.0 || p.y < -280.0 || p.y > 800.0) return 1e9;
    float best = 1e9;
    for (int i = 0; i < ${ROAD_SEGMENTS.length}; i++) best = min(best, segment(p, uRoads[i]));
    return best;
  }
  // the ruts worn beside the ways the traffic came (RUTS): how much, 0 to 1, and the way they run
  uniform vec4 uRuts[${RUT_SEGMENTS.length}];
  uniform vec2 uRutKind[${RUT_SEGMENTS.length}];   // half the band's breadth, metres; how worn
  float rutsAt(vec2 p, out vec2 along) {
    along = vec2(1.0, 0.0);
    float best = 0.0;
    for (int i = 0; i < ${RUT_SEGMENTS.length}; i++) {
      vec4 s = uRuts[i];
      float d = segment(p, s);
      float w = (1.0 - smoothstep(0.25, 1.0, d / uRutKind[i].x)) * uRutKind[i].y;
      if (w > best) { best = w; along = normalize(s.zw - s.xy); }
    }
    // braided: the band's strands come and go along it
    return best * smoothstep(0.3, 0.6, noise2(p * 0.012, 36) + 0.25 * noise2(p * 0.05, 37));
  }
  // how far inside the outer fence, metres (negative outside it)
  float fenced(vec2 p) {
    vec2 c = vec2(${glsl((FENCE.east + FENCE.west) / 2)}, ${glsl(-(FENCE.north - FENCE.south) / 2)});
    vec2 q = abs(p - c) - vec2(${glsl((FENCE.east - FENCE.west) / 2)}, ${glsl((FENCE.north + FENCE.south) / 2)});
    return -(length(max(q, 0.0)) + min(max(q.x, q.y), 0.0));
  }
  // how far outside the spoil heap's foot, metres
  float spoil(vec2 p) {
    vec2 q = abs(p - vec2(${glsl((SPOIL[0] + SPOIL[1]) / 2)}, ${glsl(-(SPOIL[2] + SPOIL[3]) / 2)})) - vec2(${glsl((SPOIL[1] - SPOIL[0]) / 2)}, ${glsl((SPOIL[3] - SPOIL[2]) / 2)}) + 40.0;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 40.0;
  }
  // the platform and its abutment: metres outside them (negative on them)
  float platform(vec2 p) {
    vec2 c = vec2(p.x + ${glsl(ABUTMENT / 2)}, p.y);
    vec2 q = abs(c) - vec2(${glsl(HALF + ABUTMENT / 2)}, ${glsl(HALF)});
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  }
  // the apron's slabs (SLABS): metres outside them (negative on them)
  float apron(vec2 p) {
    vec2 q = abs(p - vec2(${glsl((SLABS.east + SLABS.west) / 2)}, ${glsl(-(SLABS.north + SLABS.south) / 2)})) - vec2(${glsl((SLABS.east - SLABS.west) / 2)}, ${glsl((SLABS.north - SLABS.south) / 2)});
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  }`;

/**
 * The lie of the land, metres above the ground at the pad, in JavaScript (the walker, the plants) and GLSL (the mesh):
 * keep the two in step. The pad stands on the brow of a scarp: the ground south of the tracks is at their level, the
 * steppe north of them some 8 m down and the ground east of the pit some 5 m (relief.ts, which the place's
 * models are built on too: places/tyuratam/site1/relief.py). Over that, beyond 400 m, a swell of half a metre over hundreds
 * of metres (estimated). From 700 m to 1.5 km out the land goes over to SRTM's (works.ts `heightsAt`): the
 * swell the pad stands on the north brow of, Kilinshek to the south-west, the hollow to the north and the Takyrsai's
 * valley to the south. Inside 700 m nothing the place's models stand on has moved.
 */
/** From here to here from the pad the land goes over from the place's own lie (relief.ts) to SRTM's, metres. */
const SRTM_FROM: [number, number] = [700, 1500];
/**
 * And from here to here out (along the land's own axes, as its edge is a square) SRTM's lie comes back to the tracks'
 * level, before the land bends onto the globe (backdrops.ts: its last 1.5 km): so the land's edge and the globe meet
 * as they did, level, and the horizon's line does not hang on which of the land's cells are drawn.
 */
const SRTM_TO: [number, number] = [5200, 6400];
function relief(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const w = smoothstep(SRTM_FROM[0], SRTM_FROM[1], r) * (1 - smoothstep(SRTM_TO[0], SRTM_TO[1], Math.max(Math.abs(x), Math.abs(z))));
  const own = siteRelief(x, -z) + 0.6 * (fbm2(x * 0.0025, z * 0.0025, 61, 3) - 0.45) * smoothstep(400, 900, r);
  return w > 0 ? own + (heightsAt(x, -z) - own) * w : own;
}
const RELIEF = /* glsl */ `
  ${SITE_RELIEF_GLSL}
  float relief(vec2 p) {
    float r = length(p);
    float w = smoothstep(${glsl(SRTM_FROM[0])}, ${glsl(SRTM_FROM[1])}, r) * (1.0 - smoothstep(${glsl(SRTM_TO[0])}, ${glsl(SRTM_TO[1])}, max(abs(p.x), abs(p.y))));
    float own = siteRelief(vec2(p.x, -p.y)) + 0.6 * (fbm2(p * 0.0025, 61, 3) - 0.45) * smoothstep(400.0, 900.0, r);
    return w > 0.0 ? own + (heightsAt(vec2(p.x, -p.y)) - own) * w : own;
  }`;

/**
 * Where Site 1's frame lies on the compass round the origin pad, metres east and south: (0, 0) round Site 1 itself.
 * Site 1's frame is the compass's at Site 1 (its +X due east), so another pad's compass holds it unturned: the meridians'
 * convergence between two pads of the place is left out (compass.ts `frame`), 0.02 degrees over the 3 km to a pad beside it.
 */
const site1In = (compass: Compass): { x: number; z: number } => {
  const at = compass.frame(SITE1);
  return { x: at.x, z: at.z };
};

/**
 * The lie of the land round another pad of the place, `at` the place of Site 1's frame on its compass: Site 1's own
 * (`relief`) where it is drawn round Site 1, put where Site 1 lies; SRTM's lie faded out toward the edge of this pad's
 * land as well as of Site 1's (SRTM_TO, along each one's axes), so the land's edge meets the globe level here too; and
 * the whole let down by the ground's height under this pad, so that the land is at its grade under its model's zero
 * (`base`), faded out with SRTM's toward the edge. Round Site 1 it is not used: `relief` is, to the last bit.
 */
function reliefRound(at: { x: number; z: number }): { relief: (x: number, z: number) => number; base: number; glsl: string } {
  const edge = (x: number, z: number) => 1 - smoothstep(SRTM_TO[0], SRTM_TO[1], Math.max(Math.abs(x), Math.abs(z)));
  const lie = (x: number, z: number): number => {
    const qx = x - at.x,
      qz = z - at.z;
    const r = Math.hypot(qx, qz);
    const w = smoothstep(SRTM_FROM[0], SRTM_FROM[1], r) * edge(qx, qz) * edge(x, z);
    const own = siteRelief(qx, -qz) + 0.6 * (fbm2(qx * 0.0025, qz * 0.0025, 61, 3) - 0.45) * smoothstep(400, 900, r);
    return w > 0 ? own + (heightsAt(qx, -qz) - own) * w : own;
  };
  const base = lie(0, 0);
  const v = `vec2(${at.x.toFixed(3)}, ${at.z.toFixed(3)})`;
  return {
    relief: (x, z) => lie(x, z) - base * edge(x, z),
    base,
    glsl: /* glsl */ `
  ${SITE_RELIEF_GLSL}
  float relief(vec2 p) {
    vec2 q = p - ${v};
    float r = length(q);
    float edge = 1.0 - smoothstep(${glsl(SRTM_TO[0])}, ${glsl(SRTM_TO[1])}, max(abs(p.x), abs(p.y)));
    float w = smoothstep(${glsl(SRTM_FROM[0])}, ${glsl(SRTM_FROM[1])}, r) * (1.0 - smoothstep(${glsl(SRTM_TO[0])}, ${glsl(SRTM_TO[1])}, max(abs(q.x), abs(q.y)))) * edge;
    float own = siteRelief(vec2(q.x, -q.y)) + 0.6 * (fbm2(q * 0.0025, 61, 3) - 0.45) * smoothstep(400.0, 900.0, r);
    return (w > 0.0 ? own + (heightsAt(vec2(q.x, -q.y)) - own) * w : own) - ${base.toFixed(4)} * edge;
  }`,
  };
}

/**
 * The land's GLSL laid round another pad: each function the land calls with a point (land.ts: `coverA`, `coverB`,
 * `paint`, `ground`, `groundCel`) renamed, and called by the land's name with the point put into Site 1's frame, so
 * that everything drawn at Site 1's figures (and every noise of it) lands where it was round Site 1.
 */
const ENTRIES: ['cover' | 'paint' | 'ground' | 'cel', string, string][] = [
  ['cover', 'vec4 coverA(vec2 p) {', 'vec4 coverA(vec2 p) { return coverAInSite1(p - AT); }'],
  ['cover', 'vec4 coverB(vec2 p) {', 'vec4 coverB(vec2 p) { return coverBInSite1(p - AT); }'],
  [
    'paint',
    'void paint(vec2 p, vec4 A, vec4 B, inout Ground g) {',
    'void paint(vec2 p, vec4 A, vec4 B, inout Ground g) { paintInSite1(p - AT, A, B, g); }',
  ],
  ['ground', 'Ground ground(vec2 p, vec4 A, vec4 B) {', 'Ground ground(vec2 p, vec4 A, vec4 B) { return groundInSite1(p - AT, A, B); }'],
  [
    'cel',
    'vec3 groundCel(vec2 p, vec4 A, vec4 B, float roofed) {',
    'vec3 groundCel(vec2 p, vec4 A, vec4 B, float roofed) { return groundCelInSite1(p - AT, A, B, roofed); }',
  ],
];
function inSite1(spec: LandSpec, at: { x: number; z: number }): LandSpec {
  const out = { ...spec };
  const v = `vec2(${at.x.toFixed(3)}, ${at.z.toFixed(3)})`;
  for (const [key, head, call] of ENTRIES) {
    const text = out[key] ?? '';
    const name = head.slice(head.indexOf(' ') + 1, head.indexOf('('));
    if (text.split(head).length !== 2) throw new Error(`ground.ts: ${name} is not defined once in the land's ${key}`);
    out[key] = `${text.replace(head, head.replace(`${name}(`, `${name}InSite1(`))}\n  ${call.replace('AT', v)}`;
  }
  const round = reliefRound(at);
  out.relief = round.relief;
  out.reliefGlsl = round.glsl;
  return out;
}

/**
 * The mapped ground (missions/ussr/places/tyuratam/tyuratam-ground.ts) as a table the cover's bake reads (`mappedKinds`),
 * KINDS_WIDE texels a row: from row 0 each thing's box (west, south, east, north, m); then (its first edge, how many, its
 * kind, half its breadth); then a grid of KINDS_GRID cells a side over the land, each (its first entry, how many) in the
 * list that follows of the things that come within reach of it; then every edge (x0, y0, x1, y1), metres east and north.
 * The grid is so that a texel asks only after the few things near it, not all of them.
 */
/** How far out from a mapped thing its margin reaches, metres (a pan's ring of biyurgun: steppe.ts `steppeMapped`; a worked area's edge). */
const KINDS_REACH = 40;
/** A railway's banks: how far its embankment reaches past its bed's half breadth, metres (estimated; works.ts draws them). */
const RAIL_BANKS = 4;
const KINDS_WIDE = 1024;
const KINDS_GRID = 32;
const KINDS = (() => {
  // (the ground's kinds, then the worked ground: an area is closed, a way open, with half its breadth; a rail's banks are part of it)
  const code = { takyr: 0, salt: 1, sand: 2, channel: 3, worn: 4, bare: 5, graded: 6, rail: 7, road: 8, track: 9 } as const;
  const things: { kind: keyof typeof code; rings: [number, number][][]; open: boolean; half: number }[] = [
    ...MAPPED.map((t) => ({ kind: t.kind, rings: [t.ring], open: t.kind === 'channel', half: (t.width ?? 0) / 2 })),
    ...WORKS_FOR_KINDS.map((w) => ({
      kind: w.kind,
      rings: w.line ? [w.line] : w.rings,
      open: Boolean(w.line),
      half: w.half + (w.kind === 'rail' ? RAIL_BANKS : 0),
    })),
  ];
  const edges: number[][] = [];
  const heads: number[][] = [];
  const boxes: number[][] = [];
  for (const t of things) {
    const first = edges.length;
    for (const ring of t.rings)
      for (let i = 0; i + (t.open ? 1 : 0) < ring.length; i++) {
        const a = ring[i]!,
          b = ring[(i + 1) % ring.length]!;
        edges.push([a[0], a[1], b[0], b[1]]);
      }
    const xs = t.rings.flat().map((p) => p[0]),
      ys = t.rings.flat().map((p) => p[1]);
    boxes.push([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]);
    heads.push([first, edges.length - first, code[t.kind], t.half]);
  }
  // each cell's list: every thing whose box, grown by how far a pan's margin reaches (KINDS_REACH) and half its breadth, touches it
  const cell = (2 * FAR) / KINDS_GRID;
  const cells: number[][] = [];
  const list: number[] = [];
  for (let gy = 0; gy < KINDS_GRID; gy++)
    for (let gx = 0; gx < KINDS_GRID; gx++) {
      const x0 = -FAR + gx * cell,
        y0 = -FAR + gy * cell;
      const start = list.length;
      boxes.forEach((b, j) => {
        const reach = KINDS_REACH + heads[j]![3]!;
        if (b[0]! - reach < x0 + cell && b[2]! + reach > x0 && b[1]! - reach < y0 + cell && b[3]! + reach > y0) list.push(j);
      });
      cells.push([start, list.length - start]);
    }
  const rows = (n: number) => Math.max(1, Math.ceil(n / KINDS_WIDE));
  const at = { heads: rows(things.length), cells: 0, list: 0, edges: 0, height: 0 };
  at.cells = rows(things.length) + at.heads;
  at.list = at.cells + rows(cells.length);
  at.edges = at.list + rows(list.length);
  at.height = at.edges + rows(edges.length);
  const data = new Float32Array(KINDS_WIDE * at.height * 4);
  const put = (row: number, i: number, v: number[]) =>
    data.set(v, ((row + Math.floor(i / KINDS_WIDE)) * KINDS_WIDE + (i % KINDS_WIDE)) * 4);
  boxes.forEach((v, j) => put(0, j, v));
  heads.forEach((v, j) => put(at.heads, j, v));
  cells.forEach((v, j) => put(at.cells, j, v));
  list.forEach((v, j) => put(at.list, j, [v]));
  edges.forEach((v, j) => put(at.edges, j, v));
  const texture = new THREE.DataTexture(data, KINDS_WIDE, at.height, THREE.RGBAFormat, THREE.FloatType);
  texture.needsUpdate = true;
  return { at, texture };
})();

/**
 * How the cover follows the lie of the land, the soils and the worked ground (`cover` below). Estimated: no survey of
 * the vegetation round the pad has been read; that growth is thicker in the steppe's hollows and thinner on its rises is
 * the steppe's way (water gathers in the low ground: Krechetov 2015, p. 17, of the takyrs' hollows), how much is ours.
 * - `hollow`: metres below the ground round it (LOW_REACH away) over which a hollow comes to count fully;
 * - `herb`, `shrub`: how much more grows in a hollow and less on a rise (herb added, shrub as a share);
 * - `sandyWest`: Krechetov's Fig. 1, unit 2 (grey-brown sandy and sandy-loam soils), west of this, m east (to a km);
 * - `takyrs`: unit 4 (takyrs and takyr-like saline loams), east of the first figure and south of the second;
 * - `worn`: how much of the shrubs and of the spring's growth a worn area has lost.
 */
const SITE_COVER = {
  hollow: [0.4, 2.2],
  herb: [0.3, 0.18],
  shrub: [0.25, 0.2],
  sandyWest: -5300,
  takyrs: [2000, -2500],
  worn: [0.75, 0.8],
};
/** How far round the ground at a point `lowness` looks, metres. */
const LOW_REACH = 250;

/**
 * What covers the ground: the steppe's own (steppe.ts: `steppeMapped`), told where the pans and the old channels are
 * (the maps and the Corona frames: tyuratam-ground.ts, `KINDS`). Over that, what the builders made: graded ground on the
 * apron, the tracks' beds and a margin round the pit; the ground inside the fence worn in patches by four years of
 * building and the round of work (the 1957 photograph shows bare ground round the pad and pit, site-1.md); a ring of
 * turned ground round the spoil heap; and nothing on the platform, in the pit, on a road or on the apron's slabs.
 */
const COVER = /* glsl */ `
  ${STEPPE_COVER}
  // the builders' ground: graded (1) where it was made, worn where it was worked over (the fence's inside, the spoil's foot)
  float madeGround(vec2 p) {
    float made = 1.0 - smoothstep(0.0, 25.0, platform(p) - ${glsl(APRON)} + 30.0 * (noise2(p * 0.02, 34) - 0.5));
    made = max(made, 1.0 - smoothstep(3.0, 9.0, rail(p)));
    made = max(made, 1.0 - smoothstep(-2.0, 12.0, -inPit(p) - 6.0 * noise2(p * 0.05, 35)));
    made = max(made, 1.0 - smoothstep(${glsl(ROAD_HALF + 0.5)}, ${glsl(ROAD_HALF + 4)}, road(p)));
    return made;
  }
  float wornGround(vec2 p) {
    float inside = smoothstep(-10.0, 15.0, fenced(p));
    float worn = inside * smoothstep(0.52, 0.68, fbm2(p * 0.012, 38, 3) + 0.1 * (noise2(p * 0.06, 39) - 0.5)) * 0.55;
    worn = max(worn, (1.0 - smoothstep(0.0, 35.0, spoil(p) + 10.0 * (noise2(p * 0.04, 40) - 0.5))) * 0.85);
    return worn;
  }
  // The ground's kinds where the map has them (KINDS): how far inside the nearest mapped pan, salt crust, sand patch and
  // old channel's bed p is, metres (-1e4 where none is near); and the same of the worked ground (tyuratam-works.ts): a
  // worn area, a bare one, a graded strip, and the nearest railway, road or track with its banks and margin.
  uniform sampler2D uKinds;
  vec4 kindsAt(int row, int i) {
    return texelFetch(uKinds, ivec2(i % ${KINDS_WIDE}, row + i / ${KINDS_WIDE}), 0);
  }
  void mappedKinds(vec2 p, out vec4 inside, out vec4 made) {
    inside = vec4(-1e4);
    made = vec4(-1e4);
    vec2 q = vec2(p.x, -p.y);
    ivec2 g = ivec2(floor((q + ${glsl(FAR)}) / ${glsl((2 * FAR) / KINDS_GRID)}));
    if (g.x < 0 || g.y < 0 || g.x >= ${KINDS_GRID} || g.y >= ${KINDS_GRID}) return;
    vec4 c = kindsAt(${KINDS.at.cells}, g.y * ${KINDS_GRID} + g.x);
    int start = int(c.x + 0.5), n = int(c.y + 0.5);
    for (int k = 0; k < n; k++) {
      int j = int(kindsAt(${KINDS.at.list}, start + k).x + 0.5);
      vec4 box = kindsAt(0, j);
      vec4 info = kindsAt(${KINDS.at.heads}, j);
      float reach = ${glsl(KINDS_REACH)} + info.w;
      if (q.x < box.x - reach || q.x > box.z + reach || q.y < box.y - reach || q.y > box.w + reach) continue;
      int first = int(info.x + 0.5), count = int(info.y + 0.5), kind = int(info.z + 0.5);
      float best = 1e9;
      bool odd = false;
      for (int i = 0; i < count; i++) {
        vec4 e = kindsAt(${KINDS.at.edges}, first + i);
        best = min(best, segment(q, e));
        if ((e.y > q.y) != (e.w > q.y) && q.x < e.x + (e.z - e.x) * (q.y - e.y) / (e.w - e.y)) odd = !odd;
      }
      float d = kind == 3 || kind >= 6 ? info.w - best : (odd ? best : -best);
      if (kind == 0) inside.x = max(inside.x, d);
      else if (kind == 1) inside.y = max(inside.y, d);
      else if (kind == 2) inside.z = max(inside.z, d);
      else if (kind == 3) inside.w = max(inside.w, d);
      else if (kind == 4) made.x = max(made.x, d);
      else if (kind == 5) made.y = max(made.y, d);
      else if (kind == 6) made.z = max(made.z, d);
      else made.w = max(made.w, d);
    }
  }
  // How far the ground at p lies below the ground round it, metres (SRTM: works.ts), over some 250 m: positive
  // in a hollow or a wash's bed, negative on a swell.
  float lowness(vec2 p) {
    vec2 q = vec2(p.x, -p.y);
    float round_ = heightsAt(q + vec2(${glsl(LOW_REACH)}, 0.0)) + heightsAt(q - vec2(${glsl(LOW_REACH)}, 0.0)) + heightsAt(q + vec2(0.0, ${glsl(LOW_REACH)})) + heightsAt(q - vec2(0.0, ${glsl(LOW_REACH)}));
    return 0.25 * round_ - heightsAt(q);
  }
  void cover(vec2 p, out float shrub, out float herb, out float takyr, out float salt, out float sand, out float zone, out float works) {
    vec4 inside, made;
    mappedKinds(p, inside, made);
    steppeMapped(p, inside.x, inside.y, inside.z, shrub, herb, takyr, salt, sand, zone);
    // an old channel's bed: the thaw's water lies longest there, so it is greener, ringed with the hollows' shrubs
    float bed = smoothstep(-4.0, 4.0, inside.w + 6.0 * (noise2(p * 0.03, 68) - 0.5));
    herb = mix(herb, min(1.0, herb + 0.3), bed * (1.0 - takyr));
    zone = mix(zone, 0.8, bed * (1.0 - takyr) * (1.0 - sand));
    // The lie of the land: the snow's water gathers in the low ground and runs off the swells, so the spring's growth is
    // thicker and greener in a hollow and thinner on a rise, where more of the crust shows (SITE_COVER)
    float low = lowness(p);
    float hollow = smoothstep(${glsl(SITE_COVER.hollow[0])}, ${glsl(SITE_COVER.hollow[1])}, low) * (1.0 - takyr);
    float rise = smoothstep(${glsl(SITE_COVER.hollow[0])}, ${glsl(SITE_COVER.hollow[1])}, -low) * (1.0 - takyr);
    herb = clamp(herb + ${glsl(SITE_COVER.herb[0])} * hollow - ${glsl(SITE_COVER.herb[1])} * rise, 0.0, 1.0);
    shrub = clamp(shrub * (1.0 + ${glsl(SITE_COVER.shrub[0])} * hollow - ${glsl(SITE_COVER.shrub[1])} * rise), 0.0, 1.0);
    zone = mix(zone, 0.8, 0.45 * hollow * (1.0 - sand));
    // The soils (Krechetov 2015, placed to a kilometre: SITE_COVER): sandy loams to the west, with more teresken and
    // sedge; the takyrs' complexes to the south-east, with more biyurgun and saltwort and thinner growth
    vec2 q = vec2(p.x, -p.y);
    float sandy = 1.0 - smoothstep(${glsl(SITE_COVER.sandyWest - 600)}, ${glsl(SITE_COVER.sandyWest + 600)}, q.x);
    float takyrs = smoothstep(${glsl(SITE_COVER.takyrs[0] - 600)}, ${glsl(SITE_COVER.takyrs[0] + 600)}, q.x) * (1.0 - smoothstep(${glsl(SITE_COVER.takyrs[1] - 600)}, ${glsl(SITE_COVER.takyrs[1] + 600)}, q.y));
    zone = mix(zone, 0.3, 0.5 * sandy * (1.0 - takyr));
    zone = mix(zone, 0.8, 0.35 * takyrs * (1.0 - takyr));
    herb *= 1.0 - 0.15 * takyrs;
    // The worked ground (tyuratam-works.ts): over a worn area the crust is ground to dust and most of what grew is gone;
    // a bare one, a graded strip and a way are bare; each edge wanders a little, as worn ground does
    float wander = 10.0 * (noise2(p * 0.02, 160) - 0.5) + 4.0 * (noise2(p * 0.08, 161) - 0.5);
    float worn = smoothstep(-10.0, 10.0, made.x + wander);
    float bare = max(smoothstep(-8.0, 8.0, made.y + wander), smoothstep(-1.5, 1.5, made.z));
    float way = smoothstep(-1.0, 1.0, made.w);
    float verge = smoothstep(-6.0, 0.0, made.w) * (1.0 - way);
    // (worn in patches: here stripped, there a few clumps of wormwood left between the ruts)
    worn *= 0.75 + 0.25 * smoothstep(0.35, 0.65, noise2(p * 0.03, 162));
    shrub *= (1.0 - ${glsl(SITE_COVER.worn[0])} * worn) * (1.0 - 0.9 * bare) * (1.0 - way) * (1.0 - 0.6 * verge);
    herb *= (1.0 - ${glsl(SITE_COVER.worn[1])} * worn) * (1.0 - 0.85 * bare) * (1.0 - way) * (1.0 - 0.4 * verge);
    works = max(max(0.5 * worn, 0.85 * bare), max(way, 0.3 * verge));
    // the fans' tracks over the worn ground: their wheels have left nothing growing (the paint draws them: WORKS_PAINT)
    float across, lane;
    float tracks = fansAt(q, across, lane) * smoothstep(0.12, 0.4, works) * smoothstep(-20.0, 20.0, -fenced(p));
    shrub *= 1.0 - 0.8 * tracks;
    herb *= 1.0 - 0.6 * tracks;
  }
  vec4 coverA(vec2 p) {
    float shrub, herb, takyr, salt, sand, zone, works;
    cover(p, shrub, herb, takyr, salt, sand, zone, works);
    float made = madeGround(p), worn = wornGround(p);
    shrub *= (1.0 - made) * (1.0 - 0.75 * worn);
    herb *= (1.0 - 0.85 * made) * (1.0 - 0.6 * worn);
    // nothing grows on the platform, down in the pit, on a road or on the apron's slabs
    float none = max(1.0 - smoothstep(-1.0, 1.0, platform(p)), smoothstep(-1.0, 1.0, inPit(p)));
    none = max(none, 1.0 - smoothstep(${glsl(ROAD_HALF)}, ${glsl(ROAD_HALF + 0.6)}, road(p)));
    none = max(none, 1.0 - smoothstep(-0.5, 1.5, apron(p)));
    shrub *= 1.0 - none;
    herb *= 1.0 - none;
    return vec4(shrub, herb, clamp(1.0 - shrub - herb, 0.0, 1.0), zone);
  }
  vec4 coverB(vec2 p) {
    float shrub, herb, takyr, salt, sand, zone, works;
    cover(p, shrub, herb, takyr, salt, sand, zone, works);
    float made = max(madeGround(p), smoothstep(0.8, 1.0, works));
    float worked = max(1.0 - smoothstep(0.0, 25.0, platform(p) - ${glsl(APRON)} + 30.0 * (noise2(p * 0.02, 34) - 0.5)), 1.0 - smoothstep(2.0, 6.0, rail(p)));
    worked = max(worked, 1.0 - smoothstep(${glsl(ROAD_HALF)}, ${glsl(ROAD_HALF + 3)}, road(p)));
    worked = max(worked, max(wornGround(p), works));
    // graded ground is neither pan nor crust nor sand: the builders scraped it
    float kept = 1.0 - made;
    return vec4(worked, salt * kept, sand * kept, takyr * kept);
  }`;

/** The steppe's shrubs are knee high at most: there is no thicket to stand up on the horizon. */
const CANOPY = /* glsl */ `
  float canopyHeight(vec4 A, vec4 B) { return 0.0; }`;

/**
 * How far inside the pit's rim the land goes on over the pit's own ground before it is cut away, metres. The rim is a
 * crest (the pit's side goes down inward, and on down outward under the land), and the pit's cells, 2 m and at a lower
 * level of detail 4 m, cut across it: lower than the land by up to a metre or two within a cell of it. Over that the
 * land is the ground, so no crack opens between the two. Three metres is inside what the map's outline is good for.
 */
const OVERLAP = 3;

/**
 * The site's own marks: the roads (concrete laid in slabs, a joint across every six metres and one down the middle), the
 * tracks' beds (grey stone ballast, sleepers, two rails at the Soviet gauge, 1,524 mm in 1961), and the hole where the flame
 * pit is. The rails are paint, not rails, except where they come up to the platform (the place's model: deck.py), and
 * there, over the apron, the band of concrete they lie in is the model's too and the land is left open for it (STRIP).
 */
const PAINT = /* glsl */ `
  ${SCARP_FRAME_GLSL}
  ${WORKS_PAINT}
  // how far along its own track each of uRails' segments begins (SEGMENT_FROM: a constant, so it takes no uniform)
  const float RAIL_FROM[${SEGMENTS.length}] = float[${SEGMENTS.length}](${SEGMENT_FROM.map(glsl).join(', ')});
  // The graded fall: four springs' thaw on bare clay. Rills down it where it is steep, a stride or two apart, each
  // starting below the brow, deepest on the steepest part and fanning out at the foot; and the toe darker, where the
  // fines wash to and the thaw's water stands. Their spacing, breadth and tone are estimated (site-1.md, "The lie of
  // the land"): no photograph of the fall close enough to show them has been read.
  void fall(vec2 p, inout Ground g) {
    if (dot(p, p) > 1.44e6) return;
    vec2 q = vec2(p.x, -p.y);
    float along, past = browFrame(q, along);
    float u = past / scarpBreadth(q);   // 0 at the brow, 1 at the foot
    if (u < 0.05 || u > 1.5) return;
    float steep = length(landUp.xz) / max(landUp.y, 0.2);   // rise over run, as the ground is lit
    float toe = smoothstep(0.75, 1.0, u) * (1.0 - smoothstep(1.05, 1.45, u + 0.15 * (noise(vec3(p * 0.05, 72.0)) - 0.5)));
    g.albedo *= 1.0 - 0.09 * toe;
    float spacing = 3.6;
    float a = along + 2.4 * (noise(vec3(along * 0.12, past * 0.09, 70.0)) - 0.5);
    float lane = floor(a / spacing);
    // (each wanders on its own as it goes down, a hand's breadth at its head and a stride where it spills at the foot)
    a += 0.9 * (noise(vec3(lane * 3.1, past * 0.45, 74.0)) - 0.5) + 0.25 * (noise(vec3(lane * 5.7, past * 1.6, 75.0)) - 0.5);
    float off = a - (lane + 0.5) * spacing + 0.9 * (hash(vec3(lane, 0.0, 73.0)) - 0.5) * spacing;
    float width = mix(0.08, 0.5, smoothstep(0.15, 1.05, u)) * (0.6 + 0.8 * hash(vec3(lane, 1.0, 73.0)));
    float rill = (1.0 - smoothstep(width * 0.5, width, abs(off))) * step(0.35, hash(vec3(lane, 2.0, 73.0)));
    rill *= smoothstep(0.08 + 0.2 * hash(vec3(lane, 3.0, 73.0)), 0.35, u) * (1.0 - smoothstep(0.9, 1.15, u)) * smoothstep(0.1, 0.22, steep);
    if (uCel > 0.5) {
      g.albedo = mix(g.albedo, g.albedo * 0.72, step(0.5, rill) * seen(0.3));
      return;
    }
    rill *= seen(0.25);
    vec3 cut = g.albedo * vec3(0.82, 0.8, 0.78);
    g.albedo = mix(g.albedo, cut, rill);
    g.bump += -0.05 * rill;
  }
  void paint(vec2 p, vec4 A, vec4 B, inout Ground g) {
    // (a little inside the rim, over the pit's own slope: OVERLAP)
    if (inPit(p) > ${glsl(OVERLAP)}) discard;
    // and open along each track over the apron, where the place's model lays the band of concrete with its flangeways (STRIP)
    float d = rail(p);
    if (d < ${glsl(STRIP)} && apron(p) < 0.0) discard;
    fall(p, g);
    paintWorks(p, B, g);
    float way = road(p);
    float paved = 1.0 - smoothstep(${glsl(ROAD_HALF - 0.08)}, ${glsl(ROAD_HALF + 0.08)}, way + 0.06 * (noise(vec3(p * 1.5, 30.0)) - 0.5));
    if (paved > 0.0) {
      vec3 slab = vec3(0.50, 0.48, 0.44) * (0.86 + 0.28 * mix(0.5, noise(vec3(p * 2.5, 31.0)), seen(0.4)));
      // (the joints: how far along its own stretch of road, and the line down the middle)
      float joint = 1.0 - smoothstep(0.02, 0.05, way);
      for (int i = 0; i < ${ROAD_SEGMENTS.length}; i++) {
        vec4 s = uRoads[i];
        vec2 ab = s.zw - s.xy;
        float t = dot(p - s.xy, ab) / dot(ab, ab);
        if (t < 0.0 || t > 1.0 || segment(p, s) > ${glsl(ROAD_HALF)}) continue;
        joint = max(joint, 1.0 - smoothstep(0.02, 0.05, abs(fract(t * length(ab) / 6.0) - 0.5) * 6.0));
      }
      slab = mix(slab, vec3(0.12, 0.115, 0.105), joint * seen(0.08));
      g.albedo = mix(g.albedo, slab, paved);
      g.rough = mix(g.rough, 0.92, paved);
      g.bump = mix(g.bump, 0.004 * (noise(vec3(p * 9.0, 32.0)) - 0.5), paved);
    }
    // The apron (SLABS), as the film shows it from the erector's head: rectangular slabs in rows along the tracks, each a
    // little darker in its middle than at its margins and each a shade of its own, the joints pale with sand; a pale
    // band of concrete along each track with the rails flush in it (the band itself, with a flangeway inside each rail,
    // is the place's model over the apron, STRIP: what is painted of it here is its margin, its joint with the slabs, and
    // the little that the slabs' ragged edge carries past the apron's ends); the steppe's dust drifted over the outer
    // slabs, which give way to bare trodden earth.
    float slabbed = 1.0 - smoothstep(-0.03, 0.03, apron(p) + 1.4 * smoothstep(-6.0, 0.0, apron(p)) * (noise(vec3(p * 0.16, 92.0)) - 0.35));
    if (slabbed > 0.0) {
      vec2 size = vec2(${glsl(SLABS.along)}, ${glsl(SLABS.across)});
      vec2 s = (p - vec2(${glsl(SLABS.east)}, 0.0)) / size;
      vec2 id = floor(s), f = s - id;
      vec2 margin = min(f, 1.0 - f) * size;
      float e = min(margin.x, margin.y);   // metres to the slab's edge
      float tone = hash(vec3(id, 90.0));
      vec3 slab = vec3(0.52, 0.505, 0.47) * (0.9 + 0.14 * tone);
      // (the middle's stain is blotchy, not a rectangle: wet weathers in from the margins unevenly)
      float stain = smoothstep(0.1, 0.6, e + 0.25 * (noise(vec3(p * 1.1, 94.0)) - 0.5)) * (0.04 + 0.14 * hash(vec3(id, 95.0)));
      slab *= 1.0 - stain * seen(0.5);
      slab *= 0.94 + 0.12 * mix(0.5, noise(vec3(p * 1.3, 91.0)) * 0.6 + noise(vec3(p * 0.35, 96.0)) * 0.4, seen(0.4));
      // the steppe's dust blown into the margins
      slab = mix(slab, ${vec3(STEPPE.dust)}, 0.25 * (1.0 - smoothstep(0.0, 0.2, e)) * seen(0.2));
      // along each track: the pale band with the rails in it
      float band = 1.0 - smoothstep(1.15, 1.25, d);
      slab = mix(slab, vec3(0.6, 0.585, 0.55) * (0.95 + 0.06 * noise(vec3(p * 0.7, 93.0))), band);
      float joint = (1.0 - smoothstep(0.015, 0.035, e)) * (1.0 - band);
      joint = max(joint, (1.0 - smoothstep(0.015, 0.035, abs(d - 1.2))) * step(d, 1.5));
      slab = mix(slab, vec3(0.63, 0.59, 0.51), joint * seen(0.06));
      // (no flangeway is painted: the band's are cut in the model, and where the slabs' edge runs on past the apron's
      // west end the rails have risen out of them)
      float steel = 1.0 - smoothstep(0.03, 0.04, abs(d - 0.79));
      slab = mix(slab, vec3(0.45, 0.43, 0.41), steel * band * seen(0.07));
      if (uCel > 0.5) {
        // drawn: two flat tones of slab, the band paler, the joints and the rails inked
        slab = mix(vec3(0.6, 0.585, 0.55) * (tone > 0.62 ? 0.92 : 1.0), vec3(0.66, 0.645, 0.6), step(0.5, band));
        slab = mix(slab, slab * 0.68, step(0.5, max(joint, steel * band)) * seen(0.06));
      }
      g.albedo = mix(g.albedo, slab, slabbed);
      g.rough = mix(g.rough, mix(0.9, 0.45, steel * band), slabbed);
      g.bump = mix(g.bump, -0.008 * joint * seen(0.05), slabbed);
      if (slabbed > 0.99) return;
    }
    float bed = 1.0 - smoothstep(1.6, 2.1, d + 0.3 * (noise(vec3(p * 0.8, 20.0)) - 0.5));
    bed *= 1.0 - slabbed;
    if (bed > 0.0) {
      vec3 ballast = vec3(0.33, 0.32, 0.30) * (0.8 + 0.4 * mix(0.5, noise(vec3(p * 22.0, 22.0)), seen(0.04)));
      g.albedo = mix(g.albedo, ballast, bed);
      g.bump = mix(g.bump, 0.01 * (noise(vec3(p * 12.0, 23.0)) - 0.5), bed);
      // (sleepers 0.55 m apart square to the track, and the two rails 0.79 m either side of its middle: each only where it can be made out)
      float k = 0.0;
      for (int i = 0; i < ${SEGMENTS.length}; i++) {
        vec4 s = uRails[i];
        vec2 ab = s.zw - s.xy;
        float t = dot(p - s.xy, ab) / dot(ab, ab);
        if (t < 0.0 || t > 1.0 || segment(p, s) > 1.6) continue;
        float along = t * length(ab) + RAIL_FROM[i];
        float tie = (1.0 - smoothstep(0.11, 0.14, abs(fract(along / ${glsl(SLEEPERS)}) - 0.5) * ${glsl(SLEEPERS)})) * step(d, 1.35);
        g.albedo = mix(g.albedo, vec3(0.13, 0.1, 0.08), tie * seen(0.25));
        float steel = 1.0 - smoothstep(0.03, 0.05, abs(d - 0.79));
        k = max(k, steel);
      }
      g.albedo = mix(g.albedo, vec3(0.42, 0.4, 0.38), k * seen(0.07));
      g.rough = mix(g.rough, 0.45, k * seen(0.07));
    }
  }`;

/** The ground, as land.ts takes it, round the pad the compass is laid round (Site 1, or another: `inSite1`). */
function landSpec(season: SteppeSeason, compass: Compass): LandSpec {
  const at = site1In(compass);
  const spec: LandSpec = {
    near: 1024,
    texels: 1024,
    far: FAR,
    // (the worked ground's areas and the ways reach 6 km: a texel of 16 m keeps a worn area's edge and a road's line)
    farTexels: 1024,
    // (it reads a table of its own, the heights and the ways: works.ts)
    paired: true,
    shared: SHARED,
    cover: COVER,
    relief,
    reliefGlsl: RELIEF,
    sea: null,
    canopy: CANOPY,
    crown: 1.0,
    paint: PAINT,
    uniforms: {
      uRim: { value: RIM.map(([x, y]) => new THREE.Vector2(x, y)) },
      uRails: { value: SEGMENTS.map((s) => new THREE.Vector4(...s)) },
      uRoads: { value: ROAD_SEGMENTS.map((s) => new THREE.Vector4(...s)) },
      uRuts: { value: RUT_SEGMENTS.map((r) => new THREE.Vector4(...r.s)) },
      uRutKind: { value: RUT_SEGMENTS.map((r) => new THREE.Vector2(r.half, r.worn)) },
      uKinds: { value: KINDS.texture },
      ...worksUniforms(),
    },
    palette: steppePalette(season),
    ground: steppeGround(season),
    cel: steppeCelGround(season),
    // the scarp, the ramp and the plots are graded earth: smooth, not faceted
    smooth: true,
  };
  if (at.x === 0 && at.z === 0) return spec;
  const local = inSite1(spec, at);
  if (compass.origin === SITE31) {
    // The common land is in compass metres. The rail approaches the excavated face along local +X.
    const a = (SITE31.bearingX.value * Math.PI) / 180;
    const east = Math.sin(a),
      south = -Math.cos(a);
    const radius = (x: number, z: number) => Math.hypot((east * x + south * z - 48) / 77, (-south * x + east * z) / 48);
    // A graded apron and a broad cut in the steppe. The outline and depth are illustrative; site-31.md.
    const regional = local.relief;
    local.relief = (x, z) => -26 * (1 - smoothstep(0.55, 1, radius(x, z))) + regional(x, z) * smoothstep(134, 184, Math.hypot(x, z));
    local.reliefGlsl = `
      ${local.reliefGlsl.replace('float relief(vec2 p)', 'float regionalRelief(vec2 p)')}
      vec2 inPad31(vec2 p) { return vec2(dot(p, vec2(${east}, ${south})), dot(p, vec2(${-south}, ${east}))); }
      float pit31(vec2 p) { return length((inPad31(p) - vec2(48.0, 0.0)) / vec2(77.0, 48.0)); }
      float relief(vec2 p) { return -26.0 * (1.0 - smoothstep(0.55, 1.0, pit31(p))) + regionalRelief(p) * smoothstep(134.0, 184.0, length(p)); }
    `;
    // Keep shrubs off the rail approach, work area and bare cut. These are also the cover values the flora reads.
    local.cover = local.cover.replace(
      'vec4 coverA(vec2 p) { return',
      `vec4 coverA(vec2 p) {
      vec2 q = inPad31(p);
      if (pit31(p) < 1.05 || (q.x > -86.0 && q.x < 22.0 && abs(q.y) < 22.0)) return vec4(0.0, 0.0, 1.0, 0.0);
      return`,
    );
  }
  return local;
}

/** How far inside the flame pit's rim a point is, metres (negative outside it): as `inPit` in the shader. */
function inPit(x: number, z: number): number {
  const n = -z;
  let best = Number.POSITIVE_INFINITY;
  let odd = false;
  for (let i = 0; i < RIM.length; i++) {
    const [ax, ay] = RIM[i]!;
    const [bx, by] = RIM[(i + 1) % RIM.length]!;
    const dx = bx - ax,
      dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (n - ay) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(x - ax - t * dx, n - ay - t * dy));
    if (ay > n !== by > n && x < ax + ((bx - ax) * (n - ay)) / (by - ay)) odd = !odd;
  }
  return odd ? best : -best;
}

/** Under the pit's floor (43 m) by a margin: inside the rim the open ground is this far down, and what is walked on is the pit's own model. */
const UNDER_PIT = -60;

/**
 * What stands round the site beyond its own place and is seen from it, modelled apart (viewer/around.ts), each in Site 1's
 * frame with its node's origin at its middle on the ground: Site 2's assembly and test building, 1.99 km off on 253
 * degrees, whose top shows over the land from the deck, with the buildings of its yard (site2/mik.py, site2/yard.py,
 * `pnpm model site2`); and the measuring point IP-1, 1.4 km south-west, with the tracking station built along the road
 * south-east of it by 1963 (ip1/centre.py, `pnpm model ip1`). Each model is the range on a day a photograph was taken
 * of it: July 1959, the U-2's last before the flights (assumed to stand in April 1961, as the pad's own surroundings
 * are), and 24 September 1964, a KH-7's, eighteen days before Voskhod 1 (site-1.md, "Beyond the fences").
 */
const YARD_1959 = ['AssemblyBuilding', 'YardWorkshop', 'YardStore', 'YardTallBuilding', 'YardShop'];
const CENTRE_1959 = [
  'MeasuringHeadquarters',
  'MeasuringBuilding14',
  'MeasuringBuilding15',
  'MeasuringBuilding13',
  'MeasuringInstrumentBuilding',
  'MeasuringGenerator',
  'MeasuringDomeBuilding',
];
const WALLS = ['concrete-plaster-whitewashed', 'roof-felt-grey', 'steel-door-green', 'window-void'];
const NEIGHBOURS: SiteAround[] = [
  {
    model: 'models/ussr/places/tyuratam/site2/1961-04.glb',
    nodes: YARD_1959,
    wears: [...WALLS, 'steel-window-frame'],
    from: '1961-04-12',
    until: '1964-09-24',
  },
  {
    model: 'models/ussr/places/tyuratam/site2/1964-09.glb',
    nodes: [...YARD_1959, 'YardLongBuilding'],
    wears: [...WALLS, 'steel-window-frame'],
    from: '1964-09-24',
  },
  {
    model: 'models/ussr/places/tyuratam/ip1/1961-04.glb',
    nodes: CENTRE_1959,
    wears: [...WALLS, 'wall-limewashed-white'],
    from: '1961-04-12',
    until: '1964-09-24',
  },
  {
    model: 'models/ussr/places/tyuratam/ip1/1964-09.glb',
    nodes: [...CENTRE_1959, 'TrackingBuildingWest', 'TrackingBuildingEast', 'TrackingSupportBuilding', 'TrackingTower'],
    wears: [...WALLS, 'wall-limewashed-white', 'paint-structure-grey'],
    from: '1964-09-24',
  },
];

/**
 * How what is built in Site 1's frame is stood on the land round the origin pad: where that frame lies on the compass
 * (`x`, `z`: its zero is put there, at the compass's height zero), and how far to raise a thing whose middle is (x, z)
 * in Site 1's frame and which reaches `half` metres from it over where its model has it: onto the highest of the land
 * drawn under it, less the site's relief at its middle, which its model stands on (site1/relief.py), and plus the origin
 * pad's grade less Site 1's (each model is built at Site 1's). Its walls go down 0.48 m into the land. Round
 * Site 1 the frame is the land's and the lift is the land's height less the relief, to the last bit.
 */
export function standsInSite1(compass: Compass, land: { heightAt(x: number, z: number): number }) {
  const at = site1In(compass);
  const grades = compass.origin.grade.value - SITE1.grade.value;
  return {
    x: at.x,
    z: at.z,
    lift: (x: number, z: number, half: number): number => {
      let top = Number.NEGATIVE_INFINITY;
      for (let i = -1; i <= 1; i++)
        for (let j = -1; j <= 1; j++) top = Math.max(top, land.heightAt(x + 0.7 * half * i + at.x, z + 0.7 * half * j + at.z));
      return top - siteRelief(x, -z) + grades;
    },
  };
}

/** How far (x, z) is from the nearest of `segments` ([x0, z0, x1, z1] in Site 1's frame), metres: the shader's `segment`. */
function nearest(segments: readonly [number, number, number, number][], x: number, z: number): number {
  let best = Number.POSITIVE_INFINITY;
  for (const s of segments) best = Math.min(best, segmentDistance(s, x, z));
  return best;
}

/**
 * The painted surface at (x, z) in Site 1's frame. On graded roads, dirt tracks and worn ruts the tread meets packed earth.
 * Unpainted steppe returns null so the site's seasonal ground supplies the tread.
 */
export function paintedInSite1(x: number, z: number): 'apron' | 'road' | 'ballast' | 'packed-earth' | null {
  const north = -z;
  if (x <= SLABS.east && x >= SLABS.west && north <= SLABS.north && north >= SLABS.south) return 'apron';
  if (x > -1880 && x < 270 && z > -280 && z < 800 && nearest(ROAD_SEGMENTS, x, z) < ROAD_HALF) return 'road';
  if (nearest(SEGMENTS, x, z) < 1.85) return 'ballast';
  const way = waySurface(x, -z);
  if (way) return way;
  // The audible strip is the visibly worn part of the rutted band; both paints use the same strength and two noise fields.
  let wear = 0;
  for (const rut of RUT_SEGMENTS) {
    const d = segmentDistance(rut.s, x, z);
    wear = Math.max(wear, (1 - smoothstep(0.25, 1, d / rut.half)) * rut.worn);
  }
  if (!wear) return null;
  const braided = smoothstep(0.3, 0.6, noise2(x * 0.012, z * 0.012, 36) + 0.25 * noise2(x * 0.05, z * 0.05, 37));
  return wear * braided > 0.35 ? 'packed-earth' : null;
}

/**
 * The steppe round any pad at Tyuratam, as viewer/scenery/ground.ts lays it out. Everything here is in Site 1's own frame
 * (its +X due east, so the compass frame round it), and round another pad it is put where Site 1 lies from it: the rim,
 * the tracks, the apron, the relief and the worked ground (`inSite1`), the open ground under the pit (`under`) and what
 * stands round (`standsInSite1`). What that pad's own ground is (its lie, its tracks, its pit) is its own to give.
 */
export const TYURATAM_GROUND: GroundSpec = {
  // the land in its season on the flight's day: the thaw's snow and mud, the spring's flush, the summer's straw, the autumn's grey (steppe.ts `seasonOf`)
  land: (day, compass) => landSpec(seasonOf(day.date), compass),
  flora: steppeFlora,
  reach: 1500,
  horizon: FAR,
  scenery: ({ land, day, compass }) => {
    const stands = standsInSite1(compass, land);
    const far = NEIGHBOURS.filter((n) => stood(n, day.date)).map((n) => {
      const around = buildAround(n, stands.lift);
      around.group.position.set(stands.x, 0, stands.z);
      return around;
    });
    return { objects: far.map((a) => a.group), levels: far, arrived: () => far.map((a) => a.arrived()).some(Boolean) };
  },
  // a tyre on what the land is painted as (the shader's `apron`, `road` and the tracks' beds, inside their edges), by the
  // names place.ts’s `tread.painted` hears them as, including the mapped ways beyond the pad and its worn wheel tracks
  painted: (x, z, compass) => {
    const at = site1In(compass);
    return paintedInSite1(x - at.x, z - at.z);
  },
  // inside the flame pit's rim the open ground is far down, and what is walked on is the pit's own model
  under: (x, z, compass) => {
    const at = site1In(compass);
    return inPit(x - at.x, z - at.z) > OVERLAP ? UNDER_PIT : null;
  },
  /** The ground's own tone, for the land beyond it on the globe (globe.ts): the steppe's, not the Cape's green; and in the cel look. */
  tone: (day) => steppeTone(seasonOf(day.date)),
  drawn: (day) => steppeCel(seasonOf(day.date)),
};

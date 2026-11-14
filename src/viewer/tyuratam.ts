import * as THREE from 'three';
import { TYURATAM_GROUND } from '../../missions/ussr/vostok/sites/tyuratam-ground.ts';
import type { SiteAround } from '../types';
import { type Air, driftClouds, installAir } from './air';
import { buildAround } from './around';
import type { Day } from './day.ts';
import { fbm2 } from './field';
import { Flora } from './flora';
import { Land, type LandSpec } from './land';
import { STEPPE, STEPPE_CEL, STEPPE_CEL_GROUND, STEPPE_COVER, STEPPE_GROUND, STEPPE_PALETTE, STEPPE_TONE, steppeFlora } from './steppe.ts';
import { SCARP_FRAME_GLSL, SITE_RELIEF_GLSL, siteRelief } from './tyuratamrelief.ts';

/**
 * The steppe round Site 1 at Tyuratam, April 1961, as scenery: the ground the platform stands on,
 * out to the horizon. The site's frame lies on the compass (missions/ussr/vostok/sites/site-1.ts:
 * its +X is due east), so the land's frame is the scene's: +X east, -Z north, metres from the
 * rocket's axis.
 *
 * The pad, the flame pit and the launch system are not here: they are modelled in Blender, in the
 * same frame (sites/site1/). The land has the pit's outline cut out of it, where the pit's own model
 * is the ground, and the tracks that came onto the platform and the roads painted on it. What is documented and
 * what is estimated is in missions/ussr/vostok/sites/site-1.md, "The land". In short: the pit's
 * rim and the tracks are today's map (OpenStreetMap), which the CIA's photographs of 1957 agree
 * with. The ground itself and what grows on it are the steppe's (steppe.ts: the kind of country, its
 * sources and what of it is estimated); this file says where on it the ground lies low, and what the
 * builders made of it: the graded apron, the tracks' beds, the ground worn inside the fence and round
 * the spoil heap, and the ruts beside the ways the traffic came.
 */

/** The flame pit's rim, metres east and north of the rocket's axis: the same outline as sites/site1/platform.py (RIM). Keep the two in step. */
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
 * The tracks that ran onto the platform, metres east and north (OpenStreetMap, simplified to a metre): the centre track
 * from the west, on which the erector brought the rocket (way 37547653, its last 2.6 km), and the four spurs beside it
 * (ways 172441851, 172441854, 172441876, 172441879). HTA/JR-4/58 counts five spurs onto the pad in August 1957. The
 * other lines on today's map round the site are not drawn: when each was laid is not known to us.
 *
 * Near the platform they are not quite the map's. The map has its centre track 3.0 m north of the middle of its outline
 * of the pad, which is this frame's origin; the rocket's axis was on that track, so the track is brought onto the axis
 * over its last 160 m (the erector is drawn off along it), and the three beside it are brought, over their last 60 m,
 * to where the CIA's plan of March 1961 has them on the platform (PIC/JR-2/61 Figure 1: sites/site1/deck.py, which
 * lays the rails there), each within 1.5 m of the map's place measured from its own centre track. Their west ends are
 * moved to stay on the lines they branch from. Keep in step with sites/site1/place.py (CENTRE_TRACK, SPURS).
 */
const RAILS: [number, number][][] = [
  [
    [-1796.8, -193.4],
    [-1766.0, -146.0],
    [-1749.7, -126.8],
    [-1719.8, -96.6],
    [-1692.5, -72.7],
    [-1667.5, -55.5],
    [-1636.4, -37.9],
    [-1585.5, -15.2],
    [-1554.4, -5.3],
    [-1522.2, 3.5],
    [-1492.0, 7.9],
    [-1464.7, 9.8],
    [-1400.7, 10.6],
    [-160.0, 0.0],
    [-25.8, 0.0],
  ],
  [
    [15.0, 13.564],
    [-60.0, 13.564],
    [-212.6, 15.2],
  ],
  [
    [-204.5, -5.9],
    [-60.0, -8.321],
    [-26.8, -8.321],
  ],
  [
    [10.9, -12.375],
    [-60.0, -12.375],
    [-155.4, -10.1],
    [-286.2, 1.1],
  ],
  [
    [-330.6, 1.5],
    [-121.8, 25.7],
    [-39.8, 28.9],
  ],
  // The line the rocket came by: out of the assembly building's north gate (around.ts; site-1.md, "On the horizon") and
  // round to join the centre track 1.32 km west of the pad. Today's map has it as an abandoned line (way 676662205), cut
  // by the building's extension of 1973 to 1974, whose length (76 m) the first stretch here crosses (way 676662204, the
  // track through the building). That it was the way out in 1961 is derived: it is the one line from the gate to the pad.
  [
    [-1912.4, -587.8],
    [-1877.0, -520.3],
    [-1754.5, -284.4],
    [-1673.8, -150.8],
    [-1620.6, -95.7],
    [-1566.5, -56.2],
    [-1495.9, -21.4],
    [-1462.0, -9.8],
    [-1423.5, -1.9],
    [-1384.2, 2.5],
    [-1319.1, 9.5],
  ],
];
/** Each a segment (x0, z0, x1, z1) in the land's frame (+Z is south). */
const SEGMENTS: [number, number, number, number][] = RAILS.flatMap((line) =>
  line.slice(1).map((b, i): [number, number, number, number] => [line[i]![0], -line[i]![1], b[0], -b[1]]),
);

/**
 * The roads, metres east and north: painted on the land as the tracks are, since they lay flush with it. Their lines are
 * today's (OpenStreetMap, simplified to two metres), each one a road on the CIA's line drawing of the area as it was in
 * 1959 (PIC/JR-2/60 Figure 5): the road in from the south-west (way 54570611), the road round the pit and back past the
 * command bunker (way 172571827), the road from the storage bunker south to the propellant shed (way 172441909, as far
 * as the northern spur: the drawing shows no crossing of the tracks), and the short drives off them to the storage
 * bunker's three bays, the check-out shop's gate and the gas receivers by the platform, which are ours. That they were
 * concrete, and six metres wide, is estimated. Keep in step with sites/site1/place.py (ROADS), which keeps posts off them.
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

/** Half the platform and the abutment behind it, metres (sites/site1/site.py: 135 ft square; platform.py: 25 ft). */
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
/** How far the ground is drawn: past the horizon from any height a person stands at (4.7 km at 1.7 m). */
const FAR = 8000;

const glsl = (v: number) => v.toFixed(3);
const colour = (c: THREE.Color) => `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`;

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
  { line: RAILS[0]!.slice(0, -1), half: 35, worn: 0.5 },
  // along the embankment's brow north of the tracks, 3 m in from it (tyuratamrelief.ts BROW): the way along the top of the fall
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
 * steppe north of them some 8 m down and the ground east of the pit some 5 m (tyuratamrelief.ts, which the place's
 * models are built on too: sites/site1/relief.py). Over that, beyond 400 m, a swell of half a metre over hundreds
 * of metres (estimated).
 */
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
function relief(x: number, z: number): number {
  const r = Math.hypot(x, z);
  return siteRelief(x, -z) + 0.6 * (fbm2(x * 0.0025, z * 0.0025, 61, 3) - 0.45) * smooth(400, 900, r);
}
const RELIEF = /* glsl */ `
  ${SITE_RELIEF_GLSL}
  float relief(vec2 p) {
    return siteRelief(vec2(p.x, -p.y)) + 0.6 * (fbm2(p * 0.0025, 61, 3) - 0.45) * smoothstep(400.0, 900.0, length(p));
  }`;

/**
 * The mapped ground (missions/ussr/vostok/sites/tyuratam-ground.ts) as a table the cover's bake reads (`mappedKinds`),
 * KINDS_WIDE texels a row: from row 0 each thing's box (west, south, east, north, m); then (its first edge, how many, its
 * kind, half its breadth); then a grid of KINDS_GRID cells a side over the land, each (its first entry, how many) in the
 * list that follows of the things that come within reach of it; then every edge (x0, y0, x1, y1), metres east and north.
 * The grid is so that a texel asks only after the few things near it, not all of them.
 */
/** How far out from a mapped thing its margin reaches, metres (a pan's ring of biyurgun: steppe.ts `steppeMapped`). */
const KINDS_REACH = 40;
const KINDS_WIDE = 1024;
const KINDS_GRID = 32;
const KINDS = (() => {
  const code = { takyr: 0, salt: 1, sand: 2, channel: 3 } as const;
  const things = TYURATAM_GROUND;
  const edges: number[][] = [];
  const heads: number[][] = [];
  const boxes: number[][] = [];
  for (const t of things) {
    const ring = t.ring;
    const closed = t.kind !== 'channel';
    const first = edges.length;
    for (let i = 0; i + (closed ? 0 : 1) < ring.length; i++) {
      const a = ring[i]!,
        b = ring[(i + 1) % ring.length]!;
      edges.push([a[0], a[1], b[0], b[1]]);
    }
    const xs = ring.map((p) => p[0]),
      ys = ring.map((p) => p[1]);
    boxes.push([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]);
    heads.push([first, edges.length - first, code[t.kind], (t.width ?? 0) / 2]);
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
  // old channel's bed p is, metres (-1e4 where none is near).
  uniform sampler2D uKinds;
  vec4 kindsAt(int row, int i) {
    return texelFetch(uKinds, ivec2(i % ${KINDS_WIDE}, row + i / ${KINDS_WIDE}), 0);
  }
  void mappedKinds(vec2 p, out vec4 inside) {
    inside = vec4(-1e4);
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
      float d = kind == 3 ? info.w - best : (odd ? best : -best);
      if (kind == 0) inside.x = max(inside.x, d);
      else if (kind == 1) inside.y = max(inside.y, d);
      else if (kind == 2) inside.z = max(inside.z, d);
      else inside.w = max(inside.w, d);
    }
  }
  void cover(vec2 p, out float shrub, out float herb, out float takyr, out float salt, out float sand, out float zone) {
    vec4 inside;
    mappedKinds(p, inside);
    steppeMapped(p, inside.x, inside.y, inside.z, shrub, herb, takyr, salt, sand, zone);
    // an old channel's bed: the thaw's water lies longest there, so it is greener, ringed with the hollows' shrubs
    float bed = smoothstep(-4.0, 4.0, inside.w + 6.0 * (noise2(p * 0.03, 68) - 0.5));
    herb = mix(herb, min(1.0, herb + 0.3), bed * (1.0 - takyr));
    zone = mix(zone, 0.8, bed * (1.0 - takyr) * (1.0 - sand));
  }
  vec4 coverA(vec2 p) {
    float shrub, herb, takyr, salt, sand, zone;
    cover(p, shrub, herb, takyr, salt, sand, zone);
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
    float shrub, herb, takyr, salt, sand, zone;
    cover(p, shrub, herb, takyr, salt, sand, zone);
    float made = madeGround(p);
    float worked = max(1.0 - smoothstep(0.0, 25.0, platform(p) - ${glsl(APRON)} + 30.0 * (noise2(p * 0.02, 34) - 0.5)), 1.0 - smoothstep(2.0, 6.0, rail(p)));
    worked = max(worked, 1.0 - smoothstep(${glsl(ROAD_HALF)}, ${glsl(ROAD_HALF + 3)}, road(p)));
    worked = max(worked, wornGround(p));
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
 * pit is. The rails are paint, not rails, except where they come up to the platform (the place's model: deck.py).
 */
const PAINT = /* glsl */ `
  ${SCARP_FRAME_GLSL}
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
    fall(p, g);
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
    // band of concrete along each track with the rails flush in it, a flangeway inside each rail; the steppe's dust
    // drifted over the outer slabs, which give way to bare trodden earth.
    float d = rail(p);
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
      slab = mix(slab, ${colour(STEPPE.dust)}, 0.25 * (1.0 - smoothstep(0.0, 0.2, e)) * seen(0.2));
      // along each track: the pale band with the rails in it
      float band = 1.0 - smoothstep(1.15, 1.25, d);
      slab = mix(slab, vec3(0.6, 0.585, 0.55) * (0.95 + 0.06 * noise(vec3(p * 0.7, 93.0))), band);
      float joint = (1.0 - smoothstep(0.015, 0.035, e)) * (1.0 - band);
      joint = max(joint, (1.0 - smoothstep(0.015, 0.035, abs(d - 1.2))) * step(d, 1.5));
      slab = mix(slab, vec3(0.63, 0.59, 0.51), joint * seen(0.06));
      float steel = 1.0 - smoothstep(0.03, 0.04, abs(d - 0.79));
      float flange = (1.0 - smoothstep(0.02, 0.03, abs(d - 0.72))) * band;
      slab = mix(slab, vec3(0.1, 0.09, 0.08), flange * seen(0.05));
      slab = mix(slab, vec3(0.45, 0.43, 0.41), steel * band * seen(0.07));
      if (uCel > 0.5) {
        // drawn: two flat tones of slab, the band paler, the joints and the rails inked
        slab = mix(vec3(0.6, 0.585, 0.55) * (tone > 0.62 ? 0.92 : 1.0), vec3(0.66, 0.645, 0.6), step(0.5, band));
        slab = mix(slab, slab * 0.68, step(0.5, max(joint, steel * band)) * seen(0.06));
      }
      g.albedo = mix(g.albedo, slab, slabbed);
      g.rough = mix(g.rough, mix(0.9, 0.45, steel * band), slabbed);
      g.bump = mix(g.bump, (-0.008 * joint - 0.03 * flange) * seen(0.05), slabbed);
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
        float along = t * length(ab);
        float tie = (1.0 - smoothstep(0.11, 0.14, abs(fract(along / 0.55) - 0.5) * 0.55)) * step(d, 1.35);
        g.albedo = mix(g.albedo, vec3(0.13, 0.1, 0.08), tie * seen(0.25));
        float steel = 1.0 - smoothstep(0.03, 0.05, abs(d - 0.79));
        k = max(k, steel);
      }
      g.albedo = mix(g.albedo, vec3(0.42, 0.4, 0.38), k * seen(0.07));
      g.rough = mix(g.rough, 0.45, k * seen(0.07));
    }
  }`;

/** The ground, as land.ts takes it. */
function landSpec(): LandSpec {
  return {
    near: 1024,
    texels: 1024,
    far: FAR,
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
    },
    palette: STEPPE_PALETTE,
    ground: STEPPE_GROUND,
    cel: STEPPE_CEL_GROUND,
    // the scarp, the ramp and the plots are graded earth: smooth, not faceted
    smooth: true,
  };
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

/** Everything round the pad, under a day's sky (day.ts: the flight's `weather`). `groundY` is the terrain's height; the platform's deck is 0. */
export function buildTyuratam(renderer: THREE.WebGLRenderer, groundY: number, day: Day, around?: SiteAround) {
  const air: Air = { scale: day.haze, base: groundY, ...(day.cumulus ? { clouds: day.cumulus } : {}), day };
  installAir(air);
  const land = new Land(renderer, landSpec(), groundY, 0);
  const flora = new Flora(steppeFlora(day), land);
  flora.group.position.y = groundY;
  // what stands round the site (the assembly building of Site 2): each on the highest of the land drawn under it, over
  // the site's relief at its middle, which its model stands on (site1/relief.py); its walls go down 0.48 m into the land
  const far = around
    ? buildAround(around, (x, z, half) => {
        let top = Number.NEGATIVE_INFINITY;
        for (let i = -1; i <= 1; i++)
          for (let j = -1; j <= 1; j++) top = Math.max(top, land.heightAt(x + 0.7 * half * i, z + 0.7 * half * j));
        return top - siteRelief(x, -z);
      })
    : null;
  const eye = new THREE.Vector3();
  const local = (at: THREE.Vector3) => {
    eye.copy(at);
    eye.y -= groundY;
    return eye;
  };
  return {
    floor: land.mesh,
    scenery: [flora.group, ...(far ? [far.group] : [])] as THREE.Object3D[],
    // (the building at its levels of detail, each chosen by its size on screen: around.ts)
    levels: far ? [far] : [],
    reach: 1500,
    horizon: FAR,
    /** The ground's own tone, for the land beyond it on the globe (globe.ts): the steppe's, not the Cape's green; and in the cel look. */
    tone: STEPPE_TONE.clone(),
    drawn: STEPPE_CEL.clone(),
    tick: (dt: number) => {
      driftClouds(dt);
      land.tick(dt);
      flora.tick(dt);
    },
    simplify: (on: boolean) => {
      land.simplify(on);
      flora.simplify(on);
    },
    attend: (at: THREE.Vector3) => {
      local(at);
      land.attend(eye);
      return flora.attend(eye);
    },
    arrived: () => far?.arrived() ?? false, // (the building round the site: something that casts a shadow where there was nothing)
    view: (camera: THREE.Camera) => land.view(camera),
    plantsClear: (at: THREE.Vector3, within: number) => flora.clear(local(at), within),
    plantsOut: (at: THREE.Vector3, margin: number) => {
      const still = flora.out(local(at), margin);
      at.x = eye.x;
      at.z = eye.z;
      return still;
    },
    groundAt: (x: number, z: number) => (inPit(x, z) > OVERLAP ? UNDER_PIT : groundY + land.heightAt(x, z)),
  };
}

import * as THREE from 'three';
import { LC5 } from '../../missions/usa/mercury/sites/lc-5.ts';
import { buildCape1961, CLEARINGS, COAST, RIVER } from './cape1961';
import { type FloraSpec, Flora } from './flora';
import { Land, type LandSpec } from './land';

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
 * Cape's vegetation; the clearing round Complex 5/6, the firebreaks, the colours and every
 * density are read off photographs of 1961 to 1965 or chosen by eye.
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
  [...site(166, 0), ...site(340, 0), 4.0, 1], // the stub road from the foot of the apron's ramp
  [...site(340, 586), ...site(340, -900), 3.6, 1], // the road behind the blockhouse, parallel to the track (F16_016)
  [...site(340, -215), ...site(293, -215), 3.2, 1], // the drive in to the blockhouse,
  [...site(293, -215), ...site(293, -349), 3.4, 1], // past its back door,
  [...site(293, -349), ...site(340, -349), 3.2, 1], // and out again
  [...site(276, -147), ...site(340, -147), 4.4, 1], // the hut's parking
];

/** GLSL both the cover's bake and the terrain's shader use: the shore, the ways, the clearings. */
const SHARED = /* glsl */ `
  uniform vec2 uCoast[${COAST.length}];   // the Atlantic shore: (metres north, metres east) of pad 5, northward
  uniform vec2 uRiver[${RIVER.length}];   // the Banana River's east shore, the same way
  uniform vec4 uTracks[${TRACKS.length}];
  uniform vec2 uTrackKind[${TRACKS.length}];   // half-width, kind
  uniform vec3 uClear[${NEAR.length}];    // the neighbouring pads: (x, z, radius of the pad itself)
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
  float segment(vec2 p, vec4 s) {
    vec2 a = s.xy, b = s.zw, ab = b - a;
    return length(p - a - ab * clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0));
  }
  // a point on the compass, in the pad model's frame (metres)
  vec2 toPad(vec2 p) { return vec2(p.x * ${COS.toFixed(6)} + p.y * ${SIN.toFixed(6)}, -p.x * ${SIN.toFixed(6)} + p.y * ${COS.toFixed(6)}); }
  // metres inland of the surf line: the Cape's own shore (cape1961.ts), wandering a little about it
  float inland(vec2 p) { return coastAt(-p.y) - p.x + 26.0 * (fbm2(vec2(p.y * 0.006, 4.0), 5, 3) - 0.45); }
  // metres east of the Banana River's shore
  float riverward(vec2 p) { return p.x - riverAt(-p.y) - 30.0 * (fbm2(p * 0.0035, 6, 3) - 0.45); }
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
    float alongU = hash2(n, 51) > 0.3 ? f.y : 1e9;   // a line across the rails' direction, cut or not
    float alongV = hash2(n, 52) > 0.3 ? f.x : 1e9;
    return min(alongU, alongV) - 3.0;
  }
  // the clearing round Complex 5/6: a rectangle along the rails, graded and grassed (KSC aerial of 1965, ccspacemuseum.org)
  float lc56(vec2 p) {
    vec2 pad = toPad(p);
    vec2 q = abs(vec2(pad.y - 125.0, pad.x + 10.0)) - vec2(295.0, 160.0) + 25.0;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 25.0;
  }
  // ground graded bare round the two pads and the blockhouse: the aprons
  float apron(vec2 p) {
    vec2 pad = toPad(p);
    float d = max(abs(pad.x), abs(pad.y)) - 58.0;
    d = min(d, max(abs(pad.x), abs(pad.y - 158.5)) - 52.0);
    d = min(d, length(pad - vec2(66.0, 84.0)) - 48.0);
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
    float herb = 0.12 + 0.55 * (1.0 - woody);
    // from the sea: beach, then the dune's grasses with patches of sea grape, then the strand thickening inland
    float beach = 1.0 - smoothstep(38.0, 48.0, shore);
    float dune = smoothstep(38.0, 48.0, shore) * (1.0 - smoothstep(70.0, 95.0, shore));
    woody *= smoothstep(55.0, 110.0, shore);
    woody = max(woody, dune * 0.5 * smoothstep(0.55, 0.7, noise2(p * 0.05, 37)));
    herb = mix(herb, 0.55 + 0.25 * noise2(p * 0.1, 38), dune);
    herb *= 1.0 - beach;
    // toward the river the hammock closes overhead; at its edge, marsh grass
    float marsh = 1.0 - smoothstep(20.0, 90.0, river);
    woody = mix(woody, 0.15, marsh);
    herb = mix(herb, 0.8, marsh);
    // the clearings: Complex 5/6's rectangle and an oval of grass round each neighbouring pad
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
    // wet: the marsh at the river's edge
    float wet = 1.0 - smoothstep(10.0, 60.0, riverward(p));
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
    // the Atlantic: beach, wet sand at the swash, surf lines rolling in, water deepening offshore
    float shore = inland(p);
    float lap = 3.5 * sin(uTime * 0.5 + p.y * 0.035) + 2.0 * sin(uTime * 0.31 + p.y * 0.011);
    float beach = 1.0 - smoothstep(36.0, 48.0, shore);
    g.albedo = mix(g.albedo, mix(g.albedo, vec3(0.62, 0.57, 0.46), 0.6), beach);
    float wetSand = (1.0 - smoothstep(0.0, 10.0, shore + lap * 0.5)) * beach;
    g.albedo *= 1.0 - 0.35 * wetSand;
    g.rough = mix(g.rough, 0.35, wetSand);
    float sea = smoothstep(-2.0, 2.0, -shore - lap);
    float depth = clamp(-shore / 900.0, 0.0, 1.0);
    depth = mix(depth, pow(floor(pow(depth, 0.45) * 3.0 + 0.5) / 3.0, 2.22), uCel);
    vec3 water = mix(vec3(0.07, 0.30, 0.30), vec3(0.012, 0.075, 0.16), pow(depth, 0.45));
    float roll = fract((-shore - lap) * 0.035 - uTime * 0.06);
    float foam = smoothstep(0.86, 1.0, roll) * (1.0 - smoothstep(0.0, 110.0, -shore)) * smoothstep(0.35, 0.6, noise(vec3(p * 0.16, uTime * 0.25)));
    foam = max(foam, (1.0 - smoothstep(0.0, 5.0, abs(shore + lap))) * 0.85);
    foam = mix(foam, step(0.5, foam), uCel);
    sea = mix(sea, step(0.5, sea), uCel);
    g.albedo = mix(g.albedo, mix(water, vec3(0.92), foam), sea);
    g.rough = mix(g.rough, 0.16, sea);
    g.bump *= 1.0 - sea;
    g.water = max(g.water, sea);
    // the Banana River: flat water, no surf
    float river = smoothstep(-3.0, 3.0, -riverward(p));
    river = mix(river, step(0.5, river), uCel);
    g.albedo = mix(g.albedo, vec3(0.06, 0.24, 0.26), river);
    g.rough = mix(g.rough, 0.16, river);
    g.water = max(g.water, river);
  }`;

/** A colour as an sRGB hex (three converts it to its linear working space). */
const srgb = (hex: number) => new THREE.Color(hex);

/** The Cape's ground, as land.ts takes it. */
function landSpec(): LandSpec {
  return {
    near: 2048,
    texels: 2048,
    far: FAR,
    shared: SHARED,
    cover: COVER,
    relief: () => 0,
    reliefGlsl: 'float relief(vec2 p) { return 0.0; }',
    canopy: CANOPY,
    crown: 2.6,
    paint: PAINT,
    uniforms: {
      uCoast: { value: COAST.map(([n, x]) => new THREE.Vector2(n, x)) },
      uRiver: { value: RIVER.map(([n, x]) => new THREE.Vector2(n, x)) },
      uTracks: { value: TRACKS.map((t) => new THREE.Vector4(t[0], t[1], t[2], t[3])) },
      uTrackKind: { value: TRACKS.map((t) => new THREE.Vector2(t[4], t[5])) },
      uClear: { value: NEAR.map(([x, z, r]) => new THREE.Vector3(x, z, r)) },
      uKept: { value: KEPT.map(([x, y, r]) => new THREE.Vector3(...site(x, y), r * FT)) },
      uStrips: { value: STRIPS.map(([x0, y0, x1, y1]) => new THREE.Vector4(...site(x0, y0), ...site(x1, y1))) },
      uStripWidth: { value: STRIPS.map((s) => s[4] * FT) },
    },
    // Linear albedos, set against period colour photographs of the Cape (docs/sources.md, The Cape): estimated.
    palette: {
      sand: srgb(0xa89f8f),
      sandDark: srgb(0x857e70),
      herbDry: srgb(0x7a7552),
      herbGreen: srgb(0x5a6040),
      litter: srgb(0x3a342b),
      leaf: srgb(0x30362a),
      leafLit: srgb(0x535a3e),
      leafOther: srgb(0x5a603c),
      grit: srgb(0xd8d0c0),
      gritAmount: 0.16,
    },
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
    spacing: { woody: 1.7, herb: 0.38, tree: 10 },
    // salt-pruned near the sea: the strand's canopy "slants up away from the coast" (FNAI)
    stature: (zone) => Math.min(1, 0.45 + (zone / 0.42) * 0.55),
    wind: { toward: THREE.MathUtils.degToRad(270), strength: 1 }, // the morning's breeze, from 090 at 10 knots (NOAA ISD, Cape station, 09:00 EST)
    species: [
      {
        name: 'saw-palmetto',
        form: { kind: 'fan', fans: [12, 20], stalk: [0.4, 0.8], blade: [0.3, 0.45], segments: 22, dead: 0.18 },
        layer: 'woody',
        abundance: [
          [0.08, 0],
          [0.14, 0.4],
          [0.3, 1],
          [0.6, 0.65],
          [1, 0.3],
        ],
        height: [1.0, 1.8],
        colours: [c(0x46522e), c(0x5a6234)],
        near: 34,
        reach: 330,
        sway: 0.45,
        rough: 0.6,
      },
      {
        name: 'scrub-oak',
        form: { kind: 'shrub', masses: [7, 11], spread: 1.5, leaf: [9, 0.11, 0.06, 0.8] },
        layer: 'woody',
        abundance: [
          [0.15, 0],
          [0.3, 0.3],
          [0.5, 1],
          [0.85, 0.8],
          [1, 0.5],
        ],
        height: [1.1, 2.0],
        colours: [c(0x343c26), c(0x464e30)],
        near: 30,
        reach: 330,
        sway: 0.2,
        rough: 0.88,
      },
      {
        name: 'wax-myrtle',
        form: { kind: 'shrub', masses: [5, 8], spread: 1.0, leaf: [7, 0.26, 0.06, 0.55] },
        layer: 'woody',
        abundance: [
          [0.14, 0],
          [0.25, 0.35],
          [0.5, 0.15],
          [0.9, 0.45],
        ],
        height: [1.6, 3.0],
        colours: [c(0x46522a), c(0x5a6233)],
        near: 30,
        reach: 330,
        sway: 0.35,
        rough: 0.85,
      },
      {
        name: 'sea-grape',
        form: { kind: 'shrub', masses: [4, 7], spread: 1.6, leaf: [3, 0.4, 0.36, 0.95] },
        layer: 'woody',
        abundance: [
          [0.08, 0.6],
          [0.18, 0.9],
          [0.3, 0.35],
          [0.45, 0],
        ],
        height: [1.0, 2.2],
        colours: [c(0x3d5226), c(0x526030)],
        near: 30,
        reach: 330,
        sway: 0.25,
        rough: 0.75,
      },
      {
        name: 'cabbage-palm',
        form: { kind: 'palm', trunk: [0.016, 0.022], fronds: 18, blade: 0.17, dead: 5 },
        layer: 'tree',
        abundance: [
          [0.15, 0.01],
          [0.6, 0.012],
          [0.85, 0.05],
          [1, 0.15],
        ],
        height: [5, 11],
        colours: [c(0x3f5228), c(0x52602f)],
        near: 90,
        reach: 2200,
        sway: 0.3,
        rough: 0.5,
      },
      {
        name: 'grass',
        form: { kind: 'tuft', blades: [16, 26], heads: 0, lean: 1.1 },
        layer: 'herb',
        abundance: [
          [0.1, 0],
          [0.2, 1],
          [1, 1],
        ],
        height: [0.16, 0.34],
        colours: [c(0x8a8058), c(0x626a3c)],
        near: 26,
        reach: 26,
        sway: 0.8,
        rough: 0.85,
      },
      {
        name: 'bluestem',
        form: { kind: 'tuft', blades: [8, 14], heads: 3, lean: 0.7 },
        layer: 'herb',
        abundance: [
          [0.12, 0],
          [0.2, 0.4],
          [1, 0.4],
        ],
        height: [0.3, 0.55],
        colours: [c(0x9a8a5e), c(0x7a7444)],
        near: 26,
        reach: 26,
        sway: 0.9,
        rough: 0.85,
      },
      {
        name: 'sea-oats',
        form: { kind: 'tuft', blades: [8, 12], heads: 2, lean: 0.6 },
        layer: 'herb',
        abundance: [
          [0.07, 0],
          [0.09, 1],
          [0.15, 1],
          [0.2, 0],
        ],
        height: [0.7, 1.2],
        colours: [c(0x8e8a5a), c(0x6f7444)],
        near: 26,
        reach: 26,
        sway: 1,
        rough: 0.8,
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
  /** The ground's height at a point in the world (the pad's frame): flat at `groundY` wherever anything is built. */
  groundAt: (x: number, z: number) => number;
} {
  const land = new Land(renderer, landSpec(), groundY, COMPASS);
  const flora = new Flora(floraSpec(), land);
  flora.group.position.y = groundY;
  const built = buildCape1961(groundY); // the other complexes and the lighthouse, where they stood
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
    groundAt: (x, z) => {
      // the world point on the compass: the inverse of the site's turn
      const cx = x * COS - z * SIN,
        cz = x * SIN + z * COS;
      return groundY + land.heightAt(cx, cz);
    },
  };
}

import * as THREE from 'three';
import { type Air, installAir } from './air';
import { fbm2 } from './field';
import { Flora, type FloraSpec } from './flora';
import { Land, type LandSpec, type Palette } from './land';

/**
 * The steppe round Site 1 at Tyuratam, April 1961, as scenery: the ground the platform stands on,
 * out to the horizon. The site's frame lies on the compass (missions/ussr/vostok/sites/site-1.ts:
 * its +X is due east), so the land's frame is the scene's: +X east, -Z north, metres from the
 * rocket's axis.
 *
 * The pad, the flame pit and the launch system are not here: they are modelled in Blender, in the
 * same frame (sites/site1/). The land has the pit's outline cut out of it, where the pit's own model
 * is the ground, and the tracks that came onto the platform painted on it. What is documented and
 * what is estimated is in missions/ussr/vostok/sites/site-1.md, "The land". In short: the pit's
 * rim and the tracks are today's map (OpenStreetMap), which the CIA's photographs of 1957 agree
 * with; the ground's colours, what grows on it and how thick are estimated, from photographs of
 * the place and of the morning.
 */

/** The flame pit's rim, metres east and north of the rocket's axis: the same outline as sites/site1/platform.py (RIM). Keep the two in step. */
const RIM: [number, number][] = [
  [-18, 59],
  [-15, 65.5],
  [-6, 76],
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
    [-25.8, 3.0],
  ],
  [
    [-33.9, 17.6],
    [-212.6, 16.9],
  ],
  [
    [-204.5, -5.5],
    [-26.5, -6.4],
  ],
  [
    [13.6, -10.8],
    [-155.4, -10.1],
    [-286.2, 3.7],
  ],
  [
    [-330.6, 4.7],
    [-121.8, 25.7],
    [-39.8, 28.9],
  ],
];
/** Each a segment (x0, z0, x1, z1) in the land's frame (+Z is south). */
const SEGMENTS: [number, number, number, number][] = RAILS.flatMap((line) =>
  line.slice(1).map((b, i): [number, number, number, number] => [line[i]![0], -line[i]![1], b[0], -b[1]]),
);

/** Half the platform and the abutment behind it, metres (sites/site1/site.py: 135 ft square; platform.py: 25 ft). */
const HALF = (135 * 0.3048) / 2;
const ABUTMENT = 25 * 0.3048;
/** The ground cleared and graded round the platform's landward side, where the tracks come on, metres from its edge (estimated). */
const APRON = 70;
/** How far the ground is drawn: past the horizon from any height a person stands at (4.7 km at 1.7 m). */
const FAR = 8000;

/**
 * The haze: the air of the Syr Darya's steppe in April. No record of the visibility that morning has been read; the
 * film shows the horizon sharp and the sky clear. 60 km taken, thinning over 1.5 km of height. Estimated.
 */
const VISIBILITY = 60_000;
const HAZE_SCALE = 1500;

/** A colour as an sRGB hex (three converts it to its linear working space). */
const srgb = (hex: number) => new THREE.Color(hex);
/**
 * The ground's colours, estimated: the pale grey-buff of the clay and sand of the Syr Darya's terraces, the silvery
 * grey-green of wormwood, and the short green the steppe has for a few weeks after the snow, read off photographs of
 * the place in spring and of the morning (site-1.md, The land), then cleaned as the look asks.
 */
const PALETTE: Palette = {
  sand: srgb(0xc6bdaa),
  sandDark: srgb(0xa89f8b),
  herbDry: srgb(0x9d9b86),
  herbGreen: srgb(0x8b9569),
  litter: srgb(0x6e6450),
  leaf: srgb(0x6f7660),
  leafLit: srgb(0x9da48a),
  leafOther: srgb(0x7c8462),
};

const glsl = (v: number) => v.toFixed(3);

/** GLSL both the cover's bake and the terrain's shader use: the pit's rim, the tracks, the made ground. */
const SHARED = /* glsl */ `
  uniform vec2 uRim[${RIM.length}];
  uniform vec4 uRails[${SEGMENTS.length}];
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
  // the platform and its abutment: metres outside them (negative on them)
  float platform(vec2 p) {
    vec2 c = vec2(p.x + ${glsl(ABUTMENT / 2)}, p.y);
    vec2 q = abs(c) - vec2(${glsl(HALF + ABUTMENT / 2)}, ${glsl(HALF)});
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  }`;

/**
 * The lie of the land, metres above the ground at the pad, in JavaScript (the walker, the plants) and GLSL (the mesh):
 * keep the two in step. The steppe here is a river terrace, flat to the eye: level within 400 m of the pad, where
 * everything was graded, and beyond it a swell of half a metre over hundreds of metres (estimated: SRTM's 30 m grid
 * reads within a few metres everywhere round the site, below what it can resolve).
 */
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
function relief(x: number, z: number): number {
  const r = Math.hypot(x, z);
  return 0.6 * (fbm2(x * 0.0025, z * 0.0025, 61, 3) - 0.45) * smooth(400, 900, r);
}
const RELIEF = /* glsl */ `
  float relief(vec2 p) {
    return 0.6 * (fbm2(p * 0.0025, 61, 3) - 0.45) * smoothstep(400.0, 900.0, length(p));
  }`;

/**
 * What covers the ground: open steppe of wormwood and saltwort on clay and sand, low and sparse, the bare ground showing
 * between the clumps, and green for a few weeks in spring. Round the pad, graded ground: the apron where the tracks came
 * on, the tracks' beds, the ground along the pit's rim. All estimated.
 */
const COVER = /* glsl */ `
  vec4 coverA(vec2 p) {
    float clumps = fbm2(p * 0.05, 31, 3);
    // (sparse: the woody cover never closes over the ground, and the bare clay is most of what is seen)
    float woody = 0.14 + 0.18 * smoothstep(0.4, 0.7, clumps) - 0.1 * smoothstep(0.5, 0.75, fbm2(p * 0.006, 32, 3));
    float herb = 0.18 + 0.32 * fbm2(p * 0.02, 33, 3);
    // made ground: the apron round the platform's landward side, the tracks' beds and a margin round the pit's rim
    float made = 1.0 - smoothstep(0.0, 25.0, platform(p) - ${glsl(APRON)} + 30.0 * (noise2(p * 0.02, 34) - 0.5));
    made = max(made, 1.0 - smoothstep(3.0, 9.0, rail(p)));
    made = max(made, 1.0 - smoothstep(-2.0, 12.0, -inPit(p) - 6.0 * noise2(p * 0.05, 35)));
    woody *= 1.0 - made;
    herb *= 1.0 - 0.8 * made;
    // nothing grows on the platform or down in the pit
    float none = max(1.0 - smoothstep(-1.0, 1.0, platform(p)), smoothstep(-1.0, 1.0, inPit(p)));
    woody *= 1.0 - none;
    herb *= 1.0 - none;
    return vec4(woody, herb, clamp(1.0 - woody - herb, 0.0, 1.0), 0.5);
  }
  vec4 coverB(vec2 p) {
    float worked = 1.0 - smoothstep(0.0, 25.0, platform(p) - ${glsl(APRON)} + 30.0 * (noise2(p * 0.02, 34) - 0.5));
    worked = max(worked, 1.0 - smoothstep(2.0, 6.0, rail(p)));
    return vec4(worked, 0.0, 0.0, 0.0);
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
 * The site's own marks: the tracks' beds (grey stone ballast, sleepers, two rails at the Soviet gauge of 1,520 mm), and
 * the hole where the flame pit is. The rails are paint, not rails: a simplification (site-1.md).
 */
const PAINT = /* glsl */ `
  void paint(vec2 p, vec4 A, vec4 B, inout Ground g) {
    // (a little inside the rim, over the pit's own slope: OVERLAP)
    if (inPit(p) > ${glsl(OVERLAP)}) discard;
    float d = rail(p);
    float bed = 1.0 - smoothstep(1.6, 2.1, d + 0.3 * (noise(vec3(p * 0.8, 20.0)) - 0.5));
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
    },
    palette: PALETTE,
  };
}

const c = srgb;

/** What grows: wormwood and saltwort in low clumps, a hand to a knee high, wide apart. The species and their look are estimated. */
function floraSpec(): FloraSpec {
  return {
    spacing: { woody: 1.4, herb: 1.8, tree: 40 },
    stature: () => 1,
    // the wind on the morning is not recorded: a light breeze from the north-east, the steppe's usual quarter in spring (estimated)
    wind: { toward: THREE.MathUtils.degToRad(225), strength: 0.5 },
    species: [
      {
        name: 'wormwood',
        form: { kind: 'shrub', masses: [3, 5], spread: 0.55 },
        layer: 'woody',
        abundance: [
          [0, 1],
          [1, 1],
        ],
        height: [0.25, 0.5],
        colours: [c(0x7d846a), c(0xa3a88a)],
        near: 25,
        reach: 160,
        sway: 0.3,
        rough: 0.9,
      },
      {
        name: 'saltwort',
        form: { kind: 'shrub', masses: [2, 3], spread: 0.4 },
        layer: 'herb',
        abundance: [
          [0, 0.35],
          [1, 0.35],
        ],
        height: [0.15, 0.3],
        colours: [c(0x7a8a50), c(0x98a262)],
        near: 20,
        reach: 90,
        sway: 0.4,
        rough: 0.85,
      },
    ],
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

/** Everything round the pad. `groundY` is the terrain's height; the platform's deck is 0. */
export function buildTyuratam(renderer: THREE.WebGLRenderer, groundY: number) {
  // a clear morning: no cumulus (the film shows none; no observation has been read). Estimated
  const air: Air = { scale: HAZE_SCALE, base: groundY };
  installAir(air);
  const land = new Land(renderer, landSpec(), groundY, 0);
  const flora = new Flora(floraSpec(), land);
  flora.group.position.y = groundY;
  const eye = new THREE.Vector3();
  const local = (at: THREE.Vector3) => {
    eye.copy(at);
    eye.y -= groundY;
    return eye;
  };
  return {
    floor: land.mesh,
    scenery: [flora.group] as THREE.Object3D[],
    visibility: VISIBILITY,
    reach: 1500,
    horizon: FAR,
    /** The ground's own tone, for the land beyond it on the globe (globe.ts): the steppe's, not the Cape's green. */
    tone: PALETTE.herbDry.clone().lerp(PALETTE.sand, 0.5),
    tick: (dt: number) => {
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
    arrived: () => false,
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

import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LC5 } from '../../missions/usa/mercury/sites/lc-5.ts';
import { grain } from './surface';

/**
 * Cape Canaveral beyond Complex 5/6 on 5 May 1961: the other launch complexes that stood that
 * day, the lighthouse, and the shore, each at its real place.
 *
 * Places are documented: every position is a published coordinate (OpenStreetMap's outline of
 * the pad or its ruin, checked against Wikipedia's), turned into metres east and north of pad 5.
 * What stood there is documented in kind (the Cape Canaveral Space Force Museum's page for each
 * complex, Moonport for Complex 34, the GCAT launch log for what was in use), and in a few sizes,
 * which are given below where they are.
 *
 * The complexes a walker can reach (26, 30, 25, 29 and 17, all within 1.1 km) are not drawn here: each is
 * modelled in Blender from its own record, as the pad is (missions/usa/mercury/sites/cape/, one module a complex;
 * sites/cape.md says what is documented and what is not), built into one file and placed here (`NEIGHBOURS`).
 * The rest, 1.2 to 9 km off, are shapes made here, each a stand-in for its type, drawn so that an Atlas pad, a
 * Titan pad and a Minuteman tower can be told apart on the horizon, and no more. A complex whose structure
 * could not be verified for that day is drawn as its pad alone, or left out and listed in
 * missions/usa/mercury/sites/lc-5.md.
 *
 * Everything is on the compass, metres from pad 5: +X east, -Z north. See docs/sources.md, "The Cape".
 */

/** Pad 5's launcher: the site's own record (sites/lc-5.ts). */
const PAD5 = { lat: LC5.latitude.value, lon: LC5.longitude.value };
/** Metres to a degree at this latitude (WGS 84 series): northward, eastward. */
const M_LAT = 110_826.5;
const M_LON = 97_960;
/** A latitude and longitude as metres east and south of pad 5: the compass frame's x and z. */
export const fromPad5 = (lat: number, lon: number): [number, number] => [(lon - PAD5.lon) * M_LON, -(lat - PAD5.lat) * M_LAT];

/**
 * The Atlantic shore, south to north, as [latitude, longitude]: today's surf line from
 * OpenStreetMap, thinned. Not 1961's exactly: the Cape's point has moved and the port has grown.
 * South of the port, where the ground drawn round the pad hands over to the globe, it is the
 * globe's own shore (tools/globe-region.mjs, the same coastline) read every 0.01 degrees.
 */
const ATLANTIC: [number, number][] = [
  [28.32, -80.60725],
  [28.33, -80.60663],
  [28.34, -80.60578],
  [28.35, -80.60462],
  [28.36, -80.60309],
  [28.37, -80.60129],
  [28.38, -80.59899],
  [28.39, -80.59624],
  [28.39845, -80.59374],
  [28.40794, -80.5888],
  [28.41119, -80.58372],
  [28.41566, -80.58266],
  [28.41909, -80.58066],
  [28.42716, -80.57341],
  [28.43186, -80.56805],
  [28.43736, -80.55954],
  [28.44643, -80.54111],
  [28.44669, -80.53926],
  [28.44763, -80.53454],
  [28.44923, -80.52819],
  [28.44999, -80.52679],
  [28.45118, -80.52581],
  [28.45229, -80.52545],
  [28.45907, -80.52544],
  [28.46078, -80.52602],
  [28.47547, -80.53401],
  [28.49363, -80.54278],
  [28.50059, -80.54712],
  [28.514, -80.55463],
  [28.5364, -80.56298],
  [28.56548, -80.56832],
];
/**
 * The Banana River's east shore, the same way and rougher. South of 28.42 it is read from
 * OpenStreetMap's Indian River Lagoon (relation 1204544) every 1.2 to 1.8 km: the main channel's
 * edge, past today's port and causeways (not there in 1961, and not drawn). North of 28.52 it is
 * the globe's shore every 0.0025 to 0.01 degrees, as the Atlantic's south of the port.
 */
const BANANA_RIVER: [number, number][] = [
  [28.32573, -80.61846],
  [28.33656, -80.61846],
  [28.34739, -80.61183],
  [28.36363, -80.61489],
  [28.37446, -80.60877],
  [28.38529, -80.60877],
  [28.39612, -80.61948],
  [28.41236, -80.61846],
  [28.4204, -80.60361],
  [28.45573, -80.59621],
  [28.47555, -80.59086],
  [28.50282, -80.58444],
  [28.51653, -80.5848],
  [28.5225, -80.59122],
  [28.525, -80.599],
  [28.5275, -80.60134],
  [28.53, -80.59984],
  [28.5325, -80.60053],
  [28.535, -80.59757],
  [28.5375, -80.59266],
  [28.545, -80.59164],
  [28.555, -80.58974],
];
/**
 * Its west shore, Merritt Island's east: from the same relation, the far edge of the river's
 * water every 300 m of northing (across islands and causeways under 400 m), the median of five,
 * thinned to one in two; north of 28.505 the globe's shore every 0.005 degrees. The river is 5.7 km
 * wide abreast of pad 5 and narrows to 1.7 km 12 km north.
 */
const BANANA_RIVER_WEST: [number, number][] = [
  [28.32573, -80.65874],
  [28.33656, -80.65976],
  [28.34739, -80.66027],
  [28.35822, -80.66078],
  [28.36363, -80.66384],
  [28.37446, -80.66486],
  [28.37987, -80.66741],
  [28.3907, -80.66792],
  [28.40965, -80.66486],
  [28.42048, -80.66013],
  [28.43131, -80.65997],
  [28.43943, -80.65833],
  [28.44484, -80.65667],
  [28.45025, -80.65452],
  [28.45567, -80.65339],
  [28.46108, -80.65092],
  [28.4665, -80.64945],
  [28.47191, -80.64726],
  [28.47732, -80.64608],
  [28.48274, -80.64327],
  [28.48815, -80.64097],
  [28.49356, -80.63818],
  [28.49898, -80.63804],
  [28.50439, -80.63575],
  [28.51, -80.62976],
  [28.515, -80.62641],
  [28.52, -80.62411],
  [28.525, -80.6204],
  [28.53, -80.61782],
  [28.535, -80.61549],
  [28.54, -80.61356],
  [28.545, -80.61259],
  [28.55, -80.61091],
  [28.555, -80.60904],
  [28.56, -80.60739],
];
/**
 * The Indian River's east shore, Merritt Island's west, where it comes within reach: only in the
 * south-west corner of the ground drawn round the pad, from the same relation. North of 28.375
 * it is far to the west (the last two points only carry the line out of the way). Sykes Creek,
 * inside Merritt Island, is left out.
 */
const INDIAN_RIVER: [number, number][] = [
  [28.32573, -80.69247],
  [28.33115, -80.694],
  [28.33656, -80.70013],
  [28.34198, -80.70268],
  [28.34739, -80.7037],
  [28.3528, -80.70523],
  [28.35822, -80.70728],
  [28.36363, -80.70932],
  [28.36905, -80.71136],
  [28.37446, -80.7134],
  [28.37987, -80.74],
  [28.38529, -80.9],
];
/**
 * Newfound Harbor, between Merritt Island and the long peninsula south of it, where it reaches the
 * south-west corner of the ground: its west shore and its east, from the globe's shore every 0.005
 * degrees. Past its head at 28.371 the two lines cross, so the ground north of it is all land.
 */
const NEWFOUND_WEST: [number, number][] = [
  [28.31, -80.67469],
  [28.32, -80.67695],
  [28.33, -80.67988],
  [28.335, -80.68116],
  [28.345, -80.6837],
  [28.355, -80.68218],
  [28.36, -80.68312],
  [28.365, -80.68443],
  [28.37, -80.68042],
  [28.3715, -80.676],
];
const NEWFOUND_EAST: [number, number][] = [
  [28.31, -80.66002],
  [28.32, -80.6627],
  [28.33, -80.66412],
  [28.335, -80.66584],
  [28.345, -80.66774],
  [28.35, -80.66904],
  [28.355, -80.67141],
  [28.36, -80.67013],
  [28.365, -80.67474],
  [28.37, -80.67268],
  [28.3715, -80.678],
];
/** A shore as the terrain's shader wants it: [metres north, metres east] of pad 5, northward. */
const northing = (shore: [number, number][]): [number, number][] =>
  shore.map(([lat, lon]) => {
    const [x, z] = fromPad5(lat, lon);
    return [-z, x];
  });
export const COAST = northing(ATLANTIC);
export const RIVER = northing(BANANA_RIVER);
export const RIVER_WEST = northing(BANANA_RIVER_WEST);
export const INDIAN = northing(INDIAN_RIVER);
export const HARBOR_WEST = northing(NEWFOUND_WEST);
export const HARBOR_EAST = northing(NEWFOUND_EAST);
/** How far east a shore is at a given northing: the same reading of the line as the shader's. */
export function shoreAt(shore: [number, number][], north: number): number {
  let x = shore[0]![1];
  for (let i = 0; i < shore.length - 1; i++) {
    const [n0, x0] = shore[i]!,
      [n1, x1] = shore[i + 1]!;
    if (north >= n0) x = x0 + (x1 - x0) * Math.min(1, (north - n0) / (n1 - n0));
  }
  return x;
}

type Paint = 'red' | 'white' | 'steel' | 'concrete' | 'black' | 'dark';
const COLOURS: Record<Paint, number> = {
  red: 0x7a2018,
  white: 0xdedbd2,
  steel: 0x6c7074,
  concrete: 0x8d8a82,
  black: 0x121212,
  dark: 0x2a2c2e,
};

/** Boxes gathered by colour, to be drawn as one mesh each: twenty complexes are six draw calls, not six hundred. */
class Kit {
  private readonly boxes = new Map<Paint, THREE.BufferGeometry[]>();
  private frame = new THREE.Matrix4();

  /** Everything added from now on is in a frame at (x, z) on the compass, turned `heading` degrees clockwise from north, standing on `y`. */
  at(x: number, y: number, z: number, heading = 0): this {
    this.frame = new THREE.Matrix4().makeRotationY(-THREE.MathUtils.degToRad(heading)).setPosition(x, y, z);
    return this;
  }

  /** A box w by h by d whose base's middle is at (x, y, z) in the frame: x right, y up, z toward the viewer facing north. */
  box(paint: Paint, w: number, h: number, d: number, x = 0, y = 0, z = 0): this {
    return this.add(paint, new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z));
  }

  /** A square member from one point to another. */
  bar(paint: Paint, from: [number, number, number], to: [number, number, number], thick: number): this {
    const a = new THREE.Vector3(...from),
      b = new THREE.Vector3(...to);
    const g = new THREE.BoxGeometry(thick, a.distanceTo(b), thick);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(THREE.Object3D.DEFAULT_UP, b.clone().sub(a).normalize()));
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    return this.add(paint, g);
  }

  /** A round, tapering thing standing at (x, y, z): a tank, a band of the lighthouse. */
  drum(paint: Paint, r0: number, r1: number, h: number, x = 0, y = 0, z = 0, sides = 16): this {
    return this.add(paint, new THREE.CylinderGeometry(r1, r0, h, sides).translate(x, y + h / 2, z));
  }

  /** An open lattice tower: four legs, a ring of members every `bay`, a diagonal on each face. */
  lattice(paint: Paint, w: number, d: number, h: number, x = 0, y = 0, z = 0, bay = 6, leg = 0.5): this {
    const cx = [-w / 2, w / 2, w / 2, -w / 2],
      cz = [-d / 2, -d / 2, d / 2, d / 2];
    for (let i = 0; i < 4; i++) this.box(paint, leg, h, leg, x + cx[i]!, y, z + cz[i]!);
    const bays = Math.max(1, Math.round(h / bay));
    for (let k = 1; k <= bays; k++) {
      const yk = y + (h * k) / bays,
        y0 = y + (h * (k - 1)) / bays;
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        this.bar(paint, [x + cx[i]!, yk, z + cz[i]!], [x + cx[j]!, yk, z + cz[j]!], leg * 0.6);
        this.bar(paint, [x + cx[i]!, y0, z + cz[i]!], [x + cx[j]!, yk, z + cz[j]!], leg * 0.5);
      }
    }
    return this;
  }

  private add(paint: Paint, g: THREE.BufferGeometry): this {
    g.applyMatrix4(this.frame);
    const list = this.boxes.get(paint) ?? [];
    list.push(g);
    this.boxes.set(paint, list);
    return this;
  }

  meshes(): THREE.Mesh[] {
    return [...this.boxes].map(([paint, list]) => {
      const material = new THREE.MeshStandardMaterial({ color: COLOURS[paint], roughness: paint === 'concrete' ? 0.95 : 0.6 });
      // These take the same haze as the land (air.ts: 25 km at sea level, thinning over 1.4 km of height),
      // which leaves the Atlas pads at 5 to 6 km and Complex 34 at 9 km faint but there, as on a clear morning.
      const mesh = new THREE.Mesh(mergeGeometries(list), material);
      mesh.castShadow = mesh.receiveShadow = true;
      return mesh;
    });
  }
}

const FT = 0.3048;
/** A pad's concrete: a slab whose top is `top` above the ground it is sunk in (never close above the terrain: see AGENTS.md, No flicker). */
const slab = (k: Kit, w: number, d: number, top = 0.45, x = 0, z = 0) => k.box('concrete', w, top + SUNK, d, x, -SUNK, z);
/** How far a pad's concrete goes down into the ground, metres: further than the land falls away across the widest pad, so no slab's foot shows. */
const SUNK = 5;

/**
 * The kinds of thing that stood on a pad. Each draws itself in the frame its complex was given:
 * origin on the pad's centre, on the ground.
 */
const KINDS = {
  /** Minuteman flat pads, Complexes 31 and 32: a 65 ft roll-back service tower on rails and a 35 ft umbilical tower (both documented, the museum). */
  minuteman(k: Kit) {
    slab(k, 44, 44);
    k.box('white', 8, 65 * FT - 4, 8, 0, 4.45, -9).lattice('red', 8.4, 8.4, 4.2, 0, 0.45, -9, 4.2, 0.6); // the tower, enclosed above its trucks
    k.box('red', 9, 0.8, 9, 0, 65 * FT + 0.45, -9);
    k.lattice('steel', 2, 2, 35 * FT, 4.5, 0.45, 0, 3.6, 0.3);
  },
  /** Navaho, Complex 9: its two-storey concrete launch pedestal, 66 ft 8 in by 30 ft (documented). Whether the erector still stood is not established, so it is not drawn. */
  navaho(k: Kit) {
    slab(k, 50, 34);
    k.box('concrete', 66.67 * FT, 7.5, 30 * FT, 0, 0.45, 0);
  },
  /** Mace, Complex 21: a hardened concrete launch building with two cells (documented, finished February 1960). Size estimated. */
  mace(k: Kit) {
    slab(k, 46, 30);
    k.box('concrete', 30, 6, 16, 0, 0.45, 0).box('dark', 9, 4.4, 0.6, -7.5, 0.45, 8.1).box('dark', 9, 4.4, 0.6, 7.5, 0.45, 8.1);
  },
  /** A pad whose structure on that day is not established: Complex 18's two, Complex 12 without a tower. Its concrete only. */
  bare(k: Kit) {
    slab(k, 50, 50);
  },
  /**
   * An Atlas pad, Complexes 11 to 14. Complex 14's figures are the only ones published and are used for all four:
   * a ramp 92 ft long rising 22 ft to a launch stand 60 by 78 ft; an umbilical mast 84 ft 6 in above the stand; a
   * service structure 154 ft 8 in tall that rolled 300 ft back on rails. Where each tower stood that day is not known:
   * it is drawn part of the way back from the stand. Complex 14's was red; the others are taken to be.
   */
  atlas(k: Kit, tower = true) {
    const up = 22 * FT,
      w = 60 * FT,
      d = 78 * FT;
    slab(k, 46, 150, 0.45, 0, -40);
    k.box('concrete', w, up, d, 0, 0.45, 0); // the stand
    for (let i = 0; i < 6; i++) k.box('concrete', 12, (up * (6 - i)) / 7, (92 * FT) / 6, 0, 0.45, d / 2 + ((92 * FT) / 6) * (i + 0.5)); // the ramp, stepped
    k.lattice('steel', 2.4, 2.4, 84.5 * FT, w / 2 - 2, up + 0.45, -d / 4, 5.2, 0.35);
    if (!tower) return;
    const h = 154.67 * FT,
      back = -60; // drawn back along its rails, short of the full 300 ft
    for (const s of [-1, 1]) {
      k.bar('red', [s * 9, 0.45, back - 7], [s * 5, h, back - 2], 1.1).bar('red', [s * 9, 0.45, back + 7], [s * 5, h, back + 2], 1.1);
      for (let y = 8; y < h - 4; y += 8) {
        const t = y / h;
        k.bar('red', [s * (9 - 4 * t), y, back - 7 + 5 * t], [s * (9 - 4 * t), y, back + 7 - 5 * t], 0.45);
      }
    }
    for (let y = 8; y < h; y += 8) {
      const t = y / h;
      k.bar('red', [-(9 - 4 * t), y, back - 7 + 5 * t], [9 - 4 * t, y, back - 7 + 5 * t], 0.45);
      if (y > 14 && y < h - 8) k.box('white', 2 * (9 - 4 * t) - 1, 0.5, 14 - 10 * t - 0.4, 0, y, back); // its work levels
    }
    k.box('red', 12, 2.4, 6, 0, h, back);
  },
  /**
   * A Titan I pad, Complexes 15, 16, 19 and 20: an umbilical tower beside the launch stand, and the erector that
   * raised the missile and lay back flat before launch (the museum, Complex 19). No size is published for either:
   * 33 m and 30 m, for a 30 m missile (estimated). With no missile on the pad the erector lies down.
   */
  titan(k: Kit) {
    slab(k, 60, 90, 0.45, 0, 14);
    k.box('concrete', 14, 5, 14, 0, 0.45, 0);
    k.lattice('red', 4, 4, 33, -9, 0.45, 0, 5.5, 0.45);
    for (const y of [11, 22, 33]) k.box('white', 7, 0.5, 5, -6.5, y, 0);
    for (const s of [-1, 1]) k.bar('white', [s * 2.6, 5.4, 6], [s * 2.6, 7, 36], 0.7); // the erector, lowered
    for (let z = 8; z < 36; z += 5) k.bar('white', [-2.6, 5.4 + (z - 6) * 0.053, z], [2.6, 5.4 + (z - 6) * 0.053, z], 0.4);
    k.box('concrete', 7, 5, 4, 0, 0.45, 36);
  },
  /**
   * Complex 34, for Saturn, five months before its first launch (Moonport, ch. 2): the service structure, an inverted U
   * 310 ft high on a base 70 by 130 ft, standing 185 m west of the pad (it first moved on its rails on 26 March 1961);
   * the launch pedestal, 42 ft square and 27 ft high; and the umbilical tower, stopped at 27 ft. All documented.
   */
  saturn(k: Kit) {
    slab(k, 130, 130);
    const p = 42 * FT;
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const)
      k.box('concrete', 2.4, 27 * FT, 2.4, (sx * p) / 2, 0.45, (sz * p) / 2);
    k.box('concrete', p + 2.4, 2, p + 2.4, 0, 27 * FT - 1.55, 0);
    k.lattice('red', 7, 7, 27 * FT, 16, 0.45, 0, 4.1, 0.5); // the umbilical tower's first 27 ft
    const h = 310 * FT,
      bw = 130 * FT,
      bd = 70 * FT,
      x = -185;
    slab(k, 30, 190, 0.45, x / 2, 0); // its track
    for (const s of [-1, 1]) {
      k.lattice('red', 9, bd, h - 14, x, 0.45, (s * (bw - 9)) / 2, 9.4, 0.9);
      k.box('red', 10, 4, bd + 2, x, 0.45, (s * (bw - 9)) / 2);
    }
    k.lattice('red', 9, bw, 14, x, h - 13.55, 0, 7, 0.9); // the bridge across the top
    k.box('white', 7, 30, bw - 22, x, h - 60, 0); // enclosed levels under it
  },
};

interface Complex {
  name: string;
  lat: number;
  lon: number;
  /** Which way the pad is turned, degrees clockwise from north. Not published for any of them: Complex 26 lies on pad 5's rail line; the rest are set square to their stretch of shore (estimated). */
  heading: number;
  /** A far one: the stand-in drawn here. */
  draw?: (k: Kit) => void;
  /** A near one: the name of its node in the neighbours' model, built in its own frame (its +Y along `heading`). */
  node?: string;
  /** How much ground is kept clear and level round it, metres: a pad's own 45 m unless said. */
  clear?: number;
  /** How far from its middle its concrete and buildings reach, metres: nothing grows there (a near one's). */
  paved?: number;
}

/**
 * What stood on 5 May 1961, nearest first. Coordinates: OpenStreetMap (the way or relation of each pad).
 * Left out because nothing above the ground can be shown for that day: Complexes 1 to 4 (flat pads, inactive),
 * 10 (demolished 1959), 22 (a revetment), the two Minuteman silos, 36 (finished that year; whether its tower
 * stood by May is not established), 37, 43 and the Polaris pads 25C/D (not begun).
 */
const COMPLEXES: Complex[] = [
  // The near ones: each a model in a frame of its own (sites/cape/<complex>.py says where its origin is and which way its +Y runs).
  // A complex's other pad and its blockhouse are listed for the ground kept clear round them; the blockhouses' places are
  // OpenStreetMap's outlines of what survives.
  { name: 'LC-26B', lat: 28.443346, lon: -80.571204, heading: 25, node: 'LC26', clear: 72, paved: 46 },
  { name: 'LC-26A', lat: 28.44464, lon: -80.570521, heading: 25, clear: 72, paved: 46 },
  { name: 'LC-26 blockhouse', lat: 28.444422, lon: -80.571863, heading: 25, clear: 34, paved: 24 },
  { name: 'LC-30A', lat: 28.439738, lon: -80.579498, heading: 202, node: 'LC30', clear: 60, paved: 44 },
  { name: 'LC-30B', lat: 28.438427, lon: -80.580212, heading: 202, clear: 60, paved: 44 },
  { name: 'LC-30 blockhouse', lat: 28.439487, lon: -80.58086, heading: 202, clear: 34, paved: 24 },
  { name: 'LC-25A', lat: 28.432267, lon: -80.575857, heading: 213, node: 'LC25', clear: 50, paved: 34 },
  { name: 'LC-25B', lat: 28.431423, lon: -80.576437, heading: 213, clear: 45, paved: 28 },
  { name: 'LC-25 blockhouse', lat: 28.432062, lon: -80.576976, heading: 213, clear: 34, paved: 24 },
  { name: 'LC-17B', lat: 28.44589, lon: -80.565898, heading: 24, node: 'LC17', clear: 80, paved: 62 },
  { name: 'LC-29A', lat: 28.429859, lon: -80.577142, heading: 203, node: 'LC29', clear: 50, paved: 34 },
  { name: 'LC-29 blockhouse', lat: 28.429512, lon: -80.578231, heading: 203, clear: 34, paved: 24 },
  { name: 'LC-17A', lat: 28.447223, lon: -80.565274, heading: 24, clear: 80, paved: 62 },
  { name: 'LC-17 blockhouse', lat: 28.447197, lon: -80.566933, heading: 24, clear: 34, paved: 24 },
  { name: 'LC-18B', lat: 28.449016, lon: -80.561774, heading: 115, draw: KINDS.bare },
  { name: 'LC-18A', lat: 28.450785, lon: -80.562232, heading: 115, draw: KINDS.bare },
  { name: 'LC-9', lat: 28.452227, lon: -80.559383, heading: 115, draw: KINDS.navaho },
  { name: 'LC-31A', lat: 28.45184, lon: -80.556222, heading: 115, draw: KINDS.minuteman },
  { name: 'LC-32A', lat: 28.453741, lon: -80.555625, heading: 115, draw: KINDS.minuteman },
  { name: 'LC-21', lat: 28.460544, lon: -80.540238, heading: 115, draw: KINDS.mace },
  { name: 'LC-11', lat: 28.475282, lon: -80.539523, heading: 60, draw: (k) => KINDS.atlas(k) },
  { name: 'LC-12', lat: 28.480713, lon: -80.541926, heading: 60, draw: (k) => KINDS.atlas(k, false) }, // its tower burned in September 1959; what replaced it by May 1961 is not established
  { name: 'LC-13', lat: 28.485852, lon: -80.544441, heading: 60, draw: (k) => KINDS.atlas(k) },
  { name: 'LC-14', lat: 28.491115, lon: -80.546898, heading: 60, draw: (k) => KINDS.atlas(k) },
  { name: 'LC-15', lat: 28.496278, lon: -80.549362, heading: 60, draw: KINDS.titan }, // 15 and 16 were being converted for Titan II: their state that day is not established
  { name: 'LC-16', lat: 28.501676, lon: -80.551796, heading: 60, draw: KINDS.titan },
  { name: 'LC-19', lat: 28.506719, lon: -80.554253, heading: 60, draw: KINDS.titan },
  { name: 'LC-20', lat: 28.512176, lon: -80.556704, heading: 60, draw: KINDS.titan },
  { name: 'LC-34', lat: 28.521839, lon: -80.561182, heading: 0, draw: KINDS.saturn },
];

/** Ground the near complexes' models stand on, where nothing grows: [x, z, radius], compass metres from pad 5. */
export const PAVED: [number, number, number][] = COMPLEXES.filter((c) => c.paved).map((c) => [...fromPad5(c.lat, c.lon), c.paved!]);

/** Cape Canaveral Light: OpenStreetMap way 1219644136; 3.73 km from pad 5 on 051 degrees. */
const LIGHTHOUSE = { lat: 28.46036, lon: -80.543454 };

/** Where each complex and the lighthouse stand, for keeping the ground round the near ones clear: [x, z, radius]. */
export const CLEARINGS: [number, number, number][] = [
  ...COMPLEXES.map((c): [number, number, number] => [...fromPad5(c.lat, c.lon), c.clear ?? (c.draw === KINDS.saturn ? 110 : 45)]),
  [...fromPad5(LIGHTHOUSE.lat, LIGHTHOUSE.lon), 30],
];

/**
 * The complexes a walker can reach, as built by missions/usa/mercury/sites/cape/model/1961-05.py: one node a complex,
 * each in its own frame. It is small (sites/cape.md gives its size), so it is fetched with the scene.
 */
export const NEIGHBOURS = 'models/usa/mercury/sites/cape/1961-05.glb';
/**
 * The materials that model may wear, by the names its script gives them (the pad's own: sites/lc5/site.py). Each is
 * one mesh here from the start, empty until the model arrives, so that the look in force (look.ts) and the walker
 * (walk.ts: what is solid) have them before there is anything to see; an unknown name is reported and not drawn.
 */
const WORN_BY_NEIGHBOURS = [
  'concrete',
  'concrete-painted',
  'concrete-block-painted',
  'paint-structure-red',
  'paint-structure-white',
  'paint-structure-grey',
  'paint-launcher-black',
  'galvanised-steel',
  'galvanised-deck',
  'steel-rail',
  'steel-blast-door',
  'roof-tar',
  'shell-gravel',
  'window-void',
];
/** How far above the terrain a model's zero stands: the pad's surface over the ground round it (backdrops.ts: GROUND_Y; sites/lc5/site.py: GROUND). */
const PAD_OVER_GROUND = 0.12;

/** The near complexes: a mesh for each material, filled when the model has arrived. `arrived()` is true once, when it has. */
function neighbours(groundAt: (x: number, z: number) => number): { meshes: THREE.Mesh[]; arrived: () => boolean } {
  const meshes = new Map<string, THREE.Mesh>();
  for (const name of WORN_BY_NEIGHBOURS) {
    const material = new THREE.MeshStandardMaterial({ name, color: 0x808080, roughness: 0.8 });
    material.shadowSide = THREE.DoubleSide; // as every model's surfaces cast (stage.ts: dress)
    grain(material);
    // nothing yet: one point underground, so that it is a mesh with a place to whoever lists the scene's meshes
    const nothing = new THREE.BufferGeometry().setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, -1e3, 0, 0, -1e3, 0, 0, -1e3, 0], 3),
    );
    const mesh = new THREE.Mesh(nothing, material);
    mesh.name = `Neighbours_${name}`;
    mesh.castShadow = mesh.receiveShadow = true;
    meshes.set(name, mesh);
  }
  let news = false;
  // (no page: a test builds the Cape without its neighbours)
  if (typeof document !== 'undefined') {
    const loader = new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath(`${import.meta.env.BASE_URL}draco/`));
    loader
      .loadAsync(import.meta.env.BASE_URL + NEIGHBOURS)
      .then((gltf) => {
        const lists = new Map<string, THREE.BufferGeometry[]>();
        for (const c of COMPLEXES) {
          const node = c.node && gltf.scene.getObjectByName(c.node);
          if (!node) continue;
          const [x, z] = fromPad5(c.lat, c.lon);
          node.rotation.y = -THREE.MathUtils.degToRad(c.heading);
          node.position.set(x, groundAt(x, z) + PAD_OVER_GROUND, z);
          node.updateWorldMatrix(false, true);
          node.traverse((o) => {
            const part = o as THREE.Mesh;
            if (!part.isMesh) return;
            const from = part.material as THREE.MeshStandardMaterial;
            const to = meshes.get(from.name);
            if (!to) {
              console.warn(`cape1961.ts: the neighbours' model wears "${from.name}", which is not in WORN_BY_NEIGHBOURS: not drawn`);
              return;
            }
            // the material is the model's: its colour and finish are taken from it, here and on the twin a look may have made
            const real = (to.userData.real ?? to.material) as THREE.MeshStandardMaterial;
            real.color.copy(from.color);
            real.roughness = from.roughness;
            real.metalness = from.metalness;
            if (to.material !== real) (to.material as THREE.MeshToonMaterial).color.copy(from.color);
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', part.geometry.getAttribute('position').clone());
            g.setAttribute('normal', part.geometry.getAttribute('normal').clone());
            g.setIndex(part.geometry.getIndex()!.clone());
            g.applyMatrix4(part.matrixWorld);
            lists.set(from.name, [...(lists.get(from.name) ?? []), g]);
          });
        }
        for (const [name, list] of lists) {
          const mesh = meshes.get(name)!;
          mesh.geometry.dispose();
          mesh.geometry = mergeGeometries(list);
          mesh.geometry.computeBoundingBox();
          mesh.geometry.computeBoundingSphere();
        }
        news = true;
      })
      .catch((e) => console.warn('the neighbouring complexes did not arrive, and are done without:', e));
  }
  return {
    meshes: [...meshes.values()],
    arrived: () => {
      const was = news;
      news = false;
      return was;
    },
  };
}

/**
 * The complexes and the lighthouse, as a handful of meshes on the compass. `groundAt` is the terrain's height at a
 * place (compass metres from pad 5). Each far one stands on the highest ground within its pad's reach, its concrete
 * sunk well below that; a near one stands as the pad does, its zero 12 cm over the ground, which is level round it
 * (cape.ts: the clearings). `changed()` is true once when something of it has arrived late.
 */
export function buildCape1961(groundAt: (x: number, z: number) => number): { scenery: THREE.Object3D[]; changed: () => boolean } {
  const k = new Kit();
  const stands = (x: number, z: number, reach: number) =>
    Math.max(...[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => groundAt(x + ((i % 3) - 1) * reach, z + (Math.floor(i / 3) - 1) * reach)));
  for (const c of COMPLEXES) {
    if (!c.draw) continue;
    const [x, z] = fromPad5(c.lat, c.lon);
    c.draw(k.at(x, stands(x, z, 30), z, c.heading));
  }
  const groundY = stands(...fromPad5(LIGHTHOUSE.lat, LIGHTHOUSE.lon), 5);
  // The lighthouse: a cast-iron tower 151 ft tall, three black and three white bands from the foot, a black lantern
  // (documented); its taper and the brick oil house beside it are drawn by eye.
  const [lx, lz] = fromPad5(LIGHTHOUSE.lat, LIGHTHOUSE.lon);
  k.at(lx, groundY, lz);
  const tower = 151 * FT - 6,
    bands = 6;
  for (let i = 0; i < bands; i++)
    k.drum(i % 2 ? 'white' : 'black', 4.1 - (2.0 * i) / bands, 4.1 - (2.0 * (i + 1)) / bands, tower / bands, 0, (tower * i) / bands, 0, 20);
  k.drum('black', 2.9, 2.9, 0.4, 0, tower, 0, 20)
    .drum('dark', 1.6, 1.6, 3.2, 0, tower + 0.4, 0, 12)
    .drum('black', 1.9, 0.2, 2.2, 0, tower + 3.6, 0, 12);
  k.box('red', 4, 3, 6, 9, 0, 0).box('dark', 4.4, 0.5, 6.4, 9, 3, 0); // the oil house
  const near = neighbours(groundAt);
  return { scenery: [...k.meshes(), ...near.meshes], changed: near.arrived };
}

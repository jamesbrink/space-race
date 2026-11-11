import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LC5 } from '../../missions/usa/mercury/sites/lc-5.ts';

/**
 * Cape Canaveral beyond Complex 5/6 on 5 May 1961: the other launch complexes that stood that
 * day, the lighthouse, and the shore, each at its real place.
 *
 * Places are documented: every position is a published coordinate (OpenStreetMap's outline of
 * the pad or its ruin, checked against Wikipedia's), turned into metres east and north of pad 5.
 * What stood there is documented in kind (the Cape Canaveral Space Force Museum's page for each
 * complex, Moonport for Complex 34, the GCAT launch log for what was in use), and in a few sizes,
 * which are given below where they are. The shapes are not: each is a stand-in for its type,
 * drawn so that an Atlas pad, a Titan pad, a Thor gantry and a Polaris stand can be told apart
 * on the horizon, and no more. A complex whose structure could not be verified for that day is
 * drawn as its pad alone, or left out and listed in missions/usa/mercury/sites/lc-5.md.
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
 */
const ATLANTIC: [number, number][] = [
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
 * edge, past today's port and causeways (not there in 1961, and not drawn).
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
  [28.52445, -80.59328],
  [28.54318, -80.59209],
];
/**
 * Its west shore, Merritt Island's east: from the same relation, the far edge of the river's
 * water every 300 m of northing (across islands and causeways under 400 m), the median of five,
 * thinned to one in two. The river is 5.7 km wide abreast of pad 5 and narrows to 1.7 km 12 km north.
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
  [28.50981, -80.62954],
  [28.51522, -80.62611],
  [28.52063, -80.62119],
  [28.52605, -80.6187],
  [28.53146, -80.61631],
  [28.53688, -80.61393],
  [28.54229, -80.61307],
  [28.5477, -80.61097],
  [28.55312, -80.60944],
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
const slab = (k: Kit, w: number, d: number, top = 0.45, x = 0, z = 0) => k.box('concrete', w, top + 1, d, x, -1, z);

/**
 * The kinds of thing that stood on a pad. Each draws itself in the frame its complex was given:
 * origin on the pad's centre, on the ground.
 */
const KINDS = {
  /** Redstone and Jupiter, Complex 26: the Noble A-frame gantry, twin of pad 5's. 111 ft 9 in to its top rail (documented, the museum). */
  redstone(k: Kit) {
    slab(k, 60, 60);
    const h = 111.75 * FT;
    for (const s of [-1, 1]) {
      k.bar('red', [s * 3.2, 3, 4], [s * 0.9, h - 3, 4], 0.9);
      k.box('red', 2.2, 2.6, 15, s * 3.2, 0.45, 2);
    }
    for (let y = 9; y < h - 6; y += 7) k.bar('red', [-3.2 + (2.3 * y) / h, y, 4], [3.2 - (2.3 * y) / h, y, 4], 0.4);
    k.box('red', 1.7, 1.7, 13, 0, h - 3, 0.5); // the hammerhead
    k.box('red', 8.4, 2.6, 6.5, 0, 16, -0.5).box('white', 8.2, 3, 6.5, 0, 19.5, -0.5).box('red', 8.4, 2.6, 6.5, 0, 23.2, -0.5); // its platforms, closed
  },
  /** Thor-Delta and Thor-Ablestar, Complex 17: a tall rolling gantry beside a launch stand. Height not found: 35 m, for a 28 m vehicle (estimated). */
  thor(k: Kit) {
    slab(k, 70, 50);
    k.lattice('red', 9, 9, 33, 0, 0.45, -12, 5.5, 0.6);
    k.box('white', 9.4, 9, 9.4, 0, 14, -12).box('red', 10, 2.2, 15, 0, 33.4, -9.5); // enclosed work levels, and the bridge crane's overhang
    k.box('concrete', 7, 3, 7, 0, 0.45, 0).lattice('steel', 1.6, 1.6, 22, 5.5, 0.45, 0, 4.4, 0.3); // the stand and its umbilical mast
  },
  /** Polaris, Complexes 25 and 29: an "access stand" (the museum's words). Height not found: 14 m, for a 9.4 m missile (estimated). */
  polaris(k: Kit) {
    slab(k, 36, 36);
    k.lattice('steel', 6.5, 6.5, 13, 0, 0.45, -5, 4.3, 0.4);
    for (const y of [4.8, 9.1, 13.4]) k.box('steel', 8.5, 0.3, 8.5, 0, y, -5);
    k.drum('dark', 1.4, 1.4, 2.2, 0, 0.45, 2.5); // the launch tube's collar
  },
  /** Pershing, Complex 30: "two launch pads with service towers" (the museum); a mobile gantry. Height not found: 13 m (estimated). */
  pershing(k: Kit) {
    slab(k, 30, 30);
    k.lattice('steel', 4.5, 4.5, 12.5, 0, 0.45, -4, 4.2, 0.35);
    k.box('white', 5, 3, 5, 0, 8.6, -4);
  },
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
  draw: (k: Kit) => void;
}

/**
 * What stood on 5 May 1961, nearest first. Coordinates: OpenStreetMap (the way or relation of each pad).
 * Left out because nothing above the ground can be shown for that day: Complexes 1 to 4 (flat pads, inactive),
 * 10 (demolished 1959), 22 (a revetment), the two Minuteman silos, 36 (finished that year; whether its tower
 * stood by May is not established), 37, 43 and the Polaris pads 25C/D (not begun).
 */
const COMPLEXES: Complex[] = [
  { name: 'LC-26B', lat: 28.443346, lon: -80.571204, heading: 25, draw: KINDS.redstone }, // Juno II flew from here on 27 April and 24 May: the one gantry is put on this pad
  { name: 'LC-26A', lat: 28.44464, lon: -80.570521, heading: 25, draw: KINDS.bare },
  { name: 'LC-30A', lat: 28.439738, lon: -80.579498, heading: 115, draw: KINDS.pershing },
  { name: 'LC-30B', lat: 28.438427, lon: -80.580212, heading: 115, draw: KINDS.pershing },
  { name: 'LC-25A', lat: 28.432267, lon: -80.575857, heading: 115, draw: KINDS.polaris },
  { name: 'LC-25B', lat: 28.431423, lon: -80.576437, heading: 115, draw: KINDS.polaris },
  { name: 'LC-17B', lat: 28.44589, lon: -80.565898, heading: 115, draw: KINDS.thor },
  { name: 'LC-29A', lat: 28.429859, lon: -80.577142, heading: 115, draw: KINDS.polaris },
  { name: 'LC-17A', lat: 28.447223, lon: -80.565274, heading: 115, draw: KINDS.thor },
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

/** Cape Canaveral Light: OpenStreetMap way 1219644136; 3.73 km from pad 5 on 051 degrees. */
const LIGHTHOUSE = { lat: 28.46036, lon: -80.543454 };

/** Where each complex and the lighthouse stand, for keeping the ground round the near ones clear: [x, z, radius]. */
export const CLEARINGS: [number, number, number][] = [
  ...COMPLEXES.map((c): [number, number, number] => [...fromPad5(c.lat, c.lon), c.draw === KINDS.saturn ? 110 : 45]),
  [...fromPad5(LIGHTHOUSE.lat, LIGHTHOUSE.lon), 30],
];

/** The complexes and the lighthouse, as a handful of meshes on the compass. `groundY` is the terrain's height. */
export function buildCape1961(groundY: number): THREE.Object3D[] {
  const k = new Kit();
  for (const c of COMPLEXES) {
    const [x, z] = fromPad5(c.lat, c.lon);
    c.draw(k.at(x, groundY, z, c.heading));
  }
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
  return k.meshes();
}

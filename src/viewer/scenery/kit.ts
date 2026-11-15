import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Shapes for scenery too far off to be modelled: a place's stand-ins for what stood on its horizon (the Cape's far
 * launch complexes and its lighthouse: missions/usa/places/cape-canaveral/scenery.ts), boxes, bars, drums and lattices in
 * a few paints, gathered by paint into one mesh each.
 */

export type Paint = 'red' | 'white' | 'steel' | 'concrete' | 'black' | 'dark';
const COLOURS: Record<Paint, number> = {
  red: 0x7a2018,
  white: 0xdedbd2,
  steel: 0x6c7074,
  concrete: 0x8d8a82,
  black: 0x121212,
  dark: 0x2a2c2e,
};

/** Boxes gathered by colour, to be drawn as one mesh each: twenty complexes are six draw calls, not six hundred. */
export class Kit {
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

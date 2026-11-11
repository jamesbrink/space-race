import * as THREE from 'three';

/**
 * A hose, a cable, a tether: something of fixed length hanging between two things that move.
 * It is a chain of points, each kept its link's length from the next, pulled down by gravity,
 * kept above the ground and outside whatever it is told to keep out of, with its two ends where
 * its anchors are and leaving them the way they point. Drawn as a tube, rebuilt in place each
 * frame. Nothing here knows what it joins.
 *
 * `relax` is the whole of how it hangs, and is pure; `Hose` owns the points and the mesh.
 */

/** An upright cylinder the chain may not pass through (a body, a post): its axis' (x, z), its radius, and the heights it stands between. */
export interface KeepOut {
  x: number;
  z: number;
  radius: number;
  bottom: number;
  top: number;
}

/** How hard gravity pulls the chain, m/s², and how much of its motion it keeps from one tick to the next (a hose is not a pendulum: it settles). */
const GRAVITY = 9.81;
const KEEP = 0.9;

/**
 * One tick of a hanging chain. `points` and `before` are x, y, z per point, this tick's and the
 * last's, and both are updated. The first point is put at `a` and the last at `b`; the second
 * and the next-to-last are held one link out along `aOut` and `bOut` (unit ways), so the chain
 * leaves each end the way its fitting points. Every other link is `link` long when it can be:
 * if the ends are further apart than the chain is long, it is drawn straight and taut.
 */
export function relax(
  points: Float32Array,
  before: Float32Array,
  a: readonly number[],
  aOut: readonly number[],
  b: readonly number[],
  bOut: readonly number[],
  link: number,
  dt: number,
  floor: number | null = null,
  keepOut: KeepOut | null = null,
  passes = 12,
): void {
  const n = points.length / 3;
  const last = n - 1;
  // carried on by what they were doing, and pulled down
  for (let i = 0; i < n; i++)
    for (let k = 0; k < 3; k++) {
      const at = points[i * 3 + k]!;
      const moved = (at - before[i * 3 + k]!) * KEEP;
      before[i * 3 + k] = at;
      points[i * 3 + k] = at + moved - (k === 1 ? GRAVITY * dt * dt : 0);
    }
  const pin = () => {
    for (let k = 0; k < 3; k++) {
      points[k] = a[k]!;
      points[last * 3 + k] = b[k]!;
      if (n > 3) {
        points[3 + k] = a[k]! + aOut[k]! * link;
        points[(last - 1) * 3 + k] = b[k]! + bOut[k]! * link;
      }
    }
  };
  for (let pass = 0; pass < passes; pass++) {
    pin();
    for (let i = 0; i < last; i++) {
      const p = i * 3;
      const q = p + 3;
      const dx = points[q]! - points[p]!;
      const dy = points[q + 1]! - points[p + 1]!;
      const dz = points[q + 2]! - points[p + 2]!;
      const length = Math.hypot(dx, dy, dz) || 1e-9;
      const half = (length - link) / length / 2;
      points[p] += dx * half;
      points[p + 1] += dy * half;
      points[p + 2] += dz * half;
      points[q] -= dx * half;
      points[q + 1] -= dy * half;
      points[q + 2] -= dz * half;
    }
    for (let i = 1; i < last; i++) {
      const p = i * 3;
      if (floor !== null && points[p + 1]! < floor) points[p + 1] = floor;
      if (keepOut && points[p + 1]! > keepOut.bottom && points[p + 1]! < keepOut.top) {
        const dx = points[p]! - keepOut.x;
        const dz = points[p + 2]! - keepOut.z;
        const out = Math.hypot(dx, dz);
        if (out < keepOut.radius && out > 1e-6) {
          points[p] = keepOut.x + (dx / out) * keepOut.radius;
          points[p + 2] = keepOut.z + (dz / out) * keepOut.radius;
        }
      }
    }
  }
  pin();
}

/** How many points the chain has, how many rings the tube is drawn with between each pair, and how many sides a ring has. */
const POINTS = 16;
const BETWEEN = 3;
const SIDES = 8;

export class Hose {
  readonly mesh: THREE.Mesh;
  private readonly points = new Float32Array(POINTS * 3);
  private readonly before = new Float32Array(POINTS * 3);
  private readonly scratch = new Float32Array(POINTS * 3);
  private readonly endA = new THREE.Vector3();
  private readonly endB = new THREE.Vector3();
  /** How long it has hung nearly still with its ends still, seconds. */
  private calm = 0;
  private readonly link: number;
  private readonly radius: number;
  private laid = false;
  /** The fastest any point of it moved in the last frame, m/s: under a few centimetres a second it has settled. */
  speed = 0;
  private readonly curve = new THREE.CatmullRomCurve3(
    Array.from({ length: POINTS }, () => new THREE.Vector3()),
    false,
    'centripetal',
  );

  /** A hose `length` metres long and `radius` thick, of this material. Its mesh goes wherever the caller puts it. */
  constructor(length: number, radius: number, material: THREE.Material) {
    this.link = length / (POINTS - 1);
    this.radius = radius;
    const rings = (POINTS - 1) * BETWEEN + 1;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(rings * SIDES * 3), 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(rings * SIDES * 3), 3));
    const index: number[] = [];
    for (let r = 0; r < rings - 1; r++)
      for (let s = 0; s < SIDES; s++) {
        const a = r * SIDES + s;
        const b = r * SIDES + ((s + 1) % SIDES);
        index.push(a, b, a + SIDES, b, b + SIDES, a + SIDES);
      }
    geometry.setIndex(index);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false; // it is rebuilt every frame: its bounds are never worth working out
    this.mesh.castShadow = this.mesh.receiveShadow = true;
  }

  /**
   * A frame: hang the hose between two points in the world, leaving each along a unit way, above
   * `floor` and outside `keepOut`, and rebuild the tube (in the coordinates of the mesh's parent).
   */
  update(
    a: THREE.Vector3,
    aOut: THREE.Vector3,
    b: THREE.Vector3,
    bOut: THREE.Vector3,
    dt: number,
    floor: number | null,
    keepOut: KeepOut | null,
  ): void {
    const points = this.points;
    if (!this.laid) {
      // the first time: laid straight between its ends, and left to fall into place
      for (let i = 0; i < POINTS; i++)
        for (let k = 0; k < 3; k++) points[i * 3 + k] = a.getComponent(k) + ((b.getComponent(k) - a.getComponent(k)) * i) / (POINTS - 1);
      this.before.set(points);
      this.laid = true;
      for (let i = 0; i < 40; i++)
        relax(points, this.before, a.toArray(), aOut.toArray(), b.toArray(), bOut.toArray(), this.link, 1 / 60, floor, keepOut);
    }
    // in steps no longer than a sixtieth of a second, or a slow frame would fling it
    // Hanging nearly still between ends that are not moving, it is let be: a chain like this
    // never quite stops trembling, and a hose that trembles is drawn again every frame.
    const shifted = Math.max(a.distanceTo(this.endA), b.distanceTo(this.endB));
    this.endA.copy(a);
    this.endB.copy(b);
    if (shifted > 0.002) this.calm = 0;
    if (this.calm >= 0.6) {
      this.speed = 0;
      return;
    }
    const was = this.scratch;
    was.set(points);
    const steps = Math.max(1, Math.min(4, Math.ceil(dt * 60)));
    for (let i = 0; i < steps; i++)
      relax(
        points,
        this.before,
        a.toArray(),
        aOut.toArray(),
        b.toArray(),
        bOut.toArray(),
        this.link,
        Math.min(dt, 1 / 15) / steps,
        floor,
        keepOut,
      );
    let far = 0;
    for (let i = 0; i < points.length; i += 3)
      far = Math.max(far, Math.hypot(points[i]! - was[i]!, points[i + 1]! - was[i + 1]!, points[i + 2]! - was[i + 2]!));
    this.speed = dt > 0 ? far / dt : 0;
    // (still enough: where it is pressed against the body it goes on shivering by a few millimetres for ever)
    this.calm = this.speed < 0.5 && shifted <= 0.002 ? this.calm + dt : 0;
    this.draw();
  }

  /** Lay it out afresh next time (it has been somewhere else). */
  reset(): void {
    this.laid = false;
    this.calm = 0;
  }

  private draw(): void {
    const parent = this.mesh.parent;
    const inverse = parent ? parent.matrixWorld.clone().invert() : null;
    this.curve.points.forEach((p, i) => {
      p.fromArray(this.points, i * 3);
      if (inverse) p.applyMatrix4(inverse);
    });
    const rings = (POINTS - 1) * BETWEEN + 1;
    const position = this.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const normal = this.mesh.geometry.getAttribute('normal') as THREE.BufferAttribute;
    const at = new THREE.Vector3();
    const along = new THREE.Vector3();
    const side = new THREE.Vector3(1, 0, 0);
    const up = new THREE.Vector3();
    const n = new THREE.Vector3();
    for (let r = 0; r < rings; r++) {
      const t = r / (rings - 1);
      this.curve.getPoint(t, at);
      this.curve.getTangent(t, along);
      // carry the ring's frame along the hose, so it does not twist from one ring to the next
      side.addScaledVector(along, -side.dot(along));
      if (side.lengthSq() < 1e-6) side.set(along.y, -along.x, 0);
      side.normalize();
      up.crossVectors(along, side);
      for (let s = 0; s < SIDES; s++) {
        const angle = (s / SIDES) * Math.PI * 2;
        n.copy(side).multiplyScalar(Math.cos(angle)).addScaledVector(up, Math.sin(angle));
        position.setXYZ(r * SIDES + s, at.x + n.x * this.radius, at.y + n.y * this.radius, at.z + n.z * this.radius);
        normal.setXYZ(r * SIDES + s, n.x, n.y, n.z);
      }
    }
    position.needsUpdate = normal.needsUpdate = true;
  }
}

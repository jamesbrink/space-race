import * as THREE from 'three';
import { type ExtendedTriangle, MeshBVH } from 'three-mesh-bvh';
// (with its extension: the tests run this file under Node, which adds none)
import { Gait, type Stir, view } from './gait.ts';

/**
 * Walking a flight's site on foot, in first person or over the shoulder: you are one of its figures (a model with a
 * `walker` entry in the flight's data), at that figure's eye height, and the world is solid.
 * Nothing here knows any one flight: it walks whatever models and scenery the stage has on show.
 * Four layers, each usable without the next:
 *
 *   settle   where the feet go vertically: stand, step up a riser, step down, fall, land (pure)
 *   Solids   the meshes that can be stood on and bumped into, as they are posed now
 *   Body     a standing figure moved through them: walls stop it, floors carry it
 *   Walker   keys, mouse and touch on a canvas, driving a Body and placing the camera at its
 *            eyes, or behind its shoulder
 *
 * Over the shoulder the figure is drawn, where the body is and facing the way it is going; that
 * and its stride are the stage's business (gait.ts). Here there is only where the camera goes.
 */

/** Metres per second: an unhurried walk, and a run. */
export const WALK_SPEED = 1.4;
export const RUN_SPEED = 4;
/** The tallest riser taken in stride, and the furthest drop that is a step down and not a fall. Metres. */
export const STEP = 0.3;
/** How fast the feet follow a floor that has stepped up or down under them, m/s: a stair is climbed, not teleported. */
export const STEP_RATE = 3;
export const GRAVITY = 9.81;
/** How high a standing jump lifts the feet, metres: an ordinary hop, not an athlete's. */
export const JUMP_HEIGHT = 0.4;
/** The speed the feet leave the ground at to reach it: v² = 2gh. */
export const JUMP_SPEED = Math.sqrt(2 * GRAVITY * JUMP_HEIGHT);
/** Half the width of a clothed adult across the shoulders, metres: what a figure is given when its flight does not say (ModelDef.walker.radius). */
export const RADIUS = 0.26;
/**
 * Where the eyes are in a standing figure, as a fraction of its whole height, for a figure whose
 * model names no eyes to measure. The usual anthropometric ratio is 0.936 of stature; a figure's
 * model is taller than its stature by its footwear and headgear, so a little less is taken. Estimated.
 */
export const EYE_FRACTION = 0.907;

export interface Footing {
  y: number;
  /** Vertical speed, m/s, negative while falling. */
  vy: number;
  grounded: boolean;
}

/**
 * The highest of the surfaces under the figure that it can use: anything up to a riser above
 * the feet. A surface higher than that is not a floor, it is a wall, and is somebody else's job.
 */
export function pickFloor(heights: readonly number[], feet: number, riser = STEP): number | null {
  let best: number | null = null;
  for (const h of heights) if (h <= feet + riser + 1e-6 && (best === null || h > best)) best = h;
  return best;
}

/**
 * One tick of the feet's height. `floor` is the surface under them (pickFloor), or null where
 * there is none, in which case they stay as they are and the caller decides what to do.
 * `down` is how far below the feet a floor may be and still be stepped down to, not fallen to;
 * `rate` is how fast the feet follow a floor that has stepped, m/s.
 */
export function settle(from: Footing, floor: number | null, dt: number, down = STEP, rate = STEP_RATE): Footing {
  if (floor === null) return { y: from.y, vy: 0, grounded: from.grounded };
  let { y, vy } = from;
  if (from.grounded) {
    // a riser or a step down (`down`: the deepest that is a step): follow it. Further down than that, the ground has gone.
    if (y - floor <= down + 1e-6) {
      const most = rate * dt;
      return { y: y + Math.max(-most, Math.min(most, floor - y)), vy: 0, grounded: true };
    }
    vy = 0;
  }
  vy -= GRAVITY * dt;
  y += vy * dt;
  return y <= floor ? { y: floor, vy: 0, grounded: true } : { y, vy, grounded: false };
}

/** Jump: from the ground the feet leave it at JUMP_SPEED, and `settle` does the rest. In the air there is nothing to push off. */
export function jump(from: Footing): Footing {
  return from.grounded ? { y: from.y, vy: JUMP_SPEED, grounded: false } : from;
}

/**
 * A rising figure `height` tall meets whatever is over it at `ceiling` (null: open sky): the
 * head stops there and the figure starts down again. Standing or falling, a ceiling changes nothing.
 */
export function bump(from: Footing, ceiling: number | null, height: number): Footing {
  if (ceiling === null || from.vy <= 0 || from.y + height <= ceiling) return from;
  return { y: ceiling - height, vy: 0, grounded: false };
}

/** How fast a ladder is climbed, m/s: a rung a second or so, hand over hand. */
export const CLIMB_SPEED = 0.6;
/** How far off a ladder's face the body hangs, beyond its own half-width, metres. */
const CLIMB_GAP = 0.04;

/**
 * A ladder: one near-vertical run, as a model declares it (a mesh with `userData.climb`). It is
 * known by its bounds: the heights of its foot and its top, where its middle is over the ground,
 * and its half-widths along x and z. The thinner way is the way it is climbed from.
 */
export interface Ladder {
  bottom: number;
  top: number;
  x: number;
  z: number;
  hx: number;
  hz: number;
}

/** A ladder with a climber on it: which side of it they are on (a unit way out from its face, over the ground). */
export interface Hold extends Ladder {
  nx: number;
  nz: number;
}

/**
 * Where a body of this half-width hangs on a ladder, coming to it from (px, pz): just off the
 * face on the side it came from, in the middle of the rungs. `side` (1 or -1) names the side
 * instead, for coming to a ladder from the deck at its top.
 */
export function hang(
  ladder: Ladder,
  px: number,
  pz: number,
  radius: number,
  side?: 1 | -1,
): { x: number; z: number; nx: number; nz: number } {
  const alongX = ladder.hx <= ladder.hz; // climbed along x: the rungs run along z
  const s = side ?? (((alongX ? px - ladder.x : pz - ladder.z) >= 0 ? 1 : -1) as 1 | -1);
  const out = (alongX ? ladder.hx : ladder.hz) + radius + CLIMB_GAP;
  return alongX ? { x: ladder.x + s * out, z: ladder.z, nx: s, nz: 0 } : { x: ladder.x, z: ladder.z + s * out, nx: 0, nz: s };
}

/**
 * A tick on a ladder: `push` is 1 to climb, -1 to go down, and anything between. The feet go no
 * higher than its top and no lower than its foot; `off` says which end has been reached, going that way.
 */
export function climb(
  y: number,
  push: number,
  ladder: { bottom: number; top: number },
  dt: number,
): { y: number; off: 'top' | 'bottom' | null } {
  const to = y + Math.max(-1, Math.min(1, push)) * CLIMB_SPEED * dt;
  if (push > 0 && to >= ladder.top) return { y: ladder.top, off: 'top' };
  if (push < 0 && to <= ladder.bottom) return { y: ladder.bottom, off: 'bottom' };
  return { y: Math.max(ladder.bottom, Math.min(ladder.top, to)), off: null };
}

/** How long a body takes to get most of the way to the speed asked of it, seconds, and to lose it: a start is not a switch, and a stop is a little quicker than a start. */
export const QUICKEN = 0.085;
export const SLACKEN = 0.065;

/**
 * A body's velocity over the ground a moment later, on its way to the one that is wanted: it
 * closes most of the gap in about a quarter of a second, a little faster when slowing. (x, z) in m/s.
 */
export function quicken(vx: number, vz: number, wantX: number, wantZ: number, dt: number): [number, number] {
  const slowing = Math.hypot(wantX, wantZ) < Math.hypot(vx, vz);
  const k = 1 - Math.exp(-dt / (slowing ? SLACKEN : QUICKEN));
  const x = vx + (wantX - vx) * k;
  const z = vz + (wantZ - vz) * k;
  // (and it does come to rest: an asymptote would keep the view creeping, and being redrawn, for seconds)
  return wantX === 0 && wantZ === 0 && Math.hypot(x, z) < 0.01 ? [0, 0] : [x, z];
}

/** How fast a stick pushed this far (0 to 1) walks: a walk over most of its travel, a run at the rim. */
export function stickSpeed(deflection: number): number {
  const m = Math.max(0, Math.min(1, deflection));
  return m < 0.75 ? (WALK_SPEED * m) / 0.75 : WALK_SPEED + ((RUN_SPEED - WALK_SPEED) * (m - 0.75)) / 0.25;
}

/** How far an arm reaches, metres: what is looked at from nearer than this can be acted on. */
export const REACH = 2.5;

/** What a ray met: the mesh, where, how far along, and which way the surface faces there. */
export interface Hit {
  mesh: THREE.Mesh;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
}

/** A mesh near enough to matter this tick, with what is needed to ask it questions in its own coordinates. */
interface Near {
  mesh: THREE.Mesh;
  bvh: MeshBVH;
  /** Its bounds in the world, as it is posed now. */
  box: THREE.Box3;
  inverse: THREE.Matrix4;
  scale: number;
}

const DOWN = new THREE.Vector3(0, -1, 0);
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Everything solid: the meshes under a set of roots. Each geometry gets a bounding volume
 * hierarchy the first time something comes near it; raw triangle tests on models this size
 * would take longer than the frame. Nothing is baked: every question is put to a mesh in its
 * own coordinates through its world matrix as it is now, so a platform that has slid, or a
 * truck that has driven off, is solid where it stands this frame.
 */
export class Solids {
  private roots: THREE.Object3D[] = [];
  private readonly lists = new WeakMap<THREE.Object3D, THREE.Mesh[]>();
  private readonly trees = new WeakMap<THREE.BufferGeometry, MeshBVH>();
  private readonly records = new WeakMap<THREE.Mesh, Near>();
  private near: Near[] = [];
  /** The ladders among them (`userData.climb`): not walls and not floors, but something to climb. */
  private rungs: Near[] = [];
  /** How many hierarchies have been built, for the diagnostics. */
  built = 0;

  private readonly ray = new THREE.Ray();
  private readonly segment = new THREE.Line3();
  private readonly region = new THREE.Box3();
  private readonly onTriangle = new THREE.Vector3();
  private readonly onSegment = new THREE.Vector3();
  private readonly away = new THREE.Vector3();
  private readonly point = new THREE.Vector3();

  /** What is solid from now on. World matrices must be up to date when questions are asked. */
  set(roots: THREE.Object3D[]): void {
    this.roots = roots;
  }

  private meshes(root: THREE.Object3D): THREE.Mesh[] {
    let list = this.lists.get(root);
    if (!list) {
      list = [];
      root.traverse((o) => {
        const mesh = o as THREE.Mesh;
        // one instanced mesh is thousands of plants: scrub is walked through, not into
        if (mesh.isMesh && !(mesh as THREE.InstancedMesh).isInstancedMesh && mesh.geometry.getAttribute('position')) list!.push(mesh);
      });
      this.lists.set(root, list);
    }
    return list;
  }

  /**
   * Choose the meshes near a point, within `reach` metres sideways, `below` under it and `above`
   * over it: the only ones the questions that follow are put to.
   */
  gather(centre: THREE.Vector3, reach: number, below: number, above = reach): void {
    this.near.length = 0;
    this.rungs.length = 0;
    this.region.min.set(centre.x - reach, centre.y - below, centre.z - reach);
    this.region.max.set(centre.x + reach, centre.y + above, centre.z + reach);
    for (const root of this.roots)
      for (const mesh of this.meshes(root)) {
        if (!mesh.visible) continue;
        const geometry = mesh.geometry;
        if (!geometry.boundingBox) geometry.computeBoundingBox();
        let record = this.records.get(mesh);
        if (!record) {
          record = { mesh, bvh: null as unknown as MeshBVH, box: new THREE.Box3(), inverse: new THREE.Matrix4(), scale: 1 };
          this.records.set(mesh, record);
        }
        record.box.copy(geometry.boundingBox!).applyMatrix4(mesh.matrixWorld);
        if (!record.box.intersectsBox(this.region)) continue;
        let tree = this.trees.get(geometry);
        if (!tree) {
          // indirect: the hierarchy keeps its own ordering and leaves the geometry's index as the renderer has it
          tree = new MeshBVH(geometry, { indirect: true });
          this.trees.set(geometry, tree);
          this.built++;
        }
        record.bvh = tree;
        record.inverse.copy(mesh.matrixWorld).invert();
        record.scale = mesh.matrixWorld.getMaxScaleOnAxis();
        (mesh.userData.climb || mesh.parent?.userData.climb ? this.rungs : this.near).push(record);
      }
  }

  /** The height of the first surface straight down from a point, or null. Either face of it counts. */
  below(x: number, y: number, z: number, floor: number | null): number | null {
    let best = floor;
    for (const n of this.near) {
      const b = n.box;
      if (x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z || b.min.y > y || (best !== null && b.max.y <= best)) continue;
      this.ray.origin.set(x, y, z);
      this.ray.direction.copy(DOWN);
      this.ray.applyMatrix4(n.inverse);
      const hit = n.bvh.raycastFirst(this.ray, THREE.DoubleSide);
      if (!hit) continue;
      const height = this.point.copy(hit.point).applyMatrix4(n.mesh.matrixWorld).y;
      if (best === null || height > best) best = height;
    }
    return best;
  }

  /** The height of the first surface straight up from a point, or null under open sky. */
  above(x: number, y: number, z: number): number | null {
    let best: number | null = null;
    for (const n of this.near) {
      const b = n.box;
      if (x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z || b.max.y < y || (best !== null && b.min.y >= best)) continue;
      this.ray.origin.set(x, y, z);
      this.ray.direction.copy(UP);
      this.ray.applyMatrix4(n.inverse);
      const hit = n.bvh.raycastFirst(this.ray, THREE.DoubleSide);
      if (!hit) continue;
      const height = this.point.copy(hit.point).applyMatrix4(n.mesh.matrixWorld).y;
      if (best === null || height < best) best = height;
    }
    return best;
  }

  /**
   * Push an upright capsule (a figure's body between `bottom` and `top`, `radius` thick) out of
   * whatever it is in, sideways only: what is under it is the floor's business. Moves `at` and
   * returns how deep it was in, metres (0: it was clear). `heading` is the way it was going, for
   * the case where it is so far in that there is no nearest side.
   */
  push(at: THREE.Vector3, bottom: number, top: number, radius: number, heading: THREE.Vector3): number {
    let deepest = 0;
    const region = this.region;
    for (const n of this.near) {
      const reach = radius + 1e-3;
      const b = n.box;
      if (at.x + reach < b.min.x || at.x - reach > b.max.x || at.z + reach < b.min.z || at.z - reach > b.max.z) continue;
      if (at.y + top < b.min.y || at.y + bottom > b.max.y) continue;
      const seg = this.segment;
      const r = radius / n.scale;
      const place = () => {
        seg.start.set(at.x, at.y + bottom + radius, at.z).applyMatrix4(n.inverse);
        seg.end.set(at.x, at.y + top - radius, at.z).applyMatrix4(n.inverse);
        region.makeEmpty().expandByPoint(seg.start).expandByPoint(seg.end).expandByScalar(r);
      };
      place();
      n.bvh.shapecast({
        intersectsBounds: (box) => box.intersectsBox(region),
        intersectsTriangle: (triangle: ExtendedTriangle) => {
          const distance = triangle.closestPointToSegment(seg, this.onTriangle, this.onSegment);
          if (distance >= r) return false;
          const away = this.away;
          if (distance > 1e-6) away.subVectors(this.onSegment, this.onTriangle).divideScalar(distance);
          else {
            // the triangle runs through the middle of the body: leave by the side it came in at
            triangle.getNormal(away);
            if (away.clone().transformDirection(n.mesh.matrixWorld).dot(heading) > 0) away.negate();
          }
          away.transformDirection(n.mesh.matrixWorld);
          const depth = (r - distance) * n.scale;
          const flat = Math.hypot(away.x, away.z);
          // touching from above or below (a floor under the feet, a soffit over the head): not a wall
          if (flat < 0.25) return false;
          deepest = Math.max(deepest, depth);
          // straight out sideways by as much as clears it, which on a leaning face is more than its depth
          const out = Math.min(depth / flat, radius) / flat;
          at.x += away.x * out;
          at.z += away.z * out;
          place();
          return false;
        },
      });
    }
    return deepest;
  }

  /** A ladder as its mesh stands now. */
  ladderOf(mesh: THREE.Mesh): Ladder {
    const box = this.region
      .copy(mesh.geometry.boundingBox ?? mesh.geometry.boundingSphere!.getBoundingBox(new THREE.Box3()))
      .applyMatrix4(mesh.matrixWorld);
    return {
      bottom: box.min.y,
      top: box.max.y,
      x: (box.min.x + box.max.x) / 2,
      z: (box.min.z + box.max.z) / 2,
      hx: (box.max.x - box.min.x) / 2,
      hz: (box.max.z - box.min.z) / 2,
    };
  }

  /** The ladders among what was gathered. */
  ladders(): Ladder[] {
    return this.rungs.map((n) => ({
      bottom: n.box.min.y,
      top: n.box.max.y,
      x: (n.box.min.x + n.box.max.x) / 2,
      z: (n.box.min.z + n.box.max.z) / 2,
      hx: (n.box.max.x - n.box.min.x) / 2,
      hz: (n.box.max.z - n.box.min.z) / 2,
    }));
  }

  /** The first surface along a ray, within `far` metres, or null. The normal is turned to face the ray's origin. */
  cast(origin: THREE.Vector3, direction: THREE.Vector3, far: number): Hit | null {
    let best: Hit | null = null;
    for (const n of [...this.near, ...this.rungs]) {
      this.ray.origin.copy(origin);
      this.ray.direction.copy(direction);
      if (!this.ray.intersectsBox(n.box)) continue;
      this.ray.applyMatrix4(n.inverse);
      const hit = n.bvh.raycastFirst(this.ray, THREE.DoubleSide);
      if (!hit) continue;
      const point = hit.point.clone().applyMatrix4(n.mesh.matrixWorld);
      const distance = point.distanceTo(origin);
      if (distance > far || (best && distance >= best.distance)) continue;
      const normal = (hit.face?.normal.clone() ?? new THREE.Vector3(0, 1, 0)).transformDirection(n.mesh.matrixWorld);
      if (normal.dot(direction) > 0) normal.negate();
      best = { mesh: n.mesh, point, normal, distance };
    }
    return best;
  }

  /** How far the nearest surface is from a point, if it is within `within` metres. */
  nearest(point: THREE.Vector3, within: number): number {
    let best = within;
    for (const n of this.near) {
      if (n.box.distanceToPoint(point) >= best) continue;
      const hit = n.bvh.closestPointToPoint(this.point.copy(point).applyMatrix4(n.inverse), undefined, 0, best / n.scale);
      if (hit) best = Math.min(best, hit.distance * n.scale);
    }
    return best;
  }
}

/** Where the floor is probed under a figure: under its middle and four points round it, as fractions of its radius. */
const PROBES: readonly [number, number][] = [
  [0, 0],
  [0.7, 0],
  [-0.7, 0],
  [0, 0.7],
  [0, -0.7],
];

/**
 * A standing figure in a solid world. `position` is the point between its feet. It walks where
 * it is sent, stops at what it cannot pass, steps up what it can, and falls when the floor ends.
 */
export class Body {
  readonly position = new THREE.Vector3();
  vy = 0;
  grounded = true;
  /** Standing height, metres: the top of whatever is on its head. */
  height = 1.89;
  /** Half its width, metres. */
  radius = RADIUS;
  /** The level of the open ground, which is everywhere and cannot be fallen through; null where there is none. */
  ground: number | null = null;
  /**
   * How far the open ground lies under the surface the models stand on (y = 0). The terrain is
   * kept that far down only so that nothing lying on it flickers (backdrops.ts: GROUND_Y); it is
   * not a kerb, and a riser met from down there is measured from the surface, not from the feet.
   */
  get sunk(): number {
    return this.ground === null ? 0 : Math.max(0, -this.ground);
  }
  readonly solids: Solids;
  /** The ladder it is on, if it is on one: gravity has no say, and the only way is up or down. */
  on: Hold | null = null;
  /** On a ladder: 1 to climb, -1 to go down. Walking, it is what the legs are being asked for (forward is positive). */
  climbing = 0;
  /**
   * It came onto the ladder from the deck above, walking forward: until the legs stop, forward
   * goes on meaning the way it was going, which is down.
   */
  private stepping = false;
  /** The eyes are turned well down: at the top of a ladder that means "I want to go down it". */
  lookingDown = false;
  /** The last place it stood with a floor under it and nothing through it. */
  private readonly good = new THREE.Vector3();
  private readonly before = new THREE.Vector3();
  private readonly heading = new THREE.Vector3();
  private readonly heights: number[] = [];

  constructor(solids: Solids) {
    this.solids = solids;
  }

  /** Stand it somewhere, on whatever is there. */
  place(x: number, y: number, z: number): void {
    this.position.set(x, y, z);
    this.on = null;
    this.vy = 0;
    this.grounded = true;
    this.solids.gather(this.position, 2, 4, this.height + 1);
    const floor = this.floor(STEP);
    // on it if it is within a step; otherwise it starts in the air and comes down
    if (floor !== null && y - floor <= STEP) this.position.y = floor;
    else this.grounded = false;
    this.good.copy(this.position);
  }

  /** The tallest riser that can be taken from where the feet are now: a step, measured from the models' surface while the feet are below it. */
  private riser(): number {
    return STEP + Math.max(0, Math.min(this.sunk, -this.position.y));
  }

  private floor(riser: number): number | null {
    const p = this.position;
    this.heights.length = 0;
    for (const [dx, dz] of PROBES) {
      const h = this.solids.below(p.x + dx * this.radius, p.y + riser, p.z + dz * this.radius, this.ground);
      if (h !== null) this.heights.push(h);
    }
    return pickFloor(this.heights, p.y, riser);
  }

  /** What is over the head, as the floor is under the feet: the lowest surface above the body's middle, or null. */
  private ceiling(): number | null {
    const p = this.position;
    let lowest: number | null = null;
    for (const [dx, dz] of PROBES) {
      const h = this.solids.above(p.x + dx * this.radius, p.y + this.height / 2, p.z + dz * this.radius);
      if (h !== null && (lowest === null || h < lowest)) lowest = h;
    }
    return lowest;
  }

  /**
   * Get onto a ladder. From the ground or the air beside it, on the side it is on, at the height
   * its feet are; from the deck at its top, on the side that has no floor, a step below the top.
   */
  mount(ladder: Ladder): void {
    const p = this.position;
    let hold = hang(ladder, p.x, p.z, this.radius);
    let y = Math.max(ladder.bottom, Math.min(ladder.top, p.y));
    if (this.grounded && p.y > ladder.bottom + 0.6) {
      // from a deck it serves (its stiles may stand a metre above that): the climbing side is the one with nothing to stand on at this height
      for (const side of [1, -1] as const) {
        const there = hang(ladder, p.x, p.z, this.radius, side);
        this.solids.gather(this.before.set(there.x, p.y, there.z), this.radius + 0.5, STEP + 1, this.height);
        const floor = this.solids.below(there.x, p.y + STEP, there.z, this.ground);
        if (floor === null || floor < p.y - STEP - 0.05) hold = there;
      }
      y = Math.min(ladder.top, p.y) - 0.05;
    }
    this.on = { ...ladder, nx: hold.nx, nz: hold.nz };
    this.stepping = false;
    p.set(hold.x, y, hold.z);
    this.vy = 0;
    this.grounded = false;
  }

  /** Let go of the ladder: gravity has it again. */
  letGo(): void {
    this.on = null;
  }

  /** A tick on a ladder: up or down it, and off at either end if there is somewhere to stand. */
  private climbStep(dt: number): void {
    const on = this.on!;
    const p = this.position;
    const hold = hang(on, 0, 0, this.radius, on.nx + on.nz > 0 ? 1 : -1);
    this.solids.gather(p, this.radius + 1.5, STEP + 1, this.height + 1);
    if (this.climbing <= 0) this.stepping = false;
    const push = this.stepping ? -this.climbing : this.climbing;
    const step = climb(p.y, push, on, dt);
    p.set(hold.x, step.y, hold.z);
    if (step.off === 'bottom') {
      this.on = null; // and the floor, if there is one within a step, has the feet next tick
      return;
    }
    // going down, the ground can come before the ladder's foot does
    if (push < 0) {
      const floor = this.floor(0.05);
      if (floor !== null && p.y - floor < 0.03) {
        p.y = floor;
        this.on = null;
        this.grounded = true;
        return;
      }
    }
    // Going up, a floor the feet have come level with is stepped onto: beyond the ladder, or to
    // either side of it. (A ladder's stiles stand above the deck it serves, and a run in a well
    // comes up through a hole with the floor beside it.) Not at its own foot.
    if (push > 0 && p.y > on.bottom + 0.5) {
      const across = (hold.nx ? on.hx : on.hz) + this.radius + 0.12;
      const along = (hold.nx ? on.hz : on.hx) + this.radius + 0.12;
      for (const [x, z] of [
        [on.x - hold.nx * across, on.z - hold.nz * across],
        [hold.x + hold.nz * along, hold.z + hold.nx * along],
        [hold.x - hold.nz * along, hold.z - hold.nx * along],
      ] as const) {
        this.solids.gather(this.before.set(x, p.y, z), this.radius + 0.6, 1, this.height + 0.5);
        const floor = this.solids.below(x, p.y + 0.03, z, null);
        if (floor === null || p.y - floor > Math.max(0.08, 1.5 * CLIMB_SPEED * dt)) continue;
        if (this.solids.push(this.before.set(x, floor, z), STEP, this.height, this.radius, this.heading.set(-hold.nx, 0, -hold.nz)) > 0.02)
          continue;
        p.set(x, floor, z);
        this.on = null;
        this.grounded = true;
        this.vy = 0;
        this.good.copy(p);
        return;
      }
      this.solids.gather(p, this.radius + 1.5, STEP + 1, this.height + 1);
    }
    if (step.off !== 'top') return;
    // over the top: onto whatever floor lies just beyond it, if there is one and room to stand
    const beyond = (hold.nx ? on.hx : on.hz) + this.radius + 0.12;
    p.set(on.x - hold.nx * beyond, on.top, on.z - hold.nz * beyond);
    this.solids.gather(p, this.radius + 1, STEP + 1, this.height + 1);
    const floor = this.floor(STEP);
    const blocked = this.solids.push(this.before.copy(p), STEP, this.height, this.radius, this.heading.set(-hold.nx, 0, -hold.nz)) > 0.02;
    if (floor === null || on.top - floor > STEP + 0.05 || blocked) {
      p.set(hold.x, on.top, hold.z); // nowhere to go: still on the ladder, at its top
      return;
    }
    p.y = floor;
    this.on = null;
    this.grounded = true;
    this.vy = 0;
    this.good.copy(p);
  }

  /** Walking into a ladder takes hold of it; so does walking at the top of one from the deck above, looking down it. */
  private reach(): void {
    const p = this.position;
    for (const ladder of this.solids.ladders()) {
      const hold = hang(ladder, p.x, p.z, this.radius);
      const toward = -(this.heading.x * hold.nx + this.heading.z * hold.nz); // 1: straight at its face
      const off = (p.x - hold.x) * hold.nx + (p.z - hold.z) * hold.nz; // how far short of hanging on it
      const aside = Math.abs((p.x - hold.x) * hold.nz - (p.z - hold.z) * hold.nx);
      const wide = (hold.nx ? ladder.hz : ladder.hx) + 0.15;
      // from a deck it serves: up to the edge over it, looking down (first: on a deck, walking at it means going down it)
      const over = Math.hypot(p.x - ladder.x, p.z - ladder.z);
      const at = ((ladder.x - p.x) * this.heading.x + (ladder.z - p.z) * this.heading.z) / (over || 1);
      if (this.grounded && this.lookingDown && p.y > ladder.bottom + 0.6 && p.y <= ladder.top + STEP && over < 0.9 && at > 0.5) {
        this.mount(ladder);
        this.stepping = true;
        return;
      }
      if (
        toward > 0.5 &&
        off < 0.12 &&
        off > -3 * this.radius &&
        aside < wide &&
        p.y > ladder.bottom - STEP - this.sunk - 0.05 &&
        p.y < ladder.top - 0.25
      ) {
        this.mount(ladder);
        return;
      }
    }
  }

  /** Hop: only from the ground. The next `move` carries it up and gravity brings it down. Off a ladder, it is letting go with a push. */
  jump(): void {
    if (this.on) {
      this.position.x += this.on.nx * 0.12;
      this.position.z += this.on.nz * 0.12;
      this.letGo();
      return;
    }
    const footing = jump({ y: this.position.y, vy: this.vy, grounded: this.grounded });
    this.vy = footing.vy;
    this.grounded = footing.grounded;
  }

  /**
   * Move by (dx, dz) metres over the ground during `dt` seconds, and let gravity have its tick.
   * In short strides, so that nothing thinner than the figure can be stepped through.
   */
  move(dx: number, dz: number, dt: number): void {
    if (this.on) {
      this.climbStep(dt);
      return;
    }
    const distance = Math.hypot(dx, dz);
    const strides = Math.max(1, Math.ceil(distance / (this.radius * 0.4)));
    const p = this.position;
    // everything the body could touch this tick: a step and a fall below the feet, the whole figure and a hop above them
    this.solids.gather(p, distance + this.radius + 1, STEP + 2 + Math.abs(this.vy) * dt, this.height + 1 + Math.abs(this.vy) * dt);
    this.heading.set(dx, 0, dz);
    if (distance) this.heading.divideScalar(distance);
    for (let i = 0; i < strides; i++) {
      const riser = this.riser();
      this.before.copy(p);
      p.x += dx / strides;
      p.z += dz / strides;
      // out of whatever that stride went into; a corner takes more than one push
      let depth = 0;
      for (let pass = 0; pass < 4; pass++) {
        depth = this.solids.push(p, riser, this.height, this.radius, this.heading);
        if (depth < 1e-4) break;
      }
      // still inside something after that: the stride is not taken
      if (depth > 0.02 && distance) p.copy(this.before);
      const floor = this.floor(riser);
      if (floor === null) {
        // nothing at all underneath (no ground in this setting): back to where there last was
        p.copy(this.good);
        this.vy = 0;
        this.grounded = true;
        return;
      }
      // (a step down is as deep as a step up is tall: onto ground that lies below the models' surface, deeper by that much)
      const down = STEP + Math.max(0, Math.min(this.sunk, -floor));
      // (and the feet keep up with the legs: run at a steep flight and they climb it as fast as it rises)
      const rate = Math.max(STEP_RATE, dt > 0 ? (1.3 * distance) / dt : 0);
      let footing = settle({ y: p.y, vy: this.vy, grounded: this.grounded }, floor, dt / strides, down, rate);
      if (footing.vy > 0) footing = bump(footing, this.ceiling(), this.height); // a hop under a soffit
      p.y = footing.y;
      this.vy = footing.vy;
      this.grounded = footing.grounded;
      if (this.grounded && depth < 1e-4) this.good.copy(p);
    }
    if (distance && this.climbing > 0) this.reach();
  }
}

/** What the walker needs from the stage it walks on. */
export interface WalkHost {
  /** Everything solid, as shown now. */
  solids(): THREE.Object3D[];
  /** The level of the open ground, or null where there is none. */
  ground(): number | null;
  /** How far from the middle of the site there is anything to walk to, metres. */
  reach(): number;
  /** The walker wants out (Escape). */
  leave(): void;
  /** The act key (E), or a finger held still on the view: do something with what is being looked at. */
  act(): void;
  /** The view was changed (C): first person, or over the shoulder. */
  viewed(third: boolean): void;
  /** The pointer was captured or let go: the page says how to look round accordingly. */
  locked(on: boolean): void;
}

const WALK_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', ' ']);
/** Radians of turn per pixel of mouse or finger. */
const LOOK = 0.0023;
/** Radians per second the left and right arrows turn the view. */
const TURN = 1.9;
/** The first-person lens, vertical degrees: wide enough to see where the feet are going. */
const FOV = 62;
const FOV_UPRIGHT = 80;
/** Over the shoulder: how far behind the head the camera sits, how far to the right of it and above it, metres. */
const BOOM = 3.4;
const SHOULDER = 0.55;
const OVER = 0.3;
/** How close to something behind it the camera may come, metres; and nearer the head than this, the figure is not drawn (the camera would be in it). */
const BOOM_CLEAR = 0.25;
const BOOM_LEAST = 1.2;
/** How long the camera takes to pull back over the shoulder and to come in again, seconds. */
const VIEW_SECONDS = 0.3;
/** How fast the figure turns to face the way it is going, radians a second. */
const FACE = 11;
/** How long a finger must rest on the view, without sliding, to mean "act on this": milliseconds, and pixels of slack. */
const HOLD_MS = 450;
const HOLD_SLACK = 10;
/** How long the eyes take to go up to a window and to come back from it, seconds. */
const PEEK_SECONDS = 0.45;
/** How long the lens takes to widen on getting down to walk, and to close again after. */
const LENS_SECONDS = 0.5;

/**
 * First-person walking: input on a canvas, a Body in the stage's solids, the camera at its eyes.
 * The mouse is captured for looking round where the browser allows it; otherwise (a phone, or a
 * refusal) a drag looks round, and `stick` and `jump` take an on-screen stick and button.
 */
export class Walker {
  active = false;
  readonly solids = new Solids();
  readonly body = new Body(this.solids);
  /** Which way the eyes point: radians about the vertical (0 looks along -Z), and above the horizon. */
  yaw = 0;
  pitch = 0;
  /** Eyes above the feet, metres. */
  eye = 1.72;
  /** Seen over the shoulder, not through the eyes. Kept from one walk to the next. */
  third = false;
  /** Which way the body faces, as `yaw` is measured: the eyes' way in first person, the way it last went over the shoulder. */
  heading = 0;
  /** How far the body went over the ground in the last frame, metres, and how fast that was, m/s. */
  stepped = 0;
  pace = 0;
  /** The camera is far enough from the head for the figure to be drawn. */
  outside = false;
  /** The figure's stride: the limbs seen from outside and the motion of the view from inside are both read off it (gait.ts). */
  readonly gait = new Gait();
  /** What the last frame did to the stride (see Stir). */
  stir: Stir = 0;
  /**
   * How much of the body's motion reaches the view through its eyes, 0 to 1: the rise and fall of
   * a stride, the sway, the give of a landing, breathing. 0 is a steady camera. It never touches
   * where the mouse points: that stays exact and immediate.
   */
  motion = 1;
  /** The body's velocity over the ground, m/s: what the keys ask for, eased (quicken). */
  private readonly vel = new THREE.Vector2();
  private turning = 0;
  private climbed = false;
  /** The top of the jump or fall under way, to know how hard the landing is. */
  private apex = 0;
  /** The feet's height as the eyes feel it: a moment behind a riser. */
  private feltY = 0;
  /** Degrees the lens opens at a run. */
  private kick = 0;
  /** How far over the shoulder the camera has pulled back, 0 (the eyes) to 1. */
  private viewK = 0;
  private readonly boom = new THREE.Vector3();
  private readonly canvas: HTMLCanvasElement;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly host: WalkHost;
  private readonly held = new Set<string>();
  private readonly stickAt = new THREE.Vector2();
  private drag: { id: number; x: number; y: number } | null = null;
  private wasLocked = false;
  /** The lens the camera had before anyone walked: what it eases back to. */
  private readonly rest: number;
  private moved = true;
  private readonly euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly eyes = new THREE.Vector3();
  private readonly gaze = new THREE.Vector3();
  /** What is straight ahead of the eyes within arm's reach (REACH), as of the last frame. */
  aimed: Hit | null = null;
  /**
   * Something on the page has taken the controls (a menu is open): the figure stands still, the
   * mouse goes to `mouse` and not to the head, and Escape goes to `cancel` and does not stop the walk.
   */
  private modal: { mouse(dx: number, dy: number): void; cancel(): void } | null = null;
  /** Leaning in to look through a window: where the eyes go, and how far there they are (0 to 1). */
  private peekAt: THREE.Vector3 | null = null;
  private peekK = 0;
  /** The last place leaned to: where the eyes come back from. */
  private peekTo: THREE.Vector3 | null = null;
  private holdTimer = 0;

  constructor(canvas: HTMLCanvasElement, camera: THREE.PerspectiveCamera, host: WalkHost) {
    this.canvas = canvas;
    this.camera = camera;
    this.host = host;
    this.rest = camera.fov;
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      const key = e.key.toLowerCase();
      const typing = (e.target as HTMLElement).matches?.('input, textarea, select, [contenteditable]');
      if (e.metaKey || e.ctrlKey || e.altKey || typing) return;
      if (key === 'escape') return this.modal ? this.modal.cancel() : this.host.leave();
      if (this.modal) return; // the keys are the menu's
      if (key === 'e' && !e.repeat) return this.host.act();
      if (key === 'c' && !e.repeat) return this.setThird(!this.third);
      if (!WALK_KEYS.has(key)) return;
      e.preventDefault();
      if (key === ' ' && !e.repeat) this.jump();
      this.held.add(key);
    });
    window.addEventListener('keyup', (e) => this.held.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.held.clear());
    // captured, the mouse turns the head
    document.addEventListener('mousemove', (e) => {
      if (!this.active || document.pointerLockElement !== canvas) return;
      if (this.modal) this.modal.mouse(e.movementX, e.movementY);
      else this.look(e.movementX * LOOK, -e.movementY * LOOK);
    });
    // Escape lets a captured pointer go before any key event is sent, so letting go is how
    // Escape is heard. Losing the window (another app) lets go too: that is not leaving.
    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === canvas;
      if (!this.active || locked === this.wasLocked) return;
      this.wasLocked = locked;
      this.host.locked(locked);
      if (!locked && document.hasFocus()) this.modal ? this.modal.cancel() : this.host.leave();
    });
    document.addEventListener('pointerlockerror', () => this.host.locked(false));
    // not captured: a drag looks round, and a click asks for the pointer again
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.active || document.pointerLockElement === canvas) return;
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      canvas.setPointerCapture?.(e.pointerId);
      // a finger that rests where it came down is asking to act on what is ahead
      const from = { x: e.clientX, y: e.clientY };
      clearTimeout(this.holdTimer);
      if (e.pointerType !== 'mouse')
        this.holdTimer = window.setTimeout(() => {
          if (
            this.active &&
            !this.modal &&
            this.drag?.id === e.pointerId &&
            Math.hypot(this.drag.x - from.x, this.drag.y - from.y) < HOLD_SLACK
          )
            this.host.act();
        }, HOLD_MS);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.active || this.drag?.id !== e.pointerId || this.modal) return;
      // the view follows the finger: drag right to look right
      this.look((e.clientX - this.drag.x) * LOOK * 1.6, -(e.clientY - this.drag.y) * LOOK * 1.6);
      this.drag.x = e.clientX;
      this.drag.y = e.clientY;
    });
    const release = (e: PointerEvent) => {
      if (this.drag?.id !== e.pointerId) return;
      this.drag = null;
      clearTimeout(this.holdTimer);
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('click', () => {
      if (this.active) this.capture();
    });
  }

  /** Ask for the mouse. Only a mouse: a finger looks by dragging. Must be called from a click or a key. */
  private capture(): void {
    if (document.pointerLockElement === this.canvas || !matchMedia('(pointer: fine)').matches) return;
    try {
      void Promise.resolve(this.canvas.requestPointerLock()).catch(() => this.host.locked(false));
    } catch {
      this.host.locked(false);
    }
  }

  /**
   * Start walking from a point on the ground, looking toward `toward`. `eye` is how far the
   * eyes are above the feet, `height` the top of the head and `radius` half the body's width,
   * all from the figure being walked.
   */
  start(at: THREE.Vector3, toward: THREE.Vector3, eye: number, height: number, radius = RADIUS): void {
    this.active = true;
    this.eye = eye;
    this.held.clear();
    this.stickAt.set(0, 0);
    this.drag = null;
    this.solids.set(this.host.solids());
    this.body.height = height;
    this.body.radius = radius;
    this.body.ground = this.host.ground();
    this.body.place(at.x, at.y, at.z);
    this.yaw = this.heading = Math.atan2(-(toward.x - at.x), -(toward.z - at.z));
    this.pitch = 0;
    this.viewK = 0; // the camera starts at the eyes and pulls back from there
    this.outside = false;
    this.stepped = this.pace = 0;
    this.vel.set(0, 0);
    this.turning = 0;
    this.apex = this.feltY = this.body.position.y;
    this.moved = true;
    this.wasLocked = document.pointerLockElement === this.canvas; // already captured when one figure is left for another
    this.modal = null;
    this.peekAt = null;
    this.peekK = 0;
    this.aimed = null;
    this.capture();
    this.update(0);
  }

  /** Hand the controls to something on the page (a menu) until `release`: see `modal`. */
  hold(mouse: (dx: number, dy: number) => void, cancel: () => void): void {
    this.modal = { mouse, cancel };
    this.held.clear();
    this.stickAt.set(0, 0);
  }

  release(): void {
    this.modal = null;
  }

  /**
   * Lean in to a window: the eyes go to `at` (a point just outside the pane) and look along
   * `toward`, and from there the head turns freely. The feet stay where they are; taking a step
   * ends it and the eyes come back.
   */
  peek(at: THREE.Vector3, toward: THREE.Vector3): void {
    this.peekAt = this.peekTo = at.clone();
    this.yaw = Math.atan2(-toward.x, -toward.z);
    this.pitch = Math.asin(THREE.MathUtils.clamp(toward.y / (toward.length() || 1), -1, 1));
    this.moved = true;
  }

  get peeking(): boolean {
    return this.peekAt !== null;
  }

  /**
   * Stop: the pointer is let go. Where the camera is left is the caller's business, and so is
   * calling `lens` each frame afterwards, which eases the camera's lens back to what it was.
   */
  stop(): void {
    if (!this.active) return;
    this.active = false;
    this.held.clear();
    this.drag = null;
    this.modal = null;
    this.peekAt = null;
    this.peekK = 0;
    this.aimed = null;
    clearTimeout(this.holdTimer);
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }

  /**
   * Ease the camera's lens toward the walker's wide one while walking, and back to the one it
   * had otherwise, over about half a second either way. True while it is still changing.
   */
  lens(dt: number): boolean {
    const camera = this.camera;
    const wide = camera.aspect < 1 ? FOV_UPRIGHT : FOV;
    const goal = this.active ? wide + this.kick : this.rest;
    if (camera.fov === goal) return false;
    const most = (Math.abs(wide - this.rest) / LENS_SECONDS) * dt;
    camera.fov = Math.abs(goal - camera.fov) <= most ? goal : camera.fov + Math.sign(goal - camera.fov) * most;
    camera.updateProjectionMatrix();
    return true;
  }

  /** Turn the head: radians to the right, and up. */
  look(right: number, up: number): void {
    this.yaw -= right;
    this.pitch = THREE.MathUtils.clamp(this.pitch + up, -1.45, 1.45);
    this.moved = true;
  }

  /** See through the eyes, or over the shoulder (C, or the page's button). */
  setThird(third: boolean): void {
    if (third === this.third) return;
    this.third = third;
    this.moved = true;
    this.host.viewed(third);
  }

  /** Hop (Space, or the page's button). */
  jump(): void {
    if (this.active && !this.modal) this.body.jump();
  }

  /** An on-screen stick: x to the right, y forward, each -1 to 1. (0, 0) lets go. */
  stick(x: number, y: number): void {
    this.stickAt.set(x, y);
    if (this.stickAt.length() > 1) this.stickAt.normalize();
  }

  /** One frame. Moves the body and the camera; true if the picture has changed. */
  update(dt: number): boolean {
    if (!this.active) return false;
    const has = (...keys: string[]) => keys.some((k) => this.held.has(k));
    this.solids.set(this.host.solids()); // a level of detail may have changed since the last frame
    // the arrows turn the head as a neck does, not as a switch: up to speed and down again in a tenth of a second
    const turn = this.modal ? 0 : Number(has('arrowright')) - Number(has('arrowleft'));
    this.turning += (turn * TURN - this.turning) * (1 - Math.exp(-dt / 0.06));
    if (!turn && Math.abs(this.turning) < 0.01) this.turning = 0;
    if (this.turning) this.look(this.turning * dt, 0);
    // keys give a direction at walking or running pace; the stick gives both at once
    let forward = Number(has('w', 'arrowup')) - Number(has('s', 'arrowdown'));
    let right = Number(has('d')) - Number(has('a'));
    let speed = has('shift') ? RUN_SPEED : WALK_SPEED;
    if (!forward && !right && this.stickAt.lengthSq() > 0.01) {
      forward = this.stickAt.y;
      right = this.stickAt.x;
      speed = stickSpeed(this.stickAt.length());
    }
    if (this.modal) forward = right = 0;
    // on a ladder forward is up and back is down; a step to the side lets go of it
    const body = this.body;
    body.climbing = forward;
    body.lookingDown = this.pitch < -0.6;
    if (body.on && right) body.letGo();
    if (body.on) {
      forward = right = 0;
      this.vel.set(0, 0);
    }
    const length = Math.hypot(forward, right);
    if (length || !this.body.grounded) this.peekAt = null; // a step, or a hop, and the eyes come back from the window
    const pace = length ? speed / length : 0;
    const sin = Math.sin(this.yaw),
      cos = Math.cos(this.yaw);
    const p = this.body.position;
    const was = this.eyes.copy(p);
    const flying = !this.body.grounded;
    // forward is (-sin, -cos) over the ground, right is (cos, -sin); the body gathers and loses its speed (quicken)
    const wantX = (-sin * forward + cos * right) * pace;
    const wantZ = (-cos * forward - sin * right) * pace;
    this.vel.fromArray(quicken(this.vel.x, this.vel.y, wantX, wantZ, dt));
    this.body.move(this.vel.x * dt, this.vel.y * dt, dt);
    // a landing is felt in the knees, by how far it fell
    this.apex = this.body.grounded && !flying ? p.y : Math.max(this.apex, p.y);
    if (flying && this.body.grounded && !this.climbed) this.gait.land(this.apex - p.y);
    // (stepping off a ladder is not a landing)
    this.climbed = Boolean(body.on);
    if (body.on) this.apex = p.y;
    // there is nothing out past the edge of the site
    const reach = this.host.reach();
    const out = Math.hypot(p.x, p.z);
    if (out > reach) {
      p.x *= reach / out;
      p.z *= reach / out;
    }
    if (was.distanceToSquared(p) > 1e-10) this.moved = true;
    this.stepped = Math.hypot(p.x - was.x, p.z - was.z);
    this.pace = dt > 0 ? this.stepped / dt : 0;
    this.gait.breathing = this.motion > 0;
    const rungs = body.on ? Math.abs(p.y - was.y) : null;
    this.stir =
      dt > 0
        ? this.gait.advance(rungs ?? this.stepped, rungs === null ? this.pace : 0, !this.body.grounded && !body.on, dt, rungs !== null)
        : 0;
    if (this.stir) this.moved = true;
    // through its eyes the body faces where they look; seen from behind it turns to face the way it is sent
    if (body.on)
      this.heading = Math.atan2(body.on.nx, body.on.nz); // facing the rungs
    else if (!this.third) this.heading = this.yaw;
    else if (length) {
      const to = Math.atan2(sin * forward - cos * right, cos * forward + sin * right);
      const off = Math.atan2(Math.sin(to - this.heading), Math.cos(to - this.heading));
      if (off) {
        this.heading += Math.abs(off) <= FACE * dt ? off : Math.sign(off) * FACE * dt;
        this.moved = true;
      }
    }

    const camera = this.camera;
    // The eyes are carried by the body: they rise and fall and sway with the stride, tip toward
    // the planted foot, drop with the knees on a landing, and come up a riser a moment after the
    // feet. All of it is scaled by `motion`, and fades out as the camera pulls back over the
    // shoulder, where it is the figure that is seen to do these things.
    const felt = this.motion * (1 - this.viewK);
    const lagging = this.body.grounded && this.motion > 0;
    // (long enough to turn a flight of stairs' risers into a slope under the eyes)
    this.feltY = lagging
      ? THREE.MathUtils.clamp(this.feltY + (p.y - this.feltY) * (1 - Math.exp(-dt / 0.11)), p.y - 0.25, p.y + 0.25)
      : p.y;
    if (Math.abs(this.feltY - p.y) < 1e-4) this.feltY = p.y;
    else this.moved = true;
    const seen = view(this.gait.moment);
    // and it leans: a degree or two into a sidestep, and forward into getting going
    const sideways = (this.vel.x * cos - this.vel.y * sin) / WALK_SPEED;
    const urge = ((wantX - this.vel.x) * -sin + (wantZ - this.vel.y) * -cos) / WALK_SPEED;
    const roll = (seen.roll - 0.022 * THREE.MathUtils.clamp(sideways, -1.5, 1.5)) * felt;
    const nod = (seen.pitch - 0.014 * THREE.MathUtils.clamp(urge, -1, 1)) * felt;
    camera.position.set(
      p.x + cos * seen.x * felt,
      p.y + (this.feltY - p.y) * (1 - this.viewK) + this.eye + seen.y * felt,
      p.z - sin * seen.x * felt,
    );
    // the lens opens a little at a run
    const run = THREE.MathUtils.smoothstep(this.pace, WALK_SPEED + 0.4, RUN_SPEED - 0.2) * 2.5 * this.motion;
    this.kick += (run - this.kick) * (1 - Math.exp(-dt / 0.25));
    if (Math.abs(this.kick - run) < 0.01) this.kick = run;
    // leaning in to a window, or coming back from one: the eyes glide between the head and the pane
    const k = this.peekK;
    this.peekK = THREE.MathUtils.clamp(k + (this.peekAt ? dt : -dt) / PEEK_SECONDS, 0, 1);
    if (this.peekK !== k) this.moved = true;
    camera.quaternion.setFromEuler(this.euler.set(this.pitch + nod, this.yaw, roll));
    const gaze = camera.getWorldDirection(this.gaze);
    // what the body could touch was gathered for its move; what the eyes, the hand and the camera can reach is gathered now
    const far = REACH + BOOM + 0.5;
    this.solids.gather(camera.position, far, far);
    // Over the shoulder: back along the line of sight, to the right and up a little. If there is
    // a wall between the head and there, the camera comes in to just short of it.
    const pulled = this.viewK;
    this.viewK = THREE.MathUtils.clamp(pulled + (this.third ? dt : -dt) / VIEW_SECONDS, 0, 1);
    if (this.viewK !== pulled) this.moved = true;
    let back = 0;
    if (this.viewK > 0) {
      const ease = this.viewK * this.viewK * (3 - 2 * this.viewK);
      const boom = this.boom.set(cos * SHOULDER, OVER, -sin * SHOULDER).addScaledVector(gaze, -BOOM);
      const length = boom.length();
      const wall = this.solids.cast(camera.position, boom.divideScalar(length), length + BOOM_CLEAR);
      const reach = Math.max(0, Math.min(length, (wall?.distance ?? Infinity) - BOOM_CLEAR)) * ease;
      camera.position.addScaledVector(boom, reach);
      back = (reach / length) * BOOM;
      this.outside = reach > BOOM_LEAST;
    } else this.outside = false;
    if (this.peekK > 0 && this.peekTo) {
      camera.position.lerp(this.peekTo, this.peekK * this.peekK * (3 - 2 * this.peekK));
      back *= 1 - this.peekK;
    }
    // what is straight ahead, within arm's reach of the figure: from behind it, the ray starts level with its head
    this.aimed = this.solids.cast(this.eyes.copy(camera.position).addScaledVector(gaze, back), gaze, REACH);
    if (this.lens(dt)) this.moved = true;
    const fov = camera.aspect < 1 ? FOV_UPRIGHT : FOV;
    // The near plane goes out as far as the nearest thing allows, as it does for the orbiting
    // camera and for the same reason (depth resolution across the site), but never past the
    // corner of the frame reaching that thing: indoors it comes in to a few centimetres.
    const corner = Math.hypot(1, Math.tan(THREE.MathUtils.degToRad(fov / 2)) * Math.hypot(1, camera.aspect));
    let clear = this.solids.nearest(camera.position, 0.6);
    if (this.body.ground !== null) clear = Math.min(clear, camera.position.y - this.body.ground);
    const near = THREE.MathUtils.clamp((0.85 * clear) / corner, 0.05, 0.3);
    if (Math.abs(near - camera.near) > near * 0.05) {
      camera.near = near;
      camera.updateProjectionMatrix();
    }
    const changed = this.moved;
    this.moved = false;
    return changed;
  }
}

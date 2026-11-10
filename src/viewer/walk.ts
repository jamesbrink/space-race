import * as THREE from 'three';
import { type ExtendedTriangle, MeshBVH } from 'three-mesh-bvh';

/**
 * Walking the site on foot, in first person: you are the pilot, at his eye height, and the world
 * is solid. Three layers, each usable without the next:
 *
 *   settle   where the feet go vertically: stand, step up a riser, step down, fall, land (pure)
 *   Solids   the meshes that can be stood on and bumped into, as they are posed now
 *   Body     a standing figure moved through them: walls stop it, floors carry it
 *   Walker   keys, mouse and touch on a canvas, driving a Body and placing the camera at its eyes
 *
 * There is no third person: the pilot's model is a posed figure with no skeleton, and a statue
 * sliding over the concrete is worse than no figure at all.
 */

/** Metres per second: an unhurried walk, and a run. */
export const WALK_SPEED = 1.4;
export const RUN_SPEED = 4;
/** The tallest riser taken in stride, and the furthest drop that is a step down and not a fall. Metres. */
export const STEP = 0.3;
/** How fast the feet follow a floor that has stepped up or down under them, m/s: a stair is climbed, not teleported. */
export const STEP_RATE = 3;
export const GRAVITY = 9.81;
/** Half the width of a man in a pressure suit, near enough: shoulder breadth is 0.51 m (mark-iv-suit.md). */
export const RADIUS = 0.26;
/**
 * Where the eyes are in a standing figure, as a fraction of its whole height, for a figure whose
 * model has no eyes to measure: 0.936 of stature (the usual anthropometric ratio; estimated),
 * which for the suited pilot (1.803 m, a 2.8 cm heel, 1.891 m to the top of the helmet) is 0.907.
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
 */
export function settle(from: Footing, floor: number | null, dt: number): Footing {
  if (floor === null) return { y: from.y, vy: 0, grounded: from.grounded };
  let { y, vy } = from;
  if (from.grounded) {
    // a riser or a step down: follow it. Further down than a step, the ground has gone.
    if (y - floor <= STEP + 1e-6) {
      const most = STEP_RATE * dt;
      return { y: y + Math.max(-most, Math.min(most, floor - y)), vy: 0, grounded: true };
    }
    vy = 0;
  }
  vy -= GRAVITY * dt;
  y += vy * dt;
  return y <= floor ? { y: floor, vy: 0, grounded: true } : { y, vy, grounded: false };
}

/** How fast a stick pushed this far (0 to 1) walks: a walk over most of its travel, a run at the rim. */
export function stickSpeed(deflection: number): number {
  const m = Math.max(0, Math.min(1, deflection));
  return m < 0.75 ? (WALK_SPEED * m) / 0.75 : WALK_SPEED + ((RUN_SPEED - WALK_SPEED) * (m - 0.75)) / 0.25;
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

  /** Choose the meshes within `reach` metres of a point: the only ones the questions that follow are put to. */
  gather(centre: THREE.Vector3, reach: number, below: number): void {
    this.near.length = 0;
    this.region.min.set(centre.x - reach, centre.y - below, centre.z - reach);
    this.region.max.set(centre.x + reach, centre.y + reach, centre.z + reach);
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
        this.near.push(record);
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
  /** Standing height, metres: the top of the helmet. */
  height = 1.89;
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
    this.vy = 0;
    this.grounded = true;
    this.solids.gather(this.position, 2, 4);
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
      const h = this.solids.below(p.x + dx * RADIUS, p.y + riser, p.z + dz * RADIUS, this.ground);
      if (h !== null) this.heights.push(h);
    }
    return pickFloor(this.heights, p.y, riser);
  }

  /**
   * Move by (dx, dz) metres over the ground during `dt` seconds, and let gravity have its tick.
   * In short strides, so that nothing thinner than the figure can be stepped through.
   */
  move(dx: number, dz: number, dt: number): void {
    const distance = Math.hypot(dx, dz);
    const strides = Math.max(1, Math.ceil(distance / (RADIUS * 0.4)));
    const p = this.position;
    this.solids.gather(p, distance + RADIUS + 1, STEP + 2 + Math.abs(this.vy) * dt);
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
        depth = this.solids.push(p, riser, this.height, RADIUS, this.heading);
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
      const footing = settle({ y: p.y, vy: this.vy, grounded: this.grounded }, floor, dt / strides);
      p.y = footing.y;
      this.vy = footing.vy;
      this.grounded = footing.grounded;
      if (this.grounded && depth < 1e-4) this.good.copy(p);
    }
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
  /** The pointer was captured or let go: the page says how to look round accordingly. */
  locked(on: boolean): void;
}

const WALK_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift']);
/** Radians of turn per pixel of mouse or finger. */
const LOOK = 0.0023;
/** Radians per second the left and right arrows turn the view. */
const TURN = 1.9;
/** The first-person lens, vertical degrees: wide enough to see where the feet are going. */
const FOV = 62;
const FOV_UPRIGHT = 80;

/**
 * First-person walking: input on a canvas, a Body in the stage's solids, the camera at its eyes.
 * The mouse is captured for looking round where the browser allows it; otherwise (a phone, or a
 * refusal) a drag looks round, and `stick` takes an on-screen stick's position.
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
  private readonly canvas: HTMLCanvasElement;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly host: WalkHost;
  private readonly held = new Set<string>();
  private readonly stickAt = new THREE.Vector2();
  private drag: { id: number; x: number; y: number } | null = null;
  private wasLocked = false;
  private fovBefore = 35;
  private moved = true;
  private readonly euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly eyes = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement, camera: THREE.PerspectiveCamera, host: WalkHost) {
    this.canvas = canvas;
    this.camera = camera;
    this.host = host;
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      const key = e.key.toLowerCase();
      const typing = (e.target as HTMLElement).matches?.('input, textarea, select, [contenteditable]');
      if (e.metaKey || e.ctrlKey || e.altKey || typing) return;
      if (key === 'escape') return this.host.leave();
      if (!WALK_KEYS.has(key)) return;
      e.preventDefault();
      this.held.add(key);
    });
    window.addEventListener('keyup', (e) => this.held.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.held.clear());
    // captured, the mouse turns the head
    document.addEventListener('mousemove', (e) => {
      if (this.active && document.pointerLockElement === canvas) this.look(e.movementX * LOOK, -e.movementY * LOOK);
    });
    // Escape lets a captured pointer go before any key event is sent, so letting go is how
    // Escape is heard. Losing the window (another app) lets go too: that is not leaving.
    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === canvas;
      if (!this.active || locked === this.wasLocked) return;
      this.wasLocked = locked;
      this.host.locked(locked);
      if (!locked && document.hasFocus()) this.host.leave();
    });
    document.addEventListener('pointerlockerror', () => this.host.locked(false));
    // not captured: a drag looks round, and a click asks for the pointer again
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.active || document.pointerLockElement === canvas) return;
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      canvas.setPointerCapture?.(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.active || this.drag?.id !== e.pointerId) return;
      // the view follows the finger: drag right to look right
      this.look((e.clientX - this.drag.x) * LOOK * 1.6, -(e.clientY - this.drag.y) * LOOK * 1.6);
      this.drag.x = e.clientX;
      this.drag.y = e.clientY;
    });
    const release = (e: PointerEvent) => {
      if (this.drag?.id === e.pointerId) this.drag = null;
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
   * eyes are above the feet and `height` the top of the head, both from the figure being walked.
   */
  start(at: THREE.Vector3, toward: THREE.Vector3, eye: number, height: number): void {
    this.active = true;
    this.eye = eye;
    this.held.clear();
    this.stickAt.set(0, 0);
    this.drag = null;
    this.solids.set(this.host.solids());
    this.body.height = height;
    this.body.ground = this.host.ground();
    this.body.place(at.x, at.y, at.z);
    this.yaw = Math.atan2(-(toward.x - at.x), -(toward.z - at.z));
    this.pitch = 0;
    this.fovBefore = this.camera.fov;
    this.moved = true;
    this.wasLocked = false;
    this.capture();
    this.update(0);
  }

  /** Stop: the camera's lens is put back and the pointer let go. Where the camera is left is the caller's business. */
  stop(): void {
    if (!this.active) return;
    this.active = false;
    this.held.clear();
    this.drag = null;
    this.camera.fov = this.fovBefore;
    this.camera.updateProjectionMatrix();
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }

  /** Turn the head: radians to the right, and up. */
  look(right: number, up: number): void {
    this.yaw -= right;
    this.pitch = THREE.MathUtils.clamp(this.pitch + up, -1.45, 1.45);
    this.moved = true;
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
    const turn = Number(has('arrowright')) - Number(has('arrowleft'));
    if (turn) this.look(turn * TURN * dt, 0);
    // keys give a direction at walking or running pace; the stick gives both at once
    let forward = Number(has('w', 'arrowup')) - Number(has('s', 'arrowdown'));
    let right = Number(has('d')) - Number(has('a'));
    let speed = has('shift') ? RUN_SPEED : WALK_SPEED;
    if (!forward && !right && this.stickAt.lengthSq() > 0.01) {
      forward = this.stickAt.y;
      right = this.stickAt.x;
      speed = stickSpeed(this.stickAt.length());
    }
    const length = Math.hypot(forward, right);
    const stride = length ? (speed * dt) / length : 0;
    const sin = Math.sin(this.yaw),
      cos = Math.cos(this.yaw);
    const p = this.body.position;
    const was = this.eyes.copy(p);
    // forward is (-sin, -cos) over the ground, right is (cos, -sin)
    this.body.move((-sin * forward + cos * right) * stride, (-cos * forward - sin * right) * stride, dt);
    // there is nothing out past the edge of the site
    const reach = this.host.reach();
    const out = Math.hypot(p.x, p.z);
    if (out > reach) {
      p.x *= reach / out;
      p.z *= reach / out;
    }
    if (was.distanceToSquared(p) > 1e-10) this.moved = true;

    const camera = this.camera;
    camera.position.set(p.x, p.y + this.eye, p.z);
    camera.quaternion.setFromEuler(this.euler.set(this.pitch, this.yaw, 0));
    const fov = camera.aspect < 1 ? FOV_UPRIGHT : FOV;
    // The near plane goes out as far as the nearest thing allows, as it does for the orbiting
    // camera and for the same reason (depth resolution across the pad), but never past the
    // corner of the frame reaching that thing: indoors it comes in to a few centimetres.
    const corner = Math.hypot(1, Math.tan(THREE.MathUtils.degToRad(fov / 2)) * Math.hypot(1, camera.aspect));
    let clear = this.solids.nearest(camera.position, 0.6);
    if (this.body.ground !== null) clear = Math.min(clear, camera.position.y - this.body.ground);
    const near = THREE.MathUtils.clamp((0.85 * clear) / corner, 0.05, 0.3);
    if (camera.fov !== fov || Math.abs(near - camera.near) > near * 0.05) {
      camera.fov = fov;
      camera.near = near;
      camera.updateProjectionMatrix();
    }
    const changed = this.moved;
    this.moved = false;
    return changed;
  }
}

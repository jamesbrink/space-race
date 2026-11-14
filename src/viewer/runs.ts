import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import type { Runs } from '../types';

/**
 * A thing that slides or drives stands on what it runs on (types.ts: Runs), at every instant of its move: each wheel
 * on the rail or the ground under its tread, the body pitched and rolled between them. The surface is the model's own
 * (the rails' meshes, a road's, the land's height), asked straight down at each wheel; nothing is baked, so a move
 * played to any instant, by the slider, the clock or a hand, stands where that instant puts it.
 *
 * How. The move is played as it always was (level, at the height it was built at); then each wheel's treads (a wheel
 * set's two, a single wheel's one) are asked, point by point across their breadth, what is under them, and each point
 * of the wheel's rim there is its own radius under its axle (read off the wheel's own triangles). A tread bears where
 * its rim must rise most to be on what is under it, against what the move names where that is the highest thing under
 * it (a rail's head: the land in the flangeway beside it is not what it runs on), against the highest of that and the
 * land otherwise (`bearing`). The body is turned and lifted as one onto the plane its bearings rest on (`restOn`:
 * height, pitch and roll, on the high points), about their middle; then each wheel takes up what is left on its own
 * (its springs), so every tread is on what is under it and none is in it. A thing with no wheels (a hut on skids, a
 * cart) stands so on its own lowest vertices, lifted so none is in what is under it.
 *
 * Every level of detail does this for itself from the same surface (level 0's meshes and the land), from the same
 * wheel nodes and its own wheels' shape, so the levels agree to within what their wheels differ by.
 */

/** Where the surface is asked for: the flight's models as they stand (level 0 of each, the place among them) and the land. */
export class Surfaces {
  private roots: THREE.Object3D[] = [];
  private readonly ground: (x: number, z: number) => number | null;
  /** The meshes each list of names comes to (`Runs.on`), with their boxes and inverses, found once a set of roots. */
  private readonly found = new Map<string, { mesh: THREE.Mesh; box: THREE.Box3; inverse: THREE.Matrix4 }[]>();
  private readonly trees = new WeakMap<THREE.BufferGeometry, MeshBVH>();
  private readonly ray = new THREE.Ray();
  private readonly point = new THREE.Vector3();
  /** What has been asked lately, and the answer. */
  private readonly answers = new Map<string, number | null>();
  /** Changes whenever the roots do: what a move stood on before may not be what it stands on now. */
  version = 0;

  constructor(ground: (x: number, z: number) => number | null) {
    this.ground = ground;
  }

  /** What is there to run on from now on (world matrices up to date). */
  set(roots: THREE.Object3D[]): void {
    this.roots = roots;
    this.found.clear();
    this.answers.clear();
    this.version++;
  }

  private meshes(on: readonly string[]): { mesh: THREE.Mesh; box: THREE.Box3; inverse: THREE.Matrix4 }[] {
    const key = on.join('\n');
    let list = this.found.get(key);
    if (!list) {
      list = [];
      for (const spec of on) {
        const [name, material] = spec.split('/') as [string, string | undefined];
        for (const root of this.roots)
          root.getObjectByName(name)?.traverse((o) => {
            const mesh = o as THREE.Mesh;
            if (!mesh.isMesh || (mesh as THREE.InstancedMesh).isInstancedMesh || !mesh.geometry.getAttribute('position')) return;
            const m = (mesh.userData.real ?? mesh.material) as THREE.Material | THREE.Material[];
            if (material && !(Array.isArray(m) ? m[0] : m)?.name.startsWith(material)) return;
            mesh.updateWorldMatrix(true, false);
            list!.push({ mesh, box: new THREE.Box3().setFromObject(mesh), inverse: mesh.matrixWorld.clone().invert() });
          });
      }
      this.found.set(key, list);
    }
    return list;
  }

  /** The height of the first surface straight down from (x, y, z) among the meshes `on` names; null where there is none. */
  top(on: readonly string[] | undefined, x: number, y: number, z: number): number | null {
    if (!on?.length) return null;
    // (every level of detail asks at the same points: the first answers for all)
    const key = `${on.join(',')}|${Math.round(x * 1e4)}|${Math.round(y * 1e4)}|${Math.round(z * 1e4)}`;
    const known = this.answers.get(key);
    if (known !== undefined) return known;
    if (this.answers.size > ANSWERS) this.answers.clear();
    let best: number | null = null;
    for (const { mesh, box, inverse } of this.meshes(on)) {
      if (x < box.min.x || x > box.max.x || z < box.min.z || z > box.max.z || box.min.y > y || (best !== null && box.max.y <= best))
        continue;
      let tree = this.trees.get(mesh.geometry);
      if (!tree) {
        // (indirect: the hierarchy keeps its own order and leaves the geometry's index as the renderer has it)
        tree = new MeshBVH(mesh.geometry, { indirect: true });
        this.trees.set(mesh.geometry, tree);
      }
      this.ray.origin.set(x, y, z);
      this.ray.direction.set(0, -1, 0);
      this.ray.applyMatrix4(inverse);
      const hit = tree.raycastFirst(this.ray, THREE.DoubleSide);
      if (!hit) continue;
      const h = this.point.copy(hit.point).applyMatrix4(mesh.matrixWorld).y;
      if (h <= y + 1e-6 && (best === null || h > best)) best = h;
    }
    this.answers.set(key, best);
    return best;
  }

  /** The land's height at (x, z) (asked at any height: a road climbs where a move was built level). */
  land(x: number, z: number): number | null {
    const key = `|${Math.round(x * 1e4)}|${Math.round(z * 1e4)}`;
    const known = this.answers.get(key);
    if (known !== undefined) return known;
    const h = this.ground(x, z);
    this.answers.set(key, h);
    return h;
  }
}

/**
 * The plane that best fits heights `d` at points (x, z), least squares: d ≈ a + b (x - x̄) + c (z - z̄), about the
 * middle of the points (x̄, z̄). A slope that the points cannot tell (all on one line: one axle, or one wheel) is
 * held level: a little of each slope is wished away (`level`, m²), which is nothing beside any real spread.
 */
export function fitPlane(
  points: readonly { x: number; z: number; d: number }[],
  level = 1e-3,
): { a: number; b: number; c: number; x: number; z: number } {
  const n = points.length;
  if (!n) return { a: 0, b: 0, c: 0, x: 0, z: 0 };
  let x = 0;
  let z = 0;
  let a = 0;
  for (const p of points) {
    x += p.x / n;
    z += p.z / n;
    a += p.d / n;
  }
  let sxx = level;
  let szz = level;
  let sxz = 0;
  let sxd = 0;
  let szd = 0;
  for (const p of points) {
    const dx = p.x - x;
    const dz = p.z - z;
    sxx += dx * dx;
    szz += dz * dz;
    sxz += dx * dz;
    sxd += dx * (p.d - a);
    szd += dz * (p.d - a);
  }
  const det = sxx * szz - sxz * sxz;
  const b = (sxd * szz - szd * sxz) / det;
  const c = (szd * sxx - sxd * sxz) / det;
  return { a, b, c, x, z };
}

/**
 * Where a tread bears, of its rim's points (each its lowest `low`, and what is under it: `on`, what the move names, and
 * `land`): the point that must rise most to be on what is under it, so that none is in it. Where the highest of what is
 * under the tread is something named (a rail's head), only what is named counts: the land beside it is not what it runs
 * on (a flange over a flangeway the land only paints). Null where nothing is under any of it.
 */
export function bearing(
  at: readonly { x: number; z: number; low: number; on: number | null; land: number | null }[],
): { x: number; y: number; z: number; d: number } | null {
  let high = -Infinity;
  let named = false;
  for (const p of at) {
    const h = Math.max(p.on ?? -Infinity, p.land ?? -Infinity);
    if (h > high) {
      high = h;
      named = p.on !== null && p.on >= h;
    }
  }
  let best: { x: number; y: number; z: number; d: number } | null = null;
  for (const p of at) {
    const h = named ? p.on : p.on === null ? p.land : p.land === null ? p.on : Math.max(p.on, p.land);
    if (h === null) continue;
    if (best === null || h - p.low > best.d) best = { x: p.x, y: p.low, z: p.z, d: h - p.low };
  }
  return best;
}

/**
 * The plane a rigid thing comes to rest on over its contacts (each rising `d` to its surface at x, z): fitted to them,
 * then again to those that stand above it (a thing rests on the high points, not on a hollow under its middle), a few
 * times. `fitPlane`'s answer; what is left over is each contact's own.
 */
export function restOn(points: readonly { x: number; z: number; d: number }[]): ReturnType<typeof fitPlane> {
  let fit = fitPlane(points);
  let using = points;
  for (let i = 0; i < 4; i++) {
    const f = fit;
    const high = using.filter((p) => p.d - (f.a + f.b * (p.x - f.x) + f.c * (p.z - f.z)) > -RESTS);
    if (high.length < 3 || high.length === using.length) break;
    using = high;
    fit = fitPlane(using);
  }
  return fit;
}

/** How far under the plane of a thing's contacts one may be and still be one it rests on, metres. */
const RESTS = 0.002;
/** A thing with no wheels: how near its lowest point a vertex must be to be one it stands on, and the squares its feet are taken in, metres. */
const SOLE = 0.03;
const FOOT = 0.25;

/** How far a wheel of radius `r` turns about its axle (unit, in the same frame) when what carries it moves by `by` over level ground: rolling, not sliding. */
export function rollOf(by: THREE.Vector3, axle: THREE.Vector3, r: number): number {
  // the contact does not slip: the turn is (up x travel) / r, about the axle
  return (axle.x * by.z - axle.z * by.x) / r;
}

/** Where along its axle a wheel's treads are, from the reach of its own geometry along it: one in the middle of a narrow wheel, one at each end of a wheel set. */
export function treadsOf(lo: number, hi: number): number[][] {
  const span = hi - lo;
  // (closer than a rail's head is broad, so every tread finds the head under it and not the foot or the ground beside it)
  const across = (a: number, b: number): number[] => {
    const n = Math.max(1, Math.ceil((b - a) / TREAD_STEP));
    return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
  };
  if (span <= 2 * TREAD) return [across(lo, hi)];
  return [across(hi - TREAD, hi), across(lo, lo + TREAD)];
}
/**
 * How far a wheel's surface stands from its axle at `u` along it: the furthest any of its edges that cross `u` comes from
 * the axle's line (through `axleAt`, along axis `k`; `i` and `j` the two across it). A lathed tread between two rings has
 * vertices only at the rings: an edge between them is on it. 0 where nothing crosses.
 */
export function radiusAt(
  edges: readonly [THREE.Vector3, THREE.Vector3][],
  k: number,
  i: number,
  j: number,
  axleAt: THREE.Vector3,
  u: number,
): number {
  let r = 0;
  for (const [a, b] of edges) {
    const ua = a.getComponent(k);
    const ub = b.getComponent(k);
    if ((ua - u) * (ub - u) > 0 || ua === ub) continue;
    const t = (u - ua) / (ub - ua);
    const x = a.getComponent(i) + (b.getComponent(i) - a.getComponent(i)) * t - axleAt.getComponent(i);
    const y = a.getComponent(j) + (b.getComponent(j) - a.getComponent(j)) * t - axleAt.getComponent(j);
    r = Math.max(r, Math.hypot(x, y));
  }
  return r;
}

/** A tread's breadth, metres: how much of the end of a wheel set's reach along its axle is asked for what is under it. */
const TREAD = 0.3;
/** How far apart across a tread it is asked, metres: well under a rail's head, some 70 mm. */
const TREAD_STEP = 0.015;

const UP = new THREE.Vector3(0, 1, 0);
const AXES = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
const v = new THREE.Vector3();
const w = new THREE.Vector3();
const q = new THREE.Quaternion();
const m4 = new THREE.Matrix4();
const n4 = new THREE.Matrix4();

interface Wheel {
  node: THREE.Object3D;
  /** Where the meshes hang: the node whose world frame the treads are read in (the innermost wheel of a nest of them). */
  hub: THREE.Object3D;
  rest: THREE.Vector3;
  /** Where it hangs this instant before it is lifted: as built, or where a rail wagon's Driver has put it on its rails. */
  base: THREE.Vector3;
  turn: THREE.Quaternion;
  axle: 'x' | 'z';
  /** Its axle in the frame of what carries it as built (for rolling on a slide). */
  across: THREE.Vector3;
  /** Points along its axle (in the hub's frame) where each tread is asked, a list per tread. */
  treads: number[][];
  /** Its own radius at each of those points (its surface's furthest from its axle there, from its own triangles). */
  radii: number[][];
  /** A point on its axle's line, in the hub's frame (the middle of its reach across the axle). */
  axleAt: THREE.Vector3;
}

/**
 * One node that runs on something (a move's `runs`), at one level of detail. `stand` is called once its moves have been
 * played for an instant: it lifts, pitches and rolls it onto what it runs on and sets each wheel on its own.
 */
export class Rider {
  readonly object: THREE.Object3D;
  private readonly runs: Runs;
  private readonly radius: number;
  private readonly wheels: Wheel[] = [];
  /** For a thing with no wheels: the bottom corners of its own box, in its own frame. */
  private readonly feet: THREE.Vector3[] = [];
  /** Whether it rolls its own wheels (a slide's; a drive's are rolled by its Driver). */
  private readonly rolls: boolean;
  /** How far it has slid this instant, in the frame of what carries it: its wheels turn by as much. */
  readonly slid = new THREE.Vector3();
  /** The last instant's answer, kept while nothing that went into it has changed. */
  private kept: { key: number[]; position: THREE.Vector3; quaternion: THREE.Quaternion; lifts: number[] } | null = null;

  // (no parameter properties: the tests load this file with Node's type stripping, which cannot erase them)
  constructor(object: THREE.Object3D, runs: Runs, wheels: { prefixes: string[]; radius: number; axle: 'x' | 'z'; rolls: boolean }) {
    this.object = object;
    this.runs = runs;
    this.radius = wheels.radius;
    this.rolls = wheels.rolls;
    const named = (prefix: string, name: string): boolean =>
      prefix.length > 0 && name.startsWith(prefix) && /^_?\d+$/.test(name.slice(prefix.length));
    object.updateWorldMatrix(true, true);
    object.traverse((o) => {
      if (!wheels.prefixes.some((p) => named(p, o.name))) return;
      // the meshes' own frame: the innermost node of a nest of wheels (a vehicle driven more than once), where they hang
      let hub = o;
      for (;;) {
        const deeper = hub.children.find((c) => !(c as THREE.Mesh).isMesh && c.children.length);
        if (!deeper || hub.children.some((c) => (c as THREE.Mesh).isMesh)) break;
        hub = deeper;
      }
      // its own triangles in the hub's frame: its reach along its axle, its axle's line (the middle of its reach across
      // it), and how far its surface stands from that line at each point where a tread is asked
      const k = wheels.axle === 'x' ? 0 : 2;
      const [i, j] = k === 0 ? [1, 2] : [0, 1];
      const edges: [THREE.Vector3, THREE.Vector3][] = [];
      let lo = Infinity;
      let hi = -Infinity;
      const reach = [Infinity, -Infinity, Infinity, -Infinity];
      const into = new THREE.Matrix4().copy(hub.matrixWorld).invert();
      hub.traverse((c) => {
        const mesh = c as THREE.Mesh;
        const pos = mesh.isMesh ? mesh.geometry.getAttribute('position') : undefined;
        if (!pos) return;
        m4.multiplyMatrices(into, mesh.matrixWorld);
        const p: THREE.Vector3[] = [];
        for (let n = 0; n < pos.count; n++) {
          const at = new THREE.Vector3().fromBufferAttribute(pos, n).applyMatrix4(m4);
          p.push(at);
          lo = Math.min(lo, at.getComponent(k));
          hi = Math.max(hi, at.getComponent(k));
          reach[0] = Math.min(reach[0]!, at.getComponent(i));
          reach[1] = Math.max(reach[1]!, at.getComponent(i));
          reach[2] = Math.min(reach[2]!, at.getComponent(j));
          reach[3] = Math.max(reach[3]!, at.getComponent(j));
        }
        const index = mesh.geometry.getIndex();
        const count = index ? index.count : pos.count;
        const at = (n: number): THREE.Vector3 => p[index ? index.getX(n) : n]!;
        for (let n = 0; n + 2 < count; n += 3) for (let e = 0; e < 3; e++) edges.push([at(n + e), at(n + ((e + 1) % 3))]);
      });
      if (lo > hi) return;
      const axleAt = new THREE.Vector3().setComponent(i, (reach[0]! + reach[1]!) / 2).setComponent(j, (reach[2]! + reach[3]!) / 2);
      const treads = treadsOf(lo, hi);
      const radii = treads.map((tread) => tread.map((u) => radiusAt(edges, k, i, j, axleAt, u) || wheels.radius));
      // its axle in the frame of what carries it: the turns from it up to the moving node, and the node's own
      const across = AXES[wheels.axle].clone();
      for (let p: THREE.Object3D | null = o; p && p !== object.parent; p = p.parent) across.applyQuaternion(p.quaternion);
      this.wheels.push({
        node: o,
        hub,
        rest: o.position.clone(),
        base: o.position.clone(),
        turn: o.quaternion.clone(),
        axle: wheels.axle,
        across,
        treads,
        radii,
        axleAt,
      });
    });
    if (!this.wheels.length) {
      // what it stands on: its lowest vertices (a skid's underside, a cart's wheels), the lowest in each square of FOOT
      const into = new THREE.Matrix4().copy(object.matrixWorld).invert();
      const points: THREE.Vector3[] = [];
      let bottom = Infinity;
      object.traverse((c) => {
        const mesh = c as THREE.Mesh;
        const pos = mesh.isMesh ? mesh.geometry.getAttribute('position') : undefined;
        if (!pos) return;
        m4.multiplyMatrices(into, mesh.matrixWorld);
        for (let n = 0; n < pos.count; n++) {
          const at = new THREE.Vector3().fromBufferAttribute(pos, n).applyMatrix4(m4);
          points.push(at);
          bottom = Math.min(bottom, at.y);
        }
      });
      const cells = new Map<string, THREE.Vector3>();
      for (const at of points) {
        if (at.y > bottom + SOLE) continue;
        const key = `${Math.round(at.x / FOOT)},${Math.round(at.z / FOOT)}`;
        const was = cells.get(key);
        if (!was || at.y < was.y) cells.set(key, at);
      }
      this.feet.push(...cells.values());
    }
  }

  /**
   * Stand it on what it runs on, as its moves have just put it (level, at the height it was built at). `surfaces` null:
   * there is nothing to ask yet, and it stays as played.
   */
  stand(surfaces: Surfaces | null): void {
    // its wheels roll with the distance slid (a drive's Driver rolls its own)
    if (this.rolls)
      for (const wh of this.wheels)
        wh.node.quaternion.copy(wh.turn).multiply(q.setFromAxisAngle(AXES[wh.axle], rollOf(this.slid, wh.across, this.radius)));
    // (a slide's wheels hang as built; a drive's where its Driver has just put them)
    for (const wh of this.wheels) {
      if (this.rolls) wh.node.position.copy(wh.rest);
      wh.base.copy(wh.node.position);
    }
    if (!surfaces) return;
    const o = this.object;
    o.updateWorldMatrix(true, true);
    // the same instant as last time, on the same surface: the same answer, without asking again
    const key = [...o.matrixWorld.elements, surfaces.version];
    const kept = this.kept;
    if (kept && kept.key.length === key.length && kept.key.every((k, i) => k === key[i])) {
      o.position.copy(kept.position);
      o.quaternion.copy(kept.quaternion);
      this.wheels.forEach((wh, i) => this.lift(wh, kept.lifts[i]!));
      return;
    }
    // each contact: where it is, and how far it must rise (or fall) to be on what is under it
    const contacts: { x: number; y: number; z: number; d: number; of: number }[] = [];
    const on = this.runs.on;
    this.wheels.forEach((wh, of) => {
      const frame = wh.hub.matrixWorld;
      const axis = w.copy(AXES[wh.axle]).transformDirection(frame);
      const lean = Math.sqrt(Math.max(0, 1 - axis.y * axis.y));
      wh.treads.forEach((tread, t) => {
        const radii = wh.radii[t]!;
        const rim = 0.8 * Math.max(...radii);
        // each point of its rim across the tread: where it is, its lowest, and what is under it
        const at: { x: number; z: number; low: number; on: number | null; land: number | null }[] = [];
        tread.forEach((u, n) => {
          if (radii[n]! < rim) return; // (the hub and the axle between the wheels bear on nothing)
          v.copy(wh.axleAt)
            .setComponent(wh.axle === 'x' ? 0 : 2, u)
            .applyMatrix4(frame);
          const low = v.y - radii[n]! * lean;
          at.push({ x: v.x, z: v.z, low, on: surfaces.top(on, v.x, low + REACH, v.z), land: null });
        });
        if (this.runs.ground) for (const p of at) p.land = surfaces.land(p.x, p.z);
        const best = bearing(at);
        if (best) contacts.push({ ...(best as { x: number; y: number; z: number; d: number }), of });
      });
    });
    for (const f of this.feet) {
      v.copy(f).applyMatrix4(o.matrixWorld);
      const on1 = surfaces.top(on, v.x, v.y + REACH, v.z);
      const land = this.runs.ground ? surfaces.land(v.x, v.z) : null;
      const h = on1 === null ? land : land === null ? on1 : Math.max(on1, land);
      if (h !== null) contacts.push({ x: v.x, y: v.y, z: v.z, d: h - v.y, of: -1 });
    }
    const lifts = this.wheels.map(() => 0);
    if (contacts.length) {
      const fit = restOn(contacts);
      // what is left once the body is on the plane: each wheel takes up its own (the most of its treads', so neither is
      // in what it runs on); a thing on its feet is lifted by the most of its feet's
      const left = this.wheels.map(() => -Infinity);
      let most = -Infinity;
      let y = 0;
      for (const c of contacts) {
        const over = c.d - (fit.a + fit.b * (c.x - fit.x) + fit.c * (c.z - fit.z));
        if (c.of >= 0) left[c.of] = Math.max(left[c.of]!, over);
        else most = Math.max(most, over);
        y += c.y / contacts.length;
      }
      if (Number.isFinite(most)) fit.a += most;
      left.forEach((l, i) => {
        lifts[i] = Number.isFinite(l) ? l : 0;
      });
      // the body: turned so that its own up is the plane's, about the middle of its contacts, and lifted onto it
      q.setFromUnitVectors(UP, w.set(-fit.b, 1, -fit.c).normalize());
      m4.makeTranslation(fit.x, y + fit.a, fit.z)
        .multiply(n4.makeRotationFromQuaternion(q))
        .multiply(n4.makeTranslation(-fit.x, -y, -fit.z))
        .multiply(o.matrixWorld);
      // back into the frame of what carries it
      if (o.parent) m4.premultiply(n4.copy(o.parent.matrixWorld).invert());
      m4.decompose(o.position, o.quaternion, v);
      o.updateWorldMatrix(false, true);
      this.wheels.forEach((wh, i) => this.lift(wh, lifts[i]!));
    }
    this.kept = { key, position: o.position.clone(), quaternion: o.quaternion.clone(), lifts };
  }

  /** A wheel raised `by` metres up from where it hangs this instant (in the world's up, carried into its own parent's frame). */
  private lift(wh: Wheel, by: number): void {
    wh.node.position.copy(wh.base);
    if (!by) return;
    const parent = wh.node.parent;
    if (!parent) return;
    parent.updateWorldMatrix(true, false);
    const up = w.copy(UP).transformDirection(n4.copy(parent.matrixWorld).invert());
    wh.node.position.addScaledVector(up, by);
  }
}

/** How many answers are kept before they are let go (a few moves' worth of instants). */
const ANSWERS = 20000;
/** How far over a contact the surface is asked from, metres: enough for anything a wheel climbs onto between one instant and the next it is played at. */
const REACH = 2;

import * as THREE from 'three';
import type { Going } from '../../types.ts';
import type { Surfaces } from '../runs.ts';
import { cycleLength, Gait, pose } from './gait.ts';
import { distanceAt, goneAt, lengthOf, PACE, along as pointAlong, QUICKEN, routeOf } from './going.ts';

/**
 * A group's people walking off a site or onto it on the clock (Part `going`, types.ts `Going`), each on his own feet. Each
 * is a node of the model, `<part>_Person_<n>` (crew/ground_party.py `Walkers`: its origin on the ground between his feet,
 * turned only to the way he faces, his joints the crew's under it), and where he is follows the clock and nothing else
 * (going.ts `goneAt`): standing where he was built, walking his way, or out of sight at its end. His limbs are the gait's
 * (gait.ts `pose`) for the distance he has walked, so a foot that is down stays down, and the same instant is the same
 * pose at every level of detail and every time it is drawn. Nothing here knows a flight.
 *
 * - **Not in single file, and not through each other.** The people of a group take the way nearest it first, three
 *   abreast (`ABREAST`, estimated): each takes the way laid that far to its side. Leaving, each sets off when he will come
 *   onto it `Going.stagger` after the one before him (`plan`), so two never come onto it together.
 * - **Turning.** Setting off he turns from the way he stood facing to the way he goes over his first TURN_IN metres,
 *   and coming in, back to it over his last: the feet are the stride's, so they turn with him and are not planted
 *   through the turn (a few centimetres of slide, which is not right).
 * - **On the ground.** He is built standing on what was under him; walking, he is lifted or let down by as much as the
 *   land rises or falls from where he stood (`Surfaces.land`), so a road that climbs is climbed. What else is under
 *   him (a rail he steps over) is not asked.
 * - **Out of sight** he is shrunk to nothing where he is, and a group's meshes are not drawn at all once every one of
 *   them is: so a pad its people have left costs nothing to draw.
 * - **Not in the scene.** Each skeleton's people hang from a holder outside the scene and the meshes read them in three's
 *   detached bind mode (`detach`), so their six thousand joints cost a frame nothing: their matrices are made when a man
 *   moves, and never for one standing.
 * - **Bounds.** A skinned mesh's bounds are three's from its bones as they stood when first asked, and a group that has
 *   walked a hundred metres would be culled where it had been: after each move they are taken again from where its
 *   people are, wide enough for a man (`REACH`).
 */

/** How far apart across the way the people of a group walk it, metres, by turns (estimated: three abreast on a road). */
const ABREAST = [0, -0.75, 0.75];
/** Over how much of the walk he turns from the way he stood facing to the way he goes, and back, metres. */
const TURN_IN = 0.9;
/** How far a man reaches from a point a metre over his feet, metres: what his group's bounds hold round each. */
const REACH = 1.25;
/** A person's node: its group's name, and its number. */
const PERSON = /_Person_(\d+)$/;

/** A way laid `by` metres to its left (positive) or right, each point moved square to the way there (corners mitred). */
export function aside(way: readonly (readonly [number, number])[], by: number): [number, number][] {
  if (!by || way.length < 2) return way.map(([x, z]) => [x, z]);
  const dir = (i: number): [number, number] => {
    const [ax, az] = way[Math.max(0, i)]!;
    const [bx, bz] = way[Math.min(way.length - 1, i + 1)]!;
    const d = Math.hypot(bx - ax, bz - az) || 1;
    return [(bx - ax) / d, (bz - az) / d];
  };
  return way.map(([x, z], i) => {
    // the way's own line before and after this point, averaged: its left is (dz, -dx) in the model's frame (x east, z south)
    const [ax, az] = dir(Math.max(0, i - 1));
    const [bx, bz] = dir(Math.min(i, way.length - 2));
    let nx = az + bz;
    let nz = -(ax + bx);
    const n = Math.hypot(nx, nz) || 1;
    nx /= n;
    nz /= n;
    // (a corner is moved further, so that each leg of the way keeps its distance: the mitre)
    const cos = Math.max(0.5, (ax * bx + az * bz + 1) / 2) ** 0.5;
    return [x + (nx * by) / cos, z + (nz * by) / cos];
  });
}

/** How many strides' cycles a figure has walked `tau` seconds into a walk of `length` metres at `pace`: its speed as going.ts has it, over each moment's stride. */
export function cyclesAt(tau: number, pace: number, length: number, leg: number): number {
  if (tau <= 0 || length <= 0) return 0;
  const top = Math.min(pace, Math.sqrt((length * pace) / QUICKEN));
  const ramp = (QUICKEN * top) / pace;
  const cruise = (length - top * ramp) / top;
  const total = 2 * ramp + cruise;
  const rate = (v: number) => v / cycleLength(v, leg);
  // (over a ramp the speed goes linearly from 0 to `top`: Simpson's rule on eight steps is far finer than a frame)
  const ramped = (t: number): number => {
    const n = 8;
    const h = t / n;
    let sum = 0;
    for (let i = 0; i <= n; i++) sum += (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) * rate((top * i * h) / ramp);
    return (sum * h) / 3;
  };
  const up = ramped(Math.min(tau, ramp));
  if (tau <= ramp) return up;
  const level = rate(top) * Math.min(tau - ramp, cruise);
  if (tau <= ramp + cruise) return up + level;
  return up + level + (up - ramped(Math.max(0, total - tau)));
}

/** The least time between one man coming onto a group's way and the next, s: at a walk, a body's depth and more (estimated). */
const LEAST_GAP = 0.6;
/** How near two men's middles may come, metres: shoulder to shoulder and not into each other (estimated). */
const CLEAR = 0.6;
/** How far along the way past its first point a man's walk to it is looked at for anyone in his road, metres. */
const BEYOND = 3;
/** The step those walks are looked at in, s. */
const STEP = 0.1;
/** How long a man who has walked to another place is looked at standing there, as those after him come in, s. */
const HOLD = 20;

/**
 * One going laid out for a group (`starts`: where each sets off from and the way he faces there): for each, in the same
 * order, the going with its way laid to his own side, how long after its `at` he sets off, and the way he faces at its end.
 * They take the way nearest it first, three abreast in turn (`ABREAST`); leaving, each waits until he can come onto the way
 * `stagger` (at least `LEAST_GAP`) after the one before him, however far he has to walk to it, so no two come onto it
 * together and none walks through another on it. (Set off at fixed intervals, a man from the back of a body, with further
 * to go, reached the way with one from its front and walked the road inside him.)
 */
export function plan(
  going: Going,
  starts: readonly { at: readonly [number, number]; facing: number }[],
): { going: Going; delay: number; ends: number }[] {
  const [wx, wz] = going.way[0] ?? [0, 0];
  // the nearest the way first; going to another place, the one going furthest into it from the way's end first, so that
  // those who come after stop short of those already there and do not walk in among them
  const [lx, lz] = going.way[going.way.length - 1] ?? [wx, wz];
  const key = (i: number): number => {
    const [x, z] = starts[i]!.at;
    return going.to ? -Math.hypot(x + going.to[0] - lx, z + going.to[1] - lz) : Math.hypot(x - wx, z - wz);
  };
  const order = starts.map((_, i) => i).sort((a, b) => key(a) - key(b));
  const pace = going.pace?.value ?? PACE;
  const gap = Math.max(going.stagger, LEAST_GAP);
  // each three that come onto the way one after another take its three lanes in the order they come at it from across
  // it, so that none crosses another's line to it: across is to the way's left (+), as `aside` lays it
  const [nx, nz] = going.way[1] ?? [wx - 1, wz];
  const run = Math.hypot(nx - wx, nz - wz) || 1;
  const across = (i: number) => ((starts[i]!.at[0] - wx) * (nz - wz) - (starts[i]!.at[1] - wz) * (nx - wx)) / run;
  const lanes = [...ABREAST].sort((a, b) => a - b);
  const lane = new Map<number, number>();
  for (let k = 0; k < order.length; k += lanes.length) {
    const three = order.slice(k, k + lanes.length).sort((a, b) => across(a) - across(b));
    three.forEach((i, j) =>
      lane.set(i, lanes[three.length === lanes.length ? j : lanes.indexOf(0) + j - Math.floor((three.length - 1) / 2)]!),
    );
  }
  const out: { going: Going; delay: number; ends: number }[] = new Array(starts.length);
  let arrives = Number.NEGATIVE_INFINITY;
  // (and none sets off before the one before him: one with further to go, off first, walked past him as he stood)
  let set = 0;
  // each one's walk to the way and a little along it, from the moment he sets off (x, z by STEP), and when he set off
  // (one that walks to another place and stands there is in his place for good: `stays`)
  const walks: { delay: number; track: number[]; stays: boolean }[] = [];
  /** How near a walk set off `delay` after the going's `at` comes to any walk already laid out (the first nearer than CLEAR found). */
  const nearest = (track: readonly number[], delay: number): number => {
    let least = Number.POSITIVE_INFINITY;
    for (const other of walks)
      for (let k = 0; k < track.length; k += 2) {
        const j = 2 * Math.round((delay + (k / 2) * STEP - other.delay) / STEP);
        if (j < 0 || (j >= other.track.length && !other.stays)) continue;
        const at = Math.min(j, other.track.length - 2);
        least = Math.min(least, Math.hypot(track[k]! - other.track[at]!, track[k + 1]! - other.track[at + 1]!));
        if (least < CLEAR) return least;
      }
    return least;
  };
  order.forEach((i, k) => {
    const { at: from, facing } = starts[i]!;
    const laid = { ...going, way: aside(going.way, lane.get(i)!) };
    const route = routeOf(laid, from);
    const [ex, ez] = route[route.length - 1]!;
    const [px, pz] = route[route.length - 2] ?? from;
    // where he faces once there: what the going names, or on along the way he came; coming in, as he was built
    const ends =
      laid.kind === 'comes' ? facing : laid.faces ? Math.atan2(-(laid.faces[1] - ez), laid.faces[0] - ex) : Math.atan2(-(ez - pz), ex - px);
    let delay = k * going.stagger;
    if (laid.kind === 'leaves') {
      // (how long he takes to reach the way from standing: its distance at his pace, and half the time he takes to come up to it)
      const [fx, fz] = laid.way[0] ?? from;
      const reach = Math.hypot(fx - from[0], fz - from[1]) / pace + QUICKEN / 2;
      // his walk to the way and a little along it; and if that brings him into another's road, a moment later
      const length = lengthOf(route);
      // (going to another place: the whole of it, and standing there a while after, as later ones come in round him)
      const until = laid.to ? length : Math.min(length, Math.hypot(fx - from[0], fz - from[1]) + BEYOND);
      const track: number[] = [];
      for (let tau = 0; tau < 600; tau += STEP) {
        const { s } = distanceAt(tau, pace, length);
        track.push(...pointAlong(route, s));
        if (s >= until) break;
      }
      if (laid.to) for (let k = 0; k < HOLD / STEP; k++) track.push(track[track.length - 2]!, track[track.length - 1]!);
      // (where no wait clears him, the wait that keeps him furthest off)
      const first = Math.max(set, arrives + gap - reach);
      let [best, room] = [first, nearest(track, first)];
      for (let tries = 1; tries <= 150 && room < CLEAR; tries++) {
        const here = nearest(track, first + tries * STEP);
        if (here > room) [best, room] = [first + tries * STEP, here];
      }
      delay = best;
      walks.push({ delay, track, stays: Boolean(laid.to) });
      set = delay;
      arrives = delay + reach;
    }
    out[i] = { going: laid, delay, ends };
  });
  return out;
}

/** The shortest turn from one heading to another, radians. */
const between = (from: number, to: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
const smooth = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

interface Walker {
  node: THREE.Object3D;
  /** Where it stands as built, in its parent's frame. */
  home: THREE.Vector3;
  turn: THREE.Quaternion;
  /** Its spot (x, z) as built, in the model's frame. */
  from: [number, number];
  /**
   * Its own goings, in order: the group's, each with its way laid to its own side, where it sets off from (its spot as
   * built, or where the going before took it), the way it faces before and after (radians from +X toward -Z), and how
   * long after the going's `at` it sets off (`plan`).
   */
  legs: { going: Going; from: [number, number]; facing: number; ends: number; delay: number }[];
  /** The model's frame from its parent's, and back. */
  toModel: THREE.Matrix4;
  fromModel: THREE.Matrix4;
  /** What it was last put as, so a frame that changes nothing for it does nothing. */
  was: string;
  out: boolean;
}

const at = new THREE.Vector3();
const _m = new THREE.Matrix4();
const world = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/** One level of detail's people of one group, walked on the clock. */
export class Crowd {
  private readonly walkers: Walker[] = [];
  private readonly meshes: THREE.SkinnedMesh[] = [];
  /** Each skeleton taken out of the scene (`detach`): what holds its people, the skeleton's node and one of its meshes. */
  private readonly held: { holder: THREE.Object3D; rig: THREE.Object3D; mesh: THREE.SkinnedMesh; was: THREE.Matrix4 }[] = [];
  private readonly gait = new Gait();
  private readonly root: THREE.Object3D;
  private readonly surfaces: Surfaces | null;

  /** `root`: the model (one level of it); `group`: the part's node; `goings`: the part's `going`. */
  constructor(root: THREE.Object3D, group: THREE.Object3D, goings: readonly Going[], surfaces: Surfaces | null) {
    this.root = root;
    this.surfaces = surfaces;
    const ordered = [...goings].sort((a, b) => a.at.value - b.at.value);
    root.updateWorldMatrix(true, true);
    const fromRoot = root.matrixWorld.clone().invert();
    const people: THREE.Object3D[] = [];
    group.traverse((o) => {
      if (PERSON.test(o.name)) people.push(o);
      if ((o as THREE.SkinnedMesh).isSkinnedMesh) {
        this.meshes.push(o as THREE.SkinnedMesh);
        // (not solid to the walker: it would be solid where it was built, which they leave: onfoot/walk.ts Solids)
        o.userData.walks = true;
      }
    });
    const placed = people.map((node) => {
      const toModel = fromRoot.clone().multiply(node.parent!.matrixWorld);
      const p = at.copy(node.position).applyMatrix4(toModel);
      // (the way it faces: its own +Z, turned into the model's frame)
      const ahead = new THREE.Vector3(0, 0, 1).applyQuaternion(node.quaternion).transformDirection(toModel);
      return { node, toModel, from: [p.x, p.z] as [number, number], facing: Math.atan2(-ahead.z, ahead.x) };
    });
    for (const { node, toModel, from } of placed) {
      // (the rig's rest is taken before anything moves it)
      this.gait.limbsOf(node);
      this.walkers.push({
        node,
        home: node.position.clone(),
        turn: node.quaternion.clone(),
        from,
        legs: [],
        toModel,
        fromModel: toModel.clone().invert(),
        was: '',
        out: false,
      });
    }
    this.detach();
    // each going in turn, for all of them: where each sets off from is where the going before left him
    const starts = placed.map(({ from, facing }) => ({ at: from, facing }));
    for (const g of ordered) {
      plan(g, starts).forEach(({ going, delay, ends }, i) => {
        const start = starts[i]!;
        this.walkers[i]!.legs.push({ going, from: start.at, facing: start.facing, ends, delay });
        if (going.to) starts[i] = { at: [start.at[0] + going.to[0], start.at[1] + going.to[1]], facing: ends };
      });
    }
  }

  /** How many people it walks. */
  get people(): number {
    return this.walkers.length;
  }

  /** Where each is at `t`, s from launch. Returns whether any of them moved. */
  set(t: number): boolean {
    let moved = this.rehold();
    for (const w of this.walkers)
      if (this.put(w, t)) {
        // (his joints' matrices, made here and only when he has moved: they are not in the scene for it to make them)
        w.node.updateMatrixWorld(true);
        moved = true;
      }
    if (moved) this.bound();
    return moved;
  }

  /**
   * Take each skeleton's people out of the scene. A man's twenty joints, a hundred men and three levels of detail, are some
   * six thousand nodes, and three works out every node's matrix every frame (the scene is moved by the eye for each draw:
   * origin.ts), whether anybody has moved or not: with them in the scene the page drew a frame a third slower on foot. So
   * each skeleton's people hang from a holder outside the scene, their matrices made by `set` when one of them moves and
   * never for a man standing, and the group's meshes read them unattached (three's detached bind mode). The holder is put
   * where the meshes' bind takes the joints to be: a mesh draws a vertex at its own matrix, after the bind's inverse, times
   * the joints' (bindMode 'detached'), which is where it is in the scene whatever the eye's offset, for as long as the mesh
   * stands where it stood when the holder was put (`rehold` puts it again if not).
   */
  private detach(): void {
    const rigs = new Map<THREE.Object3D, THREE.SkinnedMesh[]>();
    for (const mesh of this.meshes) if (mesh.parent) rigs.set(mesh.parent, [...(rigs.get(mesh.parent) ?? []), mesh]);
    for (const [rig, meshes] of rigs) {
      const mesh = meshes[0]!;
      // (only where every mesh of it is bound alike and stands alike: one holder serves them all)
      if (!meshes.every((m) => m.bindMatrix.equals(mesh.bindMatrix) && m.matrixWorld.equals(mesh.matrixWorld))) continue;
      const persons = rig.children.filter((o) => PERSON.test(o.name));
      if (!persons.length) continue;
      const holder = new THREE.Object3D();
      holder.name = `${rig.name} (held)`;
      holder.matrixAutoUpdate = false;
      holder.matrixWorldAutoUpdate = false;
      for (const person of persons) holder.add(person);
      for (const m of meshes) {
        m.bindMode = THREE.DetachedBindMode;
        m.bindMatrixInverse.copy(m.bindMatrix).invert();
      }
      const held = { holder, rig, mesh, was: new THREE.Matrix4() };
      this.held.push(held);
      this.hold(held);
    }
  }

  /** Put a holder where its meshes' bind takes the joints to be (the bind, after the mesh's own matrix undone, times the skeleton node's), and its people under it. */
  private hold(h: Crowd['held'][number]): void {
    h.rig.updateWorldMatrix(true, false);
    h.mesh.updateWorldMatrix(true, false);
    h.was.copy(h.mesh.matrixWorld);
    h.holder.matrixWorld.copy(h.mesh.bindMatrix).multiply(_m.copy(h.mesh.matrixWorld).invert()).multiply(h.rig.matrixWorld);
    for (const person of h.holder.children) person.updateMatrixWorld(true);
  }

  /** Whether a model whose people are held has moved since they were put (then they are put again). */
  private rehold(): boolean {
    let moved = false;
    for (const h of this.held) {
      h.mesh.updateWorldMatrix(true, false);
      if (h.mesh.matrixWorld.equals(h.was)) continue;
      this.hold(h);
      moved = true;
    }
    return moved;
  }

  /** The leg a figure is on at `t`: the last it has set off on, or before them all the first. */
  private legOf(w: Walker, t: number): Walker['legs'][number] | null {
    let now = w.legs[0] ?? null;
    for (const leg of w.legs) if (t >= leg.going.at.value + leg.delay) now = leg;
    return now;
  }

  private put(w: Walker, t: number): boolean {
    const leg = this.legOf(w, t);
    if (!leg) return false;
    const { going } = leg;
    const gone = goneAt(going, leg.from, t, leg.delay);
    const walking = gone.heading !== null && !gone.out;
    const there = !walking && gone.walked > 0;
    // (standing, or out of sight, is the same picture at any instant: only a walk changes from frame to frame)
    const key = gone.out ? 'out' : walking ? `${gone.walked}` : `${there}${w.legs.indexOf(leg)}`;
    if (key === w.was) return false;
    w.was = key;
    const { node } = w;
    if (gone.out) {
      node.scale.setScalar(0);
      w.out = true;
      return true;
    }
    w.out = false;
    node.scale.setScalar(1);
    if (!walking && gone.x === w.from[0] && gone.z === w.from[1]) {
      // where he was built, as he was built
      node.position.copy(w.home);
      node.quaternion.copy(w.turn);
      this.gait.place(node, pose({ phase: 0, speed: 0, limbs: this.gait.limbsOf(node) }));
      return true;
    }
    // turned from the way he stood to the way he goes over his first TURN_IN metres, and to the way he will stand over
    // his last (leaving, he sets off from `facing` and ends at `ends`; coming in, the other way about)
    // (coming in he appears out of sight already walking: there is nothing to turn from)
    const length = lengthOf(routeOf(going, leg.from));
    const leaves = going.kind === 'leaves';
    let heading = leaves ? (there ? leg.ends : leg.facing) : leg.facing;
    if (walking) {
      heading = leaves ? leg.facing + between(leg.facing, gone.heading!) * smooth(gone.walked / TURN_IN) : gone.heading!;
      const last = leaves ? leg.ends : leg.facing;
      if (!leaves || going.to) heading += between(heading, last) * (1 - smooth((length - gone.walked) / TURN_IN));
    }
    // on the land as it lies, by as much as it rises or falls from where he stood
    const lift = this.rise(w, gone.x, gone.z);
    at.set(gone.x, 0, gone.z).applyMatrix4(w.fromModel);
    node.position.set(at.x, w.home.y + lift, at.z);
    // (his own +Z is the way he faces: a heading from +X toward -Z is a turn about the up of heading + 90 degrees)
    node.quaternion.setFromAxisAngle(UP, heading + Math.PI / 2);
    const limbs = this.gait.limbsOf(node);
    if (!walking) {
      this.gait.place(node, pose({ phase: 0, speed: 0, limbs }));
      return true;
    }
    const tau = t - going.at.value - leg.delay;
    const phase = cyclesAt(tau, going.pace?.value ?? PACE, length, limbs.thigh + limbs.shin + limbs.ankle);
    this.gait.place(node, pose({ phase, speed: gone.pace, limbs }));
    return true;
  }

  /** How far the land under (x, z) of the model's frame is above the land where the figure was built, metres (0 where it is not known). */
  private rise(w: Walker, x: number, z: number): number {
    if (!this.surfaces) return 0;
    world.set(x, 0, z).applyMatrix4(this.root.matrixWorld);
    const here = this.surfaces.land(world.x, world.z);
    world.set(w.from[0], 0, w.from[1]).applyMatrix4(this.root.matrixWorld);
    const there = this.surfaces.land(world.x, world.z);
    return here === null || there === null ? 0 : here - there;
  }

  /** Take each mesh's bounds again from where its people are; draw none of them when none of its people is in sight. */
  private bound(): void {
    const shown = this.walkers.filter((w) => !w.out);
    for (const mesh of this.meshes) {
      mesh.visible = shown.length > 0;
      if (!shown.length) continue;
      mesh.updateWorldMatrix(true, false);
      // (a held man's matrix is the bind's frame, which the bind's inverse takes into the mesh's; one in the scene, the scene's)
      const toMesh = (mesh.bindMode === THREE.DetachedBindMode ? _m.copy(mesh.bindMatrix) : _m.copy(mesh.matrixWorld)).invert();
      const box = (mesh.boundingBox ??= new THREE.Box3()).makeEmpty();
      for (const w of shown) {
        if (mesh.bindMode !== THREE.DetachedBindMode) w.node.updateWorldMatrix(true, false);
        const p = at.set(0, 1, 0).applyMatrix4(w.node.matrixWorld).applyMatrix4(toMesh);
        box.expandByPoint(p);
      }
      box.expandByScalar(REACH);
      (mesh.boundingSphere ??= new THREE.Sphere()).copy(box.getBoundingSphere(new THREE.Sphere()));
    }
  }
}

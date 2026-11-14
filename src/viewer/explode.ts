import * as THREE from 'three';
import type { Drive, Move, Part } from '../types';
import { Rider, type Surfaces } from './runs.ts';

/**
 * How far along its travel a part is when the explode slider reads `t`.
 *
 * `t`      slider position, 0 (assembled) to 1 (fully apart)
 * `order`  the part's place in the sequence; 0 leaves first
 * `orders` the highest `order` in the flight
 * returns  0 (in place) to 1 (at its full `explode` offset)
 *
 * This is the whole feel of the exploded view. As written the parts leave in sequence,
 * each taking half the slider's travel, eased at both ends: the tower is gone before the
 * retropack starts to move. Alternatives worth trying: everything at once (`return t`),
 * a sharper cascade (a smaller WINDOW), or an overshoot so parts settle like hardware.
 */
export function partProgress(t: number, order: number, orders: number): number {
  const WINDOW = 0.5;
  const start = orders > 0 ? (order / orders) * (1 - WINDOW) : 0;
  const x = Math.min(1, Math.max(0, (t - start) / WINDOW));
  return x * x * (3 - 2 * x);
}

/** Where a driven vehicle's rear axle is, and how it is turned, a distance along its route. */
export interface RoutePoint {
  x: number;
  z: number;
  /** Radians about the vertical, relative to how it stood at the start. */
  heading: number;
  /** Radians per metre: how sharply the route is turning here (positive turns the heading up). */
  curvature: number;
}

/**
 * A route on the ground: a smooth curve from the origin through `points`, measured by distance.
 * The vehicle starts at the origin facing along the first leg (or backing along it).
 */
export class Route {
  readonly length: number;
  /** The way its first leg goes, radians from +z toward +x: what its headings are measured from. */
  readonly start: number;
  private readonly samples: { s: number; x: number; z: number; h: number }[] = [];

  constructor(points: [number, number][]) {
    const curve = new THREE.CatmullRomCurve3(
      [new THREE.Vector3(), ...points.map(([x, z]) => new THREE.Vector3(x, 0, z))],
      false,
      'centripetal',
    );
    const pts = curve.getSpacedPoints(Math.max(32, points.length * 48));
    let s = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)]!;
      const b = pts[Math.min(pts.length - 1, i + 1)]!;
      if (i) s += pts[i]!.distanceTo(pts[i - 1]!);
      this.samples.push({ s, x: pts[i]!.x, z: pts[i]!.z, h: Math.atan2(b.x - a.x, b.z - a.z) });
    }
    // headings as one continuous turn, measured from the first
    const h0 = this.samples[0]!.h;
    this.start = h0;
    let last = 0;
    for (const p of this.samples) {
      let d = p.h - h0;
      while (d - last > Math.PI) d -= 2 * Math.PI;
      while (d - last < -Math.PI) d += 2 * Math.PI;
      p.h = last = d;
    }
    this.length = s;
  }

  /** The point of the route nearest (x, z), looked for within `reach` metres of `near` along it: its distance along it. */
  nearest(x: number, z: number, near: number, reach: number): number {
    let best = near;
    let least = Infinity;
    for (const p of this.samples) {
      if (p.s < near - reach || p.s > near + reach) continue;
      const d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < least) {
        least = d;
        best = p.s;
      }
    }
    // (between that sample and its neighbours: the foot of the perpendicular on the route's own line there)
    const a = this.at(best);
    const h = a.heading + this.start;
    return Math.min(this.length, Math.max(0, best + (x - a.x) * Math.sin(h) + (z - a.z) * Math.cos(h)));
  }

  at(distance: number): RoutePoint {
    const s = Math.min(this.length, Math.max(0, distance));
    const n = this.samples.length;
    let i = Math.min(n - 2, Math.floor((s / this.length) * (n - 1)));
    while (i > 0 && this.samples[i]!.s > s) i--;
    while (i < n - 2 && this.samples[i + 1]!.s < s) i++;
    const a = this.samples[i]!;
    const b = this.samples[i + 1]!;
    const k = b.s > a.s ? (s - a.s) / (b.s - a.s) : 0;
    return {
      x: a.x + (b.x - a.x) * k,
      z: a.z + (b.z - a.z) * k,
      heading: a.h + (b.h - a.h) * k,
      curvature: b.s > a.s ? (b.h - a.h) / (b.s - a.s) : 0,
    };
  }
}

/**
 * How far the front wheels are turned, radians, `distance` along a route by a vehicle `wheelbase`
 * long whose rear axle follows it: they point where the route is going, one wheelbase ahead of
 * the rear axle, less the way the vehicle itself is pointing. (Not the route's curvature where
 * the rear axle is: that is a difference between two samples, and steps as it passes each.) The
 * route's heading is continuous, so this is; and the wheels are straight at both ends of the
 * route, turning in over the first wheelbase and out over the last.
 */
export function steerAlong(route: Route, distance: number, wheelbase: number): number {
  const s = Math.min(route.length, Math.max(0, distance));
  const reach = Math.max(wheelbase, 1e-3);
  const soft = (x: number) => ease(Math.min(1, Math.max(0, x)));
  const turn = route.at(s + reach).heading - route.at(s).heading;
  return Math.atan(turn) * soft(s / reach) * soft((route.length - s) / reach);
}

const UP = new THREE.Vector3(0, 1, 0);

/** A part that leaves under its own power: it follows a route, turns with it, and its wheels roll and steer. */
class Driver {
  private readonly route: Route;
  private readonly pivot: THREE.Vector3;
  private readonly rolling: THREE.Object3D[] = [];
  private readonly steering: THREE.Object3D[] = [];
  private readonly spin: number;
  private readonly axis: 'x' | 'z';
  private readonly object: THREE.Object3D;
  private readonly home: THREE.Vector3;
  private readonly drive: Drive;
  /** Where each wheel was built, in the vehicle's frame (a rail wagon's are put on its rails from there). */
  private readonly rests = new Map<THREE.Object3D, THREE.Vector3>();

  // (no parameter properties: the tests load this file with Node's type stripping, which cannot erase them)
  constructor(object: THREE.Object3D, home: THREE.Vector3, drive: Drive) {
    this.object = object;
    this.home = home;
    this.drive = drive;
    this.route = new Route(drive.path);
    this.pivot = new THREE.Vector3(...drive.pivot);
    this.axis = drive.axle;
    // the top of a wheel moves along axle x up; rolling forward is positive when that is the way it faces
    const axle = this.axis === 'x' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
    const forward = new THREE.Vector3(drive.forward[0], 0, drive.forward[1]);
    this.spin = Math.sign(axle.cross(UP).dot(forward)) * (drive.reverse ? -1 : 1) || 1;
    // (a wheel is the node named so with its number: the meshes under it turn with it, not as well as it)
    const named = (prefix: string, name: string) => name.startsWith(prefix) && /^_?\d+$/.test(name.slice(prefix.length));
    object.traverse((o) => {
      const steered = named(drive.steered, o.name);
      if (!steered && !named(drive.wheels, o.name)) return;
      o.rotation.order = this.axis === 'x' ? 'YXZ' : 'YZX'; // turned about the vertical, then rolled about the axle
      this.rolling.push(o);
      this.rests.set(o, o.position.clone());
      if (steered) this.steering.push(o);
    });
  }

  private chord(distance: number): number {
    return chordAt(this.route, distance, this.drive.wheelbase);
  }

  set(k: number): void {
    const distance = k * this.route.length;
    const p = this.route.at(distance);
    // a rail wagon lies along the line between its bogies, both on the route (types.ts Drive `bogies`)
    if (this.drive.bogies) p.heading = this.chord(distance) - this.chord(0);
    // turn about the rear axle, which is what follows the route
    const turned = this.pivot.clone().applyAxisAngle(UP, p.heading);
    this.object.rotation.y = p.heading;
    this.object.position.set(this.home.x + p.x + this.pivot.x - turned.x, this.home.y, this.home.z + p.z + this.pivot.z - turned.z);
    const roll = (this.spin * distance) / this.drive.wheelRadius;
    for (const w of this.rolling) w.rotation[this.axis] = roll;
    // the front wheels point where the route is going: one wheelbase ahead of the rear axle
    const steer = steerAlong(this.route, distance, this.drive.wheelbase) * (this.drive.reverse ? -1 : 1);
    for (const w of this.steering) w.rotation.y = steer;
    for (const [w, rest] of this.rests) w.position.copy(rest);
    if (this.drive.bogies) this.onRails(distance, p.heading);
  }

  /**
   * A rail wagon's wheel sets on its rails (the route is the track's line): each turned to the track where it stands and
   * moved across to it, as a bogie's axles are by the rails, wherever the line between the bogies' middles leaves it (a
   * set two metres from its bogie's middle just past a corner of the track).
   */
  private onRails(distance: number, heading: number): void {
    const o = this.object;
    const cos = Math.cos(heading);
    const sin = Math.sin(heading);
    // the route's frame: where the pivot is on it, in the frame the vehicle is placed in
    const ox = this.home.x + this.pivot.x;
    const oz = this.home.z + this.pivot.z;
    for (const [w, rest] of this.rests) {
      if (w.parent !== o) continue;
      // where the set is, from the route's start (the vehicle turned by `heading` about the vertical: x' = x cos + z sin)
      const x = o.position.x + rest.x * cos + rest.z * sin - ox;
      const z = o.position.z - rest.x * sin + rest.z * cos - oz;
      const s = this.route.nearest(x, z, distance, this.drive.wheelbase + 5);
      const on = this.route.at(s);
      // across to it, in the vehicle's own frame, and turned to the track there
      const dx = on.x - x;
      const dz = on.z - z;
      w.position.x += dx * cos - dz * sin;
      w.position.z += dx * sin + dz * cos;
      w.rotation.y = on.heading - heading;
    }
  }
}

/** The heading of the line from a point of a route to the point `ahead` metres further on (the route carried on straight past its end). */
export function chordAt(route: Route, distance: number, ahead: number): number {
  const a = route.at(distance);
  const far = distance + ahead;
  const end = route.at(route.length);
  const b =
    far <= route.length
      ? route.at(far)
      : {
          x: end.x + Math.sin(end.heading + route.start) * (far - route.length),
          z: end.z + Math.cos(end.heading + route.start) * (far - route.length),
        };
  return Math.atan2(b.x - a.x, b.z - a.z);
}

function ease(x: number): number {
  return x * x * (3 - 2 * x);
}

/** One thing a part does (types.ts: Part.functions): its nodes, the stretch of the slider their moves span, and what the flight says of it. */
export interface Fn {
  /** Its first node: what it is known by. */
  id: string;
  name: string;
  nodes: string[];
  /** Where on the slider its moves begin and end. */
  from: number;
  to: number;
  /** Seconds for its whole travel when held. */
  seconds: number;
  ends?: [string, string];
  at?: string;
  /** The lever that works it, which swings as it is run by hand. */
  lever?: string;
  needs?: { node: string; atLeast?: number; atMost?: number; why: string }[];
}

/**
 * The functions of a part, from its `moves`: every node that moves is one, and the flight's
 * `functions` name them, pace them and put several nodes together. A move that is over before
 * the slider starts (a piece built in one place and held in another) is not something it does.
 */
export function functionsOf(part: Part): Fn[] {
  const spans = new Map<string, [number, number]>();
  for (const move of part.moves ?? []) {
    if (move.to <= 0) continue;
    const node = move.node ?? part.node;
    const span = spans.get(node);
    spans.set(node, span ? [Math.min(span[0], move.from), Math.max(span[1], move.to)] : [move.from, move.to]);
  }
  const out: Fn[] = [];
  const taken = new Set<string>();
  const make = (nodes: string[], said?: NonNullable<Part['functions']>[number]): void => {
    const moving = nodes.filter((n) => spans.has(n) && !taken.has(n));
    if (!moving.length) return;
    for (const n of moving) taken.add(n);
    const from = Math.min(...moving.map((n) => spans.get(n)![0]));
    const to = Math.max(...moving.map((n) => spans.get(n)![1]));
    const plain = moving[0] === part.node ? part.name : moving[0]!.replace(`${part.node}_`, '').replace(/_/g, ' ');
    out.push({
      id: moving[0]!,
      name: said?.name ?? plain,
      nodes: moving,
      from,
      to,
      // unsaid, a function takes a few seconds: longer the more of the slider's travel it is
      seconds: said?.seconds ?? Math.min(20, Math.max(3, (to - from) * 60)),
      ends: said?.ends,
      at: said?.at,
      lever: said?.lever,
      needs: said?.needs,
    });
  };
  for (const said of part.functions ?? []) make(said.nodes, said);
  for (const node of spans.keys()) make([node]);
  return out;
}

/** How far along its travel (0 to 1) a function is when the slider reads `t`. */
export const scriptedAt = (fn: Fn, t: number): number => Math.min(1, Math.max(0, (t - fn.from) / Math.max(1e-9, fn.to - fn.from)));

/** Where on the slider a function's moves are played to put it `v` (0 to 1) along its travel. */
export const sliderFor = (fn: Fn, v: number): number => fn.from + Math.min(1, Math.max(0, v)) * (fn.to - fn.from);

/**
 * May a function move? Its `needs` are checked against how far along each other function is
 * (`value`, by a function's id). Returns why not, or null if it may.
 */
export function refusal(fn: Fn, value: (id: string) => number): string | null {
  for (const need of fn.needs ?? []) {
    const v = value(need.node);
    if ((need.atLeast !== undefined && v < need.atLeast - 1e-6) || (need.atMost !== undefined && v > need.atMost + 1e-6)) return need.why;
  }
  return null;
}

const RUN_BY = new THREE.Vector3();
const RUN_TURN = new THREE.Quaternion();
const RUN_NEXT = new THREE.Quaternion();

/**
 * A node's own motion (types.ts: Move, `run`) at `through` of the way along it, 0 to 1: `run` is its extras' list,
 * seven figures a sample (moved by x y z, turned by a quaternion x y z w), evenly spaced; between two samples it goes
 * straight from the one to the other. Writes how far it has moved and how it has turned; false if the node has none.
 */
export function runAt(run: unknown, through: number, by: THREE.Vector3, turn: THREE.Quaternion): boolean {
  if (!Array.isArray(run) || run.length < 14 || run.length % 7) return false;
  const last = run.length / 7 - 1;
  const at = Math.min(1, Math.max(0, through)) * last;
  const i = Math.min(last - 1, Math.floor(at));
  const f = at - i;
  const a = 7 * i;
  const b = a + 7;
  by.set(run[a] + (run[b] - run[a]) * f, run[a + 1] + (run[b + 1] - run[a + 1]) * f, run[a + 2] + (run[b + 2] - run[a + 2]) * f);
  turn.set(run[a + 3], run[a + 4], run[a + 5], run[a + 6]).slerp(RUN_NEXT.set(run[b + 3], run[b + 4], run[b + 5], run[b + 6]), f);
  return true;
}

/**
 * A part that leaves as hardware does: a sequence of motions, each on a node of the part and
 * each over its own stretch of the slider (types.ts: Move).
 */
export class Sequence {
  private readonly nodes = new Map<THREE.Object3D, { position: THREE.Vector3; quaternion: THREE.Quaternion }>();
  private readonly steps: { move: Move; object: THREE.Object3D; node: string; driver?: Driver }[] = [];
  /** What of it runs on something (Move `runs`: viewer/runs.ts), a rider a node, outermost first. */
  private readonly riders = new Map<THREE.Object3D, Rider>();
  private readonly surfaces: Surfaces | null;

  constructor(part: THREE.Object3D, home: THREE.Vector3, moves: Move[], surfaces: Surfaces | null = null) {
    this.surfaces = surfaces;
    for (const move of moves) {
      const object = move.node ? part.getObjectByName(move.node) : part;
      if (!object) {
        console.warn(`explode: ${part.name} has no node named ${move.node}`);
        continue;
      }
      // where it was built: every setting of the slider starts again from here
      if (!this.nodes.has(object))
        this.nodes.set(object, {
          position: object === part ? home.clone() : object.position.clone(),
          quaternion: object.quaternion.clone(),
        });
      const rest = this.nodes.get(object)!.position;
      this.steps.push({
        move,
        object,
        node: move.node ?? part.name,
        driver: move.kind === 'drive' ? new Driver(object, rest, move) : undefined,
      });
    }
    // (a vehicle driven more than once is a nest of nodes: the outermost is stood first, and those inside it on that)
    const depth = (o: THREE.Object3D): number => (o.parent ? depth(o.parent) + 1 : 0);
    for (const { move, object } of [...this.steps].sort((a, b) => depth(a.object) - depth(b.object))) {
      if (this.riders.has(object) || (move.kind !== 'slide' && move.kind !== 'drive') || !move.runs) continue;
      const runs = move.runs;
      this.riders.set(
        object,
        new Rider(
          object,
          runs,
          move.kind === 'drive'
            ? { prefixes: [move.wheels, move.steered], radius: move.wheelRadius, axle: move.axle, rolls: false }
            : {
                prefixes: runs.wheels ? [runs.wheels] : [],
                radius: runs.wheelRadius ?? 0,
                axle: runs.axle ?? 'z',
                rolls: Boolean(runs.wheels),
              },
        ),
      );
    }
  }

  /**
   * Play every motion to where it is when the slider reads `k`; a node in `held` is played to the
   * reading held for it instead, and one in `loose` is left wherever something else has put it
   * (a vehicle being driven by hand).
   */
  set(k: number, held?: ReadonlyMap<string, number>, loose?: ReadonlySet<string>): void {
    for (const [object, rest] of this.nodes) {
      if (loose?.has(object.name)) continue;
      object.position.copy(rest.position);
      object.quaternion.copy(rest.quaternion);
    }
    for (const rider of this.riders.values()) rider.slid.set(0, 0, 0);
    for (const { move, object, node, driver } of this.steps) {
      if (loose?.has(object.name)) continue;
      const at = held?.get(node) ?? k;
      if (move.kind === 'run') {
        // the node's own motion (its extras): where the last of these to have begun has it, from where it was built
        if (at < move.from) continue;
        const through = Math.min(1, (at - move.from) / Math.max(1e-6, move.to - move.from));
        const rest = this.nodes.get(object)!;
        if (!runAt(object.userData.run, move.back ? 1 - through : through, RUN_BY, RUN_TURN)) continue;
        object.position.copy(rest.position).add(RUN_BY);
        object.quaternion.copy(rest.quaternion).premultiply(RUN_TURN);
        continue;
      }
      const u = ease(Math.min(1, Math.max(0, (at - move.from) / Math.max(1e-6, move.to - move.from))));
      if (move.kind === 'swing') {
        // in the parent's frame, so it goes before whatever turn the node already has
        object.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...move.axis).normalize(), move.angle * u));
      } else if (move.kind === 'slide') {
        const by = new THREE.Vector3(...move.by).multiplyScalar(u);
        object.position.add(by);
        this.riders.get(object)?.slid.add(by);
      } else driver?.set(u);
    }
    // and what runs on something is stood on it, as it has just been put
    for (const [object, rider] of this.riders) if (!loose?.has(object.name)) rider.stand(this.surfaces);
  }
}

/** Moves a flight's parts between their assembled and exploded positions. */
export class Exploder {
  private readonly entries: { object: THREE.Object3D; home: THREE.Vector3; part: Part; sequence?: Sequence }[] = [];
  /** The parts' motions on the clock (Part.clocked), each a sequence in seconds from launch. */
  private readonly clocked: Sequence[] = [];
  private readonly orders: number;
  /** Nodes being worked by hand: each is played to the slider reading held for it, whatever the slider says. */
  private readonly held = new Map<string, number>();
  /** Nodes something else is moving (a vehicle being driven by hand): the slider leaves them where they are. */
  private readonly loose = new Set<string>();

  /** `surfaces`: where what runs on something is stood (viewer/runs.ts); left out, it moves level, as built. */
  constructor(root: THREE.Object3D, parts: Part[], surfaces: Surfaces | null = null) {
    this.orders = Math.max(0, ...parts.map((p) => p.order));
    for (const part of parts) {
      const object = root.getObjectByName(part.node);
      if (!object) {
        console.warn(`explode: model has no node named ${part.node}`);
        continue;
      }
      // remember where it was built, so the model can be shown again later from a clean state
      const home = ((object.userData.home as THREE.Vector3 | undefined) ??= object.position.clone());
      this.entries.push({ object, home, part, sequence: part.moves && new Sequence(object, home, part.moves, surfaces) });
      // (each on a node of its own, never the part's: the part's own place is the slider's)
      const clocked = part.clocked?.filter((m) => m.node);
      if (clocked?.length) this.clocked.push(new Sequence(object, home, clocked, surfaces));
    }
  }

  /** Has it anything that moves on the clock? */
  get onTheClock(): boolean {
    return this.clocked.length > 0;
  }

  /**
   * Play the parts' motions on the clock to where they are at `t`, seconds from launch; a node worked by hand
   * (`work`) is played to the instant held for it instead.
   */
  clock(t: number): void {
    for (const sequence of this.clocked) sequence.set(t, this.worked);
  }

  /**
   * Hold a node's motions on the clock at an instant of its own (null: let it follow the clock again): a mechanism a
   * hand has taken from its programme (sim/mechanism.ts). Takes effect at the next `clock`.
   */
  work(node: string, instant: number | null): void {
    if (instant === null) this.worked.delete(node);
    else this.worked.set(node, instant);
  }
  private readonly worked = new Map<string, number>();

  /** Hold a node's motions at a reading of the slider of its own (null: let it follow the slider again). Takes effect at the next `set`. */
  hold(node: string, reading: number | null): void {
    if (reading === null) this.held.delete(node);
    else this.held.set(node, reading);
  }

  /** Let something else move a node (true), or give it back to the slider (false). Takes effect at the next `set`. */
  loosen(node: string, on: boolean): void {
    if (on) this.loose.add(node);
    else this.loose.delete(node);
  }

  set(t: number): void {
    for (const { object, home, part, sequence } of this.entries) {
      // a sequence is timed against the slider itself (its motions say when); a plain slide takes its turn
      const k = partProgress(t, part.order, this.orders);
      if (sequence) sequence.set(t, this.held, this.loose);
      else if (!this.loose.has(part.node))
        object.position.set(home.x + part.explode[0] * k, home.y + part.explode[1] * k, home.z + part.explode[2] * k);
    }
  }
}

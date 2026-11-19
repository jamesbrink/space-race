/**
 * What stands at a flight's site, as the simulator can strike it: the baked solids (solids.ts) of every model that
 * stands there, each placed as the flight places its model (`ModelDef.position`, `rotationY`), asked in the site's own
 * frame (the pad model's: +Y up, metres) at an instant of the flight's clock, so a piece that moves is met where it
 * is then. No three.js: node flies against it as the page does.
 *
 * Which models: `solidModels` says, for the bake (tools/collision-bake.mjs) and for whoever loads the files. A flight
 * or a site gets its world by being built and baked; nothing here names one.
 *
 * Not here yet, and said in simulator.md: the place's models round the pad (a neighbouring complex, a blockhouse of
 * the place's own model), which the viewer sets down from the place's own code; the land beyond the pad's own model,
 * which is the simulator's `floor`.
 */
import type { Flight, ModelDef } from '../types.ts';
import { add, dot, length, scale, sub, type Vec3 } from '../world/frames.ts';
import { BoxTree, into, outOf, type Pose, poseAt, type SolidModel, type SolidPiece, turnBy, within } from './solids.ts';

/**
 * Where a flight's model's solids are kept, as a model's url is (under public/): in the flight's own folder, by the
 * model's id. They are the flight's and not the GLB's: a pad that is one GLB for several flights is posed by each
 * flight's own moves and clock (Complex 39's Pad A by Apollo 8 and by Apollo 9), so each has its own.
 */
export const solidUrl = (flight: { id: string }, def: { id: string }): string => `models/${flight.id}/${def.id}.solid.bin`;

/**
 * The models of a flight that have solids, and as what: a `structure` stands at the site and is neither a person nor
 * what flies (its pieces are baked); the `vehicle` is the model the run carries off the pad (its hulls are). None for
 * a flight with no site.
 */
export function solidModels(flight: Flight): { def: ModelDef; kind: 'structure' | 'vehicle' }[] {
  if (!flight.site) return [];
  const flown = flight.flies?.model;
  return flight.models
    .filter((m) => !m.walker && !m.galleryOnly && (m.backdrop === 'ground' || m.id === flown))
    .map((def) => ({ def, kind: def.id === flown ? ('vehicle' as const) : ('structure' as const) }));
}

/** What a swept sphere met at a site. */
export interface SiteHit {
  /** How far along its way, 0 to 1. */
  fraction: number;
  /** The surface's outward normal there, in the site's frame. */
  normal: Vec3;
  /** The model's id, the piece's node, and the top-level part it belongs to (which the flight's data names and describes). */
  model: string;
  node: string;
  part: string;
}

interface Standing {
  model: string;
  place: Pose;
  piece: SolidPiece;
  tree: BoxTree | null;
  /** Where it stands in the site's frame, for one that never moves: worked out when first asked. */
  still?: Pose;
  /** A sphere round the piece in its own frame. */
  middle: Vec3;
  reach: number;
}

export class SiteWorld {
  private readonly standing: Standing[] = [];
  /** How far from the site's origin anything here ever is, metres: beyond it and its own radius a sphere meets nothing. */
  private reach = 0;

  /** `models`: each structure's solids with how its flight places it. */
  constructor(models: readonly { id: string; solids: SolidModel; position?: readonly [number, number, number]; rotationY?: number }[]) {
    for (const { id, solids, position, rotationY = 0 } of models) {
      const place: Pose = { p: position ?? [0, 0, 0], q: [0, Math.sin(rotationY / 2), 0, Math.cos(rotationY / 2)] };
      for (const piece of solids.pieces) {
        // (its bounds from the boxes themselves, without building its tree until it is asked)
        const lo = [Infinity, Infinity, Infinity];
        const hi = [-Infinity, -Infinity, -Infinity];
        for (let i = 0; i < piece.boxes.length; i += 6)
          for (let k = 0; k < 3; k++) {
            lo[k] = Math.min(lo[k]!, piece.boxes[i + k]!);
            hi[k] = Math.max(hi[k]!, piece.boxes[i + 3 + k]!);
          }
        if (!piece.boxes.length) continue;
        const middle: Vec3 = [(lo[0]! + hi[0]!) / 2, (lo[1]! + hi[1]!) / 2, (lo[2]! + hi[2]!) / 2];
        const reach = length(sub(hi as unknown as Vec3, middle));
        this.standing.push({ model: id, place, piece, tree: null, middle, reach });
        // (wherever it stands, from liftoff to the end of its track)
        const samples = piece.track ? piece.track.length / 8 : 0;
        for (let i = -1; i < samples; i++) {
          const pose = i < 0 ? piece.pose : poseAt(piece, piece.track![8 * i]!);
          this.reach = Math.max(this.reach, length(outOf(within(place, pose), middle)) + reach);
        }
      }
    }
  }

  /** A flight's world from its baked files: `load` gives a model's solids by their url (solidUrl), or nothing if it has none. */
  static of(flight: Flight, load: (url: string) => SolidModel | undefined): SiteWorld {
    const models = [];
    for (const { def, kind } of solidModels(flight)) {
      const solids = kind === 'structure' ? load(solidUrl(flight, def)) : undefined;
      if (solids)
        models.push({
          id: def.id,
          solids,
          ...(def.position ? { position: def.position } : {}),
          ...(def.rotationY ? { rotationY: def.rotationY } : {}),
        });
    }
    return new SiteWorld(models);
  }

  /** How many pieces stand here. */
  get size(): number {
    return this.standing.length;
  }

  /** The pieces by name, for a test or a report: each model's id with its piece's node. */
  get names(): string[] {
    return this.standing.map((s) => `${s.model}/${s.piece.node}`);
  }

  private poseOf(s: Standing, t: number): Pose {
    // (a piece that never moves is placed once)
    if (!s.piece.track) return (s.still ??= within(s.place, s.piece.pose));
    return within(s.place, poseAt(s.piece, t));
  }

  /** How far from the site's origin anything here ever is, m: a sphere further off than that and its own radius meets nothing. */
  get extent(): number {
    return this.reach;
  }

  /** Where a piece (`model/node`) stands at `t`, seconds from launch, in the site's frame: null if there is none of that name. */
  poseAt(name: string, t: number): Pose | null {
    const s = this.standing.find((x) => `${x.model}/${x.piece.node}` === name);
    return s ? this.poseOf(s, t) : null;
  }

  /**
   * The first thing a sphere of `radius` meets as its centre goes from `from` at `t0` to `to` at `t1` (the site's
   * frame; seconds from launch), each piece taken where it is at each end, so one that moves meanwhile is met by the
   * motion between the two. What the sphere starts in, or touching, is not met (solids.ts `sweepBox`): a vehicle
   * stands in its launcher's arms until it has left them.
   */
  sweep(from: Vec3, to: Vec3, radius: number, t0: number, t1: number = t0): SiteHit | null {
    let best: SiteHit | null = null;
    const along = sub(to, from);
    const span = dot(along, along);
    // nowhere near the site: the way's nearest point to its origin is beyond everything that stands there
    const nearest = span ? Math.min(1, Math.max(0, -dot(from, along) / span)) : 0;
    if (length(add(from, scale(along, nearest))) > this.reach + radius) return null;
    for (const s of this.standing) {
      const pose0 = this.poseOf(s, t0);
      const pose1 = s.piece.track && t1 !== t0 ? this.poseOf(s, t1) : pose0;
      // far from it at both ends and between: its sphere against the way's capsule, in the frame it ends in
      const centre = add(pose1.p, turnBy(pose1.q, s.middle));
      const start = pose1 === pose0 ? from : add(pose1.p, turnBy(pose1.q, into(pose0, from)));
      const way = pose1 === pose0 ? along : sub(to, start);
      const size = pose1 === pose0 ? span : dot(way, way);
      const k = size ? Math.min(1, Math.max(0, dot(sub(centre, start), way) / size)) : 0;
      if (length(sub(centre, add(start, scale(way, k)))) > s.reach + radius) continue;
      s.tree ??= new BoxTree(s.piece.boxes);
      const hit = s.tree.sweep(into(pose0, from), into(pose1, to), radius);
      if (hit && (!best || hit.fraction < best.fraction))
        best = { fraction: hit.fraction, normal: turnBy(pose1.q, hit.normal), model: s.model, node: s.piece.node, part: s.piece.part };
    }
    return best;
  }

  /**
   * Whether a sphere of `radius` going from `from` at `t0` to `to` at `t1` neither starts in anything nor meets
   * anything: one question for a whole vehicle (the sphere round its hull) before each of its own spheres is asked.
   */
  clear(from: Vec3, to: Vec3, radius: number, t0: number, t1: number = t0): boolean {
    const along = sub(to, from);
    const span = dot(along, along);
    const nearest = span ? Math.min(1, Math.max(0, -dot(from, along) / span)) : 0;
    if (length(add(from, scale(along, nearest))) > this.reach + radius) return true;
    for (const s of this.standing) {
      const pose0 = this.poseOf(s, t0);
      const pose1 = s.piece.track && t1 !== t0 ? this.poseOf(s, t1) : pose0;
      const a = into(pose0, from);
      const b = into(pose1, to);
      // (in the piece's own frame: its sphere against the way's)
      const way = sub(b, a);
      const size = dot(way, way);
      const k = size ? Math.min(1, Math.max(0, dot(sub(s.middle, a), way) / size)) : 0;
      if (length(sub(s.middle, add(a, scale(way, k)))) > s.reach + radius) continue;
      s.tree ??= new BoxTree(s.piece.boxes);
      if (s.tree.touching(a, radius).length || s.tree.sweep(a, b, radius)) return false;
    }
    return true;
  }

  /** The pieces a sphere standing at `centre` at `t` reaches into: `model/node` each. */
  touching(centre: Vec3, radius: number, t: number): string[] {
    const out: string[] = [];
    for (const s of this.standing) {
      const pose = this.poseOf(s, t);
      const local = into(pose, centre);
      if (length(sub(local, s.middle)) > s.reach + radius) continue;
      s.tree ??= new BoxTree(s.piece.boxes);
      if (s.tree.touching(local, radius).length) out.push(`${s.model}/${s.piece.node}`);
    }
    return out;
  }

  /**
   * The height (the site's +Y) of the highest solid surface under `point` at `t`, and what it is of: what something
   * falling straight down there lands on. Null where nothing stands under it within `depth` metres.
   */
  below(point: Vec3, t: number, depth = 1000): { height: number; model: string; node: string; part: string } | null {
    const probe = 0.01;
    const hit = this.sweep(point, [point[0], point[1] - depth, point[2]], probe, t);
    return hit ? { height: point[1] - depth * hit.fraction - probe, model: hit.model, node: hit.node, part: hit.part } : null;
  }
}

/**
 * A vehicle flown by hand against what stands at its site (siteworld.ts): its hull, as the spheres baked from its
 * model (solids.ts `hulls`), swept through each step of the flight against the site's pieces where they are then,
 * and the first meeting answered with an impulse on the state the simulator integrates. Nothing here writes a state
 * from data: a step's outcome is the step's own, changed by the impulse at the sphere that struck (contact.ts `strike`:
 * along the surface's normal, perfectly inelastic, without friction, about the centre of mass, so a blow off the axis
 * turns the vehicle). The structure does not move and is not damaged.
 *
 * The hull is the model's, placed as the page draws it: a sphere's station up the stack is its height in the model
 * and the model's datum (`flies.datum`), its place across the stack is carried from the model's frame into the body's
 * by how the vehicle stood at liftoff, and while the page still draws the vehicle on its launcher's support the spheres
 * stand on it too (viewer/ascent.ts `stood`: the simulator starts the stack's base on the site's origin). A sphere
 * that starts a step inside a piece has not met it (solids.ts): the vehicle stands in its launcher until it leaves.
 *
 * Estimated, and ours: `REPORTED`, the closing speed under which a contact is not said on the deck (a vehicle lying on
 * a deck touches it every step); `SKIN`, how far off a surface a resolved sphere is left.
 */
import type { Flight } from '../types.ts';
import type { EarthFrame } from '../world/earthframe.ts';
import { add, dot, ecefToSite, length, scale, type Site, siteToEcefDirection, sub, type Vec3 } from '../world/frames.ts';
import { isBreakupImpact } from './breakup.ts';
import { type ContactElement, type Impact, strike } from './contact.ts';
import { type Quat, rotateFor, turn, unturn } from './rigid.ts';
import type { ContactPose } from './shed.ts';
import type { SiteWorld } from './siteworld.ts';
import type { SolidModel } from './solids.ts';

/** m/s: a contact slower than this is answered and not reported (estimated: chosen so that resting is silent and a knock is said). */
export const REPORTED = 1;
/** m: how far off the surface a sphere is left when its contact is answered (estimated: small against any hull, large against rounding). */
export const SKIN = 0.005;
/** Seconds over which the page lowers the drawn vehicle from its launcher's support to the point flown (viewer/ascent.ts `SETTLES`). */
const SETTLES = 5;

/** A sphere of the hull in the body's frame: its station up the stack from the base, m, and its place across it. */
export interface HullBead {
  node: string;
  at: Vec3;
  radius: number;
}

export interface SiteStrike extends Impact {
  /** The piece that was struck: a node of the model `on` names a part of (solids.ts `SolidPiece.node`). */
  node: string;
  /** And the node of the vehicle's model whose hull struck it. */
  by: string;
  dv: Vec3;
  dw: Vec3;
}

const smooth = (x: number): number => {
  const k = Math.min(1, Math.max(0, x));
  return k * k * (3 - 2 * k);
};

export class SiteContact {
  readonly beads: readonly HullBead[];
  private readonly world: SiteWorld;
  private readonly site: Site;
  private readonly frame: EarthFrame;
  private readonly stand: Vec3;
  private readonly names: ReadonlyMap<string, string>;
  /** The furthest any sphere reaches from the stack's base, m. */
  private readonly span: number;

  /**
   * `hull`: the flown model's solids. `standing`: the vehicle's attitude at liftoff (body to the frame that does not
   * turn), by which the model's own sideways is the body's. `flight` gives where the model stands and its datum.
   */
  constructor(flight: Flight, world: SiteWorld, hull: SolidModel, site: Site, frame: EarthFrame, standing: Quat) {
    this.world = world;
    this.site = site;
    this.frame = frame;
    const def = flight.models.find((m) => m.id === flight.flies?.model);
    const home = def?.position ?? [0, 0, 0];
    const datum = flight.flies?.datum ?? home[1];
    this.stand = [home[0], home[1] - datum, home[2]];
    const yaw = def?.rotationY ?? 0;
    const beads: HullBead[] = [];
    for (const h of hull.hulls)
      for (let i = 0; i < h.beads.length; i += 4) {
        const [x, y, z, radius] = [h.beads[i]!, h.beads[i + 1]!, h.beads[i + 2]!, h.beads[i + 3]!];
        // sideways in the model, turned as the model stands on the pad, seen from the body as it stood at liftoff
        const across: Vec3 = [x * Math.cos(yaw) + z * Math.sin(yaw), 0, -x * Math.sin(yaw) + z * Math.cos(yaw)];
        const body = unturn(standing, frame.toInertial(siteToEcefDirection(site, across), 0));
        beads.push({ node: h.node, at: [y + datum, body[1], body[2]], radius });
      }
    this.beads = beads;
    this.span = beads.reduce((far, b) => Math.max(far, length(b.at) + b.radius), 0);
    this.names = new Map(flight.models.flatMap((m) => m.parts.map((p) => [`${m.id}/${p.node}`, p.name] as const)));
  }

  /** A point of the body, by its station and its place across the stack, in the frame that does not turn. */
  private static point(p: ContactPose, at: Vec3): Vec3 {
    return add(p.r, turn(p.q, [at[0] - p.station, at[1], at[2]]));
  }

  /** A point of the frame that does not turn, in the site's frame as the page draws the vehicle at `t`. */
  private drawn(p: Vec3, t: number): Vec3 {
    return add(ecefToSite(this.site, this.frame.toFixed(p, t)), scale(this.stand, 1 - smooth(t / SETTLES)));
  }

  /** Where the centre of mass is up the stack and the moments about it, as the pose gives them or else as the spheres aboard weigh. */
  private massOf(pose: ContactPose, aboard: readonly HullBead[]): { centre: number; inertia: Vec3 } {
    if (pose.centre !== undefined && pose.inertia) return { centre: pose.centre, inertia: pose.inertia };
    // (each sphere a share of the mass by its volume: the same guess shed.ts makes from its hulls)
    let total = 0;
    let moment = 0;
    for (const b of aboard) {
      total += b.radius ** 3;
      moment += b.radius ** 3 * b.at[0];
    }
    const centre = pose.centre ?? (total ? moment / total : pose.station);
    let roll = 0;
    let across = 0;
    for (const b of aboard) {
      const m = (pose.mass * b.radius ** 3) / (total || 1);
      const side = b.at[1] ** 2 + b.at[2] ** 2;
      roll += m * (side + 0.4 * b.radius ** 2);
      across += m * ((b.at[0] - centre) ** 2 + side / 2 + 0.4 * b.radius ** 2);
    }
    return { centre, inertia: pose.inertia ?? [roll, across, across] };
  }

  /**
   * One step of the flight, from `before` to `after` as the simulator flew it, against the site: `after` as the
   * contacts leave it, and what was struck hard enough to say. `gone`: whether a node of the model has left the vehicle.
   */
  meet(before: ContactPose, after: ContactPose, gone: (node: string) => boolean = () => false) {
    let { r, v, q, w } = after;
    const hits: SiteStrike[] = [];
    const dt = after.t - before.t;
    // nowhere near the site at either end: nothing to ask
    const reach = this.world.extent + this.span + length(this.stand);
    if (!(dt > 0) || (length(this.drawn(before.r, before.t)) > reach && length(this.drawn(after.r, after.t)) > reach))
      return { r, v, q, w, hits };
    const aboard = this.beads.filter((b) => !gone(b.node));
    // nothing within reach of the whole hull this step: one question, not one a sphere
    let low = Infinity;
    let high = -Infinity;
    let wide = 0;
    for (const b of aboard) {
      low = Math.min(low, b.at[0] - b.radius);
      high = Math.max(high, b.at[0] + b.radius);
      wide = Math.max(wide, Math.hypot(b.at[1], b.at[2]) + b.radius);
    }
    if (!aboard.length) return { r, v, q, w, hits };
    const middle: Vec3 = [(low + high) / 2, 0, 0];
    const round = Math.hypot((high - low) / 2, wide);
    const from = this.drawn(SiteContact.point(before, middle), before.t);
    const to = this.drawn(SiteContact.point(after, middle), after.t);
    if (this.world.clear(from, to, round, before.t, after.t)) return { r, v, q, w, hits };
    const { centre, inertia } = this.massOf(after, aboard);
    const said = new Set<string>();
    // (several spheres may meet something in one step: each answer is taken before the next is looked for)
    // (the earliest first, for when it happened; then whichever is left deepest, so that none is left in what it met:
    // a sphere left inside a piece is no longer met by it)
    for (let round = 0; round < 12; round++) {
      const now: ContactPose = { ...after, r, v, q, w };
      let first: { bead: HullBead; fraction: number; normal: Vec3; closing: number; key: string; node: string; into: number } | null = null;
      for (const bead of aboard) {
        const from = this.drawn(SiteContact.point(before, bead.at), before.t);
        const to = this.drawn(SiteContact.point(now, bead.at), now.t);
        const hit = this.world.sweep(from, to, bead.radius, before.t, now.t);
        if (!hit) continue;
        const motion = sub(to, from);
        const closing = -dot(motion, hit.normal) / dt;
        if (closing <= 1e-6) continue;
        const deep = closing * dt * (1 - hit.fraction);
        if (first && (round === 0 ? hit.fraction >= first.fraction : deep <= first.into)) continue;
        first = {
          bead,
          fraction: hit.fraction,
          normal: hit.normal,
          closing,
          key: `${hit.model}/${hit.part}`,
          node: hit.node,
          into: -dot(motion, hit.normal) * (1 - hit.fraction),
        };
      }
      if (!first) break;
      const t = before.t + dt * first.fraction;
      const normal = this.frame.toInertial(siteToEcefDirection(this.site, first.normal), t);
      const element: ContactElement = {
        before: SiteContact.point(before, first.bead.at),
        after: SiteContact.point(now, first.bead.at),
        velocity: now.v,
        radius: first.bead.radius,
        mass: now.mass,
        body: {
          start: SiteContact.point(before, [centre, 0, 0]),
          end: SiteContact.point(now, [centre, 0, 0]),
          q0: before.q,
          q1: now.q,
          w: now.w,
          inertia,
        },
      };
      const answer = strike(element, normal, first.fraction, first.closing, first.into + SKIN, dt);
      r = add(r, answer.r);
      v = add(v, answer.v);
      w = add(w, answer.w);
      q = rotateFor(q, answer.w, dt * (1 - first.fraction));
      if (answer.speed >= REPORTED && !said.has(first.key)) {
        said.add(first.key);
        const impact = {
          on: first.key,
          name: this.names.get(first.key) ?? first.key.split('/')[1]!,
          t,
          speed: answer.speed,
          energy: answer.energy,
        };
        hits.push({
          ...impact,
          node: first.node,
          by: first.bead.node,
          dv: answer.v,
          dw: answer.w,
          ...(isBreakupImpact(impact) ? { activeBroken: true } : {}),
        });
      }
    }
    return { r, v, q, w, hits };
  }
}

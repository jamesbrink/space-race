/**
 * A body flown by hand against what stands at its site (siteworld.ts) and the ground it stands on: the vehicle by its
 * hull, as the spheres baked from its model (solids.ts `hulls`), and whatever it has shed by the spheres its own
 * contacts use (shed.ts), each swept through every step of its flight against the site's pieces where they are then
 * and against the land, and the first meeting answered with an impulse on the state the simulator integrates. Nothing
 * here writes a state from data: a step's outcome is the step's own, changed by the impulse at the sphere that struck
 * (contact.ts `strike`: along the surface's normal, perfectly inelastic, with the surface's drag on what slides over
 * it, about the centre of mass, so a blow off the axis turns the body and something round rolls). **Nothing at a site
 * moves or is damaged by a blow**: a tower, a deck and the ground take any impulse and stand.
 *
 * The hull is the model's, placed as the page draws it: a sphere's station up the stack is its height in the model
 * and the model's datum (`flies.datum`), its place across the stack is carried from the model's frame into the body's
 * by how the vehicle stood at liftoff, and while the page still draws the vehicle on its launcher's support the spheres
 * stand on it too (viewer/ascent.ts `stood`: the simulator starts the stack's base on the site's origin). A sphere
 * that starts a step inside a piece, or under the land, has not met it (solids.ts): the vehicle stands in its launcher
 * until it leaves.
 *
 * The ground (`Ground`) is the land's height in the site's frame, where the page has it (viewer: the place's land, with
 * its relief): a surface like any other, its normal the land's own slope. Where it lies under the sea it is not met:
 * what comes down there comes down in the sea, by the simulator's own floor (`floorOver`). With no ground given (a
 * test, a flight flown with no page) only what stands at the site is met, and the simulator's flat floor ends the
 * flight as before.
 *
 * A body that lies still on what it met is at rest there (`Lying`): touching, and moving over the ground more slowly
 * than `STILL` for `RESTS` seconds. Its flight is over where it lies, and it came down as fast as the hardest it struck
 * on the way to lying there.
 *
 * Estimated, and ours: `REPORTED`, the closing speed under which a contact is not said on the deck (a vehicle lying on
 * a deck touches it every step); `SKIN`, how far off a surface a resolved sphere is left; `FRICTION`, one coefficient
 * for every pair of surfaces; `ROLLING`, what resists a sphere's turning where it touches; `STILL` and `RESTS`, what
 * lying still is; `SETTLING`, under which a body already touching is not said to strike again.
 */
import type { Flight } from '../types.ts';
import type { EarthFrame } from '../world/earthframe.ts';
import {
  add,
  cross,
  dot,
  ecefToGeodetic,
  ecefToSite,
  geodeticToEcef,
  length,
  scale,
  type Site,
  siteToEcefDirection,
  sub,
  unit,
  type Vec3,
} from '../world/frames.ts';
import { isBreakupImpact } from './breakup.ts';
import { type ContactElement, type Impact, strike } from './contact.ts';
import { type Quat, rotateFor, turn, unturn } from './rigid.ts';
import type { ContactPose } from './shed.ts';
import type { SiteWorld } from './siteworld.ts';
import type { SolidModel } from './solids.ts';

/** m/s: a contact slower than this is answered and not reported (estimated: chosen so that resting is silent and a knock is said). */
export const REPORTED = 1;
/** m: how far off the surface a sphere is left when its contact is answered (estimated: small against any hull, large against rounding). */
export const SKIN = 0.001;
/**
 * The drag of one surface on another sliding over it, as a share of the force between them (estimated: one figure for
 * every pair, where dry steel or aluminium on steel or concrete is given from 0.4 to 0.8; nothing here knows what a
 * surface is made of).
 */
export const FRICTION = 0.5;
/**
 * How far from its point of contact a surface's push on a body lies against the body's turning, as a share of the
 * body's own radius: what stops something round rolling for ever, and a body rocking or spinning on one point of
 * itself (estimated, and ours: hardware is not a string of spheres, and a dented skin on sand or concrete rolls far
 * worse than a ball).
 */
export const ROLLING = 0.1;
/**
 * m: a body no point of which has gone further than this from where it was, while it touches something, is lying still
 * (estimated: a hand's breadth; a body answered sphere by sphere is never without a tremor, so stillness is read from
 * where it is and not from how fast it is said to be going).
 */
export const STILL = 0.1;
/** Seconds of lying still after which a body is at rest and its flight over (estimated: long enough for a rocking body to settle or to go on). */
export const RESTS = 1;
/** Seconds out of contact after which the next touch is another coming down, not the same one (estimated: bookkeeping, not physics). */
const APART = 2;
/** Seconds over which the page lowers the drawn vehicle from its launcher's support to the point flown (viewer/ascent.ts `SETTLES`). */
const SETTLES = 5;
/**
 * m: a sphere that comes no nearer a surface than this in a step is not asked again in that step, unless the answers
 * given since have moved the body further than this (estimated: a cell of the baked boxes; for the cost of a body
 * lying on a site, most of whose spheres touch nothing).
 */
const NEARBY = 0.25;
/**
 * m/s: a body already touching what it strikes, struck again more gently than this, is settling on it and is not said
 * again (estimated: the far end of a long body rocks at a metre a second while it lies down).
 */
export const SETTLING = 3;
/** m: the step over which the land's slope is read for its normal (estimated: finer than any hull's sphere). */
const SLOPE = 0.25;
/** What the land is called on the deck when it is struck, and by what key. */
const LAND = { key: 'ground', name: 'The ground' };

/**
 * The land at a site, as the page has it: its height (the site's +Y, m) at a place in the site's frame, or null where
 * there is none to ask of; and how far from the site's origin it is known, m.
 */
export interface Ground {
  at(x: number, z: number): number | null;
  reach: number;
}

/** A sphere of the hull in the body's frame: its station up the stack from the base, m, and its place across it. */
export interface HullBead {
  node: string;
  at: Vec3;
  radius: number;
}

export interface SiteStrike extends Impact {
  /** The piece that was struck: a node of the model `on` names a part of (solids.ts `SolidPiece.node`), or 'ground'. */
  node: string;
  /** And the node of the vehicle's model whose hull struck it (the event that let a shed body go, for one of those). */
  by: string;
  dv: Vec3;
  dw: Vec3;
}

/** How a body came to rest: when it was first still, and how fast it was coming down, and over the ground, at the hardest it struck on the way. */
export interface Rest {
  t: number;
  vertical: number;
  horizontal: number;
}

const smooth = (x: number): number => {
  const k = Math.min(1, Math.max(0, x));
  return k * k * (3 - 2 * k);
};

/** A point of the body, by its station and its place across the stack, in the frame that does not turn. */
const point = (p: ContactPose, at: Vec3): Vec3 => add(p.r, turn(p.q, [at[0] - p.station, at[1], at[2]]));

/**
 * Whether a body is lying still, kept from step to step: `note` each step with whether it touched anything and where
 * it was left, and it answers with the rest once it has lain still for `RESTS`. A flight put back in time starts again.
 */
export class Lying {
  private since: number | null = null;
  private where: readonly Vec3[] = [];
  private touched = Number.NEGATIVE_INFINITY;
  private last = Number.NEGATIVE_INFINITY;
  private hardest = { vertical: 0, horizontal: 0 };
  private was = false;

  /** Whether the body was already touching something as the step last noted began: what it strikes gently then, it is settling on (`SETTLING`). */
  get touching(): boolean {
    return this.was;
  }

  /**
   * `points`: where points of the body are over the ground (its centre of mass, and far ends of it along and across,
   * in the site's frame), as the step left them; `down`, `along`: how it was coming down and going over the ground as
   * the step began.
   */
  note(t: number, touched: boolean, points: readonly Vec3[], down: number, along: number): Rest | null {
    if (t < this.last) {
      this.since = null;
      this.touched = Number.NEGATIVE_INFINITY;
      this.hardest = { vertical: 0, horizontal: 0 };
    }
    this.last = t;
    this.was = t - this.touched <= 0.1;
    if (!touched) {
      // (answered sphere by sphere a body lying on something is off it for a tick or two between touches)
      if (t - this.touched > 0.1) this.since = null;
      return null;
    }
    if (t - this.touched > APART) this.hardest = { vertical: 0, horizontal: 0 };
    this.touched = t;
    if (Math.hypot(down, along) > Math.hypot(this.hardest.vertical, this.hardest.horizontal))
      this.hardest = { vertical: down, horizontal: along };
    const strayed = this.since === null || points.some((p, i) => length(sub(p, this.where[i] ?? p)) > STILL);
    if (strayed) {
      this.since = t;
      this.where = points;
      return null;
    }
    return t - this.since! >= RESTS ? { t, ...this.hardest } : null;
  }
}

/**
 * The surfaces of a site, as any body flown there meets them: what stands (the world), the land where it is known,
 * and the frames between the site and the frame that does not turn. One for a flight; the vehicle and everything it
 * sheds are put to the same one.
 */
export class SiteSurfaces {
  readonly world: SiteWorld;
  readonly site: Site;
  readonly frame: EarthFrame;
  readonly ground: Ground | null;
  /** Where the page draws a body above the point flown while the vehicle is still let down off its launcher's support. */
  readonly stand: Vec3;
  /** The sea's level in the site's frame, m: land under it is the sea's bed. */
  readonly sea: number;

  constructor(world: SiteWorld, site: Site, frame: EarthFrame, options: { ground?: Ground | null; stand?: Vec3; seaLevel?: number } = {}) {
    this.world = world;
    this.site = site;
    this.frame = frame;
    this.ground = options.ground ?? null;
    this.stand = options.stand ?? [0, 0, 0];
    this.sea = options.seaLevel === undefined ? Number.NEGATIVE_INFINITY : options.seaLevel - site.height;
  }

  /** A point of the frame that does not turn, in the site's frame as the page draws a body there at `t`. */
  drawn(p: Vec3, t: number): Vec3 {
    return add(ecefToSite(this.site, this.frame.toFixed(p, t)), scale(this.stand, 1 - smooth(t / SETTLES)));
  }

  /** A direction of the site's frame in the frame that does not turn, at `t`. */
  toward(d: Vec3, t: number): Vec3 {
    return this.frame.toInertial(siteToEcefDirection(this.site, d), t);
  }

  /** The land's height at a place of the site's frame: null where there is none, or where it is the sea's bed. */
  land(x: number, z: number): number | null {
    const ground = this.ground;
    if (!ground || Math.hypot(x, z) > ground.reach) return null;
    const y = ground.at(x, z);
    return y === null || y < this.sea ? null : y;
  }

  /** The land's outward normal at a place, from its slope there. */
  private slope(x: number, z: number, y: number): Vec3 {
    const h = (dx: number, dz: number) => this.land(x + dx, z + dz) ?? y;
    return unit([(h(-SLOPE, 0) - h(SLOPE, 0)) / (2 * SLOPE), 1, (h(0, -SLOPE) - h(0, SLOPE)) / (2 * SLOPE)]);
  }

  /** Where a body is over the ground, for `Lying`: its centre of mass and points `span` m from it along and across it, in the site's frame. */
  placed(pose: { r: Vec3; q: Quat; t: number }, span: number): Vec3[] {
    return [
      this.drawn(pose.r, pose.t),
      this.drawn(add(pose.r, turn(pose.q, [span, 0, 0])), pose.t),
      this.drawn(add(pose.r, turn(pose.q, [0, span, 0])), pose.t),
    ];
  }

  /** How a body is coming down and going over the ground: m/s down the plumb line and across it. */
  coming(pose: { r: Vec3; v: Vec3 }, t: number): { down: number; along: number } {
    const through = sub(pose.v, cross(this.frame.spin, pose.r));
    const down = -dot(through, this.frame.up(pose.r, t));
    return { down, along: Math.sqrt(Math.max(0, dot(through, through) - down * down)) };
  }

  /** Where a body lies on the Earth and how far its long axis leans from the plumb line, degrees. */
  lies(pose: { r: Vec3; q: Quat }, t: number): { latitude: number; longitude: number; lean: number } {
    const here = ecefToGeodetic(this.frame.toFixed(pose.r, t));
    const cos = dot(turn(pose.q, [1, 0, 0]), this.frame.up(pose.r, t));
    return { latitude: here.latitude, longitude: here.longitude, lean: (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI };
  }

  /**
   * One step of a body's flight, from `before` to `after` as it was flown, against the site: `after` as the contacts
   * leave it, what was struck hard enough to say, and whether anything was touched at all. `beads`: its spheres still
   * aboard. `mass`: where its centre of mass is up the stack, its moments about it, and its radius across (`wide`, m).
   * `name`: what a struck piece is called.
   */
  resolve(
    before: ContactPose,
    after: ContactPose,
    beads: readonly HullBead[],
    mass: { centre: number; inertia: Vec3; wide: number },
    name: (key: string) => string | undefined,
  ) {
    let { r, v, q, w } = after;
    const hits: SiteStrike[] = [];
    let touched = false;
    const dt = after.t - before.t;
    if (!(dt > 0) || !beads.length) return { r, v, q, w, hits, touched };
    const { centre, inertia, wide } = mass;
    const said = new Set<string>();
    // where each sphere began the step, and how far the furthest is from the centre of mass
    const froms = beads.map((bead) => this.drawn(point(before, bead.at), before.t));
    const reach = beads.reduce((far, b) => Math.max(far, Math.hypot(b.at[0] - centre, b.at[1], b.at[2]) + b.radius), 0);
    // the spheres to ask: all of them, then those that came near anything, until the answers have moved the body far
    let near: number[] | null = null;
    let moved = 0;
    const all = beads.map((_, i) => i);
    // (several spheres may meet something in one step: each answer is taken before the next is looked for)
    // (the earliest first, for when it happened; then whichever is left deepest, so that none is left in what it met:
    // a sphere left inside a piece is no longer met by it)
    for (let round = 0; round < 12; round++) {
      const now: ContactPose = { ...after, r, v, q, w };
      const found: number[] = [];
      let first: {
        bead: HullBead;
        fraction: number;
        normal: Vec3;
        motion: Vec3;
        key: string;
        node: string;
        into: number;
      } | null = null;
      for (const i of near ?? all) {
        const bead = beads[i]!;
        const from = froms[i]!;
        const to = this.drawn(point(now, bead.at), now.t);
        if (!near) {
          const over = this.land(to[0], to[2]);
          const close =
            (over !== null && to[1] - bead.radius - NEARBY < over) || !this.world.clear(from, to, bead.radius + NEARBY, before.t, now.t);
          if (!close) continue;
          found.push(i);
        }
        const motion = sub(to, from);
        const hit = this.world.sweep(from, to, bead.radius, before.t, now.t);
        if (hit) {
          const into = -dot(motion, hit.normal) * (1 - hit.fraction);
          if (-dot(motion, hit.normal) / dt > 1e-6 && !(first && (round === 0 ? hit.fraction >= first.fraction : into <= first.into)))
            first = { bead, fraction: hit.fraction, normal: hit.normal, motion, key: `${hit.model}/${hit.part}`, node: hit.node, into };
        }
        // and the land under it: met where the sphere's foot, over it as the step began, is under it as it ends
        const under = this.land(to[0], to[2]);
        if (under === null || to[1] - bead.radius >= under) continue;
        const was = from[1] - bead.radius - (this.land(from[0], from[2]) ?? under);
        const is = to[1] - bead.radius - under;
        if (was <= 0) continue;
        const fraction = was / (was - is);
        const normal = this.slope(to[0], to[2], under);
        const into = -dot(motion, normal) * (1 - fraction);
        if (-dot(motion, normal) / dt <= 1e-6) continue;
        if (first && (round === 0 ? fraction >= first.fraction : into <= first.into)) continue;
        first = { bead, fraction, normal, motion, key: LAND.key, node: LAND.key, into };
      }
      near ??= found;
      if (!first) break;
      touched = true;
      const t = before.t + dt * first.fraction;
      const normal = this.toward(first.normal, t);
      // How the sphere is going as the surface sees it, from the state as the answers so far have left it (not from
      // where the step put it: a blow already answered has changed the velocity and not the place): the velocity of
      // its centre, as the body goes and turns, less the ground's own; into the surface, and its point of contact
      // along it, which the turning of the body about the sphere's centre carries too.
      const spin = turn(now.q, now.w);
      const centred = point(now, first.bead.at);
      const going = sub(add(now.v, cross(spin, sub(centred, now.r))), cross(this.frame.spin, centred));
      const closing = -dot(going, normal);
      const rim = add(going, cross(spin, scale(normal, -first.bead.radius)));
      const slide = sub(rim, scale(normal, dot(rim, normal)));
      const element: ContactElement = {
        before: point(before, first.bead.at),
        after: point(now, first.bead.at),
        velocity: now.v,
        radius: first.bead.radius,
        mass: now.mass,
        body: {
          start: point(before, [centre, 0, 0]),
          end: point(now, [centre, 0, 0]),
          q0: before.q,
          q1: now.q,
          w: now.w,
          inertia,
        },
      };
      const answer = strike(element, normal, first.fraction, closing, first.into + SKIN, dt, { slide, friction: FRICTION });
      r = add(r, answer.r);
      // (the blow is on the centre of mass; the point flown, where it is not that, goes as the body's new turning carries it)
      v = add(add(v, answer.v), cross(turn(now.q, answer.w), sub(now.r, point(now, [centre, 0, 0]))));
      w = add(w, answer.w);
      // and its turning is resisted where it touches (`ROLLING`): a torque against the turning, of the push at that
      // share of the body's radius, and no more than stops it
      const turning = length(w);
      if (turning > 1e-9 && answer.impulse > 0) {
        // (about each of the body's own axes by that axis's moment: a tank rolls far more easily than it swings end for end)
        const twist = (ROLLING * wide * answer.impulse) / turning;
        const eased = (k: 0 | 1 | 2): number => {
          const less = inertia[k] > 0 ? Math.abs(w[k] * twist) / inertia[k] : 0;
          return Math.abs(w[k]) <= less ? 0 : w[k] - Math.sign(w[k]) * less;
        };
        w = [eased(0), eased(1), eased(2)];
      }
      q = rotateFor(q, answer.w, dt * (1 - first.fraction));
      // (an answer that has moved the body far may have brought a sphere to something it was nowhere near: ask them all again)
      moved += length(answer.r) + length(answer.w) * dt * (1 - first.fraction) * reach;
      if (moved > NEARBY) {
        near = null;
        moved = 0;
      }
      if (answer.speed >= REPORTED && !said.has(first.key)) {
        said.add(first.key);
        const impact = {
          on: first.key,
          name: first.key === LAND.key ? LAND.name : (name(first.key) ?? first.key.split('/')[1]!),
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
    return { r, v, q, w, hits, touched };
  }

  /**
   * Whether a body within `round` metres of `middle` (a point of it, in the frame that does not turn) at both ends of
   * a step can have met anything: something standing within reach, or the land under it.
   */
  near(a: Vec3, ta: number, b: Vec3, tb: number, round: number): boolean {
    const from = this.drawn(a, ta);
    const to = this.drawn(b, tb);
    const far = this.world.extent + round + length(this.stand);
    if ((length(from) <= far || length(to) <= far) && !this.world.clear(from, to, round, ta, tb)) return true;
    for (const p of [from, to]) {
      const under = this.land(p[0], p[2]);
      // (the land may rise as far as the body reaches sideways: a slope of one in one is steeper than anything walked on)
      if (under !== null && p[1] - round < under + round) return true;
    }
    return false;
  }
}

/**
 * The ground under a place as a live simulator comes down on it (vehicle.ts, stagedlive.ts and shed.ts `floor`), m
 * above the sea: `flat`, the simulator's own (forces.ts `floorAt`: the pad's level near it, the sea beyond), lowered to
 * the land where the land is known and lies lower, so that nothing lands in the air over a pit or beside a stand.
 * Within the vehicle's own width of where it stood it is left as it was: that level is what the vehicle stood on.
 * `under`: how far under the land the floor is put where there is land, m: for what is to come down on the land by
 * contact and lie there (what a vehicle has shed), the floor is only what is under it.
 */
export function floorOver(
  contact: () => SiteContact | null,
  flat: (latitude: number, longitude: number) => number,
  under = 0,
): (latitude: number, longitude: number) => number {
  return (latitude, longitude) => {
    const level = flat(latitude, longitude);
    const c = contact();
    const s = c?.surfaces;
    if (!c || !s?.ground) return level;
    const p = ecefToSite(s.site, geodeticToEcef({ latitude, longitude, height: s.site.height }));
    const out = Math.hypot(p[0], p[2]);
    if (out < c.wide || out > s.ground.reach) return level;
    const land = s.ground.at(p[0], p[2]);
    if (land === null) return level;
    // (the land's height above the sea; under the sea, the sea)
    const above = land - s.sea;
    return above <= 0 ? 0 : Math.max(0, Math.min(level, above) - under);
  };
}

export class SiteContact {
  readonly beads: readonly HullBead[];
  readonly surfaces: SiteSurfaces;
  private readonly names: ReadonlyMap<string, string>;
  /** The furthest any sphere reaches from the stack's axis, m. */
  readonly wide: number;
  /** The vehicle's attitude at liftoff, by which the model's own sideways is the body's. */
  readonly standing: Quat;
  private readonly lying = new Lying();

  /**
   * `hull`: the flown model's solids. `standing`: the vehicle's attitude at liftoff (body to the frame that does not
   * turn), by which the model's own sideways is the body's. `flight` gives where the model stands and its datum.
   * `ground`: the land there, where it is known.
   */
  constructor(
    flight: Flight,
    world: SiteWorld,
    hull: SolidModel,
    site: Site,
    frame: EarthFrame,
    standing: Quat,
    ground: Ground | null = null,
  ) {
    const def = flight.models.find((m) => m.id === flight.flies?.model);
    const home = def?.position ?? [0, 0, 0];
    const datum = flight.flies?.datum ?? home[1];
    const seaLevel = flight.site?.seaLevel.value;
    this.surfaces = new SiteSurfaces(world, site, frame, {
      ground,
      stand: [home[0], home[1] - datum, home[2]],
      ...(seaLevel === undefined ? {} : { seaLevel }),
    });
    this.standing = standing;
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
    this.wide = beads.reduce((far, b) => Math.max(far, Math.hypot(b.at[1], b.at[2]) + b.radius), 0);
    this.names = new Map(flight.models.flatMap((m) => m.parts.map((p) => [`${m.id}/${p.node}`, p.name] as const)));
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
   * contacts leave it, what was struck hard enough to say, and `rest` once it has lain still on what it met (`Lying`).
   * `gone`: whether a node of the model has left the vehicle.
   */
  meet(before: ContactPose, after: ContactPose, gone: (node: string) => boolean = () => false) {
    const none = { r: after.r, v: after.v, q: after.q, w: after.w, hits: [] as SiteStrike[], rest: null as Rest | null };
    const dt = after.t - before.t;
    if (!(dt > 0)) return none;
    const aboard = this.beads.filter((b) => !gone(b.node));
    if (!aboard.length) return none;
    // nothing within reach of the whole hull this step: one question, not one a sphere
    let low = Infinity;
    let high = -Infinity;
    let wide = 0;
    for (const b of aboard) {
      low = Math.min(low, b.at[0] - b.radius);
      high = Math.max(high, b.at[0] + b.radius);
      wide = Math.max(wide, Math.hypot(b.at[1], b.at[2]) + b.radius);
    }
    const middle: Vec3 = [(low + high) / 2, 0, 0];
    const round = Math.hypot((high - low) / 2, wide);
    const s = this.surfaces;
    if (!s.near(point(before, middle), before.t, point(after, middle), after.t, round)) {
      this.lying.note(after.t, false, [], 0, 0);
      return none;
    }
    const met = s.resolve(before, after, aboard, { ...this.massOf(after, aboard), wide }, (key) => this.names.get(key));
    const coming = s.coming(before, before.t);
    const rest = this.lying.note(after.t, met.touched, s.placed({ ...met, t: after.t }, round), coming.down, coming.along);
    // (lying down on what it struck, it knocks on it again and again: those are not said)
    const hits = this.lying.touching ? met.hits.filter((h) => h.speed >= SETTLING) : met.hits;
    return { r: met.r, v: met.v, q: met.q, w: met.w, hits, rest };
  }

  /** Where the vehicle lies and how it leans, for the landing a rest is (`SiteSurfaces.lies`). */
  lies(pose: { r: Vec3; q: Quat }, t: number) {
    return this.surfaces.lies(pose, t);
  }
}

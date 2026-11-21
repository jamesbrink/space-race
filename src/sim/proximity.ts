/**
 * Several craft of one run flown together where they are near one another (simulator.md, "Several craft in one run"):
 * from a parting, through the record's crew flying a docking (`Action.dock`, `FormedDef.approach`) to its capture and
 * hard joint, and on through what the joined craft does until the run leaves it to the coast. Each craft is a rigid body
 * on the run's own gravity (`FlightPlan.gravity`, sim/core/gravity.ts), its bodies laid along one axis (`BodyDef.rigid`);
 * each has its own machine (sim/components.ts `viewOf`: its own bodies aboard and its own attitude, the hardware and the
 * record's events shared, since no two craft hold the same), and each event is done by the craft holding what it names
 * (`holderOf`).
 *
 * - A parting splits a craft in two by its pieces' masses and centres (forces.ts `part`): each keeps the velocity it had
 *   as part of the turning whole and the joint's push is shared by the masses (`keptShare`), so momentum is what it was.
 * - A formed joint is captured by the physics (sim/docking.ts `DockPair`: `attempt`, its momentum-kept capture and its
 *   draw to the hard joint); once hard the two are one craft, at the pair's centre of mass with its momentum, its bodies
 *   laid along the passive craft's axis.
 * - The record's crew fly the approach (`approachInput`): backed away, turned end for end, held off, then closed at the
 *   record's rate, timed to touch at the record's instant. Its gains are estimated, as every record crew's behaviour is
 *   (the plan's decision 7); its figures are the record's. A hand flying it is the live half's (not yet).
 *
 * Simplified: each craft's moments of inertia are the diagonal of its bodies' along its axis (no products of inertia, no
 * centre off the axis, a joined craft's taken in the passive craft's axes); what the thrusters burn is not taken off; no
 * engine is lit here (one that is throws: the coast's to fly); no air (above the thick air the drag on two craft metres
 * apart is the same, and over the minutes flown here it moves them less than the record's precision); the docking
 * mechanism's own loads beyond the capture and the draw are DockPair's.
 */
import type { EarthFrame } from '../world/earthframe.ts';
import { add, cross, dot, length, scale, sub, type Vec3 } from '../world/frames.ts';
import { hermite, type State } from '../world/orbit.ts';
import { componentsOf, craftHolding, followedOf, holderOf, type Piece, viewOf } from './components.ts';
import { fieldFor, stepIn } from './core/gravity.ts';
import { type CraftState, due, fire, form, part as partJoint, type Sense } from './craft.ts';
import { coastBody, type DockBody, DockPair, portGap, type Stepper } from './docking.ts';
import { part as partBody } from './forces.ts';
import type { BodyDef, FlightPlan, FormedDef, JointDef, ThrusterSet } from './plan.ts';
import { aboutAxis, conjugate, fromAxes, IDENTITY, multiply, normalize, type Quat, turn, unturn } from './rigid.ts';

const X: Vec3 = [1, 0, 0],
  Y: Vec3 = [0, 1, 0],
  Z: Vec3 = [0, 0, 1],
  ZERO: Vec3 = [0, 0, 0];
const DEG = Math.PI / 180;

/** A body as it lies in a craft: its centre of mass, m along the craft's axis from the craft's origin; its own axes in the craft's; its mass, kg. */
export interface Laid {
  body: string;
  station: number;
  turn: Quat;
  mass: number;
}

/** A craft as a rigid body: its centre of mass's state, its attitude (+X its long axis) and rates in its own axes, and its bodies. */
export interface Rigid extends State {
  q: Quat;
  w: Vec3;
  laid: Laid[];
}

/** One instant of a craft's track. */
export interface CraftSample extends State {
  t: number;
  q: Quat;
  w: Vec3;
  mass: number;
}

/** A craft over the time it was what it was: its bodies, from when to when, and its samples. */
export interface CraftTrack {
  id: string;
  bodies: readonly string[];
  from: number;
  until: number;
  samples: CraftSample[];
}

/** A docking captured: when, which joint, the ports as they met (docking.ts `portGap`), and when it was hard. */
export interface Capture {
  joint: string;
  t: number;
  hard: number;
  closing: number;
  offset: number;
  tilt: number;
  roll: number;
}

export interface ProximityFlown {
  tracks: CraftTrack[];
  /** The machine at the end. */
  state: CraftState;
  /** Each craft as it is at the end, by its id, with the attitude its machine holds. */
  crafts: { piece: Piece; rigid: Rigid; attitude: string }[];
  /** Each of the plan's events that happened, and when. */
  events: { event: string; t: number; craft: string }[];
  captures: Capture[];
  /** Each parting, the masses on its two sides and their momentum before and after, for the tests. */
  partings: { joint: string; t: number; kept: string; gone: string }[];
  t: number;
}

/** Where a craft flown here begins: its bodies' masses and the state and attitude of the whole. */
export interface CraftStart extends State {
  bodies: readonly string[];
  q: Quat;
  w?: Vec3;
  attitude?: string;
}

const bodyOf = (plan: FlightPlan, id: string): BodyDef => {
  const b = plan.craft.flatMap((c) => c.bodies).find((x) => x.id === id);
  if (!b) throw new Error(`no body '${id}' in the plan`);
  return b;
};
const rigidOf = (plan: FlightPlan, id: string) => {
  const r = bodyOf(plan, id).rigid;
  if (!r) throw new Error(`body '${id}' has no \`rigid\`: it cannot be flown as part of a rigid craft`);
  return r;
};

/** A craft's mass, kg; its centre of mass, m along its axis; and its moments about its own axes there, kg m^2 (the diagonal). */
export function massOf(plan: FlightPlan, laid: readonly Laid[]): { mass: number; centre: number; inertia: Vec3 } {
  const mass = laid.reduce((m, l) => m + l.mass, 0);
  const centre = laid.reduce((c, l) => c + l.mass * l.station, 0) / mass;
  let inertia: Vec3 = ZERO;
  for (const l of laid) {
    const def = bodyOf(plan, l.body);
    const units = l.mass / (def.count * def.mass.value);
    const [roll, pitch, yaw] = rigidOf(plan, l.body).inertia.map((m) => m.value * def.count * units) as [number, number, number];
    // (the body's own moments turned into the craft's axes, the diagonal kept; the parallel axes across the craft's)
    const own = (axis: Vec3): number => {
      const u = unturn(l.turn, axis);
      return roll * u[0] ** 2 + pitch * u[1] ** 2 + yaw * u[2] ** 2;
    };
    const d = (l.station - centre) ** 2 * l.mass;
    inertia = add(inertia, [own(X), own(Y) + d, own(Z) + d]);
  }
  return { mass, centre, inertia };
}

/** A craft's bodies laid as they stood on the pad, each its own mass (kg, by body id). */
export function laidOf(plan: FlightPlan, bodies: readonly string[], masses: Readonly<Record<string, number>>): Laid[] {
  return bodies.map((id) => ({
    body: id,
    station: rigidOf(plan, id).centre.value,
    turn: IDENTITY,
    mass: masses[id] ?? bodyOf(plan, id).mass.value * bodyOf(plan, id).count,
  }));
}

/** A port of a formed joint in its craft: where its ring is from the craft's centre (along the craft's axes), which way it faces, its key. */
function portIn(plan: FlightPlan, rigid: Rigid, j: FormedDef, side: 0 | 1) {
  const p = j.ports[side];
  const l = rigid.laid.find((x) => x.body === p.body);
  if (!l) throw new Error(`the port's body '${p.body}' is not in the craft`);
  const { centre } = massOf(plan, rigid.laid);
  const along = p.station.value - rigidOf(plan, p.body).centre.value;
  const at = add([l.station - centre, 0, 0], turn(l.turn, [along, 0, 0]));
  const normal = turn(l.turn, [p.faces, 0, 0]);
  const key = turn(l.turn, turn(aboutAxis(X, p.clock.value * DEG), Z));
  return { at, normal, key };
}

/** The docking body of a craft for its port: +Y out of the ring, +Z its key, its moments about those axes. */
function dockBodyOf(plan: FlightPlan, rigid: Rigid, j: FormedDef, side: 0 | 1): { body: DockBody; frame: Quat } {
  const { at, normal, key } = portIn(plan, rigid, j, side);
  const frame = fromAxes(cross(normal, key), normal, key);
  const { mass, inertia } = massOf(plan, rigid.laid);
  const about = (axis: Vec3) => {
    const u = turn(frame, axis);
    return inertia[0] * u[0] ** 2 + inertia[1] * u[1] ** 2 + inertia[2] * u[2] ** 2;
  };
  return {
    frame,
    body: {
      r: rigid.r,
      v: rigid.v,
      q: normalize(multiply(rigid.q, frame)),
      w: unturn(frame, rigid.w),
      mass,
      inertia: [about(X), about(Y), about(Z)],
      port: dot(at, normal),
    },
  };
}

/** A craft from its docking body again. */
const fromDock = (b: DockBody, frame: Quat, laid: Laid[]): Rigid => ({
  r: b.r,
  v: b.v,
  q: normalize(multiply(b.q, conjugate(frame))),
  w: turn(frame, b.w),
  laid,
});

/** The estimated gains of the record crew's approach (from sim/approach.ts `transpositionInput`, which flies the docking chapter's). */
const GAINS = { place: 0.1, speed: 0.65, attitude: 0.12, rate: 0.85 };

/**
 * What the record's crew command on the active craft of a docking (`FormedDef.approach`), in its docking body's axes: a
 * force and a torque, within what its thrusters give (`ThrusterSet.push`, `.torque`). `begun`: when the approach began;
 * `gap`: where the active craft's centre then was off the passive port, m along its normal; `key`: their keys' angle then.
 */
export function approachInput(
  pair: DockPair,
  j: FormedDef,
  set: ThrusterSet,
  begun: { t: number; gap: number; key: number },
): { force: Vec3; torque: Vec3 } {
  const ap = j.approach!;
  const [a, b] = pair.bodies;
  const age = pair.t - begun.t;
  const ring = add(b.r, turn(b.q, [0, b.port, 0]));
  const rel = unturn(b.q, sub(a.r, ring));
  const relv = unturn(b.q, sub(a.v, b.v));
  const departing = ap.departing.value;
  const separation = a.port + ap.standOff.value;
  const backedAway = begun.gap + departing * (Math.max(0, age - 5) + Math.min(5, Math.max(0, age)) ** 2 / 10);
  const finalDistance = a.port + pair.limits.stroke + Math.max(0, ap.contact.value - pair.t) * ap.closing.value;
  const desired = Math.min(separation, backedAway, finalDistance);
  const speed = desired === finalDistance ? -ap.closing.value : desired === separation ? 0 : departing * Math.min(1, age / 5);
  const accel = add(scale(sub([0, desired, 0], rel), GAINS.place), scale(sub([0, speed, 0], relv), GAINS.speed));
  let force = unturn(a.q, turn(b.q, scale(accel, a.mass)));
  const most = set.push?.value ?? 0;
  if (length(force) > most) force = scale(force, most / length(force));
  // (turned end for end about the passive's +Z once `turnAfter` has passed; the key kept as it was until the turn is
  // nearly made, then brought to the passive's)
  const relq = multiply(conjugate(b.q), a.q);
  const pitch = age < ap.turnAfter.value ? 0 : Math.PI;
  const keyed = age < ap.turnAfter.value || Math.abs(relq[0]) > 0.1 ? begun.key : 0;
  const goal = multiply(b.q, multiply(aboutAxis(Z, pitch), aboutAxis(Y, keyed)));
  const error = multiply(conjugate(a.q), goal);
  const caps = set.torque
    ? [
        Math.min(set.torque.pitch.value, set.torque.yaw.value),
        set.torque.roll.value,
        Math.min(set.torque.pitch.value, set.torque.yaw.value),
      ]
    : [0, 0, 0];
  const torque = [0, 1, 2].map((i) => {
    const want = a.inertia[i]! * (GAINS.attitude * Math.sign(error[0] || 1) * error[i + 1]! - GAINS.rate * a.w[i]!);
    return Math.max(-caps[i]!, Math.min(caps[i]!, want));
  }) as unknown as Vec3;
  return { force, torque };
}

/** The angle about +Y from the passive's key to the active's, radians, of a pair as it stands. */
const keyAngle = (a: DockBody, b: DockBody): number => {
  const relq = multiply(conjugate(b.q), a.q);
  return 2 * Math.atan2(relq[2], relq[0]);
};

/** The craft a joint lets go splits from the one it is in: the two pieces by their bodies, pushed apart at the joint's push. */
export function splitRigid(plan: FlightPlan, whole: Rigid, kept: readonly string[], gone: readonly string[], push: number): [Rigid, Rigid] {
  const all = massOf(plan, whole.laid);
  const leaving = whole.laid.filter((l) => gone.includes(l.body));
  const staying = whole.laid.filter((l) => kept.includes(l.body));
  const g = massOf(plan, leaving);
  const out = partBody(
    { r: whole.r, v: whole.v, q: whole.q, w: whole.w, mass: all.mass, centre: all.centre },
    { mass: g.mass, centre: g.centre },
    push,
  );
  return [
    { r: out.kept.r, v: out.kept.v, q: whole.q, w: whole.w, laid: staying },
    { r: out.gone.r, v: out.gone.v, q: whole.q, w: whole.w, laid: leaving },
  ];
}

/** Two craft joined hard: one, at the pair's centre of mass with its momentum, the active's bodies laid along the passive's axis. */
function joined(plan: FlightPlan, pair: DockPair, frames: [Quat, Quat], laid: [Laid[], Laid[]]): Rigid {
  const [a, b] = pair.bodies;
  const active = fromDock(a, frames[0], laid[0]);
  const passive = fromDock(b, frames[1], laid[1]);
  const [ma, mb] = [a.mass, b.mass];
  const r = scale(add(scale(a.r, ma), scale(b.r, mb)), 1 / (ma + mb));
  const v = scale(add(scale(a.v, ma), scale(b.v, mb)), 1 / (ma + mb));
  const centreB = massOf(plan, laid[1]).centre;
  const centreA = massOf(plan, laid[0]).centre;
  const into = multiply(conjugate(passive.q), active.q);
  const axisB = turn(passive.q, X);
  const moved = laid[0].map((l) => {
    const place = add(active.r, turn(active.q, [l.station - centreA, 0, 0]));
    return { ...l, station: centreB + dot(sub(place, passive.r), axisB), turn: normalize(multiply(into, l.turn)) };
  });
  const all = [...laid[1], ...moved].sort((x, y) => order(plan, x.body) - order(plan, y.body));
  // (the joined craft's origin is the passive's: its centre of mass moves to the pair's, which is where `r` is)
  return { r, v, q: passive.q, w: passive.w, laid: all };
}

const order = (plan: FlightPlan, id: string) => plan.craft.flatMap((c) => c.bodies).findIndex((b) => b.id === id);

/** The next instant the clock sets one of the plan's events off, after `t`, among those not yet happened. */
function nextClock(plan: FlightPlan, s: CraftState, t: number): number {
  let next = Infinity;
  for (const e of plan.events) {
    if (s.fired[e.id] !== undefined || (e.armed === false && s.armed[e.id] === undefined)) continue;
    let at = Number.NEGATIVE_INFINITY;
    let clocked = true;
    for (const w of e.when) {
      if ('time' in w) at = Math.max(at, w.time);
      else if ('after' in w) {
        const was = s.fired[w.after];
        if (was === undefined) clocked = false;
        else at = Math.max(at, was + (w.wait ?? 0));
      } else clocked = false;
    }
    if (clocked && at > t + 1e-9 && at < next) next = at;
  }
  return next;
}

/** How long a step is, s: a quarter of a second while a pair is being flown or two craft are within `NEAR`, else `FAR_STEP`. */
export const NEAR_STEP = 0.25;
export const FAR_STEP = 5;
const NEAR = 2000;

/**
 * Fly the craft from `start` (each by its bodies, at its state; the machine as `state` has it, at `t0`) to `until`, s
 * from liftoff, keeping each craft's track every `every` s and at every event. `frame`: the flight's, for the heights
 * the triggers read and the field the plan's gravity names.
 */
export function flyProximity(
  plan: FlightPlan,
  frame: EarthFrame,
  t0: number,
  state: CraftState,
  start: readonly CraftStart[],
  masses: Readonly<Record<string, number>>,
  until: number,
  every = 1,
): ProximityFlown {
  const field = fieldFor(plan.gravity, frame);
  const stepper: Stepper = (s, at, h, push) => stepIn(field, s, at, h, push);
  let s = state;
  let t = t0;
  const joints = new Map(plan.craft.flatMap((c) => c.joints).map((j) => [j.id, j]));
  const sets = new Map(plan.craft.flatMap((c) => c.thrusters).map((x) => [x.id, x]));
  /** Each craft now: its piece, its rigid state (or its side of the pair), its attitude, since when it has been what it is. */
  interface Flying {
    piece: Piece;
    rigid: Rigid;
    attitude: string;
    since: number;
    track: CraftTrack;
  }
  const tracks: CraftTrack[] = [];
  const open = (piece: Piece, rigid: Rigid, attitude: string, since: number): Flying => {
    const track: CraftTrack = { id: piece.id, bodies: piece.bodies, from: since, until: Infinity, samples: [] };
    tracks.push(track);
    return { piece, rigid, attitude, since, track };
  };
  const pieces0 = componentsOf(plan, s, t);
  let flying: Flying[] = start.map((c) => {
    const piece = pieces0.find((p) => p.bodies.includes(c.bodies[0]!));
    if (!piece || piece.bodies.length !== c.bodies.length || !c.bodies.every((b) => piece.bodies.includes(b)))
      throw new Error(`a craft begun with ${c.bodies.join(', ')} is not one of the machine's craft at ${t0} s`);
    return open(piece, { r: c.r, v: c.v, q: c.q, w: c.w ?? ZERO, laid: laidOf(plan, piece.bodies, masses) }, c.attitude ?? s.attitude, t0);
  });
  /** The docking being flown: the pair, which craft are its sides, their frames, how it began; once captured, the craft they are. */
  interface Docking {
    joint: JointDef;
    pair: DockPair;
    sides: [Flying, Flying];
    frames: [Quat, Quat];
    begun: { t: number; gap: number; key: number };
    merged?: Flying;
  }
  // (set in the closures below, so not narrowed to null here)
  let docking = null as Docking | null;
  const events: ProximityFlown['events'] = [];
  const captures: Capture[] = [];
  const partings: ProximityFlown['partings'] = [];
  /** A craft's rigid state now: from the pair where it is a side of the docking, or the two joined where they have been captured. */
  const rigidNow = (f: Flying): Rigid => {
    if (docking?.merged === f)
      return joined(plan, docking.pair, docking.frames, [docking.sides[0].rigid.laid, docking.sides[1].rigid.laid]);
    if (docking) {
      const i = docking.sides.indexOf(f);
      if (i >= 0) return fromDock(docking.pair.bodies[i]!, docking.frames[i as 0 | 1], f.rigid.laid);
    }
    return f.rigid;
  };
  /** Whether the pair flies it (a side of the docking, or what they are once captured). */
  const paired = (f: Flying): boolean => !!docking && (docking.sides.includes(f) || docking.merged === f);
  const sample = (f: Flying, at: number) => {
    const r = rigidNow(f);
    const last = f.track.samples.at(-1);
    if (last && last.t === at) f.track.samples.pop();
    f.track.samples.push({ t: at, r: r.r, v: r.v, q: r.q, w: r.w, mass: massOf(plan, r.laid).mass });
  };
  const keep = (at: number) => {
    for (const f of flying) sample(f, at);
  };
  /** A craft ends being what it was: its last sample is as it was then. */
  const close = (f: Flying, at: number) => {
    sample(f, at);
    f.track.until = at;
  };
  const sense = (f: Flying, at: number): Sense => {
    const r = rigidNow(f);
    const place = frame.place(r.r, at);
    return { t: at, height: place.height, falling: dot(r.r, r.v) < 0, speed: length(r.v), apparent: () => 0, g: 0, held: false };
  };
  /** The machine's events set off by the clock alone that are due at `t`, each on the craft that holds what it names, until none is. */
  const clocked = plan.events.filter((e) => e.when.every((w) => 'time' in w || 'after' in w));
  const events_ = () => {
    for (let round = 0; round < 64; round++) {
      let any = false;
      for (const e of clocked) {
        if (s.fired[e.id] !== undefined) continue;
        const holder = holderOf(plan, s, e, t);
        const f = flying.find((x) => x.piece.id === holder.id);
        if (!f) continue;
        const view = viewOf(s, f.piece, f.since, f.attitude);
        if (!due(plan, view, sense(f, t), (x) => x.id === e.id).length) continue;
        for (const a of e.do)
          if ('ignite' in a || 'throttle' in a)
            throw new Error(
              `event '${e.id}' lights an engine where several craft are flown together (sim/proximity.ts): that is the coast's to fly`,
            );
        const done = fire(plan, view, e.id, t, false);
        // (the shared machine takes what the craft did; its own bodies and attitude are its own)
        s = { ...done.state, bodies: s.bodies, attitude: s.attitude };
        f.attitude = done.state.attitude;
        events.push({ event: e.id, t, craft: f.piece.id });
        any = true;
        for (const a of e.do) {
          if ('separate' in a) parting(a.separate);
          if ('dock' in a) begin(a.dock);
        }
      }
      if (!any) return;
    }
  };
  /** A joint let go parts now, and the craft it held splits by the machine's new pieces. */
  const parting = (id: string) => {
    const j = joints.get(id);
    if (!j || !Number.isFinite(s.joints[id]?.loose ?? Infinity) || Number.isFinite(s.joints[id]?.gone ?? Infinity)) return;
    s = partJoint(plan, s, id, t);
    const after = componentsOf(plan, s, t);
    for (const f of [...flying]) {
      const now = after.filter((p) => p.bodies.some((b) => f.piece.bodies.includes(b)));
      if (now.length < 2) continue;
      if (now.length > 2) throw new Error(`joint '${id}' splits a craft into ${now.length}`);
      if (paired(f)) throw new Error(`joint '${id}' parts a craft being docked`);
      const followed = followedOf(plan, s, t);
      const [keptP, goneP] =
        now[0]!.bodies.includes(followed.bodies[0]!) || !now[1]!.bodies.includes(followed.bodies[0]!)
          ? [now[0]!, now[1]!]
          : [now[1]!, now[0]!];
      const rigid = rigidNow(f);
      const [kept, gone] = splitRigid(plan, rigid, keptP.bodies, goneP.bodies, j.push?.value ?? 0);
      close(f, t);
      flying = flying.filter((x) => x !== f);
      flying.push(open(keptP, kept, f.attitude, t), open(goneP, gone, f.attitude, t));
      partings.push({ joint: id, t, kept: keptP.id, gone: goneP.id });
    }
  };
  /** The record's crew begin a docking: the pair of the two craft its ports are on. */
  const begin = (id: string) => {
    const j = joints.get(id)!;
    const formed = j.formed!;
    const [pa, pb] = formed.ports.map((p) => craftHolding(plan, s, p.body, t));
    const a = flying.find((f) => f.piece.id === pa?.id);
    const b = flying.find((f) => f.piece.id === pb?.id);
    if (!a || !b || a === b) throw new Error(`docking '${id}': its ports are not on two craft flown here`);
    const da = dockBodyOf(plan, a.rigid, formed, 0);
    const db = dockBodyOf(plan, b.rigid, formed, 1);
    const c = formed.capture;
    const pair = new DockPair(
      da.body,
      db.body,
      {
        stroke: c.stroke.value,
        radius: c.radius.value,
        tilt: c.tilt.value * DEG,
        roll: c.roll.value * DEG,
        closing: c.closing.value,
        sideways: c.sideways.value,
        angular: c.angular.value * DEG,
        retract: c.retract.value,
      },
      t,
    );
    pair.stepper = stepper;
    const ring = add(pair.bodies[1].r, turn(pair.bodies[1].q, [0, pair.bodies[1].port, 0]));
    const gap = unturn(pair.bodies[1].q, sub(pair.bodies[0].r, ring))[1];
    docking = { joint: j, pair, sides: [a, b], frames: [da.frame, db.frame], begun: { t, gap, key: keyAngle(...pair.bodies) } };
  };

  keep(t);
  events_();
  keep(t);
  let nextKeep = t + every;
  while (t < until - 1e-9) {
    const near = !!docking || flying.some((f, i) => flying.some((g, k) => k > i && length(sub(rigidNow(f).r, rigidNow(g).r)) < NEAR));
    const h = Math.min(near ? NEAR_STEP : FAR_STEP, until - t, nextClock(plan, s, t) - t, nextKeep - t);
    if (docking) {
      const d = docking;
      const set = sets.get(d.joint.formed!.approach!.by)!;
      const flown =
        d.pair.phase === 'free' && !d.merged ? approachInput(d.pair, d.joint.formed!, set, d.begun) : { force: ZERO, torque: ZERO };
      d.pair.advanceBoth(h, [flown.force, ZERO], [flown.torque, ZERO]);
    }
    for (const f of flying) {
      if (paired(f)) continue;
      const { inertia, mass } = massOf(plan, f.rigid.laid);
      const body: DockBody = { r: f.rigid.r, v: f.rigid.v, q: f.rigid.q, w: f.rigid.w, mass, inertia, port: 0 };
      coastBody(body, t, h, ZERO, ZERO, stepper);
      f.rigid = { ...f.rigid, r: body.r, v: body.v, q: body.q, w: body.w };
    }
    t += h;
    if (docking) {
      const d = docking;
      if (!d.merged && d.pair.phase === 'free') {
        const gap = portGap(...d.pair.bodies);
        if (d.pair.attempt()) {
          captures.push({ joint: d.joint.id, t, hard: Infinity, closing: gap.closing, offset: gap.offset, tilt: gap.tilt, roll: gap.roll });
          s = form(plan, s, d.joint.id, t);
          // (from capture the two are one craft in the machine; the pair flies them until the joint is hard)
          const piece = craftHolding(plan, s, d.sides[0].piece.bodies[0]!, t)!;
          for (const f of d.sides) {
            close(f, t);
            f.rigid = rigidNow(f);
          }
          flying = flying.filter((f) => !d.sides.includes(f));
          d.merged = open(piece, joined(plan, d.pair, d.frames, [d.sides[0].rigid.laid, d.sides[1].rigid.laid]), d.sides[1].attitude, t);
          flying.push(d.merged);
          keep(t);
        }
      }
      if (d.merged && d.pair.phase === 'hard') {
        d.merged.rigid = rigidNow(d.merged);
        captures.at(-1)!.hard = t;
        docking = null;
      }
    }
    if (t >= nextKeep - 1e-9) {
      keep(t);
      nextKeep = t + every;
    }
    const fired = events.length;
    events_();
    if (events.length > fired) keep(t);
  }
  if (docking) throw new Error(`the docking by '${docking.joint.id}' was still being flown at ${until} s`);
  for (const f of flying) close(f, t);
  return {
    tracks,
    state: s,
    crafts: flying.map((f) => ({ piece: f.piece, rigid: f.rigid, attitude: f.attitude })),
    events,
    captures,
    partings,
    t,
  };
}

/** A craft's state at `t` on its tracks, by any body of it: the track that held the body then, between its samples. */
export function craftAt(tracks: readonly CraftTrack[], body: string, t: number): CraftSample | undefined {
  const track = tracks.find((k) => k.bodies.includes(body) && t >= k.from - 1e-9 && t <= k.until + 1e-9 && k.samples.length);
  if (!track) return undefined;
  const xs = track.samples;
  let lo = 0;
  let hi = xs.length - 1;
  if (t <= xs[0]!.t) return xs[0];
  if (t >= xs[hi]!.t) return xs[hi];
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid]!.t <= t) lo = mid;
    else hi = mid;
  }
  const [a, b] = [xs[lo]!, xs[hi]!];
  return { ...a, ...hermite(a.t, a.r, a.v, b.t, b.r, b.v, t), t };
}

/**
 * A flight's run: what the scene, the sound, the cabin, the effects and the Flown panel show of it, whichever kind of
 * flight it is. The record's (`recordOf`: a ballistic flight's plan flown by fly.ts, an orbital one's by staged.ts and
 * made a run its samples' own attitude places), or one being flown by hand, which the decks give as it grows. Nothing
 * here is drawn: viewer/ascent.ts places it in the scene.
 */

import type { ShedBody, Signal, SitedFlight } from '../types.ts';
import { EARTH_ROTATION_RATE, G0, WGS84_A } from '../world/bodies.ts';
import { type EarthFrame, frameOf } from '../world/earthframe.ts';
import { sunPosition } from '../world/ephemeris.ts';
import { add, cross, DEG, dot, geodeticToEcef, length, scale, siteFrame, sub, unit, type Vec3 } from '../world/frames.ts';
import type { State } from '../world/orbit.ts';
import { julianDate, terrestrialTime } from '../world/time.ts';
import { type Afloat, afloatAt, floatOn } from './afloat.ts';
import { skyOf } from './air.ts';
import type { CraftState } from './craft.ts';
import { downOf } from './descent.ts';
import { ballisticOf, flownOnce, type Sample, sampleAt } from './fly.ts';
import { flyLoose, type LooseFlown } from './loose.ts';
import { type CoastContacts, coastEvents, coastOf, shipOf } from './orbital.ts';
import { type Action, clockAt, type EventDef, eventOf, type FlightPlan } from './plan.ts';
import type { Target } from './pursuit.ts';
import { type CoastRotation, conjugate, IDENTITY, multiply, nlerp, type Quat, rotateFor, turn } from './rigid.ts';
import { wavesOf } from './sea.ts';
import { apart, Sheds } from './shed.ts';
import {
  type DrawnDescent,
  descentOf,
  type FlownWhole,
  flyWhole,
  type Held,
  held,
  liftoffEngine,
  recordSamples,
  sequenceOf,
  stagesOf,
} from './staged.ts';
import type { LiveSample } from './vehicle.ts';

/**
 * Something that happened on a run, and when (seconds from liftoff; Infinity for one that has not): one of the plan's
 * events (`event`, its id) with the record's own event at it (`record`, its id) where the plan names one, or an instant
 * of the record's that sets nothing off (a mark: `record` alone).
 */
export interface RunEvent {
  event?: string;
  record?: string;
  t: number;
}

/** A flight for the scene to show: the record's, or one being flown. */
export interface Run {
  /** The nominal mission was interrupted during launch. */
  launchAborted?: boolean;
  /** The frame its samples are in: the flight's (world/earthframe.ts `frameOf`). */
  frame: EarthFrame;
  /** The sample on show at `t`: the last at or before it (the first, before the run's start). */
  at(t: number): Sample;
  /** What happened on it, in order of time: the plan's events by their ids, and the record's instants (`RunEvent`). */
  events: readonly RunEvent[];
  /** When each of the plan's bodies left the vehicle on it, by the body's id: Infinity for one still aboard. */
  bodies: Readonly<Record<string, number>>;
  /** Each of the record's checks with what this run gave for it (the record's run's; a run flown by hand gives `held`). */
  results: readonly Held[];
  /** The line it has flown: its samples, in order of time (viewer/path.ts draws the line flown from them). */
  track(): readonly Sample[];
  /** In order of time. A live run's are `LiveSample`s. */
  samples: readonly Sample[];
  /** When it came down, seconds from liftoff: Infinity until it has. */
  duration: number;
  /** When the engine stopped: Infinity while it burns, -Infinity for one that never did (an abort off the pad, unlit). */
  cutoff: number;
  /** When each of `Flight.flies.drops` left, in their order: Infinity for one still aboard. */
  dropped: number[];
  /** Placed by its samples' own attitude (a flight flown by hand, and an orbital record, whose samples carry it). */
  live: boolean;
  /**
   * Kept on show where it came down after its end (a flight flown by hand: the deck's card beside it). Left out, a run is
   * the record's: after its end the vehicle is not at the site or anywhere in the scene (the booster in the sea, the
   * spacecraft recovered), and `Ascent.gone` says so.
   */
  kept?: boolean;
  /** When each parachute came out: Infinity for one that has not. */
  out: { drogue: number; main: number };
  /** When it first felt a twentieth of a g coming down (sim/loads.ts `ENTRY_G`), where the run says: Infinity, or nothing, for one that has not. */
  entered?: number;
  /**
   * The spacecraft in the sea once it is down, where its flight has a body afloat (`Flight.flies.afloat`, sim/afloat.ts):
   * from its landing it rises and falls on the day's sea, takes in water once its hatch is blown, is held by the record's
   * helicopter and goes under (`afterwards`). The record's run has the record's instants; a run flown by hand its own.
   */
  afloat?: Afloat;
  /** What left as a body of its own with no plan of its own (sim/loose.ts: the hatch), by its index in `Flight.flies.drops`. */
  loose?: (LooseFlown | undefined)[];
  /** When each parachute tore (sim/vehicle.ts `tore`): Infinity, or nothing at all, for one that has not. */
  torn?: { drogue: number; main: number };
  /** When each of `Flight.flies.fires` burns on this run, in their order: its instants, from and to. */
  fires?: { from: number; to: number; earlier?: { from: number; to: number }[] }[];
  /** What it has let go, each flown beside it (sim/shed.ts): a live run's. The record's are made here. */
  sheds?: Sheds;
  /** An orbital flight's bodies down from the ejection, each on its own track, with their parachutes (sim/staged.ts `descentOf`). */
  descent?: DrawnDescent | null;
  /** A flight flown by hand: what it gave for each of the record's checks (by check id), for the Flown panel to set beside the record's run. */
  held?: Record<string, number>;
  /** The craft its manoeuvres in orbit were made on, flown on its own forces (staged.ts `targetOf`): the record's run's. */
  target?: Target;
}

/** What every run answers the same way from its own samples. */
const asked = {
  at(this: Run, t: number): Sample {
    return sampleAt(this.samples, t);
  },
  track(this: Run): readonly Sample[] {
    return this.samples;
  },
};

/** What a run is made of before what it answers is put on it (`runOf`). */
export type RunFields = Omit<Run, 'frame' | 'at' | 'track' | 'events' | 'bodies' | 'results'> &
  Partial<Pick<Run, 'events' | 'bodies' | 'results'>>;

/**
 * A run of a flight from its fields, answering what every run answers: the record's (`recordOf`), or a deck's flight by
 * hand, which grows its samples and sets what has happened as the machine says (`grown`).
 */
export function runOf(flight: SitedFlight, fields: RunFields): Run {
  return { frame: frameOf(flight), events: [], bodies: {}, results: [], ...fields, ...asked };
}

/**
 * What has happened on a flight by its machine's state (sim/craft.ts `CraftState`): each of the plan's events that has
 * fired, when, with the record's event at it, and when each body left. A deck's run is told it as it grows. An event the
 * machine shows done without its having been set off (the live ballistic vehicle's own sequence works its actions) has
 * happened when the last of its deeds was done: every engine it lights lit, every one it cuts out, every joint it parts
 * gone, every parachute it puts out out (an attitude, a throttle or an arming leaves nothing to read, and is not waited
 * for); but never one only a hand's command sets off, one that follows another that has not happened, or one with no
 * deed to read.
 */
export function grown(plan: FlightPlan, craft: CraftState): Pick<Run, 'events' | 'bodies'> {
  const seen: Record<string, number> = { ...craft.fired };
  const done = (a: Action): number[] => {
    if ('ignite' in a) return [craft.engines[a.ignite]?.lit ?? Infinity];
    if ('cut' in a) return [craft.engines[a.cut]?.out ?? Infinity];
    if ('separate' in a) return [craft.joints[a.separate]?.gone ?? Infinity];
    if ('deploy' in a) return [craft.chutes[a.deploy]?.out ?? Infinity];
    if ('release' in a) return [craft.chutes[a.release]?.off ?? Infinity];
    return [];
  };
  for (const e of plan.events) {
    if (seen[e.id] !== undefined) continue;
    if (e.when.some((w) => 'command' in w || ('after' in w && seen[w.after] === undefined))) continue;
    const deeds = e.do.flatMap(done);
    const at = deeds.length ? Math.max(...deeds) : Infinity;
    if (Number.isFinite(at)) seen[e.id] = at;
  }
  const events = plan.events
    .filter((e) => seen[e.id] !== undefined)
    .map((e) => ({ event: e.id, ...(e.record ? { record: e.record.id } : {}), t: seen[e.id]! }));
  return { events: events.sort((a, b) => a.t - b.t), bodies: craft.bodies };
}

/** When each of the plan's bodies left, from when the events that part its joints happened: the first of them. */
function bodiesOf(plan: FlightPlan, events: readonly RunEvent[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const b of plan.craft[0]!.bodies) out[b.id] = Infinity;
  for (const e of events) {
    const def = e.event === undefined ? undefined : eventOf(plan, e.event);
    for (const a of def?.do ?? []) {
      if (!('separate' in a)) continue;
      for (const b of plan.craft[0]!.joints.find((j) => j.id === a.separate)?.gone ?? []) out[b] = Math.min(out[b] ?? Infinity, e.t);
    }
  }
  return out;
}

/** The record's events by the record's ids, when each happened on a run (`Run.events`): what a cabin's lamps read. */
export function recordTimes(events: readonly RunEvent[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of events) if (e.record !== undefined) out[e.record] = e.t;
  return out;
}

/** The two samples either side of `t`, and how far between them it is: both the last, at or past the end. */
export function either<S extends Sample>(samples: readonly S[], t: number): [S, S, number] {
  let lo = 0;
  let hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid]!.t <= t) lo = mid;
    else hi = mid;
  }
  const a = samples[lo]!;
  const b = samples[hi]!;
  if (t >= b.t) return [b, b, 0];
  return [a, b, b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 0];
}

/** Position and velocity at `t` between the run's samples: a cubic Hermite through the two either side. */
export function between<S extends Pick<Sample, 'r' | 'v' | 't'>>(
  samples: readonly S[],
  t: number,
  point: (s: S) => Vec3 = (s) => s.r,
): { r: Vec3; v: Vec3 } {
  let lo = 0;
  let hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid]!.t <= t) lo = mid;
    else hi = mid;
  }
  const a = samples[lo]!;
  const b = samples[hi]!;
  const h = b.t - a.t;
  if (h <= 1e-9 || t <= a.t) return { r: point(a), v: a.v };
  if (t >= b.t) return { r: point(b), v: b.v };
  const s = (t - a.t) / h;
  const [h00, h10, h01, h11] = [2 * s ** 3 - 3 * s ** 2 + 1, s ** 3 - 2 * s ** 2 + s, -2 * s ** 3 + 3 * s ** 2, s ** 3 - s ** 2];
  const r: Vec3 = [0, 1, 2].map((i) => h00 * point(a)[i]! + h10 * h * a.v[i]! + h01 * point(b)[i]! + h11 * h * b.v[i]!) as unknown as Vec3;
  const v: Vec3 = [0, 1, 2].map((i) => a.v[i]! + (b.v[i]! - a.v[i]!) * s) as unknown as Vec3;
  return { r, v };
}

/** A spinning spacecraft can turn many revolutions between orbital samples. Interpolate its
 * commanded attitude, then apply the analytic angular drift from the last impact. */
export function attitudeBetween(a: LiveSample, b: LiveSample, k: number): Quat {
  if (!a.rotation || !b.rotation) return nlerp(a.attitude, b.attitude, k);
  const base = nlerp(multiply(a.attitude, conjugate(a.rotation.delta)), multiply(b.attitude, conjugate(b.rotation.delta)), k);
  return multiply(base, rotateFor(a.rotation.delta, a.rotation.rates, k * (b.t - a.t)));
}

/** Keep the active ascent body's path on both sides of every impulse inside a physics tick.
 * The vehicle supplies its own samples so its centre, drawing datum and attitude stay together. */
export function keepContact<S extends State & { t: number; q: Quat; w: Vec3 }>(
  samples: LiveSample[],
  kept: number,
  before: S,
  free: S,
  hits: readonly { t: number; dv: Vec3; dw: Vec3 }[],
  sample: (state: S) => LiveSample,
): number {
  samples.length = kept;
  if (samples.at(-1)!.t < before.t) samples.push(sample(before));
  let dr: Vec3 = [0, 0, 0];
  let dv: Vec3 = [0, 0, 0];
  let dw: Vec3 = [0, 0, 0];
  let rotation = IDENTITY;
  let previous = before.t;
  // The contact solver sweeps linearly between tick endpoints.
  for (const hit of [...hits].sort((a, b) => a.t - b.t)) {
    const t = Math.min(free.t, Math.max(before.t, hit.t));
    const k = (t - before.t) / (free.t - before.t);
    dr = add(dr, scale(dv, t - previous));
    const r = add(add(before.r, scale(sub(free.r, before.r), k)), dr);
    const v = add(add(before.v, scale(sub(free.v, before.v), k)), dv);
    rotation = rotateFor(rotation, dw, t - previous);
    const q = multiply(nlerp(before.q, free.q, k), rotation);
    const w = add(add(before.w, scale(sub(free.w, before.w), k)), dw);
    const state = { ...free, t, r, v, q, w };
    const incoming = sample(state);
    if (samples.at(-1)!.t < t) samples.push(incoming);
    dv = add(dv, hit.dv);
    dw = add(dw, hit.dw);
    samples.push(sample({ ...state, v: add(v, hit.dv), w: add(w, hit.dw) }));
    previous = t;
  }
  return samples.length;
}

/** Release on the same trajectory the retained spacecraft follows, including at the published-orbit handover.
 * The joint's push is relative speed. Given the retained body's outgoing velocity, the departing body's
 * velocity differs by the full push. A strap-on has its own outward release in `apart`. */
export function orbitalRelease(plan: FlightPlan, def: ShedBody, samples: readonly LiveSample[], t: number, thrust?: number, mass?: number) {
  if (!def.mass || !def.centre || !def.gyration) return null;
  const [a, b, k] = either(samples, t);
  const q = attitudeBetween(a, b, k);
  const axis = turn(q, [1, 0, 0]);
  const w = add(scale(a.rates, 1 - k), scale(b.rates, k));
  const { r, v } = between(samples, t);
  const station = def.centre.value;
  // A riding sample's velocity is the stack base's. In coast it belongs to the capsule COM,
  // while the model datum swings about that COM with the attitude.
  const coasting = !a.riding && length(w) > 0;
  const arm = coasting ? station - dot(sub(a.centre, a.r), a.axis) : station;
  const point = coasting ? between(samples, t, (s) => (s as LiveSample).centre).r : r;
  const m = mass ?? def.mass.value;
  const push = plan.craft[0]!.joints.find((j) => j.id === def.on)?.push ?? def.push;
  return apart(
    def,
    {
      on: def.on,
      t,
      r: add(point, scale(axis, arm)),
      v: add(add(v, turn(q, cross(w, [arm, 0, 0]))), scale(axis, (def.forward ? 1 : -1) * (push?.value ?? 0))),
      q,
      w,
      mass: m,
      roll: m * def.gyration.roll.value ** 2,
      across: m * def.gyration.across.value ** 2,
      centre: station,
    },
    thrust,
  );
}

/** Rebuild the coast's released bodies from this flight, including a re-timed coast after a hand
 * moves a burn. Nearby axial joints are flown together until their contact elements are well clear.
 * The retained trajectory is prescribed in the replay and free to take the impulse on a live run. */
export function coastContacts(
  flight: SitedFlight,
  plan: FlightPlan,
  samples: LiveSample[],
  start: number,
  dropped: number[],
  previous: Sheds | undefined,
  centre: number,
  startRates?: Vec3,
) {
  const sheds = new Sheds(plan, siteFrame(flight.site), flight.site.seaLevel.value, { frame: frameOf(flight) });
  if (previous && previous.activeBrokenAt <= start) sheds.activeBrokenAt = previous.activeBrokenAt;
  const turns: (CoastRotation & { t: number })[] = [];
  if (startRates && length(startRates)) turns.push({ t: start, delta: IDENTITY, rates: startRates });
  function rotation(t: number, incoming = false): CoastRotation | undefined {
    let lo = 0,
      hi = turns.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const when = turns[mid]!.t;
      if (when < t || (!incoming && when === t)) lo = mid + 1;
      else hi = mid;
    }
    const last = turns[lo - 1];
    return last && { delta: rotateFor(last.delta, last.rates, t - last.t), rates: last.rates };
  }
  const pending: { def: ShedBody; t: number }[] = [];
  const near = new Set<string>();
  const flying = new Set<string>();
  const hits: { on: string; name: string; t: number; speed: number; energy: number; detached?: boolean }[] = [];
  for (const def of plan.craft[0]!.sheds ?? []) {
    const index = flight.flies!.drops.findIndex((d) => d.on === def.on);
    const at = dropped[index];
    if (at === undefined || !Number.isFinite(at) || at > samples.at(-1)!.t) continue;
    const old = previous?.get(def.on);
    if (at <= start && old?.from === at) {
      if (at < start) sheds.carry(old.fork(start));
      else sheds.add(old.shedder.release);
      flying.add(def.on);
      if (at === start) near.add(def.on);
    } else if (at >= start) pending.push({ def, t: at });
  }
  pending.sort((a, b) => a.t - b.t);
  const outgoing = either(samples, start)[0];
  const offset = scale(outgoing.axis, centre);
  const pose = (state: State, t: number) => {
    const [a, b, k] = either(samples, t);
    const drift = rotation(t);
    const base = nlerp(a.attitude, b.attitude, k);
    const q = drift ? multiply(base, drift.delta) : base;
    return { ...state, r: add(state.r, offset), t, q, station: centre, centre, w: drift?.rates ?? ([0, 0, 0] as Vec3), mass: a.mass };
  };
  function release(t: number, state: State) {
    while (pending.length && pending[0]!.t <= t + 1e-8) {
      const { def, t: when } = pending.shift()!;
      const p = pose(state, t);
      const sample = {
        ...either(samples, when)[0],
        t: when,
        centre: p.r,
        r: sub(p.r, turn(p.q, [centre, 0, 0])),
        v: p.v,
        attitude: p.q,
        axis: turn(p.q, [1, 0, 0]),
        rates: p.w,
      };
      const out = orbitalRelease(plan, def, [sample], when);
      if (out) {
        sheds.add(out);
        near.add(def.on);
        flying.add(def.on);
      }
    }
  }
  const contacts: CoastContacts = {
    rotation,
    limit(t) {
      const next = pending.find((p) => p.t > t + 1e-8);
      const latest = turns.at(-1);
      const angularStep = latest ? Math.PI / (2 * length(latest.rates)) : Infinity;
      const local = near.size || (pending[0] && pending[0].t <= t + 1e-8);
      return Math.min(next ? next.t - t : Infinity, local ? Math.min(0.1, angularStep) : Infinity);
    },
    advance(before, from, after, to, impulse) {
      release(from, before);
      if (!flying.size) return after;
      const a = pose(before, from);
      let b = pose(after, to);
      let changed = false;
      const torques: { t: number; dw: Vec3 }[] = [];
      for (const on of flying) {
        const run = sheds.get(on)!;
        const last = run.at(to)!;
        if (last.down) {
          flying.delete(on);
          near.delete(on);
          continue;
        }
        const first = run.at(Math.max(run.from, from))!;
        // Sweep relative positions even on a long coast step. A body that left the local
        // encounter returns to the fine step whenever the two trajectories approach again.
        const x = sub(a.r, first.r),
          y = sub(b.r, last.r);
        const delta = sub(y, x);
        const along = Math.max(0, Math.min(1, -dot(x, delta) / (dot(delta, delta) || 1)));
        const size = 10 * (run.shedder.def.to.value - run.shedder.def.from.value + Math.abs(centre - run.shedder.release.centre));
        if (length(add(x, scale(delta, along))) > size) {
          near.delete(on);
          continue;
        }
        near.add(on);
        const met = sheds.meet(a, b, centre, on);
        if (met.hits.length) impulse?.(met.hits[0]!.t, met.hits[0]!.dv);
        changed ||= met.r !== b.r;
        b = { ...b, r: met.r, v: met.v, q: met.q, w: met.w };
        for (const h of met.hits) if (length(h.dw)) torques.push(h);
        for (const h of met.hits) {
          const prev = hits.at(-1);
          if (h.activeBroken || h.broken?.length || !prev || prev.on !== on || h.t - prev.t > 0.5) hits.push(h);
        }
      }
      for (const h of torques.sort((a, b) => a.t - b.t)) {
        const was = rotation(h.t);
        turns.push({ t: h.t, delta: was?.delta ?? IDENTITY, rates: was ? add(was.rates, h.dw) : h.dw });
      }
      hits.push(...sheds.siblings(from, to, flying));
      return !changed ? after : { r: sub(b.r, offset), v: b.v };
    },
  };
  function finish(samples: LiveSample[], times: number[]) {
    for (const def of plan.craft[0]!.sheds ?? []) {
      if (sheds.get(def.on)) continue;
      const i = flight.flies!.drops.findIndex((d) => d.on === def.on);
      const when = times[i];
      if (when === undefined || when < start || when > samples.at(-1)!.t) continue;
      const r = orbitalRelease(plan, def, samples, when);
      if (r) sheds.add(r);
    }
  }
  return { sheds, contacts, hits, finish };
}

/**
 * An orbital flight's record, flown (sim/staged.ts: the ascent on its law, the coast, the first body of the descent) and
 * made a run the scene places by its samples' own attitude, as a flight flown by hand is: so it is `live`, and stays
 * where it came down. What it drops is flown from the instant each leaves, as the plan's `Craft.sheds` give
 * them, from the stack's base along the long axis to each one's centre of mass; the ejection's drop leaves when the run
 * comes down through the ejection height, not at the record's minute. Made once a flight: it takes a second or so.
 */
const orbitalRuns = new WeakMap<object, Run>();
/**
 * When each of `flies.fires` burns on an orbital flight's run, by the plan's engine it names: a stage's from its lighting
 * to where the run stopped it; the coast's burn (the engine the record's impulse is flown on) between the plan's instants
 * of it, or `retro`'s.
 */
export function firesOf(
  flight: SitedFlight,
  whole: FlownWhole,
  retro?: { on: number; off: number },
  plan: FlightPlan = flight.plan!,
): NonNullable<Run['fires']> {
  const stages = stagesOf(plan);
  const lit = sequenceOf(plan).stages;
  // (a manoeuvre's engine lit several times: each of its fires is its next lighting, in order, orbital.ts `movesOf`; one
  // guidance solved on the flight's target burns for as long as this run had it burn, `OrbitFlown.burns`)
  const moves = shipOf(plan).moves.map((m) => {
    const flown = whole.coast.burns?.find((b) => b.lit === m.lit && b.solved);
    return flown ? { ...m, on: flown.on, off: flown.off } : m;
  });
  const seen = new Map<string, number>();
  return (flight.flies?.fires ?? []).map((f) => {
    const mine = moves.filter((m) => m.engine === f.on);
    if (plan.craft[0]!.engines.find((e) => e.id === f.on)?.flown) {
      const coast = retro ?? coastOf(plan);
      return { from: coast.on, to: coast.off, ...(mine.length ? { earlier: mine.map((m) => ({ from: m.on, to: m.off })) } : {}) };
    }
    if (mine.length) {
      const k = seen.get(f.on) ?? 0;
      seen.set(f.on, k + 1);
      const m = mine[k];
      return m ? { from: m.on, to: m.off } : { from: Infinity, to: Infinity };
    }
    const i = stages.findIndex((s) => s.engine.id === f.on);
    return { from: lit[i]?.from ?? Infinity, to: whole.ascent.stops[i] ?? Infinity };
  });
}
const orbitalWholes = new WeakMap<object, FlownWhole>();
/**
 * An orbital flight's record flown once (sim/staged.ts flyWhole, the coast kept every second), whoever asks first: the scene and the Flown panel show the
 * same run. One state from the pad to the ground: the coast begins from the state the ascent left the spacecraft in, and
 * the published orbit is what the run is held against (the flight's mission.md), not what it is put on.
 */
export function orbitalFlown(flight: SitedFlight): FlownWhole {
  const plan = flight.plan!;
  let whole = orbitalWholes.get(plan);
  if (!whole)
    orbitalWholes.set(plan, (whole = flyWhole(plan, siteFrame(flight.site), frameOf(flight), flight.site.seaLevel.value, undefined, 1)));
  return whole;
}
/**
 * The flight's plan as its record's run flew it: with its braking burn where guidance timed it for the landing place
 * (orbital.ts `LandingAim`), and all the clock sets off after it; the flight's own plan where nothing was timed so.
 * What to ask when the record's burn was lit on the run on show (`coastOf`, `shipOf`), in place of `flight.plan`.
 */
export function flownPlan(flight: SitedFlight): FlightPlan {
  return flight.plan!.kind === 'orbital' && flight.flies ? (orbitalFlown(flight).plan ?? flight.plan!) : flight.plan!;
}
export function orbitalRecord(flight: SitedFlight): Run {
  const plan = flight.plan!;
  const had = orbitalRuns.get(plan);
  if (had) return had;
  const site = siteFrame(flight.site);
  const jd = julianDate(flight.launch);
  const whole = orbitalFlown(flight);
  // (the plan as the run flew it: its braking burn where guidance timed it for the landing place, orbital.ts `LandingAim`)
  const flown = whole.plan ?? plan;
  const centre = (flight.flies?.datum ?? 0) + (flown.record?.centre?.value ?? 0);
  const samples = recordSamples(flown, whole, frameOf(flight), centre, (t) => sunPosition(terrestrialTime(jd + t / 86_400)));
  const end = samples[samples.length - 1]!;
  const ejected = whole.coast.results.ejectionAt;
  // (what the pilot's ejection lets go, by the joints it parts, leaves at the run's own instant of it)
  const ejection = eventOf(flown, downOf(flown)?.ejection ?? '');
  const ejecting = new Set(ejection?.do.flatMap((a) => ('separate' in a ? [a.separate] : [])) ?? []);
  // (and what a joint lets go that the run itself times, so long after a cut its guidance made on the state, leaves then)
  const own = partedBy(flown, whole);
  const dropped = flight.flies!.drops.map((d) =>
    d.on && ejecting.has(d.on) && Number.isFinite(ejected) ? ejected : (own.get(d.on?.split('/')[0] ?? '') ?? d.at),
  );
  const sheds = new Sheds(flown, site, flight.site.seaLevel.value, { frame: frameOf(flight) });
  for (const def of flown.craft[0]!.sheds ?? []) {
    const i = flight.flies!.drops.findIndex((d) => d.on === def.on);
    if (i < 0) continue;
    const release = orbitalRelease(flown, def, samples, dropped[i]!);
    if (release) sheds.add(release);
  }
  // (the fire is the first stages': Block E's small flame, 28 m up inside the lattice, is not drawn; a stage's end is the record's cut, or its letting go where it has no cut of its own)
  const stages = sequenceOf(flown).stages;
  const first = stages[1] ?? stages[0]!;
  // (what happened: each of the flown's events at the record's instant of it, or the run's own where it decides it; the record's marks)
  const times = orbitalEvents(flight, whole);
  const events: RunEvent[] = [];
  const told = new Set<string>();
  // (one the record has no instant of, after a braking burn timed for the landing place, as much later as the burn: an
  // entry's bank set off by the clock)
  const later = (e: EventDef): number => {
    if (!whole.plan) return 0;
    const [was, is] = [clockAt(plan, eventOf(plan, e.id)), clockAt(flown, e)];
    return Number.isFinite(was) && Number.isFinite(is) && was < Number.MAX_SAFE_INTEGER ? is - was : 0;
  };
  for (const e of flown.events) {
    const t = e.record ? times[e.record.id] : e.at && e.at.value + later(e);
    if (t === undefined) continue;
    events.push({ event: e.id, ...(e.record ? { record: e.record.id } : {}), t });
    if (e.record) told.add(e.record.id);
  }
  for (const m of flown.record?.marks ?? []) if (!told.has(m.id)) events.push({ record: m.id, t: times[m.id] ?? m.at.value });
  events.sort((a, b) => a.t - b.t);
  const run = runOf(flight, {
    samples,
    duration: end.t,
    cutoff: first.cutAt ?? first.sep,
    dropped,
    live: true,
    out: { drogue: Infinity, main: Infinity },
    sheds,
    fires: firesOf(flight, whole, undefined, flown),
    descent: descentOf(whole, centre, flown.record?.ground?.value),
    events,
    bodies: bodiesOf(flown, events),
    results: held(flown, whole),
    ...(whole.target ? { target: whole.target } : {}),
  });
  if (whole.down) floatUprighting(flight, run);
  orbitalRuns.set(plan, run);
  return run;
}

/**
 * The joints a run parts at an instant of its own, by id: a stage let go so long after a cut its guidance made on the state
 * (the orbit reached: staged.ts `sequenceOf`'s `wait`) is let go that long after the run stopped it, not at the record's
 * instant, which is a figure the run is held to.
 */
export function partedBy(plan: FlightPlan, whole: FlownWhole): Map<string, number> {
  const out = new Map<string, number>();
  sequenceOf(plan).stages.forEach((stage, i) => {
    const stop = whole.ascent.stops[i];
    if (stage.orbit && stage.wait !== null && stage.joint && stop !== undefined && Number.isFinite(stop))
      out.set(stage.joint, stop + stage.wait);
  });
  return out;
}

/**
 * When each event of an orbital flight's record happens on a run of it, by the record's ids (the plan's events' `record`
 * and its marks): the record's instants, but for what the run itself decides. The event that sets the pilot loose is when
 * the run came down through its height, and a body's landing (a mark that `lands` it) where the run put it down. With
 * `hand`, the descent as a hand has it: the modules parting at `parting`; and its braking burn, `burn` (left out, the
 * timer's as recorded; null, none; or the hand's, from `on` to `off`), whose command and lighting come at its start and
 * what that command arms (the timer) never.
 */
export function orbitalEvents(
  flight: SitedFlight,
  whole: FlownWhole,
  hand?: { burn?: { on: number; off: number } | null; parting: number },
): Record<string, number> {
  const plan = flight.plan!;
  const out: Record<string, number> = {};
  const put = (e: EventDef | undefined, t: number) => {
    if (e?.record) out[e.record.id] = t;
  };
  for (const e of plan.events) if (e.record && e.at) out[e.record.id] = e.at.value;
  for (const m of plan.record?.marks ?? []) out[m.id] = m.at.value;
  // A stage its guidance cuts on the state (the orbit reached) stops when the run has it stop, and what the plan lets go so
  // long after that stop follows from there: the record's instants of them are figures the run is held to.
  sequenceOf(plan).stages.forEach((stage, i) => {
    const stop = whole.ascent.stops[i];
    if (!stage.orbit || stop === undefined || !Number.isFinite(stop)) return;
    const engine = stagesOf(plan)[i]!.engine.id;
    put(
      plan.events.find((e) => e.automatic && e.do.some((a) => 'cut' in a && a.cut === engine)),
      stop,
    );
  });
  for (const [joint, at] of partedBy(plan, whole))
    put(
      plan.events.find((e) => e.automatic && e.do.some((a) => 'separate' in a && a.separate === joint)),
      at,
    );
  // A braking burn guidance timed for the landing place (orbital.ts `LandingAim`): its command and all the clock sets off
  // after it happened so much later than the record's instants, which are figures the run is held to.
  if (whole.plan) {
    for (const e of whole.plan.events) {
      const [was, is] = [clockAt(plan, eventOf(plan, e.id)), clockAt(whole.plan, e)];
      if (e.record && Number.isFinite(was) && Number.isFinite(is) && was < Number.MAX_SAFE_INTEGER && is !== was)
        out[e.record.id] = (e.at?.value ?? was) + (is - was);
    }
    const from = Math.min(clockAt(plan, coastEvents(plan).command), clockAt(plan, coastEvents(plan).on));
    for (const m of plan.record?.marks ?? []) if (m.at.value >= from) out[m.id] = m.at.value + whole.coast.results.retroLate;
  }
  // A manoeuvre guidance solved on the flight's target (sim/pursuit.ts) is cut when it has given what was solved.
  for (const b of whole.coast.burns ?? []) if (b.solved) put(eventOf(plan, b.cut), b.off);
  const k = coastEvents(plan);
  if (hand) {
    if (hand.burn !== undefined) {
      for (const e of [k.command, k.on]) put(e, hand.burn?.on ?? Infinity);
      put(k.off, hand.burn?.off ?? Infinity);
      for (const e of k.armed) put(e, Infinity);
    }
    put(k.parting, hand.parting);
  }
  // The barometric switch or manual release starts the descent sequence. Its timers are
  // relative to that occurrence, so use the descent's actual deployment times.
  const ejected = whole.down ? whole.down.ejected : whole.coast.results.ejectionAt;
  put(eventOf(plan, coastOf(plan).loose ?? ''), Number.isFinite(ejected) ? ejected : Infinity);
  if (whole.down) {
    for (const body of downOf(plan)?.bodies ?? [])
      for (const chute of body.chutes) {
        const opening = whole.down.opened[body.id]?.[chute.name];
        if (opening !== undefined) put(eventOf(plan, chute.event), opening);
      }
  }
  for (const m of plan.record?.marks ?? []) {
    const landed = m.lands ? whole.down?.landed[m.lands] : undefined;
    if (landed) out[m.id] = landed.at;
  }
  return out;
}

/**
 * The record's events a hand's taking the descent puts off, by their ids in the record (as `orbitalEvents` gives them):
 * the braking burn's command, lighting and cut and what the command arms, the modules' parting, the event that sets the
 * pilot loose, and the landings.
 */
export function descentRecords(plan: FlightPlan): string[] {
  const k = coastEvents(plan);
  const loose = eventOf(plan, coastOf(plan).loose ?? '');
  return [
    ...[k.command, k.on, k.off, ...k.armed, k.parting, loose].flatMap((e) => (e?.record ? [e.record.id] : [])),
    ...(plan.record?.marks ?? []).flatMap((m) => (m.lands ? [m.id] : [])),
  ];
}

const ballisticRuns = new WeakMap<object, Run>();
/**
 * The record's run of a flight, whichever kind it is, made once a flight: a ballistic flight's plan as fly.ts flies it
 * (`flownOnce`), what leaves with a parachute leaving when the run has it out; an orbital flight's (`orbitalRecord`).
 * Null for a flight with nothing to fly (no plan, or an orbital one with no `flies` to show).
 */
export function recordOf(flight: SitedFlight): Run | null {
  const plan = flight.plan;
  if (!plan) return null;
  if (plan.kind === 'orbital') return flight.flies ? orbitalRecord(flight) : null;
  const had = ballisticRuns.get(plan);
  if (had) return had;
  const roles = ballisticOf(plan);
  const { samples, results, craft } = flownOnce(plan, siteFrame(flight.site), flight.site.seaLevel.value, frameOf(flight));
  const when = (t: number): number => (Number.isFinite(t) ? t : Infinity);
  const out = { drogue: when(results.drogueAt), main: when(results.mainAt) };
  const run = runOf(flight, {
    samples,
    duration: results.duration,
    cutoff: roles.cutoff,
    // (what a parachute lets go leaves when this run has the parachute out, which is not to the second when the record does)
    dropped: (flight.flies?.drops ?? []).map((d) => (d.on === roles.drogue.id ? out.drogue : d.on === roles.main.id ? out.main : d.at)),
    live: false,
    out,
    entered: when(results.entryAt),
    ...grown(plan, craft),
    results: (flight.checks ?? []).map((c) => ({
      id: c.id,
      label: c.label,
      value: c.value,
      unit: c.unit,
      tolerance: c.tolerance,
      got: results[c.id],
    })),
  });
  afterwards(flight, run);
  ballisticRuns.set(plan, run);
  return run;
}

/**
 * The engines lit on the ground, heard and felt as one (sound/, viewer/effects.ts): their thrust at sea level, N, the
 * exhaust's speed, m/s, and their exit area, m^2. A ballistic plan's is its booster's engine (its sea-level figures, its
 * vacuum ones where it gives none); an orbital one's every stage lit on the pad together (staged.ts `liftoffEngine`).
 * Null for no plan.
 */
export function liftoffOf(plan: FlightPlan | undefined): { thrust: number; exhaustSpeed: number; exitArea: number } | null {
  if (!plan) return null;
  if (plan.kind === 'orbital') return liftoffEngine(plan);
  const e = ballisticOf(plan).engine;
  return {
    thrust: (e.thrust.seaLevel ?? e.thrust.vacuum).value,
    exhaustSpeed: (e.isp!.seaLevel ?? e.isp!.vacuum).value * G0,
    exitArea: e.exitArea?.value ?? 0,
  };
}

/**
 * The spacecraft's own braking burn on a run, where it has one lit: when each of its motors lit, how long each burns, s,
 * each one's thrust, N, and the mass it brakes, kg (what is left once it has burned and gone). A ballistic flight's
 * retrorockets, the first at its lighting on the run (`Run.events`) and the rest on their own timer; an orbital flight's
 * engine that flies the record's impulse (`EngineDef.flown`), from when the run has it burn (`Run.fires`) at its thrust
 * (the impulse over the burn where the record gives no thrust).
 */
export function brakingOf(
  flight: SitedFlight,
  run: Run,
): { fires: number[]; burn: number; durations?: number[]; thrust: number; mass: number } | null {
  const plan = flight.plan;
  if (!plan) return null;
  if (plan.kind === 'ballistic') {
    const b = ballisticOf(plan);
    const lit = b.retro ? run.events.find((e) => e.event === b.retro!.id)?.t : undefined;
    const motor = b.motors[0];
    if (lit === undefined || !Number.isFinite(lit) || !motor?.burn) return null;
    return {
      fires: b.retroWaits.map((w) => lit + w),
      burn: motor.burn.value,
      thrust: motor.thrust.vacuum.value,
      mass: b.packJoint?.after?.value ?? 0,
    };
  }
  const braking = plan.craft[0]!.engines.find((e) => e.flown);
  const k = braking ? (flight.flies?.fires ?? []).findIndex((f) => f.on === braking.id) : -1;
  const burn = k >= 0 ? run.fires?.[k] : undefined;
  if (!braking || !burn) return null;
  const intervals = [...(burn.earlier ?? []), burn].filter((b) => Number.isFinite(b.from) && b.to > b.from);
  if (!intervals.length) return null;
  const last = intervals[intervals.length - 1]!;
  const seconds = last.to - last.from;
  const mass = plan.record?.orbit?.mass.value ?? 0;
  return {
    fires: intervals.map((b) => b.from),
    burn: seconds,
    ...(burn.earlier ? { durations: intervals.map((b) => b.to - b.from) } : {}),
    thrust: braking.thrust.vacuum.value || (mass * braking.flown!.value) / seconds,
    mass,
  };
}

/**
 * What a joint's parting lets go, as the sound of a drop knows it: the escape tower, the launch vehicle the spacecraft
 * rides, the retropack; nothing for any other (fly.ts `ballisticOf`: a flight into orbit's drops make no sound of their own).
 */
export function partingOf(plan: FlightPlan, joint: string | undefined): 'tower' | 'vehicle' | 'pack' | undefined {
  if (!joint || plan.kind !== 'ballistic') return undefined;
  const b = ballisticOf(plan);
  if (joint === b.towerJoint?.id) return 'tower';
  if (joint === b.separation.id) return 'vehicle';
  if (joint === b.packJoint?.id) return 'pack';
  return undefined;
}

/**
 * When each of a cabin's signals (types.ts `Signal`) came on on a run: the tower gone, the spacecraft parted from its
 * launch vehicle, the retrorockets fired, the pack gone, the entry felt, each parachute out, the abort. A ballistic
 * flight's, by its hardware found by what it is (fly.ts `ballisticOf`); a flight into orbit lights its lamps by the
 * record's events (`recordTimes`) and has none of these.
 */
export function signalsOf(plan: FlightPlan, run: Run): Partial<Record<Signal, number>> {
  if (plan.kind !== 'ballistic') return {};
  const b = ballisticOf(plan);
  const happened = (e: EventDef | undefined): number => (e ? (run.events.find((x) => x.event === e.id)?.t ?? Infinity) : Infinity);
  return {
    tower: b.tower ? (run.bodies[b.tower] ?? Infinity) : Infinity,
    separated: run.bodies[b.booster.id] ?? Infinity,
    retro: happened(b.retro),
    retropack: b.pack ? (run.bodies[b.pack] ?? Infinity) : Infinity,
    entry: run.entered ?? Infinity,
    drogue: run.out.drogue,
    main: run.out.main,
    abort: happened(b.abort),
  };
}

/**
 * The bearing the plan flies along as it leaves its pad, degrees from north: a ballistic flight's tilt programme's; a flight
 * into orbit's aiming azimuth, or (where its law solves for the launch plane) the one its orbit's inclination asks of a pad
 * at `latitude`, degrees, on a turning Earth (derived: the plane of that inclination through the pad, the pad's own
 * eastward motion taken from an orbital speed of 7.8 km/s along it); 0 for a plan that gives none of these.
 */
export function bearingOf(plan: FlightPlan | undefined, latitude?: number): number {
  if (!plan) return 0;
  if (plan.kind === 'ballistic') return ballisticOf(plan).programme.azimuth.value;
  const law = plan.attitude.flatMap((a) => ('law' in a.hold ? [a.hold.law] : []))[0];
  if (law?.azimuth) return law.azimuth.value;
  const orbit = plan.record?.orbit;
  if (!orbit || latitude === undefined) return 0;
  const lat = latitude * DEG;
  const sine = Math.cos(orbit.inclination.value * DEG) / Math.cos(lat);
  if (!(Math.abs(sine) <= 1)) return 0;
  const inertial = Math.asin(sine);
  const speed = 7800;
  const east = speed * Math.sin(inertial) - EARTH_ROTATION_RATE * WGS84_A * Math.cos(lat);
  const north = speed * Math.cos(inertial) * (orbit.injection.heading === 'north' ? 1 : -1);
  return (((Math.atan2(east, north) / DEG) % 360) + 360) % 360;
}

/**
 * Which of a run's two parachutes (`Run.out`) a parachute of the plan is: a ballistic flight's drogue, or its main (the one
 * that takes the drogue's place: fly.ts `ballisticOf`); nothing for any other (a flight into orbit's descent draws its
 * own: `Run.descent`).
 */
export function chuteOf(plan: FlightPlan | undefined, id: string | undefined): 'drogue' | 'main' | undefined {
  if (!plan || !id || plan.kind !== 'ballistic') return undefined;
  const b = ballisticOf(plan);
  return id === b.main.id ? 'main' : id === b.drogue.id ? 'drogue' : undefined;
}

/** Float a capsule which landed inverted. A supplied instant is the pilot's inflation command. */
export function floatUprighting(flight: SitedFlight, run: Run, command?: number): void {
  const config = flight.flies?.uprighting;
  if (!config || !Number.isFinite(run.duration)) return;
  const landing = run.duration;
  const at = command ?? landing + config.delay.value;
  const until = Math.max(landing + config.end.value, Number.isFinite(at) ? at + config.inflation.value : landing) + 30;
  run.afloat = floatOn(config.body, wavesOf(flight.weather?.sea?.trains), landing, until, {
    initialHeel: (config.initialHeel.value * Math.PI) / 180,
    inflation: { at, seconds: config.inflation.value },
  });
}

/** How long a body afloat is followed when nothing sinks it, s after the landing (the deck stops its clock long before). */
const AFLOAT_FOR = 600;

/**
 * What happens to a run's spacecraft once it is down, where its flight has a body afloat (`Flight.flies.afloat`): it is
 * floated from the run's landing (`Run.duration`) on the day's sea (`DayWeather.sea`) and its hatch, if it is blown, is
 * flown off as a loose body (`Flight.flies.hatch.loose`). Left out, `hand`: the record's, its hatch, the crew going out
 * and the helicopter's line at the record's instants. With `hand`: a run flown by hand, its hatch blown at `hand.hatch`
 * (Infinity: never; before the landing, it lands open) and no helicopter, the crew going out `goesOut` after the hatch.
 * Sets `run.afloat` and the hatch's place in `run.loose`; a flight with no body afloat is left as it is.
 */
export function afterwards(flight: SitedFlight, run: Run, hand?: { hatch: number }): void {
  const a = flight.flies?.afloat;
  const hatch = flight.flies?.hatch;
  const landing = run.duration;
  if (!a || !Number.isFinite(landing)) return;
  const waves = wavesOf(flight.weather?.sea?.trains);
  const at = hand ? hand.hatch : a.record.hatch.value;
  const blown = Number.isFinite(at);
  const opens = Math.max(at, landing);
  const out = hand ? opens + a.goesOut.value : a.record.out.value;
  const opened: Record<string, number> = hatch && blown ? { [hatch.opens]: opens } : {};
  const left: Record<string, number> = blown ? { [a.crew]: out, ...(hatch ? { [hatch.leaves]: opens } : {}) } : {};
  const hoist = hand ? undefined : { def: a.hoist, taut: a.record.taut.value, cast: a.record.cast.value };
  const until = hand ? (blown ? opens : landing) + AFLOAT_FOR : a.record.cast.value + AFLOAT_FOR;
  // (it heels in the plane of its hatch, which faces the bearing it lay at)
  const facing = hatch?.at.heading.value ?? 0;
  run.afloat = floatOn(a.body, waves, landing, until, { opened, left, facing, ...(hoist ? { hoist } : {}) }, a.sight.value);
  // the hatch blown afloat: thrown off from where it is on the capsule as it floats then (blown in flight, the deck flies it from the flight)
  const i = hatch ? (flight.flies?.drops ?? []).findIndex((d) => d.nodes.includes(hatch.node)) : -1;
  if (!hatch || i < 0 || !blown) return;
  run.dropped[i] = at < landing ? at : opens;
  if (at < landing) return;
  const last = run.samples[run.samples.length - 1]!;
  const { latitude, longitude } = run.frame.place(last.r, last.t);
  const sea = flight.site.seaLevel.value;
  const now = afloatAt(run.afloat, opens);
  const [la, lo] = [(latitude * Math.PI) / 180, (longitude * Math.PI) / 180];
  const up: Vec3 = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
  const east: Vec3 = [-Math.sin(lo), Math.cos(lo), 0];
  const north: Vec3 = [-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la)];
  const b = (hatch.at.heading.value * Math.PI) / 180;
  const level = add(scale(north, Math.cos(b)), scale(east, Math.sin(b)));
  const tilt = (hatch.at.tilt.value * Math.PI) / 180;
  const p = add(
    add(geodeticToEcef({ latitude, longitude, height: sea }), scale(up, now.z + hatch.at.height.value)),
    scale(level, hatch.at.out.value),
  );
  const normal = unit(add(scale(level, Math.cos(tilt)), scale(up, Math.sin(tilt))));
  const f = run.frame;
  const loose = flyLoose(
    hatch.loose,
    f,
    skyOf(flight.plan),
    sea,
    opens,
    f.toInertial(p, opens),
    f.velocityToInertial(p, scale(up, now.w), opens),
    f.toInertial(normal, opens),
  );
  run.loose = Object.assign(run.loose ?? [], { [i]: loose });
}

/**
 * The hatch blown in flight on a run flown by hand: thrown off the spacecraft as it was at `s` (a live sample: its place,
 * motion and attitude, sim/vehicle.ts), square to its long axis where the hatch is round it and tilted toward its top as
 * the cone is (`Flight.flies.hatch.at`), and flown to the sea (sim/loose.ts). Sets its place in `run.loose`.
 */
export function blownAloft(flight: SitedFlight, run: Run, s: { t: number; r: Vec3; v: Vec3; attitude: Quat }): void {
  const hatch = flight.flies?.hatch;
  const i = hatch ? (flight.flies?.drops ?? []).findIndex((d) => d.nodes.includes(hatch.node)) : -1;
  if (!hatch || i < 0) return;
  const round = (hatch.at.round.value * Math.PI) / 180;
  const tilt = (hatch.at.tilt.value * Math.PI) / 180;
  const body: Vec3 = [Math.sin(tilt), Math.cos(tilt) * Math.sin(round), Math.cos(tilt) * Math.cos(round)];
  const loose = flyLoose(hatch.loose, run.frame, skyOf(flight.plan), flight.site.seaLevel.value, s.t, s.r, s.v, turn(s.attitude, body));
  run.loose = Object.assign(run.loose ?? [], { [i]: loose });
}

/** When a run's vehicle leaves the scene: its end (`duration`), or, afloat, when it has gone out of sight under the sea. */
export function endOf(run: Run): number {
  return run.afloat ? Math.max(run.duration, run.afloat.end) : run.duration;
}

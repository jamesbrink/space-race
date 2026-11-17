/**
 * A flight's run: what the scene, the sound, the cabin, the effects and the Flown panel show of it, whichever kind of
 * flight it is. The record's (`recordOf`: a ballistic flight's plan flown by fly.ts, an orbital one's by staged.ts and
 * made a run its samples' own attitude places), or one being flown by hand, which the decks give as it grows. Nothing
 * here is drawn: viewer/ascent.ts places it in the scene.
 */

import type { Signal, SitedFlight } from '../types.ts';
import { G0 } from '../world/bodies.ts';
import { type EarthFrame, frameOf } from '../world/earthframe.ts';
import { sunPosition } from '../world/ephemeris.ts';
import { add, geodeticToEcef, scale, siteFrame, unit, type Vec3 } from '../world/frames.ts';
import { julianDate, terrestrialTime } from '../world/time.ts';
import { type Afloat, afloatAt, floatOn } from './afloat.ts';
import { skyOf } from './air.ts';
import type { CraftState } from './craft.ts';
import { downOf } from './descent.ts';
import { ballisticOf, flownOnce, type Sample, sampleAt } from './fly.ts';
import { flyLoose, type LooseFlown } from './loose.ts';
import { coastEvents, coastOf, shipOf } from './orbital.ts';
import { type Action, type EventDef, eventOf, type FlightPlan } from './plan.ts';
import { type Quat, turn } from './rigid.ts';
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
  fires?: { from: number; to: number }[];
  /** What it has let go, each flown beside it (sim/shed.ts): a live run's. The record's are made here. */
  sheds?: Sheds;
  /** An orbital flight's bodies down from the ejection, each on its own track, with their parachutes (sim/staged.ts `descentOf`). */
  descent?: DrawnDescent | null;
  /** A flight flown by hand: what it gave for each of the record's checks (by check id), for the Flown panel to set beside the record's run. */
  held?: Record<string, number>;
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
export function between(samples: readonly Sample[], t: number, point: (s: Sample) => Vec3 = (s) => s.r): { r: Vec3; v: Vec3 } {
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

/**
 * A shed body's velocity as it leaves an orbital flight's stack: the stack's, less its share of `def.push` (the pushers
 * between it and what goes on: shared by the masses, back along the long axis `axis`). What goes on is the spacecraft of
 * `mass` kg; its own share is not added to it: its flight is the record's, or the live vehicle's as it parted.
 */
export function pushedOff(def: { push?: { value: number }; mass?: { value: number } }, v: Vec3, axis: Vec3, mass: number): Vec3 {
  const m = def.mass?.value ?? 0;
  if (!def.push || m <= 0) return v;
  return add(v, scale(unit(axis), (-def.push.value * mass) / (mass + m)));
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
): { from: number; to: number }[] {
  const stages = stagesOf(plan);
  const lit = sequenceOf(plan).stages;
  // (a manoeuvre's engine lit several times: each of its fires is its next lighting, in order, orbital.ts `movesOf`)
  const moves = shipOf(plan).moves;
  const seen = new Map<string, number>();
  return (flight.flies?.fires ?? []).map((f) => {
    const mine = moves.filter((m) => m.engine === f.on);
    if (mine.length) {
      const k = seen.get(f.on) ?? 0;
      seen.set(f.on, k + 1);
      const m = mine[k];
      return m ? { from: m.on, to: m.off } : { from: Infinity, to: Infinity };
    }
    if (plan.craft[0]!.engines.find((e) => e.id === f.on)?.flown) {
      const coast = coastOf(plan);
      return retro ? { from: retro.on, to: retro.off } : { from: coast.on, to: coast.off };
    }
    const i = stages.findIndex((s) => s.engine.id === f.on);
    return { from: lit[i]?.from ?? Infinity, to: whole.ascent.stops[i] ?? Infinity };
  });
}
const orbitalWholes = new WeakMap<object, FlownWhole>();
/**
 * An orbital flight's record flown once (sim/staged.ts flyWhole, the coast kept every second), whoever asks first: the scene and the Flown panel show the
 * same run. The ascent is the one flown; from the spacecraft's separation it is the published orbit, begun where the ascent left it (staged.ts `published`),
 * since the ascent as flown falls short of it (the flight's mission.md, section 6).
 */
export function orbitalFlown(flight: SitedFlight): FlownWhole {
  const plan = flight.plan!;
  let whole = orbitalWholes.get(plan);
  if (!whole)
    orbitalWholes.set(
      plan,
      (whole = flyWhole(plan, siteFrame(flight.site), frameOf(flight), flight.site.seaLevel.value, undefined, 1, 'published')),
    );
  return whole;
}
export function orbitalRecord(flight: SitedFlight): Run {
  const plan = flight.plan!;
  const had = orbitalRuns.get(plan);
  if (had) return had;
  const site = siteFrame(flight.site);
  const jd = julianDate(flight.launch);
  const whole = orbitalFlown(flight);
  const centre = (flight.flies?.datum ?? 0) + (plan.record?.centre?.value ?? 0);
  const samples = recordSamples(plan, whole, frameOf(flight), centre, (t) => sunPosition(terrestrialTime(jd + t / 86_400)));
  const end = samples[samples.length - 1]!;
  const ejected = whole.coast.results.ejectionAt;
  // (what the pilot's ejection lets go, by the joints it parts, leaves at the run's own instant of it)
  const ejection = eventOf(plan, downOf(plan)?.ejection ?? '');
  const ejecting = new Set(ejection?.do.flatMap((a) => ('separate' in a ? [a.separate] : [])) ?? []);
  const dropped = flight.flies!.drops.map((d) => (d.on && ejecting.has(d.on) && Number.isFinite(ejected) ? ejected : d.at));
  const sheds = new Sheds(plan, site, flight.site.seaLevel.value, { frame: frameOf(flight) });
  const mass = plan.record!.orbit!.mass.value;
  for (const def of plan.craft[0]!.sheds ?? []) {
    const i = flight.flies!.drops.findIndex((d) => d.on === def.on);
    if (i < 0 || !def.mass || !def.centre || !def.gyration) continue;
    const at = dropped[i]!;
    const [a, b, k] = either(samples, at);
    const s = k < 0.5 ? a : b;
    const { r, v } = between(samples, at);
    const m = def.mass.value;
    // (a strap-on from where it stood, as its swing and its vent send it: sim/shed.ts `apart`)
    sheds.add(
      apart(def, {
        on: def.on,
        t: at,
        r: add(r, scale(s.axis, def.centre.value)),
        v: pushedOff(def, v, s.axis, mass),
        q: s.attitude,
        w: [0, 0, 0],
        mass: m,
        roll: m * def.gyration.roll.value ** 2,
        across: m * def.gyration.across.value ** 2,
        centre: def.centre.value,
      }),
    );
  }
  // (the fire is the first stages': Block E's small flame, 28 m up inside the lattice, is not drawn; a stage's end is the record's cut, or its letting go where it has no cut of its own)
  const stages = sequenceOf(plan).stages;
  const first = stages[1] ?? stages[0]!;
  // (what happened: each of the plan's events at the record's instant of it, or the run's own where it decides it; the record's marks)
  const times = orbitalEvents(flight, whole);
  const events: RunEvent[] = [];
  const told = new Set<string>();
  for (const e of plan.events) {
    const t = e.record ? times[e.record.id] : e.at?.value;
    if (t === undefined) continue;
    events.push({ event: e.id, ...(e.record ? { record: e.record.id } : {}), t });
    if (e.record) told.add(e.record.id);
  }
  for (const m of plan.record?.marks ?? []) if (!told.has(m.id)) events.push({ record: m.id, t: times[m.id] ?? m.at.value });
  events.sort((a, b) => a.t - b.t);
  const run = runOf(flight, {
    samples,
    duration: end.t,
    cutoff: first.cutAt ?? first.sep,
    dropped,
    live: true,
    out: { drogue: Infinity, main: Infinity },
    sheds,
    fires: firesOf(flight, whole),
    descent: descentOf(whole, centre, plan.record?.ground?.value),
    events,
    bodies: bodiesOf(plan, events),
    results: held(plan, whole),
  });
  orbitalRuns.set(plan, run);
  return run;
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
  const k = coastEvents(plan);
  if (hand) {
    if (hand.burn !== undefined) {
      for (const e of [k.command, k.on]) put(e, hand.burn?.on ?? Infinity);
      put(k.off, hand.burn?.off ?? Infinity);
      for (const e of k.armed) put(e, Infinity);
    }
    put(k.parting, hand.parting);
  }
  // (the pilot set loose when the descent had it: the barometric switch's height on the record's run, or when a hand gave it)
  const ejected = whole.down ? whole.down.ejected : whole.coast.results.ejectionAt;
  put(eventOf(plan, coastOf(plan).loose ?? ''), Number.isFinite(ejected) ? ejected : Infinity);
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
export function brakingOf(flight: SitedFlight, run: Run): { fires: number[]; burn: number; thrust: number; mass: number } | null {
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
  if (!braking || !burn || !Number.isFinite(burn.from) || !(burn.to > burn.from)) return null;
  const mass = plan.record?.orbit?.mass.value ?? 0;
  return {
    fires: [burn.from],
    burn: burn.to - burn.from,
    thrust: braking.thrust.vacuum.value || (mass * braking.flown!.value) / (burn.to - burn.from),
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

/** The bearing the plan flies along, degrees from north: a ballistic flight's tilt programme's; 0 for a plan that gives none. */
export function bearingOf(plan: FlightPlan | undefined): number {
  return plan?.kind === 'ballistic' ? ballisticOf(plan).programme.azimuth.value : 0;
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
  run.afloat = floatOn(a.body, waves, landing, until, { opened, left, ...(hoist ? { hoist } : {}) }, a.sight.value);
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

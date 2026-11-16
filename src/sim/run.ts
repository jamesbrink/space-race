/**
 * A flight's run: what the scene, the sound, the cabin, the effects and the Flown panel show of it, whichever kind of
 * flight it is. The record's (`recordOf`: a ballistic flight's plan flown by fly.ts, an orbital one's by staged.ts and
 * made a run its samples' own attitude places), or one being flown by hand, which the decks give as it grows. Nothing
 * here is drawn: viewer/ascent.ts places it in the scene.
 */
import { downOf } from './descent.ts';
import { ballisticOf, flownOnce, type Sample } from './fly.ts';
import { coastEvents, coastOf } from './orbital.ts';
import { type EventDef, eventOf, type FlightPlan } from './plan.ts';
import { apart, Sheds } from './shed.ts';
import { type DrawnDescent, descentOf, type FlownWhole, flyWhole, recordSamples, sequenceOf, stagesOf } from './staged.ts';
import type { SitedFlight } from '../types.ts';
import { frameOf } from '../world/earthframe.ts';
import { sunPosition } from '../world/ephemeris.ts';
import { add, scale, siteFrame, unit, type Vec3 } from '../world/frames.ts';
import { julianDate, terrestrialTime } from '../world/time.ts';

/** A flight for the scene to show: the record's, or one being flown. */
export interface Run {
  /** In order of time. A live run's are `LiveSample`s. */
  samples: readonly Sample[];
  /** When it came down, seconds from liftoff: Infinity until it has. */
  duration: number;
  /** When the engine stopped: Infinity while it burns, -Infinity for one that never did (an abort off the pad, unlit). */
  cutoff: number;
  /** When each of `Flight.flies.drops` left, in their order: Infinity for one still aboard. */
  dropped: number[];
  /** Flown by hand: placed by its samples' own attitude, and kept on show after it lands. */
  live: boolean;
  /** When each parachute came out: Infinity for one that has not. */
  out: { drogue: number; main: number };
  /**
   * A spacecraft flown by hand that floods afloat (its hatch blown: `Flight.flies.hatch`): from `at` it goes down evenly to
   * out of sight in `under` seconds, and is drawn no deeper (the cameras that follow it stay above the sea; how far it
   * went is the debrief's to tell). Drawn only: nothing of it is flown.
   */
  sinks?: { at: number; under: number };
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
export function firesOf(flight: SitedFlight, whole: FlownWhole, retro?: { on: number; off: number }): { from: number; to: number }[] {
  const plan = flight.plan!;
  const stages = stagesOf(plan);
  const lit = sequenceOf(plan).stages;
  return (flight.flies?.fires ?? []).map((f) => {
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
  const run: Run = {
    samples,
    duration: end.t,
    cutoff: first.cutAt ?? first.sep,
    dropped,
    live: true,
    out: { drogue: Infinity, main: Infinity },
    sheds,
    fires: firesOf(flight, whole),
    descent: descentOf(whole, centre, plan.record?.ground?.value),
  };
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
  const { samples, results } = flownOnce(plan, siteFrame(flight.site), flight.site.seaLevel.value, frameOf(flight));
  const when = (t: number): number => (Number.isFinite(t) ? t : Infinity);
  const out = { drogue: when(results.drogueAt), main: when(results.mainAt) };
  const run: Run = {
    samples,
    duration: results.duration,
    cutoff: roles.cutoff,
    // (what a parachute lets go leaves when this run has the parachute out, which is not to the second when the record does)
    dropped: (flight.flies?.drops ?? []).map((d) => (d.on === roles.drogue.id ? out.drogue : d.on === roles.main.id ? out.main : d.at)),
    live: false,
    out,
  };
  ballisticRuns.set(plan, run);
  return run;
}

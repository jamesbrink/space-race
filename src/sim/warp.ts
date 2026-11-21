/**
 * Where a warp may go on a coast on rails (world/clock.ts `warpTo`; docs/agents/world.md, "Faster than an hour a
 * second"): the next of what is coming on the run, each found on the run itself and named. The clock runs there as fast
 * as the coast lets it (sim/rails.ts `railsRate`) and lands on the instant exactly.
 *
 * - `burn`: an engine to be lit, `LEAD_IN` before it, so that the hands are on the controls when it comes;
 * - `event`: whatever else is due on the run (an event, an instant of the record's, the run's end);
 * - `sphere`: a crossing of the sphere the centre changes at (`Run.crossings`);
 * - `apsis`: the nearest to or the furthest from the body it is flown about (perigee and apogee, perilune and apolune);
 *   one on a path that does not go round that body (`once`) is a pass of it, which comes once;
 * - `entry`: the run coming down through the entry interface (or the rails' floor, `RAILS_FLOOR`, where it is lower);
 * - `time`: a mission time chosen by hand.
 *
 * Nothing here knows a flight: the run, the instants its deck holds and the words for them are all it is given.
 */
import { crossing, RAILS_FLOOR } from './rails.ts';
import type { Run } from './run.ts';
import type { Sample } from './fly.ts';
import { EARTH, MOON } from '../world/bodies.ts';
import { dot, length, type Vec3 } from '../world/frames.ts';

export type WarpKind = 'burn' | 'event' | 'sphere' | 'apsis' | 'entry' | 'time';

/** Somewhere a warp may go: what kind of thing it is, the instant (seconds from liftoff) and what is there, in words. */
export interface WarpTarget {
  kind: WarpKind;
  t: number;
  what: string;
  /** An apsis of a path that does not go round the body (it is not bound to it): it comes once. */
  once?: boolean;
}

/** An instant the deck holds and its words: an event, the record's instant, a burn's lighting. */
export interface Marked {
  t: number;
  what: string;
}

/**
 * How long before a burn a warp to it stops, seconds of the flight: five minutes, for the hands to take the controls and
 * turn to the burn's attitude (half a turn at a degree a second is three) with the clock at life's pace or a little
 * faster (an hour a second at most, so close to an instant held: rails.ts `EASE`). Chosen.
 */
export const LEAD_IN = 300;

/** What a warp stops for on its way, whatever it was asked to go to: every kind but an apsis and a time chosen. */
const STOPS: ReadonlySet<WarpKind> = new Set(['burn', 'event', 'sphere', 'entry']);

/** A whole number with commas between its thousands: '2,243'. */
const thousands = (n: number): string => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const gmOf = (central: 'earth' | 'moon'): number => (central === 'moon' ? MOON : EARTH).gm.value;
const radiusOf = (central: 'earth' | 'moon'): number => (central === 'moon' ? MOON : EARTH).equatorialRadius.value;

/** Whether a state about a body is bound to it (its energy under the body's pull alone is negative): an orbit that goes round. */
const bound = (r: Vec3, v: Vec3, gm: number): boolean => dot(v, v) / 2 - gm / length(r) < 0;

/**
 * What a warp's targets are found on: a run (`trackOf`), or a live vehicle's coast on rails (deck/orbitdeck.ts). The
 * instants it is known at (a run's samples, a railway's steps), its state about the body it is flown about there, and
 * its height above the sea, each at any instant up to its end.
 */
export interface Track {
  readonly end: number;
  instants(from: number, to: number): readonly number[];
  centred(t: number): { central: 'earth' | 'moon'; r: Vec3; v: Vec3 };
  height(t: number): number;
}

/**
 * A run as a track: its samples' instants, `Run.centred`, and its height, the run's own where a quiet stretch is flown
 * again on rails, else along the line between the two samples' heights (a run's samples are a second apart or less in
 * the air, where a height is looked for).
 */
export function trackOf(run: Run): Track {
  const samples = run.samples as readonly Sample[];
  return {
    end: Math.min(run.duration, samples.length ? samples[samples.length - 1]!.t : Number.NEGATIVE_INFINITY),
    instants: (from, to) => samples.filter((s) => s.t > from && s.t <= to).map((s) => s.t),
    centred: (t) => run.centred(t),
    height: (t) => {
      let [lo, hi] = [0, samples.length - 1];
      if (hi < 0) return Number.NaN;
      if (!(t > samples[0]!.t)) return samples[0]!.altitude;
      if (t >= samples[hi]!.t) return samples[hi]!.altitude;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (samples[mid]!.t <= t) lo = mid;
        else hi = mid;
      }
      const [a, b] = [samples[lo]!, samples[hi]!];
      return a.rails ? run.at(t).altitude : a.altitude + ((b.altitude - a.altitude) * (t - a.t)) / (b.t - a.t);
    },
  };
}

/**
 * The apsides of a track after `from`, in order: each where the motion about the body it is flown about turns from
 * falling to rising (the nearest) or back (the furthest), found between two of its instants about the same centre and
 * placed by bisection on the track itself to a millisecond (`crossing`). At most `most`, and none past `to`.
 */
export function apsides(track: Track, from: number, to = track.end, most = 2): WarpTarget[] {
  const out: WarpTarget[] = [];
  const end = Math.min(to, track.end);
  if (!(end > from)) return out;
  const g = (t: number): { central: 'earth' | 'moon'; f: number } => {
    const c = track.centred(t);
    return { central: c.central, f: dot(c.r, c.v) };
  };
  let [at, was] = [from, g(from)];
  for (const t of [...track.instants(from, end), end]) {
    if (out.length >= most) break;
    if (!(t > at)) continue;
    const now = g(t);
    if (now.central === was.central && was.f !== 0 && Math.sign(now.f) !== Math.sign(was.f)) {
      const central = now.central;
      const near = was.f < 0;
      const tA = crossing((x) => g(x).f, at, t, 1e-3);
      const c = track.centred(tA);
      const height = length(c.r) - radiusOf(central);
      // (an apsis under the ground is no apsis: the flight strikes the body before it, and ends there)
      if (height > 0) {
        const name = central === 'moon' ? (near ? 'Perilune' : 'Apolune') : near ? 'Perigee' : 'Apogee';
        const once = !bound(c.r, c.v, gmOf(central));
        out.push({ kind: 'apsis', t: tA, what: `${name} · ${thousands(height / 1000)} km`, ...(once ? { once } : {}) });
      }
    }
    [at, was] = [t, now];
  }
  return out;
}

/** When a track first comes down through `height` m above the sea after `from` and by `to` (NaN for not), to a millisecond. */
export function comesDown(track: Track, from: number, height: number, to = track.end): number {
  const end = Math.min(to, track.end);
  let [at, was] = [from, track.height(from)];
  for (const t of [...track.instants(from, end), end]) {
    if (!(t > at)) continue;
    const now = track.height(t);
    if (was > height && now <= height) return crossing((x) => track.height(x) - height, at, t, 1e-3);
    [at, was] = [t, now];
  }
  return Number.NaN;
}

/**
 * Everything a warp could go to from `t` on `track`, in order of time: the lead-ins of `burns` (or a burn itself once
 * within its lead-in), `dues` (the run's end among them, where it has one), the `crossings` of a sphere, its next
 * apsides, its coming down to `entry` m (the mission's entry interface, where it has one above the rails' floor, or the
 * floor), and `chosen`, a mission time asked for.
 */
export function warpTargets(
  track: Track,
  t: number,
  given: {
    burns?: readonly Marked[];
    dues?: readonly Marked[];
    crossings?: readonly { t: number; to: 'earth' | 'moon' }[];
    entry?: number;
    chosen?: number;
    /** How far on to look for an apsis or the air, s: all of the track, unless given. */
    look?: number;
  },
): WarpTarget[] {
  const ahead = (x: number) => Number.isFinite(x) && x > t + 1e-6 && x <= track.end + 1e-6;
  const to = t + (given.look ?? Number.POSITIVE_INFINITY);
  const out: WarpTarget[] = [];
  for (const b of given.burns ?? []) {
    if (!ahead(b.t)) continue;
    const lead = b.t - LEAD_IN;
    out.push(ahead(lead) ? { kind: 'burn', t: lead, what: `Lead-in: ${b.what}` } : { kind: 'burn', t: b.t, what: b.what });
  }
  for (const d of given.dues ?? []) if (ahead(d.t)) out.push({ kind: 'event', t: d.t, what: d.what });
  for (const c of given.crossings ?? [])
    if (ahead(c.t)) out.push({ kind: 'sphere', t: c.t, what: c.to === 'moon' ? 'Into the Moon’s sphere' : 'Out of the Moon’s sphere' });
  out.push(...apsides(track, t, to));
  const down = comesDown(track, t, Math.max(RAILS_FLOOR, given.entry ?? 0), to);
  if (ahead(down))
    out.push({ kind: 'entry', t: down, what: given.entry && given.entry > RAILS_FLOOR ? 'Entry interface' : 'Into the air' });
  if (given.chosen !== undefined && ahead(given.chosen)) out.push({ kind: 'time', t: given.chosen, what: 'The time chosen' });
  // (one of each instant: the first named at it)
  out.sort((a, b) => a.t - b.t);
  return out.filter((x, i) => i === 0 || Math.abs(x.t - out[i - 1]!.t) > 1e-6);
}

/** What "warp to the next" goes to: the soonest of `targets` but an apsis of an orbit that goes round, which comes every revolution. */
export const nextWarp = (targets: readonly WarpTarget[]): WarpTarget | null => targets.find((x) => x.kind !== 'apsis' || x.once) ?? null;

/** Where a warp asked to go to `to` stops: there, or sooner at anything due or a burn's lead-in on the way. */
export function warpStop(targets: readonly WarpTarget[], to: WarpTarget): WarpTarget {
  const sooner = targets.find((x) => STOPS.has(x.kind) && x.t < to.t - 1e-6);
  return sooner ?? to;
}

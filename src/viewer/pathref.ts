/**
 * The record's own run as a line of reference (viewer/path.ts draws it beside the predicted path): what was meant to be
 * flown, there from the pad before anything is lit, for a flight flown by hand to be held to. Pure: tested in
 * tests/pathref.test.mjs. Nothing here knows a flight: every rule is one of the run's own samples and events, the same
 * for a lob, an ascent, an orbit and a flight of days.
 *
 * - **A curve of a few thousand points, kept by its curvature** (`referenceCurve`). A record is thousands to tens of
 *   thousands of samples, a tenth of a second apart under power and ten seconds in a coast. A point is kept where the
 *   way it goes has turned `REF_TURN` since the last kept, or its speed has changed by `REF_SPEED` of itself, and at
 *   every instant something happened (an engine lit or stopped: the acceleration steps there, and a cubic laid across
 *   it would cut the corner); then wherever a sample let go lies more than `REF_OFF` from the cubic through the points
 *   kept, the worst of them is kept too. So a straight coast is a few points and a pitch-over many, never evenly. Over
 *   `REF_KNOTS` points, all three are let out by half as much again and it is done again.
 * - **What happened on it, sparingly** (`recordMarks`): from the run's events and what the plan says each does, only
 *   those that light or stop an engine, taken together where they come within `REF_TOGETHER` of each other, and named
 *   by what the run does there. Under its launch vehicle's power before and after: staging. Before and not after: the
 *   cutoff. An engine lit in a coast: retrofire if the run then comes down (`REF_AFTER` later its orbit's lowest point
 *   is under `REF_AIR`, with less energy than before), otherwise a burn; where such a burn ends is not marked. Its highest points (`apsesOf`: where
 *   it stops climbing away from the Earth's centre), and where it came down.
 * - **How much of it is drawn** (`windowOf`): from `REF_BACK` round the Earth behind the instant on show (all of a lob
 *   or an ascent; an arc of an orbit) to where the record ends, or to where it has gone once round from that instant
 *   less what would bring it back to the vehicle from behind, going out before that as the predicted path's line does.
 */

import { type Curve, curveAt, curveOf, type Sweep, sweptTo, whenSwept } from './pathline.ts';

/** Radians the way the record goes may turn between two points kept, and how much of its speed it may gain or lose. */
export const REF_TURN = (3 * Math.PI) / 180;
export const REF_SPEED = 0.1;
/** Metres a sample let go may lie from the curve through the points kept. */
export const REF_OFF = 2;
/** The most points kept of a record. */
export const REF_KNOTS = 4096;
/** Seconds between the samples the curve is made from, at most, where the run let go of its own in a quiet coast (sim/run.ts `filled`): a coast's long step, which is what it kept before it let any go. */
export const REF_EVERY = 10;
/** Seconds within which engine events are one mark. */
export const REF_TOGETHER = 20;
/**
 * The height over the Earth's equatorial radius, m, under which an orbit's lowest point brings it down: an engine lit in
 * a coast that leaves the run on such an orbit is its retrofire. Estimated (path.ts `OTHER_AIR` is the same height, for
 * the same reason).
 */
export const REF_AIR = 120_000;
/** Seconds after an engine is lit in a coast at which the run's orbit says what that burn did: longer than a retrofire, short against a revolution. Estimated. */
export const REF_AFTER = 60;
/** How far round the Earth behind the instant on show the record is drawn, radians: under what the line ahead stops short of the vehicle by. */
export const REF_BACK = (40 * Math.PI) / 180;

/** A sample of the record as the line reads it: the instant, the place in the frame that does not turn (its centre of mass where the sample has one), and its velocity where it has one. */
export interface RefSample {
  t: number;
  r: readonly [number, number, number];
  centre?: readonly [number, number, number];
  v?: readonly [number, number, number];
}

const placeOf = (s: RefSample): readonly [number, number, number] => s.centre ?? s.r;

/**
 * The record as a curve (pathline.ts `Curve`) of at most `most` points, kept by its curvature, with a point at each of
 * `must` (instants, in order) where it has a sample. Samples out of order of time, or at the instant of the one before,
 * are let go (a run keeps two at the instant something changes).
 */
export function referenceCurve(samples: readonly RefSample[], must: readonly number[] = [], most = REF_KNOTS): Curve {
  // (in order of time, strictly)
  const s: RefSample[] = [];
  for (const x of samples) if (!s.length || x.t > s[s.length - 1]!.t + 1e-9) s.push(x);
  const n = s.length;
  if (n <= 2) return curveOf(s.map((x) => ({ t: x.t, r: placeOf(x), ...(x.v ? { v: x.v } : {}) })));
  // the way it goes at each sample: its velocity, or (none given) the chord through its neighbours
  const way = new Float64Array(n * 3);
  const speed = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const v = s[i]!.v;
    const a = placeOf(s[Math.max(0, i - 1)]!);
    const b = placeOf(s[Math.min(n - 1, i + 1)]!);
    const dt = s[Math.min(n - 1, i + 1)]!.t - s[Math.max(0, i - 1)]!.t;
    for (let k = 0; k < 3; k++) way[i * 3 + k] = v ? v[k]! : (b[k]! - a[k]!) / dt;
    speed[i] = Math.hypot(way[i * 3]!, way[i * 3 + 1]!, way[i * 3 + 2]!);
  }
  const turned = (i: number, j: number): number => {
    const d = way[i * 3]! * way[j * 3]! + way[i * 3 + 1]! * way[j * 3 + 1]! + way[i * 3 + 2]! * way[j * 3 + 2]!;
    const m = speed[i]! * speed[j]!;
    return m > 0 ? Math.acos(Math.min(1, Math.max(-1, d / m))) : 0;
  };
  // (a point kept has the way it goes there from the samples beside it, not from the points kept beside it, which are far off)
  const point = (i: number) => ({ t: s[i]!.t, r: placeOf(s[i]!), v: way.subarray(i * 3, i * 3 + 3) });
  const at = [0, 0, 0];
  for (let loose = 1; ; loose *= 1.5) {
    // by curvature: a point where the way has turned, the speed has changed, or something happened
    const keep = new Uint8Array(n);
    keep[0] = keep[n - 1] = 1;
    let last = 0;
    let m = 0;
    for (let i = 1; i < n - 1; i++) {
      while (m < must.length && must[m]! <= s[last]!.t) m++;
      const due = m < must.length && s[i]!.t >= must[m]!;
      const faster = Math.abs(speed[i]! - speed[last]!) > REF_SPEED * loose * Math.max(speed[last]!, 1);
      if (due || faster || turned(last, i) > REF_TURN * loose) {
        keep[i] = 1;
        last = i;
      }
    }
    // by how far what was let go lies from the curve through what was kept: the worst of each piece kept too, until none does
    let kept = 0;
    for (let pass = 0; pass < 12; pass++) {
      const idx: number[] = [];
      for (let i = 0; i < n; i++) if (keep[i]) idx.push(i);
      kept = idx.length;
      if (kept > most) break;
      const c = curveOf(idx.map(point));
      let added = 0;
      for (let q = 0; q + 1 < idx.length; q++) {
        let worst = REF_OFF * loose;
        let which = -1;
        for (let i = idx[q]! + 1; i < idx[q + 1]!; i++) {
          curveAt(c, s[i]!.t, at, 0, q);
          const p = placeOf(s[i]!);
          const off = Math.hypot(at[0]! - p[0], at[1]! - p[1], at[2]! - p[2]);
          if (off > worst) {
            worst = off;
            which = i;
          }
        }
        if (which >= 0) {
          keep[which] = 1;
          added++;
        }
      }
      if (!added) return c;
      kept += added;
    }
    if (kept <= most)
      return curveOf(
        Array.from(keep.keys())
          .filter((i) => keep[i])
          .map(point),
      );
  }
}

/** Metres a curve must come down from a top, before it climbs again, for that top to be one: an ascent that levels off into its orbit dips by less, and is not at its highest there. */
export const REF_RISE = 2000;

/**
 * The instants at which a curve stops climbing away from the centre (its apoapses), in order: where the place's distance
 * from the frame's origin is greatest among its neighbours, found between the curve's own points; less those it comes
 * down from by under `rise` before it climbs again.
 */
export function apsesOf(c: Curve, rise = REF_RISE): number[] {
  const tops: number[] = [];
  const bottoms: number[] = [];
  const p = [0, 0, 0];
  const v = [0, 0, 0];
  // (the rate its distance from the centre grows at, times that distance: r . v)
  const climb = (t: number, hint: number): number => {
    curveAt(c, t, p, 0, hint, v);
    return p[0]! * v[0]! + p[1]! * v[1]! + p[2]! * v[2]!;
  };
  for (let i = 0; i + 1 < c.n; i++) {
    let a = c.t[i]!;
    let b = c.t[i + 1]!;
    // (a hair inside the piece at each end: at the point itself the velocity is the point's own, whichever piece is asked)
    const e = 1e-6 * (b - a);
    const up = climb(a + e, i) > 0;
    if (up === climb(b - e, i) > 0) continue;
    for (let k = 0; k < 40 && b - a > 1e-3; k++) {
      const m = 0.5 * (a + b);
      if (climb(m, i) > 0 === up) a = m;
      else b = m;
    }
    (up ? tops : bottoms).push(0.5 * (a + b));
  }
  const far = (t: number): number => {
    curveAt(c, t, p);
    return Math.hypot(p[0]!, p[1]!, p[2]!);
  };
  // (a top it comes down from by too little before the next bottom, or its end, is not one)
  return tops.filter((t) => far(t) - far(bottoms.find((b) => b > t) ?? c.t[c.n - 1]!) >= rise);
}

/** What a mark of the record is: an engine event by what the run does there, or where it came down. */
export type RefKind = 'staging' | 'cutoff' | 'retro' | 'burn' | 'down';
export interface RefMark {
  kind: RefKind;
  t: number;
}

/** A sample of the run as the marks read it: whether it is under power, and its state in the frame that does not turn. */
export interface RunSample {
  t: number;
  powered: boolean;
  r: readonly [number, number, number];
  v: readonly [number, number, number];
}

/** The last sample at or before `t` (the first, before the run's start). */
function sampleAt<S extends { t: number }>(samples: readonly S[], t: number): S {
  let lo = 0;
  let hi = samples.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (samples[mid]!.t <= t) lo = mid;
    else hi = mid - 1;
  }
  return samples[lo]!;
}

/**
 * The record's key events, sparingly (the rule is at the head of this file). `events` are the run's (sim/run.ts
 * `RunEvent`), `does` what the plan's event of an id does (its actions: `ignite`, `cut` and the rest), `gm` the Earth's
 * and `radius` its equator's; `duration` when the run came down (Infinity if it did not).
 */
export function recordMarks(
  events: readonly { event?: string; t: number }[],
  does: (id: string) => readonly object[] | undefined,
  samples: readonly RunSample[],
  duration: number,
  gm: number,
  radius: number,
): RefMark[] {
  if (samples.length < 2) return [];
  const t1 = samples[samples.length - 1]!.t;
  const energy = (s: RunSample): number => 0.5 * (s.v[0] ** 2 + s.v[1] ** 2 + s.v[2] ** 2) - gm / Math.hypot(...s.r);
  /** The lowest point of the orbit a state is on, from the Earth's centre, m (an orbit that does not close has one too). */
  const lowest = (s: RunSample): number => {
    const r = Math.hypot(...s.r);
    const h = Math.hypot(s.r[1] * s.v[2] - s.r[2] * s.v[1], s.r[2] * s.v[0] - s.r[0] * s.v[2], s.r[0] * s.v[1] - s.r[1] * s.v[0]);
    const e = energy(s);
    return (h * h) / gm / (1 + Math.sqrt(Math.max(0, 1 + (2 * e * h * h) / (gm * gm)))) || r;
  };
  /** Whether the run is under power at any of its samples from `a` to `b`. */
  const under = (a: number, b: number): boolean => {
    for (let k = samples.indexOf(sampleAt(samples, a)); k < samples.length && samples[k]!.t <= b; k++)
      if (samples[k]!.t >= a && samples[k]!.powered) return true;
    return false;
  };
  // the engine events after liftoff, in order of time, taken together where they come close
  const engine = events
    .filter((e) => e.event !== undefined && Number.isFinite(e.t) && e.t > 1 && e.t < t1)
    .map((e) => ({ t: e.t, acts: does(e.event!) ?? [] }))
    .map((e) => ({ t: e.t, lights: e.acts.some((a) => 'ignite' in a), cuts: e.acts.some((a) => 'cut' in a) }))
    .filter((e) => e.lights || e.cuts)
    .sort((a, b) => a.t - b.t);
  const marks: RefMark[] = [];
  /** Whether the burn going on is one lit in a coast, which has its mark where it began: its end is not the cutoff. */
  let coasting = false;
  for (let i = 0; i < engine.length; ) {
    let j = i;
    while (j + 1 < engine.length && engine[j + 1]!.t - engine[j]!.t <= REF_TOGETHER) j++;
    const first = engine[i]!;
    const last = engine[j]!;
    // (under power at all within `REF_TOGETHER` before them, and after: a run's own instant of a cutoff its guidance made
    // on the state is not to the second the instant its event is given)
    const before = under(first.t - REF_TOGETHER, first.t - 1e-6);
    const after = under(last.t + 1, last.t + REF_TOGETHER);
    if (before && after) marks.push({ kind: 'staging', t: first.t });
    else if (before) {
      if (!coasting) marks.push({ kind: 'cutoff', t: last.t });
      coasting = false;
    } else if (engine.slice(i, j + 1).some((e) => e.lights)) {
      // an engine lit in a coast: by the orbit the run is on `REF_AFTER` later, against the one it was on
      const was = sampleAt(samples, first.t - 0.5);
      const done = sampleAt(samples, Math.min(t1, last.t + REF_AFTER));
      marks.push({ kind: lowest(done) < radius + REF_AIR && energy(done) < energy(was) ? 'retro' : 'burn', t: first.t });
      coasting = after;
    }
    i = j + 1;
  }
  if (Number.isFinite(duration)) marks.push({ kind: 'down', t: Math.min(duration, t1) });
  return marks;
}

/**
 * How much of the record is drawn at the instant `now` (held within the curve): from `from`, coming in over `lead`
 * seconds (0 where that is the record's start: it stands on the pad), to `to`, going out over `over` seconds before it
 * (0 where that is the record's end: it comes down there). `back` is how far round the Earth behind `now` it is drawn,
 * `short` how far short of coming once round it stops and `fade` the turn it goes out over, radians.
 */
export function windowOf(
  c: Curve,
  sw: Sweep,
  now: number,
  back: number,
  short: number,
  fade: number,
): { from: number; lead: number; to: number; over: number } {
  const t0 = c.t[0]!;
  const t1 = c.t[c.n - 1]!;
  if (c.n < 2) return { from: t0, lead: 0, to: t1, over: 0 };
  const at = Math.min(t1, Math.max(t0, now));
  const here = sweptTo(c, sw, at);
  const from = here > back ? Math.min(at, whenSwept(c, sw, here - back)) : t0;
  const round = whenSwept(c, sw, here + 2 * Math.PI - short);
  const lead = from > t0 ? 0.25 * (at - from) : 0;
  if (!Number.isFinite(round)) return { from, lead, to: t1, over: 0 };
  return { from, lead, to: round, over: round - whenSwept(c, sw, here + 2 * Math.PI - short - fade) };
}

/**
 * A flight's target, where it is at an instant of a run. The stage a spacecraft left in orbit and went back to
 * (`Flight.flies.target`) is a craft of its own, flown from the parting on its own forces (sim/pursuit.ts, orbital.ts
 * `targetFrom`). Nothing moves it but gravity and the air: where the record has it from the spacecraft (the plan's
 * checks of its range) is what a run is compared with, never what the stage is put on. A target that is another
 * flight's vehicle, or a craft flown from a published orbit (`TargetDef.flight`, `orbit`: staged.ts `metOf`), is where
 * it is whatever the run did.
 */
import type { SitedFlight } from '../types.ts';
import { length, scale, sub, unit } from '../world/frames.ts';
import { type State, step } from '../world/orbit.ts';
import { targetFrom } from './orbital.ts';
import type { Target } from './pursuit.ts';
import { between, type Run, recordOf } from './run.ts';
import { metOf } from './staged.ts';
import type { LiveSample } from './vehicle.ts';

/** A stage let go by an abort on the way up: flown on by gravity alone, down to the sea. */
interface Fall {
  samples: (State & { t: number })[];
  ended?: boolean;
}
function falling(fall: Fall, t: number, below: (state: State & { t: number }) => boolean): State {
  let last = fall.samples[fall.samples.length - 1]!;
  while (last.t < t && !fall.ended) {
    last = { ...step(last, last.t, 5), t: last.t + 5 };
    fall.samples.push(last);
    if (below(last)) fall.ended = true;
  }
  return between(fall.samples, t);
}

interface Track {
  from: number;
  aborted?: boolean;
  target?: Target;
  fall?: Fall;
}
const tracks = new WeakMap<Run, Track>();

/**
 * The target of the flight at `t` on a run. A stage the run let go, as flown to orbit: none on a launch that was aborted.
 * Another flight's vehicle or a craft flown from a published orbit: that craft, which no run of this flight moves.
 */
export function targetAt(flight: SitedFlight, run: Run, t: number): State | undefined {
  const def = flight.plan?.target;
  if (def && 'craft' in def) return run.craft(def.craft).at(t);
  if (def && !('joint' in def)) return metOf(def, run.frame, flight.site.seaLevel.value).at(t);
  if (!run.launchAborted) return detachedStageAt(flight, run, t);
}

/**
 * The detached stage at `t` on a run: from the instant the run let it go, with the stage's side of the joint's push,
 * and from there on its own forces. The record's run carries the very craft its guidance flew on (`Run.target`), and a
 * run that let the stage go as the record did has that craft too; a run flown by hand that let it go at another
 * instant, or in another state, has its own, begun where that run left it. Neither follows the spacecraft afterwards. A stage let go by an abort falls by gravity alone to the sea.
 */
export function detachedStageAt(flight: SitedFlight, run: Run, t: number): State | undefined {
  const config = flight.flies?.target;
  const plan = flight.plan;
  if (!config || !plan || t > config.until.value) return;
  const index = flight.flies!.drops.findIndex((d) => d.on === config.drop);
  const from = run.dropped[index];
  if (from === undefined || !Number.isFinite(from) || t < from || (run.launchAborted && from === 0)) return;
  let track = tracks.get(run);
  if (!track || track.from !== from || track.aborted !== run.launchAborted) {
    const seed = between(run.samples, from);
    const push = plan.craft[0]?.joints.find((joint) => joint.id === config.drop)?.push?.value ?? 0;
    const departed = (): State => ({ r: seed.r, v: sub(seed.v, scale(unit((run.at(from) as LiveSample).axis), push)) });
    // (the craft the record's guidance flew on is this run's too where this run let the stage go as the record did: at
    // the same instant, from the same place, the spacecraft leaving it at the joint's push)
    const flown = run.launchAborted ? undefined : (run.target ?? recordOf(flight)?.target);
    const begun = flown && Math.abs(flown.from - from) < 1e-6 ? flown.at(from) : undefined;
    const same = begun && length(sub(seed.r, begun.r)) < 1e-3 && Math.abs(length(sub(seed.v, begun.v)) - push) < 1e-3;
    track = { from, aborted: run.launchAborted };
    if (run.launchAborted) track.fall = { samples: [{ ...departed(), t: from }] };
    else if (same) track.target = flown;
    else track.target = targetFrom(plan, run.frame, flight.site.seaLevel.value, { t: from, ...departed() });
    tracks.set(run, track);
  }
  if (track.fall) {
    const below = (state: State & { t: number }) => run.frame.place(state.r, state.t).height <= flight.site.seaLevel.value;
    const state = falling(track.fall, t, below);
    if (t <= track.fall.samples.at(-1)!.t && !below({ ...state, t })) return state;
    return;
  }
  return track.target?.at(t);
}

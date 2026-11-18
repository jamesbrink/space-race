import type { SitedFlight } from '../types.ts';
import { add, cross, dot, length, scale, sub, unit, type Vec3 } from '../world/frames.ts';
import { type State, step } from '../world/orbit.ts';
import { between, type Run, recordOf } from './run.ts';
import type { LiveSample } from './vehicle.ts';

interface Coast {
  from: number;
  samples: (State & { t: number })[];
  ended?: boolean;
}
const newCoast = (t: number, s: State): Coast => ({ from: t, samples: [{ ...s, t }] });
function at(coast: Coast, t: number, below?: (state: State & { t: number }) => boolean): State {
  let last = coast.samples[coast.samples.length - 1]!;
  const dt = below ? 5 : 30;
  while (last.t < t && !coast.ended) {
    last = { ...step(last, last.t, dt), t: last.t + dt };
    coast.samples.push(last);
    if (below?.(last)) coast.ended = true;
  }
  return between(coast.samples, t);
}
const basis = (s: State) => {
  const up = unit(s.r),
    normal = unit(cross(s.r, s.v));
  return [unit(cross(normal, up)), up, normal] as const;
};
interface Track {
  start: Coast;
  aborted?: boolean;
  history?: Run;
  corrections: { t: number; offsets: Vec3; ahead: number; above: number; relative?: boolean }[];
  after?: Coast;
}
const tracks = new WeakMap<Run, Track>();
/** Nominal rendezvous telemetry is available only on the original mission branch. */
export function targetAt(flight: SitedFlight, run: Run, t: number): State | undefined {
  if (!run.launchAborted) return detachedStageAt(flight, run, t);
}

/** A detached upper stage, independently propagated with J2. For a historical separation,
 * sparse observed relative positions constrain a reconstruction in the orbital frame. A
 * different separation state instead seeds a free coast. Neither follows the pilot thereafter. */
export function detachedStageAt(flight: SitedFlight, run: Run, t: number): State | undefined {
  const config = flight.flies?.target;
  if (!config || t > config.until.value) return;
  const index = flight.flies!.drops.findIndex((d) => d.on === config.drop);
  const from = run.dropped[index];
  if (from === undefined || !Number.isFinite(from) || t < from || (run.launchAborted && from === 0)) return;
  let track = tracks.get(run);
  if (!track || track.start.from !== from || track.aborted !== run.launchAborted) {
    const seed = between(run.samples, from);
    const push = flight.plan?.craft[0]?.joints.find((joint) => joint.id === config.drop)?.push?.value ?? 0;
    const departed = { r: seed.r, v: sub(seed.v, scale(unit((run.at(from) as LiveSample).axis), push)) };
    track = { start: newCoast(from, departed), aborted: run.launchAborted, corrections: [] };
    tracks.set(run, track);
    const history = run.launchAborted ? undefined : recordOf(flight);
    if (
      history &&
      Math.abs(history.dropped[index]! - from) < 1 &&
      length(sub(seed.r, between(history.samples, from).r)) < 100 &&
      length(sub(seed.v, between(history.samples, from).v)) < 1
    ) {
      track.history = history;
      track.corrections.push({ t: from, offsets: [0, 0, 0], ahead: 0, above: 0 });
      for (const fix of config.fixes) {
        const craft = between(history.samples, fix.at.value);
        const [ahead, up] = basis(craft);
        const point = add(craft.r, add(scale(ahead, fix.ahead.value), scale(up, fix.above.value)));
        const predicted = at(track.start, fix.at.value);
        const residual = sub(point, predicted.r);
        const [x, y, z] = basis(predicted);
        track.corrections.push({
          t: fix.at.value,
          relative: fix.relative,
          ahead: fix.ahead.value,
          above: fix.above.value,
          offsets: [dot(residual, x), dot(residual, y), dot(residual, z)],
        });
      }
    }
  }
  if (run.launchAborted) {
    const below = (state: State & { t: number }) => run.frame.place(state.r, state.t).height <= flight.site.seaLevel.value;
    const state = at(track.start, t, below);
    if (t <= track.start.samples.at(-1)!.t && !below({ ...state, t })) return state;
    return;
  }
  function corrected(instant: number): Vec3 {
    const s = at(track!.start, instant);
    const fixes = track!.corrections;
    if (fixes.length < 2) return s.r;
    let i = 1;
    while (i < fixes.length - 1 && fixes[i]!.t < instant) ++i;
    const a = fixes[i - 1]!,
      b = fixes[i]!;
    const u = Math.max(0, Math.min(1, (instant - a.t) / (b.t - a.t)));
    if (b.relative && track!.history) {
      const craft = between(track!.history.samples, instant),
        [along, up] = basis(craft);
      const f = u * u * (3 - 2 * u);
      const point = add(craft.r, add(scale(along, a.ahead + (b.ahead - a.ahead) * f), scale(up, a.above + (b.above - a.above) * f)));
      if (i !== 1) return point;
      // On the first observed arc the cubic starts with the actual joint separation speed.
      const releaseVelocity = between(track!.history.samples, from!).v;
      const impulse = sub(track!.start.samples[0]!.v, releaseVelocity);
      return add(point, scale(impulse, (b.t - a.t) * u * (1 - u) ** 2));
    }
    const offset = add(a.offsets, scale(sub(b.offsets, a.offsets), u * u * (3 - 2 * u)));
    return basis(s).reduce<Vec3>((p, axis, j) => add(p, scale(axis, offset[j]!)), s.r);
  }
  const last = track.corrections.at(-1);
  if (!last) return at(track.start, t);
  if (t > last.t) {
    if (!track.after)
      track.after = newCoast(last.t, {
        r: corrected(last.t),
        v: scale(add(sub(scale(corrected(last.t), 3), scale(corrected(last.t - 0.1), 4)), corrected(last.t - 0.2)), 5),
      });
    return at(track.after, t);
  }
  const r = corrected(t);
  return { r, v: t < from + 0.1 ? at(track.start, t).v : scale(sub(corrected(t + 0.05), corrected(t - 0.05)), 10) };
}

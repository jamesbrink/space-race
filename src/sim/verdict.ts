/**
 * How a flight flown by hand ended, said plainly: what it came down under and how fast, why, and
 * whether the pilot aboard could have lived through the loads and the landing by the limits the
 * flight's data gives (`Body.capsule.limits`, each with its confidence). No score: what happened.
 */
import type { Trajectory } from '../types';
import type { Results } from './fly.ts';
import type { VehicleState } from './vehicle.ts';

export interface Verdict {
  /** One line: what it came down under, and how fast. */
  how: string;
  /** Why, where something was not done or was done wrong: each a sentence. */
  why: string[];
  /** Whether the landing and the loads were within the limits given; null where the flight gives none. */
  survivable: boolean | null;
  /** The limits it was held to, as said to the pilot, with how sure they are. */
  against: string;
}

export function verdict(state: VehicleState, results: Results, trajectory: Trajectory, peakG: number): Verdict {
  const landing = state.landing!;
  const speed = Math.hypot(landing.vertical, landing.horizontal);
  const why: string[] = [];
  let how: string;
  if (!state.shed.booster) {
    how = `Hit the ${landing.t < 30 ? 'ground' : 'surface'} with the booster at ${speed.toFixed(0)} m/s`;
    why.push(state.abortAt === null ? 'The spacecraft was never parted from it, and no abort was called.' : '');
  } else if (state.mainAt !== null) {
    how = `Down under the main parachute at ${landing.vertical.toFixed(1)} m/s`;
    if (!state.shed.retropack) why.push('The retropack was still on: it came down heavier, and faster, than the record’s landing.');
    if (state.drogueAt === null && state.abortAt === null) why.push('The drogue was never out: the main opened without it.');
  } else if (state.drogueAt !== null) {
    how = `Hit the sea at ${landing.vertical.toFixed(0)} m/s under the drogue alone`;
    why.push('The main parachute was never deployed.');
  } else {
    how = `Hit the sea at ${landing.vertical.toFixed(0)} m/s`;
    why.push(state.shed.tower ? 'No parachute was deployed.' : 'The escape tower was still on: no parachute can come out past it.');
  }
  // (an abort off the pad with the engine never lit came after no ignition)
  if (state.abortAt !== null) {
    // where the rocket's line, set off the centre of mass, carried it: said for an abort from low down, where clear of the booster is the point
    const low = (state.abortHeight ?? 0) < 1000;
    if (low && state.shed.booster && Number.isFinite(results.range))
      why.unshift(`It came down ${results.range.toFixed(0)} m from the pad, ${results.apogee.toFixed(0)} m at its highest.`);
    why.unshift(
      state.ignited
        ? `Aborted on the escape rocket ${state.abortAt.toFixed(1)} s after ignition.`
        : 'Aborted off the pad on the escape rocket: the engine was never lit.',
    );
  }
  const limits = trajectory.body?.capsule.limits;
  if (!limits) return { how, why: why.filter(Boolean), survivable: null, against: '' };
  const hard = speed > limits.landingSpeed.value;
  const heavy = peakG > limits.load.value;
  if (hard) why.push(`The landing was at ${speed.toFixed(1)} m/s: the limit taken is ${limits.landingSpeed.value.toFixed(1)} m/s.`);
  if (heavy) why.push(`The greatest load was ${peakG.toFixed(1)} g: the limit taken is ${limits.load.value.toFixed(0)} g.`);
  return {
    how,
    why: why.filter(Boolean),
    survivable: !hard && !heavy,
    against: `Held to a landing of ${limits.landingSpeed.value.toFixed(1)} m/s (${limits.landingSpeed.confidence}) and ${limits.load.value.toFixed(0)} g (${limits.load.confidence}); greatest load ${Math.max(peakG, results.exitG, results.entryG).toFixed(1)} g.`,
  };
}

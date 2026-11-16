/**
 * One law of thrust for every engine the simulators fly: `count` alike, each at `throttle` (0 to 1) of its vacuum thrust,
 * less its nozzle's exit area times the air's pressure there. A stage's record gives its vacuum figure (orbital.ts
 * an orbital stage's `EngineDef.thrust.vacuum`); a ballistic flight's engine its sea-level one (the plan engine's `thrust.seaLevel`), whose vacuum
 * figure is derived here from it and the exit area (`vacuumOf`), and labelled so. The throttle is on the jet's own thrust;
 * the air's push back on the nozzle's exit is the same whatever the chamber does.
 */
import type { Measure } from '../measure.ts';
import { P0 } from '../world/bodies.ts';

/** The thrust of `count` engines at `throttle` in air of `pressure`, Pa, N: n (throttle Fvac - Ae p), and never less than nothing. */
export function nozzleThrust(count: number, vacuum: number, throttle: number, exitArea: number, pressure: number): number {
  return Math.max(0, count * (throttle * vacuum - exitArea * pressure));
}

/** An engine's vacuum thrust from its sea-level figure and its exit area: F_sl + P0 Ae, derived. */
export function vacuumOf(engine: { thrust: Measure; exitArea: Measure }): Measure {
  return {
    value: engine.thrust.value + P0 * engine.exitArea.value,
    confidence: 'derived',
    source: `the sea-level thrust (${engine.thrust.confidence}) plus one atmosphere times the nozzle's exit area (${engine.exitArea.confidence}): sim/thrust.ts`,
  };
}

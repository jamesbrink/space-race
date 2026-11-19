/**
 * GATV-5001 on Atlas 5307, 11 November 1966, as a flight into orbit: its record (vehicles/target-plan.ts
 * `TargetRecord`), from the Gemini XII mission report's own weights, sequence and trajectory. Times are seconds from
 * liftoff, 19:07:58.688 G.m.t. Tolerances set with the record, before it was flown; a miss is recorded in src/sim/misses.ts.
 */
import { targetRecord } from '../../vehicles/target-plan.ts';

const R = 'Gemini Program Mission Report, Gemini XII, MSC-G-R-67-1 (January 1967)';

export const orbital = targetRecord(
  {
    weights: {
      source: `${R}, 3.6`,
      liftoff: 279_182,
      beco: 73_701,
      seco: 26_527,
      veco: 26_415,
      payload: 18_071,
      separated: 17_653,
      inOrbit: 7_114,
    },
    times: {
      source: `${R}, Table 4.2-III (actual)`,
      beco: 131.11,
      staging: 134.66,
      seco: 280.12,
      veco: 298.06,
      separation: 300.3,
      ignition: 372.51,
      shroud: 381.72,
      cutoff: 555.85,
      speed: {
        value: 25_367,
        source: `the planned insertion, 25,367 ft/s space-fixed (${R}, Table 4.3-V), which the velocity meter was set to give`,
      },
    },
    states: {
      source: `${R}, Table 4.3-V (actual, final)`,
      beco: { altitude: 194_716, speed: 9_805, climb: 21.21 },
      seco: { altitude: 654_501, speed: 17_630, climb: 10.23 },
      veco: { altitude: 708_556, speed: 17_571, climb: 9.35 },
      ignition: { altitude: 875_900, speed: 17_292, climb: 5.6 },
      insertion: { altitude: 981_195, speed: 25_365, climb: 0.04 },
    },
    insertion: {
      source: `${R}, Tables 4.3-V and 4.3-VI (actual; its true anomaly "not well defined for near-circular orbits")`,
      axis: 3603.0,
      perigee: 159.0,
      apogee: 163.6,
      inclination: 28.86,
      period: 90.56,
      anomaly: 50.94,
      range: 1106.5,
      altitude: 981_195,
      climb: 0.04,
    },
  },
  'agena',
);

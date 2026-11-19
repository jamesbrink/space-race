/**
 * GATV-5006 on Atlas 5306, 12 September 1966, as a flight into orbit: its record (vehicles/target-plan.ts
 * `TargetRecord`), from the Gemini XI mission report's own weights, sequence and trajectory. Times are seconds from
 * liftoff, 13:05:01.725 G.m.t. Tolerances set with the record, before it was flown; a miss is recorded in src/sim/misses.ts.
 */
import { targetRecord } from '../../vehicles/target-plan.ts';

const R = 'Gemini Program Mission Report, Gemini XI, MSC-G-R-66-8 (October 1966)';

export const orbital = targetRecord(
  {
    weights: {
      source: `${R}, 3.6`,
      liftoff: 278_080,
      beco: 73_701,
      seco: 26_294,
      veco: 26_075,
      payload: 18_105,
      separated: 17_694,
      inOrbit: 7_198,
    },
    times: {
      source: `${R}, Table 4.2-III (actual)`,
      beco: 130.8,
      staging: 133.8,
      seco: 279.6,
      veco: 298.0,
      separation: 301.13,
      ignition: 373.21,
      shroud: 382.8,
      cutoff: 558.37,
      speed: {
        value: 25_367,
        source: `the planned insertion, 25,367 ft/s space-fixed (${R}, Table 4.3-V), which the velocity meter was set to give`,
      },
    },
    states: {
      source: `${R}, Table 4.3-V (actual, final)`,
      beco: { altitude: 194_752, speed: 9_791, climb: 21.12 },
      seco: { altitude: 651_221, speed: 17_626, climb: 10.37 },
      veco: { altitude: 706_908, speed: 17_572, climb: 9.35 },
      ignition: { altitude: 874_392, speed: 17_295, climb: 5.6 },
      insertion: { altitude: 983_548, speed: 25_360, climb: 0.07 },
    },
    insertion: {
      source: `${R}, Tables 4.3-V and 4.3-VI (actual; its true anomaly "not well defined for circular orbits")`,
      axis: 3602.5,
      perigee: 156.0,
      apogee: 165.39,
      inclination: 28.84,
      period: 90.46,
      anomaly: 77.4,
      range: 1112.7,
      altitude: 983_548,
      climb: 0.07,
    },
  },
  'agena',
);

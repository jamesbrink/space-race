/**
 * GATV-5005 on Atlas 5305, 18 July 1966, as a flight into orbit: its record (vehicles/target-plan.ts `TargetRecord`), from
 * the Gemini X mission report's own weights, sequence and trajectory. Times are seconds from liftoff, 20:39:46.131 G.m.t.
 * Tolerances set with the record, before it was flown; a miss is recorded in src/sim/misses.ts.
 */
import { targetRecord } from '../../vehicles/target-plan.ts';

const R = 'Gemini Program Mission Report, Gemini X, MSC-G-R-66-7 (August 1966)';

export const orbital = targetRecord(
  {
    weights: {
      source: `${R}, 3.6`,
      liftoff: 278_881,
      beco: 72_547,
      seco: 26_560,
      veco: 26_451,
      payload: 18_074,
      separated: 17_664,
      inOrbit: 7_184,
    },
    times: {
      source: `${R}, Table 4-III (actual)`,
      beco: 130.37,
      staging: 133.41,
      seco: 279.34,
      veco: 298.06,
      separation: 300.7,
      ignition: 370.37,
      shroud: 380.17,
      cutoff: 558.05,
      speed: {
        value: 25_368,
        source: `the planned insertion, 25,368 ft/s space-fixed (${R}, Table 4-IX), which the velocity meter was set to give`,
      },
    },
    states: {
      source: `${R}, Table 4-IX (actual, final)`,
      beco: { altitude: 197_776, speed: 9_818, climb: 21.46 },
      seco: { altitude: 658_482, speed: 17_610, climb: 10.19 },
      veco: { altitude: 713_993, speed: 17_560, climb: 9.23 },
      ignition: { altitude: 875_500, speed: 17_295, climb: 5.75 },
      insertion: { altitude: 979_215, speed: 25_366, climb: -0.03 },
    },
    insertion: {
      source: `${R}, Tables 4-IX and 4-X (actual)`,
      axis: 3603,
      perigee: 158.5,
      apogee: 164.3,
      inclination: 28.85,
      period: 90.46,
      anomaly: -45.92,
      range: 1111,
      altitude: 979_215,
      climb: -0.03,
    },
  },
  'agena',
);

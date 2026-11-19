/**
 * GATV-5003 on Atlas 5302, 16 March 1966, as a flight into orbit: its record (vehicles/target-plan.ts `TargetRecord`),
 * from the Gemini VIII mission report's own weights, sequence and trajectory. Times are seconds from liftoff, 15:00:03.13
 * G.m.t. The checks' tolerances were set with the record, before the plan was first flown; a miss is recorded in
 * src/sim/misses.ts, not fitted.
 */
import { targetRecord } from '../../vehicles/target-plan.ts';

const R = 'Gemini Program Mission Report, Gemini VIII, MSC-G-R-66-4 (April 1966)';

export const orbital = targetRecord(
  {
    weights: { source: `${R}, 3.6`, liftoff: 279_387, beco: 73_565, seco: 26_815, payload: 18_097, separated: 17_686, inOrbit: 7_116 },
    times: {
      source: `${R}, Table 4.2-II (actual)`,
      beco: 129.79,
      staging: 132.75,
      seco: 283.68,
      veco: 303.94,
      separation: 308.3,
      ignition: 377.5,
      shroud: 386.41,
      cutoff: 560.4,
      speed: {
        value: 25_367,
        source: `the planned insertion, 25,367 ft/s space-fixed (${R}, Table 4.3-V); the velocity meter set to give it ("A ΔV of 8246.5 ft/sec was planned and achieved", 5.4.2.5)`,
      },
    },
    states: {
      source: `${R}, Table 4.3-V (actual; the insertion's speed the preliminary, the final's digits unreadable in the copy read)`,
      beco: { altitude: 190_500, speed: 9_715, climb: 20.87 },
      seco: { altitude: 654_190, speed: 17_630, climb: 10.14 },
      veco: { altitude: 709_380, speed: 17_588, climb: 9.31 },
      ignition: { altitude: 875_825, speed: 17_297, climb: 5.6 },
      insertion: { altitude: 980_359, speed: 25_366, climb: 0.003 },
    },
    insertion: {
      source: `${R}, Tables 4.3-V and 4.3-VI (actual)`,
      axis: 3603.0,
      perigee: 161.36,
      apogee: 165.55,
      inclination: 28.86,
      period: 90.47,
      anomaly: 4.44,
      range: 1117.6,
      altitude: 980_359,
      climb: 0.003,
    },
  },
  'agena',
);

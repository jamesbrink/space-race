/**
 * The ATDA on Atlas 5304, 1 June 1966, as a flight into orbit: its record (vehicles/target-plan.ts `TargetRecord`), from
 * the Gemini IX-A mission report's own weights, sequence and trajectory. The Atlas alone put it in orbit; it was let go by
 * a command from Houston 16 s after the verniers' cutoff. Times are seconds from liftoff, 15:00:02.363 G.m.t. Tolerances
 * set with the record, before it was flown; a miss is recorded in src/sim/misses.ts.
 */
import { targetRecord } from '../../vehicles/target-plan.ts';

const R = 'Gemini Program Mission Report, Gemini IX-A, MSC-G-R-66-6 (July 1966)';

export const orbital = targetRecord(
  {
    weights: { source: `${R}, 3.6`, liftoff: 264_320, beco: 76_860, seco: 9_571, payload: 2_006, separated: 2_006 },
    times: {
      source: `${R}, Table 4.2-II (actual; the jettison printed 320.18 s for 120.18, booster cutoff + 3 s)`,
      beco: 117.21,
      staging: 120.18,
      seco: 348.7,
      veco: 367.54,
      separation: 383.41,
      secoSpeed: {
        value: 25_298,
        source: `the planned sustainer cutoff, 25,298 ft/s space-fixed (${R}, Table 4.3-V), at which the ground's radio guidance cut it`,
      },
    },
    states: {
      source: `${R}, Table 4.3-V (actual, final; the last cutoff's state is the verniers')`,
      beco: { altitude: 214_642, speed: 8_429, climb: 36.9 },
      seco: { altitude: 979_465, speed: 25_290, climb: 0.06 },
      veco: { altitude: 979_602, speed: 25_365, climb: -0.01 },
      insertion: { altitude: 979_602, speed: 25_365, climb: -0.01 },
    },
    insertion: {
      source: `${R}, Tables 4.3-V and 4.3-VI (actual: the osculating elements at the ATDA's separation; the law's target is the verniers' cutoff)`,
      axis: 3605.2,
      perigee: 161.0,
      apogee: 167.1,
      inclination: 28.87,
      period: 90.5,
      anomaly: -14.2,
      range: 580.5,
      altitude: 979_602,
      climb: -0.01,
    },
  },
  'atda',
);

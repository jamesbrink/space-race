/**
 * GATV-5002 on Atlas 5301, 25 October 1965, as the record has it: the Atlas and the coast normal, the Agena's engine
 * shut down 0.91 s after it was started at 367.53 s, and the vehicle lost 7 s later (its record, vehicles/target-plan.ts
 * `TargetRecord`, from the Gemini VI-A mission report). The law is solved on the flight as planned (`planned`). Times are
 * seconds from liftoff, 15:00:04.490 G.m.t.
 *
 * Not flown, for want of figures: the hard start's thrust in the 0.91 s (taken as rated), the breakup at about 375.7 s
 * (its tanks most probably burst, LSFR III.E-2; Patrick's radar then tracked five pieces), and the pieces' own paths.
 * What fell is flown as one Agena with its shroud on, to the sea.
 */
import { PLANNED_GAATV, targetRecord } from '../../vehicles/target-plan.ts';

const R = 'Gemini Program Mission Report, Gemini VI-A, MSC-G-R-65-5 (October 1965)';
const W =
  "Gemini VIII's (Gemini Program Mission Report, MSC-G-R-66-4, 3.6), taken: the Gemini VI-A report's weight table was not read in the copy found";

const record = targetRecord(
  {
    weights: { ...PLANNED_GAATV.weights, taken: W },
    times: {
      source: `${R}, Table 4.2-I (actual) and 1.0 ("910 milliseconds after initiation of operation of the primary propulsion system at lift-off (LO) + 367.53 seconds. The primary propulsion system engine shut down at L0 + 368.44 seconds")`,
      beco: 130.45,
      staging: 133.41,
      seco: 281.39,
      veco: 303.7,
      separation: 305.97,
      ignition: 367.53,
      cutoff: 368.44,
    },
    states: {
      source: `${R}, Table 4.3-I (actual)`,
      beco: { altitude: 195_033, speed: 9_754, climb: 21.52 },
      seco: { altitude: 659_513, speed: 17_656, climb: 10.08 },
      veco: { altitude: 724_795, speed: 17_542, climb: 9.05 },
      ignition: { altitude: 867_755, speed: 17_290, climb: 5.94 },
    },
    insertion: PLANNED_GAATV.insertion,
    fell: {
      impact: {
        latitude: 27 + 30.57 / 60,
        longitude: -(48 + 59.33 / 60),
        tolerance: 1,
        source: `the range's vacuum impact point from Kennedy's data at L0 + 492 s, 27°30.57′ N 48°59.33′ W (${R}, 6.1.2.1); from L0 + 311 s, 27°27.14′ N 48°50.97′ W. In vacuum, and of a vehicle that broke up`,
      },
    },
  },
  'agena',
);
record.planned = targetRecord(PLANNED_GAATV, 'agena');

export const orbital = record;

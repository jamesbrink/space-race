/**
 * GATV-5004 on Atlas 5303, 17 May 1966, as the record has it: control of the B2 booster chamber lost at 120.63 s, the
 * stack pitched down through 231 degrees and steadied by the sustainer, the Atlas's sequence run on its backups, the
 * Agena let go at 301.74 s and its engine never started (the range's thrust termination, LSFR III.C), into the Atlantic.
 * Its record (vehicles/target-plan.ts `TargetRecord`) is from Convair's flight evaluation report as the Gemini IX-A
 * mission report prints it (12.7); the law is solved on the flight as planned (`planned`). Times are seconds from
 * liftoff, 15:15:03.422 G.m.t.
 *
 * Not flown, for want of figures: the turn to the left (northward) the tracking film showed, given in no figure; the
 * pitch between 120.63 and 150 s, given only at its ends, flown evenly; how long the 15 degree back-off to the gyro's
 * null took; and anything the range's radar has of the path but one point (436 s: 103.4 nautical miles out, 97,000 ft,
 * going north and coming down) and an impact 107 nautical miles north-east, neither a place the run can be held to.
 */
import { doc } from '../../../../../src/measure.ts';
import { LSFR, PLANNED_GAATV, targetRecord } from '../../vehicles/target-plan.ts';

const R =
  'Gemini Program Mission Report, Gemini IX-A, MSC-G-R-66-6 (July 1966), 12.7: Convair, Atlas SLV-3 5303 Flight Evaluation Report, GDC/BKF66-029';
const W = "Gemini VIII's (Gemini Program Mission Report, MSC-G-R-66-4, 3.6), taken: no weight table for 5303 or GATV-5004 was read";

const record = targetRecord(
  {
    weights: { ...PLANNED_GAATV.weights, taken: W },
    times: {
      source: `${R}, Tables 2-1 and 2-3: booster cutoff by the backup accelerometer, the sustainer's by liquid oxygen depletion, the verniers' and the Agena's separation by the programmer's backups`,
      beco: 130.977,
      staging: 134.094,
      seco: 274.282,
      veco: 299.245,
      separation: 301.736,
    },
    states: { source: `${R}: no trajectory table` },
    insertion: PLANNED_GAATV.insertion,
    fell: {
      lost: {
        at: doc(120.63, `"loss of B2 pitch control at 120.63 seconds" (${R}, section 1)`),
        tilt: {
          points: [
            [120.63, 67],
            [150, 298],
            [155, 283],
          ],
          confidence: 'estimated',
          source:
            `documented at its ends: "pitched down 216 degrees from the 67 degree reference at 120.6 seconds"; "Good stability was regained in all channels by 150 seconds. At this time, the vehicle had pitched down a total of 231 degrees from the 67 degree reference ... The pitch angle then backed off 15 degrees to the displacement gyro null. The vehicle pitch angle, measured from the inertial vertical at liftoff, was approximately 283 degrees" (${R}, section 2). ` +
            `Between them, turned evenly, and the back-off taken as five seconds: estimated. Held at 283 degrees after it, "pointed toward Cape Kennedy in a climbing attitude about 13 deg above the horizontal" (${LSFR}, IV.D.3); the turn to the north is left out`,
        },
      },
    },
  },
  'agena',
);
record.planned = targetRecord(
  {
    ...PLANNED_GAATV,
    times: {
      ...PLANNED_GAATV.times,
      source: `the Atlas's preflight nominals for 5303 (${R}, Table 2-3: BECO 130.500, SECO 279.969, VECO 299.500, Agena separation 302.000), the Agena's Gemini VIII's planned (${PLANNED_GAATV.times.source})`,
      beco: 130.5,
      staging: 133.5,
      seco: 279.969,
      veco: 299.5,
      separation: 302.0,
    },
  },
  'agena',
);
export const orbital = record;

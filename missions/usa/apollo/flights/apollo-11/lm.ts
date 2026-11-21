/**
 * Apollo 11's lunar module, LM-5 Eagle, as its mission report gives it (lm-record.ts): what vehicles/lm-plan.ts writes its
 * plan from. MSC-00171, table A-I (p. A-11, mass properties: read off the scan, whose text layer is garbled) and §9.13.
 */
import { assumed, derived, doc } from '../../../../../src/measure.ts';
import { G0 } from '../../../../../src/world/bodies.ts';
import { DPS_THRUST } from '../../vehicles/lm-plan.ts';
import { massRow } from '../../vehicles/lm-rcs.ts';
import type { LmRecord } from '../../vehicles/lm-record.ts';

const LB = 0.45359237;
const REPORT = 'Apollo 11 Mission Report, MSC-00171 (November 1969)';
const TABLE = `${REPORT}, table A-I, mass properties, lunar module`;
const row = (label: string) => `${TABLE}, ${label}`;

/** A row of the table's centres of mass (LM coordinates, inches). */
const centre = (weight: number, x: number, y: number, z: number, label: string) => ({
  mass: doc(weight * LB, row(label)),
  x: doc(x, row(label)),
  y: doc(y, row(label)),
  z: doc(z, row(label)),
});

/** The hover's flow at its 26 per cent (TN D-7143, fig. 18), lb/s, at R-567's specific impulse there (between its rows at 0.252 and 0.401). */
const HOVER = 0.26;
const HOVER_ISP = 293.6 + ((HOVER - 0.252) / (0.401 - 0.252)) * (295.0 - 293.6);
const HOVER_FLOW = (DPS_THRUST.value * HOVER) / (G0 * HOVER_ISP) / LB;
/** What was left at the cutoff that could not have been burned, lb. */
const UNUSABLE = 770 - 50 * HOVER_FLOW;

export const eagle: LmRecord = {
  label: 'Eagle',
  unit: 'LM-5',
  mass: doc(33_683.5 * LB, row('separation: 33,683.5 lb')),
  ascent: assumed(
    10_776.6 * LB,
    `${row('lunar lift-off: 10,776.6 lb')}, taken for the ascent stage as it separated: what the surface stay changed (samples aboard, the backpacks and gear left) and what the reaction control system drew in the descent are not accounted`,
  ),
  descent: derived((33_683.5 - 10_776.6) * LB, `${TABLE}: the separation's 33,683.5 lb less the lift-off's 10,776.6 lb`),
  dps: {
    loaded: doc(18_184 * LB, `${REPORT}, §9.13.1: descent propulsion system propellant loaded, 6,975 lb of fuel and 11,209 lb of oxidizer`),
    usable: derived(
      (18_184 - UNUSABLE) * LB,
      `${REPORT}, §9.13.1 and §9.8.3: 770 lb left at the engine's cutoff, of which what 50 s more would have drawn (the postflight figure to oxidizer tank 2's depletion) at the hover's 26 per cent (TN D-7143, fig. 18; R-567's specific impulse there, ${HOVER_FLOW.toFixed(2)} lb/s) could still have been burned: ${UNUSABLE.toFixed(0)} lb was not usable`,
    ),
  },
  aps: {
    loaded: doc(5238 * LB, `${REPORT}, §9.13.2: ascent propulsion system propellant loaded, 2,020 lb of fuel and 3,218 lb of oxidizer`),
    usable: assumed(
      5238 * LB,
      `${REPORT}, §9.13.2: no unusable figure read (402 lb was left at the ascent stage's jettison): all of it taken as usable`,
    ),
  },
  rcs: {
    a: doc(317 * LB, `${REPORT}, §9.13.3: reaction control system propellant loaded, system A 108 lb of fuel and 209 lb of oxidizer`),
    b: doc(317 * LB, `${REPORT}, §9.13.3: system B 108 lb of fuel and 209 lb of oxidizer`),
  },
  centre: {
    x: doc(186.5, row('separation: X 186.5 in')),
    y: doc(0.2, row('separation: Y 0.2 in')),
    z: doc(0.7, row('separation: Z 0.7 in')),
  },
  // (the whole lunar module from its separation to its landing, then the ascent stage; Ixx, Iyy and Izz about the LM's own axes)
  inertia: [
    massRow(33_683.5, 23_658, 26_065, 25_922, row('separation')),
    massRow(33_669.6, 23_649, 26_045, 25_899, row('descent orbit insertion, ignition')),
    massRow(33_401.6, 23_480, 25_978, 25_871, row('descent orbit insertion, cutoff')),
    massRow(16_153.2, 12_582, 13_867, 16_204, row('lunar landing')),
    massRow(10_776.6, 6808, 3475, 5971, row('lunar lift-off')),
    massRow(5928.6, 3457, 3082, 2273, row('orbit insertion (its Iyy read as 3,082 off a blurred digit)')),
    massRow(5881.5, 3437, 3069, 2246, row('coelliptic sequence initiation')),
    massRow(5738.0, 3369, 3044, 2167, row('docking')),
    massRow(5462.5, 3226, 3039, 2216, row('jettison')),
  ],
  centres: [
    centre(33_683.5, 186.5, 0.2, 0.7, 'separation'),
    centre(33_669.6, 186.5, 0.2, 0.8, 'descent orbit insertion, ignition'),
    centre(33_401.6, 186.5, 0.2, 0.8, 'descent orbit insertion, cutoff'),
    centre(16_153.2, 213.5, 0.4, 1.6, 'lunar landing'),
    centre(10_776.6, 243.5, 0.2, 2.9, 'lunar lift-off'),
    centre(5928.6, 255.3, 0.4, 5.3, 'orbit insertion'),
    centre(5881.5, 255.0, 0.4, 5.3, 'coelliptic sequence initiation'),
    centre(5738.0, 254.4, 0.4, 5.4, 'docking'),
    centre(5462.5, 255.0, 0.1, 3.1, 'jettison'),
  ],
  probes: ['right', 'aft', 'left'],
  landed: { mass: doc(16_153.2 * LB, row('lunar landing: 16,153.2 lb')) },
  liftoff: { mass: doc(10_776.6 * LB, row('lunar lift-off: 10,776.6 lb')) },
};

/**
 * The lunar module's reaction control system as the simulator flies the craft's attitude with it (sim/attitude.ts): its
 * sixteen thrusters as hardware, four to a cluster on the ascent stage's outriggers, each where the guidance computer was
 * told it was and pushing the way it does, so the torque each gives is worked from where it stands. Nothing here names a
 * flight: a flight gives its centre of mass, its loads and its mass properties (lm-record.ts).
 *
 * The thrusters (lunar-module.md, reaction-control.md): MIT R-567, section 6, §6.4.1.4, each one's reference position in
 * LM coordinates, metres (+X up the thrust axis, +Y to the crew's right, +Z forward, out of the hatch; the origin 254 in
 * below the plane of the clusters), and §6.4.5.2, each one's force along a body axis, 444.82 N. The clusters are numbered
 * 1 to 4 from the left forward one round by the rear (quad 1 by -Y +Z, 2 by -Y -Z, 3 by +Y -Z, 4 by +Y +Z); each has an up-
 * and a down-firing thruster (U above the cluster's plane, D below it) and two firing level, one along Z and one along Y,
 * each out from the cluster. Their names and the system that feeds each are the handbook's (LMA790-3-LM, vol. I, §2.4,
 * figure 2.4-9): system A A1U, A1F, A2D, A2A, A3U, A3R, A4D, A4R; system B B1D, B1L, B2U, B2L, B3D, B3A, B4U, B4F. A
 * thruster's push is opposite its plume.
 *
 * The axes the commands turn about are the body's, as sim/attitude.ts and types.ts `Thruster` name them: roll about +X,
 * pitch about +Y, yaw about +Z. The lunar module's own names differ: its yaw is about X and its roll about Z. So here the
 * type's `roll` is the lunar module's yaw, worked by the level thrusters, and its `yaw` the lunar module's roll; pitch is
 * pitch. Each up- or down-firing thruster stands off both the Y and the Z axis, so it is listed twice, for pitch and for the
 * turn about Z, as one chamber (the autopilot opens it once, for the longer): a pitch command opens the four whose turns
 * about Z cancel, as the jet-select logic did.
 */
import { derived, doc, estimated, type Measure } from '../../../../src/measure.ts';
import type { ThrusterSet } from '../../../../src/sim/plan.ts';
import type { Thruster } from '../../../../src/types.ts';

const IN = 0.0254;

const R567 =
  'MIT Instrumentation Laboratory R-567, section 6, Control Data (November 1968): §6.4.1.4, the RCS thruster positions RCPOS1–16 in LM coordinates';
const AOH = 'Grumman LMA790-3-LM, Apollo Operations Handbook, LM-10 and subsequent, vol. I (1970)';

/** Each thruster's force, N. */
export const LM_RCS_THRUST = doc(
  444.82,
  `${R567}; §6.4.5.2, RCFORCE: 444.82 N along a body axis for each jet. ${AOH}, §2.4.3.4: "the full 100 pounds of thrust"`,
);
/** What each thruster's propellant gives, s: its force over the mass it draws a second, over g0. */
export const LM_RCS_ISP = derived(
  444.82 / (0.161 * 9.80665),
  'MIT R-567 §6.4.5.1: the constant RCS mass flow rate JSECTOKG, 0.1610 kg/s a thruster, against its 444.82 N (§6.4.5.2): 281.7 s. The 0.0009525 kg penalty R-567 adds for each firing (NFIRTOKG) is not flown',
);
/** The least time a thruster is opened for, s. */
export const LM_RCS_MINIMUM = doc(
  0.013,
  `MIT R-567 §6.4.5.1, TMINPULS: the minimum allowed RCS electrical pulse length, 0.013 s. ${AOH}, §2.4.3.4: "the minimum pulse for TCA firing (at 21 volts) is 13 milliseconds"`,
);
/** The attitude hold's deadband, degrees. */
export const LM_DEADBAND = doc(
  0.3,
  `${AOH}, §2.1, attitude and translation control assembly: the narrow deadband, "-0.3° to +0.3° roll and pitch; 0.4° to +0.4° yaw" (the wide one ±5°), selected automatically whenever the ascent or descent engine is on. The pitch and roll figure is taken for all three axes`,
);
/** The attitude hold's rate deadband, degrees a second: no figure read for the lunar module's. */
export const LM_RATEBAND = estimated(
  0.2,
  'no figure read for the lunar module’s autopilot: the command and service module’s stabilization and control system’s at its low rate setting (sm-rcs.ts SCS_RATEBAND, ±0.2 deg/s) is taken. Ours',
);
/** The hand's rate at full throw, degrees a second. */
export const LM_HAND_RATE = doc(
  5,
  `${AOH}, §2.1 (attitude and translation control assembly, narrow deadband): the limiters "maintain the vehicle rates at a maximum of 10°/sec in pitch and 5°/sec in roll and yaw" during descent or ascent; the 5°/sec is taken for every axis`,
);

/** One thruster as R-567 places it: its cluster, its handbook name, where it is (m, LM coordinates) and its push. */
const JETS: { quad: number; name: string; at: [number, number, number]; push: [number, number, number] }[] = [
  // (quad 4, +Y +Z: R-567 jets 1-4)
  { quad: 4, name: 'B4U', at: [6.57352, 1.67894, 1.67894], push: [-1, 0, 0] },
  { quad: 4, name: 'A4D', at: [6.31698, 1.67894, 1.67894], push: [1, 0, 0] },
  { quad: 4, name: 'B4F', at: [6.4516, 1.5621, 1.68529], push: [0, 0, -1] },
  { quad: 4, name: 'A4R', at: [6.4516, 1.68529, 1.5621], push: [0, -1, 0] },
  // (quad 3, +Y -Z: jets 5-8)
  { quad: 3, name: 'A3U', at: [6.57352, 1.67894, -1.67894], push: [-1, 0, 0] },
  { quad: 3, name: 'B3D', at: [6.31698, 1.67894, -1.67894], push: [1, 0, 0] },
  { quad: 3, name: 'B3A', at: [6.4516, 1.5621, -1.68529], push: [0, 0, 1] },
  { quad: 3, name: 'A3R', at: [6.4516, 1.68529, -1.5621], push: [0, -1, 0] },
  // (quad 2, -Y -Z: jets 9-12)
  { quad: 2, name: 'B2U', at: [6.57352, -1.67894, -1.67894], push: [-1, 0, 0] },
  { quad: 2, name: 'A2D', at: [6.31698, -1.67894, -1.67894], push: [1, 0, 0] },
  { quad: 2, name: 'A2A', at: [6.4516, -1.5621, -1.68529], push: [0, 0, 1] },
  { quad: 2, name: 'B2L', at: [6.4516, -1.68529, -1.5621], push: [0, 1, 0] },
  // (quad 1, -Y +Z: jets 13-16)
  { quad: 1, name: 'A1U', at: [6.57352, -1.67894, 1.67894], push: [-1, 0, 0] },
  { quad: 1, name: 'B1D', at: [6.31698, -1.67894, 1.67894], push: [1, 0, 0] },
  { quad: 1, name: 'A1F', at: [6.4516, -1.5621, 1.68529], push: [0, 0, -1] },
  { quad: 1, name: 'B1L', at: [6.4516, -1.68529, 1.5621], push: [0, 1, 0] },
];

/** The thrusters about the centre of mass `centre` (LM coordinates, inches), each under the commands it answers. */
export function lmRcsChambers(centre: readonly [number, number, number], centreSource: string): Thruster[] {
  const c = centre.map((x) => x * IN);
  const out: Thruster[] = [];
  for (const j of JETS) {
    const at: [number, number, number] = [j.at[0] - c[0]!, j.at[1] - c[1]!, j.at[2] - c[2]!];
    const p = j.push;
    const torque = [at[1] * p[2] - at[2] * p[1], at[2] * p[0] - at[0] * p[2], at[0] * p[1] - at[1] * p[0]];
    // (a thruster firing up or down answers pitch and the turn about Z; one firing level, the turn about X: the jet-select logic's)
    const axes: (0 | 1 | 2)[] = p[0] !== 0 ? [1, 2] : [0];
    for (const i of axes)
      out.push({
        name: `${j.name}, quad ${j.quad}`,
        supply: j.name.startsWith('A') ? 'System A' : 'System B',
        axis: (['roll', 'pitch', 'yaw'] as const)[i]!,
        sense: torque[i]! > 0 ? 1 : -1,
        at,
        push: p,
        thrust: LM_RCS_THRUST.value,
        confidence: 'documented',
        source: `${R567}; the names and systems: ${AOH}, §2.4. The centre of mass: ${centreSource}`,
      });
  }
  return out;
}

/** What the lunar module's attitude control adds to its thruster set, given its centre of mass, each system's load and its mass properties. */
export function lmRcsSet(f: {
  centre: { x: Measure; y: Measure; z: Measure };
  load: { a: Measure; b: Measure };
  inertia: NonNullable<ThrusterSet['inertia']>;
}): Pick<ThrusterSet, 'chambers' | 'supplies' | 'inertia' | 'minimum' | 'deadband' | 'rateband' | 'rate'> {
  return {
    chambers: lmRcsChambers([f.centre.x.value, f.centre.y.value, f.centre.z.value], f.centre.x.source),
    supplies: [
      { name: 'System A', mode: 'automatic', propellant: f.load.a, isp: LM_RCS_ISP },
      { name: 'System B', mode: 'automatic', propellant: f.load.b, isp: LM_RCS_ISP },
    ],
    inertia: f.inertia,
    minimum: LM_RCS_MINIMUM,
    deadband: LM_DEADBAND,
    rateband: LM_RATEBAND,
    rate: LM_HAND_RATE,
  };
}

/** A row of a record's lunar module mass properties: weight, lb, and moments of inertia about X, Y and Z, slug ft² (the source names the table). */
export { massRow } from './sm-rcs.ts';

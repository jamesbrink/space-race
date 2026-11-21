/**
 * The service module's reaction control system as the simulator flies the spacecraft's attitude with it (sim/attitude.ts):
 * its sixteen chambers as hardware, four to a quad, each quad's four (two along the long axis, two across it, for roll)
 * placed at the quad's reference point and pushing the way it does, so the torque each gives is worked from where it stands.
 * Nothing here names a flight: a flight gives its own centre of mass, propellant load and mass properties.
 *
 * The quads (reaction-control.md): MIT R-547, vol. III, Table 1.3 (p. 1-18), CSM-101's preflight reference locations,
 * r = 83.56 in from the axis at XA 958.905, four packages 90 degrees apart offset 7 deg 15 min from the Y and Z axes
 * (corroborated by the Block II Apollo Operations Handbook, §2.5.1, p. 2.5-1), every chamber canted 10 degrees outward
 * (the same page; the News Reference, p. 147). Quad A lies by -Z, B by +Y, C by +Z, D by -Y. The body's axes here are the
 * spacecraft's own, XA to the command module's apex, YA and ZA as the record's: what turns about +Y is pitch, about +Z yaw.
 * Each chamber's push is opposite its plume, which leaves along its axial or circumferential line turned out by the cant.
 */
import { assumed, doc, estimated, type Measure } from '../../../../src/measure.ts';
import type { ThrusterSet } from '../../../../src/sim/plan.ts';
import type { Thruster } from '../../../../src/types.ts';

const IN = 0.0254;
const LB = 0.45359237;
const LBF = 4.448221615;
const SLUG_FT2 = 1.35581795;
const DEG = Math.PI / 180;

const R547 = 'MIT R-547, vol. III (October 1966), Table 1.3, p. 1-18: CSM-101 preflight quad reference locations and thrust directions';
/** The quads' radius and station, inches, and their offset from the Y and Z axes, degrees. */
const QUAD_RADIUS = 83.56;
const QUAD_STATION = 958.905;
const QUAD_OFFSET = 7.25;
const CANT = 10;

/** Each engine's thrust, N. */
export const SM_RCS_THRUST = assumed(
  100 * LBF,
  'North American Rockwell, Apollo News Reference, Reaction Control, p. 149: "Each engine has a nominal thrust of 100 pounds" (the H missions’ edition; taken for CSM-101, the same Marquardt engine)',
);
/** What each engine's propellant gives, s: not in anything read. */
export const SM_RCS_ISP = estimated(
  280,
  'not found in the News Reference or the Operations Handbook (both refer to the Data Book, SNA-8-D-027, not read): an R-4D’s steady-state figure is commonly quoted near 290 s, and pulses give less; 280 s is taken. Ours',
);
/** The least time the stabilization and control system opens a chamber for, s. */
export const SM_RCS_MINIMUM = assumed(
  0.015,
  'Apollo Operations Handbook, Block II, vol. 1, §2.3.4.4.2–3, pp. 2.3-36A and 2.3-37: the one-shot "provides a command to the auto RCS logic for a nominal 15 ms" (13 to 17 ms over the bus voltage); the News Reference, p. 149, has each engine’s "Minimum firing time is 12 milliseconds"',
);
/** The stabilization and control system's attitude hold at the low rate setting and the narrow deadband. */
export const SCS_DEADBAND = doc(
  0.2,
  'Apollo 7 Mission Report (MSC-PA-R-68-15), Table 5.16-V, control mode usage: SCS rate command, "Limit cycle within low rate, minimum deadband (0.2 deg)", verified by the crew and by telemetry; the Operations Handbook’s table, p. 2.3-36A, gives the same (LOW, MIN: ±0.2 deg; MAX ±4.2 deg)',
);
export const SCS_RATEBAND = assumed(
  0.2,
  'Apollo Operations Handbook, Block II, vol. 1, §2.3.4.4.2, table p. 2.3-36A: the rate deadband at the RATE switch’s LOW setting, ±0.2 deg/s (HIGH ±2)',
);

/**
 * The sixteen chambers about the centre of mass at station `centre` (XA, inches): quad by quad, +X and -X, then roll each
 * way. `isolated`: a quad shut off for a fault the record has, by its letter, from the instant given (`Thruster.isolated`).
 */
export function smRcsChambers(centre: number, centreSource: string, isolated: Partial<Record<'A' | 'B' | 'C' | 'D', Measure>> = {}): Thruster[] {
  const out: Thruster[] = [];
  const quads: [name: string, angle: number][] = [
    // (the angle of each quad's outward line about +X from +Y toward +Z: A by -Z, B by +Y, C by +Z, D by -Y, each turned 7.25 degrees the clockwise way looking aft)
    ['A', -90 - QUAD_OFFSET],
    ['B', 0 - QUAD_OFFSET],
    ['C', 90 - QUAD_OFFSET],
    ['D', 180 - QUAD_OFFSET],
  ];
  const [c, s] = [Math.cos(CANT * DEG), Math.sin(CANT * DEG)];
  for (const [name, angle] of quads) {
    const out_: [number, number, number] = [0, Math.cos(angle * DEG), Math.sin(angle * DEG)];
    const around: [number, number, number] = [0, -Math.sin(angle * DEG), Math.cos(angle * DEG)];
    const at: [number, number, number] = [(QUAD_STATION - centre) * IN, out_[1] * QUAD_RADIUS * IN, out_[2] * QUAD_RADIUS * IN];
    // (a push along `along`: the plume goes the other way, turned out by the cant, so the push is turned in by it)
    const chamber = (label: string, along: [number, number, number]): void => {
      const push: [number, number, number] = [0, 1, 2].map((i) => along[i]! * c - out_[i]! * s) as [number, number, number];
      // (which command opens it: the axis it turns most about, and the way)
      const torque = [at[1] * push[2] - at[2] * push[1], at[2] * push[0] - at[0] * push[2], at[0] * push[1] - at[1] * push[0]];
      const i = [0, 1, 2].reduce((m, k) => (Math.abs(torque[k]!) > Math.abs(torque[m]!) ? k : m), 0);
      out.push({
        name: `Quad ${name}, ${label}`,
        supply: 'sm-rcs',
        axis: (['roll', 'pitch', 'yaw'] as const)[i]!,
        sense: torque[i]! > 0 ? 1 : -1,
        at,
        push,
        thrust: SM_RCS_THRUST.value,
        ...(isolated[name as 'A' | 'B' | 'C' | 'D'] ? { isolated: isolated[name as 'A' | 'B' | 'C' | 'D'] } : {}),
        confidence: 'assumed',
        source: `${R547}; the Operations Handbook’s 10 degree cant; the four engines of a quad taken at its reference point (their offsets in the housing are not modelled). The centre of mass: ${centreSource}. ${SM_RCS_THRUST.source}`,
      });
    };
    chamber('pushing +X', [1, 0, 0]);
    chamber('pushing -X', [-1, 0, 0]);
    chamber('roll, pushing round +X', around);
    chamber('roll, pushing round -X', [0, -around[1], -around[2]]);
  }
  return out;
}

/** A row of a record's mass properties: weight, lb, and moments of inertia about XA, YA and ZA, slug ft² (the source names the table). */
export const massRow = (
  weight: number,
  ix: number,
  iy: number,
  iz: number,
  source: string,
): NonNullable<ThrusterSet['inertia']>[number] => ({
  mass: doc(weight * LB, source),
  roll: doc(ix * SLUG_FT2, source),
  pitch: doc(iy * SLUG_FT2, source),
  yaw: doc(iz * SLUG_FT2, source),
});

/** What the service module's attitude control adds to its thruster set, given the flight's centre of mass, load and mass properties. */
export function smRcsSet(f: {
  centre: Measure;
  load: Measure;
  inertia: NonNullable<ThrusterSet['inertia']>;
  isolated?: Partial<Record<'A' | 'B' | 'C' | 'D', Measure>>;
}): Pick<ThrusterSet, 'chambers' | 'supplies' | 'inertia' | 'minimum' | 'deadband' | 'rateband'> {
  return {
    chambers: smRcsChambers(f.centre.value, f.centre.source, f.isolated),
    supplies: [{ name: 'sm-rcs', mode: 'automatic', propellant: f.load, isp: SM_RCS_ISP }],
    inertia: f.inertia,
    minimum: SM_RCS_MINIMUM,
    deadband: SCS_DEADBAND,
    rateband: SCS_RATEBAND,
  };
}

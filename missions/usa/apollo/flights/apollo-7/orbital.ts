/** Apollo 7 as flown by CSM-101 and Saturn IB AS-205. All elapsed times are ground elapsed time. */
import { assumed, derived, doc, estimated } from '../../../../../src/measure.ts';
import { trackedState } from '../../../../../src/sim/orbital.ts';
import type {
  Action,
  AttitudeDef,
  EngineDef,
  EventDef,
  FlightPlan,
  OrbitFix,
  PlanCheck,
  Pursuit,
  Trigger,
} from '../../../../../src/sim/plan.ts';
import type { ShedBody } from '../../../../../src/types.ts';
import { earthFrame } from '../../../../../src/world/earthframe.ts';
import { cross, dot, ecefToGeodetic, enuAxes, scale, sub, unit } from '../../../../../src/world/frames.ts';
import { step } from '../../../../../src/world/orbit.ts';

import { TRIM, TRIM_DRAG } from '../../vehicles/command-module-aero.ts';
import { aborts, escapeEngine } from './escape.ts';

const FT = 0.3048;
const IN = 0.0254;
const LB = 0.45359237;
const LBF = 4.448221615;
const NMI = 1852;
const T = (hours: number, minutes: number, seconds: number) => hours * 3600 + minutes * 60 + seconds;
const REPORT = 'Apollo 7 Mission Report (MSC-PA-R-68-15, December 1968)';
const ASCENT = 'Results of the Fifth Saturn IB Launch Vehicle Test Flight (MPR-SAT-FE-68-4)';
const ENTRY = 'Apollo 7 Entry Postflight Analysis (NASA, NTRS 19740072689)';
const EVENTS = `${REPORT}, Table 2-I, actual ground elapsed time`;
const WEIGHTS = `${REPORT}, Table A.5-I, postflight spacecraft mass properties`;
const SEPARATION = T(2, 55, 2.4);
const LV_TRAJ = 'Saturn AS-205/CSM-101 Postflight Trajectory (TH-AP-68-369)';
const MODULES = T(259, 43, 33.8);
const INTERFACE = T(259, 53, 27);
const DROGUE = T(260, 3, 23);
const MAIN = T(260, 4, 13);
const SPLASH = T(260, 9, 3);
const J2_OFF = 616.75;
const INSERTION = 626.76;

function timed(id: string, label: string, at: number, actions: Action[], source = EVENTS, when: Trigger[] = [{ time: at }]): EventDef {
  return { id, label, when, do: actions, automatic: true, at: doc(at, source), record: { id, label }, source };
}

function fix(
  source: string,
  [at, latitude, longitude, altitude, speed, climb, heading]: readonly [number, number, number, number, number, number, number],
): OrbitFix {
  return {
    at: doc(at, source),
    latitude: doc(latitude, source),
    longitude: doc(longitude, source),
    altitude: doc(altitude * FT, source),
    speed: doc(speed * FT, source),
    climb: doc(climb, source),
    heading: doc(heading, source),
  };
}

// Table XIII gives geocentric radius and latitude. The replay accepts WGS 84 geodetic positions.
function ascentFix(
  page: number,
  t: number,
  longitude: number,
  gcLatitude: number,
  radiusKm: number,
  speed: number,
  climb: number,
  heading: number,
): OrbitFix {
  const source = `${LV_TRAJ}, Table XIII, p. ${page}, range time ${t} s`;
  const radial = enuAxes({ latitude: gcLatitude, longitude }).up;
  const place = ecefToGeodetic(scale(radial, radiusKm * 1000));
  return {
    at: doc(t, source),
    longitude: doc(longitude, source),
    latitude: derived(place.latitude, `${source}, geocentric radius and latitude converted to WGS 84`),
    altitude: derived(place.height, `${source}, geocentric radius and latitude converted to WGS 84`),
    speed: doc(speed, source),
    climb: doc(climb, source),
    heading: doc(heading, source),
  };
}

const beforeSeparation = fix(`${REPORT}, Table 3-II, actual spacecraft/S-IVB separation, time to the tenth from ${LV_TRAJ}, Table VI`, [
  SEPARATION,
  13.0,
  -164.42,
  819_762,
  25_500,
  -0.3,
  60.86,
]);

const mark = (id: string, label: string, at: number, source = EVENTS) => ({ id, label, at: doc(at, source) });
/** A manoeuvre's impulse as the record has it, ft/s, held to a twentieth. */
const impulse = (id: string, label: string, fps: number, source: string): PlanCheck => ({
  id: `${id}.velocity`,
  label,
  value: fps * FT,
  unit: 'm/s',
  tolerance: 0.05 * fps * FT,
  of: 'orbit',
  confidence: 'documented',
  source,
});
/** How far the S-IVB was from the spacecraft at an instant, m. */
const range = (
  id: string,
  label: string,
  at: number,
  value: number,
  tolerance: number,
  confidence: PlanCheck['confidence'],
  source: string,
): PlanCheck => ({
  id: `${id}.range`,
  label,
  value,
  unit: 'm',
  tolerance,
  of: 'orbit',
  confidence,
  source,
  when: { at, reading: 'range' },
});

/**
 * SPS firings as reported. The command instants come from Table 2-I. Table 3-V is the integrated
 * spacecraft impulse and effective duration, which includes thrust after the cutoff command.
 * The mass at ignition is taken separately from Table A.5-I.
 */
const sps = [
  { name: 'Corrective combination', on: T(26, 24, 55.7), off: T(26, 25, 5.7), duration: 9.4, dv: 204.1, mass: 32_356 },
  { name: 'Coelliptic maneuver', on: T(28, 0, 56.5), off: T(28, 1, 4.3), duration: 7.8, dv: 173.8, mass: 31_595 },
  { name: 'Lower perigee', on: T(75, 48, 0.3), off: T(75, 48, 9.3), duration: 9.0, dv: 209.7, mass: 30_671 },
  { name: 'First minimum-impulse test', on: T(120, 43, 0.5), off: T(120, 43, 0.9), duration: 2.67, dv: 12.3, mass: 29_780 },
  { name: 'Adjust the ground track', on: T(165, 0, 0.5), off: T(165, 1, 7.6), duration: 67.0, dv: 1691.3, mass: 29_607 },
  { name: 'Second minimum-impulse test', on: T(210, 8, 0.5), off: T(210, 8, 1.0), duration: 2.82, dv: 14.2, mass: 24_975 },
  { name: 'Set up the deorbit', on: T(239, 6, 12.0), off: T(239, 6, 19.7), duration: 8.2, dv: 220.1, mass: 24_864 },
  { name: 'Deorbit', on: T(259, 39, 16.3), off: T(259, 39, 28.2), duration: 12.4, dv: 343.6, mass: 24_262 },
] as const;

/**
 * What the S-IVB let out in orbit while the spacecraft was still on it, where the flight evaluation has what it was
 * worth: the velocity the guidance platform's accelerometers gained in each event (the Saturn IB flight evaluation (MPR-SAT-FE-68-4), §12.4.2.2 and Fig. 12-15;
 * §9.6.2 and §9.6.3). Each is flown as a steady force over its interval, the measured gain times the stack's mass as the
 * run has it (30,256 kg: Table 6-I less what the run burns) over the time, along the stack's axis as its attitude
 * programme holds it (`Guidance.attached`):
 *   the 30 s propulsive vent of the oxygen tank, from 30.17 s after cutoff: 1.1 m/s;
 *   the oxygen dump through the engine, 5,668.95 to 6,388.95 s: 3.5 m/s in its first 131 s (the thrust at its most
 *     1,979 N at 5,702 s) and 6.6 m/s by its end;
 *   0.2 m/s more by 6,671 s, and the 13,789 N s the partly open valve gave after that, until the tank was empty at about
 *     10,500 s.
 * The hydrogen tank's vents were open for three spells before the dump (§4, Table 4-II); what they pushed is not in the
 * report and is not flown. The tracked states either side (the postflight trajectory, Table XIII) say the stack gained more than this
 * before the dump and after it: that difference is the run's residual (physics.md). The trajectory report is TH-AP-68-369.
 */
const STACK_IN_ORBIT = 30_256;
const J2_CUTOFF_BASE = 616.76;
const vented = (gain: number, from: number, to: number): number => (STACK_IN_ORBIT * gain) / (to - from);
const ventSteps: [from: number, to: number, newtons: number][] = [
  [J2_CUTOFF_BASE + 30.17, J2_CUTOFF_BASE + 60.17, vented(1.1, 0, 30)],
  [5668.95, 5668.95 + 131, vented(3.5, 0, 131)],
  [5668.95 + 131, 6388.95, vented(6.6 - 3.5, 5668.95 + 131, 6388.95)],
  [6388.95, 6671, vented(0.2, 6388.95, 6671)],
  [6671, 10_500, 13_789 / (10_500 - 6671)],
];
const sivbVenting = {
  id: 'sivb-venting',
  label: 'S-IVB oxygen tank vent and oxygen dump',
  body: 'sivb',
  thrust: {
    // (each step begins and ends in a twentieth of a second, and there is nothing between two that do not meet)
    points: ventSteps.flatMap(([from, to, f], i) => {
      const meets = ventSteps[i + 1]?.[0] === to;
      return [
        ...(ventSteps[i - 1]?.[1] === from ? [] : [[from - 0.05, 0] as [number, number]]),
        [from, f] as [number, number],
        [to - 0.05, f] as [number, number],
        ...(meets ? [] : [[to, 0] as [number, number]]),
      ];
    }),
    confidence: 'derived' as const,
    source: `${ASCENT}, §12.4.2.2 and Fig. 12-15 (the velocity the platform measured: 1.1 m/s in the oxygen tank's 30 s vent; 3.5 m/s after 131 s of the dump, 6.6 m/s at its end, 0.2 m/s more by 6,671 s) and §9.6.3 (13,789 N s after the valve part closed), each as a steady force on the stack's mass as the run has it`,
  },
};

/**
 * The rendezvous with the S-IVB as commands (sim/plan.ts `Pursuit`): what each of its burns was for, which guidance
 * carries out on where the two craft are (sim/pursuit.ts). The impulses and attitudes of Tables 3-IV and 3-V stay on
 * the burns as the record's, to hold the solved ones against. The two phasing burns before them are flown as recorded:
 * what they were aimed at is not in anything read.
 */
export const rendezvous = {
  /** Where the corrective combination was to leave the S-IVB from the spacecraft as the coelliptic manoeuvre lit. */
  coelliptic: {
    ahead: doc(80 * NMI, `${REPORT}, §3.2.1, approximate downtrack separation at the coelliptic maneuver`),
    above: doc(7.8 * NMI, `${REPORT}, §3.2.1, altitude difference at the coelliptic maneuver`),
  },
  /** When the terminal phase's transfer was to arrive at the stage. */
  intercept: doc(
    T(29, 43, 55) + (7 * 60 + 51),
    `${REPORT}, §3.2.1: "At 7 minutes 51 seconds before theoretical intercept, braking was started at a range of 1.2 n. mi.", the braking begun at 29:43:55: 29:51:46, 141 degrees of the stage's travel after the terminal phase initiation`,
  ),
  /** Where the spacecraft kept station, and until when. */
  station: {
    ahead: estimated(
      70 * FT,
      `${REPORT}, §2: final closure within 70 ft. Which side of the stage is not on the record: taken along the track, the stage ahead`,
    ),
    above: estimated(0, 'Relative elevation unknown'),
    until: doc(T(30, 20, 0), 'SP-4029, station-keeping interval'),
  },
};
const spsToward: (Pursuit | undefined)[] = [
  { reach: rendezvous.coelliptic, at: doc(T(28, 0, 56.5), `${REPORT}, Table 2-I, coelliptic maneuver ignition`) },
  { coelliptic: true },
];
const rcsToward: (Pursuit | undefined)[] = [
  undefined,
  undefined,
  { reach: { ahead: derived(0, 'the stage itself'), above: derived(0, 'the stage itself') }, at: rendezvous.intercept },
  { station: { ahead: rendezvous.station.ahead, above: rendezvous.station.above }, until: rendezvous.station.until },
];

const ignitionFixes = [
  [-29.56, 107.7, 990_253, 25_289.9, -0.13, 77.81],
  [-22.41, 106.76, 902_269, 25_446.5, -0.516, 66.94],
  [-16.95, 105.57, 944_663, 25_326.1, -0.144, 62.84],
  [31.38, -102.78, 610_161, 25_661.2, -0.383, 90.75],
  [28.56, -91.12, 720_388, 25_519.3, -0.482, 76.46],
  [24.4, -82.81, 995_944, 25_354.7, -1.169, 71.67],
  [15.05, -66.16, 545_503, 25_864.6, -0.207, 116.38],
  [13.83, -148.65, 1_143_579, 25_155.3, -0.988, 63.2],
] as const;

// Table 3-III gives both ends of the sustained burns. The resultant thrust axis is the
// difference between the measured outgoing velocity and the gravity-only continuation.
const cutoffFixes = [
  [-29.42, 107.5, 988_518, 25_354.0, -0.556, 77.45],
  [-22.21, 107.24, 901_050, 25_357.2, -0.196, 66.75],
  [-16.68, 106.08, 943_708, 25_273.9, -0.237, 63.12],
  null,
  [29.41, -86.24, 700_249, 25_714.9, -0.912, 82.7],
  null,
  [14.8, -65.68, 544_535, 25_866.4, -0.242, 116.31],
  [14.19, -147.98, 1_137_041, 24_966.5, -1.643, 63.38],
] as const;
const fixFrame = earthFrame(2451545, false);

function spsAxis(index: number): AttitudeDef {
  const id = `sps-aim-${index + 1}`;
  const burn = sps[index]!;
  if (index === 0) return localAim(id, burn.name, [61.5, 1.5, -196.5], `${REPORT}, Table 3-IV, effective local-horizontal X/Y/Z`);
  if (index === 1) return localAim(id, burn.name, [-91, -1.2, 149.8], `${REPORT}, Table 3-IV, effective local-horizontal X/Y/Z`);
  if (index === 3) return localAim(id, burn.name, [1, 0, 0], `${REPORT}, §3.2.2, posigrade and in plane`);
  if (index === 5) {
    return {
      id,
      label: burn.name,
      source: `${REPORT}, §3.2.2, the sixth burn was normal to the orbital plane; the increased heading in Table 3-III implies toward orbit south`,
      hold: { aim: 'normal', sense: -1, confidence: 'derived' },
    };
  }
  if (index === 6)
    return localAim(
      id,
      burn.name,
      [0, 100, Math.sqrt(burn.dv ** 2 - 100 ** 2)],
      `${REPORT}, §3.2.2 and Table 3-V, 100 ft/s toward orbit north; remaining impulse radially outward to turn the apsides west while keeping the orbit period`,
    );
  const source = `${REPORT}, Table 3-III, reconstructed ignition and cutoff states; velocity change less gravity-only continuation`;
  const start = trackedState(fix(source, [burn.on, ...ignitionFixes[index]!]), fixFrame);
  const end = trackedState(fix(source, [burn.off, ...cutoffFixes[index]!]), fixFrame);
  const dv = sub(end.v, step(start, burn.on, burn.off - burn.on).v);
  const up = fixFrame.up(start.r, burn.on);
  const left = unit(cross(up, start.v));
  return localAim(id, burn.name, [dot(dv, cross(left, up)), dot(dv, left), dot(dv, up)], source);
}

function localAim(id: string, label: string, [forward, left, up]: readonly [number, number, number], source: string): AttitudeDef {
  return {
    id,
    label,
    source,
    hold: {
      aim: 'velocity',
      sense: 1,
      yaw: derived((Math.atan2(left, forward) * 180) / Math.PI, source),
      below: derived((-Math.atan2(up, Math.hypot(forward, left)) * 180) / Math.PI, source),
      confidence: 'derived',
    },
  };
}

const spsAttitudes = sps.map((_, i) => spsAxis(i));
const spsEvents = sps.flatMap((burn, i) => {
  const id = `sps-${i + 1}`;
  return [
    timed(id, `SPS ${i + 1} · ${burn.name}`, burn.on, [
      { attitude: spsAttitudes[i]!.id },
      {
        ignite: 'sps',
        flown: doc(burn.dv * FT, `${REPORT}, Table 3-V, SPS impulse excluding the RCS ullage translation`),
        firingTime: doc(
          burn.duration,
          `${REPORT}, ${i === 3 || i === 5 ? 'Table 5.18-IV, thrusting interval including the transient' : 'Table 3-V, effective duration'}`,
        ),
        massAtIgnition: doc(burn.mass * LB, WEIGHTS),
        ...(spsToward[i] ? { toward: spsToward[i] } : {}),
      },
    ]),
    timed(`${id}-cutoff`, `SPS ${i + 1} cutoff`, burn.off, [{ cut: 'sps' }]),
  ];
});

const rcs = [
  { id: 'rcs-phasing-1', name: 'First phasing maneuver', on: T(3, 20, 9.9), length: 16.8, dv: 5.7, axis: [-1, 0, 0] },
  { id: 'rcs-phasing-2', name: 'Second phasing maneuver', on: T(15, 52, 0.9), length: 17.6, dv: 7.02, axis: [-1, 0, 0] },
  { id: 'rcs-terminal', name: 'Terminal phase initiation', on: T(29, 16, 33), length: 43.4, dv: 17.4, axis: [15.5, -2.9, 7.3] },
  { id: 'rcs-braking', name: 'Rendezvous braking', on: T(29, 43, 55), length: 708, dv: 18.2, axis: [13, -4.6, -11.8] },
] as const;

const rcsAttitudes = rcs.map((burn) =>
  localAim(`${burn.id}-aim`, burn.name, burn.axis, `${REPORT}, Table 3-IV, effective local-horizontal components`),
);
/**
 * The twenty-five minutes beside the stage after the separation: the spacecraft pulled ahead, turned round and kept
 * station on it until the first phasing burn. Its thrusters' pulses are on no record read, so the record's impulse is
 * none; guidance brakes it to the place and holds it there (`Pursuit.station`), and without the stage to hold on it
 * does nothing.
 */
const FORMATION = SEPARATION + 35;
const formationAim = localAim(
  'rcs-formation-aim',
  'Station-keeping with the S-IVB',
  [1, 0, 0],
  'Along the motion: the thrust is commanded on the stage',
);
const formationEvents: EventDef[] = [
  {
    ...timed('rcs-formation', 'Station-keeping with the S-IVB', FORMATION, [
      { attitude: formationAim.id },
      {
        ignite: 'sm-rcs',
        flown: estimated(0, 'No impulse on the record: the thrusters’ pulses beside the stage were not recorded'),
        toward: {
          station: {
            ahead: estimated(
              -100 * FT,
              'NASA, Apollo 7/S-IVB Rendezvous in Space, photo caption: photographed at approximately 100 ft during transposition. The stage is taken to be directly behind the spacecraft',
            ),
            above: estimated(0, 'Photo range only'),
          },
          until: doc(T(3, 20, 9.9), `${REPORT}, Table 2-I, first phasing maneuver`),
        },
      },
    ]),
    at: estimated(
      FORMATION,
      'Time to pull clear for transposition, estimated from the separation’s motion; the instant is not on the record',
    ),
  },
  {
    ...timed('rcs-formation-cutoff', 'In formation with the S-IVB', FORMATION + 300, [{ cut: 'sm-rcs' }]),
    at: estimated(
      FORMATION + 300,
      'Five minutes to turn round and come to rest by the stage: an estimate, the transposition’s own times not being on the record',
    ),
  },
];

/**
 * The separation from the stage once the station was left: "After a short period of station keeping, a separation
 * maneuver of 2 ft/sec was performed with the reaction control system and the resultant orbit was 161.5 by 122.0 n. mi."
 * (the report, §8, p. 8-3; before it, 161.0 by 122.2). Its instant and its direction are not given: it is put at the
 * end of the station-keeping, and along the motion, which is what raises the apogee half a mile and leaves the stage
 * drawing ahead, as the sextant's later ranges have it.
 */
const SEPARATED = T(30, 20, 0);
const separationAim = localAim(
  'rcs-separation-aim',
  'Separation from the S-IVB',
  [1, 0, 0],
  'Along the motion: derived from the orbit it left (161.0 by 122.2 to 161.5 by 122.0 n. mi.) and the stage drawing ahead afterwards',
);
const separationEvents: EventDef[] = [
  {
    ...timed('rcs-separation', 'Separation from the S-IVB', SEPARATED, [
      { attitude: separationAim.id },
      { ignite: 'sm-rcs', flown: doc(2 * FT, `${REPORT}, §8, p. 8-3: a separation maneuver of 2 ft/sec`) },
    ]),
    at: estimated(
      SEPARATED,
      `${REPORT}, §8: "after a short period of station keeping"; put at the end of the station-keeping interval (SP-4029)`,
    ),
  },
  {
    ...timed('rcs-separation-cutoff', 'Separation maneuver complete', SEPARATED + 10, [{ cut: 'sm-rcs' }]),
    at: estimated(
      SEPARATED + 10,
      'Ten seconds: 2 ft/s on two 100 lbf thrusters at the spacecraft’s mass; the firing’s length is not on the record',
    ),
  },
];

const rcsEvents = rcs.flatMap((burn, i) => [
  timed(burn.id, burn.name, burn.on, [
    { attitude: rcsAttitudes[i]!.id },
    {
      ignite: 'sm-rcs',
      flown: doc(burn.dv * FT, `${REPORT}, Table 3-IV, resultant translation; braking's intermittent pulses are averaged`),
      ...(rcsToward[i] ? { toward: rcsToward[i] } : {}),
    },
  ]),
  timed(
    `${burn.id}-cutoff`,
    `${burn.name} complete`,
    burn.on + burn.length,
    [{ cut: 'sm-rcs' }],
    `${REPORT}, §3.2.1 and Tables 2-I and 3-IV`,
  ),
]);

const h1 = (id: string, label: string): EngineDef => ({
  id,
  label,
  body: 'sib',
  count: 4,
  tanks: ['sib-propellant'],
  kind: 'liquid',
  thrust: {
    seaLevel: assumed(200_000 * LBF, 'NASA SP-4206, ch. 4, rated sea-level thrust of each H-1 on AS-201 through AS-205'),
    vacuum: derived(
      (2810.91 * 9.80665 * 295) / 8,
      `${ASCENT}, Table 8-II average stage flow and Fig. 8-2 high-altitude specific impulse, read as about 295 s`,
    ),
  },
  isp: {
    seaLevel: derived((200_000 * LBF * 8) / (9.80665 * 2810.91), `${ASCENT}, Table 8-II stage flow at the H-1's rated sea-level thrust`),
    vacuum: estimated(295, `${ASCENT}, Figure 8-2, end of the eight-engine firing, read as about 295 s`),
  },
  starts: { count: 1, ground: true, confidence: 'documented', source: `${ASCENT}, §8` },
  burns: 'kerosene-lox',
});

const bank = (id: string, angle: number, inferred = false): AttitudeDef => ({
  id,
  label: 'Entry bank',
  source: inferred ? `${REPORT}, Fig. 5.16-28, approximate flight bank after computer takeover` : `${ENTRY}, §5.2`,
  hold: { bank: inferred ? estimated(angle, `${REPORT}, Fig. 5.16-28, approximate telemetered bank`) : doc(angle, `${ENTRY}, §5.2`) },
});

const ascentCheck = (id: string, label: string, value: number, unit: string, tolerance: number, source: string): PlanCheck => ({
  id,
  label,
  value,
  unit,
  tolerance,
  of: 'ascent',
  confidence: 'documented',
  source,
});

// Representative readings of the actual roll trace (Fig. 5.16-28), including its reversals.
const entryProgramme = [
  [T(259, 56, 6), 0],
  [T(259, 56, 20), -15],
  [T(259, 56, 31), -55],
  [T(259, 57, 25), -55],
  [T(259, 57, 43), -46],
  [T(259, 58, 0), -70],
  [T(259, 58, 15), 47],
  [T(259, 59, 0), 52],
  [T(259, 59, 59), 56],
  [T(260, 0, 12), -40],
  [T(260, 0, 55), -83],
  [T(260, 1, 13), 59],
  [T(260, 1, 45), 62],
  [T(260, 1, 52), -74],
  [T(260, 2, 14), -100],
  [T(260, 2, 18), -240],
  [T(260, 2, 26), -278],
  [T(260, 3, 10), -297],
] as const;
const entryAttitudes = entryProgramme.map(([, angle], i) => bank(`entry-bank-${i}`, angle, true));
const entryBanks = entryProgramme.map(([at], i) =>
  timed(
    `entry-bank-${i}`,
    i === 3 ? 'Digital autopilot selected' : 'Entry bank',
    at,
    [{ attitude: entryAttitudes[i]!.id }],
    `${REPORT}, Fig. 5.16-28, approximate digitization of actual roll`,
  ),
);
const service = sps[7];
const shield = DROGUE - 1.6;
const capsuleArea = Math.PI * (77 * IN) ** 2;
// saturn_ib.py: the SM aft bulkhead (XA838) meets the top of the adapter.
export const CSM_MATING_HEIGHT = (80.2 * 12 + 58.4 * 12 + 36 + 28 * 12) * IN;
const stackCm = CSM_MATING_HEIGHT + 162 * IN;
const shieldMass = derived((12_277 - 11_936) * LB, `${WEIGHTS}, Mach 10 less drogue deployment; includes char and CM consumables`);
const serviceMass = derived((23_453 - 12_364) * LB, `${WEIGHTS}, CSM before separation less the CM after separation`);
const boosterMass = derived(42_574.2 + 2_995.5, `${ASCENT}, Table 6-I, S-IB and interstage masses at separation`);
const towerMass = doc(4_025.2, `${ASCENT}, Table 6-I, launch escape system`);

function released(
  on: string,
  name: string,
  mass: NonNullable<ShedBody['mass']>,
  source: string,
  [aft, forward, radius, centre]: [number, number, number, number],
  [foreDrag, aftDrag, sideDrag]: [number, number, number],
): ShedBody {
  const from = derived(aft, source);
  const to = derived(forward, source);
  return {
    on,
    name,
    mass,
    from,
    to,
    radius: derived(radius, source),
    centre: estimated(centre, `${source}; approximate center after release`),
    gyration: {
      roll: estimated(radius * 0.78, `${source}; hollow shell approximation`),
      across: estimated(Math.hypot((forward - aft) / Math.sqrt(12), radius / Math.sqrt(2)), `${source}; hollow shell approximation`),
    },
    ahead: estimated(foreDrag, `${source}; approximate fore drag area`),
    astern: estimated(aftDrag, `${source}; approximate aft drag area`),
    side: { from, to, dragArea: estimated(sideDrag, `${source}; approximate broadside drag area`) },
  };
}

const sheds: ShedBody[] = [
  released(
    'sib-separation',
    'S-IB and interstage',
    boosterMass,
    'Saturn IB stage envelope in saturn_ib.py and MPR-SAT-FE-68-4, Figure A-1',
    [0, 1187 * IN, 130 * IN, 8.5],
    [35, 38, 180],
  ),
  {
    ...released(
      'les-jettison',
      'Escape tower and boost cover',
      towerMass,
      'Launch escape system envelope in launch_escape.py and Apollo 7 press kit Figure 25a',
      [stackCm, 224 * FT, 78 * IN, 64],
      [12, 12, 20],
    ),
    forward: true,
    motors: [
      {
        name: 'Tower jettison motor',
        thrust: doc(33_000 * LBF, 'Apollo 7 press kit, p. 25, tower jettison motor'),
        burn: assumed(1.1, 'Apollo Spacecraft News Reference, launch escape subsystem, burn slightly longer than one second'),
      },
    ],
  },
  {
    ...released(
      'cm-sm-separation',
      'Service module',
      serviceMass,
      'Apollo CSM model stations from MIT R-547 and apollo_csm.py: XA706 to XA993 with forward fairing',
      [stackCm - 294 * IN, stackCm + 19 * IN, 78 * IN, stackCm - 1.8],
      [11, 12, 23],
    ),
    push: derived(27.5 * FT, `${REPORT}, §3.4, reconstructed 25–30 ft/s posigrade; midpoint modeled as axial clearance`),
  },
  {
    ...released(
      'forward-shield-jettison',
      'Forward heat shield',
      shieldMass,
      'Block II forward heat-shield stations 81.13–112.25 inches in command_module.py',
      [stackCm + 81.13 * IN, stackCm + 112.25 * IN, 36 * IN, stackCm + 94 * IN],
      [2.6, 3.1, 1.4],
    ),
    forward: true,
  },
];

/** The outside of the command and service modules as a convex body, m²: the command module's cone, the service module's barrel with its fairing, a frustum to the engine's exit, and the exit's disc. */
const CSM_OUTSIDE = (() => {
  const [radius, exit] = [77 * IN, (94.5 / 2) * IN];
  const [barrel, extension] = [(155 + 26) * IN, 112 * IN];
  const cone = 406.25 * IN - barrel - extension;
  return (
    Math.PI * radius * Math.hypot(cone, radius) +
    2 * Math.PI * radius * barrel +
    Math.PI * (radius + exit) * Math.hypot(extension, radius - exit) +
    Math.PI * exit * exit
  );
})();

export const apollo7Plan: FlightPlan = {
  kind: 'orbital',
  craft: [
    {
      id: 'saturn-ib',
      label: 'Saturn IB AS-205 with CSM-101',
      mass: doc(586_392.8, `${ASCENT}, Table 6-I, total stack at first motion`),
      sheds,
      vents: [sivbVenting],
      bodies: [
        {
          id: 'sib',
          label: 'S-IB, first stage and interstage',
          count: 1,
          mass: derived(450_830.9 + 2_995.5 - 6_277.3, `${ASCENT}, Table 6-I, stage and interstage less thrust buildup propellant`),
          nodes: ['SaturnFirstStage'],
        },
        {
          id: 'sivb',
          label: 'S-IVB, instrument unit and adapter',
          count: 1,
          mass: derived(
            586_392.8 - (450_830.9 + 2_995.5 - 6_277.3) - 4_025.2 - 16_528.0,
            `${ASCENT}, Table 6-I, remaining stack mass with the first stage, LES and spacecraft removed`,
          ),
          nodes: ['SaturnSecondStage'],
        },
        {
          id: 'les',
          label: 'Launch escape tower with boost cover',
          count: 1,
          mass: towerMass,
          nodes: ['LaunchEscape'],
        },
        {
          id: 'sm',
          label: 'Service module',
          count: 1,
          mass: derived(
            16_528.0 - 12_364 * LB,
            `${ASCENT}, Table 6-I initial CSM less the CM after separation (${WEIGHTS}); approximates CM consumables usage`,
          ),
          nodes: ['ServiceModule'],
        },
        {
          id: 'forward-shield',
          label: 'Forward heat shield',
          count: 1,
          mass: shieldMass,
          nodes: ['ForwardShield'],
        },
        {
          id: 'cm',
          label: 'Command module 101',
          count: 1,
          mass: doc(11_936 * LB, `${WEIGHTS}, at drogue deployment; held through descent`),
          nodes: ['CommandModule'],
          aero: {
            area: derived(capsuleArea, 'Apollo 7 press kit p.25, area of the 154 in heat shield disc'),
            drag: {
              points: TRIM_DRAG.map(([mach, cd]) => [mach, cd] as [number, number]),
              confidence: 'assumed',
              source: `${TRIM}: trim drag of the same Block II shape, with different mass distribution; low endpoint held below Mach 0.4`,
            },
            lift: {
              points: [
                [0, 0.37],
                [4, 0.37],
                [10, 0.35],
                [20, 0.33],
                [25, 0.31],
              ],
              confidence: 'estimated',
              source: `${REPORT}, Fig. 5.2-1, flight-derived L/D digitized approximately through Mach 4; held below Mach 4`,
            },
            trim: derived(20, `${REPORT}, Fig. 5.2-1, trim about 160 deg angle of attack (20 deg from heat shield forward)`),
            dragArea: derived(0.853 * capsuleArea, `${TRIM}, Mach 0.4 drag coefficient on the capsule reference area`),
          },
        },
      ],
      joints: [
        {
          id: 'sib-separation',
          label: 'S-IB/S-IVB separation',
          gone: ['sib'],
          at: doc(145.6, EVENTS),
          leaves: boosterMass,
          push: estimated(1.5, 'combined first-stage retrorocket and second-stage ullage separation model'),
          // (the S-IVB's J-2 stands in the closed interstage over the S-IB, which was not hot-staged)
          closed: { engines: ['sivb-j2'] },
        },
        {
          id: 'les-jettison',
          label: 'Launch escape tower jettison',
          gone: ['les'],
          at: doc(166.5, EVENTS),
        },
        {
          id: 'spacecraft-separation',
          label: 'CSM/S-IVB separation',
          gone: ['sivb'],
          at: doc(SEPARATION, `${LV_TRAJ}, Table VI`),
          push: estimated(0.6, 'initial separation represented by a modest relative spring clearance; later RCS translation is separate'),
        },
        {
          id: 'cm-sm-separation',
          label: 'Command/service module separation',
          gone: ['sm'],
          at: doc(MODULES, EVENTS),
          after: doc(12_356 * LB, `${WEIGHTS}, CM at entry interface`),
          leaves: serviceMass,
        },
        {
          id: 'forward-shield-jettison',
          label: 'Forward heat shield jettison',
          gone: ['forward-shield'],
          at: derived(shield, `${REPORT}, §5.5, 1.6 s before drogue mortar firing`),
          push: estimated(4, 'forward cover clearance speed; not reconstructed'),
        },
      ],
      engines: [
        h1('h1-inboard', 'Four inboard H-1 engines'),
        h1('h1-outboard', 'Four outboard H-1 engines'),
        escapeEngine,
        {
          id: 'sivb-j2',
          body: 'sivb',
          label: 'Rocketdyne J-2',
          count: 1,
          tanks: ['sivb-propellant'],
          kind: 'liquid',
          thrust: { vacuum: doc(1_009_902, `${ASCENT}, Table 9-II, engine analysis, actual mean at high mixture ratio`) },
          isp: { vacuum: doc(424.2, `${ASCENT}, Table 9-II, engine analysis, high mixture ratio`) },
          throttle: {
            curve: {
              points: [
                [0, 1],
                [455.77, 1],
                [455.78, 769_231 / 1_009_902],
              ],
              confidence: 'derived',
              source: `${ASCENT}, §9.1 and Table 9-II, low mixture ratio command at 455.77 s; thrust and mass flow approximated with one thrust ratio`,
            },
          },
          starts: { count: 1, ground: false, confidence: 'documented', source: `${ASCENT}, §9, AS-205 used one ignition` },
          burns: 'hydrogen-lox',
        },
        {
          id: 'sps',
          body: 'sm',
          label: 'Service Propulsion System',
          count: 1,
          tanks: ['sps-propellant'],
          kind: 'liquid',
          thrust: { vacuum: doc(21_180 * LBF, `${REPORT}, Table 5.18-I, calculated steady state during burn 5`) },
          isp: { vacuum: doc(314.0, `${REPORT}, Table 5.18-I, calculated steady state during burn 5`) },
          starts: {
            count: 8,
            ground: false,
            confidence: 'documented',
            source: `${REPORT}, Table 3-V, eight starts demonstrated on CSM-101`,
          },
          flown: doc(service.dv * FT, `${REPORT}, Table 3-V, SPS-only impulse on the eighth burn`),
          deltaV: doc(service.dv * FT, `${REPORT}, Table 3-V, SPS-only impulse on the eighth burn`),
          burns: 'hydrazine-n2o4',
        },
        {
          id: 'sm-rcs',
          body: 'sm',
          label: 'Service module reaction control',
          count: 1,
          tanks: [],
          kind: 'liquid',
          thrust: { vacuum: assumed(2 * 100 * LBF, 'Apollo CSM News Reference, two 100-lbf SM thrusters on an axial translation axis') },
          starts: {
            count: 1000,
            ground: false,
            confidence: 'estimated',
            source: 'Pulse train represented as its average force; no relevant start limit in the flight record',
          },
          burns: 'hydrazine-n2o4',
        },
      ],
      tanks: [
        {
          id: 'sps-propellant',
          body: 'sm',
          label: 'SPS propellant',
          holds: 'propellant',
          load: doc(9737.3 * LB, `${REPORT}, §5.18.2, calculated actual load: 6026.7 lbm oxidizer and 3710.6 lbm fuel`),
        },
        {
          id: 'sib-propellant',
          body: 'sib',
          label: 'S-IB LOX/RP-1',
          holds: 'propellant',
          load: derived(450_830.9 - 6_277.3 - 42_574.2, `${ASCENT}, Table 6-I, stage at first motion less its residual mass at separation`),
        },
        {
          id: 'sivb-propellant',
          body: 'sivb',
          label: 'S-IVB LOX/LH₂',
          holds: 'propellant',
          load: doc(233_269 * LB, 'Saturn S-IVB-205 Stage Flight Evaluation Report, §14.2.1, best estimate at liftoff: 233,269 lbm'),
          usable: derived(
            (233_269 - 518 - 760) * LB,
            'Saturn S-IVB-205 Stage Flight Evaluation Report, §14.2.2, loaded mass less 518 lbm LOX and 760 lbm LH₂ unusable',
          ),
        },
      ],
      thrusters: [
        // What turns the stack going up: without it the live vehicle has no steering at all, and a flight taken over rose
        // straight up and was left behind by the turning Earth (until November 2026).
        {
          id: 'saturn-steering',
          label: 'Steering',
          body: 'sivb',
          does: ['rotation'],
          mode: 'automatic',
          authority: estimated(
            8,
            'deg/s² at full throw, about each axis: NOT FOUND. The S-IB’s four outboard H-1 engines gimballed, the S-IVB’s J-2 gimballed with its auxiliary propulsion modules for roll: taken as the Atlas’s 8 (Friendship 7’s orbital.ts), as Gemini-Titan 3’s is',
          ),
        },
        {
          id: 'sm-manual-rate',
          label: 'SM RCS proportional rate',
          body: 'sm',
          does: ['rotation'],
          mode: 'manual',
          rate: assumed(
            0.7,
            'Apollo Operations Handbook, Block II vol. 1 §2.3, stabilization and control, proportional rate table: LOW setting, all three axes',
          ),
        },
      ],
      chutes: [
        {
          id: 'els-drogues',
          body: 'cm',
          label: 'Twin drogues',
          dragArea: estimated(
            0.55 * 2 * Math.PI * (8.25 * FT) ** 2,
            'Two 16.5 ft drogues, Apollo Earth Landing System; 0.55 effective coefficient for the ribbon canopies',
          ),
          fills: doc(10, `${REPORT}, §5.5, first disreefing after 10 s`),
        },
        {
          id: 'els-mains',
          body: 'cm',
          label: 'Three main parachutes',
          instead: ['els-drogues'],
          dragArea: estimated(
            0.75 * 3 * Math.PI * (41.75 * FT) ** 2,
            'Three 83.5 ft ringsails, Apollo Earth Landing System; 0.75 effective coefficient for projected drag',
          ),
          fills: assumed(16, 'Apollo Earth Landing System, two reefed stages; represented by one progressive fill'),
        },
      ],
      limits: [],
      heating: {
        noseRadius: assumed(
          184.8 * IN,
          'Block II spherical aft heat shield profile as modeled from North American structural training drawings, shared with CM-101',
        ),
        starts: estimated(290, 'Initial shield temperature is unused for shock-gas proxy with no heated surfaces'),
        surfaces: [],
      },
      drag: [
        {
          until: doc(J2_OFF, `${ASCENT}, §9.1`),
          area: derived(Math.PI * (6.6 / 2) ** 2, `${ASCENT}, Fig. 6-2, 6.60 m reference vehicle diameter`),
          curve: {
            points: [
              [0, 0.25],
              [0.8, 0.3],
              [1.1, 0.55],
              [1.4, 0.45],
              [2, 0.36],
              [6, 0.23],
            ],
            confidence: 'estimated',
            source: 'Slender-stack axial drag approximation; flight configuration drag curve not digitized',
          },
        },
      ],
      rarefied: {
        drag: assumed(
          2.2,
          'King-Hele, The Prediction of Satellite Lifetimes, §9.1, customary effective drag coefficient for perigees of 150–400 km',
        ),
        area: derived(
          CSM_OUTSIDE / 4,
          'A quarter of the outside of the command and service modules, which is the area a convex body presents on the average over every way it can lie (Cauchy). The outside is the modules’ own sizes (flight.ts: 406.25 in long over all, 154 in across, the barrel and fairing 181 in, the engine’s extension 112 in to a 94.5 in exit) taken as a cone, a cylinder and a frustum to the engine’s exit, closed there: 111.6 m². Its attitude is assumed random: the ship drifted for most of eleven days and no timeline of how it lay is in anything read. Where it was held (the firings, the rendezvous) is not told apart',
        ),
        length: doc(154 * 0.0254, 'Apollo 7 press kit p.25, CM diameter'),
      },
      lands: { on: 'sea', ship: 'the command module' },
    },
  ],
  attitude: [
    {
      id: 'saturn-steering',
      label: 'Saturn IB ascent',
      source: `${ASCENT}, §1, §11, and ${REPORT}, Table 3-II`,
      hold: {
        law: {
          azimuth: doc(72, `${ASCENT}, §1.0, flight azimuth east of north after roll`),
          vertical: doc(10.31, `${ASCENT}, Fig. 12-1, pitch starts at 10.31 s`),
          kick: derived(134.26 - 10.31, `${ASCENT}, Fig. 12-1, end less start of first-stage pitch program`),
          roll: {
            points: [
              [0, -28],
              [11, -28],
              [40, 0],
            ],
            confidence: 'estimated',
            source: `${ASCENT}, Fig. 12-1, actual attitude approximately a 28° roll from pad alignment`,
          },
          attached: {
            align: [doc(636, `${ASCENT}, Table 12-I, alignment starts`), doc(678, `${ASCENT}, Table 12-I, alignment complete`)],
            pitch: {
              points: [
                [0, 0],
                [9780 - 4.972, 0],
                [9860 - 4.972, -20],
              ],
              confidence: 'estimated',
              source: `${ASCENT}, §12.2, GRR+9780 pitch 20° down from local horizontal; simplified 80-s ramp`,
            },
            freeze: derived(10275 - 4.972, `${ASCENT}, §12.2, GRR+10275; ${LV_TRAJ}, §1, GRR 4.972 s before range zero`),
          },
          programme: {
            points: [
              [0, 0],
              [10.31, 0],
              [20, 1.3],
              [40, 8.6],
              [60, 20.0],
              [80, 32.0],
              [100, 43.4],
              [120, 52.2],
              [134.26, 59.3],
            ],
            confidence: 'estimated',
            source: `${ASCENT}, Fig. 12-1, approximate digitization of the first stage’s space-fixed pitch programme, flown open as it was and held from its end to the J-2’s start; thrust assumed along the pitch axis and yaw departures omitted. The S-IVB’s attitude (Fig. 12-4) is not flown: it was the iterative guidance’s answer to the flight as it went, and the law’s closed loop takes its place`,
          },
          turn: doc(146.97, `${ASCENT}, §9 and §11, S-IVB power phase represented by tangent steering`),
          target: {
            at: 'sivb-cutoff',
            altitude: doc(
              748_374 * FT,
              `${REPORT}, Table 3-II, Fischer ellipsoid height at cutoff (${LV_TRAJ}, Table XIII, p. 74, has the same place 6,600.454 km from the Earth's centre)`,
            ),
            over: 'ellipsoid',
            climb: doc(0, `${REPORT}, Table 3-II, space-fixed flight path at cutoff`),
            inclination: doc(31.58, `${REPORT}, Table 2-II`),
          },
        },
      },
    },
    formationAim,
    separationAim,
    ...rcsAttitudes,
    ...spsAttitudes,
    bank('entry-lift-up', 0),
    ...entryAttitudes,
  ],
  // The spent stage, with the instrument unit and the adapter on it, flown on from the separation as a craft of its own.
  target: {
    joint: 'spacecraft-separation',
    label: 'S-IVB',
    mass: derived(
      586_392.8 - (450_830.9 + 2_995.5 - 6_277.3) - 4_025.2 - 16_528.0 - 233_269 * LB,
      `${ASCENT}, Table 6-I, the stage, instrument unit and adapter at first motion, less the whole propellant load (S-IVB-205 Stage Flight Evaluation Report, §14.2.1): what little was left aboard after the dump and the venting is not taken off`,
    ),
    dragArea: derived(
      2.2 * 117,
      'King-Hele’s customary 2.2 (The Prediction of Satellite Lifetimes, §9.1) on 117 m²: a quarter of the outside of the stage, instrument unit and adapter taken as a cylinder 260 in across and 44 ft long and a cone 28 ft long down to 154 in (press kit, pp. 26, 32 and 33), which is the area a convex body presents on the average over every way it can lie (Cauchy). Its attitude is assumed random: the crew found it tumbling at the rendezvous, and how it lay after its control was let go is not in anything read. The adapter’s open panels are not counted',
    ),
  },
  events: [
    timed('liftoff', 'Liftoff', 0, [{ ignite: 'h1-inboard' }, { ignite: 'h1-outboard' }]),
    timed('sib-inboard-cutoff', 'Inboard H-1 engines cut off', 140.64, [{ cut: 'h1-inboard' }], `${ASCENT}, §8.1`),
    timed('sib-outboard-cutoff', 'Outboard H-1 engines cut off', 144.32, [{ cut: 'h1-outboard' }], `${ASCENT}, §8.1`),
    timed('sib-separation', 'S-IB separates', 145.6, [{ separate: 'sib-separation' }]),
    timed('sivb-ignition', 'J-2 ignition', 146.97, [{ ignite: 'sivb-j2' }], `${ASCENT}, Fig. 9-2, engine start command`),
    timed('les-jettison', 'Escape tower and boost cover jettison', 166.5, [{ separate: 'les-jettison' }]),
    // (the guidance's own cutoff: flown where the orbit reached has the record's period; the recorded instant is held as a figure)
    timed('sivb-cutoff', 'J-2 cutoff', J2_OFF, [{ cut: 'sivb-j2' }], `${ASCENT}, §9.1, guidance cutoff command`, [{ orbit: 'published' }]),
    timed('spacecraft-separation', 'CSM separates from S-IVB', SEPARATION, [{ separate: 'spacecraft-separation' }], `${LV_TRAJ}, Table VI`),
    ...formationEvents,
    ...separationEvents,
    ...rcsEvents,
    ...spsEvents,
    timed('cm-sm-separation', 'Command module separates from service module', MODULES, [
      { separate: 'cm-sm-separation' },
      { attitude: 'entry-lift-up' },
    ]),
    ...entryBanks,
    timed('forward-shield-jettison', 'Forward heat shield jettison', shield, [{ separate: 'forward-shield-jettison' }], `${REPORT}, §5.5`, [
      { after: 'cm-sm-separation' },
      { height: 23_500 * FT, going: 'down' },
    ]),
    timed('drogue-deployment', 'Twin drogues deploy', DROGUE, [{ deploy: 'els-drogues' }], `${REPORT}, Table 2-I and §5.5`, [
      { after: 'forward-shield-jettison', wait: 1.6 },
    ]),
    timed('main-deployment', 'Three mains deploy', MAIN, [{ deploy: 'els-mains' }], `${REPORT}, Table 2-I and §5.5`, [
      { height: 10_300 * FT, going: 'down' },
    ]),
  ].sort((a, b) => a.at!.value - b.at!.value),
  checks: [
    ascentCheck('cutoffSpeed', 'S-IVB cutoff inertial speed', 25_526 * FT, 'm/s', 180, `${REPORT}, Table 3-II`),
    ascentCheck('inclination', 'Insertion inclination', 31.58, '°', 1, `${REPORT}, Table 2-II`),
    {
      id: 'entryG',
      label: 'Peak entry load',
      value: 3.33,
      unit: 'g',
      tolerance: 0.4,
      of: 'orbit',
      confidence: 'documented',
      source: `${REPORT}, Table 3-VI, trajectory deceleration`,
    },
    { id: 'cm.at', label: 'Splashdown', value: SPLASH, unit: 's', tolerance: 120, of: 'descent', confidence: 'documented', source: EVENTS },
    // The rendezvous, flown by guidance on the stage as its own craft: the record's impulses and ranges are what it is held to.
    impulse('sps-1', 'Corrective combination, impulse', 204.1, `${REPORT}, Table 3-V`),
    impulse('sps-2', 'Coelliptic maneuver, impulse', 173.8, `${REPORT}, Table 3-V`),
    impulse('rcs-terminal', 'Terminal phase initiation, impulse', 17.4, `${REPORT}, Table 3-IV`),
    impulse('rcs-braking', 'Braking, impulse', 18.2, `${REPORT}, Table 3-IV, resultant of the braking’s pulses`),
    range(
      'formation',
      'S-IVB at 3:16',
      T(3, 16, 0),
      100 * FT,
      10,
      'estimated',
      'NASA, Apollo 7/S-IVB Rendezvous in Space, photo caption: approximately 100 ft',
    ),
    range(
      'lead',
      'S-IVB as the corrective combination lit',
      T(26, 24, 55),
      84 * NMI,
      10 * NMI,
      'documented',
      `${REPORT}, §3.2.1: the second phasing maneuver "caused the spacecraft to lead by about 84 n. mi. instead of by the intended 75 n. mi." by 26:25:00`,
    ),
    range('braking', 'S-IVB as braking began', T(29, 43, 55), 1.2 * NMI, 0.2 * NMI, 'documented', `${REPORT}, §3.2.1`),
    range('station', 'S-IVB while keeping station', T(30, 0, 0), 70 * FT, 5, 'documented', `${REPORT}, §2: final closure within 70 ft`),
    range(
      'sextant-1',
      'S-IVB at 45:30',
      T(45, 30, 0),
      160 * NMI,
      10 * NMI,
      'documented',
      'SP-4029, Apollo 7 timeline, end of the sextant tracking interval',
    ),
    range(
      'sextant-2',
      'S-IVB at 53:20',
      T(53, 20, 0),
      320 * NMI,
      15 * NMI,
      'documented',
      'SP-4029, Apollo 7 timeline, end of the sextant tracking interval',
    ),
  ],
  record: {
    aborts,
    manoeuvreTurn: estimated(30, 'Display slew into the published coast burn directions; exact attitude timeline unavailable'),
    orbit: {
      over: { is: 'oblate', confidence: 'documented', source: `${REPORT}, Table 3-I, Fischer ellipsoid` },
      perigee: doc(123.3 * NMI, `${REPORT}, Table 2-II`),
      apogee: doc(153.7 * NMI, `${REPORT}, Table 2-II`),
      inclination: doc(31.58, `${REPORT}, Table 2-II`),
      period: derived(
        89.525 * 60,
        `${LV_TRAJ}, Table XIII, p. 74, the tracked state at insertion read as a mean orbit, perigee to perigee: 89.525 min. ${REPORT}, Table 2-II prints 89.7, to a tenth of a minute, where its own heights (123.3 by 153.7 n. mi.) go round in 89.56`,
      ),
      kind: { is: 'anomalistic', confidence: 'documented', source: `${REPORT}, Table 3-I, perigee to perigee` },
      mass: doc(32_356 * LB, `${WEIGHTS}, first SPS firing, nearest tabulated free-flight mass`),
      injection: {
        at: doc(INSERTION, `${LV_TRAJ}, Table XIII, p. 74`),
        heading: 'north',
        arc: derived(16.2, `${REPORT}, Table 3-II, along-orbit arc from launch to insertion`),
        anomaly: estimated(0, 'Insertion close to perigee; for standalone initial orbit solver'),
      },
    },
    coastFixes: [
      ascentFix(69, 50, -80.5571, 28.3622, 6377.851, 505.4, 25.17, 88.01),
      ascentFix(70, 75.5, -80.5264, 28.3708, 6385.48, 734.2, 31.64, 83.65),
      ascentFix(72, 145.59, -79.9558, 28.531, 6435.104, 2320.3, 26.32, 75.79),
      ascentFix(73, 300, -76.7541, 29.3409, 6545.545, 3150.1, 8.6, 77.44),
      ascentFix(74, 500, -69.2121, 30.6568, 6597.563, 5554.5, 0.93, 81.92),
      ascentFix(74, 616.76, -61.9777, 31.3633, 6600.454, 7780.3, 0, 85.91),
      ascentFix(74, INSERTION, -61.2293, 31.4091, 6600.459, 7788.6, 0.01, 86.32),
      fix(`${REPORT}, Table 3-II, actual venting start`, [T(1, 34, 29), 27.77, -107.39, 752_413, 25_560, -0.09, 74.38]),
      fix(`${REPORT}, Table 3-II, actual venting end`, [T(1, 46, 30), 29.43, -55.24, 767_308, 25_555, 0.18, 102.47]),
      beforeSeparation,
      ...ignitionFixes.map((row, i) => fix(`${REPORT}, Table 3-III, actual SPS ${i + 1} ignition`, [sps[i]!.on, ...row])),
      fix(`${REPORT}, Table 3-VI; §5.16.1 for onboard flight-path angle`, [INTERFACE, 29.92, -92.62, 400_000, 25_846, -2.072, 87.47]),
    ],
    entryInterface: doc(400_000 * FT, `${REPORT}, Table 3-VI`),
    landing: {
      at: doc(SPLASH, EVENTS),
      latitude: doc(27.54, `${REPORT}, §5.16.1, recovery forces estimate`),
      longitude: doc(-64.07, `${REPORT}, §5.16.1, recovery forces estimate`),
      near: 'the Atlantic near USS Essex',
      aimed: {
        confidence: 'documented',
        source: `${REPORT}, §3.2.2 and §3.3: the eighth firing was the deorbit maneuver, computed by the ground for the planned landing area; the spacecraft came down within sight of the recovery ship`,
      },
    },
    ground: doc(0, `${REPORT}, §5.5, the Atlantic`),
    supplies: doc(11, 'Apollo 7 press kit, open-ended mission up to eleven days'),
    manual: { parting: derived(MODULES - service.off, `${REPORT}, Table 2-I, coast from SPS cutoff to CM/SM separation`) },
    automatic:
      'The Earth landing sequence ran automatically. The crew flew the initial entry bank by hand before handing roll control to the computer.',
    marks: [
      mark('insertion', 'Orbital insertion', INSERTION, `${LV_TRAJ}, Table XIII, p. 74`),
      mark('sivb-safing', 'S-IVB propellant dump begins', T(1, 34, 29)),
      mark('sivb-safing-end', 'S-IVB propellant dump ends', T(1, 46, 30)),
      mark('sivb-takeover', 'Crew takes over S-IVB attitude', T(2, 30, 49.1)),
      mark('sivb-rendezvous', 'Station-keeping with S-IVB', T(29, 55, 43)),
      mark('sivb-departure', 'Leaves the S-IVB', T(30, 20, 0)),
      mark('sivb-reentry', 'S-IVB reenters over the Indian Ocean', T(168, 27, 0), `${REPORT}, §3.4`),
      mark('entry-interface', 'Entry interface · 400,000 ft', INTERFACE),
      mark('blackout-in', 'Communications blackout', T(259, 54, 58)),
      mark('blackout-out', 'Communications restored', T(259, 59, 46)),
      { ...mark('splashdown', 'Splashdown', SPLASH), lands: 'cm' },
    ],
  },
};

/**
 * Skylab 3 as flown by CSM-117 and Saturn IB SA-207 from Pad 39B: the record the plan is written from
 * (vehicles/saturn-ib-plan.ts `saturnIBPlan`), set out with its sources and its gaps in mission.md beside this file. Times
 * are seconds from range zero, 11:10:50 UTC, 28 July 1973.
 *
 * The launch vehicle is its flight evaluation's (MPR-SAT-FE-73-5); the spacecraft's is its mission report's (JSC-08662):
 * the five rendezvous firings at their instants with their impulses as checks (Table 12-I), each a purpose solved on the
 * workshop where it is as the profile had it (JSC-63400, chapter 5), the braking to the docking, the service module
 * quads B and D isolated for their oxidizer leaks as faults (§17.1), the CSM's masses and propellant (appendix D, §7.10),
 * the single deorbit firing and the landing. The workshop is the flight's target (`target`). The docked stay is not flown
 * docked: the command and service modules coast on alone from the docking, as Skylab 2's do (its orbital.ts).
 */
import { assumed, derived, doc, estimated } from '../../../../../src/measure.ts';
import type { AttitudeDef, FlightPlan, OrbitFix, PlanCheck } from '../../../../../src/sim/plan.ts';
import { CSM_OUTSIDE, saturnIBPlan } from '../../../apollo/vehicles/saturn-ib-plan.ts';
import type { Burn, SaturnIBRecord } from '../../../apollo/vehicles/saturn-ib-record.ts';
import { LC39B } from '../../../places/cape-canaveral/lc-39.ts';
import {
  escapeEngine,
  impulseCheck,
  JSC08662,
  JSC63400,
  rangeCheck,
  skylabAborts,
  skylabEntry,
  workshopInPlane,
  workshopTarget,
} from '../../vehicles/skylab-plan.ts';

const FT = 0.3048;
const LB = 0.45359237;
const LBF = 4.448221615;
const NMI = 1852;
const G0 = 9.80665;
const T = (h: number, m: number, s: number) => h * 3600 + m * 60 + s;
const utc = (iso: string) => (Date.parse(`${iso}Z`) - Date.parse('1973-07-28T11:10:50Z')) / 1000;

const FER = 'Saturn IB Launch Vehicle Flight Evaluation Report SA-207, Skylab-3 (MPR-SAT-FE-73-5, 1973)';
const EVENTS = `${FER}, Table 2-2, actual range time`;
const MASSES = `${FER}, Tables 16-1 and 16-5, actual`;
const MR = JSC08662;
const TABLE12 = `${MR}, Table 12-I, rendezvous maneuver summary, real time profile`;
const KIT3 = 'Skylab 3 press kit (NASA release 73-142), mission profile: the rendezvous table';
const LANDED = `${MR}, §13.3.3: the landing point "determined to be 30 degrees 47 minutes 36 seconds north latitude, 120 degrees 29 minutes 24 seconds west longitude"`;

const OECO = 140.73;
const SEPARATION_SIB = 142.02;
const ESC = 143.4;
const GCS = 592.93;
const INSERTION = 602.93;
const CSM_SEPARATION = 1080.44;
const NC1 = T(2, 18, 6);
const NC2 = T(4, 33, 54);
const NCC = T(5, 20, 3);
const NSR = T(5, 57, 3);
const TPI = T(7, 17, 36);
const TPF = T(7, 50, 24);
const DOCKING = T(8, 21, 10);
const UNDOCK = utc('1973-09-25T19:49:42');
const DEORBIT = utc('1973-09-25T21:38:18');
const SPLASH = 59 * 86_400 + 11 * 3600 + 9 * 60 + 4;

/** The workshop's orbit at the rendezvous as the press kit expected it, and its place as the first visit's commentary had it at the same point of the profile. */
const WORKSHOP = workshopInPlane(
  { latitude: LC39B.latitude.value, longitude: LC39B.longitude.value },
  { at: CSM_SEPARATION, latitude: 50.183, longitude: -22.624, heading: 88.581 },
  [doc(424_600, `${KIT3}: "expected to be 424.6 by 439.5km (229x237 nm) at Skylab 3 rendezvous"`), doc(439_500, KIT3)],
  derived(
    1344.6 * NMI,
    `no figure of this launch's own was read: where the record's five firings (${TABLE12}), flown open on their impulses along the motion from this run's insertion, bring the spacecraft to the terminal phase's geometry under the workshop at TPI's instant (${JSC63400}: 27° up, 10 nautical miles under, 36.4 km ahead). Flown so from the first visit's 780 nautical miles (its launch commentary, SL II MC 1/1), the workshop stood 1,081 km behind at TPI: 1,117.6 km more on its 6,810 km radius, 564.6 nautical miles more over the ground. The lower insertion of this launch (149.9 by 226.3 km against the first visit's 150.0 by 352.1) gains on the workshop faster`,
  ),
  -3.1,
  `the workshop at the first stage's ignition (${EVENTS}, item 2: -3.1 s), on the plane of the spacecraft's tracked state at its separation (${FER}, Table 4-4: the insertion's place in Table 4-7 is not legible in the scan)`,
);

function fix(source: string, [at, latitude, longitude, km, speed, climb, heading]: readonly number[]): OrbitFix {
  const d = (v: number) => doc(v, source);
  return {
    at: d(at!),
    latitude: d(latitude!),
    longitude: d(longitude!),
    altitude: d(km! * 1000),
    speed: d(speed!),
    climb: d(climb!),
    heading: d(heading!),
  };
}

function aimed(id: string, label: string, [forward, left, up]: readonly [number, number, number], source: string): AttitudeDef {
  return {
    id,
    label,
    source,
    hold: {
      aim: 'velocity',
      sense: 1,
      yaw: estimated((Math.atan2(left, forward) * 180) / Math.PI, source),
      below: estimated((-Math.atan2(up, Math.hypot(forward, left)) * 180) / Math.PI, source),
      confidence: 'estimated',
    },
  };
}

const MU = 3.986004418e14;
const RE = 6_378_137;
const DELTA_H = 10 * NMI;
const ELEVATION = 27;
const WORKSHOP_RATE = Math.sqrt(MU / (RE + WORKSHOP.height.value) ** 3);
/** Where the workshop was to stand at the coelliptic burn, as Skylab 2's (its orbital.ts), on this flight's own instants. */
const NSR_AHEAD = DELTA_H / Math.tan((ELEVATION * Math.PI) / 180) + 1.5 * WORKSHOP_RATE * DELTA_H * (TPI - NSR);
/** The height under the workshop this visit planned after NC2: 202 by 215 nautical miles under 229 by 237 (`KIT3`), 24.5 on the mean. */
const DELTA_H_NCC = ((229 + 237 - 202 - 215) / 2) * NMI;
const NCC_AHEAD = NSR_AHEAD + 1.5 * WORKSHOP_RATE * ((DELTA_H_NCC + DELTA_H) / 2) * (NSR - NCC);
const NC2_AHEAD = NCC_AHEAD + 1.5 * WORKSHOP_RATE * DELTA_H_NCC * (NCC - NC2);

const SPS_THRUST = assumed(
  21_180 * LBF,
  'Apollo 7 Mission Report (MSC-PA-R-68-15), Table 5.18-I: CSM-101’s calculated steady state, taken for CSM-117’s engine',
);
const SPS_ISP = assumed(314.0, 'Apollo 7 Mission Report (MSC-PA-R-68-15), Table 5.18-I: CSM-101’s, taken');
const CSM = doc(14_167, `${FER}, Table 16-5: CSM separated, 14,167 kg (31,234 lb)`);
const firing = (dv: number, mass: number) => (mass * G0 * SPS_ISP.value * (1 - Math.exp(-dv / (G0 * SPS_ISP.value)))) / SPS_THRUST.value;
const flownBy = (mps: number, what: string) => doc(mps, `${TABLE12}: ${what}, ${mps} m/s`);

const heads = (id: string, label: string) =>
  aimed(
    id,
    label,
    [1, 0, 0],
    `${JSC63400}: "NC1, NC2, NCC, and NSR were executed in a heads-down attitude"; along the motion, the line guidance steers it to taking over`,
  );

const burn = (
  id: string,
  label: string,
  on: number,
  engine: 'sps' | 'sm-rcs',
  flown: ReturnType<typeof flownBy>,
  aim: AttitudeDef,
  toward: Burn['toward'],
): Burn => ({
  id,
  label,
  engine,
  aim,
  on: doc(on, TABLE12),
  off: {
    at: estimated(
      on + firing(flown.value, CSM.value),
      'the firing’s end: its impulse on the engine at the spacecraft’s mass; guidance cuts it on what it is for',
    ),
    label: `${label} complete`,
  },
  flown,
  ...(toward ? { toward } : {}),
});

const AT_NSR: Burn['toward'] = {
  reach: {
    ahead: derived(
      NSR_AHEAD,
      `where the workshop stands at the coelliptic burn: as far ahead as it draws away over the coelliptic orbit 10 nautical miles under it to stand ${ELEVATION}° up at the terminal phase (${JSC63400})`,
    ),
    above: doc(DELTA_H, `${JSC63400}: "a coelliptic orbit 10 nm below Skylab"`),
  },
  at: doc(NSR, TABLE12),
};

const burns: Burn[] = [
  burn('nc1', 'NC1 · First phasing', NC1, 'sps', flownBy(65.44, 'first phasing maneuver'), heads('nc1-aim', 'NC1 attitude'), {
    level: {
      ahead: derived(
        NC2_AHEAD,
        'where the workshop stands at NC2: as far again ahead as it draws away to the corrective combination, the spacecraft 24.5 nautical miles under it',
      ),
    },
    at: doc(NC2, TABLE12),
  }),
  burn('nc2', 'NC2 · Second phasing', NC2, 'sps', flownBy(47.57, 'second phasing maneuver'), heads('nc2-aim', 'NC2 attitude'), {
    level: {
      above: doc(
        DELTA_H_NCC,
        `${KIT3}: the orbit planned after NC2, 202 by 215 nautical miles, under the workshop's expected 229 by 237: 24.5 on the mean`,
      ),
    },
    at: doc(NCC, TABLE12),
  }),
  burn(
    'ncc',
    'NCC · Corrective combination',
    NCC,
    'sps',
    flownBy(11.46, 'corrective combination maneuver'),
    heads('ncc-aim', 'NCC attitude'),
    AT_NSR,
  ),
  burn('nsr', 'NSR · Coelliptic', NSR, 'sps', flownBy(6.4, 'coelliptic maneuver'), heads('nsr-aim', 'NSR attitude'), {
    coelliptic: true,
    planar: true,
  }),
  burn(
    'tpi',
    'TPI · Terminal phase initiation',
    TPI,
    'sps',
    flownBy(6.49, 'terminal phase initiation'),
    aimed(
      'tpi-aim',
      'TPI attitude',
      [1, 0, 0.5],
      'on the line of sight to the workshop, about 27° up: the line guidance steers it to taking over',
    ),
    {
      elevation: {
        angle: doc(ELEVATION, `${JSC63400}: TPI "at an elevation angle of 27 degrees and a range of ~22 nm"`),
        travel: derived(130, `this visit's planned terminal phase, 7:12:22 to 7:46:04 (${KIT3}), on the workshop's orbit`),
        window: doc(600, `${JSC63400}: "The maximum TIG slip for TPI was +/-10 minutes"`),
      },
    },
  ),
  {
    id: 'terminal-braking',
    label: 'Braking and station-keeping',
    engine: 'sm-rcs',
    aim: aimed(
      'terminal-braking-aim',
      'Braking',
      [-1, 0, 0],
      'nose on the workshop, braking against the closing: the thrust is commanded on the workshop',
    ),
    on: estimated(TPF - 600, 'ten minutes of braking to the terminal phase’s finalization: its start is not in the table'),
    off: { at: doc(TPF, `${TABLE12}: terminal phase finalization`), label: 'Station-keeping on the workshop' },
    flown: doc(8.32, `${TABLE12}: the preflight profile's terminal phase finalization, 8.32 m/s; the real time column gives none`),
    toward: {
      station: {
        ahead: estimated(
          -100 * FT,
          'the workshop behind, a hundred feet off its docking port, which faced along the motion at docking (JSC-63400): chosen',
        ),
        above: estimated(0, 'level with it: chosen'),
      },
      until: doc(DOCKING, TABLE12),
    },
  },
  {
    id: 'deorbit',
    label: 'SPS · Deorbit',
    engine: 'sps',
    aim: aimed('deorbit-aim', 'Deorbit', [-1, 0, 0], 'against the motion: the line is not in anything read, chosen'),
    on: doc(DEORBIT, `${MR}, §2 and Astronautics and Aeronautics, 1973: the single deorbit firing at 21:38:18`),
    off: {
      at: derived(
        DEORBIT + 18,
        `${MR}, §7.7.1: six firings of 39 s in all, the five for the rendezvous about 21: the deorbit firing's 18 s`,
      ),
      label: 'Deorbit firing complete',
    },
    flown: derived(
      G0 * SPS_ISP.value * Math.log((12_402 + (18 * SPS_THRUST.value) / (G0 * SPS_ISP.value)) / 12_402),
      `the deorbit firing's 18 s (${MR}, §7.7.1) at the engine's thrust and flow, ending at the CSM's 12,402 kg at the modules' parting (Table D-I)`,
    ),
  },
];

const CM_ENTRY = doc(5_932, `${MR}, Table D-I: the command module at the entry interface`);
const CM_DROGUE = doc(5_744, `${MR}, Table D-I: the command module at drogue mortar firing`);
const PARTED = DEORBIT + 300;
const INTERFACE = PARTED + 593;
const DROGUE = SPLASH - 340;
const MAIN = SPLASH - 290;
const APOLLO7 = 'Apollo 7 Mission Report (MSC-PA-R-68-15), Table 2-I: the interval on CM-101, taken';
const mark = (id: string, label: string, at: number, source: string) => ({ id, label, at: doc(at, source) });

const checks: PlanCheck[] = [
  {
    id: 'cutoffSpeed',
    label: 'S-IVB cutoff inertial speed',
    value: 7829.73,
    unit: 'm/s',
    tolerance: 40,
    of: 'ascent',
    confidence: 'documented',
    source: `${FER}, Table 4-2, guidance cutoff signal, space-fixed velocity`,
  },
  {
    id: 'inclination',
    label: 'Insertion inclination',
    value: 50.028,
    unit: '°',
    tolerance: 0.25,
    of: 'ascent',
    confidence: 'documented',
    source: `${FER}, Table 4-7`,
  },
  {
    id: 'perigee',
    label: 'Perigee at insertion',
    value: 149_870,
    unit: 'm',
    tolerance: 6_000,
    of: 'ascent',
    confidence: 'documented',
    source: `${FER}, Table 4-7`,
  },
  {
    id: 'apogee',
    label: 'Apogee at insertion',
    value: 226_290,
    unit: 'm',
    tolerance: 15_000,
    of: 'ascent',
    confidence: 'documented',
    source: `${FER}, Table 4-7`,
  },
  impulseCheck('nc1', 'NC1, impulse', flownBy(65.44, 'first phasing maneuver'), 4),
  impulseCheck('nc2', 'NC2, impulse', flownBy(47.57, 'second phasing maneuver'), 4),
  impulseCheck('ncc', 'NCC, impulse', flownBy(11.46, 'corrective combination maneuver'), 3),
  impulseCheck('nsr', 'NSR, impulse', flownBy(6.4, 'coelliptic maneuver'), 3),
  impulseCheck('tpi', 'TPI, impulse', flownBy(6.49, 'terminal phase initiation'), 2),
  rangeCheck(
    'tpi',
    'Workshop at the terminal phase',
    TPI,
    doc(22 * NMI, `${JSC63400}: TPI "at an elevation angle of 27 degrees and a range of ~22 nm"`),
    4 * NMI,
  ),
  {
    id: 'cm.at',
    label: 'Splashdown',
    value: SPLASH,
    unit: 's',
    tolerance: 120,
    of: 'descent',
    confidence: 'documented',
    source: `${MR}, §2: 22:19:54 G.m.t., 1,427 hours 9 minutes 4 seconds`,
  },
];

export const orbital: SaturnIBRecord = {
  label: 'Saturn IB SA-207 with CSM-117',
  liftoff: doc(587_766, `${MASSES}: first flight stage at first motion`),
  sib: {
    mass: doc(448_974, `${FER}, Table 16-1: the first stage with the interstage and the retrorockets at first motion`),
    spent: doc(42_900 + 3_091, `${FER}, Table 16-5: S-IB stage at separation, 42,900 kg, and the interstage, 3,091 kg`),
    propellant: {
      load: derived(448_974 - 2_609 - 481 - 42_900, `${FER}, Tables 16-1 and 16-5: the S-IB at first motion less at separation`),
    },
    h1: {
      thrust: {
        seaLevel: doc(205_645 * LBF, `${FER}, Table 6-2: the eight H-1s' average thrust reduced to standard sea level, 205,645 lbf`),
        vacuum: derived(
          (205_645 * LBF * 293.3) / 263.0,
          `the sea-level figure at the stage's specific impulse at altitude over the sea-level one, at the same flow (${FER}, Fig. 6-2 and Table 6-2)`,
        ),
      },
      isp: {
        seaLevel: doc(263.0, `${FER}, Table 6-2: average, reduced to standard sea level`),
        vacuum: estimated(293.3, `${FER}, Fig. 6-2: the stage's specific impulse from 110 s to the cutoffs, read off the figure`),
      },
      flow: {
        points: [
          [0, 6210 * LB],
          [5, 6285 * LB],
          [10, 6345 * LB],
          [15, 6378 * LB],
          [20, 6400 * LB],
          [90, 6400 * LB],
          [100, 6392 * LB],
          [105, 6368 * LB],
          [112.5, 6354 * LB],
          [117.5, 6340 * LB],
          [122.5, 6313 * LB],
          [127.5, 6292 * LB],
          [132.5, 6268 * LB],
          [135, 6257 * LB],
        ],
        confidence: 'estimated',
        source: `${FER}, Fig. 6-2: the S-IB's reconstructed total flow, lbm/s, read off the figure at 2.5 s (its value at range zero carried back from the first three)`,
      },
    },
    inboardCut: doc(137.36, `${EVENTS}, item 49`),
    outboardCut: doc(OECO, `${EVENTS}, item 55`),
    separation: doc(SEPARATION_SIB, `${FER}, Table 4-4 (Table 2-2, item 65: calculated, data lost)`),
    push: estimated(1.5, 'combined first-stage retrorocket and second-stage ullage separation model, as Apollo 7’s'),
  },
  sivb: {
    mass: doc(
      116_572 + 2_094 + 1_799,
      `${MASSES}: the S-IVB stage, 116,572 kg, the instrument unit, 2,094 kg, and the spacecraft adapter, 1,799 kg`,
    ),
    propellant: {
      load: doc(
        (195_170 + 38_367) * LB,
        `${FER}, §7.5 and Table 7-2: best estimate full load, 195,170 lbm of oxygen and 38,367 lbm of hydrogen`,
      ),
      usable: derived(
        (195_170 + 38_367 - 2_551 - 2_326 + 532) * LB,
        `${FER}, §7.5 and Table 7-2: the load less the best estimate at cutoff (2,551 lbm of oxygen, 2,326 of hydrogen), and back the 532 lbm of oxygen it could have burned to its depletion 5.4 s on`,
      ),
    },
    j2: {
      thrust: doc(226_082 * LBF, `${FER}, Table 7-1: reconstructed at STDV open +60 s, standard altitude, the 5.5 mixture ratio`),
      isp: doc(423.9, `${FER}, Table 7-1`),
      shift: {
        at: doc(469.0, `${EVENTS}, item 90: mixture ratio control valve open (4.8:1 EMR)`),
        before: doc(1, `${FER}, Table 7-1`),
        after: assumed(
          196_500 / 227_832,
          'SA-206’s thrust at the 4.8 mixture ratio over its thrust at 5.5 (its flight evaluation, Fig. 7-2 and Table 7-1), taken',
        ),
      },
      starts: `${FER}, §7: one J-2 burn of 448.53 s`,
    },
    ignition: doc(ESC, `${EVENTS}, item 66: engine start command (calculated, data lost)`),
    cutoff: doc(GCS, `${EVENTS}, item 96: guidance cutoff signal`),
  },
  les: {
    mass: doc(4_156, `${FER}, Table 16-5: launch escape system, 4,156 kg`),
    at: estimated(
      ESC + 28,
      'the tower 28 s after the S-IVB’s ignition, as the Skylab 1/2 press kit planned it for SA-206; its instant is not in the flight evaluation',
    ),
    motor: {
      thrust: assumed(33_000 * LBF, 'Apollo 7 press kit, p. 25, tower jettison motor: the type’s'),
      burn: assumed(1.1, 'Apollo Spacecraft News Reference, launch escape subsystem, burn slightly longer than one second'),
    },
    escape: escapeEngine,
  },
  csm: {
    sm: derived(CSM.value - 6_085, `${CSM.source}, less the command module's launch weight, 6,085 kg (${MR}, Table 7-IV)`),
    cm: {
      label: 'Command module 117',
      mass: CM_DROGUE,
      lift: {
        points: [
          [0.688, 0.21],
          [0.942, 0.295],
          [1.618, 0.46],
          [3.344, 0.37],
          [3.375, 0.357],
          [8.551, 0.347],
          [11.227, 0.345],
          [13.373, 0.332],
          [15.284, 0.325],
          [17.163, 0.323],
          [19.161, 0.314],
          [21.156, 0.307],
          [23.316, 0.31],
          [25.463, 0.305],
          [27.72, 0.316],
        ],
        confidence: 'assumed',
        source: 'Apollo 7 Entry Postflight Analysis (NTRS 19740072689), Table IIa: CM-101’s lift over drag in its entry, taken for CM-117',
      },
      trim: assumed(20, 'Apollo 7 Mission Report, Fig. 5.2-1, trim about 160 deg angle of attack: CM-101’s, taken'),
    },
    shield: derived(
      CM_ENTRY.value - CM_DROGUE.value,
      `the command module at the entry interface less at drogue mortar firing (${MR}, Table D-I): the forward heat shield with what the module spent between`,
    ),
    sps: {
      thrust: SPS_THRUST,
      isp: SPS_ISP,
      starts: doc(6, `${MR}, §7.7.1: "Six maneuvers were accomplished"`),
      load: doc(2_265, `${MR}, §7.10.1: loaded 867 kg of fuel and 1,398 of oxidizer`),
      deltaV: derived(
        G0 * SPS_ISP.value * Math.log((12_402 + (18 * SPS_THRUST.value) / (G0 * SPS_ISP.value)) / 12_402),
        `the deorbit firing's 18 s (${MR}, §7.7.1) at the engine's thrust and flow`,
      ),
    },
    separation: {
      at: doc(CSM_SEPARATION, `${FER}, Table 4-4, S-IVB/CSM separation`),
      push: doc(3 * FT, `${JSC63400}: "The CSM separated from the S-IVB with a 3 foot/second posigrade burn"`),
    },
    modules: {
      at: estimated(PARTED, `5 min after the deorbit firing’s command: ${APOLLO7} (from the cutoff), rounded`),
      after: CM_ENTRY,
      leaves: derived(12_402 - 5_932, `${MR}, Table D-I: the CSM at CM/SM separation less the command module at the entry interface`),
      push: derived(27.5 * FT, 'Apollo 7 Mission Report §3.4, reconstructed 25–30 ft/s posigrade: the type’s'),
    },
    rcs: {
      centre: derived(2446.04 / 2.54, `${MR}, Table D-I: the CSM's centre of gravity at its initial orbit, X 2446.04 cm, as XA inches`),
      load: doc(
        1_180.3,
        `${MR}, §7.10.2: the service module reaction control system's usable load, the four quads and the propellant storage module`,
      ),
      inertia: [
        [12_402, 21_222, 59_309, 59_547, 'the CSM at CM/SM separation'],
        [13_224, 22_486, 66_767, 67_026, 'rendezvous complete'],
        [13_486, 22_997, 67_402, 67_680, 'coelliptic orbit'],
        [14_168, 24_150, 71_607, 71_673, 'initial orbit achieved (its yaw moment read on a smudged figure)'],
      ].map(([m, x, y, z, what]) => {
        const s = `${MR}, Table D-I: ${what}`;
        return { mass: doc(m as number, s), roll: doc(x as number, s), pitch: doc(y as number, s), yaw: doc(z as number, s) };
      }),
      isolated: {
        B: doc(utc('1973-07-28T14:18:00'), `${MR}, §17.1.1: "The quad was isolated from the reaction control system at 14:18 G.m.t."`),
        D: estimated(
          utc('1973-08-02T10:47:00'),
          `${MR}, §17.1.2: "Early on visit day 6" the quad's temperature alarm (10:47 UTC, Astronautics and Aeronautics, 1973), its engines inhibited and isolation valves closed after it: when is not read`,
        ),
      },
    },
  },
  burns,
  entry: {
    parting: skylabEntry(
      { latitude: doc(30 + 47 / 60 + 36 / 3600, LANDED), longitude: doc(-(120 + 29 / 60 + 24 / 3600), LANDED) },
      `the steered entry, the determined landing point taken for its target: ${LANDED}`,
    ),
    attitudes: [],
    events: [],
  },
  els: {
    shield: {
      at: estimated(DROGUE - 1.6, `1.6 s before the drogues (${APOLLO7})`),
      height: assumed(23_500 * FT, 'Apollo 7 Mission Report §5.5: CM-101’s, the type’s barometric switch'),
      push: estimated(4, 'forward cover clearance speed; not reconstructed'),
    },
    drogues: {
      at: estimated(DROGUE, `5 min 40 s before the splashdown: ${APOLLO7}`),
      wait: assumed(1.6, 'Apollo 7 Mission Report §5.5'),
      fills: assumed(10, 'Apollo 7 Mission Report §5.5: first disreefing after 10 s'),
    },
    mains: {
      at: estimated(MAIN, `4 min 50 s before the splashdown: ${APOLLO7}`),
      height: assumed(10_300 * FT, 'Apollo 7 Mission Report §5.5: CM-101’s'),
      fills: assumed(16, 'Apollo Earth Landing System, two reefed stages; represented by one progressive fill'),
    },
  },
  ascent: {
    guidance: {
      azimuth: doc(45.003, `${FER}, §9.3.1: "to align the vehicle to a flight azimuth of 45.003 degrees east of north"`),
      vertical: doc(10.158, `${FER}, §9.3.1: "The roll and time-tilt maneuver was begun at 10.158 seconds"`),
      kick: derived(129.169 - 10.158, `${FER}, §9.3.1: "Tilt-arrest ... was commanded at 129.169 seconds"`),
      roll: {
        points: [
          [0, -(90 - 45.003)],
          [10.158, -(90 - 45.003)],
          [57.471, 0],
        ],
        confidence: 'derived',
        source: `${FER}, §9.3.1 and Fig. 9-2: launched on an azimuth of 90°, rolled to 45.003° from 10.158 s, "The roll maneuver was terminated at 57.471 seconds"; evenly between`,
      },
      programme: {
        points: [
          [0, 0],
          [10.158, 0],
          [20, 2.4],
          [30, 7.3],
          [40, 13.4],
          [50, 18.1],
          [60, 24.7],
          [70, 31.6],
          [80, 38.4],
          [90, 44.0],
          [100, 48.5],
          [110, 53.0],
          [120, 57.45],
          [129.169, 62.2622],
        ],
        confidence: 'estimated',
        source: `${FER}, Fig. 9-3 (the pitch command, read off the figure at 250 dpi), its start and end documented (§9.3.1: begun at 10.158 s, tilt arrest at 129.169 s "with a pitch attitude command of -62.2622 degrees"); flown open and held from its end to the J-2's start. The figure's time axis is registered on its 100 to 700 s gridlines, which are evenly spaced: its first division is drawn short, so that t = 0 lies some 8 s left of the plot's border, and its event marks then fall on Table 2-2 (max q 73.6 s against 75.0, OECO 138.5 against 140.73, IGM 175.8 against 176.6). Read from the border, as it was until November 2026, every point came 7 to 12 s early and the S-IB flew too flat (outboard cutoff 45.8 km against 58.71)`,
      },
      turn: doc(ESC, `${EVENTS}, item 66: the S-IVB's power phase flown on the law's closed loop from its start`),
      target: {
        at: 'sivb-cutoff',
        altitude: doc(158_380, `${FER}, Table 4-2: 158.38 km at the guidance cutoff signal, a geodetic height`),
        over: 'ellipsoid',
        climb: doc(-0.013, `${FER}, Table 4-2: space-fixed flight path angle at cutoff`),
        inclination: doc(50.028, `${FER}, Table 4-7`),
      },
    },
    source: `${FER}, §§4, 9 and Tables 4-2 and 4-7`,
    drag: [
      {
        until: doc(GCS, `${EVENTS}, item 96`),
        area: assumed(Math.PI * (6.6 / 2) ** 2, 'MPR-SAT-FE-68-4, Fig. 6-2: the Saturn IB’s 6.60 m reference diameter, the type’s'),
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
          source: 'Slender-stack axial drag approximation, as Apollo 7’s; flight configuration drag curve not digitized',
        },
      },
    ],
    steering: estimated(8, 'deg/s² at full throw, about each axis: NOT FOUND; the Atlas’s 8, as Apollo 7’s is'),
  },
  rarefied: {
    drag: assumed(
      2.2,
      'King-Hele, The Prediction of Satellite Lifetimes, §9.1, customary effective drag coefficient for perigees of 150–400 km',
    ),
    area: derived(CSM_OUTSIDE / 4, 'a quarter of the outside of the command and service modules (Cauchy), as Apollo 7’s'),
    length: assumed(154 * 0.0254, 'Apollo 7 press kit p.25, CM diameter: the type’s'),
  },
  target: workshopTarget(
    { fix: WORKSHOP },
    '1973-07-28T11:10:50Z',
    doc(74_391, `${MR}, Table D-I: the Saturn Workshop at docking, 74,391 kg`),
  ),
  orbit: {
    radius: assumed(
      6_378_088,
      'the ball SA-206’s flight evaluation’s heights are over (Skylab 2’s orbital.ts: its insertion’s place less its perigee), taken for SA-207’s, whose insertion place is not legible in the scan',
    ),
    perigee: doc(149_870, `${FER}, Table 4-7`),
    apogee: doc(226_290, `${FER}, Table 4-7`),
    inclination: doc(50.028, `${FER}, Table 4-7`),
    period: doc(88.25 * 60, `${FER}, Table 4-7`),
    kind: {
      is: 'anomalistic',
      confidence: 'assumed',
      source: 'perigee to perigee, as Apollo 7’s is read: the flight evaluation does not say',
    },
    mass: CSM,
    injection: {
      at: doc(INSERTION, `${FER}, Table 4-7`),
      heading: 'north',
      arc: derived(
        (1797.54 / 6371) * (180 / Math.PI) + ((7.83 * (INSERTION - GCS)) / 6371) * (180 / Math.PI),
        `${FER}, Table 4-2: the surface range at cutoff, 1,797.54 km, and the ten seconds to insertion at its speed, over the Earth's mean radius`,
      ),
      anomaly: estimated(0, 'insertion near perigee (flight path angle 0.001°, Table 4-7)'),
    },
  },
  marks: [
    mark('insertion', 'Orbital insertion', INSERTION, `${FER}, Table 4-7`),
    mark(
      'quad-b-leak',
      'Quad B leaking oxidizer: a “snow storm” on the right side',
      utc('1973-07-28T14:15:00'),
      `${MR}, §17.1.1: abnormal propellant usage about three hours after launch, the data before 14:15 G.m.t.`,
    ),
    mark('quad-b-isolated', 'Quad B isolated', utc('1973-07-28T14:18:00'), `${MR}, §17.1.1`),
    mark('docking', 'Docking at the workshop’s axial port', DOCKING, TABLE12),
    mark(
      'workshop-entry',
      'The crew enters the workshop',
      utc('1973-07-28T20:00:00'),
      'Skylab 3 record.ts: Astronautics and Aeronautics, 1973',
    ),
    {
      id: 'quad-d-isolated',
      label: 'Quad D inhibited and isolated for a second oxidizer leak',
      at: estimated(utc('1973-08-02T10:47:00'), `${MR}, §17.1.2: early on visit day 6`),
    },
    mark(
      'undocking',
      'Undocking: no flyaround, quads B and D isolated',
      UNDOCK,
      'Skylab 3 record.ts: JSC-08662 and Astronautics and Aeronautics, 1973',
    ),
    {
      id: 'entry-interface',
      label: 'Entry interface · 400,000 ft',
      at: estimated(INTERFACE, `9 min 53 s after the modules part: ${APOLLO7}`),
    },
    { ...mark('splashdown', 'Splashdown', SPLASH, `${MR}, §2`), lands: 'cm' },
  ],
  mission: {
    manoeuvreTurn: estimated(30, 'Display slew into the burn directions; exact attitude timeline unavailable'),
    entryInterface: assumed(400_000 * FT, 'Apollo 7 Mission Report, Table 3-VI: the type’s'),
    landing: {
      at: doc(SPLASH, `${MR}, §2`),
      latitude: doc(30 + 47 / 60 + 36 / 3600, LANDED),
      longitude: doc(-(120 + 29 / 60 + 24 / 3600), LANDED),
      near: 'the Pacific about 300 km southwest of San Diego, near USS New Orleans',
    },
    ground: doc(0, 'the Pacific'),
    supplies: doc(59, `${MR}, §2`),
    manual: { parting: estimated(PARTED - DEORBIT, 'coast from the deorbit firing’s command to the modules’ parting, as above') },
    automatic:
      'The Earth landing sequence ran automatically. The computer flew the entry; the command module’s thrusters held the attitude to the drogues.',
  },
  checks,
  coastFixes: [
    fix(`${FER}, Table 4-4, S-IB/S-IVB separation`, [SEPARATION_SIB, 29.046, -80.148, 59.97, 2302.95, 24.806, 52.9]),
    fix(`${FER}, Table 4-4, S-IVB/CSM separation`, [CSM_SEPARATION, 50.183, -22.624, 169.36, 7826.45, 0.198, 88.581]),
  ],
  aborts: skylabAborts(
    estimated(ESC + 28, 'the tower’s jettison, as above'),
    doc(INSERTION, `${FER}, Table 4-7`),
    derived(CSM.value, 'the spacecraft at first motion: its mass at separation, consumables in the climb not taken off'),
    {
      second: assumed(9 * 60 + 33, 'Apollo 7 press kit (68-168K), p. 24: the planned Mode II boundary, the type’s'),
      orbit: {
        from: assumed(9 * 60 + 27, 'Apollo 7 press kit (68-168K), p. 24: the abort-to-orbit opening, the type’s'),
        perigee: doc(149_870, `${FER}, Table 4-7`),
      },
    },
  ),
};

export const skylab3Plan: FlightPlan = saturnIBPlan(orbital);

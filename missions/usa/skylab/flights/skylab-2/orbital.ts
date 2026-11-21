/**
 * Skylab 2 as flown by CSM-116 and Saturn IB SA-206 from Pad 39B: the record the plan is written from
 * (vehicles/saturn-ib-plan.ts `saturnIBPlan`), set out with its sources and its gaps in mission.md beside this file. Times
 * are seconds from range zero, 13:00:00 UTC, 25 May 1973; the record's own figures are in its units, converted once.
 *
 * The launch vehicle is its flight evaluation's (MPR-SAT-FE-73-3): every instant, mass, engine and orbit to the spacecraft's
 * separation. The spacecraft's own mission report (JSC-08414) has not been read: the rendezvous is flown as the profile
 * the Skylab visits shared (JSC-63400, chapter 5), each burn a purpose solved on the workshop where it is (sim/plan.ts
 * `Pursuit`), and the instants the record does give (the terminal phase's, the station-keeping, the dockings, the
 * undocking, the two deorbit firings, the splashdown) are held as figures or set as marks. The workshop is the flight's
 * target (`target`), placed from the launch's commentary on where it was. The docked stay is not flown docked: the
 * command and service modules coast on alone from the first soft docking, as the record's crew could not fly a joint the
 * simulator does not yet form, and the undocking, the flyaround and the separation are marks.
 */
import { assumed, derived, doc, estimated } from '../../../../../src/measure.ts';
import type { AttitudeDef, FlightPlan, OrbitFix, PlanCheck } from '../../../../../src/sim/plan.ts';
import { CSM_OUTSIDE, saturnIBPlan } from '../../../apollo/vehicles/saturn-ib-plan.ts';
import type { Burn, SaturnIBRecord } from '../../../apollo/vehicles/saturn-ib-record.ts';
import { LC39B } from '../../../places/cape-canaveral/lc-39.ts';
import {
  escapeEngine,
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
/** Seconds from range zero of an instant of ground elapsed time. */
const T = (h: number, m: number, s: number) => h * 3600 + m * 60 + s;
/** Seconds from range zero of an instant on the day of the month, UTC (May 1973 for days up to 31, then June). */
const utc = (iso: string) => (Date.parse(`${iso}Z`) - Date.parse('1973-05-25T13:00:00Z')) / 1000;

const FER = 'Saturn IB Launch Vehicle Flight Evaluation Report SA-206, Skylab-2 (MPR-SAT-FE-73-3, July 1973)';
const EVENTS = `${FER}, Table 2-2, actual range time`;
const MASSES = `${FER}, Tables 16-1, 16-3 and 16-5, actual`;
const PAO = 'NASA Skylab 2 mission commentary, SL II MC 1/1 (T−1:25:00), Kennedy and Houston (UAH Archives, sdsp_skyl_000078)';
const SEQUENCE = 'MSFC Skylab Mission Sequence Evaluation (NASA TM X-64816, March 1974), SL-2 actual events (GMT)';
const AA = 'Astronautics and Aeronautics, 1973 (NASA SP-4021), 25 May and 22 June entries';
const DEBRIEF = 'Skylab 1/2 Technical Crew Debriefing, 30 June 1973 (NTRS 20160012436), §4';
const KIT3 = 'Skylab 3 press kit (NASA release 73-142), mission profile: the rendezvous and deorbit table';
const KIT12 = 'Skylab 1/2 press kit (NASA release 73-79), Mission profile: launches, docking and deorbit';
const LANDED =
  'Spacefacts, Skylab 2 mission report (24°45′ N, 127°02′ W); the same in Wikipedia’s Skylab 2: the mission report’s figure, not read';

const OECO = 142.26;
const SEPARATION_SIB = 143.7;
const ESC = 144.9;
const GCS = 586.19;
const INSERTION = 596.21;
const CSM_SEPARATION = 960.28;
/** The terminal phase's lighting as the crew logged it (`DEBRIEF`: "The final burn time was 7034760"). */
const TPI = T(7, 3, 47.6);
const RENDEZVOUS = utc('1973-05-25T20:37:00');
const SOFT_DOCK = utc('1973-05-25T21:15:00');
const HARD_DOCK = utc('1973-05-26T03:52:00');
const UNDOCK = utc('1973-06-22T08:55:00');
const SHAPING = utc('1973-06-22T10:05:00');
const DEORBIT = utc('1973-06-22T13:11:00');
const SPLASH = 28 * 86_400 + 49 * 60 + 49;

/** The workshop's orbit and place as the commentary had it at the count's last hour (`PAO`). */
const WORKSHOP = workshopInPlane(
  { latitude: LC39B.latitude.value, longitude: LC39B.longitude.value },
  { at: INSERTION, latitude: 39.271, longitude: -65.053, heading: 55.855 },
  [doc(239 * NMI, `${PAO}: "an orbit of 239 nautical miles by 234"`), doc(234 * NMI, `${PAO}`)],
  doc(
    780 * NMI,
    `${PAO}: "At the time of ignition, the workshop will have passed directly overhead and should be approximately 780 nautical miles downrange"`,
  ),
  -3.1,
  `${PAO}, at the first stage's ignition (${EVENTS}, item 2: -3.1 s)`,
);

/** A tracking fix of the flight evaluation's (SI already: km, m/s, degrees; the heights geodetic, the speed and angles space-fixed). */
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

/** An attitude for a firing in orbit: along the motion turned left and pitched down by the firing's components (forward, left, up), as the record's crew pointed it, where the record does not give the line. */
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

// The profile's instants (JSC-63400): the first phasing burn a revolution and a half after insertion, at apogee; the second
// a revolution and a half later; the corrective combination half a revolution after that; the coelliptic burn 37 minutes on.
const MU = 3.986004418e14;
const RE = 6_378_137;
const period = (perigee: number, apogee: number) => 2 * Math.PI * Math.sqrt((RE + (perigee + apogee) / 2) ** 3 / MU);
const NC1 = INSERTION + 1.5 * 89.53 * 60;
const NC2 = NC1 + 1.5 * period(120 * NMI, 208 * NMI);
const NCC = NC2 + 0.5 * period(202 * NMI, 215 * NMI);
const NSR = NCC + 37 * 60;
/** How far the coelliptic orbit lies under the workshop's (`JSC63400`: "a coelliptic orbit 10 nm below Skylab"). */
const DELTA_H = 10 * NMI;
/** The terminal phase's elevation and range (`JSC63400`: "an elevation angle of 27 degrees and a range of ~22 nm"). */
const ELEVATION = 27;
const WORKSHOP_RATE = Math.sqrt(MU / (RE + WORKSHOP.height.value) ** 3);
/** Where the workshop was to stand at the coelliptic burn: 10 nmi up, and as far ahead as the slower orbit under it lets it draw away to stand 27° up at the terminal phase (relative drift 3/2 n Δh). */
const NSR_AHEAD = DELTA_H / Math.tan((ELEVATION * Math.PI) / 180) + 1.5 * WORKSHOP_RATE * DELTA_H * (TPI - NSR);
/**
 * How far under the workshop the corrective combination found the spacecraft: the second visit's plan, which had it on 202
 * by 215 nautical miles after NC2 under a workshop expected at 229 by 237 (`KIT3`), 24.5 nautical miles on the mean.
 */
const DELTA_H_NCC = ((229 + 237 - 202 - 215) / 2) * NMI;
/** Where the workshop was to stand at the corrective combination: as far again ahead as it draws away from it to the coelliptic burn, under it by the mean of the two heights between. */
const NCC_AHEAD = NSR_AHEAD + 1.5 * WORKSHOP_RATE * ((DELTA_H_NCC + DELTA_H) / 2) * (NSR - NCC);
/** Where the workshop was to stand at NC2: as far again ahead as it draws away to the corrective combination, the spacecraft on NC2's orbit under it by `DELTA_H_NCC`. */
const NC2_AHEAD = NCC_AHEAD + 1.5 * WORKSHOP_RATE * DELTA_H_NCC * (NCC - NC2);
/** The terminal phase's transfer: 130° of the workshop's travel, the second visit's plan from its terminal phase to its finalisation (33 min 42 s, `KIT3`) on its orbit. */
const TRAVEL = 130;
const PROFILE = `${JSC63400}: NC1 "a horizontal phasing maneuver performed 1.5 revolutions after insertion, at apogee"; "for the nominal M=5 docking NC2 occurred 1.5 revolutions after NC1"; "NCC was executed 0.5 revolutions after NC2"; "NSR was performed 37 minutes after NCC"`;
const NOT_READ = 'This flight’s instant is not in anything read (the mission report, JSC-08414, has not been): worked from the profile';

const SPS_THRUST = assumed(
  21_180 * LBF,
  'Apollo 7 Mission Report (MSC-PA-R-68-15), Table 5.18-I: CSM-101’s calculated steady state, taken for CSM-116’s engine',
);
const SPS_ISP = assumed(314.0, 'Apollo 7 Mission Report (MSC-PA-R-68-15), Table 5.18-I: CSM-101’s, taken');
/** The spacecraft at its separation from the stage, kg (the flight evaluation's ledger: the mass removed from the stage). */
const CSM = doc(13_978, `${FER}, Table 16-5: CSM separated, 13,978 kg (30,817 lb)`);
/** How long a firing of so much impulse takes on the service engine at the spacecraft's mass, s. */
const firing = (dv: number, mass: number) => (mass * G0 * SPS_ISP.value * (1 - Math.exp(-dv / (G0 * SPS_ISP.value)))) / SPS_THRUST.value;

/** The second visit's planned impulses (`KIT3`), ft/s: what a firing this record does not give stands on where guidance cannot solve it. */
const planned = (fps: number, what: string) =>
  estimated(
    fps * FT,
    `${KIT3}: ${what}, ${fps} ft/s planned for the second visit, taken for this one: this flight’s impulse is not in anything read; flown only where guidance finds no solution`,
  );

const rendezvousBurn = (
  id: string,
  label: string,
  on: number,
  engine: 'sps' | 'sm-rcs',
  flown: ReturnType<typeof planned>,
  aim: AttitudeDef,
  toward: Burn['toward'],
  when: string,
): Burn => ({
  id,
  label,
  engine,
  aim,
  on: estimated(on, `${when}. ${NOT_READ}`),
  off: {
    at: estimated(
      on + (engine === 'sps' ? firing(flown.value, CSM.value) : 600),
      'the firing’s end: its planned impulse on the engine at the spacecraft’s mass; guidance cuts it on what it is for',
    ),
    label: `${label} complete`,
  },
  flown,
  ...(toward ? { toward } : {}),
});

const heads = (id: string, label: string) =>
  aimed(
    id,
    label,
    [1, 0, 0],
    `${JSC63400}: "NC1, NC2, NCC, and NSR were executed in a heads-down attitude"; along the motion, the line guidance steers it to taking over`,
  );

/**
 * What NC2 and the corrective combination were for (NC2 "targeted as a height adjustment", NCC "phasing, height, and planar
 * control to clean up trajectory dispersions": `JSC63400`): the workshop where it was to stand at the corrective
 * combination, and at the coelliptic burn, which lays the spacecraft in the workshop's plane where NCC brought it to it.
 */
/** NC1: "a horizontal phasing maneuver" (`JSC63400`), sized to put the workshop where it was to stand at NC2. */
const NC1_FOR: Burn['toward'] = {
  level: {
    ahead: derived(
      NC2_AHEAD,
      'where the workshop stands at NC2: as far again ahead as it draws away to the corrective combination (three halves of its motion times the height between after NC2, 24.5 nautical miles, over the half revolution)',
    ),
  },
  at: estimated(NC2, `NC2’s instant. ${NOT_READ}`),
};

/** NC2: "a horizontal height correction" (`JSC63400`), to the height the corrective combination was to find under the workshop. */
const NC2_FOR: Burn['toward'] = {
  level: {
    above: assumed(
      DELTA_H_NCC,
      `${KIT3}: the second visit's planned orbit after NC2 under its workshop, 24.5 nautical miles on the mean, taken`,
    ),
  },
  at: estimated(NCC, `the corrective combination’s instant. ${NOT_READ}`),
};

const AT_NSR: Burn['toward'] = {
  reach: {
    ahead: derived(
      NSR_AHEAD,
      `where the workshop stands at the coelliptic burn: as far ahead as it then draws away over the coelliptic orbit 10 nautical miles under it (three halves of its motion times the height between, to the terminal phase's instant) to stand ${ELEVATION}° up at the terminal phase (${JSC63400})`,
    ),
    above: doc(DELTA_H, `${JSC63400}: "a coelliptic orbit 10 nm below Skylab"`),
  },
  at: estimated(NSR, `the coelliptic burn’s instant. ${NOT_READ}`),
};

const burns: Burn[] = [
  rendezvousBurn(
    'nc1',
    'NC1 · First phasing',
    NC1,
    'sps',
    planned(221.1, 'Phasing 1 (NC1)'),
    heads('nc1-aim', 'NC1 attitude'),
    NC1_FOR,
    `${PROFILE}: insertion (${FER}, Table 4-7, 596.21 s) and 1.5 revolutions of the insertion orbit’s 89.53 minutes`,
  ),
  rendezvousBurn(
    'nc2',
    'NC2 · Second phasing',
    NC2,
    'sps',
    planned(158.0, 'Phasing 2 (NC2)'),
    heads('nc2-aim', 'NC2 attitude'),
    NC2_FOR,
    `${PROFILE}: 1.5 revolutions of the orbit the second visit planned after NC1, 120 by 208 nautical miles (${KIT3})`,
  ),
  rendezvousBurn(
    'ncc',
    'NCC · Corrective combination',
    NCC,
    'sps',
    planned(29.6, 'Corrective combination (NCC)'),
    heads('ncc-aim', 'NCC attitude'),
    AT_NSR,
    `${PROFILE}: half a revolution of the orbit the second visit planned after NC2, 202 by 215 nautical miles (${KIT3})`,
  ),
  rendezvousBurn(
    'nsr',
    'NSR · Coelliptic',
    NSR,
    'sps',
    planned(19.2, 'Coelliptic (NSR)'),
    heads('nsr-aim', 'NSR attitude'),
    { coelliptic: true, planar: true },
    PROFILE,
  ),
  {
    ...rendezvousBurn(
      'tpi',
      'TPI · Terminal phase initiation',
      TPI,
      'sps',
      planned(20.9, 'Terminal phase initiate (TPI)'),
      aimed(
        'tpi-aim',
        'TPI attitude',
        [1, 0, 0.5],
        'on the line of sight to the workshop, about 27° up: the line guidance steers it to taking over',
      ),
      {
        elevation: {
          angle: doc(ELEVATION, `${JSC63400}: TPI "at an elevation angle of 27 degrees and a range of ~22 nm"`),
          travel: derived(
            TRAVEL,
            `the second visit's planned terminal phase, 7:12:22 to 7:46:04 (${KIT3}), on the workshop's orbit of 93.3 minutes`,
          ),
          window: doc(600, `${JSC63400}: "The maximum TIG slip for TPI was +/-10 minutes"`),
        },
      },
      'the record’s',
    ),
    on: doc(TPI, `${DEBRIEF}: Kerwin, "The final burn time was 7034760"; Conrad, prelaunch 7:02:56, "so we were 1 minute late"`),
  },
  {
    ...rendezvousBurn(
      'braking',
      'Braking and station-keeping',
      RENDEZVOUS - 600,
      'sm-rcs',
      planned(27.3, 'Terminal phase finalize (TPF)'),
      aimed(
        'braking-aim',
        'Braking',
        [-1, 0, 0],
        'nose on the workshop, braking against the closing: the thrust is commanded on the workshop',
      ),
      {
        station: {
          ahead: estimated(
            -100 * FT,
            'the workshop behind, a hundred feet off its docking port, which faced along the motion at docking (JSC-63400: "the axial port was facing generally in the direction of flight"): chosen',
          ),
          above: estimated(0, 'level with it: chosen'),
        },
        until: doc(SOFT_DOCK, `${SEQUENCE}: "SOFT DOCK 21:15"`),
      },
      'ten minutes of braking to the rendezvous',
    ),
    off: { at: doc(RENDEZVOUS, `${SEQUENCE}: "RENDEZVOUS 13:00 - 20:37"`), label: 'Station-keeping on the workshop' },
  },
  {
    id: 'shaping',
    label: 'SPS · First deorbit firing',
    engine: 'sps',
    aim: aimed(
      'shaping-aim',
      'First deorbit firing',
      [-1, 0, 0],
      `${KIT12}: "the first of which will lower CSM perigee to 166 km": against the motion, chosen`,
    ),
    on: doc(SHAPING, `${AA}, 22 June: "initial service propulsion system firing at 6:05 am EDT"`),
    off: {
      at: estimated(SHAPING + firing(258.5 * FT, CSM.value - 1_000), 'its planned impulse on the engine'),
      label: 'First deorbit firing complete',
    },
    flown: planned(258.5, 'Shaping burn'),
  },
  {
    id: 'deorbit',
    label: 'SPS · Deorbit',
    engine: 'sps',
    aim: aimed('deorbit-aim', 'Deorbit', [-1, 0, 0], 'against the motion: the line is not in anything read, chosen'),
    on: doc(DEORBIT, `${AA}, 22 June: "a final deorbit maneuver at 9:11 am EDT"`),
    off: {
      at: estimated(DEORBIT + firing(191.9 * FT, CSM.value - 1_400), 'its planned impulse on the engine'),
      label: 'Deorbit firing complete',
    },
    flown: planned(191.9, 'Deorbit burn'),
  },
];

/** The command module at the entry and down: CM-117's, the second visit's, as JSC-08662's Table D-I has it. */
const CM_ENTRY = assumed(5_932, `${JSC08662}, Table D-I: CM-117 at the entry interface, 5,932 kg, taken for CM-116`);
const CM_DROGUE = assumed(5_744, `${JSC08662}, Table D-I: CM-117 at drogue mortar firing, 5,744 kg, taken for CM-116`);
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
    value: 7865.54,
    unit: 'm/s',
    tolerance: 40,
    of: 'ascent',
    confidence: 'documented',
    source: `${FER}, Table 4-2, guidance cutoff signal, space-fixed velocity`,
  },
  {
    id: 'inclination',
    label: 'Insertion inclination',
    value: 50.03,
    unit: '°',
    tolerance: 0.25,
    of: 'ascent',
    confidence: 'documented',
    source: `${FER}, Table 4-7`,
  },
  {
    id: 'perigee',
    label: 'Perigee at insertion',
    value: 149_990,
    unit: 'm',
    tolerance: 6_000,
    of: 'ascent',
    confidence: 'documented',
    source: `${FER}, Table 4-7`,
  },
  {
    id: 'apogee',
    label: 'Apogee at insertion',
    value: 352_070,
    unit: 'm',
    tolerance: 15_000,
    of: 'ascent',
    confidence: 'documented',
    source: `${FER}, Table 4-7`,
  },
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
    source: 'NASA Historical Data Book, volume III, table 2-49: 28 days 0 h 49 min 49 s',
  },
];

export const orbital: SaturnIBRecord = {
  label: 'Saturn IB SA-206 with CSM-116',
  liftoff: doc(586_342, `${MASSES}: first flight stage at first motion`),
  sib: {
    mass: doc(448_520, `${FER}, Table 16-1: the first stage with the S-IB/S-IVB interstage and the retrorockets at first motion`),
    spent: doc(43_015 + 3_054, `${FER}, Table 16-5: S-IB stage at separation, 43,015 kg, and the interstage, 3,054 kg`),
    propellant: {
      load: derived(
        445_465 - 43_015,
        `${FER}, Tables 16-1 and 16-5: the S-IB at first motion less at separation: everything it burned, vented and lost`,
      ),
    },
    h1: {
      thrust: {
        seaLevel: doc(203_563 * LBF, `${FER}, Table 6-2: the eight H-1s' average thrust reduced to standard sea level, 203,563 lbf`),
        vacuum: derived(
          (203_563 * LBF * 295) / 258.2,
          `the sea-level figure at the vacuum specific impulse over the sea-level one, at the same flow; the rise in specific impulse AS-205's (Results of the Fifth Saturn IB Launch Vehicle Test Flight, MPR-SAT-FE-68-4, Fig. 8-2 and Table 8-II: about 295 s against 258.2 s), taken`,
        ),
      },
      isp: {
        seaLevel: doc(262.08, `${FER}, Table 6-2: average, reduced to standard sea level`),
        vacuum: assumed(
          (262.08 * 295) / 258.2,
          'the standard sea-level figure raised as AS-205’s rose (MPR-SAT-FE-68-4, Fig. 8-2 and Table 8-II), taken',
        ),
      },
    },
    inboardCut: doc(138.66, `${EVENTS}, item 47`),
    outboardCut: doc(OECO, `${EVENTS}, item 53`),
    separation: doc(SEPARATION_SIB, `${EVENTS}, item 66, physical separation`),
    push: estimated(1.5, 'combined first-stage retrorocket and second-stage ullage separation model, as Apollo 7’s'),
  },
  sivb: {
    mass: doc(
      115_954 + 1_930 + 1_799,
      `${MASSES}: the S-IVB stage, 115,954 kg, the instrument unit, 1,930 kg, and the spacecraft adapter, 1,799 kg, at first motion`,
    ),
    propellant: {
      load: doc(
        (193_931 + 38_307) * LB,
        `${FER}, Table 7-2 and §7.5: best estimate at liftoff, 193,931 lbm of oxygen and 38,307 lbm of hydrogen`,
      ),
      usable: derived(
        (193_931 + 38_307 - 2_873 - 2_223 + 6.24 * 444) * LB,
        `${FER}, Table 7-2 and §7.5: the load less the best estimate at cutoff (2,873 lbm of oxygen and 2,223 of hydrogen), and back the 6.24 s more it could have burned to the oxygen's depletion at the low mixture ratio's 444 lbm/s (Fig. 7-2)`,
      ),
    },
    j2: {
      thrust: doc(227_832 * LBF, `${FER}, Table 7-1: reconstructed at STDV open +60 s, standard altitude, the 5.5 mixture ratio`),
      isp: doc(423.6, `${FER}, Table 7-1`),
      shift: {
        at: doc(470.4, `${EVENTS}, item 93: mixture ratio control valve open (4.8:1 EMR)`),
        before: doc(1, `${FER}, Table 7-1`),
        after: estimated(196_500 / 227_832, `${FER}, Fig. 7-2: the thrust at the 4.8 mixture ratio read off the figure, about 196,500 lbf`),
      },
      starts: `${FER}, §7: one J-2 burn of 440.4 s`,
    },
    ignition: doc(ESC, `${EVENTS}, item 67: engine start command`),
    cutoff: doc(GCS, `${EVENTS}, item 97: guidance cutoff signal`),
  },
  les: {
    mass: doc(4_159, `${FER}, Table 16-5: launch escape system, 4,159 kg`),
    at: estimated(
      ESC + (171 - 143),
      `${KIT12}, SL-2 launch events: the tower planned to go 28 s after the S-IVB's ignition (0:02:23 and 0:02:51), on this flight's ignition; its instant is not in the flight evaluation`,
    ),
    motor: {
      thrust: assumed(33_000 * LBF, 'Apollo 7 press kit, p. 25, tower jettison motor: the type’s'),
      burn: assumed(1.1, 'Apollo Spacecraft News Reference, launch escape subsystem, burn slightly longer than one second'),
    },
    escape: escapeEngine,
  },
  csm: {
    sm: derived(CSM.value - 6_085, `${CSM.source}, less CM-117’s launch weight, 6,085 kg (${JSC08662}, Table 7-IV), taken for CM-116`),
    cm: {
      label: 'Command module 116',
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
        source: 'Apollo 7 Entry Postflight Analysis (NTRS 19740072689), Table IIa: CM-101’s lift over drag in its entry, taken for CM-116',
      },
      trim: assumed(20, 'Apollo 7 Mission Report, Fig. 5.2-1, trim about 160 deg angle of attack: CM-101’s, taken'),
    },
    shield: derived(
      CM_ENTRY.value - CM_DROGUE.value,
      `CM-117 at the entry interface less at drogue mortar firing (${JSC08662}, Table D-I): the forward heat shield with what the module spent between, taken`,
    ),
    sps: {
      thrust: SPS_THRUST,
      isp: SPS_ISP,
      starts: derived(
        7,
        `five rendezvous firings (${JSC63400}: "Conserve RCS propellant by using the SPS for all burns before the mid-course burns") and the two deorbit firings (${AA})`,
      ),
      load: estimated(
        2_200,
        'kg: enough for the seven firings with the type’s reserve; the load is not in anything read (the Skylab handbook gives the sump tanks’ capacity only)',
      ),
      deltaV: planned(191.9, 'Deorbit burn'),
    },
    separation: {
      at: doc(CSM_SEPARATION, `${FER}, Table 4-4, S-IVB/CSM separation`),
      push: doc(3 * FT, `${JSC63400}: "The CSM separated from the S-IVB with a 3 foot/second posigrade burn"`),
    },
    modules: {
      at: estimated(PARTED, `5 min after the deorbit firing’s command: ${APOLLO7} (259:39:28 to 259:43:33.8, from the cutoff), rounded`),
      after: CM_ENTRY,
      leaves: assumed(
        12_402 - 5_932,
        `${JSC08662}, Table D-I: CSM-117 at CM/SM separation, 12,402 kg, less its command module at the entry interface, taken for SM-116`,
      ),
      push: derived(27.5 * FT, 'Apollo 7 Mission Report §3.4, reconstructed 25–30 ft/s posigrade: the type’s'),
    },
  },
  burns,
  entry: {
    parting: skylabEntry(
      { latitude: doc(24.75, LANDED), longitude: doc(-(127 + 2 / 60), LANDED) },
      `the steered entry, the landing taken for its target: ${LANDED}`,
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
      wait: assumed(1.6, 'Apollo 7 Mission Report §5.5: the forward heat shield jettisoned 1.6 s before the drogue mortars fired'),
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
      azimuth: doc(47.58, `${FER}, §4.1: "a roll maneuver ... placed the vehicle on a flight azimuth of 47.580 degrees east of north"`),
      vertical: doc(10.029, `${FER}, §9.3.1: "The roll and time-tilt pitch maneuver was begun at 10.029 seconds"`),
      kick: derived(131.144 - 10.029, `${FER}, §9.3.1: the pitch time-tilt "arrested at 131.144 seconds"`),
      roll: {
        points: [
          [0, -(90 - 47.58)],
          [10.029, -(90 - 47.58)],
          [54.8, 0],
        ],
        confidence: 'derived',
        source: `${FER}, §4.1 and §9.3.1: launched on an azimuth of 90°, rolled to the flight azimuth of 47.58° from 10.029 s, "completed (roll gimbal angle within 0.5 degree of zero) 54.8 seconds"; evenly between`,
      },
      programme: {
        points: [
          [0, 0],
          [10.029, 0],
          [24, 10],
          [46, 20],
          [60, 30],
          [77, 40],
          [91, 50],
          [111, 60],
          [131.144, 63.3237],
        ],
        confidence: 'estimated',
        source: `${FER}, Fig. 9-2 (the LVDC's pitch attitude, read off the figure), its end documented (§9.3.1: arrested at 131.144 s "with Pitch Attitude Command = -63.3237 degrees"); flown open and held from its end to the J-2's start, as Apollo 7's`,
      },
      turn: doc(ESC, `${EVENTS}, item 67: the S-IVB's power phase flown on the law's closed loop from its start`),
      target: {
        at: 'sivb-cutoff',
        altitude: doc(158_370, `${FER}, Table 4-2: 158.37 km at the guidance cutoff signal, a geodetic height`),
        over: 'ellipsoid',
        climb: doc(-0.007, `${FER}, Table 4-2: space-fixed flight path angle at cutoff`),
        inclination: doc(50.03, `${FER}, Table 4-7`),
      },
    },
    source: `${FER}, §§4, 9 and Tables 4-2 and 4-7`,
    drag: [
      {
        until: doc(GCS, `${EVENTS}, item 97`),
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
    area: derived(
      CSM_OUTSIDE / 4,
      'a quarter of the outside of the command and service modules (Cauchy), as Apollo 7’s: the ship was turned for each firing and alignment and drifted alone through the docked stay, and how it lay is not told apart',
    ),
    length: assumed(154 * 0.0254, 'Apollo 7 press kit p.25, CM diameter: the type’s'),
  },
  target: workshopTarget(
    { fix: WORKSHOP },
    '1973-05-25T13:00:00Z',
    doc(74_773, `${JSC08662}, Table D-I: the Saturn Workshop "at first docking", 74,773 kg`),
  ),
  orbit: {
    radius: derived(
      6_378_088,
      `the ball the flight evaluation's heights are over: the insertion's place (${FER}, Table 4-7: 158.52 km geodetic at 39.271° N, 6,528.08 km from the Earth's centre on WGS 84) less the perigee there, 149.99 km, the flight path 0.011°: its equatorial radius, to the table's rounding`,
    ),
    perigee: doc(149_990, `${FER}, Table 4-7`),
    apogee: doc(352_070, `${FER}, Table 4-7`),
    inclination: doc(50.03, `${FER}, Table 4-7`),
    period: doc(89.53 * 60, `${FER}, Table 4-7`),
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
        (1782.73 / 6371) * (180 / Math.PI) + ((7.87 * (INSERTION - GCS)) / 6371) * (180 / Math.PI),
        `${FER}, Table 4-2: the surface range at cutoff, 1,782.73 km, and the ten seconds to insertion at its speed, over the Earth's mean radius`,
      ),
      anomaly: estimated(0, 'insertion near perigee (flight path angle 0.011°, Table 4-7)'),
    },
  },
  marks: [
    mark('insertion', 'Orbital insertion', INSERTION, `${FER}, Table 4-7`),
    mark('sivb-impact', 'S-IVB impact in the Pacific', 21_607, `${EVENTS}, item 145`),
    mark('rendezvous', 'Rendezvous: station-keeping, then the flyaround', RENDEZVOUS, SEQUENCE),
    mark('soft-dock', 'First soft dock', SOFT_DOCK, SEQUENCE),
    mark('seva', 'Stand-up EVA: Weitz in the hatch to free the solar wing', utc('1973-05-25T23:52:00'), SEQUENCE),
    mark('seva-end', 'Stand-up EVA ends', utc('1973-05-26T00:25:00'), SEQUENCE),
    mark(
      'capture-fails',
      'Capture latches fail to engage: docking attempts',
      utc('1973-05-26T00:25:00'),
      `${SEQUENCE}: "UNSUCCESSFUL HARD DOCKING ATTEMPTS 00:25 - 02:13"; ${JSC63400}: "Eight docking attempts had been performed"`,
    ),
    mark(
      'capture-fails-end',
      'Last failed docking attempt; the probe worked on through the open tunnel',
      utc('1973-05-26T02:13:00'),
      SEQUENCE,
    ),
    mark('hard-dock', 'Hard dock', HARD_DOCK, SEQUENCE),
    mark('workshop-entry', 'The crew enters the workshop', utc('1973-05-26T16:30:00'), SEQUENCE),
    mark(
      'undocking',
      'Undocking and flyaround',
      UNDOCK,
      `${SEQUENCE}; ${AA}, 22 June: "undocked the CSM from the Skylab Workshop at 4:55 am EDT"`,
    ),
    mark('separation', 'Separation from the workshop', utc('1973-06-22T09:40:00'), `${AA}, 22 June: the separation at 5:40 am EDT`),
    {
      id: 'entry-interface',
      label: 'Entry interface · 400,000 ft',
      at: estimated(INTERFACE, `9 min 53 s after the modules part: ${APOLLO7}`),
    },
    { ...mark('splashdown', 'Splashdown', SPLASH, 'NASA Historical Data Book, volume III, table 2-49'), lands: 'cm' },
  ],
  mission: {
    manoeuvreTurn: estimated(30, 'Display slew into the burn directions; exact attitude timeline unavailable'),
    entryInterface: assumed(400_000 * FT, 'Apollo 7 Mission Report, Table 3-VI: the type’s'),
    landing: {
      at: doc(SPLASH, 'NASA Historical Data Book, volume III, table 2-49'),
      latitude: doc(24.75, LANDED),
      longitude: doc(-(127 + 2 / 60), LANDED),
      near: 'the Pacific southwest of San Diego, near USS Ticonderoga',
    },
    ground: doc(0, 'the Pacific'),
    supplies: doc(28, `${KIT12}: the first crew "for up to 28 days"`),
    manual: { parting: estimated(PARTED - DEORBIT, 'coast from the deorbit firing’s command to the modules’ parting, as above') },
    automatic: 'The Earth landing sequence ran automatically. The computer flew the entry on its targeting; the crew watched.',
  },
  checks,
  coastFixes: [
    fix(`${FER}, Table 4-4, S-IB/S-IVB separation`, [SEPARATION_SIB, 29.036, -80.102, 59.34, 2326.16, 23.68, 55.244]),
    fix(`${FER}, Table 4-7, orbit insertion`, [INSERTION, 39.271, -65.053, 158.52, 7873.35, 0.011, 55.855]),
    fix(`${FER}, Table 4-4, S-IVB/CSM separation`, [CSM_SEPARATION, 49.265, -34.125, 172.32, 7859.32, 0.387, 78.86]),
  ],
  aborts: skylabAborts(
    estimated(ESC + (171 - 143), 'the tower’s jettison, as above'),
    doc(INSERTION, `${FER}, Table 4-7`),
    derived(CSM.value, 'the spacecraft at first motion: its mass at separation, consumables in the climb not taken off'),
    {
      second: assumed(9 * 60 + 33, 'Apollo 7 press kit (68-168K), p. 24: the planned Mode II boundary, the type’s'),
      orbit: {
        from: assumed(9 * 60 + 27, 'Apollo 7 press kit (68-168K), p. 24: the abort-to-orbit opening, the type’s'),
        perigee: doc(150_000, `${KIT12}: the CSM "launched into an initial 150 x 222.2-km ... orbit"`),
      },
    },
  ),
};

export const skylab2Plan: FlightPlan = saturnIBPlan(orbital);

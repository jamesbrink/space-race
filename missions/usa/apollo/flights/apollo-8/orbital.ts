/**
 * Apollo 8 as its records have it, from Pad 39A to the Pacific: SA-503 through the translunar injection and CSM-103 on to
 * the Moon, ten revolutions about it and home, the record the plan is written from (vehicles/apollo-lunar-plan.ts
 * `apolloLunarPlan`). All times are range time, s from range zero (12:51:00 UT). The launch vehicle's figures are MSFC's
 * flight evaluation's (MPR-SAT-FE-69-1): its event times (Table 2-2), its trajectory at each event (Tables 4-2 to 4-7),
 * its engines' reconstructed performance (Tables 5-2, 6-2, 7-2, 7-7) and its mass at each event (Tables 21-1 to 21-9,
 * read off the page). Where AS-503's report has no figure, Apollo 11's record is taken and says so. The spacecraft's are
 * the Mission Report's (MSC-PA-R-69-1): its sequence of events (Table 3-I), the trajectory at each manoeuvre and what each
 * reached (Tables 5-II to 5-V, §§5.3 to 5.8), the guidance's account of each firing (Table 6.9-II) and of the entry
 * (§6.9.1, Table 6.9-III), the service propulsion system's (Table 6.11-I, §6.11.2) and the mass at each phase (Table
 * A.6-I). What is read, what disagrees and what is estimated is in mission.md beside this file.
 */
import { assumed, derived, doc, estimated } from '../../../../../src/measure.ts';
import type { AttitudeDef, OrbitFix, PlanCheck } from '../../../../../src/sim/plan.ts';
import type { ApolloLunarRecord } from '../../vehicles/apollo-lunar-record.ts';
import { cmEntryAero } from '../../vehicles/command-module-aero.ts';
import { localAim } from '../../vehicles/csm-plan.ts';
import type { Burn } from '../../vehicles/csm-record.ts';

const IN = 0.0254;
const FT = 12 * IN;
const LB = 0.45359237;
const LBF = 4.448221615;
const NMI = 1852;
const G0 = 9.80665;
const T = (hours: number, minutes: number, seconds: number) => hours * 3600 + minutes * 60 + seconds;
const EVAL = 'Saturn V Launch Vehicle Flight Evaluation Report AS-503, Apollo 8 Mission (MSFC, MPR-SAT-FE-69-1, 20 February 1969)';
const EVENTS = `${EVAL}, Table 2-2, actual range time`;
const MASS = `${EVAL}, Tables 21-1 to 21-9 (actual, kg)`;
const MR = 'Apollo 8 Mission Report (MSC-PA-R-69-1, February 1969)';
const KIT = 'NASA Apollo 8 press kit (release 68-208, 15 December 1968)';
const SEQUENCE = `${MR}, Table 3-I, sequence of events`;
const MASSES = `${MR}, Table A.6-I, spacecraft mass properties`;
const MANOEUVRES = `${MR}, Table 6.9-II, guidance and control maneuver summary`;
const AFJ =
  'Apollo 8 Flight Journal, day 1: separation and the evasive manoeuvres (apollojournals.org, ap08fj/03day1_green_sep.html), the air-to-ground transcript';
const AS506 = 'AS-506’s flight evaluation (MSFC, MPR-SAT-FE-69-9), as Apollo 11’s record (apollo-11/orbital.ts) reads it';

/** The F-1s' mainstage propellant (Table 21-9) over the engine-seconds the run burns them from range zero: one engine's flow, kg/s. */
const F1_FLOW = 1_957_147 / (125.93 + 4 * 153.82);
/** Table 5-2: the five F-1s' sea-level specific impulse as reconstructed, N s/kg, their mean. */
const F1_ISP = (2584 + 2578 + 2592 + 2587 + 2601) / 5;
/** The S-II's outboard J-2s at ESC+61 s (Table 6-2, engines 1 to 4, reconstructed): thrust, N, and impulse, N s/kg, their means. */
const SII_THRUST = (1_021_276 + 1_010_858 + 1_000_908 + 1_020_102) / 4;
const SII_ISP = (4161.9 + 4157.0 + 4155.1 + 4159.0) / 4;
/** §6.3: the stage's thrust after the step to the low mixture ratio, N, and the change it made. */
const SII_LOW = 3_877_101;
const SII_STEP = 1_209_777;
/** The S-IVB's second burn: the flow at the null mixture ratio (Table 7-7), kg/s, and its instants (Table 2-2, §7.9), s. */
const SECOND_FLOW = 177.7 + 36.01;
const SECOND_SHIFT = 10_242.49;
const SECOND_MAINSTAGE = 10_240.02;
const SECOND_CUT = 10_555.51;

const fix = (
  source: string,
  at: number,
  latitude: number,
  longitude: number,
  altitude: number,
  speed: number,
  climb: number,
  heading: number,
): OrbitFix => ({
  at: doc(at, source),
  latitude: doc(latitude, source),
  longitude: doc(longitude, source),
  altitude: doc(altitude * 1000, source),
  speed: doc(speed, source),
  climb: doc(climb, source),
  heading: doc(heading, source),
});

/** A state of the Mission Report's Table 5-II or 5-V: its altitude in nautical miles and its speed in ft/s. */
const fixNmi = (
  source: string,
  at: number,
  latitude: number,
  longitude: number,
  altitude: number,
  speed: number,
  climb: number,
  heading: number,
): OrbitFix => fix(source, at, latitude, longitude, (altitude * NMI) / 1000, speed * FT, climb, heading);

const check = (id: string, label: string, value: number, unit: string, tolerance: number, source: string): PlanCheck => ({
  id,
  label,
  value,
  unit,
  tolerance,
  of: 'ascent',
  confidence: 'documented',
  source,
});

const CUTOFFS = `${EVAL}, Table 4-3, actual`;
const SEPARATIONS = `${EVAL}, Table 4-4, actual`;

/** The spacecraft at liftoff, kg (the record's `csm.mass`, as the launch vehicle's evaluation has it). */
const CSM_LIFTOFF = 28_816 + 6;
/** Table A.6-I, lb: the command module after the modules parted, at the entry interface and at drogue deployment; the two modules just before. */
const CM_AFTER = 12_179;
const CM_INTERFACE = 12_171;
const CM_DROGUE = 11_712;
const MODULES_BEFORE = 31_768;
/** The entry interface, Table 3-I and Table 5-V: 146:46:12.8. */
const INTERFACE = T(146, 46, 12.8);
const DROGUE = T(146, 54, 47.8);
const SPLASH = T(147, 0, 42);
/** Half the period of a 168.5 by 60.0 n. mi. orbit about the Moon (1,738 km, GM 4,902.8 km³/s²), s. */
const LOI_HALF_PERIOD = Math.PI * Math.sqrt((1_738_000 + ((168.5 + 60.0) / 2) * NMI) ** 3 / 4.9028e12);
const CMC_PROGRAM =
  'Colossus 2A (Comanche 055, Apollo 11) flight program listing, REENTRY CONTROL, pp. 844 to 881: taken for Colossus 237, the program Apollo 8 flew (the Mission Report, §6.9.2), whose own listing has not been compared';
const NOT_PLACED =
  'the record’s own components (Table 6.9-II) are in the guidance platform’s axes, which are not placed here: the line of a burn guidance does not solve';

/**
 * The firings after the injection, as the Mission Report has them, in the order flown: the two separation manoeuvres
 * with the service module's thrusters (§5.3: the second because the spacecraft was not drawing away from the S-IVB as the
 * crew expected), the two midcourse corrections that were needed of the four planned (§5.4), the lunar orbit's insertion
 * and circularization (§5.5), the transearth injection (§5.6) and the one correction of the three planned on the way home
 * (§5.7, which the report calls the third midcourse correction). Each lights at the record's instant; each but the
 * separations is solved as it lights for what it reached on the day (`toward`: what each was aimed at is given only in
 * words, "about 65 n. mi." for the corrections, §3), and its impulse is a check.
 */
const burns: Burn[] = [
  {
    id: 'separation-1',
    label: 'First separation manoeuvre',
    engine: 'sm-rcs',
    aim: localAim(
      'separation-1-aim',
      'First separation manoeuvre',
      [0, 0, 1],
      `estimated: ${AFJ}, 003:44:28: "Delta-VX minus 00011", the thrust along the spacecraft's minus X with its plus X toward the Earth, which is radially upward; the attitude's reference is not placed, so taken as the second manoeuvre's`,
    ),
    on: doc(T(3, 40, 1), SEQUENCE),
    off: {
      at: estimated(
        T(3, 40, 1) + 11,
        'eleven seconds: 1.1 ft/s on two 100 lbf thrusters at the spacecraft’s mass; the firing’s length is not in the report',
      ),
      label: 'First separation manoeuvre complete',
    },
    flown: doc(1.1 * FT, `${MR}, §5.3: "a 1.1-ft/sec separation maneuver"`),
    massAtIgnition: doc(63_524 * LB, `${MASSES}, spacecraft/S-IVB separation`),
  },
  {
    id: 'separation-2',
    label: 'Second separation manoeuvre',
    engine: 'sm-rcs',
    aim: localAim(
      'separation-2-aim',
      'Second separation manoeuvre',
      [0, 0, 1],
      `${AFJ}, 004:37:22 and 004:39:22: "burn radially upward at 8 feet per second", "for trajectory reasons"`,
    ),
    on: doc(T(4, 45, 1), SEQUENCE),
    off: {
      at: estimated(
        T(4, 45, 1) + 76,
        'seventy-six seconds: 7.7 ft/s on two 100 lbf thrusters at the spacecraft’s mass; the firing’s length is not in the report',
      ),
      label: 'Second separation manoeuvre complete',
    },
    flown: doc(7.7 * FT, `${MR}, §5.3: "an additional separation maneuver (7.7 ft/sec)"; ${AFJ}, 004:45:54: "7.7 plus-X"`),
    massAtIgnition: doc(63_524 * LB, `${MASSES}, spacecraft/S-IVB separation`),
  },
  {
    id: 'mcc-1',
    label: 'First midcourse correction',
    engine: 'sps',
    aim: localAim('mcc-1-aim', 'First midcourse correction', [1, 0, 0], `estimated: along the motion; ${NOT_PLACED}`),
    on: doc(T(10, 59, 59.5), SEQUENCE),
    off: { at: doc(T(11, 0, 1.9), SEQUENCE), label: 'First midcourse correction cutoff' },
    flown: doc(
      20.4 * FT,
      `${MR}, §5.4: 24.8 ft/s calculated, "a velocity change of only 20.4 ft/sec was achieved because the thrust was less than expected"`,
    ),
    firingTime: doc(2.4, MANOEUVRES),
    massAtIgnition: doc(63_307 * LB, `${MASSES}, first midcourse correction`),
    toward: {
      pericynthion: {
        height: doc(
          66.3 * NMI,
          `${MR}, Table 5-III: the pericynthion solution after it, 66.3 n. mi., taken as what it was aimed at (§3 gives the aim only as "the desired altitude of about 65 n. mi.")`,
        ),
        at: doc(T(69, 10, 40), `${MR}, Table 5-III: its time of nearest approach, 69:10:40`),
        inclination: derived(
          180 - 12,
          `${KIT}, lunar parking orbit: "The lunar parking orbit will have an inclination of 12 degrees to the lunar equator", the plan's, flown westward over the near side (${MR}, Table 5-II: the selenographic longitude falling through the insertion), so retrograde: taken as what the first correction aimed the approach's plane at`,
        ),
      },
    },
  },
  {
    id: 'mcc-2',
    label: 'Second midcourse correction',
    engine: 'sm-rcs',
    aim: localAim('mcc-2-aim', 'Second midcourse correction', [1, 0, 0], `estimated: along the motion; ${NOT_PLACED}`),
    on: doc(T(60, 59, 55.9), MANOEUVRES),
    off: { at: doc(T(61, 0, 7.8), MANOEUVRES), label: 'Second midcourse correction complete' },
    flown: doc(1.4 * FT, `${MR}, §5.4: "a 1.4-ft/sec, 11.8-second reaction control maneuver"`),
    massAtIgnition: doc(62_845 * LB, `${MASSES}, second midcourse correction`),
    toward: {
      pericynthion: {
        height: doc(
          65.8 * NMI,
          `${MR}, Table 5-III: the pericynthion solution after it, 65.8 n. mi., taken as what it was aimed at (§3: "to further refine the initial conditions"; the plane is the first correction's, and this one the least impulse that gives the height and the time)`,
        ),
        at: doc(T(69, 10, 39), `${MR}, Table 5-III: its time of nearest approach, 69:10:39`),
      },
    },
  },
  {
    id: 'loi',
    label: 'Lunar orbit insertion',
    engine: 'sps',
    aim: localAim('loi-aim', 'Lunar orbit insertion', [-1, 0, 0], `estimated: against the motion, as an insertion is; ${NOT_PLACED}`),
    on: doc(T(69, 8, 20.4), SEQUENCE),
    off: { at: doc(T(69, 12, 27.3), SEQUENCE), label: 'Lunar orbit insertion cutoff' },
    flown: doc(2997 * FT, `${MR}, §5.5: "A 2997-ft/sec, 246.9-second service propulsion maneuver"`),
    massAtIgnition: doc(62_827 * LB, `${MASSES}, lunar orbit insertion`),
    toward: {
      orbit: {
        apoapsis: doc(
          168.5 * NMI,
          `${MR}, §5.5: "placed the spacecraft in a lunar orbit of 168.5 by 60.0 n. mi. to achieve the desired velocity change"`,
        ),
        periapsis: doc(60.0 * NMI, `${MR}, §5.5`),
      },
    },
  },
  {
    id: 'loc',
    label: 'Lunar orbit circularization',
    engine: 'sps',
    aim: localAim('loc-aim', 'Lunar orbit circularization', [-1, 0, 0], `estimated: against the motion; ${NOT_PLACED}`),
    on: doc(T(73, 35, 6.6), MANOEUVRES),
    off: { at: doc(T(73, 35, 16.2), MANOEUVRES), label: 'Lunar orbit circularization cutoff' },
    flown: doc(
      134.8 * FT,
      `${MR}, §5.5: "The firing time and the resultant velocity change ... were 9.6 seconds and 134.8 ft/sec" (§3 rounds it to 135)`,
    ),
    massAtIgnition: doc(46_716 * LB, `${MASSES}, lunar orbit circularization`),
    toward: {
      orbit: {
        apoapsis: doc(60.7 * NMI, `${MR}, §5.5: "circularized to 60.7 by 59.7 n. mi."`),
        periapsis: doc(59.7 * NMI, `${MR}, §5.5`),
        lit: {
          at: 'periapsis',
          window: derived(
            LOI_HALF_PERIOD,
            `s: half a revolution of the orbit the insertion left it on (${MR}, §5.5: 168.5 by 60.0 n. mi.) about the Moon's mean sphere, either side of the record's lighting, which was at the periapsis (Table 5-II: 59.3 n. mi. up and level, -0.03 degree); §3: "after approximately 4 hours of navigation checks"`,
          ),
        },
      },
    },
  },
  {
    id: 'tei',
    label: 'Transearth injection',
    engine: 'sps',
    aim: localAim('tei-aim', 'Transearth injection', [1, 0, 0], `estimated: along the motion, as an injection is; ${NOT_PLACED}`),
    on: doc(T(89, 19, 16.6), SEQUENCE),
    off: { at: doc(T(89, 22, 40.3), SEQUENCE), label: 'Transearth injection cutoff' },
    flown: doc(
      3519 * FT,
      `${MR}, §5.6: "The required velocity change of 3519 ft/sec was achieved in 203.7 seconds; however, the reaction control plus X translation added an additional 3.5 ft/sec" (§3: 3517)`,
    ),
    massAtIgnition: doc(45_931 * LB, `${MASSES}, transearth injection`),
    toward: {
      entry: {
        flightPathAngle: doc(
          -6.117,
          `${MR}, Table 5-IV: the entry interface conditions the transearth injection left it on, -6.117 degrees, taken as what it was aimed at`,
        ),
        height: doc(400_000 * FT, `${MR}, Table 5-V: the entry interface, 400 000 feet`),
        at: estimated(
          INTERFACE,
          `${MR}, Table 3-I: the instant it came through the interface, 146:46:12.8, taken for the one the injection was aimed at, which the report does not give (§5.8: the interface's speed and angle within 1 ft/s and 0.02 degree of the plan's)`,
        ),
      },
    },
  },
  {
    id: 'mcc-3',
    label: 'Third midcourse correction',
    engine: 'sm-rcs',
    aim: localAim(
      'mcc-3-aim',
      'Third midcourse correction',
      [-1, 0, 0],
      `${MR}, §5.7: "to decrease the inertial velocity by 4.8 ft/sec": against the motion`,
    ),
    on: doc(T(103, 59, 54), SEQUENCE),
    off: { at: doc(T(104, 0, 8), `${MR}, Table 5-II, third midcourse correction cutoff`), label: 'Third midcourse correction complete' },
    flown: doc(4.8 * FT, `${MR}, §5.7`),
    massAtIgnition: doc(32_008 * LB, `${MASSES}, third midcourse correction`),
    toward: {
      entry: {
        flightPathAngle: doc(
          -6.395,
          `${MR}, Table 5-IV: the entry interface conditions the third midcourse correction left it on, -6.395 degrees, taken as what it was aimed at`,
        ),
        height: doc(400_000 * FT, `${MR}, Table 5-V: the entry interface, 400 000 feet`),
        at: estimated(
          INTERFACE,
          `${MR}, Table 3-I: the instant it came through the interface, 146:46:12.8, taken for the one the correction was aimed at`,
        ),
      },
    },
  },
];

/**
 * The entry, steered to the computer's target (sim/entry.ts) from the interface by the command module computer, as Apollo
 * 8's was (§6.9.1: "Entry was performed under automatic control"; P63 at the interface, P64 after 0.05 g, constant drag
 * and then straight to P67, the final phase). The record's commanded bank (Fig. 6.9-10) is not flown: what it shows of
 * the entry is held as checks.
 */
const entry: AttitudeDef = {
  id: 'entry-steered',
  label: 'Entry',
  source: `${MR}, §5.8 and §6.9.1, entry`,
  hold: {
    entry: {
      target: {
        latitude: doc(8.133, `${MR}, Table 5-V, drogue deployment: the target, 8.133 degrees north`),
        longitude: doc(-165.033, `${MR}, Table 5-V, drogue deployment: the target, 165.033 degrees west`),
      },
      initial: assumed(
        0,
        'NASA TN D-6725: on a return from the Moon a lift-vector-up attitude is commanded through the interface; Apollo 8’s own is not given',
      ),
      computer: {
        kind: 'apollo',
        lad: assumed(
          0.3,
          'R-577, Colossus GSOP, Section 5 (Rev. 14), Fig. 7.0-1a: LADPAD, nominal 0.3; this flight’s pad load has not been read',
        ),
        lod: assumed(
          0.18,
          'R-577, Colossus GSOP, Section 5 (Rev. 14), Fig. 7.0-1a: LOD, nominal 0.18; this flight’s pad load has not been read',
        ),
        program: { confidence: 'assumed', source: CMC_PROGRAM },
      },
      roll: {
        rate: assumed(
          20,
          'Colossus 2A (Comanche 055) listing, CM ENTRY DIGITAL AUTOPILOT, roll constants: VM = 20 deg/s; taken for Colossus 237',
        ),
        acceleration: assumed(
          9.1,
          'Colossus 2A (Comanche 055) listing, CM ENTRY DIGITAL AUTOPILOT, roll constants: A = 9.1 deg/s², two jets; taken for Colossus 237 and this module’s inertia',
        ),
      },
    },
  },
};

/** A manoeuvre's impulse as the record has it, ft/s, held to `share` of itself. */
const impulse = (id: string, label: string, fps: number, share: number, source: string): PlanCheck => ({
  id: `${id}.velocity`,
  label,
  value: fps * FT,
  unit: 'm/s',
  tolerance: share * fps * FT,
  of: 'orbit',
  confidence: 'documented',
  source,
});
/** A figure of the steered entry (orbital.ts `OrbitResults`, `entry.<id>`), as the record has it. */
const entryCheck = (id: string, label: string, value: number, unit: string, tolerance: number, source: string): PlanCheck => ({
  id: `entry.${id}`,
  label,
  value,
  unit,
  tolerance,
  of: 'orbit',
  confidence: 'documented',
  source,
});
const CM_AERO = cmEntryAero('assumed');

export const orbital: ApolloLunarRecord = {
  label: 'Saturn V SA-503 with CSM-103 and LTA-B',
  liftoff: doc(2_781_694, `${EVAL}, Table 21-1, total launch vehicle at holddown arm release (0.27 s; first motion 0.33 s, Table 2-2)`),
  sic: {
    mass: derived(
      2_135_462 + 654 + 611,
      `${MASS}: the S-IC at holddown arm release (Table 21-1, 2,135,462 kg), the small S-IC/S-II interstage that left with it (Table 21-1, 654 kg), and the S-II ullage motors' propellant (Table 21-1, 611 kg, burned out by S-II 90 per cent thrust at 158.47 s: Table 21-9), taken off with it`,
    ),
    propellant: {
      load: derived(
        1_365_103 + 21_688 + 601_300 + 6_055,
        `${EVAL}, Table 21-1 at holddown arm release: the oxygen and RP-1 in and below the tanks (Table 5-5's best estimate has the same 1,386,791 and 607,355 kg)`,
      ),
      usable: derived(
        1_365_103 + 21_688 + 601_300 + 6_055 - 20_894 - 12_073,
        `${EVAL}, Table 5-5 (best estimate) and Table 21-1: less the 20,894 kg of oxygen and 12,073 kg of RP-1 left at outboard cutoff, which the fuel's low-level sensors called (§5.4, Table 5-6: 3,018 kg of usable oxygen left)`,
      ),
    },
    f1: {
      thrust: derived(
        F1_FLOW * F1_ISP,
        `${EVAL}: the stage's mainstage propellant, 1,957,147 kg (Table 21-9), over the engine-seconds from range zero to the cutoffs (Table 2-2: 125.93 s for the centre, 153.82 for the four), ${F1_FLOW.toFixed(1)} kg/s an engine, at the reconstructed sea-level impulse (Table 5-2's mean, ${F1_ISP.toFixed(1)} N s/kg). The reconstruction's own thrusts at 35 to 38 s, reduced to standard pump inlet conditions, average 6,727 kN (Table 5-2): the flight's ran higher as the oxygen's head rose`,
      ),
      isp: derived(
        F1_ISP / G0,
        `${EVAL}, Table 5-2: the five engines' reconstructed sea-level specific impulse, their mean (2,588.4 N s/kg)`,
      ),
      exitArea: assumed(
        Math.PI * ((11 * 12 + 7) * IN * 0.5) ** 2,
        'Rocketdyne F-1 fact sheet, Saturn V News Reference, p. R-1: the nozzle exit 11 ft 7 in across (saturn-v.md), the type’s figure taken for SA-503’s',
      ),
    },
    centreCut: doc(125.93, `${EVENTS}, S-IC inboard engine cutoff command`),
    outboardCut: doc(153.82, `${EVENTS}, S-IC outboard engine cutoff (sensed by the LVDC)`),
    separation: doc(154.47, `${SEPARATIONS}; Table 2-2 has the separation command at the same 154.47 s`),
    push: estimated(
      11,
      'm/s: read off the evaluation’s Fig. 12-3, the S-IC/S-II relative velocity, about 11 m/s some 0.7 s after the stages’ first motion apart (154.64 s), nearly all of it the S-IC’s retrorockets slowing the S-IC; the curve read, not a figure printed',
    ),
    decay: {
      centre: assumed(
        2_659_605,
        `AS-506's (its flight evaluation, MPR-SAT-FE-69-9, §5.4: 2,659,605 N s from the cutoff signal to no thrust), the type's taken: AS-503's inboard engine's is not given`,
      ),
      outboard: derived(
        10_324_091 / 4,
        `${EVAL}, §5.4 and Table 5-4: the four's cutoff impulse from their cutoff to the separation signal, 10,324,091 N s by the engines' analysis (10,365,326 by the guidance's data, 10.61 m/s), a quarter of it`,
      ),
    },
    ullage: derived(
      368_833 + 366_947 + 363_166 + 371_382,
      `${EVAL}, §12.2.2 and Table 12-3: the four S-II ullage motors' impulse over their effective burn, each as measured, fired at 154.29 s`,
    ),
  },
  sii: {
    mass: derived(471_114 + 3_960, `${MASS}: the S-II and the S-II/S-IVB interstage at holddown arm release (Table 21-1)`),
    skirt: {
      mass: doc(4_376, `${EVAL}, Tables 21-1 and 21-3, the large S-IC/S-II interstage`),
      at: doc(184.47, `${EVENTS}, S-II second plane separation command`),
    },
    propellant: {
      load: derived(
        359_322 + 737 + 70_160 + 105,
        `${EVAL}, Table 21-3 at S-II ignition command: the oxygen and hydrogen in and below the tanks (Table 6-5's best estimate at ESC, the same 359,322 and 70,160 kg in the tanks)`,
      ),
      usable: derived(
        359_322 + 737 + 70_160 + 105 - (1_544 + 800 + 1_960 + 128),
        `${EVAL}, Table 21-3: less what was in and below the tanks at the engine cutoff command, which the oxygen's low-level sensors called (§6.4; Table 6-5: 1,544 and 1,960 kg in the tanks at the cutoff signal)`,
      ),
    },
    ignition: doc(
      158.47,
      `${EVENTS}, S-II engines at 90 per cent thrust (average of five; ignition, the start tank discharge valves open, at 156.19 s): the start's rising thrust, and the 433 kg it burned (Table 21-9), are not flown`,
    ),
    centre: {
      thrust: doc(1_033_744, `${EVAL}, Table 6-2, engine 5 (the centre) reconstructed at ESC+61 s`),
      isp: doc(4141.3 / G0, `${EVAL}, Table 6-2, engine 5: 4,141.3 N s/kg`),
      cut: doc(
        524.04,
        `${EVENTS}, S-II engine cutoff (sensed by the LVDC): on AS-503 the centre was not cut early, all five engines stopping together when the oxygen's low-level sensors called the cutoff at 524.02 s (§6.4)`,
      ),
      why: '',
    },
    outboard: {
      thrust: derived(SII_THRUST, `${EVAL}, Table 6-2, engines 1 to 4 reconstructed at ESC+61 s, their mean`),
      isp: derived(SII_ISP / G0, `${EVAL}, Table 6-2, engines 1 to 4, their mean (${SII_ISP.toFixed(1)} N s/kg)`),
      cut: doc(524.04, `${EVENTS}, S-II engine cutoff (sensed by the LVDC)`),
      shift: {
        at: doc(
          445.6,
          `${EVAL}, §6.3: the actual shift to the low mixture ratio, from the thrust chamber pressures (commanded at 443.45 s, Table 2-2)`,
        ),
        before: doc(1, 'the high mixture ratio’s figures, as given'),
        after: derived(
          SII_LOW / (SII_LOW + SII_STEP),
          `${EVAL}, §6.3: the stage's thrust after the shift, 3,877,101 N, over that and the change it made, 1,209,777 N: all five engines shifted`,
        ),
        flow: derived(
          (SII_LOW / (SII_LOW + SII_STEP)) * (4159.0 / 4214.9),
          `${EVAL}, Table 6-3: the S-II's reconstructed stage impulse at the low mixture ratio, 4,214.9 N s/kg (429.8 s), against 4,159.0 (424.1 s) at the high: the flow's share is the thrust's (§6.3) times the one over the other`,
        ),
      },
    },
    separation: doc(524.9, SEPARATIONS),
    push: estimated(
      3,
      'm/s: NOT FOUND. The S-II’s four retrorockets and the S-IVB’s two ullage motors parted the stages; the evaluation gives the S-IVB’s acceleration (Fig. 12-8) and not the speed apart (§12.3: "no clearance problems"). Apollo 11’s estimate taken',
    ),
    decay: {
      centre: derived(
        813_491 / 5,
        `${EVAL}, §6.4 and Table 6-4: the five engines' cutoff impulse from the cutoff to the S-II/S-IVB separation, 813,491 N s (3.8 m/s; 3.44 m/s by the guidance's data), a fifth of it: on AS-503 the five were cut together`,
      ),
      outboard: derived(
        813_491 / 5,
        `${EVAL}, §6.4 and Table 6-4: the five engines' cutoff impulse from the cutoff to the S-II/S-IVB separation, 813,491 N s (3.8 m/s; 3.44 m/s by the guidance's data), a fifth of it: on AS-503 the five were cut together`,
      ),
    },
  },
  les: {
    motor: {
      thrust: assumed(
        33_000 * 4.448221615,
        'Apollo 7 press kit (68-168K), p. 25: the tower jettison motor, 33,000 lb; the same motor taken',
      ),
      burn: assumed(
        1.1,
        'Apollo Spacecraft News Reference, launch escape subsystem: the tower jettison motor burns slightly longer than one second, as Apollo 7',
      ),
    },
    mass: derived(
      43_668 - 39_636,
      `${EVAL}, Table 21-3: the spacecraft before and after the tower left (Table 21-9 has the tower at 4,031 kg; ${MR}, Table A.6-I, 96,272 lb at lift-off and 87,382 at orbit insertion)`,
    ),
    at: doc(188.6, `${EVENTS}, launch escape tower jettison`),
  },
  sivb: {
    mass: derived(
      119_652 + 2_196 + 1_151 + 639,
      `${MASS}: the S-IVB and the instrument unit at holddown arm release (Table 21-1), and the adapter (Table 21-9: its panels jettisoned, 1,151 kg, and the 639 kg not jettisoned)`,
    ),
    payload: {
      label: 'LTA-B, the lunar module test article, in the adapter',
      mass: doc(9_025, `${EVAL}, Table 21-9, the lunar module (the test article, 19,900 lb: ${MR}, §A.5)`),
      nodes: ['LunarTestArticle'],
    },
    propellant: {
      load: derived(
        87_304 + 166 + 19_662 + 22,
        `${EVAL}, Table 21-5 at S-IC ignition: the oxygen and hydrogen in and below the tanks (Table 7-11's best estimate at liftoff, the same 87,470 and 19,684 kg)`,
      ),
      usable: derived(
        87_304 + 166 + 19_662 + 22 - (3_658 + 1_251) + 19.24 * SECOND_FLOW,
        `${EVAL}, Table 7-11 (best estimate): less the 3,658 kg of oxygen and 1,251 kg of hydrogen left at the second cutoff, which would have run the oxygen dry 19.24 s later (§7.9) at the second burn's flow (Table 7-7)`,
      ),
    },
    first: {
      thrust: doc(901_557, `${EVAL}, Table 7-2, first burn at ESC+80 s, standard altitude conditions`),
      isp: doc(4204.1 / G0, `${EVAL}, Table 7-2: 4,204.1 N s/kg (the PU valve at null through the burn, §7.9)`),
      ignition: doc(
        530.53,
        `${EVENTS}, S-IVB engine at 90 per cent thrust (its start tank discharge valve open at 528.29 s): the start's rising thrust, and the 169 kg it burned (Table 21-9), are not flown`,
      ),
      cutoff: doc(684.98, `${EVENTS}, S-IVB velocity cutoff command (first guidance cutoff)`),
    },
    second: {
      thrust: doc(897_548, `${EVAL}, Table 7-7, second burn at ESC+80 s, standard altitude conditions`),
      isp: doc(4199.2 / G0, `${EVAL}, Table 7-7: 4,199.2 N s/kg`),
      ignition: doc(
        SECOND_MAINSTAGE,
        `${EVENTS}, S-IVB engine at 90 per cent thrust (reignition, its start tank discharge valve open, at 10,237.79 s): the start's rising thrust, and the 170 kg it burned (Table 21-9), are not flown`,
      ),
      cutoff: doc(SECOND_CUT, `${EVENTS}, S-IVB velocity cutoff command (second guidance cutoff)`),
      speed: doc(10_830.28, `${CUTOFFS}: space-fixed velocity at the S-IVB second cutoff (velocity cutoff)`),
      shift: {
        at: doc(
          SECOND_SHIFT,
          `${EVAL}, §7.9: the PU valve commanded from the 4.5 ratio, where it stood for the start, to null (about 5.0)`,
        ),
        before: assumed(
          0.896,
          `${AS506}: the second burn's flow at the 4.5 ratio over the null ratio's, derived there from Tables 20-7 and 7-2; AS-503's burn ran at 4.5 for only the 2.47 s from 90 per cent thrust to the shift, too short to derive its own from the mass drawn, and its thrust taken at the same impulse`,
        ),
        after: doc(1, 'the null mixture ratio’s figures (Table 7-7), as given'),
      },
      align: estimated(
        200,
        's: NOT FOUND. When the stack turned from its orbit attitude to the burn’s is not in Table 2-2; taken within the restart sequence, which began at 9,659.54 s (time base 6)',
      ),
      target: {
        altitude: doc(332_190, `${CUTOFFS}: altitude at the S-IVB second cutoff`),
        over: 'ellipsoid',
        climb: doc(7.445, `${CUTOFFS}: flight path angle at the S-IVB second cutoff`),
        inclination: doc(30.639, `${CUTOFFS}: inclination at the S-IVB second cutoff`),
      },
    },
    jets: estimated(
      0.05,
      'deg/s² about each axis: NOT FOUND. A 150 lbf attitude engine of the auxiliary propulsion modules ten metres from the stack’s centre of mass, against a 128 t stack some 37 m long (a uniform rod): of that order, as Apollo 11’s record estimates it',
    ),
  },
  csm: {
    mass: derived(
      28_816 + 6,
      `${EVAL}, Table 21-9, spacecraft less the lunar module and adapter at separation (28,816 kg; ${MR}, Table A.6-I, 63,524 lb), and the 6 kg more the spacecraft rows of Tables 21-3 to 21-7 carry them with before it: with it the bodies sum to Table 21-1's total`,
    ),
    cm: estimated(
      12_179 * LB,
      `${MR}, Table A.6-I: the command module after the modules parted at the end of the flight, the nearest figure read; it was heavier at launch by what it then used`,
    ),
  },
  spacecraft: {
    sm: derived(
      CSM_LIFTOFF - (CM_DROGUE + (CM_INTERFACE - CM_DROGUE)) * LB,
      `the spacecraft at liftoff (${EVAL}, Table 21-9: ${CSM_LIFTOFF} kg) less the command module and its forward heat shield (${MASSES}: ${CM_DROGUE} lb at drogue deployment, and ${CM_INTERFACE - CM_DROGUE} lb more at the entry interface); what the command module used between liftoff and its parting is carried in the service module`,
    ),
    cm: {
      label: 'Command module 103',
      mass: doc(CM_DROGUE * LB, `${MASSES}, at drogue deployment; held through the descent`),
      lift: CM_AERO.lift!,
      trim: CM_AERO.trim!,
    },
    shield: derived(
      (CM_INTERFACE - CM_DROGUE) * LB,
      `${MASSES}: the command module at the entry interface less at drogue deployment, with the char and the command module's consumables in it (the forward heat shield's own mass is not given)`,
    ),
    sps: {
      thrust: doc(
        20_498 * LBF,
        `${MR}, Table 6.11-I: the vacuum thrust measured 50 s into the lunar orbit insertion (20,466 lbf at 200 s; 2 per cent under the predicted)`,
      ),
      isp: doc(313.0, `${MR}, Table 6.11-I: the vacuum specific impulse measured through the lunar orbit insertion`),
      starts: doc(4, `${MANOEUVRES}: the service propulsion system lit four times`),
      load: doc(40_836.0 * LB, `${MR}, §6.11.2: the actual loads, 25,105.1 lb of oxidizer and 15,730.9 lb of fuel`),
      flown: doc(
        3519 * FT,
        `${MR}, §5.6: the transearth injection's 3519 ft/s, the last firing, solved for the entry interface and not flown as this (sim/orbital.ts \`coastEvents\`)`,
      ),
    },
    separation: {
      at: doc(
        12_059.3,
        `${EVAL}, Table 2-2 and §11: the separation sequence begun at 12,056.3 s, "physical separation was accomplished 3 seconds later at 12,059.3"`,
      ),
      push: estimated(
        0.5,
        `m/s: the plus-X translation held 3 s before the parting and 5 s after it (${AFJ}, 003:20:52 to 003:21:00), four 100 lbf thrusters on 28.8 t; the speed apart is not in the report`,
      ),
    },
    modules: {
      at: doc(T(146, 28, 48), SEQUENCE),
      after: doc(CM_AFTER * LB, `${MASSES}, command module after separation`),
      leaves: derived((MODULES_BEFORE - CM_AFTER) * LB, `${MASSES}: the modules at their separation less the command module after it`),
      push: assumed(
        27.5 * FT,
        'Apollo 7 Mission Report (MSC-PA-R-68-15), §3.4: the service module reconstructed moving off at 25 to 30 ft/s posigrade, the midpoint taken; the type’s, Apollo 8’s report giving none',
      ),
    },
  },
  stage: {
    mass: derived(
      59_285 - 28_816,
      `${EVAL}: the stack at the second cutoff (Table 21-7, 59,285 kg) less the spacecraft at separation (Table 21-9, 28,816 kg); what the S-IVB vented between is not taken off`,
    ),
  },
  burns,
  entry: { parting: entry, attitudes: [], events: [] },
  els: {
    shield: {
      at: derived(
        DROGUE - 1.6,
        `${SEQUENCE}, drogue deployment at 146:54:47.8, and the forward heat shield 1.6 s before it as on Apollo 7 (its report, §5.5)`,
      ),
      height: assumed(
        23_500 * FT,
        'Apollo 7 Mission Report (MSC-PA-R-68-15), §5.5: the barometric switches’ 23,500 ft, the type’s (§6.0 of Apollo 8’s: the Earth landing system "operated exactly as intended and [is] not documented")',
      ),
      push: estimated(4, 'forward cover clearance speed; not reconstructed'),
    },
    drogues: {
      at: doc(DROGUE, SEQUENCE),
      wait: assumed(
        1.6,
        'Apollo 7 Mission Report (MSC-PA-R-68-15), §5.5: the forward heat shield jettisoned 1.6 s before the drogue mortars fired; the type’s',
      ),
      fills: assumed(10, 'Apollo 7 Mission Report (MSC-PA-R-68-15), §5.5: first disreefing after 10 s; the type’s'),
    },
    mains: {
      at: doc(T(146, 55, 38.9), SEQUENCE),
      height: assumed(10_300 * FT, 'Apollo 7 Mission Report (MSC-PA-R-68-15), §5.5: the mains out at 10,300 ft; the type’s'),
      fills: assumed(16, 'Apollo Earth Landing System, two reefed stages; represented by one progressive fill'),
    },
  },
  mission: {
    manoeuvreTurn: estimated(30, 'Display slew into each firing’s line; the attitude timeline is not read'),
    entryInterface: doc(400_000 * FT, `${MR}, Table 5-V`),
    landing: {
      at: doc(SPLASH, SEQUENCE),
      latitude: doc(8 + 7.5 / 60, `${MR}, §6.9.1: the recovery forces' estimate, 8 degrees 7.5 minutes north`),
      longitude: doc(-(165 + 1.2 / 60), `${MR}, §6.9.1: the recovery forces' estimate, 165 degrees 1.2 minutes west`),
      near: 'the Pacific, near USS Yorktown',
    },
    ground: doc(0, `${MR}, §3: the Pacific Ocean`),
    automatic: 'The computer flew the entry from the interface, and the Earth landing sequence ran automatically.',
  },
  ascent: {
    guidance: {
      azimuth: doc(72.124, `${EVAL}, §4.1: launched on an azimuth of 90°, rolled to a flight azimuth of 72.124°`),
      roll: {
        points: [
          [0, -17.876],
          [12.11, -17.876],
          [31.52, 0],
        ],
        confidence: 'derived',
        source: `${EVAL}, §4.1 and Table 2-2: the 17.876° from the pad's 90° to the flight azimuth, rolled between 12.11 and 31.52 s, taken as even`,
      },
      vertical: doc(12.11, `${EVENTS}, begin pitch and roll maneuver (the tower clearance yaw before it, 1.76 to 9.72 s, is not flown)`),
      kick: derived(145.5 - 12.11, `${EVENTS}: the tilt programme from its start to its arrest at 145.50 s`),
      programme: {
        points: [
          [0, 0],
          [12.11, 0],
          [16, 1],
          [20, 2.9],
          [25, 5.2],
          [30, 7.6],
          [35, 10],
          [40, 13.2],
          [45, 16.2],
          [50, 18.6],
          [55, 21.9],
          [60, 24.9],
          [65, 27.4],
          [70, 30],
          [75, 32.5],
          [80, 36.7],
          [85, 41.3],
          [90, 44.9],
          [95, 47.6],
          [100, 50.4],
          [105, 52.5],
          [110, 55.5],
          [115, 57.2],
          [120, 58.7],
          [125, 60],
          [130, 61.8],
          [135, 63.2],
          [140, 64.3],
          [145.5, 65.6],
          [155, 65.6],
        ],
        confidence: 'estimated',
        source: `${EVAL}, Fig. 11-4: the pitch attitude and the commanded attitude from the launch vertical (drawn within a degree of each other, read as one line), traced off the page scanned at 300 dpi (the grid's own scale: about 0.1° and 0.1 s a pixel, the line some 1.2° thick), flown open as the S-IC flew it and held from the tilt's arrest (145.50 s, Table 2-2) to the iterative guidance's start (Fig. 11-10 shows it held near 66° through the S-II's first 40 s). The plateau is taken at 65.6°, where the attitude stood at the arrest: after it the attitude runs 0.4 to 0.5° below the command (the figure's error panel). Before the programme's start at 12.11 s (Table 2-2) it is zero`,
      },
      turn: doc(
        196.22,
        `${EVAL}, Table 10-3 (and Table 2-2, to ±0.5 s): the iterative guidance's first phase begins; its closed loop flown as the law's linear tangent (§10.4.1: its first command stepped 0.5° in pitch from where the programme held)`,
      ),
      target: {
        at: 'sivb-cutoff',
        altitude: doc(191_360, `${CUTOFFS}: altitude at the S-IVB first cutoff (velocity cutoff)`),
        over: 'ellipsoid',
        climb: doc(-0.001, `${CUTOFFS}: flight path angle at the S-IVB first cutoff`),
        inclination: doc(32.509, `${EVAL}, Table 4-6: the parking orbit's inclination`),
      },
    },
    drag: [
      {
        until: doc(SECOND_CUT, 'to the end of the ascent'),
        area: derived(Math.PI * (198 * IN) ** 2, 'the 33 ft stage’s disc (saturn-v.md)'),
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
          source: 'NOT FOUND for the Saturn V: the slender stack’s curve Apollo 7’s Saturn IB is flown on, taken',
        },
      },
    ],
    steering: estimated(
      2,
      'deg/s² at full throw, about each axis: NOT FOUND. Four outboard F-1s gimballed ±5.17° (MSFC-MAN-503, §IV) some thirty metres below the stack’s centre of mass give it of the order of 1.4 at liftoff, more as it lightens; the S-II’s and the S-IVB’s gimbals of the same order: one figure taken for the three, as Apollo 11’s record estimates it',
    ),
    rarefied: {
      drag: assumed(2.2, 'King-Hele, The Prediction of Satellite Lifetimes, §9.1, the customary coefficient for perigees of 150 to 400 km'),
      area: estimated(
        129,
        'm²: a quarter of the outside of the stack in orbit (the S-IVB and instrument unit a cylinder 260 in across and 511 in long with its aft disc, the adapter a frustum 28 ft long from 260 to 154 in, the command and service modules a cylinder and cone on it: about 517 m²), the area a convex body presents on the average over every way it can lie (Cauchy); it was held level, not tumbling, which is not told apart',
      ),
      length: doc(260 * IN, 'the S-IVB’s 260 in diameter (saturn-v.md)'),
    },
    centre: estimated(
      ((17_453 * 3100 + 2_196 * 3355 + (1_790 + 9_025) * 3540 + 28_816 * 3805) / (17_453 + 2_196 + 1_790 + 9_025 + 28_816)) * IN,
      'the stack after the injection, its centre of mass above the F-1 exits: the S-IVB, the instrument unit, the adapter with LTA-B and the command and service modules, each by its mass at the second cutoff (Tables 21-7 and 21-9) at the middle of its stretch of the model (saturn_v.py), taken for the record’s run',
    ),
  },
  orbit: {
    radius: doc(6_378_165, `${EVAL}, Table 4-6: apogee and perigee based on a spherical earth of radius 6,378.165 km`),
    perigee: doc(184_410, `${EVAL}, Table 4-6, actual`),
    apogee: doc(185_180, `${EVAL}, Table 4-6, actual`),
    inclination: doc(32.509, `${EVAL}, Table 4-6, actual`),
    period: doc(88.19 * 60, `${EVAL}, Table 4-6, actual`),
    kind: {
      is: 'osculating',
      confidence: 'derived',
      source: `${EVAL}, Table 4-6: the parking orbit insertion conditions, the orbit at 694.98 s from its state; its period is the Kepler period of its heights over the stated ball (88.19 min)`,
    },
    injection: {
      at: doc(694.98, `${EVENTS}, parking orbit insertion`),
      heading: 'north',
      arc: derived(
        23.9,
        `${CUTOFFS}: 2,577.30 km surface range at the first cutoff and ten seconds more at 7,791 m/s, over a 6,378 km ball`,
      ),
      anomaly: estimated(0, 'on an orbit so near a circle (eccentricity 0.00006, Table 4-6) the place of perigee means little'),
    },
    mass: doc(128_021, `${EVAL}, Table 21-5: the stack at the end of the first burn's thrust decay, 686.67 s`),
  },
  marks: [
    { id: 'mach-1', label: 'Mach 1', at: doc(61.48, EVENTS) },
    { id: 'max-q', label: 'Greatest dynamic pressure', at: doc(78.9, EVENTS) },
    { id: 'insertion', label: 'Parking orbit insertion', at: doc(694.98, EVENTS) },
    { id: 'tli', label: 'Translunar injection', at: doc(10_565.51, `${EVAL}, Table 4-7 (the second cutoff and ten seconds)`) },
    { id: 'entry-interface', label: 'Entry interface · 400,000 ft', at: doc(INTERFACE, SEQUENCE) },
    { id: 'blackout-in', label: 'Communications blackout', at: doc(T(146, 46, 37), SEQUENCE) },
    { id: 'blackout-out', label: 'Communications restored', at: doc(T(146, 51, 42), SEQUENCE) },
    { id: 'splashdown', label: 'Splashdown', at: doc(SPLASH, SEQUENCE), lands: 'cm' },
  ],
  checks: [
    check('maxQ', 'Greatest dynamic pressure', 37_200, 'Pa', 3_000, `${EVAL}, Table 4-2: 3.720 N/cm²`),
    check('maxQAt', 'Greatest dynamic pressure, when', 78.9, 's', 6, `${EVAL}, Table 4-2`),
    check('firstG', 'Greatest load on the S-IC', 3.96, 'g', 0.2, `${EVAL}, Table 4-2: 38.85 m/s² at 153.92 s (§4.3.1: 3.96 g)`),
    check('sic-centre-cutoff.speed', 'Speed at S-IC centre engine cutoff (space-fixed)', 1_893.96, 'm/s', 40, CUTOFFS),
    check('sic-centre-cutoff.altitude', 'Height at S-IC centre engine cutoff', 41_480, 'm', 2_500, CUTOFFS),
    check('sic-separation.speed', 'Speed at S-IC/S-II separation (space-fixed)', 2_721.91, 'm/s', 50, SEPARATIONS),
    check('sic-separation.altitude', 'Height at S-IC/S-II separation', 66_370, 'm', 3_000, SEPARATIONS),
    check('sic-separation.climb', 'Climb at S-IC/S-II separation', 20.605, '°', 1.5, SEPARATIONS),
    check('sii-centre-cutoff.speed', 'Speed at S-II engine cutoff, the centre with the four (space-fixed)', 6_821.15, 'm/s', 60, CUTOFFS),
    check('sii-centre-cutoff.altitude', 'Height at S-II engine cutoff, the centre with the four', 191_540, 'm', 5_000, CUTOFFS),
    check('sii-separation.speed', 'Speed at S-II/S-IVB separation (space-fixed)', 6_824.96, 'm/s', 60, SEPARATIONS),
    check('sii-separation.altitude', 'Height at S-II/S-IVB separation', 191_610, 'm', 5_000, SEPARATIONS),
    check('cutoffAt', 'S-IVB first cutoff, when', 684.98, 's', 5, EVENTS),
    check('insertion.speed', 'Speed at parking orbit insertion (space-fixed)', 7_792.84, 'm/s', 5, `${EVAL}, Table 4-6`),
    check('injection.at', 'S-IVB second cutoff, when', SECOND_CUT, 's', 5, EVENTS),
    check('injection.mass', 'The stack at the second cutoff', 59_285, 'kg', 1_500, `${EVAL}, Table 21-7, at the engine cutoff command`),
    check('injection.energy', 'C3 at the second cutoff', -1_556_426, 'm²/s²', 30_000, `${CUTOFFS}: C3 at the S-IVB second cutoff`),
    check('injection.eccentricity', 'Eccentricity at the second cutoff', 0.97425, '', 0.002, CUTOFFS),
    // The spacecraft's firings, each solved on the run's own state for what it reached on the day: the record's impulse is
    // what each is held to (the separation manoeuvres are flown as the record's, and are not checks of anything)
    impulse('mcc-1', 'First midcourse correction, impulse', 20.4, 0.1, `${MR}, §5.4`),
    impulse('mcc-2', 'Second midcourse correction, impulse', 1.4, 0.3, `${MR}, §5.4`),
    impulse('loi', 'Lunar orbit insertion, impulse', 2997, 0.01, `${MR}, §5.5`),
    impulse('loc', 'Lunar orbit circularization, impulse', 134.8, 0.05, `${MR}, §5.5`),
    impulse('tei', 'Transearth injection, impulse', 3519, 0.01, `${MR}, §5.6`),
    impulse('mcc-3', 'Third midcourse correction, impulse', 4.8, 0.2, `${MR}, §5.7`),
    {
      id: 'interfaceAt',
      label: 'Entry interface, 400,000 ft',
      value: INTERFACE,
      unit: 's',
      tolerance: 30,
      of: 'orbit',
      confidence: 'documented',
      source: SEQUENCE,
    },
    {
      id: 'entryG',
      label: 'Peak entry load',
      value: 6.84,
      unit: 'g',
      tolerance: 0.5,
      of: 'orbit',
      confidence: 'documented',
      source: `${MR}, Table 5-V, maximum conditions (§6.9.1: the first peak, 6.84 g, sensed at 31,840.8 ft/s)`,
    },
    entryCheck(
      'sensed',
      '0.05 g after the interface',
      30,
      's',
      10,
      `${MR}, §6.9.1: "Approximately 30 seconds later, the command module had passed through the 0.05g level"`,
    ),
    entryCheck(
      'final',
      'The computer’s final phase after the interface',
      T(146, 48, 34.4) - INTERFACE,
      's',
      15,
      `${MR}, Table 6.9-III: start of the final phase at 146:48:34.4 (§6.9.1: program 67 entered at 24,900.8 ft/s)`,
    ),
    entryCheck(
      'miss',
      'From the computer’s target at drogue deployment',
      2.2 * NMI,
      'm',
      3 * NMI,
      `${MR}, §6.9.1: "The best-estimate trajectory shows a landing point ... 2.2 n. mi. from the target point" (the onboard computer's position at drogue deployment 2.1 n. mi. from it; §5.8 has 0.9 n. mi. of overshoot by the reconstructed trajectory)`,
    ),
    {
      id: 'cm.at',
      label: 'Splashdown',
      value: SPLASH,
      unit: 's',
      tolerance: 120,
      of: 'descent',
      confidence: 'documented',
      source: SEQUENCE,
    },
  ],
  coastFixes: [
    fix(SEPARATIONS, 154.47, 28.852, -79.717, 66.37, 2_721.91, 20.605, 75.384),
    fix(SEPARATIONS, 524.9, 31.728, -65.334, 191.61, 6_824.96, 0.636, 81.807),
    fix(`${EVAL}, Table 4-6, actual`, 694.98, 32.649, -53.292, 191.36, 7_792.84, 0.0006, 88.5319),
    fix(
      `${SEPARATIONS}: S-IVB/spacecraft separation (the sequence begun; the parting 3 s later)`,
      12_056.3,
      25.884,
      -66.293,
      7_017.31,
      7_617.07,
      45.076,
      107.09,
    ),
    // (Table 5-II's Earth-referenced states after the parting, n. mi. and ft/s: what the run is compared with, never put on)
    fixNmi(`${MR}, Table 5-II, first midcourse correction ignition`, T(10, 59, 59.5), -1.7, -123.74, 52_768.4, 8187, 73.82, 120.65),
    fixNmi(`${MR}, Table 5-II, first midcourse correction cutoff`, T(11, 0, 1.9), -1.71, -123.75, 52_771.7, 8172, 73.75, 120.54),
    fixNmi(`${MR}, Table 5-II, third midcourse correction ignition`, T(103, 59, 54), -5.67, -57.27, 165_561.5, 4299, -80.59, 52.65),
    fixNmi(`${MR}, Table 5-V, entry interface (400 000 feet)`, INTERFACE, 20.83, -179.89, 65.9, 36_221, -6.5, 121.57),
  ],
  aborts: [
    {
      until: doc(188.6, `${EVENTS}, launch escape tower jettison`),
      does: 'Mode I: the escape tower pulls the command module off the launch vehicle, to come down between Pad 39A and 520 nautical miles downrange. Said, not flown: the command module’s escape and its descent are not in this flight’s plan',
    },
    {
      until: doc(
        10 * 60 + 18,
        `${KIT}, p. 12, sequence of events: Mode II/Mode III abort changeover at 00:10:18 (p. 27 has Mode II run to 10:00)`,
      ),
      does: 'Mode II: the command module separates from the launch vehicle and free-falls in a full-lift entry, to land 400 to 3,200 nautical miles downrange. Said, not flown',
    },
    {
      from: doc(10 * 60 + 6, `${KIT}, p. 12, sequence of events: Mode IV capability begins at 00:10:06 (p. 27: from about ten minutes)`),
      until: doc(694.98, `${EVENTS}, parking orbit insertion`),
      does: 'Mode IV (preferred): the CSM separates from the S-IVB and its service engine puts it in Earth orbit two minutes later, for an Earth-orbital alternate. Said, not flown',
    },
    {
      until: doc(694.98, `${EVENTS}, parking orbit insertion`),
      does: 'Mode III: the CSM separates, burns retrograde on its service engine if it must, and the command module flies half lift to land 3,000 to 3,350 nautical miles downrange. Said, not flown',
    },
  ],
};

/**
 * Where the injection as flown would have taken the stack with nothing more done to it: the Mission Report's
 * pericynthion solution for the translunar injection, from its best-estimate trajectory. Under the Moon's surface: left
 * alone it struck the Moon, and the separation manoeuvres and the first midcourse correction took it to 66 n. mi. A check
 * of the coast to the Moon (the Moon's field, the Sun, the centre changed at the guidance computer's sphere:
 * sim/core/gravity.ts), flown in tests/lunargravity.test.mjs on this plan to the spacecraft's parting and no further, the
 * injection left alone, a run of its own (`lunar`, src/sim/misses.ts): the flight's own run flies the manoeuvres after it,
 * each held to its impulse. The tolerances were set before it was flown: ten nautical miles and a minute,
 * under a tenth of what the first separation manoeuvre, 1.1 ft/s, moved the solution by (131 n. mi. and 13 minutes,
 * the same table).
 */
export const TLI_PERICYNTHION = [
  {
    id: 'pericynthion',
    label: 'Pericynthion of the injection as flown, above the Moon',
    value: -130.2 * 1852,
    unit: 'm',
    tolerance: 10 * 1852,
    confidence: 'documented' as const,
    source: 'Apollo 8 Mission Report (MSC-PA-R-69-1, February 1969), Table 5-III, p. 5-9: translunar injection, -130.2 n. mi.',
  },
  {
    id: 'pericynthionAt',
    label: 'Its time of nearest approach',
    value: 69 * 3600 + 13 * 60 + 58,
    unit: 's',
    tolerance: 60,
    confidence: 'documented' as const,
    source: 'Apollo 8 Mission Report (MSC-PA-R-69-1, February 1969), Table 5-III, p. 5-9: translunar injection, 69:13:58',
  },
];

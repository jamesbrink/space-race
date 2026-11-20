/**
 * Apollo 10's launch as its records have it: SA-505 from Pad 39B through the translunar injection, the record the plan is
 * written from (vehicles/saturn-v-plan.ts `saturnVPlan`). All times are range time, s from range zero (16:49:00 UT).
 * The launch vehicle's figures are MSFC's flight evaluation's (MPR-SAT-FE-69-7): its event times (Table 2-2), its
 * trajectory at each event (Tables 4-1 to 4-6), its engines' reconstructed performance (Tables 5-1, 6-1, 7-1, 7-2) and its
 * mass at each event (Tables 20-1 to 20-9, read off the page). Its mass tables do not part the spacecraft, so Snoopy's and
 * Charlie Brown's masses are MSC's mission report's (MSC-00126, Table A.4-I). What is read, what disagrees and what is
 * estimated is in mission.md beside this file.
 */
import { assumed, derived, doc, estimated } from '../../../../../src/measure.ts';
import type { OrbitFix, PlanCheck } from '../../../../../src/sim/plan.ts';
import type { SaturnVRecord } from '../../vehicles/saturn-v-record.ts';

const IN = 0.0254;
const LB = 0.45359237;
const LBF = 4.4482216152605;
const G0 = 9.80665;
const EVAL = 'Saturn V Launch Vehicle Flight Evaluation Report AS-505, Apollo 10 Mission (MSFC, MPR-SAT-FE-69-7, 1969)';
const EVENTS = `${EVAL}, Table 2-2, actual range time`;
const MASS = `${EVAL}, Tables 20-1 to 20-9 (actual, kg)`;
const MR = 'Apollo 10 Mission Report (MSC-00126, August 1969)';
const KIT = 'NASA Apollo 10 press kit (release 69-68, 7 May 1969), p. 29';

/** The F-1s' mainstage propellant (Table 20-9) over the engine-seconds the run burns them from range zero: one engine's flow, kg/s. */
const F1_FLOW = 2_066_096 / (135.16 + 4 * 161.63);
/** Table 5-1: the five F-1s' sea-level specific impulse as reconstructed, N s/kg, their mean. */
const F1_ISP = (2583 + 2602 + 2598 + 2584 + 2591) / 5;
/** The S-II's outboard J-2s at ESC+61 s (Table 6-1, engines 1 to 4, reconstructed): thrust, N, and impulse, N s/kg, their means. */
const SII_THRUST = (1_036_098 + 1_027_855 + 1_031_276 + 1_038_553) / 4;
const SII_ISP = (4169.8 + 4162.9 + 4152.1 + 4168.8) / 4;
/** Snoopy at lift-off and Charlie Brown before the transposition (MSC-00126, Table A.4-I), kg. */
const LM = 30_735 * LB;
const CSM = 63_560 * LB;
/** The adapter, kg: the spacecraft after the tower left (Table 20-3, 44,572 kg) less Snoopy and Charlie Brown. */
const SLA = 44_572 - LM - CSM;
/** The S-IVB's second burn: its mainstage propellant (Table 20-7) and the flow at the null mixture ratio (Table 7-2), kg and kg/s. */
const SECOND_BURNED = 85_878 - 15_943;
const SECOND_FLOW = 180.23 + 35.86;
const SECOND_SHIFT = 9334.3;
const SECOND_MAINSTAGE = 9210.02;
const SECOND_CUT = 9550.58;
/** What the second burn drew before its mixture-ratio shift, kg/s: what it burned less what the null ratio's flow burned after. */
const SECOND_EARLY = (SECOND_BURNED - SECOND_FLOW * (SECOND_CUT - SECOND_SHIFT)) / (SECOND_SHIFT - SECOND_MAINSTAGE);

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

const CUTOFFS = `${EVAL}, Table 4-2, actual`;
const SEPARATIONS = `${EVAL}, Table 4-3, actual`;

export const orbital: SaturnVRecord = {
  label: 'Saturn V SA-505 with CSM-106 Charlie Brown and LM-4 Snoopy',
  liftoff: doc(2_900_383, `${EVAL}, Table 20-1, total vehicle at holddown arm release (first motion, 0.25 s)`),
  sic: {
    mass: derived(
      2_237_537 + 611 + 610,
      `${MASS}: the S-IC at holddown arm release (Table 20-1, 2,237,537 kg), the small S-IC/S-II interstage that left with it (Table 20-3, 611 kg), and the S-II ullage motors' propellant (Table 20-3, 610 kg, burned out by S-II mainstage at 166.30 s), taken off with it`,
    ),
    propellant: {
      load: derived(
        1_443_231 + 21_847 + 630_605 + 5_989,
        `${EVAL}, Table 20-1 at holddown arm release: the oxygen and RP-1 in and below the tanks (Table 5-2's reconstruction has the same 1,465,078 and 636,594 kg)`,
      ),
      usable: derived(
        1_443_231 + 21_847 + 630_605 + 5_989 - 18_412 - 12_944,
        `${EVAL}, Table 5-2 and §5.1: less the 18,412 kg of oxygen and 12,944 kg of RP-1 left at outboard cutoff, which the oxygen's low-level sensors called`,
      ),
    },
    f1: {
      thrust: derived(
        F1_FLOW * F1_ISP,
        `${EVAL}: the stage's mainstage propellant, 2,066,096 kg (Table 20-9), over the engine-seconds from range zero to the cutoffs (§5.1 and Table 4-2: 135.16 s for the centre, 161.63 for the four), ${F1_FLOW.toFixed(1)} kg/s an engine, at the reconstructed sea-level impulse (Table 5-1's mean, ${F1_ISP.toFixed(1)} N s/kg). The reconstruction's own thrusts at 35 to 38 s, reduced to standard conditions, average 6,705 kN (engine 1 ran 1.46 per cent low, §5.3): the flight's ran higher as the oxygen's head rose`,
      ),
      isp: derived(
        F1_ISP / G0,
        `${EVAL}, Table 5-1: the five engines' reconstructed sea-level specific impulse, their mean (2,591.6 N s/kg)`,
      ),
      exitArea: assumed(
        Math.PI * ((11 * 12 + 7) * IN * 0.5) ** 2,
        'Rocketdyne F-1 fact sheet, Saturn V News Reference, p. R-1: the nozzle exit 11 ft 7 in across (saturn-v.md), the type’s figure taken for SA-505’s',
      ),
    },
    centreCut: doc(135.16, `${EVAL}, §5.1 and Table 4-2 (engine solenoid): initiated by the instrument unit as planned (Table 2-2: 135.2)`),
    outboardCut: doc(
      161.63,
      `${EVAL}, §5.1 and Table 4-2 (engine solenoid): initiated by the oxygen's low-level sensors (Table 2-2: 161.6)`,
    ),
    separation: doc(162.31, `${SEPARATIONS}; Table 2-2 has the command at 162.3 s, 0.7 s after the start of time base 3 at 161.7 s`),
    push: estimated(
      5,
      'm/s: NOT FOUND. The S-IC’s eight retrorockets and the S-II’s eight ullage motors parted the stages; how fast is not in the evaluation (§12.2.3: "well within staging limits")',
    ),
  },
  sii: {
    mass: derived(484_159 + 3_649, `${MASS}: the S-II and the S-II/S-IVB interstage at holddown arm release (Table 20-1)`),
    skirt: {
      mass: doc(4_033, `${EVAL}, Table 20-3, the large S-IC/S-II interstage`),
      at: doc(192.3, `${EVENTS}, second plane separation command`),
    },
    propellant: {
      load: derived(
        372_717 + 737 + 71_801 + 112,
        `${EVAL}, Table 20-3 at S-II ignition (164.05 s): the oxygen and hydrogen in and below the tanks`,
      ),
      usable: derived(
        372_717 + 737 + 71_801 + 112 - (816 + 787 + 1_973 + 123),
        `${EVAL}, Table 20-3: less what was in and below the tanks at outboard cutoff (§6.5: 816 kg of oxygen and 1,973 kg of hydrogen in the tanks, from the point level sensors)`,
      ),
    },
    ignition: doc(
      166.3,
      `${EVAL}, §6.2 and Table 20-3: the stage's thrust at mainstage level at 166.30 s (Table 2-2: 166.3; the engines' start tank discharge valves at 164.1 s, average of five): the start's two seconds of rising thrust, and the 574 kg they burned (Table 20-9), are not flown`,
    ),
    centre: {
      thrust: doc(
        1_023_829,
        `${EVAL}, Table 6-1, engine 5 (the centre) reconstructed at ESC+61 s (§6.3: low throughout the flight, a gas generator line's resistance)`,
      ),
      isp: doc(4172.7 / G0, `${EVAL}, Table 6-1, engine 5: 4,172.7 N s/kg`),
      cut: doc(460.61, `${CUTOFFS} (engine solenoid); §6.3: ESC+297.56 s`),
      why: 'early, to prevent the build-up of the low-frequency oscillations seen on AS-503 and AS-504',
    },
    outboard: {
      thrust: derived(SII_THRUST, `${EVAL}, Table 6-1, engines 1 to 4 reconstructed at ESC+61 s, their mean`),
      isp: derived(SII_ISP / G0, `${EVAL}, Table 6-1, engines 1 to 4, their mean (${SII_ISP.toFixed(1)} N s/kg)`),
      cut: doc(552.64, `${CUTOFFS} (engine solenoid); §6.1: called by the oxygen's low-level sensors, 1.5 s after they ran dry`),
      shift: {
        at: doc(488.48, `${EVAL}, §6.1: the actual mixture ratio shift (Table 2-2: 488.5)`),
        before: doc(1, 'the high mixture ratio’s figures, as given'),
        after: derived(
          3_090_002 / 4_103_720,
          `${EVAL}, §6.3: the stage's thrust at ESC+350 s, 3,090,002 N, over the four engines' after the centre's cutoff, 4,103,720 N`,
        ),
      },
    },
    separation: doc(553.5, SEPARATIONS),
    push: estimated(
      3,
      'm/s: NOT FOUND. The S-II’s four retrorockets and the S-IVB’s two ullage motors parted the stages (§12.4.3: "well within staging limits")',
    ),
  },
  les: {
    motor: {
      thrust: assumed(33_000 * LBF, 'Apollo 7 press kit (68-168K), p. 25: the tower jettison motor, 33,000 lb; the same motor taken'),
      burn: assumed(
        1.1,
        'Apollo Spacecraft News Reference, launch escape subsystem: the tower jettison motor burns slightly longer than one second, as Apollo 7',
      ),
    },
    mass: derived(48_625 - 44_572, `${EVAL}, Table 20-3: the spacecraft before and after the tower left (Table 20-9: 4,053 kg)`),
    at: doc(197.8, EVENTS),
  },
  sivb: {
    mass: derived(
      119_223 + 1_935 + SLA,
      `${MASS} and ${MR}: the S-IVB and the instrument unit at holddown arm release (Table 20-1), and the adapter, ${SLA.toFixed(0)} kg: the spacecraft after the tower left (Table 20-3, 44,572 kg) less Snoopy at lift-off (30,735 lb) and Charlie Brown before the transposition (63,560 lb, Table A.4-I). The evaluation's mass tables do not part the spacecraft; its Table 20-9 has 626 kg of it not separated`,
    ),
    payload: {
      label: 'Snoopy, the lunar module, in the adapter',
      mass: doc(LM, `${MR}, Table A.4-I, lunar module at lift-off: 30,735 lb`),
      nodes: ['LMDescent', 'LMAscent'],
    },
    propellant: {
      load: derived(
        86_964 + 166 + 19_659 + 22,
        `${EVAL}, Table 20-5 at S-IC ignition: the oxygen and hydrogen in and below the tanks (Table 7-3's best estimate, the same 106,811 kg)`,
      ),
      usable: derived(
        86_964 + 166 + 19_659 + 22 - (2_424 + 999) + 10.64 * SECOND_FLOW,
        `${EVAL}, Table 7-3: less the 2,424 kg of oxygen and 999 kg of hydrogen left at the second cutoff (best estimate), which would have run the oxygen dry 10.64 s later (§7.9) at the second burn's flow (Table 7-2)`,
      ),
    },
    first: {
      thrust: doc(
        204_965 * LBF,
        `${EVAL}, Table 7-1, first burn at ESC+140 s, standard altitude conditions: 204,965 lbf (its newton column, printed 9,117,294, has lost a decimal point)`,
      ),
      isp: doc(4212 / G0, `${EVAL}, Table 7-1: 4,212 N s/kg`),
      ignition: doc(
        559.31,
        `${EVAL}, Table 20-5, S-IVB mainstage (Table 2-2: 559.3; its start tank discharge valve open at 556.9 s): the start's rising thrust, and the 205 kg it burned (Table 20-9), are not flown`,
      ),
      cutoff: doc(703.76, `${CUTOFFS}: first guidance cutoff signal, a velocity cutoff (Table 2-2: 703.8)`),
    },
    second: {
      thrust: doc(
        204_712 * LBF,
        `${EVAL}, Table 7-2, second burn at ESC+180 s, standard altitude conditions: 204,712 lbf (its newton column, printed 9,106,040, has lost a decimal point)`,
      ),
      isp: doc(4214 / G0, `${EVAL}, Table 7-2: 4,214 N s/kg`),
      ignition: doc(
        SECOND_MAINSTAGE,
        `${EVAL}, Table 20-7, S-IVB mainstage (Table 2-2: 9,210.0; second ignition, its start tank discharge valve open, at 9,207.5 s): the start's rising thrust, and the 213 kg it burned (Table 20-9), are not flown`,
      ),
      cutoff: doc(SECOND_CUT, `${CUTOFFS}: second guidance cutoff signal (Table 2-2: 9,550.6)`),
      speed: doc(10_846.56, `${CUTOFFS}: space-fixed velocity at the second guidance cutoff signal`),
      shift: {
        at: doc(
          SECOND_SHIFT,
          `${EVENTS}, engine mixture ratio shift (§7.9: the valve to null at 9,334.3 s, after 255.02 s at the 4.5 ratio)`,
        ),
        before: derived(
          SECOND_EARLY / SECOND_FLOW,
          `${EVAL}: the second burn's mainstage propellant (Table 20-7, ${SECOND_BURNED} kg) less what the null ratio's flow (Table 7-2, ${SECOND_FLOW.toFixed(2)} kg/s) burned from the shift to the cutoff, over the time from mainstage to the shift: ${SECOND_EARLY.toFixed(1)} kg/s at the 4.5 ratio, its thrust taken at the same impulse`,
        ),
        after: doc(1, 'the null mixture ratio’s figures (Table 7-2), as given'),
      },
      align: estimated(
        200,
        's: NOT FOUND. When the stack turned from its orbit attitude to the burn’s is not in Table 2-2; taken within the restart sequence, which began at 8,629.3 s (time base 6)',
      ),
      target: {
        altitude: doc(319_810, `${CUTOFFS}: altitude at the second guidance cutoff signal`),
        over: 'ellipsoid',
        climb: doc(6.927, `${CUTOFFS}: flight path angle at the second guidance cutoff signal`),
        inclination: doc(31.701, `${CUTOFFS}: inclination at the second guidance cutoff signal`),
      },
    },
    jets: estimated(
      0.05,
      'deg/s² about each axis: NOT FOUND. A 150 lbf attitude engine of the auxiliary propulsion modules ten metres from the stack’s centre of mass, against a 134 t stack some 37 m long (a uniform rod): of that order',
    ),
  },
  csm: {
    mass: doc(
      CSM,
      `${MR}, Table A.4-I: the command and service modules prior to transposition and docking, 63,560 lb (the combined spacecraft at lift-off and at Earth orbit insertion differ by the tower alone, so nothing the modules carried was spent but their fuel cells' few kilograms)`,
    ),
    cm: estimated(
      12_138 * LB,
      `${MR}, Table A.4-I: the command module after the modules parted at the end of the flight, the nearest figure read; it was heavier at launch by what it then used`,
    ),
  },
  ascent: {
    guidance: {
      azimuth: doc(72.028, `${EVAL}, §4.1: launched on an azimuth of 90°, rolled to a flight azimuth of 72.028°`),
      roll: {
        points: [
          [0, -17.972],
          [13.05, -17.972],
          [32.3, 0],
        ],
        confidence: 'derived',
        source: `${EVAL}, §4.1 and Table 2-2: the 17.972° from the pad's 90° to the flight azimuth, rolled between 13.05 and 32.3 s, taken as even`,
      },
      vertical: doc(
        13.05,
        `${EVAL}, §4.1: the roll begun at 13.05 s (Table 2-2: pitch and roll maneuver at 13.1; the tower clearance yaw before it, 1.6 to 10.0 s, is not flown)`,
      ),
      kick: derived(158.7 - 13.05, `${EVENTS}: the tilt programme from its start to its arrest at 158.7 s`),
      programme: {
        points: [
          [0, 0],
          [13.05, 0],
          [22, 1.5],
          [25, 2],
          [28, 3.1],
          [33, 5],
          [38, 7.3],
          [47, 12.1],
          [55, 17.6],
          [63, 23.4],
          [69, 27.4],
          [77, 33.5],
          [83, 37.7],
          [91, 42.5],
          [98, 46.4],
          [110, 52.8],
          [117, 55.6],
          [125, 58.6],
          [135, 62],
          [142, 63.9],
          [148, 65.6],
          [154, 67],
          [158.5, 67.8],
          [162, 68],
          [165, 68],
        ],
        confidence: 'estimated',
        source: `${EVAL}, Fig. 10-2: the pitch attitude command from the launch vertical, its line traced column by column off the page scanned at 600 dpi against the grid's own lines (the scan is skewed by some ten pixels across the plot, which is taken out; a tenth of a degree and half a second at best), flown open as the S-IC flew it and held from its arrest (158.7 s, Table 2-2; the figure's plateau, 68.0°) to the iterative guidance's start. Before 22 s the line runs under the plot's top border and cannot be read: it is taken from the programme's start at 13.05 s (§4.1) straight to the figure's 1.5° at 22 s`,
      },
      turn: doc(
        202.9,
        `${EVAL}, Table 10-4: the iterative guidance's first phase begins (Table 2-2: 202.9); its closed loop flown as the law's linear tangent (Fig. 10-2 shows its first command some 7° above where the programme left the axis)`,
      ),
      target: {
        at: 'sivb-cutoff',
        altitude: doc(191_470, `${CUTOFFS}: altitude at the first guidance cutoff signal`),
        over: 'ellipsoid',
        climb: doc(-0.0064, `${CUTOFFS}: flight path angle at the first guidance cutoff signal`),
        inclination: doc(32.546, `${EVAL}, Table 4-5: the parking orbit's inclination`),
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
          source: 'NOT FOUND for the Saturn V: the slender stack’s curve Apollo 7’s Saturn IB is flown on, taken (as for Apollo 11)',
        },
      },
    ],
    steering: estimated(
      2,
      'deg/s² at full throw, about each axis: NOT FOUND. Four outboard F-1s gimballed ±5.17° (MSFC-MAN-503, §IV) some thirty metres below the stack’s centre of mass give it of the order of 1.4 at liftoff, more as it lightens; the S-II’s and the S-IVB’s gimbals of the same order: one figure taken for the three (as for Apollo 11)',
    ),
    rarefied: {
      drag: assumed(2.2, 'King-Hele, The Prediction of Satellite Lifetimes, §9.1, the customary coefficient for perigees of 150 to 400 km'),
      area: estimated(
        129,
        'm²: a quarter of the outside of the stack in orbit (the S-IVB and instrument unit a cylinder 260 in across and 511 in long with its aft disc, the adapter a frustum 28 ft long from 260 to 154 in, the command and service modules a cylinder and cone on it: about 517 m²), the area a convex body presents on the average over every way it can lie (Cauchy); the same stack as Apollo 11’s, held level, not tumbling, which is not told apart',
      ),
      length: doc(260 * IN, 'the S-IVB’s 260 in diameter (saturn-v.md)'),
    },
    centre: estimated(
      ((15_943 * 3100 + 1_935 * 3355 + (SLA + LM) * 3540 + CSM * 3805) / (15_943 + 1_935 + SLA + LM + CSM)) * IN,
      'the stack after the injection, its centre of mass above the F-1 exits: the S-IVB, the instrument unit, the adapter with Snoopy and Charlie Brown, each by its mass at the second cutoff (Table 20-7; the spacecraft parted as above) at the middle of its stretch of the model (saturn_v.py), taken for the record’s run',
    ),
  },
  bound: {
    for: 'the Moon',
    next: 'Young turned Charlie Brown round, docked with Snoopy and drew it out of the adapter, the S-IVB was sent on past the Moon into orbit about the Sun, and Charlie Brown and Snoopy went into lunar orbit three days later, where Stafford and Cernan took Snoopy down to some 47,000 ft: none of it is flown here, the stack coasting on whole with the Moon pulling on it.',
  },
  orbit: {
    radius: doc(6_378_165, `${EVAL}, Table 4-5: apogee and perigee based on a spherical earth of radius 6,378.165 km`),
    perigee: doc(184_660, `${EVAL}, Table 4-5, actual`),
    apogee: doc(185_790, `${EVAL}, Table 4-5, actual`),
    inclination: doc(32.546, `${EVAL}, Table 4-5, actual`),
    period: doc(88.2 * 60, `${EVAL}, Table 4-5, actual`),
    kind: {
      is: 'osculating',
      confidence: 'derived',
      source: `${EVAL}, Table 4-5: the insertion conditions, the orbit at 713.76 s from its state; its period is the Kepler period of its heights over the stated ball (88.20 min)`,
    },
    injection: {
      at: doc(713.76, `${EVAL}, Table 4-5, parking orbit insertion (Table 2-2: 713.8)`),
      heading: 'north',
      arc: derived(
        24.5,
        `${CUTOFFS}: 2,650.21 km surface range at the first cutoff and ten seconds more at 7,791 m/s, over a 6,378 km ball`,
      ),
      anomaly: estimated(0, 'on an orbit so near a circle (eccentricity 0.000086, Table 4-5) the place of perigee means little'),
    },
    mass: doc(133_786, `${EVAL}, Table 20-5: the stack at the end of the first burn's decay, 703.98 s`),
  },
  marks: [
    { id: 'mach-1', label: 'Mach 1', at: doc(66.8, EVENTS) },
    { id: 'max-q', label: 'Greatest dynamic pressure', at: doc(82.6, EVENTS) },
    { id: 'insertion', label: 'Parking orbit insertion', at: doc(713.76, `${EVAL}, Table 4-5`) },
    { id: 'tli', label: 'Translunar injection', at: doc(9_560.58, `${EVAL}, Table 4-6`) },
  ],
  checks: [
    check('maxQ', 'Greatest dynamic pressure', 33_240, 'Pa', 3_000, `${EVAL}, Table 4-1: 3.324 N/cm²`),
    check('maxQAt', 'Greatest dynamic pressure, when', 82.6, 's', 6, `${EVAL}, Table 4-1`),
    check('firstG', 'Greatest load on the S-IC', 3.92, 'g', 0.2, `${EVAL}, Table 4-1, at 161.71 s: 38.47 m/s²`),
    check('sic-centre-cutoff.speed', 'Speed at S-IC centre engine cutoff (space-fixed)', 1_973.03, 'm/s', 40, CUTOFFS),
    check('sic-centre-cutoff.altitude', 'Height at S-IC centre engine cutoff', 43_390, 'm', 2_500, CUTOFFS),
    check('sic-separation.speed', 'Speed at S-IC/S-II separation (space-fixed)', 2_759.29, 'm/s', 50, SEPARATIONS),
    check('sic-separation.altitude', 'Height at S-IC/S-II separation', 65_890, 'm', 3_000, SEPARATIONS),
    check('sic-separation.climb', 'Climb at S-IC/S-II separation', 18.848, '°', 1.5, SEPARATIONS),
    check('sii-centre-cutoff.speed', 'Speed at S-II centre engine cutoff (space-fixed)', 5_678.47, 'm/s', 60, CUTOFFS),
    check('sii-centre-cutoff.altitude', 'Height at S-II centre engine cutoff', 179_000, 'm', 5_000, CUTOFFS),
    check('sii-separation.speed', 'Speed at S-II/S-IVB separation (space-fixed)', 6_900.65, 'm/s', 60, SEPARATIONS),
    check('sii-separation.altitude', 'Height at S-II/S-IVB separation', 187_510, 'm', 5_000, SEPARATIONS),
    check('cutoffAt', 'S-IVB first cutoff, when', 703.76, 's', 5, CUTOFFS),
    check('insertion.speed', 'Speed at parking orbit insertion (space-fixed)', 7_793.09, 'm/s', 5, `${EVAL}, Table 4-5`),
    check('injection.at', 'S-IVB second cutoff, when', SECOND_CUT, 's', 5, CUTOFFS),
    check('injection.mass', 'The stack at the second cutoff', 62_450, 'kg', 1_500, `${EVAL}, Table 20-7`),
    check(
      'injection.energy',
      'C3 at the second cutoff',
      -1_396_436,
      'm²/s²',
      30_000,
      `${CUTOFFS}: C3 at the second guidance cutoff signal`,
    ),
    check('injection.eccentricity', 'Eccentricity at the second cutoff', 0.97688, '', 0.002, CUTOFFS),
  ],
  coastFixes: [
    fix(SEPARATIONS, 162.31, 28.883, -79.694, 65.89, 2_759.29, 18.848, 75.538),
    fix(SEPARATIONS, 553.5, 31.925, -63.965, 187.51, 6_900.65, 0.73, 82.49),
    fix(`${EVAL}, Table 4-5, actual`, 713.76, 32.7, -52.526, 191.37, 7_793.09, -0.0049, 88.933),
    fix(
      `${SEPARATIONS}: S-IVB/CSM separation, not flown, the stack coasting on whole`,
      10_962.4,
      22.967,
      -139.826,
      6_486.86,
      7_787.25,
      43.93,
      67.47,
    ),
  ],
  aborts: [
    {
      until: doc(197.8, `${EVENTS}, launch escape tower jettison (the kit's plan: 3:07)`),
      does: 'Mode I: the escape tower pulls the command module off the launch vehicle, to come down between Pad 39B and 520 nautical miles downrange. Said, not flown: the command module’s escape and its descent are not in this flight’s plan',
    },
    {
      until: doc(9 * 60 + 22, `${KIT}, abort modes: until the service engine could put the CSM in a safe orbit`),
      does: 'Mode II: the crew separate by hand, turn for entry and fly it at full lift, to land 400 to 3,200 nautical miles downrange. Said, not flown',
    },
    {
      from: doc(9 * 60 + 22, `${KIT}, abort modes`),
      until: doc(713.76, `${EVAL}, Table 4-5, parking orbit insertion`),
      does: 'Mode IV (preferred): the CSM separates from the S-IVB and its service engine puts it in Earth orbit two minutes later, to fly the mission as an Earth-orbital alternate. Said, not flown',
    },
    {
      until: doc(713.76, `${EVAL}, Table 4-5, parking orbit insertion`),
      does: 'Mode III: the CSM separates, burns retrograde on its service engine if it must, and the command module flies half lift to land some 3,350 nautical miles downrange. Said, not flown',
    },
  ],
};

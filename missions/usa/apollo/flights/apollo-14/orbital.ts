/**
 * Apollo 14's launch as its records have it: SA-509 from Pad 39A through the translunar injection, the record the plan is
 * written from (vehicles/saturn-v-plan.ts `saturnVPlan`). All times are range time, s from range zero (21:03:02 UT),
 * the liftoff a 40-minute weather hold moved from 20:23 UT, which moved the flight azimuth to 75.558°: the azimuth, the
 * pitch commands, the orbit and the injection here are those flown. The launch vehicle's figures are MSFC's flight
 * evaluation's (MPR-SAT-FE-71-1): its event times (Table 2-2), its trajectory at each event (Tables 4-1 to 4-5), its
 * engines' reconstructed performance (Tables 5-1, 6-1, 7-1, 7-2, §6.3) and its mass at each event (Tables 16-1 to 16-9).
 * The S-II's four outboard engines burned until the stage's oxygen ran down to its depletion sensors, and the run finds
 * when (`sii.outboard.spent`), as the S-IVB's guidance finds when the parking orbit is reached. What is read, what
 * disagrees and what is estimated is in mission.md beside this file.
 */
import { assumed, derived, doc, estimated } from '../../../../../src/measure.ts';
import type { OrbitFix, PlanCheck } from '../../../../../src/sim/plan.ts';
import type { SaturnVRecord } from '../../vehicles/saturn-v-record.ts';

const IN = 0.0254;
const LB = 0.45359237;
const LBF = 4.448221615;
const G0 = 9.80665;
const EVAL = 'Saturn V Launch Vehicle Flight Evaluation Report AS-509, Apollo 14 Mission (MSFC, MPR-SAT-FE-71-1)';
const EVENTS = `${EVAL}, Table 2-2, actual range time`;
const MASS = `${EVAL}, Tables 16-1 to 16-9 (actual, kg)`;
const MR = 'Apollo 14 Mission Report (MSC-04112)';
const AFJ = 'Apollo 14 Flight Journal, launch (apollojournals.org/afj/ap14fj/01_day1_launch.html), the air-to-ground';

/** The F-1s' mainstage propellant (Table 16-9) over the engine-seconds the run burns them from range zero: one engine's flow, kg/s. */
const F1_FLOW = 2_072_527 / (135.14 + 4 * 164.1);
/** Table 5-1: the five F-1s' sea-level specific impulse as reconstructed, lbf s/lbm (s), their mean. */
const F1_ISP = (264.7 + 263.9 + 264.9 + 264.3 + 264.8) / 5;
/** The S-II's outboard J-2s at ESC+61 s (Table 6-1, engines 1 to 4, reconstructed): thrust, lbf, and impulse, s, their means. */
const SII_THRUST = (229_897 + 233_264 + 233_146 + 231_111) / 4;
const SII_ISP = (423.3 + 424.1 + 424.8 + 424.1) / 4;
/** The S-II's propellant at ignition and at its outboard cutoff (Table 16-3): liquid in and below the tanks, and the gas over it, kg. */
const SII_LOAD = 379_139 + 737 + 72_115 + 111;
const SII_LEFT = 550 + 787 + 1_342 + 123;
const SII_GAS = 2_247 - 149 + (595 - 58);
/** The S-IVB's second burn: its mainstage propellant (Table 16-7) and the flow at the null mixture ratio (Table 7-2), kg and kg/s. */
const SECOND_BURNED = 87_614 - 16_034;
const SECOND_FLOW = (392.47 + 79.85) * LB;
const SECOND_SHIFT = 9049.6;
const SECOND_MAINSTAGE = 8914.9;
const SECOND_CUT = 9263.24;
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
  label: 'Saturn V SA-509 with CSM-110 Kitty Hawk and LM-8 Antares',
  liftoff: doc(2_911_097, `${EVAL}, Table 16-1, total vehicle at holddown arm release (first motion, 0.20 s)`),
  sic: {
    mass: derived(
      2_243_539 + 5_170 - 3_945,
      `${MASS}: the S-IC at holddown arm release (Table 16-1, 2,243,539 kg), and of the S-IC/S-II interstage (Table 16-1, 5,170 kg) what is not the large interstage let go at the second plane (Table 16-3, 3,945 kg): the small interstage that left with the S-IC (614 kg) and the S-II ullage motors' propellant (611 kg, burned out by S-II mainstage at 168.5 s), taken off with it`,
    ),
    propellant: {
      load: derived(
        1_449_604 + 21_916 + 633_288 + 6_000,
        `${EVAL}, Table 16-1 at holddown arm release: the oxygen and RP-1 in and below the tanks (Table 5-2's reconstruction has the same 3,244,149 and 1,409,389 lbm)`,
      ),
      usable: derived(
        1_449_604 + 21_916 + 633_288 + 6_000 - (980 + 18_329) - (8_694 + 5_962),
        `${EVAL}, Table 16-1: less the 19,309 kg of oxygen and 14,656 kg of RP-1 in and below the tanks at outboard cutoff, which the oxygen's low-level sensors called (§5.5: 42,570 and 32,312 lbm). The kilogram table prints 79 and 3,694 kg in the tanks there, defaced: its pound table (2,160 and 19,167 lbm), its stage total and Table 5-2 give 980 and 8,694`,
      ),
    },
    f1: {
      thrust: derived(
        F1_FLOW * F1_ISP * G0,
        `${EVAL}: the stage's mainstage propellant, 2,072,527 kg (Table 16-9), over the engine-seconds from range zero to the cutoffs (Table 2-2: 135.14 s for the centre, 164.10 for the four), ${F1_FLOW.toFixed(1)} kg/s an engine, at the reconstructed sea-level impulse (Table 5-1's mean, ${F1_ISP.toFixed(2)} s). The reconstruction's own thrusts at 35 to 38 s, reduced to standard sea level and pump inlet conditions, average 1,501 klbf (6,676 kN): the flight's ran higher as the oxygen's head rose`,
      ),
      isp: derived(
        F1_ISP,
        `${EVAL}, Table 5-1: the five engines' reconstructed sea-level specific impulse, their mean (263.9 to 264.9 lbf s/lbm)`,
      ),
      exitArea: assumed(
        Math.PI * ((11 * 12 + 7) * IN * 0.5) ** 2,
        'Rocketdyne F-1 fact sheet, Saturn V News Reference, p. R-1: the nozzle exit 11 ft 7 in across (saturn-v.md), the type’s figure taken for SA-509’s',
      ),
    },
    centreCut: doc(135.14, `${EVENTS} (§5.4: by a signal from the instrument unit, as planned)`),
    outboardCut: doc(164.1, `${EVENTS} (§5.4: by the oxygen low-level sensors, 0.94 s earlier than predicted)`),
    separation: doc(164.8, `${SEPARATIONS}; Table 2-2 has the command at the same instant, 0.7 s after the start of time base 3`),
    push: estimated(
      5,
      'm/s: NOT FOUND. The S-IC’s eight retrorockets and the S-II’s eight ullage motors parted the stages; how fast is not in the evaluation. Apollo 11’s estimate, taken',
    ),
  },
  sii: {
    mass: derived(488_014 + 3_655, `${MASS}: the S-II and the S-II/S-IVB interstage at holddown arm release (Table 16-1)`),
    skirt: {
      mass: doc(3_945, `${EVAL}, Tables 16-3 and 16-9, the large S-IC/S-II interstage`),
      at: doc(194.8, `${EVENTS}, second plane separation command`),
    },
    propellant: {
      load: derived(SII_LOAD, `${EVAL}, Table 16-3 at S-II ignition (166.5 s): the oxygen and hydrogen in and below the tanks`),
      usable: derived(
        SII_LOAD - SII_LEFT - SII_GAS,
        `${EVAL}, Table 16-3: less the ${SII_LEFT} kg in and below the tanks at outboard cutoff, and the ${SII_GAS} kg the tanks' ullage gas had grown by then, drawn off the propellant to pressurize the tanks and not through the engines (Table 6-1's flows exclude it). The engines' share so found, ${SII_LOAD - SII_LEFT - SII_GAS} kg, is within 116 kg of what Table 16-9 has them burn from the start's rise to the cutoff's decay (588 + 446,012 + 181 kg)`,
      ),
    },
    ignition: doc(
      168.5,
      `${EVENTS}, S-II mainstage (engine start command at 165.5 s, the start tank discharge valves open at 166.5 s): the start's rising thrust, and the 588 kg it burned (Table 16-9), are not flown`,
    ),
    centre: {
      thrust: doc(237_046 * LBF, `${EVAL}, Table 6-1, engine 5 (the centre) reconstructed at ESC+61 s: 237,046 lbf`),
      isp: doc(426.0, `${EVAL}, Table 6-1, engine 5: 426.0 lbf s/lbm`),
      cut: doc(
        463.09,
        `${EVENTS}, S-II center engine cutoff; §6.1 and §6.3: at ESC+297.6 s, as planned. The evaluation gives no reason for the early cut (AS-506's: against the low-frequency oscillation of AS-503 and AS-504); SA-509's centre engine flew a LOX feedline accumulator, the first, as a POGO suppression device (§6.1)`,
      ),
      why: 'early, as planned',
    },
    outboard: {
      thrust: derived(
        SII_THRUST * LBF,
        `${EVAL}, Table 6-1, engines 1 to 4 reconstructed at ESC+61 s, their mean (${SII_THRUST.toFixed(0)} lbf)`,
      ),
      isp: derived(SII_ISP, `${EVAL}, Table 6-1, engines 1 to 4, their mean (${SII_ISP.toFixed(3)} lbf s/lbm)`),
      cut: doc(559.05, `${EVENTS}, S-II outboard engine cutoff, 2.15 s later than predicted (Table 4-2 at the same instant)`),
      spent:
        'by the stage’s oxygen depletion cutoff (§6.4 and §6.5: 2.2 s later than predicted, for a flow lower than predicted at the low mixture ratio)',
      shift: {
        at: doc(473.1, `${EVENTS}, S-II low engine mixture ratio shift (actual), 1.5 s earlier than predicted (§6.3: ESC+307.6 s)`),
        before: doc(1, 'the high mixture ratio’s figures, as given'),
        after: derived(
          776_070 / 924_939,
          `${EVAL}, §6.3: the stage's thrust at ESC+380.3 s, 776,070 lbf, over the four engines' after the centre's cutoff, 924,939 lbf`,
        ),
      },
    },
    separation: doc(
      560.0,
      `${SEPARATIONS}; Table 2-2 has the command at 560.0 s, 1.0 s into time base 4, which the outboard cutoff started`,
    ),
    push: estimated(
      3,
      'm/s: NOT FOUND. The S-II’s four retrorockets and the S-IVB’s two ullage motors parted the stages. Apollo 11’s estimate, taken',
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
    mass: doc(4_094, `${EVAL}, Table 16-9: the launch escape system let go after S-II mainstage`),
    at: doc(200.7, `${EVENTS}, launch escape tower jettison`),
  },
  sivb: {
    mass: derived(
      118_268 + 2_043 + 1_171 + 625,
      `${MASS}: the S-IVB and the instrument unit at holddown arm release (Table 16-1), and the adapter (Table 16-9: its panels, 1,171 kg, and the 625 kg of the spacecraft not separated)`,
    ),
    payload: {
      label: 'Antares, the lunar module, in the adapter',
      mass: doc(15_279, `${EVAL}, Table 16-9, the lunar module`),
      nodes: ['LMDescent', 'LMAscent'],
    },
    propellant: {
      load: derived(
        86_230 + 166 + 19_730 + 21,
        `${EVAL}, Table 16-5 at S-IC ignition: the oxygen and hydrogen in and below the tanks (Table 7-3's best estimate, 190,473 and 43,546 lbm, without what is below the valves)`,
      ),
      usable: derived(
        86_230 + 166 + 19_730 + 21 - (2_456 + 180 + 1_185 + 26) + 13.3 * SECOND_FLOW,
        `${EVAL}, Table 16-7: less the 2,636 kg of oxygen and 1,211 kg of hydrogen in and below the tanks at the second cutoff, which would have run the oxygen dry 13.3 s later (§7.9) at the second burn's flow (Table 7-2)`,
      ),
    },
    first: {
      thrust: doc(201_572 * LBF, `${EVAL}, Table 7-1, first burn at STDV+130 s, standard altitude conditions: 201,572 lbf`),
      isp: doc(427.1, `${EVAL}, Table 7-1: 427.1 lbf s/lbm`),
      ignition: doc(
        565.9,
        `${EVENTS}, S-IVB mainstage (its start tank discharge valve open at 563.4 s): the start's rising thrust, and the 165 kg it burned (Table 16-9), are not flown`,
      ),
      cutoff: doc(
        700.56,
        `${EVENTS}, velocity cutoff command no. 1 (first guidance cutoff), 1.73 s earlier than predicted; §7.1: a burn 4.1 s shorter than predicted, some 2.4 s of it the S-IVB's higher thrust and the rest the lower stages' performance and the change of flight azimuth`,
      ),
    },
    second: {
      thrust: doc(201_738 * LBF, `${EVAL}, Table 7-2, second burn at STDV+200 s, standard altitude conditions: 201,738 lbf`),
      isp: doc(427.1, `${EVAL}, Table 7-2: 427.1 lbf s/lbm`),
      ignition: doc(
        SECOND_MAINSTAGE,
        `${EVENTS}, S-IVB mainstage (second ignition, its start tank discharge valve open, at 8,912.4 s): the start's rising thrust, and the 152 kg it burned (Table 16-9), are not flown`,
      ),
      cutoff: doc(SECOND_CUT, `${EVENTS}, second guidance cutoff command no. 1`),
      speed: doc(10_832.9, `${CUTOFFS}: space-fixed velocity at the second guidance cutoff signal`),
      shift: {
        at: doc(
          SECOND_SHIFT,
          `${EVENTS}, engine mixture ratio shift (§7.9: the mixture ratio control valve from the 4.5 position to the 5.0 at second ESC+145.5 s)`,
        ),
        before: derived(
          SECOND_EARLY / SECOND_FLOW,
          `${EVAL}: the second burn's mainstage propellant (Table 16-7, the stage at mainstage less at cutoff, ${SECOND_BURNED} kg) less what the 5.0 ratio's flow (Table 7-2, ${SECOND_FLOW.toFixed(2)} kg/s) burned from the shift to the cutoff, over the time from mainstage to the shift: ${SECOND_EARLY.toFixed(1)} kg/s at the 4.5 ratio, its thrust taken at the same impulse`,
        ),
        after: doc(1, 'the 5.0 mixture ratio’s figures (Table 7-2), as given'),
      },
      align: estimated(
        200,
        's: NOT FOUND. When the stack turned from its orbit attitude to the burn’s is not in Table 2-2; taken within the restart sequence, which began at 8,334.17 s (time base 6). Apollo 11’s estimate, taken',
      ),
      target: {
        altitude: doc(318_200, `${CUTOFFS}: altitude at the second guidance cutoff signal`),
        over: 'ellipsoid',
        climb: doc(7.047, `${CUTOFFS}: flight path angle at the second guidance cutoff signal`),
        inclination: doc(30.821, `${CUTOFFS}: inclination at the second guidance cutoff signal`),
      },
    },
    jets: estimated(
      0.05,
      'deg/s² about each axis: NOT FOUND. A 150 lbf attitude engine of the auxiliary propulsion modules ten metres from the stack’s centre of mass, against a 137 t stack some 37 m long (a uniform rod): of that order. Apollo 11’s estimate, taken',
    ),
  },
  csm: {
    mass: derived(
      50_404 - 15_279 - 4_094 - 1_171 - 625,
      `${MASS}: the spacecraft at holddown arm release (Table 16-1, 50,404 kg) less the lunar module, the escape system, the adapter's panels and what of it stayed with the S-IVB (Table 16-9), which lists the command and service modules at 29,233 kg, its rows summing 2 kg short of its spacecraft`,
    ),
    cm: estimated(
      12_715.1 * LB,
      `${MR}, Table A-II: the command module after the modules parted at the end of the flight, the nearest figure read; it was heavier at launch by what it then used`,
    ),
  },
  ascent: {
    guidance: {
      azimuth: doc(
        75.558,
        `${EVAL}, §4.1: launched on an azimuth of 90°, "a roll maneuver was initiated at 12.8 seconds that placed the vehicle on a flight azimuth of 75.558 degrees east of north": the azimuth flown after the weather hold, not the planned 72°`,
      ),
      roll: {
        points: [
          [0, -14.442],
          [12.8, -14.442],
          [28.0, 0],
        ],
        confidence: 'derived',
        source: `${EVAL}, §4.1 and Table 2-2: the 14.442° from the pad's 90° to the flight azimuth, rolled between 12.8 and 28.0 s, taken as even`,
      },
      vertical: doc(12.8, `${EVENTS}, begin pitch and roll maneuver (the tower clearance yaw before it, 2.0 to 9.9 s, is not flown)`),
      kick: derived(164.1 - 12.8, `${EVENTS}: the tilt programme from its start to its arrest at 164.1 s`),
      programme: {
        points: [
          [0, 0],
          [12.8, 0],
          [20, 3.8],
          [25, 6.0],
          [30, 8.6],
          [35, 10.7],
          [40, 13.1],
          [45, 15.3],
          [50, 17.7],
          [55, 20.0],
          [60, 22.6],
          [65, 25.3],
          [70, 27.9],
          [75, 30.3],
          [80, 33.4],
          [85, 36.7],
          [90, 39.9],
          [95, 42.7],
          [105, 48.9],
          [110, 51.0],
          [115, 53.1],
          [120, 55.3],
          [125, 57.0],
          [130, 59.0],
          [135, 60.3],
          [140, 61.9],
          [145, 63.3],
          [150, 64.6],
          [155, 65.9],
          [160, 67.1],
          [162.5, 67.5],
          [165, 67.7],
        ],
        confidence: 'estimated',
        source: `${EVAL}, Fig. 9-4: the launch vehicle digital computer's pitch attitude command from the launch vertical, its line traced off the page scanned at 600 dpi against the figure's own grid (its first hundred seconds and first ten degrees drawn short of the rest, so read between the gridlines found: some two seconds and half a degree at best) and smoothed over five seconds, flown open as the S-IC flew it and held from its arrest (164.1 s, Table 2-2; the figure's plateau, 67.7°) to the iterative guidance's start. Before 20 s the line drawn leaves zero a second ahead of the programme's start at 12.8 s (Table 2-2), which is taken, and the tilt run straight from it to the figure's 3.8° at 20 s; between 95 and 105 s a gridline hides the line's corner, run straight. The figure draws the iterative guidance's first step some 4.5 s after Table 2-2's 205.9 s, which is taken`,
      },
      turn: doc(
        205.9,
        `${EVENTS}: the iterative guidance's first phase begins (§9.3.2: implemented at T3+41.802 s); its closed loop flown as the law's linear tangent`,
      ),
      target: {
        at: 'sivb-cutoff',
        altitude: doc(190_900, `${CUTOFFS}: altitude at the first guidance cutoff signal`),
        over: 'ellipsoid',
        climb: doc(-0.004, `${CUTOFFS}: flight path angle at the first guidance cutoff signal`),
        inclination: doc(31.12, `${EVAL}, Table 4-4: the parking orbit's inclination`),
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
          source: 'NOT FOUND for the Saturn V: the slender stack’s curve Apollo 7’s Saturn IB is flown on, taken (as Apollo 11’s)',
        },
      },
    ],
    steering: estimated(
      2,
      'deg/s² at full throw, about each axis: NOT FOUND. Four outboard F-1s gimballed ±5.17° (MSFC-MAN-503, §IV) some thirty metres below the stack’s centre of mass give it of the order of 1.4 at liftoff, more as it lightens; the S-II’s and the S-IVB’s gimbals of the same order: one figure taken for the three (Apollo 11’s)',
    ),
    rarefied: {
      drag: assumed(2.2, 'King-Hele, The Prediction of Satellite Lifetimes, §9.1, the customary coefficient for perigees of 150 to 400 km'),
      area: estimated(
        129,
        'm²: a quarter of the outside of the stack in orbit (the S-IVB and instrument unit a cylinder 260 in across and 511 in long with its aft disc, the adapter a frustum 28 ft long from 260 to 154 in, the command and service modules a cylinder and cone on it: about 517 m²), the area a convex body presents on the average over every way it can lie (Cauchy), as Apollo 11’s; it was held level, not tumbling, which is not told apart',
      ),
      length: doc(260 * IN, 'the S-IVB’s 260 in diameter (saturn-v.md)'),
    },
    centre: estimated(
      ((16_034 * 3100 + 2_043 * 3355 + (1_796 + 15_279) * 3540 + 29_235 * 3805) / (16_034 + 2_043 + 1_796 + 15_279 + 29_235)) * IN,
      'the stack after the injection, its centre of mass above the F-1 exits: the S-IVB, the instrument unit, the adapter with Antares and Kitty Hawk, each by its mass at the second cutoff (Tables 16-7 and 16-9) at the middle of its stretch of the model (saturn_v.py), taken for the record’s run',
    ),
  },
  bound: {
    for: 'the Moon',
    next: 'Roosa turned Kitty Hawk round and docked with Antares at the sixth attempt, drew it out of the adapter, and the S-IVB was sent on to strike the Moon; Shepard and Mitchell landed Antares at Fra Mauro: none of it is flown here, the stack coasting on whole with the Moon pulling on it.',
  },
  orbit: {
    radius: doc(6_378_165, `${EVAL}, Table 4-4: apogee and perigee based on a spherical earth of radius 6,378.165 km`),
    perigee: doc(183_200, `${EVAL}, Table 4-4, actual`),
    apogee: doc(185_300, `${EVAL}, Table 4-4, actual`),
    inclination: doc(31.12, `${EVAL}, Table 4-4, actual`),
    period: doc(88.18 * 60, `${EVAL}, Table 4-4, actual`),
    kind: {
      is: 'osculating',
      confidence: 'derived',
      source: `${EVAL}, Table 4-4: the insertion conditions, the orbit at 710.56 s from its state; its period is the Kepler period of its heights over the stated ball (88.18 min)`,
    },
    injection: {
      at: doc(710.56, `${EVAL}, Table 4-4, parking orbit insertion (Table 2-2: 710.6 s)`),
      heading: 'north',
      arc: derived(
        24.1,
        `${CUTOFFS}: 2,604.4 km surface range at the first cutoff and ten seconds more at 7,791 m/s, over a 6,378 km ball`,
      ),
      anomaly: estimated(0, 'on an orbit so near a circle (eccentricity 0.0002, Table 4-4) the place of perigee means little'),
    },
    mass: doc(137_123, `${EVAL}, Table 16-5: the stack at the end of the first burn's decay, 700.80 s`),
  },
  marks: [
    { id: 'mach-1', label: 'Mach 1', at: doc(68.0, EVENTS) },
    { id: 'max-q', label: 'Greatest dynamic pressure', at: doc(81.0, EVENTS) },
    { id: 'insertion', label: 'Parking orbit insertion', at: doc(710.56, `${EVAL}, Table 4-4`) },
    { id: 'tli', label: 'Translunar injection', at: doc(9_273.2, EVENTS) },
  ],
  checks: [
    check('maxQ', 'Greatest dynamic pressure', 31_400, 'Pa', 3_000, `${EVAL}, Table 4-1: 3.14 N/cm²`),
    check('maxQAt', 'Greatest dynamic pressure, when', 81.0, 's', 6, `${EVAL}, Table 4-1`),
    check('firstG', 'Greatest load on the S-IC', 3.82, 'g', 0.2, `${EVAL}, Table 4-1, at 164.18 s`),
    check('sic-centre-cutoff.speed', 'Speed at S-IC centre engine cutoff (space-fixed)', 1_915.2, 'm/s', 40, CUTOFFS),
    check('sic-centre-cutoff.altitude', 'Height at S-IC centre engine cutoff', 43_000, 'm', 2_500, CUTOFFS),
    check('sic-separation.speed', 'Speed at S-IC/S-II separation (space-fixed)', 2_744.6, 'm/s', 50, SEPARATIONS),
    check('sic-separation.altitude', 'Height at S-IC/S-II separation', 67_900, 'm', 3_000, SEPARATIONS),
    check('sic-separation.climb', 'Climb at S-IC/S-II separation', 19.494, '°', 1.5, SEPARATIONS),
    check('sii-centre-cutoff.speed', 'Speed at S-II centre engine cutoff (space-fixed)', 5_655.4, 'm/s', 60, CUTOFFS),
    check('sii-centre-cutoff.altitude', 'Height at S-II centre engine cutoff', 181_700, 'm', 5_000, CUTOFFS),
    // (the four's cut is the run's own, when its propellant is spent: saturn-v-plan.ts `siiSpent`)
    check('sii-outboard-cutoff.stop', 'S-II outboard engines cutoff, when (oxygen depletion)', 559.05, 's', 2, CUTOFFS),
    check('sii-separation.speed', 'Speed at S-II/S-IVB separation (space-fixed)', 6_985.2, 'm/s', 60, SEPARATIONS),
    check('sii-separation.altitude', 'Height at S-II/S-IVB separation', 188_200, 'm', 5_000, SEPARATIONS),
    check('cutoffAt', 'S-IVB first cutoff, when', 700.56, 's', 5, EVENTS),
    check('insertion.speed', 'Speed at parking orbit insertion (space-fixed)', 7_792.5, 'm/s', 5, `${EVAL}, Table 4-4`),
    check('injection.at', 'S-IVB second cutoff, when', SECOND_CUT, 's', 5, EVENTS),
    check('injection.mass', 'The stack at the second cutoff', 64_387, 'kg', 1_500, `${EVAL}, Table 16-7`),
    check(
      'injection.energy',
      'C3 at the second cutoff',
      -1_742_882,
      'm²/s²',
      30_000,
      `${CUTOFFS}: C3 at the second guidance cutoff signal`,
    ),
    check('injection.eccentricity', 'Eccentricity at the second cutoff', 0.9712, '', 0.002, CUTOFFS),
  ],
  coastFixes: [
    fix(SEPARATIONS, 164.8, 28.815, -79.649, 67.9, 2_744.6, 19.494, 78.467),
    fix(SEPARATIONS, 560.0, 31.03, -63.681, 188.2, 6_985.2, 0.612, 85.818),
    fix(`${EVAL}, Table 4-4, actual`, 710.56, 31.246, -52.983, 190.9, 7_792.5, -0.003, 91.656),
    fix(
      `${SEPARATIONS}: S-IVB/CSM separation, not flown, the stack coasting on whole`,
      10_949.4,
      19.215,
      -153.447,
      7_943.8,
      7_346.1,
      46.812,
      65.393,
    ),
  ],
  aborts: [
    {
      until: doc(200.7, `${EVENTS}, launch escape tower jettison`),
      does: 'Mode I: the escape tower pulls the command module off the launch vehicle, to come down in the Atlantic. Said, not flown: the command module’s escape and its descent are not in this flight’s plan',
    },
    {
      until: doc(9 * 60 + 12, `${AFJ}: CapCom Fullerton’s mark for Mode IV capability at 000:09:12`),
      does: 'Mode II: the crew separate by hand, turn for entry and fly it at full lift, to come down in the Atlantic. Said, not flown',
    },
    {
      from: doc(9 * 60 + 12, `${AFJ}: CapCom Fullerton’s mark for Mode IV capability at 000:09:12`),
      until: doc(710.56, `${EVAL}, Table 4-4, parking orbit insertion`),
      does: 'Mode IV: the CSM separates from the S-IVB and its service engine puts it in Earth orbit, to fly the mission as an Earth-orbital alternate. Said, not flown',
    },
    {
      until: doc(710.56, `${EVAL}, Table 4-4, parking orbit insertion`),
      does: 'Mode III: the CSM separates, burns retrograde on its service engine if it must, and the command module flies half lift to land in the eastern Atlantic. Said, not flown',
    },
  ],
};

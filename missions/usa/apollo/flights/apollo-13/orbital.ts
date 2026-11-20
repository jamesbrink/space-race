/**
 * Apollo 13's launch as its records have it: SA-508 from Pad 39A through the translunar injection, the record the plan is
 * written from (vehicles/saturn-v-plan.ts `saturnVPlan`). All times are range time, s from range zero (19:13:00 UT).
 * The launch vehicle's figures are MSFC's flight evaluation's (MPR-SAT-FE-70-2): its event times (Table 2-2), its
 * trajectory at each event (Tables 4-1 to 4-6), its engines' reconstructed performance (Tables 5-1, 6-1, 7-1, 7-2, §6.3)
 * and its mass at each event (Tables 16-1 to 16-9). The S-II's centre engine shut itself down 132 seconds early (§6.3: a
 * 14 to 16 Hz oscillation dropped its thrust-OK pressure switches): that is the record's, and flown at the record's
 * instant; the four outboard engines then burned until the stage's oxygen ran down to its depletion sensors, and the
 * run finds when (`sii.outboard.spent`), as the S-IVB's guidance finds when the parking orbit is reached. What is read,
 * what disagrees and what is estimated is in mission.md beside this file.
 */
import { assumed, derived, doc, estimated } from '../../../../../src/measure.ts';
import type { OrbitFix, PlanCheck } from '../../../../../src/sim/plan.ts';
import type { SaturnVRecord } from '../../vehicles/saturn-v-record.ts';

const IN = 0.0254;
const LB = 0.45359237;
const LBF = 4.448221615;
const G0 = 9.80665;
const EVAL = 'Saturn V Launch Vehicle Flight Evaluation Report AS-508, Apollo 13 Mission (MSFC, MPR-SAT-FE-70-2)';
const EVENTS = `${EVAL}, Table 2-2, actual range time`;
const MASS = `${EVAL}, Tables 16-1 to 16-9 (actual, kg)`;
const MR = 'Apollo 13 Mission Report (MSC-02680)';
const AFJ = 'Apollo 13 Flight Journal, launch and ascent (apollojournals.org/afj/ap13fj/01launch_ascent.html), the air-to-ground';

/** The F-1s' mainstage propellant (Table 16-9) over the engine-seconds the run burns them from range zero: one engine's flow, kg/s. */
const F1_FLOW = 2_074_484 / (135.18 + 4 * 163.6);
/** Table 5-1: the five F-1s' sea-level specific impulse as reconstructed, lbf s/lbm (s), their mean. */
const F1_ISP = (264.6 + 264.8 + 264.9 + 265.9 + 264.6) / 5;
/** The S-II's outboard J-2s at ESC+62 s (Table 6-1, engines 1 to 4, reconstructed): thrust, lbf, and impulse, s, their means. */
const SII_THRUST = (233_602 + 232_956 + 233_060 + 230_216) / 4;
const SII_ISP = (425.5 + 425.9 + 425.0 + 424.1) / 4;
/** The S-II's propellant at ignition and at its outboard cutoff (Table 16-3): liquid in and below the tanks, and the gas over it, kg. */
const SII_LOAD = 378_802 + 737 + 72_432 + 111;
const SII_LEFT = 815 + 787 + 1_932 + 123;
const SII_GAS = 2_543 - 169 + (805 - 66);
/** The S-IVB's second burn: its mainstage propellant (Table 16-7) and the flow at the null mixture ratio (Table 7-2), kg and kg/s. */
const SECOND_BURNED = 85_352 - 14_949;
const SECOND_FLOW = (386.54 + 78.24) * LB;
const SECOND_SHIFT = 9448.7;
const SECOND_MAINSTAGE = 9348.9;
const SECOND_CUT = 9697.17;
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
  label: 'Saturn V SA-508 with CSM-109 Odyssey and LM-7 Aquarius',
  liftoff: doc(2_909_780, `${EVAL}, Table 16-1, total vehicle at holddown arm release (first motion, 0.30 s)`),
  sic: {
    mass: derived(
      2_241_950 + 5_195 - 3_972,
      `${MASS}: the S-IC at holddown arm release (Table 16-1, 2,241,950 kg), and of the S-IC/S-II interstage (Table 16-1, 5,195 kg) what is not the large interstage let go at the second plane (Table 16-3, 3,972 kg): the small interstage that left with the S-IC (612 kg) and the S-II ullage motors' propellant (610 kg, burned out by S-II mainstage at 168.0 s), taken off with it`,
    ),
    propellant: {
      load: derived(
        1_446_402 + 21_854 + 634_622 + 5_996,
        `${EVAL}, Table 16-1 at holddown arm release: the oxygen and RP-1 in and below the tanks (Table 5-2's reconstruction has the same 3,236,952 and 1,412,322 lbm)`,
      ),
      usable: derived(
        1_446_402 + 21_854 + 634_622 + 5_996 - (914 + 16_740) - (6_548 + 5_958),
        `${EVAL}, Table 16-1: less the 17,654 kg of oxygen and 12,506 kg of RP-1 in and below the tanks at outboard cutoff, which the oxygen's low-level sensors called (§5.5: 38,921 and 27,573 lbm)`,
      ),
    },
    f1: {
      thrust: derived(
        F1_FLOW * F1_ISP * G0,
        `${EVAL}: the stage's mainstage propellant, 2,074,484 kg (Table 16-9), over the engine-seconds from range zero to the cutoffs (Table 2-2: 135.18 s for the centre, 163.60 for the four), ${F1_FLOW.toFixed(1)} kg/s an engine, at the reconstructed sea-level impulse (Table 5-1's mean, ${F1_ISP.toFixed(2)} s). The reconstruction's own thrusts at 35 to 38 s, reduced to standard sea level and pump inlet conditions, average 1,512 klbf (6,726 kN): the flight's ran higher as the oxygen's head rose`,
      ),
      isp: derived(
        F1_ISP,
        `${EVAL}, Table 5-1: the five engines' reconstructed sea-level specific impulse, their mean (264.6 to 265.9 lbf s/lbm)`,
      ),
      exitArea: assumed(
        Math.PI * ((11 * 12 + 7) * IN * 0.5) ** 2,
        'Rocketdyne F-1 fact sheet, Saturn V News Reference, p. R-1: the nozzle exit 11 ft 7 in across (saturn-v.md), the type’s figure taken for SA-508’s',
      ),
    },
    centreCut: doc(135.18, `${EVENTS} (§5.4: by a signal from the instrument unit, as planned)`),
    outboardCut: doc(163.6, `${EVENTS} (§5.4: by the oxygen low-level sensors, 0.40 s earlier than predicted)`),
    separation: doc(164.3, `${SEPARATIONS}; Table 2-2 has the command at the same instant, 0.7 s after the start of time base 3`),
    push: estimated(
      5,
      'm/s: NOT FOUND. The S-IC’s eight retrorockets and the S-II’s eight ullage motors parted the stages; how fast is not in the evaluation. Apollo 11’s estimate, taken',
    ),
  },
  sii: {
    mass: derived(487_944 + 3_665, `${MASS}: the S-II and the S-II/S-IVB interstage at holddown arm release (Table 16-1)`),
    skirt: {
      mass: doc(3_972, `${EVAL}, Tables 16-3 and 16-9, the large S-IC/S-II interstage`),
      at: doc(194.3, `${EVENTS}, second plane separation command`),
    },
    propellant: {
      load: derived(SII_LOAD, `${EVAL}, Table 16-3 at S-II ignition (166.0 s): the oxygen and hydrogen in and below the tanks`),
      usable: derived(
        SII_LOAD - SII_LEFT - SII_GAS,
        `${EVAL}, Table 16-3: less the ${SII_LEFT} kg in and below the tanks at outboard cutoff, and the ${SII_GAS} kg the tanks' ullage gas had grown by then, drawn off the propellant to pressurize the tanks and not through the engines (Table 6-1's flows exclude it). The engines' share so found, ${SII_LOAD - SII_LEFT - SII_GAS} kg, is within 101 kg of what Table 16-9 has them burn from the start's rise to the cutoff's decay (598 + 444,655 + 160 kg)`,
      ),
    },
    ignition: doc(
      168.0,
      `${EVENTS}, S-II mainstage (engine start command at 165.0 s, the start tank discharge valves open at 166.0 s): the start's rising thrust, and the 598 kg it burned (Table 16-9), are not flown`,
    ),
    centre: {
      thrust: doc(230_933 * LBF, `${EVAL}, Table 6-1, engine 5 (the centre) reconstructed at ESC+62 s: 230,933 lbf`),
      isp: doc(425.4, `${EVAL}, Table 6-1, engine 5: 425.4 lbf s/lbm`),
      cut: doc(
        330.65,
        `${EVENTS}, S-II engine no. 5 solenoid deactivation signal, 132.36 s before its planned cutoff; §6.3: at ESC+165.6 s it was shut down by its thrust-OK pressure switches' dropout, under oscillations of 14 to 16 Hz in the propulsion and structure (chamber pressure ±236 psi), see §8.2.3`,
      ),
      why: 'by itself, 132 s early: a 14 to 16 Hz oscillation dropped its thrust-OK pressure switches',
    },
    outboard: {
      thrust: derived(
        SII_THRUST * LBF,
        `${EVAL}, Table 6-1, engines 1 to 4 reconstructed at ESC+62 s, their mean (${SII_THRUST.toFixed(0)} lbf)`,
      ),
      isp: derived(SII_ISP, `${EVAL}, Table 6-1, engines 1 to 4, their mean (${SII_ISP.toFixed(3)} lbf s/lbm)`),
      cut: doc(
        592.64,
        `${EVENTS}, S-II outboard engine cutoff, 34.53 s later than predicted (Table 4-2: engine solenoid signal at the same instant)`,
      ),
      spent: 'by the stage’s oxygen depletion cutoff (§6.4 and §6.5: 34.5 s later than predicted, after the early centre cutoff)',
      shift: {
        at: doc(
          537.5,
          `${EVENTS}, S-II low engine mixture ratio shift (actual), 33.7 s later than predicted: the instrument unit commanded it at ESC+369.7 s on reaching a preprogrammed velocity increase (§6.5), which the early centre cutoff delayed`,
        ),
        before: doc(1, 'the high mixture ratio’s figures, as given'),
        after: derived(
          689_491 / 924_762,
          `${EVAL}, §6.3: the stage's thrust at ESC+421.6 s, 689,491 lbf, over the four engines' after the centre's cutoff, 924,762 lbf`,
        ),
      },
    },
    separation: doc(
      593.5,
      `${SEPARATIONS}; Table 2-2 has the command at 593.5 s, 0.9 s into time base 4, which the outboard cutoff started`,
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
    mass: doc(4_078, `${EVAL}, Table 16-9: the launch escape system let go after S-II mainstage`),
    at: doc(201.0, `${EVENTS}, launch escape tower jettison`),
  },
  sivb: {
    mass: derived(
      118_985 + 2_042 + 1_164 + 625,
      `${MASS}: the S-IVB and the instrument unit at holddown arm release (Table 16-1), and the adapter (Table 16-9: its panels, 1,164 kg, and the 625 kg of the spacecraft not separated)`,
    ),
    payload: {
      label: 'Aquarius, the lunar module, in the adapter',
      mass: doc(15_192, `${EVAL}, Table 16-9, the lunar module`),
      nodes: ['LMDescent', 'LMAscent'],
    },
    propellant: {
      load: derived(
        86_873 + 166 + 19_780 + 21,
        `${EVAL}, Table 16-5 at S-IC ignition: the oxygen and hydrogen in and below the tanks (Table 7-3's best estimate, 191,890 and 43,657 lbm, without what is below the valves)`,
      ),
      usable: derived(
        86_873 + 166 + 19_780 + 21 - (1_694 + 180 + 874 + 26) + 9.26 * SECOND_FLOW,
        `${EVAL}, Table 16-7: less the 1,874 kg of oxygen and 900 kg of hydrogen in and below the tanks at the second cutoff, which would have run the oxygen dry 9.26 s later (§7.9) at the second burn's flow (Table 7-2)`,
      ),
    },
    first: {
      thrust: doc(199_577 * LBF, `${EVAL}, Table 7-1, first burn at STDV+130 s, standard altitude conditions: 199,577 lbf`),
      isp: doc(427.2, `${EVAL}, Table 7-1: 427.2 lbf s/lbm`),
      ignition: doc(
        599.4,
        `${EVENTS}, S-IVB mainstage (its start tank discharge valve open at 596.9 s): the start's rising thrust, and the 156 kg it burned (Table 16-9), are not flown`,
      ),
      cutoff: doc(
        749.83,
        `${EVENTS}, velocity cutoff command (first guidance cutoff), 44.06 s later than predicted; §7.4: a burn of 152.9 s, 9.3 s longer than predicted "due to the performance of lower stages"`,
      ),
    },
    second: {
      thrust: doc(198_536 * LBF, `${EVAL}, Table 7-2, second burn at STDV+130 s, standard altitude conditions: 198,536 lbf`),
      isp: doc(427.2, `${EVAL}, Table 7-2: 427.2 lbf s/lbm`),
      ignition: doc(
        SECOND_MAINSTAGE,
        `${EVENTS}, S-IVB mainstage (second ignition, its start tank discharge valve open, at 9,346.4 s): the start's rising thrust, and the 150 kg it burned (Table 16-9), are not flown`,
      ),
      cutoff: doc(SECOND_CUT, `${EVENTS}, second guidance cutoff command`),
      speed: doc(10_839.5, `${CUTOFFS}: space-fixed velocity at the second guidance cutoff signal`),
      shift: {
        at: doc(
          SECOND_SHIFT,
          `${EVENTS}, engine mixture ratio shift (§7.9: the PU valve from the 4.5 position to the null at second ESC+110.6 s)`,
        ),
        before: derived(
          SECOND_EARLY / SECOND_FLOW,
          `${EVAL}: the second burn's mainstage propellant (Table 16-7, the stage at mainstage less at cutoff, ${SECOND_BURNED} kg) less what the null ratio's flow (Table 7-2, ${SECOND_FLOW.toFixed(2)} kg/s) burned from the shift to the cutoff, over the time from mainstage to the shift: ${SECOND_EARLY.toFixed(1)} kg/s at the 4.5 ratio, its thrust taken at the same impulse`,
        ),
        after: doc(1, 'the null mixture ratio’s figures (Table 7-2), as given'),
      },
      align: estimated(
        200,
        's: NOT FOUND. When the stack turned from its orbit attitude to the burn’s is not in Table 2-2; taken within the restart sequence, which began at 8,768.11 s (time base 6). Apollo 11’s estimate, taken',
      ),
      target: {
        altitude: doc(324_000, `${CUTOFFS}: altitude at the second guidance cutoff signal`),
        over: 'ellipsoid',
        climb: doc(7.182, `${CUTOFFS}: flight path angle at the second guidance cutoff signal`),
        inclination: doc(31.818, `${CUTOFFS}: inclination at the second guidance cutoff signal`),
      },
    },
    jets: estimated(
      0.05,
      'deg/s² about each axis: NOT FOUND. A 150 lbf attitude engine of the auxiliary propulsion modules ten metres from the stack’s centre of mass, against a 134 t stack some 37 m long (a uniform rod): of that order. Apollo 11’s estimate, taken',
    ),
  },
  csm: {
    mass: doc(28_936, `${EVAL}, Table 16-9, command and service modules`),
    cm: estimated(
      12_367.6 * LB,
      `${MR}, Table A-I: the command module after the modules parted at the end of the flight, the nearest figure read; it was heavier at launch by what it then used`,
    ),
  },
  ascent: {
    guidance: {
      azimuth: doc(72.043, `${EVAL}, §4.1: launched on an azimuth of 90°, rolled to a flight azimuth of 72.043°`),
      roll: {
        points: [
          [0, -17.957],
          [12.6, -17.957],
          [32.1, 0],
        ],
        confidence: 'derived',
        source: `${EVAL}, §4.1 and Table 2-2: the 17.957° from the pad's 90° to the flight azimuth, rolled between 12.6 and 32.1 s, taken as even`,
      },
      vertical: doc(12.6, `${EVENTS}, begin pitch and roll maneuver (the tower clearance yaw before it, 2.3 to 10.0 s, is not flown)`),
      kick: derived(163.3 - 12.6, `${EVENTS}: the tilt programme from its start to its arrest at 163.3 s`),
      programme: {
        points: [
          [0, 0],
          [12.6, 0],
          [30, 6.6],
          [35, 9.0],
          [40, 10.7],
          [45, 13.2],
          [50, 16.0],
          [55, 18.9],
          [60, 21.0],
          [65, 23.9],
          [70, 26.8],
          [75, 29.8],
          [80, 32.7],
          [85, 36.1],
          [90, 39.7],
          [95, 43.9],
          [105, 50.5],
          [110, 52.6],
          [115, 54.6],
          [120, 56.4],
          [125, 58.1],
          [130, 59.8],
          [135, 61.5],
          [140, 63.0],
          [145, 64.3],
          [155, 67.0],
          [160, 68.2],
          [163.3, 68.9],
          [165, 69.0],
        ],
        confidence: 'estimated',
        source: `${EVAL}, Fig. 9-4: the launch vehicle digital computer's pitch attitude command from the launch vertical, its line traced off the page scanned at 600 dpi against the figure's own grid (each gridline located where the line crosses it, the scan being turned a degree and unevenly stretched: a tenth of a degree and a second at best), flown open as the S-IC flew it and held from its arrest (163.3 s, Table 2-2; the figure's plateau, 69.0°) to the iterative guidance's start. Before 30 s the line drawn leaves zero ahead of the programme's start at 12.6 s (Table 2-2), which is taken, and the tilt run straight from it to the figure's 6.6° at 30 s, which the line drawn meets from 20 s; between 95 and 105 s the line has a corner the trace reads noisily, run straight`,
      },
      turn: doc(204.5, `${EVENTS}: the iterative guidance's first phase begins; its closed loop flown as the law's linear tangent`),
      target: {
        at: 'sivb-cutoff',
        altitude: doc(191_600, `${CUTOFFS}: altitude at the first guidance cutoff signal`),
        over: 'ellipsoid',
        climb: doc(0.004, `${CUTOFFS}: flight path angle at the first guidance cutoff signal`),
        inclination: doc(32.525, `${EVAL}, Table 4-5: the parking orbit's inclination`),
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
      ((14_949 * 3100 + 2_042 * 3355 + (1_789 + 15_192) * 3540 + 28_936 * 3805) / (14_949 + 2_042 + 1_789 + 15_192 + 28_936)) * IN,
      'the stack after the injection, its centre of mass above the F-1 exits: the S-IVB, the instrument unit, the adapter with Aquarius and Odyssey, each by its mass at the second cutoff (Tables 16-7 and 16-9) at the middle of its stretch of the model (saturn_v.py), taken for the record’s run',
    ),
  },
  bound: {
    for: 'the Moon',
    next: 'Swigert turned Odyssey round, docked with Aquarius and drew it out of the adapter, and the S-IVB was sent on to strike the Moon for Apollo 12’s seismometer; two days out an oxygen tank in Odyssey’s service module failed, and the crew came home round the Moon in Aquarius: none of it is flown here, the stack coasting on whole with the Moon pulling on it.',
  },
  orbit: {
    radius: doc(6_378_165, `${EVAL}, Table 4-5: apogee and perigee based on a spherical earth of radius 6,378.165 km`),
    perigee: doc(183_900, `${EVAL}, Table 4-5, actual`),
    apogee: doc(185_700, `${EVAL}, Table 4-5, actual`),
    inclination: doc(32.525, `${EVAL}, Table 4-5, actual`),
    period: doc(88.19 * 60, `${EVAL}, Table 4-5, actual`),
    kind: {
      is: 'osculating',
      confidence: 'derived',
      source: `${EVAL}, Table 4-5: the insertion conditions, the orbit at 759.83 s from its state; its period is the Kepler period of its heights over the stated ball (88.19 min)`,
    },
    injection: {
      at: doc(759.83, `${EVAL}, Table 4-5, parking orbit insertion (Table 2-2: 759.8 s)`),
      heading: 'north',
      arc: derived(
        26.2,
        `${CUTOFFS}: 2,840.2 km surface range at the first cutoff and ten seconds more at 7,791 m/s, over a 6,378 km ball`,
      ),
      anomaly: estimated(0, 'on an orbit so near a circle (eccentricity 0.0001, Table 4-5) the place of perigee means little'),
    },
    mass: doc(134_408, `${EVAL}, Table 16-5: the stack at the end of the first burn's decay, 750.00 s`),
  },
  marks: [
    { id: 'mach-1', label: 'Mach 1', at: doc(68.4, EVENTS) },
    { id: 'max-q', label: 'Greatest dynamic pressure', at: doc(81.3, EVENTS) },
    { id: 'insertion', label: 'Parking orbit insertion', at: doc(759.83, `${EVAL}, Table 4-5`) },
    { id: 'tli', label: 'Translunar injection', at: doc(9_707.2, EVENTS) },
  ],
  checks: [
    check('maxQ', 'Greatest dynamic pressure', 31_200, 'Pa', 3_000, `${EVAL}, Table 4-1: 3.12 N/cm²`),
    check('maxQAt', 'Greatest dynamic pressure, when', 81.3, 's', 6, `${EVAL}, Table 4-1`),
    check('firstG', 'Greatest load on the S-IC', 3.83, 'g', 0.2, `${EVAL}, Table 4-1, at 163.70 s`),
    check('sic-centre-cutoff.speed', 'Speed at S-IC centre engine cutoff (space-fixed)', 1_928.9, 'm/s', 40, CUTOFFS),
    check('sic-centre-cutoff.altitude', 'Height at S-IC centre engine cutoff', 43_500, 'm', 2_500, CUTOFFS),
    check('sic-separation.speed', 'Speed at S-IC/S-II separation (space-fixed)', 2_754.3, 'm/s', 50, SEPARATIONS),
    check('sic-separation.altitude', 'Height at S-IC/S-II separation', 68_000, 'm', 3_000, SEPARATIONS),
    check('sic-separation.climb', 'Climb at S-IC/S-II separation', 19.383, '°', 1.5, SEPARATIONS),
    check('sii-centre-cutoff.speed', 'Speed at S-II centre engine cutoff (space-fixed)', 3_919.6, 'm/s', 60, CUTOFFS),
    check('sii-centre-cutoff.altitude', 'Height at S-II centre engine cutoff', 159_600, 'm', 5_000, CUTOFFS),
    // (the four's cut is the run's own, when its propellant is spent: saturn-v-plan.ts `siiSpent`)
    check('sii-outboard-cutoff.stop', 'S-II outboard engines cutoff, when (oxygen depletion)', 592.64, 's', 2, CUTOFFS),
    check('sii-separation.speed', 'Speed at S-II/S-IVB separation (space-fixed)', 6_895.9, 'm/s', 60, SEPARATIONS),
    check('sii-separation.altitude', 'Height at S-II/S-IVB separation', 189_200, 'm', 5_000, SEPARATIONS),
    check('cutoffAt', 'S-IVB first cutoff, when', 749.83, 's', 5, EVENTS),
    check('insertion.speed', 'Speed at parking orbit insertion (space-fixed)', 7_792.5, 'm/s', 5, `${EVAL}, Table 4-5`),
    check('injection.at', 'S-IVB second cutoff, when', SECOND_CUT, 's', 5, EVENTS),
    check('injection.mass', 'The stack at the second cutoff', 62_911, 'kg', 1_500, `${EVAL}, Table 16-7`),
    check(
      'injection.energy',
      'C3 at the second cutoff',
      -1_463_628,
      'm²/s²',
      30_000,
      `${CUTOFFS}: C3 at the second guidance cutoff signal`,
    ),
    check('injection.eccentricity', 'Eccentricity at the second cutoff', 0.9758, '', 0.002, CUTOFFS),
  ],
  coastFixes: [
    fix(SEPARATIONS, 164.3, 28.864, -79.666, 68.0, 2_754.3, 19.383, 75.693),
    fix(SEPARATIONS, 593.5, 32.087, -62.38, 189.2, 6_895.9, 0.65, 83.38),
    fix(`${EVAL}, Table 4-5, actual`, 759.83, 32.694, -50.49, 191.6, 7_792.5, 0.005, 90.148),
    fix(
      `${SEPARATIONS}: S-IVB/CSM separation, not flown, the stack coasting on whole`,
      11_198.9,
      26.952,
      -129.677,
      6_997.9,
      7_628.9,
      45.03,
      72.315,
    ),
  ],
  aborts: [
    {
      until: doc(201.0, `${EVENTS}, launch escape tower jettison`),
      does: 'Mode I: the escape tower pulls the command module off the launch vehicle, to come down in the Atlantic. Said, not flown: the command module’s escape and its descent are not in this flight’s plan',
    },
    {
      until: doc(9 * 60 + 48, `${AFJ}: CapCom Kerwin’s mark for Mode IV capability at 000:09:48`),
      does: 'Mode II: the crew separate by hand, turn for entry and fly it at full lift, to come down in the Atlantic. Said, not flown',
    },
    {
      from: doc(9 * 60 + 48, `${AFJ}: CapCom Kerwin’s mark for Mode IV capability at 000:09:48`),
      until: doc(759.83, `${EVAL}, Table 4-5, parking orbit insertion`),
      does: 'Mode IV: the CSM separates from the S-IVB and its service engine puts it in Earth orbit, to fly the mission as an Earth-orbital alternate. Said, not flown',
    },
    {
      until: doc(759.83, `${EVAL}, Table 4-5, parking orbit insertion`),
      does: 'Mode III: the CSM separates, burns retrograde on its service engine if it must, and the command module flies half lift to land in the eastern Atlantic. Said, not flown',
    },
  ],
};

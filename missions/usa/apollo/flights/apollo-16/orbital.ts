/**
 * Apollo 16's launch as its records have it: SA-511 from Pad 39A through the translunar injection, the record the plan is
 * written from (vehicles/saturn-v-plan.ts `saturnVPlan`). All times are range time, s from range zero (17:54:00 UT,
 * on time). The launch vehicle's figures are MSFC's flight evaluation's (MPR-SAT-FE-72-1): its event times (Tables 2-1
 * and 2-2), its trajectory at each event (Tables 4-1 to 4-4), its engines' reconstructed performance (Tables 5-2, 6-1,
 * 7-1, 7-2, §6.3) and its mass at each event (Tables 16-1 to 16-9). SA-511 was the second J mission's Saturn V: its S-IC
 * the first to part from the S-II on eight retromotors fired 1.7 s after the outboard cutoff (§10.6.1), its S-II without
 * ullage motors, its S-II centre engine cut early as planned and its four outboard engines burned until the stage's oxygen
 * ran down to its depletion sensors, and the run finds when (`sii.outboard.spent`), as the S-IVB's guidance finds when the
 * parking orbit is reached. What is read, what disagrees and what is estimated is in mission.md beside this file.
 */
import { assumed, derived, doc, estimated } from '../../../../../src/measure.ts';
import type { OrbitFix, PlanCheck } from '../../../../../src/sim/plan.ts';
import type { SaturnVRecord } from '../../vehicles/saturn-v-record.ts';

const IN = 0.0254;
const LB = 0.45359237;
const LBF = 4.448221615;
const G0 = 9.80665;
const EVAL = 'Saturn V Launch Vehicle Flight Evaluation Report AS-511, Apollo 16 Mission (MSFC, MPR-SAT-FE-72-1)';
const EVENTS = `${EVAL}, Table 2-2, actual range time`;
const MASS = `${EVAL}, Tables 16-1 to 16-9 (actual, kg)`;
const MR = 'Apollo 16 Mission Report (MSC-07230)';
const AFJ = 'Apollo 16 Flight Journal, launch (apollojournals.org/afj/ap16fj/01_Day1_Pt1.html), the air-to-ground';

/** The F-1s' mainstage propellant (Table 16-9) over the engine-seconds the run burns them from range zero: one engine's flow, kg/s. */
const F1_FLOW = 2_072_221 / (137.85 + 4 * 161.78);
/** Table 5-2: the five F-1s' sea-level specific impulse as reconstructed, lbf s/lbm (s), their mean. */
const F1_ISP = (266.2 + 265.4 + 265.1 + 266.0 + 264.7) / 5;
/** The S-IC's oxygen below its tank at holddown arm release, kg: Table 16-2's 48,237 lbm (the kilogram table prints 21,980). */
const SIC_LOX_BELOW = 21_880;
/** The S-II's outboard J-2s at ESC+61 s (Table 6-1, engines 1 to 4, reconstructed): thrust, lbf, and impulse, s, their means. */
const SII_THRUST = (232_451 + 231_549 + 232_580 + 231_445) / 4;
const SII_ISP = (425.2 + 423.1 + 424.5 + 424.7) / 4;
/** The S-II's propellant at ignition and at its outboard cutoff (Table 16-3): liquid in and below the tanks, and the gas over it, kg. */
const SII_LOAD = 383_073 + 737 + 72_713 + 111;
const SII_LEFT = 637 + 787 + 1_184 + 123;
const SII_GAS = 1_896 - 136 + (758 - 44);
/** The S-IVB's second burn: its mainstage propellant (Table 16-7) and the flow at the 5.0 mixture ratio (Table 7-2), kg and kg/s. */
const SECOND_BURNED = 88_334 - 14_951;
const SECOND_FLOW = (399.98 + 81.49) * LB;
const SECOND_SHIFT = 9264.9;
const SECOND_MAINSTAGE = 9219.0;
const SECOND_CUT = 9558.41;
/** What the second burn drew before its mixture-ratio shift, kg/s: what it burned less what the 5.0 ratio's flow burned after. */
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
  label: 'Saturn V SA-511 with CSM-113 Casper and LM-11 Orion',
  liftoff: doc(2_916_443, `${EVAL}, Table 16-1, total vehicle at holddown arm release (first motion, 0.30 s)`),
  sic: {
    mass: derived(
      2_239_291 + 4_577 - 3_960,
      `${MASS}: the S-IC at holddown arm release (Table 16-1, 2,239,291 kg), and of the S-IC/S-II interstage (Table 16-1, 4,577 kg) what is not the large interstage let go at the second plane (Table 16-3, 3,960 kg): the small interstage that left with the S-IC (Table 16-9, 616 kg). SA-511's S-II carried no ullage motors (Tables 16-3 and 16-9: none, and no propellant for them)`,
    ),
    propellant: {
      load: derived(
        1_442_768 + SIC_LOX_BELOW + 635_580 + 6_009,
        `${EVAL}, Table 16-1 at holddown arm release: the oxygen and RP-1 in and below the tanks (§5.2's reconstruction has 3,228,997 and 1,414,463 lbm, within 6 kg of each). The kilogram table prints 21,980 kg of oxygen below the tank, defaced: its pound table (48,237 lbm), its stage total and §5.2 give 21,880`,
      ),
      usable: derived(
        1_442_768 + SIC_LOX_BELOW + 635_580 + 6_009 - (909 + 14_524) - (8_362 + 5_971),
        `${EVAL}, Table 16-1: less the 15,433 kg of oxygen and 14,333 kg of RP-1 in and below the tanks at outboard cutoff, which the oxygen's low-level sensors called (§5.5: 34,028 and 31,601 lbm)`,
      ),
    },
    f1: {
      thrust: derived(
        F1_FLOW * F1_ISP * G0,
        `${EVAL}: the stage's mainstage propellant, 2,072,221 kg (Table 16-9), over the engine-seconds from range zero to the cutoffs (Table 2-2: 137.85 s for the centre, 161.78 for the four), ${F1_FLOW.toFixed(1)} kg/s an engine, at the reconstructed sea-level impulse (Table 5-2's mean, ${F1_ISP.toFixed(2)} s). The reconstruction's own thrusts at 35 to 38 s, reduced to standard sea level and pump inlet conditions, average 1,524 klbf (6,779 kN): the flight's ran higher as the oxygen's head rose`,
      ),
      isp: derived(
        F1_ISP,
        `${EVAL}, Table 5-2: the five engines' reconstructed sea-level specific impulse, reduced to standard conditions, their mean (264.7 to 266.2 lbf s/lbm)`,
      ),
      exitArea: assumed(
        Math.PI * ((11 * 12 + 7) * IN * 0.5) ** 2,
        'Rocketdyne F-1 fact sheet, Saturn V News Reference, p. R-1: the nozzle exit 11 ft 7 in across (saturn-v.md), the type’s figure taken for SA-511’s',
      ),
    },
    centreCut: doc(137.85, `${EVENTS} (§5.4: by a signal from the instrument unit, 0.11 s earlier than planned)`),
    outboardCut: doc(
      161.78,
      `${EVENTS} (§5.4: by the oxygen low-level sensors, 0.31 s earlier than predicted, most of it a bulk fuel temperature higher than predicted)`,
    ),
    separation: doc(
      163.5,
      `${SEPARATIONS}; Table 2-2 has the command to fire the separation devices and retromotors at the same instant, 1.7 s after the start of time base 3 (§10.6.1: the delay lengthened from AS-509's 0.7 s)`,
    ),
    push: estimated(
      10,
      `m/s: ${EVAL}, Fig. 10-14 and §10.6.1: S-IC-11 was the first S-IC to part on eight retromotors fired 1.7 s after the outboard cutoff (S-IC-10 had four), the S-II carrying no ullage motors; how long they burned and their impulse could not be found from the data. The separation distance the figure reconstructs from the S-IC's longitudinal acceleration grows at some 34 ft/s between 2.6 and 3.0 s after the cutoff, read off the page against its grid, and slows to some 26 ft/s by 4 s; its greatest rate taken`,
    ),
  },
  sii: {
    mass: derived(493_536 + 3_653, `${MASS}: the S-II and the S-II/S-IVB interstage at holddown arm release (Table 16-1)`),
    skirt: {
      mass: doc(3_960, `${EVAL}, Tables 16-3 and 16-9, the large S-IC/S-II interstage`),
      at: doc(193.5, `${EVENTS}, second plane separation command`),
    },
    propellant: {
      load: derived(SII_LOAD, `${EVAL}, Table 16-3 at S-II ignition (165.2 s): the oxygen and hydrogen in and below the tanks`),
      usable: derived(
        SII_LOAD - SII_LEFT - SII_GAS,
        `${EVAL}, Table 16-3: less the ${SII_LEFT} kg in and below the tanks at outboard cutoff, and the ${SII_GAS} kg the tanks' ullage gas had grown by then, drawn off the propellant to pressurize the tanks and not through the engines (Table 6-1's flows exclude it). The engines' share so found, ${SII_LOAD - SII_LEFT - SII_GAS} kg, is within 75 kg of what Table 16-9 has them burn from the start's rise to the cutoff's decay (579 + 450,797 + 128 kg)`,
      ),
    },
    ignition: doc(
      167.2,
      `${EVENTS}, S-II mainstage (engine start command at 164.2 s, the start tank discharge valves open at 165.2 s): the start's rising thrust, and the 579 kg it burned (Table 16-9), are not flown`,
    ),
    centre: {
      thrust: doc(235_509 * LBF, `${EVAL}, Table 6-1, engine 5 (the centre) reconstructed at ESC+61 s: 235,509 lbf`),
      isp: doc(424.2, `${EVAL}, Table 6-1, engine 5: 424.2 lbf s/lbm`),
      cut: doc(
        461.77,
        `${EVENTS}, S-II center engine cutoff; §6.1 and §6.3: initiated by the instrument unit at ESC+297.57 s, as planned. The evaluation gives no reason for the early cut; SA-511's centre engine flew a LOX feedline accumulator against pogo, the third stage to (§6.9), and the 16 Hz oscillation did not come (§8.1)`,
      ),
      why: 'early, as planned',
    },
    outboard: {
      thrust: derived(
        SII_THRUST * LBF,
        `${EVAL}, Table 6-1, engines 1 to 4 reconstructed at ESC+61 s, their mean (${SII_THRUST.toFixed(0)} lbf)`,
      ),
      isp: derived(SII_ISP, `${EVAL}, Table 6-1, engines 1 to 4, their mean (${SII_ISP.toFixed(3)} lbf s/lbm)`),
      cut: doc(559.54, `${EVENTS}, S-II outboard engine cutoff, 0.33 s later than predicted (Table 4-2 at the same instant)`),
      spent:
        'by the stage’s oxygen depletion cutoff (§6.1 and §6.4: 0.33 s later than predicted, for the low mixture ratio step 2.0 s early and leaner than planned)',
      shift: {
        at: doc(494.5, `${EVENTS}, S-II low engine mixture ratio shift (actual), 2.3 s earlier than predicted (§6.3: ESC+330.3 s)`),
        before: doc(1, 'the high mixture ratio’s figures, as given'),
        after: derived(
          787_380 / 923_267,
          `${EVAL}, §6.3: the stage's thrust at ESC+351 s, 787,380 lbf, over the four engines' after the centre's cutoff, 923,267 lbf`,
        ),
      },
    },
    separation: doc(
      560.5,
      `${SEPARATIONS}; Table 2-2 has the command at 560.5 s, 1.0 s into time base 4, which the outboard cutoff started`,
    ),
    push: estimated(
      3,
      'm/s: NOT FOUND. The S-II’s retrorockets and the S-IVB’s two ullage motors parted the stages (§10.6.3: both fired, the dynamics normal). Apollo 14’s estimate (Apollo 11’s), taken',
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
    mass: doc(4_158, `${EVAL}, Table 16-9: the launch escape system let go after S-II mainstage`),
    at: doc(199.8, `${EVENTS}, launch escape tower jettison`),
  },
  sivb: {
    mass: derived(
      120_583 + 2_042 + 1_170 + 625,
      `${MASS}: the S-IVB and the instrument unit at holddown arm release (Table 16-1), and the adapter (Table 16-9: its panels, 1,170 kg, and the 625 kg of the spacecraft not separated)`,
    ),
    payload: {
      label: 'Orion, the lunar module, in the adapter, with the second lunar rover folded in its descent stage',
      mass: doc(
        16_436,
        `${EVAL}, Table 16-9, the lunar module: the rover folded in its descent stage's quadrant I is within it, the evaluation giving it no row of its own (${MR}, Table A-IV: the lunar module at Earth launch, 36,255 lb)`,
      ),
      nodes: ['LMDescent', 'LMAscent'],
    },
    propellant: {
      load: derived(
        88_452 + 166 + 19_815 + 19,
        `${EVAL}, Table 16-5 at S-IC ignition: the oxygen and hydrogen in and below the tanks (its pound table: 195,005 and 367 lbm of oxygen, 43,685 and 42 lbm of hydrogen)`,
      ),
      usable: derived(
        88_452 + 166 + 19_815 + 19 - (1_574 + 180 + 980 + 23) + 8.24 * SECOND_FLOW,
        `${EVAL}, Table 16-7: less the 1,754 kg of oxygen and 1,003 kg of hydrogen in and below the tanks at the second cutoff, which would have run the oxygen dry 8.24 s later (§7.9) at the second burn's flow (Table 7-2)`,
      ),
    },
    first: {
      thrust: doc(206_439 * LBF, `${EVAL}, Table 7-1, first burn at STDV+140 s, standard altitude conditions: 206,439 lbf`),
      isp: doc(429.5, `${EVAL}, Table 7-1: 429.5 lbf s/lbm`),
      ignition: doc(
        566.1,
        `${EVENTS}, S-IVB mainstage (its start tank discharge valve open at 563.6 s): the start's rising thrust, and the 160 kg it burned (Table 16-9), are not flown`,
      ),
      cutoff: doc(
        706.21,
        `${EVENTS}, velocity cutoff command no. 1 (first guidance cutoff), 0.72 s later than predicted; §7.1: a burn of 142.6 s, 0.4 s longer than predicted, 1.0 s of it for the lower stages' performance and 0.6 s less for the S-IVB's higher thrust`,
      ),
    },
    second: {
      thrust: doc(206_807 * LBF, `${EVAL}, Table 7-2, second burn at STDV+140 s, standard altitude conditions: 206,807 lbf`),
      isp: doc(429.5, `${EVAL}, Table 7-2: 429.5 lbf s/lbm`),
      ignition: doc(
        SECOND_MAINSTAGE,
        `${EVENTS}, S-IVB mainstage (second ignition, its start tank discharge valve open, at 9,216.5 s): the start's rising thrust, and the 159 kg it burned (Table 16-9), are not flown`,
      ),
      cutoff: doc(SECOND_CUT, `${EVENTS}, second guidance cutoff command no. 1, 1.79 s earlier than predicted`),
      speed: doc(10_847.8, `${CUTOFFS}: space-fixed velocity at the second guidance cutoff signal`),
      shift: {
        at: doc(
          SECOND_SHIFT,
          `${EVENTS}, engine mixture ratio control valve shift (§7.9: lit at the full open 4.5 position, the valve commanded to the closed, some 5.0, at second ESC+56 s)`,
        ),
        before: derived(
          SECOND_EARLY / SECOND_FLOW,
          `${EVAL}: the second burn's mainstage propellant (Table 16-7, the stage at mainstage less at cutoff, ${SECOND_BURNED} kg) less what the 5.0 ratio's flow (Table 7-2, ${SECOND_FLOW.toFixed(2)} kg/s) burned from the shift to the cutoff, over the time from mainstage to the shift: ${SECOND_EARLY.toFixed(1)} kg/s at the 4.5 ratio, its thrust taken at the same impulse`,
        ),
        after: doc(1, 'the 5.0 mixture ratio’s figures (Table 7-2), as given'),
      },
      align: estimated(
        200,
        's: NOT FOUND. When the stack turned from its orbit attitude to the burn’s is not in Table 2-2; taken within the restart sequence, which began at 8,638.6 s (time base 6). Apollo 14’s estimate (Apollo 11’s), taken',
      ),
      target: {
        altitude: doc(303_400, `${CUTOFFS}: altitude at the second guidance cutoff signal`),
        over: 'ellipsoid',
        climb: doc(7.012, `${CUTOFFS}: flight path angle at the second guidance cutoff signal`),
        inclination: doc(32.512, `${CUTOFFS}: inclination at the second guidance cutoff signal`),
      },
    },
    jets: estimated(
      0.05,
      'deg/s² about each axis: NOT FOUND. A 150 lbf attitude engine of the auxiliary propulsion modules ten metres from the stack’s centre of mass, against a 140 t stack some 37 m long (a uniform rod): of that order. Apollo 14’s estimate (Apollo 11’s), taken',
    ),
  },
  csm: {
    mass: derived(
      52_759 - 16_436 - 4_158 - 1_170 - 625,
      `${MASS}: the spacecraft at holddown arm release (Table 16-1, 52,759 kg) less the lunar module, the escape system, the adapter's panels and what of it stayed with the S-IVB (Table 16-9), which lists the command and service modules at 30,367 kg, its rows summing 3 kg short of its spacecraft`,
    ),
    cm: estimated(
      13_026 * LB,
      `${MR}, Table A-IV: the command module after the modules parted at the end of the flight, the nearest figure read; it was heavier at launch by what it then used`,
    ),
  },
  ascent: {
    guidance: {
      azimuth: doc(
        72.034,
        `${EVAL}, §4.1: launched on an azimuth of 90°, "a roll maneuver was initiated at 12.7 seconds that placed the vehicle on a flight azimuth of 72.034 degrees east of north"`,
      ),
      roll: {
        points: [
          [0, -17.966],
          [12.7, -17.966],
          [31.8, 0],
        ],
        confidence: 'derived',
        source: `${EVAL}, §4.1 and Table 2-2: the 17.966° from the pad's 90° to the flight azimuth, rolled between 12.7 and 31.8 s, taken as even`,
      },
      vertical: doc(12.7, `${EVENTS}, begin pitch and roll maneuver (the tower clearance yaw before it, 1.7 to 10.9 s, is not flown)`),
      kick: derived(158.9 - 12.7, `${EVENTS}: the tilt programme from its start to its arrest at 158.9 s`),
      programme: {
        points: [
          [0, 0],
          [12.7, 0],
          [15, 0.94],
          [20, 1.95],
          [25, 3.81],
          [30, 6.2],
          [35, 8.06],
          [40, 10.69],
          [45, 13.4],
          [50, 15.99],
          [55, 18.57],
          [60, 21.41],
          [65, 24.03],
          [70, 27.01],
          [75, 29.73],
          [80, 32.46],
          [85, 35.65],
          [90, 39.54],
          [95, 43.42],
          [100, 46.37],
          [105, 49.05],
          [110, 51.56],
          [115, 53.56],
          [120, 55.35],
          [125, 57.12],
          [130, 58.86],
          [135, 60.33],
          [140, 61.77],
          [145, 63.17],
          [150, 64.45],
          [155, 65.74],
          [160, 66.97],
          [162.5, 67.6],
        ],
        confidence: 'estimated',
        source: `${EVAL}, Fig. 9-12: the pitch attitude angle telemetered during the first burn, from the launch vertical, its line traced off the page scanned at 600 dpi against the figure's own grid (100 s and 10° a square, some a quarter of a second and a twentieth of a degree to the pixel; the gridlines' skew taken out, the columns where the line crosses a gridline left out), fitted over five seconds and read every five, flown open as the S-IC flew it. Before 15 s the line, drawn on the frame's top edge, cannot be told from it: the programme's start at 12.7 s (Table 2-2) is taken. The line reaches the figure's plateau, 67.6°, at 162.5 s, which is held to the iterative guidance's start; it dips past it to 68.5° at 168 s, through the S-IC's cutoff and separation, and comes back by 178 s: that is the vehicle's own motion at staging and not taken. Table 2-2 has the tilt arrested at 158.9 s, where the line reads 66.7°`,
      },
      turn: doc(204.5, `${EVENTS}: the iterative guidance's first phase initiated; its closed loop flown as the law's linear tangent`),
      target: {
        at: 'sivb-cutoff',
        altitude: doc(172_900, `${CUTOFFS}: altitude at the first guidance cutoff signal`),
        over: 'ellipsoid',
        climb: doc(0.003, `${CUTOFFS}: flight path angle at the first guidance cutoff signal`),
        inclination: doc(32.54, `${EVAL}, Table 4-4: the parking orbit's inclination`),
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
      ((14_951 * 3100 + 2_042 * 3355 + (1_795 + 16_436) * 3540 + 30_370 * 3805) / (14_951 + 2_042 + 1_795 + 16_436 + 30_370)) * IN,
      'the stack after the injection, its centre of mass above the F-1 exits: the S-IVB, the instrument unit, the adapter with Orion (and the rover folded in it) and Casper, each by its mass at the second cutoff (Tables 16-7 and 16-9) at the middle of its stretch of the model (saturn_v.py), taken for the record’s run',
    ),
  },
  bound: {
    for: 'the Moon',
    next: 'Mattingly turned Casper round and docked with Orion, drew it out of the adapter, and the S-IVB was sent on to strike the Moon; Young and Duke landed Orion in the Descartes highlands six hours late and drove the second lunar rover, which had ridden folded in Orion’s descent stage: none of it is flown here, the stack coasting on whole with the Moon pulling on it, and the rover, carried in Orion’s mass, is not driven in flight (it can be driven in its gallery).',
  },
  orbit: {
    radius: doc(6_378_165, `${EVAL}, Table 4-4: apogee and perigee based on a spherical earth of radius 6,378.165 km`),
    perigee: doc(166_600, `${EVAL}, Table 4-4, actual`),
    apogee: doc(168_000, `${EVAL}, Table 4-4, actual`),
    inclination: doc(32.54, `${EVAL}, Table 4-4, actual`),
    period: doc(87.84 * 60, `${EVAL}, Table 4-4, actual`),
    kind: {
      is: 'osculating',
      confidence: 'derived',
      source: `${EVAL}, Table 4-4: the insertion conditions, the orbit at 716.21 s from its state; its period is the Kepler period of its heights over the stated ball (87.84 min)`,
    },
    injection: {
      at: doc(716.21, `${EVAL}, Table 4-4, parking orbit insertion (Table 2-2: 716.2 s)`),
      heading: 'north',
      arc: derived(
        24.5,
        `${CUTOFFS}: 2,648.6 km surface range at the first cutoff and ten seconds more at 7,804 m/s, over a 6,378 km ball`,
      ),
      anomaly: estimated(0, 'on an orbit so near a circle (eccentricity 0.0001, Table 4-4) the place of perigee means little'),
    },
    mass: doc(140_075, `${EVAL}, Table 16-5: the stack at the end of the first burn's decay, 706.40 s`),
  },
  marks: [
    { id: 'mach-1', label: 'Mach 1', at: doc(67.5, EVENTS) },
    { id: 'max-q', label: 'Greatest dynamic pressure', at: doc(86.0, EVENTS) },
    { id: 'insertion', label: 'Parking orbit insertion', at: doc(716.21, `${EVAL}, Table 4-4`) },
    { id: 'tli', label: 'Translunar injection', at: doc(9_568.4, EVENTS) },
  ],
  checks: [
    check('maxQ', 'Greatest dynamic pressure', 34_800, 'Pa', 3_000, `${EVAL}, Table 4-1: 3.48 N/cm²`),
    check('maxQAt', 'Greatest dynamic pressure, when', 86.0, 's', 6, `${EVAL}, Table 4-1`),
    check('firstG', 'Greatest load on the S-IC', 3.85, 'g', 0.2, `${EVAL}, Table 4-1, at 161.78 s`),
    check('sic-centre-cutoff.speed', 'Speed at S-IC centre engine cutoff (space-fixed)', 2_028.4, 'm/s', 40, CUTOFFS),
    check('sic-centre-cutoff.altitude', 'Height at S-IC centre engine cutoff', 45_400, 'm', 2_500, CUTOFFS),
    check('sic-separation.speed', 'Speed at S-IC/S-II separation (space-fixed)', 2_737.1, 'm/s', 50, SEPARATIONS),
    check('sic-separation.altitude', 'Height at S-IC/S-II separation', 67_700, 'm', 3_000, SEPARATIONS),
    check('sic-separation.climb', 'Climb at S-IC/S-II separation', 19.642, '°', 1.5, SEPARATIONS),
    check('sii-centre-cutoff.speed', 'Speed at S-II centre engine cutoff (space-fixed)', 5_596.5, 'm/s', 60, CUTOFFS),
    check('sii-centre-cutoff.altitude', 'Height at S-II centre engine cutoff', 171_100, 'm', 5_000, CUTOFFS),
    // (the four's cut is the run's own, when its propellant is spent: saturn-v-plan.ts `siiSpent`)
    check('sii-outboard-cutoff.stop', 'S-II outboard engines cutoff, when (oxygen depletion)', 559.54, 's', 2, CUTOFFS),
    check('sii-separation.speed', 'Speed at S-II/S-IVB separation (space-fixed)', 6_970.3, 'm/s', 60, SEPARATIONS),
    check('sii-separation.altitude', 'Height at S-II/S-IVB separation', 173_000, 'm', 5_000, SEPARATIONS),
    check('cutoffAt', 'S-IVB first cutoff, when', 706.21, 's', 5, EVENTS),
    check('insertion.speed', 'Speed at parking orbit insertion (space-fixed)', 7_804.4, 'm/s', 5, `${EVAL}, Table 4-4`),
    check('injection.at', 'S-IVB second cutoff, when', SECOND_CUT, 's', 5, EVENTS),
    check('injection.mass', 'The stack at the second cutoff', 65_594, 'kg', 1_500, `${EVAL}, Table 16-7`),
    check(
      'injection.energy',
      'C3 at the second cutoff',
      -1_657_301,
      'm²/s²',
      30_000,
      `${CUTOFFS}: C3 at the second guidance cutoff signal`,
    ),
    check('injection.eccentricity', 'Eccentricity at the second cutoff', 0.9726, '', 0.002, CUTOFFS),
  ],
  coastFixes: [
    fix(SEPARATIONS, 163.5, 28.872, -79.667, 67.7, 2_737.1, 19.642, 75.335),
    fix(SEPARATIONS, 560.5, 31.949, -63.746, 173.0, 6_970.3, 0.36, 82.63),
    fix(`${EVAL}, Table 4-4, actual`, 716.21, 32.695, -52.53, 172.9, 7_804.4, 0.003, 88.94),
    fix(
      `${SEPARATIONS}: S-IVB/CSM separation, not flown, the stack coasting on whole`,
      11_099.0,
      26.1,
      -134.563,
      7_168.0,
      7_566.5,
      45.397,
      69.807,
    ),
  ],
  aborts: [
    {
      until: doc(199.8, `${EVENTS}, launch escape tower jettison`),
      does: 'Mode I: the escape tower pulls the command module off the launch vehicle, to come down in the Atlantic. Said, not flown: the command module’s escape and its descent are not in this flight’s plan',
    },
    {
      until: doc(9 * 60 + 20, `${AFJ}: CapCom Fullerton’s mark for Mode IV capability at 000:09:20`),
      does: 'Mode II: the crew separate by hand, turn for entry and fly it at full lift, to come down in the Atlantic. Said, not flown',
    },
    {
      from: doc(9 * 60 + 20, `${AFJ}: CapCom Fullerton’s mark for Mode IV capability at 000:09:20`),
      until: doc(716.21, `${EVAL}, Table 4-4, parking orbit insertion`),
      does: 'Mode IV: the CSM separates from the S-IVB and its service engine puts it in Earth orbit, to fly the mission as an Earth-orbital alternate. Said, not flown',
    },
    {
      until: doc(716.21, `${EVAL}, Table 4-4, parking orbit insertion`),
      does: 'Mode III: the CSM separates, burns retrograde on its service engine if it must, and the command module flies half lift to land in the eastern Atlantic. Said, not flown',
    },
  ],
};

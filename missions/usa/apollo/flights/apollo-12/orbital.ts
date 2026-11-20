/**
 * Apollo 12's launch as its records have it: SA-507 from Pad 39A through the translunar injection, the record the plan is
 * written from (vehicles/saturn-v-plan.ts `saturnVPlan`). All times are range time, s from range zero (16:22:00 UT).
 * The launch vehicle's figures are MSFC's flight evaluation's (MPR-SAT-FE-70-1): its event times (Table 2-2), its
 * trajectory at each event (Tables 4-1 to 4-6), its engines' reconstructed performance (Tables 5-1, 6-1, 7-1, 7-2) and its
 * mass at each event (Tables 17-1 to 17-9, read off the page). The report gives its engines in pounds, which are turned to
 * newtons here and nothing more. What is read, what disagrees and what is estimated is in mission.md beside this file. The
 * two lightning strikes, at 36.5 and 52 s, are not flown: they did not move the launch vehicle (mission.md).
 */
import { assumed, derived, doc, estimated } from '../../../../../src/measure.ts';
import type { OrbitFix, PlanCheck } from '../../../../../src/sim/plan.ts';
import type { SaturnVRecord } from '../../vehicles/saturn-v-record.ts';

const IN = 0.0254;
const LB = 0.45359237;
const LBF = 4.4482216152605;
const G0 = 9.80665;
const EVAL = 'Saturn V Launch Vehicle Flight Evaluation Report AS-507, Apollo 12 Mission (MSFC, MPR-SAT-FE-70-1, 30 January 1970)';
const EVENTS = `${EVAL}, Table 2-2, actual range time`;
const MASS = `${EVAL}, Tables 17-1 to 17-9 (actual, kg)`;
const MR = 'Apollo 12 Mission Report (MSC-01855, March 1970)';
const KIT = 'NASA Apollo 12 press kit (release 69-148, 5 November 1969)';
const KIT11 = 'NASA Apollo 11 press kit (release 69-83K, 6 July 1969), p. 78';

/** The F-1s' mainstage propellant (Table 17-9) over the engine-seconds the run burns them from range zero: one engine's flow, kg/s. */
const F1_FLOW = 2_069_456 / (135.24 + 4 * 161.74);
/** Table 5-1: the five F-1s' sea-level specific impulse as reconstructed, lbf s/lbm (seconds), their mean. */
const F1_ISP = (265.3 + 264.4 + 264.9 + 265.7 + 264.2) / 5;
/** The S-II's outboard J-2s at ESC+61 s (Table 6-1, engines 1 to 4, reconstructed): thrust, lbf, and impulse, s, their means. */
const SII_THRUST = (231_921 + 233_298 + 232_413 + 231_113) / 4;
const SII_ISP = (424.5 + 425.4 + 424.7 + 424.1) / 4;
/** The S-IVB's second burn: its mainstage propellant (Table 17-9), kg, and the flow at the null mixture ratio (Table 7-2), kg/s. */
const SECOND_BURNED = 71_525;
const SECOND_FLOW = (402.17 + 81.76) * LB;
const SECOND_SHIFT = 10_144.9;
const SECOND_MAINSTAGE = 10_045.2;
const SECOND_CUT = 10_383.89;
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
  label: 'Saturn V SA-507 with CSM-108 Yankee Clipper and LM-6 Intrepid',
  liftoff: doc(2_904_443, `${EVAL}, Table 17-1, total vehicle at holddown arm release (first motion, 0.25 s)`),
  sic: {
    mass: derived(
      2_242_236 + 614 + 611,
      `${MASS}: the S-IC at holddown arm release (Table 17-1, 2,242,236 kg), the small S-IC/S-II interstage that left with it (Table 17-3, 614 kg), and the S-II ullage motors' propellant (Table 17-3, 611 kg, burned out by S-II mainstage at 166.4 s), taken off with it`,
    ),
    propellant: {
      load: derived(
        1_448_519 + 21_872 + 632_752 + 5_994,
        `${EVAL}, Table 17-1 at holddown arm release: the oxygen and RP-1 in and below the tanks (Table 5-2's reconstruction, 3,241,657 and 1,408,194 lbm, is the same)`,
      ),
      usable: derived(
        1_448_519 + 21_872 + 632_752 + 5_994 - (42_093 + 36_309) * LB,
        `${EVAL}, Table 5-2: less the 42,093 lbm of oxygen and 36,309 lbm of RP-1 left at outboard cutoff, which the oxygen's low-level sensors called (§5.1)`,
      ),
    },
    f1: {
      thrust: derived(
        F1_FLOW * F1_ISP * G0,
        `${EVAL}: the stage's mainstage propellant, 2,069,456 kg (Table 17-9), over the engine-seconds from range zero to the cutoffs (Table 2-2: 135.24 s for the centre, 161.74 for the four), ${F1_FLOW.toFixed(1)} kg/s an engine, at the reconstructed sea-level impulse (Table 5-1's mean, ${F1_ISP.toFixed(1)} s). The reconstruction's own thrusts at 35 to 38 s, reduced to standard sea-level and pump inlet conditions, average 1,518.8 klbf (6,756 kN): the flight's ran higher as the oxygen's head rose`,
      ),
      isp: derived(F1_ISP, `${EVAL}, Table 5-1: the five engines' reconstructed sea-level specific impulse, lbf s/lbm, their mean`),
      exitArea: assumed(
        Math.PI * ((11 * 12 + 7) * IN * 0.5) ** 2,
        'Rocketdyne F-1 fact sheet, Saturn V News Reference, p. R-1: the nozzle exit 11 ft 7 in across (saturn-v.md), the type’s figure taken for SA-507’s',
      ),
    },
    centreCut: doc(135.24, EVENTS),
    outboardCut: doc(161.74, EVENTS),
    separation: doc(162.4, `${SEPARATIONS}; Table 2-2 has the command at the same 162.4 s, 0.7 s into time base 3`),
    push: estimated(
      5,
      'm/s: NOT FOUND. The S-IC’s eight retrorockets and the S-II’s eight ullage motors parted the stages; how fast is not in the evaluation (§11.5: "within staging limits")',
    ),
  },
  sii: {
    mass: derived(483_021 + 3_638, `${MASS}: the S-II and the S-II/S-IVB interstage at holddown arm release (Table 17-1)`),
    skirt: {
      mass: doc(3_996, `${EVAL}, Table 17-3, the large S-IC/S-II interstage (Table 17-9 the same, jettisoned)`),
      at: doc(192.4, `${EVENTS}, S-II second plane separation command`),
    },
    propellant: {
      load: derived(373_661 + 737 + 71_550 + 111, `${EVAL}, Table 17-3 at S-II ignition: the oxygen and hydrogen in and below the tanks`),
      usable: derived(
        373_661 + 737 + 71_550 + 111 - (816 + 787 + 1_969 + 123),
        `${EVAL}, Table 17-3: less what was in and below the tanks at outboard cutoff`,
      ),
    },
    ignition: doc(
      166.4,
      `${EVENTS}, S-II mainstage (the engines' solenoids at 163.2 s, average of five): the start's three seconds of rising thrust, and the 601 kg they burned (Table 17-9), are not flown`,
    ),
    centre: {
      thrust: doc(232_789 * LBF, `${EVAL}, Table 6-1, engine 5 (the centre) reconstructed at ESC+61 s: 232,789 lbf`),
      isp: doc(425.8, `${EVAL}, Table 6-1, engine 5: 425.8 lbf s/lbm`),
      cut: doc(460.75, `${EVENTS}; §6.3: ESC+297.58 s, as planned`),
      why: 'early, as planned; the 16-hertz oscillations before it were "drastically attenuated following CECO"',
    },
    outboard: {
      thrust: derived(
        SII_THRUST * LBF,
        `${EVAL}, Table 6-1, engines 1 to 4 reconstructed at ESC+61 s, their mean (${SII_THRUST.toFixed(0)} lbf)`,
      ),
      isp: derived(SII_ISP, `${EVAL}, Table 6-1, engines 1 to 4, their mean (${SII_ISP.toFixed(2)} lbf s/lbm)`),
      cut: doc(552.34, EVENTS),
      shift: {
        at: doc(490.0, `${EVENTS}, S-II low engine mixture ratio shift (actual)`),
        before: doc(1, 'the high mixture ratio’s figures, as given'),
        after: derived(
          692_787 / 925_145,
          `${EVAL}, §6.3: the stage's thrust at ESC+340 s, 692,787 lbf, over the four engines' after the centre's cutoff, 925,145 lbf`,
        ),
      },
    },
    separation: doc(553.2, SEPARATIONS),
    push: estimated(
      3,
      'm/s: NOT FOUND. The S-II’s four retrorockets and the S-IVB’s two ullage motors parted the stages; how fast is not in the evaluation',
    ),
  },
  les: {
    motor: {
      thrust: doc(31_500 * LBF, `${KIT}, p. 53: the tower jettison motor, 31,500 lb (Apollo 7's kit, 68-168K, p. 25, has 33,000)`),
      burn: assumed(
        1.1,
        'Apollo Spacecraft News Reference, launch escape subsystem: the tower jettison motor burns slightly longer than one second, the type’s figure taken',
      ),
    },
    mass: doc(4_066, `${EVAL}, Table 17-9, launch escape system (Table 17-3: the spacecraft 49,915 kg before it left, 45,850 after)`),
    at: doc(197.9, EVENTS),
  },
  sivb: {
    mass: derived(
      118_472 + 1_940 + 1_170 + 626,
      `${MASS}: the S-IVB and the instrument unit at holddown arm release (Table 17-1), and the adapter (Table 17-9: its panels, 1,170 kg, and the 626 kg of the spacecraft not separated)`,
    ),
    payload: {
      label: 'Intrepid, the lunar module, in the adapter',
      mass: doc(15_223, `${EVAL}, Table 17-9, the lunar module`),
      nodes: ['LMDescent', 'LMAscent'],
    },
    propellant: {
      load: derived(
        86_282 + 165 + 19_783 + 22,
        `${EVAL}, Table 17-5 at S-IC ignition: the oxygen and hydrogen in and below the tanks (Table 7-3's best estimate, 190,587 and 43,663 lbm, is the same)`,
      ),
      usable: derived(
        86_282 + 165 + 19_783 + 22 - (4_659 + 2_535) * LB + 10.14 * SECOND_FLOW,
        `${EVAL}, Table 7-3: less the 4,659 lbm of oxygen and 2,535 lbm of hydrogen left at the second cutoff, which would have run the oxygen dry 10.14 s later (§7.9) at the second burn's flow (Table 7-2)`,
      ),
    },
    first: {
      thrust: doc(206_956 * LBF, `${EVAL}, Table 7-1, first burn at STDV+127 s, standard altitude conditions: 206,956 lbf`),
      isp: doc(428.9, `${EVAL}, Table 7-1: 428.90 lbf s/lbm`),
      ignition: doc(
        559.1,
        `${EVENTS}, S-IVB mainstage (its start tank discharge valve open at 556.6 s): the start's rising thrust, and the 125 kg it burned (Table 17-9), are not flown`,
      ),
      cutoff: doc(693.91, `${EVENTS}, S-IVB velocity cutoff command (first guidance cutoff)`),
    },
    second: {
      thrust: doc(207_688 * LBF, `${EVAL}, Table 7-2, second burn at STDV+172 s, standard altitude conditions: 207,688 lbf`),
      isp: doc(429.2, `${EVAL}, Table 7-2: 429.2 lbf s/lbm`),
      ignition: doc(
        SECOND_MAINSTAGE,
        `${EVENTS}, S-IVB mainstage (second ignition, its start tank discharge valve open, at 10,042.7 s): the start's rising thrust, and the 118 kg it burned (Table 17-9), are not flown`,
      ),
      cutoff: doc(SECOND_CUT, `${EVENTS}, S-IVB second guidance cutoff command (Table 4-2 has the signal at 10,383.94 s)`),
      speed: doc(10_795.8, `${CUTOFFS}: space-fixed velocity at the second guidance cutoff signal`),
      shift: {
        at: doc(SECOND_SHIFT, `${EVENTS}, engine mixture ratio shift (the valve from 4.5 to null at second ESC+109.8 s, §7.9)`),
        before: derived(
          SECOND_EARLY / SECOND_FLOW,
          `${EVAL}: the second burn's mainstage propellant (Table 17-9, 71,525 kg) less what the null ratio's flow (Table 7-2, ${SECOND_FLOW.toFixed(2)} kg/s) burned from the shift to the cutoff, over the time from mainstage to the shift: ${SECOND_EARLY.toFixed(1)} kg/s at the 4.5 ratio, its thrust taken at the same impulse`,
        ),
        after: doc(1, 'the null mixture ratio’s figures (Table 7-2), as given'),
      },
      align: estimated(
        200,
        's: NOT FOUND. When the stack turned from its orbit attitude to the burn’s is not in Table 2-2; taken within the restart sequence, which began at 9,464.5 s (time base 6)',
      ),
      target: {
        altitude: doc(352_800, `${CUTOFFS}: altitude at the second guidance cutoff signal`),
        over: 'ellipsoid',
        climb: doc(8.137, `${CUTOFFS}: flight path angle at the second guidance cutoff signal`),
        inclination: doc(30.36, `${CUTOFFS}: inclination at the second guidance cutoff signal`),
      },
    },
    jets: estimated(
      0.05,
      'deg/s² about each axis: NOT FOUND. A 150 lbf attitude engine of the auxiliary propulsion modules ten metres from the stack’s centre of mass, against a 136 t stack some 37 m long (a uniform rod): of that order',
    ),
  },
  csm: {
    mass: doc(28_830, `${EVAL}, Table 17-9, command and service modules`),
    cm: estimated(
      12_283.5 * LB,
      `${MR}, Table A-I: the command module after the modules parted at the end of the flight, the nearest figure read; it was heavier at launch by what it then used`,
    ),
  },
  ascent: {
    guidance: {
      azimuth: doc(72.029, `${EVAL}, §4.1: launched on an azimuth of 90°, rolled to a flight azimuth of 72.029°`),
      roll: {
        points: [
          [0, -17.971],
          [12.8, -17.971],
          [32.3, 0],
        ],
        confidence: 'derived',
        source: `${EVAL}, §4.1 and Table 2-2: the 17.971° from the pad's 90° to the flight azimuth, rolled between 12.8 and 32.3 s, taken as even`,
      },
      vertical: doc(12.8, `${EVENTS}, begin pitch and roll maneuver (the tower clearance yaw before it, 2.4 to 10.2 s, is not flown)`),
      kick: derived(158.1 - 12.8, `${EVENTS}: the tilt programme from its start to its arrest at 158.1 s`),
      programme: {
        points: [
          [0, 0],
          [12.8, 0],
          [20, 1.6],
          [25, 3.1],
          [30, 5.1],
          [35, 7.9],
          [40, 10.9],
          [45, 13.8],
          [55, 20],
          [65, 25.9],
          [75, 32.2],
          [85, 38.4],
          [95, 44.9],
          [110, 51.8],
          [120, 55.6],
          [130, 59],
          [140, 62],
          [150, 64.5],
          [158.1, 66.2],
          [175, 66.3],
        ],
        confidence: 'estimated',
        source: `${EVAL}, Fig. 10-5: the launch vehicle digital computer's pitch attitude command (drawn negative, nose downrange), read off the page scanned at 400 dpi, the grid's lines found on the page and each point placed between its own (a quarter of a degree and half a second at best), as the tilt from the launch vertical; flown open as the S-IC flew it and held from its arrest (158.1 s, Table 2-2; the figure's plateau, 66.2 to 66.4°) to the iterative guidance's start. Under 20 s the line lies on the figure's zero, which is taken from the programme's start at 12.8 s (Table 2-2)`,
      },
      turn: doc(
        202.5,
        `${EVAL}, Table 10-9: the iterative guidance's first phase begins (Table 2-2 the same); its closed loop flown as the law's linear tangent (Fig. 10-5 shows its first command about half a degree above the plateau)`,
      ),
      target: {
        at: 'sivb-cutoff',
        altitude: doc(190_900, `${CUTOFFS}: altitude at the first guidance cutoff signal`),
        over: 'ellipsoid',
        climb: doc(-0.015, `${CUTOFFS}: flight path angle at the first guidance cutoff signal`),
        inclination: doc(32.54, `${EVAL}, Table 4-5: the parking orbit's inclination`),
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
      'deg/s² at full throw, about each axis: NOT FOUND. Four outboard F-1s gimballed ±5.17° (MSFC-MAN-503, §IV) some thirty metres below the stack’s centre of mass give it of the order of 1.4 at liftoff, more as it lightens; the S-II’s and the S-IVB’s gimbals of the same order: one figure taken for the three',
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
      ((15_550 * 3100 + 1_940 * 3355 + (1_796 + 15_223) * 3540 + 28_830 * 3805) / (15_550 + 1_940 + 1_796 + 15_223 + 28_830)) * IN,
      'the stack after the injection, its centre of mass above the F-1 exits: the S-IVB, the instrument unit, the adapter with Intrepid and Yankee Clipper, each by its mass at the second cutoff (Tables 17-7 and 17-9) at the middle of its stretch of the model (saturn_v.py), taken for the record’s run',
    ),
  },
  bound: {
    for: 'the Moon',
    next: 'Gordon turned Yankee Clipper round, docked with Intrepid and drew it out of the adapter; the S-IVB, its slingshot short, went past the Moon into a loose orbit of the Earth (the evaluation, §4.1), and Yankee Clipper and Intrepid went into lunar orbit three and a half days after launch: none of it is flown here, the stack coasting on whole with the Moon pulling on it.',
  },
  orbit: {
    radius: doc(6_378_165, `${EVAL}, Table 4-5: apogee and perigee based on a spherical earth of radius 6,378.165 km`),
    perigee: doc(181_200, `${EVAL}, Table 4-5, actual`),
    apogee: doc(185_400, `${EVAL}, Table 4-5, actual`),
    inclination: doc(32.54, `${EVAL}, Table 4-5, actual`),
    period: doc(88.16 * 60, `${EVAL}, Table 4-5, actual`),
    kind: {
      is: 'osculating',
      confidence: 'derived',
      source: `${EVAL}, Table 4-5: the insertion conditions, the orbit at 703.91 s from its state; its period is the Kepler period of its heights over the stated ball (88.16 min)`,
    },
    injection: {
      at: doc(703.91, `${EVAL}, Table 4-5, parking orbit insertion (Table 2-2: 703.9 s)`),
      heading: 'north',
      arc: derived(
        24.0,
        `${CUTOFFS}: 2,592.6 km surface range at the first cutoff and ten seconds more at 7,792 m/s, over a 6,378 km ball`,
      ),
      anomaly: estimated(0, 'on an orbit so near a circle (eccentricity 0.00032, Table 4-5) the place of perigee means little'),
    },
    mass: doc(136_093, `${EVAL}, Table 17-5: the stack at the end of the first burn's decay, 694.10 s`),
  },
  marks: [
    { id: 'mach-1', label: 'Mach 1', at: doc(66.1, EVENTS) },
    { id: 'max-q', label: 'Greatest dynamic pressure', at: doc(81.1, EVENTS) },
    { id: 'insertion', label: 'Parking orbit insertion', at: doc(703.91, `${EVAL}, Table 4-5`) },
    { id: 'tli', label: 'Translunar injection', at: doc(10_393.94, `${EVAL}, Table 4-6 (Table 2-2: 10,393.9 s)`) },
  ],
  checks: [
    check('maxQ', 'Greatest dynamic pressure', 32_700, 'Pa', 3_000, `${EVAL}, Table 4-1: 3.27 N/cm²`),
    check('maxQAt', 'Greatest dynamic pressure, when', 81.1, 's', 6, `${EVAL}, Table 4-1`),
    check('firstG', 'Greatest load on the S-IC', 3.91, 'g', 0.2, `${EVAL}, Table 4-1, at 161.82 s`),
    check('sic-centre-cutoff.speed', 'Speed at S-IC centre engine cutoff (space-fixed)', 1_979.5, 'm/s', 40, CUTOFFS),
    check('sic-centre-cutoff.altitude', 'Height at S-IC centre engine cutoff', 44_700, 'm', 2_500, CUTOFFS),
    check('sic-separation.speed', 'Speed at S-IC/S-II separation (space-fixed)', 2_759.7, 'm/s', 50, SEPARATIONS),
    check('sic-separation.altitude', 'Height at S-IC/S-II separation', 68_700, 'm', 3_000, SEPARATIONS),
    check('sic-separation.climb', 'Climb at S-IC/S-II separation', 20.43, '°', 1.5, SEPARATIONS),
    check('sii-centre-cutoff.speed', 'Speed at S-II centre engine cutoff (space-fixed)', 5_722.7, 'm/s', 60, CUTOFFS),
    check('sii-centre-cutoff.altitude', 'Height at S-II centre engine cutoff', 186_100, 'm', 5_000, CUTOFFS),
    check('sii-separation.speed', 'Speed at S-II/S-IVB separation (space-fixed)', 6_961.9, 'm/s', 60, SEPARATIONS),
    check('sii-separation.altitude', 'Height at S-II/S-IVB separation', 190_400, 'm', 5_000, SEPARATIONS),
    check('cutoffAt', 'S-IVB first cutoff, when', 693.91, 's', 5, EVENTS),
    check('insertion.speed', 'Speed at parking orbit insertion (space-fixed)', 7_792.5, 'm/s', 5, `${EVAL}, Table 4-5`),
    check('injection.at', 'S-IVB second cutoff, when', SECOND_CUT, 's', 5, EVENTS),
    check('injection.mass', 'The stack at the second cutoff', 63_340, 'kg', 1_500, `${EVAL}, Table 17-7, S-IVB engine cutoff`),
    check(
      'injection.energy',
      'C3 at the second cutoff',
      -1_917_435,
      'm²/s²',
      30_000,
      `${CUTOFFS}: C3 at the second guidance cutoff signal`,
    ),
    check('injection.eccentricity', 'Eccentricity at the second cutoff', 0.96829, '', 0.002, CUTOFFS),
  ],
  coastFixes: [
    fix(SEPARATIONS, 162.4, 28.871, -79.677, 68.7, 2_759.7, 20.43, 75.228),
    fix(SEPARATIONS, 553.2, 31.925, -63.934, 190.4, 6_961.9, 0.432, 82.533),
    fix(`${EVAL}, Table 4-5, actual`, 703.91, 32.682, -53.131, 190.9, 7_792.5, -0.014, 88.58),
    fix(
      `${SEPARATIONS}: S-IVB/CSM separation, not flown, the stack coasting on whole`,
      11_884.9,
      28.815,
      -79.537,
      7_073.3,
      7_579.0,
      45.092,
      100.194,
    ),
  ],
  aborts: [
    {
      until: doc(197.9, `${EVENTS}, launch escape tower jettison`),
      does: 'Mode I: the escape tower pulls the command module off the launch vehicle, to come down between Pad 39A and 400 nautical miles downrange (Apollo 11’s press kit). Said, not flown: the command module’s escape and its descent are not in this flight’s plan',
    },
    {
      until: assumed(
        9 * 60 + 22,
        `${KIT11}, abort modes: until the service engine could put the CSM in a safe orbit, Apollo 11's boundary taken; Apollo 12's kit gives no abort modes, only its launch abort areas, out to 3,400 nautical miles (p. 27)`,
      ),
      does: 'Mode II: the crew separate by hand, turn for entry and fly it at full lift, to land 350 to 3,200 nautical miles downrange. Said, not flown',
    },
    {
      from: assumed(9 * 60 + 22, `${KIT11}, abort modes, Apollo 11's boundary taken`),
      until: doc(703.91, `${EVAL}, Table 4-5, parking orbit insertion`),
      does: 'Mode IV (preferred): the CSM separates from the S-IVB and its service engine puts it in Earth orbit two minutes later, to fly the mission as an Earth-orbital alternate. Said, not flown',
    },
    {
      until: doc(703.91, `${EVAL}, Table 4-5, parking orbit insertion`),
      does: 'Mode III: the CSM separates, burns retrograde on its service engine if it must, and the command module flies half lift to land some 3,350 nautical miles downrange. Said, not flown',
    },
  ],
};

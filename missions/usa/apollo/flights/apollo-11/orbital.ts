/**
 * Apollo 11's launch as its records have it: SA-506 from Pad 39A through the translunar injection, the record the plan is
 * written from (vehicles/saturn-v-plan.ts `saturnVPlan`). All times are range time, s from range zero (13:32:00 UT).
 * The launch vehicle's figures are MSFC's flight evaluation's (MPR-SAT-FE-69-9): its event times (Table 2-2), its
 * trajectory at each event (Tables 4-1 to 4-6), its engines' reconstructed performance (Tables 5-1, 6-1, 7-1, 7-2) and its
 * mass at each event (Tables 20-1 to 20-9, read off the page). What is read, what disagrees and what is estimated is in
 * mission.md beside this file.
 */
import { assumed, derived, doc, estimated } from '../../../../../src/measure.ts';
import type { OrbitFix, PlanCheck } from '../../../../../src/sim/plan.ts';
import { type SaturnVRecord, saturnVDrag, siiMatchTaken } from '../../vehicles/saturn-v-record.ts';

const IN = 0.0254;
const LB = 0.45359237;
const G0 = 9.80665;
const EVAL = 'Saturn V Launch Vehicle Flight Evaluation Report AS-506, Apollo 11 Mission (MSFC, MPR-SAT-FE-69-9, 20 September 1969)';
const EVENTS = `${EVAL}, Table 2-2, actual range time`;
const MASS = `${EVAL}, Tables 20-1 to 20-9 (actual, kg)`;
const MR = 'Apollo 11 Mission Report (MSC-00171, November 1969)';
const KIT = 'NASA Apollo 11 press kit (release 69-83K, 6 July 1969), p. 78';

/** The F-1s' mainstage propellant (Table 20-9) over the engine-seconds the run burns them from range zero: one engine's flow, kg/s. */
const F1_FLOW = 2_069_957 / (135.2 + 4 * 161.63);
/** Table 5-1: the five F-1s' sea-level specific impulse as reconstructed, N s/kg, their mean. */
const F1_ISP = (2599 + 2598 + 2596 + 2595 + 2584) / 5;
/** The S-II's outboard J-2s at ESC+61 s (Table 6-1, engines 1 to 4, reconstructed): thrust, N, and impulse, N s/kg, their means. */
const SII_THRUST = (1_035_083 + 1_017_517 + 1_017_228 + 1_039_576) / 4;
const SII_ISP = (4169.8 + 4170.8 + 4165.9 + 4157.0) / 4;
/** The S-IVB's second burn: its mainstage propellant (Table 20-7) and the flow at the null mixture ratio (Table 7-2), kg and kg/s. */
const SECOND_BURNED = 86_251 - 15_557;
const SECOND_FLOW = 176.86 + 35.88;
const SECOND_SHIFT = 9974.4;
const SECOND_MAINSTAGE = 9858.7;
const SECOND_CUT = 10_203.07;
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
  label: 'Saturn V SA-506 with CSM-107 Columbia and LM-5 Eagle',
  liftoff: doc(2_899_008, `${EVAL}, Table 20-1, total vehicle at holddown arm release (first motion, 0.30 s)`),
  sic: {
    mass: derived(
      2_239_381 + 614 + 610,
      `${MASS}: the S-IC at holddown arm release (Table 20-1, 2,239,381 kg), the small S-IC/S-II interstage that left with it (Table 20-3, 614 kg), and the S-II ullage motors' propellant (Table 20-3, 610 kg, burned out by S-II mainstage at 166.2 s), taken off with it`,
    ),
    propellant: {
      load: derived(
        1_446_726 + 21_868 + 631_847 + 5_983,
        `${EVAL}, Table 20-1 at holddown arm release: the oxygen and RP-1 in and below the tanks (Table 5-2's reconstruction has the same 1,468,594 and 637,830 kg)`,
      ),
      usable: derived(
        1_446_726 + 21_868 + 631_847 + 5_983 - 18_041 - 13_954,
        `${EVAL}, Table 5-2: less the 18,041 kg of oxygen and 13,954 kg of RP-1 left at outboard cutoff, which the oxygen's low-level sensors called`,
      ),
    },
    f1: {
      thrust: derived(
        F1_FLOW * F1_ISP,
        `${EVAL}: the stage's mainstage propellant, 2,069,957 kg (Table 20-9), over the engine-seconds from range zero to the cutoffs (Table 2-2: 135.20 s for the centre, 161.63 for the four), ${F1_FLOW.toFixed(1)} kg/s an engine, at the reconstructed sea-level impulse (Table 5-1's mean, ${F1_ISP.toFixed(1)} N s/kg). The reconstruction's own thrusts at 35 to 38 s, reduced to standard pump inlet conditions, average 6,719 kN: the flight's ran higher as the oxygen's head rose`,
      ),
      isp: derived(
        F1_ISP / G0,
        `${EVAL}, Table 5-1: the five engines' reconstructed sea-level specific impulse, their mean (2,594.4 N s/kg)`,
      ),
      exitArea: assumed(
        Math.PI * ((11 * 12 + 7) * IN * 0.5) ** 2,
        'Rocketdyne F-1 fact sheet, Saturn V News Reference, p. R-1: the nozzle exit 11 ft 7 in across (saturn-v.md), the type’s figure taken for SA-506’s',
      ),
    },
    centreCut: doc(135.2, EVENTS),
    outboardCut: doc(161.63, EVENTS),
    separation: doc(162.3, `${SEPARATIONS}; Table 2-2 has the command 0.7 s after the start of time base 3 at 161.7 s`),
    push: estimated(
      5,
      'm/s: NOT FOUND. The S-IC’s eight retrorockets and the S-II’s eight ullage motors parted the stages; how fast is not in the evaluation (§12.2: "within staging limits")',
    ),
    decay: {
      centre: doc(
        2_659_605,
        `${EVAL}, §5.4: the centre engine's cutoff impulse from the cutoff signal to no thrust, 2,659,605 N s (597,903 lbf s)`,
      ),
      outboard: derived(
        10_612_096 / 4,
        `${EVAL}, §5.4: the outboard engines' cutoff impulse from the cutoff signal to the stage's separation, 10,612,096 N s (2,385,694 lbf s), a quarter of it`,
      ),
    },
    ullage: assumed(
      4 * 373_206,
      `the S-II's four ullage motors at their nominal impulse over the effective burn, 373,206 N s each (AS-503's evaluation, MPR-SAT-FE-69-1, Table 12-3), taken: §12.2 has them perform "as predicted"`,
    ),
  },
  sii: {
    mass: derived(479_964 + 3_663, `${MASS}: the S-II and the S-II/S-IVB interstage at holddown arm release (Table 20-1)`),
    skirt: {
      mass: doc(3_982, `${EVAL}, Table 20-3, the large S-IC/S-II interstage`),
      at: doc(192.3, `${EVENTS}, second plane separation`),
    },
    propellant: {
      load: derived(370_778 + 737 + 71_615 + 105, `${EVAL}, Table 20-3 at S-II ignition: the oxygen and hydrogen in and below the tanks`),
      usable: derived(
        370_778 + 737 + 71_615 + 105 - (816 + 787 + 2_572 + 123),
        `${EVAL}, Table 20-3: less what was in and below the tanks at outboard cutoff`,
      ),
    },
    ignition: doc(
      166.2,
      `${EVENTS}, S-II mainstage (the engines' solenoids at 164.0 s, average of five): the start's two seconds of rising thrust, and the 594 kg they burned (Table 20-3), are not flown`,
    ),
    centre: {
      thrust: doc(1_032_112, `${EVAL}, Table 6-1, engine 5 (the centre) reconstructed at ESC+61 s`),
      isp: doc(4162.9 / G0, `${EVAL}, Table 6-1, engine 5: 4,162.9 N s/kg`),
      cut: doc(460.62, `${EVAL}, §6.3: ESC+297.58 s`),
      why: 'early, against the low-frequency oscillation of AS-503 and AS-504',
    },
    outboard: {
      thrust: derived(SII_THRUST, `${EVAL}, Table 6-1, engines 1 to 4 reconstructed at ESC+61 s, their mean`),
      isp: derived(SII_ISP / G0, `${EVAL}, Table 6-1, engines 1 to 4, their mean (${SII_ISP.toFixed(1)} N s/kg)`),
      cut: doc(548.22, EVENTS),
      shift: {
        at: doc(498.0, `${EVENTS}, S-II low mixture ratio shift (actual)`),
        before: doc(1, 'the high mixture ratio’s figures, as given'),
        after: derived(
          3_082_769 / 4_093_107,
          `${EVAL}, §6.3: the stage's thrust at ESC+351 s, 3,082,769 N, over the four engines' after the centre's cutoff, 4,093,107 N`,
        ),
        flow: assumed(
          (3_082_769 / 4_093_107) * (4159.0 / 4214.9),
          `AS-503's evaluation (MPR-SAT-FE-69-1), Table 6-3: the S-II's reconstructed stage impulse at the low mixture ratio, 4,214.9 N s/kg, against 4,159.0 at the high, taken for SA-506's (the same propellant utilization valve): the flow's share is the thrust's (§6.3) times the one over the other`,
        ),
      },
    },
    separation: doc(549.0, SEPARATIONS),
    push: estimated(
      3,
      'm/s: NOT FOUND. The S-II’s four retrorockets and the S-IVB’s two ullage motors parted the stages (§12.3: "nominal")',
    ),
    match: siiMatchTaken("SA-506's S-II"),
    decay: {
      centre: assumed(
        581_916 / 4,
        `${EVAL}, §6.4: the stage's cutoff impulse through the 5 per cent thrust level, 581,916 N s (130,820 lbf s): its quarter, an outboard engine's (§6.4: the centre engine's decay after its cutoff normal, to 5 per cent in some 0.3 s), taken for the centre's`,
      ),
      outboard: derived(
        581_916 / 4,
        `${EVAL}, §6.4: the stage's cutoff impulse through the 5 per cent thrust level, 581,916 N s (130,820 lbf s), a quarter of it`,
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
    mass: derived(49_735 - 45_693, `${EVAL}, Table 20-3: the spacecraft before and after the tower left`),
    at: doc(197.9, EVENTS),
  },
  sivb: {
    mass: derived(
      119_119 + 1_939 + 1_166 + 626,
      `${MASS}: the S-IVB and the instrument unit at holddown arm release (Table 20-1), and the adapter (Table 20-9: its panels, 1,166 kg, and the 626 kg of the spacecraft not separated)`,
    ),
    payload: {
      label: 'Eagle, the lunar module, in the adapter',
      mass: doc(15_095, `${EVAL}, Table 20-9, the lunar module`),
      nodes: ['LMDescent', 'LMAscent'],
    },
    propellant: {
      load: derived(
        87_149 + 166 + 19_758 + 22,
        `${EVAL}, Table 20-5 at S-IC ignition: the oxygen and hydrogen in and below the tanks (Table 7-3's best estimate, the same 107,095 kg)`,
      ),
      usable: derived(
        87_149 + 166 + 19_758 + 22 - (2_488 + 970) + 12.4 * SECOND_FLOW,
        `${EVAL}, Table 7-3: less the 2,488 kg of oxygen and 970 kg of hydrogen left at the second cutoff, which would have run the oxygen dry 12.4 s later (§7.9) at the second burn's flow (Table 7-2)`,
      ),
    },
    first: {
      thrust: doc(901_223, `${EVAL}, Table 7-1, first burn at STDV+137 s, standard altitude conditions`),
      isp: doc(4204 / G0, `${EVAL}, Table 7-1: 4,204 N s/kg`),
      ignition: doc(
        554.7,
        `${EVENTS}, S-IVB mainstage (its start tank discharge valve open at 552.2 s): the start's rising thrust, and the 175 kg it burned (Table 20-5), are not flown`,
      ),
      cutoff: doc(699.34, `${EVENTS}, velocity cutoff command (first guidance cutoff)`),
    },
    second: {
      thrust: doc(894_364, `${EVAL}, Table 7-2, second burn at STDV+172 s, standard altitude conditions`),
      isp: doc(4204 / G0, `${EVAL}, Table 7-2: 4,204 N s/kg`),
      ignition: doc(
        SECOND_MAINSTAGE,
        `${EVENTS}, S-IVB mainstage (second ignition, its start tank discharge valve open, at 9,856.2 s): the start's rising thrust, and the 163 kg it burned (Table 20-7), are not flown`,
      ),
      cutoff: doc(SECOND_CUT, `${EVENTS}, second guidance cutoff command`),
      speed: doc(10_841.0, `${CUTOFFS}: space-fixed velocity at the second guidance cutoff signal`),
      shift: {
        at: doc(SECOND_SHIFT, `${EVENTS}, engine mixture ratio shift`),
        before: derived(
          SECOND_EARLY / SECOND_FLOW,
          `${EVAL}: the second burn's mainstage propellant (Table 20-7, ${SECOND_BURNED} kg) less what the null ratio's flow (Table 7-2, ${SECOND_FLOW.toFixed(2)} kg/s) burned from the shift to the cutoff, over the time from mainstage to the shift: ${SECOND_EARLY.toFixed(1)} kg/s at the 4.5 ratio, its thrust taken at the same impulse`,
        ),
        after: doc(1, 'the null mixture ratio’s figures (Table 7-2), as given'),
      },
      align: estimated(
        200,
        's: NOT FOUND. When the stack turned from its orbit attitude to the burn’s is not in Table 2-2; taken within the restart sequence, which began at 9,278.2 s (time base 6)',
      ),
      target: {
        altitude: doc(320_900, `${CUTOFFS}: altitude at the second guidance cutoff signal`),
        over: 'ellipsoid',
        climb: doc(6.913, `${CUTOFFS}: flight path angle at the second guidance cutoff signal`),
        inclination: doc(31.386, `${CUTOFFS}: inclination at the second guidance cutoff signal`),
      },
    },
    jets: estimated(
      0.05,
      'deg/s² about each axis: NOT FOUND. A 150 lbf attitude engine of the auxiliary propulsion modules ten metres from the stack’s centre of mass, against a 135 t stack some 37 m long (a uniform rod): of that order',
    ),
  },
  csm: {
    mass: doc(28_806, `${EVAL}, Table 20-9, command and service modules`),
    cm: estimated(
      12_107.4 * LB,
      `${MR}, Table A-I: the command module after the modules parted at the end of the flight, the nearest figure read; it was heavier at launch by what it then used`,
    ),
  },
  ascent: {
    guidance: {
      azimuth: doc(72.058, `${EVAL}, §4.1: launched on an azimuth of 90°, rolled to a flight azimuth of 72.058°`),
      roll: {
        points: [
          [0, -17.942],
          [13.2, -17.942],
          [31.1, 0],
        ],
        confidence: 'derived',
        source: `${EVAL}, §4.1 and Table 2-2: the 17.942° from the pad's 90° to the flight azimuth, rolled between 13.2 and 31.1 s, taken as even`,
      },
      vertical: doc(13.2, `${EVENTS}, begin pitch and roll maneuver (the tower clearance yaw before it, 1.7 to 9.7 s, is not flown)`),
      kick: derived(160.0 - 13.2, `${EVENTS}: the tilt programme from its start to its arrest at 160.0 s`),
      programme: {
        points: [
          [0, 0],
          [13.2, 0],
          [20, 4.2],
          [25, 6],
          [30, 8.3],
          [35, 10.7],
          [40, 13.3],
          [45, 16.5],
          [50, 19.5],
          [55, 23.1],
          [60, 26.7],
          [65, 29.5],
          [70, 32.9],
          [75, 36.1],
          [80, 38.9],
          [85, 41.8],
          [90, 44.8],
          [95, 47.6],
          [105, 51.9],
          [110, 54.7],
          [115, 56.8],
          [120, 58.7],
          [125, 60.3],
          [130, 61.8],
          [135, 63.2],
          [140, 64.5],
          [145, 65.8],
          [150, 67],
          [155, 68.2],
          [160, 68.8],
          [165, 69],
        ],
        confidence: 'estimated',
        source: `${EVAL}, Fig. 10-4: the launch vehicle digital computer's pitch attitude command from the launch vertical, its line traced along the middle of its stroke off the page scanned at 600 dpi against the figure's own gridlines (the stroke some 3 s and 0.4° wide: read to some half a second and a tenth of a degree) and averaged over five seconds, flown open as the S-IC flew it and held from its arrest (160.0 s, Table 2-2; the figure's plateau, 69.0°) to the iterative guidance's start. The figure's frame begins at −100 s and its gridline at range zero is labelled; its plateau begins at 159.5 s and its guidance step falls near 202.6 s (Table 2-2: 160.0 and 204.07 s): its time axis has no offset like AS-510's Fig. 9-10. Read along the stroke's upper edge, as it was first read, every point comes some 1.5 s earlier and a degree further over, and the plateau 69.5° (mission.md). The line drawn leaves zero at some 6 s, ahead of the programme's start at 13.2 s (Table 2-2), which is taken, and the tilt run straight from it to the figure's 4.2° at 20 s`,
      },
      turn: doc(
        204.07,
        `${EVAL}, Table 10-4: the iterative guidance's first phase begins; its closed loop flown as the law's linear tangent (Fig. 10-4 shows its first command 6° above where the programme left the axis)`,
      ),
      target: {
        at: 'sivb-cutoff',
        altitude: doc(191_100, `${CUTOFFS}: altitude at the first guidance cutoff signal`),
        over: 'ellipsoid',
        climb: doc(0.015, `${CUTOFFS}: flight path angle at the first guidance cutoff signal`),
        inclination: doc(32.521, `${EVAL}, Table 4-5: the parking orbit's inclination`),
      },
    },
    drag: saturnVDrag(doc(SECOND_CUT, 'to the end of the ascent'), 'SA-506'),
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
      ((15_557 * 3100 + 1_939 * 3355 + (1_792 + 15_095) * 3540 + 28_806 * 3805) / (15_557 + 1_939 + 1_792 + 15_095 + 28_806)) * IN,
      'the stack after the injection, its centre of mass above the F-1 exits: the S-IVB, the instrument unit, the adapter with Eagle and Columbia, each by its mass at the second cutoff (Tables 20-7 and 20-9) at the middle of its stretch of the model (saturn_v.py), taken for the record’s run',
    ),
  },
  bound: {
    for: 'the Moon',
    next: 'Collins turned Columbia round, docked with Eagle and drew it out of the adapter, the S-IVB was sent on past the Moon into orbit about the Sun, and Columbia and Eagle went into lunar orbit three days later: none of it is flown here, the stack coasting on whole with the Moon pulling on it.',
  },
  orbit: {
    radius: doc(6_378_165, `${EVAL}, Table 4-5: apogee and perigee based on a spherical earth of radius 6,378.165 km`),
    perigee: doc(183_200, `${EVAL}, Table 4-5, actual`),
    apogee: doc(186_000, `${EVAL}, Table 4-5, actual`),
    inclination: doc(32.521, `${EVAL}, Table 4-5, actual`),
    period: doc(88.18 * 60, `${EVAL}, Table 4-5, actual`),
    kind: {
      is: 'osculating',
      confidence: 'derived',
      source: `${EVAL}, Table 4-5: the insertion conditions, the orbit at 709.3 s from its state; its period is the Kepler period of its heights over the stated ball (88.18 min)`,
    },
    injection: {
      at: doc(709.34, `${EVENTS}, parking orbit insertion`),
      heading: 'north',
      arc: derived(
        24.4,
        `${CUTOFFS}: 2,634.0 km surface range at the first cutoff and ten seconds more at 7,793 m/s, over a 6,378 km ball`,
      ),
      anomaly: estimated(0, 'on an orbit so near a circle (eccentricity 0.00021, Table 4-5) the place of perigee means little'),
    },
    mass: doc(135_102, `${EVAL}, Table 20-5: the stack at the end of the first burn's decay, 699.54 s`),
  },
  marks: [
    { id: 'mach-1', label: 'Mach 1', at: doc(66.3, EVENTS) },
    { id: 'max-q', label: 'Greatest dynamic pressure', at: doc(83.0, EVENTS) },
    { id: 'insertion', label: 'Parking orbit insertion', at: doc(709.34, EVENTS) },
    { id: 'tli', label: 'Translunar injection', at: doc(10_213.07, EVENTS) },
  ],
  checks: [
    check('maxQ', 'Greatest dynamic pressure', 35_200, 'Pa', 3_000, `${EVAL}, Table 4-1: 3.52 N/cm²`),
    check('maxQAt', 'Greatest dynamic pressure, when', 83.0, 's', 6, `${EVAL}, Table 4-1`),
    check('firstG', 'Greatest load on the S-IC', 3.94, 'g', 0.2, `${EVAL}, Table 4-1, at 161.7 s`),
    check('sic-centre-cutoff.speed', 'Speed at S-IC centre engine cutoff (space-fixed)', 1_979.0, 'm/s', 40, CUTOFFS),
    check('sic-centre-cutoff.altitude', 'Height at S-IC centre engine cutoff', 44_000, 'm', 2_500, CUTOFFS),
    check('sic-separation.speed', 'Speed at S-IC/S-II separation (space-fixed)', 2_773.9, 'm/s', 50, SEPARATIONS),
    check('sic-separation.altitude', 'Height at S-IC/S-II separation', 66_700, 'm', 3_000, SEPARATIONS),
    check('sic-separation.climb', 'Climb at S-IC/S-II separation', 19.02, '°', 1.5, SEPARATIONS),
    check('sii-centre-cutoff.speed', 'Speed at S-II centre engine cutoff (space-fixed)', 5_707.5, 'm/s', 60, CUTOFFS),
    check('sii-centre-cutoff.altitude', 'Height at S-II centre engine cutoff', 180_200, 'm', 5_000, CUTOFFS),
    check('sii-separation.speed', 'Speed at S-II/S-IVB separation (space-fixed)', 6_918.8, 'm/s', 60, SEPARATIONS),
    check('sii-separation.altitude', 'Height at S-II/S-IVB separation', 187_400, 'm', 5_000, SEPARATIONS),
    check('cutoffAt', 'S-IVB first cutoff, when', 699.34, 's', 5, EVENTS),
    check('insertion.speed', 'Speed at parking orbit insertion (space-fixed)', 7_793.1, 'm/s', 5, `${EVAL}, Table 4-5`),
    check('injection.at', 'S-IVB second cutoff, when', SECOND_CUT, 's', 5, EVENTS),
    check('injection.mass', 'The stack at the second cutoff', 63_189, 'kg', 1_500, `${EVAL}, Table 20-7`),
    check(
      'injection.energy',
      'C3 at the second cutoff',
      -1_487_528,
      'm²/s²',
      30_000,
      `${CUTOFFS}: C3 at the second guidance cutoff signal`,
    ),
    check('injection.eccentricity', 'Eccentricity at the second cutoff', 0.975371, '', 0.002, CUTOFFS),
  ],
  coastFixes: [
    fix(SEPARATIONS, 162.3, 28.865, -79.676, 66.7, 2_773.9, 19.02, 75.436),
    fix(SEPARATIONS, 549.0, 31.883, -64.147, 187.4, 6_918.8, 0.611, 82.426),
    fix(`${EVAL}, Table 4-5, actual`, 709.34, 32.672, -52.694, 191.1, 7_793.1, 0.012, 88.848),
    fix(
      `${SEPARATIONS}: S-IVB/CSM separation, not flown, the stack coasting on whole`,
      11_723,
      31.246,
      -90.622,
      7_065.7,
      7_608.6,
      45.148,
      93.758,
    ),
  ],
  aborts: [
    {
      until: doc(197.9, `${EVENTS}, launch escape tower jettison`),
      does: 'Mode I: the escape tower pulls the command module off the launch vehicle, to come down between Pad 39A and 400 nautical miles downrange. Said, not flown: the command module’s escape and its descent are not in this flight’s plan',
    },
    {
      until: doc(9 * 60 + 22, `${KIT}, abort modes: until the service engine could put the CSM in a safe orbit`),
      does: 'Mode II: the crew separate by hand, turn for entry and fly it at full lift, to land 350 to 3,200 nautical miles downrange. Said, not flown',
    },
    {
      from: doc(9 * 60 + 22, `${KIT}, abort modes`),
      until: doc(709.34, `${EVENTS}, parking orbit insertion`),
      does: 'Mode IV (preferred): the CSM separates from the S-IVB and its service engine puts it in Earth orbit two minutes later, to fly the mission as an Earth-orbital alternate. Said, not flown',
    },
    {
      until: doc(709.34, `${EVENTS}, parking orbit insertion`),
      does: 'Mode III: the CSM separates, burns retrograde on its service engine if it must, and the command module flies half lift to land some 3,350 nautical miles downrange. Said, not flown',
    },
  ],
};

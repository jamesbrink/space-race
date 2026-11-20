/**
 * Apollo 17's launch as its records have it: SA-512 from Pad 39A through the translunar injection, the record the plan is
 * written from (vehicles/saturn-v-plan.ts `saturnVPlan`). All times are range time, s from range zero (05:33:00 UT on
 * 7 December 1972), the only night launch: the terminal countdown sequencer's automatic cutoff at T-30 s held the count
 * 2 h 40 min (§3), which moved the flight azimuth to 91.504°: the azimuth, the pitch commands, the orbit and the injection
 * here are those flown. The launch vehicle's figures are MSFC's flight evaluation's (MPR-SAT-FE-73-1): its event times
 * (Table 2-2), its trajectory at each event (Tables 4-1 to 4-4), its engines' reconstructed performance (Tables 5-2, 6-1,
 * 7-1, 7-2, §6.3) and its mass at each event (Tables 16-1 to 16-9). The S-IC's four outboard engines were cut by its fuel
 * depletion sensors, at the record's instant here; the S-II's four by its oxygen depletion sensors, and the run finds when
 * (`sii.outboard.spent`), as the S-IVB's guidance finds when the parking orbit is reached. What is read, what disagrees
 * and what is estimated is in mission.md beside this file.
 */
import { assumed, derived, doc, estimated } from '../../../../../src/measure.ts';
import type { OrbitFix, PlanCheck } from '../../../../../src/sim/plan.ts';
import type { SaturnVRecord } from '../../vehicles/saturn-v-record.ts';

const IN = 0.0254;
const LB = 0.45359237;
const LBF = 4.448221615;
const G0 = 9.80665;
const EVAL = 'Saturn V Launch Vehicle Flight Evaluation Report AS-512, Apollo 17 Mission (MSFC, MPR-SAT-FE-73-1)';
const EVENTS = `${EVAL}, Table 2-2, actual range time`;
const MASS = `${EVAL}, Tables 16-1 to 16-9 (actual, kg)`;
const MR = 'Apollo 17 Mission Report (JSC-07904)';
const AFJ = 'Apollo 17 Flight Journal, launch (apollojournals.org/afj/ap17fj/01_day01_launch.html), the air-to-ground';

/** The F-1s' mainstage propellant (Table 16-9) over the engine-seconds the run burns them from range zero: one engine's flow, kg/s. */
const F1_FLOW = 2_076_017 / (139.3 + 4 * 161.2);
/** Table 5-2: the five F-1s' standard sea-level specific impulse as reconstructed, lbf s/lbm (s), their mean. */
const F1_ISP = (265.0 + 265.7 + 265.2 + 265.4 + 264.9) / 5;
/**
 * The S-II's outboard J-2s at ESC+61 s (Table 6-1, engines 1 to 4, reconstructed): thrust, lbf, and impulse, s, their means.
 * The table's print is worn to blots: each figure was read with its engine's flow beside it (thrust over flow is the impulse
 * to the tenth) and the five thrusts with §6.3's stage total at that slice (1,156,694 lbf; these and the centre's sum to 6 lbf
 * over it).
 */
const SII_THRUST = (231_531 + 229_952 + 230_150 + 231_670) / 4;
const SII_ISP = (424.1 + 424.1 + 422.6 + 423.7) / 4;
/** The S-II's propellant at ignition and at its outboard cutoff (Table 16-3): liquid in and below the tanks, and the gas over it, kg. */
const SII_LOAD = 382_137 + 737 + 72_668 + 110;
const SII_LEFT = 635 + 767 + 1_248 + 123;
const SII_GAS = 1_832 - 137 + (757 - 17);
/** The S-IVB's second burn: its mainstage propellant (Table 16-7) and the flow at the 5.0 mixture ratio (Table 7-2), kg and kg/s. */
const SECOND_BURNED = 88_913 - 15_074;
const SECOND_FLOW = (400.95 + 79.91) * LB;
const SECOND_SHIFT = 11_649.8;
const SECOND_MAINSTAGE = 11_559.1;
const SECOND_CUT = 11_907.64;
/** What the second burn drew before its mixture-ratio shift, kg/s: what it burned less what the 5.0 ratio's flow burned after. */
const SECOND_EARLY = (SECOND_BURNED - SECOND_FLOW * (SECOND_CUT - SECOND_SHIFT)) / (SECOND_SHIFT - SECOND_MAINSTAGE);
/** The spacecraft's pieces in Table 16-9, kg: the lunar module, the escape system, the adapter's panels and what stayed with the S-IVB. */
const LM = 16_448;
const LES = 4_129;
const SLA_PANELS = 1_170;
const SLA_KEPT = 625;

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
  label: 'Saturn V SA-512 with CSM-114 America and LM-12 Challenger',
  liftoff: doc(2_917_844, `${EVAL}, Table 16-1, total vehicle at holddown arm release (first motion, 0.24 s)`),
  sic: {
    mass: derived(
      2_241_664 + 4_524 - 3_908,
      `${MASS}: the S-IC at holddown arm release (Table 16-1, 2,241,664 kg), and of the S-IC/S-II interstage (Table 16-1, 4,524 kg) what is not the large interstage let go at the second plane (Table 16-3, 3,908 kg): the small interstage that left with the S-IC (Table 16-9, 616 kg). The S-II carried no ullage motors (Table 16-9: none burned)`,
    ),
    propellant: {
      load: derived(
        1_447_435 + 21_886 + 633_521 + 6_001,
        `${EVAL}, Table 16-1 at holddown arm release: the oxygen and RP-1 in and below the tanks (§5.2's reconstruction has the same 3,239,298 and 1,409,906 lbm)`,
      ),
      usable: derived(
        1_447_435 + 21_886 + 633_521 + 6_001 - (810 + 15_736) - (5_968 + 5_953),
        `${EVAL}, Table 16-1: less the 16,546 kg of oxygen and 11,921 kg of RP-1 in and below the tanks at outboard cutoff, which the fuel's depletion sensors called (§5.4: 36,479 and 26,305 lbm, the fuel 11 kg more than the table's)`,
      ),
    },
    f1: {
      thrust: derived(
        F1_FLOW * F1_ISP * G0,
        `${EVAL}: the stage's mainstage propellant, 2,076,017 kg (Table 16-9), over the engine-seconds from range zero to the cutoffs (Table 2-2: 139.30 s for the centre, 161.20 for the four), ${F1_FLOW.toFixed(1)} kg/s an engine, at the reconstructed sea-level impulse (Table 5-2's mean, ${F1_ISP.toFixed(2)} s). The reconstruction's own thrusts at 35 to 38 s, reduced to standard sea level and pump inlet conditions, average 1,520 klbf (6,760 kN): the flight's ran higher as the oxygen's head rose`,
      ),
      isp: derived(
        F1_ISP,
        `${EVAL}, Table 5-2: the five engines' reconstructed standard sea-level specific impulse, their mean (264.9 to 265.7 lbf s/lbm)`,
      ),
      exitArea: assumed(
        Math.PI * ((11 * 12 + 7) * IN * 0.5) ** 2,
        'Rocketdyne F-1 fact sheet, Saturn V News Reference, p. R-1: the nozzle exit 11 ft 7 in across (saturn-v.md), the type’s figure taken for SA-512’s',
      ),
    },
    centreCut: doc(139.3, `${EVENTS} (§5.4: by the instrument unit, 0.02 s earlier than planned)`),
    outboardCut: doc(
      161.2,
      `${EVENTS} (§5.4: by the fuel depletion sensors, 0.47 s earlier than predicted, for a fuel denser than predicted after it chilled in the 2 h 40 min hold)`,
    ),
    separation: doc(
      162.9,
      `${SEPARATIONS}; Table 2-2 has the command to fire the separation devices and retro motors at the same instant, 1.6 s into time base 3`,
    ),
    push: estimated(
      8,
      `m/s: the S-IC's eight retrorockets parted the stages (the S-II's ullage motors had been deleted from AS-510 on, and the retrorockets, cut to four on AS-510, restored to eight from S-IC-11: AS-510's evaluation, §10; AS-512's, p. 15-3, likens its signal loss at the separation to prior flights' with eight). Read off ${EVAL}, Fig. 10-12: the AS-512 points rise from 15 ft at 2.5 s after outboard cutoff to 54 ft at 4.0 s, some 26 ft/s (8 m/s), the retrorockets burned out and the S-II not yet lit; how fast the run's are parted is that, taken`,
    ),
    decay: {
      centre: doc(
        669_632 * LBF,
        `${EVAL}, §5.4: the centre engine's cutoff impulse from the cutoff signal to no thrust, 669,632 lbf s (the stage's, 3,263,055)`,
      ),
      outboard: derived(
        (2_593_423 * LBF) / 4,
        `${EVAL}, §5.4: the outboard engines' cutoff impulse from the cutoff signal to no thrust, 2,593,423 lbf s, a quarter of it`,
      ),
    },
  },
  sii: {
    mass: derived(492_557 + 3_637, `${MASS}: the S-II and the S-II/S-IVB interstage at holddown arm release (Table 16-1)`),
    skirt: {
      mass: doc(3_908, `${EVAL}, Tables 16-3 and 16-9, the large S-IC/S-II interstage`),
      at: doc(192.9, `${EVENTS}, S-II second plane separation command`),
    },
    propellant: {
      load: derived(SII_LOAD, `${EVAL}, Table 16-3 at S-II ignition (164.59 s): the oxygen and hydrogen in and below the tanks`),
      usable: derived(
        SII_LOAD - SII_LEFT - SII_GAS,
        `${EVAL}, Table 16-3: less the ${SII_LEFT} kg in and below the tanks at outboard cutoff, and the ${SII_GAS} kg the tanks' ullage gas had grown by then, drawn off the propellant to pressurize the tanks and not through the engines (Table 6-1's flows exclude it). The engines' share so found, ${SII_LOAD - SII_LEFT - SII_GAS} kg, is within 43 kg of what Table 16-9 has them burn from the start's rise to the cutoff's decay (582 + 449,797 + 108 kg)`,
      ),
    },
    ignition: doc(
      166.4,
      `${EVENTS}, S-II mainstage (engine start command at 163.6 s, the start tank discharge valves open at 164.6 s): the start's rising thrust, and the 582 kg it burned (Table 16-9), are not flown`,
    ),
    centre: {
      thrust: doc(
        233_397 * LBF,
        `${EVAL}, Table 6-1, engine 5 (the centre) reconstructed at ESC+61 s: 233,397 lbf (the print worn: read with its flow, 549.83 lbm/s, and the stage total of §6.3)`,
      ),
      isp: doc(424.5, `${EVAL}, Table 6-1, engine 5: 424.5 lbf s/lbm`),
      cut: doc(
        461.21,
        `${EVENTS}, S-II center engine cutoff; §6.1 and §6.3: initiated by the instrument unit at ESC+297.62 s, 0.47 s earlier than planned in range time, as the sequence had it. The evaluation gives no reason for the early cut (AS-506's: against the low-frequency oscillation of AS-503 and AS-504); SA-512's centre engine flew the LOX feedline accumulator against pogo (§6.9: no S-II pogo)`,
      ),
      why: 'early, as planned',
    },
    outboard: {
      thrust: derived(
        SII_THRUST * LBF,
        `${EVAL}, Table 6-1, engines 1 to 4 reconstructed at ESC+61 s, their mean (${SII_THRUST.toFixed(0)} lbf; the print worn: each read with its flow and the stage total of §6.3)`,
      ),
      isp: derived(SII_ISP, `${EVAL}, Table 6-1, engines 1 to 4, their mean (${SII_ISP.toFixed(3)} lbf s/lbm)`),
      cut: doc(559.66, `${EVENTS}, S-II outboard engine cutoff, 0.47 s earlier than predicted (Table 4-2 at the same instant)`),
      spent:
        'by the stage’s oxygen depletion sensors (§6.1 and §6.4: 0.47 s earlier than predicted, an outboard engine operating time of 396.1 s)',
      shift: {
        at: doc(489.2, `${EVENTS}, S-II low engine mixture ratio shift (actual), 2.1 s earlier than predicted (§6.3: ESC+325.6 s)`),
        before: doc(1, 'the high mixture ratio’s figures, as given'),
        after: derived(
          787_009 / 920_746,
          `${EVAL}, §6.3: the stage's thrust at ESC+351 s, 787,009 lbf, over the four engines' after the centre's cutoff, 920,746 lbf`,
        ),
        flow: assumed(
          (787_009 / 920_746) * 0.98811,
          `the mean of SA-509's, SA-510's and SA-511's (MPR-SAT-FE-71-1 Table 6-3, -71-2 and -72-1 Table 6-2): each one's four's flow after the shift from its propellant mass history (best estimate) between the step command and the cutoff, less the pressurizing gas at its mean rate, over their thrust's share, 0.995, 0.987 and 0.982 (an impulse 0.5, 1.3 and 1.8 per cent higher at the low ratio), taken for SA-512's (the same two-position valve; its own table not read): the flow's share is the thrust's (§6.3) times 0.98811`,
        ),
      },
    },
    separation: doc(
      560.6,
      `${SEPARATIONS}; Table 2-2 has the command at 560.6 s, 1.0 s into time base 4, which the outboard cutoff started`,
    ),
    push: estimated(
      3,
      'm/s: NOT FOUND. The S-II’s four retrorockets and the S-IVB’s two ullage motors parted the stages; §10.6.3 says only that the accelerations were nominal. Apollo 11’s estimate, taken',
    ),
    decay: {
      centre: assumed(
        (121_100 * LBF) / 4,
        `${EVAL}, §6.4: the stage's cutoff impulse through the five per cent thrust level, 121,100 lbf s: its quarter, an outboard engine's (§6.4 reads no other), taken for the centre's`,
      ),
      outboard: derived(
        (121_100 * LBF) / 4,
        `${EVAL}, §6.4: the stage's cutoff impulse through the five per cent thrust level, 121,100 lbf s, a quarter of it`,
      ),
    },
  },
  les: {
    motor: {
      thrust: assumed(33_000 * LBF, 'Apollo 7 press kit (68-168K), p. 25: the tower jettison motor, 33,000 lb; the same motor taken'),
      burn: assumed(
        1.1,
        'Apollo Spacecraft News Reference, launch escape subsystem: the tower jettison motor burns slightly longer than one second, as Apollo 7',
      ),
    },
    mass: doc(LES, `${EVAL}, Table 16-9: the launch escape system let go after S-II mainstage`),
    at: estimated(
      198,
      `s: NOT FOUND in the record: Table 2-2 has the launch escape tower jettison "data not available". ${AFJ}: Evans "there it goes" at 000:03:20 and Cernan "There goes the tower" at 000:03:21; Cernan's call of the skirt's separation came at 000:03:15, some two seconds after Table 2-2's 192.9 s, and the tower is taken that much before Evans's call`,
    ),
  },
  sivb: {
    mass: derived(
      120_695 + 2_027 + SLA_PANELS + SLA_KEPT,
      `${MASS}: the S-IVB and the instrument unit at holddown arm release (Table 16-1), and the adapter (Table 16-9: its panels, 1,170 kg, and the 625 kg of the spacecraft not separated)`,
    ),
    payload: {
      label: 'Challenger, the lunar module, in the adapter, with the lunar roving vehicle folded in its quadrant I',
      mass: doc(
        LM,
        `${EVAL}, Table 16-9, the lunar module (36,262 lbm): LRV-3 rode folded in its descent stage’s quadrant I and is in that mass, Table 16-9 having no line of its own for it (the mission report's Table A-II has the lunar module at Earth lift-off at 36,277 lb)`,
      ),
      nodes: ['LMDescent', 'LMAscent', 'LMRover'],
    },
    propellant: {
      load: derived(
        88_572 + 166 + 19_826 + 19,
        `${EVAL}, Table 16-5 at S-IC ignition: the oxygen and hydrogen in and below the tanks (Table 7-3's best estimate, 195,636 and 43,752 lbm, without what is below the valves)`,
      ),
      usable: derived(
        88_572 + 166 + 19_826 + 19 - (1_760 + 180 + 989 + 23) + 9.22 * SECOND_FLOW,
        `${EVAL}, Table 16-7: less the 1,940 kg of oxygen and 1,012 kg of hydrogen in and below the tanks at the second cutoff, which would have run the oxygen dry 9.22 s later (§7.9) at the second burn's flow (Table 7-2)`,
      ),
    },
    first: {
      thrust: doc(205_797 * LBF, `${EVAL}, Table 7-1, first burn at STDV+135 s, standard altitude conditions: 205,797 lbf`),
      isp: doc(427.7, `${EVAL}, Table 7-1: 427.7 lbf s/lbm`),
      ignition: doc(
        566.2,
        `${EVENTS}, S-IVB mainstage (its start tank discharge valve open at 563.8 s): the start's rising thrust, and the 160 kg it burned (Table 16-9), are not flown`,
      ),
      cutoff: doc(
        702.65,
        `${EVENTS}, velocity cutoff command no. 1 (first guidance cutoff), 4.09 s earlier than predicted; §7.1: a burn 3.7 s shorter than predicted for the 91.5° azimuth, 4.1 s for the S-II/S-IVB separation's higher speed less 0.4 s for the S-IVB's lower performance`,
      ),
    },
    second: {
      thrust: doc(205_608 * LBF, `${EVAL}, Table 7-2, second burn at STDV+172 s, standard altitude conditions: 205,608 lbf`),
      isp: doc(427.6, `${EVAL}, Table 7-2: 427.6 lbf s/lbm`),
      ignition: doc(
        SECOND_MAINSTAGE,
        `${EVENTS}, S-IVB mainstage (second ignition, its start tank discharge valve open, at 11,556.6 s): the start's rising thrust, and the 198 kg it burned (Table 16-9), are not flown`,
      ),
      cutoff: doc(SECOND_CUT, `${EVENTS}, second guidance cutoff command no. 1, 2.10 s later than predicted`),
      speed: doc(10_844.6, `${CUTOFFS}: space-fixed velocity at the second guidance cutoff signal`),
      shift: {
        at: doc(
          SECOND_SHIFT,
          `${EVENTS}, engine mixture ratio control valve shift, begin valve movement (time base 6 + 671.2 s; §7.9: the valve commanded from the 4.5 position to the closed, about 5.0, at second ESC+100.0 s)`,
        ),
        before: derived(
          SECOND_EARLY / SECOND_FLOW,
          `${EVAL}: the second burn's mainstage propellant (Table 16-7, the stage at mainstage less at cutoff, ${SECOND_BURNED} kg) less what the 5.0 ratio's flow (Table 7-2, ${SECOND_FLOW.toFixed(2)} kg/s) burned from the shift to the cutoff, over the time from mainstage to the shift: ${SECOND_EARLY.toFixed(1)} kg/s at the 4.5 ratio, its thrust taken at the same impulse`,
        ),
        after: doc(1, 'the 5.0 mixture ratio’s figures (Table 7-2), as given'),
      },
      align: estimated(
        200,
        's: NOT FOUND. When the stack turned from its orbit attitude to the burn’s is not in Table 2-2; taken within the restart sequence, which began at 10,978.65 s (time base 6, Table 2-1). Apollo 11’s estimate, as Apollo 14’s, taken',
      ),
      target: {
        altitude: doc(300_000, `${CUTOFFS}: altitude at the second guidance cutoff signal (162.0 n mi)`),
        over: 'ellipsoid',
        climb: doc(6.93, `${CUTOFFS}: flight path angle at the second guidance cutoff signal`),
        inclination: doc(28.473, `${CUTOFFS}: inclination at the second guidance cutoff signal`),
      },
    },
    jets: estimated(
      0.05,
      'deg/s² about each axis: NOT FOUND. A 150 lbf attitude engine of the auxiliary propulsion modules ten metres from the stack’s centre of mass, against a 140 t stack some 37 m long (a uniform rod): of that order. Apollo 11’s estimate, taken',
    ),
  },
  csm: {
    mass: derived(
      52_738 - LM - LES - SLA_PANELS - SLA_KEPT,
      `${MASS}: the spacecraft at holddown arm release (Table 16-1, 52,738 kg) less the lunar module, the escape system, the adapter's panels and what of it stayed with the S-IVB (Table 16-9), which lists the command and service modules at 30,364 kg, its rows summing 2 kg short of its spacecraft`,
    ),
    cm: estimated(
      13_152 * LB,
      `${MR}, Table A-II: the command module after the modules parted at the end of the flight, 13,152 lb, the nearest figure read; it was heavier at launch by what it then used`,
    ),
  },
  ascent: {
    guidance: {
      azimuth: doc(
        91.504,
        `${EVAL}, §4.1: launched on an azimuth of 90°, "a roll maneuver was initiated at 13.0 seconds that placed the vehicle on a flight azimuth of 91.504 degrees east of north": the azimuth flown after the 2 h 40 min hold, not the planned 72°`,
      ),
      roll: {
        points: [
          [0, 1.504],
          [12.9, 1.504],
          [14.3, 0],
        ],
        confidence: 'derived',
        source: `${EVAL}, §4.1 and Table 2-2: the 1.504° from the pad's 90° to the flight azimuth, rolled between 12.9 s (begin pitch and roll maneuver; §4.1 rounds it to 13.0) and 14.3 s (end roll maneuver), taken as even`,
      },
      vertical: doc(12.9, `${EVENTS}, begin pitch and roll maneuver (the tower clearance yaw before it, 1.7 to 9.7 s, is not flown)`),
      kick: derived(160.1 - 12.9, `${EVENTS}: the tilt programme from its start to its arrest at 160.1 s`),
      programme: {
        points: [
          [0, 0],
          [12.9, 0],
          [20, 2.9],
          [25, 4.5],
          [30, 6.4],
          [35, 8.4],
          [40, 10.7],
          [45, 13.3],
          [50, 15.8],
          [55, 18.6],
          [60, 21.5],
          [65, 24.1],
          [70, 27.6],
          [75, 30.7],
          [80, 33.9],
          [85, 37.1],
          [90, 40.3],
          [95, 43.4],
          [100, 46.2],
          [105, 48.5],
          [110, 50.6],
          [115, 52.4],
          [120, 54.3],
          [125, 56],
          [130, 57.5],
          [135, 59.2],
          [140, 60.7],
          [145, 62.1],
          [150, 63.4],
          [155, 64.5],
          [160.1, 65.6],
        ],
        confidence: 'estimated',
        source: `${EVAL}, Fig. 9-5 (steering commands, first boost): the pitch attitude angle commanded, drawn negative, from the launch vertical, its line traced off the page scanned at 600 dpi against the figure's own gridlines at 0, 40 and 80° and 0, 100 and 200 s, each found where the line is read (they bow by up to 8 px, a degree), so to some half a degree and a second (the figure's 40° spans are 301 to 312 px), and smoothed over five seconds; flown open as the S-IC flew it and held from its arrest (160.1 s, Table 2-2; §10.3: "Between S-IC OECO and initiation of IGM Phase I, commands were held constant") at the figure's 65.6° there to the iterative guidance's start. Before 20 s the line lies in the zero gridline's stroke and is not read: the tilt is run straight from the programme's start at 12.9 s (Table 2-2) to the figure's 2.9° at 20 s; the line's breaks at 64 to 68 s and its crossing of the 40° gridline at 86 to 93 s are run straight. Past the arrest the line drawn goes on down another 2.3° by 204 s, against §10.3, and is not taken`,
      },
      turn: doc(
        204.1,
        `${EVENTS}: the iterative guidance's first phase begins (time base 3 + 42.9 s); its closed loop flown as the law's linear tangent`,
      ),
      target: {
        at: 'sivb-cutoff',
        altitude: doc(170_500, `${CUTOFFS}: altitude at the first guidance cutoff signal`),
        over: 'ellipsoid',
        climb: doc(0.001, `${CUTOFFS}: flight path angle at the first guidance cutoff signal`),
        inclination: doc(28.526, `${EVAL}, Table 4-4: the parking orbit's inclination`),
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
      ((15_074 * 3100 + 2_027 * 3355 + (SLA_PANELS + SLA_KEPT + LM) * 3540 + 30_366 * 3805) /
        (15_074 + 2_027 + SLA_PANELS + SLA_KEPT + LM + 30_366)) *
        IN,
      'the stack after the injection, its centre of mass above the F-1 exits: the S-IVB, the instrument unit, the adapter with Challenger and America, each by its mass at the second cutoff (Tables 16-7 and 16-9) at the middle of its stretch of the model (saturn_v.py), taken for the record’s run',
    ),
  },
  bound: {
    for: 'the Moon',
    next: 'Evans turned America round and docked with Challenger, drew it out of the adapter, and the S-IVB was sent on to strike the Moon; Cernan and Schmitt landed Challenger in the Taurus–Littrow valley and drove LRV-3, folded on its descent stage at launch, on three excursions: none of it is flown here, the stack coasting on whole with the Moon pulling on it. The rover is driven in its own gallery.',
  },
  orbit: {
    perigee: doc(166_600, `${EVAL}, Table 4-4, actual`),
    apogee: doc(167_200, `${EVAL}, Table 4-4, actual`),
    inclination: doc(28.526, `${EVAL}, Table 4-4, actual`),
    period: doc(87.83 * 60, `${EVAL}, Table 4-4, actual`),
    kind: {
      is: 'osculating',
      confidence: 'derived',
      source: `${EVAL}, Table 4-4: the insertion conditions, the orbit at 712.66 s from its state; its period the Kepler period of its heights over the ball they are over (Table 4-4 does not name it; the period and heights imply one of 6,378.3 km)`,
    },
    injection: {
      at: doc(712.66, `${EVAL}, Table 4-4, parking orbit insertion (Table 2-2: 712.6 s)`),
      heading: 'south',
      arc: derived(
        24.3,
        `${CUTOFFS}: 2,625.2 km surface range at the first cutoff and ten seconds more at 7,804 m/s, over a 6,378 km ball. Southbound: the pad lies a tenth of a degree from the orbit's northernmost latitude, and the insertion is past it, heading 105.0° (Table 4-4)`,
      ),
      anomaly: estimated(0, 'on an orbit so near a circle (eccentricity 0.0000, Table 4-4) the place of perigee means little'),
    },
    mass: doc(140_893, `${EVAL}, Table 16-5: the stack at the end of the first burn's decay, 702.90 s`),
  },
  marks: [
    { id: 'mach-1', label: 'Mach 1', at: doc(67.5, EVENTS) },
    { id: 'max-q', label: 'Greatest dynamic pressure', at: doc(82.5, EVENTS) },
    { id: 'insertion', label: 'Parking orbit insertion', at: doc(712.66, `${EVAL}, Table 4-4`) },
    { id: 'tli', label: 'Translunar injection', at: doc(11_917.6, EVENTS) },
  ],
  checks: [
    check('maxQ', 'Greatest dynamic pressure', 33_600, 'Pa', 3_000, `${EVAL}, Table 4-1: 3.36 N/cm² (701.75 lbf/ft²)`),
    check('maxQAt', 'Greatest dynamic pressure, when', 82.5, 's', 6, `${EVAL}, Table 4-1`),
    check('firstG', 'Greatest load on the S-IC', 3.87, 'g', 0.2, `${EVAL}, Table 4-1, at 161.20 s`),
    check('sic-centre-cutoff.speed', 'Speed at S-IC centre engine cutoff (space-fixed)', 2_091.8, 'm/s', 40, CUTOFFS),
    check('sic-centre-cutoff.altitude', 'Height at S-IC centre engine cutoff', 47_000, 'm', 2_500, CUTOFFS),
    check('sic-separation.speed', 'Speed at S-IC/S-II separation (space-fixed)', 2_754.2, 'm/s', 50, SEPARATIONS),
    check('sic-separation.altitude', 'Height at S-IC/S-II separation', 68_100, 'm', 3_000, SEPARATIONS),
    check('sic-separation.climb', 'Climb at S-IC/S-II separation', 20.151, '°', 1.5, SEPARATIONS),
    check('sii-centre-cutoff.speed', 'Speed at S-II centre engine cutoff (space-fixed)', 5_620.4, 'm/s', 60, CUTOFFS),
    check('sii-centre-cutoff.altitude', 'Height at S-II centre engine cutoff', 173_000, 'm', 5_000, CUTOFFS),
    // (the four's cut is the run's own, when its propellant is spent: saturn-v-plan.ts `siiSpent`)
    check('sii-outboard-cutoff.stop', 'S-II outboard engines cutoff, when (oxygen depletion)', 559.66, 's', 2, CUTOFFS),
    check('sii-separation.speed', 'Speed at S-II/S-IVB separation (space-fixed)', 6_992.8, 'm/s', 60, SEPARATIONS),
    check('sii-separation.altitude', 'Height at S-II/S-IVB separation', 172_600, 'm', 5_000, SEPARATIONS),
    check('cutoffAt', 'S-IVB first cutoff, when', 702.65, 's', 5, EVENTS),
    check('insertion.speed', 'Speed at parking orbit insertion (space-fixed)', 7_804.1, 'm/s', 5, `${EVAL}, Table 4-4`),
    check('injection.at', 'S-IVB second cutoff, when', SECOND_CUT, 's', 5, EVENTS),
    check('injection.mass', 'The stack at the second cutoff', 65_711, 'kg', 1_500, `${EVAL}, Table 16-7`),
    check(
      'injection.energy',
      'C3 at the second cutoff',
      -1_773_210,
      'm²/s²',
      30_000,
      `${CUTOFFS}: C3 at the second guidance cutoff signal`,
    ),
    check('injection.eccentricity', 'Eccentricity at the second cutoff', 0.9707, '', 0.002, CUTOFFS),
  ],
  coastFixes: [
    fix(SEPARATIONS, 162.9, 28.58, -79.637, 68.1, 2_754.2, 20.151, 91.741),
    fix(SEPARATIONS, 560.6, 26.865, -63.831, 172.6, 6_992.8, 0.244, 100.424),
    fix(`${EVAL}, Table 4-4, actual`, 712.66, 24.68, -53.81, 170.5, 7_804.1, 0.003, 105.021),
    fix(
      `${SEPARATIONS}: S-IVB/CSM separation, not flown, the stack coasting on whole`,
      13_347.6,
      -25.716,
      11.3,
      6_606.4,
      7_724.7,
      44.18,
      102.797,
    ),
  ],
  aborts: [
    {
      until: estimated(198, `the launch escape tower's jettison, its instant estimated from ${AFJ} (Table 2-2: data not available)`),
      does: 'Mode I: the escape tower pulls the command module off the launch vehicle, to come down in the Atlantic. Said, not flown: the command module’s escape and its descent are not in this flight’s plan',
    },
    {
      until: doc(9 * 60 + 21, `${AFJ}: CapCom Overmyer’s mark for Mode IV capability at 000:09:21`),
      does: 'Mode II: the crew separate by hand, turn for entry and fly it at full lift, to come down in the Atlantic. Said, not flown',
    },
    {
      from: doc(9 * 60 + 21, `${AFJ}: CapCom Overmyer’s mark for Mode IV capability at 000:09:21`),
      until: doc(712.66, `${EVAL}, Table 4-4, parking orbit insertion`),
      does: 'Mode IV: the CSM separates from the S-IVB and its service engine puts it in Earth orbit, to fly the mission as an Earth-orbital alternate. Said, not flown',
    },
    {
      until: doc(712.66, `${EVAL}, Table 4-4, parking orbit insertion`),
      does: 'Mode III: the CSM separates, burns retrograde on its service engine if it must, and the command module flies half lift to land in the eastern Atlantic. Said, not flown',
    },
  ],
};

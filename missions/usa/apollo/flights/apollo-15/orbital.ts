/**
 * Apollo 15's launch as its records have it: SA-510 from Pad 39A through the translunar injection, the record the plan is
 * written from (vehicles/saturn-v-plan.ts `saturnVPlan`). All times are range time, s from range zero (13:34:00 UT, on
 * time), on the flight azimuth of 80.088° the day's window gave it: the first J mission, its parking orbit some 20 km lower
 * than Apollo 14's for a heavier stack. The launch vehicle's figures are MSFC's flight evaluation's (MPR-SAT-FE-71-2): its
 * event times (Tables 2-2 and 9-7), its trajectory at each event (Tables 4-1 to 4-5), its engines' reconstructed
 * performance (Tables 5-1, 6-1, 7-1, 7-3, §6.3) and its mass at each event (Tables 16-1 to 16-9). From AS-510 the S-IC
 * carried four retrorockets, not eight, and the S-II no ullage motors (§10.6): the stages' push apart is read off the
 * evaluation's reconstructed separation distance. The S-II's four outboard engines burned until the stage's oxygen ran
 * down to its depletion sensors, and the run finds when (`sii.outboard.spent`), as the S-IVB's guidance finds when the
 * parking orbit is reached. Falcon rides in the adapter with the lunar roving vehicle folded in its quadrant I, inside the
 * lunar module's mass. What is read, what disagrees and what is estimated is in mission.md beside this file.
 */
import { assumed, derived, doc, estimated } from '../../../../../src/measure.ts';
import type { OrbitFix, PlanCheck } from '../../../../../src/sim/plan.ts';
import type { SaturnVRecord } from '../../vehicles/saturn-v-record.ts';

const IN = 0.0254;
const LB = 0.45359237;
const LBF = 4.448221615;
const G0 = 9.80665;
const FT = 0.3048;
const EVAL = 'Saturn V Launch Vehicle Flight Evaluation Report AS-510, Apollo 15 Mission (MSFC, MPR-SAT-FE-71-2)';
const EVENTS = `${EVAL}, Table 2-2, actual range time`;
const MASS = `${EVAL}, Tables 16-1 to 16-9 (actual, kg)`;
const MR = 'Apollo 15 Mission Report (MSC-05161)';
const AFJ = 'Apollo 15 Flight Journal, launch (apollojournals.org/afj/ap15fj/01launch_to_earth_orbit.html), the air-to-ground';

/** The F-1s' mainstage propellant (Table 16-9) over the engine-seconds the run burns them from range zero: one engine's flow, kg/s. */
const F1_FLOW = 2_068_461 / (135.96 + 4 * 159.56);
/** Table 5-1: the five F-1s' sea-level specific impulse as reconstructed, lbf s/lbm (s), their mean. */
const F1_ISP = (265.7 + 264.6 + 263.9 + 265.2 + 264.2) / 5;
/** The S-IC's propellant at holddown arm release and at its outboard cutoff (Table 16-1): oxygen and RP-1 in and below the tanks, kg. */
const SIC_LOAD = 1_446_975 + 21_887 + 624_362 + 5_996;
const SIC_LEFT = 962 + 13_160 + 6_353 + 5_958;
/** The S-II's outboard J-2s at ESC+61 s (Table 6-1, engines 1 to 4, reconstructed): thrust, lbf, and impulse, s, their means. */
const SII_THRUST = (233_173 + 235_406 + 234_833 + 232_950) / 4;
const SII_ISP = (425.1 + 424.1 + 423.7 + 424.6) / 4;
/** The S-II's propellant at ignition and at its outboard cutoff (Table 16-3): liquid in and below the tanks, and the gas over it, kg. */
const SII_LOAD = 379_369 + 737 + 71_994 + 111;
const SII_LEFT = 622 + 787 + 1_700 + 123;
const SII_GAS = 1_904 - 157 + (805 - 63);
/** The S-II's propellant in its tanks and sump at the mixture-ratio step command and at the outboard cutoff (Table 6-2, engine flowmeter integration: the best estimate), kg. */
const SII_AT_STEP = (102_707 + 24_957) * LB;
const SII_AT_OECO = (1_373 + 3_750) * LB;
/**
 * The four's flow after the shift as a share of their rated flow (Table 6-1): what the tanks lost from the step to the cutoff
 * (483.9 to 549.06 s) less the pressurizing gas at its mean rate over the burn (from the start command, 161.9 s), over the four's.
 */
const SII_LOW_FLOW =
  ((SII_AT_STEP - SII_AT_OECO) / (549.06 - 483.9) - SII_GAS / (549.06 - 161.9)) / ((4 * SII_THRUST * LBF) / (G0 * SII_ISP));
/** Their thrust's share after it (§6.3). */
const SII_LOW_FLOW_THRUST = 799_259 / 932_634;
/** The S-IVB's residuals at the second cutoff (Table 16-7): oxygen and hydrogen in and below the tanks, kg. */
const SIVB_LEFT_LOX = 1_759 + 180;
const SIVB_LEFT_LH2 = 754 + 26;
/** The S-IVB's second burn: its mainstage propellant (Table 16-7) and the flow at the 5.0 mixture ratio (Table 7-3), kg and kg/s. */
const SECOND_BURNED = 88_766 - 14_949;
const SECOND_FLOW = (394.87 + 80.17) * LB;
const SECOND_SHIFT = 10_259.4;
const SECOND_MAINSTAGE = 10_205.4;
const SECOND_CUT = 10_553.69;
/** What the second burn drew before its mixture-ratio shift, kg/s: what it burned less what the 5.0 ratio's flow burned after. */
const SECOND_EARLY = (SECOND_BURNED - SECOND_FLOW * (SECOND_CUT - SECOND_SHIFT)) / (SECOND_SHIFT - SECOND_MAINSTAGE);
/** The spacecraft at holddown arm release (Table 16-1) and what of it is not the command and service modules (Table 16-9), kg. */
const SPACECRAFT = 52_723;
const LM = 16_437;
const LES = 4_131;
const SLA_PANELS = 1_172;
const SLA_KEPT = 625;
const CSM = SPACECRAFT - LM - LES - SLA_PANELS - SLA_KEPT;
/**
 * The stages' separation distance (Fig. 10-15, reconstructed, read off the page): nothing at the physical separation, 1.6 s
 * after the outboard cutoff, and some 22 ft at 10 per cent J-2 thrust, 4.35 s after it. Its mean rate, m/s.
 */
const SEPARATION_RATE = (22 * FT) / (4.35 - 1.6);

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
  label: 'Saturn V SA-510 with CSM-112 Endeavour and LM-10 Falcon',
  liftoff: doc(2_902_833, `${EVAL}, Table 16-1, total vehicle at holddown arm release (first motion, 0.30 s; Table 16-9 has 2,902,832)`),
  sic: {
    mass: derived(
      2_231_021 + 4_119 - 3_504,
      `${MASS}: the S-IC at holddown arm release (Table 16-1, 2,231,021 kg), and of the S-IC/S-II interstage (Table 16-1, 4,119 kg) what is not the large interstage let go at the second plane (Table 16-3, 3,504 kg): the small interstage that left with the S-IC (615 kg). AS-510's S-II carried no ullage motors, and Table 16-3 no propellant for them`,
    ),
    propellant: {
      load: derived(
        SIC_LOAD,
        `${EVAL}, Table 16-1 at holddown arm release: the oxygen and RP-1 in and below the tanks (Table 5-2's reconstruction has the same 3,238,286 and 1,389,703 lbm)`,
      ),
      usable: derived(
        SIC_LOAD - SIC_LEFT,
        `${EVAL}, Table 16-1: less the 14,122 kg of oxygen and 12,311 kg of RP-1 in and below the tanks at outboard cutoff, which the oxygen's low-level sensors called (§5.5: 31,135 and 27,142 lbm). The kilogram table's oxygen and RP-1 in the tanks there are defaced: its pound table (2,121 and 14,006 lbm), its stage total and §5.5 give 962 and 6,353 kg`,
      ),
    },
    f1: {
      thrust: derived(
        F1_FLOW * F1_ISP * G0,
        `${EVAL}: the stage's mainstage propellant, 2,068,461 kg (Table 16-9), over the engine-seconds from range zero to the cutoffs (Table 2-2: 135.96 s for the centre, 159.56 for the four), ${F1_FLOW.toFixed(1)} kg/s an engine, at the reconstructed sea-level impulse (Table 5-1's mean, ${F1_ISP.toFixed(2)} s). The reconstruction's own thrusts at 35 to 38 s, reduced to standard sea level and pump inlet conditions, average 1,512 klbf (6,726 kN), 10 klbf under the prediction: SA-510's were the first F-1s reorificed after the stage's static firing without a second firing to prove it (§5.3); the flight's ran higher as the oxygen's head rose`,
      ),
      isp: derived(
        F1_ISP,
        `${EVAL}, Table 5-1: the five engines' reconstructed sea-level specific impulse, their mean (263.9 to 265.7 lbf s/lbm)`,
      ),
      exitArea: assumed(
        Math.PI * ((11 * 12 + 7) * IN * 0.5) ** 2,
        'Rocketdyne F-1 fact sheet, Saturn V News Reference, p. R-1: the nozzle exit 11 ft 7 in across (saturn-v.md), the type’s figure taken for SA-510’s',
      ),
    },
    centreCut: doc(135.96, `${EVENTS} (§5.4: by a signal from the instrument unit at 136.0 s, 0.1 s earlier than planned)`),
    outboardCut: doc(
      159.56,
      `${EVENTS} (§5.4: by a signal from the oxygen low-level sensors, 0.53 s later than predicted, most of it the low thrust; from AS-510 the sensors' cutoff timer was set to 1.6 s, not 1.2, to burn 6,700 lb more of the oxygen)`,
    ),
    separation: doc(
      161.2,
      `${SEPARATIONS}; Table 2-2 has the command to fire the separation devices and retrorockets at the same instant, 1.6 s after the start of time base 3: every event in it was put one second later than on SA-509 to gain separation distance (§10.6)`,
    ),
    push: derived(
      SEPARATION_RATE,
      `m/s: ${EVAL}, §10.6 and Fig. 10-15 (the reconstructed separation distance, read off the page): from AS-510 four of the S-IC's eight retrorockets and all of the S-II's ullage motors were deleted, and the distance at the S-II's start was less than on any flight before and less than predicted. It grew from nothing at the physical separation, 1.6 s after the outboard cutoff, to some 22 ft at 10 per cent J-2 thrust, 4.35 s after it: its mean rate, taken because the run flies the push as one impulse and none of the F-1s' tailoff, which §10.6 blames for the shortfall. The rate itself was higher at first, some 5 m/s as the retrorockets burned out, 2.6 s after the cutoff, and fell to under 2 m/s by 4 s under the tailoff's thrust`,
    ),
    decay: {
      centre: doc(667_656 * LBF, `${EVAL}, §5.4: the centre engine's cutoff impulse from the cutoff signal to no thrust, 667,656 lbf s`),
      outboard: estimated(
        (2_644_945 * LBF) / 4,
        `${EVAL}, §5.4: the outboard engines' cutoff impulse from the cutoff signal to no thrust, 2,64_,945 lbf s, its fourth digit defaced on the scan and taken in the middle (2,644,945, within 0.2 per cent), a quarter of it`,
      ),
    },
  },
  sii: {
    mass: derived(488_493 + 3_641, `${MASS}: the S-II and the S-II/S-IVB interstage at holddown arm release (Table 16-1)`),
    skirt: {
      mass: doc(3_504, `${EVAL}, Tables 16-3 and 16-9, the large S-IC/S-II interstage`),
      at: doc(191.2, `${EVENTS}, second plane separation command (§10.6: as predicted, its dynamics over by 192.4 s)`),
    },
    propellant: {
      load: derived(SII_LOAD, `${EVAL}, Table 16-3 at S-II ignition (163.0 s): the oxygen and hydrogen in and below the tanks`),
      usable: derived(
        SII_LOAD - SII_LEFT - SII_GAS,
        `${EVAL}, Table 16-3: less the ${SII_LEFT} kg in and below the tanks at outboard cutoff, and the ${SII_GAS} kg the tanks' ullage gas had grown by then, drawn off the propellant to pressurize the tanks and not through the engines (Table 6-1's flows exclude it). The engines' share so found, ${SII_LOAD - SII_LEFT - SII_GAS} kg, is within 118 kg of what Table 16-9 has them burn from the start's rise to the cutoff's decay (582 + 445,843 + 183 kg)`,
      ),
    },
    ignition: doc(
      164.9,
      `${EVENTS}, S-II mainstage (engine start command at 161.9 s, the start tank discharge valves open at 163.0 s; §6.2: every engine at mainstage within 3.1 s of the start command): the start's rising thrust, and the 582 kg it burned (Table 16-9), are not flown`,
    ),
    centre: {
      thrust: doc(233_300 * LBF, `${EVAL}, Table 6-1, engine 5 (the centre) reconstructed at ESC+61 s: 233,300 lbf`),
      isp: doc(424.4, `${EVAL}, Table 6-1, engine 5: 424.4 lbf s/lbm`),
      cut: doc(
        459.56,
        `${EVENTS}, S-II center engine cutoff; §6.1: "Center Engine Cutoff (CECO) occurred as planned"; §6.3: "initiated at ESC +297.6 seconds as planned" (Table 9-7: at T3+299.971 s). The evaluation gives no other reason; the pogo-limiting backup cutoff, which would have cut it on vibration, gave no output (§8.3). SA-510's centre engine flew the LOX feedline accumulator, the second stage so fitted, which suppressed pogo (§6.1)`,
      ),
      why: 'early, as planned',
    },
    outboard: {
      thrust: derived(
        SII_THRUST * LBF,
        `${EVAL}, Table 6-1, engines 1 to 4 reconstructed at ESC+61 s, their mean (${SII_THRUST.toFixed(0)} lbf)`,
      ),
      isp: derived(SII_ISP, `${EVAL}, Table 6-1, engines 1 to 4, their mean (${SII_ISP.toFixed(3)} lbf s/lbm)`),
      cut: doc(549.06, `${EVENTS}, S-II outboard engine cutoff, 0.64 s earlier than predicted (Table 4-2 at the same instant)`),
      spent:
        'by the stage’s oxygen depletion cutoff (§6.1, §6.4 and §6.5: after its 1.5 s timer, at ESC+387.11 s, 1.16 s earlier than planned, "the result of increased propellant flows at low EMR")',
      shift: {
        at: doc(
          483.9,
          `${EVENTS}, S-II low engine mixture ratio shift (actual) (§6.3: 321.9 s after the start command; §6.5: commanded on the instrument unit's velocity at ESC+321.8 s, 0.6 s earlier than the trajectory's; Table 9-7: 483.71 s)`,
        ),
        before: doc(1, 'the high mixture ratio’s figures, as given'),
        after: derived(
          799_259 / 932_634,
          `${EVAL}, §6.3: the stage's thrust at ESC+350 s, 799,259 lbf, over the four engines' after the centre's cutoff, 932,634 lbf`,
        ),
        flow: derived(
          SII_LOW_FLOW,
          `${EVAL}, Table 6-2: the four's flow after the shift from the stage's propellant mass history (engine flowmeter integration, the best estimate): what the tanks lost from the step command to the outboard cutoff over that time, less the pressurizing gas at its mean rate over the burn (${SII_GAS} kg, above), over the four's rated flow at ESC+61 s: ${SII_LOW_FLOW.toFixed(4)}, against the thrust's ${(SII_LOW_FLOW_THRUST).toFixed(4)} (an impulse ${(100 * (SII_LOW_FLOW_THRUST / SII_LOW_FLOW - 1)).toFixed(1)} per cent higher at the low ratio; SA-509 to SA-511's books give 0.5 to 1.8)`,
        ),
      },
    },
    separation: doc(
      550.1,
      `${SEPARATIONS}; Table 2-2 has the command at 550.1 s, 1.0 s into time base 4, which the outboard cutoff started`,
    ),
    push: estimated(
      3,
      'm/s: NOT FOUND. The S-II’s four retrorockets and the S-IVB’s two ullage motors parted the stages, "normal with nominal S-II retro motor and S-IVB ullage motor performance" (§10.6); how fast is not in the evaluation. Apollo 14’s estimate (Apollo 11’s), taken',
    ),
    decay: {
      centre: assumed(
        (101_700 * LBF) / 4,
        `${EVAL}, §6.4: the stage's cutoff impulse through the 5 per cent thrust level, 101,700 lbf s: its quarter, an outboard engine's (§6.4 reads no other), taken for the centre's`,
      ),
      outboard: derived(
        (101_700 * LBF) / 4,
        `${EVAL}, §6.4: the stage's cutoff impulse through the 5 per cent thrust level, 101,700 lbf s, a quarter of it`,
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
    at: doc(195.9, `${EVENTS}, launch escape tower jettison`),
  },
  sivb: {
    mass: derived(
      120_798 + 2_035 + SLA_PANELS + SLA_KEPT,
      `${MASS}: the S-IVB and the instrument unit at holddown arm release (Table 16-1), and the adapter (Table 16-9: its panels, 1,172 kg, and the 625 kg of the spacecraft not separated)`,
    ),
    payload: {
      label: 'Falcon, the lunar module, in the adapter, with the lunar roving vehicle folded in its quadrant I',
      mass: doc(
        LM,
        `${EVAL}, Table 16-9, the lunar module (36,238 lbm): the rover rode folded in its descent stage’s quadrant I and is in that mass, Table 16-9 having no line of its own for it`,
      ),
      nodes: ['LMDescent', 'LMAscent', 'LMRover'],
    },
    propellant: {
      load: derived(
        88_641 + 166 + 19_788 + 21,
        `${EVAL}, Table 16-5 at S-IC ignition: the oxygen and hydrogen in and below the tanks (Table 7-4's best estimate, 195,788 and 43,674 lbm)`,
      ),
      usable: derived(
        88_641 + 166 + 19_788 + 21 - SIVB_LEFT_LOX - SIVB_LEFT_LH2 + 9.41 * SECOND_FLOW,
        `${EVAL}, Table 16-7: less the ${SIVB_LEFT_LOX} kg of oxygen and ${SIVB_LEFT_LH2} kg of hydrogen in and below the tanks at the second cutoff, which would have run the oxygen dry 9.41 s later (§7.9) at the second burn's flow (Table 7-3)`,
      ),
    },
    first: {
      thrust: doc(202_965 * LBF, `${EVAL}, Table 7-1, first burn at STDV+130 s, standard altitude conditions: 202,965 lbf`),
      isp: doc(427.6, `${EVAL}, Table 7-1: 427.6 lbf s/lbm`),
      ignition: doc(
        555.7,
        `${EVENTS}, S-IVB mainstage (its start tank discharge valve open at 553.2 s): the start's rising thrust, and the 165 kg it burned (Table 16-9), are not flown`,
      ),
      cutoff: doc(
        694.68,
        `${EVENTS}, velocity cutoff command no. 1 (first guidance cutoff), 4.40 s earlier than predicted; §7.1: a burn of 141.5 s, 3.8 s shorter than predicted, some 2.6 s of it the S-IVB's higher thrust and the rest the lower stages' performance`,
      ),
    },
    second: {
      thrust: doc(203_111 * LBF, `${EVAL}, Table 7-3, second burn at STDV+130 s, standard altitude conditions: 203,111 lbf`),
      isp: doc(427.6, `${EVAL}, Table 7-3: 427.6 lbf s/lbm`),
      ignition: doc(
        SECOND_MAINSTAGE,
        `${EVENTS}, S-IVB mainstage (second ignition, its start tank discharge valve open, at 10,202.9 s; Table 16-7 has 10,205.80): the start's rising thrust, and the 156 kg it burned (Table 16-9), are not flown`,
      ),
      cutoff: doc(SECOND_CUT, `${EVENTS}, second guidance cutoff command no. 1 (§7.8: a burn of 350.8 s, 5.4 s shorter than predicted)`),
      speed: doc(10_852.9, `${CUTOFFS}: space-fixed velocity at the second guidance cutoff signal`),
      shift: {
        at: doc(
          SECOND_SHIFT,
          `${EVENTS}, engine mixture ratio control valve shift, begin valve movement (§7.9: the valve, open at the 4.5 position from the start, the first restart so made (§7.1), commanded to the closed 5.0 position at second ESC+64.5 s; Table 9-7: 10,258.79 s)`,
        ),
        before: derived(
          SECOND_EARLY / SECOND_FLOW,
          `${EVAL}: the second burn's mainstage propellant (Table 16-7, the stage at mainstage less at cutoff, ${SECOND_BURNED} kg, as Table 16-9) less what the 5.0 ratio's flow (Table 7-3, ${SECOND_FLOW.toFixed(2)} kg/s) burned from the shift to the cutoff, over the time from mainstage to the shift: ${SECOND_EARLY.toFixed(1)} kg/s at the 4.5 ratio (Fig. 7-9 draws some 417 lbm/s, 189 kg/s), its thrust taken at the same impulse`,
        ),
        after: doc(1, 'the 5.0 mixture ratio’s figures (Table 7-3), as given'),
      },
      align: estimated(
        200,
        's: NOT FOUND. When the stack turned from its orbit attitude to the burn’s is not in Table 2-2; taken within the restart sequence, which began at 9,624.9 s (time base 6). Apollo 14’s estimate (Apollo 11’s), taken',
      ),
      target: {
        altitude: doc(307_500, `${CUTOFFS}: altitude at the second guidance cutoff signal`),
        over: 'ellipsoid',
        climb: doc(6.952, `${CUTOFFS}: flight path angle at the second guidance cutoff signal`),
        inclination: doc(29.685, `${CUTOFFS}: inclination at the second guidance cutoff signal`),
      },
    },
    jets: estimated(
      0.05,
      'deg/s² about each axis: NOT FOUND. A 150 lbf attitude engine of the auxiliary propulsion modules ten metres from the stack’s centre of mass, against a 141 t stack some 37 m long (a uniform rod): of that order. Apollo 14’s estimate (Apollo 11’s), taken',
    ),
  },
  csm: {
    mass: derived(
      CSM,
      `${MASS}: the spacecraft at holddown arm release (Table 16-1, 52,723 kg) less the lunar module, the escape system, the adapter's panels and what of it stayed with the S-IVB (Table 16-9), which lists the command and service modules at 30,356 kg, its rows summing 2 kg short of its spacecraft`,
    ),
    cm: estimated(
      12_965 * LB,
      `${MR}, Table A-III: the command module after the modules parted at the end of the flight, the nearest figure read (a worn scan: with the service module's 13,358 lb it makes the 26,323 lb of the two before they parted); it was heavier at launch by what it then used`,
    ),
  },
  ascent: {
    guidance: {
      azimuth: doc(
        80.088,
        `${EVAL}, §4.1: launched on an azimuth of 90°, "a roll maneuver was initiated at 12.2 seconds that placed the vehicle on a flight azimuth of 80.088 degrees east of north"`,
      ),
      roll: {
        points: [
          [0, -9.912],
          [12.2, -9.912],
          [23.0, 0],
        ],
        confidence: 'derived',
        source: `${EVAL}, §4.1 and Table 2-2: the 9.912° from the pad's 90° to the flight azimuth, rolled between 12.2 and 23.0 s, taken as even`,
      },
      vertical: doc(12.2, `${EVENTS}, begin pitch and roll maneuver (the tower clearance yaw before it, 1.7 to 9.7 s, is not flown)`),
      kick: derived(156.9 - 12.2, `${EVENTS}: the tilt programme from its start to its arrest at 156.9 s`),
      programme: {
        points: [
          [0, 0],
          [12.2, 0],
          [30, 5.5],
          [35, 8.0],
          [40, 10.5],
          [45, 13.4],
          [50, 16.6],
          [55, 20.2],
          [60, 23.8],
          [65, 27.3],
          [70, 30.6],
          [75, 33.8],
          [80, 36.9],
          [85, 39.7],
          [90, 42.4],
          [95, 44.8],
          [100, 47.2],
          [105, 49.4],
          [110, 51.6],
          [115, 53.5],
          [120, 55.3],
          [125, 56.9],
          [130, 58.6],
          [135, 60.0],
          [140, 61.5],
          [145, 62.8],
          [150, 64.1],
          [155, 65.3],
          [156.9, 65.6],
          [160, 65.8],
        ],
        confidence: 'estimated',
        source: `${EVAL}, Fig. 9-10: the rate-limited pitch steering command (the attitude command from the launch vertical), its line traced off the page scanned at 600 dpi against the figure's own grid and smoothed over five seconds, flown open as the S-IC flew it and held from its arrest (156.9 s, Table 2-2; Table 9-7: the pitch command frozen at 156.17 s; the figure's plateau, 65.8°) to the iterative guidance's start. Its frame stands 8 per cent of a hundred seconds short of its first gridline (273.5 pixels against the 296.6 between the others); its time axis bears no 0, and Fig. 9-11 beside it is framed the same and draws nothing of the tower clearance yaw (1.7 to 9.7 s, Table 2-2): read as a frame at 7.8 s on the scale of the rest, not as a first hundred seconds drawn short (as Apollo 14's Fig. 9-4 was read), some two seconds and half a degree at best. Read the other way, every point before 100 s comes up to 6 s earlier (mission.md). Before 30 s the line runs straight from the frame's corner to 5° at 29 s, through nothing at the programme's start at 12.2 s (Table 2-2), which is taken, and the tilt run straight from it to the figure's 30 s; the figure draws the iterative guidance's first step at 200 to 202 s, with Table 2-2's 202.6 s`,
      },
      turn: doc(
        202.6,
        `${EVENTS}: the iterative guidance's first phase begins (Table 9-7: at T3+43.045 s, 202.62 s); its closed loop flown as the law's linear tangent`,
      ),
      target: {
        at: 'sivb-cutoff',
        altitude: doc(172_600, `${CUTOFFS}: altitude at the first guidance cutoff signal`),
        over: 'ellipsoid',
        climb: doc(0.013, `${CUTOFFS}: flight path angle at the first guidance cutoff signal`),
        inclination: doc(29.679, `${EVAL}, Table 4-4: the parking orbit's inclination`),
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
      ((14_949 * 3100 + 2_035 * 3355 + (SLA_PANELS + SLA_KEPT + LM) * 3540 + CSM * 3805) /
        (14_949 + 2_035 + SLA_PANELS + SLA_KEPT + LM + CSM)) *
        IN,
      'the stack after the injection, its centre of mass above the F-1 exits: the S-IVB, the instrument unit, the adapter with Falcon (the rover in it) and Endeavour, each by its mass at the second cutoff (Tables 16-7 and 16-9) at the middle of its stretch of the model (saturn_v.py), taken for the record’s run',
    ),
  },
  bound: {
    for: 'the Moon',
    next: 'Worden turned Endeavour round, docked with Falcon and drew it out of the adapter, the folded rover with it, and the S-IVB was sent on to strike the Moon; Scott and Irwin landed Falcon at Hadley–Apennine and drove the rover on three excursions: none of it is flown here, the stack coasting on whole with the Moon pulling on it. The rover is driven in its own gallery.',
  },
  orbit: {
    radius: doc(6_378_165, `${EVAL}, Table 4-4: apogee and perigee based on a spherical earth of radius 6,378.165 km`),
    perigee: doc(166_000, `${EVAL}, Table 4-4, actual`),
    apogee: doc(169_500, `${EVAL}, Table 4-4, actual`),
    inclination: doc(29.679, `${EVAL}, Table 4-4, actual`),
    period: doc(87.84 * 60, `${EVAL}, Table 4-4, actual`),
    kind: {
      is: 'osculating',
      confidence: 'derived',
      source: `${EVAL}, Table 4-4: the insertion conditions, the orbit at 704.67 s from its state; its period is the Kepler period of its heights over the stated ball (87.84 min)`,
    },
    injection: {
      at: doc(704.67, `${EVAL}, Table 4-4, parking orbit insertion (Table 2-2: 704.7 s)`),
      heading: 'north',
      arc: derived(
        24.1,
        `${CUTOFFS}: 2,605.4 km surface range at the first cutoff and ten seconds more at 7,802 m/s, over a 6,378 km ball`,
      ),
      anomaly: estimated(0, 'on an orbit so near a circle (eccentricity 0.0003, Table 4-4) the place of perigee means little'),
    },
    mass: doc(140_938, `${EVAL}, Table 16-5: the stack at the end of the first burn's decay, 694.90 s`),
  },
  marks: [
    { id: 'mach-1', label: 'Mach 1', at: doc(65.0, EVENTS) },
    { id: 'max-q', label: 'Greatest dynamic pressure', at: doc(82.0, EVENTS) },
    { id: 'insertion', label: 'Parking orbit insertion', at: doc(704.67, `${EVAL}, Table 4-4`) },
    { id: 'tli', label: 'Translunar injection', at: doc(10_563.7, EVENTS) },
  ],
  checks: [
    check('maxQ', 'Greatest dynamic pressure', 36_800, 'Pa', 3_000, `${EVAL}, Table 4-1: 3.68 N/cm²`),
    check('maxQAt', 'Greatest dynamic pressure, when', 82.0, 's', 6, `${EVAL}, Table 4-1`),
    check('firstG', 'Greatest load on the S-IC', 3.97, 'g', 0.2, `${EVAL}, Table 4-1, at 159.56 s`),
    check('sic-centre-cutoff.speed', 'Speed at S-IC centre engine cutoff (space-fixed)', 2_044.7, 'm/s', 40, CUTOFFS),
    check('sic-centre-cutoff.altitude', 'Height at S-IC centre engine cutoff', 46_800, 'm', 2_500, CUTOFFS),
    check('sic-separation.speed', 'Speed at S-IC/S-II separation (space-fixed)', 2_762.2, 'm/s', 50, SEPARATIONS),
    check('sic-separation.altitude', 'Height at S-IC/S-II separation', 70_100, 'm', 3_000, SEPARATIONS),
    check('sic-separation.climb', 'Climb at S-IC/S-II separation', 21.021, '°', 1.5, SEPARATIONS),
    check('sii-centre-cutoff.speed', 'Speed at S-II centre engine cutoff (space-fixed)', 5_713.4, 'm/s', 60, CUTOFFS),
    check('sii-centre-cutoff.altitude', 'Height at S-II centre engine cutoff', 178_200, 'm', 5_000, CUTOFFS),
    // (the four's cut is the run's own, when its propellant is spent: saturn-v-plan.ts `siiSpent`)
    check('sii-outboard-cutoff.stop', 'S-II outboard engines cutoff, when (oxygen depletion)', 549.06, 's', 2, CUTOFFS),
    check('sii-separation.speed', 'Speed at S-II/S-IVB separation (space-fixed)', 6_999.0, 'm/s', 60, SEPARATIONS),
    check('sii-separation.altitude', 'Height at S-II/S-IVB separation', 176_300, 'm', 5_000, SEPARATIONS),
    check('cutoffAt', 'S-IVB first cutoff, when', 694.68, 's', 5, EVENTS),
    check('insertion.speed', 'Speed at parking orbit insertion (space-fixed)', 7_803.7, 'm/s', 5, `${EVAL}, Table 4-4`),
    check('injection.at', 'S-IVB second cutoff, when', SECOND_CUT, 's', 5, EVENTS),
    check('injection.mass', 'The stack at the second cutoff', 65_576, 'kg', 1_500, `${EVAL}, Table 16-7`),
    check(
      'injection.energy',
      'C3 at the second cutoff',
      -1_522_505,
      'm²/s²',
      30_000,
      `${CUTOFFS}: C3 at the second guidance cutoff signal`,
    ),
    check('injection.eccentricity', 'Eccentricity at the second cutoff', 0.9749, '', 0.002, CUTOFFS),
  ],
  coastFixes: [
    fix(SEPARATIONS, 161.2, 28.748, -79.661, 70.1, 2_762.2, 21.021, 82.144),
    fix(SEPARATIONS, 550.1, 29.843, -63.922, 176.3, 6_999.0, 0.047, 89.9),
    fix(`${EVAL}, Table 4-4, actual`, 704.67, 29.365, -53.081, 172.6, 7_803.7, 0.015, 95.531),
    fix(
      `${SEPARATIONS}: S-IVB/CSM separation, not flown, the stack coasting on whole`,
      12_147.2,
      19.957,
      -62.502,
      7_459.8,
      7_494.1,
      46.011,
      112.493,
    ),
  ],
  aborts: [
    {
      until: doc(195.9, `${EVENTS}, launch escape tower jettison`),
      does: 'Mode I: the escape tower pulls the command module off the launch vehicle, to come down in the Atlantic. Said, not flown: the command module’s escape and its descent are not in this flight’s plan',
    },
    {
      until: doc(9 * 60 + 15, `${AFJ}: CapCom Fullerton’s mark for Mode IV capability at 000:09:15`),
      does: 'Mode II: the crew separate by hand, turn for entry and fly it at full lift, to come down in the Atlantic. Said, not flown',
    },
    {
      from: doc(9 * 60 + 15, `${AFJ}: CapCom Fullerton’s mark for Mode IV capability at 000:09:15`),
      until: doc(704.67, `${EVAL}, Table 4-4, parking orbit insertion`),
      does: 'Mode IV: the CSM separates from the S-IVB and its service engine puts it in Earth orbit, to fly the mission as an Earth-orbital alternate. Said, not flown',
    },
    {
      until: doc(704.67, `${EVAL}, Table 4-4, parking orbit insertion`),
      does: 'Mode III: the CSM separates, burns retrograde on its service engine if it must, and the command module flies half lift to land in the eastern Atlantic. Said, not flown',
    },
  ],
};

/**
 * Gemini-Titan 4 as a flight into orbit: its record (vehicles/gemini-titan-plan.ts `GeminiTitanRecord`), which flight.ts
 * writes its plan from (`geminiTitanPlan`). The record with its sources and disagreements is set out in mission.md beside
 * this file; the numbers live here, each in the source's own units and converted once.
 *
 * Times are seconds from liftoff, 15:15:59.562 UTC. The checks' tolerances were written with the record, before the plan
 * was first flown, and nothing here was changed after: a miss is recorded (src/sim/misses.ts), not fitted. Almost all of
 * it is this flight's own mission report (MSC-G-R-65-3), which has GLV-4's weights and engines, every event of the launch
 * to the hundredth of a second, each of the 74 thrusts of the station keeping, the orbit day by day, the burn before
 * retrofire and the entry flown: where a figure is the type's, it says so.
 */
import { assumed, derived, doc, estimated } from '../../../../../src/measure.ts';
import { GLV_NOZZLES } from '../../vehicles/gemini-titan.ts';
import type { GeminiTitanRecord, Manoeuvre } from '../../vehicles/gemini-titan-plan.ts';

const IN = 0.0254;
const FT = 0.3048;
const LB = 0.45359237;
const LBF = 4.4482216;
const NMI = 1852;

/** Seconds from liftoff of a ground elapsed time, hours, minutes and seconds. */
const T = (h: number, m: number, s: number): number => h * 3600 + m * 60 + s;

const GIV = 'Gemini Program Mission Report, Gemini IV (MSC-G-R-65-3, July 1965)';
const KIT = 'NASA release 65-158, the Gemini-Titan 4 press kit (May 1965)';
const SP121 = 'Gemini Midprogram Conference (NASA SP-121, 1966)';
const SP138 = 'Gemini Summary Conference (NASA SP-138, 1967)';
const GI = 'Gemini Program Mission Report GT-1 (NTRS 19670095753)';
const CR1106 = 'Project Gemini: A Technical Summary (Malik and Souris, NASA CR-1106, 1968)';
const SEDR = 'Project Gemini Familiarization Manual, SEDR 300 vol. 1 (McDonnell, 30 September 1965)';
const LSFR = 'Gemini Program Launch Systems Final Report (Aerospace Corporation, January 1967)';
const KING_HELE =
  '“a value of 2.2 is recommended for perigee heights of 150-400 km”, on the cross-section square to the motion (King-Hele, The Prediction of Satellite Lifetimes, RAE TR 87030, 1987, §9.1, after Cook 1965): a satellite’s, as Vostok’s and Mercury’s (vostok-3ka.ts SHIP_RAREFIED). Nothing published for Gemini';

const SECTION_DRIFT = estimated(
  0.5,
  'scene approximation for the two adapter sections once released; the separation speeds were not found',
);
/** The launch vehicle's stations above the first stage engines' exit, m: station 1348.103 is the exit (titan-ii-glv.md). */
const STATION = (s: number) => (1348.103 - s) * IN;
/** The spacecraft's Z stations above the same exit: Z13.44, the adapter's foot, sits on station 276.825 (gemini-titan.ts `BASE`). */
const Z = (z: number) => (1071.278 + z - 13.44) * IN;
const NOSE_CAP = {
  from: derived(Z(233.97), `${SEDR}, Figure 2-3: base of the 5.31 in cap`),
  to: derived(Z(239.28), `${SEDR}, Figure 2-3: nose tip`),
};
const SCANNER_COVER = {
  from: estimated(Z(166.5), 'aft end of the cover in NASA S65-21090, as modelled in gemini_spacecraft.py'),
  to: estimated(Z(190.5), 'forward end of the cover in the same photograph'),
};

// GLV-4's weights with spacecraft 4 (the report, section 3.3, p. 3-10, "obtained from Aerospace Corporation"), and the
// spacecraft's own through its descent (p. 3-11), lb
const GLV4_LIFTOFF = 336_000;
const GLV4_BECO = 85_000;
const GLV4_STAGE2_STEADY = 73_400;
const GLV4_SECO20 = 13_300;
const SC4_LAUNCH = 7_879.05;
const RETROGRADE = 5_432.44;
const REENTRY = 4_725.71;
const MAIN_DEPLOY = 4_415.3;
const STAGE2_DRY = GLV4_SECO20 - SC4_LAUNCH;
const STAGE2_BURNED = GLV4_STAGE2_STEADY - GLV4_SECO20;
const STAGE1_DRY = GLV4_BECO - GLV4_STAGE2_STEADY;
const STAGE2_GROSS = STAGE2_DRY + STAGE2_BURNED;
const STAGE1_GROSS = GLV4_LIFTOFF - SC4_LAUNCH - STAGE2_GROSS;

/**
 * The first stage's two chambers as GLV-4's flight was reduced (the report, Table 5.2-II, p. 5-98), at standard inlet
 * conditions: 442,433 lb and an impulse the table prints "361.47", 0.30 per cent above the predicted 260.69 (so 261.47).
 * In vacuum, GLV-1's measured impulse at 155 s (GT-1 report, Table 5-II).
 */
const S1_SL = 442_433;
const S1_ISP = { seaLevel: 260.69 * 1.003, vacuum: 281.1 };

/** The record's instants (Table 4-I unless said). */
const BECO = 152.43;
const STAGING = 153.14;
const SECO = 333.75;
const SEPARATION = 365.55;
const INSERTION = 369.7;
const FAIRINGS = 380;
const PRERETRO = T(97, 28, 2);
const PRERETRO_LENGTH = 161;
const EQUIPMENT = T(97, 39, 14);
const RETRO = T(97, 40, 0.7);
const RETRO_GONE = T(97, 40, 47);
const ROLLING = T(97, 42, 52.5);
const DROGUE = T(97, 50, 53);
const MAIN = T(97, 52, 14);
const LANDING = T(97, 56, 12);

/** The heat shield's 90 in disc, and the adapter's 120 in base, m². */
const SHIELD = Math.PI * (45 * IN) ** 2;
const BASE_DISC = Math.PI * (60 * IN) ** 2;
/**
 * The spacecraft's outside, m², as frusta and cylinders on SEDR 300's stations (Figure 2-3): the adapter 120 in to 90 in
 * over 90 in, the cabin's cone 90 in to 38.66 in over 70.53 in, the re-entry control section's 38.66 in drum 18 in long,
 * the rendezvous and recovery section 38.66 in to about 30 in over 42 in, and the adapter's open foot.
 */
const frustum = (d1: number, d2: number, h: number) => Math.PI * ((d1 + d2) / 4) * Math.hypot(h, (d1 - d2) / 2) * IN * IN;
const OUTSIDE = frustum(120, 90, 90) + frustum(90, 38.66, 70.53) + frustum(38.66, 38.66, 18) + frustum(38.66, 30, 42) + BASE_DISC;

/** The aft pair's chambers, lb each (the report, section 5.1.8.1.4, p. 5-31), and the forward pair's (the type's). */
const AFT_LBF = 95;
const FORWARD_LBF = 79;
/** One aft chamber did not fire from 01:04:29 to the end of the station keeping (5.1.8.1.4): its pair's push, halved. */
const ONE_AFT = 64 * 60 + 29.9;

/**
 * Every burn of the aft-firing and forward-firing pairs in the station keeping after separation, as the report lists them
 * (Table 4-IV, pp. 4-16 and 4-17): minutes and seconds of elapsed time, which pair, how long, and the pitch gimbal angle
 * the platform read, degrees (none before it was aligned at 00:20:00). The thrusts of the up-firing and right-firing
 * thrusters, 27 of the 74, are not here: the record's spacecraft has no pair that pushes across its axis (mission.md).
 */
const KEEPING: [number, number, 'aft' | 'forward', number, number | null][] = [
  [8, 47.164, 'aft', 2.95, null],
  [9, 20.989, 'aft', 3.25, null],
  [21, 35.344, 'aft', 0.457, 255.852],
  [23, 59.42, 'aft', 0.5, 272.988],
  [31, 30.648, 'aft', 6.475, 285.768],
  [34, 13.725, 'aft', 2.275, 312.66],
  [35, 58.225, 'aft', 3.675, 324.91],
  [44, 26.079, 'aft', 2.475, 332.928],
  [44, 36.604, 'aft', 1.575, 332.3],
  [49, 55.231, 'aft', 1.2, 347.13],
  [52, 12.907, 'aft', 2.175, 331.58],
  [54, 23.608, 'aft', 2.975, 315.792],
  [55, 53.759, 'aft', 2.975, 302.37],
  [59, 46.31, 'forward', 0.8, 291.56],
  [64, 29.937, 'aft', 2.4, 262.152],
  [66, 15.463, 'aft', 1.275, 281.304],
  [66, 23.988, 'aft', 1.2, 280.68],
  [67, 47.889, 'aft', 3.475, 277.704],
  [69, 3.464, 'aft', 2.275, 289.008],
  [70, 30.315, 'aft', 3.475, 288.972],
  [71, 37.966, 'aft', 5.35, 283.5],
  [72, 10.291, 'aft', 4.875, 285.552],
  [72, 25.766, 'aft', 2.675, 285.372],
  [72, 41.141, 'aft', 2.175, 285.84],
  [72, 46.691, 'aft', 5.45, 287.38],
  [73, 3.941, 'aft', 2.875, 287.964],
  [73, 16.741, 'aft', 4.85, 287.99],
  [73, 37.866, 'aft', 1.9, 289.188],
  [73, 48.166, 'aft', 2.2, 289.7],
  [74, 5.042, 'aft', 3.174, 291.43],
  [74, 22.092, 'aft', 3.575, 293.83],
  [74, 35.067, 'aft', 2.8, 294.228],
  [74, 50.267, 'aft', 3.675, 295.884],
  [74, 56.617, 'aft', 5.35, 297.18],
  [75, 42.517, 'aft', 5.27, 291.06],
  [75, 50.067, 'aft', 5.75, 292.644],
  [76, 11.067, 'aft', 0.8, 291.06],
  [76, 12.767, 'aft', 4.275, 291.04],
  [76, 44.218, 'aft', 1.775, 291.204],
  [77, 17.843, 'aft', 0.4, 293.58],
  [77, 51.043, 'aft', 4.375, 298.26],
  [78, 51.344, 'aft', 4.075, 298.224],
  [80, 32.119, 'aft', 2.775, 301.752],
  [82, 3.145, 'aft', 3.975, 306.22],
  [82, 47.27, 'aft', 0.9, 304.056],
  [83, 21.796, 'aft', 4.95, 302.88],
];

const clock = (t: number) =>
  `${Math.floor(t / 3600)}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}:${(t % 60).toFixed(1).padStart(4, '0')}`;

/** A burn of the station keeping, from its line of Table 4-IV. */
function keeping([min, sec, pair, length, pitch]: (typeof KEEPING)[number], i: number): Manoeuvre {
  const on = min * 60 + sec;
  const one = pair === 'aft' && on >= ONE_AFT;
  const attitude: Manoeuvre['attitude'] =
    pitch === null
      ? {
          label: 'Blunt end forward, against the motion',
          aim: 'velocity',
          sense: -1,
          confidence: 'documented',
          source: `"Two retrograde maneuvers were completed by 00:09:23 g.e.t. using the aft-firing thrusters and with the spacecraft in the BEF orientation" (${GIV}, section 4.3.1.3)`,
        }
      : {
          label: 'Nose down at the stage below',
          aim: 'velocity',
          sense: 1,
          below: estimated(
            360 - pitch,
            `degrees below the level, forward of the plumb line: Table 4-IV's pitch gimbal angle, ${pitch}°, read from its null as the nose's pitch down. The platform was caged blunt end forward and aligned from 00:13:30 to 00:20:00 (${GIV}, 5.1.5.2.2), in orbit rate after; how its angles are signed is not read, and they are taken so that the nose lies forward of the plumb line, as the crew's account has the stage "well below and in front" (section 4.3.1.3, (d) and (e)) and the report has the ship "oriented in a generally nose-down and rolled attitude during the thrusting period" (5.1.8.1.4). The yaw and roll angles are left out`,
          ),
          confidence: 'estimated',
          source: `pointed at the stage and thrust toward it (${GIV}, section 7.1.2.4.1): the pitch only, from Table 4-IV, the yaw and roll left out`,
        };
  return {
    id: `keeping-${String(i + 1).padStart(2, '0')}`,
    label: `Station keeping: the ${pair} thrusters at ${clock(on)}, ${length} s`,
    thrusters: pair,
    attitude,
    turned:
      pitch === null
        ? estimated(on - 30, 'blunt end forward from the turnaround after separation: when it was complete is not read')
        : estimated(on, 'pointed at the stage as the thrusters were lit: when the crew turned to it is not read'),
    on: doc(on, `${clock(on)} (${GIV}, Table 4-IV)`),
    off: derived(on + length, `its length, ${length} s (${GIV}, Table 4-IV)`),
    ...(one
      ? {
          deltaV: derived(
            (AFT_LBF * LBF * length) / (SC4_LAUNCH * LB),
            `one chamber of the pair, 95 lb, for ${length} s on spacecraft 4's 7,879.05 lb: "the acceleration dropped approximately 50 percent at 01:04:00 g.e.t. and indicates that one aft-firing TCA was inoperative" until the end of the thrusting (${GIV}, 5.1.8.1.4)`,
          ),
        }
      : {}),
  };
}

export const orbital: GeminiTitanRecord = {
  liftoffMass: doc(GLV4_LIFTOFF * LB, `336,000 lb at liftoff, with spacecraft 4; 340,000 at ignition (${GIV}, section 3.3, p. 3-10)`),
  titan: {
    first: {
      name: 'Titan first stage',
      nodes: ['TitanStage1', 'TitanStage1Engine', 'TitanInterstage'],
      mass: derived(
        STAGE1_GROSS * LB,
        `336,000 lb at liftoff less spacecraft 4 (7,879.05 lb, p. 3-11) and the second stage (${STAGE2_GROSS.toLocaleString('en-US')} lb, below): ${STAGE1_GROSS.toLocaleString('en-US')} lb (${GIV}, section 3.3). The interstage goes with it`,
      ),
      dry: derived(
        STAGE1_DRY * LB,
        `as it was let go: the vehicle at first stage burnout (85,000 lb) less at the second stage's steady burn (73,400 lb), ${STAGE1_DRY.toLocaleString('en-US')} lb with what was left in its tanks (${GIV}, section 3.3). What the second stage burned in the second between is in it`,
      ),
      propellant: derived(
        (STAGE1_GROSS - STAGE1_DRY) * LB,
        `the stage at liftoff less as it was let go: ${(STAGE1_GROSS - STAGE1_DRY).toLocaleString('en-US')} lb burned from liftoff (${GIV}, section 3.3; 261,846 lb loaded, p. 5-87, some burned before the vehicle was let go)`,
      ),
      engine: {
        // (its two chambers on the one stage as one engine: a plan's engine count is its body's units, plan.ts `BodyDef.count`)
        name: 'Aerojet LR87-AJ-7 (two chambers)',
        count: 1,
        thrust: {
          seaLevel: doc(
            S1_SL * LBF,
            `GLV-4's two chambers after the flight, 442,433 lb at standard inlet conditions (predicted 441,400: ${GIV}, Table 5.2-II, p. 5-98). Its flight average, 467,870 lb, is over the climb's falling pressure, and "higher than expected" (section 4.1)`,
          ),
          vacuum: derived(
            (S1_SL * S1_ISP.vacuum * LBF) / S1_ISP.seaLevel,
            `the sea-level figure at the vacuum impulse over the sea-level one (the same flow): ${Math.round((S1_SL * S1_ISP.vacuum) / S1_ISP.seaLevel).toLocaleString('en-US')} lb for the two. GLV-1 measured 472,770 lb at 140 s (${GI}, Table 5-II)`,
          ),
        },
        isp: {
          seaLevel: derived(
            S1_ISP.seaLevel,
            `GLV-4's at standard inlet conditions: the table prints "361.47", a misprint, against 260.69 predicted and "0.30" per cent more: 261.47 s (${GIV}, Table 5.2-II). Its flight average, 278.61 s, is the same table's`,
          ),
          vacuum: assumed(
            S1_ISP.vacuum,
            `GLV-1's at 155 s, 281.1 s (${GI}, Table 5-II), some 60 km up: taken as the vacuum figure, GLV-4's own not being given. With GLV-4's sea-level 261.47 its burn's average comes near the 278.61 s GLV-4 flew (${GIV}, Table 5.2-II)`,
          ),
        },
        nozzle: GLV_NOZZLES.first,
      },
      ignition: doc(0, `the engine start signal at -3.24 s (${GIV}, Table 4-I): the run begins at release`),
      cutoff: doc(BECO, `152.43 s, 0.94 s early: "BECO (stage I engine shutdown (87FS2))" (${GIV}, Table 4-I)`),
    },
    second: {
      name: 'Titan second stage',
      nodes: ['TitanStage2', 'TitanStage2Engine'],
      mass: derived(
        STAGE2_GROSS * LB,
        `its empty weight and what it burned, below: ${STAGE2_GROSS.toLocaleString('en-US')} lb (${GIV}, section 3.3; 60,560 lb of propellant loaded, p. 5-87)`,
      ),
      dry: derived(
        STAGE2_DRY * LB,
        `the vehicle 20 s after second stage cutoff (13,300 lb), the spacecraft still on it, less spacecraft 4 (7,879.05 lb): ${STAGE2_DRY.toLocaleString('en-US')} lb with what was left in its tanks (${GIV}, section 3.3 and p. 3-11)`,
      ),
      propellant: derived(
        STAGE2_BURNED * LB,
        `from the start of its steady burn (73,400 lb) to 20 s after cutoff (13,300 lb): ${STAGE2_BURNED.toLocaleString('en-US')} lb (${GIV}, section 3.3)`,
      ),
      engine: {
        name: 'Aerojet LR91-AJ-7',
        count: 1,
        thrust: {
          vacuum: doc(
            103_103 * LBF,
            `GLV-4's flight average, 103,103 lb (predicted 101,718; at standard inlet conditions 102,777: ${GIV}, Table 5.2-III, p. 5-99), without the roll nozzle's`,
          ),
        },
        isp: {
          vacuum: doc(
            313.49,
            `GLV-4's flight average, 313.49 s (predicted 311.09; 313.07 at standard inlet conditions: ${GIV}, Table 5.2-III)`,
          ),
        },
        nozzle: GLV_NOZZLES.second,
      },
      ignition: doc(BECO, `"Stage II engine ignition signal (91FS1)" at 152.43 s, with the stages still joined (${GIV}, Table 4-I)`),
      cutoff: doc(SECO, `"SECO (stage II engine shutdown (91FS2))" at 333.75 s, 2.07 s early (${GIV}, Table 4-I)`),
    },
    staging: doc(STAGING, `"Stage separation begin" at 153.14 s, the staging nuts having fired at 152.43 (${GIV}, Table 4-I)`),
    hot: {
      open: estimated(
        0.5,
        'of the interstage’s side the second stage’s jet leaves through: its ring of exhaust ports, half open (the model’s; no figure read)',
      ),
      turn: estimated(30, 'degrees below the level the jet leaves the ports at: not read'),
      endures: estimated(5, 's at full thrust the first stage’s forward dome stands the jet: not read. Planned for, it stood the 0.71 s'),
    },
  },
  separation: {
    at: doc(
      SEPARATION,
      `"Spacecraft separation (shaped charge fired)" at 365.55 s, 31.8 s after cutoff (${GIV}, Table 4-I and section 4.1)`,
    ),
    push: derived(
      6.5 * FT,
      `"An initial spacecraft - launch-vehicle separation velocity of 6 to 7 ft/sec was established through simulations during postflight evaluation": 4.1 ft/s to the spacecraft from its aft-firing thrusters, 2 to 3 to the stage (${GIV}, section 4.3.1.3); the middle of the two. The thrusters burned from 364.71 s to 369.56 (Table 4-I), and their push is in the orbit published at 369.7`,
    ),
    mass: derived(
      SC4_LAUNCH * LB,
      `spacecraft 4 at launch, 7,879.05 lb (${GIV}, p. 3-11): what stayed on the launch vehicle at separation is not read, and the fairings are thrown off after`,
    ),
  },
  ascent: {
    guidance: {
      azimuth: doc(72, `"Launch azimuth = 72°" (${GIV}, Figure 6-1); the roll to it from 10.10 s to 20.40 s (Table 4-I)`),
      vertical: doc(22.95, `"Pitch program rate no. 1 start" at 22.95 s (${GIV}, Table 4-I)`),
      kick: estimated(15, 's: the pitch programme’s rates are not read (their instants are); a pitch-over of fifteen seconds is ours'),
      turn: doc(
        162.03,
        `"Radio guidance enable" at 162.03 s, the first command at 168.50 (${GIV}, Table 4-I): the radio guidance's closed loop flown as the law's linear tangent from here, the first stage's programme and its third rate (to 162.07 s) before it`,
      ),
      target: {
        at: 'seco',
        altitude: doc(
          531_202 * FT,
          `531,202 ft at second stage cutoff, geodetic (${GIV}, Table 4-II, the final actual: 87.4 nautical miles, 30.52° N 72.21° W)`,
        ),
        over: 'ellipsoid',
        climb: doc(0.09, `the space-fixed flight-path angle at cutoff, 0.09° (${GIV}, Table 4-II)`),
        inclination: doc(32.53, `${GIV}, Table 4-III (with the azimuth given, a result and a check)`),
      },
    },
    drag: [
      {
        until: derived(STAGING, 'the first stage let go'),
        area: derived(BASE_DISC, `the 120 in tank's disc (${LSFR}, Figure II.C-1): 78.5 sq ft`),
        curve: {
          points: [
            [0, 0.3],
            [0.8, 0.32],
            [1, 0.48],
            [1.2, 0.55],
            [1.5, 0.5],
            [2, 0.42],
            [3, 0.33],
            [4, 0.28],
            [6, 0.24],
            [10, 0.22],
          ],
          confidence: 'estimated',
          source: 'NOT FOUND for the Titan II: the shape of a slender launch vehicle’s curve, the Mercury-Atlas’s (as chosen there), taken',
        },
      },
      {
        until: derived(SECO, 'to the end of the ascent'),
        area: derived(BASE_DISC, `the 120 in tank's disc (${LSFR}, Figure II.C-1)`),
        curve: {
          points: [
            [0, 0.28],
            [1, 0.45],
            [2, 0.38],
            [4, 0.25],
            [10, 0.2],
          ],
          confidence: 'estimated',
          source: 'NOT FOUND: as above. Above 60 km, where the first stage goes, it moves nothing that can be measured',
        },
      },
    ],
    steering: {
      authority: estimated(
        8,
        'deg/s² at full throw, about each axis: NOT FOUND. The first stage’s two chambers gimballed, the second stage’s one, with its turbine exhaust for roll: taken as the Atlas’s 8',
      ),
    },
    centre: doc(
      (105.32 - 103.44) * IN,
      `spacecraft 4's centre of gravity at launch, Z105.32 (${GIV}, p. 3-11), above the heat shield's rim, Z103.44 (the model's origin)`,
    ),
    sheds: [
      {
        on: 'staging-nuts',
        name: 'Titan first stage',
        from: doc(0, 'the first stage engines’ exit plane, station 1348.103 (titan-ii-glv.md)'),
        to: derived(STATION(500), 'the separation plane, station 500, with the interstage on it (titan-ii-glv.md)'),
        radius: doc(60 * IN, 'the 120 in tank (titan-ii-glv.md)'),
        mass: derived(STAGE1_DRY * LB, 'GLV-4’s as it was let go (as the plan’s, above)'),
        centre: estimated(5, 'low, by its two engines and their thrust structure'),
        gyration: { roll: estimated(1.4, 'a thin shell 3 m across'), across: estimated(6, 'a 21.5 m tube, heavy at the foot') },
        ahead: estimated(7.3, 'its open interstage, on the 7.3 m² disc at 1.0'),
        astern: estimated(7.3, 'its engines and skirt, at 1.0'),
        side: {
          dragArea: estimated(65, '21.5 m by 3.05 m, at 1.0'),
          from: doc(0, 'its stretch along the stack, as above'),
          to: derived(STATION(500), 'its stretch along the stack, as above'),
        },
      },
      {
        on: 'adapter-separation',
        name: 'Titan second stage',
        from: derived(STATION(500), 'its engine’s exit at the separation plane, station 500 (titan-ii-glv.md)'),
        to: derived(STATION(276.825), 'its forward skirt’s top, station 276.825 (titan-ii-glv.md)'),
        radius: doc(60 * IN, 'the 120 in tank'),
        mass: derived(STAGE2_DRY * LB, 'GLV-4’s empty (as the plan’s)'),
        centre: estimated(STATION(420), 'about the middle of its tanks, its engine below'),
        gyration: { roll: estimated(1.4, 'a thin shell 3 m across'), across: estimated(1.8, 'a 5.7 m drum, empty') },
        ahead: estimated(5, 'its skirt’s open top and the oxidiser dome, at 0.7 on 7.3 m²'),
        astern: estimated(7.3, 'its thrust cone and engine, on the 7.3 m² disc at 1.0'),
        side: {
          dragArea: estimated(17, '5.7 m by 3.05 m, at 1.0'),
          from: derived(STATION(500), 'its stretch along the stack, as above'),
          to: derived(STATION(276.825), 'its stretch along the stack, as above'),
        },
      },
      {
        on: 'fairings/nose',
        name: 'Nose fairing',
        ...NOSE_CAP,
        radius: estimated(0.42, 'the forward rim in the spacecraft model, approximately 33 in across'),
        mass: estimated(3, 'thin glass-fibre cover with its fitting; measured mass not found'),
        centre: estimated(Z(237), 'at the face of the cap, above its shallow rim'),
        gyration: { roll: estimated(0.3, 'thin disc 0.42 m in radius'), across: estimated(0.21, 'thin disc about a diameter') },
        forward: true,
        push: estimated(0.5, 'scene approximation for the ejector; its speed and the pivot motion were not measured'),
        ahead: estimated(0.55, 'the disc face-on at unit drag coefficient'),
        astern: estimated(0.55, 'the open cap at unit drag coefficient'),
        side: {
          dragArea: estimated(0.11, 'cap seen on edge'),
          ...NOSE_CAP,
        },
      },
      {
        on: 'fairings/scanner',
        name: 'Horizon scanner fairing',
        ...SCANNER_COVER,
        radius: estimated(0.11, 'half the broadest face, 4.3 in in the model'),
        mass: estimated(1, 'light cover and fastenings; measured mass not found'),
        centre: estimated(Z(178.5), 'halfway between the ends'),
        gyration: { roll: estimated(0.06, 'short cross section of the cover'), across: estimated(0.18, '0.61 m rectangular cover') },
        sideways: {
          bearing: -84,
          across: estimated(0.54, 'at the re-entry control section’s skin and halfway out to its cover; gemini_spacecraft.py'),
          speed: estimated(0.5, 'outward drift for the scene; separation velocity was not found'),
        },
        ahead: estimated(0.02, 'cover seen end-on'),
        astern: estimated(0.02, 'cover seen end-on'),
        side: {
          dragArea: estimated(0.13, 'cover seen broadside'),
          ...SCANNER_COVER,
        },
      },
      {
        on: 'equipment-section-release',
        name: 'Equipment section',
        push: SECTION_DRIFT,
        from: derived(Z(13.44), `the adapter’s foot, Z13.44 (${SEDR}, Figure 2-4)`),
        to: derived(Z(68.44), `where the equipment and retrograde sections part, Z68.44 (${CR1106}, Figure 1, p. 5)`),
        radius: doc(60 * IN, 'its 120 in foot'),
        mass: derived((SC4_LAUNCH - RETROGRADE) * LB, 'the spacecraft at launch less at retrofire (as the plan’s, below)'),
        centre: estimated(Z(38), 'about its middle, by judgement'),
        gyration: { roll: estimated(1.3, 'a shell 3 m across, its modules round the wall'), across: estimated(0.9, 'a short drum, light') },
        ahead: estimated(5, 'its top, open where the retrograde section stood, at 0.8'),
        astern: estimated(7.3, 'its open foot, on the 7.3 m² disc at 1.0'),
        side: {
          dragArea: estimated(4, '1.4 m by 2.9 m, at 1.0'),
          from: derived(Z(13.44), 'its stretch along the stack, as above'),
          to: derived(Z(68.44), 'its stretch along the stack, as above'),
        },
      },
      {
        on: 'retro-section-release',
        name: 'Retrograde section',
        push: SECTION_DRIFT,
        from: derived(Z(68.44), `Z68.44 (${CR1106}, Figure 1)`),
        to: derived(Z(103.44), `the heat shield’s rim, Z103.44 (${SEDR}, Figure 2-4)`),
        radius: derived(50 * IN, 'between the adapter’s 120 in and 88.3 in at its top'),
        mass: derived(
          (RETROGRADE - REENTRY) * LB - 220 * LB,
          'its weight with the rockets unfired (as the plan’s), less their 220 lb of propellant (NASA SP-121, Table 4-I)',
        ),
        centre: estimated(Z(86), 'about its middle, by judgement'),
        gyration: { roll: estimated(1.1, 'a shell 2.5 m across, its rockets round it'), across: estimated(0.6, 'a short drum, light') },
        ahead: estimated(3.5, 'its top, where the heat shield stood, at 0.8'),
        astern: estimated(4.5, 'its foot and the rockets’ nozzles'),
        side: {
          dragArea: estimated(2.5, '0.9 m by 2.6 m, at 1.0'),
          from: derived(Z(68.44), 'its stretch along the stack, as above'),
          to: derived(Z(103.44), 'its stretch along the stack, as above'),
        },
      },
    ],
    checks: [
      {
        id: 'perigee',
        label: 'Perigee at cutoff (the stage’s orbit)',
        value: 87.6 * NMI,
        unit: 'm',
        tolerance: 12_000,
        confidence: 'documented',
        source: `"The GLV second stage was inserted into an orbit with a perigee altitude of 87.6 nautical miles and an apogee altitude of 150.1" (${GIV}, section 4.1)`,
      },
      {
        id: 'apogee',
        label: 'Apogee at cutoff (the stage’s orbit)',
        value: 150.1 * NMI,
        unit: 'm',
        tolerance: 25_000,
        confidence: 'documented',
        source: `150.1 nautical miles, the second stage's (${GIV}, sections 4.1 and 4.3.2); the spacecraft's after its 4.1 ft/s, 152.2 (Table 4-III)`,
      },
      {
        id: 'inclination',
        label: 'Inclination',
        value: 32.53,
        unit: '°',
        tolerance: 0.25,
        confidence: 'documented',
        source: `${GIV}, Table 4-III`,
      },
      {
        id: 'cutoffSpeed',
        label: 'Speed at cutoff, space-fixed',
        value: 25_659 * FT,
        unit: 'm/s',
        tolerance: 30,
        confidence: 'documented',
        source: `25,659 ft/s at second stage cutoff, 333.8 s (${GIV}, Table 4-II, the final actual; planned 25,668)`,
      },
      {
        id: 'coreG',
        label: 'Greatest load on the second stage',
        value: 7.6,
        unit: 'g',
        tolerance: 0.4,
        confidence: 'documented',
        source: `"Exit acceleration, g 7.6" (${GIV}, Table 4-II, final actual; planned 7.3). The crew read 7.5 (section 7.1.2.2)`,
      },
    ],
  },
  orbit: {
    over: {
      is: 'oblate',
      confidence: 'documented',
      source: `"Preliminary actual orbital elements were measured over a spherical earth, whereas the final actual and planned elements were measured over an oblate earth" (${GIV}, section 4.3.1.2), "the Fischer Ellipsoid" (section 4.3). The ellipsoid is WGS 84’s, not Fischer’s (6,378,166 m, 1/298.3): some 30 m lower at 30 degrees`,
    },
    perigee: doc(87.6 * NMI, `${GIV}, Table 4-III, insertion, final actual: 87.6 nautical miles (planned 87.0; 86.9 in real time)`),
    apogee: doc(
      152.2 * NMI,
      `${GIV}, Table 4-III: 152.2 nautical miles (planned 159; 152.7 in real time). The crew were told "87 ... 153" (section 7.1.2.3)`,
    ),
    inclination: doc(32.53, `${GIV}, Table 4-III`),
    period: doc(88.9 * 60, `${GIV}, Table 4-III: 88.90 min`),
    kind: {
      is: 'anomalistic',
      confidence: 'derived',
      source:
        `perigee to perigee: the insertion's 88.90 min (${GIV}, Table 4-III) is its heights' anomalistic period over the ball to 1.1 s, against 3.5 s as Kepler and 11 s as nodal, and the nearest of the three for every period within its rounding (tests/periods.test.mjs). ` +
        'No source read says what the period is (section 4.3.1.2 and the table’s notes)',
    },
  },
  injection: {
    at: doc(
      INSERTION,
      `"The elapsed time at completion of this maneuver was 369.7 seconds, and the inertial velocity was 25 746 ft/sec, which resulted in an elliptical orbit with a perigee of 87.6 nautical miles and an apogee of 152.2" (${GIV}, section 4.1): the orbit after the aft thrusters' 5 s`,
    ),
    heading: 'north',
    arc: derived(
      11.2,
      `degrees round from the pad's place at liftoff, in space: separation at 30.97° N 69.88° W at 365.6 s (${GIV}, Table 4-II, final actual), 10.9° from where the pad was at liftoff once the Earth's 1.53° of turning since is added, and 4.1 s more at 0.069°/s to insertion. Flying the ascent replaces it`,
    ),
    anomaly: derived(
      7.7,
      `degrees: from the flight-path angle at separation, +0.07° (${GIV}, Table 4-II), on the published orbit's eccentricity, 0.0091: tan γ = e sin ν / (1 + e cos ν), so nearly eight degrees past perigee`,
    ),
  },
  mass: derived(
    SC4_LAUNCH * LB,
    `spacecraft 4 at launch, 7,879.05 lb (${GIV}, p. 3-11), taken for it in orbit: the fairings, what it left on the launch vehicle and what it burned in the station keeping (about 140 lb, 5.1.8.1.3) are not taken off`,
  ),
  rarefied: {
    drag: assumed(2.2, KING_HELE),
    area: estimated(
      OUTSIDE / 4,
      `m²: a quarter of the spacecraft's outside, ${OUTSIDE.toFixed(1)} m² (SEDR 300's stations, Figure 2-3, as frusta), the area a convex body shows on the average over every way it can lie (Cauchy): "the crew was instructed to assume drifting flight in order to conserve propellants ... for approximately the next 2½ days" (${GIV}, section 4.1), and it was held in attitude, nose or tail first, for the rest, on 7.30 m²`,
    ),
    length: doc(219.03 * IN, '219.03 in, the orbit configuration (SEDR 300, Figure 2-3): the length its Knudsen number is taken on'),
  },
  hand: estimated(4, 'deg/s: how fast the crew turned the ship on the hand controller. Not read'),
  oams: {
    aft: {
      name: 'OAMS aft-firing thrusters',
      count: 2,
      thrust: doc(
        AFT_LBF * LBF,
        `95 lb each: "the thrust of the aft TCA's using the predelivery acceptance test data and spacecraft OAME propellant temperatures and pressures measured in flight was determined to be 95 pounds for TCA's 9 and 10" (${GIV}, 5.1.8.1.4, p. 5-31). The trajectory fitted to the landing wanted 98 (section 4.3.1.4)`,
      ),
      isp: assumed(273, `273 s, the type's (${SP121}, Table 4-I)`),
    },
    forward: {
      name: 'OAMS forward-firing thrusters',
      count: 2,
      thrust: assumed(
        FORWARD_LBF * LBF,
        `79 lb each, the type's (${SP121}, Table 4-I, p. 29), on the retrograde section, firing forward and pushing the ship back; "canted obliquely" (${CR1106}, p. 139), at an angle not given`,
      ),
      isp: assumed(273, `273 s, the type's (${SP121}, Table 4-I)`),
    },
  },
  moves: [
    ...KEEPING.map(keeping),
    {
      id: 'preretro',
      label: 'The burn before retrofire: the perigee brought down',
      thrusters: 'aft',
      attitude: {
        label: 'Blunt end forward, against the motion',
        aim: 'velocity',
        sense: -1,
        confidence: 'documented',
        source: `the platform aligned blunt end forward for 33 min before it (${GIV}, 5.1.5.2.2), "the spacecraft attitudes during the preretrofire OAMS maneuver were held within an average of less than 1° in yaw, 1° in pitch, and 5° in roll" (5.1.5.2.3); the aft-firing thrusters (section 4.1)`,
      },
      turned: doc(T(96, 52, 54), `its platform aligned blunt end forward from 96:52:54, for 33 min 14 s (${GIV}, Table 5.1-VIII)`),
      on: doc(PRERETRO, `97:28:02, on a time hack from Hawaii (${GIV}, Table 4-I and section 6.1.2.3)`),
      off: doc(
        PRERETRO + PRERETRO_LENGTH,
        `"timed by Hawaii to be 2 minutes 41 seconds"; 2 min 40.5 s on the telemetry (${GIV}, section 6.1.2.3)`,
      ),
      deltaV: doc(
        134 * FT,
        `134 ft/s, "6 ft/sec greater than the planned value" of 128 (${GIV}, sections 4.1 and 4.3.1.4): the reconstruction that brought the trajectory to the landing point, on 98 lb average from the aft pair. The computer was dead, so nothing aboard counted it: it was timed`,
      ),
    },
  ],
  adapter: {
    equipment: {
      mass: derived(
        (SC4_LAUNCH - RETROGRADE) * LB,
        `spacecraft 4 at launch (7,879.05 lb) less at retrofire (5,432.44 lb, ${GIV}, p. 3-11): ${(SC4_LAUNCH - RETROGRADE).toFixed(0)} lb, with what the thrusters burned, some 310 lb (5.1.8.1.3), not taken off`,
      ),
      gone: doc(
        EQUIPMENT,
        `97:39:14, "commanded by the crew" (${GIV}, Table 4-I and section 4.1); the adapter's shaped charge at 97:39:14.2 (Table 5.1-X)`,
      ),
    },
    retro: {
      mass: derived(
        (RETROGRADE - REENTRY) * LB,
        `spacecraft 4 at retrofire less at 0.05 g (${GIV}, p. 3-11): ${(RETROGRADE - REENTRY).toFixed(1)} lb, the section with its four rockets unfired`,
      ),
    },
  },
  retro: {
    sequence: estimated(
      RETRO - 60,
      'a minute before retrofire: when the crew pitched to retrofire attitude is not read; it was blunt end forward from the burn before',
    ),
    below: doc(
      31,
      `degrees: "a 31° retrofire attitude as determined by telemetry rather than the planned 30° attitude" (${GIV}, section 4.3.1.4); the type's "180° yaw and about 30° pitch" (5.1.5), whose sign is lost in the text read, taken as Mercury's: the blunt end up and the push back and down`,
    ),
    on: doc(
      RETRO,
      `"At 97:40:00.7 g.e.t. ignition of retrorocket number 1 occurred" (${GIV}, 5.1.8.3), "about 1 second early" by the sequencer (section 4.1); planned 97:40:02 (Table 4-I)`,
    ),
    spacing: doc(
      5.5,
      `"fired at 5.5 second intervals in 1-2-3-4 order" (${SEDR}, Section XI, p. 11-73); on the day 5.5, 5.2 and 5.8 s (rockets 3, 2 and 4 at 97:40:06.2, :11.4 and :17.2: ${GIV}, Table 5.1-X)`,
    ),
    count: 4,
    thrust: assumed(2_490 * LBF, `2,490 lb each, the type's (${SP121}, Table 4-I, p. 29); "approximately 2500 pounds" (${KIT})`),
    burn: doc(
      5.5,
      `"for 5.5 seconds" each, the type's (the Gemini-Titan 3 press kit, p. 8); "motor total burn times appeared nominal" (${GIV}, 5.1.8.3)`,
    ),
    deltaV: doc(
      333.5 * FT,
      `"The actual imparted spacecraft velocity decrement of 333.5 ft/sec compares well with the preflight estimate of 336.3 ft/sec" (${GIV}, 5.1.8.3)`,
    ),
    gone: doc(RETRO_GONE, `"Retroadapter separate" at 97:40:47, as planned (${GIV}, Table 4-I)`),
  },
  entry: {
    mass: doc(REENTRY * LB, `spacecraft 4's re-entry module at 0.05 g, 4,725.71 lb (${GIV}, p. 3-11)`),
    area: derived(SHIELD, `the heat shield's 90 in disc (${SEDR}, Figure 2-3): 4.10 m²`),
    drag: {
      points: [
        [0, 1.0],
        [0.5, 1.05],
        [0.8, 1.2],
        [1, 1.3],
        [1.5, 1.42],
        [2, 1.52],
        [3, 1.57],
        [4, 1.6],
        [20, 1.6],
      ],
      confidence: 'estimated',
      source:
        'NOT FOUND for Gemini: the Mercury capsule’s measured curve (NASA TM X-491, Figure 22; mercury-redstone.ts), taken for a blunt capsule of the same kind on its own shield’s disc',
    },
    lift: {
      points: [[0, 0]],
      confidence: 'derived',
      source: `none, as flown: "an open-loop zero-lift reentry technique was used. After retrofire a full-lift attitude was held until 97:42:52.5 g.e.t. at an approximate altitude of 400 000 feet, at which time a roll rate was established" (${GIV}, 5.1.5.2.3), the ship rolling at 6.5 deg/s, then 11.5, 17.5 and 23 (5.1.5.3.2), a turn every 15 to 55 s, so that its lift turned round its motion and came to nothing; "a rolling zero-lift reentry until drogue parachute deployment" (section 4.3.1.4). The full lift above 400,000 ft, where there is next to no air, is left out`,
    },
    predicted: estimated(
      0.19,
      `the lift the ship had and did not fly: the programme's, "flown with an average lift-to-drag ratio of approximately 0.19" (${SP138}, p. 159), taken for spacecraft 4, its centre of mass 1.56 in off its axis (${GIV}, 5.1.1.3); its own, in Figure 5.1-5, is not read off the figure. Rolled, the closed-loop entry planned was not flown: the computer had failed (5.1.5.4)`,
    ),
    trim: assumed(
      8.5,
      `GT-3's "8° to 9°" at the greatest heating (${GIV}, p. 5-3): "the Gemini IV reentry can be characterized as being between GT-2 and GT-3 in trim attitude" (5.1.1.3), its offset 1.56 in against GT-3's 1.43`,
    ),
    bank: doc(
      0,
      `"After retrofire a full-lift attitude was held until 97:42:52.5 g.e.t." (${GIV}, 5.1.5.2.3), then rolled: with no lift (above) the bank moves nothing`,
    ),
    banked: estimated(
      RETRO_GONE + 1,
      'as the retrograde section went: the ship held in its full-lift attitude from there until it was set rolling',
    ),
  },
  heating: {
    noseRadius: doc(144 * IN, `the heat shield a spherical cap of 144 in radius (${SEDR}, Figure 2-3)`),
    starts: estimated(290, 'not read: the air at the pad, taken for the shield; nothing reads it, there being no surface'),
    surfaces: [],
  },
  descent: {
    ground: doc(0, 'the sea: it came down in the Atlantic, east of the Bahamas'),
    mass: doc(
      MAIN_DEPLOY * LB,
      `spacecraft 4's re-entry module at the main parachute's deployment, 4,415.30 lb (${GIV}, p. 3-11): taken from the drogue on`,
    ),
    drogue: {
      altitude: doc(
        40_000 * FT,
        `"the drogue parachute was deployed at an altitude of 40 000 feet instead of the normal altitude of 50 000 feet", at 97:50:53 (${GIV}, 5.1.11 and Figure 5.1-19)`,
      ),
      dragArea: estimated(
        0.5 * Math.PI * ((8.3 / 2) * FT) ** 2,
        `an 8.3 ft conical ribbon drogue (${CR1106}, p. 218) at a drag coefficient of 0.5, the usual figure for the type: no measured figure found`,
      ),
      fills: doc(16, `disreefed at 97:51:09, 16 s after it came out, at about 31,500 ft (${GIV}, Figure 5.1-19 and 5.1.11)`),
    },
    main: {
      altitude: assumed(
        10_600 * FT,
        `the PARA switch at 10,600 ft, the type's (${SEDR}, pp. 4-22 and 4-23): the pilot parachute at 97:52:11 and the main at 97:52:14 (${GIV}, Figure 5.1-19), whose heights are on the figure's scale and not read`,
      ),
      dragArea: derived(
        (2 * 4_400 * LB * 9.80665) / (1.225 * (31.6 * FT) ** 2),
        `the 84.2 ft ringsail's (${CR1106}, p. 222): "a mean descent rate of 31.6 fps" for a module of 4,400 lb, at sea level: 344 m²`,
      ),
      fills: derived(10, `disreefed at 10 s (${CR1106}, p. 222): full then`),
    },
    checks: [
      {
        id: 'reentry-module.at',
        label: 'Landing',
        value: LANDING,
        unit: 's',
        tolerance: 60,
        confidence: 'documented',
        source: `97:56:12 (${GIV}, Table 4-I; planned 97:56:50)`,
      },
    ],
  },
  crew: {
    words: { who: 'The crew', they: 'they', their: 'their', many: true },
    landing: {
      aboard: estimated(
        15,
        'm/s: not found as a limit. Gemini came down on its main at 9.6 m/s (31.6 ft/s) on its seats; three times that is taken as the most two men walk away from. Ours',
      ),
    },
    aboard:
      'McDivitt and White landed in the ship, as Gemini was built to: the ejection seats were for the pad, the climb and below 15,000 ft, and were not used',
  },
  lands: { on: 'sea', ship: 'the spacecraft' },
  landing: {
    aimed: {
      late: doc(
        -1.3,
        `s: "A 1.3-second early retrofire time contributed -3.1 nautical miles" (${GIV}, section 4.3.1.4); "initiated by the sequential system about 1 second early" (section 4.1)`,
      ),
      from: doc(
        T(96, 52, 54),
        `the burn before retrofire was timed with it: "At T -12 the OAME retrofire was started" (${GIV}, 7.1.2.5), on a time hack from Hawaii (6.1.2.3), after the platform had been aligned blunt end forward for it from 96:52:54 (Table 5.1-VIII). From there on the chain keeps its recorded intervals to retrofire`,
      ),
      confidence: 'assumed',
      source: `"The crew was given a countdown to retrofire over Guaymas at a g.e.t. of 97:40:02" (${GIV}, section 6.1.2.3): the ground worked the instant from tracking in revolution 62 (4.3.1.4), for a landing at 27°29′ N 73°21′ W (Table 4-II, preliminary). It came down 50 nautical miles short of that, from the burn before retrofire's 134 ft/s where 128 were planned, the 31° attitude and the early second (4.3.1.4), all of which the run flies; the place it came down is taken for the place its burns were timed for`,
    },
    latitude: doc(
      27 + 44 / 60,
      `27°44′ N 74°14′ W, "as reported by the recovery ship" (${GIV}, section 4.1; the summary has 74°11′ W). The reconstructed trajectory came down within 1.5 nautical miles of it (4.3.1.4)`,
    ),
    longitude: doc(-(74 + 14 / 60), `${GIV}, section 4.1 and Table 4-II`),
    at: doc(LANDING, `${GIV}, Table 4-I: 97:56:12`),
    near: 'the Atlantic, east of the Bahamas',
  },
  events: [
    { id: 'liftoff', label: 'Liftoff', at: doc(0, `15:15:59.562 G.m.t. (${GIV}, Table 4-I)`) },
    { id: 'beco', label: 'First stage cutoff: the second stage lit', at: doc(BECO, `${GIV}, Table 4-I`), also: 'planned 153.37 s' },
    { id: 'staging', label: 'The stages begin to part', at: doc(STAGING, `${GIV}, Table 4-I`) },
    { id: 'radio-guidance', label: 'Radio guidance enabled', at: doc(162.03, `${GIV}, Table 4-I`) },
    { id: 'seco', label: 'Second stage cutoff', at: doc(SECO, `${GIV}, Table 4-I`), also: 'planned 335.82 s' },
    { id: 'spacecraft-separation', label: 'Spacecraft separation: the aft thrusters for 5 s', at: doc(SEPARATION, `${GIV}, Table 4-I`) },
    { id: 'insertion', label: 'Insertion: 25,746 ft/s, 87.6 by 152.2 nautical miles', at: doc(INSERTION, `${GIV}, section 4.1`) },
    {
      id: 'fairings',
      label: 'The fairings go, at the turnaround',
      at: estimated(
        FAIRINGS,
        `"As soon as the crew was in an upright position, the turnaround began, and the fairings were jettisoned" (${GIV}, section 7.1.2.3), after the separation's 5 s burn: when, to the second, not read`,
      ),
    },
    {
      id: 'platform-aligned',
      label: 'Platform aligned, blunt end forward',
      at: doc(T(0, 20, 0), `00:13:30 to 00:20:00 (${GIV}, 5.1.5.2.2)`),
    },
    {
      id: 'nearest',
      label: 'Nearest the stage: about 0.3 nautical mile',
      at: doc(
        T(0, 52, 0),
        `"Prior to Carnarvon (52 min g.e.t.) the two vehicles came back together within a minimum range of 0.3 nautical mile" (${GIV}, section 4.3.1.3)`,
      ),
    },
    { id: 'aft-thruster', label: 'One aft thruster stops firing', at: doc(ONE_AFT, `01:04:29 (${GIV}, 5.1.8.1.4)`) },
    {
      id: 'keeping-ends',
      label: 'Station keeping called off',
      at: doc(
        T(1, 26, 45),
        `"the end of thrusting at 01:26:45 g.e.t." (${GIV}, 5.1.8.1.4): 74 thrusts, 115 lb of propellant, about 102 ft/s (section 4.1)`,
      ),
    },
    { id: 'egress', label: 'White leaves the hatch', at: doc(T(4, 23, 0), `"approximately 04:23:00 g.e.t." (${GIV}, section 4.1)`) },
    { id: 'ingress', label: 'White begins to come back in', at: doc(T(4, 46, 0), `"about 04:46:00 g.e.t." (${GIV}, section 4.1)`) },
    {
      id: 'hatch-shut',
      label: 'The hatch shut and the cabin pumped up',
      at: doc(T(5, 6, 0), `"not completed until 05:06 g.e.t." (${GIV}, section 4.1)`),
    },
    {
      id: 'computer',
      label: 'The computer will not switch off',
      at: doc(T(75, 45, 43), `"approximately 75:45:43 g.e.t." (${GIV}, section 4.1)`),
    },
    { id: 'preretro', label: 'The burn before retrofire', at: doc(PRERETRO, `${GIV}, Table 4-I`) },
    { id: 'equipment-section-gone', label: 'The equipment section cut away', at: doc(EQUIPMENT, `${GIV}, Table 4-I`) },
    { id: 'retrofire', label: 'Retrofire: four rockets, 5.5 s apart', at: doc(RETRO, `${GIV}, 5.1.8.3`), also: 'planned 97:40:02' },
    { id: 'retro-section-gone', label: 'The retrograde section cut away', at: doc(RETRO_GONE, `${GIV}, Table 4-I`) },
    { id: 'rolling', label: 'Set rolling at about 400,000 ft: the lift cancelled', at: doc(ROLLING, `${GIV}, 5.1.5.2.3`) },
    { id: 'blackout', label: 'Radio blackout', at: doc(T(97, 44, 59), `${GIV}, Table 4-I`), also: 'ends at 97:49:14' },
    { id: 'drogue-deployment', label: 'Drogue parachute, at 40,000 ft', at: doc(DROGUE, `${GIV}, Table 4-I`) },
    {
      id: 'main-deployment',
      label: 'Pilot parachute; the main out of the rendezvous and recovery section',
      at: doc(MAIN, `97:52:11 and 97:52:14 (${GIV}, Figure 5.1-19)`),
    },
    {
      id: 'landing-attitude',
      label: 'Two-point suspension: landing attitude',
      at: estimated(MAIN + 30, 'not read: half a minute after the main came out, as the main is drawn to fill'),
    },
    { id: 'splashdown', label: 'Landing', at: doc(LANDING, `${GIV}, Table 4-I`) },
  ],
  checks: [
    ...(
      [
        // the orbit flown after the station keeping, and its decay over the four days (Table 4-III, final actual, read in
        // the middle of each revolution: a revolution counted over the ground, about 94.4 min, 62 of them in 97 h 28 min)
        [2, 90.4, 159.9],
        [18, 89.4, 154.9],
        [33, 88.0, 149.1],
        [52, 87.4, 141.0],
        [61, 86.1, 136.5],
      ] as const
    ).flatMap(([rev, perigee, apogee]) => {
      const at = Math.round((rev - 0.5) * 94.4 * 60);
      const read = `Read at ${clock(at)}, the middle of revolution ${rev} as about 94.4 min to a revolution over the ground: estimated`;
      return [
        {
          id: `after-${at}.perigee` as const,
          label: `Perigee in revolution ${rev}`,
          value: perigee * NMI,
          unit: 'm',
          tolerance: 6_000,
          confidence: 'documented' as const,
          source: `${perigee} nautical miles (${GIV}, Table 4-III, final actual${rev === 2 ? ', "after station-keeping"' : ''}). ${read}`,
        },
        {
          id: `after-${at}.apogee` as const,
          label: `Apogee in revolution ${rev}`,
          value: apogee * NMI,
          unit: 'm',
          tolerance: 10_000,
          confidence: 'documented' as const,
          source: `${apogee} nautical miles (${GIV}, Table 4-III, final actual). ${read}`,
        },
      ];
    }),
    {
      id: `after-${T(97, 35, 0)}.perigee`,
      label: 'Perigee after the burn before retrofire, in vacuum',
      value: 42.3 * NMI,
      unit: 'm',
      tolerance: 6_000,
      confidence: 'documented',
      source: `"a theoretical perigee of 42.3 nautical miles resulted instead of the 45 nautical miles which had been planned" (${GIV}, section 4.1). Read at 97:35:00`,
    },
    {
      id: 'entryG',
      label: 'Greatest load in the entry',
      value: 7.7,
      unit: 'g',
      tolerance: 0.5,
      confidence: 'documented',
      source: `"Reentry deceleration, g" 7.7, final actual; planned 6.8 (${GIV}, Table 4-II)`,
    },
    {
      id: 'entryQ',
      label: 'Greatest dynamic pressure in the entry',
      value: 493 * 47.880259,
      unit: 'Pa',
      tolerance: 2_400,
      confidence: 'documented',
      source: `"Reentry dynamic pressure, lb/sq ft" 493, final actual; planned 426 (${GIV}, Table 4-II)`,
    },
    {
      id: 'ejectionAt',
      label: 'Drogue out, at 40,000 ft',
      value: DROGUE,
      unit: 's',
      tolerance: 60,
      confidence: 'documented',
      source: `97:50:53 (${GIV}, Table 4-I; planned 97:50:58)`,
    },
    {
      id: 'alongTrack',
      label: 'Drogue out, along the track from where it landed',
      value: 0,
      unit: 'm',
      tolerance: 40_000,
      confidence: 'documented',
      source: `${GIV}, section 4.1: it landed at 27°44′ N 74°14′ W, "50 nautical miles short of the landing point predicted with preliminary solution" (4.3.1.4); the drogue comes out a few kilometres short of where it lands`,
    },
    {
      id: 'crossTrack',
      label: 'Drogue out, to the right of where it landed',
      value: 0,
      unit: 'm',
      tolerance: 25_000,
      confidence: 'documented',
      source: `${GIV}, section 4.1`,
    },
  ],
};

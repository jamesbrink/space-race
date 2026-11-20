/**
 * Gemini-Titan 5 as a flight into orbit: its record (vehicles/gemini-titan-plan.ts `GeminiTitanRecord`), which flight.ts
 * writes its plan from (`geminiTitanPlan`). The record with its sources and disagreements is set out in mission.md beside
 * this file; the numbers live here, each in the source's own units and converted once.
 *
 * Times are seconds from liftoff, 13:59:59.518 G.m.t. The mission report (MSC-G-R-65-4) has this flight's own figures for
 * nearly everything: GLV-5's weights and engines, every event to the hundredth in the launch phase and to the second after,
 * the orbit, each manoeuvre's instant, length and impulse, the retrofire's and the entry's. Its text layer garbles digits,
 * so every table below was read on the page. The checks' tolerances were written with the record, before the plan was
 * first flown, and nothing here was changed after: a miss is recorded (src/sim/misses.ts), not fitted.
 */
import { assumed, derived, doc, estimated } from '../../../../../src/measure.ts';
import { GLV_NOZZLES } from '../../vehicles/gemini-titan.ts';
import type { GeminiTitanRecord } from '../../vehicles/gemini-titan-plan.ts';

const IN = 0.0254;
const FT = 0.3048;
const LB = 0.45359237;
const LBF = 4.4482216;
const NMI = 1852;

/** Seconds from liftoff of a ground elapsed time, hours, minutes and seconds. */
const T = (h: number, m: number, s: number): number => h * 3600 + m * 60 + s;

const GV = 'Gemini Program Mission Report, Gemini V (MSC-G-R-65-4, October 1965)';
const SP121 = 'Gemini Midprogram Conference (NASA SP-121, 1966)';
const GI = 'Gemini Program Mission Report GT-1 (NTRS 19670095753)';
const CR1106 = 'Project Gemini: A Technical Summary (Malik and Souris, NASA CR-1106, 1968)';
const SEDR = 'Project Gemini Familiarization Manual, SEDR 300 vol. 1 (McDonnell, 30 September 1965)';
const SEDR2 = 'Project Gemini Familiarization Manual, SEDR 300 vol. 2, Section VIII (McDonnell)';
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
/** The pod: its transponder's middle at Z50, its cover's disc at Z33.1, and the case 10 in along the ship (gemini_spacecraft.py `POD_AT`, `POD_COVER_Z`). */
const POD = {
  from: estimated(
    Z(33.1),
    'the pod’s silvered cover, in the plane of the gold cover’s disc (gemini_spacecraft.py POD_COVER_Z, scaled from SEDR 300 vol. 2, Figure 8-80)',
  ),
  to: estimated(Z(55), 'the forward face of the transponder’s 10 in case, its middle at Z50 (gemini_spacecraft.py POD_AT)'),
};

// GLV-5's weights with spacecraft 5 aboard (the mission report, section 3.3, p. 3-27, "obtained from Aerospace Corporation", read on the page:
// ignition 344,685 lb, liftoff 341,163, first stage burnout 84,675, the second stage's steady combustion 72,699, its
// shutdown 13,633), and the spacecraft's (p. 3-28: at launch 7,947.17 lb, at retrofire 5,549.20, at 0.05 g 4,733.79, at the
// main parachute's deployment 4,355.02).
const LIFTOFF = 341_163;
const BECO_WEIGHT = 84_675;
const STAGE2_STEADY = 72_699;
const SECO_WEIGHT = 13_633;
const SC_LAUNCH = 7_947.17;
const RETROGRADE = 5_549.2;
const REENTRY = 4_733.79;
const MAIN_DEPLOY = 4_355.02;
/** What the second stage had left at its shutdown: "Burn time remaining, sec ... 1.0" (Table 5.2-II), at its flow (below). */
const S2_LEFT = 1.0;
const S2_RESERVE = S2_LEFT * (103_099 / 312.61);
const STAGE2_DRY = SECO_WEIGHT - SC_LAUNCH - S2_RESERVE;
const STAGE2_BURNED = STAGE2_STEADY - SECO_WEIGHT;
const STAGE1_DRY = BECO_WEIGHT - STAGE2_STEADY;
const STAGE2_GROSS = STAGE2_DRY + STAGE2_BURNED + S2_RESERVE;
const STAGE1_GROSS = LIFTOFF - SC_LAUNCH - STAGE2_GROSS;

/**
 * GLV-5's first stage, its two chambers as one engine (the mission report, Table 5.2-I, p. 5-131, postflight reconstructed): 438,281 lb at
 * the standard inlet condition, its rating at sea level, at 260.84 s. The vacuum impulse is not in it (only the flight's
 * average, 278.40 s): GLV-1's at 155 s, 281.1 s (the GT-1 report, Table 5-II), taken.
 */
const S1_SL = 438_281;
const S1_ISP = { seaLevel: 260.84, vacuum: 281.1 };
/** Its second stage's (Table 5.2-II): the flight's average, 103,099 lb at 312.61 s, roll nozzle included, the whole burn being out of the air. */
const S2 = { thrust: 103_099, isp: 312.61 };

/** The record's instants, the launch phase's from Table 4.2-I (p. 4-10), the rest from its concluding page (p. 4-11) and Table 4.3-IV. */
const BECO = 153.55;
const STAGING = 154.29;
const FAIRINGS = 207.0;
const SECO = 333.28;
const SEPARATION = 356.91;
const OAMS_ON = 356.11;
const OAMS_OFF = 367.01;
const HEATER = T(0, 25, 51);
const PERIGEE_ADJUST = [T(0, 56, 0), 13] as const;
const REP = T(2, 7, 15);
const RADAR_LOCK = T(27, 4, 2);
const HEIGHT = [T(50, 49, 58), 27] as const;
const PHASE = [T(51, 34, 31), 20] as const;
const PLANE = [T(52, 6, 26), 19.7] as const;
const COELLIPTIC = [T(53, 4, 4), 22.5] as const;
const THRUSTER_7 = T(118, 32, 1);
const EQUIPMENT = T(190, 26, 47);
const RETRO = T(190, 27, 43.3);
const RETRO_LAST = T(190, 28, 0.1);
const RETRO_GONE = T(190, 28, 30);
const BANK_400K = T(190, 42, 4);
const GUIDANCE = T(190, 44, 20);
const ZERO_LIFT_END = T(190, 47, 20);
const DROGUE = T(190, 49, 19);
const MAIN = T(190, 51, 16);
const LANDING = T(190, 55, 14);

/** The aft-firing pair's thrust, lb (5.1.8.1.2: "91-pound thrust aft TCA's"); the forward pair's, the type's. */
const AFT_LBF = 91;
const FORWARD_LBF = 79;
/** The retrograde rockets (Table 5.1.8-V, p. 5-93): their total impulse, lb s, and each one's burning time, s. */
const RETRO_IMPULSE = 56_709;
const RETRO_BURNS = [6.4, 6.0, 6.1, 6.2];
const RETRO_BURN = RETRO_BURNS.reduce((a, b) => a + b, 0) / RETRO_BURNS.length;
/** The retrofire's components on the velocity indicator's axes, ft/s (Table 5.1.5-IX, p. 5-48, telemetry): 269.31 aft, 9.94 left, 180.7 down. */
const RETRO_AFT = 269.31;
const RETRO_DOWN = 180.7;
/** The heat shield's 90 in disc, and the adapter's 120 in base, m². */
const SHIELD = Math.PI * (45 * IN) ** 2;
const BASE_DISC = Math.PI * (60 * IN) ** 2;

export const orbital: GeminiTitanRecord = {
  liftoffMass: doc(LIFTOFF * LB, `341,163 lb at liftoff, with the spacecraft (${GV}, section 3.3, p. 3-27); 344,685 lb at ignition`),
  titan: {
    first: {
      name: 'Titan first stage',
      nodes: ['TitanStage1', 'TitanStage1Engine', 'TitanInterstage'],
      mass: derived(
        STAGE1_GROSS * LB,
        `the vehicle at liftoff (341,163 lb) less spacecraft 5 (7,947.17 lb) and the second stage (${STAGE2_GROSS.toLocaleString('en-US')} lb, below): ${STAGE1_GROSS.toLocaleString('en-US')} lb (${GV}, section 3.3, pp. 3-27 and 3-28). The interstage goes with it`,
      ),
      dry: derived(
        STAGE1_DRY * LB,
        `the vehicle at first stage burnout (84,675 lb) less at the second stage's steady combustion (72,699 lb): ${STAGE1_DRY.toLocaleString('en-US')} lb as it was let go, with what was left in its tanks ("approximately 871 pounds of usable fuel", 5.2.2.1) and what the second stage burned in the second between (${GV}, section 3.3)`,
      ),
      propellant: derived(
        (STAGE1_GROSS - STAGE1_DRY) * LB,
        `the stage at liftoff less as it was let go: ${(STAGE1_GROSS - STAGE1_DRY).toLocaleString('en-US')} lb burned from liftoff (${GV}, section 3.3; 262,012 lb were loaded, 5.2.2.4, and 3,522 lb burned between ignition and liftoff)`,
      ),
      engine: {
        // (its two chambers on the one stage as one engine: a plan's engine count is its body's units, plan.ts `BodyDef.count`)
        name: 'Aerojet LR87-AJ-7 (two chambers)',
        count: 1,
        thrust: {
          seaLevel: doc(
            S1_SL * LBF,
            `GLV-5's, 438,281 lb at the standard inlet condition, postflight reconstructed (predicted 438,696: ${GV}, Table 5.2-I, p. 5-131), the rating at sea level. Its flight average was 464,377 lb`,
          ),
          vacuum: derived(
            (S1_SL * S1_ISP.vacuum * LBF) / S1_ISP.seaLevel,
            `the sea-level figure at the high-altitude specific impulse over the sea-level one (the same flow): ${Math.round((S1_SL * S1_ISP.vacuum) / S1_ISP.seaLevel).toLocaleString('en-US')} lb for the two`,
          ),
        },
        isp: {
          seaLevel: doc(S1_ISP.seaLevel, `GLV-5's at the standard inlet condition, 260.84 s (predicted 260.91: ${GV}, Table 5.2-I)`),
          vacuum: assumed(
            S1_ISP.vacuum,
            `GLV-1's at 155 s, 281.1 s (${GI}, Table 5-II), some 60 km up: taken as the vacuum figure. GLV-5's own table has its flight average, 278.40 s (${GV}, Table 5.2-I), and no vacuum figure`,
          ),
        },
        nozzle: GLV_NOZZLES.first,
      },
      ignition: doc(0, `started on the pad, its start signal 3.33 s before liftoff (${GV}, Table 4.2-I): the run begins at release`),
      cutoff: doc(BECO, `153.55 s, 1.28 s earlier than planned (${GV}, Table 4.2-I, p. 4-10, read on the page; Table 4.3-I has 153.58)`),
    },
    second: {
      name: 'Titan second stage',
      nodes: ['TitanStage2', 'TitanStage2Engine'],
      mass: derived(
        STAGE2_GROSS * LB,
        `its empty weight and what it burned, below: ${STAGE2_GROSS.toLocaleString('en-US')} lb (${GV}, section 3.3; 59,813 lb of propellant were loaded, 5.2.2.4)`,
      ),
      dry: derived(
        STAGE2_DRY * LB,
        `the vehicle at second stage shutdown (13,633 lb) less spacecraft 5 (7,947.17 lb) and the one second of burning it still had (below): ${Math.round(STAGE2_DRY).toLocaleString('en-US')} lb with what was left in its tanks beyond that (${GV}, section 3.3)`,
      ),
      propellant: derived(
        (STAGE2_BURNED + S2_RESERVE) * LB,
        `from the start of its steady combustion (72,699 lb) to its shutdown (13,633 lb), 59,066 lb (${GV}, section 3.3), and what was left to burn when the guidance cut it, "Burn time remaining ... 1.0" s (Table 5.2-II) at its flow, 103,099 lb over 312.61 s, ${Math.round(S2_RESERVE)} lb: ${Math.round(STAGE2_BURNED + S2_RESERVE).toLocaleString('en-US')} lb`,
      ),
      engine: {
        name: 'Aerojet LR91-AJ-7',
        count: 1,
        thrust: {
          vacuum: doc(
            S2.thrust * LBF,
            `GLV-5's flight average, 103,099 lb with the roll nozzle (predicted 101,404; at the standard inlet condition 102,717: ${GV}, Table 5.2-II, p. 5-131)`,
          ),
        },
        isp: { vacuum: doc(S2.isp, `GLV-5's flight average, 312.61 s (predicted 312.91: ${GV}, Table 5.2-II)`) },
        nozzle: GLV_NOZZLES.second,
      },
      ignition: doc(
        BECO,
        `the stage II engine ignition signal at 153.55 s, with the first stage's shutdown and the staging nuts (${GV}, Table 4.2-I)`,
      ),
      cutoff: doc(SECO, `333.28 s, 3.65 s earlier than planned, by the radio guidance's command (${GV}, Table 4.2-I and 5.2.2.3)`),
    },
    staging: doc(STAGING, `"Stage separation begin" at 154.29 s (${GV}, Table 4.2-I); "separation had begun by L0 + 154.3 seconds" (4.1)`),
    hot: {
      open: estimated(
        0.5,
        'of the interstage’s side the second stage’s jet leaves through: its ring of exhaust ports, half open (the model’s; no figure read)',
      ),
      turn: estimated(30, 'degrees below the level the jet leaves the ports at: not read'),
      endures: estimated(5, 's at full thrust the first stage’s forward dome stands the jet: not read. Planned for, it stood the 0.74 s'),
    },
  },
  separation: {
    at: doc(SEPARATION, `the shaped charge fired at 356.91 s, 23.6 s after cutoff (${GV}, Table 4.2-I and 4.1)`),
    push: derived(
      (7.6 * FT * (SC_LAUNCH + STAGE2_DRY)) / STAGE2_DRY,
      `the 7.6 ft/s the aft-firing thrusters gave the spacecraft by its accelerometers, on from 356.11 s to 367.01 s with two seconds off (${GV}, Tables 4.2-I, 5.1.5-VII and 5.1.8-II; 4.1), as the joint's push, shared by the masses as every separation is (spacecraft 5, 7,947 lb, and the second stage, ${Math.round(STAGE2_DRY).toLocaleString('en-US')} lb). The crew's indicator read 6.5; 5 were planned`,
    ),
    mass: derived(
      SC_LAUNCH * LB,
      `the spacecraft at launch, 7,947.17 lb (${GV}, p. 3-28): the fairings thrown off before and what stayed on the launch vehicle are in it`,
    ),
  },
  released: [
    {
      id: 'rep-ejection',
      label: 'The pod thrown out',
      nodes: ['RadarEvaluationPod'],
      at: doc(REP, `02:07:15 (${GV}, Tables 4.2-I and 4.3-III)`),
    },
  ],
  ascent: {
    guidance: {
      azimuth: doc(
        72,
        `"Launch azimuth = 72°" (${GV}, Figure 6.2-1); "The vehicle rolled at the planned rate and to the planned flight azimuth" (4.1), the roll programme from 10.13 to 20.45 s (Table 4.2-I)`,
      ),
      vertical: doc(23.09, `up the plumb line until the pitch programme began at 23.09 s (${GV}, Table 4.2-I)`),
      programme: {
        points: [
          [0, 0],
          [23.09, 0],
          [88.35, 0.75 * (88.35 - 23.09)],
          [119.06, 0.75 * (88.35 - 23.09) + 0.56 * (119.06 - 88.35)],
          [162.61, 0.75 * (88.35 - 23.09) + 0.56 * (119.06 - 88.35) + 0.25 * (162.61 - 119.06)],
        ],
        confidence: 'documented',
        source: `GLV-5's pitch programme as flown: rate no. 1, 0.75 deg/s from 23.09 to 88.35 s; no. 2, 0.56 from 88.35 to 119.06; no. 3, 0.25 from 119.06 to 162.61 (${GV}, Table 5.2-IV, p. 5-133, read on the page: the planned rates 0.709, 0.516 and 0.235), integrated: the tilt from the launch vertical, flown open as the gyros flew it. The table's "difference" column prints each as +0.04 where the rates it gives differ by -0.04, and 4.1 calls them "low": the rates as printed are followed`,
      },
      kick: derived(
        162.61 - 23.09,
        `the programme's length, its start to its end (${GV}, Table 5.2-IV): with a stored programme the law solves its own step as the closed loop takes over`,
      ),
      turn: doc(
        168.4,
        `the radio guidance's first command at 168.40 s, the guidance enabled at 162.59 (${GV}, Table 4.2-I): flown as the law's linear tangent from there`,
      ),
      target: {
        at: 'seco',
        altitude: doc(530_298 * FT, `530,298 ft at cutoff, over the Fischer ellipsoid (${GV}, Table 4.3-I, p. 4-18, final; section 4.3)`),
        over: 'ellipsoid',
        climb: doc(-0.02, `-0.02° at cutoff, space-fixed (${GV}, Table 4.3-I)`),
        inclination: doc(32.59, `${GV}, Table 4.3-II, the final insertion set (with the azimuth given, a result and a check)`),
      },
    },
    drag: [
      {
        until: derived(STAGING, 'the first stage let go'),
        area: derived(BASE_DISC, 'the 120 in tank’s disc (Launch Systems Final Report, Figure II.C-1): 78.5 sq ft'),
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
          source:
            'NOT FOUND for the Titan II: the shape of a slender launch vehicle’s curve, the Mercury-Atlas’s (as chosen there), taken, as Gemini 3’s',
        },
      },
      {
        until: derived(SECO, 'to the end of the ascent'),
        area: derived(BASE_DISC, 'the 120 in tank’s disc'),
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
        'deg/s² at full throw, about each axis: NOT FOUND. The first stage’s two chambers gimballed, the second stage’s one, with its turbine exhaust for roll: taken as the Atlas’s 8, as Gemini 3’s',
      ),
    },
    centre: estimated(
      0,
      'the spacecraft’s centre of mass at the heat shield’s rim, Z103.44 (the model’s origin): at launch it was at Z105.61 (the mission report, p. 3-28), 2.2 in above it',
    ),
    sheds: [
      {
        on: 'staging-nuts',
        name: 'Titan first stage',
        from: doc(0, 'the first stage engines’ exit plane, station 1348.103 (titan-ii-glv.md)'),
        to: derived(STATION(500), 'the separation plane, station 500, with the interstage on it (titan-ii-glv.md)'),
        radius: doc(60 * IN, 'the 120 in tank (titan-ii-glv.md)'),
        mass: derived(STAGE1_DRY * LB, 'GLV-5’s as it was let go (as the plan’s, above)'),
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
        mass: derived(STAGE2_DRY * LB, 'GLV-5’s at shutdown less the spacecraft and its last second’s propellant (as the plan’s)'),
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
        // (thrown off with the second stage burning at near two g: pushed out to the side, where Gemini 3's went forward in orbit,
        // so the stack does not overtake it. "The crew reported that the nose fairing appeared to break up when it was
        // jettisoned", 5.1.1.3: drawn whole)
        sideways: {
          bearing: 96,
          across: estimated(0.05, 'a hair off the axis it sat on, so that it has a side to go to'),
          speed: estimated(
            4,
            'outward, enough to clear the 120 in adapter as the stack comes on under it: its ejector’s speed was not found',
          ),
        },
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
          speed: estimated(4, 'outward, thrown off under thrust with the nose fairing: its speed was not found'),
        },
        ahead: estimated(0.02, 'cover seen end-on'),
        astern: estimated(0.02, 'cover seen end-on'),
        side: {
          dragArea: estimated(0.13, 'cover seen broadside'),
          ...SCANNER_COVER,
        },
      },
      {
        on: 'rep-ejection',
        name: 'Rendezvous evaluation pod',
        ...POD,
        radius: estimated(
          0.33,
          'its case with the spiral antennas and the folded dipole boom round it (SEDR 300 vol. 2, Figure 8-79, scaled)',
        ),
        mass: estimated(
          35,
          'not found: a 10 by 10 by 20 in transponder with its batteries, lights and antennas (SEDR 300 vol. 2, p. 8-289), by judgement',
        ),
        centre: estimated(Z(48), 'about the transponder’s middle'),
        gyration: { roll: estimated(0.15, 'a box 10 in across with antennas on it'), across: estimated(0.2, 'a box 20 in long') },
        push: derived(
          4.6 * FT * (1 + 35 / (SC_LAUNCH * LB)),
          `"ΔV applied to REP" 4.6 ft/s (5.0 planned: ${GV}, Table 4.3-III), shared with the spacecraft by the masses; the cover went 80 ms before it at 100 ft/s (${SEDR2}, pp. 8-289 to 8-299), not flown apart from it`,
        ),
        ahead: estimated(0.1, 'its cover face-on, at 1.0'),
        astern: estimated(0.1, 'its case end-on'),
        side: {
          dragArea: estimated(0.15, '20 in by 10 in, at 1.2'),
          ...POD,
        },
      },
      {
        on: 'equipment-section-release',
        name: 'Equipment section',
        push: SECTION_DRIFT,
        from: derived(Z(13.44), `the adapter’s foot, Z13.44 (${SEDR}, Figure 2-4)`),
        to: derived(Z(68.44), `where the equipment and retrograde sections part, Z68.44 (${CR1106}, Figure 1, p. 5)`),
        radius: doc(60 * IN, 'its 120 in foot'),
        mass: derived((SC_LAUNCH - RETROGRADE) * LB, 'the spacecraft at launch less at retrofire (as the plan’s, below)'),
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
        label: 'Perigee at insertion',
        value: 87.4 * NMI,
        unit: 'm',
        tolerance: 12_000,
        confidence: 'documented',
        source: `${GV}, Table 4.3-II, p. 4-20: 87.4 nautical miles, final, over the oblate earth (planned 87.0)`,
      },
      {
        id: 'apogee',
        label: 'Apogee at insertion',
        value: 188.9 * NMI,
        unit: 'm',
        tolerance: 25_000,
        confidence: 'documented',
        source: `${GV}, Table 4.3-II: 188.9 nautical miles (planned 191.2)`,
      },
      {
        id: 'inclination',
        label: 'Inclination',
        value: 32.59,
        unit: '°',
        tolerance: 0.25,
        confidence: 'documented',
        source: `${GV}, Table 4.3-II`,
      },
      {
        id: 'cutoffSpeed',
        label: 'Speed at separation, space-fixed',
        value: 25_805 * FT,
        unit: 'm/s',
        tolerance: 30,
        confidence: 'documented',
        source: `${GV}, Table 4.3-I, p. 4-18: 25,805 ft/s at separation, 23.6 s after cutoff, final, with the second stage's tail-off in it (86.3 ft/s by the accelerometers, Table 5.1.5-VII) and the separation's (planned 25,807); 25,720 at cutoff itself`,
      },
      {
        id: 'beco.altitude',
        label: 'First stage cutoff: altitude',
        value: 215_550 * FT,
        unit: 'm',
        tolerance: 3000,
        confidence: 'documented',
        source: `${GV}, Table 4.3-I, final: 215,550 ft, 5,380 ft high, "the first-stage flight was slightly lofted" (4.1, 4.3.1.1)`,
      },
      {
        id: 'beco.speed',
        label: 'First stage cutoff: space-fixed speed',
        value: 9_933 * FT,
        unit: 'm/s',
        tolerance: 60,
        confidence: 'documented',
        source: `${GV}, Table 4.3-I, final: 9,933 ft/s, 55 ft/s low`,
      },
      {
        id: 'beco.climb',
        label: 'First stage cutoff: space-fixed flight-path angle',
        value: 19.87,
        unit: '°',
        tolerance: 1,
        confidence: 'documented',
        source: `${GV}, Table 4.3-I, final: 19.87°, 0.89° high`,
      },
      {
        id: 'coreG',
        label: 'Exit acceleration',
        value: 7.6,
        unit: 'g',
        tolerance: 0.5,
        confidence: 'documented',
        source: `${GV}, Table 4.3-I, p. 4-19, final (planned 7.3)`,
      },
      {
        id: 'maxQ',
        label: 'Greatest dynamic pressure on the climb',
        value: 766 * 47.880259,
        unit: 'Pa',
        tolerance: 4000,
        confidence: 'documented',
        source: `"Exit dynamic pressure" 766 lb/sq ft (${GV}, Table 4.3-I, p. 4-19, final; planned 748)`,
      },
    ],
  },
  orbit: {
    over: {
      is: 'oblate',
      confidence: 'documented',
      source: `"The actual apogees and perigees were obtained by integrating the best Gemini tracking network vectors throughout the mission to the apogee and perigee that followed ... Preliminary elements are outputs from the real-time computer complex (RTCC) during the mission and are measured over a spherical earth; final elements are measured over an oblate earth" (${GV}, section 4.3.1.2), on the Fischer ellipsoid (4.3). The ellipsoid is WGS 84’s, not Fischer’s: some 30 m lower at 30 degrees`,
    },
    perigee: doc(87.4 * NMI, `${GV}, Table 4.3-II, p. 4-20: 87.4 nautical miles, final; the orbit with the separation's push in it (4.1)`),
    apogee: doc(188.9 * NMI, `${GV}, Table 4.3-II: 188.9 nautical miles, final (the text layer garbles it; read on the page)`),
    inclination: doc(32.59, `${GV}, Table 4.3-II`),
    period: doc(89.59 * 60, `${GV}, Table 4.3-II: 89.59 min, final`),
    kind: {
      is: 'anomalistic',
      confidence: 'assumed',
      source:
        'perigee to perigee, as Gemini IV’s final set reads on the same ball (tests/periods.test.mjs: its anomalistic period to 1.1 s, against 3.5 s as Kepler and 11 s as nodal); this flight’s 89.59 min is nearest it too, 2.1 s against 2.5 s as Kepler, too close to decide by itself. No source read says what the period is',
    },
  },
  injection: {
    at: doc(
      OAMS_OFF,
      `the aft thrusters off at 367.01 s (${GV}, Table 4.2-I): "The orbital path, resulting from the launch vehicle insertion conditions plus the separation thrust, had a perigee of 87 nautical miles and an apogee of 189" (4.1)`,
    ),
    heading: 'north',
    arc: derived(
      9.7,
      `degrees: 539.6 nautical miles downrange at separation (${GV}, Table 4.3-I), 8.98° of the earth's surface, and 10 s more at 7.87 km/s, 0.7°. A ground range, taken for the arc in the orbit's plane: good to half a degree. Flying the ascent replaces it`,
    ),
    anomaly: derived(
      0.7,
      `degrees: the flight path 0.0° at separation (${GV}, Table 4.3-I) at the perigee's height, so at perigee then, and 10 s on round an orbit of 89.6 min`,
    ),
  },
  mass: derived(
    SC_LAUNCH * LB,
    `the spacecraft at launch, 7,947.17 lb (${GV}, p. 3-28), taken for it in orbit: the fairings thrown off are in it`,
  ),
  rarefied: {
    drag: assumed(2.2, KING_HELE),
    area: derived(
      BASE_DISC,
      `m²: the spacecraft held nose or tail first along the motion, the adapter's 120 in foot (${SEDR}, Figure 2-3), 7.30 m². It drifted for much of the eight days, powered down, and vented hydrogen and oxygen: the ground's K factor for it fell from 1.05 to 0.77 after the third day (${GV}, 4.3.1.2)`,
    ),
    length: doc(219.03 * IN, `219.03 in, the orbit configuration (${SEDR}, Figure 2-3): the length its Knudsen number is taken on`),
  },
  hand: estimated(4, 'deg/s: how fast the crew turned the ship on the hand controller. Not read'),
  oams: {
    aft: {
      name: 'OAMS aft-firing thrusters',
      count: 2,
      thrust: doc(
        AFT_LBF * LBF,
        `"91-pound thrust aft TCA's" (${GV}, 5.1.8.1.2, pp. 5-82 and 5-83), at the equipment section's foot, firing aft and pushing the ship forward; the type's 95 lb (${SP121}, Table 4-I)`,
      ),
      isp: doc(273, `"273 lb-sec/lb for the aft TCA's", measured in acceptance testing (${GV}, 5.1.8.1.2, p. 5-83)`),
    },
    forward: {
      name: 'OAMS forward-firing thrusters',
      count: 2,
      thrust: assumed(
        FORWARD_LBF * LBF,
        `79 lb each, the type's (${SP121}, Table 4-I, p. 29), on the retrograde section. "The forward-firing engines were not fired because of the problem with the fuel-cell oxygen-supply vessel" (${GV}, 5.1.8.1.2): nothing in this flight lights them`,
      ),
      isp: assumed(273, `273 s, the type's (${SP121}, Table 4-I)`),
    },
  },
  moves: [
    {
      id: 'perigee-adjust',
      label: 'Perigee raised, at the first apogee',
      thrusters: 'aft',
      attitude: {
        label: 'Small end forward, along the motion',
        aim: 'velocity',
        sense: 1,
        confidence: 'documented',
        source: `pitch 0°, yaw 0° (${GV}, Table 4.3-III), on the aft-firing thrusters, the only translation thrusters used but the radial (5.1.8.1.2): pushing along the motion`,
      },
      turned: derived(T(0, 55, 20), `the platform aligned for it, the alignment ended at 00:55:20 (${GV}, 5.1.5.2.2)`),
      on: doc(PERIGEE_ADJUST[0], `00:56:00, as planned (${GV}, Tables 4.2-I and 4.3-III)`),
      off: doc(PERIGEE_ADJUST[0] + PERIGEE_ADJUST[1], `13 s (${GV}, Table 4.3-III; 12.8 in Table 5.1.8-II)`),
      deltaV: doc(9.7 * FT, `9.7 ft/s by the accelerometers (${GV}, Tables 4.3-III and 5.1.5-VII; 10.0 planned)`),
    },
    {
      id: 'height-adjust',
      label: 'A rendezvous with nothing: the apogee lowered',
      thrusters: 'aft',
      attitude: {
        label: 'Blunt end forward, against the motion',
        aim: 'velocity',
        sense: -1,
        confidence: 'documented',
        source: `"a height adjustment performed blunt-end-forward (BEF) ... to lower apogee. Aft-firing thrusters were used for these maneuvers" (${GV}, 4.1); pitch 1.9° (Table 4.3-IV), not flown`,
      },
      turned: estimated(HEIGHT[0] - 300, 'in its attitude five minutes before: when the crew turned to it is not read'),
      on: doc(HEIGHT[0], `50:49:58 (${GV}, Table 4.3-IV, actual; Table 4.2-I has it initiated at 50:49:57)`),
      off: doc(HEIGHT[0] + HEIGHT[1], `27 s (${GV}, Table 4.3-IV, actual; 26.9 in Table 5.1.8-II)`),
      deltaV: doc(20.9 * FT, `-20.9 ft/s (${GV}, Table 4.3-IV, actual: by telemetry; the ground directed -21.1, the indicator read -21.5)`),
    },
    {
      id: 'phase-adjust',
      label: 'The phase adjusted',
      thrusters: 'aft',
      attitude: {
        label: 'Small end forward, along the motion',
        aim: 'velocity',
        sense: 1,
        confidence: 'documented',
        source: `"performed small-end-forward (SEF) using the platform mode" (${GV}, 4.1); pitch 0°, yaw 0° (Table 4.3-IV); "the crew reported out-of-plane components during this maneuver"`,
      },
      turned: doc(
        T(51, 20, 0),
        `"At 51 hours 20 minutes g.e.t., the platform was alined in preparation for the second simulated rendezvous maneuver" (${GV}, 4.1)`,
      ),
      on: doc(PHASE[0], `51:34:31 (${GV}, Tables 4.2-I and 4.3-IV)`),
      off: doc(PHASE[0] + PHASE[1], `20 s (${GV}, Table 4.3-IV)`),
      deltaV: doc(
        15.7 * FT,
        `15.7 ft/s (${GV}, Table 4.3-IV, actual; the accelerometers and the indicator agree, Table 5.1.5-VII; the ground directed 15.2)`,
      ),
    },
    {
      id: 'plane-change',
      label: 'The plane changed',
      thrusters: 'aft',
      attitude: {
        label: 'Yawed 90° left, square to the motion',
        aim: 'normal',
        sense: 1,
        confidence: 'documented',
        source: `"out of plane (yaw left 90°)" (${GV}, 4.1), yaw -89.2°, pitch -0.8° (Table 4.3-IV): the aft thrusters pushing to the left of the motion, toward the orbit's pole on a prograde orbit`,
      },
      turned: estimated(
        PLANE[0] - 120,
        `yawed from the alignment of "approximately 51 hours 50 minutes" (${GV}, 4.1), two minutes before: when is not read`,
      ),
      on: doc(PLANE[0], `52:06:26 (${GV}, Tables 4.2-I and 4.3-IV)`),
      off: doc(PLANE[0] + PLANE[1], `19.7 s (${GV}, Table 4.3-IV, actual)`),
      deltaV: doc(
        15.0 * FT,
        `15.0 ft/s (${GV}, Table 4.3-IV, actual; 15.6 by the accelerometers, Table 5.1.5-VII; 14.7 in Table 5.1.8-II; the ground directed 14.6)`,
      ),
    },
    {
      id: 'coelliptic',
      label: 'Coelliptic: where the Agena would have been',
      thrusters: 'aft',
      attitude: {
        label: 'Small end forward, pitched up 15°',
        aim: 'velocity',
        sense: 1,
        below: doc(-15.2, `pitch 15.2° up, yaw -0.3° (${GV}, Table 4.3-IV, actual: the ground directed 15.7)`),
        confidence: 'documented',
        source: `"a coelliptic maneuver of 17.2 ft/sec and was made SEF" (${GV}, 4.1)`,
      },
      turned: estimated(COELLIPTIC[0] - 120, 'in its attitude two minutes before: not read'),
      on: doc(COELLIPTIC[0], `53:04:04 (${GV}, Tables 4.2-I and 4.3-IV)`),
      off: doc(COELLIPTIC[0] + COELLIPTIC[1], `22.5 s (${GV}, Table 4.3-IV, actual)`),
      deltaV: doc(
        17.2 * FT,
        `17.2 ft/s on the indicator, the accelerometers' telemetry unreadable (${GV}, Tables 4.3-IV and 5.1.5-VII; 17.3 in Table 5.1.8-II)`,
      ),
    },
  ],
  adapter: {
    equipment: {
      mass: derived(
        (SC_LAUNCH - RETROGRADE) * LB,
        `the spacecraft at launch (7,947.17 lb) less at retrofire (5,549.20 lb, ${GV}, p. 3-28): ${(SC_LAUNCH - RETROGRADE).toFixed(0)} lb, with the 289 lb of propellant the manoeuvring system expended (5.1.8.1.2), the fairings and the pod in it`,
      ),
      gone: doc(EQUIPMENT, `190:26:47, 26 s earlier than planned (${GV}, Table 4.2-I)`),
    },
    retro: {
      mass: derived(
        (RETROGRADE - REENTRY) * LB,
        `the spacecraft at retrofire less at 0.05 g (${GV}, p. 3-28): ${(RETROGRADE - REENTRY).toFixed(1)} lb, the section with its four rockets unfired`,
      ),
    },
  },
  retro: {
    sequence: estimated(
      RETRO - 300,
      `five minutes before retrofire: "During the final orbit, prior to retrofire, the platform was continuously alined in BEF" (${GV}, 5.1.5.2.2); when it was put in the retrofire attitude itself is not read`,
    ),
    below: derived(
      (Math.atan2(RETRO_DOWN, RETRO_AFT) * 180) / Math.PI,
      `degrees: the retrofire's velocity on the indicator's axes by telemetry, 269.31 ft/s aft and 180.7 down (${GV}, Table 5.1.5-IX, p. 5-48): the push ${((Math.atan2(RETRO_DOWN, RETRO_AFT) * 180) / Math.PI).toFixed(1)}° below the level (planned 277.8 and 168.5, 31.2°). Its 9.94 ft/s to the left is not flown`,
    ),
    on: doc(RETRO, `the first rocket at 190:27:43.3 (${GV}, Table 5.1.8-V, p. 5-93; Table 4.2-I: 190:27:43, as planned)`),
    spacing: derived(
      (RETRO_LAST - RETRO) / 3,
      `the four lit at 190:27:43.3, 48.8, 54.0 and 190:28:00.1 (${GV}, Table 5.1.8-V): 5.6 s apart on the average`,
    ),
    count: 4,
    thrust: derived(
      (RETRO_IMPULSE * LBF) / (4 * RETRO_BURN),
      `each one's share of the four's total impulse, 56,709 lb-s, over its burning time (${GV}, Table 5.1.8-V): ${Math.round(RETRO_IMPULSE / (4 * RETRO_BURN)).toLocaleString('en-US')} lb; the type's 2,490 lb for 5.5 s (${SP121}, Table 4-I)`,
    ),
    burn: derived(
      RETRO_BURN,
      `the four's "total burn time", ignition to the end of detectable thrust, 6.4, 6.0, 6.1 and 6.2 s (${GV}, Table 5.1.8-V): their mean`,
    ),
    deltaV: doc(
      324.5 * FT,
      `324.5 ft/s (predicted 325.0) on a prefire weight of 5,549 lb (${GV}, Table 5.1.8-V); 324.46 by telemetry (Table 5.1.5-IX)`,
    ),
    gone: doc(
      RETRO_GONE,
      `190:28:30, 2 s after the planned instant (${GV}, Table 4.2-I). Section 5.1.8.2 has "190:29:30 g.e.t., when the retro section of the adapter was jettisoned": the table is followed`,
    ),
  },
  entry: {
    mass: doc(REENTRY * LB, `the re-entry module at 0.05 g, 4,733.79 lb (${GV}, p. 3-28)`),
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
        'NOT FOUND for Gemini: the Mercury capsule’s measured curve (NASA TM X-491, Figure 22; mercury-redstone.ts), taken for a blunt capsule of the same kind on its own shield’s disc, as Gemini 3’s',
    },
    lift: {
      points: [
        [1.2, 0.21],
        [1.83, 0.2],
        [2.98, 0.15],
        [4.86, 0.12],
        [6.86, 0.13],
        [9.65, 0.17],
        [15, 0.19],
        [20, 0.2],
        [27, 0.2],
      ],
      confidence: 'estimated',
      source: `lift over drag against Mach number as flown, read off the points of ${GV}'s Figure 5.1.1-1 (p. 5-4: "computed from gimbal-angle, accelerometer, and tracking data", preliminary), to a hundredth or two: about 0.2 to Mach 15, falling to 0.12 between Mach 7 and 5 and back to 0.2 by Mach 2. "The preliminary data agree quite well with preflight predictions" (5.1.1.1)`,
    },
    predicted: estimated(
      0.2,
      `the preflight prediction's line in ${GV}'s Figure 5.1.1-1 above Mach 15, "based on correlation of GT-2 and GT-3 with series 1 wind tunnel data", read off`,
    ),
    trim: estimated(
      16,
      `degrees: the trim angle of attack read off ${GV}'s Figure 5.1.1-1, about 164° above Mach 10 (and 170° by Mach 3), measured from the small end: 16° from the heat shield's axis. The heat shield's char put the stagnation point 12.6 in off its centre against the 22 in this angle implies (5.1.1.1)`,
    ),
    bank: doc(
      0,
      `"From retrofire to an altitude of 400 000 feet, a 0° bank angle (maximum lift) trajectory was flown as planned" (${GV}, 5.1.5.2.3)`,
    ),
    banked: derived(
      RETRO_GONE + 1,
      'from retrofire (5.1.5.2.3): the run flies it once the retrograde section has gone, when the module flies alone',
    ),
    banks: [
      {
        label: 'At 400,000 ft: the backup bank, 54° left',
        bank: doc(
          -54,
          `"The command pilot flew the back-up bank angle of 54°-left" from 400,000 ft (${GV}, 7.1.1.7, p. 7-10; the backup quantities "roll left 54°, roll right 68°", 6.1.2.3); 4.1 has him roll "to 53° at guidance initiate", and the computer commanded 60° right (5.1.5.2.3, Table 5.1.5-X). Left is negative: lift to the right of the motion at +90 (plan.ts Hold)`,
        ),
        at: doc(
          BANK_400K,
          `"At the proper time (190:42:04 g.e.t.)", at 400,000 ft (${GV}, 5.1.5.2.3; Table 5.1.5-X has 190:42:03.32 at 400,000 ft)`,
        ),
      },
      {
        label: 'The needle pegged: rolled to 88° left, no lift',
        bank: doc(
          -88,
          `"rolled left to the 88° bank angle (zero lift)" (${GV}, 7.1.1.7, p. 7-11); "banked 90° left" (7.1.2.7); the computer commanded 90° (5.1.5.2.3)`,
        ),
        at: derived(
          GUIDANCE + 40,
          `"Guidance commands came in at 250 000 feet ... the spacecraft was banked 54° left, according to plan, and held for about 40 seconds. When the downrange needle did not start moving up, the spacecraft was banked 90° left" (${GV}, 7.1.2.7, p. 7-18), guidance having begun at 190:44:20 (5.1.5.2.3): 190:45:00. 5.1.5.2.3 has the 90° flown from 190:44:20`,
        ),
      },
      {
        label: 'Back to the backup bank, 54° left',
        bank: doc(
          -54,
          `"he went back to the nominal back-up bank angle of 54°-left and held this for about 40 seconds" (${GV}, 7.1.1.7, p. 7-11)`,
        ),
        at: doc(
          ZERO_LIFT_END,
          `"The 90° bank angle was flown until approximately 190:47:20 g.e.t." (${GV}, 5.1.5.2.3). The crew's account has the zero lift held "about 1 min 30 sec", to "approximately the time of peak deceleration" (7.1.1.7): from 190:45:00 that is 190:46:30. The analysts' instant is followed`,
        ),
      },
      {
        label: 'The last 33 s: 60° right',
        bank: doc(
          60,
          `"he rolled to 60° right which he held for the last 33 seconds before drogue parachute deployment" (${GV}, 7.1.1.7, p. 7-11)`,
        ),
        at: derived(DROGUE - 33, `33 s before the drogue at 190:49:19 (${GV}, 7.1.1.7 and Table 4.2-I): 190:48:46`),
      },
    ],
  },
  heating: {
    noseRadius: doc(144 * IN, `the heat shield a spherical cap of 144 in radius (${SEDR}, Figure 2-3)`),
    starts: estimated(290, 'not read: the air at the pad, taken for the shield; nothing reads it, there being no surface'),
    surfaces: [],
  },
  descent: {
    ground: doc(0, 'the sea: it came down in the Atlantic, south-west of Bermuda'),
    mass: doc(
      MAIN_DEPLOY * LB,
      `the re-entry module at the main parachute's deployment, 4,355.02 lb (${GV}, p. 3-28): taken from the drogue on`,
    ),
    drogue: {
      altitude: doc(
        69_000 * FT,
        `"inadvertently deployed at an altitude of 69 000 feet instead of the normal altitude of 50 000 feet", at about Mach 1.2 (${GV}, 5.1.11; 4.1)`,
      ),
      dragArea: estimated(
        0.5 * Math.PI * ((8.3 / 2) * FT) ** 2,
        `an 8.3 ft conical ribbon drogue (${CR1106}, p. 218) at a drag coefficient of 0.5, the usual figure for the type: no measured figure found. Supersonic, "the drogue parachute squidded instead of inflating until the velocity became subsonic", about 10 s (${GV}, 5.1.11): not flown`,
      ),
      fills: derived(
        16,
        `its two 16 s reefing cutters (${CR1106}, p. 218; "the Gemini parachute stays reefed for 16 seconds", ${GV}, 5.1.11): full at 16 s`,
      ),
    },
    main: {
      altitude: doc(10_600 * FT, `"the main parachute deployment was initiated at 10 600 feet" (${GV}, 4.1), at 190:51:16 (Table 4.2-I)`),
      dragArea: derived(
        (2 * 4_400 * LB * 9.80665) / (1.225 * (31.6 * FT) ** 2),
        `the 84.2 ft ringsail's (${CR1106}, p. 222): "a mean descent rate of 31.6 fps" for a module of 4,400 lb, at sea level: 344 m²`,
      ),
      fills: derived(
        10,
        `disreefed at 10 s (${CR1106}, p. 222): full then. "The main parachute opened in the reefed condition and disreefed at the required time" (${GV}, 4.1)`,
      ),
    },
    checks: [
      {
        id: 'reentry-module.at',
        label: 'Landing',
        value: LANDING,
        unit: 's',
        tolerance: 60,
        confidence: 'documented',
        source: `190:55:14 (${GV}, Table 4.2-I; 4.1: "a very soft water landing occurred at 190:55:14 g.e.t.")`,
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
      'Cooper and Conrad landed in the ship, as Gemini was built to: the ejection seats were for the pad, the climb and below 15,000 ft, and were not used',
  },
  lands: { on: 'sea', ship: 'the spacecraft' },
  landing: {
    latitude: doc(
      29 + 47 / 60,
      `${GV}, Table 4.3-I, p. 4-19, final: 29°47′ N 69°45′ W, 89 nautical miles short of the planned point (29°43′ N 68°00′ W)`,
    ),
    longitude: doc(-(69 + 45 / 60), `${GV}, Table 4.3-I, final`),
    at: doc(LANDING, `${GV}, Table 4.2-I: 190:55:14`),
    near: 'the Atlantic, south-west of Bermuda',
    aimed: {
      confidence: 'documented',
      source: `the ground timed the retrofire for the revolution 121, area 1 landing from the last day's tracking, and "the final revolution 121, area 1, retrofire time was correct" (${GV}, 6.2.2.2.1, p. 6-14): so the run's burn is timed by its own state, as the ground's was. It is aimed at where the ship came down, not at the planned point, the run flying the entry the crew flew (the banks above) and not the half-lift entry the ground's instant was worked for: along the track the landing is held by the aim, and the miss of 89 nautical miles is in the banks, not in the burn (mission.md)`,
    },
  },
  events: [
    { id: 'liftoff', label: 'Liftoff', at: doc(0, `13:59:59.518 G.m.t., 0.482 s before the planned instant (${GV}, 4.1)`) },
    {
      id: 'beco',
      label: 'First stage cutoff: the second stage lit',
      at: doc(BECO, `${GV}, Table 4.2-I`),
      also: '1.28 s earlier than planned',
    },
    { id: 'staging', label: 'The stages begin to part', at: doc(STAGING, `${GV}, Table 4.2-I`) },
    {
      id: 'fairings',
      label: 'The radar’s nose fairing and the scanners’ cover thrown off',
      at: doc(FAIRINGS, `${GV}, Table 4.2-I`),
      also: 'planned at 199.83 s',
    },
    { id: 'seco', label: 'Second stage cutoff', at: doc(SECO, `${GV}, Table 4.2-I`), also: '3.65 s earlier than planned' },
    { id: 'oams-on', label: 'The aft thrusters lit to separate', at: doc(OAMS_ON, `${GV}, Table 4.2-I`) },
    { id: 'spacecraft-separation', label: 'Spacecraft separation', at: doc(SEPARATION, `${GV}, Table 4.2-I`) },
    {
      id: 'insertion',
      label: 'The aft thrusters off: in orbit, 87.4 by 188.9 nautical miles',
      at: doc(OAMS_OFF, `${GV}, Tables 4.2-I and 4.3-II`),
    },
    { id: 'heater', label: 'The oxygen tank’s heater fails; the pressure begins to fall', at: doc(HEATER, `${GV}, 5.1.7.2.1`) },
    { id: 'perigee-adjust', label: 'Perigee raised, 9.7 ft/s', at: doc(PERIGEE_ADJUST[0], `${GV}, Table 4.3-III`) },
    {
      id: 'rep-ejection',
      label: 'The pod thrown out, at 4.6 ft/s',
      at: doc(REP, `${GV}, Tables 4.2-I and 4.3-III`),
      also: '"At 2 hours 13 minutes" in On the Shoulders of Titans, p. 257',
    },
    {
      id: 'radar-lock',
      label: 'The radar locks on to the transponder at Cape Kennedy',
      at: doc(RADAR_LOCK, `${GV}, 4.1 and Table 5.1.5-VIII`),
    },
    { id: 'height-adjust', label: 'Apogee lowered, 20.9 ft/s', at: doc(HEIGHT[0], `${GV}, Table 4.3-IV`) },
    { id: 'phase-adjust', label: 'Phase adjusted, 15.7 ft/s', at: doc(PHASE[0], `${GV}, Table 4.3-IV`) },
    { id: 'plane-change', label: 'Plane changed, 15.0 ft/s', at: doc(PLANE[0], `${GV}, Table 4.3-IV`) },
    { id: 'coelliptic', label: 'Coelliptic, 17.2 ft/s: where an Agena would have been', at: doc(COELLIPTIC[0], `${GV}, Table 4.3-IV`) },
    { id: 'thruster-7', label: 'Thruster 7 reported dead; the ship drifts from here', at: doc(THRUSTER_7, `${GV}, 5.1.8.1.2, p. 5-82`) },
    { id: 'equipment-section-gone', label: 'The equipment section cut away', at: doc(EQUIPMENT, `${GV}, Table 4.2-I`) },
    {
      id: 'retrofire',
      label: 'Retrofire, in darkness: four rockets',
      at: doc(RETRO, `${GV}, Table 5.1.8-V`),
      also: 'one revolution early, for the weather',
    },
    { id: 'retro-section-gone', label: 'The retrograde section cut away', at: doc(RETRO_GONE, `${GV}, Table 4.2-I`) },
    {
      id: 'guidance-initiate',
      label: 'Guidance begins, wrongly: the needle pegged at an overshoot',
      at: doc(GUIDANCE, `${GV}, 5.1.5.2.3`),
    },
    { id: 'drogue-deployment', label: 'Drogue parachute, at 69,000 ft', at: doc(DROGUE, `${GV}, Table 4.2-I`) },
    { id: 'pilot-parachute', label: 'Pilot parachute, and the main after it, at 10,600 ft', at: doc(MAIN, `${GV}, Table 4.2-I`) },
    {
      id: 'landing-attitude',
      label: 'Two-point suspension',
      at: estimated(MAIN + 30, '"Shortly thereafter" the main disreefed (4.1): half a minute after the pilot parachute, not read'),
    },
    { id: 'splashdown', label: 'Landing, 89 nautical miles short', at: doc(LANDING, `${GV}, Table 4.2-I`) },
  ],
  checks: [
    {
      id: 'after-6000.perigee',
      label: 'Perigee after it was raised',
      value: 92.4 * NMI,
      unit: 'm',
      tolerance: 6_000,
      confidence: 'documented',
      source: `${GV}, Table 4.3-II: revolution 2, after the perigee adjust, 92.4 nautical miles, final. Read at 1:40:00`,
    },
    {
      id: 'after-6000.apogee',
      label: 'Apogee after the perigee was raised',
      value: 188.9 * NMI,
      unit: 'm',
      tolerance: 6_000,
      confidence: 'documented',
      source: `${GV}, Table 4.3-II: revolution 2, 188.9 nautical miles. Read at 1:40:00`,
    },
    {
      id: 'after-194400.perigee',
      label: 'Perigee after the four burns of the third day',
      value: 108.7 * NMI,
      unit: 'm',
      tolerance: 6_000,
      confidence: 'documented',
      source: `${GV}, Table 4.3-II: revolution 34, after the simulated rendezvous, 108.7 nautical miles, final. Read at 54:00:00`,
    },
    {
      id: 'after-194400.apogee',
      label: 'Apogee after the four burns of the third day',
      value: 168.8 * NMI,
      unit: 'm',
      tolerance: 6_000,
      confidence: 'documented',
      source: `${GV}, Table 4.3-II: revolution 34, 168.8 nautical miles. Read at 54:00:00`,
    },
    {
      id: 'after-680000.perigee',
      label: 'Perigee on the last day',
      value: 106.0 * NMI,
      unit: 'm',
      tolerance: 10_000,
      confidence: 'documented',
      source: `${GV}, Table 4.3-II: revolution 120, 106.0 nautical miles, final. Read at 188:53:20. The tolerance is wider for five days of drag on an orbit the ground itself could not fit within 23 per cent of its drag (4.3.1.2)`,
    },
    {
      id: 'after-680000.apogee',
      label: 'Apogee on the last day',
      value: 154.8 * NMI,
      unit: 'm',
      tolerance: 10_000,
      confidence: 'documented',
      source: `${GV}, Table 4.3-II: revolution 120, 154.8 nautical miles. Read at 188:53:20`,
    },
    {
      id: 'ejectionAt',
      label: 'Drogue out, at 69,000 ft',
      value: DROGUE,
      unit: 's',
      tolerance: 60,
      confidence: 'documented',
      source: `190:49:19 (${GV}, Table 4.2-I)`,
    },
    {
      id: 'alongTrack',
      label: 'Drogue out, along the track from where it landed',
      value: 0,
      unit: 'm',
      tolerance: 40_000,
      confidence: 'documented',
      source: `${GV}, Table 4.3-I: it landed at 29°47′ N 69°45′ W; the drogue comes out a few kilometres short of where it lands`,
    },
    {
      id: 'crossTrack',
      label: 'Drogue out, to the right of where it landed',
      value: 0,
      unit: 'm',
      tolerance: 25_000,
      confidence: 'documented',
      source: `${GV}, Table 4.3-I`,
    },
  ],
};

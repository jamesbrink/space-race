/**
 * Gemini-Titan 7 as a flight into orbit: its record (vehicles/gemini-titan-plan.ts `GeminiTitanRecord`), which flight.ts
 * writes its plan from (`geminiTitanPlan`). The record with its sources and disagreements is set out in mission.md beside
 * this file; the numbers live here, each in the source's own units and converted once.
 *
 * Times are seconds from liftoff, 19:30:03.702 UTC, 4 December 1965. The checks' tolerances were written with the record,
 * before the plan was first flown, and nothing here was changed after: a miss is recorded (src/sim/misses.ts), not fitted.
 * The mission report (MSC-G-R-66-1) has this flight's own weights, engines, sequence, manoeuvres and orbits, read on the
 * page where its text layer garbles digits; what it lacks (the fairings, the equipment section, retrorockets 2 to 4) is
 * the type's, and says so.
 */
import { assumed, derived, doc, estimated } from '../../../../../src/measure.ts';
import { CHRONOLOGY, GLV_NOZZLES, GVII, SEDR, TITANS } from '../../vehicles/gemini-titan.ts';
import type { GeminiTitanRecord } from '../../vehicles/gemini-titan-plan.ts';

const IN = 0.0254;
const FT = 0.3048;
const LB = 0.45359237;
const LBF = 4.4482216;
const NMI = 1852;

/** Seconds from liftoff of a ground elapsed time, hours, minutes and seconds. */
const T = (h: number, m: number, s: number): number => h * 3600 + m * 60 + s;

const SP121 = 'Gemini Midprogram Conference (NASA SP-121, 1966)';
const SP138 = 'Gemini Summary Conference (NASA SP-138, 1967)';
const GI = 'Gemini Program Mission Report GT-1 (NTRS 19670095753)';
const CR1106 = 'Project Gemini: A Technical Summary (Malik and Souris, NASA CR-1106, 1968)';
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

// GLV-7's weights with spacecraft 7 aboard (the mission report, 3.3, "obtained from Aerospace Corporation", read on the page):
// at liftoff, at the first stage's burnout, at the second stage's start of steady burning, at its cutoff; and spacecraft 7.
const LIFTOFF = 342_569;
const BECO_WT = 84_664;
const STAGE2_STEADY = 73_587;
const SECO_WT = 14_372;
const SC7_LAUNCH = 8_076.1;
/** What the second stage burned after its cutoff, lb: its shutdown impulse, 36,190 lb-s (5.2.2.2), at its specific impulse. */
const SHUTDOWN = 36_190 / 313.11;
/**
 * The usable propellant still in the second stage at its cutoff, lb: not stated. The vehicle could have carried 8,869 lb, 784
 * more than the spacecraft (5.2.2.4); GLV-6's two figures, 834 lb of such a margin and 767 lb of usable propellant left (its
 * evaluation, II.B and Table II-10), say the one is nearly the other, so the margin is taken for it.
 */
const RESERVE = 784;
const STAGE2_DRY = SECO_WT - SHUTDOWN - RESERVE - SC7_LAUNCH;
const STAGE2_BURNED = STAGE2_STEADY - SECO_WT + SHUTDOWN + RESERVE;
const STAGE1_DRY = BECO_WT - STAGE2_STEADY;
const STAGE2_GROSS = STAGE2_DRY + STAGE2_BURNED;
const STAGE1_GROSS = LIFTOFF - SC7_LAUNCH - STAGE2_GROSS;
// Spacecraft 7's weights through its descent (3.3): at retrofire (the equipment section gone), at 0.05 g (the retrograde
// section gone), at the main parachute's deployment.
const RETROGRADE = 5_648.73;
const REENTRY = 4_824.33;
const MAIN_DEPLOY = 4_427.95;

/** The first stage's two chambers at standard inlet conditions, postflight reconstructed (Table 5.2-I, read on the page). */
const S1_SL = 436_306;
const S1_ISP_SL = 261.74;
/** GLV-1's specific impulse at 155 s over its figure at 5 s (GT-1 report, Table 5-II): how far the type's rose with height. */
const GLV1_RISE = 281.1 / 257.3;
const S1_ISP_VAC = S1_ISP_SL * GLV1_RISE;

/** The record's instants (Table 4.2-I, read on the page). */
const BECO = 155.61;
const STAGING = 156.25;
/** The second stage's chamber pressure rising: GLV-6's stages parted 0.015 s after it (Launch Vehicle No. 6 Flight Evaluation, II.C). */
const LIGHT = STAGING - 0.015;
const SECO = 337.01;
const SEPARATION = 368.79;
const FAIRINGS = SEPARATION + 15;
const PERIGEE_ADJUST = T(3, 47, 59);
const PHASE_ADJUST = T(69, 43, 21);
const CIRCULAR_1 = T(119, 11, 55);
const CIRCULAR_2 = T(119, 55, 1);
const RETRO = T(329, 58, 4);
const EQUIPMENT = RETRO - 30;
const RETRO_GONE = RETRO + 45;
const DROGUE = T(330, 29, 30);
const MAIN = T(330, 31, 5);
const LANDING_ATTITUDE = T(330, 31, 31);
const LANDING = T(330, 35, 1);

/** The type's thrusters, lb; the heat shield's 90 in disc and the adapter's 120 in base, m². */
const AFT_LBF = 95;
const FORWARD_LBF = 79;
const SHIELD = Math.PI * (45 * IN) ** 2;
const BASE_DISC = Math.PI * (60 * IN) ** 2;
/**
 * The orbit configuration's whole outside, in²: the adapter a frustum from its 120 in foot to the 90 in heat shield over
 * the 90 in from Z13.44 to Z103.44, the re-entry module one from 90 in to about 30 in over the 129 in on to the nose, and
 * the two ends (SEDR 300, Figure 2-3, the second frustum's top by judgement).
 */
const frustum = (r1: number, r2: number, h: number) => Math.PI * (r1 + r2) * Math.hypot(h, r1 - r2);
const OUTSIDE = frustum(60, 45, 90) + frustum(45, 15, 129) + Math.PI * 60 ** 2 + Math.PI * 15 ** 2;
/** The retrofire's push as the velocity indicator read it (Table 5.1.8-III): aft and down, ft/s. */
const RETRO_AFT = 298.1;
const RETRO_DOWN = 111.8;

export const orbital: GeminiTitanRecord = {
  liftoffMass: doc(
    LIFTOFF * LB,
    `342,569 lb at liftoff with spacecraft 7 (${GVII}, 3.3, read on the page); 346,228 lb at ignition. The stages' figures below are worked from the same table and sum to it`,
  ),
  titan: {
    first: {
      name: 'Titan first stage',
      nodes: ['TitanStage1', 'TitanStage1Engine', 'TitanInterstage'],
      mass: derived(
        STAGE1_GROSS * LB,
        `GLV-7 at liftoff (342,569 lb) less spacecraft 7 (8,076.10 lb) and the second stage (${STAGE2_GROSS.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb, below): ${STAGE1_GROSS.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb (${GVII}, 3.3). The interstage goes with it. Loaded: 90,164 lb of fuel and 172,532 of oxidiser (5.2.2.3)`,
      ),
      dry: derived(
        STAGE1_DRY * LB,
        `the vehicle at the first stage's burnout (84,664 lb) less at the second stage's steady burn (73,587 lb): ${STAGE1_DRY.toLocaleString('en-US')} lb with what was left in its tanks (${GVII}, 3.3). What the second stage burned in the second between is in it`,
      ),
      propellant: derived(
        (STAGE1_GROSS - STAGE1_DRY) * LB,
        `the stage at liftoff less as it was let go: ${(STAGE1_GROSS - STAGE1_DRY).toLocaleString('en-US', { maximumFractionDigits: 0 })} lb burned from liftoff (${GVII}, 3.3); "Shutdown was initiated by oxidizer exhaustion with approximately 20 pounds of usable fuel remaining" (5.2.2.1)`,
      ),
      engine: {
        // (its two chambers on the one stage as one engine: a plan's engine count is its body's units, plan.ts `BodyDef.count`)
        name: 'Aerojet LR87-AJ-7 (two chambers)',
        count: 1,
        thrust: {
          seaLevel: assumed(
            S1_SL * LBF,
            `GLV-7's own, postflight reconstructed at standard inlet conditions, 436,306 lb (predicted 433,687: ${GVII}, Table 5.2-I, read on the page), taken as the sea-level figure, as an acceptance test's is (GLV-6's at standard inlet, 427,396 lb, is within 0.1 per cent of its acceptance test: Launch Vehicle No. 6 Flight Evaluation, Table III-3). The flight's average, 462,433 lb, lies between this and the vacuum figure below`,
          ),
          vacuum: derived(
            (S1_SL * S1_ISP_VAC * LBF) / S1_ISP_SL,
            `the sea-level figure at the vacuum specific impulse over the sea-level one (the same flow): ${Math.round((S1_SL * S1_ISP_VAC) / S1_ISP_SL).toLocaleString('en-US')} lb for the two`,
          ),
        },
        isp: {
          seaLevel: assumed(
            S1_ISP_SL,
            `GLV-7's at standard inlet conditions, 261.74 s (predicted 259.59: ${GVII}, Table 5.2-I), taken as the sea-level figure`,
          ),
          vacuum: assumed(
            S1_ISP_VAC,
            `GLV-7's 261.74 s raised as GLV-1's rose from 5 s to 155 s, 257.3 to 281.1 s (${GI}, Table 5-II): ${S1_ISP_VAC.toFixed(2)} s. GLV-7's own flight average was 279.26 s (${GVII}, Table 5.2-I), between the two`,
          ),
        },
        nozzle: GLV_NOZZLES.first,
      },
      ignition: doc(0, `started on the pad, the ignition signal at -3.51 s (${GVII}, Table 4.2-I): the run begins at release`),
      cutoff: doc(BECO, `87FS2, stage I engine shutdown, at 155.61 s, planned 155.35 (${GVII}, Table 4.2-I, read on the page)`),
    },
    second: {
      name: 'Titan second stage',
      nodes: ['TitanStage2', 'TitanStage2Engine'],
      mass: derived(
        STAGE2_GROSS * LB,
        `its weight at cutoff and what it burned, below: ${STAGE2_GROSS.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb (${GVII}, 3.3). Loaded: 21,957 lb of fuel and 38,609 of oxidiser (5.2.2.3)`,
      ),
      dry: assumed(
        STAGE2_DRY * LB,
        `the vehicle at the second stage's cutoff (14,372 lb) less spacecraft 7 (8,076.10 lb), what the engine burned after its cutoff signal (its shutdown impulse of 36,190 lb-s at 313.11 s, ${SHUTDOWN.toFixed(0)} lb, burned at full thrust here, as the stage's tail-off is not flown) and the usable propellant it still held, taken as the vehicle's payload margin, 784 lb: ${STAGE2_DRY.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb (${GVII}, 3.3, 5.2.2.2 and 5.2.2.4)`,
      ),
      propellant: assumed(
        STAGE2_BURNED * LB,
        `what it could burn from the start of its steady burn: ${STAGE2_BURNED.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb, from 73,587 lb to its cutoff at 14,372, the shutdown's ${SHUTDOWN.toFixed(0)} lb after it, and the 784 lb of margin (${GVII}, 3.3, 5.2.2.2 and 5.2.2.4). The run's guidance cuts it on the orbit, as the radio guidance did`,
      ),
      engine: {
        name: 'Aerojet LR91-AJ-7',
        count: 1,
        thrust: {
          vacuum: doc(
            102_584 * LBF,
            `GLV-7's flight average, postflight reconstructed, 102,584 lb with the roll control nozzle's (predicted 102,680: ${GVII}, Table 5.2-II, read on the page)`,
          ),
        },
        isp: { vacuum: doc(313.11, `GLV-7's flight average, 313.11 s (predicted 315.92: ${GVII}, Table 5.2-II)`) },
        nozzle: GLV_NOZZLES.second,
      },
      ignition: assumed(
        LIGHT,
        `its thrust from the chamber pressure's rise, which on GLV-6 was 0.015 s before the stages parted (Launch Vehicle No. 6 Flight Evaluation, II.C, and Table II-4): here 156.25 s less that, with the stages still joined. The ignition signal, 91FS1, was at 155.61 s with the first stage's shutdown (${GVII}, Table 4.2-I); the main fuel injection pressure switch made at 156.30`,
      ),
      cutoff: doc(SECO, `91FS2 at 337.01 s, planned 338.61; the redundant shutdown at 337.04 (${GVII}, Table 4.2-I)`),
    },
    staging: doc(STAGING, `"Stage separation begin" at 156.25 s, 0.64 s after the staging signal (${GVII}, Table 4.2-I)`),
    hot: {
      open: estimated(
        0.5,
        'of the interstage’s side the second stage’s jet leaves through: its ring of exhaust ports, half open (the model’s; no figure read)',
      ),
      turn: estimated(30, 'degrees below the level the jet leaves the ports at: not read'),
      endures: estimated(5, 's at full thrust the first stage’s forward dome stands the jet: not read. Planned for, it stood the 0.64 s'),
    },
  },
  separation: {
    at: doc(SEPARATION, `the shaped charge fired at 368.79 s; the spacecraft apart at 368.90 (${GVII}, Table 4.2-I)`),
    push: derived(
      ((2 * 2 * AFT_LBF * LBF) / (SC7_LAUNCH * LB)) * ((SC7_LAUNCH + STAGE2_DRY) / STAGE2_DRY),
      `"A spacecraft separation thrust was applied for approximately 2 seconds" (${GVII}, 4.1): the aft-firing pair, the type's 2 x 95 lb, for 2 s on spacecraft 7, ${((2 * 2 * AFT_LBF * LBF) / (SC7_LAUNCH * LB) / FT).toFixed(1)} ft/s, as the joint's push shared by the masses as every separation is (the empty second stage ${STAGE2_DRY.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb). The telemetry was lost from 368.44 s to 370.63 (Table 4.2-I, note a)`,
    ),
    mass: derived(
      SC7_LAUNCH * LB,
      `the spacecraft at launch, 8,076.10 lb (${GVII}, 3.3): what stayed on the launch vehicle at separation and the fairings thrown off after are not read`,
    ),
  },
  ascent: {
    guidance: {
      azimuth: doc(
        83.6,
        `83.6° (${GVII}, 5.2.9.1, read on the page; ${CHRONOLOGY}; ${TITANS}, p. 280): the roll programme from 19.35 to 20.39 s (Table 4.2-I)`,
      ),
      vertical: doc(22.94, `up the plumb line until "Pitch program rate no. 1 start" at 22.94 s, planned 23.04 (${GVII}, Table 4.2-I)`),
      kick: estimated(15, 's: the stored pitch programme’s rates are not in the report; a pitch-over of fifteen seconds is ours'),
      turn: estimated(
        BECO,
        's: the radio guidance’s closed loop flown as the law’s linear tangent from staging; the first stage’s programme before it. The radio guidance was enabled at 161.99 s and its first command came at 168.60 (Table 4.2-I)',
      ),
      target: {
        at: 'seco',
        altitude: doc(
          529_440 * FT,
          `${GVII}, Table 4.3-I, final: 529,440 ft at the second stage's cutoff, a geodetic height ("The earth model for all trajectories contained geodetic and gravitational constants representing the Fischer ellipsoid", 4.3)`,
        ),
        over: 'ellipsoid',
        climb: doc(0.04, `${GVII}, Table 4.3-I, final: +0.04° space-fixed at cutoff`),
        inclination: doc(28.89, `${GVII}, Table 4.3-III, final: 28.89° (with the azimuth given, a result and a check)`),
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
          source: 'NOT FOUND for the Titan II: the shape of a slender launch vehicle’s curve, the Mercury-Atlas’s (as chosen there), taken',
        },
      },
      {
        until: derived(SECO, 'to the end of the ascent'),
        area: derived(BASE_DISC, 'the 120 in tank’s disc (Launch Systems Final Report, Figure II.C-1)'),
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
    centre: estimated(
      0,
      'the spacecraft’s centre of mass at the heat shield’s rim, Z103.44 (the model’s origin): spacecraft 7’s at launch was at Z105.12 (the mission report, 3.3), its own Z reference 15.44 in aft of the mating plane; not reduced to the model’s',
    ),
    sheds: [
      {
        on: 'staging-nuts',
        name: 'Titan first stage',
        from: doc(0, 'the first stage engines’ exit plane, station 1348.103 (titan-ii-glv.md)'),
        to: derived(STATION(500), 'the separation plane, station 500, with the interstage on it (titan-ii-glv.md)'),
        radius: doc(60 * IN, 'the 120 in tank (titan-ii-glv.md)'),
        mass: derived(STAGE1_DRY * LB, 'GLV-7’s as it was let go (as the plan’s, above)'),
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
        mass: derived(STAGE2_DRY * LB, 'GLV-7’s at cutoff less the spacecraft (as the plan’s)'),
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
        side: { dragArea: estimated(0.11, 'cap seen on edge'), ...NOSE_CAP },
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
        side: { dragArea: estimated(0.13, 'cover seen broadside'), ...SCANNER_COVER },
      },
      {
        on: 'equipment-section-release',
        name: 'Equipment section',
        push: SECTION_DRIFT,
        from: derived(Z(13.44), `the adapter’s foot, Z13.44 (${SEDR}, Figure 2-4)`),
        to: derived(Z(68.44), `where the equipment and retrograde sections part, Z68.44 (${CR1106}, Figure 1, p. 5)`),
        radius: doc(60 * IN, 'its 120 in foot'),
        mass: derived((SC7_LAUNCH - RETROGRADE) * LB, 'the spacecraft at launch less at retrofire (as the plan’s, below)'),
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
          `its weight with the rockets unfired (as the plan’s), less their 220 lb of propellant (${SP121}, Table 4-I)`,
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
        label: 'Perigee at cutoff',
        value: 87.2 * NMI,
        unit: 'm',
        tolerance: 12_000,
        confidence: 'documented',
        source: `${GVII}, Table 4.3-III, final: 87.2 nautical miles (planned 87.1); ${CHRONOLOGY}`,
      },
      {
        id: 'apogee',
        label: 'Apogee at cutoff',
        value: 177.1 * NMI,
        unit: 'm',
        tolerance: 25_000,
        confidence: 'documented',
        source: `${GVII}, Table 4.3-III, final: 177.1 nautical miles (planned 183.1); ${CHRONOLOGY}`,
      },
      {
        id: 'inclination',
        label: 'Inclination',
        value: 28.89,
        unit: '°',
        tolerance: 0.25,
        confidence: 'documented',
        source: `${GVII}, Table 4.3-III`,
      },
      {
        id: 'cutoffSpeed',
        label: 'Speed at cutoff, space-fixed',
        value: 25_793 * FT,
        unit: 'm/s',
        tolerance: 30,
        confidence: 'documented',
        source: `${GVII}, Table 4.3-I, final: 25,793 ft/s at the spacecraft's separation, 368.79 s, with the second stage's shutdown impulse in it (25,714 at the cutoff itself; planned 25,804)`,
      },
    ],
  },
  orbit: {
    over: {
      is: 'oblate',
      confidence: 'assumed',
      source: `the report family's final elements, as Gemini 3's are read (its orbital.ts): "Preliminary actual orbital elements were measured over a spherical earth, whereas the final actual and planned elements were measured over an oblate earth" (Gemini Program Mission Report, Gemini IV, section 4.3.1.2). This report has the same model ("the Fischer ellipsoid", 4.3) and its final elements by "integrating the Gemini tracking network vectors" (4.3.1.2), and its preliminary ones "measured above the launch complex 19 earth radius" (Table 4.3-IV, note a), but it also speaks of "the gradual rise in perigee altitude (measured as height above a spherical earth)" of Gemini V and VII (4.3.1.2): mission.md. The ellipsoid is WGS 84’s, not Fischer’s`,
    },
    perigee: doc(87.2 * NMI, `${GVII}, Table 4.3-III, final, before the station keeping: 87.2 nautical miles; ${CHRONOLOGY}`),
    apogee: doc(177.1 * NMI, `${GVII}, Table 4.3-III: 177.1 nautical miles; ${CHRONOLOGY}`),
    inclination: doc(28.89, `${GVII}, Table 4.3-III`),
    period: doc(89.39 * 60, `${GVII}, Table 4.3-III: 89.39 min; ${CHRONOLOGY}`),
    kind: {
      is: 'anomalistic',
      confidence: 'assumed',
      source:
        'perigee to perigee, as Gemini 3’s is read (its orbital.ts and mission.md, after the Gemini IV and V reports’ final insertion sets, tests/periods.test.mjs): the report does not say what its periods are',
    },
  },
  injection: {
    at: doc(
      SEPARATION,
      `${GVII}, Table 4.3-I: the spacecraft's separation at 368.79 s, where its final insertion conditions are given; the published orbit is the one "before maneuver" there (Table 4.3-III)`,
    ),
    heading: 'north',
    arc: derived(
      (585.4 * NMI) / 6_371_000 / (Math.PI / 180),
      `degrees: the range at separation, 585.4 nautical miles (${GVII}, Table 4.3-I, final), over the Earth's mean radius. Flying the ascent replaces it`,
    ),
    anomaly: derived(
      3.2,
      `degrees: from the flight-path angle at separation, +0.04° (${GVII}, Table 4.3-I, final), on the published orbit’s eccentricity, 0.0126: tan γ = e sin ν / (1 + e cos ν), so three degrees past perigee`,
    ),
  },
  mass: derived(
    SC7_LAUNCH * LB,
    `the spacecraft at launch, 8,076.10 lb (${GVII}, 3.3), taken for it in orbit: what it left on the launch vehicle and the fairings are not read`,
  ),
  rarefied: {
    drag: assumed(2.2, KING_HELE),
    area: estimated(
      (OUTSIDE / 4) * IN * IN,
      `m²: a quarter of the orbit configuration's whole outside, ${((OUTSIDE * IN * IN) / 1).toFixed(1)} m², which is what a convex body presents on the average over every way it can lie (Cauchy): the ship was powered down and let drift for most of its fourteen days, "the spacecraft tumbling rate increased" in its sleep periods (${GVII}, 4.1), and how it lay was not recorded. Held nose or tail first it would be the adapter's 7.30 m²`,
    ),
    length: doc(219.03 * IN, `219.03 in, the orbit configuration (${SEDR}, Figure 2-3): the length its Knudsen number is taken on`),
  },
  hand: estimated(4, 'deg/s: how fast the crew turned the ship on the hand controller. Not read'),
  oams: {
    aft: {
      name: 'OAMS aft-firing thrusters',
      count: 2,
      thrust: assumed(
        AFT_LBF * LBF,
        `95 lb each, the type's (${SP121}, Table 4-I, p. 29; "94.5", ${CR1106}, p. 139), at the equipment section's foot, firing aft and pushing the ship forward`,
      ),
      isp: assumed(273, `273 s, the type's (${SP121}, Table 4-I)`),
    },
    forward: {
      name: 'OAMS forward-firing thrusters',
      count: 2,
      thrust: assumed(
        FORWARD_LBF * LBF,
        `79 lb each, the type's (${SP121}, Table 4-I, p. 29), on the retrograde section, firing forward and pushing the ship back`,
      ),
      isp: assumed(273, `273 s, the type's (${SP121}, Table 4-I)`),
    },
  },
  // Each from the report's Table 4.3-II, "Maneuvers obtained from orbital Gemini Network tracking data", read on the page.
  // Not flown: the station keeping on the second stage and the radial burn of 0:21:17 that ended it (8.8 ft/s by the
  // thrusters that push down, pitched -41.5° and yawed 49°): the record's manoeuvres are along the motion or across it.
  moves: [
    {
      id: 'perigee-adjust',
      label: 'Perigee adjust: the perigee raised for fourteen days',
      thrusters: 'aft',
      attitude: {
        label: 'Blunt end aft, along the motion',
        aim: 'velocity',
        sense: 1,
        confidence: 'documented',
        source: `the aft thrusters, "pitch and roll attitudes were held at zero degrees with respect to the horizon" and the yaw on a star (${GVII}, 4.1); pitch -5.6° and yaw 4.2° as tracked (Table 4.3-II)`,
      },
      turned: estimated(PERIGEE_ADJUST - 120, 'in its attitude two minutes before: when the crew turned to it is not read'),
      on: doc(PERIGEE_ADJUST, `3:47:59, as planned (${GVII}, Tables 4.2-I and 4.3-II)`),
      off: doc(PERIGEE_ADJUST + 76.2, `76.2 s, planned 77 (${GVII}, Table 4.3-II)`),
      deltaV: doc(58.1 * FT, `58.1 ft/s, planned 59 (${GVII}, Table 4.3-II)`),
    },
    {
      id: 'phase-adjust',
      label: 'Phase adjust: the orbit set for Gemini VI-A’s launch',
      thrusters: 'aft',
      attitude: {
        label: 'Blunt end aft, along the motion',
        aim: 'velocity',
        sense: 1,
        confidence: 'documented',
        source: `"A posigrade maneuver", the aft-firing thrusters, aligned on the reticle and a star (${GVII}, 4.1); pitch -5.5° and yaw -3.3° as tracked (Table 4.3-II)`,
      },
      turned: estimated(PHASE_ADJUST - 120, 'in its attitude two minutes before: not read'),
      on: doc(PHASE_ADJUST, `69:43:21 (${GVII}, Table 4.2-I, actual; Table 4.3-II and 4.1 have 69:43:19)`),
      off: doc(PHASE_ADJUST + 16.5, `16.5 s, as planned (${GVII}, Table 4.3-II and 4.1)`),
      deltaV: doc(12.6 * FT, `12.6 ft/s, planned 12.4 (${GVII}, Table 4.3-II and 4.1)`),
    },
    {
      id: 'circular-perigee-adjust',
      label: 'Circularisation: the perigee raised to the target’s height',
      thrusters: 'aft',
      attitude: {
        label: 'Blunt end aft, along the motion',
        aim: 'velocity',
        sense: 1,
        confidence: 'documented',
        source: `"a posigrade perigee adjust maneuver using the aft-firing thrusters" (${GVII}, 4.1); pitch -1.3°, yaw 0 (Table 4.3-II)`,
      },
      turned: estimated(CIRCULAR_1 - 120, 'in its attitude two minutes before: not read'),
      on: doc(CIRCULAR_1, `119:11:55, as planned (${GVII}, Tables 4.2-I and 4.3-II)`),
      off: doc(CIRCULAR_1 + 75.6, `75.6 s, planned 78 (${GVII}, Table 4.3-II)`),
      deltaV: doc(
        60.0 * FT,
        `60.0 ft/s, planned 61.2 (${GVII}, Table 4.3-II and 4.1; 7.1.2.3.2 has 61.2, the figure put into the computer)`,
      ),
    },
    {
      id: 'circular-apogee-adjust',
      label: 'Circularisation: the apogee brought down',
      thrusters: 'aft',
      attitude: {
        label: 'Blunt end forward, against the motion',
        aim: 'velocity',
        sense: -1,
        confidence: 'documented',
        source: `"a retrograde apogee adjust maneuver" (${GVII}, 4.1), the aft-firing thrusters yawed 178.1° (Table 4.3-II)`,
      },
      turned: estimated(CIRCULAR_2 - 120, 'in its attitude two minutes before: not read'),
      on: doc(CIRCULAR_2, `119:55:01, as planned (${GVII}, Tables 4.2-I and 4.3-II)`),
      off: doc(CIRCULAR_2 + 15, `15 s, as planned (${GVII}, Table 4.3-II and 4.1)`),
      deltaV: doc(12.1 * FT, `12.1 ft/s, as planned (${GVII}, Table 4.3-II)`),
    },
  ],
  adapter: {
    equipment: {
      mass: derived(
        (SC7_LAUNCH - RETROGRADE) * LB,
        `the spacecraft at launch (8,076.10 lb) less at retrofire (5,648.73 lb: ${GVII}, 3.3): ${(SC7_LAUNCH - RETROGRADE).toFixed(0)} lb, with what the thrusters burned, nearly all of the 340 lb usable (5.1.8.1.2), not taken off`,
      ),
      gone: assumed(
        EQUIPMENT,
        `30 s before retrofire, the type's sequence (${SP121}, Figure 3-3, p. 17): not recorded, the tape recorder having failed and no station being in reach (${GVII}, 5.1.7.4)`,
      ),
    },
    retro: {
      mass: derived(
        (RETROGRADE - REENTRY) * LB,
        `spacecraft 7 at retrofire less at 0.05 g (${GVII}, 3.3): ${(RETROGRADE - REENTRY).toFixed(1)} lb, the section with its four rockets unfired`,
      ),
    },
  },
  retro: {
    sequence: estimated(
      RETRO - 60,
      'a minute before retrofire: when the crew had it in retrofire attitude is not read; the re-entry control system was on from about 329:15 (5.1.8.2.2)',
    ),
    below: derived(
      (Math.atan2(RETRO_DOWN, RETRO_AFT) * 180) / Math.PI,
      `degrees: the push as the velocity indicator read it after retrofire, 298.1 ft/s aft and 111.8 down (and 4.8 right, not flown: ${GVII}, Table 5.1.8-III, read on the page), so ${((Math.atan2(RETRO_DOWN, RETRO_AFT) * 180) / Math.PI).toFixed(1)}° below the line back along the motion`,
    ),
    on: doc(RETRO, `329:58:04, as planned (${GVII}, Table 4.2-I; ${CHRONOLOGY})`),
    spacing: assumed(
      5.5,
      `"fired at 5.5 second intervals in 1-2-3-4 order", the type's (${SEDR}, Section XI, p. 11-73): when the other three fired was not recorded (${GVII}, 5.1.7.4)`,
    ),
    count: 4,
    thrust: assumed(2_490 * LBF, `2,490 lb each, the type's (${SP121}, Table 4-I, p. 29)`),
    burn: assumed(5.5, '5.5 s each, the type’s (NASA release 65-81, p. 8)'),
    deltaV: doc(
      318.5 * FT,
      `318.5 ft/s, "the magnitude of the incremental velocity indicator vector telemetered to Hawaii just after retrofire" (${GVII}, Table 5.1.8-III, read on the page; nominal 316.8, and 318.9 by the rockets' acceptance tests and the ship's weight), on spacecraft 7 at 5,658 lb as there estimated`,
    ),
    gone: assumed(
      RETRO_GONE,
      `45 s after retrofire, when the type's sequence lights the jettison switch (${SP121}, Figure 3-3): not recorded`,
    ),
  },
  entry: {
    mass: doc(REENTRY * LB, `spacecraft 7's re-entry module at 0.05 g, 4,824.33 lb (${GVII}, 3.3)`),
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
      points: [[0, 0.19]],
      confidence: 'estimated',
      source: `lift over drag as flown, at every Mach number: the programme's, "flown with an average lift-to-drag ratio of approximately 0.19" (${SP138}, p. 159), taken for spacecraft 7, whose own is not in its report`,
    },
    predicted: derived(
      0.19 / 0.65,
      `the lift over drag the wind tunnels had given, said and not flown: "a decrease of approximately 35 percent in the lift-to-drag ratio" (${SP138}, p. 163), from the 0.19 flown: 0.29`,
    ),
    trim: assumed(8.5, '"8° to 9°" at the greatest heating on GT-3 (Gemini Program Mission Report, Gemini IV, p. 5-3): the type’s, taken'),
    bank: estimated(
      -48.8,
      `degrees, to the left: the report's reconstruction of the entry, "through bank and reverse bank angles of 48.8°" to the landing point (${GVII}, 4.3.1.3), held to the left, the way the crew first rolled ("rolled left 55°", 4.1). The crew "reversed bank four or five times as required to null out cross-range dispersions" and flew "at about 35° roll" (4.3.1.3): the reversals are not flown, so the side the lift is held to is ours`,
    ),
    banked: estimated(RETRO_GONE + 1, 'as the retrograde section went: the ship turned to its entry attitude, its lift held from there'),
  },
  heating: {
    noseRadius: doc(144 * IN, `the heat shield a spherical cap of 144 in radius (${SEDR}, Figure 2-3)`),
    starts: estimated(290, 'not read: the air at the pad, taken for the shield; nothing reads it, there being no surface'),
    surfaces: [],
  },
  descent: {
    ground: doc(0, 'the sea: it came down in the western Atlantic'),
    mass: doc(
      MAIN_DEPLOY * LB,
      `spacecraft 7's re-entry module at the main parachute's deployment, 4,427.95 lb (${GVII}, 3.3): taken from the drogue on`,
    ),
    drogue: {
      altitude: doc(
        50_000 * FT,
        `"Drogue parachute deploy 330:29:30", plotted at about 50,000 ft of pressure altitude (${GVII}, Figure 5.1.11-1, read off the figure to a thousand feet)`,
      ),
      dragArea: estimated(
        0.5 * Math.PI * ((8.3 / 2) * FT) ** 2,
        `an 8.3 ft conical ribbon drogue (${CR1106}, p. 218) at a drag coefficient of 0.5, the usual figure for the type: no measured figure found`,
      ),
      fills: derived(16, `"Drogue parachute disreef 330:29:46", 16 s after it came out (${GVII}, Figure 5.1.11-1)`),
    },
    main: {
      altitude: assumed(
        10_600 * FT,
        `the PARA switch at 10,600 ft, the type's (${SEDR}, pp. 4-22 and 4-23); the figure has the pilot parachute out at 330:31:02 at about that height (${GVII}, Figure 5.1.11-1)`,
      ),
      dragArea: derived(
        (2 * 4_400 * LB * 9.80665) / (1.225 * (31.6 * FT) ** 2),
        `the 84.2 ft ringsail's (${CR1106}, p. 222): "a mean descent rate of 31.6 fps" for a module of 4,400 lb, at sea level: 344 m²`,
      ),
      fills: derived(13, `deployed at 330:31:05 and "full open" at 330:31:18 (${GVII}, Figure 5.1.11-1)`),
    },
    checks: [
      {
        id: 'reentry-module.at',
        label: 'Landing',
        value: LANDING,
        unit: 's',
        tolerance: 60,
        confidence: 'documented',
        source: `${GVII}, Table 4.2-I: 330:35:01, planned 330:35:20; ${CHRONOLOGY}`,
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
      'Borman and Lovell landed in the ship, as Gemini was built to, and were taken from the water by helicopter: the ejection seats were for the pad, the climb and below 15,000 ft, and were not used',
  },
  lands: { on: 'sea', ship: 'the spacecraft' },
  landing: {
    aimed: {
      from: estimated(
        RETRO - 60,
        'the retrosequence: the turn to retrofire attitude, the equipment section and the rockets keep their intervals to the burn the ground timed (plan.ts `LandingAim.from`)',
      ),
      confidence: 'assumed',
      source:
        'The retrofire’s instant was worked on the ground for the planned landing point from the tracking of the revolution before, “because the retrofire setting in the spacecraft was based on that solution” (Gemini Program Mission Report, Gemini VII, 4.3.1.3), and it fired “exactly on time” (SP-4002, 4 December); the ship came down 6.4 nautical miles short, so the place it came down is taken for the place its burn was timed for',
    },
    latitude: doc(
      25 + 25.1 / 60,
      `${GVII}, Table 4.3-I, final, "based on final Grand Turk Island radar tracking data": 25°25.1′ N 70°06.7′ W, 6.4 nautical miles short of the planned point`,
    ),
    longitude: doc(-(70 + 6.7 / 60), `${GVII}, Table 4.3-I, final`),
    at: doc(LANDING, `${GVII}, Table 4.2-I: 330:35:01`),
    near: 'the western Atlantic, north of Hispaniola',
  },
  events: [
    { id: 'liftoff', label: 'Liftoff', at: doc(0, `${GVII}, 4.1: 19:30:03.702 G.m.t., 3.702 s after the planned instant`) },
    { id: 'beco', label: 'First stage cutoff: the second stage lit', at: doc(BECO, `${GVII}, Table 4.2-I`), also: 'planned 155.35' },
    { id: 'stage-separation', label: 'The stages begin to part', at: doc(STAGING, `${GVII}, Table 4.2-I`) },
    { id: 'seco', label: 'Second stage cutoff', at: doc(SECO, `${GVII}, Table 4.2-I`), also: 'planned 338.61' },
    { id: 'spacecraft-separation', label: 'Spacecraft separation', at: doc(SEPARATION, `${GVII}, Table 4.2-I`) },
    {
      id: 'fairings',
      label: 'Nose and scanner fairings off',
      at: estimated(
        FAIRINGS,
        `not in the sequence of events: pressed "after staging on S/C 7" (${SEDR}, p. 4-53), the crew speaking of "spacecraft separation and fairing jettison" together (${GVII}, 7.1.2.2); taken as 15 s after the separation`,
      ),
    },
    {
      id: 'away-from-the-stage',
      label: 'Away from the second stage: 8.8 ft/s, not flown',
      at: doc(T(0, 21, 17), `${GVII}, Tables 4.2-I and 4.3-II`),
    },
    { id: 'perigee-adjust', label: 'Perigee adjust', at: doc(PERIGEE_ADJUST, `${GVII}, Table 4.2-I`) },
    { id: 'phase-adjust', label: 'Phase adjust', at: doc(PHASE_ADJUST, `${GVII}, Table 4.2-I`) },
    { id: 'circular-perigee-adjust', label: 'First circularising burn', at: doc(CIRCULAR_1, `${GVII}, Table 4.2-I`) },
    { id: 'circular-apogee-adjust', label: 'Second circularising burn, retrograde', at: doc(CIRCULAR_2, `${GVII}, Table 4.2-I`) },
    { id: 'gemini-vi-a-liftoff', label: 'Gemini VI-A lifts off', at: doc(T(258, 7, 22.77), `${GVII}, 4.1`) },
    {
      id: 'gemini-vi-a-braking',
      label: 'Gemini VI-A begins braking, about 3,000 ft off',
      at: doc(T(263, 58, 0), `"accomplished at 263:58" (${GVII}, 1.0)`),
      also: 'stopped 120 ft below at about 264:03 (Titans, p. 287): not flown here, Gemini VI-A not being in this run',
    },
    { id: 'retrofire', label: 'Retrofire, as planned to the second', at: doc(RETRO, `${GVII}, Table 4.2-I`) },
    { id: 'blackout', label: 'Communications blackout begins', at: doc(T(330, 21, 43), `${GVII}, Table 4.2-I`), also: 'ends 330:27:32' },
    { id: 'drogue-deployment', label: 'Drogue parachute', at: doc(DROGUE, `${GVII}, Table 4.2-I and Figure 5.1.11-1`) },
    {
      id: 'main-deployment',
      label: 'The main parachute out',
      at: doc(MAIN, `${GVII}, Figure 5.1.11-1: the rendezvous and recovery section off and the main out`),
    },
    {
      id: 'landing-attitude',
      label: 'Two-point suspension: repositioned for the landing',
      at: doc(LANDING_ATTITUDE, `${GVII}, Figure 5.1.11-1`),
    },
    { id: 'splashdown', label: 'Landing', at: doc(LANDING, `${GVII}, Table 4.2-I`) },
  ],
  checks: [
    {
      id: 'after-16200.perigee',
      label: 'Perigee after the perigee adjust',
      value: 119.6 * NMI,
      unit: 'm',
      tolerance: 6_000,
      confidence: 'documented',
      source: `${GVII}, Table 4.3-III, final, after the manoeuvre: 119.6 nautical miles (planned 114.2). Read at 4:30:00`,
    },
    {
      id: 'after-16200.apogee',
      label: 'Apogee after the perigee adjust',
      value: 174.3 * NMI,
      unit: 'm',
      tolerance: 6_000,
      confidence: 'documented',
      source: `${GVII}, Table 4.3-III, final: 174.3 nautical miles, the station keeping and the radial burn before it having taken 2.8 off the 177.1 (not flown). Read at 4:30:00`,
    },
    {
      id: 'after-253800.perigee',
      label: 'Perigee after the phase adjust',
      value: 126.5 * NMI,
      unit: 'm',
      tolerance: 6_000,
      confidence: 'documented',
      source: `${GVII}, Table 4.3-III, final: 126.5 nautical miles. Read at 70:30:00`,
    },
    {
      id: 'after-253800.apogee',
      label: 'Apogee after the phase adjust',
      value: 170.9 * NMI,
      unit: 'm',
      tolerance: 6_000,
      confidence: 'documented',
      source: `${GVII}, Table 4.3-III, final: 170.9 nautical miles. Read at 70:30:00`,
    },
    {
      id: 'after-433800.perigee',
      label: 'Perigee after the two circularising burns',
      value: 160.5 * NMI,
      unit: 'm',
      tolerance: 6_000,
      confidence: 'documented',
      source: `${GVII}, Table 4.3-III, final: 160.5 nautical miles (preliminary 161.6). Read at 120:30:00`,
    },
    {
      id: 'after-433800.apogee',
      label: 'Apogee after the two circularising burns',
      value: 162.8 * NMI,
      unit: 'm',
      tolerance: 6_000,
      confidence: 'documented',
      source: `${GVII}, Table 4.3-III, final: 162.8 nautical miles; period 90.61 min. Read at 120:30:00`,
    },
    {
      id: 'after-1184400.perigee',
      label: 'Perigee in the last revolution, before retrofire',
      value: 156.5 * NMI,
      unit: 'm',
      tolerance: 6_000,
      confidence: 'documented',
      source: `${GVII}, Table 4.3-IV, final, revolution 206 "prior to retrofire": 156.5 nautical miles; ${CHRONOLOGY}. Read at 329:00:00`,
    },
    {
      id: 'after-1184400.apogee',
      label: 'Apogee in the last revolution, before retrofire',
      value: 163.6 * NMI,
      unit: 'm',
      tolerance: 6_000,
      confidence: 'documented',
      source: `${GVII}, Table 4.3-IV, final: 163.6 nautical miles, 90.57 min; ${CHRONOLOGY}. Read at 329:00:00`,
    },
    {
      id: 'ejectionAt',
      label: 'Drogue out, at about 50,000 ft',
      value: DROGUE,
      unit: 's',
      tolerance: 60,
      confidence: 'documented',
      source: `${GVII}, Table 4.2-I: 330:29:30, planned 330:29:26`,
    },
    {
      id: 'alongTrack',
      label: 'Drogue out, along the track from where it landed',
      value: 0,
      unit: 'm',
      tolerance: 40_000,
      confidence: 'documented',
      source: `${GVII}, Table 4.3-I: it landed at 25°25.1′ N 70°06.7′ W; the drogue comes out a few kilometres short of where it lands`,
    },
    {
      id: 'crossTrack',
      label: 'Drogue out, to the right of where it landed',
      value: 0,
      unit: 'm',
      tolerance: 25_000,
      confidence: 'documented',
      source: `${GVII}, Table 4.3-I and 4.1: "0.5 nautical miles to the left of track"`,
    },
  ],
};

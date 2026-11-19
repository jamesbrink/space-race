/**
 * Gemini-Titan 6A as a flight into orbit: its record (vehicles/gemini-titan-plan.ts `GeminiTitanRecord`), which flight.ts
 * writes its plan from (`geminiTitanPlan`). The record with its sources and disagreements is set out in mission.md beside
 * this file; the numbers live here, each in the source's own units and converted once.
 *
 * Times are seconds from liftoff, 13:37:26.471 UTC, 15 December 1965: the flight flown, not the count of 12 December that
 * ended on the pad. The checks' tolerances were written with the record, before the plan was first flown, and nothing here
 * was changed after: a miss is recorded (src/sim/misses.ts), not fitted. The mission report (MSC-G-R-66-2) has not been
 * found, after a third search: the launch vehicle is its own evaluation's (Martin, ER 13227-6), the rendezvous the
 * planners', the crew's and the computer's (SP-121, papers 28 and 29; the IBM post-flight report; SP-4203), the orbit,
 * retrofire and landing SP-4002's; the spacecraft's weights after launch are spacecraft 7's, `assumed`.
 *
 * Gemini VII is not in this run: the record's burns are flown at their instants and impulses along the attitudes the
 * crew held, not solved on the target (mission.md).
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

const GLV6 =
  'Launch Vehicle No. 6 Flight Evaluation, supplemental report 2 to MSC-G-R-65-5 and MSC-G-R-66-2 (Martin, ER 13227-6, February 1966)';
const IGS6 =
  'Gemini 6 Inertial Guidance System Evaluation and Trajectory Reconstruction, supplemental report 4 to MSC-G-R-66-2 (TRW, June 1966)';
const IBM6 = 'GT-6 Rendezvous and Catch-Up Post Flight Report, in supplemental report 5 to MSC-G-R-66-2 (IBM, March 1966)';
const SP121 = 'Gemini Midprogram Conference (NASA SP-121, 1966)';
const PLANNING = `Lineberry, "Gemini VI-A Rendezvous Mission Planning" (${SP121}, paper 28, pp. 277 to 281)`;
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

// GLV-6's weights with spacecraft 6 aboard, from its own evaluation (Table II-10, "GT-6 Weight Summary", read in its text
// layer and checked against itself): at liftoff, at the first stage's cutoff, at the second stage's start ("Stage II LO"),
// 20 s after its cutoff; and spacecraft 6 ("Information from NASA-Houston").
const LIFTOFF = 342_472;
const BECO_WT = 84_928;
const STAGE2_STEADY = 72_962;
const SECO20_WT = 14_052;
const SC6_LAUNCH = 7_821;
/** The usable propellant still in the second stage 20 s after its cutoff (Table II-10, note 4): the guidance cut on the orbit. */
const RESERVE = 767;
const STAGE2_DRY = SECO20_WT - RESERVE - SC6_LAUNCH;
const STAGE2_BURNED = STAGE2_STEADY - SECO20_WT + RESERVE;
const STAGE1_DRY = BECO_WT - STAGE2_STEADY;
const STAGE2_GROSS = STAGE2_DRY + STAGE2_BURNED;
const STAGE1_GROSS = LIFTOFF - SC6_LAUNCH - STAGE2_GROSS;
// Spacecraft 7's weights through its descent (Gemini Program Mission Report, Gemini VII, 3.3), taken for spacecraft 6's,
// whose own are in its report, not found: at retrofire, at 0.05 g, at the main parachute's deployment.
const RETROGRADE = 5_648.73;
const REENTRY = 4_824.33;
const MAIN_DEPLOY = 4_427.95;

/** The first stage's two chambers at standard inlet conditions, as flown (Table III-3, at 87FS1 + 55 s). */
const S1_SL = 427_396;
const S1_ISP_SL = 260.02;
/** GLV-1's specific impulse at 155 s over its figure at 5 s (GT-1 report, Table 5-II): how far the type's rose with height. */
const GLV1_RISE = 281.1 / 257.3;
const S1_ISP_VAC = S1_ISP_SL * GLV1_RISE;

/** The record's instants (GLV-6's Table II-4, "GT-6A Flight Events Summary", from its telemetry). */
const BECO = 157.162;
const LIGHT = 157.829;
const STAGING = 157.844;
const SECO = 338.737;
const INSERTION = SECO + 20;
const SEPARATION = 360.9;
const FAIRINGS = SEPARATION + 15;
const HEIGHT_ADJUST = T(1, 34, 0);
const PHASE_ADJUST = T(2, 18, 0);
const PLANE_CHANGE = T(2, 45, 0);
const HEIGHT_ADJUST_2 = T(3, 4, 0);
const COELLIPTIC = T(3, 47, 0);
const TPI = 19_139;
const MIDCOURSE_1 = T(5, 32, 0);
const MIDCOURSE_2 = T(5, 44, 0);
const RETRO = T(25, 15, 58);
const EQUIPMENT = RETRO - 30;
const RETRO_GONE = RETRO + 45;
const LANDING = T(25, 51, 24);
/** Gemini VII's main parachute full to its landing, 3 min 30 s (its report's Figure 5.1.11-1), taken for this ship's. */
const LANDING_ATTITUDE = LANDING - 210;

/** The type's thrusters, lb; the heat shield's 90 in disc and the adapter's 120 in base, m². */
const AFT_LBF = 95;
const FORWARD_LBF = 79;
/** The aft-firing pair's push on spacecraft 6 at launch, ft/s²: how long each burn's impulse took. */
const AFT_PUSH = (2 * AFT_LBF * LBF) / (SC6_LAUNCH * LB) / FT;
const lasting = (ftPerS: number) => ftPerS / AFT_PUSH;
const SHIELD = Math.PI * (45 * IN) ** 2;
const BASE_DISC = Math.PI * (60 * IN) ** 2;
/** The orbit configuration's whole outside, in², as Gemini VII's orbital.ts works it (SEDR 300, Figure 2-3). */
const frustum = (r1: number, r2: number, h: number) => Math.PI * (r1 + r2) * Math.hypot(h, r1 - r2);
const OUTSIDE = frustum(60, 45, 90) + frustum(45, 15, 129) + Math.PI * 60 ** 2 + Math.PI * 15 ** 2;

export const orbital: GeminiTitanRecord = {
  liftoffMass: doc(
    LIFTOFF * LB,
    `342,472 lb at liftoff, "Trajectory LO weight": 269,308 lb of the first stage, 65,343 of the second and spacecraft 6's 7,821 (${GLV6}, Table II-10); 346,089 lb loaded. The stages' figures below are worked from the same table and sum to it`,
  ),
  titan: {
    first: {
      name: 'Titan first stage',
      nodes: ['TitanStage1', 'TitanStage1Engine', 'TitanInterstage'],
      mass: derived(
        STAGE1_GROSS * LB,
        `GLV-6 at liftoff (342,472 lb) less spacecraft 6 (7,821 lb) and the second stage (${STAGE2_GROSS.toLocaleString('en-US')} lb, below): ${STAGE1_GROSS.toLocaleString('en-US')} lb (${GLV6}, Table II-10). The table's own first stage is 269,308 lb: the second stage's 202 lb of fuel bleed and start losses are carried here, as the first stage's empty weight below carries them. The interstage goes with it`,
      ),
      dry: derived(
        STAGE1_DRY * LB,
        `the vehicle at the first stage's cutoff (84,928 lb) less at the second stage's start (72,962 lb): ${STAGE1_DRY.toLocaleString('en-US')} lb, the stage's own 11,775 at cutoff (11,611 at burnout, with 834 lb of outage) and what the second stage lost before it ran steady (${GLV6}, Table II-10)`,
      ),
      propellant: derived(
        (STAGE1_GROSS - STAGE1_DRY) * LB,
        `the stage at liftoff less as it was let go: ${(STAGE1_GROSS - STAGE1_DRY).toLocaleString('en-US')} lb; 257,533 lb consumed to cutoff by the table (${GLV6}, Table II-10). The stage burned 160.4 s from its start signal to oxidiser exhaustion (Summary)`,
      ),
      engine: {
        // (its two chambers on the one stage as one engine: a plan's engine count is its body's units, plan.ts `BodyDef.count`)
        name: 'Aerojet LR87-AJ-7 (two chambers)',
        count: 1,
        thrust: {
          seaLevel: assumed(
            S1_SL * LBF,
            `GLV-6's own as flown, corrected to standard inlet conditions at 55 s from its start, 427,396 lb (acceptance test 427,652; predicted 432,502: ${GLV6}, Table III-3), taken as the sea-level figure, as an acceptance test's is. The flight's average from liftoff to cutoff was 453,793 lb (Table III-2), between this and the vacuum figure below`,
          ),
          vacuum: derived(
            (S1_SL * S1_ISP_VAC * LBF) / S1_ISP_SL,
            `the sea-level figure at the vacuum specific impulse over the sea-level one (the same flow): ${Math.round((S1_SL * S1_ISP_VAC) / S1_ISP_SL).toLocaleString('en-US')} lb for the two`,
          ),
        },
        isp: {
          seaLevel: assumed(
            S1_ISP_SL,
            `GLV-6's at standard inlet conditions as flown, 260.02 s (acceptance test 260.15: ${GLV6}, Table III-3), taken as the sea-level figure`,
          ),
          vacuum: assumed(
            S1_ISP_VAC,
            `GLV-6's 260.02 s raised as GLV-1's rose from 5 s to 155 s, 257.3 to 281.1 s (${GI}, Table 5-II): ${S1_ISP_VAC.toFixed(2)} s. GLV-6's own flight average was 277.27 s (${GLV6}, Table III-2), between the two`,
          ),
        },
        nozzle: GLV_NOZZLES.first,
      },
      ignition: doc(
        0,
        `started on the pad, the start signal (87FS1) at -3.279 s and first motion at -0.109 s (${GLV6}, Table II-4): the run begins at release`,
      ),
      cutoff: doc(
        BECO,
        `87FS2, the first stage's shutdown and the second stage's start signal, at 157.162 s, planned 156.578 (${GLV6}, Table II-4)`,
      ),
    },
    second: {
      name: 'Titan second stage',
      nodes: ['TitanStage2', 'TitanStage2Engine'],
      mass: derived(
        STAGE2_GROSS * LB,
        `its weight 20 s after cutoff and what it burned, below: ${STAGE2_GROSS.toLocaleString('en-US')} lb, the table's "Stage II LO" (${GLV6}, Table II-10)`,
      ),
      dry: derived(
        STAGE2_DRY * LB,
        `the second stage 20 s after cutoff, 6,231 lb, less the 767 lb of usable propellant still in it ("Includes 767 lb of usable propellant"): ${STAGE2_DRY.toLocaleString('en-US')} lb, with 255 lb of outage (${GLV6}, Table II-10, notes 2 and 4). It could have burned the 767: the radio guidance cut it on the orbit, as the run's guidance does (gemini-titan-plan.ts), and GLV-6 could have carried 834 lb more than the spacecraft (II.B)`,
      ),
      propellant: derived(
        STAGE2_BURNED * LB,
        `what it could burn from the start of its steady burn: ${STAGE2_BURNED.toLocaleString('en-US')} lb, the 58,754 it burned to cutoff, the 136 of its shutdown (burned at full thrust here) and the 767 still usable 20 s after cutoff (${GLV6}, Table II-10). The run's guidance cuts it on the orbit, as the radio guidance did`,
      ),
      engine: {
        name: 'Aerojet LR91-AJ-7',
        count: 1,
        thrust: {
          vacuum: doc(101_334 * LBF, `GLV-6's flight average, 101,334 lb (predicted 101,954: ${GLV6}, Table III-8)`),
        },
        isp: { vacuum: doc(311.09, `GLV-6's flight average, 311.09 s (predicted 311.54: ${GLV6}, Table III-8)`) },
        nozzle: GLV_NOZZLES.second,
      },
      ignition: doc(
        LIGHT,
        `"Start PC3 rise", its chamber pressure rising, at 157.829 s, 0.667 s after the start signal against the nominal 0.70 (${GLV6}, Table II-4 and II.C): with the stages still joined`,
      ),
      cutoff: doc(SECO, `91FS2 at 338.737 s, the guidance's SECO at 338.717, planned 336.89 (${GLV6}, Table II-4)`),
    },
    staging: doc(
      STAGING,
      `"Stage separation" at 157.844 s, 0.015 s after the chamber pressure began to rise (${GLV6}, Table II-4 and II.C)`,
    ),
    hot: {
      open: estimated(
        0.5,
        'of the interstage’s side the second stage’s jet leaves through: its ring of exhaust ports, half open (the model’s; no figure read)',
      ),
      turn: estimated(30, 'degrees below the level the jet leaves the ports at: not read'),
      endures: estimated(5, 's at full thrust the first stage’s forward dome stands the jet: not read. Planned for, it stood the 0.015 s'),
    },
  },
  separation: {
    at: doc(
      SEPARATION,
      `spacecraft separation at 360.9 s (${GLV6}, Table II-4); IVAR at 360.187 by the ship's computer (IBM's post-flight analysis, Table 5)`,
    ),
    push: assumed(
      (10 * FT * (SC6_LAUNCH + STAGE2_DRY)) / STAGE2_DRY,
      `the planned 10 ft/s the spacecraft's thrusters add as it parts ("the spacecraft then separates from Stage II (adding 10 fps to spacecraft velocity in the process)": ${GLV6}, II.A.3), as the joint's push shared by the masses as every separation is (the empty second stage, 6,231 lb). How long the crew held them on is not read`,
    ),
    mass: derived(
      SC6_LAUNCH * LB,
      `spacecraft 6 at launch, 7,821 lb (${GLV6}, Table II-10; 7,817 in ${CHRONOLOGY}): what stayed on the launch vehicle at separation and the fairings thrown off after are not read`,
    ),
  },
  ascent: {
    guidance: {
      azimuth: doc(
        81.4,
        `81.4°, rolled to from the pad's 84.903° at 1.25 deg/s (${GLV6}, II.A.3; ${CHRONOLOGY}): the roll programme from 17.66 to 20.46 s (Table II-4). The radio guidance then steered the stage sideways into Gemini VII's plane, a "dog-leg" (${PLANNING}): the law here solves the plane for the inclination`,
      ),
      vertical: doc(22.99, `up the plumb line until "Start pitch program No. 1" at 22.99 s, planned 23.04 (${GLV6}, Table II-4)`),
      kick: estimated(
        15,
        's: the stored programme’s rates are known (−0.709, −0.516, −0.235 deg/s from 23.04, 88.32 and 119.04 s to 162.56: GLV-6’s Table II-3) but not flown as such; a pitch-over of fifteen seconds is ours',
      ),
      turn: estimated(
        BECO,
        's: the radio guidance’s closed loop flown as the law’s linear tangent from staging; the first stage’s programme before it. The radio guidance was enabled at 161.64 s and its first command came at 168.21 (GLV-6’s Table II-4)',
      ),
      target: {
        at: 'seco',
        altitude: derived(
          529_960 * FT,
          `529,960 ft 20 s after cutoff, the best estimate of the trajectory (${GLV6}, Table II-6), on a path 0.025° up, so the cutoff's to some 70 m. Its geocentric radius, 21,439,183 ft, less the height is 6,373.1 km, the ellipsoid's under the place, to a hundred metres: a geodetic height`,
        ),
        over: 'ellipsoid',
        climb: doc(0.025, `${GLV6}, Table II-6: +0.0250° by the best estimate of the trajectory 20 s after cutoff (Bermuda's +0.048)`),
        inclination: doc(28.97, `${CHRONOLOGY}: 28.97° (with the plane solved, a target)`),
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
    centre: estimated(0, 'the spacecraft’s centre of mass at the heat shield’s rim, Z103.44 (the model’s origin): not read'),
    sheds: [
      {
        on: 'staging-nuts',
        name: 'Titan first stage',
        from: doc(0, 'the first stage engines’ exit plane, station 1348.103 (titan-ii-glv.md)'),
        to: derived(STATION(500), 'the separation plane, station 500, with the interstage on it (titan-ii-glv.md)'),
        radius: doc(60 * IN, 'the 120 in tank (titan-ii-glv.md)'),
        mass: derived(STAGE1_DRY * LB, 'GLV-6’s as it was let go (as the plan’s, above)'),
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
        mass: derived(STAGE2_DRY * LB, 'GLV-6’s at 20 s after cutoff less the spacecraft (as the plan’s)'),
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
        mass: derived((SC6_LAUNCH - RETROGRADE) * LB, 'the spacecraft at launch less at retrofire (as the plan’s, below)'),
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
        value: 86.9 * NMI,
        unit: 'm',
        tolerance: 12_000,
        confidence: 'documented',
        source: `${CHRONOLOGY}: 86.9 nautical miles; 86.89 by GLV-6's evaluation (Table II-6)`,
      },
      {
        id: 'apogee',
        label: 'Apogee at cutoff',
        value: 140.0 * NMI,
        unit: 'm',
        tolerance: 25_000,
        confidence: 'documented',
        source: `${CHRONOLOGY}: 140.0 nautical miles (146 aimed for: ${GLV6}, II.A.3); 140.39 by GLV-6's evaluation (Table II-6)`,
      },
      { id: 'inclination', label: 'Inclination', value: 28.97, unit: '°', tolerance: 0.25, confidence: 'documented', source: CHRONOLOGY },
      {
        id: 'cutoffSpeed',
        label: 'Speed at cutoff, space-fixed',
        value: 25_718 * FT,
        unit: 'm/s',
        tolerance: 30,
        confidence: 'documented',
        source: `${GLV6}, Table II-6: 25,717 ft/s inertial 20 s after cutoff by the best estimate of the trajectory, 25,718.4 by Bermuda, with the second stage's shutdown impulse in it ("approximately 85 fps", II.A.3); predicted 25,731`,
      },
    ],
  },
  orbit: {
    over: {
      is: 'oblate',
      confidence: 'assumed',
      source: `the report family's final elements, as Gemini 3's and Gemini VII's are read (their orbital.ts): "Preliminary actual orbital elements were measured over a spherical earth, whereas the final actual and planned elements were measured over an oblate earth" (Gemini Program Mission Report, Gemini IV, section 4.3.1.2). ${CHRONOLOGY}'s rows are those reports' final elements; this flight's report is not found. The ellipsoid is WGS 84’s, not Fischer’s`,
    },
    perigee: doc(86.9 * NMI, `${CHRONOLOGY}: 86.9 nautical miles`),
    apogee: doc(140.0 * NMI, `${CHRONOLOGY}: 140.0 nautical miles`),
    inclination: doc(28.97, CHRONOLOGY),
    // (no period: SP-4002's 87.92 min cannot be the period of an orbit of 86.9 by 140.0 nautical miles, whose heights give
    // some 88.7; mission.md, "What disagrees". The mean orbit is the heights' over the ball: plan.ts `PlanRecord.orbit`)
  },
  injection: {
    at: doc(INSERTION, `20 s after cutoff, where the evaluation gives the insertion conditions (${GLV6}, Table II-6): 358.737 s`),
    heading: 'north',
    arc: derived(
      (538.5 * NMI) / 6_371_000 / (Math.PI / 180),
      `degrees: the ground range 20 s after cutoff, 538.5 nautical miles (${GLV6}, Table II-6, the best estimate of the trajectory), over the Earth's mean radius. Flying the ascent replaces it`,
    ),
    anomaly: derived(
      3.4,
      `degrees: from the flight-path angle 20 s after cutoff, +0.025° (${GLV6}, Table II-6), on the published orbit’s eccentricity, 0.0075: tan γ = e sin ν / (1 + e cos ν), so three degrees past perigee`,
    ),
  },
  mass: derived(
    SC6_LAUNCH * LB,
    `spacecraft 6 at launch, 7,821 lb (${GLV6}, Table II-10), taken for it in orbit: what it left on the launch vehicle and the fairings are not read`,
  ),
  rarefied: {
    drag: assumed(2.2, KING_HELE),
    area: estimated(
      (OUTSIDE / 4) * IN * IN,
      `m²: a quarter of the orbit configuration's whole outside, ${(OUTSIDE * IN * IN).toFixed(1)} m², which is what a convex body presents on the average over every way it can lie (Cauchy), as Gemini VII's: the ship was held on its target for six hours and drifted through the night that followed, as it lay not recorded. Held nose or tail first it would be the adapter's 7.30 m²`,
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
  // The rendezvous, burn by burn: the impulses the planners give (Lineberry, SP-121 paper 28), the instants the crew's account and the
  // computer's record give (On the Shoulders of Titans, pp. 286 to 287; IBM’s GT-6 rendezvous post-flight report); each flown along the attitude it was made in, as the
  // ship lay, and not solved on Gemini VII, which is not in this run. The terminal phase's burns were made along the line
  // to the target: here their forward parts as the computer displayed them, along the motion. Not flown: the braking from
  // 5:50:37 (41 ft/s of closing speed taken off along that line), the station keeping, and the separation from Gemini VII.
  moves: [
    {
      id: 'height-adjust',
      label: 'Height adjust at first perigee: the apogee raised',
      thrusters: 'aft',
      attitude: {
        label: 'Blunt end aft, along the motion',
        aim: 'velocity',
        sense: 1,
        confidence: 'documented',
        source: `"Schirra ignited the thrusters to speed up by 4 meters per second. The perigee remained the same, but the acceleration kicked the apogee up to 272 kilometers" (${TITANS}, p. 286)`,
      },
      turned: estimated(HEIGHT_ADJUST - 120, 'in its attitude two minutes before: not read'),
      on: doc(
        HEIGHT_ADJUST,
        `"Over New Orleans, after 94 minutes in space" (${TITANS}, p. 286): to the minute; "an hour and a half after insertion, at first perigee" (SP-4002, 15 December)`,
      ),
      off: derived(
        HEIGHT_ADJUST + lasting(14),
        `as long as 14 ft/s takes at the type's 2 x 95 lb on 7,821 lb: ${lasting(14).toFixed(1)} s. Its length is not read`,
      ),
      deltaV: doc(
        14 * FT,
        `"the height-adjustment maneuver at first perigee ... was 14 feet per second" (${PLANNING}, p. 280), against nought planned: the orbit was 23 nautical miles under the target at first apogee, not 15`,
      ),
    },
    {
      id: 'phase-adjust',
      label: 'Phase adjust at second apogee: the perigee raised',
      thrusters: 'aft',
      attitude: {
        label: 'Blunt end aft, along the motion',
        aim: 'velocity',
        sense: 1,
        confidence: 'documented',
        source: `"to raise the chase vehicle's perigee to 224 kilometers. He pressed the button to add 19 meters per second to his velocity" (${TITANS}, p. 286)`,
      },
      turned: estimated(PHASE_ADJUST - 120, 'in its attitude two minutes before: not read'),
      on: doc(PHASE_ADJUST, `"Near Carnarvon, at 2 hours 18 minutes ground elapsed time" (${TITANS}, p. 286): to the minute`),
      off: derived(
        PHASE_ADJUST + lasting(61),
        `as long as 61 ft/s takes at the type's thrust on 7,821 lb: ${lasting(61).toFixed(1)} s. Its length is not read`,
      ),
      deltaV: doc(61 * FT, `"the prelaunch nominal value of 53 feet per second was changed to 61 feet per second" (${PLANNING}, p. 280)`),
    },
    {
      id: 'plane-change',
      label: 'Plane change: into Gemini VII’s plane',
      thrusters: 'aft',
      attitude: {
        label: 'Yawed 90° right, to the south',
        aim: 'normal',
        sense: -1,
        confidence: 'documented',
        source: `"Schirra turned his spacecraft 90 degrees to the right (southward) and ignited the thrusters to push Gemini VI-A into the same plane as Gemini VII" (${TITANS}, p. 286): the push against the orbit's normal`,
      },
      turned: estimated(PLANE_CHANGE - 120, 'in its attitude two minutes before: not read'),
      on: estimated(
        PLANE_CHANGE,
        `"less than half an hour later" than the phase adjustment (${TITANS}, p. 286), "at a common node following the phase-adjustment maneuver" (${PLANNING}, p. 280): taken as 2:45:00`,
      ),
      off: derived(PLANE_CHANGE + lasting(34), `as long as 34 ft/s takes at the type's thrust on 7,821 lb: ${lasting(34).toFixed(1)} s`),
      deltaV: doc(34 * FT, `"a plane change of 34 feet per second" (${PLANNING}, p. 281)`),
    },
    {
      id: 'height-adjust-2',
      label: 'Second height adjust at second perigee',
      thrusters: 'aft',
      attitude: {
        label: 'Blunt end aft, along the motion',
        aim: 'velocity',
        sense: 1,
        confidence: 'estimated',
        source: 'which way is not read: along the motion, as the first',
      },
      turned: estimated(HEIGHT_ADJUST_2 - 120, 'in its attitude two minutes before: not read'),
      on: estimated(HEIGHT_ADJUST_2, 'at the second perigee, about a revolution after the first height adjustment: not read'),
      off: derived(HEIGHT_ADJUST_2 + lasting(0.8), `as long as 0.8 ft/s takes at the type's thrust: ${lasting(0.8).toFixed(1)} s`),
      deltaV: doc(0.8 * FT, `"the second height-adjustment maneuver of 0.8 foot per second" (${PLANNING}, p. 281)`),
    },
    {
      id: 'coelliptic',
      label: 'Coelliptic burn at third apogee: 15 nautical miles under the target',
      thrusters: 'aft',
      attitude: {
        label: 'Blunt end aft, along the motion',
        aim: 'velocity',
        sense: 1,
        confidence: 'documented',
        source: `"the aft thrusters fired for 54 seconds to add 13 meters per second to Gemini VI's speed" (${TITANS}, p. 287)`,
      },
      turned: estimated(COELLIPTIC - 120, 'in its attitude two minutes before: not read'),
      on: doc(
        COELLIPTIC,
        `"Over Carnarvon, at 3 hours 47 minutes" (${TITANS}, p. 287; SP-4002, 15 December): to the minute. The computer's catch-up mode was started at 13,621 s (${IBM6})`,
      ),
      off: doc(COELLIPTIC + 54, `"fired for 54 seconds" (${TITANS}, p. 287)`),
      deltaV: doc(
        43 * FT,
        `"a coelliptical maneuver of 43 feet per second" (${PLANNING}, p. 281); the computer displayed 42 forward, 1 and 1 (${IBM6})`,
      ),
    },
    {
      id: 'terminal-phase',
      label: 'Terminal phase initiation: toward Gemini VII',
      thrusters: 'aft',
      attitude: {
        label: 'Nose on the target, taken as along the motion',
        aim: 'velocity',
        sense: 1,
        confidence: 'estimated',
        source: `"thrust directly toward Spacecraft 7" (${TITANS}, p. 287), along the line of sight, which was ahead and above: taken as along the motion. The line itself is not flown`,
      },
      turned: estimated(TPI - 120, 'on the target two minutes before: the crew tracked it through the burn'),
      on: doc(
        TPI,
        `"TPI at 19,139 seconds elapsed time" (${IBM6}), 5:18:59; the catch-up lasted "until 5 hours 16 minutes" (${TITANS}, p. 287)`,
      ),
      off: derived(TPI + lasting(31), `as long as 31 ft/s takes at the type's thrust: ${lasting(31).toFixed(1)} s`),
      deltaV: doc(
        31 * FT,
        `the computer's display before the burn, 31 ft/s forward, 1 and -7 the other ways (${IBM6}, Table III, the flight's own record): the forward part flown`,
      ),
    },
    {
      id: 'midcourse-1',
      label: 'First midcourse correction',
      thrusters: 'aft',
      attitude: {
        label: 'Nose on the target, taken as along the motion',
        aim: 'velocity',
        sense: 1,
        confidence: 'estimated',
        source: 'along the line of sight, as the terminal phase’s: taken as along the motion',
      },
      turned: estimated(MIDCOURSE_1 - 60, 'on the target from the terminal phase on'),
      on: doc(
        MIDCOURSE_1,
        `"two midcourse corrections spaced 12 minutes apart (at 5 hours 32 minutes and 5 hours 44 minutes)" (${TITANS}, p. 287): to the minute`,
      ),
      off: derived(MIDCOURSE_1 + lasting(7), `as long as 7 ft/s takes at the type's thrust: ${lasting(7).toFixed(1)} s`),
      deltaV: doc(
        7 * FT,
        `the computer's first vernier display, 7 ft/s forward, -5 and -7 the other ways (${IBM6}, Table III): the forward part flown`,
      ),
    },
    {
      id: 'midcourse-2',
      label: 'Second midcourse correction',
      thrusters: 'aft',
      attitude: {
        label: 'Nose on the target, taken as along the motion',
        aim: 'velocity',
        sense: 1,
        confidence: 'estimated',
        source: 'along the line of sight, as the terminal phase’s: taken as along the motion',
      },
      turned: estimated(MIDCOURSE_2 - 60, 'on the target from the terminal phase on'),
      on: doc(MIDCOURSE_2, `"at 5 hours 44 minutes" (${TITANS}, p. 287): to the minute`),
      off: derived(MIDCOURSE_2 + lasting(4), `as long as 4 ft/s takes at the type's thrust: ${lasting(4).toFixed(1)} s`),
      deltaV: doc(
        4 * FT,
        `the computer's second vernier display, 4 ft/s forward, 6 and -2 the other ways (${IBM6}, Table III): the forward part flown`,
      ),
    },
  ],
  adapter: {
    equipment: {
      mass: assumed(
        (SC6_LAUNCH - RETROGRADE) * LB,
        `spacecraft 6 at launch (7,821 lb) less spacecraft 7 at retrofire (5,648.73 lb: ${GVII}, 3.3): ${(SC6_LAUNCH - RETROGRADE).toFixed(0)} lb. Spacecraft 6 flew on batteries, not fuel cells, and its own weights are in its report, not found`,
      ),
      gone: assumed(
        EQUIPMENT,
        `30 s before retrofire, the type's sequence (${SP121}, Figure 3-3, p. 17): Schirra "jettisoned the equipment section; retrofire followed automatically" (${TITANS}, p. 291)`,
      ),
    },
    retro: {
      mass: assumed(
        (RETROGRADE - REENTRY) * LB,
        `spacecraft 7 at retrofire less at 0.05 g (${GVII}, 3.3): ${(RETROGRADE - REENTRY).toFixed(1)} lb, the section with its four rockets unfired`,
      ),
    },
  },
  retro: {
    sequence: estimated(RETRO - 60, 'a minute before retrofire: when the crew had it in retrofire attitude is not read'),
    below: assumed(
      (Math.atan2(111.8, 298.1) * 180) / Math.PI,
      `degrees: Gemini VII's, the push its velocity indicator read after retrofire, 298.1 ft/s aft and 111.8 down (${GVII}, Table 5.1.8-III), taken for this ship's`,
    ),
    on: doc(RETRO, `25:15:58 (${CHRONOLOGY}); the state at retrofire is at 14:53:24 G.m.t. on 16 December, 25:15:57.5 (${IGS6}, Table 8)`),
    spacing: assumed(5.5, `"fired at 5.5 second intervals in 1-2-3-4 order", the type's (${SEDR}, Section XI, p. 11-73)`),
    count: 4,
    thrust: assumed(2_490 * LBF, `2,490 lb each, the type's (${SP121}, Table 4-I, p. 29)`),
    burn: assumed(5.5, '5.5 s each, the type’s (NASA release 65-81, p. 8)'),
    deltaV: assumed(
      318.5 * FT,
      `Gemini VII's, 318.5 ft/s on its velocity indicator, on a ship of 5,658 lb (${GVII}, Table 5.1.8-III): this ship's own is in its report, not found`,
    ),
    gone: assumed(RETRO_GONE, `45 s after retrofire, when the type's sequence lights the jettison switch (${SP121}, Figure 3-3): not read`),
  },
  entry: {
    mass: assumed(REENTRY * LB, `spacecraft 7's re-entry module at 0.05 g, 4,824.33 lb (${GVII}, 3.3): spacecraft 6's own not found`),
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
      source: `lift over drag as flown, at every Mach number: the programme's, "flown with an average lift-to-drag ratio of approximately 0.19" (${SP138}, p. 159), taken for spacecraft 6`,
    },
    predicted: derived(
      0.19 / 0.65,
      `the lift over drag the wind tunnels had given, said and not flown: "a decrease of approximately 35 percent in the lift-to-drag ratio" (${SP138}, p. 163), from the 0.19 flown: 0.29`,
    ),
    trim: assumed(8.5, '"8° to 9°" at the greatest heating on GT-3 (Gemini Program Mission Report, Gemini IV, p. 5-3): the type’s, taken'),
    bank: estimated(
      -55,
      `degrees, to the left: "Schirra set the bank angle at 55 degrees left and held it until computer guidance took over at 85 000 meters ... This had to be countered by banking first left, then right" (${TITANS}, p. 291). The computer's commands after are not read: the 55° is held throughout here`,
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
    mass: assumed(
      MAIN_DEPLOY * LB,
      `spacecraft 7's re-entry module at the main parachute's deployment, 4,427.95 lb (${GVII}, 3.3): taken from the drogue on`,
    ),
    drogue: {
      altitude: doc(14_000, `"deployed the drogue parachute at 14 000 meters" (${TITANS}, p. 291: a conversion, the feet not given)`),
      dragArea: estimated(
        0.5 * Math.PI * ((8.3 / 2) * FT) ** 2,
        `an 8.3 ft conical ribbon drogue (${CR1106}, p. 218) at a drag coefficient of 0.5, the usual figure for the type: no measured figure found`,
      ),
      fills: derived(16, `its two 16 s reefing cutters (${CR1106}, p. 218): full at 16 s`),
    },
    main: {
      altitude: doc(
        3_200,
        `"punched out the main parachute at 3200 meters" (${TITANS}, p. 291: a conversion); the type's PARA switch at 10,600 ft (${SEDR}, pp. 4-22 and 4-23)`,
      ),
      dragArea: derived(
        (2 * 4_400 * LB * 9.80665) / (1.225 * (31.6 * FT) ** 2),
        `the 84.2 ft ringsail's (${CR1106}, p. 222): "a mean descent rate of 31.6 fps" for a module of 4,400 lb, at sea level: 344 m²`,
      ),
      fills: assumed(13, `Gemini VII's, deployed at 330:31:05 and full at 330:31:18 (${GVII}, Figure 5.1.11-1)`),
    },
    checks: [
      {
        id: 'reentry-module.at',
        label: 'Landing',
        value: LANDING,
        unit: 's',
        tolerance: 60,
        confidence: 'documented',
        source: `${CHRONOLOGY}: 25:51:24`,
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
      'Schirra and Stafford landed in the ship, as Gemini was built to, and stayed in it while the Wasp hoisted it aboard: the ejection seats were for the pad, the climb and below 15,000 ft, and were not used',
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
        'The retrofire’s instant was worked on the ground for the planned landing point from tracking, as on every Gemini flight; the ship came down 7 nautical miles from it (SP-4002), so the place it came down is taken for the place its burn was timed for',
    },
    latitude: doc(
      23 + 35 / 60,
      `${CHRONOLOGY}: 23°35′ N 67°50′ W, 7 nautical miles from the planned point. The ship's navigation had 23.70° N 67.74° W and the recovery ship 23.375° N 67.875° W, the target 23.61° N 67.83° W (${IGS6}, Table 9, from its text layer)`,
    ),
    longitude: doc(-(67 + 50 / 60), CHRONOLOGY),
    at: doc(LANDING, `${CHRONOLOGY}: 25:51:24`),
    near: 'the western Atlantic, north of Hispaniola',
  },
  events: [
    { id: 'liftoff', label: 'Liftoff', at: doc(0, `${GLV6}, Table II-4: 13:37:26.471 G.m.t.; ${IGS6}, p. 2-6`) },
    { id: 'beco', label: 'First stage cutoff', at: doc(BECO, `${GLV6}, Table II-4`), also: 'planned 156.578' },
    { id: 'pc-rise', label: 'The second stage lit: its chamber pressure rising', at: doc(LIGHT, `${GLV6}, Table II-4`) },
    { id: 'stage-separation', label: 'The stages part', at: doc(STAGING, `${GLV6}, Table II-4`) },
    { id: 'seco', label: 'Second stage cutoff', at: doc(SECO, `${GLV6}, Table II-4`), also: 'planned 336.89' },
    { id: 'insertion', label: 'Insertion: 25,717 ft/s', at: doc(INSERTION, `${GLV6}, Table II-6`) },
    { id: 'spacecraft-separation', label: 'Spacecraft separation', at: doc(SEPARATION, `${GLV6}, Table II-4`) },
    {
      id: 'fairings',
      label: 'Nose and scanner fairings off',
      at: estimated(FAIRINGS, 'not read: taken as 15 s after the separation, as Gemini VII’s'),
    },
    { id: 'height-adjust', label: 'Height adjust', at: doc(HEIGHT_ADJUST, `${TITANS}, p. 286`) },
    { id: 'phase-adjust', label: 'Phase adjust', at: doc(PHASE_ADJUST, `${TITANS}, p. 286`) },
    { id: 'plane-change', label: 'Plane change (about)', at: estimated(PLANE_CHANGE, `${TITANS}, p. 286: "less than half an hour later"`) },
    { id: 'height-adjust-2', label: 'Second height adjust (about)', at: estimated(HEIGHT_ADJUST_2, 'at the second perigee') },
    {
      id: 'radar-contact',
      label: 'Radar contact with Gemini VII expected',
      at: doc(
        T(3, 15, 0),
        `"Three hours 15 minutes into the mission, Elliot See told Schirra that radar contact should soon be possible" (${TITANS}, p. 287); lock-on at 232 nautical miles (SP-121, paper 29)`,
      ),
    },
    { id: 'coelliptic', label: 'Coelliptic burn', at: doc(COELLIPTIC, `${TITANS}, p. 287`) },
    { id: 'terminal-phase', label: 'Terminal phase initiation', at: doc(TPI, IBM6) },
    { id: 'midcourse-1', label: 'First midcourse correction', at: doc(MIDCOURSE_1, `${TITANS}, p. 287`) },
    { id: 'midcourse-2', label: 'Second midcourse correction', at: doc(MIDCOURSE_2, `${TITANS}, p. 287`) },
    {
      id: 'braking-on-gemini-vii',
      label: 'Braking, about 3,000 ft from Gemini VII: not flown',
      at: derived(
        T(263, 58, 0) - T(258, 7, 22.77),
        `"accomplished at 263:58" on Gemini VII's clock (${GVII}, 1.0), whose liftoff this was at 258:07:22.77 (4.1): 5:50:37`,
      ),
    },
    {
      id: 'station-keeping',
      label: 'Stopped 120 ft from Gemini VII: station keeping, not flown',
      at: doc(T(5, 56, 0), `SP-4002, Appendix 1, Table B; 2:33 p.m. e.s.t. (${TITANS}, p. 287)`),
    },
    { id: 'retrofire', label: 'Retrofire', at: doc(RETRO, CHRONOLOGY) },
    {
      id: 'landing-attitude',
      label: 'Two-point suspension: repositioned for the landing',
      at: estimated(LANDING_ATTITUDE, 'not read: three and a half minutes before landing, as on Gemini VII'),
    },
    { id: 'splashdown', label: 'Landing', at: doc(LANDING, CHRONOLOGY) },
  ],
  checks: [
    {
      id: 'after-6600.apogee',
      label: 'Apogee after the height adjust',
      value: 272_000,
      unit: 'm',
      tolerance: 6_000,
      confidence: 'documented',
      source: `"the acceleration kicked the apogee up to 272 kilometers" (${TITANS}, p. 286: a conversion). Read at 1:50:00`,
    },
    {
      id: 'after-14100.perigee',
      label: 'Perigee after the coelliptic burn',
      value: 270_000,
      unit: 'm',
      tolerance: 6_000,
      confidence: 'documented',
      source: `"The result was almost a circle, measuring 270 by 274 kilometers" (${TITANS}, p. 287: a conversion). Read at 3:55:00`,
    },
    {
      id: 'after-14100.apogee',
      label: 'Apogee after the coelliptic burn',
      value: 274_000,
      unit: 'm',
      tolerance: 6_000,
      confidence: 'documented',
      source: `"270 by 274 kilometers" (${TITANS}, p. 287). Read at 3:55:00`,
    },
    {
      id: 'after-90600.perigee',
      label: 'Perigee before retrofire',
      value: 153.0 * NMI,
      unit: 'm',
      tolerance: 6_000,
      confidence: 'documented',
      source: `${CHRONOLOGY}, "At retrofire", revolution 16: 153.0 nautical miles. Read at 25:10:00`,
    },
    {
      id: 'after-90600.apogee',
      label: 'Apogee before retrofire',
      value: 168.1 * NMI,
      unit: 'm',
      tolerance: 6_000,
      confidence: 'documented',
      source: `${CHRONOLOGY}, "At retrofire": 168.1 nautical miles, 90.54 min, 28.89°. Read at 25:10:00`,
    },
    {
      id: 'alongTrack',
      label: 'Drogue out, along the track from where it landed',
      value: 0,
      unit: 'm',
      tolerance: 40_000,
      confidence: 'documented',
      source: `${CHRONOLOGY}: it landed at 23°35′ N 67°50′ W; the drogue comes out a few kilometres short of where it lands`,
    },
    {
      id: 'crossTrack',
      label: 'Drogue out, to the right of where it landed',
      value: 0,
      unit: 'm',
      tolerance: 25_000,
      confidence: 'documented',
      source: CHRONOLOGY,
    },
  ],
};

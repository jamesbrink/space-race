/**
 * Gemini-Titan 9A as a flight into orbit: its record (vehicles/gemini-titan-plan.ts `GeminiTitanRecord`), which flight.ts
 * writes its plan from (`geminiTitanPlan`). The record with its sources and disagreements is set out in mission.md beside
 * this file; the numbers live here, each in the source's own units and converted once.
 *
 * Times are seconds from liftoff, 13:39:33.335 UTC, 3 June 1966. The checks' tolerances were written with the record,
 * before the plan was first flown, and nothing here was changed after: a miss is recorded (src/sim/misses.ts), not fitted.
 * The mission report (MSC-G-R-66-6) has this flight's own weights, engines, sequence, manoeuvres, orbits and entry, read
 * in its text layer and on the page; what it lacks (the separation speeds of the adapter's sections, the parachutes'
 * sizes, the retrorockets one by one) is the type's, and says so.
 *
 * The Augmented Target Docking Adapter it went up to meet is the flight's target (`target`): the report's final tracking
 * vector at its insertion, two days before, flown on from there on gravity and the air (sim/plan.ts `TargetDef` `orbit`).
 * The ATDA's shroud had not come off, so there was no docking: the ship made three rendezvous with it of three kinds. The
 * coelliptic burns, the terminal phases, their corrections and the brakings are made on the ATDA, solved as each lights;
 * the burns that set each one up (the phase and corrective burns of the first, the radial separation of the equi-period
 * one, the separation, phase and height burns of the one from above) are flown at the record's instants and impulses, as
 * are the last separation, the orbit shaping and the retrofire. The walk outside is not flown.
 */
import { assumed, derived, doc, estimated } from '../../../../../src/measure.ts';
import { targetFix } from '../../vehicles/gemini-targets.ts';
import { CHRONOLOGY, GLV_NOZZLES, SEDR } from '../../vehicles/gemini-titan.ts';
import type { GeminiTitanRecord } from '../../vehicles/gemini-titan-plan.ts';

const IN = 0.0254;
const FT = 0.3048;
const LB = 0.45359237;
const LBF = 4.4482216;
const NMI = 1852;

/** Seconds from liftoff of a ground elapsed time, hours, minutes and seconds. */
const T = (h: number, m: number, s: number): number => h * 3600 + m * 60 + s;

const GIXA = 'Gemini Program Mission Report, Gemini IX-A (MSC-G-R-66-6)';
const SP121 = 'Gemini Midprogram Conference (NASA SP-121, 1966)';
const SP138 = 'Gemini Summary Conference (NASA SP-138, 1967)';
const GI = 'Gemini Program Mission Report GT-1 (NTRS 19670095753)';
const CR1106 = 'Project Gemini: A Technical Summary (Malik and Souris, NASA CR-1106, 1968)';
const KING_HELE =
  '“a value of 2.2 is recommended for perigee heights of 150-400 km”, on the cross-section square to the motion (King-Hele, The Prediction of Satellite Lifetimes, RAE TR 87030, 1987, §9.1, after Cook 1965): a satellite’s, as Vostok’s and Mercury’s (vostok-3ka.ts SHIP_RAREFIED). Nothing published for Gemini';

/**
 * The ATDA at its insertion, as the report's tracking had it (Table 4.3-V, the final vector), on this flight's clock: the
 * Atlas lifted it off 1 day 22 h 39 min 30.972 s before the Titan (Tables 4.2-I and 4.2-III). The flight's target is flown
 * from it (`target`), and the docking chapter starts from it (flight.ts `docking.fixes`).
 */
export const INSERTION = targetFix(
  GIXA + ', table 4.3-V, final insertion',
  -167970.972,
  383.41,
  29.03,
  -69.55,
  979526,
  25369,
  -0.01,
  89.81,
);

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

// GLV-9's weights with spacecraft 9 aboard (the mission report, 3.3, "obtained from GLV contractor", read on the page): at
// liftoff, at the first stage's burnout, at the second stage's start of steady-state combustion, at its cutoff; and
// spacecraft 9 at launch.
const LIFTOFF = 340_732;
const BECO_WT = 86_224;
const STAGE2_STEADY = 74_509;
const SECO_WT = 14_222;
const SC9_LAUNCH = 8_268;
/** What the second stage burned after its cutoff, lb: its shutdown impulse, 35,422 lb-s (5.2.2.1.2), at its specific impulse. */
const SHUTDOWN = 35_422 / 312.39;
/**
 * The usable propellant still in the second stage at its cutoff, lb: "the achieved vehicle performance was equivalent to
 * 8881 pounds, 613 pounds over the spacecraft weight" (5.2), and "The amount of propellants remaining at Stage II engine
 * shutdown could have sustained Stage II flight an additional 1.71 seconds" (5.2.2.2.2): the margin is taken for it, as
 * Gemini-Titan 12's is.
 */
const RESERVE = 613;
const STAGE2_DRY = SECO_WT - SHUTDOWN - RESERVE - SC9_LAUNCH;
const STAGE2_BURNED = STAGE2_STEADY - SECO_WT + SHUTDOWN + RESERVE;
const STAGE1_DRY = BECO_WT - STAGE2_STEADY;
const STAGE2_GROSS = STAGE2_DRY + STAGE2_BURNED;
const STAGE1_GROSS = LIFTOFF - SC9_LAUNCH - STAGE2_GROSS;
// Spacecraft 9's weights through its descent (3.3): at retrofire (the equipment section gone), at 0.05 g (the retrograde
// section gone), at the main parachute's deployment.
const RETROGRADE = 5_635;
const REENTRY = 4_874;
const MAIN_DEPLOY = 4_475;

/** The first stage's two chambers at standard inlet conditions, postflight reconstructed (Table 5.2.2-I, read on the page). */
const S1_SL = 435_631;
const S1_ISP_SL = 259.97;
/** GLV-1's specific impulse at 155 s over its figure at 5 s (GT-1 report, Table 5-II): how far the type's rose with height. */
const GLV1_RISE = 281.1 / 257.3;
const S1_ISP_VAC = S1_ISP_SL * GLV1_RISE;

/** The record's instants (Tables 4.2-I and 4.2-II, read on the page; the manoeuvres' to the tenth from Table 5.1.5-VI). */
const BECO = 152.49;
const STAGING = 153.23;
/** The second stage's chamber pressure rising: GLV-6's stages parted 0.015 s after it (Launch Vehicle No. 6 Flight Evaluation, II.C). */
const LIGHT = STAGING - 0.015;
const SECO = 339.79;
const SEPARATION = 366.72;
/** The thrusters off for the last time after the separation and the insertion velocity adjustment (Table 4.2-I, note a). */
const INSERTED = 436.4;
const FAIRINGS = SEPARATION + 15;
// the first rendezvous, in the third revolution
const PHASE_ADJUST = T(0, 49, 3.3);
const CORRECTIVE = T(1, 55, 17.4);
const COELLIPTIC = T(2, 24, 51.7);
const TPI = T(3, 36, 2.2);
const MIDCOURSE = [T(3, 48, 35.4), T(4, 0, 26.8)];
const BRAKING = T(4, 6, 8.2);
/** When the first terminal phase's transfer was to bring the ship to the ATDA: the ground's commanded TPF (Table 4.3-III). */
const INTERCEPT = T(4, 7, 59);
// the second, equi-period
const RADIAL = T(5, 0, 59.8);
const TPI_2 = T(6, 15, 11.9);
const MIDCOURSE_2 = [T(6, 20, 19.7), T(6, 26, 58.8), T(6, 28, 33.8)];
const BRAKING_2 = T(6, 29, 26.4);
/** The braking the latest figures sent the crew had for the equi-period rendezvous (Table 4.2-II, planned). */
const INTERCEPT_2 = T(6, 33, 58);
// the third, from above
const PARTING = T(7, 14, 58);
const PHASE_ADJUST_3 = T(18, 23, 19);
const HEIGHT_ADJUST = T(19, 8, 16);
const COELLIPTIC_3 = T(19, 54, 24);
const TPI_3 = T(21, 2, 27.5);
const MIDCOURSE_3 = [T(21, 14, 36), T(21, 26, 36)];
/** The ground's TPI and TPF for the rendezvous from above, 20:55:28 and 21:27:57 (Table 4.3-III, ground commanded). */
const GROUND_TPI_3 = T(20, 55, 28);
const GROUND_TPF_3 = T(21, 27, 57);
/** The crew's transfer arriving as long after their TPI as the ground's TPF was after its TPI. */
const INTERCEPT_3 = TPI_3 + (GROUND_TPF_3 - GROUND_TPI_3);
const STATION_3 = T(21, 42, 0);
const LAST_PARTING = T(22, 59, 0);
const SHAPING = T(53, 41, 35);
const EQUIPMENT = T(71, 45, 50);
const RETRO = T(71, 46, 43.7);
const RETRO_GONE = RETRO + 45;
const ENTRY_400K = T(72, 6, 27.84);
const DROGUE = T(72, 15, 47.9);
const MAIN = T(72, 17, 13.5);
const LANDING_ATTITUDE = T(72, 18, 22.8);
const LANDING = T(72, 20, 50);

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

/** The retrofire's push as the guidance system measured it (Table 5.1.5-VI), ft/s: its along-track and vertical parts. */
const RETRO_AFT = 295.9;
const RETRO_DOWN = 125.2;

/**
 * A manoeuvre's attitude from its measured components (Table 5.1.5-VI, the inertial guidance system's, taken in Gemini
 * XII's report's convention, which this report does not restate: "V_X is positive in the direction of motion, V_Y is
 * positive towards the center of the earth, and V_Z is positive to the left of the orbit path"), ft/s: the nose along the
 * push for the aft-firing pair, against it for the forward-firing, as an aim along the motion turned in the level (`yaw`,
 * to the left) and pitched below it (`below`).
 */
const aimed = (thrusters: 'aft' | 'forward', [forward, down, left]: readonly [number, number, number], from = 'Table 5.1.5-VI') => {
  const k = thrusters === 'aft' ? 1 : -1;
  const [x, y, z] = [k * forward, k * left, -k * down];
  const why = `from the push the guidance system measured, ${forward} ft/s forward, ${down} down and ${left} left (${GIXA}, ${from}), the nose ${thrusters === 'aft' ? 'along it, the aft-firing pair pushing toward the nose' : 'against it, the forward-firing pair pushing toward the tail'}`;
  return {
    yaw: derived((Math.atan2(y, x) * 180) / Math.PI, `degrees to the left of the motion, ${why}`),
    below: derived((-Math.atan2(z, Math.hypot(x, y)) * 180) / Math.PI, `degrees below the level, ${why}`),
  };
};

/** The orbit read at an instant after a manoeuvre (gemini-titan-plan.ts: `after-<s>.<perigee|apogee>`), nautical miles over the Fischer ellipsoid. */
const orbitAfter = (at: number, after: string, perigee: number, apogee: number, where: string) =>
  (
    [
      ['perigee', perigee],
      ['apogee', apogee],
    ] as const
  ).map(([which, nmi]) => ({
    id: `after-${at}.${which}` as const,
    label: `${which === 'perigee' ? 'Perigee' : 'Apogee'} after ${after}`,
    value: nmi * NMI,
    unit: 'm',
    tolerance: 6_000,
    confidence: 'documented' as const,
    source: `${GIXA}, ${where}: ${nmi} nautical miles. Read at ${new Date(at * 1000).toISOString().slice(11, 19)}`,
  }));
/** The impulse a manoeuvre gave (`<id>.velocity`, orbital.ts `OrbitResults`), ft/s, and how near. */
const impulse = (id: string, label: string, fps: number, within: number, where: string) => ({
  id: `${id}.velocity` as const,
  label,
  value: fps * FT,
  unit: 'm/s',
  tolerance: within * FT,
  confidence: 'documented' as const,
  source: `${GIXA}, ${where}: ${fps} ft/s`,
});
/** How far the Agena was at an instant (gemini-titan-plan.ts: `at-<s>.range`), m. */
const sighting = (at: number, label: string, value: number, within: number, where: string) => ({
  id: `at-${at}.range` as const,
  label,
  value,
  unit: 'm',
  tolerance: within,
  confidence: 'documented' as const,
  source: `${GIXA}, ${where}`,
});

export const orbital: GeminiTitanRecord = {
  liftoffMass: doc(
    LIFTOFF * LB,
    `340,732 lb at liftoff with spacecraft 9 (${GIXA}, 3.3); 344,225 lb at the first stage's ignition. The stages' figures below are worked from the same table and sum to it`,
  ),
  titan: {
    first: {
      name: 'Titan first stage',
      nodes: ['TitanStage1', 'TitanStage1Engine', 'TitanInterstage'],
      mass: derived(
        STAGE1_GROSS * LB,
        `GLV-9 at liftoff (340,732 lb) less spacecraft 9 (8,268 lb) and the second stage (${STAGE2_GROSS.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb, below): ${STAGE1_GROSS.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb (${GIXA}, 3.3). The interstage goes with it`,
      ),
      dry: derived(
        STAGE1_DRY * LB,
        `the vehicle at the first stage's burnout (86,224 lb) less at the second stage's start of steady-state combustion (74,509 lb): ${STAGE1_DRY.toLocaleString('en-US')} lb with what was left in its tanks (${GIXA}, 3.3), 664 lb of usable oxidiser among it (5.2.2.2.2)`,
      ),
      propellant: derived(
        (STAGE1_GROSS - STAGE1_DRY) * LB,
        `the stage at liftoff less as it was let go: ${(STAGE1_GROSS - STAGE1_DRY).toLocaleString('en-US', { maximumFractionDigits: 0 })} lb burned from liftoff (${GIXA}, 3.3); "This off-nominal condition led to a fuel-depletion shutdown" (5.2.2.1.1)`,
      ),
      engine: {
        // (its two chambers on the one stage as one engine: a plan's engine count is its body's units, plan.ts `BodyDef.count`)
        name: 'Aerojet LR87-AJ-7 (two chambers)',
        count: 1,
        thrust: {
          seaLevel: assumed(
            S1_SL * LBF,
            `GLV-9's own, postflight reconstructed at standard inlet conditions, 435,631 lb (predicted 435,450: ${GIXA}, Table 5.2.2-I, read on the page), taken as the sea-level figure, as an acceptance test's is (GLV-6's at standard inlet, 427,396 lb, is within 0.1 per cent of its acceptance test: Launch Vehicle No. 6 Flight Evaluation, Table III-3). The flight's average, 461,137 lb, lies between this and the vacuum figure below`,
          ),
          vacuum: derived(
            (S1_SL * S1_ISP_VAC * LBF) / S1_ISP_SL,
            `the sea-level figure at the vacuum specific impulse over the sea-level one (the same flow): ${Math.round((S1_SL * S1_ISP_VAC) / S1_ISP_SL).toLocaleString('en-US')} lb for the two`,
          ),
        },
        isp: {
          seaLevel: assumed(
            S1_ISP_SL,
            `GLV-9's at standard inlet conditions, 259.97 s (predicted 259.54: ${GIXA}, Table 5.2.2-I), taken as the sea-level figure`,
          ),
          vacuum: assumed(
            S1_ISP_VAC,
            `GLV-9's 259.97 s raised as GLV-1's rose from 5 s to 155 s, 257.3 to 281.1 s (${GI}, Table 5-II): ${S1_ISP_VAC.toFixed(2)} s. GLV-9's own flight average was 276.95 s (${GIXA}, Table 5.2.2-I), between the two`,
          ),
        },
        nozzle: GLV_NOZZLES.first,
      },
      ignition: doc(0, `started on the pad, the ignition signal (87FS1) at -3.14 s (${GIXA}, Table 4.2-I): the run begins at release`),
      cutoff: doc(BECO, `87FS2, stage I engine shutdown, at 152.49 s, planned 151.65 (${GIXA}, Table 4.2-I, read on the page)`),
    },
    second: {
      name: 'Titan second stage',
      nodes: ['TitanStage2', 'TitanStage2Engine'],
      mass: derived(
        STAGE2_GROSS * LB,
        `its weight at cutoff and what it burned, below: ${STAGE2_GROSS.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb (${GIXA}, 3.3)`,
      ),
      dry: assumed(
        STAGE2_DRY * LB,
        `the vehicle at the second stage's cutoff (14,222 lb) less spacecraft 9 (8,268 lb), what the engine burned after its cutoff signal (its shutdown impulse of 35,422 lb-s at 312.39 s, ${SHUTDOWN.toFixed(0)} lb, burned at full thrust here) and the usable propellant it still held, taken as the vehicle's achieved performance over the spacecraft, 613 lb: ${STAGE2_DRY.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb (${GIXA}, 3.3, 5.2 and 5.2.2.1.2)`,
      ),
      propellant: assumed(
        STAGE2_BURNED * LB,
        `what it could burn from the start of its steady burn: ${STAGE2_BURNED.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb, from 74,509 lb to its cutoff at 14,222, the shutdown's ${SHUTDOWN.toFixed(0)} lb after it, and the 613 lb of margin (${GIXA}, 3.3, 5.2 and 5.2.2.1.2). The run's guidance cuts it on the orbit, as the radio guidance did`,
      ),
      engine: {
        name: 'Aerojet LR91-AJ-7',
        count: 1,
        thrust: {
          vacuum: doc(
            101_136 * LBF,
            `GLV-9's flight average, postflight reconstructed, 101,136 lb, roll control not included (predicted 100,525: ${GIXA}, Table 5.2.2-II, read on the page)`,
          ),
        },
        isp: { vacuum: doc(312.39, `GLV-9's flight average, 312.39 s (predicted 311.97: ${GIXA}, Table 5.2.2-II)`) },
        nozzle: GLV_NOZZLES.second,
      },
      ignition: assumed(
        LIGHT,
        `its thrust from the chamber pressure's rise, which on GLV-6 was 0.015 s before the stages parted (Launch Vehicle No. 6 Flight Evaluation, II.C, and Table II-4): here 153.23 s less that, with the stages still joined. The ignition signal, 91FS1, was at 152.48 s with the first stage's shutdown (${GIXA}, Table 4.2-I); the engine's MDFJPS made at 153.20`,
      ),
      cutoff: doc(SECO, `91FS2 at 339.79 s, planned 338.99; the redundant shutdown at 339.81 (${GIXA}, Table 4.2-I)`),
    },
    staging: doc(STAGING, `"Stage separation begin" at 153.23 s, 0.75 s after the staging signal (${GIXA}, Table 4.2-I)`),
    hot: {
      open: estimated(
        0.5,
        'of the interstage’s side the second stage’s jet leaves through: its ring of exhaust ports, half open (the model’s; no figure read)',
      ),
      turn: estimated(30, 'degrees below the level the jet leaves the ports at: not read'),
      endures: estimated(5, 's at full thrust the first stage’s forward dome stands the jet: not read. Planned for, it stood the 0.70 s'),
    },
  },
  separation: {
    at: doc(SEPARATION, `"Spacecraft separation" at 366.72 s, planned 369.29 (${GIXA}, Table 4.2-I)`),
    push: assumed(
      (3.2 * FT * (SC9_LAUNCH + STAGE2_DRY)) / STAGE2_DRY,
      `Gemini XII's 3.2 ft/s for its separation manoeuvre of 3 seconds (Gemini XII mission report, Table 5.1.5-V), as the joint's push shared by the masses as every separation is (the empty second stage ${STAGE2_DRY.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb): this report gives the separation and the insertion velocity adjustment together, 29.6 ft/s (${GIXA}, Table 5.1.5-VI)`,
    ),
    mass: derived(
      SC9_LAUNCH * LB,
      `the spacecraft at launch, 8,268 lb (${GIXA}, 3.3): what stayed on the launch vehicle and the fairings thrown off after are not read`,
    ),
  },
  ascent: {
    guidance: {
      azimuth: doc(
        87.4,
        `"Roll program start (launch azimuth = 87.4 deg)" at 18.42 s, its end at 20.42 (${GIXA}, Table 4.2-I); "a biased launch azimuth of 87.4 degrees" (p. 6-5)`,
      ),
      vertical: doc(22.97, `up the plumb line until "Pitch program rate no. 1 start" at 22.97 s, planned 23.04 (${GIXA}, Table 4.2-I)`),
      kick: estimated(15, 's: the stored pitch programme’s rates are not in the report; a pitch-over of fifteen seconds is ours'),
      turn: estimated(
        BECO,
        's: the radio guidance’s closed loop flown as the law’s linear tangent from staging; the first stage’s programme before it. The radio guidance was enabled at 161.43 s and its first command came at 168.19 (Table 4.2-I)',
      ),
      target: {
        at: 'seco',
        altitude: doc(
          528_075 * FT,
          `${GIXA}, Table 4.3-I, final: 528,075 ft at the second stage's cutoff, a geodetic height (its elements over the Fischer ellipsoid, Table 4.3-II, note a)`,
        ),
        over: 'ellipsoid',
        climb: doc(-0.11, `${GIXA}, Table 4.3-I, final: -0.11° space-fixed at cutoff`),
        inclination: doc(
          28.91,
          `${GIXA}, Table 4.3-IV, final, at insertion: 28.91°: where the yaw is solved from, the plane being the ATDA's (below); its separation state (Table 4.3-I: 28.98° N, 69.80° W, heading 87.86°) read as a tracking vector is gives 28.89 (sim/pursuit.ts fixState)`,
        ),
        // (into the ATDA's plane: "the out-of-plane velocity error resulting after the GLV ascent-yaw-steering was less than
        // 10 ft/sec" (4.3.1.2.1). Cut near the top of its latitude, aimed at the inclination alone the yaw put the plane 23°
        // of node from the ATDA's: mission.md)
        plane: 'target',
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
      'the spacecraft’s centre of mass at the heat shield’s rim, Z103.44 (the model’s origin): spacecraft 9’s at launch was at Z104.84 (the mission report, 3.3), its own Z reference 13.44 in aft of the mating plane; not reduced to the model’s',
    ),
    sheds: [
      {
        on: 'staging-nuts',
        name: 'Titan first stage',
        from: doc(0, 'the first stage engines’ exit plane, station 1348.103 (titan-ii-glv.md)'),
        to: derived(STATION(500), 'the separation plane, station 500, with the interstage on it (titan-ii-glv.md)'),
        radius: doc(60 * IN, 'the 120 in tank (titan-ii-glv.md)'),
        mass: derived(STAGE1_DRY * LB, 'GLV-9’s as it was let go (as the plan’s, above)'),
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
        mass: derived(STAGE2_DRY * LB, 'GLV-9’s at cutoff less the spacecraft (as the plan’s)'),
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
        mass: derived((SC9_LAUNCH - RETROGRADE) * LB, 'the spacecraft at launch less at retrofire (as the plan’s, below)'),
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
        label: 'Perigee at insertion',
        value: 85.7 * NMI,
        unit: 'm',
        tolerance: 12_000,
        confidence: 'documented',
        source: `${GIXA}, Table 4.3-IV, final, at insertion: 85.7 nautical miles (planned 86.7); the separation and insertion velocity adjustment's 29.6 ft/s in it`,
      },
      {
        id: 'apogee',
        label: 'Apogee at insertion',
        value: 144.0 * NMI,
        unit: 'm',
        tolerance: 25_000,
        confidence: 'documented',
        source: `${GIXA}, Table 4.3-IV: 144.0 nautical miles (planned 148.6)`,
      },
      {
        id: 'inclination',
        label: 'Inclination',
        value: 28.91,
        unit: '°',
        tolerance: 0.25,
        confidence: 'documented',
        source: `${GIXA}, Table 4.3-IV`,
      },
      {
        id: 'cutoffSpeed',
        label: 'Speed at insertion, space-fixed',
        value: (25_707 + 29.5) * FT,
        unit: 'm/s',
        tolerance: 30,
        confidence: 'derived',
        source: `${GIXA}, Table 4.3-I, final: 25,707 ft/s at the spacecraft's separation, 366.80 s, with the second stage's shutdown impulse in it, and the 29.5 ft/s along the motion the separation and the insertion velocity adjustment then gave (Table 5.1.5-VI): 25,736.5. The run's guidance cuts the stage on the orbit at insertion, so the adjustment is in its cut`,
      },
    ],
  },
  orbit: {
    over: {
      is: 'oblate',
      confidence: 'documented',
      source: `${GIXA}, Table 4.3-IV, note a: "The altitude is computed above the Fischer ellipsoid earth model of 1960; period and inclination are osculating elements". The ellipsoid is WGS 84’s, not Fischer’s`,
    },
    perigee: doc(85.7 * NMI, `${GIXA}, Table 4.3-IV, final, revolution 1 (insertion): 85.7 nautical miles; ${CHRONOLOGY}`),
    apogee: doc(144.0 * NMI, `${GIXA}, Table 4.3-IV: 144.0 nautical miles`),
    inclination: doc(28.91, `${GIXA}, Table 4.3-IV`),
    // (no period: the report's 88.78 min, Table 4.3-IV, an osculating period (note a), is not its heights' orbit flown
    // perigee to perigee over the oblate earth; the heights are the orbit flown, as Gemini XII's are: mission.md)
  },
  injection: {
    at: doc(
      INSERTED,
      `${GIXA}, Table 4.2-I: "OAMS off (final)" at 436.40 s, "Over a 70-second time interval, 4 maneuvers were made which totaled 41.4 seconds thrust time" (note a): the published orbit is the one after them (Table 4.3-IV)`,
    ),
    heading: 'north',
    arc: derived(
      (567.3 * NMI) / 6_371_000 / (Math.PI / 180),
      `degrees: the range at separation, 567.3 nautical miles (${GIXA}, Table 4.3-I, final), over the Earth's mean radius. Flying the ascent replaces it`,
    ),
    anomaly: derived(
      346.4,
      `degrees: from the flight-path angle at separation, -0.11° (${GIXA}, Table 4.3-I, final), on the published orbit’s eccentricity, 0.0082: tan γ = e sin ν / (1 + e cos ν), so some fourteen degrees before perigee. Flying the ascent replaces it`,
    ),
  },
  mass: derived(
    SC9_LAUNCH * LB,
    `the spacecraft at launch, 8,268 lb (${GIXA}, 3.3), taken for it in orbit: what it left on the launch vehicle, the fairings and the 700 lb of propellant its thrusters burned (5.1.8.1.3) are not taken off`,
  ),
  rarefied: {
    drag: assumed(2.2, KING_HELE),
    area: estimated(
      (OUTSIDE / 4) * IN * IN,
      `m²: a quarter of the orbit configuration's whole outside, ${(OUTSIDE * IN * IN).toFixed(1)} m², which is what a convex body presents on the average over every way it can lie (Cauchy): the ship was turned for each burn and alignment, held on the ATDA through three terminal phases and station keeping, and drifted powered down, and how it lay between was not recorded`,
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
  // Each from the report's Table 4.3-III (planned, ground commanded and actual) and Table 5.1.5-VI (the guidance system's
  // components, where it had them, and the crew's figures where it did not), read on the page. The burns that set up each
  // rendezvous are flown as recorded; the rendezvous after them are made on the ATDA (`toward`), the record's impulse then
  // a check (`checks`); the last separation and the orbit shaping as recorded.
  moves: [
    {
      id: 'phase-adjust',
      label: 'Phase adjust: the perigee raised',
      thrusters: 'aft',
      attitude: {
        label: 'Blunt end aft, along the motion',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [74.8, -0.2, 0.2]),
        confidence: 'derived',
        source: `pitch -0.2°, yaw -0.1° (${GIXA}, Table 4.3-III, actual)`,
      },
      turned: estimated(PHASE_ADJUST - 120, 'in its attitude two minutes before: not read'),
      on: doc(PHASE_ADJUST, `0:49:03.3, as planned (${GIXA}, Tables 4.2-II and 5.1.5-VI)`),
      off: doc(PHASE_ADJUST + 94.6, `94.6 s, commanded 100.0 (${GIXA}, Table 4.3-III)`),
      deltaV: doc(
        74.8 * FT,
        `74.8 ft/s, commanded 75.0 (${GIXA}, Table 5.1.5-VI): the perigee from 85.7 to 123.6 nautical miles (Table 4.3-II)`,
      ),
    },
    {
      id: 'corrective-combination',
      label: 'Corrective combination',
      thrusters: 'aft',
      attitude: {
        label: 'Pitched up 44° and yawed 68° right',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [4.1, -10.3, 9.8]),
        confidence: 'derived',
        source: `pitch 44.4°, yaw -67.5° (${GIXA}, Table 4.3-III, actual); "a pitch-up attitude of 44.3 degrees and yaw-left of 67.5 degrees" (4.3.1.2.1)`,
      },
      turned: estimated(CORRECTIVE - 120, 'in its attitude two minutes before: not read'),
      on: doc(CORRECTIVE, `1:55:17.4, as planned (${GIXA}, Tables 4.2-II and 5.1.5-VI)`),
      off: doc(CORRECTIVE + 20.3, `20.3 s, commanded 19.0 (${GIXA}, Table 4.3-III)`),
      deltaV: doc(
        14.8 * FT,
        `14.8 ft/s, commanded 14.6 (${GIXA}, Table 5.1.5-VI): the apogee from 146.0 to 148.7 nautical miles (Table 4.3-II)`,
      ),
    },
    {
      id: 'coelliptic',
      label: 'Coelliptic burn: some 12 nautical miles under the ATDA',
      thrusters: 'aft',
      attitude: {
        label: 'Blunt end aft, pitched down 40°',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [40.6, 34.7, 2.1]),
        confidence: 'derived',
        source: `pitch -40.1°, yaw -2.9° (${GIXA}, Table 4.3-III, actual); "the differential altitude ... about 12 nautical miles" (4.3.1.2.1)`,
      },
      turned: estimated(COELLIPTIC - 120, 'in its attitude two minutes before: not read'),
      on: doc(
        COELLIPTIC,
        `2:24:51.7, moved eight minutes earlier so that Carnarvon could watch it (${GIXA}, Tables 4.2-II and 5.1.5-VI; 4.3.1.2.1)`,
      ),
      off: doc(COELLIPTIC + 70, `70.0 s, commanded 71.0 (${GIXA}, Table 4.3-III)`),
      deltaV: doc(
        53.4 * FT,
        `53.4 ft/s, commanded 54.0 (${GIXA}, Table 5.1.5-VI): the record’s, held against the solved burn (the checks)`,
      ),
      toward: { coelliptic: true },
    },
    {
      id: 'terminal-phase',
      label: 'Terminal phase initiation: toward the ATDA',
      thrusters: 'aft',
      attitude: {
        label: 'Pitched up 28°, on the line of sight',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [24.1, -15, -1.1]),
        confidence: 'derived',
        source: `pitch 27.6°, yaw 0.7° (${GIXA}, Table 4.3-III, actual); lit "when the elevation angle to the ATDA was approximately 27.2 degrees and the range was about 25.2 nautical miles" (4.3.1.2.1)`,
      },
      turned: estimated(TPI - 120, 'in its attitude two minutes before: not read'),
      on: doc(TPI, `3:36:02.2, ground commanded 3:35:35 (${GIXA}, Tables 4.2-II and 5.1.5-VI)`),
      off: doc(TPI + 37, `37.0 s, commanded 35.0 (${GIXA}, Table 4.3-III)`),
      deltaV: doc(28.4 * FT, `28.4 ft/s, ground commanded 26.8 (${GIXA}, Table 5.1.5-VI): the record’s, held against the solved burn`),
      toward: {
        elevation: {
          angle: doc(
            27.2,
            `degrees: "The TPI maneuver was initiated at 3:36:02 g.e.t. when the elevation angle to the ATDA was approximately 27.2 degrees" (${GIXA}, 4.3.1.2.1): lit when the ATDA rises through it`,
          ),
          travel: derived(
            129.3,
            `degrees round its orbit the ATDA was to go to the meeting: the intermediate corrections "at ωt = 81.8 degrees and 33.6 degrees (the angles of orbit travel to rendezvous) were applied 12 and 24 minutes later" (${GIXA}, 4.3.1.2.1), on the ATDA's 90.55 min (Table 4.3-VII): 129.3°`,
          ),
          window: estimated(3600, 's either side of the record’s lighting it is looked for in: chosen'),
        },
      },
    },
    {
      id: 'midcourse-1',
      label: 'First midcourse correction, at 82° to go',
      thrusters: 'forward',
      attitude: {
        label: 'On the line of sight to the ATDA',
        aim: 'velocity',
        sense: 1,
        ...aimed('forward', [-3.6, 0.7, -1.8]),
        confidence: 'derived',
        source: `the line of sight about 31.9° up (${GIXA}, Table 4.3-III, note d): the pair whose push is nearest taken`,
      },
      turned: estimated(MIDCOURSE[0]! - 60, 'on the ATDA from the terminal phase on'),
      on: doc(
        MIDCOURSE[0]!,
        `not computed on the ground, made by the crew at 81.8° of travel to go (${GIXA}, Tables 4.2-II, 4.3-III and 5.1.5-VI; 4.3.1.2.1)`,
      ),
      off: doc(MIDCOURSE[0]! + 8, `8.0 s (${GIXA}, Table 4.3-III)`),
      deltaV: doc(
        4.1 * FT,
        `4.1 ft/s, the guidance system’s resultant (${GIXA}, Table 5.1.5-VI; about 6.1 expended along the three axes, Table 4.3-III): the record’s, held against the solved burn`,
      ),
      toward: {
        reach: { ahead: derived(0, 'the ATDA itself'), above: derived(0, 'the ATDA itself') },
        at: derived(INTERCEPT, 'as the terminal phase’s'),
        arrival: { of: 'terminal-phase', at: doc(INTERCEPT, 'the terminal phase’s arrival as the ground commanded it') },
      },
    },
    {
      id: 'midcourse-2',
      label: 'Second midcourse correction, at 34° to go',
      thrusters: 'aft',
      attitude: {
        label: 'On the line of sight to the ATDA',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [2.8, -2.8, 0]),
        confidence: 'derived',
        source: `the line of sight about 89.6° up (${GIXA}, Table 4.3-III, note d): the pair whose push is nearest taken`,
      },
      turned: estimated(MIDCOURSE[1]! - 60, 'on the ATDA from the terminal phase on'),
      on: doc(
        MIDCOURSE[1]!,
        `not computed on the ground, made by the crew at 33.6° of travel to go (${GIXA}, Tables 4.2-II, 4.3-III and 5.1.5-VI; 4.3.1.2.1)`,
      ),
      off: doc(MIDCOURSE[1]! + 7, `7.0 s (${GIXA}, Table 4.3-III)`),
      deltaV: doc(
        4 * FT,
        `4.0 ft/s, the guidance system’s resultant (${GIXA}, Table 5.1.5-VI; about 5.0 expended, Table 4.3-III): the record’s, held against the solved burn`,
      ),
      toward: {
        reach: { ahead: derived(0, 'the ATDA itself'), above: derived(0, 'the ATDA itself') },
        at: derived(INTERCEPT, 'as the terminal phase’s'),
        arrival: { of: 'terminal-phase', at: doc(INTERCEPT, 'the terminal phase’s arrival as the ground commanded it') },
      },
    },
    {
      id: 'terminal-braking',
      label: 'Braking: to the ATDA, and station kept',
      thrusters: 'forward',
      attitude: {
        label: 'Nose on the ATDA, the forward-firing pair braking',
        aim: 'velocity',
        sense: 1,
        ...aimed('forward', [21, 11.7, -2]),
        confidence: 'derived',
        source: `the look angle to the ATDA about 111.3° up and 4.0° across as the braking began (${GIXA}, Table 4.3-III, note f): braking is along the line of sight`,
      },
      turned: estimated(BRAKING - 60, 'on the ATDA from the terminal phase on'),
      on: doc(BRAKING, `4:06:08.2, the ground’s 4:07:59 (${GIXA}, Tables 4.2-II and 5.1.5-VI)`),
      off: doc(BRAKING + 550, `"Braking lasted intermittently for about 9 minutes" (${GIXA}, Table 4.3-III, note g)`),
      deltaV: doc(
        24 * FT,
        `24 ft/s, the guidance system’s resultant (${GIXA}, Table 5.1.5-VI); "An effective resultant velocity of about 33 ft/sec ... a ΔV of approximately 46 ft/sec was used" (4.3.1.2.1; Table 4.3-III): the record’s, held against the braking flown`,
      ),
      toward: {
        station: {
          ahead: doc(
            60 * FT,
            `"station keeping ... at a separation distance of 60 feet" (${GIXA}, 7.1.1.2; "less than 100 feet from the ATDA" by 4:15:00, 4.3.1.2.1). Taken along the track, the ATDA ahead`,
          ),
          above: estimated(0, 'not read: level with it'),
        },
        arrival: { of: 'terminal-phase', at: doc(INTERCEPT, 'the terminal phase’s arrival as the ground commanded it') },
        until: doc(RADIAL, `the radial separation that began the equi-period rendezvous, 5:00:59.8 (${GIXA}, Table 5.1.5-VI)`),
      },
    },
    {
      id: 'radial-separation',
      label: 'Radial separation: up from the ATDA, for the equi-period rendezvous',
      thrusters: 'forward',
      attitude: {
        label: 'Nose down, the forward-firing pair pushing up',
        aim: 'velocity',
        sense: 1,
        ...aimed('forward', [-0.3, -19.9, -0.1]),
        confidence: 'derived',
        source: `pitch -85.0°, yaw 0.9° (${GIXA}, Table 4.3-III, actual), the push away from the Earth: "20 ft/sec radial-separation maneuver" (4.3.1.2.2)`,
      },
      turned: estimated(RADIAL - 120, 'in its attitude two minutes before: not read'),
      on: doc(RADIAL, `5:00:59.8, the time ground updated (${GIXA}, Tables 4.2-II and 5.1.5-VI; 4.3.1.2.2)`),
      off: doc(RADIAL + 35, `35.0 s, as commanded (${GIXA}, Table 4.3-III)`),
      deltaV: doc(
        19.9 * FT,
        `19.9 ft/s, planned 20.0 (${GIXA}, Table 5.1.5-VI): the apogee from 161.0 to 163.3 nautical miles and the perigee from 157.6 to 156.6 (Table 4.3-II)`,
      ),
    },
    {
      id: 'terminal-phase-2',
      label: 'Terminal phase initiation, equi-period: toward the ATDA',
      thrusters: 'aft',
      attitude: {
        label: 'On the line of sight to the ATDA',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [0.5, -2, 0]),
        confidence: 'derived',
        source: `the line of sight about 40.7° up (${GIXA}, Table 4.3-III, note c): "performed completely by the crew using only information displayed from the platform, optical aids, and onboard charts" (4.3.1.2.2)`,
      },
      turned: estimated(TPI_2 - 120, 'in its attitude two minutes before: not read'),
      on: doc(TPI_2, `6:15:11.9, ground computed 6:14:07 (${GIXA}, Tables 4.2-II and 5.1.5-VI)`),
      off: doc(TPI_2 + 4, `4.0 s (${GIXA}, Table 4.3-III)`),
      deltaV: doc(2.1 * FT, `2.1 ft/s, planned 3.5 (${GIXA}, Table 5.1.5-VI): the record’s, held against the solved burn`),
      toward: {
        reach: { ahead: derived(0, 'the ATDA itself'), above: derived(0, 'the ATDA itself') },
        at: doc(
          INTERCEPT_2,
          `the braking the latest figures sent to the crew had, 6:33:58 (${GIXA}, Table 4.2-II, planned): when the transfer was to arrive`,
        ),
      },
    },
    {
      id: 'midcourse-2-1',
      label: 'First midcourse correction, equi-period',
      thrusters: 'forward',
      attitude: {
        label: 'On the line of sight to the ATDA',
        aim: 'velocity',
        sense: 1,
        ...aimed('forward', [-0.3, -1.1, -0.1]),
        confidence: 'derived',
        source: `the line of sight about 61.8° up and 1.2° across (${GIXA}, Table 4.3-III, note d): the pair whose push is nearest taken`,
      },
      turned: estimated(MIDCOURSE_2[0]! - 60, 'on the ATDA from the terminal phase on'),
      on: doc(MIDCOURSE_2[0]!, `not computed on the ground, made by the crew (${GIXA}, Tables 4.2-II, 4.3-III and 5.1.5-VI)`),
      off: doc(MIDCOURSE_2[0]! + 3, `3.0 s (${GIXA}, Table 4.3-III)`),
      deltaV: doc(
        1 * FT,
        `1.0 ft/s, the guidance system’s resultant (${GIXA}, Table 5.1.5-VI): the record’s, held against the solved burn`,
      ),
      toward: {
        reach: { ahead: derived(0, 'the ATDA itself'), above: derived(0, 'the ATDA itself') },
        at: doc(INTERCEPT_2, 'as the terminal phase’s'),
      },
    },
    {
      id: 'midcourse-2-2',
      label: 'Intermediate correction, equi-period',
      thrusters: 'forward',
      attitude: {
        label: 'On the line of sight to the ATDA',
        aim: 'velocity',
        sense: 1,
        ...aimed('forward', [-0.6, -0.7, -0.1]),
        confidence: 'derived',
        source: `the line of sight about 67.6° up and 1.5° across (${GIXA}, Table 4.3-III, note d): the pair whose push is nearest taken`,
      },
      turned: estimated(MIDCOURSE_2[1]! - 60, 'on the ATDA from the terminal phase on'),
      on: doc(MIDCOURSE_2[1]!, `not computed on the ground, made by the crew (${GIXA}, Tables 4.2-II, 4.3-III and 5.1.5-VI)`),
      off: doc(MIDCOURSE_2[1]! + 2, `2.0 s (${GIXA}, Table 4.3-III)`),
      deltaV: doc(
        1 * FT,
        `1.0 ft/s, the guidance system’s resultant (${GIXA}, Table 5.1.5-VI): the record’s, held against the solved burn`,
      ),
      toward: {
        reach: { ahead: derived(0, 'the ATDA itself'), above: derived(0, 'the ATDA itself') },
        at: doc(INTERCEPT_2, 'as the terminal phase’s'),
      },
    },
    {
      id: 'midcourse-2-3',
      label: 'Second midcourse correction, equi-period',
      thrusters: 'forward',
      attitude: {
        label: 'On the line of sight to the ATDA',
        aim: 'velocity',
        sense: 1,
        ...aimed('forward', [-2.2, -2, 0.1]),
        confidence: 'derived',
        source: `the line of sight about 67.2° up and 1.0° across (${GIXA}, Table 4.3-III, note d): the pair whose push is nearest taken`,
      },
      turned: estimated(MIDCOURSE_2[2]! - 60, 'on the ATDA from the terminal phase on'),
      on: doc(MIDCOURSE_2[2]!, `not computed on the ground, made by the crew (${GIXA}, Tables 4.2-II, 4.3-III and 5.1.5-VI)`),
      off: doc(MIDCOURSE_2[2]! + 4, `4.0 s (${GIXA}, Table 4.3-III)`),
      deltaV: doc(
        3 * FT,
        `3.0 ft/s, the guidance system’s resultant (${GIXA}, Table 5.1.5-VI): the record’s, held against the solved burn`,
      ),
      toward: {
        reach: { ahead: derived(0, 'the ATDA itself'), above: derived(0, 'the ATDA itself') },
        at: doc(INTERCEPT_2, 'as the terminal phase’s'),
      },
    },
    {
      id: 'terminal-braking-2',
      label: 'Braking, equi-period: to the ATDA, and station kept',
      thrusters: 'forward',
      attitude: {
        label: 'Nose on the ATDA, the forward-firing pair braking',
        aim: 'velocity',
        sense: 1,
        ...aimed('forward', [4.7, 15.6, -0.8]),
        confidence: 'derived',
        source: `the line of sight to the ATDA about 60.0° up as the braking began (${GIXA}, Table 4.3-III, note d): braking is along the line of sight`,
      },
      turned: estimated(BRAKING_2 - 30, 'on the ATDA from the terminal phase on: half a minute before, after the last correction'),
      on: doc(BRAKING_2, `6:29:26.4, the planned 6:33:58 (${GIXA}, Tables 4.2-II and 5.1.5-VI)`),
      off: doc(
        BRAKING_2 + 420,
        `"Braking lasted intermittently for about 7 minutes" (${GIXA}, Table 4.3-III, note h); "station keeping began at 6 hours 36 minutes" (4.3.1.2.2)`,
      ),
      deltaV: doc(
        16.3 * FT,
        `16.3 ft/s, the guidance system’s resultant (${GIXA}, Table 5.1.5-VI); about 35.0 expended along the three axes (Table 4.3-III): the record’s, held against the braking flown`,
      ),
      toward: {
        station: {
          ahead: estimated(
            60 * FT,
            'the first rendezvous’s 60 ft: the report gives no range for this one’s station keeping. Taken along the track, the ATDA ahead',
          ),
          above: estimated(0, 'not read: level with it'),
        },
        until: doc(PARTING, `the separation for the rendezvous from above, 7:14:58 (${GIXA}, Table 4.2-II)`),
      },
    },
    {
      id: 'atda-separation',
      label: 'Separation: back from the ATDA, for the rendezvous from above',
      thrusters: 'forward',
      attitude: {
        label: 'Nose along the motion, the forward-firing pair braking',
        aim: 'velocity',
        sense: 1,
        ...aimed('forward', [-3.7, 0, 0]),
        confidence: 'derived',
        source: `pitch 0, yaw 0 (${GIXA}, Table 4.3-III, actual): "a separation maneuver of 3.7 ft/sec retrograde" (7.1.2.4.2)`,
      },
      turned: estimated(PARTING - 120, 'in its attitude two minutes before: not read'),
      on: doc(PARTING, `7:14:58, as planned, by the pilot’s report (${GIXA}, Tables 4.2-II and 4.3-III)`),
      off: doc(PARTING + 7, `7.0 s, as commanded (${GIXA}, Table 4.3-III)`),
      deltaV: doc(
        3.7 * FT,
        `3.7 ft/s, as commanded, from the crew’s report (${GIXA}, Table 5.1.5-VI): the apogee from 161.0 to 159.8 nautical miles, the perigee from 157.6 to 156.2 (Table 4.3-II)`,
      ),
    },
    {
      id: 'phase-adjust-3',
      label: 'Phase adjust, for the rendezvous from above',
      thrusters: 'aft',
      attitude: {
        label: 'Blunt end aft, along the motion',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [2, 0, 0]),
        confidence: 'derived',
        source: `pitch 0, yaw 0 (${GIXA}, Table 4.3-III, actual, by the pilot’s log)`,
      },
      turned: estimated(PHASE_ADJUST_3 - 120, 'in its attitude two minutes before: not read'),
      on: doc(PHASE_ADJUST_3, `18:23:19, as planned, by the pilot’s report (${GIXA}, Tables 4.2-II and 4.3-III)`),
      off: doc(PHASE_ADJUST_3 + 5, `5.0 s, commanded 3.0 (${GIXA}, Table 4.3-III)`),
      deltaV: doc(2 * FT, `2.0 ft/s, as commanded, from the crew’s report (${GIXA}, Table 5.1.5-VI)`),
    },
    {
      id: 'height-adjust',
      label: 'Height adjust: the apogee raised over the ATDA',
      thrusters: 'aft',
      attitude: {
        label: 'Blunt end aft, along the motion',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [17, 0, 0]),
        confidence: 'derived',
        source: `pitch 0, yaw 0 (${GIXA}, Table 4.3-III, actual, by the pilot’s log)`,
      },
      turned: estimated(HEIGHT_ADJUST - 120, 'in its attitude two minutes before: not read'),
      on: doc(HEIGHT_ADJUST, `19:08:16, as planned, by the pilot’s report (${GIXA}, Tables 4.2-II and 4.3-III)`),
      off: doc(HEIGHT_ADJUST + 22, `22.0 s, as commanded (${GIXA}, Table 4.3-III)`),
      deltaV: doc(
        17 * FT,
        `17.0 ft/s, as commanded, from the crew’s report (${GIXA}, Table 5.1.5-VI): the apogee from 159.5 to 166.7 nautical miles (Table 4.3-II)`,
      ),
    },
    {
      id: 'coelliptic-3',
      label: 'Coelliptic burn: some 7 nautical miles over the ATDA',
      thrusters: 'forward',
      attitude: {
        label: 'Blunt end forward, the forward-firing pair pushing on',
        aim: 'velocity',
        sense: 1,
        ...aimed('forward', [11.4, -8.9, 0]),
        confidence: 'derived',
        source: `pitch -58.0°, yaw 180.0° (${GIXA}, Table 4.3-III, actual): "This posigrade maneuver was applied with the forward-firing thrusters and placed the spacecraft in a 166 by 167 nautical mile orbit" (4.3.1.2.3)`,
      },
      turned: estimated(COELLIPTIC_3 - 120, 'in its attitude two minutes before: not read'),
      on: doc(COELLIPTIC_3, `19:54:24, as planned, by the pilot’s report (${GIXA}, Tables 4.2-II and 4.3-III)`),
      off: doc(COELLIPTIC_3 + 25, `25.0 s, as commanded (${GIXA}, Table 4.3-III)`),
      deltaV: doc(
        14.4 * FT,
        `14.4 ft/s, as commanded, from the crew’s report (${GIXA}, Table 5.1.5-VI): the record’s, held against the solved burn`,
      ),
      toward: { coelliptic: true },
    },
    {
      id: 'terminal-phase-3',
      label: 'Terminal phase initiation from above: down toward the ATDA',
      thrusters: 'aft',
      attitude: {
        label: 'Turned about, pitched down 20°, on the line of sight',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [-17, 6, 0.1]),
        confidence: 'derived',
        source: `pitch -19.5°, yaw -180.0° (${GIXA}, Table 4.3-III, actual); "an elevation angle to the ATDA of approximately -27.5 degrees at a range of 14.5 nautical miles" (4.3.1.2.3). The vertical part is printed ±6.0 (Table 5.1.5-VI): taken down, as the nose was pitched`,
      },
      turned: estimated(TPI_3 - 120, 'in its attitude two minutes before: not read'),
      on: doc(
        TPI_3,
        `21:02:27.5, the crew’s; the ground commanded 20:55:28, "determined to be in error by the crew" (${GIXA}, Tables 4.2-II and 5.1.5-VI)`,
      ),
      off: doc(TPI_3 + 22, `22.0 s, commanded 21.0 (${GIXA}, Table 4.3-III)`),
      deltaV: doc(18 * FT, `18.0 ft/s, ground commanded 16.7 (${GIXA}, Table 5.1.5-VI): the record’s, held against the solved burn`),
      toward: {
        reach: { ahead: derived(0, 'the ATDA itself'), above: derived(0, 'the ATDA itself') },
        at: derived(
          INTERCEPT_3,
          `the crew's lighting, 21:02:27.5, and as long a transfer as the ground's from its 20:55:28 to its terminal phase finalize at 21:27:57 (${GIXA}, Table 4.3-III, ground commanded): the corrections at 12 and 24 minutes after it, as the first rendezvous's, are on the record's clock (Table 4.2-II)`,
        ),
      },
    },
    {
      id: 'midcourse-3-1',
      label: 'First midcourse correction from above, at 82° to go',
      thrusters: 'aft',
      attitude: {
        label: 'On the line of sight to the ATDA',
        aim: 'velocity',
        sense: 1,
        confidence: 'estimated',
        source: `no attitude or components were read for it: "No data available" (${GIXA}, Tables 4.3-III and 5.1.5-VI). Along the motion, solved on the ATDA`,
      },
      turned: estimated(MIDCOURSE_3[0]! - 60, 'on the ATDA from the terminal phase on'),
      on: doc(MIDCOURSE_3[0]!, `by the pilot’s report (${GIXA}, Table 4.2-II)`),
      off: estimated(MIDCOURSE_3[0]! + 11, `the 8 ft/s at the aft-firing pair’s thrust: not read`),
      deltaV: doc(
        8 * FT,
        `"The intermediate corrections ... required about 8 and 19 ft/sec ΔV, respectively" (${GIXA}, 4.3.1.2.3): about 8 ft/s, the record’s, held against the solved burn`,
      ),
      toward: {
        reach: { ahead: derived(0, 'the ATDA itself'), above: derived(0, 'the ATDA itself') },
        at: derived(INTERCEPT_3, 'as the terminal phase’s'),
      },
    },
    {
      id: 'midcourse-3-2',
      label: 'Second midcourse correction from above, at 34° to go',
      thrusters: 'aft',
      attitude: {
        label: 'On the line of sight to the ATDA',
        aim: 'velocity',
        sense: 1,
        confidence: 'estimated',
        source: `no attitude or components were read for it: "No data available" (${GIXA}, Tables 4.3-III and 5.1.5-VI). Along the motion, solved on the ATDA`,
      },
      turned: estimated(MIDCOURSE_3[1]! - 60, 'on the ATDA from the terminal phase on'),
      on: doc(MIDCOURSE_3[1]!, `by the pilot’s report (${GIXA}, Table 4.2-II)`),
      off: estimated(MIDCOURSE_3[1]! + 26, `the 19 ft/s at the aft-firing pair’s thrust: not read`),
      deltaV: doc(
        19 * FT,
        `"The intermediate corrections ... required about 8 and 19 ft/sec ΔV, respectively" (${GIXA}, 4.3.1.2.3): about 19 ft/s, the record’s, held against the solved burn`,
      ),
      toward: {
        reach: { ahead: derived(0, 'the ATDA itself'), above: derived(0, 'the ATDA itself') },
        at: derived(INTERCEPT_3, 'as the terminal phase’s'),
      },
    },
    {
      id: 'terminal-braking-3',
      label: 'Braking from above: to the ATDA, and station kept',
      thrusters: 'forward',
      attitude: {
        label: 'Nose on the ATDA, the forward-firing pair braking',
        aim: 'velocity',
        sense: 1,
        confidence: 'estimated',
        source: `no attitude was read for it (${GIXA}, Table 4.3-III: "No data available"): along the motion, solved on the ATDA`,
      },
      turned: estimated(INTERCEPT_3 - 171, 'on the ATDA from the terminal phase on'),
      on: estimated(
        INTERCEPT_3 - 111,
        `"The time of the TPF maneuver is not exactly known because of loss of data" (${GIXA}, 4.3.1.2.3): begun as long before its transfer’s arrival as the first rendezvous’s braking was before the ground’s 4:07:59`,
      ),
      off: doc(
        STATION_3,
        `"By 21:42:00 g.e.t., the spacecraft was in position with the ATDA and the crew was station keeping" (${GIXA}, 4.3.1.2.3)`,
      ),
      deltaV: doc(
        20 * FT,
        `"An effective velocity of about 20 ft/sec was added to the spacecraft orbit" (${GIXA}, 4.3.1.2.3): the record’s, held against the braking flown`,
      ),
      toward: {
        station: {
          ahead: estimated(
            60 * FT,
            'the first rendezvous’s 60 ft: no range was read for this one’s, "at times within inches of the shroud". Taken along the track, the ATDA ahead',
          ),
          above: estimated(0, 'not read: level with it'),
        },
        until: doc(LAST_PARTING, `the last separation, 22:59:00 (${GIXA}, Table 4.2-II)`),
      },
    },
    {
      id: 'last-separation',
      label: 'The last separation from the ATDA',
      thrusters: 'forward',
      attitude: {
        label: 'Nose along the motion, the forward-firing pair braking',
        aim: 'velocity',
        sense: 1,
        ...aimed('forward', [-3, 0, 0], '6.1.3, the 3 ft/s retrograde the ground advised'),
        confidence: 'derived',
        source: `"advised the crew to perform a 3-ft/sec retrograde maneuver at their convenience to provide positive separation from the ATDA" (${GIXA}, 6.1.3): along the motion, back`,
      },
      turned: estimated(LAST_PARTING - 120, 'in its attitude two minutes before: not read'),
      on: doc(LAST_PARTING, `22:59:00, as planned (${GIXA}, Table 4.2-II); "performed at 22 hours 59 seconds g.e.t." (6.2)`),
      off: estimated(LAST_PARTING + 5, `the 3 ft/s at the forward-firing pair’s thrust: not read`),
      deltaV: assumed(
        3 * FT,
        `3 ft/s retrograde, as the ground advised (${GIXA}, 6.1.3): no measured figure, "No data available" (Table 5.1.5-VI)`,
      ),
    },
    {
      id: 'orbit-shaping',
      label: 'Orbit shaping: the perigee lowered for the retrofire',
      thrusters: 'aft',
      attitude: {
        label: 'Turned about, the aft-firing pair pushing back',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [-25, 0, 0], '6.1.3, the maneuver’s parameters'),
        confidence: 'derived',
        source: `"Pitch 0, Yaw 180, Thrusters Aft" (${GIXA}, 6.1.3): "to position retrofire for 46-1 so that it would occur at the 270-degree true anomaly"`,
      },
      turned: estimated(SHAPING - 120, 'in its attitude two minutes before: not read'),
      on: doc(SHAPING, `53:41:35 (${GIXA}, Tables 4.2-II and 5.1.5-VI; 6.1.3 prints 55:41:35)`),
      off: estimated(SHAPING + 34, `the 25 ft/s at the aft-firing pair’s thrust, on the last of the main tank: not read`),
      deltaV: doc(
        25 * FT,
        `25 ft/s, from the crew’s report and the parameters sent (${GIXA}, Table 5.1.5-VI and 6.1.3): the perigee from 154.3 to 144.0 nautical miles (Table 4.3-II)`,
      ),
    },
  ],
  adapter: {
    equipment: {
      mass: derived(
        (SC9_LAUNCH - RETROGRADE) * LB,
        `the spacecraft at launch (8,268 lb) less at retrofire (5,635 lb: ${GIXA}, 3.3): ${(SC9_LAUNCH - RETROGRADE).toFixed(0)} lb, with what the thrusters burned not taken off`,
      ),
      gone: doc(EQUIPMENT, `"Adapter equipment section separation" at 71:45:50, planned 71:45:44 (${GIXA}, Table 4.2-II)`),
    },
    retro: {
      mass: derived(
        (RETROGRADE - REENTRY) * LB,
        `spacecraft 9 at retrofire less at 0.05 g (${GIXA}, 3.3): ${(RETROGRADE - REENTRY).toFixed(0)} lb, the section with its four rockets unfired`,
      ),
    },
  },
  retro: {
    sequence: estimated(
      RETRO - 60,
      'a minute before retrofire: when the crew had it in retrofire attitude is not read; "All four retrorockets fired nominally in the automatic sequence" (5.1.8.3)',
    ),
    below: derived(
      (Math.atan2(RETRO_DOWN, RETRO_AFT) * 180) / Math.PI,
      `degrees: the push as the guidance system measured it, 295.9 ft/s along the track and 125.2 across it toward the Earth (and 3.8 to the side, not flown: ${GIXA}, Table 5.1.5-VI), so ${((Math.atan2(RETRO_DOWN, RETRO_AFT) * 180) / Math.PI).toFixed(1)}° below the line back along the motion. The table prints both positive, its convention not stated: taken back and down, as every Gemini retrofire's was`,
    ),
    on: doc(RETRO, `71:46:43.7, "following initiation of retrofire at 71:46:43.7" (${GIXA}, 5.1.8.3); 71:46:44, as planned (Table 4.2-II)`),
    spacing: assumed(5.5, `"fired at 5.5 second intervals in 1-2-3-4 order", the type's (${SEDR}, Section XI, p. 11-73)`),
    count: 4,
    thrust: assumed(2_490 * LBF, `2,490 lb each, the type's (${SP121}, Table 4-I, p. 29)`),
    burn: assumed(5.5, '5.5 s each, the type’s (NASA release 65-81, p. 8)'),
    deltaV: doc(
      321.3 * FT,
      `321.3 ft/s by the guidance system, against 318.4 planned (${GIXA}, Table 5.1.5-VI; 321.9 in Table 5.1.5-I): "The performance of the retrorockets was 1.06 percent higher than nominal, causing the footprint to shift 46.2 nautical miles up range" (5.1.5.2.3)`,
    ),
    gone: assumed(
      RETRO_GONE,
      `45 s after retrofire, when the type's sequence lights the jettison switch (${SP121}, Figure 3-3): not recorded`,
    ),
  },
  entry: {
    mass: doc(REENTRY * LB, `spacecraft 9's re-entry module at 0.05 g, 4,874 lb (${GIXA}, 3.3)`),
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
      source: `lift over drag as flown, at every Mach number: the programme's, "flown with an average lift-to-drag ratio of approximately 0.19" (${SP138}, p. 159), taken for spacecraft 9, whose own is not in its report`,
    },
    predicted: derived(
      0.19 / 0.65,
      `the lift over drag the wind tunnels had given, said and not flown: "a decrease of approximately 35 percent in the lift-to-drag ratio" (${SP138}, p. 163), from the 0.19 flown: 0.29`,
    ),
    trim: assumed(8.5, '"8° to 9°" at the greatest heating on GT-3 (Gemini Program Mission Report, Gemini IV, p. 5-3): the type’s, taken'),
    bank: doc(
      10,
      `degrees: "From retrofire to an altitude of 400K feet, a 10-degree bank angle was flown as planned" (${GIXA}, 5.1.5.2.3). Which way is not said: to the right, south, as Gemini XII's plan had it`,
    ),
    banked: estimated(RETRO_GONE + 1, 'as the retrograde section went: the ship turned to its entry attitude, its lift held from there'),
    banks: [
      {
        label: 'At 400,000 ft: lift up, and the computer’s commands flown by hand',
        bank: estimated(
          0,
          `degrees: "the computer indicated the 400K-foot level by commanding the 0-degree bank angle", and then "A manual closed-loop reentry was flown by the crew based on the roll commands generated by the onboard computer" (${GIXA}, 5.1.5.2.3): those commands are not read (the tape recorder failed, 4.3.1.3), and the lift is held up`,
        ),
        at: doc(ENTRY_400K, `"At 72:06:27.840 g.e.t. the computer indicated the 400K-foot level" (${GIXA}, 5.1.5.2.3)`),
      },
    ],
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
      `spacecraft 9's re-entry module at the main parachute's deployment, 4,475 lb (${GIXA}, 3.3): taken from the drogue on`,
    ),
    drogue: {
      altitude: doc(
        45_000 * FT,
        `"Drogue parachute deploy 72:15:47.9", plotted at about 45,000 ft (${GIXA}, Figure 5.1.11-1, read off the figure to a thousand feet); planned at 50,000 ft`,
      ),
      dragArea: estimated(
        0.5 * Math.PI * ((8.3 / 2) * FT) ** 2,
        `an 8.3 ft conical ribbon drogue (${CR1106}, p. 218) at a drag coefficient of 0.5, the usual figure for the type: no measured figure found`,
      ),
      fills: derived(16.1, `"Drogue parachute disreef 72:16:04", 16.1 s after it came out (${GIXA}, Figure 5.1.11-1)`),
    },
    main: {
      altitude: doc(
        11_000 * FT,
        `"R and R section separation and main parachute deploy 72:17:13.5", plotted at about 11,000 ft (${GIXA}, Figure 5.1.11-1, read off the figure); the type's PARA switch is at 10,600 ft (${SEDR}, pp. 4-22 and 4-23)`,
      ),
      dragArea: derived(
        (2 * 4_400 * LB * 9.80665) / (1.225 * (31.6 * FT) ** 2),
        `the 84.2 ft ringsail's (${CR1106}, p. 222): "a mean descent rate of 31.6 fps" for a module of 4,400 lb, at sea level: 344 m²`,
      ),
      fills: derived(14.0, `deployed at 72:17:13.5 and "Main parachute full open" at 72:17:27.5 (${GIXA}, Figure 5.1.11-1)`),
    },
    checks: [
      {
        id: 'reentry-module.at',
        label: 'Landing',
        value: LANDING,
        unit: 's',
        tolerance: 60,
        confidence: 'documented',
        source: `${GIXA}, Table 4.2-II and Figure 5.1.11-1: 72:20:50, planned 72:21:09 (72:20:50.1 in the figure)`,
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
      'Stafford and Cernan landed in the ship, harder than they expected ("the combination of wind drift, normal swing on the parachute, and contact of the spacecraft on the bad side of a wave", 5.1.11), and stayed in it until it was hoisted aboard the Wasp 53 minutes later: the ejection seats were for the pad, the climb and below 15,000 ft, and were not used',
  },
  lands: { on: 'sea', ship: 'the spacecraft' },
  landing: {
    aimed: {
      from: estimated(
        RETRO - 60,
        'the retrosequence: the turn to retrofire attitude, the equipment section and the rockets keep their intervals to the burn the ground timed (plan.ts LandingAim.from)',
      ),
      confidence: 'assumed',
      source:
        'The retrofire’s instant was worked on the ground from the tracking of revolutions 42 to 44 and fired at the second it gave (Gemini Program Mission Report, Gemini IX-A, 6.1.3 and Table 4.2-II); the ship came down within a nautical mile of the planned point by the radar’s best estimate (4.3.1.3), so the place it came down is taken for the place its burn was timed for',
    },
    latitude: doc(
      27 + 51 / 60,
      `${GIXA}, Table 4.3-I, final: 27°51′ N 74°56′ W; planned 27°52′ N 75°00′ W. "The landing point as reported by the recovery forces was 2.3 nautical miles west of the planned landing point" (5.1.5.2.3)`,
    ),
    longitude: doc(-(74 + 56 / 60), `${GIXA}, Table 4.3-I, final`),
    at: doc(LANDING, `${GIXA}, Table 4.2-II: 72:20:50`),
    near: 'the western Atlantic, off the Bahamas',
  },
  // The ATDA as the report's tracking had it at its insertion, flown on from there: the craft the rendezvous are made on.
  target: {
    orbit: { fix: INSERTION },
    epoch: '1966-06-03T13:39:33.335Z',
    label: 'ATDA',
    mass: doc(
      2_006 * LB,
      `the ATDA's "Launch, gross weight 2 006" lb, which it kept: its separation and in-orbit weights "Not available because shroud did not jettison" (${GIXA}, 3.6)`,
    ),
    dragArea: estimated(
      2.2 * 1.52 * 3.73 * 0.8,
      'm²: the free-molecule figure of a body turning every way, 2.2, on its side and its ends as it is held, 0.8 of a 3.73 m ATDA 1.52 m across, as its own run takes it (vehicles/target-plan.ts): chosen. The two halves of the shroud that stood open on it are not in it',
    ),
  },
  events: [
    { id: 'liftoff', label: 'Liftoff', at: doc(0, `${GIXA}, Table 4.2-I: 13:39:33.335 G.m.t.`) },
    { id: 'beco', label: 'First stage cutoff: the second stage lit', at: doc(BECO, `${GIXA}, Table 4.2-I`), also: 'planned 151.65' },
    { id: 'stage-separation', label: 'The stages begin to part', at: doc(STAGING, `${GIXA}, Table 4.2-I`) },
    { id: 'seco', label: 'Second stage cutoff', at: doc(SECO, `${GIXA}, Table 4.2-I`), also: 'planned 338.99' },
    { id: 'spacecraft-separation', label: 'Spacecraft separation', at: doc(SEPARATION, `${GIXA}, Table 4.2-I`) },
    {
      id: 'insertion',
      label: 'Insertion, after the insertion velocity adjustment: not flown, the stage cut on this orbit',
      at: doc(INSERTED, `${GIXA}, Table 4.2-I; the separation and adjustment 29.6 ft/s from 0:06:06.1 (Table 5.1.5-VI)`),
    },
    {
      id: 'fairings',
      label: 'Nose and scanner fairings off',
      at: estimated(FAIRINGS, 'not in the sequence of events: taken as 15 s after the separation, as Gemini VII’s'),
    },
    { id: 'phase-adjust', label: 'Phase adjust', at: doc(PHASE_ADJUST, `${GIXA}, Table 4.2-II; 0:49:03.3, Table 5.1.5-VI`) },
    {
      id: 'corrective-combination',
      label: 'Corrective combination',
      at: doc(CORRECTIVE, `${GIXA}, Table 4.2-II; 1:55:17.4, Table 5.1.5-VI`),
    },
    { id: 'coelliptic', label: 'Coelliptic burn', at: doc(COELLIPTIC, `${GIXA}, Table 5.1.5-VI; 2:24:52 in Table 4.2-II`) },
    { id: 'terminal-phase', label: 'Terminal phase initiation', at: doc(TPI, `${GIXA}, Table 5.1.5-VI; 3:36:02 in Table 4.2-II`) },
    { id: 'midcourse-1', label: 'First midcourse correction', at: doc(MIDCOURSE[0]!, `${GIXA}, Table 5.1.5-VI; 3:48:35 in Table 4.2-II`) },
    { id: 'midcourse-2', label: 'Second midcourse correction', at: doc(MIDCOURSE[1]!, `${GIXA}, Table 5.1.5-VI; 4:00:27 in Table 4.2-II`) },
    {
      id: 'terminal-braking',
      label: 'Braking begins: the shroud seen still on the ATDA',
      at: doc(BRAKING, `${GIXA}, Table 5.1.5-VI; 4:06:08 in Table 4.2-II`),
    },
    {
      id: 'station-keeping',
      label: 'First rendezvous: station keeping with the ATDA',
      at: doc(
        T(4, 15, 0),
        `"By 4:15:00 g.e.t., the spacecraft was less than 100 feet from the ATDA and the crew was station keeping" (${GIXA}, 4.3.1.2.1)`,
      ),
    },
    {
      id: 'radial-separation',
      label: 'Radial separation, for the equi-period rendezvous',
      at: doc(RADIAL, `${GIXA}, Table 5.1.5-VI; 5:01:00 in Table 4.2-II`),
    },
    {
      id: 'horizontal-check',
      label: 'Horizontal crossing check: no correction needed',
      at: doc(T(5, 45, 20), `"Check point only - maneuver not required" (${GIXA}, Table 4.2-II, note b)`),
    },
    {
      id: 'terminal-phase-2',
      label: 'Terminal phase initiation, equi-period',
      at: doc(TPI_2, `${GIXA}, Table 5.1.5-VI; 6:15:12 in Table 4.2-II`),
    },
    {
      id: 'midcourse-2-1',
      label: 'First midcourse correction, equi-period',
      at: doc(MIDCOURSE_2[0]!, `${GIXA}, Table 5.1.5-VI; 6:20:20 in Table 4.2-II`),
    },
    {
      id: 'midcourse-2-2',
      label: 'Intermediate correction, equi-period',
      at: doc(MIDCOURSE_2[1]!, `${GIXA}, Table 5.1.5-VI; 6:26:59 in Table 4.2-II`),
    },
    {
      id: 'midcourse-2-3',
      label: 'Second midcourse correction, equi-period',
      at: doc(MIDCOURSE_2[2]!, `${GIXA}, Table 5.1.5-VI; 6:28:34 in Table 4.2-II`),
    },
    {
      id: 'terminal-braking-2',
      label: 'Braking begins, equi-period',
      at: doc(BRAKING_2, `${GIXA}, Table 5.1.5-VI; 6:29:26 in Table 4.2-II`),
    },
    {
      id: 'station-keeping-2',
      label: 'Second rendezvous: station keeping',
      at: doc(T(6, 36, 0), `"The crew reported that station keeping began at 6 hours 36 minutes g.e.t." (${GIXA}, 4.3.1.2.2)`),
    },
    {
      id: 'atda-separation',
      label: 'Separation for the rendezvous from above',
      at: doc(PARTING, `${GIXA}, Table 4.2-II, by the pilot’s report`),
    },
    {
      id: 'phase-adjust-3',
      label: 'Phase adjust, for the rendezvous from above',
      at: doc(PHASE_ADJUST_3, `${GIXA}, Table 4.2-II, by the pilot’s report`),
    },
    { id: 'height-adjust', label: 'Height adjust', at: doc(HEIGHT_ADJUST, `${GIXA}, Table 4.2-II, by the pilot’s report`) },
    { id: 'coelliptic-3', label: 'Coelliptic burn, from above', at: doc(COELLIPTIC_3, `${GIXA}, Table 4.2-II, by the pilot’s report`) },
    {
      id: 'terminal-phase-3',
      label: 'Terminal phase initiation from above, on the crew’s time',
      at: doc(TPI_3, `${GIXA}, Table 5.1.5-VI; 21:02:28 in Table 4.2-II, the ground’s 20:55:28 "determined to be in error by the crew"`),
    },
    {
      id: 'midcourse-3-1',
      label: 'First midcourse correction from above',
      at: doc(MIDCOURSE_3[0]!, `${GIXA}, Table 4.2-II, by the pilot’s report`),
    },
    {
      id: 'midcourse-3-2',
      label: 'Second midcourse correction from above',
      at: doc(MIDCOURSE_3[1]!, `${GIXA}, Table 4.2-II, by the pilot’s report`),
    },
    {
      id: 'station-keeping-3',
      label: 'Third rendezvous: station keeping, at times within inches of the shroud',
      at: doc(STATION_3, `${GIXA}, 4.3.1.2.3; "the distance was reduced to approximately 3 inches" (p. 7-28)`),
    },
    { id: 'last-separation', label: 'The last separation from the ATDA', at: doc(LAST_PARTING, `${GIXA}, Table 4.2-II`) },
    {
      id: 'hatch-open',
      label: 'Cernan’s hatch opened: the walk outside (not flown)',
      at: doc(T(49, 23, 0), `${GIXA}, 6.1.3: "The spacecraft hatch was opened over the Canton Island station at 49 hours 23 minutes"`),
    },
    {
      id: 'hatch-shut',
      label: 'The hatch shut',
      at: doc(T(51, 28, 0), `"Hatch closure occurred over Antigua at 51 hours 28 minutes g.e.t." (${GIXA}, 6.1.3)`),
    },
    { id: 'orbit-shaping', label: 'Orbit shaping', at: doc(SHAPING, `${GIXA}, Tables 4.2-II and 5.1.5-VI`) },
    { id: 'equipment-section', label: 'Equipment adapter off', at: doc(EQUIPMENT, `${GIXA}, Table 4.2-II`) },
    { id: 'retrofire', label: 'Retrofire, in the forty-fifth revolution', at: doc(RETRO, `${GIXA}, 5.1.8.3; 71:46:44 in Table 4.2-II`) },
    { id: 'entry-400k', label: '400,000 ft', at: doc(ENTRY_400K, `${GIXA}, 5.1.5.2.3`) },
    { id: 'drogue-deployment', label: 'Drogue parachute', at: doc(DROGUE, `${GIXA}, Figure 5.1.11-1; 72:15:48 in Table 4.2-II`) },
    { id: 'main-deployment', label: 'The main parachute out', at: doc(MAIN, `${GIXA}, Figure 5.1.11-1; 72:17:11 in Table 4.2-II`) },
    {
      id: 'landing-attitude',
      label: 'Two-point suspension: repositioned for the landing',
      at: doc(LANDING_ATTITUDE, `${GIXA}, Figure 5.1.11-1; 72:18:23 in Table 4.2-II`),
    },
    { id: 'splashdown', label: 'Landing', at: doc(LANDING, `${GIXA}, Table 4.2-II`) },
  ],
  checks: [
    ...orbitAfter(3600, 'the phase adjust', 123.6, 146, 'Table 4.3-II, final, after the manoeuvre (planned 117.9 by 148.6)'),
    ...orbitAfter(8100, 'the corrective combination', 124.9, 148.7, 'Table 4.3-II, final (planned 118.0 by 148.5)'),
    ...orbitAfter(10800, 'the coelliptic burn', 145.2, 148, 'Table 4.3-II, final (planned 146.4 by 148.8)'),
    ...orbitAfter(13500, 'the terminal phase initiation', 147.1, 160, 'Table 4.3-II, final (planned 147.2 by 164.9)'),
    ...orbitAfter(
      17100,
      'the first rendezvous',
      157.6,
      161,
      'Table 4.3-II, final, after the terminal phase finalize (planned 158.8 by 161.4)',
    ),
    ...orbitAfter(19800, 'the radial separation', 156.6, 163.3, 'Table 4.3-II, final (planned 157.2 by 161.9)'),
    ...orbitAfter(25200, 'the equi-period rendezvous', 157.6, 161, 'Table 4.3-II, final (planned 158.5 by 161.2)'),
    ...orbitAfter(28800, 'the separation', 156.2, 159.8, 'Table 4.3-II, final (planned 157.8 by 160.5)'),
    ...orbitAfter(67500, 'the phase adjust', 156.5, 159.5, 'Table 4.3-II, final (planned 157.6 by 160.2)'),
    ...orbitAfter(70200, 'the height adjust', 158.2, 166.7, 'Table 4.3-II, final (planned 158.3 by 167.9)'),
    ...orbitAfter(73800, 'the coelliptic burn from above', 166.4, 168.2, 'Table 4.3-II, final (planned 167.0 by 168.7)'),
    ...orbitAfter(76200, 'the terminal phase initiation from above', 158.6, 166.4, 'Table 4.3-II, final (planned 158.5 by 168.0)'),
    ...orbitAfter(
      81000,
      'the third rendezvous',
      156.8,
      160.3,
      'Table 4.3-II, final, after the terminal phase finalize (planned 158.3 by 161.0)',
    ),
    ...orbitAfter(84600, 'the last separation', 155.4, 160, 'Table 4.3-II, final'),
    ...orbitAfter(194400, 'the orbit shaping', 144, 156.5, 'Table 4.3-II, final, after the true anomaly adjust'),
    ...orbitAfter(255600, 'all burns, before retrofire', 143.8, 155.5, 'Table 4.3-IV, final, revolution 45 (retrofire); period 90.19 min'),
    impulse('coelliptic', 'Coelliptic burn, impulse', 53.4, 0.05 * 53.4, 'Table 5.1.5-VI, the guidance system; within 5 per cent'),
    impulse(
      'terminal-phase',
      'Terminal phase initiation, impulse',
      28.4,
      0.1 * 28.4,
      'Table 5.1.5-VI; within 10 per cent, the ground commanding 26.8',
    ),
    impulse('midcourse-1', 'First midcourse correction, impulse', 4.1, 2, 'Table 5.1.5-VI; within 2 ft/s'),
    impulse('midcourse-2', 'Second midcourse correction, impulse', 4.0, 2, 'Table 5.1.5-VI; within 2 ft/s'),
    impulse(
      'terminal-braking',
      'Braking, impulse',
      24,
      8,
      'Table 5.1.5-VI, the resultant of the braking’s pulses; within 8 ft/s, its line not held',
    ),
    impulse('terminal-phase-2', 'Terminal phase initiation, equi-period, impulse', 2.1, 2, 'Table 5.1.5-VI; within 2 ft/s'),
    impulse('midcourse-2-1', 'First midcourse correction, equi-period, impulse', 1.0, 2, 'Table 5.1.5-VI; within 2 ft/s'),
    impulse('midcourse-2-2', 'Intermediate correction, equi-period, impulse', 1.0, 2, 'Table 5.1.5-VI; within 2 ft/s'),
    impulse('midcourse-2-3', 'Second midcourse correction, equi-period, impulse', 3.0, 2, 'Table 5.1.5-VI; within 2 ft/s'),
    impulse(
      'terminal-braking-2',
      'Braking, equi-period, impulse',
      16.3,
      8,
      'Table 5.1.5-VI, the resultant of the braking’s pulses; within 8 ft/s',
    ),
    impulse(
      'coelliptic-3',
      'Coelliptic burn from above, impulse',
      14.4,
      0.05 * 14.4,
      'Table 5.1.5-VI, the crew’s report; within 5 per cent',
    ),
    impulse(
      'terminal-phase-3',
      'Terminal phase initiation from above, impulse',
      18.0,
      0.1 * 18.0,
      'Table 5.1.5-VI; within 10 per cent, the ground commanding 16.7',
    ),
    impulse('midcourse-3-1', 'First midcourse correction from above, impulse', 8, 2, '4.3.1.2.3, "about 8"; within 2 ft/s'),
    impulse('midcourse-3-2', 'Second midcourse correction from above, impulse', 19, 2, '4.3.1.2.3, "about 19"; within 2 ft/s'),
    impulse(
      'terminal-braking-3',
      'Braking from above, impulse',
      20,
      8,
      '4.3.1.2.3, "an effective velocity of about 20 ft/sec"; within 8 ft/s',
    ),
    sighting(
      Math.round(INSERTED),
      'ATDA at the spacecraft’s insertion',
      570 * NMI,
      30 * NMI,
      '"At spacecraft insertion, the range between the Spacecraft 9 and the ATDA was approximately 570 nautical miles" (4.3.1.2.1)',
    ),
    sighting(
      Math.round(TPI),
      'ATDA at the terminal phase initiation',
      25.2 * NMI,
      5 * NMI,
      '"The TPI maneuver was initiated at 3:36:02 g.e.t. when the elevation angle to the ATDA was approximately 27.2 degrees and the range was about 25.2 nautical miles" (4.3.1.2.1)',
    ),
    sighting(
      Math.round(TPI_3),
      'ATDA at the terminal phase initiation from above',
      14.5 * NMI,
      5 * NMI,
      '"an elevation angle to the ATDA of approximately -27.5 degrees at a range of 14.5 nautical miles" (4.3.1.2.3)',
    ),
    {
      id: 'ejectionAt',
      label: 'Drogue out, at about 45,000 ft',
      value: DROGUE,
      unit: 's',
      tolerance: 60,
      confidence: 'documented',
      source: `${GIXA}, Figure 5.1.11-1: 72:15:47.9, planned 72:15:33 (72:15:48 in Table 4.2-II)`,
    },
    {
      id: 'alongTrack',
      label: 'Drogue out, along the track from where it landed',
      value: 0,
      unit: 'm',
      tolerance: 40_000,
      confidence: 'documented',
      source: `${GIXA}, Table 4.3-I: it landed at 27°51′ N 74°56′ W by the radar's best estimate; the drogue comes out a few kilometres short of where it lands`,
    },
    {
      id: 'crossTrack',
      label: 'Drogue out, to the right of where it landed',
      value: 0,
      unit: 'm',
      tolerance: 25_000,
      confidence: 'documented',
      source: `${GIXA}, 5.1.5.2.3: "The position of the spacecraft at drogue parachute deployment was 0.38 nautical mile west of the planned landing point measured by radar-corrected IGS data"`,
    },
  ],
};

/**
 * Gemini-Titan 10 as a flight into orbit: its record (vehicles/gemini-titan-plan.ts `GeminiTitanRecord`), which flight.ts
 * writes its plan from (`geminiTitanPlan`). The record with its sources and disagreements is set out in mission.md beside
 * this file; the numbers live here, each in the source's own units and converted once.
 *
 * Times are seconds from liftoff, 22:20:26.648 UTC, 18 July 1966. The checks' tolerances were written with the record,
 * before the plan was first flown, and nothing here was changed after: a miss is recorded (src/sim/misses.ts), not fitted.
 * The mission report (MSC-G-R-66-7) has this flight's own weights, engines, sequence, manoeuvres, orbits and entry, read
 * in its text layer and on the page; what it lacks (the separation speeds of the adapter's sections, the parachutes'
 * sizes, the retrorockets one by one) is the type's, and says so.
 *
 * The Agena it went up to meet, GATV-5005, is the flight's target (`target`): the report's final tracking vector at its
 * insertion, flown on from there on gravity and the air (sim/plan.ts `TargetDef` `orbit`). The fourth-revolution
 * rendezvous (its coelliptic burn, terminal phase, two corrections and the braking) is made on it, solved as each lights;
 * the phase adjust and plane change before it are flown as recorded. The six burns the Agena made with the pair docked
 * (three of its primary propulsion, to an apogee of 412 nautical miles and up to Gemini VIII's Agena, and three of its
 * secondary) are flown on the spacecraft at the pair's impulse (`thrusters: 'docked'`). The rendezvous with the passive
 * GATV-5003 after the separation is flown at the record's instants and impulses along the lines the guidance system
 * measured: no published orbit of GATV-5003 for July 1966 was found, so it is not a craft in the run (mission.md). The
 * docking, the walks and the visit to GATV-5003 are marks; the separations, the true anomaly adjust, the retrofire and the
 * entry are flown.
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

const GX = 'Gemini Program Mission Report, Gemini X (MSC-G-R-66-7)';
const SP121 = 'Gemini Midprogram Conference (NASA SP-121, 1966)';
const SP138 = 'Gemini Summary Conference (NASA SP-138, 1967)';
const GI = 'Gemini Program Mission Report GT-1 (NTRS 19670095753)';
const CR1106 = 'Project Gemini: A Technical Summary (Malik and Souris, NASA CR-1106, 1968)';
const KING_HELE =
  '“a value of 2.2 is recommended for perigee heights of 150-400 km”, on the cross-section square to the motion (King-Hele, The Prediction of Satellite Lifetimes, RAE TR 87030, 1987, §9.1, after Cook 1965): a satellite’s, as Vostok’s and Mercury’s (vostok-3ka.ts SHIP_RAREFIED). Nothing published for Gemini';

/**
 * GATV-5005 at its insertion, as the report's tracking had it (Table 4-IX, the final vector), on this flight's clock: the
 * Atlas-Agena lifted off 1:40:40.517 before the Titan (Tables 4-I and 4-III). The flight's target is flown from it
 * (`target`), and the docking chapter starts from it (flight.ts `docking.fixes`).
 */
export const INSERTION = targetFix(`${GX}, table 4-IX, final insertion`, -6040.517, 558.27, 28.61, -59.49, 979215, 25366, -0.03, 94.91);

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

// GLV-10's weights with spacecraft 10 aboard (the mission report, 3.3, "obtained from the GLV contractor", read on the
// page): at liftoff, at the first stage's cutoff, at the second stage's start of steady-state combustion, at its cutoff;
// and spacecraft 10 at launch.
const LIFTOFF = 341_164;
const BECO_WT = 86_921;
const STAGE2_STEADY = 73_995;
const SECO_WT = 14_243;
const SC10_LAUNCH = 8_295;
/** What the second stage burned after its cutoff, lb: its shutdown impulse, 35,081 lb-s (5.2.2.1.2), at its specific impulse. */
const SHUTDOWN = 35_081 / 310.53;
/**
 * The usable propellant still in the second stage at its cutoff, lb: "the achieved vehicle performance was 8862 pounds. The
 * achieved payload capability was 568 pounds greater than the spacecraft weight" (5.2), a burning-time margin of 1.61 s:
 * the margin is taken for it, as Gemini-Titan 12's is.
 */
const RESERVE = 568;
const STAGE2_DRY = SECO_WT - SHUTDOWN - RESERVE - SC10_LAUNCH;
const STAGE2_BURNED = STAGE2_STEADY - SECO_WT + SHUTDOWN + RESERVE;
const STAGE1_DRY = BECO_WT - STAGE2_STEADY;
const STAGE2_GROSS = STAGE2_DRY + STAGE2_BURNED;
const STAGE1_GROSS = LIFTOFF - SC10_LAUNCH - STAGE2_GROSS;
// Spacecraft 10's weights through its descent (3.3): at retrofire (the equipment section gone), at 0.05 g (the retrograde
// section gone), at the main parachute's deployment.
const RETROGRADE = 5_578;
const REENTRY = 4_764;
const MAIN_DEPLOY = 4_365;

/** The first stage's two chambers at standard inlet conditions, postflight reconstructed (Table 5.2-I, read on the page). */
const S1_SL = 437_769;
const S1_ISP_SL = 261.03;
/** GLV-1's specific impulse at 155 s over its figure at 5 s (GT-1 report, Table 5-II): how far the type's rose with height. */
const GLV1_RISE = 281.1 / 257.3;
const S1_ISP_VAC = S1_ISP_SL * GLV1_RISE;

/** The record's instants (Tables 4-I and 4-II, read on the page; the manoeuvres' to the tenth from Table 5.1.5-XII). */
const BECO = 152.38;
const STAGING = 153.1;
/** The second stage's chamber pressure rising: GLV-6's stages parted 0.015 s after it (Launch Vehicle No. 6 Flight Evaluation, II.C). */
const LIGHT = STAGING - 0.015;
const SECO = 340.57;
const SEPARATION = 371.44;
/** The thrusters off for the last time after the separation and the insertion velocity adjustment (Table 4-I, note a). */
const INSERTED = 441.65;
const FAIRINGS = SEPARATION + 15;
const PHASE_ADJUST = T(2, 18, 10.8);
const PLANE_CHANGE = T(2, 30, 49.2);
const COELLIPTIC = T(3, 47, 36.0);
const TPI = T(4, 33, 43.8);
const MIDCOURSE = [T(4, 46, 23.4), T(4, 58, 24.1)];
const BRAKING = T(5, 1, 51.5);
/** When the terminal phase's transfer was to bring the ship to the Agena: the terminal phase finalize the crew were last sent (Table 4-II, planned). */
const INTERCEPT = T(5, 6, 15);
const STATION_KEPT = T(5, 15, 0);
const DOCKING = T(5, 52, 37.1);
const DOCKED = [T(7, 38, 34.4), T(20, 20, 12.0), T(22, 37, 6.4), T(27, 45, 36.4), T(41, 4, 26.4), T(41, 35, 50.4)];
const PARTING = T(44, 40, 15.6);
const CORRECTIVE_2 = T(45, 54, 1.0);
const COELLIPTIC_2 = T(46, 9, 29.0);
const TPI_2 = T(47, 26, 43.6);
const MIDCOURSE_2 = [T(47, 34, 9.9), T(47, 38, 58.2)];
const BRAKING_2 = T(47, 39, 10);
const STATION_2 = T(47, 59, 22);
const OUT_OF_PLANE = T(51, 15, 59.9);
const TRUE_ANOMALY = T(51, 38, 51.8);
const EQUIPMENT = T(70, 8, 37);
const RETRO = T(70, 10, 24.5);
const RETRO_GONE = RETRO + 45;
const ENTRY_400K = T(70, 32, 46.7);
const GUIDED = T(70, 34, 55.6);
const DROGUE = T(70, 41, 33.867);
const MAIN = T(70, 42, 53.867);
const LANDING_ATTITUDE = T(70, 43, 29);
const LANDING = T(70, 46, 39);

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

/** The retrofire's push as the guidance system measured it (Table 5.1.5-XII), ft/s: back along the motion and down. */
const RETRO_AFT = 303.0;
const RETRO_DOWN = 118.9;

/**
 * A manoeuvre's attitude from its measured components (Table 5.1.5-XII, the guidance system's, in computer coordinates:
 * "V_X is positive in the direction of motion, V_Y is positive towards the center of the earth, and V_Z is positive to the
 * right of the orbit path (South)", Table 4-VIII, note c), ft/s: the nose along the push for the aft-firing pair, against it
 * for a pair that pushes toward the tail (the forward-firing, and the Agena's engines with the pair docked), as an aim along
 * the motion turned in the level (`yaw`, to the left) and pitched below it (`below`).
 */
const aimed = (
  thrusters: 'aft' | 'forward' | 'docked',
  [forward, down, right]: readonly [number, number, number],
  from = 'Table 5.1.5-XII',
) => {
  const k = thrusters === 'aft' ? 1 : -1;
  const [x, y, z] = [k * forward, -k * right, -k * down];
  const why = `from the push the guidance system measured, ${forward} ft/s forward, ${down} down and ${right} right (${GX}, ${from}), the nose ${thrusters === 'aft' ? 'along it, the aft-firing pair pushing toward the nose' : 'against it, the push toward the tail'}`;
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
    source: `${GX}, ${where}: ${nmi} nautical miles. Read at ${new Date(at * 1000).toISOString().slice(11, 19)}`,
  }));
/** The impulse a manoeuvre gave (`<id>.velocity`, orbital.ts `OrbitResults`), ft/s, and how near. */
const impulse = (id: string, label: string, fps: number, within: number, where: string) => ({
  id: `${id}.velocity` as const,
  label,
  value: fps * FT,
  unit: 'm/s',
  tolerance: within * FT,
  confidence: 'documented' as const,
  source: `${GX}, ${where}: ${fps} ft/s`,
});
/** How far the Agena was at an instant (gemini-titan-plan.ts: `at-<s>.range`), m. */
const sighting = (at: number, label: string, value: number, within: number, where: string) => ({
  id: `at-${at}.range` as const,
  label,
  value,
  unit: 'm',
  tolerance: within,
  confidence: 'documented' as const,
  source: `${GX}, ${where}`,
});

export const orbital: GeminiTitanRecord = {
  liftoffMass: doc(
    LIFTOFF * LB,
    `341,164 lb at liftoff with spacecraft 10 (${GX}, 3.3); 344,856 lb at the first stage's ignition. The stages' figures below are worked from the same table and sum to it`,
  ),
  titan: {
    first: {
      name: 'Titan first stage',
      nodes: ['TitanStage1', 'TitanStage1Engine', 'TitanInterstage'],
      mass: derived(
        STAGE1_GROSS * LB,
        `GLV-10 at liftoff (341,164 lb) less spacecraft 10 (8,295 lb) and the second stage (${STAGE2_GROSS.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb, below): ${STAGE1_GROSS.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb (${GX}, 3.3). The interstage goes with it`,
      ),
      dry: derived(
        STAGE1_DRY * LB,
        `the vehicle at the first stage's cutoff (86,921 lb) less at the second stage's start of steady-state combustion (73,995 lb): ${STAGE1_DRY.toLocaleString('en-US')} lb with what was left in its tanks (${GX}, 3.3), 1,621 lb of oxidiser among it, "the highest value for all GLV flights to date" (5.2)`,
      ),
      propellant: derived(
        (STAGE1_GROSS - STAGE1_DRY) * LB,
        `the stage at liftoff less as it was let go: ${(STAGE1_GROSS - STAGE1_DRY).toLocaleString('en-US', { maximumFractionDigits: 0 })} lb burned from liftoff (${GX}, 3.3); "a fuel depletion shutdown for the third successive mission" (5.2)`,
      ),
      engine: {
        // (its two chambers on the one stage as one engine: a plan's engine count is its body's units, plan.ts `BodyDef.count`)
        name: 'Aerojet LR87-AJ-7 (two chambers)',
        count: 1,
        thrust: {
          seaLevel: assumed(
            S1_SL * LBF,
            `GLV-10's own, postflight reconstructed at standard inlet conditions, 437,769 lb (predicted 439,214: ${GX}, Table 5.2-I, read on the page), taken as the sea-level figure, as an acceptance test's is (GLV-6's at standard inlet, 427,396 lb, is within 0.1 per cent of its acceptance test: Launch Vehicle No. 6 Flight Evaluation, Table III-3). The flight's average, 462,750 lb, lies between this and the vacuum figure below`,
          ),
          vacuum: derived(
            (S1_SL * S1_ISP_VAC * LBF) / S1_ISP_SL,
            `the sea-level figure at the vacuum specific impulse over the sea-level one (the same flow): ${Math.round((S1_SL * S1_ISP_VAC) / S1_ISP_SL).toLocaleString('en-US')} lb for the two`,
          ),
        },
        isp: {
          seaLevel: assumed(
            S1_ISP_SL,
            `GLV-10's at standard inlet conditions, 261.03 s (predicted 260.48: ${GX}, Table 5.2-I), taken as the sea-level figure`,
          ),
          vacuum: assumed(
            S1_ISP_VAC,
            `GLV-10's 261.03 s raised as GLV-1's rose from 5 s to 155 s, 257.3 to 281.1 s (${GI}, Table 5-II): ${S1_ISP_VAC.toFixed(2)} s. GLV-10's own flight average was 277.83 s (${GX}, Table 5.2-I), between the two`,
          ),
        },
        nozzle: GLV_NOZZLES.first,
      },
      ignition: doc(0, `started on the pad, the ignition signal (87FS1) at -3.26 s (${GX}, Table 4-I): the run begins at release`),
      cutoff: doc(BECO, `87FS2, stage I engine cutoff, at 152.38 s, as planned (${GX}, Table 4-I, read on the page)`),
    },
    second: {
      name: 'Titan second stage',
      nodes: ['TitanStage2', 'TitanStage2Engine'],
      mass: derived(
        STAGE2_GROSS * LB,
        `its weight at cutoff and what it burned, below: ${STAGE2_GROSS.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb (${GX}, 3.3)`,
      ),
      dry: assumed(
        STAGE2_DRY * LB,
        `the vehicle at the second stage's cutoff (14,243 lb) less spacecraft 10 (8,295 lb), what the engine burned after its cutoff signal (its shutdown impulse of 35,081 lb-s at 310.53 s, ${SHUTDOWN.toFixed(0)} lb, burned at full thrust here) and the usable propellant it still held, taken as the vehicle's achieved payload capability over the spacecraft, 568 lb: ${STAGE2_DRY.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb (${GX}, 3.3, 5.2 and 5.2.2.1.2)`,
      ),
      propellant: assumed(
        STAGE2_BURNED * LB,
        `what it could burn from the start of its steady burn: ${STAGE2_BURNED.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb, from 73,995 lb to its cutoff at 14,243, the shutdown's ${SHUTDOWN.toFixed(0)} lb after it, and the 568 lb of margin (${GX}, 3.3, 5.2 and 5.2.2.1.2). The run's guidance cuts it on the orbit, as the radio guidance did`,
      ),
      engine: {
        name: 'Aerojet LR91-AJ-7',
        count: 1,
        thrust: {
          vacuum: doc(
            99_168 * LBF,
            `GLV-10's flight average, postflight reconstructed, 99,168 lb (predicted 99,242: ${GX}, Table 5.2-II, read on the page)`,
          ),
        },
        isp: { vacuum: doc(310.53, `GLV-10's flight average, 310.53 s (predicted 310.07: ${GX}, Table 5.2-II)`) },
        nozzle: GLV_NOZZLES.second,
      },
      ignition: assumed(
        LIGHT,
        `its thrust from the chamber pressure's rise, which on GLV-6 was 0.015 s before the stages parted (Launch Vehicle No. 6 Flight Evaluation, II.C, and Table II-4): here 153.10 s less that, with the stages still joined. The ignition signal, 91FS1, was at 152.38 s with the first stage's cutoff (${GX}, Table 4-I); the engine's MDFJPS made at 153.02`,
      ),
      cutoff: doc(SECO, `91FS2 at 340.57 s, planned 339.74; the redundant shutdown at 340.61 (${GX}, Table 4-I)`),
    },
    staging: doc(STAGING, `"Stage separation begin" at 153.10 s, 0.72 s after the staging signal (${GX}, Table 4-I)`),
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
    at: doc(SEPARATION, `"Spacecraft separation (shaped charge fired)" at 371.44 s, planned 369.74 (${GX}, Table 4-I)`),
    push: derived(
      (1.5 * FT * (SC10_LAUNCH + STAGE2_DRY)) / STAGE2_DRY,
      `the 1.5 ft/s the spacecraft's guidance measured for the separation (${GX}, Table 5.1.5-XII), "a separation maneuver of 0.7 seconds" (Table 4-I, note a), as the joint's push shared by the masses as every separation is (the empty second stage ${STAGE2_DRY.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb)`,
    ),
    mass: derived(
      SC10_LAUNCH * LB,
      `the spacecraft at launch, 8,295 lb (${GX}, 3.3): what stayed on the launch vehicle and the fairings thrown off after are not read`,
    ),
  },
  ascent: {
    guidance: {
      azimuth: doc(98.8, `"Roll program start (launch azimuth = 98.8 deg)" at 9.35 s, its end at 20.45 (${GX}, Table 4-I)`),
      vertical: doc(23.0, `up the plumb line until "Pitch program rate no. 1 start" at 23.00 s, planned 23.04 (${GX}, Table 4-I)`),
      kick: estimated(15, 's: the stored pitch programme’s rates are not in the report; a pitch-over of fifteen seconds is ours'),
      turn: estimated(
        BECO,
        's: the radio guidance’s closed loop flown as the law’s linear tangent from staging; the first stage’s programme before it. The radio guidance was enabled at 162.13 s and its first command came at 168.27 (Table 4-I)',
      ),
      target: {
        at: 'seco',
        altitude: doc(
          527_252 * FT,
          `${GX}, Table 4-V, final: 527,252 ft at the second stage's cutoff, a geodetic height (its elements over the oblate earth, Table 4-VI, note b)`,
        ),
        over: 'ellipsoid',
        climb: doc(0, `${GX}, Table 4-V, final: 0° space-fixed at cutoff`),
        inclination: doc(
          28.87,
          `${GX}, Table 4-VI, actual, at insertion: 28.87°; "the out-of-plane velocity error resulting after the GLV ascent yaw steering was 5.4 ft/sec" (4.3.1.2.1)`,
        ),
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
      'the spacecraft’s centre of mass at the heat shield’s rim, Z103.44 (the model’s origin): spacecraft 10’s at launch was at Z104.68 (the mission report, 3.3), its own Z reference 13.44 in aft of the mating plane; not reduced to the model’s',
    ),
    sheds: [
      {
        on: 'staging-nuts',
        name: 'Titan first stage',
        from: doc(0, 'the first stage engines’ exit plane, station 1348.103 (titan-ii-glv.md)'),
        to: derived(STATION(500), 'the separation plane, station 500, with the interstage on it (titan-ii-glv.md)'),
        radius: doc(60 * IN, 'the 120 in tank (titan-ii-glv.md)'),
        mass: derived(STAGE1_DRY * LB, 'GLV-10’s as it was let go (as the plan’s, above)'),
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
        mass: derived(STAGE2_DRY * LB, 'GLV-10’s at cutoff less the spacecraft (as the plan’s)'),
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
        mass: derived((SC10_LAUNCH - RETROGRADE) * LB, 'the spacecraft at launch less at retrofire (as the plan’s, below)'),
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
        value: 86.3 * NMI,
        unit: 'm',
        tolerance: 12_000,
        confidence: 'documented',
        source: `${GX}, Table 4-VI, actual, at insertion: 86.3 nautical miles (planned 86.7); the separation and insertion velocity adjustment in it`,
      },
      {
        id: 'apogee',
        label: 'Apogee at insertion',
        value: 145.1 * NMI,
        unit: 'm',
        tolerance: 25_000,
        confidence: 'documented',
        source: `${GX}, Table 4-VI: 145.1 nautical miles (planned 145.2)`,
      },
      {
        id: 'inclination',
        label: 'Inclination',
        value: 28.87,
        unit: '°',
        tolerance: 0.25,
        confidence: 'documented',
        source: `${GX}, Table 4-VI`,
      },
      {
        id: 'cutoffSpeed',
        label: 'Speed at insertion, space-fixed',
        value: (25_712 + 25.3) * FT,
        unit: 'm/s',
        tolerance: 30,
        confidence: 'derived',
        source: `${GX}, Table 4-V, final: 25,712 ft/s at the spacecraft's separation, 371.42 s, with the second stage's shutdown impulse in it, and the 25.3 ft/s along the motion the insertion velocity adjustment then gave (Table 5.1.5-XII): 25,737.3. The run's guidance cuts the stage on the orbit at insertion, so the adjustment is in its cut`,
      },
    ],
  },
  orbit: {
    over: {
      is: 'oblate',
      confidence: 'documented',
      source: `${GX}, Table 4-VI, note b: "Actual elements are measured over an oblate earth. Period and inclination are osculating elements". The ellipsoid is WGS 84’s, not the report's`,
    },
    perigee: doc(86.3 * NMI, `${GX}, Table 4-VI, actual, revolution 1 (insertion): 86.3 nautical miles; ${CHRONOLOGY}`),
    apogee: doc(145.1 * NMI, `${GX}, Table 4-VI: 145.1 nautical miles`),
    inclination: doc(28.87, `${GX}, Table 4-VI`),
    // (no period: the report's 88.79 min, Table 4-VI, is osculating (note b), not its heights' orbit flown perigee to
    // perigee over the oblate earth; the heights are the orbit flown, as Gemini XII's are: mission.md)
  },
  injection: {
    at: doc(
      INSERTED,
      `${GX}, Table 4-I: "OAMS off (final)" at 441.65 s, "a separation maneuver of 0.7 seconds and an Insertion Velocity Adjust Routine (IVAR) maneuver of 34.6 seconds" (note a): the published orbit is the one after them (Table 4-VI)`,
    ),
    heading: 'south',
    arc: derived(
      (588.0 * NMI) / 6_371_000 / (Math.PI / 180),
      `degrees: the range at separation, 588.0 nautical miles (${GX}, Table 4-V, final), over the Earth's mean radius. Flying the ascent replaces it`,
    ),
    anomaly: derived(
      1.0,
      `degrees: from the flight-path angle at separation, +0.01° (${GX}, Table 4-V, final), on the published orbit’s eccentricity, 0.0083: tan γ = e sin ν / (1 + e cos ν), so a degree past perigee. Flying the ascent replaces it`,
    ),
  },
  mass: derived(
    SC10_LAUNCH * LB,
    `the spacecraft at launch, 8,295 lb (${GX}, 3.3), taken for it in orbit: what it left on the launch vehicle, the fairings and the propellant its burns took are not taken off`,
  ),
  rarefied: {
    drag: assumed(2.2, KING_HELE),
    area: estimated(
      (OUTSIDE / 4) * IN * IN,
      `m²: a quarter of the orbit configuration's whole outside, ${(OUTSIDE * IN * IN).toFixed(1)} m², which is what a convex body presents on the average over every way it can lie (Cauchy): the ship was turned for each burn and alignment, held on two Agenas, docked to one for two days, and how it lay between was not recorded`,
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
    docked: {
      name: 'GATV-5005’s engines, docked',
      count: 1,
      thrust: assumed(
        16_000 * LBF,
        '16,000 lb, the Agena’s Bell 8247: "turbopump-fed 16,000-pound thrust engine" (Launch Systems Final Report, p. III.C-13; gemini-targets.ts agenaMotors), firing aft on the Agena and so toward the docked spacecraft’s tail; three of the six docked burns were its secondary propulsion’s 200 lb chambers. What a docked burn gives is the record’s impulse over the record’s interval; this is only how hard it can push',
      ),
      isp: assumed(
        293,
        's, the 8247’s, as the Agenas’ own runs take it (vehicles/target-plan.ts): nothing reads it, the docked burns drawing on no tank of the spacecraft’s',
      ),
    },
  },
  // Each from the report's Table 4-VIII (planned, ground commanded and actual) and Table 5.1.5-XII (the guidance system's
  // components), read on the page. The first rendezvous is made on GATV-5005 (`toward`), the record's impulse then a check
  // (`checks`), the burns before it flown as recorded; the six docked burns are the Agena's, flown on the spacecraft at the
  // pair's impulse; the rendezvous with Gemini VIII's Agena after the separation is flown as recorded, that Agena being in
  // the run as no craft (no orbit of it for July 1966 was found).
  moves: [
    {
      id: 'phase-adjust',
      label: 'Phase adjust: the perigee raised',
      thrusters: 'aft',
      attitude: {
        label: 'Blunt end aft, along the motion',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [55.8, -0.2, 0.4]),
        confidence: 'derived',
        source: `pitch 0, yaw 0 (${GX}, Table 4-VIII, actual)`,
      },
      turned: estimated(PHASE_ADJUST - 120, 'in its attitude two minutes before: not read'),
      on: doc(PHASE_ADJUST, `2:18:10.8, ground commanded 2:18:09 (${GX}, Tables 4-II and 5.1.5-XII)`),
      off: doc(PHASE_ADJUST + 75, `75.0 s with the zeroing of the indicator (${GX}, Table 4-VIII)`),
      deltaV: doc(
        55.8 * FT,
        `55.8 ft/s, commanded 55.9 (${GX}, Table 5.1.5-XII): the perigee from 86.3 to 117.2 nautical miles (Table 4-VII)`,
      ),
    },
    {
      id: 'plane-change',
      label: 'Plane change: into the Agena’s plane',
      thrusters: 'aft',
      attitude: {
        label: 'Yawed 90° left',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [-0.1, -0.5, -10.5]),
        confidence: 'derived',
        source: `pitch 2.0°, yaw 90.0° (${GX}, Table 4-VIII, actual)`,
      },
      turned: estimated(PLANE_CHANGE - 120, 'in its attitude two minutes before: not read'),
      on: doc(PLANE_CHANGE, `2:30:49.2, as commanded (${GX}, Tables 4-II and 5.1.5-XII)`),
      off: doc(PLANE_CHANGE + 95, `95.0 s with the zeroing of the indicator, commanded 13.0 (${GX}, Table 4-VIII, note a)`),
      deltaV: doc(10.5 * FT, `10.5 ft/s, commanded 9.6 (${GX}, Table 5.1.5-XII)`),
    },
    {
      id: 'coelliptic',
      label: 'Coelliptic burn: some 16 nautical miles under the Agena',
      thrusters: 'aft',
      attitude: {
        label: 'Blunt end aft, pitched up 7°',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [47.5, -6.1, -0.4]),
        confidence: 'derived',
        source: `"performed orthogonally, with ΔV's of 47 ft/sec forward and 5 ft/sec up" (${GX}, Table 4-VIII, note b); "the differential altitude ... was about 15.6 to 16.5 nautical miles" (4.3.1.2.1)`,
      },
      turned: estimated(COELLIPTIC - 120, 'in its attitude two minutes before: not read'),
      on: doc(COELLIPTIC, `3:47:36.0, ground commanded 3:47:34 (${GX}, Tables 4-II and 5.1.5-XII)`),
      off: doc(COELLIPTIC + 65, `65.0 s (${GX}, Table 4-VIII)`),
      deltaV: doc(47.5 * FT, `47.5 ft/s, commanded 48.7 (${GX}, Table 5.1.5-XII): the record’s, held against the solved burn`),
      toward: { coelliptic: true },
    },
    {
      id: 'terminal-phase',
      label: 'Terminal phase initiation: toward the Agena',
      thrusters: 'aft',
      attitude: {
        label: 'Pitched up 26°, on the line of sight',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [37.0, -20.5, 0.2]),
        confidence: 'derived',
        source: `pitch 26.2°, yaw 0.0° (${GX}, Table 4-VIII, actual); lit "when the elevation angle to the Gemini X GATV was approximately 26.0 degrees and the range was about 37 nautical miles" (4.3.1.2.1)`,
      },
      turned: estimated(TPI - 120, 'in its attitude two minutes before: not read'),
      on: doc(TPI, `4:33:43.8, ground commanded 4:34:05 (${GX}, Tables 4-II and 5.1.5-XII)`),
      off: doc(TPI + 55, `55.0 s with the zeroing of the indicator, commanded 45.0 (${GX}, Table 4-VIII)`),
      deltaV: doc(42.3 * FT, `42.3 ft/s, ground commanded 34.0 (${GX}, Table 5.1.5-XII): the record’s, held against the solved burn`),
      toward: {
        reach: { ahead: derived(0, 'the Agena itself'), above: derived(0, 'the Agena itself') },
        at: doc(
          INTERCEPT,
          `the terminal phase finalize the crew were last sent, 5:06:15 (${GX}, Table 4-II, planned): when the transfer was to arrive`,
        ),
      },
    },
    {
      id: 'midcourse-1',
      label: 'The 82° correction',
      thrusters: 'forward',
      attitude: {
        label: 'On the line of sight to the Agena',
        aim: 'velocity',
        sense: 1,
        ...aimed('forward', [-2.5, 20.3, 0.9]),
        confidence: 'derived',
        source: `the line of sight to the Agena about 42.0° up and 1.2° across (${GX}, Table 4-VIII, note d): the pair whose push is nearest taken`,
      },
      turned: estimated(MIDCOURSE[0]! - 60, 'on the Agena from the terminal phase on'),
      on: doc(MIDCOURSE[0]!, `4:46:23.4, not computed on the ground (${GX}, Tables 4-VIII and 5.1.5-XII)`),
      off: doc(MIDCOURSE[0]! + 54, `54.0 s (${GX}, Table 4-VIII)`),
      deltaV: doc(20.4 * FT, `20.4 ft/s (${GX}, Table 5.1.5-XII): the record’s, held against the solved burn`),
      toward: {
        reach: { ahead: derived(0, 'the Agena itself'), above: derived(0, 'the Agena itself') },
        at: doc(INTERCEPT, 'as the terminal phase’s'),
      },
    },
    {
      id: 'midcourse-2',
      label: 'The 34° correction',
      thrusters: 'aft',
      attitude: {
        label: 'On the line of sight to the Agena',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [23.0, 1.1, -4.0]),
        confidence: 'derived',
        source: `the line of sight to the Agena about 63.0° up and 6.0° across (${GX}, Table 4-VIII, note d): "The actual midcourse corrections applied resulted in a non-nominal closing trajectory" (4.3.1.2.1)`,
      },
      turned: estimated(MIDCOURSE[1]! - 60, 'on the Agena from the terminal phase on'),
      on: doc(MIDCOURSE[1]!, `4:58:24.1 (${GX}, Tables 4-VIII and 5.1.5-XII)`),
      off: doc(MIDCOURSE[1]! + 73, `73.0 s (${GX}, Table 4-VIII)`),
      deltaV: doc(23.4 * FT, `23.4 ft/s (${GX}, Table 5.1.5-XII; 32.0 in Table 4-VIII): the record’s, held against the solved burn`),
      toward: {
        reach: { ahead: derived(0, 'the Agena itself'), above: derived(0, 'the Agena itself') },
        at: doc(INTERCEPT, 'as the terminal phase’s'),
      },
    },
    {
      id: 'terminal-braking',
      label: 'Braking: to the Agena, and station kept to the docking',
      thrusters: 'forward',
      attitude: {
        label: 'Nose on the Agena, the forward-firing pair braking',
        aim: 'velocity',
        sense: 1,
        ...aimed('forward', [5.9, 64.7, 11.8]),
        confidence: 'derived',
        source: `the resultant of the braking’s pulses as the guidance system measured it (${GX}, Table 5.1.5-XII): braking is along the line of sight`,
      },
      turned: estimated(BRAKING - 60, 'on the Agena from the terminal phase on'),
      on: doc(BRAKING, `5:01:51.5, the planned 5:06:15 (${GX}, Tables 4-II and 5.1.5-XII)`),
      off: doc(BRAKING + 900, `"Braking lasted intermittently for about 15 minutes" (${GX}, Table 4-VIII, note f)`),
      deltaV: doc(
        66 * FT,
        `66 ft/s, "the resultant ΔV applied during the braking; however, the total ΔV expended during the semi-optical approach was about 350 ft/sec" (${GX}, Table 4-VIII, note e): the record’s, held against the braking flown`,
      ),
      toward: {
        station: {
          ahead: estimated(
            200 * FT,
            `"At 5 hours 15 minutes g.e.t., the spacecraft was less than 200 feet from the Gemini X GATV, and the crew was station keeping" (${GX}, 4.3.1.2.1): taken at 200 ft, along the track, the Agena ahead`,
          ),
          above: estimated(0, 'not read: level with it'),
        },
        until: doc(DOCKING, `the first docking, 5:52:37 (${GX}, 4.1): the docking itself is not flown`),
      },
    },
    {
      id: 'docked-phase-adjust',
      label: 'Docked phase adjust: the apogee to 412 nautical miles',
      thrusters: 'docked',
      attitude: {
        label: 'The pair turned to the burn, the Agena’s engine firing toward the spacecraft',
        aim: 'velocity',
        sense: 1,
        ...aimed('docked', [423.3, 0.1, -13.6]),
        confidence: 'derived',
        source: `"The Gemini X GATV primary propulsion system (PPS) was used to apply the ground-commanded ΔV of 420 ft/sec ... raised the spacecraft apogee to 412 nautical miles" (4.3.1.2.2), the PPS at 75 per cent of full thrust (Table 4-VIII, note g) (${GX}, Tables 4-IV, 4-VIII and 5.1.5-XII)`,
      },
      turned: estimated(DOCKED[0]! - 120, 'in its attitude two minutes before: not read'),
      on: doc(DOCKED[0]!, `as the ground commanded (${GX}, Tables 4-IV and 5.1.5-XII)`),
      off: doc(DOCKED[0]! + 80, `80.0 s with the zeroing of the indicator (${GX}, Table 4-VIII, note a)`),
      deltaV: doc(423.6 * FT, `423.6 ft/s by the guidance system (${GX}, Table 5.1.5-XII), the pair’s, the Agena’s primary propulsion`),
    },
    {
      id: 'docked-height-adjust',
      label: 'Docked height adjust: the apogee down to 206 nautical miles',
      thrusters: 'docked',
      attitude: {
        label: 'The pair turned to the burn, the Agena’s engine firing toward the spacecraft',
        aim: 'velocity',
        sense: 1,
        ...aimed('docked', [-346.2, 6.2, -1.3]),
        confidence: 'derived',
        source: `"The near-nominal ΔV of 346 ft/sec lowered the spacecraft apogee to approximately 206 nautical miles" (4.3.1.2.2), yaw 180° (${GX}, Tables 4-IV, 4-VIII and 5.1.5-XII)`,
      },
      turned: estimated(DOCKED[1]! - 120, 'in its attitude two minutes before: not read'),
      on: doc(DOCKED[1]!, `as the ground commanded (${GX}, Tables 4-IV and 5.1.5-XII)`),
      off: doc(DOCKED[1]! + 78, `78.0 s with the zeroing of the indicator (${GX}, Table 4-VIII, note a)`),
      deltaV: doc(346.3 * FT, `346.3 ft/s by the guidance system (${GX}, Table 5.1.5-XII), the pair’s, the Agena’s primary propulsion`),
    },
    {
      id: 'docked-coelliptic',
      label: 'Docked coelliptic: nine miles under Gemini VIII’s Agena',
      thrusters: 'docked',
      attitude: {
        label: 'The pair turned to the burn, the Agena’s engine firing toward the spacecraft',
        aim: 'velocity',
        sense: 1,
        ...aimed('docked', [82.1, -1.4, -0.8]),
        confidence: 'derived',
        source: `"This maneuver circularized the orbit of the docked vehicles about nine miles below the orbit of the Gemini VIII GATV" (4.3.1.2.2) (${GX}, Tables 4-IV, 4-VIII and 5.1.5-XII)`,
      },
      turned: estimated(DOCKED[2]! - 120, 'in its attitude two minutes before: not read'),
      on: doc(DOCKED[2]!, `as the ground commanded (${GX}, Tables 4-IV and 5.1.5-XII)`),
      off: doc(DOCKED[2]! + 70, `70.0 s with the zeroing of the indicator (${GX}, Table 4-VIII, note a)`),
      deltaV: doc(82.2 * FT, `82.2 ft/s by the guidance system (${GX}, Table 5.1.5-XII), the pair’s, the Agena’s primary propulsion`),
    },
    {
      id: 'docked-phase-adjust-2',
      label: 'Docked phase adjust, on the Agena’s secondary propulsion',
      thrusters: 'docked',
      attitude: {
        label: 'The pair turned to the burn, the Agena’s engine firing toward the spacecraft',
        aim: 'velocity',
        sense: 1,
        ...aimed('docked', [9.7, -0.2, -0.1]),
        confidence: 'derived',
        source: `"the Gemini X GATV secondary propulsion system (SPS) was used to perform a phase adjust maneuver of 9.7 ft/sec, the first of the shaping maneuvers" (4.3.1.2.2) (${GX}, Tables 4-IV, 4-VIII and 5.1.5-XII)`,
      },
      turned: estimated(DOCKED[3]! - 120, 'in its attitude two minutes before: not read'),
      on: doc(DOCKED[3]!, `as the ground commanded (${GX}, Tables 4-IV and 5.1.5-XII)`),
      off: doc(DOCKED[3]! + 10, `10.0 s with the zeroing of the indicator (${GX}, Table 4-VIII, note a)`),
      deltaV: doc(9.7 * FT, `9.7 ft/s by the guidance system (${GX}, Table 5.1.5-XII), the pair’s, the Agena’s secondary propulsion`),
    },
    {
      id: 'docked-plane-change',
      label: 'Docked plane change, on the Agena’s secondary propulsion',
      thrusters: 'docked',
      attitude: {
        label: 'The pair turned to the burn, the Agena’s engine firing toward the spacecraft',
        aim: 'velocity',
        sense: 1,
        ...aimed('docked', [0.5, 0.4, 16]),
        confidence: 'derived',
        source: `"the SPS was used to apply a plane change maneuver of 16 ft/sec" (4.3.1.2.2), yaw -90° (${GX}, Tables 4-IV, 4-VIII and 5.1.5-XII)`,
      },
      turned: estimated(DOCKED[4]! - 120, 'in its attitude two minutes before: not read'),
      on: doc(DOCKED[4]!, `as the ground commanded (${GX}, Tables 4-IV and 5.1.5-XII)`),
      off: doc(DOCKED[4]! + 20, `20.0 s with the zeroing of the indicator (${GX}, Table 4-VIII, note a)`),
      deltaV: doc(16 * FT, `16 ft/s by the guidance system (${GX}, Table 5.1.5-XII), the pair’s, the Agena’s secondary propulsion`),
    },
    {
      id: 'docked-phase-adjust-3',
      label: 'Docked phase adjust, on the Agena’s secondary propulsion',
      thrusters: 'docked',
      attitude: {
        label: 'The pair turned to the burn, the Agena’s engine firing toward the spacecraft',
        aim: 'velocity',
        sense: 1,
        ...aimed('docked', [-4.4, 0.1, -0.1]),
        confidence: 'derived',
        source: `"a phase adjust maneuver of 4.4 ft/sec" (4.3.1.2.2), yaw 180° (${GX}, Tables 4-IV, 4-VIII and 5.1.5-XII)`,
      },
      turned: estimated(DOCKED[5]! - 120, 'in its attitude two minutes before: not read'),
      on: doc(DOCKED[5]!, `as the ground commanded (${GX}, Tables 4-IV and 5.1.5-XII)`),
      off: doc(DOCKED[5]! + 4, `4.0 s with the zeroing of the indicator (${GX}, Table 4-VIII, note a)`),
      deltaV: doc(4.4 * FT, `4.4 ft/s by the guidance system (${GX}, Table 5.1.5-XII), the pair’s, the Agena’s secondary propulsion`),
    },
    {
      id: 'agena-separation',
      label: 'Separation from the Agena: a vernier phase adjustment',
      thrusters: 'aft',
      attitude: {
        label: 'Blunt end aft, along the motion',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [2.0, -0.1, -0.1]),
        confidence: 'derived',
        source: `pitch 0, yaw 0 (${GX}, Table 4-VIII, actual): "separated from the Gemini X GATV at approximately 44:40:16 g.e.t. with a ΔV of 2.0 ft/sec. This maneuver also served as a vernier phase adjustment" (4.3.1.2.2)`,
      },
      turned: estimated(PARTING - 120, 'in its attitude two minutes before: not read'),
      on: doc(PARTING, `44:40:15.6, ground commanded 44:40:15 (${GX}, Tables 4-VIII and 5.1.5-XII)`),
      off: doc(PARTING + 3, `3.0 s, as commanded (${GX}, Table 4-VIII)`),
      deltaV: doc(2 * FT, `2.0 ft/s, commanded 1.5 (${GX}, Table 5.1.5-XII)`),
    },
    {
      id: 'corrective-combination',
      label: 'Corrective combination, toward Gemini VIII’s Agena',
      thrusters: 'aft',
      attitude: {
        label: 'Pitched up 65° and yawed 53° right',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [1.2, -3.8, 1.3]),
        confidence: 'derived',
        source: `pitch 65.0°, yaw -53.0° (${GX}, Table 4-VIII, actual)`,
      },
      turned: estimated(CORRECTIVE_2 - 120, 'in its attitude two minutes before: not read'),
      on: doc(CORRECTIVE_2, `45:54:01.0, as commanded (${GX}, Tables 4-VIII and 5.1.5-XII)`),
      off: doc(CORRECTIVE_2 + 6, `6.0 s, as commanded (${GX}, Table 4-VIII)`),
      deltaV: doc(4.2 * FT, `4.2 ft/s, as commanded (${GX}, Table 5.1.5-XII)`),
    },
    {
      id: 'coelliptic-2',
      label: 'Coelliptic burn: some 7 nautical miles under Gemini VIII’s Agena',
      thrusters: 'aft',
      attitude: {
        label: 'Nose down, the aft-firing pair pushing down',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [1.0, 10.6, 0.2]),
        confidence: 'derived',
        source: `pitch -85.0°, yaw 0 (${GX}, Table 4-VIII, actual): "allowed Spacecraft 10 to achieve a Δh of approximately 7.2 nautical miles with the passive Gemini VIII GATV" (4.3.1.2.2)`,
      },
      turned: estimated(COELLIPTIC_2 - 120, 'in its attitude two minutes before: not read'),
      on: doc(COELLIPTIC_2, `46:09:29.0, ground commanded 46:09:28 (${GX}, Tables 4-VIII and 5.1.5-XII)`),
      off: doc(COELLIPTIC_2 + 15, `15.0 s, commanded 12.0 (${GX}, Table 4-VIII)`),
      deltaV: doc(10.6 * FT, `10.6 ft/s, commanded 9.8 (${GX}, Table 5.1.5-XII; 10.64 in Table 4-VIII)`),
    },
    {
      id: 'terminal-phase-2',
      label: 'Terminal phase initiation toward Gemini VIII’s Agena',
      thrusters: 'aft',
      attitude: {
        label: 'Pitched up 33°, on the line of sight',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [18.7, -12.1, -0.9]),
        confidence: 'derived',
        source: `the line of sight about 31.0° up (${GX}, Table 4-VIII, note d): "At TPI, the relative range between the spacecraft and the passive GATV was about 14.2 nautical miles and the elevation angle to the target was about 31 degrees" (4.3.1.2.2)`,
      },
      turned: estimated(TPI_2 - 120, 'in its attitude two minutes before: not read'),
      on: doc(TPI_2, `47:26:43.6, ground commanded 47:27:20 (${GX}, Tables 4-VIII and 5.1.5-XII)`),
      off: doc(TPI_2 + 26, `26.0 s, commanded 31.0 (${GX}, Table 4-VIII)`),
      deltaV: doc(22.3 * FT, `22.3 ft/s, ground commanded 25.1 (${GX}, Table 5.1.5-XII)`),
    },
    {
      id: 'vernier-1',
      label: 'First correction toward Gemini VIII’s Agena',
      thrusters: 'aft',
      attitude: {
        label: 'On the line of sight to the Agena',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [4.4, 1.1, 0.2]),
        confidence: 'derived',
        source: `the line of sight about 44.0° up and 3.0° across (${GX}, Table 4-VIII, note d), computed "entirely by means of onboard optical techniques" (4.3.1.2.2)`,
      },
      turned: estimated(MIDCOURSE_2[0]! - 60, 'on the Agena from the terminal phase on'),
      on: doc(MIDCOURSE_2[0]!, `47:34:09.9 (${GX}, Tables 4-VIII and 5.1.5-XII)`),
      off: doc(MIDCOURSE_2[0]! + 9, `9.0 s (${GX}, Table 4-VIII)`),
      deltaV: doc(4.5 * FT, `4.5 ft/s (${GX}, Table 5.1.5-XII; 4.4 in Table 4-VIII)`),
    },
    {
      id: 'vernier-2',
      label: 'Second correction toward Gemini VIII’s Agena',
      thrusters: 'aft',
      attitude: {
        label: 'On the line of sight to the Agena',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [0.3, -1.5, -3.6]),
        confidence: 'derived',
        source: `the line of sight about 56.0° up and 9.0° across (${GX}, Table 4-VIII, note d): the guidance system’s components (Table 5.1.5-XII), where Table 4-VIII has 0.5, -1.3, -0.4`,
      },
      turned: estimated(MIDCOURSE_2[1]! - 60, 'on the Agena from the terminal phase on'),
      on: doc(MIDCOURSE_2[1]!, `47:38:58.2 (${GX}, Tables 4-VIII and 5.1.5-XII)`),
      off: estimated(MIDCOURSE_2[1]! + 10, `the 3.9 ft/s at the aft-firing pair’s thrust: Table 4-VIII’s 1.2 s goes with its 0.9 ft/s`),
      deltaV: doc(3.9 * FT, `3.9 ft/s (${GX}, Table 5.1.5-XII; 0.9 in Table 4-VIII)`),
    },
    {
      id: 'terminal-braking-2',
      label: 'Braking to Gemini VIII’s Agena, as measured: no Agena to hold station on',
      thrusters: 'forward',
      attitude: {
        label: 'The braking’s resultant, the forward-firing pair',
        aim: 'velocity',
        sense: 1,
        ...aimed('forward', [-3.5, 28.0, 1.3]),
        confidence: 'derived',
        source: `the resultant of the braking as the guidance system measured it (${GX}, Table 5.1.5-XII)`,
      },
      turned: estimated(BRAKING_2 - 1, 'after the last correction'),
      on: doc(
        BRAKING_2,
        `"At 47:39:10 g.e.t., the command pilot began braking maneuvers (TPF)" (${GX}, 4.3.1.2.2; Table 4-VIII); 47:42:42.4 in Table 5.1.5-XII`,
      ),
      off: doc(STATION_2, `"almost continuous thrusts were applied until station keeping started at 47:59:22 g.e.t." (${GX}, 4.3.1.2.2)`),
      deltaV: doc(
        28.2 * FT,
        `28.2 ft/s, the resultant (${GX}, Table 5.1.5-XII; 28.5 in Table 4-VIII, "the total ΔV expended during the approach was about 160 ft/sec"), flown along its measured line over the twenty minutes`,
      ),
    },
    {
      id: 'out-of-plane-separation',
      label: 'Out-of-plane separation from Gemini VIII’s Agena',
      thrusters: 'aft',
      attitude: {
        label: 'Yawed right, out of the plane',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [0.8, 0.0, -1.3]),
        confidence: 'derived',
        source: `"a height adjustment was performed to separate the spacecraft from the Gemini VIII GATV" (${GX}, 4.0); the guidance system’s components (Table 5.1.5-XII)`,
      },
      turned: estimated(OUT_OF_PLANE - 120, 'in its attitude two minutes before: not read'),
      on: doc(OUT_OF_PLANE, `51:15:59.9, as planned (${GX}, Tables 4-II and 5.1.5-XII)`),
      off: estimated(OUT_OF_PLANE + 3, `the 1.5 ft/s at the aft-firing pair’s thrust: not read`),
      deltaV: doc(1.5 * FT, `1.5 ft/s, planned 1.0 (${GX}, Table 5.1.5-XII)`),
    },
    {
      id: 'true-anomaly-adjust',
      label: 'True anomaly adjust: the perigee lowered for the retrofire',
      thrusters: 'aft',
      attitude: {
        label: 'Turned about, the aft-firing pair pushing back',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [-99.8, -0.7, -2.8]),
        confidence: 'derived',
        source: `"to position retrofire to a true anomaly of 240 degrees" (${GX}, 1.0); the guidance system’s components (Table 5.1.5-XII)`,
      },
      turned: estimated(TRUE_ANOMALY - 120, 'in its attitude two minutes before: not read'),
      on: doc(TRUE_ANOMALY, `51:38:51.8 (${GX}, Tables 4-II and 5.1.5-XII)`),
      off: estimated(TRUE_ANOMALY + 135, `the 99.8 ft/s at the aft-firing pair’s thrust over the ship’s mass: not read`),
      deltaV: doc(
        99.8 * FT,
        `99.8 ft/s, planned 100.0, "computed by the ACR" (${GX}, Table 5.1.5-XII; 6.1.3): the perigee from 213.5 to 157.9 nautical miles (Table 4-VII)`,
      ),
    },
  ],
  adapter: {
    equipment: {
      mass: derived(
        (SC10_LAUNCH - RETROGRADE) * LB,
        `the spacecraft at launch (8,295 lb) less at retrofire (5,578 lb: ${GX}, 3.3): ${(SC10_LAUNCH - RETROGRADE).toFixed(0)} lb, with what the thrusters burned not taken off`,
      ),
      gone: doc(EQUIPMENT, `"Equipment adapter separation" at 70:08:37, planned 70:09:25 (${GX}, Table 4-II)`),
    },
    retro: {
      mass: derived(
        (RETROGRADE - REENTRY) * LB,
        `spacecraft 10 at retrofire less at 0.05 g (${GX}, 3.3): ${(RETROGRADE - REENTRY).toFixed(0)} lb, the section with its four rockets unfired`,
      ),
    },
  },
  retro: {
    sequence: estimated(RETRO - 60, 'a minute before retrofire: when the crew had it in retrofire attitude is not read'),
    below: derived(
      (Math.atan2(RETRO_DOWN, RETRO_AFT) * 180) / Math.PI,
      `degrees: "Telemetry data received at Hawaii showed the retrofire velocities to be 303.8 ft/sec aft, 1.3 ft/sec right, and 118.7 ft/sec down" (${GX}, 6.1.4; the indicator 303 aft and 118 down), so ${((Math.atan2(RETRO_DOWN, RETRO_AFT) * 180) / Math.PI).toFixed(1)}° below the line back along the motion; the 1.3 to the right not flown`,
    ),
    on: doc(RETRO, `70:10:24.5 by the guidance system (${GX}, Table 5.1.5-XII); 70:10:24, planned 70:10:25 (Table 4-II)`),
    spacing: assumed(5.5, `"fired at 5.5 second intervals in 1-2-3-4 order", the type's (${SEDR}, Section XI, p. 11-73)`),
    count: 4,
    thrust: assumed(2_490 * LBF, `2,490 lb each, the type's (${SP121}, Table 4-I, p. 29)`),
    burn: assumed(5.5, '5.5 s each, the type’s (NASA release 65-81, p. 8)'),
    deltaV: doc(
      325.5 * FT,
      `325.5 ft/s by the guidance system, against 324.7 planned (${GX}, Table 5.1.5-XII): "0.98 ft/sec higher than predicted" (5.1.5.2.5)`,
    ),
    gone: assumed(
      RETRO_GONE,
      `45 s after retrofire, when the type's sequence lights the jettison switch (${SP121}, Figure 3-3): not recorded`,
    ),
  },
  entry: {
    mass: doc(REENTRY * LB, `spacecraft 10's re-entry module at 0.05 g, 4,764 lb (${GX}, 3.3)`),
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
      source: `lift over drag as flown, at every Mach number: the programme's, "flown with an average lift-to-drag ratio of approximately 0.19" (${SP138}, p. 159), taken for spacecraft 10, whose own is not in its report`,
    },
    predicted: derived(
      0.19 / 0.65,
      `the lift over drag the wind tunnels had given, said and not flown: "a decrease of approximately 35 percent in the lift-to-drag ratio" (${SP138}, p. 163), from the 0.19 flown: 0.29`,
    ),
    trim: assumed(8.5, '"8° to 9°" at the greatest heating on GT-3 (Gemini Program Mission Report, Gemini IV, p. 5-3): the type’s, taken'),
    bank: doc(
      10,
      `degrees, to the right of the motion: "From retrofire to an altitude of 400K feet, a 10-degree bank angle toward the south was flown as planned" (${GX}, 5.1.5.2.5)`,
    ),
    banked: estimated(RETRO_GONE + 1, 'as the retrograde section went: the ship turned to its entry attitude, its lift held from there'),
    banks: [
      {
        label: 'At 400,000 ft: the back-up bank, 45° to the south',
        bank: doc(
          45,
          `"From the 400K-foot level to guidance initiation, the backup angle of 45 degrees toward the south was flown as planned" (${GX}, 5.1.5.2.5)`,
        ),
        at: doc(ENTRY_400K, `"At 70:32:46.7 g.e.t., the computer commanded a zero-degree bank angle" at 400,000 ft (${GX}, 5.1.5.2.5)`),
      },
      {
        label: 'The computer’s commands, flown by hand: lift about up',
        bank: estimated(
          0,
          `degrees: "At 70:35:36 g.e.t., the command pilot started to fly the bank angles commanded by the onboard computer. From this time until guidance termination at 70:40:39 g.e.t., the commands from the computer were accurately followed" (${GX}, 5.1.5.2.5, Figure 5.1.5-24): not read, the lift held up`,
        ),
        at: doc(
          GUIDED,
          `"At 70:34:55.6 g.e.t., ... the computer began to calculate the bank-angle commands necessary to guide the spacecraft to the desired target" (${GX}, 5.1.5.2.5)`,
        ),
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
      `spacecraft 10's re-entry module at the main parachute's deployment, 4,365 lb (${GX}, 3.3): taken from the drogue on`,
    ),
    drogue: {
      altitude: doc(
        41_000 * FT,
        `"Drogue parachute deploy 70:41:33.867", plotted at about 41,000 ft (${GX}, Figure 5.1.11-1, read off the figure to a thousand feet)`,
      ),
      dragArea: estimated(
        0.5 * Math.PI * ((8.3 / 2) * FT) ** 2,
        `an 8.3 ft conical ribbon drogue (${CR1106}, p. 218) at a drag coefficient of 0.5, the usual figure for the type: no measured figure found`,
      ),
      fills: derived(19.1, `"Drogue parachute disreef 70:41:53", 19.1 s after it came out (${GX}, Figure 5.1.11-1)`),
    },
    main: {
      altitude: doc(
        11_000 * FT,
        `"R and R section separation and main parachute deploy 70:42:53.867", plotted at about 11,000 ft (${GX}, Figure 5.1.11-1, read off the figure); the type's PARA switch is at 10,600 ft (${SEDR}, pp. 4-22 and 4-23)`,
      ),
      dragArea: derived(
        (2 * 4_400 * LB * 9.80665) / (1.225 * (31.6 * FT) ** 2),
        `the 84.2 ft ringsail's (${CR1106}, p. 222): "a mean descent rate of 31.6 fps" for a module of 4,400 lb, at sea level: 344 m²`,
      ),
      fills: derived(13.5, `deployed at 70:42:53.867 and "Main parachute full open" at 70:43:07.342 (${GX}, Figure 5.1.11-1)`),
    },
    checks: [
      {
        id: 'reentry-module.at',
        label: 'Landing',
        value: LANDING,
        unit: 's',
        tolerance: 60,
        confidence: 'documented',
        source: `${GX}, Table 4-II and Figure 5.1.11-1: 70:46:39, planned 70:46:42`,
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
      'Young and Collins landed in the ship 3.4 nautical miles from the target and were taken to the Guadalcanal by helicopter: the ejection seats were for the pad, the climb and below 15,000 ft, and were not used',
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
        'The retrofire was at the second the ground set for the planned landing point (Gemini Program Mission Report, Gemini X, Table 4-II); the ship came down within three nautical miles of it (4.3.1.3), so the place it came down is taken for the place its burn was timed for',
    },
    latitude: doc(
      26 + 45 / 60,
      `${GX}, Table 4-V, final: 26°45′ N 71°57′ W, "based on determinations made on U.S.S. Guadalcanal"; 26°42′ N 72°02′ W by the guidance system at drogue deployment; planned 26°43′ N 72°00′ W`,
    ),
    longitude: doc(-(71 + 57 / 60), `${GX}, Table 4-V, final`),
    at: doc(LANDING, `${GX}, Table 4-II: 70:46:39`),
    near: 'the western Atlantic, east of the Bahamas',
  },
  // GATV-5005 as the report's tracking had it at its insertion, flown on from there: the craft the first rendezvous is made on.
  target: {
    orbit: { fix: INSERTION },
    epoch: '1966-07-18T22:20:26.648Z',
    label: 'GATV-5005',
    mass: doc(7_184 * LB, `the Agena's "Insertion weight (in-orbit)", 7,184 lb (${GX}, 3.6)`),
    dragArea: estimated(
      2.2 * 1.52 * 7.95 * 0.8,
      'm²: the free-molecule figure of a body turning every way, 2.2, on its side and its ends as it is held, 0.8 of a 7.95 m Agena 1.52 m across, as the Agenas’ own runs take it (vehicles/target-plan.ts): chosen',
    ),
  },
  events: [
    { id: 'liftoff', label: 'Liftoff', at: doc(0, `${GX}, Table 4-I: 22:20:26.648 G.m.t.`) },
    { id: 'beco', label: 'First stage cutoff: the second stage lit', at: doc(BECO, `${GX}, Table 4-I`), also: 'as planned' },
    { id: 'stage-separation', label: 'The stages begin to part', at: doc(STAGING, `${GX}, Table 4-I`) },
    { id: 'seco', label: 'Second stage cutoff', at: doc(SECO, `${GX}, Table 4-I`), also: 'planned 339.74' },
    { id: 'spacecraft-separation', label: 'Spacecraft separation', at: doc(SEPARATION, `${GX}, Table 4-I`) },
    {
      id: 'insertion',
      label: 'Insertion, after the insertion velocity adjustment: not flown, the stage cut on this orbit',
      at: doc(INSERTED, `${GX}, Table 4-I; the adjustment 26.0 ft/s at 0:06:47.0 (Table 5.1.5-XII)`),
    },
    {
      id: 'fairings',
      label: 'Nose and scanner fairings off',
      at: estimated(FAIRINGS, 'not in the sequence of events: taken as 15 s after the separation, as Gemini VII’s'),
    },
    { id: 'phase-adjust', label: 'Phase adjust', at: doc(PHASE_ADJUST, `${GX}, Table 5.1.5-XII; 2:18:11 in Table 4-II`) },
    { id: 'plane-change', label: 'Plane change', at: doc(PLANE_CHANGE, `${GX}, Table 5.1.5-XII; 2:30:49 in Table 4-II`) },
    { id: 'coelliptic', label: 'Coelliptic burn', at: doc(COELLIPTIC, `${GX}, Table 5.1.5-XII; 3:47:36 in Table 4-II`) },
    { id: 'terminal-phase', label: 'Terminal phase initiation', at: doc(TPI, `${GX}, Table 5.1.5-XII; 4:33:44 in Table 4-II`) },
    { id: 'midcourse-1', label: 'The 82° correction', at: doc(MIDCOURSE[0]!, `${GX}, Table 5.1.5-XII; 4:46:23 in Table 4-II`) },
    { id: 'midcourse-2', label: 'The 34° correction', at: doc(MIDCOURSE[1]!, `${GX}, Table 5.1.5-XII; 4:58:24 in Table 4-II`) },
    { id: 'terminal-braking', label: 'Braking begins', at: doc(BRAKING, `${GX}, Table 5.1.5-XII; 5:01:52 in Table 4-II`) },
    {
      id: 'station-keeping',
      label: 'Station keeping with the Agena, less than 200 ft',
      at: doc(
        STATION_KEPT,
        `"At 5 hours 15 minutes g.e.t., the spacecraft was less than 200 feet from the Gemini X GATV, and the crew was station keeping" (${GX}, 4.3.1.2.1)`,
      ),
    },
    { id: 'docked', label: 'Docked, in the fourth revolution (not flown here)', at: doc(DOCKING, `${GX}, 4.1`) },
    {
      id: 'docked-phase-adjust',
      label: 'Docked phase adjust, the Agena’s primary propulsion',
      at: doc(DOCKED[0]!, `${GX}, Tables 4-II and 4-IV`),
    },
    { id: 'docked-height-adjust', label: 'Docked height adjust', at: doc(DOCKED[1]!, `${GX}, Tables 4-II and 4-IV`) },
    { id: 'docked-coelliptic', label: 'Docked coelliptic', at: doc(DOCKED[2]!, `${GX}, Tables 4-II and 4-IV`) },
    {
      id: 'docked-phase-adjust-2',
      label: 'Docked phase adjust, the Agena’s secondary propulsion',
      at: doc(DOCKED[3]!, `${GX}, Tables 4-II and 4-IV`),
    },
    { id: 'docked-plane-change', label: 'Docked plane change', at: doc(DOCKED[4]!, `${GX}, Tables 4-II and 4-IV`) },
    { id: 'docked-phase-adjust-3', label: 'Docked phase adjust', at: doc(DOCKED[5]!, `${GX}, Tables 4-II and 4-IV`) },
    { id: 'agena-separation', label: 'Separation from the Agena', at: doc(PARTING, `${GX}, Table 5.1.5-XII; 44:40:16 in Table 4-II`) },
    { id: 'corrective-combination', label: 'Corrective combination', at: doc(CORRECTIVE_2, `${GX}, Tables 4-II and 5.1.5-XII`) },
    { id: 'coelliptic-2', label: 'Coelliptic burn, toward Gemini VIII’s Agena', at: doc(COELLIPTIC_2, `${GX}, Tables 4-II and 5.1.5-XII`) },
    {
      id: 'terminal-phase-2',
      label: 'Terminal phase initiation, toward Gemini VIII’s Agena',
      at: doc(TPI_2, `${GX}, Table 5.1.5-XII; 47:26:44 in Table 4-II`),
    },
    { id: 'vernier-1', label: 'First correction', at: doc(MIDCOURSE_2[0]!, `${GX}, Table 5.1.5-XII; 47:34:10 in Table 4-II`) },
    { id: 'vernier-2', label: 'Second correction', at: doc(MIDCOURSE_2[1]!, `${GX}, Table 5.1.5-XII; 47:38:58 in Table 4-II`) },
    { id: 'terminal-braking-2', label: 'Braking begins, toward Gemini VIII’s Agena', at: doc(BRAKING_2, `${GX}, Table 4-II`) },
    {
      id: 'station-keeping-2',
      label: 'Station keeping with Gemini VIII’s Agena (not flown: it is not in the run)',
      at: doc(STATION_2, `${GX}, 4.3.1.2.2`),
    },
    {
      id: 'collins-to-the-agena',
      label: 'Collins outside, to Gemini VIII’s Agena for its collector (not flown)',
      at: doc(T(48, 40, 48), `${GX}, 4.1 (flight.ts docking.visit)`),
    },
    {
      id: 'out-of-plane-separation',
      label: 'Out-of-plane separation',
      at: doc(OUT_OF_PLANE, `${GX}, Table 5.1.5-XII; 51:16:00 in Table 4-II`),
    },
    { id: 'true-anomaly-adjust', label: 'True anomaly adjust', at: doc(TRUE_ANOMALY, `${GX}, Table 5.1.5-XII; 51:38:52 in Table 4-II`) },
    { id: 'equipment-section', label: 'Equipment adapter off', at: doc(EQUIPMENT, `${GX}, Table 4-II`) },
    { id: 'retrofire', label: 'Retrofire', at: doc(RETRO, `${GX}, Table 5.1.5-XII; 70:10:24 in Table 4-II`) },
    { id: 'entry-400k', label: '400,000 ft', at: doc(ENTRY_400K, `${GX}, 5.1.5.2.5`) },
    {
      id: 'computer-banks',
      label: 'Guidance initiate: the computer’s banks, flown by hand from 70:35:36',
      at: doc(GUIDED, `${GX}, 5.1.5.2.5`),
    },
    { id: 'drogue-deployment', label: 'Drogue parachute', at: doc(DROGUE, `${GX}, Figure 5.1.11-1; 70:41:34 in Table 4-II`) },
    { id: 'main-deployment', label: 'The main parachute out', at: doc(MAIN, `${GX}, Figure 5.1.11-1; 70:42:51 in Table 4-II`) },
    {
      id: 'landing-attitude',
      label: 'Two-point suspension: repositioned for the landing',
      at: doc(LANDING_ATTITUDE, `${GX}, Figure 5.1.11-1`),
    },
    { id: 'splashdown', label: 'Landing', at: doc(LANDING, `${GX}, Table 4-II`) },
  ],
  checks: [
    ...orbitAfter(8700, 'the phase adjust', 117.2, 144.5, 'Table 4-VII, actual, after the manoeuvre (planned 118.3 by 147.0)'),
    ...orbitAfter(10800, 'the plane change', 117.2, 144.5, 'Table 4-VII, actual (planned 118.3 by 147.0)'),
    ...orbitAfter(14400, 'the coelliptic burn', 143.3, 145.8, 'Table 4-VII, actual (planned 144.4 by 147.0)'),
    ...orbitAfter(16800, 'the terminal phase initiation', 143.3, 160.6, 'Table 4-VII, actual (planned 144.4 by 162.8)'),
    ...orbitAfter(21600, 'the first rendezvous', 156.5, 161.9, 'Table 4-VII, actual, after the braking (planned 158.8 by 162.8)'),
    ...orbitAfter(28800, 'the docked phase adjust', 158.5, 412.2, 'Table 4-VII, actual (planned 160.0 by 411.0)'),
    ...orbitAfter(75600, 'the docked height adjust', 158.4, 205.8, 'Table 4-VII, actual (planned 160.0 by 205.7)'),
    ...orbitAfter(84600, 'the docked coelliptic', 203.9, 208.7, 'Table 4-VII, actual (planned 203.9 by 207.2)'),
    ...orbitAfter(
      100800,
      'the docked phase adjust on the secondary propulsion',
      205,
      209.9,
      'Table 4-VII, actual (planned 208.0 by 210.1)',
    ),
    ...orbitAfter(148800, 'the docked plane change', 205, 209.9, 'Table 4-VII, actual (planned 208.0 by 210.1)'),
    ...orbitAfter(151200, 'the last docked phase adjust', 205.5, 208.5, 'Table 4-VII, actual (planned 207.1 by 208.8)'),
    ...orbitAfter(163800, 'the separation', 205.4, 208.2, 'Table 4-VII, actual (planned 207.9 by 209.2)'),
    ...orbitAfter(165600, 'the corrective combination', 205.9, 209.2, 'Table 4-VII, actual (planned 208.6 by 208.9)'),
    ...orbitAfter(169200, 'the second coelliptic burn', 206.1, 208.9, 'Table 4-VII, actual (planned 208.3 by 208.8)'),
    ...orbitAfter(171180, 'the second terminal phase initiation', 207.4, 216.8, 'Table 4-VII, actual (planned 209.4 by 217.0)'),
    ...orbitAfter(
      180000,
      'the rendezvous with Gemini VIII’s Agena',
      213.5,
      216,
      'Table 4-VII, actual, after the braking (planned 216.0 by 216.2)',
    ),
    ...orbitAfter(
      187200,
      'the true anomaly adjust',
      157.9,
      215.5,
      'Table 4-VII, actual, after the separation and the true anomaly adjust (planned 158.3 by 216.0)',
    ),
    ...orbitAfter(252000, 'all burns, before retrofire', 157.9, 215.5, 'Table 4-VI, actual, revolution 43 (retrofire); period 91.48 min'),
    impulse('coelliptic', 'Coelliptic burn, impulse', 47.5, 0.05 * 47.5, 'Table 5.1.5-XII, the guidance system; within 5 per cent'),
    impulse(
      'terminal-phase',
      'Terminal phase initiation, impulse',
      42.3,
      0.1 * 42.3,
      'Table 5.1.5-XII; within 10 per cent, the ground commanding 34.0',
    ),
    impulse('midcourse-1', 'The 82° correction, impulse', 20.4, 2, 'Table 5.1.5-XII; within 2 ft/s'),
    impulse('midcourse-2', 'The 34° correction, impulse', 23.4, 2, 'Table 5.1.5-XII; within 2 ft/s'),
    impulse(
      'terminal-braking',
      'Braking, impulse',
      66,
      8,
      'Table 5.1.5-XII, the resultant of the braking’s pulses; within 8 ft/s, its line not held',
    ),
    sighting(
      Math.round(INSERTED),
      'Agena at the spacecraft’s insertion',
      1000 * NMI,
      50 * NMI,
      '"At spacecraft insertion, the range between Spacecraft 10 and the Gemini X GATV was approximately 1000 nautical miles" (4.3.1.2.1)',
    ),
    sighting(
      Math.round(TPI),
      'Agena at the terminal phase initiation',
      37 * NMI,
      5 * NMI,
      '"when the elevation angle to the Gemini X GATV was approximately 26.0 degrees and the range was about 37 nautical miles" (4.3.1.2.1)',
    ),
    {
      id: 'ejectionAt',
      label: 'Drogue out, at about 41,000 ft',
      value: DROGUE,
      unit: 's',
      tolerance: 60,
      confidence: 'documented',
      source: `${GX}, Figure 5.1.11-1: 70:41:33.867, planned 70:41:08 (70:41:34 in Table 4-II)`,
    },
    {
      id: 'alongTrack',
      label: 'Drogue out, along the track from where it landed',
      value: 0,
      unit: 'm',
      tolerance: 40_000,
      confidence: 'documented',
      source: `${GX}, Table 4-V: it landed at 26°45′ N 71°57′ W as the Guadalcanal determined it; the drogue comes out a few kilometres short of where it lands`,
    },
    {
      id: 'crossTrack',
      label: 'Drogue out, to the right of where it landed',
      value: 0,
      unit: 'm',
      tolerance: 25_000,
      confidence: 'documented',
      source: `${GX}, 5.1.5.2.5: at guidance termination the guidance system had it "2.3 nautical miles South Southeast of the target point, while radar data showed the spacecraft to be approximately 2.5 nautical miles North"; "The touchdown point reported by the recovery forces was 3.4 nautical miles East Northeast of the target"`,
    },
  ],
};

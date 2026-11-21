/**
 * Gemini-Titan 11 as a flight into orbit: its record (vehicles/gemini-titan-plan.ts `GeminiTitanRecord`), which flight.ts
 * writes its plan from (`geminiTitanPlan`). The record with its sources and disagreements is set out in mission.md beside
 * this file; the numbers live here, each in the source's own units and converted once.
 *
 * Times are seconds from liftoff, 14:42:26.546 UTC, 12 September 1966. The checks' tolerances were written with the record,
 * before the plan was first flown, and nothing here was changed after: a miss is recorded (src/sim/misses.ts), not fitted.
 * The mission report (MSC-G-R-66-8) has this flight's own weights, engines, sequence, manoeuvres, orbits and entry, read
 * in its text layer and on the page; what it lacks (the separation speeds of the adapter's sections, the parachutes'
 * sizes, the retrorockets one by one) is the type's, and says so.
 *
 * The Agena it went up to meet, GATV-5006, is the flight's target (`target`): the report's final tracking vector at its
 * insertion, flown on from there on gravity and the air (sim/plan.ts `TargetDef` `orbit`). The first-revolution rendezvous
 * (its terminal phase, two corrections and the braking) is made on it, solved as each lights; the out-of-plane burn before
 * it is flown as recorded. The three burns the Agena's primary propulsion made with the pair docked, the out-of-plane
 * calibration and the climb to an apogee of 741.5 nautical miles and back, are flown on the spacecraft at the pair's
 * impulse (`thrusters: 'docked'`); the pair flew on together, docked and then tethered, to the separation burn, where the
 * Agena is begun again where the ship is (`parted`), and the coincident-orbit rendezvous after it (its terminal phase, a
 * correction and the braking) is made on that. The docking, the walks and the tether exercise are marks; the separation,
 * the stand-off, the last separation, the retrofire and the entry are flown.
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

const GXI = 'Gemini Program Mission Report, Gemini XI (MSC-G-R-66-8)';
const SP121 = 'Gemini Midprogram Conference (NASA SP-121, 1966)';
const SP138 = 'Gemini Summary Conference (NASA SP-138, 1967)';
const GI = 'Gemini Program Mission Report GT-1 (NTRS 19670095753)';
const CR1106 = 'Project Gemini: A Technical Summary (Malik and Souris, NASA CR-1106, 1968)';
const KING_HELE =
  '“a value of 2.2 is recommended for perigee heights of 150-400 km”, on the cross-section square to the motion (King-Hele, The Prediction of Satellite Lifetimes, RAE TR 87030, 1987, §9.1, after Cook 1965): a satellite’s, as Vostok’s and Mercury’s (vostok-3ka.ts SHIP_RAREFIED). Nothing published for Gemini';

/**
 * GATV-5006 at its insertion, as the report's tracking had it (Table 4.3-V, the final vector), on this flight's clock: the
 * Atlas-Agena lifted off 1:37:24.821 before the Titan (Tables 4.2-I and 4.2-III). The flight's target is flown from it
 * (`target`), and the docking chapter starts from it (flight.ts `docking.fixes`).
 */
export const INSERTION = targetFix(`${GXI}, table 4.3-V, final insertion`, -5844.821, 558.7, 28.5, -59.47, 983548, 25360, 0.07, 95.57);

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

// GLV-11's weights with spacecraft 11 aboard (the mission report, 3.3, "obtained from the GLV contractor", read on the
// page): at liftoff, at the first stage's cutoff, at the second stage's start of steady-state combustion, at its cutoff;
// and spacecraft 11 at launch.
const LIFTOFF = 343_469;
const BECO_WT = 87_367;
const STAGE2_STEADY = 74_618;
const SECO_WT = 14_177;
const SC11_LAUNCH = 8_374;
/** What the second stage burned after its cutoff, lb: its shutdown impulse, 34,552 lb-s (5.2.2.1.2), at its specific impulse. */
const SHUTDOWN = 34_552 / 311.32;
/**
 * The usable propellant still in the second stage at its cutoff, lb: "the achieved vehicle performance was 8889 pounds, or
 * ... 515 pounds more than the actual payload weight" (5.2), and "could have sustained Stage II flight an additional 1.44
 * seconds" (5.2.2.2.2): the margin is taken for it, as Gemini-Titan 12's is.
 */
const RESERVE = 515;
const STAGE2_DRY = SECO_WT - SHUTDOWN - RESERVE - SC11_LAUNCH;
const STAGE2_BURNED = STAGE2_STEADY - SECO_WT + SHUTDOWN + RESERVE;
const STAGE1_DRY = BECO_WT - STAGE2_STEADY;
const STAGE2_GROSS = STAGE2_DRY + STAGE2_BURNED;
const STAGE1_GROSS = LIFTOFF - SC11_LAUNCH - STAGE2_GROSS;
// Spacecraft 11's weights through its descent (3.3): at retrofire (the equipment section gone), at 0.05 g (the retrograde
// section gone), at the main parachute's deployment.
const RETROGRADE = 5_577;
const REENTRY = 4_734;
const MAIN_DEPLOY = 4_340;

/** The first stage's two chambers at standard inlet conditions, postflight reconstructed (Table 5.2-I, read on the page). */
const S1_SL = 437_596;
const S1_ISP_SL = 261.02;
/** GLV-1's specific impulse at 155 s over its figure at 5 s (GT-1 report, Table 5-II): how far the type's rose with height. */
const GLV1_RISE = 281.1 / 257.3;
const S1_ISP_VAC = S1_ISP_SL * GLV1_RISE;

/** The record's instants (Tables 4.2-I and 4.2-II, read on the page; the manoeuvres' from Table 4.3-IV). */
const BECO = 153.3;
/** "Stage separation begin": printed 142.02 s (Table 4.2-I), a slip; its planned 154.20 and the difference printed beside it, +0.18, give 154.38. */
const STAGING = 154.38;
/** The second stage's chamber pressure rising: GLV-6's stages parted 0.015 s after it (Launch Vehicle No. 6 Flight Evaluation, II.C). */
const LIGHT = STAGING - 0.015;
const SECO = 340.3;
const SEPARATION = 361.02;
const INSERTED = 469.0;
const FAIRINGS = SEPARATION + 15;
const PLANE_CHANGE = T(0, 29, 40);
const TPI = T(0, 49, 58.2);
const MIDCOURSE = [T(1, 3, 41), T(1, 15, 43)];
const BRAKING = T(1, 17, 41);
/** When the terminal phase's transfer was to bring the ship to the Agena: the braking the latest figures sent the crew had (Table 4.2-II, planned). */
const INTERCEPT = T(1, 20, 53);
const STATION_KEPT = T(1, 25, 0);
const DOCKING = T(1, 34, 16);
const CALIBRATION = T(4, 28, 48);
const HIGH_APOGEE = T(40, 30, 15);
const RECIRCULATION = T(43, 52, 55);
const TETHERED = T(50, 12, 48);
const TETHER_OFF = T(52, 58, 36);
const PARTING = T(53, 24, 57.5);
const STAND_OFF = T(54, 37, 28);
const TPI_2 = T(65, 27, 22);
const MIDCOURSE_2 = T(66, 30, 36);
const BRAKING_2 = T(66, 34, 43);
/** The braking the latest figures sent the crew had for the coincident-orbit rendezvous (Table 4.2-II, planned). */
const INTERCEPT_2 = T(66, 38, 57);
const LAST_PARTING = T(66, 52, 31);
const EQUIPMENT = T(70, 39, 46);
const RETRO = T(70, 41, 36);
const RETRO_GONE = RETRO + 45;
const ENTRY_400K = T(71, 1, 51.713);
const GUIDED = T(71, 4, 48.703);
const DROGUE = T(71, 11, 28.44);
const MAIN = T(71, 13, 6.64);
const LANDING_ATTITUDE = T(71, 13, 28.1);
const LANDING = T(71, 17, 8.1);

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

/** The retrofire's push as the guidance system's telemetry gave it (6.1.4), ft/s: back along the motion and down. */
const RETRO_AFT = 303.8;
const RETRO_DOWN = 118.7;

/**
 * A manoeuvre's attitude from its measured components (Table 4.3-IV: "V_X is positive in the direction of motion, V_Y is
 * positive towards the center of the earth, and V_Z is positive to the left of the orbit path (North)"), ft/s: the nose
 * along the push for the aft-firing pair, against it for a pair that pushes toward the tail (the forward-firing, and the
 * Agena's engine with the pair docked), as an aim along the motion turned in the level (`yaw`, to the left) and pitched
 * below it (`below`).
 */
const aimed = (
  thrusters: 'aft' | 'forward' | 'docked',
  [forward, down, left]: readonly [number, number, number],
  from = 'Table 4.3-IV',
) => {
  const k = thrusters === 'aft' ? 1 : -1;
  const [x, y, z] = [k * forward, k * left, -k * down];
  const why = `from the push, ${forward} ft/s forward, ${down} down and ${left} left (${GXI}, ${from}), the nose ${thrusters === 'aft' ? 'along it, the aft-firing pair pushing toward the nose' : 'against it, the push toward the tail'}`;
  return {
    yaw: derived((Math.atan2(y, x) * 180) / Math.PI, `degrees to the left of the motion, ${why}`),
    below: derived((-Math.atan2(z, Math.hypot(x, y)) * 180) / Math.PI, `degrees below the level, ${why}`),
  };
};
/** The components of a docked burn from the Agena's attitude for it (Table 4.3-VII, pitch and yaw of its push from the motion, degrees). */
const pushed = (fps: number, pitch: number, yaw: number): [number, number, number] => {
  const [p, y] = [(pitch * Math.PI) / 180, (yaw * Math.PI) / 180];
  return [fps * Math.cos(p) * Math.cos(y), -fps * Math.sin(p), fps * Math.cos(p) * Math.sin(y)];
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
    source: `${GXI}, ${where}: ${nmi} nautical miles. Read at ${new Date(at * 1000).toISOString().slice(11, 19)}`,
  }));
/** The impulse a manoeuvre gave (`<id>.velocity`, orbital.ts `OrbitResults`), ft/s, and how near. */
const impulse = (id: string, label: string, fps: number, within: number, where: string) => ({
  id: `${id}.velocity` as const,
  label,
  value: fps * FT,
  unit: 'm/s',
  tolerance: within * FT,
  confidence: 'documented' as const,
  source: `${GXI}, ${where}: ${fps} ft/s`,
});
/** How far the Agena was at an instant (gemini-titan-plan.ts: `at-<s>.range`), m. */
const sighting = (at: number, label: string, value: number, within: number, where: string) => ({
  id: `at-${at}.range` as const,
  label,
  value,
  unit: 'm',
  tolerance: within,
  confidence: 'documented' as const,
  source: `${GXI}, ${where}`,
});

export const orbital: GeminiTitanRecord = {
  liftoffMass: doc(
    LIFTOFF * LB,
    `343,469 lb at liftoff with spacecraft 11 (${GXI}, 3.3); 347,283 lb at the first stage's ignition. The stages' figures below are worked from the same table and sum to it`,
  ),
  titan: {
    first: {
      name: 'Titan first stage',
      nodes: ['TitanStage1', 'TitanStage1Engine', 'TitanInterstage'],
      mass: derived(
        STAGE1_GROSS * LB,
        `GLV-11 at liftoff (343,469 lb) less spacecraft 11 (8,374 lb) and the second stage (${STAGE2_GROSS.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb, below): ${STAGE1_GROSS.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb (${GXI}, 3.3). The interstage goes with it`,
      ),
      dry: derived(
        STAGE1_DRY * LB,
        `the vehicle at the first stage's cutoff (87,367 lb) less at the second stage's start of steady-state combustion (74,618 lb): ${STAGE1_DRY.toLocaleString('en-US')} lb with what was left in its tanks (${GXI}, 3.3), 1,319 lb of usable oxidiser among it (5.2.2.2.2)`,
      ),
      propellant: derived(
        (STAGE1_GROSS - STAGE1_DRY) * LB,
        `the stage at liftoff less as it was let go: ${(STAGE1_GROSS - STAGE1_DRY).toLocaleString('en-US', { maximumFractionDigits: 0 })} lb burned from liftoff (${GXI}, 3.3); "This lower-than-predicted mixture ratio resulted in a fuel depletion shutdown" (5.2.2.1.1)`,
      ),
      engine: {
        // (its two chambers on the one stage as one engine: a plan's engine count is its body's units, plan.ts `BodyDef.count`)
        name: 'Aerojet LR87-AJ-7 (two chambers)',
        count: 1,
        thrust: {
          seaLevel: assumed(
            S1_SL * LBF,
            `GLV-11's own, postflight reconstructed at standard inlet conditions, 437,596 lb (predicted 436,872: ${GXI}, Table 5.2-I, read on the page), taken as the sea-level figure, as an acceptance test's is (GLV-6's at standard inlet, 427,396 lb, is within 0.1 per cent of its acceptance test: Launch Vehicle No. 6 Flight Evaluation, Table III-3). The flight's average, 463,345 lb, lies between this and the vacuum figure below`,
          ),
          vacuum: derived(
            (S1_SL * S1_ISP_VAC * LBF) / S1_ISP_SL,
            `the sea-level figure at the vacuum specific impulse over the sea-level one (the same flow): ${Math.round((S1_SL * S1_ISP_VAC) / S1_ISP_SL).toLocaleString('en-US')} lb for the two`,
          ),
        },
        isp: {
          seaLevel: assumed(
            S1_ISP_SL,
            `GLV-11's at standard inlet conditions, 261.02 s (predicted 260.64: ${GXI}, Table 5.2-I), taken as the sea-level figure`,
          ),
          vacuum: assumed(
            S1_ISP_VAC,
            `GLV-11's 261.02 s raised as GLV-1's rose from 5 s to 155 s, 257.3 to 281.1 s (${GI}, Table 5-II): ${S1_ISP_VAC.toFixed(2)} s. GLV-11's own flight average was 277.69 s (${GXI}, Table 5.2-I), between the two`,
          ),
        },
        nozzle: GLV_NOZZLES.first,
      },
      ignition: doc(0, `started on the pad, the ignition signal (87FS1) at -3.24 s (${GXI}, Table 4.2-I): the run begins at release`),
      cutoff: doc(BECO, `87FS2, stage I engine shutdown, at 153.30 s, planned 152.90 (${GXI}, Table 4.2-I, read on the page)`),
    },
    second: {
      name: 'Titan second stage',
      nodes: ['TitanStage2', 'TitanStage2Engine'],
      mass: derived(
        STAGE2_GROSS * LB,
        `its weight at cutoff and what it burned, below: ${STAGE2_GROSS.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb (${GXI}, 3.3)`,
      ),
      dry: assumed(
        STAGE2_DRY * LB,
        `the vehicle at the second stage's cutoff (14,177 lb) less spacecraft 11 (8,374 lb), what the engine burned after its cutoff signal (its shutdown impulse of 34,552 lb-s at 311.32 s, ${SHUTDOWN.toFixed(0)} lb, burned at full thrust here) and the usable propellant it still held, taken as the vehicle's achieved performance over the spacecraft, 515 lb: ${STAGE2_DRY.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb (${GXI}, 3.3, 5.2 and 5.2.2.1.2)`,
      ),
      propellant: assumed(
        STAGE2_BURNED * LB,
        `what it could burn from the start of its steady burn: ${STAGE2_BURNED.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb, from 74,618 lb to its cutoff at 14,177, the shutdown's ${SHUTDOWN.toFixed(0)} lb after it, and the 515 lb of margin (${GXI}, 3.3, 5.2 and 5.2.2.1.2). The run's guidance cuts it on the orbit, as the radio guidance did`,
      ),
      engine: {
        name: 'Aerojet LR91-AJ-7',
        count: 1,
        thrust: {
          vacuum: doc(
            101_266 * LBF,
            `GLV-11's flight average, postflight reconstructed, 101,266 lb (predicted 100,715: ${GXI}, Table 5.2-II, read on the page)`,
          ),
        },
        isp: { vacuum: doc(311.32, `GLV-11's flight average, 311.32 s (predicted 311.36: ${GXI}, Table 5.2-II)`) },
        nozzle: GLV_NOZZLES.second,
      },
      ignition: assumed(
        LIGHT,
        `its thrust from the chamber pressure's rise, which on GLV-6 was 0.015 s before the stages parted (Launch Vehicle No. 6 Flight Evaluation, II.C, and Table II-4): here 154.38 s less that, with the stages still joined. The ignition signal, 91FS1, was at 153.30 s with the first stage's shutdown (${GXI}, Table 4.2-I); the engine's MDFJPS made at 153.98`,
      ),
      cutoff: doc(SECO, `91FS2 at 340.30 s, planned 339.68; the redundant shutdown at 340.33 (${GXI}, Table 4.2-I)`),
    },
    staging: derived(
      STAGING,
      `"Stage separation begin", printed 142.02 s, a slip: its planned 154.20 s and the difference printed beside it, +0.18 (${GXI}, Table 4.2-I), give 154.38, 1.08 s after the staging signal`,
    ),
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
    at: doc(SEPARATION, `"Spacecraft separation (shape charge fired)" at 361.02 s, planned 359.68 (${GXI}, Table 4.2-I)`),
    push: assumed(
      (3.2 * FT * (SC11_LAUNCH + STAGE2_DRY)) / STAGE2_DRY,
      `Gemini XII's 3.2 ft/s for its separation manoeuvre of 3 seconds (Gemini XII mission report, Table 5.1.5-V), for this flight's "separation maneuver of 2 seconds" (${GXI}, Table 4.2-I, note a), as the joint's push shared by the masses as every separation is (the empty second stage ${STAGE2_DRY.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb)`,
    ),
    mass: derived(
      SC11_LAUNCH * LB,
      `the spacecraft at launch, 8,374 lb (${GXI}, 3.3): what stayed on the launch vehicle and the fairings thrown off after are not read`,
    ),
  },
  ascent: {
    guidance: {
      azimuth: doc(99.9, `"Roll program start (launch azimuth = 99.9°)" at 8.46 s, its end at 20.43 (${GXI}, Table 4.2-I)`),
      vertical: doc(22.99, `up the plumb line until "Pitch program rate no. 1 start" at 22.99 s, planned 23.04 (${GXI}, Table 4.2-I)`),
      kick: estimated(15, 's: the stored pitch programme’s rates are not in the report; a pitch-over of fifteen seconds is ours'),
      turn: estimated(
        BECO,
        's: the radio guidance’s closed loop flown as the law’s linear tangent from staging; the first stage’s programme before it. The radio guidance was enabled at 162.20 s and its first command came at 168.35 (Table 4.2-I; 5.2.5.2)',
      ),
      target: {
        at: 'seco',
        altitude: doc(
          526_908 * FT,
          `${GXI}, Table 4.3-I, final: 526,908 ft at the second stage's cutoff, a geodetic height (its elements over the Fischer ellipsoid, Table 4.3-III, note b)`,
        ),
        over: 'ellipsoid',
        climb: doc(0, `${GXI}, Table 4.3-I, final: 0.00° space-fixed at cutoff`),
        inclination: doc(28.85, `${GXI}, Table 4.3-III, actual, at insertion: 28.85°`),
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
      'the spacecraft’s centre of mass at the heat shield’s rim, Z103.44 (the model’s origin): spacecraft 11’s at launch was at Z103.87 (the mission report, 3.3), its own Z reference 13.44 in aft of the mating plane; not reduced to the model’s',
    ),
    sheds: [
      {
        on: 'staging-nuts',
        name: 'Titan first stage',
        from: doc(0, 'the first stage engines’ exit plane, station 1348.103 (titan-ii-glv.md)'),
        to: derived(STATION(500), 'the separation plane, station 500, with the interstage on it (titan-ii-glv.md)'),
        radius: doc(60 * IN, 'the 120 in tank (titan-ii-glv.md)'),
        mass: derived(STAGE1_DRY * LB, 'GLV-11’s as it was let go (as the plan’s, above)'),
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
        mass: derived(STAGE2_DRY * LB, 'GLV-11’s at cutoff less the spacecraft (as the plan’s)'),
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
        mass: derived((SC11_LAUNCH - RETROGRADE) * LB, 'the spacecraft at launch less at retrofire (as the plan’s, below)'),
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
        value: 86.6 * NMI,
        unit: 'm',
        tolerance: 12_000,
        confidence: 'documented',
        source: `${GXI}, Table 4.3-III, actual, at insertion: 86.6 nautical miles (planned 86.6); the separation, insertion velocity adjustment and radial manoeuvre in it`,
      },
      {
        id: 'apogee',
        label: 'Apogee at insertion',
        value: 149.2 * NMI,
        unit: 'm',
        tolerance: 25_000,
        confidence: 'documented',
        source: `${GXI}, Table 4.3-III: 149.2 nautical miles (planned 149.6)`,
      },
      {
        id: 'inclination',
        label: 'Inclination',
        value: 28.85,
        unit: '°',
        tolerance: 0.25,
        confidence: 'documented',
        source: `${GXI}, Table 4.3-III`,
      },
      {
        id: 'cutoffSpeed',
        label: 'Speed at insertion, space-fixed',
        value: 25_747 * FT,
        unit: 'm/s',
        tolerance: 30,
        confidence: 'documented',
        source: `${GXI}, Table 4.3-I, final: 25,747 ft/s at insertion, 469.0 s, after "a separation maneuver of 2 seconds, an Insertion Velocity Adjust Routine (IVAR) maneuver of 53 seconds, and a radial maneuver of 15 seconds" (Table 4.2-I, note a; 25,706 at the separation, 25,630 at the cutoff). The run's guidance cuts the stage on the orbit at insertion, so the adjustment is in its cut`,
      },
    ],
  },
  orbit: {
    over: {
      is: 'oblate',
      confidence: 'documented',
      source: `${GXI}, Table 4.3-III, note b: "Actual elements are based on Fischer ellipsoid earth model of 1960. Apogee and perigee are integrated values". The ellipsoid is WGS 84’s, not Fischer’s`,
    },
    perigee: doc(86.6 * NMI, `${GXI}, Table 4.3-III, actual, revolution 1 (insertion): 86.6 nautical miles; ${CHRONOLOGY}`),
    apogee: doc(149.2 * NMI, `${GXI}, Table 4.3-III: 149.2 nautical miles`),
    inclination: doc(28.85, `${GXI}, Table 4.3-III`),
    // (no period: the report's 88.92 min, Table 4.3-III, is osculating (note b), not its heights' orbit flown perigee to
    // perigee over the oblate earth; the heights are the orbit flown, as Gemini XII's are: mission.md)
  },
  injection: {
    at: doc(
      INSERTED,
      `${GXI}, Table 4.3-I: "Spacecraft insertion" at 469.0 s, after the 105 s of separation, adjustment and radial manoeuvre ("OAMS off" at 465.30, Table 4.2-I): the published orbit is the one there (Table 4.3-III)`,
    ),
    heading: 'south',
    arc: derived(
      (971.6 * NMI) / 6_371_000 / (Math.PI / 180),
      `degrees: the range at insertion, 971.6 nautical miles (${GXI}, Table 4.3-I, final), over the Earth's mean radius. Flying the ascent replaces it`,
    ),
    anomaly: derived(
      4.6,
      `degrees: from the flight-path angle at insertion, +0.04° (${GXI}, Table 4.3-I, final), on the published orbit’s eccentricity, 0.0088: tan γ = e sin ν / (1 + e cos ν), so five degrees past perigee. Flying the ascent replaces it`,
    ),
  },
  mass: derived(
    SC11_LAUNCH * LB,
    `the spacecraft at launch, 8,374 lb (${GXI}, 3.3), taken for it in orbit: what it left on the launch vehicle, the fairings and the propellant its burns took are not taken off`,
  ),
  rarefied: {
    drag: assumed(2.2, KING_HELE),
    area: estimated(
      (OUTSIDE / 4) * IN * IN,
      `m²: a quarter of the orbit configuration's whole outside, ${(OUTSIDE * IN * IN).toFixed(1)} m², which is what a convex body presents on the average over every way it can lie (Cauchy): the ship was turned for each burn and alignment, held on the Agena through two terminal phases, docked to it for two days, tethered to it and spun, and how it lay between was not recorded`,
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
      name: 'GATV-5006’s primary propulsion, docked',
      count: 1,
      thrust: assumed(
        16_000 * LBF,
        '16,000 lb, the Agena’s Bell 8247: "turbopump-fed 16,000-pound thrust engine" (Launch Systems Final Report, p. III.C-13; gemini-targets.ts agenaMotors), firing aft on the Agena and so toward the docked spacecraft’s tail. What a docked burn gives is the record’s impulse; this is only how hard it can push',
      ),
      isp: assumed(
        293,
        's, the 8247’s, as the Agenas’ own runs take it (vehicles/target-plan.ts): nothing reads it, the docked burns drawing on no tank of the spacecraft’s',
      ),
    },
  },
  // Each from the report's Table 4.3-IV (planned, ground commanded and actual, with the guidance system's components) and,
  // for the burns made docked on the Agena's engine, from 5.4 and Table 4.3-VII, read on the page. The out-of-plane burn,
  // the separation and the stand-off are flown as recorded; the two rendezvous are made on the Agena (`toward`), the record's
  // impulse then a check (`checks`); the docked burns are the Agena's, flown on the spacecraft at the pair's impulse.
  moves: [
    {
      id: 'plane-change',
      label: 'Out of plane: into the Agena’s plane',
      thrusters: 'aft',
      attitude: {
        label: 'Yawed 84° left',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [0.3, 0.1, 2.9]),
        confidence: 'derived',
        source: `pitch -1.9°, yaw -83.8° (${GXI}, Table 4.3-IV, actual): "a 3 ft/sec out-of-plane maneuver ... had not been computed on the ground" (4.3.1.2.1)`,
      },
      turned: estimated(PLANE_CHANGE - 120, 'in its attitude two minutes before: not read'),
      on: doc(PLANE_CHANGE, `0:29:40 (${GXI}, Tables 4.2-II and 4.3-IV)`),
      off: doc(PLANE_CHANGE + 4, `4.0 s with the zeroing of the indicator (${GXI}, Table 4.3-IV, note d)`),
      deltaV: doc(2.97 * FT, `2.97 ft/s (${GXI}, Table 4.3-IV)`),
    },
    {
      id: 'terminal-phase',
      label: 'Terminal phase initiation: toward the Agena, in the first revolution',
      thrusters: 'aft',
      attitude: {
        label: 'Pitched down 11°, on the transfer',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [141.0, 28.3, 4.8]),
        confidence: 'derived',
        source: `pitch -11.3°, yaw -1.9° (${GXI}, Table 4.3-IV, actual); "a ΔV_X of 141.0 ft/sec, a ΔV_Y of 28.3 ft/sec, and a ΔV_Z of 4.8 ft/sec" (4.3.1.2.1; the table prints 140.0)`,
      },
      turned: estimated(TPI - 120, 'in its attitude two minutes before: not read'),
      on: doc(
        TPI,
        `49 min 58.2 s, "approximately 90 seconds prior to the relative apogee"; ground commanded 49:43 (${GXI}, 4.3.1.2.1 and Table 4.3-IV)`,
      ),
      off: doc(TPI + 194, `194.0 s, commanded 190 (${GXI}, Table 4.3-IV)`),
      deltaV: doc(143.9 * FT, `143.9 ft/s, ground commanded 140.8 (${GXI}, Table 4.3-IV): the record’s, held against the solved burn`),
      toward: {
        reach: { ahead: derived(0, 'the Agena itself'), above: derived(0, 'the Agena itself') },
        at: doc(
          INTERCEPT,
          `the braking the latest figures sent the crew had, 1:20:53 (${GXI}, Table 4.2-II, planned): when the transfer was to arrive`,
        ),
      },
    },
    {
      id: 'midcourse-1',
      label: 'First midcourse correction',
      thrusters: 'forward',
      attitude: {
        label: 'On the line of sight to the Agena',
        aim: 'velocity',
        sense: 1,
        ...aimed('forward', [2.0, -3.4, -3.9]),
        confidence: 'derived',
        source: `the line of sight to the Agena about 46.0° up and 6.3° across (${GXI}, Table 4.3-IV, note e): "a ΔV_X of 2.0 ft/sec, a ΔV_Y of minus 3.4 ft/sec, and a ΔV_Z of minus 3.9 ft/sec" (4.3.1.2.1; the table prints -2.0): the pair whose push is nearest taken`,
      },
      turned: estimated(MIDCOURSE[0]! - 60, 'on the Agena from the terminal phase on'),
      on: doc(MIDCOURSE[0]!, `1:03:41, not computed on the ground (${GXI}, Tables 4.2-II and 4.3-IV)`),
      off: doc(MIDCOURSE[0]! + 26, `26.0 s (${GXI}, Table 4.3-IV)`),
      deltaV: doc(6.19 * FT, `6.19 ft/s (${GXI}, Table 4.3-IV): the record’s, held against the solved burn`),
      toward: {
        reach: { ahead: derived(0, 'the Agena itself'), above: derived(0, 'the Agena itself') },
        at: doc(INTERCEPT, 'as the terminal phase’s'),
      },
    },
    {
      id: 'midcourse-2',
      label: 'Second midcourse correction',
      thrusters: 'forward',
      attitude: {
        label: 'On the line of sight to the Agena',
        aim: 'velocity',
        sense: 1,
        ...aimed('forward', [-0.9, -1.8, -0.5]),
        confidence: 'derived',
        source: `the line of sight to the Agena about 84.6° up (${GXI}, Table 4.3-IV, note e): the backup charts’ solution, "the radar angle data appeared to be in error" (4.3.1.2.1)`,
      },
      turned: estimated(MIDCOURSE[1]! - 60, 'on the Agena from the terminal phase on'),
      on: doc(MIDCOURSE[1]!, `1:15:43 (${GXI}, Tables 4.2-II and 4.3-IV)`),
      off: doc(MIDCOURSE[1]! + 8, `8.0 s (${GXI}, Table 4.3-IV)`),
      deltaV: doc(2.06 * FT, `2.06 ft/s (${GXI}, Table 4.3-IV): the record’s, held against the solved burn`),
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
        confidence: 'estimated',
        source: `no attitude or components read for it (${GXI}, Table 4.3-IV): along the motion, solved on the Agena`,
      },
      turned: estimated(BRAKING - 60, 'on the Agena from the terminal phase on'),
      on: doc(BRAKING, `1:17:41, the planned 1:20:53 (${GXI}, Tables 4.2-II and 4.3-IV)`),
      off: doc(BRAKING + 440, `"Braking lasted intermittently for about eight minutes", 440 s (${GXI}, Table 4.3-IV, note g)`),
      deltaV: doc(
        41 * FT,
        `41 ft/s, "the resultant ΔV applied during the braking; however, the total ΔV expended during the semi-optical approach was about 106 ft/sec" (${GXI}, Table 4.3-IV, note f): the record’s, held against the braking flown`,
      ),
      toward: {
        station: {
          ahead: doc(
            50 * FT,
            `"At 1 hour 25 minutes g.e.t., the spacecraft was less than 50 feet from the GATV, and station keeping had been initiated" (${GXI}, 4.3.1.2.1). Taken along the track, the Agena ahead`,
          ),
          above: estimated(0, 'not read: level with it'),
        },
        until: doc(DOCKING, `"with the first one occurring at 1:34:16 g.e.t." (${GXI}, 5.4): the docking itself is not flown`),
      },
    },
    {
      id: 'docked-calibration',
      label: 'Docked calibration, out of plane: the Agena’s primary propulsion',
      thrusters: 'docked',
      attitude: {
        label: 'The pair yawed square to the motion, the Agena’s engine firing toward the spacecraft',
        aim: 'velocity',
        sense: 1,
        ...aimed(
          'docked',
          pushed(110.69, -0.56, -88.73),
          'Table 4.3-VII, the Agena’s pitch -0.56° and yaw -88.73°, read as this plan’s (the yaw’s side not stated)',
        ),
        confidence: 'derived',
        source: `"Calibration (out of plane)" (${GXI}, 5.4); "Docked plane change maneuver (GATV PPS)" (Table 4.2-IV); pitch -0.56°, yaw -88.73° (Table 4.3-VII)`,
      },
      turned: estimated(CALIBRATION - 120, 'in its attitude two minutes before: not read'),
      on: doc(CALIBRATION, `4:28:48, as planned (${GXI}, Tables 4.2-II, 4.2-IV and 4.3-VII)`),
      off: doc(CALIBRATION + 3.03, `3.03 s of thrust (${GXI}, 5.4)`),
      deltaV: doc(110.69 * FT, `110.69 ft/s, the Agena’s measured (${GXI}, 5.4; 109.8 in Table 4.3-VII, planned 110.0), the pair’s`),
    },
    {
      id: 'high-apogee',
      label: 'Docked climb: the apogee to 741.5 nautical miles',
      thrusters: 'docked',
      attitude: {
        label: 'The pair tail first, the Agena’s engine firing along the motion',
        aim: 'velocity',
        sense: 1,
        ...aimed('docked', pushed(919.6, 0, 2.16), 'Table 4.3-VII, the Agena’s yaw +2.16°'),
        confidence: 'derived',
        source: `"High-apogee orbit" (${GXI}, 5.4); pitch 0, yaw +2.16° (Table 4.3-VII): "This maneuver had a ΔV of 919.7 ft/sec and resulted in an orbit of 156.3 by 741.5 nautical miles" (6.1.3)`,
      },
      turned: estimated(HIGH_APOGEE - 120, 'in its attitude two minutes before: not read'),
      on: doc(HIGH_APOGEE, `40:30:15, as planned (${GXI}, Tables 4.2-II, 4.2-IV and 4.3-VII)`),
      off: doc(HIGH_APOGEE + 25.07, `25.07 s of thrust (${GXI}, 5.4)`),
      deltaV: doc(
        919.6 * FT,
        `919.60 ft/s, the Agena’s measured (${GXI}, 5.4; 918.0 in Table 4.3-VII, planned 920.0), the pair’s: the apogee from 164.6 to 741.5 nautical miles (Table 4.3-II)`,
      ),
    },
    {
      id: 'recirculation',
      label: 'Docked return: the apogee back to 164 nautical miles',
      thrusters: 'docked',
      attitude: {
        label: 'The pair nose first, the Agena’s engine firing against the motion',
        aim: 'velocity',
        sense: 1,
        ...aimed('docked', pushed(919.47, 0, -178.7), 'Table 4.3-VII, the Agena’s yaw -178.70°'),
        confidence: 'derived',
        source: `"Recircularizing" (${GXI}, 5.4); pitch 0, yaw -178.70° (Table 4.3-VII): "This maneuver had a ΔV of 919.5 ft/sec and resulted in an orbit of 156.2 by 164.2 nautical miles" (6.1.3)`,
      },
      turned: estimated(RECIRCULATION - 120, 'in its attitude two minutes before: not read'),
      on: doc(RECIRCULATION, `43:52:55, as planned (${GXI}, Tables 4.2-II, 4.2-IV and 4.3-VII)`),
      off: doc(RECIRCULATION + 22.47, `22.47 s of thrust (${GXI}, 5.4)`),
      deltaV: doc(919.47 * FT, `919.47 ft/s, the Agena’s measured (${GXI}, 5.4; 917.6 in Table 4.3-VII, planned 920.0), the pair’s`),
    },
    {
      id: 'agena-separation',
      label: 'Separation after the tether: the second rendezvous’s phasing',
      thrusters: 'forward',
      attitude: {
        label: 'Turned about, pitched down 55°, the forward-firing pair pushing on',
        aim: 'velocity',
        sense: 1,
        ...aimed('forward', [5.4, -7.6, 0.2]),
        confidence: 'derived',
        source: `pitch -54.5°, yaw 178.2° (${GXI}, Table 4.3-IV, actual): "a 9.3 ft/sec posigrade and radially upward separation maneuver" (4.3.1.2.2), "instead of a 3 ft/sec retrograde separation maneuver, a second-rendezvous prephasing posigrade maneuver" (6.1.3)`,
      },
      turned: estimated(PARTING - 120, 'in its attitude two minutes before: not read'),
      on: doc(PARTING, `53:24:57.5, ground commanded 53:24:56 (${GXI}, Tables 4.2-II and 4.3-IV)`),
      off: doc(PARTING + 15, `15.0 s, as commanded (${GXI}, Table 4.3-IV)`),
      deltaV: doc(9.33 * FT, `9.33 ft/s, commanded 8.8 (${GXI}, Table 4.3-IV)`),
    },
    {
      id: 'stand-off',
      label: 'Stand-off: some 16 nautical miles behind the Agena',
      thrusters: 'aft',
      attitude: {
        label: 'Turned about, pitched up 58°',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [-5.4, -8.1, 0.2]),
        confidence: 'derived',
        source: `pitch 58.1°, yaw 179.9° (${GXI}, Table 4.3-IV, actual): "This 9.7 ft/sec retrograde and radially upward maneuver was supposed to have placed the spacecraft in the same orbit as the GATV and with no relative rates" (4.3.1.2.2)`,
      },
      turned: estimated(STAND_OFF - 120, 'in its attitude two minutes before: not read'),
      on: doc(STAND_OFF, `54:37:28, ground commanded 54:37:27 (${GXI}, Tables 4.2-II and 4.3-IV)`),
      off: doc(STAND_OFF + 11.2, `11.2 s, commanded 11.0 (${GXI}, Table 4.3-IV)`),
      deltaV: doc(9.7 * FT, `9.7 ft/s, commanded 8.9 (${GXI}, Table 4.3-IV)`),
    },
    {
      id: 'terminal-phase-2',
      label: 'Terminal phase initiation, coincident orbit: toward the Agena, 292° of travel',
      thrusters: 'forward',
      attitude: {
        label: 'Pitched up 54°, on the line of sight',
        aim: 'velocity',
        sense: 1,
        ...aimed('forward', [-8.8, 11.9, -0.1]),
        confidence: 'derived',
        source: `pitch 53.6°, yaw -0.5° (${GXI}, Table 4.3-IV, actual); "the 292-degree ωt (angle of orbit travel to rendezvous) TPI solution" (4.3.1.2.2)`,
      },
      turned: estimated(TPI_2 - 120, 'in its attitude two minutes before: not read'),
      on: doc(TPI_2, `65:27:22, ground commanded 65:27:21 (${GXI}, Tables 4.2-II and 4.3-IV)`),
      off: doc(TPI_2 + 69, `69.0 s, commanded 24.0 (${GXI}, Table 4.3-IV)`),
      deltaV: doc(14.7 * FT, `14.7 ft/s, ground commanded 14.2 (${GXI}, Table 4.3-IV): the record’s, held against the solved burn`),
      toward: {
        reach: { ahead: derived(0, 'the Agena itself'), above: derived(0, 'the Agena itself') },
        at: doc(
          INTERCEPT_2,
          `the braking the latest figures sent the crew had, 66:38:57 (${GXI}, Table 4.2-II, planned): when the 292° transfer was to arrive`,
        ),
      },
    },
    {
      id: 'midcourse-3',
      label: 'The 34° correction, computed on the ground',
      thrusters: 'forward',
      attitude: {
        label: 'On the line of sight to the Agena',
        aim: 'velocity',
        sense: 1,
        ...aimed('forward', [1.2, -5.8, 0.12]),
        confidence: 'derived',
        source: `the line of sight to the Agena about 91.0° up and 5.0° across (${GXI}, Table 4.3-IV, note e): "Because the onboard radar was not operational, the ground computed a 34-degree correction" (4.3.1.2.2)`,
      },
      turned: estimated(MIDCOURSE_2 - 60, 'on the Agena from the terminal phase on'),
      on: doc(MIDCOURSE_2, `66:30:36, as commanded (${GXI}, Tables 4.2-II and 4.3-IV)`),
      off: doc(MIDCOURSE_2 + 7, `7.0 s, commanded 10.0 (${GXI}, Table 4.3-IV)`),
      deltaV: doc(5.91 * FT, `5.91 ft/s, commanded 6.0 (${GXI}, Table 4.3-IV): the record’s, held against the solved burn`),
      toward: {
        reach: { ahead: derived(0, 'the Agena itself'), above: derived(0, 'the Agena itself') },
        at: doc(INTERCEPT_2, 'as the terminal phase’s'),
      },
    },
    {
      id: 'terminal-braking-2',
      label: 'Braking, coincident orbit: to the Agena, and station kept',
      thrusters: 'forward',
      attitude: {
        label: 'Nose on the Agena, the forward-firing pair braking',
        aim: 'velocity',
        sense: 1,
        confidence: 'estimated',
        source: `no attitude or components read for it (${GXI}, Table 4.3-IV): along the motion, solved on the Agena`,
      },
      turned: estimated(BRAKING_2 - 60, 'on the Agena from the terminal phase on'),
      on: doc(BRAKING_2, `66:34:43, the planned 66:38:57 (${GXI}, Tables 4.2-II and 4.3-IV)`),
      off: doc(BRAKING_2 + 182, `"Braking lasted intermittently for approximately three minutes", 182 s (${GXI}, Table 4.3-IV, note i)`),
      deltaV: doc(
        12.2 * FT,
        `12.2 ft/s, "the resultant ΔV applied during the braking; however, the total ΔV expended during the semi-optical approach was about 30 ft/sec" (${GXI}, Table 4.3-IV, note h): the record’s, held against the braking flown`,
      ),
      toward: {
        station: {
          ahead: estimated(
            50 * FT,
            'the first rendezvous’s 50 ft: no range was read for this one’s station keeping. Taken along the track, the Agena ahead',
          ),
          above: estimated(0, 'not read: level with it'),
        },
        until: doc(LAST_PARTING, `the last separation, 66:52:31 (${GXI}, Table 4.2-II)`),
      },
    },
    {
      id: 'last-separation',
      label: 'The last separation from the Agena',
      thrusters: 'forward',
      attitude: {
        label: 'Nose along the motion, the forward-firing pair braking',
        aim: 'velocity',
        sense: 1,
        ...aimed('forward', [-3, 0, 0], '6.1.3, the 3 ft/s retrograde'),
        confidence: 'derived',
        source: `"At final separation, the crew performed a 3 ft/sec retrograde separation maneuver" (${GXI}, 6.1.3): along the motion, back`,
      },
      turned: estimated(LAST_PARTING - 120, 'in its attitude two minutes before: not read'),
      on: doc(LAST_PARTING, `66:52:31, planned 66:55:00 (${GXI}, Table 4.2-II)`),
      off: estimated(LAST_PARTING + 5, `the 3 ft/s at the forward-firing pair’s thrust: not read`),
      deltaV: assumed(3 * FT, `3 ft/s retrograde, the crew’s (${GXI}, 6.1.3 and 7.1.2.15): no measured figure read`),
    },
  ],
  // The pair flew on joined, docked and then tethered, from the docking to the separation burn: there the Agena is begun
  // again where the ship is, the docked burns in it, and the coincident-orbit rendezvous is made on that (plan.ts `parted`)
  parted: [
    doc(
      PARTING,
      `the separation burn at 53:24:57.5 after the tether was let go at 52:58:36 (${GXI}, Table 4.3-IV; 5.1.5.3.2): docked from 1:34:16, undocked for the tether exercise at 50:12:48 and held to the Agena on the tether until it was released, the two together throughout`,
    ),
  ],
  adapter: {
    equipment: {
      mass: derived(
        (SC11_LAUNCH - RETROGRADE) * LB,
        `the spacecraft at launch (8,374 lb) less at retrofire (5,577 lb: ${GXI}, 3.3): ${(SC11_LAUNCH - RETROGRADE).toFixed(0)} lb, with what the thrusters burned not taken off`,
      ),
      gone: doc(EQUIPMENT, `"Adapter equipment section separation" at 70:39:46, planned 70:40:36 (${GXI}, Table 4.2-II)`),
    },
    retro: {
      mass: derived(
        (RETROGRADE - REENTRY) * LB,
        `spacecraft 11 at retrofire less at 0.05 g (${GXI}, 3.3): ${(RETROGRADE - REENTRY).toFixed(0)} lb, the section with its four rockets unfired`,
      ),
    },
  },
  retro: {
    sequence: estimated(
      RETRO - 60,
      'a minute before retrofire: when the crew had it in retrofire attitude is not read; the timer "successfully initiated the automatic retrofire sequence at 70:41:36.5" (5.1.6)',
    ),
    below: derived(
      (Math.atan2(RETRO_DOWN, RETRO_AFT) * 180) / Math.PI,
      `degrees: "Telemetry data received at Hawaii showed the retrofire velocities to be 303.8 ft/sec aft, 1.3 ft/sec right, and 118.7 ft/sec down" (${GXI}, 6.1.4; the indicator 303 aft and 118 down), so ${((Math.atan2(RETRO_DOWN, RETRO_AFT) * 180) / Math.PI).toFixed(1)}° below the line back along the motion; the 1.3 to the right not flown`,
    ),
    on: doc(RETRO, `70:41:36, as planned (${GXI}, Table 4.2-II); 70:41:36.5 by the electronic timer (5.1.6)`),
    spacing: assumed(5.5, `"fired at 5.5 second intervals in 1-2-3-4 order", the type's (${SEDR}, Section XI, p. 11-73)`),
    count: 4,
    thrust: assumed(2_490 * LBF, `2,490 lb each, the type's (${SP121}, Table 4-I, p. 29)`),
    burn: assumed(5.5, '5.5 s each, the type’s (NASA release 65-81, p. 8)'),
    deltaV: doc(
      325.0 * FT,
      `"A 325.56 ft/sec velocity was predicted for the retrograde rocket system. The IGS measured value was 325.00 ft/sec" (${GXI}, 5.1.8.3)`,
    ),
    gone: assumed(
      RETRO_GONE,
      `45 s after retrofire, when the type's sequence lights the jettison switch (${SP121}, Figure 3-3): "on time at T + 45 seconds" (7.1.2.15)`,
    ),
  },
  entry: {
    mass: doc(REENTRY * LB, `spacecraft 11's re-entry module at 0.05 g, 4,734 lb (${GXI}, 3.3)`),
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
      source: `lift over drag as flown, at every Mach number: the programme's, "flown with an average lift-to-drag ratio of approximately 0.19" (${SP138}, p. 159), taken for spacecraft 11, whose own is not in its report`,
    },
    predicted: derived(
      0.19 / 0.65,
      `the lift over drag the wind tunnels had given, said and not flown: "a decrease of approximately 35 percent in the lift-to-drag ratio" (${SP138}, p. 163), from the 0.19 flown: 0.29`,
    ),
    trim: assumed(8.5, '"8° to 9°" at the greatest heating on GT-3 (Gemini Program Mission Report, Gemini IV, p. 5-3): the type’s, taken'),
    bank: doc(
      10,
      `degrees, to the right of the motion: "From retrofire to an altitude of 400K feet, a 10-degree bank angle toward the south was flown as planned" (${GXI}, 5.1.5.2.3)`,
    ),
    banked: estimated(RETRO_GONE + 1, 'as the retrograde section went: the ship turned to its entry attitude, its lift held from there'),
    banks: [
      {
        label: 'At 400,000 ft: the back-up bank, 44° to the south',
        bank: doc(
          44,
          `"From the 400K-foot level to guidance initiate, the backup bank angle (based on the footprint shift of 22 nautical miles) of 44 degrees toward the south was flown as planned" (${GXI}, 5.1.5.2.3)`,
        ),
        at: doc(ENTRY_400K, `"At 71:01:51.713 g.e.t., the computer commanded a zero-degree bank angle" at 400,000 ft (${GXI}, 5.1.5.2.3)`),
      },
      {
        label: 'Guidance: the first automatic reentry, lift about up',
        bank: estimated(
          0,
          `degrees: from guidance initiate the computer's bank commands, held by the control system "to within one degree" once the crew "selected automatic reentry" 51 s later (${GXI}, 5.1.5.2.3, Figure 5.1.5-12): not read, the lift held up`,
        ),
        at: doc(
          GUIDED,
          `"At 71:04:48.703 g.e.t., ... the computer began to calculate the bank commands necessary to guide the spacecraft to the planned target" (${GXI}, 5.1.5.2.3)`,
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
      `spacecraft 11's re-entry module at the main parachute's deployment, 4,340 lb (${GXI}, 3.3): taken from the drogue on`,
    ),
    drogue: {
      altitude: doc(
        51_000 * FT,
        `"Drogue parachute deploy 71:11:28.44", plotted at about 51,000 ft (${GXI}, Figure 5.1.11-1, read off the figure to a thousand feet)`,
      ),
      dragArea: estimated(
        0.5 * Math.PI * ((8.3 / 2) * FT) ** 2,
        `an 8.3 ft conical ribbon drogue (${CR1106}, p. 218) at a drag coefficient of 0.5, the usual figure for the type: no measured figure found`,
      ),
      fills: derived(17.6, `"Drogue parachute disreef 71:11:46", 17.6 s after it came out (${GXI}, Figure 5.1.11-1)`),
    },
    main: {
      altitude: doc(
        11_000 * FT,
        `"R and R section separation and main parachute deploy 71:13:06.64", plotted at about 11,000 ft (${GXI}, Figure 5.1.11-1, read off the figure); the type's PARA switch is at 10,600 ft (${SEDR}, pp. 4-22 and 4-23)`,
      ),
      dragArea: derived(
        (2 * 4_400 * LB * 9.80665) / (1.225 * (31.6 * FT) ** 2),
        `the 84.2 ft ringsail's (${CR1106}, p. 222): "a mean descent rate of 31.6 fps" for a module of 4,400 lb, at sea level: 344 m²`,
      ),
      fills: derived(13.2, `deployed at 71:13:06.64 and "Main parachute full open" at 71:13:19.8 (${GXI}, Figure 5.1.11-1)`),
    },
    checks: [
      {
        id: 'reentry-module.at',
        label: 'Landing',
        value: LANDING,
        unit: 's',
        tolerance: 60,
        confidence: 'documented',
        source: `${GXI}, Figure 5.1.11-1: 71:17:08.1 (71:17:08 in Table 4.2-II, planned 71:16:50)`,
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
      'Conrad and Gordon landed in the ship after the first automatic reentry of the programme, within sight of the Guam, and were taken aboard by helicopter: the ejection seats were for the pad, the climb and below 15,000 ft, and were not used',
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
        'The retrofire was initiated by the timer at the second the ground set for the planned landing point (Gemini Program Mission Report, Gemini XI, 5.1.6 and Table 4.2-II); the ship came down 3.1 nautical miles from the target by the ground radar at drogue deployment (5.1.5.2.3), so the place it came down is taken for the place its burn was timed for',
    },
    latitude: doc(
      24 + 15.4 / 60,
      `${GXI}, Table 4.3-I, final: 24°15.4′ N 70°00′ W, by the guidance system at drogue deployment; planned 24°18′ N 70°00′ W`,
    ),
    longitude: doc(-70, `${GXI}, Table 4.3-I, final`),
    at: doc(LANDING, `${GXI}, Figure 5.1.11-1: 71:17:08.1`),
    near: 'the western Atlantic, east of the Bahamas',
  },
  // GATV-5006 as the report's tracking had it at its insertion, flown on from there: the craft the rendezvous are made on.
  target: {
    orbit: { fix: INSERTION },
    epoch: '1966-09-12T14:42:26.546Z',
    label: 'GATV-5006',
    mass: doc(7_198 * LB, `the Agena's "Insertion weight (after insertion firing)", 7,198 lb (${GXI}, 3.6)`),
    dragArea: estimated(
      2.2 * 1.52 * 7.95 * 0.8,
      'm²: the free-molecule figure of a body turning every way, 2.2, on its side and its ends as it is held, 0.8 of a 7.95 m Agena 1.52 m across, as the Agenas’ own runs take it (vehicles/target-plan.ts): chosen',
    ),
  },
  events: [
    { id: 'liftoff', label: 'Liftoff', at: doc(0, `${GXI}, Table 4.2-I: 14:42:26.546 G.m.t.`) },
    { id: 'beco', label: 'First stage cutoff: the second stage lit', at: doc(BECO, `${GXI}, Table 4.2-I`), also: 'planned 152.90' },
    {
      id: 'stage-separation',
      label: 'The stages begin to part',
      at: derived(STAGING, `${GXI}, Table 4.2-I: printed 142.02 s, a slip (above)`),
    },
    { id: 'seco', label: 'Second stage cutoff', at: doc(SECO, `${GXI}, Table 4.2-I`), also: 'planned 339.68' },
    { id: 'spacecraft-separation', label: 'Spacecraft separation', at: doc(SEPARATION, `${GXI}, Table 4.2-I`) },
    {
      id: 'insertion',
      label: 'Insertion, after the insertion velocity adjustment and the radial manoeuvre: not flown, the stage cut on this orbit',
      at: doc(INSERTED, `${GXI}, Table 4.3-I; "OAMS off" at 465.30 s (Table 4.2-I)`),
    },
    {
      id: 'fairings',
      label: 'Nose and scanner fairings off',
      at: estimated(FAIRINGS, 'not in the sequence of events: taken as 15 s after the separation, as Gemini VII’s'),
    },
    { id: 'plane-change', label: 'Out-of-plane burn', at: doc(PLANE_CHANGE, `${GXI}, Table 4.2-II`) },
    { id: 'terminal-phase', label: 'Terminal phase initiation', at: doc(TPI, `${GXI}, 4.3.1.2.1; 0:49:58 in Table 4.2-II`) },
    { id: 'midcourse-1', label: 'First midcourse correction', at: doc(MIDCOURSE[0]!, `${GXI}, Table 4.2-II`) },
    { id: 'midcourse-2', label: 'Second midcourse correction', at: doc(MIDCOURSE[1]!, `${GXI}, Table 4.2-II`) },
    { id: 'terminal-braking', label: 'Braking begins', at: doc(BRAKING, `${GXI}, Table 4.2-II`) },
    {
      id: 'station-keeping',
      label: 'Station keeping with the Agena, less than 50 ft',
      at: doc(STATION_KEPT, `"At 1 hour 25 minutes g.e.t., the spacecraft was less than 50 feet from the GATV" (${GXI}, 4.3.1.2.1)`),
    },
    { id: 'docked', label: 'Docked, in the first revolution (not flown here)', at: doc(DOCKING, `${GXI}, 5.4`) },
    { id: 'docked-calibration', label: 'Docked calibration, out of plane', at: doc(CALIBRATION, `${GXI}, Tables 4.2-II and 4.2-IV`) },
    {
      id: 'high-apogee',
      label: 'Docked climb to an apogee of 741.5 nautical miles',
      at: doc(HIGH_APOGEE, `${GXI}, Tables 4.2-II and 4.2-IV`),
    },
    { id: 'recirculation', label: 'Docked return to 164 nautical miles', at: doc(RECIRCULATION, `${GXI}, Tables 4.2-II and 4.2-IV`) },
    {
      id: 'tethered',
      label: 'Undocked and tethered to the Agena, the pair turned slowly about each other (not flown)',
      at: doc(TETHERED, `${GXI}, 5.1.5.3.2 (flight.ts docking.tether)`),
    },
    { id: 'tether-off', label: 'The tether let go', at: doc(TETHER_OFF, `${GXI}, 5.1.5.3.2 (flight.ts docking.tether)`) },
    {
      id: 'agena-separation',
      label: 'Separation: the coincident-orbit rendezvous begins',
      at: doc(PARTING, `${GXI}, Table 4.3-IV; 53:24:58 in Table 4.2-II`),
    },
    { id: 'stand-off', label: 'Stand-off', at: doc(STAND_OFF, `${GXI}, Tables 4.2-II and 4.3-IV`) },
    { id: 'terminal-phase-2', label: 'Terminal phase initiation, coincident orbit', at: doc(TPI_2, `${GXI}, Tables 4.2-II and 4.3-IV`) },
    { id: 'midcourse-3', label: 'The 34° correction', at: doc(MIDCOURSE_2, `${GXI}, Tables 4.2-II and 4.3-IV`) },
    { id: 'terminal-braking-2', label: 'Braking begins, coincident orbit', at: doc(BRAKING_2, `${GXI}, Tables 4.2-II and 4.3-IV`) },
    { id: 'last-separation', label: 'The last separation from the Agena', at: doc(LAST_PARTING, `${GXI}, Table 4.2-II`) },
    { id: 'equipment-section', label: 'Equipment adapter off', at: doc(EQUIPMENT, `${GXI}, Table 4.2-II`) },
    { id: 'retrofire', label: 'Retrofire, automatic', at: doc(RETRO, `${GXI}, Table 4.2-II`) },
    { id: 'entry-400k', label: '400,000 ft', at: doc(ENTRY_400K, `${GXI}, 5.1.5.2.3`) },
    { id: 'computer-banks', label: 'Guidance initiate: the first automatic reentry', at: doc(GUIDED, `${GXI}, 5.1.5.2.3`) },
    { id: 'drogue-deployment', label: 'Drogue parachute', at: doc(DROGUE, `${GXI}, Figure 5.1.11-1; 71:11:29 in Table 4.2-II`) },
    { id: 'main-deployment', label: 'The main parachute out', at: doc(MAIN, `${GXI}, Figure 5.1.11-1; 71:13:08 in Table 4.2-II`) },
    {
      id: 'landing-attitude',
      label: 'Two-point suspension: repositioned for the landing',
      at: doc(LANDING_ATTITUDE, `${GXI}, Figure 5.1.11-1`),
    },
    { id: 'splashdown', label: 'Landing', at: doc(LANDING, `${GXI}, Figure 5.1.11-1; 71:17:08 in Table 4.2-II`) },
  ],
  checks: [
    ...orbitAfter(2400, 'the out-of-plane burn', 86.6, 149.2, 'Table 4.3-II, actual, after the manoeuvre (planned 86.6 by 149.6)'),
    ...orbitAfter(3600, 'the terminal phase initiation', 150.6, 165.7, 'Table 4.3-II, actual (planned 150.3 by 166.0)'),
    ...orbitAfter(7200, 'the first rendezvous', 153.7, 163.1, 'Table 4.3-II, actual, after the braking (planned 156.3 by 165.7)'),
    ...orbitAfter(18000, 'the docked calibration', 154.6, 164.2, 'Table 4.3-II, actual (planned 157.6 by 166.5)'),
    ...orbitAfter(147600, 'the docked climb', 156.3, 741.5, 'Table 4.3-II, actual (planned 156.5 by 739.4)'),
    ...orbitAfter(160200, 'the docked return', 156, 164.2, 'Table 4.3-II, actual (planned 156.4 by 164.1)'),
    ...orbitAfter(194400, 'the separation', 155.7, 165.6, 'Table 4.3-II, actual (planned 155.5 by 165.5)'),
    ...orbitAfter(198000, 'the stand-off', 152.7, 163.8, 'Table 4.3-II, actual (planned 156.0 by 164.3)'),
    ...orbitAfter(237600, 'the coincident-orbit terminal phase', 148.3, 161.8, 'Table 4.3-II, actual (planned 150.4 by 163.4)'),
    ...orbitAfter(
      240600,
      'the coincident-orbit rendezvous',
      155.6,
      164,
      'Table 4.3-II, actual, after the braking (planned 153.9 by 164.3)',
    ),
    ...orbitAfter(243000, 'the last separation', 151, 163, 'Table 4.3-II, actual (planned 152.5 by 163.7)'),
    ...orbitAfter(252000, 'all burns, before retrofire', 151, 163, 'Table 4.3-III, actual, revolution 44 (retrofire); period 90.38 min'),
    impulse(
      'terminal-phase',
      'Terminal phase initiation, impulse',
      143.9,
      0.1 * 143.9,
      'Table 4.3-IV; within 10 per cent, the ground commanding 140.8',
    ),
    impulse('midcourse-1', 'First midcourse correction, impulse', 6.19, 2, 'Table 4.3-IV; within 2 ft/s'),
    impulse('midcourse-2', 'Second midcourse correction, impulse', 2.06, 2, 'Table 4.3-IV; within 2 ft/s'),
    impulse(
      'terminal-braking',
      'Braking, impulse',
      41,
      8,
      'Table 4.3-IV, the resultant of the braking’s pulses; within 8 ft/s, its line not held',
    ),
    impulse(
      'terminal-phase-2',
      'Terminal phase initiation, coincident orbit, impulse',
      14.7,
      0.1 * 14.7,
      'Table 4.3-IV; within 10 per cent, the ground commanding 14.2',
    ),
    impulse('midcourse-3', 'The 34° correction, impulse', 5.91, 2, 'Table 4.3-IV; within 2 ft/s'),
    impulse(
      'terminal-braking-2',
      'Braking, coincident orbit, impulse',
      12.2,
      8,
      'Table 4.3-IV, the resultant of the braking’s pulses; within 8 ft/s',
    ),
    sighting(
      Math.round(INSERTED),
      'Agena at the spacecraft’s insertion',
      232 * NMI,
      15 * NMI,
      '"At spacecraft insertion, the range between Spacecraft 11 and the GATV was 232 nautical miles" (4.3.1.2.1)',
    ),
    sighting(
      Math.round(TPI),
      'Agena at the terminal phase initiation',
      21 * NMI,
      5 * NMI,
      '"The range from the spacecraft to the GATV was approximately 21 nautical miles" (4.3.1.2.1)',
    ),
    sighting(
      Math.round(TPI_2),
      'Agena at the coincident-orbit terminal phase',
      24.9 * NMI,
      5 * NMI,
      '"Data from the Carnarvon station for GATV revolution 41 and from the Antigua station for spacecraft revolution 41 predicted a range of 24.9 nautical miles at TPI ... the ground solution was very accurate" (4.3.1.2.2)',
    ),
    {
      id: 'ejectionAt',
      label: 'Drogue out, at about 51,000 ft',
      value: DROGUE,
      unit: 's',
      tolerance: 60,
      confidence: 'documented',
      source: `${GXI}, Figure 5.1.11-1: 71:11:28.44, planned 71:11:15 (71:11:29 in Table 4.2-II)`,
    },
    {
      id: 'alongTrack',
      label: 'Drogue out, along the track from where it landed',
      value: 0,
      unit: 'm',
      tolerance: 40_000,
      confidence: 'documented',
      source: `${GXI}, Table 4.3-I: it landed at 24°15.4′ N 70°00′ W by the guidance system at drogue deployment; the drogue comes out a few kilometres short of where it lands`,
    },
    {
      id: 'crossTrack',
      label: 'Drogue out, to the right of where it landed',
      value: 0,
      unit: 'm',
      tolerance: 25_000,
      confidence: 'documented',
      source: `${GXI}, 5.1.5.2.3: "the total controlled reentry miss distance at drogue deploy to be 3.1 nautical miles (1.6 nautical miles west and 2.7 nautical miles south of the target) as obtained from ground tracking radar"`,
    },
  ],
};

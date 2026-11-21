/**
 * Gemini-Titan 12 as a flight into orbit: its record (vehicles/gemini-titan-plan.ts `GeminiTitanRecord`), which flight.ts
 * writes its plan from (`geminiTitanPlan`). The record with its sources and disagreements is set out in mission.md beside
 * this file; the numbers live here, each in the source's own units and converted once.
 *
 * Times are seconds from liftoff, 20:46:33.419 UTC, 11 November 1966. The checks' tolerances were written with the record,
 * before the plan was first flown, and nothing here was changed after: a miss is recorded (src/sim/misses.ts), not fitted.
 * The mission report (MSC-G-R-67-1) has this flight's own weights, engines, sequence, manoeuvres, orbits and entry, read
 * in its text layer and on the page; what it lacks (the separation speeds of the adapter's sections, the parachutes'
 * sizes, the retrorockets one by one) is the type's, and says so.
 *
 * The Agena it went up to meet, GATV-5001, is the flight's target (`target`): the report's final tracking vector at its
 * insertion, flown on from there on gravity and the air (sim/plan.ts `TargetDef` `orbit`). The coelliptic burn, the
 * terminal phase, its four corrections and the braking are made on it, solved as each lights; the three burns before them
 * are flown at the record's instants and impulses. The two phasing burns the Agena's secondary propulsion made with the
 * pair docked are flown as the spacecraft's (`thrusters: 'docked'`), at the pair's measured impulse: the spacecraft is
 * flown alone, and the Agena in this run is not moved by them. The docking, the undockings and dockings after it, the
 * tether and the walks are not flown; the separation, the last phasing burn, the retrofire and the entry are.
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

const GXII = 'Gemini Program Mission Report, Gemini XII (MSC-G-R-67-1)';
const SP121 = 'Gemini Midprogram Conference (NASA SP-121, 1966)';
const SP138 = 'Gemini Summary Conference (NASA SP-138, 1967)';
const GI = 'Gemini Program Mission Report GT-1 (NTRS 19670095753)';
const CR1106 = 'Project Gemini: A Technical Summary (Malik and Souris, NASA CR-1106, 1968)';
const KING_HELE =
  '“a value of 2.2 is recommended for perigee heights of 150-400 km”, on the cross-section square to the motion (King-Hele, The Prediction of Satellite Lifetimes, RAE TR 87030, 1987, §9.1, after Cook 1965): a satellite’s, as Vostok’s and Mercury’s (vostok-3ka.ts SHIP_RAREFIED). Nothing published for Gemini';

/**
 * GATV-5001 at its insertion, as the report's tracking had it (Table 4.3-V, the final vector), on this flight's clock: the
 * Atlas-Agena lifted off 1:38:34.731 before the Titan. The flight's target is flown from it (`target`), and the docking
 * chapter starts from it (flight.ts `docking.fixes`).
 */
export const INSERTION = targetFix(GXII + ', table 4.3-V, final insertion', -5914.731, 556.05, 28.52, -59.63, 981195, 25365, 0.04, 95.54);

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

// GLV-12's weights with spacecraft 12 aboard (the mission report, 3.3, "obtained from the GLV contractor", read in its text
// layer: the table is headed "the Gemini XI Space Vehicle", a slip, under 3.3's "Gemini Space Vehicle" for this flight): at
// liftoff, at the first stage's cutoff, at the second stage's start of steady burning, at its cutoff; and spacecraft 12.
const LIFTOFF = 342_092;
const BECO_WT = 85_386;
const STAGE2_STEADY = 74_011;
const SECO_WT = 14_499;
const SC12_LAUNCH = 8_296.47;
/** What the second stage burned after its cutoff, lb: its shutdown impulse, 33,971 lb-s (5.2.2.1.2), at its specific impulse. */
const SHUTDOWN = 33_971 / 313.22;
/**
 * The usable propellant still in the second stage at its cutoff, lb: "the achieved vehicle performance was 9181 pounds
 * or ... 885 pounds more than the actual payload weight" (5.2), and "The amount of propellants remaining at Stage II
 * engine shutdown could have sustained Stage II flight an additional 2.53 seconds" (5.2.2.2.2): the margin is taken for
 * it, as Gemini-Titan 7's is.
 */
const RESERVE = 885;
const STAGE2_DRY = SECO_WT - SHUTDOWN - RESERVE - SC12_LAUNCH;
const STAGE2_BURNED = STAGE2_STEADY - SECO_WT + SHUTDOWN + RESERVE;
const STAGE1_DRY = BECO_WT - STAGE2_STEADY;
const STAGE2_GROSS = STAGE2_DRY + STAGE2_BURNED;
const STAGE1_GROSS = LIFTOFF - SC12_LAUNCH - STAGE2_GROSS;
// Spacecraft 12's weights through its descent (3.3): at retrofire (the equipment section gone), at 0.05 g (the retrograde
// section gone), at the main parachute's deployment.
const RETROGRADE = 5_627.87;
const REENTRY = 4_802.18;
const MAIN_DEPLOY = 4_403.74;

/** The first stage's two chambers at standard inlet conditions, postflight reconstructed (Table 5.2-I, read on the page). */
const S1_SL = 433_973;
const S1_ISP_SL = 260.29;
/** GLV-1's specific impulse at 155 s over its figure at 5 s (GT-1 report, Table 5-II): how far the type's rose with height. */
const GLV1_RISE = 281.1 / 257.3;
const S1_ISP_VAC = S1_ISP_SL * GLV1_RISE;

/** The record's instants (Tables 4.2-I and 4.2-II, read on the page; the manoeuvres' to the tenth from Table 5.1.5-V). */
const BECO = 154.75;
const STAGING = 155.45;
/** The second stage's chamber pressure rising: GLV-6's stages parted 0.015 s after it (Launch Vehicle No. 6 Flight Evaluation, II.C). */
const LIGHT = STAGING - 0.015;
const SECO = 343.54;
const SEPARATION = 366.72;
const INSERTED = 439.8;
const FAIRINGS = SEPARATION + 15;
const PHASE_ADJUST = T(0, 49, 39.9);
const PLANE_CHANGE = T(1, 14, 22.3);
const CORRECTIVE = T(1, 47, 52.3);
const COELLIPTIC = T(2, 22, 54.5);
const TPI = T(3, 5, 47.3);
const MIDCOURSE = [T(3, 11, 14.3), T(3, 17, 7.1), T(3, 23, 45.9), T(3, 29, 5.2)];
const BRAKING = T(3, 32, 35.9);
const DOCKING = T(4, 13, 52);
const ECLIPSE_1 = T(7, 5, 6);
const ECLIPSE_2 = T(15, 16, 18);
const PARTING = T(52, 14, 27.0);
const PHASING = T(61, 47, 47.9);
const EQUIPMENT = T(93, 59, 3);
const RETRO = T(93, 59, 58);
const RETRO_GONE = RETRO + 45;
const ENTRY_400K = T(94, 20, 12);
const GUIDED = T(94, 23, 6);
const GUIDANCE_OFF = T(94, 28, 24);
const DROGUE = T(94, 29, 10);
const MAIN = T(94, 30, 37.718);
const LANDING_ATTITUDE = T(94, 31, 3.588);
const LANDING = T(94, 34, 30);
/** When the terminal phase's transfer was to bring the ship to the Agena: "the theoretical TPF maneuver computed on the ground" for the burn made (Table 4.3-IV, note g). */
const INTERCEPT = T(3, 38, 12);

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

/** The retrofire's push as the guidance system measured it (Table 5.1.5-V): back along the motion and down, ft/s. */
const RETRO_AFT = 300.8;
const RETRO_DOWN = 113.5;

/**
 * A manoeuvre's attitude from its measured components (Table 5.1.5-V, the inertial guidance system's: "V_X is positive in
 * the direction of motion, V_Y is positive towards the center of the earth, and V_Z is positive to the left of the orbit
 * path", Table 4.3-IV, note c), ft/s: the nose along the push for the aft-firing pair, against it for a pair that pushes
 * toward the tail (the forward-firing, and the Agena's engine with the pair docked), as an aim along the motion turned in
 * the level (`yaw`, to the left) and pitched below it (`below`).
 */
const aimed = (
  thrusters: 'aft' | 'forward' | 'docked',
  [forward, down, left]: readonly [number, number, number],
  from = 'Table 5.1.5-V',
) => {
  const k = thrusters === 'aft' ? 1 : -1;
  const [x, y, z] = [k * forward, k * left, -k * down];
  const why = `from the push the guidance system measured, ${forward} ft/s forward, ${down} down and ${left} left (${GXII}, ${from}), the nose ${thrusters === 'aft' ? 'along it, the aft-firing pair pushing toward the nose' : 'against it, the push toward the tail'}`;
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
    source: `${GXII}, ${where}: ${nmi} nautical miles. Read at ${new Date(at * 1000).toISOString().slice(11, 19)}`,
  }));
/** The impulse a manoeuvre gave (`<id>.velocity`, orbital.ts `OrbitResults`), ft/s, and how near. */
const impulse = (id: string, label: string, fps: number, within: number, where: string) => ({
  id: `${id}.velocity` as const,
  label,
  value: fps * FT,
  unit: 'm/s',
  tolerance: within * FT,
  confidence: 'documented' as const,
  source: `${GXII}, ${where}: ${fps} ft/s`,
});
/** How far the Agena was at an instant (gemini-titan-plan.ts: `at-<s>.range`), m. */
const sighting = (at: number, label: string, value: number, within: number, where: string) => ({
  id: `at-${at}.range` as const,
  label,
  value,
  unit: 'm',
  tolerance: within,
  confidence: 'documented' as const,
  source: `${GXII}, ${where}`,
});

export const orbital: GeminiTitanRecord = {
  liftoffMass: doc(
    LIFTOFF * LB,
    `342,092 lb at liftoff with spacecraft 12 (${GXII}, 3.3); 345,710 lb at the first stage's ignition. The stages' figures below are worked from the same table and sum to it`,
  ),
  titan: {
    first: {
      name: 'Titan first stage',
      nodes: ['TitanStage1', 'TitanStage1Engine', 'TitanInterstage'],
      mass: derived(
        STAGE1_GROSS * LB,
        `GLV-12 at liftoff (342,092 lb) less spacecraft 12 (8,296.47 lb) and the second stage (${STAGE2_GROSS.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb, below): ${STAGE1_GROSS.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb (${GXII}, 3.3). The interstage goes with it. Loaded: 90,042 lb of fuel and 171,468 of oxidiser (5.2.2.2.1)`,
      ),
      dry: derived(
        STAGE1_DRY * LB,
        `the vehicle at the first stage's cutoff (85,386 lb) less at the second stage's steady burn (74,011 lb): ${STAGE1_DRY.toLocaleString('en-US')} lb with what was left in its tanks (${GXII}, 3.3), 133 lb of oxidiser among it (5.2.2.2.2)`,
      ),
      propellant: derived(
        (STAGE1_GROSS - STAGE1_DRY) * LB,
        `the stage at liftoff less as it was let go: ${(STAGE1_GROSS - STAGE1_DRY).toLocaleString('en-US', { maximumFractionDigits: 0 })} lb burned from liftoff (${GXII}, 3.3); "The lower than predicted mixture ratio resulted in a fuel depletion shutdown" (5.2.2.1.1)`,
      ),
      engine: {
        // (its two chambers on the one stage as one engine: a plan's engine count is its body's units, plan.ts `BodyDef.count`)
        name: 'Aerojet LR87-AJ-7 (two chambers)',
        count: 1,
        thrust: {
          seaLevel: assumed(
            S1_SL * LBF,
            `GLV-12's own, postflight reconstructed at standard inlet conditions, 433,973 lb (predicted 433,538: ${GXII}, Table 5.2-I, read on the page), taken as the sea-level figure, as an acceptance test's is (GLV-6's at standard inlet, 427,396 lb, is within 0.1 per cent of its acceptance test: Launch Vehicle No. 6 Flight Evaluation, Table III-3). The flight's average, 458,905 lb, lies between this and the vacuum figure below`,
          ),
          vacuum: derived(
            (S1_SL * S1_ISP_VAC * LBF) / S1_ISP_SL,
            `the sea-level figure at the vacuum specific impulse over the sea-level one (the same flow): ${Math.round((S1_SL * S1_ISP_VAC) / S1_ISP_SL).toLocaleString('en-US')} lb for the two`,
          ),
        },
        isp: {
          seaLevel: assumed(
            S1_ISP_SL,
            `GLV-12's at standard inlet conditions, 260.29 s (predicted 259.90: ${GXII}, Table 5.2-I), taken as the sea-level figure`,
          ),
          vacuum: assumed(
            S1_ISP_VAC,
            `GLV-12's 260.29 s raised as GLV-1's rose from 5 s to 155 s, 257.3 to 281.1 s (${GI}, Table 5-II): ${S1_ISP_VAC.toFixed(2)} s. GLV-12's own flight average was 277.03 s (${GXII}, Table 5.2-I), between the two`,
          ),
        },
        nozzle: GLV_NOZZLES.first,
      },
      ignition: doc(0, `started on the pad, the ignition signal (87FS1) at -3.23 s (${GXII}, Table 4.2-I): the run begins at release`),
      cutoff: doc(BECO, `87FS2, stage I engine shutdown, at 154.75 s, planned 153.38 (${GXII}, Table 4.2-I, read on the page)`),
    },
    second: {
      name: 'Titan second stage',
      nodes: ['TitanStage2', 'TitanStage2Engine'],
      mass: derived(
        STAGE2_GROSS * LB,
        `its weight at cutoff and what it burned, below: ${STAGE2_GROSS.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb (${GXII}, 3.3). Loaded: 22,048 lb of fuel and 38,758 of oxidiser (5.2.2.2.1)`,
      ),
      dry: assumed(
        STAGE2_DRY * LB,
        `the vehicle at the second stage's cutoff (14,499 lb) less spacecraft 12 (8,296.47 lb), what the engine burned after its cutoff signal (its shutdown impulse of 33,971 lb-s at 313.22 s, ${SHUTDOWN.toFixed(0)} lb, burned at full thrust here) and the usable propellant it still held, taken as the vehicle's achieved performance over the spacecraft, 885 lb: ${STAGE2_DRY.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb (${GXII}, 3.3, 5.2 and 5.2.2.1.2)`,
      ),
      propellant: assumed(
        STAGE2_BURNED * LB,
        `what it could burn from the start of its steady burn: ${STAGE2_BURNED.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb, from 74,011 lb to its cutoff at 14,499, the shutdown's ${SHUTDOWN.toFixed(0)} lb after it, and the 885 lb of margin (${GXII}, 3.3, 5.2 and 5.2.2.1.2). The run's guidance cuts it on the orbit, as the radio guidance did`,
      ),
      engine: {
        name: 'Aerojet LR91-AJ-7',
        count: 1,
        thrust: {
          vacuum: doc(
            99_296 * LBF,
            `GLV-12's flight average, postflight reconstructed, 99,296 lb (predicted 100,490: ${GXII}, Table 5.2-II, read on the page)`,
          ),
        },
        isp: { vacuum: doc(313.22, `GLV-12's flight average, 313.22 s (predicted 312.93: ${GXII}, Table 5.2-II)`) },
        nozzle: GLV_NOZZLES.second,
      },
      ignition: assumed(
        LIGHT,
        `its thrust from the chamber pressure's rise, which on GLV-6 was 0.015 s before the stages parted (Launch Vehicle No. 6 Flight Evaluation, II.C, and Table II-4): here 155.45 s less that, with the stages still joined. The ignition signal, 91FS1, was at 154.75 s with the first stage's shutdown (${GXII}, Table 4.2-I); the main fuel injection pressure switch made at 155.48`,
      ),
      cutoff: doc(SECO, `91FS2 at 343.54 s, planned 339.76; the redundant shutdown at 343.59 (${GXII}, Table 4.2-I)`),
    },
    staging: doc(STAGING, `"Stage separation begin" at 155.45 s, 0.70 s after the staging signal (${GXII}, Table 4.2-I)`),
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
    at: doc(SEPARATION, `"Spacecraft separation (shape charge fired)" at 366.72 s, planned 359.76 (${GXII}, Table 4.2-I)`),
    push: derived(
      (3.2 * FT * (SC12_LAUNCH + STAGE2_DRY)) / STAGE2_DRY,
      `the 3.2 ft/s the spacecraft's guidance measured for the separation (${GXII}, Table 5.1.5-V), "a separation maneuver of 3 seconds" (Table 4.2-I, note a), as the joint's push shared by the masses as every separation is (the empty second stage ${STAGE2_DRY.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb)`,
    ),
    mass: derived(
      SC12_LAUNCH * LB,
      `the spacecraft at launch, 8,296.47 lb (${GXII}, 3.3): what stayed on the launch vehicle and the fairings thrown off after are not read`,
    ),
  },
  ascent: {
    guidance: {
      azimuth: doc(100.6, `"Roll program start (launch azimuth = 100.6 deg)" at 7.99 s, its end at 20.47 (${GXII}, Table 4.2-I)`),
      vertical: doc(23.05, `up the plumb line until "Pitch program rate no. 1 start" at 23.05 s, planned 23.04 (${GXII}, Table 4.2-I)`),
      kick: estimated(15, 's: the stored pitch programme’s rates are not in the report; a pitch-over of fifteen seconds is ours'),
      turn: estimated(
        BECO,
        's: the radio guidance’s closed loop flown as the law’s linear tangent from staging; the first stage’s programme before it. The radio guidance was enabled at 162.40 s and its first command came at 168.01 (Table 4.2-I)',
      ),
      target: {
        at: 'seco',
        altitude: doc(
          526_195 * FT,
          `${GXII}, Table 4.3-I, final: 526,195 ft at the second stage's cutoff, a geodetic height (its earth model the Fischer ellipsoid's, Table 4.3-II, note b)`,
        ),
        over: 'ellipsoid',
        climb: doc(0, `${GXII}, Table 4.3-I, final: 0.0° space-fixed at cutoff`),
        inclination: doc(
          28.87,
          `${GXII}, Table 4.3-III, actual, at insertion: 28.87°, what its insertion state (Table 4.3-I: 25.50° N, 65.09° W, heading 104.31°) gives read as a tracking vector is (sim/pursuit.ts fixState)`,
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
      'the spacecraft’s centre of mass at the heat shield’s rim, Z103.44 (the model’s origin): spacecraft 12’s at launch was at Z104.84 (the mission report, 3.3), its own Z reference 13.44 in aft of the mating plane; not reduced to the model’s',
    ),
    sheds: [
      {
        on: 'staging-nuts',
        name: 'Titan first stage',
        from: doc(0, 'the first stage engines’ exit plane, station 1348.103 (titan-ii-glv.md)'),
        to: derived(STATION(500), 'the separation plane, station 500, with the interstage on it (titan-ii-glv.md)'),
        radius: doc(60 * IN, 'the 120 in tank (titan-ii-glv.md)'),
        mass: derived(STAGE1_DRY * LB, 'GLV-12’s as it was let go (as the plan’s, above)'),
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
        mass: derived(STAGE2_DRY * LB, 'GLV-12’s at cutoff less the spacecraft (as the plan’s)'),
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
        mass: derived((SC12_LAUNCH - RETROGRADE) * LB, 'the spacecraft at launch less at retrofire (as the plan’s, below)'),
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
        value: 86.8 * NMI,
        unit: 'm',
        tolerance: 12_000,
        confidence: 'documented',
        source: `${GXII}, Table 4.3-III, actual, at insertion: 86.8 nautical miles (planned 86.7); the insertion velocity adjustment's 30.6 ft/s in it`,
      },
      {
        id: 'apogee',
        label: 'Apogee at insertion',
        value: 146.1 * NMI,
        unit: 'm',
        tolerance: 25_000,
        confidence: 'documented',
        source: `${GXII}, Table 4.3-III: 146.1 nautical miles (planned 149.8)`,
      },
      {
        id: 'inclination',
        label: 'Inclination',
        value: 28.87,
        unit: '°',
        tolerance: 0.25,
        confidence: 'documented',
        source: `${GXII}, Table 4.3-III`,
      },
      {
        id: 'cutoffSpeed',
        label: 'Speed at insertion, space-fixed',
        value: 25_742 * FT,
        unit: 'm/s',
        tolerance: 30,
        confidence: 'documented',
        source: `${GXII}, Table 4.3-I, final: 25,742 ft/s at insertion, 439.8 s, after the insertion velocity adjustment (25,713 at the separation, 25,637 at the cutoff). The run's guidance cuts the stage on the orbit at insertion, so the adjustment is in its cut`,
      },
    ],
  },
  orbit: {
    over: {
      is: 'oblate',
      confidence: 'documented',
      source: `${GXII}, Table 4.3-III, note b: "Actual elements are calculated over an oblate earth referenced to the Fischer ellipsoid earth model of 1960". The ellipsoid is WGS 84’s, not Fischer’s`,
    },
    perigee: doc(86.8 * NMI, `${GXII}, Table 4.3-III, actual, revolution 1 (insertion): 86.8 nautical miles; ${CHRONOLOGY}`),
    apogee: doc(146.1 * NMI, `${GXII}, Table 4.3-III: 146.1 nautical miles`),
    inclination: doc(28.87, `${GXII}, Table 4.3-III`),
    // (no period: the report's 88.87 min, Table 4.3-III, is not its heights' orbit, whose axis is some 6 km shorter, flown
    // perigee to perigee over the oblate earth; the heights are the orbit flown, and the period a figure: mission.md)
  },
  injection: {
    at: doc(
      INSERTED,
      `${GXII}, Table 4.3-I: "Spacecraft insertion" at 439.8 s, after "a separation maneuver of 3 seconds, an Insertion Velocity Adjust Routine (IVAR) maneuver of 34 seconds, and a lateral maneuver of 22 seconds" (Table 4.2-I, note a): the published orbit is the one there (Table 4.3-III)`,
    ),
    heading: 'south',
    arc: derived(
      (848.9 * NMI) / 6_371_000 / (Math.PI / 180),
      `degrees: the range at insertion, 848.9 nautical miles (${GXII}, Table 4.3-I, final), over the Earth's mean radius. Flying the ascent replaces it`,
    ),
    anomaly: derived(
      8.3,
      `degrees: from the flight-path angle at insertion, +0.07° (${GXII}, Table 4.3-I, final), on the published orbit’s eccentricity, 0.0082: tan γ = e sin ν / (1 + e cos ν), so eight degrees past perigee`,
    ),
  },
  mass: derived(
    SC12_LAUNCH * LB,
    `the spacecraft at launch, 8,296.47 lb (${GXII}, 3.3), taken for it in orbit: what it left on the launch vehicle, the fairings and the propellant its burns took are not taken off`,
  ),
  rarefied: {
    drag: assumed(2.2, KING_HELE),
    area: estimated(
      (OUTSIDE / 4) * IN * IN,
      `m²: a quarter of the orbit configuration's whole outside, ${(OUTSIDE * IN * IN).toFixed(1)} m², which is what a convex body presents on the average over every way it can lie (Cauchy): the ship was turned for each burn and alignment, held on the Agena through the terminal phase, docked to it for two days and tethered to it, and powered down to drift, and how it lay between was not recorded`,
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
      name: 'GATV-5001’s secondary propulsion, docked',
      count: 2,
      thrust: assumed(
        200 * LBF,
        '200 lb each, the Agena’s two large chambers: "a large and a small thrust chamber ... 200 pounds of thrust and 16 pounds of thrust" (Launch Systems Final Report, p. III.C-15; gemini-targets.ts agenaMotors), firing aft on the Agena and so toward the docked spacecraft’s tail. What a docked burn gives is the record’s impulse; this is only how hard it can push',
      ),
      isp: estimated(
        250,
        's: NOT FOUND for the secondary propulsion; nothing reads it, the docked burns drawing on no tank of the spacecraft’s',
      ),
    },
  },
  // Each from the report's Table 4.3-IV (planned, ground commanded and actual) and Table 5.1.5-V (the guidance system's
  // components: the attitude each is worked from, and each impulse), read on the page. The first three are flown as
  // recorded; the rendezvous after them is made on the Agena (`toward`), the record's impulse then a check (`checks`); the
  // two docked burns are the Agena's, flown on the spacecraft at the pair's impulse; the last two as recorded.
  moves: [
    {
      id: 'phase-adjust',
      label: 'Phase adjust: the perigee raised',
      thrusters: 'aft',
      attitude: {
        label: 'Blunt end aft, along the motion',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [66.7, -0.3, 0.2]),
        confidence: 'derived',
        source: `pitch 0.2°, yaw -0.2° (${GXII}, Table 4.3-IV, actual)`,
      },
      turned: estimated(PHASE_ADJUST - 120, 'in its attitude two minutes before: not read'),
      on: doc(PHASE_ADJUST, `0:49:39.9, as planned (${GXII}, Tables 4.2-II and 5.1.5-V)`),
      off: doc(PHASE_ADJUST + 88.6, `88.6 s with the zeroing of the indicator, planned 88.0 (${GXII}, Table 4.3-IV)`),
      deltaV: doc(
        66.7 * FT,
        `66.7 ft/s, planned 66.6 (${GXII}, Table 5.1.5-V): the perigee from 86.8 to 123.4 nautical miles (Table 4.3-II)`,
      ),
    },
    {
      id: 'plane-change',
      label: 'Plane change: into the Agena’s plane',
      thrusters: 'aft',
      attitude: {
        label: 'Yawed 91° right',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [-0.2, 0.3, -8.4]),
        confidence: 'derived',
        source: `pitch -1.8°, yaw 91.1° (${GXII}, Table 4.3-IV, actual)`,
      },
      turned: estimated(PLANE_CHANGE - 120, 'in its attitude two minutes before: not read'),
      on: doc(PLANE_CHANGE, `1:14:22.3, as planned (${GXII}, Tables 4.2-II and 5.1.5-V)`),
      off: doc(PLANE_CHANGE + 36, `36.0 s with the zeroing of the indicator, planned 10.0 (${GXII}, Table 4.3-IV)`),
      deltaV: doc(8.5 * FT, `8.5 ft/s, planned 7.4 (${GXII}, Table 5.1.5-V)`),
    },
    {
      id: 'corrective-combination',
      label: 'Corrective combination',
      thrusters: 'aft',
      attitude: {
        label: 'Pitched up 27° and yawed 8° left',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [7.4, -3.9, -1]),
        confidence: 'derived',
        source: `pitch 27.3°, yaw 7.7° (${GXII}, Table 4.3-IV, actual)`,
      },
      turned: estimated(CORRECTIVE - 120, 'in its attitude two minutes before: not read'),
      on: doc(CORRECTIVE, `1:47:52.3, as planned (${GXII}, Tables 4.2-II and 5.1.5-V)`),
      off: doc(CORRECTIVE + 17, `17.0 s with the zeroing of the indicator, planned 12.0 (${GXII}, Table 4.3-IV)`),
      deltaV: doc(
        8.4 * FT,
        `8.4 ft/s, ground commanded 7.6 (${GXII}, Table 5.1.5-V): the apogee from 145.9 to 151.7 nautical miles (Table 4.3-II)`,
      ),
    },
    {
      id: 'coelliptic',
      label: 'Coelliptic burn: some 65 nautical miles behind the Agena',
      thrusters: 'aft',
      attitude: {
        label: 'Blunt end aft, pitched up 7°',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [49.5, -6.4, -0.2]),
        confidence: 'derived',
        source: `pitch 7.4°, yaw 0.2° (${GXII}, Table 4.3-IV, actual); "performed at a range of approximately 65 nautical miles from the GATV" (4.1)`,
      },
      turned: estimated(COELLIPTIC - 120, 'in its attitude two minutes before: not read'),
      on: doc(COELLIPTIC, `2:22:54.5, ground commanded 2:22:54 (${GXII}, Tables 4.2-II and 5.1.5-V)`),
      off: doc(COELLIPTIC + 60, `60.0 s with the zeroing of the indicator, commanded 66.0 (${GXII}, Table 4.3-IV)`),
      deltaV: doc(49.9 * FT, `49.9 ft/s, as commanded (${GXII}, Table 5.1.5-V): the record’s, held against the solved burn (the checks)`),
      toward: { coelliptic: true },
    },
    {
      id: 'terminal-phase',
      label: 'Terminal phase initiation: toward the Agena, on the backup charts',
      thrusters: 'aft',
      attitude: {
        label: 'Pitched up 27°, on the line of sight',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [19.4, -10.1, 0.5]),
        confidence: 'derived',
        source: `pitch 27.5°, yaw -1.4° (${GXII}, Table 4.3-IV, actual); "the use of onboard backup charts for terminal phase maneuver determination" (4.1)`,
      },
      turned: estimated(TPI - 120, 'in its attitude two minutes before: not read'),
      on: doc(TPI, `3:05:47.3, ground commanded 3:05:51 (${GXII}, Tables 4.2-II and 5.1.5-V)`),
      off: doc(TPI + 29, `29.0 s with the zeroing of the indicator, commanded 30.0 (${GXII}, Table 4.3-IV)`),
      deltaV: doc(21.8 * FT, `21.8 ft/s, ground commanded 23.2 (${GXII}, Table 5.1.5-V): the record’s, held against the solved burn`),
      toward: {
        reach: { ahead: derived(0, 'the Agena itself'), above: derived(0, 'the Agena itself') },
        at: derived(
          INTERCEPT,
          `"the theoretical TPF maneuver computed on the ground but ... not sent to the crew", at 3:38:12 (${GXII}, Table 4.3-IV, note g): when the transfer was to arrive`,
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
        ...aimed('forward', [-0.1, -1.7, 0.1]),
        confidence: 'derived',
        source: `the line of sight to the Agena about 36.7° up and 1.2° across (${GXII}, Table 4.3-IV, note f): the pair whose push is nearest taken`,
      },
      turned: estimated(MIDCOURSE[0]! - 60, 'on the Agena from the terminal phase on'),
      on: doc(MIDCOURSE[0]!, `not computed on the ground, made by the crew (${GXII}, Tables 4.2-II, 4.3-IV and 5.1.5-V)`),
      off: doc(MIDCOURSE[0]! + 6, `6 s with the zeroing of the indicator (${GXII}, Table 4.3-IV)`),
      deltaV: doc(1.7 * FT, `1.7 ft/s (${GXII}, Table 5.1.5-V): the record’s, held against the solved burn`),
      toward: {
        reach: { ahead: derived(0, 'the Agena itself'), above: derived(0, 'the Agena itself') },
        at: derived(INTERCEPT, 'as the terminal phase’s'),
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
        ...aimed('forward', [-1.4, -2.8, -0.1]),
        confidence: 'derived',
        source: `the line of sight to the Agena about 50.6° up and 2.7° across (${GXII}, Table 4.3-IV, note f): the pair whose push is nearest taken`,
      },
      turned: estimated(MIDCOURSE[1]! - 60, 'on the Agena from the terminal phase on'),
      on: doc(MIDCOURSE[1]!, `not computed on the ground, made by the crew (${GXII}, Tables 4.2-II, 4.3-IV and 5.1.5-V)`),
      off: doc(MIDCOURSE[1]! + 8, `8 s with the zeroing of the indicator (${GXII}, Table 4.3-IV)`),
      deltaV: doc(3.1 * FT, `3.1 ft/s (${GXII}, Table 5.1.5-V): the record’s, held against the solved burn`),
      toward: {
        reach: { ahead: derived(0, 'the Agena itself'), above: derived(0, 'the Agena itself') },
        at: derived(INTERCEPT, 'as the terminal phase’s'),
      },
    },
    {
      id: 'midcourse-3',
      label: 'Third midcourse correction',
      thrusters: 'aft',
      attitude: {
        label: 'On the line of sight to the Agena',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [0.3, 0.5, 1.2]),
        confidence: 'derived',
        source: `the line of sight to the Agena about 73.8° up and 5.8° across (${GXII}, Table 4.3-IV, note f): the pair whose push is nearest taken`,
      },
      turned: estimated(MIDCOURSE[2]! - 60, 'on the Agena from the terminal phase on'),
      on: doc(MIDCOURSE[2]!, `not computed on the ground, made by the crew (${GXII}, Tables 4.2-II, 4.3-IV and 5.1.5-V)`),
      off: doc(MIDCOURSE[2]! + 4, `4 s with the zeroing of the indicator (${GXII}, Table 4.3-IV)`),
      deltaV: doc(1.4 * FT, `1.4 ft/s (${GXII}, Table 5.1.5-V): the record’s, held against the solved burn`),
      toward: {
        reach: { ahead: derived(0, 'the Agena itself'), above: derived(0, 'the Agena itself') },
        at: derived(INTERCEPT, 'as the terminal phase’s'),
      },
    },
    {
      id: 'midcourse-4',
      label: 'Fourth midcourse correction',
      thrusters: 'aft',
      attitude: {
        label: 'On the line of sight to the Agena',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [1.1, 4.8, -0.2]),
        confidence: 'derived',
        source: `the line of sight to the Agena about 102.4° up and 10.9° across (${GXII}, Table 4.3-IV, note f): the pair whose push is nearest taken`,
      },
      turned: estimated(MIDCOURSE[3]! - 60, 'on the Agena from the terminal phase on'),
      on: doc(MIDCOURSE[3]!, `not computed on the ground, made by the crew (${GXII}, Tables 4.2-II, 4.3-IV and 5.1.5-V)`),
      off: doc(MIDCOURSE[3]! + 6, `6 s with the zeroing of the indicator (${GXII}, Table 4.3-IV)`),
      deltaV: doc(4.9 * FT, `4.9 ft/s (${GXII}, Table 5.1.5-V): the record’s, held against the solved burn`),
      toward: {
        reach: { ahead: derived(0, 'the Agena itself'), above: derived(0, 'the Agena itself') },
        at: derived(INTERCEPT, 'as the terminal phase’s'),
      },
    },
    {
      id: 'terminal-braking',
      label: 'Braking: to the Agena, and station kept',
      thrusters: 'forward',
      attitude: {
        label: 'Nose on the Agena, the forward-firing pair braking',
        aim: 'velocity',
        sense: 1,
        ...aimed('forward', [11.2, -15.9, -2.3]),
        confidence: 'derived',
        source: `"28.4 aft, 0.3 up, 0.1 lt" along the line of sight, the theoretical braking computed on the ground (${GXII}, Table 4.3-IV, note e): braking is along the line of sight`,
      },
      turned: estimated(BRAKING - 60, 'on the Agena from the terminal phase on'),
      on: doc(BRAKING, `3:32:35.9, the ground’s theoretical 3:38:12 (${GXII}, Tables 4.2-II and 5.1.5-V)`),
      off: doc(BRAKING + 780, `"Braking lasted intermittently for about 13 minutes" (${GXII}, Table 4.3-IV, note i)`),
      deltaV: doc(
        19.7 * FT,
        `19.7 ft/s, "the resultant ΔV applied during braking; however, the total ΔV expended during the semi-optical approach was about 30 ft/sec" (${GXII}, Tables 5.1.5-V and 4.3-IV, note h): the record’s, held against the braking flown`,
      ),
      toward: {
        station: {
          ahead: estimated(
            50 * FT,
            'about 50 ft, the station keeping the docking chapter flies (flight.ts docking.transfer): the report gives no range for it, only that "at 3 hours 45 minutes ... the crew reported station keeping with the GATV" (4.1). Taken along the track, the Agena ahead',
          ),
          above: estimated(0, 'not read: level with it'),
        },
        until: doc(DOCKING, `"The initial docking occurred at 4:13:52 g.e.t." (${GXII}, 4.1): the docking itself is not flown`),
      },
    },
    {
      id: 'eclipse-phasing-1',
      label: 'First eclipse phasing, docked: the Agena’s secondary propulsion',
      thrusters: 'docked',
      attitude: {
        label: 'The pair nose first, the Agena’s chambers firing toward the spacecraft',
        aim: 'velocity',
        sense: 1,
        ...aimed('docked', [-43.7, 1.9, 2.6]),
        confidence: 'derived',
        source: `"Eclipse phasing maneuver no. 1 (GATV SPS) (docked)", pitch -2.5°, yaw -176.6° (${GXII}, Tables 4.2-II and 4.3-IV)`,
      },
      turned: estimated(ECLIPSE_1 - 120, 'in its attitude two minutes before: not read'),
      on: doc(ECLIPSE_1, `7:05:06, as planned (${GXII}, Table 4.2-II)`),
      off: doc(ECLIPSE_1 + 51, `51 s (${GXII}, Table 4.3-IV)`),
      deltaV: doc(
        43.8 * FT,
        `43.8 ft/s, ground commanded 43.0 (${GXII}, Tables 5.1.5-V and 4.3-IV), the pair’s: the perigee from 153.0 to 136.8 nautical miles (Table 4.3-II)`,
      ),
    },
    {
      id: 'eclipse-phasing-2',
      label: 'Second eclipse phasing, docked: the Agena’s secondary propulsion',
      thrusters: 'docked',
      attitude: {
        label: 'The pair tail first, the Agena’s chambers firing toward the spacecraft',
        aim: 'velocity',
        sense: 1,
        ...aimed('docked', [15, 0, 0], 'Table 4.3-IV, ground commanded'),
        confidence: 'derived',
        source: `"Computer and platform were off" (${GXII}, Table 5.1.5-V): the commanded +15, 0, 0 (Table 4.3-IV), pitch 3.9°, yaw 2.0° as flown`,
      },
      turned: estimated(ECLIPSE_2 - 120, 'in its attitude two minutes before: not read'),
      on: doc(ECLIPSE_2, `15:16:18, as planned (${GXII}, Table 4.2-II)`),
      off: doc(ECLIPSE_2 + 18, `18 s, as commanded (${GXII}, Table 4.3-IV)`),
      deltaV: doc(
        16.7 * FT,
        `16.7 ft/s, commanded 15.0: "determined from orbital radar tracking data because the platform was not ... aligned" (${GXII}, Table 4.3-IV, note j), the pair’s`,
      ),
    },
    {
      id: 'agena-separation',
      label: 'Separation from the Agena',
      thrusters: 'aft',
      attitude: {
        label: 'Blunt end aft, along the motion',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [7.1, 0.2, -0.1]),
        confidence: 'derived',
        source: `"a posigrade separation maneuver" (${GXII}, 4.1); pitch -1.3°, yaw 1.0° (Table 4.3-IV)`,
      },
      turned: estimated(PARTING - 120, 'in its attitude two minutes before: not read'),
      on: doc(
        PARTING,
        `52:14:27.0, as planned, after the docking bar was jettisoned with the tether at 51:50:57 (${GXII}, Tables 4.2-II and 5.1.5-V; 4.1)`,
      ),
      off: doc(PARTING + 8.7, `8.7 s, planned 8.2 (${GXII}, Table 4.3-IV)`),
      deltaV: doc(7.1 * FT, `7.1 ft/s, planned 6.0 (${GXII}, Table 5.1.5-V)`),
    },
    {
      id: 'phasing',
      label: 'Phasing: the opening from the Agena stopped',
      thrusters: 'forward',
      attitude: {
        label: 'Blunt end aft, the forward-firing pair pushing back',
        aim: 'velocity',
        sense: 1,
        ...aimed('forward', [-5.1, 0.2, 0.6]),
        confidence: 'derived',
        source: `"The retrograde phasing maneuver ... resulted in a noticeable out-of-plane velocity; however, the separation rate was essentially stopped" (${GXII}, 4.1); pitch 2.7°, yaw 7.0° (Table 4.3-IV)`,
      },
      turned: estimated(PHASING - 120, 'in its attitude two minutes before: not read'),
      on: doc(PHASING, `61:47:47.9, planned 61:47:47 (${GXII}, Tables 4.2-II and 5.1.5-V)`),
      off: doc(PHASING + 9, `9 s, as planned (${GXII}, Table 4.3-IV)`),
      deltaV: doc(5.2 * FT, `5.2 ft/s, planned 5.5 (${GXII}, Table 5.1.5-V)`),
    },
  ],
  adapter: {
    equipment: {
      mass: derived(
        (SC12_LAUNCH - RETROGRADE) * LB,
        `the spacecraft at launch (8,296.47 lb) less at retrofire (5,627.87 lb: ${GXII}, 3.3): ${(SC12_LAUNCH - RETROGRADE).toFixed(0)} lb, with what the thrusters burned not taken off`,
      ),
      gone: doc(EQUIPMENT, `"Equipment adapter separation" at 93:59:03, planned 93:58:58 (${GXII}, Table 4.2-II)`),
    },
    retro: {
      mass: derived(
        (RETROGRADE - REENTRY) * LB,
        `spacecraft 12 at retrofire less at 0.05 g (${GXII}, 3.3): ${(RETROGRADE - REENTRY).toFixed(1)} lb, the section with its four rockets unfired`,
      ),
    },
  },
  retro: {
    sequence: estimated(
      RETRO - 60,
      'a minute before retrofire: when the crew had it in retrofire attitude is not read; "Retrofire was initiated automatically" (4.1)',
    ),
    below: derived(
      (Math.atan2(RETRO_DOWN, RETRO_AFT) * 180) / Math.PI,
      `degrees: the push as the guidance system measured it, 300.8 ft/s back and 113.5 (and 3.6 to the left, not flown: ${GXII}, Table 5.1.5-V), so ${((Math.atan2(RETRO_DOWN, RETRO_AFT) * 180) / Math.PI).toFixed(1)}° below the line back along the motion. The table's sign has the 113.5 up, against its own note that +V_Y is toward the Earth's centre: taken down, as every Gemini retrofire's was (Gemini VII's 111.8 down, Gemini VIII's 113.81)`,
    ),
    on: doc(
      RETRO,
      `93:59:58, "Retrofire was initiated automatically and occurred at the planned time ... over the Canton Island station" (${GXII}, Table 4.2-II and 4.1); 93:59:57.7 by the guidance system (Table 5.1.5-V)`,
    ),
    spacing: assumed(
      5.5,
      `"fired at 5.5 second intervals in 1-2-3-4 order", the type's (${SEDR}, Section XI, p. 11-73): the report has the burn begin at 93:59:57.7 and end at 94:00:17.2 (5.1.8.2), 19.5 s where the type's sequence takes 22`,
    ),
    count: 4,
    thrust: assumed(2_490 * LBF, `2,490 lb each, the type's (${SP121}, Table 4-I, p. 29)`),
    burn: assumed(5.5, '5.5 s each, the type’s (NASA release 65-81, p. 8)'),
    deltaV: doc(321.5 * FT, `321.5 ft/s, "the IGS measured value", against 322.4 predicted (${GXII}, 5.1.8.3; Table 5.1.5-V)`),
    gone: assumed(
      RETRO_GONE,
      `45 s after retrofire, when the type's sequence lights the jettison switch (${SP121}, Figure 3-3): not recorded`,
    ),
  },
  entry: {
    mass: doc(REENTRY * LB, `spacecraft 12's re-entry module at 0.05 g, 4,802.18 lb (${GXII}, 3.3)`),
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
      source: `lift over drag as flown, at every Mach number: the programme's, "flown with an average lift-to-drag ratio of approximately 0.19" (${SP138}, p. 159), taken for spacecraft 12, whose own is not in its report`,
    },
    predicted: derived(
      0.19 / 0.65,
      `the lift over drag the wind tunnels had given, said and not flown: "a decrease of approximately 35 percent in the lift-to-drag ratio" (${SP138}, p. 163), from the 0.19 flown: 0.29`,
    ),
    trim: assumed(8.5, '"8° to 9°" at the greatest heating on GT-3 (Gemini Program Mission Report, Gemini IV, p. 5-3): the type’s, taken'),
    bank: doc(
      10,
      `degrees, to the right of the motion: "From retrofire to an altitude of 400K feet, a 10-degree bank angle toward the south was flown as planned" (${GXII}, 5.1.5.2.3)`,
    ),
    banked: estimated(RETRO_GONE + 1, 'as the retrograde section went: the ship turned to its entry attitude, its lift held from there'),
    banks: [
      {
        label: 'At 400,000 ft: the back-up bank, 45° to the south',
        bank: doc(
          45,
          `"From 400K feet until guidance initiate, the backup angle of 45 degrees toward the south was flown as planned" (${GXII}, 5.1.5.2.3)`,
        ),
        at: doc(ENTRY_400K, `"At 94:20:12 g.e.t., the computer commanded a zero-degree bank angle", at 400,000 ft (${GXII}, 5.1.5.2.3)`),
      },
      {
        label: 'The computer’s commands, held by the control system: lift about up',
        bank: estimated(
          0,
          `degrees: the bank the control system held to the computer's commands, within some 10° of lift up until 94:25 and then rolled through 150° and back, read off the report's Figure 5.1.5-8 (${GXII}): the rolls are not flown, the lift is held up`,
        ),
        at: doc(
          GUIDED,
          `"At 94:23:06 g.e.t., the control system was switched to REENTRY, and from this time until guidance termination the computer-commanded bank angles were automatically held by the control system to within two degrees" (${GXII}, 5.1.5.2.3)`,
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
      `spacecraft 12's re-entry module at the main parachute's deployment, 4,403.74 lb (${GXII}, 3.3): taken from the drogue on`,
    ),
    drogue: {
      altitude: doc(
        46_000 * FT,
        `"Drogue deploy 94:29:09.638", plotted at about 46,000 ft (${GXII}, Figure 5.1.11-1, read off the figure to a thousand feet)`,
      ),
      dragArea: estimated(
        0.5 * Math.PI * ((8.3 / 2) * FT) ** 2,
        `an 8.3 ft conical ribbon drogue (${CR1106}, p. 218) at a drag coefficient of 0.5, the usual figure for the type: no measured figure found`,
      ),
      fills: derived(17.4, `"Drogue disreef 94:29:27", 17.4 s after it came out (${GXII}, Figure 5.1.11-1)`),
    },
    main: {
      altitude: doc(
        10_000 * FT,
        `"R and R section separation and main parachute deploy 94:30:37.718", plotted at about 10,000 ft (${GXII}, Figure 5.1.11-1, read off the figure); the type's PARA switch is at 10,600 ft (${SEDR}, pp. 4-22 and 4-23)`,
      ),
      dragArea: derived(
        (2 * 4_400 * LB * 9.80665) / (1.225 * (31.6 * FT) ** 2),
        `the 84.2 ft ringsail's (${CR1106}, p. 222): "a mean descent rate of 31.6 fps" for a module of 4,400 lb, at sea level: 344 m²`,
      ),
      fills: derived(12.8, `deployed at 94:30:37.718 and "full open" at 94:30:50.563 (${GXII}, Figure 5.1.11-1)`),
    },
    checks: [
      {
        id: 'reentry-module.at',
        label: 'Landing',
        value: LANDING,
        unit: 's',
        tolerance: 60,
        confidence: 'documented',
        source: `${GXII}, Table 4.2-II and Figure 5.1.11-1: 94:34:30, planned 94:34:29`,
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
      'Lovell and Aldrin landed in the ship, as Gemini was built to, harder than expected, and were taken to the Wasp by helicopter 28 minutes after: the ejection seats were for the pad, the climb and below 15,000 ft, and were not used',
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
        'The retrofire’s instant was worked on the ground for the planned landing point and fired automatically at the planned second (Gemini Program Mission Report, Gemini XII, 4.1 and Table 4.2-II); the ship landed 2.6 nautical miles from the planned point (4.1), so the place it came down is taken for the place its burn was timed for',
    },
    latitude: doc(
      24 + 35 / 60,
      `${GXII}, Table 4.3-I, final: 24°35′ N 69°57′ W, "based on best estimated trajectory from radar tracking data"; the recovery ship's 24°37′ N 69°56′ W; planned 24°35′ N 70°00′ W`,
    ),
    longitude: doc(-(69 + 57 / 60), `${GXII}, Table 4.3-I, final`),
    at: doc(LANDING, `${GXII}, Table 4.2-II: 94:34:30`),
    near: 'the western Atlantic, east of the Bahamas',
  },
  // GATV-5001 as the report's tracking had it at its insertion, flown on from there: the craft the rendezvous is made on.
  target: {
    orbit: { fix: INSERTION },
    epoch: '1966-11-11T20:46:33.419Z',
    label: 'GATV-5001',
    mass: doc(7_114 * LB, `the Agena's "insertion weight (after insertion firing)", 7,114 lb (${GXII}, 3.6)`),
    dragArea: estimated(
      2.2 * 1.52 * 7.95 * 0.8,
      'm²: the free-molecule figure of a body turning every way, 2.2, on its side and its ends as it is held, 0.8 of a 7.95 m Agena 1.52 m across, as the Agenas’ own runs take it (vehicles/target-plan.ts): chosen',
    ),
  },
  events: [
    { id: 'liftoff', label: 'Liftoff', at: doc(0, `${GXII}, Table 4.2-I: 20:46:33.419 G.m.t.`) },
    { id: 'beco', label: 'First stage cutoff: the second stage lit', at: doc(BECO, `${GXII}, Table 4.2-I`), also: 'planned 153.38' },
    { id: 'stage-separation', label: 'The stages begin to part', at: doc(STAGING, `${GXII}, Table 4.2-I`) },
    { id: 'seco', label: 'Second stage cutoff', at: doc(SECO, `${GXII}, Table 4.2-I`), also: 'planned 339.76' },
    { id: 'spacecraft-separation', label: 'Spacecraft separation', at: doc(SEPARATION, `${GXII}, Table 4.2-I`) },
    {
      id: 'insertion',
      label: 'Insertion, after the insertion velocity adjustment: not flown, the stage cut on this orbit',
      at: doc(INSERTED, `${GXII}, Table 4.3-I; the adjustment 30.6 ft/s at 0:06:43.6 (Table 5.1.5-V)`),
    },
    {
      id: 'fairings',
      label: 'Nose and scanner fairings off',
      at: estimated(FAIRINGS, 'not in the sequence of events: taken as 15 s after the separation, as Gemini VII’s'),
    },
    { id: 'phase-adjust', label: 'Phase adjust', at: doc(PHASE_ADJUST, `${GXII}, Table 4.2-II`) },
    { id: 'plane-change', label: 'Plane change', at: doc(PLANE_CHANGE, `${GXII}, Table 4.2-II`) },
    { id: 'corrective-combination', label: 'Corrective combination', at: doc(CORRECTIVE, `${GXII}, Table 4.2-II`) },
    { id: 'coelliptic', label: 'Coelliptic burn', at: doc(COELLIPTIC, `${GXII}, Table 4.2-II`) },
    { id: 'terminal-phase', label: 'Terminal phase initiation', at: doc(TPI, `${GXII}, Table 4.2-II`) },
    { id: 'midcourse-1', label: 'First midcourse correction', at: doc(MIDCOURSE[0]!, `${GXII}, Table 4.2-II`) },
    { id: 'midcourse-2', label: 'Second midcourse correction', at: doc(MIDCOURSE[1]!, `${GXII}, Table 4.2-II`) },
    { id: 'midcourse-3', label: 'Third midcourse correction', at: doc(MIDCOURSE[2]!, `${GXII}, Table 4.2-II`) },
    { id: 'midcourse-4', label: 'Fourth midcourse correction', at: doc(MIDCOURSE[3]!, `${GXII}, Table 4.2-II`) },
    { id: 'terminal-braking', label: 'Braking begins', at: doc(BRAKING, `${GXII}, Table 4.2-II`) },
    {
      id: 'station-keeping',
      label: 'Station keeping with the Agena',
      at: doc(
        T(3, 45, 0),
        `"at 3 hours 45 minutes ground elapsed time (g.e.t.), the crew reported station keeping with the GATV" (${GXII}, 4.1)`,
      ),
    },
    { id: 'docked', label: 'Docked, the first of three dockings (not flown here)', at: doc(DOCKING, `${GXII}, 4.1`) },
    { id: 'eclipse-phasing-1', label: 'First eclipse phasing, docked', at: doc(ECLIPSE_1, `${GXII}, Table 4.2-II`) },
    { id: 'eclipse-phasing-2', label: 'Second eclipse phasing, docked', at: doc(ECLIPSE_2, `${GXII}, Table 4.2-II`) },
    {
      id: 'tethered',
      label: 'Undocked and tethered to the Agena (not flown)',
      at: doc(T(47, 23, 0), `"The tether evaluation was initiated at 47 hours 23 minutes g.e.t., with the third undocking" (${GXII}, 4.1)`),
    },
    { id: 'tether-off', label: 'The docking bar jettisoned, releasing the tether', at: doc(T(51, 50, 57), `${GXII}, 4.1`) },
    { id: 'agena-separation', label: 'Separation from the Agena', at: doc(PARTING, `${GXII}, Table 4.2-II`) },
    { id: 'phasing', label: 'Phasing', at: doc(PHASING, `${GXII}, Table 4.2-II`) },
    { id: 'equipment-section', label: 'Equipment adapter off', at: doc(EQUIPMENT, `${GXII}, Table 4.2-II`) },
    { id: 'retrofire', label: 'Retrofire, over Canton Island', at: doc(RETRO, `${GXII}, Table 4.2-II`) },
    { id: 'entry-400k', label: '400,000 ft', at: doc(ENTRY_400K, `${GXII}, 5.1.5.2.3`) },
    { id: 'computer-banks', label: 'The control system holds the computer’s banks', at: doc(GUIDED, `${GXII}, 5.1.5.2.3`) },
    { id: 'guidance-off', label: 'Guidance terminated', at: doc(GUIDANCE_OFF, `${GXII}, 5.1.5.2.3`) },
    { id: 'drogue-deployment', label: 'Drogue parachute', at: doc(DROGUE, `${GXII}, Table 4.2-II; 94:29:09.638 in Figure 5.1.11-1`) },
    { id: 'main-deployment', label: 'The main parachute out', at: doc(MAIN, `${GXII}, Figure 5.1.11-1; 94:30:35 in Table 4.2-II`) },
    {
      id: 'landing-attitude',
      label: 'Two-point suspension: repositioned for the landing',
      at: doc(LANDING_ATTITUDE, `${GXII}, Figure 5.1.11-1`),
    },
    { id: 'splashdown', label: 'Landing', at: doc(LANDING, `${GXII}, Table 4.2-II`) },
  ],
  checks: [
    ...orbitAfter(3600, 'the phase adjust', 123.4, 145.9, 'Table 4.3-II, actual, after the manoeuvre (planned 123.9 by 149.8)'),
    ...orbitAfter(7200, 'the corrective combination', 124.2, 151.7, 'Table 4.3-II, actual (planned 124.7 by 150.0)'),
    ...orbitAfter(9000, 'the coelliptic burn', 146.8, 151.7, 'Table 4.3-II, actual (planned 148.8 by 150.2)'),
    ...orbitAfter(11400, 'the terminal phase initiation', 151.7, 162.4, 'Table 4.3-II, actual (planned 150.3 by 162.4)'),
    ...orbitAfter(14400, 'the rendezvous', 156.4, 162.7, 'Table 4.3-II, actual, after the braking (planned 158.8 by 164.2)'),
    ...orbitAfter(28800, 'the first eclipse phasing, docked', 136.8, 151.5, 'Table 4.3-II, actual (planned 139.6 by 155.3)'),
    ...orbitAfter(57600, 'the second eclipse phasing, docked', 136.6, 160.3, 'Table 4.3-II, actual (planned 139.1 by 162.2)'),
    ...orbitAfter(190800, 'the separation', 140.3, 160.0, 'Table 4.3-II, actual (planned 142.8 by 162.1)'),
    ...orbitAfter(226800, 'the phasing', 140.8, 156.0, 'Table 4.3-II, actual (planned 142.9 by 159.4)'),
    ...orbitAfter(
      336000,
      'all burns, before retrofire',
      140.8,
      155.0,
      'Table 4.3-III, actual, revolution 59 (retrofire); period 90.06 min',
    ),
    impulse('coelliptic', 'Coelliptic burn, impulse', 49.9, 0.05 * 49.9, 'Table 5.1.5-V, the guidance system; within 5 per cent'),
    impulse(
      'terminal-phase',
      'Terminal phase initiation, impulse',
      21.8,
      0.1 * 21.8,
      'Table 5.1.5-V; within 10 per cent, the ground commanding 23.2',
    ),
    impulse('midcourse-1', 'First midcourse correction, impulse', 1.7, 2, 'Table 5.1.5-V; within 2 ft/s'),
    impulse('midcourse-2', 'Second midcourse correction, impulse', 3.1, 2, 'Table 5.1.5-V; within 2 ft/s'),
    impulse('midcourse-3', 'Third midcourse correction, impulse', 1.4, 2, 'Table 5.1.5-V; within 2 ft/s'),
    impulse('midcourse-4', 'Fourth midcourse correction, impulse', 4.9, 2, 'Table 5.1.5-V; within 2 ft/s'),
    impulse(
      'terminal-braking',
      'Braking, impulse',
      19.7,
      8,
      'Table 5.1.5-V, the resultant of the braking’s pulses; within 8 ft/s, its line not held',
    ),
    sighting(
      Math.round(COELLIPTIC),
      'Agena at the coelliptic burn',
      65 * NMI,
      5 * NMI,
      '"After the coelliptic maneuver was performed at a range of approximately 65 nautical miles from the GATV" (4.1)',
    ),
    {
      id: 'ejectionAt',
      label: 'Drogue out, at about 46,000 ft',
      value: DROGUE,
      unit: 's',
      tolerance: 60,
      confidence: 'documented',
      source: `${GXII}, Table 4.2-II: 94:29:10, planned 94:28:59 (94:29:09.638 in Figure 5.1.11-1)`,
    },
    {
      id: 'alongTrack',
      label: 'Drogue out, along the track from where it landed',
      value: 0,
      unit: 'm',
      tolerance: 40_000,
      confidence: 'documented',
      source: `${GXII}, Table 4.3-I: it landed at 24°35′ N 69°57′ W by the radar's best estimate; the drogue comes out a few kilometres short of where it lands`,
    },
    {
      id: 'crossTrack',
      label: 'Drogue out, to the right of where it landed',
      value: 0,
      unit: 'm',
      tolerance: 25_000,
      confidence: 'documented',
      source: `${GXII}, Table 4.3-I and 5.1.5.2.3: at guidance termination the guidance system had it "0.54 of a nautical mile southeast of the planned landing point"`,
    },
  ],
};

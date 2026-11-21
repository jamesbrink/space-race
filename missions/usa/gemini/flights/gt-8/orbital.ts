/**
 * Gemini-Titan 8 as a flight into orbit: its record (vehicles/gemini-titan-plan.ts `GeminiTitanRecord`), which flight.ts
 * writes its plan from (`geminiTitanPlan`). The record with its sources and disagreements is set out in mission.md beside
 * this file; the numbers live here, each in the source's own units and converted once.
 *
 * Times are seconds from liftoff, 16:41:02.389 UTC, 16 March 1966. The checks' tolerances were written with the record,
 * before the plan was first flown, and nothing here was changed after: a miss is recorded (src/sim/misses.ts), not fitted.
 * The mission report (MSC-G-R-66-4) has this flight's own weights, engines, sequence, manoeuvres, orbits, retrorockets and
 * entry, read on the page where its text layer garbles digits; what it lacks (the separation speeds of the adapter's
 * sections, the parachutes' sizes) is the type's, and says so.
 *
 * The Agena it went up to meet, GATV-5003, is the flight's target (`target`): the report's own tracking vector at its
 * insertion, flown on from there on gravity and the air (sim/plan.ts `TargetDef` `orbit`). The coelliptic burn, the
 * terminal phase, its two corrections and the braking are made on it, solved as each lights; the four burns before them
 * are flown at the record's instants and impulses, what they were aimed at not being a kind guidance has yet. The docked
 * forty-two minutes are not flown docked (the ship coasts on beside the Agena where the braking left it), nor is what
 * thruster No. 8 did to the pair: the ship backs off at the undocking on its record and goes on to the early retrofire
 * over Africa and the landing in the western Pacific.
 */
import { assumed, derived, doc, estimated } from '../../../../../src/measure.ts';
import { targetFix } from '../../vehicles/gemini-targets.ts';
import { CHRONOLOGY, GLV_NOZZLES, GVIII, SEDR } from '../../vehicles/gemini-titan.ts';
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

/**
 * GATV-5003 at its insertion, as the report's tracking had it (Table 4.3-V, the preliminary vector: its height over the
 * Launch Complex 19 radius), on this flight's clock: the Atlas-Agena lifted off 1:40:59.262 before the Titan. The
 * flight's target is flown from it (`target`), and the docking chapter starts from it (flight.ts `docking.fixes`).
 */
export const INSERTION = targetFix(
  `${GVIII}, table 4.3-V, preliminary tracking solution (altitude above LC-19 radius)`,
  -6059.262,
  558,
  28.6,
  -59.64,
  980359,
  25366,
  0.002,
  95.13,
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

// GLV-8's weights with spacecraft 8 aboard (the mission report, 3.3, "obtained from the GLV contractor", read on the page):
// at liftoff, at the first stage's burnout, at the second stage's start of steady burning, at its cutoff; and spacecraft 8.
const LIFTOFF = 341_671;
const BECO_WT = 85_276;
const STAGE2_STEADY = 73_790;
const SECO_WT = 14_326;
const SC8_LAUNCH = 8_351.31;
/** What the second stage burned after its cutoff, lb: its shutdown impulse, 35,544 lb-s (5.2.2.3), at its specific impulse. */
const SHUTDOWN = 35_544 / 314.06;
/**
 * The usable propellant still in the second stage at its cutoff, lb: not stated. "The achieved vehicle performance was
 * 8830 pounds" (5.2.2.4), 479 lb more than the spacecraft; GLV-6's two figures, 834 lb of such a margin and 767 lb of
 * usable propellant left (its evaluation, II.B and Table II-10), say the one is nearly the other, so the margin is taken
 * for it, as Gemini-Titan 7's is.
 */
const RESERVE = 8_830 - SC8_LAUNCH;
const STAGE2_DRY = SECO_WT - SHUTDOWN - RESERVE - SC8_LAUNCH;
const STAGE2_BURNED = STAGE2_STEADY - SECO_WT + SHUTDOWN + RESERVE;
const STAGE1_DRY = BECO_WT - STAGE2_STEADY;
const STAGE2_GROSS = STAGE2_DRY + STAGE2_BURNED;
const STAGE1_GROSS = LIFTOFF - SC8_LAUNCH - STAGE2_GROSS;
// Spacecraft 8's weights through its descent (3.3): at retrofire (the equipment section gone), at 0.05 g (the retrograde
// section gone), at the main parachute's deployment.
const RETROGRADE = 5_726.36;
const REENTRY = 4_879.89;
const MAIN_DEPLOY = 4_454.89;

/** The first stage's two chambers at standard inlet conditions, postflight reconstructed (Table 5.2.2-I, read on the page). */
const S1_SL = 433_952;
const S1_ISP_SL = 261.42;
/** GLV-1's specific impulse at 155 s over its figure at 5 s (GT-1 report, Table 5-II): how far the type's rose with height. */
const GLV1_RISE = 281.1 / 257.3;
const S1_ISP_VAC = S1_ISP_SL * GLV1_RISE;

/** The record's instants (Table 4.2-I, read on the page). */
const BECO = 154.61;
const STAGING = 155.29;
/** The second stage's chamber pressure rising: GLV-6's stages parted 0.015 s after it (Launch Vehicle No. 6 Flight Evaluation, II.C). */
const LIGHT = STAGING - 0.015;
const SECO = 337.54;
const SEPARATION = 365.66;
const FAIRINGS = 450;
const HEIGHT_ADJUST = T(1, 34, 36.4);
const PHASE_ADJUST = T(2, 18, 25.8);
const PLANE_CHANGE = T(2, 45, 52.8);
const VERNIER = T(3, 3, 42.2);
const COELLIPTIC = T(3, 48, 9.7);
const TPI = T(5, 14, 55.7);
const CORRECTION_1 = T(5, 27, 26.0);
const CORRECTION_2 = T(5, 39, 19.9);
const BRAKING = T(5, 43, 8.9);
const DOCKING = T(6, 33, 16);
const UNDOCKING = T(7, 15, 12.3);
const EQUIPMENT = T(10, 3, 48);
const RETRO = T(10, 4, 47);
const RETRO_GONE = RETRO + 45;
const ENTRY_400K = T(10, 26, 53.239);
const GUIDED = T(10, 31, 2.91);
const GUIDANCE_OFF = T(10, 35, 50.392);
const DROGUE = T(10, 36, 47);
const MAIN = T(10, 38, 10.6);
const LANDING_ATTITUDE = T(10, 38, 49.3);
const LANDING = T(10, 41, 26);
/**
 * When the terminal phase's transfer was to bring the ship to the Agena: the two corrections were made "when the central
 * angle (ωt), through which the GATV was to travel from the initiation of the terminal phase to rendezvous, equaled 81.8
 * and 33.6 degrees" (4.1), at 5:27:26 and 5:39:19.9; the Agena went the 48.2° between them in 713.9 s, and the last 33.6°
 * at that rate takes 497.6 s more.
 */
const INTERCEPT = CORRECTION_2 + (33.6 * (CORRECTION_2 - CORRECTION_1)) / (81.8 - 33.6);

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

/** The retrofire's push as the crew read it from the computer (Table 5.1.8-V): back along the motion and down, ft/s. */
const RETRO_AFT = 292.5;
const RETRO_DOWN = 114.1;
/** The four retrorockets' ignitions, s after 10:04 (Table 5.1.8-V): Nos. 1, 3, 2 and 4, in that order. */
const RETRO_LIT = [46.6, 52.2, 57.4, 63.3];
/** Their total impulses, lb-s, and web burning times, s, by their predelivery acceptance tests (Table 5.1.8-V). */
const RETRO_IMPULSE = [14_219, 14_320, 14_332, 14_222];
const RETRO_BURN = [5.3, 5.2, 5.2, 5.6];
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * A manoeuvre's attitude from its measured components (Table 5.1.5-VII, the inertial guidance system's accelerometers:
 * forward, down and left, ft/s): the nose along the push for the aft-firing pair, against it for the forward-firing, as
 * an aim along the motion turned in the level (`yaw`, to the left) and pitched below it (`below`).
 */
const aimed = (thrusters: 'aft' | 'forward', [forward, down, left]: readonly [number, number, number]) => {
  const k = thrusters === 'aft' ? 1 : -1;
  const [x, y, z] = [k * forward, k * left, -k * down];
  const why = `from the push the guidance system's accelerometers measured, ${forward} ft/s forward, ${down} down and ${left} left (${GVIII}, Table 5.1.5-VII), the nose ${thrusters === 'aft' ? 'along it, the aft-firing pair pushing toward the nose' : 'against it, the forward-firing pair pushing toward the tail'}`;
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
    source: `${GVIII}, ${where}: ${nmi} nautical miles. Read at ${new Date(at * 1000).toISOString().slice(11, 19)}`,
  }));
/** The impulse a manoeuvre gave (`<id>.velocity`, orbital.ts `OrbitResults`), ft/s, and how near. */
const impulse = (id: string, label: string, fps: number, within: number, where: string) => ({
  id: `${id}.velocity` as const,
  label,
  value: fps * FT,
  unit: 'm/s',
  tolerance: within * FT,
  confidence: 'documented' as const,
  source: `${GVIII}, ${where}: ${fps} ft/s`,
});
/** How far the Agena was at an instant (gemini-titan-plan.ts: `at-<s>.range`), m. */
const sighting = (at: number, label: string, value: number, within: number, where: string) => ({
  id: `at-${at}.range` as const,
  label,
  value,
  unit: 'm',
  tolerance: within,
  confidence: 'documented' as const,
  source: `${GVIII}, ${where}`,
});

export const orbital: GeminiTitanRecord = {
  liftoffMass: doc(
    LIFTOFF * LB,
    `341,671 lb at liftoff with spacecraft 8 (${GVIII}, 3.3, read on the page); 345,359 lb at ignition. The stages' figures below are worked from the same table and sum to it`,
  ),
  titan: {
    first: {
      name: 'Titan first stage',
      nodes: ['TitanStage1', 'TitanStage1Engine', 'TitanInterstage'],
      mass: derived(
        STAGE1_GROSS * LB,
        `GLV-8 at liftoff (341,671 lb) less spacecraft 8 (8,351.31 lb) and the second stage (${STAGE2_GROSS.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb, below): ${STAGE1_GROSS.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb (${GVIII}, 3.3). The interstage goes with it. Loaded: 89,243 lb of fuel and 172,237 of oxidiser (5.2.2.1)`,
      ),
      dry: derived(
        STAGE1_DRY * LB,
        `the vehicle at the first stage's burnout (85,276 lb) less at the second stage's steady burn (73,790 lb): ${STAGE1_DRY.toLocaleString('en-US')} lb with what was left in its tanks (${GVIII}, 3.3). What the second stage burned in the second between is in it`,
      ),
      propellant: derived(
        (STAGE1_GROSS - STAGE1_DRY) * LB,
        `the stage at liftoff less as it was let go: ${(STAGE1_GROSS - STAGE1_DRY).toLocaleString('en-US', { maximumFractionDigits: 0 })} lb burned from liftoff (${GVIII}, 3.3); "Engine shutdown was initiated by fuel exhaustion with approximately 107 pounds of usable oxidizer remaining" (5.2.2.2)`,
      ),
      engine: {
        // (its two chambers on the one stage as one engine: a plan's engine count is its body's units, plan.ts `BodyDef.count`)
        name: 'Aerojet LR87-AJ-7 (two chambers)',
        count: 1,
        thrust: {
          seaLevel: assumed(
            S1_SL * LBF,
            `GLV-8's own, postflight reconstructed at standard inlet conditions, 433,952 lb (predicted 437,453: ${GVIII}, Table 5.2.2-I, read on the page), taken as the sea-level figure, as an acceptance test's is (GLV-6's at standard inlet, 427,396 lb, is within 0.1 per cent of its acceptance test: Launch Vehicle No. 6 Flight Evaluation, Table III-3). The flight's average, 461,080 lb, lies between this and the vacuum figure below`,
          ),
          vacuum: derived(
            (S1_SL * S1_ISP_VAC * LBF) / S1_ISP_SL,
            `the sea-level figure at the vacuum specific impulse over the sea-level one (the same flow): ${Math.round((S1_SL * S1_ISP_VAC) / S1_ISP_SL).toLocaleString('en-US')} lb for the two`,
          ),
        },
        isp: {
          seaLevel: assumed(
            S1_ISP_SL,
            `GLV-8's at standard inlet conditions, 261.42 s, as predicted (${GVIII}, Table 5.2.2-I), taken as the sea-level figure`,
          ),
          vacuum: assumed(
            S1_ISP_VAC,
            `GLV-8's 261.42 s raised as GLV-1's rose from 5 s to 155 s, 257.3 to 281.1 s (${GI}, Table 5-II): ${S1_ISP_VAC.toFixed(2)} s. GLV-8's own flight average was 278.44 s (${GVIII}, Table 5.2.2-I), between the two`,
          ),
        },
        nozzle: GLV_NOZZLES.first,
      },
      ignition: doc(0, `started on the pad, the ignition signal (87FS1) at -3.39 s (${GVIII}, Table 4.2-I): the run begins at release`),
      cutoff: doc(BECO, `87FS2, stage I engine shutdown, at 154.61 s, planned 153.71 (${GVIII}, Table 4.2-I, read on the page)`),
    },
    second: {
      name: 'Titan second stage',
      nodes: ['TitanStage2', 'TitanStage2Engine'],
      mass: derived(
        STAGE2_GROSS * LB,
        `its weight at cutoff and what it burned, below: ${STAGE2_GROSS.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb (${GVIII}, 3.3). Loaded: 21,884 lb of fuel and 38,685 of oxidiser (5.2.2.1)`,
      ),
      dry: assumed(
        STAGE2_DRY * LB,
        `the vehicle at the second stage's cutoff (14,326 lb) less spacecraft 8 (8,351.31 lb), what the engine burned after its cutoff signal (its shutdown impulse of 35,544 lb-s at 314.06 s, ${SHUTDOWN.toFixed(0)} lb, burned at full thrust here, as the stage's tail-off is not flown) and the usable propellant it still held, taken as the vehicle's achieved performance over the spacecraft, ${RESERVE.toFixed(0)} lb: ${STAGE2_DRY.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb (${GVIII}, 3.3, 5.2.2.3 and 5.2.2.4)`,
      ),
      propellant: assumed(
        STAGE2_BURNED * LB,
        `what it could burn from the start of its steady burn: ${STAGE2_BURNED.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb, from 73,790 lb to its cutoff at 14,326, the shutdown's ${SHUTDOWN.toFixed(0)} lb after it, and the ${RESERVE.toFixed(0)} lb of margin (${GVIII}, 3.3, 5.2.2.3 and 5.2.2.4). The run's guidance cuts it on the orbit, as the radio guidance did`,
      ),
      engine: {
        name: 'Aerojet LR91-AJ-7',
        count: 1,
        thrust: {
          vacuum: doc(
            102_735 * LBF,
            `GLV-8's flight average, postflight reconstructed, 102,735 lb with the roll control nozzle's (predicted 102,613: ${GVIII}, Table 5.2.2-II, read on the page)`,
          ),
        },
        isp: { vacuum: doc(314.06, `GLV-8's flight average, 314.06 s (predicted 314.49: ${GVIII}, Table 5.2.2-II)`) },
        nozzle: GLV_NOZZLES.second,
      },
      ignition: assumed(
        LIGHT,
        `its thrust from the chamber pressure's rise, which on GLV-6 was 0.015 s before the stages parted (Launch Vehicle No. 6 Flight Evaluation, II.C, and Table II-4): here 155.29 s less that, with the stages still joined. The ignition signal, 91FS1, was at 154.61 s with the first stage's shutdown (${GVIII}, Table 4.2-I); the main fuel injection pressure switch made at 155.27`,
      ),
      cutoff: doc(SECO, `91FS2 at 337.54 s, planned 335.59; the redundant shutdown at 337.56 (${GVIII}, Table 4.2-I)`),
    },
    staging: doc(STAGING, `"Stage separation begins" at 155.29 s, 0.68 s after the staging signal (${GVIII}, Table 4.2-I)`),
    hot: {
      open: estimated(
        0.5,
        'of the interstage’s side the second stage’s jet leaves through: its ring of exhaust ports, half open (the model’s; no figure read)',
      ),
      turn: estimated(30, 'degrees below the level the jet leaves the ports at: not read'),
      endures: estimated(5, 's at full thrust the first stage’s forward dome stands the jet: not read. Planned for, it stood the 0.68 s'),
    },
  },
  separation: {
    at: doc(SEPARATION, `"Spacecraft separation (shape-charge fired)" at 365.66 s, planned 355.59 (${GVIII}, Table 4.2-I)`),
    push: derived(
      (6.25 * FT * (SC8_LAUNCH + STAGE2_DRY)) / STAGE2_DRY,
      `the 6.25 ft/s the spacecraft's guidance measured for the separation (${GVIII}, Table 5.1.5-VII; 5 ft/s planned, "changed prior to separation ... to reduce part of the 10 ft/sec overspeed", 4.3.1.1), from "thrusters 9 and 10 firing for 8 seconds" (5.1.5.3.1), the OAMS on at 362.94 s and off at 370.94 (Table 4.2-I), as the joint's push shared by the masses as every separation is (the empty second stage ${STAGE2_DRY.toLocaleString('en-US', { maximumFractionDigits: 0 })} lb)`,
    ),
    mass: derived(
      SC8_LAUNCH * LB,
      `the spacecraft at launch, 8,351.31 lb (${GVIII}, 3.3): what stayed on the launch vehicle at separation and the fairings thrown off after are not read`,
    ),
  },
  ascent: {
    guidance: {
      azimuth: doc(
        99.9,
        `"on a rendezvous launch azimuth of 99.9 degrees. The preflight nominal azimuth had been calculated to be 98.7 degrees, but minor deviations in the GAATV launch trajectory required a 1.2-degree shift" (${GVIII}, 4.1): the roll programme from 8.48 to 20.47 s (Table 4.2-I)`,
      ),
      vertical: doc(22.98, `up the plumb line until "Pitch program rate no. 1 start" at 22.98 s, planned 23.04 (${GVIII}, Table 4.2-I)`),
      kick: estimated(15, 's: the stored pitch programme’s rates are not in the report; a pitch-over of fifteen seconds is ours'),
      turn: estimated(
        BECO,
        's: the radio guidance’s closed loop flown as the law’s linear tangent from staging; the first stage’s programme before it. The radio guidance was enabled at 161.65 s and its first command came at 168.40 (Table 4.2-I); it "corrected an out-of-plane velocity of approximately 350 ft/sec" (4.1)',
      ),
      target: {
        at: 'seco',
        altitude: doc(
          527_125 * FT,
          `${GVIII}, Table 4.3-I, final: 527,125 ft at the second stage's cutoff, a geodetic height ("The earth model for all trajectories contained geodetic and gravitational constants representing the Fischer ellipsoid", 4.3)`,
        ),
        over: 'ellipsoid',
        climb: doc(-0.07, `${GVIII}, Table 4.3-I, final: -0.07° space-fixed at cutoff`),
        inclination: derived(
          28.91,
          `the plane of the final state at the spacecraft's separation (${GVIII}, Table 4.3-I: 26.70° N, 70.03° W, heading 101.88° east of north), its geodetic latitude made geocentric, as the space-fixed heading is reckoned (sim/pursuit.ts \`fixState\`): 28.91°, the RTCC's 28.94 (Table 4.3-IV, preliminary). The report's final 29.07 (Table 4.3-IV) is what the same state gives with the geodetic latitude, and GATV-5003's vector read the geocentric way gives its own 28.86 (Table 4.3-VI): mission.md`,
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
      'the spacecraft’s centre of mass at the heat shield’s rim, Z103.44 (the model’s origin): spacecraft 8’s at launch was at Z105.12 (the mission report, 3.3), its own Z reference 13.44 in aft of the mating plane; not reduced to the model’s',
    ),
    sheds: [
      {
        on: 'staging-nuts',
        name: 'Titan first stage',
        from: doc(0, 'the first stage engines’ exit plane, station 1348.103 (titan-ii-glv.md)'),
        to: derived(STATION(500), 'the separation plane, station 500, with the interstage on it (titan-ii-glv.md)'),
        radius: doc(60 * IN, 'the 120 in tank (titan-ii-glv.md)'),
        mass: derived(STAGE1_DRY * LB, 'GLV-8’s as it was let go (as the plan’s, above)'),
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
        mass: derived(STAGE2_DRY * LB, 'GLV-8’s at cutoff less the spacecraft (as the plan’s)'),
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
        mass: derived((SC8_LAUNCH - RETROGRADE) * LB, 'the spacecraft at launch less at retrofire (as the plan’s, below)'),
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
        value: 86.3 * NMI,
        unit: 'm',
        tolerance: 12_000,
        confidence: 'documented',
        source: `${GVIII}, Table 4.3-IV, final, at insertion: 86.3 nautical miles (planned 86.6); ${CHRONOLOGY}`,
      },
      {
        id: 'apogee',
        label: 'Apogee at cutoff',
        value: 146.7 * NMI,
        unit: 'm',
        tolerance: 25_000,
        confidence: 'documented',
        source: `${GVIII}, Table 4.3-IV, final: 146.7 nautical miles (planned 145.5); ${CHRONOLOGY}`,
      },
      {
        id: 'inclination',
        label: 'Inclination',
        value: 29.07,
        unit: '°',
        tolerance: 0.25,
        confidence: 'documented',
        source: `${GVIII}, Table 4.3-IV, final: 29.07° (preliminary 28.94). Its own state at separation gives 28.91 read as a tracking vector is (the law's target, above)`,
      },
      {
        id: 'cutoffSpeed',
        label: 'Speed at cutoff, space-fixed',
        value: 25_738 * FT,
        unit: 'm/s',
        tolerance: 30,
        confidence: 'documented',
        source: `${GVIII}, Table 4.3-I, final: 25,738 ft/s at the spacecraft's separation, 365.66 s, with the second stage's shutdown impulse in it and 6 ft/s of the separation's (25,655 at the cutoff itself; planned 25,647)`,
      },
    ],
  },
  orbit: {
    over: {
      is: 'oblate',
      confidence: 'documented',
      source: `${GVIII}, Table 4.3-IV, note b: "The altitude is computed above the Fischer Ellipsoid" (the final elements; the preliminary are over the Launch Complex 19 radius). The ellipsoid is WGS 84’s, not Fischer’s`,
    },
    perigee: doc(86.3 * NMI, `${GVIII}, Table 4.3-IV, final, revolution 1 (insertion): 86.3 nautical miles; ${CHRONOLOGY}`),
    apogee: doc(146.7 * NMI, `${GVIII}, Table 4.3-IV: 146.7 nautical miles; ${CHRONOLOGY}`),
    inclination: derived(
      28.91,
      `the plane of the final state at separation (${GVIII}, Table 4.3-I), read as a tracking vector is: the law's target above, and why the table's 29.07 is not taken`,
    ),
    period: doc(88.83 * 60, `${GVIII}, Table 4.3-IV, final: 88.83 min`),
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
      `${GVIII}, Table 4.3-I: the spacecraft's separation at 365.66 s, where its final insertion conditions are given; the published orbit is the one at insertion (Table 4.3-IV)`,
    ),
    heading: 'south',
    arc: derived(
      (572.7 * NMI) / 6_371_000 / (Math.PI / 180),
      `degrees: the range at separation, 572.7 nautical miles (${GVIII}, Table 4.3-I, final), over the Earth's mean radius. Flying the ascent replaces it`,
    ),
    anomaly: derived(
      4.7,
      `degrees: from the flight-path angle at separation, +0.04° (${GVIII}, Table 4.3-I, final), on the published orbit’s eccentricity, 0.0085: tan γ = e sin ν / (1 + e cos ν), so five degrees past perigee`,
    ),
  },
  mass: derived(
    SC8_LAUNCH * LB,
    `the spacecraft at launch, 8,351.31 lb (${GVIII}, 3.3), taken for it in orbit: what it left on the launch vehicle, the fairings and the propellant the rendezvous burned are not taken off`,
  ),
  rarefied: {
    drag: assumed(2.2, KING_HELE),
    area: estimated(
      (OUTSIDE / 4) * IN * IN,
      `m²: a quarter of the orbit configuration's whole outside, ${(OUTSIDE * IN * IN).toFixed(1)} m², which is what a convex body presents on the average over every way it can lie (Cauchy): the ship was turned for each burn and alignment, held on the Agena through the terminal phase, docked, and tumbled, and how it lay between was not recorded`,
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
  // Each from the report's Table 4.3-III (planned, ground commanded and actual) and Table 5.1.5-VII (the guidance system's
  // accelerometers: the components each attitude is worked from, and each impulse), read on the page. The first four are
  // flown as recorded; the rest are made on the Agena (`toward`), the record's impulse then a check (the checks).
  moves: [
    {
      id: 'height-adjust',
      label: 'Height adjust: the apogee lowered for the overspeed',
      thrusters: 'forward',
      attitude: {
        label: 'Blunt end aft, the forward-firing pair pushing back along the motion',
        aim: 'velocity',
        sense: 1,
        ...aimed('forward', [-3.13, -0.19, 0.11]),
        confidence: 'derived',
        source: `"a height adjustment (NH1) performed using forward-firing thrusters in a retrograde direction with attitude control in the platform mode" (${GVIII}, 4.1); pitch -3.4°, yaw 2.0° (Table 4.3-III, actual)`,
      },
      turned: estimated(
        HEIGHT_ADJUST - 120,
        'in its attitude two minutes before, after "a 15-minute platform alignment" (4.1): when is not read',
      ),
      on: doc(HEIGHT_ADJUST, `1:34:36.4, planned 1:34:37 (${GVIII}, Table 4.3-III; Table 4.2-I)`),
      off: doc(HEIGHT_ADJUST + 5.5, `5.5 s, planned 6.0 (${GVIII}, Table 4.3-III)`),
      deltaV: doc(
        3.14 * FT,
        `3.14 ft/s, ground commanded 2.9 (${GVIII}, Table 5.1.5-VII; 3.1 in Table 4.3-III): "lowered the spacecraft apogee from 147 to 145.5 nautical miles" (4.1)`,
      ),
    },
    {
      id: 'phase-adjust',
      label: 'Phase adjust: the perigee raised at the second apogee',
      thrusters: 'aft',
      attitude: {
        label: 'Blunt end aft, along the motion',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [50.59, -0.33, -0.21]),
        confidence: 'derived',
        source: `"performed in a posigrade direction using the aft-firing thrusters ... with attitude control in the rate-command mode" (${GVIII}, 4.1); pitch 0.4°, yaw 0.2° (Table 4.3-III, actual)`,
      },
      turned: estimated(PHASE_ADJUST - 120, 'in its attitude two minutes before: not read'),
      on: doc(PHASE_ADJUST, `2:18:25.8, planned 2:18:26, out of range of the stations (${GVIII}, Table 4.3-III; 4.1)`),
      off: doc(PHASE_ADJUST + 68, `68.0 s, as planned (${GVIII}, Table 4.3-III)`),
      deltaV: doc(
        50.59 * FT,
        `50.59 ft/s, ground commanded 50.6 (${GVIII}, Table 5.1.5-VII): "increased the perigee from 86.3 to 113.5 nautical miles" (4.1)`,
      ),
    },
    {
      id: 'plane-change',
      label: 'Plane change: into the Agena’s plane',
      thrusters: 'aft',
      attitude: {
        label: 'Yawed 90° right, to the south',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [-0.27, -0.29, -26.64]),
        confidence: 'derived',
        source: `"with the aft-firing thrusters directed in a southerly direction" (${GVIII}, 4.1), "to the southeast (yaw = 90.6 degrees)" (4.3.1.2.1); pitch 0.6° (Table 4.3-III, actual)`,
      },
      turned: estimated(PLANE_CHANGE - 120, 'in its attitude two minutes before: not read'),
      on: doc(PLANE_CHANGE, `2:45:52.8, planned 2:46:14, over Hawaii (${GVIII}, Table 4.3-III; 4.1)`),
      off: doc(PLANE_CHANGE + 35.5, `35.5 s, planned 36.0 (${GVIII}, Table 4.3-III)`),
      deltaV: doc(
        26.64 * FT,
        `26.64 ft/s, ground commanded 26.2 (${GVIII}, Table 5.1.5-VII): the spacecraft was "about 3.5 nautical miles north of the target plane" (4.3.1.2.1)`,
      ),
    },
    {
      id: 'vernier-height-adjust',
      label: 'Vernier height adjust, which should not have been made',
      thrusters: 'aft',
      attitude: {
        label: 'Blunt end aft, along the motion',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [2.27, 0.19, -0.06]),
        confidence: 'derived',
        source: `"a posigrade maneuver of 2.3 ft/sec" on "the platform for attitude reference but on a delta-time basis" (${GVIII}, 4.1 and 4.3.1.2.1); pitch -4.7°, yaw 1.6° (Table 4.3-III, actual)`,
      },
      turned: estimated(VERNIER - 120, 'in its attitude two minutes before: not read'),
      on: doc(
        VERNIER,
        `3:03:42.2, ground commanded 3:03:41, not in the plan: "subsequent tracking data ... proved that this maneuver should not have been performed because the Carnarvon revolution 2 vectors and the Hawaii revolution 2 vectors apparently had been unusually poor" (${GVIII}, Table 4.3-III; 4.3.1.2.1)`,
      ),
      off: doc(VERNIER + 3, `3.0 s, as commanded (${GVIII}, Table 4.3-III)`),
      deltaV: doc(2.28 * FT, `2.28 ft/s, ground commanded 2.0 (${GVIII}, Table 5.1.5-VII)`),
    },
    {
      id: 'coelliptic',
      label: 'Coelliptic burn: 13.5 nautical miles under the Agena',
      thrusters: 'aft',
      attitude: {
        label: 'Blunt end aft, pitched down 21°',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [57.39, 22.33, 0.06]),
        confidence: 'derived',
        source: `"performed 21 degrees pitched down from the posigrade direction using aft-firing thrusters" (${GVIII}, 4.1); pitch -21.3°, yaw -0.1° (Table 4.3-III, actual)`,
      },
      turned: estimated(COELLIPTIC - 120, 'in its attitude two minutes before: not read'),
      on: doc(
        COELLIPTIC,
        `3:48:09.7, "approximately 35 seconds later than planned ... because of a problem in clearing the Incremental Velocity Indicators", over Tananarive (${GVIII}, Table 4.3-III; 4.1; 4.3.1.2.1)`,
      ),
      off: doc(COELLIPTIC + 82.5, `82.5 s, planned 80.0 (${GVIII}, Table 4.3-III)`),
      deltaV: doc(
        61.58 * FT,
        `61.58 ft/s, ground commanded 61.2 (${GVIII}, Table 5.1.5-VII): the record's, held against the solved burn (the checks)`,
      ),
      toward: { coelliptic: true },
    },
    {
      id: 'terminal-phase',
      label: 'Terminal phase initiation: toward the Agena',
      thrusters: 'aft',
      attitude: {
        label: 'Pitched up 31° and yawed 17° left, on the line of sight',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [22.32, -14.19, 6.74]),
        confidence: 'derived',
        source: `"with the aft-firing thrusters at an effective pitch-up angle of 31.3 degrees and a yaw-left angle of 16.8 degrees ... closed loop" (${GVIII}, 4.1)`,
      },
      turned: estimated(TPI - 120, 'on the Agena two minutes before, after "a 13-minute platform alignment" (4.1): when is not read'),
      on: doc(
        TPI,
        `5:14:55.7, ground commanded 5:13:13, "when the elevation angle to the GATV was approximately 26.8 degrees and the range was about 29 nautical miles" (${GVIII}, Table 4.3-III; 4.3.1.2.1)`,
      ),
      off: doc(TPI + 37, `37.0 s, planned 42.0 (${GVIII}, Table 4.3-III)`),
      deltaV: doc(
        27.3 * FT,
        `27.30 ft/s (${GVIII}, Table 5.1.5-VII); the onboard computer's solution 27.5, the ground's 32.6 (5.1.5.2.2): the record's, held against the solved burn`,
      ),
      toward: {
        reach: {
          ahead: derived(0, 'the Agena itself'),
          above: derived(0, 'the Agena itself'),
        },
        at: derived(
          INTERCEPT,
          `the corrections at central angles of 81.8° and 33.6° to go, 5:27:26 and 5:39:19.9 (${GVIII}, 4.1 and Table 4.3-III), the Agena going the last 33.6° at the rate it went the 48.2° between them: ${new Date(INTERCEPT * 1000).toISOString().slice(11, 19)}`,
        ),
      },
    },
    {
      id: 'correction-1',
      label: 'First correction, at 82° to go',
      thrusters: 'aft',
      attitude: {
        label: 'On the line of sight, about 50° up',
        aim: 'velocity',
        sense: 1,
        ...aimed('aft', [4.22, -14.4, -2.16]),
        confidence: 'derived',
        source: `"maneuvers were made along all three body axes with separate thrusters", the line of sight to the Agena about 50° up (${GVIII}, Table 4.3-III, notes a and b): the pair whose push is nearest taken`,
      },
      turned: estimated(CORRECTION_1 - 60, 'on the Agena from the terminal phase on'),
      on: doc(CORRECTION_1, `5:27:26.0, "12 ... minutes after TPI when the central angle ... equaled 81.8" (${GVIII}, Table 4.3-III; 4.1)`),
      off: doc(CORRECTION_1 + 20, `20 s (${GVIII}, Table 4.3-III)`),
      deltaV: doc(
        15.15 * FT,
        `15.15 ft/s, the resultant (${GVIII}, Table 5.1.5-VII); "approximate total ΔV expended" 20 ft/s (Table 4.3-III, note a): the record's, held against the solved burn`,
      ),
      toward: {
        reach: { ahead: derived(0, 'the Agena itself'), above: derived(0, 'the Agena itself') },
        at: derived(INTERCEPT, 'as the terminal phase’s'),
      },
    },
    {
      id: 'correction-2',
      label: 'Second correction, at 34° to go',
      thrusters: 'forward',
      attitude: {
        label: 'Against the push, which was back, down and to the right',
        aim: 'velocity',
        sense: 1,
        ...aimed('forward', [-6.81, -3.13, -5.8]),
        confidence: 'derived',
        source: `"maneuvers were made along all three body axes with separate thrusters" (${GVIII}, Table 4.3-III, note a): the pair whose push is nearest taken`,
      },
      turned: estimated(CORRECTION_2 - 60, 'on the Agena from the terminal phase on'),
      on: doc(CORRECTION_2, `5:39:19.9, at a central angle of 33.6° to go (${GVIII}, Table 4.3-III; 4.1)`),
      off: doc(CORRECTION_2 + 16, `16 s (${GVIII}, Table 4.3-III)`),
      deltaV: doc(
        9.47 * FT,
        `9.47 ft/s, the resultant (${GVIII}, Table 5.1.5-VII); "approximate total ΔV expended" 16 ft/s (Table 4.3-III): the record's, held against the solved burn`,
      ),
      toward: {
        reach: { ahead: derived(0, 'the Agena itself'), above: derived(0, 'the Agena itself') },
        at: derived(INTERCEPT, 'as the terminal phase’s'),
      },
    },
    {
      id: 'terminal-braking',
      label: 'Braking: to rest 150 ft from the Agena, and station kept',
      thrusters: 'forward',
      attitude: {
        label: 'Nose on the Agena, the forward-firing pair braking',
        aim: 'velocity',
        sense: 1,
        ...aimed('forward', [31.35, 23.93, 12]),
        confidence: 'derived',
        source: `"braking using forward-firing thrusters with attitude control in the rate-command mode ... accomplished visually, but using rendezvous-radar data" (${GVIII}, 4.1); the look angle to the Agena as braking began, pitch -65°, yaw -171° (Table 4.3-III, note e)`,
      },
      turned: estimated(BRAKING - 60, 'on the Agena from the terminal phase on'),
      on: doc(BRAKING, `5:43:08.9, planned 5:45:36, over the Coastal Sentry Quebec (${GVIII}, Table 4.3-III; Table 4.2-I; 4.1)`),
      off: doc(
        BRAKING + 600,
        `"lasted intermittently for about 10 minutes as command pilot made semi-optical approach" (${GVIII}, Table 4.3-III, note c): "one major maneuver and eight short firings" (4.1)`,
      ),
      deltaV: doc(
        41.22 * FT,
        `41.22 ft/s, "the resultant ΔV applied during the braking; however, the total ΔV expended during semi-optical approach was about twice this number" (${GVIII}, Table 5.1.5-VII; Table 4.3-III, note d): the record's, held against the braking flown`,
      ),
      toward: {
        station: {
          ahead: doc(
            150 * FT,
            `"At the conclusion of the braking maneuvers, the range between the spacecraft and GATV was 150 feet and there was no relative velocity" (${GVIII}, 4.1); "by 5:55:00 g.e.t., the spacecraft was about 150 feet from the GATV" (4.3.1.2.1): taken along the track, the Agena ahead`,
          ),
          above: estimated(0, 'not read: level with it'),
        },
        until: doc(
          DOCKING,
          `station kept "at ranges varying between 150 and 50 feet for approximately 36 minutes prior to docking" (${GVIII}, 4.1), docked at 6:33:16 (Table 4.2-I): the docking itself is not flown`,
        ),
      },
    },
    {
      id: 'undocking',
      label: 'Undocking: backed off the Agena',
      thrusters: 'forward',
      attitude: {
        label: 'Nose to the right of the motion, the pair yawed there with the Agena',
        aim: 'velocity',
        sense: 1,
        yaw: estimated(
          -90,
          `degrees, to the right: "a command was sent from the spacecraft directing the GATV Attitude Control System to yaw the docked vehicles to the right. A 90-degree maneuver was completed in 55 seconds" (${GVIII}, 4.1) at about 6:49 (Table 4.2-I); where the pair pointed after thruster No. 8's roll, with rates of +3, -5 and -2 deg/s at the undocking (5.1.5.3.1), is not recorded`,
        ),
        confidence: 'estimated',
        source: `"the vehicles were undocked with a separation thrust using the forward-firing thrusters" (${GVIII}, 4.1)`,
      },
      turned: estimated(UNDOCKING - 60, 'docked, the pair as the yaw left it: its attitude after the roll is not read'),
      on: doc(UNDOCKING, `7:15:12.3, "when rates were reduced sufficiently to avoid recontact" (${GVIII}, 4.1; Table 4.2-I)`),
      off: doc(
        UNDOCKING + 6.6,
        `"Separation from the GATV occurred at 7:15:12.3 g.e.t. with thrusters 11 and 12 firing for 6.6 seconds" (${GVIII}, 5.1.5.3.1): its impulse is the type's two thrusters for that long on the ship`,
      ),
    },
  ],
  adapter: {
    equipment: {
      mass: derived(
        (SC8_LAUNCH - RETROGRADE) * LB,
        `the spacecraft at launch (8,351.31 lb) less at retrofire (5,726.36 lb: ${GVIII}, 3.3): ${(SC8_LAUNCH - RETROGRADE).toFixed(0)} lb, with what the thrusters burned not taken off`,
      ),
      gone: doc(EQUIPMENT, `"Adapter equipment section separation" at 10:03:48, planned 10:03:47 (${GVIII}, Table 4.2-I)`),
    },
    retro: {
      mass: derived(
        (RETROGRADE - REENTRY) * LB,
        `spacecraft 8 at retrofire less at 0.05 g (${GVIII}, 3.3): ${(RETROGRADE - REENTRY).toFixed(1)} lb, the section with its four rockets unfired`,
      ),
    },
  },
  retro: {
    sequence: estimated(
      RETRO - 60,
      'a minute before retrofire: when the crew had it in retrofire attitude is not read; "a 22-minute platform alignment was performed" before it (4.1)',
    ),
    below: derived(
      (Math.atan2(RETRO_DOWN, RETRO_AFT) * 180) / Math.PI,
      `degrees: the push as the crew read it from the computer after retrofire, 292.5 ft/s back and 114.1 down (and 0.3 to the side, not flown: ${GVIII}, Table 5.1.8-V; the accelerometers 292.66 and 113.81, Table 5.1.5-VII), so ${((Math.atan2(RETRO_DOWN, RETRO_AFT) * 180) / Math.PI).toFixed(1)}° below the line back along the motion`,
    ),
    on: doc(
      RETRO,
      `10:04:47, as planned, "near the Kano network station" (${GVIII}, Table 4.2-I and 4.1); rocket No. 1 lit at 10:04:46.6 (Table 5.1.8-V)`,
    ),
    spacing: derived(
      (RETRO_LIT[3]! - RETRO_LIT[0]!) / 3,
      `the four lit at 10:04:46.6, 52.2, 57.4 and 10:05:03.3, Nos. 1, 3, 2 and 4 (${GVIII}, Table 5.1.8-V): ${((RETRO_LIT[3]! - RETRO_LIT[0]!) / 3).toFixed(2)} s apart on the average (the type's 5.5: ${SEDR}, Section XI, p. 11-73)`,
    ),
    count: 4,
    thrust: derived(
      (mean(RETRO_IMPULSE) / mean(RETRO_BURN)) * LBF,
      `each rocket's total impulse over its web burning time, 14,219 to 14,332 lb-s in 5.2 to 5.6 s by their predelivery acceptance tests (${GVIII}, Table 5.1.8-V): ${(mean(RETRO_IMPULSE) / mean(RETRO_BURN)).toFixed(0)} lb on the average (the type's 2,490: ${SP121}, Table 4-I)`,
    ),
    burn: derived(mean(RETRO_BURN), `the four's web burning times, 5.3, 5.2, 5.2 and 5.6 s (${GVIII}, Table 5.1.8-V), on the average`),
    deltaV: doc(
      314.0 * FT,
      `314.0 ft/s "read by the crew from the onboard computer", 312.0 predicted, 314.7 by the rockets' acceptance tests (${GVIII}, Table 5.1.8-V), on a ship of 5,738 lb; the accelerometers 314.01 (Table 5.1.5-VII)`,
    ),
    gone: assumed(
      RETRO_GONE,
      `45 s after retrofire, when the type's sequence lights the jettison switch (${SP121}, Figure 3-3): not recorded`,
    ),
  },
  entry: {
    mass: doc(REENTRY * LB, `spacecraft 8's re-entry module at 0.05 g, 4,879.89 lb (${GVIII}, 3.3)`),
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
      source: `lift over drag as flown, at every Mach number: the programme's, "flown with an average lift-to-drag ratio of approximately 0.19" (${SP138}, p. 159), taken for spacecraft 8, whose own is not in its report`,
    },
    predicted: derived(
      0.19 / 0.65,
      `the lift over drag the wind tunnels had given, said and not flown: "a decrease of approximately 35 percent in the lift-to-drag ratio" (${SP138}, p. 163), from the 0.19 flown: 0.29`,
    ),
    trim: assumed(8.5, '"8° to 9°" at the greatest heating on GT-3 (Gemini Program Mission Report, Gemini IV, p. 5-3): the type’s, taken'),
    bank: doc(
      10,
      `degrees, to the right of the motion, which was toward the east: "From retrofire to an altitude of 400K feet, a 10-degree bank angle toward the south was flown as planned" (${GVIII}, 5.1.5.2.3)`,
    ),
    banked: estimated(RETRO_GONE + 1, 'as the retrograde section went: the ship turned to its entry attitude, its lift held from there'),
    banks: [
      {
        label: 'At 400,000 ft: the back-up bank, 52° to the south',
        bank: doc(
          52,
          `"From the 400K foot level to guidance initiation, the back-up bank angle of 52 degrees toward the south was flown as planned" (${GVIII}, 5.1.5.2.3)`,
        ),
        at: doc(
          ENTRY_400K,
          `10:26:53.239, when "the computer commanded a zero-degree bank angle which indicated proper spacecraft navigation to the 400K-foot level" (${GVIII}, 5.1.5.2.3)`,
        ),
      },
      {
        label: 'The computer’s commands flown: lift about 20° to the north',
        bank: estimated(
          -20,
          `degrees, to the left: the bank flown from 10:31 to 10:32 read off the report's Figure 5.1.5-17 (${GVIII}), 15° to 22° north`,
        ),
        at: doc(
          GUIDED,
          `"At 10:31:02.91 g.e.t., the flight crew started to fly the bank angles commanded by the onboard computer" (${GVIII}, 5.1.5.2.3)`,
        ),
      },
      {
        label: 'Lift about 35° to the north',
        bank: estimated(-35, `degrees: the bank flown from 10:32 to 10:33, 25° to 45° north, read off Figure 5.1.5-17 (${GVIII})`),
        at: estimated(T(10, 32, 0), 'read off Figure 5.1.5-17'),
      },
      {
        label: 'Lift about 15° to the north, through the computer’s rolls',
        bank: estimated(
          -15,
          `degrees: the bank flown from 10:33 to 10:35 between the rolls the computer commanded, about 10° to 20° north, read off Figure 5.1.5-17 (${GVIII}); the rolls through 90° and back are not flown`,
        ),
        at: estimated(T(10, 33, 10), 'read off Figure 5.1.5-17'),
      },
      {
        label: 'Lift to the north, the computer’s last command',
        bank: estimated(
          -90,
          `degrees: "Bank command -90.0" at guidance termination (${GVIII}, Table 5.1.5-VIII), flown from about 10:35:10 (Figure 5.1.5-17)`,
        ),
        at: estimated(T(10, 35, 10), 'read off Figure 5.1.5-17'),
      },
      {
        label: 'Guidance terminated: lift up',
        bank: estimated(0, `degrees: the bank flown back to about nought after guidance ended, read off Figure 5.1.5-17 (${GVIII})`),
        at: doc(GUIDANCE_OFF, `"guidance termination at 10:35:50.392 g.e.t." (${GVIII}, 5.1.5.2.3)`),
      },
    ],
  },
  heating: {
    noseRadius: doc(144 * IN, `the heat shield a spherical cap of 144 in radius (${SEDR}, Figure 2-3)`),
    starts: estimated(290, 'not read: the air at the pad, taken for the shield; nothing reads it, there being no surface'),
    surfaces: [],
  },
  descent: {
    ground: doc(0, 'the sea: it came down in the western Pacific'),
    mass: doc(
      MAIN_DEPLOY * LB,
      `spacecraft 8's re-entry module at the main parachute's deployment, 4,454.89 lb (${GVIII}, 3.3): taken from the drogue on`,
    ),
    drogue: {
      altitude: doc(
        47_000 * FT,
        `"Drogue parachute deploy 10:36:34.4", plotted at about 47,000 ft (${GVIII}, Figure 5.1.11-1, read off the figure to a thousand feet)`,
      ),
      dragArea: estimated(
        0.5 * Math.PI * ((8.3 / 2) * FT) ** 2,
        `an 8.3 ft conical ribbon drogue (${CR1106}, p. 218) at a drag coefficient of 0.5, the usual figure for the type: no measured figure found`,
      ),
      fills: derived(16, `"Drogue parachute disreef 10:36:50.4", 16 s after it came out (${GVIII}, Figure 5.1.11-1)`),
    },
    main: {
      altitude: doc(
        8_700 * FT,
        `"R and R section separation and main parachute deploy 10:38:10.6", plotted at about 8,700 ft (${GVIII}, Figure 5.1.11-1, read off the figure); the type's PARA switch is at 10,600 ft (${SEDR}, pp. 4-22 and 4-23)`,
      ),
      dragArea: derived(
        (2 * 4_400 * LB * 9.80665) / (1.225 * (31.6 * FT) ** 2),
        `the 84.2 ft ringsail's (${CR1106}, p. 222): "a mean descent rate of 31.6 fps" for a module of 4,400 lb, at sea level: 344 m²`,
      ),
      fills: derived(14, `deployed at 10:38:10.6 and "full open" at 10:38:24.6 (${GVIII}, Figure 5.1.11-1)`),
    },
    checks: [
      {
        id: 'reentry-module.at',
        label: 'Landing',
        value: LANDING,
        unit: 's',
        tolerance: 60,
        confidence: 'documented',
        source: `${GVIII}, Table 4.2-I and Figure 5.1.11-1: 10:41:26, planned 10:42:02`,
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
      'Armstrong and Scott landed in the ship, as Gemini was built to, and stayed in it, seasick, until the destroyer Leonard F. Mason reached them about three hours later: the ejection seats were for the pad, the climb and below 15,000 ft, and were not used',
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
        'The retrofire’s instant was worked on the ground for the planned landing point in recovery area 7-3, loaded into the ship’s time reference system over a network station before it (Gemini Program Mission Report, Gemini VIII, 5.1.5.2.3), and it fired at the planned second (Table 4.2-I); the ship came down within 7 nautical miles of the point (4.1), so the place it came down is taken for the place its burn was timed for',
    },
    latitude: doc(
      25 + 12 / 60,
      `${GVIII}, Table 4.3-I: 25°12′ N 136°05′ E, "IGS coordinates in the onboard computer"; planned 25°15′ N 136°00′ E; the pickup point reported by the U.S.S. Leonard F. Mason 25°22′ N 135°56′ E`,
    ),
    longitude: doc(136 + 5 / 60, `${GVIII}, Table 4.3-I`),
    at: doc(LANDING, `${GVIII}, Table 4.2-I: 10:41:26`),
    near: 'the western Pacific, some 500 miles east of Okinawa',
  },
  // GATV-5003 as the report's tracking had it at its insertion, flown on from there: the craft the rendezvous is made on.
  target: {
    orbit: { fix: INSERTION },
    epoch: '1966-03-16T16:41:02.389Z',
    label: 'GATV-5003',
    mass: doc(7_116 * LB, `the Agena in orbit, 7,116 lb (${GVIII}, 3.6)`),
    dragArea: estimated(
      2.2 * 1.52 * 7.95 * 0.8,
      'm²: the free-molecule figure of a body turning every way, 2.2, on its side and its ends as it is held, 0.8 of a 7.95 m Agena 1.52 m across, as GATV-5003’s own run takes it (vehicles/target-plan.ts): chosen',
    ),
  },
  events: [
    { id: 'liftoff', label: 'Liftoff', at: doc(0, `${GVIII}, Table 4.2-I: 16:41:02.39 G.m.t.; 4.1: 16:41:02.389`) },
    { id: 'beco', label: 'First stage cutoff: the second stage lit', at: doc(BECO, `${GVIII}, Table 4.2-I`), also: 'planned 153.71' },
    { id: 'stage-separation', label: 'The stages begin to part', at: doc(STAGING, `${GVIII}, Table 4.2-I`) },
    { id: 'seco', label: 'Second stage cutoff', at: doc(SECO, `${GVIII}, Table 4.2-I`), also: 'planned 335.59' },
    { id: 'spacecraft-separation', label: 'Spacecraft separation', at: doc(SEPARATION, `${GVIII}, Table 4.2-I`) },
    {
      id: 'fairings',
      label: 'Nose and scanner fairings off, later than usual',
      at: doc(FAIRINGS, `7 min 30 s after liftoff (${GVIII}, p. 5-101)`),
    },
    { id: 'height-adjust', label: 'Height adjust', at: doc(HEIGHT_ADJUST, `${GVIII}, Table 4.3-III`) },
    { id: 'phase-adjust', label: 'Phase adjust', at: doc(PHASE_ADJUST, `${GVIII}, Table 4.3-III`) },
    { id: 'plane-change', label: 'Plane change', at: doc(PLANE_CHANGE, `${GVIII}, Table 4.3-III`) },
    { id: 'vernier-height-adjust', label: 'Vernier height adjust', at: doc(VERNIER, `${GVIII}, Table 4.3-III`) },
    {
      id: 'radar-lock',
      label: 'The radar locks on the Agena, 181 nautical miles off',
      at: doc(
        T(3, 31, 18),
        `"acquired intermittently on the dipole antenna, at 3:27:48 g.e.t., and the radar locked on solidly 3.5 minutes later, at a range of 181 nautical miles" (${GVIII}, 5.1.5.2.2)`,
      ),
    },
    { id: 'coelliptic', label: 'Coelliptic burn', at: doc(COELLIPTIC, `${GVIII}, Table 4.3-III`) },
    { id: 'terminal-phase', label: 'Terminal phase initiation', at: doc(TPI, `${GVIII}, Table 4.3-III`) },
    { id: 'correction-1', label: 'First correction', at: doc(CORRECTION_1, `${GVIII}, Table 4.3-III`) },
    { id: 'correction-2', label: 'Second correction', at: doc(CORRECTION_2, `${GVIII}, Table 4.3-III`) },
    { id: 'terminal-braking', label: 'Braking begins', at: doc(BRAKING, `${GVIII}, Table 4.3-III`) },
    { id: 'station-keeping', label: 'About 150 ft from the Agena: station keeping', at: doc(T(5, 55, 0), `${GVIII}, 4.3.1.2.1`) },
    {
      id: 'docked',
      label: 'Docked: the first docking of two vehicles in orbit (not flown here)',
      at: doc(DOCKING, `${GVIII}, Table 4.2-I`),
      also: 'rigidized at 6:33:22',
    },
    {
      id: 'pair-yawed',
      label: 'The Agena yaws the pair 90° to the right',
      at: doc(T(6, 49, 0), `${GVIII}, Table 4.2-I: "approximated because of missing data"`),
    },
    {
      id: 'thruster-8',
      label: 'Thruster No. 8 fires on its own: the pair begins to roll (not flown)',
      at: doc(T(7, 0, 26.7), `${GVIII}, Table 4.2-I and 5.1.5.3.1`),
    },
    { id: 'undocking', label: 'Undocking', at: doc(UNDOCKING, `${GVIII}, Table 4.2-I`) },
    {
      id: 'rcs-on',
      label: 'Re-entry control system on: the roll near 300°/s (not flown)',
      at: doc(T(7, 16, 25.1), `${GVIII}, Table 4.2-I`),
    },
    { id: 'thruster-8-off', label: 'Thruster No. 8’s circuit breaker off', at: doc(T(7, 18, 15.7), `${GVIII}, Table 4.2-I`) },
    { id: 'rates-held', label: 'Rates under control', at: doc(T(7, 25, 30), `${GVIII}, Table 4.2-I`) },
    { id: 'equipment-section', label: 'Equipment section off', at: doc(EQUIPMENT, `${GVIII}, Table 4.2-I`) },
    { id: 'retrofire', label: 'Retrofire, over Africa in the seventh revolution', at: doc(RETRO, `${GVIII}, Table 4.2-I`) },
    { id: 'entry-400k', label: '400,000 ft', at: doc(ENTRY_400K, `${GVIII}, 5.1.5.2.3`) },
    { id: 'computer-banks', label: 'The crew fly the computer’s commands', at: doc(GUIDED, `${GVIII}, 5.1.5.2.3`) },
    { id: 'drogue-deployment', label: 'Drogue parachute', at: doc(DROGUE, `${GVIII}, Table 4.2-I; 10:36:34.4 in Figure 5.1.11-1`) },
    { id: 'main-deployment', label: 'The main parachute out', at: doc(MAIN, `${GVIII}, Figure 5.1.11-1; 10:38:08 in Table 4.2-I`) },
    {
      id: 'landing-attitude',
      label: 'Two-point suspension: repositioned for the landing',
      at: doc(LANDING_ATTITUDE, `${GVIII}, Figure 5.1.11-1`),
    },
    { id: 'splashdown', label: 'Landing', at: doc(LANDING, `${GVIII}, Table 4.2-I`) },
  ],
  checks: [
    ...orbitAfter(6000, 'the height adjust', 86.3, 144.7, 'Table 4.3-II, final, after the manoeuvre (planned 86.5 by 145.8)'),
    ...orbitAfter(8700, 'the phase adjust', 113.3, 144.7, 'Table 4.3-II, final (planned 116.1 by 145.8)'),
    ...orbitAfter(
      14100,
      'the coelliptic burn',
      143.9,
      146.7,
      'Table 4.3-II, final (planned 144.1 by 145.7); "the altitude differential ... about 13.5 nautical miles" (4.3.1.2.1)',
    ),
    ...orbitAfter(19200, 'the terminal phase initiation', 145.9, 159.0, 'Table 4.3-II, final (planned 145.0 by 163.0)'),
    ...orbitAfter(21600, 'the rendezvous', 158.6, 161.1, 'Table 4.3-IV, final, revolution 4, post-rendezvous (planned 158.9 by 161.1)'),
    ...orbitAfter(36000, 'undocking, before retrofire', 157.5, 161.3, 'Table 4.3-IV, final, revolution 7, pre-retrofire; period 90.55 min'),
    impulse('coelliptic', 'Coelliptic burn, impulse', 61.58, 0.05 * 61.58, 'Table 5.1.5-VII, the accelerometers; within 5 per cent'),
    impulse(
      'terminal-phase',
      'Terminal phase initiation, impulse',
      27.3,
      0.1 * 27.3,
      'Table 5.1.5-VII; within 10 per cent, the onboard and ground solutions being 27.5 and 32.6 (5.1.5.2.2)',
    ),
    impulse(
      'correction-1',
      'First correction, impulse',
      15.15,
      5,
      'Table 5.1.5-VII, the resultant; within 5 ft/s, the approximate total expended being 20 (Table 4.3-III)',
    ),
    impulse('correction-2', 'Second correction, impulse', 9.47, 5, 'Table 5.1.5-VII, the resultant; within 5 ft/s, as the first'),
    impulse(
      'terminal-braking',
      'Braking, impulse',
      41.22,
      8,
      'Table 5.1.5-VII, the resultant of the braking’s pulses; within 8 ft/s, its line not held',
    ),
    sighting(
      T(3, 31, 18),
      'Agena at the radar’s lock-on',
      181 * NMI,
      10 * NMI,
      '"locked on solidly ... at a range of 181 nautical miles" (5.1.5.2.2)',
    ),
    sighting(
      T(5, 1, 32),
      'Agena as the radar’s signal dropped',
      46 * NMI,
      3 * NMI,
      '"at a range of 46 nautical miles and an elevation of 16 degrees" at 5:01:32 (5.1.5.2.2)',
    ),
    sighting(
      Math.round(TPI),
      'Agena at the terminal phase initiation',
      29 * NMI,
      2 * NMI,
      '"the range was about 29 nautical miles" (4.3.1.2.1)',
    ),
    sighting(
      T(5, 55, 0),
      'Agena while keeping station',
      150 * FT,
      100 * FT,
      '"By 5:55:00 g.e.t., the spacecraft was about 150 feet from the GATV" (4.3.1.2.1); 150 to 50 ft (4.1)',
    ),
    {
      id: 'ejectionAt',
      label: 'Drogue out, at about 47,000 ft',
      value: DROGUE,
      unit: 's',
      tolerance: 60,
      confidence: 'documented',
      source: `${GVIII}, Table 4.2-I: 10:36:47, planned 10:36:32 (10:36:34.4 in Figure 5.1.11-1)`,
    },
    {
      id: 'alongTrack',
      label: 'Drogue out, along the track from where it landed',
      value: 0,
      unit: 'm',
      tolerance: 40_000,
      confidence: 'documented',
      source: `${GVIII}, Table 4.3-I: it landed at 25°12′ N 136°05′ E by its own guidance; the drogue comes out a few kilometres short of where it lands`,
    },
    {
      id: 'crossTrack',
      label: 'Drogue out, to the right of where it landed',
      value: 0,
      unit: 'm',
      tolerance: 25_000,
      confidence: 'documented',
      source: `${GVIII}, Table 4.3-I and 5.1.5.2.3: at guidance termination "1.4 nautical miles to the right of the desired track"`,
    },
  ],
};

/**
 * Gemini-Titan 3 as a flight into orbit: its record (vehicles/gemini-titan-plan.ts `GeminiTitanRecord`), which flight.ts
 * writes its plan from (`geminiTitanPlan`). The record with its sources and disagreements is set out in mission.md beside
 * this file; the numbers live here, each in the source's own units and converted once.
 *
 * Times are seconds from liftoff, 14:24:00.064 UTC. The checks' tolerances were written with the record, before the plan
 * was first flown, and nothing here was changed after: a miss is recorded (src/sim/misses.ts), not fitted. The mission
 * report (MSC-G-R-65-2), which has every event to the tenth and the weights as flown, has not been found: where this
 * flight's own figure is missing, the next flight's report (Gemini IV, MSC-G-R-65-3) gives its vehicles', `assumed`.
 */
import { assumed, derived, doc, estimated } from '../../../../../src/measure.ts';
import type { GeminiTitanRecord } from '../../vehicles/gemini-titan-plan.ts';

const IN = 0.0254;
const FT = 0.3048;
const LB = 0.45359237;
const LBF = 4.4482216;
const NMI = 1852;

/** Seconds from liftoff of an elapsed time as the transcript prints it, hours, minutes and seconds. */
const T = (h: number, m: number, s: number): number => h * 3600 + m * 60 + s;

const KIT = 'NASA release 65-81, the Gemini-Titan 3 press kit (17 March 1965)';
const IGS =
  'Gemini GT-3 Inertial Guidance System Evaluation, Trajectory Reconstruction: supplemental report 4 to the mission report MSC-G-R-65-2 (TRW, 17 May 1965)';
const VOICE = 'GT-3 Communications Transcript, supplemental report 5 to the mission report (NASA MSC, April 1965)';
const SP121 = 'Gemini Midprogram Conference (NASA SP-121, 1966)';
const SP138 = 'Gemini Summary Conference (NASA SP-138, 1967)';
const SP4002 = 'Project Gemini: Technology and Operations, a Chronology (NASA SP-4002), Appendix 1, Table A, p. 264';
const GIV = 'Gemini Program Mission Report, Gemini IV (MSC-G-R-65-3, June 1965)';
const GI = 'Gemini Program Mission Report GT-1 (NTRS 19670095753)';
const GVIII = 'Gemini Program Mission Report, Gemini VIII (MSC-G-R-66-4), Table 4.2-I';
const CR1106 = 'Project Gemini: A Technical Summary (Malik and Souris, NASA CR-1106, 1968)';
const SEDR = 'Project Gemini Familiarization Manual, SEDR 300 vol. 1 (McDonnell, 30 September 1965)';
const LSFR = 'Gemini Program Launch Systems Final Report (Aerospace Corporation, January 1967)';
const KING_HELE =
  '“a value of 2.2 is recommended for perigee heights of 150-400 km”, on the cross-section square to the motion (King-Hele, The Prediction of Satellite Lifetimes, RAE TR 87030, 1987, §9.1, after Cook 1965): a satellite’s, as Vostok’s and Mercury’s (vostok-3ka.ts SHIP_RAREFIED). Nothing published for Gemini';

/** The launch vehicle's stations above the first stage engines' exit, m: station 1348.103 is the exit (titan-ii-glv.md). */
const STATION = (s: number) => (1348.103 - s) * IN;
/** The spacecraft's Z stations above the same exit: Z13.44, the adapter's foot, sits on station 276.825 (gemini-titan.ts `BASE`). */
const Z = (z: number) => (1071.278 + z - 13.44) * IN;

// GLV-4's weights (Gemini IV mission report, section 3.3, p. 3-10, "obtained from Aerospace"): taken for GLV-3, whose own
// are in the mission report not found. With spacecraft 4 (7,879.05 lb, p. 3-11).
const GLV4_LIFTOFF = 336_000;
const GLV4_BECO = 85_000;
const GLV4_STAGE2_STEADY = 73_400;
const GLV4_SECO20 = 13_300;
const SC4_LAUNCH = 7_879.05;
const STAGE2_DRY = GLV4_SECO20 - SC4_LAUNCH;
const STAGE2_BURNED = GLV4_STAGE2_STEADY - GLV4_SECO20;
const STAGE1_DRY = GLV4_BECO - GLV4_STAGE2_STEADY;
const STAGE2_GROSS = STAGE2_DRY + STAGE2_BURNED;
const STAGE1_GROSS = GLV4_LIFTOFF - SC4_LAUNCH - STAGE2_GROSS;
/** The spacecraft at launch, lb (SP-4002's table). */
const SC3_LAUNCH = 7_111;
// Spacecraft 4's weights through its descent (Gemini IV mission report, p. 3-11), taken for spacecraft 3's re-entry module
// and retrograde section, whose own are in the mission report: at retrofire (the equipment section gone), at 0.05 g (the
// retrograde section gone), at the main parachute's deployment.
const RETROGRADE = 5_432.44;
const REENTRY = 4_725.71;
const MAIN_DEPLOY = 4_415.3;

/** The first stage's two chambers, GLV-1's as measured (GT-1 report, Table 5-II, p. 5-33): at 5 s from ignition and at 155 s. */
const S1_SL = 418_530;
const S1_ISP = { seaLevel: 257.3, vacuum: 281.1 };

/** The record's instants. */
const BECO = 156.25 - 3.452;
const STAGING = BECO + (155.29 - 154.61);
const SECO = 337.45 - 3.452;
const INSERTION = 353.8;
const SEPARATION = 359;
const FAIRINGS = T(0, 6, 21);
const BURN1 = [T(1, 33, 0), T(1, 34, 14)] as const;
const BURN2 = T(2, 17, 0);
const BURN3 = [T(4, 21, 23), T(4, 23, 14)] as const;
const RETRO = 16_403;
const EQUIPMENT = RETRO - 30;
const RETRO_GONE = T(4, 34, 15);
const DROGUE = T(4, 46, 48);
const LANDING_ATTITUDE = T(4, 48, 47);
const LANDING = T(4, 52, 31);

/** The forward-firing pair's thrust, lb, and the ship's weight in orbit: how long the second burn's 10 ft/s took (derived). */
const FORWARD_LBF = 79;
const AFT_LBF = 95;
const BURN2_LENGTH = (10 * FT) / ((2 * FORWARD_LBF * LBF) / (SC3_LAUNCH * LB));
/** The heat shield's 90 in disc, and the adapter's 120 in base, m². */
const SHIELD = Math.PI * (45 * IN) ** 2;
const BASE_DISC = Math.PI * (60 * IN) ** 2;

export const orbital: GeminiTitanRecord = {
  liftoffMass: derived(
    (STAGE1_GROSS + STAGE2_GROSS + SC3_LAUNCH) * LB,
    `GLV-4's two stages as its report weighs them (${GIV}, section 3.3), ${(STAGE1_GROSS + STAGE2_GROSS).toLocaleString('en-US')} lb, and spacecraft 3 at launch, 7,111 lb (${SP4002}): ${(STAGE1_GROSS + STAGE2_GROSS + SC3_LAUNCH).toLocaleString('en-US')} lb. The press kit has "about 340,000 pounds" (p. 39); GLV-3's own weights are in the mission report, not found`,
  ),
  titan: {
    first: {
      name: 'Titan first stage',
      nodes: ['TitanStage1', 'TitanStage1Engine', 'TitanInterstage'],
      mass: assumed(
        STAGE1_GROSS * LB,
        `GLV-4's at liftoff: its 336,000 lb with spacecraft 4 (7,879 lb) and the second stage (${STAGE2_GROSS.toLocaleString('en-US')} lb, below) taken off, ${STAGE1_GROSS.toLocaleString('en-US')} lb (${GIV}, section 3.3). The interstage goes with it`,
      ),
      dry: assumed(
        STAGE1_DRY * LB,
        `GLV-4's first stage as it was let go: the vehicle at first stage burnout (85,000 lb) less at the second stage's steady burn (73,400 lb), ${STAGE1_DRY.toLocaleString('en-US')} lb with what was left in its tanks (${GIV}, section 3.3). What the second stage burned in the second between is in it`,
      ),
      propellant: derived(
        (STAGE1_GROSS - STAGE1_DRY) * LB,
        `the stage at liftoff less as it was let go: ${(STAGE1_GROSS - STAGE1_DRY).toLocaleString('en-US')} lb burned from liftoff, GLV-4's (${GIV}, section 3.3, which also has 261,846 lb loaded, p. 5-87, some burned before the vehicle was let go)`,
      ),
      engine: {
        // (its two chambers on the one stage as one engine: a plan's engine count is its body's units, plan.ts `BodyDef.count`)
        name: 'Aerojet LR87-AJ-7 (two chambers)',
        count: 1,
        thrust: {
          seaLevel: assumed(
            S1_SL * LBF,
            `GLV-1's two chambers measured at 5 s from ignition, 418,530 lb (predicted 420,000: ${GI}, Table 5-II, p. 5-33). ${KIT} (p. 40) has "about 430,000 pounds of thrust at lift-off"; GLV-3's own "higher than predicted" (${LSFR}, the GLV histories), by how much not said`,
          ),
          vacuum: derived(
            (S1_SL * S1_ISP.vacuum * LBF) / S1_ISP.seaLevel,
            `the sea-level figure at the high-altitude specific impulse over the sea-level one (the same flow): ${Math.round((S1_SL * S1_ISP.vacuum) / S1_ISP.seaLevel).toLocaleString('en-US')} lb for the two. GLV-1 measured 472,770 lb at 140 s (${GI}, Table 5-II)`,
          ),
        },
        isp: {
          seaLevel: assumed(S1_ISP.seaLevel, `GLV-1's at 5 s from ignition, 257.3 s (predicted 258.8: ${GI}, Table 5-II)`),
          vacuum: assumed(
            S1_ISP.vacuum,
            `GLV-1's at 155 s, 281.1 s (${GI}, Table 5-II), some 60 km up: taken as the vacuum figure. GLV-4's flight average was 278.61 s (${GIV}, Table 5.2-II)`,
          ),
        },
      },
      ignition: doc(0, 'started on the pad, about 4 s before the vehicle was let go (the press kit, p. 11): the run begins at release'),
      cutoff: derived(
        BECO,
        `${IGS}, the reconstruction's input card (p. 75): "BOOSTER ENGINE CUTOFF=156.250" from going inertial, liftoff "3.452 seconds after go inertial" (section 3.1): 152.80 s. Its second stage cutoff, 337.450, is the 334.0 s of section 3.2. Grissom called "there was staging" at 2:35 (${VOICE}, p. 3). The README's earlier 154.3 s took the press kit's 2:36 for the nominal that ${LSFR} Table II.D-14 (1.70 s early) measures from`,
      ),
    },
    second: {
      name: 'Titan second stage',
      nodes: ['TitanStage2', 'TitanStage2Engine'],
      mass: assumed(
        STAGE2_GROSS * LB,
        `GLV-4's: its empty weight and what it burned, below: ${STAGE2_GROSS.toLocaleString('en-US')} lb (${GIV}, section 3.3, which has 60,560 lb loaded, p. 5-87)`,
      ),
      dry: assumed(
        STAGE2_DRY * LB,
        `GLV-4's: the vehicle 20 s after second stage cutoff (13,300 lb) less spacecraft 4 (7,879.05 lb), ${STAGE2_DRY.toLocaleString('en-US')} lb with what was left in its tanks (${GIV}, sections 3.3 and p. 3-11)`,
      ),
      propellant: derived(
        STAGE2_BURNED * LB,
        `GLV-4's from the start of its steady burn (73,400 lb) to 20 s after cutoff (13,300 lb): ${STAGE2_BURNED.toLocaleString('en-US')} lb (${GIV}, section 3.3)`,
      ),
      engine: {
        name: 'Aerojet LR91-AJ-7',
        count: 1,
        thrust: {
          vacuum: assumed(
            102_777 * LBF,
            `GLV-4's as flown, 102,777 lb (predicted 101,540: ${GIV}, Table 5.2-III, p. 5-99). ${KIT} (p. 40): "about 100,000 pounds of thrust at altitude"; GLV-1's 100,200 lb (${GI}, Table 5-II)`,
          ),
        },
        isp: { vacuum: assumed(313.07, `GLV-4's as flown, 313.07 s (predicted 310.53: ${GIV}, Table 5.2-III); GLV-1's 309.9 s`) },
      },
      ignition: derived(
        BECO,
        'at the first stage’s cutoff: the staging signal starts the second stage’s engine with the stages still joined',
      ),
      cutoff: doc(SECO, `${IGS}, section 3.2: 334 s; 4.68 s early (${LSFR}, Table II.D-14); "SECO" at 5:34 (${VOICE}, p. 4)`),
    },
    staging: assumed(
      STAGING,
      `as long after the first stage's cutoff as GLV-8's separation began after its cutoff, 0.68 s (154.61 and 155.29 s: ${GVIII}): GLV-3's own interval is in the mission report`,
    ),
    hot: {
      open: estimated(
        0.5,
        'of the interstage’s side the second stage’s jet leaves through: its ring of exhaust ports, half open (the model’s; no figure read)',
      ),
      turn: estimated(30, 'degrees below the level the jet leaves the ports at: not read'),
      endures: estimated(5, 's at full thrust the first stage’s forward dome stands the jet: not read. Planned for, it stood the 0.7 s'),
    },
  },
  separation: {
    at: doc(SEPARATION, `${IGS}, section 3.2: 359 s; "We are separated" at 6:10 (${VOICE}, p. 4)`),
    push: derived(
      (10 * FT * (SC3_LAUNCH + STAGE2_DRY)) / STAGE2_DRY,
      `the planned 10 ft/s the aft-firing thrusters added to the spacecraft (${KIT}, p. 7) as the joint's push, shared by the masses as every separation is (spacecraft 3, 7,111 lb, and the empty second stage, ${STAGE2_DRY.toLocaleString('en-US')} lb). Grissom held them on "a little too long" (On the Shoulders of Titans, p. 235): how long not read`,
    ),
    mass: derived(
      SC3_LAUNCH * LB,
      `the spacecraft at launch, 7,111 lb (${SP4002}): what stayed on the launch vehicle at separation and the fairings thrown off after are not read`,
    ),
  },
  ascent: {
    guidance: {
      azimuth: doc(
        72,
        `72° (${KIT}, p. 7; ${LSFR}, Table II.D-8): the launch plane, held by the gyros, rolled to it from 0:12 to 0:22 (${VOICE}, p. 2)`,
      ),
      vertical: doc(25, `up the plumb line until "There goes the pitch" at 0:25 (${VOICE}, p. 2), as called`),
      kick: estimated(15, 's: the pitch programme was not found; a pitch-over of fifteen seconds is ours'),
      turn: estimated(
        BECO,
        's: the radio guidance’s closed loop flown as the law’s linear tangent from staging; the first stage’s programme before it. When the ground’s steering began is in the mission report',
      ),
      target: {
        at: 'seco',
        altitude: derived(
          87.0 * NMI,
          `inserted at perigee: the flight path +0.01° 20 s after cutoff (${SP121}, Table 4-IV, p. 33) on an orbit of 87.0 by 121.0 nautical miles (Table 4-III), so the cutoff's height is the perigee's, 87.0 nautical miles over the reference ball`,
        ),
        climb: doc(0.01, `${SP121}, Table 4-IV, p. 33: +0.01° at insertion, 20 s after cutoff`),
        inclination: doc(32.6, `${SP4002}: 32.6° (with the azimuth given, a result and a check)`),
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
    centre: estimated(
      0,
      'the spacecraft’s centre of mass at the heat shield’s rim, Z103.44 (the model’s origin): not read. The re-entry module’s is a little above it and the adapter’s below',
    ),
    sheds: [
      {
        on: 'staging-nuts',
        name: 'Titan first stage',
        from: doc(0, 'the first stage engines’ exit plane, station 1348.103 (titan-ii-glv.md)'),
        to: derived(STATION(500), 'the separation plane, station 500, with the interstage on it (titan-ii-glv.md)'),
        radius: doc(60 * IN, 'the 120 in tank (titan-ii-glv.md)'),
        mass: assumed(STAGE1_DRY * LB, 'GLV-4’s as it was let go (as the plan’s, above)'),
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
        mass: assumed(STAGE2_DRY * LB, 'GLV-4’s empty (as the plan’s)'),
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
        on: 'equipment-section-release',
        name: 'Equipment section',
        from: derived(Z(13.44), `the adapter’s foot, Z13.44 (${SEDR}, Figure 2-4)`),
        to: derived(Z(68.44), `where the equipment and retrograde sections part, Z68.44 (${CR1106}, Figure 1, p. 5)`),
        radius: doc(60 * IN, 'its 120 in foot'),
        mass: derived((SC3_LAUNCH - RETROGRADE) * LB, 'the spacecraft at launch less at retrofire (as the plan’s, below)'),
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
        label: 'Perigee at cutoff',
        value: 87.0 * NMI,
        unit: 'm',
        tolerance: 12_000,
        confidence: 'documented',
        source: `${SP121}, Table 4-III, p. 33: 87.0 nautical miles (planned 87.1); ${SP4002}`,
      },
      {
        id: 'apogee',
        label: 'Apogee at cutoff',
        value: 121.0 * NMI,
        unit: 'm',
        tolerance: 25_000,
        confidence: 'documented',
        source: `${SP121}, Table 4-III, p. 33: 121.0 nautical miles (planned 130.1); ${SP4002}`,
      },
      { id: 'inclination', label: 'Inclination', value: 32.6, unit: '°', tolerance: 0.25, confidence: 'documented', source: SP4002 },
      {
        id: 'cutoffSpeed',
        label: 'Speed at cutoff, space-fixed',
        value: 25_682 * FT,
        unit: 'm/s',
        tolerance: 30,
        confidence: 'documented',
        source: `${SP121}, Table 4-IV, p. 33: 25,682 ft/s at insertion, 20 s after cutoff, with the second stage's tail-off in it (planned 25,697)`,
      },
    ],
  },
  // (no ball stated: nothing read says what the heights are over, and the mission report is not found; the heights and the
  // period of the one orbit imply it, src/sim/orbital.ts `heightsBall`)
  orbit: {
    perigee: doc(87.0 * NMI, `${SP121}, Table 4-III, p. 33: 87.0 nautical miles; ${SP4002}`),
    apogee: doc(
      121.0 * NMI,
      `${SP121}, Table 4-III: 121.0 nautical miles; ${SP4002}. The ground's first call, at 7:23, was "87 by 125" (${VOICE}, p. 5)`,
    ),
    inclination: doc(32.6, SP4002),
    period: doc(88.3 * 60, `${SP4002}: 88.3 min`),
  },
  injection: {
    at: doc(
      INSERTION,
      `${SP121}, Table 4-IV, p. 33: insertion at 353.8 s, 20 s after cutoff. The separation 5 s later, and its push, are left out of the published orbit`,
    ),
    heading: 'north',
    arc: estimated(
      10,
      'degrees: NOT documented. The ascent flown here is 8.5° round from the pad at cutoff, and insertion is 20 s on at 7.8 km/s, 1.4° more: good to a degree or two. Flying the ascent replaces it',
    ),
    anomaly: derived(
      2.1,
      'degrees: from the flight-path angle at insertion, +0.01° (NASA SP-121, Table 4-IV), on the published orbit’s eccentricity, 0.0048: tan γ = e sin ν / (1 + e cos ν), so two degrees past perigee',
    ),
  },
  mass: derived(
    SC3_LAUNCH * LB,
    `the spacecraft at launch, 7,111 lb (${SP4002}), taken for it in orbit: what it left on the launch vehicle and the fairings are not read`,
  ),
  rarefied: {
    drag: assumed(2.2, KING_HELE),
    area: derived(
      BASE_DISC,
      `m²: the spacecraft held nose or tail first along the motion, as it was for its burns and most of its three revolutions: the adapter's 120 in foot, its widest section (${SEDR}, Figure 2-3), 7.30 m². The hours it was let drift are left out`,
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
        `95 lb each, the type's (${SP121}, Table 4-I, p. 29; "94.5", ${CR1106}, p. 139), at the equipment section's foot, firing aft and pushing the ship forward. The text of SP-121 rounds it to 100 (p. 16)`,
      ),
      isp: assumed(273, `273 s, the type's (${SP121}, Table 4-I)`),
    },
    forward: {
      name: 'OAMS forward-firing thrusters',
      count: 2,
      thrust: assumed(
        FORWARD_LBF * LBF,
        `79 lb each, the type's (${SP121}, Table 4-I, p. 29), on the retrograde section, firing forward and pushing the ship back; "canted obliquely to prevent the exhaust plume from damaging the spacecraft skin" (${CR1106}, p. 139), at an angle not given. SP-121's text rounds it to 85 (p. 16)`,
      ),
      isp: assumed(273, `273 s, the type's (${SP121}, Table 4-I)`),
    },
  },
  moves: [
    {
      id: 'burn-1',
      label: 'First burn: the orbit made nearly round',
      thrusters: 'forward',
      attitude: {
        label: 'Small end forward, along the motion',
        aim: 'velocity',
        sense: 1,
        confidence: 'documented',
        source: `the forward-firing thrusters against the motion, the ship flying nose first (${KIT}, p. 7: "in-plane retrograde"; ${VOICE}, pp. 37 and 38)`,
      },
      turned: estimated(BURN1[0] - 120, 'in its attitude two minutes before: when the crew turned to it is not read'),
      on: doc(BURN1[0], `1:33:00 (${VOICE}, p. 37)`),
      off: doc(BURN1[1], `1:34:14, 74 s by the crew's watches (${VOICE}, p. 38); the ground had asked for 48 ft/s in 1 min 14 s`),
      deltaV: doc(
        49 * FT,
        `the incremental velocity indicator from 51 ft/s to 2 (${VOICE}, pp. 37 and 38): 49 ft/s along the ship's long axis. At the type's 2 x 79 lb on 7,111 lb, 74 s would be 54 ft/s: the cant of the chambers, or the thrust`,
      ),
    },
    {
      id: 'burn-2',
      label: 'Second burn: the orbit’s plane shifted',
      thrusters: 'forward',
      attitude: {
        label: 'Yawed square to the motion',
        aim: 'normal',
        sense: -1,
        confidence: 'estimated',
        source: `yawed 90° and the forward-firing thrusters fired (${VOICE}, p. 54; ${KIT}, p. 7: out of plane): which way it was yawed, and so whether the plane turned north or south, is not read`,
      },
      turned: estimated(BURN2 - 120, 'in its attitude two minutes before: not read'),
      on: doc(BURN2, `about 2:17:00 (${VOICE}, p. 54): to about ten seconds`),
      off: derived(
        BURN2 + BURN2_LENGTH,
        `as long as 10 ft/s takes at the type's 2 x 79 lb on 7,111 lb: ${BURN2_LENGTH.toFixed(1)} s. Its length is not read`,
      ),
      deltaV: doc(
        10 * FT,
        `10 ft/s on the indicator (${VOICE}, p. 54); the plane shifted "a fiftieth of a degree" (On the Shoulders of Titans, p. 235). Planned: 12 ft/s, then 2 aft (${KIT}, p. 7)`,
      ),
    },
    {
      id: 'burn-2-trim',
      label: 'Second burn: a second of the aft thrusters',
      thrusters: 'aft',
      attitude: {
        label: 'Yawed square to the motion',
        aim: 'normal',
        sense: -1,
        confidence: 'estimated',
        source: 'the same attitude: the aft-firing pair pushing the other way, taking back what was over',
      },
      turned: estimated(BURN2 + BURN2_LENGTH, 'still in it from the forward pair'),
      on: estimated(BURN2 + BURN2_LENGTH + 1, 'a second after the forward pair stopped: not read'),
      off: doc(BURN2 + BURN2_LENGTH + 2, `"1 second on the others" (${VOICE}, p. 54)`),
    },
    {
      id: 'burn-3',
      label: 'Third burn: the perigee brought down before retrofire',
      thrusters: 'aft',
      attitude: {
        label: 'Blunt end forward, against the motion',
        aim: 'velocity',
        sense: -1,
        confidence: 'documented',
        source: `the aft-firing thrusters against the motion, the ship blunt end first (${VOICE}, pp. 90 and 91; ${SP138}, p. 163: the burn before retrofire)`,
      },
      turned: estimated(BURN3[0] - 300, 'in its attitude five minutes before: not read'),
      on: doc(BURN3[0], `4:21:23 (${SP4002}; ${VOICE}, p. 90)`),
      off: doc(
        BURN3[1],
        `4:23:14 (${VOICE}, p. 91), "a minute and 48 seconds" by the crew's watches; the ground had asked for 96 ft/s in 1 min 49 s`,
      ),
      deltaV: doc(97 * FT, `97 ft/s on the indicator, burned to nothing (${VOICE}, pp. 90 and 91)`),
    },
  ],
  adapter: {
    equipment: {
      mass: derived(
        (SC3_LAUNCH - RETROGRADE) * LB,
        `the spacecraft at launch (7,111 lb) less at retrofire (spacecraft 4's 5,432.44 lb, ${GIV}, p. 3-11): ${(SC3_LAUNCH - RETROGRADE).toFixed(0)} lb, with what the thrusters burned, some 130 lb by the burns' impulses, not taken off`,
      ),
      gone: assumed(
        EQUIPMENT,
        `30 s before retrofire, the type's sequence (${SP121}, Figure 3-3, p. 17); spacecraft 3's own instant not read`,
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
      'a minute before retrofire: when the crew had it in retrofire attitude is not read; it was blunt end forward from the third burn',
    ),
    below: estimated(
      30,
      `degrees: the next flight's "180° yaw and about 30° pitch" (${GIV}, section 5.1.5), whose sign is lost in the text read; taken as Mercury's, the blunt end up and the push back and down. Spacecraft 3's own not read; the pitch was held by hand "within approximately 2°" (${SP138}, p. 162)`,
    ),
    on: doc(
      RETRO,
      `16,403 s, 4:33:23 (${IGS}, PDF p. 79; ${SP4002}); "All rockets fired normally" (${VOICE}, p. 96); planned 4:33:30 (${KIT}, p. 10)`,
    ),
    spacing: doc(5.5, `"fired at 5.5 second intervals in 1-2-3-4 order" (${SEDR}, Section XI, p. 11-73)`),
    count: 4,
    thrust: assumed(2_490 * LBF, `2,490 lb each, the type's (${SP121}, Table 4-I, p. 29); "approximately 2500 pounds" (${KIT}, p. 8)`),
    burn: doc(5.5, `"for 5.5 seconds" (${KIT}, p. 8)`),
    deltaV: derived(
      (56_800 * LBF) / (RETROGRADE * LB),
      `the four rockets' total impulse, 56,800 lb-s (${SP121}, Table 4-I: the type's), over the spacecraft at retrofire, spacecraft 4's 5,432.44 lb (${GIV}, p. 3-11): ${((56_800 * LBF) / (RETROGRADE * LB)).toFixed(1)} m/s, 336 ft/s. ${SP138} (p. 162) has "approximately 320 ft/sec" for the type`,
    ),
    gone: doc(
      RETRO_GONE,
      `"Retropack has jettisoned" at 4:34:15 (${VOICE}, p. 97), as called; the type's sequence lights its switch 45 s after retrofire (${SP121}, Figure 3-3)`,
    ),
  },
  entry: {
    mass: assumed(
      REENTRY * LB,
      `spacecraft 4's re-entry module at 0.05 g, 4,725.71 lb (${GIV}, p. 3-11). ${KIT} (p. 39) has "about 4,700 pounds" for spacecraft 3's`,
    ),
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
      source: `lift over drag as flown, at every Mach number: the programme's, "flown with an average lift-to-drag ratio of approximately 0.19" (${SP138}, p. 159), taken for spacecraft 3, whose centre of mass was 1.43 in off its axis (${GIV}, section 5.1.1.3) against spacecraft 4's 1.56. Spacecraft 3's own as flown is in the mission report, not found`,
    },
    predicted: derived(
      0.19 / 0.65,
      `the lift over drag the wind tunnels had given, said and not flown: "a decrease of approximately 35 percent in the lift-to-drag ratio, resulting in a loss of approximately 160 nautical miles in the downrange maneuver capability" (${SP138}, p. 163), from the 0.19 flown: 0.29`,
    ),
    trim: doc(8.5, `"8° to 9°" at the greatest heating on GT-3 (${GIV}, p. 5-3)`),
    bank: estimated(
      60,
      `degrees: the lift held up. The crew were to fly the backup bank angle, then the computer's commands (${SP138}, p. 163); with 35 per cent less lift than the computer allowed for, the target lay at the edge of what the ship could reach and every command was for more range. The bank angles flown are not read`,
    ),
    banked: estimated(RETRO_GONE + 1, 'as the retrograde section went: the ship turned to its entry attitude, its lift held from there'),
  },
  heating: {
    noseRadius: doc(144 * IN, `the heat shield a spherical cap of 144 in radius (${SEDR}, Figure 2-3)`),
    starts: estimated(290, 'not read: the air at the pad, taken for the shield; nothing reads it, there being no surface'),
    surfaces: [],
  },
  descent: {
    ground: doc(0, 'the sea: it came down in the Atlantic, north of the Dominican Republic'),
    mass: assumed(
      MAIN_DEPLOY * LB,
      `spacecraft 4's re-entry module at the main parachute's deployment, 4,415.30 lb (${GIV}, p. 3-11): taken from the drogue on`,
    ),
    drogue: {
      altitude: doc(
        60_000 * FT,
        `"There goes the drogue" at 4:46:48, at an indicated 60,000 ft (${VOICE}, p. 100); the type's at 50,000 ft (${SEDR}, p. 4-22; ${SP121}, p. 18)`,
      ),
      dragArea: estimated(
        0.5 * Math.PI * ((8.3 / 2) * FT) ** 2,
        `an 8.3 ft conical ribbon drogue (${CR1106}, p. 218) at a drag coefficient of 0.5, the usual figure for the type: no measured figure found`,
      ),
      fills: derived(16, `its two 16 s reefing cutters (${CR1106}, p. 218): full at 16 s`),
    },
    main: {
      altitude: assumed(
        10_600 * FT,
        `the PARA switch at 10,600 ft, the type's (${SEDR}, pp. 4-22 and 4-23): the pilot parachute pulls the rendezvous and recovery section off and the main out of it. Spacecraft 3's own height not read`,
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
        source: `${SP4002}: 4:52:31; "(Impact)" at 4:52:31 (${VOICE}, p. 105)`,
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
      'Grissom and Young landed in the ship, as Gemini was built to: the ejection seats were for the pad, the climb and below 15,000 ft, and were not used',
  },
  landing: {
    latitude: doc(22 + 26 / 60, `${SP4002}: 22°26′ N 70°51′ W, 60 nautical miles short of the planned point`),
    longitude: doc(-(70 + 51 / 60), SP4002),
    at: doc(LANDING, `${SP4002}: 4:52:31`),
    near: 'the Atlantic, north of the Dominican Republic',
  },
  events: [
    {
      id: 'liftoff',
      label: 'Liftoff',
      at: doc(0, 'On the Shoulders of Titans (NASA SP-4203), Appendix B, p. 524: 9:24:00.064 a.m. e.s.t.'),
    },
    {
      id: 'beco',
      label: 'First stage cutoff: the second stage lit',
      at: derived(BECO, `${IGS}, p. 75, less its 3.452 s`),
      also: 'the README had 154.3 s, from the press kit’s plan',
    },
    { id: 'seco', label: 'Second stage cutoff', at: doc(SECO, `${IGS}, section 3.2`) },
    { id: 'insertion', label: 'Insertion: 25,682 ft/s', at: doc(INSERTION, `${SP121}, Table 4-IV`) },
    { id: 'spacecraft-separation', label: 'Spacecraft separation', at: doc(SEPARATION, `${IGS}, section 3.2`) },
    { id: 'fairings', label: '“There went all fairings”', at: doc(FAIRINGS, `${VOICE}, p. 5`), also: 'the press kit planned 3:15' },
    { id: 'first-burn', label: 'First burn', at: doc(BURN1[0], `${VOICE}, p. 37`) },
    { id: 'second-burn', label: 'Second burn (about)', at: doc(BURN2, `${VOICE}, p. 54`) },
    { id: 'third-burn', label: 'Third burn', at: doc(BURN3[0], SP4002) },
    { id: 'retrofire', label: 'Retrofire: four rockets, 5.5 s apart', at: doc(RETRO, `${IGS}, PDF p. 79`), also: 'planned 4:33:30' },
    { id: 'retro-section-gone', label: '“Retropack has jettisoned”', at: doc(RETRO_GONE, `${VOICE}, p. 97`) },
    { id: 'drogue-deployment', label: '“There goes the drogue”', at: doc(DROGUE, `${VOICE}, p. 100`) },
    { id: 'landing-attitude', label: 'Two-point suspension: “Going to landing attitude”', at: doc(LANDING_ATTITUDE, `${VOICE}, p. 101`) },
    { id: 'splashdown', label: 'Landing', at: doc(LANDING, SP4002) },
  ],
  checks: [
    {
      id: 'after-6000.perigee',
      label: 'Perigee after the first burn',
      value: 85.6 * NMI,
      unit: 'm',
      tolerance: 6_000,
      confidence: 'documented',
      source: `"85.6, 92.6", the ground to the crew after the first burn (${VOICE}, p. 44); ${SP4002}'s lowest perigee, 85.6 nautical miles. Read at 1:40:00`,
    },
    {
      id: 'after-6000.apogee',
      label: 'Apogee after the first burn',
      value: 92.6 * NMI,
      unit: 'm',
      tolerance: 6_000,
      confidence: 'documented',
      source: `"85.6, 92.6" (${VOICE}, p. 44). Read at 1:40:00`,
    },
    {
      id: 'after-15900.perigee',
      label: 'Perigee after the third burn, in vacuum',
      value: 45 * NMI,
      unit: 'm',
      tolerance: 6_000,
      confidence: 'documented',
      source: `"a vacuum perigee of 45 nautical miles" (${SP138}, p. 163). Read at 4:25:00`,
    },
    {
      id: 'ejectionAt',
      label: 'Drogue out, at an indicated 60,000 ft',
      value: DROGUE,
      unit: 's',
      tolerance: 60,
      confidence: 'documented',
      source: `"There goes the drogue" at 4:46:48 (${VOICE}, p. 100)`,
    },
    {
      id: 'alongTrack',
      label: 'Drogue out, along the track from where it landed',
      value: 0,
      unit: 'm',
      tolerance: 40_000,
      confidence: 'documented',
      source: `${SP4002}: it landed at 22°26′ N 70°51′ W, 60 nautical miles short of the planned point; the drogue comes out a few kilometres short of where it lands`,
    },
    {
      id: 'crossTrack',
      label: 'Drogue out, to the right of where it landed',
      value: 0,
      unit: 'm',
      tolerance: 25_000,
      confidence: 'documented',
      source: SP4002,
    },
  ],
};

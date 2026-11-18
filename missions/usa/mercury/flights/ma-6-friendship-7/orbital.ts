/**
 * Friendship 7 as a flight into orbit: its record (vehicles/mercury-atlas-plan.ts `MercuryAtlasRecord`), which flight.ts
 * writes its plan from (`mercuryAtlasPlan`). The record with its sources and disagreements is set out in mission.md beside
 * this file; the numbers live here, each in the source's own units and converted once.
 *
 * Times are seconds from liftoff, 14:47:39 UTC. The checks' tolerances were written with the record, before the plan
 * was first flown, and nothing here was changed after: a miss is recorded (src/sim/misses.ts), not fitted.
 */

import { assumed, derived, doc, estimated } from '../../../../../src/measure.ts';
import { MA2_NOZZLES } from '../../vehicles/mercury-atlas.ts';
import type { MercuryAtlasRecord } from '../../vehicles/mercury-atlas-plan.ts';
import { HARDWARE, TOWER_MOTORS } from '../../vehicles/mercury-redstone.ts';

const IN = 0.0254;
const FT = 0.3048;
const LB = 0.45359237;
const LBF = 4.4482216;
const NMI = 1852;
const PSF = 47.880259;

/** Seconds from liftoff of an elapsed time as the report prints it, hours, minutes and seconds. */
const T = (h: number, m: number, s: number): number => h * 3600 + m * 60 + s;

const R6 = 'Results of the First United States Manned Orbital Space Flight, February 20, 1962 (NASA MSC, 1962)';
const SP45 = 'NASA SP-45, Mercury Project Summary (1963)';
const SP4201 = 'This New Ocean (NASA SP-4201, 1966)';
const TND3814 = 'NASA TN D-3814, the MA-7 report';
const WP230 = 'MA-4 and MA-5 Postlaunch Trajectory Report (NASA, NTRS 19730073391)';
const ASTRONAUTIX = 'Encyclopedia Astronautica, "Atlas D" (Wade; secondary, no sources given)';
const TABLE_6_II = `${R6}, Table 6-II, p. 71`;
const TABLE_6_I = `${R6}, Table 6-I, p. 71`;

/** The stack's stations, in from the booster engines' exit plane (vehicles/atlas_lv3b.py: S_EXIT 1310 less each). */
const STATION = (s: number) => (1310 - s) * IN;
/** The capsule's plane of maximum diameter above the booster engines' exits, m (mercury-atlas.ts `BASE`). */
const PLANE = (808 + 50.75 + 1.06) * IN;

const SPACECRAFT_AT_LAUNCH = 4265;
const IN_ORBIT = 2987;
const BOOSTER_SECTION = 6720;
const TANK_GROSS = 249_230;
const TANK_EMPTY = 5_174;

/** The 1,000 lbf sustainer and its two verniers, fed by its pumps and cut with it, as one engine. */
const SUSTAINER_SL = 57_000 + 2 * 1_000;
const SUSTAINER_ISP = { seaLevel: 215, vacuum: 309 };
const BOOSTER_ISP = { seaLevel: 248, vacuum: 282 };

/** The record's instants. */
const BECO = T(0, 2, 9.6);
const STAGING = BECO + 4;
const TOWER = T(0, 2, 33.3);
const SECO = T(0, 5, 1.4);
const SEPARATION = T(0, 5, 3.6);
const RETROSEQUENCE = T(4, 32, 38);
const RETRO = T(4, 33, 8);
const PACK_PLANNED = T(4, 33, 58);
const PACK_GONE = T(4, 43, 14);
const ENTRY_G = T(4, 43, 31);
const DROGUE = T(4, 49, 17.2);
const MAIN = T(4, 50, 11);
const LANDING = T(4, 55, 23);

/** The capsule as it came into the air once the pack had gone, lb: MA-7's fall from orbit to its "normal reentry" weight taken off MA-6's in orbit. */
const ENTRY_LB = IN_ORBIT - (2974.56 - 2663.36);
/** The capsule held in orbit attitude, its shield's disc and its side as the motion meets them, m^2. */
const DISC = (Math.PI * (74.5 * IN) ** 2) / 4;
const SIDE = (((74.5 + 32) / 2) * 58.4 + 32 * 22.8) * IN * IN;
const PITCH = 34;

export const orbital: MercuryAtlasRecord = {
  liftoffMass: derived(
    (BOOSTER_SECTION + TANK_GROSS + SPACECRAFT_AT_LAUNCH) * LB,
    `the booster section (${BOOSTER_SECTION.toLocaleString('en-US')} lb), the tank section fuelled (${TANK_GROSS.toLocaleString('en-US')} lb) and the spacecraft at launch (${SPACECRAFT_AT_LAUNCH.toLocaleString('en-US')} lb, ${R6}, p. 7): ` +
      `260,215 lb. No weight for Atlas 109-D has been read; ${SP4201} (p. 26) has the Atlas missile "around 260,000 pounds" fuelled`,
  ),
  atlas: {
    booster: {
      name: 'Booster section',
      nodes: ['AtlasBoosterSection', 'AtlasBoosterEngines'],
      mass: assumed(
        BOOSTER_SECTION * LB,
        `6,720 lb, the Atlas D's: ${ASTRONAUTIX}, "Stage 0, Atlas MA-2: gross mass 3,050 kg (6,720 lb), empty mass 3,050 kg". What it carries is drawn from the tank above it, so it leaves empty. 109-D's own not read`,
      ),
      engine: {
        name: 'Booster engines (Rocketdyne MA-2)',
        count: 2,
        thrust: {
          seaLevel: doc(
            154_000 * LBF,
            `154,000 lbf each, rated (${SP45}, p. 85: "two booster engines having 154,000 pounds of thrust each"); taken at sea level, as the Atlas's ratings were. ${R6} (p. 45): "a total thrust of approximately 360,000 pounds"; the MA-9 press kit, 150,000`,
          ),
          vacuum: derived(
            ((154_000 * BOOSTER_ISP.vacuum) / BOOSTER_ISP.seaLevel) * LBF,
            `the sea-level rating at the vacuum specific impulse over the sea-level one (the same flow): 175,113 lbf. ${ASTRONAUTIX} has 341,130 lbf for the pair, from 150,000 each`,
          ),
        },
        isp: {
          seaLevel: assumed(
            BOOSTER_ISP.seaLevel,
            `248 s, the XLR-89-5's: ${ASTRONAUTIX}. The Aircraft Engine Historical Society's page on the Atlas gives the same`,
          ),
          vacuum: assumed(
            BOOSTER_ISP.vacuum,
            `282 s, the XLR-89-5's: ${ASTRONAUTIX}; the same in the Aircraft Engine Historical Society's page`,
          ),
        },
        nozzle: MA2_NOZZLES.booster,
      },
      cutoff: doc(
        BECO,
        `${TABLE_6_II}: 00:02:09.6 (planned 00:02:11.4), by the ground guidance's command (p. 47). ${SP4201} (p. 426) has 2 min 14 s`,
      ),
      separation: assumed(
        STAGING,
        `four seconds after the booster engines' cutoff: the Atlas D's sequence, "BOOSTER ENGINE CUTOFF 130 SEC, STAGING 134 SEC" (${R6}, Figure 4-4, p. 46). MA-6's own staging is not in Table 6-II`,
      ),
    },
    tank: {
      name: 'Atlas, its tank section and sustainer',
      nodes: ['AtlasTank', 'AtlasSustainer', 'AtlasVerniers', 'AtlasPods', 'AtlasAdapter'],
      mass: assumed(
        TANK_GROSS * LB,
        `249,230 lb fuelled, the Atlas D's sustainer stage: ${ASTRONAUTIX}, "gross mass 113,050 kg (249,230 lb)". 109-D's own not read`,
      ),
      dry: assumed(TANK_EMPTY * LB, `5,174 lb empty: ${ASTRONAUTIX}, "empty mass 2,347 kg (5,174 lb)"`),
      propellant: derived(
        (TANK_GROSS - TANK_EMPTY) * LB,
        'the tank section fuelled less empty: 244,056 lb of liquid oxygen and RP-1, for all five engines. What of it could not be burned (residuals, the gas generators’) has not been read: all of it is taken as burnable',
      ),
      engine: {
        name: 'Sustainer and verniers (Rocketdyne MA-2)',
        count: 1,
        thrust: {
          seaLevel: derived(
            SUSTAINER_SL * LBF,
            `the sustainer's 57,000 lbf and two verniers of 1,000 lbf each (${SP45}, p. 88), rated and taken at sea level: 59,000 lbf. Fed by the sustainer's pumps and cut with it (${R6}, p. 47), they are flown as part of it`,
          ),
          vacuum: derived(
            ((SUSTAINER_SL * SUSTAINER_ISP.vacuum) / SUSTAINER_ISP.seaLevel) * LBF,
            `the sea-level figure at the vacuum specific impulse over the sea-level one: 84,795 lbf. ${ASTRONAUTIX} has 81,655 lbf for the sustainer alone`,
          ),
        },
        isp: {
          seaLevel: assumed(
            SUSTAINER_ISP.seaLevel,
            `215 s, the XLR-105-5's (${ASTRONAUTIX}), taken for the verniers too; the Aircraft Engine Historical Society's page has 220 s for a later sustainer`,
          ),
          vacuum: assumed(
            SUSTAINER_ISP.vacuum,
            `309 s, the XLR-105-5's (${ASTRONAUTIX}); 316 s in the Aircraft Engine Historical Society's page, for a later one`,
          ),
        },
        // (the verniers' own nozzles are drawn from MA2_NOZZLES.vernier: flight.ts `flies.fires`)
        nozzle: MA2_NOZZLES.sustainer,
      },
      velocity: doc(
        25_730 * FT,
        `cut by the ground guidance "once satisfied that all insertion parameters are attained" (${R6}, p. 47): 25,730 ft/s at cutoff (${TABLE_6_I}), "seven feet per second below nominal" (${SP4201}, p. 426). Space-fixed: SP-12's table of the same form for MA-8 says so, and ${SP4201} gives it as "an inertial velocity of 17,544 miles per hour"`,
      ),
      cutoff: doc(SECO, `${TABLE_6_II}: 00:05:01.4; tail-off complete 00:05:02`),
    },
  },
  tower: {
    mass: derived(
      (SPACECRAFT_AT_LAUNCH - IN_ORBIT) * LB,
      `the spacecraft at launch less in orbit (${R6}, p. 7): 1,278 lb, the tower with its two motors, and with them the posigrades' propellant and what else went before orbit. MA-7's (${TND3814}, p. 7): 1,269.5 lb`,
    ),
    separation: doc(TOWER, `${TABLE_6_II}: "tower release" 00:02:33.3, its rocket firing at 00:02:33.4 (planned 00:02:34.2)`),
  },
  separation: {
    at: doc(SEPARATION, `${TABLE_6_II}: 00:05:03.6 (planned 00:05:03.8)`),
    push: derived(
      (3 * 400 * 1 * LBF) / (IN_ORBIT * LB) + (3 * 400 * 1 * LBF) / (TANK_EMPTY * LB),
      `three posigrades of 400 lb for about a second (${R6}, p. 9; ${SP45}, Table 3-III), 1,200 lb s, on the spacecraft in orbit (2,987 lb) and the Atlas empty (5,174 lb): "the expected velocity change" (${R6}, p. 11)`,
    ),
    mass: doc(IN_ORBIT * LB, `${R6}, p. 7: "The weight at insertion into orbit was 2,987 pounds"`),
  },
  ascent: {
    guidance: {
      azimuth: doc(
        72.51,
        `MA-5 left Complex 14 "on a heading 72.51 degrees east of north", and MA-6's "was to be the same that Enos had followed" (${SP4201}, pp. 399 and 419). ${R6} (p. 46): the pad's pitch axis lay on 105°, the insertion heading about 75°, a roll of about 30° from 2 to 15 s`,
      ),
      vertical: doc(
        15,
        `${R6}, p. 46 and Figure 4-4: up the plumb line, rolling from 2 s to "END ROLL PROGRAM 15 SEC", "then the pitch program is started"`,
      ),
      kick: estimated(15, 's: the pitch programme was not found; a pitch-over of fifteen seconds is ours'),
      turn: doc(
        155,
        `${SP45}, p. 101: "Steering began at 155 seconds"; ${R6}, Figure 4-4: "START OF GUIDANCE 156 SEC". Before, the programme in the autopilot; from there the ground's radio guidance, flown here as the law's linear tangent`,
      ),
      target: {
        at: 'seco',
        altitude: doc(
          528_381 * FT,
          `${TABLE_6_I}: 528,381 ft at cutoff (over what is not said: taken over the reference ball, as the orbit's heights)`,
        ),
        climb: doc(
          -0.047,
          `${TABLE_6_I}: flight-path angle −0.047°, "only .05 of a degree low" (${SP4201}, p. 426); SP-12's same table for MA-8 calls it space-fixed`,
        ),
        inclination: doc(32.54, `${TABLE_6_I}: inclination 32.54° (with the azimuth given, a result and a check)`),
      },
    },
    drag: [
      {
        until: doc(TOWER, `${TABLE_6_II}: the tower released at 00:02:33.3`),
        area: derived(Math.PI * (5 * FT) ** 2, `the 10 ft tank's disc (${SP45}, p. 85): 78.5 sq ft`),
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
            'NOT FOUND for the Mercury-Atlas: the shape of a slender launch vehicle’s curve, of the order of the Redstone stack’s, chosen. The tower and the booster fairings are in it',
        },
      },
      {
        until: doc(SECO, 'to the end of the ascent'),
        area: derived(Math.PI * (5 * FT) ** 2, `the 10 ft tank's disc (${SP45}, p. 85)`),
        curve: {
          points: [
            [0, 0.28],
            [1, 0.45],
            [2, 0.38],
            [4, 0.25],
            [10, 0.2],
          ],
          confidence: 'estimated',
          source:
            'NOT FOUND: as above, a little less without the tower. Above 45 km, where the tower goes, it moves nothing that can be measured',
        },
      },
    ],
    steering: {
      authority: estimated(
        8,
        'deg/s² at full throw, about each axis: NOT FOUND. The booster chambers swung 5° (685 kN each, some 15 m from the centre of mass of a 118 t, 29 m stack: about 12 deg/s²), the sustainer 3° once alone (about 9): taken as 8 throughout',
      ),
    },
    centre: estimated(
      15.8 * IN,
      'the capsule’s centre of mass 25 in above the tip of its heat shield, 9.2 in below its plane of maximum diameter: the Redstone flights’ guess (mercury-redstone.ts), taken for this one',
    ),
    sheds: [
      {
        on: 'booster-latch',
        name: 'Booster section',
        from: doc(0, 'the booster engines’ exit plane'),
        to: derived(STATION(1133), 'the staging plane, station 1133 (vehicles/atlas_lv3b.py)'),
        radius: derived(60.6 * IN, 'its skin, on the tank’s own line (vehicles/atlas_lv3b.py)'),
        mass: assumed(BOOSTER_SECTION * LB, `6,720 lb (${ASTRONAUTIX})`),
        centre: estimated(2, 'about the booster engines’ gimbals, where its weight is'),
        gyration: { roll: estimated(1.3, 'a ring 1.5 m across its fairings'), across: estimated(1.6, 'a short drum, its engines low') },
        ahead: estimated(7.3, 'its open top, the tank’s 7.3 m² disc, at 1.0'),
        astern: estimated(8, 'its engines and fairings, at 1.0'),
        side: {
          dragArea: estimated(20, '4.5 m by 4.9 m across the fairings, at 0.9'),
          from: doc(0, 'its stretch along the stack, as above'),
          to: derived(STATION(1133), 'its stretch along the stack, as above'),
        },
      },
      {
        on: 'tower-clamp',
        name: 'Escape tower',
        motors: TOWER_MOTORS,
        from: derived(PLANE + (209.07 - 104.5) * IN, 'the canister’s top, Z209.07, above the capsule’s plane (SEDR 104, Figure 1-3)'),
        to: derived(PLANE + (389.05 - 104.5) * IN, 'the tower’s tip, Z389.05 (the same figure)'),
        radius: estimated(0.45, 'its legs’ spread at the foot'),
        mass: derived((SPACECRAFT_AT_LAUNCH - IN_ORBIT) * LB, 'as the plan’s tower (the spacecraft at launch less in orbit)'),
        centre: estimated(PLANE + (300 - 104.5) * IN, 'about the escape motor, which is most of its weight'),
        gyration: { roll: estimated(0.2, 'a slim motor on a lattice'), across: estimated(1.3, 'a 4.6 m stick, heavy at the top') },
        ahead: estimated(0.4, 'the motor’s nose cone and ballast, 0.3 m²'),
        astern: estimated(0.8, 'the lattice and its foot ring'),
        side: {
          dragArea: estimated(3, '4.6 m by 0.6 m, at 1.1'),
          from: derived(PLANE + (209.07 - 104.5) * IN, 'its stretch along the stack, as above'),
          to: derived(PLANE + (389.05 - 104.5) * IN, 'its stretch along the stack, as above'),
        },
      },
      {
        on: 'adapter-clamp',
        name: 'Atlas 109-D',
        from: derived(STATION(1308), 'the sustainer’s exit, station 1308 (vehicles/atlas_lv3b.py)'),
        to: derived(PLANE - 1.06 * IN, 'the adapter’s top, 1.06 in under the capsule’s plane'),
        radius: derived(60 * IN, 'the 10 ft tank'),
        mass: assumed(TANK_EMPTY * LB, `empty, 5,174 lb (${ASTRONAUTIX}); what the run leaves in its tank is not counted`),
        centre: estimated(9, 'about halfway up, its engines and thrust cone below and the adapter above'),
        gyration: { roll: estimated(1.4, 'a thin shell 3 m across'), across: estimated(6.3, 'a 21.8 m tube') },
        ahead: estimated(4, 'the adapter and the oxygen tank’s taper, at 0.8 on 4.9 m²'),
        astern: estimated(7.3, 'the thrust cone and sustainer, on the 7.3 m² disc at 1.0'),
        side: {
          dragArea: estimated(66, '21.8 m by 3.05 m, at 1.0'),
          from: derived(STATION(1308), 'its stretch along the stack, as above'),
          to: derived(PLANE, 'its stretch along the stack, as above'),
        },
      },
    ],
    checks: [
      {
        id: 'cutoffAt',
        label: 'Sustainer engine cutoff',
        value: SECO,
        unit: 's',
        tolerance: 4,
        confidence: 'documented',
        source: TABLE_6_II,
      },
      {
        id: 'perigee',
        label: 'Perigee at cutoff',
        value: 86.92 * NMI,
        unit: 'm',
        tolerance: 12_000,
        confidence: 'documented',
        source: `${TABLE_6_I}: 86.92 nautical miles`,
      },
      {
        id: 'apogee',
        label: 'Apogee at cutoff',
        value: 140.92 * NMI,
        unit: 'm',
        tolerance: 25_000,
        confidence: 'documented',
        source: `${TABLE_6_I}: 140.92 nautical miles`,
      },
      { id: 'inclination', label: 'Inclination', value: 32.54, unit: '°', tolerance: 0.25, confidence: 'documented', source: TABLE_6_I },
      {
        id: 'maxQ',
        label: 'Greatest dynamic pressure going up',
        value: 982 * PSF,
        unit: 'Pa',
        tolerance: 7_000,
        confidence: 'documented',
        source: `${TABLE_6_I}: "Exit dynamic pressure, lb/sq ft 982"`,
      },
      {
        id: 'maxQAt',
        label: 'When',
        value: 60,
        unit: 's',
        tolerance: 15,
        confidence: 'documented',
        source: `${R6}, p. 120: "maximum q, at approximately T+1 minute". ${SP4201} (p. 426) has it "a hundred seconds later"`,
      },
      {
        id: 'coreG',
        label: 'Greatest load going up, at sustainer cutoff',
        value: 7.7,
        unit: 'g',
        tolerance: 0.4,
        confidence: 'documented',
        source: `${TABLE_6_I}: "Exit acceleration, g units 7.7"`,
      },
    ],
  },
  orbit: {
    radius: estimated(
      6_378_165,
      'm: the reports do not say what the heights are over. Taken as the equatorial radius (Fischer 1960): on it the published heights and the published period agree as a nodal period to about a second (world/meanelements.ts), on the mean radius they would not',
    ),
    perigee: doc(86.92 * NMI, `${TABLE_6_I}: 86.92 nautical miles. ${SP4201} (n. 34): 100 statute miles`),
    apogee: doc(140.92 * NMI, `${TABLE_6_I}: 140.92 nautical miles; the capcom at 00:07:36, "your apogee altitude is 138" (${R6}, p. 151)`),
    inclination: doc(32.54, TABLE_6_I),
    period: doc(88 * 60 + 29, `${TABLE_6_I}: 88 min 29 s`),
    kind: {
      is: 'nodal',
      confidence: 'derived',
      source:
        'node to node: on the equatorial radius the published heights’ mean orbit has a nodal period 0.9 s short of the 88 min 29 s, an anomalistic one 9.4 s long and a Kepler one 14.0 s long, ' +
        'so the nodal is the nearest for every period within its rounding (tests/periods.test.mjs). No document read says which period it is',
    },
  },
  injection: {
    at: doc(SECO, `${TABLE_6_II}: sustainer cutoff, 00:05:01.4. The posigrades' push 2.2 s later is left out`),
    heading: 'north',
    arc: estimated(
      9,
      'degrees: NOT documented. Some 870 km downrange at cutoff on a heading of 72 to 75°, reckoned by hand from the times and round speeds, and the pad’s own 124 km eastward in five minutes: good to a degree. Flying the ascent replaces it',
    ),
    anomaly: derived(
      353.7,
      'degrees: from the flight-path angle at cutoff, −0.047° (Table 6-I), on the published orbit’s eccentricity, 0.0076: tan γ = e sin ν / (1 + e cos ν), so six degrees short of perigee',
    ),
  },
  mass: doc(IN_ORBIT * LB, `${R6}, p. 7: 2,987 lb at insertion; 2,970 lb at retrofire`),
  rarefied: {
    drag: assumed(
      2.2,
      '“a value of 2.2 is recommended for perigee heights of 150-400 km”, on the cross-section square to the motion (King-Hele, The Prediction of Satellite Lifetimes, RAE TR 87030, 1987, §9.1, after Cook 1965): a satellite’s, as Vostok’s (vostok-3ka.ts SHIP_RAREFIED). Nothing published for the Mercury capsule',
    ),
    area: derived(
      DISC * Math.cos((PITCH * Math.PI) / 180) + SIDE * Math.sin((PITCH * Math.PI) / 180),
      `m²: the capsule held in orbit attitude, blunt end forward and pitched ${PITCH}° ("the normal orbit attitude of 0° yaw, 0° roll and 34° pitch", ${R6}, p. 74): its 74.5 in shield's disc (2.81 m²) at the cosine and its side (the 20° cone 58.4 in long from 74.5 to 32 in, and the 32 by 22.8 in recovery compartment: 2.48 m²) at the sine, 3.72 m². ` +
        'The antenna canister and the pack are left out, and so are the hours Glenn let it drift or yawed it round: an approximation, held to the attitude it was mostly held in',
    ),
    length: doc(131.57 * IN, '131.57 in, retro nozzles to canister top (SEDR 104, Figure 1-3): the length its Knudsen number is taken on'),
  },
  hand: estimated(
    3,
    'deg/s: how fast a hand turned the capsule by fly-by-wire or the manual proportional control. Not read; Glenn turned it slowly, to save his fuel',
  ),
  retro: {
    sequence: doc(
      RETROSEQUENCE,
      `${R6}, p. 74: "The final retrosequence time was 04:32:38": thirty seconds before retrofire the capsule is turned to its retrofire attitude`,
    ),
    below: doc(
      PITCH,
      `${R6}, Figure 2-22, p. 25: retrofire attitude "APPROX. 34°", the blunt end up, so the push is back and down; "held within about 3° of the nominal attitudes" (p. 75)`,
    ),
    on: doc(RETRO, `${TABLE_6_II}: retrofire initiation, retro No. 1 (left), 04:33:08 (planned 04:32:58)`),
    spacing: doc(5, `${R6}, p. 10: "ripple-fired (5-second delays between motor ignitions)"; Table 6-II: 04:33:13, 04:33:18`),
    count: 3,
    thrust: doc(1_000 * LBF, `${R6}, p. 9 (and ${SP45}, Table 3-III): 1,000 lb nominal thrust each`),
    burn: doc(10, `${R6}, p. 9: "10 sec approximate burning time each"`),
    deltaV: derived(
      (38_880 * LBF) / (2_970 * LB),
      `the three motors' specified total impulse, "38,880 lb-sec" (${WP230}, p. 2-2; ${TND3814}, p. 101: 38,943 for MA-7's group), over the capsule at retrofire, 2,970 lb (${R6}, p. 7): 128 m/s, 421 ft/s. ` +
        'What the motors burned off would add a few per cent; their propellant has not been read. The report says only that they gave "the expected velocity change" (p. 11)',
    ),
    planned: doc(
      PACK_PLANNED,
      `${TABLE_6_II}: "retro assembly jettison" planned at 04:33:58; on the day "none: retro assembly kept on during reentry"`,
    ),
    gone: estimated(
      PACK_GONE,
      `the instant the pilot said "I think the pack just let go" (${R6}, transcript, 04:43:14, p. 190): the straps burned through in the heat of the entry and the pack went in pieces. When it went in fact is not established`,
    ),
  },
  entry: {
    mass: assumed(
      ENTRY_LB * LB,
      `2,987 lb in orbit (${R6}, p. 7) less what MA-7 lost between orbit and its “normal reentry” weight, 2,974.56 to 2,663.36 lb (${TND3814}, p. 7): 2,675.8 lb, the pack and the propellants. MA-6’s own not read`,
    ),
    area: HARDWARE.area,
    drag: HARDWARE.entryDrag,
  },
  heating: {
    noseRadius: assumed(
      80 * IN,
      'NASA CR-649: the heat shield a spherical cap of 80 in radius, the same mould line for the ablation shield as for the heat sink',
    ),
    starts: estimated(290, 'not read: the air at the pad, taken for the shield; nothing reads it, there being no surface'),
    // (no surfaces: the ablator's thickness, density and heat of ablation have not been read)
    surfaces: [],
  },
  descent: {
    ground: doc(0, 'the sea: it came down in the Atlantic (Results, p. 76)'),
    mass: doc(
      2_493 * LB,
      `${R6}, p. 7: "The water-landing weight was 2,493 pounds": what the capsule weighs under its parachutes, taken from the drogue on`,
    ),
    drogue: {
      altitude: doc(
        30_000 * FT,
        `the pilot, 04:49:20: "drogue came out at 30,000, at about a 90° yaw" (${R6}, p. 191); "drogue was deployed at slightly higher altitude in MA-6" than the 21,000 ft of the design (Figure 2-22, p. 25). He was reaching to let it out early when it came`,
      ),
      ...HARDWARE.drogue,
    },
    main: {
      altitude: doc(10_800 * FT, `${R6}, p. 135: "At 10,800 feet the main parachute was deployed"; the design's 10,000 (Figure 2-22)`),
      ...HARDWARE.main,
    },
    checks: [
      {
        id: 'mercury-capsule.at',
        label: 'Landing',
        value: LANDING,
        unit: 's',
        tolerance: 40,
        confidence: 'documented',
        source: `${TABLE_6_II}: 04:55:23`,
      },
      {
        id: 'mercury-capsule.speed',
        label: 'Falling at the sea, on the main',
        value: 30 * FT,
        unit: 'm/s',
        tolerance: 1.5,
        confidence: 'documented',
        source: `${R6}, p. 29: "a sinking velocity of 30 feet per second at sea level", the design's; no measured figure for MA-6 read`,
      },
    ],
  },
  lands: { on: 'sea', ship: 'the capsule' },
  landing: {
    latitude: doc(
      21 + 25.6 / 60,
      `${SP45}, Table 8-III, p. 135: where the capsule was picked up, 21°25.6′ N 68°36.5′ W; predicted after retrofire 21°31.2′ N 68°52.9′ W`,
    ),
    longitude: doc(-(68 + 36.5 / 60), `${SP45}, Table 8-III, p. 135`),
    at: doc(LANDING, `${TABLE_6_II}: 04:55:23`),
    near: 'the Atlantic, east of Grand Turk',
  },
  events: [
    { id: 'liftoff', label: 'Liftoff', at: doc(0, `${R6}, Appendix A, p. 139: 14:47:39Z`) },
    { id: 'beco', label: 'Booster engine cutoff', at: doc(BECO, TABLE_6_II), also: '2 min 14 s (This New Ocean, p. 426)' },
    {
      id: 'staging',
      label: 'Booster section let go',
      at: assumed(STAGING, 'four seconds after the cutoff: the Atlas D’s sequence (Results, Figure 4-4)'),
    },
    { id: 'tower-release', label: 'Escape tower released', at: doc(TOWER, TABLE_6_II) },
    { id: 'seco', label: 'Sustainer engine cutoff: in orbit', at: doc(SECO, TABLE_6_II) },
    { id: 'spacecraft-separation', label: 'Spacecraft separation: the posigrades fire', at: doc(SEPARATION, TABLE_6_II) },
    { id: 'retrosequence', label: 'Retrosequence: turned to retrofire attitude', at: doc(RETROSEQUENCE, `${R6}, p. 74`) },
    { id: 'retrofire', label: 'Retrofire: three motors, five seconds apart', at: doc(RETRO, TABLE_6_II), also: 'planned 04:32:58' },
    {
      id: 'pack-gone',
      label: '“I think the pack just let go”',
      at: estimated(PACK_GONE, `${R6}, transcript, p. 190`),
      also: 'planned jettison 04:33:58: kept on',
    },
    {
      id: 'point-05-g',
      label: '0.05 g, switched by the pilot',
      at: doc(ENTRY_G, `${TABLE_6_II}: the 0.05 g relay "actuated manually by astronaut when he was in a 'small g field'"`),
      also: 'planned 04:43:53',
    },
    { id: 'drogue-deployment', label: 'Drogue parachute', at: doc(DROGUE, TABLE_6_II), also: 'planned 04:50:00' },
    { id: 'main-deployment', label: 'Main parachute', at: doc(MAIN, TABLE_6_II), also: 'planned 04:50:36' },
    { id: 'water-impact', label: 'Landing', at: doc(LANDING, TABLE_6_II) },
  ],
  checks: [
    {
      id: 'entryG',
      label: 'Greatest load in the entry',
      value: 7.7,
      unit: 'g',
      tolerance: 0.8,
      confidence: 'documented',
      source: `${TABLE_6_I}: "Entry acceleration, g units 7.7"`,
    },
    {
      id: 'entryQ',
      label: 'Greatest dynamic pressure in the entry',
      value: 472 * PSF,
      unit: 'Pa',
      tolerance: 5_000,
      confidence: 'documented',
      source: `${TABLE_6_I}: "Entry dynamic pressure, lb/sq ft 472"`,
    },
    {
      id: 'entryAt',
      label: '0.05 g',
      value: ENTRY_G,
      unit: 's',
      tolerance: 40,
      confidence: 'documented',
      source: `${TABLE_6_II}: 04:43:31, the relay switched by hand when he was already "in a 'small g field'", so the true instant is earlier; planned 04:43:53`,
    },
    {
      id: 'ejectionAt',
      label: 'Drogue out, at 30,000 ft',
      value: DROGUE,
      unit: 's',
      tolerance: 30,
      confidence: 'documented',
      source: `${TABLE_6_II}: 04:49:17.2; the height the pilot's ("30,000", p. 191)`,
    },
    {
      id: 'alongTrack',
      label: 'Drogue out, along the track from where it was picked up',
      value: 0,
      unit: 'm',
      tolerance: 30_000,
      confidence: 'documented',
      source: `${SP45}, Table 8-III: picked up at 21°25.6′ N 68°36.5′ W; it landed some 40 miles short of the planned point, the retrofire worked without the consumables spent (${SP4201}, p. 433)`,
    },
    {
      id: 'crossTrack',
      label: 'Drogue out, to the right of where it was picked up',
      value: 0,
      unit: 'm',
      tolerance: 20_000,
      confidence: 'documented',
      source: `${SP45}, Table 8-III`,
    },
  ],
};

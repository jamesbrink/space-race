/**
 * Sigma 7 as a flight into orbit: its record (vehicles/mercury-atlas-plan.ts `MercuryAtlasRecord`), which flight.ts
 * writes its plan from (`mercuryAtlasPlan`). The record with its sources and disagreements is set out in mission.md beside
 * this file; the numbers live here, each in the source's own units and converted once.
 *
 * What MA-8's own reports give is its own (NASA TN D-4807, the postlaunch report as published; NASA SP-12, as first
 * published). What they do not give (the Atlas D's thrusts, impulses and weights, the steering programme, the drag) is
 * Friendship 7's, taken for this flight and said so: Atlas 113-D's changes from 107-D (TN D-4807, pp. 12 and 13) are its
 * injectors, igniters and hold-down, none a figure flown here.
 *
 * Times are seconds from liftoff, 07:15:11 EST (12:15:11 UTC). The checks' tolerances were written with the record,
 * before the plan was first flown, and nothing here was changed after: a miss is recorded (src/sim/misses.ts), not fitted.
 */
import { assumed, derived, doc, type Measure } from '../../../../../src/measure.ts';
import { HARDWARE } from '../../vehicles/mercury-redstone.ts';
import { MA2_NOZZLES } from '../../vehicles/mercury-atlas.ts';
import type { MercuryAtlasRecord } from '../../vehicles/mercury-atlas-plan.ts';
import { orbital as F7 } from '../ma-6-friendship-7/orbital.ts';

const FT = 0.3048;
const LB = 0.45359237;
const LBF = 4.4482216;
const NMI = 1852;
const PSF = 47.880259;

/** Seconds from liftoff of an elapsed time as the report prints it, hours, minutes and seconds. */
const T = (h: number, m: number, s: number): number => h * 3600 + m * 60 + s;

const TN = 'NASA TN D-4807, Mercury-Atlas 8 (1968)';
const SP12 = 'Results of the Third United States Manned Orbital Space Flight, NASA SP-12 (1962)';
const SP45 = 'NASA SP-45, Mercury Project Summary (1963)';
const TABLE_XXII = `${TN}, Table XXII, p. 134`;
const TABLE_XXIII = `${TN}, Table XXIII, p. 135`;
const TABLE_2I = `${SP12}, Table 2-I`;
const WEIGHTS = `${TN}, Table I, p. 14`;

/** A figure of Friendship 7's record taken for this flight: the type's or the sister vehicle's, assumed, with whose it is. */
const as6 = (m: Measure): Measure =>
  m.confidence === 'documented'
    ? assumed(m.value, `Friendship 7's, the type's: ${m.source}`)
    : { ...m, source: `as for Friendship 7: ${m.source}` };

const SPACECRAFT_AT_LAUNCH = 4324.55;
const IN_ORBIT = 3028.89;
const AT_RETROFIRE = 2994;
const NORMAL_REENTRY = 2732.5;
const UNDER_THE_MAIN = 2602.32;
const BOOSTER_SECTION = F7.atlas.booster.mass.value / LB;
const TANK_GROSS = F7.atlas.tank.mass.value / LB;
const TANK_EMPTY = F7.atlas.tank.dry.value / LB;

/** The record's instants. */
const BECO = T(0, 2, 8.6);
const STAGING = BECO + 4;
const TOWER = T(0, 2, 33);
const SECO = T(0, 5, 15.7);
const TAIL_OFF = T(0, 5, 15.9);
const SEPARATION = T(0, 5, 17.9);
const RETROSEQUENCE = T(8, 51, 30);
const RETRO = T(8, 52, 0);
const PACK_PLANNED = T(8, 51, 51.8);
const PACK_GONE = T(8, 53, 0);
const ENTRY_G = T(9, 1, 40);
const DROGUE = T(9, 6, 50);
const MAIN = T(9, 8, 12);
const LANDING = T(9, 13, 11);

/** The three motors' impulse in the report's integrated entry, which came down within a mile of the retrieval point (TN D-4807, p. 108). */
const IMPULSE = 38_975;

export const orbital: MercuryAtlasRecord = {
  liftoffMass: derived(
    (BOOSTER_SECTION + TANK_GROSS + SPACECRAFT_AT_LAUNCH) * LB,
    `the Atlas D's booster section and tank section fuelled, as for Friendship 7 (6,720 and 249,230 lb, Encyclopedia Astronautica), and the spacecraft at launch (${SPACECRAFT_AT_LAUNCH.toLocaleString('en-US')} lb, ${WEIGHTS}): ` +
      `260,275 lb. No weight for Atlas 113-D read: the Gilmore weighing system's 324,650 lb at the oxygen tank's securing (${TN}, p. 105) is more than the type's whole stack, and what it weighed with it is not said`,
  ),
  atlas: {
    booster: {
      name: 'Booster section',
      nodes: F7.atlas.booster.nodes,
      mass: as6(F7.atlas.booster.mass),
      engine: {
        name: F7.atlas.booster.engine.name,
        count: 2,
        thrust: { seaLevel: as6(F7.atlas.booster.engine.thrust.seaLevel), vacuum: as6(F7.atlas.booster.engine.thrust.vacuum) },
        isp: { seaLevel: as6(F7.atlas.booster.engine.isp.seaLevel), vacuum: as6(F7.atlas.booster.engine.isp.vacuum) },
        nozzle: MA2_NOZZLES.booster,
      },
      cutoff: doc(
        BECO,
        `${TABLE_XXII}: 00:02:08.6 (planned 00:02:10.8): "a somewhat lofted trajectory was flown prior to staging, and this maneuver resulted in a 2-second-early discrete signal at BECO; consequently SECO was about 10 seconds later than nominal" (${TN}, p. 106)`,
      ),
      separation: assumed(
        STAGING,
        'four seconds after the booster engines’ cutoff: the Atlas D’s sequence, as for Friendship 7 (Results of the First United States Manned Orbital Space Flight, Figure 4-4). MA-8’s staging is not in Table XXII',
      ),
    },
    tank: {
      name: F7.atlas.tank.name,
      nodes: F7.atlas.tank.nodes,
      mass: as6(F7.atlas.tank.mass),
      dry: as6(F7.atlas.tank.dry),
      propellant: as6(F7.atlas.tank.propellant),
      engine: {
        name: F7.atlas.tank.engine.name,
        count: 1,
        thrust: { seaLevel: as6(F7.atlas.tank.engine.thrust.seaLevel), vacuum: as6(F7.atlas.tank.engine.thrust.vacuum) },
        isp: { seaLevel: as6(F7.atlas.tank.engine.isp.seaLevel), vacuum: as6(F7.atlas.tank.engine.isp.vacuum) },
        nozzle: MA2_NOZZLES.sustainer,
      },
      velocity: doc(
        25_730 * FT,
        `${TABLE_XXIII} and ${TABLE_2I}: space-fixed velocity at cutoff 25,730 ft/s (planned 25,715): "15 ft/sec high in velocity, 49 feet high in altitude, and 0.0084° low in flight-path angle" (${TN}, p. 105)`,
      ),
      cutoff: doc(SECO, `${TABLE_XXII}: the SECO discrete 00:05:15.7; tail-off complete 00:05:15.9 (planned 00:05:05.8)`),
    },
  },
  tower: {
    mass: derived(
      (SPACECRAFT_AT_LAUNCH - IN_ORBIT) * LB,
      `the spacecraft at launch less in orbit (${WEIGHTS}): 1,295.7 lb, the tower with its two motors, and with them the posigrades' propellant and what else went before orbit`,
    ),
    separation: doc(TOWER, `${TABLE_XXII}: tower release and escape-rocket ignition 00:02:33 (planned 00:02:33.8)`),
  },
  separation: {
    at: doc(SEPARATION, `${TABLE_XXII}: 00:05:17.9 (planned 00:05:06.8)`),
    push: derived(
      (3 * 400 * 1 * LBF) / (IN_ORBIT * LB) + (3 * 400 * 1 * LBF) / (TANK_EMPTY * LB),
      `three posigrades of 400 lb for about a second (${SP45}, Table 3-III), 1,200 lb s, on the spacecraft in orbit (${IN_ORBIT} lb, ${WEIGHTS}) and the Atlas empty (5,174 lb, as for Friendship 7): ` +
        `${TABLE_XXIII} has 25,730 ft/s at cutoff and 25,751 at the posigrades' ignition`,
    ),
    mass: doc(IN_ORBIT * LB, `${WEIGHTS}: 3,028.89 lb in orbit`),
  },
  ascent: {
    guidance: {
      azimuth: as6(F7.ascent.guidance.azimuth!),
      vertical: as6(F7.ascent.guidance.vertical),
      kick: as6(F7.ascent.guidance.kick),
      turn: as6(F7.ascent.guidance.turn),
      target: {
        at: 'seco',
        altitude: doc(
          528_467 * FT,
          `${TABLE_XXIII}: 528,467 ft at cutoff (86.97 nautical miles). Taken over the oblate earth under the cutoff, as Friendship 7's is (its orbital.ts: the table's own speed then gives the table's own orbit)`,
        ),
        over: 'ellipsoid',
        climb: doc(-0.0062, `${TABLE_2I}: space-fixed flight-path angle −0.0062° at cutoff, "0.0084° low" (${TN}, p. 105)`),
        inclination: doc(32.55, `${TABLE_XXIII}: 32.55° (planned 32.52)`),
      },
    },
    drag: F7.ascent.drag.map((d, i) => ({
      ...d,
      until: i === 0 ? doc(TOWER, `${TABLE_XXII}: the tower released at 00:02:33`) : doc(SECO, 'to the end of the ascent'),
      area: as6(d.area),
      curve: { ...d.curve, source: `as for Friendship 7: ${d.curve.source}` },
    })),
    steering: { authority: as6(F7.ascent.steering.authority) },
    centre: as6(F7.ascent.centre),
    sheds: F7.ascent.sheds.map((s) =>
      s.on === 'tower-clamp'
        ? { ...s, mass: derived((SPACECRAFT_AT_LAUNCH - IN_ORBIT) * LB, 'as the plan’s tower (the spacecraft at launch less in orbit)') }
        : s.on === 'adapter-clamp'
          ? { ...s, name: 'Atlas 113-D' }
          : s,
    ),
    checks: [
      {
        id: 'cutoffAt',
        label: 'Sustainer engine cutoff',
        value: SECO,
        unit: 's',
        tolerance: 4,
        confidence: 'documented',
        source: TABLE_XXII,
      },
      {
        id: 'perigee',
        label: 'Perigee at cutoff',
        value: 86.94 * NMI,
        unit: 'm',
        tolerance: 12_000,
        confidence: 'documented',
        source: `${TABLE_2I}: 86.94 nautical miles (${TABLE_XXIII}: 100.05 statute)`,
      },
      {
        id: 'apogee',
        label: 'Apogee at cutoff',
        value: 152.8 * NMI,
        unit: 'm',
        tolerance: 25_000,
        confidence: 'documented',
        source: `${TABLE_XXIII}: 152.8 nautical miles (175.84 statute)`,
      },
      { id: 'inclination', label: 'Inclination', value: 32.55, unit: '°', tolerance: 0.25, confidence: 'documented', source: TABLE_XXIII },
      {
        id: 'maxQ',
        label: 'Greatest dynamic pressure going up',
        value: 964 * PSF,
        unit: 'Pa',
        tolerance: 7_000,
        confidence: 'documented',
        source: `${TABLE_XXIII}: "Exit dynamic pressure" 964 lb/sq ft, on the Cape's atmosphere (planned 966)`,
      },
      {
        id: 'coreG',
        label: 'Greatest load going up, at sustainer cutoff',
        value: 8.1,
        unit: 'g',
        tolerance: 0.4,
        confidence: 'documented',
        source: `${TABLE_XXIII}: "Exit acceleration, g" 8.1 (planned 7.7)`,
      },
    ],
  },
  orbit: {
    radius: assumed(
      F7.orbit.radius.value,
      'm, the equatorial radius (Fischer 1960), as Friendship 7’s: NASA TN D-4807 and SP-12 give their heights in feet and miles over nothing named, so the ball is Friendship 7’s, whose heights and period agree on it as a nodal period',
    ),
    perigee: doc(86.94 * NMI, `${TABLE_2I}: 86.94 nautical miles (${TABLE_XXIII}: 100.05 statute miles)`),
    apogee: doc(152.8 * NMI, `${TABLE_XXIII} and ${TABLE_2I}: 152.8 nautical miles (175.84 statute)`),
    inclination: doc(32.55, TABLE_XXIII),
    period: doc(88 * 60 + 55, `${TABLE_XXIII}: 88 min 55 s (planned 88:45: the "slight overspeed")`),
    kind: {
      is: 'kepler',
      confidence: 'derived',
      source:
        'the Kepler period of the mean orbit: on the equatorial radius the published heights’ mean orbit has a Kepler period 1.3 s long of the 88 min 55 s (TN D-4807 Table XXIII and SP-12 Table 2-I), an anomalistic one 3.2 s short and a nodal one 13.5 s short, ' +
        'so the Kepler is the nearest for every period within its rounding (tests/periods.test.mjs). Friendship 7’s and Aurora 7’s are nodal on the same ball; no document read says which period any of them is',
    },
  },
  injection: {
    at: doc(SECO, `${TABLE_XXII}: sustainer cutoff, 00:05:15.7. The posigrades' push 2.2 s later is left out`),
    heading: 'north',
    arc: derived(
      8.64,
      `degrees, the arc in the frame that does not turn from the pad at liftoff to the cutoff: ${TABLE_XXIII} has the cutoff at 30.5447° N 72.2157° W (453.7 nautical miles downrange), ` +
        '7.53° of arc over the ground from Complex 14, and the pad itself turned 1.32° of longitude east under it in the 316 s',
    ),
    anomaly: derived(
      359.32,
      'degrees: from the flight-path angle at cutoff, −0.0062° (SP-12, Table 2-I), on the published orbit’s eccentricity, 0.0092: tan γ = e sin ν / (1 + e cos ν), so two thirds of a degree short of perigee',
    ),
  },
  mass: doc(IN_ORBIT * LB, `${WEIGHTS}: 3,028.89 lb in orbit`),
  rarefied: {
    drag: as6(F7.rarefied.drag),
    area: {
      ...F7.rarefied.area,
      source: `as for Friendship 7, held in orbit attitude: ${F7.rarefied.area.source}. Schirra drifted for hours with the jets off (${TN}, p. 92): not in it`,
    },
    length: F7.rarefied.length,
  },
  hand: as6(F7.hand),
  retro: {
    sequence: doc(
      RETROSEQUENCE,
      `${TABLE_XXII}: retrofire-sequence initiation 08:51:30 (planned 08:50:21.8, before the flight's "slight overspeed" lengthened the period)`,
    ),
    below: doc(
      34,
      `the retrofire attitude, −34° in pitch, 0° in roll and yaw, with which the report's integrated entry came down within a mile of the retrieval point (${TN}, p. 108); held by the autopilot, "The spacecraft did not seem to vary as much as half a degree in attitude during the period of retrofire" (the pilot, p. 101)`,
    ),
    on: doc(
      RETRO,
      `${TABLE_XXII}: retrorocket No. 1 (left) 08:52:00, fired by the automatic sequence, Schirra "poised to punch off the retrofire button to back up the automatic system" (p. 101)`,
    ),
    spacing: doc(5, `${TABLE_XXII}: Nos. 2 and 3 at 08:52:05 and 08:52:10`),
    count: 3,
    thrust: F7.retro.thrust,
    burn: F7.retro.burn,
    deltaV: derived(
      (IMPULSE * LBF) / (AT_RETROFIRE * LB),
      `the three motors' "total impulse of 38 975 lb/sec" in the report's integrated entry, which came down within a mile of the retrieval point (${TN}, p. 108), over the capsule at retrofire, "estimated to be 2994 pounds" (the same page): 127.6 m/s`,
    ),
    planned: doc(PACK_PLANNED, `${TABLE_XXII}: retrorocket assembly jettison planned at 08:51:51.8`),
    gone: doc(PACK_GONE, `${TABLE_XXII}: retrorocket assembly jettison 08:53:00, a minute after the first motor, as planned`),
  },
  entry: {
    mass: doc(NORMAL_REENTRY * LB, `${WEIGHTS}: 2,732.50 lb at "normal reentry"`),
    area: HARDWARE.area,
    drag: HARDWARE.entryDrag,
  },
  heating: F7.heating,
  descent: {
    ground: doc(0, `the sea: it came down in the Pacific north-east of Midway (${TN}, Table XXIII)`),
    mass: doc(
      UNDER_THE_MAIN * LB,
      `${WEIGHTS}: 2,602.32 lb at main-parachute deployment: what the capsule weighs under its parachutes, taken from the drogue on`,
    ),
    drogue: {
      altitude: doc(
        39_400 * FT,
        `${TN}, p. 69: "The drogue parachute was deployed manually at a pressure altitude of 39 400 feet (standard conditions) with the planned altitude intended for approximately 40 000 feet"; the pilot's "at 40 000 feet" (p. 103)`,
      ),
      ...HARDWARE.drogue,
    },
    main: {
      altitude: doc(
        10_600 * FT,
        `${TN}, p. 69: "The main parachute was deployed automatically at a pressure altitude of 10 600 feet (standard day conditions)"; the pilot's "at about 10 500 feet" (p. 103)`,
      ),
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
        source: `${TABLE_XXII}: main-parachute jettison on the water, 09:13:11 (planned 09:11:33.8)`,
      },
      {
        id: 'mercury-capsule.speed',
        label: 'Falling at the sea, on the main',
        value: 30 * FT,
        unit: 'm/s',
        tolerance: 1.5,
        confidence: 'documented',
        source:
          'Results of the First United States Manned Orbital Space Flight, p. 29: "a sinking velocity of 30 feet per second at sea level", the design’s; no measured figure for MA-8 read',
      },
    ],
  },
  lands: { on: 'sea', ship: 'the capsule' },
  landing: {
    latitude: doc(
      32 + 5.5 / 60,
      `${SP45}, Table 8-III, p. 135: where the capsule was picked up, 32°05.5′ N 174°28.5′ W (the recovery ship's 32°06′ N 174°29′ W, ${TABLE_XXIII}); planned at 32°06′ N 174°33′ W`,
    ),
    longitude: doc(-(174 + 28.5 / 60), `${SP45}, Table 8-III, p. 135`),
    at: doc(LANDING, `${TABLE_XXII}: 09:13:11`),
    near: 'the Pacific, north-east of Midway',
  },
  events: [
    { id: 'liftoff', label: 'Liftoff', at: doc(0, `${TN}, p. 25: 07:15:11 a.m. e.s.t.`) },
    { id: 'beco', label: 'Booster engine cutoff', at: doc(BECO, TABLE_XXII), also: 'planned 00:02:10.8' },
    {
      id: 'staging',
      label: 'Booster section let go',
      at: assumed(STAGING, 'four seconds after the cutoff: the Atlas D’s sequence, as for Friendship 7'),
    },
    { id: 'tower-release', label: 'Escape tower released', at: doc(TOWER, TABLE_XXII) },
    { id: 'seco', label: 'Sustainer engine cutoff: in orbit', at: doc(SECO, TABLE_XXII), also: `tail-off complete ${TAIL_OFF} s` },
    { id: 'spacecraft-separation', label: 'Spacecraft separation: the posigrades fire', at: doc(SEPARATION, TABLE_XXII) },
    { id: 'retrosequence', label: 'Retrosequence: turned to retrofire attitude', at: doc(RETROSEQUENCE, TABLE_XXII) },
    { id: 'retrofire', label: 'Retrofire: three motors, five seconds apart', at: doc(RETRO, TABLE_XXII), also: 'planned 08:50:51.8' },
    { id: 'retro-assembly-jettison', label: 'Retropack jettisoned', at: doc(PACK_GONE, TABLE_XXII), also: 'planned 08:51:51.8' },
    { id: 'point-05-g', label: '0.05 g', at: doc(ENTRY_G, TABLE_XXII), also: 'planned 09:00:20.8' },
    { id: 'drogue-deployment', label: 'Drogue parachute, by hand', at: doc(DROGUE, TABLE_XXII), also: 'planned 09:05:36.8' },
    { id: 'main-deployment', label: 'Main parachute', at: doc(MAIN, TABLE_XXII), also: 'planned 09:07:02.8' },
    { id: 'water-impact', label: 'Landing', at: doc(LANDING, TABLE_XXII) },
  ],
  checks: [
    {
      id: 'entryG',
      label: 'Greatest load in the entry',
      value: 7.6,
      unit: 'g',
      tolerance: 0.8,
      confidence: 'documented',
      source: `${TABLE_XXIII}: "Reentry deceleration, g" 7.6 (planned 7.6)`,
    },
    {
      id: 'entryQ',
      label: 'Greatest dynamic pressure in the entry',
      value: 458 * PSF,
      unit: 'Pa',
      tolerance: 5_000,
      confidence: 'documented',
      source: `${TABLE_XXIII}: "Reentry dynamic pressure" 458 lb/sq ft (planned 456)`,
    },
    {
      id: 'entryAt',
      label: '0.05 g',
      value: ENTRY_G,
      unit: 's',
      tolerance: 40,
      confidence: 'documented',
      source: `${TABLE_XXII}: the 0.05 g relay at 09:01:40 (planned 09:00:20.8; 7 s from the postflight calculation on the insertion as flown)`,
    },
    {
      id: 'ejectionAt',
      label: 'Drogue out, by hand at 39,400 ft',
      value: DROGUE,
      unit: 's',
      tolerance: 30,
      confidence: 'documented',
      source: `${TABLE_XXII}: 09:06:50; the height ${TN}, p. 69`,
    },
    {
      id: 'alongTrack',
      label: 'Drogue out, along the track from where it was picked up',
      value: 0,
      unit: 'm',
      tolerance: 30_000,
      confidence: 'documented',
      source: `${SP45}, Table 8-III: picked up at 32°05.5′ N 174°28.5′ W, some 4 nautical miles from the planned point`,
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

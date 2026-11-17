/**
 * Aurora 7 as a flight into orbit: its record (vehicles/mercury-atlas-plan.ts `MercuryAtlasRecord`), which flight.ts
 * writes its plan from (`mercuryAtlasPlan`). The record with its sources and disagreements is set out in mission.md beside
 * this file; the numbers live here, each in the source's own units and converted once.
 *
 * What MA-7's own reports give is its own (NASA TN D-3814, the postlaunch report as published; NASA SP-6, as first
 * published). What they do not give (the Atlas D's thrusts, impulses and weights, the steering programme, the drag) is
 * Friendship 7's, taken for this flight and said so: Atlas 107-D "did not differ in any major respect" from 109-D
 * (TN D-3814, p. 7).
 *
 * Times are seconds from liftoff, 07:45:16 EST (12:45:16 UTC). The checks' tolerances were written with the record,
 * before the plan was first flown, and nothing here was changed after: a miss is recorded (src/sim/misses.ts), not fitted.
 */
import { assumed, derived, doc, type Measure } from '../../../../../src/measure.ts';
import { HARDWARE } from '../../vehicles/mercury-redstone.ts';
import type { MercuryAtlasRecord } from '../../vehicles/mercury-atlas-plan.ts';
import { orbital as F7 } from '../ma-6-friendship-7/orbital.ts';

const FT = 0.3048;
const LB = 0.45359237;
const LBF = 4.4482216;
const NMI = 1852;
const PSF = 47.880259;

/** Seconds from liftoff of an elapsed time as the report prints it, hours, minutes and seconds. */
const T = (h: number, m: number, s: number): number => h * 3600 + m * 60 + s;

const TN = 'NASA TN D-3814, Mercury-Atlas 7 (1967)';
const SP6 = 'Results of the Second United States Manned Orbital Space Flight, NASA SP-6 (1962)';
const SP45 = 'NASA SP-45, Mercury Project Summary (1963)';
const SP4201 = 'This New Ocean (NASA SP-4201, 1966)';
const TABLE_XVI = `${TN}, Table XVI, p. 122`;
const TABLE_XVII = `${TN}, Table XVII, pp. 123 and 124`;
const WEIGHTS = `${TN}, p. 7`;

/** A figure of Friendship 7's record taken for this flight: the type's or the sister vehicle's, assumed, with whose it is. */
const as6 = (m: Measure): Measure =>
  m.confidence === 'documented'
    ? assumed(m.value, `Friendship 7's, the type's: ${m.source}`)
    : { ...m, source: `as for Friendship 7: ${m.source}` };

const SPACECRAFT_AT_LAUNCH = 4244.09;
const IN_ORBIT = 2974.56;
const NORMAL_REENTRY = 2663.36;
const UNDER_THE_MAIN = 2557.7;
const BOOSTER_SECTION = F7.atlas.booster.mass.value / LB;
const TANK_GROSS = F7.atlas.tank.mass.value / LB;
const TANK_EMPTY = F7.atlas.tank.dry.value / LB;

/** The record's instants. */
const BECO = T(0, 2, 8.6);
const STAGING = BECO + 4;
const TOWER = T(0, 2, 32.2);
const SECO = T(0, 5, 9.9);
const TAIL_OFF = T(0, 5, 10.2);
const SEPARATION = T(0, 5, 12.2);
const RETROSEQUENCE = T(4, 32, 36.5);
const RETRO = T(4, 33, 10.3);
const PACK_PLANNED = T(4, 33, 55.6);
const PACK_GONE = T(4, 34, 10.8);
const ENTRY_G = T(4, 44, 44);
const DROGUE = T(4, 50, 54);
const MAIN = T(4, 51, 48.2);
const LANDING = T(4, 55, 57);

/** The three motors' impulse as the tracking gave it: 3 per cent under the group's nominal 38,943 lb s (TN D-3814, p. 101). */
const IMPULSE = 0.97 * 38_943;

export const orbital: MercuryAtlasRecord = {
  liftoffMass: derived(
    (BOOSTER_SECTION + TANK_GROSS + SPACECRAFT_AT_LAUNCH) * LB,
    `the Atlas D's booster section and tank section fuelled, as for Friendship 7 (6,720 and 249,230 lb, Encyclopedia Astronautica), and the spacecraft at launch (${SPACECRAFT_AT_LAUNCH.toLocaleString('en-US')} lb, ${WEIGHTS}): ` +
      '260,194 lb. No weight for Atlas 107-D has been read',
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
      },
      cutoff: doc(
        BECO,
        `${TABLE_XVI}: 00:02:08.6 (planned 00:02:10.1). 107-D's staging time was "reduced from 131.3 to 130.1 seconds after lift-off, and backup staging time was altered from 136 to 132.2 seconds" (${WEIGHTS})`,
      ),
      separation: assumed(
        STAGING,
        'four seconds after the booster engines’ cutoff: the Atlas D’s sequence, as for Friendship 7 (Results of the First United States Manned Orbital Space Flight, Figure 4-4). MA-7’s staging is not in Table XVI',
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
      },
      velocity: doc(
        25_717 * FT,
        `${TABLE_XVII}: space-fixed velocity at cutoff "including tail-off", 25,717 ft/s (planned 25,715); the guidance system's own "about 2 ft/sec high" (p. 99)`,
      ),
      cutoff: doc(SECO, `${TABLE_XVI}: the SECO discrete 00:05:09.9; tail-off complete 00:05:10.2 (planned 00:05:05.3)`),
    },
  },
  tower: {
    mass: derived(
      (SPACECRAFT_AT_LAUNCH - IN_ORBIT) * LB,
      `the spacecraft at launch less in orbit (${WEIGHTS}): 1,269.5 lb, the tower with its two motors, and with them the posigrades' propellant and what else went before orbit`,
    ),
    separation: doc(TOWER, `${TABLE_XVI}: tower release and escape-rocket ignition 00:02:32.2, as planned`),
  },
  separation: {
    at: doc(SEPARATION, `${TABLE_XVI}: 00:05:12.2 (planned 00:05:06.3)`),
    push: derived(
      (3 * 400 * 1 * LBF) / (IN_ORBIT * LB) + (3 * 400 * 1 * LBF) / (TANK_EMPTY * LB),
      `three posigrades of 400 lb for about a second (${SP45}, Table 3-III), 1,200 lb s, on the spacecraft in orbit (${IN_ORBIT} lb, ${WEIGHTS}) and the Atlas empty (5,174 lb, as for Friendship 7): ` +
        `${TABLE_XVII} has the space-fixed speed 25,717 ft/s at cutoff and 25,738 at "post-posigrade ignition", which is the Atlas's last push with it`,
    ),
    mass: doc(IN_ORBIT * LB, `${WEIGHTS}: 2,974.56 lb in orbit`),
  },
  ascent: {
    guidance: {
      azimuth: as6(F7.ascent.guidance.azimuth!),
      vertical: as6(F7.ascent.guidance.vertical),
      kick: as6(F7.ascent.guidance.kick),
      turn: as6(F7.ascent.guidance.turn),
      target: {
        at: 'seco',
        altitude: doc(527_859 * FT, `${TABLE_XVII}: 527,859 ft at cutoff (86.87 nautical miles, the perigee's)`),
        climb: doc(-0.0004, `${TABLE_XVII}: space-fixed flight-path angle −0.0004° at cutoff (planned −0.0006)`),
        inclination: doc(32.55, `${TABLE_XVII}: 32.55° (planned 32.52)`),
      },
    },
    drag: F7.ascent.drag.map((d, i) => ({
      ...d,
      until: i === 0 ? doc(TOWER, `${TABLE_XVI}: the tower released at 00:02:32.2`) : doc(SECO, 'to the end of the ascent'),
      area: as6(d.area),
      curve: { ...d.curve, source: `as for Friendship 7: ${d.curve.source}` },
    })),
    steering: { authority: as6(F7.ascent.steering.authority) },
    centre: as6(F7.ascent.centre),
    sheds: F7.ascent.sheds.map((s) =>
      s.on === 'tower-clamp'
        ? { ...s, mass: derived((SPACECRAFT_AT_LAUNCH - IN_ORBIT) * LB, 'as the plan’s tower (the spacecraft at launch less in orbit)') }
        : s.on === 'adapter-clamp'
          ? { ...s, name: 'Atlas 107-D' }
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
        source: TABLE_XVI,
      },
      {
        id: 'perigee',
        label: 'Perigee at cutoff',
        value: 86.87 * NMI,
        unit: 'm',
        tolerance: 12_000,
        confidence: 'documented',
        source: `${TABLE_XVII}: 86.87 nautical miles`,
      },
      {
        id: 'apogee',
        label: 'Apogee at cutoff',
        value: 144.96 * NMI,
        unit: 'm',
        tolerance: 25_000,
        confidence: 'documented',
        source: `${TABLE_XVII}: 144.96 nautical miles`,
      },
      { id: 'inclination', label: 'Inclination', value: 32.55, unit: '°', tolerance: 0.25, confidence: 'documented', source: TABLE_XVII },
      {
        id: 'maxQ',
        label: 'Greatest dynamic pressure going up',
        value: 967 * PSF,
        unit: 'Pa',
        tolerance: 7_000,
        confidence: 'documented',
        source: `${TABLE_XVII}: "Exit dynamic pressure" 967 lb/sq ft, on the Cape's atmosphere of the day (planned 966; 878 on the 1959 ARDC model)`,
      },
      {
        id: 'coreG',
        label: 'Greatest load going up, at sustainer cutoff',
        value: 7.8,
        unit: 'g',
        tolerance: 0.4,
        confidence: 'documented',
        source: `${TABLE_XVII}: "Exit acceleration, g" 7.8 (planned 7.7)`,
      },
    ],
  },
  orbit: {
    radius: assumed(
      F7.orbit.radius.value,
      'm, the equatorial radius (Fischer 1960), as Friendship 7’s: NASA TN D-3814 and SP-6 give their heights in feet and nautical miles over nothing named, so the ball is Friendship 7’s, whose heights and period agree on it as a nodal period',
    ),
    perigee: doc(86.87 * NMI, `${TABLE_XVII}: 86.87 nautical miles (99.97 statute)`),
    apogee: doc(144.96 * NMI, `${TABLE_XVII}: 144.96 nautical miles (166.82 statute)`),
    inclination: doc(32.55, TABLE_XVII),
    period: doc(88 * 60 + 32, `${TABLE_XVII}: 88 min 32 s`),
    kind: {
      is: 'nodal',
      confidence: 'derived',
      source:
        'node to node: on the equatorial radius the published heights’ mean orbit has a nodal period 0.6 s long of the 88 min 32 s, an anomalistic one 10.9 s long and a Kepler one 15.5 s long, ' +
        'so the nodal is the nearest for every period within its rounding (tests/periods.test.mjs). No document read says which period it is',
    },
  },
  injection: {
    at: doc(SECO, `${TABLE_XVI}: sustainer cutoff, 00:05:09.9. The posigrades' push 2.3 s later is left out`),
    heading: 'north',
    arc: derived(
      8.45,
      `degrees, the arc in the frame that does not turn from the pad at liftoff to the cutoff: ${TABLE_XVII} has the cutoff at 30.5035° N 72.4111° W (443.3 nautical miles downrange), ` +
        '7.36° of arc over the ground from Complex 14, and the pad itself turned 1.30° of longitude east under it in the 310 s',
    ),
    anomaly: derived(
      359.95,
      'degrees: from the flight-path angle at cutoff, −0.0004° (Table XVII), on the published orbit’s eccentricity, 0.0082: tan γ = e sin ν / (1 + e cos ν), so a twentieth of a degree short of perigee',
    ),
  },
  mass: doc(IN_ORBIT * LB, `${WEIGHTS}: 2,974.56 lb in orbit`),
  rarefied: { drag: as6(F7.rarefied.drag), area: as6(F7.rarefied.area), length: F7.rarefied.length },
  hand: as6(F7.hand),
  retro: {
    sequence: doc(RETROSEQUENCE, `${TABLE_XVI}: retrofire sequence initiation 04:32:36.5 (planned 04:32:25.6)`),
    below: derived(
      36.5,
      `the pitch the tracking gave: "Results of the comparison of the preretrofire and postretrofire vectors yielded spacecraft attitudes of 36.5° ± 0.5° in pitch and 27° ± 0.5° in yaw" (${TN}, p. 101), ` +
        'where the attitude was to be 34°: the attitudes the instruments measured "are clearly erroneous" (the same page). One attitude held through the burn, where Carpenter brought the yaw down as it burned (p. 87, Figure 18)',
    ),
    yaw: derived(
      27,
      `27° ± 0.5° (${TN}, p. 101), "canted at retrofire about 25 degrees to the right" (${SP4201}, p. 454): the capsule's small end to the pilot's right, and he sat facing back along the track, heads up, so the push it gave is turned to the left of the motion, north of the track. ` +
        `The landing came down "15 nautical miles north of the nominal ground track" (${TN}, p. 101). Alone, the yaw would have put it 175 miles long (${SP4201}, p. 454)`,
    ),
    on: doc(
      RETRO,
      `${TABLE_XVI}: retrorocket No. 1 (left) 04:33:10.3 (planned 04:32:55.6), fired by the pilot's own button, "approximately 3 seconds late" against the automatic signal (p. 87). ${SP6} (p. 21): "approximately 04:33:09"`,
    ),
    spacing: doc(5, `${TABLE_XVI}: Nos. 2 and 3 at 04:33:15.3 and 04:33:20.3`),
    count: 3,
    thrust: F7.retro.thrust,
    burn: F7.retro.burn,
    deltaV: derived(
      (IMPULSE * LBF) / (IN_ORBIT * LB),
      `the three motors' impulse "3 ± 0.5 percent lower than the nominal value of 38 943 lb/sec expected for this particular group of rocket motors" (${TN}, p. 101), 37,775 lb s, over the capsule in orbit, 2,974.56 lb (${WEIGHTS}): 124.5 m/s. ` +
        'No weight at retrofire is printed (the analysis used "a calculated spacecraft pre-retrograde weight"); what Carpenter had spent of his control fuel by then would add a per cent or so',
    ),
    planned: doc(PACK_PLANNED, `${TABLE_XVI}: retro assembly jettison planned at 04:33:55.6`),
    gone: doc(PACK_GONE, `${TABLE_XVI}: retro assembly jettison 04:34:10.8, "at near nominal times" (p. 2)`),
  },
  entry: {
    mass: doc(NORMAL_REENTRY * LB, `${WEIGHTS}: 2,663.36 lb at "normal reentry"`),
    area: HARDWARE.area,
    drag: HARDWARE.entryDrag,
  },
  heating: F7.heating,
  descent: {
    ground: doc(0, `the sea: it came down in the Atlantic north-east of Puerto Rico (${TN}, Table XX, p. 128)`),
    mass: doc(
      UNDER_THE_MAIN * LB,
      `${WEIGHTS}: 2,557.70 lb "at main parachute deployment": what the capsule weighs under its parachutes, taken from the drogue on`,
    ),
    drogue: {
      altitude: doc(
        25_450 * FT,
        `${TN}, p. 67: "The astronaut manually deployed the drogue parachute at 25 450 feet when the spacecraft oscillations began to build up"; planned by hand at about 21,000 ft`,
      ),
      ...HARDWARE.drogue,
    },
    main: {
      altitude: doc(
        8_950 * FT,
        `${TN}, p. 67: "he manually deployed the main parachute at 8 950 feet, since automatic deployment did not occur at 10 600 feet as planned" (the added barostat read the cabin's pressure, which lagged)`,
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
        source: `${TABLE_XVI}: 04:55:57, by the accelerometer (planned 04:55:22.6)`,
      },
      {
        id: 'mercury-capsule.speed',
        label: 'Falling at the sea, on the main',
        value: 30 * FT,
        unit: 'm/s',
        tolerance: 1.5,
        confidence: 'documented',
        source: `the pilot's report (${TN}, p. 95): "rate of descent was right on 30 feet per second"`,
      },
    ],
  },
  landing: {
    latitude: doc(
      19 + 30 / 60,
      `${SP45}, Table 8-III, p. 135: where the capsule was picked up, 19°30′ N 64°15′ W (the recovery ship's, ${TN}, Table XX); landed by the integrated trajectory at 19°27′ N 63°59′ W (Table XVII), and planned at 21°07′ N 68°00′ W`,
    ),
    longitude: doc(-(64 + 15 / 60), `${SP45}, Table 8-III, p. 135`),
    at: doc(LANDING, `${TABLE_XVI}: 04:55:57`),
    near: 'the Atlantic, north-east of Puerto Rico',
  },
  events: [
    { id: 'liftoff', label: 'Liftoff', at: doc(0, `${TN}, p. 3: 07:45:16.57 a.m. e.s.t.`) },
    { id: 'beco', label: 'Booster engine cutoff', at: doc(BECO, TABLE_XVI), also: 'planned 00:02:10.1' },
    {
      id: 'staging',
      label: 'Booster section let go',
      at: assumed(STAGING, 'four seconds after the cutoff: the Atlas D’s sequence, as for Friendship 7'),
    },
    { id: 'tower-release', label: 'Escape tower released', at: doc(TOWER, TABLE_XVI) },
    { id: 'seco', label: 'Sustainer engine cutoff: in orbit', at: doc(SECO, TABLE_XVI), also: `tail-off complete ${TAIL_OFF} s` },
    { id: 'spacecraft-separation', label: 'Spacecraft separation: the posigrades fire', at: doc(SEPARATION, TABLE_XVI) },
    { id: 'retrosequence', label: 'Retrosequence: turned to retrofire attitude', at: doc(RETROSEQUENCE, TABLE_XVI) },
    {
      id: 'retrofire',
      label: 'Retrofire by hand: three motors, five seconds apart, 27° off in yaw',
      at: doc(RETRO, TABLE_XVI),
      also: 'planned 04:32:55.6',
    },
    { id: 'retro-assembly-jettison', label: 'Retropack jettisoned', at: doc(PACK_GONE, TABLE_XVI), also: 'planned 04:33:55.6' },
    { id: 'point-05-g', label: '0.05 g', at: doc(ENTRY_G, TABLE_XVI), also: 'planned 04:43:55.6' },
    { id: 'drogue-deployment', label: 'Drogue parachute, by hand', at: doc(DROGUE, TABLE_XVI), also: 'planned 04:50:00.6' },
    { id: 'main-deployment', label: 'Main parachute, by hand', at: doc(MAIN, TABLE_XVI), also: 'planned 04:50:37.6' },
    { id: 'water-impact', label: 'Landing', at: doc(LANDING, TABLE_XVI) },
  ],
  checks: [
    {
      id: 'entryG',
      label: 'Greatest load in the entry',
      value: 7.5,
      unit: 'g',
      tolerance: 0.8,
      confidence: 'documented',
      source: `${TABLE_XVII}: "Entry acceleration, g" 7.5 (planned 7.6)`,
    },
    {
      id: 'entryQ',
      label: 'Greatest dynamic pressure in the entry',
      value: 429 * PSF,
      unit: 'Pa',
      tolerance: 5_000,
      confidence: 'documented',
      source: `${TABLE_XVII}: "Entry dynamic pressure" 429 lb/sq ft (planned 450)`,
    },
    {
      id: 'entryAt',
      label: '0.05 g',
      value: ENTRY_G,
      unit: 's',
      tolerance: 40,
      confidence: 'documented',
      source: `${TABLE_XVI}: the 0.05 g relay at 04:44:44 (planned 04:43:55.6; 1.0 s from the postflight calculation on the insertion as flown)`,
    },
    {
      id: 'ejectionAt',
      label: 'Drogue out, by hand at 25,450 ft',
      value: DROGUE,
      unit: 's',
      tolerance: 30,
      confidence: 'documented',
      source: `${TABLE_XVI}: 04:50:54; the height ${TN}, p. 67`,
    },
    {
      id: 'alongTrack',
      label: 'Drogue out, along the track from where it was picked up',
      value: 0,
      unit: 'm',
      tolerance: 30_000,
      confidence: 'documented',
      source: `${SP45}, Table 8-III: picked up at 19°30′ N 64°15′ W, "approximately 250 nautical miles downrange of the nominal impact point" (${TN}, p. 101): the yaw, the late firing and the low impulse`,
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

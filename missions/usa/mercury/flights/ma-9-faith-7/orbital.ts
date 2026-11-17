/**
 * Faith 7 as a flight into orbit: its record (vehicles/mercury-atlas-plan.ts `MercuryAtlasRecord`), which flight.ts
 * writes its plan from (`mercuryAtlasPlan`). The record with its sources and disagreements is set out in mission.md beside
 * this file; the numbers live here, each in the source's own units and converted once.
 *
 * MA-9's own report is a part of NASA SP-45 (the programme's summary): the powered flight's instants (pp. 102 and 103),
 * the orbit (p. 13), the retrofire's time (p. 151), the pick-up point (Table 8-III), the duration (Table 3-I), the pilot's
 * report (pp. 349 to 358) and the air-ground transcript (pp. 385 to 441). It has no table of events planned and flown,
 * no weights and no loads: those are Sigma 7's or Friendship 7's, taken for this flight and said so, or the press kit's
 * plan where it gives one.
 *
 * Times are seconds from liftoff, 08:04:13 EST (13:04:13 UTC), by the ground's clock (g.e.t.). The transcript's are the
 * capsule's (c.e.t.), which ran fast: by 16 s at the fifteenth orbit (This New Ocean, p. 499) and 23 s at retrofire,
 * where the ground's 33:59:30 was Cooper's "fire" at 33:59:53. The checks' tolerances were written with the record,
 * before the plan was first flown, and nothing here was changed after: a miss is recorded (src/sim/misses.ts), not fitted.
 */
import { assumed, derived, doc, type Measure } from '../../../../../src/measure.ts';
import { HARDWARE } from '../../vehicles/mercury-redstone.ts';
import type { MercuryAtlasRecord } from '../../vehicles/mercury-atlas-plan.ts';
import { orbital as F7 } from '../ma-6-friendship-7/orbital.ts';

const IN = 0.0254;
const FT = 0.3048;
const LB = 0.45359237;
const LBF = 4.4482216;
const NMI = 1852;

/** Seconds from liftoff of an elapsed time as the report prints it, hours, minutes and seconds. */
const T = (h: number, m: number, s: number): number => h * 3600 + m * 60 + s;

const SP45 = 'NASA SP-45, Mercury Project Summary Including Results of the Fourth Manned Orbital Flight (1963)';
const LV = `${SP45}, pp. 102 and 103`;
const TRANSCRIPT = `${SP45}, the air-ground transcript`;
const PILOT = `${SP45}, the pilot's report`;
const KIT = 'the MA-9 press kit, NASA release 63-90 (1963)';
const SP4201 = 'This New Ocean (NASA SP-4201, 1966)';
const TN4807 = 'NASA TN D-4807, Mercury-Atlas 8 (1968)';

/** A figure of an earlier flight's record taken for this one: the type's or the sister spacecraft's, assumed, with whose it is. */
const as = (who: string, m: Measure): Measure =>
  m.confidence === 'documented' ? assumed(m.value, `${who}'s: ${m.source}`) : { ...m, source: `as for ${who}: ${m.source}` };
const as6 = (m: Measure) => as('Friendship 7', m);

/** The capsule's clock ahead of the ground's at retrofire, s: the ground's 33:59:30 was the transcript's "fire" at 33:59:53. */
const FAST = 23;
/** A transcript time (c.e.t.) on the ground's clock. */
const CET = (h: number, m: number, s: number): number => T(h, m, s) - FAST;

const BOOSTER_SECTION = F7.atlas.booster.mass.value / LB;
const TANK_GROSS = F7.atlas.tank.mass.value / LB;
const TANK_EMPTY = F7.atlas.tank.dry.value / LB;
/** Sigma 7's weights (TN D-4807, Table I), lb: no weights for spacecraft 20 have been read. */
const AT_LAUNCH = 4324.55;
const IN_ORBIT = 3028.89;
const AT_RETROFIRE = 2994;
const NORMAL_REENTRY = 2732.5;
const UNDER_THE_MAIN = 2602.32;
const WEIGHED = `Sigma 7's, ${TN4807}, Table I: no weight of spacecraft 20's has been read. ${KIT} has "about 4,000 pounds" at launch, "about 3,000" in orbit and "approximately 2,400" afloat, and SP-45's Table 3-II lists twenty changes from No. 16, some with their weights (the periscope 76 lb off, 10 lb of fuel and 13.5 of water on)`;

/** The record's instants. */
const BECO = 132.5;
const STAGING = 135.4;
const TOWER = 154;
const SECO = 303.03;
const SEPARATION = CET(0, 5, 4) + FAST;
const RETRO = T(33, 59, 30);
const RETROSEQUENCE = RETRO - 30;
const PACK_PLANNED = RETRO + 60;
const PACK_GONE = CET(34, 1, 9);
const ENTRY_G = T(34, 9, 19);
const DROGUE = CET(34, 14, 31);
const MAIN = CET(34, 16, 3);
const LANDING = T(34, 19, 49);

/** The capsule turning every way in its drifting flight: a quarter of its surface, in square inches (Cauchy: a convex body's mean shadow). */
const SURFACE =
  (Math.PI * 74.5 ** 2) / 4 +
  Math.PI * ((74.5 + 32) / 4) * Math.hypot(58.4, (74.5 - 32) / 2) +
  Math.PI * 32 * 22.8 +
  (Math.PI * 32 ** 2) / 4;

export const orbital: MercuryAtlasRecord = {
  liftoffMass: derived(
    (BOOSTER_SECTION + TANK_GROSS + AT_LAUNCH) * LB,
    `the Atlas D's booster section and tank section fuelled, as for Friendship 7 (6,720 and 249,230 lb, Encyclopedia Astronautica), and the spacecraft at launch, Sigma 7's ${AT_LAUNCH.toLocaleString('en-US')} lb (TN D-4807, Table I): 260,275 lb. No weight for Atlas 130-D read`,
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
      cutoff: doc(BECO, `${LV}: "Booster engine cut-off (BECO) was accomplished at 132.5 seconds"`),
      separation: doc(STAGING, `${LV}: "with booster section staging at 135.4 seconds"`),
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
        17_547 * (5280 / 3600) * FT,
        `"In full horizontal flight over Bermuda at 17,547 miles per hour" (${SP4201}, p. 494): 25,736 ft/s, the space-fixed speed at the cutoff the guidance asked for. ` +
          `The burnout was "within a few feet per second high in velocity, 500 feet low in altitude, and 0.005° low in flight path angle" of the plan (${LV}); the plan's "approximately 17,500 miles per hour (25,700 feet per second)" (${KIT}, "Events during powered flight")`,
      ),
      cutoff: doc(SECO, `${LV}: "SECO occurred at 303.03 seconds, approximately 1 second earlier than planned"`),
    },
  },
  tower: {
    mass: derived((AT_LAUNCH - IN_ORBIT) * LB, `the spacecraft at launch less in orbit, Sigma 7's (TN D-4807, Table I): 1,295.7 lb`),
    separation: assumed(
      TOWER,
      `${KIT}, "Events during powered flight": tower jettison planned at 154 s, "about 20 seconds after staging"; the flight's own instant not read`,
    ),
  },
  separation: {
    at: derived(
      SEPARATION,
      `the pilot's "I have SECO, sep cap" at 00:05:04 by the capsule's clock (${TRANSCRIPT}, p. 385), which then was the ground's`,
    ),
    push: derived(
      (3 * 400 * 1 * LBF) / (IN_ORBIT * LB) + (3 * 400 * 1 * LBF) / (TANK_EMPTY * LB),
      `three posigrades of 400 lb for about a second (${SP45}, Table 3-III), 1,200 lb s, on the spacecraft in orbit (Sigma 7's ${IN_ORBIT} lb) and the Atlas empty (5,174 lb, as for Friendship 7); the plan's "about 24 feet per second" (${KIT}, "Events during powered flight")`,
    ),
    mass: assumed(IN_ORBIT * LB, `${IN_ORBIT} lb in orbit, ${WEIGHED}`),
  },
  ascent: {
    guidance: {
      azimuth: as6(F7.ascent.guidance.azimuth!),
      vertical: doc(15, `${LV}: "The roll program was completed at 15 seconds, and the booster pitch program was enabled"`),
      kick: as6(F7.ascent.guidance.kick),
      turn: doc(
        159,
        `${LV}: "The sustainer-stage pitch program was initiated at staging plus 5 seconds and was completed at 159 seconds after lift-off. Entrance into the guidance steering mode was relatively smooth"`,
      ),
      target: {
        at: 'seco',
        altitude: derived(
          527_900 * FT,
          `the plan's 528,400 ft at cutoff (${KIT}, "Events during powered flight") less the "500 feet low in altitude" of the burnout (${LV})`,
        ),
        climb: derived(
          -0.005,
          `the plan's level flight at cutoff ("an Earth-referenced horizontal flight path", ${KIT}, "Events during powered flight") and the burnout "0.005° low in flight path angle" (${LV})`,
        ),
        inclination: assumed(
          32.55,
          'Sigma 7’s and Aurora 7’s as flown (TN D-4807, Table XXIII; TN D-3814, Table XVII): no inclination for MA-9 as flown has been read; the plan’s “32½ degrees” (the press kit, p. 7)',
        ),
      },
    },
    drag: F7.ascent.drag.map((d, i) => ({
      ...d,
      until: i === 0 ? assumed(TOWER, `${KIT}: tower jettison planned at 154 s`) : doc(SECO, 'to the end of the ascent'),
      area: as6(d.area),
      curve: { ...d.curve, source: `as for Friendship 7: ${d.curve.source}` },
    })),
    steering: { authority: as6(F7.ascent.steering.authority) },
    centre: as6(F7.ascent.centre),
    sheds: F7.ascent.sheds.map((s) =>
      s.on === 'tower-clamp'
        ? { ...s, mass: derived((AT_LAUNCH - IN_ORBIT) * LB, 'as the plan’s tower (Sigma 7’s spacecraft at launch less in orbit)') }
        : s.on === 'adapter-clamp'
          ? { ...s, name: 'Atlas 130-D' }
          : s,
    ),
    checks: [
      { id: 'cutoffAt', label: 'Sustainer engine cutoff', value: SECO, unit: 's', tolerance: 4, confidence: 'documented', source: LV },
      {
        id: 'perigee',
        label: 'Perigee at cutoff',
        value: 87.2 * NMI,
        unit: 'm',
        tolerance: 12_000,
        confidence: 'documented',
        source: `${SP45}, p. 13: "perigee, 87.2 nautical miles"`,
      },
      {
        id: 'apogee',
        label: 'Apogee at cutoff',
        value: 144.2 * NMI,
        unit: 'm',
        tolerance: 25_000,
        confidence: 'documented',
        source: `${SP45}, p. 13: "apogee, 144.2 nautical miles"; the Cape's "Your apogee is 144.6" at 00:15:45 (${TRANSCRIPT}, p. 386)`,
      },
      {
        id: 'inclination',
        label: 'Inclination',
        value: 32.55,
        unit: '°',
        tolerance: 0.25,
        confidence: 'assumed',
        source: 'Sigma 7’s and Aurora 7’s as flown: MA-9’s not read',
      },
    ],
  },
  orbit: {
    radius: assumed(
      F7.orbit.radius.value,
      'm, the equatorial radius (Fischer 1960), as Friendship 7’s: NASA SP-45 gives its heights in nautical miles over nothing named, so the ball is Friendship 7’s, whose heights and period agree on it as a nodal period',
    ),
    perigee: doc(87.2 * NMI, `${SP45}, p. 13: "perigee, 87.2 nautical miles"`),
    apogee: doc(144.2 * NMI, `${SP45}, p. 13: "apogee, 144.2 nautical miles"`),
    inclination: assumed(
      32.55,
      'Sigma 7’s and Aurora 7’s as flown (TN D-4807, Table XXIII; TN D-3814, Table XVII); MA-9’s own not read, the plan’s “32½ degrees” (the press kit, p. 7)',
    ),
    period: doc(88 * 60 + 45, `${SP4201}, Appendix: "22.5/88:45" for MA-9's revolutions and period`),
    kind: {
      is: 'kepler',
      confidence: 'estimated',
      source:
        'the published period is read as the two-body period of the published heights over the equatorial radius: on that ball the 88 min 45 s (This New Ocean, p. 496) is their Kepler period to two seconds ' +
        '(5,327.0 s), where as a nodal period, the convention (world/meanelements.ts), the heights would give 5,312.1 s, 13 to 15 s short. Friendship 7’s and Aurora 7’s periods agree with their heights as nodal periods to a second; ' +
        'no document read says which period any of them is. Read as nodal, the coast comes back round so much later each revolution',
    },
  },
  injection: {
    at: doc(SECO, `${LV}: sustainer cutoff, 303.03 s. The posigrades' push a second later is left out`),
    heading: 'north',
    arc: assumed(
      8.45,
      'degrees, Aurora 7’s, worked from its cutoff’s place (TN D-3814, Table XVII): no place for MA-9’s cutoff has been read; it came 7 s sooner than Aurora 7’s and “very close to” the plan (SP-45, p. 103), which the press kit puts 437 miles downrange',
    ),
    anomaly: derived(
      359.46,
      'degrees: from the flight-path angle at cutoff, −0.005° (derived), on the published orbit’s eccentricity, 0.0077: tan γ = e sin ν / (1 + e cos ν), so half a degree short of perigee',
    ),
  },
  mass: assumed(IN_ORBIT * LB, `${IN_ORBIT} lb in orbit, ${WEIGHED}`),
  rarefied: {
    drag: as6(F7.rarefied.drag),
    area: derived(
      SURFACE * IN * IN * 0.25,
      'm²: the capsule turning every way, as it drifted for most of the 34 hours with its attitude control off: a quarter of its surface (Cauchy, for a convex body: its shadow averaged over every way it can turn), ' +
        'the 74.5 in shield, the 20° cone from 74.5 to 32 in over 58.4 in, the 32 by 22.8 in recovery compartment and its top: 2.88 m². The antenna canister and the pack are left out',
    ),
    length: F7.rarefied.length,
  },
  hand: as6(F7.hand),
  retro: {
    sequence: derived(
      RETROSEQUENCE,
      'thirty seconds before retrofire, as every Mercury retrosequence was: Cooper had turned it to retrofire attitude on the night side, by hand',
    ),
    below: doc(
      34,
      `"keeping his pitch down 34 degrees by his window reticle" (${SP4201}, p. 500), the retroattitude, held by hand with the manual proportional control: "I held it relatively close, John, but I couldn't guess" (${TRANSCRIPT}, p. 440)`,
    ),
    on: doc(
      RETRO,
      `${SP45}, p. 151: "The retrofire time recommended by the Goddard computers was 33:59:30 ground-elapsed time (g.e.t.), and retrofire was manually initiated at this time": Cooper's button on Glenn's count ("fire" at 33:59:53 by the capsule's clock, ${TRANSCRIPT}, p. 440), "right on the money on time"`,
    ),
    spacing: F7.retro.spacing,
    count: 3,
    thrust: F7.retro.thrust,
    burn: F7.retro.burn,
    deltaV: derived(
      (38_880 * LBF) / (AT_RETROFIRE * LB),
      `the three motors' specified total impulse, "38,880 lb-sec" (the MA-4 and MA-5 postlaunch trajectory report, p. 2-2), over Sigma 7's 2,994 lb at retrofire (${TN4807}, p. 108): 127.4 m/s. MA-9's own group's impulse and its capsule's weight then have not been read`,
    ),
    planned: derived(PACK_PLANNED, `"On the next mark at 60 seconds from that retro, you should jettison retros" (${TRANSCRIPT}, p. 440)`),
    gone: derived(
      PACK_GONE,
      `"And off they came", jettisoned by hand at 34:01:09 by the capsule's clock (${TRANSCRIPT}, p. 440), its ${FAST} s taken off`,
    ),
  },
  entry: {
    mass: assumed(NORMAL_REENTRY * LB, `${NORMAL_REENTRY} lb at "normal reentry", ${WEIGHED}`),
    area: HARDWARE.area,
    drag: HARDWARE.entryDrag,
  },
  heating: F7.heating,
  descent: {
    ground: doc(0, `the sea: it came down in the Pacific south-east of Midway, four miles from the carrier (${SP4201}, p. 501)`),
    mass: assumed(UNDER_THE_MAIN * LB, `${UNDER_THE_MAIN} lb at the main's deployment, ${WEIGHED}`),
    drogue: {
      altitude: doc(42_000 * FT, `${PILOT}, p. 357: "I deployed the drogue parachute at 42,000 feet, as planned"`),
      ...HARDWARE.drogue,
    },
    main: {
      altitude: assumed(
        10_600 * FT,
        `the barostats' 10,600 ft, at which Sigma 7's main came out (${TN4807}, p. 69): MA-9's own height not read; the press kit's "normally ... 10,000 feet"`,
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
        source: `${SP45}, Table 3-I, pp. 51 and 52: the flight's duration, 34:19:49`,
      },
      {
        id: 'mercury-capsule.speed',
        label: 'Falling at the sea, on the main',
        value: 34 * FT,
        unit: 'm/s',
        tolerance: 1.5,
        confidence: 'documented',
        source: `the pilot, asked his rate of descent on the main: "About 34 feet per second" (${TRANSCRIPT}, p. 442)`,
      },
    ],
  },
  landing: {
    latitude: doc(
      27 + 22.6 / 60,
      `${SP45}, Table 8-III, p. 135: where the capsule was picked up, 27°22.6′ N 176°35.3′ W; predicted after retrofire 27°22′ N 176°29′ W`,
    ),
    longitude: doc(-(176 + 35.3 / 60), `${SP45}, Table 8-III, p. 135`),
    at: doc(LANDING, `${SP45}, Table 3-I`),
    near: 'the Pacific, south-east of Midway',
  },
  events: [
    { id: 'liftoff', label: 'Liftoff', at: doc(0, `${LV}: 08:04:13 a.m. e.s.t.`) },
    { id: 'beco', label: 'Booster engine cutoff', at: doc(BECO, LV) },
    { id: 'staging', label: 'Booster section let go', at: doc(STAGING, LV) },
    { id: 'tower-release', label: 'Escape tower released', at: assumed(TOWER, `${KIT}: planned`) },
    { id: 'seco', label: 'Sustainer engine cutoff: in orbit', at: doc(SECO, LV) },
    { id: 'spacecraft-separation', label: 'Spacecraft separation: "I have SECO, sep cap"', at: derived(SEPARATION, TRANSCRIPT) },
    {
      id: 'retrosequence',
      label: 'Retrosequence: in retrofire attitude, by hand',
      at: derived(RETROSEQUENCE, 'thirty seconds before retrofire'),
    },
    {
      id: 'retrofire',
      label: 'Retrofire by hand, on Glenn’s count',
      at: doc(RETRO, `${SP45}, p. 151`),
      also: 'fire at 33:59:53 by the capsule’s clock',
    },
    { id: 'retro-assembly-jettison', label: 'Retropack jettisoned, by hand', at: derived(PACK_GONE, TRANSCRIPT) },
    {
      id: 'point-05-g',
      label: '0.05 g, as the ground gave it',
      at: derived(ENTRY_G, `${TRANSCRIPT}, p. 440: "34 09 19. That is your 0.05g time"`),
    },
    {
      id: 'drogue-deployment',
      label: 'Drogue parachute, by hand, at 42,000 ft',
      at: derived(DROGUE, `"I got a drogue", 34:14:31 by the capsule's clock (${TRANSCRIPT}, p. 442)`),
    },
    {
      id: 'main-deployment',
      label: 'Main parachute',
      at: derived(MAIN, `"I have a good main", 34:16:03 by the capsule's clock (${TRANSCRIPT}, p. 442)`),
    },
    { id: 'water-impact', label: 'Landing', at: doc(LANDING, `${SP45}, Table 3-I`) },
  ],
  checks: [
    {
      id: 'entryAt',
      label: '0.05 g, as the ground predicted it',
      value: ENTRY_G,
      unit: 's',
      tolerance: 40,
      confidence: 'derived',
      source: `the ground's "34 09 19. That is your 0.05g time" after retrofire (${TRANSCRIPT}, p. 440): a prediction, the flight's own instant not read`,
    },
    {
      id: 'ejectionAt',
      label: 'Drogue out, by hand at 42,000 ft',
      value: DROGUE,
      unit: 's',
      tolerance: 30,
      confidence: 'derived',
      source: `"I got a drogue" at 34:14:31 by the capsule's clock (${TRANSCRIPT}, p. 442), less its ${FAST} s; the height ${PILOT}, p. 357`,
    },
    {
      id: 'alongTrack',
      label: 'Drogue out, along the track from where it was picked up',
      value: 0,
      unit: 'm',
      tolerance: 30_000,
      confidence: 'documented',
      source: `${SP45}, Table 8-III: picked up at 27°22.6′ N 176°35.3′ W, four miles from the carrier`,
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

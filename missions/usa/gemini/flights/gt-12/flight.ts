import type { Flight } from '../../../../../src/types.ts';
import { LC19_SPECS } from '../../../places/cape-canaveral/lc-19.parts.ts';
import { LC19 } from '../../../places/cape-canaveral/lc-19.ts';
import { lateCrew } from '../../crew/late-crew.ts';
import {
  agenaDimensions,
  agenaMotors,
  crewTransfer,
  dockingProperties,
  geminiControls,
  TARGET_GROUP,
  targetFix,
} from '../../vehicles/gemini-targets.ts';
import { dimensions, LB, NMI, SEDR2, thrusters, titanEngines } from '../../vehicles/gemini-titan.ts';
import { lateVehicle } from '../../vehicles/late-vehicle.ts';
import { geminiFlies } from '../../vehicles/gemini-flies.ts';
import { geminiTitanPlan } from '../../vehicles/gemini-titan-plan.ts';
import { INSERTION, orbital } from './orbital.ts';
import { crewAboard, crewArrives, hatchesShut, pad } from './pad.ts';
import { WEATHER } from './weather.ts';

const REPORT = 'the Gemini XII mission report (MSC-G-R-67-1)';
/** Ground elapsed time, in seconds from liftoff. */
const get = (h: number, m: number, s: number) => h * 3600 + m * 60 + s;
// The report’s event table has landing at GET 94:34:30. NASA SP-4203 lists a duration of 94:34:31.
const LANDING = get(94, 34, 30);
const [crew, pilot] = lateCrew(12, crewAboard);
const vehicle = lateVehicle(12, [crewAboard, hatchesShut]);

export const flight: Flight = {
  docking: {
    controls: geminiControls,
    massProperties: dockingProperties(REPORT, 104.84, 344.1, 7114),
    // (the Agena at its insertion, the vector the flight's plan flies its target from: orbital.ts `INSERTION`)
    fixes: [INSERTION],
    interface: 'cone',
    target: 'GATV 5001',
    transfer: crewTransfer(
      REPORT + ', tables 4.3-I and 4.3-IV.',
      targetFix(REPORT + ', spacecraft tracking after separation or insertion.', 0, 439.8, 25.5, -65.09, 525630, 25742, 0.07, 104.31),
      [
        [2980, 66.7, -0.3, 0.2, 88.6],
        [4462, -0.2, 0.3, -8.4, 36],
        [6472, 7.4, -3.9, -1, 17],
        [8575, 49.5, -6.4, -0.2, 60],
        [11147, 19.4, -10.1, 0.5, 29],
        [11474, -0.1, -1.7, 0.1, 6],
        [11827, -1.4, -2.8, -0.1, 8],
        [12226, 0.3, 0.5, 1.2, 3],
        [12545, 1.1, 4.8, -0.2, 6],
      ],
      12756,
      13560,
      50,
    ),
    spacecraft: { id: 'gt-12', mass: 'Weight at launch' },
    targetMass: 'Agena weight at orbital insertion',
    at: get(4, 13, 52),
  },
  id: 'usa/gemini/gt-12',
  nation: 'USA',
  agency: 'NASA',
  program: 'Project Gemini',
  designation: 'Gemini-Titan 12',
  callsign: 'Gemini XII',
  spacecraft: 'Gemini spacecraft No. 12 (McDonnell Aircraft)',
  launchVehicle: 'Gemini Launch Vehicle 12, a Titan II (Martin)',
  // Pad disconnect in the mission report’s launch-phase sequence of events and NASA SP-4203.
  launch: '1966-11-11T20:46:33.419Z',
  launchSite: LC19.name,
  site: LC19,
  opens: { at: crewArrives, model: 'pad', view: 'erector' },
  weather: WEATHER,
  crew: ['James A. Lovell Jr.', 'Edwin E. Aldrin Jr.'],
  summary:
    'Lovell and Aldrin docked with their Agena on the third revolution. The Agena’s engine anomaly cancelled a planned high-orbit excursion. Aldrin used handholds, foot restraints and scheduled rests to complete tasks on both spacecraft during his tethered EVA, with two stand-up EVAs to either side of it.',
  facts: [
    { label: 'Liftoff', value: '11 November 1966, 20:46:33.419 UTC' },
    { label: 'Command pilot', value: 'James A. Lovell Jr.' },
    { label: 'Pilot', value: 'Edwin E. Aldrin Jr.' },
    { label: 'Docking target', value: 'GATV 5001, launched from Complex 14 at 19:07:58.688 UTC' },
    { label: 'First docking', value: '4 h 13 min 52 s, in the third revolution' },
    { label: 'Outside', value: 'Aldrin, two stand-up EVAs and one tethered EVA' },
    { label: 'High-orbit excursion', value: 'Cancelled after the Agena’s primary propulsion anomaly' },
    { label: 'Orbit at insertion', value: '86.8 by 146.1 nautical miles, 28.87°' },
    { label: 'Duration', value: '94 h 34 min 31 s' },
    { label: 'Landing', value: '24°36.4′ N 69°56.2′ W (spacecraft, mission report §6.3)' },
    { label: 'Recovery', value: 'USS Wasp' },
  ],
  // Launch and orbital sequences from the mission report’s Section 4.2. Docking and EVA from Sections 4.1, 5.4 and 7.
  timeline: [
    { t: -5914.731, event: 'The Atlas launches GATV 5001 from Complex 14 at 19:07:58.688 UTC' },
    { t: 0, event: 'Liftoff, azimuth 100.6°' },
    { t: 7.99, event: 'Roll programme begins' },
    { t: 23.05, event: 'Pitch programme begins' },
    { t: 154.75, event: 'Stage I engine cutoff and Stage II ignition signal' },
    { t: 155.45, event: 'The stages begin to part' },
    { t: 343.54, event: 'Stage II engine cutoff' },
    { t: 366.72, event: 'Gemini separates from the Titan' },
    { t: get(0, 49, 40), event: 'First rendezvous phase adjustment' },
    { t: get(3, 5, 47), event: 'Terminal-phase burn toward GATV 5001, using backup rendezvous charts' },
    { t: get(4, 13, 52), event: 'First docking, with Gemini XII’s Agena' },
    { t: get(7, 5, 6), event: 'First eclipse-phasing burn with the Agena’s secondary propulsion' },
    { t: get(15, 16, 18), event: 'Second eclipse-phasing burn' },
    { t: get(19, 25, 43), event: 'Cabin depressurised for Aldrin’s first stand-up EVA' },
    { t: get(42, 48, 26), event: 'Aldrin opens his hatch for tethered EVA, with foot restraints and handholds' },
    { t: get(44, 55, 0), event: 'About now Aldrin’s hatch closes after the tethered EVA' },
    { t: get(52, 14, 27), event: 'Separation manoeuvre after the tethered-vehicle exercise' },
    { t: get(66, 8, 0), event: 'Aldrin opens his hatch for his second stand-up EVA' },
    { t: get(93, 59, 3), event: 'Equipment adapter separates' },
    { t: get(93, 59, 58), event: 'Retrofire' },
    { t: get(94, 29, 10), event: 'Drogue parachute deploys' },
    { t: get(94, 30, 35), event: 'Main parachute deployment begins' },
    { t: LANDING, event: 'Splashdown in the western Atlantic, recovered by USS Wasp' },
  ],
  specs: [
    ...LC19_SPECS,
    ...dimensions('documented', `${SEDR2}, Figures 2-3 and 2-4`, `${REPORT}, Figure 3.0-1`),
    {
      group: 'Pressure suit',
      label: 'James Lovell, in helmet and boots',
      value: 1.874,
      unit: 'm',
      confidence: 'estimated',
      note: 'Suited height from the standing figure; see the crew biographies and construction record in crew/g4c-suit.md',
    },
    {
      group: 'Pressure suit',
      label: 'Edwin Aldrin, in helmet and boots',
      value: 1.829,
      unit: 'm',
      confidence: 'estimated',
      note: 'Suited height from the standing figure; see the crew biographies and construction record in crew/g4c-suit.md',
    },
    {
      group: 'Spacecraft',
      label: 'Weight at launch',
      value: 8296.47 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `${REPORT}, 3.3: 8,296.47 lb`,
    },
    {
      group: 'Spacecraft',
      label: 'Weight at retrofire',
      value: 5627.87 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `${REPORT}, 3.3: 5,627.87 lb`,
    },
    {
      group: 'Spacecraft',
      label: 'Weight at landing',
      value: 4292.93 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `${REPORT}, 3.3: 4,292.93 lb; without parachute`,
    },
    {
      group: 'Launch vehicle',
      label: 'Weight at liftoff, with the spacecraft',
      value: 342092 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `${REPORT}, 3.3: 342,092 lb`,
    },
    {
      group: TARGET_GROUP,
      label: 'Agena weight at launch',
      value: 18071 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `${REPORT}, 3.6: 18,071 lb; including shroud`,
    },
    {
      group: TARGET_GROUP,
      label: 'Agena weight at orbital insertion',
      value: 7114 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `${REPORT}, 3.6: 7,114 lb`,
    },
    {
      group: 'Spacecraft',
      label: 'Perigee at insertion',
      value: 86.8 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `${REPORT}, Table 4.3-III, first revolution at insertion: 86.8 nautical miles`,
    },
    {
      group: 'Spacecraft',
      label: 'Apogee at insertion',
      value: 146.1 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `${REPORT}, Table 4.3-III, first revolution at insertion: 146.1 nautical miles`,
    },
    {
      group: 'Spacecraft',
      label: 'Inclination at insertion',
      value: 28.87,
      unit: 'deg',
      confidence: 'documented',
      note: `${REPORT}, Table 4.3-III, first revolution at insertion`,
    },
    {
      group: 'Spacecraft',
      label: 'Period at insertion',
      value: 88.87 * 60,
      unit: 's',
      confidence: 'documented',
      note: `${REPORT}, Table 4.3-III, first revolution at insertion: 88.87 minutes`,
    },
    {
      group: 'Launch vehicle',
      label: 'Launch azimuth',
      value: 100.6,
      unit: 'deg',
      confidence: 'documented',
      note: `${REPORT}, launch-phase sequence of events, roll programme start`,
    },
    ...agenaDimensions(),
  ],
  motors: [
    ...titanEngines(
      {
        burnS: 154.75 + 3.23,
        confidence: 'assumed',
        note: `Thrust is Martin’s nominal for the type, taken for GLV-12. Ignition signal 3.23 s before liftoff to cutoff 154.75 s after liftoff (${REPORT}, Table 4.2-I)`,
      },
      {
        burnS: 343.54 - 154.75,
        confidence: 'assumed',
        note: `Vacuum thrust is Martin’s nominal for the type, taken for GLV-12. The ignition signal and cutoff are from ${REPORT}, the launch-phase sequence of events`,
      },
    ),
    ...thrusters('spacecraft 12, as described in its mission report'),
    ...agenaMotors(),
  ],
  // the flight as an orbit, written from its record: the Titan's two stages, the orbit, the rendezvous made on the Agena,
  // the docked phasing burns, the separation, the retrofire and the lifting entry, each figure with its source (orbital.ts;
  // mission.md), flown through the day's air over the pad. Fly still opens on the docking chapter (src/app/address.ts `lacks`)
  plan: { ...geminiTitanPlan(orbital), aloft: WEATHER.aloft },
  flownNote:
    'The ascent is flown on GLV-12’s own weights and engines, from its mission report, on a stated steering law, and the coast on from the state it leaves. ' +
    'The Agena is flown from the report’s tracking at its insertion: the three burns before the coelliptic are flown at the record’s instants and impulses, and the coelliptic, the terminal phase, its corrections and the braking are solved on the Agena as each is made. ' +
    'The dockings, the tether and the walks are not flown: the two phasing burns the Agena made with the pair docked are flown on the ship at the pair’s impulse, and the separation, the last phasing burn, the retrofire and the entry as recorded (mission.md).',
  // the flight in the scene: the stack off the pad, what leaves it and the re-entry module's descent (vehicles/gemini-flies.ts)
  flies: geminiFlies(orbital),
  models: [vehicle, pad, crew, pilot],
  surroundings: 'models/usa/places/cape-canaveral/lc19/1965-03.glb',
};

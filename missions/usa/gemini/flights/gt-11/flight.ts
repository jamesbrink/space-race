import { doc } from '../../../../../src/measure.ts';
import type { Flight } from '../../../../../src/types.ts';
import { LC19_SPECS } from '../../../places/cape-canaveral/lc-19.parts.ts';
import { LC19 } from '../../../places/cape-canaveral/lc-19.ts';
import { lateCrew } from '../../crew/late-crew.ts';
import {
  agenaDimensions,
  agenaMotors,
  crewTransfer,
  dockedBurn,
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

const REPORT = 'the Gemini XI mission report (MSC-G-R-66-8)';
/** Ground elapsed time, in seconds from liftoff. */
const get = (h: number, m: number, s: number) => h * 3600 + m * 60 + s;
const DURATION = get(71, 17, 8);
const [crew, pilot] = lateCrew(11, crewAboard);
const vehicle = lateVehicle(11, [crewAboard, hatchesShut]);

export const flight: Flight = {
  docking: {
    jets: [{ body: 1, node: 'AgenaEngine_Extension', radius: 16.5 * 0.0254, main: true, tip: true }],
    controls: geminiControls,
    massProperties: dockingProperties(REPORT, 103.87, 343, 7198),
    tether: {
      length: doc(100 * 0.3048, REPORT + ', section 3, 100-foot Dacron webbing'),
      rotation: doc((38 * Math.PI) / (180 * 60), REPORT + ', section 5.1.5.3.2, initial rotation in degrees per minute'),
      at: get(50, 12, 48),
      releaseAt: get(52, 58, 36),
    },
    burns: [
      dockedBurn(
        'Calibration',
        get(4, 28, 48),
        110.69,
        -0.56,
        -88.73,
        REPORT + ', table 4.3-VII and section 5.4, measured thrust durations and velocity changes',
        3.03,
      ),
      dockedBurn(
        'High apogee',
        get(40, 30, 15),
        919.6,
        0,
        2.16,
        REPORT + ', table 4.3-VII and section 5.4, measured thrust durations and velocity changes',
        25.07,
      ),
      dockedBurn(
        'Recircularization',
        get(43, 52, 55),
        919.47,
        0,
        -178.7,
        REPORT + ', table 4.3-VII and section 5.4, measured thrust durations and velocity changes',
        22.47,
      ),
    ],
    // (the Agena at its insertion, the vector the flight's plan flies its target from: orbital.ts `INSERTION`)
    fixes: [INSERTION],
    interface: 'cone',
    target: 'GATV 5006',
    transfer: crewTransfer(
      REPORT + ', tables 4.3-I and 4.3-IV.',
      targetFix(REPORT + ', spacecraft tracking after separation or insertion.', 0, 469, 25.01, -62.9, 526320, 25747, 0.04, 105.13),
      [
        [1780, 0.3, 0.1, 2.9, 4],
        [2998.2, 141, 28.3, 4.8, 194],
        [3821, 2, -3.4, -3.9, 26],
        [4543, -0.9, -1.8, -0.5, 8],
      ],
      4661,
      5100,
      50,
    ),
    spacecraft: { id: 'gt-11', mass: 'Weight at launch' },
    targetMass: 'Agena weight at orbital insertion',
    at: get(1, 34, 16),
  },
  id: 'usa/gemini/gt-11',
  nation: 'USA',
  agency: 'NASA',
  program: 'Project Gemini',
  designation: 'Gemini-Titan 11',
  callsign: 'Gemini XI',
  spacecraft: 'Gemini spacecraft No. 11 (McDonnell Aircraft)',
  launchVehicle: 'Gemini Launch Vehicle 11, a Titan II (Martin)',
  // Pad disconnect in the mission report’s launch-phase sequence of events.
  launch: '1966-09-12T14:42:26.546Z',
  launchSite: LC19.name,
  site: LC19,
  opens: { at: crewArrives, model: 'pad', view: 'erector' },
  weather: WEATHER,
  crew: ['Charles Conrad Jr.', 'Richard F. Gordon Jr.'],
  summary:
    'Conrad and Gordon docked with their Agena in the first revolution and then rode it to a record altitude. Gordon made two EVAs, and the crew spun Gemini and Agena slowly at the ends of a tether to keep it taut.',
  facts: [
    { label: 'Liftoff', value: '12 September 1966, 14:42:26.546 UTC' },
    { label: 'Command pilot', value: 'Charles Conrad Jr.' },
    { label: 'Pilot', value: 'Richard F. Gordon Jr.' },
    { label: 'Docking target', value: 'GATV 5006, launched from Complex 14 at 13:05:01.725 UTC' },
    { label: 'First docking', value: '1 h 34 min 16 s, in the first revolution' },
    { label: 'Outside', value: 'Gordon, one tethered EVA and one stand-up EVA' },
    { label: 'Highest apogee', value: '741.5 nautical miles (1,373 km), after the Agena burn' },
    { label: 'Orbit at insertion', value: '86.6 by 149.2 nautical miles, 28.85°' },
    { label: 'Duration', value: '71 h 17 min 8 s' },
    { label: 'Landing', value: '24°15.4′ N 70°00′ W' },
    { label: 'Recovery', value: 'USS Guam' },
  ],
  // Launch and orbital sequences from the mission report’s Section 4.2. Docking and EVA from Sections 4.1, 5.4 and 7.
  timeline: [
    { t: -5844.821, event: 'The Atlas launches GATV 5006 from Complex 14 at 13:05:01.725 UTC' },
    { t: 0, event: 'Liftoff, azimuth 99.9°' },
    { t: 8.46, event: 'Roll programme begins' },
    { t: 22.99, event: 'Pitch programme begins' },
    { t: 153.3, event: 'Stage I engine cutoff and Stage II ignition signal' },
    { t: 340.3, event: 'Stage II engine cutoff' },
    { t: 361.02, event: 'Gemini separates from the Titan' },
    { t: get(0, 29, 40), event: 'Plane-change burn for the first-orbit rendezvous' },
    { t: get(0, 49, 58), event: 'Terminal-phase burn toward GATV 5006' },
    { t: get(1, 34, 16), event: 'First docking, with Gemini XI’s Agena' },
    { t: get(4, 28, 48), event: 'Agena engine calibrates the docked configuration' },
    { t: get(24, 2, 16), event: 'Cabin depressurised for Gordon’s tethered EVA' },
    { t: get(40, 30, 15), event: 'Agena’s main engine raises apogee to 741.5 nautical miles' },
    { t: get(43, 52, 55), event: 'Agena burn lowers the orbit again' },
    { t: get(46, 7, 0), event: 'Gordon opens his hatch for his stand-up EVA' },
    { t: get(53, 24, 58), event: 'Gemini separates from the Agena following the tether exercise' },
    { t: get(66, 34, 43), event: 'Final braking burn for a radarless re-rendezvous' },
    { t: get(70, 39, 46), event: 'Equipment adapter separates' },
    { t: get(70, 41, 36), event: 'Retrofire' },
    { t: get(71, 11, 29), event: 'Drogue parachute deploys' },
    { t: get(71, 13, 8), event: 'Main parachute deployment begins' },
    { t: DURATION, event: 'Splashdown in the western Atlantic, recovered by USS Guam' },
  ],
  specs: [
    ...LC19_SPECS,
    ...dimensions('documented', `${SEDR2}, Figures 2-3 and 2-4`, `${REPORT}, Figure 3.0-1`),
    {
      group: 'Pressure suit',
      label: 'Charles Conrad, in helmet and boots',
      value: 1.74,
      unit: 'm',
      confidence: 'estimated',
      note: 'Suited height from the standing figure; see the crew biographies and construction record in crew/g4c-suit.md',
    },
    {
      group: 'Pressure suit',
      label: 'Richard Gordon, in helmet and boots',
      value: 1.763,
      unit: 'm',
      confidence: 'estimated',
      note: 'Suited height from the standing figure; see the crew biographies and construction record in crew/g4c-suit.md',
    },
    {
      group: 'Spacecraft',
      label: 'Weight at launch',
      value: 8374 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `${REPORT}, 3.3: 8,374 lb`,
    },
    {
      group: 'Spacecraft',
      label: 'Weight at retrofire',
      value: 5577 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `${REPORT}, 3.3: 5,577 lb`,
    },
    {
      group: 'Spacecraft',
      label: 'Weight at landing',
      value: 4230 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `${REPORT}, 3.3: 4,230 lb; without parachute`,
    },
    {
      group: 'Launch vehicle',
      label: 'Weight at liftoff, with the spacecraft',
      value: 343469 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `${REPORT}, 3.3: 343,469 lb`,
    },
    {
      group: TARGET_GROUP,
      label: 'Agena weight at launch',
      value: 18105 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `${REPORT}, 3.6: 18,105 lb; including shroud`,
    },
    {
      group: TARGET_GROUP,
      label: 'Agena weight at orbital insertion',
      value: 7198 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `${REPORT}, 3.6: 7,198 lb`,
    },
    {
      group: 'Spacecraft',
      label: 'Perigee at insertion',
      value: 86.6 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `${REPORT}, Table 4.3-III, first revolution at insertion: 86.6 nautical miles`,
    },
    {
      group: 'Spacecraft',
      label: 'Apogee at insertion',
      value: 149.2 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `${REPORT}, Table 4.3-III, first revolution at insertion: 149.2 nautical miles`,
    },
    {
      group: 'Spacecraft',
      label: 'Inclination at insertion',
      value: 28.85,
      unit: 'deg',
      confidence: 'documented',
      note: `${REPORT}, Table 4.3-III, first revolution at insertion`,
    },
    {
      group: 'Spacecraft',
      label: 'Period at insertion',
      value: 88.92 * 60,
      unit: 's',
      confidence: 'documented',
      note: `${REPORT}, Table 4.3-III, first revolution at insertion: 88.92 minutes`,
    },
    {
      group: 'Launch vehicle',
      label: 'Launch azimuth',
      value: 99.9,
      unit: 'deg',
      confidence: 'documented',
      note: `${REPORT}, launch-phase sequence of events, roll programme start`,
    },
    {
      group: 'Spacecraft',
      label: 'Highest apogee',
      value: 741.5 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `${REPORT}, Table 4.3-II, after the first docked height adjustment: 741.5 nautical miles`,
    },
    ...agenaDimensions(),
  ],
  motors: [
    ...titanEngines(
      {
        burnS: 153.3 + 3.24,
        confidence: 'assumed',
        note: `Thrust is Martin’s nominal for the type, taken for GLV-11. Ignition signal 3.24 s before liftoff to cutoff 153.3 s after liftoff (${REPORT}, launch-phase sequence of events)`,
      },
      {
        burnS: 340.3 - 153.3,
        confidence: 'assumed',
        note: `Vacuum thrust is Martin’s nominal for the type, taken for GLV-11. The ignition signal and cutoff are from ${REPORT}, the launch-phase sequence of events`,
      },
    ),
    ...thrusters('spacecraft 11, as described in its mission report'),
    ...agenaMotors(),
  ],
  // the flight as an orbit, written from its record: the Titan's two stages, the orbit, the first-revolution rendezvous made on
  // the Agena, the docked burns, the coincident-orbit rendezvous, the retrofire and the lifting entry, each figure with its
  // source (orbital.ts; mission.md), flown through the day's air over the pad. Fly still opens on the docking chapter (src/app/address.ts `lacks`)
  plan: { ...geminiTitanPlan(orbital), aloft: WEATHER.aloft },
  flownNote:
    'The ascent is flown on GLV-11’s own weights and engines, from its mission report, on a stated steering law, and the coast on from the state it leaves. ' +
    'The Agena is flown from the report’s tracking at its insertion: the first-revolution terminal phase, its corrections and the braking are solved on it as each is made; the three burns its engine made with the pair docked, to an apogee of 741.5 nautical miles and back, are flown on the ship at the pair’s impulse, and the Agena is where the pair was when they parted after the tether. ' +
    'The coincident-orbit rendezvous is solved on it in turn; the docking, the walks and the tether are not flown, and the retrofire and the automatic entry are flown as recorded (mission.md).',
  // the flight in the scene: the stack off the pad, what leaves it and the re-entry module's descent (vehicles/gemini-flies.ts)
  flies: geminiFlies(orbital),
  models: [vehicle, pad, crew, pilot],
  surroundings: 'models/usa/places/cape-canaveral/lc19/1965-03.glb',
};

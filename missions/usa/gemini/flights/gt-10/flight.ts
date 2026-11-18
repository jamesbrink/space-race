import { assumed, doc } from '../../../../../src/measure.ts';
import type { Flight } from '../../../../../src/types.ts';
import { LC19_SPECS } from '../../../places/cape-canaveral/lc-19.parts.ts';
import { LC19 } from '../../../places/cape-canaveral/lc-19.ts';
import { lateCrew } from '../../crew/late-crew.ts';
import {
  agenaDimensions,
  agenaMotors,
  dockedBurn,
  dockingProperties,
  geminiControls,
  targetFix,
  TARGET_GROUP,
} from '../../vehicles/gemini-targets.ts';
import { dimensions, LB, NMI, SEDR2, thrusters, titanEngines } from '../../vehicles/gemini-titan.ts';
import { lateVehicle, oldAgena } from '../../vehicles/late-vehicle.ts';
import { crewAboard, crewArrives, hatchesShut, pad } from './pad.ts';
import { WEATHER } from './weather.ts';

const REPORT = 'the Gemini X mission report (MSC-G-R-66-7)';
/** Ground elapsed time, in seconds from liftoff. */
const get = (h: number, m: number, s: number) => h * 3600 + m * 60 + s;
const DURATION = get(70, 46, 39);
const [crew, pilot] = lateCrew(10, crewAboard);
const vehicle = lateVehicle(10, [crewAboard, hatchesShut]);

const visitSource = REPORT + ', table 4-VIII and sections 4.3.1.2 and 7.1.2.6.5.';
const correction = (at: number, dv: number, pitch: number, yaw: number, seconds: number) => ({
  at,
  dv: doc(dv * 0.3048, visitSource),
  pitch: doc(pitch, visitSource),
  yaw: doc(yaw, visitSource),
  duration: doc(seconds, visitSource),
});

export const flight: Flight = {
  docking: {
    jets: [{ body: 1, node: 'AgenaEngine_Extension', radius: 16.5 * 0.0254, main: true, tip: true }],
    controls: geminiControls,
    visit: {
      model: oldAgena.id,
      label: oldAgena.name,
      separate: get(44, 40, 16),
      at: get(47, 26, 44),
      brake: get(47, 39, 10),
      hold: get(47, 59, 22),
      eva: get(48, 40, 48),
      mass: assumed(
        7116 * LB,
        'Gemini VIII mission report section 3.6 insertion; the July residual propellant is unknown. Passive target is unpowered.',
      ),
      elevation: doc(31, visitSource),
      range: doc(14.2 * NMI, visitSource),
      gap: doc(5 * 0.3048, visitSource + ' Midpoint of reported 4 to 6 ft stand-off.'),
      attitude: doc(120, visitSource),
      radius: doc(30 * 0.0254, 'Lockheed Agena D systems data catalog, vehicle dimensions: 60-inch tank diameter.'),
      shaping: [
        correction(get(27, 45, 36), 9.7, 0, 0, 10),
        correction(get(41, 4, 26), 16, 0, -90, 20),
        correction(get(41, 35, 50), 4.4, 0, 180, 4),
      ],
      corrections: [
        correction(get(44, 40, 16), 2, 0, 0, 3),
        correction(get(45, 54, 1), 4.2, 65, -53, 6),
        correction(get(46, 9, 29), 10.64, -85, 0, 15),
      ],
      terminal: [
        correction(get(47, 26, 44), 22.3, 31, 0, 26),
        correction(get(47, 34, 10), 4.4, 44, 3, 9),
        correction(get(47, 38, 58), 0.9, 56, 9, 1.2),
      ],
    },
    retractTime: doc(5, REPORT + ', section 7.1.2.6.1, crew reported approximately five seconds'),
    massProperties: dockingProperties(REPORT, 104.68, 343.7, 7184),
    burns: [
      dockedBurn('Phasing', get(7, 38, 34), 423.6, 0, 0, REPORT + ', table 4-VIII and section 4.3'),
      dockedBurn('Height adjustment', get(20, 20, 12), 346.2, 0, 180, REPORT + ', table 4-VIII and section 4.3'),
      dockedBurn('Coelliptic maneuver', get(22, 37, 6), 82.2, 0, 0, REPORT + ', table 4-VIII and section 4.3'),
    ],
    fixes: [targetFix(REPORT + ', table 4-IX, final insertion', -6040.517, 558.27, 28.61, -59.49, 979215, 25366, -0.03, 94.91)],
    interface: 'cone',
    target: 'GATV 5005',
    targetMass: 'Agena weight at orbital insertion',
    at: get(5, 52, 37.1),
  },
  id: 'usa/gemini/gt-10',
  nation: 'USA',
  agency: 'NASA',
  program: 'Project Gemini',
  designation: 'Gemini-Titan 10',
  callsign: 'Gemini X',
  spacecraft: 'Gemini spacecraft No. 10 (McDonnell Aircraft)',
  launchVehicle: 'Gemini Launch Vehicle 10, a Titan II (Martin)',
  // Pad disconnect in the mission report’s launch-phase sequence of events.
  launch: '1966-07-18T22:20:26.648Z',
  launchSite: LC19.name,
  site: LC19,
  opens: { at: crewArrives, model: 'pad', view: 'erector' },
  weather: WEATHER,
  crew: ['John W. Young', 'Michael Collins'],
  summary:
    'Young and Collins docked with their own Agena in the fourth revolution, then used its engine to go higher. Collins made two EVAs. On the second he went across to Gemini VIII’s dormant Agena and retrieved its micrometeoroid collector.',
  facts: [
    { label: 'Liftoff', value: '18 July 1966, 22:20:26.648 UTC' },
    { label: 'Command pilot', value: 'John W. Young' },
    { label: 'Pilot', value: 'Michael Collins' },
    { label: 'Docking target', value: 'GATV 5005, launched from Complex 14 at 20:39:46.131 UTC' },
    { label: 'First docking', value: '5 h 52 min 37 s, in the fourth revolution' },
    { label: 'Outside', value: 'Collins, one stand-up EVA and one tethered EVA' },
    { label: 'Second target', value: 'GATV 5003, left in orbit by Gemini VIII' },
    { label: 'Orbit at insertion', value: '86.3 by 145.1 nautical miles, 28.87°' },
    { label: 'Duration', value: '70 h 46 min 39 s' },
    { label: 'Landing', value: '26°45′ N 71°57′ W' },
    { label: 'Recovery', value: 'USS Guadalcanal' },
  ],
  // Launch and orbital sequences from the mission report’s Section 4.2. Docking and EVA from Sections 4.1, 5.4 and 7.
  timeline: [
    { t: -6040.517, event: 'The Atlas launches GATV 5005 from Complex 14 at 20:39:46.131 UTC' },
    { t: 0, event: 'Liftoff, azimuth 98.8°' },
    { t: 9.35, event: 'Roll programme begins' },
    { t: 23, event: 'Pitch programme begins' },
    { t: 152.38, event: 'Stage I engine cutoff and Stage II ignition signal' },
    { t: 153.1, event: 'The stages begin to part' },
    { t: 340.57, event: 'Stage II engine cutoff' },
    { t: 371.44, event: 'Gemini separates from the Titan' },
    { t: get(2, 18, 11), event: 'First rendezvous phase adjustment' },
    { t: get(4, 33, 44), event: 'Terminal-phase burn toward GATV 5005' },
    { t: get(5, 52, 37.1), event: 'First docking, with Gemini X’s own Agena' },
    { t: get(7, 38, 34), event: 'Agena engine fires with Gemini docked to raise the orbit' },
    { t: get(23, 23, 26), event: 'Cabin depressurised for Collins’s stand-up EVA' },
    { t: get(44, 40, 16), event: 'Gemini separates from its Agena and manoeuvres toward GATV 5003' },
    { t: get(47, 39, 10), event: 'Final braking for rendezvous with Gemini VIII’s dormant Agena' },
    { t: get(48, 40, 48), event: 'Cabin depressurised for Collins’s tethered EVA to the target' },
    { t: get(49, 20, 56), event: 'Cabin repressurisation begins after Collins retrieves the collector' },
    { t: get(51, 16, 0), event: 'Separation burn away from GATV 5003' },
    { t: get(70, 8, 37), event: 'Equipment adapter separates' },
    { t: get(70, 10, 24), event: 'Retrofire' },
    { t: get(70, 41, 34), event: 'Drogue parachute deploys' },
    { t: get(70, 42, 51), event: 'Main parachute deployment begins' },
    { t: DURATION, event: 'Splashdown in the western Atlantic, recovered by USS Guadalcanal' },
  ],
  specs: [
    ...LC19_SPECS,
    ...dimensions('documented', `${SEDR2}, Figures 2-3 and 2-4`, `${REPORT}, Figure 3.0-1`),
    {
      group: 'Pressure suit',
      label: 'John Young, in helmet and boots',
      value: 1.807,
      unit: 'm',
      confidence: 'estimated',
      note: 'Suited height from the standing figure; see the crew biographies and construction record in crew/g4c-suit.md',
    },
    {
      group: 'Pressure suit',
      label: 'Michael Collins, in helmet and boots',
      value: 1.851,
      unit: 'm',
      confidence: 'estimated',
      note: 'Suited height from the standing figure; see the crew biographies and construction record in crew/g4c-suit.md',
    },
    {
      group: 'Spacecraft',
      label: 'Weight at launch',
      value: 8295 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `${REPORT}, 3.3: 8,295 lb`,
    },
    {
      group: 'Spacecraft',
      label: 'Weight at retrofire',
      value: 5578 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `${REPORT}, 3.3: 5,578 lb`,
    },
    {
      group: 'Spacecraft',
      label: 'Weight at landing',
      value: 4254 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `${REPORT}, 3.3: 4,254 lb; without parachute`,
    },
    {
      group: 'Launch vehicle',
      label: 'Weight at liftoff, with the spacecraft',
      value: 341164 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `${REPORT}, 3.3: 341,164 lb`,
    },
    {
      group: TARGET_GROUP,
      label: 'Agena weight at launch',
      value: 18074 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `${REPORT}, 3.6: 18,074 lb; including shroud`,
    },
    {
      group: TARGET_GROUP,
      label: 'Agena weight at orbital insertion',
      value: 7184 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `${REPORT}, 3.6: 7,184 lb`,
    },
    {
      group: 'Spacecraft',
      label: 'Perigee at insertion',
      value: 86.3 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `${REPORT}, Table 4-VI, first revolution after the insertion velocity adjustment: 86.3 nautical miles`,
    },
    {
      group: 'Spacecraft',
      label: 'Apogee at insertion',
      value: 145.1 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `${REPORT}, Table 4-VI, first revolution after the insertion velocity adjustment: 145.1 nautical miles`,
    },
    {
      group: 'Spacecraft',
      label: 'Inclination at insertion',
      value: 28.87,
      unit: 'deg',
      confidence: 'documented',
      note: `${REPORT}, Table 4-VI, first revolution after the insertion velocity adjustment`,
    },
    {
      group: 'Spacecraft',
      label: 'Period at insertion',
      value: 88.79 * 60,
      unit: 's',
      confidence: 'documented',
      note: `${REPORT}, Table 4-VI, first revolution after the insertion velocity adjustment: 88.79 minutes`,
    },
    {
      group: 'Launch vehicle',
      label: 'Launch azimuth',
      value: 98.8,
      unit: 'deg',
      confidence: 'documented',
      note: `${REPORT}, launch-phase sequence of events, roll programme start`,
    },
    ...agenaDimensions(),
    ...agenaDimensions().map((spec) => ({ ...spec, group: 'Gemini VIII target' })),
  ],
  motors: [
    ...titanEngines(
      {
        burnS: 152.38 + 3.26,
        confidence: 'assumed',
        note: `Thrust is Martin’s nominal for the type, taken for GLV-10. Ignition signal 3.26 s before liftoff to cutoff 152.38 s after liftoff (${REPORT}, launch-phase sequence of events)`,
      },
      {
        burnS: 340.57 - 152.38,
        confidence: 'assumed',
        note: `Vacuum thrust is Martin’s nominal for the type, taken for GLV-10. The ignition signal and cutoff are from ${REPORT}, the launch-phase sequence of events`,
      },
    ),
    ...thrusters('spacecraft 10, as described in its mission report'),
    ...agenaMotors(),
  ],
  models: [vehicle, pad, crew, pilot, oldAgena],
  surroundings: 'models/usa/places/cape-canaveral/lc19/1965-03.glb',
};

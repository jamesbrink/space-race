import type { Flight } from '../../../../../src/types.ts';
import { LC39A, mobileLauncher } from '../../../places/cape-canaveral/lc-39.ts';
import { launchCrew } from './crew.ts';
import { WEATHER } from './weather.ts';
import { roverModel } from '../../vehicles/rover-gallery.ts';
import { boardingHatches } from '../../vehicles/hatch.ts';
import { blockIICabin } from '../../vehicles/cabin.ts';
import { saturnVFlies } from '../../vehicles/saturn-v-flies.ts';
import { saturnVPlan } from '../../vehicles/saturn-v-plan.ts';
import { escapeParts, nodes, rocket, specification } from '../../vehicles/stack-gallery.ts';
import { orionModel, orionPort, orionStackParts, orionStackViews } from './orion.ts';
import { casperCommand, casperPort, casperService, casperViews } from './casper.ts';
import { orbital } from './orbital.ts';
import { APOLLO16_THRUST, stackViews, launcher } from './sa511.ts';

const elapsed = (h: number, m: number, s: number) => h * 3600 + m * 60 + s;
const lb = 0.45359237;
const report = 'NASA SP-4029, Apollo 16 timeline, elapsed from range zero';
const masses = 'Apollo 16 Mission Report MSC-07230, appendix A, table A-IV, transposition and docking';
// Ingress follows the Apollo 16 Press Kit countdown, p. 7. Hatch timing is estimated.
// Launch Control reported a sealed cabin at T−1:30:58
// and installation of the protective hatch cover at T−1:20:57 (commentary tapes 1/1 and 2/1).
const boarding: [number, number] = [-elapsed(2, 40, 0), -elapsed(1, 45, 0)];
const coverCloseout = -elapsed(1, 20, 0);
const cabin = blockIICabin(3871);
const PLAN = saturnVPlan(orbital);

export const flight: Flight = {
  id: 'usa/apollo/apollo-16',
  nation: 'USA',
  agency: 'NASA',
  program: 'Apollo',
  designation: 'Apollo 16 · AS-511',
  callsign: 'Casper · Orion',
  spacecraft: 'CSM-113 Casper · LM-11 Orion',
  launchVehicle: 'Saturn V · SA-511',
  launch: '1972-04-16T17:54:00Z',
  launchSite: 'Launch Complex 39A, Kennedy Space Center',
  site: LC39A,
  opens: { at: boarding[0], model: 'pad', view: 'launcher' },
  weather: WEATHER,
  plan: { ...PLAN, aloft: WEATHER.aloft },
  flies: saturnVFlies(PLAN),
  crew: ['John W. Young', 'Thomas K. Mattingly II', 'Charles M. Duke Jr.'],
  summary:
    'Young and Duke took Orion to the Descartes highlands after a six-hour landing delay. Mattingly mapped the Moon from Casper and climbed outside on the way home to recover the film.',
  facts: [
    { label: 'Spacecraft', value: 'CSM-113 and LM-11' },
    { label: 'Landing site', value: 'Descartes highlands' },
    { label: 'Recovery', value: 'Pacific Ocean · 27 April 1972' },
  ],
  timeline: [
    { t: boarding[0], event: 'Scheduled crew ingress into Casper, Young first, then Duke and Mattingly' },
    { t: -2995, event: 'Launch Control has reported arm 9 parked at 12° standby' },
    { t: -272, event: 'Launch Control reports the crew arm swinging to full retraction' },
    { t: 0.3, event: 'SA-511 first moves as the hold-down arms release' },
    { t: 0.59, event: 'Instrument unit umbilical disconnects at Pad 39A' },
    { t: elapsed(0, 11, 56.21), event: 'SA-511 reaches Earth parking orbit' },
    { t: elapsed(2, 33, 36.5), event: 'S-IVB restarts to send Apollo 16 toward the Moon' },
    { t: elapsed(3, 4, 59), event: 'Casper separates and turns back toward Orion' },
    { t: elapsed(3, 21, 53.4), event: 'Casper docks with Orion in the adapter' },
    { t: elapsed(3, 59, 15.1), event: 'The docked spacecraft leave the S-IVB' },
    { t: elapsed(27, 9, 59), event: 'Ground tracking of the spent S-IVB is lost' },
    { t: elapsed(69, 59, 1), event: 'Crew jettisons the scientific instrument bay door' },
    { t: elapsed(74, 28, 27.87), event: 'Casper fires its service engine for lunar orbit insertion' },
    { t: elapsed(75, 8, 4), event: 'Estimated S-IVB impact on the Moon' },
    { t: elapsed(96, 13, 31), event: 'Orion undocks from Casper in lunar orbit' },
    { t: elapsed(97, 40, 0), event: 'Yaw oscillations during Casper’s engine check delay the landing' },
    { t: elapsed(102, 30, 0), event: 'The two spacecraft move apart after clearance to proceed' },
    { t: elapsed(104, 29, 35), event: 'Orion lands in the Descartes highlands' },
    { t: elapsed(118, 53, 38), event: 'First surface excursion begins, with the rover and ultraviolet camera still stowed' },
    { t: elapsed(142, 39, 35), event: 'Second surface excursion begins, toward Stone Mountain' },
    { t: elapsed(165, 31, 28), event: 'Third surface excursion begins, toward North Ray crater' },
    { t: elapsed(175, 31, 47.9), event: 'Orion’s ascent stage lifts off' },
    { t: elapsed(177, 41, 18), event: 'Orion docks with Casper' },
    { t: elapsed(195, 0, 12), event: 'Crew jettisons Orion’s ascent stage' },
    { t: elapsed(195, 23, 12), event: 'Crew jettisons the stalled mass spectrometer boom' },
    { t: elapsed(196, 2, 9), event: 'Casper deploys the particles and fields subsatellite' },
    { t: elapsed(200, 21, 33.07), event: 'Casper fires its service engine for Earth' },
    { t: elapsed(218, 39, 46), event: 'Mattingly begins the spacewalk to retrieve film from the service module' },
    { t: elapsed(220, 3, 28), event: 'Transearth spacewalk ends' },
    { t: elapsed(265, 22, 23), event: 'Command and service modules separate' },
    { t: elapsed(265, 51, 5), event: 'Casper splashes down in the Pacific' },
  ],
  specs: [
    specification(
      rocket,
      'Height on the pad',
      363 * 0.3048,
      'm',
      'NASA launch photograph S72-35347, caption, 363 feet for the complete Apollo 16 vehicle',
    ),
    specification(
      rocket,
      'Mass at ground ignition',
      6537238 * lb,
      'kg',
      'AS-511 Flight Evaluation Report, table 16-2, actual ground ignition weight, 6,537,238 lb',
    ),
    {
      group: 'Spacecraft',
      label: 'Length from engine exit to docking plane',
      value: 404.25 * 0.0254,
      unit: 'm',
      confidence: 'assumed',
      note: 'Block II stations XA706 to XA1000 plus Xc110.25, NASA TN D-6854 fig. A-13, applied to CSM-113.',
    },
    specification(
      rocket,
      'Mass at liftoff',
      6429658 * lb,
      'kg',
      'AS-511 Flight Evaluation Report, table 16-2, actual weight at holddown-arm release, 6,429,658 lb',
    ),
    specification('Spacecraft', 'CSM at transposition', 66923 * lb, 'kg', masses),
    specification('Lunar module · Orion', 'LM at transposition', 36252 * lb, 'kg', masses),
    specification('Mission', 'Duration of flight', elapsed(265, 51, 5), 's', report),
  ],
  motors: APOLLO16_THRUST,
  models: [
    {
      id: 'vehicle',
      name: 'Apollo 16 · Saturn V',
      url: 'models/usa/apollo/apollo-16/vehicle.glb',
      backdrop: 'ground',
      cutaway: true,
      dockingPorts: [casperPort, orionPort],
      ...cabin,
      cabin: { ...cabin.cabin, within: [...cabin.cabin.within, 'WaterDispenser'] },
      seats: [
        { node: 'Seat_Commander', figure: 'crew', label: 'Young’s left couch', from: 'SideHatch', open: boarding },
        { node: 'Seat_CommandModulePilot', figure: 'pilot', label: 'Mattingly’s centre couch', from: 'SideHatch', open: boarding },
        { node: 'Seat_LunarModulePilot', figure: 'lmp', label: 'Duke’s right couch', from: 'SideHatch', open: boarding },
      ],
      scale: '363 ft / 110.64 m to the escape tower tip',
      slider: ['Assembled', 'Taken apart'],
      views: [
        { id: 'launcher', label: 'Saturn V', nodes: nodes(launcher) },
        { id: 'escape', label: 'Escape tower', nodes: nodes(escapeParts) },
        ...casperViews,
        { id: 'orion', label: 'Orion in adapter', nodes: nodes(orionStackParts), isolate: true, from: [1, 0.12, -0.25] },
        ...orionStackViews,
        ...stackViews,
        { id: 'f1', label: 'F-1 cluster', nodes: ['FirstStageEngines'], from: [-0.62, 0.08, 0.78] },
      ],
      parts: boardingHatches([...casperCommand, ...casperService, ...orionStackParts, ...escapeParts, ...launcher], boarding, {
        openBy: boarding[0],
        coverClosedBy: coverCloseout,
      }),
    },
    orionModel,
    mobileLauncher(3, {
      holdDowns: 'as-511',
      ingress: boarding[0],
      parkedBy: -2995,
      pao: 'Kennedy Launch Control, 16 April 1972, tapes 6/1 and 16/1. Arm 9 was reported parked at 12° between T−50:57 and T−49:55 and swinging to full retract at T−4:32. Stroke endpoints are estimated.',
      intertankClear: -17,
      forwardRetract: -16.2,
      firstMotion: 0.3,
      terminalSource:
        'SA-510 flight manual, figure 8-20, nominal ML-3 arm sequence assumed for SA-511. AS-511 Flight Evaluation Report, table 2-2 and §3.5.1, first motion and individual mast strokes.',
    }),
    ...launchCrew,
    roverModel(16),
  ],
};

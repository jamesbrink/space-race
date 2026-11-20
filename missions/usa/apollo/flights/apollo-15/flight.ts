import type { Flight } from '../../../../../src/types.ts';
import { LC39A_EDT, mobileLauncher } from '../../../places/cape-canaveral/lc-39.ts';
import { lc39Crew } from '../../crew/lc39.ts';
import { WEATHER } from './weather.ts';
import { roverModel } from '../../vehicles/rover-gallery.ts';
import { boardingHatches } from '../../vehicles/hatch.ts';
import { blockIICabin } from '../../vehicles/cabin.ts';
import { saturnVFlies } from '../../vehicles/saturn-v-flies.ts';
import { saturnVPlan } from '../../vehicles/saturn-v-plan.ts';
import { escapeParts, nodes, rocket, specification } from '../../vehicles/stack-gallery.ts';
import { falconModel, falconPort, falconStackParts, falconStackViews } from './falcon.ts';
import { endeavourCommand, endeavourPort, endeavourService, endeavourViews } from './endeavour.ts';
import { orbital } from './orbital.ts';
import { APOLLO15_THRUST, stackViews, launcher } from './sa510.ts';

const elapsed = (h: number, m: number, s: number) => h * 3600 + m * 60 + s;
const lb = 0.45359237;
const report = 'NASA SP-4029, Apollo 15 timeline, elapsed from range zero';
const masses = 'Apollo 15 Mission Report MSC-05161, appendix A, table A-III, transposition and docking';
const ingress = -elapsed(2, 41, 0); // 06:53 EDT, Scott first aboard. Range zero was 09:34 EDT.
const boarding: [number, number] = [ingress, -elapsed(1, 58, 0)]; // Approximate hatch closure during the T−2-hour broadcast.
const coverCloseout = -elapsed(1, 31, 0); // Estimated between the T−1:41 cover installation and the T−1:31 white-room closeout call.
const cabin = blockIICabin(3871);
const PLAN = saturnVPlan(orbital);

export const flight: Flight = {
  id: 'usa/apollo/apollo-15',
  nation: 'USA',
  agency: 'NASA',
  program: 'Apollo',
  designation: 'Apollo 15 · AS-510',
  callsign: 'Endeavour · Falcon',
  spacecraft: 'CSM-112 Endeavour · LM-10 Falcon',
  launchVehicle: 'Saturn V · SA-510',
  launch: '1971-07-26T13:34:00Z',
  launchSite: 'Launch Complex 39A, Kennedy Space Center',
  site: LC39A_EDT,
  opens: { at: ingress, model: 'pad', view: 'launcher' },
  weather: WEATHER,
  plan: { ...PLAN, aloft: WEATHER.aloft },
  flies: saturnVFlies(PLAN, nodes(launcher)),
  crew: ['David R. Scott', 'Alfred M. Worden', 'James B. Irwin'],
  summary:
    'Scott and Irwin unfolded a rover from Falcon and drove along Hadley Rille and the Apennine Front. In lunar orbit Worden photographed their landing region from Endeavour. On the way home he climbed outside to collect the film.',
  facts: [
    { label: 'Spacecraft', value: 'CSM-112 and LM-10' },
    { label: 'Landing site', value: 'Hadley–Apennine' },
    { label: 'Recovery', value: 'North Pacific · 7 August 1971' },
  ],
  timeline: [
    { t: ingress, event: 'Scott boards Endeavour, followed by Irwin and Worden' },
    { t: -3180, event: 'Launch Control commands the crew access arm to standby' },
    { t: 0.3, event: 'SA-510 first moves as the hold-down arms release' },
    { t: 0.58, event: 'Instrument unit senses liftoff at Pad 39A' },
    { t: elapsed(0, 11, 44.67), event: 'SA-510 reaches Earth parking orbit' },
    { t: elapsed(2, 50, 2.9), event: 'S-IVB restarts for translunar injection' },
    { t: elapsed(3, 22, 27.2), event: 'Endeavour separates and turns back toward Falcon' },
    { t: elapsed(3, 33, 49.5), event: 'Endeavour docks with Falcon' },
    { t: elapsed(4, 18, 1.2), event: 'The docked spacecraft leave SLA-19' },
    { t: elapsed(74, 6, 47.1), event: 'Crew jettisons the scientific instrument bay door' },
    { t: elapsed(78, 31, 46.7), event: 'Endeavour fires its service engine for lunar orbit insertion' },
    // AS-510 evaluation, table 17-5, corrects Earth reception time for light travel.
    { t: elapsed(79, 24, 41.55), event: 'Spent S-IVB strikes the Moon' },
    { t: elapsed(100, 39, 16.2), event: 'Falcon and Endeavour separate in lunar orbit' },
    { t: elapsed(104, 30, 9.4), event: 'Falcon ignites its descent engine' },
    { t: elapsed(104, 42, 29.3), event: 'Falcon lands at Hadley–Apennine' },
    { t: elapsed(106, 42, 49), event: 'Falcon’s cabin depressurizes for Scott’s stand-up survey' },
    { t: elapsed(119, 39, 17), event: 'Cabin depressurizes for the first excursion, with the rover still folded on Falcon' },
    { t: elapsed(142, 14, 48), event: 'Second surface excursion begins, toward the Apennine Front' },
    { t: elapsed(163, 18, 14), event: 'Third surface excursion begins, toward Hadley Rille' },
    { t: elapsed(171, 37, 23.2), event: 'Falcon lifts off in view of the rover’s television camera' },
    { t: elapsed(173, 36, 25.5), event: 'Falcon docks with Endeavour' },
    { t: elapsed(179, 30, 1.4), event: 'Crew jettisons Falcon’s ascent stage' },
    { t: elapsed(181, 29, 37), event: 'Falcon’s ascent stage strikes the Moon' },
    { t: elapsed(222, 39, 29.1), event: 'Endeavour releases the subsatellite into lunar orbit' },
    { t: elapsed(223, 48, 45.84), event: 'Endeavour fires its service engine for Earth' },
    { t: elapsed(241, 57, 12), event: 'Worden begins the spacewalk to retrieve the two camera film cassettes' },
    { t: elapsed(242, 36, 19), event: 'Transearth spacewalk ends' },
    { t: elapsed(294, 43, 55.2), event: 'Command and service modules separate' },
    { t: elapsed(295, 11, 53), event: 'Endeavour splashes down on two main parachutes' },
  ],
  specs: [
    specification(rocket, 'Height on the pad', 363 * 0.3048, 'm', 'Apollo 15 Press Kit, Saturn V launch vehicle'),
    specification(
      rocket,
      'Mass at ground ignition',
      6494415 * lb,
      'kg',
      'AS-510 Flight Evaluation Report, table 16-2, actual ground ignition weight, 6,494,415 lb',
    ),
    {
      group: 'Spacecraft',
      label: 'Length from engine exit to docking plane',
      value: 404.25 * 0.0254,
      unit: 'm',
      confidence: 'assumed',
      note: 'Block II stations XA706 to XA1000 plus Xc110.25, NASA TN D-6854 fig. A-13, applied to CSM-112.',
    },
    specification(
      rocket,
      'Mass at liftoff',
      6399652 * lb,
      'kg',
      'AS-510 Flight Evaluation Report, table 16-2, actual weight at holddown-arm release, 6,399,652 lb',
    ),
    specification('Spacecraft', 'CSM at transposition', 66885 * lb, 'kg', masses),
    specification('Lunar module · Falcon', 'LM at transposition', 36220 * lb, 'kg', masses),
    specification('Mission', 'Duration of flight', elapsed(295, 11, 53), 's', report),
  ],
  motors: APOLLO15_THRUST,
  models: [
    {
      id: 'vehicle',
      name: 'Apollo 15 · Saturn V',
      url: 'models/usa/apollo/apollo-15/vehicle.glb',
      backdrop: 'ground',
      cutaway: true,
      dockingPorts: [endeavourPort, falconPort],
      ...cabin,
      cabin: { ...cabin.cabin, within: [...cabin.cabin.within, 'WaterDispenser'] },
      seats: [
        { node: 'Seat_Commander', figure: 'crew', label: 'Scott’s left couch', from: 'SideHatch', open: boarding },
        { node: 'Seat_CommandModulePilot', figure: 'pilot', label: 'Worden’s centre couch', from: 'SideHatch', open: boarding },
        { node: 'Seat_LunarModulePilot', figure: 'lmp', label: 'Irwin’s right couch', from: 'SideHatch', open: boarding },
      ],
      scale: '363 ft / 110.64 m to the escape tower tip',
      slider: ['Assembled', 'Taken apart'],
      views: [
        { id: 'launcher', label: 'Saturn V', nodes: nodes(launcher) },
        { id: 'escape', label: 'Escape tower', nodes: nodes(escapeParts) },
        ...endeavourViews,
        { id: 'falcon', label: 'Falcon in adapter', nodes: nodes(falconStackParts), isolate: true, from: [1, 0.12, -0.25] },
        ...falconStackViews,
        ...stackViews,
        { id: 'f1', label: 'F-1 cluster', nodes: ['FirstStageEngines'], from: [-0.62, 0.08, 0.78] },
      ],
      parts: boardingHatches([...endeavourCommand, ...endeavourService, ...falconStackParts, ...escapeParts, ...launcher], boarding, {
        openBy: boarding[0],
        coverClosedBy: coverCloseout,
      }),
    },
    falconModel,
    mobileLauncher(3, {
      holdDowns: 'as-510',
      ingress,
      parkCommand: -3180,
      parkedBy: -3150,
      pao: 'Kennedy Launch Control, 26 July 1971. At T−53:00 arm 9 was commanded to standby. The 30-second travel is estimated. Launch Control reported full retraction beginning near T−5.',
      intertankClear: -17,
      forwardRetract: -16.2,
      firstMotion: 0.3,
      terminalSource:
        'Saturn V Flight Manual SA-510, figure 8-20 (nominal terminal sequence). AS-510 Flight Evaluation Report, tables 2-1 and 2-2 and §3.6.1 (first motion and mast strokes).',
    }),
    ...lc39Crew(['Scott', 'Worden', 'Irwin'], true, [
      {
        url: 'models/usa/apollo/apollo-15/crew.glb',
        scale: 'Scott · 6 ft · A7LB EV',
        torso: 'The commander’s garment has six chest connectors, a side-entry closure and a flexible waist for sitting on the rover.',
      },
      {
        url: 'models/usa/apollo/apollo-15/pilot.glb',
        scale: 'Worden · 5 ft 10½ in · A7LB CMP',
        torso:
          'Worden’s rear-entry garment has three chest connectors. He wore it outside Endeavour to retrieve film on the return flight.',
      },
      {
        url: 'models/usa/apollo/apollo-15/lmp.glb',
        scale: 'Irwin · 5 ft 8 in · A7LB EV',
        torso:
          'The lunar module pilot’s garment has six chest connectors, a side-entry closure and a flexible waist for sitting on the rover.',
      },
    ]),
    roverModel(15),
  ],
};

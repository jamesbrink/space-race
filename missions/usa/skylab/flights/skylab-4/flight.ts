import type { Flight } from '../../../../../src/types.ts';
import { blockIICabin } from '../../../apollo/vehicles/cabin.ts';
import { nodes } from '../../../apollo/vehicles/stack-gallery.ts';
import { spacecraftMotors } from '../../vehicles/csm-motors.ts';
import { command, csmViews, port, service } from './csm118.ts';
import { specs, timeline } from './record.ts';
import { launcher, SA208_THRUST, stackViews } from './sa208.ts';

// Shared Skylab stack registration, MSFC-MAN-206 figure 1-1: vehicle station of CM Xc zero, inches.
const cabin = blockIICabin(2196.859);
// SL-4 press kit p. 31 schedules ingress at T−2:40, before a two-minute hold.
// Pressure-hatch closeout is estimated. Gallery seats are available throughout.
const ingress: [number, number] = [-9720, -5400];

export const flight: Flight = {
  id: 'usa/skylab/skylab-4',
  nation: 'USA',
  agency: 'NASA',
  program: 'Skylab',
  designation: 'Skylab 4 · SL-4',
  callsign: 'CSM-118',
  spacecraft: 'Apollo CSM-118',
  launchVehicle: 'Saturn IB · SA-208',
  launch: '1973-11-16T14:01:23Z',
  launchSite: 'Launch Complex 39B, Kennedy Space Center',
  crew: ['Gerald P. Carr', 'Edward G. Gibson', 'William R. Pogue'],
  summary:
    'Carr, Gibson and Pogue brought food and instruments for the final expedition to Skylab. From the workshop they observed the Sun for nearly three months and photographed Comet Kohoutek as it passed through the inner solar system.',
  facts: [
    { label: 'Crew', value: 'Carr · commander, Gibson · science pilot, Pogue · pilot' },
    { label: 'Destination', value: 'Skylab orbital workshop · forward docking port' },
    { label: 'Recovery', value: 'Pacific Ocean · USS New Orleans · 8 February 1974' },
  ],
  timeline,
  specs,
  motors: [...SA208_THRUST, ...spacecraftMotors],
  models: [
    {
      id: 'vehicle',
      name: 'Skylab 4 · Saturn IB',
      url: 'models/usa/skylab/skylab-4/vehicle.glb',
      backdrop: 'studio',
      cutaway: true,
      ...cabin,
      cabin: {
        ...cabin.cabin,
        within: [...cabin.cabin.within, 'WaterDispenser', 'ExtendedVisitFood', 'CometBracketCase', 'ExperimentStowage', 'S201Camera'],
      },
      dockingPorts: [port],
      seats: [
        { node: 'Seat_Commander', label: 'Carr’s left couch', from: 'SideHatch', open: ingress },
        { node: 'Seat_CommandModulePilot', label: 'Gibson’s centre couch', from: 'SideHatch', open: ingress },
        { node: 'Seat_LunarModulePilot', label: 'Pogue’s right couch', from: 'SideHatch', open: ingress },
      ],
      scale: '223.5 ft / 68.12 m to the escape tower tip',
      slider: ['Assembled', 'Taken apart'],
      views: [{ id: 'launcher', label: 'Saturn IB', nodes: nodes(launcher) }, ...csmViews, ...stackViews],
      parts: [...command, ...service, ...launcher],
    },
  ],
};

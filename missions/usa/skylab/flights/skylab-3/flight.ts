import type { Flight } from '../../../../../src/types.ts';
import { blockIICabin } from '../../../apollo/vehicles/cabin.ts';
import { nodes } from '../../../apollo/vehicles/stack-gallery.ts';
import { spacecraftMotors } from '../../vehicles/csm-motors.ts';
import { command, csmViews, port, service } from './csm117.ts';
import { specs, timeline } from './record.ts';
import { launcher, SA207_THRUST, stackViews } from './sa207.ts';

// Shared Skylab stack registration, MSFC-MAN-206 figure 1-1: vehicle station of CM Xc zero, inches.
const cabin = blockIICabin(2196.859);
// Press kit p. 20 schedules ingress at T−2:40, before a two-minute hold.
// Pressure-hatch closeout is estimated. Gallery seats are available throughout.
const ingress: [number, number] = [-9720, -5400];

export const flight: Flight = {
  id: 'usa/skylab/skylab-3',
  nation: 'USA',
  agency: 'NASA',
  program: 'Skylab',
  designation: 'Skylab 3 · SL-3',
  callsign: 'CSM-117',
  spacecraft: 'Apollo CSM-117',
  launchVehicle: 'Saturn IB · SA-207',
  launch: '1973-07-28T11:10:50Z',
  launchSite: 'Launch Complex 39B, Kennedy Space Center',
  crew: ['Alan L. Bean', 'Owen K. Garriott', 'Jack R. Lousma'],
  summary:
    'Bean, Garriott and Lousma took CSM-117 to the workshop for its second crewed visit. Two service-module thruster groups developed leaks. While engineers prepared a rescue option, the crew installed a new sunshade and continued their observations of the Sun, Earth and themselves.',
  facts: [
    { label: 'Crew', value: 'Bean · commander, Garriott · science pilot, Lousma · pilot' },
    { label: 'Destination', value: 'Skylab orbital workshop · forward docking port' },
    { label: 'Recovery', value: 'Pacific Ocean · USS New Orleans · 25 September 1973' },
  ],
  timeline,
  specs,
  motors: [...SA207_THRUST, ...spacecraftMotors],
  models: [
    {
      id: 'vehicle',
      name: 'Skylab 3 · Saturn IB',
      url: 'models/usa/skylab/skylab-3/vehicle.glb',
      backdrop: 'studio',
      cutaway: true,
      ...cabin,
      cabin: { ...cabin.cabin, within: [...cabin.cabin.within, 'WaterDispenser', 'BackupParasol', 'RateGyroPackages'] },
      dockingPorts: [port],
      seats: [
        { node: 'Seat_Commander', label: 'Bean’s left couch', from: 'SideHatch', open: ingress },
        { node: 'Seat_CommandModulePilot', label: 'Garriott’s centre couch', from: 'SideHatch', open: ingress },
        { node: 'Seat_LunarModulePilot', label: 'Lousma’s right couch', from: 'SideHatch', open: ingress },
      ],
      scale: '223.5 ft / 68.12 m to the escape tower tip',
      slider: ['Assembled', 'Taken apart'],
      views: [{ id: 'launcher', label: 'Saturn IB', nodes: nodes(launcher) }, ...csmViews, ...stackViews],
      parts: [...command, ...service, ...launcher],
    },
  ],
};

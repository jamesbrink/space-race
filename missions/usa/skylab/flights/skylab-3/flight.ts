import type { Flight } from '../../../../../src/types.ts';
import { blockIICabin } from '../../../apollo/vehicles/cabin.ts';
import { boardingHatches } from '../../../apollo/vehicles/hatch.ts';
import { nodes } from '../../../apollo/vehicles/stack-gallery.ts';
import { LC39B } from '../../../places/cape-canaveral/lc-39.ts';
import { sa207Elevation, sl3Ingress as ingress, sl3Launcher } from '../../../places/cape-canaveral/lc39-skylab.ts';
import { spacecraftMotors } from '../../vehicles/csm-motors.ts';
import { launchCrew } from './crew.ts';
import { command, csmViews, port, service } from './csm117.ts';
import { specs, timeline } from './record.ts';
import { launcher, SA207_THRUST, stackViews } from './sa207.ts';
import { WEATHER } from './weather.ts';

// Shared Skylab stack registration, MSFC-MAN-206 figure 1-1: vehicle station of CM Xc zero, inches.
const cabin = blockIICabin(2196.859);

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
  site: LC39B,
  weather: WEATHER,
  opens: { at: ingress[0], model: 'pad', view: 'launcher' },
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
      backdrop: 'ground',
      position: [0, sa207Elevation, 0],
      cutaway: true,
      ...cabin,
      cabin: { ...cabin.cabin, within: [...cabin.cabin.within, 'WaterDispenser', 'BackupParasol', 'RateGyroPackages'] },
      dockingPorts: [port],
      seats: [
        { node: 'Seat_Commander', figure: 'crew', label: 'Bean’s left couch', from: 'SideHatch', open: ingress },
        { node: 'Seat_CommandModulePilot', figure: 'science-pilot', label: 'Garriott’s centre couch', from: 'SideHatch', open: ingress },
        { node: 'Seat_LunarModulePilot', figure: 'pilot', label: 'Lousma’s right couch', from: 'SideHatch', open: ingress },
      ],
      scale: '223.5 ft / 68.12 m to the escape tower tip',
      slider: ['Assembled', 'Taken apart'],
      views: [{ id: 'launcher', label: 'Saturn IB', nodes: nodes(launcher) }, ...csmViews, ...stackViews],
      parts: boardingHatches([...command, ...service, ...launcher], ingress, { openBy: ingress[0], coverClosedBy: -69 * 60 }),
    },
    sl3Launcher,
    ...launchCrew,
  ],
};

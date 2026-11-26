import type { Flight } from '../../../../../src/types.ts';
import { blockIICabin } from '../../../apollo/vehicles/cabin.ts';
import { boardingHatches } from '../../../apollo/vehicles/hatch.ts';
import { LC39B } from '../../../places/cape-canaveral/lc-39.ts';
import { sa208Elevation, sl4Ingress as ingress, sl4Launcher } from '../../../places/cape-canaveral/lc39-skylab.ts';
import { nodes } from '../../../apollo/vehicles/stack-gallery.ts';
import { spacecraftMotors } from '../../vehicles/csm-motors.ts';
import { workshopModel } from '../../vehicles/workshop-gallery.ts';
import { launchCrew } from './crew.ts';
import { command, csmViews, port, service } from './csm118.ts';
import { specs, timeline } from './record.ts';
import { launcher, SA208_THRUST, stackViews } from './sa208.ts';
import { WEATHER } from './weather.ts';

// Shared Skylab stack registration, MSFC-MAN-206 figure 1-1: vehicle station of CM Xc zero, inches.
const cabin = blockIICabin(2196.859);
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
  site: { ...LC39B, zone: { name: 'EST', utcOffset: -5 } },
  weather: WEATHER,
  opens: { at: ingress[0], model: 'pad', view: 'launcher' },
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
      backdrop: 'ground',
      position: [0, sa208Elevation, 0],
      cutaway: true,
      ...cabin,
      cabin: {
        ...cabin.cabin,
        within: [...cabin.cabin.within, 'WaterDispenser', 'ExtendedVisitFood', 'CometBracketCase', 'ExperimentStowage', 'S201Camera'],
      },
      dockingPorts: [port],
      seats: [
        { node: 'Seat_Commander', figure: 'crew', label: 'Carr’s left couch', from: 'SideHatch', open: ingress },
        { node: 'Seat_CommandModulePilot', figure: 'science-pilot', label: 'Gibson’s centre couch', from: 'SideHatch', open: ingress },
        { node: 'Seat_LunarModulePilot', figure: 'pilot', label: 'Pogue’s right couch', from: 'SideHatch', open: ingress },
      ],
      scale: '223.5 ft / 68.12 m to the escape tower tip',
      slider: ['Assembled', 'Taken apart'],
      views: [{ id: 'launcher', label: 'Saturn IB', nodes: nodes(launcher) }, ...csmViews, ...stackViews],
      parts: boardingHatches([...command, ...service, ...launcher], ingress, { openBy: ingress[0], coverClosedBy: -69 * 60 }),
    },
    sl4Launcher,
    ...launchCrew,
    workshopModel(4),
  ],
};

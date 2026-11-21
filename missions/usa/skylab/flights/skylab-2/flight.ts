import type { Flight } from '../../../../../src/types.ts';
import { blockIICabin } from '../../../apollo/vehicles/cabin.ts';
import { boardingHatches } from '../../../apollo/vehicles/hatch.ts';
import { nodes } from '../../../apollo/vehicles/stack-gallery.ts';
import { LC39B } from '../../../places/cape-canaveral/lc-39.ts';
import { sl2Ingress as ingress, sa206Elevation, skylabLauncher } from '../../../places/cape-canaveral/lc39-skylab.ts';
import { spacecraftMotors } from '../../vehicles/csm-motors.ts';
import { workshopModel } from '../../vehicles/workshop-gallery.ts';
import { launchCrew } from './crew.ts';
import { command, csmViews, port, service } from './csm116.ts';
import { specs, timeline } from './record.ts';
import { launcher, SA206_THRUST, stackViews } from './sa206.ts';
import { WEATHER } from './weather.ts';

// MSFC-MAN-206, fig. 1-1. CM Xc zero in SA-206 vehicle stations, inches.
const cabin = blockIICabin(2196.859);
export const flight: Flight = {
  id: 'usa/skylab/skylab-2',
  nation: 'USA',
  agency: 'NASA',
  program: 'Skylab',
  designation: 'Skylab 2 · SL-2',
  callsign: 'CSM-116',
  spacecraft: 'Apollo CSM-116',
  launchVehicle: 'Saturn IB · SA-206',
  launch: '1973-05-25T13:00:00Z',
  launchSite: 'Launch Complex 39B, Kennedy Space Center',
  site: LC39B,
  weather: WEATHER,
  opens: { at: ingress[0], model: 'pad', view: 'launcher' },
  crew: ['Charles Conrad Jr.', 'Joseph P. Kerwin', 'Paul J. Weitz'],
  summary:
    'Eleven days after Skylab reached orbit with its sunshield torn away and one remaining solar wing jammed, Conrad, Kerwin and Weitz followed in CSM-116. They shaded the overheated workshop, freed the wing and brought their spacecraft back after 28 days.',
  facts: [
    { label: 'Crew', value: 'Conrad · commander, Kerwin · science pilot, Weitz · pilot' },
    { label: 'Destination', value: 'Skylab orbital workshop · forward docking port' },
    { label: 'Recovery', value: 'Pacific Ocean · USS Ticonderoga · 22 June 1973' },
  ],
  timeline,
  specs,
  motors: [...SA206_THRUST, ...spacecraftMotors],
  models: [
    {
      id: 'vehicle',
      name: 'Skylab 2 · Saturn IB',
      url: 'models/usa/skylab/skylab-2/vehicle.glb',
      backdrop: 'ground',
      position: [0, sa206Elevation, 0],
      cutaway: true,
      ...cabin,
      cabin: { ...cabin.cabin, within: [...cabin.cabin.within, 'WaterDispenser', 'ParasolCanister'] },
      dockingPorts: [port],
      seats: [
        { node: 'Seat_Commander', figure: 'crew', label: 'Conrad’s left couch', from: 'SideHatch', open: ingress },
        { node: 'Seat_CommandModulePilot', figure: 'science-pilot', label: 'Kerwin’s centre couch', from: 'SideHatch', open: ingress },
        { node: 'Seat_LunarModulePilot', figure: 'pilot', label: 'Weitz’s right couch', from: 'SideHatch', open: ingress },
      ],
      scale: '223.5 ft / 68.12 m to the escape tower tip',
      slider: ['Assembled', 'Taken apart'],
      views: [{ id: 'launcher', label: 'Saturn IB', nodes: nodes(launcher) }, ...csmViews, ...stackViews],
      parts: boardingHatches([...command, ...service, ...launcher], ingress, { openBy: ingress[0], coverClosedBy: -58 * 60 }),
    },
    skylabLauncher,
    ...launchCrew,
    workshopModel(2),
  ],
};

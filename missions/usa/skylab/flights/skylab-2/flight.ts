import type { Flight, Motor } from '../../../../../src/types.ts';
import { blockIICabin } from '../../../apollo/vehicles/cabin.ts';
import { boardingHatches } from '../../../apollo/vehicles/hatch.ts';
import { nodes } from '../../../apollo/vehicles/stack-gallery.ts';
import { LC39B } from '../../../places/cape-canaveral/lc-39.ts';
import { sl2Ingress as ingress, sa206Elevation, skylabLauncher } from '../../../places/cape-canaveral/lc39-skylab.ts';
import { launchCrew } from './crew.ts';
import { command, csmViews, port, service } from './csm116.ts';
import { specs, timeline } from './record.ts';
import { launcher, SA206_THRUST, stackViews } from './sa206.ts';
import { WEATHER } from './weather.ts';

// MSFC-MAN-206, fig. 1-1. CM Xc zero in SA-206 vehicle stations, inches.
const cabin = blockIICabin(2196.859);
const lbf = 4.4482216152605;
const handbook = 'Skylab Operations Handbook, CSM 116–118, vol. I';
const spacecraftMotors: Motor[] = [
  {
    name: 'Service propulsion engine',
    count: 1,
    thrustN: 20500 * lbf,
    propellant: 'Aerozine 50 / nitrogen tetroxide',
    operation: 'Rendezvous and deorbit',
    confidence: 'assumed',
    note: `${handbook}, §2.4. The nominal Block II thrust comes from the Apollo 17 press kit, p. 98.`,
  },
  {
    name: 'SM attitude thruster',
    count: 16,
    thrustN: 100 * lbf,
    propellant: 'MMH / nitrogen tetroxide',
    confidence: 'assumed',
    note: `${handbook}, §2.5. Four quads of four jets. Nominal thrust from the Apollo 13 press kit, p. 82.`,
  },
  {
    name: 'CM attitude thruster',
    count: 12,
    thrustN: 93 * lbf,
    propellant: 'MMH / nitrogen tetroxide',
    confidence: 'assumed',
    note: `${handbook}, §2.5. Two independent entry systems. Nominal thrust from the Apollo 13 press kit, p. 82.`,
  },
];
for (const [name, pounds, seconds] of [
  ['Launch escape motor', 147000, 8],
  ['Pitch control motor', 2850, 0.6],
  ['Tower jettison motor', 32000, 1.1],
] as const) {
  spacecraftMotors.push({
    name,
    count: 1,
    thrustN: pounds * lbf,
    burnS: seconds,
    propellant: 'Ammonium perchlorate / polysulphide',
    kind: 'solid',
    confidence: 'documented',
    note: `${handbook}, §2.9.9.2, pp. 2.9-101–102. Nominal resultant thrust at sea level and 70 °F.`,
  });
}

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
  ],
};

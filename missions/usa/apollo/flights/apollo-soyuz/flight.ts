import type { Flight, Motor } from '../../../../../src/types.ts';
import { blockIICabin } from '../../vehicles/cabin.ts';
import { nodes, rocket } from '../../vehicles/stack-gallery.ts';
import { command, csmViews, port, service } from './csm111.ts';
import { launchUTC, specs, timeline } from './record.ts';
import { dockingModuleParts, launcher, SA210_THRUST, stackViews } from './sa210.ts';

const lbf = 4.4482216152605;
const serviceMotor: Motor = {
  name: 'Service propulsion engine',
  count: 1,
  thrustN: 20500 * lbf,
  propellant: 'Aerozine 50 / nitrogen tetroxide',
  operation: 'Orbit adjustments and deorbit',
  confidence: 'documented',
  note: 'Apollo–Soyuz Test Project press kit, Apollo spacecraft, nominal SPS thrust.',
};
// MSFC-MAN-206 fig. 1-1 gives the shared Saturn IB/Block II registration.
const cabin = blockIICabin(2196.859);
// NASA SP-4209 ch. XI and countdown commentary MC34 bracket boarding. The hatch window is approximate.
const ingress: [number, number] = [-10080, -8880];

export const flight: Flight = {
  id: 'usa/apollo/apollo-soyuz',
  nation: 'USA',
  agency: 'NASA',
  program: 'Apollo',
  designation: 'Apollo–Soyuz',
  callsign: 'CSM-111',
  spacecraft: 'Apollo CSM-111',
  launchVehicle: 'Saturn IB · SA-210',
  launch: launchUTC,
  launchSite: 'Launch Complex 39B, Kennedy Space Center',
  crew: ['Thomas P. Stafford', 'Vance D. Brand', 'Donald K. Slayton'],
  summary:
    'Stafford, Brand and Slayton took Apollo to meet Soyuz 19. They retrieved the docking module from the Saturn’s upper stage and used it as an airlock between the two spacecraft.',
  facts: [
    { label: 'Crew', value: 'Stafford · commander, Brand · command module pilot, Slayton · docking module pilot' },
    { label: 'Rendezvous', value: 'Soyuz 19 · Leonov and Kubasov · 17 July 1975' },
    { label: 'Recovery', value: 'Pacific Ocean · USS New Orleans · 24 July 1975' },
  ],
  timeline,
  specs,
  motors: [...SA210_THRUST, serviceMotor],
  models: [
    {
      id: 'vehicle',
      name: 'Apollo–Soyuz · Saturn IB',
      url: 'models/usa/apollo/apollo-soyuz/vehicle.glb',
      backdrop: 'studio',
      cutaway: true,
      ...cabin,
      cabin: {
        ...cabin.cabin,
        within: [...cabin.cabin.within, 'WaterDispenser', 'ASTPExperimentControls', 'ASTPVideoRecorder'],
      },
      dockingPorts: [port],
      seats: [
        { node: 'Seat_Commander', label: 'Stafford’s left couch', from: 'SideHatch', open: ingress },
        { node: 'Seat_CommandModulePilot', label: 'Brand’s centre couch', from: 'SideHatch', open: ingress },
        { node: 'Seat_LunarModulePilot', label: 'Slayton’s right couch', from: 'SideHatch', open: ingress },
      ],
      scale: '223.5 ft / 68.12 m to the escape tower tip',
      slider: ['Assembled', 'Taken apart'],
      views: [
        { id: 'launcher', label: 'Saturn IB', nodes: nodes(launcher.filter((part) => part.group === rocket)) },
        ...csmViews,
        ...stackViews,
      ],
      parts: [...command, ...service, ...dockingModuleParts, ...launcher],
    },
  ],
};

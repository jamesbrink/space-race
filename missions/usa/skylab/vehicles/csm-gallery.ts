import type { ViewDef } from '../../../../src/types.ts';
import { cm, part, sm } from '../../apollo/vehicles/stack-gallery.ts';

export const cabinStructure = cm(
  'CabinStructure',
  'Cabin pressure vessel',
  'A domed pressure vessel enclosed the three couches and the working space beneath them.',
  'The outline follows the shared Block II structure. Skylab’s handbook shows the centre couch folded aside to reach the lower equipment bay and docking tunnel.',
  true,
);

export const mainConsole = cm(
  'MainConsole',
  'Main display console',
  'The main panels placed flight, guidance and spacecraft systems controls in reach from the couches.',
  'The exhibit uses the later Block II panel geometry as its reference. The Skylab handbook records dedicated descent-battery selection on panel 5. Individual Skylab switch legends are incomplete.',
  true,
);

export const dsky = cm(
  'DSKYFrontWeb',
  'Guidance computer display and keyboard',
  'The crew entered verb and noun commands at the guidance computer keyboard.',
  'A magnified view exposes individual keys, bezels and display windows. The Skylab Operations Handbook shows the DSKY above the lower equipment bay.',
  true,
);

export const consoleEquipment = cm(
  'ConsoleEquipment',
  'Control-panel instruments',
  'Switch guards, annunciators and meters fill the panels facing the crew.',
  'Skylab used station power during the docked stay and carried separate batteries for its return. Positions of the instruments shown are assumed from the later Block II console. Their readings are static.',
  true,
);

export const waterDispenser = cm(
  'WaterDispenser',
  'Drinking-water pistol',
  'The water pistol was clipped underneath the main panels.',
  'The crew could extend its coiled hose to 108 inches. A second valve in the grip supplied a spray for fighting a cabin fire. The pistol and its clip use the shared Apollo reconstruction.',
  true,
);

export const forwardShield = part(
  'ForwardShield',
  'Forward heat shield',
  'Spacecraft',
  1,
  57,
  'The forward shield covered the parachutes during atmospheric entry.',
  'Jettison exposed the recovery gear for deployment above the Pacific. The ring opening accommodates the Skylab docking probe.',
);

export const propellantStorageModule = sm(
  'PropellantStorageModule',
  'Auxiliary thruster propellant module',
  'A compact rack in sector I could feed all four reaction-control quads.',
  'The Skylab handbook specifies five oxidizer vessels and four fuel vessels, each 38.819 inches long and at most 12.64 inches across. Three helium spheres supplied pressure. Tank arrangement and rack details within the sector are estimated.',
  true,
);

export const descentBatteries = sm(
  'DescentBatteries',
  'Three descent batteries',
  'Three 500 ampere-hour silver-zinc batteries could power the spacecraft on its return from the station.',
  'The fuel cells could be shut down after docking. Each battery held twenty cells and weighed about 250 pounds. The cases, terminals and mounts represent the pack in bay I. Their exact shapes are estimated.',
  true,
);

export const serviceWaterTank = sm(
  'ServiceWaterTank',
  'Service-module water tank',
  'An additional water tank occupied the centre section below the helium vessel.',
  'The fuel cells made water as they generated current. Surplus water could be routed to this tank instead of being dumped. Its envelope and fitting locations are estimated from the handbook section drawing.',
  true,
);

export const serviceSumpTanks = sm(
  'ServiceSumpTanks',
  'Service propulsion sump tanks',
  'The main engine drew fuel and oxidizer from a pair of sump tanks.',
  'The lunar spacecraft’s two additional storage tanks and intertank transfer lines were absent. One long sump vessel occupied sector II, the other sector V.',
  true,
);

export const serviceHelium = sm(
  'ServiceHelium',
  'Service propulsion helium tank',
  'A single spherical vessel supplied helium to pressurize the service propulsion tanks.',
  'The Skylab handbook’s section drawing places the sphere above the service-module water tank. Its dimensions are assumed from common Apollo SPS hardware.',
  true,
);

export const serviceEngine = sm(
  'ServiceEngine',
  'Service propulsion engine',
  'The gimballed main engine changed the spacecraft’s orbit and later began the trip home.',
  'The injector, chamber, actuators and long nozzle use the common Apollo service propulsion installation. The engine remained with the service module at separation.',
);

export const vhf = sm(
  'VHFAntennas',
  'VHF scimitar antennas',
  'Two low-profile antennas stood on opposite sides of the service module.',
  'Their curved ceramic housings gave the antennas their scimitar name. Switching antennas provided coverage around the spacecraft. Their sections follow Skylab handbook figure 2.8-32, with estimated dimensions.',
);

export const equipmentViews: ViewDef[] = [
  {
    id: 'propellant-module',
    label: 'Thruster propellant module',
    nodes: ['PropellantStorageModule'],
    isolate: true,
    onSelect: true,
    from: [0.78, 0.35, -0.6],
  },
  {
    id: 'descent-batteries',
    label: 'Descent batteries',
    nodes: ['DescentBatteries'],
    isolate: true,
    onSelect: true,
    from: [0.65, 0.51, -0.63],
  },
  {
    id: 'centre-section',
    label: 'Centre section',
    nodes: ['ServiceHelium', 'ServiceWaterTank', 'ServiceEngine'],
    isolate: true,
    from: [0.7, 0.09, 0.71],
  },
  { id: 'sector-iv', label: 'Fuel cells and reactants', nodes: ['ServicePower'], isolate: true, from: [-0.77, 0.18, 0.64] },
  { id: 'hatch', label: 'Crew hatch', nodes: ['SideHatch'], isolate: true, from: [-0.85, -0.53, 0.1], span: 1.75 },
  { id: 'probe', label: 'Skylab docking probe', nodes: ['DockingProbe'], isolate: true, from: [1, 0.82, 0.4], span: 1.55 },
  {
    id: 'console',
    label: 'Main console',
    nodes: ['MainConsole', 'ConsoleEquipment', 'FlightDirectorIndicators', 'DSKYFrontWeb'],
    isolate: true,
    from: [0.3, -1, 0],
  },
  { id: 'navigation', label: 'Navigation station', nodes: ['CabinEquipmentBays'], isolate: true, from: [1, 0.5, 0.3] },
  {
    id: 'water',
    label: 'Drinking-water pistol',
    nodes: ['WaterDispenser'],
    isolate: true,
    from: [0.45, 0.3, -1],
    span: 0.36,
    onSelect: true,
  },
  { id: 'dsky', label: 'Computer keyboard', nodes: ['DSKYFrontWeb'], from: [0.3, -1, 0] },
  { id: 'couches', label: 'Crew couches', nodes: ['CrewCouches'], span: 2.1, from: [-1, 0.8, 0.6] },
  { id: 'sps', label: 'Service engine', nodes: ['ServiceEngine'], from: [-1, -0.35, 1] },
];

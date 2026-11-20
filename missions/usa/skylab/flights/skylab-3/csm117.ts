import type { Part, ViewDef } from '../../../../../src/types.ts';
import { cm, lift, nodes, part, probePort, sm } from '../../../apollo/vehicles/stack-gallery.ts';

import * as common from '../../vehicles/csm-gallery.ts';

export const port = probePort(117);
export const command: Part[] = [
  cm(
    'BackupParasol',
    'Improved spare parasol',
    'A second parasol rode on top of the command module’s aft lockers.',
    'Installing it would have meant taking down the first crew’s shade. The crew instead erected the Marshall twin-pole sail above the old parasol. The Gallery shows the spare in its launch wrapping.',
    true,
  ),
  cm(
    'RateGyroPackages',
    'Replacement rate-gyro packages',
    'These packages brought six spare gyro processors up to the workshop.',
    'Two processors came with a bracket, four were L-shaped. The kit also brought a distributor, cables and tools. The six-pack was mounted inside Skylab. Lousma connected its external cable on the second spacewalk. The packages here depict their covered launch configuration.',
    true,
  ),
  cm(
    'CommandModule',
    'Command module 117',
    'Bean, Garriott and Lousma lived aboard this capsule during rendezvous and returned in it after 59 days in space.',
    'A white coating on the sun-facing side and thermal tape around the shoulder protected the docked spacecraft. The second-visit report records the same thermal configuration as CSM-116 except for the service-module electrical radiators.',
  ),
  cm(
    'SideHatch',
    'Unified side hatch',
    'This outward-opening hatch provided side entry to the pressure cabin and access for the recovery crew.',
    'After the Pacific splashdown on September 25, Navy swimmers stabilized the command module. The spacecraft and crew were brought aboard USS New Orleans.',
  ),
  common.cabinStructure,
  cm(
    'CabinWindows',
    'Cabin windows',
    'Five windows gave the crew views of Skylab, docking targets and the Earth.',
    'During rendezvous the crew saw bright particles through the right-hand window. Pressure and attitude data corroborated an oxidizer leak from the forward-firing engine in quad B.',
  ),
  cm(
    'CrewCouches',
    'Three crew couches',
    'The launch couches were assigned to Bean on the left, Garriott in the centre and Lousma on the right.',
    'On entry day the centre couch frame would not lock upright. Tightening a loose screw at each shoulder break point let the crew lock it for the return.',
    true,
  ),
  common.mainConsole,
  cm(
    'FlightDirectorIndicators',
    'Flight director attitude indicators',
    'Two spherical attitude displays showed the orientation of the command module.',
    'During rendezvous a horizon check mistook the terminator for the horizon. Garriott attempted a star check and the crew compared the guidance alignment with the gyro display coupler.',
    true,
  ),
  common.dsky,
  common.consoleEquipment,
  cm(
    'CabinEquipmentBays',
    'Navigation and equipment bays',
    'The lower equipment bay gave the crew access to the navigation optics and equipment lockers.',
    'All available locker space was used at launch. The improved parasol, gyro packages and replacement boots travelled above the aft bulkhead lockers. The mission report distinguishes this load from the film, samples and hardware carried home.',
    true,
  ),
  common.waterDispenser,
  cm(
    'ForwardCompartment',
    'Forward tunnel and recovery compartment',
    'The central tunnel carried the crew through the capture ring to Skylab’s axial docking port.',
    'On the way home the forward shield left the spacecraft to expose the parachutes. The reconstruction shows the common Block II recovery compartment and combined tunnel hatch.',
    true,
  ),
  {
    ...cm(
      'DockingProbe',
      'Docking probe and ring latches',
      'The nose probe engaged the drogue at the axial port of Skylab’s multiple docking adapter.',
      'Initial capture and hard docking were separate operations. Retracting the probe drew the two rings together so the twelve perimeter latches could carry the structural load.',
      true,
    ),
    moves: [lift(2, 52), { kind: 'slide', node: port.piston, by: [0, port.captureTravel.value, 0], from: 0.56, to: 0.7 }],
  },
  common.forwardShield,
  part(
    'HeatShield',
    'Aft heat shield',
    'Spacecraft',
    3,
    48,
    'This broad ablative surface faced the heat of reentry on September 25, 1973.',
    'Its curvature and shoulder follow the Block II structural drawings. The cover, rear shield and cone separate in the exhibit so the crew compartment can be examined.',
  ),
];

export const service: Part[] = [
  sm(
    'ServiceModule',
    'Service module 117',
    'The cylindrical service module carried the spacecraft’s propulsion, power, cooling systems and the second visit’s biology experiment.',
    'Sector I contained the circadian-periodicity package as well as extra attitude-control propellant and the descent batteries. Eight electrical power radiator panels on the forward fairing flew without the first visit’s tape.',
  ),
  {
    ...sm(
      'CircadianExperiment',
      'S071/S072 circadian experiment',
      'A self-contained experiment in bay I carried six pocket mice and four compartments of vinegar gnat pupae.',
      'The two forward drums housed the mice and their environmental system. Four smaller enclosures on the rear shelf supported the insect experiment. The electronics sent the measurements home until an electrical failure on visit day two.',
      true,
    ),
    facts: [
      ['Flight package', '40 × 24 × 20 in · 243 lb'],
      ['Reference', 'Skylab Operations Handbook §2.11.4'],
    ],
  },
  common.propellantStorageModule,
  common.descentBatteries,
  common.serviceWaterTank,
  sm(
    'ServicePower',
    'Fuel cells and cryogenic tanks',
    'Fuel cell 1 powered bus A and fuel cell 3 powered bus B at launch.',
    'The buses were joined on visit day two. The radiator area in use was reduced from eight panels to five after low condenser temperature tripped an alarm. The fuel cells supplied 20,700 ampere-hours through shutdown on day 20.',
    true,
  ),
  common.serviceSumpTanks,
  common.serviceHelium,
  common.serviceEngine,
  sm(
    'ReactionControl',
    'Reaction-control quads',
    'Four independent thruster quads could turn or translate CSM-117 during rendezvous and departure.',
    'A leaking oxidizer valve on the positive-yaw engine forced isolation of quad B during rendezvous. Pressure loss in quad D while docked led to its isolation and rescue preparations. Quads A and C remained available, and the crew returned in CSM-117.',
  ),
  common.vhf,
];

export const csmViews: ViewDef[] = [
  { id: 'csm-117', label: 'CSM-117', nodes: [...nodes(command), ...nodes(service)], isolate: true, from: [-0.51, 0.24, -0.87] },
  {
    id: 'circadian',
    label: 'Circadian experiment',
    nodes: ['CircadianExperiment'],
    isolate: true,
    onSelect: true,
    from: [0.47, 0.46, -0.78],
  },
  {
    id: 'aft-lockers',
    label: 'Cargo above aft lockers',
    nodes: ['BackupParasol', 'RateGyroPackages'],
    isolate: true,
    from: [1, 0.72, 0.55],
  },
  { id: 'quad-b', label: 'Quad B · rendezvous leak', nodes: ['RCS_QuadB'], from: [0.4, 0.36, -1], span: 1.3 },
  { id: 'quad-d', label: 'Quad D · docked leak', nodes: ['RCS_QuadD'], from: [-0.4, 0.36, 1], span: 1.3 },
  {
    id: 'sector-i',
    label: 'Sector I equipment',
    nodes: ['PropellantStorageModule', 'DescentBatteries', 'CircadianExperiment'],
    isolate: true,
    from: [0.8, 0.13, -0.6],
  },
  ...common.equipmentViews,
];

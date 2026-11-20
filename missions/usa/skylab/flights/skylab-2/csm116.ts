import type { Part, ViewDef } from '../../../../../src/types.ts';
import { cm, lift, nodes, part, probePort, sm } from '../../../apollo/vehicles/stack-gallery.ts';

import * as common from '../../vehicles/csm-gallery.ts';

export const port = probePort(116);
export const command: Part[] = [
  cm(
    'ParasolCanister',
    'Packed workshop parasol',
    'A 53-inch-long, eight-inch-square canister carried a sunshade for the damaged workshop.',
    'The parasol used a spare T027 experiment canister with a sealed backplate for the deployment rods. The crew later fitted it to Skylab’s solar scientific airlock and pushed the canopy outside. The first-visit closeout astronaut recalled stowage under the couches. The exact mounting position and restraints are estimated.',
    true,
  ),
  cm(
    'CommandModule',
    'Command module 116',
    'This was the crew’s transport, observation post and ride home from Skylab.',
    'Conrad flew round the damaged workshop so the crew could photograph the missing shield and inspect its jammed solar wing. The capsule’s sun-facing thermal coating helped it endure weeks docked in one attitude. Thermal tape around the shoulder helped retain heat in the water and propellant tanks. The edges are estimated from the first-visit report.',
  ),
  cm(
    'SideHatch',
    'Unified side hatch',
    'The outward-opening hatch served both launch-pad entry and the crew’s attempted repair from the spacecraft.',
    'Weitz stood in the open hatch while Kerwin held his legs and Conrad flew alongside the workshop. The crew tried to free the solar wing with a pole tool. It remained jammed until a later spacewalk.',
  ),
  common.cabinStructure,
  cm(
    'CabinWindows',
    'Cabin windows',
    'The forward windows looked toward the station during docking. Two side windows and the hatch window completed the set.',
    'The five openings and the position of each pane use the CM-107 survey as a common Block II reference. The crew used the side windows to inspect and photograph Skylab before the first docking.',
  ),
  cm(
    'CrewCouches',
    'Three crew couches',
    'Conrad launched in the left couch, science pilot Kerwin in the centre and pilot Weitz on the right.',
    'The shock-absorbing supports carried landing loads to the pressure vessel. Pins released the centre couch for folding during orbital operations. The reconstruction shows the launch position.',
    true,
  ),
  common.mainConsole,
  cm(
    'FlightDirectorIndicators',
    'Flight director attitude indicators',
    'The two spherical attitude displays showed how the spacecraft was pointed.',
    'Conrad had to hold the spacecraft beside the jammed solar wing during the stand-up EVA. The display and gyro-ball detail are from the common Apollo installation and show a fixed attitude.',
    true,
  ),
  common.dsky,
  common.consoleEquipment,
  cm(
    'CabinEquipmentBays',
    'Navigation and equipment bays',
    'The lower equipment bay held the navigation optics and stowed equipment underneath the console.',
    'For the first visit the crew brought emergency sunshades and tools aboard. The optics and equipment bays follow common Block II hardware. The packed parasol lies under the couches.',
    true,
  ),
  common.waterDispenser,
  cm(
    'ForwardCompartment',
    'Forward tunnel and recovery compartment',
    'The passage into Skylab ran through the centre of the parachute compartment.',
    'The crew had difficulty making their final docking. They reopened the tunnel hatch to work on the docking mechanism before the connection finally held.',
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
    'This broad ablative surface faced the heat of reentry on June 22, 1973.',
    'Its curvature and shoulder follow the Block II structural drawings. The cover, rear shield and cone separate in the exhibit so the crew compartment can be examined.',
  ),
];

export const service: Part[] = [
  sm(
    'ServiceModule',
    'Service module 116',
    'Six radial sectors surrounded the service propulsion engine and its central equipment tunnel.',
    'The workshop ferry had different requirements from a lunar spacecraft. Sector I carried extra thruster propellant and batteries, and the core held an extra water tank.',
  ),
  common.propellantStorageModule,
  common.descentBatteries,
  common.serviceWaterTank,
  sm(
    'ServicePower',
    'Fuel cells and cryogenic tanks',
    'Two fuel cells shared sector IV with two oxygen and two hydrogen tanks.',
    'CSM-116 retained the units designated 1 and 3. The two cells continued operating until June 14, twenty days after launch. Thermal tape on electrical radiators 1, 5 and a quarter of panel 4 kept their cooling water warm enough to protect a line in the umbilical.',
    true,
  ),
  common.serviceSumpTanks,
  common.serviceHelium,
  common.serviceEngine,
  sm(
    'ReactionControl',
    'Reaction-control quads',
    'Four clusters of four jets controlled attitude and manoeuvred the spacecraft beside Skylab.',
    'The extra propellant module in sector I supplemented the quads’ own supplies. During the inspection and repair attempt, Conrad used these jets to position the spacecraft relative to the stranded workshop.',
  ),
  common.vhf,
];

export const csmViews: ViewDef[] = [
  { id: 'csm-116', label: 'CSM-116', nodes: [...nodes(command), ...nodes(service)], isolate: true, from: [-0.51, 0.24, -0.87] },
  {
    id: 'parasol',
    label: 'Packed workshop parasol',
    nodes: ['ParasolCanister'],
    isolate: true,
    onSelect: true,
    from: [0.95, 0.37, 0.58],
  },
  {
    id: 'sector-i',
    label: 'Sector I equipment',
    nodes: ['PropellantStorageModule', 'DescentBatteries'],
    isolate: true,
    from: [0.8, 0.13, -0.6],
  },
  ...common.equipmentViews,
];

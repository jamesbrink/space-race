import type { Move, Part, ViewDef } from '../../../../../src/types.ts';
import { serviceSumpTanks, waterDispenser } from '../../../skylab/vehicles/csm-gallery.ts';
import { cm, lift, nodes, part, probePort, sm } from '../../vehicles/stack-gallery.ts';

export const port = probePort(111);

export const command: Part[] = [
  cm(
    'CommandModule',
    'Command module 111',
    'Stafford, Brand and Slayton flew this capsule on the joint Apollo–Soyuz mission.',
    'Built for a lunar mission, the command module gained equipment to power and monitor the docking module and the common docking system. Its original probe captured a matching drogue on the American end of the airlock.',
  ),
  cm(
    'SideHatch',
    'Unified side hatch',
    'The crew entered the spacecraft through this outward-opening pressure hatch.',
    'They stayed inside the capsule while USS New Orleans recovered it after splashdown on July 24. The side hatch uses the later Block II mechanism.',
  ),
  cm(
    'CabinStructure',
    'Cabin pressure vessel',
    'The Apollo cabin normally used pure oxygen at about 5 psi in flight.',
    'The Soyuz cabin normally used oxygen and nitrogen at nearly 15 psi. A separate airlock and reduced Soyuz pressure made crew transfers between the two spacecraft practical.',
    true,
  ),
  cm(
    'CabinWindows',
    'Cabin windows',
    'Five windows gave the crew views in different directions during manoeuvres.',
    'The 300 mm lens, bracket and eyepiece let the crew sight the target on the docking system and read how far the guide ring had extended. The launch exhibit shows clean glazing.',
  ),
  cm(
    'CrewCouches',
    'Three launch couches',
    'Stafford, Brand and Slayton occupied the left, centre and right couches.',
    'The launch inventory included restraints and helmets for two extra occupants in case Apollo had to bring the Soviet crew home. NASA also prepared a rescue load as an option before launch. The exhibit shows the normal three-couch installation.',
    true,
  ),
  cm(
    'MainConsole',
    'Main display console',
    'The three crew members shared the main control panels.',
    'NASA added controls and displays for the compatible docking system, docking module and ATS-6 satellite link. The main console in this exhibit uses the shared later Block II reference.',
    true,
  ),
  cm(
    'FlightDirectorIndicators',
    'Flight director attitude indicators',
    'Two attitude balls gave the commander and command module pilot a reference for manoeuvring.',
    'After undocking, the crew used a special minimum-impulse translation mode to keep Apollo aimed during the ultraviolet absorption passes.',
    true,
  ),
  cm(
    'ConsoleEquipment',
    'Control-panel instruments',
    'Switch guards, meters and illuminated annunciators fill the panels facing the couches.',
    'The instrument placement shown uses the later Block II reconstruction. The flight-specific television and experiment controls have separate inspection views.',
    true,
  ),
  cm(
    'DSKYFrontWeb',
    'Guidance computer display and keyboard',
    'The crew entered verb and noun commands into the Apollo guidance computer.',
    'The digital autopilot controlled attitude and assisted short, precise translation burns during the joint observations after undocking.',
    true,
  ),
  cm(
    'CabinEquipmentBays',
    'Navigation and equipment bays',
    'The crew mounted and stowed equipment around the lower part of the cabin.',
    'The launch stowage plan assigned space to a cryogenic freezer, sample equipment, ATS-6 hardware and rescue restraints. The exhibit uses the shared later Block II bay envelopes.',
    true,
  ),
  cm(
    'ASTPExperimentControls',
    'Experiment control panel',
    'The crew monitored experiments and commanded the covers on the service-module instruments.',
    'This reconstructed panel represents the controls added for the mission. The exact layout, wording and dimensions of its face are estimated.',
    true,
  ),
  cm(
    'ASTPVideoRecorder',
    'Video tape recorder controls',
    'Apollo could record 30 minutes of video from any of five input stations.',
    'Two stations were in the command module, two in the docking module and one in Soyuz. A cable carried video back to Apollo for recording or transmission. Switches shown here represent the power, headwheel, tape drive and mode controls in the operations handbook.',
    true,
  ),
  waterDispenser,
  cm(
    'ForwardCompartment',
    'Forward tunnel and recovery compartment',
    'The tunnel gave the crew access to the American side of the docking module.',
    'Cables through the interface supported docking-module operations and communications. The forward compartment also held the pilot, drogue and main parachute equipment for recovery.',
  ),
  {
    ...cm(
      'DockingProbe',
      'Apollo docking probe and ring',
      'The existing probe-and-drogue system pulled Apollo onto the docking module after transposition.',
      'The docking module carried the new androgynous system at its other end. Stafford retrieved the airlock from the launch adapter after insertion.',
    ),
    moves: [lift(2, 52), { kind: 'slide', node: port.piston, by: [0, port.captureTravel.value, 0], from: 0.56, to: 0.7 }],
  },
  part(
    'ForwardShield',
    'Forward heat shield',
    'Spacecraft',
    1,
    57,
    'The forward shield covered the recovery compartment until descent.',
    'At jettison the shield cleared the upper capsule to let the parachute sequence begin. The central opening follows the Block II docking configuration.',
  ),
  part(
    'HeatShield',
    'Aft heat shield',
    'Spacecraft',
    3,
    48,
    'The blunt ablative shield took the heating load on return from orbit.',
    'Two independent command-module attitude-control systems provided steering after the service module and its engine separated.',
  ),
];

const inspectionTilt: [number, number, number] = [0.7, 0.15, -0.71];
const coverMoves: Move[] = (
  [
    ['EUV', 37.5],
    ['HeliumGlow', 52.5],
    ['SoftXRay', 52.5],
  ] as const
).map(([name, bearing]) => {
  const angle = (bearing * Math.PI) / 180;
  return {
    node: `SM111_${name}CoverPivot`,
    kind: 'swing',
    axis: [-Math.sin(angle), 0, -Math.cos(angle)],
    angle: Math.PI / 2,
    from: 0.68,
    to: 0.92,
  };
});

export const service: Part[] = [
  sm(
    'ServiceModule',
    'Service module 111',
    'A lightweight Earth-orbit configuration carried the main engine, three fuel cells and the ATS-6 link.',
    'The two large lunar-mission storage tanks and one helium vessel were removed. Bay I carried experiments with remotely controlled covers. Local insulation around the thrusters allowed longer firings.',
  ),
  serviceSumpTanks,
  sm(
    'ServiceHelium',
    'Service propulsion helium tank',
    'One vessel provided pressurant for the service propulsion system.',
    'The second sphere was deleted with the lunar-mission propellant tanks. Its surviving counterpart follows the nominal Block II envelope and the Skylab forward position.',
    true,
  ),
  sm(
    'ServicePower',
    'Fuel cells and cryogenic tanks',
    'Three fuel cells supplied current throughout the mission.',
    'Cells 1 and 2 fed bus A and cell 3 fed bus B from launch through spacecraft separation. CSM-111 omitted the Skylab descent battery pack and auxiliary water tank.',
    true,
  ),
  sm(
    'ServiceEngine',
    'Service propulsion engine',
    'The main engine fired nine times for a total of 17 seconds.',
    'It circularised the orbit, manoeuvred for rendezvous and the Doppler tracking experiment, and performed the retrofire. Short burns left the handling film on the nozzle, where it blistered without affecting performance.',
  ),
  sm(
    'ReactionControl',
    'Reaction-control quads',
    'Four clusters of thrusters steered the spacecraft and made small changes in velocity.',
    'The crew used minimum-impulse translations to set up 150, 500 and 1,000 m separations for the ultraviolet absorption experiment.',
  ),
  sm(
    'PropellantStorageModule',
    'Auxiliary thruster propellant module',
    'This separate reservoir fed the four reaction-control quads during longer manoeuvres.',
    'A bubble introduced during activation had to be cleared by firing the roll engines. The tank envelopes are assumed from the Skylab Operations Handbook. Exact rack placement is estimated.',
    true,
  ),
  sm(
    'ASTPScienceBay',
    'Bay I experiment instruments',
    'Soft X-ray, extreme ultraviolet and helium-glow instruments shared one bay.',
    'The X-ray counter measured low-energy emissions, the extreme-ultraviolet telescope surveyed astronomical sources and the four helium-glow detectors observed two helium emission lines. The cases and optical faces are reconstructed from the report.',
    true,
  ),
  {
    ...sm(
      'ASTPExperimentCovers',
      'Remotely controlled science covers',
      'Three covers shielded the exposed instruments in bay I until they were needed.',
      'The assembly slider opens the real instrument apertures. Hinge direction and travel are estimated from the placement shown in the mission report.',
    ),
    moves: [lift(4, 41), ...coverMoves],
  },
  {
    ...sm(
      'HighGainAntenna',
      'ATS-6 high-gain antenna',
      'A steerable four-reflector array transmitted to the Applications Technology Satellite 6.',
      'ATS-6 extended continuous contact up to about fifty minutes per orbit. The antenna was folded beside the engine for launch. The shared Apollo antenna geometry uses the 52°15′ attachment bearing shown in the ASTP press kit.',
    ),
    moves: [lift(4, 41), { kind: 'swing', node: 'HGA_Deployment', axis: [0, 0, 1], angle: Math.PI / 2, from: 0.72, to: 1 }],
  },
];

export const csmViews: ViewDef[] = [
  { id: 'csm-111', label: 'CSM-111', nodes: [...nodes(command), ...nodes(service)], isolate: true, from: inspectionTilt },
  {
    id: 'science-bay',
    label: 'Bay I instruments',
    nodes: ['ASTPScienceBay'],
    isolate: true,
    onSelect: true,
    from: inspectionTilt,
  },
  { id: 'science-covers', label: 'Science covers', nodes: ['ASTPExperimentCovers'], from: inspectionTilt, span: 2.1 },
  {
    id: 'aux-propellant',
    label: 'Auxiliary propellant',
    nodes: ['PropellantStorageModule'],
    isolate: true,
    onSelect: true,
    from: inspectionTilt,
  },
  { id: 'fuel-cells', label: 'Fuel cells and reactants', nodes: ['ServicePower'], isolate: true, from: [-0.7, 0.2, 0.72] },
  { id: 'ats-6', label: 'ATS-6 antenna', nodes: ['HighGainAntenna'], isolate: true, from: [-0.75, -0.5, 0.6] },
  { id: 'probe', label: 'Apollo probe and ring', nodes: ['DockingProbe'], isolate: true, from: [0.7, 0.72, 0.4] },
  { id: 'hatch', label: 'Unified side hatch', nodes: ['SideHatch'], isolate: true, from: [0.85, 0.2, 0.34] },
  {
    id: 'console',
    label: 'Main console',
    nodes: ['MainConsole', 'ConsoleEquipment', 'FlightDirectorIndicators', 'DSKYFrontWeb'],
    isolate: true,
    from: [0.3, -1, 0],
  },
  {
    id: 'science-control',
    label: 'Experiment control panel',
    nodes: ['ASTPExperimentControls'],
    isolate: true,
    onSelect: true,
    from: [1, 0.2, 0],
  },
  { id: 'recorder', label: 'Video recorder controls', nodes: ['ASTPVideoRecorder'], isolate: true, onSelect: true, from: [1, 0.2, 0] },
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

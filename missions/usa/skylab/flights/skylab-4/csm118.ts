import type { Part, ViewDef } from '../../../../../src/types.ts';
import { cm, lift, nodes, part, probePort, sm } from '../../../apollo/vehicles/stack-gallery.ts';
import * as common from '../../vehicles/csm-gallery.ts';

export const port = probePort(118);

export const command: Part[] = [
  cm(
    'CommandModule',
    'Command module 118',
    'Gerald Carr, Edward Gibson and William Pogue flew this capsule to Skylab and back.',
    'Launch stowage filled the lockers and part of the space beneath the couches. The command module weighed 6,103.72 kilograms at launch. It weighed 5,633.80 kilograms at landing after the 84-day flight.',
  ),
  cm(
    'SideHatch',
    'Unified side hatch',
    'This outward-opening hatch gave the crew access to the cabin.',
    'After splashdown on February 8, 1974, the three astronauts stayed aboard while their capsule was hoisted onto USS New Orleans. Medical observers could study their first steps on deck after the long stay in orbit.',
  ),
  common.cabinStructure,
  cm(
    'CabinWindows',
    'Cabin windows',
    'Five windows overlooked the station during docking.',
    'On returning to the capsule the crew saw a light brown film on all five. Analysis after recovery found two distinct layers of silicone-bearing material on the rendezvous windows. The Gallery shows clean launch glazing.',
  ),
  cm(
    'CrewCouches',
    'Three launch couches',
    'Carr sat on the left, Gibson in the centre and Pogue on the right.',
    'The final stowage review traced each couch’s possible travel on impact against the packed equipment below it. The mission report includes separate clearance drawings for launch and entry.',
    true,
  ),
  common.mainConsole,
  cm(
    'FlightDirectorIndicators',
    'Flight director attitude indicators',
    'The attitude balls gave the pilots a reference as they closed on Skylab.',
    'During rendezvous they had to change from flying alongside the station to holding a steady approach along its docking axis. The instruments here follow the later Block II panel.',
    true,
  ),
  common.dsky,
  common.consoleEquipment,
  cm(
    'CabinEquipmentBays',
    'Navigation and equipment bays',
    'The navigator’s eyepieces and stowage lockers occupied the space below the main panel.',
    'Before flight the crew rehearsed the revised packing arrangement, which was photographed for the final load. The published stowage drawings distinguish this outward cargo from the film, tapes and other items carried back.',
    true,
  ),
  cm(
    'ExtendedVisitFood',
    'Extended-visit food parcels',
    'Extra provisions for the long stay filled gaps over the aft bulkhead lockers.',
    'The launch drawing marks several food packages among the film, tools and clothing. These reconstructed parcels show how supplies shared the shallow space under the couch frames.',
    true,
  ),
  cm(
    'CometBracketCase',
    'T025 spacewalk bracket container',
    'A bracket for the T025 instrument rode in a container above the aft lockers.',
    'The crew adapted an instrument originally intended to measure contamination around Skylab to observe Comet Kohoutek. The flight stowage list includes the bracket, modified occulting disc and extra 35-mm film.',
    true,
  ),
  cm(
    'ExperimentStowage',
    'Film, tools and coolant accessories',
    'The aft locker area also held S054 X-ray telescope film, the S193 tool kit and coolant servicing accessories.',
    'Figure 6-4 of the third-visit report identifies the packed items. The Gallery reconstructs their containers with estimated dimensions and restraints.',
    true,
  ),
  {
    ...cm(
      'S201Camera',
      'S201 far-ultraviolet camera',
      'Skylab carried the backup for George Carruthers’ Apollo 16 ultraviolet camera in a new vacuum-tight canister.',
      'The two covers protected the camera’s vacuum. Astronauts could aim it by sighting through two rings alongside the optical axis. The modified sequencer exposed 35-mm film to record Kohoutek’s hydrogen cloud. Its position in this reconstruction is estimated.',
      true,
    ),
    facts: [
      ['Canister', '49.5 × 35.6 × 31.8 cm · 26.3 kg'],
      ['Reference', 'JSC-08963, appendix A.5'],
    ],
  },
  common.waterDispenser,
  cm(
    'ForwardCompartment',
    'Forward tunnel and recovery compartment',
    'The crew crossed this tunnel to the axial port of Skylab’s multiple docking adapter.',
    'After the final undocking, the forward compartment’s next job was the return to Earth. Jettisoning its outer shield exposed the parachutes.',
    true,
  ),
  {
    ...cm(
      'DockingProbe',
      'Docking probe and ring latches',
      'The crew made three approaches before securing CSM-118 to the station.',
      'The two unsuccessful approaches had low closure rates. On the third approach the probe captured the drogue, and retraction brought the docking rings together for hard docking.',
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
    'The ablative shield protected the capsule on its Pacific return on February 8, 1974.',
    'The command module entered with the broad shield forward. A pressure loss in one of the two command-module attitude-control systems led the crew to use system 1 for entry.',
  ),
];

export const service: Part[] = [
  sm(
    'ServiceModule',
    'Service module 118',
    'A light-coloured coating on the forward portion of bay I protected the three descent batteries.',
    'Late in the visit the docked spacecraft experienced prolonged solar heating. NASA predicted 315 K at the batteries with the previous finish. With the new coating the maximum dormant battery temperature was 303 K.',
  ),
  common.propellantStorageModule,
  common.descentBatteries,
  common.serviceWaterTank,
  sm(
    'ServicePower',
    'Fuel cells and cryogenic tanks',
    'Two fuel cells supported the spacecraft until the hydrogen supply approached depletion 19 days after launch.',
    'They supplied 19,500 ampere-hours. The radiator bypass valve excluded three of the eight panels from the cooling loop. After shutdown the station supplied power and remaining oxygen was routed into the cabin.',
    true,
  ),
  common.serviceSumpTanks,
  common.serviceHelium,
  sm(
    'ServiceEngine',
    'Service propulsion engine',
    'The main engine fired seven times for a total of 41 seconds.',
    'A photograph taken during the last spacewalk showed wrinkles near the splice and stiffener ring in the nozzle extension. NASA traced the distortion to thermal shock during short firings. Engine performance was normal.',
  ),
  sm(
    'ReactionControl',
    'Reaction-control quads',
    'Four thruster clusters manoeuvred the ferry and helped trim the docked station’s orbit.',
    'As prolonged sunlight raised propellant pressures in quads A and D, the crew briefly connected each affected quad to the lower-pressure auxiliary propellant module. A separate isolation-valve anomaly allowed fuel pressure in quad B to track the manifold.',
  ),
  common.vhf,
];

export const csmViews: ViewDef[] = [
  { id: 'csm-118', label: 'CSM-118', nodes: [...nodes(command), ...nodes(service)], isolate: true, from: [0.88, 0.19, -0.44] },
  { id: 's201-camera', label: 'S201 ultraviolet camera', nodes: ['S201Camera'], isolate: true, onSelect: true, from: [0.64, 0.3, 0.71] },
  {
    id: 'aft-lockers',
    label: 'Cargo above aft lockers',
    nodes: ['ExtendedVisitFood', 'CometBracketCase', 'ExperimentStowage'],
    isolate: true,
    from: [0.78, 0.65, -0.36],
  },
  {
    id: 'comet-bracket',
    label: 'T025 bracket container',
    nodes: ['CometBracketCase'],
    isolate: true,
    onSelect: true,
    from: [0.69, 0.47, 0.55],
  },
  {
    id: 'battery-coating',
    label: 'Battery compartment coating',
    nodes: ['SM118_BatteryCompartmentCoating'],
    from: [0.88, 0.13, -0.44],
    span: 3.8,
  },
  { id: 'quad-a', label: 'Quad A · sunlit side', nodes: ['RCS_QuadA'], from: [0.98, 0.2, 0.13], span: 1.3 },
  {
    id: 'sector-i',
    label: 'Sector I equipment',
    nodes: ['PropellantStorageModule', 'DescentBatteries'],
    isolate: true,
    from: [0.8, 0.13, -0.6],
  },
  ...common.equipmentViews,
];

import type { Part } from '../../../../../src/types.ts';
import { cm, lift, part, probePort, sm } from '../../vehicles/stack-gallery.ts';

import { jMissionViews } from '../../vehicles/j-mission-views.ts';

const ship = 'Spacecraft';
export const casperPort = probePort(113);
export const casperCommand: Part[] = [
  cm(
    'WaterDispenser',
    'Drinking water dispenser',
    'A hand dispenser drew drinking water from the command module’s potable supply.',
    'The plastic insert at the filter quick-disconnect had broken on Apollo 15. Casper flew a steel insert. The Gallery shows the common dispenser and its handpiece.',
    true,
  ),
  cm(
    'CommandModule',
    'Command module 113 · Casper',
    'Ken Mattingly operated an orbital observatory aboard Casper while John Young and Charlie Duke explored Descartes.',
    'After rendezvous and the transfer of the landing crew and their lunar samples, all three men returned to Earth in this capsule. Its five window openings follow the shared Block II survey.',
  ),
  cm(
    'SideHatch',
    'Side hatch',
    'Casper carried the later Block II unified crew hatch.',
    'Machined pockets lighten the inner door; the pocket outlines are assumed from CM-106. Open the cutaway to see the webs between them, the circular pressure window and the latch drive.',
  ),
  cm(
    'CabinStructure',
    'Pressure vessel',
    'The inner pressure shell carried the crew and their equipment.',
    'A domed aft bulkhead closes the crew compartment. The spaces outside it held recovery gear and the reaction-control system.',
    true,
  ),
  cm(
    'CabinWindows',
    'Window assemblies',
    'The two forward windows gave the pilots a view toward a docking target.',
    'The openings follow the measured outline of Columbia, applied to this sister ship. The two side windows and the circular hatch window complete the set.',
  ),
  cm(
    'CrewCouches',
    'Crew couches',
    'Young launched in the left couch, Mattingly in the centre and Duke on the right.',
    'The three couches spread entry and landing loads across the crew’s backs. Eye positions and upholstery are estimated.',
    true,
  ),
  cm(
    'MainConsole',
    'Main display console',
    'The central display and switch panels faced all three couches.',
    'The exhibit uses the CM-106 control layout as a reconstruction of the later console. The left attitude indicator sits beside the computer display and the second sits above it.',
    true,
  ),
  cm(
    'FlightDirectorIndicators',
    'Attitude indicators',
    'Two spherical displays let the pilots read spacecraft attitude.',
    'The instruments show a fixed reference attitude. The 4.5-inch ball is the Honeywell type nominal for spacecraft 103 and later.',
    true,
  ),
  cm(
    'ConsoleEquipment',
    'Console equipment',
    'Meters and caution lamps let the crew follow propulsion, electrical power and communications.',
    'Mattingly controlled the orbital instruments from the cabin. The shared console shows the principal flight instruments with static readings. A new fuse in each mission timer isolated a display short from other circuits. The dedicated controls on panels 181 and 230 are omitted.',
    true,
  ),
  cm(
    'DSKYFrontWeb',
    'Guidance computer display and keyboard',
    'The crew addressed the guidance computer with verb and noun keys.',
    'The front face, key travel and glazing follow the programme’s equipment reconstruction. The display is unpowered.',
    true,
  ),
  cm(
    'CabinEquipmentBays',
    'Navigation station and equipment bays',
    'The navigator worked below the main console.',
    'A larger heater in the removable scanning telescope eyepiece helped keep it clear of condensation. The optics and cabinet depths follow the common Block II installation.',
    true,
  ),
  cm(
    'ForwardCompartment',
    'Forward tunnel and recovery equipment',
    'The docking passage ran through the centre of the parachute compartment.',
    'A removable pressure hatch closed Casper’s end. After hard docking the crew took the probe and drogue inside to clear the passage.',
    true,
  ),
  {
    ...cm(
      casperPort.part,
      'Active docking probe',
      'The docking probe linked Casper to Orion after transposition and again in lunar orbit after the landing.',
      'The probe captured the drogue in Orion’s tunnel. Retraction pulled the rings together so the twelve latches could carry the loads. The crew removed the docking gear to clear the passage.',
      true,
    ),
    moves: [
      lift(2, 52),
      {
        kind: 'slide' as const,
        node: casperPort.piston,
        by: [0, casperPort.captureTravel.value, 0] as [number, number, number],
        from: 0.56,
        to: 0.7,
      },
    ],
  },
  part(
    'ForwardShield',
    'Forward heat shield',
    ship,
    1,
    57,
    'This cover protected the parachutes on entry.',
    'It separated during the descent to expose the packed recovery equipment.',
  ),
  part(
    'HeatShield',
    'Aft heat shield',
    ship,
    3,
    48,
    'The broad ablative shield faced the air on return from the Moon.',
    'Its spherical contour follows the shared Block II structural survey.',
  ),
];
export const casperService: Part[] = [
  sm(
    'ServiceModule',
    'Service module 113',
    'Mattingly operated a mapping and spectroscopy laboratory in sector I while Young and Duke worked at Descartes.',
    'Sector I held the scientific instrument module and the third oxygen and hydrogen tanks. Across the engine tunnel, sector IV held two tanks of each reactant, three fuel cells and an auxiliary battery.',
  ),
  sm(
    'ReactionControl',
    'Service reaction-control quads',
    'Sixteen small engines controlled attitude and translation.',
    'Their four clusters could turn Casper end for end for docking or translate the spacecraft toward Orion.',
  ),
  sm(
    'ServiceSumpTanks',
    'Service propulsion tanks',
    'Fuel and oxidizer occupied separate tanks.',
    'The cylindrical module wraps around the propulsion system. Its reconstructed storage and sump tanks are visible in cutaway.',
    true,
  ),
  sm(
    'ServicePower',
    'Fuel cells and cryogenic tanks',
    'Three fuel cells sat above the oxygen shelf. Two of the three hydrogen tanks were stacked below it.',
    'Oxygen and hydrogen fed the cells, which produced electricity and water. The third oxygen tank could share this load during normal operations or be isolated to supply the crew.',
    true,
  ),
  sm(
    'ReserveOxygen',
    'Sector I oxygen tank 3',
    'Casper could draw breathing oxygen from a tank on the far side of the module from the fuel cells.',
    'Closing the new isolation valve between tanks 2 and 3 cut off the third tank from the fuel cells while preserving its supply to the environmental control system. The model assumes the forward-bulkhead valve installation from Casper’s sister ship Endeavour.',
    true,
  ),
  sm(
    'ReserveOxygenCore',
    'Redesigned oxygen tank instruments',
    'Three independently selectable heater settings replaced the earlier two-element system in each tank.',
    'The crew could use one, two or all three elements. A stainless-steel capacitance probe measured the oxygen quantity beside the heater. The new tanks dispensed with stirring fans and heater thermal switches.',
    true,
  ),
  {
    ...sm(
      'AuxiliaryBattery',
      'Sector IV auxiliary battery',
      'A silver oxide–zinc auxiliary battery gave Casper emergency power if its fuel cells lost oxygen.',
      'Two motor switches could disconnect fuel cell 2 and connect the battery to its distribution circuit. The case and terminals follow the preceding J mission. For Apollo 16 the battery received the revised separators, vent settings and plate tabs also used in Orion’s descent batteries.',
      true,
    ),
    facts: [
      ['Capacity', '415 Ah · assumed from CSM-112, Apollo 15 Press Kit, p. 137'],
      ['Nominal case', '16.94 × 9.04 × 9.96 in · assumed from the descent battery, NASA TN D-6976, table I'],
    ],
  },
  sm(
    'ReserveHydrogen',
    'Sector I hydrogen tank 3',
    'A third hydrogen tank accompanied the third oxygen tank on the longer J mission.',
    'The Apollo 16 press kit places tank 3 in sector I. The model assumes the common 31.80-inch dewar diameter and estimates this tank’s position behind the science bay.',
    true,
  ),
  {
    ...sm(
      'SIMDoor',
      'Scientific instrument bay door',
      'A curved panel sealed the instruments inside sector I at launch.',
      'At 69:59:01 mission elapsed time the crew jettisoned the door. They saw it leave quickly, tumbling amid debris. The slider moves it radially to reveal the shelves and leaves the adjacent wall panels in place.',
    ),
    moves: [lift(4, 41), { kind: 'slide', by: [3.06, 0, -2.57], from: 0.7, to: 0.95 }],
  },
  sm(
    'SIMBay',
    'Scientific instrument module and EVA fittings',
    'Shelves carried two camera systems above the spectrometers. Mattingly used the handrails and foot restraint to reach both film cassettes.',
    'Stiffened aluminum sides attached the pallet to radial beams 1 and 6. Sandwich shelves carried the instruments. From the foot restraint Mattingly inspected the bay and passed each film cassette back to the cabin.',
    true,
  ),
  {
    ...sm(
      'SIMCameras',
      'Mapping and panoramic cameras',
      'The mapping camera recorded the Moon, a stellar camera photographed the stars, and a laser altimeter measured the distance to the ground.',
      'Mattingly retrieved both film cassettes on the way home. He found the stellar camera’s folding glare shield caught against an EVA handrail. Inspection of the stellar film showed that the retraction problem had spared the photography.',
      true,
    ),
    facts: [
      ['Mapping focal length', '3 in · documented, MSC-07230, table A-III'],
      ['Panoramic focal length', '24 in · documented, MSC-07230, table A-III'],
    ],
  },
  sm(
    'SIMBooms',
    'Spectrometers and boom drives',
    'Separate booms carried the gamma-ray and mass spectrometers away from the spacecraft. Both are shown retracted.',
    'Two new proximity switches improved position telemetry. During the return preparations the mass spectrometer stalled about two thirds of the way out and had to be jettisoned. Mattingly saw the gamma-ray guide pins protruding through their shoes on his spacewalk.',
    true,
  ),
  {
    ...sm(
      'Subsatellite',
      'Particles and fields subsatellite',
      'Casper released PFS-2 into lunar orbit before the trip home. The crew omitted the planned orbit-shaping burn to conserve use of the service engine.',
      'PFS-2 measured charged particles and magnetic fields. Tracking placed its impact on the far side on 29 May 1972, during its 425th revolution. The isolated view shows its six solar-covered faces and three folded booms.',
      true,
    ),
    facts: [
      ['Body', '30 in long × 14 in across · documented, Apollo 16 Press Kit, Subsatellite'],
      ['Mass', '90 lb · documented, Apollo 16 Press Kit, Subsatellite'],
    ],
  },
  sm(
    'ServiceHelium',
    'Helium spheres',
    'Pressurized helium displaced propellant from the service-engine tanks.',
    'Two spherical vessels sit aft in the central bay. Their plumbing and mounting fittings are simplified.',
    true,
  ),
  part(
    'ServiceEngine',
    'Service propulsion engine',
    ship,
    5,
    37,
    'Casper’s service engine slowed the joined spacecraft into lunar orbit and sent the crew home after rendezvous.',
    'The lower end of its expansion nozzle projected into the empty space above Orion at launch. The crew used the service engine to enter lunar orbit, lower the still-docked lander closer to the surface and leave the Moon.',
    true,
  ),
  part(
    'YawActuator',
    'Service engine yaw actuator',
    ship,
    5,
    37,
    'Casper’s backup yaw drive oscillated during the test before lunar orbit circularization. Young and Duke waited in Orion while controllers assessed the risk.',
    'The drive housing carried a plug and harness secured by a lower clamp. An open rate-feedback circuit was established. Investigators could not distinguish a broken wire from a connector fault because the service module had separated before entry. The exhibit reconstructs the preflight harness route.',
    true,
    [['Test oscillation', '2.4 Hz · documented, MSC-07230 §14.1.10']],
  ),
  {
    ...sm(
      'HighGainAntenna',
      'High-gain S-band antenna',
      'Four dishes unfolded from beside the service-engine bell.',
      'The long boom let the dishes point at Earth as the spacecraft changed attitude. The common hardware uses four 31-inch reflectors.',
      true,
    ),
    moves: [lift(4, 41), { kind: 'swing', node: 'HGA_Deployment', axis: [0, 0, 1], angle: Math.PI / 2, from: 0.72, to: 1 }],
  },
];

export const casperViews = [
  ...jMissionViews('Casper', casperCommand, casperService, casperPort.part),
  {
    id: 'yaw-actuator',
    label: 'Service engine yaw drive',
    nodes: ['YawActuator'],
    onSelect: true,
    isolate: true,
    span: 0.74,
    from: [-0.8, 0.21, 0.56] as [number, number, number],
  },
];

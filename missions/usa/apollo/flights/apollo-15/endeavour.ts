import type { Part } from '../../../../../src/types.ts';
import { cm, lift, part, probePort, sm } from '../../vehicles/stack-gallery.ts';

import { jMissionViews } from '../../vehicles/j-mission-views.ts';

const ship = 'Spacecraft';
export const endeavourPort = probePort(112);
export const endeavourCommand: Part[] = [
  cm(
    'WaterDispenser',
    'Drinking water dispenser',
    'A hand dispenser drew drinking water from the command module’s potable supply.',
    'The crew mixed drinks and rehydrated food in the cabin. The nozzle and hand grip follow the common late Block II fitting.',
    true,
  ),
  cm(
    'CommandModule',
    'Command module 112 · Endeavour',
    'Al Worden operated an orbital observatory aboard Endeavour while David Scott and Jim Irwin explored Hadley-Apennine.',
    'After rendezvous and the transfer of the landing crew and their lunar samples, all three men returned to Earth in this capsule. Its five window openings follow the shared Block II survey.',
  ),
  cm(
    'SideHatch',
    'Side hatch',
    'Endeavour carried the later Block II unified crew hatch.',
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
    'Scott launched in the left couch, Worden in the centre and Irwin on the right.',
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
    'Worden controlled the orbital instruments from the cabin. The shared console shows the principal flight instruments with static readings. Its reconstruction omits the dedicated controls on panels 181 and 230.',
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
    'The telescope, sextant and bay faces show the Block II installation. Cabinet depths and local fittings are estimated.',
    true,
  ),
  cm(
    'ForwardCompartment',
    'Forward tunnel and recovery equipment',
    'The docking passage ran through the centre of the parachute compartment.',
    'A removable pressure hatch closed Endeavour’s end. After hard docking the crew took the probe and drogue inside to clear the passage.',
    true,
  ),
  {
    ...cm(
      endeavourPort.part,
      'Active docking probe',
      'The docking probe linked Endeavour to Falcon after transposition and again in lunar orbit after the landing.',
      'The probe captured the drogue in Falcon’s tunnel. Retraction pulled the rings together so the twelve latches could carry the loads. The crew removed the docking gear to clear the passage.',
      true,
    ),
    moves: [
      lift(2, 52),
      {
        kind: 'slide' as const,
        node: endeavourPort.piston,
        by: [0, endeavourPort.captureTravel.value, 0] as [number, number, number],
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
export const endeavourService: Part[] = [
  sm(
    'ServiceModule',
    'Service module 112',
    'Behind one launch panel Endeavour carried a laboratory for observing the Moon from orbit.',
    'Sector I held the scientific instrument module and the third oxygen and hydrogen tanks. Across the engine tunnel, sector IV held two tanks of each reactant, three fuel cells and an auxiliary battery.',
  ),
  sm(
    'ReactionControl',
    'Service reaction-control quads',
    'Sixteen small engines controlled attitude and translation.',
    'Their four clusters could turn Endeavour end for end for docking or translate the spacecraft toward Falcon.',
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
    'Endeavour could draw breathing oxygen from a tank on the far side of the module from the fuel cells.',
    'Closing the new isolation valve between tanks 2 and 3 cut off the third tank from the fuel cells while preserving its supply to the environmental control system. For this flight the isolation valve moved to the forward bulkhead.',
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
      'A silver oxide–zinc auxiliary battery gave Endeavour emergency power if its fuel cells lost oxygen.',
      'Two motor switches could disconnect fuel cell 2 and connect the battery to its distribution circuit. A second control box protected the wiring from overload. The battery sat on the aft bulkhead under the hydrogen tanks.',
      true,
    ),
    facts: [
      ['Capacity', '415 Ah · documented, Apollo 15 Press Kit, p. 137'],
      ['Nominal case', '16.94 × 9.04 × 9.96 in · assumed from the descent battery, NASA TN D-6976, table I'],
    ],
  },
  sm(
    'ReserveHydrogen',
    'Sector I hydrogen tank 3',
    'A third hydrogen tank accompanied the third oxygen tank on the longer J mission.',
    'Its 26-pound hydrogen capacity supplied reactant for the fuel cells. The flight press kit identifies the sector. The model assumes the common 31.80-inch dewar diameter and estimates its position behind the science bay.',
    true,
  ),
  {
    ...sm(
      'SIMDoor',
      'Scientific instrument bay door',
      'A curved panel sealed the instruments inside sector I at launch.',
      'At 74:06:47 ground elapsed time pyrotechnics cut the door free. The crew saw it moving away at right angles to the spacecraft axis. The slider displaces it along that direction to uncover the instruments.',
    ),
    moves: [lift(4, 41), { kind: 'slide', by: [3.06, 0, -2.57], from: 0.7, to: 0.95 }],
  },
  sm(
    'SIMBay',
    'Scientific instrument module and EVA fittings',
    'Shelves carried two camera systems above the spectrometers. Worden used the handrails and foot restraint to reach both film cassettes.',
    'Stiffened aluminum sides attached the pallet to radial beams 1 and 6. Sandwich shelves carried the instruments. From the foot restraint Worden inspected the bay and passed each film cassette back to the cabin.',
    true,
  ),
  {
    ...sm(
      'SIMCameras',
      'Mapping and panoramic cameras',
      'The mapping camera photographed the Moon while a stellar camera recorded the stars. A laser altimeter supplied the distance to the ground.',
      'Below it the panoramic camera swept across the ground track. On the way home Worden made separate trips outside to collect the panoramic and mapping camera film. The Gallery shows their housings, optical ports, cassettes and EVA handles.',
      true,
    ),
    facts: [
      ['Mapping focal length', '3 in · documented, Apollo 15 Press Kit, p. 62'],
      ['Panoramic focal length', '24 in · documented, MSC-05161, appendix A.4.2'],
    ],
  },
  sm(
    'SIMBooms',
    'Spectrometers and boom drives',
    'Separate booms carried the gamma-ray and mass spectrometers away from the spacecraft. Both are shown retracted.',
    'The 25-foot gamma-ray boom carried a detector for studying lunar surface composition. The 24-foot mass spectrometer boom sampled gases. The fixed alpha-particle and X-ray detectors shared the aft shelf.',
    true,
  ),
  {
    ...sm(
      'Subsatellite',
      'Particles and fields subsatellite',
      'Before the crew left lunar orbit a spring launcher spun this small satellite out of the scientific instrument bay.',
      'The hexagonal spacecraft carried a magnetometer, charged-particle instruments and an S-band transponder. Solar cells powered its dayside passes. The dedicated view looks inside its launch container.',
      true,
    ),
    facts: [['Body', '30 in long · MSC-05161, appendix A.4.2. Width 14 in · Apollo 15 Press Kit, p. 64']],
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
    'Endeavour’s service engine slowed the joined spacecraft into lunar orbit and sent the crew home after rendezvous.',
    'The lower end of its expansion nozzle projected into the empty space above Falcon at launch. The crew used the service engine to enter lunar orbit, lower the still-docked lander closer to the surface and leave the Moon.',
    true,
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
export const endeavourViews = jMissionViews('Endeavour', endeavourCommand, endeavourService, endeavourPort.part);

import type { Part } from '../../../../../src/types.ts';
import { lmPort, lower, lunarGallery, upper } from '../../vehicles/lunar-gallery.ts';

const stageParts: [string, string, string, string, string][] = [
  [
    'LMPlumeDeflectors',
    'Four plume deflectors',
    lower,
    'Look below each downward-firing jet for a curved shield on a truss.',
    'The shields protected the descent stage from hot exhaust. At lunar liftoff all four stayed at Hadley–Apennine. The thrusters rose with the ascent stage.',
  ],
  [
    'LMRover',
    'Folded lunar roving vehicle',
    lower,
    'Four electric wheels, a crew deck and two hinged chassis sections fit upright in quadrant I.',
    'The aft end of the center deck pointed up. The front and rear sections folded back over the two seats, with all four suspensions turned inward. Scott and Irwin lowered the package on tapes. As it swung out, the chassis straightened and the wheels dropped into driving position. Isolate the rover to see the hardware behind its thermal cover.',
  ],
  [
    'LMRetroreflector',
    'Folded laser reflector',
    lower,
    'Two hinged panels carried 300 fused-silica corner cubes in quadrant III.',
    'The smaller panel folded over the larger for flight. Scott and Irwin set the array facing Earth. It returned laser light to Earth without wiring, antennas or a source of power. The reflector rode on its own pallet alongside the rover’s equipment.',
  ],
  [
    'LMRoverPallet',
    'Rover equipment pallet',
    lower,
    'A separate pallet held the folding hand-tool carrier for the back of the rover.',
    'The rover used virtually the whole of quadrant I. Its surface equipment therefore travelled separately. Quadrant III carried both this pallet and the folded reflector. The crew fitted the carrier to the aft end of the rover for their geology traverses.',
  ],
  [
    'LMSurfaceEquipment',
    'Enlarged equipment rack and TV camera',
    lower,
    'The crew could lower this broad rack from beside the ladder.',
    'The enlarged MESA in quadrant IV could carry 600 lb gross. It held sample cases, camera gear, fresh life-support batteries and lithium hydroxide cartridges. The flight carried separate television cameras for early surface coverage and the rover.',
  ],
  [
    'LMScienceBay',
    'Scientific equipment bay',
    lower,
    'Two ALSEP subpackages rode diagonally opposite the MESA.',
    'One carried the central station and the other the finned generator. At Hadley the station collected measurements including seismic motion, magnetic field and heat flow. The view shows representative packed instrument envelopes and the separate generator cradle.',
  ],
  [
    'LMFuelCask',
    'SNAP-27 fuel cask',
    lower,
    'A separate cask rode upright outside the experiment bay.',
    'The astronauts tilted the cradle on the surface to transfer the fuel capsule into the generator. The generator itself travelled inside the scientific equipment bay.',
  ],
  [
    'LMHammocks',
    'Crew hammocks',
    upper,
    'Scott and Irwin slept inside Falcon between their three rover traverses.',
    'Two fabric hammocks rode rolled up in the cabin for flight. The sleeping arrangements were part of a stay of nearly 67 hours on the surface. The rolled dimensions and installation positions are estimated.',
  ],
  [
    'LMDescentPower',
    'Five descent batteries',
    lower,
    'Falcon carried a fifth silver-zinc battery for its extended stay.',
    'All five batteries were mounted behind the descent stage on the minus-Z bulkhead. Each was rated at 415 ampere-hours. A new relay assembly let the crew manage the extra battery. Local case positions are reconstructed.',
  ],
  [
    'LMAscentPower',
    'Ascent battery bay',
    upper,
    'A separate pair of silver-zinc batteries went back into orbit with the cabin.',
    'The pair supplied the ascent buses when the descent stage was left at Hadley. Each case uses the ribbed cover and opposite-end terminals introduced on LM-8. Their placement is approximate.',
  ],
  [
    'LMDescentConsumables',
    'Descent water, oxygen and waste tanks',
    lower,
    'Falcon carried a second tank of water and a second tank of gaseous oxygen.',
    'Extra stores in quadrant IV supported the longer surface stay. The higher-pressure oxygen recharge serviced the astronauts’ portable life-support systems. Urine and backpack condensate drained to a separate five-gallon tank.',
  ],
  [
    'LMAscentLifeSupport',
    'Oxygen, water and suit circuit',
    upper,
    'Two oxygen tanks and two water tanks stayed with the crew after staging.',
    'The cabin suit circuit removed moisture and carbon dioxide. The model includes the storage vessels, a suit-circuit assembly, cartridges and ducts.',
  ],
  [
    'LMLandingRadar',
    'Landing radar antenna',
    lower,
    'The antenna looked down from beneath Falcon during powered descent.',
    'Radar height and velocity helped the guidance computer during the approach. Scott took manual control for the final descent past the mountains and set Falcon down on an uneven surface.',
  ],
  [
    'LMDescent',
    'Thermal blankets and outriggers',
    lower,
    'Look beside the ladder for the rover bay and enlarged MESA.',
    'The rover occupied quadrant I and the enlarged MESA quadrant IV. New insulation and heaters protected the packed hardware on the way to Hadley. The legs fold against the stage inside the adapter and swing out for landing.',
  ],
  [
    'LMPorch',
    'Forward porch and handrails',
    lower,
    'The porch projected over the ladder beneath the forward hatch.',
    'Twin handrails bordered the platform. Scott stepped from this platform onto the ladder, and Irwin followed.',
  ],
  [
    'LMLandingGear',
    'Landing gear, ladder and probes',
    lower,
    'Three probes signalled surface contact. The leg under the ladder had none.',
    'A ladder ran along the forward primary strut. In the launch stack the four assemblies fold inward beneath the outriggers. Metallic shielding covered the secondary struts. The model assumes the shortened deployment-truss shield documented for LM-6. Hinge positions and illustrated deployment paths are estimated from NASA TN D-6850.',
  ],
  [
    'LMDescentStructure',
    'Cruciform thrust structure',
    lower,
    'Two pairs of beams divided the descent stage into bays.',
    'The central compartment held the engine. Four neighbouring bays held its propellants. Cut away the blankets or isolate the propulsion system to see the beam layout.',
  ],
  [
    'LMDescentEngine',
    'Extended descent engine',
    lower,
    'Falcon landed with a descent-engine skirt ten inches longer than the earlier version.',
    'A lighter exit cone and quartz-lined chamber accompanied the nozzle extension. The crushable skirt ran closer to the ground on this flight. Its long shape is shown before contact with the lunar surface.',
  ],
  [
    'LMDPSTanks',
    'Elongated descent propellant tanks',
    lower,
    'Four lengthened tanks carried the extra propellant needed to land the rover and science payload.',
    'Each tank was extended 3.36 inches. Two held fuel and two oxidizer. Feed lines and tank supports changed with the increase in size. Tank stations, strap widths and pipe routing are reconstructed.',
  ],
  [
    'LMAscent',
    'Crew compartment and docking tunnel',
    upper,
    'Scott and Irwin flew standing up behind two triangular windows.',
    'A third window above the commander looked up toward the docking target. Endeavour’s probe met the conical drogue in the tunnel atop the midsection.',
  ],
  [
    lmPort.part,
    'Docking ring and drogue',
    upper,
    'Falcon carried the receiving half of the docking system above its overhead hatch.',
    'After translunar injection Worden turned Endeavour to dock with Falcon in the adapter. The same drogue received the command module’s probe again after Falcon returned from Hadley. The crew removed the docking hardware for the transfer between cabins.',
  ],
  [
    'LMStations',
    'Two standing flight stations',
    upper,
    'Armrests and restraints held each pilot in position.',
    'Scott stood on the left and Irwin on the right. The deck, side lockers, armrests, restraints and eye positions are reconstructed. Enter either station to look through the glazing.',
  ],
  [
    'LMControlPanels',
    'Displays and hand controllers',
    upper,
    'Scott and Irwin shared the central guidance keyboard. The computer ran Luminary.',
    'The instrument boards, attitude displays and hand controllers are static. Panel relief and positions are estimated from the LM handbook.',
  ],
  [
    'LMAscentEngine',
    'Fixed ascent engine',
    upper,
    'A separate engine powered the ascent stage back to Endeavour.',
    'The bell sits above a recessed blast deflector in the descent deck. As the stages part, the deflector stays below. Its chamber, jacket, mount and external feed fittings leave with the cabin. Its nominal thrust was 3,500 lbf.',
  ],
  [
    'LMAPSTanks',
    'Ascent propellant and helium tanks',
    upper,
    'Two spherical tanks supplied the pressure-fed ascent engine.',
    'One held fuel and the other oxidizer. Two smaller helium vessels supplied pressurization. Their external envelopes and feed runs are reconstructed.',
  ],
  [
    'LMEquipment',
    'Attitude thrusters, radar and antennas',
    upper,
    'Sixteen thrusters let Falcon turn and translate independently.',
    'Four outriggers stand at 45° to the pitch and roll axes. Each cluster carries two opposed vertical jets and two horizontal jets at right angles. The rendezvous radar tracked Endeavour. The 26-inch S-band antenna provided a separate link to Earth.',
  ],
  [
    'LMReactionSupply',
    'Reaction-control tankage',
    upper,
    'Two independent systems supplied the four thruster clusters.',
    'Each system had a fuel tank, an oxidizer tank and a helium vessel. External envelopes and installed positions are approximate.',
  ],
];
const facts: Record<string, Part['facts']> = {
  LMFuelCask: [['Stowage', 'Outside quadrant II · LM-10 Operations Handbook §1.3']],
  LMScienceBay: [['Payload', 'Apollo lunar surface experiments package · Apollo 15 press kit, Lunar Surface Science']],
  LMRover: [
    ['Wheels', 'Four, each 32 × 9 in · Apollo 15 press kit p. 83'],
    ['Deployed length / wheelbase', '122 / 90 in · Apollo 15 press kit p. 78'],
  ],
  LMRetroreflector: [
    ['Optics', '204 + 96 corner cubes · ALSEP-MT-05 table 2-2'],
    ['Stowed width × length × height', '27.375 × 25.50 × 11.75 in · ALSEP-MT-05 table 2-2'],
  ],
  LMRoverPallet: [['Stowage', 'Quadrant III · Apollo 15 Mission Report appendix A.2.1']],
  LMDescentPower: [['Battery complement', '5 × 415 Ah · Apollo 15 Mission Report appendix A.2.2']],
  LMDescentConsumables: [['Descent capacities', '371 lb water / 85 lb oxygen · Apollo 15 press kit, Lunar Module Changes']],
  LMDescent: [['Width across flats', '166 in · assumed from LM-3 fig. A.2-2']],
  LMLandingGear: [
    ['Pads', '4 × 37 in · Apollo 15 press kit, Lunar Module Landing Gear'],
    ['Tread radius', '167.57 in · NASA TN D-6850 p. 6'],
  ],
  LMDescentEngine: [
    ['Increase in nozzle length', '10 in · Apollo 15 Mission Report appendix A.2.4'],
    ['Mount', 'Two-axis gimbal · Apollo 15 press kit, Descent Propulsion System'],
  ],
  LMAscentEngine: [['Overall length / exit diameter', 'Approx. 51 / 31 in · NASA engine specifications, table I']],
  LMAscent: [
    ['Crew compartment', '92 in diameter × 42 in deep · LM handbook, crew compartment; assumed'],
    ['Forward hatch', '32 in square · LM handbook, crew compartment; assumed'],
  ],
};

export { lmPort as falconPort };
export const {
  model: falconModel,
  stackParts: falconStackParts,
  views: falconViews,
} = lunarGallery(
  'apollo-15',
  'Falcon',
  'LM-10 Falcon',
  [
    {
      node: 'LM_CommanderStation',
      label: 'Scott’s standing station',
      from: 'LMAscent',
      open: [100 * 3600 + 39 * 60 + 16.2, 173 * 3600 + 36 * 60 + 25.5],
    },
    {
      node: 'LM_PilotStation',
      label: 'Irwin’s standing station',
      from: 'LMAscent',
      open: [100 * 3600 + 39 * 60 + 16.2, 173 * 3600 + 36 * 60 + 25.5],
    },
  ],
  stageParts,
  facts,
  false,
);

falconViews.push(
  { id: 'rover', label: 'Folded lunar rover', nodes: ['LMRover'], onSelect: true, isolate: true, from: [-1, 0.28, 0.72] },
  { id: 'reflector', label: 'Laser retroreflector', nodes: ['LMRetroreflector'], onSelect: true, isolate: true, from: [-0.2, 0.6, 1] },
  {
    id: 'rover-pallet',
    label: 'Rover equipment pallet',
    nodes: ['LMRoverPallet'],
    onSelect: true,
    isolate: true,
    from: [0.2, 0.5, 1],
  },
  { id: 'deflectors', label: 'Plume deflectors', nodes: ['LMPlumeDeflectors', 'LMEquipment'], isolate: true, from: [1, 0.15, -0.45] },
  { id: 'mesa', label: 'MESA and TV camera', nodes: ['LMSurfaceEquipment'], onSelect: true, isolate: true, from: [1, 0.5, 0.65] },
  { id: 'cask', label: 'External fuel cask', nodes: ['LMFuelCask'], onSelect: true, isolate: true, from: [1, 0.5, 0.35] },
  { id: 'hammocks', label: 'Crew hammocks', nodes: ['LMHammocks'], onSelect: true, isolate: true, from: [1, 0.5, 0.35] },
  { id: 'seq', label: 'Scientific equipment bay', nodes: ['LMScienceBay'], onSelect: true, isolate: true, from: [-1, 0.62, -0.65] },
);

export const falconStackViews = falconViews.filter((view) =>
  ['porch', 'dps', 'aps', 'drogue', 'mesa', 'seq', 'cask', 'deflectors', 'hammocks', 'rover', 'reflector', 'rover-pallet'].includes(
    view.id,
  ),
);

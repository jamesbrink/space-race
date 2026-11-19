import type { Part } from '../../../../../src/types.ts';
import { lmPort, lower, lunarGallery, upper } from '../../vehicles/lunar-gallery.ts';

const stageParts: [string, string, string, string, string][] = [
  [
    'LMPlumeDeflectors',
    'Four plume deflectors',
    lower,
    'A curved shield beneath each downward-firing jet guarded the descent stage.',
    'The thrusters belonged to the ascent stage above. The four shield trusses stayed with the lower stage. Both stages left Odyssey together before entry.',
  ],
  [
    'LMSurfaceEquipment',
    'MESA and lunar television camera',
    lower,
    'Behind the forward equipment door stood the color television camera and two sample return cases.',
    'The crew would have lowered this rack from the porch to film the first steps at Fra Mauro. A new looped cable replaced the release D-ring. A black-and-white camera also flew as a backup. The surface equipment remained stowed.',
  ],
  [
    'LMScienceBay',
    'Fra Mauro experiment pallets',
    lower,
    'The two pallets in quadrant II carried the instruments intended for Fra Mauro.',
    'Subpackage 1 carried the SNAP-27 generator, drill and hand tools. Subpackage 2 carried the central station, passive seismometer, charged-particle detector, heat-flow experiment and cold-cathode gauge. The surface drill would have bored holes for the heat-flow probes. Both pallets returned inside Aquarius.',
  ],
  [
    'LMFuelCask',
    'SNAP-27 fuel cask',
    lower,
    'A separate sealed cask rode beside the experiment bay.',
    'The astronauts would have tilted the cask to extract the fuel capsule and load the generator on the Moon. With the landing cancelled the fuel returned to Earth in its cask.',
  ],
  [
    'LMHammocks',
    'Two crew hammocks',
    upper,
    'The two hammock rolls represent sleeping equipment packed for a two-man lunar landing.',
    'The return left three men sharing the spacecraft. At first the command module served as a sleeping area. As its cabin cooled, all three stayed in Aquarius and slept in short spells. Hammock stowage positions are estimated.',
  ],
  [
    'LMDescentPower',
    'Four descent batteries',
    lower,
    'Four silver-zinc batteries supplied the descent buses.',
    'The four descent batteries are shown in two pairs. Their locations follow LM-4 (Apollo 10 Mission Report A.2.1). Open the blankets to inspect their cases, covers, terminals and leads. Installed envelopes are estimated.',
  ],
  [
    'LMAscentPower',
    'Ascent battery bay',
    upper,
    'Two batteries rode in the ascent stage.',
    'LM batteries sustained the spacecraft during the return and supplied power across the intervehicle umbilical to recharge Odyssey’s entry batteries. The cutaway exposes representative terminals and cabling.',
  ],
  [
    'LMDescentConsumables',
    'Descent water and oxygen stores',
    lower,
    'One oxygen vessel and one water vessel remained with the descent stage.',
    'Water supplied the crew and the cooling system. The vessels and fittings are reconstructed from the mission report system diagrams.',
  ],
  [
    'LMAscentLifeSupport',
    'Oxygen, water and suit circuit',
    upper,
    'Aquarius supplied a habitable environment for about 83 hours after the accident.',
    'Two ascent-stage oxygen vessels and two water vessels flank the aft bay. The suit fans circulated cabin air. As the normal carbon dioxide cartridges wore out, the crew connected square command-module cartridges to the suit hoses.',
  ],
  [
    'LMLandingRadar',
    'Landing radar antenna',
    lower,
    'The landing radar faced downward from the lower stage.',
    'Its beams were meant to measure height and velocity on the approach to Fra Mauro. Aquarius passed around the Moon with the antenna still aboard. The cutaway shows its electronics enclosure.',
  ],
  [
    'LMDescent',
    'Thermal blankets and outriggers',
    lower,
    'The octagonal lower stage carried the whole spacecraft at launch.',
    'Gold, copper and black blanket panels wrapped the stage. Four outriggers carried its loads into the adapter and supported the deployed legs. Blanket colours and seams are estimated from LM-6 and the photographs of Aquarius after jettison.',
  ],
  [
    'LMPorch',
    'Forward porch and handrails',
    lower,
    'The narrow platform and handrails led from the forward hatch to the ladder.',
    'Grumman increased the forward hatch’s outer shielding from 0.004 to 0.010 inch following damage on Apollo 12. The crew used the overhead tunnel to pass between the two spacecraft.',
  ],
  [
    'LMLandingGear',
    'Landing gear, ladder and probes',
    lower,
    'Haise reported the four legs down and locked at 061:00:10, before the first descent-engine burn.',
    'The ladder occupied the forward leg. Each of the other three had a surface-contact probe. All four pads remained unloaded. Changes to LM-7’s thermal insulation saved 27.2 lb on the gear. The launch stack folds the legs beneath the outriggers.',
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
    'Throttleable descent engine',
    lower,
    'This engine flew three course corrections with Odyssey still attached.',
    'The first burn restored a free-return path. The 264-second burn beyond the Moon shortened the trip home. A final 13.7-second firing refined the entry corridor. The cutaway follows the chamber below its gimbal into the crushable nozzle extension.',
  ],
  [
    'LMDPSTanks',
    'Descent propellant and helium tanks',
    lower,
    'Four tanks fed the descent engine with fuel and oxidizer.',
    'More than half the initial descent propellant remained after the three firings. LM-7 carried a new pressure-equalizing bypass around the fuel/helium heat exchanger. Tank bands and principal lines are represented. Local routing is estimated.',
  ],
  [
    'LMAscent',
    'Crew compartment and docking tunnel',
    upper,
    'Lovell and Haise had standing flight stations behind two triangular windows.',
    'Swigert joined them here after the service-module accident. The overhead window looked toward the docking target. At the top of the midsection, the tunnel connected the cabin to Odyssey.',
  ],
  [
    lmPort.part,
    'Docking ring and drogue',
    upper,
    'Aquarius carried the receiving half of the docking system.',
    'Odyssey’s probe entered the conical drogue. Retraction pulled the two rings together. Removing the probe and drogue then opened a passage between the cabins. Tunnel pressure pushed Aquarius away when the crew undocked before entry.',
  ],
  [
    'LMStations',
    'Two standing flight stations',
    upper,
    'Lovell flew from the left station and Haise from the right.',
    'Armrests and restraints held the pilots in position. The crew used Earth in the commander’s window as an attitude reference for a return burn. Enter either station to inspect the deck, lockers and sight lines.',
  ],
  [
    'LMControlPanels',
    'Displays and hand controllers',
    upper,
    'The central guidance keyboard served both flight stations.',
    'The crew shut down most of the instruments between burns to conserve battery energy. The displays and controls here are static reconstructions of the Grumman installation.',
  ],
  [
    'LMAscentEngine',
    'Fixed ascent engine',
    upper,
    'The ascent engine stayed with the cabin and remained unfired.',
    'The bell sits above a recessed blast deflector in the descent deck. Separate the stages in the Gallery to expose the chamber, jacket and feed fittings. In flight Aquarius kept both stages through jettison.',
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
    'The four reaction-control clusters manoeuvred Aquarius and Odyssey together.',
    'Each cluster carried two opposed vertical jets and two perpendicular horizontal jets. The crew used reaction control for the last course correction before entry. The crew used the omnidirectional S-band antennas and left the steerable dish unpowered.',
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
  LMFuelCask: [['Cask length × diameter', '23 × 8 in · Apollo 13 press kit p. 65']],
  LMScienceBay: [['SNAP-27 generator', '18 in tall × 16 in across the fins · Apollo 13 press kit p. 65']],
  LMDescent: [['Width across flats', '166 in · assumed from LM-3 fig. A.2-2']],
  LMLandingGear: [
    ['Pads', '4 × 37 in · Apollo 13 press kit, Lunar Module Landing Gear'],
    ['Tread radius', '167.57 in · NASA TN D-6850 p. 6'],
  ],
  LMDescentEngine: [
    ['Overall length / exit diameter', 'Approx. 85 / 58 in · NASA engine specifications, table I'],
    ['Mount', 'Two-axis gimbal · Apollo 13 press kit, Descent Propulsion System'],
  ],
  LMAscentEngine: [['Overall length / exit diameter', 'Approx. 51 / 31 in · NASA engine specifications, table I']],
  LMAscent: [
    ['Crew compartment', '92 in diameter × 42 in deep · LM handbook, crew compartment; assumed'],
    ['Forward hatch', '32 in square · LM handbook, crew compartment; assumed'],
  ],
};

export { lmPort as aquariusPort };

const gallery = lunarGallery(
  'apollo-13',
  'Aquarius',
  'LM-7 Aquarius',
  [
    { node: 'LM_CommanderStation', label: 'Lovell’s standing station', from: 'LMAscent', open: [55 * 3600, 141.5 * 3600] },
    { node: 'LM_PilotStation', label: 'Haise’s standing station', from: 'LMAscent', open: [55 * 3600, 141.5 * 3600] },
  ],
  stageParts,
  facts,
  false,
);
gallery.views.push(
  { id: 'deflectors', label: 'Plume deflectors', nodes: ['LMPlumeDeflectors', 'LMEquipment'], isolate: true, from: [1, 0.15, -0.45] },
  { id: 'mesa', label: 'MESA and TV camera', nodes: ['LMSurfaceEquipment'], onSelect: true, isolate: true, from: [1, 0.5, 0.65] },
  { id: 'cask', label: 'External fuel cask', nodes: ['LMFuelCask'], onSelect: true, isolate: true, from: [1, 0.5, 0.35] },
  { id: 'hammocks', label: 'Crew hammocks', nodes: ['LMHammocks'], onSelect: true, isolate: true, from: [1, 0.5, 0.35] },
  { id: 'seq', label: 'Fra Mauro science pallets', nodes: ['LMScienceBay'], onSelect: true, isolate: true, from: [-1, 0.62, -0.65] },
);
export const aquariusStackParts = gallery.stackParts;
export const aquariusStackViews = gallery.views.filter((view) =>
  ['porch', 'dps', 'aps', 'drogue', 'mesa', 'seq', 'cask', 'deflectors', 'hammocks'].includes(view.id),
);

const mailbox: Part = {
  node: 'LMMailbox',
  name: 'Improvised carbon dioxide filter',
  group: upper,
  order: 0,
  explode: [0, 4, 0],
  inside: true,
  summary: 'A taped plastic garment bag joined a square Odyssey cartridge to an Aquarius suit return hose.',
  detail:
    'Mission Control tested the arrangement on the ground and read the instructions to the crew. This view shows one cartridge and hose. The crew rigged two in parallel and later stacked another cartridge on each. This equipment was assembled during the return.',
  facts: [['Indicated cabin carbon dioxide', '0.1–1.8 mm Hg with supplemental cartridges · MSC-02680 §6.7']],
};
export const aquariusModel = gallery.model;
delete aquariusModel.dockingPorts;
aquariusModel.cabin?.within.push(mailbox.node);
const tunnel = aquariusModel.parts.find((p) => p.node === lmPort.part);
if (tunnel) {
  tunnel.name = 'Docking ring and transfer tunnel';
  tunnel.summary = 'The crew removed the drogue and carried equipment, water and carbon dioxide cartridges through this passage.';
  tunnel.detail =
    'The docking ring remained attached to Aquarius. The hatch was closed for jettison. Air trapped between the two hatches pushed the spacecraft apart.';
}
// Give the return exhibit its own tunnel view. The launch stack still has the capture cone.
aquariusModel.views = gallery.views.map((view) => (view.id === 'drogue' ? { ...view, id: 'tunnel', label: 'Transfer tunnel' } : view));
aquariusModel.slider = ['Two stages joined', 'Stages apart for inspection'];
aquariusModel.parts.push(mailbox);
for (const view of gallery.views) {
  if (view.id === 'ascent-stage') view.label = 'Ascent stage cutaway';
  if (view.id === 'ascent-stage' || view.id === 'cabin-interior') view.nodes?.push(mailbox.node);
}
aquariusModel.views.push({
  id: 'mailbox',
  label: 'Return-flight CO₂ filter',
  nodes: [mailbox.node],
  isolate: true,
  onSelect: true,
  from: [0.35, 0.3, 1],
});

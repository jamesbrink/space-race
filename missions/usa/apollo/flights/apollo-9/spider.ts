import type { Part } from '../../../../../src/types.ts';
import { lower, upper, lunarGallery, lmPort } from '../../vehicles/lunar-gallery.ts';
const stageParts: [string, string, string, string, string][] = [
  [
    'LMDescentPower',
    'Four descent batteries',
    lower,
    'Four silver-zinc batteries supplied the descent buses.',
    'Each battery was rated at 400 ampere-hours. Open the blankets to inspect their cases, covers, terminals and leads. Installed envelopes are estimated.',
  ],
  [
    'LMAscentPower',
    'Ascent battery bay',
    upper,
    'Two 310 ampere-hour silver-zinc batteries travelled with the ascent stage.',
    'They could share propulsion manoeuvre loads with the descent batteries before staging. The cases, terminals and cabling represent the installation.',
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
    'Two oxygen tanks and two water tanks stayed with the crew after staging.',
    'The cabin suit circuit removed moisture and carbon dioxide. The model includes the storage vessels, a suit-circuit assembly, cartridges and ducts.',
  ],
  [
    'LMLandingRadar',
    'Landing radar antenna',
    lower,
    'The antenna looked down from beneath Spider’s descent stage.',
    'Apollo 9 exercised both antenna positions and monitored the radar signals in Earth orbit. The antenna face and electronics enclosure are estimated from Mission Report figure A.2-16.',
  ],
  [
    'LMDescent',
    'Thermal blankets and outriggers',
    lower,
    'The octagonal lower stage carried the whole spacecraft at launch.',
    'Gold, copper and black blanket panels wrapped the stage. Four outriggers carried its loads into the adapter and supported the deployed legs. Panel finishes follow AS09-21-3212.',
  ],
  [
    'LMPorch',
    'EVA porch and foot restraints',
    lower,
    'Schweickart stood on the forward porch during his spacewalk.',
    'A grated platform projected from the forward outrigger below the cabin hatch, a handrail rising on either side of it. The two golden slippers held his feet while he faced the hatch with his camera.',
  ],
  [
    'LMLandingGear',
    'Landing gear, ladder and probes',
    lower,
    'Each of Spider’s four footpads carried a lunar surface probe.',
    'A ladder ran along the forward primary strut. In the launch stack the four assemblies fold inward beneath the outriggers. Their hinges and illustrated deployment paths are estimated from NASA TN D-6850.',
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
    'The crew fired this gimballed engine first with Gumdrop docked and later during the independent flight.',
    'Below its gimbal, the insulated chamber flares into a thin crushable nozzle extension. The engine view exposes the chamber jacket, mounting ring, attachments and external fittings. Their local shapes are reconstructed.',
  ],
  [
    'LMDPSTanks',
    'Descent propellant and helium tanks',
    lower,
    'Four tanks fed Spider’s descent engine.',
    'Two held fuel and two held oxidizer. The model includes the helium vessels, tank bands and representative feed and pressurization lines. Routing and tank centres are estimated.',
  ],
  [
    'LMAscent',
    'Crew compartment and docking tunnel',
    upper,
    'McDivitt and Schweickart flew standing up behind two triangular windows.',
    'A third window above the commander looked up toward the docking target. Gumdrop’s probe met the conical drogue in the tunnel atop the midsection.',
  ],
  [
    lmPort.part,
    'Docking ring and drogue',
    upper,
    'Spider carried the receiving half of the docking system above its overhead hatch.',
    'The cone guided Gumdrop’s probe into the capture socket. Retraction drew the rings together, and the crew removed the probe and drogue to open the transfer passage.',
  ],
  [
    'LMStations',
    'Two standing flight stations',
    upper,
    'Armrests and restraints held each pilot in position.',
    'McDivitt stood on the left and Schweickart on the right. The deck, side lockers, armrests, restraints and eye positions are reconstructed. Enter either station to look through the glazing.',
  ],
  [
    'LMControlPanels',
    'Displays and hand controllers',
    upper,
    'The crew shared the central guidance keyboard between two pilot stations.',
    'The instrument boards, attitude displays, switches, armrests and hand controllers are static. Panel relief and positions are estimated from the LM handbook.',
  ],
  [
    'LMAscentEngine',
    'Fixed ascent engine',
    upper,
    'A separate engine powered the ascent stage back to Gumdrop.',
    'The bell sits above a recessed blast deflector in the descent deck. As the stages part, the deflector stays below. Its chamber, jacket, mount and external feed fittings leave with the cabin. It delivered a nominal 3,500 lbf.',
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
    'Sixteen thrusters let Spider turn and translate independently.',
    'Each cluster stands out on an outrigger at 45° to the axes, with opposed vertical jets and two horizontal jets at right angles. The rendezvous radar, on the centreline above the forward face, tracked Gumdrop. The flashing tracking light below it worked until staging and then failed. The 26-inch S-band antenna provided a separate link to Earth.',
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
  LMDescent: [['Width across flats', '166 in · Mission Report fig. A.2-2']],
  LMLandingGear: [
    ['Pads', '4 × 37 in · press kit p. 43'],
    ['Tread radius', '167.57 in · NASA TN D-6850 p. 6'],
  ],
  LMDescentEngine: [
    ['Overall length / exit diameter', 'Approx. 85 / 58 in · NASA engine specifications, table I'],
    ['Mount', 'Two-axis gimbal · Mission Report A.2.11'],
  ],
  LMAscentEngine: [['Overall length / exit diameter', 'Approx. 51 / 31 in · NASA engine specifications, table I']],
  LMEquipment: [['Thruster axes from the centreline', '66.1 in up and down · 61.5 in fore, aft and side · MIT R-567 §6.4.1.4']],
  LMAscent: [
    ['Crew compartment', '92 in diameter × 42 in deep · press kit p. 42'],
    ['Forward hatch', '32 in square · press kit p. 42'],
  ],
};

export { lmPort as spiderPort };
export const {
  model: spiderModel,
  stackParts: spiderStackParts,
  views: spiderViews,
} = lunarGallery(
  'apollo-9',
  'Spider',
  'LM-3 Spider',
  [
    { node: 'LM_CommanderStation', label: 'McDivitt’s standing station', from: 'LMAscent', open: [44 * 3600, 100 * 3600] },
    { node: 'LM_PilotStation', label: 'Schweickart’s standing station', from: 'LMAscent', open: [43.3 * 3600, 101 * 3600] },
  ],
  stageParts,
  facts,
);

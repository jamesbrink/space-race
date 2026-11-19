import type { Part } from '../../../../../src/types.ts';
import { lower, upper, lunarGallery, lmPort } from '../../vehicles/lunar-gallery.ts';
const stageParts: [string, string, string, string, string][] = [
  [
    'LMDescentPower',
    'Four descent batteries',
    lower,
    'Four silver-zinc batteries supplied the descent buses.',
    'Eagle carried two batteries in quadrant I and two in quadrant IV. On Spider all four had occupied quadrant IV (Apollo 10 Mission Report A.2.1; compartment positions assumed for Eagle). Open the blankets to inspect their cases, covers, terminals and leads. Installed envelopes are estimated.',
  ],
  [
    'LMAscentPower',
    'Ascent battery bay',
    upper,
    'Two silver-zinc batteries, each rated at 296 ampere-hours, travelled with the ascent stage.',
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
    'The antenna looked down from beneath Eagle’s descent stage.',
    'Over the Moon this radar measured height above the terrain under Eagle. Range and velocity measurements updated the guidance computer during powered descent. Its antenna and electronics enclosure are reconstructed.',
  ],
  [
    'LMDescent',
    'Thermal blankets and outriggers',
    lower,
    'The octagonal lower stage carried the whole spacecraft at launch.',
    'Gold, copper and black blanket panels wrapped the stage. Four outriggers carried its loads into the adapter and supported the deployed legs. Blanket colours and seams are estimated from the lunar-orbit photographs.',
  ],
  [
    'LMPorch',
    'Forward porch and handrails',
    lower,
    'The porch projected over the ladder beneath the forward hatch.',
    'Twin handrails bordered the platform. Armstrong stepped from this platform onto the ladder; Aldrin followed.',
  ],
  [
    'LMLandingGear',
    'Landing gear, ladder and probes',
    lower,
    'Three probes signalled surface contact. The leg under the ladder had none.',
    'A ladder ran along the forward primary strut. In the launch stack the four assemblies fold inward beneath the outriggers. Protective shields covered the deployment mechanisms. Hinge positions and illustrated deployment paths are estimated from NASA TN D-6850.',
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
    'A short firing lowered Eagle’s orbit. On the next pass the engine throttled through the descent to Tranquility Base.',
    'Below its gimbal, the insulated chamber flares into a thin crushable nozzle extension. The engine view exposes the chamber jacket, mounting ring, attachments and external fittings. Their local shapes are reconstructed.',
  ],
  [
    'LMDPSTanks',
    'Descent propellant and helium tanks',
    lower,
    'Four tanks fed Eagle’s descent engine.',
    'Two held fuel and two held oxidizer. The model includes the helium vessels, tank bands and representative feed and pressurization lines. Routing and tank centres are estimated.',
  ],
  [
    'LMAscent',
    'Crew compartment and docking tunnel',
    upper,
    'Armstrong and Aldrin flew standing up behind two triangular windows.',
    'A third window above the commander looked up toward the docking target. Columbia’s probe met the conical drogue in the tunnel atop the midsection.',
  ],
  [
    lmPort.part,
    'Docking ring and drogue',
    upper,
    'Eagle carried the receiving half of the docking system above its overhead hatch.',
    'The cone guided Columbia’s probe into the capture socket. Retraction drew the rings together, and the crew removed the probe and drogue to open the transfer passage.',
  ],
  [
    'LMStations',
    'Two standing flight stations',
    upper,
    'Armrests and restraints held each pilot in position.',
    'Armstrong stood on the left and Aldrin on the right. The deck, side lockers, armrests, restraints and eye positions are reconstructed. Enter either station to look through the glazing.',
  ],
  [
    'LMControlPanels',
    'Displays and hand controllers',
    upper,
    'Armstrong and Aldrin shared the central guidance keyboard. Their computer carried the Luminary program.',
    'The instrument boards, attitude displays, switches, armrests and hand controllers are static. Panel relief and positions are estimated from the LM handbook.',
  ],
  [
    'LMAscentEngine',
    'Fixed ascent engine',
    upper,
    'A separate engine powered the ascent stage back to Columbia.',
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
    'Sixteen thrusters let Eagle turn and translate independently.',
    'Four outriggers stand at 45° to the pitch and roll axes. Each cluster carries two opposed vertical jets and two horizontal jets at right angles. The rendezvous radar tracked Columbia. The 26-inch S-band antenna provided a separate link to Earth.',
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
  LMDescent: [['Width across flats', '166 in · assumed from LM-3 fig. A.2-2']],
  LMLandingGear: [
    ['Pads', '4 × 37 in · Apollo 11 press kit, Lunar Module Landing Gear'],
    ['Tread radius', '167.57 in · NASA TN D-6850 p. 6'],
  ],
  LMDescentEngine: [
    ['Overall length / exit diameter', 'Approx. 85 / 58 in · NASA engine specifications, table I'],
    ['Mount', 'Two-axis gimbal · Apollo 11 press kit, Descent Propulsion System'],
  ],
  LMAscentEngine: [['Overall length / exit diameter', 'Approx. 51 / 31 in · NASA engine specifications, table I']],
  LMAscent: [
    ['Crew compartment', '92 in diameter × 42 in deep · LM handbook, crew compartment; assumed'],
    ['Forward hatch', '32 in square · LM handbook, crew compartment; assumed'],
  ],
};

export { lmPort as eaglePort };
export const {
  model: eagleModel,
  stackParts: eagleStackParts,
  views: eagleViews,
} = lunarGallery(
  'apollo-11',
  'Eagle',
  'LM-5 Eagle',
  [
    {
      node: 'LM_CommanderStation',
      label: 'Armstrong’s standing station',
      from: 'LMAscent',
      open: [100 * 3600, 128 * 3600],
    },
    { node: 'LM_PilotStation', label: 'Aldrin’s standing station', from: 'LMAscent', open: [100 * 3600, 128 * 3600] },
  ],
  stageParts,
  facts,
  false,
);

import type { Flight } from '../../../../../src/types.ts';
import { LC19 } from '../../../places/cape-canaveral/lc-19.ts';
import { LC19_SPECS, lc19Vehicle } from '../../../places/cape-canaveral/lc-19.parts.ts';
import { g4cParts, standing } from '../../crew/g4c-suit.parts.ts';
import {
  BASE,
  CHRONOLOGY,
  FT,
  GIV,
  IN,
  LB,
  NMI,
  SEDR,
  TITANS,
  TOP_AZ,
  along,
  cabin,
  dimensions,
  hingeAxis,
  seats,
  thrusters,
  type PartWords,
  geminiTitanStack,
  titanEngines,
  lb,
  THRUST,
} from '../../vehicles/gemini-titan.ts';
import { pad } from './pad.ts';
import { WEATHER } from './weather.ts';

const DEG = Math.PI / 180;
const KIT = 'NASA release 65-158, the Gemini-Titan 4 press kit (May 1965)';
/** Hours, minutes and seconds of ground elapsed time, as seconds from liftoff. */
const get = (h: number, m: number, s = 0) => h * 3600 + m * 60 + s;

/**
 * How far the pilot's hatch stood open: about 100°, by eye from the photographs of White outside (NASA S65-30427).
 * Estimated: no drawing read gives the hatch's travel, and a lanyard limited it on the day (the mission report, 5.1.10.4.5).
 */
const HATCH_OPEN = 100 * DEG;

const parts: PartWords[] = [
  {
    node: 'NoseFairing',
    name: 'Nose fairing',
    summary: 'A glass-fibre cap over the ship’s forward face, pushed off by a spring once the Titan had finished.',
    detail:
      'The forward section ends in a flat face full of fittings, and going up through the air it wants a cover. This ' +
      'one is laminated glass fibre, 5.31 in deep, and it is the tip of the whole vehicle. On this ship, as on the one ' +
      'before, the command pilot pressed the switch for it only after the second stage had cut off; a cable that held it ' +
      'was cut and a spring let it go. The next spacecraft had a radar under its fairing, threw it off in the climb, and ' +
      'used a pyrotechnic piston to do it. The cover over the horizon scanners goes on the same switch. Its size is ' +
      'McDonnell’s drawing; that it went by spring on this ship is the next flight’s report, which says what changed.',
    facts: [
      ['Depth', '5.31 in (0.13 m): Z233.97 to Z239.28'],
      ['Material', 'glass fibre reinforced plastic laminate'],
      ['Thrown off', 'after second stage cutoff, by a spring'],
      ['Under it', 'no radar: a closed face'],
    ],
  },
  {
    node: 'RendezvousRecovery',
    name: 'Rendezvous and recovery section',
    summary: 'Where the radar goes. This ship had a target and no radar, and found out what that meant.',
    detail:
      'The forward 42 inches: beryllium shingles, black outside, over a titanium frame, with the parachutes inside. ' +
      'On a ship going to meet another the rendezvous radar looks out of its face. Gemini 4 was to fly beside the ' +
      'second stage of its own Titan, and had no radar: McDivitt had his eyes, two flashing lights on the stage, and ' +
      'his thrusters. He pointed at the stage and thrust toward it, and it drew away below and ahead. Thrusting ' +
      'forward in orbit raises the orbit, a higher orbit is a slower one, and the target leaves. In about 80 minutes he ' +
      'made 74 burns, used 115 lb of propellant, and was never nearer than about a third of a mile; then he was told ' +
      'to stop, because the space walk mattered more. The radar came on the next ship. What closed this one’s face ' +
      'has not been found: it is drawn with the ribbed cover spacecraft 3 was photographed with.',
    facts: [
      ['Length', '42.00 in (1.07 m)'],
      ['Skin', 'unbeaded beryllium shingles'],
      ['Radar', 'none: the first was on spacecraft 5'],
      ['Station keeping', '74 burns, 115 lb of propellant, 102 ft/s'],
      ['Nearest to the stage', 'about 0.3 nautical mile'],
      ['Main parachute', 'ring-sail, 84.2 ft'],
    ],
  },
  {
    node: 'ReentryControl',
    name: 'Re-entry control system section',
    summary: 'Sixteen small thrusters that had to bring this ship home without its computer.',
    detail:
      'Eighteen inches of cylinder between the cabin and the forward section. Everything that steers the ship in ' +
      'orbit is in the adapter, and the adapter is thrown away before the ship comes home; from then to the ' +
      'parachute it is steered by this. There are two rings of eight thrust chambers of 25 lbf, each ring with its ' +
      'own fuel, oxidiser and nitrogen, so that either alone is enough. They stand in four clusters on the ' +
      'diagonals, and each fires along one of the ship’s own axes rather than out along a radius: so the ports ' +
      'are ovals. Gemini’s heat shield is set off-centre so that the ship makes a little lift, and by rolling with ' +
      'these thrusters a crew can point that lift and steer for the recovery ship; the computer says which way. On ' +
      'the fourth day this ship’s computer would not switch off and then would not work. So McDivitt flew the entry ' +
      'that needs no computer: he set the ship rolling steadily, which averages the lift to nothing, and came down ' +
      'like a Mercury. Which chamber fires which way is McDonnell’s drawing; where the clusters stand is read off ' +
      'a photograph of spacecraft 3.',
    facts: [
      ['Length', '18.00 in (0.46 m)'],
      ['Diameter', '38.66 in (0.98 m)'],
      ['Thrust chambers', '16 × 25 lbf, in two rings of 8'],
      ['Entry flown', 'rolling, with no lift: the computer had failed'],
      ['Landing', '50 nautical miles short of where tracking put it'],
    ],
  },
  {
    node: 'Hatches',
    name: 'Hatches',
    summary: 'Two doors, one over each man. On this flight the right one was opened in orbit, and was hard to shut.',
    detail:
      'Each man has a hatch over him, hinged along its outboard edge and held down by twelve latches, skinned in the ' +
      'same beaded shingles as the cabin, with a window at its forward end set like a windscreen. They were made to ' +
      'be blown open for the ejection seats. On 3 June 1965 the pilot’s was opened by hand, over the Pacific, with ' +
      'the cabin pumped down to nothing, and Edward White stood up in it and pushed off. It had not wanted to open: a ' +
      'spring that returns the pawl of the latches’ ratchet had stuck. When he was back in his seat it did not want ' +
      'to shut. The handle swung free; the suit, pressed up harder than usual, and the pack on his chest got in the ' +
      'way; the new seals pushed back. McDivitt held White down by the legs to give him something to pull against, ' +
      'and the latches went home. They had meant to open it again and throw out what they no longer needed, and ' +
      'did not. In the model the pilot’s hatch is on its hinge and the slider opens it. How far it opened is ' +
      'read off a photograph; the windows and the hatches’ edges are spacecraft 3’s, read off photographs of ' +
      'that ship to about two inches.',
    facts: [
      ['Number', '2, hinged on the outboard side'],
      ['Latches', '12 to a hatch, on one ratchet handle'],
      ['Opened in flight', 'the pilot’s: out at about 4 h 23 min'],
      ['Shut and the cabin pumped up', 'by 5 h 6 min'],
      ['Drawn open', 'about 100°: estimated'],
      ['Windows', 'an outer pane and two inner, at 35° to the hatch'],
    ],
    // A part with moves is not slid by the slider itself (viewer/explode.ts): so its own lift is the first of them, over
    // the stretch a part of its order would take (8 of 12: a third to five sixths), and then the pilot's hatch swings
    // on its hinge, on HatchRight, whose origin is on the hinge's line (vehicles/gemini_spacecraft.py build_hatches).
    // That it opened is documented; how far, estimated
    moves: [
      { kind: 'slide', by: along(TOP_AZ, 3.8, 1.7), from: 1 / 3, to: 5 / 6 },
      { kind: 'swing', node: 'HatchRight', axis: hingeAxis(1), angle: HATCH_OPEN, from: 0.6, to: 0.9 },
    ],
  },
  {
    node: 'ScannerFairing',
    name: 'Horizon scanner fairing',
    summary: 'A bronze-coloured cover over the infrared eyes that find the horizon. It goes once the ship is in orbit.',
    detail:
      'On the ship’s left side at the neck, two infrared scanners look out for the edge of the Earth and tell the ' +
      'ship which way is down. They would not survive the climb through the air uncovered, so a fairing sits over ' +
      'them and is thrown off with the nose fairing. This ship carried extra instruments to see how well the ' +
      'scanners did, and for 15 hours of the fourth day it was left to hold itself level by them alone. The ' +
      'scanners themselves go when the adapter goes: this crew, like the one before, saw something drift past the ' +
      'window just after retrofire, and it was decided that it had been the scanner head. The fairing’s size and ' +
      'place are read off a colour photograph of spacecraft 3 on the morning it flew, and taken to be the same here.',
    facts: [
      ['Covers', 'the horizon scanners, on the left side'],
      ['Lies', 'from Z166.5 to Z190.5, about two feet'],
      ['Thrown off', 'with the nose fairing, after the second stage’s cutoff'],
    ],
  },
  {
    node: 'Cabin',
    name: 'Cabin section',
    summary: 'Beaded shingles of René 41 over a titanium frame. The first American to walk in space walked on these.',
    detail:
      'A cone 70.53 in long at 20° to its axis, 90 in across the heat shield and 38.66 in across the neck. The skin ' +
      'is shingles of René 41, a nickel alloy, pressed into short beads that lie round the cone one after another, ' +
      'in cells between rows of fasteners: they stiffen the sheet and let it grow when hot, and it is black outside ' +
      'so that it radiates. The shingles are not the pressure vessel: that is a welded titanium box inside, and the ' +
      'room between its flat sides and the cone is equipment bays. Along the top, between the hatches, runs a white ' +
      'cover over the parachute’s cables. There is nothing on this skin to hold on to: no rail, no step. White ' +
      'found that out. With the gun’s gas gone he pulled himself about by the umbilical, which swung him back over ' +
      'the adapter whatever he meant, and McDivitt heard his boots on the roof. The paint is drawn as spacecraft ' +
      '3’s, UNITED STATES and the flag on each side below the hatch’s hinge: no photograph of this ship’s ' +
      'sides has been read close enough to say that it was so.',
    facts: [
      ['Length', '70.53 in (1.79 m)'],
      ['Half-angle', '20°'],
      ['Skin', 'beaded René 41 shingles, black'],
      ['Handholds', 'none'],
      ['Paint', 'UNITED STATES and the flag, each side: as spacecraft 3, assumed'],
      ['Name', 'none: after "Molly Brown" NASA allowed no names'],
    ],
  },
  {
    node: 'CrewStation',
    name: 'Crew station',
    summary:
      'Two ejection seats side by side, for four days: the longest any American had spent in space, in a cabin the size of a car’s front seat.',
    detail:
      'Two men sit as in an aeroplane, the command pilot on the left, in pure oxygen at about 5 psi, each with a ' +
      'window before him and a hatch over him. The seats are ejection seats on rails on the bulkhead behind, ' +
      'canted 12° outboard and 8° forward so that two of them leave on diverging paths. Mercury’s longest flight had ' +
      'been 34 hours; this was to be 98, and the question it was sent to answer was what four days of weightlessness ' +
      'did to a man. Not much, it turned out, though both were tired: one slept while the other watched, and the ' +
      'radio and the thrusters and each other’s elbows kept waking the sleeper. For most of an hour of it the cabin ' +
      'held no air at all, with the right-hand hatch open. The panels are drawn from McDonnell’s drawing of ' +
      'spacecraft 3’s, with the clock this ship added before the command pilot; the other changes, switches moved ' +
      'from one panel to another, are not drawn. The seats are empty: both men wore the G4C suit, which is modelled ' +
      'standing, at the foot of the erector, and not seated. No drawing read gives the pressure vessel’s ' +
      'dimensions: its sizes are those fitted round the crew of spacecraft 3.',
    facts: [
      ['Crew', '2: command pilot left, pilot right'],
      ['Seats', 'ejection seats, 22 in wide, canted 12° outboard and 8° forward'],
      ['Panels', 'spacecraft 3’s, with spacecraft 4’s G.m.t. clock'],
      ['Atmosphere', 'pure oxygen, 5.1 psi'],
      ['Power', '4 main batteries of 45 Ah here; 6 of 400 Ah in the adapter'],
      ['Suits', 'G4C: the two men stand at the pad, the seats are empty'],
    ],
  },
  {
    node: 'ExtravehicularEquipment',
    group: 'Spacecraft',
    inside: true,
    name: 'Extravehicular equipment',
    summary: 'A gas gun and 25 ft of gold hose: what Edward White went outside with.',
    detail:
      'Eleven weeks after Alexei Leonov, an American was to leave his ship, and the decision to try it on this flight ' +
      'was made public only nine days before the launch. The equipment was made at the Manned Spacecraft Center ' +
      'out of what there was. The umbilical is 25 ft of hose that brought White oxygen from the ship at 9 lb an hour, ' +
      'with the wires for his voice and his heartbeat and a tether beside it; a pack on his chest held an emergency ' +
      'supply in case it failed. The gun is two of the ejection seat’s oxygen bottles under a handle: squeeze, ' +
      'and two small jets on arms either side of the hand pull him forward, or one pushes him back. He left the ' +
      'hatch on it at about 4 hours 23 minutes, stopped himself fifteen feet out, came back and went out again, ' +
      'turning himself over as he liked. In four minutes the bottles were empty. He was outside for about 22, and ' +
      'when he was told to come in he said it was the saddest moment of his life. Both pieces went up in stowage ' +
      'boxes between and behind the seats’ heads, the gun in two halves; here they are drawn together between the ' +
      'seats’ heads, the gun put together with its arms folded. The umbilical’s length, the jets’ thrust and ' +
      'where each was stowed are the mission report’s; the gun’s folded size is the Smithsonian’s measure of the ' +
      'one White used; the rest is scaled from photographs. The chest pack and the cameras are not modelled.',
    facts: [
      ['Umbilical', '25 ft: oxygen, wires and a tether'],
      ['Oxygen through it', '9 lb an hour'],
      ['Manoeuvring unit', '2 tractor jets of 1 lbf, 1 pusher of 2 lbf'],
      ['Its gas', 'oxygen, in two egress-kit bottles: about 4 min of bursts'],
      ['Its size folded', '17 × 10 × 3 in; 6.8 lb'],
      ['Outside', 'about 22 min, from about 4 h 23 min'],
    ],
    // out through the pilot's hatch, on the crew's right
    explode: along(35, 3.4, 1.6),
    order: 9,
  },
  {
    node: 'HeatShield',
    name: 'Heat shield',
    summary: 'A shallow dish of resin-filled honeycomb, 90 inches across, that chars away.',
    detail:
      'Glass-fibre honeycomb filled with a silicone elastomer, bolted to the big end of the cabin: a dish 90 in ' +
      'across, part of a sphere of 144 in radius. It is an ablator, and it rides the whole flight inside the ' +
      'adapter, out of sight until the last of the adapter is cut away after retrofire. This one took a harder ' +
      'entry than was planned: rolling, with no lift to ease it, the ship pulled 7.7 g where 6.8 had been ' +
      'expected. The station taken here for its crown is one of SEDR 300’s that the drawing does not name.',
    facts: [
      ['Diameter', '90.00 in (2.29 m)'],
      ['Spherical radius', '144 in (3.66 m)'],
      ['Material', 'silicone-filled glass-fibre honeycomb'],
      ['Entry load', '7.7 g, against 6.8 planned'],
    ],
  },
  {
    node: 'RetroSection',
    name: 'Adapter: retrograde section',
    summary: 'Four solid rockets to come home on, and the first thrusters that could move a spacecraft sideways.',
    detail:
      'The upper two fifths of the white adapter, from station Z68.44. Inside, on a cross of aluminium I-beams, are ' +
      'four solid rockets in titanium balls about 13 in across, each of about 2,500 lbf for five and a half seconds, ' +
      'fired one after another. At 97 hours 40 minutes 1 second, a second early, they slowed Gemini 4 out of orbit; ' +
      'then the section itself was cut loose. In its skin are six thrusters of the manoeuvring system: two that fire ' +
      'forward, and four that push the ship to the left, to the right, up and down. On the ship before, those four ' +
      'had been dummies. These were real, and McDivitt first fired one fourteen minutes after liftoff, trying to ' +
      'stay beside the Titan’s second stage.',
    facts: [
      ['Retrograde rockets', '4 × about 2,500 lbf, 5.5 s each'],
      ['Fired', '97 h 40 min 1 s after liftoff'],
      ['Forward thrusters', '2 × 85 lbf'],
      ['Lateral thrusters', '4 × 100 lbf: the first real ones'],
      ['Skin', 'magnesium, white ceramic paint'],
    ],
  },
  {
    node: 'EquipmentSection',
    name: 'Adapter: equipment section',
    summary:
      'Six batteries where there had been three, four water tanks where there had been one: a three-orbit ship stretched to four days.',
    detail:
      'The lower three fifths of the adapter, 10 ft across at the foot, where it is bolted to the Titan with twenty ' +
      'bolts. It holds what a ship needs in orbit and not afterwards. The fuel cells that were to power a long ' +
      'flight were still not ready, so this ship did four days on batteries: six of 400 ampere-hours where the ' +
      'three-orbit flight had three. It carried four tanks of drinking water for one, 52 lb of oxygen for 15, and ' +
      '410 lb of propellant, of which the chase after the Titan’s second stage took 115 in the first 80 minutes; ' +
      'after that the ship mostly drifted, to save what was left. All of it stands against the wall round a clear ' +
      'middle: the propellant beyond one beam, the batteries and the water in two tiers beyond the other. In the ' +
      'middle, under the blast shield’s door and looking out of the back through an opening in the gold cover, ' +
      'is a spectrometer that counted the radiation belt’s protons and electrons where the belt dips over the South ' +
      'Atlantic, and beside it a boom that ran a magnetometer out past the end of the adapter to say which ' +
      'way the field lay. The skin is itself the radiator: coolant runs through hollow stringers on its inner ' +
      'face. The whole section is cut off just before retrofire. Which module stands on which side is ' +
      'McDonnell’s drawing, and so are the six batteries in two rows with the water tanks at the ends of the ' +
      'lower; the tanks of the manoeuvring system are his sizes for the early ships; the gold cover’s form is ' +
      'measured on a photograph of Gemini 7 in orbit; the other sizes, and each thing’s exact place, are estimated.',
    facts: [
      ['Base diameter', '120.00 in (3.05 m)'],
      ['Batteries', '6 silver-zinc, 400 Ah each'],
      ['Drinking water', '4 tanks'],
      ['Propellant', '410 lb: 164.5 of fuel, 245.9 of oxidiser'],
      ['Experiments here', 'a proton-electron spectrometer; a magnetometer on a boom'],
      ['Cut away', '97 h 39 min 14 s, before retrofire'],
    ],
  },
  {
    node: 'TitanStage2',
    name: 'Second stage',
    summary:
      'Two tanks and the guidance between them, and on this vehicle two flashing lights: it was to be the first target a crew ever chased.',
    detail:
      'Ten feet across, like the first stage, and built the same way: the tanks’ walls are the vehicle’s skin. ' +
      'Oxidiser is above fuel, and between the two tanks are the trusses that carry what flies the vehicle: radio ' +
      'guidance, a second flight control system able to take over from the first, and a malfunction detection ' +
      'system that told the crew what their booster was doing. The forward skirt is bare metal: the three vehicles ' +
      'before this one wore insulation there, and the flights showed it was not needed. What only this vehicle ' +
      'had is the pair of lights. Once its engine had stopped the stage was to be a target: two flashing lights of ' +
      'the kind made for the Agena, on opposite sides between the tanks, each on its own battery, came on at cutoff ' +
      'so that McDivitt could find it in the dark. He found it, tumbling, and could not close on it. It stayed ' +
      'up two days and broke up coming down over the Atlantic. Which sides the lights were on, and how far along, ' +
      'are not in what was read: estimated.',
    facts: [
      ['Diameter', '10 ft (3.05 m)'],
      ['Propellants', 'nitrogen tetroxide and Aerozine 50'],
      ['Forward skirt', '22.3 in, bare: the first vehicle without insulation there'],
      ['Flashing lights', '2, between the tanks, 180° apart: GLV-4 only'],
      ['Its orbit', '87.6 by 150.1 nautical miles'],
      ['Came down', 'in its 33rd revolution'],
    ],
  },
  {
    node: 'TitanStage2Engine',
    name: 'Second stage engine',
    summary: 'One chamber of 100,000 lbf, lit before the stages part.',
    detail:
      'An Aerojet YLR91-AJ-7, hung on a gimbal under the fuel tank and, until staging, inside the top of the first ' +
      'stage. Its propellants ignite on meeting, so it has no igniter and can be started at altitude without ' +
      'ceremony. Its bell is tubes cooled by the fuel as far as half its width, and below that an ablative skirt. One ' +
      'engine cannot roll the stage, so the gas that has driven its pumps is let out through a small swivelling ' +
      'nozzle, and that is the roll control. On this flight it was signalled at 152.43 seconds and shut down at ' +
      '333.75, two seconds sooner than planned, having given a little more thrust than nominal. The engine’s place ' +
      'is documented, and so are the two expansion ratios, 13 and 49.2, that put the joint in its bell where it is; ' +
      'the bell’s size is computed from them, and the rest of its form is representative.',
    facts: [
      ['Thrust', 'about 100,000 lbf at altitude (445 kN)'],
      ['Engine', 'Aerojet YLR91-AJ-7'],
      ['Burned', '152.43 s to 333.75 s from liftoff'],
      ['Roll control', 'the turbine’s exhaust, through a swivelling nozzle'],
    ],
  },
  {
    node: 'TitanInterstage',
    name: 'Interstage',
    summary: 'The first stage’s top, with holes to let the second stage’s fire out.',
    detail:
      'The stages part at its upper edge. A Titan does not coast between stages: the second stage’s engine is ' +
      'started while the vehicle is still in one piece, firing down into the top of the first stage, and only then ' +
      'are the bolts blown. For that moment the exhaust has to go somewhere, and it goes out through the ring of ' +
      'ports at the foot. On this flight the engine’s signal came at 152.43 seconds and the stages had begun to ' +
      'part by 153.14. The black and white panels are the roll pattern: the cameras that followed the vehicle could ' +
      'see from them whether it was turning. The colour photograph of this vehicle leaving the pad shows the same ' +
      'pattern as GLV-3’s, whose edges the model’s are read from.',
    facts: [
      ['Stages part at', 'station 500, its upper edge'],
      ['Staging', '"fire in the hole": engine start before separation'],
      ['Paint', 'eight panels, black on the diagonals'],
      ['Stages began to part', '153.14 s after liftoff'],
    ],
  },
  {
    node: 'TitanStage1',
    name: 'First stage',
    summary: 'Seventy feet of tank with UNITED STATES down it, held on the pad an hour and a quarter by its own erector.',
    detail:
      'Oxidiser tank above, fuel tank below, and the oxidiser’s feed line running down through the middle of the ' +
      'fuel. Nothing is cryogenic: nitrogen tetroxide and a hydrazine blend keep at ordinary temperatures. The wall ' +
      'is bare aluminium down to the splice between the tanks, white below that, then black, with the roll pattern ' +
      'at the foot, and UNITED STATES down the bare metal, one letter under the next: the photograph of this ' +
      'vehicle’s liftoff shows it as GLV-3 wore it. The launch was an hour and a quarter late. The tower that stands ' +
      'a Titan up on Complex 19 is lowered flat before the launch, and on 3 June it stuck 12° from the vehicle: a ' +
      'connector in a junction box had been fitted wrongly. This was the first launch shown live in Europe, by ' +
      'satellite, and the first flown from the new control centre at Houston. At liftoff the tank walls were pale ' +
      'with frost or dew, the propellants having been chilled; the model is the vehicle dry.',
    facts: [
      ['Length with its engines', '848.1 in (21.54 m)'],
      ['Diameter', '10 ft (3.05 m)'],
      ['Lettering', 'UNITED STATES, upright letters, one side'],
      ['Paint', 'white band, black band, roll pattern: as GLV-3'],
      ['Launch delayed', 'about 1 h 15 min: the erector would not lower'],
      ['Weight at liftoff, with the spacecraft', '336,000 lb'],
    ],
  },
  {
    node: 'TitanStage1Engine',
    name: 'First stage engine',
    summary: 'Two chambers on one frame: 430,000 lbf, and a little more on the day.',
    detail:
      'An Aerojet YLR87-AJ-7: two thrust chambers, each with its own turbopump, on a single frame hung from four ' +
      'longerons under the fuel tank, in the open. It is started by a solid cartridge that spins the pumps, and ' +
      'because the propellants light on meeting there is nothing else to go wrong; the signal came 3.24 seconds ' +
      'before liftoff. The missile had a fault a warhead could live with and a crew could not: it shook along its ' +
      'length, thrust and feed lines and structure driving one another, like a pogo stick. The cure is on the feed ' +
      'lines here: a standpipe on each oxidiser line and a piston accumulator on each fuel line, and from this ' +
      'vehicle on the standpipes could be charged from the blockhouse. The chambers gave more thrust than expected ' +
      'and the pitch programme ran a little slow, so the vehicle climbed steeper than planned and cut off at ' +
      '152.43 seconds, a second early. The engine’s length and gimbal station are documented; its bells are sized ' +
      'from published ratios and its form is representative.',
    facts: [
      ['Thrust', 'about 430,000 lbf at liftoff (1,913 kN)'],
      ['Engine', 'Aerojet YLR87-AJ-7, two chambers'],
      ['Length', '123.04 in (3.13 m)'],
      ['Against pogo', 'oxidiser standpipes, charged remotely; fuel accumulators'],
      ['Cutoff', '152.43 s after liftoff'],
    ],
  },
];

/** The vehicle as built, in its own frame; at Complex 19 it stands on the thrust mount (`lc19Vehicle`); the gallery stands it on its engines. */
const vehicle = lc19Vehicle(
  geminiTitanStack({
    flight: 'gt-4',
    parts,
    // the crew climbed in at T-100 minutes of a count that then held 1 h 16 min for the erector (On the Shoulders of
    // Titans, p. 245): 176 min before the liftoff. When the hatches were shut is not in what was read: twenty minutes
    // are allowed, estimated
    seats: seats([-176 * 60, -156 * 60]),
    views: [
      { id: 'eva', label: 'Pilot’s hatch', nodes: ['Hatches', 'ExtravehicularEquipment'], from: along(55, 0.5) },
      { id: 'beacons', label: 'Flashing lights', nodes: ['TitanStage2'], from: along(45, 0.1) },
    ],
    cabin: cabin({
      radar: 'For the rendezvous radar, which this ship did not carry: the Titan’s second stage was chased by eye.',
      fairing: 'Pressed after second stage cutoff on this ship, to throw off the nose and scanner fairings.',
      power: 'The pilot’s ammeter: on this ship, six batteries in the adapter.',
    }),
  }),
  BASE,
);

/**
 * The two men as they stood on the deck that morning, by the foot of the crew's ramp, facing the erector: each a figure
 * the site can be walked as (crew/g4c_suit.py). Where each stood is ours. The portable ventilator each carried and his
 * yellow overshoes are not built (crew/g4c-suit.md). The pad stands round them as at 07:07, when they reached it.
 */
const ARRIVED = -(3 * 3600 + 8 * 60 + 59.562);
const crew = standing({
  flight: 'gt-4',
  id: 'crew',
  name: 'Command pilot',
  scale: 'James A. McDivitt · 1.80 m, 1.85 m suited · to scale',
  parts: g4cParts('McDivitt'),
  height: 1.851,
  at: [15, 0, -7],
  boarding: ARRIVED,
});
const pilot = standing({
  flight: 'gt-4',
  id: 'pilot',
  name: 'Pilot',
  scale: 'Edward H. White II · 1.83 m, 1.87 m suited · to scale',
  parts: g4cParts('White', {
    Torso: {
      summary: 'The G4C with the cover layer for going outside, under the harness.',
      detail:
        'White’s suit had what McDivitt’s did not: "A cover layer for thermal and micrometeoroid protection" over the whole, white nylon over layers of aluminised Mylar and felt, 3 3/4 lb of it, an integral part of the suit. It made him less supple than his command pilot, and warm all four days; in orbit he took off its sleeves. How much it let the suit out is estimated. The overvisor and the thermal gloves he wore outside went up with him and are not built.',
    },
  }),
  height: 1.874,
  at: [21, 0, -7],
  boarding: ARRIVED,
});

export const flight: Flight = {
  id: 'usa/gemini/gt-4',
  nation: 'USA',
  agency: 'NASA',
  program: 'Project Gemini',
  designation: 'Gemini-Titan 4',
  // the mission's own style, in Roman: no name was allowed after Gemini-Titan 3's (README.md, "The name")
  callsign: 'Gemini IV',
  spacecraft: 'Gemini spacecraft No. 4 (McDonnell Aircraft)',
  launchVehicle: 'Gemini Launch Vehicle 4, a Titan II (Martin)',
  // 15:15:59.562 G.m.t. (the mission report, 4.1 and Table 4-I): 10:15:59.562 a.m. e.s.t.
  launch: '1965-06-03T15:15:59.562Z',
  launchSite: LC19.name,
  site: LC19,
  weather: WEATHER,
  crew: ['James A. McDivitt', 'Edward H. White II'],
  summary:
    'Four days in orbit, and twenty minutes outside. Edward White left the ship on a 25 ft umbilical with a gas gun ' +
    'in his hand, the first American to do it; the chase after the Titan’s own second stage, tried first, taught ' +
    'that thrusting at a thing in orbit does not bring you to it; and when the computer failed on the fourth day ' +
    'the ship came home the way a Mercury did.',
  facts: [
    { label: 'Liftoff', value: '3 June 1965, 15:15:59.562 UTC' },
    { label: 'Command pilot', value: 'James A. McDivitt' },
    { label: 'Pilot', value: 'Edward H. White II' },
    { label: 'Duration', value: '97 h 56 min 12 s' },
    { label: 'Revolutions', value: '62' },
    { label: 'Orbit at insertion', value: '162 km by 282 km, 32.53°' },
    { label: 'Period', value: '88.90 min' },
    { label: 'Outside the ship', value: 'White, about 22 min' },
    { label: 'Landing', value: '27°44′ N 74°14′ W' },
    { label: 'Recovery', value: 'USS Wasp' },
  ],
  // The flight as flown; README.md, "Timeline", gives each time its source. All are the mission report's (MSC-G-R-65-3):
  // the launch phase to the hundredth of a second from its Table 4-I, the rest from the same table and section 4.1,
  // where the extravehicular times are given as "approximately" and "about".
  timeline: [
    { t: -3.24, event: 'First stage engine start signal' },
    { t: 0, event: 'Liftoff, 10:15:59.562 EST, about an hour and a quarter late: the erector had stuck on its way down' },
    { t: 10.1, event: 'Roll programme begins; complete at 20.40 s' },
    { t: 22.95, event: 'Pitch programme begins' },
    { t: 152.43, event: 'First stage cutoff and second stage start signal, 0.94 s early' },
    { t: 153.14, event: 'The stages begin to part' },
    { t: 333.75, event: 'Second stage cutoff, 2.07 s early; the two flashing lights on the stage come on' },
    { t: 365.55, event: 'The spacecraft cuts itself free, 31.8 s after cutoff; the aft thrusters burn 5 s to push it clear' },
    { t: 369.7, event: 'In orbit: 25,746 ft/s, 87.6 by 152.2 nautical miles. McDivitt turns to find the second stage' },
    {
      t: get(1, 30),
      event:
        'About the end of the first revolution: the chase is called off after 74 burns, 115 lb of propellant and no nearer than 0.3 nautical mile',
    },
    { t: get(1, 40), event: 'About now, preparations to go outside begin; they take longer than planned and are put off one revolution' },
    { t: get(4, 23), event: 'About now, White leaves the hatch on the manoeuvring unit; its gas lasts about 4 min' },
    { t: get(4, 46), event: 'About now, White begins to come back in, nearly 10 min later than planned' },
    { t: get(5, 6), event: 'The hatch is latched at last and the cabin pumped up; the ship is left to drift for two and a half days' },
    { t: get(75, 45, 43), event: 'The computer will not switch off; nothing tried in the next revolutions restores it' },
    { t: get(97, 28, 2), event: 'The aft thrusters burn 2 min 41 s to bring the perigee down: 42.3 nautical miles, where 45 was planned' },
    { t: get(97, 39, 14), event: 'The equipment section is cut away' },
    { t: get(97, 40, 1), event: 'Retrofire, a second early: four rockets, one after another' },
    { t: get(97, 40, 47), event: 'The retrograde section is cut away' },
    { t: get(97, 44, 59), event: 'Radio blackout begins, the ship rolling steadily so that its lift cancels; it ends at 97:49:14' },
    { t: get(97, 50, 53), event: 'Drogue parachute' },
    { t: get(97, 52, 11), event: 'Pilot parachute, and the main parachute after it' },
    { t: get(97, 56, 12), event: 'Landing, 27°44′ N 74°14′ W, as the recovery ship reported it' },
  ],
  specs: [
    ...LC19_SPECS,
    {
      group: 'Pressure suit',
      label: 'McDivitt, in helmet and boots',
      value: 1.851,
      unit: 'm',
      confidence: 'estimated',
      note: 'the standing figure as built (crew/g4c_suit.py), on a man of 1.803 m: "5 ft. 11 in." in the press kit’s crew biographies (NASA release 65-158, p. 83), documented. The suit’s own thickness is estimated',
    },
    {
      group: 'Pressure suit',
      label: 'White, in helmet and boots',
      value: 1.874,
      unit: 'm',
      confidence: 'estimated',
      note: 'the standing figure as built, on a man of 1.829 m: "6 ft." (the same, p. 84), documented. The suit’s thickness and its cover layer’s are estimated',
    },
    ...dimensions(
      'documented',
      `${SEDR}, Figures 2-3 and 2-4, a manual that covers spacecraft 3, 4 and 7`,
      `the mission report’s Figure 3-1, "GLV-4 - Spacecraft 4 relationships" (${GIV})`,
    ),
    {
      group: 'Spacecraft',
      label: 'Weight at launch',
      value: 7879.05 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `7,879.05 lb, "Launch, gross weight" (${GIV}, section 3.3); the press kit had "approximately 7,000 pounds" (${KIT})`,
    },
    {
      group: 'Spacecraft',
      label: 'Weight at retrofire',
      value: 5432.44 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: '5,432.44 lb, "Retrograde": the re-entry module and the retrograde section (the same table)',
    },
    {
      group: 'Spacecraft',
      label: 'Weight at landing',
      value: 4305.05 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: '4,305.05 lb, "Touchdown (no parachute)"; 4,725.71 lb at the start of the entry (the same table)',
    },
    {
      group: 'Spacecraft',
      label: 'OAMS propellant at launch',
      value: (164.5 + 245.9) * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `164.5 lb of fuel and 245.9 lb of oxidiser, loaded on 3 and 4 May 1965 (${GIV}, 5.1.8.1.1). About 140 lb went in the first revolution, 57 lb between it and the last burn, 110 lb in that burn, and 25 lb of usable propellant was left when the equipment section went (5.1.8.1.3)`,
    },
    {
      group: 'Spacecraft',
      label: 'Adapter batteries',
      value: 6,
      unit: 'batteries',
      confidence: 'documented',
      note: `six silver-zinc batteries, where spacecraft 3 had three (${GIV}, 3.1.2.6 and Figure 3-11)`,
    },
    {
      group: 'Spacecraft',
      label: 'Umbilical',
      value: 25 * FT,
      unit: 'm',
      confidence: 'documented',
      note: `"a 25-foot umbilical assembly", with a restraint tether and the wires for voice and bioinstrumentation, to give 9.0 lb of oxygen an hour (${GIV}, 3.1.2.3.1)`,
    },
    {
      group: 'Spacecraft',
      label: 'Manoeuvring unit, folded length',
      value: 17 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '"Folded: 17 x 10 x 3 in"; overall 2 ft 8 in by 1 ft 2 in by 9 in, 6.8 lb (the Smithsonian National Air and Space Museum’s record of the unit White used, A19670211000, which names AiResearch as its maker; the mission report has it developed and made at the Manned Spacecraft Center)',
    },
    {
      group: 'Spacecraft',
      label: 'Pilot’s hatch, as opened',
      value: 100,
      unit: 'deg',
      confidence: 'estimated',
      note: 'about 100° from shut, by eye from the photographs of White outside (NASA S65-30427). No drawing read gives the hatch’s travel',
    },
    {
      group: 'Spacecraft',
      label: 'Perigee at insertion',
      value: 87.6 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `87.6 nautical miles, against 87.0 planned (${GIV}, Table 4-III, the final figure from tracking; 86.9 in real time)`,
    },
    {
      group: 'Spacecraft',
      label: 'Apogee at insertion',
      value: 152.2 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: '152.2 nautical miles, against 159 planned (the same table and section 4.1). After the station keeping it was 90.4 by 159.9; by the 61st revolution, 86.1 by 136.5',
    },
    {
      group: 'Spacecraft',
      label: 'Period',
      value: 88.9 * 60,
      unit: 's',
      confidence: 'documented',
      note: '88.90 min at insertion (the same table)',
    },
    { group: 'Spacecraft', label: 'Inclination', value: 32.53, unit: 'deg', confidence: 'documented', note: '32.53° (the same table)' },
    {
      group: 'Spacecraft',
      label: 'Speed at insertion',
      value: 25746 * FT,
      unit: 'm/s',
      confidence: 'documented',
      note: `25,746 ft/s at 369.7 s from liftoff, when the aft thrusters had finished (${GIV}, 4.1); 25,743 ft/s at separation, 365.6 s (Table 4-II)`,
    },
    {
      group: 'Spacecraft',
      label: 'Station keeping, nearest approach',
      value: 0.3 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `"approximately 0.3 nautical mile", and 5.1 at the furthest; 74 manoeuvres in about 80 minutes, 115 lb of propellant, about 102 ft/s (${GIV}, 4.1). McDivitt thought they had been within 60 m at the nearest; White thought 200 to 300 (${TITANS}, p. 246)`,
    },
    {
      group: 'Spacecraft',
      label: 'Time outside',
      value: 22 * 60,
      unit: 's',
      confidence: 'documented',
      note: `"approximately 22 minutes" (${GIV}, section 7.1.1); out at "approximately 04:23:00", coming in from "about 04:46:00", the hatch shut and the cabin pressurised by 05:06 (4.1). ${TITANS}, p. 250, has 15 min 40 s before McDivitt asked the ground and was told to get him back in`,
    },
    {
      group: 'Spacecraft',
      label: 'Retrofire, from liftoff',
      value: get(97, 40, 1),
      unit: 's',
      confidence: 'documented',
      note: `97:40:01, a second before the planned 97:40:02 (${GIV}, Table 4-I)`,
    },
    {
      group: 'Spacecraft',
      label: 'Duration, liftoff to landing',
      value: get(97, 56, 12),
      unit: 's',
      confidence: 'documented',
      note: `97:56:12 (${GIV}, Table 4-I and 4.1; ${CHRONOLOGY}, as the programme's summary of its flights quotes it)`,
    },
    {
      group: 'Spacecraft',
      label: 'Landing short of the predicted point',
      value: 50 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `"50 nautical miles short of the landing point predicted with preliminary solution" (${GIV}, 4.3): the entry was flown rolling, without lift, because the computer had failed. The recovery ship reported 27°44′ N 74°14′ W (4.1); the report's summary has 74°11′ W`,
    },
    {
      group: 'Launch vehicle',
      label: 'Weight at liftoff, with the spacecraft',
      value: 336000 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `336,000 lb at liftoff and 340,000 lb at ignition, the weights the Aerospace Corporation gave (${GIV}, section 3.3)`,
    },
    {
      group: 'Launch vehicle',
      label: 'Flight azimuth',
      value: 72,
      unit: 'deg',
      confidence: 'documented',
      note: `72° (${GIV}, Figure 6-1, "Launch azimuth = 72°"; the roll to it ran from 10.10 s to 20.40 s, Table 4-I)`,
    },
  ],
  motors: [
    ...titanEngines(
      {
        burnS: 152.43,
        confidence: 'documented',
        note: `a combined ${lb(2 * THRUST.stage1Chamber.value)} lb of thrust for the two, as the nominal (${KIT}); on the day it was "higher than expected" (${GIV}, 4.1), by how much is in section 5.2, not transcribed. The burn is liftoff to the shutdown signal, 152.43 s, with the start signal 3.24 s before liftoff (Table 4-I)`,
      },
      {
        burnS: 181.32,
        // the thrust is the nominal and the burn is a difference of two documented times: the entry takes the weaker
        confidence: 'derived',
        note: `${lb(THRUST.stage2.value)} lb of thrust at altitude, as the nominal (${KIT}); "higher than nominal" on the day (${GIV}, 4.1). The burn is the start signal at 152.43 s to the shutdown signal at 333.75 s (Table 4-I): 181.32 s`,
      },
    ),
    ...thrusters('spacecraft 4'),
  ],
  models: [vehicle, pad, crew, pilot],
  // the place round the pad as it stood that June: as in March (places/cape-canaveral/lc19/model/1965-03.py)
  surroundings: 'models/usa/places/cape-canaveral/lc19/1965-03.glb',
};

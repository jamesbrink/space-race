import type { Flight } from '../../../../../src/types.ts';
import { LC19 } from '../../../places/cape-canaveral/lc-19.ts';
import {
  CHRONOLOGY,
  FT,
  GV,
  GVII,
  IN,
  KIT_7_6,
  LB,
  NMI,
  SEDR2,
  TITANS,
  along,
  cabin,
  dimensions,
  seats,
  thrusters,
  type PartWords,
  geminiTitanStack,
  titanEngines,
  lb,
  THRUST,
} from '../../vehicles/gemini-titan.ts';

/** Hours, minutes and seconds of ground elapsed time, as seconds from liftoff. */
const get = (h: number, m: number, s = 0) => h * 3600 + m * 60 + s;

// What was read for this flight. Its own mission report (MSC-G-R-66-2, January 1966) has not been found: README.md, "Sources".
const MIDPROGRAM = 'Gemini Midprogram Conference (NASA SP-121)';
const KIT = KIT_7_6;
const SUPP4 =
  'Gemini 6 Inertial Guidance System Evaluation and Trajectory Reconstruction, Supplemental Report 4 to the Gemini VI-A mission report (TRW, June 1966)';
const SUPP5 = 'Gemini GT-6A Post Flight Analysis Report, Supplemental Report 5 to the Gemini VI-A mission report (IBM, March 1966)';

const parts: PartWords[] = [
  {
    node: 'NoseFairing',
    name: 'Nose fairing',
    summary: 'A glass-fibre cap over the ship’s forward face, where the radar and the fittings for docking were.',
    detail:
      'The forward section ends in a flat face, and going up through the air it wants a cover. This one is laminated ' +
      'glass fibre, 5.31 in deep, and it is the tip of the whole vehicle. Under it on this ship were the four ' +
      'antennas of the rendezvous radar and, round the rim, what a ship needs to dock: three latch receptacles for ' +
      'an Agena’s hooks to catch, which the fairing shields on the way up. The Agena they were made for was lost ' +
      'seven weeks before the ship flew, and it met another Gemini, which had nothing to catch. When this fairing ' +
      'was thrown off is in the flight’s own report, which has not been found: on the ship before it went 207 ' +
      'seconds after liftoff, with the second stage burning. Its size is McDonnell’s drawing.',
    facts: [
      ['Depth', '5.31 in (0.13 m): Z233.97 to Z239.28'],
      ['Material', 'glass fibre reinforced plastic laminate'],
      ['Under it', 'the rendezvous radar and three docking latch receptacles'],
      ['Thrown off', 'not found for this flight'],
    ],
  },
  {
    node: 'RendezvousRecovery',
    name: 'Rendezvous and recovery section',
    summary: 'The radar that found Gemini 7 at 232 nautical miles and held it until the two ships were side by side.',
    detail:
      'The forward 42 inches: beryllium shingles, black outside, over a titanium frame, with the parachutes inside ' +
      'and the radar on its face. Four spiral antennas: one sends, and three listen for the answer of a transponder ' +
      'on the target, which on this flight was in the nose of Gemini 7. From how long the answer takes the radar has ' +
      'the range, and from the difference between the three listeners the bearing; the computer turns them into the ' +
      'burns that will bring the ships together. It was switched on three hours into the flight, locked on solidly at ' +
      '232 nautical miles and stayed locked until the ships were together. Its ranges were exact; its angles ' +
      'wandered a little, and the crew checked them against the stars. The ship was built to go on and dock with an ' +
      'Agena, so this section also has three latch receptacles round its rim, and an index bar, stowed until it is ' +
      'wanted, to be run out and steered into a slot in the Agena’s cone. The Agena was lost on 25 October, and ' +
      'there is nothing in what was read to say they were taken off before December: they are taken to have flown, ' +
      'and the photograph Gemini 7’s crew took of this nose shows a notch in the rim where the lowest receptacle ' +
      'would be. When the main parachute comes out this whole section is pulled off and lost. The radar’s antennas ' +
      'are sized from the sketch of spacecraft 5’s; the receptacles are scaled from McDonnell’s figure, and the ' +
      'stowed bar is not built.',
    facts: [
      ['Length', '42.00 in (1.07 m)'],
      ['Skin', 'unbeaded beryllium shingles'],
      ['Radar', '4 spiral antennas: 1 transmitting, 3 receiving; under 50 lb and 80 W'],
      ['Solid lock on Gemini 7', '232 nautical miles'],
      ['Docking fittings', 'an index bar and 3 latch receptacles: taken to have flown'],
      ['Main parachute', 'ring-sail, 84.2 ft'],
    ],
  },
  {
    node: 'ReentryControl',
    name: 'Re-entry control system section',
    summary: 'Sixteen small thrusters for the way home, which on this flight was steered by the ship’s own computer.',
    detail:
      'Eighteen inches of cylinder between the cabin and the forward section. Everything that steers the ship in ' +
      'orbit is in the adapter, and the adapter is thrown away before the ship comes home; from then to the ' +
      'parachute it is steered by this. There are two rings of eight thrust chambers of 25 lbf, each ring with its ' +
      'own fuel, oxidiser and nitrogen, so that either alone is enough. A Gemini comes through the air with a ' +
      'little lift, most when it flies level; rolling the ship turns that lift to one side or the other, and so ' +
      'chooses where it comes down. The three crews before had each landed 44 nautical miles or more from their ' +
      'mark. On this flight Schirra held the ship banked 55° to the left until the computer took over at about ' +
      '85 km, then followed its needles left and right against an overshoot, and landed 7 nautical miles from the ' +
      'point aimed for: the first controlled re-entry to succeed. Which chamber fires which way is McDonnell’s ' +
      'drawing; where the clusters stand is read off a photograph of spacecraft 3.',
    facts: [
      ['Length', '18.00 in (0.46 m)'],
      ['Diameter', '38.66 in (0.98 m)'],
      ['Thrust chambers', '16 × 25 lbf, in two rings of 8'],
      ['Bank held before guidance', '55° left'],
      ['Landing', '7 nautical miles from the planned point'],
    ],
  },
  {
    node: 'Hatches',
    name: 'Hatches',
    summary: 'Two doors with a window each. In one of them, when the ships met, was a card reading BEAT ARMY.',
    detail:
      'Each man has a hatch over him, hinged along its outboard edge and held down by twelve latches, skinned in the ' +
      'same beaded shingles as the cabin. The latching mechanism was a new design from this ship on: Gemini 4’s ' +
      'crew had struggled to get theirs shut after the walk outside. The window is at the hatch’s forward end and ' +
      'is not in the skin: the outer pane stands at about 35° to the hatch, so that it faces forward, and ahead of ' +
      'it a trough is cut into the cone for the pilot to look along. The last of the way to Gemini 7 was flown ' +
      'through them by eye, and for five hours after that the two crews looked at each other through four panes ' +
      'of glass. The photograph Gemini 7’s crew took of this ship from 38 ft shows a blue card propped in its ' +
      'right-hand window that reads BEAT ARMY. The Sun came so hard through one window and then the other that ' +
      'the two men passed the controls back and forth. The pane’s angle is McDonnell’s drawing; where the windows ' +
      'and the hatches’ edges lie is read off photographs of spacecraft 3, to about two inches.',
    facts: [
      ['Number', '2, hinged on the outboard side'],
      ['Latches', '12 to a hatch, of a new design from this ship'],
      ['Windows', 'an outer pane and two inner, at 35° to the hatch'],
      ['Window opening', 'about 14.8 in across and 8.5 in fore and aft'],
      ['Opened in flight', 'no'],
      ['In the right-hand window', 'a card, BEAT ARMY (NASA S65-64040)'],
    ],
  },
  {
    node: 'ScannerFairing',
    name: 'Horizon scanner fairing',
    summary: 'A bronze-coloured cover over the infrared eyes that find the horizon, thrown off on the way up.',
    detail:
      'On the ship’s left side at the neck, two infrared scanners look out for the edge of the Earth and tell the ' +
      'ship which way is down. They would not survive the climb through the air uncovered, so a fairing sits over ' +
      'them, and it is thrown off with the nose fairing. When this ship’s went is not in what was read: on the ' +
      'ship before, both went 207 seconds after liftoff. Its size and place are read off a colour photograph of ' +
      'spacecraft 3 on the morning it flew, and taken to be the same here.',
    facts: [
      ['Covers', 'the horizon scanners, on the left side'],
      ['Lies', 'from Z166.5 to Z190.5, about two feet'],
      ['Thrown off', 'with the nose fairing; the time is not found'],
    ],
  },
  {
    node: 'Cabin',
    name: 'Cabin section',
    summary: 'Beaded shingles of René 41 over a titanium frame, photographed from another spacecraft 38 ft away.',
    detail:
      'A cone 70.53 in long at 20° to its axis, 90 in across the heat shield and 38.66 in across the neck. The skin ' +
      'is shingles of René 41, a nickel alloy, pressed into short beads that lie round the cone one after another, ' +
      'in cells between rows of fasteners: they stiffen the sheet and let it grow when hot, and it is black outside ' +
      'so that it radiates. The shingles are not the pressure vessel: that is a welded titanium box inside, and the ' +
      'room between its flat sides and the cone is equipment bays. This ship and Gemini 7 photographed each ' +
      'other in orbit. The picture Borman and Lovell took of this one from 38 ft (NASA S65-64040) shows ' +
      'UNITED STATES in white on its right side with the flag aft of it, as on spacecraft 3, and the white strip ' +
      'along its top. NASA allowed no names on its Geminis after the first, and ' +
      'this one had none: the A in Gemini VI-A marks the second attempt at the sixth mission. The paint on the ' +
      'left side is taken to match the right.',
    facts: [
      ['Length', '70.53 in (1.79 m)'],
      ['Half-angle', '20°'],
      ['Skin', 'beaded René 41 shingles, black'],
      ['Paint', 'UNITED STATES and the flag: on the right side by photograph, assumed on the left'],
      ['Name', 'none'],
    ],
  },
  {
    node: 'CrewStation',
    name: 'Crew station',
    summary: 'Two ejection seats that were nearly used on 12 December, and a harmonica that was used on the 16th.',
    detail:
      'Two men sit as in an aeroplane, the command pilot on the left, in pure oxygen at about 5 psi, each with a ' +
      'window before him and a hatch over him. Schirra and Stafford were strapped in here for three counts. On 25 ' +
      'October they sat ready while their Agena target was lost over the Atlantic. On 12 December the Titan’s ' +
      'engines lit and stopped under them with the clock on the panel running; the rule was to pull the ring ' +
      'between the knees, and Schirra, who had felt no lift, did not. On the 15th they flew, and six hours later ' +
      'were parked beside Gemini 7. Next morning, before the retrorockets, Stafford reported an object in a polar ' +
      'orbit about to re-enter, and Schirra played "Jingle Bells" on a four-hole harmonica while Stafford shook a ' +
      'string of small bells. The panels are drawn from McDonnell’s drawing of spacecraft 3’s, with the clock ' +
      'spacecraft 4 added and, on the centre panel, a clock counting hours, minutes and seconds from liftoff, ' +
      'which this ship was the first to have; its place there is the next ship’s, assumed for this one. What ' +
      'else this ship changed is not drawn: a voltmeter and ammeter for its batteries, the panel that was to ' +
      'have commanded the Agena. The seats are empty: both men ' +
      'wore the G4C suit, which is not modelled. No drawing read gives the pressure vessel’s dimensions: its sizes ' +
      'are those fitted round the crew of spacecraft 3.',
    facts: [
      ['Crew', '2: command pilot left, pilot right'],
      ['Seats', 'ejection seats, 22 in wide, canted 12° outboard and 8° forward'],
      ['Panels', 'spacecraft 3’s, with spacecraft 4’s G.m.t. clock'],
      ['Elapsed-time clock', 'the first on a Gemini; drawn where spacecraft 7’s was: assumed'],
      ['Atmosphere', 'pure oxygen, about 5 psi'],
      ['Power', '3 batteries of 400 Ah in the adapter; 4 of 45 Ah here for the way home'],
      ['Suits', 'G4C: not modelled, the seats are empty'],
    ],
  },
  {
    node: 'HeatShield',
    name: 'Heat shield',
    summary: 'A shallow dish of resin-filled honeycomb, 90 inches across, that chars away.',
    detail:
      'Glass-fibre honeycomb filled with a silicone elastomer, bolted to the big end of the cabin: a dish 90 in ' +
      'across, part of a sphere of 144 in radius. It is an ablator, and it rides the whole flight inside the ' +
      'adapter, out of sight until the last of the adapter is cut away after retrofire. On this flight that was ' +
      'in darkness, and the crew, their eyes used to the cabin’s light, did not see the horizon until just before ' +
      '400,000 ft. The ship came down in the western Atlantic 7 nautical miles from the point it ' +
      'had steered for, and was hoisted aboard the carrier Wasp with its crew still in it. The station taken here ' +
      'for the shield’s crown is one of SEDR 300’s that the drawing does not name.',
    facts: [
      ['Diameter', '90.00 in (2.29 m)'],
      ['Spherical radius', '144 in (3.66 m)'],
      ['Material', 'silicone-filled glass-fibre honeycomb'],
      ['Landing', '23°35′ N 67°50′ W, 25 h 51 min 24 s after liftoff'],
    ],
  },
  {
    node: 'RetroSection',
    name: 'Adapter: retrograde section',
    summary: 'Four solid rockets for coming home, and the six thrusters that stopped the ship beside Gemini 7.',
    detail:
      'The upper two fifths of the white adapter, from station Z68.44. Inside, on a cross of aluminium I-beams, are ' +
      'four solid rockets in titanium balls about 13 in across, each of about 2,500 lbf for five and a half seconds, ' +
      'fired one after another; at 25 hours 15 minutes 58 seconds, at night, the first of them lit. In its skin ' +
      'are six thrusters of the manoeuvring system. Two fire forward, and they are the brakes: at 5 hours 50 minutes ' +
      'the ship was 3,000 ft from Gemini 7 and closing at about 40 ft a second, and by 1,500 ft they had it down to ' +
      '7. Six minutes later it was stopped 120 ft under Gemini 7. Four more push the ship sideways, up and down, ' +
      'and with those Schirra flew round the other ship, nose to nose with it and to within a foot of it, for ' +
      'more than three revolutions. The ship also had a docking light, which lit Gemini 7 for a photograph at ' +
      'night; on spacecraft 5 the light was on this section, and where on it is not in anything read. It is not ' +
      'modelled.',
    facts: [
      ['Retrograde rockets', '4 × about 2,500 lbf, 5.5 s each'],
      ['First fired', '25 h 15 min 58 s after liftoff'],
      ['Forward thrusters', '2 × 85 lbf: braking from 3,000 ft'],
      ['Lateral thrusters', '4 × 100 lbf'],
      ['Stopped', '120 ft below Gemini 7, about 5 h 56 min after liftoff'],
      ['Docking light', 'carried: not modelled'],
    ],
  },
  {
    node: 'EquipmentSection',
    name: 'Adapter: equipment section',
    summary: 'The last Gemini on batteries alone: three of them for a day’s flight, and propellant for a chase.',
    detail:
      'The lower three fifths of the adapter, 10 ft across at the foot. Gemini 5 before it and Gemini 7 beside it ' +
      'ran on fuel cells. This ship was given batteries, so that whatever the fuel cells did on Gemini 5 could not ' +
      'hold up the first rendezvous: three silver-zinc batteries of 400 ampere-hours, each 118 lb in a magnesium ' +
      'case, hung in a row under a beam across the section. They were enough for two days at most, and the flight ' +
      'was planned so that it could end after one. At the end of the row is the one tank of drinking water, a ball ' +
      'with a small bottle of oxygen to push the water out. The rest of the room is propellant. Where the ships ' +
      'before had one tank of fuel, one of oxidiser and one of helium, this one has two of each, the same size: ' +
      '669 lb was the load announced, more than twice Gemini 3’s, for a chase in which everything went wide. This ' +
      'one did not: it took 113 lb of fuel, and Schirra arrived with 62 per cent of his propellant left. When the ' +
      'ships met, each crew saw cords streaming from the back of the other; they were the holders of the charge ' +
      'that cuts the adapter from the Titan. The batteries and the water tank are McDonnell’s figure of this ' +
      'ship’s module, and the water tank’s size is scaled from it; that the tanks were doubled, and their sizes, ' +
      'are his manual’s; which side of the section each module stands on is his drawing; the gold cover across ' +
      'the foot, a funnel of cloth with the two aft-firing thrusters standing through it, is measured on the ' +
      'photograph this ship’s crew took of Gemini 7; each thing’s exact place is estimated.',
    facts: [
      ['Base diameter', '120.00 in (3.05 m)'],
      ['Batteries', '3 silver-zinc, 400 Ah, 118 lb each'],
      ['Drinking water', '1 tank, pressurised with oxygen'],
      ['OAMS tanks', '2 of fuel, 2 of oxidiser, 2 of helium: twice spacecraft 5’s'],
      ['OAMS propellant', '669 lb, as announced before the flight'],
      ['Used in the rendezvous', '113 lb of fuel; 62 per cent of the propellant left'],
    ],
  },
  {
    node: 'TitanStage2',
    name: 'Second stage',
    summary: 'Two tanks and the guidance between them. It steered the ship into Gemini 7’s plane and left it a little slow.',
    detail:
      'Ten feet across, like the first stage, and built the same way: the tanks’ walls are the vehicle’s skin. ' +
      'Oxidiser is above fuel, and between the two tanks are the trusses that carry what flies the vehicle: radio ' +
      'guidance, a second flight control system able to take over from the first, and a malfunction detection ' +
      'system that told the crew what their booster was doing. The forward skirt is bare metal. For this flight ' +
      'the guidance had a second job: Gemini 7’s orbit did not pass exactly over the pad at the moment of launch, ' +
      'so the stage steered sideways as it climbed, to put the ship in Gemini 7’s plane and save the ship’s own ' +
      'propellant. It cut off 338.7 seconds after liftoff, a little short of the speed aimed for: the orbit was ' +
      '86.9 by 140.0 nautical miles where 146 had been wanted at the top, and the ship’s first burn made it up. ' +
      'The vehicle that flew eleven days before from the same pad carried four flashing lights on this stage for ' +
      'its crew to fly beside; this one carried none.',
    facts: [
      ['Diameter', '10 ft (3.05 m)'],
      ['Propellants', 'nitrogen tetroxide and Aerozine 50'],
      ['Forward skirt', '22.3 in, bare'],
      ['Flashing lights', 'none: GLV-7 had four'],
      ['Cut off', '338.73 s after liftoff'],
      ['Launch azimuth', '81.4°'],
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
      'nozzle, and that is the roll control. On this flight the ship’s own computer, which stood ready to take ' +
      'over the steering, timed the cutoff at 338.728 seconds; the radio guidance on the ground had it nine ' +
      'thousandths later. When it was started is in the report that has not been found. The engine’s place is ' +
      'documented, and so are the two expansion ratios, 13 and 49.2, that put the joint in its bell where it is; ' +
      'the bell’s size is computed from them, and the rest of its form is representative.',
    facts: [
      ['Thrust', 'about 100,000 lbf at altitude (445 kN)'],
      ['Engine', 'Aerojet YLR91-AJ-7'],
      ['Cut off', '338.728 s by the ship’s computer; 338.737 s by radio guidance'],
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
      'ports at the foot. The plan for this flight put it 2 minutes 36 seconds after liftoff; the time it ' +
      'happened is in the report that has not been found. The black and white panels are the roll pattern: the ' +
      'cameras that followed the vehicle could see from them whether it was turning. The pattern is drawn as ' +
      'GLV-3’s: no photograph of this vehicle has been read closely enough to check it.',
    facts: [
      ['Stages part at', 'station 500, its upper edge'],
      ['Staging', '"fire in the hole": engine start before separation'],
      ['Paint', 'eight panels, black on the diagonals: as GLV-3, assumed'],
      ['Planned', '2 min 36 s after liftoff'],
    ],
  },
  {
    node: 'TitanStage1',
    name: 'First stage',
    summary: 'Seventy feet of tank that was stood up on the pad twice, and lit on it twice.',
    detail:
      'Oxidiser tank above, fuel tank below, and the oxidiser’s feed line running down through the middle of the ' +
      'fuel. Nothing is cryogenic: nitrogen tetroxide and a hydrazine blend keep at ordinary temperatures, which is ' +
      'why this vehicle could do what it did. It stood fuelled on 25 October with its crew aboard while the Agena ' +
      'was lost. NASA then chose to send the ship after Gemini 7 instead: the vehicle was taken down and stored, ' +
      'Gemini 7 left from the same pad on 4 December, and within a day both stages were back on it. Eight days ' +
      'later, on 12 December, it lit and shut itself down; the fault was found the next morning, and it flew on ' +
      'the 15th. The wall is bare aluminium down to the splice between the tanks, white below that, then black, ' +
      'with the roll pattern at the foot, and UNITED STATES down the bare metal: drawn as GLV-3 wore it, which no ' +
      'photograph of this vehicle has been read closely enough to confirm.',
    facts: [
      ['Length with its engines', '848.1 in (21.54 m)'],
      ['Diameter', '10 ft (3.05 m)'],
      ['Lettering', 'UNITED STATES, upright letters, one side: as GLV-3, assumed'],
      ['On the pad', '25 October; again within a day of Gemini 7 leaving it on 4 December'],
      ['Weight at liftoff, with the spacecraft', 'about 340,000 lb: the figure announced, not this vehicle’s own'],
    ],
  },
  {
    node: 'TitanStage1Engine',
    name: 'First stage engine',
    summary: 'Two chambers on one frame: 430,000 lbf. On 12 December they lit, and a second later were shut down.',
    detail:
      'An Aerojet YLR87-AJ-7: two thrust chambers, each with its own turbopump, on a single frame hung from four ' +
      'longerons under the fuel tank, in the open. On 12 December 1965, at 9:54 in the morning, both lit. About a ' +
      'second later a plug in the vehicle’s tail, which should have stayed until it rose, dropped out, and ' +
      'started the vehicle’s programmer and the clock in the cabin as if it had lifted off. It had not, and the ' +
      'ground equipment that runs the count shut the engines down. By the rules a crew whose clock is running ' +
      'over engines that have stopped should eject; Schirra, who had felt no lift, did not, and that saved the ' +
      'vehicle to fly three days later. The plug was not the whole of it. The record ' +
      'of the firing showed the thrust of one chamber already falling away, and by the next morning Aerojet’s men ' +
      'had found why: a plastic dust cap left in the oxidiser inlet of its gas generator, months before, at the ' +
      'factory. It would have stopped the engine a second later by itself. The cap was taken out, the plugs were ' +
      'wired, and on the 15th the engine burned as it should. Its length and gimbal station are documented; its ' +
      'bells are sized from published ratios and its form is representative.',
    facts: [
      ['Thrust', 'about 430,000 lbf at liftoff (1,913 kN)'],
      ['Engine', 'Aerojet YLR87-AJ-7, two chambers'],
      ['Length', '123.04 in (3.13 m)'],
      ['12 December 1965', 'lit at 9:54 a.m. EST and shut down about a second later'],
      ['Causes', 'a tail plug that fell out early; a dust cap left in a gas generator'],
    ],
  },
];

const vehicle = geminiTitanStack({
  flight: 'gt-6a',
  parts,
  // the count as announced: the crew into the ship at T-90 minutes, the hatches shut at T-75 (the press kit, release
  // 65-362, p. 29). What was done on the morning is not in what was read. Assumed
  seats: seats([-90 * 60, -75 * 60]),
  views: [
    { id: 'radar', label: 'Radar', nodes: ['RendezvousRecovery'], from: along(-30, 0.9) },
    { id: 'batteries', label: 'Batteries', nodes: ['EquipmentSection'], from: along(180 - 25, -0.45) },
  ],
  cabin: cabin({
    radar:
      'The range and closing speed of what the rendezvous radar has found. On this flight it was Gemini 7, from 232 nautical miles in: the crew flew the last of the chase on this needle and the platform’s angles.',
    fairing:
      'Pressed to throw off the nose fairing over the radar and the scanner fairing. When it was pressed on this flight is not in what was read.',
    power:
      'The pilot’s ammeter as spacecraft 3 had it. This ship, on three batteries in the adapter, had a voltmeter and an ammeter with a selector here (SEDR 300 vol. 2, p. 5-6), which are not drawn as such.',
  }),
});

export const flight: Flight = {
  id: 'usa/gemini/gt-6a',
  nation: 'USA',
  agency: 'NASA',
  program: 'Project Gemini',
  designation: 'Gemini-Titan 6A',
  // the mission's own style, in Roman: the A marks the second attempt at the sixth mission (README.md, "The name")
  callsign: 'Gemini VI-A',
  spacecraft: 'Gemini spacecraft No. 6 (McDonnell Aircraft)',
  launchVehicle: 'Gemini Launch Vehicle 6, a Titan II (Martin)',
  // 13:37:26.471 G.m.t. (Supplemental Report 4, p. 2-6; the Gemini VII mission report, 4.1, has 13:37:26.47): 8:37:26 a.m. e.s.t.
  launch: '1965-12-15T13:37:26.471Z',
  launchSite: LC19.name,
  site: LC19,
  crew: ['Walter M. Schirra, Jr.', 'Thomas P. Stafford'],
  summary:
    'The first time two crewed spacecraft met in orbit. It was the third count for this ship: its Agena target was ' +
    'lost on 25 October, and on 12 December the Titan lit and shut down on the pad with the crew aboard. On the ' +
    '15th it flew, caught Gemini 7 in four revolutions, stopped 120 ft from it and stayed beside it, at times a ' +
    'foot away, for more than five hours.',
  facts: [
    { label: 'Liftoff', value: '15 December 1965, 13:37:26.471 UTC' },
    { label: 'Command pilot', value: 'Walter M. Schirra, Jr.' },
    { label: 'Pilot', value: 'Thomas P. Stafford' },
    { label: 'Duration', value: '25 h 51 min 24 s' },
    { label: 'Revolutions', value: '16' },
    { label: 'Orbit at insertion', value: '161 km by 259 km, 28.97°' },
    { label: 'Period', value: '87.92 min' },
    { label: 'Rendezvous', value: 'about 5 h 56 min after liftoff, 120 ft from Gemini 7' },
    { label: 'Power', value: 'batteries: the last Gemini without fuel cells' },
    { label: 'Landing', value: '23°35′ N 67°50′ W, 7 nautical miles from the planned point' },
    { label: 'Recovery', value: 'USS Wasp' },
  ],
  // The flight as flown; README.md, "Timeline", gives each time its source. The flight's own mission report has not been
  // found, so the times are from its supplements (the ascent, to the thousandth of a second, by the ship's computer), the
  // programme's chronology (SP-4002) and its history (SP-4203, to the minute).
  timeline: [
    { t: 0, event: 'Liftoff, 08:37:26.471 EST, at the third count' },
    { t: 17.75, event: 'Roll programme begins; complete at 20.59 s' },
    { t: 23.13, event: 'Pitch programme begins' },
    { t: 156, event: 'First stage cutoff and staging, as planned: the time flown is not in what was read' },
    { t: 338.73, event: 'Second stage cutoff' },
    {
      t: 359,
      event:
        'About now the spacecraft cuts itself free and the aft thrusters add about 10 ft/s. In orbit: 86.9 by 140.0 nautical miles, some 1,200 miles behind Gemini 7',
    },
    { t: get(1, 34), event: 'Height adjustment at the first perigee: 14 ft/s, to make up what the Titan left short' },
    {
      t: get(2, 18),
      event:
        'Phase adjustment at the second apogee: 61 ft/s. Within half an hour a plane change of 34 ft/s, the ship turned square to its path, and 0.8 ft/s more at the next perigee',
    },
    { t: get(3, 15), event: 'About now the radar finds Gemini 7’s transponder: a flicker, then a solid lock at 232 nautical miles' },
    {
      t: get(3, 47, 1),
      event: 'Coelliptic manoeuvre at the third apogee: 43 ft/s in 54 s. The orbit is a circle 15 nautical miles under Gemini 7’s',
    },
    { t: get(5, 4), event: 'Schirra sees a bright star that is not one: Gemini 7 in sunlight, some 100 km ahead' },
    { t: get(5, 18, 59), event: 'Terminal phase initiation: thrust along the line of sight to Gemini 7, to rise to its orbit' },
    { t: get(5, 32), event: 'First midcourse correction; the second at 5 h 44 min' },
    { t: get(5, 50), event: 'Braking, from 3,000 ft and about 40 ft/s: down to 7 ft/s by 1,500 ft' },
    { t: get(5, 56), event: 'Rendezvous: stopped 120 ft below Gemini 7. Station keeping begins, from 300 ft to 1 ft' },
    { t: get(11, 22), event: 'About now the ship backs away from Gemini 7 for the night' },
    { t: get(20, 55), event: 'The tape recorder for delayed telemetry fails' },
    { t: get(25, 15, 58), event: 'Retrofire, in darkness, the morning’s "Jingle Bells" on a harmonica and bells behind it' },
    { t: get(25, 51, 24), event: 'Landing, 23°35′ N 67°50′ W, 7 nautical miles from the planned point: the first steered entry' },
  ],
  specs: [
    ...dimensions(
      'assumed',
      'SEDR 300 vol. 1, Figures 2-3 and 2-4, which is spacecraft 3’s, 4’s and 7’s manual, taken for spacecraft 6; the adapter’s 90.00 in, the cabin’s 70.53 in and the 219.03 in of the orbit configuration are printed again in vol. 2, which covers this ship',
      `the Gemini V mission report’s Figure 3.1-1, "GLV - Spacecraft relationships" (${GV}: the vehicle before, drawn to the same stations; this flight’s own report has not been found)`,
    ),
    {
      group: 'Spacecraft',
      label: 'Weight at launch',
      value: 7817 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `7,817 lb (${CHRONOLOGY}, read on the page). ${TITANS}, p. 272, has 3,553 kg, which is 7,833 lb. The weights at retrofire and landing are in the mission report that has not been found`,
    },
    {
      group: 'Spacecraft',
      label: 'OAMS propellant, as announced',
      value: 669 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `669 lb under "Propellant" for Gemini 6, against 423 lb for Gemini 7 (${KIT}, p. 59): the load announced before the flight; what was loaded is in the report not found. ${MIDPROGRAM}, p. 158, gives 700 lb as the tankage a rendezvous was sized for`,
    },
    {
      group: 'Spacecraft',
      label: 'OAMS propellant tanks, across',
      value: 21.13 * IN,
      unit: 'm',
      confidence: 'documented',
      note: 'two fuel tanks of 21.13 in and two oxidiser tanks of 21.12 in, each of 5,355 cu in, and two tanks of helium: "one tank on S/C 5, two tanks on S/C 6" (SEDR 300 vol. 2, Section VIII, Figure 8-96 sheet 1, p. 8-346, and pp. 8-359 and 8-362). Room for about 338 lb of fuel and 560 lb of oxidiser at handbook densities, which the 669 lb announced fits. Where the tanks stood is estimated from Figure 8-94 of that section',
    },
    {
      group: 'Spacecraft',
      label: 'Fuel used in the rendezvous',
      value: 113 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `"Rendezvous maneuvers had cost VI-A only 51 kilograms (113 pounds) of fuel. Schirra still had 62 percent left" (${TITANS}, p. 288). Fuel, as the history has it, and not fuel and oxidiser together: 38 per cent of a load of 669 lb would be about 250 lb`,
    },
    {
      group: 'Spacecraft',
      label: 'Adapter battery, weight',
      value: 118 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `"three 400 ampere/hour, 16 cell, silver-zinc batteries ... The adapter module battery cases (spacecraft 6) are constructed of magnesium and the approximate wet weight of each battery is 118 lbs" (${SEDR2}, p. 5-22)`,
    },
    {
      group: 'Spacecraft',
      label: 'Perigee at insertion',
      value: 86.9 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `86.9 nautical miles (${CHRONOLOGY}); ${MIDPROGRAM}, Table 4-III, has 87.0 against 87.1 targeted`,
    },
    {
      group: 'Spacecraft',
      label: 'Apogee at insertion',
      value: 140.0 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `140.0 nautical miles (${CHRONOLOGY}), against 146.2 targeted (${MIDPROGRAM}, Table 4-III): the ship was 15 nautical miles below Gemini 7 at its first apogee by plan and about 23 in the event (the same, p. 280). At retrofire the orbit was 153.0 by 168.1`,
    },
    {
      group: 'Spacecraft',
      label: 'Period',
      value: 87.92 * 60,
      unit: 's',
      confidence: 'documented',
      note: `87.92 min at insertion; 90.54 min at retrofire (${CHRONOLOGY})`,
    },
    {
      group: 'Spacecraft',
      label: 'Inclination',
      value: 28.97,
      unit: 'deg',
      confidence: 'documented',
      note: `28.97° at insertion, 28.89° at retrofire, which was Gemini 7’s (${CHRONOLOGY})`,
    },
    {
      group: 'Spacecraft',
      label: 'Height adjustment',
      value: 14 * FT,
      unit: 'm/s',
      confidence: 'documented',
      note: `14 ft/s at the first perigee (${MIDPROGRAM}, p. 280), "after 94 minutes" (${TITANS}, p. 286). Then: phase adjustment, 61 ft/s where 53 was planned; plane change, 34 ft/s; a second height adjustment, 0.8 ft/s (${MIDPROGRAM}, pp. 280 and 281)`,
    },
    {
      group: 'Spacecraft',
      label: 'Coelliptic manoeuvre',
      value: 43 * FT,
      unit: 'm/s',
      confidence: 'documented',
      note: `43 ft/s at the third apogee (${MIDPROGRAM}, p. 281); begun 13,621 s after liftoff, the computer showing 42 ft/s to go (${SUPP5}, the catch-up and rendezvous report, "Phase II": p. 53 of the PDF); 54 s of thrust (${TITANS}, p. 287)`,
    },
    {
      group: 'Spacecraft',
      label: 'Radar lock on Gemini 7',
      value: 232 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `"Solid lock-on was achieved at 232 nautical miles and was maintained until the spacecraft had closed with the target" (${MIDPROGRAM}, p. 34). ${TITANS}, p. 287, has 434 km, which is 234 nautical miles; the chronology has "246 miles"`,
    },
    {
      group: 'Spacecraft',
      label: 'Terminal phase initiation, from liftoff',
      value: 19139,
      unit: 's',
      confidence: 'documented',
      note: `19,139 s, which is 5 h 18 min 59 s (${SUPP5}, the catch-up and rendezvous report, introduction: p. 50 of the PDF). ${TITANS}, p. 287, has 5 h 16 min; the plan had 5 h 15 min and a burn of 32 ft/s along the line of sight (${KIT}, p. 33)`,
    },
    {
      group: 'Spacecraft',
      label: 'Range when station keeping began',
      value: 120 * FT,
      unit: 'm',
      confidence: 'documented',
      note: `"directly below the Gemini VII spacecraft at a distance of 120 feet" (${MIDPROGRAM}, p. 291), some six minutes after braking began at 5 h 50 min (SP-4002, 15 December 1965); braking from 3,000 ft to 1,500 ft, where the closing speed was 7 ft/s (${MIDPROGRAM}, p. 291)`,
    },
    {
      group: 'Spacecraft',
      label: 'Nearest to Gemini 7',
      value: 1 * FT,
      unit: 'm',
      confidence: 'documented',
      note: `"at distances from 1 to 300 feet" for three and a half orbits (SP-4002, 15 December 1965); "from 0.30 meters to 90 meters" (${TITANS}, p. 288)`,
    },
    {
      group: 'Spacecraft',
      label: 'Beside Gemini 7 for',
      value: get(5, 26),
      unit: 's',
      confidence: 'derived',
      note: `about 5 h 26 min: from about 5 h 56 min to the separation manoeuvre, which Gemini 7’s report puts at about 269 h 30 min of its own flight (${GVII}, 4.1), 11 h 22 min of this one. Both ends are to the minute or worse`,
    },
    {
      group: 'Spacecraft',
      label: 'Retrofire, from liftoff',
      value: get(25, 15, 58),
      unit: 's',
      confidence: 'documented',
      note: `25:15:58 (${CHRONOLOGY}); the same instant, 14:53:24 G.m.t. on 16 December, heads the entry’s starting conditions in ${SUPP4}, Table 8. ${TITANS}, p. 291, gives this figure as the length of the flight, which is not followed`,
    },
    {
      group: 'Spacecraft',
      label: 'Duration, liftoff to landing',
      value: get(25, 51, 24),
      unit: 's',
      confidence: 'documented',
      note: `25:51:24 (${CHRONOLOGY}): 10:29 a.m. e.s.t. on 16 December, sixteen revolutions`,
    },
    {
      group: 'Spacecraft',
      label: 'Landing from the planned point',
      value: 7 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `7 nautical miles, at 23°35′ N 67°50′ W (${CHRONOLOGY}). ${SUPP4}, Table 9, as its text layer has it: 7.3 nautical miles by the ship’s own navigation (about 23.7° N 67.74° W), 14.3 by the recovery ship’s fix (23.375° N 67.875° W), the target 23.61° N 67.83° W; it holds the ship’s navigation the better of the two`,
    },
    {
      group: 'Launch vehicle',
      label: 'Launch azimuth',
      value: 81.4,
      unit: 'deg',
      confidence: 'documented',
      note: `81.4° (${CHRONOLOGY}); the vehicle was steered in yaw during the second stage to finish in Gemini 7’s plane (${MIDPROGRAM}, p. 279)`,
    },
  ],
  motors: [
    ...titanEngines(
      {
        burnS: 156,
        // neither figure is this vehicle's own: the thrust is the type's nominal and the burn is the plan
        confidence: 'assumed',
        note: `a combined ${lb(2 * THRUST.stage1Chamber.value)} lb of thrust for the two is the Gemini Launch Vehicle's nominal (${KIT}, p. 64), taken for GLV-6. The burn is the plan, cutoff 2 min 36 s after liftoff (the same, p. 29): the flown time is in the mission report that has not been found`,
      },
      {
        confidence: 'assumed',
        note: `${lb(THRUST.stage2.value)} lb of thrust at altitude is the type's nominal (${KIT}, p. 64), taken for GLV-6. No burn time is given: the cutoff was 338.728 s after liftoff by the ship's computer (${SUPP5}, the ascent report, Table 5, read on the page) and 338.737 s by radio guidance, a preliminary figure quoted there, but when the engine started is not in what was read`,
      },
    ),
    ...thrusters(
      'spacecraft 6, whose manoeuvring system had two tanks of each propellant where spacecraft 5’s had one (SEDR 300 vol. 2, Section VIII, Figure 8-96); no account of its thrusters has been read',
    ),
  ],
  models: [vehicle],
};

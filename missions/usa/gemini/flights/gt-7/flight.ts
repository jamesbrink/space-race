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
  LEFT_AZ,
  NMI,
  SEDR,
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
} from '../../vehicles/gemini-titan.ts';

const KIT = KIT_7_6;
/** Hours, minutes and seconds of ground elapsed time, as seconds from liftoff. */
const get = (h: number, m: number, s = 0) => h * 3600 + m * 60 + s;
const PSI = 6894.757;

const parts: PartWords[] = [
  {
    node: 'NoseFairing',
    name: 'Nose fairing',
    summary: 'A glass-fibre cap over the ship’s forward face, which on this ship had an aerial on it and no radar.',
    detail:
      'The forward section ends in a flat face, and going up through the air it wants a cover. This one is laminated ' +
      'glass fibre, 5.31 in deep, and it is the tip of the whole vehicle. The ship before had the first rendezvous ' +
      'radar under its fairing; this one was to be found, not to find, and what stood on its face was the one ' +
      'spiral antenna of a transponder that would answer another ship’s radar. McDonnell’s manual for this ship ' +
      'has the command pilot press the switch after staging, and the fairing and the cover over the horizon ' +
      'scanners go together; the mission report gives no time for it, and its only word on it is that Lovell ' +
      'saw some debris from the fairing as it went. The crank in its ejector had been changed since the ship ' +
      'before, to make it easier to fit. Its size is McDonnell’s drawing.',
    facts: [
      ['Depth', '5.31 in (0.13 m): Z233.97 to Z239.28'],
      ['Material', 'glass fibre reinforced plastic laminate'],
      ['Thrown off', 'after staging, by the manual; the report gives no time'],
      ['By', 'a pyrotechnic ejector, its crank changed for this ship'],
      ['Under it', 'the transponder’s spiral antenna'],
    ],
  },
  {
    node: 'RendezvousRecovery',
    name: 'Rendezvous and recovery section',
    summary: 'No radar: a transponder, so that another ship’s radar could find this one from hundreds of miles off.',
    detail:
      'The forward 42 inches: beryllium shingles, black outside, over a titanium frame, with the parachutes inside. ' +
      'Spacecraft 5 and 6 carry the rendezvous radar on this face. Spacecraft 7 was built without one, and when the ' +
      'Agena that Gemini VI was to meet was lost on 25 October, this ship was made the target instead: over a ' +
      'weekend early in November it was given what the Agena and the last flight’s pod had carried, an L-band ' +
      'transponder, a booster for its voltage and one spiral antenna, here in the nose. A radar calls; the ' +
      'transponder answers on another frequency; the time the answer takes is the range. The crew switched it on ' +
      'now and then through the flight to see how fast it warmed up, and twice a radar on the ground at the Cape ' +
      'called it as the ship went over: the second time it held for 110 seconds from 270 nautical miles. On the ' +
      'eleventh day Borman and Lovell had one job in the rendezvous, to keep this end of their ship pointed at ' +
      'the one coming. When the main parachute comes out this whole section is pulled off; after the landing it ' +
      'and the parachute floated a short while and sank before the swimmers reached them. That the transponder, ' +
      'its regulator and one spiral antenna were here is the mission report’s; the antenna’s size and place on ' +
      'the face are estimated.',
    facts: [
      ['Length', '42.00 in (1.07 m)'],
      ['Skin', 'unbeaded beryllium shingles'],
      ['In the radar’s place', 'an L-band transponder, a boost regulator, one spiral antenna'],
      ['Answered a radar on the ground', 'at 270 nautical miles, for 110 s'],
      ['Gemini VI-A’s radar held it', 'from 434 km, by the history'],
      ['Main parachute', 'ring-sail, 84.2 ft'],
    ],
  },
  {
    node: 'ReentryControl',
    name: 'Re-entry control system section',
    summary: 'Sixteen small thrusters kept two weeks for the way home, which burned everything they had getting there.',
    detail:
      'Eighteen inches of cylinder between the cabin and the forward section. Everything that steers the ship in ' +
      'orbit is in the adapter, and the adapter is thrown away before the ship comes home; from then to the ' +
      'parachute it is steered by this. There are two rings of eight thrust chambers of 25 lbf, each ring with its ' +
      'own fuel, oxidiser and nitrogen, so that either alone is enough. Their fuel went in ten days before the ' +
      'launch, and they were switched on three quarters of an hour before retrofire, twenty-two days after ' +
      'servicing, having lost no pressure to speak of. Borman flew the entry on one ring until, in the blackout, it could no longer hold ' +
      'the ship, and brought in the second. The first ring’s fuel was gone as the ship came out of the blackout ' +
      'at 125,000 ft, and the second’s about when the drogue came out: afterwards not a drop was found in either. ' +
      'The ship landed 6.4 nautical miles from the point it was steered for, the nearest a Gemini had yet come; ' +
      'Gemini VI-A, two days before, had been the first to be steered to one at all. Which chamber fires which ' +
      'way is McDonnell’s drawing; where the clusters stand is read off a photograph of spacecraft 3.',
    facts: [
      ['Length', '18.00 in (0.46 m)'],
      ['Diameter', '38.66 in (0.98 m)'],
      ['Thrust chambers', '16 × 25 lbf, in two rings of 8'],
      ['Loaded, each ring', 'about 15.8 lb of fuel and 20.2 lb of oxidiser'],
      ['Used', 'all of it: ring A first, ring B added in the blackout'],
      ['Landing', '6.4 nautical miles short of the planned point'],
    ],
  },
  {
    node: 'Hatches',
    name: 'Hatches',
    summary: 'Two doors, one over each man. The right-hand one stayed locked from the pad until the ship was on the carrier.',
    detail:
      'Each man has a hatch over him, hinged along its outboard edge and held down by twelve latches, skinned in the ' +
      'same beaded shingles as the cabin. The latching mechanism was a new design, first fitted to spacecraft 6: on ' +
      'Gemini IV the pilot’s hatch had been hard to close after he came back in. On this flight nobody was to go ' +
      'out. Schirra and Stafford asked whether Stafford and Lovell might change ships; Borman, who wanted his ' +
      'fourteen days, said he was not going to open the hatch, and Headquarters agreed. The window is at the ' +
      'hatch’s forward end and is not in the skin: the outer pane stands at about 35° to the hatch, so that it ' +
      'faces forward. At staging the fire of the second stage’s engine went over both windows and left a film on ' +
      'them, the right one worst, which spoiled photographs for two weeks. To sleep, the crew put foil from their ' +
      'food packs over the panes behind the filters. After the landing Borman’s hatch was opened on the water, 17 ' +
      'minutes down, for the two to climb out to a helicopter; Lovell’s, shut since they went aboard, took 325 ' +
      'inch-pounds to unlock afterwards. The pane’s angle is McDonnell’s drawing; where the windows and the ' +
      'hatches’ edges lie is read off photographs of spacecraft 3, to about two inches.',
    facts: [
      ['Number', '2, hinged on the outboard side'],
      ['Latches', '12 to a hatch, a new mechanism from spacecraft 6'],
      ['Windows', 'an outer pane and two inner, at 35° to the hatch'],
      ['Window opening', 'about 14.8 in across and 8.5 in fore and aft'],
      ['Opened in flight', 'no'],
      ['Left hatch opened', '330 h 52 min, on the water'],
    ],
  },
  {
    node: 'ScannerFairing',
    name: 'Horizon scanner fairing',
    summary: 'A bronze-coloured cover over the infrared eyes that find the horizon. It went with the nose fairing.',
    detail:
      'On the ship’s left side at the neck, two infrared scanners look out for the edge of the Earth and tell the ' +
      'ship which way is down. They would not survive the climb through the air uncovered, so a fairing sits over ' +
      'them, and the switch that throws off the nose fairing throws this off too: after staging on this ship, by ' +
      'McDonnell’s manual. For most of two weeks the scanners had little to do. To save propellant the ship ' +
      'drifted with its platform off for days at a time, and the two burns of its first three days were lined up ' +
      'on a star, Spica and then Arcturus, with the horizon for level. The fairing’s size and place are read off ' +
      'a colour photograph of spacecraft 3 on the morning it flew, and taken to be the same here.',
    facts: [
      ['Covers', 'the horizon scanners, on the left side'],
      ['Lies', 'from Z166.5 to Z190.5, about two feet'],
      ['Thrown off', 'with the nose fairing: after staging, by the manual'],
    ],
  },
  {
    node: 'Cabin',
    name: 'Cabin section',
    summary: 'Beaded shingles of René 41 over a titanium frame, round a room two men did not leave for a fortnight.',
    detail:
      'A cone 70.53 in long at 20° to its axis, 90 in across the heat shield and 38.66 in across the neck. The skin ' +
      'is shingles of René 41, a nickel alloy, pressed into short beads that lie round the cone one after another, ' +
      'in cells between rows of fasteners: they stiffen the sheet and let it grow when hot, and it is black outside ' +
      'so that it radiates. The shingles are not the pressure vessel: that is a welded titanium box inside, and the ' +
      'room between its flat sides and the cone is equipment bays. When Gemini VI-A came alongside, each crew saw ' +
      'on the other’s ship what it could not see on its own: cords and strips ten feet and more long trailing from ' +
      'the back of the adapter, the rubber and plastic that had held the charge which cut the ship from its Titan. One ' +
      'of them had struck this ship just ahead of the right window on the first day. When the ship was looked over ' +
      'on the carrier a clear yellow film lay over the right window, the back of the right hatch and the top of the ' +
      'section forward of it. The paint is drawn as spacecraft 3’s, UNITED STATES and the flag on each side below ' +
      'the hatch’s hinge. The photographs Gemini VI-A’s crew took of this ship from a few feet show it so on ' +
      'the right side; the left is taken to match.',
    facts: [
      ['Length', '70.53 in (1.79 m)'],
      ['Half-angle', '20°'],
      ['Skin', 'beaded René 41 shingles, black'],
      ['Paint', 'UNITED STATES and the flag: on the right side by photograph, assumed on the left'],
      ['Name', 'none: after Gemini 3 the ships went by their numbers'],
    ],
  },
  {
    node: 'CrewStation',
    name: 'Crew station',
    summary: 'Two ejection seats side by side for 330 hours 35 minutes, most of it with the pressure suits off.',
    detail:
      'Two men sit as in an aeroplane, the command pilot on the left, in pure oxygen at about 5 psi, each with a ' +
      'window before him and a hatch over him. Fourteen days was longer than any flight to the Moon would take, and ' +
      'the question was whether men would be fit for anything at the end of it. The answer was partly a suit. The ' +
      'G5C was made for this flight: 16 lb, no stiff layers, a soft hood that zipped on at the neck in place of a ' +
      'helmet, an airman’s crash helmet under it for the earphones. It could be taken off. Lovell took his off at ' +
      '45 hours and was comfortable at once; Borman, who had to stay in his by a ruling that one man be suited, ' +
      'sweated beside him for four days. At 148 hours they changed over. On 12 December, at about 191 hours, ' +
      'Headquarters let both suits come off, and from there they were worn only to meet Gemini VI-A and to come ' +
      'home. Both men slept at the same hours, by Houston’s clock. The plan for the litter was made beforehand: ' +
      'behind Borman’s seat for the first week and behind Lovell’s for the second. The panels are drawn from ' +
      'McDonnell’s drawing of spacecraft 3’s, with the clock spacecraft 4 added, without the radar’s range ' +
      'indicator, which this ship did not have, and with a clock on the centre panel that counted the flight’s ' +
      'hours in figures where the flight plan had wound past on a roller; what else it changed is not drawn, and ' +
      'the seats are empty: the G5C is not modelled. No drawing read gives the pressure vessel’s dimensions: its ' +
      'sizes are those fitted round the crew of spacecraft 3.',
    facts: [
      ['Crew', '2: command pilot left, pilot right'],
      ['Seats', 'ejection seats, 22 in wide, canted 12° outboard and 8° forward'],
      ['Suits', 'G5C, 16 lb, soft hood: not modelled, the seats are empty'],
      ['Suits off', 'Lovell from 45 h; both from about 191 h, but for the rendezvous and the entry'],
      ['Panels', 'spacecraft 3’s, with the G.m.t. clock and without the range indicator'],
      ['Elapsed-time clock', 'digital, on the centre panel, reading to 999:59:59; its form estimated'],
      ['Atmosphere', 'pure oxygen, 5.1 psi'],
      ['Stowage added', 'a food pouch in the right footwell; a place for dry waste behind the pilot’s seat'],
    ],
  },
  {
    node: 'HeatShield',
    name: 'Heat shield',
    summary: 'A shallow dish of resin-filled honeycomb, 90 inches across, that chars away.',
    detail:
      'Glass-fibre honeycomb filled with a silicone elastomer, bolted to the big end of the cabin: a dish 90 in ' +
      'across, part of a sphere of 144 in radius. It is an ablator, and it rides the whole flight inside the ' +
      'adapter, out of sight until the last of the adapter is cut away after retrofire: on this flight, for ' +
      'fourteen days. The entry was a gentle one. Borman and Lovell read 3.9 g at the most, where the first men ' +
      'home from orbit had borne nearly eight; after two weeks without weight they said it felt like a ton. The ' +
      'one mark found on the shield afterwards was a gouge like the one on spacecraft 6’s, in the same place: ' +
      'both were taken to have been made hoisting the ships aboard. The station taken here for its crown is one ' +
      'of SEDR 300’s that the drawing does not name.',
    facts: [
      ['Diameter', '90.00 in (2.29 m)'],
      ['Spherical radius', '144 in (3.66 m)'],
      ['Material', 'silicone-filled glass-fibre honeycomb'],
      ['Entry load', '3.9 g as the crew read it; 4.5 g by the reconstruction'],
    ],
  },
  {
    node: 'RetroSection',
    name: 'Adapter: retrograde section',
    summary: 'Four solid rockets that waited fourteen days, and beside them a third water tank for the long flight.',
    detail:
      'The upper two fifths of the white adapter, from station Z68.44. Inside, on a cross of aluminium I-beams, are ' +
      'four solid rockets in titanium balls about 13 in across, each of about 2,500 lbf for five and a half seconds, ' +
      'fired one after another. The one that was watched cooled from 70 °F to about 42 in five days and stayed ' +
      'there. At 329 hours 58 minutes 4 seconds, in the dark over the Pacific, the first lit on the second it was due. Nobody ' +
      'knows to the second when the other three did: the recorder that would have kept the record had failed on ' +
      'the ninth day and the ship was out of reach of any station. This ship has one thing here that no other ' +
      'had: a third tank of drinking water, a small one for 42 lb, sent up with 25 lb in it, added to the two big ' +
      'tanks in the equipment section for the fourteen days. In the skin are ' +
      'six thrusters of the manoeuvring system: two that fire forward, and four that push the ship sideways, up ' +
      'and down. The report’s drawing also puts a docking light on this section; Borman switched it on to look ' +
      'at his Titan’s second stage in the dark, and it did not reach. Where the light was is not in anything ' +
      'read, and it is not modelled. The water tank is documented; its size is worked from what it held, and its ' +
      'place, toward the top on a tray between two of the rockets, is read off two sketches.',
    facts: [
      ['Retrograde rockets', '4 × about 2,500 lbf, 5.5 s each'],
      ['First fired', '329 h 58 min 4 s after liftoff, as planned'],
      ['Water tank C', 'for 42 lb; 25 lb at launch, pushed out by oxygen at 18 psi'],
      ['Forward thrusters', '2 × 85 lbf'],
      ['Lateral thrusters', '4 × 100 lbf'],
      ['Docking light', 'on this section: not modelled'],
    ],
  },
  {
    node: 'EquipmentSection',
    name: 'Adapter: equipment section',
    summary: 'Fuel cells for fourteen days, with the cure for the last flight’s trouble, and two lights to be found by.',
    detail:
      'The lower three fifths of the adapter, 10 ft across at the foot. As on the ship before, two fuel cell ' +
      'sections make the electricity from hydrogen and oxygen kept cold in two tanks, and the water they make ' +
      'goes into the drinking water tanks behind a diaphragm. Gemini V had nearly come home on its first day when ' +
      'the oxygen tank’s heater failed. So this ship has a pipe from the crew’s own oxygen tank to the fuel ' +
      'cells’, and used it in its first half hour: the pressure had sagged to about 140 psi, the valve was opened ' +
      'for 17.5 seconds, a third of a pound of oxygen went across and the pressure stood at 417. The hydrogen ' +
      'tank is wrapped in fifty layers of aluminised film and hung on insulating mounts; on the last flight it ' +
      'had to be vented, and on this one it never was. The trouble came from the water instead. A warning lamp ' +
      'for one section burned most of the flight, that section’s output fell and came back four times, and the ' +
      'fifth time, at 286 hours 57 minutes, two of its three stacks were switched off for good. The other four carried the ship ' +
      'home. By the manoeuvring system’s tanks is a reserve tank of fuel, a thin cylinder new on this ship, opened ' +
      'at about 290 hours when the main tank ran dry: by the end nearly all the propellant was gone. At the foot, on ' +
      'opposite sides, are two flashing lights of the kind an Agena carries, put on in November for Gemini VI-A ' +
      'to see. And as on Gemini IV there is a counter for the radiation belt’s particles and a magnetometer on a ' +
      'boom, run out after the ship reached orbit and left out. What is here is documented; the manoeuvring ' +
      'system’s tanks are McDonnell’s sizes, the other sizes are worked from the loads or scaled from sketches, ' +
      'which module stands on which side of the section is his drawing, and each thing’s exact place is ' +
      'estimated. The gold cover across the foot is measured on the photograph Gemini VI-A’s crew took of this ' +
      'ship from behind: a funnel of cloth gathered to a hoop, the spectrometer looking out of its middle and the ' +
      'two aft-firing thrusters standing through it at the rim.',
    facts: [
      ['Base diameter', '120.00 in (3.05 m)'],
      ['Fuel cells', '2 sections of 3 stacks; stacks 2A and 2C off at 286 h 57 min'],
      ['Their oxygen', '181.8 lb at launch; 60.95 lb left at the end'],
      ['Their hydrogen', '23.58 lb at launch; 8.55 lb left; never vented'],
      ['Oxygen crossfeed', 'opened 17.5 s at 25 min: 140 psi to 417'],
      ['Drinking water', '2 tanks of 150 lb here, one full; a third of 42 lb in the retrograde section'],
      ['OAMS propellant', '340 lb usable'],
      ['Reserve fuel tank', '5.10 in across and 30.7 in long: 12.9 lb of usable fuel'],
      ['Acquisition lights', '2, on opposite sides, about 65 flashes a minute'],
      ['Experiments here', 'a proton-electron spectrometer; a magnetometer on a boom'],
    ],
  },
  {
    node: 'TitanStage2',
    name: 'Second stage',
    summary: 'Two tanks and the guidance between them, with four flashing lights for the crew to fly beside it by.',
    detail:
      'Ten feet across, like the first stage, and built the same way: the tanks’ walls are the vehicle’s skin. ' +
      'Oxidiser is above fuel, and between the two tanks are the trusses that carry what flies the vehicle: radio ' +
      'guidance, a second flight control system able to take over from the first, and a malfunction detection ' +
      'system that told the crew what their booster was doing. Gemini IV had tried to fly beside its spent second ' +
      'stage and failed; this crew was to try again, so GLV-7 was given flashing lights as GLV-4 had been, four of ' +
      'them this time, round the middle of the stage a quarter of the way apart. It put the ship into the orbit ' +
      'nearest to the one planned that a Gemini had had. Borman turned round, saw the stage, and stayed 60 to 150 ' +
      'ft from it for a quarter of an hour. It was not a quiet neighbour: fuel was pouring from a vent at the foot ' +
      'of its tank, pushing it about and turning it over twice a minute, and keeping clear cost more propellant ' +
      'than planned. After dark the lights could be seen flashing, but neither man could tell from them how far ' +
      'off the stage was. It stayed up three days and came down over the South Pacific in its 44th revolution.',
    facts: [
      ['Diameter', '10 ft (3.05 m)'],
      ['Propellants', 'nitrogen tetroxide and Aerozine 50'],
      ['Forward skirt', '22.3 in, bare'],
      ['Flashing lights', '4, near the middle, 90° apart'],
      ['Kept station on', 'for about 15 min, at 60 to 150 ft'],
      ['Its orbit', '87.2 by 176.8 nautical miles; down in its 44th revolution'],
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
      'nozzle, and that is the roll control. On this flight it was signalled at 155.61 seconds and shut down by ' +
      'the radio guidance at 337.01, a second and a half sooner than planned, with the ship 7 ft a second slow ' +
      'and 175 ft high of where it was meant to be. A second and a quarter after it lit, its chamber pressure ' +
      'jumped once, as a few Titans’ had before. The engine’s place is documented, and so are the two expansion ' +
      'ratios, 13 and 49.2, that put the joint in its bell where it is; the bell’s size is computed from them, and ' +
      'the rest of its form is representative.',
    facts: [
      ['Thrust', 'about 100,000 lbf at altitude (445 kN)'],
      ['Engine', 'Aerojet YLR91-AJ-7'],
      ['Burned', '155.61 s to 337.01 s from liftoff'],
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
      'ports at the foot. On this flight the engine’s signal came at 155.61 seconds and the stages had begun to ' +
      'part by 156.25. From the seats it looked, Borman and Lovell said, as though the ship flew through a ring ' +
      'in a bright orange flame; and the flame left a film on both windows that they looked through for two ' +
      'weeks. The black and white panels are the roll pattern: the cameras that followed the vehicle could see ' +
      'from them whether it was turning. The pattern is drawn as GLV-3’s; no photograph of this vehicle has been ' +
      'read for it.',
    facts: [
      ['Stages part at', 'station 500, its upper edge'],
      ['Staging', '"fire in the hole": engine start before separation'],
      ['Paint', 'eight panels, black on the diagonals: as GLV-3, assumed'],
      ['Stages began to part', '156.25 s after liftoff'],
    ],
  },
  {
    node: 'TitanStage1',
    name: 'First stage',
    summary: 'Seventy feet of tank with UNITED STATES down it, 3.7 seconds late off a pad that was wanted again at once.',
    detail:
      'Oxidiser tank above, fuel tank below, and the oxidiser’s feed line running down through the middle of the ' +
      'fuel. Nothing is cryogenic: nitrogen tetroxide and a hydrazine blend keep at ordinary temperatures. The wall ' +
      'is bare aluminium down to the splice between the tanks, white below that, then black, with the roll pattern ' +
      'at the foot, and UNITED STATES down the bare metal, one letter under the next: drawn as GLV-3 wore it, no ' +
      'photograph of this vehicle having been read. The count was a clean one, and the vehicle still left ' +
      '3.702 seconds after the second it was meant to: the sequencer that sends the ignition signal should have ' +
      'been set three seconds ahead of the range’s clock and had been set level with it. It flew a little flatter ' +
      'than planned, where every Gemini before it had flown a little steeper. The hurry was on the ground. This ' +
      'was the only pad a Gemini could leave from, and Gemini VI-A was to leave from it nine days later. Two ' +
      'hours after the launch both stages of GLV-6 were at the complex; the damage was found to be slight, and ' +
      'within a day GLV-6 stood where this vehicle had stood, with its spacecraft on it.',
    facts: [
      ['Length with its engines', '848.1 in (21.54 m)'],
      ['Diameter', '10 ft (3.05 m)'],
      ['Lettering', 'UNITED STATES, upright letters, one side: as GLV-3, assumed'],
      ['Left the pad', '3.702 s after the planned instant'],
      ['Launch azimuth', '83.6°'],
      ['Weight at liftoff, with the spacecraft', '342,569 lb'],
    ],
  },
  {
    node: 'TitanStage1Engine',
    name: 'First stage engine',
    summary: 'Two chambers on one frame: 430,000 lbf, burning until the oxidiser ran out.',
    detail:
      'An Aerojet YLR87-AJ-7: two thrust chambers, each with its own turbopump, on a single frame hung from four ' +
      'longerons under the fuel tank, in the open. It is started by a solid cartridge that spins the pumps; the ' +
      'signal came 3.51 seconds before liftoff. The missile had a fault a warhead could live with and a crew could ' +
      'not: it shook along its length, thrust and feed lines and structure driving one another, like a pogo stick. ' +
      'The cure is on the feed lines here: a standpipe on each oxidiser line, with a bubble of gas for the liquid ' +
      'to bounce on, and a piston accumulator on each fuel line. On the flight before this one the standpipes had ' +
      'been charged wrongly and the crew were shaken hard. This time the shaking was small and came and went from ' +
      '110 seconds to staging: about an eighth of a g at the most, for three seconds, at 133 seconds. Borman felt ' +
      'something at two minutes five; Lovell felt nothing. The chambers ran until the oxidiser was gone, at 155.61 ' +
      'seconds, with about 20 lb of fuel they could have used still aboard. The engine’s length and gimbal ' +
      'station are documented; its bells are sized from published ratios and its form is representative.',
    facts: [
      ['Thrust', 'about 430,000 lbf at liftoff (1,913 kN)'],
      ['Engine', 'Aerojet YLR87-AJ-7, two chambers'],
      ['Length', '123.04 in (3.13 m)'],
      ['Pogo on this flight', 'about ±0.13 g at 11.8 cycles a second, for 3 s'],
      ['Cutoff', '155.61 s after liftoff, the oxidiser gone'],
    ],
  },
];

const vehicle = geminiTitanStack({
  flight: 'gt-7',
  parts,
  // when this crew went aboard is not in what was read: taken as Gemini-Titan 4's count, T-100 minutes (On the
  // Shoulders of Titans, p. 245), the hatches shut twenty minutes after. Estimated
  seats: seats([-100 * 60, -80 * 60]),
  views: [
    { id: 'transponder', label: 'Transponder', nodes: ['RendezvousRecovery'], from: along(-30, 0.9) },
    { id: 'foot', label: 'Lights', nodes: ['EquipmentSection'], from: along(LEFT_AZ + 20, -0.75) },
  ],
  cabin: cabin({
    // no range and range-rate indicator: this ship had no radar, only the transponder that answered Gemini VI-A's, and
    // "The radar range and range-rate indicator was deleted" (the mission report, 3.1.2.9.1)
    radar: null,
    fairing:
      'Pressed after staging on this ship, by McDonnell’s manual, to throw off the nose fairing over the transponder’s antenna and the scanner fairing. The mission report gives no time for it.',
    power:
      'The pilot’s ammeter as spacecraft 3 had it. On this ship a monitor for the six fuel cell stacks stood here instead, which is not drawn.',
  }),
});

export const flight: Flight = {
  id: 'usa/gemini/gt-7',
  nation: 'USA',
  agency: 'NASA',
  program: 'Project Gemini',
  designation: 'Gemini-Titan 7',
  // the mission's own style, in Roman; the ship had no name (README.md, "The name")
  callsign: 'Gemini VII',
  spacecraft: 'Gemini spacecraft No. 7 (McDonnell Aircraft)',
  launchVehicle: 'Gemini Launch Vehicle 7, a Titan II (Martin)',
  // 19:30:03.702 G.m.t. (the mission report, 4.1 and Table 4.2-I, read on the page): 2:30:03.702 p.m. e.s.t.
  launch: '1965-12-04T19:30:03.702Z',
  launchSite: LC19.name,
  site: LC19,
  crew: ['Frank Borman', 'James A. Lovell Jr.'],
  summary:
    'Fourteen days: longer than any flight to the Moon would take, and nearly twice as long as anyone had flown. ' +
    'Borman and Lovell wore a suit made to be taken off in orbit, and took it off; ran on fuel cells that faltered ' +
    'and held; and on the eleventh day kept their ship steady while Gemini VI-A flew up to within a foot of it, ' +
    'the first time two crewed ships had met.',
  facts: [
    { label: 'Liftoff', value: '4 December 1965, 19:30:03.702 UTC' },
    { label: 'Command pilot', value: 'Frank Borman' },
    { label: 'Pilot', value: 'James A. Lovell Jr.' },
    { label: 'Duration', value: '330 h 35 min 1 s' },
    { label: 'Revolutions', value: '206' },
    { label: 'Orbit at insertion', value: '161 km by 328 km, 28.89°' },
    { label: 'Period', value: '89.39 min' },
    { label: 'Orbit from the fifth day', value: '297 km by 302 km, for Gemini VI-A to come to' },
    { label: 'Gemini VI-A alongside', value: '263 h 58 min, for about three and a half revolutions' },
    { label: 'Landing', value: '25°25.1′ N 70°06.7′ W, 6.4 nautical miles short' },
    { label: 'Recovery', value: 'USS Wasp' },
  ],
  // The flight as flown; README.md, "Timeline", gives each time its source. All are the mission report's (MSC-G-R-66-1):
  // the launch phase to the hundredth of a second from its Table 4.2-I, read on the page (the text layer garbles its
  // digits), the rest from that table, Tables 4.3-II and 4.3-III and sections 4.1, 5.1.7 and 5.1.8.
  timeline: [
    { t: -3.51, event: 'First stage engine ignition signal' },
    { t: 0, event: 'Liftoff, 14:30:03.702 EST, 3.702 s after the planned instant' },
    { t: 19.35, event: 'Roll programme begins; complete at 20.39 s' },
    { t: 22.94, event: 'Pitch programme begins' },
    { t: 155.61, event: 'First stage cutoff and second stage ignition signal, 0.26 s late' },
    { t: 156.25, event: 'The stages begin to part' },
    { t: 337.01, event: 'Second stage cutoff, 1.60 s early' },
    {
      t: 368.79,
      event:
        'The spacecraft cuts itself free. In orbit: 87.2 by 177.1 nautical miles. Borman turns round and flies beside the second stage, 60 to 150 ft off, for about 15 minutes',
    },
    { t: get(0, 21, 17), event: 'Away from the second stage: 8.8 ft/s, a minute sooner than planned, to save propellant' },
    {
      t: get(0, 25),
      event: 'About now the crew’s oxygen is let into the fuel cells’ tank for 17.5 s: its pressure rises from about 140 psi to 417',
    },
    {
      t: get(3, 47, 59),
      event: 'Perigee raised on a star, with the platform off: the aft thrusters for 76.2 s, 58.1 ft/s; 119.6 by 174.3 nautical miles',
    },
    { t: get(45, 3), event: 'Lovell begins to take off his pressure suit; it takes half an hour' },
    { t: get(69, 43, 21), event: 'Phase adjusted: the aft thrusters for 16.5 s, 12.6 ft/s' },
    { t: get(119, 11, 55), event: 'The orbit made round, first burn: 60.0 ft/s in 75.6 s' },
    {
      t: get(119, 55, 1),
      event:
        'Second burn, against the direction of flight: 12.1 ft/s. The ship is in the orbit Gemini VI-A will come to, 160.5 by 162.8 nautical miles',
    },
    { t: get(127, 0), event: 'About now the second fuel cell section’s output falls for the first time; it recovers in 15 hours' },
    { t: get(148, 0), event: 'About now Lovell puts his suit on and Borman takes his off' },
    { t: get(191, 0), event: 'About now, 12 December, the crew are told they may both have their suits off' },
    { t: get(201, 0), event: 'About now the tape recorder for telemetry fails: nothing more is recorded out of sight of a station' },
    { t: get(258, 7, 22.77), event: 'Gemini VI-A lifts off from the pad this ship left eleven days before' },
    { t: get(259, 0), event: 'About now both men put their suits on for the rendezvous' },
    {
      t: get(263, 58),
      event: 'Gemini VI-A is alongside: the first rendezvous. The two fly together for about three and a half revolutions',
    },
    { t: get(269, 30), event: 'About now Gemini VI-A moves away for the night' },
    { t: get(283, 28), event: 'The two thrusters that yaw the ship to the right are found to have all but failed' },
    { t: get(286, 57), event: 'Two of the second fuel cell section’s three stacks are switched off for good' },
    { t: get(290, 24), event: 'About now the main fuel tank is empty and the reserve tank is opened' },
    { t: get(329, 58, 4), event: 'Retrofire, in darkness, as planned to the second' },
    { t: get(330, 29, 30), event: 'Drogue parachute' },
    { t: get(330, 31, 3), event: 'Pilot parachute and the main after it' },
    { t: get(330, 35, 1), event: 'Landing, 25°25.1′ N 70°06.7′ W, 6.4 nautical miles short of the planned point' },
  ],
  specs: [
    ...dimensions(
      'documented',
      `${SEDR}, Figures 2-3 and 2-4, a manual that covers spacecraft 3, 4 and 7`,
      `the mission report’s Figure 3.1-1, "GLV - spacecraft relationships" (${GVII})`,
    ),
    {
      group: 'Spacecraft',
      label: 'Weight at launch',
      value: 8076.1 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `8,076.10 lb, "Launch, gross weight" (${GVII}, section 3.3, read on the page); ${CHRONOLOGY}, has 8,076`,
    },
    {
      group: 'Spacecraft',
      label: 'Weight at retrofire',
      value: 5648.73 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: '5,648.73 lb, "Retrograde": the re-entry module and the retrograde section (the same table)',
    },
    {
      group: 'Spacecraft',
      label: 'Weight at landing',
      value: 4317.14 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: '4,317.14 lb, "Touchdown (no parachute)"; 4,824.33 lb at the start of the entry (the same table)',
    },
    {
      group: 'Spacecraft',
      label: 'OAMS propellant, usable',
      value: 340 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `"The total quantity of usable OAMS propellant was 340 pounds", nearly all of it used (${GVII}, 5.1.8.1.2). Loaded: 247.5 lb of oxidiser and 180.9 lb of fuel (Table 5.1.8-I, read on the page); the reserve tank added 12.9 lb of usable fuel (5.1.8.1.1). ${KIT} has 423 lb`,
    },
    {
      group: 'Spacecraft',
      label: 'Fuel cell oxygen at launch',
      value: 181.8 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `181.8 lb, 101 per cent, at 230 psia; 60.95 lb, 33.86 per cent, at 329 h (${GVII}, 5.1.7.3.2). ${SEDR2}, p. 5-33, has the tank's load as 180 lb on spacecraft 5`,
    },
    {
      group: 'Spacecraft',
      label: 'Fuel cell hydrogen at launch',
      value: 23.58 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `23.58 lb, 106 per cent, at about 188 psia; 8.55 lb left at 329 h; "The hydrogen tank did not vent throughout the mission" (${GVII}, 5.1.7.3.1)`,
    },
    {
      group: 'Spacecraft',
      label: 'Fuel cell oxygen pressure after the crossfeed',
      value: 417 * PSI,
      unit: 'Pa',
      confidence: 'documented',
      note: `from about 140 psia at 22 min to 417 psia: the crossfeed valve open 17.5 s at 25 min, about 0.35 lb of oxygen across (${GVII}, 5.1.7.3.2 and 5.1.4.2). The line was added because of Gemini V (${GV}, 5.1.7.2.1)`,
    },
    {
      group: 'Spacecraft',
      label: 'Primary oxygen at launch',
      value: 109.2 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `109.2 lb, 103 per cent, at 960 psia; 34.28 lb left at 329 h (${GVII}, 5.1.4.2)`,
    },
    {
      group: 'Spacecraft',
      label: 'Fuel cell hydrogen tank, across',
      value: 28.6 * IN,
      unit: 'm',
      confidence: 'estimated',
      note: `about 28 in outside, as drawn for spacecraft 5, and 0.3 in of wrap round that. Inside it is derived: 22.25 lb of hydrogen at its liquid’s density, 4.42 lb/cu ft, is a ball 25.5 in across; the shell and insulation round it are a guess. On this ship fifty layers of aluminised Mylar were added outside (${GVII}, 3.1.2.6.2 and Figure 3.1-8), whose thickness is not given: the 0.3 in is a guess`,
    },
    {
      group: 'Spacecraft',
      label: 'Fuel cell oxygen tank, across',
      value: 23 * IN,
      unit: 'm',
      confidence: 'estimated',
      note: 'about 23 in outside. Inside it is derived: 180 lb of oxygen at its liquid’s density, 71.2 lb/cu ft, is a ball 20.3 in across; the shell and insulation are a guess',
    },
    {
      group: 'Spacecraft',
      label: 'Drinking water tanks A and B, across',
      value: 21.12 * IN,
      unit: 'm',
      confidence: 'assumed',
      note: `"two 150-pound storage tanks installed in the adapter equipment section ... as in the spacecraft 5 configuration" (${GVII}, 3.1.2.3), which were of the OAMS propellant tank's pattern (${GV}, 3.1.2.3); the 21.12 in is that tank’s size in this ship’s own manual (SEDR 300 vol. 1, Section VIII, p. 8-273), taken for the water tanks`,
    },
    {
      group: 'Spacecraft',
      label: 'Water tank C, capacity',
      value: 42 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `"one 42-pound tank (tank C in fig. 3.1-4) in the adapter retrograde section", sent up with 25 lb of water under oxygen at 18.0 psia (${GVII}, 3.1.2.3)`,
    },
    {
      group: 'Spacecraft',
      label: 'Water tank C, across',
      value: 13.5 * IN,
      unit: 'm',
      confidence: 'estimated',
      note: 'about 13.5 in outside. Inside it is derived: 42 lb of water at 62.4 lb/cu ft is a ball 13.05 in across; the shell is a guess. That it is a ball, in two halves bolted round the middle, on a tray in the retrograde section, is SEDR 300 vol. 1, Figure 6-10 sheet 5, which has no dimensions',
    },
    {
      group: 'Spacecraft',
      label: 'OAMS reserve fuel tank, length',
      value: 30.7 * IN,
      unit: 'm',
      confidence: 'documented',
      note: `"5.10 inches outside diameter, 30.7 inches in length", 546.0 cu in: "Reserve Fuel Tank (Spacecraft 7 only)" (SEDR 300 vol. 1, Section VIII, p. 8-271). It held 12.9 lb of usable fuel (${GVII}, 5.1.8.1.1). Where it lies in the section is estimated from that manual’s Figure 8-72`,
    },
    {
      group: 'Spacecraft',
      label: 'Transponder antenna, across',
      value: 6.6 * IN,
      unit: 'm',
      confidence: 'estimated',
      note: `"a single spiral antenna similar to equipment included in the rendezvous evaluation pod" (${GVII}, 3.1.2.4): drawn at the size this model gives the pod’s, which is scaled from a sketch (${GV}, Figure 3.1-4b). It stands 7 in off the axis: NASA S65-63113, taken from Gemini VI-A, shows one pale disc about half way out from the middle of the face`,
    },
    {
      group: 'Spacecraft',
      label: 'Transponder answered a ground radar at',
      value: 270 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `"solid lock-on occurring at a range of 270 nautical miles and lasting for a period of 110 seconds", from a Gemini radar at the Kennedy Space Center (${GVII}, 5.1.5.1.2). Gemini VI-A's radar held it from 434 km (${TITANS}, p. 287)`,
    },
    {
      group: 'Spacecraft',
      label: 'Station keeping on the second stage, nearest',
      value: 60 * FT,
      unit: 'm',
      confidence: 'documented',
      note: `"maintaining distances from 60 to 150 feet for about a 15-minute period" (${GVII}, 1.0 and 7.1.2.3.1). ${TITANS}, p. 280, has 15 m`,
    },
    {
      group: 'Spacecraft',
      label: 'Perigee at insertion',
      value: 87.2 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `87.2 nautical miles, against 87.1 planned (${GVII}, Table 4.3-III, the final figure before the station keeping, read on the page; ${CHRONOLOGY})`,
    },
    {
      group: 'Spacecraft',
      label: 'Apogee at insertion',
      value: 177.1 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: '177.1 nautical miles, against 183.1 planned (the same table). After the perigee was raised, 119.6 by 174.3; after the phase adjustment, 126.5 by 170.9; after the two burns of the fifth day, 160.5 by 162.8; in the last revolution, 158.2 by 164.3 (4.3.1.2)',
    },
    {
      group: 'Spacecraft',
      label: 'Period',
      value: 89.39 * 60,
      unit: 's',
      confidence: 'documented',
      note: '89.39 min at insertion (the same table)',
    },
    { group: 'Spacecraft', label: 'Inclination', value: 28.89, unit: 'deg', confidence: 'documented', note: '28.89° (the same table)' },
    {
      group: 'Spacecraft',
      label: 'Speed at separation',
      value: 25793 * FT,
      unit: 'm/s',
      confidence: 'documented',
      note: `25,793 ft/s at 368.79 s from liftoff, 11 ft/s under the plan (${GVII}, Table 4.3-I, final, read on the page)`,
    },
    {
      group: 'Spacecraft',
      label: 'Retrofire, from liftoff',
      value: get(329, 58, 4),
      unit: 's',
      confidence: 'documented',
      note: `329:58:04, as planned (${GVII}, Table 4.2-I). When the other three rockets fired was not recorded: the tape recorder had failed and no station was in reach (5.1.7.4)`,
    },
    {
      group: 'Spacecraft',
      label: 'Duration, liftoff to landing',
      value: get(330, 35, 1),
      unit: 's',
      confidence: 'documented',
      note: `330:35:01 (${GVII}, Table 4.2-I; ${CHRONOLOGY}, and its Appendix 8, which has 206 revolutions)`,
    },
    {
      group: 'Spacecraft',
      label: 'Landing short of the planned point',
      value: 6.4 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `"6.4 nautical miles uprange of the planned point and 0.5 nautical miles to the left of track", at 25°25.1′ N 70°06.7′ W by Grand Turk's radar (${GVII}, 4.1 and Table 4.3-I, final); the ship was picked up at 25°21.9′ N 70°08.8′ W (6.3.2)`,
    },
    {
      group: 'Launch vehicle',
      label: 'Weight at liftoff, with the spacecraft',
      value: 342569 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `342,569 lb at liftoff and 346,228 lb at ignition, the weights the Aerospace Corporation gave (${GVII}, section 3.3, read on the page)`,
    },
    {
      group: 'Launch vehicle',
      label: 'Launch azimuth',
      value: 83.6,
      unit: 'deg',
      confidence: 'documented',
      note: `"The 83.6° launch azimuth" (${GVII}, 5.2.9.1, read on the page: the text layer has 85.6); ${CHRONOLOGY}; ${TITANS}, p. 280`,
    },
  ],
  motors: [
    ...titanEngines(
      {
        burnS: 155.61,
        // the burn is this flight's own; the thrust is the type's nominal, taken for this vehicle
        confidence: 'assumed',
        note: `a combined 430,000 lb of thrust for the two is the Gemini Launch Vehicle's nominal (NASA release 65-158, the Gemini-Titan 4 press kit), taken for GLV-7: "Thrust levels for the first-stage and second-stage engines were nominal" (${GVII}, 4.1). The burn is liftoff to the shutdown signal, 155.61 s, with the ignition signal 3.51 s before liftoff (Table 4.2-I)`,
      },
      {
        burnS: 181.4,
        // the thrust is the type's nominal and the burn is a difference of two documented times: the entry takes the weaker
        confidence: 'derived',
        note: `100,000 lb of thrust at altitude is the type's nominal (the same press kit), and nominal on the day (${GVII}, 4.1). The burn is the ignition signal at 155.61 s to the shutdown signal at 337.01 s (Table 4.2-I): 181.40 s`,
      },
    ),
    ...thrusters(
      'spacecraft 7, whose manoeuvring system differed from spacecraft 5’s by a reserve fuel tank (the Gemini VII mission report, 3.1.2.7)',
    ),
  ],
  models: [vehicle],
};

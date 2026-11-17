import type { Flight } from '../../../../../src/types.ts';
import { LC19 } from '../../../places/cape-canaveral/lc-19.ts';
import { LC19_SPECS, lc19Vehicle } from '../../../places/cape-canaveral/lc-19.parts.ts';
import { g4cParts, standing } from '../../crew/g4c-suit.parts.ts';
import {
  BASE,
  CHRONOLOGY,
  GIX,
  IN,
  LB,
  LEFT_AZ,
  NMI,
  SEDR2,
  SP149,
  TITANS,
  TOP_AZ,
  along,
  cabin,
  dimensions,
  hingeAxis,
  outOfAdapter,
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
import {
  ATDA,
  ATDA_TARGET,
  atdaDimensions,
  atdaMotors,
  atdaParts,
  TARGET_GROUP,
  type TargetWords,
  withTarget,
} from '../../vehicles/gemini-targets.ts';

const DEG = Math.PI / 180;
/** Hours, minutes and seconds of ground elapsed time, as seconds from liftoff. */
const get = (h: number, m: number, s = 0) => h * 3600 + m * 60 + s;

// What was read for this flight: README.md, "Sources". The mission report is quoted by section, table and printed page.
const KIT = 'NASA release 66-97, the Gemini 9 press kit (10 May 1966)';
/** Where the two handrails are round the ship, degrees from its top (vehicles/gemini_spacecraft.py `HANDRAILS`: estimated). */
const HANDRAIL_AZ = 12;
/**
 * How far the pilot's hatch stood open while Cernan was outside. Not found for this flight: it is drawn as Gemini IV's
 * was, about 100° (flights/gt-4/flight.ts, by eye from a photograph of that flight). Assumed.
 */
const HATCH_OPEN = 100 * DEG;

const parts: PartWords[] = [
  {
    node: 'NoseFairing',
    name: 'Nose fairing',
    summary: 'A glass-fibre cap over the ship’s forward face, where everything a docking needs was.',
    detail:
      'The forward section ends in a flat face, and going up through the air it wants a cover. This one is laminated ' +
      'glass fibre, 5.31 in deep, and it is the tip of the whole vehicle. Under it on this ship were the four ' +
      'antennas of the rendezvous radar and, round the rim, three latch receptacles for a docking cone’s hooks to ' +
      'catch, which the fairing shields on the way up. On this flight it was thrown off in orbit, after the ship ' +
      'had left the Titan, with the scanners’ fairing and the two covers over the windows; the report gives no ' +
      'time. Its size is McDonnell’s drawing.',
    facts: [
      ['Depth', '5.31 in (0.13 m): Z233.97 to Z239.28'],
      ['Material', 'glass fibre reinforced plastic laminate'],
      ['Under it', 'the rendezvous radar and three docking latch receptacles'],
      ['Thrown off', 'in orbit, after separation: the time is not given'],
    ],
  },
  {
    node: 'RendezvousRecovery',
    name: 'Rendezvous and recovery section',
    summary: 'A nose built to dock, which came within inches of its target three times and could not.',
    detail:
      'The forward 42 inches: beryllium shingles, black outside, over a titanium frame, with the parachutes inside ' +
      'and on its face what a ship needs to find another and join it. Four spiral antennas are the radar: on the ' +
      'first chase it heard the target at 130 nautical miles and held it from 120. Round the rim are three latch ' +
      'receptacles, and at the top the index bar, a steel rod that a cartridge drives 13.82 in out of the skin in ' +
      'orbit, to go into a notch in the target’s cone. None of it met anything. The cone was behind the two ' +
      'halves of a shroud that had opened part way and stuck. Stafford flew the ship up to it three times in ' +
      'three different ways, the last time from above, with the Earth behind the target, and held it there at ' +
      'distances the report gives in inches. He wanted to nudge the jaws open with the bar, and was told not to. ' +
      'Two days later Cernan, outside, hung a mirror on it. When the main parachute comes out this whole section ' +
      'is pulled off and lost. The bar is built drawn in, as it left the pad, and runs out at the end of the ' +
      'slider. Its travel is documented; the radar’s antennas are sized from the sketch of spacecraft 5’s, and ' +
      'the receptacles are scaled from McDonnell’s figure.',
    facts: [
      ['Length', '42.00 in (1.07 m)'],
      ['Skin', 'unbeaded beryllium shingles'],
      ['Radar', '4 spiral antennas: first lock at 130 nautical miles'],
      ['Index bar', 'runs out 13.82 in; stowed at launch'],
      ['Docking fittings', '3 latch receptacles, equally spaced: not used'],
      ['Nearest to the target', 'about 3 in, on the third rendezvous'],
      ['Main parachute', 'ring-sail, 84.2 ft, in a container 22.25 by 21.32 in'],
    ],
    // A part with moves is not slid by the slider itself (viewer/explode.ts): its own lift is the first of them, over
    // the stretch a part of its order takes (6 of 12), and then the index bar runs out of its casing, on RR_IndexBar
    // (vehicles/gemini_spacecraft.py build_index_bar). Its travel is documented
    moves: [
      { kind: 'slide', by: [0, 8.2, 0], from: 1 / 4, to: 3 / 4 },
      { kind: 'slide', node: 'RR_IndexBar', by: along(TOP_AZ, 0, 13.82 * IN), from: 0.78, to: 0.9 },
    ],
    functions: [{ nodes: ['RR_IndexBar'], name: 'Index bar', ends: ['Stowed', 'Extended'], seconds: 3 }],
  },
  {
    node: 'ReentryControl',
    name: 'Re-entry control system section',
    summary: 'Sixteen small thrusters for the way home, which ended a third of a mile from where it was aimed.',
    detail:
      'Eighteen inches of cylinder between the cabin and the forward section. Everything that steers the ship in ' +
      'orbit is in the adapter, and the adapter is thrown away before the ship comes home; from then to the ' +
      'parachute it is steered by this. There are two rings of eight thrust chambers of 25 lbf, each ring with its ' +
      'own fuel, oxidiser and nitrogen, so that either alone is enough. A Gemini comes through the air with a ' +
      'little lift; rolling the ship turns that lift to one side or the other, and so chooses where it comes down. ' +
      'On this flight the ship’s computer did the choosing better than it had been done before. When the drogue ' +
      'parachute came out, the ship’s own navigation, checked against the radars, had it 0.38 of a nautical mile ' +
      'from the mark. The recovery ships put the landing itself 2.3 nautical miles west of it, in plain sight of ' +
      'the carrier. Which chamber fires which way is McDonnell’s drawing; where the clusters stand is read off a ' +
      'photograph of spacecraft 3.',
    facts: [
      ['Length', '18.00 in (0.46 m)'],
      ['Diameter', '38.66 in (0.98 m)'],
      ['Thrust chambers', '16 × 25 lbf, in two rings of 8'],
      ['At drogue deployment', '0.38 nautical mile from the planned point'],
      ['Landing, by the recovery forces', '2.3 nautical miles west of it'],
    ],
  },
  {
    node: 'Hatches',
    name: 'Hatches',
    summary: 'Two doors with a window each. The pilot’s stood open for two hours and five minutes.',
    detail:
      'Each man has a hatch over him, hinged along its outboard edge and held down by twelve latches, skinned in the ' +
      'same beaded shingles as the cabin. The window is at the hatch’s forward end and is not in the skin: the ' +
      'outer pane stands at about 35° to the hatch, so that it faces forward, and ahead of it a trough is cut into ' +
      'the cone for the pilot to look along. On the ships before, a film had formed on the outer panes during the ' +
      'climb. This ship went up with a cover over each: the outer window of a ship that had already flown, in its ' +
      'own frame, hooked on by two hinges and thrown off by two springs when a knob inside the hatch was turned, ' +
      'in orbit. Cernan opened his hatch at 49 hours 23 minutes and stood up in it; it was shut again at about ' +
      '51 hours 28 minutes. The gear for closing it had been altered since Gemini VIII so that the man in the ' +
      'other seat could help pull, and the two of them closed it together. The pane’s angle is McDonnell’s drawing; where the ' +
      'windows and the hatches’ edges lie is read off photographs of spacecraft 3, to about two inches; how far ' +
      'the hatch stood open is drawn as Gemini IV’s was. The covers’ form is estimated.',
    facts: [
      ['Number', '2, hinged on the outboard side'],
      ['Latches', '12 to a hatch'],
      ['Windows', 'an outer pane and two inner, at 35° to the hatch'],
      ['Window covers', 'one over each, thrown off in orbit: this ship’s first'],
      ['Opened in flight', 'the pilot’s: 49 h 23 min to about 51 h 28 min'],
      ['Open to', 'about 100°: assumed, as Gemini IV’s'],
    ],
    // Its own lift over the stretch a part of its order takes (8 of 12: a third to five sixths), and then the pilot's
    // hatch swings on its hinge, on HatchRight (vehicles/gemini_spacecraft.py build_hatches). That it opened is
    // documented; how far, assumed
    moves: [
      { kind: 'slide', by: along(TOP_AZ, 3.8, 1.7), from: 1 / 3, to: 5 / 6 },
      { kind: 'swing', node: 'HatchRight', axis: hingeAxis(1), angle: HATCH_OPEN, from: 0.6, to: 0.9 },
    ],
  },
  {
    node: 'ScannerFairing',
    name: 'Horizon scanner fairing',
    summary: 'A bronze-coloured cover over the infrared eyes that find the horizon, thrown off in orbit.',
    detail:
      'On the ship’s left side at the neck, two infrared scanners look out for the edge of the Earth and tell the ' +
      'ship which way is down. They would not survive the climb through the air uncovered, so a fairing sits over ' +
      'them, and it is thrown off with the nose fairing: on this flight in orbit, after the ship had left the ' +
      'Titan. On earlier flights the scanners had now and then been fooled by cold cloud and by the ozone’s band ' +
      'of the infrared, and one of this ship’s two was given a narrower filter to try. Its size and place are ' +
      'read off a colour photograph of spacecraft 3 on the morning it flew, and taken to be the same here.',
    facts: [
      ['Covers', 'the horizon scanners, on the left side'],
      ['Lies', 'from Z166.5 to Z190.5, about two feet'],
      ['Thrown off', 'in orbit, with the nose fairing: the time is not given'],
      ['Secondary scanner', 'a narrower band, 13 to 22 microns, on trial'],
    ],
  },
  {
    node: 'Cabin',
    name: 'Cabin section',
    summary: 'Beaded shingles of René 41 over a titanium frame, with eighty patches of Velcro for a man outside.',
    detail:
      'A cone 70.53 in long at 20° to its axis, 90 in across the heat shield and 38.66 in across the neck. The skin ' +
      'is shingles of René 41, a nickel alloy, pressed into short beads that lie round the cone one after another, ' +
      'in cells between rows of fasteners: they stiffen the sheet and let it grow when hot, and it is black outside ' +
      'so that it radiates. The shingles are not the pressure vessel: that is a welded titanium box inside, and the ' +
      'room between its flat sides and the cone is equipment bays. Eighty patches of Velcro hook were bonded to ' +
      'the outside of the ship for the man going out to hold by, with pads of Velcro pile on his gloves. It was ' +
      'not strong enough to keep his body where he put it. NASA allowed no names on its Geminis after the first, and this one had none. UNITED STATES ' +
      'and the flag are drawn as spacecraft 3 wore them; no photograph of this ship has been read closely enough ' +
      'to check them, and the Velcro is not modelled.',
    facts: [
      ['Length', '70.53 in (1.79 m)'],
      ['Half-angle', '20°'],
      ['Skin', 'beaded René 41 shingles, black'],
      ['Paint', 'UNITED STATES and the flag: as spacecraft 3, assumed'],
      ['Velcro', '80 patches of hook on the ship: not modelled'],
      ['Name', 'none'],
    ],
  },
  {
    node: 'CrewStation',
    name: 'Crew station',
    summary: 'Where the backup crew sat for three counts and three days, after the men they were backing were killed.',
    detail:
      'Two men sit as in an aeroplane, the command pilot on the left, in pure oxygen at about 5 psi, each with a ' +
      'window before him and a hatch over him. These seats were to have been Elliot See’s and Charles Bassett’s. ' +
      'On 28 February 1966 the two flew into St. Louis in bad weather to see this spacecraft, and were killed ' +
      'when their aeroplane struck the building it was being finished in. Stafford and Cernan, their backups, ' +
      'landed minutes behind them, and took the flight. They sat here on 17 May while the Atlas carrying their ' +
      'Agena fell into the Atlantic; on 1 June, with a substitute target already in orbit, while a ground ' +
      'computer failed to send the ship its last update and the count ran out; and on 3 June, when it went. The ' +
      'panels are drawn from McDonnell’s drawing of spacecraft 3’s, with the two clocks the later ships added. ' +
      'What this ship added is not drawn: the switch for the Air Force’s backpack and the lamp that warned of ' +
      'its peroxide, a meter for each of the fuel cells’ six stacks, and the one lever, new after Gemini VIII, ' +
      'that cuts the power to every manoeuvring thruster. The chest pack for the man going outside was stowed ' +
      'between the seats and is not modelled. The seats are empty: both men wore the G4C suit, which is modelled ' +
      'standing, at the foot of the erector, and not seated. No drawing read gives the pressure vessel’s dimensions: its sizes are those fitted round the ' +
      'crew of spacecraft 3.',
    facts: [
      ['Crew', '2: command pilot left, pilot right'],
      ['Seats', 'ejection seats, 22 in wide, canted 12° outboard and 8° forward'],
      ['Panels', 'spacecraft 3’s, with the G.m.t. and elapsed-time clocks'],
      ['Atmosphere', 'pure oxygen, about 5 psi'],
      ['Power', 'two fuel cell sections in the adapter; 4 batteries of 45 Ah here for the way home'],
      ['Suits', 'G4C: the two men stand at the pad, the seats are empty'],
    ],
  },
  {
    node: 'HeatShield',
    name: 'Heat shield',
    summary: 'A shallow dish of resin-filled honeycomb, 90 inches across, that chars away.',
    detail:
      'Glass-fibre honeycomb filled with a silicone elastomer, bolted to the big end of the cabin: a dish 90 in ' +
      'across, part of a sphere of 144 in radius. It is an ablator, and it rides the whole flight inside the ' +
      'adapter, out of sight until the last of the adapter is cut away after retrofire. On this flight the ship ' +
      'came down in the western Atlantic 72 hours 20 minutes 50 seconds after it left, three and a half nautical ' +
      'miles from the carrier Wasp, and was hoisted aboard with its crew still in it 53 minutes later. The station ' +
      'taken here for the shield’s crown is one of SEDR 300’s that the drawing does not name.',
    facts: [
      ['Diameter', '90.00 in (2.29 m)'],
      ['Spherical radius', '144 in (3.66 m)'],
      ['Material', 'silicone-filled glass-fibre honeycomb'],
      ['Landing', '72 h 20 min 50 s after liftoff, 27°52′ N 75°02.8′ W'],
      ['Aboard USS Wasp', '53 minutes after landing, the crew in the ship'],
    ],
  },
  {
    node: 'RetroSection',
    name: 'Adapter: retrograde section',
    summary: 'Four solid rockets for coming home, the ship’s headlight, and the first 21 inches of Cernan’s handrail.',
    detail:
      'The upper two fifths of the white adapter, from station Z68.44. Inside, on a cross of aluminium I-beams, are ' +
      'four solid rockets in titanium balls about 13 in across, each of about 2,500 lbf for five and a half seconds, ' +
      'fired one after another; at 71 hours 46 minutes 44 seconds the first of them lit. In its skin are six ' +
      'thrusters of the manoeuvring system: two that fire forward, the brakes of three rendezvous, and four that ' +
      'push the ship sideways, up and down. At the forward end, on top, is the docking light, a lamp of 4,000 ' +
      'candlepower over the crew’s heads, and behind it a smaller one that looks aft, for the man outside. Two ' +
      'rails lie along the adapter behind the right hatch, flush with the skin at launch: 21 in of rail on this ' +
      'section, which Cernan sprang out by pressing a button at its end, and 46 on the next. Behind the hatch is ' +
      'the box of experiment S-12, which he took in as soon as he stood up. From this section too a seven-foot ' +
      'aerial of another experiment stood out in orbit; he broke it off eight inches from its foot. One of ' +
      'the ship’s two water tanks is in here. The inside of the skin, bare foil on the ships before, is gold on ' +
      'this one. The rails’ sizes are documented and their place is scaled from Gemini VIII’s report; the ' +
      'lights’ forms are estimated. The aerial and a mount for a film camera are not modelled.',
    facts: [
      ['Retrograde rockets', '4 × about 2,500 lbf, 5.5 s each'],
      ['First fired', '71 h 46 min 44 s after liftoff'],
      ['Forward thrusters', '2 × 85 lbf'],
      ['Lateral thrusters', '4 × 100 lbf'],
      ['Docking light', '4,000 candlepower, centred over the crew’s heads'],
      ['Forward handrail', '21 in long, 0.55 by 1.25 in, stands out 1.5 in'],
      ['Experiment S-12', 'micrometeorite collector, 11 × 5.5 × 1.25 in'],
      ['Inner surface', 'gold, from this ship on'],
    ],
    // Its own lift over the stretch a part of its order takes (11 of 12), then the forward handrail stands out of the
    // skin, on Retro_Handrail (vehicles/gemini_spacecraft.py build_handrail). The 1.5 in is documented (SP-149, p. 5-6)
    moves: [
      { kind: 'slide', by: [0, 3.0, 0], from: 11 / 24, to: 23 / 24 },
      { kind: 'slide', node: 'Retro_Handrail', by: outOfAdapter(HANDRAIL_AZ, 1.5 * IN), from: 0.8, to: 0.92 },
    ],
    functions: [{ nodes: ['Retro_Handrail'], name: 'Forward handrail', ends: ['Flush', 'Out'], seconds: 3 }],
  },
  {
    node: 'EquipmentSection',
    name: 'Adapter: equipment section',
    summary: 'Fuel cells, propellant for three rendezvous, and at the back the place where a man was to put on a rocket.',
    detail:
      'The lower three fifths of the adapter, 10 ft across at the foot. As on Gemini VIII, two fuel cell sections ' +
      'hang under one beam with the small tanks of a three-day flight, 5.8 lb of hydrogen and 46 lb of oxygen, and ' +
      'under the other the manoeuvring system’s tanks: two of fuel, two of oxidiser, two of helium and a small ' +
      'reserve. The ship could use 336 lb of the oxidiser and 343 lb of the fuel, and in three rendezvous and ' +
      'hours of flying beside a tumbling target it burned 700 lb: fourteen were left. Round the foot are ten of ' +
      'the sixteen thrusters. Across it is the gold cover, gathered to an oblong opening in the middle; behind ' +
      'the thermal cover over that opening hangs the Air Force’s backpack, and against the cloth lie two hand ' +
      'bars and a foot rail, folded. This was Cernan’s workplace. He came to it along the rail outside, 46 in ' +
      'of which is on this section, found that one hand bar and the cover had not sprung all the way out, and ' +
      'pulled them free. Then, standing in stirrups that did not hold his feet, he tried to ready the pack, and ' +
      'every valve he turned turned him. The inside of the skin is gold on this ship. Which side each module ' +
      'stands on is McDonnell’s drawing, and so is the order of the fuel cell module’s row; the tanks’ loads are ' +
      'his manual’s; the gold cover is measured on a photograph of this ship’s adapter; each thing’s exact place ' +
      'is estimated. The tape memory unit, somewhere in this section, is not modelled.',
    facts: [
      ['Base diameter', '120.00 in (3.05 m)'],
      ['Power', '2 fuel cell sections; 5.80 lb of hydrogen, 46.0 lb of oxygen'],
      ['OAMS tanks', '2 of fuel, 2 of oxidiser, 2 of helium, and a reserve fuel tank'],
      ['OAMS propellant', '336 lb oxidiser and 343 lb fuel usable; 700 lb consumed'],
      ['Aft handrail', '46 in long; springs out as the ship leaves the Titan'],
      ['Hand bars', 'tube 1.38 in across, folded at launch'],
      ['Foot rail', 'with two stirrups, new on this ship'],
      ['Cut away', '71 h 45 min 50 s after liftoff'],
    ],
    // Its own lift over the stretch a part of its order takes (the last half of the slider), and the aft handrail
    // standing out of the skin as it did when the ship left the launch vehicle
    moves: [
      { kind: 'slide', by: [0, 1.8, 0], from: 1 / 2, to: 1 },
      { kind: 'slide', node: 'Equipment_Handrail', by: outOfAdapter(HANDRAIL_AZ, 1.5 * IN), from: 0.8, to: 0.92 },
    ],
    functions: [{ nodes: ['Equipment_Handrail'], name: 'Aft handrail', ends: ['Flush', 'Out'], seconds: 3 }],
  },
  {
    node: 'ManeuveringUnit',
    group: 'Spacecraft',
    inside: true,
    name: 'Astronaut Maneuvering Unit',
    summary: 'The Air Force’s rocket backpack. Cernan reached it, strapped in, and could not see to fly it.',
    detail:
      'An aluminium box 32 in high, 22 wide and 19 deep, 166 lb with its 24 lb of hydrogen peroxide aboard: in ' +
      'effect a spacecraft with a man for a cabin. Twelve thrusters of about 2.3 lb in its corners, worked from ' +
      'two controllers on arms that fold out to either hand, could move him in any direction and turn him about ' +
      'any axis; it had its own oxygen, batteries, gyros and radio. Its exhaust is hot, up to 1,300 °F, so the ' +
      'legs of Cernan’s suit were covered in a cloth of woven metal. It hangs at the back of the adapter on ' +
      'a torque box under the blast shield’s door, turned 22.5° from the ship’s sides, behind a thermal cover. ' +
      'Cernan got to it at 50 hours 9 minutes, in the dark. The work of unfolding it and plugging himself into ' +
      'it, with nothing to brace against, was far more than had been allowed for, and eight minutes after ' +
      'sunset his visor began to fog. He backed into the pack at 50:39 and changed over to its power, seeing ' +
      'almost nothing. At 51:03 Stafford called it off. The pack was never let go: it went with the equipment section. Its size, weight, ' +
      'propellant and thrusters are documented, and so are the stations it hung between; its outside is drawn ' +
      'from the report’s figures, which are sketches and dark photographs, and is estimated.',
    facts: [
      ['Size', '32 in high, 22 in wide, 19 in deep'],
      ['Weight', '166 lb'],
      ['Propellant', 'about 24 lb of 90 per cent hydrogen peroxide'],
      ['Thrusters', '12 of about 2.3 lbf: 4 forward, 4 aft, 2 up, 2 down'],
      ['Oxygen', '7.3 lb at 7,500 psi'],
      ['Hung', 'on a torque box from Z66.74 to Z56.27, turned 22.5°'],
      ['Reached', '50 h 9 min; called off at 51 h 3 min'],
      ['Flown', 'no'],
    ],
    explode: [0, 0.5, 0],
    order: 12,
  },
  {
    node: 'TitanStage2',
    name: 'Second stage',
    summary: 'Two tanks and the guidance between them. It was to put the ship where it could catch its target in three revolutions.',
    detail:
      'Ten feet across, like the first stage, and built the same way: the tanks’ walls are the vehicle’s skin. ' +
      'Oxidiser is above fuel, and between the two tanks are the trusses that carry what flies the vehicle: radio ' +
      'guidance, a second flight control system able to take over from the first, and a malfunction detection ' +
      'system that told the crew what their booster was doing. The forward skirt is bare metal. The target had ' +
      'been in orbit two days. On 1 June this vehicle had stood ready to follow it up 98 minutes later, and at ' +
      'three minutes to go a computer on the ground could not get the last correction to the ship’s own ' +
      'guidance; the moment passed. On 3 June the same update failed again, and the launch went on one sent ' +
      'twelve minutes earlier. Liftoff was within half a second of the time wanted, on an azimuth of 87.4°; the ' +
      'stage cut off 339.79 seconds later, and the orbit was 85.7 by 144.0 nautical miles.',
    facts: [
      ['Diameter', '10 ft (3.05 m)'],
      ['Propellants', 'nitrogen tetroxide and Aerozine 50'],
      ['Forward skirt', '22.3 in, bare'],
      ['Cut off', '339.79 s after liftoff'],
      ['Launch azimuth', '87.4°'],
      ['Counts', '1 June, stopped at T−3 min; 3 June'],
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
      'nozzle, and that is the roll control. It was signalled to start 152.48 seconds after liftoff and shut down ' +
      'at 339.79. The engine’s place is documented, and so are the two expansion ratios, 13 and 49.2, that put ' +
      'the joint in its bell where it is; the bell’s size is computed from them, and the rest of its form is ' +
      'representative.',
    facts: [
      ['Thrust', 'about 100,000 lbf at altitude (445 kN)'],
      ['Engine', 'Aerojet YLR91-AJ-7'],
      ['Burned', '152.48 s to 339.79 s after liftoff'],
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
      'ports at the foot. On this flight the start signal came at 152.48 seconds and the stages began to part at ' +
      '153.23. The black and white panels are the roll pattern: the cameras that followed the vehicle could see ' +
      'from them whether it was turning. The pattern is drawn as GLV-3’s: no photograph of this vehicle has been ' +
      'read closely enough to check it.',
    facts: [
      ['Stages part at', 'station 500, its upper edge'],
      ['Staging', '"fire in the hole": engine start before separation'],
      ['Paint', 'eight panels, black on the diagonals: as GLV-3, assumed'],
      ['Stages began to part', '153.23 s after liftoff'],
    ],
  },
  {
    node: 'TitanStage1',
    name: 'First stage',
    summary: 'Seventy feet of tank that stood ready on Complex 19 for three targets and flew for the third.',
    detail:
      'Oxidiser tank above, fuel tank below, and the oxidiser’s feed line running down through the middle of the ' +
      'fuel. Nothing is cryogenic: nitrogen tetroxide and a hydrazine blend keep at ordinary temperatures, so the ' +
      'vehicle could stand loaded and go at a chosen second, which a rendezvous needs. It stood so on 17 May, ' +
      'when its Agena was lost with the Atlas under it, and on 1 June, and left on 3 June at 13:39:33.335 G.m.t. ' +
      'The wall is bare aluminium down to the splice between the tanks, white below that, then black, with the ' +
      'roll pattern at the foot, and UNITED STATES down the bare metal: drawn as GLV-3 wore it, which no ' +
      'photograph of this vehicle has been read closely enough to confirm. One opening in its skin that the ' +
      'vehicles before had, for cooling air to a compartment, was left out of this one; the model has never had it.',
    facts: [
      ['Length with its engines', '848.1 in (21.54 m)'],
      ['Diameter', '10 ft (3.05 m)'],
      ['Lettering', 'UNITED STATES, upright letters, one side: as GLV-3, assumed'],
      ['Weight at liftoff, with the spacecraft', '340,732 lb'],
      ['Weight at first stage burnout', '86,224 lb'],
    ],
  },
  {
    node: 'TitanStage1Engine',
    name: 'First stage engine',
    summary: 'Two chambers on one frame: 430,000 lbf for 152.49 seconds.',
    detail:
      'An Aerojet YLR87-AJ-7: two thrust chambers, each with its own turbopump, on a single frame hung from four ' +
      'longerons under the fuel tank, in the open. It was signalled to light 3.14 seconds before liftoff and shut ' +
      'down at 152.49, eight tenths of a second later than planned; by then the vehicle was 34.6 nautical miles ' +
      'up and moving at 9,766 ft a second. On this vehicle the signals that let go the hold-down bolts and ' +
      'started the staging came from the malfunction detection system’s own pressure switches. Its length and ' +
      'gimbal station are documented; its bells are sized from published ratios and its form is representative.',
    facts: [
      ['Thrust', 'about 430,000 lbf at liftoff (1,913 kN)'],
      ['Engine', 'Aerojet YLR87-AJ-7, two chambers'],
      ['Length', '123.04 in (3.13 m)'],
      ['Burned', '−3.14 s to 152.49 s'],
      ['At cutoff', '209,963 ft and 9,766 ft/s'],
    ],
  },
];

// The target: what this flight says of its own vehicle's parts. Where each stands and how it comes apart, and the words
// of the parts that were the same on every target, are the type's (vehicles/gemini-targets.ts `atdaParts`)
const target: TargetWords[] = [
  { node: 'DockingCone', summary: 'The cone behind the jaws: three rendezvous came to it, and no nose went in.' },
  {
    node: 'StatusDisplay',
    summary: 'The target’s instrument panel, on its outside, with engine lamps for engines this vehicle did not have.',
  },
  {
    node: 'AtdaShroud',
    name: 'ATDA: ascent shroud',
    summary: '"It looks like an angry alligator out here rotating around." Two half-shells that opened thirty degrees and stopped.',
    detail:
      'Two half-shells of phenolic glass fibre, 117 in long and 65 across the base: the same shroud an Agena wore ' +
      'over its docking cone on the way up, with its vents closed. Two seconds before the vehicle left its Atlas, ' +
      'four bolts were to fire, a steel band round the shroud was to let go, springs were to push the halves ' +
      'apart at the nose, and they were to swing out on pivots at their bases and fall away. The bolts fired. ' +
      'The halves swung to about thirty degrees and stayed, held by the wires that had carried the firing ' +
      'current to the bolts on the band. Each wire had a plug made to pull out at two pounds, by a lanyard ' +
      'fastened to the band; the lanyards had been taped down instead. On the pad, Douglas’s man who knew the ' +
      'shroud had gone home, and McDonnell’s crew, working from instructions copied from Douglas’s that said ' +
      '"See blueprint", had no blueprint. Stafford saw it from a thousand feet: "The shroud is half open on that ' +
      'thing." One half carries the whole nose. The length, the width and the thirty degrees are documented; ' +
      'the nose’s radius is worked from the other dimensions; which half kept the nose is not made out, and ' +
      'the wires’ paths are estimated.',
    facts: [
      ['Length', '117 in (2.97 m)'],
      ['Base', '65.12 in across'],
      ['Made of', 'phenolic glass fibre, by Douglas'],
      ['Opened', 'about 30°'],
      ['Held by', 'the wiring to the band clamp’s explosive bolts'],
      ['Band clamp', '22 in above its base'],
      ['Should have gone', '2 s before the vehicle left the Atlas'],
    ],
  },
  {
    node: 'TargetDockingAdapter',
    name: 'ATDA: target docking adapter',
    summary: 'The same collar Gemini VIII had docked with, on a simpler vehicle, and out of reach.',
    detail:
      'The docking adapter is McDonnell’s, and this one is of the pattern that flew on Gemini VIII’s Agena: a cone ' +
      'floating on seven dampers in a short cylinder of bare aluminium, with a V-shaped notch in its top for the ' +
      'ship’s index bar, three hooks in its throat, and a motor to draw cone and ship six inches in. Over the ' +
      'notch are the status panels; at its edge two flashing lights; from its top the boom of the transponder’s ' +
      'third antenna, which ran out eight seconds after the vehicle left its Atlas, shroud or no shroud. On this ' +
      'vehicle the cone’s outside was painted aluminium, where an Agena’s was black. From the ground they ' +
      'drew the cone in and ran it out, hoping to shake the shroud loose; it did not come. The upper flashing ' +
      'light could be seen and the lower was mostly hidden. It carried a package of experiment S-10 that nobody ' +
      'came for. The adapter’s length, the cone’s travel and the boom’s height are documented; the cone’s size ' +
      'is scaled from a photograph of Gemini VIII’s.',
    facts: [
      ['Adapter shell', '23.8 in long, 60 in across, bare aluminium'],
      ['Cone', 'about 54 in across the mouth: estimated; painted aluminium'],
      ['Cone’s lip', '44.40 in forward of the adapter’s aft face'],
      ['Latch hooks', '3'],
      ['Antenna boom', 'about 85 in; run out 8 s after separation'],
      ['Docked with', 'nothing'],
    ],
  },
  {
    node: 'AtdaEquipmentSection',
    name: 'ATDA: equipment section',
    summary: 'A target made in six weeks from spare parts, in case the Agena failed again. It did.',
    detail:
      'After the first Agena was lost in October 1965, McDonnell proposed a cheap stand-in that an Atlas could ' +
      'put up by itself: the docking adapter on a plain cylinder, with nothing in it that had not already been ' +
      'tested for the spacecraft. It was approved on 9 December and finished on 21 January. It has no engine and ' +
      'cannot change its orbit. In this section, on two beams that cross in the middle, are radar beacons for ' +
      'the ground, a command receiver, telemetry and the electronics of a small attitude control system. When ' +
      'the second Agena went into the Atlantic on 17 May it was taken out of store, and an Atlas put it into a ' +
      'circle 161 nautical miles up on 1 June. The section is 54 in long and 60 across. Six running lights ' +
      'under quartz domes tell an approaching crew how it lies: green to the right of its top, red to the left, ' +
      'amber underneath. McDonnell’s manual says it was painted black with white stripes; the photographs ' +
      'taken from Gemini IX-A show bare aluminium colour with one black band and a white stripe, and those are ' +
      'followed. What is inside is placed by guess.',
    facts: [
      ['Length', '54.00 in (1.37 m)'],
      ['Diameter', '60 in (1.52 m)'],
      ['Running lights', '6: two green, two red, two amber'],
      ['Access doors', '4'],
      ['Weight at launch', '2,006 lb, the whole vehicle'],
      ['Orbit', '158.5 by 161.5 nautical miles'],
    ],
  },
  {
    node: 'AtdaReactionControl',
    name: 'ATDA: reaction control section',
    summary: 'A spacecraft’s re-entry thrusters, to keep the target from tumbling.',
    detail:
      'Behind the equipment section the vehicle steps down to a Gemini spacecraft’s re-entry control section, 18 in ' +
      'long: sixteen thrusters of 23.5 lb in two rings, with their own tanks, which stand forward out of it into ' +
      'the section ahead. With two packages of rate gyros it could stop the vehicle turning or hold it turning ' +
      'slowly; it could not point it, since nothing aboard knows which way is down. When Gemini IX-A arrived it ' +
      'was rolling at about three degrees a second with its shroud hanging open. The section’s size is ' +
      'McDonnell’s drawing; the thrusters are drawn pointing straight out, where the spacecraft’s fire along ' +
      'its axes.',
    facts: [
      ['Reaction control section', '18.00 in long, 40.4 in across'],
      ['Thrusters', '16 × 23.5 lbf, in two rings'],
      ['Roll when found', 'about 3° a second'],
    ],
  },
];

// the vehicle and the target it went up to meet stand in the gallery: the vehicle on its engines, the target on the
// floor beside it (vehicles/gemini-targets.ts `withTarget`). At Complex 19 the vehicle stands on the thrust mount
// (`lc19Vehicle`) and the target is not drawn (address.ts `atSite`): it went up from Complex 14, which is another issue's
const vehicle = lc19Vehicle(
  withTarget(
    geminiTitanStack({
      flight: 'gt-9a',
      parts: [...parts, ...atdaParts(target)],
      // the crew in at T-115 minutes (the mission report, 7.1.2.1) and the hatches shut at the plan's T-100 (the press kit,
      // release 66-97, pp. 6 and 7), on a clock with a six-minute hold at T-3, assumed: estimated (pad.ts)
      seats: seats([-115 * 60 - 363, -100 * 60 - 363]),
      views: [
        { id: 'nose', label: 'Docking nose', nodes: ['RendezvousRecovery'], from: along(-30, 0.9) },
        { id: 'eva', label: 'Pilot’s hatch', nodes: ['Hatches'], from: along(55, 0.5) },
        { id: 'backpack', label: 'Backpack', nodes: ['ManeuveringUnit'], from: along(LEFT_AZ + 30, -0.7) },
        { id: 'target', label: 'ATDA', nodes: ATDA, from: along(LEFT_AZ + 20, 0.12) },
        { id: 'shroud', label: 'Shroud', nodes: ['AtdaShroud', 'AtdaShroudBand'], from: along(LEFT_AZ + 30, 0.5) },
        { id: 'cone', label: 'Docking cone', nodes: ['DockingCone', 'MooringLatches', 'StatusDisplay'], from: along(LEFT_AZ + 30, 0.9) },
      ],
      cabin: cabin({
        radar:
          'The range and closing speed of what the rendezvous radar has found. On this flight it was the ATDA’s transponder, from 130 nautical miles on the first rendezvous.',
        fairing:
          'Pressed to throw off the nose fairing over the radar and the scanner fairing. On this flight that was in orbit, after the ship had left the Titan.',
        power:
          'The pilot’s ammeter as spacecraft 3 had it. On this ship the fuel cells’ monitor stood here, each of its six ammeters showing one stack’s current: not drawn.',
      }),
    }),
    'ATDA 3.73 m and its shroud',
    ATDA_TARGET,
  ),
  BASE,
);

/**
 * The two men as they stood on the deck that morning, by the foot of the crew's ramp, facing the erector: each a figure
 * the site can be walked as (crew/g4c_suit.py), Cernan in the cover he was to go outside in, its legs of Chromel-R.
 * Where each stood is ours. The portable ventilator each carried and his yellow overshoes are not built
 * (crew/g4c-suit.md). The pad stands round them as at about 06:34, before they went up.
 */
const ARRIVED = -119 * 60 - 363;
const crew = standing({
  flight: 'gt-9a',
  id: 'crew',
  name: 'Command pilot',
  scale: 'Thomas P. Stafford · 1.83 m, 1.87 m suited · to scale',
  parts: g4cParts('Stafford'),
  height: 1.874,
  at: [9.6, 0, -2.5],
  boarding: ARRIVED,
});
const pilot = standing({
  flight: 'gt-9a',
  id: 'pilot',
  name: 'Pilot',
  scale: 'Eugene A. Cernan · 1.83 m, 1.87 m suited · to scale',
  parts: g4cParts('Cernan'),
  height: 1.874,
  at: [10.6, 0, -3.5],
  boarding: ARRIVED,
});

export const flight: Flight = {
  id: 'usa/gemini/gt-9a',
  nation: 'USA',
  agency: 'NASA',
  program: 'Project Gemini',
  designation: 'Gemini-Titan 9A',
  // the mission's own style, in Roman: the A marks the second attempt at the ninth mission (README.md, "The name")
  callsign: 'Gemini IX-A',
  spacecraft: 'Gemini spacecraft No. 9 (McDonnell Aircraft)',
  launchVehicle: 'Gemini Launch Vehicle 9, a Titan II (Martin)',
  // 13:39:33.335 G.m.t. (the mission report, Table 4.2-I): 8:39:33 a.m. e.s.t.
  launch: '1966-06-03T13:39:33.335Z',
  launchSite: LC19.name,
  site: LC19,
  weather: WEATHER,
  crew: ['Thomas P. Stafford', 'Eugene A. Cernan'],
  summary:
    'Flown by the backup crew after Elliot See and Charles Bassett were killed, to a stand-in target after the ' +
    'Agena was lost. The target’s shroud had not come off, so there was no docking; Stafford made three rendezvous ' +
    'with it of three kinds. Cernan’s walk outside, two hours and five minutes, was to end in a flight of the Air ' +
    'Force’s rocket backpack, and ended instead with his visor fogged at the back of the ship.',
  facts: [
    { label: 'Liftoff', value: '3 June 1966, 13:39:33.335 UTC' },
    { label: 'Command pilot', value: 'Thomas P. Stafford' },
    { label: 'Pilot', value: 'Eugene A. Cernan' },
    { label: 'Target', value: 'Augmented Target Docking Adapter, launched 1 June, 15:00:02.363 UTC, on Atlas 5304' },
    { label: 'Rendezvous', value: 'three: in the third revolution, equi-period, and from above' },
    { label: 'Docking', value: 'none: the target’s shroud was still on it' },
    { label: 'Outside', value: 'Cernan, 2 h 5 min from 49 h 23 min' },
    { label: 'Duration', value: '72 h 20 min 50 s' },
    { label: 'Orbit at insertion', value: '159 km by 267 km, 28.91°' },
    { label: 'Period', value: '88.78 min' },
    { label: 'Landing', value: '27°52′ N 75°02.8′ W, in the forty-fifth revolution' },
    { label: 'Recovery', value: 'USS Wasp, the crew still in the ship' },
  ],
  // The flight as flown; README.md, "Timeline", gives each time its source: the mission report's Tables 4.2-I and
  // 4.2-II (read on the page), its Table 4.3-III and its sections 5.1.10, 7.1 and 8.1.
  timeline: [
    { t: -167970.972, event: 'The Atlas lifts the ATDA off Complex 14, 1 June, 15:00:02.363 G.m.t.' },
    { t: -162070.335, event: 'About now, on 1 June, the count stops at T−3 minutes: the last guidance update cannot be sent to the ship' },
    { t: 0, event: 'Liftoff, 08:39:33.335 EST on 3 June, on an azimuth of 87.4°' },
    { t: 18.42, event: 'Roll programme begins; complete at 20.42 s' },
    { t: 22.97, event: 'Pitch programme begins' },
    { t: 152.49, event: 'First stage cutoff; the second stage’s engine is signalled to start' },
    { t: 153.23, event: 'The stages begin to part' },
    { t: 339.79, event: 'Second stage cutoff' },
    { t: 366.72, event: 'The spacecraft cuts itself free. In orbit: 85.7 by 144.0 nautical miles' },
    { t: get(0, 49, 3), event: 'Phase adjustment: 74.8 ft/s' },
    { t: get(1, 55, 17), event: 'Corrective combination manoeuvre: 14.8 ft/s' },
    { t: get(2, 24, 52), event: 'Coelliptic manoeuvre: 53.4 ft/s' },
    { t: get(3, 36, 2), event: 'Terminal phase initiation: 28.4 ft/s' },
    { t: get(4, 6, 8), event: 'Braking begins. At about 1,000 ft the crew see that the shroud is still on the target' },
    { t: get(4, 15), event: 'First rendezvous: station keeping 60 ft from the ATDA, in the dark' },
    { t: get(5, 1), event: 'Radial separation, 20.0 ft/s, to begin an equi-period rendezvous' },
    { t: get(6, 15, 12), event: 'Terminal phase initiation for the second rendezvous: 2.1 ft/s' },
    { t: get(6, 36), event: 'Second rendezvous: station keeping until 7:14:58' },
    { t: get(7, 14, 58), event: 'Separation, 3.7 ft/s retrograde, to set up a rendezvous from above' },
    { t: get(19, 54, 24), event: 'Coelliptic manoeuvre for the third rendezvous: 14.4 ft/s' },
    { t: get(21, 2, 28), event: 'Terminal phase initiation: 18.0 ft/s, from above the target' },
    { t: get(21, 42), event: 'Third rendezvous: station keeping, at times within inches of the shroud' },
    { t: get(22, 59), event: 'The ship leaves the ATDA for the last time: 3 ft/s retrograde' },
    { t: get(49, 23), event: 'Cernan opens his hatch and stands up; he brings in the S-12 collector at 49:27' },
    { t: get(50, 9), event: 'Cernan enters the adapter, in the dark, to ready the backpack' },
    { t: get(50, 28), event: 'About now his visor begins to fog' },
    { t: get(50, 39), event: 'He backs into the Astronaut Maneuvering Unit' },
    { t: get(51, 3), event: 'Stafford declares the backpack no-go' },
    { t: get(51, 28), event: 'About now the hatch is shut: open 2 h 5 min' },
    { t: get(71, 45, 50), event: 'Equipment section cut away' },
    { t: get(71, 46, 44), event: 'Retrofire, in the forty-fifth revolution' },
    { t: get(72, 15, 48), event: 'Drogue parachute: 0.38 nautical mile from the planned point by the ship’s navigation' },
    { t: get(72, 17, 11), event: 'Main parachute' },
    { t: get(72, 20, 50), event: 'Landing in the western Atlantic, 3.5 nautical miles from USS Wasp' },
  ],
  specs: [
    ...LC19_SPECS,
    {
      group: 'Pressure suit',
      label: 'Stafford, in helmet and boots',
      value: 1.874,
      unit: 'm',
      confidence: 'estimated',
      note: 'the standing figure as built (crew/g4c_suit.py), on a man of 1.829 m: "6 feet" in the Gemini 7/6 press kit’s crew biographies (NASA release 65-362, p. 72), documented. The suit’s own thickness is estimated',
    },
    {
      group: 'Pressure suit',
      label: 'Cernan, in helmet and boots',
      value: 1.874,
      unit: 'm',
      confidence: 'estimated',
      note: 'the standing figure as built, on a man of 1.829 m: 6 ft, as commonly given, his stature not being in any NASA source read: estimated. The suit’s thickness and its covers’ are estimated',
    },
    ...dimensions(
      'documented',
      'SEDR 300 vol. 2, Figures 2-3 and 2-4, the manual that covers this ship',
      `the Gemini IX-A mission report’s Figure 3.0-1, "GLV - spacecraft relationships" (${GIX})`,
    ),
    {
      group: 'Spacecraft',
      label: 'Weight at launch',
      value: 8268 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `8,268 lb, "Launch, gross weight" (${GIX}, 3.3, p. 3-32)`,
    },
    {
      group: 'Spacecraft',
      label: 'Weight at retrofire',
      value: 5635 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `5,635 lb, "Retrograde" (${GIX}, 3.3, p. 3-32); at 0.05 g, 4,874 lb; at main parachute deployment, 4,475 lb`,
    },
    {
      group: 'Spacecraft',
      label: 'Weight at landing',
      value: 4364 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `4,364 lb, "Landing (no parachute)" (${GIX}, 3.3, p. 3-32)`,
    },
    {
      group: 'Spacecraft',
      label: 'OAMS propellant used',
      value: 700 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `"The total quantity of usable oxidizer and fuel was 336 and 343 pounds, respectively ... a total of 700 pounds of propellant were consumed. Fourteen pounds of propellant (at a mixture ratio of 0.7) remained" (${GIX}, p. 5-86). The two sentences do not add up as printed (679 lb usable, 700 used): the report counts some propellant it had classed as unusable`,
    },
    {
      group: 'Spacecraft',
      label: 'OAMS propellant tanks, across',
      value: 21.13 * IN,
      unit: 'm',
      confidence: 'documented',
      note: `two fuel tanks of 21.13 in and two oxidiser tanks of 21.12 in, and two tanks of helium: "two tanks on S/C 6, 8 & 9" of fuel, "two tanks on S/C 6, 8 & up" of oxidiser and helium (SEDR 300 vol. 2, Section VIII, Figure 8-96 sheet 1). Where the tanks stood is estimated`,
    },
    {
      group: 'Spacecraft',
      label: 'Fuel cell hydrogen',
      value: 5.8 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `"22.25 lbs for long mission configurations and 5.80 lbs for short mission configurations"; of oxygen, "46.0 lbs on spacecraft 8 and 9" (${SEDR2}, p. 5-33). The manual's figures for the type of mission, not this ship's loading record, which was not read`,
    },
    {
      group: 'Spacecraft',
      label: 'Index bar, travel',
      value: 13.82 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '"The extension cycle moves the indexing bar 13.82 in. from the retracted position to the fully extended position" (Project Gemini: A Technical Summary, NASA CR-1106, p. 241). Its station on the ship is scaled from the Gemini VIII mission report’s Figure 3.1-9: estimated',
    },
    {
      group: 'Spacecraft',
      label: 'Handrails',
      value: 46 * IN,
      unit: 'm',
      confidence: 'documented',
      note: `"The painted metal handrails were 0.55 by 1.25 inches in cross section. The forward handrail was 21 inches long ... The aft handrail was 46 inches long ... There was a 9-inch gap between the two sections ... 1.5 inches above the spacecraft surface when deployed" (${SP149}, p. 5-6); "The handbars were 1.38 in. in diameter". Where the rails are round the ship (12° right of the top) is scaled from the Gemini VIII mission report’s Figure 3.1-9: estimated`,
    },
    {
      group: 'Spacecraft',
      label: 'Astronaut Maneuvering Unit, height',
      value: 32 * IN,
      unit: 'm',
      confidence: 'documented',
      note: `32 in high, 22 in wide and 19 in deep (${KIT}, p. 22; ${TITANS}, Appendix D); 166 lb (${GIX}, Table 8.1-I, p. 8-27); twelve thrust chambers (8.1.3.1), of a nominal 2.3 lb (${SP149}, p. 6-28). It hung against a torque box between Z66.74 and Z56.27, turned 22.5° (${GIX}, Figure 8.1-18)`,
    },
    {
      group: 'Spacecraft',
      label: 'Perigee at insertion',
      value: 85.7 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `85.7 nautical miles, above the Fischer ellipsoid of 1960 (${GIX}, Table 4.3-IV, p. 4-34); planned 86.7`,
    },
    {
      group: 'Spacecraft',
      label: 'Apogee at insertion',
      value: 144.0 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `144.0 nautical miles (${GIX}, Table 4.3-IV); planned 148.6. At retrofire, in revolution 45, the orbit was 143.8 by 155.5`,
    },
    {
      group: 'Spacecraft',
      label: 'Period',
      value: 88.78 * 60,
      unit: 's',
      confidence: 'documented',
      note: `88.78 min at insertion; 90.19 min at retrofire (${GIX}, Table 4.3-IV)`,
    },
    {
      group: 'Spacecraft',
      label: 'Inclination',
      value: 28.91,
      unit: 'deg',
      confidence: 'documented',
      note: `28.91° (${GIX}, Table 4.3-IV); planned 28.88°`,
    },
    {
      group: 'Spacecraft',
      label: 'Radar lock on the ATDA',
      value: 130 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `"intermittent lock-on was obtained at a range of 130 nautical miles ... became solid at 120 nautical miles" (${GIX}, p. 7-23, read on the page: the text layer has 150); after the last separation, lock "in excess of 179 nautical miles" (p. 7-28)`,
    },
    {
      group: 'Spacecraft',
      label: 'First rendezvous, terminal phase initiation',
      value: get(3, 36, 2),
      unit: 's',
      confidence: 'documented',
      note: `03:36:02, 28.4 ft/s; before it, phase adjust 74.8 ft/s at 00:49:03, a corrective combination of 14.8 ft/s at 01:55:17 and the coelliptic manoeuvre of 53.4 ft/s at 02:24:52 (${GIX}, Tables 4.2-II and 4.3-III). Station keeping from 4:15:00 "at a separation distance of 60 feet" (p. 7-25)`,
    },
    {
      group: 'Spacecraft',
      label: 'Nearest to the target',
      value: 3 * IN,
      unit: 'm',
      confidence: 'documented',
      note: `on the third rendezvous "the distance was reduced to approximately 3 inches" (${GIX}, p. 7-28, read on the page); on the first, 20 ft in the dark and 10 ft after sunrise (p. 7-25)`,
    },
    {
      group: 'Spacecraft',
      label: 'Hatch open',
      value: get(2, 5),
      unit: 's',
      confidence: 'documented',
      note: `opened at "49 hours 23 minutes", closed at "approximately 51 hours 28 minutes ... open for a total of 2 hours and 5 minutes" (${GIX}, p. 1-3). ${CHRONOLOGY}’s Table D has 49:23 to 51:30, and ${SP149}, Table 3.0-I, 2 h 7 min`,
    },
    {
      group: 'Spacecraft',
      label: 'Backpack declared no-go, from liftoff',
      value: get(51, 3),
      unit: 's',
      confidence: 'documented',
      note: `"At 51:03:00 g.e.t., the command pilot declared a no-go condition for the AMU evaluation"; "the decision to abort was based entirely on visor fogging" (${GIX}, p. 8-23). The fogging began at "approximately 50 hours 28 minutes ... about 8 minutes after local sunset" (p. 5-95)`,
    },
    {
      group: 'Spacecraft',
      label: 'Retrofire, from liftoff',
      value: get(71, 46, 44),
      unit: 's',
      confidence: 'documented',
      note: `71:46:44, 15:26:17 G.m.t. on 6 June (${GIX}, p. 6-19); initiated at 71:46:43.7 (p. 5-87)`,
    },
    {
      group: 'Spacecraft',
      label: 'Duration, liftoff to landing',
      value: get(72, 20, 50),
      unit: 's',
      confidence: 'documented',
      note: `72:20:50 (${GIX}, Table 4.2-II; ${CHRONOLOGY}); 45 revolutions`,
    },
    {
      group: 'Spacecraft',
      label: 'From the planned point, at drogue deployment',
      value: 0.38 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `"The position of the spacecraft at drogue parachute deployment was 0.38 nautical mile west of the planned landing point measured by radar-corrected IGS data. The landing point as reported by the recovery forces was 2.3 nautical miles west of the planned landing point" (${GIX}, p. 5-26). ${CHRONOLOGY} gives 0.38 as the landing’s miss. Aiming point 27°52′ N 75°00′ W; landing 27°52′ N 75°02.8′ W (Figure 6.3-7)`,
    },
    {
      group: 'Launch vehicle',
      label: 'Launch azimuth',
      value: 87.4,
      unit: 'deg',
      confidence: 'documented',
      note: `"Roll program start (launch azimuth = 87.4 deg)" (${GIX}, Table 4.2-I); "a biased launch azimuth of 87.4 degrees" (p. 6-5)`,
    },
    {
      group: 'Launch vehicle',
      label: 'Weight at liftoff, with the spacecraft',
      value: 340732 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `340,732 lb at liftoff; 344,225 lb at ignition, 86,224 lb at first stage burnout, 14,222 lb at second stage cutoff (${GIX}, 3.3, p. 3-31, from the launch vehicle's contractor)`,
    },
    ...atdaDimensions(),
    {
      group: TARGET_GROUP,
      label: 'ATDA, weight at launch',
      value: 2006 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `"Launch, gross weight 2 006" lb; its weights at separation and in orbit are "Not available because shroud did not jettison" (${GIX}, 3.6, p. 3-39)`,
    },
    {
      group: TARGET_GROUP,
      label: 'ATDA, orbit',
      value: 161.5 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `161.5 by 158.5 nautical miles, 28.91°, 90.58 min (${GIX}, Table 4.3-VII, p. 4-38)`,
    },
    {
      group: TARGET_GROUP,
      label: 'ATDA’s liftoff before the spacecraft’s',
      value: 167970.972,
      unit: 's',
      confidence: 'derived',
      note: `1 day 22 h 39 min 30.972 s: from 15:00:02.363 G.m.t. on 1 June (${GIX}, Table 4.2-III) to 13:39:33.335 on 3 June (Table 4.2-I). From Complex 14, on Atlas SLV-3 No. 5304`,
    },
  ],
  motors: [
    ...titanEngines(
      {
        burnS: 152.49 + 3.14,
        // the burn is this vehicle's; the thrust is the type's nominal
        confidence: 'assumed',
        note: `a combined ${lb(2 * THRUST.stage1Chamber.value)} lb of thrust for the two is the Gemini Launch Vehicle's nominal (${KIT}), taken for GLV-9. The burn is this flight's: ignition signal 3.14 s before liftoff, shutdown 152.49 s after (${GIX}, Table 4.2-I)`,
      },
      {
        burnS: 339.79 - 152.48,
        confidence: 'assumed',
        note: `${lb(THRUST.stage2.value)} lb of thrust at altitude is the type's nominal, taken for GLV-9. The burn is this flight's: ignition signal 152.48 s and shutdown 339.79 s after liftoff (${GIX}, Table 4.2-I)`,
      },
    ),
    ...thrusters('spacecraft 9, whose propulsion its report records as the same as spacecraft 8’s'),
    ...atdaMotors(),
  ],
  models: [vehicle, pad, crew, pilot],
  // the place round the pad as it stood that June: as in March 1965 (places/cape-canaveral/lc19/model/1965-03.py)
  surroundings: 'models/usa/places/cape-canaveral/lc19/1965-03.glb',
};

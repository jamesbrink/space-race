import type { Flight } from '../../../../../src/types.ts';
import { LC19 } from '../../../places/cape-canaveral/lc-19.ts';
import { LC19_SPECS, lc19Vehicle } from '../../../places/cape-canaveral/lc-19.parts.ts';
import { g4cParts, standing } from '../../crew/g4c-suit.parts.ts';
import {
  BASE,
  CHRONOLOGY,
  FT,
  GVIII,
  IN,
  LB,
  LEFT_AZ,
  NMI,
  SEDR2,
  SP149,
  TOP_AZ,
  along,
  cabin,
  dimensions,
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
  AGENA,
  AGENA_TARGET,
  agenaDimensions,
  agenaMotors,
  agenaParts,
  TARGET_GROUP,
  type TargetWords,
  withTarget,
} from '../../vehicles/gemini-targets.ts';

/** Hours, minutes and seconds of ground elapsed time, as seconds from liftoff. */
const get = (h: number, m: number, s = 0) => h * 3600 + m * 60 + s;

// What was read for this flight: README.md, "Sources". The mission report is quoted by section, table and printed page.
const KIT = 'NASA release 66-52, the Gemini 8 press kit (8 March 1966)';
/** Where the two handrails are round the ship, degrees from its top (vehicles/gemini_spacecraft.py `HANDRAILS`: estimated). */
const HANDRAIL_AZ = 12;

const parts: PartWords[] = [
  {
    node: 'NoseFairing',
    name: 'Nose fairing',
    summary: 'A glass-fibre cap over the ship’s forward face, where everything a docking needs was.',
    detail:
      'The forward section ends in a flat face, and going up through the air it wants a cover. This one is laminated ' +
      'glass fibre, 5.31 in deep, and it is the tip of the whole vehicle. Under it on this ship were the four ' +
      'antennas of the rendezvous radar and, round the rim, three latch receptacles for an Agena’s hooks to catch, ' +
      'which the fairing shields on the way up. On the ships before, it was thrown off in the climb with the ' +
      'scanners’ fairing. This crew kept both a while longer than usual and let them go seven and a half minutes ' +
      'after liftoff, in orbit. Its size is McDonnell’s drawing.',
    facts: [
      ['Depth', '5.31 in (0.13 m): Z233.97 to Z239.28'],
      ['Material', 'glass fibre reinforced plastic laminate'],
      ['Under it', 'the rendezvous radar and three docking latch receptacles'],
      ['Thrown off', '7 min 30 s after liftoff'],
    ],
  },
  {
    node: 'RendezvousRecovery',
    name: 'Rendezvous and recovery section',
    summary: 'The nose that went into an Agena’s cone at 6 h 33 min 16 s: the first docking of two vehicles in orbit.',
    detail:
      'The forward 42 inches: beryllium shingles, black outside, over a titanium frame, with the parachutes inside ' +
      'and on its face what a ship needs to find another and join it. Four spiral antennas are the radar: it first ' +
      'heard the Agena’s transponder at 3 hours 27 minutes and had it solidly from 181 nautical miles. Round the ' +
      'rim are three latch receptacles, a third of a turn apart. At the top is the index bar, a steel rod in a ' +
      'casing across the section, which a cartridge drives 13.82 in out of the skin once the ship is in orbit. ' +
      'Coming in, Armstrong lined the bar up with a V-shaped notch in the top of the Agena’s cone; the notch took ' +
      'it and turned the ship the last few degrees, and three hooks in the cone’s throat dropped behind the three ' +
      'receptacles. Six seconds later the Agena had drawn the ship in and the two were one vehicle. "Flight, we ' +
      'are docked," Armstrong reported. "It’s really a smoothie." On the middle of the face is a ring for a tether, for the man who was ' +
      'to have gone outside. When the main parachute comes out this whole section is pulled off and lost. The ' +
      'bar is built drawn in, as it left the pad, and runs out at the end of the slider. Its travel is ' +
      'documented; the radar’s antennas are sized from the sketch of spacecraft 5’s, the receptacles are scaled ' +
      'from McDonnell’s figure, and the tether ring is not built.',
    facts: [
      ['Length', '42.00 in (1.07 m)'],
      ['Skin', 'unbeaded beryllium shingles'],
      ['Radar', '4 spiral antennas: solid lock at 181 nautical miles'],
      ['Index bar', 'runs out 13.82 in; stowed at launch'],
      ['Docking fittings', '3 latch receptacles, equally spaced'],
      ['Docked', '6 h 33 min 16 s after liftoff; rigid 6 s later'],
      ['Main parachute', 'ring-sail, 84.2 ft, in a container 22.25 by 21.32 in'],
    ],
    // A part with moves is not slid by the slider itself (viewer/explode.ts): its own lift is the first of them, over
    // the stretch a part of its order takes (6 of 12: a quarter to three quarters), and then the index bar runs out of
    // its casing, on RR_IndexBar, whose origin is on the skin where it comes out (vehicles/gemini_spacecraft.py
    // build_index_bar). Its travel is documented
    moves: [
      { kind: 'slide', by: [0, 8.2, 0], from: 1 / 4, to: 3 / 4 },
      { kind: 'slide', node: 'RR_IndexBar', by: along(TOP_AZ, 0, 13.82 * IN), from: 0.78, to: 0.9 },
    ],
    functions: [{ nodes: ['RR_IndexBar'], name: 'Index bar', ends: ['Stowed', 'Extended'], seconds: 3 }],
  },
  {
    node: 'ReentryControl',
    name: 'Re-entry control system section',
    summary: 'Sixteen small thrusters for the way home. On this flight they stopped a spin of nearly a turn a second.',
    detail:
      'Eighteen inches of cylinder between the cabin and the forward section. Everything that steers the ship in ' +
      'orbit is in the adapter, and the adapter is thrown away before the ship comes home; from then to the ' +
      'parachute it is steered by this. There are two rings of eight thrust chambers of 25 lbf, each ring with its ' +
      'own fuel, oxidiser and nitrogen, so that either alone is enough. It is not meant to be touched until ' +
      'retrofire. At 7 hours 16 minutes 25 seconds, with a thruster in the adapter stuck open, the ship turning ' +
      'at 296 degrees a second and both men’s sight going, Armstrong shut the manoeuvring system off and opened ' +
      'both rings. Nothing answered at first. Then it did: the first chamber fired at 7:19:04, the turning was ' +
      'under control by 7:25:30, and one ring was shut down again after 80 seconds of firing to keep it for the ' +
      'way home. About half the propellant had gone. The rule was that a ship which has had to use this system ' +
      'lands at the next place it can, and Gemini VIII did, three revolutions later. Which chamber fires which ' +
      'way is McDonnell’s drawing; where the clusters stand is read off a photograph of spacecraft 3.',
    facts: [
      ['Length', '18.00 in (0.46 m)'],
      ['Diameter', '38.66 in (0.98 m)'],
      ['Thrust chambers', '16 × 25 lbf, in two rings of 8'],
      ['Opened', '7 h 16 min 25 s; rates under control at 7 h 25 min 30 s'],
      ['Fired', 'A ring 79.7 s; B ring 306.4 s in 126 pulses'],
      ['Left before retrofire', '25 lb in one ring, 9 lb in the other: about half'],
    ],
  },
  {
    node: 'Hatches',
    name: 'Hatches',
    summary: 'Two doors with a window each. The pilot’s was to have been opened on the second day, and was not.',
    detail:
      'Each man has a hatch over him, hinged along its outboard edge and held down by twelve latches, skinned in the ' +
      'same beaded shingles as the cabin. The window is at the hatch’s forward end and is not in the skin: the ' +
      'outer pane stands at about 35° to the hatch, so that it faces forward, and ahead of it a trough is cut into ' +
      'the cone for the pilot to look along. On this ship each hatch was given a ratchet to hold it part open, and ' +
      'the left one the closing gear the right had, so that a man could go out or come in by either. Scott was to ' +
      'have opened his at 20 and a half hours and spent more than two hours outside. A package of experiment S-3 ' +
      'rode on each hatch. The pane’s angle is McDonnell’s drawing; where the windows and the hatches’ edges lie ' +
      'is read off photographs of spacecraft 3, to about two inches. The ratchets, the closing gear and the ' +
      'packages are not modelled.',
    facts: [
      ['Number', '2, hinged on the outboard side'],
      ['Latches', '12 to a hatch'],
      ['Windows', 'an outer pane and two inner, at 35° to the hatch'],
      ['Window opening', 'about 14.8 in across and 8.5 in fore and aft'],
      ['Opened in flight', 'no: the walk outside was not made'],
    ],
  },
  {
    node: 'ScannerFairing',
    name: 'Horizon scanner fairing',
    summary: 'A bronze-coloured cover over the infrared eyes that find the horizon, thrown off in orbit.',
    detail:
      'On the ship’s left side at the neck, two infrared scanners look out for the edge of the Earth and tell the ' +
      'ship which way is down. They would not survive the climb through the air uncovered, so a fairing sits over ' +
      'them, and it is thrown off with the nose fairing: on this flight seven and a half minutes after liftoff, ' +
      'later than usual, by the crew’s choice. Its size and place are read off a colour photograph of spacecraft ' +
      '3 on the morning it flew, and taken to be the same here.',
    facts: [
      ['Covers', 'the horizon scanners, on the left side'],
      ['Lies', 'from Z166.5 to Z190.5, about two feet'],
      ['Thrown off', '7 min 30 s after liftoff, with the nose fairing'],
    ],
  },
  {
    node: 'Cabin',
    name: 'Cabin section',
    summary: 'Beaded shingles of René 41 over a titanium frame, with patches of Velcro for a man outside to hold by.',
    detail:
      'A cone 70.53 in long at 20° to its axis, 90 in across the heat shield and 38.66 in across the neck. The skin ' +
      'is shingles of René 41, a nickel alloy, pressed into short beads that lie round the cone one after another, ' +
      'in cells between rows of fasteners: they stiffen the sheet and let it grow when hot, and it is black outside ' +
      'so that it radiates. The shingles are not the pressure vessel: that is a welded titanium box inside, and the ' +
      'room between its flat sides and the cone is equipment bays. For this flight patches of Velcro hook were ' +
      'bonded to the outside a foot apart, in a line forward from the right hatch to the docking bar and round ' +
      'both ends of the adapter: handholds for a man wearing pads of Velcro pile on his gloves. NASA allowed no ' +
      'names on its Geminis after the first, and this one had none. UNITED STATES and the flag are drawn as ' +
      'spacecraft 3 wore them; no photograph of this ship has been read closely enough to check them, and the ' +
      'Velcro is not modelled.',
    facts: [
      ['Length', '70.53 in (1.79 m)'],
      ['Half-angle', '20°'],
      ['Skin', 'beaded René 41 shingles, black'],
      ['Paint', 'UNITED STATES and the flag: as spacecraft 3, assumed'],
      ['Velcro', 'patches a foot apart, for handholds: not modelled'],
      ['Name', 'none'],
    ],
  },
  {
    node: 'CrewStation',
    name: 'Crew station',
    summary: 'Where Armstrong and Scott sat through a docking, a tumble and a landing half a world from the ships.',
    detail:
      'Two men sit as in an aeroplane, the command pilot on the left, in pure oxygen at about 5 psi, each with a ' +
      'window before him and a hatch over him. The plan was three days: four dockings, firings of the Agena’s ' +
      'engines with the ship on its nose, and a walk outside of more than two hours for Scott. They had the first ' +
      'docking. Twenty-seven minutes after it, on the night side and out of touch with the ground, the pair began ' +
      'to roll. They took it for the Agena, which was new, and when switching the Agena off did not hold, ' +
      'undocked; the ship then spun faster, to nearly a turn a second. "We have serious problems here," Scott ' +
      'told the tracking ship Coastal Sentry Quebec. "We’re tumbling end over end up here." Armstrong got the ship still ' +
      'on its re-entry thrusters, and ten hours and 41 minutes after liftoff it was down in the Pacific. The ' +
      'panels are drawn from McDonnell’s drawing of spacecraft 3’s, with the two clocks the later ships added. ' +
      'What this ship added is not drawn: the panel that commanded the Agena, two switches for the docking cone, ' +
      'a panel for the tape unit that reloaded the computer, the fuel cells’ monitor. The chest pack for the man ' +
      'going outside was stowed between the seats and is not modelled. The seats are empty: both men wore the G4C ' +
      'suit, which is modelled standing, at the foot of the erector, and not seated. No drawing read gives the pressure vessel’s dimensions: its sizes are those ' +
      'fitted round the crew of spacecraft 3.',
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
      'adapter, out of sight until the last of the adapter is cut away after retrofire. On this flight that was ' +
      'in the seventh revolution, with the landing aimed at a part of the western Pacific that had one destroyer ' +
      'on station. The ship came down less than 7 nautical miles from the point planned. A flotation collar was ' +
      'round it within 45 minutes, and the Leonard F. Mason reached it about three hours after it landed. The station taken here ' +
      'for the shield’s crown is one of SEDR 300’s that the drawing does not name.',
    facts: [
      ['Diameter', '90.00 in (2.29 m)'],
      ['Spherical radius', '144 in (3.66 m)'],
      ['Material', 'silicone-filled glass-fibre honeycomb'],
      ['Landing', '10 h 41 min 26 s after liftoff, about 25°14′ N 136° E'],
      ['From the planned point', 'less than 7 nautical miles'],
    ],
  },
  {
    node: 'RetroSection',
    name: 'Adapter: retrograde section',
    summary: 'Four solid rockets for coming home, the ship’s headlight, and the forward half of a road to its back.',
    detail:
      'The upper two fifths of the white adapter, from station Z68.44. Inside, on a cross of aluminium I-beams, are ' +
      'four solid rockets in titanium balls about 13 in across, each of about 2,500 lbf for five and a half seconds, ' +
      'fired one after another; at 10 hours 4 minutes 47 seconds the first of them lit. In its skin are six ' +
      'thrusters of the manoeuvring system: two that fire forward, which braked the ship as it came up to the ' +
      'Agena and backed it out of the cone when it had to leave, and four that push it sideways, up and down. At ' +
      'the forward end, on top, is the docking light, a lamp of 4,000 candlepower over the crew’s heads, and ' +
      'behind it a smaller one that looks aft. That one is for the man outside, and so is the rail beside it: ' +
      'two rails lie along the adapter behind the right hatch, flush with the skin at launch, 21 in of rail on ' +
      'this section and 46 on the next, and spring out an inch and a half in orbit. Behind the hatch is the ' +
      'package of experiment S-9, a block of photographic emulsion in a well in the skin, which Scott was to ' +
      'have brought in. One of the ship’s two water tanks is in here, because this section stays on until ' +
      'retrofire. The rails’ sizes are documented and their place is scaled from the report’s plan of the ship; ' +
      'the lights’ forms are estimated. A mount for a film camera behind the hatch, and the aerial of an ' +
      'experiment on the centreline, are not modelled.',
    facts: [
      ['Retrograde rockets', '4 × about 2,500 lbf, 5.5 s each'],
      ['First fired', '10 h 4 min 47 s after liftoff'],
      ['Forward thrusters', '2 × 85 lbf: fired 6.6 s to undock'],
      ['Lateral thrusters', '4 × 100 lbf'],
      ['Docking light', '4,000 candlepower, centred over the crew’s heads'],
      ['Forward handrail', '21 in long, 0.55 by 1.25 in, stands out 1.5 in'],
      ['Water tank B', '42 lb capacity; 36 lb of drinking water at launch'],
      ['Experiment S-9', 'nuclear emulsion, 8.5 × 6 × 3 in, behind the right hatch'],
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
    summary: 'Fuel cells, twice the propellant, and the one thruster in sixteen that stuck open.',
    detail:
      'The lower three fifths of the adapter, 10 ft across at the foot. This ship had the fuel cells of the ' +
      'fortnight’s flight with the small tanks of a three-day one: two sealed sections, 5.8 lb of hydrogen and ' +
      '46 lb of oxygen, hung under a beam with the oxygen between the two sections. Opposite them, under the other ' +
      'beam, are the manoeuvring system’s tanks, two of fuel, two of oxidiser and two of helium, with a small ' +
      'reserve tank of fuel as spacecraft 7 had: 420 lb of oxidiser and 347 lb of fuel at launch. Round the foot ' +
      'are ten of the system’s sixteen thrusters. No. 8 is one of the eight small ones there, and at 7 hours 0 ' +
      'minutes 27 seconds its valves opened and stayed open, most likely through a short circuit in its wiring, ' +
      'which was never run to earth because this section burned up. In 25 minutes that thruster and the ones ' +
      'fighting it used some 200 lb of propellant. Across the foot is the gold cover, made again for this flight: ' +
      'it is gathered to an oblong opening in the middle, behind whose thermal cover the backpack hangs, with two ' +
      'hand bars and a foot rail folded flat against the cloth for the man who was to put it on. Along the ' +
      'outside lies the aft handrail, 46 in long. Which side each module stands on is McDonnell’s drawing, and ' +
      'so is the order of the fuel cell module’s row; the tanks’ loads are his manual’s and the rails’ sizes ' +
      'NASA’s; each thing’s exact place is estimated. The tape memory unit, a box of 26 lb somewhere in this ' +
      'section, is not modelled.',
    facts: [
      ['Base diameter', '120.00 in (3.05 m)'],
      ['Power', '2 fuel cell sections; 5.80 lb of hydrogen, 46.0 lb of oxygen'],
      ['OAMS tanks', '2 of fuel, 2 of oxidiser, 2 of helium, and a reserve fuel tank'],
      ['OAMS propellant', '420.0 lb oxidiser and 346.6 lb fuel loaded; 563 lb used'],
      ['Thruster No. 8', 'stuck open at 7 h 0 min 27 s; fired 900 s in all'],
      ['Water tank A', '42 lb capacity: went up holding nitrogen'],
      ['Aft handrail', '46 in long; springs out as the ship leaves the Titan'],
      ['Cut away', '10 h 3 min 48 s after liftoff'],
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
    node: 'ExtravehicularSupportPackage',
    group: 'Spacecraft',
    inside: true,
    name: 'Extravehicular support package',
    summary: 'A backpack of oxygen and Freon at the back of the adapter, for a walk that was never taken.',
    detail:
      'Edward White had gone outside on Gemini IV at the end of a hose from the cabin, with a gas gun that ran out ' +
      'in four minutes. Scott was to do it properly. On the second day he was to open his hatch, go aft along the ' +
      'handrail to the back of the adapter, stand on the foot rail there in the dark, and back into this: a pack ' +
      '26 in high, 21 wide and 17 deep, 92 lb, with 7 lb of oxygen to breathe and 18 lb of Freon to feed the gun ' +
      'in his hand. With it on he would let the ship’s hose go and be joined to the ship by 75 ft of tether, for ' +
      'up to eighty minutes. Armstrong would undock and fly the ship to him. The pack hangs in the middle of the ' +
      'equipment section on a torque box under the blast shield’s door, behind a thermal cover that closes the ' +
      'opening in the gold cloth; a switch in the cabin was to throw the cover off and spring out the hand bars. ' +
      'None of it was used. The pack went with the equipment section when that was cut away, ten hours after it ' +
      'left the pad. Its size, weight and what it held are documented; that it hung as the next ship’s ' +
      'pack did is assumed; its form is drawn from the report’s sketch of it and is estimated.',
    facts: [
      ['Size', '26 in high, 21 in wide, 17 in deep'],
      ['Weight', '92 lb'],
      ['Oxygen', '7 lb, at 5,000 psi: 80 minutes at 5.1 lb an hour'],
      ['Freon 14', '18 lb, for the hand-held manoeuvring unit: about 2 lbf for 200 s'],
      ['Tether', '75 ft, with a radio in the pack as well'],
      ['Used', 'no'],
    ],
    explode: [0, 0.5, 0],
    order: 12,
  },
  {
    node: 'TitanStage2',
    name: 'Second stage',
    summary: 'Two tanks and the guidance between them. It had 41 minutes of an Agena’s orbit to aim for, and hit it.',
    detail:
      'Ten feet across, like the first stage, and built the same way: the tanks’ walls are the vehicle’s skin. ' +
      'Oxidiser is above fuel, and between the two tanks are the trusses that carry what flies the vehicle: radio ' +
      'guidance, a second flight control system able to take over from the first, and a malfunction detection ' +
      'system that told the crew what their booster was doing. The forward skirt is bare metal. The Agena had ' +
      'gone up from Complex 14 an hour and 41 minutes before, and this vehicle had to leave within a few seconds ' +
      'of the moment that put its ship in the Agena’s plane and 1,060 nautical miles behind it. It left at ' +
      '16:41:02.389 G.m.t. on an azimuth of 99.9°, and the stage cut off 337.54 seconds later: the orbit was 86.3 ' +
      'by 146.7 nautical miles, a third of a mile low at the bottom and a little over a mile high at the top.',
    facts: [
      ['Diameter', '10 ft (3.05 m)'],
      ['Propellants', 'nitrogen tetroxide and Aerozine 50'],
      ['Forward skirt', '22.3 in, bare'],
      ['Cut off', '337.54 s after liftoff'],
      ['Launch azimuth', '99.9°'],
      ['Telemetry antenna cutouts', 'two, where GLV-6 had four'],
    ],
  },
  {
    node: 'TitanStage2Engine',
    name: 'Second stage engine',
    summary: 'One chamber of 100,000 lbf, lit before the stages part, with a new injector.',
    detail:
      'An Aerojet YLR91-AJ-7, hung on a gimbal under the fuel tank and, until staging, inside the top of the first ' +
      'stage. Its propellants ignite on meeting, so it has no igniter and can be started at altitude without ' +
      'ceremony. Its bell is tubes cooled by the fuel as far as half its width, and below that an ablative skirt. One ' +
      'engine cannot roll the stage, so the gas that has driven its pumps is let out through a small swivelling ' +
      'nozzle, and that is the roll control. This vehicle’s engine was the first to fly with a new injector, with ' +
      'baffles in it whose tips are cooled, the outcome of a programme to make sure the chamber could not start ' +
      'to burn roughly. It was signalled to start 154.61 seconds after liftoff and shut down at 337.54. The ' +
      'engine’s place is documented, and so are the two expansion ratios, 13 and 49.2, that put the joint in its ' +
      'bell where it is; the bell’s size is computed from them, and the rest of its form is representative.',
    facts: [
      ['Thrust', 'about 100,000 lbf at altitude (445 kN)'],
      ['Engine', 'Aerojet YLR91-AJ-7, with the stability programme’s injector'],
      ['Burned', '154.61 s to 337.54 s after liftoff'],
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
      'ports at the foot. On this flight the start signal came at 154.61 seconds and the stages began to part at ' +
      '155.29. The black and white panels are the roll pattern: the cameras that followed the vehicle could see ' +
      'from them whether it was turning. The pattern is drawn as GLV-3’s: no photograph of this vehicle has been ' +
      'read closely enough to check it.',
    facts: [
      ['Stages part at', 'station 500, its upper edge'],
      ['Staging', '"fire in the hole": engine start before separation'],
      ['Paint', 'eight panels, black on the diagonals: as GLV-3, assumed'],
      ['Stages began to part', '155.29 s after liftoff'],
    ],
  },
  {
    node: 'TitanStage1',
    name: 'First stage',
    summary: 'Seventy feet of tank that left Complex 19 an hour and 41 minutes after its target left Complex 14.',
    detail:
      'Oxidiser tank above, fuel tank below, and the oxidiser’s feed line running down through the middle of the ' +
      'fuel. Nothing is cryogenic: nitrogen tetroxide and a hydrazine blend keep at ordinary temperatures, so the ' +
      'vehicle could stand loaded and go at a chosen second, which a rendezvous needs. On 16 March the two ' +
      'counts ran side by side, as they had on the day the first Agena was lost, and this time both vehicles ' +
      'flew. The wall is bare aluminium down to the splice between the tanks, white below that, then black, ' +
      'with the roll pattern at the foot, and UNITED STATES down the bare metal: drawn as GLV-3 wore it, which no ' +
      'photograph of this vehicle has been read closely enough to confirm.',
    facts: [
      ['Length with its engines', '848.1 in (21.54 m)'],
      ['Diameter', '10 ft (3.05 m)'],
      ['Lettering', 'UNITED STATES, upright letters, one side: as GLV-3, assumed'],
      ['Weight at liftoff, with the spacecraft', '341,671 lb'],
      ['Weight at first stage burnout', '85,276 lb'],
    ],
  },
  {
    node: 'TitanStage1Engine',
    name: 'First stage engine',
    summary: 'Two chambers on one frame: 430,000 lbf for 154.61 seconds.',
    detail:
      'An Aerojet YLR87-AJ-7: two thrust chambers, each with its own turbopump, on a single frame hung from four ' +
      'longerons under the fuel tank, in the open. It was signalled to light 3.39 seconds before liftoff and shut ' +
      'down at 154.61, nine tenths of a second later than planned; by then the vehicle was 34 nautical miles up ' +
      'and moving at 9,920 ft a second. Its length and gimbal station are ' +
      'documented; its bells are sized from published ratios and its form is representative.',
    facts: [
      ['Thrust', 'about 430,000 lbf at liftoff (1,913 kN)'],
      ['Engine', 'Aerojet YLR87-AJ-7, two chambers'],
      ['Length', '123.04 in (3.13 m)'],
      ['Burned', '−3.39 s to 154.61 s'],
      ['At cutoff', '208,893 ft and 9,920 ft/s'],
    ],
  },
];

// The target: what this flight says of its own vehicle's parts. Where each stands and how it comes apart, and the words
// of the parts that were the same on every target, are the type's (vehicles/gemini-targets.ts `agenaParts`)
const target: TargetWords[] = [
  {
    node: 'DockingCone',
    summary: 'What Armstrong flew the ship’s nose into at 6 h 33 min 16 s: the first docking of two vehicles in orbit.',
  },
  {
    node: 'MooringLatches',
    summary: 'Three hooks in the cone’s throat. They caught at 6:33:16, and let go at 7:15:12 with the pair rolling.',
  },
  {
    node: 'TargetDockingAdapter',
    name: 'Agena: target docking adapter',
    summary: 'McDonnell’s collar on the Agena’s nose: a cone on dampers that took the ship’s nose, and held it.',
    detail:
      'The Agena is Lockheed’s; this, bolted to its front, is McDonnell’s, and is the other half of the ship’s own ' +
      'nose. A cone floats on seven dampers inside a short cylinder of bare aluminium. In the top of the cone is ' +
      'a V-shaped notch for the ship’s index bar, and in its throat three hooks. When the hooks have caught, a ' +
      'motor draws the cone six inches back until it is hard against the cylinder, and the two vehicles are ' +
      'rigid; run the other way, it lets the ship go. Over the notch three small panels face the crew: lamps, ' +
      'two clocks and a dial that say whether the Agena’s engines are armed, how much they have left, whether ' +
      'the cone is rigid. At its edge are two flashing lights to find it by in the dark, and from its top a boom ' +
      'runs out 85 in with the third antenna of the transponder that answered the ship’s radar. On its skin, in ' +
      'line with the upper light, is a package of experiment S-10 that Scott was to have opened. It is built with ' +
      'the cone run out, as it waited. The adapter’s length, the cone’s travel and the boom’s height are ' +
      'documented. No drawing read gives the cone’s size: its mouth is scaled from a photograph Gemini VIII’s ' +
      'crew took, and its depth worked from where the ship’s nose is known to end up.',
    facts: [
      ['Adapter shell', '23.8 in long, 60 in across, bare aluminium'],
      ['Cone', 'about 54 in across the mouth: estimated; black outside'],
      ['Travel', '6.0 in, drawn in by the mooring drive'],
      ['Latch hooks', '3'],
      ['Dampers', '7: 4 along, 3 across'],
      ['Acquisition lights', '2, flashing 55 times a minute on this vehicle'],
      ['Antenna boom', 'about 85 in'],
      ['Rigid', '6.9 s after the ship engaged'],
    ],
  },
  {
    node: 'AgenaForwardSection',
    name: 'Agena: forward section',
    summary: 'The Agena’s brain: gyros, horizon sensors, batteries, and a memory for the commands it was sent.',
    detail:
      'Fifty-eight inches behind the docking adapter: a rack of 17.5 in that the adapter is bolted to, and the ' +
      'standard Agena’s forward section. Here are the gyros and the two infrared horizon sensors that hold the ' +
      'vehicle level, nose forward, the batteries, and the command system: a receiver, and a programmer that ' +
      'can store a list of orders to carry out later. The crew of a docked Gemini could send it orders through ' +
      'the docking adapter, and the ground could by radio. On this flight the ground had more use of it than the ' +
      'crew. After Gemini VIII left, controllers made ten manoeuvres with its two propulsion systems, and it took ' +
      '5,439 commands in all, 45 of them from the spacecraft. The sections’ lengths are documented. The paint is read off ' +
      'the photographs taken from the spacecraft: white, with a bare band, black panels and a flag, on the side ' +
      'the camera saw, and taken to be the same on the other. What is inside is placed by guess.',
    facts: [
      ['Auxiliary rack', '17.5 in, station 229.50 to 247.00'],
      ['Forward section', '40.5 in, station 247.00 to 287.5'],
      ['Horizon sensors', '2, either side of the Earth side'],
      ['Running lights', 'green and red, 35° either side of the top'],
      ['Weight in orbit', '7,116 lb, the whole vehicle'],
    ],
  },
  {
    node: 'AgenaTankSection',
    name: 'Agena: tank section',
    summary: 'Eight feet of bare aluminium that is the wall of both tanks.',
    detail:
      'One cylinder, five feet across, with fuel in its forward half and oxidiser in its after half, their ends ' +
      'half-balls that stand out beyond the section at both ends: 129.08 in over the two, in a section of 96.5. ' +
      'The fuel is unsymmetrical dimethylhydrazine and the oxidiser nitric acid, which light on meeting. At ' +
      'launch the vehicle weighed 18,097 lb, and most of that was in here; it burned the greater part getting ' +
      'into a circle 161 nautical miles up, and reached orbit weighing 7,116 lb, with enough left to be fired ' +
      'again and again. Two fairings run along the outside for the wires and pipes that cannot go through a ' +
      'tank. It was left bare: the crew’s photographs show polished metal in panels, with the upper fairing ' +
      'dark. The lengths are documented; where the bulkhead between the tanks is, is a guess.',
    facts: [
      ['Length', '96.5 in, station 287.5 to 384'],
      ['Tanks, over their ends', '129.08 in'],
      ['Propellants', 'unsymmetrical dimethylhydrazine and nitric acid'],
      ['Weight at launch', '18,097 lb, the whole vehicle'],
      ['Finish', 'bare aluminium: by photograph'],
    ],
  },
  {
    node: 'AgenaAftSection',
    name: 'Agena: aft section',
    summary: 'An open rack round the engine, with two small rocket packs on its sides and gas for steering.',
    detail:
      'Going up, this part was inside a skin as wide as the tanks, which joined the Agena to its Atlas and stayed ' +
      'with the Atlas. In orbit what is left is a cone under a white shield and, behind it, an open frame about ' +
      '30 in one way and 46 the other. On each side of the frame is a secondary propulsion module, added to the ' +
      'Agena for Gemini: its own tanks and two chambers firing aft, one of 200 lb for small changes of orbit ' +
      'and one of 16 lb to settle the main tanks’ propellant before the big engine is lit. On the top and bottom ' +
      'are spheres of nitrogen for six gas jets at the tail, which turn the vehicle when no engine is burning. ' +
      'With a ship docked, those jets and the ship’s thrusters were both steering one body, which is why ' +
      'Armstrong and Scott first blamed the Agena for the roll. The rack’s stations and the thrusts are ' +
      'documented; its width, the modules’ size and the spheres’ places are scaled from Lockheed’s drawings and ' +
      'from a photograph.',
    facts: [
      ['Parted from the Atlas’s adapter at', 'station 385.4'],
      ['Rack', 'station 411.86 to 462.5; about 30 by 46 in: estimated'],
      ['Secondary propulsion', '2 modules, each 200 lbf and 16 lbf'],
      ['Attitude jets', '6 × 10 lbf, nitrogen'],
      ['Nitrogen spheres', '2 of 2,200 cu in, and an auxiliary'],
    ],
  },
  {
    node: 'AgenaEngine',
    name: 'Agena: main engine',
    summary: 'A Bell 8247 of 16,000 lbf that could be started again in orbit, with a crew docked to it.',
    detail:
      'One chamber on a gimbal, fed by a turbopump. It is the Agena’s ordinary engine altered to start many ' +
      'times: small tanks, filled again from the main ones after each burn, spin the pump up where the ordinary ' +
      'engine uses a solid charge that is good for one start. Its bell is in two parts, the upper cooled by the ' +
      'oxidiser, the lower a shell of titanium that glows, stiffened outside by hoops and stringers. The engine ' +
      'of the Agena before this one had failed as it started, over the Atlantic, with Schirra and Stafford ' +
      'waiting on their pad; for this vehicle the start was changed so that oxidiser reached the chamber ' +
      'before fuel. It lit 377.5 seconds after the Atlas left the ground and burned for three minutes. The plan ' +
      'had it burning again with Gemini VIII on its nose. That was done on later flights. Its thrust and make ' +
      'are documented; its size is scaled from Lockheed’s drawings and a photograph, about 33 in across the exit.',
    facts: [
      ['Thrust', '16,000 lbf (71 kN)'],
      ['Engine', 'Bell 8247, restartable'],
      ['Nozzle', '45 to 1, the extension radiation-cooled titanium'],
      ['Burned to reach orbit', '377.5 s to 560.4 s after the Atlas’s liftoff'],
      ['Exit', 'about 33 in across: estimated'],
    ],
  },
];

// the vehicle and the target it went up to meet stand in the gallery: the vehicle on its engines, the target on the
// floor beside it (vehicles/gemini-targets.ts `withTarget`). At Complex 19 the vehicle stands on the thrust mount
// (`lc19Vehicle`) and the target is not drawn (address.ts `atSite`): it went up from Complex 14, which is another issue's
const vehicle = lc19Vehicle(
  withTarget(
    geminiTitanStack({
      flight: 'gt-8',
      parts: [...parts, ...agenaParts(target)],
      // the crew into the ship at 9:38 (the mission report, Table 7.2-V); the hatches shut about ten minutes after the
      // plan's T-100, glue having been found in a harness fitting (5.1.10.1.3), about 10:05: estimated (pad.ts)
      seats: seats([-7382, -5754]),
      views: [
        { id: 'nose', label: 'Docking nose', nodes: ['RendezvousRecovery'], from: along(-30, 0.9) },
        { id: 'backpack', label: 'Backpack', nodes: ['ExtravehicularSupportPackage'], from: along(LEFT_AZ + 30, -0.7) },
        { id: 'target', label: 'Agena', nodes: AGENA, from: along(LEFT_AZ + 20, 0.12) },
        { id: 'cone', label: 'Docking cone', nodes: ['DockingCone', 'MooringLatches', 'StatusDisplay'], from: along(LEFT_AZ + 30, 0.9) },
        { id: 'sps', label: 'Agena’s engines', nodes: ['AgenaEngine', 'AgenaSecondaryPropulsion'], from: along(LEFT_AZ + 30, -0.3) },
      ],
      cabin: cabin({
        radar:
          'The range and closing speed of what the rendezvous radar has found. On this flight it was the Agena’s transponder, solidly from 181 nautical miles in.',
        fairing:
          'Pressed to throw off the nose fairing over the radar and the scanner fairing. This crew pressed it later than usual: 7 min 30 s after liftoff.',
        power:
          'The pilot’s ammeter as spacecraft 3 had it. On this ship the fuel cells’ monitor stood here, two of its six ammeters showing the main buses’ currents: not drawn.',
      }),
    }),
    'Agena 7.95 m',
    AGENA_TARGET,
  ),
  BASE,
);

/**
 * The two men as they stood on the deck that morning, by the foot of the crew's ramp, facing the erector: each a figure
 * the site can be walked as (crew/g4c_suit.py), Scott in the cover he was to go outside in. Where each stood is ours.
 * The portable ventilator each carried and his yellow overshoes are not built (crew/g4c-suit.md). The pad stands round
 * them as at about 09:34, before they went up.
 */
const ARRIVED = -7382 - 240;
const crew = standing({
  flight: 'gt-8',
  id: 'crew',
  name: 'Command pilot',
  scale: 'Neil A. Armstrong · 1.79 m, 1.84 m suited · to scale',
  parts: g4cParts('Armstrong'),
  height: 1.841,
  at: [9.6, 0, -2.5],
  boarding: ARRIVED,
});
const pilot = standing({
  flight: 'gt-8',
  id: 'pilot',
  name: 'Pilot',
  scale: 'David R. Scott · 1.83 m, 1.87 m suited · to scale',
  parts: g4cParts('Scott'),
  height: 1.874,
  at: [10.6, 0, -3.5],
  boarding: ARRIVED,
});

export const flight: Flight = {
  id: 'usa/gemini/gt-8',
  nation: 'USA',
  agency: 'NASA',
  program: 'Project Gemini',
  designation: 'Gemini-Titan 8',
  // the mission's own style, in Roman (README.md, "The name")
  callsign: 'Gemini VIII',
  spacecraft: 'Gemini spacecraft No. 8 (McDonnell Aircraft)',
  launchVehicle: 'Gemini Launch Vehicle 8, a Titan II (Martin)',
  // 16:41:02.389 G.m.t. (the mission report, 4.1; Table 4.2-I has 16:41:02.39): 11:41:02 a.m. e.s.t.
  launch: '1966-03-16T16:41:02.389Z',
  launchSite: LC19.name,
  site: LC19,
  weather: WEATHER,
  crew: ['Neil A. Armstrong', 'David R. Scott'],
  summary:
    'The first docking of two vehicles in orbit, six and a half hours after liftoff, with an Agena sent up 101 ' +
    'minutes before. Twenty-seven minutes later a thruster on the spacecraft stuck open. Undocked, the ship spun ' +
    'to nearly a turn a second; Armstrong stopped it with the thrusters kept for re-entry, and the rules then ' +
    'brought a three-day flight down in the Pacific after ten hours and 41 minutes.',
  facts: [
    { label: 'Liftoff', value: '16 March 1966, 16:41:02.389 UTC' },
    { label: 'Command pilot', value: 'Neil A. Armstrong' },
    { label: 'Pilot', value: 'David R. Scott' },
    { label: 'Target', value: 'Gemini Agena Target Vehicle 5003, launched 15:00:03.127 UTC on Atlas 5302' },
    { label: 'Docking', value: '6 h 33 min 16 s after liftoff' },
    { label: 'Docked for', value: '41 min 56 s' },
    { label: 'Duration', value: '10 h 41 min 26 s' },
    { label: 'Orbit at insertion', value: '160 km by 272 km, 29.07°' },
    { label: 'Period', value: '88.83 min' },
    { label: 'Landing', value: 'western Pacific, about 25°14′ N 136° E, in the seventh revolution' },
    { label: 'Recovery', value: 'USS Leonard F. Mason, about three hours after landing' },
  ],
  // The flight as flown; README.md, "Timeline", gives each time its source: the mission report's Table 4.2-I (read on
  // the page), its Table 4.3-III and its sections 4.1, 5.1.5 and 5.1.8.
  timeline: [
    { t: -6059.262, event: 'The Atlas-Agena lifts off from Complex 14, 15:00:03.127 G.m.t.' },
    { t: 0, event: 'Liftoff, 11:41:02.389 EST, on an azimuth of 99.9°' },
    { t: 8.48, event: 'Roll programme begins; complete at 20.47 s' },
    { t: 22.98, event: 'Pitch programme begins' },
    { t: 154.61, event: 'First stage cutoff; the second stage’s engine is signalled to start' },
    { t: 155.29, event: 'The stages begin to part' },
    { t: 337.54, event: 'Second stage cutoff' },
    { t: 365.66, event: 'The spacecraft cuts itself free; the aft thrusters burn for 8 s. In orbit: 86.3 by 146.7 nautical miles' },
    { t: 450, event: 'Nose and horizon scanner fairings thrown off, later than usual' },
    { t: get(1, 34, 36.4), event: 'Height adjustment: 3.1 ft/s off the apogee' },
    { t: get(2, 18, 25.8), event: 'Phase adjustment: 50.6 ft/s, raising the perigee to about 113.5 nautical miles' },
    { t: get(2, 45, 52.8), event: 'Plane change: 26.6 ft/s, the ship yawed square to its path' },
    { t: get(3, 27, 48), event: 'The radar first hears the Agena; solid lock three and a half minutes later, at 181 nautical miles' },
    { t: get(3, 48, 9.7), event: 'Coelliptic manoeuvre: 61.6 ft/s in 82.5 s. The orbit is about 146.5 by 144.6 nautical miles' },
    { t: get(5, 14, 55.7), event: 'Terminal phase initiation: 27.3 ft/s toward the Agena, 29 nautical miles away' },
    { t: get(5, 43, 9), event: 'Braking begins' },
    { t: get(5, 55), event: 'Station keeping, about 150 ft from the Agena' },
    { t: get(6, 33, 16), event: 'Docking: the first of two vehicles in orbit. Rigid at 6:33:22' },
    { t: get(6, 49), event: 'About now the Agena turns the docked pair 90° in yaw, at the crew’s command' },
    { t: get(7, 0, 26.7), event: 'OAMS thruster No. 8 fails open. The docked pair begins to roll' },
    { t: get(7, 15, 12.3), event: 'Undocking: thrusters 11 and 12 fired for 6.6 s. The ship’s roll climbs to 296°/s' },
    { t: get(7, 16, 25.1), event: 'The re-entry control system is activated; it first fires at 7:19:03.8' },
    { t: get(7, 18, 15.7), event: 'Thruster No. 8’s circuit breaker opened' },
    { t: get(7, 25, 30), event: 'Rates under control' },
    { t: get(10, 3, 48), event: 'Equipment section cut away' },
    { t: get(10, 4, 47), event: 'Retrofire, in the seventh revolution' },
    { t: get(10, 36, 47), event: 'Drogue parachute' },
    { t: get(10, 38, 8), event: 'Main parachute' },
    { t: get(10, 41, 26), event: 'Landing in the western Pacific, less than 7 nautical miles from the planned point' },
    { t: get(13, 47), event: 'The crew aboard USS Leonard F. Mason, 06:28 G.m.t. on 17 March' },
  ],
  specs: [
    ...LC19_SPECS,
    {
      group: 'Pressure suit',
      label: 'Armstrong, in helmet and boots',
      value: 1.841,
      unit: 'm',
      confidence: 'estimated',
      note: 'the standing figure as built (crew/g4c_suit.py), on a man of 1.791 m: "5 ft., 10 1/2 in." in the Gemini 5 press kit’s biography of him as a backup pilot (NASA release 65-262, p. 83), documented. The suit’s own thickness is estimated',
    },
    {
      group: 'Pressure suit',
      label: 'Scott, in helmet and boots',
      value: 1.874,
      unit: 'm',
      confidence: 'estimated',
      note: 'the standing figure as built, on a man of 1.829 m: 6 ft, as commonly given, his stature not being in any NASA source read: estimated. The suit’s thickness and its cover layer’s are estimated',
    },
    ...dimensions(
      'documented',
      'SEDR 300 vol. 2, Figures 2-3 and 2-4, the manual that covers this ship',
      `the Gemini VIII mission report’s Figure 3.0-1, "GLV - Spacecraft relationships" (${GVIII})`,
    ),
    {
      group: 'Spacecraft',
      label: 'Weight at launch',
      value: 8351.31 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `8,351.31 lb, "Launch, gross weight" (${GVIII}, 3.3, p. 3-38, read on the page)`,
    },
    {
      group: 'Spacecraft',
      label: 'Weight at retrofire',
      value: 5726.36 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `5,726.36 lb, "Retrograde" (${GVIII}, 3.3, p. 3-38); at 0.05 g, 4,879.89 lb; at main parachute deployment, 4,454.89 lb`,
    },
    {
      group: 'Spacecraft',
      label: 'Weight at landing',
      value: 4344.08 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `4,344.08 lb, "Touchdown (no parachute)" (${GVIII}, 3.3, p. 3-38)`,
    },
    {
      group: 'Spacecraft',
      label: 'OAMS propellant loaded',
      value: (420.04 + 346.6) * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `420.04 lb of oxidiser (the figure is in brackets in the table) and 346.6 lb of fuel, 14.5 lb of the fuel in the reserve tank (${GVIII}, Table 5.1.8-I, p. 5-93, and p. 5-85); 411 lb and 340 lb usable (p. 5-89)`,
    },
    {
      group: 'Spacecraft',
      label: 'OAMS propellant used',
      value: 563 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `"At the time the equipment section was jettisoned, 563 pounds of propellant had been used" (${GVIII}, p. 5-90). Between 7:00:26 and 7:25:30, 190 lb by the gauging equation and 203 lb from the firing times (p. 5-89)`,
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
      label: 'Water tanks, capacity each',
      value: 42 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `"only two tanks (fig. 3.1-2), each having a capacity of 42 pounds of water": tank A, in the equipment section, went up with nitrogen at 19 psia, tank B, in the retrograde section, with 36 lb of drinking water (${GVIII}, 3.1.2.3.5)`,
    },
    {
      group: 'Spacecraft',
      label: 'Index bar, travel',
      value: 13.82 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '"The extension cycle moves the indexing bar 13.82 in. from the retracted position to the fully extended position" (Project Gemini: A Technical Summary, NASA CR-1106, p. 241). Its station on the ship is scaled from the mission report’s Figure 3.1-9: estimated',
    },
    {
      group: 'Spacecraft',
      label: 'Handrails',
      value: 46 * IN,
      unit: 'm',
      confidence: 'documented',
      note: `"The painted metal handrails were 0.55 by 1.25 inches in cross section. The forward handrail was 21 inches long ... The aft handrail was 46 inches long ... There was a 9-inch gap between the two sections ... 1.5 inches above the spacecraft surface when deployed" (${SP149}, p. 5-6). Where they are round the ship (12° right of the top) is scaled from the mission report’s Figure 3.1-9: estimated`,
    },
    {
      group: 'Spacecraft',
      label: 'Extravehicular support package, height',
      value: 26 * IN,
      unit: 'm',
      confidence: 'documented',
      note: `"26 inches high, 21 inches wide, and 17 inches deep", 92 lb, 7 lb of oxygen and 18 lb of Freon 14 (${KIT}, pp. 40 to 43); 80 minutes at 5.1 lb/hr (${GVIII}, 3.1.2.12.4)`,
    },
    {
      group: 'Spacecraft',
      label: 'Perigee at insertion',
      value: 86.3 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `86.3 nautical miles, above a Fischer ellipsoid (${GVIII}, 1.0 and Table 4.3-IV); planned 86.6`,
    },
    {
      group: 'Spacecraft',
      label: 'Apogee at insertion',
      value: 146.7 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `146.7 nautical miles (${GVIII}, 1.0 and Table 4.3-IV); planned 145.5. ${CHRONOLOGY} agrees`,
    },
    {
      group: 'Spacecraft',
      label: 'Period',
      value: 88.83 * 60,
      unit: 's',
      confidence: 'documented',
      note: `88.83 min in revolution 1 (${GVIII}, Table 4.3-IV); planned 88.76`,
    },
    {
      group: 'Spacecraft',
      label: 'Inclination',
      value: 29.07,
      unit: 'deg',
      confidence: 'documented',
      note: `29.07° (${GVIII}, Table 4.3-IV); planned 28.87°`,
    },
    {
      group: 'Spacecraft',
      label: 'Range to the Agena at insertion',
      value: 1060 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `"approximately 1060 nautical miles" (${GVIII}, 4.1, p. 4-2)`,
    },
    {
      group: 'Spacecraft',
      label: 'Radar lock on the Agena',
      value: 181 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `"the radar locked on solidly 3.5 minutes later, at a range of 181 nautical miles", after a first acquisition at 3:27:48 (${GVIII}, 5.1.5, p. 5-20); the summary has 180 (p. 1-2)`,
    },
    {
      group: 'Spacecraft',
      label: 'Coelliptic manoeuvre',
      value: 61.6 * FT,
      unit: 'm/s',
      confidence: 'documented',
      note: `61.6 ft/s in 82.5 s from 3:48:09.7 (${GVIII}, Table 4.3-III). Before it: height adjust 3.1 ft/s at 1:34:36.4, phase adjust 50.6 ft/s at 2:18:25.8, plane change 26.6 ft/s at 2:45:52.8, and 2.3 ft/s at 3:03:42.2 that the report says should not have been made`,
    },
    {
      group: 'Spacecraft',
      label: 'Rendezvous, total velocity change',
      value: 295 * FT,
      unit: 'm/s',
      confidence: 'documented',
      note: `"The total translational cost of the rendezvous maneuvers, including terminal phase, was 295 ft/sec" (${GVIII}, p. 4-19)`,
    },
    {
      group: 'Spacecraft',
      label: 'Docking, from liftoff',
      value: get(6, 33, 16),
      unit: 's',
      confidence: 'documented',
      note: `06:33:16, "Rigidizing" at 06:33:22 (${GVIII}, Table 4.2-I, p. 4-11, read on the page). ${CHRONOLOGY}’s Table B dates the docking from 6:33:22 and has it last 0:41:50`,
    },
    {
      group: 'Spacecraft',
      label: 'Docked for',
      value: get(7, 15, 12.3) - get(6, 33, 16),
      unit: 's',
      confidence: 'derived',
      note: `41 min 56 s: from docking at 06:33:16 to undocking at 07:15:12.3 (${GVIII}, Table 4.2-I)`,
    },
    {
      group: 'Spacecraft',
      label: 'Thruster No. 8 failed open, from liftoff',
      value: get(7, 0, 26.7),
      unit: 's',
      confidence: 'documented',
      note: `"At 7:00:26.7 g.e.t., approximately 27 minutes after docking, the telemetry signal from thruster 8 indicated ON for 4.9 seconds, OFF for 4.0 seconds, then ON for the remainder of the flight" (${GVIII}, p. 5-25); "probably caused by an electrical short to ground" (p. 5-88); it fired 900 s in all (p. 5-87)`,
    },
    {
      group: 'Spacecraft',
      label: 'Greatest roll rate',
      value: 296,
      unit: 'deg/s',
      confidence: 'documented',
      note: `"the roll rate increased to 296 deg/sec over the next three minutes" after 7:15:44.7 (${GVIII}, p. 5-26); docked, the roll "did not exceed 20 deg/sec"`,
    },
    {
      group: 'Spacecraft',
      label: 'Retrofire, from liftoff',
      value: get(10, 4, 47),
      unit: 's',
      confidence: 'documented',
      note: `10:04:47, as planned for a landing in zone 3 in revolution 7 (${GVIII}, Table 4.2-I)`,
    },
    {
      group: 'Spacecraft',
      label: 'Duration, liftoff to landing',
      value: get(10, 41, 26),
      unit: 's',
      confidence: 'documented',
      note: `10:41:26 (${GVIII}, Table 4.2-I; ${CHRONOLOGY}); planned for that landing, 10:42:02. The flight was planned for about 70 h 48 min (${KIT}, p. 22)`,
    },
    {
      group: 'Spacecraft',
      label: 'Landing from the planned point',
      value: 7 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `"less than 7 nautical miles from that planned" (${GVIII}, p. 1-3). Planned 25°15′ N 136°00′ E; the ship’s own computer had 25°12′ N 136°05′ E, the first aircraft 25°14′ N 135°50′ E, and the destroyer picked it up at 25°22′ N 135°56′ E (Table 4.3-I and p. 6-33)`,
    },
    {
      group: 'Launch vehicle',
      label: 'Launch azimuth',
      value: 99.9,
      unit: 'deg',
      confidence: 'documented',
      note: `"a rendezvous launch azimuth of 99.9 degrees. The preflight nominal azimuth had been calculated to be 98.7 degrees" (${GVIII}, 4.1)`,
    },
    {
      group: 'Launch vehicle',
      label: 'Weight at liftoff, with the spacecraft',
      value: 341671 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `341,671 lb at liftoff; 345,359 lb at ignition, 85,276 lb at first stage burnout, 14,326 lb at second stage cutoff (${GVIII}, 3.3, p. 3-37, from the launch vehicle's contractor)`,
    },
    ...agenaDimensions(),
    {
      group: TARGET_GROUP,
      label: 'Agena, weight in orbit',
      value: 7116 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `"Insertion weight (in-orbit) 7 116" lb; 18,097 lb at launch and 17,686 lb at separation from the Atlas (${GVIII}, 3.6, p. 3-51)`,
    },
    {
      group: TARGET_GROUP,
      label: 'Agena, orbit',
      value: 161.3 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `161.3 by 158.8 nautical miles, 29.02°, 90.57 min (${GVIII}, Table 4.3-IX); planned 161.4 by 158.9`,
    },
    {
      group: TARGET_GROUP,
      label: 'Agena’s liftoff before the spacecraft’s',
      value: 6059.262,
      unit: 's',
      confidence: 'documented',
      note: `"One hour 40 minutes 59.262 seconds after GAATV lift-off, the GLV was launched": 15:00:03.127 and 16:41:02.389 G.m.t. (${GVIII}, 4.1). From Complex 14, on Atlas SLV-3 No. 5302, azimuth 84.36°`,
    },
  ],
  motors: [
    ...titanEngines(
      {
        burnS: 154.61 + 3.39,
        // the burn is this vehicle's; the thrust is the type's nominal
        confidence: 'assumed',
        note: `a combined ${lb(2 * THRUST.stage1Chamber.value)} lb of thrust for the two is the Gemini Launch Vehicle's nominal (${KIT}), taken for GLV-8. The burn is this flight's: ignition signal 3.39 s before liftoff, shutdown 154.61 s after (${GVIII}, Table 4.2-I)`,
      },
      {
        burnS: 337.54 - 154.61,
        confidence: 'assumed',
        note: `${lb(THRUST.stage2.value)} lb of thrust at altitude is the type's nominal, taken for GLV-8. The burn is this flight's: ignition signal 154.61 s and shutdown 337.54 s after liftoff (${GVIII}, Table 4.2-I). Its injector was the new one of the stability improvement programme (3.2.2.1)`,
      },
    ),
    ...thrusters(
      'spacecraft 8, whose report describes the system only where it changed (redundant heaters on the oxidiser valves, a reserve fuel tank)',
    ),
    ...agenaMotors(),
  ],
  models: [vehicle, pad, crew, pilot],
  // the place round the pad as it stood that March: as in March 1965 (places/cape-canaveral/lc19/model/1965-03.py)
  surroundings: 'models/usa/places/cape-canaveral/lc19/1965-03.glb',
};

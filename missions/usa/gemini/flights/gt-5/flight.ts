import type { Flight } from '../../../../../src/types.ts';
import { LC19 } from '../../../places/cape-canaveral/lc-19.ts';
import { LC19_SPECS, lc19Vehicle } from '../../../places/cape-canaveral/lc-19.parts.ts';
import { g4cParts, standing } from '../../crew/g4c-suit.parts.ts';
import {
  BASE,
  CHRONOLOGY,
  FT,
  GV,
  IN,
  LB,
  LEFT_AZ,
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
import { pad } from './pad.ts';
import { WEATHER } from './weather.ts';

/** Hours, minutes and seconds of ground elapsed time, as seconds from liftoff. */
const get = (h: number, m: number, s = 0) => h * 3600 + m * 60 + s;
const PSI = 6894.757;

const parts: PartWords[] = [
  {
    node: 'NoseFairing',
    name: 'Nose fairing',
    summary: 'A glass-fibre cap over the ship’s forward face, which on this ship had a radar on it.',
    detail:
      'The forward section ends in a flat face, and going up through the air it wants a cover. This one is laminated ' +
      'glass fibre, 5.31 in deep, and it is the tip of the whole vehicle. The two ships before had nothing under ' +
      'theirs but a closed face, and kept it on until they were in orbit. This one had the first rendezvous radar ' +
      'under it, and its report calls the fairing the radar cover: it went 207 seconds after liftoff, with the ' +
      'second stage burning, seven seconds later than planned, and the cover over the horizon scanners went with ' +
      'it. It was pushed off by a piston fired by a cartridge; the ship before had used a spring. Its size is ' +
      'McDonnell’s drawing.',
    facts: [
      ['Depth', '5.31 in (0.13 m): Z233.97 to Z239.28'],
      ['Material', 'glass fibre reinforced plastic laminate'],
      ['Thrown off', '207.00 s after liftoff; planned for 199.83 s'],
      ['By', 'a pyrotechnic piston'],
      ['Under it', 'the rendezvous radar'],
    ],
  },
  {
    node: 'RendezvousRecovery',
    name: 'Rendezvous and recovery section',
    summary: 'The first rendezvous radar to fly: four antennas on the ship’s nose, and nothing left to point them at.',
    detail:
      'The forward 42 inches: beryllium shingles, black outside, over a titanium frame, with the parachutes inside ' +
      'and, for the first time, the radar on its face. Four spiral antennas: one sends, and three listen for the ' +
      'answer of a transponder on the target. Two of the three turn until the answer reaches them in step with the ' +
      'third, and how far they have turned is the target’s bearing; how long the answer took is its range. The ' +
      'target was to be a pod the ship carried up and threw out. It was thrown out, the radar found it at once and ' +
      'followed it to 7,721 ft, and then the ship had to be powered down and the pod was left. So the radar was ' +
      'tried on what there was: on the second day, passing over Cape Kennedy, it locked on to a spare transponder on ' +
      'the ground and read its range correctly. When the main parachute comes out this whole section is pulled off, ' +
      'radar and all, and lost. The four antennas and what each does are the mission report’s; their size and ' +
      'places on the face are scaled from its sketch.',
    facts: [
      ['Length', '42.00 in (1.07 m)'],
      ['Skin', 'unbeaded beryllium shingles'],
      ['Radar', '4 dual-spiral antennas: 1 transmitting, 3 receiving'],
      ['Followed the pod to', '7,721 ft'],
      ['Locked on a ground transponder', '27 h 4 min 2 s, over Cape Kennedy'],
      ['Main parachute', 'ring-sail, 84.2 ft'],
    ],
  },
  {
    node: 'ReentryControl',
    name: 'Re-entry control system section',
    summary: 'Sixteen small thrusters kept for the way home, and on this flight needed before it.',
    detail:
      'Eighteen inches of cylinder between the cabin and the forward section. Everything that steers the ship in ' +
      'orbit is in the adapter, and the adapter is thrown away before the ship comes home; from then to the ' +
      'parachute it is steered by this. There are two rings of eight thrust chambers of 25 lbf, each ring with its ' +
      'own fuel, oxidiser and nitrogen, so that either alone is enough. By the eighth day the adapter’s own ' +
      'thrusters were failing one after another, and Cooper lined the ship up for retrofire with one ring of ' +
      'these. Their heaters had been a nuisance since the first night, when the warning lamps kept coming on. The ' +
      'ship then came down 89 nautical miles short, and that was nobody’s fault aboard: a figure sent up from the ' +
      'ground had left out part of the Earth’s turning. Cooper saw the needle was wrong and flew the entry by ' +
      'hand. Which chamber fires which way is McDonnell’s drawing; where the clusters stand is read off a ' +
      'photograph of spacecraft 3.',
    facts: [
      ['Length', '18.00 in (0.46 m)'],
      ['Diameter', '38.66 in (0.98 m)'],
      ['Thrust chambers', '16 × 25 lbf, in two rings of 8'],
      ['Used before retrofire', 'ring A, to line the ship up'],
      ['Landing', '89 nautical miles short: wrong figures from the ground'],
    ],
  },
  {
    node: 'Hatches',
    name: 'Hatches',
    summary: 'Two doors, one over each man, shut for a week and a day.',
    detail:
      'Each man has a hatch over him, hinged along its outboard edge and held down by twelve latches, skinned in the ' +
      'same beaded shingles as the cabin. The window is at its forward end and is not in the skin: the outer pane ' +
      'stands at about 35° to the hatch, so that it faces forward, and ahead of it a trough is cut into the cone for ' +
      'the pilot to look along. Eleven weeks before, a man had gone out through the right-hand one; on this flight ' +
      'nobody was to go out, and the suits had no outer cover for it. Through the windows Cooper and Conrad ' +
      'photographed a storm, followed a Minuteman missile up from the Western Test Range, and looked for marks ' +
      'laid out for them on the ground near Laredo in Texas, to see how small a thing a man in orbit can make ' +
      'out: they saw the smoke that marked the place. When the ship was drifting and turning with the power down, ' +
      'Cooper covered them. The pane’s angle is McDonnell’s drawing; where the windows and the hatches’ edges lie ' +
      'is read off photographs of spacecraft 3, to about two inches.',
    facts: [
      ['Number', '2, hinged on the outboard side'],
      ['Latches', '12 to a hatch'],
      ['Windows', 'an outer pane and two inner, at 35° to the hatch'],
      ['Window opening', 'about 14.8 in across and 8.5 in fore and aft'],
      ['Opened in flight', 'no'],
    ],
  },
  {
    node: 'ScannerFairing',
    name: 'Horizon scanner fairing',
    summary: 'A bronze-coloured cover over the infrared eyes that find the horizon. On this ship it went during the climb.',
    detail:
      'On the ship’s left side at the neck, two infrared scanners look out for the edge of the Earth and tell the ' +
      'ship which way is down. They would not survive the climb through the air uncovered, so a fairing sits over ' +
      'them. It went with the nose fairing, 207 seconds after liftoff. The scanners gave trouble: the first one ' +
      'behaved oddly on the second day, and half a minute before the pod was to be thrown out the instrument that ' +
      'shows the ship’s attitude swung away, the crew thought because of it, and they had to line the platform up ' +
      'again in a hurry. The fairing’s size and place are read off a colour photograph of spacecraft 3 on the ' +
      'morning it flew, and taken to be the same here.',
    facts: [
      ['Covers', 'the horizon scanners, on the left side'],
      ['Lies', 'from Z166.5 to Z190.5, about two feet'],
      ['Thrown off', '207.00 s after liftoff, with the nose fairing'],
    ],
  },
  {
    node: 'Cabin',
    name: 'Cabin section',
    summary: 'Beaded shingles of René 41 over a titanium frame. Its crew called it the Covered Wagon.',
    detail:
      'A cone 70.53 in long at 20° to its axis, 90 in across the heat shield and 38.66 in across the neck. The skin ' +
      'is shingles of René 41, a nickel alloy, pressed into short beads that lie round the cone one after another, ' +
      'in cells between rows of fasteners: they stiffen the sheet and let it grow when hot, and it is black outside ' +
      'so that it radiates. The shingles are not the pressure vessel: that is a welded titanium box inside, and the ' +
      'room between its flat sides and the cone is equipment bays. NASA allowed no names on its Geminis after the ' +
      'first. Cooper asked instead for a patch, and got it: a covered wagon, which Conrad’s father-in-law had ' +
      'whittled a model of, the first emblem an American crew wore. The motto that went with it, "Eight days or ' +
      'bust", the Administrator would not have, in case it was not eight days. The paint is drawn as spacecraft 3’s, ' +
      'UNITED STATES and the flag on each side below the hatch’s hinge: no photograph of this ship’s sides has ' +
      'been read close enough to say that it was so.',
    facts: [
      ['Length', '70.53 in (1.79 m)'],
      ['Half-angle', '20°'],
      ['Skin', 'beaded René 41 shingles, black'],
      ['Paint', 'UNITED STATES and the flag, each side: as spacecraft 3, assumed'],
      ['Name', 'none painted: "Covered Wagon" to its crew'],
    ],
  },
  {
    node: 'CrewStation',
    name: 'Crew station',
    summary: 'Two ejection seats side by side, for 190 hours 55 minutes: longer than anyone had yet stayed in space.',
    detail:
      'Two men sit as in an aeroplane, the command pilot on the left, in pure oxygen at about 5 psi, each with a ' +
      'window before him and a hatch over him. Eight days is how long it takes to go to the Moon, land and come ' +
      'back, and nobody knew whether men could stay well that long without weight. Cooper and Conrad did, in a ' +
      'space they could not stand or stretch out in. It was cold: with the power down and the ship drifting they ' +
      'shivered, and took the cooling hoses off their suits. Sleeping in turns did not work, because the radio woke ' +
      'the sleeper, so they slept at the same time. For the last three days there was little they could do but ' +
      'drift. The panels are drawn from McDonnell’s drawing of spacecraft 3’s, with the clock spacecraft 4 added; ' +
      'what this ship changed is not drawn: a monitor for the fuel cells, a panel of warning lamps, a second ' +
      'manoeuvre controller on the right-hand wall, the switch that threw out the pod. The seats are empty: both ' +
      'men wore the G4C suit, which is modelled standing, at the foot of the erector, and not seated. No drawing read gives the pressure vessel’s dimensions: its ' +
      'sizes are those fitted round the crew of spacecraft 3.',
    facts: [
      ['Crew', '2: command pilot left, pilot right'],
      ['Seats', 'ejection seats, 22 in wide, canted 12° outboard and 8° forward'],
      ['Panels', 'spacecraft 3’s, with spacecraft 4’s G.m.t. clock'],
      ['Atmosphere', 'pure oxygen, 5.1 psi'],
      ['Power', 'two fuel cell sections in the adapter; 4 batteries of 45 Ah here for the way home'],
      ['Suits', 'G4C, without the outer cover: the two men stand at the pad, the seats are empty'],
    ],
  },
  {
    node: 'HeatShield',
    name: 'Heat shield',
    summary: 'A shallow dish of resin-filled honeycomb, 90 inches across, that chars away.',
    detail:
      'Glass-fibre honeycomb filled with a silicone elastomer, bolted to the big end of the cabin: a dish 90 in ' +
      'across, part of a sphere of 144 in radius. It is an ablator, and it rides the whole flight inside the ' +
      'adapter, out of sight until the last of the adapter is cut away after retrofire: on this flight, for eight ' +
      'days. The entry pulled 7.1 g by the ship’s own instruments. The station taken here for its crown is one of ' +
      'SEDR 300’s that the drawing does not name.',
    facts: [
      ['Diameter', '90.00 in (2.29 m)'],
      ['Spherical radius', '144 in (3.66 m)'],
      ['Material', 'silicone-filled glass-fibre honeycomb'],
      ['Entry load', '7.1 g by telemetry'],
    ],
  },
  {
    node: 'RetroSection',
    name: 'Adapter: retrograde section',
    summary: 'Four solid rockets that waited eight days to be fired, and did it in the dark.',
    detail:
      'The upper two fifths of the white adapter, from station Z68.44. Inside, on a cross of aluminium I-beams, are ' +
      'four solid rockets in titanium balls about 13 in across, each of about 2,500 lbf for five and a half seconds, ' +
      'fired one after another. At 190 hours 27 minutes 43 seconds, on the night side of the Earth, the first of ' +
      'them lit, and the others at about five-second intervals after it; then the section itself was cut loose. In ' +
      'its skin are six thrusters of the manoeuvring system: two that fire forward, and four that push the ship ' +
      'sideways, up and down. Those four are what a ship uses to close the last few hundred feet on a target, and ' +
      'on this flight they fired for about five seconds in all. On this section too, the report says, was a light ' +
      'of 4,000 candlepower in a narrow beam, for watching the pod at close quarters; where it was is not in ' +
      'anything read, and it is not modelled.',
    facts: [
      ['Retrograde rockets', '4 × about 2,500 lbf, 5.5 s each'],
      ['First fired', '190 h 27 min 43 s after liftoff'],
      ['Forward thrusters', '2 × 85 lbf'],
      ['Lateral thrusters', '4 × 100 lbf: about 5 s of firing in the flight'],
      ['Docking light', '4,000 beam candlepower, 6° beam: not modelled'],
    ],
  },
  {
    node: 'EquipmentSection',
    name: 'Adapter: equipment section',
    summary: 'The first fuel cells to power a crew, and the oxygen tank whose heater failed at 25 minutes.',
    detail:
      'The lower three fifths of the adapter, 10 ft across at the foot. Batteries for eight days would have ' +
      'weighed more than the ship could carry, so in place of the last ship’s six there are two fuel cell sections: ' +
      'sealed cans in which hydrogen and oxygen are combined across a plastic membrane and give electricity, and ' +
      'water. Beside them are the two tanks that feed them, each holding its gas so cold and so compressed that it ' +
      'is neither liquid nor gas. A heater in the oxygen tank keeps the pressure up as oxygen is drawn off. At 25 ' +
      'minutes 51 seconds its circuit shorted. The pressure fell from 853 lb to the square inch to about 70 in four ' +
      'hours; nobody knew how low a fuel cell would go on working. The crew threw out their pod on time and then ' +
      'shut the ship down, and Houston came within two hours of bringing them home at the sixth revolution. At St. ' +
      'Louis a cell was run at low pressure to see; in orbit the pressure steadied; and on the seventh revolution ' +
      'the ship was switched back on, a little at a time. The cells ran the rest of the eight days. The water they ' +
      'made went into one of the two drinking water tanks, behind its diaphragm, and by the fifth day the room ' +
      'left in it was being watched. Everything here stands against the wall round a clear middle: the fuel cells ' +
      'and their tanks beyond one beam, the manoeuvring system’s tanks with a water tank at each end beyond the ' +
      'other, and in the middle, under the blast shield’s door, the pod. The fuel cells, their tanks and the water ' +
      'tanks are documented, and so is which side of the section each module stands on; their sizes are worked from ' +
      'the weights or scaled from sketches; the gold cover’s form is measured on a photograph of Gemini 7 in ' +
      'orbit; each thing’s exact place is estimated.',
    facts: [
      ['Base diameter', '120.00 in (3.05 m)'],
      ['Fuel cells', '2 sections of 3 stacks of 32 cells'],
      ['Their oxygen', '178.2 lb at launch, at 815 psi'],
      ['Their hydrogen', '23.1 lb at launch'],
      ['Heater failed', '25 min 51 s after liftoff'],
      ['Oxygen pressure', '853 psi, falling to about 70 by 4 h 22 min'],
      ['Drinking water', '2 tanks of 150 lb, one also taking the cells’ water'],
    ],
  },
  {
    node: 'RadarEvaluationPod',
    group: 'Spacecraft',
    inside: true,
    name: 'Rendezvous evaluation pod',
    summary: 'A target the ship took up with it, threw out at 2 hours 7 minutes, and never got back to.',
    detail:
      'This flight was first meant to meet an Agena. That was put off, and the radar still had to be tried on ' +
      'something. So the ship carried its own target in the middle of the adapter, hung under the blast shield’s ' +
      'access door behind a silvered cover: a package holding what an ' +
      'Agena’s docking adapter was to hold. A transponder to answer the radar; two flat spiral antennas and a ' +
      'dipole on a boom, so that it could be heard from any side; two flashing lights; and two batteries of 24 ' +
      'volts to run it. The plan was to throw it out, let it drift miles away, and then find it again and fly back ' +
      'to it, as a crew would have to with an Agena. At 2 hours 7 minutes 15 seconds, with the ship turned square to ' +
      'its path, Cooper pressed the switch: springs threw off the cover, a charge threw out the pod at about 5 ft a ' +
      'second, and the radar had it at once. It went straight out to the side, tumbling slowly, where Conrad had ' +
      'expected it to fall behind. Ten minutes later the crew reported the fuel cells’ oxygen pressure falling ' +
      'fast, and the ship was powered down. The pod stayed near for five revolutions, easier to see by the Sun glinting off it ' +
      'than by its lights. Two days later the crew flew the same manoeuvres toward a point in empty space where an ' +
      'Agena might have been. What the pod carried is documented, and so are three sizes: the transponder that is ' +
      'its body, 10 by 10 by 20 in; the two inches its spiral antennas stand off the case; the two feet of its ' +
      'dipole’s boom. So is where it hung: in the middle of the section, on the blast shield’s access door, with ' +
      'four posts reaching past it to hold its cover. The rest of its form is scaled from McDonnell’s drawing of ' +
      'it, which has no dimensions, and the cover’s outline from his sketch.',
    facts: [
      ['Carried', 'a transponder, 3 antennas, 2 flashing lights, 2 batteries'],
      ['Power', 'two 24 V silver-zinc batteries'],
      ['Thrown out', '2 h 7 min 15 s after liftoff, at 4.6 ft/s'],
      ['Followed by radar to', '7,721 ft'],
      ['Stayed in sight', 'about five revolutions'],
      ['Transponder', '10 × 10 × 20 in'],
      ['Dipole boom', '2 ft, fixed'],
      ['Mounted', 'on the blast shield’s access door, in the middle of the section'],
    ],
    // out of the back of the adapter, between it and the Titan
    explode: [0, 0.45, 0],
    order: 12,
  },
  {
    node: 'TitanStage2',
    name: 'Second stage',
    summary: 'Two tanks and the guidance between them, with a bare skirt and nothing left over from the missile.',
    detail:
      'Ten feet across, like the first stage, and built the same way: the tanks’ walls are the vehicle’s skin. ' +
      'Oxidiser is above fuel, and between the two tanks are the trusses that carry what flies the vehicle: radio ' +
      'guidance, a second flight control system able to take over from the first, and a malfunction detection ' +
      'system that told the crew what their booster was doing. The forward skirt is bare metal, as on the vehicle ' +
      'before; the flashing lights that one carried for its crew to chase it by were left off this one, which had a ' +
      'pod for a target. By now the vehicle was being trimmed: the brackets the missile’s vernier engines had hung ' +
      'on were taken off the fuel tank’s skirt, a second telemetry system and its tape recorder taken out, spare ' +
      'wires cut back. It put the spacecraft into an orbit 87 by 189 nautical miles, the highest a Gemini had been.',
    facts: [
      ['Diameter', '10 ft (3.05 m)'],
      ['Propellants', 'nitrogen tetroxide and Aerozine 50'],
      ['Forward skirt', '22.3 in, bare'],
      ['Flashing lights', 'none: GLV-4’s were not repeated'],
      ['Taken off since GLV-4', 'vernier engine brackets, FM telemetry, a tape recorder'],
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
      'nozzle, and that is the roll control. On this flight it was signalled at 153.55 seconds and shut down at ' +
      '333.28, more than three seconds sooner than planned, having given a little more thrust than nominal. The ' +
      'engine’s place is documented, and so are the two expansion ratios, 13 and 49.2, that put the joint in its ' +
      'bell where it is; the bell’s size is computed from them, and the rest of its form is representative.',
    facts: [
      ['Thrust', 'about 100,000 lbf at altitude (445 kN)'],
      ['Engine', 'Aerojet YLR91-AJ-7'],
      ['Burned', '153.55 s to 333.28 s from liftoff'],
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
      'ports at the foot. On this flight the engine’s signal came at 153.55 seconds and the stages had begun to ' +
      'part by 154.29. The black and white panels are the roll pattern: the cameras that followed the vehicle could ' +
      'see from them whether it was turning. The colour photograph of this vehicle on the stand shows the same ' +
      'pattern as GLV-3’s, whose edges the model’s are read from.',
    facts: [
      ['Stages part at', 'station 500, its upper edge'],
      ['Staging', '"fire in the hole": engine start before separation'],
      ['Paint', 'eight panels, black on the diagonals'],
      ['Stages began to part', '154.29 s after liftoff'],
    ],
  },
  {
    node: 'TitanStage1',
    name: 'First stage',
    summary: 'Seventy feet of tank with UNITED STATES down it, launched two days late and half a second early.',
    detail:
      'Oxidiser tank above, fuel tank below, and the oxidiser’s feed line running down through the middle of the ' +
      'fuel. Nothing is cryogenic: nitrogen tetroxide and a hydrazine blend keep at ordinary temperatures. The wall ' +
      'is bare aluminium down to the splice between the tanks, white below that, then black, with the roll pattern ' +
      'at the foot, and UNITED STATES down the bare metal, one letter under the next: the photograph of this ' +
      'vehicle on its stand shows it as GLV-3 wore it. The first count, two days before, had been given up with ' +
      'the crew aboard: a thunderstorm came over the pad, lightning struck near by, and the spacecraft’s computer ' +
      'faltered. The propellants were drained and the count begun again. On 21 August it left 0.482 of a second ' +
      'before the planned instant. At liftoff the tank walls were pale with frost or dew, the propellants having ' +
      'been chilled; the model is the vehicle dry.',
    facts: [
      ['Length with its engines', '848.1 in (21.54 m)'],
      ['Diameter', '10 ft (3.05 m)'],
      ['Lettering', 'UNITED STATES, upright letters, one side'],
      ['Paint', 'white band, black band, roll pattern: as GLV-3'],
      ['Weight at liftoff, with the spacecraft', '341,163 lb'],
    ],
  },
  {
    node: 'TitanStage1Engine',
    name: 'First stage engine',
    summary: 'Two chambers on one frame: 430,000 lbf. On this flight the cure for its shaking was left half undone.',
    detail:
      'An Aerojet YLR87-AJ-7: two thrust chambers, each with its own turbopump, on a single frame hung from four ' +
      'longerons under the fuel tank, in the open. It is started by a solid cartridge that spins the pumps; the ' +
      'signal came 3.33 seconds before liftoff. The missile had a fault a warhead could live with and a crew could ' +
      'not: it shook along its length, thrust and feed lines and structure driving one another, like a pogo stick. ' +
      'The cure is on the feed lines here: a standpipe on each oxidiser line, with a bubble of gas for the liquid ' +
      'to bounce on, and a piston accumulator on each fuel line. Before this launch the standpipes were charged ' +
      'with a tenth of the gas they should have had. For about 13 seconds of the climb Cooper and Conrad were ' +
      'shaken at up to 0.38 g, where a quarter of a g was the limit; it stopped a few seconds before staging. It was ' +
      'the only time a Gemini crew felt it, and the procedure was changed. The chambers cut off at 153.55 seconds, ' +
      'a second and a quarter early. The engine’s length and gimbal station are documented; its bells are sized ' +
      'from published ratios and its form is representative.',
    facts: [
      ['Thrust', 'about 430,000 lbf at liftoff (1,913 kN)'],
      ['Engine', 'Aerojet YLR87-AJ-7, two chambers'],
      ['Length', '123.04 in (3.13 m)'],
      ['Pogo on this flight', 'up to ±0.38 g, over the limit for about 13 s'],
      ['Cutoff', '153.55 s after liftoff'],
    ],
  },
];

/** The vehicle as built, in its own frame; at Complex 19 it stands on the thrust mount (`lc19Vehicle`); the gallery stands it on its engines. */
const vehicle = lc19Vehicle(
  geminiTitanStack({
    flight: 'gt-5',
    parts,
    // the crew went aboard at the planned T-100 minutes (the press kit, p. 13: the mission report has them in "at the proper
    // time", 7.1.1.1, and the count ran without a hold); when the hatches were shut is not in what was read: twenty
    // minutes after, estimated
    seats: seats([-100 * 60, -80 * 60]),
    views: [
      { id: 'radar', label: 'Radar', nodes: ['RendezvousRecovery'], from: along(-30, 0.9) },
      { id: 'pod', label: 'Pod', nodes: ['RadarEvaluationPod'], from: along(LEFT_AZ + 30, -0.7) },
    ],
    cabin: cabin({
      radar:
        'The range and closing speed of what the rendezvous radar has found. This was the first ship to carry the radar: it read the pod out to 7,721 ft.',
      fairing:
        'Pressed during the climb on this ship, 207 s after liftoff, to throw off the nose fairing over the radar and the scanner fairing.',
      power:
        'The pilot’s ammeter as spacecraft 3 had it. On this ship a monitor for the six fuel cell stacks stood here instead, which is not drawn.',
    }),
  }),
  BASE,
);

/**
 * The two men as they stood on the deck that morning, by the foot of the crew's ramp, facing the erector: each a figure
 * the site can be walked as (crew/g4c_suit.py). Where each stood is ours. The portable ventilator each carried and his
 * yellow overshoes are not built (crew/g4c-suit.md). The pad stands round them as when they reached the 100 ft level,
 * T-104 minutes.
 */
const ARRIVED = -104 * 60;
const crew = standing({
  flight: 'gt-5',
  id: 'crew',
  name: 'Command pilot',
  scale: 'L. Gordon Cooper Jr. · 1.73 m, 1.79 m suited · to scale',
  parts: g4cParts('Cooper'),
  height: 1.785,
  at: [15, 0, -7],
  boarding: ARRIVED,
});
const pilot = standing({
  flight: 'gt-5',
  id: 'pilot',
  name: 'Pilot',
  scale: 'Charles Conrad Jr. · 1.68 m, 1.74 m suited · to scale',
  parts: g4cParts('Conrad'),
  height: 1.74,
  at: [21, 0, -7],
  boarding: ARRIVED,
});

export const flight: Flight = {
  id: 'usa/gemini/gt-5',
  nation: 'USA',
  agency: 'NASA',
  program: 'Project Gemini',
  designation: 'Gemini-Titan 5',
  // the mission's own style, in Roman; "Covered Wagon" was the crew's word for the ship and never on it (README.md, "The name")
  callsign: 'Gemini V',
  spacecraft: 'Gemini spacecraft No. 5 (McDonnell Aircraft)',
  launchVehicle: 'Gemini Launch Vehicle 5, a Titan II (Martin)',
  // 13:59:59.518 G.m.t. (the mission report, 4.1 and Table 4.2-I): 8:59:59.518 a.m. e.s.t.
  launch: '1965-08-21T13:59:59.518Z',
  launchSite: LC19.name,
  site: LC19,
  weather: WEATHER,
  crew: ['L. Gordon Cooper, Jr.', 'Charles Conrad Jr.'],
  summary:
    'Eight days: as long as a flight to the Moon and back would take, and longer than anyone had yet flown. The first ' +
    'spacecraft to run on fuel cells nearly came home on its first day when their oxygen pressure collapsed; it ' +
    'lost the target it had brought to chase, flew a rendezvous with a point in empty space instead, and drifted ' +
    'most of the rest with its thrusters failing.',
  facts: [
    { label: 'Liftoff', value: '21 August 1965, 13:59:59.518 UTC' },
    { label: 'Command pilot', value: 'L. Gordon Cooper, Jr.' },
    { label: 'Pilot', value: 'Charles Conrad Jr.' },
    { label: 'Duration', value: '190 h 55 min 14 s' },
    { label: 'Revolutions', value: '120' },
    { label: 'Orbit at insertion', value: '162 km by 350 km, 32.59°' },
    { label: 'Period', value: '89.59 min' },
    { label: 'Power', value: 'fuel cells, for the first time' },
    { label: 'Landing', value: '29°47′ N 69°45′ W, 89 nautical miles short' },
    { label: 'Recovery', value: 'USS Lake Champlain' },
  ],
  // The flight as flown; README.md, "Timeline", gives each time its source. All are the mission report's (MSC-G-R-65-4):
  // the launch phase to the hundredth of a second from its Table 4.2-I, read on the page (the text layer garbles its
  // digits), the rest from the same table and sections 4.1 and 5.1.7.2.
  timeline: [
    { t: -3.33, event: 'First stage engine start signal' },
    { t: 0, event: 'Liftoff, 08:59:59.518 EST, 0.482 s before the planned instant' },
    { t: 10.13, event: 'Roll programme begins; complete at 20.45 s' },
    { t: 23.09, event: 'Pitch programme begins' },
    { t: 153.55, event: 'First stage cutoff and second stage start signal, 1.28 s early' },
    { t: 154.29, event: 'The stages begin to part' },
    { t: 207, event: 'The nose fairing over the radar and the horizon scanners’ cover are thrown off, 7 s later than planned' },
    { t: 333.28, event: 'Second stage cutoff, 3.65 s early' },
    {
      t: 356.91,
      event: 'The spacecraft cuts itself free, 23.6 s after cutoff; the aft thrusters add 7.6 ft/s. In orbit: 87.4 by 188.9 nautical miles',
    },
    { t: get(0, 25, 51), event: 'The heater in the fuel cells’ oxygen tank fails, at 853 psi; the pressure begins to fall' },
    { t: get(0, 56), event: 'Perigee raised: the aft thrusters for 13 s, 9.7 ft/s; the orbit 92.4 by 188.9 nautical miles' },
    { t: get(2, 7, 15), event: 'The pod is thrown out, at 4.6 ft/s; the radar locks on and follows it to 7,721 ft' },
    {
      t: get(2, 17),
      event:
        'About now, over Carnarvon, the crew report the oxygen pressure falling fast: 330 psi, then 116 over Hawaii. The ship is powered down and the pod abandoned',
    },
    { t: get(4, 22), event: 'About now the oxygen pressure steadies near 70 psi; a landing at the sixth revolution is held ready' },
    { t: get(27, 4, 2), event: 'The radar locks on to a transponder on the ground at Cape Kennedy and reads it well' },
    { t: get(50, 49, 57), event: 'A rendezvous with nothing: the first of four burns, to lower the apogee, blunt end forward' },
    {
      t: get(53, 4, 4),
      event: 'The fourth burn, 17.2 ft/s, puts the ship where an Agena’s orbit would have been: 108.7 by 168.8 nautical miles',
    },
    { t: get(118, 0), event: 'About now the manoeuvring system turns sluggish and thruster 7 stops; thruster 8 follows; the ship drifts' },
    { t: get(190, 26, 47), event: 'The equipment section is cut away' },
    { t: get(190, 27, 43), event: 'Retrofire, in darkness: four rockets, the last at 190:28:00' },
    { t: get(190, 28, 30), event: 'The retrograde section is cut away' },
    { t: get(190, 49, 19), event: 'Drogue parachute, at 69,000 ft' },
    { t: get(190, 51, 16), event: 'Pilot parachute and the main after it, at 10,600 ft' },
    { t: get(190, 55, 14), event: 'Landing, 29°47′ N 69°45′ W, 89 nautical miles short of the planned point' },
  ],
  specs: [
    ...LC19_SPECS,
    {
      group: 'Pressure suit',
      label: 'Cooper, in helmet and boots',
      value: 1.785,
      unit: 'm',
      confidence: 'estimated',
      note: 'the standing figure as built (crew/g4c_suit.py), on a man of 1.727 m: "5 ft., 8 in." in the press kit’s crew biographies (NASA release 65-262, p. 79), documented. The suit’s own thickness is estimated',
    },
    {
      group: 'Pressure suit',
      label: 'Conrad, in helmet and boots',
      value: 1.74,
      unit: 'm',
      confidence: 'estimated',
      note: 'the standing figure as built, on a man of 1.676 m: "5 ft., 6 In." (the same, p. 81), documented. The suit’s thickness is estimated',
    },
    ...dimensions(
      'assumed',
      'SEDR 300 vol. 1, Figures 2-3 and 2-4, which is spacecraft 3’s, 4’s and 7’s manual, taken for spacecraft 5; the adapter’s 90.00 in, the cabin’s 70.53 in and the 219.03 in of the orbit configuration are printed again in vol. 2, which covers this ship',
      `the mission report’s Figure 3.1-1, "GLV - Spacecraft relationships" (${GV})`,
    ),
    {
      group: 'Spacecraft',
      label: 'Weight at launch',
      value: 7947.17 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `7,947.17 lb, "Launch, gross weight" (${GV}, section 3.3)`,
    },
    {
      group: 'Spacecraft',
      label: 'Weight at retrofire',
      value: 5549.2 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: '5,549.20 lb, "Retrograde": the re-entry module and the retrograde section (the same table)',
    },
    {
      group: 'Spacecraft',
      label: 'Weight at landing',
      value: 4244.75 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: '4,244.75 lb, "Touchdown (no parachute)"; 4,733.79 lb at the start of the entry (the same table)',
    },
    {
      group: 'Spacecraft',
      label: 'OAMS propellant used',
      value: 289 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `"289 pounds of propellant were expended" (${GV}, 5.1.8). What was loaded is in a table of that report that was not transcribed`,
    },
    {
      group: 'Spacecraft',
      label: 'Fuel cell oxygen at launch',
      value: 178.2 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `178.2 lb, 99 per cent of the design load, at 815 psia (${GV}, 5.1.7.2.1); 73 lb, 40.5 per cent, was left at the end. ${SEDR2}, p. 5-33, has "180 lbs on spacecraft 5"`,
    },
    {
      group: 'Spacecraft',
      label: 'Fuel cell hydrogen at launch',
      value: 23.1 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `23.1 lb, 103.8 per cent of the design load (${GV}, 5.1.7.2.2); the design load is 22.25 lb for a long mission (${SEDR2}, p. 5-33)`,
    },
    {
      group: 'Spacecraft',
      label: 'Fuel cell oxygen pressure when the heater failed',
      value: 853 * PSI,
      unit: 'Pa',
      confidence: 'documented',
      note: `853 psia at 25 min 51 s, falling to about 70 psia at about 4 h 22 min and rising slowly to 260 psia by the end of the flight (${GV}, 5.1.7.2.1). ${TITANS}, p. 257, has it steady at 71 psi during the fourth revolution`,
    },
    {
      group: 'Spacecraft',
      label: 'Fuel cell hydrogen tank, across',
      value: 28 * IN,
      unit: 'm',
      confidence: 'estimated',
      note: 'about 28 in outside. Inside it is derived: 22.25 lb of hydrogen at its liquid’s density, 4.42 lb/cu ft, is a ball 25.5 in across; the 1.3 in of shell and insulation round it is a guess. No drawing of the tank has been read',
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
      label: 'Drinking water tanks, across',
      value: 21.12 * IN,
      unit: 'm',
      confidence: 'assumed',
      note: `two tanks "the same configuration as the ... OAMS propellant tank", each able to hold 150 lb of water (${GV}, 3.1.2.3); the 21.12 in is that tank’s size on the early ships (SEDR 300 vol. 1, Section VIII, p. 8-273), taken for this one`,
    },
    {
      group: 'Spacecraft',
      label: 'Pod, as thrown out',
      value: 4.6 * FT,
      unit: 'm/s',
      confidence: 'documented',
      note: `4.6 ft/s, against 5.0 planned, at 02:07:15, the ship yawed 88.1° (${GV}, Table 4.3-III, from matching the ship’s radar to the ground’s); followed to 7,721 ft (4.1). ${TITANS}, p. 257, has the ejection at 2 h 13 min, which is not followed`,
    },
    {
      group: 'Spacecraft',
      label: 'Pod, across',
      value: 20 * IN,
      unit: 'm',
      confidence: 'estimated',
      note: `about 20 in, a sixth of the adapter’s width: scaled from the inset of the mission report’s sketch of it (${GV}, Figure 3.1-4b), which has no dimensions`,
    },
    {
      group: 'Spacecraft',
      label: 'Perigee at insertion',
      value: 87.4 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `87.4 nautical miles, against 87.0 planned (${GV}, Table 4.3-II, the final figure, read on the page)`,
    },
    {
      group: 'Spacecraft',
      label: 'Apogee at insertion',
      value: 188.9 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: '188.9 nautical miles, against 191.2 planned (the same table). After the perigee was raised, 92.4 by 188.9; after the third day’s four burns, 108.7 by 168.8; by the 112th revolution, 106.0 by 156.4',
    },
    {
      group: 'Spacecraft',
      label: 'Period',
      value: 89.59 * 60,
      unit: 's',
      confidence: 'documented',
      note: '89.59 min at insertion (the same table)',
    },
    { group: 'Spacecraft', label: 'Inclination', value: 32.59, unit: 'deg', confidence: 'documented', note: '32.59° (the same table)' },
    {
      group: 'Spacecraft',
      label: 'Speed at separation',
      value: 25805 * FT,
      unit: 'm/s',
      confidence: 'documented',
      note: `25,805 ft/s at 356.91 s from liftoff, before the aft thrusters added 7.6 ft/s (${GV}, Table 4.3-I and 4.1)`,
    },
    {
      group: 'Spacecraft',
      label: 'Retrofire, from liftoff',
      value: get(190, 27, 43),
      unit: 's',
      confidence: 'documented',
      note: `190:27:43, as planned, the four rockets at 190:27:43, :49, :54 and 190:28:00 (${GV}, Table 4.2-I)`,
    },
    {
      group: 'Spacecraft',
      label: 'Duration, liftoff to landing',
      value: get(190, 55, 14),
      unit: 's',
      confidence: 'documented',
      note: `190:55:14 (${GV}, Table 4.2-I and 4.1; ${CHRONOLOGY}, as the programme's summary of its flights quotes it)`,
    },
    {
      group: 'Spacecraft',
      label: 'Landing short of the planned point',
      value: 89 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `89 nautical miles short (${GV}, 4.3; "89.25 nautical miles short and 19.67 nautical miles to the right of the ground track" by the ship’s own navigation, 5.1.5): the coordinates sent up for the entry had left out a term. Landing at 29°47′ N 69°45′ W (Table 4.3-I, final); the report’s summary has the ship picked up at 29°52.5′ N`,
    },
    {
      group: 'Launch vehicle',
      label: 'Weight at liftoff, with the spacecraft',
      value: 341163 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `341,163 lb at liftoff and 344,689 lb at ignition, the weights the Aerospace Corporation gave (${GV}, section 3.3)`,
    },
  ],
  motors: [
    ...titanEngines(
      {
        burnS: 153.55,
        // the burn is this flight's own; the thrust is the type's nominal, taken for this vehicle
        confidence: 'assumed',
        note: `a combined ${lb(2 * THRUST.stage1Chamber.value)} lb of thrust for the two is the Gemini Launch Vehicle's nominal (NASA release 65-158, the Gemini-Titan 4 press kit), taken for GLV-5; on the day it was "higher than expected" (${GV}, 4.1). The burn is liftoff to the shutdown signal, 153.55 s, with the start signal 3.33 s before liftoff (Table 4.2-I)`,
      },
      {
        burnS: 179.73,
        // the thrust is the type's nominal and the burn is a difference of two documented times: the entry takes the weaker
        confidence: 'derived',
        note: `${lb(THRUST.stage2.value)} lb of thrust at altitude is the type's nominal (the same press kit), "slightly higher than nominal" on the day (${GV}, 4.1). The burn is the start signal at 153.55 s to the shutdown signal at 333.28 s (Table 4.2-I): 179.73 s`,
      },
    ),
    ...thrusters('spacecraft 5, whose propulsion system "was the same as the spacecraft 4 system" (the Gemini V mission report, 3.1.2.7)'),
  ],
  models: [vehicle, pad, crew, pilot],
  // the place round the pad as it stood that August: as in March (places/cape-canaveral/lc19/model/1965-03.py)
  surroundings: 'models/usa/places/cape-canaveral/lc19/1965-03.glb',
};

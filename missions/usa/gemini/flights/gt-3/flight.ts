import type { Flight, ModelDef, Part } from '../../../../../src/types';
import { LC19 } from '../../sites/lc-19.ts';

const IN = 0.0254;
const LB = 0.45359237;
const LBF = 4.4482216;
const NMI = 1852;
const DEG = Math.PI / 180;

// Where things are round the vehicle, as vehicles/gemini_spacecraft.py and vehicles/titan_ii_glv.py have them: degrees
// about the long axis from the spacecraft's top (the side its hatches are on, the model's +X) toward the crew's right.
// The numbers live there; these are quoted for the views and for how the parts come away.
const TOP_AZ = 0;
const LEFT_AZ = -90;
/** The external conduit that UNITED STATES stands beside on the first stage, and the lettering itself. */
const CONDUIT_AZ = -45;
const LETTERS_AZ = -12;
/** A direction on the model in the viewer's axes (+Y is the model's long axis; the model's +Y is the viewer's -Z). */
const along = (az: number, lift: number, by = 1): [number, number, number] => [
  by * Math.cos(az * DEG),
  by * lift,
  -by * Math.sin(az * DEG),
];

const SEDR = 'Project Gemini Familiarization Manual, SEDR 300 vol. 1 (McDonnell, 30 September 1965)';
const KIT = 'NASA release 65-81, the Gemini-Titan 3 press kit (17 March 1965)';
const CHRONOLOGY = 'Project Gemini: Technology and Operations, a Chronology (NASA SP-4002), Appendix 1, Table A';
const TITANS = 'On the Shoulders of Titans (NASA SP-4203)';
const GIV = 'Gemini Program Mission Report, Gemini IV (MSC-G-R-65-3)';
const LAUNCH_SYSTEMS = 'Gemini Program Launch Systems Final Report (Aerospace, January 1967)';

const parts: Part[] = [
  {
    node: 'NoseFairing',
    group: 'Spacecraft',
    name: 'Nose fairing',
    summary: 'A glass-fibre cap over the ship’s forward face, thrown off on the way up.',
    detail:
      'The forward section ends in a flat face full of fittings, and going up through the air it wants a cover. This ' +
      'one is laminated glass fibre, 5.31 in deep, and it is the tip of the whole vehicle. It was to go 3 minutes 15 ' +
      'seconds after liftoff, with the second stage burning and the air behind: an ejector pushes it off and it ' +
      'falls away. The cover over the horizon scanners goes at the same moment.',
    facts: [
      ['Depth', '5.31 in (0.13 m): Z233.97 to Z239.28'],
      ['Material', 'glass fibre reinforced plastic laminate'],
      ['Thrown off', 'planned for 3 min 15 s after liftoff'],
    ],
    explode: [0, 9.4, 0],
    order: 5,
  },
  {
    node: 'RendezvousRecovery',
    group: 'Spacecraft',
    inside: true,
    name: 'Rendezvous and recovery section',
    summary: 'Where the radar goes. This ship carried none, and the section was only its parachutes.',
    detail:
      'The forward 42 inches: beryllium shingles, black outside and gold inside, over a titanium frame. On a ship ' +
      'going to meet another the rendezvous radar looks out of its face; Gemini 3 had nothing to meet, and "radar ' +
      'equipment is not carried for this flight". What it did carry is the way home: a drogue fired out by a ' +
      'mortar at 50,000 ft, a pilot parachute that at 10,600 ft pulls this whole section off the ship, and the 84 ft ' +
      'main parachute packed inside it, which the departing section draws out. A photograph of this spacecraft in ' +
      'January 1965 shows the face closed by a flat ribbed cover; what was behind it has not been found.',
    facts: [
      ['Length', '42.00 in (1.07 m)'],
      ['Skin', 'unbeaded beryllium shingles'],
      ['Radar', 'none on this flight'],
      ['Main parachute', 'ring-sail, 84.2 ft'],
      ['Leaves the ship', 'at 10,600 ft, with the pilot parachute'],
    ],
    explode: [0, 8.2, 0],
    order: 6,
  },
  {
    node: 'ReentryControl',
    group: 'Spacecraft',
    inside: true,
    name: 'Re-entry control system section',
    summary: 'Sixteen small thrusters in four clusters, none of them pointing straight out.',
    detail:
      'Eighteen inches of cylinder between the cabin and the forward section. Everything that steers the ship in ' +
      'orbit is in the adapter, and the adapter is thrown away before the ship comes home; from then to the ' +
      'parachute it is steered by this. There are two rings of eight thrust chambers of 25 lbf, each ring with its ' +
      'own fuel, oxidiser and nitrogen, so that either alone is enough. They stand in four clusters on the ' +
      'diagonals, and each fires along one of the ship’s own axes, up, down, left or right, rather than out ' +
      'along a radius: so the ports are ovals, and the bells are cut off flush with the skin. Gemini’s heat ' +
      'shield is set off-centre on purpose: the ship flies a little nose-up and makes lift, and by rolling with ' +
      'these thrusters the crew can point that lift and steer toward the ship that is waiting. On this flight the ' +
      'lift turned out much smaller than the wind tunnels had said. Which chamber fires which way is McDonnell’s ' +
      'drawing; where the clusters stand is read off a photograph of this ship on the morning it flew.',
    facts: [
      ['Length', '18.00 in (0.46 m)'],
      ['Diameter', '38.66 in (0.98 m)'],
      ['Thrust chambers', '16 × 25 lbf, in two rings of 8'],
      ['Clusters', '4, at 34° and 55° from the top and the bottom'],
      ['Skin', '8 beryllium shingles'],
    ],
    explode: [0, 7.2, 0],
    order: 7,
  },
  {
    node: 'Hatches',
    group: 'Spacecraft',
    name: 'Hatches',
    summary: 'Two doors, one over each man, each with a window set like a windscreen at its forward end.',
    detail:
      'Each man has a hatch over him, hinged along its outboard edge and held down by twelve latches, skinned in the ' +
      'same beaded shingles as the cabin. The window is at its forward end and is not in the skin: the outer pane ' +
      'stands at about 35° to the hatch, its aft edge at the surface and its forward edge sunk five inches, so that ' +
      'it faces forward; and ahead of it a trough is cut into the cone, running out toward the neck, for the pilot to ' +
      'look along. There are three panes of 96 per cent silica glass, one in a gold-coloured outer frame and two in ' +
      'a frame bolted on inside; the right-hand window’s are optically ground. In an emergency on the pad or ' +
      'low in the air the hatches are blown open and the seats fired out through them. On this flight they ' +
      'carried the experiments: a canister of sea urchin eggs on the inside of the left one, a box of human blood ' +
      'and a radioactive source on the right. They stayed shut in orbit; the first man out of one was Edward ' +
      'White, ten weeks later. After the landing Grissom, who had lost a ship to a blown hatch four years before, ' +
      'would not open his until swimmers had a collar round the spacecraft. The pane’s angle is McDonnell’s ' +
      'drawing; where the windows and the hatches’ edges lie is read off photographs of this ship, to about ' +
      'two inches.',
    facts: [
      ['Number', '2, hinged on the outboard side'],
      ['Latches', '12 to a hatch'],
      ['Windows', 'an outer pane and two inner, Vycor, at 35° to the hatch'],
      ['Window opening', 'about 14.8 in across and 8.5 in fore and aft'],
      ['On the left hatch', 'the sea urchin egg experiment'],
      ['On the right hatch', 'the blood irradiation experiment'],
      ['Opened in flight', 'no'],
    ],
    explode: along(TOP_AZ, 3.8, 1.7),
    order: 8,
  },
  {
    node: 'ScannerFairing',
    group: 'Spacecraft',
    name: 'Horizon scanner fairing',
    summary: 'A bronze-coloured cover over the infrared eyes that find the horizon. It goes once the ship is in orbit.',
    detail:
      'On the ship’s left side at the neck, two infrared scanners look out for the edge of the Earth and tell the ' +
      'ship which way is down. They would not survive the climb through the air uncovered, so a fairing sits over ' +
      'them and is thrown off with the nose fairing. The scanners themselves are thrown off too, much later, when ' +
      'the adapter goes: both this crew and the next saw something drift past the window just after retrofire, ' +
      'and it was decided that it had been the scanner head. In the colour photograph taken on the morning of the ' +
      'launch a long flat-faced box the colour of bronze, riveted along its edges, lies here from the cabin’s ' +
      'forward end up over the re-entry control section; that is taken to be this fairing, and its size and place ' +
      'are read off that photograph.',
    facts: [
      ['Covers', 'the horizon scanners, on the left side'],
      ['Lies', 'from Z166.5 to Z190.5, about two feet'],
      ['Thrown off', 'with the nose fairing'],
    ],
    explode: along(LEFT_AZ, 4.2, 1.5),
    order: 8,
  },
  {
    node: 'Cabin',
    group: 'Spacecraft',
    name: 'Cabin section',
    summary: 'Beaded shingles of René 41 over a titanium frame; UNITED STATES and the flag on each side.',
    detail:
      'A cone 70.53 in long at 20° to its axis, 90 in across the heat shield and 38.66 in across the neck. The skin ' +
      'is shingles of René 41, a nickel alloy, pressed into short beads that lie round the cone one after another, ' +
      'in cells between rows of fasteners: they stiffen the sheet and let it grow when hot, and it is black outside ' +
      'so that it radiates. The shingles are not the pressure vessel: that is a welded titanium box inside, and the ' +
      'room between its flat sides and the cone is equipment bays, reached through doors that are themselves ' +
      'shingles. Along the top, between the hatches, runs a white cover over the parachute’s cables, and ahead of ' +
      'each window a trough is cut into the cone. On the right-hand landing gear door (there is no landing gear: ' +
      'the door is left from the plan to land Gemini on skids under a paraglider) is a plate with three nozzles: ' +
      'this flight’s third experiment, 85 lb of water and plumbing that sprayed into the glowing air round the ' +
      'ship on the way down, to see whether radio could be got through it. It could. There is no name on the ' +
      'ship. Grissom called it Molly Brown, after the musical about a woman who would not sink, his last ' +
      'spacecraft having sunk; NASA did not care for it, accepted it when told the alternative was Titanic, and ' +
      'gave no later Gemini a name.',
    facts: [
      ['Length', '70.53 in (1.79 m)'],
      ['Half-angle', '20°'],
      ['Skin', 'beaded René 41 shingles, black'],
      ['Beads', 'round the cone, about 1.15 in apart'],
      ['Paint', 'UNITED STATES and the flag, each side'],
      ['Name', 'none painted: "Molly Brown" by radio only'],
    ],
    explode: [0, 6.0, 0],
    order: 8,
  },
  {
    node: 'CrewStation',
    group: 'Spacecraft',
    inside: true,
    name: 'Crew station',
    summary: 'Two ejection seats side by side. The seats are empty: the crew is not modelled yet.',
    detail:
      'Two men sit as in an aeroplane, the command pilot on the left, in pure oxygen at about 5 psi. The seats are ' +
      'ejection seats, canted 12° outboard and 8° forward so that two of them leave on diverging paths: Gemini has ' +
      'no escape tower, and below 15,000 ft this was the way out. One hand controller between the men turns the ' +
      'ship; the handles that move it bodily are at their outboard hands. Somewhere in here on 23 March was a ' +
      'corned beef sandwich. Walter Schirra had bought it at Wolfie’s in Cocoa Beach, Young had put it in a pocket ' +
      'of his suit, and when the time came to try the flight’s freeze-dried food he handed it to Grissom, who took ' +
      'a few bites and put it away because of the crumbs. Congress heard about it. The seats and panels are placed ' +
      'from SEDR 300’s figures, which carry no dimensions; the instruments are stand-ins; Grissom and Young are not ' +
      'here, because a G3C suit has not been modelled and a Mercury suit would be the wrong suit.',
    facts: [
      ['Crew', '2: command pilot left, pilot right'],
      ['Seats', 'ejection seats, canted 12° outboard and 8° forward'],
      ['Atmosphere', 'pure oxygen, 5.1 psi'],
      ['Power', '4 main batteries of 45 Ah here; 3 of 400 Ah in the adapter'],
      ['Also aboard', 'one corned beef sandwich'],
    ],
    explode: [0, 5.0, 0],
    order: 9,
  },
  {
    node: 'HeatShield',
    group: 'Spacecraft',
    name: 'Heat shield',
    summary: 'A shallow dish of resin-filled honeycomb, 90 inches across, that chars away.',
    detail:
      'Glass-fibre honeycomb filled with a silicone elastomer, bolted to the big end of the cabin: a dish 90 in ' +
      'across, part of a sphere of 144 in radius. It is an ablator, as the orbital Mercury capsules’ was, and it ' +
      'rides the whole flight inside the adapter, out of sight until the last of the adapter is cut away after ' +
      'retrofire. When this one was fished out of the Atlantic it was white all over; it greyed as it dried. ' +
      'The station taken here for its crown is one of SEDR 300’s that the drawing does not name.',
    facts: [
      ['Diameter', '90.00 in (2.29 m)'],
      ['Spherical radius', '144 in (3.66 m)'],
      ['Material', 'silicone-filled glass-fibre honeycomb'],
      ['After the flight', '"a very white cast"'],
    ],
    explode: [0, 4.0, 0],
    order: 10,
  },
  {
    node: 'RetroSection',
    group: 'Spacecraft',
    inside: true,
    name: 'Adapter: retrograde section',
    summary: 'Four solid rockets to come home on, and thrusters that on this ship were dummies.',
    detail:
      'The upper two fifths of the white adapter, from station Z68.44. Inside, on a cross of aluminium I-beams, are four solid rockets in ' +
      'titanium balls about 13 in across, each of about 2,500 lbf for five and a half seconds, fired one after ' +
      'another. At 4 hours 33 minutes 23 seconds they slowed Gemini 3 out of orbit; then the section itself was ' +
      'cut loose, and the heat shield was bare for the first time. In its skin are six thrusters of the ' +
      'manoeuvring system: two that fire forward, and four that push the ship sideways, up and down. McDonnell’s ' +
      'manual has a note on its drawing of them: chambers 13, 14, 15 and 16 inoperative on spacecraft 3. So it ' +
      'could go only forward and back; to shift its orbit sideways Grissom turned the whole ship square to its path.',
    facts: [
      ['Retrograde rockets', '4 × about 2,500 lbf, 5.5 s each'],
      ['Fired', '4 h 33 min 23 s after liftoff'],
      ['Forward thrusters', '2 × 85 lbf'],
      ['Lateral thrusters', '4, dummies on this ship'],
      ['Skin', 'magnesium, white ceramic paint'],
    ],
    explode: [0, 3.0, 0],
    order: 11,
  },
  {
    node: 'EquipmentSection',
    group: 'Spacecraft',
    inside: true,
    name: 'Adapter: equipment section',
    summary: 'Propellant, oxygen, batteries and a radiator: everything wanted only in orbit.',
    detail:
      'The lower three fifths of the adapter, 10 ft across at the foot, where it is bolted to the Titan with twenty ' +
      'bolts. It holds what a ship needs in orbit and not afterwards: the propellant for the manoeuvring thrusters, ' +
      'the oxygen the crew breathe, the coolant pumps, and the power, which on this ship was three silver-zinc ' +
      'batteries, the fuel cells not being ready. The skin is itself the radiator: coolant runs through hollow ' +
      'stringers on its inner face and the white paint gives the heat to space. Ten thrusters are let into it: ' +
      'eight small ones in four clusters that turn the ship, each firing along one of its axes and not straight ' +
      'out, and two at the foot that push it forward. With those two Grissom ' +
      'finished the climb to orbit, and with their opposite numbers he changed the orbit an hour and a half later: ' +
      'the first time a crew had done so. The whole section is cut off just before retrofire. The three tanks of ' +
      'the manoeuvring system are McDonnell’s sizes, 21 in and 16 in across; the rest of what is inside is placed ' +
      'by guess.',
    facts: [
      ['Base diameter', '120.00 in (3.05 m)'],
      ['Attitude thrusters', '8 × 25 lbf'],
      ['Aft-firing thrusters', '2 × 100 lbf'],
      ['Propellant', 'about 300 lb, in two 21 in tanks'],
      ['Batteries', '3 silver-zinc, 400 Ah each'],
      ['Cut away', 'just before retrofire'],
    ],
    explode: [0, 1.8, 0],
    order: 12,
  },
  {
    node: 'TitanStage2',
    group: 'Launch vehicle',
    inside: true,
    name: 'Second stage',
    summary: 'Two tanks and the guidance between them. The tan band is insulation only the first three vehicles wore.',
    detail:
      'Ten feet across, like the first stage, and built the same way: the tanks’ walls are the vehicle’s skin. ' +
      'Oxidiser is above fuel, and between the two tanks are the trusses that carry what flies the vehicle. Most ' +
      'of what made a Titan II into a Gemini Launch Vehicle is there: radio guidance in place of the missile’s ' +
      'inertial set, a second flight control system able to take over from the first, and a malfunction detection ' +
      'system that told the crew what their booster was doing and left the decision to abort with them. The ' +
      'forward skirt is new, a cylinder where the missile had a cone, with twenty lugs for the adapter’s bolts. On ' +
      'the first three vehicles it was coated with insulation against the heating round those lugs; the first ' +
      'flight showed the fear had been too great, this vehicle wore half the thickness, and the fourth none.',
    facts: [
      ['Diameter', '10 ft (3.05 m)'],
      ['Propellants', 'nitrogen tetroxide and Aerozine 50'],
      ['Forward skirt', '22.3 in, insulated: GLV-1 to GLV-3 only'],
      ['Spacecraft attached by', '20 bolts through external lugs'],
      ['External conduits', '1 (the missile had 2)'],
    ],
    explode: [0, 0, 0],
    order: 4,
  },
  {
    node: 'TitanStage2Engine',
    group: 'Launch vehicle',
    inside: true,
    name: 'Second stage engine',
    summary: 'One chamber of 100,000 lbf, lit before the stages part.',
    detail:
      'An Aerojet YLR91-AJ-7, hung on a gimbal under the fuel tank and, until staging, inside the top of the first ' +
      'stage. Its propellants ignite on meeting, so it has no igniter and can be started at altitude without ' +
      'ceremony. The upper third of its bell is tubes cooled by the fuel; below that it is an ablative skirt. One ' +
      'engine cannot roll the stage, so the gas that has driven its pumps is let out through a small swivelling ' +
      'nozzle, and that is the roll control. It burned for about three minutes, and Young, who had not been in ' +
      'space before, was taken with the horizon. The engine’s place is documented; its bell is sized from published ' +
      'ratios, and its form is representative.',
    facts: [
      ['Thrust', 'about 100,000 lbf at altitude (445 kN)'],
      ['Engine', 'Aerojet YLR91-AJ-7'],
      ['Roll control', 'the turbine’s exhaust, through a swivelling nozzle'],
      ['Cutoff', 'about five and a half minutes after liftoff'],
    ],
    explode: [0, -2.6, 0],
    order: 3,
  },
  {
    node: 'TitanInterstage',
    group: 'Launch vehicle',
    name: 'Interstage',
    summary: 'The first stage’s top, with holes to let the second stage’s fire out.',
    detail:
      'The stages part at its upper edge. A Titan does not coast between stages: the second stage’s engine is ' +
      'started while the vehicle is still in one piece, firing down into the top of the first stage, and only then ' +
      'are the bolts blown. For that moment the exhaust has to go somewhere, and it goes out through the ring of ' +
      'ports at the foot. From the spacecraft it was a flash of orange-yellow light all round the windows, which ' +
      'Young had not been told to expect. The black and white panels are the roll pattern: the cameras that ' +
      'followed the vehicle could see from them whether it was turning. Their edges are read off two photographs.',
    facts: [
      ['Stages part at', 'station 500, its upper edge'],
      ['Staging', '"fire in the hole": engine start before separation'],
      ['Paint', 'eight panels, black on the diagonals'],
      ['Exhaust ports', 'in groups under the white panels'],
    ],
    explode: [0, -5.6, 0],
    order: 2,
  },
  {
    node: 'TitanStage1',
    group: 'Launch vehicle',
    inside: true,
    name: 'First stage',
    summary: 'Seventy feet of tank with UNITED STATES down it, one letter under the next.',
    detail:
      'Oxidiser tank above, fuel tank below, and the oxidiser’s feed line running down through the middle of the ' +
      'fuel. Nothing is cryogenic: nitrogen tetroxide and a hydrazine blend keep at ordinary temperatures, so a ' +
      'Titan could be filled the evening before, as this one was, and stand. The wall is bare aluminium down to ' +
      'the splice between the tanks, white below that, then black, with the roll pattern at the foot. An hour ' +
      'before the launch the first-stage oxidiser line sprang a leak; a wrench on a badly seated nut stopped it, ' +
      'and the count was held 24 minutes to be sure. At liftoff the tank walls were pale with frost or dew, the ' +
      'propellants having been chilled; the model is the vehicle dry, as it was photographed the day before.',
    facts: [
      ['Length with its engines', '848.1 in (21.54 m)'],
      ['Diameter', '10 ft (3.05 m)'],
      ['Lettering', 'UNITED STATES, upright letters, one side'],
      ['Paint', 'white band, black band, roll pattern'],
      ['Held', '24 min at T-35 min: a leaking oxidiser line'],
    ],
    explode: [0, -7.6, 0],
    order: 1,
  },
  {
    node: 'TitanStage1Engine',
    group: 'Launch vehicle',
    name: 'First stage engine',
    summary: 'Two chambers on one frame: 430,000 lbf. And two pipes that stopped the vehicle shaking.',
    detail:
      'An Aerojet YLR87-AJ-7: two thrust chambers, each with its own turbopump, on a single frame hung from four ' +
      'longerons under the fuel tank, in the open. It is started by a solid cartridge that spins the pumps, and ' +
      'because the propellants light on meeting there is nothing else to go wrong; it was let go 4 seconds after ' +
      'the start signal. The missile had a fault a warhead could live with and a crew could not: for half a minute ' +
      'of first-stage flight it shook along its length, thrust and feed lines and structure driving one another, ' +
      'like a pogo stick. The cure is on the feed lines here: a standpipe on each oxidiser line, with a bubble of ' +
      'gas for the liquid to bounce on, and a piston accumulator on each fuel line. The chambers burned for about ' +
      'two and a half minutes and gave a little more thrust than predicted. The engine’s length and gimbal station ' +
      'are documented; its bells are sized from published ratios and its form is representative.',
    facts: [
      ['Thrust', 'about 430,000 lbf at liftoff (1,913 kN)'],
      ['Engine', 'Aerojet YLR87-AJ-7, two chambers'],
      ['Length', '123.04 in (3.13 m)'],
      ['Against pogo', 'oxidiser standpipes, fuel accumulators'],
      ['Cutoff', 'about two and a half minutes after liftoff'],
    ],
    explode: [0, -10.6, 0],
    order: 0,
  },
];

/** The first stage engines' exit plane below the model's origin (the spacecraft's Z103.44), m: 90 in of adapter and 1,071.278 in of launch vehicle. */
const BASE = (90 + 1071.278) * IN;
const REENTRY_MODULE = [
  'NoseFairing',
  'RendezvousRecovery',
  'ReentryControl',
  'Hatches',
  'ScannerFairing',
  'Cabin',
  'CrewStation',
  'HeatShield',
];
const SPACECRAFT = [...REENTRY_MODULE, 'RetroSection', 'EquipmentSection'];

const vehicle: ModelDef = {
  id: 'vehicle',
  name: 'Vehicle',
  url: 'models/usa/gemini/gt-3/vehicle.glb',
  scale: '32.95 m tall · spacecraft 5.74 m · to scale',
  // only the vehicle is built: it stands in the gallery, on its engines. Its launch site (Complex 19) is not built yet.
  backdrop: 'studio',
  slider: ['Assembled', 'Taken apart'],
  cutaway: true,
  specGroups: ['Spacecraft', 'Launch vehicle'],
  parts,
  position: [0, BASE, 0],
  home: 'stack',
  views: [
    // as the liftoff was photographed: the lettering toward the eye, the conduit to its left
    { id: 'stack', label: 'Full stack', from: along(LETTERS_AZ - 12, 0.1) },
    // each of these is of named parts, so it stays on them as the slider takes the vehicle apart
    { id: 'spacecraft', label: 'Spacecraft', nodes: SPACECRAFT, from: along(LEFT_AZ + 30, 0.12) },
    { id: 'reentry', label: 'Re-entry module', nodes: REENTRY_MODULE, from: along(LEFT_AZ + 40, 0.2) },
    { id: 'hatches', label: 'Hatches', nodes: ['Hatches'], from: along(TOP_AZ - 12, 0.45) },
    { id: 'adapter', label: 'Adapter', nodes: ['RetroSection', 'EquipmentSection'], from: along(LEFT_AZ + 25, 0.1) },
    { id: 'stage2', label: 'Second stage', nodes: ['TitanStage2'], from: along(CONDUIT_AZ + 8, 0.1) },
    { id: 'interstage', label: 'Interstage', nodes: ['TitanInterstage'], from: along(CONDUIT_AZ + 20, 0.1) },
    { id: 'lettering', label: 'First stage', nodes: ['TitanStage1'], from: along(LETTERS_AZ - 6, 0.05) },
    { id: 'engines', label: 'Engines', nodes: ['TitanStage1Engine'], from: along(CONDUIT_AZ - 20, -0.6) },
  ],
};

export const flight: Flight = {
  id: 'usa/gemini/gt-3',
  nation: 'USA',
  agency: 'NASA',
  program: 'Project Gemini',
  designation: 'Gemini-Titan 3',
  // what the ship was called on the radio, and by nobody officially (README.md, "The name")
  callsign: 'Molly Brown',
  spacecraft: 'Gemini spacecraft No. 3 (McDonnell Aircraft)',
  launchVehicle: 'Gemini Launch Vehicle 3, a Titan II (Martin)',
  // 9:24:00 a.m. e.s.t. (NASA SP-4002, Appendix 1, Table A): 14:24:00 UTC. The fraction of the second is in the mission report, not read
  launch: '1965-03-23T14:24:00Z',
  launchSite: LC19.name,
  site: LC19,
  crew: ['Virgil I. Grissom', 'John W. Young'],
  summary:
    'The first Gemini with a crew, and the first spacecraft whose crew changed its orbit. Three times round the ' +
    'Earth in 4 hours 52 minutes 31 seconds, three burns of its own thrusters, and a landing well short of the ' +
    'ship waiting for it, because Gemini made less lift coming down than the wind tunnels had promised.',
  facts: [
    { label: 'Liftoff', value: '23 March 1965, 14:24:00 UTC' },
    { label: 'Command pilot', value: 'Virgil I. Grissom' },
    { label: 'Pilot', value: 'John W. Young' },
    { label: 'Duration', value: '4 h 52 min 31 s' },
    { label: 'Orbits', value: '3' },
    { label: 'Orbit at insertion', value: '161 km by 224 km, 32.6°' },
    { label: 'Period', value: '88.3 min' },
    { label: 'Burns in orbit', value: '3: the first by any crew' },
    { label: 'Landing', value: '22°26′ N 70°51′ W, 60 nautical miles short' },
    { label: 'Recovery', value: 'USS Intrepid' },
  ],
  // The programme's table (NASA SP-4002, Appendix 1, Table A) for the three times given to the second; the press kit's
  // plan for the ascent, marked as planned; On the Shoulders of Titans (pp. 233 to 237) for the rest, which it gives
  // in round figures. The mission report (MSC-G-R-65-2), which has every event to the tenth, has not been read.
  timeline: [
    { t: 0, event: 'Liftoff, 09:24:00 EST' },
    { t: 156, event: 'Staging: the second stage’s engine starts and the first stage is cut loose (planned time)' },
    { t: 195, event: 'Nose fairing and scanner cover thrown off (planned time)' },
    { t: 338, event: 'Second stage cutoff (planned time)' },
    { t: 358, event: 'The spacecraft cuts itself free and thrusts into orbit (planned time)' },
    { t: 1200, event: 'The oxygen pressure reading drops: an instrument power supply has failed, and Young finds it in 45 s (about)' },
    { t: 5400, event: 'First burn: the forward thrusters for 75 s, 15 m/s off the speed, the orbit nearly round (about)' },
    { t: 8100, event: 'Second burn: the ship turned square to its path, and the orbit’s plane shifted by a fiftieth of a degree (about)' },
    { t: 15683, event: 'Third burn: two and a half minutes of the aft thrusters, perigee down to 72 km' },
    { t: 16403, event: 'Retrofire: four rockets, one after another' },
    { t: 17551, event: 'Landing, 22°26′ N 70°51′ W' },
  ],
  specs: [
    {
      group: 'Spacecraft',
      label: 'Length at launch',
      value: 225.84 * IN,
      unit: 'm',
      confidence: 'documented',
      note: `225.84 in, launch configuration: Z13.44 to Z239.28 (${SEDR}, Figures 2-3 and 2-4); the press kit rounds it to 18 ft 5 in; model: 5.736 m`,
    },
    {
      group: 'Spacecraft',
      label: 'Length in orbit',
      value: 219.03 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '219.03 in, orbit configuration (the same Figure 2-3): without the nose fairing, and without the inch and a half of adapter left on the launch vehicle',
    },
    {
      group: 'Spacecraft',
      label: 'Diameter at the adapter’s base',
      value: 120 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '120.00 in (Figure 2-3); model: 3.048 m',
    },
    {
      group: 'Spacecraft',
      label: 'Heat shield diameter',
      value: 90 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '90.00 in (Figure 2-3; p. 2-18)',
    },
    {
      group: 'Spacecraft',
      label: 'Heat shield spherical radius',
      value: 144 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '144.0 in (Figure 2-3; p. 2-18)',
    },
    {
      group: 'Spacecraft',
      label: 'Adapter length',
      value: 90 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '90.00 in, Z13.44 to Z103.44, tapering at 10° from 120.00 in to 88.30 in across (Figure 2-3)',
    },
    {
      group: 'Spacecraft',
      label: 'Cabin section length',
      value: 70.53 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '70.53 in, Z103.44 to Z173.97, at 20° (Figure 2-3)',
    },
    {
      group: 'Spacecraft',
      label: 'Re-entry control section',
      value: 18 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '18.00 in long and 38.66 in across (Figure 2-3)',
    },
    {
      group: 'Spacecraft',
      label: 'Rendezvous and recovery section',
      value: 42 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '42.00 in, Z191.97 to Z233.97, tapering at 7° from Z201.47 (Figures 2-3 and 2-4). The figure’s end view dimensions a 32.30 in circle at its face; a 7° taper from 38.66 in gives 30.68 in, which is what the model has',
    },
    {
      group: 'Spacecraft',
      label: 'Window, aft edge above the heat shield’s rim',
      value: (141.3 - 103.44) * IN,
      unit: 'm',
      confidence: 'estimated',
      note: 'Z141.3, where the outer pane meets the skin, 41° round from the top; the opening about 14.8 in across and 8.5 in fore and aft. Read off NASA S65-21090 (the ship on the launch vehicle, 23 March 1965) through a camera fitted to the photograph: good to about two inches. SEDR 300’s Figure 2-10 marks Z136.50 at the pane’s sunk end, which the photographs do not bear out',
    },
    {
      group: 'Spacecraft',
      label: 'Window pane to the hatch’s skin',
      value: 35,
      unit: 'deg',
      confidence: 'estimated',
      note: 'the outer pane stands at about 35° to the hatch, its forward edge sunk: SEDR 300, Figure 2-10, as drawn (38° measured on the page); the figure gives no angle',
    },
    {
      group: 'Spacecraft',
      label: 'Hatch, forward edge above the heat shield’s rim',
      value: (151.62 - 103.44) * IN,
      unit: 'm',
      confidence: 'estimated',
      note: 'Z151.62 is a station of Project Gemini: A Technical Summary (NASA CR-1106), Figure 1, drawn at the hatch’s forward edge; that it is that edge is read off the drawing',
    },
    {
      group: 'Spacecraft',
      label: 'Weight at launch',
      value: 7111 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `7,111 lb (${CHRONOLOGY}); the press kit has "approximately 7,000 pounds", and about 4,700 lb for the re-entry module at landing`,
    },
    {
      group: 'Spacecraft',
      label: 'Adapter batteries',
      value: 3,
      unit: 'batteries',
      confidence: 'documented',
      note: `three silver-zinc batteries of 400 ampere-hours (${SEDR}, Section V; ${GIV}, 3.1.2.6, which gives the next ship six)`,
    },
    {
      group: 'Spacecraft',
      label: 'Seat cant, outboard',
      value: 12,
      unit: 'deg',
      confidence: 'documented',
      note: '12° outboard and 8° forward (SEDR 300, p. 3-3)',
    },
    {
      group: 'Spacecraft',
      label: 'Perigee at insertion',
      value: 87.0 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `87.0 nautical miles (${CHRONOLOGY})`,
    },
    {
      group: 'Spacecraft',
      label: 'Apogee at insertion',
      value: 121.0 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `121.0 nautical miles (the same table). ${TITANS}, p. 235, prints "122 by 175 kilometers" for this orbit, which agrees with neither`,
    },
    { group: 'Spacecraft', label: 'Period', value: 88.3 * 60, unit: 's', confidence: 'documented', note: '88.3 min (the same table)' },
    { group: 'Spacecraft', label: 'Inclination', value: 32.6, unit: 'deg', confidence: 'documented', note: '32.6° (the same table)' },
    {
      group: 'Spacecraft',
      label: 'Duration, liftoff to landing',
      value: 4 * 3600 + 52 * 60 + 31,
      unit: 's',
      confidence: 'documented',
      note: '4:52:31; retrofire at 4:33:23 and the burn before it at 4:21:23 (the same table)',
    },
    {
      group: 'Spacecraft',
      label: 'Landing short of the planned point',
      value: 60 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `60 nautical miles (the same table; and the text, p. 189); ${TITANS}, p. 236, has "about 84 kilometers", which is 45`,
    },
    {
      group: 'Launch vehicle',
      label: 'Height on the pad',
      value: (225.84 + 1071.278) * IN,
      unit: 'm',
      confidence: 'derived',
      note: `1,297.118 in: the spacecraft’s 225.84 in on the launch vehicle’s 1,071.278 in. The same figure follows from the next flight’s report, which puts the spacecraft’s tip at launch vehicle station 50.985 (${GIV}, Figure 3-1). The press kit says 109 ft; model: 32.947 m`,
    },
    {
      group: 'Launch vehicle',
      label: 'Launch vehicle length',
      value: 1071.278 * IN,
      unit: 'm',
      confidence: 'documented',
      note: `1,071.278 in, "89 ft 3.278 in": station 276.825 to station 1348.103 (${LAUNCH_SYSTEMS}, Figure II.C-1). ${GIV}, Figure 3-1, has the engines at station 1342.31`,
    },
    { group: 'Launch vehicle', label: 'Diameter', value: 120 * IN, unit: 'm', confidence: 'documented', note: '120 in (the same figure)' },
    {
      group: 'Launch vehicle',
      label: 'First stage length',
      value: 848.103 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '848.103 in, from the separation plane at station 500 to the engines’ exit (the same figure); the press kit says 63 ft and Figure II.C-2 70.65 ft',
    },
    {
      group: 'Launch vehicle',
      label: 'Second stage forward skirt',
      value: 22.326 * IN,
      unit: 'm',
      confidence: 'documented',
      note: 'station 276.825 to 299.151 (the same figure); "22.55 inches" in the report’s text (p. II.C-8), which also has its insulation at half thickness on this vehicle',
    },
    {
      group: 'Launch vehicle',
      label: 'Weight at liftoff, with the spacecraft',
      value: 340000 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `"about 340,000 pounds" (${KIT}, p. 39)`,
    },
    {
      group: 'Launch vehicle',
      label: 'Flight azimuth',
      value: 72,
      unit: 'deg',
      confidence: 'documented',
      note: `72° (${CHRONOLOGY}; the press kit, p. 7)`,
    },
  ],
  motors: [
    {
      name: 'Aerojet YLR87-AJ-7, first stage chamber',
      count: 2,
      thrustN: 215000 * LBF,
      burnS: 156,
      propellant: 'Aerozine 50 / nitrogen tetroxide',
      kind: 'liquid',
      confidence: 'documented',
      note: `"about 430,000 pounds of thrust at lift-off" for the two (${KIT}, p. 40; ${LAUNCH_SYSTEMS}, Figure II.C-2). The burn is the press kit’s planned staging time, 2 min 36 s; what this vehicle did is in a report not read`,
    },
    {
      name: 'Aerojet YLR91-AJ-7, second stage',
      count: 1,
      thrustN: 100000 * LBF,
      burnS: 182,
      propellant: 'Aerozine 50 / nitrogen tetroxide',
      kind: 'liquid',
      confidence: 'documented',
      note: '"about 100,000 pounds of thrust at altitude" (the same pages). The burn is the press kit’s plan, staging to cutoff at 5 min 38 s',
    },
    {
      name: 'Retrograde rocket',
      count: 4,
      thrustN: 2500 * LBF,
      burnS: 5.5,
      propellant: 'solid',
      kind: 'solid',
      confidence: 'documented',
      note: `"approximately 2500 pounds of thrust for 5.5 seconds", fired separately (${KIT}, p. 8); a titanium case "approximately 13 inches in diameter" (SEDR 300, p. 11-71)`,
    },
    {
      name: 'OAMS attitude thruster',
      count: 8,
      thrustN: 25 * LBF,
      propellant: 'monomethylhydrazine / nitrogen tetroxide',
      confidence: 'documented',
      note: 'eight of 25 lb (Gemini Midprogram Conference, NASA SP-121, p. 16, whose text is misprinted "95"; the Chronology, 27 March 1965, has "25-pound thrusters")',
    },
    {
      name: 'OAMS forward-firing thruster',
      count: 2,
      thrustN: 85 * LBF,
      propellant: 'monomethylhydrazine / nitrogen tetroxide',
      confidence: 'documented',
      note: 'two of 85 lb (NASA SP-121, p. 16)',
    },
    {
      name: 'OAMS aft-firing thruster',
      count: 2,
      thrustN: 100 * LBF,
      propellant: 'monomethylhydrazine / nitrogen tetroxide',
      confidence: 'documented',
      note: `"two 100-pound thrusters, located at the base of the spacecraft" (NASA SP-121, p. 16). The four other 100 lb chambers, which translate sideways, up and down, were dummies on this spacecraft (${GIV}, 3.1.2.7)`,
    },
    {
      name: 'Re-entry control thruster',
      count: 16,
      thrustN: 25 * LBF,
      propellant: 'monomethylhydrazine / nitrogen tetroxide',
      confidence: 'documented',
      note: `sixteen thrust chamber assemblies of 25 lb in two rings, burning monomethylhydrazine and nitrogen tetroxide (SEDR 300, Section VIII, pp. 8-281 to 8-284; ${GIV}, Figure 3-12)`,
    },
  ],
  models: [vehicle],
};

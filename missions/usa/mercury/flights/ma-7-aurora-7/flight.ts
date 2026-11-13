import type { Flight, ModelDef, Part } from '../../../../../src/types';
import { LC14 } from '../../sites/lc-14.ts';
import { ON_THE_PAD, periscopeMechanism, periscopeMoves } from '../../vehicles/periscope.ts';

const IN = 0.0254;
const FT = 0.3048;
const LB = 0.45359237;
const LBF = 4.4482216;
const NMI = 1852;
const DEG = Math.PI / 180;

// Where things are round the vehicle, as model/vehicle.py and vehicles/atlas_lv3b.py have them: degrees about the
// long axis. The capsule's are from the pilot's right; it stands turned so that its hatch is on +X, as a launch
// site's frame has it (mercury_capsule.stand): STAND is that turn. The numbers live there; these are quoted for the
// views and for how the parts come away.
const STAND = -315;
const WINDOW_AZ = 270 + STAND;
const HATCH_AZ = 315 + STAND;
const PERISCOPE_AZ = 90 + STAND;
/** The long equipment pod, and the booster engine under it: under the capsule's window. */
const POD_AZ = WINDOW_AZ;
/** The vernier beside which the vehicle's number is painted, and UNITED STATES down the tank. */
const VERNIER_AZ = POD_AZ + 90;
/** A direction on the model in the viewer's axes (+Y is the model's long axis; the model's +Y is the viewer's -Z). */
const along = (az: number, lift: number, by = 1): [number, number, number] => [
  by * Math.cos(az * DEG),
  by * lift,
  -by * Math.sin(az * DEG),
];

const REPORT = 'NASA TN D-3814';

/**
 * Aurora 7's periscope, out and in (vehicles/periscope.ts): when, as this flight went. How it moves is the model's
 * own, and No. 11's (mercury_capsule.ScopeWorks: no photograph of this side of No. 18 has been read).
 * - Out on the pad, and drawn in when the umbilical was thrown off: the pad's cameras show "umbilical ejection,
 *   periscope retraction and umbilical-door closure" (NASA TN D-3814, p. 18). Documented that it went in then. When
 *   in the count that was is not in anything read for this flight: 35 seconds before liftoff, as on MA-6. Estimated.
 * - Out at separation, 00:05:12.2 (the same report, Table XVI, p. 122): "Periscope is out" at 00:05:27 (NASA SP-6,
 *   the air-ground transcript, p. 78). Documented that it was out by then; the instant is the programme's.
 * - In thirty seconds after the retropack went, which was at 04:34:10.8 (Table XVI): that is the programme (SEDR 104,
 *   12-2), and "Retropack jettison and the retraction of the periscope occurred on time" (the pilot's report, p. 94);
 *   told at 04:36:05 that he would have to draw it in by hand, he answered "The scope did come in" (SP-6, p. 106).
 *   Derived.
 * - Out with the drogue, which Carpenter fired by hand at 04:50:54 (Table XVI): on this capsule "the emergency
 *   drogue-parachute-deployment switch was wired so that the periscope would extend" (p. 61). Derived: nothing read
 *   has the pilot say that it came out.
 * Each travel is the motor's five seconds (periscope.ts, TAKES).
 */
const PERISCOPE_EVENTS: [number, boolean][] = [
  [ON_THE_PAD, true],
  [-35, false],
  [312.2, true],
  [16480.8, false],
  [17454, true],
];
const PERISCOPE = periscopeMoves(PERISCOPE_EVENTS);

const parts: Part[] = [
  {
    node: 'EscapeTower',
    group: 'Spacecraft',
    name: 'Launch escape tower',
    summary: 'Pulls the capsule off a failing Atlas. It left 24 seconds after the booster engines.',
    detail:
      'A welded steel-tube pylon about ten feet tall carrying a solid motor of 52,000 lbf that burns for a second ' +
      'through three nozzles canted clear of the capsule. An Atlas could fail faster than a man could act, so an ' +
      'abort sensing system in the launch vehicle watched its tank pressures, its turning rates and its engines, ' +
      'and would have fired this by itself. On this flight one of its two switches on the sustainer’s hydraulic ' +
      'pressure did trip, at 4 minutes 25 seconds, on a sensing line frozen by leaking oxygen; it took both to ' +
      'abort, and by then the tower was long gone. Unused, it was released at T+2:32.2, and Carpenter watched it ' +
      'out of the window, "way off in the distance, heading straight for the horizon", turning slowly and trailing ' +
      'smoke. As built for the Redstone flights: nothing read gives a difference.',
    facts: [
      ['Escape motor', '52,000 lbf for about 1 s'],
      ['Nozzles', '3, canted'],
      ['Jettison motor', '800 lbf for 1.5 s'],
      ['Released', 'T+2:32.2, as planned to the tenth'],
      ['Fired by', 'the pilot, the ground, or the Atlas’s abort sensing system'],
    ],
    explode: [0, 7.6, 0],
    order: 1,
  },
  {
    node: 'AntennaCanister',
    group: 'Spacecraft',
    name: 'Antenna canister',
    summary: 'Bicone antenna, horizon scanners, drogue parachute, and a balloon in a can.',
    detail:
      'The pale band is a dielectric window: the metal above and below it are the two halves of a bicone antenna ' +
      'for voice, telemetry and command. Two infrared scanners find the horizon in pitch and roll and keep the ' +
      'attitude gyros true. On this flight the pitch scanner was wrong from the launch on, by about 18°, and the ' +
      'gyros followed it: it is why the capsule was pointing the wrong way at retrofire. It could never be ' +
      'examined, because the canister is thrown away with the main parachute. New for this flight, in a can under ' +
      'the flap on its top, was a 30 in balloon to be towed on a hundred feet of line. The drogue parachute is ' +
      'beside it; Carpenter, out of fuel and swinging through 45°, fired it by hand at 25,000 ft. Its shape is as ' +
      'built for the Redstone flights; the balloon’s can is drawn round its two liners, and its place is estimated.',
    facts: [
      ['Length', '24 in (0.61 m)'],
      ['Scanners', '2 infrared; the pitch one about 18° out'],
      ['Balloon', '30 in, five colours, on 100 ft of nylon'],
      ['Balloon out', '01:38:00; it never filled'],
      ['Drogue', 'by hand at 04:50:54, about 25,000 ft'],
    ],
    explode: [0, 6.6, 0],
    order: 2,
  },
  {
    node: 'RecoveryCompartment',
    group: 'Spacecraft',
    name: 'Recovery compartment',
    summary: 'Main and reserve parachutes; pitch and yaw thrusters; and, this once, the way out.',
    detail:
      'A 32-inch cylinder holding the 63-foot ring-sail main parachute and its reserve, skinned in thick beryllium ' +
      'plates that soak up heat where the cone’s thin shingles radiate it. A third barostat, added five days ' +
      'before launch so that no parachute could come out in orbit, read the cabin’s pressure, which lags the ' +
      'air’s: the main parachute did not come out at 10,600 ft, and Carpenter pulled it by hand at about 9,000. ' +
      'In the water, 250 miles from the nearest ship, with the capsule floating low and leaning 60°, he would not ' +
      'open the side hatch. He took out the small bulkhead and wormed up through this compartment instead, the ' +
      'first pilot to leave that way, and went into the sea from its top. In the entry he had seen a green glow ' +
      'round it, which nobody could explain.',
    facts: [
      ['Diameter', '32 in (0.81 m)'],
      ['Length', '22.8 in (0.58 m)'],
      ['Skin', 'beryllium plates, 0.22 in'],
      ['Main parachute', 'by hand at 04:51:48, about 9,000 ft'],
      ['Thrusters', 'pitch and yaw: 24 lbf and 1 lbf'],
    ],
    explode: [0, 5.8, 0],
    order: 3,
  },
  {
    node: 'Hatch',
    group: 'Spacecraft',
    name: 'Explosive hatch',
    summary: 'Seventy bolts and a fuse to break them. This one was never blown.',
    detail:
      'The hatch Liberty Bell 7 first carried: seventy quarter-inch titanium bolts, each drilled to weaken it, and ' +
      'a mild detonating fuse round the sill that breaks them all together when a plunger inside is struck. ' +
      'Bolting it on took twenty minutes of the count, from T-94 to T-74, and ten more to put the shingles back ' +
      'over it; Glenn’s had been delayed by a broken bolt, and this time all seventy lined up. It was not used. ' +
      'Carpenter left through the nose, and the hatch was unbolted on the deck of the destroyer that picked the ' +
      'capsule up six hours later, and found in excellent condition. Its place on the cone is as Liberty Bell ' +
      '7’s, which this capsule’s own photographs bear out: the emblem’s last letter ends at its edge.',
    facts: [
      ['Bolts', '70 of 1/4 in titanium, all in'],
      ['Released by', 'mild detonating fuse round the sill'],
      ['Closed', 'T-94 to T-74 min'],
      ['Blown', 'never: unbolted aboard USS John R. Pierce'],
    ],
    explode: along(HATCH_AZ, 4.26, 1.15),
    order: 4,
  },
  {
    node: 'Window',
    group: 'Spacecraft',
    name: 'Window',
    summary: 'In front of the pilot’s face. He used it to find out his instruments were wrong.',
    detail:
      'An outer pane of Vycor curved to the cone and, behind it in a well, three flat inner panes that hold the ' +
      'cabin’s pressure. The red filter Friendship 7 had carried for it was left off. Through it Carpenter ' +
      'photographed the horizon for navigation studies, the spent Atlas trailing ice crystals, and a balloon that ' +
      'would not fill; he found that knocking on the hatch sent a cloud of Glenn’s "fireflies" past it, which ' +
      'showed where they came from: the capsule itself. Late in the third orbit the horizon in the window and the ' +
      'attitude on the panel disagreed by some 20°, and he flew the retrofire by the window and the periscope. He saw ' +
      'fewer stars through it than from the ground. The panes’ sizes are the drawing’s; where the window stands ' +
      'along the cone is as Liberty Bell 7’s.',
    facts: [
      ['Outer pane', '21.0 in long, 11.25 in to 7.51 in wide, 0.35 in Vycor'],
      ['Inner panes', '12.95 in long, 9.49 in to 7.30 in wide; three'],
      ['Red filter', 'removed for this flight'],
      ['After the flight', 'clear; moisture between the outer panes'],
    ],
    explode: along(WINDOW_AZ, 4.9, 1.0),
    order: 4,
  },
  {
    node: 'Afterbody',
    group: 'Spacecraft',
    name: 'Conical afterbody',
    summary: 'René 41 shingles, an emblem of coloured rings, and one patch of white paint with a thermometer under it.',
    detail:
      'Nickel-alloy shingles 0.016 in thick, oxidised blue-black, each stiffened by beads pressed across it and ' +
      'held through oversized holes so that it can grow when hot. Carpenter named the capsule for the dawn and ' +
      'for a light in the sky, and sketched its emblem: a 7 through rings of coloured rays, with AURORA across ' +
      'its foot. Cecelia Bibby, who had lettered Friendship 7, painted it under the window. UNITED STATES stands ' +
      'on the cone twice, each with a flag under it. Over the first U is the flight’s quietest experiment: one ' +
      'shingle painted white, with a thermocouple under it and another under the bare shingle beside it. Going up ' +
      'the white one ran 300 °F cooler; in the heat of the entry, 200 °F hotter. A new commutator read 28 such ' +
      'temperatures all the way round. The periscope’s door is shut, as at liftoff. The paint is placed from ' +
      'photographs; the 7 is a typeface’s, not her brush; the shingles and the periscope’s door are laid out as ' +
      'Liberty Bell 7’s, but for the shingle under the window, which here has two stacks of beads.',
    facts: [
      ['Half-angle', '20°'],
      ['Length', '58.4 in (1.48 m)'],
      ['Skin', 'René 41 shingles, 0.016 in'],
      ['Paint', 'the Aurora 7 emblem; UNITED STATES and the flag, twice'],
      ['White patch', '300 °F cooler going up, 200 °F hotter coming down'],
      ['Painted by', 'Cecelia Bibby, to the pilot’s sketch'],
    ],
    // the periscope as this flight went (vehicles/periscope.ts): played on the clock, where there is one
    clocked: PERISCOPE,
    explode: [0, 4.9, 0],
    order: 4,
  },
  {
    node: 'CrewCabin',
    group: 'Spacecraft',
    inside: true,
    name: 'Crew cabin',
    summary: 'A couch, a panel with three gauges fewer, and a glass ball of green water.',
    detail:
      'Two thin titanium skins holding pure oxygen at about 5 psi, and the pilot on a couch moulded to his back, ' +
      'with a new, softer liner and without the knee and chest straps. The panel lost what had not earned its ' +
      'weight: the Earth-path indicator, the humidity and coolant gauges, the camera that watched the ' +
      'instruments. In that camera’s place, by the pilot’s head, went a glass ball a fifth full of green liquid ' +
      'with a tube standing in it, to see where a liquid goes when it weighs nothing: into the tube, as ' +
      'predicted. A new "maneuver" switch let him turn the capsule without the gyros following. He turned it a ' +
      'great deal, used both sets of jets at once without meaning to, and had spent most of his fuel by the third ' +
      'orbit; the cabin ran hot and the suit never cooled properly. The panel is Liberty Bell ' +
      '7’s drawing with the three instruments blanked; where the new switch and a new steam-temperature gauge ' +
      'stood is in no figure read.',
    facts: [
      ['Structure', 'two skins of 0.010 in titanium'],
      ['Atmosphere', 'pure oxygen, 5.1 psi'],
      ['Taken out', 'Earth-path indicator, humidity and coolant gauges, panel camera'],
      ['Put in', 'zero-gravity experiment; "maneuver" switch'],
      ['Zero-g sphere', '3 3/8 in glass, 60 ml of liquid'],
      ['Fuel', 'manual tank dry at retrofire; automatic during the entry'],
    ],
    explode: [0, 3.9, 0],
    order: 5,
  },
  {
    node: 'HeatShield',
    inside: true,
    group: 'Spacecraft',
    name: 'Heat shield',
    summary: 'Glass fibre and resin, made to char away. This one lost thirteen pounds and its centre plug.',
    detail:
      'From orbit there is too much heat for the slab of beryllium the Redstone capsules came down behind: this ' +
      'shield is glass fibre in resin, and the resin boils off and carries the heat away. It charred a third of ' +
      'an inch deep and lost 13.1 lb, a little more than any before it. The disc let into its middle was missing ' +
      'when the capsule was picked up, though the surface under it was not charred: it had come out after the ' +
      'heat. It is also the bottom of a cushion: before landing it is unlatched and drops four feet on a skirt of ' +
      'rubberised cloth. The two switches that report the latch, one of which had told the ground that Glenn’s ' +
      'shield was loose, were rewired so that both had to agree. After six hours in the swell every strap of the ' +
      'bag was broken.',
    facts: [
      ['Diameter', '74.5 in (1.89 m)'],
      ['Material', 'glass fibre and resin, ablating'],
      ['Lost in the entry', '13.1 lb; charred 0.3 to 0.35 in'],
      ['Centre plug', 'lost, after the heat'],
      ['Latch switches', 'two, rewired: both must close'],
    ],
    explode: [0, 3.3, 0],
    order: 6,
  },
  {
    node: 'Retropack',
    inside: true,
    group: 'Spacecraft',
    name: 'Retropack',
    summary: 'Three rockets to come home on, fired by hand three seconds late and 25 degrees off line.',
    detail:
      'Three solid motors of 1,000 lbf, fired five seconds apart, slow the capsule enough to fall out of orbit; ' +
      'three smaller ones had pushed it off the Atlas. The capsule’s clock would have fired them at 04:33:05, but ' +
      'only with the capsule held at the right attitude, and the gyros, misled by a bad horizon scanner, said it ' +
      'was not. Carpenter, flying by the window, pushed the button himself. They lit at 04:33:10, with the ' +
      'capsule yawed some 25° to one side, and gave about three per cent less than they should. Each error put ' +
      'the landing further on: 250 nautical miles in all. Smoke came into the cabin as they burned; it was a ' +
      'fuse. The pack was dropped a minute later, as planned.',
    facts: [
      ['Retro motors', '3 × 1,000 lbf, 10 s each'],
      ['Fired', '04:33:10.3, 04:33:15.3, 04:33:20.3: by hand'],
      ['Posigrade motors', '3 × 400 lbf, 1 s'],
      ['Jettisoned', '04:34:10.8'],
    ],
    explode: [0, 2.6, 0],
    order: 7,
  },
  {
    node: 'AtlasAdapter',
    group: 'Launch vehicle',
    name: 'Spacecraft adapter',
    summary: 'A ribbed titanium ring between a capsule and a balloon. The first Mercury-Atlas broke here.',
    detail:
      'About four feet of corrugated titanium, slightly tapered, bolted to the tank’s forward ring and holding the ' +
      'capsule by a clamp round its heat shield: three segments drawn tight by three explosive bolts. The ' +
      'retropack hangs down inside it, over a cup that keeps its debris off the oxygen tank’s thin dome. In July ' +
      '1960 the first Mercury-Atlas came apart a minute after launch, somewhere between the top of the tank and ' +
      'this ring; after that the adapter was stiffened and the tank’s forward skins made thicker. On this flight ' +
      'a microphone inside it listened to the tower leaving and the posigrade rockets firing. Carpenter heard two ' +
      'bangs, the clamp’s bolts and the posigrade rockets, and was weightless. As built for Atlas 109-D; the band’s red is that ' +
      'flight’s photographs’, and shows in this one’s.',
    facts: [
      ['Length', '50.75 in (1.29 m)'],
      ['Skin', 'corrugated titanium over a titanium inner skin'],
      ['Clamp ring', '3 segments, 3 explosive bolts'],
      ['Capsule released', 'T+5:12.2'],
      ['Stays with', 'the Atlas, into orbit'],
    ],
    explode: [0, 1.6, 0],
    order: 8,
  },
  {
    node: 'AtlasSustainer',
    group: 'Launch vehicle',
    inside: true,
    name: 'Sustainer engine',
    summary: 'One engine on the centreline, alight from the pad to orbit.',
    detail:
      'A single chamber of 57,000 lbf hung on a gimbal from the point of the fuel tank’s cone. It is lit on the ' +
      'ground with the boosters and burns on alone after they go until the guidance computer on the ground has ' +
      'the speed it wants: 25,717 ft/s on this flight, two more than the plan, at 5 minutes 9.9 seconds. The ' +
      'computer’s backup would have cut it off 0.44 second sooner and 110 ft/s short; a switch in the control ' +
      'centre kept that signal from being sent. A gauge on its hydraulics fell to nothing through the last two ' +
      'minutes, frozen by a leak of liquid oxygen, while the engine went on steering perfectly. Its place is ' +
      'scaled off a small drawing; its form is representative.',
    facts: [
      ['Thrust', '57,000 lbf (254 kN)'],
      ['Gimbal', '3° in pitch and yaw'],
      ['Cutoff', 'T+5:09.9, at 25,717 ft/s'],
      ['Pumps', 'its own; they feed the verniers too'],
    ],
    explode: [0, -3, 0],
    order: 9,
  },
  {
    node: 'AtlasVerniers',
    group: 'Launch vehicle',
    name: 'Vernier engines',
    summary: 'Two small engines on the tank’s sides: they roll it.',
    detail:
      'A single engine on the centreline cannot roll the vehicle, so two chambers of 1,000 lbf stand out from the ' +
      'foot of the tank, square to the equipment pods, each swivelling through 140° one way and 50° the other. ' +
      'Just after liftoff they and the boosters turn the Atlas from the way the pad faces to the way the flight ' +
      'goes. From one of them the oxygen tank’s pressurisation line runs up the outside of the tank to its top. ' +
      'The vehicle’s number, 107 D, is painted across the other, as the photographs of this liftoff show it. On ' +
      'a missile they burn on after the sustainer to trim the speed; on Mercury they do not.',
    facts: [
      ['Thrust', '1,000 lbf each (4.4 kN)'],
      ['Swivel', '140° in pitch, 50° in yaw'],
      ['Number', '107 D, either side of the fairing above one'],
      ['Fed by', 'the sustainer’s pumps'],
    ],
    explode: [0, 0, 0],
    order: 10,
  },
  {
    node: 'AtlasPods',
    group: 'Launch vehicle',
    name: 'Equipment pods',
    summary: 'What cannot go inside a balloon rides outside it.',
    detail:
      'The tank has no frames to hang anything on, so the electronics ride in fairings on its skin: a long pod on ' +
      'one side, a short one opposite, each standing over a booster engine. Guidance, the autopilot, telemetry and ' +
      'the range safety receivers are here, and Mercury’s own addition, the abort sensing system. After a ' +
      'review eight days before this launch the flight-control canisters in this vehicle were changed and the ' +
      'launch put back to the 24th. The guidance radar on the ' +
      'ground took hold of it 73 seconds up and steered it to within two feet a second of the speed asked for. ' +
      'Their outlines are scaled off a small drawing and the photographs of Atlas 109-D; what is in which pod is ' +
      'not established.',
    facts: [
      ['Pods', 'a long one and a short one, opposite'],
      ['Flight control canisters', 'replaced after 16 May'],
      ['Guidance', 'radio, locked on from T+73 s'],
      ['Stay with', 'the tank, when the booster section goes'],
    ],
    explode: [0, 0, 0],
    order: 10,
  },
  {
    node: 'AtlasTank',
    group: 'Launch vehicle',
    name: 'Tank section',
    summary: 'A stainless steel balloon ten feet across, thinner than a coin. This one kept its insulation.',
    detail:
      'The Atlas has no skeleton. Its body is one welded tank of stainless steel between 0.048 and 0.015 inch ' +
      'thick, liquid oxygen above a bulkhead and kerosene below, and it stands up only because it is kept blown ' +
      'up. Under that bulkhead the Atlas carried a layer of insulation held by a second, lighter one. On Glenn’s ' +
      'vehicle kerosene had leaked into it and both were cut out on the pad; Atlas 107-D kept them, the one ' +
      'difference of any size between the two, and they are in this model’s cutaway. At launch the oxygen tank is ' +
      'white with frost from the adapter down to the bulkhead, which hid UNITED STATES on its side; the model ' +
      'shows both. Empty, it followed Aurora 7 into orbit, and Carpenter photographed it falling behind and ' +
      'below, with a trail of ice crystals two or three times its own length streaming from the engine.',
    facts: [
      ['Diameter', '10 ft (3.05 m); about 70 in at the top'],
      ['Skin', 'stainless steel, 0.048 in to 0.015 in'],
      ['Held up by', 'its own pressure'],
      ['Insulation bulkhead', 'retained; removed from Atlas 109-D'],
      ['Marked', 'UNITED STATES; 107 D'],
    ],
    explode: [0, 0, 0],
    order: 11,
  },
  {
    node: 'AtlasBoosterSection',
    group: 'Launch vehicle',
    name: 'Booster section',
    summary: 'The half of a stage and a half: it is dropped two minutes up, with both booster engines in it.',
    detail:
      'The Atlas lights all its engines on the ground, where a failure to start can still be shut down, and then ' +
      'throws most of them away. This is what goes: a skirt round the foot of the tank carrying the two booster ' +
      'engines, their pumps and a fairing over each. It hangs from the tank’s thrust ring on a latch; at booster ' +
      'cutoff the latch lets go and the section slides off aft on tracks, over the sustainer engine, which burns ' +
      'on. For this vehicle the time it was to go was brought forward, from 131.3 to 130.1 seconds, to put the ' +
      'capsule nearer the middle of its window into orbit; it went at 128.6. Carpenter felt it as a small change ' +
      'in the light outside and saw a wisp of smoke. Its form is as built for Atlas 109-D, from the report’s ' +
      'drawings and photographs.',
    facts: [
      ['Width across the fairings', '16 ft (4.9 m)'],
      ['Staging, as set', '130.1 s (Atlas 109-D: 131.3 s)'],
      ['Booster engine cutoff', 'T+2:08.6'],
      ['Held by', 'a latch at the tank’s thrust ring'],
      ['Leaves on', 'jettison tracks, sliding aft'],
    ],
    explode: [0, -8.5, 0],
    order: 0,
  },
  {
    node: 'AtlasBoosterEngines',
    group: 'Launch vehicle',
    inside: true,
    name: 'Booster engines',
    summary: 'Two chambers of 154,000 lbf each, burning for the first two minutes.',
    detail:
      'Rocketdyne’s MA-2 engine group has three main chambers and two small ones, all burning kerosene and liquid ' +
      'oxygen and all lit on the pad. These are the two outboard chambers, each on a gimbal that swivels five ' +
      'degrees, fed by a pair of turbopumps that one gas generator drives. For this vehicle their main oxidiser ' +
      'valves were made of stainless steel in place of aluminium, which shrinks more in the cold, and their ' +
      'actuators were given a stabilising servo so that they need not be picked by hand. The vehicle was held ' +
      'down for 2.95 seconds with all five engines burning before it was let go. The chambers’ places are scaled ' +
      'off a small drawing; their form, and the pumps’, are representative.',
    facts: [
      ['Thrust', '154,000 lbf each (685 kN)'],
      ['Propellants', 'RP-1 kerosene and liquid oxygen'],
      ['Gimbal', '5° in pitch and yaw'],
      ['Burn', 'ignition to T+2:08.6'],
      ['Held down', '2.95 s, burning, before release'],
    ],
    explode: [0, -13, 0],
    order: 0,
  },
];

/** The booster engines' exit plane below the model's origin (the capsule's plane of maximum diameter), m: 67 ft 4 in of Atlas, the adapter and 1.06 in. */
const BASE = (808 + 50.75 + 1.06) * IN;
/** The spacecraft without its tower. */
const CAPSULE = ['AntennaCanister', 'RecoveryCompartment', 'Hatch', 'Window', 'Afterbody', 'CrewCabin', 'HeatShield', 'Retropack'];

const vehicle: ModelDef = {
  id: 'vehicle',
  name: 'Vehicle',
  url: 'models/usa/mercury/ma-7-aurora-7/vehicle.glb',
  scale: '29.07 m tall · spacecraft 7.91 m · to scale',
  // only the vehicle is built: it stands in the gallery, on its engines. Its launch site (Complex 14) is not built yet.
  backdrop: 'studio',
  slider: ['Assembled', 'Taken apart'],
  cutaway: true,
  specGroups: ['Spacecraft', 'Launch vehicle'],
  parts,
  // the periscope as it went on this flight (vehicles/periscope.ts): nothing works it by hand yet, the flight having no flight deck
  mechanisms: [periscopeMechanism(PERISCOPE_EVENTS)],
  position: [0, BASE, 0],
  // the two cabin lights, as Liberty Bell 7's: either side of the pilot's head, in the frame the capsule stands in
  lights: [
    { position: [0.304, 0.55, 0.092], colour: 0xfffaf2, intensity: 0.7, reach: 3 },
    { position: [0.092, 0.55, 0.304], colour: 0xfffaf2, intensity: 0.7, reach: 3 },
  ],
  home: 'stack',
  views: [
    // as the liftoff was photographed: a vernier and the number toward the eye, the pods at either hand
    { id: 'stack', label: 'Full stack', from: along(VERNIER_AZ - 22, 0.1) },
    // each of these is of named parts, so it stays on them as the slider takes the vehicle apart
    { id: 'spacecraft', label: 'Spacecraft', nodes: [...CAPSULE, 'EscapeTower'], from: along(WINDOW_AZ + 25, 0.1) },
    { id: 'capsule', label: 'Capsule', nodes: CAPSULE, from: along(WINDOW_AZ + 20, 0.15) },
    { id: 'emblem', label: 'Emblem', nodes: ['Window', 'Afterbody'], from: along(WINDOW_AZ + 4, 0.2) },
    { id: 'hatch', label: 'Hatch', nodes: ['Hatch'], from: along(HATCH_AZ + 8, 0.3) },
    { id: 'periscope', label: 'Periscope side', nodes: ['Afterbody'], from: along(PERISCOPE_AZ + 22, 0.2) },
    { id: 'adapter', label: 'Adapter', nodes: ['AtlasAdapter'], from: along(WINDOW_AZ - 20, 0.15) },
    { id: 'pod', label: 'Long pod', nodes: ['AtlasPods'], from: along(POD_AZ + 35, 0.1) },
    { id: 'booster', label: 'Booster section', nodes: ['AtlasBoosterSection', 'AtlasBoosterEngines'], from: along(VERNIER_AZ - 15, 0.05) },
    { id: 'engines', label: 'Engines', nodes: ['AtlasBoosterEngines', 'AtlasSustainer'], from: along(VERNIER_AZ - 30, -0.7) },
  ],
};

export const flight: Flight = {
  id: 'usa/mercury/ma-7-aurora-7',
  nation: 'USA',
  agency: 'NASA',
  program: 'Project Mercury',
  designation: 'Mercury-Atlas 7',
  callsign: 'Aurora 7',
  spacecraft: 'Mercury spacecraft No. 18 (McDonnell Aircraft)',
  launchVehicle: 'Mercury-Atlas, Atlas 107-D (Convair)',
  // 12:45:16 UTC: "Lift-off time for the MA-7 mission was 07:45:16.57 a.m. e.s.t.", and the report counts its times from
  // 07:45:16.00, range zero (NASA TN D-3814, p. 3)
  launch: '1962-05-24T12:45:16Z',
  launchSite: LC14.name,
  site: LC14,
  crew: ['M. Scott Carpenter'],
  summary:
    'The second American in orbit, and the first sent up to do science: a balloon on a string, a ball of green ' +
    'water, the horizon through filters. Three times round in 4 hours 56 minutes, with a horizon scanner that ' +
    'lied to the autopilot from the start; the fuel went, the retrorockets were fired by hand and late, and ' +
    'Aurora 7 came down 250 nautical miles beyond its ships.',
  facts: [
    { label: 'Liftoff', value: '24 May 1962, 12:45:16 UTC' },
    { label: 'Pilot', value: 'M. Scott Carpenter' },
    { label: 'Duration', value: '4 h 55 min 57 s' },
    { label: 'Orbits', value: '3' },
    { label: 'Orbit', value: '161 km by 268 km, 32.55°' },
    { label: 'Period', value: '88 min 32 s' },
    { label: 'Speed at cutoff', value: '28,219 km/h' },
    { label: 'Peak load', value: '7.8 g going up; 7.5 g coming down' },
    { label: 'Landing', value: '250 nautical miles long, north-east of Puerto Rico' },
    { label: 'Recovery', value: 'the pilot by helicopter to USS Intrepid; the capsule by USS John R. Pierce' },
  ],
  // NASA TN D-3814, Table XVI (p. 122) for the events; NASA SP-6's air-ground transcript (pp. 77 to 107) for what was
  // said and when; the balloon from TN D-3814, pp. 71 and 72
  timeline: [
    { t: 0, event: 'Liftoff, 07:45:16 EST' },
    { t: 128.6, event: 'Booster engine cutoff; the booster section is dropped' },
    { t: 152.2, event: 'Escape tower released' },
    { t: 309.9, event: 'Sustainer engine cutoff: 25,717 ft/s' },
    { t: 312.2, event: 'Spacecraft separation: posigrade rockets fire; Carpenter turns the capsule round by hand' },
    { t: 327, event: '"Periscope is out"' },
    { t: 5880, event: 'The balloon is thrown out; it does not fill' },
    { t: 11640, event: 'The balloon is cut loose, and stays: its line has fouled' },
    { t: 16356.5, event: 'Retrofire sequence begun; the gyros and the window disagree' },
    { t: 16390.3, event: 'Retrofire, by hand: three motors, five seconds apart' },
    { t: 16450.8, event: 'Retropack dropped' },
    { t: 16574.5, event: '"The scope did come in"' },
    { t: 17084, event: '0.05 g' },
    { t: 17454, event: 'Drogue parachute, by hand, at about 25,000 ft' },
    { t: 17508.2, event: 'Main parachute, by hand' },
    { t: 17757, event: 'Landing, 19°27′ N 63°59′ W' },
  ],
  specs: [
    {
      group: 'Spacecraft',
      label: 'Heat shield diameter',
      value: 74.5 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '74.5 in (NASA CR-649): the capsule’s mould line, the same for the ablation shield as for the heat sink',
    },
    { group: 'Spacecraft', label: 'Afterbody half-angle', value: 20, unit: 'deg', confidence: 'documented', note: 'NASA CR-649' },
    {
      group: 'Spacecraft',
      label: 'Length, retro nozzles to canister top',
      value: 131.57 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '131.57 in: Z77.50 to Z209.07 (SEDR 104, Figure 1-3); the report draws 6 ft 10 in from the adapter’s top (Results, Figure 4-11)',
    },
    {
      group: 'Spacecraft',
      label: 'Length with escape tower',
      value: 311.55 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '311.55 in: Z77.50 to Z389.05 (SEDR 104, Figure 1-3)',
    },
    {
      group: 'Spacecraft',
      label: 'Weight at launch',
      value: 4244.09 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `4,244.09 lb (${REPORT}, p. 7: the weight and balance table)`,
    },
    {
      group: 'Spacecraft',
      label: 'Weight in orbit',
      value: 2974.56 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: '2,974.56 lb in orbit; 2,663.36 lb at a normal entry; 2,557.70 lb at main parachute deployment; 2,407.83 lb afloat (the same table)',
    },
    {
      group: 'Spacecraft',
      label: 'Window, outer pane length',
      value: 21.0 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '21.00 in along the cone, 11.254 in wide at the heat shield’s end and 7.511 in at the nose’s (NASA SP-45, Figure 19-1: the Mercury spacecraft window)',
    },
    {
      group: 'Spacecraft',
      label: 'Window, middle of the outer pane above the widest plane',
      value: 35.8 * IN,
      unit: 'm',
      confidence: 'estimated',
      note: '35.8 in: as Liberty Bell 7’s, which was scaled off its own photographs; this capsule’s own (NASA S62-03907: the pane’s foot just above the seam the emblem’s shingle begins at) agree to the eye',
    },
    {
      group: 'Spacecraft',
      label: 'Hatch bolts',
      value: 70,
      unit: 'bolts',
      confidence: 'documented',
      note: 'seventy: "This time all 70 bolts were aligned properly" (This New Ocean, p. 447)',
    },
    {
      group: 'Spacecraft',
      label: 'Perigee',
      value: 86.87 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `86.87 nautical miles (${REPORT}, Table XVII, p. 123)`,
    },
    {
      group: 'Spacecraft',
      label: 'Apogee',
      value: 144.96 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: '144.96 nautical miles (the same table)',
    },
    {
      group: 'Spacecraft',
      label: 'Period',
      value: 88 * 60 + 32,
      unit: 's',
      confidence: 'documented',
      note: '88 min 32 s (the same table)',
    },
    {
      group: 'Spacecraft',
      label: 'Inclination',
      value: 32.55,
      unit: 'deg',
      confidence: 'documented',
      note: 'the same table',
    },
    {
      group: 'Spacecraft',
      label: 'Velocity at cutoff',
      value: 25717 * FT,
      unit: 'm/s',
      confidence: 'documented',
      note: '25,717 ft/s, space-fixed, at 527,859 ft, the flight path 0.0004° below level; 25,738 ft/s after the posigrade rockets (the same table)',
    },
    {
      group: 'Spacecraft',
      label: 'Greatest load',
      value: 7.8,
      unit: 'g',
      confidence: 'documented',
      note: '7.8 g on the way up and 7.5 g in the entry (the same table, p. 124)',
    },
    {
      group: 'Spacecraft',
      label: 'Greatest dynamic pressure going up',
      value: 967 * 47.880259,
      unit: 'Pa',
      confidence: 'documented',
      note: '967 lb/sq ft; 429 lb/sq ft in the entry (the same table, p. 124)',
    },
    {
      group: 'Spacecraft',
      label: 'Duration, liftoff to landing',
      value: 4 * 3600 + 55 * 60 + 57,
      unit: 's',
      confidence: 'documented',
      note: '04:55:57, by the capsule’s accelerometer (the same report, Table XVI, p. 122)',
    },
    {
      group: 'Launch vehicle',
      label: 'Height on the pad',
      value: 95 * FT + 4 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '95 ft 4 in, engines to the tower’s tip: the figure for Atlas 109-D and capsule 13 (Results of the First United States Manned Orbital Space Flight, Figure 4-11, p. 49), which this vehicle "did not differ in any major respect" from (NASA TN D-3814, p. 7); model: 29.067 m (1,144.36 in, by SEDR 104’s stations)',
    },
    {
      group: 'Launch vehicle',
      label: 'Atlas, engines to the adapter’s foot',
      value: 67 * FT + 4 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '67 ft 4 in (the same figure, and Figure 4-3)',
    },
    {
      group: 'Launch vehicle',
      label: 'Tank diameter',
      value: 10 * FT,
      unit: 'm',
      confidence: 'documented',
      note: '10 ft; "approximately 70 inches" at the top of the forward cone (NASA SP-45, p. 85)',
    },
    {
      group: 'Launch vehicle',
      label: 'Width across the booster fairings',
      value: 16 * FT,
      unit: 'm',
      confidence: 'documented',
      note: '16 ft (Results of the First United States Manned Orbital Space Flight, Figures 4-3 and 4-11); model: 16 ft 4 in, scaled off NASA SP-45, Figure 5-4',
    },
    {
      group: 'Launch vehicle',
      label: 'Adapter length',
      value: 50.75 * IN,
      unit: 'm',
      confidence: 'derived',
      note: '50.75 in: Z52.69 to Z103.44 (SEDR 104, Figure 1-3); the report draws 4 ft 3 in (Results, Figure 4-11)',
    },
    {
      group: 'Launch vehicle',
      label: 'Tank skin, thickest',
      value: 0.048 * IN,
      unit: 'm',
      confidence: 'documented',
      note: 'stainless steel sheet from 0.048 in to 0.015 in (NASA SP-45, p. 85); the four forward skins were thickened for Mercury after MA-1 (p. 95)',
    },
    {
      group: 'Launch vehicle',
      label: 'Thrust at liftoff',
      value: 360000 * LBF,
      unit: 'N',
      confidence: 'documented',
      note: '"approximately 360,000 pounds" (Results of the First United States Manned Orbital Space Flight, p. 45: of the Mercury-Atlas, not measured on 107-D); the engines’ ratings in NASA SP-45 (p. 85) add to 367,000 lbf',
    },
    {
      group: 'Launch vehicle',
      label: 'Heading at insertion',
      value: 77.6,
      unit: 'deg',
      confidence: 'documented',
      note: `77.60° east of north, space-fixed, at cutoff (${REPORT}, Table XVII, p. 123). On the pad the vehicle’s pitch axis lay on 105° (Results of the First United States Manned Orbital Space Flight, p. 46, of the same pad)`,
    },
  ],
  motors: [
    {
      name: 'Rocketdyne MA-2, booster chamber',
      count: 2,
      thrustN: 154000 * LBF,
      burnS: 128.6,
      propellant: 'RP-1 / liquid oxygen',
      kind: 'liquid',
      confidence: 'documented',
      note: `154,000 lbf each, rated (NASA SP-45, p. 85); the press kit for MA-9 gives 150,000. Cutoff on this flight at 00:02:08.6 (${REPORT}, Table XVI). No figure measured on Atlas 107-D has been read`,
    },
    {
      name: 'Rocketdyne MA-2, sustainer',
      count: 1,
      thrustN: 57000 * LBF,
      burnS: 309.9,
      propellant: 'RP-1 / liquid oxygen',
      kind: 'liquid',
      confidence: 'documented',
      note: '57,000 lbf, rated (NASA SP-45, p. 88); the press kit for MA-9 gives 60,000. Cutoff at 00:05:09.9 (the same table)',
    },
    {
      name: 'Rocketdyne MA-2, vernier',
      count: 2,
      thrustN: 1000 * LBF,
      burnS: 309.9,
      propellant: 'RP-1 / liquid oxygen',
      kind: 'liquid',
      confidence: 'documented',
      note: '1,000 lbf each (NASA SP-45, p. 88). Mercury’s Atlas had no vernier solo: they stopped with the sustainer',
    },
    {
      name: 'Escape motor',
      count: 1,
      thrustN: 52000 * LBF,
      burnS: 1,
      propellant: 'solid',
      kind: 'solid',
      confidence: 'documented',
      note: '52,000 lb for 1 s, nominal (NASA SP-6, p. 3)',
    },
    {
      name: 'Tower jettison motor',
      count: 1,
      thrustN: 800 * LBF,
      burnS: 1.5,
      propellant: 'solid',
      kind: 'solid',
      confidence: 'documented',
      note: '800 lb for 1.5 s, nominal (the same table)',
    },
    {
      name: 'Posigrade motor',
      count: 3,
      thrustN: 400 * LBF,
      burnS: 1,
      propellant: 'solid',
      kind: 'solid',
      confidence: 'documented',
      note: '400 lb for 1 s, nominal (the same table). On the missile these were retrorockets on the Atlas; Mercury moved them to the capsule (NASA SP-45, p. 93)',
    },
    {
      name: 'Retrograde motor',
      count: 3,
      thrustN: 1000 * LBF,
      burnS: 10,
      propellant: 'solid',
      kind: 'solid',
      confidence: 'documented',
      note: `1,000 lb for 10 s, nominal (the same table). Fired at 04:33:10.3, :15.3 and :20.3 (${REPORT}, Table XVI), about 3 per cent under their rating (NASA SP-6, p. 3)`,
    },
    {
      name: 'Pitch and yaw thruster, high',
      count: 4,
      thrustN: 24 * LBF,
      propellant: '90% hydrogen peroxide',
      confidence: 'documented',
      note: 'automatic system (Hammack and Heberlig). "The reaction control components were of the standard configuration" but for the 1 lb and 6 lb units (NASA SP-6, p. 4)',
    },
    {
      name: 'Roll thruster, high',
      count: 2,
      thrustN: 6 * LBF,
      propellant: '90% hydrogen peroxide',
      confidence: 'documented',
      note: 'automatic system (Hammack and Heberlig). For this flight its stainless steel screens were replaced with platinum (NASA SP-6, p. 5)',
    },
    {
      name: 'Attitude thruster, low',
      count: 6,
      thrustN: 1 * LBF,
      propellant: '90% hydrogen peroxide',
      confidence: 'documented',
      note: 'automatic system, all axes (Hammack and Heberlig). Changed after two of Friendship 7’s stopped: platinum screens, a fuel distribution plate, the metering orifice moved to the solenoid’s inlet (NASA SP-6, p. 5). All worked',
    },
  ],
  models: [vehicle],
};

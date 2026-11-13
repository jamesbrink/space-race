import type { Flight, ModelDef, Part } from '../../../../../src/types';
import { LC14 } from '../../sites/lc-14.ts';

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
/** The side of the pilot's feet: where every earlier capsule had its periscope, and this one a door for the umbilical. */
const FEET_AZ = 90 + STAND;
/** UNITED STATES to the left of the window, under the three white squares. */
const PATCHES_AZ = 200 + STAND;
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

const SUMMARY = 'NASA SP-45';

// No periscope: this capsule flew without one (NASA SP-45, Table 3-II, p. 52), so there is nothing here of what the
// earlier Mercury flights carry (vehicles/periscope.ts): no `clocked` moves on the afterbody, no mechanism.

const parts: Part[] = [
  {
    node: 'EscapeTower',
    group: 'Spacecraft',
    name: 'Launch escape tower',
    summary: 'Pulls the capsule off a failing Atlas. No manned flight ever needed it, and this was the last to carry one.',
    detail:
      'A welded steel-tube pylon about ten feet tall carrying a solid motor of 52,000 lbf that burns for a second ' +
      'through three nozzles canted clear of the capsule. An Atlas could fail faster than a man could act, so an ' +
      'abort sensing system in the launch vehicle watched its tank pressures, its turning rates and its engines, ' +
      'and would have fired this by itself. That winter two Atlases of a later model had failed for reasons nobody ' +
      'could give, and Mercury’s operations director warned his staff of it: after five good launches in a row it ' +
      'was easy to forget that the Atlas was a missile made over. The sixth went as well as any. The tower was ' +
      'let go 154 seconds up, 22 seconds after the booster engines stopped. As built for the Redstone flights: ' +
      'nothing read gives a difference.',
    facts: [
      ['Escape motor', '52,000 lbf for about 1 s'],
      ['Nozzles', '3, canted'],
      ['Jettison motor', '800 lbf for 1.5 s'],
      ['Released', 'T+2:34, at 289,399 ft'],
      ['Fired by', 'the pilot, the ground, or the Atlas’s abort sensing system'],
    ],
    explode: [0, 7.6, 0],
    order: 1,
  },
  {
    node: 'AntennaCanister',
    group: 'Spacecraft',
    name: 'Antenna canister',
    summary: 'Bicone antenna, horizon scanners, drogue parachute, and a balloon that never left its can.',
    detail:
      'The pale band is a dielectric window: the metal above and below it are the two halves of a bicone antenna ' +
      'for voice, telemetry and command. Two infrared scanners find the horizon in pitch and roll and keep the ' +
      'attitude gyros true; on a flight spent mostly drifting, with the autopilot off, they were seldom asked. ' +
      'Under the flap on its top is a can three inches across with a 30 in orange balloon folded in it, a ' +
      'second try at the experiment Aurora 7’s torn balloon had spoiled: tow it for an orbit on a hundred feet of ' +
      'line and weigh the pull of the air. At nine hours Cooper fired its squib, twice, and nothing came out. The ' +
      'canister is thrown away with the main parachute, so nobody ever found out why. He put the drogue out by ' +
      'hand at 42,000 ft. The canister’s shape is as built for the Redstone flights; the balloon’s can is drawn to ' +
      'its recorded width, and its depth and place are estimated.',
    facts: [
      ['Length', '24 in (0.61 m)'],
      ['Scanners', '2 infrared, pitch and roll'],
      ['Balloon', '30 in, orange, on 100 ft of nylon; in a 3 in can'],
      ['Balloon', 'tried at 09:00:20 and again; did not deploy'],
      ['Drogue', 'by hand at 34:14:31, 42,000 ft'],
    ],
    explode: [0, 6.6, 0],
    order: 2,
  },
  {
    node: 'RecoveryCompartment',
    group: 'Spacecraft',
    name: 'Recovery compartment',
    summary: 'Main and reserve parachutes, and the pitch and yaw thrusters that had to be fired by hand.',
    detail:
      'A 32-inch cylinder holding the 63-foot ring-sail main parachute and its reserve, skinned in thick beryllium ' +
      'plates that soak up heat where the cone’s thin shingles radiate it. The heavier one-day capsule had worried ' +
      'the parachute’s makers enough for a whole series of drops, Project Reef, before it was trusted. Round the ' +
      'compartment’s foot are the pitch and yaw jets. With the autopilot dead for the last three orbits Cooper ' +
      'worked them through the fly-by-wire and manual valves himself, through the retrofire and all the way down, ' +
      'and for a moment in the entry fired the big yaw jet by mistake. The main parachute came out at 34:16; the ' +
      'capsule landed four and a half miles from the carrier, and he stayed in it until it was on deck.',
    facts: [
      ['Diameter', '32 in (0.81 m)'],
      ['Length', '22.8 in (0.58 m)'],
      ['Skin', 'beryllium plates, 0.22 in'],
      ['Main parachute', '63 ft ring-sail; out at 34:16:03'],
      ['Thrusters', 'pitch and yaw: 24 lbf and 1 lbf'],
    ],
    explode: [0, 5.8, 0],
    order: 3,
  },
  {
    node: 'Hatch',
    group: 'Spacecraft',
    name: 'Explosive hatch',
    summary: 'Seventy bolts and a fuse to break them: blown on the carrier’s deck, forty minutes after landing.',
    detail:
      'The hatch Liberty Bell 7 first carried: seventy quarter-inch titanium bolts, each drilled to weaken it, and ' +
      'a mild detonating fuse round the sill that breaks them all together when a plunger inside is struck. On 14 ' +
      'May Cooper was sealed in behind it at 6:36 in the morning and lay there past noon, while a diesel that ' +
      'would not start kept the gantry on the pad and a radar in Bermuda went wrong; the launch was put off, the ' +
      'hatch came off, and he went fishing. The next morning it went on again and stayed on for a day and a half. ' +
      'He rode the capsule on to the deck of USS Kearsarge, as Schirra had ridden his, and blew it there. Its ' +
      'place on the cone is as Liberty Bell 7’s, which this capsule’s photographs bear out.',
    facts: [
      ['Bolts', '70 of 1/4 in titanium'],
      ['Released by', 'mild detonating fuse round the sill'],
      ['First closed', '14 May, for a launch that was put off'],
      ['Blown', 'on the deck of USS Kearsarge'],
    ],
    explode: along(HATCH_AZ, 4.26, 1.15),
    order: 4,
  },
  {
    node: 'Window',
    group: 'Spacecraft',
    name: 'Window',
    summary: 'The only way to see out, and at the end the only instrument he had to steer by.',
    detail:
      'An outer pane of Vycor curved to the cone and, behind it in a well, three flat inner panes that hold the ' +
      'cabin’s pressure. Every Mercury pilot before had a periscope as well; Carpenter and Schirra had both said ' +
      'the window was enough, and for this flight the periscope’s 76 pounds went to batteries and water. Lines ' +
      'scribed on the pane show where the horizon should lie for retrofire. When a short circuit took the ' +
      'autopilot away on the 21st orbit, Cooper put the horizon on those lines and held it there by hand, 34° ' +
      'nose down, while the rockets burned. Through it he photographed Tibet and the Himalayas and the glow of ' +
      'the night air, and said he could see roads, villages and the smoke of chimneys, which was more than those ' +
      'on the ground had thought possible. The panes’ sizes are the drawing’s; where the window stands along the ' +
      'cone is as Liberty Bell 7’s.',
    facts: [
      ['Outer pane', '21.0 in long, 11.25 in to 7.51 in wide, 0.35 in Vycor'],
      ['Inner panes', '12.95 in long, 9.49 in to 7.30 in wide; three'],
      ['Periscope', 'none on this capsule'],
      ['In flight', 'an oily film on the outer pane from the second orbit'],
    ],
    explode: along(WINDOW_AZ, 4.9, 1.0),
    order: 4,
  },
  {
    node: 'Afterbody',
    group: 'Spacecraft',
    name: 'Conical afterbody',
    summary: 'René 41 shingles, a white star that says FAITH 7, three squares of white paint, and no periscope.',
    detail:
      'Nickel-alloy shingles 0.016 in thick, oxidised blue-black, each stiffened by beads pressed across it and ' +
      'held through oversized holes so that it can grow when hot. Under the window is the name Cooper was months ' +
      'in choosing, on a white field. UNITED STATES stands on the cone twice, each with a flag under ' +
      'it. Above the first are three six-inch squares of three white coatings, baked on to one shingle, to see ' +
      'which would come through the entry: a capsule that is to stay up for days should be white. What is missing ' +
      'is the periscope. Where its door had been, on the side of the pilot’s feet, there is only a small sprung ' +
      'door over the socket the ground’s umbilical plugged into. The paint is placed from photographs. The emblem ' +
      'is photographed only edge on, and is drawn as the star of the flight’s later insignia; the umbilical’s ' +
      'door is where the umbilical was on Liberty Bell 7, the one photograph of that side showing a plain plate ' +
      'and no more; the shingles’ seams on the side of the white squares are this capsule’s own, from a ' +
      'photograph taken as it floated, and elsewhere Liberty Bell 7’s.',
    facts: [
      ['Half-angle', '20°'],
      ['Length', '58.4 in (1.48 m)'],
      ['Skin', 'René 41 shingles, 0.016 in'],
      ['Paint', 'FAITH 7 on a white field; UNITED STATES and the flag, twice'],
      ['White patches', 'three 6 in squares on one shingle'],
      ['Periscope', 'deleted: 76 lb saved'],
    ],
    explode: [0, 4.9, 0],
    order: 4,
  },
  {
    node: 'CrewCabin',
    group: 'Spacecraft',
    inside: true,
    name: 'Crew cabin',
    summary: 'A day and a half of air, water and power, a panel where the periscope was, and a television camera.',
    detail:
      'Two thin titanium skins holding pure oxygen at about 5 psi, and the pilot on a couch moulded to his back. ' +
      'The capsule had been built for four and a half hours; for thirty-four it was given a second oxygen bottle, ' +
      'nine more pounds of cooling water and four and a half of drinking water, tanks and hand pumps to move urine ' +
      'and condensate about, and 183 changes in all. The middle of the panel, which had been the periscope’s ' +
      'screen, now carried a temperature gauge that two switches could point at a dozen and more places, the fuel ' +
      'gauges, and switches for the programmer, the experiments and a television camera. The camera, the first ' +
      'on an American manned spacecraft, sat by his right hand and sent a picture every two seconds. After ' +
      'thirteen and a half hours he was told to send everyone away and sleep, and did, soundly enough to surprise ' +
      'himself. The middle panel and the sequence lights are laid out from one small drawing of this panel; the ' +
      'rest is still Liberty Bell 7’s drawing, which that figure shows it was not.',
    facts: [
      ['Structure', 'two skins of 0.010 in titanium'],
      ['Atmosphere', 'pure oxygen, 5.1 psi'],
      ['Taken out', 'periscope; rate control system; backup UHF and telemetry transmitters'],
      ['Put in', '4 lb of oxygen, 9 lb of cooling water, 4.5 lb of drinking water, 15 lb more fuel capacity'],
      ['Television', 'slow-scan: one frame in 2 s; camera 10 lb'],
      ['Changes for the flight', '183'],
    ],
    explode: [0, 3.9, 0],
    order: 5,
  },
  {
    node: 'HeatShield',
    inside: true,
    group: 'Spacecraft',
    name: 'Heat shield',
    summary: 'Glass fibre and resin, made to char away. Flown down by hand.',
    detail:
      'From orbit there is too much heat for the slab of beryllium the Redstone capsules came down behind: this ' +
      'shield is glass fibre in resin, and the resin boils off and carries the heat away. It is also the bottom of ' +
      'a cushion: before landing it is unlatched and drops four feet on a skirt of rubberised cloth. On every ' +
      'earlier flight the autopilot held it square to the air and rolled the capsule slowly through the heat. This ' +
      'time the autopilot’s power had failed, and Cooper held it himself on the fly-by-wire jets, damping swings ' +
      'that grew below 95,000 ft, until the drogue steadied it. A third peroxide tank was added for the long ' +
      'flight, against the big bulkhead behind this shield; it is not modelled.',
    facts: [
      ['Diameter', '74.5 in (1.89 m)'],
      ['Material', 'glass fibre and resin, ablating'],
      ['Entry', 'flown by hand; 0.05 g at about 34:09'],
      ['Landing bag', '"down and green" at 34:16:14'],
    ],
    explode: [0, 3.3, 0],
    order: 6,
  },
  {
    node: 'Retropack',
    inside: true,
    group: 'Spacecraft',
    name: 'Retropack',
    summary: 'Three rockets to come home on, a flashing ball to throw away, and two Geiger tubes.',
    detail:
      'Three solid motors of 1,000 lbf, fired five seconds apart, slow the capsule enough to fall out of orbit; ' +
      'three smaller ones had pushed it off the Atlas. For this flight the pack was also a shelf for experiments. ' +
      'In a canister on its corner rode a ten-pound ball with a xenon flash lamp at each pole. Three hours 25 ' +
      'minutes up, Cooper pitched the capsule down and a spring threw the ball toward the Earth at ten feet a ' +
      'second; he found it flashing among the stars on the next night and the one after, the first satellite ' +
      'launched from a manned spacecraft. Beside the nozzles a package of two Geiger tubes counted what was left ' +
      'of the electron belt a hydrogen bomb had made the summer before. Thirty-four hours up, with no autopilot, ' +
      'he fired the three rockets by hand on John Glenn’s count from a ship off Japan, and dropped the pack by ' +
      'hand a minute later. The canister’s place is scaled off a sketch and the tubes’ box is ours.',
    facts: [
      ['Retro motors', '3 × 1,000 lbf, 10 s each'],
      ['Fired', '33:59:53, by hand'],
      ['Posigrade motors', '3 × 400 lbf, 1 s'],
      ['Flashing beacon', '5.75 in ball, 10 lb; out at 03:25, at 10 ft/s'],
      ['Jettisoned', '34:01:01, by hand'],
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
      'this ring; after that the adapter was stiffened and the tank’s forward skins made thicker. Capsule and ' +
      'Atlas were joined here on 22 April 1963. A second or so after the sustainer stopped, the clamp let go: "I ' +
      'have SECO, sep cap." As built for Atlas 109-D; the band’s red is that flight’s photographs’, and shows in ' +
      'this one’s.',
    facts: [
      ['Length', '50.75 in (1.29 m)'],
      ['Skin', 'corrugated titanium over a titanium inner skin'],
      ['Clamp ring', '3 segments, 3 explosive bolts'],
      ['Mated', '22 April 1963'],
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
      'ground with the boosters and burns on alone after they go, until the guidance computer on the ground has ' +
      'the speed it wants. On this flight that came at 303.03 seconds, a second sooner than planned, a few feet a ' +
      'second fast, 500 ft low and five thousandths of a degree off level: "smack dab in the middle of the go ' +
      'plot", Schirra told him from the Cape. Cooper turned round and watched the empty Atlas for eight minutes, ' +
      '"silvery as can be with a white frosty band right around the middle". Its place is scaled off a small ' +
      'drawing; its form is representative.',
    facts: [
      ['Thrust', '57,000 lbf (254 kN)'],
      ['Gimbal', '3° in pitch and yaw'],
      ['Cutoff', 'T+5:03.03, about 1 s early'],
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
      'Two seconds after liftoff they and the boosters began to turn the Atlas from the way the pad faces to its ' +
      'heading of 72°, and had done it by fifteen. From one of them the oxygen tank’s pressurisation line runs up ' +
      'the outside of the tank to its top. The vehicle’s number, 130 D, is painted across the other, as a ' +
      'photograph taken the day before the launch shows it. On a missile they burn on after the sustainer to trim ' +
      'the speed; on Mercury they do not.',
    facts: [
      ['Thrust', '1,000 lbf each (4.4 kN)'],
      ['Swivel', '140° in pitch, 50° in yaw'],
      ['Number', '130 D, either side of the fairing above one'],
      ['Roll programme', 'T+2 s to T+15 s, to 72°'],
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
      'the range safety receivers are here, and Mercury’s own addition, the abort sensing system. The count’s only ' +
      'unplanned hold, four minutes at T-11:30, was for a flutter in the guidance signal that was put down to ' +
      'some radio source outside it. The autopilot’s gains were within limits but low, and the propellants ' +
      'sloshed more than on most Mercury launches between 55 and 120 seconds; it damped out. Their outlines are ' +
      'scaled off a small drawing and the photographs of Atlas 109-D; what is in which pod is not established.',
    facts: [
      ['Pods', 'a long one and a short one, opposite'],
      ['Guidance', 'radio: General Electric Mod III, on the ground'],
      ['Unplanned hold', '4 min at T-11:30'],
      ['Stay with', 'the tank, when the booster section goes'],
    ],
    explode: [0, 0, 0],
    order: 10,
  },
  {
    node: 'AtlasTank',
    group: 'Launch vehicle',
    name: 'Tank section',
    summary: 'A stainless steel balloon ten feet across, thinner than a coin. The last to carry a Mercury.',
    detail:
      'The Atlas has no skeleton. Its body is one welded tank of stainless steel between 0.048 and 0.015 inch ' +
      'thick, liquid oxygen above a bulkhead and kerosene below, and it stands up only because it is kept blown ' +
      'up. Atlas 130-D was the tenth and last to launch a Mercury capsule and the sixth in a row to put one in ' +
      'orbit. It was rolled out of the San Diego factory on 30 January 1963, failed its inspection and went back ' +
      'for rewiring; when it came out again in March it was the first Mercury Atlas accepted without a single ' +
      'recorded discrepancy. The layer of insulation under the middle bulkhead, which had leaked on Glenn’s ' +
      'vehicle, had by then been taken out of the production line. At launch the oxygen tank is white with frost ' +
      'from the adapter down to the bulkhead, which hid UNITED STATES on its side; the model shows both.',
    facts: [
      ['Diameter', '10 ft (3.05 m); about 70 in at the top'],
      ['Skin', 'stainless steel, 0.048 in to 0.015 in'],
      ['Held up by', 'its own pressure'],
      ['Insulation bulkhead', 'none: deleted in production'],
      ['Marked', 'UNITED STATES; 130 D'],
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
      'cutoff the sustainer is centred so that the skirt will clear it, the latch lets go and the section slides ' +
      'off aft on tracks. On this flight the engines stopped at 132.5 seconds and the section left at 135.4. ' +
      'Cooper heard it: "a loud glung and then a sharp, crisp thud". Its form is as built for Atlas 109-D, from ' +
      'that flight’s report’s drawings and photographs.',
    facts: [
      ['Width across the fairings', '16 ft (4.9 m)'],
      ['Booster engine cutoff', 'T+2:12.5'],
      ['Section dropped', 'T+2:15.4, at 213,289 ft'],
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
    summary: 'Two chambers of 154,000 lbf each, set a little askew on purpose.',
    detail:
      'Rocketdyne’s MA-2 engine group has three main chambers and two small ones, all burning kerosene and liquid ' +
      'oxygen and all lit on the pad. These are the two outboard chambers, each on a gimbal that swivels five ' +
      'degrees, fed by a pair of turbopumps that one gas generator drives. An Atlas twists as it leaves its ' +
      'launcher, and Schirra’s had twisted hard enough to come within a fifth of the rate at which the abort ' +
      'system would have fired his escape rocket. Half of it was traced to the slanted exhaust of the turbopump; ' +
      'the engines’ own test records pointed the same way. So for this vehicle the two booster engines were ' +
      'mounted slightly out of line, to push the other way, and the twist it left its launcher with was small ' +
      'and soon corrected. They had injectors with baffles, against rough burning, and were lit by a fluid that ' +
      'ignites on meeting oxygen, so the vehicle was held down no longer than the two seconds it takes to see ' +
      'that all five are burning. The chambers’ places are scaled off a small drawing; their form, and the ' +
      'pumps’, are representative: the offset is too small to draw.',
    facts: [
      ['Thrust', '154,000 lbf each (685 kN)'],
      ['Propellants', 'RP-1 kerosene and liquid oxygen'],
      ['Gimbal', '5° in pitch and yaw'],
      ['Burn', 'ignition to T+2:12.5'],
      ['New for this vehicle', 'alignment offset against the liftoff roll'],
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
  url: 'models/usa/mercury/ma-9-faith-7/vehicle.glb',
  scale: '29.07 m tall · spacecraft 7.91 m · to scale',
  // only the vehicle is built: it stands in the gallery, on its engines. Its launch site (Complex 14) is not built yet.
  backdrop: 'studio',
  slider: ['Assembled', 'Taken apart'],
  cutaway: true,
  specGroups: ['Spacecraft', 'Launch vehicle'],
  parts,
  position: [0, BASE, 0],
  // the two cabin lights, as Liberty Bell 7's: either side of the pilot's head, in the frame the capsule stands in
  lights: [
    { position: [0.304, 0.55, 0.092], colour: 0xfffaf2, intensity: 0.7, reach: 3 },
    { position: [0.092, 0.55, 0.304], colour: 0xfffaf2, intensity: 0.7, reach: 3 },
  ],
  home: 'stack',
  views: [
    // as it was photographed on the pad the day before: a vernier and the number toward the eye, the pods at either hand
    { id: 'stack', label: 'Full stack', from: along(VERNIER_AZ - 22, 0.1) },
    // each of these is of named parts, so it stays on them as the slider takes the vehicle apart
    { id: 'spacecraft', label: 'Spacecraft', nodes: [...CAPSULE, 'EscapeTower'], from: along(WINDOW_AZ + 25, 0.1) },
    { id: 'capsule', label: 'Capsule', nodes: CAPSULE, from: along(WINDOW_AZ + 20, 0.15) },
    { id: 'emblem', label: 'Emblem', nodes: ['Window', 'Afterbody'], from: along(WINDOW_AZ + 4, 0.2) },
    { id: 'patches', label: 'White patches', nodes: ['Afterbody'], from: along(PATCHES_AZ, 0.2) },
    { id: 'hatch', label: 'Hatch', nodes: ['Hatch'], from: along(HATCH_AZ + 8, 0.3) },
    { id: 'umbilical', label: 'Where the periscope was', nodes: ['Afterbody'], from: along(FEET_AZ + 22, 0.2) },
    { id: 'retropack', label: 'Retropack', nodes: ['Retropack', 'HeatShield'], from: along(FEET_AZ - 30, -0.45) },
    { id: 'adapter', label: 'Adapter', nodes: ['AtlasAdapter'], from: along(WINDOW_AZ - 20, 0.15) },
    { id: 'pod', label: 'Long pod', nodes: ['AtlasPods'], from: along(POD_AZ + 35, 0.1) },
    { id: 'booster', label: 'Booster section', nodes: ['AtlasBoosterSection', 'AtlasBoosterEngines'], from: along(VERNIER_AZ - 15, 0.05) },
    { id: 'engines', label: 'Engines', nodes: ['AtlasBoosterEngines', 'AtlasSustainer'], from: along(VERNIER_AZ - 30, -0.7) },
  ],
};

export const flight: Flight = {
  id: 'usa/mercury/ma-9-faith-7',
  nation: 'USA',
  agency: 'NASA',
  program: 'Project Mercury',
  designation: 'Mercury-Atlas 9',
  callsign: 'Faith 7',
  spacecraft: 'Mercury spacecraft No. 20 (McDonnell Aircraft)',
  launchVehicle: 'Mercury-Atlas, Atlas 130-D (Convair)',
  // 13:04:13 UTC: "Lift-off occurred at 8:04:13 a.m. e.s.t., on May 15, 1963" (NASA SP-45, p. 103)
  launch: '1963-05-15T13:04:13Z',
  launchSite: LC14.name,
  site: LC14,
  crew: ['L. Gordon Cooper, Jr.'],
  summary:
    'The last Mercury, and the longest: 22 orbits in 34 hours 20 minutes, in a capsule built for four and a half ' +
    'and changed in 183 ways to last a day. Cooper threw a flashing beacon out and found it again, slept, and saw ' +
    'more of the ground than anyone would believe. Then a short circuit took the autopilot, and he flew the ' +
    'retrofire and the entry by hand, by the window, to four and a half miles from the carrier.',
  facts: [
    { label: 'Liftoff', value: '15 May 1963, 13:04:13 UTC' },
    { label: 'Pilot', value: 'L. Gordon Cooper, Jr.' },
    { label: 'Duration', value: '34 h 19 min 49 s' },
    { label: 'Orbits', value: '22' },
    { label: 'Orbit', value: '161 km by 267 km, 32.55°' },
    { label: 'Period', value: '88 min 45 s' },
    { label: 'Speed in orbit', value: '28,239 km/h' },
    { label: 'Retrofire', value: 'by hand, at 33:59:53' },
    { label: 'Landing', value: '27°23′ N 176°35′ W, south-east of Midway, about 4½ miles from the carrier' },
    { label: 'Recovery', value: 'capsule and pilot together, aboard USS Kearsarge in 40 minutes' },
  ],
  // NASA SP-45: the launch vehicle's times from p. 103, what was said and when from the air-ground transcript
  // (pp. 385 to 441); the tower's release from The Triumph of Astronaut L. Gordon Cooper, Jr. and the Faith 7, p. 11
  timeline: [
    { t: 0, event: 'Liftoff, 08:04:13 EST' },
    { t: 132.5, event: 'Booster engine cutoff' },
    { t: 135.4, event: 'The booster section is dropped' },
    { t: 154, event: 'Escape tower released' },
    { t: 303.03, event: 'Sustainer engine cutoff, a second early' },
    { t: 304, event: 'Spacecraft separation: "I have SECO, sep cap"' },
    { t: 12300, event: 'The flashing beacon is thrown out, toward the Earth' },
    { t: 32420, event: 'The balloon’s squib is fired; nothing comes out' },
    { t: 122393, event: 'Retrofire, by hand, on a count from the ground' },
    { t: 122461, event: 'Retropack dropped, by hand' },
    { t: 122959, event: '0.05 g' },
    { t: 123271, event: 'Drogue parachute, by hand, at 42,000 ft' },
    { t: 123363, event: 'Main parachute' },
    { t: 123589, event: 'Landing, 27°22.6′ N 176°35.3′ W' },
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
      note: '131.57 in: Z77.50 to Z209.07 (SEDR 104, Figure 1-3). The MA-9 press kit gives "nine and one-half feet tall", which is from the heat shield',
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
      label: 'Weight in orbit',
      value: 3026.3 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: '3,026.3 lb: the figure the capsule had grown to in preparation (This New Ocean, p. 490, which calls it "an estimated weight"). The press kit gives "about 4,000 pounds" at launch, "about 3,000" in orbit and 2,400 afloat. No weight and balance table for this capsule has been read',
    },
    {
      group: 'Spacecraft',
      label: 'Periscope and its ballast, taken out',
      value: 76 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `76 lb (${SUMMARY}, Table 3-II, p. 52; This New Ocean, p. 490); the press kit says 75`,
    },
    {
      group: 'Spacecraft',
      label: 'Flashing beacon, diameter',
      value: 5.75 * IN,
      unit: 'm',
      confidence: 'documented',
      note: `5.75 in, "weighing about 10 pounds", thrown out at 10 ft/s (${SUMMARY}, p. 218)`,
    },
    {
      group: 'Spacecraft',
      label: 'Flashing beacon, its line of ejection from the long axis',
      value: 68,
      unit: 'deg',
      confidence: 'derived',
      note: `88° below the horizon with the capsule pitched 20° down (${SUMMARY}, p. 219 and Figure 12-5)`,
    },
    {
      group: 'Spacecraft',
      label: 'White paint patches, side',
      value: 6 * IN,
      unit: 'm',
      confidence: 'documented',
      note: 'three 6 in squares "baked onto a single test shingle located at the small end of the conical section" (The Triumph of Astronaut L. Gordon Cooper, Jr. and the Faith 7, p. 21)',
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
      note: '35.8 in: as Liberty Bell 7’s, which was scaled off its own photographs; this capsule’s (NASA S63-06259: the window’s cover standing over the emblem) do not disagree',
    },
    {
      group: 'Spacecraft',
      label: 'Control fuel',
      value: 66 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: '66 lb of hydrogen peroxide: 42 lb for the automatic system and 24 lb for the manual, in three tanks that could be joined (the MA-9 press kit, p. 30). The new tank held 15 lb and was "intentionally serviced" with 10 (NASA SP-45, Table 3-II)',
    },
    {
      group: 'Spacecraft',
      label: 'Perigee',
      value: 87.2 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `87.2 nautical miles (${SUMMARY}, p. 13)`,
    },
    {
      group: 'Spacecraft',
      label: 'Apogee',
      value: 144.2 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `144.2 nautical miles (${SUMMARY}, p. 13); the Canaries told the pilot 144.6 on the first pass`,
    },
    {
      group: 'Spacecraft',
      label: 'Period',
      value: 88 * 60 + 45,
      unit: 's',
      confidence: 'documented',
      note: '88 min 45 s (This New Ocean, p. 496)',
    },
    {
      group: 'Spacecraft',
      label: 'Inclination',
      value: 32.55,
      unit: 'deg',
      confidence: 'documented',
      note: 'This New Ocean, p. 496',
    },
    {
      group: 'Spacecraft',
      label: 'Speed in orbit',
      value: 17547 * 0.44704,
      unit: 'm/s',
      confidence: 'documented',
      note: '17,547 miles an hour over Bermuda (This New Ocean, p. 494); "25,700 feet per second" at cutoff (The Triumph of Astronaut L. Gordon Cooper, Jr. and the Faith 7, p. 11)',
    },
    {
      group: 'Spacecraft',
      label: 'Duration, liftoff to landing',
      value: 34 * 3600 + 19 * 60 + 49,
      unit: 's',
      confidence: 'documented',
      note: `34:19:49 (${SUMMARY}, Table 3-I, p. 51)`,
    },
    {
      group: 'Launch vehicle',
      label: 'Height on the pad',
      value: 95 * FT + 4 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '95 ft 4 in, engines to the tower’s tip: the figure for Atlas 109-D and capsule 13 (Results of the First United States Manned Orbital Space Flight, Figure 4-11, p. 49); nothing read gives another for this vehicle; model: 29.067 m (1,144.36 in, by SEDR 104’s stations)',
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
      note: '"approximately 360,000 pounds" (Results of the First United States Manned Orbital Space Flight, p. 45: of the Mercury-Atlas, not measured on 130-D); the engines’ ratings in NASA SP-45 (p. 85) add to 367,000 lbf, and the MA-9 press kit’s (p. 46) to 362,000',
    },
    {
      group: 'Launch vehicle',
      label: 'Heading after the roll programme',
      value: 72,
      unit: 'deg',
      confidence: 'documented',
      note: `"130D rolled toward its climbout heading of 72°" between 2 and 15 seconds (${SUMMARY}, p. 103). On the pad the vehicle’s pitch axis lay on 105° (Results of the First United States Manned Orbital Space Flight, p. 46, of the same pad)`,
    },
  ],
  motors: [
    {
      name: 'Rocketdyne MA-2, booster chamber',
      count: 2,
      thrustN: 154000 * LBF,
      burnS: 132.5,
      propellant: 'RP-1 / liquid oxygen',
      kind: 'liquid',
      confidence: 'documented',
      note: `154,000 lbf each, rated (${SUMMARY}, p. 85); this flight’s press kit gives 150,000 (p. 46). Cutoff at 132.5 s (${SUMMARY}, p. 103). No figure measured on Atlas 130-D has been read`,
    },
    {
      name: 'Rocketdyne MA-2, sustainer',
      count: 1,
      thrustN: 57000 * LBF,
      burnS: 303.03,
      propellant: 'RP-1 / liquid oxygen',
      kind: 'liquid',
      confidence: 'documented',
      note: `57,000 lbf, rated (${SUMMARY}, p. 88); the press kit gives 60,000. Cutoff at 303.03 s, "approximately 1 second earlier than planned" (p. 103)`,
    },
    {
      name: 'Rocketdyne MA-2, vernier',
      count: 2,
      thrustN: 1000 * LBF,
      burnS: 303.03,
      propellant: 'RP-1 / liquid oxygen',
      kind: 'liquid',
      confidence: 'documented',
      note: `1,000 lbf each (${SUMMARY}, p. 88). Mercury’s Atlas had no vernier solo: they stopped with the sustainer`,
    },
    {
      name: 'Escape motor',
      count: 1,
      thrustN: 52000 * LBF,
      burnS: 1,
      propellant: 'solid',
      kind: 'solid',
      confidence: 'documented',
      note: `52,000 lb for 1 s, nominal (${SUMMARY}, Table 3-III, p. 53)`,
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
      note: `400 lb for 1 s, nominal (the same table). On the missile these were retrorockets on the Atlas; Mercury moved them to the capsule (${SUMMARY}, p. 93)`,
    },
    {
      name: 'Retrograde motor',
      count: 3,
      thrustN: 1000 * LBF,
      burnS: 10,
      propellant: 'solid',
      kind: 'solid',
      confidence: 'documented',
      note: `1,000 lb for 10 s, nominal (the same table). Fired by hand at 33:59:53 by the capsule communicator’s count (${SUMMARY}, the air-ground transcript, p. 440)`,
    },
    {
      name: 'Pitch and yaw thruster, high',
      count: 4,
      thrustN: 24 * LBF,
      propellant: '90% hydrogen peroxide',
      confidence: 'documented',
      note: `automatic system (Hammack and Heberlig). The rate stabilization control system, which had shared the manual system’s fuel, was taken out of this capsule (${SUMMARY}, p. 54)`,
    },
    {
      name: 'Roll thruster, high',
      count: 2,
      thrustN: 6 * LBF,
      propellant: '90% hydrogen peroxide',
      confidence: 'documented',
      note: `automatic system (Hammack and Heberlig). The 6 lb chambers were of a new design for this capsule (${SUMMARY}, p. 54 and Table 3-II)`,
    },
    {
      name: 'Attitude thruster, low',
      count: 6,
      thrustN: 1 * LBF,
      propellant: '90% hydrogen peroxide',
      confidence: 'documented',
      note: `automatic system, all axes (Hammack and Heberlig). A new 1 lb chamber, proved in the Project Orbit chamber runs, was fitted for this flight (${SUMMARY}, p. 54 and Figure 3-10). All worked`,
    },
  ],
  models: [vehicle],
};

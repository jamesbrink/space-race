import type { Flight, ModelDef, Part } from '../../../../../src/types';
import { LC5 } from '../../sites/lc-5.ts';

const IN = 0.0254;
const FT = 0.3048;
const LBF = 4.4482216;
const NMI = 1852;
const DEG = Math.PI / 180;

// Where things are round the capsule, as model/vehicle.py has them: degrees about the long axis from the pilot's
// right. The numbers live there; these are quoted for the views and for how the parts come away. The capsule stands
// turned so that its hatch is on +X, as a launch site's frame has it (mercury_capsule.stand): STAND is that turn.
const STAND = -315;
const WINDOW_AZ = 270 + STAND;
const HATCH_AZ = 315 + STAND;
const PERISCOPE_AZ = 90 + STAND;
/** A direction on the model in the viewer's axes (+Y is the model's long axis; the model's +Y is the viewer's -Z). */
const along = (az: number, lift: number, by = 1): [number, number, number] => [
  by * Math.cos(az * DEG),
  by * lift,
  -by * Math.sin(az * DEG),
];

const RESULTS = 'Results of the Second U.S. Manned Suborbital Space Flight (NASA MSC, 1961)';

const parts: Part[] = [
  {
    node: 'EscapeTower',
    group: 'Spacecraft',
    name: 'Launch escape tower',
    summary: 'Pulls the capsule off a failing booster. Grissom watched it go.',
    detail:
      'A welded steel-tube pylon about ten feet tall carrying a solid motor of 52,000 lbf that burns for under a ' +
      'second through three nozzles canted 19° clear of the capsule. Unused, it is fired clear at booster cutoff: on ' +
      'this flight at T+2:23. With a window in front of him for the first time, the pilot could see it leave, ' +
      '"climbing off to my right", and thought he was still watching it when the capsule separated ten seconds later. ' +
      'As built for Freedom 7: nothing read gives a difference.',
    facts: [
      ['Escape motor', '52,000 lbf for 0.78 s'],
      ['Nozzles', '3, canted 19°'],
      ['Jettison motor', '800 lbf for 1.5 s, 3 nozzles'],
      ['Pylon', 'about 10 ft of 4130 steel tube'],
      ['Jettisoned', 'T+2:23, at booster cutoff'],
    ],
    explode: [0, 12.6, 0],
    order: 0,
  },
  {
    node: 'AntennaCanister',
    group: 'Spacecraft',
    name: 'Antenna canister',
    summary: 'Bicone antenna, horizon scanners, drogue parachute.',
    detail:
      'The pale band is an 8-inch dielectric window: the metal above and below it are the two halves of a bicone ' +
      'antenna that handles voice, telemetry and command. Two infrared scanners find the horizon in pitch and ' +
      'roll. The drogue came out of it at 21,000 ft, and Grissom saw that through the window too. ' +
      'As built for Freedom 7: nothing read gives a difference.',
    facts: [
      ['Length', '24 in (0.61 m)'],
      ['Antenna', 'bicone, voice and telemetry'],
      ['Scanners', '2 infrared, pitch and roll'],
      ['Drogue', 'out at T+9:41, 21,000 ft'],
    ],
    explode: [0, 11.6, 0],
    order: 1,
  },
  {
    node: 'RecoveryCompartment',
    group: 'Spacecraft',
    name: 'Recovery compartment',
    summary: 'Main and reserve parachutes; pitch and yaw thrusters.',
    detail:
      'A 32-inch cylinder holding a 63-foot ring-sail main parachute and its reserve, skinned in thick beryllium ' +
      'plates that soak up heat where the cone’s thin shingles radiate it. The main opened at 12,300 ft, about a ' +
      'thousand feet higher than designed, and through the window the pilot could see three quarters of it. ' +
      'After landing this end of the capsule went under the water until it righted itself.',
    facts: [
      ['Diameter', '32 in (0.81 m)'],
      ['Length', '22.8 in (0.58 m)'],
      ['Skin', 'beryllium plates, 0.22 in'],
      ['Main parachute', '63 ft ring-sail, out at T+10:14'],
      ['Thrusters', 'pitch and yaw: 24 lbf and 1 lbf'],
    ],
    explode: [0, 10.8, 0],
    order: 2,
  },
  {
    node: 'Hatch',
    group: 'Spacecraft',
    name: 'Explosive hatch',
    summary: 'Seventy bolts, a fuse to break them all at once, and a plunger. It blew when nobody wanted it to.',
    detail:
      'Freedom 7’s hatch was latched and its mechanism weighed 69 lb, too much to take to orbit. This one is the ' +
      'first design’s bolted hatch made to open itself: seventy quarter-inch titanium bolts, each drilled with a ' +
      '0.06 in hole to weaken it, and a mild detonating fuse in a channel round the sill that breaks them all together. ' +
      'Inside, by the pilot’s right arm, a plunger fires it with a blow of five or six pounds once its cover and ' +
      'safety pin are off; outside, a rescuer takes off a small plate and pulls a lanyard. It went on with one bolt ' +
      'left out, misaligned: the count was held half an hour while it was decided sixty-nine would do. After landing ' +
      'Grissom took off the cover and the pin and lay back to wait for the helicopter. The hatch blew, the sea came ' +
      'in over the sill, and the capsule sank where the sea is about 2,800 fathoms deep. He said he had not touched the plunger; no test ' +
      'afterwards made a hatch fire by itself. It is modelled where this capsule’s photographs have it, close ' +
      'beside the window. The hatch itself was not with the capsule when it was raised.',
    facts: [
      ['Weight', '23 lb, against 69 lb for the latch mechanism'],
      ['Bolts', '70 of 1/4 in titanium; 69 on this flight'],
      ['Released by', 'mild detonating fuse round the sill'],
      ['Inside', 'plunger: 5 to 6 lb, or 40 lb with the pin in'],
      ['Outside', 'a lanyard behind a small plate'],
      ['Lost', 'blown after landing; not raised with the capsule'],
    ],
    explode: along(HATCH_AZ, 8.6, 1.15),
    order: 3,
  },
  {
    node: 'Window',
    group: 'Spacecraft',
    name: 'Centreline window',
    summary: 'New with this capsule: a window in front of the pilot’s face, where Freedom 7 had two portholes to the side.',
    detail:
      'The astronauts asked for it. The outer pane is Vycor, 0.35 in thick and curved to the cone, good for 1,500 to ' +
      '1,800 °F; behind it, in a well lined with foil, three flat inner panes hold the cabin’s pressure: one more of ' +
      'Vycor and two of tempered glass. Through it the pilot saw 30° across and 33° up and down, and with the capsule ' +
      'in its retrofire attitude two thirds of that was Earth. Grissom saw the sky go from blue to black, a star ' +
      'that turned out to be Venus, the escape tower leaving, the coast of the Gulf, his parachutes; and, with the ' +
      'capsule on its side in the sea, water over the glass. He found the view so much better than the flight plan ' +
      'that he fell behind in it. The panes’ sizes are the drawing’s; where the window stands along the cone is read ' +
      'off photographs.',
    facts: [
      ['Outer pane', '21.0 in long, 11.25 in to 7.51 in wide, 0.35 in Vycor'],
      ['Inner panes', '12.95 in long, 9.49 in to 7.30 in wide; three'],
      ['Field of view', '30° across, 33° up and down'],
      ['Maker', 'Corning Glass Works'],
      ['Coating', 'magnesium fluoride, against glare'],
    ],
    explode: along(WINDOW_AZ, 9.9, 1.0),
    order: 3,
  },
  {
    node: 'Afterbody',
    group: 'Spacecraft',
    name: 'Conical afterbody',
    summary: 'René 41 shingles, a name, and a crack painted up the side.',
    detail:
      'Nickel-alloy shingles 0.016 in thick, oxidised blue-black, each stiffened by beads pressed across it and held ' +
      'through oversized holes so that it can grow when hot. Grissom named the capsule for its shape, and had the ' +
      'Liberty Bell’s crack painted on it in white from the base toward the nose; the name is under the window in ' +
      'three lines. UNITED STATES stands beside the periscope’s door and the flag on its other side. The shingles ' +
      'are laid out as this capsule’s photographs show them, on the pad and as it was raised from the sea in 1999, ' +
      'with their beads running round the cone.',
    facts: [
      ['Half-angle', '20°'],
      ['Length', '58.4 in (1.48 m)'],
      ['Skin', 'René 41 shingles, 0.016 in'],
      ['Paint', 'LIBERTY BELL 7, the crack, UNITED STATES, the flag'],
      ['Thrusters', 'roll: 6 lbf and 1 lbf'],
    ],
    explode: [0, 9.9, 0],
    order: 3,
  },
  {
    node: 'CrewCabin',
    group: 'Spacecraft',
    inside: true,
    name: 'Crew cabin',
    summary: 'The same couch under a rearranged panel, with a window above it.',
    detail:
      'Two thin titanium skins holding pure oxygen at about 5 psi, and the pilot on a couch moulded to his back. ' +
      'What Shepard said of his panel was acted on: the instruments were moved so that the eye could go round them ' +
      'more easily. The attitude indicator went to the top, with an Earth-path indicator and the clock under it and ' +
      'the periscope’s 8-inch screen below; the sequence lights went into one column down the left console, each ' +
      'beside the ring or button that does the thing by hand. The Earth-path indicator, a globe turned by ' +
      'clockwork, was not working on this flight. New too was a rate command system: with it the hand controller ' +
      'asked for a rate of turn and the capsule held it. And the couch had more padding at the head, against the ' +
      'vibration that had blurred Shepard’s sight. The panel is the report’s figure; where it stands is as in Freedom 7.',
    facts: [
      ['Structure', 'two skins of 0.010 in titanium'],
      ['Atmosphere', 'pure oxygen, 5 psi'],
      ['Panel', 'as Hammack and Heberlig’s Figure 6'],
      ['New on it', 'Earth-path indicator (not working); rate command'],
      ['Periscope', '8 in screen, still carried'],
      ['Window', 'in front of the pilot, above the panel'],
    ],
    explode: [0, 8.9, 0],
    order: 4,
  },
  {
    node: 'HeatShield',
    inside: true,
    group: 'Spacecraft',
    name: 'Heat shield',
    summary: 'Beryllium heat sink, 74.5 inches across.',
    detail:
      'As Freedom 7’s: a suborbital entry is short enough for a solid beryllium shield that soaks up the heat, where ' +
      'the orbital flights needed one that chars away. Behind it the landing bag dropped before the sea, ' +
      'with a clunk the pilot heard.',
    facts: [
      ['Diameter', '74.5 in (1.89 m)'],
      ['Radius of curvature', '80 in'],
      ['Material', 'beryllium heat sink, about 1 in'],
      ['Peak load coming in', '11.1 g'],
    ],
    explode: [0, 8.3, 0],
    order: 5,
  },
  {
    node: 'Retropack',
    inside: true,
    group: 'Spacecraft',
    name: 'Retropack',
    summary: 'Three retrograde and three posigrade motors.',
    detail:
      'The three small posigrade motors push the capsule off the spent Redstone: fired inside the adapter they gave ' +
      '78 % more than their open thrust, a "popgun effect" worked out between the two flights. The three large ' +
      'motors are an orbital flight’s way home; here they were fired as a test, this time by the pilot’s own hand, ' +
      'thirty seconds after the timer began the sequence. As built for Freedom 7.',
    facts: [
      ['Retro motors', '3 × 1,000 lbf, 10 s each'],
      ['Fired', 'by the pilot, T+5:10'],
      ['Posigrade motors', '3 × 400 lbf, 1 s'],
      ['Jettisoned', 'T+6:07'],
    ],
    explode: [0, 7.6, 0],
    order: 6,
  },
  {
    node: 'RedstoneAdapter',
    group: 'Launch vehicle',
    name: 'Spacecraft adapter',
    summary: 'Joins the capsule to the booster. Its bolt covers were rounded for this flight.',
    detail:
      'A short flared ring with the retropack nested inside it and a clamp at its top rim holding the capsule. The ' +
      'fairings over the clamp’s three explosive bolts had been rectangular; for this flight they were made a ' +
      'streamlined shape to cut the buffeting Shepard had reported, and their upper parts were hinged to flip off at ' +
      'separation instead of sliding down, which on an earlier flight had damaged the umbilical connections. ' +
      'Their shape here is the report’s figure; their size is read off it.',
    facts: [
      ['Diameter', '70 in to 73.2 in'],
      ['Clamp', 'Marman ring, three explosive bolts'],
      ['Bolt covers', 'streamlined, hinged at the top: new for MR-4'],
      ['Separation', 'T+2:33'],
    ],
    explode: [0, 6.8, 0],
    order: 7,
  },
  {
    node: 'RedstoneAftUnit',
    group: 'Launch vehicle',
    name: 'Aft unit',
    summary: 'Top of the booster: autopilot, abort sensing, ballast, and more damping than before.',
    detail:
      'Booster MR-8. The instrument compartment carries the LEV-3 autopilot and the abort sensing system, under ' +
      '487 lb of steel ballast. Shepard had still felt the vehicle shake on the way up, so another 102 lb of ' +
      'lead-loaded damping compound went into this unit for Grissom, who made no complaint of vibration. Nothing ' +
      'of that shows outside: the model is the booster as built for MR-3.',
    facts: [
      ['Booster', 'MR-8'],
      ['Damping compound', '442 lb: 102 lb more than MR-3'],
      ['Autopilot', 'LEV-3'],
      ['Skin', '0.090 in aluminium'],
    ],
    explode: [0, 5.8, 0],
    order: 8,
  },
  {
    node: 'RedstoneCenterUnit',
    group: 'Launch vehicle',
    name: 'Centre unit',
    summary: 'Alcohol above, liquid oxygen below.',
    detail:
      'The tank walls are the airframe: the Jupiter-C’s lengthened tanks, which stretched the burn by twenty seconds. ' +
      'The oxygen went aboard later in this count than in Shepard’s, at T-180 minutes after a planned hold to look ' +
      'at the weather again, so that a scrub for cloud need not cost two days.',
    facts: [
      ['Length', '37.50 ft (11.43 m)'],
      ['Alcohol tank', '18.8 ft · 3,348 US gal'],
      ['Oxygen tank', '16.83 ft · 3,072 US gal'],
      ['Oxygen loaded', 'from T-180 min'],
    ],
    explode: [0, 4.6, 0],
    order: 9,
  },
  {
    node: 'RedstoneTailUnit',
    group: 'Launch vehicle',
    name: 'Tail unit',
    summary: 'Four fins, four air rudders, the engine bay.',
    detail:
      'The fins keep the vehicle stable; the rudders at their tips steer it while there is air to push against. ' +
      'The black-and-white paint is a roll pattern for the tracking cameras.',
    facts: [
      ['Length', '9.27 ft (2.83 m)'],
      ['Fins', '4, with air rudders'],
      ['Skin', '0.125 in aluminium'],
    ],
    explode: [0, 3.4, 0],
    order: 10,
  },
  {
    node: 'RedstoneEngine',
    group: 'Launch vehicle',
    inside: true,
    name: 'A-7 engine',
    summary: '78,000 lbf, steered by vanes in its own exhaust.',
    detail:
      'Rocketdyne’s A-7: a single fixed chamber fed by a turbopump that runs on steam from decomposed hydrogen ' +
      'peroxide, with four graphite vanes in the exhaust to steer by. It was aimed 100° east of north this time ' +
      'instead of 102°: a booster going wrong on Shepard’s heading could have reached the Bahamas. It cut off at ' +
      'T+2:23 with the capsule going about 200 ft/s faster than Freedom 7 had.',
    facts: [
      ['Thrust', '78,000 lbf (347 kN) at sea level'],
      ['Cutoff', 'T+2:23'],
      ['Launch azimuth', '100°, against 102° for MR-3'],
      ['Steering', '4 carbon jet vanes'],
    ],
    explode: [0, 0, 0],
    order: 11,
  },
];

/** The fins' trailing edges below the model's origin (the capsule's plane of maximum diameter), m: it stands on them. */
const BASE = 716.0 * IN;
/** The spacecraft without its tower. */
const CAPSULE = ['AntennaCanister', 'RecoveryCompartment', 'Hatch', 'Window', 'Afterbody', 'CrewCabin', 'HeatShield', 'Retropack'];

const vehicle: ModelDef = {
  id: 'vehicle',
  name: 'Vehicle',
  url: 'models/usa/mercury/mr-4-liberty-bell-7/vehicle.glb',
  scale: '25.41 m tall · spacecraft 7.91 m · to scale',
  // Launch Complex 5 is built as it stood for Freedom 7 eleven weeks earlier; as it stood on 21 July it is not built
  // (README.md, "What the launch site would need"), so the vehicle is shown by itself in the gallery.
  backdrop: 'studio',
  slider: ['Assembled', 'Taken apart'],
  cutaway: true,
  specGroups: ['Spacecraft', 'Launch vehicle'],
  parts,
  position: [0, BASE, 0],
  // the two cabin lights (the panel's switch reads BOTH, OFF, L.H. ONLY): put toward the middle of the cabin, as Freedom 7's
  // are, either side of the pilot's head, in the frame the capsule stands in (turned by STAND)
  lights: [
    { position: [0.304, 0.55, 0.092], colour: 0xfffaf2, intensity: 0.7, reach: 3 },
    { position: [0.092, 0.55, 0.304], colour: 0xfffaf2, intensity: 0.7, reach: 3 },
  ],
  home: 'stack',
  views: [
    { id: 'stack', label: 'Full stack', from: along(WINDOW_AZ + 25, 0.12) },
    // each of these is of named parts, so it stays on them as the slider takes the vehicle apart
    { id: 'spacecraft', label: 'Spacecraft', nodes: [...CAPSULE, 'EscapeTower'], from: along(WINDOW_AZ + 25, 0.1) },
    { id: 'capsule', label: 'Capsule', nodes: CAPSULE, from: along(WINDOW_AZ + 20, 0.15) },
    { id: 'window', label: 'Window', nodes: ['Window'], from: along(WINDOW_AZ, 0.3) },
    { id: 'hatch', label: 'Hatch', nodes: ['Hatch'], from: along(HATCH_AZ + 8, 0.3) },
    { id: 'periscope', label: 'Periscope side', nodes: ['Afterbody'], from: along(PERISCOPE_AZ + 22, 0.2) },
    { id: 'engine', label: 'Engine', nodes: ['RedstoneTailUnit', 'RedstoneEngine'] },
  ],
};

export const flight: Flight = {
  id: 'usa/mercury/mr-4-liberty-bell-7',
  nation: 'USA',
  agency: 'NASA',
  program: 'Project Mercury',
  designation: 'Mercury-Redstone 4',
  callsign: 'Liberty Bell 7',
  spacecraft: 'Mercury spacecraft No. 11 (McDonnell Aircraft)',
  launchVehicle: 'Mercury-Redstone MRLV, MR-8',
  // 07:20 EST (the MR-4 report, p. 6; TM X-53107, 8.3.2). The seconds are from secondary sources (07:20:36 EST): no primary read gives them.
  launch: '1961-07-21T12:20:36Z',
  launchSite: LC5.name,
  site: LC5,
  crew: ['Virgil I. Grissom'],
  summary:
    'The second American in space. Fifteen minutes from Cape Canaveral into the Atlantic, in the first Mercury ' +
    'capsule with a window in front of its pilot and a hatch that could blow itself off. After landing it did, ' +
    'and the capsule sank; it was raised from the sea floor thirty-eight years later, on 20 July 1999.',
  facts: [
    { label: 'Liftoff', value: '21 July 1961, 12:20 UTC' },
    { label: 'Pilot', value: 'Virgil I. "Gus" Grissom' },
    { label: 'Duration', value: '15 min 37 s' },
    { label: 'Apogee', value: '190.4 km' },
    { label: 'Range', value: '486.2 km' },
    { label: 'Peak velocity', value: '8,317 km/h, space-fixed' },
    { label: 'Peak load', value: '11.1 g on entry' },
    { label: 'Recovery', value: 'pilot by helicopter to USS Randolph; capsule lost' },
  ],
  // Results of the Second U.S. Manned Suborbital Space Flight, pp. 6 and 7 (minutes and seconds, as it gives them)
  timeline: [
    { t: 0, event: 'Liftoff, 07:20 EST' },
    { t: 143, event: 'Booster engine cutoff, 6.3 g; escape tower released and fired clear' },
    { t: 153, event: 'Spacecraft separation: posigrade motors fire' },
    { t: 185, event: 'Grissom takes manual control' },
    { t: 286, event: 'Retro sequence begun by the timer' },
    { t: 310, event: 'Retrofire, by the pilot: three motors, five seconds apart' },
    { t: 316, event: 'Apogee, 190.4 km' },
    { t: 343, event: 'Rate command control, through the entry' },
    { t: 367, event: 'Retropack jettison' },
    { t: 581, event: 'Drogue parachute, 21,000 ft' },
    { t: 614, event: 'Main parachute, 12,300 ft' },
    { t: 937, event: 'Landing' },
  ],
  specs: [
    {
      group: 'Spacecraft',
      label: 'Heat shield diameter',
      value: 74.5 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '74.5 in (NASA CR-649)',
    },
    {
      group: 'Spacecraft',
      label: 'Heat shield radius of curvature',
      value: 80 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '80 in (NASA CR-649)',
    },
    { group: 'Spacecraft', label: 'Afterbody half-angle', value: 20, unit: 'deg', confidence: 'documented', note: 'NASA CR-649' },
    {
      group: 'Spacecraft',
      label: 'Length, retro nozzles to canister top',
      value: 131.57 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '131.57 in: Z77.50 to Z209.07 (SEDR 104, Figure 1-3; Hammack & Heberlig, Figure 2)',
    },
    {
      group: 'Spacecraft',
      label: 'Length with escape tower',
      value: 311.55 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '311.55 in: Z77.50 to Z389.05 (SEDR 104, Figure 1-3; Hammack & Heberlig, Figure 2)',
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
      label: 'Window, inner panes length',
      value: 12.95 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '12.950 in by 9.490 in and 7.300 in, corners of 1 3/4 in radius (NASA SP-45, Figure 19-1)',
    },
    {
      group: 'Spacecraft',
      label: 'Window, outer pane thickness',
      value: 0.35 * IN,
      unit: 'm',
      confidence: 'documented',
      note: `0.35 in of Vycor; inner panes 0.17 in of Vycor and two of 0.34 in tempered glass (${RESULTS}, p. 4)`,
    },
    {
      group: 'Spacecraft',
      label: 'Window field of view, across',
      value: 30,
      unit: 'deg',
      confidence: 'documented',
      note: `30° in the horizontal plane and 33° in the vertical (${RESULTS}, p. 3)`,
    },
    {
      group: 'Spacecraft',
      label: 'Window, middle of the outer pane above the widest plane',
      value: 35.8 * IN,
      unit: 'm',
      confidence: 'estimated',
      note: '35.8 in: scaled off NASA 61-MR4-53 and MSFC-6116423 by the pane’s own length',
    },
    {
      group: 'Spacecraft',
      label: 'Hatch weight',
      value: 23 * 0.45359237,
      unit: 'kg',
      confidence: 'documented',
      note: `23 lb as installed, against 69 lb for the mechanical one (${RESULTS}, p. 4)`,
    },
    {
      group: 'Spacecraft',
      label: 'Hatch bolts',
      value: 70,
      unit: 'bolts',
      confidence: 'documented',
      note: `seventy 1/4 in titanium bolts, a 0.06 in hole in each (${RESULTS}, p. 4). It flew on 69: one was misaligned and left out (This New Ocean, p. 370)`,
    },
    {
      group: 'Spacecraft',
      label: 'Hatch, middle round from the window',
      value: 45,
      unit: 'deg',
      confidence: 'estimated',
      note: '45° toward the pilot’s right, 55° wide, stations 18.5 to 45.4 in: its edge beside the window’s plate in NASA 61-MR4-53, S61-02881 and MSFC-6116423; SEDR 104 Figure 13-11 has thermocouples on it at Z123.0 to Z147.25',
    },
    {
      group: 'Spacecraft',
      label: 'Periscope objective above the widest plane',
      value: 41.5 * IN,
      unit: 'm',
      confidence: 'estimated',
      note: '41.5 in: scaled off NASA S61-03705, where the lens stands level with the upper line of UNITED STATES',
    },
    {
      group: 'Spacecraft',
      label: 'Apogee',
      value: 102.8 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `102.8 nautical miles (${RESULTS}, Table 2-I)`,
    },
    {
      group: 'Spacecraft',
      label: 'Range',
      value: 262.5 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: '262.5 nautical miles (the same table)',
    },
    {
      group: 'Spacecraft',
      label: 'Velocity at cutoff, space-fixed',
      value: 7580 * FT,
      unit: 'm/s',
      confidence: 'documented',
      note: '7,580 ft/s; Earth-fixed 6,618 ft/s (the same table)',
    },
    {
      group: 'Spacecraft',
      label: 'Greatest dynamic pressure going up',
      value: 605.5 * 47.880259,
      unit: 'Pa',
      confidence: 'documented',
      note: '605.5 lb/sq ft (the same table)',
    },
    {
      group: 'Launch vehicle',
      label: 'Height on the pad',
      value: 25.414,
      unit: 'm',
      confidence: 'documented',
      note: '83.38 ft, fins to spike (TM X-53107, 4.1); model: 25.414 m',
    },
    { group: 'Launch vehicle', label: 'Booster diameter', value: 70 * IN, unit: 'm', confidence: 'documented', note: '70 in' },
    {
      group: 'Launch vehicle',
      label: 'Booster length',
      value: 59 * FT,
      unit: 'm',
      confidence: 'documented',
      note: '59.00 ft (TM X-53107, Figure 4-1)',
    },
    {
      group: 'Launch vehicle',
      label: 'Damping compound in the aft unit',
      value: 442 * 0.45359237,
      unit: 'kg',
      confidence: 'documented',
      note: '442 lb of X-306: the 340 lb flown on MR-3 and 102 lb added for MR-4 (TM X-53107, 4.2.1 and 8.3.2)',
    },
    {
      group: 'Launch vehicle',
      label: 'Launch azimuth',
      value: 100,
      unit: 'deg',
      confidence: 'documented',
      note: '100° east of north, changed from the 102° of MR-2, MR-BD and MR-3 (TM X-53107, 8.3.2)',
    },
  ],
  motors: [
    {
      name: 'Rocketdyne A-7 (booster)',
      count: 1,
      thrustN: 78000 * LBF,
      burnS: 143,
      propellant: 'ethyl alcohol / liquid oxygen',
      kind: 'liquid',
      confidence: 'documented',
      note: `78,000 lbf at sea level, nominal (TM X-53107). Cutoff on this flight at T+2:23 (${RESULTS}, p. 6); MR-8’s measured thrust has not been read`,
    },
    {
      name: 'Escape motor (Grand Central)',
      count: 1,
      thrustN: 52000 * LBF,
      burnS: 0.78,
      propellant: 'solid',
      kind: 'solid',
      confidence: 'documented',
      note: '52,000 lbf for 0.78 s, then decaying; three nozzles canted 19° (SEDR 104)',
    },
    {
      name: 'Tower jettison motor',
      count: 1,
      thrustN: 800 * LBF,
      burnS: 1.5,
      propellant: 'solid',
      kind: 'solid',
      confidence: 'documented',
      note: 'SP-45 nominal; McDonnell gives 785 lbf. Three nozzles canted 30°',
    },
    {
      name: 'Posigrade motor',
      count: 3,
      thrustN: 400 * LBF,
      burnS: 1,
      propellant: 'solid',
      kind: 'solid',
      confidence: 'documented',
      note: 'SP-45 nominal. Fired into the adapter they gave 78 % more than in the open (This New Ocean, p. 367)',
    },
    {
      name: 'Retrograde motor (Thiokol)',
      count: 3,
      thrustN: 1000 * LBF,
      burnS: 10,
      propellant: 'solid',
      kind: 'solid',
      confidence: 'documented',
      note: 'SP-45 nominal; McDonnell gives 992 lbf over 13.2 s. Fired 5 s apart',
    },
    {
      name: 'Pitch and yaw thruster, high',
      count: 4,
      thrustN: 24 * LBF,
      propellant: '90% hydrogen peroxide',
      confidence: 'documented',
      note: 'automatic system (Hammack and Heberlig)',
    },
    {
      name: 'Roll thruster, high',
      count: 2,
      thrustN: 6 * LBF,
      propellant: '90% hydrogen peroxide',
      confidence: 'documented',
      note: 'automatic system (Hammack and Heberlig)',
    },
    {
      name: 'Attitude thruster, low',
      count: 6,
      thrustN: 1 * LBF,
      propellant: '90% hydrogen peroxide',
      confidence: 'documented',
      note: 'automatic system, all axes (Hammack and Heberlig)',
    },
  ],
  models: [vehicle],
};

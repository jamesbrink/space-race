import type { Flight, ModelDef, Part } from '../../../../../src/types';

const IN = 0.0254;
const LBF = 4.4482216;
const LB = 0.45359237;

const vehicleParts: Part[] = [
  {
    node: 'EscapeTower',
    group: 'Spacecraft',
    name: 'Launch escape tower',
    summary: 'Pulls the capsule off a failing booster.',
    detail:
      'A welded steel-tube pylon about ten feet tall carrying a solid motor of 52,000 lbf that burns for under a ' +
      'second through three nozzles canted 19° clear of the capsule. Unused, it is dead weight: at booster cutoff ' +
      'the clamp ring lets go and the tower is fired clear. On MR-3 that was T+2:22.',
    facts: [
      ['Escape motor', '52,000 lbf for 0.78 s'],
      ['Nozzles', '3, canted 19°'],
      ['Jettison motor', '800 lbf for 1.5 s, 3 nozzles'],
      ['Pylon', 'about 10 ft of 4130 steel tube'],
      ['Jettisoned', 'T+2:22'],
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
      'roll. The flap on top turns the capsule blunt-end-first if it ever enters nose-first.',
    facts: [
      ['Length', '24 in (0.61 m)'],
      ['Antenna', 'bicone, voice and telemetry'],
      ['Scanners', '2 infrared, pitch and roll'],
      ['Jettisoned', 'at main parachute deploy'],
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
      'shingles that soak up heat where the cone’s thin ones radiate it. Pitch and yaw thrusters sit at its top, ' +
      'as far from the centre of mass as the vehicle allows.',
    facts: [
      ['Diameter', '32 in (0.81 m)'],
      ['Length', '22.8 in (0.58 m)'],
      ['Skin', 'beryllium shingles, 0.22 in'],
      ['Main parachute', '63 ft ring-sail, plus reserve'],
      ['Thrusters', 'pitch and yaw: 24 lbf and 1 lbf'],
    ],
    explode: [0, 10.8, 0],
    order: 2,
  },
  {
    node: 'Hatch',
    group: 'Spacecraft',
    name: 'Side hatch',
    summary: 'Held by latches, with a handle inside and out.',
    detail:
      'The first design bolted the hatch on with 70 bolts, which would have left the pilot sealed in until ' +
      'someone came. Spacecraft No. 7 flew a heavier hatch held by mechanical latches, with a release handle ' +
      'inside and out. It was lost in the sea during recovery. The explosive hatch, lighter at 23 lb, arrived ' +
      'one flight later on Liberty Bell 7.',
    facts: [
      ['Type', 'mechanical latch'],
      ['Latch mechanism', '69 lb (31 kg)'],
      ['Release', 'handles inside and outside'],
      ['Explosive hatch', '23 lb, from MR-4'],
    ],
    explode: [1.15, 9.9, 0],
    order: 3,
  },
  {
    node: 'Afterbody',
    group: 'Spacecraft',
    name: 'Conical afterbody',
    summary: 'René 41 shingles over the pressure vessel.',
    detail:
      'Corrugated nickel-alloy shingles, 0.016 inch thick and oxidised blue-black, each fastened through ' +
      'oversized holes so it can grow when hot. No. 7 has two 10-inch portholes instead of the later overhead ' +
      'window, so the periscope was Shepard’s main view outside.',
    facts: [
      ['Half-angle', '20°'],
      ['Length', '58.4 in (1.48 m)'],
      ['Skin', 'René 41 shingles, 0.016 in'],
      ['Portholes', '2, 10 in diameter'],
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
    summary: 'Where the pilot lies: couch, controls, instruments.',
    detail:
      'A cone of two thin titanium skins holding pure oxygen at 5.1 psi. The pilot lies on a fibreglass couch ' +
      'moulded to his body, back to the heat shield, so that launch and entry loads both push him into it. ' +
      'Behind the heat shield a fabric landing bag drops four feet before splashdown to cushion the impact.',
    facts: [
      ['Structure', 'two skins of 0.010 in titanium'],
      ['Atmosphere', 'pure oxygen, 5.1 psi nominal'],
      ['Couch', 'fibreglass, moulded to the pilot'],
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
      'A suborbital entry is short enough that the Redstone flights used a solid beryllium shield that soaks up ' +
      'the heat. The orbital flights replaced it with an ablative fibreglass-and-resin shield that chars away.',
    facts: [
      ['Diameter', '74.5 in (1.89 m)'],
      ['Radius of curvature', '80 in'],
      ['Material', 'beryllium heat sink, about 1 in'],
      ['Orbital flights', 'ablative fibreglass and resin'],
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
      'The small posigrade motors push the capsule away from the spent Redstone. The three large motors are the ' +
      'braking burn that brings an orbital flight home; MR-3 was coming down anyway and fired them as a test. ' +
      'Three straps hold the pack against the shield, joined under its centre by a single explosive bolt.',
    facts: [
      ['Retro motors', '3 × 1,000 lbf, 10 s each'],
      ['Fired', '5 s apart, from T+5:14'],
      ['Posigrade motors', '3 × 400 lbf, 1 s'],
      ['Jettisoned', 'T+6:14'],
    ],
    explode: [0, 7.6, 0],
    order: 6,
  },
  {
    node: 'RedstoneAdapter',
    group: 'Launch vehicle',
    name: 'Spacecraft adapter',
    summary: 'Joins a 74.5-inch capsule to a 70-inch booster.',
    detail:
      'A short flared ring with the retropack nested inside it. A Marman clamp at its top rim holds the capsule; ' +
      'at separation explosive bolts open the clamp and the posigrade motors push the capsule clear, ten seconds ' +
      'after the engine has shut down.',
    facts: [
      ['Diameter', '70 in to 73.2 in'],
      ['Clamp', 'Marman ring, explosive bolts'],
      ['Separation', 'T+2:32, 74 km up'],
    ],
    explode: [0, 6.8, 0],
    order: 7,
  },
  {
    node: 'RedstoneAftUnit',
    group: 'Launch vehicle',
    name: 'Aft unit',
    summary: 'Top of the booster: autopilot, abort sensing, ballast.',
    detail:
      'On the Redstone missile this section flew on with the warhead. Here it stays bolted to the tanks and ' +
      'carries the LEV-3 autopilot and the abort sensing system, which watches attitude, rates, chamber pressure ' +
      'and electrical power and fires the escape tower without asking anyone. Above the instruments sit 487 lb ' +
      'of steel ballast, restoring the stability the long nose took away, and some 340 lb of lead-loaded ' +
      'compound to damp a vibration found on earlier flights.',
    facts: [
      ['Length', '139.64 in, plus a 7.08 in stretch'],
      ['Instrument compartment', '53.66 in, pressurised'],
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
      'The tank walls are the airframe. They are the Jupiter-C’s lengthened tanks, which stretched the burn by ' +
      'twenty seconds to 143.5. The fuel is ethyl alcohol cut with water: less energetic than the Jupiter-C’s ' +
      'Hydyne, and far less toxic to a pilot sitting on top of it. The alcohol’s feed line runs down through ' +
      'the middle of the oxygen tank.',
    facts: [
      ['Length', '37.50 ft (11.43 m)'],
      ['Alcohol tank', '18.8 ft · 3,348 US gal'],
      ['Oxygen tank', '16.83 ft · 3,072 US gal'],
      ['Skin', '0.063 in and 0.080 in aluminium'],
      ['Fuel', 'ethyl alcohol, cut with water'],
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
      'The fins keep the vehicle stable; the small rudders at their tips steer it while there is air to push ' +
      'against. The black-and-white paint, here and striped round the aft unit, is a roll pattern: tracking ' +
      'cameras read the vehicle’s roll angle from it.',
    facts: [
      ['Length', '9.27 ft (2.83 m)'],
      ['Fins', '4, with air rudders (±11°)'],
      ['Skin', '0.125 in aluminium'],
      ['Attached by', '12 fasteners in tension'],
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
      'Rocketdyne’s A-7, a direct descendant of the V-2’s engine: a single fixed chamber fed by a turbopump that ' +
      'runs on steam from decomposed hydrogen peroxide. It cannot swivel, so four graphite vanes sit in the ' +
      'exhaust and deflect it.',
    facts: [
      ['Thrust', '78,000 lbf (347 kN) at sea level'],
      ['Burn', '143.5 s nominal; 141.8 s on MR-3'],
      ['Specific impulse', '214.8 s measured on MR-3'],
      ['Steering', '4 carbon jet vanes, ±27.5°'],
      ['Turbopump', 'hydrogen-peroxide steam'],
    ],
    explode: [0, 0, 0],
    order: 11,
  },
];

/** Height of the pedestal's ring, where the fins rest: 6 ft. */
const PEDESTAL = 6 * 0.3048;
/** The vehicle's origin is the capsule's plane of maximum diameter, 716.0 in above the fins. */
const VEHICLE_Y = PEDESTAL + 716.0 * IN;

/** Where the pilot stands in every scene: at the foot of the vehicle, clear of the cutaway's opening. */
// clear of the service structure's rails, which run 4.27 m either side of the pad's centre line
const PILOT = { position: [-2.9, 0, 2.2] as [number, number, number], rotationY: -0.59 };

/** The spacecraft without its tower. */
const CAPSULE = ['AntennaCanister', 'RecoveryCompartment', 'Hatch', 'Afterbody', 'CrewCabin', 'HeatShield', 'Retropack'];

const vehicle: ModelDef = {
  id: 'vehicle',
  name: 'Vehicle',
  url: 'models/usa/mercury/mr-3-freedom-7/vehicle.glb',
  scale: '25.41 m tall · spacecraft 7.91 m · to scale',
  backdrop: 'cape-canaveral',
  slider: ['Assembled', 'Exploded'],
  cutaway: true,
  specGroups: ['Spacecraft', 'Launch vehicle'],
  parts: vehicleParts,
  position: [0, VEHICLE_Y, 0],
  home: 'stack',
  views: [
    { id: 'stack', label: 'Full stack' },
    // each of these is of named parts, so it stays on them as the slider takes the vehicle apart
    { id: 'spacecraft', label: 'Spacecraft', nodes: [...CAPSULE, 'EscapeTower'] },
    { id: 'capsule', label: 'Capsule', nodes: CAPSULE },
    { id: 'engine', label: 'Engine', nodes: ['RedstoneTailUnit', 'RedstoneEngine'] },
  ],
  // the pad as it was at liftoff: structure rolled back, cherry picker withdrawn
  with: [{ model: 'pad', exploded: 1 }],
};

const padParts: Part[] = [
  {
    node: 'ServiceStructure',
    name: 'Service structure',
    summary: 'The gantry, withdrawn to the edge of the pad.',
    detail:
      'Built for Redstone and Jupiter launches, it runs on rails under its own power and served both pad 5 and ' +
      'pad 6. For Mercury it was given remote control from the blockhouse, a blast deflector against an ' +
      'accidental firing of the escape rocket, and on level 3 an enclosed, air-conditioned white room: films ' +
      'from the unmanned flights had shown dust and debris floating round the cabin in weightlessness. It ' +
      'stood at the pad’s edge through the last hour and was driven to its launch position at T−8:45.',
    facts: [
      ['Height', 'about 36 m to the crane (estimated)'],
      ['White room', 'level 3, added February–May 1961'],
      ['Moves', 'on rails, under its own power'],
      ['Control', 'remote, from the blockhouse'],
    ],
    explode: [-35.7, 0, 0],
    order: 1,
  },
  {
    node: 'CherryPicker',
    name: 'Mobile aerial tower',
    summary: 'The “cherry picker”: the pilot’s way out.',
    detail:
      'Once the service structure had rolled back, this truck-mounted tower held a cab at the capsule hatch so ' +
      'the pilot could step across and be swung clear. It could reach 125 feet and could be lowered from the ' +
      'blockhouse by remote control. It stayed at the hatch from T−55 minutes until the last minutes of the count.',
    facts: [
      ['Reach', '125 ft (38 m)'],
      ['At the hatch', 'from T−55 min to the last minutes'],
      ['Control', 'ground, cab, or blockhouse'],
    ],
    // It did not drive away: the liftoff photograph shows the truck still on the hardstand, mast up,
    // cab lowered. Until the lowering is modelled it stays where it stands.
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'LaunchPedestal',
    name: 'Launch pedestal',
    summary: 'A ring on four legs over a flame deflector.',
    detail:
      'The Mercury-Redstone had no hold-down arms. It stood on the pedestal under its own weight, grounded and ' +
      'fed through two connectors under one fin, and left when thrust exceeded weight. On MR-1 it rose 3.8 ' +
      'inches, shut down, and settled back onto this ring.',
    facts: [
      ['Hold-down arms', 'none'],
      ['Ground connections', '2, under fin II'],
    ],
    explode: [0, 0, 0],
    order: 2,
  },
  {
    node: 'UmbilicalMast',
    name: 'Cable mast',
    summary: 'Carries the capsule’s umbilical until T−35 seconds.',
    detail:
      'One of two cable masts, this one for the capsule (the booster’s is not modelled): ground power, cooling ' +
      'and communications. The capsule’s umbilical dropped at about T−35 seconds, and the boom fell away just ' +
      'before ignition.',
    explode: [0, 0, 7],
    order: 0,
  },
  {
    node: 'Hardstand',
    name: 'Hardstand and rails',
    summary: 'Concrete apron; track for the service structure.',
    detail:
      'Pad 5 is one of two pads of Complex 5/6, about 535 feet apart, sharing a blockhouse some 345 feet from ' +
      'each. Twenty-three rockets left this pad between 1956 and 1961. The last was Liberty Bell 7; it never ' +
      'launched again.',
    explode: [0, 0, 0],
    order: 2,
  },
  {
    node: 'Floodlights',
    name: 'Floodlights',
    summary: 'The count ran through the night.',
    detail:
      'Shepard was woken at 01:10, went up the gantry at 05:15 and was in the capsule at 05:20, before sunrise. ' +
      'He waited there four hours and fourteen minutes.',
    explode: [0, 0, 0],
    order: 2,
  },
];

const pad: ModelDef = {
  id: 'pad',
  name: 'Launch pad',
  url: 'models/usa/mercury/mr-3-freedom-7/pad.glb',
  scale: 'Launch Complex 5 · hardstand 62 m square · to scale',
  backdrop: 'cape-canaveral',
  slider: ['T−55 min', 'Liftoff'],
  specGroups: ['Launch pad'],
  parts: padParts,
  views: [
    { id: 'pedestal', label: 'Pedestal', centreY: 1.4, span: 9 },
    { id: 'hatch', label: 'Hatch level', centreY: 21, span: 11 },
  ],
};

const crewParts: Part[] = [
  {
    node: 'Helmet',
    name: 'Helmet',
    summary: 'Fibreglass shell, clear visor, pneumatic seal.',
    detail:
      'The visor closes against an inflatable seal fed from a small pressure bottle through a fitting by the left ' +
      'jaw. Used oxygen leaves through the hose on the right side. In flight Shepard kept the visor closed; the ' +
      'suit itself stayed soft, because the cabin held pressure and the suit is only the backup.',
    facts: [
      ['Shell', 'fibreglass'],
      ['Neck ring', 'aluminium'],
      ['Outlet hose', 'right side'],
      ['Visor seal', 'pneumatic, fed at the left jaw'],
    ],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Torso',
    name: 'Torso',
    summary: 'Aluminised nylon over a rubber-coated bladder.',
    detail:
      'A Navy Mark IV high-altitude suit by B.F. Goodrich, reworked for Mercury: the grey outer shell became ' +
      'aluminium-coated nylon, and the breathing loop was closed so that one flow of oxygen both cools and ' +
      'feeds the pilot. It enters at the waist. The long entry zipper runs diagonally across the chest.',
    facts: [
      ['Suit', 'Navy Mark IV, B.F. Goodrich'],
      ['Mass', 'about 20 lb (9 kg)'],
      ['Pressure if the cabin fails', '4.6 psi'],
      ['Oxygen inlet', 'waist'],
      ['Each pilot had', 'three: training, flight, spare'],
    ],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Arms',
    name: 'Arms',
    summary: 'Laced to length, with restraint cords at the joints.',
    detail:
      'A pressurised sleeve wants to straighten like a balloon. Cords and lacing along each arm stop it ' +
      'ballooning and set its length to the man; even so, bending a pressurised elbow is work. The gauge on the ' +
      'left forearm shows suit pressure.',
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Gloves',
    name: 'Gloves',
    summary: 'Zipped to the sleeves; one straight finger.',
    detail:
      'Four fingers are curved to rest on the hand controller. The middle finger is straight, for pushing ' +
      'buttons. On this flight the gloves were zipped directly to the sleeves, so the wrists could not turn; ' +
      'the bearing-and-lock-ring wrist arrived on the next flight.',
    facts: [
      ['Attachment on MR-3', 'zipper'],
      ['From MR-4', 'ring lock with wrist bearing'],
    ],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Legs',
    name: 'Legs',
    summary: 'Tailored and laced; the biomedical plug is on the thigh.',
    detail:
      'Each suit was tailored to its pilot and laced snug. A flap on the right thigh covers the connector that ' +
      'carries heartbeat, breathing and temperature to the telemetry.',
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Boots',
    name: 'Boots',
    summary: 'Laced leather over the suit’s feet.',
    detail: 'Separate lace-up boots worn over the pressure suit’s socks. The last Mercury flight built the boots into ' + 'the suit.',
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Ventilator',
    name: 'Portable ventilator',
    summary: 'The suitcase in every photograph of the walk-out.',
    detail:
      'A sealed suit has no way to shed heat, so from the suiting room to the capsule Shepard carried his own ' +
      'air-conditioning: a blower and cooler in a case, plugged into the waist inlet. At the capsule the hose ' +
      'came off and the spacecraft’s own system took over.',
    explode: [0, 0, 0],
    order: 0,
  },
];

const crew: ModelDef = {
  id: 'crew',
  name: 'Crew',
  url: 'models/usa/mercury/mr-3-freedom-7/crew.glb',
  scale: 'Alan B. Shepard Jr. · 1.80 m, 1.89 m suited · to scale',
  backdrop: 'cape-canaveral',
  parts: crewParts,
  ...PILOT,
  wide: false,
  specGroups: ['Pressure suit'],
  home: 'walkout',
  views: [
    // from low on his far side, so the vehicle he is about to ride stands up behind him
    { id: 'walkout', label: 'Walk-out', centreY: 2.4, span: 6.2, from: [-0.5, -0.3, 0.82] },
    { id: 'figure', label: 'Pilot', centreY: 0.98, span: 2.5, from: [-0.55, 0.05, 0.83] },
    { id: 'helmet', label: 'Helmet', centreY: 1.72, span: 0.62, from: [-0.55, 0.05, 0.83] },
    { id: 'hands', label: 'Gloves', centreY: 0.95, span: 0.62, from: [-0.55, 0.05, 0.83] },
    { id: 'boots', label: 'Boots', centreY: 0.2, span: 0.62, from: [-0.55, 0.2, 0.83] },
  ],
  with: [{ model: 'pad', exploded: 1 }],
};

/** Mercury-Redstone 3. Prose versions of this file: ./README.md (flight), ./spacecraft.md (ship). */
export const flight: Flight = {
  id: 'usa/mercury/mr-3-freedom-7',
  nation: 'USA',
  agency: 'NASA',
  program: 'Project Mercury',
  designation: 'Mercury-Redstone 3',
  callsign: 'Freedom 7',
  spacecraft: 'Mercury spacecraft No. 7 (McDonnell Aircraft)',
  launchVehicle: 'Mercury-Redstone MRLV, MR-7',
  launch: '1961-05-05T14:34:13Z',
  launchSite: 'Cape Canaveral, Launch Complex 5',
  crew: ['Alan B. Shepard Jr.'],
  summary:
    'The first American in space. A fifteen-minute suborbital arc from Cape Canaveral into the Atlantic, ' +
    'during which Shepard took manual control of the spacecraft in all three axes.',
  facts: [
    { label: 'Liftoff', value: '5 May 1961, 14:34:13 UTC' },
    { label: 'Pilot', value: 'Alan B. Shepard Jr.' },
    { label: 'Duration', value: '15 min 22 s' },
    { label: 'Apogee', value: '187.4 km' },
    { label: 'Range', value: '487.3 km' },
    { label: 'Peak velocity', value: '8,107 km/h' },
    { label: 'Peak load', value: '11.0 g on entry' },
    { label: 'Recovery', value: 'USS Lake Champlain' },
  ],
  // Postlaunch Report for Mercury-Redstone No. 3 (NASA STG, 16 June 1961), event table
  timeline: [
    { t: 0, event: 'Liftoff' },
    { t: 84, event: 'Maximum dynamic pressure, 586 lb/ft²' },
    { t: 141.8, event: 'Booster engine cutoff, 6.3 g' },
    { t: 142.2, event: 'Escape tower released and fired clear' },
    { t: 152.3, event: 'Spacecraft separation at 74.3 km: posigrade motors fire' },
    { t: 157, event: 'Turnaround to heat-shield-forward' },
    { t: 184, event: 'Manual control: pitch, then yaw, then roll' },
    { t: 311, event: 'Apogee, 187.4 km' },
    { t: 314.1, event: 'Retrofire: three motors, five seconds apart' },
    { t: 373.6, event: 'Retropack jettison' },
    { t: 468.2, event: 'Entry begins (0.05 g)' },
    { t: 501, event: 'Peak entry load, 11.0 g' },
    { t: 578.1, event: 'Drogue parachute, 6.4 km' },
    { t: 614.8, event: 'Main parachute, 3.2 km' },
    { t: 922, event: 'Landing, 27°13.7′N 75°53′W' },
  ],
  specs: [
    { group: 'Spacecraft', label: 'Heat shield diameter', value: 74.5 * IN, unit: 'm', confidence: 'documented', note: '74.5 in' },
    { group: 'Spacecraft', label: 'Heat shield radius of curvature', value: 80 * IN, unit: 'm', confidence: 'documented', note: '80 in' },
    { group: 'Spacecraft', label: 'Afterbody half-angle', value: 20, unit: 'deg', confidence: 'documented', note: 'NASA CR-649' },
    {
      group: 'Spacecraft',
      label: 'Recovery compartment diameter',
      value: 32 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '32 in (NASA CR-649)',
    },
    {
      group: 'Spacecraft',
      label: 'Recovery compartment length',
      value: 22.76 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '22.76 in: stations 58.38 to 81.14 (NASA CR-649, Figure 1; its text says 20 in). SEDR 104 Figure 1-3 gives 22.86 in',
    },
    {
      group: 'Spacecraft',
      label: 'Afterbody length',
      value: 58.38 * IN,
      unit: 'm',
      confidence: 'derived',
      note: 'frustum from 74.5 in to 32 in at 20 degrees',
    },
    {
      group: 'Spacecraft',
      label: 'Antenna canister length',
      value: 23.43 * IN,
      unit: 'm',
      confidence: 'derived',
      note: '23.43 in: from the cylinder top at 81.14 in to the canister top at Z209.07 (SEDR 104, Figure 1-3). CR-649 says 24 in',
    },
    {
      group: 'Spacecraft',
      label: 'Antenna canister base diameter',
      value: 24 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '24 in, tapering to 20 in at the top (NASA CR-649); SEDR 104 Figure 1-3 scales to the same',
    },
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
      label: 'Escape tower length',
      value: 203.6 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '203.60 in: pylon base ring at Z185.45 to spike tip at Z389.05; truss bays, motor case and spike at the stations of SEDR 104, Figure 1-3',
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
      value: 59 * 0.3048,
      unit: 'm',
      confidence: 'documented',
      note: '59.00 ft (TM X-53107, Figure 4-1)',
    },
    {
      group: 'Launch vehicle',
      label: 'Booster top to the capsule’s widest plane',
      value: 8.0 * IN,
      unit: 'm',
      confidence: 'derived',
      note: '8.0 in: 83.38 ft less the 59.00 ft booster and the 284.55 in from that plane to the spike tip. Hammack & Heberlig Figure 17 implies 2.3 in; its total is 4.5 in short of 83.38 ft',
    },
    {
      group: 'Launch vehicle',
      label: 'Tail unit length',
      value: 9.27 * 0.3048,
      unit: 'm',
      confidence: 'documented',
      note: '9.27 ft (TM X-53107, Figure 4-1)',
    },
    {
      group: 'Launch vehicle',
      label: 'Centre section length',
      value: 37.5 * 0.3048,
      unit: 'm',
      confidence: 'documented',
      note: '37.50 ft: alcohol tank 18.8 ft over oxygen tank 16.83 ft',
    },
    {
      group: 'Launch vehicle',
      label: 'Aft section length',
      value: 139.64 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '139.64 in as drawn; the model’s is 146.76 in, taking in the 7.08 in Mercury stretch',
    },
    {
      group: 'Launch vehicle',
      label: 'Booster dry mass',
      value: 8093 * LB,
      unit: 'kg',
      confidence: 'derived',
      note: '8,093 lb: the 8,195 lb of TM X-53107 4.2.1, which counts 442 lb of damping compound, less the 102 lb of it added after MR-3',
    },
    {
      group: 'Launch vehicle',
      label: 'Fuel volume',
      value: 3348 * 3.785411784,
      unit: 'L',
      confidence: 'documented',
      note: '3,348 US gal of alcohol',
    },
    {
      group: 'Launch vehicle',
      label: 'Oxidiser volume',
      value: 3072 * 3.785411784,
      unit: 'L',
      confidence: 'documented',
      note: '3,072 US gal of liquid oxygen',
    },
    {
      group: 'Launch vehicle',
      label: 'Fin span',
      value: 152 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '152 in across the air rudders (Hammack & Heberlig, Figure 17)',
    },
    {
      group: 'Launch vehicle',
      label: 'Liftoff mass, whole vehicle',
      value: 66098 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: '66,098 lb',
    },
    {
      group: 'Spacecraft',
      label: 'Spacecraft launch mass',
      value: 4040 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: '4,040 lb, with escape tower',
    },
    { group: 'Spacecraft', label: 'Mass after separation', value: 2855.14 * LB, unit: 'kg', confidence: 'documented', note: '2,855 lb' },
    { group: 'Spacecraft', label: 'Mass at entry', value: 2579 * LB, unit: 'kg', confidence: 'documented', note: '2,579 lb' },
    { group: 'Spacecraft', label: 'Mass afloat', value: 2316.03 * LB, unit: 'kg', confidence: 'documented', note: '2,316 lb' },
    {
      group: 'Pressure suit',
      label: 'Pilot height',
      value: 1.803,
      unit: 'm',
      confidence: 'estimated',
      note: 'Shepard is widely given as 5 ft 11 in, the selection limit; no primary record read',
    },
    {
      group: 'Pressure suit',
      label: 'Suit mass',
      value: 20 * LB,
      unit: 'kg',
      confidence: 'estimated',
      note: '20 lb in NASA’s fact sheet, 22 lb elsewhere: secondary figures that disagree',
    },
    {
      group: 'Pressure suit',
      label: 'Operating pressure',
      value: 4.6 * 6.894757,
      unit: 'kPa',
      confidence: 'documented',
      note: '4.6 psi, held by the suit regulator only if the cabin loses pressure (SEDR 104; Results of the First U.S. Manned Suborbital Space Flight)',
    },
    {
      group: 'Launch pad',
      label: 'Mobile aerial tower reach',
      value: 125 * 0.3048,
      unit: 'm',
      confidence: 'documented',
      note: '125 ft (TM X-53107, 7.3.3.1)',
    },
    {
      group: 'Launch pad',
      label: 'White room',
      value: 3,
      unit: 'level',
      confidence: 'documented',
      note: 'level 3 of the service structure',
    },
    {
      group: 'Launch pad',
      label: 'Pedestal height',
      value: 6 * 0.3048,
      unit: 'm',
      confidence: 'estimated',
      note: '6 ft, scaled off photographs',
    },
    {
      group: 'Launch pad',
      label: 'Service structure height',
      value: 118 * 0.3048,
      unit: 'm',
      confidence: 'estimated',
      note: '118 ft to the crane, scaled off TM X-53107 Figure 7-7',
    },
    {
      group: 'Launch pad',
      label: 'Hardstand',
      value: 204 * 0.3048,
      unit: 'm',
      confidence: 'derived',
      note: 'about 204 ft square: Figure 7-6 scaled on the 535 ft between pads 5 and 6',
    },
    {
      group: 'Launch pad',
      label: 'Service structure launch position',
      value: 195 * 0.3048,
      unit: 'm',
      confidence: 'derived',
      note: 'about 195 ft from the pad centre, same scaling',
    },
    {
      group: 'Launch pad',
      label: 'Blockhouse',
      value: 345 * 0.3048,
      unit: 'm',
      confidence: 'derived',
      note: 'about 345 ft from each pad centre; drawn as scenery',
    },
  ],
  motors: [
    {
      name: 'Rocketdyne A-7 (booster)',
      count: 1,
      thrustN: 78000 * LBF,
      burnS: 143.5,
      propellant: 'ethyl alcohol / liquid oxygen',
      confidence: 'documented',
      note: 'sea level, nominal. MR-3 measured 78,860 lbf, Isp 214.8 s, cutoff at 141.8 s',
    },
    {
      name: 'Escape motor (Grand Central)',
      count: 1,
      thrustN: 52000 * LBF,
      burnS: 0.78,
      propellant: 'solid',
      confidence: 'documented',
      note: '52,000 lbf for 0.78 s, then decaying; three nozzles canted 19° (SEDR 104)',
    },
    {
      name: 'Tower jettison motor',
      count: 1,
      thrustN: 800 * LBF,
      burnS: 1.5,
      propellant: 'solid',
      confidence: 'documented',
      note: 'SP-45 nominal; McDonnell gives 785 lbf. Three nozzles canted 30°',
    },
    {
      name: 'Posigrade motor',
      count: 3,
      thrustN: 400 * LBF,
      burnS: 1,
      propellant: 'solid',
      confidence: 'documented',
      note: 'SP-45 nominal; McDonnell gives 370 lbf',
    },
    {
      name: 'Retrograde motor (Thiokol)',
      count: 3,
      thrustN: 1000 * LBF,
      burnS: 10,
      propellant: 'solid',
      confidence: 'documented',
      note: 'SP-45 nominal; McDonnell gives 992 lbf over 13.2 s. Fired 5 s apart',
    },
    {
      name: 'Pitch and yaw thruster, high',
      count: 4,
      thrustN: 24 * LBF,
      propellant: '90% hydrogen peroxide',
      confidence: 'documented',
      note: 'automatic system',
    },
    {
      name: 'Roll thruster, high',
      count: 2,
      thrustN: 6 * LBF,
      propellant: '90% hydrogen peroxide',
      confidence: 'documented',
      note: 'automatic system',
    },
    {
      name: 'Attitude thruster, low',
      count: 6,
      thrustN: 1 * LBF,
      propellant: '90% hydrogen peroxide',
      confidence: 'documented',
      note: 'automatic system, all axes',
    },
  ],
  models: [vehicle, pad, crew],
};

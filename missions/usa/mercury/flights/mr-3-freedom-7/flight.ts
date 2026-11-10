import type { Flight, ModelDef, Part } from '../../../../../src/types';

const IN = 0.0254;
const LBF = 4.4482216;
const LB = 0.45359237;

const vehicleParts: Part[] = [
    {
      node: 'EscapeTower',
      name: 'Launch escape tower',
      summary: 'Pulls the capsule off a failing booster.',
      detail:
        'A welded steel-tube truss carrying a solid motor of 52,000 lbf that burns for one second through three ' +
        'nozzles canted 19° clear of the capsule. On a good flight a smaller motor in the middle carries the tower ' +
        'away at booster cutoff: on MR-3, at T+2:22.',
      facts: [
        ['Escape motor', '52,000 lbf for 1 s'],
        ['Nozzles', '3, canted 19°'],
        ['Jettison motor', '800 lbf for 1.5 s'],
        ['Structure', 'welded steel tube'],
        ['Jettisoned', 'T+2:22'],
      ],
      explode: [0, 12.6, 0],
      order: 0,
    },
    {
      node: 'AntennaCanister',
      name: 'Antenna canister',
      summary: 'Bicone antenna, horizon scanners, drogue parachute.',
      detail:
        'The pale band is a dielectric window: the canister above and below it are the two halves of a bicone ' +
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
      name: 'Recovery compartment',
      summary: 'Main and reserve parachutes; pitch and yaw thrusters.',
      detail:
        'A 32-inch cylinder holding a 63-foot ring-sail main parachute and its reserve. On spacecraft No. 7 it is ' +
        'skinned in beryllium shingles. Pitch and yaw thrusters sit at its top, as far from the centre of mass as ' +
        'the vehicle allows.',
      facts: [
        ['Diameter', '32 in (0.81 m)'],
        ['Length', '20 in (0.51 m)'],
        ['Skin', 'beryllium shingles'],
        ['Main parachute', '63 ft ring-sail, plus reserve'],
        ['Thrusters', 'pitch and yaw: 24 lbf and 1 lbf'],
      ],
      explode: [0, 10.8, 0],
      order: 2,
    },
    {
      node: 'Hatch',
      name: 'Side hatch',
      summary: 'Bolted shut from outside with 70 bolts.',
      detail:
        'Shepard’s hatch was mechanical: the ground crew bolted it on, and he could not open it quickly. The ' +
        'explosive hatch arrived one flight later, on Liberty Bell 7.',
      facts: [
        ['Fastening', '70 bolts, from outside'],
        ['Explosive hatch', 'from MR-4 onward'],
      ],
      explode: [1.15, 9.9, 0],
      order: 3,
    },
    {
      node: 'Afterbody',
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
      name: 'Crew cabin',
      summary: 'Titanium pressure vessel, couch, instrument panel.',
      detail:
        'A double-walled titanium cone pressurised to 5.1 psi of pure oxygen, with about 1.7 cubic metres of room. ' +
        'The pilot lies on a fibreglass couch moulded to his body, back to the heat shield, so that launch and ' +
        'entry loads both push him into it.',
      facts: [
        ['Structure', 'double-walled titanium'],
        ['Atmosphere', 'pure oxygen at 5.1 psi'],
        ['Volume', 'about 1.7 m³'],
        ['Couch', 'fibreglass, moulded to the pilot'],
      ],
      explode: [0, 8.9, 0],
      order: 4,
    },
    {
      node: 'HeatShield',
      name: 'Heat shield',
      summary: 'Beryllium heat sink, 74.5 inches across.',
      detail:
        'A suborbital entry is short enough that the Redstone flights used a solid beryllium shield that soaks up ' +
        'the heat. The orbital flights replaced it with an ablative fibreglass-and-resin shield that chars away.',
      facts: [
        ['Diameter', '74.5 in (1.89 m)'],
        ['Radius of curvature', '80 in'],
        ['Material', 'beryllium heat sink'],
        ['Orbital flights', 'ablative fibreglass and resin'],
      ],
      explode: [0, 8.0, 0],
      order: 5,
    },
    {
      node: 'Retropack',
      name: 'Retropack',
      summary: 'Three retrograde and three posigrade motors.',
      detail:
        'The small posigrade motors push the capsule away from the spent Redstone. The three large motors are the ' +
        'braking burn that brings an orbital flight home; MR-3 was coming down anyway and fired them as a test. ' +
        'Three straps hold the pack against the shield until explosive bolts release it.',
      facts: [
        ['Retro motors', '3 × 1,000 lbf, 10 s each'],
        ['Fired', '5 s apart, from T+5:15'],
        ['Posigrade motors', '3 × 400 lbf, 1 s'],
        ['Jettisoned', 'T+6:15'],
      ],
      explode: [0, 7.2, 0],
      order: 6,
    },
    {
      node: 'RedstoneAdapter',
      name: 'Spacecraft adapter',
      summary: 'Joins a 74.5-inch capsule to a 70-inch booster.',
      detail:
        'A short flared ring with the retropack nested inside it. A Marman clamp at its top rim holds the capsule; ' +
        'at separation explosive bolts open the clamp and the posigrade motors push the capsule clear. MR-3 carried ' +
        '340 lb of ballast here to tame vibration.',
      facts: [
        ['Diameter', '70 in to 73.2 in'],
        ['Clamp', 'Marman ring, explosive bolts'],
        ['Ballast on MR-3', '340 lb'],
      ],
      explode: [0, 6.2, 0],
      order: 7,
    },
    {
      node: 'RedstoneAftUnit',
      name: 'Aft unit',
      summary: 'Instrument compartment: autopilot and abort sensing.',
      detail:
        'On the Redstone missile this section flew on with the warhead. Here it stays bolted to the tanks and ' +
        'carries the LEV-3 autopilot and the abort sensing system, which watches attitude, rates, chamber pressure ' +
        'and electrical power and fires the escape tower without asking anyone.',
      facts: [
        ['Length', '139.64 in (3.55 m)'],
        ['Instrument compartment', '53.66 in, pressurised'],
        ['Autopilot', 'LEV-3'],
        ['Skin', '0.090 in aluminium'],
      ],
      explode: [0, 5.0, 0],
      order: 8,
    },
    {
      node: 'RedstoneCenterUnit',
      name: 'Centre unit',
      summary: 'Alcohol above, liquid oxygen below.',
      detail:
        'The tank walls are the airframe. They are six feet longer than the missile’s, borrowed from the Jupiter-C, ' +
        'which stretched the burn by twenty seconds to 143.5. The fuel is 75% ethyl alcohol and 25% water: less ' +
        'energetic than the Jupiter-C’s Hydyne, and far less toxic to a pilot sitting on top of it.',
      facts: [
        ['Length', '37.50 ft (11.43 m)'],
        ['Alcohol tank', '18.8 ft · 3,348 US gal'],
        ['Oxygen tank', '16.83 ft · 3,072 US gal'],
        ['Skin', '0.063 in and 0.080 in aluminium'],
        ['Fuel', '75% ethyl alcohol, 25% water'],
      ],
      explode: [0, 3.4, 0],
      order: 9,
    },
    {
      node: 'RedstoneTailUnit',
      name: 'Tail unit',
      summary: 'Four fins, four air rudders, the engine bay.',
      detail:
        'The fins keep the vehicle stable; the small rudders at their tips steer it while there is air to push ' +
        'against. The quartered black-and-white paint is a roll pattern: tracking cameras read the vehicle’s roll ' +
        'angle from it.',
      facts: [
        ['Length', '9.27 ft (2.83 m)'],
        ['Fins', '4, with air rudders'],
        ['Skin', '0.125 in aluminium'],
        ['Attached by', '12 fasteners in tension'],
      ],
      explode: [0, 2.0, 0],
      order: 10,
    },
    {
      node: 'RedstoneEngine',
      name: 'A-7 engine',
      summary: '78,000 lbf; steered by graphite vanes in the exhaust.',
      detail:
        'Rocketdyne’s A-7, a direct descendant of the V-2’s engine: a single fixed chamber fed by a turbopump that ' +
        'runs on steam from decomposed hydrogen peroxide. It cannot swivel, so four graphite vanes sit in the ' +
        'exhaust and deflect it.',
      facts: [
        ['Thrust', '78,000 lbf (350 kN) at sea level'],
        ['Burn', '143.5 s nominal'],
        ['Specific impulse', '215 s at sea level'],
        ['Steering', '4 carbon jet vanes'],
        ['Turbopump', 'hydrogen-peroxide steam'],
      ],
      explode: [0, 0, 0],
      order: 11,
    },
];

/** Height of the pedestal's ring, where the fins rest: 6 ft. */
const PEDESTAL = 6 * 0.3048;
/** The vehicle's origin is the capsule's heat-shield plane, 716.5 in above the fins. */
const VEHICLE_Y = PEDESTAL + 716.5 * IN;

const vehicle: ModelDef = {
  id: 'vehicle',
  name: 'Vehicle',
  url: 'models/usa/mercury/mr-3-freedom-7/vehicle.glb',
  scale: '25.41 m tall · spacecraft 7.90 m · to scale',
  backdrop: 'ground',
  slider: ['Assembled', 'Exploded'],
  parts: vehicleParts,
  position: [0, VEHICLE_Y, 0],
  home: 'stack',
  views: [
    { id: 'stack', label: 'Full stack', centreY: PEDESTAL + 12.7, span: 27 },
    { id: 'spacecraft', label: 'Spacecraft', centreY: VEHICLE_Y + 3.26, span: 8.6 },
    { id: 'capsule', label: 'Capsule', centreY: VEHICLE_Y + 0.95, span: 3.4 },
    { id: 'engine', label: 'Engine', centreY: PEDESTAL + 1.5, span: 5.5 },
  ],
  with: [{ model: 'pad', position: [0, 0, 0] }],
};

const padParts: Part[] = [
  {
    node: 'ServiceStructure',
    name: 'Service structure',
    summary: 'The gantry, rolled back to its launch position.',
    detail:
      'Built for Redstone and Jupiter launches, it runs on rails under its own power and served both pad 5 and ' +
      'pad 6. For Mercury it was given remote control from the blockhouse, a blast deflector against an ' +
      'accidental firing of the escape rocket, and on level 3 an enclosed, air-conditioned white room: films ' +
      'from the unmanned flights had shown dust and debris floating round the cabin in weightlessness.',
    facts: [
      ['Height', 'about 36 m to the crane'],
      ['White room', 'level 3, added February–May 1961'],
      ['Moves', 'on rails, under its own power'],
      ['Control', 'remote, from the blockhouse'],
    ],
    explode: [-26, 0, 0],
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
      ['At the hatch', 'T−55 min to the final minutes'],
      ['Control', 'ground, cab, or blockhouse'],
    ],
    explode: [24, 0, 0],
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
    name: 'Umbilical mast',
    summary: 'Carries the capsule’s umbilical until liftoff.',
    detail:
      'A slender boom standing beside the vehicle with the capsule umbilical on its arm: ground power, cooling ' +
      'and communications until the last second.',
    explode: [0, 0, 7],
    order: 0,
  },
  {
    node: 'Hardstand',
    name: 'Hardstand and rails',
    summary: 'Concrete apron; track for the service structure.',
    detail:
      'Pad 5 is one of two pads of Complex 5/6, sharing a blockhouse a few hundred feet away. Six ' +
      'Mercury-Redstones flew from here between November 1960 and July 1961; it never launched again.',
    explode: [0, 0, 0],
    order: 2,
  },
  {
    node: 'Floodlights',
    name: 'Floodlights',
    summary: 'The count ran through the night.',
    detail:
      'Shepard was woken at 01:10 and entered the capsule at 05:15, before sunrise. Launch came more than four ' +
      'hours later.',
    explode: [0, 0, 0],
    order: 2,
  },
];

const pad: ModelDef = {
  id: 'pad',
  name: 'Launch pad',
  url: 'models/usa/mercury/mr-3-freedom-7/pad.glb',
  scale: 'Launch Complex 5 · service structure 36 m · to scale',
  backdrop: 'ground',
  slider: ['T−55 min', 'Pad cleared'],
  parts: padParts,
  views: [
    { id: 'pedestal', label: 'Pedestal', centreY: 1.4, span: 9 },
    { id: 'hatch', label: 'Hatch level', centreY: 21, span: 11 },
  ],
  with: [{ model: 'vehicle', position: [0, VEHICLE_Y, 0] }],
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
    'The first American in space. A fifteen-minute suborbital arc from Cape Canaveral to the Atlantic, ' +
    'during which Shepard took manual control of the spacecraft in all three axes.',
  facts: [
    { label: 'Launch', value: '5 May 1961, 14:34:13 UTC' },
    { label: 'Pilot', value: 'Alan B. Shepard Jr.' },
    { label: 'Duration', value: '15 min 22 s' },
    { label: 'Apogee', value: '187.5 km' },
    { label: 'Range', value: '487.3 km' },
    { label: 'Peak velocity', value: '8,340 km/h' },
    { label: 'Peak load', value: '11.6 g on entry' },
    { label: 'Recovery', value: 'USS Lake Champlain' },
  ],
  timeline: [
    { t: 0, event: 'Liftoff' },
    { t: 84, event: 'Maximum dynamic pressure' },
    { t: 140, event: 'Booster engine cutoff, 6.3 g' },
    { t: 142, event: 'Escape tower jettison' },
    { t: 144, event: 'Spacecraft separation: posigrade motors fire' },
    { t: 155, event: 'Turnaround to heat-shield-forward; manual control tests begin' },
    { t: 300, event: 'Apogee, 187.5 km' },
    { t: 315, event: 'Retrofire: three motors, five seconds apart' },
    { t: 375, event: 'Retropack jettison' },
    { t: 578, event: 'Drogue parachute' },
    { t: 615, event: 'Main parachute' },
    { t: 922, event: 'Splashdown, 27°14′N 75°53′W' },
  ],
  specs: [
    { group: 'Spacecraft', label: 'Heat shield diameter', value: 74.5 * IN, unit: 'm', confidence: 'documented', note: '74.5 in' },
    { group: 'Spacecraft', label: 'Heat shield radius of curvature', value: 80 * IN, unit: 'm', confidence: 'documented', note: '80 in' },
    { group: 'Spacecraft', label: 'Afterbody half-angle', value: 20, unit: 'deg', confidence: 'documented' },
    { group: 'Spacecraft', label: 'Recovery compartment diameter', value: 32 * IN, unit: 'm', confidence: 'documented', note: '32 in' },
    { group: 'Spacecraft', label: 'Recovery compartment length', value: 20 * IN, unit: 'm', confidence: 'documented', note: '20 in' },
    { group: 'Spacecraft', label: 'Afterbody length', value: 58.38 * IN, unit: 'm', confidence: 'derived', note: 'frustum from 74.5 in to 32 in at 20 degrees' },
    { group: 'Spacecraft', label: 'Antenna canister length', value: 24 * IN, unit: 'm', confidence: 'documented', note: '24 in' },
    { group: 'Spacecraft', label: 'Antenna canister diameters', value: 30 * IN, unit: 'm', confidence: 'estimated', note: 'modelled 30 in tapering to 25 in' },
    { group: 'Spacecraft', label: 'Length, retro nozzles to canister top', value: 3.33, unit: 'm', confidence: 'documented', note: 'model: 3.30 m' },
    { group: 'Spacecraft', label: 'Length with escape tower', value: 7.9, unit: 'm', confidence: 'documented', note: '25 ft 11 in; model: 7.904 m' },
    { group: 'Spacecraft', label: 'Escape tower truss and motor layout', value: 5.23, unit: 'm', confidence: 'estimated', note: 'overall length fixed by the two figures above; bay spacing from photographs' },
    { group: 'Launch vehicle', label: 'Height on the pad', value: 25.414, unit: 'm', confidence: 'documented', note: '83.38 ft, fins to spike; model: 25.413 m' },
    { group: 'Launch vehicle', label: 'Booster diameter', value: 70 * IN, unit: 'm', confidence: 'documented', note: '70 in' },
    { group: 'Launch vehicle', label: 'Booster length without spacecraft', value: 59 * 12 * IN, unit: 'm', confidence: 'documented', note: '59.00 ft to station zero; model: 716.5 in to the heat-shield plane' },
    { group: 'Launch vehicle', label: 'Tail unit length', value: 9.27 * 0.3048, unit: 'm', confidence: 'documented', note: '9.27 ft (TM X-53107, Figure 4-1)' },
    { group: 'Launch vehicle', label: 'Centre section length', value: 37.5 * 0.3048, unit: 'm', confidence: 'documented', note: '37.50 ft: alcohol tank 18.8 ft over oxygen tank 16.83 ft' },
    { group: 'Launch vehicle', label: 'Aft section length', value: 139.64 * IN, unit: 'm', confidence: 'documented', note: '139.64 in, of which the instrument compartment is 53.66 in' },
    { group: 'Launch vehicle', label: 'Booster dry mass', value: 8195 * LB, unit: 'kg', confidence: 'documented', note: '8,195 lb with airborne equipment' },
    { group: 'Launch vehicle', label: 'Fuel volume', value: 3348 * 3.785411784, unit: 'L', confidence: 'documented', note: '3,348 US gal of alcohol' },
    { group: 'Launch vehicle', label: 'Oxidiser volume', value: 3072 * 3.785411784, unit: 'L', confidence: 'documented', note: '3,072 US gal of liquid oxygen' },
    { group: 'Launch vehicle', label: 'Fin span', value: 152 * IN, unit: 'm', confidence: 'estimated', note: '12 ft 8 in, from the Redstone missile' },
    { group: 'Launch vehicle', label: 'Liftoff mass, whole vehicle', value: 66098 * LB, unit: 'kg', confidence: 'documented', note: '66,098 lb' },
    { group: 'Spacecraft', label: 'Spacecraft launch mass', value: 4040 * LB, unit: 'kg', confidence: 'documented', note: '4,040 lb, with escape tower' },
    { group: 'Spacecraft', label: 'Landing mass', value: 2316 * LB, unit: 'kg', confidence: 'documented', note: '2,316 lb' },
    { group: 'Launch pad', label: 'Mobile aerial tower reach', value: 125 * 0.3048, unit: 'm', confidence: 'documented', note: '125 ft (TM X-53107, 7.3.3.1)' },
    { group: 'Launch pad', label: 'White room', value: 3, unit: 'level', confidence: 'documented', note: 'level 3 of the service structure' },
    { group: 'Launch pad', label: 'Pedestal height', value: 6 * 0.3048, unit: 'm', confidence: 'estimated', note: '6 ft, scaled off photographs' },
    { group: 'Launch pad', label: 'Service structure height', value: 118 * 0.3048, unit: 'm', confidence: 'estimated', note: '118 ft to the crane, scaled off TM X-53107 Figure 7-7' },
    { group: 'Launch pad', label: 'Hardstand', value: 120 * 0.3048, unit: 'm', confidence: 'estimated', note: '120 ft square, scaled off Figure 7-6' },
  ],
  motors: [
    { name: 'Rocketdyne A-7 (booster)', count: 1, thrustN: 78000 * LBF, burnS: 143.5, propellant: '75% ethyl alcohol / liquid oxygen', confidence: 'documented', note: 'sea level; Isp 215 s; steered by four graphite jet vanes' },
    { name: 'Escape motor (Grand Central 1-KS-52000)', count: 1, thrustN: 52000 * LBF, burnS: 1, propellant: 'solid', confidence: 'documented', note: 'three nozzles canted 19 degrees' },
    { name: 'Tower jettison motor', count: 1, thrustN: 800 * LBF, burnS: 1.5, propellant: 'solid', confidence: 'documented' },
    { name: 'Posigrade motor', count: 3, thrustN: 400 * LBF, burnS: 1, propellant: 'solid', confidence: 'documented' },
    { name: 'Retrograde motor (Thiokol TE-316)', count: 3, thrustN: 1000 * LBF, burnS: 10, propellant: 'solid', confidence: 'documented', note: 'fired at 5 s intervals' },
    { name: 'Pitch and yaw thruster, high', count: 4, thrustN: 24 * LBF, burnS: 0, propellant: '90% hydrogen peroxide', confidence: 'documented', note: 'automatic system' },
    { name: 'Roll thruster, high', count: 2, thrustN: 6 * LBF, burnS: 0, propellant: '90% hydrogen peroxide', confidence: 'documented', note: 'automatic system' },
    { name: 'Attitude thruster, low', count: 6, thrustN: 1 * LBF, burnS: 0, propellant: '90% hydrogen peroxide', confidence: 'documented', note: 'automatic system, all axes' },
  ],
  models: [vehicle, pad],
};


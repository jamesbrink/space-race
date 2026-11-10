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
      explode: [0, 2.3, 0],
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
      explode: [0, 1.45, 0],
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
      explode: [0, 0.75, 0],
      order: 2,
    },
    {
      node: 'Hatch',
      name: 'Side hatch',
      summary: 'Bolted shut from outside with 70 bolts.',
      detail:
        'Shepard’s hatch was mechanical: the ground crew bolted it on, and he could not open it quickly. The ' +
        'explosive hatch arrived one flight later, on Liberty Bell 7.',
      explode: [1.15, 0, 0],
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
      explode: [0, 0, 0],
      order: 4,
    },
    {
      node: 'CrewCabin',
      name: 'Crew cabin',
      summary: 'Titanium pressure vessel, couch, instrument panel.',
      detail:
        'A double-walled titanium cone pressurised to 5.1 psi of pure oxygen, with about 1.7 cubic metres of room. ' +
        'The pilot lies on a fibreglass couch moulded to his body, back to the heat shield, so that launch and ' +
        'entry loads both push him into it.',
      explode: [0, -0.95, 0],
      order: 4,
    },
    {
      node: 'HeatShield',
      name: 'Heat shield',
      summary: 'Beryllium heat sink, 74.5 inches across.',
      detail:
        'A suborbital entry is short enough that the Redstone flights used a solid beryllium shield that soaks up ' +
        'the heat. The orbital flights replaced it with an ablative fibreglass-and-resin shield that chars away.',
      explode: [0, -1.85, 0],
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
      explode: [0, -2.6, 0],
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
      explode: [0, -4.1, 0],
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
      explode: [0, -5.4, 0],
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
      explode: [0, -6.9, 0],
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
      explode: [0, -8.6, 0],
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
      explode: [0, -12.2, 0],
      order: 11,
    },
];

const vehicle: ModelDef = {
  id: 'vehicle',
  name: 'Vehicle',
  url: 'models/usa/mercury/mr-3-freedom-7/vehicle.glb',
  scale: '25.41 m on the pad · spacecraft 7.90 m · to scale',
  backdrop: 'orbit',
  slider: ['Assembled', 'Exploded'],
  parts: vehicleParts,
  views: [
    { id: 'spacecraft', label: 'Spacecraft', centreY: 3.26, span: 8.6 },
    { id: 'capsule', label: 'Capsule', centreY: 0.95, span: 3.4 },
  ],
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
    { group: 'Launch vehicle', label: 'Booster length without spacecraft', value: 59 * 12 * IN, unit: 'm', confidence: 'documented', note: '59 ft; model: 716.5 in to the heat-shield plane' },
    { group: 'Launch vehicle', label: 'Booster section breaks', value: 135 * IN, unit: 'm', confidence: 'estimated', note: 'tail 135 in, tanks 373 in, aft unit 160 in, adapter 48.5 in' },
    { group: 'Launch vehicle', label: 'Fin span', value: 152 * IN, unit: 'm', confidence: 'estimated', note: '12 ft 8 in, from the Redstone missile' },
    { group: 'Launch vehicle', label: 'Liftoff mass, whole vehicle', value: 66098 * LB, unit: 'kg', confidence: 'documented', note: '66,098 lb' },
    { group: 'Spacecraft', label: 'Spacecraft launch mass', value: 4040 * LB, unit: 'kg', confidence: 'documented', note: '4,040 lb, with escape tower' },
    { group: 'Spacecraft', label: 'Landing mass', value: 2316 * LB, unit: 'kg', confidence: 'documented', note: '2,316 lb' },
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
  models: [vehicle],
};


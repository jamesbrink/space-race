import type { Flight } from '../../../../../src/types';

const IN = 0.0254;
const LBF = 4.4482216;
const LB = 0.45359237;

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
    { label: 'Heat shield diameter', value: 74.5 * IN, unit: 'm', confidence: 'documented', note: '74.5 in' },
    { label: 'Heat shield radius of curvature', value: 80 * IN, unit: 'm', confidence: 'documented', note: '80 in' },
    { label: 'Afterbody half-angle', value: 20, unit: 'deg', confidence: 'documented' },
    { label: 'Recovery compartment diameter', value: 32 * IN, unit: 'm', confidence: 'documented', note: '32 in' },
    { label: 'Recovery compartment length', value: 20 * IN, unit: 'm', confidence: 'documented', note: '20 in' },
    { label: 'Afterbody length', value: 58.38 * IN, unit: 'm', confidence: 'derived', note: 'frustum from 74.5 in to 32 in at 20 degrees' },
    { label: 'Antenna canister length', value: 24 * IN, unit: 'm', confidence: 'documented', note: '24 in' },
    { label: 'Antenna canister diameters', value: 30 * IN, unit: 'm', confidence: 'estimated', note: 'modelled 30 in tapering to 25 in' },
    { label: 'Length, retro nozzles to canister top', value: 3.33, unit: 'm', confidence: 'documented', note: 'model: 3.30 m' },
    { label: 'Length with escape tower', value: 7.9, unit: 'm', confidence: 'documented', note: '25 ft 11 in; model: 7.904 m' },
    { label: 'Escape tower truss and motor layout', value: 5.23, unit: 'm', confidence: 'estimated', note: 'overall length fixed by the two figures above; bay spacing from photographs' },
    { label: 'Launch mass', value: 4040 * LB, unit: 'kg', confidence: 'documented', note: '4,040 lb, with escape tower' },
    { label: 'Landing mass', value: 2316 * LB, unit: 'kg', confidence: 'documented', note: '2,316 lb' },
  ],
  motors: [
    { name: 'Escape motor (Grand Central 1-KS-52000)', count: 1, thrustN: 52000 * LBF, burnS: 1, propellant: 'solid', confidence: 'documented', note: 'three nozzles canted 19 degrees' },
    { name: 'Tower jettison motor', count: 1, thrustN: 800 * LBF, burnS: 1.5, propellant: 'solid', confidence: 'documented' },
    { name: 'Posigrade motor', count: 3, thrustN: 400 * LBF, burnS: 1, propellant: 'solid', confidence: 'documented' },
    { name: 'Retrograde motor (Thiokol TE-316)', count: 3, thrustN: 1000 * LBF, burnS: 10, propellant: 'solid', confidence: 'documented', note: 'fired at 5 s intervals' },
    { name: 'Pitch and yaw thruster, high', count: 4, thrustN: 24 * LBF, burnS: 0, propellant: '90% hydrogen peroxide', confidence: 'documented', note: 'automatic system' },
    { name: 'Roll thruster, high', count: 2, thrustN: 6 * LBF, burnS: 0, propellant: '90% hydrogen peroxide', confidence: 'documented', note: 'automatic system' },
    { name: 'Attitude thruster, low', count: 6, thrustN: 1 * LBF, burnS: 0, propellant: '90% hydrogen peroxide', confidence: 'documented', note: 'automatic system, all axes' },
  ],
  parts: [
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
  ],
  model: { url: 'models/usa/mercury/mr-3-freedom-7.glb', heightM: 7.904, diameterM: 1.892 },
};

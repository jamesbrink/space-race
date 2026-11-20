import type { Keyframe, ModelDef, Move, Part } from '../../../../src/types.ts';
import { part, umbilicalTower } from './lc-39.ts';

const manual = 'Saturn IB Flight Manual SA-206, §VII, figures 7-4 through 7-7.';
const ksc = 'Skylab 2 Postlaunch Report, KSC, §§6.12, 6.15 and 6.23.';
const commentary = 'Skylab 2 launch commentary, tapes MC1/1, MC3/1 and MC9/1.';
export const sl2Ingress: [number, number] = [-9720, -89 * 60];
export const sa206Elevation = (3871 - 2196.859) * 0.0254;
// KSC §6.12: SACS 7 and 3 closed 268 and 289 ms after commit. Carrier ejection preceded arm movement.
const withdraw = 0.02 + 0.289;
const shortStroke = 0.4 + (0.6 * 3.9) / 6.1;
function key(at: number, slider: number, event: string, confidence: Keyframe['confidence'], source: string): Keyframe {
  return { at, slider, event, confidence, source };
}
function swing(node: string, from: number, to: number, degrees: number, bearing?: number): Move {
  const a = ((bearing ?? 0) * Math.PI) / 180;
  return {
    kind: 'swing',
    node,
    from,
    to,
    angle: (degrees * Math.PI) / 180,
    axis: bearing === undefined ? [0, 1, 0] : [-Math.sin(a), 0, -Math.cos(a)],
    machine: {
      kind: bearing === undefined ? 'hydraulic' : 'release',
      confidence: 'estimated',
      source: manual + ' Mechanism sound approximated.',
    },
  };
}
const serviceArms = [
  [
    '1A',
    'S-IB forward',
    'Adapted from an S-IC arm, it gained a 68-inch extension and occupied the former position of arm 5.',
    'Pneumatic, electrical and air-conditioning lines served the top of the first stage. A lanyard pulled the disconnected equipment away.',
  ],
  [
    '6',
    'S-IVB aft',
    'A modified carrier reached the Saturn IB’s cylindrical upper-stage adapter.',
    'Hydrogen and oxygen crossed this arm to the upper stage. A line-handling device caught the disconnected lines.',
  ],
  [
    '7',
    'S-IVB forward and instrument unit',
    'The Saturn IB kept the instrument-unit connection here. The lunar-module services had been removed.',
    'This arm vented the hydrogen tank and conditioned the instrument unit. The only damage reported to the four inflight arms was a small piece of rubber missing from a bracket on this one.',
  ],
  [
    '8',
    'Service module',
    'The elevated pedestal put CSM-116 within reach of the same arm the tower had used for Apollo.',
    'Coolant, vents, air, power and pneumatic lines reached CSM-116 here. Its carrier withdrew by a pneumatic and mechanical lanyard system.',
  ],
  [
    '9',
    'Spacecraft access',
    'Level 320 gave the crew a route from the elevators to the command module.',
    'The crew crossed to the white room at the hatch. After closeout the arm waited twelve degrees from the spacecraft until the final five minutes.',
  ],
].map(([number, name, summary, detail]): Part => {
  const node = 'Service_Arm_' + number;
  return {
    ...part(node, name + ' arm', summary, detail),
    moves:
      number === '9' ? [swing(node, 0, 0.15, 12), swing(node, 0.15, 0.4, 78)] : [swing(node, 0.4, number === '1A' ? shortStroke : 1, 90)],
  };
});
export const skylabLauncher: ModelDef = {
  id: 'pad',
  name: 'Mobile launcher 1 · Saturn IB pedestal',
  backdrop: 'ground',
  url: 'models/usa/places/cape-canaveral/lc39/pad-b-1973-05.glb',
  home: 'launcher',
  position: [0, -47 * 0.3048, 0],
  scale: '127 ft pedestal working level above the launcher deck',
  slider: ['Service arms connected', 'Arms clear'],
  sequence: [
    key(
      sl2Ingress[0],
      0,
      'Scheduled crew ingress',
      'assumed',
      'Skylab 1/2 Press Kit, pp. 30–31. Countdown time includes the subsequent two-minute hold.',
    ),
    key(-2820, 0, 'Access arm starts toward standby', 'documented', commentary),
    key(-2800, 0.15, 'Access arm at twelve degrees', 'estimated', commentary + ' Stroke duration reconstructed.'),
    key(-300, 0.15, 'Final access-arm withdrawal', 'documented', commentary),
    key(-279, 0.4, 'Access arm clear', 'estimated', commentary + ' Clear by the next announcement.'),
    key(withdraw, 0.4, 'Inflight arms start back', 'estimated', ksc + ' Common start approximated from switch closure.'),
    key(withdraw + 3.9, shortStroke, 'S-IB forward arm clear', 'assumed', manual + ' Nominal travel time.'),
    key(withdraw + 6.1, 1, 'Upper arms clear', 'assumed', manual + ' Maximum retract time.'),
  ],
  parts: [
    part(
      'Hardstand',
      'Pad B hardstand',
      'The crawler brought ML-1 and SA-206 up the ramp together.',
      'Concrete working surfaces flank the flame trench. The pad outline is reconstructed.',
    ),
    part(
      'Water_Valve_Pit',
      'Water valve pit',
      'Pad B received its water lines on the east side.',
      'A flush cover marks the pit on the hardstand.',
    ),
    part(
      'Storage_Spheres',
      'Cryogenic storage',
      'The S-IVB needed both liquid oxygen and liquid hydrogen.',
      'Insulated storage vessels supplied the pad through transfer lines. Jackets and supports are reconstructed.',
    ),
    part(
      'Flame_Deflector',
      'Flame deflector',
      'The eight H-1 engines exhausted through the pedestal and launcher base into the trench.',
      'The refractory deflector divided the exhaust beneath the stack. Its curved profile is approximate.',
    ),
    part(
      'ECS_Room',
      'Environmental control room',
      'Pad equipment supplied conditioned air and nitrogen to the stack.',
      'The exterior equipment is reconstructed from the Complex 39 installation.',
    ),
    part(
      'Pad_Pedestals',
      'Launcher supports',
      'The crawler lowered the launcher onto six supports at the pad.',
      'The bottom of the mobile launcher stood 22 feet above the hardstand.',
    ),
    part(
      'Launcher_Base',
      'Mobile launcher 1',
      'ML-1 carried its Apollo tower back to the pad with a new pedestal over the exhaust opening.',
      'The deck stood 25 feet above the bottom of the launcher. The pedestal lined up the shorter Saturn IB with the upper service arms.',
    ),
    part(
      'Launch_Pedestal',
      'Saturn IB launch pedestal',
      'The steel structure known as the milkstool carried SA-206 above the mobile launcher.',
      'Eight support positions took the loads at the S-IB fins. The open centre gave the H-1 engines a path down to the trench.',
    ),
    part(
      'Pedestal_Bridge',
      'Pedestal access bridge',
      'A bridge linked the tower to the elevated launch platform.',
      'Crews could reach the service equipment around the base of the rocket. Deck and railing details are reconstructed.',
    ),
    {
      ...part(
        'Holddown_Arms',
        'Eight hold-down arms',
        'One arm restrained the Saturn at each fin support.',
        'Helium released all eight arms. The manual gives about 140 milliseconds from command to the slowest retraction. Release angles are estimated.',
      ),
      clocked: Array.from({ length: 8 }, (_, i) => swing('Holddown_Link_' + (i + 1), 0.02, 0.16, 55, i * 45)),
    },
    {
      ...part(
        'Tail_Service_Masts',
        'Propellant and cable masts',
        'Four short masts served the S-IB at the pedestal.',
        'The oxygen coupling parted as the rocket rose. The short cable masts disconnected after about four inches of rise. Retraction times, angles and bearings are reconstructed.',
      ),
      clocked: ['Fuel_Mast', 'LOX_Mast', 'Cable_Mast_II', 'Cable_Mast_IV'].map((node, i) =>
        swing(node, node.startsWith('Cable') ? 0.44 : 0.19, 1.2, 48, [67.5, 157.5, 112.5, 292.5][i]),
      ),
    },
    umbilicalTower(manual),
    part(
      'Hammerhead_Crane',
      'Hammerhead crane',
      'The crane above ML-1 served the vehicle and its tower.',
      'The hook could reach 85 feet from the tower centreline. The crane is parked across the tower.',
    ),
    ...serviceArms,
  ],
  views: [
    {
      id: 'launcher',
      label: 'Mobile launcher',
      nodes: ['Launcher_Base', 'Umbilical_Tower', 'Hammerhead_Crane', 'Launch_Pedestal'],
      from: [-1, 0.18, 1],
    },
    { id: 'pedestal', label: 'Saturn IB pedestal', nodes: ['Launch_Pedestal', 'Pedestal_Bridge'], from: [-1, 0.1, 1] },
    { id: 'hold-down', label: 'Fin support and release', nodes: ['Holddown_Link_1'], span: 4, from: [1, 0.25, 1] },
    { id: 'masts', label: 'Propellant connections', nodes: ['Fuel_Mast', 'LOX_Mast'], from: [-0.6, 0.5, 1] },
    { id: 'access', label: 'Crew access arm', nodes: ['Service_Arm_9'], from: [-0.6, 0.3, 1] },
  ],
};

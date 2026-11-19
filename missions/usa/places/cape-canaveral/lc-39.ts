import type { Keyframe, ModelDef, Move, Part, SiteDef } from '../../../../src/types.ts';
import { CAPE_CANAVERAL } from './place.ts';

const FT = 0.3048;
const KIT = 'Apollo 8 press kit, Launch Complex 39, “Mobile Launcher” and “Flame Trench and Deflector”';
const deck = (22 + 25) * FT;

function site(pad: 'A' | 'B', latitude: number, longitude: number, zone: SiteDef['zone']): SiteDef {
  const position = 'Approximate WGS 84 location of the launch axis at Kennedy Space Center, Pad ' + pad;
  return {
    name: 'Kennedy Space Center, Launch Complex 39' + pad,
    place: CAPE_CANAVERAL,
    latitude: { value: latitude, confidence: 'estimated', source: position },
    longitude: { value: longitude, confidence: 'estimated', source: position },
    height: {
      value: -29 + (pad === 'A' ? 48 : 53) * FT + deck,
      confidence: 'estimated',
      source: 'Apollo 10 press kit pp. 83–84: Pad A hardstand at 48 ft MSL, Pad B five feet higher. Cape geoid estimated at −29 m.',
    },
    grade: {
      value: -deck - 42 * FT,
      confidence: 'estimated',
      source: KIT + ', surrounding land approximated at the elevation of the trench floor.',
    },
    bearingX: {
      value: 0,
      confidence: 'assumed',
      source: 'Apollo/Saturn V Orientation and Camera Target Locations, figure 3-1. Tower north of vehicle.',
    },
    seaLevel: { value: -29, confidence: 'estimated', source: 'Cape EGM96 geoid rounded to a metre, as at LC-34.' },
    zone,
  };
}

export const LC39A = site('A', 28.6084, -80.6043, { name: 'EST', utcOffset: -5 });
export const LC39B = site('B', 28.6272, -80.6208, { name: 'EDT', utcOffset: -4 });

function part(node: string, name: string, summary: string, detail: string): Part {
  return { node, name, summary, detail, order: 0, explode: [0, 0, 0], group: 'Launch Complex 39' };
}

const MANUAL = 'Saturn V Flight Manual SA-504, section VIII, figure 8-8.';
function armSwing(node: string, from: number, to: number, degrees = 90): Move {
  return {
    kind: 'swing',
    node,
    from,
    to,
    axis: [0, 1, 0],
    angle: (degrees * Math.PI) / 180,
    machine: {
      kind: 'hydraulic',
      confidence: 'documented',
      source: 'Apollo 8 press kit, Mobile Launcher. Hydraulic retraction. Mechanism sound approximated.',
    },
  };
}

interface Countdown {
  ingress: number;
  parkedBy: number;
  pao: string;
  intertankClear: number;
  forwardRetract: number;
  terminalSource: string;
  intertankLatch?: number;
}

export function mobileLauncher(
  number: 1 | 2 | 3,
  { ingress, parkedBy, pao, intertankClear, forwardRetract, terminalSource, intertankLatch }: Countdown,
): ModelDef {
  // Layout along the common countdown slider. Inflight sweeps share its final nine seconds.
  const arms: [string, number, number][] = [
    ['S-IC intertank', 0.4, 0.5],
    ['S-IC forward', 0.5, 0.6],
    ['S-II aft', 0, 0.1],
    ['S-II intermediate', 0.6, 0.6 + (0.4 * 6.4) / 9],
    ['S-II forward', 0.6, 0.6 + (0.4 * 7.4) / 9],
    ['S-IVB aft', 0.6, 0.6 + (0.4 * 7.7) / 9],
    ['S-IVB forward', 0.6, 0.6 + (0.4 * 8.4) / 9],
    ['Service module', 0.6, 1],
    ['Spacecraft access', 0.1, 0.4],
  ];
  const key = (at: number, slider: number, event: string, confidence: Keyframe['confidence'], source: string): Keyframe => ({
    at,
    slider,
    event,
    confidence,
    source,
  });
  const sequence = [
    key(-43200, 0, 'S-II aft access arm withdraws', 'estimated', MANUAL + ' Withdrawn as required. Time placed before crew ingress.'),
    key(-43170, 0.1, 'S-II aft arm clear', 'estimated', MANUAL + ' Travel duration reconstructed.'),
    key(ingress, 0.1, 'Commander enters the spacecraft', 'documented', pao),
    key(parkedBy - 30, 0.1, 'Crew access arm leaves the hatch', 'estimated', pao + ' Travel placed before the standby report.'),
    key(parkedBy, 0.2, 'Crew access arm in its 12° standby position', 'estimated', pao + ' Placed at the broadcast confirming standby.'),
    key(-300, 0.2, 'Crew access arm retracts from standby', 'documented', pao),
    key(-270, 0.4, 'Crew access arm fully retracted', 'estimated', pao + ' Travel duration approximated from the countdown.'),
    key(-30, 0.4, 'S-IC intertank arm withdraws', 'assumed', terminalSource),
    key(intertankClear, 0.5, 'S-IC intertank arm clears the vehicle', 'assumed', terminalSource),
    key(forwardRetract, 0.5, 'S-IC forward arm withdraws', 'assumed', terminalSource),
    key(forwardRetract + 8, 0.6, 'S-IC forward arm clear', 'assumed', MANUAL + ' Eight-second withdrawal.'),
    key(0, 0.6, 'First vehicle motion releases five inflight arms', 'assumed', MANUAL + ' Trigger within the first inch of rise.'),
    ...(intertankLatch === undefined
      ? []
      : [key(intertankLatch, 0.6 + (0.4 * intertankLatch) / 9, 'Intertank arm latchback confirmed', 'documented', terminalSource)]),
    key(9, 1, 'Inflight arms clear', 'assumed', MANUAL + ' Nominal sweeps use the published maximum retraction times.'),
  ];
  return {
    sequence,
    id: 'pad',
    name: 'Mobile launcher ' + number,
    backdrop: 'ground',
    url: `models/usa/places/cape-canaveral/lc39/pad-${number === 3 ? 'b' : 'a'}.glb`,
    home: 'launcher',
    position: [0, -deck, 0],
    scale: '160 × 135 ft launcher base · 445 ft from hardstand to crane',
    slider: ['Service arms connected', 'Arms clear'],
    parts: [
      part(
        'Water_Valve_Pit',
        'Water valve pit',
        'A flush steel cover marks the water valve pit.',
        number === 3 ? 'At Pad B the water lines approached on the east side.' : 'At Pad A the water lines approached on the west side.',
      ),
      ...(number === 3
        ? []
        : [
            part(
              'Substation',
              'Electrical substation',
              'The electrical substation stood in the open west of Pad A.',
              'On Pad B the corresponding installation was inside the slope. The equipment envelope is estimated.',
            ),
          ]),
      part(
        'Storage_Spheres',
        'Propellant storage spheres',
        'The oxygen and hydrogen storage tanks stood near the pad perimeter.',
        'Their nominal capacities were 900,000 and 850,000 US gallons. The jackets and supports are reconstructed.',
      ),
      part(
        'Hardstand',
        'Launch hardstand',
        'The crawler carried the assembled Saturn up to this raised pad.',
        'Two concrete working surfaces flank the open flame trench. Their outlines are reconstructed.',
      ),
      part(
        'Flame_Deflector',
        'Flame deflector',
        'The deflector divides the exhaust beneath the launcher.',
        'Its refractory surface directs exhaust along the trench in both directions. The curved profile is approximated.',
      ),
      part(
        'Pad_Pedestals',
        'Launcher supports',
        'Six steel pedestals carry the mobile launcher after the crawler leaves.',
        'The launcher base stands 22 feet above the hardstand. Four additional columns stiffen the base for launch.',
      ),
      part(
        'Launcher_Base',
        'Launcher base',
        'The entire rocket and tower rode on this two-storey platform.',
        'Five F-1 engines fired through the 45-foot-square opening. The base was 25 feet deep.',
      ),
      part(
        'Tail_Service_Masts',
        'Tail service masts',
        'Three masts connected to the base of the first stage.',
        'Two stood west of the engine opening and one to the east. Their steel supports and umbilical housings are simplified.',
      ),
      part(
        'Holddown_Arms',
        'Hold-down arms',
        'Four arms carry the Saturn over the exhaust opening.',
        'Each holds a fitting at the foot of the first stage until release. Their geometry is reconstructed.',
      ),
      {
        ...part(
          'Umbilical_Tower',
          'Umbilical tower',
          'Two elevators served the work platforms beside the Saturn.',
          'The tower stood about 80 feet from the rocket, measured between their axes.',
        ),
        actions: [
          {
            id: 'crew-elevator',
            label: 'Call the crew elevator',
            do: {
              kind: 'lift',
              node: 'Tower_Lift',
              machine: { kind: 'lift', confidence: 'estimated', source: MANUAL + ' The tower elevator sound is approximated.' },
              speed: (600 * FT) / 60,
              stops: [0, 30, 60, ...Array.from({ length: 14 }, (_, i) => 80 + 20 * i)].map((level) => ({
                name: level ? 'Level ' + level : 'Deck',
                by: [0, level ? (level + 0.85) * FT : 0, 0],
              })),
            },
          },
        ],
      },
      part(
        'Hammerhead_Crane',
        'Hammerhead crane',
        'The crane reached out across the top of the Saturn.',
        'The hook could reach 85 feet from the tower axis.',
      ),
      ...arms.map(([arm, from, to], i): Part => {
        const node = `Service_Arm_${i + 1}`;
        return {
          ...part(
            node,
            arm + ' arm',
            i === 8
              ? 'The crew crossed this arm to the white room at the command module hatch.'
              : 'This arm carried connections between the tower and the Saturn V.',
            'Move the slider to inspect the swing away from the vehicle. The clock follows the countdown. Final sweep angles and individual transit times are reconstructed.',
          ),
          moves:
            i === 8
              ? [armSwing(node, from, 0.2, 12), armSwing(node, 0.2, to, 78)]
              : i === 0 && intertankLatch !== undefined
                ? [armSwing(node, from, to, 72), armSwing(node, to, 0.6 + (0.4 * intertankLatch) / 9, 18)]
                : [armSwing(node, from, to)],
        };
      }),
    ],
    views: [
      { id: 'launcher', label: 'Mobile launcher', nodes: ['Launcher_Base', 'Umbilical_Tower', 'Hammerhead_Crane'], from: [-1, 0.18, 1] },
      { id: 'base', label: 'Launcher deck', nodes: ['Launcher_Base', 'Holddown_Arms'] },
      { id: 'crew-access', label: 'White room', nodes: ['Service_Arm_9'] },
    ],
  };
}

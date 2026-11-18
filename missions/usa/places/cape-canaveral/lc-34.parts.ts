import type { Flight, Machine, ModelDef, Move, Part } from '../../../../src/types.ts';
import { LC34_FT as FT, LC34_KIT as KIT, LC34_MODEL, LC34_MOUNT } from './lc-34.ts';

const DEG = Math.PI / 180;
const PARK = 600 * FT;
const BRIDGE = 220;
const LEVELS = [0, 27, 58, 89, 120, 151, 182, BRIDGE, 234];
export const LC34_CREW_AT: [number, number, number] = [45 * FT, -LC34_MOUNT, 16 * FT];
const ARM: Machine = { kind: 'motor', confidence: 'estimated', source: `Powered access arm (${KIT}); its drive sound is estimated` };
const SETUP: Machine = { kind: 'none', confidence: 'derived', source: 'A fixed starting offset applied before the visible countdown' };
const RAILS: Machine = {
  kind: 'rails',
  confidence: 'documented',
  source: `Diesel-electric generator and a traction motor in each of four trucks (${KIT})`,
};
const DOOR: Machine = { kind: 'door', confidence: 'estimated', source: 'The model’s reconstructed hand-operated blockhouse entrance' };
const LIFT: Machine = { kind: 'lift', confidence: 'documented', source: `High-speed umbilical elevator (${KIT})` };

type Span = [number, number];
const swing = (node: string, angle: number, [from, to]: Span, machine: Machine): Move => ({
  kind: 'swing',
  node,
  axis: [0, 1, 0],
  angle: angle * DEG,
  from,
  to,
  machine,
});

export function lc34Pad(
  sequence: NonNullable<ModelDef['sequence']>,
  travel: { service: Span; standby: Span; retract: Span; umbilicals: Span },
): ModelDef {
  const part = (node: string, name: string, summary: string, detail: string, hardware: Partial<Part> = {}): Part => ({
    node,
    name,
    summary,
    detail,
    group: 'Launch Complex 34',
    order: 0,
    explode: [0, 0, 0],
    ...hardware,
  });

  return {
    id: 'pad',
    name: 'Launch Complex 34',
    url: LC34_MODEL,
    scale: '430 ft concrete apron · 240 ft fixed tower · 310 ft mobile service structure',
    backdrop: 'ground',
    position: [0, -LC34_MOUNT, 0],
    slider: ['Service structure at the vehicle', 'Liftoff'],
    sequence,
    home: 'tower',
    specGroups: ['Launch pad'],
    parts: [
      part(
        'Apron',
        'Concrete apron',
        'The circular working surface around the Saturn launch pedestal.',
        'The reinforced-concrete apron is 430 feet across. The extent of the surrounding clearing is estimated from the site plan.',
      ),
      part(
        'Launch_Pedestal',
        'Launch pedestal',
        'The Saturn stands over a 25-foot opening in the 27-foot-high pedestal.',
        'Four concrete legs carry the deck and leave room for the flame deflectors below. The published pedestal envelope is from the Apollo 7 press kit.',
      ),
      part(
        'Flame_Deflectors',
        'Flame deflectors',
        'Deflectors turn the first stage’s exhaust out from under the pedestal.',
        'The shapes and their placement follow the visible installation in photographs. The unseen cooling and underground systems are simplified.',
      ),
      part(
        'Hold_Downs',
        'Hold-down equipment',
        'The restraint hardware keeps the Saturn on the pedestal through engine start.',
        'The hold-down assemblies release the vehicle after its first-stage engines reach liftoff conditions. Their housings are reconstructed from the arrangement and photographs.',
      ),
      part(
        'Umbilical_Tower',
        'Umbilical tower',
        'The fixed red steel tower supplies the stack and carries the astronauts to the 220-foot level.',
        'Its express lift was rated at 450 feet per minute. Use the lift from the apron to reach the access arm, the white room and the command module’s side hatch.',
        {
          moves: [1, 2, 3].map((arm) => swing(`Service_Arm_${arm}`, 75, travel.umbilicals, ARM)),
          actions: [
            {
              id: 'crew-elevator',
              label: 'Crew elevator',
              on: 'Tower_Lift',
              do: {
                kind: 'lift',
                node: 'Tower_Lift',
                machine: LIFT,
                speed: (450 * FT) / 60,
                stops: LEVELS.map((ft) => ({
                  name: ft === 0 ? 'Apron' : ft === BRIDGE ? 'White room · 220 ft level' : `${ft} ft level`,
                  by: [0, ft * FT, 0],
                })),
              },
            },
          ],
        },
      ),
      part(
        'White_Room',
        'White room and access arm',
        'The passage from the fixed tower to the command module hatch.',
        'The access arm swung back to a standby position late in the count and retracted fully shortly before launch. Launch control called out the 12° standby position. Full travel and the duration of each motion are reconstructed.',
        {
          moves: [
            swing('White_Room_Pivot', -90, [-1, 0], SETUP),
            swing('White_Room_Pivot', 12, travel.standby, ARM),
            swing('White_Room_Pivot', 78, travel.retract, ARM),
          ],
          functions: [{ nodes: ['White_Room_Pivot'], name: 'Crew access arm', ends: ['at the hatch', 'retracted'], seconds: 35 }],
        },
      ),
      part(
        'Service_Structure',
        'Mobile service structure',
        'The 310-foot frame rolls back along its rails for launch.',
        'It was driven by four powered rail trucks and parked approximately 600 feet from the pedestal. Its working decks and opening are reconstructed from the site plans and photographs.',
        {
          moves: [
            { kind: 'slide', from: -1, to: 0, by: [PARK, 0, 0], machine: SETUP },
            {
              kind: 'slide',
              from: travel.service[0],
              to: travel.service[1],
              by: [-PARK, 0, 0],
              machine: RAILS,
              runs: {
                on: ['Apron/steel-rail'],
                wheels: 'Service_Wheel',
                axle: 'z',
                wheelRadius: 1.5 * FT,
                joints: {
                  value: 39 * FT,
                  confidence: 'estimated',
                  source:
                    'Ordinary American 39-foot jointed rail length of the period, as used for the Complex 5 estimate. LC-34 spacing is unverified.',
                },
              },
            },
          ],
        },
      ),
      part(
        'Blockhouse',
        'Launch control center',
        'The reinforced launch control center is separated from the pad.',
        'The two floors housed checkout computers, communications, telemetry and the launch control consoles. The rooms and entrance are reconstructed.',
        {
          actions: [
            {
              id: 'blockhouse-door',
              label: 'Open blast door',
              on: 'Blockhouse_Door',
              do: { kind: 'toggle', moves: [swing('Blockhouse_Door', 96, [0, 1], DOOR)], back: 'Close blast door' },
            },
          ],
        },
      ),
      part(
        'Propellant_Areas',
        'Propellant facilities',
        'The tanks and transfer equipment supplied RP-1, oxygen and hydrogen.',
        'The Apollo 7 press kit locates them around the launch pedestal. Buried lines and internal fittings are left out.',
      ),
      part(
        'Operations_Support',
        'Operations support',
        'Checkout and operating facilities served the complex from the edge of the clearing.',
        'The structures follow the documented site layout. Interior equipment is omitted.',
      ),
      part(
        'Roads',
        'Roads and track',
        'The entrance roads and the rail route connect the pedestal to the rest of the complex.',
        'The model’s road alignment follows the site plan and aerial imagery.',
      ),
    ],
    views: [
      { id: 'tower', label: 'Tower and pedestal', nodes: ['Launch_Pedestal', 'Umbilical_Tower', 'White_Room'], from: [0.8, 0.28, 1] },
      { id: 'white-room', label: 'White room', nodes: ['White_Room_Deck'], from: [-0.8, 0.25, 1] },
      { id: 'service', label: 'Service structure', nodes: ['Service_Structure'], from: [1, 0.18, 0.7] },
      { id: 'pedestal', label: 'Pedestal', nodes: ['Launch_Pedestal', 'Flame_Deflectors', 'Hold_Downs'], from: [1, 0.12, 0.65] },
      { id: 'blockhouse', label: 'Blockhouse', nodes: ['Blockhouse'], from: [0.8, 0.35, 1] },
      { id: 'propellant', label: 'Propellant facilities', nodes: ['Propellant_Areas'], from: [1, 0.65, 0.7] },
    ],
  };
}

export const LC34_SPECS: Flight['specs'] = [
  { label: 'Apron diameter', value: 430 * FT },
  { label: 'Launch pedestal height', value: LC34_MOUNT },
  { label: 'Umbilical tower height', value: 240 * FT },
  { label: 'Crew access level above apron', value: BRIDGE * FT },
  { label: 'Mobile service structure height', value: 310 * FT },
].map(({ label, value }) => ({ group: 'Launch pad', label, value, unit: 'm', confidence: 'documented', note: KIT }));

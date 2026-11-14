import type { CabinDef, ChuteDef, Command, Flight, Keyframe, Measure, ModelDef, Move, Part } from '../../../../../src/types';
import { SITE1 } from '../../sites/site-1.ts';
import { DUTY } from '../../vehicles/cabin.ts';
import { MSK, orbital } from './orbital.ts';
import { WEATHER } from './weather.ts';

const DEG = Math.PI / 180;
const KGF = 9.80665;

// Where things are on the model, as vehicles/vostok_3ka.py has them: azimuths about the long axis from the model's +X,
// latitudes on the sphere above the plane square to that axis. The numbers live there; these are quoted for the motions.
const ENTRY = { az: 135, lat: 24 }; // hatch No. 1, and the line of the seat's rails
const PARACHUTE = { az: 45, lat: 30 }; // hatch No. 2
const STRAPS = [0, 90, 180, 270];
const MAST_AZ = 202.5;
/** A direction on the model in the viewer's axes (+Y is the model's long axis; the model's +Y is the viewer's -Z). */
const along = (az: number, lat: number, by: number): [number, number, number] => [
  by * Math.cos(lat * DEG) * Math.cos(az * DEG),
  by * Math.sin(lat * DEG),
  -by * Math.cos(lat * DEG) * Math.sin(az * DEG),
];
/** A swing outward about a hinge at the foot of something standing on the model at this azimuth. */
const outward = (node: string, az: number, degrees: number, from: number, to: number): Move => ({
  kind: 'swing',
  node,
  axis: [-Math.sin(az * DEG), 0, -Math.cos(az * DEG)],
  angle: degrees * DEG,
  from,
  to,
});

/** How far the descent module is lifted off the instrument module at full explode, m. */
const LIFT = 1.5;

// The launch vehicle, as vehicles/vostok_8k72k/ has it (heights above the main nozzles' exits; the spacecraft's own
// station 0 is 30.53 m up). Quoted here for the motions and the views; the numbers live there.
/** The main nozzles' exits below the model's origin (the spacecraft's braking nozzle), m. */
const BASE = 30.53;

// Where the vehicle hangs at Site 1, as sites/site1/site.py has it (the numbers live there; site-1.md): its nozzles' exits
// 6.75 m under the platform's deck, level with the foot of the launch system's turning part, and the whole system turned
// in the platform's opening to the launch azimuth, 37.5 degrees (derived), with booster B's plane along it (estimated).
/** The nozzles' exits, m above the deck (site.TAIL_Z). */
const TAIL = -6.75;
/** The vehicle's own +X (booster B's plane) from the site's +X (due east), radians anticlockwise from above (site.TURN). */
const TURN = (90 - 37.5) * DEG;
/** A direction given in the vehicle's own frame, as it stands turned on the pad (a view's `from` is the scene's). */
const turned = ([x, y, z]: [number, number, number]): [number, number, number] => [
  x * Math.cos(TURN) + z * Math.sin(TURN),
  y,
  -x * Math.sin(TURN) + z * Math.cos(TURN),
];

/** Which way each strap-on stands, degrees about the long axis. Which block stood where is not known to us. */
const BOOSTERS: [letter: string, block: string, az: number][] = [
  ['B', 'Б', 0],
  ['V', 'В', 90],
  ['G', 'Г', 180],
  ['D', 'Д', 270],
];
/**
 * The instrument module's ten antennas are built stowed under the fairing (vostok_3ka.py: STOWED) and slide out as
 * the vehicle is taken apart: each by this much, m, in the viewer's axes. They were really folded, which is not modelled.
 */
const ANTENNAS: [number, number, number][] = [
  ...[-35, 0, 40].map((rake) => along(67.5, rake, 1.33)),
  ...(
    [
      [22.5, 18, 1.72],
      [202.5, 18, 1.72],
      [112.5, 45, 1.9],
    ] as const
  ).map(([az, spread, by]) => along(az, spread - 90, by)),
  ...[0, 1, 2, 3].map((): [number, number, number] => [0, -0.7, 0]),
];

/**
 * The slider takes the launch vehicle apart first and the spacecraft after it. Every part of the launch vehicle is of
 * order 0, so it is away by half way; the spacecraft's parts are of orders SHIP to SHIP + 2 of SHIP + 2, which start
 * at 0.41, 0.45 and 0.5 (explode.ts: partProgress). Between about 0.4 and 0.45 the spacecraft stands alone and whole
 * with its antennas out: as it was in orbit.
 */
const SHIP = 9;
/** A reading of the spacecraft's own sequence (0 to 1, as it was timed when it was shown alone) on the whole vehicle's slider. */
const later = (t: number) => (SHIP / (SHIP + 2)) * 0.5 + (1 - (SHIP / (SHIP + 2)) * 0.5) * t;

// The descent's events, by hand (orbital.ts flyDown): each said with what did it on the day, since he could do none of them.
const PART: Command = {
  label: 'Part the modules (he could not: on the day the thermal backup did, 10:36)',
  ask: 'descent:modules',
};
const EJECT: Command = {
  label: 'Blow the hatch and eject (he could not: the barometric switch, 7 km)',
  ask: 'descent:ejection',
};
const MODULE_CHUTES: Command[] = [
  {
    label: 'Module’s pilot parachute: the cover off (automatic: with the hatch, 7 km)',
    ask: 'descent:module/pilot parachute',
  },
  { label: 'Module’s braking parachute (automatic: its barometric switch, 4 km)', ask: 'descent:module/braking parachute' },
  { label: 'Module’s main parachute (automatic: its barometric switch, 2.5 km)', ask: 'descent:module/main parachute' },
];

const parts: Part[] = [
  {
    node: 'DescentModule',
    commands: [PART, ...MODULE_CHUTES],
    group: 'Spacecraft',
    name: 'Descent module',
    summary: 'A ball 2.3 m across: the only part that came back.',
    detail:
      'A sphere needs no steering to survive entry. Whichever way it meets the air, the flow round it is the same, so the ' +
      'whole of it is covered in heat shield and its weight is put low and behind the pilot: it turns itself heavy side first ' +
      'and stays there, with no thrusters at all. The price is a steep ballistic fall, more than ten g by Gagarin’s account, and a landing too hard ' +
      'to sit through, which is why the pilot left before it reached the ground. In orbit the shield is under a blanket of ' +
      'insulation faced with foil, as modelled; the charred brown ball in the museum is what the air left of it. Coming down, ' +
      'the glow round it is the shock layer’s, drawn as bright as the heat at its leading point, which is computed from the ' +
      'height and speed flown and the ball’s 1.15 m radius alone. The shield is not drawn glowing: how hot its surface got ' +
      'needs the ablator’s thickness and make-up, which have not been read. Below seven kilometres it hangs from its own ' +
      'parachute, made fast at the container behind hatch No. 2.',
    facts: [
      ['Diameter', '2.3 m over the heat shield; pressure hull 2.2 m'],
      ['Entry glow', 'from the computed heat flux; the shield’s own heat not shown'],
      ['Mass', '2,460 kg'],
      ['Hatches', '3, each 1 m in the clear'],
      ['Portholes', '3, two of them in hatch covers'],
      ['Free volume', '1.6 m³ of 5.2'],
      ['Landed', '10:48 Moscow time, without its pilot'],
    ],
    explode: [0, LIFT, 0],
    order: SHIP + 1,
  },
  {
    node: 'EntryHatch',
    commands: [EJECT],
    group: 'Spacecraft',
    name: 'Hatch No. 1',
    summary: 'The way in, bolted shut behind him, and the way out at 7 km.',
    detail:
      'Over the pilot’s head, on the line of his seat’s rails. On the pad it was closed with thirty screws at 07:50; a ' +
      'contact showed it was not seated, and all thirty were taken out and put back, which took most of an hour. Coming ' +
      'down, at about seven kilometres, it was thrown clear and the seat followed two seconds later. One of the three ' +
      'portholes is in it.',
    facts: [
      ['Clear diameter', '1 m'],
      ['Screws', '30'],
      ['Released', 'at about 7 km, 10:42 Moscow time'],
      ['Seat follows', '2 s later'],
    ],
    explode: [0, LIFT, 0],
    // (thrown well clear: the seat comes out along the same line)
    moves: [{ kind: 'slide', by: along(ENTRY.az, ENTRY.lat, 3.6), from: later(0.5), to: later(0.74) }],
    order: SHIP + 1,
  },
  {
    node: 'ParachuteHatch',
    commands: MODULE_CHUTES,
    group: 'Spacecraft',
    name: 'Hatch No. 2',
    summary: 'Covers the capsule’s own parachute.',
    detail:
      'At the pilot’s left. Behind it is the container of the descent module’s parachute, which opened at about four ' +
      'kilometres, after the pilot had gone, and set the empty ball down at ten metres a second.',
    facts: [
      ['Clear diameter', '1 m'],
      ['Parachute', '574 m², from a 330 litre container'],
      ['Landing speed', '10 m/s'],
    ],
    explode: [0, LIFT, 0],
    moves: [{ kind: 'slide', by: along(PARACHUTE.az, PARACHUTE.lat, 1.0), from: later(0.6), to: later(0.78) }],
    order: SHIP + 1,
  },
  {
    node: 'Cabin',
    group: 'Spacecraft',
    inside: true,
    name: 'Cabin',
    summary: 'Ordinary air, a globe that turned with the Earth, and controls locked by a code.',
    detail:
      'Air at sea-level pressure, kept breathable by superoxide that gives up oxygen as it takes in carbon dioxide and ' +
      'water, with ten days of food and water in case the braking engine failed and the orbit had to decay by itself. Above ' +
      'his knees hangs the board: the Globus, a small globe that turned to show the place on the Earth below him, a clock, ' +
      'three gauges of three needles each and three blocks of signal lamps. Under it, on the porthole at his feet, the ' +
      'Vzor: a ring of eight ports in which the horizon stood as a ring when the ship was level, round a ruled screen on ' +
      'which the ground ran. At his left the black control panel, its raked side toward him with six keys: the flight ' +
      'was automatic, and to fly it by hand he would first have had to key 1-4-5 into that lock, the number sealed in an ' +
      'envelope on board. At his right the hand controller, which he never touched. The fit is the first ships’ own, by ' +
      'Darevsky’s laboratory at the Flight Research Institute; its places and sizes here are read off photographs.',
    facts: [
      ['Atmosphere', 'air, 755 to 775 mm Hg'],
      ['Regeneration', 'alkali metal superoxide'],
      ['Supplies', '10 days'],
      ['Instrument board', 'PD-1-3KA: Globus, clock, three gauges, 24 signal lamps'],
      ['He read before launch', '1.0 atm, 65 %, 19 °C; 155, 320 and 155 atm of gas'],
      ['Globus correction window', '710'],
      ['Vzor field of view', '7°'],
      ['Manual control code', '1-4-5, on six keys (Kamanin; 1-2-5 in later memoirs)'],
    ],
    explode: [0, LIFT, 0],
    order: SHIP + 1,
  },
  {
    node: 'EjectionSeat',
    commands: [
      EJECT,
      {
        label: 'Seat’s stabilising parachute (automatic: its timer, half a second out)',
        ask: 'descent:pilot/seat’s braking parachute',
      },
      {
        label: 'Leave the seat: main canopy (automatic: its barometric switch, 4 km)',
        ask: 'descent:pilot/main canopy',
      },
      {
        label: 'Reserve canopy (automatic: by itself at 3 km, this flight only)',
        ask: 'descent:pilot/reserve canopy',
      },
    ],
    group: 'Spacecraft',
    inside: true,
    name: 'Ejection seat and pilot',
    summary: 'Gagarin did not land in his spacecraft.',
    detail:
      'The seat lies across the ball, tilted so that the rails run out through hatch No. 1. It was the escape system on ' +
      'the pad and in the first part of the climb, and it was the landing system: at about seven kilometres the hatch went, ' +
      'the seat was fired out on two rockets, and at four the pilot left the seat and came down under his own parachute at ' +
      'five metres a second. For years the Soviet record claim said he had landed inside. The figure here wears the SK-1: a ' +
      'pressure suit under an orange cover, and a white helmet on which СССР was painted on the morning of the flight.',
    facts: [
      ['Ejection', 'about 7 km up'],
      ['Leaves the seat', '4 km'],
      ['Pilot’s parachute', '83.5 m²; reserve 56 m²'],
      ['Landing speed', '5 m/s'],
      ['Gagarin landed', '10:53 Moscow time, 106 min after liftoff'],
    ],
    explode: [0, LIFT, 0],
    moves: [{ kind: 'slide', by: along(ENTRY.az, ENTRY.lat, 2.3), from: later(0.72), to: 1 }],
    order: SHIP + 1,
  },
  {
    node: 'RetainingStraps',
    group: 'Spacecraft',
    name: 'Retaining straps',
    summary: 'Four steel bands and one lock held the ball on.',
    detail:
      'Four bands run from the instrument module’s ring over the sphere and meet in a single lock at its top. Opening ' +
      'that one lock frees the ball. Each strap carries a hairpin antenna of the command link. They are modelled as they ' +
      'were in orbit and swing back as they would when released; how far they sprang is not recorded.',
    facts: [
      ['Straps', '4, joined by one pyrotechnic lock'],
      ['Planned release', '10 to 12 s after the engine stops'],
      ['Released', 'about 10 minutes late'],
    ],
    explode: [0, 0, 0],
    moves: STRAPS.map((az, i) => outward(`Strap_${i + 1}`, az, 58, later(0.02 + 0.02 * i), later(0.2 + 0.02 * i))),
    order: SHIP,
  },
  {
    node: 'CableMast',
    group: 'Spacecraft',
    name: 'Cable mast',
    summary: 'The umbilical between the modules, and the flight’s worst ten minutes.',
    detail:
      'Power, commands and telemetry cross from the instrument module to the cabin through one mast of cables, plugged ' +
      'into a plate on the side of the ball. After the braking burn the modules should have parted within twelve seconds. ' +
      'They did not: the engine had been stopped by its timer, the sequencer cancelled the separation, and the pair went into ' +
      'the atmosphere joined, turning at thirty degrees a second by Gagarin’s count. They came apart ten minutes late, at ' +
      '10:35 or 10:36, on what OKB-1’s report took to be the backup system’s heat sensors. The old story that the cables ' +
      'alone held them and burned through is not what the report says.',
    facts: [
      ['Separation planned', '10 to 12 s after the burn'],
      ['Separation flown', '10:35 to 10:36 Moscow time'],
      ['Tumble', 'about 30°/s (Gagarin); 6°/s in pitch (report)'],
    ],
    explode: [0, 0, 0],
    moves: [outward('CableMast_Arm', MAST_AZ, 40, later(0.06), later(0.24))],
    order: SHIP,
  },
  {
    node: 'GasBottles',
    group: 'Spacecraft',
    name: 'Gas bottles',
    summary: 'Nitrogen to turn the ship, oxygen for the cabin.',
    detail:
      'A necklace of pressure spheres round the joint, outside both hulls. Most hold nitrogen at about 150 atmospheres ' +
      'for the attitude jets; the rest are the cabin’s oxygen reserve. Sources give fourteen, sixteen and twelve of them; ' +
      'fourteen are modelled, in sixteen places, with a gap where the cable mast passes.',
    facts: [
      ['Bottles', '14 modelled (sources: 12, 14, 16)'],
      ['Nitrogen pressure in flight', '150 atm, 110 at retrofire'],
      ['Diameter', 'about 0.34 m (off drawings)'],
    ],
    explode: [0, 0.5, 0],
    order: SHIP + 2,
  },
  {
    node: 'InstrumentModule',
    commands: [
      { label: 'Separate the spacecraft (he had no say over the launch vehicle: this takes the flight over)', ask: 'step:separate:2' },
      PART,
    ],
    group: 'Spacecraft',
    inside: true,
    name: 'Instrument module',
    summary: 'Two cones base to base: everything that did not need to come home.',
    detail:
      'A sealed hull of two cones filled with dry nitrogen, carrying the batteries, radios, the orientation system and ' +
      'the braking engine. The aft cone is the radiator: shutters over it open and close to hold the temperature. Sixteen ' +
      'small jets of cold nitrogen, in two independent sets of eight, turn the ship; a sensor finds the Sun and the ship is ' +
      'pointed by it for the braking burn. Eleven antennas stand out from the module. It burned up.',
    facts: [
      ['Greatest diameter', '2.43 m'],
      ['Length', '2.25 m'],
      ['Mass', '2,270 kg'],
      ['Attitude jets', '2 sets of 8, 1.5 kgf each, nitrogen'],
      ['Antennas', '11: 3 Signal, 4 Zarya, 2 telemetry, 2 command'],
    ],
    explode: [0, 0, 0],
    order: SHIP + 2,
  },
  {
    node: 'Antennas',
    group: 'Spacecraft',
    name: 'Antennas',
    summary: 'Ten of the eleven, folded under the fairing and let out in orbit.',
    detail:
      'A fan of three whips by the frame, three long whips trailing from beside the engine, and four ribbon antennas ' +
      'standing aft: the short-wave and VHF voice links (Zarya), the Signal beacon that carried his pulse, telemetry ' +
      'and the command link. None could stand out in the airstream, so under the fairing they were folded against the ' +
      'hull and sprang out once the ship was free. How they were folded has not been found: here they are drawn ' +
      'withdrawn into the hull and slide out, which is not how it was done. Which antenna served which system is not ' +
      'known to us either.',
    facts: [
      ['Modelled here', '10: a fan of 3, 3 long whips, 4 ribbons'],
      ['On the spacecraft', '11: 3 Signal, 4 Zarya, 2 telemetry, 2 command'],
      ['Long whips', '2.1 m (off the drawing)'],
    ],
    explode: [0, 0, 0],
    // out once the ship is clear of its fairing and its third stage, and before anything of the ship itself moves
    moves: ANTENNAS.map((by, i): Move => ({ kind: 'slide', node: `Antenna_${i + 1}`, by, from: 0.3, to: 0.4 })),
    order: SHIP,
  },
  {
    node: 'RetroEngine',
    commands: [{ label: 'Fire the braking engine along the long axis (his, once the code had freed the hand controls)', ask: 'retro' }],
    group: 'Spacecraft',
    inside: true,
    name: 'TDU-1 braking engine',
    summary: 'One engine, one chance: it had no spare.',
    detail:
      'Isaev’s S5.4: 1.6 tonnes of thrust for up to 45 seconds on self-igniting propellants, with four small steering ' +
      'nozzles round the chamber. There was one. The answer to its failing was the orbit itself, planned low enough to ' +
      'decay within the ten days the supplies would last. On 12 April it lit at 10:25:04 and was shut down by its timer 44 ' +
      'seconds later, about a second short of its full impulse; and the third stage had left the ship in a higher orbit ' +
      'than planned, 327 km at the top instead of 230, from which that decay would have been slower.',
    facts: [
      ['Thrust', '1,614 kgf (15.8 kN)'],
      ['Propellant', '280 kg: amine fuel and nitric acid'],
      ['Burn', '45 s at most; about 40 s flown'],
      ['Steering nozzles', '4'],
      ['Installation', '396 kg; 1.13 m tall, 0.95 m across'],
    ],
    explode: [0, -0.9, 0],
    order: SHIP + 2,
  },
];

const BOOSTER_DETAIL =
  'A cone 19.2 m long on a short cylinder, with its own RD-107: four fixed chambers and two small ones that swivel to ' +
  'steer, all fed by one turbopump driven by steam from hydrogen peroxide. The whole cone is its oxygen tank, white with ' +
  'frost on the morning; the kerosene is in the cylinder under it. It is not bolted on. Its tip is a steel ball in a cup ' +
  'on the core, and its thrust holds it there; two ties at the foot keep it from swinging. At 119 seconds the engine is ' +
  'throttled back, the ties are let go, and what thrust is left swings the foot outward until the ball drops out of its ' +
  'cup. A vent in the nose then blows the oxygen tank’s pressure sideways to push the tip clear. Four doing this at ' +
  'once draw a cross in the sky. The triangle at the foot is an air rudder, which steers while there is air to bite.';

const launcherParts: Part[] = [
  {
    node: 'Fairing',
    commands: [{ label: 'Drop the fairing (he had no say over the launch vehicle: this takes the flight over)', ask: 'step:drop:fairing' }],
    group: 'Third stage',
    name: 'Fairing',
    summary: 'Two halves, and a round hole to be thrown out through.',
    detail:
      'It covers the ship through the thick air and is dropped in two halves about two and a half minutes up: Gagarin ' +
      'reported it gone at second 150 and saw the Earth in his porthole. The round opening is over hatch No. 1. He went aboard ' +
      'through it, and had the rocket failed on the pad or low in the climb his seat would have been fired out through ' +
      'it: the ejection seat was the launch escape system. Its lengths here are from a NASA drawing and the curve of its ' +
      'nose from the vehicles kept at Kaluga and in Moscow; no dimensioned drawing of it has been read.',
    facts: [
      ['Length', '6.6 m'],
      ['Diameter', '2.7 m'],
      ['Mass', 'about 0.8 t'],
      ['Jettisoned', '150 to 156 s after liftoff'],
      ['Opening', 'over hatch No. 1, for boarding and ejection'],
    ],
    explode: [0, 0, 0],
    // the halves part square to the hatch (documented: two halves; how they hinge and how far is ours)
    moves: [
      outward('Fairing_Left', ENTRY.az, 26, 0.0, 0.16),
      outward('Fairing_Right', ENTRY.az + 180, 26, 0.0, 0.16),
      { kind: 'slide', node: 'Fairing_Left', by: along(ENTRY.az, -25, 7), from: 0.1, to: 0.36 },
      { kind: 'slide', node: 'Fairing_Right', by: along(ENTRY.az + 180, -25, 7), from: 0.1, to: 0.36 },
    ],
    order: 0,
  },
  {
    node: 'BlockE',
    commands: [
      { label: 'Light the third stage (he had no say over the launch vehicle: this takes the flight over)', ask: 'step:ignite:2' },
      { label: 'Cut off the third stage (he had no say over the launch vehicle: this takes the flight over)', ask: 'step:cut:2' },
      { label: 'Separate the spacecraft (he had no say over the launch vehicle: this takes the flight over)', ask: 'step:separate:2' },
    ],
    group: 'Third stage',
    inside: true,
    name: 'Block E, the third stage',
    summary: 'One small engine that had to start in space, and did the last two kilometres a second.',
    detail:
      'Built in nine months of 1958 to throw a probe at the Moon, then given a longer adapter for the Vostok. To keep it ' +
      'short its tanks are two rings, one above the other, with the engine in the hole. The RD-0109 does not swivel: the ' +
      'stage is steered by the spent gas from its own turbine, piped to eight small nozzles round the foot: four fixed, ' +
      'for pitch and yaw, and four that turn, for roll (which stood where is not recorded here). It burned from ' +
      'about 300 to 676 seconds. On this flight the orbit came out 97 km higher at the top than planned, which the ' +
      'accounts put down either to this engine burning long or to the core’s. The spacecraft’s frame rests on the ' +
      'adapter’s rim, and the radio equipment that had ridden on the core was moved up here.',
    facts: [
      ['Length', '2.98 m with its adapter'],
      ['Diameter', '2.58 m'],
      ['Mass', '7,984 kg fuelled, 1,472 kg burnt out'],
      ['Engine', 'RD-0109: 54.5 kN in vacuum, 121 kg'],
      ['Engine’s size', '1,555 mm long; nozzle exit 733 mm across'],
      ['Steering', '8 nozzles on the turbine’s exhaust: 4 fixed, 4 turning'],
      ['Burned', 'about 300 to 676 s after liftoff'],
      ['Propellants', 'kerosene and liquid oxygen, 6.9 t'],
    ],
    explode: [0, -2.6, 0],
    order: 0,
  },
  {
    node: 'Interstage',
    group: 'Third stage',
    name: 'Lattice and deflector',
    summary: 'Open on purpose: the third stage lights while the second is still pushing.',
    detail:
      'Nobody had started a liquid engine in weightlessness, where the propellant floats away from the tank outlets. So ' +
      'Block E was lit while the core under it was still burning and holding everything down in the tanks, and only then ' +
      'was the core cut loose. For a moment the upper engine fires straight at the top of the stage below. The fire has ' +
      'to go somewhere: out between the struts of this lattice, turned aside by the cone on the core’s top.',
    facts: [
      ['Length', '1.26 m'],
      ['Struts', '24 drawn, in 12 V’s (count from photographs)'],
      ['Staging', 'hot: upper engine on before the lower is off'],
    ],
    explode: [0, -5.6, 0],
    order: 0,
  },
  {
    node: 'CoreStage',
    commands: [
      { label: 'Cut off the core (he had no say over the launch vehicle: this takes the flight over)', ask: 'step:cut:1' },
      { label: 'Drop the core (he had no say over the launch vehicle: this takes the flight over)', ask: 'step:separate:1' },
    ],
    group: 'Core, Block A',
    inside: true,
    name: 'Block A, the core',
    summary: 'Second stage, though it lights first: it burns from the ground for five minutes.',
    detail:
      'Called the second stage, but its engine starts on the pad with the boosters’, because an engine that failed to ' +
      'start on the ground could be shut down and tried again. It carries twice a booster’s propellant and burns two ' +
      'and a half times as long. Its shape follows from the boosters round it: narrow at the foot where they crowd in, ' +
      'widest 20 m up where their tips push on a heavy frame, so that the oxygen tank is two cones joined at their wide ' +
      'ends. Kerosene is below, oxygen above, and the oxygen reaches the engine down a pipe through the kerosene. ' +
      'Peroxide for the pump and liquid nitrogen to pressurise the tanks sit in rings round that pipe. Every station ' +
      'between its ends is estimated: no drawing of it has been read.',
    facts: [
      ['Length', '27.5 m; 28.75 m with the lattice'],
      ['Diameter', '2.05 m at the foot, 2.95 m at the frame'],
      ['Mass', 'about 100 t at liftoff, 7 to 8 t empty'],
      ['Propellant', '90 t'],
      ['Burned', '300 s'],
    ],
    explode: [0, -9.5, 0],
    order: 0,
  },
  {
    node: 'CoreEngine',
    commands: [
      { label: 'Cut off the core (he had no say over the launch vehicle: this takes the flight over)', ask: 'step:cut:1' },
      { label: 'Drop the core (he had no say over the launch vehicle: this takes the flight over)', ask: 'step:separate:1' },
    ],
    group: 'Core, Block A',
    inside: true,
    name: 'RD-108',
    summary: 'Four big chambers that cannot move and four small ones that steer.',
    detail:
      'Four chambers round a single turbopump: what looks like four engines is one. The pump is driven by steam made ' +
      'from hydrogen peroxide. The four chambers are fixed. Steering is by four little chambers on trunnions at the ' +
      'corners, fed through their own pivots, which Korolev’s own bureau designed when the engine’s builders would ' +
      'not; they also give the last, fine push after the main chambers shut down. With the boosters’ engines that makes ' +
      'twenty large nozzles and twelve small: thirty-two chambers lit on the ground, each by its own pyrotechnic igniter.',
    facts: [
      ['Thrust', '744 kN at the ground, 945 kN in vacuum'],
      ['Specific impulse', '248 s at the ground, 315 s in vacuum'],
      ['Chambers', '4 fixed, 4 steering of 2.5 tf'],
      ['Chamber pressure', '5.1 MPa'],
      ['Propellants', 'kerosene T-1 and liquid oxygen'],
      ['Turbopump', 'one, driven by decomposed hydrogen peroxide'],
    ],
    explode: [0, -13.5, 0],
    order: 0,
  },
  ...BOOSTERS.map(
    ([letter, block, az], i): Part => ({
      node: `Booster_${letter}`,
      commands: [
        { label: 'Drop the strap-ons (he had no say over the launch vehicle: this takes the flight over)', ask: 'step:separate:0' },
      ],
      group: 'Strap-on boosters',
      inside: true,
      name: `Block ${letter} (${block})`,
      summary: i === 0 ? 'First stage, one of four: held on by nothing but its own thrust.' : 'First stage, one of four, as Block B.',
      detail: BOOSTER_DETAIL,
      facts: [
        ['Length', '19.2 m; 19.8 m with its nozzles'],
        ['Diameter', '2.68 m'],
        ['Mass', '43.3 t at liftoff, 3.75 t empty'],
        ['Engine', 'RD-107: 816 kN at the ground, 998 kN in vacuum'],
        ['Chambers', '4 fixed, 2 steering'],
        ['Separated', '119 s after liftoff'],
      ],
      explode: [0, 0, 0],
      // it swings out about its tip ball (documented; the angle is ours: far enough to show the joint), then falls behind
      moves: [outward(`Booster_${letter}`, az, -14, 0.0, 0.2), { kind: 'slide', by: along(az, -52, 9), from: 0.14, to: 0.5 }],
      order: 0,
    }),
  ),
];

const SPACECRAFT = ['DescentModule', 'InstrumentModule', 'RetroEngine', 'Antennas'];

const vehicle: ModelDef = {
  id: 'vehicle',
  name: 'Vehicle',
  url: 'models/ussr/vostok/vostok-1/vehicle.glb',
  scale: '38.36 m on the pad · 10.3 m across the rudders · to scale',
  // on the pad it hangs in the launch system's four supports, its tail below the deck; the gallery stands it on its nozzles
  backdrop: 'tyuratam',
  slider: ['On the pad', 'Taken apart'],
  cutaway: true,
  specGroups: ['Launch vehicle', 'Spacecraft'],
  parts: [...launcherParts, ...parts],
  position: [0, BASE + TAIL, 0],
  rotationY: TURN,
  // The cabin's two lamps, the pilot's left hand one first (`cabin.lighting` names them by this order). How many there
  // were and where they hung is in nothing read: the fittings are high on either side, over his knees (vehicles/vostok_cabin.py,
  // which prints these). Each light is put toward the middle of the cabin, not at its fitting: a bare point at the wall
  // burns the wall beside it. Strength chosen by eye.
  lights: [
    { position: [0.182, 3.68, -0.04], colour: 0xffe4c0, intensity: 0.14, reach: 2.4 },
    { position: [-0.04, 3.68, 0.182], colour: 0xffe4c0, intensity: 0.14, reach: 2.4 },
  ],
  home: 'stack',
  views: [
    { id: 'stack', label: 'Full stack' },
    // (heights are the scene's: the nozzles' exits are at TAIL; directions are the vehicle's own, turned as it stands)
    { id: 'base', label: 'Engines', centreY: 1.0 + TAIL, span: 9.5, from: turned(along(35, 4, 1)) },
    { id: 'booster', label: 'Strap-on', nodes: ['Booster_B'], from: turned(along(-55, 6, 1)) },
    { id: 'tips', label: 'Tip joints', centreY: 19.6 + TAIL, span: 4.6, from: turned(along(-40, 14, 1)) },
    { id: 'third', label: 'Third stage', nodes: ['Interstage', 'BlockE'], from: turned(along(60, 4, 1)) },
    { id: 'fairing', label: 'Fairing', nodes: ['Fairing'], from: turned(along(ENTRY.az, 10, 1)) },
    // each of these is of named parts, so it stays on them as the slider takes the vehicle apart
    { id: 'spacecraft', label: 'Spacecraft', nodes: SPACECRAFT },
    { id: 'descent', label: 'Descent module', nodes: ['DescentModule'] },
    { id: 'hatch', label: 'Entry hatch', nodes: ['EntryHatch'], from: turned(along(ENTRY.az, 12, 1)) },
    { id: 'instrument', label: 'Instrument module', nodes: ['InstrumentModule', 'GasBottles', 'Antennas'] },
    { id: 'engine', label: 'Braking engine', nodes: ['RetroEngine'], from: turned(along(250, -32, 1)) },
  ],
};

const EJECTION = orbital.events.find((e) => e.id === 'ejection')!.at.value;

/**
 * The descent's parachutes as drawn (viewer/chute.ts), each on its body of `orbital.descent` (flown there: when it comes
 * out, its drag, how long it takes to fill). Their areas are the record's (Bobkov; the GCTC page: mission.md, "The last
 * minutes"); each is drawn as a flat round canopy of that area (its diameter derived), and every other figure of their
 * making (gores, lines, colours) is chosen and says so. The module's three are made fast at its parachute container; the
 * seat's stabilising parachute at the seat's top; the pilot's two at his harness.
 */
const ROUND = (area: number, what: string): Measure => ({
  value: Math.sqrt((4 * area) / Math.PI),
  confidence: 'derived',
  source: `${what}: ${area} m² of canopy laid flat as a circle (Bobkov; GCTC)`,
});
const chosen = (value: number, source: string): Measure => ({ value, confidence: 'estimated', source });
const CLOTH = (value: string[], source: string): ChuteDef['colours'] => ({ value, confidence: 'estimated', source });
const CHUTES: ChuteDef[] = [
  {
    on: 'pilot parachute',
    body: 'module',
    at: 'ParachuteContainer',
    cut: 'solid',
    diameter: ROUND(1.5, 'the module’s pilot parachute'),
    gores: chosen(8, 'not read: drawn with eight'),
    lines: chosen(1.5, 'not read: about its diameter'),
    riser: chosen(4, 'not read: clear of the ball'),
    colours: CLOTH(['#f0ece2'], 'not read: undyed'),
  },
  {
    on: 'braking parachute',
    body: 'module',
    at: 'ParachuteContainer',
    cut: 'solid',
    diameter: ROUND(18, 'the module’s braking parachute'),
    gores: chosen(16, 'not read: drawn with sixteen'),
    lines: chosen(5, 'not read: about its diameter'),
    riser: chosen(8, 'not read: some three of the ball’s diameters, clear of its wake'),
    colours: CLOTH(['#f0ece2', '#e2622b'], 'not read: orange and white, as the later Vostoks’ canopies are shown on the ground'),
  },
  {
    on: 'main parachute',
    body: 'module',
    at: 'ParachuteContainer',
    cut: 'solid',
    diameter: ROUND(574, 'the module’s main parachute'),
    gores: chosen(28, 'not read: drawn with twenty-eight'),
    lines: chosen(24, 'not read: a little under its diameter'),
    riser: chosen(4, 'not read'),
    colours: CLOTH(['#e2622b', '#f0ece2'], 'not read: orange and white, as the later Vostoks’ canopies are shown on the ground'),
  },
  {
    on: 'seat’s braking parachute',
    body: 'pilot',
    at: 'EjectionSeat',
    cut: 'solid',
    diameter: ROUND(2, 'the seat’s stabilising parachute'),
    gores: chosen(8, 'not read: drawn with eight'),
    lines: chosen(1.8, 'not read: about its diameter'),
    riser: chosen(3, 'not read'),
    colours: CLOTH(['#f0ece2'], 'not read: undyed'),
  },
  {
    on: 'main canopy',
    body: 'pilot',
    at: 'Harness',
    cut: 'solid',
    diameter: ROUND(83.5, 'the pilot’s main canopy'),
    gores: chosen(24, 'not read: drawn with twenty-four'),
    lines: chosen(8.5, 'not read: a little under its diameter, as a man’s canopy'),
    riser: chosen(0.6, 'not read: from his shoulders to where the lines meet'),
    colours: CLOTH(['#f0ece2', '#e2622b'], 'not read: orange and white'),
  },
  {
    on: 'reserve canopy',
    body: 'pilot',
    at: 'Harness',
    cut: 'solid',
    diameter: ROUND(56, 'the pilot’s reserve canopy'),
    gores: chosen(20, 'not read: drawn with twenty'),
    lines: chosen(7, 'not read: a little under its diameter'),
    riser: chosen(0.6, 'not read'),
    colours: CLOTH(['#f0ece2'], 'not read: undyed'),
  },
];

/**
 * The ejection seat as a place to be. `Seat_Pilot` is the model's own node (vehicles/vostok_3ka.py `seat_view`): an
 * empty at the seated figure's eyes, a child of `EjectionSeat` (so it goes where the seat goes: out along the rails with
 * the slider, and out of the ball at seven kilometres), looking at the middle of the instrument board, the top of his
 * head overhead. There his own helmet and face are not drawn. Boarded through hatch No. 1: he was in the seat for the
 * first call on the radio at 07:10 (the transcript: documented) and was sealed in at 07:50 (Siddiqi: documented); when
 * he climbed in is not recorded, and the ten minutes before the first call are ours.
 */
const HELMET = [
  'Shell',
  'Liner',
  'Head',
  'Cap',
  'MicrophoneBooms',
  'Microphones',
  'Eyes',
  'Brows',
  'Lips',
  'Visor',
  'VisorFrame',
  'Fittings',
  'Lettering',
  'Collar',
  'NeckBand',
];
vehicle.seats = [
  {
    node: 'Seat_Pilot',
    label: 'the ejection seat',
    from: 'EntryHatch',
    open: [(7 - 9) * 3600 + (0 - 6) * 60 - 59.7, (7 - 9) * 3600 + (50 - 6) * 60 - 59.7],
    hide: HELMET.map((mesh) => `Pilot_Helmet_${mesh}`),
    // there is one Gagarin: the figure on the platform's deck is not drawn while he is in the seat
    figure: 'crew',
    // the hatch was bolted down from outside; in flight he left only with the seat, at seven kilometres, which is the flight's
    egress: ['pad'],
  },
];

/**
 * The cabin as somewhere to fly from (types.ts: CabinDef; viewer/cabin.ts). The nodes are the model's
 * (vehicles/vostok_cabin.py, the fit of 1961), each needle with its scale in its own extras; this says what each reads.
 * What each thing rests on is spacecraft.md, "Cabin". Only the clock reads anything yet: the board's three gauges stand
 * at what Gagarin read off them before launch, and say so.
 */
const NOT_SIMULATED = 'Not simulated: the needle stands where it was built.';
// which lens carries which words is not established: the words are a reconstruction (vostoksupersite, from archive
// documents it names, with doubts of its own), so each lens says its block's and stays dark
const SIGNALS: [block: string, lamps: number, says: string][] = [
  [
    'TS1',
    10,
    'The upper block, warnings: among them, as reconstructed, cabin pressure low, carbon dioxide, start the braking engine or cancel the descent, gas for one descent, prepare to eject, the seat’s locks; sound, and the emergency signal being sent.',
  ],
  [
    'TS2',
    10,
    'The middle block: among them, as reconstructed, fly by hand, orientation on the Sun, transmission under way, a call to the radio; VHF transmitting, the gas analyser, manual orientation, and descent I, II and III.',
  ],
  ['TS3', 4, 'The lower block: among them, as reconstructed, starting the braking engine is permitted.'],
];
// The Globus (IMP): what it showed and how, and how far the simulator's is the instrument (spacecraft.md, "Globus")
const GLOBUS =
  'The ship’s place over the Earth: “it turns all the time, following the ship’s motion over the Earth, and the fixed cross in its ring shows over which point of the globe the ship is now” (Ponomareva). Set before launch with the orbit’s period as a three-figure number in its correction window and turned by its two knobs in the planes of the equator and of the orbit, it started at the separation (“the Globus stopped about the middle of the Mediterranean”, Gagarin) and was good to some 300 km (his report). ' +
  'Here it is turned by where the ship is in the run, the point under it under the cross and its way over the ground up the board: the instrument working perfectly, without the drift its setting had. Its window reads 710, as the archive’s record of the transcript has it in both its prints; a newspaper’s print has 510. Its two modes are the instrument’s (Tyapchenko, fig. 16; Ponomareva: «“переброс” “Глобуса”, и перекрестие указывает, куда ты сядешь, если включишь сейчас двигатель»): with the tumbler on the control panel at МЕСТО ПОСАДКИ the globe turns to where a burn fired now would bring the ship down. The real instrument did that by advancing the globe a fixed arc, set on the ground; here the arc is worked out, by the simulator flying that descent from the instant (a burn against the way the ship goes, a second from now; once the ship is coming down, the descent under way), and carried round with the ship between one working and the next. Its «Посадка» lamp is not in the model and does not light. Its map is the globe’s own, in two tones.';
// The Vzor's view (CabinDef.periscope). Its axis is the model's: square out of hatch No. 3's porthole, whose latitude on the
// ball is estimated (15 degrees toward the nose: vostok-3ka.md), so the axis on the Earth's centre leaves the long axis 15
// degrees off level; the ring's angles and the screen's field are estimated (spacecraft.md, "The Vzor")
const VZOR: NonNullable<CabinDef['periscope']> = {
  screen: 'Vzor_Screen',
  name: 'Vzor',
  about:
    'The optical orientator on the porthole at his feet: a mirror ring in which the horizon stands in all eight windows alike when the axis points at the Earth’s centre, and a centre 7 degrees across through which the ground runs along the arrows when the ship lies along its track for braking (Tyapchenko; Gagarin’s report: “the whole horizon was inscribed perfectly evenly in the outer ring”). That is how the ship was turned by hand for the braking burn. ' +
    'Here the centre is the outside along the porthole’s axis and the ring the band where the horizon stands from 150 to 350 km up (Tyapchenko), drawn as a straight map of angle to radius; the mirrors’ own geometry, their inner ring at 5 to 7 degrees and the arrows lit for the jets are not drawn (spacecraft.md, “The Vzor”).',
  // the objective just outside the porthole's glass, on its axis (vostok_cabin.py prints the porthole's place)
  at: [0.82, 3.34, 0.82],
  axis: [0.683013, 0.258819, 0.683013],
  // the ship's nose (its long axis, toward the braking engine's push) at the top of the screen, where the arrows point
  up: [0, 1, 0],
  // its centre's whole field (Gagarin: «угол зрения «взора» 7 градусов»); the ring from a degree and a half inside the horizon at
  // 350 km (71.4 degrees off the nadir) to as far outside it at 150 km (77.7): the margins are ours
  fields: [7],
  reticle: false,
  ring: { mesh: 'Vzor_Ring', from: 70, to: 79 },
};
// The three legends Gagarin's words put a time to (his report and the transcript, «Первый пилотируемый полёт», 2011),
// each on a lens of its colour: which of the 24 lenses carried which legend is not in anything read, so the lens is
// ours. Lit from its event of the record (as the run on show has it) until the next that the record says put it out
const WHICH =
  'The legend, its colour and when it lit are the record’s; which of the 24 lenses carried it is not known, and this one is chosen.';
const LIT: Record<string, Omit<NonNullable<CabinDef['lamps']>[number], 'node'>> = {
  Tele_TS1_6: {
    name: '«Приготовиться к катапультированию»: prepare to eject',
    about: `Red. At the modules’ parting “all the windows on the PKRS went out; only one legend came on: prepare to eject” (Gagarin’s report); out when the seat goes. ${WHICH}`,
    shows: 'event:modules',
    until: 'ejection',
    colour: 0xff4a3a,
  },
  Tele_TS2_1: {
    name: '«Ориентация по Солнцу»: orientation on the Sun',
    about: `Amber. Lit as the solar orientation was switched on in the Earth’s shadow (“the Sun orientation is working”, the transcript; the plan’s signal at 32 minutes); when it went out is not recorded, and the braking command is taken. ${WHICH}`,
    shows: 'event:orientation',
    until: 'retro-command',
    colour: 0xffb340,
  },
  Tele_TS2_5: {
    name: '«Спуск-I»: descent I',
    about: `Green. The timer’s first descent command, at its 56th minute; it did not go out after the burn (“«Спуск I» does not go out”, Gagarin) and went with the others at the modules’ parting. ${WHICH}`,
    shows: 'event:descent-1',
    until: 'modules',
    colour: 0x7dff9a,
  },
};
// What Gagarin read off the board's gauges, by the clock (the transcript, the onboard tape and his report, as
// «Первый пилотируемый полёт», 2011, vol. 1 prints them): straight between his readings, held beyond (types.ts `history`)
const RADIO = 'his readings on the radio and in his report («Первый пилотируемый полёт», 2011)';
vehicle.cabin = {
  within: ['Cabin', 'EjectionSeat'],
  // the top of the pilot's head: up the seat's rails, toward hatch No. 1 (vehicles/vostok_3ka.py `seat_node`)
  overhead: [-0.646, 0.407, -0.646],
  // a head in a helmet fixed to the suit, and the eyes' own turn: estimated, nothing read gives it. Down is far enough
  // to bring the Vzor, 26 degrees under the board, to the middle of the view
  head: { side: 1.4, up: 0.7, down: 0.5 },
  instruments: [
    {
      node: 'Gauge_ClockHour',
      name: 'Clock',
      about:
        'The board’s clock, on Moscow time, twelve hours round. Its ring of flight time, its small dial of days and its index for the descent programme are drawn and do not run.',
      reads: 'timeOfDay',
    },
    { node: 'Gauge_ClockMinute', name: 'Clock', about: 'Minutes.', reads: 'timeOfDay' },
    { node: 'Gauge_ClockSecond', name: 'Clock', about: 'Seconds.', reads: 'timeOfDay' },
    {
      node: 'Gauge_CabinPressure',
      name: 'Cabin pressure',
      about: `Atmospheres, 0 to 1.5. Held at 1: he read 1 at every reading from 07:29 to 10:23, and the telemetry kept 750 to 770 mm of mercury (${RADIO}). Not simulated: the record’s constant.`,
      value: 1.0,
    },
    {
      node: 'Gauge_Humidity',
      name: 'Cabin humidity',
      about: `Per cent. As he read it: 65 at every reading, rising through the braking burn to 71, “the needles went toward the red line” (${RADIO}). Straight between his readings; how it rose in the burn is ours. Not simulated: the record’s.`,
      history: [
        { at: 0, value: 65 },
        { at: 0, from: 'retro-command', value: 65 },
        { at: 0, from: 'retro-off', value: 71 },
      ],
    },
    {
      node: 'Gauge_Temperature',
      name: 'Cabin temperature',
      about: `Degrees Celsius, 0 to 40. As he read it: 19 before launch, 20 from 09:21, and 21 to 22 by the end of the braking burn (${RADIO}). Straight between his readings. Not simulated: the record’s.`,
      history: [
        { at: MSK(7, 29), value: 19 },
        { at: MSK(9, 21), value: 20 },
        { at: 0, from: 'retro-command', value: 20 },
        { at: 0, from: 'retro-off', value: 21.5 },
      ],
    },
    {
      node: 'Gauge_CarbonDioxide',
      name: 'Carbon dioxide',
      about: `Per cent of the cabin’s air, 0 to 4. No reading of it is in the record: it stands at nothing. ${NOT_SIMULATED}`,
      value: 0,
    },
    {
      node: 'Gauge_Oxygen',
      name: 'Oxygen',
      about: `Per cent of the cabin’s air. No reading of it is in the record: it stands at ordinary air’s 21. ${NOT_SIMULATED}`,
      value: 21,
    },
    {
      node: 'Gauge_ModulePressure',
      name: 'Instrument module pressure',
      about: `Atmospheres, 0 to 2: the sealed compartment behind the ball. It stands at the 1.2 he read. ${NOT_SIMULATED}`,
      value: 1.2,
    },
    {
      node: 'Gauge_ManualGas',
      name: 'Gas for turning the ship by hand',
      about: `Atmospheres of nitrogen in the bottles of the manual system, 0 to 200. Never used. As he read it: 175 before launch at 07:29 (the archive’s record, in both its prints; a newspaper’s print has 155), 155 after the separation, 150 at 09:48, 155 at 10:04 and 150 at 10:23 (${RADIO}; mission.md, “The manual system’s gas”). Straight between his readings. Not simulated: the record’s.`,
      history: [
        { at: MSK(7, 29), value: 175 },
        { at: 0, from: 'separation', value: 155 },
        { at: MSK(9, 48), value: 150 },
        { at: MSK(10, 4), value: 155 },
        { at: MSK(10, 23), value: 150 },
      ],
    },
    {
      node: 'Gauge_RetroPressure',
      name: 'Braking engine’s bottle',
      about: `Atmospheres in the bottle that pressurises the TDU. 320 at every reading, falling sharply when the engine was started and at nothing when it was shut down (${RADIO}); straight between is ours. Not simulated: the record’s.`,
      history: [
        { at: 0, value: 320 },
        { at: 0, from: 'retro-command', value: 320 },
        { at: 0, from: 'retro-timer', value: 0 },
      ],
    },
    {
      node: 'Gauge_AutomaticGas',
      name: 'Gas for the automatic orientation',
      about: `Atmospheres, 0 to 200: the first or the second set of bottles, by a tumbler on the control panel; it shows the first. As he read it: 155 to 10:04, 150 leaving the shadow at 10:09, 110 at 10:23, and both sets at nothing by the end of the burn (${RADIO}). Straight between his readings. Not simulated: the record’s.`,
      history: [
        { at: MSK(10, 4), value: 155 },
        { at: MSK(10, 9), value: 150 },
        { at: MSK(10, 23), value: 110 },
        { at: 0, from: 'retro-command', value: 110 },
        { at: 0, from: 'retro-off', value: 0 },
      ],
    },
  ],
  lamps: SIGNALS.flatMap(([block, lamps, says]) =>
    Array.from({ length: lamps }, (_, i) => {
      const node = `Tele_${block}_${i + 1}`;
      const known = LIT[node];
      return known
        ? { ...known, node }
        : { node, name: 'Signal lamp', about: `${says} Which lens says which is not established. Not simulated: it stays dark.` };
    }),
  ),
  controls: [
    ...[1, 2, 3, 4, 5, 6].map((key) => ({
      node: `Ctl_Code${key}`,
      name: `Logical lock, key ${key}`,
      about:
        'Six keys: three of them, pressed in order, let the pilot take the ship into his hands. The number was sealed in an envelope aboard; it was 1-4-5 by Kamanin’s diary, who checked it on the ship that morning; Gallay’s memoir and the histories that follow it have 1-2-5. On the flight deck a key pressed here is the same as its digit typed: the code frees the hand controls once the ship is alone in orbit.',
      // (the flight deck's lock, orbitdeck.ts: pressed here or typed there, the same key)
      does: `code:${key}`,
    })),
    {
      node: 'Ctl_ManualOrientation',
      name: 'Manual orientation',
      about:
        'Under the clear cover: with the lock open, it hands the ship’s attitude to the hand controller. On the flight deck the code on the lock throws it: it stands thrown while the hand controls are free.',
      // (orbitdeck.ts: `manual` says whether it is on; it stands as the deck's hands are, `free`)
      does: 'manual',
      holds: 'free',
      says: ['Off', 'On'],
    },
    {
      node: 'Ctl_Descent3',
      name: 'Descent III',
      about: 'Under the clear cover: the descent cycle begun by the pilot. It throws and stays thrown; what it set going is not simulated.',
      says: ['Off', 'On'],
    },
    {
      node: 'Ctl_RetroFire',
      name: 'Start the braking engine',
      about: 'Red, under the clear cover: the pilot’s own command to the TDU, for a ship he has turned by the Vzor.',
      does: 'retro',
    },
    {
      node: 'Ctl_Oxygen',
      name: 'Oxygen',
      about:
        'Under the clear cover. What it switched is not in anything read: it throws and stays thrown, and nothing follows. Not simulated.',
      says: ['Off', 'On'],
    },
    { node: 'Ctl_Alarm', name: 'Emergency signal', about: 'Under the clear cover: sends the alarm to the ground. Not simulated.' },
    {
      // (its two positions are in its `throw` extras, vehicles/vostok_cabin.py; it is the globe's `control`, below)
      node: 'Ctl_GlobusMode',
      name: 'Globus: present place or landing place',
      about:
        'ГЛОБУС, on the control panel’s face: МЕСТО ПОЛОЖЕНИЯ, where the ship is, or МЕСТО ПОСАДКИ, where it would come down if the braking engine were started now (Tyapchenko, fig. 16; the instruction of January 1961 has the pilot throw it over and back as a check after reaching orbit). Built at the present place, as it flew. Thrown, the globe turns to the landing place the simulator works out for a burn fired now: the real instrument advanced the globe by a fixed arc set on the ground.',
    },
    {
      node: 'Ctl_HandController',
      name: 'Hand controller',
      about:
        'A short stalk on a ball with a ribbed grip across it, at his right hand: it works the manual system’s gas jets, once the lock is open. Gagarin never used it. On the flight deck, with the hand controls free, it moves as W S A D Q E turn the ship.',
    },
  ],
  // The cabin's lamps: one switch on the control panel, off, duty and working (the factory's photograph of the panel:
  // documented); how many lamps there were and where they hung is in nothing read, and the two fittings high on either
  // side are ours. Built at working. `lights` above are the left hand one and the right hand one.
  lighting: {
    control: 'Ctl_Lighting',
    name: 'Cabin lighting',
    about:
      'One tumbler on the control panel: working, duty, off. The duty light is the left hand lamp at a quarter of its strength: that it was dimmer is in Titov’s report (too dim to write by), how dim is ours.',
    // (the duty light: which lamp, and how dim, estimated)
    ways: [
      { says: 'Working', lit: [0, 1] },
      { says: 'Duty', lit: [{ light: 0, level: DUTY }] },
      { says: 'Off', lit: [] },
    ],
    fittings: ['Lamp_1', 'Lamp_2'],
  },
  // the two portholes that can be looked out of, as light (vehicles/vostok_cabin.py prints them in this frame): the one in
  // hatch No. 1 over his head and the one at his right. The third is behind the Vzor
  windows: [
    { at: [-0.711, 3.477, -0.711], out: [-0.646, 0.407, -0.646], across: 0.2, name: 'Hatch porthole' },
    { at: [-0.379, 3.546, 0.894], out: [-0.345, 0.469, 0.813], across: 0.2, name: 'Right porthole' },
  ],
  // The node's own axes: +Y up the stalk, +X along the grip. That it had two axes is the maker's history (Tyapchenko);
  // which two, how the third was commanded and how far it tipped are estimated
  stick: { node: 'Ctl_HandController', throw: 0.2, pitch: [1, 0, 0], roll: [0, 0, 1], yaw: [0, 1, 0] },
  // its two modes on the one tumbler (Tyapchenko, fig. 16's caption: documented); the landing place is the simulator's
  // (derived: the real instrument advanced the globe by a fixed arc set on the ground). The «Посадка» lamp that lit with
  // the second is not in the model (vehicles/vostok_cabin.py: the window over the globe is a plain block), so no `lamp`
  globe: {
    node: 'Globus_Globe',
    name: 'Globus',
    about: GLOBUS,
    control: 'Ctl_GlobusMode',
    modes: [
      { says: 'Present place', shows: 'place' },
      { says: 'Landing place', shows: 'landing' },
    ],
  },
  periscope: VZOR,
};

// The cosmonaut on the deck's west edge, on his way from where the bus stopped south of the tracks to the foot of the
// erector's stair (which is on its south side: the film), facing the rocket. The film and a colour photograph have him
// walking this way along the wagon's south side; where he is stood on it is ours (estimated).
const COSMONAUT_AT: [number, number, number] = [-19.5, 0, 6.5];
const COSMONAUT_FACING = Math.atan2(-COSMONAUT_AT[0], -COSMONAUT_AT[2]);
/** A direction to look at him from: in front of him, turned `aside` radians, `lift` up. */
const facingCosmonaut = (lift: number, aside = 0.2): [number, number, number] => [
  Math.sin(COSMONAUT_FACING + aside),
  lift,
  Math.cos(COSMONAUT_FACING + aside),
];

const crewParts: Part[] = [
  {
    node: 'Helmet',
    name: 'Helmet',
    summary: 'White, part of the suit, and lettered that morning.',
    detail:
      'The helmet does not come off: it is one piece with the suit, and the head turns inside it. Its visor swings ' +
      'up over the crown, which is how it is here, as he wore it to the pad; if the cabin lost ' +
      'pressure it would have come down by itself. The red "СССР" on the brow was painted by hand on the morning ' +
      'of the flight, the story goes, so that whoever found him after landing would know whose pilot had come down ' +
      'by parachute. Photographs taken that morning exist both with the letters and without.',
    facts: [
      ['Shell', 'fixed to the suit'],
      ['Visor', 'double, closes by itself on loss of pressure'],
      ['Lettering', '"СССР", red, by hand, 12 April 1961'],
      ['Under it', 'a white headset cap with two microphones'],
    ],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Torso',
    name: 'Torso',
    summary: 'An orange cover over the suit that holds pressure.',
    detail:
      'What is seen is not the pressure suit. The SK-1 is two layers, a rubber bladder inside a restraint layer of ' +
      'lavsan (polyester) cloth, and over them this orange cover, the colour chosen to be found by: Vostok’s pilot ' +
      'left the cabin on his ejection seat and came down under his own parachute, anywhere along the track. The ' +
      'grey at the neck is the suit itself. The hoses leave at his right side; on the way to the pad the suit was ' +
      'ventilated from the bus.',
    facts: [
      ['Suit', 'SK-1, Zvezda (Tomilino)'],
      ['Mass', '20 kg'],
      ['Pressure if the cabin fails', '270 to 300 hPa'],
      ['Markings', 'none but the helmet’s'],
    ],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Arms',
    name: 'Arms',
    summary: 'A mirror is sewn to the right sleeve.',
    detail:
      'Strapped into the seat in a helmet that does not turn far, he could not see everything in the cabin. The ' +
      'mirror on the sleeve is for looking at what is out of sight: a switch, a gauge, the suit’s own fittings.',
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Gloves',
    name: 'Gloves',
    summary: 'On metal rings, and off until he was in the cabin.',
    detail:
      'The gloves lock to metal rings at the wrists. Their palms are faced with leather; the backs are the cover’s orange. ' +
      'They are modelled on, as flown.',
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Legs',
    name: 'Legs',
    summary: 'One garment from the collar down, zipped to the crotch, a pocket on each thigh.',
    detail:
      'The cover is a loose overall. Its legs hang over the tops of the boots. What the thigh pockets held ' +
      'has not been read in a source; survival gear rode in the seat.',
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Boots',
    name: 'Boots',
    summary: 'Black laced leather, worn over the suit’s feet.',
    detail: 'Ordinary-looking high boots, laced on hooks, pulled on over the feet of the pressure suit.',
    explode: [0, 0, 0],
    order: 0,
  },
];

const crew: ModelDef = {
  id: 'crew',
  name: 'Crew',
  url: 'models/ussr/vostok/vostok-1/crew.glb',
  scale: 'Yuri A. Gagarin · 1.65 m, 1.72 m suited · to scale',
  backdrop: 'tyuratam',
  parts: crewParts,
  position: COSMONAUT_AT,
  rotationY: COSMONAUT_FACING,
  walker: { eyes: 'Helmet_Eyes', forward: [0, 1] },
  wide: false,
  specGroups: ['Pressure suit'],
  home: 'figure',
  views: [
    { id: 'figure', label: 'Cosmonaut', centreY: 0.9, span: 2.4, from: facingCosmonaut(0.05) },
    { id: 'helmet', label: 'Helmet', centreY: 1.57, span: 0.62, from: facingCosmonaut(0.05) },
    { id: 'hands', label: 'Gloves', centreY: 0.86, span: 0.62, from: facingCosmonaut(0.05) },
    { id: 'boots', label: 'Boots', centreY: 0.18, span: 0.62, from: facingCosmonaut(0.2) },
  ],
};

// What served the rocket and was taken away before it left, as sites/site1/ has it (service_trusses.py, cable_mast.py,
// erector.py: the numbers live there, and site-1.md tabulates the pivots). Angles round the site are from due east,
// anticlockwise from above; the launch system stands turned TURN, so its north truss is 45 degrees on from that.
/** Where each piece's hinge is round the site, degrees. */
const TRUSS_NORTH = TURN / DEG + 45;
const TRUSS_SOUTH = TURN / DEG + 225;
const MAST_AT = TURN / DEG + 315;
/** How far a service truss is lowered, and the cable mast swings back at 09:06, degrees. */
const TRUSS_FALL = 98;
const MAST_FALL = 40;
/**
 * The launch system's four supports (launch_system.py): where each hinge is round the site, how far each falls back
 * (degrees), and when, in seconds from launch. That they fall back as the rocket rises is the record (Siddiqi; Chertok);
 * the angle is read off a photograph of this launch with the rocket's tail some 20 m over the deck, in which they
 * stand open, 14 to 21 degrees out of upright. The times are a later launch's: film of a Soyuz leaving this pad in
 * 2019 (the same system, since modified) has the trusses begin 0.6 to 0.9 s after the rocket first moves and at rest
 * 1.7 to 2.0 s later, which the photograph of 1961 allows (open by about three seconds) and the rocket needs (the
 * pose check, site-1.md: the strap-ons clear the heads).
 */
const SUPPORT_AT = [45, 135, 225, 315].map((az) => TURN / DEG + az);
const SUPPORT_FALL = 45;
const SUPPORTS_GO: [from: number, to: number] = [0.7, 2.6];
/**
 * The four guides at the tail, each under its support: they "go back under their own weight" once the rocket's
 * brackets have left their grips, in 2.5 s at most (descriptions and trials of the later system). The model's guide
 * is an arm from the turning cage in to the tail, whose tip goes down: how far is estimated.
 */
const GUIDE_FALL = -25;
const GUIDES_GO: [from: number, to: number] = [0.3, 2.3];
/**
 * The railway fillers (tank_cars.py): each is drawn off west along its own track, its east bogie following the track's
 * line (metres east and south from where that bogie stood: sites/site1/place.py, SPURS and CENTRE_TRACK).
 */
const CAR_WHEEL = 0.475;
const carLeaves = (node: string, wheelbase: number, path: [number, number][], from: number, to: number): Move => ({
  kind: 'drive',
  node,
  from,
  to,
  path,
  pivot: [0, CAR_WHEEL, 0],
  forward: [-1, 0],
  wheelRadius: CAR_WHEEL,
  wheelbase,
  wheels: `${node}_Wheel_`,
  steered: `${node}_Steered_`,
  axle: 'z',
});
/** The erector: its boom's lean toward the rocket, how far it is drawn back before the wagon moves, the wagon's two runs west and its wheels' radius. */
const BOOM_LEAN = 14;
const BOOM_BACK = 20;
const ERECTOR_ROLL = [30, 120];
const ERECTOR_WHEEL = 0.475;
const ERECTOR_AXLES = [1, 2, 3, 4, 5, 6];
/** The lift's stops above its lowest, m: it rides the leaning boom, so each is 0.2493 of its height nearer the rocket. */
const LIFT_STOPS: [name: string, up: number][] = [
  ['Lift door, 15 steps up', 0],
  ['Third stage', 19.6],
  ['Upper platform, at the hatch', 23.12],
];

/**
 * The pad's slider is the morning of 12 April 1961, from the bus coming up the road to the rocket leaving. Its first
 * tenth is the pilot's arrival (06:49 to 07:10: the bus, the report, the walk to the stair, the lift); the rest runs
 * from the pilot in his seat to four seconds after liftoff. These are the positions on it (0 to 1) at which things
 * happen; the hardware's motions below are timed against them. The times from 07:10 on are the transcript's, to the
 * minute; how long each motion took is nowhere recorded, and how much of the slider it has is ours.
 */
const ARRIVAL = 0.1;
/** A reading of the slider as it was when it began at 07:10, on the slider that begins with the bus. */
const seated = (t: number) => ARRIVAL + (1 - ARRIVAL) * t;
const T = {
  bus: 0.03, // 06:50: the bus stops on the apron
  walk: 0.055, // 06:58: the report is made; the pilot is walked to the erector (not timed)
  wave: 0.07, // 07:01: on the stair's landing he turns and waves (not timed)
  aloft: 0.09, // 07:08: the lift has gone up and the send-off has broken up (not timed)
  seat: ARRIVAL, // 07:10: the transcript begins, the pilot in his seat
  cars: seated(0.02), // 08:08: "the railway cars are leaving now"
  platforms: seated(0.04), // 08:15: "they are lowering the service platforms"
  erector: seated(0.1), // 08:35: "now they will draw the erector off"
  boomAway: seated(0.3), // 08:37: "the erector's boom has come away normally"
  trusses: seated(0.45), // 08:40: "now we are drawing the trusses off"
  boomDown: seated(0.55), // the boom is down on the wagon (not recorded)
  cleared: seated(0.75), // the erector is off the pad and both trusses are down (not recorded)
  mast: seated(0.8), // 09:06: "the cable mast is away"
  mastOff: seated(0.86), // it has swung back (not recorded: ten seconds are given it)
  liftoff: seated(0.9), // 09:06:59.7
};
const TRANSCRIPT =
  'the record of the exchanges between the cosmonaut and the control points, sent to the Central Committee on 25 April 1961 (Izvestiya TsK KPSS, 1991 No. 5)';
const NOT_TIMED = 'not recorded: placed by us';
const FILM = 'the film of the morning («Первый рейс к звёздам», ЦСДФ 1961)';
const MORNING: Keyframe[] = [
  {
    at: MSK(6, 49),
    slider: 0,
    event: 'The bus comes up the concrete road from the south-west',
    confidence: 'estimated',
    source: `${FILM}, 43:08: the bus on the road. The minute is ours: it reached the pad at about 06:50`,
  },
  {
    at: MSK(6, 50),
    slider: T.bus,
    event: '06:50: the bus stops west of the rocket; the pilot steps down and reports to the State Commission',
    confidence: 'documented',
    source:
      'Kamanin’s diary has the bus at the pad at 8:50 by the range’s clock, which ran two hours ahead of Moscow’s; Golovanov, Korolev: fakty i mify, p. 645, for the report',
  },
  {
    at: MSK(6, 58),
    slider: T.walk,
    event: 'Korolev, Moskalenko and Kamanin walk him to the erector',
    confidence: 'estimated',
    source: `${FILM}, 43:42 to 44:03, and a colour photograph of the party walking. The minute is not recorded`,
  },
  {
    at: MSK(7, 1),
    slider: T.wave,
    event: 'Fifteen steps up, he turns on the landing and waves',
    confidence: 'estimated',
    source: `${FILM}, 44:05, and a photograph; Ivanovsky for the fifteen steps. The minute is not recorded`,
  },
  {
    at: MSK(7, 8),
    slider: T.aloft,
    event: 'The lift has gone up; the send-off breaks up',
    confidence: 'estimated',
    source: NOT_TIMED,
  },
  {
    at: MSK(7, 10),
    slider: T.seat,
    event: 'The pilot is in his seat: the first call on the radio',
    confidence: 'documented',
    source: `${TRANSCRIPT}: it begins at 07:10`,
  },
  {
    at: MSK(8, 8),
    slider: T.cars,
    event: '08:08: the railway cars leave',
    confidence: 'documented',
    source: `${TRANSCRIPT}, Kamanin at 08:08. How long they took to go is not recorded: they are off the pad by 08:15`,
  },
  {
    at: MSK(8, 15),
    slider: T.platforms,
    event: '08:15: the service platforms are lowered; the work on the trusses is finished',
    confidence: 'documented',
    source: `${TRANSCRIPT}, Korolev at 08:15. What was lowered is not known, and nothing in the model moves for it`,
  },
  {
    at: MSK(8, 35),
    slider: T.erector,
    event: '08:35: the erector is to be drawn off',
    confidence: 'documented',
    source: `${TRANSCRIPT}, Kamanin at 08:35`,
  },
  {
    at: MSK(8, 37),
    slider: T.boomAway,
    event: '08:37: the erector’s boom has come away',
    confidence: 'documented',
    source: `${TRANSCRIPT}, Kamanin at 08:37`,
  },
  {
    at: MSK(8, 40),
    slider: T.trusses,
    event: '08:40: the service trusses are drawn off',
    confidence: 'documented',
    source: `${TRANSCRIPT}, Korolev at 08:40`,
  },
  { at: MSK(8, 42), slider: T.boomDown, event: 'The boom lies on its wagon', confidence: 'estimated', source: NOT_TIMED },
  {
    at: MSK(8, 45),
    slider: T.cleared,
    event: 'The erector is off the pad and the trusses are down',
    confidence: 'estimated',
    source: NOT_TIMED,
  },
  {
    at: MSK(9, 6),
    slider: T.mast,
    event: '09:06: the cable mast is away',
    confidence: 'documented',
    source: `${TRANSCRIPT}, Korolev at 09:06, to the minute`,
  },
  {
    at: MSK(9, 6, 10),
    slider: T.mastOff,
    event: 'The mast has swung back',
    confidence: 'estimated',
    source:
      'a photograph of the morning with the rocket still in the closed supports has the mast leaning well back already; how long it took is not recorded',
  },
  { at: 0, slider: T.liftoff, event: 'Liftoff, 09:06:59.7', confidence: 'documented', source: 'Siddiqi, Challenge to Apollo, launch log' },
  {
    at: SUPPORTS_GO[1],
    slider: 1,
    event: 'The four supports have fallen back: the launch system stands open',
    confidence: 'estimated',
    source:
      'a photograph of this launch with the rocket’s tail some 20 m over the deck (RussianSpaceWeb) shows them open; how long they took is not recorded',
  },
];

/**
 * The people of the morning stand in groups, each a node of the pad, and are there when the record has them there:
 * a group that leaves is put out of sight between one frame and the next, 90 m under where it stood, and one that
 * comes is built there and brought up. (They do not walk away: the viewer walks one figure, the one being walked as.)
 * Seconds from launch, on the flight's clock.
 */
const OUT_OF_SIGHT = 90;
const leaves = (node: string, at: number): Move => ({ kind: 'slide', node, by: [0, -OUT_OF_SIGHT, 0], from: at, to: at + 0.1 });
const comes = (node: string, at: number): Move => ({ kind: 'slide', node, by: [0, OUT_OF_SIGHT, 0], from: at, to: at + 0.1 });
/**
 * A road vehicle driven on the clock (road_vehicles.py): `path` is where its rear axle goes, metres ahead and to the
 * right of where the drive starts. A vehicle driven more than once is a nest of nodes, a drive to each, and its
 * wheels are named after the node.
 */
const drives = (
  node: string,
  from: number,
  to: number,
  path: [number, number][],
  wheelbase: number,
  wheelRadius: number,
  reverse = false,
): Move => ({
  kind: 'drive',
  node,
  from,
  to,
  path,
  pivot: [0, wheelRadius, 0],
  forward: [1, 0],
  reverse,
  wheelRadius,
  wheelbase,
  wheels: `${node}_Wheel_`,
  steered: `${node}_SteerWheel_`,
  axle: 'z',
});
const BUS = { wheelbase: 4.19, wheel: 0.525 };

const padParts: Part[] = [
  {
    node: 'Platform',
    group: 'Site 1',
    name: 'Launch platform',
    summary: 'A concrete deck 41 m square, three sides of it standing out over a pit.',
    detail:
      'The rocket was brought onto it lying down, along the tracks from the west, where the deck rests on the ground; its ' +
      'other three sides stand out over the flame pit on four pylons, and a low fence keeps people back from the drop. In ' +
      'its middle is the round opening, 20 m across, that the launch system turns in and the rocket hangs through. Its ' +
      'north-east corner is carried 10 ft further out, for one of the two masts; its south-east corner is cut off. On its ' +
      'west side is a small building the CIA took for the head of a stair down into it: what is under it is not recorded, ' +
      'and its door is shut. Nobody has published a drawing of the platform. Its size is what the CIA’s photographic ' +
      'interpreters measured off U-2 pictures of 1957 to 1959, which agrees with the 40 by 40 m in Russian print; its ' +
      'thickness is read off their elevation and is estimated (a Russian account has it three storeys of bridge trusses). ' +
      'Sputnik left from it, and every crewed Vostok.',
    facts: [
      ['Deck', '135 ft (41.15 m) square'],
      ['Opening', '65 ft (19.8 m) across'],
      ['Pylons', '4, each 30 by 10 ft, 115 ft over the four'],
      ['Thickness', 'about 10 ft (estimated)'],
      ['Lip', '10 ft out at the north-east corner'],
      ['In use', '1957 to 2019'],
    ],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'DeckRails',
    group: 'Site 1',
    name: 'Tracks on the deck',
    summary: 'The railway runs on to the platform and stops at the edge of the hole.',
    detail:
      'Everything came to this pad by rail, so the rails are laid in the concrete of the deck itself, their heads flush ' +
      'with it, as a photograph of the morning shows. The centre track runs to the edge of the opening: the erector ' +
      'brought the rocket along it and stood on it until 08:35. A track on the platform’s north part and one on its ' +
      'south flank the launch system, for the propellant trains; a short spur between ends just on the abutment. Either ' +
      'side of the centre track lies one more rail, 7 m apart: the CIA’s interpreters called them gantry tracks, and ' +
      'nothing read says what rode them. Where each track lies is scaled off the CIA’s plan of March 1961, drawn from the ' +
      'photographs of 1957 and 1959; today’s map agrees to about a metre. The gauge was 1,524 mm, as every Soviet ' +
      'railway’s was until 1970.',
    facts: [
      ['Gauge', '1,524 mm (5 ft)'],
      ['Centre track', 'to the opening’s edge, on the rocket’s axis'],
      ['North and south tracks', '13.6 m and 12.4 m from it (scaled off the CIA’s plan)'],
      ['Gantry rails', 'two, 23 ft (7.0 m) apart (scaled; the figure is redacted)'],
      ['Heads', 'flush in the deck (9 mm proud in the model)'],
    ],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Masts',
    group: 'Site 1',
    name: 'Corner mast',
    summary: 'A mast 110 ft tall that the CIA measured and could not explain. Its twin had gone by this morning.',
    detail:
      'It stands at the platform’s north-east corner, on a lip built out over the pit to carry it. The CIA’s interpreters ' +
      'measured two in 1957, this one and another at the south-west corner on the abutment, the same distance from the ' +
      'rocket on one line through it, each 110 ft with an array at the top at least 5 ft wide and 10 ft high. They took ' +
      'them for collimation towers; by March 1961 they had talked themselves out of that and out of floodlights too, and ' +
      'wrote that their function could not be determined. The photographs of 12 April 1961 show only this one. Three ' +
      'taken from the south have it at the right of the rocket and clear sky where the other would stand as far to the ' +
      'left, so the south-west mast had been taken down since the U-2 last saw it in July 1959, and it is not built ' +
      'for this day. What they show of this one is a slender cross-braced lattice, a railed head with lamps at its ' +
      'corners, the lattice going on above the head to a rod. A photograph of a later launch has raking struts at its ' +
      'foot and a ring of floodlights two fifths of the way up: the struts are built, as far as the lip holds them, and ' +
      'the ring is not. The height, the array’s size and where it stands are the CIA’s; the lattice’s section, the ' +
      'lamps’ number and aim, the rod and the ladder are estimated.',
    facts: [
      ['Height', '110 ft (33.5 m)'],
      ['Array', 'at least 5 ft wide and 10 ft high'],
      ['Where', 'the north-east corner, 29.4 m from the axis (scaled off the CIA’s plan)'],
      ['Its twin', 'at the south-west corner in 1957 and July 1959; absent on 12 April 1961 (photographs)'],
      ['Head', 'railed, some 2.9 m over its lamps (off a photograph of the day)'],
      ['What for', 'not established; drawn as floodlights (estimated)'],
    ],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'DeckFittings',
    group: 'Site 1',
    name: 'On the deck',
    summary: 'A wire railing at the edge, two cabinets, a loudspeaker: what a photograph taken through the fence shows.',
    detail:
      'Nothing published describes the deck’s furniture, so this is one photograph’s worth: taken from beyond the south ' +
      'fence on the morning of the flight, the rocket venting and the erector gone. It shows a low railing of posts and ' +
      'wires along the platform’s edge, running to the south-east corner and on west past the south-west one; behind it, ' +
      'near the south-west corner, two dark cabinets some 2.2 m high, one 2.7 m broad and one 1.1 m with a horn on its ' +
      'side. The horn is taken for a loudspeaker: "the loudspeakers announce the operational time", Ivanovsky wrote of ' +
      'that morning. What the cabinets held is not recorded, and how far in from the edge they stood cannot be seen from ' +
      'the south. The film of the morning, looking down from the erector, shows the concrete laid in rectangular slabs ' +
      'with the rails flush in it; the slabs’ size here, 6 m by 3 m, is estimated. The CIA’s plans, from the photographs ' +
      'of 1957 and 1959, have a fence 15 ft in from the edge instead, which is built too: whether both stood in 1961 is ' +
      'not known.',
    facts: [
      ['Railing', 'about 1.1 m high, at the edge (off a photograph of 12 April 1961)'],
      ['Cabinets', '2.7 m and 1.1 m broad, 2.2 m high, 20 m and 17 m west of the axis (measured, to half a metre)'],
      ['Loudspeaker', 'a horn on the narrower cabinet (that it was one is our reading)'],
      ['Slabs', 'rectangular, the rails flush (film); 6 m by 3 m here (estimated)'],
    ],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'FlamePit',
    group: 'Site 1',
    name: 'Flame pit',
    summary: 'The pad stands on the edge of a quarry 43 m deep, and the flame is turned out along its floor.',
    detail:
      'Under the platform the pit is a slot between retaining walls 110 ft apart. East of it lies the pit base, 60 ft ' +
      'wide between two concrete trenches that run 60 ft to a sump built into the floor, whose face stands 10 ft over ' +
      'them: for the water that flushed the pit, the CIA thought, and for dumped propellant. From the sump the floor ' +
      'climbs east to the pit’s point, and a road came down it from there. Round the slot the sides come down in two ' +
      'terraces, and in 1959 a cut ran north out of the rim, beside which the cables to the bunker came in. The outline ' +
      'is today’s map, which matches the 880 by 550 ft the CIA measured in 1957, with that cut put back. The depth is in ' +
      'dispute: 43 m is modelled, the sum of two of the CIA’s figures, where Russian print gives 45 m and "almost 50". ' +
      'The plan of the base is the CIA’s; the trenches’ depth, the road’s surface and the ladders are estimated.',
    facts: [
      ['Rim', '880 by 550 ft (268 by 168 m), as measured in 1957'],
      ['Depth', 'about 43 m under the deck (in dispute)'],
      ['Rim’s height', 'the deck’s level on the west and south, 8 m under it on the north (derived from SRTM)'],
      ['Pit base', '60 ft wide, between two trenches 60 ft long'],
      ['Sump', '75 by 110 ft, its face 10 ft high'],
      ['Lining', 'concrete under the platform, gunite on the west'],
    ],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'FlameDeflector',
    group: 'Site 1',
    name: 'Flame deflector',
    summary: 'A curved chute under the opening that turns twenty chambers’ fire from straight down to due east.',
    detail:
      'The rocket’s tail hangs 6.75 m under the deck, and below it the back wall of the pit curves forward and down to ' +
      'the floor: the exhaust strikes it and runs out along the pit base. No photograph taken from above could show it. ' +
      'The CIA drew only a "possible base of flame deflector", and in 1959 saw a curved deflector plate being built in ' +
      'the same place at the second pad. Its form here is from a scale model of the pad as it was in 1957: an arc from ' +
      'the back wall, 16 m under the deck, to the pit base at the platform’s east edge, as wide as the slot. Every size ' +
      'of it is estimated.',
    facts: [
      ['Form', 'a curved chute, back wall to pit base (off a scale model)'],
      ['From', '16 m under the deck (estimated)'],
      ['To', 'the pit base at the platform’s east edge, 43 m down'],
      ['Arc', '44.9 m radius (derived from those two)'],
    ],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'LaunchRing',
    group: 'Site 1',
    name: 'Launch system',
    summary: 'Four arms that hold the rocket by its waist, and let it go.',
    detail:
      'Barmin’s launch system, the "tulip": a ring that turns in the platform’s opening to aim the rocket, and on it four ' +
      'trusses that lean in to the core just under the strap-ons’ tips, where their thrust goes into it. The rocket is not ' +
      'bolted down. It hangs on the four heads by its own weight, its tail 6.75 m down in the pit, steadied lower down by ' +
      'four guides; as its thrust overcomes its weight the heads are unloaded and each truss falls back under its ' +
      'counterweights, and the tulip opens. That it works so is the record. How far the trusses fall is read off a ' +
      'photograph of this launch, taken from across the pit with the rocket’s tail some 20 m over the deck: all four ' +
      'stand open, 14 to 21° out of upright, which is 45° from where they held the rocket. How long they took in 1961 ' +
      'is not recorded: the times here are read off film of a Soyuz leaving this pad in 2019, on the same system since ' +
      'modified, in which the trusses begin some 0.7 s after the rocket first moves and are at rest 1.9 s later, in ' +
      'time for the strap-ons, which widen downward, to pass the heads. Chertok has it that in the trials of 1956 the ' +
      'four did not go together but one after another, tenths of a second apart; here they go together. The guides ' +
      'at the tail drop away under their own weight once the rocket has left them, as the later system’s are ' +
      'described doing; how far is estimated. The ring and its heights are from a Soviet description of the later system ' +
      'for Soyuz; the trusses’ members, platforms and counterweights are drawn from the film of the morning and are ' +
      'estimated.',
    facts: [
      ['Ring', '14.92 m inside, 19.35 m over its corners'],
      ['Turning part', '20.35 m above the deck, 6.75 m below'],
      ['Supports', '4, at the strap-ons’ tips, 13 m above the deck'],
      ['Turned to', '37.5° east of north (derived)'],
      ['Let go', 'at liftoff, 09:06:59.7 Moscow time'],
      ['Fall back', '45° (off a photograph of the launch), from 0.7 s after liftoff to 2.6 s (off film of a later launch)'],
      ['Guides', '4 at the tail; they drop away as it leaves (documented for the later system)'],
    ],
    explode: [0, 0, 0],
    order: 0,
    // each support about its hinge on the ring, its head going outward (documented that they do; the angle read off a
    // photograph of the launch; the times off film of the later system); each guide about its foot on the cage, its
    // tip going down (documented for the later system that they fall away; the angle estimated)
    clocked: [
      ...SUPPORT_AT.map((az, i) => outward(`Support_${i + 1}`, az, SUPPORT_FALL, ...SUPPORTS_GO)),
      ...SUPPORT_AT.map((az, i) => outward(`Guide_${i + 1}`, az, GUIDE_FALL, ...GUIDES_GO)),
    ],
  },
  {
    node: 'TankCars',
    group: 'Taken away before launch',
    name: 'Railway fillers',
    summary: 'The rocket was fuelled from railway cars, and an hour before it left they were drawn away.',
    detail:
      'Everything the rocket burned came to it by rail and was pumped aboard from cars standing either side of it. The ' +
      'liquid oxygen filler, 8G117, was "about 25 m over its couplers, as passenger coaches are", two vessels with a pump ' +
      'compartment between them, on two four-axle bogies; the kerosene filler, 8G119, "an eight-axle car 24 metres ' +
      'long" with two tanks of 50 cubic metres, which on 12 April "took its position seven metres from the rocket". The ' +
      'CIA’s interpreters, looking down on such cars in 1957, took them for passenger coaches 80 ft long. At 08:08 ' +
      'Kamanin told Gagarin "the railway cars are leaving now": a rail tractor took them a kilometre off. Those ' +
      'lengths, the eight axles and that hour are the record. A drawing has them green. A colour photograph of the ' +
      'morning, of the party walking to the stair at about seven, has one that is not: on the track north of the ' +
      'erector’s wagon stands a pale grey car, its side in panels, its roof a low arch with a rib at every joint, a ' +
      'doorway at floor level with two men in it, and in black stencil «ОГНЕОПАСНО» (flammable) and the usual warning ' +
      'against humping, under a number read as 64. The car on the north track is built so. Which filler it was is not ' +
      'settled: the oxygen is put to the north, where the shed over the spur sheltered the oxygen and nitrogen toppers, ' +
      'though "flammable" would sooner be said of kerosene; and the photograph has the grey car abreast of the wagon, ' +
      'some 20 m further west than the filler stands here beside the rocket. One of each is built, where a drawing has ' +
      'three oxygen fillers end to end; their height and every fitting but the photograph’s are estimated. The hydrogen ' +
      'peroxide filler, the toppers under the shed, the transport tanks behind them and the tractor are not built.',
    facts: [
      ['Oxygen filler', '8G117: about 25 m over its couplers, 8 axles'],
      ['Kerosene filler', '8G119: 24 m, 8 axles, two tanks of 50 m³'],
      ['Breadth', '3.09 m (today’s 8G0119)'],
      ['From the rocket', '7 m (a memoir, of the kerosene filler)'],
      ['Colour', 'one pale grey with black stencils (a colour photograph of the morning); the other green (a drawing)'],
      ['Left', '08:08 Moscow time'],
    ],
    explode: [0, 0, 0],
    order: 0,
    functions: [
      { nodes: ['TankCar_Oxygen'], name: 'Oxygen filler', ends: ['beside the rocket', 'drawn off'], seconds: 120 },
      { nodes: ['TankCar_Kerosene'], name: 'Kerosene filler', ends: ['beside the rocket', 'drawn off'], seconds: 240 },
    ],
    moves: [
      // west along the north track to short of its end (documented that they left, and when; how far and how fast are ours)
      carLeaves(
        'TankCar_Oxygen',
        16.6,
        [
          [-66.3, 0],
          [-196.3, -1.394],
        ],
        T.cars,
        T.platforms,
      ),
      // west along the south track, onto the centre track where it joins it, and out through the fence
      carLeaves(
        'TankCar_Kerosene',
        15.6,
        [
          [-64.8, 0],
          [-160.2, -2.275],
          [-291.0, -13.475],
          [-524.8, -15.452],
        ],
        T.cars,
        T.platforms,
      ),
    ],
  },
  {
    node: 'Erector',
    group: 'Taken away before launch',
    name: 'Erector',
    summary: 'The wagon that stood the rocket up, and then was the way to the spacecraft.',
    detail:
      'A hydraulic rail erector of 87.5 t: the rocket came out along the centre track lying on its boom, tail first, and ' +
      'was stood up into the launch system. A three-stage rocket stood taller than the launch system’s own service trusses ' +
      'reached, so the boom stayed up beside it and carried the platforms round the third stage and the spacecraft, and ' +
      'the lift. Gagarin "went up the fifteen steps of the stair, to the lift’s door", waved from the landing, and rode ' +
      'it to the upper platform with the man who would bolt his hatch. At 08:35 Kamanin told him the erector would be ' +
      'drawn off, and at 08:37 that its boom had come away; from the ground it was seen to ride slowly away along the ' +
      'rails, lean over little by little, lay itself down on its wagon and be drawn off by a locomotive. Those words and ' +
      'times are the record. Its shape is not: no drawing was found, and what is here is drawn from photographs and the ' +
      'film of the morning, with a boom that leans in over the launch system’s support, which is our way of standing it ' +
      'there and may not be how it stood. The film and the photograph of him waving both look at the stair from the ' +
      'south, the boom’s pierced girder at their left and the stair rising to the right, so the stair and the lift are ' +
      'on the wagon’s south side. They show the lift as a tall car of ribbed sheet with two door leaves, standing at ' +
      'its lowest stop in a booth of plate, and a gate of perforated plate at the landing; the car’s doors are built ' +
      'open so that it can be walked into. A colour photograph of the party walking to the stair shows a red domed ' +
      'cover and a horn loudspeaker on a red box on a low dark green rail machine beside them, with men standing at a ' +
      'rail: it is taken for this wagon, and they are built on its deck. The rams, the cradles the rocket lay in and ' +
      'the locomotive are not modelled.',
    facts: [
      ['Kind', 'hydraulic, on rails (8U213, TsKBTM)'],
      ['Mass', '87.5 t'],
      ['To the lift', '15 steps, on the south side (film; a photograph)'],
      ['Upper platform', '26.1 m over the deck (estimated)'],
      ['Lift', '"two or three minutes" to the top'],
      ['Drawn off', '08:35 to 08:37 Moscow time'],
    ],
    actions: [
      {
        // The car rides the leaning boom's north face: `by` is from where it is built, at the stair's landing.
        id: 'lift',
        label: 'Lift',
        on: 'Erector_Lift',
        do: {
          kind: 'lift',
          node: 'Erector_Lift',
          stops: LIFT_STOPS.map(([name, up]) => ({ name, by: [up * Math.tan(BOOM_LEAN * DEG), up, 0] as [number, number, number] })),
          // 23 m in "a minute" by one of Ivanovsky's tellings and "two or three minutes" by another
          speed: 0.3,
        },
      },
    ],
    explode: [0, 0, 0],
    order: 0,
    functions: [
      { nodes: ['Erector_Boom'], name: 'Boom', ends: ['up at the rocket', 'down on the wagon'], seconds: 120 },
      {
        nodes: ['Erector', ...ERECTOR_AXLES.map((n) => `Erector_Wheel_${n}`)],
        name: 'Along the track',
        ends: ['at the rocket', 'drawn off'],
        seconds: 150,
        needs: [{ node: 'Erector_Boom', atLeast: 0.15, why: 'the boom is still against the rocket' }],
      },
    ],
    moves: [
      // the boom comes away (documented, 08:35 to 08:37), then goes down as the wagon rides off (documented that it
      // did; how far it had gone before it lay down is ours), and the wagon is drawn on (documented; how far, ours)
      { kind: 'swing', node: 'Erector_Boom', axis: [0, 0, 1], angle: BOOM_BACK * DEG, from: T.erector, to: T.boomAway },
      { kind: 'swing', node: 'Erector_Boom', axis: [0, 0, 1], angle: (90 + BOOM_LEAN - BOOM_BACK) * DEG, from: T.boomAway, to: T.boomDown },
      { kind: 'slide', by: [-ERECTOR_ROLL[0]!, 0, 0], from: T.boomAway, to: T.boomDown },
      { kind: 'slide', by: [-(ERECTOR_ROLL[1]! - ERECTOR_ROLL[0]!), 0, 0], from: T.boomDown, to: T.cleared },
      ...ERECTOR_AXLES.flatMap((n): Move[] => [
        {
          kind: 'swing',
          node: `Erector_Wheel_${n}`,
          axis: [0, 0, 1],
          angle: ERECTOR_ROLL[0]! / ERECTOR_WHEEL,
          from: T.boomAway,
          to: T.boomDown,
        },
        {
          kind: 'swing',
          node: `Erector_Wheel_${n}`,
          axis: [0, 0, 1],
          angle: (ERECTOR_ROLL[1]! - ERECTOR_ROLL[0]!) / ERECTOR_WHEEL,
          from: T.boomDown,
          to: T.cleared,
        },
      ]),
    ],
    // two of its crew at the wagon's rail (a colour photograph), until thirty minutes' readiness (the roster)
    clocked: [leaves('Erector_Crew', MSK(8, 37))],
  },
  {
    node: 'ServiceTrusses',
    group: 'Taken away before launch',
    name: 'Service trusses',
    summary: 'Two arms that close round the rocket with rings of platforms, and are laid down before it goes.',
    detail:
      'The launch system’s own way to the rocket: two trusses hinged on the turning ring, one to the north and one to ' +
      'the south, each two curved beams that run into one. Raised, their half rings meet round the core above the ' +
      'strap-ons’ tips; from them the rocket was fuelled and checked. At 08:15 Korolev told Gagarin "they are lowering ' +
      'the service platforms; all the work on the trusses is finished" (he felt the rocket sway), and at 08:40 "now we ' +
      'are drawing the trusses off". Lowered, each lies level out over the edge of the platform with its half rings ' +
      'standing up, which is how a photograph shows them as a Vostok’s engines light. Their size is published (21.6 m ' +
      'long, 7.9 m across, 20 m high, 56 t each); their members, the heights of their platforms against this rocket ' +
      'and their ladders are estimated, and of the three platforms each had only two are here. These were the first ' +
      'pair, built for the R-7 in 1957; the pair with lifts inside that stands there now came later.',
    facts: [
      ['Type', '8T119, TsKBTM, 1957'],
      ['Each', '21.6 m long, 7.9 m across, 56 t'],
      ['Standing', '20 m from hinge to head'],
      ['Platforms', 'half rings at 17.65 and 19.8 m (estimated)'],
      ['Lowered', '08:40 Moscow time'],
    ],
    explode: [0, 0, 0],
    order: 0,
    functions: [
      { nodes: ['ServiceTruss_North'], name: 'North truss', ends: ['raised', 'lowered'], seconds: 90 },
      { nodes: ['ServiceTruss_South'], name: 'South truss', ends: ['raised', 'lowered'], seconds: 90 },
    ],
    moves: [
      // lowered about their hinges on the ring (documented that they were, and when they began; how long each took and
      // which went first are ours)
      outward('ServiceTruss_North', TRUSS_NORTH, TRUSS_FALL, T.trusses, seated(0.67)),
      outward('ServiceTruss_South', TRUSS_SOUTH, TRUSS_FALL, seated(0.51), T.cleared),
    ],
  },
  {
    node: 'UpperCableMast',
    group: 'Taken away before launch',
    name: 'Cable mast',
    summary: 'The last thing to let go: the third stage’s cables, away a minute before ignition.',
    detail:
      'Power and commands for the third stage came up this mast from the ring and across its arm to plugs under the ' +
      'fairing’s foot. "The pressurisation is going, the cable mast is away, all is normal," Korolev told Gagarin at ' +
      '09:06; he answered that he had felt it, and heard the valves. Ignition was called at 09:07. The CIA’s ' +
      'interpreters had found it a month before as a shadow on a U-2 photograph, "possibly an umbilical mast", 85 to ' +
      '95 ft above the platform and ending in an oblong loop; the middle of that is modelled. A photograph of a Vostok ' +
      'being raised shows two slender lattice legs with a head. Two photographs of the morning, taken from across the ' +
      'pit, show how far it went: in one the rocket still stands in the closed supports and the mast already leans ' +
      'some 25° out of upright; in the other the rocket has left and the mast leans as it did. So it swung the whole ' +
      'way at 09:06 and did not move again; 31° out of upright is modelled, so that the support under it falls back ' +
      'inside its legs. Which side of the ring it stood on is not recorded: it is put on the east, opposite the ' +
      'erector, where the service trusses do not sweep as they come down, though those photographs have it on what ' +
      'would be the south. The lower cable masts are not built.',
    facts: [
      ['Height', '85 to 95 ft over the deck (90 ft, 27.4 m, modelled)'],
      ['Away', '09:06 Moscow time'],
      ['Then', 'ignition called at 09:07; liftoff 09:06:59.7 by the launch log'],
      ['Swings', '40° from where it stood, to 31° out of upright (estimated: 25° or more in the photographs)'],
    ],
    explode: [0, 0, 0],
    order: 0,
    functions: [{ nodes: ['UpperCableMast'], name: 'Swing clear', ends: ['at the rocket', 'swung clear'], seconds: 10 }],
    // back the whole way at 09:06 (the minute documented; the angle and the ten seconds estimated)
    moves: [outward('UpperCableMast', MAST_AT, MAST_FALL, T.mast, T.mastOff)],
  },
  {
    node: 'Bus',
    group: 'The morning of 12 April',
    name: 'The cosmonauts’ bus',
    summary: 'A cream and blue LAZ-695B brought the pilot, his back-up and eleven others to the foot of the rocket.',
    detail:
      'The film of the morning shows it twice: coming along the concrete road, and from the erector’s head a moment after ' +
      'it has stopped, on the concrete west of the platform, facing the rocket, its right side a metre from the rail of a ' +
      'track with another track beyond. It is a LAZ-695B, known by the wide air scoop at the back of its roof: 9.19 m ' +
      'long, 2.5 m broad, 2.98 m high, cream above with a blue band under the windows and a blue skirt, curtains drawn ' +
      'at its side windows. Thirteen came in it: Gagarin and Titov in their orange suits, two more cosmonauts standing ' +
      'in leather jackets, doctors, cameramen. The cameramen jumped down first; a doctor in a white coat handed the ' +
      'pilot down. Titov stayed aboard in his suit, in case. The cosmonauts and their doctor were to leave at thirty ' +
      'minutes’ readiness for the measuring point, by the launch roster: here the bus backs out at 08:37 and goes. Its ' +
      'type and colours are the film’s and its size the type’s; where it stood along the track is good to some eight ' +
      'metres; its fittings, and that it was the bus that took them off, are estimated. This one was fitted out inside ' +
      'with armchairs and a table, which are not drawn.',
    facts: [
      ['Type', 'LAZ-695B (the film: the roof’s air scoop)'],
      ['Size', '9.19 by 2.50 by 2.98 m, wheelbase 4.19 m (the type’s figures)'],
      ['Colours', 'cream over blue (the film; "white and blue", Golovanov)'],
      ['Came', 'about 06:50 Moscow time (Kamanin’s diary, on the range’s clock)'],
      ['Stood', 'a metre south of the south track, facing the rocket (the film)'],
      ['Left', '08:37, thirty minutes’ readiness (the roster; that it was the bus is estimated)'],
    ],
    explode: [0, 0, 0],
    order: 0,
    clocked: [
      // in along the road and onto the apron; at thirty minutes' readiness, back out into the road round the pit, then away west
      {
        ...drives(
          'Bus_In',
          MSK(6, 49),
          MSK(6, 50),
          [
            [60, 0],
            [120, -0.45],
            [144.4, -0.75],
            [155, -1.75],
            [164, -4.35],
            [171, -7.15],
            [174.61, -8.15],
            [178.61, -8.15],
          ],
          BUS.wheelbase,
          BUS.wheel,
        ),
      },
      drives(
        'Bus_Back',
        MSK(8, 37),
        MSK(8, 37, 45),
        [
          [-10.6, 0],
          [-20.61, 2.3],
          [-28.11, 6.3],
          [-31.81, 12.8],
          [-32.61, 20.8],
          [-32.61, 26.8],
        ],
        BUS.wheelbase,
        BUS.wheel,
        true,
      ),
      drives(
        'Bus_Away',
        MSK(8, 37, 50),
        MSK(8, 40),
        [
          [12, 0],
          [16, -2],
          [18.2, -7],
          [18.7, -16],
          [17.8, -216],
          [17.0, -396],
          [16.8, -428],
        ],
        BUS.wheelbase,
        BUS.wheel,
      ),
    ],
  },
  {
    node: 'Saloon',
    group: 'The morning of 12 April',
    name: 'Saloon car',
    summary: 'A dark saloon stood a few metres off the bus’s door. What it was cannot be made out.',
    detail:
      'In the film’s view from the erector a dark car stands beside the bus, a few metres off its right side, at the ' +
      'corner of a low building. Seen from above it is a three-box saloon; no more can be told. It is taken for a GAZ-21 ' +
      'Volga, the likeliest of the three kinds it could be: a Pobeda is a fastback and a ZIM a metre longer, and Korolev ' +
      'was driven in a Volga. Its size is that type’s; its black, and that it left at the hour’s readiness with most of ' +
      'the pad’s people, are estimated.',
    facts: [
      ['Seen', 'beside the bus, from above (the film, 43:26)'],
      ['Taken for', 'a GAZ-21 Volga: 4.83 by 1.80 by 1.62 m (estimated)'],
      ['Left', '08:05, one hour’s readiness (estimated)'],
    ],
    explode: [0, 0, 0],
    order: 0,
    clocked: [
      drives(
        'Saloon_Car',
        MSK(8, 5),
        MSK(8, 7),
        [
          [0.96, 0.08],
          [2.32, 0.52],
          [3.89, 1.61],
          [5.5, 5.5],
          [3.89, 9.39],
          [-2.98, 14.57],
          [-16.35, 21.0],
          [-25.75, 28.0],
          [-42.94, 45.33],
          [-176.37, 180.6],
          [-317.15, 322.65],
          [-345.3, 351.08],
        ],
        2.7,
        0.357,
      ),
    ],
  },
  {
    node: 'Truck',
    group: 'The morning of 12 April',
    name: 'Box-bodied truck',
    summary: 'A dark truck with a workshop body stood north of the tracks, its tail to the rocket.',
    detail:
      'The same frame of the film has a dark truck with a box body beyond the second track, a metre off its rail, its ' +
      'tail toward the camera with white figures painted on it that cannot be read. It has a bonnet and two axles. The ' +
      'launch roster of 10 April lists a driver for "GAZ-63 No. 34-55-23", and it is built as that: a GAZ-63 carrying a ' +
      'workshop body, in army green, with the roster’s number on its tail. That the roster’s truck is the film’s is not ' +
      'known. It is driven off at the hour’s readiness, west between the tracks and out by the road: estimated.',
    facts: [
      ['Seen', 'north of the tracks, from above (the film, 43:26)'],
      ['Taken for', 'a GAZ-63 with a box body: 5.5 m chassis, 3.3 m wheelbase (estimated)'],
      ['Number', '34-55-23 (the roster’s GAZ-63: that it is this truck is not known)'],
      ['Left', '08:05, one hour’s readiness (estimated)'],
    ],
    explode: [0, 0, 0],
    order: 0,
    clocked: [
      drives(
        'Truck_Lorry',
        MSK(8, 5, 20),
        MSK(8, 8),
        [
          [26.25, 0],
          [56.25, 0.8],
          [74.25, 0.8],
          [84.25, -1.6],
          [92.25, -7.6],
          [99.25, -14.1],
          [111.25, -17.6],
          [136.25, -18.1],
          [356.25, -19.2],
          [456.25, -19.8],
          [484.25, -19.95],
        ],
        3.3,
        0.5,
      ),
    ],
  },
  {
    node: 'StateCommission',
    group: 'The morning of 12 April',
    name: 'The State Commission',
    summary: 'Ten metres from the bus’s door stood the men he had to report to.',
    detail:
      '"Comrade Chairman of the State Commission, pilot-cosmonaut Senior Lieutenant Gagarin is ready for the first flight ' +
      'in the spaceship Vostok." The Commission stood "in a tight group" some ten metres from the bus, Golovanov writes, ' +
      'and the pilot, turning first to the marshal, made his report to its chairman, Konstantin Rudnev. The film, ' +
      'looking down from the erector as the bus stops, has a knot of four there, one in a pale coat. A colour photograph ' +
      'gives two of them: Sergei Korolev, the chief designer, in a dark overcoat and a black velour hat, and Marshal ' +
      'Kirill Moskalenko, commander of the rocket forces, in service dress with gold boards and a red-banded cap. Here ' +
      'six stand: those two, Rudnev, General Nikolai Kamanin, who commanded the cosmonauts, Leonid Voskresensky, ' +
      'Korolev’s deputy for testing, and one more. That those four were of the knot, what Rudnev, Kamanin and ' +
      'Voskresensky wore and how any of them stood are estimated. At about 06:58 Korolev, Moskalenko and Kamanin ' +
      'walked the pilot to the erector.',
    facts: [
      ['Where', 'some 10 m ahead of the bus’s door (Golovanov; the film)'],
      ['Korolev', 'a dark overcoat, a black velour hat (a colour photograph; Golovanov)'],
      ['Moskalenko', 'a marshal’s service dress, a red-banded cap (a colour photograph)'],
      ['The others', 'who stood there, and in what: estimated'],
      ['Until', 'about 06:58, when the pilot was walked to the stair (not timed)'],
    ],
    explode: [0, 0, 0],
    order: 0,
    clocked: [leaves('StateCommission_People', MSK(6, 58))],
  },
  {
    node: 'SendOff',
    group: 'The morning of 12 April',
    name: 'The send-off',
    summary: 'Some twenty-five people stood about the concrete as the bus stopped. No greatcoats: it was a mild morning.',
    detail:
      'The film’s view from the erector, the bus just stopped, has figures all over the concrete in loose groups: a row ' +
      'of five well to the south-west, seven more nearer the bus, three by the car, a man beside the bus, one far out ' +
      'toward the road, one north of the tracks by the truck. At eye height a minute later they are officers in tunics ' +
      'and peaked caps, none in a greatcoat; men of the launch crew in navy hooded anoraks with red armbands; a doctor ' +
      'in a white coat, who handed the pilot down from the bus; civilians in dark coats, felt hats and flat caps; a ' +
      'cameraman walking backward with a camera at his eye. Each stands here where that frame has someone standing, to ' +
      'two or three metres. Who each was is not recorded, and their clothes are shared out among them by us. There ' +
      'were 688 people on the pad that morning by the roster, 381 of them soldiers: these are the ones the camera saw ' +
      'at that moment. They do not walk: the group is here until about 07:08, when the lift had gone up, and then is not.',
    facts: [
      ['Seen', 'about 25 on the concrete as the bus stopped (the film, 43:26)'],
      ['Dress', 'tunics and peaked caps, navy anoraks with red armbands, a white coat, dark coats and hats (the film)'],
      ['On the pad that morning', '688, of them 381 soldiers (the roster)'],
      ['Until', 'about 07:08 (not timed)'],
    ],
    explode: [0, 0, 0],
    order: 0,
    clocked: [leaves('SendOff_People', MSK(7, 8))],
  },
  {
    node: 'StairParty',
    group: 'The morning of 12 April',
    name: 'At the stair’s foot',
    summary: 'A dozen people waved back as he turned on the landing.',
    detail:
      'Korolev, Moskalenko and Kamanin "tore him away" from the crowd and walked him along the erector’s wagon to its ' +
      'stair. He went up the fifteen steps, turned at the lift’s door and raised both arms; the film and a photograph ' +
      'show the backs of those below, arms up, berets and peaked caps among them and one white coat, and two men on ' +
      'the wagon’s deck waving too. Eleven stand here, in the places the photograph has backs, with the three who ' +
      'walked him among them: which back is whose is not recorded. They are here from about 07:01 to 07:08; the minutes ' +
      'are ours.',
    facts: [
      ['Seen', 'about eleven at the stair’s foot, waving (the film, 44:05; a photograph)'],
      ['With him to the stair', 'Korolev, Moskalenko, Kamanin (Mikheev; Chertok)'],
      ['When', 'about 07:01 to 07:08 (not timed)'],
    ],
    explode: [0, 0, 0],
    order: 0,
    clocked: [comes('StairParty_People', MSK(7, 1)), leaves('StairParty_People', MSK(7, 8))],
  },
  {
    node: 'PadCrew',
    group: 'The morning of 12 April',
    name: 'The launch crew',
    summary: 'Most of the pad’s people were sent away an hour before launch.',
    detail:
      'The launch roster, signed two days before, gives every man on the pad a readiness to leave at and a place to go ' +
      'to: most at one hour or at thirty minutes, to a point 20 km off; the fuelling soldiers three hours and twenty ' +
      'minutes before, to barracks; the fire crews at fifteen minutes, to the bunker; two water trucks last, at five ' +
      'minutes, to the gate. Kamanin called one hour’s readiness to the pilot at 08:05. Six men stand for the crews ' +
      'still on the deck until then: two pairs by the launch system, and two at the grey filler, one in its doorway, ' +
      'where a colour photograph of the morning has two men standing. Where the others stood is not recorded.',
    facts: [
      ['Roster', 'who left at 1 h, 30 min, 15 min and 5 min, and for where (10 April 1961)'],
      ['One hour', 'called at 08:05 Moscow time (the transcript)'],
      ['In the filler’s doorway', 'two men (a colour photograph); one here, one below it'],
    ],
    explode: [0, 0, 0],
    order: 0,
    clocked: [leaves('PadCrew_People', MSK(8, 5))],
  },
  {
    node: 'TrussCrew',
    group: 'The morning of 12 April',
    name: 'On the service truss',
    summary: 'The crews of the trusses and the upper belt stayed until half an hour before, then went to the bunker.',
    detail:
      'The roster sends "the upper belt’s and the trusses’ crews" away at thirty minutes’ readiness, to the bunker, ' +
      '200 m north. Three men on the north truss’s platforms stand for them. At 08:15 Korolev told the pilot the work ' +
      'on the trusses was finished, and at 08:40 that they were being drawn off; these are gone at 08:37. Where they ' +
      'stood on the trusses is estimated.',
    facts: [
      ['Left', 'thirty minutes’ readiness, for the bunker (the roster)'],
      ['Here', 'three, on the north truss (estimated)'],
    ],
    explode: [0, 0, 0],
    order: 0,
    clocked: [leaves('TrussCrew_People', MSK(8, 37))],
  },
  {
    node: 'HatchCrew',
    group: 'The morning of 12 April',
    name: 'At the hatch',
    summary: 'The spacecraft’s lead designer saw him into the seat and bolted the hatch, twice.',
    detail:
      'Oleg Ivanovsky rode up in the lift with the pilot, helped him into the seat, and with the fitters bolted hatch ' +
      'No. 1 down. At 07:58 the bunker reported that one of the hatch’s contacts did not show closed: ' +
      'they took it off again, set the contact right and bolted it down a second time. The seal was ' +
      'checked and held at 08:25, and they took the lift down. Two men stand at the hatch until then, with the film ' +
      'cameraman’s lamps left out; which of them is Ivanovsky is ours to say.',
    facts: [
      ['Who', 'Ivanovsky and the fitters (his own account)'],
      ['Hatch closed', '07:44; reopened and closed again from 07:58 (the transcript)'],
      ['Left', 'after 08:25, by the lift'],
    ],
    explode: [0, 0, 0],
    order: 0,
    clocked: [leaves('HatchCrew_People', MSK(8, 28))],
  },
];

const pad: ModelDef = {
  id: 'pad',
  name: 'Launch pad',
  url: 'models/ussr/vostok/vostok-1/pad.glb',
  scale: 'Site 1 · platform 41.15 m square over a pit 43 m deep · to scale',
  backdrop: 'tyuratam',
  slider: ['The bus arrives · 06:49', 'Liftoff · 09:07'],
  sequence: MORNING,
  specGroups: ['Launch pad'],
  parts: padParts,
  // (the whole of it is the pit too, 270 m long: the launch system is what is come to see)
  home: 'tulip',
  views: [
    { id: 'tulip', label: 'Launch system', nodes: ['LaunchRing'] },
    { id: 'support', label: 'Support truss', nodes: ['Support_1'] },
    // (the erector and the hatch level from the south-west: its stair and lift are on its south side)
    { id: 'erector', label: 'Erector', nodes: ['Erector'], from: [-0.45, 0.12, 0.88] },
    { id: 'cars', label: 'Railway fillers', nodes: ['TankCars'], from: [-0.3, 0.25, -0.92] },
    { id: 'hatch', label: 'Hatch level', centreY: 26.6, span: 10, from: [-0.6, 0.18, 0.78] },
    { id: 'trusses', label: 'Service trusses', nodes: ['ServiceTrusses'], from: [0.75, 0.2, 0.63] },
    { id: 'masts', label: 'Corner mast', nodes: ['Masts'], from: [0.35, 0.12, 0.93] },
    { id: 'deflector', label: 'Flame deflector', nodes: ['FlameDeflector'], from: [0.97, -0.1, 0.2] },
    { id: 'pit', label: 'Flame pit', nodes: ['FlamePit'], from: [-0.5, 0.55, 0.67] },
    // the morning's people and the bus, from the south-west as the film's cameraman on the ground had them
    { id: 'send-off', label: 'The send-off', nodes: ['StateCommission', 'SendOff'], from: [-0.35, 0.16, 0.92] },
    { id: 'bus', label: 'The bus', nodes: ['Bus'], from: [0.55, 0.14, 0.82] },
  ],
};

export const flight: Flight = {
  id: 'ussr/vostok/vostok-1',
  nation: 'USSR',
  agency: 'OKB-1',
  program: 'Vostok',
  designation: 'Vostok 1',
  callsign: 'Kedr (Кедр)',
  spacecraft: 'Vostok 3KA No. 3',
  launchVehicle: 'Vostok-K 8K72K, No. E103-16',
  // 09:06:59.7 Moscow time (Siddiqi, Challenge to Apollo, launch log; OKB-1's report gives 09:06:59)
  launch: '1961-04-12T06:06:59.7Z',
  launchSite: SITE1.name,
  site: SITE1,
  weather: WEATHER,
  crew: ['Yuri A. Gagarin'],
  summary:
    'The first human spaceflight. One orbit of the Earth in 106 minutes from Tyuratam, flown automatically, ' +
    'ending with the pilot ejecting from his capsule and landing by parachute near the Volga.',
  facts: [
    { label: 'Liftoff', value: '12 April 1961, 06:06:59.7 UTC' },
    { label: 'Pilot', value: 'Yuri A. Gagarin' },
    { label: 'Duration', value: '106 min (long given as 108)' },
    { label: 'Orbit', value: '181 × 327 km, 64°57′' },
    { label: 'Period', value: '89.44 min' },
    { label: 'Mass in orbit', value: '4,725 kg' },
    { label: 'Landing', value: '51°16′N 45°59′E, near Smelovka' },
  ],
  // Moscow times from OKB-1's report of 3 May 1961 and Gagarin's own of 13 April; ascent seconds from Siddiqi (docs/sources.md)
  timeline: [
    { t: 0, event: 'Liftoff, 09:06:59.7 Moscow time' },
    { t: 119, event: 'The four strap-on boosters separate' },
    { t: 150, event: 'Fairing jettisoned in two halves (Gagarin: "at second 150"; other accounts 154 to 156)' },
    { t: 300, event: 'The third stage lights through the lattice; core stage cutoff' },
    { t: 676, event: 'Third stage cutoff: in orbit, 181 × 327 km' },
    { t: MSK(9, 18, 28), event: 'Spacecraft separates from the third stage' },
    { t: MSK(10, 25, 4.2), event: 'Braking engine on' },
    { t: MSK(10, 25, 48.2), event: 'Braking engine off, by its timer; the modules do not separate' },
    { t: MSK(10, 35, 30), event: 'Modules separate, ten minutes late (10:35 by Gagarin, 10:36 in the report)' },
    { t: MSK(10, 42, 0), event: 'Hatch No. 1 away at about 7 km; the seat follows' },
    { t: MSK(10, 48, 0), event: 'Descent module lands' },
    { t: MSK(10, 53, 0), event: 'Gagarin lands, 51°16′N 45°59′E' },
  ],
  specs: [
    {
      group: 'Spacecraft',
      label: 'Length, without antennas',
      value: 4.4,
      unit: 'm',
      confidence: 'documented',
      note: '4.4 m (Siddiqi, Challenge to Apollo, p. 195; the Soviet encyclopedia text: «длина (без антенн) 4,4 м»)',
    },
    {
      group: 'Spacecraft',
      label: 'Greatest diameter',
      value: 2.43,
      unit: 'm',
      confidence: 'documented',
      note: '2.43 m, the instrument module where its two cones meet (Siddiqi p. 195)',
    },
    {
      group: 'Spacecraft',
      label: 'Descent module diameter',
      value: 2.3,
      unit: 'm',
      confidence: 'documented',
      note: '2.3 m over the heat shield; the pressure hull is 2.2 m (Siddiqi p. 195; the encyclopedia text)',
    },
    {
      group: 'Spacecraft',
      label: 'Instrument module length',
      value: 2.25,
      unit: 'm',
      confidence: 'documented',
      note: '2.25 m (the encyclopedia text; Siddiqi). The model’s hull is 2.24 m from the nozzle to its forward rim',
    },
    {
      group: 'Spacecraft',
      label: 'Hatch clear diameter',
      value: 1.0,
      unit: 'm',
      confidence: 'documented',
      note: 'three hatches of 1 m (Siddiqi p. 195; «три люка диаметром "в свету" 1 м»)',
    },
    {
      group: 'Spacecraft',
      label: 'Seat rails above the cross plane',
      value: 24,
      unit: 'deg',
      confidence: 'estimated',
      note: 'read off the NASA and RKK Energia cutaway drawings: the seat’s back lies some 65° from the long axis',
    },
    {
      group: 'Spacecraft',
      label: 'Gas bottle diameter',
      value: 0.34,
      unit: 'm',
      confidence: 'estimated',
      note: 'off the RKK Energia drawing and photographs of the Kaluga article',
    },
    {
      group: 'Spacecraft',
      label: 'Mass in orbit',
      value: 4725,
      unit: 'kg',
      confidence: 'documented',
      note: '4,725 kg for this flight (Encyclopedia Astronautica; the type is given as 4.73 t by Siddiqi). Its primary origin has not been read',
    },
    {
      group: 'Spacecraft',
      label: 'Descent module mass',
      value: 2460,
      unit: 'kg',
      confidence: 'documented',
      note: '2.46 t for the type (Siddiqi p. 195). No. 3’s own figure has not been found',
    },
    {
      group: 'Spacecraft',
      label: 'Instrument module mass',
      value: 2270,
      unit: 'kg',
      confidence: 'documented',
      note: '2.27 t for the type (Siddiqi p. 195)',
    },
    {
      group: 'Spacecraft',
      label: 'Perigee',
      value: 181,
      unit: 'km',
      confidence: 'documented',
      note: 'OKB-1 report of 3 May 1961. TASS announced 175 km on the day',
    },
    {
      group: 'Spacecraft',
      label: 'Apogee',
      value: 327,
      unit: 'km',
      confidence: 'documented',
      note: 'OKB-1 report of 3 May 1961; 230 km was planned. TASS announced 302 km on the day',
    },
    {
      group: 'Spacecraft',
      label: 'Inclination',
      value: 64.95,
      unit: 'deg',
      confidence: 'documented',
      note: '64°57′ (OKB-1 report of 3 May 1961)',
    },
    {
      group: 'Spacecraft',
      label: 'Period',
      value: 89.44,
      unit: 'min',
      confidence: 'documented',
      note: '89.44 min (OKB-1 report of 3 May 1961). 89.34 is often printed; TASS announced 89.1',
    },
    {
      group: 'Spacecraft',
      label: 'Pilot height',
      value: 1.65,
      unit: 'm',
      confidence: 'documented',
      note: '165 cm in his service record of 1960, published by the Russian Ministry of Defence (Komsomolskaya Pravda, 12 April 2024). 157 cm is often printed, without a document behind it',
    },
    {
      group: 'Launch vehicle',
      label: 'Length on the pad',
      value: 38.36,
      unit: 'm',
      confidence: 'documented',
      note: '38.36 m with the fairing (Minakov, «Ракета, поднявшая в космос Ю. Гагарина», Modelist-Konstruktor, table; Siddiqi, Challenge to Apollo, table of launch vehicles). RussianSpaceWeb also quotes 41 m',
    },
    {
      group: 'Launch vehicle',
      label: 'Width over the air rudders',
      value: 10.3,
      unit: 'm',
      confidence: 'documented',
      note: '10.3 m (Minakov, «Ракета, поднявшая в космос Ю. Гагарина», Modelist-Konstruktor; Siddiqi)',
    },
    {
      group: 'Launch vehicle',
      label: 'Liftoff mass',
      value: 287000,
      unit: 'kg',
      confidence: 'documented',
      note: '287 t, of this flight (RKK Energia 1946–1996; Minakov; Siddiqi). Other figures in print: 281.4 t, 290.5 t, 291.15 t',
    },
    {
      group: 'Launch vehicle',
      label: 'Core with the lattice',
      value: 28.75,
      unit: 'm',
      confidence: 'documented',
      note: '28.75 m (Minakov, «Ракета, поднявшая в космос Ю. Гагарина», Modelist-Konstruktor: «Длина 2-й ступени с переходной фермой»), taken from the nozzles’ exits; the lattice is 1.26 m of it',
    },
    {
      group: 'Launch vehicle',
      label: 'Core, greatest diameter',
      value: 2.95,
      unit: 'm',
      confidence: 'documented',
      note: '2.95 m (Minakov; RussianSpaceWeb). It is 2.05 m at the foot (Brügge’s tables) and 2.58 m at the top (estimated)',
    },
    {
      group: 'Launch vehicle',
      label: 'Where the core is widest',
      value: 19.76,
      unit: 'm',
      confidence: 'derived',
      note: 'above the nozzles’ exits: where a strap-on 19.2 m long, leaning from 2.78 m out at its foot to 1.52 m at its tip, puts its tip. Both distances are estimates, so this is no better',
    },
    {
      group: 'Launch vehicle',
      label: 'Strap-on length',
      value: 19.2,
      unit: 'm',
      confidence: 'documented',
      note: '19.2 m without the nozzles (Minakov, «Ракета, поднявшая в космос Ю. Гагарина», Modelist-Konstruktor); 19.8 m with them (RussianSpaceWeb; Brügge)',
    },
    {
      group: 'Launch vehicle',
      label: 'Strap-on diameter',
      value: 2.68,
      unit: 'm',
      confidence: 'documented',
      note: '2.68 m at its foot (Minakov; RussianSpaceWeb)',
    },
    {
      group: 'Launch vehicle',
      label: 'Strap-on cylinder',
      value: 5.6,
      unit: 'm',
      confidence: 'estimated',
      note: 'between the Kaluga vehicle seen side on (about 38% of the block) and NASA’s outline (17%), chosen so the block holds its 39 t of propellant',
    },
    {
      group: 'Launch vehicle',
      label: 'Third stage with its adapter',
      value: 2.98,
      unit: 'm',
      confidence: 'documented',
      note: '2.98 m long, 2.58 m across (Minakov, «Ракета, поднявшая в космос Ю. Гагарина», Modelist-Konstruktor). Brügge has 2.86 m by 2.47; Encyclopedia Astronautica 2.84 by 2.56',
    },
    {
      group: 'Launch vehicle',
      label: 'Fairing',
      value: 6.63,
      unit: 'm',
      confidence: 'documented',
      note: '6.6 m long and 2.7 m across (Minakov); 6.63 is his 9.61 m for stage and fairing less 2.98. Brügge has 6.74 m by 2.58. Its shape is estimated',
    },
    {
      group: 'Launch vehicle',
      label: 'Main nozzle exit',
      value: 0.72,
      unit: 'm',
      confidence: 'estimated',
      note: 'scaled off a photograph of the VDNKh vehicle from below (about 0.74 m); no published figure was read',
    },
    {
      group: 'Launch vehicle',
      label: 'Third stage engine, nozzle exit',
      value: 0.733,
      unit: 'm',
      confidence: 'derived',
      note: 'KBKhA gives the RD-0109 as 1,555 mm long and 733 mm across; nothing on a one-chamber engine is wider than its nozzle’s exit, so that is taken as the exit’s diameter. The published area ratio of 79.4 (Encyclopedia Astronautica) then gives a throat 82 mm across, which is what 54.5 kN at 5 MPa needs',
    },
    {
      group: 'Launch vehicle',
      label: 'Strap-on at liftoff',
      value: 43300,
      unit: 'kg',
      confidence: 'documented',
      note: '43.3 t each, 3.71 t empty (Encyclopedia Astronautica); Minakov has 3.75 t empty. (Brügge’s 39.16 t of propellant is Soyuz-ST’s oxygen and kerosene, from Arianespace’s manual: not this vehicle’s)',
    },
    {
      group: 'Launch vehicle',
      label: 'Core at liftoff',
      value: 100400,
      unit: 'kg',
      confidence: 'documented',
      note: '100.4 t, 6.8 t empty (Encyclopedia Astronautica); Minakov 102 t and 7 to 8 t. (Brügge’s 99.76 t with 90.1 t of propellant are Soyuz-ST’s, from Arianespace’s manual: not this vehicle’s)',
    },
    {
      group: 'Launch vehicle',
      label: 'Third stage, fuelled',
      value: 7984,
      unit: 'kg',
      confidence: 'documented',
      note: '7,984 kg, 1,472 kg burnt out (Minakov, of the 8K72’s stage); Encyclopedia Astronautica has 7,775 and 1,440 kg',
    },
    {
      group: 'Launch vehicle',
      label: 'Launch azimuth',
      value: 37.5,
      unit: 'deg',
      confidence: 'derived',
      note: 'east of north, for an orbit inclined 64.95° from latitude 45.92°, before the Earth’s turning is allowed for. The azimuth as flown was not found',
    },
    {
      group: 'Launch pad',
      label: 'Platform',
      value: 41.15,
      unit: 'm',
      confidence: 'documented',
      note: '135 ft square, measured off U-2 photographs (CIA PIC/JR-2/60); "40 by 40 m" (RussianSpaceWeb). No drawing has been published: sites/site-1.md',
    },
    {
      group: 'Launch pad',
      label: 'Opening in the platform',
      value: 19.81,
      unit: 'm',
      confidence: 'documented',
      note: 'a dark circle 65 ft across (CIA PIC/JR-2/60); the launch system’s ring is 19.35 m over its corners (a Soviet description of the later system)',
    },
    {
      group: 'Launch pad',
      label: 'Flame pit depth',
      value: 43,
      unit: 'm',
      confidence: 'derived',
      note: 'under the deck: 80 ft and 60 ft, two CIA figures (PIC/JR-2/60), summed. Russian print gives 45 m and "almost 50"; the CIA’s own figure is redacted',
    },
    {
      group: 'Launch pad',
      label: 'Steppe north of the tracks, below the deck',
      value: 8,
      unit: 'm',
      confidence: 'derived',
      note: 'the pad stands on the brow of a scarp: SRTM (2000, a 30 m grid) reads 113 to 114 m along the tracks and 104 to 107 m from 65 m north of them, where the command bunker stands; the CIA has the track on "a man-made embankment", its height redacted. Good to some 2 m: sites/site-1.md, "The lie of the land"',
    },
    {
      group: 'Launch pad',
      label: 'Nozzles below the deck',
      value: 6.75,
      unit: 'm',
      confidence: 'derived',
      note: 'level with the foot of the launch system’s turning part, 6,750 mm below the zero mark (the later system’s description); "about 7 m below" in print',
    },
    {
      group: 'Pressure suit',
      label: 'Pilot height',
      value: 1.65,
      unit: 'm',
      confidence: 'documented',
      note: '165 cm in his service record of 1960, published by the Russian Ministry of Defence in 2024. 157 cm is often printed, without a document behind it',
    },
    {
      group: 'Pressure suit',
      label: 'Pilot mass',
      value: 68,
      unit: 'kg',
      confidence: 'documented',
      note: 'the same service record',
    },
    {
      group: 'Pressure suit',
      label: 'Suit mass',
      value: 20,
      unit: 'kg',
      confidence: 'documented',
      note: '20 kg (K. Thomas, NASA JSC, 2016, after Abramov and Skoog); 23 kg is also printed, perhaps with helmet, gloves and boots',
    },
    {
      group: 'Pressure suit',
      label: 'Operating pressure',
      value: 28.5,
      unit: 'kPa',
      confidence: 'documented',
      note: '270 to 300 hPa, held only if the cabin loses pressure (the same synopsis); the middle is shown',
    },
    {
      group: 'Pressure suit',
      label: 'Standing height, helmet and boots',
      value: 1.725,
      unit: 'm',
      confidence: 'estimated',
      note: 'his height, a 2.6 cm heel, 3.7 cm of helmet over the crown and 1.2 cm of raised visor over that; all but the first are read off photographs',
    },
  ],
  motors: [
    {
      name: 'RD-107 (8D74), one in each strap-on',
      count: 4,
      thrustN: 815900,
      burnS: 119,
      propellant: 'kerosene T-1 / liquid oxygen',
      kind: 'liquid',
      confidence: 'documented',
      note: '815.9 kN at the ground, 997.7 kN in vacuum; 256 and 313 s; chamber pressure 5.85 MPa (NPO Energomash’s table by vehicle (row 8K72K), as reproduced by Brügge). Four fixed chambers and two steering chambers on one turbopump; the figures include the steering chambers. Minakov’s table has 82 tf (804 kN). Flown: separated at 119 s (Siddiqi)',
    },
    {
      name: 'RD-108 (8D75), core',
      count: 1,
      thrustN: 744300,
      burnS: 300,
      propellant: 'kerosene T-1 / liquid oxygen',
      kind: 'liquid',
      confidence: 'documented',
      note: '744.3 kN at the ground, 945.4 kN in vacuum; 248 and 315 s; 5.10 MPa (NPO Energomash’s table by vehicle (row 8K72K), as reproduced by Brügge). Four fixed chambers and four steering chambers of 2.5 tf each (RKK Energia 1946–1996). Flown: cutoff at 300 s (Siddiqi; RussianSpaceWeb 299 s)',
    },
    {
      name: 'RD-0109 (8D719), third stage',
      count: 1,
      thrustN: 54500,
      burnS: 376,
      propellant: 'kerosene / liquid oxygen',
      kind: 'liquid',
      confidence: 'documented',
      note: '54.5 kN in vacuum, 323.5 s (Brügge; Encyclopedia Astronautica 54.52 kN, 324 s). One fixed chamber; steered by turbine exhaust through small nozzles. The burn is as flown, about 300 to 676 s (Siddiqi): rated burns in print run from 365 to 440 s',
    },
    {
      name: 'TDU-1 (Isaev S5.4) braking engine',
      count: 1,
      thrustN: 1614 * KGF,
      burnS: 45,
      propellant: 'amine fuel (TG-02) / nitric acid (AK-20F)',
      kind: 'liquid',
      confidence: 'documented',
      note: '1.614 tf, 45 s at most (Siddiqi p. 197); 280 kg of propellant. Flown: on at 10:25:04.2, off by the timer at 10:25:48.2 (OKB-1 report)',
    },
    {
      name: 'Attitude jet',
      count: 16,
      thrustN: 1.5 * KGF,
      propellant: 'compressed nitrogen',
      confidence: 'documented',
      note: 'two independent sets of eight, 1.5 kgf each (Siddiqi p. 197; the encyclopedia text gives 14.7 N)',
    },
  ],
  // the flight as an orbit: stages, events, the orbit, the braking burn and the entry, each with its source (orbital.ts; mission.md)
  orbital,
  flownNote:
    'The ascent as simulated falls 157 m/s short of the orbit Vostok 1 reached, because two stages of engine thrust the record documents only in kind, the strap-ons’ last seconds and the core’s last ten on its steering chambers, are flown at estimated levels, and each is worth more than the whole miss. ' +
    'So from the spacecraft’s separation the run shown here, in the view and on the flight deck, is the published orbit begun where the simulated ascent left it: a handover, not a result.',
  // the flight in the scene: the stack off the pad as staged.ts flies it, and what leaves it, each flown on (orbital.ts,
  // `ascent.sheds`) or, for the hatch and the seat, let go unseen: what comes down with the pilot is not flown as a body
  flies: {
    model: 'vehicle',
    datum: BASE,
    // Every engine's fire from its own nozzles. The four strap-ons' RD-107s and the core's RD-108 burn from the pad, each
    // node the engine's bells, whose chambers (four main and two or four steering) the viewer finds in the model's own
    // geometry (viewer/fires.ts): each fire is sized from its nozzles' exits and burns at its stage's throttle. Then Block
    // E's from its nozzle (733 mm across: KBKhA; that it is the exit's is derived), and the braking engine's (280 mm:
    // estimated, vostok_3ka.py)
    fires: [
      ...BOOSTERS.map(([letter]) => ({ node: `RD107_${letter}_Bells`, on: 'stage:0' })),
      { node: 'RD108_Bells', on: 'stage:1' },
      { node: 'BlockE_Engine', radius: 0.3665, on: 'stage:2' },
      { node: 'RetroEngine_Nozzle', radius: 0.14, on: 'retro' },
    ],
    drops: [
      { at: 119.5, nodes: BOOSTERS.map(([letter]) => `Booster_${letter}`), on: 'boosters' },
      { at: 154.6, nodes: ['Fairing'], on: 'fairing' },
      { at: orbital.stages[1]!.separation!.value, nodes: ['CoreStage', 'CoreEngine', 'Interstage'], on: 'core' },
      { at: orbital.events.find((e) => e.id === 'separation')!.at.value, nodes: ['BlockE'], on: 'separation' },
      {
        at: orbital.entry.separation.value,
        nodes: ['InstrumentModule', 'RetroEngine', 'Antennas', 'GasBottles', 'RetainingStraps', 'CableMast'],
        on: 'modules',
      },
      // what leaves at the ejection height comes down on the descent's own bodies (orbital.ts `descent`, flown by flyDown)
      { at: EJECTION, nodes: ['EntryHatch'], on: 'ejection', rides: [{ body: 'hatch' }] },
      { at: EJECTION, nodes: ['ParachuteHatch'], on: 'ejection', rides: [{ body: 'cover' }] },
      // the seat with him in it to 4 km, then the seat alone under its stabilising parachute: he has left it
      { at: EJECTION, nodes: ['EjectionSeat'], on: 'ejection', rides: [{ body: 'pilot' }, { body: 'seat', hide: ['Pilot'] }] },
    ],
    // and from 4 km Gagarin himself, the figure in his suit, hanging in his harness under his own canopy
    hangs: [{ model: 'crew', body: 'pilot', from: 'main canopy' }],
    chutes: CHUTES,
    // the shock layer stands off the ball's face: its brightness is the heat flux worked on its 1.15 m radius (orbital.ts `heating`)
    air: { shield: 'DescentModule' },
  },
  models: [vehicle, pad, crew],
  // the place round the pad as it stood that April: the bunker, the buildings, the rim's positions, the fence (sites/site1/model/1961-04.py)
  surroundings: 'models/ussr/vostok/sites/site1/1961-04.glb',
};

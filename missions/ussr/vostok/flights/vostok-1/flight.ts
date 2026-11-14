import type { Flight, Keyframe, ModelDef, Move, Part } from '../../../../../src/types';
import { SITE1 } from '../../sites/site-1.ts';
import { orbital } from './orbital.ts';
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

const parts: Part[] = [
  {
    node: 'DescentModule',
    group: 'Spacecraft',
    name: 'Descent module',
    summary: 'A ball 2.3 m across: the only part that came back.',
    detail:
      'A sphere needs no steering to survive entry. Whichever way it meets the air, the flow round it is the same, so the ' +
      'whole of it is covered in heat shield and its weight is put low and behind the pilot: it turns itself heavy side first ' +
      'and stays there, with no thrusters at all. The price is a steep ballistic fall, more than ten g by Gagarin’s account, and a landing too hard ' +
      'to sit through, which is why the pilot left before it reached the ground. In orbit the shield is under a blanket of ' +
      'insulation faced with foil, as modelled; the charred brown ball in the museum is what the air left of it.',
    facts: [
      ['Diameter', '2.3 m over the heat shield; pressure hull 2.2 m'],
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
      'water, with ten days of food and water in case the braking engine failed and the orbit had to decay by itself. On the ' +
      'board over his knees a small globe, the Globus, turned to show the point on the Earth below him. Beyond his feet ' +
      'the Vzor, an optical sight on a porthole, by which the ship could be levelled against the horizon and pointed ' +
      'along its track by eye. The flight was automatic. To fly it by hand he would ' +
      'first have had to key 1-2-5 into a lock, the number sealed in an envelope on board.',
    facts: [
      ['Atmosphere', 'air, 755 to 775 mm Hg'],
      ['Regeneration', 'alkali metal superoxide'],
      ['Supplies', '10 days'],
      ['Vzor field of view', '7°'],
      ['Manual control code', '1-2-5'],
    ],
    explode: [0, LIFT, 0],
    order: SHIP + 1,
  },
  {
    node: 'EjectionSeat',
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
  // the cabin's lamp, over the instrument board
  lights: [{ position: [0.14, 3.6, 0.14], colour: 0xffe4c0, intensity: 0.2, reach: 1.7 }],
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

// The cosmonaut on the platform's deck, on the hatch side, between where the bus stopped on the tracks and the launch
// system, facing the rocket. Where he stood is not recorded to the metre: this place is ours (estimated).
const COSMONAUT_AT: [number, number, number] = [-14, 0, 4];
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

/** Seconds from liftoff (09:06:59.7) of a time on Moscow's clocks that morning. */
const MSK = (h: number, m: number, s = 0) => (h - 9) * 3600 + (m - 6) * 60 + (s - 59.7);

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
 * stand open, 14 to 21 degrees out of upright; the times are estimated, inside what that photograph allows (open by
 * about three seconds) and what the rocket needs (the pose check, site-1.md: the strap-ons clear the heads).
 */
const SUPPORT_AT = [45, 135, 225, 315].map((az) => TURN / DEG + az);
const SUPPORT_FALL = 45;
const SUPPORTS_GO: [from: number, to: number] = [0.1, 2.6];
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
 * The pad's slider is the morning of 12 April 1961, from the pilot in his seat to the rocket leaving. These are the
 * positions on it (0 to 1) at which things happen; the motions below are timed against them. The times are the
 * transcript's, to the minute; how long each motion took is nowhere recorded, and how much of the slider it has is ours.
 */
const T = {
  platforms: 0.04, // 08:15: "they are lowering the service platforms"
  erector: 0.1, // 08:35: "now they will draw the erector off"
  boomAway: 0.3, // 08:37: "the erector's boom has come away normally"
  trusses: 0.45, // 08:40: "now we are drawing the trusses off"
  boomDown: 0.55, // the boom is down on the wagon (not recorded)
  cleared: 0.75, // the erector is off the pad and both trusses are down (not recorded)
  mast: 0.8, // 09:06: "the cable mast is away"
  mastOff: 0.86, // it has swung back (not recorded: ten seconds are given it)
  liftoff: 0.9, // 09:06:59.7
};
const TRANSCRIPT =
  'the record of the exchanges between the cosmonaut and the control points, sent to the Central Committee on 25 April 1961 (Izvestiya TsK KPSS, 1991 No. 5)';
const NOT_TIMED = 'not recorded: placed by us';
const MORNING: Keyframe[] = [
  {
    at: MSK(7, 10),
    slider: 0,
    event: 'The pilot is in his seat: the first call on the radio',
    confidence: 'documented',
    source: `${TRANSCRIPT}: it begins at 07:10`,
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
    name: 'Corner masts',
    summary: 'Two masts 110 ft tall at opposite corners, which the CIA measured and could not explain.',
    detail:
      'One stands at the platform’s north-east corner, on a lip of concrete built out over the pit to carry it, the other ' +
      'at the south-west, on the abutment: the same distance from the rocket, on one line through it. The CIA’s ' +
      'interpreters measured them at 110 ft in 1957, with an array at the top at least 5 ft wide and 10 ft high, and took ' +
      'them for collimation towers; by March 1961 they had talked themselves out of that and out of floodlights too, and ' +
      'wrote that their function could not be determined. A photograph of the launch has one beside the rocket: a ' +
      'slender lattice with a head near its top and a rod above it. They are drawn that way, the head as a bank of ' +
      'floodlights under a lightning rod. The height, the array’s size and where they stand are the CIA’s; the lattice, ' +
      'the lamps, the rod and the ladder are estimated.',
    facts: [
      ['Height', '110 ft (33.5 m)'],
      ['Array', 'at least 5 ft wide and 10 ft high'],
      ['Where', 'north-east and south-west corners, 29.4 m from the axis (scaled off the CIA’s plan)'],
      ['What for', 'not established; drawn as floodlights (estimated)'],
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
      'stand open, 14 to 21° out of upright, which is 45° from where they held the rocket. How long they took is not ' +
      'recorded: here they begin a tenth of a second after the rocket moves and are back in two and a half, in time ' +
      'for the strap-ons, which widen downward, to pass the heads. The guides at the tail stand as they stood: what ' +
      'they did is not in anything read. The ring and its heights are from a Soviet description of the later system ' +
      'for Soyuz; the trusses’ members, platforms and counterweights are drawn from the film of the morning and are ' +
      'estimated.',
    facts: [
      ['Ring', '14.92 m inside, 19.35 m over its corners'],
      ['Turning part', '20.35 m above the deck, 6.75 m below'],
      ['Supports', '4, at the strap-ons’ tips, 13 m above the deck'],
      ['Turned to', '37.5° east of north (derived)'],
      ['Let go', 'at liftoff, 09:06:59.7 Moscow time'],
      ['Fall back', '45° (off a photograph of the launch), in about 2.5 s (estimated)'],
    ],
    explode: [0, 0, 0],
    order: 0,
    // each about its hinge on the ring, its head going outward (documented that they do; the angle read off a photograph
    // of the launch; the times estimated)
    clocked: SUPPORT_AT.map((az, i) => outward(`Support_${i + 1}`, az, SUPPORT_FALL, ...SUPPORTS_GO)),
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
      'times are the record. Its shape is not: no drawing was found, and what is here is drawn from two photographs, with ' +
      'a boom that leans in over the launch system’s support, which is our way of standing it there and may not be how ' +
      'it stood. The rams, the cradles the rocket lay in and the locomotive are not modelled.',
    facts: [
      ['Kind', 'hydraulic, on rails (8U213, TsKBTM)'],
      ['Mass', '87.5 t'],
      ['To the lift', '15 steps'],
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
      outward('ServiceTruss_North', TRUSS_NORTH, TRUSS_FALL, T.trusses, T.cleared - 0.08),
      outward('ServiceTruss_South', TRUSS_SOUTH, TRUSS_FALL, T.trusses + 0.06, T.cleared),
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
];

const pad: ModelDef = {
  id: 'pad',
  name: 'Launch pad',
  url: 'models/ussr/vostok/vostok-1/pad.glb',
  scale: 'Site 1 · platform 41.15 m square over a pit 43 m deep · to scale',
  backdrop: 'tyuratam',
  slider: ['Pilot aboard · 07:10', 'Liftoff · 09:07'],
  sequence: MORNING,
  specGroups: ['Launch pad'],
  parts: padParts,
  // (the whole of it is the pit too, 270 m long: the launch system is what is come to see)
  home: 'tulip',
  views: [
    { id: 'tulip', label: 'Launch system', nodes: ['LaunchRing'] },
    { id: 'support', label: 'Support truss', nodes: ['Support_1'] },
    { id: 'erector', label: 'Erector', nodes: ['Erector'], from: [-0.45, 0.12, -0.88] },
    { id: 'hatch', label: 'Hatch level', centreY: 26.6, span: 10, from: [-0.6, 0.18, -0.78] },
    { id: 'trusses', label: 'Service trusses', nodes: ['ServiceTrusses'], from: [0.75, 0.2, 0.63] },
    { id: 'masts', label: 'Corner masts', nodes: ['Masts'], from: [-0.75, 0.12, 0.65] },
    { id: 'deflector', label: 'Flame deflector', nodes: ['FlameDeflector'], from: [0.97, -0.1, 0.2] },
    { id: 'pit', label: 'Flame pit', nodes: ['FlamePit'], from: [-0.5, 0.55, 0.67] },
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
      label: 'Strap-on at liftoff',
      value: 43300,
      unit: 'kg',
      confidence: 'documented',
      note: '43.3 t each, 3.71 t empty (Encyclopedia Astronautica); Minakov has 3.75 t empty; Brügge 39.16 t of propellant',
    },
    {
      group: 'Launch vehicle',
      label: 'Core at liftoff',
      value: 100400,
      unit: 'kg',
      confidence: 'documented',
      note: '100.4 t, 6.8 t empty (Encyclopedia Astronautica); Brügge 99.76 t with 90.1 t of propellant; Minakov 102 t and 7 to 8 t',
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
  models: [vehicle, pad, crew],
  // the place round the pad as it stood that April: the bunker, the buildings, the rim's positions, the fence (sites/site1/model/1961-04.py)
  surroundings: 'models/ussr/vostok/sites/site1/1961-04.glb',
};

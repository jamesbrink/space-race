import type { Flight, ModelDef, Move, Part } from '../../../../../src/types';
import { SITE1 } from '../../sites/site-1.ts';

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
  // Site 1 is not built: the vehicle is shown by itself in the gallery, standing on its nozzles on the floor. On the
  // pad it hung in the launch system's four arms, its tail below the pad's level
  backdrop: 'studio',
  slider: ['On the pad', 'Taken apart'],
  cutaway: true,
  specGroups: ['Launch vehicle', 'Spacecraft'],
  parts: [...launcherParts, ...parts],
  position: [0, BASE, 0],
  // the cabin's lamp, over the instrument board
  lights: [{ position: [0.14, 3.6, 0.14], colour: 0xffe4c0, intensity: 0.2, reach: 1.7 }],
  home: 'stack',
  views: [
    { id: 'stack', label: 'Full stack' },
    // (heights are above the nozzles' exits, which stand on the floor)
    { id: 'base', label: 'Engines', centreY: 1.0, span: 9.5, from: along(35, 4, 1) },
    { id: 'booster', label: 'Strap-on', nodes: ['Booster_B'], from: along(-55, 6, 1) },
    { id: 'tips', label: 'Tip joints', centreY: 19.6, span: 4.6, from: along(-40, 14, 1) },
    { id: 'third', label: 'Third stage', nodes: ['Interstage', 'BlockE'], from: along(60, 4, 1) },
    { id: 'fairing', label: 'Fairing', nodes: ['Fairing'], from: along(ENTRY.az, 10, 1) },
    // each of these is of named parts, so it stays on them as the slider takes the vehicle apart
    { id: 'spacecraft', label: 'Spacecraft', nodes: SPACECRAFT },
    { id: 'descent', label: 'Descent module', nodes: ['DescentModule'] },
    { id: 'hatch', label: 'Entry hatch', nodes: ['EntryHatch'], from: along(ENTRY.az, 12, 1) },
    { id: 'instrument', label: 'Instrument module', nodes: ['InstrumentModule', 'GasBottles', 'Antennas'] },
    { id: 'engine', label: 'Braking engine', nodes: ['RetroEngine'], from: along(250, -32, 1) },
  ],
};

// The cosmonaut, standing beside the spacecraft: there is no pad to stand him on yet.
const COSMONAUT_FACING = Math.PI / 4;
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
  // no pad yet: he stands in the gallery, beside the spacecraft
  backdrop: 'studio',
  parts: crewParts,
  position: [3.1, 0, 2.1],
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

const MSK = (h: number, m: number, s = 0) => (h - 9) * 3600 + (m - 6) * 60 + (s - 59.7);

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
  models: [vehicle, crew],
};

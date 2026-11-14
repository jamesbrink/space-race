import type { Flight, ModelDef, Move, Part } from '../../../../../src/types';
import { SITE1 } from '../../../vostok/sites/site-1.ts';
import { voskhodCabin, voskhodSeat } from '../../vehicles/cabin.ts';

const DEG = Math.PI / 180;
const KGF = 9.80665;

// Where things are on the model, as vehicles/voskhod.py and the Vostok's vostok_3ka.py have them: azimuths about the
// long axis from the model's +X, latitudes on the sphere above the plane square to that axis. The numbers live there.
const ENTRY = { az: 135, lat: 24 }; // hatch No. 1: at the crew's right
const PARACHUTE = { az: 45, lat: 21 }; // hatch No. 2: beyond their heads (vehicles/voskhod.py: off OKB-1's drawings)
const STRAPS = [0, 90, 180, 270];
const MAST_AZ = 202.5;
/** The way the crew's feet point, which is where the viewer's cutaway opens the ball. */
const FEET = 225;
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

// The launch vehicle, as vehicles/voskhod_11a57/ has it (heights above the main nozzles' exits; the spacecraft's own
// station 0 is 36.6 m up). Quoted here for the views; the numbers live there.
/** The main nozzles' exits below the model's origin (the spacecraft's braking nozzle), m. */
const BASE = 36.6;

/** Which way each strap-on stands, degrees about the long axis. Which block stood where is not known to us. */
const BOOSTERS: [letter: string, block: string, az: number][] = [
  ['B', 'Б', 0],
  ['V', 'В', 90],
  ['G', 'Г', 180],
  ['D', 'Д', 270],
];
/** The three pieces of the third stage's aft section, by the azimuth of the middle of each (voskhod_11a57/upper.py). */
const AFT = [60, 180, 300];
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
 * The slider takes the launch vehicle apart first and the spacecraft after it, as the Vostoks' do. Every part of the
 * launch vehicle is of order 0, so it is away by half way; the spacecraft's parts are of orders SHIP to SHIP + 2
 * (explode.ts: partProgress). Between about 0.4 and 0.45 the spacecraft stands alone and whole with its antennas out:
 * as it was in orbit.
 */
const SHIP = 9;
/** A reading of the spacecraft's own sequence (0 to 1) on the whole vehicle's slider. */
const later = (t: number) => (SHIP / (SHIP + 2)) * 0.5 + (1 - (SHIP / (SHIP + 2)) * 0.5) * t;

/** Moscow time on a day of October 1964, as seconds from liftoff at 10:30:01 on the 12th. */
const MSK = (day: number, h: number, m: number, s = 0) => ((day - 12) * 24 + h - 10) * 3600 + (m - 30) * 60 + (s - 1);

/** A couch and the man in it: the three differ in who he was and in where the couch stood. */
const couch = (node: string, name: string, summary: string, detail: string, facts: [string, string][], out: number, at: number): Part => ({
  node,
  group: 'Spacecraft',
  inside: true,
  name,
  summary,
  detail,
  facts,
  explode: [0, LIFT, 0],
  // (drawn out past the entry hatch's side one after another, so that each can be seen whole: nothing left the ship this way)
  moves: [{ kind: 'slide', by: along(ENTRY.az, ENTRY.lat, out), from: later(at), to: later(at + 0.24) }],
  order: SHIP + 1,
});

const parts: Part[] = [
  {
    node: 'DescentModule',
    group: 'Spacecraft',
    name: 'Descent module',
    summary: 'A Vostok’s ball with three men in it, and the first that brought its crew all the way to the ground.',
    detail:
      'The same sphere as the Vostok’s, 2.3 m across, heat shield all over, its weight set off-centre so that it meets ' +
      'the air heavy side first without being steered. What changed is inside and at the two ends of the flight. A ' +
      'Vostok pilot left it at 7 km and landed under his own parachute, because the ball came down too hard to ride. ' +
      'With three aboard there was no room for ejection seats, so the crew stayed in: two main parachutes in place of ' +
      'one, a solid rocket in their lines fired by a probe 1.2 m long that touches the ground first, and couches on ' +
      'sprung struts. With the crew, the couches and the rest it weighed 2.9 t, half a tonne more than a Vostok’s. ' +
      'The one drop test of the whole system before the dummy flight ended with the ball smashed at Feodosiya, on ' +
      '6 September, when the parachute hatch failed to blow; the ball was the one Titov had flown. This one came down ' +
      'on 13 October 312 km north-east of Kustanay with all three unhurt. It is kept at RKK Energia’s museum.',
    facts: [
      ['Diameter', '2.3 m over the heat shield; pressure hull 2.2 m (the Vostok’s)'],
      ['Mass', '2,900 kg'],
      ['Hatches', '3, each 1 m in the clear (the Vostok’s)'],
      ['Landing', 'in the ball: two parachutes and a braking rocket'],
      ['Touchdown', '8 to 10 m/s cut to 0.2 m/s (as designed)'],
    ],
    explode: [0, LIFT, 0],
    order: SHIP + 1,
  },
  {
    node: 'EntryHatch',
    group: 'Spacecraft',
    name: 'Hatch No. 1',
    summary: 'The way in, in slippers. On a Vostok it was also the way out; on this ship there was none.',
    detail:
      'At the crew’s right as they lay. On a Vostok this hatch was blown off for the ejection seat, on the pad or at ' +
      '7 km. Here it was a door and nothing more: there were no seats to fire, no pressure suits, and no escape rocket ' +
      'on the launch vehicle. OKB-1’s own plan for the ship said that rescue would be “difficult” for the first 25 to ' +
      '44 seconds of the climb; Kamanin wrote in September that to the 27th second it was “in fact impossible”. On the ' +
      'morning of 12 October the three rode up in the lift, took off their jackets and boots on the platform, put on ' +
      'slippers and went in through it one after another: Yegorov first, to the couch furthest from it, then ' +
      'Feoktistov, and Komarov last, next to it. Three days earlier the State Commission had climbed to this hatch ' +
      'one pair at a time to look at them lying in their couches. “Very cramped,” Kamanin wrote, “their poses are ' +
      'uncomfortable”.',
    facts: [
      ['Clear diameter', '1 m (the Vostok’s)'],
      ['Aboard', '12 October, by 08:35 Moscow time, nearly two hours before liftoff'],
      ['Order in', 'Yegorov, Feoktistov, Komarov'],
      ['Escape through it', 'none: no seats, no suits, no escape rocket'],
    ],
    explode: [0, LIFT, 0],
    moves: [{ kind: 'slide', by: along(ENTRY.az, ENTRY.lat, 1.3), from: later(0.42), to: later(0.6) }],
    order: SHIP + 1,
  },
  {
    node: 'ParachuteHatch',
    group: 'Spacecraft',
    name: 'Hatch No. 2',
    summary: 'Over the parachutes: “one or two?” Korolev asked, with the microphone torn from the operator’s hand.',
    detail:
      'Beyond the crew’s heads. Behind it is the parachute container, and on this ship the whole landing: a drogue, a ' +
      'braking parachute and two main canopies, with the solid braking rocket made fast in their lines. At ' +
      'Feodosiya in September this cover had failed to come off and the ball under it was destroyed. On 13 October ' +
      'the direction finders followed the ship in over the Caspian and the Aral Sea, the report came that the cover ' +
      'had gone, and then nothing: the aerial in the parachute lines gave no signal. Then a search pilot, Mikhaylov ' +
      'in an Il-14, saw the ship in the air 40 km east of Maryevka. Korolev took the microphone and asked how many ' +
      'parachutes. Two. A few minutes later the same pilot saw the ball on the ground and three people beside it, ' +
      'waving.',
    facts: [
      ['Clear diameter', '1 m (the Vostok’s)'],
      ['Main parachutes', '2 (a Vostok’s ball had one)'],
      ['Braking rocket', 'solid, in the parachute lines; fired by a 1.2 m probe'],
      ['Seen under', '“two canopies” (Kamanin, 13 October)'],
    ],
    explode: [0, LIFT, 0],
    moves: [{ kind: 'slide', by: along(PARACHUTE.az, PARACHUTE.lat, 1.0), from: later(0.5), to: later(0.68) }],
    order: SHIP + 1,
  },
  {
    node: 'Cabin',
    group: 'Spacecraft',
    inside: true,
    name: 'Cabin',
    summary: 'A one-man cabin with the seat taken out and three couches put in across it.',
    detail:
      'Nothing was made bigger. The ejection seat, its rails, the pilot’s parachute and survival pack, the suit’s air ' +
      'conditioning, the film camera and the biological experiments came out; three couches went in, turned a quarter ' +
      'turn from the line the seat had lain on. The instrument board and the Vzor sight were left where they had ' +
      'been, which was in front of a Vostok pilot and is now at the crew’s left, so that they read the board ' +
      'sideways. Kamanin, at the hatch on 9 October, put the living space at a fifth of a Vostok’s. Without suits ' +
      'there was nothing between the crew and a leak, and the ship leaked more than a Vostok: 180 litres a minute by ' +
      'the designers’ forecast against 50. The air warmed from 15 °C to 21 °C over the first six orbits, which ' +
      'worried Kamanin and nobody aboard. The wall is lined in white cloth, as the flown ball shows it. The couches ' +
      'lie as OKB-1’s own figure of February 1964 draws them: heads toward the parachute container, the middle ' +
      'one half a trunk toward the feet. Where each stands is fitted round three men of 1.70 m and is estimated: ' +
      'the middle man’s crown comes 44 mm short of the container and his toes 18 mm short of the lining. The ' +
      'pilot’s panel and the hand controller, which the flown ball has by the entry hatch, are not built.',
    facts: [
      ['Crew', '3, without pressure suits'],
      ['Room', '“a fifth” of a Vostok’s for each man (Kamanin)'],
      ['Leak, as forecast', '180 litres a minute (a Vostok: 50)'],
      ['Air', '15 °C at the start, 21 °C after six orbits'],
      ['Board and Vzor', 'where the Vostok’s were: at the crew’s left'],
      ['Middle couch', '260 mm toward the feet, 100 mm proud (estimated, by the fit)'],
      ['Parachute container', 'beyond the middle man’s crown, between the others’ heads'],
    ],
    explode: [0, LIFT, 0],
    order: SHIP + 1,
  },
  couch(
    'CouchRight',
    'Komarov’s couch',
    'The commander, last aboard, next to the hatch: the only one of the three who was a pilot.',
    'Vladimir Komarov, 37, an engineer and test pilot of the Air Force, one of the cosmonauts chosen in 1960. He ' +
      'reported at the foot of the rocket as an engineer lieutenant colonel and was announced an hour later as a ' +
      'colonel: Kamanin had the order put to the minister that day. On the sixth orbit he turned the ship by hand ' +
      'against the stars, and on the sixth and seventh ran a set of ion engines fitted outside it, the first tried in ' +
      'orbit by the Soviet account. When Korolev asked on the morning of the 13th whether the crew was ready to come ' +
      'down, it was he who answered that they would like to stay. He wears what all three wore: a light grey wool ' +
      'suit and the headset’s white cap. The suit is drawn from a flight costume of the kind kept at Kaluga, which ' +
      'the museum does not say was this crew’s, and from photographs taken in the cabin. No document with his height ' +
      'was found; the figure is the same build for all three, and nobody’s likeness.',
    [
      ['In it', 'Vladimir M. Komarov, 37, commander'],
      ['Callsign', 'Rubin (Рубин, “Ruby”)'],
      ['Wearing', 'a grey wool suit, a white headset cap; no pressure suit'],
      ['Backup', 'Boris Volynov'],
    ],
    4.6,
    0.52,
  ),
  couch(
    'CouchCentre',
    'Feoktistov’s couch',
    'The engineer in the middle, set forward of the other two: one of the men who had designed the ship.',
    'Konstantin Feoktistov, 38, of OKB-1, a designer of the Vostok and of this conversion of it, and the first ' +
      'civilian to fly. He was not in the cosmonaut corps, and his training was a much shortened one. The middle couch stands ' +
      'forward of its neighbours, toward the crew’s chests, so that three pairs of shoulders fit across a ball 2.2 m ' +
      'wide inside. In orbit he photographed the horizon, watched the aurora and “luminous particles” at the ' +
      'porthole, and took star sights with a sextant to see whether a ship could be steered by them. For most of the ' +
      'day he felt that he was hanging upside down. He told a later interviewer that at touchdown sparks flew from ' +
      'their eyes and the ball rolled over; the press conference said the landing was soft.',
    [
      ['In it', 'Konstantin P. Feoktistov, 38, engineer'],
      ['Set forward by', '160 mm in the model, and 80 mm toward the feet (estimated)'],
      ['Felt', '“upside down” through the flight (Kamanin, 14 October)'],
      ['Backup', 'Georgiy Katys'],
    ],
    3.4,
    0.6,
  ),
  couch(
    'CouchLeft',
    'Yegorov’s couch',
    'The doctor, first aboard and furthest from the hatch, with the instrument board over him.',
    'Boris Yegorov, 26, a physician, the first to practise in orbit. He took blood samples, measured blood ' +
      'pressure, tested reflexes and the eyes’ muscles, and watched how the other two worked. On the seventh orbit, ' +
      'while he slept, telemetry showed his pulse at 46 and the chief of the Air Force’s medical service began to ' +
      'talk of space sickness; Kamanin asked Komarov to take it by hand, and it was 68. He felt as if he were ' +
      'kneeling with his head down, and was worst some seven hours into the flight. His couch is the one nearest the ' +
      'board and the Vzor, which stayed where a Vostok had them.',
    [
      ['In it', 'Boris B. Yegorov, 26, physician'],
      ['Pulse asleep', '46 by telemetry; 68 when taken by hand'],
      ['Work', 'blood samples, blood pressure, reflexes, the eyes’ muscles'],
      ['Backups', 'Aleksey Sorokin and Vasiliy Lazarev'],
    ],
    2.2,
    0.68,
  ),
  {
    node: 'ReserveEngine',
    group: 'Spacecraft',
    name: 'Reserve braking engine',
    summary: 'What let the ship fly higher than a Vostok dared: a second way down, never used.',
    detail:
      'A Vostok had one braking engine and no spare, so it flew low enough for the air to bring it down within the ' +
      'ten days its supplies lasted. This ship carried three men on a life support built for one, good for two or ' +
      'three days, and an orbit that would decay in time was no longer an answer. So a second engine stands on the ' +
      'forward pole, where a Vostok had the housing of its antennas, in the lock the four straps meet at: a solid ' +
      'motor of 143 kg, 87 kg of it propellant, giving 12 tonnes of thrust for about two seconds. With it aboard the ' +
      'apogee could be 408 km. It was not fired. Its outline here is scaled off OKB-1’s general drawings of the ship, ' +
      'which make the ship some 5.5 m long where the figure in print is a round five; how its gas left it is in nothing ' +
      'read, and what the drawing shows lying along it has not been identified and is not built.',
    facts: [
      ['Kind', 'solid propellant'],
      ['Thrust', '12,000 kgf for about 2 s'],
      ['Mass', '143 kg, of which 87 kg propellant'],
      ['Stands', '1.30 m above the sphere, 0.86 m across at its foot (off the drawings)'],
      ['Used', 'no'],
    ],
    explode: [0, LIFT + 1.1, 0],
    order: SHIP + 1,
  },
  {
    node: 'RetainingStraps',
    group: 'Spacecraft',
    name: 'Retaining straps',
    summary: 'Four steel bands to one lock, which now sits under the reserve engine.',
    detail:
      'As on a Vostok, four bands run from the instrument module’s ring over the sphere and meet in a single lock at ' +
      'its top; after the braking engine has run the lock lets them go and the two halves of the ship part. On the ' +
      'morning of 13 October the control post heard none of this from the crew: the short-wave link was poor all ' +
      'through the flight. A faint signal that the command to separate had passed came through, and at 10:22:30 ' +
      'Moscow heard the ball’s own beacon, which meant that the engine had run and the ball was alone. Each strap ' +
      'carries a hairpin antenna of the command link. They swing back as they would when released; how far they ' +
      'sprang is not recorded.',
    facts: [
      ['Straps', '4, joined by one pyrotechnic lock (the Vostok’s)'],
      ['Ball’s beacon heard', '13 October, 10:22:30 Moscow time (Kamanin)'],
    ],
    explode: [0, 0, 0],
    moves: STRAPS.map((az, i) => outward(`Strap_${i + 1}`, az, 58, later(0.02 + 0.02 * i), later(0.2 + 0.02 * i))),
    order: SHIP,
  },
  {
    node: 'CableMast',
    group: 'Spacecraft',
    name: 'Cable mast',
    summary: 'Everything the cabin knows of the other half of the ship comes up this.',
    detail:
      'Power, commands and telemetry cross from the instrument module to the cabin through one mast of cables, plugged ' +
      'into a plate on the side of the ball, as on a Vostok. The evening before the launch the telemetry system gave ' +
      'trouble: its designer, Bogomolov, came to say that a transmitter had to be changed, a matter of minutes, and ' +
      'Korolev lost his temper with him in front of the State Commission as Kamanin had not seen in four years. It ' +
      'was changed, and nothing was held. Nothing read says the mast differed from a Vostok’s, and it is built as ' +
      'that.',
    facts: [
      ['As', 'the Vostok’s'],
      ['Telemetry transmitter', 'changed on the eve of the launch'],
    ],
    explode: [0, 0, 0],
    moves: [outward('CableMast_Arm', MAST_AZ, 40, later(0.06), later(0.24))],
    order: SHIP,
  },
  {
    node: 'GasBottles',
    group: 'Spacecraft',
    name: 'Gas bottles',
    summary: 'Gas for the jets, and the cabin’s reserve: with no suits, the only reserve there was.',
    detail:
      'A necklace of pressure spheres round the joint, outside both hulls, as on a Vostok: gas for the attitude jets ' +
      'and air and oxygen for the cabin. On a Vostok some of the bottles fed the pilot’s suit if the cabin lost its ' +
      'air. This crew had no suits. “If the spacecraft depressurized, death was inevitable,” Chertok wrote of it ' +
      'afterwards. The resources were for one day’s flight with a margin of two or three by different accounts, on ' +
      'equipment meant for one man. Sources give fourteen, sixteen and twelve bottles on a Vostok’s ring; fourteen ' +
      'are modelled, as on the Vostoks here, and whether this ship’s ring differed was not found.',
    facts: [
      ['Bottles', '14 modelled (sources for the Vostok: 12, 14, 16)'],
      ['Life support', 'for a day’s flight; two or three days at most'],
    ],
    explode: [0, 0.5, 0],
    order: SHIP + 2,
  },
  {
    node: 'InstrumentModule',
    group: 'Spacecraft',
    inside: true,
    name: 'Instrument module',
    summary: 'The Vostok’s, with a new radio, a faster television and a way to find its heading in the dark.',
    detail:
      'Two cones base to base, sealed and filled with dry nitrogen, carrying the batteries, radios, the orientation ' +
      'system and the braking engine; the aft cone is the radiator. A Vostok could point itself for the braking burn ' +
      'only with the Sun in view. This ship added sensors that feel the thin stream of ions it flies through, and so ' +
      'tell which way it is moving, by night as well. The television was new: 25 frames a second where the ' +
      'Vostoks’ had ten, with one camera in the cabin and one outside that the crew could turn; the control post ' +
      'watched the crew on the sixth and seventh orbits. Voice went by VHF and worked; short wave was poor ' +
      'throughout, and from the eighth orbit to the thirteenth, when the ship did not pass over the Soviet Union, ' +
      'the ground knew nothing. The ion sensors, the ion engines Komarov tried and the outside camera are not built: ' +
      'nothing was found of their form or their places.',
    facts: [
      ['Greatest diameter', '2.43 m'],
      ['Length', '2.25 m (the Vostok’s)'],
      ['Television', '25 frames/s; one camera inside, one outside'],
      ['Voice', '143.625, 17.365 and 18.035 MHz; beacon 19.9944 MHz (TASS)'],
      ['Out of touch', 'orbits 8 to 13'],
    ],
    explode: [0, 0, 0],
    order: SHIP + 2,
  },
  {
    node: 'Antennas',
    group: 'Spacecraft',
    name: 'Antennas',
    summary: 'Ten of the Vostok’s eleven, folded under the fairing and let out in orbit.',
    detail:
      'A fan of three whips by the frame, three long whips trailing from beside the engine, and four ribbon antennas ' +
      'standing aft, as the Vostoks here have them: voice, the Signal beacon, telemetry, the command link and ' +
      'television. OKB-1’s general drawing of this ship shows the ribbons and the hairpins on the straps where a ' +
      'Vostok had them; the radio itself was new, and what that changed outside was not found. Under the fairing they ' +
      'were folded against the hull. How has not been found: here they are drawn withdrawn into the hull and slide ' +
      'out, which is not how it was done.',
    facts: [
      ['Modelled here', '10: a fan of 3, 3 long whips, 4 ribbons (the Vostok’s)'],
      ['Let out', 'at separation, 523 s after liftoff or a few seconds on'],
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
    summary: 'The Vostok’s engine, and for once with a spare standing at the other end of the ship.',
    detail:
      'Isaev’s S5.4, unchanged: 1.6 tonnes of thrust for up to 45 seconds on self-igniting propellants, with four ' +
      'small steering nozzles round the chamber. On the morning of 13 October the crew asked for another day. ' +
      '“There are many wonders in the world, friend Horatio,” Korolev is reported to have answered, and held them to ' +
      'the plan: the flight was for one day, and Kamanin thought an extra day “could add nothing to the victory”. ' +
      'The ship turned itself for the burn at 09:55:39 Moscow time by one account. The engine fired over the Gulf of ' +
      'Guinea, at 10:18:58 by that account (Chertok has 10:08:56 as the time programmed); two ships off Africa saw ' +
      'it start and stop. The reserve engine stayed cold.',
    facts: [
      ['Thrust', '1,614 kgf (15.8 kN) (the Vostok’s)'],
      ['Burn', '45 s at most; this flight’s was not found'],
      ['Fired', '13 October, over the Gulf of Guinea'],
      ['When', '10:18:58 Moscow time (RussianSpaceWeb); 10:08:56 as programmed (Chertok)'],
    ],
    explode: [0, -0.9, 0],
    order: SHIP + 2,
  },
];

const BOOSTER_DETAIL =
  'A cone 19.2 m long on a short cylinder, with its own RD-107: four fixed chambers and two small ones that swivel ' +
  'to steer, all fed by one turbopump driven by steam from hydrogen peroxide. The whole cone is its oxygen tank, ' +
  'white with frost; the kerosene is in the cylinder under it. It is not bolted on. Its tip is a steel ball in a cup ' +
  'on the core, and its thrust holds it there; two ties at the foot keep it from swinging. When its engine is ' +
  'throttled back the ties are let go, and what thrust is left swings the foot outward until the ball drops out of ' +
  'its cup. These four are built as the Vostok launcher’s: the 11A57 had the same blocks with engines of a later ' +
  'issue, and nothing read says how they differed to look at. For the first half minute of the climb, with these ' +
  'alight under a crew that had no way out, there was nothing to be done if one failed.';

const launcherParts: Part[] = [
  {
    node: 'Fairing',
    group: 'Third stage',
    name: 'Fairing',
    summary: 'Two halves and a door. No seat could be fired through it, and nothing stood on top of it.',
    detail:
      'It covers the ship through the thick air and is dropped in two halves two and a half minutes up. The opening ' +
      'is over hatch No. 1, the way in from the lift. On a Vostok the same opening was the pilot’s way out on his ' +
      'seat. Here it led nowhere: the escape tower meant for this ship’s successor was not ready, and OKB-1 flew ' +
      'without one. Its nose is a straight cone on a cylinder, as OKB-1’s general drawing of the ship under it has it ' +
      'and the photographs of the vehicle on the pad show; its length is what the published lengths of the vehicle ' +
      'leave for it, 6.36 m. It was white.',
    facts: [
      ['Length', '6.36 m (derived)'],
      ['Diameter', '2.7 m (as the Vostok’s)'],
      ['Nose', 'a cone, 22° from the axis (off the drawings)'],
      ['Dropped', '150 s after liftoff (the type, from Kosmos 47)'],
      ['Escape system', 'none'],
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
    node: 'BlockI',
    group: 'Third stage',
    inside: true,
    name: 'Block I, the third stage',
    summary: 'The stage that made a three-man ship possible: four times a Vostok’s third stage, built for the planets.',
    detail:
      'A Vostok’s third stage could put under five tonnes in orbit, and this ship weighed 5.3. Block I had been built ' +
      'in 1960 to send probes to Mars and Venus, and by 1963 was launching reconnaissance satellites on this same ' +
      'vehicle. It is a full stage, 2.66 m across: a kerosene tank over an oxygen tank, each two domes and a cylinder, ' +
      'an instrument bay between them, and under them the RD-0108, four fixed chambers on one turbopump with four ' +
      'small nozzles that swing to steer, burning the turbine’s spent gas. Kosberg’s bureau had made the engine from ' +
      'the second stage engine of the R-9 missile. On the dummy flight six days before, its thrust fell by a tenth ' +
      'for three seconds and came back; the cause had not been found when this one flew. It lit at about 290 ' +
      'seconds and put the ship in orbit at 523. Above the tanks is the adapter the ship stands on. The lengths are ' +
      'published ones; every station inside the stage is estimated.',
    facts: [
      ['Length', '6.745 m; 9.05 m with its adapter'],
      ['Diameter', '2.66 m'],
      ['Engine', 'RD-0108: 30.4 tf (298 kN) in vacuum'],
      ['Chambers', '4 fixed, 4 steering nozzles'],
      ['Propellants', 'kerosene and liquid oxygen'],
      ['Burned', 'from about 290 s to 523 s'],
    ],
    explode: [0, -3.0, 0],
    order: 0,
  },
  {
    node: 'AftSection',
    group: 'Third stage',
    name: 'Aft section',
    summary: 'A skirt round the engine that joins the stage to the lattice, then leaves in three pieces.',
    detail:
      'The third stage’s engine sits inside a cylinder of skin that carries the stage on the lattice below. Once the ' +
      'stage has lit and pulled away, the skirt is dead weight: locks let it go, springs push it back off the stage ' +
      'and three more pairs push its three pieces apart. That is how the stage is described as it flies today; that ' +
      'it was so in 1964 is assumed, and where the cuts lay is not known to us.',
    facts: [
      ['Pieces', '3 (as the stage is described today)'],
      ['Length', '1.95 m in the model (estimated)'],
    ],
    explode: [0, -3.0, 0],
    moves: AFT.flatMap((az, i): Move[] => [
      { kind: 'slide', node: `AftSection_${i + 1}`, by: along(az, 0, 2.6), from: 0.04, to: 0.22 },
      { kind: 'slide', node: `AftSection_${i + 1}`, by: along(az, -70, 5), from: 0.18, to: 0.44 },
    ]),
    order: 0,
  },
  {
    node: 'Interstage',
    group: 'Third stage',
    name: 'Lattice and deflector',
    summary: 'Open on purpose: the third stage lights while the second is still pushing.',
    detail:
      'Nobody had started a liquid engine in weightlessness when this vehicle was designed, where the propellant ' +
      'floats away from the tank outlets. So the upper stage is lit while the core under it is still burning and ' +
      'holding everything down in the tanks, and only then is the core cut loose. For a moment the upper engine fires ' +
      'straight at the top of the stage below, and the fire leaves between the struts, turned aside by the cone on ' +
      'the core’s top. No figure for this vehicle’s lattice was found: it is built as the Vostok launcher’s, 1.26 m.',
    facts: [
      ['Length', '1.26 m (the Vostok launcher’s: assumed)'],
      ['Struts', '24 drawn, in 12 V’s'],
      ['Staging', 'hot: upper engine on before the lower is off'],
    ],
    explode: [0, -6.6, 0],
    order: 0,
  },
  {
    node: 'CoreStage',
    group: 'Core, Block A',
    inside: true,
    name: 'Block A, the core',
    summary: 'Second stage, though it lights first. Clear and eight below freezing as it was fuelled.',
    detail:
      'Called the second stage, but its engine starts on the pad with the boosters’, because an engine that failed to ' +
      'start on the ground could be shut down and tried again. It carries twice a booster’s propellant and burns two ' +
      'and a half times as long. Its shape follows from the boosters round it: narrow at the foot where they crowd ' +
      'in, widest 20 m up where their tips push on a heavy frame. The morning of 12 October was still and frosty, ' +
      '−8 °C at six, with a wind of 3 to 4 m/s, more than 20 km of visibility and high cirrus: “ideal”, Kamanin wrote. ' +
      'It is built as the Vostok launcher’s core. Every station between its ends is estimated.',
    facts: [
      ['Length', '27.5 m; 28.75 m with the lattice (the Vostok launcher’s)'],
      ['Diameter', '2.05 m at the foot, 2.95 m at the frame'],
      ['Weather', '−8 °C, wind 3 to 4 m/s, high cirrus (Kamanin)'],
    ],
    explode: [0, -10.5, 0],
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
      'corners, fed through their own pivots. With the boosters’ engines that makes twenty large nozzles and twelve ' +
      'small: thirty-two chambers lit on the ground. They lit a second after 10:30 Moscow time on 12 October, the ' +
      'minute the State Commission had set on the 9th. It is built as the Vostok launcher’s engine.',
    facts: [
      ['Thrust', '778 kN at the ground (Brügge’s table for the 11A57)'],
      ['Chambers', '4 fixed, 4 steering'],
      ['Propellants', 'kerosene T-1 and liquid oxygen'],
      ['Turbopump', 'one, driven by decomposed hydrogen peroxide'],
    ],
    explode: [0, -14.5, 0],
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
        ['Engine', 'RD-107: 819 kN at the ground (Brügge’s table for the 11A57)'],
        ['Chambers', '4 fixed, 2 steering'],
        ['Left the core', 'at about 120 s (the type, from Kosmos 47)'],
      ],
      explode: [0, 0, 0],
      // it swings out about its tip ball (documented; the angle is ours: far enough to show the joint), then falls behind
      moves: [outward(`Booster_${letter}`, az, -14, 0.0, 0.2), { kind: 'slide', by: along(az, -52, 9), from: 0.14, to: 0.5 }],
      order: 0,
    }),
  ),
];

const SPACECRAFT = ['DescentModule', 'ReserveEngine', 'InstrumentModule', 'RetroEngine', 'Antennas'];
const COUCHES = ['CouchLeft', 'CouchCentre', 'CouchRight'];

const vehicle: ModelDef = {
  id: 'vehicle',
  name: 'Vehicle',
  url: 'models/ussr/voskhod/voskhod-1/vehicle.glb',
  scale: '44.16 m on the pad · 10.3 m across the rudders · to scale',
  // The vehicle alone: Site 1 as it stood in October 1964 is not built for this flight, so it is shown in the gallery only.
  backdrop: 'studio',
  slider: ['On the pad', 'Taken apart'],
  cutaway: true,
  specGroups: ['Launch vehicle', 'Spacecraft'],
  parts: [...launcherParts, ...parts],
  // the cabin's lamp, over the instrument board
  lights: [{ position: [0.14, 3.6, 0.14], colour: 0xffe4c0, intensity: 0.2, reach: 1.7 }],
  home: 'stack',
  views: [
    { id: 'stack', label: 'Full stack' },
    // (heights are from the model's origin, the spacecraft's braking nozzle: the main nozzles' exits are BASE below it)
    { id: 'base', label: 'Engines', centreY: 1.0 - BASE, span: 9.5, from: along(35, 4, 1) },
    { id: 'booster', label: 'Strap-on', nodes: ['Booster_B'], from: along(-55, 6, 1) },
    { id: 'tips', label: 'Tip joints', centreY: 19.6 - BASE, span: 4.6, from: along(-40, 14, 1) },
    { id: 'third', label: 'Third stage', nodes: ['Interstage', 'AftSection', 'BlockI'], from: along(60, 4, 1) },
    { id: 'fairing', label: 'Fairing', nodes: ['Fairing'], from: along(ENTRY.az, 10, 1) },
    // each of these is of named parts, so it stays on them as the slider takes the vehicle apart
    { id: 'spacecraft', label: 'Spacecraft', nodes: SPACECRAFT },
    { id: 'descent', label: 'Descent module', nodes: ['DescentModule', 'ReserveEngine'] },
    { id: 'reserve', label: 'Reserve engine', nodes: ['ReserveEngine'], from: along(200, 14, 1) },
    { id: 'hatch', label: 'Entry hatch', nodes: ['EntryHatch'], from: along(ENTRY.az, 12, 1) },
    // (through the cutaway's opening, from beyond their feet and above: three abreast, the middle one forward)
    { id: 'crew', label: 'Crew', nodes: COUCHES, from: along(FEET, 52, 1) },
    { id: 'instrument', label: 'Instrument module', nodes: ['InstrumentModule', 'GasBottles', 'Antennas'] },
    { id: 'engine', label: 'Braking engine', nodes: ['RetroEngine'], from: along(250, -32, 1) },
  ],
};

// The three couches as somewhere to sit, and their cabin (../../vehicles/cabin.ts: from the model's own nodes). Each
// eye point is at its man's own eyes and turned as his head is (vehicles/voskhod.py `seat_view`); from his couch his
// own head, and the headset's cap, earphones, strap and microphones on it, are not drawn (crew/flight_suit.py: every
// `Helmet_` mesh). The commander's is first: the one an on-board view takes. They went aboard between the bus reaching
// the pad at 08:15 Moscow time and "all three aboard" at 08:35, Yegorov first and Komarov last (README.md, Kamanin's
// times to the minute: derived); there is no launch site to board them at yet.
const HEAD = ['Head', 'Cap', 'Earphones', 'ChinStrap', 'MicrophoneBooms', 'Microphones', 'Eyes', 'Brows', 'Lips'];
const BOARDING: [number, number] = [-8101, -6901];
vehicle.seats = [
  voskhodSeat('Right', 'Komarov’s couch, by the hatch', HEAD, BOARDING),
  voskhodSeat('Centre', 'Feoktistov’s couch, in the middle', HEAD, BOARDING),
  voskhodSeat('Left', 'Yegorov’s couch, by the Vzor', HEAD, BOARDING),
];
vehicle.cabin = voskhodCabin(COUCHES);

export const flight: Flight = {
  id: 'ussr/voskhod/voskhod-1',
  nation: 'USSR',
  agency: 'OKB-1',
  program: 'Voskhod',
  designation: 'Voskhod 1',
  callsign: 'Rubin (Рубин)',
  spacecraft: 'Voskhod 3KV No. 3',
  launchVehicle: 'Voskhod 11A57, No. R15000-04',
  // 10:30:01 Moscow time (Siddiqi, p. 423: "exactly 1030 hours, 1 second Moscow Time", and his launch log; McDowell's
  // log 0730:01 UTC). TASS and Kamanin give the minute.
  launch: '1964-10-12T07:30:01Z',
  launchSite: SITE1.name,
  site: SITE1,
  crew: ['Vladimir M. Komarov', 'Konstantin P. Feoktistov', 'Boris B. Yegorov'],
  summary:
    'The first crew of more than one: a pilot, an engineer and a doctor in a Vostok’s ball with its ejection seat ' +
    'taken out, without pressure suits and with no way of escape for the first half minute of the climb. Sixteen ' +
    'orbits in a day, and the first crew to land inside its ship. Khrushchev spoke to them on the third orbit and ' +
    'had been removed from office before they reached Moscow.',
  facts: [
    { label: 'Liftoff', value: '12 October 1964, 07:30:01 UTC (10:30:01 Moscow time)' },
    { label: 'Crew', value: 'Komarov (37), Feoktistov (38), Yegorov (26)' },
    { label: 'Duration', value: '1 d 0 h 17 min 3 s' },
    { label: 'Orbits', value: '16' },
    { label: 'Orbit', value: '177.5 × 408 km, 64.9°' },
    { label: 'Mass in orbit', value: '5,320 kg' },
    { label: 'Landing', value: '13 October, 10:47 Moscow time, 312 km north-east of Kustanay' },
  ],
  // Moscow times. Kamanin's diary keeps the range's clock at the pad, two hours ahead, and says so: converted here.
  // An hour given for an orbit's number is reckoned from the period and says "about" (README.md).
  timeline: [
    { t: MSK(12, 8, 15), event: 'The bus reaches the pad: three men in grey wool suits and white headset caps' },
    { t: MSK(12, 8, 35), event: 'All three aboard: Yegorov first, then Feoktistov, Komarov last' },
    { t: 0, event: 'Liftoff, 10:30:01 Moscow time; no means of escape for the first 25 to 44 seconds' },
    { t: 523, event: 'In orbit, 177.5 by 408 km: “an agonising 523 seconds, and a sigh of relief” (Kamanin)' },
    { t: MSK(12, 12, 0), event: 'About an hour and a half after liftoff the control post sees the crew by television and talks to them' },
    { t: MSK(12, 14, 15), event: 'On the third orbit (about now) Khrushchev and Mikoyan, at Pitsunda, speak to the crew' },
    {
      t: MSK(12, 18, 45),
      event: 'On the sixth orbit (about now) Komarov turns the ship by hand against the stars; television on this orbit and the next',
    },
    { t: MSK(12, 20, 15), event: 'On the seventh orbit (about now) Yegorov’s pulse reads 46 asleep; taken by hand it is 68' },
    { t: MSK(13, 4, 28), event: 'Contact again on the 13th orbit, after six orbits out of sight of the Soviet Union' },
    { t: MSK(13, 9, 0), event: 'The crew asks for another day; Korolev holds them to the plan' },
    { t: MSK(13, 9, 55, 39), event: 'The ship turns itself for the braking burn (RussianSpaceWeb)' },
    {
      t: MSK(13, 10, 18, 58),
      event: 'The braking engine fires over the Gulf of Guinea (RussianSpaceWeb; Chertok has 10:08:56 as the programmed time)',
    },
    { t: MSK(13, 10, 22, 30), event: 'Moscow hears the ball’s beacon: the engine has run and the ball is alone' },
    { t: MSK(13, 10, 47, 4), event: 'Touchdown under two parachutes, 312 km north-east of Kustanay: the first crew to land in its ship' },
  ],
  specs: [
    {
      group: 'Spacecraft',
      label: 'Length as modelled, nozzle to the reserve engine’s face',
      value: 5.48,
      unit: 'm',
      confidence: 'estimated',
      note: 'the one figure in print is “a length of five meters” (Siddiqi, Challenge to Apollo, p. 412), a round number. OKB-1’s general drawing of the 3KV (17 April 1964, RGANTD, as reproduced by Pillet), scaled by its 2.3 m sphere, makes it 5.43 to 5.49 m by two readings, and puts the reserve engine’s face 1.32 m above the sphere. The model takes 1.30 m on the Vostok’s 4.18 m',
    },
    {
      group: 'Spacecraft',
      label: 'Greatest diameter',
      value: 2.43,
      unit: 'm',
      confidence: 'documented',
      note: '2.43 m (Siddiqi p. 412): the instrument module, as a Vostok’s',
    },
    {
      group: 'Spacecraft',
      label: 'Descent module diameter',
      value: 2.3,
      unit: 'm',
      confidence: 'documented',
      note: '2.3 m over the heat shield, the Vostok’s sphere (Siddiqi p. 195; the Soviet encyclopedia text). Nothing read gives the 3KV’s own; OKB-1’s drawing of it is to the same outline',
    },
    {
      group: 'Spacecraft',
      label: 'Mass in orbit',
      value: 5320,
      unit: 'kg',
      confidence: 'documented',
      note: '5,320 kg (Siddiqi p. 412 and Table IB; McDowell’s log). Chertok, vol. 3, p. 231, has the vehicle’s mass rising “to 5.7 metric tons”',
    },
    {
      group: 'Spacecraft',
      label: 'Descent module mass',
      value: 2900,
      unit: 'kg',
      confidence: 'documented',
      note: '2,900 kg, “about 500 kilograms heavier than Vostok” (Siddiqi p. 412)',
    },
    {
      group: 'Spacecraft',
      label: 'Reserve engine, mass',
      value: 143,
      unit: 'kg',
      confidence: 'documented',
      note: '143 kg, of which 87 kg solid propellant; 12,000 kgf for about two seconds (Siddiqi p. 411, from Korolev’s draft plan as published in 1980). RussianSpaceWeb has 145 kg',
    },
    {
      group: 'Spacecraft',
      label: 'Reserve engine, height above the sphere as modelled',
      value: 1.3,
      unit: 'm',
      confidence: 'estimated',
      note: 'no dimension of it was found. Scaled off OKB-1’s general drawings of the 3KV and the 3KD and a photograph of a test article (three readings: 1.27 to 1.33 m); 0.86 m across its rear drum at the foot and 0.74 m across its front one, off the same',
    },
    {
      group: 'Spacecraft',
      label: 'Landing probe',
      value: 1.2,
      unit: 'm',
      confidence: 'documented',
      note: 'let down 1.2 m under the ball to fire the braking rocket in the parachute lines: “from about eight to ten meters per second to a bearable two-tenths” (Siddiqi p. 411). Not modelled: it and the rocket are stowed for the whole of what the model shows',
    },
    {
      group: 'Spacecraft',
      label: 'Couch travel',
      value: 0.3,
      unit: 'm',
      confidence: 'documented',
      note: '“a special spring suspension system, which would allow movement of 200 to 300 millimeters”, to take 20 to 30 g for five hundredths of a second (Siddiqi p. 412). Kamanin’s diary has the stroke as 20 to 40 mm. The couches’ form and places in the model are estimated',
    },
    {
      group: 'Spacecraft',
      label: 'Perigee',
      value: 177.5,
      unit: 'km',
      confidence: 'documented',
      note: '177.5 km (Siddiqi, p. 423 and Table IB; the Soviet encyclopedia). TASS on the day and the registration at the United Nations: 178 km. Planned in August: 180 km',
    },
    {
      group: 'Spacecraft',
      label: 'Apogee',
      value: 408,
      unit: 'km',
      confidence: 'documented',
      note: '408 km (Siddiqi; the encyclopedia); 409 km (TASS; the UN registration). The announced period of 90.1 min belongs to an orbit some 20 km lower at apogee; later catalogues print 336 to 377 km for later epochs. The August plan had 240 km',
    },
    {
      group: 'Spacecraft',
      label: 'Inclination',
      value: 64.9,
      unit: 'deg',
      confidence: 'documented',
      note: '64.9° (Siddiqi p. 423); “about 65 degrees” (TASS). His Table IB prints 64.77, which is also Kosmos 47’s',
    },
    {
      group: 'Spacecraft',
      label: 'Period',
      value: 90.1,
      unit: 'min',
      confidence: 'documented',
      note: '90.1 min, “by preliminary data” (TASS, 12 October 1964, as printed in Заря Востока, 13 October)',
    },
    {
      group: 'Spacecraft',
      label: 'Cabin leak, as forecast',
      value: 180,
      unit: 'l/min',
      confidence: 'documented',
      note: '“an outflow of air from the Voskhod at 180 liters per minute as opposed to the fifty liters per minute on Vostok” (Siddiqi p. 411)',
    },
    {
      group: 'Spacecraft',
      label: 'Crew height, as modelled',
      value: 1.7,
      unit: 'm',
      confidence: 'estimated',
      note: 'no document with the height of any of the three was found. In the portrait taken after the flight their eyes are level to half a centimetre, and in a group of July 1965 Feoktistov’s are level with those of Belyayev, who was 170 cm (Kamanin, 19 January 1965): so all three figures are one build of 1.70 m, good to some 3 cm. Passengers were to be 160 to 175 cm (Kamanin, 3 April 1964). The suit is drawn from the flight costume kept at Kaluga (a grey wool pullover and trousers; the museum does not attribute it to this crew) and the cap from photographs taken in the cabin',
    },
    {
      group: 'Launch vehicle',
      label: 'Length on the pad',
      value: 44.16,
      unit: 'm',
      confidence: 'derived',
      note: '16.665 m from the core’s top to the fairing’s tip (Zak, RussianSpaceWeb: “stretched by 2,710 millimeters to 16,665”) on the Vostok launcher’s core, 27.49 m (Minakov’s 28.75 m less his lattice of 1.26 m: assumed unchanged). Brügge’s table has 44.13 m; Siddiqi’s table of launch vehicles gives the type as 43.5 to 45.22 m',
    },
    {
      group: 'Launch vehicle',
      label: 'Width over the air rudders',
      value: 10.3,
      unit: 'm',
      confidence: 'documented',
      note: '10.303 m (Siddiqi, table of launch vehicles); 10.30 (Brügge)',
    },
    {
      group: 'Launch vehicle',
      label: 'Liftoff thrust',
      value: 413.3 * 1000 * KGF,
      unit: 'N',
      confidence: 'documented',
      note: '413.3 tf (Siddiqi, table of launch vehicles), which is 4,053 kN; Brügge’s table sums to 4,054.2 kN',
    },
    {
      group: 'Launch vehicle',
      label: 'Third stage with its adapter',
      value: 9.05,
      unit: 'm',
      confidence: 'documented',
      note: '9.05 m long and 2.66 m across (Brügge’s table for the 11A57 with Voskhod: secondary). The stage alone is 6.745 m as it flies today (Zak, from the maker’s manual); the adapter is the difference',
    },
    {
      group: 'Launch vehicle',
      label: 'Fairing',
      value: 6.355,
      unit: 'm',
      confidence: 'derived',
      note: 'what 16.665 m leaves above the lattice (1.26 m) and the stage with its adapter (9.05 m). Brügge prints 6.74 m by 2.58. OKB-1’s general drawings put its shoulder 0.6 m above the sphere’s pole and its cone at 21.5 to 23° from the axis; the model’s, at 22° with a cap of 0.29 m radius, has its shoulder 0.52 m above the pole',
    },
    {
      group: 'Launch vehicle',
      label: 'Launch azimuth',
      value: 37.3,
      unit: 'deg',
      confidence: 'derived',
      note: 'east of north, for an orbit inclined 64.9° from latitude 45.92°, before the Earth’s turning is allowed for. The azimuth as flown was not found',
    },
  ],
  motors: [
    {
      name: 'RD-107, one in each strap-on',
      count: 4,
      thrustN: 819100,
      burnS: 120,
      propellant: 'kerosene T-1 / liquid oxygen',
      kind: 'liquid',
      confidence: 'documented',
      note: '3,276.4 kN at the ground for the four, 819.1 kN each (Brügge’s table for the 11A57: secondary, and uncited figure by figure). The strap-ons left at 120 s on Kosmos 47 six days before (Kamanin, 6 October 1964); this flight’s time was not found',
    },
    {
      name: 'RD-108, core',
      count: 1,
      thrustN: 777800,
      burnS: 290,
      propellant: 'kerosene T-1 / liquid oxygen',
      kind: 'liquid',
      confidence: 'documented',
      note: '777.8 kN at the ground (Brügge’s table for the 11A57: secondary). The third stage lit at 290 s on Kosmos 47 (Kamanin); this flight’s time was not found',
    },
    {
      name: 'RD-0108, third stage',
      count: 1,
      thrustN: 30.4 * 1000 * KGF,
      burnS: 233,
      propellant: 'kerosene / liquid oxygen',
      kind: 'liquid',
      confidence: 'documented',
      note: '“a vacuum thrust of 30.4 tons” (Siddiqi p. 410, note 4, from Varfolomeyev); Encyclopedia Astronautica has 297.9 kN, 326 s and a burn of 250 s. The burn here is 290 s to orbit at 523 s (Kamanin: Kosmos 47’s ignition; this flight’s 523). On Kosmos 47 its thrust fell 10 per cent for three seconds',
    },
    {
      name: 'TDU-1 (Isaev S5.4) braking engine',
      count: 1,
      thrustN: 1614 * KGF,
      burnS: 45,
      propellant: 'amine fuel (TG-02) / nitric acid (AK-20F)',
      kind: 'liquid',
      confidence: 'documented',
      note: '“the standard TDU-1 liquid-propellant engine” (Siddiqi p. 411): 1.614 tf, 45 s at most (p. 197). Fired on 13 October over the Gulf of Guinea, at 10:18:58 Moscow time (RussianSpaceWeb); Chertok (vol. 3, p. 241) gives 10:08:56 as the time in the programme. The first agrees with the beacon heard at 10:22:30 (Kamanin). Its burn was not found',
    },
    {
      name: 'Reserve braking engine',
      count: 1,
      thrustN: 12000 * KGF,
      burnS: 2,
      propellant: 'solid, 87 kg',
      kind: 'solid',
      confidence: 'documented',
      note: '“a single powerful burst of 12,000 kilograms thrust, lasting approximately two seconds” (Siddiqi p. 411). Not fired on this flight',
    },
    {
      name: 'Attitude jet',
      count: 16,
      thrustN: 1.5 * KGF,
      propellant: 'compressed gas',
      confidence: 'documented',
      note: 'the Vostok’s: two sets of eight, 1.5 kgf each (Siddiqi p. 197). Nothing read says the 3KV’s differed. Komarov turned the ship by hand on the sixth orbit (TASS, 13 October 1964)',
    },
  ],
  models: [vehicle],
};

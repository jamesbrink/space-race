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
/** The pilot's right, where the viewer's cutaway opens the ball: the film camera and one television camera are on this side. */
const RIGHT = 225;
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
// station 0 is 30.53 m up). Quoted here for the views; the numbers live there.
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
 * The slider takes the launch vehicle apart first and the spacecraft after it, as Vostok 1's does. Every part of the
 * launch vehicle is of order 0, so it is away by half way; the spacecraft's parts are of orders SHIP to SHIP + 2 of
 * SHIP + 2 (explode.ts: partProgress). Between about 0.4 and 0.45 the spacecraft stands alone and whole with its
 * antennas out: as it was in orbit.
 */
const SHIP = 9;
/** A reading of the spacecraft's own sequence (0 to 1) on the whole vehicle's slider. */
const later = (t: number) => (SHIP / (SHIP + 2)) * 0.5 + (1 - (SHIP / (SHIP + 2)) * 0.5) * t;

/** Moscow time on a day of August 1962, as seconds from liftoff at 11:02:33 on the 12th. */
const MSK = (day: number, h: number, m: number, s = 0) => ((day - 12) * 24 + h - 11) * 3600 + (m - 2) * 60 + (s - 33);

const parts: Part[] = [
  {
    node: 'DescentModule',
    group: 'Spacecraft',
    name: 'Descent module',
    summary: 'The second ball in orbit at the same time as another: 71 hours, the last of them at 10 °C.',
    detail:
      'A sphere needs no steering to survive entry: whichever way it meets the air the flow round it is the same, so ' +
      'all of it is heat shield and its weight is put low and behind the pilot to turn it heavy side first. This was ' +
      'the troublesome one of the pair: spacecraft No. 6 went through its full round of tests three times in the week ' +
      'before, and the launches first set for 9 and 10 August went on the 11th and 12th. Popovich lived in it for 71 ' +
      'hours, tidily: finding dust on a paper napkin, he took out the vacuum cleaner and ran it over the cabin, “just ' +
      'as it would have done on the ground”. It came down by its own parachute about thirteen minutes before he did. An ' +
      'encyclopedia article has it kept at the museum of the Zvezda works, which made the seat and the suit, refitted ' +
      'to stand for the Voskhod 2 cabin; no source is given there, and it was not confirmed.',
    facts: [
      ['Diameter', '2.3 m over the heat shield; pressure hull 2.2 m'],
      ['Mass', '2,460 kg (the type)'],
      ['Hatches', '3, each 1 m in the clear'],
      ['Portholes', '3, two of them in hatch covers'],
      ['Landed', 'about 09:46 Moscow time, 15 August, without its pilot'],
      ['Integrated tests before flight', '3 rounds, the last passed by 8 August'],
    ],
    explode: [0, LIFT, 0],
    order: SHIP + 1,
  },
  {
    node: 'EntryHatch',
    group: 'Spacecraft',
    name: 'Hatch No. 1',
    summary: 'The way in on the pad and the way out at 7 km, and the subject of a careful answer in Moscow.',
    detail:
      'Over the pilot’s head, on the line of his seat’s rails, with one of the three portholes in it. Popovich boarded ' +
      'through it on 12 August from the same lift and the same gantry Nikolayev had used the morning before; the pad ' +
      'had been cleared and a second rocket stood up on it overnight. Coming down, the hatch was thrown clear and the ' +
      'seat followed: “the ejection was smooth”, he reported. At the press conference of 21 August he was asked whether ' +
      'he had landed in the ship. As the BBC’s monitors took it down he said: “Like Herman Titov and Andrian ' +
      'Grigoryevich, I landed beside the ship.” Siddiqi quotes the same answer as “like Titov and Gagarin”, which would ' +
      'have given away what was still denied of Gagarin. Which he said was not settled here.',
    facts: [
      ['Clear diameter', '1 m'],
      ['Screws', '30 (counted on Vostok 1’s)'],
      ['Released', 'at about 7 km (the type)'],
      ['His answer on landing', '“beside the ship” (21 August 1962)'],
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
      'At the pilot’s left. Behind it is the container of the descent module’s parachute, which opened after the pilot ' +
      'had gone and set the empty ball down south of Karaganda 2 days, 22 hours and 44 minutes after liftoff, by the ' +
      'figure the Soviet encyclopedia printed: about 09:46 Moscow time, thirteen minutes before Popovich and six ' +
      'minutes after Vostok 3’s ball had landed to the east of it (200 km off, the pilots said; the places as printed ' +
      'are nearer 300 apart). The wind that morning was what Kamanin had argued about all night: up to twenty metres a ' +
      'second the day before.',
    facts: [
      ['Clear diameter', '1 m'],
      ['Parachute', '574 m², from a 330 litre container (the type)'],
      ['Landing speed', '10 m/s (the type)'],
      ['Ship’s flight', '2 d 22 h 44 min'],
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
    summary: 'The cabin that went cold: 10 °C and 35% humidity on the last morning, and no fourth day.',
    detail:
      'Fitted as Vostok 3’s was: loudspeakers and microphones for a man off his seat, lamps for the television, real ' +
      'food, a vacuum cleaner. Popovich let a pencil and his log book float for the camera, and shook a flask ' +
      'two-thirds full of water to watch the air scatter into bubbles and gather again into one. On the evening of 14 ' +
      'August the State Commission, with Khrushchev’s leave, gave him a fourth day; the cabin was then at 11 to 12 °C ' +
      'and falling. By seven the next morning it was at 10, the lowest allowed, with the humidity down to 35%; cold and ' +
      'dry together, Kamanin feared, would make it hard to keep him in oxygen. “I have taken every measure and the fall ' +
      'continues.” Told the press a week later: “the temperature in the cabin could be regulated at wish.” What is ' +
      'modelled is the type’s cabin with this flight’s cameras; nothing of what failed to hold the temperature was ' +
      'found.',
    facts: [
      ['Cabin temperature', '11 to 12 °C on 14 August; 10 °C on the morning of the 15th'],
      ['Relative humidity', '35% at the end: the lower limit'],
      ['Out of the seat', 'each day, about an hour'],
      ['Aboard', 'a vacuum cleaner, paper napkins, a flask of water'],
      ['Supplies', 'a double margin on three days (Bushuyev)'],
      ['Radiation dose', 'about 36 millirad (Yazdovsky)'],
    ],
    explode: [0, LIFT, 0],
    order: SHIP + 1,
  },
  {
    node: 'EjectionSeat',
    group: 'Spacecraft',
    inside: true,
    name: 'Ejection seat and pilot',
    summary: 'Popovich: the fourth man in orbit, and one end of the first conversation between two ships.',
    detail:
      'The seat lies across the ball, tilted so that its rails run out through hatch No. 1: escape system on the pad, ' +
      'landing system at the end. Once in orbit he looked for Vostok 3 where he had been told it would be and said he ' +
      'saw it at once, “something like a very small moon in the distance”; Siddiqi doubts either man ever saw the ' +
      'other’s ship. Nikolayev told him over the radio what leaving the seat was like, and he did the same: “a most ' +
      'pleasant sensation”. Kamanin thought he spent himself too freely. Quick nods of the head gave him “some ' +
      'abnormalities”; his pulse in orbit was 54 to 60; he slept with the suit’s fan off. On the last morning he ' +
      'radioed “I am observing a thunderstorm”, which was the agreed code for being sick; he meant a thunderstorm. The ' +
      'figure wears the SK-1 with СССР on the helmet, as the film of the morning shows him. It is the figure built to ' +
      'Gagarin’s recorded 1.65 m: no document with Popovich’s height was found.',
    facts: [
      ['Pilot', 'Pavel R. Popovich; a major at liftoff, a lieutenant colonel on landing'],
      ['Callsign', 'Berkut (Беркут, “Golden Eagle”)'],
      ['Pulse in orbit', '54 to 60 a minute (his report)'],
      ['Slept', 'from 21:30 on the first night; woken at 04:53'],
      ['Landed', '09:59 Moscow time, 15 August, 70 h 57 min after liftoff'],
    ],
    explode: [0, LIFT, 0],
    moves: [{ kind: 'slide', by: along(ENTRY.az, ENTRY.lat, 2.3), from: later(0.72), to: 1 }],
    order: SHIP + 1,
  },
  {
    node: 'TelevisionCameras',
    group: 'Spacecraft',
    inside: true,
    name: 'Television cameras',
    summary: 'The livelier half of the first television from orbit: a pencil and a log book let go in front of the lens.',
    detail:
      'By the time this ship flew the rebuilt Seliger system had been on the air for a day: 400 lines of 400 points, ' +
      'ten pictures a second, from two cameras of three kilograms in the cabin, turned into a broadcast picture at ' +
      'three ground stations and sent out by the Moscow television centre and across Europe. Nikolayev was reticent ' +
      'before it. Popovich performed: Siddiqi has him “animated and jocular”, showing the viewers pencils and his log ' +
      'book afloat in the cabin. The engineers at one station watched the same fault come round again, the ship’s ' +
      'speech transmitter blocking their television receiver, and its pictures went out with holes; their request to ' +
      'have the speech link silent during the pictures had been refused the day before. The cameras’ mass and power are ' +
      'documented; their ribbed case, bracket, lens and plug are read off the one photograph of a Seliger camera, and ' +
      'every size is estimated. The one that looks at his face is placed to give the view the received pictures show. ' +
      'Where the second stood is not known: it is put at his right.',
    facts: [
      ['System', 'Seliger, rebuilt: 400 lines of 400 elements, 10 frames/s'],
      ['Cameras', '2, each 3 kg and 12 W, on a one-inch vidicon'],
      ['Duty', '15 minutes on, an hour and a half off'],
      ['Received at', 'stations near Moscow, near Leningrad and in the Crimea'],
      ['Seen on', 'Soviet television, Intervision and Eurovision'],
      ['Case as modelled', '104 × 118 × 226 mm (estimated off a photograph)'],
    ],
    explode: [0, LIFT, 0],
    order: SHIP + 1,
  },
  {
    node: 'FilmCamera',
    group: 'Spacecraft',
    inside: true,
    name: 'Film camera',
    summary: 'A cine camera in the hand, for the horizon and the line between day and night.',
    detail:
      'The two ships of 1962 shared a filming programme drawn up from what Titov had brought back: Nikolayev had the ' +
      'Earth’s surface, Popovich the horizon and the terminator, taken in several runs. It is the edge of the air he ' +
      'was after: the views, he said, were “particularly striking when passing in or out of the Earth’s shadow”. ' +
      'Nothing read names the camera. It is built as the Konvas that Titov carried, because the bureau’s own history ' +
      'tells the three flights’ filming as one story and Siddiqi calls the instruments similar: an assumption, and so ' +
      'is its place at his right hand. Fixed film cameras that recorded the pilot himself were aboard too; nothing was ' +
      'found of their kind or place, and they are not built.',
    facts: [
      ['Kind', 'assumed: Konvas-Avtomat, 35 mm (as Vostok 2’s)'],
      ['Size', '290 × 260 × 240 mm, 5.7 kg (that type, as sold)'],
      ['His subject', 'the horizon and the terminator'],
    ],
    explode: [0, LIFT, 0],
    order: SHIP + 1,
  },
  {
    node: 'RetainingStraps',
    group: 'Spacecraft',
    name: 'Retaining straps',
    summary: 'Four steel bands and one lock; on this flight they are not heard of.',
    detail:
      'Four bands run from the instrument module’s ring over the sphere and meet in a single lock at its top, to be let ' +
      'go when the braking engine has done. Popovich’s report to the State Commission, as Kamanin wrote it down, says ' +
      'nothing of the separation at all, which for a man who complained of the length of his medical examination is ' +
      'some evidence that it gave him nothing to complain of. Each strap carries a hairpin antenna of the command link. ' +
      'They swing back as they would when released; how far they sprang is not recorded.',
    facts: [
      ['Straps', '4, joined by one pyrotechnic lock'],
      ['Released', 'after the braking burn; the time was not found'],
    ],
    explode: [0, 0, 0],
    moves: STRAPS.map((az, i) => outward(`Strap_${i + 1}`, az, 58, later(0.02 + 0.02 * i), later(0.2 + 0.02 * i))),
    order: SHIP,
  },
  {
    node: 'CableMast',
    group: 'Spacecraft',
    name: 'Cable mast',
    summary: 'One mast of cables between the two halves; no account says it held on this time.',
    detail:
      'Power, commands and telemetry cross from the instrument module to the cabin through one mast of cables, plugged ' +
      'into a plate on the side of the ball. Gagarin and Titov had both begun their entries with the two halves still ' +
      'tied together through it. Of this ship’s separation nothing was found either way beyond the silence of every ' +
      'account read, Popovich’s own included. What was changed in the mast or its cabling after Vostok 2 was not found, ' +
      'so it is built as the type’s.',
    facts: [
      ['Separation', 'no fault in any account read'],
      ['Changed after Vostok 2', 'not found'],
    ],
    explode: [0, 0, 0],
    moves: [outward('CableMast_Arm', MAST_AZ, 40, later(0.06), later(0.24))],
    order: SHIP,
  },
  {
    node: 'GasBottles',
    group: 'Spacecraft',
    name: 'Gas bottles',
    summary: 'Nitrogen for the jets: he turned the ship in the Earth’s shadow and wanted more of it to turn with.',
    detail:
      'A necklace of pressure spheres round the joint, outside both hulls. Most hold nitrogen for the attitude jets; ' +
      'the rest are the cabin’s oxygen reserve. The store was reckoned at two to three hours of orienting for the whole ' +
      'flight. Popovich oriented the ship by hand in the Earth’s shadow, watched the ground “run” under him, best where ' +
      'the cloud was thin, and reported that a ship could be pointed by the stars and by landmarks “if manual ' +
      'orientation were given more scope”. Sources give fourteen, sixteen and twelve bottles; fourteen are modelled, in ' +
      'sixteen places, with a gap where the cable mast passes.',
    facts: [
      ['Bottles', '14 modelled (sources: 12, 14, 16)'],
      ['Orienting store', '2 to 3 hours of turning (Kamanin)'],
      ['Oriented by hand', 'in the Earth’s shadow (his report)'],
    ],
    explode: [0, 0.5, 0],
    order: SHIP + 2,
  },
  {
    node: 'InstrumentModule',
    group: 'Spacecraft',
    inside: true,
    name: 'Instrument module',
    summary: 'Two cones base to base: the half that burned up, and the radio that found Vostok 3.',
    detail:
      'A sealed hull of two cones filled with dry nitrogen, carrying the batteries, radios, the orientation system and ' +
      'the braking engine, with power for a week. The aft cone is the radiator: shutters over it open and close to hold ' +
      'the temperature. Why this ship’s cabin went cold on the third day is not in anything read. Within the first ' +
      'orbit Popovich had Nikolayev on short wave: “communication with Sokol was very good, especially beyond the ' +
      'equator”. They compared what they saw (Nikolayev had Orion in his right-hand porthole; Popovich could see it ' +
      'too) and sang together. His one complaint of the radio was the VHF set, which switched itself on with a roar of ' +
      'noise before each session; he asked that the pilot be left to switch it on himself. The link on the pad had ' +
      'dropped out now and then.',
    facts: [
      ['Greatest diameter', '2.43 m'],
      ['Length', '2.25 m'],
      ['Mass', '2,270 kg (the type)'],
      ['Attitude jets', '2 sets of 8, 1.5 kgf each, nitrogen'],
      ['Power', 'for 7 days; 10 if saved (Chertok)'],
      ['Radio', 'short wave and VHF voice, to the ground and to Vostok 3'],
    ],
    explode: [0, 0, 0],
    order: SHIP + 2,
  },
  {
    node: 'Antennas',
    group: 'Spacecraft',
    name: 'Antennas',
    summary: 'Ten of the eleven, folded under the fairing; through them one ship spoke to another for the first time.',
    detail:
      'A fan of three whips by the frame, three long whips trailing from beside the engine, and four ribbon antennas ' +
      'standing aft: short-wave and VHF voice, the Signal beacon, telemetry, the command link and television. Korolev ' +
      'had told Chertok in February to make certain the two ships would hear each other, and the radio and antenna men ' +
      'worked on it through the spring; what, if anything, that changed on the ship was not found, so no antenna is ' +
      'added or moved. Under the fairing they were folded against the hull. How has not been found: here they are drawn ' +
      'withdrawn into the hull and slide out, which is not how it was done. Which antenna served which system is not ' +
      'known to us.',
    facts: [
      ['Modelled here', '10: a fan of 3, 3 long whips, 4 ribbons'],
      ['On the type', '11: 3 Signal, 4 Zarya, 2 telemetry, 2 command'],
      ['Ship to ship', 'short wave; clearest at 55 to 60° south'],
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
    summary: 'One engine with no spare, lit on the forty-ninth orbit after forty minutes’ argument on the ground.',
    detail:
      'Isaev’s S5.4: 1.6 tonnes of thrust for up to 45 seconds on self-igniting propellants, with four small steering ' +
      'nozzles round the chamber. It can be lit to land in the Soviet Union only on certain orbits, and on the morning ' +
      'of 15 August the forty-ninth, the one first planned, was coming up when the cold cabin and the word ' +
      '“thunderstorm” reached the State Commission: forty minutes, Kamanin wrote, in which to decide. It fired six ' +
      'minutes after Vostok 3’s, so that two ships launched a day apart came down within minutes of each other. How ' +
      'long it burned and at what minute were not found for this ship.',
    facts: [
      ['Thrust', '1,614 kgf (15.8 kN)'],
      ['Propellant', '280 kg: amine fuel and nitric acid'],
      ['Burn', '45 s at most; this flight’s was not found'],
      ['Lit', '15 August, on the 49th orbit, six minutes after Vostok 3’s'],
    ],
    explode: [0, -0.9, 0],
    order: SHIP + 2,
  },
];

const BOOSTER_DETAIL =
  'A cone 19.2 m long on a short cylinder, with its own RD-107: four fixed chambers and two small ones that swivel ' +
  'to steer, all fed by one turbopump driven by steam from hydrogen peroxide. The whole cone is its oxygen tank, ' +
  'white with frost in the heat of the steppe; the kerosene is in the cylinder under it. It is not bolted on. Its ' +
  'tip is a steel ball in a cup on the core, and its thrust holds it there; two ties at the foot keep it from ' +
  'swinging. When its engine is throttled back the ties are let go, and what thrust is left swings the foot outward ' +
  'until the ball drops out of its cup. Four doing this at once draw a cross in the sky. The triangle at the foot ' +
  'is an air rudder. Nikolayev, passing overhead with his ship turned to look, did not see these four light.';

const launcherParts: Part[] = [
  {
    node: 'Fairing',
    group: 'Third stage',
    name: 'Fairing',
    summary: 'Two halves, and a round hole to be thrown out through.',
    detail:
      'It covers the ship through the thick air and is dropped in two halves some two and a half minutes up. The round ' +
      'opening is over hatch No. 1: the way aboard from the lift, and the way out on the seat if the rocket failed on ' +
      'the pad or low in the climb. This one stood on a pad that had been fired from twenty-three and a half hours ' +
      'before, a thing not done with a crew until then, by a launch team on its second day without rest. Its lengths ' +
      'are from a NASA drawing and the curve of its nose from the vehicles kept at Kaluga and in Moscow; nothing read ' +
      'says this flight’s differed from Vostok 1’s.',
    facts: [
      ['Length', '6.6 m'],
      ['Diameter', '2.7 m'],
      ['Mass', 'about 0.8 t'],
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
    summary: 'It had to put the second ship beside the first, and did: within two kilometres in height and 0.03° in tilt.',
    detail:
      'Built in nine months of 1958 to throw a probe at the Moon, then given a longer adapter for the Vostok. Its tanks ' +
      'are two rings with the engine in the hole, and it is steered by its own turbine’s exhaust. A Vostok cannot ' +
      'change its orbit, so the “group flight” was this stage’s work and the clock’s: leave the pad at the second when ' +
      'the turning Earth has carried it under the first ship’s track, and shut down at the right speed. The launch was ' +
      'within half a second of the time set three days before. The orbit came out at 179.8 by 236.7 km and 64.95° ' +
      'against Vostok 3’s 180.7 by 234.6 and 64.98°, and the ships began some five kilometres apart; a day later they ' +
      'were 850 km apart. Abroad it was taken for a rendezvous. “A sleight of hand isn’t any kind of fraud,” Mishin ' +
      'said afterwards.',
    facts: [
      ['Length', '2.98 m with its adapter'],
      ['Diameter', '2.58 m'],
      ['Mass', '7,984 kg fuelled, 1,472 kg burnt out'],
      ['Engine', 'RD-0109: 54.5 kN in vacuum, 121 kg'],
      ['Engine’s size', '1,555 mm long; nozzle exit 733 mm across'],
      ['Orbit reached', '179.8 × 236.7 km, 64.95°'],
      ['Nearest to Vostok 3', 'about 5 km (the pilots); 6.5 km (TASS)'],
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
      'Block E is lit while the core under it is still burning and holding everything down in the tanks, and only then ' +
      'is the core cut loose. For a moment the upper engine fires straight at the top of the stage below. The fire has ' +
      'to go somewhere: out between the struts of this lattice, turned aside by the cone on the core’s top. The seconds ' +
      'of this flight’s staging were not found.',
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
    summary: 'Second stage, though it lights first; the second to stand on this pad in two days.',
    detail:
      'Called the second stage, but its engine starts on the pad with the boosters’, because an engine that failed to ' +
      'start on the ground could be shut down and tried again. It carries twice a booster’s propellant and burns two ' +
      'and a half times as long. Its shape follows from the boosters round it: narrow at the foot where they crowd in, ' +
      'widest 20 m up where their tips push on a heavy frame. Both rockets had waited side by side in the assembly ' +
      'building since before the cosmonauts arrived. The schedule was three days’ work without rest: ready the first, ' +
      'launch it and ready the second, launch the second. The number E103-22 is from two launch lists, which give the ' +
      'lower number to the later flight; Siddiqi’s log leaves it blank. Every station between the core’s ends is ' +
      'estimated: no drawing of it has been read.',
    facts: [
      ['Vehicle', '8K72K No. E103-22 (launch lists; blank in Siddiqi’s log)'],
      ['Length', '27.5 m; 28.75 m with the lattice'],
      ['Diameter', '2.05 m at the foot, 2.95 m at the frame'],
      ['Mass', 'about 100 t at liftoff, 7 to 8 t empty'],
      ['Propellant', '90 t'],
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
      'corners, fed through their own pivots; they also give the last, fine push after the main chambers shut down. ' +
      'With the boosters’ engines that makes twenty large nozzles and twelve small: thirty-two chambers lit on the ' +
      'ground, each by its own pyrotechnic igniter. Popovich’s pulse went to 130 while they burned, Yazdovsky said; ' +
      'TASS on the day had said 104.',
    facts: [
      ['Thrust', '744 kN at the ground, 945 kN in vacuum'],
      ['Specific impulse', '248 s at the ground, 315 s in vacuum'],
      ['Chambers', '4 fixed, 4 steering of 2.5 tf'],
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
  url: 'models/ussr/vostok/vostok-4/vehicle.glb',
  scale: '38.36 m on the pad · 10.3 m across the rudders · to scale',
  // The vehicle alone: Site 1 as it stood in August 1962 is not built for this flight yet, so it is shown in the gallery only.
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
    { id: 'third', label: 'Third stage', nodes: ['Interstage', 'BlockE'], from: along(60, 4, 1) },
    { id: 'fairing', label: 'Fairing', nodes: ['Fairing'], from: along(ENTRY.az, 10, 1) },
    // each of these is of named parts, so it stays on them as the slider takes the vehicle apart
    { id: 'spacecraft', label: 'Spacecraft', nodes: SPACECRAFT },
    { id: 'descent', label: 'Descent module', nodes: ['DescentModule'] },
    { id: 'hatch', label: 'Entry hatch', nodes: ['EntryHatch'], from: along(ENTRY.az, 12, 1) },
    // (through the cutaway's opening, from his right and a little toward his feet: both cameras, and the man they look at)
    { id: 'television', label: 'Television', nodes: ['TelevisionCameras'], from: along(RIGHT - 18, 20, 1) },
    // (from a little aft of his right side: the turret, the magazine and the viewfinder all show)
    { id: 'konvas', label: 'Film camera', nodes: ['FilmCamera'], from: along(RIGHT - 32, 24, 1) },
    { id: 'instrument', label: 'Instrument module', nodes: ['InstrumentModule', 'GasBottles', 'Antennas'] },
    { id: 'engine', label: 'Braking engine', nodes: ['RetroEngine'], from: along(250, -32, 1) },
  ],
};

export const flight: Flight = {
  id: 'ussr/vostok/vostok-4',
  nation: 'USSR',
  agency: 'OKB-1',
  program: 'Vostok',
  designation: 'Vostok 4',
  callsign: 'Berkut (Беркут)',
  spacecraft: 'Vostok 3KA No. 6',
  launchVehicle: 'Vostok-K 8K72K, No. E103-22',
  // 11:02:33 Moscow time (Siddiqi's launch log; spacefacts.de). TASS and Keldysh: 11:02. McDowell's launch log has 08:02:17 UTC;
  // Kamanin's diary as printed has 11:08, against his own record of Nikolayev's report (README.md, "Where the sources disagree").
  launch: '1962-08-12T08:02:33Z',
  launchSite: SITE1.name,
  site: SITE1,
  crew: ['Pavel R. Popovich'],
  summary:
    'The second ship of the first group flight. Forty-eight orbits from the pad Vostok 3 had left a day before, into an orbit ' +
    'that began five kilometres from it: three days of talk between two ships, television, a cabin that went cold, and a ' +
    'landing by parachute south of Karaganda within minutes of Nikolayev’s.',
  facts: [
    { label: 'Liftoff', value: '12 August 1962, 08:02:33 UTC (11:02 Moscow time)' },
    { label: 'Pilot', value: 'Pavel R. Popovich' },
    { label: 'Duration', value: '70 h 57 min to his landing; the ship 70 h 44 min' },
    { label: 'Orbits', value: '48' },
    { label: 'Orbit', value: '179.8 × 236.7 km, 64.95°' },
    { label: 'Mass in orbit', value: '4,728 kg' },
    { label: 'Nearest to Vostok 3', value: 'about 5 km (the pilots) or 6.5 km (TASS), on the first orbit' },
    { label: 'Landing', value: 'south of Karaganda, 48°09′N 71°51′E' },
  ],
  // Moscow times from Kamanin's diary (his own notes and his record of the pilots' reports), the TASS reports as Flight
  // International printed them, and Siddiqi; this flight's ascent was not found in seconds (README.md)
  timeline: [
    { t: 0, event: 'Liftoff, 11:02:33 Moscow time, from the pad Vostok 3 left 23 h 32 min before' },
    {
      t: MSK(12, 11, 20),
      event: 'In orbit some five kilometres from Vostok 3; he looks for it, and soon the two are talking on short wave',
    },
    { t: MSK(12, 12, 12), event: 'TASS gives both orbits: 177.9 by 234.8 km and, for Vostok 3, 176.7 by 227.6 km' },
    { t: MSK(12, 21, 30), event: 'He goes to sleep, half an hour after Nikolayev' },
    { t: MSK(13, 4, 53), event: 'He is woken at 04:53, after seven hours' },
    {
      t: MSK(14, 7, 0),
      event: 'The State Commission sets both landings for the 15th: Vostok 4 on its 49th orbit, a day later than first planned',
    },
    {
      t: MSK(14, 17, 0),
      event:
        'The Commission, with Khrushchev’s leave, offers a fourth day; asked, he says he feels first rate; the cabin is at 11 to 12 °C',
    },
    { t: MSK(15, 4, 0), event: 'He wakes and reports the temperature and humidity still falling, whatever he does' },
    {
      t: MSK(15, 7, 0),
      event: '10 °C and 35% humidity; then his message “I am observing a thunderstorm”, the code for sickness. He meant the weather',
    },
    { t: MSK(15, 9, 46), event: 'The descent module lands south of Karaganda (the ship’s 2 d 22 h 44 min)' },
    {
      t: MSK(15, 9, 59),
      event:
        'Popovich lands by parachute in a hard wind, minutes after Nikolayev and to the west of him: 200 km by their account, nearer 300 by the places as printed',
    },
  ],
  specs: [
    {
      group: 'Spacecraft',
      label: 'Length, without antennas',
      value: 4.4,
      unit: 'm',
      confidence: 'documented',
      note: '4.4 m, the type (Siddiqi, Challenge to Apollo, p. 195; the Soviet encyclopedia text: «длина (без антенн) 4,4 м»). Keldysh, 21 August 1962: the ship “coincides approximately with Vostok 1 and Vostok 2 in weight and dimensions”',
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
      label: 'Mass in orbit',
      value: 4728,
      unit: 'kg',
      confidence: 'documented',
      note: '4,728 kg (Siddiqi, Challenge to Apollo, Table IB). Not given out at the time: asked on 21 August 1962, Popovich and Keldysh each said “about five tons”. 6 kg more than Vostok 3',
    },
    {
      group: 'Spacecraft',
      label: 'Descent module mass',
      value: 2460,
      unit: 'kg',
      confidence: 'documented',
      note: '2.46 t for the type (Siddiqi p. 195). No. 6’s own figure has not been found',
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
      value: 179.8,
      unit: 'km',
      confidence: 'documented',
      note: '179.8 km (Siddiqi, p. 357 and Table IB, “initial orbital parameters”). TASS at 12:12 on the day: 177.9 km. No OKB-1 report of this flight has been read',
    },
    {
      group: 'Spacecraft',
      label: 'Apogee',
      value: 236.7,
      unit: 'km',
      confidence: 'documented',
      note: '236.7 km (Siddiqi, p. 357 and Table IB). TASS at 12:12 on the day: 234.8 km',
    },
    {
      group: 'Spacecraft',
      label: 'Inclination',
      value: 64.95,
      unit: 'deg',
      confidence: 'documented',
      note: '64.95° (Siddiqi, p. 357 and Table IB); 64°57′ in the TASS report of 12:12 on the day',
    },
    {
      group: 'Spacecraft',
      label: 'Period',
      value: 88.3,
      unit: 'min',
      confidence: 'documented',
      note: '88.3 min (TASS, as of 12:12 Moscow time on 12 August 1962, in Flight International, 23 August 1962, p. 289). 88.39 is printed beside 179.8 × 236.7 km, which over a sphere of 6,371 km give 88.5 by Kepler’s law',
    },
    {
      group: 'Spacecraft',
      label: 'Cabin temperature, least',
      value: 10,
      unit: '°C',
      confidence: 'documented',
      note: '11 to 12 °C on the evening of 14 August; 10 °C, “the lower limit of the norm”, and 35% humidity by 07:00 on the 15th (Kamanin’s diary, 18 August 1962; Chertok, vol. 3, p. 207). What had failed was not found',
    },
    {
      group: 'Spacecraft',
      label: 'Television camera, mass',
      value: 3,
      unit: 'kg',
      confidence: 'documented',
      note: 'each of the two Seliger cameras: 3 kg, 12 W, on a one-inch vidicon LI-23 (Efimov, «Путь к “Востоку”», Elektrosvyaz, 2007; the same, Tele-Sputnik, 1996 No. 5). For this flight 400 lines of 400 elements, 10 frames a second',
    },
    {
      group: 'Spacecraft',
      label: 'Television camera, case length as modelled',
      value: 0.226,
      unit: 'm',
      confidence: 'estimated',
      note: 'no dimension of the camera was found. The case is 104 × 118 × 226 mm in the model, scaled off the one photograph of a Seliger camera (Efimov) by its one-inch tube and its plug; where the two stood in the cabin is estimated too',
    },
    {
      group: 'Spacecraft',
      label: 'Film camera, length as modelled',
      value: 0.29,
      unit: 'm',
      confidence: 'estimated',
      note: 'that a cine camera was worked by hand on this flight is documented (RKK Energia 1946–1996, p. 116; Siddiqi p. 358: Popovich “photographed Earth’s horizon and terminator during several runs”); what kind is not. It is built as Vostok 2’s Konvas-Avtomat, 290 × 260 × 240 mm as a type: an assumption',
    },
    {
      group: 'Spacecraft',
      label: 'Pilot height, as modelled',
      value: 1.65,
      unit: 'm',
      confidence: 'estimated',
      note: 'assumed: the figure in the seat is the one built to Gagarin’s recorded 165 cm. No document with Popovich’s height was found',
    },
    {
      group: 'Launch vehicle',
      label: 'Length on the pad',
      value: 38.36,
      unit: 'm',
      confidence: 'documented',
      note: '38.36 m with the fairing, the type (Minakov, «Ракета, поднявшая в космос Ю. Гагарина», Modelist-Konstruktor, table; Siddiqi, Challenge to Apollo, table of launch vehicles)',
    },
    {
      group: 'Launch vehicle',
      label: 'Width over the air rudders',
      value: 10.3,
      unit: 'm',
      confidence: 'documented',
      note: '10.3 m (Minakov; Siddiqi)',
    },
    {
      group: 'Launch vehicle',
      label: 'Liftoff mass',
      value: 287000,
      unit: 'kg',
      confidence: 'documented',
      note: '287 t, the type’s figure and Vostok 1’s (RKK Energia 1946–1996; Minakov; Siddiqi). No. E103-22’s own was not found; its spacecraft was 6 kg heavier than Vostok 3’s',
    },
    {
      group: 'Launch vehicle',
      label: 'Core with the lattice',
      value: 28.75,
      unit: 'm',
      confidence: 'documented',
      note: '28.75 m (Minakov: «Длина 2-й ступени с переходной фермой»), taken from the nozzles’ exits; the lattice is 1.26 m of it',
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
      label: 'Strap-on length',
      value: 19.2,
      unit: 'm',
      confidence: 'documented',
      note: '19.2 m without the nozzles (Minakov); 19.8 m with them (RussianSpaceWeb; Brügge)',
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
      label: 'Third stage with its adapter',
      value: 2.98,
      unit: 'm',
      confidence: 'documented',
      note: '2.98 m long, 2.58 m across (Minakov). Brügge has 2.86 m by 2.47; Encyclopedia Astronautica 2.84 by 2.56',
    },
    {
      group: 'Launch vehicle',
      label: 'Fairing',
      value: 6.63,
      unit: 'm',
      confidence: 'documented',
      note: '6.6 m long and 2.7 m across (Minakov); 6.63 is his 9.61 m for stage and fairing less 2.98. Its shape is estimated, and assumed the same as Vostok 1’s',
    },
    {
      group: 'Launch vehicle',
      label: 'Launch azimuth',
      value: 37.5,
      unit: 'deg',
      confidence: 'derived',
      note: 'east of north, for an orbit inclined 64.95° from latitude 45.92°, before the Earth’s turning is allowed for. The azimuth as flown was not found',
    },
  ],
  motors: [
    {
      name: 'RD-107 (8D74), one in each strap-on',
      count: 4,
      thrustN: 815900,
      burnS: 118,
      propellant: 'kerosene T-1 / liquid oxygen',
      kind: 'liquid',
      confidence: 'documented',
      note: '815.9 kN at the ground, 997.7 kN in vacuum; 256 and 313 s (NPO Energomash’s table by vehicle (row 8K72K), as reproduced by Brügge). The burn is the type’s, 118 s (Minakov): the time the strap-ons left on this flight was not found (Vostok 1: 119 s)',
    },
    {
      name: 'RD-108 (8D75), core',
      count: 1,
      thrustN: 744300,
      burnS: 290,
      propellant: 'kerosene T-1 / liquid oxygen',
      kind: 'liquid',
      confidence: 'documented',
      note: '744.3 kN at the ground, 945.4 kN in vacuum; 248 and 315 s (the same table). The burn is the type’s, 290 s (Minakov; others print up to 301): this flight’s cutoff was not found (Vostok 1: 300 s)',
    },
    {
      name: 'RD-0109 (8D719), third stage',
      count: 1,
      thrustN: 54500,
      propellant: 'kerosene / liquid oxygen',
      kind: 'liquid',
      confidence: 'documented',
      note: '54.5 kN in vacuum, 323.5 s (Brügge; Encyclopedia Astronautica 54.52 kN, 324 s). No burn time is given: rated burns in print run from 365 to 440 s, and this flight’s was not found (Vostok 3’s was counted to shutdown at 687 s from liftoff the day before)',
    },
    {
      name: 'TDU-1 (Isaev S5.4) braking engine',
      count: 1,
      thrustN: 1614 * KGF,
      burnS: 45,
      propellant: 'amine fuel (TG-02) / nitric acid (AK-20F)',
      kind: 'liquid',
      confidence: 'documented',
      note: '1.614 tf, 45 s at most (Siddiqi p. 197); 280 kg of propellant. Flown on the morning of 15 August, six minutes after Vostok 3’s (Siddiqi p. 360; Chertok); neither its minute nor its length was found',
    },
    {
      name: 'Attitude jet',
      count: 16,
      thrustN: 1.5 * KGF,
      propellant: 'compressed nitrogen',
      confidence: 'documented',
      note: 'two independent sets of eight, 1.5 kgf each (Siddiqi p. 197; the encyclopedia text gives 14.7 N). The store was worth 2 to 3 hours of orienting (Kamanin, 26 July 1962); worked by hand in the Earth’s shadow (Popovich’s report to the State Commission, as Kamanin wrote it down)',
    },
  ],
  models: [vehicle],
};

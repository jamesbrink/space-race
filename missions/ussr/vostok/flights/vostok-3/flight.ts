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

/** Moscow time on a day of August 1962, as seconds from liftoff at 11:30:00 on the 11th. */
const MSK = (day: number, h: number, m: number, s = 0) => ((day - 11) * 24 + h - 11) * 3600 + (m - 30) * 60 + s;

const parts: Part[] = [
  {
    node: 'DescentModule',
    group: 'Spacecraft',
    name: 'Descent module',
    summary: 'The ball a man lived in for four days, and for an hour of each floated loose in.',
    detail:
      'A sphere needs no steering to survive entry: whichever way it meets the air the flow round it is the same, so ' +
      'all of it is heat shield and its weight is put low and behind the pilot to turn it heavy side first. Nikolayev ' +
      'was in this one for 94 hours, longer than every flight before it put together. Coming down he watched his ' +
      'porthole: first smoke, then flame, “not just one colour, but red, orange, yellow, green, blue”, with a crackling ' +
      'that made him wonder for a moment whether the shield was coming away; then a shaking “as if one were travelling ' +
      'in a cart along a bad road”, and eight or nine g, which he said he bore better than on the centrifuge. The ball ' +
      'landed without him some twelve minutes before he did. A museum listing has it kept today at the memorial in his ' +
      'village, Shorshely in Chuvashia; that was not checked against the museum’s own record.',
    facts: [
      ['Diameter', '2.3 m over the heat shield; pressure hull 2.2 m'],
      ['Mass', '2,460 kg (the type)'],
      ['Hatches', '3, each 1 m in the clear'],
      ['Portholes', '3, two of them in hatch covers'],
      ['Landed', 'about 09:40 Moscow time, 15 August, without its pilot'],
      ['Load at entry', '8 to 9 g (his report)'],
    ],
    explode: [0, LIFT, 0],
    order: SHIP + 1,
  },
  {
    node: 'EntryHatch',
    group: 'Spacecraft',
    name: 'Hatch No. 1',
    summary: 'The way in on the pad and the way out at 7 km; the seat came back out through it two days before launch.',
    detail:
      'Over the pilot’s head, on the line of his seat’s rails, with one of the three portholes in it. On the evening of ' +
      '9 August, with the rocket due to roll out at seven, a small washer that had been rejected and replaced by a ' +
      'larger one turned up among the seat’s spares, and nobody could say which kind was in the seats themselves: they ' +
      'had been put together, Kamanin wrote, “by a crowd”, without a signature for each step. Vostok 4’s seat was still ' +
      'on the bench. This ship’s was already aboard, and had to be drawn out through this hatch to be looked at. ' +
      'Korolev’s rage at the engineer and the fitter was remembered by everyone present; the rocket reached the pad two ' +
      'hours late, at nine. Nikolayev went in through it two hours before liftoff on the 11th, and out of it on his ' +
      'seat four days later.',
    facts: [
      ['Clear diameter', '1 m'],
      ['Screws', '30 (counted on Vostok 1’s)'],
      ['Seat drawn out and checked', '9 August, about 17:00 to 21:00'],
      ['Released', 'at about 7 km (the type)'],
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
      'had gone and set the empty ball down in the stony hills south of Karaganda 3 days, 22 hours, 9 minutes and 59 ' +
      'seconds after liftoff, by the figure the Soviet encyclopedia printed: about 09:40 Moscow time, twelve minutes ' +
      'before Nikolayev. The ground there was strewn with rocks. He came down, by his own account, on a level patch two ' +
      'metres square.',
    facts: [
      ['Clear diameter', '1 m'],
      ['Parachute', '574 m², from a 330 litre container (the type)'],
      ['Landing speed', '10 m/s (the type)'],
      ['Ship’s flight', '3 d 22 h 9 min 59 s'],
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
    summary: 'Fitted for four days: food that was food, a voice link that worked off the seat, and 13 °C by his own choice.',
    detail:
      '“More advanced and more comfortable” than Gagarin’s and Titov’s, Nikolayev told the press, with “no fundamental ' +
      'differences in the structure”. What the record adds: loudspeakers and microphones about the cabin, so that a man ' +
      'out of his seat was heard on the ground and heard it from wherever he floated (Keldysh); lamps that flooded the ' +
      'cabin for each television session; meals of cutlets, veal, chicken, pies and fruit, the first not squeezed from ' +
      'tubes; a broadcast receiver; and a double margin of supplies for the three days planned. The cabin was at 27 °C ' +
      'at liftoff, 13 by the twenty-ninth orbit, and stayed there: he said he was keeping it low on purpose. The Globus ' +
      'that Titov could not reach he found “easy and useful”. What is modelled is the type’s cabin with this flight’s ' +
      'cameras. No picture or drawing of the loudspeakers, the lamps or the food lockers was found, and none is built.',
    facts: [
      ['Cabin temperature', '27 °C at liftoff; 13 °C from the 29th orbit; 12 °C on 14 August'],
      ['Pressure', '1.1 atm (his report of 14 August)'],
      ['Relative humidity', '50% before liftoff; 70% on 14 August'],
      ['Meals', 'four a day, not from tubes'],
      ['Supplies', 'a double margin on three days (Bushuyev)'],
      ['Radiation dose', 'about 50 millirad (Yazdovsky)'],
    ],
    explode: [0, LIFT, 0],
    order: SHIP + 1,
  },
  {
    node: 'EjectionSeat',
    group: 'Spacecraft',
    inside: true,
    name: 'Ejection seat and pilot',
    summary: 'Nikolayev, 32: the first to undo his straps and float, and four days without being ill.',
    detail:
      'The seat lies across the ball, tilted so that its rails run out through hatch No. 1: escape system on the pad, ' +
      'landing system at the end. Nobody had left it in orbit before. Getting out took ten operations in the right ' +
      'order, practised in an airliner flying arcs of 25 seconds; in orbit he did it four times, an hour or so each, ' +
      'the first “very carefully”: let go, he was drawn up and forward. Loose in the cabin he talked to the ground and ' +
      'to Popovich, filmed, and turned about his own long axis. Yazdovsky had warned him to expect nausea on the sixth ' +
      'orbit, where Titov’s began. It never came, and on the fourth day he shook his head hard from side to side to ' +
      'look for it. He had found on reaching orbit that he sat higher in the seat than he should, which made the ship ' +
      'awkward to orient. The figure wears the SK-1 with СССР on the helmet, as the film of the morning shows him. It ' +
      'is the figure built to Gagarin’s recorded 1.65 m: no document with Nikolayev’s height was found.',
    facts: [
      ['Pilot', 'Andriyan G. Nikolayev, 32; a captain at liftoff, a major two hours later'],
      ['Callsign', 'Sokol (Сокол, “Falcon”)'],
      ['Out of the seat', '4 times, about an hour each'],
      ['Slept', 'from 22:00 on the first night, seven hours'],
      ['Landed', '09:52 Moscow time, 15 August, 94 h 22 min after liftoff'],
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
    summary: 'Two cameras of three kilograms: the first live television from a spacecraft with a man in it.',
    detail:
      'Gagarin and Titov had been watched by cameras like these, but only by the engineers at the receiving stations, ' +
      'and at a hundred lines. For this flight the television institute in Leningrad rebuilt its Seliger system: a new ' +
      'tube, amplifier and scanning in each camera gave 400 lines of 400 points, still ten pictures a second, on a new ' +
      'transmitter. At three ground stations, near Moscow, near Leningrad and in the Crimea, the square picture was ' +
      'shown on a bright tube and looked at by an ordinary studio camera, slow enough itself to smooth the flicker ' +
      'away, and sent on to the Moscow television centre. On the seventh orbit, six hours after liftoff, the country ' +
      'saw Nikolayev move his head and hands, and Europe saw him by Intervision and Eurovision. He knew from his board ' +
      'when a session began, and the cabin was flooded with light for it. At one station the speech transmitter blocked ' +
      'the television receiver, and its pictures went out with holes. The cameras’ mass and power are documented; their ' +
      'ribbed case, bracket, lens and plug are read off the one photograph of a Seliger camera, and every size is ' +
      'estimated. The one that looks at his face is placed to give the view the received pictures show. Where the ' +
      'second stood is not known: it is put at his right.',
    facts: [
      ['System', 'Seliger, rebuilt: 400 lines of 400 elements, 10 frames/s'],
      ['Before this flight', '100 lines of 100 elements'],
      ['Cameras', '2, each 3 kg and 12 W, on a one-inch vidicon'],
      ['Duty', '15 minutes on, an hour and a half off'],
      ['First broadcast', '11 August 1962, on the seventh orbit'],
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
    summary: 'A cine camera in the hand: the Earth’s surface, the Moon, a sunrise.',
    detail:
      'Titov’s ten minutes of film had been studied, and the two ships of 1962 were given a programme made from it: ' +
      'Nikolayev was to film the Earth’s surface, Popovich the horizon and the line between day and night. He filmed ' +
      'while loose in the cabin. Asked in Moscow whether he had used his cine camera, he said he had taken the Moon, ' +
      'close to full that week and “much more spherical” than it looks from the ground, the Sun rising, and coastlines; ' +
      'the first time the Moon came into the porthole he was afraid of missing it, and then it was there on every ' +
      'orbit. Nothing read names the camera. It is built as the Konvas that Titov carried, because the bureau’s own ' +
      'history tells the three flights’ filming as one story and Siddiqi calls the instruments similar: an assumption, ' +
      'and so is its place at his right hand. Fixed film cameras that recorded the pilot himself were aboard too; ' +
      'nothing was found of their kind or place, and they are not built.',
    facts: [
      ['Kind', 'assumed: Konvas-Avtomat, 35 mm (as Vostok 2’s)'],
      ['Size', '290 × 260 × 240 mm, 5.7 kg (that type, as sold)'],
      ['His subject', 'the Earth’s surface'],
      ['Also filmed', 'the Moon, a sunrise, coastlines'],
    ],
    explode: [0, LIFT, 0],
    order: SHIP + 1,
  },
  {
    node: 'RetainingStraps',
    group: 'Spacecraft',
    name: 'Retaining straps',
    summary: 'Four steel bands and one lock; nothing is recorded against them on this flight.',
    detail:
      'Four bands run from the instrument module’s ring over the sphere and meet in a single lock at its top. After the ' +
      'braking engine had run, the lock let them go: “the ship was separated from the instrument section”, Nikolayev ' +
      'said, “and then the process of the descent itself took place”. No account read reports any trouble with it, ' +
      'which after the first two flights is worth saying. Each strap carries a hairpin antenna of the command link. ' +
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
    summary: 'The joint that had twice refused to part; this time nobody mentions it.',
    detail:
      'Power, commands and telemetry cross from the instrument module to the cabin through one mast of cables, plugged ' +
      'into a plate on the side of the ball. On both earlier flights the plate did not come away when the modules ' +
      'parted, and each pilot began his entry tied to the other half of his ship; after Titov’s, Chertok traced it to a ' +
      'cable run where a knife cut it too soon. Nikolayev’s report to the State Commission goes from the engine’s 42 ' +
      'seconds straight to the turning of the ball in the thick air, and no other account read speaks of a late ' +
      'separation. What was changed in the mast or its cabling in the year between was not found, so it is built as the ' +
      'type’s.',
    facts: [
      ['Separation', 'on time, by every account read'],
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
    summary: 'Nitrogen for the jets: two or three hours of turning, to last four days.',
    detail:
      'A necklace of pressure spheres round the joint, outside both hulls. Most hold nitrogen for the attitude jets; ' +
      'the rest are the cabin’s oxygen reserve. Kamanin put the store at two to three hours of orienting, which is why ' +
      'the pilots were given a short list of things to turn the ship for: the spent third stage, the other ship, the ' +
      'second launch. Left alone after orienting, the ship drifted round once in 1.8 hours. The plan had been to set it ' +
      'turning every 12 minutes for even heating; Korolev dropped that on 4 August, the reconnaissance ship flown the ' +
      'week before having held 17 °C for four days without. Fifteen minutes before Popovich’s launch Nikolayev turned ' +
      'his ship, had it pitched 73° at 11:03, looked for the rocket, and saw nothing. Sources give fourteen, sixteen ' +
      'and twelve bottles; fourteen are modelled, in sixteen places, with a gap where the cable mast passes.',
    facts: [
      ['Bottles', '14 modelled (sources: 12, 14, 16)'],
      ['Orienting store', '2 to 3 hours of turning (Kamanin)'],
      ['Drift when left', '0.06°/s: once round in 1.8 h'],
    ],
    explode: [0, 0.5, 0],
    order: SHIP + 2,
  },
  {
    node: 'InstrumentModule',
    group: 'Spacecraft',
    inside: true,
    name: 'Instrument module',
    summary: 'Two cones base to base: power for a week, and a radio that now had a second ship to talk to.',
    detail:
      'A sealed hull of two cones filled with dry nitrogen, carrying the batteries, radios, the orientation system and ' +
      'the braking engine. The aft cone is the radiator: shutters over it open and close to hold the temperature. ' +
      'Chertok told Korolev before the flight that the batteries would carry seven days, ten if power was saved. His ' +
      'other task was the one new thing asked of the radio: that two ships hear each other, and the ground hear both. ' +
      'The voice links were short wave and VHF, as before. On the first day the link to the ground was noisy, and ' +
      'Nikolayev heard half of what Khrushchev said to him; ship to ship it was best far south, at 55 to 60°, “as if we ' +
      'were standing next to each other”. For ten orbits of one night the Tral telemetry did not record. It burned up ' +
      'on 15 August.',
    facts: [
      ['Greatest diameter', '2.43 m'],
      ['Length', '2.25 m'],
      ['Mass', '2,270 kg (the type)'],
      ['Attitude jets', '2 sets of 8, 1.5 kgf each, nitrogen'],
      ['Power', 'for 7 days; 10 if saved (Chertok)'],
      ['Radio', 'short wave and VHF voice, to the ground and to Vostok 4'],
    ],
    explode: [0, 0, 0],
    order: SHIP + 2,
  },
  {
    node: 'Antennas',
    group: 'Spacecraft',
    name: 'Antennas',
    summary: 'Ten of the eleven, folded under the fairing and out at the 720th second.',
    detail:
      'A fan of three whips by the frame, three long whips trailing from beside the engine, and four ribbon antennas ' +
      'standing aft: short-wave and VHF voice, the Signal beacon, telemetry, the command link and television. “At the ' +
      '720th second the ship parted from its carrier,” Kamanin wrote, “and Vostok 3, spreading its antennas, told the ' +
      'world.” Under the fairing they were folded against the hull. How has not been found: here they are drawn ' +
      'withdrawn into the hull and slide out, which is not how it was done. Which antenna served which system is not ' +
      'known to us, nor which carried the wider television signal, nor whether talking to another ship needed anything ' +
      'added: no antenna is known to have been added or moved, and none is.',
    facts: [
      ['Modelled here', '10: a fan of 3, 3 long whips, 4 ribbons'],
      ['On the type', '11: 3 Signal, 4 Zarya, 2 telemetry, 2 command'],
      ['Let out', 'at separation, 720 s after liftoff'],
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
    summary: 'One engine with no spare, lit once after 94 hours: he heard it run for 42 seconds.',
    detail:
      'Isaev’s S5.4: 1.6 tonnes of thrust for up to 45 seconds on self-igniting propellants, with four small steering ' +
      'nozzles round the chamber. There was one, and the answer to its failing was the orbit itself, low enough for the ' +
      'air to bring the ship down within the ten days its supplies allowed. The same low orbit was what the physicists ' +
      'asked for after the American nuclear test in space of 9 July: higher, Keldysh said, a man could not yet be sent. ' +
      'On the last orbit the landing systems switched themselves on, which “raised my spirits”; he told Popovich, and ' +
      'six minutes later Popovich reported the same from his own ship. Then the engine: “a push, and for 42 seconds I ' +
      'could hear it work”. The minute it lit was not found.',
    facts: [
      ['Thrust', '1,614 kgf (15.8 kN)'],
      ['Propellant', '280 kg: amine fuel and nitric acid'],
      ['Burn', '42 s by his ear; 45 s at most'],
      ['Lit', '15 August, on the 65th orbit; the minute was not found'],
    ],
    explode: [0, -0.9, 0],
    order: SHIP + 2,
  },
];

const BOOSTER_DETAIL =
  'A cone 19.2 m long on a short cylinder, with its own RD-107: four fixed chambers and two small ones that swivel ' +
  'to steer, all fed by one turbopump driven by steam from hydrogen peroxide. The whole cone is its oxygen tank, ' +
  'white with frost at noon in the desert; the kerosene is in the cylinder under it. It is not bolted on. Its tip ' +
  'is a steel ball in a cup on the core, and its thrust holds it there; two ties at the foot keep it from swinging. ' +
  'When its engine is throttled back the ties are let go, and what thrust is left swings the foot outward until the ' +
  'ball drops out of its cup. Four doing this at once draw a cross in the sky. The triangle at the foot is an air ' +
  'rudder. It was a strap-on that stayed burning on this pad on 1 June.';

const launcherParts: Part[] = [
  {
    node: 'Fairing',
    group: 'Third stage',
    name: 'Fairing',
    summary: 'Two halves, and a round hole to be thrown out through.',
    detail:
      'It covers the ship through the thick air and is dropped in two halves some two and a half minutes up. The round ' +
      'opening is over hatch No. 1. Nikolayev went aboard through it from the lift two hours before liftoff, in 35 ' +
      'degrees of desert August, and took so long looking over his cabin before he spoke that Korolev demanded to know ' +
      'why there was no link. Had the rocket failed on the pad or low in the climb his seat would have been fired out ' +
      'through the opening: Korolev stood in the bunker holding a telephone with a red stripe, ready to give the word. ' +
      'Its lengths are from a NASA drawing and the curve of its nose from the vehicles kept at Kaluga and in Moscow; ' +
      'nothing read says this flight’s differed from Vostok 1’s.',
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
    summary: 'The count everyone waited for was 687 seconds: this stage’s last.',
    detail:
      'Built in nine months of 1958 to throw a probe at the Moon, then given a longer adapter for the Vostok. To keep ' +
      'it short its tanks are two rings, one above the other, with the engine in the hole. The RD-0109 does not swivel: ' +
      'the stage is steered by the spent gas from its own turbine, piped to eight small nozzles round the foot. A stage ' +
      'of this kind had failed under a reconnaissance satellite in December, so the bunker listened to the seconds ' +
      'being read out: normal running to the 687th meant orbit, and at the 720th the ship came away. The orbit was ' +
      '180.7 by 234.6 km, “very close to the one calculated”. Nikolayev turned to look for the spent stage and did not ' +
      'find it. The stage’s figures are the type’s; its engine’s number was not found.',
    facts: [
      ['Length', '2.98 m with its adapter'],
      ['Diameter', '2.58 m'],
      ['Mass', '7,984 kg fuelled, 1,472 kg burnt out'],
      ['Engine', 'RD-0109: 54.5 kN in vacuum, 121 kg'],
      ['Shut down', '687 s after liftoff, as planned; the ship free at 720 s'],
      ['Orbit reached', '180.7 × 234.6 km (TASS on the day: 183 × 251)'],
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
      'to go somewhere: out between the struts of this lattice, turned aside by the cone on the core’s top. Nikolayev ' +
      'felt each staging as a fall in the load, and heard the third stage stop.',
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
    summary: 'Second stage, though it lights first; ten weeks earlier one like it had fallen 300 m from this pad.',
    detail:
      'Called the second stage, but its engine starts on the pad with the boosters’, because an engine that failed to ' +
      'start on the ground could be shut down and tried again. It carries twice a booster’s propellant and burns two ' +
      'and a half times as long. Its shape follows from the boosters round it: narrow at the foot where they crowd in, ' +
      'widest 20 m up where their tips push on a heavy frame. On 1 June 1962 a rocket of the family carrying a ' +
      'reconnaissance satellite came down 300 m from Site 1 with one strap-on left burning on the pad, and the repairs ' +
      'took until August. A third reconnaissance ship was flown on 28 July to be sure of the launch vehicle again. ' +
      'Nikolayev felt this stage’s vibration grow toward the end of its burn, at six to seven g. The number E103-23 is ' +
      'from two launch lists; Siddiqi’s log leaves it blank. Every station between the core’s ends is estimated.',
    facts: [
      ['Vehicle', '8K72K No. E103-23 (launch lists; blank in Siddiqi’s log)'],
      ['Length', '27.5 m; 28.75 m with the lattice'],
      ['Diameter', '2.05 m at the foot, 2.95 m at the frame'],
      ['Mass', 'about 100 t at liftoff, 7 to 8 t empty'],
      ['Greatest load', '6 to 7 g, late in its burn (his report)'],
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
      'ground, each by its own pyrotechnic igniter. This one left the ground at 11:30 Moscow time to within half a ' +
      'second of the time set three days before.',
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
  url: 'models/ussr/vostok/vostok-3/vehicle.glb',
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
  id: 'ussr/vostok/vostok-3',
  nation: 'USSR',
  agency: 'OKB-1',
  program: 'Vostok',
  designation: 'Vostok 3',
  callsign: 'Sokol (Сокол)',
  spacecraft: 'Vostok 3KA No. 5',
  launchVehicle: 'Vostok-K 8K72K, No. E103-23',
  // 11:30 Moscow time (TASS; Keldysh and Nikolayev on 21 August 1962; Siddiqi's launch log). The second is Kamanin's: the time
  // set three days before was 11:30 and it was kept to within 0.5 s. spacefacts.de prints 08:30:00 UTC.
  launch: '1962-08-11T08:30:00Z',
  launchSite: SITE1.name,
  site: SITE1,
  crew: ['Andriyan G. Nikolayev'],
  summary:
    'Four days in orbit, and from the second day not alone there. Sixty-four orbits from Tyuratam: the first man to leave ' +
    'his seat and float, the first television broadcast from a crewed ship, the first words between two ships, ending with ' +
    'the pilot ejecting and landing by parachute south of Karaganda.',
  facts: [
    { label: 'Liftoff', value: '11 August 1962, 08:30:00 UTC (11:30 Moscow time)' },
    { label: 'Pilot', value: 'Andriyan G. Nikolayev, aged 32' },
    { label: 'Duration', value: '94 h 22 min to his landing; the ship 94 h 10 min' },
    { label: 'Orbits', value: '64' },
    { label: 'Orbit', value: '180.7 × 234.6 km, 64.98°' },
    { label: 'Mass in orbit', value: '4,722 kg' },
    { label: 'Nearest to Vostok 4', value: 'about 5 km (the pilots) or 6.5 km (TASS), on 12 August' },
    { label: 'Landing', value: 'south of Karaganda, 48°02′N 75°45′E' },
  ],
  // Moscow times from Kamanin's diary (his own notes and his record of the pilots' reports), the TASS reports as Flight
  // International printed them, and Siddiqi; the ascent's seconds are the plan as Kamanin heard it counted (README.md)
  timeline: [
    { t: 0, event: 'Liftoff, 11:30 Moscow time, within half a second of the time set' },
    { t: 687, event: 'Third stage shuts down as planned: orbit' },
    { t: 720, event: 'The ship parts from its third stage and lets out its antennas' },
    { t: MSK(11, 13, 30), event: 'The orbit worked out and reported to Khrushchev: 183 by 251 km, as announced' },
    {
      t: MSK(11, 15, 30),
      event: 'About four hours up, on the fourth orbit, Khrushchev speaks to him; through the noise he hears half of it',
    },
    {
      t: MSK(11, 17, 30),
      event: 'About six hours up, on the seventh orbit, Soviet television shows him live: the first broadcast from orbit',
    },
    { t: MSK(11, 22, 0), event: 'He goes to sleep, for seven hours' },
    { t: MSK(12, 10, 47), event: 'He turns his ship to watch for the second launch; at 11:03 it is pitched 73° and he sees nothing' },
    {
      t: MSK(12, 11, 2, 33),
      event: 'Vostok 4 lifts off from the same pad into nearly the same orbit; within the hour the two are talking',
    },
    { t: MSK(12, 12, 12), event: 'TASS gives both orbits: 176.7 by 227.6 km and 177.9 by 234.8 km' },
    { t: MSK(13, 4, 40), event: 'He wakes by himself at 04:40; the cabin has gone down to 13 °C and stays there' },
    { t: MSK(13, 21, 0), event: 'In the evening the State Commission argues a fourth day; asked over the radio, he says he can go on' },
    { t: MSK(14, 7, 0), event: 'It is settled: Vostok 3 lands on its 65th orbit, Vostok 4 on its 49th, both on the 15th' },
    { t: MSK(15, 9, 39, 59), event: 'The descent module lands south of Karaganda (the ship’s 3 d 22 h 9 min 59 s)' },
    { t: MSK(15, 9, 52), event: 'Nikolayev lands by parachute among rocks, on a level patch two metres square' },
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
      value: 4722,
      unit: 'kg',
      confidence: 'documented',
      note: '4,722 kg (Siddiqi, Challenge to Apollo, Table IB). Not given out at the time: asked on 21 August 1962, Popovich and Keldysh each said “about five tons”. 9 kg less than Vostok 2',
    },
    {
      group: 'Spacecraft',
      label: 'Descent module mass',
      value: 2460,
      unit: 'kg',
      confidence: 'documented',
      note: '2.46 t for the type (Siddiqi p. 195). No. 5’s own figure has not been found',
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
      value: 180.7,
      unit: 'km',
      confidence: 'documented',
      note: '180.7 km (Siddiqi, p. 356 and Table IB, “initial orbital parameters”). TASS on the day, and Nikolayev on 21 August: 183 km; TASS at 12:12 on 12 August: 176.7 km. No OKB-1 report of this flight has been read',
    },
    {
      group: 'Spacecraft',
      label: 'Apogee',
      value: 234.6,
      unit: 'km',
      confidence: 'documented',
      note: '234.6 km (Siddiqi, p. 356 and Table IB). TASS on the day, and Nikolayev on 21 August: 251 km; TASS at 12:12 on 12 August: 227.6 km',
    },
    {
      group: 'Spacecraft',
      label: 'Inclination',
      value: 64.98,
      unit: 'deg',
      confidence: 'documented',
      note: '64.98° (Siddiqi, p. 356 and Table IB); 65° as announced; 64°59′ in the TASS report of 12 August',
    },
    {
      group: 'Spacecraft',
      label: 'Period',
      value: 88.5,
      unit: 'min',
      confidence: 'documented',
      note: '88.5 min, “the initial duration of Vostok 3’s circuit” (Nikolayev, 21 August 1962, in Flight International, 30 August, p. 305). TASS at 12:12 on 12 August: 88.2 min; 88.33 is printed beside 180.7 × 234.6 km, which over a sphere of 6,371 km give 88.5 by Kepler’s law',
    },
    {
      group: 'Spacecraft',
      label: 'Cabin temperature, least',
      value: 12,
      unit: '°C',
      confidence: 'documented',
      note: '27 °C at liftoff, 13 °C by the 29th orbit and until the 36th; 12 °C in his report of the morning of 14 August (Kamanin’s diary, 13 and 14 August 1962). He said he was holding it low on purpose',
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
      note: 'that a cine camera was worked by hand on this flight is documented (RKK Energia 1946–1996, p. 116; Kamanin’s record of his report: «в отвязанном положении вел связь и киносъемку»); what kind is not. It is built as Vostok 2’s Konvas-Avtomat, 290 × 260 × 240 mm as a type: an assumption',
    },
    {
      group: 'Spacecraft',
      label: 'Pilot height, as modelled',
      value: 1.65,
      unit: 'm',
      confidence: 'estimated',
      note: 'assumed: the figure in the seat is the one built to Gagarin’s recorded 165 cm. No document with Nikolayev’s height was found',
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
      note: '287 t, the type’s figure and Vostok 1’s (RKK Energia 1946–1996; Minakov; Siddiqi). No. E103-23’s own was not found; its spacecraft was 9 kg lighter than Vostok 2’s',
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
      value: 37.4,
      unit: 'deg',
      confidence: 'derived',
      note: 'east of north, for an orbit inclined 64.98° from latitude 45.92°, before the Earth’s turning is allowed for. The azimuth as flown was not found',
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
      note: '54.5 kN in vacuum, 323.5 s (Brügge; Encyclopedia Astronautica 54.52 kN, 324 s). No burn time is given: rated burns in print run from 365 to 440 s. On this flight the bunker waited for the count of 687 s from liftoff as the end of its burn and the ship parted at 720 s (Kamanin’s diary, 14 August 1962); when it lit was not found',
    },
    {
      name: 'TDU-1 (Isaev S5.4) braking engine',
      count: 1,
      thrustN: 1614 * KGF,
      burnS: 45,
      propellant: 'amine fuel (TG-02) / nitric acid (AK-20F)',
      kind: 'liquid',
      confidence: 'documented',
      note: '1.614 tf, 45 s at most (Siddiqi p. 197); 280 kg of propellant. Flown: 42 s by Nikolayev’s ear («была слышна в течение 42-х секунд ее работа»: his report to the State Commission, 16 August, as Kamanin wrote it down), on the morning of 15 August; the minute was not found',
    },
    {
      name: 'Attitude jet',
      count: 16,
      thrustN: 1.5 * KGF,
      propellant: 'compressed nitrogen',
      confidence: 'documented',
      note: 'two independent sets of eight, 1.5 kgf each (Siddiqi p. 197; the encyclopedia text gives 14.7 N). The store was worth 2 to 3 hours of orienting (Kamanin, 26 July 1962); worked by hand to look for the third stage and for Vostok 4’s launch',
    },
  ],
  models: [vehicle],
};

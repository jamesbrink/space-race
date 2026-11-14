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

/** Moscow time on a day of June 1963, as seconds from liftoff at 12:29:52 on the 16th. */
const MSK = (day: number, h: number, m: number, s = 0) => ((day - 16) * 24 + h - 12) * 3600 + (m - 29) * 60 + (s - 52);

const parts: Part[] = [
  {
    node: 'DescentModule',
    group: 'Spacecraft',
    name: 'Descent module',
    summary: 'The ball the first woman in space rode for three days, and the last Vostok to carry anyone.',
    detail:
      'A sphere needs no steering to survive entry: whichever way it meets the air the flow round it is the same, so ' +
      'all of it is heat shield and its weight is put low and behind the pilot to turn it heavy side first. Tereshkova ' +
      'was in this one for nearly 71 hours, which was more than the six American flights to that day put together. ' +
      'She came down back first; the two halves of the ship parted “with a jerk”; the ball flew steady and then began ' +
      'to rock; “when the ship’s covering burned, flakes flew past the porthole”, and the load was no more than 8 g. ' +
      'When the device that draws the harness tight for ejection fired, the cabin filled with smoke and wadding. ' +
      'From under her own parachute she saw the ball below her, and it landed 400 m from where she did, in the Altai. ' +
      'It is kept at RKK Energia’s museum in Korolyov, scorched as it landed.',
    facts: [
      ['Diameter', '2.3 m over the heat shield; pressure hull 2.2 m'],
      ['Mass', '2,460 kg (the type)'],
      ['Hatches', '3, each 1 m in the clear'],
      ['Portholes', '3, two of them in hatch covers'],
      ['Load at entry', 'no more than 8 g (her report)'],
      ['Landed', '400 m from its pilot (her report)'],
    ],
    explode: [0, LIFT, 0],
    order: SHIP + 1,
  },
  {
    node: 'EntryHatch',
    group: 'Spacecraft',
    name: 'Hatch No. 1',
    summary: 'The way in on the pad, at a pulse of 140, and the way out at 7 km.',
    detail:
      'Over the pilot’s head, on the line of her seat’s rails, with one of the three portholes in it. On the morning ' +
      'of 16 June the bus reached the pad at 10:15; she reported to the chairman of the State Commission, was handed ' +
      'flowers and gave them straight to Korolev, and went up “rather heavily” to the lift. Going in through this ' +
      'hatch her pulse was 140. A quarter of an hour later she was on the radio reporting her checks, and those who ' +
      'heard her through the count said she carried it off better than the two men of the year before. Three days ' +
      'later it was blown off at seven kilometres: “the seat leaves the ship very smoothly and comes away quickly”. A ' +
      'story has gone round since that the hatch struck her on the way out. Nothing in her report or Kamanin’s diary ' +
      'supports it.',
    facts: [
      ['Clear diameter', '1 m'],
      ['Screws', '30 (counted on Vostok 1’s)'],
      ['Boarded', '16 June, soon after 10:15 Moscow time, pulse 140'],
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
    summary: 'Covers the capsule’s own parachute, which she watched open from above.',
    detail:
      'At the pilot’s left. Behind it is the container of the descent module’s parachute, which opens after the pilot ' +
      'has gone. Tereshkova, hanging under her own canopy, looked down and saw the ball beneath her under its own: ' +
      '“the ship, the seat and I landed side by side”, the ball 400 m off. The control post knew none of this. The ' +
      'direction finders had the ship coming down along the track of its 49th orbit but far beyond the aiming point, ' +
      'two degrees of latitude to the north, and for some two hours nobody could say what had become of her; word ' +
      'came at last over ordinary ground lines. An aircraft found her after an hour and two parachutists jumped to ' +
      'her.',
    facts: [
      ['Clear diameter', '1 m'],
      ['Parachute', '574 m², from a 330 litre container (the type)'],
      ['Landing speed', '10 m/s (the type)'],
      ['Missed the aiming point by', '2° of latitude, to the north (Kamanin)'],
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
    summary: 'Laid out for a man’s reach: she could not get to the Globus without undoing her harness.',
    detail:
      'The ship had been built the year before, like its twin, and was “overloaded and filled to the limit”: a fortnight ' +
      'before the flight Korolev climbed into this one himself with a 1.5 kg spyglass Kamanin wanted carried, tried it ' +
      'in several places and gave up. What Tereshkova told the State Commission is mostly about reach. “It is hard to ' +
      'work with the equipment: I could not reach the Globus or other instruments. I had to undo part of the harness.” ' +
      'She could not get the biological samples out at all, and did none of those experiments. Both pencils broke, ' +
      'after which nothing could be written down. The wipes were too small and too dry, and there was nothing to ' +
      'clean her teeth with. The lighting was good. The air was 30 °C at liftoff, 23 at the end of the first day and ' +
      '12 from the start of the second. What is modelled is the type’s cabin with this flight’s cameras; nothing was ' +
      'found that shows how this cabin differed from Vostok 5’s, and nothing is built to say it did.',
    facts: [
      ['Planned for', 'up to 3 days'],
      ['Cabin temperature', '30 °C at liftoff, 23 °C after a day, 12 °C from the second day'],
      ['Out of her reach', 'the Globus; the biological samples'],
      ['Aboard, by her report', 'light filters, a photometer, dosimeters, two pencils'],
      ['Dosimeters', '“stood at zero”'],
    ],
    explode: [0, LIFT, 0],
    order: SHIP + 1,
  },
  {
    node: 'EjectionSeat',
    group: 'Spacecraft',
    inside: true,
    name: 'Ejection seat and pilot',
    summary: 'Tereshkova, 26, a textile worker and parachutist, in the suit and seat made for a woman.',
    detail:
      'The seat lies across the ball, tilted so that its rails run out through hatch No. 1: escape system on the pad, ' +
      'landing system at the end. Hers was one of two made for women, and she, Solovyeva and Ponomareva had their ' +
      'suits, harness and seat fitted on 3 June. The suit is the SK-2, the SK-1 cut again for a woman: narrower in ' +
      'the shoulders, wider in the hips, a smaller opening at the neck, thinner gloves with a freer thumb. Three days ' +
      'in it told. The helmet pressed on her shoulder and the headset on her left ear; the sensor on her head itched ' +
      'and hurt; from the second day her right shin ached. She was sick once and blamed the food. On the first two ' +
      'attempts she could not hold the ship in pitch, and on the third morning she did. She landed on her back, with ' +
      'no way to steer the canopy, and came home with a bruise on her nose. The figure is in the SK-2 as the ' +
      'photographs of that morning show it: the black disc of the breathing valve at the collar, black gloves, СССР ' +
      'on the helmet. Her height was not found: 1.64 m is read off the photograph of her at the pad.',
    facts: [
      ['Pilot', 'Valentina V. Tereshkova, 26; a junior lieutenant, announced without her rank'],
      ['Callsign', 'Chayka (Чайка, “Seagull”)'],
      ['Suit', 'SK-2: the SK-1 recut for a woman; eight were made in 1962'],
      ['Backups', 'Irina Solovyeva and Valentina Ponomareva'],
      ['Landed', '11:20 Moscow time, 19 June, 70 h 50 min after liftoff'],
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
    summary: 'The picture the world saw of her, and the one the control post switched on when she did not answer.',
    detail:
      'The Seliger cameras of the year before: 400 lines ten times a second, re-scanned on the ground and sent on to ' +
      'the Moscow television centre. Within three hours of liftoff Moscow television was showing her in her cabin. On the evening of the ' +
      '18th the Leningrad station called her and got no reply; the control post turned a camera on from the ground ' +
      'and saw that she was asleep. She was woken and asked about the descent and about turning the ship by hand, ' +
      'and owned that pitch had twice defeated her. The cameras’ mass and power are documented; their case, bracket, ' +
      'lens and plug are read off the one photograph of a Seliger camera, and every size is estimated. The one that ' +
      'looks at her face is placed to give the view the received pictures show. Where the second stood is not known: ' +
      'it is put at her right.',
    facts: [
      ['System', 'Seliger: 400 lines of 400 elements, 10 frames/s (as Vostok 3’s)'],
      ['Cameras', '2, each 3 kg and 12 W, on a one-inch vidicon'],
      ['Switched on from the ground', '18 June: she was asleep'],
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
    summary: 'Cities, clouds and the Moon, filmed by hand, with no pencil left to say which was which.',
    detail:
      '“I filmed cities, clouds, the Moon. To film and to write down what you are filming is very hard.” Harder still ' +
      'once both her pencils had broken. She also looked at the horizon through coloured filters, saw the bright band ' +
      'that lies along it, and took two readings with a photometer; at night she found cities easy to pick out and ' +
      'constellations hard, and thought the moonlit cloud beautiful. Nothing read names the camera. It is built as the ' +
      'Konvas that Titov carried, which the women’s group is photographed learning to use: an assumption, and so is ' +
      'its place at her right hand. Her frames of the horizon were measured for brightness afterwards and used in ' +
      'the study of the dust layers of the high atmosphere. Neither the filters nor the photometer is built: nothing ' +
      'was found of their kind.',
    facts: [
      ['Kind', 'assumed: Konvas-Avtomat, 35 mm (as Vostok 2’s)'],
      ['Size', '290 × 260 × 240 mm, 5.7 kg (that type, as sold)'],
      ['Filmed', 'cities, clouds, the Moon'],
      ['Also', 'observations through filters; two photometer readings'],
    ],
    explode: [0, LIFT, 0],
    order: SHIP + 1,
  },
  {
    node: 'RetainingStraps',
    group: 'Spacecraft',
    name: 'Retaining straps',
    summary: 'Four steel bands and one lock: “the compartments parted with a jerk”.',
    detail:
      'Four bands run from the instrument module’s ring over the sphere and meet in a single lock at its top. After the ' +
      'braking engine had run, the lock let them go. Tereshkova felt it as a jerk; after it the ball flew steady for a ' +
      'while and then began to rock in the thickening air. On the ground nobody knew it had happened: she was sending ' +
      'each step of the descent on the telegraph key, as she had been told to, and nobody was listening for it; the ' +
      'ships at sea that did see the commands go through reported late. Each strap carries a hairpin antenna of the ' +
      'command link. They swing back as they would when released; how far they sprang is not recorded.',
    facts: [
      ['Straps', '4, joined by one pyrotechnic lock'],
      ['Released', 'after the braking burn; the time was not found'],
      ['Reported by', 'telegraph key; not heard'],
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
      'into a plate on the side of the ball. On the first two flights the plate did not come away when the modules ' +
      'parted. On this one the parting was a single jerk and nothing more is said of it. Of the two ships tested ' +
      'together that spring, 28 instruments had failed and been changed and a stray washer was found inside a ' +
      'distribution box; this ship’s own tests on the pad, on the 15th, passed without a remark, and Kamanin thought ' +
      'the morning the cleanest since Gagarin’s. What was changed in the mast itself since Vostok 2 was not found, so ' +
      'it is built as the type’s.',
    facts: [
      ['Separation', '“with a jerk”; nothing reported against it'],
      ['Tests on the pad', '15 June: no remarks (Kamanin)'],
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
    summary: 'The gas she had to learn to spend: twice she could not hold the ship in pitch, the third time she did.',
    detail:
      'A necklace of pressure spheres round the joint, outside both hulls: gas for the attitude jets, and the cabin’s ' +
      'reserve. Turning the ship by hand was the one piece of flying a Vostok pilot did, and the one she would need if ' +
      'the automatic descent failed: a ship that could not be pointed could not be brought down. “When the ' +
      'orientation was switched on I heard a clap, like a blow on an empty milk churn. The first orientation did not ' +
      'come off.” Nor did the second. On the evening of the 18th she said so plainly, and added: “Don’t worry, I will ' +
      'do it all in the morning.” Gagarin, Titov, Nikolayev and Rauschenbach worked out what to tell her, and on the last ' +
      'morning (her 45th orbit by her own report, the 47th by the transcript) she took twenty minutes to bring the ' +
      'ship to the attitude for descent, engine first, and held it there for fifteen. “I do not think the orientation system had failed.” Sources give fourteen, sixteen and ' +
      'twelve bottles on the ring; fourteen are modelled, in sixteen places, with a gap where the cable mast passes.',
    facts: [
      ['Bottles', '14 modelled (sources: 12, 14, 16)'],
      ['Orienting by hand', 'failed twice; done on the last morning, in 20 minutes'],
      ['Held', '15 minutes, engine first (Kamanin)'],
      ['For the suit', '3 bottles: 3 to 3.5 hours if the cabin leaked (Kamanin)'],
    ],
    explode: [0, 0.5, 0],
    order: SHIP + 2,
  },
  {
    node: 'InstrumentModule',
    group: 'Spacecraft',
    inside: true,
    name: 'Instrument module',
    summary: 'Two cones base to base: the half of the ship that worked without a fault, and found the Sun in the dark.',
    detail:
      'A sealed hull of two cones filled with dry nitrogen, carrying the batteries, radios, the orientation system and ' +
      'the braking engine. The aft cone is the radiator: shutters over it open and close to hold the temperature. Its ' +
      'radios gave her Bykovskiy within half an hour, “in the Earth’s shadow”: the link between the ships was ' +
      'excellent for a day, fair for half the next, and then each heard only what the ground said to the other. “It ' +
      'was a great joy to know that Yastreb was flying alongside.” To the ground she was heard best in the second ' +
      'half of each pass, worst at the equator, with noise whenever the VHF set came on. For the descent the Sun ' +
      'sensor has to find the Sun and hold the engine against the line of flight; she noted that the solar ' +
      'orientation switched itself on while the ship was still in shadow. It burned up on 19 June.',
    facts: [
      ['Greatest diameter', '2.43 m'],
      ['Length', '2.25 m'],
      ['Mass', '2,270 kg (the type)'],
      ['Attitude jets', '2 sets of 8, 1.5 kgf each'],
      ['Voice to Vostok 5', 'excellent the first day, gone by the middle of the second'],
      ['Nominal life of the orbit', '7.1 days (Kamanin, 17 June)'],
    ],
    explode: [0, 0, 0],
    order: SHIP + 2,
  },
  {
    node: 'Antennas',
    group: 'Spacecraft',
    name: 'Antennas',
    summary: 'Ten of the eleven, folded under the fairing; let out, they carried a telegraph key nobody listened to.',
    detail:
      'A fan of three whips by the frame, three long whips trailing from beside the engine, and four ribbon antennas ' +
      'standing aft: short-wave and VHF voice, the Signal beacon, telemetry, the command link and television. On the ' +
      'evening of 17 June some twenty people at the cosmonauts’ cottage at Tyuratam, Gagarin and Nikolayev among ' +
      'them, watched this ship go over for a minute against the stars, from the zenith down to 45°. Two mornings ' +
      'later the same antennas carried her reports of the descent in Morse, and the commands for it from the ground; ' +
      'only the commands were received. Under the fairing they were folded against the hull. How has not been found: ' +
      'here they are drawn withdrawn into the hull and slide out, which is not how it was done. Which antenna served ' +
      'which system is not known to us, and none is known to have been added or moved for this flight.',
    facts: [
      ['Modelled here', '10: a fan of 3, 3 long whips, 4 ribbons'],
      ['On the type', '11: 3 Signal, 4 Zarya, 2 telemetry, 2 command'],
      ['Let out', 'at separation; the second was not found for this flight'],
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
    summary: 'One engine with no spare. She barely heard it; the control post did not hear of it at all.',
    detail:
      'Isaev’s S5.4: 1.6 tonnes of thrust for up to 45 seconds on self-igniting propellants, with four small steering ' +
      'nozzles round the chamber. There was one, and the answer to its failing was the orbit itself, low enough for ' +
      'the air to bring the ship down within the ten days its supplies allowed; this ship’s was good for 7.1. The ' +
      'command that starts the automatic descent went up at 09:39:40 on the 19th and was seen to arrive. Then nothing: ' +
      'no word from her of the solar orientation, of the engine, of the modules parting. “These were the most anxious ' +
      'minutes,” Kamanin wrote. She was reporting each on the telegraph key: the transcript has the first stage of ' +
      'the descent programme on at 09:42 and the second at 09:51. Of the engine itself she said only that ' +
      'its start was faintly heard, and that she flew toward the Earth back first.',
    facts: [
      ['Thrust', '1,614 kgf (15.8 kN)'],
      ['Propellant', '280 kg: amine fuel and nitric acid'],
      ['Burn', '45 s at most; this flight’s was not found'],
      ['Descent commanded', '19 June, 09:39:40 Moscow time (Kamanin; Siddiqi)'],
    ],
    explode: [0, -0.9, 0],
    order: SHIP + 2,
  },
];

const BOOSTER_DETAIL =
  'A cone 19.2 m long on a short cylinder, with its own RD-107: four fixed chambers and two small ones that swivel ' +
  'to steer, all fed by one turbopump driven by steam from hydrogen peroxide. The whole cone is its oxygen tank, ' +
  'white with frost in the June heat; the kerosene is in the cylinder under it. It is not bolted on. Its tip is a ' +
  'steel ball in a cup on the core, and its thrust holds it there; two ties at the foot keep it from swinging. When ' +
  'its engine is throttled back the ties are let go, and what thrust is left swings the foot outward until the ball ' +
  'drops out of its cup. Four doing this at once draw a cross in the sky. The triangle at the foot is an air rudder. ' +
  'Tereshkova found the loads of the climb light, under five g, and heard every command on the way up.';

const launcherParts: Part[] = [
  {
    node: 'Fairing',
    group: 'Third stage',
    name: 'Fairing',
    summary: 'Two halves, and a round hole to be thrown out through.',
    detail:
      'It covers the ship through the thick air and is dropped in two halves some two and a half minutes up. The round ' +
      'opening is over hatch No. 1: the way in from the lift, and the way out on the seat if the rocket fails on the ' +
      'pad or low in the climb. The evening before, in the sports clothes she had changed into, Tereshkova rode up ' +
      'with Solovyeva and Korolev to look into the ship through it. On the 16th she went in through it a little after ' +
      '10:15 and sat behind it for two hours and a quarter, talking to Gagarin, Nikolayev, Korolev and Kamanin on the ' +
      'pad’s link. Nothing held the count. Its lengths are from a NASA drawing and the curve of its nose from the ' +
      'vehicles kept at Kaluga and in Moscow; nothing read says this flight’s differed from Vostok 1’s.',
    facts: [
      ['Length', '6.6 m'],
      ['Diameter', '2.7 m'],
      ['Mass', 'about 0.8 t'],
      ['Opening', 'over hatch No. 1, for boarding and ejection'],
      ['Aboard before liftoff', 'about two hours'],
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
    summary: 'This one put its ship where it was meant to go. She watched it through the right porthole.',
    detail:
      'Built in nine months of 1958 to throw a probe at the Moon, then given a longer adapter for the Vostok. To keep ' +
      'it short its tanks are two rings, one above the other, with the engine in the hole. The RD-0109 does not swivel: ' +
      'the stage is steered by the spent gas from its own turbine, piped to eight small nozzles round the foot. Two ' +
      'days before, the stage of the same kind under Vostok 5 had had a gyroscope changed on the pad and had left its ' +
      'ship too low. This one gave no trouble on the ground and none in flight: the orbit was 180.9 by 231.1 km, ' +
      'good for 7.1 days, more than twice what was asked of it, and close enough to Vostok 5’s plane for the two ' +
      'ships to be some five kilometres apart at their nearest. Tereshkova saw the spent stage through the right ' +
      'porthole after it let her go. The stage’s figures are the type’s; its engine’s number was not found.',
    facts: [
      ['Length', '2.98 m with its adapter'],
      ['Diameter', '2.58 m'],
      ['Mass', '7,984 kg fuelled, 1,472 kg burnt out'],
      ['Engine', 'RD-0109: 54.5 kN in vacuum, 121 kg'],
      ['Engine’s size', '1,555 mm long; nozzle exit 733 mm across'],
      ['Orbit reached', '180.9 × 231.1 km'],
      ['Seen', 'from the right porthole, after separation (her report)'],
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
      'to go somewhere: out between the struts of this lattice, turned aside by the cone on the core’s top. Of the ' +
      'whole climb Tereshkova reported only that it went excellently, that the link was good, and that going over ' +
      'into weightlessness brought nothing unpleasant.',
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
    summary: 'Second stage, though it lights first; on the pad a day, where the one before had stood five.',
    detail:
      'Called the second stage, but its engine starts on the pad with the boosters’, because an engine that failed to ' +
      'start on the ground could be shut down and tried again. It carries twice a booster’s propellant and burns two ' +
      'and a half times as long. Its shape follows from the boosters round it: narrow at the foot where they crowd in, ' +
      'widest 20 m up where their tips push on a heavy frame. This vehicle was held in the assembly building, ready to ' +
      'go within five days of the first, until Vostok 5 was in orbit; it was on the pad by 09:00 on 15 June, eighteen ' +
      'hours after the other had left it, and that evening the launch crew met Tereshkova under it with flowers and ' +
      'verses. Its tests on the pad raised no remarks, and it flew the next day, the last R-7 to carry a Vostok with a ' +
      'pilot aboard. Every station between the core’s ends is estimated.',
    facts: [
      ['Length', '27.5 m; 28.75 m with the lattice'],
      ['Diameter', '2.05 m at the foot, 2.95 m at the frame'],
      ['Mass', 'about 100 t at liftoff, 7 to 8 t empty'],
      ['On the pad', 'from the morning of 15 June'],
      ['After Vostok 5’s launch from the same pad', '45 h 31 min'],
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
      'ground, each by its own pyrotechnic igniter. The State Commission had set 12:30 Moscow time the afternoon ' +
      'before, to put the ship as near as could be to the orbit Vostok 5 was then in, and these left the ground eight ' +
      'seconds before it.',
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
  url: 'models/ussr/vostok/vostok-6/vehicle.glb',
  scale: '38.36 m on the pad · 10.3 m across the rudders · to scale',
  // The vehicle alone: Site 1 as it stood in June 1963 is not built for this flight yet, so it is shown in the gallery only.
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
    // (through the cutaway's opening, from his right and a little toward his feet: both cameras, and the pilot they look at)
    { id: 'television', label: 'Television', nodes: ['TelevisionCameras'], from: along(RIGHT - 18, 20, 1) },
    // (from a little aft of his right side: the turret, the magazine and the viewfinder all show)
    { id: 'konvas', label: 'Film camera', nodes: ['FilmCamera'], from: along(RIGHT - 32, 24, 1) },
    { id: 'instrument', label: 'Instrument module', nodes: ['InstrumentModule', 'GasBottles', 'Antennas'] },
    { id: 'engine', label: 'Braking engine', nodes: ['RetroEngine'], from: along(250, -32, 1) },
  ],
};

export const flight: Flight = {
  id: 'ussr/vostok/vostok-6',
  nation: 'USSR',
  agency: 'OKB-1',
  program: 'Vostok',
  designation: 'Vostok 6',
  callsign: 'Chayka (Чайка)',
  spacecraft: 'Vostok 3KA No. 8',
  launchVehicle: 'Vostok-K 8K72K, No. E103-25',
  // 12:29:52 Moscow time (Siddiqi, p. 369: "1229 hours, 52 seconds Moscow Time", and his launch log; McDowell's log 0929:52
  // UTC; spacefacts.de). The State Commission had set 12:30 the afternoon before (Kamanin, 15 June 1963).
  launch: '1963-06-16T09:29:52Z',
  launchSite: SITE1.name,
  site: SITE1,
  crew: ['Valentina V. Tereshkova'],
  summary:
    'The first woman in space, and the last flight of a Vostok. Forty-eight orbits from the pad Vostok 5 had left two ' +
    'days before: three days in a cabin laid out for a longer reach than hers, an attitude she could not hold by hand ' +
    'until the last morning, a descent nobody on the ground heard her report, and a landing by parachute in the Altai ' +
    'with a bruised nose.',
  facts: [
    { label: 'Liftoff', value: '16 June 1963, 09:29:52 UTC (12:29:52 Moscow time)' },
    { label: 'Pilot', value: 'Valentina V. Tereshkova, aged 26' },
    { label: 'Duration', value: '2 d 22 h 50 min to her landing; 70 h 40 min 48 s on the record’s books' },
    { label: 'Orbits', value: '48' },
    { label: 'Orbit', value: '180.9 × 231.1 km, 64.95°' },
    { label: 'Mass in orbit', value: '4,713 kg' },
    { label: 'Nearest to Vostok 5', value: 'about 5 km, just after reaching orbit' },
    { label: 'Landing', value: '19 June, 11:20 Moscow time, 620 km north-east of Karaganda' },
  ],
  // Moscow times. Kamanin's diary keeps the range's clock, two hours ahead, and is converted; the hours given for an
  // orbit's number are reckoned from the period and say "about" (README.md)
  timeline: [
    { t: 0, event: 'Liftoff, 12:29:52 Moscow time, 45 h 31 min after Vostok 5 left the same pad; nothing held the count' },
    { t: MSK(16, 13, 0), event: 'By 13:00 she is talking to Bykovskiy, “in the Earth’s shadow”' },
    { t: MSK(16, 15, 30), event: 'Within three hours Moscow television is showing her in her cabin' },
    { t: MSK(16, 16, 55), event: 'On the fourth orbit Khrushchev speaks to her' },
    { t: MSK(17, 9, 30), event: 'Her flight is to run its three days; Vostok 5’s is cut to five or six' },
    { t: MSK(17, 20, 7), event: 'From the cosmonauts’ cottage at Tyuratam some twenty people watch the ship cross the stars for a minute' },
    {
      t: MSK(18, 20, 0),
      event: 'In the evening she does not answer Leningrad: the camera shows her asleep. Woken, she owns that pitch has beaten her twice',
    },
    {
      t: MSK(19, 7, 40),
      event:
        'From 07:40 to 08:05 by the transcript (her 45th orbit by her own report, the 47th by its) she turns the ship engine first by hand and holds it',
    },
    { t: MSK(19, 9, 39, 40), event: 'The command for the automatic descent goes up and is seen to arrive; nothing more is heard from her' },
    { t: MSK(19, 9, 42), event: 'By her telegraph key: the first stage of the descent programme on; the second at 09:51' },
    {
      t: MSK(19, 11, 10, 40),
      event:
        'The flight ends as the record counts it, at 70 h 40 min 48 s: the ball down (Siddiqi), or the pilot out of it (the rule the record keeper’s notes show)',
    },
    { t: MSK(19, 11, 20), event: 'Tereshkova lands on her back, 400 m from the ball; the control post learns of it two hours later' },
  ],
  specs: [
    {
      group: 'Spacecraft',
      label: 'Length, without antennas',
      value: 4.4,
      unit: 'm',
      confidence: 'documented',
      note: '4.4 m, the type (Siddiqi, Challenge to Apollo, p. 195; the Soviet encyclopedia text: «длина (без антенн) 4,4 м»)',
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
      value: 4713,
      unit: 'kg',
      confidence: 'documented',
      note: '4,713 kg (Siddiqi, Challenge to Apollo, Table IB): the lightest of the six crewed ships, 7 kg under Vostok 5. Where the difference lay (her own weight, three days’ stores for eight) is not broken down in anything read. McDowell’s log rounds to 4.7 t',
    },
    {
      group: 'Spacecraft',
      label: 'Descent module mass',
      value: 2460,
      unit: 'kg',
      confidence: 'documented',
      note: '2.46 t for the type (Siddiqi p. 195). No. 8’s own figure has not been found',
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
      value: 180.9,
      unit: 'km',
      confidence: 'documented',
      note: '180.9 km (Siddiqi, p. 369 and Table IB, “initial orbital parameters”). TASS at liftoff: 183 km; 181 km by 22:00 that day; 174 km by 15:00 on 18 June. No OKB-1 report of this flight has been read',
    },
    {
      group: 'Spacecraft',
      label: 'Apogee',
      value: 231.1,
      unit: 'km',
      confidence: 'documented',
      note: '231.1 km (Siddiqi, p. 369 and Table IB). TASS at liftoff: 233 km; 231 km by 22:00 that day; 218 km by 15:00 on 18 June',
    },
    {
      group: 'Spacecraft',
      label: 'Inclination',
      value: 64.95,
      unit: 'deg',
      confidence: 'documented',
      note: '64.95° (Siddiqi, p. 369 and Table IB); “about 65°” as announced; spacefacts.de prints 65.09°. The orbit’s plane lay about 30° from Vostok 5’s, so the two ships came near each other only twice an orbit (Siddiqi, from Aviation Week, 24 June 1963)',
    },
    {
      group: 'Spacecraft',
      label: 'Period',
      value: 88.3,
      unit: 'min',
      confidence: 'documented',
      note: '88.3 min (TASS at liftoff and again at 22:00 on 16 June; RussianSpaceWeb’s table). 180.9 × 231.1 km over a sphere of 6,371 km give 88.5 by Kepler’s law',
    },
    {
      group: 'Spacecraft',
      label: 'Planned duration',
      value: 3,
      unit: 'days',
      confidence: 'documented',
      note: 'up to three days (Kamanin, 4 June 1963: «женщины — до 3 суток»). His note of 25 June has her task as one day, with the second and third at her own wish. Flown: 2 d 22 h 50 min. The orbit’s nominal life was 7.1 days (17 June)',
    },
    {
      group: 'Spacecraft',
      label: 'Cabin temperature from the second day',
      value: 12,
      unit: '°C',
      confidence: 'documented',
      note: '30 °C at liftoff, 23 °C at the end of the first day, 12 °C from the start of the second “and then held at that level” (her report of 20 June, as Kamanin wrote it down)',
    },
    {
      group: 'Spacecraft',
      label: 'Television camera, mass',
      value: 3,
      unit: 'kg',
      confidence: 'documented',
      note: 'each of the two Seliger cameras: 3 kg, 12 W, on a one-inch vidicon (Efimov, «Путь к “Востоку”», Elektrosvyaz, 2007; the same, Tele-Sputnik, 1996 No. 5, where the 400-line cameras are those of “Vostok 3 and the others”). That this ship’s were of that kind is assumed; that it had television, switched on from the ground, is Kamanin’s, 18 June 1963',
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
      note: 'that she filmed by hand is documented (her report: «Проводила киносъемку городов, облаков, Луны»); what with is not. It is built as Vostok 2’s Konvas-Avtomat, 290 × 260 × 240 mm as a type: an assumption, with this behind it: the women’s group is photographed in training “studying the Konvas cine camera” (Solovyeva, 2021)',
    },
    {
      group: 'Spacecraft',
      label: 'Pilot height, as modelled',
      value: 1.64,
      unit: 'm',
      confidence: 'estimated',
      note: 'no document with her height was found. 1.64 m is read off the photograph of her reporting at the pad on 16 June, with her helmet as the scale; the helmet’s own size is estimated, so it is good to some 8 cm. The women were chosen to be no taller than 170 cm. Her build is the SK-2’s cut, “a decreased shoulder breadth, an increased hip girth” (Abramov and Skoog, Russian Spacesuits, p. 58), by amounts that are ours',
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
      note: '287 t, the type’s figure and Vostok 1’s (RKK Energia 1946–1996; Minakov; Siddiqi). No. E103-25’s own was not found',
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
      note: '815.9 kN at the ground, 997.7 kN in vacuum; 256 and 313 s (NPO Energomash’s table by vehicle (row 8K72K), as reproduced by Brügge). The burn is the type’s, 118 s (Minakov): the time the strap-ons left on this flight was not found (Vostok 1: 119 s). Tereshkova put the loads of the climb at under five g',
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
      note: '54.5 kN in vacuum, 323.5 s (Brügge; Encyclopedia Astronautica 54.52 kN, 324 s). No burn time is given: rated burns in print run from 365 to 440 s, and this flight’s times were not found. She saw the spent stage through the right porthole',
    },
    {
      name: 'TDU-1 (Isaev S5.4) braking engine',
      count: 1,
      thrustN: 1614 * KGF,
      burnS: 45,
      propellant: 'amine fuel (TG-02) / nitric acid (AK-20F)',
      kind: 'liquid',
      confidence: 'documented',
      note: '1.614 tf, 45 s at most (Siddiqi p. 197); 280 kg of propellant. Flown on 19 June on the 49th orbit: its burn was not found (Vostok 5’s, the same morning: 39 s). «Включение ТДУ было слабо слышимым» (her report, 20 June). The command for the automatic descent went up at 09:39:40 Moscow time (Kamanin; Siddiqi, p. 372)',
    },
    {
      name: 'Attitude jet',
      count: 16,
      thrustN: 1.5 * KGF,
      propellant: 'compressed gas',
      confidence: 'documented',
      note: 'two independent sets of eight, 1.5 kgf each (Siddiqi p. 197; the encyclopedia text gives 14.7 N). Worked by hand on the 45th orbit: twenty minutes to bring the ship to the attitude for descent, held for fifteen (her report; Kamanin, 19 June 1963)',
    },
  ],
  models: [vehicle],
};

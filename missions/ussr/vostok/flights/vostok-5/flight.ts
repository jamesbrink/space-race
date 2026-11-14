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

/** Moscow time on a day of June 1963, as seconds from liftoff at 14:58:58 on the 14th. */
const MSK = (day: number, h: number, m: number, s = 0) => ((day - 14) * 24 + h - 14) * 3600 + (m - 58) * 60 + (s - 58);

const parts: Part[] = [
  {
    node: 'DescentModule',
    group: 'Spacecraft',
    name: 'Descent module',
    summary: 'The ball one man lived in alone for five days. Nobody has been alone in orbit for longer since.',
    detail:
      'A sphere needs no steering to survive entry: whichever way it meets the air the flow round it is the same, so ' +
      'all of it is heat shield and its weight is put low and behind the pilot to turn it heavy side first. Bykovskiy ' +
      'was in this one for 119 hours, by himself, which is still the longest anyone has flown alone. It had been built ' +
      'the year before and had waited more than a year for its rocket; it then stood five days on the pad. Coming down, ' +
      'after the engine had stopped and before the two halves of the ship parted, it tumbled fast and without order; ' +
      'once free it settled, and he said the loads were not great. The hatch went with a loud bang and two seconds ' +
      'later he was out. The ball landed a kilometre and a half or two from him, in steppe north-west of Karaganda, ' +
      'two degrees of latitude beyond where it was aimed. It is kept at the Tsiolkovsky museum in Kaluga, scorched, with shreds of its insulation still on it.',
    facts: [
      ['Diameter', '2.3 m over the heat shield; pressure hull 2.2 m'],
      ['Mass', '2,460 kg (the type)'],
      ['Hatches', '3, each 1 m in the clear'],
      ['Portholes', '3, two of them in hatch covers'],
      ['Lived in', '4 d 23 h 6 min, by one man'],
      ['Landed', '1.5 to 2 km from its pilot (his estimate)'],
    ],
    explode: [0, LIFT, 0],
    order: SHIP + 1,
  },
  {
    node: 'EntryHatch',
    group: 'Spacecraft',
    name: 'Hatch No. 1',
    summary: 'Closed on the pad over a cut lanyard, and taken off again forty minutes before the time.',
    detail:
      'Over the pilot’s head, on the line of his seat’s rails, with one of the three portholes in it. The last thing ' +
      'done before it is closed is to draw the safety pin from the ejection seat by its lanyard, which arms the seat. ' +
      'On 14 June the lanyard jammed. The fitter, the suit works’ best man, did not report it: he cut the lanyard ' +
      'with a knife, the lead engineer took his word that this would do, and the hatch was bolted down over a seat ' +
      'that would almost certainly not have fired. Back on the ground the fitter told his mates, who raised the ' +
      'alarm, and Alekseev, who built the seat, refused to let the ship go. Bykovskiy, inside, watched the hatch come ' +
      'off again: “they were fiddling with the lanyard”. It cost half an hour. Five days later it was blown off at ' +
      'seven kilometres and he followed it out two seconds after.',
    facts: [
      ['Clear diameter', '1 m'],
      ['Screws', '30 (counted on Vostok 1’s)'],
      ['Reopened on the pad', '14 June, at the 40-minute readiness: 30 minutes lost'],
      ['Released', 'at about 7 km; the seat left 2 s later (his report)'],
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
      'had gone and set the empty ball down in the steppe. Nobody at the control post knew where for hours: both ships ' +
      'came down two degrees of latitude north of the aiming point, the search was looking in the wrong place, and the ' +
      'first word that Bykovskiy was well came from the commander of an air regiment who flew over and saw the ball, ' +
      'a crowd, cars and a man in the middle of them. The ballistics men put the overshoot down to the backup command ' +
      'for the descent having gone in as well as the first. Kamanin wrote that he found the explanation “wholly ' +
      'unsatisfactory”.',
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
    summary: 'Stocked for eight days and “filled to the limit”: the clock out of sight, the first-aid kit out of reach.',
    detail:
      'The flight was planned for eight days, with air for ten, and the stores for it left the ship with no weight to ' +
      'spare: when Kamanin asked for a 1.5 kg spyglass to be carried, Korolev climbed into the sister ship to look ' +
      'for a place and found none. Bykovskiy’s account of living in it is the plainest any Vostok pilot gave. Everything was well ' +
      'placed except the clock, though the dials were hard to read; the Globus, set once a day, kept true; the rations ' +
      'had been stowed in the wrong order and the empty tubes and wrappers got in the way; the first-aid kit could not ' +
      'be reached without leaving the seat. The cabin was 30 °C at liftoff and 15 at the end of the first day, and on ' +
      'the 17th he was told to hold it at 10 in case the falling orbit cooled it further. He watched peas sprout, and ' +
      'shook a tube of liquid to see whether its bubble would break. What is modelled is the type’s cabin with this ' +
      'flight’s cameras; no drawing or photograph of the stores was found, and none is built.',
    facts: [
      ['Planned for', '8 days; air and oxygen for 10 (Kamanin)'],
      ['Cabin temperature', '30 °C at liftoff, 15 °C after a day; held at 10 °C on orders from the 17th'],
      ['Globus', 'checked and reset once a day; “works accurately”'],
      ['Aboard, by his report', 'binoculars, light filters, dosimeters, sprouting peas'],
      ['Dosimeters', '“without movement”'],
    ],
    explode: [0, LIFT, 0],
    order: SHIP + 1,
  },
  {
    node: 'EjectionSeat',
    group: 'Spacecraft',
    inside: true,
    name: 'Ejection seat and pilot',
    summary: 'Bykovskiy, 28, in a seat first balanced for a woman: he weighed 90.7 kg in his suit, and that decided it.',
    detail:
      'The seat lies across the ball, tilted so that its rails run out through hatch No. 1: escape system on the pad, ' +
      'landing system at the end. Both of the last two ships were first meant for women, and both seats were made for ' +
      'them. When this one was balanced again for a man it suited Bykovskiy, at 90.7 kg in his suit, and could not be ' +
      'made to suit his backup Volynov at 104.5; the ship had no weight to give either. In orbit he undid the harness ' +
      'by the table, the way Nikolayev and Popovich had taught him: “first my head went up, and I stuck to the ceiling ' +
      'by my stomach”. He floated an orbit at a time and looked forward to the orbits where it was planned, though the ' +
      'suit’s fan had to be off while he did. The helmet pressed on his right side for five days. The figure wears the ' +
      'SK-1, lettered СССР as the photographs of the morning show, with the breathing valve’s disc at the collar and ' +
      'black gloves. His height was not found: it is the figure built to Gagarin’s 1.65 m.',
    facts: [
      ['Pilot', 'Valeriy F. Bykovskiy, 28; a major when he was named, a lieutenant colonel in the announcement'],
      ['Callsign', 'Yastreb (Ястреб, “Hawk”)'],
      ['In his suit', '90.7 kg (Kamanin, 7 May 1963)'],
      ['Out of the seat', 'an orbit at a time, on the orbits planned for it'],
      ['Landed', '14:06 Moscow time, 19 June, 119 h 6 min after liftoff'],
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
    summary: 'How the ground found out he was asleep: eyes shut, not moving, pulse 54.',
    detail:
      'The Seliger cameras of the year before, 400 lines ten times a second, and by now part of how a flight was run. ' +
      'On the sixth orbit the control post saw him, “serious and a little tired”; Kamanin said they were watching and ' +
      'asked for a smile, and the room laughed when it came. On the evening of the 15th he stopped answering two orbits ' +
      'before his sleep was due. The camera showed him still, with his eyes closed, and the telemetry gave a pulse of ' +
      '54: asleep, and he would not own to it when Gagarin raised him an hour later. The cameras’ mass and power are documented; their case, ' +
      'bracket, lens and plug are read off the one photograph of a Seliger camera, and every size is estimated. The ' +
      'one that looks at his face is placed to give the view the received pictures show. Where the second stood is ' +
      'not known: it is put at his right.',
    facts: [
      ['System', 'Seliger: 400 lines of 400 elements, 10 frames/s (as Vostok 3’s)'],
      ['Cameras', '2, each 3 kg and 12 W, on a one-inch vidicon'],
      ['First seen', '14 June, on the sixth orbit'],
      ['Seen asleep', '15 June, on the 22nd orbit'],
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
    summary: 'A cine camera that jammed, one cassette with no film in it, and the best spyglass aboard.',
    detail:
      'He filmed in black and white: the horizon, the Moon, the Earth, and the dark halo under the Earth’s edge that ' +
      'brightens into dawn as the ship comes out of the shadow. The cassette went into the camera badly and it jammed; ' +
      'one cassette turned out to have been sent up empty. The binoculars he had been given “gave nothing”, being hard ' +
      'to focus, so he looked at the Earth through the camera instead, and through it and the portholes made out ' +
      'fields, dry river beds, the wakes of ships, fjords, and at night the lights of cities in South America. Nothing ' +
      'read names the camera. It is built as the Konvas that Titov carried, a camera whose film goes in as a cassette, ' +
      'which is how he speaks of his: an assumption, and so is its place at his right hand. The bureau’s history ' +
      'says these two flights were filmed in colour as well, and that the frames of the horizon were measured for ' +
      'brightness afterwards. The binoculars are not built: nothing was found of their kind.',
    facts: [
      ['Kind', 'assumed: Konvas-Avtomat, 35 mm (as Vostok 2’s)'],
      ['Size', '290 × 260 × 240 mm, 5.7 kg (that type, as sold)'],
      ['Film', 'black and white (his report); colour as well (RKK Energia’s history)'],
      ['Filmed', 'the horizon, the Moon, the Earth'],
      ['Trouble', 'the cassette seated badly and jammed; one cassette empty'],
    ],
    explode: [0, LIFT, 0],
    order: SHIP + 1,
  },
  {
    node: 'RetainingStraps',
    group: 'Spacecraft',
    name: 'Retaining straps',
    summary: 'Four steel bands and one lock: until it let go, the whole ship tumbled.',
    detail:
      'Four bands run from the instrument module’s ring over the sphere and meet in a single lock at its top. After the ' +
      'braking engine had run its 39 seconds, and before the lock let the bands go, Bykovskiy felt “a fast, disorderly ' +
      'rotation”. Then the bands went and the ball was by itself, heavy side first, and the loads were not great. He ' +
      'does not say how long the tumbling lasted or what he took it for. Siddiqi reads it as the modules failing to ' +
      'part on time, as on the first two flights; the report as Kamanin wrote it down does not say so. Each strap ' +
      'carries a hairpin antenna of the command link. They swing back as they would when released; how far they ' +
      'sprang is not recorded.',
    facts: [
      ['Straps', '4, joined by one pyrotechnic lock'],
      ['Before release', '“a fast, disorderly rotation” (his report)'],
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
    summary: 'Everything the cabin knows of the other half of the ship comes up this.',
    detail:
      'Power, commands and telemetry cross from the instrument module to the cabin through one mast of cables, plugged ' +
      'into a plate on the side of the ball. On the first two flights the plate did not come away when the modules ' +
      'parted. Nothing of the kind is told of this one: Bykovskiy’s report goes from the tumbling to the hatch without ' +
      'a word of being held. In the weeks before, though, the wiring had been the trouble. Of the two ships’ ' +
      'instruments 28 had failed in test and been changed, a stray washer was found inside a distribution box, “again, ' +
      'as in 1962”, and Korolev said of the work at the range that it was “starting almost from nothing”. What was ' +
      'changed in the mast itself since Vostok 2 was not found, so it is built as the type’s.',
    facts: [
      ['Separation', 'nothing reported against it'],
      ['Instruments changed in test', '28, on the two ships together (Kamanin, 11 May 1963)'],
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
    summary: 'He kept the account himself: ten atmospheres for ten minutes of turning the ship by hand.',
    detail:
      'A necklace of pressure spheres round the joint, outside both hulls: gas for the attitude jets, and the cabin’s ' +
      'reserve. Bykovskiy is the first pilot whose report says what turning the ship cost. Ten minutes of orienting ' +
      'by hand, looking for the spent third stage, took 10 atmospheres off the bottles’ pressure; taking up the ' +
      'attitude for descent, engine first, took 5 more. “The ship followed the stick easily.” Set rolling to the ' +
      'right, it turned once in eight minutes by the stars and the Moon; left alone after that it wandered off in ' +
      'pitch, so that holding an attitude meant spending more. Three of the ship’s bottles, two of air and one of ' +
      'oxygen, were there to feed the suit for three to three and a half hours if the cabin lost its pressure; before ' +
      'the launch Korolev had the makers answer for how much they would leak in five days of waiting and ten of ' +
      'flight. Sources give fourteen, sixteen and twelve bottles on the ring; fourteen are modelled, in sixteen ' +
      'places, with a gap where the cable mast passes.',
    facts: [
      ['Bottles', '14 modelled (sources: 12, 14, 16)'],
      ['Ten minutes of orienting by hand', '10 atm off the store (his report)'],
      ['Taking the descent attitude', '5 atm more'],
      ['Set rolling', 'one turn in 8 minutes'],
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
    summary: 'Two cones base to base. Both its VHF transmitters were dead on the pad, and they flew anyway.',
    detail:
      'A sealed hull of two cones filled with dry nitrogen, carrying the batteries, radios, the orientation system and ' +
      'the braking engine. The aft cone is the radiator: shutters over it open and close to hold the temperature. This ' +
      'one’s radios made the trouble. Rollout on 6 June was put off because the command link’s receiver had failed, a ' +
      'triode with a broken lead. On the pad on the 14th, with Bykovskiy aboard, neither VHF transmitter worked: he ' +
      'could hear the ground on six channels and be heard on three, all short wave. Asked whether to launch without ' +
      'them, the Air Force men said at once: fly. In orbit both transmitters worked. The voice link to Vostok 6 was ' +
      'excellent on the first day they shared, poorer on the second, and on the third each heard only the ground. ' +
      'Floating by a porthole on his second day he saw one of the antennas, and a loose piece of the ship’s covering ' +
      'flapping. It burned up on 19 June.',
    facts: [
      ['Greatest diameter', '2.43 m'],
      ['Length', '2.25 m'],
      ['Mass', '2,270 kg (the type)'],
      ['Attitude jets', '2 sets of 8, 1.5 kgf each'],
      ['On the pad', 'both VHF transmitters dead; 3 short-wave channels left'],
      ['Seen from inside', 'an antenna, and a piece of covering hanging loose'],
    ],
    explode: [0, 0, 0],
    order: SHIP + 2,
  },
  {
    node: 'Antennas',
    group: 'Spacecraft',
    name: 'Antennas',
    summary: 'Ten of the eleven, folded under the fairing; one of them the only part of his ship he ever saw from outside.',
    detail:
      'A fan of three whips by the frame, three long whips trailing from beside the engine, and four ribbon antennas ' +
      'standing aft: short-wave and VHF voice, the Signal beacon, telemetry, the command link and television. They ' +
      'were let out when the ship parted from its third stage; Bykovskiy saw “snowflakes” go by at that moment and ' +
      'turned the ship to look for the stage. Loose in the cabin on the second day he put his face to the portholes ' +
      'and saw an antenna. Under the fairing they were folded against the hull. How has not been found: here they are ' +
      'drawn withdrawn into the hull and slide out, which is not how it was done. Which antenna served which system ' +
      'is not known to us, and none is known to have been added or moved for this flight.',
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
    summary: 'One engine with no spare, under a ship whose orbit was already coming down by itself: 39 seconds.',
    detail:
      'Isaev’s S5.4: 1.6 tonnes of thrust for up to 45 seconds on self-igniting propellants, with four small steering ' +
      'nozzles round the chamber. There was one, and the answer to its failing was the orbit, kept low enough for the ' +
      'air to bring the ship down inside the ten days its stores allowed. On this flight that answer nearly turned ' +
      'into the question. The ship was left lower than planned, the ballistics men said the restless Sun had thickened the ' +
      'high air, and by the third day the orbit was falling fast enough that a ship left up for eight days might come down ' +
      'by itself, wherever it happened to be. So the flight was cut to five, and the engine did the work it was there ' +
      'for. “Gagarin passed up: Chayka has landed, now it is your turn.” He saw the solar orientation take hold, felt ' +
      'the engine start smoothly, and timed it at 39 seconds.',
    facts: [
      ['Thrust', '1,614 kgf (15.8 kN)'],
      ['Propellant', '280 kg: amine fuel and nitric acid'],
      ['Burn', '39 s (his report); 45 s at most'],
      ['Lit', '19 June, on the 82nd orbit; the minute was not found'],
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
  'Bykovskiy heard the engines only faintly, found the loads smooth, and “hardly noticed” the four of them go.';

const launcherParts: Part[] = [
  {
    node: 'Fairing',
    group: 'Third stage',
    name: 'Fairing',
    summary: 'Two halves, and a round hole he sat behind for five hours.',
    detail:
      'It covers the ship through the thick air and is dropped in two halves some two and a half minutes up. The round ' +
      'opening is over hatch No. 1: it is the way in from the lift, and the way out on the seat if the rocket fails on ' +
      'the pad or low in the climb, which is why a seat that could not fire stopped the count. Bykovskiy went aboard ' +
      'through it two and a quarter hours before a launch set for noon, Moscow time, and left the ground at 14:59. He ' +
      'had found it “rather hot” in the suit before he got in. Korolev, over the link, told him not to worry, there ' +
      'were two or three hours in hand; “Gagarin said nothing”. Its lengths are from a NASA drawing and the curve of ' +
      'its nose from the vehicles kept at Kaluga and in Moscow; nothing read says this flight’s differed from Vostok ' +
      '1’s.',
    facts: [
      ['Length', '6.6 m'],
      ['Diameter', '2.7 m'],
      ['Mass', 'about 0.8 t'],
      ['Opening', 'over hatch No. 1, for boarding and ejection'],
      ['Aboard before liftoff', 'about five hours'],
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
    summary: 'Its gyroscope was changed on the fuelled rocket with the pilot aboard, and it left him in too low an orbit.',
    detail:
      'Built in nine months of 1958 to throw a probe at the Moon, then given a longer adapter for the Vostok. To keep ' +
      'it short its tanks are two rings, one above the other, with the engine in the hole. Five minutes before the ' +
      'time on 14 June the lamp in the bunker that confirms this stage ready did not light: a gyroscope of its ' +
      'guidance had failed. To stand down meant draining the rocket and sending it back to the works, with no launch ' +
      'before August, and the window closed at 15:00. Marshal Krylov and others advised giving up. Korolev, Tyulin, ' +
      'Kirillov and Pilyugin did not, and the instrument was changed where it stood. That morning Korolev had asked ' +
      'Bykovskiy to report on this stage’s work and on the moment of separation. He did not feel it start; he heard a ' +
      'bang as it stopped, turned the ship to look for it, and saw “a big twinkling star” at the edge of the Earth. ' +
      'The orbit was lower than the one asked for, and that, not the pilot, ended the flight on the fifth day. ' +
      'Siddiqi puts it down to this stage; an American analysis at the time thought the ship had parted from it early; ' +
      'neither Kamanin nor Chertok says. The stage’s figures are the type’s.',
    facts: [
      ['Length', '2.98 m with its adapter'],
      ['Diameter', '2.58 m'],
      ['Mass', '7,984 kg fuelled, 1,472 kg burnt out'],
      ['Engine', 'RD-0109: 54.5 kN in vacuum, 121 kg'],
      ['Engine’s size', '1,555 mm long; nozzle exit 733 mm across'],
      ['On the pad', 'a gyroscope changed, three hours late'],
      ['Orbit reached', '174.7 × 222.1 km (asked for, and announced first: 181 × 235)'],
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
      'to go somewhere: out between the struts of this lattice, turned aside by the cone on the core’s top. From ' +
      'inside it was nothing at all. “I did not feel the third stage come on,” Bykovskiy reported.',
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
    summary: 'Second stage, though it lights first. This one stood on the pad five days while the Sun was argued over.',
    detail:
      'Called the second stage, but its engine starts on the pad with the boosters’, because an engine that failed to ' +
      'start on the ground could be shut down and tried again. It carries twice a booster’s propellant and burns two ' +
      'and a half times as long. Its shape follows from the boosters round it: narrow at the foot where they crowd in, ' +
      'widest 20 m up where their tips push on a heavy frame. This vehicle had waited more than a year to fly. On ' +
      '4 June the wind was gusting to 20 m/s, too much for a rocket on its carriage, which “has a great deal of ' +
      'sail”; on the 6th the rollout was put off for a failed radio receiver; it went to the pad on the 9th. The launch set for the 11th was called off the night before, the first time one ' +
      'had been, on the Crimean observatory’s warning of flares on the Sun; Korolev, furious at the caution, said the ' +
      'rocket could stand where it was for two weeks. It stood five days. Every station between the core’s ends is ' +
      'estimated.',
    facts: [
      ['Length', '27.5 m; 28.75 m with the lattice'],
      ['Diameter', '2.05 m at the foot, 2.95 m at the frame'],
      ['Mass', 'about 100 t at liftoff, 7 to 8 t empty'],
      ['On the pad', 'from 9 June to 14 June'],
      ['Launch called off', '10 June, for the Sun: the first postponement of a crewed launch'],
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
      'ground, each by its own pyrotechnic igniter. These were lit at the last minute there was: after 15:00 Moscow ' +
      'time, Kamanin wrote, the zone the ship might come down in grew too wide. “The launch was at ' +
      '14:59,” Bykovskiy said afterwards, “and the radio announced 15:00.”',
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
  url: 'models/ussr/vostok/vostok-5/vehicle.glb',
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
    // (through the cutaway's opening, from his right and a little toward his feet: both cameras, and the man they look at)
    { id: 'television', label: 'Television', nodes: ['TelevisionCameras'], from: along(RIGHT - 18, 20, 1) },
    // (from a little aft of his right side: the turret, the magazine and the viewfinder all show)
    { id: 'konvas', label: 'Film camera', nodes: ['FilmCamera'], from: along(RIGHT - 32, 24, 1) },
    { id: 'instrument', label: 'Instrument module', nodes: ['InstrumentModule', 'GasBottles', 'Antennas'] },
    { id: 'engine', label: 'Braking engine', nodes: ['RetroEngine'], from: along(250, -32, 1) },
  ],
};

export const flight: Flight = {
  id: 'ussr/vostok/vostok-5',
  nation: 'USSR',
  agency: 'OKB-1',
  program: 'Vostok',
  designation: 'Vostok 5',
  callsign: 'Yastreb (Ястреб)',
  spacecraft: 'Vostok 3KA No. 7',
  launchVehicle: 'Vostok-K 8K72K, No. E103-24',
  // 14:58:58 Moscow time (Siddiqi, p. 368: "1458 hours, 58 seconds Moscow Time"; his launch log prints 1158:58, which is UTC
  // in a column headed Moscow Time; McDowell's log 1158:58 UTC). Bykovskiy to the State Commission, 20 June: «Взлет
  // произошел в 14 часов 59 минут, а по радио объявили — в 15 часов». spacefacts.de and RussianSpaceWeb print :59.
  launch: '1963-06-14T11:58:58Z',
  launchSite: SITE1.name,
  site: SITE1,
  crew: ['Valeriy F. Bykovskiy'],
  summary:
    'Five days alone in orbit, which nobody has matched since. Eighty-one orbits from Tyuratam after a countdown that ' +
    'failed three times in an afternoon, in an orbit too low to last the eight days planned; for three of the five days ' +
    'Vostok 6 flew within radio call. It ended with the pilot ejecting and landing by parachute in the steppe north-west ' +
    'of Karaganda.',
  facts: [
    { label: 'Liftoff', value: '14 June 1963, 11:58:58 UTC (14:58:58 Moscow time)' },
    { label: 'Pilot', value: 'Valeriy F. Bykovskiy, aged 28' },
    { label: 'Duration', value: '4 d 23 h 7 min to his landing; 118 h 56 min 41 s on the record’s books' },
    { label: 'Orbits', value: '81' },
    { label: 'Orbit', value: '174.7 × 222.1 km, 64.96°' },
    { label: 'Mass in orbit', value: '4,720 kg' },
    { label: 'Planned', value: '8 days; cut to 5 on 17 and 18 June, the orbit decaying' },
    { label: 'Landing', value: '19 June, 14:06 Moscow time, 540 km north-west of Karaganda' },
  ],
  // Moscow times. Kamanin's diary keeps the range's clock, two hours ahead, and is converted; the hours given for an
  // orbit's number are reckoned from the period and say "about" (README.md)
  timeline: [
    {
      t: 0,
      event:
        'Liftoff, 14:58:58 Moscow time, three hours late and in the last minutes of the window: a cut lanyard on the seat, then a gyroscope of the third stage',
    },
    { t: MSK(14, 19, 30), event: 'On the fourth orbit Khrushchev speaks to him' },
    { t: MSK(14, 22, 20), event: 'About seven hours up, on the sixth orbit, the control post sees him on television and asks for a smile' },
    {
      t: MSK(15, 21, 55),
      event: 'About thirty-one hours up, on the 22nd orbit, he stops answering: the camera shows him asleep, pulse 54',
    },
    { t: MSK(16, 12, 29, 52), event: 'Vostok 6 lifts off from the same pad; within half an hour the two ships are talking' },
    {
      t: MSK(17, 9, 30),
      event: 'The orbit is too low for seven days: the flight is to be five or six, and he is told to hold the cabin at 10 °C',
    },
    { t: MSK(18, 9, 5), event: 'Khabarovsk takes down “a cosmic knock”; asked, he laughs: not stuk but stul' },
    { t: MSK(18, 14, 34), event: 'A telegram goes up: he has been admitted to the Party in flight' },
    { t: MSK(18, 20, 0), event: 'In the evening it is settled: Vostok 6 lands on her 49th orbit, Vostok 5 on his 82nd, both on the 19th' },
    { t: MSK(19, 11, 20), event: 'Vostok 6’s pilot lands; “Chayka has landed, now it is your turn”' },
    {
      t: MSK(19, 13, 55, 39),
      event:
        'The flight ends as the record counts it, at 118 h 56 min 41 s: the ball down (Siddiqi), or the pilot out of it (the rule the record keeper’s notes show)',
    },
    { t: MSK(19, 14, 6), event: 'Bykovskiy lands by parachute between two villages, 1.5 to 2 km from the ball' },
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
      value: 4720,
      unit: 'kg',
      confidence: 'documented',
      note: '4,720 kg (Siddiqi, Challenge to Apollo, Table IB). The lightest of the six but one, with stores for eight days aboard: Kamanin, 7 May 1963, has OKB-1 in “great difficulty keeping to the greatest permitted weight”. McDowell’s log rounds to 4.7 t',
    },
    {
      group: 'Spacecraft',
      label: 'Descent module mass',
      value: 2460,
      unit: 'kg',
      confidence: 'documented',
      note: '2.46 t for the type (Siddiqi p. 195). No. 7’s own figure has not been found',
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
      value: 174.7,
      unit: 'km',
      confidence: 'documented',
      note: '174.7 km (Siddiqi, p. 368 and Table IB, “initial orbital parameters”). Lower than asked for, “evidently because of the less-than-nominal performance by the third stage” (Siddiqi, giving no source); TASS at liftoff: 181 km, the orbit asked for; 175 km at 22:12; 159 km by 15:00 on 18 June. No OKB-1 report of this flight has been read',
    },
    {
      group: 'Spacecraft',
      label: 'Apogee',
      value: 222.1,
      unit: 'km',
      confidence: 'documented',
      note: '222.1 km (Siddiqi, p. 368 and Table IB). TASS at liftoff: 235 km; 222 km at 22:12; 193 km by 15:00 on 18 June',
    },
    {
      group: 'Spacecraft',
      label: 'Inclination',
      value: 64.96,
      unit: 'deg',
      confidence: 'documented',
      note: '64.96° (Siddiqi, p. 368 and Table IB); 64°58′ in the TASS report of 22:12 on 14 June; “about 65°” at liftoff; spacefacts.de prints 64.97°',
    },
    {
      group: 'Spacecraft',
      label: 'Period',
      value: 88.27,
      unit: 'min',
      confidence: 'documented',
      note: '88.27 min (RussianSpaceWeb’s table of the flight, from the Soviet encyclopedia; Russian Wikipedia). 174.7 × 222.1 km over a sphere of 6,371 km give 88.3 by Kepler’s law. TASS at liftoff gave 88.4 min with 181 × 235 km, the orbit asked for, and 88.27 with 175 × 222 km at the end of the fifth orbit, 22:12 Moscow time',
    },
    {
      group: 'Spacecraft',
      label: 'Planned duration',
      value: 8,
      unit: 'days',
      confidence: 'documented',
      note: 'up to eight days (Kamanin, 13 April and 4 June 1963: «мужчины продолжительностью до 8 суток»), with air and oxygen reckoned for ten (28 May). Flown: 4 d 23 h. On 17 June “a seven-day flight is practically excluded because of the low orbit”; on the 18th “the orbit is falling fast, and more than five days is not safe”',
    },
    {
      group: 'Spacecraft',
      label: 'Cabin temperature after the first day',
      value: 15,
      unit: '°C',
      confidence: 'documented',
      note: 'from 30 °C at liftoff to 15 °C over the first day (his report of 20 June, as Kamanin wrote it down); 14 °C in an exchange of 17 June, when he was ordered to hold 10 °C “as a precaution, in case the temperature falls as the orbit comes down”',
    },
    {
      group: 'Spacecraft',
      label: 'Pilot in his suit',
      value: 90.7,
      unit: 'kg',
      confidence: 'documented',
      note: '«Быковский, который в скафандре весит 90,7 килограммов» (Kamanin, 7 May 1963); Volynov, his backup, 104.5 kg, which the seat as balanced and the ship as loaded could not take',
    },
    {
      group: 'Spacecraft',
      label: 'Television camera, mass',
      value: 3,
      unit: 'kg',
      confidence: 'documented',
      note: 'each of the two Seliger cameras: 3 kg, 12 W, on a one-inch vidicon (Efimov, «Путь к “Востоку”», Elektrosvyaz, 2007; the same, Tele-Sputnik, 1996 No. 5, where the 400-line cameras are those of “Vostok 3 and the others”). That this ship’s were of that kind is assumed; that it had television is Kamanin’s, 14 and 16 June 1963',
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
      note: 'that he filmed by hand, in black and white, with a camera loaded by cassette is documented (his report: «Проводил киносъемку на черно-белую пленку … Кассета плохо входила в киноаппарат, и его заедало»); what kind is not. It is built as Vostok 2’s Konvas-Avtomat, 290 × 260 × 240 mm as a type: an assumption. RKK Energia’s history has these two flights filmed “not only on black-and-white but on ordinary colour film”',
    },
    {
      group: 'Spacecraft',
      label: 'Pilot height, as modelled',
      value: 1.65,
      unit: 'm',
      confidence: 'estimated',
      note: 'assumed: the figure in the seat is the suit module’s own, built to Gagarin’s recorded 165 cm. No document with Bykovskiy’s height was found. His 90.7 kg in the suit (Kamanin), less the 23 kg Abramov and Skoog give the suit with its kit, is Gagarin’s 68 kg',
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
      note: '287 t, the type’s figure and Vostok 1’s (RKK Energia 1946–1996; Minakov; Siddiqi). No. E103-24’s own was not found',
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
      note: 'east of north, for an orbit inclined 64.96° from latitude 45.92°, before the Earth’s turning is allowed for. The azimuth as flown was not found',
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
      note: '815.9 kN at the ground, 997.7 kN in vacuum; 256 and 313 s (NPO Energomash’s table by vehicle (row 8K72K), as reproduced by Brügge). The burn is the type’s, 118 s (Minakov): the time the strap-ons left on this flight was not found (Vostok 1: 119 s). Bykovskiy “hardly noticed” them go',
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
      note: '54.5 kN in vacuum, 323.5 s (Brügge; Encyclopedia Astronautica 54.52 kN, 324 s). No burn time is given: rated burns in print run from 365 to 440 s, and this flight’s times were not found. The stage left the ship in an orbit lower than asked for (Chertok, vol. 3, p. 223; Siddiqi, p. 368: “less-than-nominal performance”); by how much it fell short, and why, is in nothing read. A gyroscope of its guidance was changed on the pad that afternoon (Chertok, p. 222)',
    },
    {
      name: 'TDU-1 (Isaev S5.4) braking engine',
      count: 1,
      thrustN: 1614 * KGF,
      burnS: 45,
      propellant: 'amine fuel (TG-02) / nitric acid (AK-20F)',
      kind: 'liquid',
      confidence: 'documented',
      note: '1.614 tf, 45 s at most (Siddiqi p. 197); 280 kg of propellant. Flown: 39 s by Bykovskiy’s count («ТДУ включилась плавно, работала 39 секунд»: his report to the State Commission, 20 June, as Kamanin wrote it down), on 19 June on the 82nd orbit; the minute was not found',
    },
    {
      name: 'Attitude jet',
      count: 16,
      thrustN: 1.5 * KGF,
      propellant: 'compressed gas',
      confidence: 'documented',
      note: 'two independent sets of eight, 1.5 kgf each (Siddiqi p. 197; the encyclopedia text gives 14.7 N). Bykovskiy’s report calls the store “air”: ten minutes of orienting by hand took 10 atmospheres off it and the descent attitude 5 more; the type’s record has nitrogen',
    },
  ],
  models: [vehicle],
};

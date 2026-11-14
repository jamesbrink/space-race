import type { Flight, ModelDef, Move, Part } from '../../../../../src/types';
import { SITE1 } from '../../../vostok/sites/site-1.ts';
import { voskhodCabin, voskhodSeat } from '../../vehicles/cabin.ts';

const DEG = Math.PI / 180;
const KGF = 9.80665;

// Where things are on the model, as vehicles/voskhod.py and the Vostok's vostok_3ka.py have them: azimuths about the
// long axis from the model's +X, latitudes on the sphere above the plane square to that axis. The numbers live there.
const ENTRY = { az: 135, lat: 24 }; // hatch No. 1: at the crew's right
const PARACHUTE = { az: 45, lat: 30 }; // hatch No. 2: beyond their heads
const LOCK = { az: 315, lat: 15 }; // hatch No. 3, and the airlock's line: at the crew's left
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
/** The main nozzles' exits below the model's origin (the spacecraft's braking nozzle), m (vehicles/voskhod_11a57/). */
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
/** The instrument module's ten antennas, built stowed (vostok_3ka.py: STOWED): how far each slides out, m, in the viewer's axes. */
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
 * The airlock is built folded (vehicles/voskhod.py: nine bands of its soft tube standing inside one another under its
 * head) and is drawn out here: each band 0.225 m further than the one below it, the head 1.8 m. The real one unfolded
 * as its air beams filled; nothing in it slid.
 */
const BANDS = 9;
const BAND_TRAVEL = 0.225;

/**
 * The slider takes the launch vehicle apart first and the spacecraft after it. Every part of the launch vehicle is of
 * order 0, so it is away by half way; the spacecraft's parts are of orders SHIP to SHIP + 2 (explode.ts: partProgress).
 * Between 0.3 and 0.4 the antennas come out and the airlock is drawn out; from 0.4 to about 0.45 the spacecraft stands
 * alone as it was in orbit during the walk, the outer hatch open.
 */
const SHIP = 9;
/** A reading of the spacecraft's own sequence (0 to 1) on the whole vehicle's slider. */
const later = (t: number) => (SHIP / (SHIP + 2)) * 0.5 + (1 - (SHIP / (SHIP + 2)) * 0.5) * t;

/** Moscow time on a day of March 1965, as seconds from liftoff at 10:00:00 on the 18th. */
const MSK = (day: number, h: number, m: number, s = 0) => ((day - 18) * 24 + h - 10) * 3600 + m * 60 + s;

const couch = (node: string, name: string, summary: string, detail: string, facts: [string, string][], out: number, at: number): Part => ({
  node,
  group: 'Spacecraft',
  inside: true,
  name,
  summary,
  detail,
  facts,
  explode: [0, LIFT, 0],
  // (drawn out past the entry hatch's side one after the other, so that each can be seen whole: nothing left the ship this way)
  moves: [{ kind: 'slide', by: along(ENTRY.az, ENTRY.lat, out), from: later(at), to: later(at + 0.24) }],
  order: SHIP + 1,
});

const parts: Part[] = [
  {
    node: 'DescentModule',
    group: 'Spacecraft',
    name: 'Descent module',
    summary: 'The Vostok’s ball again, which came down in the forest 368 km past its mark with a birch across its hatch.',
    detail:
      'The same sphere as the first Voskhod’s, with two couches in place of three and an airlock on the hatch a Vostok ' +
      'used for assembly. On 19 March the automatic orientation failed and the ship was turned by hand an orbit ' +
      'late; the braking engine was fired with neither man in his couch, the instrument module came away only as the ' +
      'air burned its fastenings, and the ball flew past the steppe it was aimed at into the forest north of Perm. ' +
      'It came down among trees in a metre and a half of snow, with a birch lying across the hatch. The aerial ' +
      'would not work until they had hung it on parachute lines, and for three hours ' +
      'nobody knew where they were. The record’s file puts the place at 59°34′03″ N, 55°28′00″ E, 180 km north by ' +
      'north-west of Perm. It is kept at RKK Energia’s museum.',
    facts: [
      ['Diameter', '2.3 m over the heat shield (the Vostok’s)'],
      ['Landed', '19 March 1965, 12:02:17 Moscow time'],
      ['Where', '59°34′03″ N, 55°28′00″ E (the record’s file)'],
      ['Past its mark by', '368 km (Kamanin; Chertok)'],
      ['Load at entry', 'about 7 g, “no more” (Belyayev)'],
    ],
    explode: [0, LIFT, 0],
    order: SHIP + 1,
  },
  {
    node: 'EntryHatch',
    group: 'Spacecraft',
    name: 'Hatch No. 1',
    summary: 'The way in on the pad, Leonov first; two days later, the way out into the snow.',
    detail:
      'At the crew’s right. Leonov went aboard first, to the couch further from it, and Belyayev after him. There ' +
      'were no ejection seats and no escape rocket, as on the first Voskhod; this crew at least wore pressure ' +
      'suits. After the landing the cover would not move for a birch trunk lying against it. They got it open and ' +
      'climbed out into deep snow, in forest that stood 25 to 30 m high round them.',
    facts: [
      ['Clear diameter', '1 m (the Vostok’s)'],
      ['Order in', 'Leonov, then Belyayev (Belyayev’s report)'],
      ['After landing', 'blocked by a birch'],
    ],
    explode: [0, LIFT, 0],
    moves: [{ kind: 'slide', by: along(ENTRY.az, ENTRY.lat, 1.3), from: later(0.42), to: later(0.6) }],
    order: SHIP + 1,
  },
  {
    node: 'ParachuteHatch',
    group: 'Spacecraft',
    name: 'Hatch No. 2',
    summary: 'Over the parachutes and the braking rocket in their lines, which worked in the trees.',
    detail:
      'Beyond the crew’s heads. Behind it are the two main parachutes and the solid rocket that fires a metre above ' +
      'the ground. Korolev’s fear for a landing in forest was that the probe would touch a branch and fire the rocket ' +
      'in the tree tops, leaving the ball to fall the rest of the way. It did not: the landing system came on at ' +
      '11:56:08 and the ball was down six minutes later. What the search pilot saw from the air was the red ' +
      'parachute, and two men beside it.',
    facts: [
      ['Landing system on', '11:56:08 Moscow time (the record’s file)'],
      ['Main parachutes', '2, and a braking rocket in their lines'],
      ['Seen from the air', '“the red parachute and the two cosmonauts” (Kamanin)'],
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
    summary: 'Two couches, two men in pressure suits, and the Vzor where neither of them could look through it.',
    detail:
      'The first Voskhod’s cabin with the couch nearest the airlock taken out: the cover of the hatch into the ' +
      'airlock swung inward and took up to a third of the cabin when it was open. The Vzor sight stayed where a ' +
      'Vostok had it, which is now in that hatch’s cover, at the crew’s left and square to the way they lay. So ' +
      'when the ship had to be pointed by hand, Belyayev took off his helmet and lay across both couches to look ' +
      'through it, with Leonov out of his own couch and down by the Vzor to make room. The oxygen in the cabin ' +
      'climbed after the walk, to 355 mm of mercury by Belyayev’s reading where 160 was the mark, and a switch ' +
      'knocked by the suits’ hoses let most of an air bottle into the cabin overnight. OKB-1’s report puts the ' +
      'oxygen down to the regenerator’s setting and the airlock’s own air; the story of a hatch that did not seal ' +
      'is in the later accounts and not in it.',
    facts: [
      ['Crew', '2, in Berkut pressure suits'],
      ['Oxygen', 'up to 355 mm Hg (Belyayev); “more than 360” (OKB-1’s report)'],
      ['Air bottle', '140 down to 25 atm, by a switch knocked on (Belyayev)'],
      ['Cabin pressure', 'up to 860 mm Hg on the 12th orbit (OKB-1)'],
      ['Vzor', 'in the airlock hatch’s cover, at the crew’s left'],
    ],
    explode: [0, LIFT, 0],
    order: SHIP + 1,
  },
  couch(
    'CouchRight',
    'Belyayev’s couch',
    'The commander: he ran the airlock from here, and later flew the ship down by hand lying across both couches.',
    'Pavel Belyayev, 39, a fighter pilot, 170 cm and 72 kg by Kamanin’s table. He boarded ' +
      'second and lay next to the entry hatch. From this couch he let the airlock out, shut Leonov into it, emptied ' +
      'it and opened its outer hatch, watching him on a television screen and holding him back: “Wait, Lyosha, there ' +
      'will be time.” He heard through the hull every push Leonov gave the ship. The next morning, with the ' +
      'automatic system dead, he asked leave to land by hand, turned the ship through nearly half a circle against ' +
      'the Earth in the Vzor, said “I am pressing the button”, and pressed it before either of them was back in his ' +
      'couch; the ship began to swing, and he caught it with the hand controller. The figure wears the Berkut as the ' +
      'photographs of that morning show it, visor down. He wore no pack: his oxygen was the ship’s.',
    [
      ['In it', 'Pavel I. Belyayev, 39, commander'],
      ['Stature', '170 cm, 72 kg (Kamanin, 19 January 1965)'],
      ['Callsign', 'Almaz (Алмаз, “Diamond”)'],
      ['Backup', 'Dmitriy Zaikin'],
    ],
    4.6,
    0.52,
  ),
  couch(
    'CouchLeft',
    'Leonov’s couch',
    'The man who went outside, next to the hatch he went through; beside him, the pack he wore.',
    'Aleksey Leonov, 30, a fighter pilot, 172 cm and 78.2 kg by Kamanin’s table. He boarded first and lay next to the ' +
      'airlock’s hatch. Once in orbit Belyayev helped him on with the pack, three bottles of oxygen for 45 minutes, ' +
      'and he floated through the hatch into the airlock, catching the pack and then his camera’s release on the ' +
      'way. He was outside for 12 minutes and 9 seconds. Coming back he could not get in; he told Belyayev he was ' +
      'going to the suit’s lower pressure, let it down from 0.4 to 0.27 atmospheres, and got his feet into the ' +
      'airlock with the film camera in his right hand. That is what he told the State Commission four days later. ' +
      'In his accounts of forty years on he went in head first, told nobody about the pressure, and turned round ' +
      'inside. The pack is built beside the couch, on edge, where the third couch had been: where it was stowed for ' +
      'launch was not found.',
    [
      ['In it', 'Aleksey A. Leonov, 30, second pilot'],
      ['Stature', '172 cm, 78.2 kg (Kamanin, 19 January 1965)'],
      ['Pack', 'KP-55: 21.5 kg, oxygen for 45 minutes'],
      ['Pulse outside', 'up to 143 a minute (the record’s file)'],
      ['Backup', 'Yevgeniy Khrunov'],
    ],
    3.2,
    0.62,
  ),
  {
    node: 'Airlock',
    group: 'Airlock',
    name: 'Volga airlock',
    summary: 'A tube of cloth and rubber, folded to 0.7 m for launch, that stood out 2.5 m in orbit on the air in its own walls.',
    detail:
      'The cabin could not be emptied of air: its instruments were cooled by it. So the man who went out had to pass ' +
      'through a lock, and a rigid one would not go under the fairing. Zvezda at Tomilino made a soft one. Its wall ' +
      'is a rubber bladder inside a cloth cover, and between them forty rubber tubes run its length, in three sets ' +
      'of which any two would hold it up; filled, they stand it out stiff enough for a man to hang his weight on. ' +
      'At its foot is a ring made fast to the ball with four bottles of air round it; at its end a rigid head with ' +
      'the outer hatch, which opens inward, a rail, lamps, and a cine camera on a bracket that Leonov unshipped and ' +
      'took in with him. Belyayev let it out at 10:22:54, some fourteen minutes after the ship reached orbit. After ' +
      'the walk it was shot off, “with a sharp sound, like a balloon bursting, and a great deal of dust and scraps ' +
      'of cloth”, and the ship began to turn once in twenty seconds. Here it is drawn out in nine bands that slide ' +
      'one from the next, which is not how it unfolded; and it leans 15° toward the nose where OKB-1’s drawing has ' +
      'about 27°.',
    facts: [
      ['Length', '0.7 m folded, 2.5 m in orbit'],
      ['Diameter', '1.2 m outside, 1.0 m inside'],
      ['Hatches', '0.65 m (Siddiqi) or 0.7 m (Zak), both opening inward'],
      ['Mass', '250 kg'],
      ['Air beams', '40, in 3 sets (Siddiqi); 36 by another account'],
      ['Let out', '10:22:54 Moscow time (OKB-1’s report)'],
    ],
    explode: [0, LIFT, 0],
    moves: [
      ...Array.from(
        { length: BANDS },
        (_, k): Move => ({
          kind: 'slide',
          node: `Airlock_Tube_${k + 1}`,
          by: along(LOCK.az, LOCK.lat, BAND_TRAVEL * k),
          from: 0.3,
          to: 0.4,
        }),
      ),
      { kind: 'slide', node: 'Airlock_Head', by: along(LOCK.az, LOCK.lat, BAND_TRAVEL * (BANDS - 1)), from: 0.3, to: 0.4 },
      // the outer hatch opens inward, about its hinge on the side away from the camera
      outward('Airlock_OuterHatch', LOCK.az, -100, 0.4, 0.44),
      // and after the walk the whole of it is shot off along its own line
      { kind: 'slide', by: along(LOCK.az, LOCK.lat, 4.2), from: later(0.04), to: later(0.3) },
    ],
    order: SHIP + 1,
  },
  {
    node: 'AirlockRing',
    group: 'Airlock',
    name: 'Ring left on the hull',
    summary: 'What stayed when the airlock went: a lip an inch high that nobody had flown a ball home with.',
    detail:
      'The airlock stands on a ring, and the ring stays. Nobody knew what a ball with that lip on one side would do ' +
      'in the air: the test ship, Kosmos 57, blew itself up on its third orbit before it could come down, when two ' +
      'ground stations sent it the same command at once and the two were read as an order to descend. Drops ' +
      'suggested the ball might spin once a second under its parachute. So the ring was bolted to a reconnaissance ' +
      'satellite, Kosmos 59, which landed on 15 March, three days before this flight, having spun no faster than ' +
      'the crew could bear.',
    facts: [
      ['Stands proud', '27 to 40 mm after a normal firing; 70 to 80 after an emergency one (Kamanin)'],
      ['Tried on', 'Kosmos 59, landed 15 March 1965'],
      ['Spin it gave', '40 to 100° a second at most (Kamanin)'],
    ],
    explode: [0, LIFT, 0],
    order: SHIP + 1,
  },
  {
    node: 'AirlockHatch',
    group: 'Airlock',
    inside: true,
    name: 'Hatch into the airlock',
    summary: 'Hatch No. 3 with a door in it, and in the door the sight the ship was landed by.',
    detail:
      'On a Vostok this hatch was bolted on for good and the Vzor looked out through a porthole in it. Here its ' +
      'cover opens into the cabin, toward the parachute container, and the Vzor’s porthole is built into the cover. ' +
      'Both this hatch and the outer one could be worked from Belyayev’s panel or by hand from a small panel inside ' +
      'the airlock; both, he reported, opened “very easily, without any jerk”. It is built as the Vostok’s cover, a ' +
      'metre across with its porthole: the real opening was 0.65 or 0.7 m, and how the cover was hinged was not ' +
      'found.',
    facts: [
      ['Opening', '0.65 m (Siddiqi) or 0.7 m (Zak); 1 m as built here'],
      ['Opens', 'inward, toward the parachute container (Zak)'],
      ['In its cover', 'the Vzor’s porthole'],
    ],
    explode: [0, LIFT, 0],
    moves: [{ kind: 'slide', by: along(LOCK.az, LOCK.lat, 1.2), from: later(0.44), to: later(0.62) }],
    order: SHIP + 1,
  },
  {
    node: 'ReserveEngine',
    group: 'Spacecraft',
    name: 'Reserve braking engine',
    summary: 'The second way down, still unused after a flight that used nearly everything else.',
    detail:
      'A solid motor on the forward pole, 143 kg, 12 tonnes of thrust for about two seconds, as on the first ' +
      'Voskhod. When the automatic descent failed on the 16th orbit the main engine was still good, and it was ' +
      'fired by hand an orbit later; this one stayed cold. Its outline is scaled off OKB-1’s general drawings of ' +
      'the ship. How its gas left it is in nothing read.',
    facts: [
      ['Thrust', '12,000 kgf for about 2 s'],
      ['Mass', '143 kg, of which 87 kg propellant'],
      ['Stands', '1.30 m above the sphere (off the drawings)'],
      ['Used', 'no'],
    ],
    explode: [0, LIFT + 1.1, 0],
    order: SHIP + 1,
  },
  {
    node: 'RetainingStraps',
    group: 'Spacecraft',
    name: 'Retaining straps',
    summary: 'Four bands and a lock; the two halves of the ship parted only as the air burned through.',
    detail:
      'Four bands run from the instrument module’s ring over the sphere to one lock at its top, under the reserve ' +
      'engine. After the braking engine had run, the instrument module did not come away as it should: OKB-1’s ' +
      'report has the separation 14 minutes 31 seconds after the engine’s start, on the thermal sensors that are ' +
      'the last resort, and both men put it at “almost twelve minutes”. Until then the two halves flew joined.',
    facts: [
      ['Straps', '4, joined by one pyrotechnic lock (the Vostok’s)'],
      ['Separation', '14 min 31.3 s after the engine’s start, on the thermal sensors (OKB-1)'],
    ],
    explode: [0, 0, 0],
    moves: STRAPS.map((az, i) => outward(`Strap_${i + 1}`, az, 58, later(0.34 + 0.02 * i), later(0.5 + 0.02 * i))),
    order: SHIP,
  },
  {
    node: 'CableMast',
    group: 'Spacecraft',
    name: 'Cable mast',
    summary: 'Everything the cabin knows of the other half of the ship comes up this.',
    detail:
      'Power, commands and telemetry cross from the instrument module to the cabin through one mast of cables, as on ' +
      'a Vostok. Nothing read says it differed, and it is built as that.',
    facts: [['As', 'the Vostok’s']],
    explode: [0, 0, 0],
    moves: [outward('CableMast_Arm', MAST_AZ, 40, later(0.36), later(0.54))],
    order: SHIP,
  },
  {
    node: 'GasBottles',
    group: 'Spacecraft',
    name: 'Gas bottles',
    summary: 'Gas for the jets: 106 atmospheres left in the hand system when Belyayev took it.',
    detail:
      'A necklace of pressure spheres round the joint, as on a Vostok: gas for the attitude jets and air and oxygen ' +
      'for the cabin. The 3KD carried more bottles on the outside of the instrument module, for the suits and the ' +
      'cabin; where they stood and how many was not found, and they are not built. When the airlock was shot off ' +
      'the ship was left turning once in 20 to 22 seconds, and the State Commission chose not to spend gas stopping ' +
      'it until the descent; by the 15th orbit it had slowed to once in 55 seconds.',
    facts: [
      ['Bottles', '14 modelled (the Vostok’s; sources: 12, 14, 16)'],
      ['Hand system before the descent', '106 atm (Belyayev)'],
      ['Spin after the airlock went', 'a turn in 20 to 22 s (Belyayev); pitch and yaw to 4.5°/s (OKB-1)'],
    ],
    explode: [0, 0.5, 0],
    order: SHIP + 2,
  },
  {
    node: 'InstrumentModule',
    group: 'Spacecraft',
    inside: true,
    name: 'Instrument module',
    summary: 'The half whose Sun-seeker failed on the morning of the descent.',
    detail:
      'Two cones base to base, sealed, carrying the batteries, radios, the orientation system and the braking ' +
      'engine. On the 16th orbit the commands for the automatic descent went through one after another while the ' +
      'ship went on turning: “the sensors of the solar orientation did not catch the Sun and did not hold it”, and ' +
      'the engine, rightly, did not fire. OKB-1’s report puts it to a failure in the pneumatics of the solar ' +
      'orientation. Belyayev asked to land by hand and feared only a refusal. The figures to do it by were worked ' +
      'out on the ground, signed by each engineer, and read up to him by Gagarin.',
    facts: [
      ['Greatest diameter', '2.43 m'],
      ['Failed', 'the pneumatics of the solar orientation (OKB-1’s report)'],
      ['Hand orientation on', '19 March, 11:19:00 Moscow time (the record’s file)'],
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
      'standing aft, as the Vostoks here have them. Through them the walk went out live: Belyayev watched Leonov on ' +
      'a screen, and so did the Kremlin. Under the fairing they were folded against the hull; how has not been ' +
      'found, and here they are drawn withdrawn into the hull and slide out.',
    facts: [
      ['Modelled here', '10: a fan of 3, 3 long whips, 4 ribbons (the Vostok’s)'],
      ['Let out', 'at separation, 528.1 s after liftoff (OKB-1’s report)'],
    ],
    explode: [0, 0, 0],
    moves: ANTENNAS.map((by, i): Move => ({ kind: 'slide', node: `Antenna_${i + 1}`, by, from: 0.3, to: 0.4 })),
    order: SHIP,
  },
  {
    node: 'RetroEngine',
    group: 'Spacecraft',
    inside: true,
    name: 'TDU-1 braking engine',
    summary: 'Fired by a man’s thumb for the first time, with both men out of their couches.',
    detail:
      'Isaev’s S5.4, the Vostok’s engine. Belyayev fired it by hand at 11:36:27 on 19 March, an orbit later than ' +
      'planned, and by his own report before he and Leonov were back in their couches: with their weight out of ' +
      'place the ship began to swing as it lit, and he pulled it back onto its line with the hand controller. He ' +
      'put the burn at about 39 seconds. Kamanin’s diary of a month later has it the other way: that they took 46 ' +
      'seconds getting back to their couches before he fired, which is where the long landing came from. Either ' +
      'way the ball came down 368 km past the place it was aimed at.',
    facts: [
      ['Thrust', '1,614 kgf (15.8 kN) (the Vostok’s)'],
      ['Fired', '19 March, 11:36:27 Moscow time (the record’s file); 11:36:25.2 (OKB-1)'],
      ['Burn', 'about 39 s (Belyayev)'],
      ['By', 'hand, on the 17th orbit by OKB-1’s count'],
    ],
    explode: [0, -0.9, 0],
    order: SHIP + 2,
  },
];

const BOOSTER_DETAIL =
  'A cone 19.2 m long on a short cylinder, with its own RD-107: four fixed chambers and two small ones that swivel ' +
  'to steer, all fed by one turbopump driven by steam from hydrogen peroxide. The whole cone is its oxygen tank, ' +
  'white with frost; the kerosene is in the cylinder under it. Its tip is a steel ball in a cup on the core, and its ' +
  'thrust holds it there; two ties at the foot keep it from swinging. These four are built as the Vostok launcher’s: ' +
  'the 11A57 had the same blocks with engines of a later issue, and nothing read says how they differed to look at. ' +
  'On this flight they left the core 118 seconds after liftoff, by Belyayev’s count.';

const launcherParts: Part[] = [
  {
    node: 'Fairing',
    group: 'Third stage',
    name: 'Fairing',
    summary: 'Two halves, a door, and a blister on one side over what would not fit.',
    detail:
      'The folded airlock stands out from the side of the ball further than the fairing’s wall, so the half of the ' +
      'fairing over it has a hole and a blister. Of the test launch three weeks before, one account has “the ' +
      'protruding airlock visible on the right side of the payload fairing”. OKB-1’s drawing of the ship under its ' +
      'fairing has the folded airlock reaching 1.66 m from the axis. The blister here is a faired shape of our own ' +
      'over a round hole, larger than the real one must have been, because the model’s airlock leans less toward the ' +
      'nose than the drawing’s. The fairing went at 153 seconds.',
    facts: [
      ['Length', '6.36 m (derived)'],
      ['Diameter', '2.7 m (as the Vostok’s)'],
      ['Blister', '1.72 m wide, standing 0.62 m out (estimated)'],
      ['Dropped', '153 s after liftoff (Belyayev’s report)'],
      ['Escape system', 'none'],
    ],
    explode: [0, 0, 0],
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
    summary: 'It put 5.7 tonnes into an orbit 495 km high, higher than any crew before it.',
    detail:
      'The stage built for the planetary probes, 2.66 m across: a kerosene tank over an oxygen tank, an instrument ' +
      'bay between them, and the RD-0108 under them, four fixed chambers with four small nozzles that swing to ' +
      'steer. It lit at 292 seconds and shut down at 523; the ship came off it at 528.1 seconds by OKB-1’s report. ' +
      'The orbit was 173 by 495 km where 180 by 470 was asked. The lengths are published ones; every station inside ' +
      'the stage is estimated.',
    facts: [
      ['Length', '6.745 m; 9.05 m with its adapter'],
      ['Diameter', '2.66 m'],
      ['Engine', 'RD-0108: 30.4 tf (298 kN) in vacuum'],
      ['Burned', 'from 292 s to 523 s (Belyayev’s report)'],
      ['Orbit reached', '173 × 495 km (OKB-1’s report)'],
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
      'stage has lit and pulled away, locks let the skirt go and springs push its three pieces apart. That is how ' +
      'the stage is described as it flies today; that it was so in 1965 is assumed.',
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
      'The upper stage is lit while the core under it is still burning, and only then is the core cut loose; the ' +
      'fire leaves between the struts, turned aside by the cone on the core’s top. No figure for this vehicle’s ' +
      'lattice was found: it is built as the Vostok launcher’s, 1.26 m.',
    facts: [
      ['Length', '1.26 m (the Vostok launcher’s: assumed)'],
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
    summary: 'Second stage, though it lights first. It left a hole in the cloud, by one who watched.',
    detail:
      'Its engine starts on the pad with the boosters’. Its shape follows from the boosters round it: narrow at the ' +
      'foot where they crowd in, widest 20 m up where their tips push on a heavy frame. Of the weather on the ' +
      'morning of 18 March the accounts differ: “low cloud cover and intermittent drizzling rain”, in which the ' +
      'rocket left “a perceptible hole in the blanket of clouds” (Chertok); “a cold and snowy day” (Siddiqi). No ' +
      'figure for it was found. It is built as the Vostok launcher’s core.',
    facts: [
      ['Length', '27.5 m; 28.75 m with the lattice (the Vostok launcher’s)'],
      ['Diameter', '2.05 m at the foot, 2.95 m at the frame'],
      ['Cut loose', '292 s after liftoff (Belyayev’s report)'],
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
      'Four chambers round a single turbopump, driven by steam made from hydrogen peroxide; steering is by four ' +
      'little chambers on trunnions at the corners. They lit at 10:00:00 Moscow time on 18 March 1965, to the second ' +
      'by the record keepers’ stopwatch. It is built as the Vostok launcher’s engine.',
    facts: [
      ['Thrust', '778 kN at the ground (Brügge’s table for the 11A57)'],
      ['Chambers', '4 fixed, 4 steering'],
      ['Propellants', 'kerosene T-1 and liquid oxygen'],
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
        ['Left the core', '118 s after liftoff (Belyayev’s report)'],
      ],
      explode: [0, 0, 0],
      moves: [outward(`Booster_${letter}`, az, -14, 0.0, 0.2), { kind: 'slide', by: along(az, -52, 9), from: 0.14, to: 0.5 }],
      order: 0,
    }),
  ),
];

const SPACECRAFT = ['DescentModule', 'ReserveEngine', 'InstrumentModule', 'RetroEngine', 'Antennas', 'Airlock'];
const COUCHES = ['CouchLeft', 'CouchRight'];

const vehicle: ModelDef = {
  id: 'vehicle',
  name: 'Vehicle',
  url: 'models/ussr/voskhod/voskhod-2/vehicle.glb',
  scale: '44.16 m on the pad · 10.3 m across the rudders · to scale',
  // The vehicle alone: Site 1 as it stood in March 1965 is not built for this flight, so it is shown in the gallery only.
  backdrop: 'studio',
  slider: ['On the pad', 'Taken apart'],
  cutaway: true,
  specGroups: ['Launch vehicle', 'Spacecraft', 'Airlock and the walk'],
  parts: [...launcherParts, ...parts],
  // the cabin's lamp, over the instrument board
  lights: [{ position: [0.14, 3.6, 0.14], colour: 0xffe4c0, intensity: 0.2, reach: 1.7 }],
  home: 'stack',
  views: [
    { id: 'stack', label: 'Full stack' },
    // (heights are from the model's origin, the spacecraft's braking nozzle: the main nozzles' exits are BASE below it)
    { id: 'base', label: 'Engines', centreY: 1.0 - BASE, span: 9.5, from: along(35, 4, 1) },
    { id: 'booster', label: 'Strap-on', nodes: ['Booster_B'], from: along(-55, 6, 1) },
    { id: 'third', label: 'Third stage', nodes: ['Interstage', 'AftSection', 'BlockI'], from: along(60, 4, 1) },
    { id: 'fairing', label: 'Fairing and blister', nodes: ['Fairing'], from: along(LOCK.az - 55, 10, 1) },
    // each of these is of named parts, so it stays on them as the slider takes the vehicle apart
    { id: 'spacecraft', label: 'Spacecraft', nodes: SPACECRAFT, from: along(LOCK.az - 70, 14, 1) },
    { id: 'airlock', label: 'Airlock', nodes: ['Airlock', 'AirlockRing'], from: along(LOCK.az - 60, 12, 1) },
    { id: 'head', label: 'Outer hatch', nodes: ['Airlock'], from: along(LOCK.az + 30, 34, 1) },
    { id: 'descent', label: 'Descent module', nodes: ['DescentModule', 'ReserveEngine'] },
    { id: 'reserve', label: 'Reserve engine', nodes: ['ReserveEngine'], from: along(200, 14, 1) },
    // (through the cutaway's opening, from beyond their feet and above)
    { id: 'crew', label: 'Crew', nodes: COUCHES, from: along(FEET, 52, 1) },
    { id: 'instrument', label: 'Instrument module', nodes: ['InstrumentModule', 'GasBottles', 'Antennas'] },
    { id: 'engine', label: 'Braking engine', nodes: ['RetroEngine'], from: along(250, -32, 1) },
  ],
};

// The two couches as somewhere to sit, and their cabin (../../vehicles/cabin.ts: from the model's own nodes). Each eye
// point is at its man's own eyes and turned as his head is (vehicles/voskhod.py `seat_view`); from his couch his own
// helmet and the head in it are not drawn (crew/berkut.py: every `Helmet_` mesh), and the man beside him is. The
// commander's is first: the one an on-board view takes. Both were aboard by about 07:30 Moscow time, Leonov first
// (README.md: the crew's report, its times faint in the copy read); the span is a quarter of an hour before that:
// estimated. There is no launch site to board them at yet.
const HELMET = [
  'Shell',
  'Liner',
  'Head',
  'Cap',
  'Eyes',
  'Irises',
  'Brows',
  'Lips',
  'Visor',
  'VisorFrame',
  'Pivots',
  'Lettering',
  'NeckRing',
  'Collar',
];
const BOARDING: [number, number] = [-9900, -9000];
vehicle.seats = [
  voskhodSeat('Right', 'Belyayev’s couch, by the hatch', HELMET, BOARDING),
  voskhodSeat('Left', 'Leonov’s couch, by the airlock', HELMET, BOARDING),
];
vehicle.cabin = voskhodCabin(COUCHES);

export const flight: Flight = {
  id: 'ussr/voskhod/voskhod-2',
  nation: 'USSR',
  agency: 'OKB-1',
  program: 'Voskhod',
  designation: 'Voskhod 2',
  callsign: 'Almaz (Алмаз)',
  spacecraft: 'Voskhod 3KD No. 4',
  launchVehicle: 'Voskhod 11A57, No. R15000-05',
  // 10:00:00 Moscow time: «в 7 часов 00 минут 00 секунд по гринвичскому времени» by stopwatch (the record's file, as
  // Borisenko prints it); OKB-1's report of 6 June 1965; Siddiqi's launch log; McDowell's log.
  launch: '1965-03-18T07:00:00Z',
  launchSite: SITE1.name,
  site: SITE1,
  crew: ['Pavel I. Belyayev', 'Aleksey A. Leonov'],
  summary:
    'The first walk in space. Leonov went out through an airlock made of cloth and rubber, was outside for twelve ' +
    'minutes, and came back in a suit he had to let the pressure out of. Then the automatic descent failed; Belyayev ' +
    'flew the ship down by hand an orbit late, and it landed in deep forest north of Perm, where the two spent two ' +
    'nights before they could be got out.',
  facts: [
    { label: 'Liftoff', value: '18 March 1965, 07:00:00 UTC (10:00:00 Moscow time)' },
    { label: 'Crew', value: 'Pavel Belyayev (39), Aleksey Leonov (30)' },
    { label: 'Outside', value: '12 min 9 s, from 11:34:51 Moscow time' },
    { label: 'Duration', value: '1 d 2 h 2 min 17 s' },
    { label: 'Orbit', value: '173.5 × 497.7 km, 65°' },
    { label: 'Mass in orbit', value: '5,682 kg' },
    { label: 'Landing', value: '19 March, 12:02:17 Moscow time, 180 km north by north-west of Perm' },
  ],
  // Moscow times, from the record's file (the timetable signed by the sports commissars, as Borisenko prints it) and
  // OKB-1's preliminary technical report of 6 June 1965, unless the event says otherwise (README.md)
  timeline: [
    { t: MSK(18, 7, 30), event: 'Both aboard by about 07:30: Leonov first, then Belyayev' },
    { t: 0, event: 'Liftoff, 10:00:00 Moscow time, into low cloud by one account and snow by another' },
    { t: 523, event: 'Third stage shuts down; the ship comes off it at 528 s, in an orbit 173 by 495 km' },
    { t: MSK(18, 10, 22, 54), event: 'The airlock is let out: its air beams fill to 0.6 atmospheres' },
    { t: MSK(18, 11, 28, 13), event: 'The airlock is empty of air, Leonov inside it' },
    { t: MSK(18, 11, 32, 54), event: 'Its outer hatch is fully open' },
    { t: MSK(18, 11, 34, 51), event: 'Leonov comes out, over the Black Sea: the first man outside a spacecraft' },
    { t: MSK(18, 11, 47, 0), event: 'He is back in the airlock, on the second try and at the suit’s lower pressure: 12 min 9 s outside' },
    { t: MSK(18, 11, 48, 40), event: 'The outer hatch is closed' },
    { t: MSK(18, 11, 51, 54), event: 'Air is let back into the airlock: 23 min 41 s in vacuum' },
    {
      t: MSK(18, 12, 24),
      event: 'About now (it was planned for 134 to 138 minutes after separation) the airlock is shot off; the ship is left turning',
    },
    { t: MSK(19, 5, 50, 53), event: 'An air bottle, let into the cabin by a switch knocked on, is shut off at about 8 atmospheres' },
    {
      t: MSK(19, 10, 0),
      event:
        'About now, on the 16th orbit, the automatic descent fails: the Sun-seeker does not hold, and the engine rightly does not fire',
    },
    { t: MSK(19, 11, 19, 0), event: 'Belyayev, lying across the couches at the Vzor, takes the ship by hand' },
    { t: MSK(19, 11, 36, 27), event: 'He fires the braking engine by hand' },
    { t: MSK(19, 11, 56, 8), event: 'The landing system comes on' },
    { t: MSK(19, 12, 2, 17), event: 'Down in forest and deep snow north of Perm, 368 km past the mark' },
    { t: MSK(19, 15, 50), event: 'A civil helicopter finds them, by Belyayev’s account; warm clothes are dropped' },
    { t: MSK(20, 11, 35), event: 'After a night in the forest, three men reach them on skis from a helicopter 1.5 km off' },
    { t: MSK(21, 8, 6), event: 'After a second night they ski to a clearing and are lifted out; Perm by 09:50, Tyuratam by 17:30' },
  ],
  specs: [
    {
      group: 'Spacecraft',
      label: 'Length as modelled, nozzle to the reserve engine’s face',
      value: 5.48,
      unit: 'm',
      confidence: 'estimated',
      note: 'the figure in print for the Voskhod is “five meters” (Siddiqi, Challenge to Apollo, p. 412), a round number. OKB-1’s general drawings of the 3KV and 3KD (RGANTD, as reproduced by Pillet and Zak) put the reserve engine’s face 1.27 to 1.33 m above the sphere; the model takes 1.30 m on the Vostok’s 4.18 m',
    },
    {
      group: 'Spacecraft',
      label: 'Greatest diameter',
      value: 2.43,
      unit: 'm',
      confidence: 'documented',
      note: '2.43 m (Siddiqi p. 412): the instrument module, as a Vostok’s. With the airlock out the ship measured some 3.9 m across the ball and the airlock (derived)',
    },
    {
      group: 'Spacecraft',
      label: 'Mass in orbit',
      value: 5682,
      unit: 'kg',
      confidence: 'documented',
      note: '5,682 kg (Siddiqi, Table IB, and his figure on p. 451); 5,685 kg on the Soviet poster of the ship («Вес корабля на орбите 5685 кг») and “approximately 5,685” in the draft plan (Siddiqi p. 448). McDowell’s log has 5.825 t for this ship and 5.685 for Kosmos 57',
    },
    {
      group: 'Spacecraft',
      label: 'Perigee',
      value: 173.5,
      unit: 'km',
      confidence: 'documented',
      note: '173.5 km on the first orbit, 173.1 on the 18th (the record’s file, as Borisenko prints it). OKB-1’s report and TASS: 173 km. Planned: 180',
    },
    {
      group: 'Spacecraft',
      label: 'Apogee',
      value: 497.7,
      unit: 'km',
      confidence: 'documented',
      note: '497.7 km on the first orbit, 494.6 on the 18th (the record’s file). OKB-1’s report and TASS: 495 km; the Soviet encyclopedia and Siddiqi: 498. Planned: 470 (OKB-1’s report); the poster printed before the flight has 400. Wikipedia and Encyclopedia Astronautica print 167 × 475',
    },
    {
      group: 'Spacecraft',
      label: 'Inclination',
      value: 65,
      unit: 'deg',
      confidence: 'documented',
      note: '“about 65°” (OKB-1’s report; TASS). spacefacts.de prints 64.79°',
    },
    {
      group: 'Spacecraft',
      label: 'Period',
      value: 90.944,
      unit: 'min',
      confidence: 'documented',
      note: '90.944 min on the first orbit, 90.910 on the 18th (the record’s file); “about 91” (OKB-1; TASS)',
    },
    {
      group: 'Spacecraft',
      label: 'Missed its landing mark by',
      value: 368,
      unit: 'km',
      confidence: 'documented',
      note: '368 km (Kamanin, 22 April 1965; Chertok, vol. 3, p. 272). Siddiqi, p. 459, prints 386. Kamanin puts it to 46 seconds spent getting back into the couches before the engine was fired; Belyayev’s own report has the engine fired first',
    },
    {
      group: 'Spacecraft',
      label: 'Load at entry',
      value: 7,
      unit: 'g',
      confidence: 'documented',
      note: '«порядка 7 единиц, не более» (Belyayev to the State Commission, 22 March 1965). Leonov’s later accounts have 10 g',
    },
    {
      group: 'Spacecraft',
      label: 'Belyayev’s height',
      value: 1.7,
      unit: 'm',
      confidence: 'documented',
      note: '170 cm and 72 kg (Kamanin’s table of 19 January 1965). His build in the model is estimated from those',
    },
    {
      group: 'Spacecraft',
      label: 'Leonov’s height',
      value: 1.72,
      unit: 'm',
      confidence: 'documented',
      note: '172 cm and 78.2 kg (Kamanin’s table of 19 January 1965). His build in the model is estimated from those',
    },
    {
      group: 'Airlock and the walk',
      label: 'Airlock length in orbit',
      value: 2.5,
      unit: 'm',
      confidence: 'documented',
      note: '“extending to two and a half meters in its operational position” (Siddiqi p. 449, from Korolev’s draft plan); 2,500 mm (Zak)',
    },
    {
      group: 'Airlock and the walk',
      label: 'Airlock length folded',
      value: 0.7,
      unit: 'm',
      confidence: 'documented',
      note: '“a length of seven-tenths meter” (Siddiqi p. 449). Zak has 740 mm, Pillet 73 cm; Wikipedia and Encyclopedia Astronautica 770 mm',
    },
    {
      group: 'Airlock and the walk',
      label: 'Airlock diameter',
      value: 1.2,
      unit: 'm',
      confidence: 'documented',
      note: '1.2 m outside and 1.0 m inside (Siddiqi pp. 449 and 450; Zak). In the model its bands step in by 6 mm each so that they can stand inside one another when it is folded: 1.2 m at the foot, 1.10 m under the head',
    },
    {
      group: 'Airlock and the walk',
      label: 'Hatchway',
      value: 0.65,
      unit: 'm',
      confidence: 'documented',
      note: '“the diameter of the hatchway was only 0.65 meter” (Siddiqi p. 450); 700 mm for both hatches (Zak; Woods’s drawing in Siddiqi). The model’s outer hatch is 0.7 m; its hatch into the cabin is the Vostok’s 1 m cover',
    },
    {
      group: 'Airlock and the walk',
      label: 'Airlock mass',
      value: 250,
      unit: 'kg',
      confidence: 'documented',
      note: '“The complete airlock system had a mass of 250 kilograms” (Siddiqi p. 450)',
    },
    {
      group: 'Airlock and the walk',
      label: 'Airlock’s lean toward the nose, as modelled',
      value: 15,
      unit: 'deg',
      confidence: 'estimated',
      note: 'it stands on hatch No. 3, which the Vostok’s model has 15° above the plane square to the long axis (an estimate). OKB-1’s general drawing of the 3KD, read twice, has the folded airlock’s line 20 to 27° above it. The Vostok’s hatch was left where it was',
    },
    {
      group: 'Airlock and the walk',
      label: 'Time outside',
      value: 12.15,
      unit: 'min',
      confidence: 'documented',
      note: '12 min 9 s «с момента появления космонавта из шлюзовой камеры до его скрытия в ней», 11:34:51 to 11:47:00 Moscow time (the record’s file). OKB-1’s report: “about 10 minutes outside the ship”, 16 minutes with the hatch open. TASS: about 20 minutes in space, 10 of them floating free',
    },
    {
      group: 'Airlock and the walk',
      label: 'Time in vacuum',
      value: 23.68,
      unit: 'min',
      confidence: 'documented',
      note: '23 min 41 s, from the airlock’s emptying at 11:28:13 to the start of its refilling at 11:51:54 (the record’s file). Siddiqi, p. 456, gives 11:51:54 as the closing of the outer hatch, which the file has at 11:48:40',
    },
    {
      group: 'Airlock and the walk',
      label: 'Tether',
      value: 5.35,
      unit: 'm',
      confidence: 'documented',
      note: '«до 5,35 метра» from the ship (the record’s file); “5.35-meter-long tether” (Siddiqi p. 455). Abramov and Skoog describe the umbilical as 7 m, with a shock absorber, a steel rope, an oxygen hose and cables. Not modelled: it was stowed',
    },
    {
      group: 'Airlock and the walk',
      label: 'Suit pressure',
      value: 0.4,
      unit: 'atm',
      confidence: 'documented',
      note: '0.4 atmospheres, and 0.27 at its second setting (Abramov and Skoog: 400 and 270 hPa; Leonov to the State Commission: «Как было давление 0,4, так и осталось 0,4», and before going out 0.39). He went to the second setting to get back in, and by his report of 22 March said so at the time',
    },
    {
      group: 'Airlock and the walk',
      label: 'Suit and pack',
      value: 41.5,
      unit: 'kg',
      confidence: 'documented',
      note: 'the Berkut 20 kg and its pack KP-55 21.5 kg (Thomas’s synopsis of Abramov and Skoog; Zak). Siddiqi has the pack at 25 kg. The pack’s size in the model, 0.33 × 0.50 × 0.14 m, is estimated off two museum photographs',
    },
    {
      group: 'Launch vehicle',
      label: 'Length on the pad',
      value: 44.16,
      unit: 'm',
      confidence: 'derived',
      note: '16.665 m from the core’s top to the fairing’s tip (Zak, RussianSpaceWeb) on the Vostok launcher’s core, 27.49 m (Minakov: assumed unchanged). Brügge’s table has 44.13 m; Siddiqi’s table gives the type as 43.5 to 45.22 m',
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
      note: '413.3 tf (Siddiqi, table of launch vehicles), which is 4,053 kN',
    },
    {
      group: 'Launch vehicle',
      label: 'Third stage with its adapter',
      value: 9.05,
      unit: 'm',
      confidence: 'documented',
      note: '9.05 m long and 2.66 m across (Brügge’s table for the 11A57: secondary)',
    },
    {
      group: 'Launch vehicle',
      label: 'Blister, how far it stands out as modelled',
      value: 0.62,
      unit: 'm',
      confidence: 'estimated',
      note: 'that the folded airlock showed through the fairing’s side is documented (Zak, of Kosmos 57: “the protruding airlock visible on the right side of the payload fairing”); its form and size are not. OKB-1’s drawing has the folded airlock 0.36 m beyond the fairing’s wall; the model’s, leaning less toward the nose, reaches further',
    },
    {
      group: 'Launch vehicle',
      label: 'Launch azimuth',
      value: 37.5,
      unit: 'deg',
      confidence: 'derived',
      note: 'east of north, for an orbit inclined 65° from latitude 45.92°, before the Earth’s turning is allowed for. The azimuth as flown was not found',
    },
  ],
  motors: [
    {
      name: 'RD-107, one in each strap-on',
      count: 4,
      thrustN: 819100,
      burnS: 118,
      propellant: 'kerosene T-1 / liquid oxygen',
      kind: 'liquid',
      confidence: 'documented',
      note: '3,276.4 kN at the ground for the four (Brügge’s table for the 11A57: secondary). They left the core at 118 s: «отделения первой ступени - 118 сек.» (Belyayev, the crew’s report)',
    },
    {
      name: 'RD-108, core',
      count: 1,
      thrustN: 777800,
      burnS: 292,
      propellant: 'kerosene T-1 / liquid oxygen',
      kind: 'liquid',
      confidence: 'documented',
      note: '777.8 kN at the ground (Brügge’s table for the 11A57: secondary). The core was cut loose at 292 s (Belyayev, the crew’s report)',
    },
    {
      name: 'RD-0108, third stage',
      count: 1,
      thrustN: 30.4 * 1000 * KGF,
      burnS: 231,
      propellant: 'kerosene / liquid oxygen',
      kind: 'liquid',
      confidence: 'documented',
      note: '“a vacuum thrust of 30.4 tons” (Siddiqi p. 410, note 4); on p. 469 he gives the same engine 30.0. From 292 s to its shutdown at 523 s (Belyayev, the crew’s report); the ship separated at 528.1 s (OKB-1’s report)',
    },
    {
      name: 'TDU-1 (Isaev S5.4) braking engine',
      count: 1,
      thrustN: 1614 * KGF,
      burnS: 39,
      propellant: 'amine fuel (TG-02) / nitric acid (AK-20F)',
      kind: 'liquid',
      confidence: 'documented',
      note: '1.614 tf, the Vostok’s engine (Siddiqi pp. 197 and 411). Fired by hand at 11:36:27 Moscow time on 19 March (the record’s file; 11:36:25.2 in OKB-1’s report). «ориентировочно 39 сек. работала ТДУ» (Belyayev, 22 March 1965)',
    },
    {
      name: 'Reserve braking engine',
      count: 1,
      thrustN: 12000 * KGF,
      burnS: 2,
      propellant: 'solid, 87 kg',
      kind: 'solid',
      confidence: 'documented',
      note: '12,000 kgf for about two seconds (Siddiqi p. 411, of the Voskhod; Woods’s drawing of the 3KD on p. 449 gives the same). Not fired on this flight',
    },
    {
      name: 'Attitude jet',
      count: 16,
      thrustN: 1.5 * KGF,
      propellant: 'compressed gas',
      confidence: 'documented',
      note: 'the Vostok’s: two sets of eight, 1.5 kgf each (Siddiqi p. 197). Nothing read says the 3KD’s differed. Worked by hand for the descent: the hand system’s bottles stood at 106 atm before it (Belyayev)',
    },
  ],
  models: [vehicle],
};

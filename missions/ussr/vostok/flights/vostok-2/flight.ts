import type { Flight } from '../../../../../src/types.ts';
import { SK1_SPECS, sk1Crew } from '../../crew/sk-1.parts.ts';
import { SITE1_SPECS, site1Vehicle } from '../../../places/tyuratam/site-1.parts.ts';
import { SITE1 } from '../../../places/tyuratam/site-1.ts';
import { SPEC, type PartWords, BOOSTERS, vostokStack, vostokParts, BASE, vostokMotors } from '../../vehicles/vostok-stack.ts';
import { vostokCabin, vostokSeat } from '../../vehicles/cabin.ts';
import { commanded, vostokCommands, vostokFlies } from '../../vehicles/vostok-flies.ts';
import { MSK, orbital } from './orbital.ts';
import { planOfOrbital } from '../../../../../src/sim/planof.ts';
import { pad } from './pad.ts';
import { WEATHER } from './weather.ts';

const parts: PartWords[] = [
  {
    node: 'DescentModule',
    name: 'Descent module',
    summary: 'The ball a man lived in for a day; this one was later dropped from an aeroplane and lost.',
    detail:
      'A sphere needs no steering to survive entry: whichever way it meets the air the flow round it is the same, so ' +
      'all of it is heat shield and its weight is put low and behind the pilot to turn it heavy side first. For Vostok 2 ' +
      'the same ball had to be somewhere to eat, sleep and be ill in: Titov spent 25 hours in it, most of them strapped ' +
      'to the seat. He left his porthole blinds open on the way down and watched the air glow and pieces of antenna go ' +
      'past. It is the one flown Vostok cabin that cannot be seen today: in 1964, short of a ball to test the Voskhod’s ' +
      'soft landing with, Korolev’s engineers took this one from the bureau’s museum and dropped it from an aircraft ' +
      'over Feodosiya. The parachute failed and it was destroyed.',
    facts: [
      ['Diameter', '2.3 m over the heat shield; pressure hull 2.2 m'],
      ['Mass', '2,460 kg (the type)'],
      ['Hatches', '3, each 1 m in the clear'],
      ['Portholes', '3, two of them in hatch covers'],
      ['Landed', 'about 10:11 Moscow time, 7 August, without its pilot'],
      ['Lost', '1964, in a drop test for Voskhod'],
    ],
  },
  {
    node: 'EntryHatch',
    name: 'Hatch No. 1',
    summary: 'The way in on the pad and the way out at 7 km.',
    detail:
      'Over the pilot’s head, on the line of his seat’s rails, with one of the three portholes in it. Coming down, at ' +
      'about seven kilometres, it was thrown clear and the seat followed. Titov, watching a piece of the cabin’s lining ' +
      'that had come unstuck as the hatch went, had his head turned when the seat fired and struck his nose on the ' +
      'inside of his helmet. At the press conference four days later the ejection was admitted for the first time, as ' +
      'a choice: he had been allowed to pick his way down, Titov said, and tried the second, where Gagarin had landed ' +
      'in his ship. Neither was so. The seat was the only way down for both of them.',
    facts: [
      ['Clear diameter', '1 m'],
      ['Screws', '30 (counted on Vostok 1’s)'],
      ['Released', 'at about 7 km'],
    ],
  },
  {
    node: 'ParachuteHatch',
    name: 'Hatch No. 2',
    summary: 'Covers the capsule’s own parachute.',
    detail:
      'At the pilot’s left. Behind it is the container of the descent module’s parachute, which opened after the pilot ' +
      'had gone and set the empty ball down in a field near Krasny Kut seven minutes before he landed some five ' +
      'kilometres away, if the ship’s 25 hours 11 minutes and his 25 hours 18 are read as the accounts read them. ' +
      'He saw it land from under his canopy, and a car and a crowd reach it before he was down.',
    facts: [
      ['Clear diameter', '1 m'],
      ['Parachute', '574 m², from a 330 litre container (the type)'],
      ['Landing speed', '10 m/s (the type)'],
    ],
  },
  {
    node: 'Cabin',
    name: 'Cabin',
    summary: 'A day’s housekeeping: two television cameras, a wireless set, and a cabin that fell to 10 °C.',
    detail:
      'The same cabin as Gagarin’s, refitted for a day and proved on the ground for twelve. The air system was new ' +
      '(the drier had failed its long trials before Vostok 1); the television was “more respectable”: beside the old ' +
      '100-line camera a second sent 400 lines, ten pictures a second, on a transmitter of its own. There was a ' +
      'broadcast receiver to listen to Moscow on, a tape recorder that started when he spoke, an optical glass of three ' +
      'and five powers, a log book with its pencil on a string. Titov worked the hand controller twice, on the first ' +
      'orbit and the seventh, after keying the lock. He found the Globus hard to reach from his straps and reset it ' +
      'almost every orbit until his hand was marked. Both cooling fans had been switched on at launch by mistake, and ' +
      'the cabin went down to 10 °C before he turned his suit’s fan off. What is modelled is the type’s cabin: which of ' +
      'its two cameras was the new one, and what the new drier looked like, were not found.',
    facts: [
      ['Atmosphere', 'air at one atmosphere; oxygen 25 to 27%'],
      ['Cabin temperature', '10 to 22 °C; 18 °C when he said good night'],
      ['Relative humidity', '55 to 75%'],
      ['Television systems', '2: 100 lines and 400 lines, 10 frames/s'],
      ['Supplies', 'for 10 days'],
      ['Manual control', 'orbits 1 and 7; nitrogen 160 down to 102 atm'],
    ],
  },
  {
    node: 'EjectionSeat',
    name: 'Ejection seat and pilot',
    summary: 'Titov, 25, the first person to sleep in orbit, and the first to be sick there.',
    detail:
      'The seat lies across the ball, tilted so that its rails run out through hatch No. 1: escape system on the pad, ' +
      'landing system at the end. In it for a day Titov ate from tubes with no appetite, did his exercises against the ' +
      'straps, and from the fourth orbit felt what is now called space sickness: his eyes hurt to move, and he learned ' +
      'to keep his head still. He slept with his arms under the belts to stop them floating, and overslept by 35 ' +
      'minutes. He came down by his own parachute beside a railway line, a train passing, at 10:18. The figure wears ' +
      'the SK-1 with СССР on the helmet, as the reports of the morning describe him. It is the figure built to ' +
      'Gagarin’s recorded 1.65 m: no document with Titov’s height was found.',
    facts: [
      ['Pilot', 'Major Gherman S. Titov, born 11 September 1935'],
      ['Callsign', 'Oryol (Орёл, “Eagle”)'],
      ['Slept', 'from about 18:30; woke 02:37, 35 minutes late'],
      ['Ejection', 'about 7 km up'],
      ['Landed', '10:18 Moscow time, 7 August, 25 h 18 min after liftoff'],
    ],
  },
  {
    node: 'FilmCamera',
    name: 'Film camera',
    summary: 'A newsreel man’s Konvas: the first camera worked by hand in orbit.',
    detail:
      'Gagarin had no camera to work. Titov was given a Konvas-Avtomat, the hand-held 35 mm camera of Soviet newsreel men: ' +
      'three lenses on a turret, a magazine that clips on behind, the motor underneath for a grip. His had been altered ' +
      'for the flight; how is not in anything read. The dial fell off his exposure meter the first time he used it, so ' +
      'every setting after that was a guess. At the start of the second orbit he filmed the Earth and the sky for about ' +
      'ten minutes, and later the horizon as the ship went into shadow and came out, and the view in the Vzor. Asked in ' +
      'Moscow whether he had taken pictures he said: “I am not much of a photographer.” Its size is the type’s as ' +
      'published and its form is read off photographs of the camera kept as his. Where it rode is not recorded: here ' +
      'it hangs at his right hand with its lenses toward the right porthole.',
    facts: [
      ['Kind', 'Konvas-Avtomat, 35 mm, three lenses on a turret'],
      ['Size', '290 × 260 × 240 mm, 5.7 kg (the type, as sold)'],
      ['Magazine', '60 m of film'],
      ['Film brought back', 'about 10 minutes, black-and-white and colour'],
    ],
  },
  {
    node: 'RetainingStraps',
    name: 'Retaining straps',
    summary: 'Four steel bands and one lock held the ball on, and this time let go on time.',
    detail:
      'Four bands run from the instrument module’s ring over the sphere and meet in a single lock at its top. Some ten ' +
      'seconds after the braking engine stopped Titov heard the charges fire and reported the modules apart. The straps ' +
      'had gone; the cables had not (see the cable mast). Each strap carries a hairpin antenna of the command link. ' +
      'They swing back as they would when released; how far they sprang is not recorded.',
    facts: [
      ['Straps', '4, joined by one pyrotechnic lock'],
      ['Released', 'about 10 s after the braking burn, as planned'],
    ],
  },
  {
    node: 'CableMast',
    name: 'Cable mast',
    summary: 'The lights stayed on: for ten minutes the two modules fell together on their cables.',
    detail:
      'Power, commands and telemetry cross from the instrument module to the cabin through one mast of cables, plugged ' +
      'into a plate on the side of the ball. When the modules part, charges should throw that plate off first. On ' +
      'Vostok 2 a knife cut the wire that carried the order a fraction of a second before the order was given: the ' +
      'cable had been run wrongly. Titov, who had reported a clean separation, saw that the lamps on his board, fed ' +
      'from the other module, were still lit. The pair entered the air joined by the bundle until it burned through, ' +
      'at about 10:07 by his account. The same fault had shown on the two unmanned rehearsals in March. This is the ' +
      'accident long told of Gagarin’s flight, whose own late separation had another cause.',
    facts: [
      ['Separation planned', 'about 10 s after the burn'],
      ['Cables burned through', 'about 10:07 Moscow time, ten minutes late'],
      ['Cause', 'the plate’s firing wire cut before the command (Chertok)'],
    ],
  },
  {
    node: 'GasBottles',
    name: 'Gas bottles',
    summary: 'Nitrogen to turn the ship by hand, twice, and oxygen for the cabin.',
    detail:
      'A necklace of pressure spheres round the joint, outside both hulls. Most hold nitrogen for the attitude jets; ' +
      'the rest are the cabin’s oxygen reserve. Titov watched their gauge as he flew: 160 atmospheres when he took ' +
      'control an hour after liftoff, 135 when he had the ship where he wanted it ten minutes later, 120 when he let it ' +
      'drift. He had been told not to go below 100, so on the seventh orbit he left out the half turn that would have ' +
      'put the ship tail first, and stopped at 102. Sources give fourteen, sixteen and twelve bottles; fourteen are ' +
      'modelled, in sixteen places, with a gap where the cable mast passes.',
    facts: [
      ['Bottles', '14 modelled (sources: 12, 14, 16)'],
      ['Nitrogen', '160 atm at first use; 102 after the second'],
      ['Limit he was given', '100 atm'],
    ],
  },
  {
    node: 'InstrumentModule',
    name: 'Instrument module',
    summary: 'Two cones base to base: everything that did not need to come home.',
    detail:
      'A sealed hull of two cones filled with dry nitrogen, carrying the batteries, radios, the orientation system and ' +
      'the braking engine, with power for ten days. The aft cone is the radiator: shutters over it open and close to ' +
      'hold the temperature. Sixteen small jets of cold nitrogen, in two sets of eight, turn the ship: by its own ' +
      'sensor, which finds the Sun, or by the pilot’s hand, which on this flight they obeyed for the first time. The ' +
      'voice links were on 15.765 and 20.006 MHz and, over the Soviet Union, 143.625 MHz; the Signal beacon, which ' +
      'carried his pulse round the half of the world where nothing else reached, on 19.995. It burned up.',
    facts: [
      ['Greatest diameter', '2.43 m'],
      ['Length', '2.25 m'],
      ['Mass', '2,270 kg (the type)'],
      ['Attitude jets', '2 sets of 8, 1.5 kgf each, nitrogen'],
      ['Radio', '15.765, 20.006, 143.625 MHz; Signal 19.995 MHz'],
    ],
  },
  {
    node: 'Antennas',
    name: 'Antennas',
    summary: 'Ten of the eleven, folded under the fairing and let out in orbit.',
    detail:
      'A fan of three whips by the frame, three long whips trailing from beside the engine, and four ribbon antennas ' +
      'standing aft: short-wave and VHF voice, the Signal beacon, telemetry, the command link, and now two television ' +
      'transmitters. One of them is in a photograph Titov took of the Himalaya through his porthole. Under the fairing ' +
      'they were folded against the hull and sprang out once the ship was free. How they were folded has not been ' +
      'found: here they are drawn withdrawn into the hull and slide out, which is not how it was done. Which antenna ' +
      'served which system is not known to us either, nor whether the new television system had one of its own.',
    facts: [
      ['Modelled here', '10: a fan of 3, 3 long whips, 4 ribbons'],
      ['On the type', '11: 3 Signal, 4 Zarya, 2 telemetry, 2 command'],
      ['Long whips', '2.1 m (off the drawing)'],
    ],
  },
  {
    node: 'RetroEngine',
    name: 'TDU-1 braking engine',
    summary: 'One engine with no spare, lit once, on the seventeenth orbit.',
    detail:
      'Isaev’s S5.4: 1.6 tonnes of thrust for up to 45 seconds on self-igniting propellants, with four small steering ' +
      'nozzles round the chamber. There was one, and the answer to its failing was the orbit itself, low enough to ' +
      'decay within the ten days the supplies would last. Why a day and not three orbits was the engine’s doing too: ' +
      'the ship was pointed for the burn by the Sun, the landing had to be in the Soviet Union, and after the first few ' +
      'orbits the Earth does not bring the Volga back under the track for a day. It lit at about 09:57 on 7 August over ' +
      'Africa and this time left the ship steady.',
    facts: [
      ['Thrust', '1,614 kgf (15.8 kN)'],
      ['Propellant', '280 kg: amine fuel and nitric acid'],
      ['Burn', '45 s at most; 40 or 45 s flown (accounts differ)'],
      ['Lit', 'about 09:57 Moscow time, 7 August'],
    ],
  },
];

const BOOSTER_DETAIL =
  'A cone 19.2 m long on a short cylinder, with its own RD-107: four fixed chambers and two small ones that swivel to ' +
  'steer, all fed by one turbopump driven by steam from hydrogen peroxide. The whole cone is its oxygen tank, white with ' +
  'frost even on an August morning in the desert; the kerosene is in the cylinder under it. It is not bolted on. Its tip ' +
  'is a steel ball in a cup on the core, and its thrust holds it there; two ties at the foot keep it from swinging. When ' +
  'its engine is throttled back the ties are let go, and what thrust is left swings the foot outward until the ball drops ' +
  'out of its cup. Four doing this at once draw a cross in the sky. The triangle at the foot is an air rudder.';

const launcherParts: PartWords[] = [
  {
    node: 'Fairing',
    name: 'Fairing',
    summary: 'Two halves, and a round hole to be thrown out through.',
    detail:
      'It covers the ship through the thick air and is dropped in two halves some two and a half minutes up. The round ' +
      'opening is over hatch No. 1. Titov went aboard through it from the lift, two hours before liftoff in the heat of ' +
      'a desert August, and had the rocket failed on the pad or low in the climb his seat would have been fired out ' +
      'through it: the ejection seat was the launch escape system. Its lengths are from a NASA drawing and the curve of ' +
      'its nose from the vehicles kept at Kaluga and in Moscow; nothing read says this flight’s differed from Vostok 1’s.',
    facts: [
      ['Length', '6.6 m'],
      ['Diameter', '2.7 m'],
      ['Mass', 'about 0.8 t'],
      ['Opening', 'over hatch No. 1, for boarding and ejection'],
    ],
  },
  {
    node: 'BlockE',
    name: 'Block E, the third stage',
    summary: 'The stage that had left Gagarin too high put Titov where he was meant to be.',
    detail:
      'Built in nine months of 1958 to throw a probe at the Moon, then given a longer adapter for the Vostok. To keep it ' +
      'short its tanks are two rings, one above the other, with the engine in the hole. The RD-0109 does not swivel: the ' +
      'stage is steered by the spent gas from its own turbine, piped to eight small nozzles round the foot. In April ' +
      'the orbit had come out 97 km too high at the top. In August it came out as planned, 183 by 244 km by the ' +
      'figures printed since, low enough to bring the ship down by itself within the ten days its supplies allowed. ' +
      'The times of this flight’s staging were not found; the stage’s figures are the type’s.',
    facts: [
      ['Length', '2.98 m with its adapter'],
      ['Diameter', '2.58 m'],
      ['Mass', '7,984 kg fuelled, 1,472 kg burnt out'],
      ['Engine', 'RD-0109: 54.5 kN in vacuum, 121 kg'],
      ['Engine’s size', '1,555 mm long; nozzle exit 733 mm across'],
      ['Steering', '8 nozzles on the turbine’s exhaust: 4 fixed, 4 turning'],
      ['Orbit reached', '183 × 244 km (TASS on the day: 178 × 257)'],
    ],
  },
  {
    node: 'Interstage',
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
  },
  {
    node: 'CoreStage',
    name: 'Block A, the core',
    summary: 'Second stage, though it lights first; this one sprang a leak before the launch.',
    detail:
      'Called the second stage, but its engine starts on the pad with the boosters’, because an engine that failed to ' +
      'start on the ground could be shut down and tried again. It carries twice a booster’s propellant and burns two ' +
      'and a half times as long. Its shape follows from the boosters round it: narrow at the foot where they crowd in, ' +
      'widest 20 m up where their tips push on a heavy frame. No. E103-17 was the only trouble of the preparations: a ' +
      'leak in the core, dealt with by Korolev’s deputy Voskresensky. Three days earlier an R-9 had blown up on its ' +
      'pad at the same range. Every station between the core’s ends is estimated: no drawing of it has been read.',
    facts: [
      ['Vehicle', '8K72K No. E103-17'],
      ['Length', '27.5 m; 28.75 m with the lattice'],
      ['Diameter', '2.05 m at the foot, 2.95 m at the frame'],
      ['Mass', 'about 100 t at liftoff, 7 to 8 t empty'],
      ['Propellant', '90 t'],
    ],
  },
  {
    node: 'CoreEngine',
    name: 'RD-108',
    summary: 'Four big chambers that cannot move and four small ones that steer.',
    detail:
      'Four chambers round a single turbopump: what looks like four engines is one. The pump is driven by steam made ' +
      'from hydrogen peroxide. The four chambers are fixed. Steering is by four little chambers on trunnions at the ' +
      'corners, fed through their own pivots; they also give the last, fine push after the main chambers shut down. ' +
      'With the boosters’ engines that makes twenty large nozzles and twelve small: thirty-two chambers lit on the ' +
      'ground, each by its own pyrotechnic igniter.',
    facts: [
      ['Thrust', '744 kN at the ground, 945 kN in vacuum'],
      ['Specific impulse', '248 s at the ground, 315 s in vacuum'],
      ['Chambers', '4 fixed, 4 steering of 2.5 tf'],
      ['Propellants', 'kerosene T-1 and liquid oxygen'],
      ['Turbopump', 'one, driven by decomposed hydrogen peroxide'],
    ],
  },
  ...BOOSTERS.map(
    ([letter, block], i): PartWords => ({
      node: `Booster_${letter}`,
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
    }),
  ),
];

// The descent's events, by hand (orbital.ts flyDown): each said with what did it on the day, since he could do none of them.
const COMMANDS = vostokCommands({
  parted: 'on the day the cable bundle held them until it burnt through in the entry, 10:07',
  reserve: 'by itself after the main, as the type’s was',
});

/** The vehicle as built, in its own frame; on the pad it hangs in the launch system's four supports, its tail below the deck (`site1Vehicle`); the gallery stands it on its nozzles. */
const vehicle = site1Vehicle(
  vostokStack({
    flight: 'vostok-2',
    parts: commanded(vostokParts('vostok-2', [...launcherParts, ...parts]), COMMANDS),
    // The ejection seat as somewhere to sit, and its cabin (../../vehicles/cabin.ts: from the model's own nodes). Boarded on foot
    // through hatch No. 1 from 07:00, when the plan has him in the seat, until 07:40, when it has the hatch closing («График
    // подготовки космонавтов ... в день старта», 4 August 1961: «Первый пилотируемый полёт», 2011, book 2, doc 190, pp. 179-181).
    // Planned, not recorded: Titov's report says the day went to it.
    seats: [vostokSeat([MSK(7, 0), MSK(7, 40)])],
    cabin: vostokCabin(),
  }),
  BASE,
);

/** Titov, suited, on his way to the stair (crew/sk-1.parts.ts): the SK-1 as Gagarin's, the man in it not measured. */
const crew = sk1Crew({
  url: 'models/ussr/vostok/vostok-2/crew.glb',
  scale: 'Gherman S. Titov · built 1.65 m, 1.72 m suited (his height not found) · to scale',
  helmet: {
    summary: 'White, part of the suit, lettered «СССР».',
    detail:
      'The helmet does not come off: it is one piece with the suit, and the head turns inside it. Its visor swings up over ' +
      'the crown, as he wore it to the pad. The red "СССР" on the brow is the reports of the morning’s, as on Gagarin’s. At the ' +
      'bus he and Nikolayev, both suited, knocked their helmets together for luck («„чокаемся“ гермошлемами»: Titov, 1973).',
    facts: [
      ['Shell', 'fixed to the suit'],
      ['Visor', 'double, closes by itself on loss of pressure'],
      ['Lettering', '"СССР", red (the reports of 6 August 1961)'],
    ],
  },
});

const PRAVDA = 'Pravda and Izvestiya, 7 to 12 August 1961 (JPL Astronautics Information Translation No. 24)';

export const flight: Flight = {
  id: 'ussr/vostok/vostok-2',
  nation: 'USSR',
  agency: 'OKB-1',
  program: 'Vostok',
  designation: 'Vostok 2',
  callsign: 'Oryol (Орёл)',
  spacecraft: 'Vostok 3KA No. 4',
  launchVehicle: 'Vostok-K 8K72K, No. E103-17',
  // 09:00:00 Moscow time: «Отрыв ракеты от стартового устройства произошел в 6 часов 00 минут 00 секунд по гринвичскому
  // времени», the Central Aero Club's act for the record file («Первый пилотируемый полёт», 2011, book 2, doc 194, p. 221).
  // RKK Energia's own page (its press release of 5 August 2011, archived 8 September 2011) and RussianSpaceWeb have 08:59:57
  launch: '1961-08-06T06:00:00Z',
  launchSite: SITE1.name,
  site: SITE1,
  // The launch site opens as the bus has stopped on the apron (06:50 by the plan's quarter hour for the drive and the
  // farewell): this morning's crowd is not built, so the bus is what there is to see. Opened at liftoff, the deck is empty
  opens: { at: MSK(6, 50), model: 'pad', view: 'bus' },
  weather: WEATHER,
  crew: ['Gherman S. Titov'],
  summary:
    'The first day in space. Seventeen orbits in 25 hours from Tyuratam: the first meals, the first sleep and the first ' +
    'space sickness, the ship flown by hand for the first time, ending with the pilot ejecting and landing by parachute near Krasny Kut.',
  facts: [
    { label: 'Liftoff', value: '6 August 1961, 06:00:00 UTC (09:00 Moscow time)' },
    { label: 'Pilot', value: 'Gherman S. Titov, aged 25' },
    { label: 'Duration', value: '25 h 18 min to his landing; the ship 25 h 11 min' },
    { label: 'Orbits', value: '17 and a part' },
    { label: 'Orbit', value: '183 × 244 km, 64.93°' },
    { label: 'Mass in orbit', value: '4,731 kg' },
    { label: 'Landing', value: 'near Krasny Kut, Saratov oblast, 50°51′N 47°01′E' },
  ],
  // Moscow times from the TASS reports of the day and Titov's own (Pravda, Izvestiya; his report to the State Commission of
  // 8 August as Zak and Pervushin quote it); the ascent's seconds were not found for this flight (docs/sources.md, README.md)
  timeline: [
    { t: 0, event: 'Liftoff, 09:00:00 Moscow time (the record file’s act)' },
    { t: MSK(9, 20), event: 'The tracking stations and Titov confirm the orbit; TASS is allowed to announce it' },
    { t: MSK(10, 0), event: 'In the Earth’s shadow Titov keys the lock and takes the ship by hand, the first to do so' },
    { t: MSK(10, 38), event: 'Over the Soviet Union on the second orbit: his report to Khrushchev; he films the Earth' },
    { t: MSK(12, 30), event: 'Lunch from tubes, with no appetite' },
    { t: MSK(17, 0), event: 'Supper; he is by now unwell' },
    { t: MSK(17, 30), event: 'Manual control again, on the seventh orbit, until 17:55' },
    { t: MSK(18, 15), event: 'Over Moscow: he reports 18 °C and 70% humidity, wishes the city good night and says he is going to sleep' },
    { t: MSK(26, 37), event: 'He wakes at 02:37 on 7 August, 35 minutes late; from the twelfth orbit he feels well' },
    { t: MSK(33, 57), event: 'Braking engine on, about 09:57, on the seventeenth orbit' },
    { t: MSK(34, 7), event: 'The modules, held together by the cable mast, come apart as it burns through (about 10:07, by Titov)' },
    { t: MSK(34, 11), event: 'Descent module lands near Krasny Kut, about 10:11 (the ship’s 25 h 11 min)' },
    { t: MSK(34, 18), event: 'Titov lands by parachute beside the railway, 10:18' },
  ],
  specs: [
    SPEC.length,
    SPEC.diameter,
    SPEC.descentDiameter,
    SPEC.instrumentLength,
    SPEC.hatch,
    {
      group: 'Spacecraft',
      label: 'Mass in orbit',
      value: 4731,
      unit: 'kg',
      confidence: 'documented',
      note: `4,731 kg, "without the last stage of the carrier rocket" (TASS, 6 August 1961: ${PRAVDA}; Siddiqi, Table IB). 6 kg more than Vostok 1`,
    },
    {
      group: 'Spacecraft',
      label: 'Descent module mass',
      value: 2460,
      unit: 'kg',
      confidence: 'assumed',
      note: '2.46 t for the type (Siddiqi p. 195). No. 4’s own figure has not been found',
    },
    SPEC.instrumentMass,
    {
      group: 'Spacecraft',
      label: 'Perigee',
      value: 183,
      unit: 'km',
      confidence: 'documented',
      note: '183 km (Siddiqi, Table IB, "initial orbital parameters"; RussianSpaceWeb). TASS announced 178 km on the day, as preliminary; no OKB-1 report of this flight has been read',
    },
    {
      group: 'Spacecraft',
      label: 'Apogee',
      value: 244,
      unit: 'km',
      confidence: 'documented',
      note: '244 km (Siddiqi, Table IB; RussianSpaceWeb). TASS announced 257 km on the day, and Siddiqi’s own text (p. 292) repeats it',
    },
    {
      group: 'Spacecraft',
      label: 'Inclination',
      value: 64.93,
      unit: 'deg',
      confidence: 'documented',
      note: '64.93° (Siddiqi, p. 292 and Table IB); 64°56′ as TASS announced it',
    },
    {
      group: 'Spacecraft',
      label: 'Period',
      value: 88.6,
      unit: 'min',
      confidence: 'documented',
      note: '88.6 min (TASS, 6 August 1961; Titov was read the same figure on the first orbit). 88.46 is printed beside 183 × 244 km, which over a sphere of 6,371 km give 88.6 by Kepler’s law, not 88.46',
    },
    {
      group: 'Spacecraft',
      label: 'Cabin temperature, least',
      value: 10,
      unit: '°C',
      confidence: 'documented',
      note: `10 to 22 °C (Yazdovsky at the press conference of 11 August: ${PRAVDA}); both fans had been switched on at launch (Kamanin’s diary, by way of Siddiqi p. 294)`,
    },
    {
      group: 'Spacecraft',
      label: 'Film camera, length',
      value: 0.29,
      unit: 'm',
      confidence: 'documented',
      note: 'the Konvas-Avtomat as a type: 290 × 260 × 240 mm, 5.7 kg (Russian Wikipedia’s table, from a Soviet handbook of 1974 that was not seen). Titov’s was altered for the flight, how is not known; the model is 290 mm long and 260 tall, and 138 wide',
    },
    {
      group: 'Spacecraft',
      label: 'Pilot height, as modelled',
      value: 1.65,
      unit: 'm',
      confidence: 'estimated',
      note: 'assumed: the figure in the seat is the one built to Gagarin’s recorded 165 cm. No document with Titov’s height was found; 163 cm is printed on biography pages that name no source',
    },
    SPEC.padLength,
    SPEC.rudders,
    {
      group: 'Launch vehicle',
      label: 'Liftoff mass',
      value: 287000,
      unit: 'kg',
      confidence: 'assumed',
      note: '287 t, the type’s figure and Vostok 1’s (RKK Energia 1946–1996; Minakov; Siddiqi). No. E103-17’s own was not found; its spacecraft was 6 kg heavier',
    },
    SPEC.core,
    SPEC.coreDiameter,
    SPEC.strapOn,
    SPEC.strapOnDiameter,
    SPEC.third,
    SPEC.fairing,
    {
      group: 'Launch vehicle',
      label: 'Launch azimuth',
      value: 37.5,
      unit: 'deg',
      confidence: 'derived',
      note: 'east of north, for an orbit inclined 64.93° from latitude 45.92°, before the Earth’s turning is allowed for. The azimuth as flown was not found',
    },
    ...SITE1_SPECS,
    ...SK1_SPECS,
    {
      group: 'Pressure suit',
      label: 'Standing height, helmet and boots',
      value: 1.725,
      unit: 'm',
      confidence: 'estimated',
      note: 'the figure’s, built to Gagarin’s 165 cm with a 2.6 cm heel and the helmet over the crown as his: Titov’s own height was not found',
    },
  ],
  motors: vostokMotors({
    strapOns: {
      burnS: 118,
      confidence: 'assumed',
      note: 'The burn is the type’s, 118 s (Minakov): the time the strap-ons left on this flight was not found (Vostok 1: 119 s)',
    },
    core: {
      burnS: 290,
      confidence: 'assumed',
      note: 'The burn is the type’s, 290 s (Minakov; others print up to 301): this flight’s cutoff was not found (Vostok 1: 300 s)',
    },
    third: {
      confidence: 'documented',
      note: 'No burn time is given: rated burns in print run from 365 to 440 s and this flight’s was not found (Vostok 1’s ran 376 s and left it too high)',
    },
    braking: {
      burnS: 45,
      confidence: 'documented',
      note: 'Flown: on at about 09:57 Moscow time on 7 August for 40 s (RussianSpaceWeb) or 45 s (Pervushin)',
    },
    jets: {
      confidence: 'documented',
      note: 'Worked by hand on this flight, on orbits 1 and 7',
    },
  }),
  // the flight as an orbit: stages, events, the orbit, the braking burn and the entry, each with its source (orbital.ts; mission.md)
  orbital,
  plan: planOfOrbital(orbital),
  flownNote:
    'The ascent is the type’s, flown on Vostok 1’s instants (none of this flight’s was found), and like Vostok 1’s it falls short of the orbit reached. ' +
    'So from the spacecraft’s separation the run shown here, in the view and on the flight deck, is the published orbit begun where the simulated ascent left it: a handover, not a result. ' +
    'The braking burn’s instant is derived (mission.md): Titov’s 09:57 is not possible on the documented orbit.',
  // the flight in the scene: the stack off the pad, what leaves it and the descent's bodies, from the record above (vehicles/vostok-flies.ts)
  flies: vostokFlies(orbital),
  models: [vehicle, pad, crew],
  // the place round the pad as it stood that August: April's, less Site 51, burnt out three days before (places/tyuratam/site1/model/1961-08.py)
  surroundings: 'models/ussr/places/tyuratam/site1/1961-08.glb',
};

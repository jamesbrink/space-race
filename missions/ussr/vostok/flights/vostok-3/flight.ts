import type { Flight } from '../../../../../src/types.ts';
import { SK1_SPECS, sk1Crew } from '../../crew/sk-1.parts.ts';
import { SITE1_SPECS, site1Vehicle } from '../../../places/tyuratam/site-1.parts.ts';
import { SITE1 } from '../../../places/tyuratam/site-1.ts';
import { SPEC, type PartWords, BOOSTERS, vostokStack, vostokParts, BASE, vostokMotors } from '../../vehicles/vostok-stack.ts';
import { vostokCabin, vostokSeat } from '../../vehicles/cabin.ts';
import { commanded, vostokCommands, vostokFlies } from '../../vehicles/vostok-flies.ts';
import { vostokPlan } from '../../vehicles/vostok-plan.ts';
import { MSK, orbital } from './orbital.ts';
import { pad } from './pad.ts';
import { WEATHER } from './weather.ts';

const parts: PartWords[] = [
  {
    node: 'DescentModule',
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
  },
  {
    node: 'EntryHatch',
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
  },
  {
    node: 'ParachuteHatch',
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
  },
  {
    node: 'Cabin',
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
  },
  {
    node: 'EjectionSeat',
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
  },
  {
    node: 'TelevisionCameras',
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
  },
  {
    node: 'FilmCamera',
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
  },
  {
    node: 'RetainingStraps',
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
  },
  {
    node: 'CableMast',
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
  },
  {
    node: 'GasBottles',
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
  },
  {
    node: 'InstrumentModule',
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
  },
  {
    node: 'Antennas',
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
  },
  {
    node: 'RetroEngine',
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

const launcherParts: PartWords[] = [
  {
    node: 'Fairing',
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
  },
  {
    node: 'BlockE',
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
      ['Engine’s size', '1,555 mm long; nozzle exit 733 mm across'],
      ['Shut down', '687 s after liftoff, as planned; the ship free at 720 s'],
      ['Orbit reached', '180.7 × 234.6 km (TASS on the day: 183 × 251)'],
    ],
  },
  {
    node: 'Interstage',
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
  },
  {
    node: 'CoreStage',
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
      'ground, each by its own pyrotechnic igniter. This one left the ground at 11:30 Moscow time to within half a ' +
      'second of the time set three days before.',
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
  parted: 'the sequence, ten seconds after the burn (not recorded)',
  reserve: null,
  pilot: { they: 'he', theirs: 'his' },
});

/** The vehicle as built, in its own frame; on the pad it hangs in the launch system's four supports, its tail below the deck (`site1Vehicle`); the gallery stands it on its nozzles. */
const vehicle = site1Vehicle(
  vostokStack({
    flight: 'vostok-3',
    parts: commanded(vostokParts('vostok-3', [...launcherParts, ...parts]), COMMANDS),
    // The ejection seat as somewhere to sit, and its cabin (../../vehicles/cabin.ts: from the model's own nodes). Boarded on foot
    // through hatch No. 1 from 09:40, after the lift (the bus came at 09:30: Kamanin), until 10:07, Vostok 1's interval from its
    // hatch's closing to its liftoff put before this one: neither is recorded for this flight (estimated).
    seats: [vostokSeat([MSK(11, 9, 40), MSK(11, 10, 7)])],
    cabin: vostokCabin(),
  }),
  BASE,
);

/** Nikolayev, suited, on his way to the lift (crew/sk-1.parts.ts): the SK-1 as Gagarin's, the man in it not measured. */
const crew = sk1Crew({
  url: 'models/ussr/vostok/vostok-3/crew.glb',
  scale: 'Andriyan G. Nikolayev · built 1.65 m, 1.72 m suited (his height not found) · to scale',
  helmet: {
    summary: 'White, part of the suit, lettered «СССР».',
    detail:
      'The helmet does not come off: it is one piece with the suit, and the head turns inside it. Its visor swings up over ' +
      'the crown, as he wore it to the pad. The red "СССР" on the brow is the film of the morning’s («Звёздные братья», 1962), ' +
      'on both men’s helmets.',
    facts: [
      ['Shell', 'fixed to the suit'],
      ['Visor', 'double, closes by itself on loss of pressure'],
      ['Lettering', '"СССР", red (the film of the morning)'],
    ],
  },
  suit: {
    kind: {
      value: 'SK-1',
      confidence: 'documented',
      source: 'Abramov and Skoog, Russian Spacesuits, pp. 41 to 44',
    },
    wearer: { name: 'Nikolayev', they: 'he', their: 'his' },
    gloves: {
      value: 'cover',
      confidence: 'estimated',
      source:
        'as built for Gagarin: the cover’s orange backs. That he wore gloves is Kamanin’s (12 August 1962: he told him to put them on before the count); their colour is in nothing read, and no photograph of the morning was looked at for it. Probably wrong: the SK-1s kept since have black leather gloves (crew/sk-1.md)',
    },
    neck: { value: 'grey', confidence: 'estimated', source: 'as Gagarin’s (crew/sk-1.md): not checked for this morning' },
    mirror: {
      value: true,
      confidence: 'assumed',
      source: 'Gagarin’s, documented by the Smithsonian’s label, taken for his: nothing read says whether his sleeve had one',
    },
  },
});

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
  // The site opens as the bus stops among the people meeting the flight on 11 August.
  opens: { at: MSK(11, 9, 30), model: 'pad', view: 'bus' },
  weather: WEATHER,
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
      ...SPEC.length,
      note: `${SPEC.length.note}. Keldysh, 21 August 1962: the ship “coincides approximately with Vostok 1 and Vostok 2 in weight and dimensions”`,
    },
    SPEC.diameter,
    SPEC.descentDiameter,
    SPEC.instrumentLength,
    SPEC.hatch,
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
      confidence: 'assumed',
      note: '2.46 t for the type (Siddiqi p. 195). No. 5’s own figure has not been found',
    },
    SPEC.instrumentMass,
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
      value: 88.54,
      unit: 'min',
      confidence: 'derived',
      note: '88.54 min, node to node: what 180.7 × 234.6 km at 64.98° give over the mean Earth as a mean orbit, and flown (orbital.ts: mission.md, "The orbit"). No published period with these heights has a traceable source: 88.33 is printed beside them only by Russian Wikipedia, origin unknown, not flown. Announced: 88.5 min, “the initial duration of Vostok 3’s circuit” (Nikolayev, 21 August 1962, in Flight International, 30 August, p. 305), which is what 180.7 × 234.6 km give over a sphere of 6,371 km by Kepler’s law; TASS at 12:12 on 12 August: 88.2 min',
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
    SPEC.televisionCase,
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
    SPEC.padLength,
    SPEC.rudders,
    {
      group: 'Launch vehicle',
      label: 'Liftoff mass',
      value: 287000,
      unit: 'kg',
      confidence: 'assumed',
      note: '287 t, the type’s figure and Vostok 1’s (RKK Energia 1946–1996; Minakov; Siddiqi). No. E103-23’s own was not found; its spacecraft was 9 kg lighter than Vostok 2’s',
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
      value: 37.4,
      unit: 'deg',
      confidence: 'derived',
      note: 'east of north, for an orbit inclined 64.98° from latitude 45.92°, before the Earth’s turning is allowed for. The azimuth as flown was not found',
    },
    ...SITE1_SPECS,
    ...SK1_SPECS,
    {
      group: 'Pressure suit',
      label: 'Standing height, helmet and boots',
      value: 1.725,
      unit: 'm',
      confidence: 'estimated',
      note: 'the figure’s, built to Gagarin’s 165 cm with a 2.6 cm heel and the helmet over the crown as his: Nikolayev’s own height was not found',
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
      note: 'No burn time is given: rated burns in print run from 365 to 440 s. On this flight the bunker waited for the count of 687 s from liftoff as the end of its burn and the ship parted at 720 s (Kamanin’s diary, 14 August 1962); when it lit was not found',
    },
    braking: {
      burnS: 45,
      confidence: 'documented',
      note: 'Flown: 42 s by Nikolayev’s ear («была слышна в течение 42-х секунд ее работа»: his report to the State Commission, 16 August, as Kamanin wrote it down), on the morning of 15 August; the minute was not found',
    },
    jets: {
      confidence: 'documented',
      note: 'The store was worth 2 to 3 hours of orienting (Kamanin, 26 July 1962); worked by hand to look for the third stage and for Vostok 4’s launch',
    },
  }),
  // the flight as an orbit, written from its record: stages, events, the orbit, the braking burn and the entry, each with its
  // source (orbital.ts; mission.md)
  plan: { ...vostokPlan(orbital), aloft: WEATHER.aloft },
  flownNote:
    'The ascent is the type’s, flown on Vostok 1’s instants but for the third stage’s cutoff and the separation Kamanin heard counted, and like Vostok 1’s it falls short of the orbit reached. ' +
    'So from the spacecraft’s separation the run shown here, in the view and on the flight deck, is the published orbit begun where the simulated ascent left it: a handover, not a result. ' +
    'The braking burn’s instant is derived from the pilot’s landing (mission.md): its minute was not found.',
  // the flight in the scene: the stack off the pad, what leaves it and the descent's bodies, from the record above (vehicles/vostok-flies.ts)
  flies: vostokFlies(orbital),
  models: [vehicle, pad, crew],
  // the place round the pad as modelled for August 1961 (places/tyuratam/site1/model/1961-08.py): nothing later has been
  // looked for, and what was new by August 1962 (Korolev's post, the room by the bunker) is not built
  surroundings: 'models/ussr/places/tyuratam/site1/1961-08.glb',
};

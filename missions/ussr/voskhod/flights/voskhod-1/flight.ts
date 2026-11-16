import type { Flight } from '../../../../../src/types.ts';
import { SITE1_SPECS, site1Vehicle } from '../../../places/tyuratam/site-1.parts.ts';
import { SITE1 } from '../../../places/tyuratam/site-1.ts';
import { vostokPlan } from '../../../vostok/vehicles/vostok-plan.ts';
import { commanded, voskhodChutes, voskhodCommands, voskhodFlies } from '../../vehicles/voskhod-flies.ts';
import { AREAS, MSK, orbital } from './orbital.ts';
import { pad } from './pad.ts';
import { WEATHER } from './weather.ts';
import {
  SPEC,
  type PartWords,
  couch,
  BASE,
  BOOSTERS,
  voskhodStack,
  voskhodParts,
  VIEW,
  SPACECRAFT,
  voskhodMotors,
} from '../../vehicles/voskhod-11a57.ts';
import { voskhodCabin, voskhodSeat } from '../../vehicles/cabin.ts';

const parts: PartWords[] = [
  {
    node: 'DescentModule',
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
  },
  {
    node: 'EntryHatch',
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
  },
  {
    node: 'ParachuteHatch',
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
  },
  {
    node: 'Cabin',
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
  },
  {
    node: 'RetainingStraps',
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
  },
  {
    node: 'CableMast',
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
  },
  {
    node: 'GasBottles',
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
  },
  {
    node: 'InstrumentModule',
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
  },
  {
    node: 'Antennas',
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
  },
  {
    node: 'RetroEngine',
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

const launcherParts: PartWords[] = [
  {
    node: 'Fairing',
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
  },
  {
    node: 'BlockI',
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
  },
  {
    node: 'AftSection',
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
  },
  {
    node: 'Interstage',
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
  },
  {
    node: 'CoreStage',
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
  },
  {
    node: 'CoreEngine',
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
        ['Engine', 'RD-107: 819 kN at the ground (Brügge’s table for the 11A57)'],
        ['Chambers', '4 fixed, 2 steering'],
        ['Left the core', 'at about 120 s (the type, from Kosmos 47)'],
      ],
    }),
  ),
];

const COUCHES = ['CouchLeft', 'CouchCentre', 'CouchRight'];

// The three couches as somewhere to sit, and their cabin (../../vehicles/cabin.ts: from the model's own nodes). Each
// eye point is at its man's own eyes and turned as his head is (vehicles/voskhod.py `seat_view`); from his couch his
// own head, and the headset's cap, earphones, strap and microphones on it, are not drawn (crew/flight_suit.py: every
// `Helmet_` mesh). The commander's is first: the one an on-board view takes. They went aboard between the bus reaching
// the pad at 08:15 Moscow time and "all three aboard" at 08:35, Yegorov first and Komarov last (README.md, Kamanin's
// times to the minute: derived): the launch site's couches can be boarded on foot between the two.
const HEAD = ['Head', 'Cap', 'Earphones', 'ChinStrap', 'MicrophoneBooms', 'Microphones', 'Eyes', 'Brows', 'Lips'];
const BOARDING: [number, number] = [-8101, -6901];
// The descent's events, by hand (orbital.ts flyDown): each said with what did it on the day, since the crew could do none of them.
const DESCENT = orbital.descent!.bodies[0]!.chutes;
const COMMANDS = voskhodCommands({
  parted: 'on the day the sequence parted them after the burn; Moscow heard the ball’s beacon at 10:22:30',
  crew: 'the crew',
  cover: { id: 'cover-off', at: `its barometric switch, ${(orbital.ejection.altitude.value / 1000).toFixed(1)} km` },
  chutes: DESCENT.map((c) => ({
    name: c.name,
    at: c.altitude ? `its barometric switch, ${(c.altitude.value / 1000).toFixed(1)} km` : 'with the cover',
  })),
});
/** The module's parachutes as drawn, at their areas as the record has them (vehicles/voskhod-flies.ts). */
const CHUTES = voskhodChutes(AREAS);

/** The vehicle as built, in its own frame; on the pad it hangs in the launch system's four supports, its tail below the deck (`site1Vehicle`); the gallery stands it on its nozzles. */
const vehicle = site1Vehicle(
  voskhodStack({
    flight: 'voskhod-1',
    parts: commanded(voskhodParts('voskhod-1', [...launcherParts, ...parts]), COMMANDS),
    views: [
      VIEW.stack,
      VIEW.base,
      VIEW.booster,
      VIEW.tips,
      VIEW.third,
      VIEW.fairing,
      // each of these is of named parts, so it stays on them as the slider takes the vehicle apart
      { id: 'spacecraft', label: 'Spacecraft', nodes: SPACECRAFT },
      VIEW.descent,
      VIEW.reserve,
      VIEW.hatch,
      VIEW.crew(COUCHES),
      VIEW.instrument,
      VIEW.engine,
    ],
    seats: [
      voskhodSeat('Right', 'Komarov’s couch, by the hatch', HEAD, BOARDING),
      voskhodSeat('Centre', 'Feoktistov’s couch, in the middle', HEAD, BOARDING),
      voskhodSeat('Left', 'Yegorov’s couch, by the Vzor', HEAD, BOARDING),
    ],
    cabin: voskhodCabin(COUCHES),
  }),
  BASE,
);

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
  // The launch site opens as the bus has stopped by the pad, 08:15 (Kamanin): this morning's people are not built, so the bus
  // is what there is to see. Opened at liftoff, the deck is empty
  opens: { at: MSK(12, 8, 15), model: 'pad', view: 'bus' },
  weather: WEATHER,
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
    SPEC.diameter,
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
      note: '408 km (Siddiqi; the encyclopedia); 409 km (TASS; the UN registration). Read node to node, the announced 90.1 min agrees with the heights only over a ball of 6,363 km, as the Vostoks’ do; later catalogues print 336 to 377 km for later epochs. The August plan had 240 km',
    },
    {
      group: 'Spacecraft',
      label: 'Inclination',
      value: 64.9,
      unit: 'deg',
      confidence: 'documented',
      note: '64.9° (Siddiqi p. 423); “about 65 degrees” (TASS). His Table IB gives none for this flight: its 64.77 is Kosmos 47’s and Kosmos 57’s',
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
    SPEC.padLength,
    SPEC.rudders,
    SPEC.liftoffThrust,
    SPEC.third,
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
    ...SITE1_SPECS,
  ],
  motors: voskhodMotors({
    strapOns: {
      burnS: 120,
      confidence: 'assumed',
      note: 'The strap-ons left at 120 s on Kosmos 47 six days before (Kamanin, 6 October 1964); this flight’s time was not found',
    },
    core: {
      burnS: 290,
      confidence: 'assumed',
      note: 'The third stage lit at 290 s on Kosmos 47 (Kamanin); this flight’s time was not found',
    },
    third: {
      burnS: 233,
      confidence: 'documented',
      note: 'Encyclopedia Astronautica has 297.9 kN, 326 s and a burn of 250 s. The burn here is 290 s to orbit at 523 s (Kamanin: Kosmos 47’s ignition; this flight’s 523). On Kosmos 47 its thrust fell 10 per cent for three seconds',
    },
    braking: {
      burnS: 45,
      confidence: 'documented',
      note: 'Fired on 13 October over the Gulf of Guinea, at 10:18:58 Moscow time (RussianSpaceWeb); Chertok (vol. 3, p. 241) gives 10:08:56 as the time in the programme. The first agrees with the beacon heard at 10:22:30 (Kamanin). Its burn was not found',
    },
    reserve: {
      burnS: 2,
      confidence: 'documented',
      note: 'Not fired on this flight',
    },
    jets: {
      confidence: 'assumed',
      note: 'Nothing read says the 3KV’s differed. Komarov turned the ship by hand on the sixth orbit (TASS, 13 October 1964)',
    },
  }),
  // the flight as an orbit, written from its record: stages, events, the orbit, the braking burn and the descent, each with
  // its source (orbital.ts; mission.md), flown through the day's air over the pad
  plan: { ...vostokPlan(orbital), aloft: WEATHER.aloft },
  flownNote:
    'The ascent is flown on Kosmos 47’s instants but for the third stage’s cutoff at 523 s, the one this flight’s record gives, and like the Vostoks’ it falls short of the orbit reached. ' +
    'So from the spacecraft’s separation the run shown here, in the view and on the flight deck, is the published orbit begun where the simulated ascent left it: a handover, not a result. ' +
    'Sixteen revolutions are flown round to the braking burn at 10:18:58 on 13 October, and the crew comes down in the ball (mission.md).',
  // the flight in the scene: the stack off the pad, what leaves it and the descent's bodies, from the record (vehicles/voskhod-flies.ts)
  flies: voskhodFlies(orbital, CHUTES),
  models: [vehicle, pad],
  // the place round the pad: as modelled for August 1961, nothing modelled being known to have changed by October 1964 (what
  // was raised for the taller 11A57 is not found: places/tyuratam/site-1.md, "What stood when")
  surroundings: 'models/ussr/places/tyuratam/site1/1961-08.glb',
};

import type { Flight } from '../../../../../src/types.ts';
import { LC14 } from '../../../places/cape-canaveral/lc-14.ts';
import {
  SPEC,
  mercuryAtlasStack,
  mercuryAtlasParts,
  VIEW,
  along,
  HATCH_AZ,
  WINDOW_AZ,
  LB,
  IN,
  FT,
  NMI,
  LBF,
  mercuryAtlasMotors,
  ATLAS,
} from '../../vehicles/mercury-atlas.ts';
import { SPEC as CAPSULE_SPEC, type PartWords, lb, THRUST } from '../../vehicles/mercury-capsule.ts';
import { ON_THE_PAD, periscopeMechanism, periscopeMoves } from '../../vehicles/periscope.ts';
import { mercuryCabin, OBJECTIVE_OUT } from '../../vehicles/cabin.ts';
import { LAUNCHER_TOP, STAND_TURN } from '../../../places/cape-canaveral/lc-14.parts.ts';
import { crew, pad, PAD_SPECS } from './pad.ts';
import { WEATHER } from './weather.ts';

const REPORT = 'NASA TN D-4807';

/**
 * Sigma 7's periscope, out and in (vehicles/periscope.ts): when, as this flight went. It was still carried: the next
 * capsule was the first without one (This New Ocean, p. 490). How it moves is the model's own, and No. 11's
 * (mercury_capsule.ScopeWorks: no photograph of this side of No. 16 has been read).
 * - Out on the pad, and drawn in when the umbilical was thrown off: two fixed cameras "indicated normal liquid oxygen
 *   (lox) boiloff, umbilical disconnect, periscope retraction, and umbilical-door closure" (NASA TN D-4807, p. 28).
 *   Documented that it went in then. When in the count that was is not in anything read for this flight: 35 seconds
 *   before liftoff, as on MA-6. Estimated.
 * - Out at separation, 00:05:17.9 (the same report, Table XXII, p. 134): that is the programme (SEDR 104, 12-2); "I
 *   haven't used the periscope too much as yet" at 00:18:57 (NASA SP-12, the air-ground transcript, p. 60). Derived.
 * - In thirty seconds after the retropack went, which was at 08:53:00 (Table XXII): the programme again, and here
 *   the record has it to the half minute: "The scope is coming in" after 08:53:20, "We confirm scope retract on T/M"
 *   at 08:53:40 (SP-12, p. 116); "The periscope retracted on time" (the pilot's report, TN D-4807, p. 101). Documented.
 * - Out again on the way down: after landing "I'm going to retract the scope manually to get it out of the way" (SP-12,
 *   p. 119), so it had come out. When is said nowhere read. Taken at the 21,000 ft barostats, which on a normal
 *   descent also fire the drogue (Schirra had fired his by hand at 40,000 ft): he called "coming down on 20,000" at
 *   09:07:31. Estimated.
 * Each travel is the motor's five seconds (periscope.ts, TAKES).
 */
const PERISCOPE_EVENTS: [number, boolean][] = [
  [ON_THE_PAD, true],
  [-35, false],
  [317.9, true],
  [32010, false],
  [32848, true],
];
const PERISCOPE = periscopeMoves(PERISCOPE_EVENTS);

const parts: PartWords[] = [
  {
    node: 'EscapeTower',
    name: 'Launch escape tower',
    summary: 'Pulls the capsule off a failing Atlas. It left 24 seconds after the booster engines, and dirtied the window.',
    detail:
      'A welded steel-tube pylon about ten feet tall carrying a solid motor of 52,000 lbf that burns for a second ' +
      'through three nozzles canted clear of the capsule. An Atlas could fail faster than a man could act, so an ' +
      'abort sensing system in the launch vehicle watched its tank pressures, its turning rates and its engines, ' +
      'and would have fired this by itself. In the first seconds of this flight the Atlas rolled hard enough to ' +
      'bring one of those rates to seven tenths of the figure at which it would have. Unused, the tower was ' +
      'released at T+2:33, and Schirra saw it go: its rocket left a thin film on the window, as it had on the two ' +
      'flights before. For this capsule the circuits were changed so that the abort sequence could not be ' +
      'disarmed before the capsule had left the Atlas. As built for the Redstone flights: nothing read gives a ' +
      'difference.',
    facts: [
      ['Escape motor', '52,000 lbf for about 1 s'],
      ['Nozzles', '3, canted'],
      ['Jettison motor', '800 lbf for 1.5 s'],
      ['Released', 'T+2:33, 0.8 s early'],
      ['Fired by', 'the pilot, the ground, or the Atlas’s abort sensing system'],
    ],
  },
  {
    node: 'AntennaCanister',
    name: 'Antenna canister',
    summary: 'Bicone antenna, horizon scanners and the drogue parachute. This one was fished out of the sea afterwards.',
    detail:
      'The pale band is a dielectric window: the metal above and below it are the two halves of a bicone antenna ' +
      'for voice, telemetry and command. Two infrared scanners find the horizon in pitch and roll and keep the ' +
      'attitude gyros true. On Aurora 7 the pitch scanner had read 18° wrong from the launch on, and the canister, ' +
      'thrown away with the main parachute, could not be examined; for this flight the pitch scanner’s cover was ' +
      'changed to keep the heat of the launch off it, and dye was packed in the canister so that it could be ' +
      'found. It was. This time the scanners and the window agreed. The drogue parachute rides in its top: Schirra ' +
      'fired it by hand at 40,000 ft, as planned, and felt it as "a definite, strong thrumming ... somewhat like ' +
      'being on a bumpy road". Its shape is as built for the Redstone flights.',
    facts: [
      ['Length', '24 in (0.61 m)'],
      ['Scanners', '2 infrared; the pitch one’s cover changed'],
      ['Dye markers', 'added, to find the canister afterwards'],
      ['Drogue', 'by hand at 09:06:50, 39,400 ft'],
      ['Recovered', 'yes: flap sound, scanner cover burned off'],
    ],
  },
  {
    node: 'RecoveryCompartment',
    name: 'Recovery compartment',
    summary: 'The parachutes, the pitch and yaw jets, and nine samples of the heat shields to come.',
    detail:
      'A 32-inch cylinder holding the 63-foot ring-sail main parachute and its reserve, skinned in twelve thick ' +
      'beryllium shingles that soak up heat where the cone’s thin ones radiate it. On nine of the twelve this ' +
      'flight carried an experiment: a panel fifteen inches by five of a material that chars and wears away, ' +
      'eight materials from six makers, most with holes cut in them and some of the holes mended, to be judged ' +
      'for the spacecraft after Mercury. All nine came back charred, cracked and still bonded on. In the entry ' +
      'Schirra saw the cylinder glow "a shade similar to limeade"; the report puts it down to a copper compound ' +
      'the shingles were greased with. The main parachute came out by itself at 10,600 ft, its barostats now ' +
      'wired in series so that no one of them could let it go in orbit, and as it went a small bomb dropped from ' +
      'its riser to burst 2,500 ft down: listening stations placed the landing within two miles in twenty ' +
      'minutes. Which shingle carried which panel, and their tones, are estimated.',
    facts: [
      ['Diameter', '32 in (0.81 m)'],
      ['Length', '22.8 in (0.58 m)'],
      ['Skin', '12 beryllium shingles, 0.22 in'],
      ['Ablation panels', '9, each 15 in by 5 in; 8 materials'],
      ['Main parachute', 'by itself at 09:08:12, 10,600 ft'],
      ['SOFAR bomb', 'set for 2,500 ft; fixed the landing within 2 miles'],
    ],
  },
  {
    node: 'Hatch',
    name: 'Explosive hatch',
    summary: 'Seventy bolts and a fuse to break them. Blown on the carrier’s deck, with the pilot’s fist.',
    detail:
      'The hatch Liberty Bell 7 first carried: seventy quarter-inch titanium bolts, each drilled to weaken it, and ' +
      'a mild detonating fuse round the sill that breaks them all together when a plunger inside is struck. ' +
      'Bolting it on took twelve minutes of the count, from T-108 to T-96, and eight more to put the shingles ' +
      'back over it. Schirra asked to stay aboard, and did: the carrier came alongside, lifted the capsule onto ' +
      'her deck forty minutes after it landed, and five minutes later he hit the plunger. It kicked back and ' +
      'marked his hand through the glove, as Glenn’s had been marked. The sill round it was warped by the blast ' +
      'and the springs that hold the hatch were pulled straight. Its place on the cone is as Liberty Bell 7’s, ' +
      'which this capsule’s own photographs bear out.',
    facts: [
      ['Bolts', '70 of 1/4 in titanium, all in'],
      ['Released by', 'mild detonating fuse round the sill'],
      ['Closed', 'T-108 to T-96 min; shingles on by T-88'],
      ['Blown', 'on USS Kearsarge, 45 min after landing'],
    ],
  },
  {
    node: 'Window',
    name: 'Window',
    summary: 'In front of the pilot’s face. He would not look out of it until the capsule was turned round.',
    detail:
      'An outer pane of Vycor curved to the cone and, behind it in a well, three flat inner panes that hold the ' +
      'cabin’s pressure. Glenn and Carpenter had both turned their capsules round with an eye on the view. ' +
      'Schirra flew the turn on his instruments alone, at four degrees a second, for three tenths of a pound of ' +
      'fuel, and only then looked: the spent Atlas was where it should be, nearly black, with a white band of ' +
      'frost. He tested how well a man can line a capsule up in yaw by what he sees through it, by day against ' +
      'the ground and by night against the stars, with a reticle and without, and concluded that the window was ' +
      'enough. Later he found the Moon and Venus in it and set his attitude by them. The Polaroid filter the last ' +
      'capsule had carried for it was left off; the film the tower’s rocket left on the outside was not, and ' +
      'spoiled the measurements made from his photographs. The panes’ sizes are the drawing’s; where the window ' +
      'stands along the cone is as Liberty Bell 7’s.',
    facts: [
      ['Outer pane', '21.0 in long, 11.25 in to 7.51 in wide, 0.35 in Vycor'],
      ['Inner panes', '12.95 in long, 9.49 in to 7.30 in wide; three'],
      ['Field of view', '30°, by the star charts made for it'],
      ['Polaroid filter', 'removed for this flight'],
      ['After the flight', 'one of its filters broken when the hatch was blown'],
    ],
  },
  {
    node: 'Afterbody',
    name: 'Conical afterbody',
    summary: 'René 41 shingles, a red sigma with a yellow 7 in its mouth, and a patch of white paint with a thermometer under it.',
    detail:
      'Nickel-alloy shingles 0.016 in thick, oxidised blue-black, each stiffened by beads pressed across it and ' +
      'held through oversized holes so that it can grow when hot. Schirra named the capsule for the sign engineers ' +
      'write for a sum, the Greek capital sigma, and the 7 of the seven astronauts: the flight was an engineering ' +
      'test, and the sum was everyone’s work. It was painted under the window, a red sigma edged in cream with a ' +
      'yellow 7 edged in white lying in its mouth. That shingle is kept, its paint scorched, and the outlines here ' +
      'are read off it. UNITED STATES stands on the cone twice, each with a flag under it. Over the first is the ' +
      'paint experiment Aurora 7 had begun and not settled: a white patch with a thermocouple under it and another ' +
      'under the bare shingle beside it. Going up the bare metal ran 410 °F hotter; late in the entry, 110 °F ' +
      'cooler. A second patch, a triangle in three colours, was painted on to see what the entry did to each ' +
      'paint; where it was is in nothing read, and it is not modelled. The periscope’s door is shut, as at ' +
      'liftoff. The shingles and the periscope’s door are laid out as Liberty Bell 7’s.',
    facts: [
      ['Half-angle', '20°'],
      ['Length', '58.4 in (1.48 m)'],
      ['Skin', 'René 41 shingles, 0.016 in'],
      ['Paint', 'the sigma and the 7; UNITED STATES and the flag, twice'],
      ['White patch', 'bare metal 410 °F hotter going up, 110 °F cooler coming down'],
      ['Hottest', '1,184 °F going up, by the heat shield; 975 °F in the entry'],
    ],
    // the periscope as this flight went (vehicles/periscope.ts): played on the clock, where there is one
    clocked: PERISCOPE,
  },
  {
    node: 'CrewCabin',
    name: 'Crew cabin',
    summary: 'A couch, a panel, a camera in a bag, and a suit that would not cool for the first two hours.',
    detail:
      'Two thin titanium skins holding pure oxygen at about 5 psi, and the pilot on a couch moulded to his back: ' +
      'the leg straps were taken out for this flight and small supports put at his knees, heels and toes. Nearly ' +
      'everything changed in here was a switch. One kept the big 24 lbf jets from firing when he flew by wire, so ' +
      'that a slip of the hand cost a puff and not a pound; one let the autopilot hold the capsule level instead ' +
      'of nose-down; the rate gyros now slept in orbit unless he woke them. With these, and by letting the capsule drift, he came ' +
      'to retrofire with four fifths of his fuel. What nearly ended the flight was the suit: its temperature ' +
      'climbed through the first orbit, and he opened the cooling valve half a mark every ten minutes, as he had ' +
      'said he would, until near the mark of 8 it turned. Mercury Control let him go on. In a kit at his right ' +
      'was the hand-held camera, a Hasselblad 500C. Two of the four cabin lights had been taken out to save ' +
      'weight, and fifteen pounds of cooling water put in. The panel is Liberty Bell 7’s drawing with three ' +
      'instruments blanked, as Aurora 7’s; where this capsule’s new switches and gauges stood is in no figure read.',
    facts: [
      ['Structure', 'two skins of 0.010 in titanium'],
      ['Atmosphere', 'pure oxygen, 5.1 psi'],
      ['Camera', 'Hasselblad 500C, 80 mm f/2.8, 70 mm film'],
      ['Put in', 'a high-thruster cutout for fly-by-wire; an attitude-select switch; an oxygen partial-pressure gauge'],
      ['Taken out', 'two of four floodlights; the leg restraints; one command receiver'],
      ['Fuel at retrofire', 'about 80 per cent in each tank, by the pilot’s report'],
    ],
  },
  {
    node: 'HeatShield',
    name: 'Heat shield',
    summary: 'Glass fibre and resin, made to char away. This one lost seventeen pounds and kept its centre plug.',
    detail:
      'From orbit there is too much heat for the slab of beryllium the Redstone capsules came down behind: this ' +
      'shield is glass fibre in resin, and the resin boils off and carries the heat away. It charred a third of ' +
      'an inch deep and lost 17.4 lb, more than any before it. The disc let into its middle, which Aurora 7’s ' +
      'had lost, was bolted in this time and stayed. When the shield was cut up the ablating layer was found ' +
      'cracked through and come unglued from the structure behind it across half the radius; a piece cut from ' +
      'Aurora 7’s shield showed the same, and the makers’ X-rays were tightened for the last flight. It is also ' +
      'the bottom of a cushion: before landing it is unlatched and drops four feet on a skirt of rubberised ' +
      'cloth. In the sea it came back up against the capsule, as it had before, sheared two of its own lugs and ' +
      'dented a fuel line.',
    facts: [
      ['Diameter', '74.5 in (1.89 m)'],
      ['Material', 'glass fibre and resin, ablating'],
      ['Lost in the entry', '17.43 lb; charred 0.3 to 0.35 in'],
      ['Centre plug', 'bolted in for this flight; stayed'],
      ['Found afterwards', 'cracked, and unbonded over half its radius'],
    ],
  },
  {
    node: 'Retropack',
    name: 'Retropack',
    summary: 'Three rockets to come home on, fired by the clock to the second; and a radio aerial 28 feet across, rolled up.',
    detail:
      'Three solid motors of 1,000 lbf, fired five seconds apart, slow the capsule enough to fall out of orbit; ' +
      'three smaller ones had pushed it off the Atlas. Carpenter had fired his by hand, late and askew, and ' +
      'landed 250 miles long. Schirra’s were fired by the capsule’s clock at 8 hours 52 minutes with the ' +
      'autopilot holding the attitude, his thumb over the button in case, and he saw the stars in the window ' +
      '"not even quiver". Sigma 7 came down four miles from the carrier. New on the pack was an aerial for the ' +
      'high-frequency radio: two tapes of beryllium copper on reels, one each side, that a squib let go a minute ' +
      'after the capsule left the Atlas, each curling into a tube fourteen feet long. The pack is striped dark ' +
      'and light, as this capsule’s photographs show it; the motors’ heater blankets were left off to save ' +
      'weight. The aerial is shown rolled up, as launched; its units are drawn from a photograph without a ' +
      'scale, and their places on the pack are estimated.',
    facts: [
      ['Retro motors', '3 × 1,000 lbf, 10 s each'],
      ['Fired', '08:52:00, 08:52:05, 08:52:10: by the clock'],
      ['Posigrade motors', '3 × 400 lbf, 1 s'],
      ['HF dipole', '2 × 14 ft of 5/8 in tape, out at separation + 60 s'],
      ['Jettisoned', '08:53:00'],
    ],
  },
  {
    node: 'AtlasAdapter',
    name: 'Spacecraft adapter',
    summary: 'A ribbed titanium ring between a capsule and a balloon. The first Mercury-Atlas broke here.',
    detail:
      'About four feet of corrugated titanium, slightly tapered, bolted to the tank’s forward ring and holding the ' +
      'capsule by a clamp round its heat shield: three segments drawn tight by three explosive bolts. The ' +
      'retropack hangs down inside it, over a cup that keeps its debris off the oxygen tank’s thin dome. In July ' +
      '1960 the first Mercury-Atlas came apart a minute after launch, somewhere between the top of the tank and ' +
      'this ring; after that the adapter was stiffened and the tank’s forward skins made thicker. For this ' +
      'flight the capsule was made deaf to the Atlas’s engine-cutoff signal until the tower had gone, so that a ' +
      'false one could not release it early. It let go at 5 minutes 17.9 seconds, eleven seconds later than ' +
      'planned, because the Atlas had flown high and burned longer. As built for Atlas 109-D; the band’s red is ' +
      'that flight’s photographs’, and shows in this one’s.',
    facts: [
      ['Length', '50.75 in (1.29 m)'],
      ['Skin', 'corrugated titanium over a titanium inner skin'],
      ['Clamp ring', '3 segments, 3 explosive bolts'],
      ['Capsule released', 'T+5:17.9'],
      ['Stays with', 'the Atlas, into orbit'],
    ],
  },
  {
    node: 'AtlasSustainer',
    name: 'Sustainer engine',
    summary: 'One engine on the centreline, alight from the pad to orbit: ten seconds longer than planned.',
    detail:
      'A single chamber of 57,000 lbf hung on a gimbal from the point of the fuel tank’s cone. It is lit on the ' +
      'ground with the boosters and burns on alone after they go until the guidance computer on the ground has ' +
      'the speed it wants. This Atlas climbed a little steeply at first, dropped its boosters two seconds early, ' +
      'and the sustainer made it up: it burned to 5 minutes 15.7 seconds and left the capsule 15 ft/s fast, which ' +
      'raised the far side of the orbit by 8.6 nautical miles, to the highest any Mercury flew. The radar that ' +
      'steered it was noisy through the last twenty seconds, five times noisier than on the two flights before, ' +
      'and the figures in the control centre scattered; they still said go. When it stopped there were 520 lb of ' +
      'oxygen and 115 lb of fuel left. Its place is scaled off a small drawing; its form is representative.',
    facts: [
      ['Thrust', '57,000 lbf (254 kN)'],
      ['Gimbal', '3° in pitch and yaw'],
      ['Cutoff', 'T+5:15.7, at 25,730 ft/s: 15 ft/s over'],
      ['Left in the tanks', '520 lb of oxygen, 115 lb of fuel'],
      ['Pumps', 'its own; they feed the verniers too'],
    ],
  },
  {
    node: 'AtlasVerniers',
    name: 'Vernier engines',
    summary: 'Two small engines on the tank’s sides: they roll it. At liftoff they had to stop it rolling.',
    detail:
      'A single engine on the centreline cannot roll the vehicle, so two chambers of 1,000 lbf stand out from the ' +
      'foot of the tank, square to the equipment pods, each swivelling through 140° one way and 50° the other. ' +
      'As this Atlas left the stand it rolled clockwise: the two booster engines were out of line with each ' +
      'other by about a fifth of a degree and the gas generator’s exhaust pushed the same way. The films show ' +
      'the verniers swinging hard against it, and it was over within seconds. From one of them the oxygen ' +
      'tank’s pressurisation line runs up the outside of the tank to its top. The vehicle’s number, 113 D, is ' +
      'painted across the other, as the photographs of this liftoff show it. On a missile they burn on after the ' +
      'sustainer to trim the speed; on Mercury they do not.',
    facts: [
      ['Thrust', '1,000 lbf each (4.4 kN)'],
      ['Swivel', '140° in pitch, 50° in yaw'],
      ['Roll at liftoff', '2.52° at most, 7.83°/s at its peak'],
      ['Number', '113 D, either side of the fairing above one'],
      ['Fed by', 'the sustainer’s pumps'],
    ],
  },
  {
    node: 'AtlasPods',
    name: 'Equipment pods',
    summary: 'What cannot go inside a balloon rides outside it.',
    detail:
      'The tank has no frames to hang anything on, so the electronics ride in fairings on its skin: a long pod on ' +
      'one side, a short one opposite, each standing over a booster engine. Guidance, the autopilot, telemetry and ' +
      'the range safety receivers are here, and Mercury’s own addition, the abort sensing system. For this ' +
      'vehicle the range safety receivers were rewired so that a flicker of power as the vehicle went onto its ' +
      'own batteries could not be taken for the order to destroy it, and the lines the abort system sensed the ' +
      'engines’ hydraulics through, which had frozen on Aurora 7’s Atlas, were moved and lagged. The guidance ' +
      'radar on the ground took hold of it 64 seconds up. Their outlines are scaled off a small drawing and the ' +
      'photographs of Atlas 109-D; what is in which pod is not established.',
    facts: [
      ['Pods', 'a long one and a short one, opposite'],
      ['Range safety receivers', 'rewired against a false destruct'],
      ['Guidance', 'radio, locked on from T+64 s to 20 s past cutoff'],
      ['Stay with', 'the tank, when the booster section goes'],
    ],
  },
  {
    node: 'AtlasTank',
    name: 'Tank section',
    summary: 'A stainless steel balloon ten feet across, thinner than a coin. Schirra looked down its engine from orbit.',
    detail:
      'The Atlas has no skeleton. Its body is one welded tank of stainless steel between 0.048 and 0.015 inch ' +
      'thick, liquid oxygen above a bulkhead and kerosene below, and it stands up only because it is kept blown ' +
      'up. Earlier vehicles carried insulation under that bulkhead, held by a second, lighter one; on Glenn’s it ' +
      'had soaked up fuel and was cut out on the pad, and this vehicle was the first built without it. Because ' +
      'it was not to be held down, 112 gallons of fuel were taken off before launch, the weight the two seconds ' +
      'of waiting would have burned: with full tanks and no wait, the pressures might have set the bulkhead ' +
      'ringing as it left. At launch the oxygen tank is white with frost from the adapter down to the bulkhead, ' +
      'which hid UNITED STATES on its side; the model shows both. Empty, it followed Sigma 7 into orbit, and ' +
      'Schirra tracked it down across his window: nearly black, he said, not silver, with "a white belly band" ' +
      'of frost, turned end for end so that he looked into its engine.',
    facts: [
      ['Diameter', '10 ft (3.05 m); about 70 in at the top'],
      ['Skin', 'stainless steel, 0.048 in to 0.015 in'],
      ['Held up by', 'its own pressure'],
      ['Insulation bulkhead', 'none: left out at the factory'],
      ['Fuel taken off', '112 gallons, for want of a hold-down'],
      ['Marked', 'UNITED STATES; 113 D'],
    ],
  },
  {
    node: 'AtlasBoosterSection',
    name: 'Booster section',
    summary: 'The half of a stage and a half: it is dropped two minutes up, with both booster engines in it.',
    detail:
      'The Atlas lights all its engines on the ground, where a failure to start can still be shut down, and then ' +
      'throws most of them away. This is what goes: a skirt round the foot of the tank carrying the two booster ' +
      'engines, their pumps and a fairing over each. It hangs from the tank’s thrust ring on a latch; at booster ' +
      'cutoff the latch lets go and the section slides off aft on tracks, over the sustainer engine, which burns ' +
      'on. On this flight the Atlas flew a little high, the ground’s computer called the cutoff 2.2 seconds ' +
      'early, at 128.6 seconds; the timer that would have dropped the section had the call not come was set for ' +
      '132.3 seconds. Schirra saw "the flashback of smoke" as it went. Its form is ' +
      'as built for Atlas 109-D, from the report’s drawings and photographs.',
    facts: [
      ['Width across the fairings', '16 ft (4.9 m)'],
      ['Booster engine cutoff', 'T+2:08.6, 2.2 s early'],
      ['Staging backup timer', '132.3 s'],
      ['Held by', 'a latch at the tank’s thrust ring'],
      ['Leaves on', 'jettison tracks, sliding aft'],
    ],
  },
  {
    node: 'AtlasBoosterEngines',
    name: 'Booster engines',
    summary: 'Two chambers of 154,000 lbf each, with new injectors: the first Mercury Atlas let go the moment it was alight.',
    detail:
      'Rocketdyne’s MA-2 engine group has three main chambers and two small ones, all burning kerosene and liquid ' +
      'oxygen and all lit on the pad. These are the two outboard chambers, each on a gimbal that swivels five ' +
      'degrees, fed by a pair of turbopumps that one gas generator drives. A chamber this size can burn rough, ' +
      'and every Mercury Atlas before this one was held down for two or three seconds with its engines burning ' +
      'while instruments listened for it. Atlas 113-D’s booster engines had injectors with baffles across the ' +
      'face, which break such a wave up, and igniters that light on contact with liquid oxygen in place of ' +
      'pyrotechnic ones; the rough-combustion cutoff was taken out and the hold-down with it. The baffles are in ' +
      'the model, up each booster engine’s throat, where only an eye under the engines can find them. The ' +
      'chambers’ places are scaled off a small drawing; their form, and the pumps’, are representative; the ' +
      'baffles are counted off the report’s sketch.',
    facts: [
      ['Thrust', '154,000 lbf each (685 kN)'],
      ['Propellants', 'RP-1 kerosene and liquid oxygen'],
      ['Injectors', 'baffled, from this vehicle on'],
      ['Igniters', 'hypergolic, in place of pyrotechnic'],
      ['Held down', 'not at all: released as soon as the engines were up'],
      ['Burn', 'ignition to T+2:08.6'],
    ],
  },
];

const vehicle = mercuryAtlasStack({
  // on the stand at Complex 14, the hatch on 240 degrees true, as every Mercury-Atlas stood (lc-14.parts.ts)
  stand: { over: LAUNCHER_TOP, rotationY: STAND_TURN },
  flight: 'ma-8-sigma-7',
  parts: mercuryAtlasParts('ma-8-sigma-7', parts),
  // the periscope as it went on this flight (vehicles/periscope.ts)
  mechanisms: [periscopeMechanism(PERISCOPE_EVENTS)],
  views: [
    VIEW.stack,
    VIEW.spacecraft,
    VIEW.capsule,
    VIEW.painted('emblem', 'Emblem'),
    { id: 'panels', label: 'Ablation panels', nodes: ['RecoveryCompartment'], from: along(HATCH_AZ + 30, 0.25) },
    VIEW.hatch,
    VIEW.periscope,
    { id: 'retropack', label: 'Retropack', nodes: ['Retropack'], from: along(WINDOW_AZ + 10, -0.25) },
    VIEW.adapter,
    VIEW.pod,
    VIEW.booster,
    VIEW.engines,
  ],
  // the couch as somewhere to sit, and its cabin (../../vehicles/cabin.ts: from the model's own nodes)
  cabin: mercuryCabin({
    window: 'Window',
    periscope: {
      about:
        'An 8 in screen of the Earth under the capsule, through a wide-angle objective in the cone below the pilot’s feet. Click to look into it, and again for high power.',
      at: OBJECTIVE_OUT,
    },
  }),
});

export const flight: Flight = {
  id: 'usa/mercury/ma-8-sigma-7',
  nation: 'USA',
  agency: 'NASA',
  program: 'Project Mercury',
  designation: 'Mercury-Atlas 8',
  callsign: 'Sigma 7',
  spacecraft: 'Mercury spacecraft No. 16 (McDonnell Aircraft)',
  launchVehicle: 'Mercury-Atlas, Atlas 113-D (Convair)',
  // 12:15:11 UTC: "Launch occurred at 07:15:11 a. m. e. s. t." (NASA TN D-4807, p. 25); "Lift-off time for the MA-8
  // mission was 07:15:11.84 a. m." (p. 3, where the range zero it then gives, 07:45:16.00, is MA-7's, left in by mistake)
  launch: '1962-10-03T12:15:11Z',
  launchSite: LC14.name,
  site: LC14,
  weather: WEATHER,
  crew: ['Walter M. Schirra, Jr.'],
  summary:
    'The third American in orbit, and the one who made it look easy: six times round in 9 hours 13 minutes, ' +
    'drifting for hours with the jets off to show how little fuel a careful pilot needs, retrofire by the clock, ' +
    'and a landing in the Pacific four miles from the carrier. Schirra called it a textbook flight, and stayed in ' +
    'his capsule until it stood on her deck.',
  facts: [
    { label: 'Liftoff', value: '3 October 1962, 12:15:11 UTC' },
    { label: 'Pilot', value: 'Walter M. Schirra, Jr.' },
    { label: 'Duration', value: '9 h 13 min 11 s' },
    { label: 'Orbits', value: '6' },
    { label: 'Orbit', value: '161 km by 283 km, 32.55°' },
    { label: 'Period', value: '88 min 55 s' },
    { label: 'Speed at cutoff', value: '28,233 km/h' },
    { label: 'Peak load', value: '8.1 g going up; 7.6 g coming down' },
    { label: 'Landing', value: 'the Pacific, north-east of Midway, 4 nautical miles from the carrier' },
    { label: 'Recovery', value: 'capsule and pilot together, by USS Kearsarge, 40 minutes after landing' },
  ],
  // NASA TN D-4807, Table XXII (p. 134) for the events; NASA SP-12's air-ground transcript (pp. 57 to 119) for what
  // was said and when; the dipole antenna from TN D-4807, p. 8
  timeline: [
    { t: 0, event: 'Liftoff, 07:15:11 EST: no hold-down; a clockwise roll, stopped by the verniers' },
    { t: 128.6, event: 'Booster engine cutoff; the booster section is dropped' },
    { t: 153, event: 'Escape tower released' },
    { t: 315.7, event: 'Sustainer engine cutoff: 25,730 ft/s' },
    { t: 317.9, event: 'Spacecraft separation: posigrade rockets fire; Schirra turns the capsule round on instruments' },
    { t: 377.9, event: 'The HF dipole antenna is let out from the retropack' },
    { t: 430, event: 'Into the autopilot’s orbit mode, the Atlas in the window' },
    { t: 6600, event: 'Suit cooling valve back from 8 to 3 at Mercury Control’s request; the temperature rises again' },
    { t: 31890, event: 'Retrofire sequence begun by the clock' },
    { t: 31920, event: 'Retrofire: three motors, five seconds apart' },
    { t: 31980, event: 'Retropack dropped' },
    { t: 32010, event: '"The scope is coming in"' },
    { t: 32500, event: '0.05 g' },
    { t: 32810, event: 'Drogue parachute, by hand, at 39,400 ft' },
    { t: 32892, event: 'Main parachute, at 10,600 ft' },
    { t: 33191, event: 'Landing, 32°06′ N 174°28′ W' },
  ],
  specs: [
    ...PAD_SPECS,
    SPEC.heatShield,
    CAPSULE_SPEC.afterbodyHalfAngle,
    SPEC.capsuleLength,
    SPEC.towerLength,
    {
      group: 'Spacecraft',
      label: 'Weight at launch',
      value: 4324.55 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `4,324.55 lb (${REPORT}, Table I, p. 14): 80 lb more than Aurora 7`,
    },
    {
      group: 'Spacecraft',
      label: 'Weight in orbit',
      value: 3028.89 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: '3,028.89 lb in orbit; 2,732.50 lb at a normal entry; 2,602.32 lb at main parachute deployment; 2,441.43 lb afloat (the same table)',
    },
    {
      group: 'Spacecraft',
      label: 'Ablation panel, length',
      value: 15 * IN,
      unit: 'm',
      confidence: 'documented',
      note: `15 in long and 5 in wide, centred on its shingle, from the junction of cone and cylinder (${REPORT}, p. 75; NASA SP-12, p. 10); nine of them. Modelled 0.3 in thick, which is estimated`,
    },
    {
      group: 'Spacecraft',
      label: 'HF dipole element, extended',
      value: 14 * FT,
      unit: 'm',
      confidence: 'documented',
      note: `14 ft each side, 5/8 in in diameter, of beryllium copper tape (${REPORT}, p. 61). Modelled rolled up, as launched`,
    },
    CAPSULE_SPEC.windowPane,
    {
      group: 'Spacecraft',
      label: 'Window, middle of the outer pane above the widest plane',
      value: 31.5 * IN,
      unit: 'm',
      confidence: 'estimated',
      note: '31.5 in, give or take 1.5: as Nos. 13 and 20, on which it was measured from photographs (NASM A19670176000, NASA S63-07701); no document read gives it. This capsule’s own (NASA S62-06175) cannot be measured: it hangs tilted toward the camera. Until November 2026 the model had 35.8',
    },
    {
      group: 'Spacecraft',
      label: 'Hatch bolts',
      value: 70,
      unit: 'bolts',
      confidence: 'documented',
      note: 'seventy, as the hatch was made; "every bolt sank neatly in its threads" (This New Ocean, p. 472)',
    },
    {
      group: 'Spacecraft',
      label: 'Perigee',
      value: 86.97 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `86.97 nautical miles (${REPORT}, Table XXIII, p. 135)`,
    },
    {
      group: 'Spacecraft',
      label: 'Apogee',
      value: 152.8 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: '152.8 nautical miles, 8.6 more than planned (the same table)',
    },
    {
      group: 'Spacecraft',
      label: 'Period',
      value: 88 * 60 + 55,
      unit: 's',
      confidence: 'documented',
      note: '88 min 55 s (the same table)',
    },
    {
      group: 'Spacecraft',
      label: 'Inclination',
      value: 32.55,
      unit: 'deg',
      confidence: 'documented',
      note: 'the same table',
    },
    {
      group: 'Spacecraft',
      label: 'Velocity at cutoff',
      value: 25730 * FT,
      unit: 'm/s',
      confidence: 'documented',
      note: '25,730 ft/s, space-fixed, at 528,467 ft, the flight path 0.0062° below level; 25,751 ft/s after the posigrade rockets (the same table)',
    },
    {
      group: 'Spacecraft',
      label: 'Greatest load',
      value: 8.1,
      unit: 'g',
      confidence: 'documented',
      note: '8.1 g on the way up and 7.6 g in the entry (the same table)',
    },
    {
      group: 'Spacecraft',
      label: 'Greatest dynamic pressure going up',
      value: 964 * 47.880259,
      unit: 'Pa',
      confidence: 'documented',
      note: '964 lb/sq ft; 458 lb/sq ft in the entry (the same table)',
    },
    {
      group: 'Spacecraft',
      label: 'Duration, liftoff to landing',
      value: 9 * 3600 + 13 * 60 + 11,
      unit: 's',
      confidence: 'documented',
      note: '09:13:11, to the main parachute’s jettison at the water (the same report, Table XXII, p. 134)',
    },
    {
      group: 'Launch vehicle',
      label: 'Height on the pad',
      value: 95 * FT + 4 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '95 ft 4 in, engines to the tower’s tip: the figure for Atlas 109-D and capsule 13 (Results of the First United States Manned Orbital Space Flight, Figure 4-11, p. 49), which this vehicle "underwent no major modifications" from (NASA TN D-4807, p. 12); model: 29.067 m (1,144.36 in, by SEDR 104’s stations)',
    },
    SPEC.atlasLength,
    SPEC.tank,
    SPEC.fairings,
    SPEC.adapter,
    SPEC.skin,
    {
      group: 'Launch vehicle',
      label: 'Weight before liquid oxygen',
      value: 151900 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `151,900 lb on the launcher’s weighing system with the fuel aboard and the oxygen not (${REPORT}, p. 105); 324,650 lb read at T-2 min 10 s, the oxygen tank secured`,
    },
    {
      group: 'Launch vehicle',
      label: 'Thrust at liftoff',
      value: 360000 * LBF,
      unit: 'N',
      confidence: 'documented',
      note: '"approximately 360,000 pounds" (Results of the First United States Manned Orbital Space Flight, p. 45: of the Mercury-Atlas, not measured on 113-D); the engines’ ratings in NASA SP-45 (p. 85) add to 367,000 lbf',
    },
    {
      group: 'Launch vehicle',
      label: 'Heading at insertion',
      value: 77.7,
      unit: 'deg',
      confidence: 'documented',
      note: `77.70° east of north, space-fixed, at cutoff (${REPORT}, Table XXIII, p. 135). On the pad the vehicle’s pitch axis lay on 105° (Results of the First United States Manned Orbital Space Flight, p. 46, of the same pad)`,
    },
  ],
  motors: mercuryAtlasMotors({
    booster: {
      burnS: 128.6,
      confidence: 'documented',
      note: `${lb(ATLAS.booster)} lbf each, rated (NASA SP-45, p. 85); the press kit for MA-9 gives 150,000. Cutoff on this flight at 00:02:08.6 (${REPORT}, Table XXII). With baffled injectors and hypergolic igniters, the first so fitted (p. 12). No figure measured on Atlas 113-D has been read`,
    },
    sustainer: {
      burnS: 315.7,
      confidence: 'documented',
      note: `${lb(ATLAS.sustainer)} lbf, rated (NASA SP-45, p. 88); the press kit for MA-9 gives 60,000. Cutoff at 00:05:15.7 (the same table)`,
    },
    verniers: {
      burnS: 315.7,
      confidence: 'documented',
      note: `${lb(ATLAS.vernier)} lbf each (NASA SP-45, p. 88). Mercury’s Atlas had no vernier solo: they stopped with the sustainer`,
    },
    escape: {
      burnS: 1,
      confidence: 'assumed',
      note: `${lb(THRUST.escape)} lb for 1 s, nominal (NASA SP-6, p. 3: the type’s)`,
    },
    jettison: {
      burnS: 1.5,
      confidence: 'assumed',
      note: `${lb(THRUST.towerJettison)} lb for 1.5 s, nominal (the same table)`,
    },
    posigrade: {
      burnS: 1,
      confidence: 'assumed',
      note: `${lb(THRUST.posigrade)} lb for 1 s, nominal (the same table). On the missile these were retrorockets on the Atlas; Mercury moved them to the capsule (NASA SP-45, p. 93)`,
    },
    retrograde: {
      burnS: 10,
      confidence: 'assumed',
      note: `${lb(THRUST.retrograde)} lb for 10 s, nominal (the same table). Fired at 08:52:00, :05 and :10 (${REPORT}, Table XXII); a total impulse of 38,975 lb s is the nominal figure the entry was computed with (p. 108). Their heater blankets were removed for this flight (p. 11)`,
    },
    pitchYaw: {
      confidence: 'documented',
      note: `automatic system (Hammack and Heberlig). For this flight a switch kept them out of fly-by-wire until retrofire, and every thruster’s heat sink was removed (${REPORT}, p. 10)`,
    },
    roll: {
      confidence: 'documented',
      note: 'automatic system (Hammack and Heberlig)',
    },
    low: {
      confidence: 'documented',
      note: `automatic system, all axes (Hammack and Heberlig). What Schirra flew on: "I had no trouble with any of the low thrusters at this time or at subsequent times during the flight" (${REPORT}, p. 98)`,
    },
  }),
  models: [vehicle, pad, crew],
  // the place round the pad: nothing read has it changed since Friendship 7's morning (places/cape-canaveral/lc-14.md, "What stood when")
  surroundings: 'models/usa/places/cape-canaveral/lc14/1962-02.glb',
};

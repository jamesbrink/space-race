import type { Flight, Keyframe, ModelDef, Part } from '../../../../../src/types.ts';
import {
  HARDWARE_WORDS,
  LC14_SPECS,
  lc14Pad,
  lc14Parts,
  lc14Pilot,
  type PadDay,
  type PadStops,
} from '../../../places/cape-canaveral/lc-14.parts.ts';
import { SPEC as CAPSULE_SPEC } from '../../vehicles/mercury-capsule.ts';

/**
 * Launch Complex 14 on the morning of 24 May 1962, as Aurora 7's pad.glb has it (model/pad.py: the place's modules at that
 * date, which build as they did for Friendship 7: nothing read has the pad changed between the two). The hardware is the
 * place's (places/cape-canaveral/lc-14.parts.ts); this is the morning, and the pilot as he stood at the foot of the structure.
 *
 * What the record gives of the morning (NASA TN D-3814, pp. 16 and 17 and Table XI, p. 111; NASA SP-6, Table 5-II, p. 44;
 * This New Ocean, NASA SP-4201, p. 447): up the gantry at 4:36, before dawn, the ground fog round the pad; into the
 * spacecraft at 4:43, at T-135; the hatch going on from T-94 and secured at T-74, its shingles on by T-64; the service
 * tower's "first motion" at T-47 and "stowed" at T-33; liquid oxygen from T-32; held at T-11 for 45 minutes in all for the
 * fog and smoke over the pad and the range's refraction measurements; liftoff at 07:45:16. Every hold of the count was at
 * T-11, so a point of the count before it falls 45 minutes and its minutes of count before liftoff (derived): T-47 at
 * 06:13, with the Sun eight degrees up (src/world), and T-33 at 06:27. How long each thing took on the slider is layout.
 */

const REPORT = 'NASA TN D-3814';
/** Seconds from liftoff (07:45:16 EST, the report's range zero) of a time by the Cape's clocks that morning. */
const est = (h: number, m: number, s = 0): number => h * 3600 + m * 60 + s - (7 * 3600 + 45 * 60 + 16);
/** Seconds from liftoff of a point of the count: every hold, 45 minutes of them, was at T-11 (derived). */
const count = (minutes: number): number => -(minutes + 45) * 60;

const T: PadStops = {
  whiteRoom: 0.04,
  leaves: 0.14,
  roll: 0.3,
  carry: 0.46,
  parked: 0.72,
  umbilical: 0.84,
  liftoff: 0.92,
};

/** The instant the pilot is shown at: at the structure's foot, about to go up. */
export const UP_THE_GANTRY = est(4, 36);
const FIRST_MOTION = count(47);
const STOWED = count(33);

const MORNING: Keyframe[] = [
  {
    at: UP_THE_GANTRY,
    slider: 0,
    event: '04:36: Carpenter goes up the gantry before dawn, the ground fog round the pad',
    confidence: 'documented',
    source:
      `${REPORT}, Table XI (p. 111) and NASA SP-6, Table 5-II (p. 44): "Ascend gantry", 4:36. This New Ocean (p. 447) has 4:35, and ` +
      '"Just before he boarded the elevator he stopped to swap greetings with and to thank the flight support crewmen"',
  },
  {
    at: est(4, 43),
    slider: 0,
    event: '04:43: into the spacecraft',
    confidence: 'documented',
    source: `${REPORT}, Table XI (p. 111): "Astronaut insertion into spacecraft", 4:43; T-135 in the count (p. 17)`,
  },
  {
    at: count(94),
    slider: 0,
    event: 'T-94: the hatch goes on; all seventy bolts go in',
    confidence: 'derived',
    source: `"Spacecraft hatch closure started" at T-94, secured at T-74 (${REPORT}, p. 17: documented); "all 70 bolts were aligned properly" (This New Ocean, p. 447). By the clock: the count less the 45 minutes held at T-11`,
  },
  {
    at: count(64),
    slider: 0,
    event: 'T-64: the shingles over the hatch are on',
    confidence: 'derived',
    source: `${REPORT}, p. 17: "Spacecraft shingle installation complete", T-64 (documented). By the clock as above`,
  },
  {
    at: count(55),
    slider: T.whiteRoom,
    event: 'T-55: the white room is opened',
    confidence: 'assumed',
    source:
      'not recorded for this morning: the standard count clears the service structure at T-55 and moves it away at T-50 (Mercury ' +
      'Spacecraft Pre-Launch Preparations, Part II, pp. 27 and 28, written of this flight’s preparations), taken for it. The white ' +
      'room’s "movable doors, floors, and roof" are opened first (Results of the First United States Manned Orbital Space Flight, p. 48)',
  },
  {
    at: FIRST_MOTION,
    slider: T.roll,
    event: 'T-47: the service structure’s first motion, off the stand',
    confidence: 'derived',
    source: `${REPORT}, p. 17: "Service tower (gantry), first motion", T-47 (documented). By the clock, 06:13: the count less the 45 minutes held at T-11`,
  },
  {
    at: FIRST_MOTION + 4 * 60,
    slider: T.carry,
    event: 'On the transfer table: it starts east',
    confidence: 'estimated',
    source: 'not recorded: about a third of the fourteen minutes from first motion to stowed',
  },
  {
    at: STOWED,
    slider: T.parked,
    event: 'T-33: the structure stands at its parking place, 300 ft east',
    confidence: 'derived',
    source: `${REPORT}, p. 17: "Service tower stowed", T-33 (documented); 06:27 by the clock, as above`,
  },
  {
    at: count(11),
    slider: T.parked,
    event: 'T-11: held for the fog and smoke, 45 minutes in all',
    confidence: 'derived',
    source:
      `${REPORT}, p. 17: at T-11, a hold of 15 minutes "for weather (launch-area smoke and ground fog)", extended 15 minutes for it, ` +
      '10 for "evaluation of atmospheric-refraction data" and 5 to complete it (documented); 06:49 to 07:34 by the clock. "By 7:30 ' +
      'a.m. e.s.t., conditions had improved considerably"',
  },
  {
    at: -35.01,
    slider: T.umbilical,
    event: 'T-35 s: the capsule’s umbilical is ejected; its boom swings clear',
    confidence: 'assumed',
    source:
      `that it went, and the periscope in after it: "umbilical ejection, periscope retraction and umbilical-door closure" are in the ` +
      `pad cameras' film (${REPORT}, p. 18). When is not given for this flight: Mercury-Atlas 6's T-35 seconds (Results of the First ` +
      'United States Manned Orbital Space Flight, p. 67), taken. That the boom swung clear is estimated, as for Friendship 7',
  },
  {
    at: -30,
    slider: T.umbilical + 0.03,
    event: 'The boom is clear',
    confidence: 'estimated',
    source: 'not recorded',
  },
  {
    at: 0,
    slider: T.liftoff,
    event: 'Liftoff, 07:45:16 EST: the launcher’s arms let go',
    confidence: 'documented',
    source: `${REPORT}, p. 3: lift-off at 07:45:16.57 a.m. e.s.t., times counted from 07:45:16.00. The engines burned 2.95 seconds before the vehicle was released (p. 98)`,
  },
  { at: 12, slider: 1, event: 'The vehicle has gone', confidence: 'estimated', source: 'layout: the slider’s end' },
];

const WORDS: PadDay['words'] = {
  ...HARDWARE_WORDS,
  ServiceStructure: {
    summary: 'The red tower that stood over the Atlas until T−47, an hour and a half before liftoff.',
    detail:
      'Two legs on rails either side of the stand, joined over it, with a slot between them the height of the vehicle: an ' +
      'inverted U of box trusses, 154 ft 8 in tall. Seven levels of hinged decks fold down into the slot round the vehicle, ' +
      'two a level (the record’s fourteen movable decks, as read here). At the top, round the capsule, is the white room. ' +
      'Carpenter rode its lift up at 4:36, before dawn, the ground fog lying round the pad, and was in the spacecraft seven ' +
      'minutes later; this time all seventy of the hatch’s bolts went in. To leave, the white room’s roof and floor fold away ' +
      'and its doors slide apart; the structure then rolls north off the stand on to a transfer table, which carries it 300 ft ' +
      'east. Its first motion was at T−47, about 6:13, with the Sun low behind the fog, and it was stowed fourteen minutes ' +
      'later. Only its height, its decks and how it left are published: its form is scaled off photographs.',
    facts: [
      ['Height', '154 ft 8 in (HAER FL-8-7); 145 ft by the NHL nomination'],
      ['Decks', '14 movable: seven levels of two leaves (as read here)'],
      ['White room', 'in the upper two decks: sliding doors, folding roof and floor'],
      ['Moved away', 'first motion T−47, stowed T−33 (TN D-3814, p. 17); then 300 ft east on the transfer table'],
      ['Size on the ground', 'about 72 ft by 30 ft (estimated from photographs)'],
    ],
  },
  EgressTower: {
    summary: 'Carries the capsule’s umbilical, and a bridge that could be dropped to the hatch in thirty seconds.',
    detail:
      'The tower beside the vehicle after the service structure has gone. It carries the capsule’s umbilical on a gooseneck ' +
      'boom until it is thrown off, the periscope drawing in and its door shutting after it (the pad’s cameras filmed all ' +
      'three), and the bascule: a gangway hinged at its foot that stands upright through the whole count and can be lowered ' +
      'from the blockhouse in about thirty seconds, its caged end coming to rest beside the hatch. Through the 45 minutes of ' +
      'holds at T−11, while the fog thinned, it was the only thing beside the vehicle. It was never lowered in earnest. Its ' +
      'height is the old mast’s, assumed; the rest is scaled off photographs. Work the bascule by hand from the tower to see ' +
      'it reach the hatch.',
    facts: [
      ['Height', '84 ft 6 in above the stand (the umbilical mast’s, HAER FL-8-7: assumed for this tower)'],
      ['Bascule', 'about 30 ft; lowered in about 30 s by remote control'],
      ['Umbilical ejected', 'filmed (TN D-3814, p. 18); at T−35 s as on Friendship 7 (assumed)'],
      ['Stood', 'by 22 January 1962; taken down for Atlas-Agena in 1964'],
    ],
  },
};

const padParts: Part[] = lc14Parts({ T, words: WORDS });

export const pad: ModelDef = lc14Pad({
  url: 'models/usa/mercury/ma-7-aurora-7/pad.glb',
  slider: ['Up the gantry · 04:36', 'Liftoff · 07:45'],
  sequence: MORNING,
  parts: padParts,
});

const crewParts: Part[] = [
  {
    node: 'Helmet',
    name: 'Helmet',
    summary: 'Fibreglass shell, clear visor, pneumatic seal.',
    detail:
      'The visor closes against an inflatable seal fed from a small pressure bottle. The lead on the chest plugs the ' +
      'helmet’s microphone and earphones into the capsule. Carpenter was thirsty in the holds at T−11 and drank cold tea from ' +
      'a squeeze bottle; in orbit his food, bite-sized pieces in place of Glenn’s tubes, crumbled and drifted round the cabin, ' +
      'and was awkward to get to his mouth round the helmet’s microphones in gloves (This New Ocean, pp. 447 and 449).',
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Torso',
    name: 'Torso',
    summary: 'Aluminised nylon over a rubber-coated bladder.',
    detail:
      'The Navy Mark IV suit by B.F. Goodrich as reworked for Mercury, tailored to the man. Oxygen enters at the waist, cools ' +
      'him and is breathed; on this flight it ran hot, and he was a long time finding a setting that cooled it. On ' +
      'the chest is the convex mirror he tried to watch the Atlas’s programme in, and under it the life vest first carried by ' +
      'Glenn; at the neck ring is a rubber neck dam, rolled and stowed, to be pulled up in the water. He forgot it, and the suit ' +
      'took in sea water. The figure is the suit as modelled for Shepard with Carpenter’s name and what the record gives of ' +
      'his: his own measures have not been found.',
    facts: [
      ['Suit', 'Navy Mark IV, B.F. Goodrich'],
      ['Chest mirror', 'yes (This New Ocean, p. 447)'],
      ['Neck dam', 'yes, stowed (TN D-3814, pp. 77 and 96)'],
      ['Weight that morning', '154 lb, the man, at 2:05 (NASA SP-6, Table 5-III)'],
    ],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Arms',
    name: 'Arms',
    summary: 'Laced to length, with restraint cords at the joints.',
    detail:
      'Cords and lacing along each arm stop the sleeve ballooning under pressure and set its length to the man. For this flight ' +
      'pockets were added on the upper sleeves, for pencils, a handkerchief and the like (This New Ocean, p. 445); they are not ' +
      'modelled.',
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Gloves',
    name: 'Gloves',
    summary: 'Locked to the sleeves on rings at the wrists.',
    detail:
      'Each glove joins its sleeve at a ring that turns on ball bearings, so the wrist can twist under pressure: they are on his ' +
      'wrists at the hatch that morning (NASA S62-03907).',
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Legs',
    name: 'Legs',
    summary: 'Tailored and laced, with pockets on the shins.',
    detail:
      'Each suit was tailored to its pilot and laced snug. Pockets were added on the lower legs for this flight; they are not ' +
      'modelled. In the raft after landing he cut a hole in the rubber sock of the suit’s left foot to let the sea water out.',
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Boots',
    name: 'Boots',
    summary: 'Worn over the suit’s feet.',
    detail: 'The model has the laced leather boots of the suborbital flights: what Carpenter’s were like has not been read.',
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Ventilator',
    name: 'Portable ventilator',
    summary: 'Cools the sealed suit from the van to the capsule.',
    detail:
      'A sealed suit cannot shed heat, so from the suiting room to the spacecraft the pilot carries his own air-conditioning: ' +
      'a blower and cooler in a case, plugged into the suit’s inlet at the waist. At the capsule the hose comes off and the ' +
      'spacecraft’s system takes over.',
    explode: [0, 0, 0],
    order: 0,
  },
];

export const crew: ModelDef = lc14Pilot({
  url: 'models/usa/mercury/ma-7-aurora-7/crew.glb',
  scale: 'M. Scott Carpenter · suited · to scale',
  parts: crewParts,
  at: UP_THE_GANTRY,
});

/** The flight's figures for the pad and the pilot: his own, the suit's, and the place's (lc-14.parts.ts `LC14_SPECS`). */
export const PAD_SPECS: Flight['specs'] = [
  {
    group: 'Pressure suit',
    label: 'Pilot’s weight, 2:05 that morning',
    value: 154 * 0.45359237,
    unit: 'kg',
    confidence: 'documented',
    note: '154 lb nude; 148 lb aboard the carrier that evening, on another scale (NASA SP-6, Table 5-III, p. 46)',
  },
  CAPSULE_SPEC.suitPressure,
  ...LC14_SPECS,
];

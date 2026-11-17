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
 * Launch Complex 14 on the morning of 3 October 1962, as Sigma 7's pad.glb has it (model/pad.py: the place's modules at that
 * date, which build as they did for Friendship 7 and Aurora 7: nothing read has the pad changed). The hardware is the
 * place's (places/cape-canaveral/lc-14.parts.ts); this is the morning, and the pilot as he stood at the foot of the
 * structure.
 *
 * What the record gives of the morning (NASA TN D-4807, pp. 25 and 26 and Table X; This New Ocean, NASA SP-4201, p. 471):
 * up the gantry at 4:37 in the dark, met at the van by the Convair crew's "On behalf of the crew of Pad 14"; into the
 * spacecraft at 4:41, at T-140; the hatch going on from T-108 and secured at T-96, its shingles on by T-88; the service
 * tower's "removal started" at T-64; one hold, of 15 minutes at T-45, for the Canary Islands radar; liquid oxygen from
 * T-38; liftoff at 07:15:11. The one hold being at T-45, a point of the count between T-140 and it falls 15 minutes and
 * its minutes of count before liftoff (derived): T-64 at 05:56, with the Sun five degrees under the horizon (src/world).
 * When the structure was stowed is not given. How long each thing took on the slider is layout.
 */

const REPORT = 'NASA TN D-4807';
/** Seconds from liftoff (07:15:11 EST) of a time by the Cape's clocks that morning. */
const est = (h: number, m: number, s = 0): number => h * 3600 + m * 60 + s - (7 * 3600 + 15 * 60 + 11);
/** Seconds from liftoff of a point of the count between T-140 and T-45: the one hold, 15 minutes, was at T-45 (derived). */
const count = (minutes: number): number => -(minutes + 15) * 60;

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
export const UP_THE_GANTRY = est(4, 37);
const REMOVAL = count(64);
const STOWED = REMOVAL + 14 * 60;

const MORNING: Keyframe[] = [
  {
    at: UP_THE_GANTRY,
    slider: 0,
    event: '04:37: Schirra goes up the gantry in the dark, Cooper beside him',
    confidence: 'documented',
    source:
      `${REPORT}, Table X: "Ascend gantry", 4:37 a.m. e.s.t. This New Ocean, pp. 471 and 484: Byron MacNabb of Convair met him "On ` +
      'behalf of the crew of Pad 14"; "Schirra boarded the elevator and moved up the gantry"; "Schirra, assisted by Cooper, heads for ' +
      'elevator that will carry them to the top of Gantry 14"',
  },
  {
    at: est(4, 41),
    slider: 0,
    event: '04:41: into the spacecraft',
    confidence: 'documented',
    source: `${REPORT}, Table X: "Insertion", 4:41, at T-140 (p. 25); This New Ocean, p. 471`,
  },
  {
    at: count(108),
    slider: 0,
    event: 'T-108: the hatch goes on',
    confidence: 'derived',
    source: `"Spacecraft hatch closure started", T-108; secured at T-96 (${REPORT}, p. 25: documented). By the clock: the count less the 15 minutes held at T-45`,
  },
  {
    at: count(88),
    slider: 0,
    event: 'T-88: the shingles over the hatch are on',
    confidence: 'derived',
    source: `${REPORT}, p. 26: "Spacecraft shingle installation complete", T-88 (documented). By the clock as above`,
  },
  {
    at: count(69),
    slider: T.whiteRoom,
    event: 'The white room is opened',
    confidence: 'assumed',
    source:
      'not recorded: five minutes before the structure moved, as the standard count clears it at T-55 and moves it at T-50 (Mercury ' +
      'Spacecraft Pre-Launch Preparations, Part II, pp. 27 and 28), taken for this morning',
  },
  {
    at: REMOVAL,
    slider: T.roll,
    event: 'T-64: the service structure starts off the stand, before sunrise',
    confidence: 'derived',
    source: `${REPORT}, p. 26: "Service tower (gantry) removal started", T-64 (documented). By the clock, 05:56: the count less the 15 minutes held at T-45`,
  },
  {
    at: REMOVAL + 4 * 60,
    slider: T.carry,
    event: 'On the transfer table: it starts east',
    confidence: 'estimated',
    source: 'not recorded: a third of the fourteen minutes taken for the whole move',
  },
  {
    at: STOWED,
    slider: T.parked,
    event: 'The structure stands at its parking place, 300 ft east',
    confidence: 'assumed',
    source: 'not recorded for this flight: fourteen minutes from first motion to stowed, Mercury-Atlas 7’s (NASA TN D-3814, p. 17)',
  },
  {
    at: count(45),
    slider: T.parked,
    event: 'T-45: held 15 minutes for the Canary Islands radar',
    confidence: 'derived',
    source: `${REPORT}, p. 26: "Hold to repair Canary Islands radar", T-45, "one hold of 15-minute duration" (p. 25: documented); 06:15 by the clock`,
  },
  {
    at: -35.01,
    slider: T.umbilical,
    event: 'T-35 s: the capsule’s umbilical is ejected; its boom swings clear',
    confidence: 'assumed',
    source:
      `that it went, and the periscope in after it: two fixed cameras "indicated ... umbilical disconnect, periscope retraction, and ` +
      `umbilical-door closure" (${REPORT}, p. 28). When is not given for this flight: Mercury-Atlas 6’s T-35 seconds (Results of the ` +
      'First United States Manned Orbital Space Flight, p. 67), taken. That the boom swung clear is estimated, as for Friendship 7',
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
    event: 'Liftoff, 07:15:11 EST: the launcher’s arms let go, with no hold-down delay',
    confidence: 'documented',
    source:
      `${REPORT}, p. 25: launch at 07:15:11 a.m. e.s.t.; p. 12: "No hold-down delay was programed between main-engine completion and ` +
      'start of the release sequence", for the new baffled injectors',
  },
  { at: 12, slider: 1, event: 'The vehicle has gone', confidence: 'estimated', source: 'layout: the slider’s end' },
];

const WORDS: PadDay['words'] = {
  ...HARDWARE_WORDS,
  ServiceStructure: {
    summary: 'The red tower that stood over the Atlas until an hour and twenty minutes before launch.',
    detail:
      'Two legs on rails either side of the stand, joined over it, with a slot between them the height of the vehicle: an ' +
      'inverted U of box trusses, 154 ft 8 in tall. Seven levels of hinged decks fold down into the slot round the vehicle, ' +
      'two a level (the record’s fourteen movable decks, as read here). At the top, round the capsule, is the white room. ' +
      'Schirra came to it in the dark, the structure lit up as a "flood-lit spire" from the road, and rode its lift up at 4:37 ' +
      'with Cooper, his backup, beside him. To leave, the white room’s roof and floor fold away and its doors slide apart; the ' +
      'structure then rolls north off the stand on to a transfer table, which carries it 300 ft east. Its removal started at ' +
      'T−64, about 5:56, before the Sun was up. Only its height, its decks and how it left are published: its form is scaled ' +
      'off photographs.',
    facts: [
      ['Height', '154 ft 8 in (HAER FL-8-7); 145 ft by the NHL nomination'],
      ['Decks', '14 movable: seven levels of two leaves (as read here)'],
      ['White room', 'in the upper two decks: sliding doors, folding roof and floor'],
      ['Moved away', 'from T−64 (TN D-4807, p. 26); then 300 ft east on the transfer table'],
      ['Size on the ground', 'about 72 ft by 30 ft (estimated from photographs)'],
    ],
  },
  EgressTower: {
    summary: 'Carries the capsule’s umbilical, and a bridge that could be dropped to the hatch in thirty seconds.',
    detail:
      'The tower beside the vehicle after the service structure has gone. It carries the capsule’s umbilical on a gooseneck ' +
      'boom until it is thrown off, the periscope drawing in and its door shutting after it (two fixed cameras filmed all ' +
      'three), and the bascule: a gangway hinged at its foot that stands upright through the whole count and can be lowered ' +
      'from the blockhouse in about thirty seconds, its caged end coming to rest beside the hatch. It was never lowered in ' +
      'earnest. Its height is the old mast’s, assumed; the rest is scaled off photographs. Work the bascule by hand from the ' +
      'tower to see it reach the hatch.',
    facts: [
      ['Height', '84 ft 6 in above the stand (the umbilical mast’s, HAER FL-8-7: assumed for this tower)'],
      ['Bascule', 'about 30 ft; lowered in about 30 s by remote control'],
      ['Umbilical ejected', 'filmed (TN D-4807, p. 28); at T−35 s as on Friendship 7 (assumed)'],
      ['Stood', 'by 22 January 1962; taken down for Atlas-Agena in 1964'],
    ],
  },
};

const padParts: Part[] = lc14Parts({ T, words: WORDS });

export const pad: ModelDef = lc14Pad({
  url: 'models/usa/mercury/ma-8-sigma-7/pad.glb',
  slider: ['Up the gantry · 04:37', 'Liftoff · 07:15'],
  sequence: MORNING,
  parts: padParts,
});

const crewParts: Part[] = [
  {
    node: 'Helmet',
    name: 'Helmet',
    summary: 'Fibreglass shell, clear visor, pneumatic seal.',
    detail:
      'The visor closes against an inflatable seal fed from a small pressure bottle. For this flight the helmet had smaller ' +
      'microphones (TN D-4807, p. 11). In orbit Schirra opened it to drink and to wipe the microphones, and once "just for a ' +
      'moment to scratch my nose" (NASA SP-12, the air-ground transcript, 02:48:39).',
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Torso',
    name: 'Torso',
    summary: 'Aluminised nylon over a rubber-coated bladder.',
    detail:
      'The Navy Mark IV suit by B.F. Goodrich as reworked for Mercury, tailored to the man. Oxygen enters at the waist, cools ' +
      'him and is breathed. On this flight it ran warm for the first two hours while Schirra turned its valve up half a mark ' +
      'at a time, and was cool from then on: "the first manned orbital mission during which positive control of the suit ' +
      'temperature was demonstrated" (TN D-4807). The figure is the suit as modelled for Shepard with Schirra’s name: his own ' +
      'measures have not been found.',
    facts: [
      ['Suit', 'Navy Mark IV, B.F. Goodrich'],
      ['Weight that morning', '176¾ lb, the man, at 2:46 (NASA SP-12, Table 3-IV)'],
    ],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Arms',
    name: 'Arms',
    summary: 'Laced to length, with restraint cords at the joints.',
    detail: 'Cords and lacing along each arm stop the sleeve ballooning under pressure and set its length to the man.',
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Gloves',
    name: 'Gloves',
    summary: 'Locked to the sleeves on rings at the wrists, with lights at the fingertips.',
    detail:
      'Each glove joins its sleeve at a ring that turns on ball bearings, so the wrist can twist under pressure. Schirra’s had ' +
      'small lights at the fingertips for reading on the night side ("I’m using my fingertip lights liberally"); the left ' +
      'index finger’s "finally failed" eight and a half hours up (NASA SP-12, the transcript). The lights are not modelled, and ' +
      'that the gloves had the rings is assumed: Glenn’s, Carpenter’s and Cooper’s did.',
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Legs',
    name: 'Legs',
    summary: 'Tailored and laced.',
    detail:
      'Each suit was tailored to its pilot and laced snug. The biomedical connector is on the right thigh. The leg restraints ' +
      'of the earlier flights were gone from the couch, for knee, heel and toe supports (TN D-4807, p. 12).',
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Boots',
    name: 'Boots',
    summary: 'Worn over the suit’s feet.',
    detail: 'The model has the laced leather boots of the suborbital flights: what Schirra’s were like has not been read.',
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Ventilator',
    name: 'Portable ventilator',
    summary: 'Cools the sealed suit from the van to the capsule.',
    detail:
      'A sealed suit cannot shed heat, so from the suiting room to the spacecraft the pilot carries his own air-conditioning: ' +
      'a blower and cooler in a case, plugged into the suit’s inlet at the waist ("carrying his portable air conditioner", ' +
      'This New Ocean, p. 471). At the capsule the hose comes off and the spacecraft’s system takes over.',
    explode: [0, 0, 0],
    order: 0,
  },
];

export const crew: ModelDef = lc14Pilot({
  url: 'models/usa/mercury/ma-8-sigma-7/crew.glb',
  scale: 'Walter M. Schirra, Jr. · suited · to scale',
  parts: crewParts,
  at: UP_THE_GANTRY,
});

/** The flight's figures for the pad and the pilot: his own, the suit's, and the place's (lc-14.parts.ts `LC14_SPECS`). */
export const PAD_SPECS: Flight['specs'] = [
  {
    group: 'Pressure suit',
    label: 'Pilot’s weight, 2:46 that morning',
    value: 176.75 * 0.45359237,
    unit: 'kg',
    confidence: 'documented',
    note: '176¾ lb nude; 172¼ lb aboard the carrier that evening (NASA SP-12, Table 3-IV, p. 25; NASA TN D-4807, its table of medical findings)',
  },
  CAPSULE_SPEC.suitPressure,
  ...LC14_SPECS,
];

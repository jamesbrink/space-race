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
 * Launch Complex 14 on the morning of 20 February 1962, as Friendship 7's pad.glb has it (model/pad.py: the place's
 * modules at that date). The hardware is the place's (places/cape-canaveral/lc-14.parts.ts); this is the morning, and the
 * pilot as he stood at the foot of the structure.
 *
 * What the record gives of the morning (Results of the First United States Manned Orbital Space Flight, pp. 48, 67 and
 * 70, and Table 8-II; This New Ocean, pp. 422 to 426): up the gantry at 5:58; into the spacecraft at 6:06; the broken
 * hatch bolt found at 7:10; the count on again at 8:05 from T-60; the service structure "moved away from the flight
 * vehicle approximately 55 minutes prior to launch", after the hatch was on; the umbilical thrown off at T-35 seconds;
 * liftoff at 9:47:39. No time by the clock is given for the structure's removal: it is put at 8:10, five minutes of
 * count after 8:05 (derived), and stowed fourteen minutes later, the interval of Mercury-Atlas 7's morning (assumed).
 * How long each thing took on the slider is layout.
 */

const RESULTS = 'Results of the First United States Manned Orbital Space Flight (NASA MSC, 1962)';
/** Seconds from liftoff (09:47:39 EST) of a time by the Cape's clocks that morning. */
const est = (h: number, m: number, s = 0): number => h * 3600 + m * 60 + s - (9 * 3600 + 47 * 60 + 39);

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
export const UP_THE_GANTRY = est(5, 58);
const REMOVED = est(8, 10);
const STOWED = REMOVED + 14 * 60;

const MORNING: Keyframe[] = [
  {
    at: UP_THE_GANTRY,
    slider: 0,
    event: '05:58: Glenn goes up the gantry as the sky begins to clear',
    confidence: 'documented',
    source: 'This New Ocean (NASA SP-4201), p. 423: he "relaxed comfortably in the van until 5:58, when the sky began to clear"',
  },
  {
    at: est(6, 6),
    slider: 0,
    event: '06:06: into the spacecraft',
    confidence: 'documented',
    source: `${RESULTS}, Table 8-II and Figure 9-2 ("insertion, 6:06 a.m. e.s.t."); This New Ocean has 6:03`,
  },
  {
    at: est(7, 10),
    slider: 0,
    event: '07:10: a hatch bolt is found broken; the hatch comes off again',
    confidence: 'documented',
    source: `This New Ocean, p. 423; ${RESULTS}, p. 70: a hold of 40 minutes at T-60`,
  },
  {
    at: est(8, 5),
    slider: T.whiteRoom,
    event: '08:05: the count on again from T-60; the white room is opened',
    confidence: 'derived',
    source:
      `the count was resumed at 8:05 (This New Ocean, p. 423: documented). That the white room was opened then is derived: its ` +
      `"movable doors, floors, and roof are necessary ... so that the service tower can be moved away" (${RESULTS}, p. 48)`,
  },
  {
    at: REMOVED,
    slider: T.roll,
    event: 'T-55: the service structure starts off the stand',
    confidence: 'derived',
    source:
      `"moved away from the flight vehicle approximately 55 minutes prior to launch" (${RESULTS}, p. 48; p. 67: "From T-90 to T-55 ... ` +
      'the service [structure] was evacuated and moved away"). By the clock: five minutes of count after 8:05 at T-60; no time is given',
  },
  {
    at: REMOVED + 4 * 60,
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
    source:
      'not recorded for this flight: fourteen minutes from first motion to stowed, Mercury-Atlas 7’s (first motion at T-47, stowed at T-33: ' +
      'NASA TN D-3814, p. 17), put after this morning’s T-55',
  },
  {
    at: -35.01,
    slider: T.umbilical,
    event: 'T-35 s: the capsule’s umbilical is ejected; its boom swings clear',
    confidence: 'documented',
    source: `${RESULTS}, p. 67: "At T-35 seconds the spacecraft umbilical was ejected". That the boom was swung clear is estimated: it is gone from over the capsule in the photographs of the liftoff (NASA KSC-62PC-0011)`,
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
    event: 'Liftoff, 09:47:39 EST: the launcher’s arms let go',
    confidence: 'documented',
    source: `${RESULTS}, Appendix A (p. 139): 14:47:39 G.m.t.; HAER FL-8-7, p. 20: the arms "released through air pressure when sufficient thrust built"`,
  },
  { at: 12, slider: 1, event: 'The vehicle has gone', confidence: 'estimated', source: 'layout: the slider’s end' },
];

const WORDS: PadDay['words'] = {
  ...HARDWARE_WORDS,
  ServiceStructure: {
    summary: 'The red tower that stood over the Atlas until fifty-five minutes before launch.',
    detail:
      'Two legs on rails either side of the stand, joined over it, with a slot between them the height of the vehicle: an ' +
      'inverted U of box trusses, 154 ft 8 in tall. Seven levels of hinged decks fold down into the slot round the vehicle, ' +
      'two a level (the record’s fourteen movable decks, as read here). At the top, round the capsule, is the white room: ' +
      'Glenn went up at 5:58, was in the spacecraft at 6:06, and lay there an hour before the hatch was bolted on, one bolt ' +
      'broke and it all came off again. To leave, the white room’s roof and floor fold away and its doors slide apart; the ' +
      'structure then rolls north off the stand on to a transfer table, which carries it 300 ft east. On this morning that ' +
      'was about 8:10, five minutes of count after it was resumed at T−60. Only its height, its decks and how it left are ' +
      'published: its form is scaled off photographs.',
    facts: [
      ['Height', '154 ft 8 in (HAER FL-8-7); 145 ft by the NHL nomination'],
      ['Decks', '14 movable: seven levels of two leaves (as read here)'],
      ['White room', 'in the upper two decks: sliding doors, folding roof and floor'],
      ['Moved away', 'about T−55, by a diesel engine; then 300 ft east on the transfer table'],
      ['Size on the ground', 'about 72 ft by 30 ft (estimated from photographs)'],
    ],
  },
  EgressTower: {
    summary: 'Carries the capsule’s umbilical, and a bridge that could be dropped to the hatch in thirty seconds.',
    detail:
      'The tower beside the vehicle after the service structure has gone. It carries the capsule’s umbilical on a gooseneck ' +
      'boom until T−35 seconds, and the bascule: a gangway hinged at its foot that stands upright through the whole count and ' +
      'can be lowered from the blockhouse in about thirty seconds, its caged end coming to rest beside the hatch, so that the ' +
      'pilot could get out by himself or a crew could go up for him. It was never lowered in earnest. The tapered tower was ' +
      'new for this flight: a straight mast stood here in September 1961. Its height is the old mast’s, assumed; the rest is ' +
      'scaled off photographs. Work the bascule by hand from the tower to see it reach the hatch.',
    facts: [
      ['Height', '84 ft 6 in above the stand (the umbilical mast’s, HAER FL-8-7: assumed for this tower)'],
      ['Bascule', 'about 30 ft; lowered in about 30 s by remote control (Results, p. 48)'],
      ['Umbilical ejected', 'T−35 s'],
      ['Stood', 'by 22 January 1962; taken down for Atlas-Agena in 1964'],
    ],
  },
};

const padParts: Part[] = lc14Parts({ T, words: WORDS });

export const pad: ModelDef = lc14Pad({
  url: 'models/usa/mercury/ma-6-friendship-7/pad.glb',
  slider: ['Up the gantry · 05:58', 'Liftoff · 09:47'],
  sequence: MORNING,
  parts: padParts,
});

const crewParts: Part[] = [
  {
    node: 'Helmet',
    name: 'Helmet',
    summary: 'Fibreglass shell, clear visor, pneumatic seal.',
    detail:
      'The visor closes against an inflatable seal fed from a small pressure bottle. In orbit Glenn opened it to eat: ' +
      'apple sauce from a tube, the first food an American ate in space. The suit stayed soft throughout: the cabin held ' +
      'its pressure, and the suit is the backup.',
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Torso',
    name: 'Torso',
    summary: 'Aluminised nylon over a rubber-coated bladder.',
    detail:
      'The Navy Mark IV suit by B.F. Goodrich as reworked for Mercury, tailored to the man. Oxygen enters at the waist, cools ' +
      'him and is breathed. On the chest is a small convex mirror: the panel camera, looking at his face, saw the ' +
      'instruments in it. The figure is the suit as modelled for Shepard with Glenn’s name and what the record gives of ' +
      'his: his own measures have not been found.',
    facts: [
      ['Suit', 'Navy Mark IV, B.F. Goodrich'],
      ['Chest mirror', 'yes (by photograph)'],
      ['Weight that morning', '171 lb 7 oz, the man (Results, p. 85)'],
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
    summary: 'Locked to the sleeves on ball-bearing rings.',
    detail:
      'Each glove joins its sleeve at a ring that turns on ball bearings, so the wrist can twist under pressure. Glenn’s had ' +
      'small red lights on the index and middle fingertips, with a battery on the back of the hand, for reading charts and ' +
      'dials on the night side; the lights are not modelled.',
    facts: [['Wrist', 'ball-bearing lock and bearing (Results, pp. 34 to 37)']],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Legs',
    name: 'Legs',
    summary: 'Tailored and laced.',
    detail: 'Each suit was tailored to its pilot and laced snug. The biomedical connector is on the right thigh.',
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Boots',
    name: 'Boots',
    summary: 'Worn over the suit’s feet.',
    detail:
      'Glenn’s were of aluminised nylon with tennis-shoe soles (Results, pp. 34 to 37); the model has the laced leather boots of ' +
      'the suborbital flights.',
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
  url: 'models/usa/mercury/ma-6-friendship-7/crew.glb',
  scale: 'John H. Glenn, Jr. · suited · to scale',
  parts: crewParts,
  at: UP_THE_GANTRY,
});

/** The flight's figures for the pad and the pilot: his own, the suit's, and the place's (lc-14.parts.ts `LC14_SPECS`). */
export const PAD_SPECS: Flight['specs'] = [
  {
    group: 'Pressure suit',
    label: 'Pilot’s weight, 3:15 that morning',
    value: (171 + 7 / 16) * 0.45359237,
    unit: 'kg',
    confidence: 'documented',
    note: '171 lb 7 oz; 166 lb 2 oz that evening, on another scale (Results of the First United States Manned Orbital Space Flight, p. 85 and Table 8-III)',
  },
  CAPSULE_SPEC.suitPressure,
  ...LC14_SPECS,
];

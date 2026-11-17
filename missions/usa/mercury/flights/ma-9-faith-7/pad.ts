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
 * Launch Complex 14 on the morning of 15 May 1963, as Faith 7's pad.glb has it (model/pad.py: the place's modules at that
 * date, which build as they did for Friendship 7: nothing read has the pad changed, and most of it is scaled off the
 * photographs of that month). The hardware is the place's (places/cape-canaveral/lc-14.parts.ts); this is the morning, and
 * the pilot as he stood at the foot of the structure.
 *
 * What the record gives of the morning (The Triumph of Astronaut L. Gordon Cooper, Jr. and the Faith 7, p. 7; NASA SP-45,
 * pp. 102 and 264; This New Ocean, NASA SP-4201, pp. 492 to 494): the day before, the count had stood still for more than
 * two hours at T-60 because "the diesel engine failed to move the gantry", and the flight was put off. On the 15th Cooper
 * left the transfer van "near the elevator at Pad 14" at 5:32, as the Sun rose, "accepted the best wishes of the pad crew
 * and entered the elevator", and was in the spacecraft at 5:36; the count was "continuous except for a short hold", of four
 * minutes at T-11 minutes 30 seconds; liftoff at 08:04:13. No point of that morning's count is given by the clock or
 * in minutes but those: the structure's removal is put at the planned T-50 (the press kit, p. 47), which the one hold
 * after it puts at 07:10 (assumed). How long each thing took on the slider is layout.
 */

const TRIUMPH = 'The Triumph of Astronaut L. Gordon Cooper, Jr. and the Faith 7 (NASA MSC, 1963)';
const PLAN = 'the Mercury-Atlas 9 Press Kit (NASA, May 1963), p. 47: the countdown’s highlights as planned';
/** Seconds from liftoff (08:04:13 EST) of a time by the Cape's clocks that morning. */
const est = (h: number, m: number, s = 0): number => h * 3600 + m * 60 + s - (8 * 3600 + 4 * 60 + 13);
/** Seconds from liftoff of a point of the count after the planned hold at T-65: the one hold after it, 4 minutes, was at T-11.5. */
const count = (minutes: number): number => -(minutes + 4) * 60;

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
export const UP_THE_GANTRY = est(5, 32);
const REMOVED = count(50);
const STOWED = REMOVED + 14 * 60;

const MORNING: Keyframe[] = [
  {
    at: UP_THE_GANTRY,
    slider: 0,
    event: '05:32: Cooper leaves the van at the elevator, at sunrise',
    confidence: 'documented',
    source:
      `${TRIUMPH}, p. 7: "Cooper left the transfer van at 5:32 a.m., accepted the best wishes of the pad crew and entered the ` +
      'elevator for his ride up the gantry"; the van parked "near the elevator at Pad 14". The Sun’s rising is src/world’s',
  },
  {
    at: est(5, 36),
    slider: 0,
    event: '05:36: into the spacecraft',
    confidence: 'documented',
    source: `${TRIUMPH}, p. 7: "was assisted into his spacecraft at 5:36 a.m."`,
  },
  {
    at: est(5, 51),
    slider: 0,
    event: 'The hatch goes on',
    confidence: 'assumed',
    source: `not recorded for this morning: the plan has the astronaut aboard at T-120 and the hatch on at T-105 (${PLAN}), fifteen minutes after he went in`,
  },
  {
    at: count(55),
    slider: T.whiteRoom,
    event: 'The white room is opened',
    confidence: 'assumed',
    source:
      'not recorded: five minutes before the structure moved, as the standard count clears it at T-55 and moves it at T-50 (Mercury ' +
      'Spacecraft Pre-Launch Preparations, Part II, pp. 27 and 28), taken for this morning',
  },
  {
    at: REMOVED,
    slider: T.roll,
    event: 'T-50: the service structure starts off the stand, its diesel mended',
    confidence: 'assumed',
    source:
      `"T-50 Counting ... Service tower removed" (${PLAN}), taken for this morning; by the clock 07:10, the count less the one ` +
      'hold after it, 4 minutes at T-11 min 30 s (NASA SP-45, p. 102). The diesel that had failed to move it on the 14th had had ' +
      'its fuel system changed (SP-45, p. 264)',
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
    source: 'not recorded for this flight: fourteen minutes from first motion to stowed, Mercury-Atlas 7’s (NASA TN D-3814, p. 17)',
  },
  {
    at: count(11.5),
    slider: T.parked,
    event: 'T-11½: a hold of four minutes, the morning’s only one',
    confidence: 'derived',
    source:
      '"one unscheduled hold of 4 minutes duration at T-11 minutes 30 seconds, to investigate a signal fluctuation in the Mod III ' +
      'ground guidance system" (NASA SP-45, p. 102: documented); 07:48 by the clock',
  },
  {
    at: -35.01,
    slider: T.umbilical,
    event: 'T-35 s: the capsule’s umbilical is ejected; its boom swings clear',
    confidence: 'assumed',
    source: `"T-0:35 Counting ... Eject spacecraft umbilical" (${PLAN}), taken for this morning. That the boom swung clear is estimated, as for Friendship 7`,
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
    event: 'Liftoff, 08:04:13 EST: the launcher’s arms let go',
    confidence: 'documented',
    source:
      'NASA SP-45, pp. 102 and 103: "no additional hold-down beyond the normal approximately 2 seconds between flight lock-in and ' +
      'release. Lift-off occurred at 8:04:13 a.m. e.s.t., on May 15, 1963"',
  },
  { at: 12, slider: 1, event: 'The vehicle has gone', confidence: 'estimated', source: 'layout: the slider’s end' },
];

const WORDS: PadDay['words'] = {
  ...HARDWARE_WORDS,
  ServiceStructure: {
    summary: 'The red tower that stood over the Atlas, and on the first morning would not move.',
    detail:
      'Two legs on rails either side of the stand, joined over it, with a slot between them the height of the vehicle: an ' +
      'inverted U of box trusses, 154 ft 8 in tall. Seven levels of hinged decks fold down into the slot round the vehicle, ' +
      'two a level (the record’s fourteen movable decks, as read here). At the top, round the capsule, is the white room. To ' +
      'leave, the white room’s roof and floor fold away and its doors slide apart; the structure then rolls north off the ' +
      'stand on to a transfer table, which carries it 300 ft east, under a diesel engine. On 14 May the engine would not ' +
      'start the structure back: a fouled fuel-injection pump cost more than two hours, the Bermuda radar failed while it was ' +
      'mended, and the flight was put off a day with Cooper six hours in the capsule. On the 15th he rode the lift up at 5:32 ' +
      'as the Sun rose, and the structure went at about 7:10. Only its height, its decks and how it left are published: its ' +
      'form is scaled off photographs, most of them of this month.',
    facts: [
      ['Height', '154 ft 8 in (HAER FL-8-7); 145 ft by the NHL nomination'],
      ['Decks', '14 movable: seven levels of two leaves (as read here)'],
      ['White room', 'in the upper two decks: sliding doors, folding roof and floor'],
      ['Moved away', 'at T−50 by the plan, under a diesel engine; then 300 ft east on the transfer table'],
      ['14 May', 'the diesel failed to move it: more than two hours held at T−60 (SP-45, p. 264)'],
    ],
  },
  EgressTower: {
    summary: 'Carries the capsule’s umbilical, and a bridge that could be dropped to the hatch in thirty seconds.',
    detail:
      'The tower beside the vehicle after the service structure has gone. It carries the capsule’s umbilical on a gooseneck ' +
      'boom until T−35 seconds, and the bascule: a gangway hinged at its foot that stands upright through the whole count and ' +
      'can be lowered from the blockhouse in about thirty seconds, its caged end coming to rest beside the hatch. It was never ' +
      'lowered in earnest; after this flight it was not needed again, and the tower came down for Atlas-Agena. Its height is ' +
      'the old mast’s, assumed; the rest is scaled off photographs. Work the bascule by hand from the tower to see it reach ' +
      'the hatch.',
    facts: [
      ['Height', '84 ft 6 in above the stand (the umbilical mast’s, HAER FL-8-7: assumed for this tower)'],
      ['Bascule', 'about 30 ft; lowered in about 30 s by remote control'],
      ['Umbilical ejected', 'T−35 s, by the plan (the press kit, p. 47)'],
      ['Stood', 'by 22 January 1962; taken down for Atlas-Agena in 1964'],
    ],
  },
};

const padParts: Part[] = lc14Parts({ T, words: WORDS });

export const pad: ModelDef = lc14Pad({
  url: 'models/usa/mercury/ma-9-faith-7/pad.glb',
  slider: ['Up the gantry · 05:32', 'Liftoff · 08:04'],
  sequence: MORNING,
  parts: padParts,
});

const crewParts: Part[] = [
  {
    node: 'Helmet',
    name: 'Helmet',
    summary: 'Fibreglass shell, clear visor; two microphones.',
    detail:
      'For this flight the visor sealed mechanically, not on an inflatable seal from a bottle; new microphones were fitted, ' +
      'two of them, and a thermometer went on the right ear cup (The Triumph, p. 21). On his first night in orbit Cooper slept ' +
      'in it, his thumbs hooked in the shoulder straps to keep his arms from floating.',
    facts: [['Microphones', 'two (NASA S63-01922; SP-45, p. 56)']],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Torso',
    name: 'Torso',
    summary: 'Aluminised nylon over a rubber-coated bladder, with new shoulders.',
    detail:
      'The Navy Mark IV suit by B.F. Goodrich as reworked for Mercury, tailored to the man, and changed again for a day and a ' +
      'half in orbit: new shoulders for comfort under pressure; the life vest moved off the chest to a pocket on the left ' +
      'shin; an inlet that sealed itself when the hose came off (The Triumph, p. 21). The figure is the suit as modelled, on ' +
      'Cooper’s stature, with the fittings his photographs show; the new shoulders, the pocket and the inlet are not built.',
    facts: [
      ['Suit', 'Navy Mark IV, B.F. Goodrich'],
      ['Stature', '5 ft 9 in (The Triumph, p. 1)'],
      ['Weight that morning', '147 lb, the man, at about 4:00 (NASA SP-45, Table 18-II)'],
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
    summary: 'Locked to the sleeves on rings at the wrists, with an extra dog.',
    detail:
      'Each glove joins its sleeve at a ring that turns on ball bearings. For this flight the lock had one more dog, after a ' +
      'glove was found in training that could come off, and the wrists were made of a new stretch material in place of the ' +
      'adjusting straps (The Triumph, p. 21).',
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Legs',
    name: 'Legs',
    summary: 'Tailored, with the biomedical connector a round port on the right thigh.',
    detail:
      'Each suit was tailored to its pilot. On this one the biomedical connector is a round port on the right thigh (NASA ' +
      'S63-01922), and the life vest rode in a pocket on the lower left leg (not modelled).',
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Boots',
    name: 'Boots',
    summary: 'On this suit, made one with it: the model has the older laced boots.',
    detail:
      'Cooper’s boots were part of the suit, its outer cloth carried down to the soles, with a zip up the back of each to put ' +
      'the foot in: lighter, quicker to put on and more comfortable for 34 hours (The Triumph, p. 21). The model has the ' +
      'separate laced boots of the earlier flights.',
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Ventilator',
    name: 'Portable ventilator',
    summary: 'Cools the sealed suit from the van to the capsule.',
    detail:
      'A sealed suit cannot shed heat, so from the suiting room to the spacecraft the pilot carries his own air-conditioning: ' +
      'a blower and cooler in a case, plugged into the suit’s inlet at the waist. At the capsule the hose comes off, the new ' +
      'inlet seals itself, and the spacecraft’s system takes over.',
    explode: [0, 0, 0],
    order: 0,
  },
];

export const crew: ModelDef = lc14Pilot({
  url: 'models/usa/mercury/ma-9-faith-7/crew.glb',
  scale: 'L. Gordon Cooper, Jr. · suited · to scale',
  parts: crewParts,
  at: UP_THE_GANTRY,
});

/** The flight's figures for the pad and the pilot: his own, the suit's, and the place's (lc-14.parts.ts `LC14_SPECS`). */
export const PAD_SPECS: Flight['specs'] = [
  {
    group: 'Pressure suit',
    label: 'Pilot’s weight, about 4:00 that morning',
    value: 147 * 0.45359237,
    unit: 'kg',
    confidence: 'documented',
    note: '147 lb nude, at the examination of 3:55 to 4:11; 139¾ lb aboard the carrier the next evening (NASA SP-45, Table 18-II, p. 301)',
  },
  CAPSULE_SPEC.suitPressure,
  ...LC14_SPECS,
];

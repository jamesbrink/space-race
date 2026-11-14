/**
 * The Vostok spacecraft, 3KA, as the orbital simulator flies it (src/sim/orbital.ts): what every ship of the type had,
 * said once for every flight in one (Vostoks 1 to 6). The entry body, its heating, the hand controller and the braking
 * engine, the supplies, and the descent's hardware: the module's three parachutes, the seat's, the pilot's canopies and
 * the hatches. A flight gives its own: its pilot (his mass in his suit, his name), when his canopies opened as its record
 * has it, the landing ground's height and its checks. Moved here from Vostok 1's orbital.ts unchanged (vostok-3ka.md has
 * the ship; the flight's mission.md each input's argument).
 */

import type { DescentBody, DescentChute, DescentRecord, OrbitalFlight } from '../../../../src/sim/orbital.ts';
import type { Curve, Measure } from '../../../../src/types';
import { BOBKOV, derived, doc, G0, GCTC, guess, SIDDIQI } from './vostok-8k72k.ts';

/** The descent module's mass with its pilot and seat aboard: the type's. */
export const ENTRY_MASS: Measure = doc(
  2_460,
  `${SIDDIQI}, p. 195: 2.46 t for the type, the pilot and his seat aboard. No. 3’s own figure has not been found`,
);
/** Its disc, and its drag against Mach number: a sphere's. */
export const ENTRY_AREA: Measure = derived(
  Math.PI * 1.15 ** 2,
  'the disc of the 2.3 m ball (Siddiqi p. 195; RKK Energia’s drawing: Ø2300)',
);
export const ENTRY_DRAG: Curve = {
  points: [
    [0, 0.47],
    [0.7, 0.5],
    [1, 0.75],
    [1.5, 1.0],
    [3, 0.95],
    [6, 0.92],
    [25, 0.92],
  ],
  confidence: 'estimated',
  source:
    'a smooth sphere’s drag coefficient against Mach number as the textbooks plot it (Hoerner, Fluid-Dynamic Drag; Bailey and Hiatt, AIAA Journal 1972), set down from memory: neither was opened, ' +
    'so it is an estimate until one is. 0.92 above Mach 6 is the figure that matters (it sets the load and how far the ball carries); below Mach 1 a ball this size may be past its drag crisis ' +
    'and lower than 0.47. Nothing published for the Vostok ball itself, charred and with its straps’ stubs, was found. Free-molecule drag above 120 km (about 2) is left out: it is worth nothing in ten minutes',
};

/** The hand controller's rate, the braking engine's thrust, and how long after a burn the integrator ends the modules part. */
export const HAND_RATE: Measure = guess(
  2,
  'how fast the hand controller turned the spacecraft, deg/s: not found. The automatic system’s rates in the record are 2 to 3 deg/s (Gagarin, before orientation)',
);
export const TDU_THRUST: Measure = doc(1614 * G0, `${SIDDIQI}, p. 197: the TDU-1, 1,614 kgf`);
export const PARTING: Measure = guess(
  10,
  'the modules part ten to twelve seconds after a burn the integrator ends (the sequencer as planned: Siddiqi, The Space Review, 2015); ten taken',
);

/** What a ball in free-molecule flow drags, for how long an orbit lasts (orbital.ts `decay`). */
export const RAREFIED: Measure = guess(
  2,
  'a ball in free-molecule flow has a drag coefficient of about 2 (the entry curve’s own note: not read from a source, so estimated), on its disc; the joined ship on the ball’s disc as the coast flies it',
);

/** The heat of entry on the ball's face (no surfaces: the ablator's figures have not been read). */
export const HEATING: NonNullable<OrbitalFlight['heating']> = {
  noseRadius: doc(1.15, 'the 2.3 m ball (Siddiqi p. 195; RKK Energia’s drawing: Ø2300): a sphere’s face is its own radius'),
  starts: guess(290, 'not read: the cabin’s temperature at launch taken for the outside; it is not used, there being no surface'),
  // (no surfaces: the ablator's thickness, density, heat of ablation and the shield's temperatures have not been read)
  surfaces: [],
  round: true,
};

/** The descent module's own three parachutes (Bobkov; GCTC), the first drawn out by hatch No. 2's cover at about 7 km. */
export const MODULE_CHUTES: DescentChute[] = [
  {
    name: 'pilot parachute',
    after: doc(
      0,
      `${BOBKOV}: drawn out by the parachute container’s cover, shot off by the barometric sensors with the hatch, at about 7 km`,
    ),
    dragArea: guess(
      1.1,
      `1.5 m² of canopy (${BOBKOV}; ${GCTC}) at a drag coefficient of 0.75 on its cloth, which is the usual round canopy’s and is chosen`,
    ),
    fills: guess(1, 'chosen: no filling time found'),
    strength: guess(
      18_000,
      `not found. It came out with the hatch at 7 km and 220 m/s (${BOBKOV}), 14.3 kPa in the standard air (derived): a quarter over that. Ours`,
    ),
    pull: guess(16_000, 'not found: full at once in those 14.3 kPa it would pull 16 kN, taken as what its lines take. Ours'),
  },
  {
    name: 'braking parachute',
    altitude: doc(4_000, `${BOBKOV}: “на высоте 4 км при скорости 200 м/с”; ${GCTC}`),
    dragArea: guess(13.5, `18 m² of canopy (${BOBKOV}; ${GCTC}) at 0.75`),
    fills: guess(2, 'chosen: no filling time found'),
    strength: guess(
      20_000,
      `not found. Built to open at 4 km at 200 m/s (${BOBKOV}), 16.4 kPa in the standard air (derived): a quarter over that. Ours`,
    ),
    pull: guess(
      220_000,
      'not found: full at once in those 16.4 kPa it would pull 221 kN, taken as what its lines take (flown, it opens nearer 145 m/s and pulls 71 kN). Ours',
    ),
    // (the usual train: the small parachute draws the next out and goes with it; not stated for Vostok in anything read)
    instead: ['pilot parachute'],
  },
  {
    name: 'main parachute',
    altitude: doc(2_500, `${BOBKOV}; ${GCTC}: at 2.5 km`),
    dragArea: guess(430, `574 m² of canopy (${BOBKOV}; ${GCTC}) at 0.75`),
    fills: guess(6, 'chosen: no filling time found'),
    strength: guess(
      3_000,
      'not found. It was let out behind the braking parachute, where the module falls at some 55 m/s at 2.5 km (1.5 kPa, as flown here): twice that. Without the braking parachute the ball falls at 155 m/s there, 11 kPa, and it tears. Ours',
    ),
    pull: guess(
      100_000,
      'not found: as flown here it pulls 69 kN at most as it fills (3.1 g on the empty module), and half as much again is taken as what its lines and riser take. Ours',
    ),
    instead: ['braking parachute'],
  },
];

/** The empty descent module's drag, under its parachutes or not: the ball at a sphere's subsonic figure. */
export const MODULE_DRAG: Measure = guess(
  1.95,
  'the 2.3 m ball’s disc, 4.15 m², at the sphere’s 0.47 below Mach 0.7 (the entry curve here, itself estimated)',
);

/** The seat's stabilising parachute, out as it leaves the ball. */
export const SEAT_CHUTE: DescentChute = {
  name: 'seat’s braking parachute',
  after: doc(
    0.5,
    `ru.wikipedia, «Парашютная система космического корабля "Восток-1"»: “через полсекунды”, tertiary; ${BOBKOV}: as the seat leaves`,
  ),
  dragArea: guess(1.5, `2 m² of canopy (${BOBKOV}; ${GCTC}) at 0.75`),
  fills: guess(1, 'chosen: no filling time found'),
  strength: guess(
    18_000,
    `not found: out half a second after the seat left at 7 km and 220 m/s (${BOBKOV}), 14.3 kPa: a quarter over that. Ours`,
  ),
  pull: guess(22_000, 'not found: full at once in those 14.3 kPa it would pull 21 kN, taken as what its lines take. Ours'),
};

/** A seated man and his seat; how fast the seat left the ball on its rockets. */
export const SEATED_DRAG: Measure = guess(0.6, 'a seated man and his seat, chosen');
export const THROWN: Measure = guess(
  20,
  `${BOBKOV} and ${GCTC} via mission.md: the seat left “at up to 20 m/s”, on its two rockets, two seconds after the hatch; taken at that bound, and at the hatch’s instant`,
);

/** The pilot's two canopies: the main as he leaves the seat, the reserve after it; `altitude` is when each came out, the flight's. */
export const mainCanopy = (altitude: Measure, replaces: NonNullable<DescentChute['replaces']>['mass']): DescentChute => ({
  name: 'main canopy',
  altitude,
  dragArea: guess(62.6, `83.5 m² of canopy (${BOBKOV}; ${GCTC}) at 0.75`),
  fills: guess(4, 'chosen: no filling time found'),
  strength: guess(
    2_000,
    'not found. Let out at 4 km as he left the seat, falling on it under its stabilising parachute at some 45 m/s (0.9 kPa, as flown here): twice that. Ours',
  ),
  pull: guess(
    12_000,
    'not found: as flown here it pulls 5.2 kN at most as it fills (4 g on him and his pack); some 9 g on 131 kg, 12 kN, is taken as what the canopy, its lines and his harness take. Ours',
  ),
  replaces: {
    mass: replaces,
    leaves: {
      id: 'seat',
      label: 'The ejection seat',
      dragArea: guess(
        1.8,
        'the empty seat, 0.3 m² (chosen), under its stabilising parachute, 1.5 m² as above, which stays with it: chosen',
      ),
    },
  },
});
export const reserveCanopy = (altitude: Measure): DescentChute => ({
  name: 'reserve canopy',
  altitude,
  dragArea: guess(42, `56 m² of canopy (${BOBKOV}; ${GCTC}) at 0.75`),
  fills: guess(4, 'chosen: no filling time found'),
  strength: guess(2_000, 'not found: as the main canopy, a canopy of the same make. Ours'),
  pull: guess(12_000, 'not found: as the main canopy. Ours'),
});

/** The two hatches blown at the ejection height: No. 1, which the seat leaves through, and No. 2, the parachute container's cover. */
export const HATCHES: DescentBody[] = [
  {
    id: 'hatch',
    label: 'Hatch No. 1',
    mass: guess(30, 'not found: a cover 1 m across in the clear, its heat shield and its lock, by judgement'),
    dragArea: guess(0.8, 'a plate a little over 1 m across, tumbling: chosen'),
    thrown: guess(
      30,
      'not found: blown off by its pyrotechnics at 7 km, two seconds before the seat; chosen to keep it ahead of the seat, which here leaves at the same instant',
    ),
    chutes: [],
  },
  {
    id: 'cover',
    label: 'Hatch No. 2, the parachute container’s cover',
    mass: guess(25, 'not found: by judgement, as hatch No. 1'),
    dragArea: guess(0.8, 'as hatch No. 1: chosen'),
    thrown: guess(10, `not found: shot off with the hatch at about 7 km, drawing out the module’s small parachute (${BOBKOV}); chosen`),
    // (one command shot both hatches; by hand, the module's parachute is let out by shooting this one off)
    with: ['ejection', 'module/pilot parachute'],
    chutes: [],
  },
];

/** A canopy torn or streaming keeps this share of its drag area. */
export const TORN: Measure = guess(
  0.05,
  'a canopy torn or streaming is taken to keep a twentieth of its drag area: chosen, not recorded (as Freedom 7’s)',
);

/** What a man lives through on the way down (sim/verdict.ts): the landing aboard and alone, the blast, the fastest he can be out in the air. */
export const CREW: NonNullable<DescentRecord['crew']> = {
  alone: 'pilot',
  landing: {
    aboard: guess(
      7,
      `not found. The descent module came down at 10 m/s (${BOBKOV}), which was not to be landed in: that is why he left it at 7 km (mission.md, "The verdict and the misses": tertiary). What the seat in the ball would have let him walk away from has not been read; 7 m/s is taken. Ours`,
    ),
    alone: guess(
      8,
      `not found. He came down at 5 m/s (${GCTC}; 6 on the main alone, ${BOBKOV}), a parachutist’s landing; 8 m/s is taken as the most he walks away from on his own legs. Ours`,
    ),
  },
  blast: guess(
    30_000,
    `not found. He left at 7 km and 220 m/s (${BOBKOV}), 14.3 kPa (derived); twice that is taken as what a man in his suit on an open seat lives through, which is of the order the ejection seats of the time were built to. Ours. The heat of the air at speed on a man out of the ball is not modelled at all`,
  ),
  fastest: guess(
    1_000,
    'not found, and the heat of the air on a man is not modelled. A man in a pressure suit has come through the break-up of an aircraft at Mach 3.2 at 24 km (Weaver, SR-71, 1966: from memory, not read); out of the ball faster than 1,000 m/s through the air he is taken to die of it. Ours',
  ),
  aboard: 'the module’s own landing was 10 m/s (Bobkov, OKB-1), and the ejection existed to spare him it',
};

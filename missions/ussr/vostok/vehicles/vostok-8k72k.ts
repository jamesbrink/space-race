/**
 * The Vostok-K launch vehicle, 8K72K, as the orbital simulator flies it (src/sim/staged.ts): what every vehicle of the type
 * had, said once for every flight on it (Vostoks 1 to 6; the Voskhods' 11A57 is another). A flight gives its own day
 * (`Staging`, `Ascent8K72K`): when its stages were cut and let go, what its integrator was set to, its aiming azimuth and
 * target, its checks, and what its own run leaves in each spent block. Every figure here is the type's, with its source;
 * what the flight's own record says goes in the flight's orbital.ts. Moved here from Vostok 1's orbital.ts unchanged
 * (vostok-8k72k.md has the dimensions; the flight's mission.md each input's argument).
 */

import type { AscentCheck, AscentRecord, Guidance, StageRecord } from '../../../../src/sim/orbital.ts';
import type { Confidence, Curve, Measure, ShedBody } from '../../../../src/types';

/** The strap-ons, each a body of its own when it leaves: its letter, its block, its bearing round the stack (as flight.ts's BOOSTERS). */
export const BOOSTERS: [letter: string, block: string, az: number][] = [
  ['B', 'Б', 0],
  ['V', 'В', 90],
  ['G', 'Г', 180],
  ['D', 'Д', 270],
];

export const m = (value: number, confidence: Confidence, source: string): Measure => ({ value, confidence, source });
export const doc = (value: number, source: string): Measure => m(value, 'documented', source);
export const derived = (value: number, source: string): Measure => m(value, 'derived', source);
export const guess = (value: number, source: string): Measure => m(value, 'estimated', source);

export const G0 = 9.80665;
export const SIDDIQI = 'Siddiqi, Challenge to Apollo, NASA SP-2000-4408';
export const ZAK = 'Zak, RussianSpaceWeb';
export const ENERGOMASH = 'NPO Energomash’s table by vehicle, row 8K72K, as reproduced by Brügge (b14643.eu): secondary';
export const MINAKOV = 'Minakov, «Ракета, поднявшая в космос Ю. Гагарина», Modelist-Konstruktor';
export const ASTRONAUTIX = 'Encyclopedia Astronautica, Vostok 8K72K stage data: secondary';
export const PPP =
  '«Первый пилотируемый полёт», book 2 (Davydov, ed., 2011), as quoted by page in Gammal and Tuchin, «Реконструкция траектории полёта КА «Восток-1»», Keldysh Institute preprint 2025 No. 15';
export const NK =
  'Lissov and Afanasyev, «106 минут Гагарина в свете рассекреченных документов», Novosti Kosmonavtiki 2011 No. 6, pp. 2–11, written page by page from «Первый пилотируемый полёт» (2011): the flight task (book 1, pp. 429–430), the launch cyclogram (book 1, p. 431) and NIIP-5’s operational report of 13 May 1961 (book 2, pp. 54–69): secondary';
export const SOYUZ =
  'Starsem, Soyuz User’s Manual ST-GTD-SUM-01, issue 3, 2001, Fig. 2-4 (pitch against time): a different vehicle on the same first two stages';
export const SPUTNIK =
  'в/ч 11284, the reports of 17 October and 14 November 1957 on 8K71PS No. M1-1 (TsAMO f. 19, op. 110ss, d. 14), as published by rvsn.info: the same first two stages, two-stage, a different vehicle';
export const BOBKOV = 'Bobkov (OKB-1), «Космический корабль "Восток"», Krylya Rodiny 1991 No. 4 and 6: secondary';
export const GCTC = 'Gagarin Cosmonaut Training Centre, «Корабль "Восток"» (gctc.ru): secondary, unsigned';

/** A stage's own: what it was, what it held and what its engine gives; the flight gives when it was lit, cut and let go, and how it was throttled. */
type Hardware = Omit<StageRecord, 'cutoff' | 'separation' | 'throttle' | 'velocity'>;

/** Blocks B, V, G and D: four alike, each an RD-107. */
export const STRAP_ONS: Hardware = {
  name: 'Strap-on boosters, Blocks B, V, G, D',
  count: 4,
  engine: 'RD-107 (8D74)',
  nodes: ['Booster_B', 'Booster_V', 'Booster_G', 'Booster_D'],
  mass: doc(43_300, `${ASTRONAUTIX}: 43.3 t each. Minakov’s table has 170 t for the four (42.5 t); Brügge 177.65 t (44.4 t)`),
  dry: doc(3_750, `${MINAKOV}: 3.75 t. Astronautix has 3.71 t`),
  propellant: derived(
    39_550,
    '43.3 t fuelled (Astronautix) less 3.75 t dry (Minakov): all that is not structure, as the 8K71’s own table counts it (militaryrussia.ru: 42,950 less 3,750 is 39,200 kg «топливо»). ' +
      'The kerosene, oxygen, peroxide and nitrogen are not split for the 8K72K in anything found. The flow drawn from it is the engine’s whole flow, which is what its specific impulse is reckoned on: ' +
      'thrust over kerosene, oxygen and peroxide together (lpre.de, from Gakhun et al. 1989: 1,000.3 kN over 326.2 kg/s is 3,066.5 m/s, the published 3,067); the 0.28 t of nitrogen (militaryrussia.ru) is not burned and is left in. ' +
      'Brügge’s figures (b14643.eu) are not this vehicle’s: his block masses for every R-7 are Soyuz-ST’s, from Arianespace’s Soyuz CSG User’s Manual, issue 2, 2012, Fig. 1.5.1a, where a strap-on carries 27,900 kg of oxygen and 11,260 of kerosene (39.16 t) and a core 63,800 and 26,300 (90.10 t), the peroxide and nitrogen outside those (1.47 and 3.12 t)',
  ),
  thrust: {
    seaLevel: doc(815_900, `${ENERGOMASH}: 815.9 kN. Minakov’s table: 82 tf (804 kN)`),
    vacuum: doc(997_700, `${ENERGOMASH}: 997.7 kN`),
  },
  isp: {
    seaLevel: doc(2510 / G0, `${ENERGOMASH}: 2,510 N·s/kg (256 s)`),
    vacuum: doc(3069 / G0, `${ENERGOMASH}: 3,069 N·s/kg (313 s)`),
  },
  ignition: guess(
    0,
    'lit on the pad before liftoff, through a preliminary and an intermediate stage of thrust (Gagarin’s report); how many seconds before has not been read, and the propellant burned before liftoff is not known',
  ),
};

/** Block A: the core, its RD-108 lit on the pad with the strap-ons. */
export const CORE: Hardware = {
  name: 'Core, Block A',
  count: 1,
  engine: 'RD-108 (8D75)',
  nodes: ['CoreStage', 'CoreEngine', 'Interstage'],
  mass: doc(100_400, `${ASTRONAUTIX}: 100.4 t. Brügge 99.76 t; Minakov 102 t`),
  dry: doc(6_800, `${ASTRONAUTIX}: 6.8 t. Minakov: 7 t for the 8K71’s core, 8 t in his 8K72 table`),
  propellant: derived(
    93_600,
    '100.4 t fuelled less 6.8 t dry (both Astronautix, of the 8K72K’s core): all that is not structure, peroxide and nitrogen with the kerosene and oxygen, drawn at the engine’s whole flow (see the strap-ons). ' +
      'Brügge’s figures (b14643.eu) are not this vehicle’s: his block masses for every R-7 are Soyuz-ST’s, from Arianespace’s Soyuz CSG User’s Manual, issue 2, 2012, Fig. 1.5.1a, where a strap-on carries 27,900 kg of oxygen and 11,260 of kerosene (39.16 t) and a core 63,800 and 26,300 (90.10 t), the peroxide and nitrogen outside those (1.47 and 3.12 t)',
  ),
  thrust: {
    seaLevel: doc(744_300, `${ENERGOMASH}: 744.3 kN. Minakov’s table: 81.2 tf`),
    vacuum: doc(945_400, `${ENERGOMASH}: 945.4 kN`),
  },
  isp: {
    seaLevel: doc(2432 / G0, `${ENERGOMASH}: 2,432 N·s/kg (248 s)`),
    vacuum: doc(3089 / G0, `${ENERGOMASH}: 3,089 N·s/kg (315 s)`),
  },
  ignition: guess(0, 'lit on the pad with the strap-ons, as theirs'),
};

/** Block E: the third stage, its RD-0109 lit through the lattice. The flight gives its ignition. */
export const BLOCK_E: Omit<Hardware, 'ignition'> = {
  name: 'Third stage, Block E',
  count: 1,
  engine: 'RD-0109 (8D719)',
  nodes: ['BlockE'],
  // (NK's figures from the 2011 documents, 1,210 kg dry and 6,576 kg of propellant, are not flown yet: mission.md, "The 2011 documents")
  mass: doc(
    7_984,
    `${MINAKOV}: 7,984 kg, of the 8K72’s stage. ${NK}, p. 10, note 31: 7,786 kg (1,210 dry, 4,482 + 2,088 + 6 kg filled), not flown yet. Astronautix 7,775 kg; RKK Energia “8 t”; Brügge 8.36 t`,
  ),
  dry: doc(1_472, `${MINAKOV}: 1,472 kg burnt out. ${NK}: 1,210 kg dry, not flown yet. Astronautix 1,440 kg; Zak 1.34 t dry`),
  propellant: derived(6_512, 'Minakov’s two figures, 7,984 less 1,472 kg. Brügge has 6.93 t; NK 6,576 kg'),
  thrust: { vacuum: doc(54_500, 'Brügge: 54.5 kN; Astronautix 54.52 kN: secondary') },
  isp: { vacuum: doc(3172 / G0, 'Brügge: 3,172 N·s/kg (323.5 s); Astronautix 324 s: secondary') },
};

/**
 * The strap-ons' intermediate stage of thrust before they part, for a flight whose record does not give its own: as Vostok 1's
 * (the level the 8K71's and 8A91's, the length Sputnik's), put before the flight's own separation. Estimated.
 */
export const strapOnThrottle = (separation: number): Curve => ({
  points: [
    [0, 1],
    [separation - 6.4, 1],
    [separation - 6.39, 0.6],
    [separation, 0.6],
  ],
  confidence: 'estimated',
  source:
    'The RD-107 goes from its main to its first intermediate stage of thrust before the strap-ons part, and the 8D74K shut down through it (lpre.de; RKK Energia 1946–1996; Minakov: «маршевые двигатели переводились на режим малой тяги»). ' +
    'Neither its level nor its length on the 8K72K was found. The level is the 8K71’s and 8A91’s, 60 per cent (590.0 of 972.3 kN: Energomash’s table as Brügge copies it, secondary); the length is Sputnik’s, ' +
    `6.4 s (the command at 109.94 s, separation at 116.38 s: ${SPUTNIK}), put before this flight’s separation at ${separation} s`,
});

/**
 * The core's final stage of thrust, on its four steering chambers alone, for a flight whose record does not give its own:
 * Vostok 1's reading (10 s at the most those chambers give), put before the flight's own cutoff. Estimated.
 */
export const coreThrottle = (cutoff: number): Curve => ({
  points: [
    [0, 1],
    [cutoff - 10, 1],
    [cutoff - 9.99, 0.104],
    [cutoff, 0.104],
  ],
  confidence: 'estimated',
  source:
    '«За несколько секунд до выключения двигателя РД-108 переводится на конечную ступень тяги, на которой работают только рулевые КС, и при том – на пониженном режиме» (lpre.de). ' +
    'Neither its level nor its length was found for this flight: as Vostok 1’s reading of its cyclogram, about 10 s before the main command, at the four steering chambers’ rated 2.5 tf each (RKK Energia 1946–1996), ' +
    `10 tf of the engine’s 96.4 in vacuum, 10.4 per cent, the most it can be; put before this flight’s cutoff at ${cutoff} s`,
});

/** When a flight's stages were lit, cut and let go, as its own record has them; a throttle it does not give is the type's reading above. */
export interface Staging {
  boosters: { cutoff: Measure; separation: Measure; throttle?: Curve };
  core: { cutoff: Measure; separation: Measure; throttle?: Curve };
  third: { ignition: Measure; cutoff: Measure; separation: Measure; velocity?: StageRecord['velocity'] };
}

/** The three stages of a flight on the 8K72K, in order (orbital.ts `stages`). */
export function stages8K72K(day: Staging): StageRecord[] {
  const { boosters, core, third } = day;
  return [
    {
      ...STRAP_ONS,
      throttle: boosters.throttle ?? strapOnThrottle(boosters.separation.value),
      cutoff: boosters.cutoff,
      separation: boosters.separation,
    },
    { ...CORE, throttle: core.throttle ?? coreThrottle(core.cutoff.value), cutoff: core.cutoff, separation: core.separation },
    {
      ...BLOCK_E,
      ignition: third.ignition,
      cutoff: third.cutoff,
      separation: third.separation,
      ...(third.velocity ? { velocity: third.velocity } : {}),
    },
  ];
}

/** How long the stack rises straight before the pitch-over begins: the type's estimate (Soyuz's manual), until an 8K72K's programme is read. */
export const VERTICAL: Measure = guess(
  15,
  `${SOYUZ}: within half a degree of the vertical at 19 s and 3.3 degrees off it at 29 s. The 8K72K’s own programme has not been found; its boosters reached their main stage of thrust 6 s after liftoff (as Sputnik’s did: ${SPUTNIK})`,
);
/** How long the pitch-over takes: chosen. */
export const KICK: Measure = guess(10, 'how long the pitch-over takes: chosen. Its angle is solved, not chosen (staged.ts: steer)');

/** The drag curve of the stack against Mach number: chosen (no R-7's has been found). */
const CURVE: Curve['points'] = [
  [0, 0.25],
  [0.8, 0.28],
  [1.1, 0.5],
  [1.5, 0.45],
  [2.5, 0.33],
  [4, 0.25],
  [8, 0.2],
];

/** What a flight's own run leaves in each block it lets go, for the scene's spent bodies (sim/shed.ts): derived from the flight's run, so the flight's. */
export interface Left {
  booster: Measure;
  core: Measure;
  blockE: Measure;
}

/** A flight's ascent on the 8K72K (orbital.ts `ascent`): the type's drag, fairing, steering and spent bodies; the flight's law, instants and checks. */
export interface Ascent8K72K {
  guidance: Guidance;
  /** When the strap-ons left (the stack's frontal area is the cluster's until then), and the last cutoff (the core's area after). */
  boostersGo: Measure;
  lastCutoff: Measure;
  fairing: Measure;
  left: Left;
  checks: AscentCheck[];
}

export function ascent8K72K(day: Ascent8K72K): AscentRecord {
  return {
    guidance: day.guidance,
    drag: [
      {
        until: day.boostersGo,
        area: derived(
          29.4,
          'the cluster seen end on: the core’s 2.95 m (Minakov) and four strap-ons of 2.68 m (Minakov), π/4 (2.95² + 4 × 2.68²) = 29.4 m², their overlap left out',
        ),
        curve: {
          points: CURVE,
          confidence: 'estimated',
          source:
            'NOT FOUND for any R-7: no drag figure against Mach number for the 8K72K, the R-7 or Soyuz was found (mission.md). A curve of the usual form for a slender clustered vehicle on its frontal area, chosen: a transonic rise to 0.5 and falling to 0.2 at Mach 8. tests/staged.test.mjs says what ±30 % of it moves',
        },
      },
      {
        until: day.lastCutoff,
        area: derived(6.835, 'the core seen end on, 2.95 m (Minakov): Block E and the fairing are narrower'),
        curve: {
          points: CURVE,
          confidence: 'estimated',
          source: 'the same chosen curve as the whole stack’s; the air is a ten-thousandth of the ground’s by then',
        },
      },
    ],
    drops: [
      {
        id: 'fairing',
        at: day.fairing,
        mass: doc(
          800,
          `${ZAK}: 0.8 t. Brügge 0.64 t: secondary. ${NK}, p. 10, note 31: «Масса головного обтекателя составляла 582 кг», not flown yet (mission.md, "The 2011 documents")`,
        ),
      },
    ],
    // For the live vehicle flown by hand (src/sim/stagedlive.ts): how hard its steering chambers turn it. No figure read.
    steering: {
      authority: guess(
        5,
        'deg/s² at full throw, about each axis: NOT FOUND. Of the order the steering chambers give: the core’s four of 2.5 tf (RKK Energia 1946–1996) and the strap-ons’ eight, swung, ' +
          '15 m or so from the centre of mass of a stack of 287 t and 30 m (about 2 × 10⁷ kg m² as a rod), a few degrees a second squared; taken as the same on every stage and at every mass, which it was not',
      ),
    },
    // For the scene: where the spacecraft's centre of mass is, and what leaves as a body of its own (sim/shed.ts). Stations
    // are metres above the main nozzles' exits, as vostok-8k72k.md has them. Every drag figure is estimated; so is every
    // centre and gyration, from the stations and masses there.
    centre: guess(
      1.6,
      'the spacecraft’s centre of mass above its station 0 (the braking nozzle): about the instrument module’s top and the ball’s bottom, from the stations of vostok-3ka.md',
    ),
    sheds: sheds(day.left),
    checks: day.checks,
  };
}

/** The bodies the ascent lets go, each flown on from where it leaves (sim/shed.ts); what each still holds is the flight's run's. */
function sheds(left: Left): ShedBody[] {
  return [
    // The four strap-ons, each a body of its own leaving from where it stood: its lower ties let go, the thrust left
    // in its engine swings its tail out about the ball at its tip until the ball leaves its socket, and the vent on
    // its oxidizer tank, opened as the ball comes free, pushes its nose away: the four fall back as a cross (sim/shed.ts
    // `apart`). How it goes is documented in kind (Siddiqi, Challenge to Apollo, p. 130; the Soyuz CSG User's Manual,
    // issue 2, A5.1.2; the MS-10 commission's findings as RussianSpaceWeb gives them); its figures are not, and are
    // estimated. B stands down range, V on the stack's left, G up range, D on its right (vehicle.py, as the launch ring
    // turned it: each strap-on's box on the pad, the stack's frame at liftoff).
    ...BOOSTERS.map(([letter, block, az]) => ({
      on: `boosters/${letter}`,
      name: `Strap-on Block ${block} (${letter})`,
      from: doc(0, 'the main nozzles’ exits (vostok-8k72k.md)'),
      to: doc(19.8, `${ZAK}; Brügge: 19.8 m with the nozzles`),
      radius: doc(1.34, `${MINAKOV}: 2.68 m across`),
      mass: left.booster,
      centre: guess(8, 'about two fifths up a strap-on, empty: its engine and tail are the heaviest part'),
      gyration: {
        roll: guess(0.9, 'a shell 1.34 m in radius with its engine on the axis'),
        across: guess(6, 'a 19.8 m block, its mass low'),
      },
      ahead: guess(4.5, 'its tip, 5.6 m², at 0.8'),
      astern: guess(5.6, 'its tail, 5.6 m², at 1.0'),
      side: {
        dragArea: guess(35, '19.8 m × 2 m on average, at 0.9'),
        from: doc(0, 'the body’s own stretch, as above'),
        to: doc(19.8, 'the body’s own stretch, as above'),
      },
      // the vent: on the inner side of the cone, its jet at 45° to the axis and forward, so its push is back and away
      // from the core (Zak, RussianSpaceWeb, Soyuz MS-10; Modelist-Konstruktor); opened as the ball leaves its socket
      motors: [
        {
          name: 'oxidizer tank vent',
          thrust: guess(
            3_000,
            'N: NOT FOUND. The tank’s ullage gas, a few bar, through a nozzle of the order of 10 cm: some kilonewtons, falling as the tank empties (taken as steady)',
          ),
          burn: guess(6, 's: NOT FOUND: until the tank’s pressure has gone'),
          cant: derived(
            135,
            'degrees from the strap-on’s +X toward its outward +Z: the jet at 45° to the axis and forward (Zak), so its push is 45° back of outward',
          ),
          station: guess(16, 'the oxidizer tank’s top, under the cone (vostok-8k72k.md has the tank above the fuel’s)'),
        },
      ],
      apart: {
        bearing: az,
        across: derived(2.78, 'its axis at the base, from the stack’s (vostok-8k72k.md)'),
        pivot: {
          station: guess(19.5, 'the ball at its tip, a little under the cone’s point (the model: 19.9 m with the nozzles)'),
          across: guess(1.3, 'the ball in its socket on the core’s skin, under the core’s upper tank (the model)'),
        },
        tailOff: guess(
          100_000,
          'N: NOT FOUND. The RD-107 was cut from its last throttle level as the ties went; what was left as it swung, a tenth of its rated thrust, is taken',
        ),
        swing: guess(3, 'degrees: NOT FOUND: how far the tail swings before the ball rolls out of its socket'),
      },
    })),
    {
      on: 'fairing',
      name: 'The fairing',
      from: derived(31.73, 'on Block E’s adapter: 28.75 m (core with lattice) + 2.98 m (Block E with adapter), Minakov'),
      to: doc(38.36, `${MINAKOV}: the whole vehicle’s length`),
      radius: doc(1.35, `${MINAKOV}: 2.7 m across`),
      mass: doc(800, `${ZAK}: 0.8 t; Brügge 0.64 t. Flown as one body: it was two halves`),
      centre: guess(34.5, 'a little below the middle of a shell that narrows to its tip'),
      gyration: { roll: guess(1.1, 'a thin shell 1.35 m in radius'), across: guess(2, 'a 6.6 m shell') },
      ahead: guess(2.5, 'its nose, 5.7 m², at 0.45'),
      astern: guess(6, 'its open foot, at 1.0'),
      side: {
        dragArea: guess(18, '6.6 m × 2.7 m at 1.0'),
        from: derived(31.73, 'the body’s own stretch, as above'),
        to: doc(38.36, 'the body’s own stretch, as above'),
      },
    },
    {
      on: 'core',
      name: 'Block A, the core',
      from: doc(0, 'the main nozzles’ exits'),
      to: doc(28.75, `${MINAKOV}: the core with its lattice`),
      radius: doc(1.475, `${MINAKOV}: 2.95 m across`),
      mass: left.core,
      centre: guess(9, 'below its middle: the engine and the empty tanks’ lower half'),
      gyration: { roll: guess(1.0, 'a shell 1.2 to 1.5 m in radius'), across: guess(8, 'a 28.75 m block') },
      ahead: guess(4, 'its lattice end, 5.2 m², at 0.8'),
      astern: guess(5, 'its tail, 3.3 m², and the engine, at 1.5'),
      side: {
        dragArea: guess(70, '28.75 m × 2.5 m on average, at 1.0'),
        from: doc(0, 'the body’s own stretch, as above'),
        to: doc(28.75, 'the body’s own stretch, as above'),
      },
    },
    {
      on: 'separation',
      name: 'Block E, the third stage',
      from: doc(28.75, `${MINAKOV}: on the lattice’s top`),
      to: derived(31.73, 'its adapter’s rim, 2.98 m higher (Minakov)'),
      radius: doc(1.29, `${MINAKOV}: 2.58 m across`),
      mass: left.blockE,
      centre: guess(29.8, 'the engine in its tanks’ ring, low in the stage'),
      gyration: { roll: guess(0.9, 'ring tanks 1.29 m in radius'), across: guess(1, 'a stage 3 m long') },
      push: guess(
        1,
        'not found: the spacecraft left Block E’s adapter on pushers (spacecraft.md: four of them), at a speed nothing read gives; 1 m/s apart, of the order spring pushers give, is chosen. Block E’s venting of what was left in its tanks after cutoff, which would have moved it further, is not modelled',
      ),
      ahead: guess(5, 'its adapter’s open rim, at 1.0'),
      astern: guess(5, 'its base, at 1.0'),
      side: {
        dragArea: guess(8, '3 m × 2.6 m at 1.0'),
        from: doc(28.75, 'the body’s own stretch, as above'),
        to: derived(31.73, 'the body’s own stretch, as above'),
      },
    },
    {
      on: 'modules',
      name: 'The instrument module and braking engine',
      from: derived(30.53, 'the spacecraft’s station 0, the braking nozzle (vostok-8k72k.md)'),
      to: guess(32.8, 'the instrument module’s top, from RKK Energia’s drawing as vostok-3ka.md has it'),
      radius: guess(1.25, 'its widest, 2.43 m (Siddiqi)'),
      mass: doc(2_265, `${BOBKOV}: the instrument module, 2.265 t`),
      centre: guess(31.5, 'the middle of its two cones'),
      gyration: { roll: guess(0.8, 'two cones 1.2 m in radius'), across: guess(0.8, 'two cones 2.3 m long') },
      ahead: guess(3, 'its concave top, 4.6 m², at 0.7'),
      astern: guess(3, 'its base, at 0.7'),
      side: {
        dragArea: guess(5, '2.3 m × 2.2 m at 1.0'),
        from: derived(30.53, 'the body’s own stretch, as above'),
        to: guess(32.8, 'the body’s own stretch, as above'),
      },
    },
  ];
}

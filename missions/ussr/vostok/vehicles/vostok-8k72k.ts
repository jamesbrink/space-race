/**
 * The Vostok-K launch vehicle, 8K72K, as the orbital simulator flies it (src/sim/staged.ts): what every vehicle of the type
 * had, said once for every flight on it (Vostoks 1 to 6; the Voskhods' 11A57 is another). A flight gives its own day
 * (`Staging`, `Ascent8K72K`): when its stages were cut and let go, what its integrator was set to, its aiming azimuth and
 * target, its checks, and what its own run leaves in each spent block. Every figure here is the type's, with its source;
 * what the flight's own record says goes in the flight's orbital.ts. Moved here from Vostok 1's orbital.ts unchanged
 * (vostok-8k72k.md has the dimensions; the flight's mission.md each input's argument).
 */

import { derived, doc, estimated } from '../../../../src/measure.ts';
import type { Guidance } from '../../../../src/sim/orbital.ts';
import type { Curve, JetDef, Measure, ShedBody } from '../../../../src/types.ts';
import { G0 } from '../../../../src/world/bodies.ts';
import type { AscentCheck, AscentRecord, StageRecord } from './vostok-record.ts';

/** The strap-ons, each a body of its own when it leaves: its letter, its block, its bearing round the stack (as flight.ts's BOOSTERS). */
export const BOOSTERS: [letter: string, block: string, az: number][] = [
  ['B', 'Б', 0],
  ['V', 'В', 90],
  ['G', 'Г', 180],
  ['D', 'Д', 270],
];

export { G0 };
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
export const MOLODTSOV =
  'Molodtsov (OKB-1), «История проектирования корабля "Восток"», Космический альманах No. 5, 2001 (epizodsspace.narod.ru/bibl/akiem/5v-vostok.html): secondary';
export const BOBKOV = 'Bobkov (OKB-1), «Космический корабль "Восток"», Krylya Rodiny 1991 No. 4 and 6: secondary';
export const GCTC = 'Gagarin Cosmonaut Training Centre, «Корабль "Восток"» (gctc.ru): secondary, unsigned';

/**
 * How an RD-107's or RD-108's expansion was reached, none being found in print: from Energomash's own figures in the table
 * (`ENERGOMASH`), the exits' area `exits` m^2, the flow `flow` kg/s and the throat `throat` m^2 that give `ratio`. For the
 * nozzle's figures (plan.ts `Nozzle`), which only the fire's shape reads (viewer/plume.ts).
 */
const nozzleWork = (exits: number, flow: number, throat: number, ratio: number): string =>
  `worked out from the table’s own figures: the exits’ area is the thrust lost at sea level over one atmosphere (${exits} m^2), ` +
  `the throat’s is the flow (${flow} kg/s, vacuum thrust over specific impulse) times an estimated c* of 1,750 m/s over the chamber’s pressure (${throat} m^2), ` +
  `so ${ratio}:1. Estimated: c* is kerosene and oxygen’s in general, not this engine’s, and the steering chambers are counted in with the main ones`;

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
  nozzle: {
    chamber: doc(5_850_000, `${ENERGOMASH}: 5.85 MPa`),
    expansion: estimated(18.4, nozzleWork(1.794, 325.1, 0.0972, 18.4)),
    exit: estimated(32_900, 'the chamber’s 5.85 MPa expanded isentropically, gamma 1.2, through the estimated 18.4:1: 0.32 atmosphere'),
  },
  thrust: {
    seaLevel: doc(815_900, `${ENERGOMASH}: 815.9 kN. Minakov’s table: 82 tf (804 kN)`),
    vacuum: doc(997_700, `${ENERGOMASH}: 997.7 kN`),
  },
  isp: {
    seaLevel: doc(2510 / G0, `${ENERGOMASH}: 2,510 N·s/kg (256 s)`),
    vacuum: doc(3069 / G0, `${ENERGOMASH}: 3,069 N·s/kg (313 s)`),
  },
  ignition: estimated(
    0,
    'lit on the pad before liftoff, through a preliminary and an intermediate stage of thrust (Gagarin’s report); how many seconds before has not been read, and the propellant burned before liftoff is not known',
  ),
  start: {
    count: 1,
    ground: true,
    confidence: 'documented',
    source:
      'each of the 32 chambers lit by its own pyrotechnic igniter on a wooden stand pushed up the nozzle from the pad (Energia’s history: «в каждой из 32 камер сгорания»; vostok-8k72k.md; Terekhov, «32 березовые палки…», Habr, 2016: two pyrotechnic charges on a T-shaped wooden stand, «Одноразовость»): nothing aboard could light it again, which is an inference, no page saying so',
  },
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
  nozzle: {
    chamber: doc(5_100_000, `${ENERGOMASH}: 5.10 MPa`),
    expansion: estimated(18.9, nozzleWork(1.985, 306.1, 0.105, 18.9)),
    exit: estimated(27_800, 'the chamber’s 5.10 MPa expanded isentropically, gamma 1.2, through the estimated 18.9:1: 0.27 atmosphere'),
  },
  thrust: {
    seaLevel: doc(744_300, `${ENERGOMASH}: 744.3 kN. Minakov’s table: 81.2 tf`),
    vacuum: doc(945_400, `${ENERGOMASH}: 945.4 kN`),
  },
  isp: {
    seaLevel: doc(2432 / G0, `${ENERGOMASH}: 2,432 N·s/kg (248 s)`),
    vacuum: doc(3089 / G0, `${ENERGOMASH}: 3,089 N·s/kg (315 s)`),
  },
  ignition: estimated(0, 'lit on the pad with the strap-ons, as theirs'),
  start: {
    count: 1,
    ground: true,
    confidence: 'documented',
    source:
      'each of the 32 chambers lit by its own pyrotechnic igniter on a wooden stand pushed up the nozzle from the pad (Energia’s history: «в каждой из 32 камер сгорания»; vostok-8k72k.md; Terekhov, «32 березовые палки…», Habr, 2016: two pyrotechnic charges on a T-shaped wooden stand, «Одноразовость»): nothing aboard could light it again, which is an inference, no page saying so',
  },
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
  nozzle: {
    chamber: doc(5_000_000, `${ASTRONAUTIX}: 5.0 MPa. Russian Wikipedia has 5.85 (vostok-8k72k.md, Engines)`),
    expansion: doc(79.4, `${ASTRONAUTIX}: area ratio 79.4 (vostok-8k72k.md, the RD-0109)`),
    exit: estimated(
      4_390,
      'the chamber’s 5.0 MPa expanded isentropically through 79.4:1 as a gas of gamma 1.2 (kerosene and oxygen’s in general, not this engine’s): 0.043 atmosphere. It burns above the air, where its jet is drawn as wide as a jet is drawn whatever this is',
    ),
  },
  thrust: { vacuum: doc(54_500, 'Brügge: 54.5 kN; Astronautix 54.52 kN: secondary') },
  isp: { vacuum: doc(3172 / G0, 'Brügge: 3,172 N·s/kg (323.5 s); Astronautix 324 s: secondary') },
  start: {
    count: 1,
    ground: false,
    confidence: 'estimated',
    source:
      'once, in flight. How the RD-0109 was started (its turbine’s starter, its igniter) is NOT FOUND in anything read; Chertok (Rockets and People, vol. 2, p. 438) has the worry of the day, whether “ignition and startup would be reliably ensured in space”. One start is what every account implies',
  },
  // Hot staging: lit through the open lattice with the core still on (vostok-8k72k.md, "Staging"; the cyclogram's start
  // command at 311.74 s a second before the core's main command at 312.74 s: mission.md, "The 2011 documents")
  hot: {
    open: estimated(
      0.67,
      'of the lattice’s side, the model’s: 24 struts 64 mm across and 1.22 m long, two rings 60 mm deep and 24 feet on a cylinder 1.25 m in radius and 1.26 m high block 3.2 of its 9.9 m² (upper.py `build_interstage`, whose stations are estimated from photographs)',
    ),
    turn: estimated(
      24,
      'degrees below the level that the jet leaves the deflector at: its cone’s outer face, 320 mm down over 710 mm out (upper.py, estimated from photographs). What escapes pushes the stack by the sine of it; the turn taken as losing no speed, so this is the most it could be',
    ),
    endures: estimated(
      5,
      'seconds of the third stage’s full thrust the heat shield on the core’s top stands: NOT FOUND. It is there to protect the stage’s top and turn the jet out across the flight (Volkhonsky, lecture notes on launcher design, Moscow 2012: «Для защиты верхнего днища предыдущей ступени на нем устанавливается теплозащитный экран»); on Soyuz it is a titanium-covered cone over the instrument bay on the oxidiser tank (RussianSpaceWeb, “Stage II of Soyuz rocket”). The plan gave it about a second (the start command at 311.74 s, the core’s main command at 312.74 s and the separation after it); Soyuz 18a’s stack stayed joined about two seconds under its third stage’s thrust, and nothing burst (RussianSpaceWeb, “Soyuz 18-1”, from Energia’s history). Five seconds, a few times that, chosen',
    ),
  },
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
export const VERTICAL: Measure = estimated(
  15,
  `${SOYUZ}: within half a degree of the vertical at 19 s and 3.3 degrees off it at 29 s. The 8K72K’s own programme has not been found; its boosters reached their main stage of thrust 6 s after liftoff (as Sputnik’s did: ${SPUTNIK})`,
);
/** How long the pitch-over takes: chosen. */
export const KICK: Measure = estimated(10, 'how long the pitch-over takes: chosen. Its angle is solved, not chosen (staged.ts: steer)');

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
          points: CURVE.map(([x, y]): [number, number] => [x, y]), // (each its own: one changed is not the other)
          confidence: 'estimated',
          source:
            'NOT FOUND for any R-7: no drag figure against Mach number for the 8K72K, the R-7 or Soyuz was found (mission.md). A curve of the usual form for a slender clustered vehicle on its frontal area, chosen: a transonic rise to 0.5 and falling to 0.2 at Mach 8. tests/staged.test.mjs says what ±30 % of it moves',
        },
      },
      {
        until: day.lastCutoff,
        area: derived(6.835, 'the core seen end on, 2.95 m (Minakov): Block E and the fairing are narrower'),
        curve: {
          points: CURVE.map(([x, y]): [number, number] => [x, y]), // (each its own: one changed is not the other)
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
        q: estimated(
          1_000,
          'Pa: NOT FOUND for the 8K72K. Let go at 154.6 s, where the ascent flown has 0.15 kPa: two halves on hinges at the foot, made to swing open in air too thin to throw them back. Soyuz-2 lets its fairing go once the air’s heating is under 1,135 W/m² (Arianespace, Soyuz CSG User’s Manual, issue 2, 2012, §3.4.3.2): another vehicle’s rule. A kilopascal, chosen',
        ),
        covers: true,
      },
    ],
    // For the live vehicle flown by hand (src/sim/stagedlive.ts): how hard its steering chambers turn it. No figure read.
    steering: {
      authority: estimated(
        5,
        'deg/s² at full throw, about each axis: NOT FOUND. Of the order the steering chambers give: the core’s four of 2.5 tf (RKK Energia 1946–1996) and the strap-ons’ eight, swung, ' +
          '15 m or so from the centre of mass of a stack of 287 t and 30 m (about 2 × 10⁷ kg m² as a rod), a few degrees a second squared; taken as the same on every stage and at every mass, which it was not',
      ),
    },
    // For the scene: where the spacecraft's centre of mass is, and what leaves as a body of its own (sim/shed.ts). Stations
    // are metres above the main nozzles' exits, as vostok-8k72k.md has them. Every drag figure is estimated; so is every
    // centre and gyration, from the stations and masses there.
    centre: estimated(
      1.6,
      'the spacecraft’s centre of mass above its station 0 (the braking nozzle): about the instrument module’s top and the ball’s bottom, from the stations of vostok-3ka.md',
    ),
    // What the spacecraft's escape did if the launch vehicle failed, by when, and what of it the deck flies (`escape`)
    aborts: [
      {
        until: doc(
          40,
          `${MOLODTSOV}: «до 40-й секунды по команде, подаваемой по командной радиолинии, производится аварийное катапультирование космонавта»; ${SIDDIQI}, p. 252`,
        ),
        does: 'the pilot ejected from the spacecraft on a radio command from the ground (the first 15 to 20 seconds had no satisfactory answer, Molodtsov writes)',
        // (nothing said of the engines: the ejection alone)
        escape: { eject: {} },
      },
      {
        until: doc(
          150,
          `${MOLODTSOV}: «с 40-й по 150-ю секунду происходит аварийное выключение двигателей ракеты-носителя и при снижении падающей ракеты до 7 км производится аварийное катапультирование»`,
        ),
        does: 'the launch vehicle’s engines were shut down and the pilot ejected as it fell through 7 km',
        escape: {
          cut: true,
          eject: {
            falling: doc(
              7_000,
              `${MOLODTSOV}: «при снижении падающей ракеты до 7 км производится аварийное катапультирование»: a height the barometric switch read, taken above the sea`,
            ),
          },
        },
      },
      {
        until: doc(
          700,
          `${MOLODTSOV}: «со 150-й по 700-ю секунду от концевых контактов гироприборов происходит аварийное выключение двигателей», and the descent module separates`,
        ),
        does: 'the gyroscopes’ limit contacts shut the engines down and the descent module separated, to come down as from orbit',
        escape: { cut: true, separate: { entry: true } },
      },
      {
        until: doc(730, `${MOLODTSOV}: «с 700-й по 730-ю секунду» the third stage shut down and the whole spacecraft separated`),
        does: 'the third stage was shut down and the whole spacecraft separated',
        escape: { cut: true, separate: {} },
      },
    ],
    // What the structure stands (src/sim/stagedlive.ts, by sim/loads.ts's rule). No figure for the R-7 has been read.
    limits: {
      qAlpha: estimated(
        3_340,
        'Pa rad: NOT FOUND for the R-7. Soyuz-2 is held to 3 degrees off the wind about its greatest dynamic pressure, 34 to 45 kPa (Shakmaev et al., Инженерный журнал 2024 No. 3, Table 1: another vehicle’s tolerance, not a strength), which is 2.4 kPa rad; with a half again for strength over the tolerance it is the 4,000 lb/sq ft degrees (3,340 Pa rad) the launch vehicles of the time are credited with, the figure Freedom 7’s Redstone is given (mr-3-freedom-7/flight.ts). The ascent flown meets 1.0 kPa rad in the day’s wind',
      ),
      axial: estimated(
        6,
        'g along the axis: NOT FOUND. The record’s greatest were 4.4 before the strap-ons were cut and 4.2 before the core was (NIIP-5’s report, NK p. 4; Soyuz-2’s are under 4.3: its manual, §3.2.1); the ascent flown reaches 4.7. A quarter over that, chosen',
      ),
    },
    sheds: sheds(day.left),
    checks: day.checks,
  };
}

/** The flight model’s two fairing halves, round hatch No. 1 (135° in the model). Each carries
 * half the shell’s estimated mass and drag. Their transverse speed and mass distribution were not measured. */
export const FAIRING_HALVES = ['Left', 'Right'] as const;
export const MODULE_DRIFT = estimated(
  0.5,
  'scene approximation for the free instrument module after its final connection goes; the relative speed was not found',
);
export function fairingDrops(at: number) {
  return FAIRING_HALVES.map((side) => ({ at, on: `fairing/${side}`, nodes: [`Fairing_${side}`] }));
}
export function fairingHalves(shell: ShedBody & { mass: Measure }): ShedBody[] {
  return shellSectors(shell, FAIRING_HALVES, 135);
}

/** Equal cylindrical sectors. Their radial centroid is r sin(π/n)/(π/n) for thin uniform walls. */
export function shellSectors(shell: ShedBody & { mass: Measure }, pieces: readonly string[], firstBearing: number): ShedBody[] {
  const n = pieces.length;
  const sector = Math.PI / n;
  const share = (m: Measure) => estimated(m.value / n, `assumed equal shares for ${n} pieces; complete assembly: ${m.source}`);
  return pieces.map((piece, i) => ({
    ...shell,
    on: `${shell.on}/${piece}`,
    name: `${shell.name}, ${piece}`,
    mass: share(shell.mass),
    ahead: share(shell.ahead),
    astern: share(shell.astern),
    side: { ...shell.side, dragArea: share(shell.side.dragArea) },
    sideways: {
      sectorDegrees: 360 / n,
      bearing: firstBearing + (i * 360) / n,
      across: estimated(
        (shell.radius.value * Math.sin(sector)) / sector,
        'centroid of an equal thin cylindrical sector; actual taper and fittings differ',
      ),
      speed: estimated(2, 'outward speed chosen for the separated pieces in the scene; measured ejection speed was not found'),
    },
  }));
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
      on: `stage:0/${letter}`,
      name: `Strap-on Block ${block} (${letter})`,
      from: doc(0, 'the main nozzles’ exits (vostok-8k72k.md)'),
      to: doc(19.8, `${ZAK}; Brügge: 19.8 m with the nozzles`),
      radius: doc(1.34, `${MINAKOV}: 2.68 m across`),
      mass: left.booster,
      centre: estimated(8, 'about two fifths up a strap-on, empty: its engine and tail are the heaviest part'),
      gyration: {
        roll: estimated(0.9, 'a shell 1.34 m in radius with its engine on the axis'),
        across: estimated(6, 'a 19.8 m block, its mass low'),
      },
      ahead: estimated(4.5, 'its tip, 5.6 m², at 0.8'),
      astern: estimated(5.6, 'its tail, 5.6 m², at 1.0'),
      side: {
        dragArea: estimated(35, '19.8 m × 2 m on average, at 0.9'),
        from: doc(0, 'the body’s own stretch, as above'),
        to: doc(19.8, 'the body’s own stretch, as above'),
      },
      // the vent: on the inner side of the cone, its jet at 45° to the axis and forward, so its push is back and away
      // from the core (Zak, RussianSpaceWeb, Soyuz MS-10; Modelist-Konstruktor); opened as the ball leaves its socket
      motors: [
        {
          name: 'oxidizer tank vent',
          thrust: estimated(
            3_000,
            'N: NOT FOUND. The tank’s ullage gas, a few bar, through a nozzle of the order of 10 cm: some kilonewtons, falling as the tank empties (taken as steady)',
          ),
          burn: estimated(6, 's: NOT FOUND: until the tank’s pressure has gone'),
          cant: derived(
            135,
            'degrees from the strap-on’s +X toward its outward +Z: the jet at 45° to the axis and forward (Zak), so its push is 45° back of outward',
          ),
          station: estimated(16, 'the oxidizer tank’s top, under the cone (vostok-8k72k.md has the tank above the fuel’s)'),
        },
      ],
      apart: {
        bearing: az,
        across: derived(2.78, 'its axis at the base, from the stack’s (vostok-8k72k.md)'),
        pivot: {
          station: estimated(19.5, 'the ball at its tip, a little under the cone’s point (the model: 19.9 m with the nozzles)'),
          across: estimated(1.3, 'the ball in its socket on the core’s skin, under the core’s upper tank (the model)'),
        },
        tailOff: estimated(
          100_000,
          'N: NOT FOUND. The RD-107 was cut from its last throttle level as the ties went; what was left as it swung, a tenth of its rated thrust, is taken',
        ),
        swing: estimated(3, 'degrees: NOT FOUND: how far the tail swings before the ball rolls out of its socket'),
      },
    })),
    ...fairingHalves({
      on: 'fairing',
      name: 'The fairing',
      from: derived(31.73, 'on Block E’s adapter: 28.75 m (core with lattice) + 2.98 m (Block E with adapter), Minakov'),
      to: doc(38.36, `${MINAKOV}: the whole vehicle’s length`),
      radius: doc(1.35, `${MINAKOV}: 2.7 m across`),
      mass: doc(800, `${ZAK}: 0.8 t; Brügge 0.64 t. total for both halves`),
      centre: estimated(34.5, 'a little below the middle of a shell that narrows to its tip'),
      gyration: { roll: estimated(1.1, 'a thin shell 1.35 m in radius'), across: estimated(2, 'a 6.6 m shell') },
      ahead: estimated(2.5, 'its nose, 5.7 m², at 0.45'),
      astern: estimated(6, 'its open foot, at 1.0'),
      side: {
        dragArea: estimated(18, '6.6 m × 2.7 m at 1.0'),
        from: derived(31.73, 'the body’s own stretch, as above'),
        to: doc(38.36, 'the body’s own stretch, as above'),
      },
    }),
    {
      on: 'stage:1',
      name: 'Block A, the core',
      from: doc(0, 'the main nozzles’ exits'),
      to: doc(28.75, `${MINAKOV}: the core with its lattice`),
      radius: doc(1.475, `${MINAKOV}: 2.95 m across`),
      mass: left.core,
      centre: estimated(9, 'below its middle: the engine and the empty tanks’ lower half'),
      gyration: { roll: estimated(1.0, 'a shell 1.2 to 1.5 m in radius'), across: estimated(8, 'a 28.75 m block') },
      ahead: estimated(4, 'its lattice end, 5.2 m², at 0.8'),
      astern: estimated(5, 'its tail, 3.3 m², and the engine, at 1.5'),
      side: {
        dragArea: estimated(70, '28.75 m × 2.5 m on average, at 1.0'),
        from: doc(0, 'the body’s own stretch, as above'),
        to: doc(28.75, 'the body’s own stretch, as above'),
      },
    },
    {
      on: 'stage:2',
      name: 'Block E, the third stage',
      from: doc(28.75, `${MINAKOV}: on the lattice’s top`),
      to: derived(31.73, 'its adapter’s rim, 2.98 m higher (Minakov)'),
      radius: doc(1.29, `${MINAKOV}: 2.58 m across`),
      mass: left.blockE,
      centre: estimated(29.8, 'the engine in its tanks’ ring, low in the stage'),
      gyration: { roll: estimated(0.9, 'ring tanks 1.29 m in radius'), across: estimated(1, 'a stage 3 m long') },
      push: estimated(
        1,
        'not found: the spacecraft left Block E’s adapter on pushers (spacecraft.md: four of them), at a speed nothing read gives; 1 m/s apart, of the order spring pushers give, is chosen. Block E’s venting of what was left in its tanks after cutoff, which would have moved it further, is not modelled',
      ),
      ahead: estimated(5, 'its adapter’s open rim, at 1.0'),
      astern: estimated(5, 'its base, at 1.0'),
      side: {
        dragArea: estimated(8, '3 m × 2.6 m at 1.0'),
        from: doc(28.75, 'the body’s own stretch, as above'),
        to: derived(31.73, 'the body’s own stretch, as above'),
      },
    },
    {
      on: 'modules',
      name: 'The instrument module and braking engine',
      push: MODULE_DRIFT,
      from: derived(30.53, 'the spacecraft’s station 0, the braking nozzle (vostok-8k72k.md)'),
      to: estimated(32.8, 'the instrument module’s top, from RKK Energia’s drawing as vostok-3ka.md has it'),
      radius: estimated(1.25, 'its widest, 2.43 m (Siddiqi)'),
      mass: doc(2_265, `${BOBKOV}: the instrument module, 2.265 t`),
      centre: estimated(31.5, 'the middle of its two cones'),
      gyration: { roll: estimated(0.8, 'two cones 1.2 m in radius'), across: estimated(0.8, 'two cones 2.3 m long') },
      ahead: estimated(3, 'its concave top, 4.6 m², at 0.7'),
      astern: estimated(3, 'its base, at 0.7'),
      side: {
        dragArea: estimated(5, '2.3 m × 2.2 m at 1.0'),
        from: derived(30.53, 'the body’s own stretch, as above'),
        to: estimated(32.8, 'the body’s own stretch, as above'),
      },
    },
  ];
}

const LPRE = 'lpre.de, the RD-107 and RD-108, citing Gakhun';

/**
 * An engine's turbine exhaust: the spent steam and oxygen of the peroxide gas generator, out through two ducts down the
 * middle between the chambers (vostok-8k72k.md, "Parts in the model": that there are two, and where, is estimated; the
 * viewer finds each mouth in the ducts' geometry). Its figures are lpre.de's for the engine; 8.8 kg/s at 450 m/s is
 * 4.0 kN of the gas's momentum, so the 7 kN given takes its pressure at the mouth too, or a faster gas: as given.
 */
const TURBINE: Omit<JetDef, 'node' | 'when'> = {
  gas: 'steam',
  thrust: doc(7_000, `N: ${LPRE}: the turbine’s exhaust gives 7 kN`),
  flow: doc(8.8, `kg/s: ${LPRE}`),
  speed: doc(450, `m/s: ${LPRE}`),
  exit: estimated(
    101_325,
    'Pa: NOT FOUND. At 450 m/s steam at some 400 °C is under the speed of sound in it (about 620 m/s), so a pipe lets it out at the pressure round it, the sea’s; as the air thins the pipe chokes and holds it near that',
  ),
};

/**
 * What leaves the 8K72K that is not an engine's fire (`ModelDef.jets`, viewer/jets.ts), from the nodes the model gives
 * them (vostok-8k72k.md, "Parts in the model"): each engine's turbine exhaust while its engine runs, and each strap-on's
 * oxygen vent from its separation, for as long and as hard as the simulator flies the vent's push (`sheds`: the
 * strap-on's motor, whose thrust and burn the viewer reads there). The plan's ids are vehicles/vostok-plan.ts's: a
 * stage's engine is `stage:<i>`, base first.
 */
export const LAUNCHER_JETS: JetDef[] = [
  ...BOOSTERS.map(([letter]): JetDef => ({ node: `RD107_${letter}_TurbineExhaust`, ...TURBINE, when: { with: 'stage:0' } })),
  { node: 'RD108_TurbineExhaust', ...TURBINE, when: { with: 'stage:1' } },
  ...BOOSTERS.map(
    ([letter]): JetDef => ({
      node: `Booster_${letter}_Vent`,
      gas: 'oxygen',
      radius: estimated(0.04, 'm: half the bore, 80 mm (vostok-8k72k.md, "Parts in the model"): NOT FOUND'),
      exit: estimated(
        240_000,
        'Pa: NOT FOUND. A plain nozzle lets its gas out at about half the pressure behind it; the 3 kN the simulator gives a vent through the 80 mm bore is some 4.6 bar in the tank at a thrust coefficient of 1.3, so 2.4 bar at the mouth',
      ),
      when: { shed: `stage:0/${letter}`, motor: 'oxidizer tank vent' },
    }),
  ),
];

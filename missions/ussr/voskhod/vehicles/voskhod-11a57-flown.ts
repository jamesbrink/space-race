/**
 * The Voskhod launch vehicle, 11A57, as the orbital simulator flies it (src/sim/staged.ts): what both vehicles of the type that
 * carried a crew had, said once for Voskhod 1 and Voskhod 2. The core and the four strap-ons are the Vostok-K's blocks with
 * engines of a later issue (voskhod-11a57.md); what is the 8K72K's and did not change is taken from vostok-8k72k.ts and says
 * so, and what is the 11A57's own is here: the strap-ons' and the core's thrusts, Block I in place of Block E, its aft section,
 * the fairing's stations, and no escape system. A flight gives its own day (`Staging`, `Ascent11A57`) as a Vostok's does.
 */

import type { Guidance } from '../../../../src/sim/orbital.ts';
import type { AscentCheck, AscentRecord, StageRecord } from '../../vostok/vehicles/vostok-record.ts';
import type { Measure, ShedBody } from '../../../../src/types.ts';
import { assumed, derived, doc, estimated } from '../../../../src/measure.ts';
import {
  ascent8K72K,
  BLOCK_E,
  CORE,
  coreThrottle,
  G0,
  MINAKOV,
  SIDDIQI,
  STRAP_ONS,
  strapOnThrottle,
  ZAK,
} from '../../vostok/vehicles/vostok-8k72k.ts';
import { THRUST } from './voskhod-11a57.ts';

export { SIDDIQI, ZAK, G0 };
const BRUGGE = 'Brügge’s table for the 11A57 (b14643.eu): secondary, and uncited figure by figure';

type Hardware = Omit<StageRecord, 'cutoff' | 'separation' | 'throttle' | 'velocity'>;

/** NPO Energomash's table of the RD-107 and RD-108 by engine, as Brügge reproduces it (b14643.eu, Semyorka/Propulsion/history). */
const ENERGOMASH_ROWS = 'NPO Energomash’s table by engine, as reproduced by Brügge (b14643.eu, Semyorka/Propulsion/history): secondary';
const VARFOLOMEYEV = 'Varfolomeyev, “Soviet rocketry that conquered space”, Part 10, Spaceflight 42 (April 2000)';
const KBKHA = 'KBKhA (the engine’s maker), «РД0107, РД0108, РД0110», kbkha.ru, as archived in November 2011';
/** The 8K72K's block, taken for the 11A57's: the same block with an engine of a later issue (voskhod-11a57.md). */
const asBlock = (m: Measure, what: string): Measure =>
  assumed(m.value, `the Vostok-K’s ${what}, taken for the 11A57’s, the same block (voskhod-11a57.md): ${m.source}`);

/**
 * Blocks B, V, G and D: the 8K72K's, with the RD-107 of a later issue. Varfolomeyev has the strap-ons "an improved version of
 * the RD-107 motor designated 8D728" for the Voskhods, and Brügge's 11A57 table their thrust at the ground as the 8D728's.
 */
export const STRAP_ONS_11A57: Hardware = {
  ...STRAP_ONS,
  engine: 'RD-107 (8D728)',
  mass: asBlock(STRAP_ONS.mass, 'strap-on fuelled'),
  dry: asBlock(STRAP_ONS.dry, 'strap-on empty'),
  propellant: asBlock(STRAP_ONS.propellant, 'strap-on’s load'),
  nozzle: { ...STRAP_ONS.nozzle! },
  thrust: {
    seaLevel: doc(
      THRUST.strapOn.value,
      `${ENERGOMASH_ROWS}, the 8D728: 819.1 kN, as ${BRUGGE} has it for the 11A57’s. ${VARFOLOMEYEV}: the 8D728 on the Voskhods`,
    ),
    vacuum: doc(1_000_700, `${ENERGOMASH_ROWS}, the 8D728: 1,000.7 kN`),
  },
  isp: {
    seaLevel: doc(2520 / G0, `${ENERGOMASH_ROWS}, the 8D728: 2,520 N·s/kg (257 s)`),
    vacuum: doc(3079 / G0, `${ENERGOMASH_ROWS}, the 8D728: 3,079 N·s/kg (314 s)`),
  },
};

/**
 * Block A: the 8K72K's core, its RD-108 of a later issue: the 8D727K's figures, whose 79.3 tf at the ground (Varfolomeyev,
 * Part 9: "Sea-level thrust had increased from 75.8 to 79.3 t") is Brügge's 777.8 kN for the 11A57's core.
 */
export const CORE_11A57: Hardware = {
  ...CORE,
  engine: 'RD-108 (8D727K)',
  mass: asBlock(CORE.mass, 'core fuelled'),
  dry: asBlock(CORE.dry, 'core empty'),
  propellant: asBlock(CORE.propellant, 'core’s load'),
  nozzle: {
    ...CORE.nozzle!,
    chamber: doc(
      5_350_000,
      `${ENERGOMASH_ROWS}, the 8D727K: 5.35 MPa (the 8K72K’s RD-108, 5.10). Its expansion and exit are the 8K72K’s estimates, kept`,
    ),
  },
  thrust: {
    seaLevel: doc(THRUST.core.value, `${ENERGOMASH_ROWS}, the 8D727K: 777.8 kN, as ${BRUGGE} has it for the 11A57’s core`),
    vacuum: doc(971_400, `${ENERGOMASH_ROWS}, the 8D727K: 971.4 kN`),
  },
  isp: {
    seaLevel: doc(2481 / G0, `${ENERGOMASH_ROWS}, the 8D727K: 2,481 N·s/kg (253 s)`),
    vacuum: doc(3099 / G0, `${ENERGOMASH_ROWS}, the 8D727K: 3,099 N·s/kg (316 s)`),
  },
};

/** Block I's aft section, the skirt round its engine let go after the stage has lit: its mass, which Block I's figure includes. */
export const AFT_MASS: Measure = estimated(
  250,
  'NOT FOUND: a skirt of light alloy 2.66 m across and some 2 m long (16 m² of skin and its frames), by judgement',
);

/** Block I: the third stage, its RD-0108 lit through the lattice with the core still on. The flight gives when. */
export const BLOCK_I: Omit<Hardware, 'ignition'> = {
  name: 'Third stage, Block I',
  count: 1,
  engine: 'RD-0108 (8D715P)',
  nodes: ['BlockI'],
  mass: derived(
    26_060 - AFT_MASS.value,
    `${BRUGGE}: 26.06 t for the stage, less its aft section (AFT_MASS, estimated), which leaves on its own. No figure of the stage as it flew in 1964 was found: McDowell’s catalogue of stages has 23.7 t and 2,350 kg empty for "11A57I", Encyclopedia Astronautica 24.3 t and 2.0 t, and Brügge names the later RD-0110 beside his`,
  ),
  dry: derived(26_060 - AFT_MASS.value - 22_980, 'the stage’s mass less its load, both as above: 3.08 t with its aft section'),
  propellant: doc(22_980, `${BRUGGE}: 22.98 t, which at the maker’s flow burns 246 s, his 247 s. Zak gives today’s stage 22.5 to 22.8 t`),
  nozzle: {
    chamber: doc(6_800_000, `${KBKHA}: «Давление в камере, кгс/см² (МПа) 69,5 (6,8)»`),
    expansion: estimated(
      70,
      'NOT FOUND for the RD-0108: an engine made to start in thin air at 6.8 MPa; 70:1 taken (the RD-0109’s is 79.4)',
    ),
    exit: estimated(
      7_000,
      'the chamber’s 6.8 MPa expanded isentropically through the estimated 70:1 as a gas of gamma 1.2: 0.07 atmosphere',
    ),
  },
  thrust: {
    vacuum: doc(
      298_000,
      `${KBKHA}: «Тяга в пустоте, тс (кН) 30,38 (298)»; Siddiqi, Challenge to Apollo, p. 410, note 4: "a vacuum thrust of 30.4 tons"`,
    ),
  },
  isp: { vacuum: doc(3195 / G0, `${KBKHA}: «Удельный импульс тяги в пустоте, кгс·с/кг (м/с) 326 (3195)»`) },
  start: {
    ...BLOCK_E.start!,
    source:
      'once, in flight: how the RD-0108 was started is NOT FOUND in anything read, as the RD-0109’s is not (vostok-8k72k.ts); one start is what every account implies',
  },
  hot: {
    open: assumed(
      BLOCK_E.hot!.open.value,
      `the 8K72K’s lattice, taken (voskhod-11a57.md: the 11A57’s was not found). Lit at 290 s, the core cut loose with it (Kamanin, 6 October 1964, of Kosmos 47): that it was lit hot, through an open lattice, is today’s Soyuz’s (Zak) and the 8K78’s (Varfolomeyev, Part 4: "A stronger open truss structure was mounted on top of the core unit A"). ${BLOCK_E.hot!.open.source}`,
    ),
    turn: assumed(BLOCK_E.hot!.turn.value, `the 8K72K’s deflector, taken. ${BLOCK_E.hot!.turn.source}`),
    endures: BLOCK_E.hot!.endures,
  },
};

/** When a flight's stages were lit, cut and let go, as its own record has them. */
export interface Staging {
  boosters: { cutoff: Measure; separation: Measure };
  core: { cutoff: Measure; separation: Measure };
  third: { ignition: Measure; cutoff: Measure; separation: Measure };
}

/** The three stages of a flight on the 11A57, in order (orbital.ts `stages`); the throttles the type's readings (vostok-8k72k.ts). */
export function stages11A57(day: Staging): StageRecord[] {
  const { boosters, core, third } = day;
  return [
    { ...STRAP_ONS_11A57, throttle: strapOnThrottle(boosters.separation.value), cutoff: boosters.cutoff, separation: boosters.separation },
    { ...CORE_11A57, throttle: coreThrottle(core.cutoff.value), cutoff: core.cutoff, separation: core.separation },
    { ...BLOCK_I, ignition: third.ignition, cutoff: third.cutoff, separation: third.separation },
  ];
}

/** Stations on the 11A57, m above the main nozzles' exits (voskhod-11a57.md, "Dimensions"). */
const LATTICE_TOP = 28.75;
const ADAPTER_TOP = 37.8;
const TIP = 44.155;
/** The spacecraft's station 0 (its braking nozzle) on the stack: voskhod-11a57.ts `BASE`. */
const SHIP_0 = 36.6;

/** What a flight's own run leaves in each block it lets go, for the scene's spent bodies: the flight's. */
export interface Left {
  booster: Measure;
  core: Measure;
  blockI: Measure;
}

/** A flight's ascent on the 11A57 (orbital.ts `ascent`). */
export interface Ascent11A57 {
  guidance: Guidance;
  boostersGo: Measure;
  lastCutoff: Measure;
  fairing: Measure;
  /** When Block I's aft section was let go, and what it weighed. */
  aft: { at: Measure; mass: Measure };
  left: Left;
  checks: AscentCheck[];
}

/**
 * A flight's ascent on the 11A57: the 8K72K's drag, steering, limits and spent strap-ons and core (the same blocks), with the
 * 11A57's own fairing, aft section, Block I and spacecraft stations, and the escape it did not have.
 */
export function ascent11A57(day: Ascent11A57): AscentRecord {
  const vostok = ascent8K72K({
    guidance: day.guidance,
    boostersGo: day.boostersGo,
    lastCutoff: day.lastCutoff,
    fairing: day.fairing,
    left: { booster: day.left.booster, core: day.left.core, blockE: day.left.blockI },
    checks: day.checks,
  });
  const fairing = vostok.drops.find((d) => d.id === 'fairing')!;
  const kept = (vostok.sheds ?? []).filter((s) => s.on.startsWith('stage:0/') || s.on === 'stage:1');
  return {
    ...vostok,
    drops: [
      {
        ...fairing,
        mass: assumed(
          fairing.mass.value,
          `the Vostok-K’s fairing, ${fairing.mass.source}: the 11A57’s is a different fairing (a cone and cylinder 6.36 m long, voskhod-11a57.md) whose mass was not found`,
        ),
      },
      { id: 'aft-section', at: day.aft.at, mass: day.aft.mass },
    ],
    // what the ship's centre of mass is above its braking nozzle: the Vostok's ship's, the ball 0.5 t heavier and the reserve engine on top
    centre: estimated(
      1.8,
      'the spacecraft’s centre of mass above its station 0 (the braking nozzle): the Vostok’s 1.6 m, raised for the ball’s half tonne more and the reserve engine on its pole (vostok-3ka.md; voskhod.md)',
    ),
    // no escape: what the record says of a failure of the launch vehicle, by when (said on the deck's card, not flown)
    aborts: [
      {
        until: doc(
          27,
          'Kamanin, 14 September 1964: «до 27-й секунды полета спасение экипажа фактически невозможно» (README); OKB-1’s plan has it "difficult" to the 25th to 44th second (Siddiqi, Challenge to Apollo, p. 411)',
        ),
        does: 'nothing: no escape tower, no ejection seats and no suits. The crew could not be saved',
      },
      {
        until: doc(44, 'Kamanin, 14 September 1964: «с 27-й по 44-ю секунду — трудно, но возможно» (README); Siddiqi, p. 411'),
        does: 'the ship cut loose to come down on its own parachutes: "difficult but possible"',
      },
      {
        until: doc(
          523,
          'Siddiqi, p. 411: after that the ship would be separated and come down by its own parachutes (voskhod-11a57.md, "No escape system")',
        ),
        does: 'the engines shut down and the ship separated, to come down by its own parachutes',
      },
    ],
    sheds: [
      ...kept,
      {
        on: 'fairing',
        name: 'The fairing',
        from: derived(
          ADAPTER_TOP,
          'on Block I’s adapter: the core with its lattice, 28.75 m (Minakov), and the stage with its adapter, 9.05 m (Brügge)',
        ),
        to: derived(TIP, 'the vehicle’s 44.155 m (voskhod-11a57.md)'),
        radius: assumed(1.35, `the Vostok-K’s 2.7 m (${MINAKOV}): voskhod-11a57.md`),
        mass: fairing.mass,
        centre: estimated(40.6, 'a little below the middle of a shell that is a cylinder and a cone'),
        gyration: { roll: estimated(1.1, 'a thin shell 1.35 m in radius'), across: estimated(1.9, 'a 6.4 m shell') },
        ahead: estimated(2.5, 'its nose, 5.7 m², at 0.45'),
        astern: estimated(6, 'its open foot, at 1.0'),
        side: {
          dragArea: estimated(17, '6.4 m × 2.7 m at 1.0'),
          from: derived(ADAPTER_TOP, 'the body’s own stretch, as above'),
          to: derived(TIP, 'the body’s own stretch, as above'),
        },
      },
      {
        on: 'aft-section',
        name: 'Block I’s aft section',
        from: doc(LATTICE_TOP, `${MINAKOV}: on the lattice’s top`),
        to: estimated(LATTICE_TOP + 1.95, 'its 1.95 m in the model (voskhod-11a57.md: estimated)'),
        radius: doc(1.33, `${ZAK}: the stage’s 2.66 m`),
        mass: day.aft.mass,
        centre: estimated(LATTICE_TOP + 1, 'the middle of a skirt'),
        gyration: { roll: estimated(1.3, 'a thin skirt 1.33 m in radius'), across: estimated(1, 'a skirt 2 m long') },
        ahead: estimated(3, 'its open top, at 1.0'),
        astern: estimated(3, 'its open foot, at 1.0'),
        side: {
          dragArea: estimated(5, '1.95 m × 2.66 m at 1.0'),
          from: doc(LATTICE_TOP, 'the body’s own stretch, as above'),
          to: estimated(LATTICE_TOP + 1.95, 'the body’s own stretch, as above'),
        },
      },
      {
        on: 'stage:2',
        name: 'Block I, the third stage',
        from: estimated(LATTICE_TOP + 1.95, 'over its aft section, once that has gone'),
        to: derived(ADAPTER_TOP, 'its adapter’s rim: the stage with its adapter is 9.05 m (Brügge)'),
        radius: doc(1.33, `${ZAK}: 2.66 m across`),
        mass: day.left.blockI,
        centre: estimated(32.5, 'the engine and the empty tanks, low in the stage'),
        gyration: { roll: estimated(1.0, 'tanks 1.3 m in radius'), across: estimated(2.3, 'a stage 7 m long') },
        push: estimated(
          1,
          'not found: the spacecraft left the adapter on pushers at a speed nothing read gives; 1 m/s apart, as the Vostoks’, chosen',
        ),
        ahead: estimated(5, 'its adapter’s open rim, at 1.0'),
        astern: estimated(5, 'its base, at 1.0'),
        side: {
          dragArea: estimated(19, '7 m × 2.66 m at 1.0'),
          from: estimated(LATTICE_TOP + 1.95, 'the body’s own stretch, as above'),
          to: derived(ADAPTER_TOP, 'the body’s own stretch, as above'),
        },
      },
      {
        on: 'modules',
        name: 'The instrument module and braking engine',
        from: derived(SHIP_0, 'the spacecraft’s station 0, the braking nozzle (voskhod-11a57.md)'),
        to: estimated(SHIP_0 + 2.27, 'the instrument module’s top, as the Vostok’s (vostok-3ka.md)'),
        radius: estimated(1.25, 'its widest, 2.43 m (Siddiqi)'),
        mass: assumed(2_265, 'the Vostok’s instrument module, 2.265 t (Bobkov): the 3KV’s was not found'),
        centre: estimated(SHIP_0 + 1, 'the middle of its two cones'),
        gyration: { roll: estimated(0.8, 'two cones 1.2 m in radius'), across: estimated(0.8, 'two cones 2.3 m long') },
        ahead: estimated(3, 'its concave top, 4.6 m², at 0.7'),
        astern: estimated(3, 'its base, at 0.7'),
        side: {
          dragArea: estimated(5, '2.3 m × 2.2 m at 1.0'),
          from: derived(SHIP_0, 'the body’s own stretch, as above'),
          to: estimated(SHIP_0 + 2.27, 'the body’s own stretch, as above'),
        },
      },
    ] satisfies ShedBody[],
  };
}

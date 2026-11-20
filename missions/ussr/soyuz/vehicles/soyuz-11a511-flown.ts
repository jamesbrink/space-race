/**
 * The Soyuz launch vehicle, 11A511, as the orbital simulator flies it (src/sim/staged.ts): what every flight on it had, said
 * once for the first-generation Soyuz flights (soyuz-11a511.md). It is the Voskhod's 11A57 brought up to a heavier ship
 * (`MPK`, p. 82): the same blocks, lightened and strengthened, the core's engines chosen one by one, a shorter Block I with
 * the RD-0110, and an escape tower on the fairing. So the types, the pieces and every figure that did not change are the
 * 11A57's and the 8K72K's (voskhod-11a57-flown.ts, vostok-8k72k.ts) and say so; what is here is the 11A511's own, from
 * the type's table of figures (`MPK`, p. 83): the blocks' masses, loads and engines, the head block, the stations of
 * the stack, the escape tower and the escape it gave. A flight gives its own day (`Staging11A511`, `Ascent11A511`).
 */

import { assumed, derived, doc, estimated } from '../../../../src/measure.ts';
import type { Guidance } from '../../../../src/sim/orbital.ts';
import type { Measure, ShedBody } from '../../../../src/types.ts';
import { AFT_MASS, AFT_SECTORS, BLOCK_I, BLOCK_I_CUT, CORE_11A57, STRAP_ONS_11A57 } from '../../voskhod/vehicles/voskhod-11a57-flown.ts';
import {
  ascent8K72K,
  coreThrottle,
  fairingHalves,
  G0,
  MODULE_DRIFT,
  shellSectors,
  strapOnThrottle,
  ZAK,
} from '../../vostok/vehicles/vostok-8k72k.ts';
import type { AscentCheck, AscentRecord, StageRecord } from '../../vostok/vehicles/vostok-record.ts';

/** The type's table of figures and its account of the vehicle: what is the 11A511's own is from here. */
export const MPK =
  'Afanasyev et al., «Первые «Союзы»», ch. 5 of «Мировая пилотируемая космонавтика» (ed. Baturin, РТСофт, 2005), the table «Основные технические характеристики РН 11А511», p. 83';
const KGF = G0;

type Hardware = Omit<StageRecord, 'cutoff' | 'separation' | 'throttle' | 'velocity'>;

/**
 * Blocks B, V, G and D: the 11A57's strap-ons with the 11A511's own masses and engine figures as its table has them, the 8D728
 * (RD-107). Its four figures for the engine do not fit one nozzle: its thrusts and its impulse in vacuum give 257.5 s at the
 * ground (the 11A57's 8D728 has 257 s, Energomash), where it prints 252 s, the figure it gives the core's engine.
 */
export const STRAP_ONS_11A511: Hardware = {
  ...STRAP_ONS_11A57,
  mass: doc(43_325, `${MPK}: «Масса: стартовая, т 43.325»`),
  dry: derived(43_325 - 39_475, `its start mass less its load, both ${MPK}: 3.85 t`),
  propellant: doc(39_475, `${MPK}: «в т.ч. компонентов топлива, т 39.475»`),
  thrust: {
    seaLevel: doc(83.5 * 1000 * KGF, `${MPK}: the 8D728 (RD-107), «ном. тяга на Земле/в вакууме, тс 83.5/101.5»`),
    vacuum: doc(101.5 * 1000 * KGF, `${MPK}: 101.5 tf in vacuum`),
  },
  isp: {
    seaLevel: derived(
      (83.5 / 101.5) * 313,
      `its thrust at the ground over its flow in vacuum, both ${MPK}: 257.5 s, where the table prints «252/313» (Energomash’s 8D728: 257 s)`,
    ),
    vacuum: doc(313, `${MPK}: «уд. импульс на Земле/в вакууме, сек 252/313»`),
  },
};

/** Block A: the 11A57's core with the 11A511's own masses and its RD-108 (8D727) as its table has it. */
export const CORE_11A511: Hardware = {
  ...CORE_11A57,
  mass: doc(100_240, `${MPK}: «Масса: стартовая, т 100.24»`),
  dry: derived(100_240 - 93_300, `its start mass less its load, both ${MPK}: 6.94 t`),
  propellant: doc(93_300, `${MPK}: «в т.ч. компонентов топлива, т 93.3»`),
  thrust: {
    seaLevel: doc(79.3 * 1000 * KGF, `${MPK}: the 8D727 (RD-108), «ном. тяга на Земле/в вакууме, тс 79.3/99.3»`),
    vacuum: doc(99.3 * 1000 * KGF, `${MPK}: 99.3 tf in vacuum`),
  },
  isp: {
    seaLevel: doc(
      252,
      `${MPK}: «уд. импульс на Земле/в вакууме, сек 252/315»; the core's engines were chosen one by one for at least 252 s at the ground (p. 82)`,
    ),
    vacuum: doc(315, `${MPK}: 315 s in vacuum`),
  },
};

/** Block I: the 11A57's, shortened, with the RD-0110 (11D55) as the 11A511's table has it. The flight gives when it was lit. */
export const BLOCK_I_11A511: Omit<Hardware, 'ignition'> = {
  ...BLOCK_I,
  engine: 'RD-0110 (11D55)',
  mass: derived(
    25_450 - AFT_MASS.value,
    `${MPK}: «Стартовая масса, т 25.45», less its aft section (${AFT_MASS.value} kg, the 11A57's, estimated), which leaves on its own`,
  ),
  dry: derived(25_450 - AFT_MASS.value - 22_700, 'the stage’s mass less its load, both as above: 2.75 t with its aft section'),
  propellant: doc(22_700, `${MPK}: «в т.ч. компонентов топлива, т 22.70»; the engine’s longest burn 240 s`),
  thrust: { vacuum: doc(30.38 * 1000 * KGF, `${MPK}: the 11D55 (RD-0110), «номинальная тяга в вакууме, тс 30.38»`) },
  isp: { vacuum: doc(326, `${MPK}: «удельный импульс в вакууме, сек 326»`) },
  nozzle: {
    chamber: assumed(
      BLOCK_I.nozzle!.chamber!.value,
      `the RD-0108’s, taken for the RD-0110, its successor: ${BLOCK_I.nozzle!.chamber!.source}`,
    ),
    expansion: BLOCK_I.nozzle!.expansion!,
    exit: BLOCK_I.nozzle!.exit,
  },
};

/**
 * The 11A511 of the 7K-T era. MPK has the vehicle uprated for the heavier ship («Стартовая масса 7КТ увеличилась до 6700 кг
 * (масса 7КОК – 6400–6500 кг), поэтому РН «Союз» (11А511) была доработана с целью увеличения ее грузоподъемности», p. 224) and
 * nothing read says how. Its one unknown is sized here from that documented capability, not from any flight's orbit: the
 * vehicle as this file gives it (the 7K-OK era's) carries 6,534 kg to the type's planned insertion orbit, 204.3 by 225.0 km at
 * 51.69° (Mishin's flight plan for the active 7K-OK, Soyuz 3's, via Zak: the one nominal insertion of the type read), flown on
 * Soyuz 3's instants from Site 31 in the standard air, the stage cut where it reaches that orbit's period
 * (tests/soyuz-uprating.test.mjs finds it again by bisection); MPK's 6,700 kg is 166 kg more. The 7K-OK era's vehicle is
 * unchanged.
 */
export const UPRATING_7KT = {
  /** What the uprating gave, kg of payload to that orbit. */
  gained: derived(
    6_700 - 6_534,
    `MPK’s 6,700 kg for the 7K-T (${MPK.replace('the table «Основные технические характеристики РН 11А511», p. 83', 'p. 224')}) less the 6,534 kg the 7K-OK era’s vehicle as given here carries to 204.3 by 225.0 km (Mishin’s planned insertion for Soyuz 3, via Zak), by bisection on its flown ascent (tests/soyuz-uprating.test.mjs)`,
  ),
  /** Which figure carries it: Block I's own mass, a kilogram off it a kilogram carried. */
  carried: estimated(
    1,
    `NOT FOUND how the vehicle was uprated. Taken as mass out of Block I, the last stage, where a kilogram saved is a kilogram carried: the 11A511’s own gains over the 11A57 were of that kind, the cable network lightened and the telemetry replaced by a lighter one (${MPK.replace('the table «Основные технические характеристики РН 11А511», p. 83', 'p. 82')}: «облегчена бортовая кабельная сеть систем управления (СУ) и телеметрии; телеметрическая система на боковом и центральном блоках заменена новой»). Chosen`,
  ),
};

/** Block I of the 7K-T era: the 7K-OK era's, less the uprating's mass (`UPRATING_7KT`). */
export const BLOCK_I_7KT: Omit<Hardware, 'ignition'> = {
  ...BLOCK_I_11A511,
  mass: derived(
    BLOCK_I_11A511.mass.value - UPRATING_7KT.gained.value,
    `${BLOCK_I_11A511.mass.source}; less the 7K-T era’s uprating, ${UPRATING_7KT.gained.value} kg (${UPRATING_7KT.gained.source}), carried as Block I’s own mass (${UPRATING_7KT.carried.source})`,
  ),
  dry: derived(
    BLOCK_I_11A511.dry.value - UPRATING_7KT.gained.value,
    `${BLOCK_I_11A511.dry.source}; less the 7K-T era’s uprating, ${UPRATING_7KT.gained.value} kg (as above)`,
  ),
};

/** When a flight's stages were lit, cut and let go, as its own record has them. */
export interface Staging11A511 {
  boosters: { cutoff: Measure; separation: Measure };
  core: { cutoff: Measure; separation: Measure };
  third: { ignition: Measure; cutoff: Measure; separation: Measure };
}

/**
 * The three stages of a flight on the 11A511, in order (orbital.ts `stages`); the throttles the type's readings (vostok-8k72k.ts).
 * Block I is the 7K-OK era's unless the flight's era gives its own (`BLOCK_I_7KT`).
 */
export function stages11A511(day: Staging11A511, blockI: Omit<Hardware, 'ignition'> = BLOCK_I_11A511): StageRecord[] {
  const { boosters, core, third } = day;
  return [
    { ...STRAP_ONS_11A511, throttle: strapOnThrottle(boosters.separation.value), cutoff: boosters.cutoff, separation: boosters.separation },
    { ...CORE_11A511, throttle: coreThrottle(core.cutoff.value), cutoff: core.cutoff, separation: core.separation },
    { ...blockI, ignition: third.ignition, cutoff: third.cutoff, separation: third.separation, orbit: BLOCK_I_CUT },
  ];
}

/**
 * Stations on the 11A511, m above the main nozzles' exits (soyuz-11a511.md, "Dimensions and model"; soyuz_11a511.py): the
 * lattice's top, Block I's aft section over it, the stage's top and its adapter, which is the spacecraft's aft end (the
 * model's origin), the fairing's and the escape tower's tips.
 */
const LATTICE_TOP = 28.3;
const AFT_TOP = LATTICE_TOP + 1.95;
/** The spacecraft's aft end, its station 0: the flown model's origin (`Flight.flies.datum`). */
export const SHIP_0 = 35.695;
const FAIRING_TIP = 45.25;
const TOWER_TIP = 49.913;
/** Stations on the 7K-OK, m above its aft end (soyuz_7kok.py): the adapter truss's top, the orbital module's foot and top, the docking probe's tip. */
const OK = { truss: 2.433, orbitalFoot: 4.48, orbitalTop: 6.98, probe: 7.6 };

/**
 * The escape tower and the fairing: the head block less the ship, 1,950 kg (`MPK`: «Масса с полезным грузом, кг 8510»,
 * of which the ship 6,560), shared between the two as nothing read says.
 */
const HEAD_BLOCK = derived(8_510 - 6_560, `${MPK}: the head block with its escape motor, 8,510 kg, less the ship, 6,560 kg`);
export const TOWER_MASS: Measure = estimated(
  1_000,
  `NOT FOUND: the escape motor gave 76 tf for under 2 s, 123 tf·s in all (RKK Energia 1946–1996, ch. 5), some 550 kg of a solid at 230 s; with its case, nozzle blocks and the four control motors, a tonne, by judgement. The rest of the head block’s ${HEAD_BLOCK.value} kg (${HEAD_BLOCK.source}) is the fairing`,
);
export const FAIRING_MASS: Measure = derived(
  HEAD_BLOCK.value - TOWER_MASS.value,
  `the head block less the ship (${HEAD_BLOCK.source}) less the escape tower (estimated)`,
);

/** What a flight's own run leaves in each block it lets go, for the scene's spent bodies: the flight's. */
export interface Left11A511 {
  booster: Measure;
  core: Measure;
  blockI: Measure;
}

/** A flight's ascent on the 11A511 (orbital.ts `ascent`). */
export interface Ascent11A511 {
  guidance: Guidance;
  boostersGo: Measure;
  lastCutoff: Measure;
  /** When the escape tower and the fairing were let go, and Block I's aft section. */
  tower: Measure;
  fairing: Measure;
  aft: Measure;
  left: Left11A511;
  /** The ship's modules in orbit, kg, for their bodies once they part (soyuz-record.ts `modules`). */
  modules: { orbital: Measure; instrument: Measure };
  checks: AscentCheck[];
}

/**
 * A flight's ascent on the 11A511: the 8K72K's drag, steering, limits and spent strap-ons and core (the same blocks), with the
 * 11A511's own escape tower, fairing, aft section, Block I, spacecraft stations, and the escape its tower gave.
 */
export function ascent11A511(day: Ascent11A511): AscentRecord {
  const r7 = ascent8K72K({
    guidance: day.guidance,
    boostersGo: day.boostersGo,
    lastCutoff: day.lastCutoff,
    fairing: day.fairing,
    left: { booster: day.left.booster, core: day.left.core, blockE: day.left.blockI },
    checks: day.checks,
  });
  const fairing = r7.drops.find((d) => d.id === 'fairing')!;
  const kept = (r7.sheds ?? []).filter((s) => s.on.startsWith('stage:0/') || s.on === 'stage:1');
  const towerR = estimated(0.5, 'the shrouded base of the tower, about a metre across (soyuz-11a511.md: estimated)');
  return {
    ...r7,
    drops: [
      { id: 'escape-tower', at: day.tower, mass: TOWER_MASS },
      { ...fairing, mass: FAIRING_MASS },
      { id: 'aft-section', at: day.aft, mass: AFT_MASS },
    ],
    centre: estimated(
      3.0,
      'the 7K-OK’s centre of mass above its aft end: not found. The descent module, 2.8 t, sits from 2.3 to 4.5 m, between the instrument module’s 2.7 t below and the orbital module’s 1.2 t above (MPK, p. 81); by judgement',
    ),
    aborts: [
      {
        until: doc(
          157,
          `${MPK}, p. 82: «до 157-й секунды» the escape tower; «кроме 4 секунд между отделением ДУ САС на 157 сек полета и сбросом ГО на 161 сек»`,
        ),
        does: 'the escape tower’s motors pulled the descent and orbital modules away inside the fairing’s upper part, at least 850 m up and 110 m aside; the descent module then came down on its reserve parachute in the first 26 s, on its main after',
        // (not flown: the head block's own flight under the tower, its grid fins and its separation have no figures here)
      },
      {
        until: doc(161, `${MPK}, p. 82: between the tower’s jettison at 157 s and the fairing’s at 161 s there was no escape`),
        does: 'nothing: the tower had gone and the fairing was still on',
      },
      {
        until: doc(
          522,
          `${MPK}, p. 83: «При аварии между 161 и 522 сек полета СА и БО отделялись от ПАО, затем СА отделялся от БО и спускался по штатной программе посадки»`,
        ),
        does: 'the engines shut down, the descent and orbital modules let go of the instrument module and the descent module came down as from orbit',
        escape: { cut: true, separate: { entry: true } },
      },
      {
        until: derived(
          526,
          `${MPK}, p. 83: from 522 s the modules parted as in orbit and the descent module came down ballistically, at over 10 g, until the ship left Block I at 526 s`,
        ),
        does: 'the modules parted as they would from orbit, and the descent module came down without its lift, at over 10 g',
        escape: { cut: true, separate: { entry: true } },
      },
    ],
    sheds: [
      ...kept,
      {
        on: 'escape-tower',
        name: 'The escape tower',
        from: derived(FAIRING_TIP, 'the fairing’s tip (soyuz_11a511.py: estimated)'),
        to: doc(TOWER_TIP, 'the vehicle’s 49,913 mm (RKK Energia’s dimensioned cutaway: soyuz-11a511.md)'),
        radius: towerR,
        mass: TOWER_MASS,
        centre: estimated(FAIRING_TIP + 1.6, 'its motors low in the tower, by judgement'),
        gyration: { roll: estimated(0.4, 'a tower half a metre in radius'), across: estimated(1.3, 'a 4.7 m tower') },
        push: estimated(2, 'not found: the tower’s locks let go, chosen'),
        // (it leaves on a motor of its own, ahead of a stack still under thrust)
        motors: [
          {
            name: 'The tower’s jettison motor',
            thrust: estimated(
              40_000,
              `NOT FOUND: the escape motor had blocks of its own to part the head block from the stack and carry it off (${MPK}, p. 82: «два многосопловых блока РДТТ (для разделения и увода ОГБ)»); what fired to carry the tower alone off at its jettison, and how hard, is not in anything read. Four tonnes-force, chosen to take a tonne clear ahead of a stack pulling 1.2 g`,
            ),
            burn: estimated(1.5, 'NOT FOUND: chosen, as above'),
          },
        ],
        ahead: estimated(0.4, 'its nose, at 0.5'),
        astern: estimated(0.8, 'its base, at 1.0'),
        side: {
          dragArea: estimated(3.5, '4.7 m × 0.75 m at 1.0'),
          from: derived(FAIRING_TIP, 'the body’s own stretch, as above'),
          to: doc(TOWER_TIP, 'the body’s own stretch, as above'),
        },
        forward: true,
      },
      ...fairingHalves({
        on: 'fairing',
        name: 'The fairing',
        from: derived(SHIP_0, 'on Block I’s adapter, at the spacecraft’s aft end (soyuz_11a511.py)'),
        to: derived(FAIRING_TIP, 'the fairing’s tip (soyuz_11a511.py: estimated)'),
        radius: estimated(1.46, 'the cylinder 2.92 m across (soyuz-11a511.md: estimated)'),
        mass: FAIRING_MASS,
        centre: estimated(40, 'a little below the middle of a cylinder and its cone, by judgement'),
        gyration: { roll: estimated(1.2, 'a thin shell 1.46 m in radius'), across: estimated(2.9, 'a 9.6 m shell') },
        ahead: estimated(3, 'its nose at 0.45'),
        astern: estimated(6.7, 'its open foot, at 1.0'),
        side: {
          dragArea: estimated(28, '9.6 m × 2.92 m at 1.0'),
          from: derived(SHIP_0, 'the body’s own stretch, as above'),
          to: derived(FAIRING_TIP, 'the body’s own stretch, as above'),
        },
      }),
      ...shellSectors(
        {
          on: 'aft-section',
          name: 'Block I’s aft section',
          from: estimated(LATTICE_TOP, 'on the lattice’s top, read off RKK Energia’s cutaway (soyuz-11a511.md)'),
          to: estimated(AFT_TOP, 'its 1.95 m, the 11A57’s (voskhod-11a57.md: estimated)'),
          radius: doc(1.33, `${MPK}: the stage’s 2.66 m`),
          mass: AFT_MASS,
          centre: estimated(LATTICE_TOP + 1, 'the middle of a skirt'),
          gyration: { roll: estimated(1.3, 'a thin skirt 1.33 m in radius'), across: estimated(1, 'a skirt 2 m long') },
          ahead: estimated(3, 'its open top, at 1.0'),
          astern: estimated(3, 'its open foot, at 1.0'),
          side: {
            dragArea: estimated(5, '1.95 m × 2.66 m at 1.0'),
            from: estimated(LATTICE_TOP, 'the body’s own stretch, as above'),
            to: estimated(AFT_TOP, 'the body’s own stretch, as above'),
          },
        },
        AFT_SECTORS,
        60,
      ),
      {
        on: 'stage:2',
        name: 'Block I, the third stage',
        from: estimated(AFT_TOP, 'over its aft section, once that has gone'),
        to: derived(SHIP_0, `its adapter’s rim: the stage, 6.745 m (${MPK}), and its adapter, 0.65 m (estimated)`),
        radius: doc(1.33, `${MPK}: 2.66 m across`),
        mass: day.left.blockI,
        centre: estimated(LATTICE_TOP + 3.5, 'the engine and the empty tanks, low in the stage'),
        gyration: { roll: estimated(1.0, 'tanks 1.3 m in radius'), across: estimated(2.1, 'a stage 6.5 m long') },
        push: estimated(
          1,
          'not found: the ship left the adapter on pushers at a speed nothing read gives; 1 m/s apart, as the Vostoks’, chosen',
        ),
        ahead: estimated(5, 'its adapter’s open rim, at 1.0'),
        astern: estimated(5, 'its base, at 1.0'),
        side: {
          dragArea: estimated(17, '6.5 m × 2.66 m at 1.0'),
          from: estimated(AFT_TOP, 'the body’s own stretch, as above'),
          to: derived(SHIP_0, 'the body’s own stretch, as above'),
        },
      },
      {
        on: 'modules',
        name: 'The instrument and propulsion module',
        push: MODULE_DRIFT,
        from: derived(SHIP_0, 'the ship’s aft end'),
        to: estimated(SHIP_0 + OK.truss, 'the adapter truss’s top under the descent module (soyuz_7kok.py)'),
        radius: estimated(1.36, 'its aft skirt, 2.72 m across (soyuz-11a511.md: the type’s greatest diameter)'),
        mass: day.modules.instrument,
        centre: estimated(SHIP_0 + 0.9, 'its engine and tanks low in it, by judgement'),
        gyration: { roll: estimated(0.9, 'a module 1.1 to 1.36 m in radius'), across: estimated(0.8, 'a module 2.4 m long') },
        ahead: estimated(3.5, 'its truss and equipment belt, 3.8 m², at 0.9'),
        astern: estimated(5, 'its aft skirt, 5.8 m², at 0.9'),
        side: {
          dragArea: estimated(6, '2.4 m × 2.5 m at 1.0'),
          from: derived(SHIP_0, 'the body’s own stretch, as above'),
          to: estimated(SHIP_0 + OK.truss, 'the body’s own stretch, as above'),
        },
      },
      {
        on: 'orbital-module',
        name: 'The orbital module',
        push: MODULE_DRIFT,
        forward: true,
        from: estimated(SHIP_0 + OK.orbitalFoot, 'on the descent module’s top (soyuz_7kok.py)'),
        to: estimated(SHIP_0 + OK.probe, 'the docking probe’s tip (soyuz_7kok.py)'),
        radius: doc(1.1, `${MPK}, p. 81: two hemispheres 2.2 m across`),
        mass: day.modules.orbital,
        centre: estimated(SHIP_0 + 5.7, 'about the middle of its two hemispheres'),
        gyration: {
          roll: estimated(0.8, 'a sphere 1.1 m in radius, its equipment inside'),
          across: estimated(0.9, 'a module 2.5 m long with its probe'),
        },
        ahead: estimated(1.8, 'its round top, 3.8 m², at 0.47'),
        astern: estimated(1.8, 'its round foot, as its top'),
        side: {
          dragArea: estimated(3, 'a sphere-like body 2.5 m by 2.2 m at 0.6'),
          from: estimated(SHIP_0 + OK.orbitalFoot, 'the body’s own stretch, as above'),
          to: estimated(SHIP_0 + OK.probe, 'the body’s own stretch, as above'),
        },
      },
    ] satisfies ShedBody[],
  };
}

export { G0, ZAK };

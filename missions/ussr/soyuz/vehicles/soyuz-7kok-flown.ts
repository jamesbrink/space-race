/**
 * The first Soyuz, 7K-OK, as the orbital simulator flies it (src/sim/orbital.ts): what every ship of the type had, said once for
 * the flights that flew one (Soyuz 1, 3 and 4 here). A flight gives its own: its masses where its record has them, its
 * instants, its burns, the ground it landed on and its checks (its orbital.ts, a `SoyuzRecord`). Every figure here is the
 * type's, with its source; where the type's own figure was not found, the Vostok's or the Voskhod's is taken and says so.
 */

import { assumed, derived, doc, estimated } from '../../../../src/measure.ts';
import type { Craft } from '../../../../src/sim/plan.ts';
import type { Curve, Heating, Measure } from '../../../../src/types.ts';
import { RAREFIED as BALL_RAREFIED, SHIP_RAREFIED } from '../../vostok/vehicles/vostok-3ka.ts';
import type { DescentBody, DescentChute, DescentMotor, DescentRecord } from '../../vostok/vehicles/vostok-record.ts';
import { canopy } from '../../voskhod/vehicles/voskhod-ship.ts';
import { G0, MPK } from './soyuz-11a511-flown.ts';
import type { SoyuzEngine } from './soyuz-record.ts';

export { canopy, MPK };

/** Siddiqi's account of the 7K-OK's design: its modules, its controls and its landing system. */
export const SIDDIQI = 'Siddiqi, Challenge to Apollo, NASA SP-2000-4408';
/** RKK Energia's own history of the 7K-OK. */
export const ENERGIA =
  '«Ракетно-космическая корпорация «Энергия» имени С. П. Королёва, 1946–1996» (ed. Semenov), ch. 5 (testpilot.ru/espace/bibl/energia-50/05.php)';
/** The 7K-OK's description in the same chapter as `MPK`'s table, its p. 81 (the Gagarin Centre's page on the type has the same words). */
export const MPK81 = MPK.replace('the table «Основные технические характеристики РН 11А511», p. 83', 'p. 81');
const ISAEV =
  'the KTDU-35’s main engine as lpre.de’s table of the Isaev bureau’s engines (С5.60) and a transcription of an engine encyclopedia’s entry (studopedia.ru 8_148333) give it: tertiary';

/** The approach and correction engine of the KTDU-35 (СКД), without the flight's own load of propellant. */
export const SKD: Omit<SoyuzEngine, 'propellant'> = {
  name: 'KTDU-35 main engine (СКД)',
  thrust: doc(
    417 * G0,
    `${MPK81}: «с основным однокамерным двигателем многократного включения (до 25 раз) тягой 417 кгс»; ${ENERGIA}: «основную камеру тягой 417 кгс»; ${SIDDIQI}, p. 467`,
  ),
  isp: doc(
    2725 / G0,
    `${ISAEV}: «1п = 2725 м/с», 278 s. Encyclopedia Astronautica has 280 s for the engine and 282 s for the module: secondary`,
  ),
  starts: { count: 25, confidence: 'documented', source: `${MPK81}: «многократного включения (до 25 раз)»` },
  nozzle: {
    chamber: doc(3_920_000, `${ISAEV}: «рк = 3,92 МПа»`),
    exit: estimated(
      4_000,
      'NOT FOUND for the KTDU-35: its expansion is a blank in every table read; a few hundredths of an atmosphere, as any engine made to fire above the air, taken (only its fire reads it)',
    ),
  },
};

/** What the KTDU-35's tanks held: the most, not what a flight carried (a flight's own figure goes in its record). */
export const SKD_TANKS: Measure = doc(
  900,
  `${MPK81}: «два сферических бака с горючим и два бака с окислителем, вмещавшие в общей сложности до 900 кг топлива»: the most they held. Encyclopedia Astronautica’s module figures leave 500 kg: tertiary`,
);

/** The modules' masses, the type's: each flight takes them or gives its own. */
export const MODULES = {
  orbital: doc(1_200, `${SIDDIQI}, p. 467: "a mass of 1,200 kilograms"; ${MPK81}: «БО массой 1.2–1.3 т»`),
  descent: doc(2_800, `${SIDDIQI}, p. 467: "a nominal mass of 2,800 kilograms"; ${MPK81}: «СА (масса – 2.8 т…)»`),
};

/** The descent module's disc, on its 2.2 m: what its drag and lift are worked on. */
export const ENTRY_AREA: Measure = derived(
  Math.PI * 1.1 ** 2,
  `the disc of the 2.2 m descent module (${MPK81}: «максимальный диаметр – 2.2 м»)`,
);

/** Its drag against Mach number, flown at its trim: a blunt body's, not the type's (none was found). */
export const ENTRY_DRAG: Curve = {
  points: [
    [0, 0.85],
    [0.8, 0.95],
    [1.2, 1.15],
    [2, 1.25],
    [5, 1.3],
  ],
  confidence: 'estimated',
  source:
    'NOT FOUND for the 7K-OK: no drag coefficient or ballistic coefficient of the descent module is in anything read (MPK; RKK Energia 1946–1996; Siddiqi). A blunt heat shield’s at an angle of attack of some twenty degrees, of the kind Apollo’s command module flew, rising through the transonic to 1.3 hypersonic, on its disc: chosen',
};

/** Its lift over drag at its trim: the type's. */
export const ENTRY_LIFT: Curve = {
  points: [[0, 0.25]],
  confidence: 'documented',
  source: `${MPK81}: «Форма СА, положение его центра масс и система управления спуском (СУС) позволяли спускаемому аппарату совершать управляемый спуск с аэродинамическим качеством 0.25 (с перегрузкой не более 3–4 g)». ${ENERGIA}: «около 0,2, а с учетом запаса на управление — около 0,3»`,
};

/** The angle of attack it trims at: drawn only. */
export const TRIM: Measure = estimated(
  20,
  `NOT FOUND: ${ENERGIA} has the module enter «на балансировочном угле атаки» on a centre of mass 3 to 4 per cent of its length off its axis, and no angle; some twenty degrees, by judgement. How it is drawn, not what it flies: its lift is the ratio above`,
);

/** What it falls on alone below its parachutes, its drag coefficient times area, m^2. */
export const MODULE_DRAG: Measure = estimated(3.2, 'the 3.8 m² disc at the drag curve’s 0.85 below Mach 0.8 (itself estimated)');

/** The heat of its entry, on its heat shield's face. */
export const HEATING: Heating = {
  noseRadius: estimated(
    2.2,
    'NOT FOUND: the heat shield is a shallow spherical segment (soyuz_7kok.py: estimated), its radius of curvature taken as the module’s diameter, 2.2 m',
  ),
  starts: estimated(290, 'not read: the cabin’s temperature at launch taken for the outside; it is not used, there being no surface'),
  surfaces: [],
};

/** The descent module alone in the free-molecule flow of the high air: a blunt body's, the ball's figure taken. */
export const RAREFIED: Measure = assumed(
  BALL_RAREFIED.value,
  `a sphere’s on its disc, taken for the descent module: ${BALL_RAREFIED.source}`,
);

/** The joined ship in the free-molecule flow of its orbit. */
export const RAREFIED_SHIP: NonNullable<Craft['rarefied']> = {
  drag: SHIP_RAREFIED.drag,
  area: estimated(
    12,
    'm²: the joined ship turning as it flew, between end on (its 2.72 m skirt, 5.8 m²) and broadside (7.6 m long, about 17 m²), and its solar wings edge on to the motion as often as not: by judgement',
  ),
  length: estimated(7.6, `its length with the docking probe (${ENERGIA}; ${SIDDIQI}, p. 467: 7.6 m)`),
};

/** How fast the hand controller turned the ship, deg/s: not found. */
export const HAND_RATE: Measure = estimated(
  2,
  `NOT FOUND: two hand controllers, "the left one for changing velocity ... the right one for attitude control" (${SIDDIQI}, p. 467), and no rate. The Vostok’s 2 deg/s taken`,
);

/** The parachutes' areas, m² of canopy, the type's after Soyuz 1. */
export const AREAS = {
  drogue: doc(
    14,
    `${ENERGIA}: «уменьшению площади тормозного купола с 18 до 14 м²»; ${SIDDIQI}, p. 472: "a primary fourteen-square-meter drogue parachute"`,
  ),
  main: doc(1_000, `${MPK81}: «Основная система парашютирования (ОСП) имела купол площадью 1000 м²»; ${SIDDIQI}, p. 472`),
  reserve: doc(570, `${MPK81}: «запасная система парашютирования (ЗСП) – купол площадью 570 м²». ${SIDDIQI}, p. 472: 574 m²`),
};

/** How long after the drogue the main came out, s: the type's. */
export const MAIN_AFTER: Measure = doc(17, `${SIDDIQI}, p. 472: the drogue "followed in seventeen seconds by the main parachute"`);

/** The event at the height the coast hands over at: the main parachute container's cover shot off. */
export const COVER_OFF = {
  id: 'cover-off',
  label: 'The parachute container’s cover shot off',
  asked: 'Shoot off the parachute container’s cover',
};

/** The main parachute container's cover, shot off at the height the parachute system starts at. */
export const COVER: DescentBody = {
  id: 'cover',
  label: 'The parachute container’s cover',
  mass: estimated(15, 'NOT FOUND: an oval lid some 0.6 by 0.4 m with its heat shielding, by judgement'),
  dragArea: estimated(0.3, 'a lid of 0.25 m², tumbling: chosen'),
  thrown: estimated(10, 'NOT FOUND: shot off by its pyrotechnics, drawing out the pilot parachute; chosen, as the Vostok’s'),
  with: [COVER_OFF.id],
  chutes: [],
};

/** The heat shield, let go under the parachutes to bare the soft-landing engines. */
export const SHIELD: DescentBody = {
  id: 'shield',
  label: 'The heat shield',
  mass: estimated(
    150,
    `NOT FOUND: ${MPK81} has a shield of pressed asbestos-textolite («лобовой защитный экран, изготовленный из прессованного асботекстолита»), and no mass; a dish 2.2 m across, by judgement`,
  ),
  dragArea: estimated(2.5, 'a dish 2.2 m across, falling as it will: chosen'),
  thrown: estimated(2, 'NOT FOUND: let go by its locks to fall away below the module; chosen'),
  with: ['module/main parachute'],
  chutes: [],
};

/** The parachutes of the descent module, as they come out after the cover: the drogue, then the main in its place. */
export function soyuzChutes(main: Measure = MAIN_AFTER): DescentChute[] {
  return [
    canopy({
      name: 'drogue parachute',
      after: doc(
        0,
        `drawn out by the pilot parachutes as the cover is shot off (${SIDDIQI}, p. 472: "by shooting off the parachute hatch and issuing a primary fourteen-square-meter drogue parachute")`,
      ),
      area: AREAS.drogue,
      fills: estimated(2, 'chosen: no filling time found'),
    }),
    canopy({
      name: 'main parachute',
      after: main,
      area: AREAS.main,
      fills: estimated(10, 'chosen: a reefed canopy of 1,000 m², no filling time found'),
      instead: ['drogue parachute'],
    }),
  ];
}

/**
 * The four soft-landing engines under the heat shield, fired by the gamma-ray altimeter just over the ground: their thrust and
 * burn worked from the design's speeds, since nothing read gives them (`SOFT`).
 */
export function softLandingEngines(ground: Measure, mass: number, motors?: Measure): DescentMotor {
  const before = 6.5; // the design's speed on the main parachute (Siddiqi, p. 472)
  const after = 2.5; // what the engines were to leave of it (Siddiqi: two to three m/s)
  const decel = (before ** 2 - after ** 2) / (2 * FIRING.value);
  const which = motors
    ? `${motors.value} solid motors (${motors.source})`
    : `four solid motors (${MPK81}: «четыре двигателя мягкой посадки (ДМП)»; ${ENERGIA}: a plate of 22 nozzles)`;
  const says = `NOT FOUND: ${which} whose thrust, impulse and burn are in nothing read. Worked from the design: the primary landing velocity "reduced to at least six and a half meters per second" and the engines to "reduce landing velocity to a final two to three meters per second" (${SIDDIQI}, p. 472), 6.5 to 2.5 m/s over the ${FIRING.value} m they fired at, an even ${decel.toFixed(1)} m/s², which is ours`;
  return {
    id: 'soft-landing-engines',
    label: 'Soft-landing engines',
    after: 'main parachute',
    altitude: {
      value: ground.value + FIRING.value,
      confidence: 'estimated',
      source: `the gamma-ray altimeter's ${FIRING.value} m (${FIRING.source}) over the ground's ${ground.value} m above the sea (${ground.source})`,
    },
    thrust: estimated(mass * (decel + 9.80665), `N: ${says}, against the module's weight`),
    burn: estimated((before - after) / decel, `s: ${says}`),
  };
}

/** The height the gamma-ray altimeter fired the soft-landing engines at, m. */
export const FIRING: Measure = doc(
  1,
  `${ENERGIA}: «высоты включения посадочного двигателя (около одного метра)», by a gamma-ray altimeter; ${SIDDIQI}, p. 472: "at about one and a half meters prior to touchdown"`,
);

/** What a crew that lands in the descent module lives through (sim/verdict.ts): only the landing aboard. */
export const crewAboard = (words?: NonNullable<DescentRecord['crew']>['words']): NonNullable<DescentRecord['crew']> => ({
  ...(words ? { words } : {}),
  landing: {
    aboard: estimated(
      9,
      `not found as a limit. "A worst-case scenario, with the backup parachute and loss of soft-landing engines, would subject a crew to four- to nine-meter-per-second velocities at landing", rougher "but certainly survivable" (${SIDDIQI}, p. 472): 9 m/s taken as the most walked away from. Ours`,
    ),
  },
  aboard: 'The crew landed in the descent module, as every Soyuz crew did: there were no seats to leave it on',
});

/**
 * The Block II command module in the air, as a body of its own (sim/plan.ts `AeroDef`): its heat shield's disc, and its
 * drag at trim against Mach number as the entry planners had it for CM-107 (Apollo 11's), which every Block II flight
 * shares the shape of. A flight that flies an entry adds its own lift and trim from its own report (Apollo 7's orbital.ts).
 */
import { derived, type Measure } from '../../../../src/measure.ts';
import type { AeroDef } from '../../../../src/sim/plan.ts';
import type { Curve } from '../../../../src/types.ts';

const IN = 0.0254;

/** Apollo Experience Report: Mission Planning for Apollo Entry (NASA TN D-6725), Table I: CM-107's trim aerodynamics. */
export const TRIM = 'Apollo Experience Report: Mission Planning for Apollo Entry (NASA TN D-6725), Table I, CM-107';

/** Its trim drag coefficient against Mach number, on the 154 in disc (TN D-6725, Table I, CM-107). */
export const TRIM_DRAG: readonly (readonly [number, number])[] = [
  [0.4, 0.853],
  [0.7, 0.98542],
  [0.9, 1.10652],
  [1.1, 1.1697],
  [1.2, 1.156],
  [1.35, 1.2788],
  [1.65, 1.2657],
  [2, 1.2721],
  [2.4, 1.2412],
  [3, 1.2167],
  [4, 1.2148],
  [10, 1.2246],
  [29.5, 1.2891],
];

/** The heat shield's disc, 154 in across, m^2. */
export const SHIELD_AREA = Math.PI * (77 * IN) ** 2;

/**
 * The command module's air as a body of its own, its drag CM-107's: `documented` for CM-107, `assumed` for another Block II
 * module of the same shape. No lift: a flight that flies its entry gives its own.
 */
export function cmAero(
  confidence: 'documented' | 'assumed' = 'assumed',
  area: Measure = derived(SHIELD_AREA, 'the 154 in heat shield’s disc (NASA Apollo press kits, command module)'),
): AeroDef {
  const drag: Curve = {
    points: TRIM_DRAG.map(([m, c]) => [m, c] as [number, number]),
    confidence,
    source: `${TRIM}: trim drag${confidence === 'assumed' ? ' of the same Block II shape' : ''}; low endpoint held below Mach 0.4`,
  };
  return {
    area,
    drag,
    dragArea: derived(TRIM_DRAG[0]![1] * area.value, `${TRIM}, Mach 0.4 drag coefficient on the heat shield's disc`),
  };
}

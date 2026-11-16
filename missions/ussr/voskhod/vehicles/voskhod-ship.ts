/**
 * The Voskhod spacecraft as the orbital simulator flies it (src/sim/orbital.ts): what both crewed ships of the type had, said
 * once for Voskhod 1 (the 3KV) and Voskhod 2 (the 3KD). It is a Vostok's ball and instrument module (vostok-3ka.ts, taken where
 * nothing read says it changed), with what the Voskhod had instead of the ejection seat: the crew stays in the ball, which comes
 * down on its own parachutes and is brought to a stop at the ground by a solid rocket in their lines, set off by a probe that
 * touches first. A flight gives its own: its masses, its record's instants, the landing ground's height and its checks.
 */

import type { DescentBody, DescentChute, DescentMotor, DescentRecord } from '../../vostok/vehicles/vostok-record.ts';
import type { Measure } from '../../../../src/types.ts';
import { estimated } from '../../../../src/measure.ts';
import { SIDDIQI } from '../../vostok/vehicles/vostok-8k72k.ts';

export {
  ENTRY_AREA,
  ENTRY_DRAG,
  HAND_RATE,
  HEATING,
  MODULE_DRAG,
  PARTING,
  RAREFIED,
  TDU_THRUST,
  TORN,
} from '../../vostok/vehicles/vostok-3ka.ts';

/** The event at the height the coast hands over at: the parachute container's cover shot off (no one ejects). */
export const COVER_OFF = {
  id: 'cover-off',
  label: 'Hatch No. 2 shot off: the parachutes’ cover',
  asked: 'Shoot off the parachutes’ cover',
};

/** Hatch No. 2, the parachute container's cover, shot off at the height the descent begins at, drawing out the first parachute. */
export const COVER: DescentBody = {
  id: 'cover',
  label: 'Hatch No. 2, the parachute container’s cover',
  mass: estimated(25, 'not found: by judgement, as the Vostok’s (vostok-3ka.ts HATCHES)'),
  dragArea: estimated(0.8, 'a plate a little over 1 m across, tumbling: chosen, as the Vostok’s'),
  thrown: estimated(10, 'not found: shot off by its pyrotechnics, drawing out the first parachute; chosen, as the Vostok’s'),
  with: [COVER_OFF.id],
  chutes: [],
};

/** What three men in a ship that lands with them live through (sim/verdict.ts): only the landing aboard. */
export const CREW: NonNullable<DescentRecord['crew']> = {
  // (the verdict and the deck speak of whoever rode it in these words: sim/orbital.ts `crewWords`)
  words: { who: 'The crew', they: 'they', their: 'their', many: true },
  landing: {
    aboard: estimated(
      3,
      `not found as a limit. The design brought the ball from 8 to 10 m/s under its parachutes to 0.2 m/s at the ground (${SIDDIQI}, p. 411), on couches sprung to take 20 to 30 g for five hundredths of a second (p. 412); 3 m/s taken as the most the crew walk away from in them. Ours`,
    ),
  },
  aboard: 'The crew landed in the ball, as the ship was built to: there were no seats to leave it on',
};

/** The soft-landing rocket in the main parachutes' lines, set off by its probe as that touches the ground. */
export const softLanding = (after: string, ground: Measure, thrust: Measure, burn: Measure, probe: Measure): DescentMotor => ({
  id: 'soft-landing-rocket',
  label: 'Soft-landing rocket',
  after,
  altitude: {
    value: ground.value + probe.value,
    confidence: ground.confidence === 'documented' && probe.confidence === 'documented' ? 'derived' : 'estimated',
    source: `the probe's ${probe.value} m below the ball (${probe.source}) over the ground's ${ground.value} m above the sea (${ground.source})`,
  },
  thrust,
  burn,
});

/** A parachute of the ball, from its area, as the Vostok's are made (a drag coefficient of 0.75 on its cloth, chosen). */
export const canopy = (c: Omit<DescentChute, 'dragArea'> & { area: Measure }): DescentChute => {
  const { area, ...rest } = c;
  return {
    ...rest,
    dragArea: estimated(
      0.75 * area.value,
      `${area.value} m² of canopy (${area.source}) at 0.75 on its cloth, the usual round canopy’s, chosen`,
    ),
  };
};

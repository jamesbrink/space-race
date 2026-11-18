import type { Keyframe } from '../../../../../src/types.ts';
import { lc34Pad } from '../../../places/cape-canaveral/lc-34.parts.ts';

const KIT = 'NASA Apollo 7 press kit (68-168K), final countdown, pp. 39–40';
const RECORD = 'Apollo by the Numbers (NASA SP-4029), Apollo 7 Timeline';
const HOLD = 2 * 60 + 45;
const STANDBY = -(33 * 60 + HOLD);
const RETRACT = -5 * 60;
const PARK = -(12 * 60 + 50) * 60 - HOLD;

export const INGRESS = -(2 * 3600 + 27 * 60 + 45); // 12:35 UTC against range zero 15:02:45 UTC.
export const BOARDING: [number, number] = [INGRESS, INGRESS + 25 * 60];
const SERVICE: [number, number] = [0, 0.24];
const ARM_STANDBY: [number, number] = [0.56, 0.71];
const ARM_RETRACT: [number, number] = [0.83, 0.94];
const UMBILICALS: [number, number] = [0.97, 1];

const sequence: Keyframe[] = [
  {
    at: PARK,
    slider: SERVICE[0],
    event: 'Service structure starts to roll back to its parking site',
    confidence: 'derived',
    source: `${KIT}: planned T−6:50, before the six-hour scheduled hold and the later chilldown hold (${RECORD})`,
  },
  {
    at: PARK + 15 * 60,
    slider: SERVICE[1],
    event: 'Service structure stands clear',
    confidence: 'estimated',
    source: 'The start is from the planned countdown. Fifteen minutes for the move is estimated.',
  },
  {
    at: INGRESS,
    slider: 0.44,
    event: '08:35 EDT · The crew begin boarding through the white room',
    confidence: 'documented',
    source: `${RECORD}: ingress at 12:35 UTC`,
  },
  {
    at: STANDBY,
    slider: ARM_STANDBY[0],
    event: 'Access arm starts back to standby',
    confidence: 'derived',
    source: `${KIT}: planned T−33. The 2 min 45 s chilldown hold shifts this by that much on the launch clock.`,
  },
  {
    at: STANDBY + 60,
    slider: ARM_STANDBY[1],
    event: 'Access arm is in standby',
    confidence: 'estimated',
    source: 'The standby position is in the press kit. The minute taken to reach it is estimated.',
  },
  {
    at: RETRACT,
    slider: ARM_RETRACT[0],
    event: 'Access arm starts its final retraction',
    confidence: 'derived',
    source: `${KIT}: planned T−5, after the chilldown hold`,
  },
  {
    at: RETRACT + 90,
    slider: ARM_RETRACT[1],
    event: 'Access arm is fully clear',
    confidence: 'estimated',
    source: 'The full retraction is in the press kit. Ninety seconds for this part of the move is estimated.',
  },
  { at: 0, slider: UMBILICALS[0], event: '11:02:45 EDT · Saturn IB lifts off', confidence: 'documented', source: RECORD },
  {
    at: 4,
    slider: UMBILICALS[1],
    event: 'The umbilical arms stand clear',
    confidence: 'estimated',
    source: `${KIT}: liftoff release. Four seconds for the visual retraction is estimated.`,
  },
];

export const pad = lc34Pad(sequence, { service: SERVICE, standby: ARM_STANDBY, retract: ARM_RETRACT, umbilicals: UMBILICALS });

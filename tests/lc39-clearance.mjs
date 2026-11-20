// The rendered site and its collision bake use the same two independent models and countdown.
import { flight as apollo11 } from '../missions/usa/apollo/flights/apollo-11/flight.ts';
import { flight as apollo12 } from '../missions/usa/apollo/flights/apollo-12/flight.ts';
import { flight as apollo13 } from '../missions/usa/apollo/flights/apollo-13/flight.ts';
import { flight as apollo14 } from '../missions/usa/apollo/flights/apollo-14/flight.ts';
import { flight as apollo15 } from '../missions/usa/apollo/flights/apollo-15/flight.ts';
import { flight as apollo16 } from '../missions/usa/apollo/flights/apollo-16/flight.ts';

import { flight as apollo17 } from '../missions/usa/apollo/flights/apollo-17/flight.ts';

// First vehicle motion relative to range zero, from each AS-50x evaluation's event table.
export const flights = [
  [apollo11, 506, 0.3],
  [apollo12, 507, 0.25],
  [apollo13, 508, 0.3],
  [apollo14, 509, 0.2],
  [apollo15, 510, 0.3],
  [apollo16, 511, 0.3],
  [apollo17, 512, 0.24],
];

/** Sample every timed sweep, including hatch and ground-equipment movements independent of the pad slider. */
export function countdownSamples(stack, pad, steps) {
  const times = new Set(pad.sequence.map((k) => k.at));
  function sweep(a, b) {
    times.add(a);
    times.add(b);
    for (let i = 1; i < steps; i++) times.add(a + ((b - a) * i) / steps);
  }
  for (const [i, k] of pad.sequence.entries()) {
    const next = pad.sequence[i + 1];
    if (next && k.slider !== next.slider) sweep(k.at, next.at);
  }
  for (const model of [stack, pad]) for (const part of model.parts) for (const move of part.clocked ?? []) sweep(move.from, move.to);
  return [...times].sort((a, b) => a - b);
}

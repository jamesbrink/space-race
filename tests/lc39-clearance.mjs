// The rendered site and its collision bake use the same two independent models and countdown.
import { flight as apollo11 } from '../missions/usa/apollo/flights/apollo-11/flight.ts';
import { flight as apollo12 } from '../missions/usa/apollo/flights/apollo-12/flight.ts';

export const flights = [
  [apollo11, 506],
  [apollo12, 507],
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

/**
 * The shape every flight's data file has. The viewer renders it today; the simulator will
 * fly from the same numbers, so each one says how far it can be trusted. Said by domain in src/types/, and gathered here.
 */
export type { Confidence, Measure } from './measure.ts';
export type * from './types/flight.ts';
export type * from './types/model.ts';
export type * from './types/site.ts';
export type * from './types/sim.ts';
export type * from './types/weather.ts';

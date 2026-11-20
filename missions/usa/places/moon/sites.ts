import type { LunarSiteDef } from '../../../../src/types.ts';
import { DESCARTES } from './descartes.ts';
import { FRA_MAURO } from './fra-mauro.ts';
import { HADLEY } from './hadley.ts';
import { OCEAN_OF_STORMS } from './ocean-of-storms.ts';
import { TAURUS_LITTROW } from './taurus-littrow.ts';
import { TRANQUILITY } from './tranquility.ts';

/** Every Apollo landing site, in the order they were landed at. src/world/lunar-sites.json is written from these (tools/lunar-sites.mjs). */
export const LUNAR_SITES: readonly LunarSiteDef[] = [TRANQUILITY, OCEAN_OF_STORMS, FRA_MAURO, HADLEY, DESCARTES, TAURUS_LITTROW];

/**
 * How the terrain is baked (tools/lunar-terrain.py): the same at every site. The nested grids: `intervals` squares a side,
 * each grid `spacing` metres a square, the finest round the centre. The descent strip: `spacing` metres a cell, each the mean of
 * `average` x `average` samples of SLDEM2015 (59 m a pixel at 512 ppd), from `uprange` metres before the LM along the track to
 * `downrange` past it (past the grids' 32.8 km, for a descent that overshoots), `half` metres either side: 560 by 60 km, powered
 * descent's whole ground track (483 to 516 km where the mission reports give its start).
 */
export const LUNAR_BAKE = {
  radius: 1_737_400,
  intervals: 128,
  spacing: [2, 8, 32, 128, 512],
  strip: { spacing: 250, average: 4, uprange: 520_000, downrange: 40_000, half: 30_000 },
};

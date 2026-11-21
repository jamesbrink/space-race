import { DEG } from '../../world/frames.ts';
import { DAY_EXPOSURE, LAND_REFLECTANCE } from '../daysky.ts';

/**
 * The light on the Moon's ground, as numbers (lunar/setting.ts draws by them; tests/lunarsetting.test.mjs holds them):
 * how much of the Sun shows over the level horizon, and the exposure an eye on the sunlit ground has. Each a smooth
 * function of the Sun's height, so the light never steps as the clock runs (rendering.md, "Light must never step").
 */

/** The Sun's angular radius, radians (0.2666 degrees at 1 au: as heavens.ts draws it). */
export const SUN_RADIUS = 0.2666 * DEG;

/**
 * The share of the Sun's disc above the level horizon at an elevation (radians): the segment of a circle, so the light
 * comes up as the disc does, and a rising or setting Sun never steps.
 */
export function disc(elevation: number): number {
  const x = Math.max(-1, Math.min(1, elevation / SUN_RADIUS));
  return 1 - (Math.acos(x) - x * Math.sqrt(1 - x * x)) / Math.PI;
}

/**
 * How far past the day's exposure the eye opens on the earthlit night, at most: eight times, as on the Earth (daysky.ts
 * `NIGHT_ADAPTATION`'s figure). Estimated.
 */
export const NIGHT_FACTOR = 8;
/** How much of the eye's adapting to the ground's light the exposure follows: its square root (estimated: a photograph's is all of it, an eye's less). */
export const ADAPTS = 0.5;
/** The light a level ground has from the Earth's noon Sun, scene units: the ground setting's (backdrops.ts, `dayLight(50)`'s 3.9 at 50 degrees). */
export const NOON_GROUND = 3.9 * Math.sin(50 * DEG);

/**
 * The exposure for the light on the level ground (`ground`: the Sun's irradiance there, scene units) on soil of
 * `albedo`: the day's on the Earth (daysky.ts `DAY_EXPOSURE`, for land of the Earth's reflectance under a noon Sun,
 * `noon`) opened by the square root of how much darker the ground is than that land, up to the night's. Estimated
 * (`ADAPTS`, `NIGHT_FACTOR`).
 */
export function exposureFor(ground: number, albedo: number, noon = NOON_GROUND): number {
  const day = LAND_REFLECTANCE * noon;
  const here = Math.max(albedo * ground, day / NIGHT_FACTOR ** (1 / ADAPTS));
  return DAY_EXPOSURE * (day / here) ** ADAPTS;
}

/**
 * The air over a site as a day's record has it (types.ts: `DayWeather.aloft`, `DayWeather.hours`): pure doubles, read
 * at any height and hour. A column's levels are joined as the standard atmosphere joins its layers: the temperature
 * straight in geopotential height between two levels, the pressure along the power law that temperature implies, set
 * so it meets both levels' pressures exactly (where the temperature does not change, exponentially). So a column whose
 * levels are the U.S. Standard Atmosphere 1976's layer bases gives the standard back to rounding (tests/aloft.test.mjs);
 * a sounding's or ERA5's 37 levels, a few hundred metres to a few kilometres apart, hold their own. The density is the
 * dry air's (humidity, which lightens it by under 1 per cent, is left out). The wind is taken straight between levels
 * in each of its east and north parts.
 *
 * Outside a column (below its lowest level, above its top) and where a day has none, nothing is answered here: the
 * caller flies the standard atmosphere there and says so (docs/agents/world.md, "The air aloft").
 */
import type { Confidence, Measure } from '../measure.ts';
import type { Aloft, AloftLevel, Wind, WeatherHour } from '../types/weather.ts';

/** Specific gas constant of dry air, J/(kg K) (the 1976 standard's). */
const R = 287.053;
/** The Earth's radius the standard turns geometric height into geopotential height with, metres (U.S. Standard Atmosphere 1976). */
const R0 = 6_356_766;
const DEG = Math.PI / 180;

/** Geopotential height, metres, of a geometric height above the sea (the 1976 standard's rule). */
export const geopotential = (height: number): number => (R0 * height) / (R0 + height);
/** And back. */
export const geometric = (h: number): number => (R0 * h) / (R0 - h);

/** A wind as its east and north parts, m/s (the way it blows toward). */
export function windParts(w: Wind): [east: number, north: number] {
  const from = w.from.value * DEG;
  return [-w.speed.value * Math.sin(from), -w.speed.value * Math.cos(from)];
}

/** The air at a height in a column: temperature (K), pressure (Pa), density (kg/m^3), the wind's east and north parts (m/s, null where the levels give none). */
export interface AirAloft {
  temperature: number;
  pressure: number;
  density: number;
  wind: [east: number, north: number] | null;
}

/**
 * The air at `height` metres above the sea in a column, or null outside it (below its lowest level or above its top):
 * there the caller has the standard atmosphere.
 */
export function aloftAt(aloft: Aloft, height: number): AirAloft | null {
  const levels = aloft.levels;
  if (levels.length < 2 || !(height >= levels[0]!.height.value) || !(height <= levels[levels.length - 1]!.height.value)) return null;
  let k = 0;
  while (k < levels.length - 2 && levels[k + 1]!.height.value < height) k++;
  const [a, b] = [levels[k]!, levels[k + 1]!];
  const [h1, h2, h] = [geopotential(a.height.value), geopotential(b.height.value), geopotential(height)];
  const [t1, t2, p1, p2] = [a.temperature.value, b.temperature.value, a.pressure.value, b.pressure.value];
  const f = h2 > h1 ? (h - h1) / (h2 - h1) : 0;
  const temperature = t1 + (t2 - t1) * f;
  // (the power law through both levels: (T/T1)^k with k = ln(p2/p1) / ln(T2/T1); the standard's own -g0/(R a) where
  // the levels are its; and where the temperature does not change, exponential in height)
  const pressure = Math.abs(t2 - t1) < 1e-9 * t1 ? p1 * (p2 / p1) ** f : p1 * (temperature / t1) ** (Math.log(p2 / p1) / Math.log(t2 / t1));
  const wind = a.wind && b.wind ? lerp2(windParts(a.wind), windParts(b.wind), f) : null;
  return { temperature, pressure, density: pressure / (R * temperature), wind };
}

const lerp2 = (a: readonly [number, number], b: readonly [number, number], f: number): [number, number] => [
  a[0] + (b[0] - a[0]) * f,
  a[1] + (b[1] - a[1]) * f,
];

/** The surface's weather at an instant (ISO 8601 or a Unix time in ms), between the two hours either side; null outside the hours. */
export function hourAt(
  hours: readonly WeatherHour[],
  at: string | number,
): { wind: [east: number, north: number] | null; temperature: number | null; pressure: number | null } | null {
  const t = typeof at === 'number' ? at : Date.parse(at);
  if (!hours.length) return null;
  const times = hours.map((x) => Date.parse(x.at));
  if (t < times[0]! || t > times[times.length - 1]!) return null;
  let k = 0;
  while (k < hours.length - 2 && times[k + 1]! < t) k++;
  const [a, b] = [hours[k]!, hours[Math.min(k + 1, hours.length - 1)]!];
  const f = times[k + 1] !== undefined && times[k + 1]! > times[k]! ? (t - times[k]!) / (times[k + 1]! - times[k]!) : 0;
  const mix = (x: Measure | undefined, y: Measure | undefined): number | null => (x && y ? x.value + (y.value - x.value) * f : null);
  return {
    wind: a.wind && b.wind ? lerp2(windParts(a.wind), windParts(b.wind), f) : null,
    temperature: mix(a.temperature, b.temperature),
    pressure: mix(a.pressure, b.pressure),
  };
}

/**
 * A column from rows of figures, as a tool writes one (tools/era5-aloft.mjs): each row pressure (hPa), height (m above the
 * sea, geometric), temperature (K), and the wind's east and north parts (m/s), every figure with the one confidence and
 * source given.
 */
export function aloftFrom(
  observed: Aloft['observed'],
  rows: readonly (readonly [hPa: number, height: number, kelvin: number, east: number, north: number])[],
  confidence: Confidence,
  source: string,
): Aloft {
  const m = (value: number): Measure => ({ value, confidence, source });
  const levels: AloftLevel[] = rows
    .map(([hPa, height, kelvin, east, north]) => ({
      pressure: m(hPa * 100),
      height: m(height),
      temperature: m(kelvin),
      wind: windOf(east, north, confidence, source),
    }))
    .sort((x, y) => x.height.value - y.height.value);
  return { observed, levels };
}

/**
 * The surface's hours from rows, as a tool writes them: each the hour (ISO 8601), the wind's east and north parts at 10 m
 * (m/s), the temperature at 2 m (K) and the pressure at the ground (Pa), with the one confidence and source given.
 */
export function hoursFrom(
  rows: readonly (readonly [at: string, east: number, north: number, kelvin: number, pascals: number])[],
  confidence: Confidence,
  source: string,
): WeatherHour[] {
  return rows.map(([at, east, north, kelvin, pascals]) => ({
    at,
    wind: windOf(east, north, confidence, source),
    temperature: { value: kelvin, confidence, source },
    pressure: { value: pascals, confidence, source },
  }));
}

/** A wind from its east and north parts (m/s): the bearing it blows from and its speed. */
export function windOf(east: number, north: number, confidence: Confidence, source: string): Wind {
  const from = (((Math.atan2(-east, -north) / DEG) % 360) + 360) % 360;
  return { from: { value: from, confidence, source }, speed: { value: Math.hypot(east, north), confidence, source } };
}

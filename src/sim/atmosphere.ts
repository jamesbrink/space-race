import { G0, P0 } from '../world/bodies.ts';
/**
 * The air: the U.S. Standard Atmosphere, 1976 (NOAA-S/T 76-1562). Below 86 km it is the
 * standard's own definition, seven layers of constant temperature gradient in geopotential
 * height, computed exactly. Above, where the standard is tabulated rather than defined, density
 * is read between its Table I's rows (every 10 km to 300 km, then 50 and 100 km to its end at
 * 1,000 km: `UPPER_ROWS`), straight in its logarithm; pressure there is too small to matter to an
 * engine and is taken as nothing.
 *
 * It is a mean mid-latitude year. The Cape in May is warmer and a few per cent thinner low down;
 * the flight's own planners used the annual Patrick AFB atmosphere, which is not reproduced here.
 */

/** Specific gas constant of dry air, J/(kg K), and the ratio of its specific heats. */
const R = 287.053;
const GAMMA = 1.4;
/** The Earth's radius the standard turns geometric height into geopotential height with, metres. */
const R0 = 6_356_766;

/** Each layer: its base in geopotential metres, the temperature there, the gradient above it (K/m), the pressure at its base. */
const LAYERS: readonly [base: number, temperature: number, gradient: number, pressure: number][] = (() => {
  const defined: [number, number][] = [
    [0, -0.0065],
    [11_000, 0],
    [20_000, 0.001],
    [32_000, 0.0028],
    [47_000, 0],
    [51_000, -0.0028],
    [71_000, -0.002],
  ];
  const out: [number, number, number, number][] = [];
  let temperature = 288.15;
  let pressure = P0;
  defined.forEach(([base, gradient], i) => {
    out.push([base, temperature, gradient, pressure]);
    const top = defined[i + 1]?.[0] ?? 84_852;
    const next = temperature + gradient * (top - base);
    pressure *= gradient === 0 ? Math.exp((-G0 * (top - base)) / (R * temperature)) : (temperature / next) ** (G0 / (R * gradient));
    temperature = next;
  });
  return out;
})();

/**
 * The standard's own rows above 200 km (and at 170 and 190), switched: off, the table ends at 200 km as it did until
 * November 2026 and the slope from 180 to 200 km is carried on beyond (11 per cent thin at 220 km, 18 at 230), which is
 * the air every figure was flown in before (`pnpm figures` gives the old capture back to the bit with it off).
 */
export const UPPER_ROWS = { on: true };

/**
 * Density above the defined layers: [geometric height, km; kg/m^3], from the standard's Table I (NOAA-S/T 76-1562,
 * pp. 68 to 73: every half kilometre to 100 km, every kilometre to 300, then every 2 and 5 km to 1,000). Every tenth
 * row to 300 km is carried, then 350 to 500 and every 100 km: read straight in the logarithm between them, the density
 * is within 0.7 per cent of the table's own rows between (165 km: 9.816e-10 against 9.750e-10; 175 km: 0.5 per cent;
 * 245 km: 0.15), more above 300 km, where no flight here goes but Voskhod 2's apogee.
 */
const ROWS: readonly [number, number][] = [
  [86, 6.958e-6],
  [90, 3.416e-6],
  [100, 5.604e-7],
  [110, 9.708e-8],
  [120, 2.222e-8],
  [130, 8.152e-9],
  [140, 3.831e-9],
  [150, 2.076e-9],
  [160, 1.233e-9],
  [170, 7.815e-10],
  [180, 5.194e-10],
  [190, 3.581e-10],
  [200, 2.541e-10],
  [210, 1.846e-10],
  [220, 1.367e-10],
  [230, 1.029e-10],
  [240, 7.858e-11],
  [250, 6.073e-11],
  [260, 4.742e-11],
  [270, 3.738e-11],
  [280, 2.971e-11],
  [290, 2.378e-11],
  [300, 1.916e-11],
  [350, 7.014e-12],
  [400, 2.803e-12],
  [450, 1.184e-12],
  [500, 5.215e-13],
  [600, 1.137e-13],
  [700, 3.07e-14],
  [800, 1.136e-14],
  [900, 5.759e-15],
  [1000, 3.561e-15],
];
/** The rows as they were until November 2026: to 200 km, without 170 and 190 (`UPPER_ROWS` off). */
const THIN: readonly [number, number][] = [
  [86, 6.958e-6],
  [90, 3.416e-6],
  [100, 5.604e-7],
  [110, 9.708e-8],
  [120, 2.222e-8],
  [130, 8.152e-9],
  [140, 3.831e-9],
  [150, 2.076e-9],
  [160, 1.233e-9],
  [180, 5.194e-10],
  [200, 2.541e-10],
];

export interface Air {
  /** kg/m^3 */
  density: number;
  /** Pa */
  pressure: number;
  /** K */
  temperature: number;
  /** m/s */
  soundSpeed: number;
}

/** The air at a height above sea level, metres. Below sea level it is the sea-level layer carried down. */
export function atmosphere(height: number): Air {
  if (height < 86_000) {
    const h = (R0 * height) / (R0 + height); // geopotential height
    let layer = LAYERS[0]!;
    for (const l of LAYERS) if (h >= l[0]) layer = l;
    const [base, t0, gradient, p0] = layer;
    const temperature = t0 + gradient * (h - base);
    const pressure = gradient === 0 ? p0 * Math.exp((-G0 * (h - base)) / (R * t0)) : p0 * (t0 / temperature) ** (G0 / (R * gradient));
    return { density: pressure / (R * temperature), pressure, temperature, soundSpeed: Math.sqrt(GAMMA * R * temperature) };
  }
  const km = height / 1000;
  const rows = UPPER_ROWS.on ? ROWS : THIN;
  let i = 1;
  while (i < rows.length - 1 && km > rows[i]![0]) i++;
  const [h0, d0] = rows[i - 1]!;
  const [h1, d1] = rows[i]!;
  const density = d0 * (d1 / d0) ** ((km - h0) / (h1 - h0)); // a straight line in the logarithm, carried on past the table's end
  // temperature and the speed of sound are held at their values at 86 km: by here they only set a Mach number far above any that matters
  return { density, pressure: 0, temperature: 186.87, soundSpeed: 274.1 };
}

/** Above this height, m, the predicted path leaves the air out (sim/fliers.ts): at 200 km its drag on a spacecraft is under a ten-thousandth of a millimetre a second squared. */
export const AIR_TOP = 200_000;

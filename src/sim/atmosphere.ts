/**
 * The air: the U.S. Standard Atmosphere, 1976 (NOAA-S/T 76-1562). Below 86 km it is the
 * standard's own definition, seven layers of constant temperature gradient in geopotential
 * height, computed exactly. Above, where the standard is tabulated rather than defined, density
 * is read between its table's values (to 200 km) and falls off with the last scale height beyond;
 * pressure there is too small to matter to an engine and is taken as nothing.
 *
 * It is a mean mid-latitude year. The Cape in May is warmer and a few per cent thinner low down;
 * the flight's own planners used the annual Patrick AFB atmosphere, which is not reproduced here.
 */

const G0 = 9.80665;
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
  let pressure = 101_325;
  defined.forEach(([base, gradient], i) => {
    out.push([base, temperature, gradient, pressure]);
    const top = defined[i + 1]?.[0] ?? 84_852;
    const next = temperature + gradient * (top - base);
    pressure *= gradient === 0 ? Math.exp((-G0 * (top - base)) / (R * temperature)) : (temperature / next) ** (G0 / (R * gradient));
    temperature = next;
  });
  return out;
})();

/** Density above the defined layers: [geometric height, km; kg/m^3], from the standard's Table I. */
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
  let i = 1;
  while (i < THIN.length - 1 && km > THIN[i]![0]) i++;
  const [h0, d0] = THIN[i - 1]!;
  const [h1, d1] = THIN[i]!;
  const density = d0 * (d1 / d0) ** ((km - h0) / (h1 - h0)); // a straight line in the logarithm, carried on past the table's end
  // temperature and the speed of sound are held at their values at 86 km: by here they only set a Mach number far above any that matters
  return { density, pressure: 0, temperature: 186.87, soundSpeed: 274.1 };
}

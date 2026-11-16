/**
 * The upper air by the Sun's activity: L. G. Jacchia, "Revised static models of the thermosphere and exosphere with
 * empirical temperature profiles", Smithsonian Astrophysical Observatory Special Report 332, 5 May 1971 (J71, adopted
 * as CIRA 1972; read from the NTRS scan, 19710024820). The 1976 standard (sim/atmosphere.ts) is one static model, a
 * mean year whose exosphere is at 1000 K; the day's exosphere is hotter or cooler with the Sun's ultraviolet (the
 * 10.7 cm flux, its proxy) and the geomagnetic storms (Kp), by day than by night, and through the year. Above about
 * 150 km that moves the density several-fold. Pure, in doubles; held by tests/thermosphere.test.mjs to the report's
 * worked example (its section 15) and its tables.
 *
 * What is done, each from the report, and what is not:
 * - The exospheric temperature: the night-time minimum from the fluxes (eq. 14), the day's bulge round the Sun's
 *   place (eqs. 15 to 17), and the storms' heating (eq. 18), from the day's published indices (`DAYS`).
 * - The density at that temperature from the report's own static models (Table 6, every 100 K; Table 7's columns
 *   for 600 to 900 K), read as a factor on the 1976 standard: J71's density at the day's temperature over J71's at
 *   the standard's 1000 K (`ratioOf`). So at 1000 K the air is the standard's to the bit, and nothing steps where the
 *   1976 standard is defined below. (J71's own density at 1000 K is 9 per cent over the standard's at 200 km; the
 *   standard is kept and J71 read only for how the day departs from the mean.)
 * - The semiannual variation (eqs. 21 to 23), on top.
 * - Below 120 km, where the report's Table 7 does not go and its profiles meet at 90 km (eq. 3's boundary), the
 *   factor's logarithm is taken straight down to nothing at 90 km: estimated, and worth a few per cent in a hundred
 *   seconds of an entry.
 * - Left out: the seasonal-latitudinal variation of the lower thermosphere (Table 4's sin^2: under 0.001 in the
 *   logarithm above 170 km, about 0.01 at 150 km, and larger below 130 km, where the factor is eased away anyway); eq. 20's
 *   hybrid geomagnetic term, which Jacchia prefers below 200 km (eq. 18 is used at every height, so that nothing steps
 *   at 200 km); the smoothing of Kp he asks for (the three-hourly index 6.7 h before is taken as it is); the helium bulge.
 */

/** A day's published indices: the eight three-hourly Kp (as GFZ gives them, in thirds), the daily Ap, the observed 10.7 cm flux at Ottawa's noon (10^-22 W m^-2 Hz^-1), and that flux's 81-day centred mean. */
export interface SolarDay {
  date: string;
  kp: readonly number[];
  ap: number;
  flux: number;
  mean: number;
}

/**
 * The days flown, from GFZ Potsdam's "Kp_ap_Ap_SN_F107_since_1932.txt" (Matzka et al. 2021, doi:10.5880/Kp.0001;
 * definitive Kp, and the Ottawa observed F10.7 as NRCan publishes it: Tapping 2013, doi:10.1002/swe.20064),
 * documented. The 81-day mean is derived: the plain mean of the day's observed flux and the forty days either side, a
 * missing day left out (the 1962 window has three, so 78 to 80 days there). J71 wants the observed flux, not the one
 * adjusted to 1 AU (its section 15 works 20 January 1969 on 136, which is the observed figure for the 19th).
 */
const ROWS: readonly [date: string, kp: number[], ap: number, flux: number, mean: number][] = [
  ['1961-04-11', [4, 5, 3, 3.333, 3.333, 5.333, 3.333, 1.667], 26, 92.1, 103.69],
  ['1961-04-12', [2, 1.667, 3.333, 2, 3.333, 2.667, 2.333, 1.667], 10, 89.1, 103.76],
  ['1961-08-05', [1.333, 1.667, 2.333, 3.333, 2.667, 1.667, 1.667, 2.333], 9, 90.0, 112.43],
  ['1961-08-06', [2.333, 1.333, 1.333, 1.667, 2.333, 1.667, 1.667, 2.333], 7, 92.0, 112.77],
  ['1961-08-07', [0.333, 0.667, 0.333, 0.667, 2, 0.667, 1.667, 2], 4, 99.1, 113.19],
  ['1962-08-10', [3, 2.667, 3.333, 2.333, 2.333, 2.667, 1, 1], 10, 75.5, 82.2],
  ['1962-08-11', [1, 0.667, 0.333, 0.333, 0.667, 0.333, 0.667, 0], 2, 73.7, 82.22],
  ['1962-08-12', [0.333, 1, 0.667, 1.667, 1.667, 0.333, 0.333, 1], 4, 76.3, 82.23],
  ['1962-08-13', [0.667, 0.667, 1, 1.333, 0.667, 0.333, 1, 3.333], 5, 79.1, 82.22],
  ['1962-08-14', [2.333, 2.333, 1, 1.667, 2.333, 1, 3, 3.333], 9, 83.2, 82.13],
  ['1962-08-15', [2.667, 4.667, 5, 3.333, 2, 2.667, 2.667, 4], 22, 91.6, 82.06],
  ['1963-06-13', [2, 1.333, 1, 1.667, 1.333, 1, 1.333, 1.667], 5, 107.3, 82.98],
  ['1963-06-14', [2.667, 0, 1, 2, 1.667, 2, 0.333, 1.333], 5, 100.4, 82.86],
  ['1963-06-15', [1.667, 3.333, 3.333, 1.333, 1.333, 1.333, 1.667, 2], 9, 95.7, 82.74],
  ['1963-06-16', [0.333, 0, 0, 0.333, 0, 1.667, 1.333, 1.333], 2, 88.8, 82.57],
  ['1963-06-17', [2.333, 1.667, 2.333, 2, 2.333, 3, 2.333, 2.333], 9, 86.0, 82.4],
  ['1963-06-18', [1, 3.333, 2.667, 3, 4.333, 3, 5, 4], 21, 82.4, 82.23],
  ['1963-06-19', [3.333, 2.667, 1.667, 0.667, 1.667, 2.333, 3.333, 2.667], 10, 79.4, 82.1],
];
export const DAYS: ReadonlyMap<string, SolarDay> = new Map(ROWS.map(([date, kp, ap, flux, mean]) => [date, { date, kp, ap, flux, mean }]));

const DEG = Math.PI / 180;
/** The Julian date of 1858 November 17.0 UT, from which a modified Julian date counts. */
const MJD0 = 2_400_000.5;

/** The UT date (YYYY-MM-DD) and the hours into it of a Julian date (UT). */
function dayOf(jdUT: number): { date: string; hours: number } {
  const mjd = jdUT - MJD0;
  const day = Math.floor(mjd);
  const date = new Date(Date.UTC(1858, 10, 17) + day * 86_400_000).toISOString().slice(0, 10);
  return { date, hours: (mjd - day) * 24 };
}

/** Kp at an instant, the three-hourly index of the interval it falls in; null outside the days held. */
export function kpAt(jdUT: number): number | null {
  const { date, hours } = dayOf(jdUT);
  const day = DAYS.get(date);
  return day ? day.kp[Math.min(7, Math.floor(hours / 3))]! : null;
}

/** The exospheric temperature, K, and its parts: the day's indices at an instant (UT Julian date), at a latitude (rad), the Sun at a declination and an hour angle there (rad: the Sun's local hour angle, 0 at noon). Null outside the days held. */
export function exosphere(
  jdUT: number,
  latitude: number,
  declination: number,
  hourAngle: number,
): { night: number; local: number; storm: number; temperature: number } | null {
  // eq. 14: the night-time minimum of the whole globe at Kp 0, from the flux of the day before and its mean, K
  const before = DAYS.get(dayOf(jdUT - 1).date);
  const today = DAYS.get(dayOf(jdUT).date);
  const kp = kpAt(jdUT - 6.7 / 24);
  if (!before || !today || kp === null) return null;
  const mean = today.mean;
  const night = 379 + 3.24 * mean + 1.3 * (before.flux - mean);
  // eqs. 15 to 17: the day's bulge, its greatest 30 per cent over the night's, lagging the Sun by two hours
  const [m, n, R, beta, p, gamma] = [2.2, 3.0, 0.3, -37 * DEG, 6 * DEG, 43 * DEG];
  const eta = Math.abs(latitude - declination) / 2;
  const theta = Math.abs(latitude + declination) / 2;
  const day = night * (1 + R * Math.cos(eta) ** m);
  const low = night * (1 + R * Math.sin(theta) ** m);
  const A = (day - low) / low;
  let tau = hourAngle + beta + p * Math.sin(hourAngle + gamma);
  tau = ((((tau + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
  const local = low * (1 + A * Math.abs(Math.cos(tau / 2)) ** n);
  // eq. 18: the storms' heating, from Kp 6.7 hours before
  const storm = 28 * kp + 0.03 * Math.exp(kp);
  return { night, local, storm, temperature: local + storm };
}

/**
 * J71's static models, log10 of the density in g/cm^3, by height (km) and exospheric temperature (K): Table 7 (report
 * p. 108) for 600 to 900 K, Table 6 (pp. 78 to 107; the 1000 to 1400 K profiles, pp. 88 to 96 of the scan) above, where
 * the scan has lost Table 7's pages 109 and 110. Documented.
 */
const COLUMNS = [600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400] as const;
const MODELS: readonly [km: number, logs: readonly number[]][] = [
  [120, [-10.637, -10.629, -10.622, -10.617, -10.613, -10.609, -10.606, -10.603, -10.601]],
  [130, [-11.138, -11.115, -11.097, -11.083, -11.072, -11.062, -11.054, -11.047, -11.041]],
  [140, [-11.522, -11.485, -11.456, -11.434, -11.416, -11.401, -11.388, -11.377, -11.368]],
  [150, [-11.83, -11.778, -11.739, -11.709, -11.685, -11.666, -11.649, -11.635, -11.623]],
  [160, [-12.092, -12.024, -11.974, -11.936, -11.906, -11.882, -11.862, -11.845, -11.831]],
  [170, [-12.323, -12.24, -12.179, -12.132, -12.096, -12.067, -12.043, -12.023, -12.006]],
  [180, [-12.534, -12.435, -12.362, -12.307, -12.264, -12.23, -12.202, -12.179, -12.159]],
  [190, [-12.728, -12.614, -12.53, -12.466, -12.416, -12.377, -12.344, -12.318, -12.295]],
  [200, [-12.911, -12.782, -12.686, -12.613, -12.556, -12.511, -12.474, -12.444, -12.418]],
  [210, [-13.083, -12.939, -12.833, -12.751, -12.687, -12.636, -12.594, -12.56, -12.531]],
  [220, [-13.247, -13.089, -12.971, -12.881, -12.81, -12.753, -12.706, -12.668, -12.636]],
  [230, [-13.403, -13.232, -13.103, -13.004, -12.926, -12.863, -12.812, -12.769, -12.734]],
  [240, [-13.554, -13.368, -13.229, -13.121, -13.036, -12.968, -12.912, -12.865, -12.826]],
  [250, [-13.701, -13.5, -13.35, -13.234, -13.142, -13.068, -13.007, -12.956, -12.914]],
  [260, [-13.843, -13.628, -13.467, -13.343, -13.244, -13.164, -13.098, -13.043, -12.997]],
  [270, [-13.982, -13.752, -13.58, -13.448, -13.342, -13.257, -13.186, -13.127, -13.077]],
  [280, [-14.117, -13.873, -13.691, -13.549, -13.437, -13.346, -13.271, -13.208, -13.154]],
  [290, [-14.251, -13.992, -13.798, -13.648, -13.529, -13.433, -13.353, -13.286, -13.228]],
  [300, [-14.382, -14.108, -13.903, -13.745, -13.619, -13.517, -13.432, -13.361, -13.301]],
  [350, [-15.013, -14.664, -14.403, -14.201, -14.041, -13.911, -13.803, -13.713, -13.635]],
  [400, [-15.608, -15.19, -14.873, -14.627, -14.433, -14.274, -14.143, -14.033, -13.938]],
];

/** J71's log10 density (g/cm^3) at a height (km, 120 to 400) and exospheric temperature (K, 600 to 1400): straight in height between the rows, through the three nearest columns in temperature (a parabola: straight, it is 1.3 per cent out at 200 km between two of them). */
export function logDensity(km: number, temperature: number): number {
  const h = Math.min(Math.max(km, MODELS[0]![0]), MODELS[MODELS.length - 1]![0]);
  let i = 1;
  while (i < MODELS.length - 1 && h > MODELS[i]![0]) i++;
  const [h0, lo] = MODELS[i - 1]!;
  const [h1, hi] = MODELS[i]!;
  const T = Math.min(Math.max(temperature, COLUMNS[0]), COLUMNS[COLUMNS.length - 1]);
  const j = Math.min(Math.max(Math.round((T - COLUMNS[0]) / 100), 1), COLUMNS.length - 2);
  const across = (row: readonly number[]): number => {
    const [x0, x1, x2] = [COLUMNS[j - 1]!, COLUMNS[j]!, COLUMNS[j + 1]!];
    const [y0, y1, y2] = [row[j - 1]!, row[j]!, row[j + 1]!];
    return (
      (y0 * (T - x1) * (T - x2)) / ((x0 - x1) * (x0 - x2)) +
      (y1 * (T - x0) * (T - x2)) / ((x1 - x0) * (x1 - x2)) +
      (y2 * (T - x0) * (T - x1)) / ((x2 - x0) * (x2 - x1))
    );
  };
  const [a, b] = [across(lo), across(hi)];
  return a + ((b - a) * (h - h0)) / (h1 - h0);
}

/** Eqs. 21 to 23: the semiannual variation of log10 density at a height (km) on a day (modified Julian date). */
export function semiannual(km: number, mjd: number): number {
  const f = (5.876e-7 * km ** 2.331 + 0.06328) * Math.exp(-2.868e-3 * km);
  const phi = (mjd - 36_204) / 365.2422;
  const tau = phi + 0.09544 * ((0.5 + 0.5 * Math.sin(2 * Math.PI * phi + 6.035)) ** 1.65 - 0.5);
  const g = 0.02835 + 0.3817 * (1 + 0.4671 * Math.sin(2 * Math.PI * tau + 4.137)) * Math.sin(4 * Math.PI * tau + 4.259);
  return f * g;
}

/** The exospheric temperature of the 1976 standard, K (NOAA-S/T 76-1562, its eq. 25's T-infinity). */
export const STANDARD_EXOSPHERE = 1000;

/**
 * The factor on the 1976 standard's density at a height (m above the sea), an instant (UT Julian date), a latitude and
 * the Sun's declination and local hour angle there (rad): 10^(J71's log density at the day's exospheric temperature
 * less at 1000 K, plus the semiannual term), from 120 km up; below, its logarithm straight down to nothing at 90 km;
 * 1 below 90 km and on a day not held (null then, so the caller can say the standard was flown).
 */
export function ratioOf(height: number, jdUT: number, latitude: number, declination: number, hourAngle: number): number | null {
  const x = exosphere(jdUT, latitude, declination, hourAngle);
  if (!x) return null;
  const km = height / 1000;
  if (km <= 90) return 1;
  const at = Math.max(km, 120);
  const log = logDensity(at, x.temperature) - logDensity(at, STANDARD_EXOSPHERE) + semiannual(at, jdUT - MJD0);
  return 10 ** (km >= 120 ? log : (log * (km - 90)) / 30);
}

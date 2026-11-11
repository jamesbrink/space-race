/**
 * Time. An instant enters as an ISO 8601 UTC string, as flight.ts records a launch, and leaves as
 * the two things astronomy wants: how far the Earth has turned (UT) and how much uniform time has
 * passed (TT).
 *
 * UT   A Julian date counted in UTC, taken to be UT1: the angle the Earth has turned through.
 *      Since 1972 UTC is kept within 0.9 s of UT1 by leap seconds; before that it was steered to
 *      within about 0.1 s of it (in 1961, by rate offsets and small steps). 0.9 s of rotation is
 *      0.004 degrees of sky, inside every accuracy this module claims, so no table of UT1 - UTC
 *      is carried.
 * TT   Terrestrial Time, what the Sun, the Moon and the planets keep. TT = UT + delta-T, and
 *      delta-T is the Earth's accumulated lateness: 33.7 s in May 1961, 69 s today. It comes
 *      from Espenak and Meeus's polynomial fits, which are within a second of the measured value
 *      for 1900 to 2020. A second moves the Moon half an arcsecond and the Sun a twenty-fifth
 *      of one.
 *
 * Julian dates are doubles: at 2.4 million days one holds 40 microseconds. For a simulation's
 * clock keep seconds from an epoch instead (the launch) and add them to a Julian date only when an
 * ephemeris is asked for.
 */

/** The Julian date of 1 January 2000, 12:00: the epoch every series here is counted from. */
export const J2000 = 2_451_545.0;
/** The Julian date of the Unix epoch, 1 January 1970, 00:00 UTC. */
const UNIX_EPOCH = 2_440_587.5;
const DAY_MS = 86_400_000;
const DEG = Math.PI / 180;

/** The Julian date (UT) of an ISO 8601 instant: '1961-05-05T14:34:13Z'. A string with no zone is read as UTC. */
export function julianDate(iso: string): number {
  const zoned = /(Z|[+-]\d\d:?\d\d)$/.test(iso) ? iso : `${iso}${iso.includes('T') ? '' : 'T00:00:00'}Z`;
  const ms = Date.parse(zoned);
  if (Number.isNaN(ms)) throw new Error(`not an ISO 8601 instant: ${iso}`);
  return ms / DAY_MS + UNIX_EPOCH;
}

/** A Julian date (UT) as an ISO 8601 UTC string, to the millisecond. */
export function isoDate(jd: number): string {
  return new Date(Math.round((jd - UNIX_EPOCH) * DAY_MS)).toISOString();
}

/** Julian centuries from J2000. */
export const centuries = (jd: number): number => (jd - J2000) / 36_525;

/**
 * Delta-T = TT - UT1 in seconds for a decimal year: the polynomial expressions of Espenak and
 * Meeus (NASA/TP-2006-214141, Five Millennium Canon of Solar Eclipses, and
 * eclipse.gsfc.nasa.gov/SEcat5/deltatpoly.html). Outside 1900 to 2050 it falls back on their
 * long-term parabola, which is good to minutes, not seconds.
 */
export function deltaT(year: number): number {
  let t: number;
  if (year >= 1900 && year < 1920) {
    t = year - 1900;
    return -2.79 + 1.494119 * t - 0.0598939 * t ** 2 + 0.0061966 * t ** 3 - 0.000197 * t ** 4;
  }
  if (year >= 1920 && year < 1941) {
    t = year - 1920;
    return 21.2 + 0.84493 * t - 0.0761 * t ** 2 + 0.0020936 * t ** 3;
  }
  if (year >= 1941 && year < 1961) {
    t = year - 1950;
    return 29.07 + 0.407 * t - t ** 2 / 233 + t ** 3 / 2547;
  }
  if (year >= 1961 && year < 1986) {
    t = year - 1975;
    return 45.45 + 1.067 * t - t ** 2 / 260 - t ** 3 / 718;
  }
  if (year >= 1986 && year < 2005) {
    t = year - 2000;
    return 63.86 + 0.3345 * t - 0.060374 * t ** 2 + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5;
  }
  if (year >= 2005 && year < 2050) {
    t = year - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t ** 2;
  }
  const u = (year - 1820) / 100;
  return -20 + 32 * u ** 2;
}

/** The decimal year of a Julian date, near enough for delta-T. */
export const decimalYear = (jd: number): number => 2000 + (jd - J2000) / 365.25;

/** Terrestrial Time as a Julian date, from a Julian date in UT. */
export const terrestrialTime = (jdUT: number): number => jdUT + deltaT(decimalYear(jdUT)) / 86_400;

const wrap = (degrees: number): number => ((degrees % 360) + 360) % 360;

/**
 * Greenwich mean sidereal time, radians in [0, 2 pi): the angle from the mean equinox of date to
 * the Greenwich meridian. The IAU 1982 expression, as Meeus gives it (Astronomical Algorithms,
 * equation 12.4). `jdUT` is a Julian date in UT.
 */
export function greenwichMeanSiderealTime(jdUT: number): number {
  const T = centuries(jdUT);
  return wrap(280.46061837 + 360.98564736629 * (jdUT - J2000) + 0.000387933 * T ** 2 - T ** 3 / 38_710_000) * DEG;
}

/**
 * Nutation, radians: how far the true equinox is ahead of the mean one along the ecliptic
 * (`longitude`), how much the true equator is tipped beyond the mean (`obliquity`), and the true
 * obliquity of the ecliptic itself. The four largest terms of the IAU 1980 series (Meeus,
 * chapter 22, "if an accuracy of 0.5 arcsecond in longitude is sufficient"), on the IAU 1980
 * mean obliquity (Meeus equation 22.2). `jdTT` is a Julian date in TT.
 */
export function nutation(jdTT: number): { longitude: number; obliquity: number; meanObliquity: number; trueObliquity: number } {
  const T = centuries(jdTT);
  const node = (125.04452 - 1934.136261 * T) * DEG; // the Moon's ascending node
  const sun = (280.4665 + 36000.7698 * T) * DEG; // mean longitude of the Sun
  const moon = (218.3165 + 481267.8813 * T) * DEG; // and of the Moon
  const ARCSEC = DEG / 3600;
  const longitude = (-17.2 * Math.sin(node) - 1.32 * Math.sin(2 * sun) - 0.23 * Math.sin(2 * moon) + 0.21 * Math.sin(2 * node)) * ARCSEC;
  const obliquity = (9.2 * Math.cos(node) + 0.57 * Math.cos(2 * sun) + 0.1 * Math.cos(2 * moon) - 0.09 * Math.cos(2 * node)) * ARCSEC;
  const meanObliquity = (84381.448 - 46.815 * T - 0.00059 * T ** 2 + 0.001813 * T ** 3) * ARCSEC;
  return { longitude, obliquity, meanObliquity, trueObliquity: meanObliquity + obliquity };
}

/**
 * Greenwich apparent sidereal time, radians in [0, 2 pi): the angle from the true equinox of date
 * to the Greenwich meridian, which is the angle frames.ts turns the Earth by. Mean sidereal time
 * plus the equation of the equinoxes (nutation in longitude times the cosine of the obliquity).
 */
export function greenwichSiderealTime(jdUT: number): number {
  const n = nutation(terrestrialTime(jdUT));
  const gast = greenwichMeanSiderealTime(jdUT) + n.longitude * Math.cos(n.trueObliquity);
  return ((gast % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
}

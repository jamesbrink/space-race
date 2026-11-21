/**
 * Time. An instant enters as an ISO 8601 UTC string, as flight.ts records a launch, and leaves as
 * the two things astronomy wants: how far the Earth has turned (UT1) and how much uniform time has
 * passed (TT).
 *
 * UTC  What a launch is recorded in, and the `jdUT` every function here takes.
 * TT   Terrestrial Time, what the Sun, the Moon and the planets keep: TAI + 32.184 s exactly, and
 *      TAI - UTC is a table (`taiMinusUtc`: the leap seconds since 1972, and before them the
 *      steps and rate offsets UTC was steered by from 1960, as SOFA carries them from the IERS
 *      and USNO). So TT is exact from 1960 on: 33.77 s ahead of UTC in May 1961, 42.18 s in 1972,
 *      69.18 s since 2017. Before 1960 it is UT + delta-T from Espenak and Meeus's fits
 *      (`deltaT`), good to a second; nothing here flies then, and the hand-over on 1 January 1960
 *      is a step of 0.5 s that no flight crosses.
 * UT1  The angle the Earth has turned through: UTC + (UT1 - UTC) (`universalTime`), from the
 *      IERS's measured UT1 - TAI every 0.05 year since 1956 (ut1.ts, `pnpm ut1`), within 4 ms of
 *      its daily series (C04) since 1962: 0.06 arcseconds of turn, 2 m at the equator. Outside the
 *      table UT1 is taken to be UTC (before 1960 there was no UTC, and an instant given then is
 *      read as UT1 already), which is within 0.9 s since 1972 and 0.1 s through the 1960s: 13.5
 *      and 1.5 arcseconds of turn. After the table's last value its UT1 - TAI is held, drifting by
 *      a millisecond or two a day. None of it moves a body's place: TT is made from UTC by the
 *      table, not from UT1 by delta-T, and a second of TT is a kilometre of the Moon along its
 *      orbit (it is 35 to 42 s of TT - UT1 from 1961 to 1972); a second of UT1 is none of it.
 * TDB  What JPL's ephemerides are argued in: TT to within 1.7 ms (`barycentricTime`).
 *
 * The Earth's orientation is the IAU's of 2006: its precession (frames.ts), the IAU 2000B
 * nutation (`nutation`: 77 terms, a milliarcsecond from the full IAU 2000A), and Greenwich
 * sidereal time from the Earth rotation angle (`greenwichMeanSiderealTime`,
 * `greenwichSiderealTime`), each as the IAU's SOFA library has it and checked against SOFA's own
 * test values (tests/world.test.mjs). A milliarcsecond is 2 m at the Moon.
 *
 * Julian dates are doubles: at 2.4 million days one holds 40 microseconds. For a simulation's
 * clock keep seconds from an epoch instead (the launch) and add them to a Julian date only when an
 * ephemeris is asked for.
 */

import { UT1_TAI_CHANGES, UT1_TAI_FROM, UT1_TAI_STEP } from './ut1.ts';

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

/** MJD each entry took effect, TAI - UTC then, and before 1972 the MJD and the rate per day it drifted from (SOFA iauDat). */
const LEAPS: readonly (readonly [mjd: number, seconds: number, from?: number, rate?: number])[] = [
  [36934, 1.417818, 37300, 0.001296],
  [37300, 1.422818, 37300, 0.001296],
  [37512, 1.372818, 37300, 0.001296],
  [37665, 1.845858, 37665, 0.0011232],
  [38334, 1.945858, 37665, 0.0011232],
  [38395, 3.24013, 38761, 0.001296],
  [38486, 3.34013, 38761, 0.001296],
  [38639, 3.44013, 38761, 0.001296],
  [38761, 3.54013, 38761, 0.001296],
  [38820, 3.64013, 38761, 0.001296],
  [38942, 3.74013, 38761, 0.001296],
  [39004, 3.84013, 38761, 0.001296],
  [39126, 4.31317, 39126, 0.002592],
  [39887, 4.21317, 39126, 0.002592],
  [41317, 10],
  [41499, 11],
  [41683, 12],
  [42048, 13],
  [42413, 14],
  [42778, 15],
  [43144, 16],
  [43509, 17],
  [43874, 18],
  [44239, 19],
  [44786, 20],
  [45151, 21],
  [45516, 22],
  [46247, 23],
  [47161, 24],
  [47892, 25],
  [48257, 26],
  [48804, 27],
  [49169, 28],
  [49534, 29],
  [50083, 30],
  [50630, 31],
  [51179, 32],
  [53736, 33],
  [54832, 34],
  [56109, 35],
  [57204, 36],
  [57754, 37],
];

/**
 * TAI - UTC in seconds at a Julian date in UTC: SOFA's table (iauDat, from the IERS's Bulletin C and USNO's
 * tai-utc.dat), each entry from the day it took effect, and before 1972 drifting at the rate UTC was then steered by.
 * NaN before 1960, when there was no UTC. The last leap second was at the end of 2016 and none is announced since: the
 * table is carried on unchanged.
 */
export function taiMinusUtc(jdUTC: number): number {
  const mjd = jdUTC - 2_400_000.5;
  if (!(mjd >= LEAPS[0]![0])) return Number.NaN;
  let i = LEAPS.length - 1;
  while (LEAPS[i]![0] > mjd) i--;
  const [, seconds, from, rate] = LEAPS[i]!;
  return from === undefined || rate === undefined ? seconds : seconds + (mjd - from) * rate;
}

/** TT - TAI, seconds: exact by definition (IAU 1991 Resolution A4). */
const TT_TAI = 32.184;

/**
 * Terrestrial Time as a Julian date, from a Julian date in UTC: UTC + (TAI - UTC) + 32.184 s from 1960 on, exact; and
 * UT + delta-T before, a fit good to a second.
 */
export const terrestrialTime = (jdUT: number): number => jdUT + ttLessUT(jdUT) / 86_400;

/**
 * TT less UTC at a Julian date in UTC, seconds: what `terrestrialTime` adds. Asked for by itself where an instant is
 * kept in two parts (a Julian date and seconds on from it: world/ephemeris.ts `stateOf`), since a Julian date in one
 * double steps by 40 microseconds.
 */
export function ttLessUT(jdUT: number): number {
  const leap = taiMinusUtc(jdUT);
  return Number.isNaN(leap) ? deltaT(decimalYear(jdUT)) : leap + TT_TAI;
}

/**
 * Barycentric Dynamical Time as a Julian date, what JPL's ephemerides are argued in, from TT: the two largest periodic
 * terms of TDB - TT (the Earth's eccentric orbit, 1.657 ms on the Sun's mean anomaly, and 22 microseconds from Jupiter;
 * Explanatory Supplement to the Astronomical Almanac, 3rd ed., 2013, eq. 3.17). Within 30 microseconds: 3 cm of the Moon.
 */
export function barycentricTime(jdTT: number): number {
  return jdTT + tdbLessTT(jdTT) / 86_400;
}

/** TDB less TT at a Julian date in TT, seconds: what `barycentricTime` adds (and why it is asked for by itself: `ttLessUT`). */
export function tdbLessTT(jdTT: number): number {
  const d = jdTT - J2000;
  const g = (357.53 + 0.98560028 * d) * DEG;
  const lj = (246.11 + 0.90251792 * d) * DEG; // (the Earth's mean longitude less Jupiter's)
  return 0.001657 * Math.sin(g) + 0.000022 * Math.sin(lj);
}

const ARCSEC = DEG / 3600;
/** A turn, in arcseconds. */
const TURN_AS = 1_296_000;
const anp = (angle: number): number => ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

/**
 * The Earth rotation angle, radians in [0, 2 pi): how far the Earth has turned from the celestial intermediate origin
 * (IAU 2000 Resolution B1.8; SOFA iauEra00). `jdUT` is a Julian date in UT1.
 */
export function earthRotationAngle(jdUT: number): number {
  const d = jdUT - J2000;
  // (the whole days of the date drop out of the turn: only the fraction of a day and the slow excess are kept)
  const turns = (jdUT % 1) + 0.779_057_273_264 + 0.002_737_811_911_354_48 * d;
  return anp(turns * 2 * Math.PI);
}

/** UT1 - TAI, seconds, at each step of the IERS's table (ut1.ts). */
const UT1_TAI = (() => {
  const out = new Float64Array(UT1_TAI_CHANGES.length);
  let sum = 0;
  UT1_TAI_CHANGES.forEach((c, i) => {
    sum += c;
    out[i] = sum / 1e4;
  });
  return out;
})();

/**
 * UT1 - UTC, seconds, at a Julian date in UTC: the IERS's UT1 - TAI (EOP C01, ut1.ts) interpolated, plus TAI - UTC.
 * Nothing before 1960, when there was no UTC to differ from (an instant then is taken to be UT1 already); after the
 * table's last value, its last UT1 - TAI.
 */
export function ut1MinusUtc(jdUTC: number): number {
  const leap = taiMinusUtc(jdUTC);
  if (Number.isNaN(leap)) return 0;
  const x = (1900 + (jdUTC - 2_415_020.31352) / 365.242198781 - UT1_TAI_FROM) / UT1_TAI_STEP;
  const last = UT1_TAI.length - 1;
  if (!(x >= 0)) return 0;
  if (x >= last) return UT1_TAI[last]! + leap;
  const i = Math.floor(x);
  return UT1_TAI[i]! + (UT1_TAI[i + 1]! - UT1_TAI[i]!) * (x - i) + leap;
}

/** UT1 as a Julian date, from a Julian date in UTC (`ut1MinusUtc`). */
export const universalTime = (jdUTC: number): number => jdUTC + ut1MinusUtc(jdUTC) / 86_400;

/**
 * Greenwich mean sidereal time, radians in [0, 2 pi): the angle from the mean equinox of date to the Greenwich
 * meridian. The IAU 2006 expression on the Earth rotation angle (Capitaine et al. 2003, A&A 412:567; SOFA iauGmst06),
 * whose precession in right ascension is argued in TT, made here from `jdUT` by the table. `jdUT` is a Julian date in
 * UTC, and the Earth's angle is UT1's (`universalTime`) unless `jdUT1` is given.
 */
export function greenwichMeanSiderealTime(jdUT: number, jdUT1 = universalTime(jdUT)): number {
  const t = centuries(terrestrialTime(jdUT));
  const precession = 0.014506 + (4612.156534 + (1.3915817 + (-0.00000044 + (-0.000029956 + -0.0000000368 * t) * t) * t) * t) * t;
  return anp(earthRotationAngle(jdUT1) + precession * ARCSEC);
}

/**
 * The IAU 2000B nutation series (McCarthy and Luzum 2003, Celest. Mech. 85:37; SOFA iauNut00b): the multiples of the
 * Moon's mean anomaly, the Sun's, the Moon's argument of latitude, its elongation from the Sun and its node; then the
 * longitude's sine coefficient, its rate per century and its cosine coefficient, and the obliquity's cosine
 * coefficient, rate and sine coefficient, in 0.1 microarcseconds. Largest first.
 */
const NUTATION: readonly (readonly [number, number, number, number, number, number, number, number, number, number, number])[] = [
  [0, 0, 0, 0, 1, -172064161, -174666, 33386, 92052331, 9086, 15377],
  [0, 0, 2, -2, 2, -13170906, -1675, -13696, 5730336, -3015, -4587],
  [0, 0, 2, 0, 2, -2276413, -234, 2796, 978459, -485, 1374],
  [0, 0, 0, 0, 2, 2074554, 207, -698, -897492, 470, -291],
  [0, 1, 0, 0, 0, 1475877, -3633, 11817, 73871, -184, -1924],
  [0, 1, 2, -2, 2, -516821, 1226, -524, 224386, -677, -174],
  [1, 0, 0, 0, 0, 711159, 73, -872, -6750, 0, 358],
  [0, 0, 2, 0, 1, -387298, -367, 380, 200728, 18, 318],
  [1, 0, 2, 0, 2, -301461, -36, 816, 129025, -63, 367],
  [0, -1, 2, -2, 2, 215829, -494, 111, -95929, 299, 132],
  [0, 0, 2, -2, 1, 128227, 137, 181, -68982, -9, 39],
  [-1, 0, 2, 0, 2, 123457, 11, 19, -53311, 32, -4],
  [-1, 0, 0, 2, 0, 156994, 10, -168, -1235, 0, 82],
  [1, 0, 0, 0, 1, 63110, 63, 27, -33228, 0, -9],
  [-1, 0, 0, 0, 1, -57976, -63, -189, 31429, 0, -75],
  [-1, 0, 2, 2, 2, -59641, -11, 149, 25543, -11, 66],
  [1, 0, 2, 0, 1, -51613, -42, 129, 26366, 0, 78],
  [-2, 0, 2, 0, 1, 45893, 50, 31, -24236, -10, 20],
  [0, 0, 0, 2, 0, 63384, 11, -150, -1220, 0, 29],
  [0, 0, 2, 2, 2, -38571, -1, 158, 16452, -11, 68],
  [0, -2, 2, -2, 2, 32481, 0, 0, -13870, 0, 0],
  [-2, 0, 0, 2, 0, -47722, 0, -18, 477, 0, -25],
  [2, 0, 2, 0, 2, -31046, -1, 131, 13238, -11, 59],
  [1, 0, 2, -2, 2, 28593, 0, -1, -12338, 10, -3],
  [-1, 0, 2, 0, 1, 20441, 21, 10, -10758, 0, -3],
  [2, 0, 0, 0, 0, 29243, 0, -74, -609, 0, 13],
  [0, 0, 2, 0, 0, 25887, 0, -66, -550, 0, 11],
  [0, 1, 0, 0, 1, -14053, -25, 79, 8551, -2, -45],
  [-1, 0, 0, 2, 1, 15164, 10, 11, -8001, 0, -1],
  [0, 2, 2, -2, 2, -15794, 72, -16, 6850, -42, -5],
  [0, 0, -2, 2, 0, 21783, 0, 13, -167, 0, 13],
  [1, 0, 0, -2, 1, -12873, -10, -37, 6953, 0, -14],
  [0, -1, 0, 0, 1, -12654, 11, 63, 6415, 0, 26],
  [-1, 0, 2, 2, 1, -10204, 0, 25, 5222, 0, 15],
  [0, 2, 0, 0, 0, 16707, -85, -10, 168, -1, 10],
  [1, 0, 2, 2, 2, -7691, 0, 44, 3268, 0, 19],
  [-2, 0, 2, 0, 0, -11024, 0, -14, 104, 0, 2],
  [0, 1, 2, 0, 2, 7566, -21, -11, -3250, 0, -5],
  [0, 0, 2, 2, 1, -6637, -11, 25, 3353, 0, 14],
  [0, -1, 2, 0, 2, -7141, 21, 8, 3070, 0, 4],
  [0, 0, 0, 2, 1, -6302, -11, 2, 3272, 0, 4],
  [1, 0, 2, -2, 1, 5800, 10, 2, -3045, 0, -1],
  [2, 0, 2, -2, 2, 6443, 0, -7, -2768, 0, -4],
  [-2, 0, 0, 2, 1, -5774, -11, -15, 3041, 0, -5],
  [2, 0, 2, 0, 1, -5350, 0, 21, 2695, 0, 12],
  [0, -1, 2, -2, 1, -4752, -11, -3, 2719, 0, -3],
  [0, 0, 0, -2, 1, -4940, -11, -21, 2720, 0, -9],
  [-1, -1, 0, 2, 0, 7350, 0, -8, -51, 0, 4],
  [2, 0, 0, -2, 1, 4065, 0, 6, -2206, 0, 1],
  [1, 0, 0, 2, 0, 6579, 0, -24, -199, 0, 2],
  [0, 1, 2, -2, 1, 3579, 0, 5, -1900, 0, 1],
  [1, -1, 0, 0, 0, 4725, 0, -6, -41, 0, 3],
  [-2, 0, 2, 0, 2, -3075, 0, -2, 1313, 0, -1],
  [3, 0, 2, 0, 2, -2904, 0, 15, 1233, 0, 7],
  [0, -1, 0, 2, 0, 4348, 0, -10, -81, 0, 2],
  [1, -1, 2, 0, 2, -2878, 0, 8, 1232, 0, 4],
  [0, 0, 0, 1, 0, -4230, 0, 5, -20, 0, -2],
  [-1, -1, 2, 2, 2, -2819, 0, 7, 1207, 0, 3],
  [-1, 0, 2, 0, 0, -4056, 0, 5, 40, 0, -2],
  [0, -1, 2, 2, 2, -2647, 0, 11, 1129, 0, 5],
  [-2, 0, 0, 0, 1, -2294, 0, -10, 1266, 0, -4],
  [1, 1, 2, 0, 2, 2481, 0, -7, -1062, 0, -3],
  [2, 0, 0, 0, 1, 2179, 0, -2, -1129, 0, -2],
  [-1, 1, 0, 1, 0, 3276, 0, 1, -9, 0, 0],
  [1, 1, 0, 0, 0, -3389, 0, 5, 35, 0, -2],
  [1, 0, 2, 0, 0, 3339, 0, -13, -107, 0, 1],
  [-1, 0, 2, -2, 1, -1987, 0, -6, 1073, 0, -2],
  [1, 0, 0, 0, 2, -1981, 0, 0, 854, 0, 0],
  [-1, 0, 0, 1, 0, 4026, 0, -353, -553, 0, -139],
  [0, 0, 2, 1, 2, 1660, 0, -5, -710, 0, -2],
  [-1, 0, 2, 4, 2, -1521, 0, 9, 647, 0, 4],
  [-1, 1, 0, 1, 1, 1314, 0, 0, -700, 0, 0],
  [0, -2, 2, -2, 1, -1283, 0, 0, 672, 0, 0],
  [1, 0, 2, 2, 1, -1331, 0, 8, 663, 0, 4],
  [-2, 0, 2, 2, 2, 1383, 0, -2, -594, 0, -2],
  [-1, 0, 0, 0, 2, 1405, 0, 4, -610, 0, 2],
  [1, 1, 2, -2, 2, 1290, 0, 0, -556, 0, 0],
];

/** The IAU 2006 mean obliquity of the ecliptic, radians (Hilton et al. 2006, Celest. Mech. 94:351; SOFA iauObl06). `jdTT` in TT. */
export function meanObliquity(jdTT: number): number {
  const t = centuries(jdTT);
  return (84381.406 + (-46.836769 + (-0.0001831 + (0.0020034 + (-0.000000576 + -0.0000000434 * t) * t) * t) * t) * t) * ARCSEC;
}

/** The mean longitude of the Moon's ascending node, radians (IERS Conventions 2003): an argument of the nutation and of the equinox's terms. */
const nodeOf = (t: number): number => ((450160.398036 - 6962890.5431 * t) % TURN_AS) * ARCSEC;

/**
 * Nutation, radians: how far the true equinox is ahead of the mean one along the ecliptic (`longitude`), how much the
 * true equator is tipped beyond the mean (`obliquity`), and the IAU 2006 mean obliquity of the ecliptic and the true
 * one. The IAU 2000B series with its fixed offsets in lieu of the planetary terms (SOFA iauNut00b), scaled to the IAU
 * 2006 precession as SOFA's iauNut06a scales the full series: within a milliarcsecond of IAU 2000A from 1995 to 2050,
 * and a few by the 1960s. `jdTT` is a Julian date in TT.
 */
export function nutation(jdTT: number): { longitude: number; obliquity: number; meanObliquity: number; trueObliquity: number } {
  const t = centuries(jdTT);
  const l = ((485868.249036 + 1717915923.2178 * t) % TURN_AS) * ARCSEC;
  const lp = ((1287104.79305 + 129596581.0481 * t) % TURN_AS) * ARCSEC;
  const f = ((335779.526232 + 1739527262.8478 * t) % TURN_AS) * ARCSEC;
  const d = ((1072260.70369 + 1602961601.209 * t) % TURN_AS) * ARCSEC;
  const om = nodeOf(t);
  let dp = 0;
  let de = 0;
  // (smallest first, as SOFA sums them)
  for (let i = NUTATION.length - 1; i >= 0; i--) {
    const [nl, nlp, nf, nd, nom, ps, pst, pc, ec, ect, es] = NUTATION[i]!;
    const arg = nl * l + nlp * lp + nf * f + nd * d + nom * om;
    const [sin, cos] = [Math.sin(arg), Math.cos(arg)];
    dp += (ps + pst * t) * sin + pc * cos;
    de += (ec + ect * t) * cos + es * sin;
  }
  const unit = ARCSEC / 1e7;
  const j2 = -2.7774e-6 * t; // (the IAU 2006 precession's secular change in J2)
  const longitude = (dp * unit - 0.135e-3 * ARCSEC) * (1 + 0.4697e-6 + j2);
  const obliquity = (de * unit + 0.388e-3 * ARCSEC) * (1 + j2);
  const mean = meanObliquity(jdTT);
  return { longitude, obliquity, meanObliquity: mean, trueObliquity: mean + obliquity };
}

/**
 * Greenwich apparent sidereal time, radians in [0, 2 pi): the angle from the true equinox of date to the Greenwich
 * meridian, which is the angle frames.ts turns the Earth by. Mean sidereal time plus the equation of the equinoxes: the
 * nutation in longitude on the mean obliquity, and the two largest of its complementary terms (IERS Conventions 2003,
 * eq. 5.36; SOFA iauEect00: 2.6 and 0.06 milliarcseconds, the rest under 0.02 each).
 */
export function greenwichSiderealTime(jdUT: number, jdUT1 = universalTime(jdUT)): number {
  const jdTT = terrestrialTime(jdUT);
  const n = nutation(jdTT);
  const om = nodeOf(centuries(jdTT));
  const complementary = (2640.96e-6 * Math.sin(om) + 63.52e-6 * Math.sin(2 * om)) * ARCSEC;
  return anp(greenwichMeanSiderealTime(jdUT, jdUT1) + n.longitude * Math.cos(n.meanObliquity) + complementary);
}

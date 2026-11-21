/**
 * Where the Sun, the Moon and the planets are at an instant: from the Earth's centre in the
 * inertial frame of date (frames.ts), and as seen from a place on the ground.
 *
 * Two ephemerides answer, and every function here says which it used (`ephemerisOf`):
 *
 * DE440    JPL's (jpl.ts), baked for 1957 to 2035 (public/ephemeris/de440.bin, 0.9 MB) and fetched
 *          only when something asks for it (`loadEphemeris`). Positions and velocities in the ICRF
 *          (`stateOf`: geometric, from the Earth's centre or another body's), within 6 m and
 *          0.08 mm/s of DE440 for the Moon and 5 km for the planets; turned into the frame of
 *          date by the IAU 2006 precession and 2000B nutation (frames.ts `icrfToDate`, a
 *          milliarcsecond). Seen from the Earth they are apparent to first order in v/c: each is
 *          where it was a light-time ago, as the observer moving with the Earth sees it
 *          (`apparent`), which is the Sun's 20.5 arcseconds of aberration and the Moon's 0.7; the
 *          light's bending by the Sun (under 0.01 arcseconds away from it) and the observer's own
 *          turn with the Earth (0.3) are left out. Distances stay geometric. Against JPL Horizons
 *          from five places at five instants the Sun and the Moon are within 0.2 arcseconds and
 *          130 m (5 arcseconds at J2000, which is UT1 - UTC: time.ts), the planets 0.4; the Moon's
 *          state at Apollo 8's and 11's injection and arrival within 3.2 m and 0.012 mm/s
 *          (tests/ephemeris.test.mjs).
 * Meeus    Kept for when DE440 is not loaded or the date is outside it, and labelled so: as
 *          below. Positions only; `stateOf` differences them for a velocity.
 *
 * The sky does not step when DE440 arrives. The two agree to 0.0096 degrees for the Sun and
 * 0.0162 for the Moon over every date baked (tests/ephemeris.test.mjs): a fifth and a third of the
 * 0.05 degrees the light must move before the shadows are drawn again (world.md), a third of a
 * pixel at a 50 degree field on a 1080-line screen, and a change of light on a face of under 2e-4,
 * a twentieth of a level of 255. A setting is not redrawn for it either: `Setting.at` asks the
 * sky again only when the clock moves.
 *
 * Sun      Meeus, Astronomical Algorithms (2nd ed.), chapter 25, the low-accuracy method: the
 *          Sun's mean longitude and anomaly and the equation of centre, corrected for aberration,
 *          with nutation from time.ts. Meeus claims 0.01 degree; measured against JPL Horizons at
 *          five dates from 1961 to 2024 (tests/world.test.mjs) it is within 0.006 degrees, and
 *          against DE440 every 3.7 days from 1957 to 2035 within 0.0096.
 * Moon     Meeus chapter 47 (the ELP-2000/82 series as he abridges it), cut further to the 32
 *          largest terms in longitude and distance and the 30 largest in latitude, plus his
 *          additive terms. Measured against Horizons the same way: within 0.008 degrees in
 *          direction and 40 km in distance; against DE440 from 1957 to 2035, 0.0162 and 38 km. The Moon is near enough that where you stand matters by up to a degree, so
 *          `skyFrom` works from the place, not the Earth's centre.
 * Planets  Two-body orbits on Standish's mean elements (bodies.ts), with the light's travel time
 *          allowed for. Measured against Horizons for 5 May 1961: within 0.01 degrees for
 *          Mercury, Venus, Mars and Uranus, 0.02 for Neptune, 0.06 for Jupiter and 0.13 for
 *          Saturn, whose pull on each other the elements leave out:
 *          placeholders, as the planets themselves are.
 *
 * Positions are apparent: where the light arriving now comes from. Elevations are geometric, as
 * if the Earth had no air; `refraction` gives what air adds, for a viewer on the ground.
 *
 * `jdTT` arguments are Julian dates in Terrestrial Time and `jdUT` in UT (time.ts).
 */
import type { Confidence } from '../measure.ts';
import { AU, type Body, C, DAY, EARTH, MOON, PLANETS, SUN } from './bodies.ts';
import {
  add,
  angleBetween,
  cross,
  DEG,
  dot,
  ecefToEnuDirection,
  ecefToInertial,
  enuToSite,
  geodeticToEcef,
  horizontal,
  icrfToDate,
  inertialToEcef,
  inertialToJ2000,
  j2000ToInertial,
  length,
  rotate,
  type Site,
  scale,
  sub,
  unit,
  type Vec3,
} from './frames.ts';
import { type Ephemeris, readEphemeris, type State } from './jpl.ts';
import { barycentricTime, centuries, greenwichSiderealTime, nutation, tdbLessTT, terrestrialTime } from './time.ts';

const sind = (degrees: number): number => Math.sin(degrees * DEG);
const cosd = (degrees: number): number => Math.cos(degrees * DEG);

/** Ecliptic longitude, latitude (radians, true equinox of date) and distance, as a vector on the true equator of date. */
function fromEcliptic(longitude: number, latitude: number, distance: number, obliquity: number): Vec3 {
  const cb = Math.cos(latitude);
  const [x, y, z] = [cb * Math.cos(longitude), cb * Math.sin(longitude), Math.sin(latitude)];
  const [se, ce] = [Math.sin(obliquity), Math.cos(obliquity)];
  return [x * distance, (y * ce - z * se) * distance, (y * se + z * ce) * distance];
}

/** Meeus's Sun from the Earth's centre: metres, inertial frame of date; apparent (with its aberration) unless asked for where it is. */
export function meeusSun(jdTT: number, apparent = true): Vec3 {
  const T = centuries(jdTT);
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T ** 2;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T ** 2;
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T ** 2;
  const centre = (1.914602 - 0.004817 * T - 0.000014 * T ** 2) * sind(M) + (0.019993 - 0.000101 * T) * sind(2 * M) + 0.000289 * sind(3 * M);
  const R = (1.000001018 * (1 - e * e)) / (1 + e * cosd(M + centre)); // au
  const n = nutation(jdTT);
  // aberration: the Sun is seen 20.5 arcseconds behind where it is, over R
  const longitude = (L0 + centre - (apparent ? 0.005_691_6 / R : 0)) * DEG + n.longitude;
  return fromEcliptic(longitude, 0, R * AU, n.trueObliquity);
}

/** The Moon's periodic terms: multiples of D, M, M' and F, then the sine coefficient for longitude (1e-6 degree) and the cosine coefficient for distance (metres). */
const MOON_LR: readonly (readonly [number, number, number, number, number, number])[] = [
  [0, 0, 1, 0, 6288774, -20905355],
  [2, 0, -1, 0, 1274027, -3699111],
  [2, 0, 0, 0, 658314, -2955968],
  [0, 0, 2, 0, 213618, -569925],
  [0, 1, 0, 0, -185116, 48888],
  [0, 0, 0, 2, -114332, -3149],
  [2, 0, -2, 0, 58793, 246158],
  [2, -1, -1, 0, 57066, -152138],
  [2, 0, 1, 0, 53322, -170733],
  [2, -1, 0, 0, 45758, -204586],
  [0, 1, -1, 0, -40923, -129620],
  [1, 0, 0, 0, -34720, 108743],
  [0, 1, 1, 0, -30383, 104755],
  [2, 0, 0, -2, 15327, 10321],
  [0, 0, 1, 2, -12528, 0],
  [0, 0, 1, -2, 10980, 79661],
  [4, 0, -1, 0, 10675, -34782],
  [0, 0, 3, 0, 10034, -23210],
  [4, 0, -2, 0, 8548, -21636],
  [2, 1, -1, 0, -7888, 24208],
  [2, 1, 0, 0, -6766, 30824],
  [1, 0, -1, 0, -5163, -8379],
  [1, 1, 0, 0, 4987, -16675],
  [2, -1, 1, 0, 4036, -12831],
  [2, 0, 2, 0, 3994, -10445],
  [4, 0, 0, 0, 3861, -11650],
  [2, 0, -3, 0, 3665, 14403],
  [0, 1, -2, 0, -2689, -7003],
  [2, 0, -1, 2, -2602, 0],
  [2, -1, -2, 0, 2390, 10056],
  [1, 0, 1, 0, -2348, 6322],
  [2, -2, 0, 0, 2236, -9884],
];
/** And for latitude: multiples of D, M, M' and F, then the sine coefficient (1e-6 degree). */
const MOON_B: readonly (readonly [number, number, number, number, number])[] = [
  [0, 0, 0, 1, 5128122],
  [0, 0, 1, 1, 280602],
  [0, 0, 1, -1, 277693],
  [2, 0, 0, -1, 173237],
  [2, 0, -1, 1, 55413],
  [2, 0, -1, -1, 46271],
  [2, 0, 0, 1, 32573],
  [0, 0, 2, 1, 17198],
  [2, 0, 1, -1, 9266],
  [0, 0, 2, -1, 8822],
  [2, -1, 0, -1, 8216],
  [2, 0, -2, -1, 4324],
  [2, 0, 1, 1, 4200],
  [2, 1, 0, -1, -3359],
  [2, -1, -1, 1, 2463],
  [2, -1, 0, 1, 2211],
  [2, -1, -1, -1, 2065],
  [0, 1, -1, -1, -1870],
  [4, 0, -1, -1, 1828],
  [0, 1, 0, 1, -1794],
  [0, 0, 0, 3, -1749],
  [0, 1, -1, 1, -1565],
  [1, 0, 0, 1, -1491],
  [0, 1, 1, 1, -1475],
  [0, 1, 1, -1, -1410],
  [0, 1, 0, -1, -1344],
  [1, 0, 0, -1, -1335],
  [0, 0, 3, 1, 1107],
  [4, 0, 0, -1, 1021],
  [4, 0, -1, 1, 833],
];

/**
 * The Moon's mean arguments at `T` Julian centuries of TT from J2000 (Meeus chapter 47), degrees: its mean longitude,
 * its mean elongation from the Sun, the Sun's mean anomaly, the Moon's, its argument of latitude (the mean distance
 * from its ascending node) and the longitude of that node.
 */
export function lunarArguments(T: number): { L: number; D: number; M: number; Mp: number; F: number; node: number } {
  return {
    L: 218.3164477 + 481267.88123421 * T - 0.0015786 * T ** 2 + T ** 3 / 538841 - T ** 4 / 65194000,
    D: 297.8501921 + 445267.1114034 * T - 0.0018819 * T ** 2 + T ** 3 / 545868 - T ** 4 / 113065000,
    M: 357.5291092 + 35999.0502909 * T - 0.0001536 * T ** 2 + T ** 3 / 24490000,
    Mp: 134.9633964 + 477198.8675055 * T + 0.0087414 * T ** 2 + T ** 3 / 69699 - T ** 4 / 14712000,
    F: 93.272095 + 483202.0175233 * T - 0.0036539 * T ** 2 - T ** 3 / 3526000 + T ** 4 / 863310000,
    node: 125.0445479 - 1934.1362891 * T + 0.0020754 * T ** 2 + T ** 3 / 467441 - T ** 4 / 60616000,
  };
}

/** Meeus's Moon, its centre from the Earth's: metres, inertial frame of date. */
export function meeusMoon(jdTT: number): Vec3 {
  const T = centuries(jdTT);
  const { L, D, M, Mp, F } = lunarArguments(T);
  const A1 = 119.75 + 131.849 * T; // Venus
  const A2 = 53.09 + 479264.29 * T; // Jupiter
  const A3 = 313.45 + 481266.484 * T;
  // terms in the Sun's anomaly shrink as the Earth's orbit grows rounder
  const E = 1 - 0.002516 * T - 0.0000074 * T ** 2;
  const fade = (m: number): number => (m === 0 ? 1 : Math.abs(m) === 1 ? E : E * E);

  let sl = 3958 * sind(A1) + 1962 * sind(L - F) + 318 * sind(A2);
  let sr = 0;
  for (const [d, m, mp, f, l, r] of MOON_LR) {
    const arg = d * D + m * M + mp * Mp + f * F;
    sl += l * fade(m) * sind(arg);
    sr += r * fade(m) * cosd(arg);
  }
  let sb = -2235 * sind(L) + 382 * sind(A3) + 175 * sind(A1 - F) + 175 * sind(A1 + F) + 127 * sind(L - Mp) - 115 * sind(L + Mp);
  for (const [d, m, mp, f, b] of MOON_B) sb += b * fade(m) * sind(d * D + m * M + mp * Mp + f * F);

  const n = nutation(jdTT);
  return fromEcliptic((L + sl / 1e6) * DEG + n.longitude, (sb / 1e6) * DEG, 385_000_560 + sr, n.trueObliquity);
}

/** The obliquity of the ecliptic at J2000 (IAU 1976), which Standish's elements are referred to. */
const OBLIQUITY_J2000 = (84381.448 / 3600) * DEG;

/** A body's place on its mean orbit: metres from the Sun, mean ecliptic and equinox of J2000. */
function heliocentric(body: Body, jdTT: number): Vec3 {
  const el = body.elements;
  if (!el) throw new Error(`${body.name} has no orbital elements`);
  const T = centuries(jdTT);
  const at = (r: readonly [number, number]): number => r[0] + r[1] * T;
  const [a, e, i, node] = [at(el.a) * AU, at(el.e), at(el.i) * DEG, at(el.node) * DEG];
  const peri = at(el.peri) * DEG - node; // argument of perihelion
  const M = (at(el.L) - at(el.peri)) * DEG;
  let Ecc = M + e * Math.sin(M);
  for (let k = 0; k < 8; k++) Ecc -= (Ecc - e * Math.sin(Ecc) - M) / (1 - e * Math.cos(Ecc));
  const [x, y] = [a * (Math.cos(Ecc) - e), a * Math.sqrt(1 - e * e) * Math.sin(Ecc)];
  const [cw, sw, cn, sn, ci, si] = [Math.cos(peri), Math.sin(peri), Math.cos(node), Math.sin(node), Math.cos(i), Math.sin(i)];
  return [
    (cw * cn - sw * sn * ci) * x + (-sw * cn - cw * sn * ci) * y,
    (cw * sn + sw * cn * ci) * x + (-sw * sn + cw * cn * ci) * y,
    sw * si * x + cw * si * y,
  ];
}

/** Standish's ecliptic of J2000 as the ICRF's equator: within a few hundredths of an arcsecond, inside what mean elements are good for. */
const ecliptic = (v: Vec3): Vec3 => {
  const [se, ce] = [Math.sin(OBLIQUITY_J2000), Math.cos(OBLIQUITY_J2000)];
  return [v[0], v[1] * ce - v[2] * se, v[1] * se + v[2] * ce];
};

/**
 * A planet from the Earth's centre on Standish's mean elements: metres, inertial frame of date,
 * where it was when the light now arriving left it. The Earth is taken to be at the Earth-Moon
 * barycentre (it is up to 4,700 km from it: 6 arcseconds at Venus's nearest).
 */
export function meeusPlanet(body: Body, jdTT: number): Vec3 {
  const earth = heliocentric(EARTH, jdTT);
  let seen = sub(heliocentric(body, jdTT), earth);
  for (let k = 0; k < 2; k++) seen = sub(heliocentric(body, jdTT - length(seen) / C / DAY), earth);
  return j2000ToInertial(ecliptic(seen), jdTT);
}

/** DE440 as baked, once it is here (`useEphemeris`). */
let baked: Ephemeris | null = null;
let loading: Promise<boolean> | null = null;

/** Use the baked file's bytes (public/ephemeris/de440.bin) from now on; null goes back to Meeus. A test hands it in; a page fetches it (`loadEphemeris`). */
export function useEphemeris(bytes: ArrayBuffer | null): void {
  baked = bytes ? readEphemeris(bytes) : null;
}

/**
 * Fetch the baked DE440 (1.2 MB) if it is not here yet, once: true when it is in use. Called by whatever needs it (a
 * flight that leaves the Earth); nothing fetches it otherwise. Where there is no page to fetch it for (a test) it is
 * false, and the test hands the file in with `useEphemeris`.
 */
export function loadEphemeris(): Promise<boolean> {
  if (baked) return Promise.resolve(true);
  const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL;
  loading ??=
    base === undefined
      ? Promise.resolve(false)
      : fetch(`${base}ephemeris/de440.bin`)
          .then((res) => (res.ok ? res.arrayBuffer() : null))
          .then((bytes) => {
            if (bytes) useEphemeris(bytes);
            return bytes !== null;
          })
          .catch(() => false);
  return loading;
}

/** The ephemeris that answers at an instant (TT): DE440 if it is loaded and covers the date, else Meeus. */
export function ephemerisOf(jdTT: number): 'DE440' | 'Meeus' {
  if (!baked) return 'Meeus';
  const tdb = barycentricTime(jdTT);
  return tdb >= baked.from && tdb <= baked.to ? 'DE440' : 'Meeus';
}

/** What `stateOf` knows: a body by its id (bodies.ts), the Earth-Moon barycentre, or the solar system's barycentre. */
export type Place =
  | 'sun'
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'moon'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto'
  | 'emb'
  | 'ssb';

/** A body's state: metres and metres a second, geometric (where it is, not where it is seen), in the ICRF. */
export interface BodyState {
  r: Vec3;
  v: Vec3;
  /** Always the ICRF (frames.ts's J2000): `toDate` turns a state into the inertial frame of date. */
  frame: 'icrf';
  source: 'DE440' | 'Meeus';
  /** DE440 refitted to its stated accuracy is derived; Meeus's series, good for the sky and not for a flight, estimated. */
  confidence: Confidence;
}

/** From the solar system's barycentre, DE440 at a TDB Julian date. */
function barycentric(of: Exclude<Place, 'ssb'>, tdb: number, e: Ephemeris, plus = 0): State {
  const moon = e.state('moon', tdb, plus)!;
  const earth = (): State => {
    const emb = e.state('emb', tdb, plus)!;
    const k = 1 / (1 + e.emrat);
    return { r: sub(emb.r, scale(moon.r, k)), v: sub(emb.v, scale(moon.v, k)) };
  };
  if (of === 'earth') return earth();
  if (of === 'moon') {
    const at = earth();
    return { r: add(at.r, moon.r), v: add(at.v, moon.v) };
  }
  return e.state(of, tdb, plus)!;
}

/** Meeus's places from the Earth's centre, in the ICRF, geometric as far as his series are. */
function meeusFromEarth(of: Exclude<Place, 'ssb'>, jdTT: number): Vec3 {
  const back = (v: Vec3): Vec3 => inertialToJ2000(v, jdTT);
  if (of === 'earth') return [0, 0, 0];
  if (of === 'moon') return back(meeusMoon(jdTT));
  if (of === 'sun') return back(meeusSun(jdTT, false));
  const earth = heliocentric(EARTH, jdTT);
  // (the barycentre of the Earth and Moon is the Earth here, as Standish's elements have it)
  if (of === 'emb') return [0, 0, 0];
  const body = PLANETS.find((b) => b.id === of);
  if (!body) throw new Error(`no mean elements for ${of}`);
  return ecliptic(sub(heliocentric(body, jdTT), earth));
}

/**
 * Where a body is and how it moves at an instant (`jdTT`, a Julian date in TT), from another's centre (the Earth's unless
 * given): geometric, in the ICRF. DE440 when it is loaded and covers the date; otherwise Meeus's series, with a velocity
 * from his positions a minute either side, labelled estimated (and from the solar system's barycentre there is none).
 * `plus`: seconds of TT on from `jdTT`, for an instant kept in two parts (a flight's liftoff and the seconds since):
 * a Julian date in one double steps by 40 microseconds, in which the Moon goes 4 cm, and a state taken from the Moon's
 * centre and put back would step with it.
 */
export function stateOf(body: Place, jdTT: number, centre: Place = 'earth', plus = 0): BodyState {
  if (ephemerisOf(jdTT + plus / DAY) === 'DE440' && baked) {
    const tdb = barycentricTime(jdTT);
    // (the seconds on, in TDB: the periodic terms have moved a little in them)
    const on = plus === 0 ? 0 : (plus + tdbLessTT(jdTT + plus / DAY) - tdbLessTT(jdTT)) / DAY;
    const at = (p: Place): State => (p === 'ssb' ? { r: [0, 0, 0], v: [0, 0, 0] } : barycentric(p, tdb, baked!, on));
    // (the Moon from the Earth is its own series, not the difference of two large numbers)
    const direct = body === 'moon' && centre === 'earth' ? baked.state('moon', tdb, on)! : null;
    const flip = body === 'earth' && centre === 'moon' ? baked.state('moon', tdb, on)! : null;
    const [a, b] = [at(body), at(centre)];
    const s = direct ?? (flip ? { r: scale(flip.r, -1), v: scale(flip.v, -1) } : { r: sub(a.r, b.r), v: sub(a.v, b.v) });
    return { r: s.r, v: s.v, frame: 'icrf', source: 'DE440', confidence: 'derived' };
  }
  if (body === 'ssb' || centre === 'ssb') throw new Error('Meeus has no barycentre of the solar system: load DE440 (loadEphemeris)');
  const where = (t: number): Vec3 => sub(meeusFromEarth(body, t), meeusFromEarth(centre, t));
  const h = 60 / DAY;
  const now = jdTT + plus / DAY;
  return {
    r: where(now),
    v: scale(sub(where(now + h), where(now - h)), 1 / 120),
    frame: 'icrf',
    source: 'Meeus',
    confidence: 'estimated',
  };
}

/**
 * The Moon's orientation as DE440 integrated it, at an instant (TT): the three Euler angles (3-1-3: about +Z, then the
 * new +X, then the new +Z) that take the ICRF to its principal axes, radians, and their rates, radians a second.
 * Undefined where DE440 is not loaded, does not cover the date, or was baked before the librations were in it: then
 * world/moon.ts falls back on Meeus's series.
 */
export function lunarLibration(jdTT: number): { angles: Vec3; rates: Vec3 } | undefined {
  if (ephemerisOf(jdTT) !== 'DE440' || !baked) return undefined;
  const s = baked.state('moonpa', barycentricTime(jdTT));
  return s && { angles: s.r, rates: s.v };
}

/** A state in the ICRF as one in the inertial frame of date at its instant (the frame's own slow turn, a millimetre a second at the Moon, left out). */
export function toDate(state: BodyState, jdTT: number): { r: Vec3; v: Vec3 } {
  const m = icrfToDate(jdTT);
  return { r: rotate(m, state.r), v: rotate(m, state.v) };
}

/**
 * Which way a thing at `r` moving at `v` relative to the observer is seen: where it was a light-time ago, to first order
 * in v/c (light-time and aberration together), at its geometric distance (the distance is where it is now: what its
 * size is seen by).
 */
const apparent = (s: { r: Vec3; v: Vec3 }): Vec3 => {
  const d = length(s.r);
  return scale(unit(sub(s.r, scale(s.v, d / C))), d);
};

/** The Sun from the Earth's centre as seen there (with its aberration): metres, inertial frame of date. DE440 when it is loaded, else Meeus. */
export function sunPosition(jdTT: number): Vec3 {
  return ephemerisOf(jdTT) === 'DE440' ? apparent(toDate(stateOf('sun', jdTT), jdTT)) : meeusSun(jdTT);
}

/** The Moon's centre from the Earth's centre, as seen there: metres, inertial frame of date. DE440 when it is loaded, else Meeus. */
export function moonPosition(jdTT: number): Vec3 {
  return ephemerisOf(jdTT) === 'DE440' ? apparent(toDate(stateOf('moon', jdTT), jdTT)) : meeusMoon(jdTT);
}

/** A planet from the Earth's centre as seen there: metres, inertial frame of date. DE440 (its system's barycentre) when it is loaded, else mean elements. */
export function planetPosition(body: Body, jdTT: number): Vec3 {
  return ephemerisOf(jdTT) === 'DE440' ? apparent(toDate(stateOf(body.id as Place, jdTT), jdTT)) : meeusPlanet(body, jdTT);
}

/**
 * How much higher air makes a thing look, radians, from its geometric elevation: Saemundsson's
 * formula (Sky and Telescope 72, 70, 1986; Meeus equation 16.4) for 1010 hPa and 10 C. Half a
 * degree at the horizon, a minute of arc at 45 degrees. Below about a degree under the horizon
 * it has no meaning and is held at its horizon value.
 */
export function refraction(elevation: number): number {
  const h = Math.max(elevation / DEG, -1);
  return (1.02 / Math.tan((h + 10.3 / (h + 5.11)) * DEG) / 60) * DEG;
}

/** Something in the sky, from a place. */
export interface Seen {
  /** Radians clockwise from true north. */
  azimuth: number;
  /** Radians above the level, geometric: add `refraction` for what an eye in air sees. */
  elevation: number;
  /** Metres from the place. */
  distance: number;
  /** Unit vector toward it in the site's frame (frames.ts: +Y up, +X on the site's bearing), geometric. */
  direction: Vec3;
  /** Unit vector toward it from the place, in the inertial frame of date. */
  inertial: Vec3;
  /** Half its apparent width, radians. */
  angularRadius: number;
}

export interface MoonSeen extends Seen {
  /** Sun-Moon-observer angle, radians: 0 at full, pi at new. */
  phaseAngle: number;
  /** How much of the disc is lit, 0 to 1. */
  illuminated: number;
  /** The Moon is east of the Sun: growing toward full. */
  waxing: boolean;
  /**
   * Which way the middle of the lit limb points on the sky, radians anticlockwise as the observer
   * sees it: from celestial north (the astronomer's position angle of the bright limb) and from
   * straight up (how the Moon is tilted as it hangs in the sky).
   */
  brightLimb: { fromNorth: number; fromZenith: number };
}

export interface PlanetSeen extends Seen {
  body: Body;
  /** Apparent visual magnitude: smaller is brighter. */
  magnitude: number;
}

export interface Sky {
  /** Julian dates of the instant, UT and TT. */
  jdUT: number;
  jdTT: number;
  /** Greenwich apparent sidereal time, radians. */
  siderealTime: number;
  sun: Seen;
  moon: MoonSeen;
  planets: PlanetSeen[];
}

/** The direction, anticlockwise on the sky from `reference`, in which `toward` lies from `at`: all three are directions from the observer. */
function skyAngle(at: Vec3, toward: Vec3, reference: Vec3): number {
  const left = unit(cross(reference, at)); // anticlockwise from the reference, looking out
  const along = unit(sub(reference, scale(at, dot(reference, at))));
  const angle = Math.atan2(dot(toward, left), dot(toward, along));
  return angle < 0 ? angle + 2 * Math.PI : angle;
}

/**
 * The fraction of the Moon's disc that is lit and how the lit limb lies, from the Sun's and Moon's
 * positions relative to the observer (any one frame; `north` and `up` are directions in it).
 */
export function moonPhase(sun: Vec3, moon: Vec3, north: Vec3, up: Vec3): Pick<MoonSeen, 'phaseAngle' | 'illuminated' | 'brightLimb'> {
  const phaseAngle = angleBetween(sub(sun, moon), scale(moon, -1));
  const [m, s] = [unit(moon), unit(sun)];
  return {
    phaseAngle,
    illuminated: (1 + Math.cos(phaseAngle)) / 2,
    brightLimb: { fromNorth: skyAngle(m, s, north), fromZenith: skyAngle(m, s, up) },
  };
}

/** A planet's apparent magnitude from its place and the Sun's, both relative to the observer, metres. */
export function planetMagnitude(body: Body, planet: Vec3, sun: Vec3): number {
  const m = body.magnitude;
  if (!m) throw new Error(`${body.name} has no magnitude`);
  const fromSun = sub(planet, sun);
  const x = angleBetween(scale(fromSun, -1), scale(planet, -1)) / DEG - m.phaseOrigin;
  return (
    m.v10 + 5 * Math.log10((length(fromSun) / AU) * (length(planet) / AU)) + m.phase[0] * x + m.phase[1] * x ** 2 + m.phase[2] * x ** 3
  );
}

/**
 * The sky from a place at an instant (a Julian date in UT: time.ts's julianDate): the Sun, the
 * Moon with its phase, and the planets, each by azimuth and elevation and as a direction in the
 * site's own frame.
 */
export function skyFrom(site: Site, jdUT: number): Sky {
  const jdTT = terrestrialTime(jdUT);
  const gast = greenwichSiderealTime(jdUT);
  const here = geodeticToEcef(site);
  const see = (geocentric: Vec3, radius: number): Seen => {
    const fromHere = sub(inertialToEcef(geocentric, gast), here); // ECEF
    const enu = ecefToEnuDirection(site, fromHere);
    const distance = length(fromHere);
    return {
      ...horizontal(enu),
      distance,
      direction: unit(enuToSite(site.bearingX, enu)),
      inertial: unit(sub(geocentric, ecefToInertial(here, gast))),
      angularRadius: Math.asin(Math.min(1, radius / distance)),
    };
  };
  const sunAt = sunPosition(jdTT);
  const moonAt = moonPosition(jdTT);
  const sun = see(sunAt, SUN.equatorialRadius.value);
  const moon = see(moonAt, MOON.equatorialRadius.value);
  // the phase in the site's frame, where up is +Y and celestial north is the pole's direction
  const pole = unit(enuToSite(site.bearingX, ecefToEnuDirection(site, [0, 0, 1])));
  const phase = moonPhase(scale(sun.direction, sun.distance), scale(moon.direction, moon.distance), pole, [0, 1, 0]);
  // east of the Sun along the ecliptic: (sun x moon) lies toward the ecliptic's north pole
  const obliquity = nutation(jdTT).trueObliquity;
  const waxing = dot(cross(sunAt, moonAt), [0, -Math.sin(obliquity), Math.cos(obliquity)]) > 0;
  const planets = PLANETS.map((body): PlanetSeen => {
    const at = planetPosition(body, jdTT);
    return { ...see(at, body.equatorialRadius.value), body, magnitude: planetMagnitude(body, at, sunAt) };
  });
  return { jdUT, jdTT, siderealTime: gast, sun, moon: { ...moon, ...phase, waxing }, planets };
}

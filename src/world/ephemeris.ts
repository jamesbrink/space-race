/**
 * Where the Sun, the Moon and the planets are at an instant: from the Earth's centre in the
 * inertial frame of date (frames.ts), and as seen from a place on the ground.
 *
 * Sun      Meeus, Astronomical Algorithms (2nd ed.), chapter 25, the low-accuracy method: the
 *          Sun's mean longitude and anomaly and the equation of centre, corrected for aberration,
 *          with nutation from time.ts. Meeus claims 0.01 degree; measured here against JPL
 *          Horizons at five dates from 1961 to 2024 (tests/world.test.mjs) it is within 0.006 degrees.
 * Moon     Meeus chapter 47 (the ELP-2000/82 series as he abridges it), cut further to the 32
 *          largest terms in longitude and distance and the 30 largest in latitude, plus his
 *          additive terms. Measured against Horizons the same way: within 0.008 degrees in
 *          direction and 40 km in distance. The Moon is near enough that where you stand matters by up to a degree, so
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
import { AU, type Body, C, DAY, EARTH, MOON, PLANETS, SUN } from './bodies.ts';
import {
  angleBetween,
  cross,
  DEG,
  dot,
  ecefToEnuDirection,
  ecefToInertial,
  enuToSite,
  geodeticToEcef,
  horizontal,
  inertialToEcef,
  j2000ToInertial,
  length,
  type Site,
  scale,
  sub,
  unit,
  type Vec3,
} from './frames.ts';
import { centuries, greenwichSiderealTime, nutation, terrestrialTime } from './time.ts';

const sind = (degrees: number): number => Math.sin(degrees * DEG);
const cosd = (degrees: number): number => Math.cos(degrees * DEG);

/** Ecliptic longitude, latitude (radians, true equinox of date) and distance, as a vector on the true equator of date. */
function fromEcliptic(longitude: number, latitude: number, distance: number, obliquity: number): Vec3 {
  const cb = Math.cos(latitude);
  const [x, y, z] = [cb * Math.cos(longitude), cb * Math.sin(longitude), Math.sin(latitude)];
  const [se, ce] = [Math.sin(obliquity), Math.cos(obliquity)];
  return [x * distance, (y * ce - z * se) * distance, (y * se + z * ce) * distance];
}

/** The Sun from the Earth's centre: metres, inertial frame of date. */
export function sunPosition(jdTT: number): Vec3 {
  const T = centuries(jdTT);
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T ** 2;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T ** 2;
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T ** 2;
  const centre = (1.914602 - 0.004817 * T - 0.000014 * T ** 2) * sind(M) + (0.019993 - 0.000101 * T) * sind(2 * M) + 0.000289 * sind(3 * M);
  const R = (1.000001018 * (1 - e * e)) / (1 + e * cosd(M + centre)); // au
  const n = nutation(jdTT);
  // aberration: the Sun is seen 20.5 arcseconds behind where it is, over R
  const longitude = (L0 + centre - 0.005_691_6 / R) * DEG + n.longitude;
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

/** The Moon's centre from the Earth's centre: metres, inertial frame of date. */
export function moonPosition(jdTT: number): Vec3 {
  const T = centuries(jdTT);
  const L = 218.3164477 + 481267.88123421 * T - 0.0015786 * T ** 2 + T ** 3 / 538841 - T ** 4 / 65194000; // mean longitude
  const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T ** 2 + T ** 3 / 545868 - T ** 4 / 113065000; // mean elongation
  const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T ** 2 + T ** 3 / 24490000; // the Sun's mean anomaly
  const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T ** 2 + T ** 3 / 69699 - T ** 4 / 14712000; // the Moon's
  const F = 93.272095 + 483202.0175233 * T - 0.0036539 * T ** 2 - T ** 3 / 3526000 + T ** 4 / 863310000; // argument of latitude
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

/**
 * A planet from the Earth's centre: metres, inertial frame of date, where it was when the light
 * now arriving left it. The Earth is taken to be at the Earth-Moon barycentre (it is up to
 * 4,700 km from it: 6 arcseconds at Venus's nearest).
 */
export function planetPosition(body: Body, jdTT: number): Vec3 {
  const earth = heliocentric(EARTH, jdTT);
  let seen = sub(heliocentric(body, jdTT), earth);
  for (let k = 0; k < 2; k++) seen = sub(heliocentric(body, jdTT - length(seen) / C / DAY), earth);
  const [se, ce] = [Math.sin(OBLIQUITY_J2000), Math.cos(OBLIQUITY_J2000)];
  return j2000ToInertial([seen[0], seen[1] * ce - seen[2] * se, seen[1] * se + seen[2] * ce], jdTT);
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

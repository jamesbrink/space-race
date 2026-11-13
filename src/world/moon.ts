/**
 * The Moon as a body with a face: which way its axes point at an instant, so that a crater is
 * where it was, the Earth hangs where it hung over it, and the Sun lights the side it lit.
 *
 * The Moon turns once an orbit about an axis tilted 1.54 degrees from the ecliptic's, and that
 * axis, the ecliptic's and its orbit's stay in one plane (Cassini's laws, 1693). So its frame is
 * built from three angles Meeus gives (Astronomical Algorithms, 2nd ed., chapter 53): the
 * inclination I of its equator to the ecliptic, the longitude of its orbit's ascending node (where
 * its equator descends), and its mean distance from that node, F, by which its prime meridian
 * has turned. The physical librations (the Moon rocking about that mean turning, a few hundredths
 * of a degree) are his series for rho, sigma and tau, added to those three.
 *
 * The frame is the selenographic one maps are drawn in: +Z the north pole, +X where the prime
 * meridian crosses the equator (the mean direction of the Earth), +Y 90 degrees east. Measured
 * against JPL Horizons (DE441, the mean-Earth frame) at four dates from 1961 to 2024
 * (tests/moon.test.mjs): the point under the Earth and the point under the Sun are each within
 * 0.03 degrees, which is 900 m on the ground; do not quote better.
 */
import { MOON } from './bodies.ts';
import { lunarArguments, moonPosition, sunPosition } from './ephemeris.ts';
import { cross, DEG, type Mat3, rotate, scale, sub, unit, type Vec3 } from './frames.ts';
import { centuries, nutation } from './time.ts';

/** The inclination of the Moon's mean equator to the ecliptic, degrees (IAU; Meeus chapter 53). */
export const MOON_INCLINATION = 1.54242;

const sind = (degrees: number): number => Math.sin(degrees * DEG);
const cosd = (degrees: number): number => Math.cos(degrees * DEG);

/** The physical librations at `T` centuries from J2000, degrees: in inclination (rho), in the node (sigma, already as an arc along the equator) and in longitude (tau). Meeus chapter 53. */
export function physicalLibration(T: number): { rho: number; sigma: number; tau: number } {
  const { D, M, Mp, F, node } = lunarArguments(T);
  const E = 1 - 0.002516 * T - 0.0000074 * T ** 2;
  const K1 = 119.75 + 131.849 * T;
  const K2 = 72.56 + 20.186 * T;
  const rho =
    -0.02752 * cosd(Mp) -
    0.02245 * sind(F) +
    0.00684 * cosd(Mp - 2 * F) -
    0.00293 * cosd(2 * F) -
    0.00085 * cosd(2 * F - 2 * D) -
    0.00054 * cosd(Mp - 2 * D) -
    0.0002 * sind(Mp + F) -
    0.0002 * cosd(Mp + 2 * F) -
    0.0002 * cosd(Mp - F) +
    0.00014 * cosd(Mp + 2 * F - 2 * D);
  const sigma =
    -0.02816 * sind(Mp) +
    0.02244 * cosd(F) -
    0.00682 * sind(Mp - 2 * F) -
    0.00279 * sind(2 * F) -
    0.00083 * sind(2 * F - 2 * D) +
    0.00069 * sind(Mp - 2 * D) +
    0.0004 * cosd(Mp + F) -
    0.00025 * sind(2 * Mp) -
    0.00023 * sind(Mp + 2 * F) +
    0.0002 * cosd(Mp - F) +
    0.00019 * sind(Mp - F) +
    0.00013 * sind(Mp + 2 * F - 2 * D) -
    0.0001 * cosd(Mp - 3 * F);
  const tau =
    0.0252 * E * sind(M) +
    0.00473 * sind(2 * Mp - 2 * F) -
    0.00467 * sind(Mp) +
    0.00396 * sind(K1) +
    0.00276 * sind(2 * Mp - 2 * D) +
    0.00196 * sind(node) -
    0.00183 * cosd(Mp - F) +
    0.00115 * sind(Mp - 2 * D) -
    0.00096 * sind(Mp - D) +
    0.00046 * sind(2 * F - 2 * D) -
    0.00039 * sind(Mp - F) -
    0.00032 * sind(Mp - M - D) +
    0.00027 * sind(2 * Mp - M - 2 * D) +
    0.00023 * sind(K2) -
    0.00014 * sind(2 * D) +
    0.00014 * cosd(2 * Mp - 2 * F) -
    0.00012 * sind(Mp - 2 * F) -
    0.00012 * sind(2 * Mp) +
    0.00011 * sind(2 * Mp - 2 * M - 2 * D);
  return { rho, sigma, tau };
}

/**
 * The Moon's own axes at an instant, as the rows of a rotation from the inertial frame of date to
 * the selenographic one: `rotate(moonAxes(jd), v)` is `v` as the Moon's maps have it.
 */
export function moonAxes(jdTT: number): Mat3 {
  const T = centuries(jdTT);
  const { F, node } = lunarArguments(T);
  const { rho, sigma, tau } = physicalLibration(T);
  const n = nutation(jdTT);
  const I = (MOON_INCLINATION + rho) * DEG;
  // where the Moon's equator goes down through the ecliptic: the ascending node of its orbit, on the true equinox of
  // date, rocked by the libration in the node (sigma is that as an arc on the Moon: over sin I, it is the node's own angle)
  const rocked = sigma / sind(MOON_INCLINATION);
  const down = (node + rocked) * DEG + n.longitude;
  // in the ecliptic's own axes: toward that node, the Moon's pole (tilted from the ecliptic's away from its orbit's), and the third
  const toNode: Vec3 = [Math.cos(down), Math.sin(down), 0];
  const pole: Vec3 = [-Math.sin(I) * Math.sin(down), Math.sin(I) * Math.cos(down), Math.cos(I)];
  const third = cross(pole, toNode);
  // the prime meridian has turned F from where the equator comes up through the ecliptic, which is opposite the node
  // (the three are Euler's angles, node + rocked, I + rho and 180 + F + tau - rocked: the node's rocking carries no turn with it)
  const turned = (F + tau - rocked + 180) * DEG;
  const prime: Vec3 = [
    Math.cos(turned) * toNode[0] + Math.sin(turned) * third[0],
    Math.cos(turned) * toNode[1] + Math.sin(turned) * third[1],
    Math.cos(turned) * toNode[2] + Math.sin(turned) * third[2],
  ];
  // from the ecliptic of date to the equator of date
  const [se, ce] = [Math.sin(n.trueObliquity), Math.cos(n.trueObliquity)];
  const equatorial = (v: Vec3): Vec3 => [v[0], v[1] * ce - v[2] * se, v[1] * se + v[2] * ce];
  const x = equatorial(prime);
  const z = equatorial(pole);
  return [x, cross(z, x), z];
}

/** A direction in the Moon's own frame as a place on it: degrees east of the prime meridian (-180 to 180) and north of the equator. */
export function selenographic(v: Vec3): { longitude: number; latitude: number } {
  const u = unit(v);
  return { longitude: Math.atan2(u[1], u[0]) / DEG, latitude: Math.asin(Math.max(-1, Math.min(1, u[2]))) / DEG };
}

/** And back: the unit vector toward a place on the Moon, in its own frame. */
export function fromSelenographic(longitude: number, latitude: number): Vec3 {
  const c = cosd(latitude);
  return [c * cosd(longitude), c * sind(longitude), sind(latitude)];
}

/** The Earth and the Sun from the Moon's centre at an instant, in the Moon's own frame, metres; and the frame itself. */
export interface FromMoon {
  /** From the inertial frame of date to the Moon's (moonAxes). */
  axes: Mat3;
  /** The Earth's centre and the Sun's, from the Moon's centre, in the Moon's frame. */
  earth: Vec3;
  sun: Vec3;
  /** The points of the Moon that have the Earth and the Sun overhead: the libration, and where the day is. Degrees. */
  subEarth: { longitude: number; latitude: number };
  subSolar: { longitude: number; latitude: number };
  /** The angle at the Earth between the Sun and the Moon, radians: the Earth's phase seen from the Moon (0: full). */
  earthPhase: number;
  /** How much of the Earth's disc is lit, seen from the Moon's centre: 0 to 1. */
  earthLit: number;
}

/** Where the Earth and the Sun stand over the Moon at an instant (a Julian date in TT). */
export function fromMoon(jdTT: number): FromMoon {
  const axes = moonAxes(jdTT);
  const moon = moonPosition(jdTT);
  const earth = rotate(axes, scale(moon, -1));
  const sun = rotate(axes, sub(sunPosition(jdTT), moon));
  // the angle at the Earth between the Sun and the Moon, from the Moon's side: Sun - Earth - Moon
  const toSun = sub(sun, earth);
  const toMoon = scale(earth, -1);
  const cosPhase = (toSun[0] * toMoon[0] + toSun[1] * toMoon[1] + toSun[2] * toMoon[2]) / (Math.hypot(...toSun) * Math.hypot(...toMoon));
  const earthPhase = Math.acos(Math.max(-1, Math.min(1, cosPhase)));
  return {
    axes,
    earth,
    sun,
    subEarth: selenographic(earth),
    subSolar: selenographic(sun),
    earthPhase,
    earthLit: (1 + Math.cos(earthPhase)) / 2,
  };
}

/** The Moon's mean radius, metres (bodies.ts): 1,737,400 m, which is also the sphere its maps' heights are measured from (the laser altimeter's reference). */
export const MOON_RADIUS = MOON.equatorialRadius.value;

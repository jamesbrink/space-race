/**
 * Frames: where a thing is, said five ways, and how to get from one to the next. Everything is a
 * double; nothing here knows about three.js. A vector is a plain [x, y, z].
 *
 * The conventions, once:
 *
 * - Lengths are metres. Angles are radians in every argument and result, with one exception: a
 *   place on the Earth is recorded the way it is published, in degrees (Geodetic, Site), with
 *   longitude positive east and bearings clockwise from true north.
 * - All frames are right-handed.
 *
 * J2000      The sky's own frame, where a star catalogue and JPL's ephemerides live: the ICRF,
 *            origin at the Earth's centre, +Z and +X within a fiftieth of an arcsecond of the mean
 *            pole and equinox of 1 January 2000, 12:00 TT. That fiftieth (the frame bias) is
 *            allowed for in the turn to date (`icrfToDate`).
 * inertial   "Of date": +Z the Earth's true pole now, +X the true equinox now. It differs from
 *            J2000 by precession (50 arcseconds a year: half a degree by 1961) and nutation
 *            (17 arcseconds), by the IAU 2006 precession and the IAU 2000B nutation (time.ts), to
 *            a milliarcsecond, 2 m at the Moon. It is the frame ephemeris.ts answers in, because
 *            the Earth turns about its +Z by exactly the sidereal time. It does not rotate; its pole
 *            drifts, slowly enough that a flight of days may integrate in it as if it were fixed
 *            (about an arcsecond in a week: a flight's frame is the one at its liftoff,
 *            earthframe.ts).
 * ECEF       Earth-centred, Earth-fixed: +Z the north pole, +X where the Greenwich meridian
 *            crosses the equator, +Y 90 degrees east. It is the inertial frame turned about +Z by
 *            the Greenwich apparent sidereal time (time.ts). Polar motion (under 15 m at the
 *            surface) is left out.
 * geodetic   Latitude, longitude and height above the WGS 84 ellipsoid: what a map gives. Height
 *            is above the ellipsoid, not sea level; at Cape Canaveral the sea is 29 m below it.
 * ENU        East, north, up at a place: up is the ellipsoid's normal there (the plumb line, to
 *            a hundredth of a degree), so this is the frame "level" means something in.
 * site       A place's own drawing frame, which is the viewer's and the model's: +Y up, +X level
 *            along the site's stated bearing, and +Z level, 90 degrees clockwise from +X seen from
 *            above. Launch Complex 5's +X is the side the capsule's hatch faces, 295 degrees true,
 *            so its +Z bears 025. A Blender script's (x, y, z) is the viewer's (x, z, -y).
 *
 * A site frame is a tangent plane: it is flat and the Earth is not. A point 1 km from the origin
 * is 8 cm above the ellipsoid; at 10 km, 7.8 m. siteToEcef and ecefToSite are exact, so that is a
 * fact about flat scenery, not an error in the transform.
 */
import { EARTH_ROTATION_RATE, WGS84_A, WGS84_INVERSE_FLATTENING } from './bodies.ts';
import { centuries, meanObliquity, nutation } from './time.ts';

export type Vec3 = readonly [number, number, number];
/** A rotation, as its three rows: applied to a vector by `rotate`. */
export type Mat3 = readonly [Vec3, Vec3, Vec3];

export const DEG = Math.PI / 180;

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const length = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export const unit = (a: Vec3): Vec3 => scale(a, 1 / length(a));
export const rotate = (m: Mat3, v: Vec3): Vec3 => [dot(m[0], v), dot(m[1], v), dot(m[2], v)];
export const transpose = (m: Mat3): Mat3 => [
  [m[0][0], m[1][0], m[2][0]],
  [m[0][1], m[1][1], m[2][1]],
  [m[0][2], m[1][2], m[2][2]],
];
/** The angle between two directions, radians: well behaved for nearly parallel ones, where acos of a dot product is not. */
export const angleBetween = (a: Vec3, b: Vec3): number => Math.atan2(length(cross(a, b)), dot(a, b));

/** A place on the Earth as a map gives it: degrees north, degrees east, metres above the WGS 84 ellipsoid. */
export interface Geodetic {
  latitude: number;
  longitude: number;
  height: number;
}

/** A place with its own drawing frame: where its origin is, and which way its +X points (degrees clockwise from true north). */
export interface Site extends Geodetic {
  bearingX: number;
}

/** A site as a flight records it (types.ts: SiteDef, each number with its confidence and source), as plain numbers. */
export const siteFrame = (def: Record<keyof Site, { value: number }>): Site => ({
  latitude: def.latitude.value,
  longitude: def.longitude.value,
  height: def.height.value,
  bearingX: def.bearingX.value,
});

const F = 1 / WGS84_INVERSE_FLATTENING;
/** First eccentricity squared of the WGS 84 ellipsoid. */
const E2 = F * (2 - F);

export function geodeticToEcef(g: Geodetic): Vec3 {
  const lat = g.latitude * DEG;
  const lon = g.longitude * DEG;
  const sin = Math.sin(lat);
  const cos = Math.cos(lat);
  const N = WGS84_A / Math.sqrt(1 - E2 * sin * sin); // the normal's length from the surface to the polar axis
  return [(N + g.height) * cos * Math.cos(lon), (N + g.height) * cos * Math.sin(lon), (N * (1 - E2) + g.height) * sin];
}

/**
 * The inverse, by iteration on the latitude: it converges to under a micrometre in four or five
 * rounds anywhere from the Earth's core to beyond the Moon. Height is found as the distance
 * along the normal, which stays well conditioned at the poles.
 */
export function ecefToGeodetic(p: Vec3): Geodetic {
  const [x, y, z] = p;
  const rho = Math.hypot(x, y);
  const longitude = Math.atan2(y, x) / DEG;
  let lat = Math.atan2(z, rho * (1 - E2));
  let height = 0;
  for (let i = 0; i < 12; i++) {
    const sin = Math.sin(lat);
    const cos = Math.cos(lat);
    const N = WGS84_A / Math.sqrt(1 - E2 * sin * sin);
    height = rho * cos + z * sin - N * (1 - E2 * sin * sin);
    const next = Math.atan2(z, rho * (1 - (E2 * N) / (N + height)));
    const moved = Math.abs(next - lat);
    lat = next;
    if (moved < 1e-15) break;
  }
  return { latitude: lat / DEG, longitude, height };
}

/** East, north and up at a place, as unit vectors in ECEF. */
export function enuAxes(g: { latitude: number; longitude: number }): { east: Vec3; north: Vec3; up: Vec3 } {
  const lat = g.latitude * DEG;
  const lon = g.longitude * DEG;
  const [sp, cp, sl, cl] = [Math.sin(lat), Math.cos(lat), Math.sin(lon), Math.cos(lon)];
  return { east: [-sl, cl, 0], north: [-sp * cl, -sp * sl, cp], up: [cp * cl, cp * sl, sp] };
}

/** A direction in ECEF, as (east, north, up) at a place. */
export function ecefToEnuDirection(g: { latitude: number; longitude: number }, d: Vec3): Vec3 {
  const { east, north, up } = enuAxes(g);
  return [dot(east, d), dot(north, d), dot(up, d)];
}

/** A direction given as (east, north, up) at a place, in ECEF. */
export function enuToEcefDirection(g: { latitude: number; longitude: number }, d: Vec3): Vec3 {
  const { east, north, up } = enuAxes(g);
  return add(add(scale(east, d[0]), scale(north, d[1])), scale(up, d[2]));
}

/** A point in ECEF, as (east, north, up) from a place. */
export const ecefToEnu = (origin: Geodetic, p: Vec3): Vec3 => ecefToEnuDirection(origin, sub(p, geodeticToEcef(origin)));
/** A point given as (east, north, up) from a place, in ECEF. */
export const enuToEcef = (origin: Geodetic, p: Vec3): Vec3 => add(geodeticToEcef(origin), enuToEcefDirection(origin, p));

/** A vector in a site's frame (+Y up, +X on `bearingX`), as (east, north, up). The same for points and directions: the two frames share an origin. */
export function siteToEnu(bearingX: number, v: Vec3): Vec3 {
  const b = bearingX * DEG;
  const [sin, cos] = [Math.sin(b), Math.cos(b)];
  return [v[0] * sin + v[2] * cos, v[0] * cos - v[2] * sin, v[1]];
}

/** (east, north, up) in a site's frame. */
export function enuToSite(bearingX: number, v: Vec3): Vec3 {
  const b = bearingX * DEG;
  const [sin, cos] = [Math.sin(b), Math.cos(b)];
  return [v[0] * sin + v[1] * cos, v[2], v[0] * cos - v[1] * sin];
}

/** A point in a site's frame, in ECEF. */
export const siteToEcef = (site: Site, p: Vec3): Vec3 => enuToEcef(site, siteToEnu(site.bearingX, p));
/** A point in ECEF, in a site's frame. */
export const ecefToSite = (site: Site, p: Vec3): Vec3 => enuToSite(site.bearingX, ecefToEnu(site, p));
/** A direction in ECEF, in a site's frame. */
export const ecefToSiteDirection = (site: Site, d: Vec3): Vec3 => enuToSite(site.bearingX, ecefToEnuDirection(site, d));
/** A direction in a site's frame, in ECEF. */
export const siteToEcefDirection = (site: Site, d: Vec3): Vec3 => enuToEcefDirection(site, siteToEnu(site.bearingX, d));

/** A turn about +Z by `angle`, of the vector (not of the axes). */
const aboutZ = (v: Vec3, angle: number): Vec3 => {
  const [sin, cos] = [Math.sin(angle), Math.cos(angle)];
  return [v[0] * cos - v[1] * sin, v[0] * sin + v[1] * cos, v[2]];
};

/** A position or direction in ECEF, in the inertial frame of date. `gast` is time.ts's greenwichSiderealTime. */
export const ecefToInertial = (v: Vec3, gast: number): Vec3 => aboutZ(v, gast);
export const inertialToEcef = (v: Vec3, gast: number): Vec3 => aboutZ(v, -gast);

/**
 * A velocity relative to the turning Earth, as a velocity in the inertial frame: the ground's own
 * speed (465 m/s eastward at the equator, 409 at the Cape) is added. `r` and `v` are in ECEF.
 */
export function ecefToInertialVelocity(r: Vec3, v: Vec3, gast: number): Vec3 {
  return aboutZ(add(v, cross([0, 0, EARTH_ROTATION_RATE], r)), gast);
}

/** The reverse: an inertial position and velocity, as the velocity an observer on the ground measures, in ECEF. */
export function inertialToEcefVelocity(r: Vec3, v: Vec3, gast: number): Vec3 {
  return sub(aboutZ(v, -gast), cross([0, 0, EARTH_ROTATION_RATE], aboutZ(r, -gast)));
}

/** Where (east, north, up) points: azimuth clockwise from north in [0, 2 pi), elevation above the level. */
export function horizontal(enu: Vec3): { azimuth: number; elevation: number } {
  const azimuth = Math.atan2(enu[0], enu[1]);
  return { azimuth: azimuth < 0 ? azimuth + 2 * Math.PI : azimuth, elevation: Math.atan2(enu[2], Math.hypot(enu[0], enu[1])) };
}

/** The unit (east, north, up) vector toward an azimuth and elevation. */
export function fromHorizontal(azimuth: number, elevation: number): Vec3 {
  const cos = Math.cos(elevation);
  return [cos * Math.sin(azimuth), cos * Math.cos(azimuth), Math.sin(elevation)];
}

const ARCSEC = DEG / 3600;

/** A matrix product, `a` after `b`. */
export const multiply = (a: Mat3, b: Mat3): Mat3 => {
  const t = transpose(b);
  return [
    [dot(a[0], t[0]), dot(a[0], t[1]), dot(a[0], t[2])],
    [dot(a[1], t[0]), dot(a[1], t[1]), dot(a[1], t[2])],
    [dot(a[2], t[0]), dot(a[2], t[1]), dot(a[2], t[2])],
  ];
};
/** A turn of the axes about +X and about +Z by `angle` (SOFA's iauRx and iauRz): a vector's coordinates in the turned axes. */
const axesX = (angle: number): Mat3 => {
  const [s, c] = [Math.sin(angle), Math.cos(angle)];
  return [
    [1, 0, 0],
    [0, c, s],
    [0, -s, c],
  ];
};
const axesZ = (angle: number): Mat3 => {
  const [s, c] = [Math.sin(angle), Math.cos(angle)];
  return [
    [c, s, 0],
    [-s, c, 0],
    [0, 0, 1],
  ];
};

/**
 * The IAU 2006 precession's Fukushima-Williams angles, with the ICRF's frame bias in them (SOFA iauPfw06): radians.
 * `jdTT` is a Julian date in TT.
 */
export function precessionAngles(jdTT: number): { gamma: number; phi: number; psi: number; epsilon: number } {
  const t = centuries(jdTT);
  return {
    gamma: (-0.052928 + (10.556378 + (0.4932044 + (-0.00031238 + (-0.000002788 + 0.000000026 * t) * t) * t) * t) * t) * ARCSEC,
    phi: (84381.412819 + (-46.811016 + (0.0511268 + (0.00053289 + (-0.00000044 + -0.0000000176 * t) * t) * t) * t) * t) * ARCSEC,
    psi: (-0.041775 + (5038.481484 + (1.5584175 + (-0.00018522 + (-0.000026452 + -0.0000000148 * t) * t) * t) * t) * t) * ARCSEC,
    epsilon: meanObliquity(jdTT),
  };
}

/** The rotation from the ICRF to the equator and equinox of the angles' date (SOFA iauFw2m). */
const fukushimaWilliams = (gamma: number, phi: number, psi: number, epsilon: number): Mat3 =>
  multiply(axesX(-epsilon), multiply(axesZ(-psi), multiply(axesX(phi), axesZ(gamma))));

let lastDate = Number.NaN;
let lastMatrix: Mat3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
/**
 * The rotation that takes a direction or position in the ICRF (J2000 here) into the inertial frame of date: frame
 * bias, the IAU 2006 precession and the IAU 2000B nutation in one matrix (SOFA iauPnm06a, which has the full IAU 2000A
 * nutation: within a milliarcsecond of it, 2 m at the Moon). `jdTT` is a Julian date in TT. The last one asked for is
 * kept: a frame asks for the same instant many times.
 */
export function icrfToDate(jdTT: number): Mat3 {
  if (jdTT !== lastDate) {
    const a = precessionAngles(jdTT);
    const n = nutation(jdTT);
    lastMatrix = fukushimaWilliams(a.gamma, a.phi, a.psi + n.longitude, a.epsilon + n.obliquity);
    lastDate = jdTT;
  }
  return lastMatrix;
}

/** The same without the nutation: the ICRF to the mean equator and equinox of date (SOFA iauPmat06). */
export function icrfToMean(jdTT: number): Mat3 {
  const a = precessionAngles(jdTT);
  return fukushimaWilliams(a.gamma, a.phi, a.psi, a.epsilon);
}

/** A direction or position in J2000 (the ICRF), in the inertial frame of date, and back. `jdTT` is a Julian date in TT. */
export const j2000ToInertial = (v: Vec3, jdTT: number): Vec3 => rotate(icrfToDate(jdTT), v);
export const inertialToJ2000 = (v: Vec3, jdTT: number): Vec3 => rotate(transpose(icrfToDate(jdTT)), v);

/** The unit vector toward a right ascension and declination. */
export function fromEquatorial(ra: number, dec: number): Vec3 {
  const cos = Math.cos(dec);
  return [cos * Math.cos(ra), cos * Math.sin(ra), Math.sin(dec)];
}

/** Right ascension in [0, 2 pi) and declination of a vector. */
export function equatorial(v: Vec3): { ra: number; dec: number } {
  const ra = Math.atan2(v[1], v[0]);
  return { ra: ra < 0 ? ra + 2 * Math.PI : ra, dec: Math.atan2(v[2], Math.hypot(v[0], v[1])) };
}

/**
 * The rotation that takes a direction in J2000 (a catalogue star) to a site's own frame at an
 * instant: precession and nutation, the Earth's turn, the place's latitude and longitude, and the
 * site's bearing, as one matrix. `gast` is the Greenwich apparent sidereal time at that instant
 * and `jdTT` the same instant in TT.
 */
export function j2000ToSite(site: Site, gast: number, jdTT: number): Mat3 {
  const column = (v: Vec3): Vec3 => ecefToSiteDirection(site, inertialToEcef(j2000ToInertial(v, jdTT), gast));
  return transpose([column([1, 0, 0]), column([0, 1, 0]), column([0, 0, 1])]);
}

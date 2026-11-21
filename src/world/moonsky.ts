/**
 * The sky from the Moon at an instant, as numbers in doubles: where the Earth and the Sun are from the Moon's centre, how
 * the Earth is turned, how the stars' frame is turned, and the points under each. Its frame is the Moon's own
 * (world/moon.ts `fromMoon`: +Z its north pole, +X the mean direction of the Earth), metres from its centre. It draws
 * nothing: the front page (app/front/scene.ts) and the lunar setting (viewer/lunar/setting.ts) each turn it into their own
 * scene, and tests/front.test.mjs holds it to the ephemeris.
 *
 * The Earth's and the Sun's places are the ephemeris's (DE440's once it is loaded, Meeus's before: world/ephemeris.ts),
 * the Moon's axes Meeus's mean-Earth ones (`moonAxes`, within 0.03 degrees of DE440's: a direction in its sky to that).
 */
import { EARTH } from './bodies.ts';
import { DEG, dot, j2000ToInertial, length, type Mat3, rotate, scale, sub, transpose, unit, type Vec3 } from './frames.ts';
import { fromMoon } from './moon.ts';
import { greenwichSiderealTime, terrestrialTime } from './time.ts';

/** The sky from the Moon at an instant, in the scene's frame (the Moon's own; metres from its centre). */
export interface MoonSky {
  jdUT: number;
  /** The Earth's centre and the Sun's. */
  earth: Vec3;
  sun: Vec3;
  /** From the Earth's own frame (ECEF: frames.ts) to the scene's, as rows: the Earth as it is turned. */
  earthAxes: Mat3;
  /** From the star catalogue's frame (J2000) to the scene's, as rows. */
  starAxes: Mat3;
  /** The points of the Moon with the Earth and the Sun overhead, degrees. */
  subEarth: { longitude: number; latitude: number };
  subSolar: { longitude: number; latitude: number };
  /** The points of the Earth with the Moon and the Sun overhead: degrees north and east (geocentric). */
  earthUnderMoon: { latitude: number; longitude: number };
  earthUnderSun: { latitude: number; longitude: number };
  /** The Earth's phase seen from the Moon's centre: the angle at the Earth between the Sun and the Moon (radians), and the share of its disc that is lit. */
  earthPhase: number;
  earthLit: number;
  /** The Earth's breadth seen from the Moon's centre, radians. */
  earthBreadth: number;
}

const columns = (m: Mat3): Mat3 => transpose(m);

/** The sky from the Moon at an instant (a Julian date in UT). */
export function skyAt(jdUT: number): MoonSky {
  const jdTT = terrestrialTime(jdUT);
  const gast = greenwichSiderealTime(jdUT);
  const m = fromMoon(jdTT);
  // the Earth's axes in the inertial frame of date are that frame's, turned about +Z by the sidereal time
  const [c, s] = [Math.cos(gast), Math.sin(gast)];
  const ecefToInertial: Mat3 = [
    [c, -s, 0],
    [s, c, 0],
    [0, 0, 1],
  ];
  const product = (a: Mat3, b: Mat3): Mat3 => {
    const bt = transpose(b);
    return [
      [dot(a[0], bt[0]), dot(a[0], bt[1]), dot(a[0], bt[2])],
      [dot(a[1], bt[0]), dot(a[1], bt[1]), dot(a[1], bt[2])],
      [dot(a[2], bt[0]), dot(a[2], bt[1]), dot(a[2], bt[2])],
    ];
  };
  const earthAxes = product(m.axes, ecefToInertial);
  // (precession and nutation as a matrix: what they make of each of J2000's axes are its columns)
  const j2000 = columns([j2000ToInertial([1, 0, 0], jdTT), j2000ToInertial([0, 1, 0], jdTT), j2000ToInertial([0, 0, 1], jdTT)]);
  const starAxes = product(m.axes, j2000);
  // a direction in the scene as a place on the Earth: back through the Earth's axes
  const onEarth = (v: Vec3): { latitude: number; longitude: number } => {
    const e = unit(rotate(transpose(earthAxes), v));
    return { latitude: Math.asin(e[2]) / DEG, longitude: Math.atan2(e[1], e[0]) / DEG };
  };
  return {
    jdUT,
    earth: m.earth,
    sun: m.sun,
    earthAxes,
    starAxes,
    subEarth: m.subEarth,
    subSolar: m.subSolar,
    earthUnderMoon: onEarth(scale(m.earth, -1)),
    earthUnderSun: onEarth(sub(m.sun, m.earth)),
    earthPhase: m.earthPhase,
    earthLit: m.earthLit,
    earthBreadth: 2 * Math.asin(EARTH.equatorialRadius.value / length(m.earth)),
  };
}

/**
 * The front page's view, as numbers: the instant it shows, the lens it is seen through, and the
 * path the camera takes. Nothing here draws (front/scene.ts does): it is all arithmetic in doubles
 * on src/world, so the tests hold it to the ephemeris (tests/front.test.mjs).
 *
 * **The instant** is the one at which a person first left the Earth: Vostok 1's liftoff as its own
 * flight records it. Everything in the sky follows from it and is not arranged: seen from the Moon
 * the Earth is then nine tenths lit, with Africa, Arabia and India turned to the Moon and Tyuratam
 * in daylight on its disc; the Moon is a thin waning crescent from the Earth, so the Sun is behind
 * the camera's shoulder and the far side below it is in full day.
 *
 * **The scene's frame** is the Moon's own (world/moon.ts: +Z its north pole, +X the mean direction
 * of the Earth), with the Moon's centre at the origin, metres. The ground does not move in it; the
 * Earth hangs nearly still and turns; the Sun and the stars go round once a month.
 *
 * **The path** is one move outward. The camera starts 110 km over the far side (the height Apollo 8
 * and Kaguya photographed Earthrise from), a little behind the Moon's southern limb, with the
 * Earth's upper edge just clear of the horizon; it climbs, and the Earth rises because the horizon
 * falls away (Earthrise); it goes on out, always looking back, the horizon bending into the Moon's
 * limb (as Lunar Orbiter 1 and Zond 7 saw it), until five minutes later it settles 100,000 km behind
 * the Moon with the whole far side below and the whole Earth above it (as Chang'e 5-T1 and DSCOVR
 * saw the two together). It never stops dead and never cuts: its height is one smooth curve, and
 * what it settles into is a still camera before a turning Earth. Where it stands is worked out from
 * two things only, its height and how far the Earth's centre stands above the Moon's limb, so the
 * Earth keeps its place in the frame for as long as the page is left open, whatever the libration.
 *
 * The path is a design, and says so (`estimated`: chosen to look right). The sky it looks at is not.
 */
import { EARTH } from '../world/bodies.ts';
import { cross, DEG, dot, j2000ToInertial, length, type Mat3, rotate, scale, sub, transpose, unit, type Vec3 } from '../world/frames.ts';
import { fromMoon, MOON_RADIUS, selenographic } from '../world/moon.ts';
import { greenwichSiderealTime, julianDate, terrestrialTime } from '../world/time.ts';

/** A figure with how far it can be trusted and where it came from (types.ts: Measure, restated so this file needs nothing of a flight). */
export interface Figure {
  value: number;
  confidence: 'documented' | 'derived' | 'estimated';
  source: string;
}

/** The instant on show as the page opens, UTC: Vostok 1's liftoff (missions/ussr/vostok/flights/vostok-1/flight.ts `launch`; the test holds the two together). */
export const INSTANT = '1961-04-12T06:06:59.7Z';

/** Seconds of the world in one of ours while the page is on show: a minute a second, so the Earth turns a quarter of a degree a second and its terminator can be seen to move. For the look: estimated. */
export const PACE = 60;

/**
 * The lens. The Earth is 1.9 degrees across from the Moon, so every famous frame of it was made with a long lens:
 * Earthrise (AS8-14-2383) with the Hasselblad's 250 mm, Lunar Orbiter 1's with a 610 mm. This is the 500 mm
 * Tele-Tessar Apollo 15 to 17 carried for the same camera, on its 70 mm film: the frame is 55 mm square, so the
 * lens sees 6.3 degrees across it, and the window's shorter side is taken as the frame's side.
 */
export const LENS = {
  focal: {
    value: 500,
    confidence: 'estimated',
    source: 'Chosen: the Zeiss Tele-Tessar 500 mm f/8 of the Apollo 15 to 17 Hasselblad 500 EL (as remembered, not read again)',
  } satisfies Figure,
  frame: {
    value: 55,
    confidence: 'estimated',
    source: 'The 70 mm Hasselblad magazine’s picture, nominally 55 mm square (as remembered, not read again)',
  } satisfies Figure,
} as const;

/** The angle the lens sees across the frame's side, radians: 2 atan(frame / 2 focal) = 6.30 degrees (derived). */
export const FIELD = 2 * Math.atan(LENS.frame.value / (2 * LENS.focal.value));

/** The path: every figure chosen (estimated), in the units it is said in. */
export const PATH = {
  /** Height over the Moon's mean sphere at the start, km: the height of Apollo 8's and Kaguya's orbits. */
  from: 110,
  /** And where it settles, km: far enough that the whole Moon is in the lens's field with the Earth above it. */
  to: 100_000,
  /** Seconds from the first frame to the settling. */
  seconds: 300,
  /**
   * How far the Earth's centre stands above the Moon's limb, degrees: at the first frame (half of it clear
   * of the horizon's hills, which stand a quarter of a degree over the limb); from `risen` seconds on; and where it settles, which it draws in to from `closing` seconds on
   * (the Moon by then a ball of two degrees, and the Earth a degree clear of it).
   */
  rise: [0.3, 2.35, 1.9] as const,
  risen: 80,
  closing: 150,
  /**
   * Where on the Moon's limb (as the Earth sees it) the Earth stands over: the position angle round the limb from
   * the Moon's north through its east (Mare Crisium's side), degrees. 208 is the south-south-west, at 62 degrees
   * south: the far side's southern highlands, which the waning crescent's Sun lights from 18 degrees up at the
   * instant, from behind the camera and to one side, so every crater has its shadow.
   */
  limb: 208,
  /** The still frame anyone who has asked for less motion is given: this many seconds along the path (the Earth risen, the horizon nearly level). */
  still: 80,
} as const;

/** 6x^5 - 15x^4 + 10x^3: from 0 to 1 with no speed and no acceleration at either end. */
export const ease = (x: number): number => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * t * (t * (6 * t - 15) + 10);
};

/** Where the path is `t` seconds along: the camera's height over the Moon's mean sphere (metres) and how far the Earth's centre stands above the limb (radians). */
export function pathAt(t: number): { height: number; rise: number } {
  // the height grows by equal ratios in equal parts of the eased time, so the ground shrinks at a steady pace
  const height = PATH.from * 1000 * (PATH.to / PATH.from) ** ease(t / PATH.seconds);
  const rise =
    (PATH.rise[0] +
      (PATH.rise[1] - PATH.rise[0]) * ease(t / PATH.risen) +
      (PATH.rise[2] - PATH.rise[1]) * ease((t - PATH.closing) / (PATH.seconds - PATH.closing))) *
    DEG;
  return { height, rise };
}

/** The sky from the Moon at an instant, in the scene's frame (the Moon's own; metres from its centre). */
export interface FrontSky {
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
export function skyAt(jdUT: number): FrontSky {
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

/** The Julian date (UT) on show `t` seconds along the path: the instant, and the world's time running on from it at `PACE`. */
export const instantAt = (t: number): number => julianDate(INSTANT) + (PACE * t) / 86_400;

/** The point of the Moon's limb, as the Earth sees it, at a position angle from the Moon's north through its east (degrees): a unit vector in the scene. */
export function limbPoint(sky: Pick<FrontSky, 'earth'>, angle: number): Vec3 {
  const e = unit(sky.earth);
  const east = unit(cross([0, 0, 1], e));
  const north = cross(e, east);
  const [c, s] = [Math.cos(angle * DEG), Math.sin(angle * DEG)];
  return [c * north[0] + s * east[0], c * north[1] + s * east[1], c * north[2] + s * east[2]];
}

/** Where the camera is and how it is turned. */
export interface FrontCamera {
  /** The eye, in the scene. */
  position: Vec3;
  /** Its axes in the scene: to its right, up, and the way it looks. */
  right: Vec3;
  up: Vec3;
  forward: Vec3;
  /** Its height over the Moon's mean sphere, metres, and how far the Earth's centre stands above the Moon's limb, radians. */
  height: number;
  rise: number;
  /** How far below the level the Moon's limb lies from there, radians. */
  dip: number;
}

/**
 * The camera for a height and a rise, under a sky: over the far side behind the limb point, in the plane of that
 * point and the Earth, where the Earth's centre stands `rise` above the limb of the Moon's mean sphere; looking
 * so that the Earth's centre falls `aim` from the middle of the picture (as tangents: to the right and upward),
 * the limb level under it.
 */
export function cameraFor(
  sky: Pick<FrontSky, 'earth'>,
  height: number,
  rise: number,
  aim: readonly [number, number] = [0, 0],
): FrontCamera {
  const e = unit(sky.earth);
  const n = limbPoint(sky, PATH.limb);
  const r = MOON_RADIUS + height;
  const dip = Math.acos(MOON_RADIUS / r);
  // the angle at the Moon's centre from the Earth to the camera: a quarter turn, and the dip, less the rise; then
  // set right for the Earth being near (it is 0.26 degrees lower from the limb than from the centre)
  let angle = Math.PI / 2 + dip - rise;
  let position: Vec3 = [0, 0, 0];
  for (let k = 0; k < 4; k++) {
    const [c, s] = [Math.cos(angle), Math.sin(angle)];
    position = [r * (c * e[0] + s * n[0]), r * (c * e[1] + s * n[1]), r * (c * e[2] + s * n[2])];
    const elevation = Math.asin(dot(unit(position), unit(sub(sky.earth, position))));
    angle += elevation + dip - rise;
  }
  const toEarth = unit(sub(sky.earth, position));
  // It is held so that the Moon's centre is straight under the Earth in the picture, wherever in the picture the
  // Earth is put: the limb under the Earth is then level, near or far. The Earth, the Moon's centre and the eye
  // lie in one plane, which the picture shows as a line: the camera's right is that plane's normal, squared to
  // the way it looks.
  const across = unit(cross(toEarth, unit(position)));
  let forward = toEarth;
  let right = across;
  let up = cross(right, forward);
  // the Earth is to fall `aim` from the middle: the camera looks that much the other way (found by a few steps,
  // each of which turns the camera by what is left of the difference)
  for (let k = 0; k < 6 && (aim[0] !== 0 || aim[1] !== 0); k++) {
    const z = dot(toEarth, forward);
    const [dx, dy] = [dot(toEarth, right) / z - aim[0], dot(toEarth, up) / z - aim[1]];
    forward = unit([
      forward[0] + dx * right[0] + dy * up[0],
      forward[1] + dx * right[1] + dy * up[1],
      forward[2] + dx * right[2] + dy * up[2],
    ]);
    right = unit(sub(across, scale(forward, dot(across, forward))));
    up = cross(right, forward);
  }
  return { position, right, up, forward, height, rise, dip };
}

/** The camera `t` seconds along the path, under the sky of that moment. */
export const cameraAt = (t: number, sky: Pick<FrontSky, 'earth'>, aim?: readonly [number, number]): FrontCamera => {
  const { height, rise } = pathAt(t);
  return cameraFor(sky, height, rise, aim);
};

/** The place on the Moon under a point of the scene, degrees. */
export const moonUnder = (p: Vec3): { longitude: number; latitude: number } => selenographic(p);

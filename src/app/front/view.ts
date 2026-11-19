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
 * **The path** is one move outward, from the ground. The camera starts 40 m over a plain on the
 * Moon's south-western limb (`SITE`: a place found in the laser altimeter's heights where the
 * ground is level and the Earth stands half risen over a horizon six kilometres off), close enough
 * that the blocks lying on it and their shadows are seen. It goes straight up, and the Earth rises
 * as the horizon falls away under it (Earthrise, which is the camera's doing: the Earth hangs
 * still in the Moon's sky). From half a kilometre up it also draws back, keeping the Earth where
 * it has risen to over the limb; it passes the height Apollo 8 and Kaguya photographed Earthrise
 * from (110 km), goes on out, always looking back, the horizon bending into the Moon's limb (as
 * Lunar Orbiter 1 and Zond 7 saw it), until it settles 100,000 km behind the Moon with the whole
 * far side below and the whole Earth above it (as Chang'e 5-T1 and DSCOVR saw the two together).
 * It never stops dead and never cuts: its height is one smooth curve, already rising when the
 * picture comes up, and what it settles into is a still camera before a turning Earth. From far, where it stands is worked out from two things
 * only, its height and how far the Earth's centre stands above the Moon's limb, so the Earth keeps
 * its place in the frame for as long as the page is left open, whatever the libration; near the
 * ground it stands over the place it started from, and the Earth is where the sky has it.
 *
 * The path is a design, and says so (`estimated`: chosen to look right). The sky it looks at is not.
 */
import { EARTH } from '../../world/bodies.ts';
import { cross, DEG, dot, j2000ToInertial, length, type Mat3, rotate, scale, sub, transpose, unit, type Vec3 } from '../../world/frames.ts';
import { fromMoon, fromSelenographic, MOON_RADIUS, selenographic } from '../../world/moon.ts';
import { greenwichSiderealTime, julianDate, terrestrialTime } from '../../world/time.ts';
import { ease } from '../../util/math.ts';
import type { Measure } from '../../measure.ts';

/** A figure with how far it can be trusted and where it came from (measure.ts, which needs nothing of a flight). */
export type Figure = Measure;

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

/**
 * Where the camera starts: a place on the Moon, found and not placed by hand. tools/front-moon.mjs (`--find-site`)
 * looks along the south-western limb, as the Earth sees it at the instant, for ground that is level for 8 km toward
 * the Earth (within 1.2 degrees of level from the place, root mean square, in the altimeter's heights), with a level
 * horizon there and the Earth's centre between 0.05 and 0.45 degrees over it from 40 m up, and takes the levellest.
 * It is a plain 56 degrees south, two thirds of a degree on the Earth's side of the limb: the Sun is 20 degrees up
 * there, behind the camera's left shoulder.
 */
export const SITE = {
  longitude: {
    value: -85.87,
    confidence: 'derived',
    source:
      'tools/front-moon.mjs --find-site, from the LOLA heights of NASA’s CGI Moon Kit (ldem_64): the levellest place that sees the Earth half risen',
  } satisfies Figure,
  latitude: { value: -56.11, confidence: 'derived', source: 'as the longitude' } satisfies Figure,
  /** The ground there, metres above the Moon's reference sphere (1,737,400 m): the bake writes it and the test holds the two together. */
  ground: {
    value: 1120.24,
    confidence: 'derived',
    source: 'LOLA (ldem_64, 481 m a texel), between its four nearest texels: tools/front-moon.mjs --only site',
  } satisfies Figure,
} as const;

/** The unit vector toward the site, in the Moon's frame. */
export const SITE_DIR: Vec3 = fromSelenographic(SITE.longitude.value, SITE.latitude.value);

/** The path: every figure chosen (estimated), in the units it is said in. */
export const PATH = {
  /** Height over the ground at the site at the start, metres: low enough that a block a metre across is a dozen pixels. */
  from: 40,
  /** The height the first part of the climb is to, km over the site: the height of Apollo 8's and Kaguya's orbits. */
  mid: 110,
  /** And where it settles, km over the Moon's mean sphere: far enough that the whole Moon is in the lens's field with the Earth above it. */
  to: 100_000,
  /** Seconds the climb to `mid` takes, from rest to rest; when the going out begins (it overlaps the climb, so the camera does not pause); and when it has settled. */
  lift: 160,
  away: 100,
  seconds: 380,
  /**
   * The climb does not start from rest: the picture comes up on a camera already rising, at this share of the
   * climb's mean pace (half a metre a second at 40 m: the ground is seen to move from the first frame).
   */
  drift: 0.25,
  /**
   * The most the Earth's centre stands above the Moon's limb, degrees: until `closing` seconds, and where it
   * settles (the Moon by then a ball of two degrees, and the Earth a degree clear of it). Near the ground the Earth
   * is lower than this, where the sky has it; the camera begins to draw back as the Earth comes within `knee`
   * degrees of it.
   */
  rise: [2.35, 1.9] as const,
  closing: 230,
  knee: 0.5,
  /**
   * The limb the rise is measured from is the Moon's mean sphere's, from far; near the ground, where that sphere
   * is a kilometre under the plain, it is a sphere at the site's own level. Between these heights over the site,
   * km, the one becomes the other.
   */
  level: [3, 60] as const,
  /** The still frame anyone who has asked for less motion is given: this many seconds along the path (the Earth risen over a level horizon, from 30 km: the craters under it have their shadows). */
  still: 105,
} as const;

/** The lesser of two, without a corner: `k` is how far apart they are when it first differs from the lesser. */
const softMin = (a: number, b: number, k: number): number => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - (h * h * k) / 4;
};

/** The climb's share done, for a share of its time: eased at its end, and begun at `PATH.drift` of its mean pace. */
const climbed = (x: number): number => {
  const t = Math.min(1, Math.max(0, x));
  return ease(t) + PATH.drift * t * (1 - t) ** 3;
};

/**
 * Where the path is `t` seconds along: the camera's height over the Moon's mean sphere and over the ground at the
 * site (metres), the most the Earth's centre may stand above the limb (radians), and the level of the sphere whose
 * limb that is (metres above the mean sphere).
 */
export function pathAt(t: number): { height: number; over: number; rise: number; level: number } {
  // the height grows by equal ratios in equal parts of each eased time, so the ground shrinks at a steady pace
  const ground = SITE.ground.value;
  const up = Math.log((PATH.mid * 1000) / PATH.from);
  const out = Math.log((PATH.to * 1000 - ground) / (PATH.mid * 1000));
  const over = PATH.from * Math.exp(up * climbed(t / PATH.lift) + out * ease((t - PATH.away) / (PATH.seconds - PATH.away)));
  const rise = (PATH.rise[0] + (PATH.rise[1] - PATH.rise[0]) * ease((t - PATH.closing) / (PATH.seconds - PATH.closing))) * DEG;
  const level = ground * (1 - ease(Math.log(over / (PATH.level[0] * 1000)) / Math.log(PATH.level[1] / PATH.level[0])));
  return { height: ground + over, over, rise, level };
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

/**
 * The point of the Moon's limb, as the Earth sees it, that the camera's plane crosses: the plane of the Earth, the
 * Moon's centre and the site. The camera is always in that plane, behind this point.
 */
export function limbOf(sky: Pick<FrontSky, 'earth'>): Vec3 {
  const e = unit(sky.earth);
  return unit(sub(SITE_DIR, scale(e, dot(SITE_DIR, e))));
}

/** That point's position angle round the limb, from the Moon's north through its east (`limbPoint`), degrees. */
export function limbAngle(sky: Pick<FrontSky, 'earth'>): number {
  const e = unit(sky.earth);
  const east = unit(cross([0, 0, 1], e));
  const n = limbOf(sky);
  return (Math.atan2(dot(n, east), dot(n, cross(e, east))) / DEG + 360) % 360;
}

/** Where the camera is and how it is turned. */
export interface FrontCamera {
  /** The eye, in the scene. */
  position: Vec3;
  /** Its axes in the scene: to its right, up, and the way it looks. */
  right: Vec3;
  up: Vec3;
  forward: Vec3;
  /** Its height over the Moon's mean sphere, metres, and how far the Earth's centre stands above the limb, radians. */
  height: number;
  rise: number;
  /** How far below the level that limb lies from there, radians. */
  dip: number;
  /** Whether it stands over the site (the Earth is then where the sky has it, lower than the path's most). */
  held: boolean;
}

/** How a camera at a place is turned to the Earth: `aim` as `cameraFor` has it. */
function turned(
  position: Vec3,
  sky: Pick<FrontSky, 'earth'>,
  aim: readonly [number, number],
): Pick<FrontCamera, 'right' | 'up' | 'forward'> {
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
  return { right, up, forward };
}

/**
 * The camera for a height and a rise, under a sky: in the plane of the Earth, the Moon's centre and the site, behind
 * the limb, where the Earth's centre stands `rise` above the limb of the sphere `level` metres over the Moon's mean
 * one; looking so that the Earth's centre falls `aim` from the middle of the picture (as tangents: to the right and
 * upward), the limb level under it.
 */
export function cameraFor(
  sky: Pick<FrontSky, 'earth'>,
  height: number,
  rise: number,
  aim: readonly [number, number] = [0, 0],
  level = 0,
): FrontCamera {
  const e = unit(sky.earth);
  const n = limbOf(sky);
  const r = MOON_RADIUS + height;
  const dip = Math.acos(Math.min(1, (MOON_RADIUS + level) / r));
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
  return { position, ...turned(position, sky, aim), height, rise, dip, held: false };
}

/**
 * The camera `t` seconds along the path, under the sky of that moment. Over the site it goes straight up, and the
 * Earth stands as high over the limb as the sky and the camera's height make it; as that nears the path's most
 * (`PATH.rise`, within `PATH.knee`) it draws back as well, and from there on holds the Earth at that.
 */
export function cameraAt(t: number, sky: Pick<FrontSky, 'earth'>, aim: readonly [number, number] = [0, 0]): FrontCamera {
  const { height, rise: most, level } = pathAt(t);
  const r = MOON_RADIUS + height;
  const over: Vec3 = scale(SITE_DIR, r);
  const dip = Math.acos(Math.min(1, (MOON_RADIUS + level) / r));
  const here = Math.asin(dot(SITE_DIR, unit(sub(sky.earth, over)))) + dip;
  const rise = softMin(here, most, PATH.knee * DEG);
  if (rise >= here) return { position: over, ...turned(over, sky, aim), height, rise, dip, held: true };
  return cameraFor(sky, height, rise, aim, level);
}

/** The place on the Moon under a point of the scene, degrees. */
export const moonUnder = (p: Vec3): { longitude: number; latitude: number } => selenographic(p);

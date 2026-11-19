/**
 * The Sun, the Earth, the Moon and the other planets, as data: how heavy, how big, how each turns,
 * and where each goes. Nothing here computes a position (ephemeris.ts does); this is the record
 * the simulator's gravity and the viewer's sizes are read from.
 *
 * Units are SI throughout (metres, seconds, m^3/s^2), except orbital elements, which stay in the
 * units their table is published in (astronomical units and degrees, with rates per Julian
 * century) and are converted once, where they are used.
 *
 * The Earth and the Moon are the bodies the game is played on and round, and their figures are the
 * ones geodesy and the lunar ephemerides use. The other planets are placeholders: correct masses,
 * sizes, poles and mean orbits, and nothing more (no moons, no rings, no atmospheres).
 */
import type { Confidence, Measure } from '../measure.ts';

/** One number with how far it can be trusted and where it came from (measure.ts), and a note. */
export type Quantity = Measure & { note?: string };

/** A Keplerian element at J2000.0 and its rate per Julian century. */
export type Rated = readonly [atJ2000: number, perCentury: number];

/**
 * Mean heliocentric orbit, referred to the mean ecliptic and equinox of J2000: semi-major axis
 * (au), eccentricity, inclination, mean longitude, longitude of perihelion and longitude of the
 * ascending node (degrees). Valid 1800 to 2050.
 */
export interface Elements {
  a: Rated;
  e: Rated;
  i: Rated;
  L: Rated;
  peri: Rated;
  node: Rated;
  confidence: Confidence;
  source: string;
}

export interface Body {
  id: string;
  name: string;
  /** What it orbits: the id of another body, or null for the Sun. */
  parent: string | null;
  /** Gravitational parameter GM, m^3/s^2. */
  gm: Quantity;
  /** Metres. */
  equatorialRadius: Quantity;
  /** Metres. */
  polarRadius: Quantity;
  /**
   * Sidereal rotation period, seconds. Negative: it turns backwards about the pole given below
   * (the IAU's north pole is the one on the north side of the solar system's invariable plane).
   */
  rotationPeriod: Quantity;
  /** Right ascension and declination of the north pole, degrees, ICRF at J2000. */
  pole: { ra: number; dec: number; confidence: Confidence; source: string };
  /**
   * Where its prime meridian stands, degrees east along its equator from the node of that equator on the ICRF's, at J2000
   * TDB (`at`), and how fast it turns, degrees a day (`rate`): the IAU's W = W0 + rate d, its periodic terms left out (the
   * Moon's are 0.03 degrees; world/moon.ts carries its librations). The Earth's is its sidereal time (time.ts).
   */
  meridian?: { at: number; rate: number; confidence: Confidence; source: string };
  /** Its mean orbit round the Sun. The Earth's is the Earth-Moon barycentre's; the Sun and the Moon have none here. */
  elements?: Elements;
  /**
   * Visual magnitude seen from 1 au when 1 au from the Sun, and how it dims with phase angle i in
   * degrees: V = v10 + 5 log10(r d) + phase[0] x + phase[1] x^2 + phase[2] x^3, x = i - phaseOrigin
   * (r and d in au: its distances from the Sun and from the observer).
   */
  magnitude?: { v10: number; phase: readonly [number, number, number]; phaseOrigin: number; confidence: Confidence; source: string };
}

/**
 * Standard gravity, m/s^2: what a "g" is, what turns specific impulse into flow, and what a kilogram-force weighs.
 * Exact by definition (documented: 3rd CGPM, 1901). The pull felt at the Earth's surface differs from it by under 0.3 per
 * cent from the equator to the poles; anything walked, dropped or hung on the Earth here falls by it.
 */
export const G0 = 9.80665;

/** Metres in an astronomical unit: exact by definition (IAU 2012 Resolution B1). */
export const AU = 149_597_870_700;
/** Speed of light, m/s: exact by definition. */
export const C = 299_792_458;
/** Seconds in a day. */
export const DAY = 86_400;

const DE440 = 'JPL DE440 (Park et al. 2021, AJ 161:105), as tabulated at ssd.jpl.nasa.gov/astro_par.html';
const WGCCRE = 'IAU WGCCRE 2015 report (Archinal et al. 2018, Celest. Mech. Dyn. Astr. 130:22)';
const JPL_PHYS = 'JPL Planetary Physical Parameters, ssd.jpl.nasa.gov/planets/phys_par.html';
const STANDISH =
  'Standish, Keplerian Elements for Approximate Positions of the Major Planets, Table 1 (ssd.jpl.nasa.gov/planets/approx_pos.html)';
const MEEUS_41 = 'Meeus, Astronomical Algorithms, 2nd ed., chapter 41 (Mueller’s formulae)';
const WGS84 = 'WGS 84, NIMA TR8350.2, 3rd ed., Table 3.1';

const doc = (value: number, source: string, note?: string): Quantity => ({
  value,
  confidence: 'documented',
  source,
  ...(note ? { note } : {}),
});
const km = (value: number, source: string, note?: string): Quantity => doc(value * 1e3, source, note);
/** A GM published in km^3/s^2. */
const gmKm3 = (value: number, source: string, note?: string): Quantity => doc(value * 1e9, source, note);
const days = (value: number, source: string, note?: string): Quantity => ({
  value: value * DAY,
  confidence: 'derived',
  source,
  note: `${value} days${note ? `; ${note}` : ''}`,
});
const pole = (ra: number, dec: number, source = WGCCRE) => ({ ra, dec, confidence: 'documented' as Confidence, source });
const elements = (rows: readonly [Rated, Rated, Rated, Rated, Rated, Rated]): Elements => ({
  a: rows[0],
  e: rows[1],
  i: rows[2],
  L: rows[3],
  peri: rows[4],
  node: rows[5],
  confidence: 'documented',
  source: STANDISH,
});
const mag = (v10: number, phase: readonly [number, number, number] = [0, 0, 0], phaseOrigin = 0) => ({
  v10,
  phase,
  phaseOrigin,
  confidence: 'documented' as Confidence,
  source: MEEUS_41,
});

/** The Earth's ellipsoid: WGS 84. Everything geodetic in frames.ts is on this figure. */
export const WGS84_A = 6_378_137;
export const WGS84_INVERSE_FLATTENING = 298.257223563;
export const WGS84_B = WGS84_A * (1 - 1 / WGS84_INVERSE_FLATTENING);
/**
 * The sphere the viewer takes the Earth to be where a sphere will do, metres: the sky's three models (the air's tables,
 * the clouds' shell, the stars' and the haze's horizon), the globe's texels measured on the ground, and the sound's fall
 * of the sea below the site's flat frame. It is the Earth's mean radius to the kilometre (IUGG's R1 is 6,371,008.8 m:
 * Moritz, Geodetic Reference System 1980, which the simulator's ballistic run takes, sim/fly.ts `MEAN_RADIUS`). A
 * drawing's figure, not geodesy's: whatever is placed on the Earth is placed on WGS 84, above.
 */
export const EARTH_SPHERE = 6_371_000;
/** The Earth's rotation rate, rad/s (WGS 84; the same figure as the IERS's nominal mean rate). */
export const EARTH_ROTATION_RATE = 7.292115e-5;
/** The Earth's oblateness: the second zonal harmonic of WGS 84's gravity model (EGM96's C20, unnormalised). Every simulator's gravity (world/orbit.ts `gravity`). */
export const EARTH_J2 = 1.082_629_989e-3;
/** The standard atmosphere's pressure at sea level, Pa: what a sea-level thrust is quoted at, and where the 1976 standard air begins (exact by definition). */
export const P0 = 101_325;

export const SUN: Body = {
  id: 'sun',
  name: 'Sun',
  parent: null,
  gm: doc(1.3271244004127942e20, DE440),
  equatorialRadius: km(695_700, 'IAU 2015 Resolution B3, nominal solar radius'),
  polarRadius: km(
    695_700,
    'IAU 2015 Resolution B3, nominal solar radius',
    'the Sun’s flattening is about 1 part in 100,000 and is left out',
  ),
  rotationPeriod: days(
    25.38,
    WGCCRE,
    'from the rotation of the prime meridian, 14.1844 degrees a day (the Carrington rate); the Sun turns faster at its equator',
  ),
  pole: pole(286.13, 63.87),
};

/** The Earth: one body for everything drawn of it, the globe under a flight (viewer/globemesh.ts) and the front page's ball (app/front/earth.ts) alike. */
export const EARTH: Body = {
  id: 'earth',
  name: 'Earth',
  parent: 'sun',
  gm: doc(3.986004418e14, 'IERS Conventions (2010), Table 1.1; the WGS 84 value is the same', 'includes the atmosphere'),
  equatorialRadius: doc(WGS84_A, WGS84),
  polarRadius: { value: WGS84_B, confidence: 'derived', source: WGS84, note: 'a (1 - f), f = 1/298.257223563' },
  rotationPeriod: {
    value: (2 * Math.PI) / EARTH_ROTATION_RATE,
    confidence: 'derived',
    source: WGS84,
    note: '2 pi / 7.292115e-5 rad/s = 86,164.099 s: one turn against the stars, 8 ms longer than the sidereal day, which is measured against the moving equinox',
  },
  pole: pole(0, 90),
  elements: elements([
    [1.00000261, 0.00000562],
    [0.01671123, -0.00004392],
    [-0.00001531, -0.01294668],
    [100.46457166, 35999.37244981],
    [102.93768193, 0.32327364],
    [0, 0],
  ]),
};

export const MOON: Body = {
  id: 'moon',
  name: 'Moon',
  parent: 'earth',
  gm: gmKm3(4902.800118, DE440),
  equatorialRadius: km(1737.4, WGCCRE, 'the mean radius: the Moon is 2 km from a sphere, and the IAU gives one figure for all three axes'),
  polarRadius: km(1737.4, WGCCRE),
  rotationPeriod: days(27.321661, 'Astronomical Almanac, section D: the sidereal month, which the Moon’s rotation is locked to'),
  pole: pole(269.9949, 66.5392),
  meridian: { at: 38.3213, rate: 13.17635815, confidence: 'documented', source: WGCCRE },
};

/** The planets other than the Earth: placeholders. GM is the whole system's (planet and moons) where it has moons. */
export const MERCURY: Body = {
  id: 'mercury',
  name: 'Mercury',
  parent: 'sun',
  gm: gmKm3(22031.868551, DE440),
  equatorialRadius: km(2440.53, JPL_PHYS),
  polarRadius: km(2438.26, WGCCRE),
  rotationPeriod: days(58.6462, JPL_PHYS),
  pole: pole(281.0103, 61.4155),
  elements: elements([
    [0.38709927, 0.00000037],
    [0.20563593, 0.00001906],
    [7.00497902, -0.00594749],
    [252.2503235, 149472.67411175],
    [77.45779628, 0.16047689],
    [48.33076593, -0.12534081],
  ]),
  magnitude: mag(1.16, [0.02838, 0.0001023, 0], 50),
};

export const VENUS: Body = {
  id: 'venus',
  name: 'Venus',
  parent: 'sun',
  gm: gmKm3(324858.592, DE440),
  equatorialRadius: km(6051.8, JPL_PHYS),
  polarRadius: km(6051.8, WGCCRE),
  rotationPeriod: days(-243.018, JPL_PHYS, 'backwards'),
  pole: pole(272.76, 67.16),
  elements: elements([
    [0.72333566, 0.0000039],
    [0.00677672, -0.00004107],
    [3.39467605, -0.0007889],
    [181.9790995, 58517.81538729],
    [131.60246718, 0.00268329],
    [76.67984255, -0.27769418],
  ]),
  magnitude: mag(-4.0, [0.01322, 0, 0.0000004247]),
};

export const MARS: Body = {
  id: 'mars',
  name: 'Mars',
  parent: 'sun',
  gm: gmKm3(42828.375816, DE440, 'the Mars system'),
  equatorialRadius: km(3396.19, `${WGCCRE}; ${JPL_PHYS}`),
  polarRadius: km(3376.2, WGCCRE, 'the mean of the north and south polar radii'),
  rotationPeriod: days(1.02595676, JPL_PHYS),
  pole: pole(317.269202, 54.432516),
  meridian: { at: 176.049863, rate: 350.891982443297, confidence: 'documented', source: WGCCRE },
  elements: elements([
    [1.52371034, 0.00001847],
    [0.0933941, 0.00007882],
    [1.84969142, -0.00813131],
    [-4.55343205, 19140.30268499],
    [-23.94362959, 0.44441088],
    [49.55953891, -0.29257343],
  ]),
  magnitude: mag(-1.3, [0.01486, 0, 0]),
};

export const JUPITER: Body = {
  id: 'jupiter',
  name: 'Jupiter',
  parent: 'sun',
  gm: gmKm3(126712764.1, DE440, 'the Jupiter system'),
  equatorialRadius: km(71492, JPL_PHYS, 'at the 1 bar level'),
  polarRadius: km(66854, WGCCRE, 'at the 1 bar level'),
  rotationPeriod: days(0.41354, JPL_PHYS, 'System III: the magnetic field’s rotation'),
  pole: pole(268.056595, 64.495303),
  elements: elements([
    [5.202887, -0.00011607],
    [0.04838624, -0.00013253],
    [1.30439695, -0.00183714],
    [34.39644051, 3034.74612775],
    [14.72847983, 0.21252668],
    [100.47390909, 0.20469106],
  ]),
  magnitude: mag(-8.93),
};

export const SATURN: Body = {
  id: 'saturn',
  name: 'Saturn',
  parent: 'sun',
  gm: gmKm3(37940584.8418, DE440, 'the Saturn system'),
  equatorialRadius: km(60268, JPL_PHYS, 'at the 1 bar level'),
  polarRadius: km(54364, WGCCRE, 'at the 1 bar level'),
  rotationPeriod: days(0.44401, JPL_PHYS),
  pole: pole(40.589, 83.537),
  elements: elements([
    [9.53667594, -0.0012506],
    [0.05386179, -0.00050991],
    [2.48599187, 0.00193609],
    [49.95424423, 1222.49362201],
    [92.59887831, -0.41897216],
    [113.66242448, -0.28867794],
  ]),
  magnitude: { ...mag(-8.68), source: `${MEEUS_41}: the globe alone, the rings’ light (up to a magnitude) left out` },
};

export const URANUS: Body = {
  id: 'uranus',
  name: 'Uranus',
  parent: 'sun',
  gm: gmKm3(5794556.4, DE440, 'the Uranus system'),
  equatorialRadius: km(25559, JPL_PHYS, 'at the 1 bar level'),
  polarRadius: km(24973, WGCCRE, 'at the 1 bar level'),
  rotationPeriod: days(-0.71833, JPL_PHYS, 'backwards'),
  pole: pole(257.311, -15.175),
  elements: elements([
    [19.18916464, -0.00196176],
    [0.04725744, -0.00004397],
    [0.77263783, -0.00242939],
    [313.23810451, 428.48202785],
    [170.9542763, 0.40805281],
    [74.01692503, 0.04240589],
  ]),
  magnitude: mag(-6.85),
};

export const NEPTUNE: Body = {
  id: 'neptune',
  name: 'Neptune',
  parent: 'sun',
  gm: gmKm3(6836527.10058, DE440, 'the Neptune system'),
  equatorialRadius: km(24764, JPL_PHYS, 'at the 1 bar level'),
  polarRadius: km(24341, WGCCRE, 'at the 1 bar level'),
  rotationPeriod: days(0.67125, JPL_PHYS),
  pole: pole(299.36, 43.46),
  elements: elements([
    [30.06992276, 0.00026291],
    [0.00859048, 0.00005105],
    [1.77004347, 0.00035372],
    [-55.12002969, 218.45945325],
    [44.96476227, -0.32241464],
    [131.78422574, -0.00508664],
  ]),
  magnitude: mag(-7.05),
};

/**
 * A body's gravity at its equator from its GM and radius alone, m/s^2 (derived: GM / a^2; no rotation, no oblateness). The
 * Earth's is 9.798, the Moon's 1.62.
 */
export const surfaceGravity = (body: Body): number => body.gm.value / body.equatorialRadius.value ** 2;

/**
 * What a thing dropped on a body's surface falls by, m/s^2: what walking, a body gone limp, a hanging hose and a thing
 * carried fall by on the ground there. On the Earth it is standard gravity (`G0`, by definition), which every such thing
 * has fallen by and which the Earth's own differs from by under 0.3 per cent; elsewhere it is derived, the pull at the
 * equator less the turning's (GM / a^2 - w^2 a, oblateness left out): the Moon's 1.624 (NASA's fact sheet: 1.62), Mars's
 * 3.696 (3.69).
 */
export function gravityOn(body: Body): number {
  if (body.id === 'earth') return G0;
  const w = (2 * Math.PI) / body.rotationPeriod.value;
  return surfaceGravity(body) - w * w * body.equatorialRadius.value;
}

/**
 * A body's figure: its equatorial and polar radii and its first eccentricity squared, metres, what frames.ts's geodetic
 * functions and surface.ts work on. The Earth's is WGS 84's exactly (`WGS84_FIGURE`); the Moon's a sphere of its mean
 * radius; the others' ellipsoids from their two radii (bodies' `equatorialRadius`, `polarRadius`).
 */
export interface Figure {
  readonly a: number;
  readonly b: number;
  readonly e2: number;
}

/** The WGS 84 ellipsoid as a figure: e^2 = f (2 - f), as WGS 84 states it. */
export const WGS84_FIGURE: Figure = {
  a: WGS84_A,
  b: WGS84_B,
  e2: (1 / WGS84_INVERSE_FLATTENING) * (2 - 1 / WGS84_INVERSE_FLATTENING),
};

const figures = new Map<string, Figure>([['earth', WGS84_FIGURE]]);
/** The figure of a body (`Figure`), made once. */
export function figureOf(body: Body): Figure {
  let f = figures.get(body.id);
  if (!f) {
    const [a, b] = [body.equatorialRadius.value, body.polarRadius.value];
    figures.set(body.id, (f = { a, b, e2: 1 - (b * b) / (a * a) }));
  }
  return f;
}

/** The planets seen in the sky from the Earth, nearest the Sun first. */
export const PLANETS: readonly Body[] = [MERCURY, VENUS, MARS, JUPITER, SATURN, URANUS, NEPTUNE];
/** Every body, the Sun first. */
export const BODIES: readonly Body[] = [SUN, MERCURY, VENUS, EARTH, MOON, MARS, JUPITER, SATURN, URANUS, NEPTUNE];

/** A body by its id (`Body.id`, as a site names the body it stands on: types.ts `SiteDef.body`); the Earth when none is named. */
export function bodyOf(id: string | undefined): Body {
  if (id === undefined) return EARTH;
  const body = BODIES.find((b) => b.id === id);
  if (!body) throw new Error(`no body ${id}`);
  return body;
}

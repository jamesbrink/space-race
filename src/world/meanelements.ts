/**
 * Mean elements under J2: the orbit as it is published (heights, an inclination and a period, each an average over
 * the revolution) and the osculating state a propagator starts from, and back. Pure, in doubles; held by
 * tests/meanelements.test.mjs to published orbits and to the repo's own J2 propagator (orbit.ts `coast`).
 *
 * The theory is Kozai's first-order one (Y. Kozai, "The motion of a close earth satellite", Astronomical Journal 64,
 * 367-377, 1959; read from the NASA ADS scan, 1959AJ.....64..367K), with the Earth's gravity as orbit.ts has it: the
 * point mass and J2 (Kozai's A2 = 3/2 J2 R^2, his eq. 1; R the equatorial radius, WGS84_A, as `gravity` takes it).
 * Each formula below names its equation. Kozai's notation: v the true anomaly, w the argument of perigee, M the mean
 * anomaly, u = v + w the argument of latitude, p = a (1 - e^2), b = sqrt(1 - e^2), s2 = sin^2 i.
 *
 * What "mean" means here, once. The short-periodic terms (eq. 10) are the part of each osculating element that goes
 * round with the satellite; their averages over M (eq. 12) are not zero (but for a's) and Kozai carries them into his
 * long-periodic terms (eqs. 25-30, which need J4 and fall singular at the critical inclination, 63.4 degrees, that
 * Vostok flew within two degrees of). Here they are taken off the short-periodic terms instead and nothing else is
 * done: a mean element is the osculating one averaged over a revolution, the long-periodic part left in it. Over a
 * flight of hours the long-periodic part is a constant (it turns with the perigee, 2 degrees a day at 65 degrees), so
 * nothing a flight measures can tell the two apart.
 *
 * The mean semi-major axis `a` is the average of the osculating a over M (eq. 10's da_s averages to zero: Kozai,
 * p. 370), the a0 of Kozai's p. 372 with n0^2 a0^3 = GM, and the a'' of Brouwer (AJ 64, 378, 1959). Kozai's own
 * "mean semi-major axis" a-bar = a0 (1 - A2/p^2 (1 - 3/2 s2) b) (p. 372, eq. 14) is the one his eqs. 13 and 31 place
 * the satellite by: its radius, not the a that vis-viva gives the speed from. `kozaiAxis` gives it. On a circle over
 * the equator the two are r and r (1 + A2/r^2), and the second is what the speed of a circular orbit under J2 says
 * (v^2 / r = GM/r^2 (1 + A2/r^2)). The theories' two mean axes differ by 2 km in low orbit, a period by 3 s: whichever is
 * meant by a published axis, a published period fixes it (`meanOrbitOf`).
 *
 * Small e: eq. 10 divides by e in de_s, w_s and M_s, and those terms are large when e is (Kozai, p. 377: they vanish
 * from r and u). So the corrections are carried in elements that have no such trouble: a, xi = e cos w, eta = e sin w,
 * i, the node, and lambda = M + w, the 1/e parts of dM and dw cancelling term for term in lambda (checked in the test).
 * A mean e under 1e-9 is taken as 1e-9 (a circle to 7 mm). Small i is not provided for: the node is then undefined.
 */
import type { Confidence } from '../measure.ts';
import { EARTH, EARTH_J2, WGS84_A, WGS84_B } from './bodies.ts';
import { length, scale, unit, type Vec3 } from './frames.ts';
import { axisOfPeriod, elementsOf, meanAnomaly, type State, stateOf, trueAnomaly } from './orbit.ts';

const GM = EARTH.gm.value;
const TAU = 2 * Math.PI;
const wrap = (angle: number): number => ((angle % TAU) + TAU) % TAU;
/** The least mean eccentricity the terms are worked at (below it the orbit is a circle to 7 mm). */
const E_LEAST = 1e-9;
/** Kozai's A2 for the Earth as orbit.ts's gravity has it: 3/2 J2 R^2, m^2 (eq. 1). */
const A2 = 1.5 * EARTH_J2 * WGS84_A * WGS84_A;

/**
 * Mean elements: `a` the average of the osculating semi-major axis (m), `e`, `i`, `node` and `argp` as orbit.ts's
 * `Elements`, and `mean` the mean anomaly (rad), each averaged over a revolution. In the inertial frame of date.
 */
export interface MeanElements {
  a: number;
  e: number;
  i: number;
  node: number;
  argp: number;
  mean: number;
}

/** The short-periodic part of each element at a place on a mean orbit: what the osculating element is more than the mean. */
export interface ShortPeriodic {
  /** Semi-major axis, m (eq. 10, da_s; its average is zero). */
  a: number;
  /** e cos w and e sin w. */
  xi: number;
  eta: number;
  /** Inclination and node, rad. */
  i: number;
  node: number;
  /** M + w, rad. */
  lambda: number;
}

/** Kozai's eq. 11: the average over M of cos 2v, divided by e^2 (so that it is finite at e = 0). */
const cos2vOverE2 = (e: number): number => {
  const b = Math.sqrt(1 - e * e);
  return (1 + 2 * b) / (1 + b) ** 2;
};

/**
 * The six short-periodic terms of eq. 10 at a mean orbit, each less its average over M (eq. 12), turned into
 * elements without the 1/e (a, xi, eta, i, node, lambda). First order in J2: the terms are worked at the mean
 * elements, which differ from the osculating ones by J2 (Kozai, p. 369: "one may regard a, n, e, i and w on the
 * right-hand sides of equations (7) to be constant").
 */
export function shortPeriodic(m: MeanElements): ShortPeriodic {
  const e = Math.max(m.e, E_LEAST);
  const { a, i } = m;
  const w = m.argp;
  const e2 = e * e;
  const b = Math.sqrt(1 - e2);
  const p = a * (1 - e2);
  const k = A2 / (p * p); // A2 / p^2, the size of every term
  const s2 = Math.sin(i) ** 2;
  const c2i = Math.cos(i) ** 2;
  const v = trueAnomaly(m.mean, e);
  const M = wrap(m.mean);
  const u = v + w;
  const ar = (1 + e * Math.cos(v)) / (1 - e2); // a / r
  const ar3 = ar * ar * ar;
  const lead = ar3 - b ** -3; // (a/r)^3 - (1 - e^2)^(-3/2)
  // v - M + e sin v: the equation of the centre and a little more (eqs. 10's dw_s, dOmega_s); it averages to zero
  let centre = v - M;
  centre = Math.atan2(Math.sin(centre), Math.cos(centre)) + e * Math.sin(v);
  const sin = Math.sin;
  const cos = Math.cos;
  const one32 = 1 - 1.5 * s2;
  // the series in v that eq. 10's dw_s and e dM_s share: (1 - e^2/4) sin v + e/2 sin 2v + e^2/12 sin 3v
  const inV = (1 - e2 / 4) * sin(v) + (e / 2) * sin(2 * v) + (e2 / 12) * sin(3 * v);

  // eq. 10, da_s
  const da = (A2 / a) * ((2 / 3) * one32 * lead + ar3 * s2 * cos(2 * u));
  // eq. 10, de_s
  const de =
    ((1 - e2) / e) * (A2 / (a * a)) * ((1 / 3) * one32 * lead + 0.5 * ar3 * s2 * cos(2 * u)) -
    (((s2 / (2 * e)) * A2) / (a * p)) * (cos(2 * u) + e * cos(v + 2 * w) + (e / 3) * cos(3 * v + 2 * w));
  // eq. 10, dw_s, multiplied through by e
  const edw =
    k *
    (e * (2 - 2.5 * s2) * centre +
      one32 * inV -
      (0.25 * s2 + (0.5 - (15 / 16) * s2) * e2) * sin(v + 2 * w) +
      (e2 / 16) * s2 * sin(v - 2 * w) -
      (e / 2) * (1 - 2.5 * s2) * sin(2 * u) +
      ((7 / 12) * s2 - (1 / 6) * (1 - (19 / 8) * s2) * e2) * sin(3 * v + 2 * w) +
      (3 / 8) * e * s2 * sin(4 * v + 2 * w) +
      (e2 / 16) * s2 * sin(5 * v + 2 * w));
  // eq. 10, di_s
  const di = 0.25 * k * Math.sin(2 * i) * (cos(2 * u) + e * cos(v + 2 * w) + (e / 3) * cos(3 * v + 2 * w));
  // eq. 10, dOmega_s
  const dnode = -k * Math.cos(i) * (centre - 0.5 * sin(2 * u) - (e / 2) * sin(v + 2 * w) - (e / 6) * sin(3 * v + 2 * w));
  // eq. 10, e dM_s
  const edM =
    k *
    b *
    (-one32 * inV +
      s2 *
        (0.25 * (1 + 1.25 * e2) * sin(v + 2 * w) -
          (e2 / 16) * sin(v - 2 * w) -
          (7 / 12) * (1 - e2 / 28) * sin(3 * v + 2 * w) -
          (3 / 8) * e * sin(4 * v + 2 * w) -
          (e2 / 16) * sin(5 * v + 2 * w)));

  // eq. 12: their averages over M, with eq. 11's cos 2v
  const c2 = cos2vOverE2(e); // (average of cos 2v) / e^2
  const meanDe = k * s2 * ((1 - e2) / 6) * e * c2 * cos(2 * w);
  const meanDw = k * (s2 * (1 / 8 + ((1 - e2) / 6) * c2) + (1 / 6) * c2i * c2 * e2) * sin(2 * w);
  const meanDi = -(1 / 12) * k * Math.sin(2 * i) * c2 * e2 * cos(2 * w);
  const meanDnode = -(1 / 6) * k * Math.cos(i) * c2 * e2 * sin(2 * w);
  const meanDM = -k * b * s2 * (1 / 8 + ((1 + e2 / 2) / 6) * c2) * sin(2 * w);

  const dE = de - meanDe;
  const eDw = edw - e * meanDw;
  return {
    a: da,
    xi: cos(w) * dE - sin(w) * eDw,
    eta: sin(w) * dE + cos(w) * eDw,
    i: di - meanDi,
    node: dnode - meanDnode,
    // the 1/e parts of e dM_s and e dw_s are equal and opposite: what is left is O(e), divided by e here
    lambda: (edM + edw) / e - meanDM - meanDw,
  };
}

/** e, w and M from xi = e cos w, eta = e sin w and lambda = M + w. */
const fromLambda = (xi: number, eta: number, lambda: number): { e: number; argp: number; mean: number } => {
  const e = Math.hypot(xi, eta);
  const argp = e > 0 ? wrap(Math.atan2(eta, xi)) : 0;
  return { e, argp, mean: wrap(lambda - argp) };
};

/** The osculating elements of a mean orbit, as orbit.ts's `Elements` (the true anomaly last). */
export function osculatingOf(m: MeanElements): { a: number; e: number; i: number; node: number; argp: number; nu: number } {
  const e = Math.max(m.e, E_LEAST);
  const d = shortPeriodic(m);
  const kept = fromLambda(e * Math.cos(m.argp) + d.xi, e * Math.sin(m.argp) + d.eta, m.mean + m.argp + d.lambda);
  return {
    a: m.a + d.a,
    e: kept.e,
    i: m.i + d.i,
    node: wrap(m.node + d.node),
    argp: kept.argp,
    nu: trueAnomaly(kept.mean, kept.e),
  };
}

/** The position and velocity of a mean orbit at its mean anomaly, m and m/s, in the frame of date. */
export const stateOfMean = (m: MeanElements): State => stateOf(osculatingOf(m));

/**
 * The mean elements of a position and velocity (in any frame whose +Z is the Earth's pole): the osculating ones less
 * the short-periodic terms, found by iteration, since the terms are worked at the mean elements (mean = osculating -
 * terms(mean), from mean = osculating). It converges by a factor of some J2 a round: to a part in 1e14 in five.
 */
export function meanOf(s: State): MeanElements {
  const el = elementsOf(s.r, s.v);
  const osc = { xi: el.e * Math.cos(el.argp), eta: el.e * Math.sin(el.argp), lambda: meanAnomaly(el.nu, el.e) + el.argp };
  let m: MeanElements = { a: el.a, e: el.e, i: el.i, node: el.node, argp: el.argp, mean: meanAnomaly(el.nu, el.e) };
  for (let k = 0; k < 30; k++) {
    const d = shortPeriodic(m);
    // lambda and the node are angles: their terms are taken off the osculating ones as they stand
    const kept = fromLambda(osc.xi - d.xi, osc.eta - d.eta, osc.lambda - d.lambda);
    const next: MeanElements = { a: el.a - d.a, e: kept.e, i: el.i - d.i, node: wrap(el.node - d.node), argp: kept.argp, mean: kept.mean };
    const moved = Math.abs(next.a - m.a) / m.a + Math.abs(next.i - m.i) + Math.abs(Math.sin((next.mean + next.argp - m.mean - m.argp) / 2));
    m = next;
    if (moved < 1e-15) break;
  }
  return m;
}

/**
 * How a mean orbit moves under J2, rad/s: the mean motion (the rate of M), the argument of perigee's and the node's.
 * Kozai, p. 372: n-bar = n0 (1 + A2/p^2 (1 - 3/2 s2) b), dw/dt = A2/p^2 n-bar (2 - 5/2 s2), dOmega/dt = -A2/p^2
 * n-bar cos i, with n0^2 a0^3 = GM and a0 the mean `a` here. (orbit.ts `secularRates` is the same to first order,
 * with n0 where Kozai has n-bar.)
 */
export function meanRates(a: number, e: number, i: number): { mean: number; argp: number; node: number } {
  const p = a * (1 - e * e);
  const k = A2 / (p * p);
  const s2 = Math.sin(i) ** 2;
  const n = Math.sqrt(GM / (a * a * a)) * (1 + k * (1 - 1.5 * s2) * Math.sqrt(1 - e * e));
  return { mean: n, argp: k * n * (2 - 2.5 * s2), node: -k * n * Math.cos(i) };
}

/**
 * A mean orbit's three periods, s: `nodal` (draconic) from one ascending node to the next, the time a tracking network
 * measures between passes; `anomalistic` from perigee to perigee, 2 pi / n-bar; `kepler` the Kepler period of the mean
 * semi-major axis, 2 pi / n0.
 *
 * The nodal period over a whole turn of the perigee is 2 pi / (n-bar + dw/dt). From one node to the next while the
 * perigee stands at `argp` it is 2 pi / (n-bar + dw/dt (1 - e^2)^(3/2) / (1 + e cos w)^2): the node is passed where v = -w,
 * and as w moves on by dw the satellite has dv = -dw further to go, which takes dM = -dw (dM/dv) there, dM/dv =
 * (1 - e^2)^(3/2) / (1 + e cos v)^2 (Kepler; Kozai's eq. 4 is its inverse). It is first order in J2 and in e: 0.01 s a
 * revolution for Vostok 1, whose perigee hardly moves at 65 degrees; seconds for an orbit as eccentric at 30 degrees.
 * Given `argp`, `nodal` is the node-to-node time; without it, the average.
 */
export function periodsOf(a: number, e: number, i: number, argp?: number): { nodal: number; anomalistic: number; kepler: number } {
  const rates = meanRates(a, e, i);
  const lag = argp === undefined ? 1 : (1 - e * e) ** 1.5 / (1 + e * Math.cos(argp)) ** 2;
  return { nodal: TAU / (rates.mean + rates.argp * lag), anomalistic: TAU / rates.mean, kepler: TAU * Math.sqrt((a * a * a) / GM) };
}

/** Kozai's mean semi-major axis a-bar (p. 372, the one eqs. 13 and 31 place the satellite by) of a mean orbit whose `a` is the average of the osculating one. */
export function kozaiAxis(a: number, e: number, i: number): number {
  const p = a * (1 - e * e);
  return a * (1 - (A2 / (p * p)) * (1 - 1.5 * Math.sin(i) ** 2) * Math.sqrt(1 - e * e));
}

/**
 * What a published period is taken to be: `nodal` (between passes over the equator), `anomalistic` (perigee to
 * perigee), `kepler` (of the mean semi-major axis), or `osculating`: the old reading, in which the heights and the
 * inclination are the osculating orbit's at the instant given and the period is not used (what src/sim did before
 * this module: `fromPublished` and `alongPublished` give its states exactly).
 */
export type PeriodKind = 'nodal' | 'anomalistic' | 'kepler' | 'osculating';

/** A convention no source states, with the confidence of the choice. */
export interface Convention<T> {
  value: T;
  confidence: Confidence;
  source: string;
}

/** The WGS 84 ellipsoid's geocentric radius toward a geocentric latitude (rad), m: 1/R^2 = cos^2/a^2 + sin^2/b^2. */
export function ellipsoidRadius(latitude: number): number {
  const c = Math.cos(latitude) / WGS84_A;
  const s = Math.sin(latitude) / WGS84_B;
  return 1 / Math.sqrt(c * c + s * s);
}

/**
 * The ball a published orbit's heights are over, by the convention (`CONVENTION.radius`): the WGS 84 ellipsoid's
 * geocentric radius under its apsides, m. The perigee stands at geocentric latitude asin(sin i sin w), w the argument of
 * perigee (rad), and the apogee at its opposite, so one radius serves both and the heights' difference is the radii's.
 * A height so measured is along the radius, not the normal: at 200 km and 63 degrees the two differ by under 2 m.
 */
export function apsisRadius(inclination: number, argp: number): number {
  return ellipsoidRadius(Math.asin(Math.sin(inclination) * Math.sin(argp)));
}

/**
 * How far a mean orbit's apsides, a(1 - e) and a(1 + e), stand above the radii the satellite is flown through there, m:
 * J2's short-periodic terms (eq. 10) at the mean perigee and apogee, the two averaged (they differ by tens of metres).
 * At 30 degrees and 160 km some 6 km: the mean orbit's average radius is Kozai's a-bar, under its `a` (`kozaiAxis`).
 */
export function apsisLift(a: number, e: number, i: number, argp: number): number {
  const at = (mean: number): number => {
    const o = osculatingOf({ a, e, i, node: 0, argp, mean });
    return (o.a * (1 - o.e * o.e)) / (1 + o.e * Math.cos(o.nu));
  };
  return (a * (1 - e) - at(0) + a * (1 + e) - at(Math.PI)) / 2;
}

/**
 * The ball a mean orbit's heights stand on, m, when the published heights are of the apsides flown (the least and the
 * greatest radius, as tracking integrated to them) over the ellipsoid under them: the ellipsoid's radius under the apsis
 * (`apsisRadius`) and the apsides' lift (`apsisLift`) of the mean orbit those heights give over it. Every height read off
 * a mean orbit as a(1 -/+ e) less this ball is then, to first order, a flown apsis over the ellipsoid.
 */
export function flownApsisBall(perigee: number, apogee: number, inclination: number, argp: number): number {
  const under = apsisRadius(inclination, argp);
  let ball = under;
  for (let k = 0; k < 4; k++) {
    const a = ball + (perigee + apogee) / 2;
    ball = under + apsisLift(a, (apogee - perigee) / (2 * a), inclination, argp);
  }
  return ball;
}

/**
 * The defaults, each a choice and labelled as one. No source read states how a Soviet orbit of 1961 was reduced
 * (GitHub issue #8, the research of 14 November 2026); the period as nodal is what the evidence points to, and the
 * heights as over the ellipsoid under the apsis is what the sister flights' own heights and periods require.
 */
export const CONVENTION: { kind: Convention<PeriodKind>; radius: Convention<(inclination: number, argp: number) => number> } = {
  kind: {
    value: 'nodal',
    confidence: 'estimated',
    source:
      'no source states it. The published period is read as the time between passes over the equator: TASS’s equator crossings for Vostok 2 ' +
      '(11:48 and 17:42 Moscow time) are 354 min apart, four of the FAI file’s 88.46 min; and NII-4’s ballistics group found the period from ' +
      'tracked passes and the height from the period (Brykov’s memoir of Sputnik 1, RGANTD f. 227, op. 1, d. 6). Issue #8',
  },
  radius: {
    value: apsisRadius,
    confidence: 'assumed',
    source:
      'for a record with heights and no period (Vostok 3): a height over the WGS 84 ellipsoid under its apsis, the perigee where the injection puts it (`apsisRadius`): ' +
      'what the sister flights’ documented heights and periods require. A record with heights and a period is flown on the ball those three imply (src/sim/orbital.ts `heightsBall`), never this. Each orbit published with its own period, the period read as nodal, gives the ball its heights stand on with no free ' +
      'figure (tests/apsis.test.mjs): Vostok 2’s FAI orbit 6,361.1 km and TASS’s 6,364.0; Vostok 3’s as announced and TASS’s of 12 August ' +
      '6,359.5 each; Vostok 4’s TASS orbit 6,360.3; Vostok 5’s as asked for 6,363.6; Vostok 6’s three 6,358.6 to 6,360.7; Voskhod 1’s TASS orbit 6,362.1 against 6,363.1 under its own injection at 57 degrees N; each within its ' +
      'rounding of the ellipsoid’s 6,361.1 km under the perigee every Vostok’s record injects at (63.05 degrees N, geocentric). Vostok 1’s two ' +
      '(6,369.1 and 6,367.7) and Vostok 5’s three after liftoff (6,365.6 to 6,366.6) do not fit, and the test says so. A Soviet orbit ' +
      'catalogue of 1964 gives its heights over a biaxial ellipsoid (Cosmos 49: Dolginov, Nalivayko et al., IZMIRAN 1967, translated as ' +
      'NASA CR-99055, p. 5), which supports the reading and is not this unit’s. The Earth’s mean radius, 6,371 km, was the reading until ' +
      'November 2026',
  },
};

/** An orbit as published: heights of perigee and apogee (m), inclination (rad), and the period (s) if there is one. */
export interface PublishedOrbit {
  perigee: number;
  apogee: number;
  inclination: number;
  period?: number;
  /** What the period is (CONVENTION.kind if not given). */
  kind?: PeriodKind;
  /**
   * The ball the heights are over, m: used for the axis only where no period is given, or `osculating`. Not given, the
   * convention's (`CONVENTION.radius`, the ellipsoid under the apsis), which needs the perigee's `argp` (`meanOrbitOf`).
   */
  radius?: number;
}

/** The mean orbit a published one is taken to be, and how. */
export interface MeanOrbit {
  /** Mean semi-major axis (the average of the osculating one), m; eccentricity; inclination, rad. */
  a: number;
  e: number;
  i: number;
  kind: PeriodKind;
  /** The ball the published heights are over, if the period is right: a less the mean height, m. */
  radius: number;
  /** The three periods of the mean orbit, s (for `osculating`, of the mean orbit those elements would have at perigee). */
  periods: { nodal: number; anomalistic: number; kepler: number };
  confidence: Confidence;
  method: string;
}

/**
 * The mean orbit of a published one. With a period (and a kind not `osculating`): the mean semi-major axis whose
 * period of that kind is the published one (Kozai's rates, solved by iteration on a: the period goes as a^(3/2)),
 * the eccentricity from the heights' difference over twice that axis (the difference does not depend on the ball the
 * heights are over), and the inclination as published. The heights' sum is then not used: where it and the period
 * disagree the period stands, and `radius` reports the ball the heights would have to be over. With no period, the
 * axis is the radius plus the mean height. `argp`, where the perigee stands, makes a nodal period the node-to-node time
 * then (`periodsOf`) rather than the average over a turn of the perigee.
 */
export function meanOrbitOf(o: PublishedOrbit, argp?: number): MeanOrbit {
  const kind = o.kind ?? CONVENTION.kind.value;
  const i = o.inclination;
  const R = o.radius ?? (argp === undefined ? Number.NaN : CONVENTION.radius.value(i, argp));
  const height = (o.perigee + o.apogee) / 2;
  const span = (o.apogee - o.perigee) / 2;
  if (kind === 'osculating' || o.period === undefined) {
    if (Number.isNaN(R)) throw new Error('a published orbit with no period needs the ball its heights are over, or where its perigee is');
    const a = R + height;
    const e = (o.apogee - o.perigee) / (2 * a); // as src/sim has always worked it, to the last bit
    return {
      a,
      e,
      i,
      kind,
      radius: R,
      periods: periodsOf(a, e, i, argp),
      confidence: 'derived',
      method:
        kind === 'osculating'
          ? 'the published heights over the ball of radius given and the inclination, as the osculating orbit at the instant given: the period not used'
          : 'no period published: the semi-major axis is the ball’s radius (the ellipsoid’s under the apsis unless given) plus the mean height, taken as the mean (Brouwer’s) axis; e from the heights’ difference',
    };
  }
  const T = o.period;
  let a = axisOfPeriod(T, GM);
  for (let k = 0; k < 50; k++) {
    const got = periodsOf(a, span / a, i, argp)[kind];
    const next = a * (T / got) ** (2 / 3);
    const moved = Math.abs(next - a);
    a = next;
    if (moved < 1e-7) break;
  }
  const e = span / a;
  return {
    a,
    e,
    i,
    kind,
    radius: a - height,
    periods: periodsOf(a, e, i, argp),
    confidence: 'derived',
    method:
      `Kozai’s first-order J2 theory (AJ 64, 367, 1959): the mean semi-major axis whose ${kind} period is the published period; ` +
      'e from the heights’ difference over twice it; the inclination as published, taken as the mean one; short-periodic terms (eqs. 10 and 12) added at the place',
  };
}

/** Where on a mean orbit: its node and argument of latitude (rad, in the frame of date), and the true anomaly there (rad, 0 at perigee). */
export interface OnOrbit {
  node: number;
  latitude: number;
  anomaly: number;
}

/**
 * The osculating state, in the frame of date, of a published orbit read as mean elements, at a place on it: the
 * mean orbit (`meanOrbitOf`) at `at`'s node, argument of latitude and true anomaly (so the mean perigee is at
 * latitude - anomaly), with the short-periodic terms added there. The place is the mean orbit's: the satellite is
 * where the terms put it, within a few kilometres. For `osculating` the state is exactly orbit.ts `stateOf` of the
 * published elements at the place (what src/sim/orbital.ts `injectionState` has always given).
 */
export function fromPublished(o: PublishedOrbit, at: OnOrbit): { state: State; mean: MeanElements; orbit: MeanOrbit } {
  const argp = at.latitude - at.anomaly;
  const orbit = meanOrbitOf(o, argp);
  const mean: MeanElements = { a: orbit.a, e: orbit.e, i: orbit.i, node: at.node, argp, mean: meanAnomaly(at.anomaly, orbit.e) };
  if (orbit.kind === 'osculating')
    return { state: stateOf({ a: orbit.a, e: orbit.e, i: orbit.i, node: at.node, argp, nu: at.anomaly }), mean, orbit };
  return { state: stateOfMean(mean), mean, orbit };
}

/**
 * A spacecraft left at `r` going along `v` (any frame whose +Z is the pole, m and m/s), given the speed at which it
 * is on the published orbit: the speed whose mean orbit has the published period of its kind (by the secant method
 * on the speed, `meanOf` at each try), or, with no period, whose mean semi-major axis is the radius plus the mean
 * height. Its place and direction are kept, so its eccentricity and perigee are what they give, not the heights'.
 * For `osculating`, vis-viva on the published axis (what src/sim/staged.ts `published` has always given).
 */
export function alongPublished(o: PublishedOrbit, r: Vec3, v: Vec3): { state: State; mean: MeanElements; orbit: MeanOrbit } {
  const orbit = meanOrbitOf(o);
  const way = unit(v);
  const d = length(r);
  const kepler = (a: number): number => Math.sqrt(GM * (2 / d - 1 / a));
  if (orbit.kind === 'osculating') {
    const state = { r, v: scale(way, kepler(orbit.a)) };
    return { state, mean: meanOf(state), orbit };
  }
  const kind = orbit.kind;
  const T = o.period;
  // what is to be zero: the period's miss, s, or the axis's, m
  const miss = (speed: number): number => {
    const m = meanOf({ r, v: scale(way, speed) });
    return T === undefined ? m.a - orbit.a : periodsOf(m.a, m.e, m.i, m.argp)[kind] - T;
  };
  let s0 = kepler(orbit.a);
  let s1 = s0 + 1;
  let f0 = miss(s0);
  let f1 = miss(s1);
  for (let k = 0; k < 30 && f1 !== 0 && f1 !== f0; k++) {
    const s2 = s1 - (f1 * (s1 - s0)) / (f1 - f0);
    [s0, f0] = [s1, f1];
    s1 = s2;
    f1 = miss(s1);
    if (Math.abs(s1 - s0) < 1e-9) break;
  }
  const state = { r, v: scale(way, s1) };
  const mean = meanOf(state);
  return { state, mean, orbit: meanOrbitOf(o, mean.argp) };
}

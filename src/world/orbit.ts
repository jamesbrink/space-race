/**
 * Orbits round the Earth: an orbit said as six elements and as a position and velocity, carried
 * forward under the Earth's gravity with its oblateness, laid on the turning Earth as a ground
 * track, and in or out of the Earth's shadow. Pure, in doubles; tests/orbit.test.mjs holds it to
 * Vallado's worked examples (Fundamentals of Astrodynamics and Applications) and to published
 * orbits.
 *
 * Everything is in frames.ts's inertial frame (of date: +Z the Earth's pole, +X the equinox), in
 * metres, seconds and radians. The Earth-fixed frame is that one turned about +Z by the sidereal
 * time, so the hand-over between a place on the ground and an orbit is one rotation and the
 * velocity the turning adds (`siteToInertial`, `inertialToSite`).
 *
 * What is in the gravity: the point mass and J2. What is left out, and what it is worth over one
 * low orbit: the higher zonal and tesseral harmonics (J3 and the rest: some hundreds of metres),
 * the Moon and the Sun (metres), the pressure of sunlight (less), and the air, which is not
 * gravity and belongs to whoever is flying (src/sim). J2 itself moves a low orbit's node by a
 * third of a degree a revolution and its height by up to twenty kilometres round one, so it is
 * not optional.
 *
 * The elements here are osculating: the Kepler orbit that fits the position and velocity at one
 * instant. Under J2 they wobble round each revolution (the semi-major axis by some ten kilometres
 * in a low orbit); `secularRates` gives the steady drift of the mean ones.
 */
import { EARTH, EARTH_ROTATION_RATE, SUN, WGS84_A } from './bodies.ts';
import {
  add,
  cross,
  dot,
  ecefToGeodetic,
  ecefToInertial,
  ecefToInertialVelocity,
  ecefToSite,
  ecefToSiteDirection,
  type Geodetic,
  inertialToEcef,
  inertialToEcefVelocity,
  length,
  type Site,
  scale,
  siteToEcef,
  siteToEcefDirection,
  sub,
  unit,
  type Vec3,
} from './frames.ts';

/** The Earth's oblateness: the second zonal harmonic of WGS 84's gravity model (EGM96's C20, unnormalised). The simulator's is the same figure (sim/fly.ts). */
export const EARTH_J2 = 1.082_629_989e-3;
const GM = EARTH.gm.value;
const TAU = 2 * Math.PI;
const wrap = (angle: number): number => ((angle % TAU) + TAU) % TAU;

/** A position and velocity, m and m/s. */
export interface State {
  r: Vec3;
  v: Vec3;
}

/**
 * The classical elements. `a` is the semi-major axis, m (negative on a hyperbola); `e` the
 * eccentricity; `i` the inclination to the equator; `node` the right ascension of the ascending
 * node; `argp` the argument of perigee, from the node; `nu` the true anomaly, from perigee.
 * Where one is not defined it is given as nothing and the next carries its meaning: on an
 * equatorial orbit `node` is 0 and `argp` is measured from +X; on a circular one `argp` is 0 and
 * `nu` is measured from the node (the argument of latitude).
 */
export interface Elements {
  a: number;
  e: number;
  i: number;
  node: number;
  argp: number;
  nu: number;
}

/** The elements of the orbit through a position with a velocity (Vallado, algorithm 9: RV2COE). */
export function elementsOf(r: Vec3, v: Vec3, gm = GM): Elements {
  const d = length(r);
  const speed2 = dot(v, v);
  const h = cross(r, v);
  const n: Vec3 = [-h[1], h[0], 0]; // toward the ascending node
  const ev = scale(sub(scale(r, speed2 - gm / d), scale(v, dot(r, v))), 1 / gm);
  const e = length(ev);
  const energy = speed2 / 2 - gm / d;
  const a = -gm / (2 * energy);
  const i = Math.acos(Math.max(-1, Math.min(1, h[2] / length(h))));
  const TINY = 1e-11;
  const equatorial = length(n) < TINY * length(h);
  const circular = e < TINY;
  const between = (p: Vec3, q: Vec3): number => Math.acos(Math.max(-1, Math.min(1, dot(p, q) / (length(p) * length(q)))));
  const node = equatorial ? 0 : wrap(Math.atan2(n[1], n[0]));
  // the line angles are measured from: the node, or +X where there is none
  const line: Vec3 = equatorial ? [1, 0, 0] : n;
  /** The angle from `line` round to `p` in the direction of motion. */
  const round = (p: Vec3): number => {
    const angle = between(line, p);
    return dot(cross(line, p), h) < 0 ? TAU - angle : angle;
  };
  if (circular) return { a, e: 0, i, node, argp: 0, nu: round(r) };
  const argp = round(ev);
  let nu = between(ev, r);
  if (dot(r, v) < 0) nu = TAU - nu;
  return { a, e, i, node, argp, nu };
}

/** The position and velocity at an orbit's elements (Vallado, algorithm 10: COE2RV). */
export function stateOf(el: Elements, gm = GM): State {
  const p = el.a * (1 - el.e * el.e);
  const [cn, sn] = [Math.cos(el.nu), Math.sin(el.nu)];
  const d = p / (1 + el.e * cn);
  const k = Math.sqrt(gm / p);
  // in the orbit's own plane: +x to perigee, +y a quarter turn on in the direction of motion
  const rp: Vec3 = [d * cn, d * sn, 0];
  const vp: Vec3 = [-k * sn, k * (el.e + cn), 0];
  const [cO, sO, cw, sw, ci, si] = [
    Math.cos(el.node),
    Math.sin(el.node),
    Math.cos(el.argp),
    Math.sin(el.argp),
    Math.cos(el.i),
    Math.sin(el.i),
  ];
  const turn = (q: Vec3): Vec3 => [
    (cO * cw - sO * sw * ci) * q[0] + (-cO * sw - sO * cw * ci) * q[1],
    (sO * cw + cO * sw * ci) * q[0] + (-sO * sw + cO * cw * ci) * q[1],
    sw * si * q[0] + cw * si * q[1],
  ];
  return { r: turn(rp), v: turn(vp) };
}

/** The time once round a Kepler orbit of semi-major axis `a`, s. */
export const period = (a: number, gm = GM): number => TAU * Math.sqrt((a * a * a) / gm);
/** The semi-major axis of the Kepler orbit that takes `seconds` to go round, m. */
export const axisOfPeriod = (seconds: number, gm = GM): number => Math.cbrt(gm * (seconds / TAU) ** 2);

/** Kepler's equation, M = E - e sin E, solved for the eccentric anomaly by Newton's method (Vallado, algorithm 2). */
export function eccentricAnomaly(mean: number, e: number): number {
  const M = wrap(mean);
  let E = M > Math.PI ? M - e : M + e;
  for (let k = 0; k < 50; k++) {
    const step = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= step;
    if (Math.abs(step) < 1e-14) break;
  }
  return E;
}

/** The true anomaly at a mean anomaly, and back, on an ellipse. */
export function trueAnomaly(mean: number, e: number): number {
  const E = eccentricAnomaly(mean, e);
  return wrap(2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2)));
}
export function meanAnomaly(nu: number, e: number): number {
  const E = 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu / 2), Math.sqrt(1 + e) * Math.cos(nu / 2));
  return wrap(E - e * Math.sin(E));
}

/**
 * How J2 moves an orbit steadily, rad/s: its node, its perigee and its mean anomaly (the mean
 * motion as the oblateness alters it). First order in J2 (Vallado, section 9.6.1). The node of a
 * prograde orbit goes west; the perigee stands still at 63.43 degrees.
 */
export function secularRates(
  a: number,
  e: number,
  i: number,
  gm = GM,
  j2 = EARTH_J2,
  radius = WGS84_A,
): { node: number; argp: number; mean: number } {
  const n = Math.sqrt(gm / (a * a * a));
  const p = a * (1 - e * e);
  const k = n * j2 * (radius / p) ** 2;
  const s2 = Math.sin(i) ** 2;
  return {
    node: -1.5 * k * Math.cos(i),
    argp: 0.75 * k * (4 - 5 * s2),
    mean: n + 0.75 * k * Math.sqrt(1 - e * e) * (2 - 3 * s2),
  };
}

/** From one ascending node to the next, s: what a ground track repeats by. */
export function nodalPeriod(a: number, e: number, i: number): number {
  const rates = secularRates(a, e, i);
  return TAU / (rates.mean + rates.argp);
}

/** Mean elements carried forward by J2's steady rates alone: where the orbit's plane and perigee have drifted to. Not a position to fly by. */
export function drift(el: Elements, seconds: number): Elements {
  const rates = secularRates(el.a, el.e, el.i);
  return {
    ...el,
    node: wrap(el.node + rates.node * seconds),
    argp: wrap(el.argp + rates.argp * seconds),
    nu: trueAnomaly(meanAnomaly(el.nu, el.e) + rates.mean * seconds, el.e),
  };
}

/** The Earth's gravity at a position, m/s^2: point mass and J2. `j2` 0 for the point mass alone. */
export function gravity(r: Vec3, j2 = EARTH_J2): Vec3 {
  const d = length(r);
  const k = (1.5 * j2 * WGS84_A * WGS84_A) / (d * d);
  const z2 = (5 * r[2] * r[2]) / (d * d);
  const g = -GM / (d * d * d);
  return [g * r[0] * (1 + k * (1 - z2)), g * r[1] * (1 + k * (1 - z2)), g * r[2] * (1 + k * (3 - z2))];
}

/** Energy per kilogram under that gravity, J/kg: kinetic, the point mass's potential and J2's. A coast keeps it, and so it measures an integrator. */
export function energy(s: State, j2 = EARTH_J2): number {
  const d = length(s.r);
  const sinLat = s.r[2] / d;
  const potential = (-GM / d) * (1 - j2 * (WGS84_A / d) ** 2 * (1.5 * sinLat * sinLat - 0.5));
  return dot(s.v, s.v) / 2 + potential;
}

/**
 * One step of fourth-order Runge-Kutta for a body pushed by `push` (m/s^2, everything but
 * gravity: nothing, on a coast) at `t`.
 */
export function step(s: State, t: number, h: number, push?: (s: State, t: number) => Vec3, j2 = EARTH_J2): State {
  const rate = (q: State, at: number): State => ({ r: q.v, v: push ? add(gravity(q.r, j2), push(q, at)) : gravity(q.r, j2) });
  const nudge = (q: State, d: State, by: number): State => ({ r: add(q.r, scale(d.r, by)), v: add(q.v, scale(d.v, by)) });
  const k1 = rate(s, t);
  const k2 = rate(nudge(s, k1, h / 2), t + h / 2);
  const k3 = rate(nudge(s, k2, h / 2), t + h / 2);
  const k4 = rate(nudge(s, k3, h), t + h);
  return {
    r: add(s.r, scale(add(add(k1.r, scale(k2.r, 2)), add(scale(k3.r, 2), k4.r)), h / 6)),
    v: add(s.v, scale(add(add(k1.v, scale(k2.v, 2)), add(scale(k3.v, 2), k4.v)), h / 6)),
  };
}

/**
 * A coast: a state carried `seconds` on under gravity alone in whole steps of at most `most`
 * seconds, all the same length. At 10 s a low orbit's energy holds to a part in ten thousand
 * million over two hours (tests/orbit.test.mjs states the bounds for 1, 10, 30 and 60 s).
 */
export function coast(s: State, seconds: number, most = 10, j2 = EARTH_J2): State {
  const steps = Math.max(1, Math.ceil(Math.abs(seconds) / most - 1e-9));
  const h = seconds / steps;
  for (let k = 0; k < steps; k++) s = step(s, 0, h, undefined, j2);
  return s;
}

/** The Earth's turning since an instant when the sidereal time was `gast0`, rad: the angle frames.ts turns the Earth by, `seconds` later. */
export const siderealAt = (gast0: number, seconds: number): number => gast0 + EARTH_ROTATION_RATE * seconds;

/** The place under a position in the inertial frame, when the sidereal time is `gast`: degrees north and east, and height above the ellipsoid, m. */
export const subpoint = (r: Vec3, gast: number): Geodetic => ecefToGeodetic(inertialToEcef(r, gast));

/** A position and velocity in a site's own frame (which turns with the Earth) as a state in the inertial frame, and back. */
export function siteToInertial(site: Site, p: Vec3, v: Vec3, gast: number): State {
  const fixed = siteToEcef(site, p);
  return { r: ecefToInertial(fixed, gast), v: ecefToInertialVelocity(fixed, siteToEcefDirection(site, v), gast) };
}
export function inertialToSite(site: Site, s: State, gast: number): { p: Vec3; v: Vec3 } {
  const fixed = inertialToEcef(s.r, gast);
  return { p: ecefToSite(site, fixed), v: ecefToSiteDirection(site, inertialToEcefVelocity(s.r, s.v, gast)) };
}

/**
 * The plane of an orbit of inclination `i` that passes over a place (given as its position in the
 * inertial frame at that instant), as the unit vector the orbit turns about. Two such planes pass
 * over any place below the inclination's latitude: `northbound` picks the one crossed going north.
 * Null where the place is nearer the pole than the orbit reaches.
 */
export function planeThrough(place: Vec3, i: number, northbound = true): Vec3 | null {
  const up = unit(place);
  // n = cos i z + the rest in the equator's plane, square to the place: n . up = 0
  const [ci, si] = [Math.cos(i), Math.sin(i)];
  const flat = Math.hypot(up[0], up[1]);
  if (flat < 1e-12) return null;
  // n = (si cos L, si sin L, ci); n . up = 0  ->  cos(L - lon) = -ci up_z / (si flat)
  const c = (-ci * up[2]) / (si * flat);
  if (Math.abs(c) > 1) return null;
  const lon = Math.atan2(up[1], up[0]);
  for (const sign of [1, -1]) {
    const L = lon + sign * Math.acos(c);
    const n: Vec3 = [si * Math.cos(L), si * Math.sin(L), ci];
    if (cross(n, up)[2] > 0 === northbound) return n;
  }
  return null;
}

/** The Sun's radius, m. */
const SUN_RADIUS = SUN.equatorialRadius.value;

/**
 * How much of the Sun's disc a place sees past the Earth: 1 in sunlight, 0 in the umbra, between
 * in the penumbra (the two discs overlapping: Montenbruck and Gill, Satellite Orbits, 3.4.2).
 * `r` and `sun` are from the Earth's centre. The Earth is taken as a ball of its equatorial
 * radius with no air: its flattening moves a shadow crossing by a few seconds, and the air's
 * bending of light puts real sunset a little later than this.
 */
export function sunlit(r: Vec3, sun: Vec3, radius = WGS84_A): number {
  const toSun = sub(sun, r);
  const a = Math.asin(SUN_RADIUS / length(toSun)); // the Sun's apparent radius
  const b = Math.asin(Math.min(1, radius / length(r))); // the Earth's
  const c = Math.acos(Math.max(-1, Math.min(1, -dot(toSun, r) / (length(toSun) * length(r))))); // between their centres
  if (c >= a + b) return 1;
  if (c <= b - a) return 0;
  if (c <= a - b) return 1 - (b * b) / (a * a);
  const x = (c * c + a * a - b * b) / (2 * c);
  const y = Math.sqrt(Math.max(0, a * a - x * x));
  const hidden = a * a * Math.acos(x / a) + b * b * Math.acos((c - x) / b) - c * y;
  return 1 - hidden / (Math.PI * a * a);
}

/**
 * The instants at which something crosses a level: `f` is sampled every `every` seconds from
 * `from` to `to` and each crossing of `level` found by halving to a hundredth of a second.
 * `rising` says which way f was going. For shadow entry and exit (f the sunlit fraction, level a half).
 */
export function crossings(
  f: (t: number) => number,
  from: number,
  to: number,
  every: number,
  level = 0.5,
): { t: number; rising: boolean }[] {
  const out: { t: number; rising: boolean }[] = [];
  let t0 = from;
  let f0 = f(t0) - level;
  while (t0 < to) {
    const t1 = Math.min(to, t0 + every);
    const f1 = f(t1) - level;
    if (f0 < 0 !== f1 < 0) {
      let [lo, hi, flo] = [t0, t1, f0];
      while (hi - lo > 0.01) {
        const mid = (lo + hi) / 2;
        const fm = f(mid) - level;
        if (fm < 0 === flo < 0) [lo, flo] = [mid, fm];
        else hi = mid;
      }
      out.push({ t: (lo + hi) / 2, rising: f1 > f0 });
    }
    [t0, f0] = [t1, f1];
  }
  return out;
}

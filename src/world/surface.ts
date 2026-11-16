/**
 * The Earth's surface as a shape: the sea, and how far it can be seen. Pure doubles, ECEF and
 * metres (frames.ts states the conventions). Every function is on WGS 84 unless it is handed
 * another body's figure (bodies.ts `figureOf`: the Moon's sphere of 1737.4 km, Mars's ellipsoid).
 *
 * The sea is drawn as the WGS 84 ellipsoid raised along its normal by one height, the mean sea
 * level a site records (`SiteDef.seaLevel`: the geoid's height there, -29 m at the Cape). The real
 * geoid departs from that by up to a hundred metres across the globe and by a metre or so within a
 * few hundred kilometres of the site: invisible from orbit, and exact at the site, where the
 * simulator (sim/fly.ts) measures heights from the same figure.
 */
import { type Figure, WGS84_FIGURE } from './bodies.ts';
import { add, scale, unit, type Vec3 } from './frames.ts';

/** The ellipsoid's outward normal at a point on (or near) it: the Earth's unless another body's figure is given (bodies.ts `figureOf`). */
export const ellipsoidNormal = (p: Vec3, figure: Figure = WGS84_FIGURE): Vec3 => {
  const [A2, B2] = [figure.a * figure.a, figure.b * figure.b];
  return unit([p[0] / A2, p[1] / A2, p[2] / B2]);
};

/**
 * The point of the sea's surface toward a direction from the Earth's centre (any length): on the
 * ellipsoid along that direction, then raised by `seaLevel` metres along the normal there. Its
 * height above the ellipsoid is `seaLevel` exactly; its direction from the centre differs from
 * `dir` by the raise's lean, under a millionth of a degree.
 */
export function seaPoint(dir: Vec3, seaLevel: number, figure: Figure = WGS84_FIGURE): Vec3 {
  const [A2, B2] = [figure.a * figure.a, figure.b * figure.b];
  const u = unit(dir);
  const r = 1 / Math.sqrt((u[0] * u[0] + u[1] * u[1]) / A2 + (u[2] * u[2]) / B2);
  const p = scale(u, r);
  return add(p, scale(ellipsoidNormal(p, figure), seaLevel));
}

/**
 * The radius of the sphere that best fits the ellipsoid round a latitude (degrees): the geometric
 * mean of its two principal radii of curvature, meridional M and prime vertical N (the Gaussian
 * radius). Within a few hundred kilometres the sea departs from that sphere by centimetres.
 */
export function gaussianRadius(latitude: number, figure: Figure = WGS84_FIGURE): number {
  const { meridian: M, primeVertical: N } = curvatureRadii(latitude, figure);
  return Math.sqrt(M * N);
}

/** The principal radii of curvature at a latitude (degrees): meridional and prime vertical, metres. */
export function curvatureRadii(latitude: number, figure: Figure = WGS84_FIGURE): { meridian: number; primeVertical: number } {
  const { a } = figure;
  const e2 = 1 - (figure.b * figure.b) / (a * a);
  const s = Math.sin((latitude * Math.PI) / 180);
  const w = 1 - e2 * s * s;
  return { meridian: (a * (1 - e2)) / w ** 1.5, primeVertical: a / Math.sqrt(w) };
}

/** How far the surface of a sphere of `radius` lies below a level plane touching it, `distance` metres away over the surface. */
export const drop = (distance: number, radius: number): number => radius * (1 - Math.cos(distance / radius));

/** The straight-line distance to the horizon from `height` metres above a sphere of `radius`: the tangent's length. */
export const horizonDistance = (height: number, radius: number): number =>
  Math.sqrt(Math.max(0, height) * (2 * radius + Math.max(0, height)));

/** The angle at the Earth's centre between the point under the eye and its horizon, radians. */
export const horizonAngle = (height: number, radius: number): number => Math.acos(radius / (radius + Math.max(0, height)));

/**
 * A piece of the Earth's surface laid flat, for a map finer than the globe's: the gnomonic
 * projection of directions from the Earth's centre (ECEF, frames.ts) onto the plane touching the
 * unit sphere at a chosen middle. Pure doubles. tools/globe-region.mjs bakes a site's coast onto
 * such planes and viewer/globe.ts looks it up the same way, so the two need only agree on this.
 *
 * A point of the plane is (x, y): along the middle's east and north, in units of the sphere's
 * radius (x = tan of the angle eastward from the middle, as seen from the centre). Great circles
 * are straight lines on it. A distance on the ground of s metres near the middle is s / R on the
 * plane; at an angle c from the middle the plane stretches it by 1 / cos^2 c outward and 1 / cos c
 * across: 1.005 and 1.0025 at 450 km, so for a region a few hundred kilometres across the plane is
 * as good as a map drawn to scale.
 */
import { cross, dot, geodeticToEcef, unit, type Vec3 } from './frames.ts';

/** The plane touching the sphere at a middle: its axes in ECEF. */
export interface Plane {
  /** Toward the middle from the Earth's centre: the plane's normal. */
  centre: Vec3;
  east: Vec3;
  north: Vec3;
}

/** The direction from the Earth's centre to a place on the WGS 84 ellipsoid (degrees, as published). The globe's maps are all looked up by it. */
export const surfaceDirection = (latitude: number, longitude: number): Vec3 => unit(geodeticToEcef({ latitude, longitude, height: 0 }));

/** The plane touching the sphere toward a place. East is the turn about the Earth's axis; north completes the frame. */
export function planeAt(latitude: number, longitude: number): Plane {
  const centre = surfaceDirection(latitude, longitude);
  const east = unit(cross([0, 0, 1], centre));
  return { centre, east, north: cross(centre, east) };
}

/** Where a direction from the centre meets the plane, as (x, y); null for one at or past a right angle from the middle, which never meets it. */
export function toPlane(plane: Plane, d: Vec3): [number, number] | null {
  const z = dot(d, plane.centre);
  if (z <= 1e-9) return null;
  return [dot(d, plane.east) / z, dot(d, plane.north) / z];
}

/** The direction from the centre through a point of the plane: the inverse of toPlane. */
export function fromPlane(plane: Plane, x: number, y: number): Vec3 {
  const { centre: c, east: e, north: n } = plane;
  return unit([c[0] + x * e[0] + y * n[0], c[1] + x * e[1] + y * n[1], c[2] + x * e[2] + y * n[2]]);
}

/** A place as a point of the plane: toPlane of its surface direction. */
export const placeOnPlane = (plane: Plane, latitude: number, longitude: number): [number, number] | null =>
  toPlane(plane, surfaceDirection(latitude, longitude));

/** The angle at the Earth's centre between the middle and a point of the plane, radians: the plane's distance from the middle is its tangent. */
export const angleFromMiddle = (x: number, y: number): number => Math.atan(Math.hypot(x, y));

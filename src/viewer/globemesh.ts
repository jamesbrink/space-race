/**
 * The globe's mesh as numbers (globe.ts draws it): where its vertices are, and how far the eye
 * may go before it is worth making again. Pure doubles, no three.js, so both can be tested
 * (tests/globemesh.test.mjs).
 */
import { WGS84_A, WGS84_B } from '../world/bodies.ts';
import type { Vec3 } from '../world/frames.ts';
import { horizonAngle } from '../world/surface.ts';

/** Rings and spokes of the mesh. */
export const SPOKES = 192;
export const RINGS = 150;

const A2 = WGS84_A * WGS84_A;
const B2 = WGS84_B * WGS84_B;

/** Round the spokes: the same for every making. */
const COS = Float64Array.from({ length: SPOKES + 1 }, (_, j) => Math.cos((2 * Math.PI * j) / SPOKES));
const SIN = Float64Array.from({ length: SPOKES + 1 }, (_, j) => Math.sin((2 * Math.PI * j) / SPOKES));

/** How far over the surface the mesh made for an eye `height` up reaches, as an angle at the Earth's centre: past the horizon of an eye a third higher, so a climb does not show the edge before the next making. */
export const meshReach = (height: number, radius: number): number => Math.min(1.5, horizonAngle(1.35 * height, radius) * 1.05 + 1e-4);

/**
 * Fill the mesh's vertices round the point of the sea `under` the eye (ECEF), which is `height`
 * above it: rings at distances height sinh(k i) over the surface, SPOKES round. `positions` are
 * in the site's frame (`origin` and `axes` in ECEF) relative to the point under the eye, which
 * is returned in that frame; `normals` the sea's, in the site's frame; `earth` the direction of
 * each vertex from the Earth's centre. Each is three numbers a vertex, ring by ring.
 *
 * The arithmetic is world/surface.ts's `seaPoint` and `ellipsoidNormal` and frames.ts's vectors,
 * written out so that 29,143 vertices make no garbage; the test holds it to them.
 */
export function fillGlobe(
  under: Vec3,
  height: number,
  radius: number,
  seaLevel: number,
  origin: Vec3,
  axes: readonly [Vec3, Vec3, Vec3],
  positions: Float32Array,
  normals: Float32Array,
  earth: Float32Array,
): Vec3 {
  const [ox, oy, oz] = origin;
  const [[xx, xy, xz], [yx, yy, yz], [zx, zy, zz]] = axes;
  const l0 = 1 / Math.hypot(under[0], under[1], under[2]);
  const ux = under[0] * l0,
    uy = under[1] * l0,
    uz = under[2] * l0;
  const span = meshReach(height, radius) * radius;
  const k = Math.asinh(span / height) / RINGS;
  // two directions along the surface at the point under the eye: east ((0, 0, 1) x u, or +X at a pole) and north (u x east)
  let east0 = -uy,
    east1 = ux,
    east2 = 0;
  const flat = Math.hypot(east0, east1, east2);
  if (flat > 1e-6) {
    const l = 1 / flat;
    east0 *= l;
    east1 *= l;
    east2 *= l;
  } else {
    east0 = 1;
    east1 = 0;
    east2 = 0;
  }
  const north0 = uy * east2 - uz * east1,
    north1 = uz * east0 - ux * east2,
    north2 = ux * east1 - uy * east0;
  const dx = under[0] - ox,
    dy = under[1] - oy,
    dz = under[2] - oz;
  const anchor: Vec3 = [xx * dx + xy * dy + xz * dz, yx * dx + yy * dy + yz * dz, zx * dx + zy * dy + zz * dz];
  let v = 0;
  for (let i = 0; i <= RINGS; i++) {
    const theta = (height * Math.sinh(k * i)) / radius;
    const ct = Math.cos(theta),
      st = Math.sin(theta);
    for (let j = 0; j <= SPOKES; j++, v += 3) {
      const a = COS[j]! * st,
        b = SIN[j]! * st;
      // the direction from the Earth's centre
      const d0 = ux * ct + east0 * a + north0 * b,
        d1 = uy * ct + east1 * a + north1 * b,
        d2 = uz * ct + east2 * a + north2 * b;
      // the sea along it (seaPoint): on the ellipsoid, then raised along the normal there
      const l = 1 / Math.hypot(d0, d1, d2);
      const e0 = d0 * l,
        e1 = d1 * l,
        e2 = d2 * l;
      const r = 1 / Math.sqrt((e0 * e0 + e1 * e1) / A2 + (e2 * e2) / B2);
      let p0 = e0 * r,
        p1 = e1 * r,
        p2 = e2 * r;
      let n0 = p0 / A2,
        n1 = p1 / A2,
        n2 = p2 / B2;
      let m = 1 / Math.hypot(n0, n1, n2);
      p0 += n0 * m * seaLevel;
      p1 += n1 * m * seaLevel;
      p2 += n2 * m * seaLevel;
      // in the site's frame, from the point under the eye
      const q0 = p0 - ox,
        q1 = p1 - oy,
        q2 = p2 - oz;
      positions[v] = xx * q0 + xy * q1 + xz * q2 - anchor[0];
      positions[v + 1] = yx * q0 + yy * q1 + yz * q2 - anchor[1];
      positions[v + 2] = zx * q0 + zy * q1 + zz * q2 - anchor[2];
      // the sea's normal there
      n0 = p0 / A2;
      n1 = p1 / A2;
      n2 = p2 / B2;
      m = 1 / Math.hypot(n0, n1, n2);
      n0 *= m;
      n1 *= m;
      n2 *= m;
      normals[v] = xx * n0 + xy * n1 + xz * n2;
      normals[v + 1] = yx * n0 + yy * n1 + yz * n2;
      normals[v + 2] = zx * n0 + zy * n1 + zz * n2;
      earth[v] = d0;
      earth[v + 1] = d1;
      earth[v + 2] = d2;
    }
  }
  return anchor;
}

/**
 * How far the eye may go over the surface from where the mesh was made before it is made again,
 * metres. `madeHeight`: the eye's height the mesh was made for; `inside`: how far the eye is
 * inside the hole the site's own ground fills (the distance to its nearest edge; 0 outside it
 * or with no hole); `radius`: the sphere's.
 *
 * In the open, a tenth of the height: the rings are spaced to look the same size from the eye,
 * and stay so to a tenth. Over the hole, nothing of the globe nearer than `inside` is drawn, so
 * what counts is the same tenth of the nearest part that is: a triangle D from the eye then lies
 * within 0.9 D to 1.1 D of the mesh's middle, as it does in the open. The mesh's shape does not
 * depend on where its vertices fall (each is on the sea, and colour, light and haze are worked
 * out per pixel): only a triangle's sag below the sea does, its width squared over eight radii.
 * A triangle is under 0.08 of its distance from the middle across, so at D from the eye its sag
 * is at most (0.08 x 1.1 D)^2 / 8R = 1.5e-10 D^2 metres and looks 1.5e-10 D radians at most: 3e-6
 * at the horizon from 30 m up, 6e-5 at the horizon from the highest this applies (the hole's
 * half-width, some kilometres), against a pixel of 3e-4 or more: the mesh's standing error, the
 * same in the open. And never so far that the mesh's edge comes inside the horizon of an eye a
 * quarter higher (the most it climbs before a making): half the room there is.
 */
export function remakeAfter(madeHeight: number, inside: number, radius: number): number {
  const room = (meshReach(madeHeight, radius) - horizonAngle(1.25 * madeHeight, radius)) * radius;
  return 0.1 * Math.max(madeHeight, Math.min(inside, 5 * room));
}

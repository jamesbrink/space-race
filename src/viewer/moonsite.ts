import type { Vec3 } from '../world/frames.ts';
import { MOON_RADIUS } from '../world/moon.ts';

/**
 * The ground round the place the front page's camera starts from, as the laser altimeter has it, whole: heights
 * 250 m apart on the plane touching the Moon there (tools/front-moon.mjs: `moon.site.bin`), read here in doubles and
 * made smooth between its points (Catmull and Rom's curve through them), so that the ground, the blocks lying on it
 * and the camera over it agree to a centimetre. The relief maps the rest of the Moon is drawn from are bytes, 52 m a
 * step: enough from 100 km, a staircase from 40 m.
 *
 * A place on the plane is metres east and north of the site (`x`, `y`): the east and north parts of its direction
 * from the Moon's centre, times the Moon's radius. That is also the place the made ground is hashed by
 * (moonground.ts).
 */
export interface SiteMeta {
  file: string;
  at: { longitude: number; latitude: number };
  /** The ground at the site, metres above the Moon's reference sphere. */
  ground: number;
  up: Vec3;
  east: Vec3;
  north: Vec3;
  /** Heights a side, metres between them, and the metres one count of a height is. */
  side: number;
  metres: number;
  quantum: number;
  /** What is seen from the path's first height: degrees, and the horizon's distance, metres. */
  /** The Earth's bearing from the site at the instant the bake was for, radians anticlockwise from its east. */
  towardEarth: number;
  seen: { from: number; earth: number; horizon: number; horizonAt: number; sunUp: number; sunFrom: number };
  /** The least distance from the camera to any ground, metres, at heights over the site along the path. */
  clear: { over: number[]; least: number[] };
}

export class SiteGround {
  readonly meta: SiteMeta;
  private readonly grid: Int16Array;
  /** How far from the site the heights reach, metres. */
  readonly reach: number;

  constructor(meta: SiteMeta, grid: Int16Array) {
    if (grid.length !== meta.side * meta.side) throw new Error('the site’s ground is not the size its bake says');
    this.meta = meta;
    this.grid = grid;
    this.reach = ((meta.side - 1) / 2) * meta.metres;
  }

  private at(i: number, j: number): number {
    const n = this.meta.side - 1;
    return this.grid[Math.min(n, Math.max(0, j)) * this.meta.side + Math.min(n, Math.max(0, i))]!;
  }

  /** The ground's height at a place, metres above the site's own. */
  height(x: number, y: number): number {
    const m = this.meta;
    const u = x / m.metres + (m.side - 1) / 2,
      v = y / m.metres + (m.side - 1) / 2;
    const i = Math.floor(u),
      j = Math.floor(v);
    const fx = u - i,
      fy = v - j;
    const curve = (a: number, b: number, c: number, d: number, t: number): number =>
      b + 0.5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)));
    const row = (jj: number): number => curve(this.at(i - 1, jj), this.at(i, jj), this.at(i + 1, jj), this.at(i + 2, jj), fx);
    return curve(row(j - 1), row(j), row(j + 1), row(j + 2), fy) * m.quantum;
  }

  /** The direction from the Moon's centre of a place on the plane (unit, in the Moon's frame). */
  direction(x: number, y: number): Vec3 {
    const { east: e, north: n, up: u } = this.meta;
    const [a, b] = [x / MOON_RADIUS, y / MOON_RADIUS];
    const c = Math.sqrt(Math.max(0, 1 - a * a - b * b));
    return [a * e[0] + b * n[0] + c * u[0], a * e[1] + b * n[1] + c * u[1], a * e[2] + b * n[2] + c * u[2]];
  }

  /** The ground at a place, from the ground at the site, metres in the Moon's frame; `lift`: that much above it. */
  point(x: number, y: number, lift = 0): Vec3 {
    const d = this.direction(x, y);
    const g = this.meta.ground;
    const r = MOON_RADIUS + g + this.height(x, y) + lift;
    const u = this.meta.up;
    return [d[0] * r - u[0] * (MOON_RADIUS + g), d[1] * r - u[1] * (MOON_RADIUS + g), d[2] * r - u[2] * (MOON_RADIUS + g)];
  }

  /** The ground's own up at a place (unit, in the Moon's frame): the heights' slope there, taken over `run` metres. */
  normal(x: number, y: number, run = 4): Vec3 {
    const a = this.point(x + run, y),
      b = this.point(x - run, y),
      c = this.point(x, y + run),
      d = this.point(x, y - run);
    const [ex, ey, ez] = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const [nx, ny, nz] = [c[0] - d[0], c[1] - d[1], c[2] - d[2]];
    const n: Vec3 = [ey * nz - ez * ny, ez * nx - ex * nz, ex * ny - ey * nx];
    const l = Math.hypot(n[0], n[1], n[2]);
    return [n[0] / l, n[1] / l, n[2] / l];
  }

  /** The site's ground itself, in the Moon's frame, metres from its centre. */
  get origin(): Vec3 {
    const u = this.meta.up;
    const r = MOON_RADIUS + this.meta.ground;
    return [u[0] * r, u[1] * r, u[2] * r];
  }

  /** The least distance from the camera to any ground when it is `over` metres above the site along its path, or none known (beyond the bake's last height). */
  clearance(over: number): number | null {
    const { over: h, least } = this.meta.clear;
    if (over >= h[h.length - 1]!) return null;
    // (the lesser of the two heights it is between: the near plane is set by this, and may be nearer than it need be)
    let k = 0;
    while (k < h.length - 2 && h[k + 1]! < over) k++;
    return Math.min(least[k]!, least[k + 1]!);
  }
}

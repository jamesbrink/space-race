/**
 * The ground at a landing site on the Moon as heights over the body: what a descending lunar module's radar sees and its pads
 * come down on. Two products of tools/lunar-terrain.py make it: the nested grids round the LM (`LunarTerrain`,
 * public/lunar/<site>.terrain.bin) and a strip along the descent's ground track (`DescentStrip`, <site>.descent.bin).
 * `LandingGround` puts them together. Every height is metres above the Moon's sphere of 1737.4 km (bodies.ts MOON), at a
 * selenographic latitude and longitude in degrees, in the mean Earth/polar axis frame the products are mapped in.
 */
import { LunarTerrain, TERRAIN_INTERVALS, TERRAIN_SPACING } from './lunar-terrain.ts';

const DEG = Math.PI / 180;
type V = [number, number, number];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (latitude: number, longitude: number): V => {
  const [p, l] = [latitude * DEG, longitude * DEG];
  return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];
};
/** The local vertical, east and north at a place, unit vectors in the body's frame. */
function axes(latitude: number, longitude: number): { up: V; east: V; north: V } {
  const up = unit(latitude, longitude);
  const east: V = [-Math.sin(longitude * DEG), Math.cos(longitude * DEG), 0];
  return { up, east, north: cross(up, east) };
}

/** What the surface is under a place on a body. */
export interface BodyGround {
  /** Whether it holds the place: latitude and longitude, degrees. */
  covers(latitude: number, longitude: number): boolean;
  /** The surface's height there, metres above the body's sphere (off what it covers, its nearest edge's). */
  height(latitude: number, longitude: number): number;
}

/**
 * A strip of the Moon along a descent's ground track: SLDEM2015 (LOLA's heights, placed by SELENE's stereo, 512 a degree)
 * averaged to cells of `spacing` metres. The track is the great circle through the LM on the heading it was flown on there
 * (`approach`). Little-endian:
 *
 *   bytes 0-3    "SRDS"
 *   4-7          uint32 version, 1
 *   8-11         uint32 columns: cells along the track
 *   12-15        uint32 rows: cells across it
 *   16-71        float64 x 7: the LM's latitude and longitude (degrees), the approach (degrees true), the spacing (m),
 *                the first column's distance along the track from the LM (m: negative is uprange, the way it came),
 *                the first row's distance to the right of the track (m: negative is left), the sphere's radius (m)
 *   72-          int16 x columns x rows: heights in half metres above the sphere, a row of columns at a time
 *
 * A place is (along, right): along the great circle from the LM, then square off it toward its pole.
 */
export class DescentStrip implements BodyGround {
  readonly columns: number;
  readonly rows: number;
  readonly latitude: number;
  readonly longitude: number;
  readonly approach: number;
  readonly spacing: number;
  readonly first: { along: number; right: number };
  readonly radius: number;
  private readonly heights: Int16Array;
  private readonly up: V;
  private readonly along: V;
  private readonly right: V;

  constructor(file: ArrayBuffer) {
    const view = new DataView(file);
    if (String.fromCharCode(...new Uint8Array(file, 0, 4)) !== 'SRDS' || view.getUint32(4, true) !== 1)
      throw new Error('Not a descent strip');
    this.columns = view.getUint32(8, true);
    this.rows = view.getUint32(12, true);
    const f = (i: number) => view.getFloat64(16 + 8 * i, true);
    [this.latitude, this.longitude, this.approach, this.spacing] = [f(0), f(1), f(2), f(3)];
    this.first = { along: f(4), right: f(5) };
    this.radius = f(6);
    if (file.byteLength !== 72 + 2 * this.columns * this.rows) throw new Error('Incomplete descent strip');
    this.heights = new Int16Array(file, 72, this.columns * this.rows);
    const { up, east, north } = axes(this.latitude, this.longitude);
    const a = this.approach * DEG;
    this.up = up;
    this.along = [0, 1, 2].map((i) => Math.cos(a) * north[i]! + Math.sin(a) * east[i]!) as V;
    this.right = cross(this.along, up);
  }

  /** A place's distances along the track from the LM and to its right, metres. */
  place(latitude: number, longitude: number): { along: number; right: number } {
    const p = unit(latitude, longitude);
    return {
      along: this.radius * Math.atan2(dot(p, this.along), dot(p, this.up)),
      right: this.radius * Math.asin(Math.max(-1, Math.min(1, dot(p, this.right)))),
    };
  }

  private cell(latitude: number, longitude: number): [number, number] {
    const { along, right } = this.place(latitude, longitude);
    return [(along - this.first.along) / this.spacing, (right - this.first.right) / this.spacing];
  }

  covers(latitude: number, longitude: number): boolean {
    return this.inside(latitude, longitude) >= 0;
  }

  /** How far inside the strip's nearest edge a place is, m (negative: outside it). */
  inside(latitude: number, longitude: number): number {
    const [u, v] = this.cell(latitude, longitude);
    return this.spacing * Math.min(u, v, this.columns - 1 - u, this.rows - 1 - v);
  }

  height(latitude: number, longitude: number): number {
    const [cu, cv] = this.cell(latitude, longitude);
    const u = Math.min(this.columns - 1, Math.max(0, cu));
    const v = Math.min(this.rows - 1, Math.max(0, cv));
    const i = Math.min(this.columns - 2, Math.floor(u));
    const j = Math.min(this.rows - 2, Math.floor(v));
    const [fu, fv] = [u - i, v - j];
    const h = this.heights;
    const at = (a: number, b: number) => h[b * this.columns + a]! / 2;
    return (1 - fv) * ((1 - fu) * at(i, j) + fu * at(i + 1, j)) + fv * ((1 - fu) * at(i, j + 1) + fu * at(i + 1, j + 1));
  }
}

/** Where a site's nested grids stand: the LM's latitude, longitude and the ground's height under it, and how far east of it the grids are centred. */
export interface GridPlace {
  landing: number[];
  height: number;
  centre: number;
}

/**
 * A landing site's ground: its nested grids where they reach, its descent strip beyond, the one blended into the other over
 * the grids' last 4 km and the strip's own last 4 km (the grids reach 32.8 km every way, the strip 30 km either side of the
 * track): off the grids, the strip's (and past the strip, its nearest edge's). The grids hold heights relative to their centre; they are set on the site's height under the LM
 * (`SiteDef.height`, which the bake took from the same stereo's support plane).
 */
export class LandingGround implements BodyGround {
  private readonly place: GridPlace;
  private readonly terrain: LunarTerrain;
  private readonly strip: DescentStrip;
  private readonly up: V;
  private readonly east: V;
  private readonly north: V;
  private readonly lift: number;
  private readonly reach0 = (TERRAIN_INTERVALS / 2) * TERRAIN_SPACING.at(-1)!;
  private static readonly BLEND = 4096;

  constructor(place: GridPlace, terrain: LunarTerrain, strip: DescentStrip) {
    this.place = place;
    this.terrain = terrain;
    this.strip = strip;
    const [latitude, longitude] = place.landing as [number, number];
    ({ up: this.up, east: this.east, north: this.north } = axes(latitude, longitude));
    // The grids' heights are above their centre: their centre's height is the LM's less the grids' height at the LM.
    this.lift = place.height - terrain.height(-place.centre, 0);
  }

  /** The grids' height at a place over the sphere, m, and how far into them it is (0 at their edge, 1 at least 4 km in); null off them. */
  grids(latitude: number, longitude: number): { h: number; w: number } | null {
    const p = unit(latitude, longitude);
    const d = dot(p, this.up);
    if (d <= 0) return null;
    const r = this.strip.radius;
    const x = (r / d) * dot(p, this.east) - this.place.centre;
    const z = -(r / d) * dot(p, this.north);
    const inside = this.reach0 - Math.max(Math.abs(x), Math.abs(z));
    if (inside <= 0) return null;
    const local = this.terrain.height(x, z) + this.lift;
    return { h: (r + local) / d - r, w: Math.min(1, inside / LandingGround.BLEND) };
  }

  covers(latitude: number, longitude: number): boolean {
    return this.grids(latitude, longitude) !== null || this.strip.covers(latitude, longitude);
  }

  /** How far from the LM the grids reach on every side, m: what `at` answers for. */
  get reach(): number {
    return this.reach0 - Math.abs(this.place.centre);
  }

  /**
   * The land in the site's own frame (SiteDef: origin on the ground under the LM, +X east, +Y up, +Z south), as a site's
   * `Ground` is asked (sim/sitecontact.ts): its height over the origin's level on the tangent plane, m, or null past the grids.
   */
  at(x: number, z: number): number | null {
    if (Math.max(Math.abs(x - this.place.centre), Math.abs(z)) > this.reach0) return null;
    return this.terrain.height(x - this.place.centre, z) - this.terrain.height(-this.place.centre, 0);
  }

  height(latitude: number, longitude: number): number {
    const g = this.grids(latitude, longitude);
    if (!g) return this.strip.height(latitude, longitude);
    // Each fades to nothing toward its own edge, the grids first where both reach: so neither edge makes a step, and where
    // only one reaches it is that one's.
    const grid = g.w;
    const strip = (1 - grid) * Math.min(1, Math.max(0, this.strip.inside(latitude, longitude) / LandingGround.BLEND));
    if (strip <= 0) return g.h;
    return (grid * g.h + strip * this.strip.height(latitude, longitude)) / (grid + strip);
  }
}

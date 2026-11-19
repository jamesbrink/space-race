/**
 * The predicted path's line as numbers (viewer/path.ts draws it). Pure: tested in tests/pathline.test.mjs. Every rule
 * here is one of the screen (pixels, the near plane) or of the path's own motion; none knows a flight.
 *
 * - **A curve, not a polyline.** A path is its instants with a place and a velocity at each (`Curve`), and between
 *   them the cubic those fix (Hermite: `curveAt`), so it can be asked where it is at any instant, however coarsely the
 *   predictor kept it. Where no velocity is given (the line flown) it is taken from the neighbours.
 * - **Drawn as finely as the screen needs.** `sample` cuts it into chords until no chord's middle is more than
 *   `ERROR_PX` from the curve as seen from the eye, wherever the eye is: coarse far off, fine close to (and so fine
 *   wherever the line passes near the eye), never a fixed count or spacing. It first cuts the span at multiples of a
 *   power of two seconds and halves from there, so as the instant on show moves on the chords stay where they were.
 * - **Never at the eye.** A chord is cut where it crosses a plane just in front of the near plane, and what lies behind
 *   that plane is not drawn (`clipNear`), so no vertex is ever behind the eye, where a ribbon turns inside out across the
 *   screen.
 * - **Behind the body, cleanly.** A point is hidden when the ray from the eye to it passes through the body's sphere
 *   before reaching it; by how many pixels it clears the limb is `limbPx`, which the fragment shader works out for
 *   every pixel of the ribbon, so the line ends at the limb to a pixel however long its chords.
 */

/** Pixels: the most a chord drawn may stray from the curve it stands for, as seen from the eye. */
export const ERROR_PX = 0.35;

/** A path: `n` instants, a place (x, y, z) and a velocity at each, in one frame that does not turn. */
export interface Curve {
  t: Float64Array;
  r: Float64Array;
  v: Float64Array;
  n: number;
}

/** A curve through points: with their velocities where they have them, or (none given) the slope through the neighbours. */
export function curveOf(points: readonly { t: number; r: ArrayLike<number>; v?: ArrayLike<number> }[]): Curve {
  const n = points.length;
  const c: Curve = { t: new Float64Array(n), r: new Float64Array(n * 3), v: new Float64Array(n * 3), n };
  for (let i = 0; i < n; i++) {
    const p = points[i]!;
    c.t[i] = p.t;
    for (let k = 0; k < 3; k++) c.r[i * 3 + k] = p.r[k]!;
  }
  for (let i = 0; i < n; i++) {
    const v = points[i]!.v;
    if (v) for (let k = 0; k < 3; k++) c.v[i * 3 + k] = v[k]!;
    else slope(c, i);
  }
  return c;
}

/** The velocity at point `i` from its neighbours (a run of places with no velocities: the line flown). */
export function slope(c: Curve, i: number): void {
  const a = Math.max(0, i - 1);
  const b = Math.min(c.n - 1, i + 1);
  const dt = c.t[b]! - c.t[a]!;
  for (let k = 0; k < 3; k++) c.v[i * 3 + k] = dt > 0 ? (c.r[b * 3 + k]! - c.r[a * 3 + k]!) / dt : 0;
}

/**
 * The piece of the curve an instant is in (the last whose start is at or before it): a step or two from `hint` (the
 * line is sampled in order of time, so the last piece is the usual answer), else found by halving, so no instant costs
 * more than the log of the curve's length.
 */
export function pieceOf(c: Curve, t: number, hint = 0): number {
  const last = Math.max(0, c.n - 2);
  let i = Math.min(Math.max(0, hint), last);
  for (let k = 0; k < 4; k++) {
    if (i > 0 && c.t[i]! > t) i--;
    else if (i < last && c.t[i + 1]! <= t) i++;
    else return i;
  }
  let lo = 0;
  let hi = last;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (c.t[m]! <= t) lo = m;
    else hi = m - 1;
  }
  return lo;
}

/**
 * Where the curve is at `t` (held at its ends outside them), into `out` at `o`; with its velocity into `vel` if given.
 * Returns the piece it was in, a hint for the next instant asked.
 */
export function curveAt(c: Curve, t: number, out: Float64Array | number[], o = 0, hint = 0, vel?: Float64Array | number[]): number {
  if (c.n === 1 || t <= c.t[0]! || t >= c.t[c.n - 1]!) {
    const i = c.n === 1 || t <= c.t[0]! ? 0 : c.n - 1;
    for (let k = 0; k < 3; k++) {
      out[o + k] = c.r[i * 3 + k]!;
      if (vel) vel[k] = c.v[i * 3 + k]!;
    }
    return Math.min(i, Math.max(0, c.n - 2));
  }
  const i = pieceOf(c, t, hint);
  const t0 = c.t[i]!;
  const h = c.t[i + 1]! - t0;
  const s = (t - t0) / h;
  const s2 = s * s;
  const s3 = s2 * s;
  const a = 2 * s3 - 3 * s2 + 1;
  const b = (s3 - 2 * s2 + s) * h;
  const d = -2 * s3 + 3 * s2;
  const e = (s3 - s2) * h;
  const j = i + 1;
  for (let k = 0; k < 3; k++) {
    out[o + k] = a * c.r[i * 3 + k]! + b * c.v[i * 3 + k]! + d * c.r[j * 3 + k]! + e * c.v[j * 3 + k]!;
    if (vel)
      vel[k] =
        ((6 * s2 - 6 * s) / h) * c.r[i * 3 + k]! +
        (3 * s2 - 4 * s + 1) * c.v[i * 3 + k]! +
        ((-6 * s2 + 6 * s) / h) * c.r[j * 3 + k]! +
        (3 * s2 - 2 * s) * c.v[j * 3 + k]!;
  }
  return i;
}

/**
 * How far round the centre (the frame's origin) the curve has gone at each of its points, radians from its first, about
 * the normal of its motion there and summed piece by piece (so past half a turn it goes on counting): kept with a
 * prediction, so where the line ends (`sweptTo`, `whenSwept`) costs a search, not a walk round the orbit. An orbit drawn
 * once round comes back to where it began: path.ts ends its line short of that, so it is never drawn behind the vehicle.
 */
export function sweepOf(c: Curve): Sweep {
  const at = new Float64Array(c.n);
  const normal: [number, number, number] = [0, 0, 1];
  if (c.n < 2) return { at, normal };
  const h = [c.r[1]! * c.v[2]! - c.r[2]! * c.v[1]!, c.r[2]! * c.v[0]! - c.r[0]! * c.v[2]!, c.r[0]! * c.v[1]! - c.r[1]! * c.v[0]!];
  const hn = Math.hypot(h[0]!, h[1]!, h[2]!);
  if (hn > 0) for (let k = 0; k < 3; k++) normal[k] = h[k]! / hn;
  const sw = { at, normal };
  const a = [0, 0, 0];
  const b = [0, 0, 0];
  for (let i = 1; i < c.n; i++) {
    // (each piece in four: no step turns by more than a few degrees, so none is taken the short way round)
    const t0 = c.t[i - 1]!;
    const h = c.t[i]! - t0;
    let turned = 0;
    for (let k = 0; k < 3; k++) a[k] = c.r[(i - 1) * 3 + k]!;
    for (let q = 1; q <= 4; q++) {
      curveAt(c, t0 + (q / 4) * h, b, 0, i - 1);
      turned += turnOf(sw, a, b);
      a[0] = b[0]!;
      a[1] = b[1]!;
      a[2] = b[2]!;
    }
    at[i] = at[i - 1]! + turned;
  }
  return sw;
}

/** A curve's turn round the centre at each of its points (`sweepOf`), and the normal of its motion at its first, which the turns are taken about. */
export interface Sweep {
  at: Float64Array;
  normal: readonly [number, number, number];
}

/** The angle from place `a` to place `b` round the centre, about the sweep's normal: signed, so a step that goes back counts back. */
function turnOf(sw: Sweep, a: ArrayLike<number>, b: ArrayLike<number>): number {
  const [nx, ny, nz] = sw.normal;
  const x = a[1]! * b[2]! - a[2]! * b[1]!;
  const y = a[2]! * b[0]! - a[0]! * b[2]!;
  const z = a[0]! * b[1]! - a[1]! * b[0]!;
  return Math.atan2(x * nx + y * ny + z * nz, a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!);
}

/** How far round the curve has gone at `t` (held at its ends), radians from its first point (`sweepOf`). */
export function sweptTo(c: Curve, sw: Sweep, t: number, hint = 0): number {
  if (c.n < 2 || t <= c.t[0]!) return 0;
  if (t >= c.t[c.n - 1]!) return sw.at[c.n - 1]!;
  const i = pieceOf(c, t, hint);
  const m = [0, 0, 0];
  curveAt(c, t, m, 0, i);
  return sw.at[i]! + turnOf(sw, c.r.subarray(i * 3, i * 3 + 3), m);
}

/** The instant at which the curve has gone `angle` round (`sweepOf`, radians from its first point), or Infinity if it never does. */
export function whenSwept(c: Curve, sw: Sweep, angle: number): number {
  if (c.n < 2 || !(sw.at[c.n - 1]! >= angle)) return Number.POSITIVE_INFINITY;
  if (angle <= 0) return c.t[0]!;
  // (the first point at or past it, by halving: a coast's turn only grows; then the instant within the piece before it)
  let lo = 0;
  let hi = c.n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (sw.at[mid]! >= angle) hi = mid;
    else lo = mid;
  }
  let a = c.t[lo]!;
  let b = c.t[hi]!;
  for (let n = 0; n < 48 && b - a > 1e-6; n++) {
    const t = 0.5 * (a + b);
    if (sweptTo(c, sw, t, lo) >= angle) b = t;
    else a = t;
  }
  return b;
}

/**
 * Where a line drawn along the curve from `now` ends, so that it does not come round to where the vehicle is: at the
 * instant the curve has gone round a whole turn from `now` less `short` radians, going out over `fade` radians before
 * that (`over`, seconds); or, the curve ending first, at its end, going out over its last `fade` radians, and over
 * `least` seconds at the least. A curve that goes round less far than that ends where it ends, which is behind the
 * vehicle by more than `short`.
 */
export function tailOf(c: Curve, sw: Sweep, now: number, short: number, fade: number, least = 0): { to: number; over: number } {
  const t1 = c.t[c.n - 1]!;
  if (c.n < 2) return { to: t1, over: least };
  const from = sweptTo(c, sw, now);
  const to = whenSwept(c, sw, from + 2 * Math.PI - short);
  if (!Number.isFinite(to)) {
    // (and over half of what is left at most: the line goes out at its end, and is not faint from the vehicle on)
    const out = whenSwept(c, sw, Math.max(from, sw.at[c.n - 1]! - fade));
    return { to: t1, over: Math.min(Math.max(Number.isFinite(out) ? t1 - out : 0, least), 0.5 * Math.max(0, t1 - now)) };
  }
  return { to, over: to - whenSwept(c, sw, Math.max(from, from + 2 * Math.PI - short - fade)) };
}

/**
 * How far past a curve that goes once round from `t0` to `t1` the instant `t` is, in whole turns of it (seconds: 0 while
 * it is within the curve). An orbit the clock has outrun before the next prediction is made is drawn from the same
 * curve this much later, so the line still starts at the vehicle.
 */
export function turnsPast(t: number, t0: number, t1: number): number {
  return t > t1 && t1 > t0 ? (t1 - t0) * Math.ceil((t - t1) / (t1 - t0)) : 0;
}

/**
 * The angle round the centre, radians, beyond which a point at radius `far` cannot be seen from one at radius `near` over
 * a ball of `radius`: each sees to its own horizon, and the two horizons meet. A path drawn once round that stops this
 * far short of the vehicle (and a little more) ends below the vehicle's horizon, where nothing near it can see its end.
 */
export function overHorizon(near: number, far: number, radius: number): number {
  const h = (r: number) => (r > radius ? Math.acos(radius / r) : 0);
  return h(near) + h(far);
}

/** Where the eye is and how the screen sees: pixels to a radian at the middle of the view, and the near plane's distance. */
export interface Lens {
  eye: readonly [number, number, number];
  pxPerRad: number;
  near: number;
}

/** Halvings of a piece at most (the coarsest piece cut to a sixteen-millionth of itself). */
const DEEPEST = 24;
/** Pieces the span is first cut into, at least; and the most of the curve's own points one chord may stand for unexamined. */
const FIRST = 8;
const KNOTS = 64;
/** Pixels: the shortest chord drawn, as seen from the eye (`sample`). */
export const SHORTEST_PX = 0.75;

/**
 * The line to draw from `t0` to `t1`: instants into `outT` and places (in the scene, from `place`) into `outP`, at
 * most `most` of them. The span is first cut at the multiples of a power of two seconds (an eighth of it or less), so
 * that as `t0` moves on the cuts stay where they were; each piece is then halved until neither its middle nor any of
 * the curve's own points within it (`knots`, in order) is more than `error` pixels from its chord as seen from the eye
 * (`lens`), or it has been halved `DEEPEST` times. A piece that holds more than `KNOTS` of the curve's points is halved
 * without being looked at. Returns how many points it laid.
 */
export function sample(
  place: (t: number, out: Float64Array, o: number) => void,
  knots: ArrayLike<number>,
  t0: number,
  t1: number,
  lens: Lens,
  most: number,
  outT: Float64Array,
  outP: Float64Array,
  error = ERROR_PX,
): number {
  if (!(t1 > t0) || most < 2) return 0;
  const [ex, ey, ez] = lens.eye;
  const near = Math.max(lens.near, 1e-6);
  const mid = new Float64Array(3);
  let n = 0;
  const put = (t: number, p: Float64Array, o: number) => {
    outT[n] = t;
    outP[n * 3] = p[o]!;
    outP[n * 3 + 1] = p[o + 1]!;
    outP[n * 3 + 2] = p[o + 2]!;
    n++;
  };
  // the first knot after an instant (binary search: the knots are in order)
  const after = (t: number) => {
    let lo = 0;
    let hi = knots.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (knots[m]! <= t) lo = m + 1;
      else hi = m;
    }
    return lo;
  };
  // how far a place strays from the chord at the fraction `f` along it, as an angle from the eye, in pixels: from the
  // nearest the chord or the place come to the eye (the curve strays least near the ends, but the chord may pass much
  // nearer the eye than any point of it looked at: this way no part of it strays more)
  const strays = (p: Float64Array, oa: number, b: Float64Array, ob: number, f: number): number => {
    const ax = outP[oa]!;
    const ay = outP[oa + 1]!;
    const az = outP[oa + 2]!;
    const dx = b[ob]! - ax;
    const dy = b[ob + 1]! - ay;
    const dz = b[ob + 2]! - az;
    const cx = ax + dx * f - p[0]!;
    const cy = ay + dy * f - p[1]!;
    const cz = az + dz * f - p[2]!;
    const dd = dx * dx + dy * dy + dz * dz;
    const k = dd > 0 ? Math.min(1, Math.max(0, ((ex - ax) * dx + (ey - ay) * dy + (ez - az) * dz) / dd)) : 0;
    const far = Math.max(
      near,
      Math.min(Math.hypot(p[0]! - ex, p[1]! - ey, p[2]! - ez), Math.hypot(ax + dx * k - ex, ay + dy * k - ey, az + dz * k - ez)),
    );
    return (Math.hypot(cx, cy, cz) / far) * lens.pxPerRad;
  };
  const step = 2 ** Math.floor(Math.log2((t1 - t0) / FIRST));
  const starts: number[] = [];
  for (let k = Math.floor(t0 / step) + 1; k * step < t1; k++) starts.push(k * step);
  starts.push(t1);
  const a = new Float64Array(3);
  place(t0, a, 0);
  put(t0, a, 0);
  // (a piece's end, the stack of ends still to go to: depth-first, so the points come out in order of time)
  const stackT = new Float64Array(DEEPEST + 2);
  const stackP = new Float64Array((DEEPEST + 2) * 3);
  const stackD = new Int32Array(DEEPEST + 2);
  for (let s = 0; s < starts.length; s++) {
    stackT[0] = starts[s]!;
    place(starts[s]!, stackP, 0);
    stackD[0] = 0;
    let top = 1;
    while (top > 0) {
      const ta = outT[n - 1]!;
      const tb = stackT[top - 1]!;
      const depth = stackD[top - 1]!;
      const ob = (top - 1) * 3;
      const oa = (n - 1) * 3;
      const tm = 0.5 * (ta + tb);
      place(tm, mid, 0);
      let split = depth < DEEPEST && n + top + (starts.length - s) < most - 1; // (room left: every end still to go must be laid too)
      if (split) {
        const k0 = after(ta);
        const k1 = after(tb - 1e-12 * Math.abs(tb));
        if (k1 - k0 <= KNOTS) {
          let worst = strays(mid, oa, stackP, ob, 0.5);
          for (let k = k0; k < k1 && worst <= error; k++) {
            const tk = knots[k]!;
            if (tk <= ta || tk >= tb) continue;
            place(tk, a, 0);
            worst = Math.max(worst, strays(a, oa, stackP, ob, (tk - ta) / (tb - ta)));
          }
          split = worst > error;
        }
      }
      if (split) {
        stackT[top] = tm;
        stackP[top * 3] = mid[0]!;
        stackP[top * 3 + 1] = mid[1]!;
        stackP[top * 3 + 2] = mid[2]!;
        stackD[top - 1] = depth + 1;
        stackD[top] = depth + 1;
        top++;
      } else {
        put(tb, stackP, ob);
        top--;
      }
    }
  }
  // no chord shorter than `SHORTEST_PX` as seen from the eye (but the last): where the line runs at the eye or away to a
  // point, a chord shorter than a pixel has no direction on the screen to push its ribbon out across, and a run of them
  // draws a scribble
  // (a point is let go only if every one let go since the last kept stays within `error` of the chord that replaces them)
  const within = (o: number, from: number, to: number, j: number): boolean => {
    const ax = outP[o]!;
    const ay = outP[o + 1]!;
    const az = outP[o + 2]!;
    const dx = outP[j * 3]! - ax;
    const dy = outP[j * 3 + 1]! - ay;
    const dz = outP[j * 3 + 2]! - az;
    const dd = dx * dx + dy * dy + dz * dz;
    // (each point let go, and the curve half way to the next: the chord stands for all of it)
    for (let q = 2 * (from - 1) + 1; q < 2 * to - 1; q++) {
      const m = q >> 1;
      if (q & 1) place(0.5 * (outT[m]! + outT[m + 1]!), mid, 0);
      else mid.set(outP.subarray(m * 3, m * 3 + 3));
      const px = mid[0]! - ax;
      const py = mid[1]! - ay;
      const pz = mid[2]! - az;
      const k = dd > 0 ? Math.min(1, Math.max(0, (px * dx + py * dy + pz * dz) / dd)) : 0;
      const off = Math.hypot(px - dx * k, py - dy * k, pz - dz * k);
      const far = Math.max(near, Math.hypot(ax + dx * k - ex, ay + dy * k - ey, az + dz * k - ez));
      if ((off / far) * lens.pxPerRad > error) return false;
    }
    return true;
  };
  let kept = 1;
  let since = 1;
  for (let i = 1; i < n; i++) {
    const o = (kept - 1) * 3;
    const ax = outP[o]! - ex;
    const ay = outP[o + 1]! - ey;
    const az = outP[o + 2]! - ez;
    const bx = outP[i * 3]! - ex;
    const by = outP[i * 3 + 1]! - ey;
    const bz = outP[i * 3 + 2]! - ez;
    const across = Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx);
    const angle = Math.atan2(across, ax * bx + ay * by + az * bz);
    if (angle * lens.pxPerRad < SHORTEST_PX && i < n - 1 && within(o, since, i + 1, i + 1)) continue;
    since = i + 1;
    outT[kept] = outT[i]!;
    outP[kept * 3] = outP[i * 3]!;
    outP[kept * 3 + 1] = outP[i * 3 + 1]!;
    outP[kept * 3 + 2] = outP[i * 3 + 2]!;
    kept++;
  }
  return kept;
}

/**
 * A chord in view space (the eye at the origin, looking down -z) cut by the plane `z = -plane`: the part in front of it,
 * as the fraction along from `a` to `b` it starts and ends at, or null if all of it is behind. The vertex shader in
 * path.ts does the same to each end of each chord.
 */
export function clipNear(a: readonly number[], b: readonly number[], plane: number): [number, number] | null {
  const za = a[2]! + plane;
  const zb = b[2]! + plane;
  if (za > 0 && zb > 0) return null;
  if (za <= 0 && zb <= 0) return [0, 1];
  const k = za / (za - zb);
  return za > 0 ? [k, 1] : [0, k];
}

/**
 * By how many pixels the ray from the eye to `p` clears a sphere (`centre`, `radius`) on its way: positive when it
 * passes outside it, negative when the sphere hides `p`; Infinity when the ray comes nearest the centre at `p` itself
 * or beyond (nothing of the sphere is between them: a point on the ground, seen from above, is never hidden by it).
 * Given a `pole` (a unit vector) and a `polar` radius, the body is the spheroid of those radii, `radius` round its
 * equator (the Earth's WGS 84 ellipsoid): every point is stretched along the pole by `radius / polar` first, which makes
 * it the sphere and keeps the ray straight, and the miss is measured there (the distances it is divided by change by
 * the flattening, a third of a percent, at most). The fragment shader in path.ts works out the same for every pixel of
 * the ribbon.
 */
export function limbPx(
  eye: readonly number[],
  p: readonly number[],
  centre: readonly number[],
  radius: number,
  pxPerRad: number,
  pole: readonly number[] | null = null,
  polar = radius,
): number {
  const stretch = pole ? radius / polar - 1 : 0;
  const along = (x: number, y: number, z: number): [number, number, number] => {
    if (!pole) return [x, y, z];
    const d = (x * pole[0]! + y * pole[1]! + z * pole[2]!) * stretch;
    return [x + d * pole[0]!, y + d * pole[1]!, z + d * pole[2]!];
  };
  // (from the centre, stretched: the eye `e` and the ray `f` from it to `p`)
  const e = along(eye[0]! - centre[0]!, eye[1]! - centre[1]!, eye[2]! - centre[2]!);
  const q = along(p[0]! - centre[0]!, p[1]! - centre[1]!, p[2]! - centre[2]!);
  const fx = q[0] - e[0];
  const fy = q[1] - e[1];
  const fz = q[2] - e[2];
  const ff = fx * fx + fy * fy + fz * fz;
  const k = -(e[0] * fx + e[1] * fy + e[2] * fz) / Math.max(ff, 1e-12);
  if (k >= 1 || k <= 0) return Number.POSITIVE_INFINITY;
  const miss = Math.hypot(e[0] + fx * k, e[1] + fy * k, e[2] + fz * k);
  return ((miss - radius) / Math.max(Math.sqrt(ff) * k, 1e-6)) * pxPerRad;
}

/**
 * How much of the line is drawn `d` metres from the vehicle, when the gap is `gap` and it comes in over `span`:
 * nothing within the gap, all of it from `span` beyond, between them on lunar-lift's curve (../lunar-lift,
 * js/predictor.js: a seventh, two fifths and four fifths of it at 1.4, 2 and 2.8 gaps of its four), drawn in to the
 * span. path.ts gives a span of so many pixels at the vehicle, so the fade is a rule of the screen; its fragment shader
 * does the same.
 */
export function fadeIn(d: number, gap: number, span = 2 * gap): number {
  const x = Math.min(1, Math.max(0, 0.631 * Math.log2(1 + (2 * Math.max(d - gap, 0)) / Math.max(span, 1e-9))));
  return x * x * (3 - 2 * x);
}

/**
 * How deep in the view a point of the line `d` metres from the eye is, 0 to 1: nothing at `near` (the vehicle's distance,
 * where the line starts) or nearer, all of it at `far` (the furthest the line goes from the eye), by the logarithm of the
 * distance between, so each doubling counts alike from 30 m and from 30,000 km. A line that keeps much the same distance
 * (`far` under `DEPTH_LEAST` times `near`) is measured over that least span, and so is never all the way deep. path.ts
 * draws the line narrower and fainter by it (`DEPTH_THIN`, `DEPTH_DIM`): a ribbon of one width and strength from the
 * vehicle to the limb has no depth, and a path seen from near its own plane (the chase view of an orbit, or of a lob
 * from behind) then reads as a line that goes away and turns square down into the horizon, where it is a curve going
 * 5,000 km off and over the Earth's shoulder. Its fragment shader does the same.
 */
export function depthOf(d: number, near: number, far: number): number {
  const from = Math.max(near, 1e-6);
  const span = Math.max(Math.log(Math.max(far, from) / from), Math.log(DEPTH_LEAST));
  return Math.min(1, Math.max(0, Math.log(Math.max(d, from) / from) / span));
}
/** The least ratio of the furthest to the nearest the depth is measured over. */
export const DEPTH_LEAST = 2;
/** How wide and how strong the line is drawn where it is deepest, of what it is at the vehicle. */
export const DEPTH_THIN = 0.5;
export const DEPTH_DIM = 0.6;

/** How much of the line is drawn `px` pixels from the vehicle's outline on the screen, which it keeps `w` pixels off: none within, all of it `margin` further out. */
export function clearOf(px: number, w: number, margin: number): number {
  if (!(w > 0)) return 1;
  const x = Math.min(1, Math.max(0, (px - w) / margin));
  return x * x * (3 - 2 * x);
}

/** The ribbon's buffers: four vertices a chord (its two ends, each with its two edges). */
export interface Ribbon {
  /** Each vertex's own end of its chord, the chord's other end, and the point beyond its own end (for the join), less the anchor. */
  position: Float32Array;
  other: Float32Array;
  beyond: Float32Array;
  /** Seconds from `zero` at its own end. */
  at: Float32Array;
}

/**
 * The ribbon's vertices for a line of `n` points (x, y, z in `p`, doubles; instants in `t`): four a chord, each its own
 * end less `anchor` (so the GPU's single precision is spent near the anchor), the chord's other end, and the point past
 * its own end along the line (the neighbouring chord's far end, or its own end again at the line's ends), from which the
 * shader mitres the join. A closed line (`closed`: its last point is its first again) is mitred there too.
 */
export function ribbon(
  t: ArrayLike<number>,
  p: ArrayLike<number>,
  n: number,
  anchor: readonly [number, number, number],
  zero: number,
  out: Ribbon,
  closed = false,
): number {
  const chords = Math.max(0, n - 1);
  const at = (i: number, k: number) => p[i * 3 + k]! - anchor[k]!;
  for (let s = 0; s < chords; s++) {
    for (let e = 0; e < 2; e++) {
      const self = s + e;
      const other = s + 1 - e;
      // past its own end: the chord before (for the start) or after (for the end); at an open line's ends, none
      let past = e === 0 ? s - 1 : s + 2;
      if (closed && n > 2) past = past < 0 ? n - 2 : past > n - 1 ? 1 : past;
      const has = past >= 0 && past < n;
      for (let side = 0; side < 2; side++) {
        const v = (s * 4 + e * 2 + side) * 3;
        for (let k = 0; k < 3; k++) {
          out.position[v + k] = at(self, k);
          out.other[v + k] = at(other, k);
          out.beyond[v + k] = has ? at(past, k) : at(self, k);
        }
        out.at[s * 4 + e * 2 + side] = t[self]! - zero;
      }
    }
  }
  return chords;
}

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
function slope(c: Curve, i: number): void {
  const a = Math.max(0, i - 1);
  const b = Math.min(c.n - 1, i + 1);
  const dt = c.t[b]! - c.t[a]!;
  for (let k = 0; k < 3; k++) c.v[i * 3 + k] = dt > 0 ? (c.r[b * 3 + k]! - c.r[a * 3 + k]!) / dt : 0;
}

/** The piece of the curve an instant is in (the last whose start is at or before it), from `hint` on. */
export function pieceOf(c: Curve, t: number, hint = 0): number {
  let i = Math.min(Math.max(0, hint), Math.max(0, c.n - 2));
  while (i > 0 && c.t[i]! > t) i--;
  while (i < c.n - 2 && c.t[i + 1]! <= t) i++;
  return i;
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
 * The fragment shader in path.ts works out the same for every pixel of the ribbon.
 */
export function limbPx(eye: readonly number[], p: readonly number[], centre: readonly number[], radius: number, pxPerRad: number): number {
  const fx = p[0]! - eye[0]!;
  const fy = p[1]! - eye[1]!;
  const fz = p[2]! - eye[2]!;
  const cx = centre[0]! - eye[0]!;
  const cy = centre[1]! - eye[1]!;
  const cz = centre[2]! - eye[2]!;
  const ff = fx * fx + fy * fy + fz * fz;
  const k = (cx * fx + cy * fy + cz * fz) / Math.max(ff, 1e-12);
  if (k >= 1 || k <= 0) return Number.POSITIVE_INFINITY;
  const miss = Math.hypot(cx - fx * k, cy - fy * k, cz - fz * k);
  return ((miss - radius) / Math.max(Math.sqrt(ff) * k, 1e-6)) * pxPerRad;
}

/**
 * How much of the line is drawn `d` metres from the vehicle, when the gap is `gap`: nothing within
 * the gap, all of it from three gaps on, between them on a curve in the distance's logarithm through
 * lunar-lift's stops (../lunar-lift, js/predictor.js: a seventh, two fifths and four fifths of it at
 * 1.4, 2 and 2.8 gaps of its four), drawn in to three gaps so that a close view sees the line whole
 * sooner. The fragment shader in path.ts does the same.
 */
export function fadeIn(d: number, gap: number): number {
  const x = Math.min(1, Math.max(0, 0.631 * Math.log2(Math.max(d, 1e-3) / gap)));
  return x * x * (3 - 2 * x);
}

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

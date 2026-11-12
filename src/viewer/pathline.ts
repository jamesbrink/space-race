/**
 * The predicted path's line as numbers (viewer/path.ts draws it): the vertices of a ribbon along a
 * run of points, a line eased from one prediction to the next by instant, and the two rules that
 * keep it off the vehicle, as its shader applies them. Pure: tested in tests/pathline.test.mjs.
 */

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

/**
 * The ribbon's vertices for `n` points (x, y, z in `at`, doubles): two a point, each the point less
 * `anchor` (so the GPU's single precision is spent near the anchor) and the line's direction there,
 * the chord between its neighbours. Writes `position` and `along` (6 numbers a point each).
 */
export function strip(
  at: ArrayLike<number>,
  n: number,
  anchor: readonly [number, number, number],
  position: Float32Array,
  along: Float32Array,
): void {
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1) * 3;
    const b = Math.min(n - 1, i + 1) * 3;
    let dx = at[b]! - at[a]!;
    let dy = at[b + 1]! - at[a + 1]!;
    let dz = at[b + 2]! - at[a + 2]!;
    const l = Math.hypot(dx, dy, dz);
    if (l > 0) {
      dx /= l;
      dy /= l;
      dz /= l;
    }
    for (const k of [2 * i, 2 * i + 1]) {
      position[k * 3] = at[i * 3]! - anchor[0];
      position[k * 3 + 1] = at[i * 3 + 1]! - anchor[1];
      position[k * 3 + 2] = at[i * 3 + 2]! - anchor[2];
      along[k * 3] = dx;
      along[k * 3 + 1] = dy;
      along[k * 3 + 2] = dz;
    }
  }
}

/**
 * Where a line drawn through `oldAt` at the instants `oldT` (its `oldN` points) has each of the
 * instants `t` (its `n` of them), into `out`: between two of its points in proportion to time. An
 * instant outside it keeps what `out` has. Returns how many were set. A prediction made again of the
 * same flight has the same instants and places (sim/predict.ts), so it is eased from exactly itself.
 */
export function atInstants(
  oldT: ArrayLike<number>,
  oldAt: ArrayLike<number>,
  oldN: number,
  t: ArrayLike<number>,
  n: number,
  out: Float64Array,
): number {
  if (oldN < 2) return 0;
  let set = 0;
  let j = 0;
  for (let i = 0; i < n; i++) {
    const ti = t[i]!;
    if (ti < oldT[0]! || ti > oldT[oldN - 1]!) continue;
    while (j < oldN - 2 && oldT[j + 1]! < ti) j++;
    const span = oldT[j + 1]! - oldT[j]!;
    const k = span > 0 ? Math.min(1, Math.max(0, (ti - oldT[j]!) / span)) : 0;
    for (let c = 0; c < 3; c++) out[i * 3 + c] = oldAt[j * 3 + c]! + (oldAt[(j + 1) * 3 + c]! - oldAt[j * 3 + c]!) * k;
    set++;
  }
  return set;
}

/**
 * The lie of the land round Site 1 at Tyuratam: how high the ground is, metres from the level of the tracks and the
 * platform's deck. The pad stands on the brow of a scarp: south of the tracks the ground is at their level, north of
 * them it falls some 8 m to the steppe the bunker and the buildings stand on, and east of the pit it lies some 5 m down.
 *
 * Written three times and kept in step: missions/ussr/vostok/sites/site1/relief.py (for whatever is built on the land:
 * that file says what each figure rests on, and site-1.md, "The land"), and here in JavaScript (the walker, the plants)
 * and GLSL (the land's mesh). tests/tyuratam.test.mjs holds this file's JavaScript to the Python's figures; the GLSL is
 * the same arithmetic line for line.
 */

/** The brow: the line north and east of which the ground falls, metres east and north of the rocket's axis; the low side is on the left. */
export const BROW: [number, number][] = [
  [-3000, 17],
  [-1400, 17],
  [-335, 8],
  [-125, 31],
  [-75, 41],
  [40, 41],
  [166, -33],
  [200, -110],
  [330, -230],
  [3000, -400],
];
const DEPTH = 8;
const DEPTH_WEST = 4;
const DEPTH_EAST = -2.5;
const BREADTH = 40;
const BREADTH_WEST = 80;
const BREADTH_EAST = 60;
/** The ramp the road from the storage bunker comes up the fall on: its middle line, and how far across it is level and then down. */
const RAMP: [number, number, number, number] = [-83.4, 39.5, -82.5, 149.5];
const RAMP_HALF: [number, number] = [5, 18];
/** The pump house's plot: its middle, its half breadth and half depth; level this far outside it and back on the fall by this far. */
const PLOT: [number, number, number, number] = [-40.7, 61.5, 6.2, 7.0];
const PLOT_EDGE: [number, number] = [1.5, 14];
/** From here to here from the pad the ground comes back to the tracks' level, m: so that the land meets the globe. */
const FAR: [number, number] = [900, 2500];

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** How far a point is past the brow, m: over the low ground positive, on the high ground negative. */
export function pastBrow(x: number, y: number): number {
  let best = 1e12;
  let sign = 1;
  for (let i = 0; i + 1 < BROW.length; i++) {
    const [ax, ay] = BROW[i]!;
    const [bx, by] = BROW[i + 1]!;
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    const ex = x - ax - t * dx;
    const ey = y - ay - t * dy;
    const d = ex * ex + ey * ey;
    if (d < best) {
      best = d;
      sign = dx * (y - ay) - dy * (x - ax) > 0 ? 1 : -1;
    }
  }
  return sign * Math.sqrt(best);
}

/** The fall alone. */
function scarp(x: number, y: number): number {
  const west = 1 - smooth(-450, -150, x);
  const depth = DEPTH + DEPTH_WEST * west + DEPTH_EAST * smooth(120, 300, x);
  const breadth = BREADTH + BREADTH_WEST * west + BREADTH_EAST * smooth(60, 200, x);
  return -depth * smooth(0, breadth, pastBrow(x, y));
}

const PLOT_LEVEL = scarp(PLOT[0], PLOT[1]);

/** The ground's height at a point `x` metres east and `y` north of the rocket's axis, m from the level of the tracks and the deck. */
export function siteRelief(x: number, y: number): number {
  let g = scarp(x, y);
  const [ax, ay, bx, by] = RAMP;
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
  const off = Math.hypot(x - ax - t * dx, y - ay - t * dy);
  g += (Math.max(g, -DEPTH * t) - g) * (1 - smooth(RAMP_HALF[0], RAMP_HALF[1], off));
  const out = Math.hypot(Math.max(Math.abs(x - PLOT[0]) - PLOT[2], 0), Math.max(Math.abs(y - PLOT[1]) - PLOT[3], 0));
  g = PLOT_LEVEL + (g - PLOT_LEVEL) * smooth(PLOT_EDGE[0], PLOT_EDGE[1], out);
  return g * (1 - smooth(FAR[0], FAR[1], Math.hypot(x, y)));
}

const f = (v: number) => (Number.isInteger(v) ? v.toFixed(1) : String(v));

/** The same in GLSL: `float siteRelief(vec2 q)`, q metres east and north. */
export const SITE_RELIEF_GLSL = /* glsl */ `
  float pastBrow(vec2 q) {
    vec2 brow[${BROW.length}] = vec2[${BROW.length}](${BROW.map(([x, y]) => `vec2(${f(x)}, ${f(y)})`).join(', ')});
    float best = 1e12, side = 1.0;
    for (int i = 0; i < ${BROW.length - 1}; i++) {
      vec2 a = brow[i], d = brow[i + 1] - a;
      float t = clamp(dot(q - a, d) / dot(d, d), 0.0, 1.0);
      vec2 e = q - a - t * d;
      float r = dot(e, e);
      if (r < best) {
        best = r;
        side = d.x * (q.y - a.y) - d.y * (q.x - a.x) > 0.0 ? 1.0 : -1.0;
      }
    }
    return side * sqrt(best);
  }
  float siteScarp(vec2 q) {
    float west = 1.0 - smoothstep(-450.0, -150.0, q.x);
    float depth = ${f(DEPTH)} + ${f(DEPTH_WEST)} * west + ${f(DEPTH_EAST)} * smoothstep(120.0, 300.0, q.x);
    float breadth = ${f(BREADTH)} + ${f(BREADTH_WEST)} * west + ${f(BREADTH_EAST)} * smoothstep(60.0, 200.0, q.x);
    return -depth * smoothstep(0.0, breadth, pastBrow(q));
  }
  float siteRelief(vec2 q) {
    float g = siteScarp(q);
    vec2 a = vec2(${f(RAMP[0])}, ${f(RAMP[1])}), d = vec2(${f(RAMP[2])}, ${f(RAMP[3])}) - a;
    float t = clamp(dot(q - a, d) / dot(d, d), 0.0, 1.0);
    g += (max(g, ${f(-DEPTH)} * t) - g) * (1.0 - smoothstep(${f(RAMP_HALF[0])}, ${f(RAMP_HALF[1])}, length(q - a - t * d)));
    float level = ${PLOT_LEVEL.toFixed(6)};
    float outside = length(max(abs(q - vec2(${f(PLOT[0])}, ${f(PLOT[1])})) - vec2(${f(PLOT[2])}, ${f(PLOT[3])}), 0.0));
    g = level + (g - level) * smoothstep(${f(PLOT_EDGE[0])}, ${f(PLOT_EDGE[1])}, outside);
    return g * (1.0 - smoothstep(${f(FAR[0])}, ${f(FAR[1])}, length(q)));
  }`;

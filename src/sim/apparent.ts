/**
 * A stage's apparent-velocity integrator, the one way every simulator keeps it: what an accelerometer along the axis
 * senses of the stage's own thrust (its vacuum thrust over the stack's mass: lit above the air, with nothing else pushing,
 * that is all it reads), summed by the trapezoid from its ignition, the stage cut when the sum reaches its setting
 * (the plan's cut on an engine's `apparent` velocity). The batch ascent finds the instant before it flies (staged.ts), the live vehicle
 * sums a trapezoid every tick (stagedlive.ts), and the guided flier sums ahead over whole seconds (fliers.ts).
 */

/** What the integrator senses at an instant, m/s^2: `count` engines at `throttle` of their `vacuum` thrust, N, over the stack's `mass`, kg. */
export const sensed = (count: number, throttle: number, vacuum: number, mass: number): number => (count * throttle * vacuum) / mass;

/** One trapezoid of the sum, m/s: the readings `a` and `b` at the ends of `h` seconds. */
export const trapezoid = (a: number, b: number, h: number): number => ((a + b) / 2) * h;

/** Where within a step the sum, `sum` at its start and growing by `step` over its `h` seconds from `t`, reaches `setting`: by the straight line. */
export const crossing = (t: number, h: number, sum: number, step: number, setting: number): number => t + (h * (setting - sum)) / step;

/**
 * The integrator summed from `from` to `to` in trapezoids of `h` seconds (the last cut short at `to`), from nothing:
 * the instant it reaches `setting` (`at`, with `reached`), or `to` with what it came to.
 */
export function integrate(
  push: (t: number) => number,
  from: number,
  to: number,
  h: number,
  setting = Infinity,
): { at: number; sum: number; reached: boolean } {
  let sum = 0;
  for (let t = from; t < to - 1e-9; t += h) {
    // (the last step cut short at `to`; every other a whole `h`)
    const last = t + h > to;
    const [b, length] = last ? [to, to - t] : [t + h, h];
    const step = trapezoid(push(t), push(b), length);
    if (sum + step >= setting) return { at: crossing(t, length, sum, step, setting), sum: setting, reached: true };
    sum += step;
  }
  return { at: to, sum, reached: false };
}

// The predictions the figures capture (tools/figures.mjs `predict:*`), each made from its start: the record's run at
// fixed instants on a ballistic flight; on a flight into orbit the spacecraft from separation, the stack at 100 s and the
// guided ascent at 40, 150 and 400 s. Each can be made again from a start nudged and in a frame turned, which is how
// tests/predict.test.mjs holds a prediction to depend on its start as the physics does and no more (issue #30).
import { apparentBy, guided, spacecraft, stack } from '../src/sim/fliers.ts';
import { fly, sampleAt } from '../src/sim/fly.ts';
import { coastOf, KEPT } from '../src/sim/orbital.ts';
import { predict, propagate } from '../src/sim/predict.ts';
import { flyWhole, guidanceOf, sequenceOf, steer } from '../src/sim/staged.ts';
import { stagedVehicle } from '../src/sim/stagedlive.ts';
import { add, cross, ecefToGeodetic, ecefToInertial, enuAxes, inertialToEcef, length, siteFrame, sub } from '../src/world/frames.ts';
import { frameOf } from '../src/world/earthframe.ts';

/** A prediction's figures, as the capture keeps them. */
export const pathFigures = (p) => ({
  outcome: { impact: 0, orbit: 1, none: 2 }[p.outcome] ?? 3,
  points: p.points.length,
  impactT: p.impact?.t ?? null,
  impactLatitude: p.impact?.latitude ?? null,
  impactLongitude: p.impact?.longitude ?? null,
  impactSpeed: p.impact?.speed ?? null,
  apogee: p.apogee?.altitude ?? null,
  apogeeT: p.apogee?.t ?? null,
  events: p.events.length,
  lastEventT: p.events.at(-1)?.t ?? null,
});

/**
 * `frame` turned `by` radians further about the pole at every instant (world/earthframe.ts): the Earth a hair further
 * round under the same inertial state.
 */
export function turned(frame, by) {
  if (!by) return frame;
  const angle = (t) => frame.angle(t) + by;
  const upOver = (place, t) => ecefToInertial(enuAxes(place).up, angle(t));
  return {
    ...frame,
    gast0: frame.gast0 + by,
    angle,
    toFixed: (r, t) => inertialToEcef(r, angle(t)),
    toInertial: (p, t) => ecefToInertial(p, angle(t)),
    velocityToFixed: (r, v, t) => sub(inertialToEcef(v, angle(t)), cross(frame.spin, inertialToEcef(r, angle(t)))),
    velocityToInertial: (p, v, t) => ecefToInertial(add(v, cross(frame.spin, p)), angle(t)),
    place: (r, t) => ecefToGeodetic(inertialToEcef(r, angle(t))),
    upOver,
    up: (r, t) => upOver(ecefToGeodetic(inertialToEcef(r, angle(t))), t),
  };
}

/** A start's place moved out from the Earth's centre by one part in `1 / by`. */
const out = (r, by) => (by ? r.map((c) => c * (1 + by)) : r);

/**
 * Each captured prediction of `flight`, by its run's name: `make({ nudge, turn })` makes it, its start's place moved out
 * by `nudge` (a fraction) and the frame it is made in turned by `turn` (radians), and gives its figures.
 */
export function predictions(flight) {
  const site = siteFrame(flight.site);
  const sea = flight.site.seaLevel.value;
  const frame = frameOf(flight);
  const plan = flight.plan;
  const list = [];
  if (plan.kind === 'ballistic') {
    const whole = fly(plan, site, sea, undefined, undefined, undefined, frame);
    for (const t0 of [60, 200, 400]) {
      const s = sampleAt(whole.samples, t0);
      list.push({
        run: `predict:T+${t0}`,
        make: ({ nudge = 0, turn = 0 } = {}) =>
          pathFigures(predict(plan, site, sea, { ...s, r: out(s.r, nudge) }, { frame: turned(frame, turn) })),
      });
    }
    return list;
  }
  if (!plan.attitude.some((a) => 'law' in a.hold)) return list;
  const seq = sequenceOf(plan);
  const x = steer(plan, site, frame, sea);
  // (every step of the coast kept, as it was when these starts were first taken: the start "forty minutes before the burn"
  // is the first sample from then, and a coast kept by how fast its motion changes has its next one minutes later)
  KEPT.quiet = false;
  const shown = flyWhole(plan, site, frame, sea, x, 10);
  KEPT.quiet = true;
  const a = shown.ascent;
  const where = (turn) => ({ site, seaLevel: sea, frame: turned(frame, turn) });
  // from separation; on a flight whose burn is more than a revolution away (a day in orbit), from the coast forty minutes
  // before it (as tests/staged.test.mjs)
  const sep = a.separation;
  const on = coastOf(plan).on;
  const late = on - sep.t > 5000 ? shown.coast.samples.find((p) => p.t >= on - 2400) : null;
  const from = late ?? sep;
  list.push({
    run: 'predict:spacecraft',
    make: ({ nudge = 0, turn = 0 } = {}) => {
      const start = { t: from.t, r: out(from.r, nudge), v: from.v };
      const job = propagate(spacecraft(plan, turned(frame, turn), site, sea, start), start, where(turn));
      job.run();
      return pathFigures(job.result);
    },
  });
  const s100 = a.samples.find((p) => p.t >= 100);
  list.push({
    run: 'predict:stack@100',
    make: ({ nudge = 0, turn = 0 } = {}) => {
      const start = { t: s100.t, r: out(s100.r, nudge), v: s100.v };
      const gone = seq.stages.filter((k) => k.sep <= s100.t).reduce((m, k) => Math.max(m, k.sep), 0);
      const job = propagate(stack(plan, site, sea, s100.mass, gone, turned(frame, turn)), start, where(turn));
      job.run();
      return pathFigures(job.result);
    },
  });
  for (const t0 of [40, 150, 400]) {
    const s = a.samples.find((p) => p.t >= t0);
    if (!s || s.t >= a.separation.t) continue; // (an ascent over before it: a Mercury-Atlas's, five minutes)
    list.push({
      run: `predict:guided@${t0}`,
      make: ({ nudge = 0, turn = 0 } = {}) => {
        const dated = turned(frame, turn);
        const sv = stagedVehicle(plan, site, dated, sea, x);
        const state = {
          stages: seq.stages.map((k, i) => ({
            from: k.from <= s.t ? k.from : Infinity,
            to: a.stops[i] <= s.t ? a.stops[i] : Infinity,
            gone: k.sep <= s.t ? k.sep : Infinity,
            loose: k.sep <= s.t ? k.sep : Infinity,
          })),
          drops: Object.fromEntries(seq.drops.filter((d) => d.at <= s.t).map((d) => [d.joint, d.at])),
        };
        state.apparent = apparentBy(plan, sv, state, s.t);
        const start = { t: s.t, r: out(s.r, nudge), v: s.v };
        const job = propagate(
          guided(plan, site, sea, start, {
            vehicle: sv,
            solved: x,
            state,
            sequence: true,
            thetaTurn: s.t > guidanceOf(plan).turn.value ? a.thetaTurn : null,
            plan,
          }),
          start,
          where(turn),
        );
        job.run();
        const p = job.result;
        const parted = p.events.find((e) => e.kind === 'separation');
        const cut = p.events.find((e) => e.kind === 'cutoff');
        return {
          ...pathFigures(p),
          cutoffT: cut?.t,
          partedT: parted?.t,
          partedRadius: parted ? length(parted.r) : null,
          partedSpeed: parted ? length(parted.v) : null,
        };
      },
    });
  }
  return list;
}

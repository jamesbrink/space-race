/**
 * The predicted path of a flight in orbit (viewer/path.ts draws it, as it draws a ballistic flight's from predict.ts):
 * where the spacecraft goes from the instant on show if nothing more is done than what is planned (the timer's
 * braking burn, or the one a hand has fired), flown by the same coast the record is (orbital.ts: flyOrbit), so the path
 * and the flight agree. Round once if it stays up; down to the ejection height if it comes down. In fly.ts's frame that
 * does not turn (Greenwich on +X at liftoff), as every run the scene shows.
 */
import { angleBetween, type Geodetic, geodeticToEcef, type Vec3 } from '../world/frames.ts';
import { greenwichSiderealTime } from '../world/time.ts';
import { MEAN_RADIUS } from './fly.ts';
import { flyOrbit, type OrbitalFlight } from './orbital.ts';
import { elements, type PathEvent, type PathPlace, type PathPoint, type Prediction, type Predictor } from './predict.ts';

/** How often the coast's samples are kept for the line, s: a sixtieth of an orbit, and finer coming down (flyOrbit keeps every step's end there at most). */
const EVERY = 30;

export function orbitPredictor(
  plan: OrbitalFlight,
  site: Geodetic,
  launchJd: number,
  seaLevel: number,
  start: { t: number; r: Vec3; v: Vec3 },
): Predictor {
  let result: Prediction | null = null;
  const work = (): Prediction => {
    const began = performance.now();
    const gast0 = greenwichSiderealTime(launchJd);
    const turn = (v: Vec3, by: number): Vec3 => [
      Math.cos(by) * v[0] - Math.sin(by) * v[1],
      Math.sin(by) * v[0] + Math.cos(by) * v[1],
      v[2],
    ];
    // (into frames.ts's inertial frame of date, which the coast flies in, and back)
    const from = { t: start.t, r: turn(start.r, gast0), v: turn(start.v, gast0) };
    const flown = flyOrbit(plan, site, launchJd, seaLevel, EVERY, from);
    const el = elements(start.r, start.v, plan.orbit.radius.value);
    const down = flown.samples[flown.samples.length - 1]!.phase === 'down';
    // once round, if it stays up
    const end = down ? Infinity : start.t + (Number.isFinite(el.period) ? el.period : 6 * 3600);
    const points: PathPoint[] = flown.samples
      .filter((s) => s.t <= end)
      .map((s) => ({ t: s.t, r: turn(s.r, -gast0), v: turn(s.v, -gast0), altitude: s.altitude }));
    const place = (p: PathPoint, s: { latitude: number; longitude: number }): PathPlace => ({
      ...p,
      latitude: s.latitude,
      longitude: s.longitude,
    });
    const kept = flown.samples.filter((s) => s.t <= end);
    let hi = 0;
    let lo = 0;
    kept.forEach((s, i) => {
      if (s.altitude > kept[hi]!.altitude) hi = i;
      if (s.altitude < kept[lo]!.altitude) lo = i;
    });
    const r = flown.results;
    const events: PathEvent[] = [];
    const at = (t: number): PathPoint => points.reduce((best, p) => (Math.abs(p.t - t) < Math.abs(best.t - t) ? p : best), points[0]!);
    // (an event is marked only where the path reaches it: a burn planned after it has come down is not on it)
    const last = points[points.length - 1]!.t;
    if (plan.retro.on.value > start.t && plan.retro.on.value <= Math.min(end, last))
      events.push({ ...at(plan.retro.on.value), kind: 'retro' });
    if (Number.isFinite(r.entryAt) && r.entryAt > start.t) events.push({ ...at(r.entryAt), kind: 'entry' });
    if (Number.isFinite(r.entryGAt) && r.entryGAt > start.t) events.push({ ...at(r.entryGAt), kind: 'peak', value: r.entryG });
    const final = kept[kept.length - 1]!;
    return {
      kind: 'coast',
      from: start.t,
      cutoff: null,
      points,
      outcome: down ? 'impact' : Number.isFinite(el.period) ? 'orbit' : 'limit',
      apogee: down && hi === kept.length - 1 ? null : place(points[hi]!, kept[hi]!),
      perigee: down ? null : place(points[lo]!, kept[lo]!),
      // (it ends where the pilot leaves, at the ejection height: the descent under parachutes is not predicted)
      impact: down
        ? {
            ...place(points[points.length - 1]!, final),
            // (over the ground from the pad, as predict.ts gives it: the angle between the two from the Earth's centre)
            range: angleBetween(geodeticToEcef({ ...final, height: 0 }), geodeticToEcef({ ...site, height: 0 })) * MEAN_RADIUS,
            speed: r.ejectionSpeed,
          }
        : null,
      orbit: Number.isFinite(el.period)
        ? { ...el, apoapsisHeight: el.apoapsis - plan.orbit.radius.value, periapsisHeight: el.periapsis - plan.orbit.radius.value }
        : null,
      events: events.sort((a, b) => a.t - b.t),
      chute: false,
      steps: flown.samples.length,
      cost: performance.now() - began,
    };
  };
  return {
    run(): boolean {
      result ??= work();
      return true;
    },
    get done() {
      return result !== null;
    },
    get result() {
      return result ?? (result = work());
    },
  };
}

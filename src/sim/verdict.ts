/**
 * How a flight flown by hand ended, said plainly: what it came down under and how fast, why, and
 * whether the pilot aboard could have lived through the loads and the landing by the limits the
 * flight's data gives (`Body.capsule.limits`, each with its confidence). No score: what happened.
 */
import type { Trajectory } from '../types';
import type { Results } from './fly.ts';
import type { OrbitalFlight } from './orbital.ts';
import type { FlownWhole } from './staged.ts';
import type { VehicleState } from './vehicle.ts';

export interface Verdict {
  /** One line: what it came down under, and how fast. */
  how: string;
  /** Why, where something was not done or was done wrong: each a sentence. */
  why: string[];
  /** Whether the landing and the loads were within the limits given; null where the flight gives none. */
  survivable: boolean | null;
  /** The limits it was held to, as said to the pilot, with how sure they are. */
  against: string;
}

export function verdict(state: VehicleState, results: Results, trajectory: Trajectory, peakG: number): Verdict {
  const landing = state.landing!;
  const speed = Math.hypot(landing.vertical, landing.horizontal);
  const why: string[] = [];
  let how: string;
  if (!state.shed.booster) {
    how = `Hit the ${landing.t < 30 ? 'ground' : 'surface'} with the booster at ${speed.toFixed(0)} m/s`;
    why.push(state.abortAt === null ? 'The spacecraft was never parted from it, and no abort was called.' : '');
  } else if (state.mainAt !== null) {
    how = state.torn.main
      ? `Hit the sea at ${landing.vertical.toFixed(0)} m/s under what was left of the main parachute`
      : `Down under the main parachute at ${landing.vertical.toFixed(1)} m/s`;
    if (state.torn.main) why.push('The main parachute had torn.');
    if (!state.shed.retropack) why.push('The retropack was still on: it came down heavier, and faster, than the record’s landing.');
    if (state.drogueAt === null && state.abortAt === null) why.push('The drogue was never out: the main opened without it.');
  } else if (state.drogueAt !== null) {
    how = `Hit the sea at ${landing.vertical.toFixed(0)} m/s under ${state.torn.drogue ? 'what was left of the drogue' : 'the drogue alone'}`;
    why.push('The main parachute was never deployed.');
  } else {
    how = `Hit the sea at ${landing.vertical.toFixed(0)} m/s`;
    why.push(state.shed.tower ? 'No parachute was deployed.' : 'The escape tower was still on: no parachute can come out past it.');
  }
  // (an abort off the pad with the engine never lit came after no ignition)
  if (state.abortAt !== null) {
    // where the rocket's line, set off the centre of mass, carried it: said for an abort from low down, where clear of the booster is the point
    const low = (state.abortHeight ?? 0) < 1000;
    if (low && state.shed.booster && Number.isFinite(results.range))
      why.unshift(`It came down ${results.range.toFixed(0)} m from the pad, ${results.apogee.toFixed(0)} m at its highest.`);
    why.unshift(
      state.ignited
        ? `Aborted on the escape rocket ${state.abortAt.toFixed(1)} s after ignition.`
        : 'Aborted off the pad on the escape rocket: the engine was never lit.',
    );
  }
  const limits = trajectory.body?.capsule.limits;
  if (!limits) return { how, why: why.filter(Boolean), survivable: null, against: '' };
  const hard = speed > limits.landingSpeed.value;
  const heavy = peakG > limits.load.value;
  if (hard) why.push(`The landing was at ${speed.toFixed(1)} m/s: the limit taken is ${limits.landingSpeed.value.toFixed(1)} m/s.`);
  if (heavy) why.push(`The greatest load was ${peakG.toFixed(1)} g: the limit taken is ${limits.load.value.toFixed(0)} g.`);
  return {
    how,
    why: why.filter(Boolean),
    survivable: !hard && !heavy,
    against: `Held to a landing of ${limits.landingSpeed.value.toFixed(1)} m/s (${limits.landingSpeed.confidence}) and ${limits.load.value.toFixed(0)} g (${limits.load.confidence}); greatest load ${Math.max(peakG, results.exitG, results.entryG).toFixed(1)} g.`,
  };
}

/**
 * How an orbital flight's descent ended for its pilot, in the same manner (sim/orbital.ts flyDown, with the flight's
 * `descent.crew` limits): where he came down and how fast, aboard the module or under his own canopy; the air he met out of
 * it; each parachute torn or never let out; the modules parted late or never. `wall` writes an instant of the flight as the
 * clocks read it that day; `km(at)` is how far a landing is from the record's. A flight that stays up says how long its orbit
 * lasts (`decayed`, s, from orbital.ts `decay`) against the days its supplies last.
 */
export function downVerdict(
  o: OrbitalFlight,
  whole: FlownWhole,
  wall: (t: number) => string,
  km: (at: { latitude: number; longitude: number }) => number,
  decayed?: number,
): Verdict {
  const d = o.descent;
  const crew = d?.crew;
  const down = whole.down;
  const why: string[] = [];
  const days = (s: number) => (s / 86_400).toFixed(1);
  if (!down || !d || !crew) {
    const supplies = o.supplies?.days;
    const lasts =
      decayed === undefined
        ? ''
        : Number.isFinite(decayed)
          ? `its orbit lasts ${days(decayed)} days`
          : 'its orbit lasts more than sixty days';
    const enough = supplies && decayed !== undefined ? decayed < supplies.value * 86_400 : null;
    if (lasts) why.push(`As flown here ${lasts}, in the standard air (the day’s Sun, which moves that air several-fold, is not modelled).`);
    if (supplies)
      why.push(
        `The ship carried supplies for ${supplies.value.toFixed(0)} days (${supplies.confidence}): the orbit was chosen to come down within them if the braking engine failed.`,
      );
    return {
      how: 'Still in orbit: the braking engine spent, it comes down only as the air takes it',
      why,
      survivable: enough,
      against:
        enough === null ? '' : enough ? 'Down within the supplies, by this figure.' : 'Not down within the supplies, by this figure.',
    };
  }
  const tear = (body: string) =>
    Object.entries(down.torn[body] ?? {}).map(([name, x]) => {
      const c = d.bodies.find((b) => b.id === body)?.chutes.find((k) => k.name === name);
      const met = x.by === 'pressure' ? `${(x.q / 1000).toFixed(1)} kPa on its cloth` : `${(x.pull / 1000).toFixed(1)} kN on its lines`;
      const limit =
        x.by === 'pressure' ? `${((c?.strength?.value ?? 0) / 1000).toFixed(1)} kPa` : `${((c?.pull?.value ?? 0) / 1000).toFixed(1)} kN`;
      return `${body === d.bodies[0]?.id ? 'The module’s' : body === crew.alone ? 'His' : 'The'} ${name} tore at ${wall(x.t)}: ${met}, past the ${limit} taken (${(x.by === 'pressure' ? c?.strength : c?.pull)?.confidence ?? 'estimated'}).`;
    });
  const never = (body: string) => {
    const b = d.bodies.find((x) => x.id === body);
    return (b?.chutes ?? []).filter((c) => down.opened[body]?.[c.name] === undefined).map((c) => c.name);
  };
  const first = d.bodies[0]!;
  const module = down.landed[first.id];
  const ejected = Number.isFinite(down.ejected);
  // the modules: parted in the air, in orbit, or never
  const parted = o.entry.separation.value;
  if (!(parted < (module?.at ?? Number.POSITIVE_INFINITY)))
    why.push(
      `The instrument module was never parted: the ball came down with its ${(o.mass.value - o.entry.mass.value).toFixed(0)} kg hanging on (flown as weight without drag: the joined ship’s drag, and the heat that burned the cables through on the day, are not modelled).`,
    );
  else {
    const record = o.events.find((e) => e.id === 'modules')?.at.value;
    if (record !== undefined && Math.abs(parted - record) > 1)
      why.push(`The modules parted at ${wall(parted)}, where the record has ${wall(record)}.`);
  }
  let how: string;
  let landing: { speed: number; limit: number; confidence: string } | null = null;
  let blast = false;
  if (!ejected) {
    how = module
      ? `He rode the descent module down: on the ground at ${wall(module.at)}, ${km(module).toFixed(0)} km from Gagarin’s field, at ${module.speed.toFixed(1)} m/s`
      : 'He rode the descent module, and it is still up';
    why.push(`Never ejected: ${crew.aboard}.`);
    if (module) landing = { speed: module.speed, limit: crew.landing.aboard.value, confidence: crew.landing.aboard.confidence };
  } else {
    const alone = down.landed[crew.alone];
    const peak = down.peak[crew.alone]?.q ?? 0;
    const fast = down.peak[crew.alone]?.speed ?? 0;
    const hot = fast > crew.fastest.value;
    blast = peak > crew.blast.value || hot;
    how = alone
      ? `He came down under his own canopy: on the ground at ${wall(alone.at)}, ${km(alone).toFixed(0)} km from Gagarin’s field, at ${alone.speed.toFixed(1)} m/s`
      : down.up.includes(crew.alone)
        ? 'He left the ship in orbit: nothing brings a man in his suit down'
        : 'He left the ship';
    why.push(
      `Out of the ball at ${wall(down.ejected)}, he met at most ${(peak / 1000).toFixed(1)} kPa of the air${peak > crew.blast.value ? `: past the ${(crew.blast.value / 1000).toFixed(0)} kPa taken (${crew.blast.confidence}) as what a man on the open seat lives through` : ''}.`,
    );
    if (hot)
      why.push(
        `He was out in the air at ${fast.toFixed(0)} m/s: past the ${crew.fastest.value.toFixed(0)} m/s taken (${crew.fastest.confidence}) as the fastest a man in his suit comes through. Its heat is not modelled; nothing here says he lived.`,
      );
    const left = never(crew.alone);
    if (left.length) why.push(`Never let out: his ${left.join(', ')}.`);
    why.push(...tear(crew.alone));
    if (alone) landing = { speed: alone.speed, limit: crew.landing.alone.value, confidence: crew.landing.alone.confidence };
    if (down.up.includes(crew.alone)) blast = true;
  }
  // the module's own parachutes
  const unopened = never(first.id);
  if (unopened.length) why.push(`The module’s ${unopened.join(', ')} never came out.`);
  why.push(...tear(first.id));
  if (module && ejected)
    why.push(
      `The descent module landed at ${wall(module.at)}, ${km(module).toFixed(0)} km from the field, at ${module.speed.toFixed(1)} m/s.`,
    );
  const hard = landing !== null && landing.speed > landing.limit;
  if (landing && hard)
    why.push(
      `A landing at ${landing.speed.toFixed(1)} m/s: the most taken as lived through is ${landing.limit.toFixed(0)} m/s (${landing.confidence}).`,
    );
  const survivable = landing === null ? (blast ? false : null) : !hard && !blast;
  return {
    how,
    why,
    survivable,
    against: `Held to a landing of ${crew.landing.aboard.value.toFixed(0)} m/s aboard the module and ${crew.landing.alone.value.toFixed(0)} m/s under his canopy, and ${(crew.blast.value / 1000).toFixed(0)} kPa and ${crew.fastest.value.toFixed(0)} m/s out in the air: each ${crew.blast.confidence}, none found in the record.`,
  };
}

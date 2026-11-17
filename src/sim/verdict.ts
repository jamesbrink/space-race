/**
 * How a flight flown by hand ended, said plainly: what it came down under and how fast, why, and
 * whether the pilot aboard could have lived through the loads and the landing by the limits the
 * flight's plan gives (its `LimitDef`s: the landing speed and the load, each with its confidence). No score: what happened.
 */
import { hasLeft } from './craft.ts';
import { ballisticOf, type Results } from './fly.ts';
import { type Down, downOf } from './descent.ts';
import { crewWords, type DescentCrew, type DescentFlown, shipOf } from './orbital.ts';
import type { FlightPlan, Lands } from './plan.ts';
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

/**
 * How the words speak of where a flight came down and what in, from its data (`Craft.lands`): what the crew rode (as a
 * sentence goes on, and as one begins), what the record's landing was on, and the surface by its name ('the sea', 'the
 * ground'). A flight that does not say is spoken of as 'the spacecraft' coming down on 'the surface'.
 */
export function landsOf(plan: FlightPlan): { ship: string; Ship: string; on: Lands['on'] | null; surface: string } {
  const lands = plan.craft[0]?.lands;
  const ship = lands?.ship ?? 'the spacecraft';
  return {
    ship,
    Ship: `${ship[0]!.toUpperCase()}${ship.slice(1)}`,
    on: lands?.on ?? null,
    surface: lands?.on === 'sea' ? 'the sea' : lands?.on === 'land' ? 'the ground' : 'the surface',
  };
}

export function verdict(state: VehicleState, results: Results, plan: FlightPlan, peakG: number): Verdict {
  const roles = ballisticOf(plan);
  const { surface } = landsOf(plan);
  const landing = state.landing!;
  const speed = Math.hypot(landing.vertical, landing.horizontal);
  const why: string[] = [];
  let how: string;
  if (!hasLeft(state.craft, roles.booster.id)) {
    how = `Hit ${landing.t < 30 ? 'the ground' : surface} with the booster at ${speed.toFixed(0)} m/s`;
    why.push(state.abortAt === null ? 'The spacecraft was never parted from it, and no abort was called.' : '');
  } else if (state.mainAt !== null) {
    how = state.torn.main
      ? `Hit ${surface} at ${landing.vertical.toFixed(0)} m/s under what was left of the main parachute`
      : `Down under the main parachute at ${landing.vertical.toFixed(1)} m/s`;
    if (state.torn.main) why.push('The main parachute had torn.');
    if (!hasLeft(state.craft, roles.pack))
      why.push('The retropack was still on: it came down heavier, and faster, than the record’s landing.');
    if (state.drogueAt === null && state.abortAt === null) why.push('The drogue was never out: the main opened without it.');
  } else if (state.drogueAt !== null) {
    how = `Hit ${surface} at ${landing.vertical.toFixed(0)} m/s under ${state.torn.drogue ? 'what was left of the drogue' : 'the drogue alone'}`;
    why.push('The main parachute was never deployed.');
  } else {
    how = `Hit ${surface} at ${landing.vertical.toFixed(0)} m/s`;
    why.push(
      hasLeft(state.craft, roles.tower)
        ? 'No parachute was deployed.'
        : 'The escape tower was still on: no parachute can come out past it.',
    );
  }
  // (an abort off the pad with the engine never lit came after no ignition)
  if (state.abortAt !== null) {
    // where the rocket's line, set off the centre of mass, carried it: said for an abort from low down, where clear of the booster is the point
    const low = (state.abortHeight ?? 0) < 1000;
    if (low && hasLeft(state.craft, roles.booster.id) && Number.isFinite(results.range))
      why.unshift(`It came down ${results.range.toFixed(0)} m from the pad, ${results.apogee.toFixed(0)} m at its highest.`);
    why.unshift(
      state.ignited
        ? `Aborted on the escape rocket ${state.abortAt.toFixed(1)} s after ignition.`
        : 'Aborted off the pad on the escape rocket: the engine was never lit.',
    );
  }
  const held = plan.craft[0]!.limits;
  const landingSpeed = held.find((l) => l.of === 'landing-speed')?.value;
  const load = held.find((l) => l.of === 'load')?.value;
  const limits = landingSpeed && load ? { landingSpeed, load } : null;
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
 * How an orbital flight's descent ended for its pilot, in the same manner (sim/orbital.ts flyDown, with its plan's crew
 * limits, `Craft.crew`): where he came down and how fast, aboard the module or under his own canopy; the air he met out of
 * it; each parachute torn or never let out; the modules parted late or never. `wall` writes an instant of the flight as the
 * clocks read it that day; `km(at)` is how far a landing is from the record's. A flight that stays up says how long its orbit
 * lasts (`decayed`, s, from orbital.ts `decay`) against the days its supplies last.
 */
export function downVerdict(
  plan: FlightPlan,
  whole: FlownWhole,
  wall: (t: number) => string,
  km: (at: { latitude: number; longitude: number }) => number,
  decayed?: number,
): Verdict {
  const d = downOf(plan);
  const crew = plan.craft[0]!.crew;
  const ship = shipOf(plan);
  // (what came down, as the flight's data names it)
  const { ship: rode, Ship: Rode } = landsOf(plan);
  const down = whole.down;
  const why: string[] = [];
  const days = (s: number) => (s / 86_400).toFixed(1);
  if (!down || !d) {
    const supplies = plan.record?.supplies;
    const lasts =
      decayed === undefined
        ? ''
        : Number.isFinite(decayed)
          ? `its orbit lasts ${days(decayed)} days`
          : 'its orbit lasts more than sixty days';
    const enough = supplies && decayed !== undefined ? decayed < supplies.value * 86_400 : null;
    if (lasts)
      why.push(
        `As flown here ${lasts}, in the standard air as the Sun moved it on the days flown (Jacchia 1971) and the mean standard after them.`,
      );
    if (supplies)
      why.push(
        `The ship carried supplies for ${supplies.value.toFixed(0)} days (${supplies.confidence}): the orbit was chosen to come down within them if the braking burn failed.`,
      );
    return {
      how: 'Still in orbit: its braking burn done, it comes down only as the air takes it',
      why,
      survivable: enough,
      against:
        enough === null ? '' : enough ? 'Down within the supplies, by this figure.' : 'Not down within the supplies, by this figure.',
    };
  }
  const { tear, never } = said(d, crew, down, wall, Rode);
  const first = d.bodies[0]!;
  const module = down.landed[first.id];
  // (a crew that lands in the ship leaves it at no height: its descent's first event at a height is its own sequence's)
  const ejected = crew?.alone !== undefined && Number.isFinite(down.ejected);
  // the modules: parted in the air, in orbit, or never
  const parted = ship.parted;
  if (!(parted < (module?.at ?? Number.POSITIVE_INFINITY)))
    why.push(
      `${partedOf(plan) ?? 'What it was to leave in orbit'} was never parted: ${rode} came down with its ${(ship.mass - ship.entry.mass).toFixed(0)} kg hanging on (flown as weight without drag: the joined ship’s drag is not modelled).`,
    );
  else {
    // (the record's instant of the parting: a plan changed by a hand keeps it, `at`)
    const record = plan.events.find((e) => e.id === ship.parting)?.at?.value;
    if (record !== undefined && Math.abs(parted - record) > 1)
      why.push(`The modules parted at ${wall(parted)}, where the record has ${wall(record)}.`);
  }
  let how: string;
  let landing: { speed: number; limit: number; confidence: string } | null = null;
  let blast = false;
  const { who } = crewWords(crew);
  if (!crew) {
    // (a flight whose data holds its crew to no limits: what came down, and no verdict on them)
    how = module ? `${Rode} came down, ${landed(module, wall, km, 'the record’s landing')}` : `${Rode} is still up`;
  } else if (!ejected || crew.alone === undefined) {
    how = module
      ? `${who} rode ${rode} down, ${landed(module, wall, km, 'the record’s landing')}`
      : `${who} rode ${rode}, and it is still up`;
    why.push(crew.alone === undefined ? `${crew.aboard}.` : `Never ejected: ${crew.aboard}.`);
    if (module) landing = { speed: module.speed, limit: crew.landing.aboard.value, confidence: crew.landing.aboard.confidence };
  } else {
    const out = outOfShip(d, { ...crew, alone: crew.alone }, down, wall, km, 'the record’s landing', why, rode);
    how = out.how;
    landing = out.landing;
    blast = out.blast;
  }
  // the module's own parachutes
  const unopened = never(first.id);
  if (unopened.length) why.push(`${Rode}’s ${unopened.join(', ')} never came out.`);
  why.push(...tear(first.id));
  if (module && ejected)
    why.push(
      `${Rode} landed at ${wall(module.at)}, ${km(module).toFixed(0)} km from the record’s landing, at ${module.speed.toFixed(1)} m/s.`,
    );
  return held(crew, how, why, landing, blast, rode);
}

/** The verdict's end, whoever came down: the landing against its limit, whether it was lived through, and the limits said. */
function held(
  crew: DescentCrew | undefined,
  how: string,
  why: string[],
  landing: { speed: number; limit: number; confidence: string } | null,
  blast: boolean,
  rode: string,
): Verdict {
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
    against: !crew
      ? ''
      : crew.alone === undefined
        ? `Held to a landing of ${crew.landing.aboard.value.toFixed(1)} m/s aboard ${rode} (${crew.landing.aboard.confidence}): not a figure found in the record.`
        : `Held to a landing of ${crew.landing.aboard.value.toFixed(0)} m/s aboard ${rode} and ${crew.landing.alone!.value.toFixed(0)} m/s under ${crewWords(crew).their} canopy, and ${(crew.blast!.value / 1000).toFixed(0)} kPa and ${crew.fastest!.value.toFixed(0)} m/s out in the air: each ${crew.blast!.confidence}, none found in the record.`,
  };
}

/** What a descent flown says of each body's parachutes: each that tore, against its limit; those never let out. */
function said(d: Down, crew: DescentCrew | undefined, down: DescentFlown, wall: (t: number) => string, Rode: string) {
  const tear = (body: string) =>
    Object.entries(down.torn[body] ?? {}).map(([name, x]) => {
      const c = d.bodies.find((b) => b.id === body)?.chutes.find((k) => k.name === name);
      const met = x.by === 'pressure' ? `${(x.q / 1000).toFixed(1)} kPa on its cloth` : `${(x.pull / 1000).toFixed(1)} kN on its lines`;
      const limit =
        x.by === 'pressure' ? `${((c?.strength?.value ?? 0) / 1000).toFixed(1)} kPa` : `${((c?.pull?.value ?? 0) / 1000).toFixed(1)} kN`;
      return `${body === d.bodies[0]?.id ? `${Rode}’s` : body === crew?.alone ? `${crewWords(crew).their[0]!.toUpperCase()}${crewWords(crew).their.slice(1)}` : 'The'} ${name} tore at ${wall(x.t)}: ${met}, past the ${limit} taken (${(x.by === 'pressure' ? c?.strength : c?.pull)?.confidence ?? 'estimated'}).`;
    });
  const never = (body: string) => {
    const b = d.bodies.find((x) => x.id === body);
    return (b?.chutes ?? []).filter((c) => down.opened[body]?.[c.name] === undefined).map((c) => c.name);
  };
  return { tear, never };
}

/**
 * The crew out of the ship on their own (`DescentCrew.alone`): where they came down and how fast, `km` from `from`; the air
 * they met out of it and its speed against the limits; each of their parachutes torn or never let out. Pushes the reasons on
 * `why`; returns the line, the landing against its limit, and whether the air alone was past what is lived through.
 */
function outOfShip(
  d: Down,
  crew: DescentCrew & { alone: string },
  down: DescentFlown,
  wall: (t: number) => string,
  km: (at: { latitude: number; longitude: number }) => number,
  from: string,
  why: string[],
  rode: string,
): { how: string; landing: { speed: number; limit: number; confidence: string } | null; blast: boolean } {
  const { tear, never } = said(d, crew, down, wall, `${rode[0]!.toUpperCase()}${rode.slice(1)}`);
  const { who, they, their } = crewWords(crew);
  const alone = down.landed[crew.alone];
  const peak = down.peak[crew.alone]?.q ?? 0;
  const fast = down.peak[crew.alone]?.speed ?? 0;
  const hot = fast > crew.fastest!.value;
  let blast = peak > crew.blast!.value || hot;
  const how = alone
    ? `${who} came down under ${their} own canopy, ${landed(alone, wall, km, from)}`
    : down.up.includes(crew.alone)
      ? `${who} left the ship in orbit: nothing brings anyone in a suit down`
      : `${who} left the ship`;
  why.push(
    `Out of ${rode} at ${wall(down.ejected)}, ${they} met at most ${(peak / 1000).toFixed(1)} kPa of the air${peak > crew.blast!.value ? `: past the ${(crew.blast!.value / 1000).toFixed(0)} kPa taken (${crew.blast!.confidence}) as what a man on the open seat lives through` : ''}.`,
  );
  if (hot)
    why.push(
      `${who} was out in the air at ${fast.toFixed(0)} m/s: past the ${crew.fastest!.value.toFixed(0)} m/s taken (${crew.fastest!.confidence}) as the fastest a man in a suit comes through. Its heat is not modelled; nothing here says he lived.`,
    );
  const left = never(crew.alone);
  if (left.length) why.push(`Never let out: ${their} ${left.join(', ')}.`);
  why.push(...tear(crew.alone));
  const landing = alone ? { speed: alone.speed, limit: crew.landing.alone!.value, confidence: crew.landing.alone!.confidence } : null;
  if (down.up.includes(crew.alone)) blast = true;
  return { how, landing, blast };
}

/**
 * How an abort's ejection from the launch vehicle ended for the crew (orbital.ts `flyEjected`, `AbortMode.escape.eject`):
 * as `downVerdict` says it of a pilot out of the ball, the landing `km(at)` from the pad. Null where nobody left the ship.
 */
export function ejectedVerdict(
  plan: FlightPlan,
  down: DescentFlown,
  wall: (t: number) => string,
  km: (at: { latitude: number; longitude: number }) => number,
): Verdict | null {
  const d = downOf(plan);
  const crew = plan.craft[0]!.crew;
  if (!d || crew?.alone === undefined) return null;
  const why: string[] = [];
  const { ship } = landsOf(plan);
  const out = outOfShip(d, { ...crew, alone: crew.alone }, down, wall, km, 'the pad', why, ship);
  return held(crew, out.how, why, out.landing, out.blast, ship);
}

/**
 * A landing said as a landing, whatever it came down on: the record's landing names its own sea or land, and a run flown
 * by other hands comes down where they took it.
 */
function landed(
  l: { at: number; speed: number; latitude: number; longitude: number },
  wall: (t: number) => string,
  km: (at: { latitude: number; longitude: number }) => number,
  from: string,
): string {
  return `landing at ${wall(l.at)}, ${km(l).toFixed(0)} km from ${from}, at ${l.speed.toFixed(1)} m/s`;
}

/** What the modules' parting leaves in orbit, by the plan's own names for it ('Instrument module', 'Retrograde section'), or null. */
function partedOf(plan: FlightPlan): string | null {
  const c = plan.craft[0]!;
  const e = plan.events.find((x) => x.id === shipOf(plan).parting);
  const joints = (e?.do ?? []).flatMap((a) => ('separate' in a ? [a.separate] : []));
  const labels = c.joints
    .filter((j) => joints.includes(j.id))
    .flatMap((j) => j.gone)
    .map((id) => c.bodies.find((b) => b.id === id)?.label)
    .filter((x): x is string => Boolean(x));
  return labels.length ? `The ${labels.map((l) => l.toLowerCase()).join(' and the ')}` : null;
}

import { downOf } from '../../sim/descent.ts';
import { along, MEAN_RADIUS } from '../../sim/fly.ts';
import {
  type EscapeState,
  type EscapeSweep,
  launchEscape,
  ORBIT_SLACK,
  planAfterEscape,
  withEscapeTranslation,
  withServiceAbort,
} from '../../sim/launchescape.ts';
import { handRange } from '../../sim/lever.ts';
import { crewWords, flyEjected, heightsBall, shipOf } from '../../sim/orbital.ts';
import { type AbortMode, abortAt, type FlightPlan, type TowerEscape } from '../../sim/plan.ts';
import { aboutAxis, conjugate, multiply, turn } from '../../sim/rigid.ts';
import { firesOf, floatUprighting, grown, orbitalEvents, orbitalFlown, orbitalRelease } from '../../sim/run.ts';
import { Sheds } from '../../sim/shed.ts';
import { drawnOf, flowOf, flyOn, integral, recordSamples, sequenceOf, stagesOf } from '../../sim/staged.ts';
import { ascentSample, type StagedState, StagedTally, type StagedVehicle, type Step, stagedPilot } from '../../sim/stagedlive.ts';
import { type LiveSample, TICK } from '../../sim/vehicle.ts';
import { missionTime } from '../../world/clock.ts';
import { sunPosition } from '../../world/ephemeris.ts';
import { angleBetween, cross, DEG, dot, length, scale, siteFrame, sub, type Vec3 } from '../../world/frames.ts';
import { elementsOf } from '../../world/orbit.ts';
import { julianDate, terrestrialTime } from '../../world/time.ts';
import { ABORT_ARMED, FINE, HOLD_TURN, TRIM, TRIM_MOST } from '../deck.ts';
import type { OrbitDeck } from '../orbitdeck.ts';
import { freeHands, pushOf } from './coast.ts';
import { KM } from './phase.ts';

/**
 * The ascent (phase.ts): the flight on its launch vehicle, from the pad to the parting. The record's steps and the hands'
 * (`nextStep`, `undone`), the flight taken over (`takeOver`, `begin`) and lit by hand, the lever's cuts, what is dropped on the
 * way, the aborts and their escapes, the stages' propellant, and the parting that ends it (`parted`). Functions of the
 * deck's state (orbitdeck.ts), each what was a method of it.
 */

/** A stage's name, short: before its first comma ('Strap-on boosters, Blocks B, V, G, D' is 'Strap-ons'). */
export const short = (name: string) => name.split(',')[0]!.replace('Strap-on boosters', 'Strap-ons');
/** The record's stages as a plan has them, base first: when each is lit, cut (its own cut's record instant, or its letting go where it has none) and let go, s. */
/**
 * Each stage as the record's run has it: lit, stopped and let go. A stage its guidance cuts on the state (its speed, the
 * orbit reached) stops when the run stops it (`stops`, the run's own), and one let go so long after such a stop is let go
 * that long after; every other instant is the record's.
 */
export const recordStages = (plan: FlightPlan, stops?: readonly number[]) =>
  sequenceOf(plan).stages.map((k, i) => {
    const stop = stops?.[i];
    const own = (k.orbit || k.speed !== null) && stop !== undefined && Number.isFinite(stop);
    return { from: k.from, cut: own ? stop : (k.cutAt ?? k.sep), sep: own && k.wait !== null ? stop + k.wait : k.sep };
  });

/** Whether a step of the launch vehicle is still to be taken on the flight on show at the clock's instant. */
export function undone(deck: OrbitDeck, st: Step): boolean {
  const s = deck.state;
  const v = deck.vehicleOf();
  if (deck.mine === null || !s) {
    // the record's: what has not happened by now (a stage cut or let go at its time, a drop at its)
    const t = deck.clock.t;
    const plan = deck.recordPlan;
    if (st.kind === 'drop') return (sequenceOf(plan).drops.find((d) => d.joint === st.id)?.at ?? -Infinity) > t;
    const g = recordStages(plan, orbitalFlown(deck.flight).ascent.stops)[st.stage];
    if (!g || g.sep <= t) return false;
    if (st.kind === 'ignite') return g.from > t;
    if (st.kind === 'cut') return g.from <= t && g.cut > t;
    return true;
  }
  if (st.kind === 'drop') return !Number.isFinite(s.drops[st.id] ?? Infinity);
  const g = s.stages[st.stage];
  if (!g || Number.isFinite(g.gone)) return false;
  if (st.kind === 'ignite') return !Number.isFinite(g.from);
  if (st.kind === 'cut') return Number.isFinite(g.from) && v.burning(s, st.stage);
  return true;
}

/**
 * The spacecraft's escape the record has for the clock's instant on the launch vehicle (`PlanRecord.aborts`, each mode
 * `until` its second: plan.ts `abortAt`), or why there is none to fly; null when there is one. A mode the record says no
 * more of than words (`AbortMode.escape` left out) is said and not flown, and so is a seat a crew did not have.
 */
export function abortWhy(deck: OrbitDeck, preferOrbit = false): string | null {
  const t = deck.clock.t;
  if (deck.ascended || t > deck.parting) return 'The spacecraft has left its launch vehicle: there is nothing to escape from';
  if (deck.state?.broke && t >= deck.state.broke.t - 1e-9) return 'Broken up';
  if (deck.aborted) return 'Aborted already';
  const plan = deck.recordPlan;
  if (!plan.record?.aborts?.length) return 'This flight’s record gives no mode of escape from its launch vehicle: none is flown here';
  const mode = abortAt(plan, t, preferOrbit);
  if (!mode) return 'Past the last of the escape’s modes';
  if (!mode.escape) return `By the record, ${mode.does} This mode is described in the record.`;
  if (t <= 0 && !deck.clock.running && !deck.state && !mode.escape.tower) return 'On the pad: the escape begins with flight';
  if (mode.escape.eject && plan.craft[0]!.crew?.alone === undefined)
    return `By the record, ${mode.does}; but this ship’s crew had no seats to leave it on. Not flown here`;
  return null;
}

/** X: the first press arms the abort and says what it would do; a second within two seconds does it. */
export function abortAsked(deck: OrbitDeck, preferOrbit: boolean, input: (string | number)[]): void {
  const why = abortWhy(deck, preferOrbit);
  if (why) return void deck.host.say?.('Abort', why);
  const now = deck.now() / 1000;
  const mode = abortAt(deck.recordPlan, deck.clock.t, preferOrbit)!;
  if (now - deck.abortArmed > ABORT_ARMED || deck.abortArmedFor !== mode) {
    deck.abortArmed = now;
    deck.abortArmedFor = mode;
    return void deck.host.say?.('Abort armed', `Again to abort: ${mode.does}`);
  }
  deck.abortArmed = Number.NEGATIVE_INFINITY;
  deck.abortArmedFor = null;
  abort(deck, mode, input);
}

/**
 * The escape's `mode` at the clock's instant, as the record has the hardware do it (`AbortMode.escape`): every stage
 * burning cut, the crew ejected at once from the stack's state (or, `falling`, as the falling stack comes down through
 * its height: `fly`), the last stage let go. The cuts and the letting go are asked of the live vehicle as steps, so
 * what parts and when is its physics: held in while the fairing covers it, pressed on until the push falls
 * (sim/staging.ts). With `separate.entry` the modules part once the spacecraft has (`parted`).
 */
export function abort(deck: OrbitDeck, mode: AbortMode, input: (string | number)[]): void {
  const plan = deck.recordPlan;
  const e = mode.escape!;
  const v = deck.vehicleOf();
  if (!deck.state && deck.clock.t <= 0 && e.tower) begin(deck, v.start(), 0);
  else if (deck.mine === null) takeOver(deck);
  const s = deck.state!;
  deck.aborted = { mode, t: s.t };
  deck.run!.launchAborted = true;
  deck.eventAt = deck.now() / 1000;
  deck.host.say?.('Abort', mode.does);
  if (e.tower) {
    escapeOnTower(deck, e.tower, s, input);
    if (!deck.clock.running) deck.clock.play(true);
    return;
  }
  const stages = stagesOf(plan);
  const steps: Step[] = e.cut ? stages.flatMap((_, i) => (v.burning(s, i) ? [{ kind: 'cut' as const, stage: i }] : [])) : [];
  if (e.separate) steps.push({ kind: 'separate', stage: stages.length - 1 });
  deck.asked.push(...steps);
  if (e.eject && !e.eject.falling) eject(deck, v.aboard(s, deck.centre));
  if (!deck.clock.running) deck.clock.play(true);
}

/** Lift the capsule away from the stages, then continue on its ordinary Earth landing system. */
export function escapeOnTower(deck: OrbitDeck, tower: TowerEscape, state: StagedState, input: (string | number)[]): void {
  const source = deck.recordPlan;
  const v = deck.vehicleOf();
  const station = tower.hull?.centre.value ?? deck.centre;
  const first = v.sample(state, station);
  const site = siteFrame(deck.flight.site);
  const sea = deck.flight.site.seaLevel.value;
  const start = { ...v.aboard(state, station), axis: first.axis };
  const runEscape = (sweep?: EscapeSweep) => launchEscape(source, tower, start, deck.frame, sea, sweep);
  const track = tower.hull ? deck.escapeFromPad(tower.hull.obstacles, first.t, input, runEscape) : runEscape();
  const release = track.at(-1)!;
  deck.padGrazes = track.flatMap((point) => (point.impact && !point.impact.activeBroken ? [point.impact] : []));
  if (release.impact?.activeBroken) return void endPadEscape(deck, tower, state, first, track);
  const escapeSamples = escapeSamplesOf(deck, track, first, tower.engine);
  const last = escapeSamples.at(-1)!;
  const plan = planAfterEscape(source, tower, release.t);
  const down = downOf(plan)!;
  const cover =
    release.t + (release.t - first.t <= tower.jettison.after.value + 0.2 ? tower.coverAfter.low.value : tower.coverAfter.high.value);
  const hands = { given: { [down.ejection]: cover }, switched: [] };
  const stops = state.stages.map((record) => Math.min(record.to, record.gone, state.t));
  deck.ascended = {
    ...orbitalFlown(deck.flight).ascent,
    samples: [ascentSample(v, state)],
    separation: release,
    stops,
  };
  deck.state = { ...state, parted: { t: first.t, r: first.r, v: first.v, stageMass: 0 } };
  deck.flown = flyOn(plan, site, deck.frame, sea, deck.ascended, release, hands);
  deck.flownPlan = plan;
  deck.flownAt++;
  deck.planned = plan;
  deck.partedBy = release.t;
  deck.given = hands.given;
  const run = deck.run!;
  const jd = julianDate(deck.flight.launch);
  const samples = recordSamples(
    plan,
    deck.flown,
    deck.frame,
    station,
    (at) => sunPosition(terrestrialTime(jd + at / 86_400)),
    last.attitude,
    true,
  );
  const tail = samples.filter((sample) => sample.t > release.t + 1e-9);
  const before = samples.filter((sample) => sample.t <= state.t && sample.riding);
  const joined = [...before, ...escapeSamples, ...tail];
  const changes: Record<string, number> = Object.fromEntries(tower.stages.map((id) => [id, state.t]));
  changes[tower.service] = state.t;
  changes[tower.tower] = release.t;
  changes[tower.cover] = deck.flown.down?.ejected ?? cover;
  const drops = deck.flight.flies!.drops.map((drop, i) => Math.min(run.dropped[i]!, changes[drop.on ?? ''] ?? Infinity));
  const bodyDrops = source.craft[0]!.joints.flatMap((joint) =>
    joint.id in changes ? joint.gone.map((id) => [id, changes[joint.id]!]) : [],
  );
  for (const body of source.craft[0]!.sheds ?? []) {
    if (run.sheds?.get(body.on)) continue;
    const i = deck.flight.flies!.drops.findIndex((drop) => drop.on === body.on);
    const at = drops[i] ?? Infinity;
    if (!Number.isFinite(at) || (state.held && at <= first.t)) continue;
    // The launch escape motor is spent. Its propellant has already left the departing assembly.
    const mass = body.on === tower.tower && body.mass ? body.mass.value - tower.propellant.value : undefined;
    const released = orbitalRelease(source, body, joined, at, undefined, mass);
    if (released) run.sheds?.add(released);
  }
  deck.times = { ...orbitalEvents(deck.flight, deck.flown, { burn: null, parting: state.t }), ...changes };
  deck.run = {
    ...run,
    samples: joined,
    cutoff: state.t,
    duration: joined.at(-1)!.t,
    dropped: drops,
    bodies: { ...run.bodies, ...Object.fromEntries(bodyDrops) },
    events: [
      ...run.events.filter((event) => event.t < first.t),
      { t: first.t, event: 'launch-escape' },
      { t: first.t + tower.canards.value, event: 'escape-canards' },
      ...Object.entries(changes).map(([event, t]) => ({ event, t })),
    ].sort((a, b) => a.t - b.t),
    descent: deck.flown.down ? drawnOf(deck.flown.down, [0, 0, 0], source.record?.ground?.value) : null,
    afloat: undefined,
    fires: firesOf(deck.flight, deck.flown, undefined, plan).map((fire, i) =>
      deck.flight.flies!.fires?.[i]?.on === tower.engine
        ? { from: state.t, to: state.t + source.craft[0]!.engines.find((engine) => engine.id === tower.engine)!.burn!.value }
        : fire,
    ),
  };
  deck.host.fly(deck.run);
}

export function escapeSamplesOf(deck: OrbitDeck, track: readonly EscapeState[], first: LiveSample, engine: string): LiveSample[] {
  const station = dot(sub(first.centre, first.r), first.axis);
  const sea = deck.flight.site.seaLevel.value;
  const pad = deck.frame.toFixed(deck.vehicleOf().start().r, 0);
  let previous = first;
  return track.map((point) => {
    const position = deck.frame.place(point.r, point.t);
    const motion = deck.frame.overGround(point.r, point.v);
    const up = deck.frame.up(point.r, point.t);
    // Carry the previous roll with the turning axis. The same angular motion gives a departing part its point velocity.
    const hinge = cross(previous.axis, point.axis);
    const sa = length(hinge);
    const swing = Math.atan2(sa, dot(previous.axis, point.axis));
    const attitude = sa > 1e-9 ? multiply(aboutAxis(scale(hinge, 1 / sa), swing), previous.attitude) : previous.attitude;
    const dt = point.t - previous.t;
    const rates: Vec3 = dt > 0 ? (sa > 1e-9 ? turn(conjugate(attitude), scale(hinge, swing / (sa * dt))) : [0, 0, 0]) : first.rates;
    previous = {
      ...first,
      ...point,
      r: sub(point.r, scale(point.axis, station)),
      centre: point.r,
      latitude: position.latitude,
      longitude: position.longitude,
      altitude: position.height - sea,
      range: angleBetween(deck.frame.toFixed(point.r, point.t), pad) * MEAN_RADIUS,
      speed: length(point.v),
      groundSpeed: length(motion),
      climb: Math.atan2(dot(point.v, up), length(cross(point.v, up))) / DEG,
      groundClimb: Math.atan2(dot(motion, up), length(cross(motion, up))) / DEG,
      attitude,
      rates,
      riding: false,
      powered: point.thrust > 0,
      burning: point.thrust > 0 ? [{ engine, thrust: point.thrust }] : [],
    };
    return previous;
  });
}

export function endPadEscape(
  deck: OrbitDeck,
  tower: TowerEscape,
  state: StagedState,
  first: LiveSample,
  track: readonly EscapeState[],
): void {
  const hit = track.at(-1)!.impact!;
  const run = deck.run!;
  const past = (run.samples as LiveSample[]).filter((sample) => sample.riding && sample.t <= first.t);
  const samples = [...past, ...escapeSamplesOf(deck, track, first, tower.engine)];
  const parts = [...tower.stages, tower.service];
  deck.ascended = {
    ...orbitalFlown(deck.flight).ascent,
    samples: [ascentSample(deck.vehicleOf(), state)],
    separation: track.at(-1)!,
    stops: state.stages.map((record) => Math.min(record.to, record.gone, state.t)),
  };
  deck.padImpact = hit;
  deck.state = { ...state, parted: { t: first.t, r: first.r, v: first.v, stageMass: 0 } };
  deck.partedBy = first.t;
  deck.run = {
    ...run,
    samples,
    duration: hit.t,
    cutoff: first.t,
    dropped: deck.flight.flies!.drops.map((drop, i) =>
      parts.some((id) => id === drop.on) ? Math.min(run.dropped[i]!, first.t) : run.dropped[i]!,
    ),
    events: [
      ...run.events.filter((event) => event.t < first.t),
      { t: first.t, event: 'launch-escape' },
      ...parts.map((event) => ({ t: first.t, event })),
      { t: hit.t, event: 'escape-impact' },
    ],
    descent: null,
    afloat: undefined,
    fires: (deck.flight.flies!.fires ?? []).map((fire, i) => {
      if (fire.on === tower.engine) {
        const burn = deck.recordPlan.craft[0]!.engines.find((engine) => engine.id === tower.engine)!.burn!.value;
        return { from: first.t, to: Math.min(hit.t, first.t + burn) };
      }
      const held = run.fires?.[i];
      return { from: held?.from ?? Infinity, to: Math.min(held?.to ?? Infinity, first.t) };
    }),
  };
  deck.host.fly(deck.run);
}

/**
 * The crew ejected from the launch vehicle at `at` (the spacecraft's state on the stack): their descent flown at once from
 * there (orbital.ts `flyEjected`) and put in the run on show, each piece that comes down on it (the seat, the hatches)
 * leaving the model as it leaves. The stack flies on as the live vehicle has it, the ship on it empty.
 */
export function eject(deck: OrbitDeck, at: { t: number; r: Vec3; v: Vec3 }): void {
  const plan = deck.recordPlan;
  const v = deck.vehicleOf();
  const down = flyEjected(plan, deck.frame, deck.flight.site.seaLevel.value, at, { ground: v.ground });
  if (!down) return;
  deck.ejected = { down, at: at.t };
  const run = deck.run!;
  run.descent = drawnOf(down, [0, 0, 0]);
  deck.flight.flies!.drops.forEach((d, i) => {
    if (d.rides?.length) run.dropped[i] = down.tracks[d.rides[0]!.body]?.[0]?.t ?? Number.POSITIVE_INFINITY;
  });
  const x = v.sample(deck.state!, deck.centre);
  const { who, their } = crewWords(plan.craft[0]!.crew);
  deck.host.say?.(
    'Ejected',
    `${who} left the ship on ${their} seat at ${(x.altitude / KM).toFixed(1)} km, ${x.groundSpeed.toFixed(0)} m/s through the air. The launch vehicle flies on, the ship on it empty`,
  );
  deck.host.fly(run);
}

/** The next step of the record's sequence this flight has not taken: on the record's run, the next in time; on the user's, the first not done. */
export function nextStep(deck: OrbitDeck): { step: Step; label: string; at: number } | null {
  const v = deck.vehicleOf();
  if (deck.mine === null) return v.sequence.find((k) => k.at > deck.clock.t + 1e-9) ?? null;
  const s = deck.state;
  if (!s) return null;
  return (
    v.sequence.find((k) => {
      const st = k.step;
      if (st.kind === 'drop') return !Number.isFinite(s.drops[st.id] ?? Infinity);
      const g = s.stages[st.stage]!;
      if (Number.isFinite(g.gone)) return false;
      if (st.kind === 'ignite') return !Number.isFinite(g.from);
      if (st.kind === 'cut') return Number.isFinite(g.from) && v.burning(s, st.stage);
      return true;
    }) ?? null
  );
}

/** On this flight's own vehicle, a stage firing into the one it stands on, still joined, now (stagedlive.ts `firing`). */
export function firingOf(deck: OrbitDeck): ReturnType<StagedVehicle['firing']> {
  const s = deck.mine !== null ? deck.state : null;
  return s && !s.broke && !s.parted && !s.landed ? deck.vehicleOf().firing(s) : null;
}

/** The user's flight from the pad: the live vehicle standing there, its first stages lit now. */
export function liftoff(deck: OrbitDeck): void {
  const v = deck.vehicleOf();
  begin(deck, v.start(), 0);
  deck.asked.push(...recordStages(deck.recordPlan).flatMap((s, i) => (s.from <= 0 ? [{ kind: 'ignite' as const, stage: i }] : [])));
  deck.say();
}

/**
 * The flight taken over at the clock's instant on the record's ascent: the live vehicle flown from the pad on the law, its
 * attitude placed as the batch run places it (the two agree to a hundredth of a metre a second: tests/stagedlive.test.mjs),
 * up to this instant, and handed to the user's switches from there.
 */
export function takeOver(deck: OrbitDeck): void {
  const t = Math.max(0, deck.clock.t);
  const v = deck.vehicleOf();
  const site = siteFrame(deck.flight.site);
  const solved = orbitalFlown(deck.flight).ascent.solved;
  deck.options = { guidance: deck.guidance, sequence: deck.sequence, memo: { thetaTurn: null } };
  const caught = stagedPilot(v, solved, site, deck.frame, deck.flight.site.seaLevel.value, {
    ...deck.options,
    guidance: true,
    sequence: true,
    prescribed: true,
    memo: deck.options.memo,
  });
  let s = v.tick(v.start(), {
    pitch: 0,
    yaw: 0,
    roll: 0,
    steps: recordStages(deck.recordPlan).flatMap((st, i) => (st.from <= 0 ? [{ kind: 'ignite' as const, stage: i }] : [])),
  });
  const tally = new StagedTally(v);
  while (s.t < t - TICK / 2 && !s.parted && !s.broke) {
    const was = s;
    s = v.tick(s, caught);
    tally.note(was, s);
  }
  s = { ...s, controls: { pitch: 0, yaw: 0, roll: 0 } };
  begin(deck, s, t, tally);
}

/** The live vehicle's flight begun at `s`, the run on show the record's up to `from` and this flight's after. */
export function begin(deck: OrbitDeck, s: StagedState, from: number, tally?: StagedTally): void {
  const v = deck.vehicleOf();
  deck.mine = from;
  deck.state = s;
  deck.tally = tally ?? new StagedTally(v);
  deck.options.guidance = deck.guidance;
  deck.options.sequence = deck.sequence;
  deck.options.memo ??= { thetaTurn: null };
  // (the pilot is given the deck's own options, not a copy: the switches thrown after this are read every tick)
  const options = deck.options;
  // (keys at `FINE` of full throw on the launch vehicle flown by hand, as the ballistic deck's; with Hold, they move the hold)
  options.hands = () => {
    const p = pushOf(deck, deck.guidance || deck.hold ? 1 : FINE);
    return deck.guidance || deck.hold ? { pitch: 0, yaw: 0, roll: p.roll } : p;
  };
  options.hold = () => (deck.hold && !deck.guidance ? deck.holdAt : null);
  options.steps = () => deck.asked.splice(0);
  const inner = stagedPilot(
    v,
    orbitalFlown(deck.flight).ascent.solved,
    siteFrame(deck.flight.site),
    deck.frame,
    deck.flight.site.seaLevel.value,
    options,
  );
  // (one pilot flies the whole flight, so the law's turn is the one it began)
  deck.pilot = (st) => {
    if (deck.guidance) {
      const p = pushOf(deck);
      const lean = (now: number, by: number) => Math.max(-TRIM_MOST, Math.min(TRIM_MOST, now + by * TRIM * TICK));
      deck.trim = { pitch: lean(deck.trim.pitch, p.pitch), yaw: lean(deck.trim.yaw, p.yaw) };
    }
    options.trim = deck.trim;
    if (deck.hold && !deck.guidance) {
      // the attitude held: where it is as Hold takes it, turned by the keys at `HOLD_TURN` about the body's own axes
      deck.holdAt ??= turn(st.q, [1, 0, 0]);
      const p = pushOf(deck);
      const by = (x: number) => x * HOLD_TURN * TICK;
      if (p.pitch) deck.holdAt = turn(aboutAxis(turn(st.q, [0, 1, 0]), by(p.pitch)), deck.holdAt);
      if (p.yaw) deck.holdAt = turn(aboutAxis(turn(st.q, [0, 0, 1]), by(p.yaw)), deck.holdAt);
    } else deck.holdAt = null;
    leverCuts(deck, st);
    const c = inner(st);
    // (the lever on every stage, as KSP's one throttle: left out while it is full and has never moved, so the record's run is the same to the bit)
    return deck.lever.at === 1 && !st.hand ? c : { ...c, lever: stagesOf(deck.recordPlan).map(() => deck.lever.at) };
  };
  // the run: the record's up to here, then this flight's
  const record = deck.record!;
  const before = (record.samples as LiveSample[]).filter((x) => x.t < from - 1e-9);
  const sample = v.sample(s, deck.centre);
  const stands = deck.atSiteOf(() => v.start().q);
  const sheds = new Sheds(deck.recordPlan, siteFrame(deck.flight.site), deck.flight.site.seaLevel.value, {
    frame: deck.frame,
    site: stands.site,
    names: stands.names,
    floor: stands.under,
  });
  deck.run = {
    ...record,
    samples: [...before, sample],
    duration: Infinity,
    cutoff: Infinity,
    dropped: deck.flight.flies!.drops.map(() => Infinity),
    sheds,
    live: true,
    kept: true,
    descent: null,
    ...grown(deck.recordPlan, s.craft),
    results: [],
  };
  deck.kept = deck.run.samples.length;
  deck.heard = s.said.length;
  dropsFrom(deck, s, from);
  deck.host.fly(deck.run);
}

/** On the pad, as flown: both switches on and the lever full. */
export function recordOnPad(deck: OrbitDeck): boolean {
  return deck.guidance && deck.sequence && deck.lever.at === 1;
}

/** The lever under a burning liquid stage's least: it is asked to be cut (once), whenever it is lit. */
export function leverCuts(deck: OrbitDeck, s: StagedState, v = deck.vehicleOf()): void {
  if (deck.lever.at >= 1) return;
  stagesOf(deck.recordPlan).forEach((st, i) => {
    const range = handRange(st.engine);
    if (!range || deck.lever.at >= range.least - 1e-9 || !v.burning(s, i) || deck.asked.some((k) => k.kind === 'cut' && k.stage === i))
      return;
    deck.asked.push({ kind: 'cut', stage: i });
    deck.cutByLever.add(i);
  });
}

/**
 * When the record had a step and on what (plan.ts: its trigger), for a hand flying it: at its instant, or on reaching its
 * speed (space-fixed, or its integrator's), or on the record's orbit (the guidance's cut). From the plan, never written.
 */
export function whenIntended(deck: OrbitDeck, next: { step: Step; at: number }): string {
  const at = `at ${missionTime(next.at)}`;
  if (next.step.kind !== 'cut') return at;
  const k = sequenceOf(deck.recordPlan).stages[next.step.stage];
  if (k?.speed) return `${at}, on ${k.speed.value.toFixed(0)} m/s${k.speed.apparent ? ' on its integrator' : ''}`;
  const orbit = deck.recordPlan.record?.orbit;
  if (k?.orbit && orbit)
    return `${at}, on the record’s orbit: ${(orbit.perigee.value / KM).toFixed(0)} by ${(orbit.apogee.value / KM).toFixed(0)} km`;
  return at;
}

/** The instant each of `flies.drops` leaves on this flight, and its body put in the scene as it leaves. */
export function dropsFrom(deck: OrbitDeck, s: StagedState, from = -Infinity): void {
  const run = deck.run!;
  const plan = deck.recordPlan;
  const record = deck.record!;
  const seq = sequenceOf(plan);
  const stages = stagesOf(plan);
  deck.flight.flies!.drops.forEach((d, i) => {
    if (Number.isFinite(run.dropped[i]!)) return;
    // (each by the plan's joint that lets it go, a drop's or a stage's; several bodies may leave by one joint, each after a
    // slash: the strap-ons' joint and each one's letter)
    const on = d.on?.split('/')[0];
    const drop = seq.drops.find((x) => x.joint === on);
    const stage = on ? seq.stages.findIndex((k) => k.joint === on) : -1;
    // (the record's, for what left before the flight was taken over)
    const at = drop ? (s.drops[drop.joint] ?? Infinity) : stage >= 0 ? s.stages[stage]!.gone : Infinity;
    const was = record.dropped[i]!;
    const when = was < from ? was : at;
    if (!Number.isFinite(when)) return;
    run.dropped[i] = when;
    const def = plan.craft[0]!.sheds?.find((x) => x.on === d.on);
    if (!def) return;
    if (when < from) {
      const previous = record.sheds?.get(def.on);
      if (previous) run.sheds?.add(previous.shedder.release);
      return;
    }
    // a strap-on let go while its stage still burns swings out on what it was burning at, not on the tail-off
    const burning = stage >= 0 && s.stages[stage]!.to > when ? stages[stage]! : null;
    const unit = burning ? burning.engine.thrust.vacuum.value * (burning.throttle ? along(burning.throttle, when) : 1) : undefined;
    const finalStage = s.parted && when === s.parted.t && stage === stages.length - 1;
    const samples = finalStage ? [{ ...deck.vehicleOf().sample(s, deck.centre), v: s.parted!.v }] : (run.samples as LiveSample[]);
    // (a stage's own body leaves with what it had not burned, whenever that is: the record's leftover is the record's)
    const mass = finalStage
      ? s.parted!.stageMass
      : stage >= 0 && ownBody(deck, d, stage)
        ? deck.vehicleOf().unitMass(s, stage, when)
        : undefined;
    const release = orbitalRelease(plan, def, samples, when, unit, mass);
    if (release) run.sheds?.add(release);
  });
}

/** Whether a drop is stage `i`'s own body (each of its nodes the body's): it leaves with what that stage had not burned. */
export function ownBody(deck: OrbitDeck, drop: { nodes: readonly string[] }, i: number): boolean {
  const nodes = stagesOf(deck.recordPlan)[i]?.body.nodes ?? [];
  return drop.nodes.length > 0 && drop.nodes.every((n) => nodes.includes(n));
}

/** The spacecraft has parted on the user's flight: its coast from there, the hands free. */
export function parted(deck: OrbitDeck, s: StagedState): void {
  const v = deck.vehicleOf();
  const at = ascentSample(v, s);
  const tally = deck.tally!;
  deck.ascended = {
    samples: [at],
    at: tally.at,
    summary: tally.summary,
    solved: orbitalFlown(deck.flight).ascent.solved,
    stops: stagesOf(deck.recordPlan).map((_, i) => Math.min(s.stages[i]!.to, v.dry(i, s.stages[i]!.from, s), s.stages[i]!.gone)),
    left: v.left(s),
    separation: s.parted!,
    parted: { kept: tally.summary.massLeft, gone: s.parted!.stageMass },
    plane: v.plane,
    thetaTurn: deck.options.memo?.thetaTurn ?? orbitalFlown(deck.flight).ascent.thetaTurn,
  };
  const abortSequence = deck.aborted?.mode.escape?.separate;
  const translation = abortSequence?.motor;
  const service = abortSequence?.service;
  const from = s.parted!;
  const solved = service
    ? withServiceAbort(deck.recordPlan, service, from, at.axis, deck.frame, siteFrame(deck.flight.site), deck.flight.site.seaLevel.value)
    : null;
  const plan =
    solved?.plan ??
    (translation
      ? withEscapeTranslation(deck.recordPlan, translation.engine, from.t, translation.duration.value, at.axis)
      : deck.givenUp());
  if (translation || service) {
    deck.planned = plan;
    deck.partedBy = service?.goal.kind === 'orbit' ? null : shipOf(plan).parted;
  }
  deck.flown = deck.whole(plan);
  const samples = deck.samplesOf(plan, deck.flown);
  const abortEvents = deck.aborted
    ? shipOf(plan).moves.flatMap((move) => [
        { event: move.lit, t: move.on },
        { event: move.cut, t: move.off },
      ])
    : [];
  deck.encounters!.finish(samples, deck.coastDrops(plan, deck.flown));
  deck.run = {
    ...deck.run!,
    sheds: deck.encounters!.sheds,
    dropped: deck.coastDrops(plan, deck.flown),
    samples,
    duration: samples[samples.length - 1]!.t,
    descent: deck.descentOf(),
    events: [...deck.run!.events, ...abortEvents].sort((a, b) => a.t - b.t),
    fires: deck.fires(),
    held: deck.heldOf(),
  };
  dropsFrom(deck, s);
  deck.times = orbitalEvents(deck.flight, deck.flown);
  freeHands(deck, null);
  const el = elementsOf(s.parted!.r, s.parted!.v);
  const perigee = (el.a * (1 - el.e) - heightsBall(deck.recordPlan, siteFrame(deck.flight.site))) / KM;
  if (!solved)
    deck.host.say?.(
      'Spacecraft parted',
      perigee > 100
        ? `In an orbit of your own: perigee ${perigee.toFixed(0)} km. Use the action button to fire the braking burn`
        : `Short of an orbit: perigee ${perigee.toFixed(0)} km. It comes down`,
    );
  if (solved && service) {
    const orbit = service.goal.kind === 'orbit';
    const reached = orbit
      ? solved.achieved >= service.goal.target.value - ORBIT_SLACK
      : Math.abs(solved.achieved - service.goal.target.value) < 1852;
    const reading = Number.isFinite(solved.achieved) ? `${(solved.achieved / KM).toFixed(0)} km` : 'outside this trajectory’s reach';
    const firing = solved.duration > 0 ? `SPS firing ${solved.duration.toFixed(1)} s` : 'Already at the contingency orbit';
    deck.host.say?.(
      orbit ? 'Abort to orbit' : 'Direct entry abort',
      `${firing} · ${orbit ? 'perigee' : 'recovery range'} ${reading}${reached ? '' : ' · target outside the model’s available burn range'}`,
    );
  }
  if (deck.flown.down) floatUprighting(deck.flight, deck.run, Infinity);
  deck.host.fly(deck.run);
  // This escape mode calls for a separate entry. Describe the sequence given for this flight.
  if (abortSequence?.entry && !translation && !service) {
    deck.partedBy = s.parted!.t;
    deck.refly();
    if (deck.aborted) deck.host.say?.('Abort', deck.aborted.mode.does);
  }
}

/** What each stage has left at `t` (all its units), and whether it is aboard and burning: the user's vehicle's, or the record's run's. */
export function stagesAt(deck: OrbitDeck, t: number): { left: number; full: number; aboard: boolean; burning: boolean }[] {
  const plan = deck.recordPlan;
  const stages = stagesOf(plan);
  if (deck.state && deck.mine !== null && t >= deck.mine) {
    const v = deck.vehicleOf();
    const s = deck.state;
    const left = v.left(s);
    return stages.map((st, i) => ({
      left: left[i]!,
      full: st.shares.length > 1 ? st.holder.count * st.load : st.count * st.load,
      aboard: !Number.isFinite(s.stages[i]!.gone) && !s.parted,
      burning: v.burning(s, i) && !s.parted,
    }));
  }
  const stops = orbitalFlown(deck.flight).ascent.stops;
  const staged = recordStages(plan, stops);
  /** What one of them has burned by `t`, all its units. */
  const burnedBy = (j: number) => {
    const from = staged[j]!.from;
    return stages[j]!.count * flowOf(stages[j]!.engine) * integral(stages[j]!.drawn, from, Math.max(from, Math.min(t, stops[j]!)));
  };
  return stages.map((s, i) => {
    // (a tank several stages draw on, an Atlas's: what is left in it, drawn by all of them)
    const shared = s.shares.length > 1;
    const full = shared ? s.holder.count * s.load : s.count * s.load;
    const from = staged[i]!.from;
    const burned = shared ? s.shares.reduce((sum, j) => sum + burnedBy(j), 0) : burnedBy(i);
    const sep = staged[i]!.sep;
    return { left: Math.max(0, full - burned), full, aboard: t < sep, burning: t > 0 && t >= from && t < stops[i]! };
  });
}

/**
 * What to know of a step that lights a stage while the stage it stands on is still on (the joint below's `hot`, that
 * engine's): hot staging, which is how it flew, and what it costs if it goes on too long. Null for any other step.
 */
export function hotNote(deck: OrbitDeck, step: Step): string | null {
  if (step.kind !== 'ignite') return null;
  const plan = deck.recordPlan;
  const stages = stagesOf(plan);
  const engine = stages[step.stage]?.engine.id;
  const hot = plan.craft[0]!.joints.find((j) => j.hot && j.hot.engine === engine)?.hot;
  if (!hot) return null;
  const below = stages[step.stage - 1];
  const s = deck.mine !== null ? deck.state : null;
  const on = s ? !Number.isFinite(s.stages[step.stage]!.from) && !Number.isFinite(s.stages[step.stage - 1]!.gone) : true;
  if (!below || !on) return null;
  const lower = short(below.body.label).toLowerCase();
  // (what the one command set off after it, as the record had it: stagedlive.ts `setsOff`)
  const sets = deck.vehicleOf().setsOff(step.stage);
  const after = (k: Step['kind']) => sets.find((x) => x.step.kind === k)?.wait;
  const [cut, parts] = [after('cut'), after('separate')];
  const when = (w: number) => (w < 0.005 ? 'at once' : `${w.toFixed(1)} s later`);
  // (its letting go cuts it too, where the record has no cut of its own before it)
  const then =
    cut !== undefined && parts !== undefined && Math.abs(cut - parts) >= 0.005
      ? `cut ${when(cut)} and let go ${when(parts)}`
      : parts !== undefined
        ? `cut and let go ${when(parts)}`
        : cut !== undefined
          ? `cut ${when(cut)}`
          : '';
  return `hot staging, as it flew: one command lit it with the ${lower} still under it, its fire out through the open joint onto the deflector on the ${lower}’s top${then ? `, and the ${lower} was ${then}, as the record has it; the crew had no say in it. Lit early by hand, the same follows` : ''}. Not for long: the ${lower}’s top is taken to stand ${hot.endures.value} s of it (${hot.endures.confidence})`;
}

/** When the record has a step, s (a stage cut on its velocity: its recorded cutoff). */
export function dueAt(deck: OrbitDeck, step: Step): number {
  return deck.vehicleOf().sequence.find((k) => JSON.stringify(k.step) === JSON.stringify(step))?.at ?? Infinity;
}
